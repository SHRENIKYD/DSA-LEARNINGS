(function () {
var topics = [], practice = [], quiz = [], interview = [];

/* ---------- shared helpers used by several visualizers ---------- */
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function clip(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
var VOID = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, source: 1, track: 1, wbr: 1 };
var HEADISH = { title: 1, meta: 1, link: 1, style: 1, script: 1, base: 1, noscript: 1 };
var BLOCKS = { p: 1, div: 1, ul: 1, ol: 1, h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1, table: 1, form: 1, section: 1, header: 1, footer: 1, nav: 1, main: 1, article: 1, aside: 1, pre: 1, blockquote: 1, hr: 1, fieldset: 1 };

function tokenizeHtml(src) {
  var re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/[a-zA-Z][^>]*>|<[a-zA-Z][^>]*>|[^<]+|</gi, out = [], m;
  while ((m = re.exec(src))) {
    var raw = m[0], t;
    if (/^<!--/.test(raw)) t = { kind: 'comment', raw: raw };
    else if (/^<!doctype/i.test(raw)) t = { kind: 'doctype', raw: raw };
    else if (/^<\//.test(raw)) t = { kind: 'close', name: raw.replace(/^<\/\s*/, '').replace(/[\s>][\s\S]*$/, '').toLowerCase(), raw: raw };
    else if (raw.length > 1 && raw.charAt(0) === '<') t = { kind: 'open', name: raw.slice(1).replace(/[\s\/>][\s\S]*$/, '').toLowerCase(), raw: raw };
    else { if (!raw.trim()) continue; t = { kind: 'text', text: raw.trim().replace(/\s+/g, ' '), raw: raw }; }
    out.push(t);
  }
  return out;
}

function domGraph(doc, hl, tags, label) {
  var nodes = [], edges = [], leaf = 0, maxD = 0, leaves = 0;
  (function count(e) { if (!e.kids.length) leaves++; else e.kids.forEach(count); })(doc);
  if (leaves > 7) throw new Error('Too many leaf nodes for the picture — keep the sample small (7 leaves max)');
  var slot = leaves > 1 ? 80 / (leaves - 1) : 0;
  function place(e, d) {
    if (d > maxD) maxD = d;
    var x;
    if (!e.kids.length) { x = leaves > 1 ? 10 + slot * leaf : 50; leaf++; }
    else { var xs = e.kids.map(function (k) { return place(k, d + 1); }); x = (xs[0] + xs[xs.length - 1]) / 2; }
    var lab = e.text !== undefined ? '"' + clip(e.text, 7) + '"' : (e.name.charAt(0) === '#' ? e.name : '<' + e.name + '>');
    nodes.push({ id: e.id, label: lab, x: x, y: 7 + d * 11, shape: 'box' });
    e.kids.forEach(function (k) { edges.push([e.id, k.id]); });
    return x;
  }
  place(doc, 0);
  return { type: 'graph', label: label || 'The DOM tree built so far', height: 14 + maxD * 11, nodes: nodes, edges: edges, hl: hl || {}, tags: tags || {} };
}

/* HTML text -> frames showing tokens, the stack of open elements and the DOM tree */
function domFrames(src) {
  var toks = tokenizeHtml(String(src));
  if (!toks.length) throw new Error('Type some HTML, for example <p>Hello</p>');
  if (toks.length > 40) throw new Error('Please use at most 40 tokens (tags + text pieces)');
  var n = 0, frames = [], tags = {}, phase = 'before-html';
  function mk(name, text) { return { id: 'n' + (n++), name: name, text: text, kids: [] }; }
  var doc = mk('#document'), stack = [doc];
  function top() { return stack[stack.length - 1]; }
  function openEl(name, implied) { var e = mk(name); top().kids.push(e); stack.push(e); if (implied) tags[e.id] = 'implied'; return e; }
  function popTo(name) { while (stack.length > 1 && top().name !== name) stack.pop(); if (stack.length > 1) stack.pop(); }
  function srcPart(idx) {
    var h = toks.map(function (t, i) {
      var r = esc(t.raw.length > 40 ? t.raw.slice(0, 39) + '…' : t.raw);
      return i < idx ? '<span class="c-m">' + r + '</span>' : i === idx ? '<mark>' + r + '</mark>' : r;
    }).join(' ');
    return { type: 'text', label: 'HTML source, token by token', html: '<code>' + h + '</code>' };
  }
  function snap(idx, narr, hl) {
    var items = stack.slice(1).map(function (e) { return e.name; }), sh = {};
    if (items.length) sh[items.length - 1] = 'cur';
    frames.push({ narr: narr, parts: [srcPart(idx), { type: 'stack', label: 'Open elements (the parser keeps this stack)', items: items, hl: sh }, domGraph(doc, hl, tags)] });
  }
  frames.push({ narr: 'We start with an empty page: just the <b>#document</b> node. The parser will read your text left to right, one token at a time.', parts: [srcPart(-1), { type: 'stack', label: 'Open elements (the parser keeps this stack)', items: [] }, domGraph(doc, {}, tags)] });
  toks.forEach(function (t, i) {
    var notes = [], hl = {}, made = null;
    if (t.kind === 'doctype') {
      var d = mk('!doctype'); doc.kids.push(d); hl[d.id] = 'ok';
      snap(i, 'Doctype: tells the browser <b>"use modern standards mode"</b>. Without it the browser falls back to old "quirks mode" and CSS can behave strangely.', hl); return;
    }
    if (t.kind === 'comment') { var c = mk('#comment'); top().kids.push(c); hl[c.id] = 'done'; snap(i, 'A comment becomes a node in the tree, but it is never shown on screen.', hl); return; }
    if (t.kind === 'close') {
      var nm = t.name;
      if (nm === 'html' || nm === 'body') { snap(i, 'End tag <b>&lt;/' + nm + '&gt;</b>: browsers keep <code>' + nm + '</code> open until the very end, so any later content still lands inside the body.', hl); return; }
      if (nm === 'head' && phase === 'in-head') { popTo('head'); phase = 'after-head'; snap(i, 'The head is finished. Next real content will go to the body.', hl); return; }
      var idx = -1;
      for (var k = stack.length - 1; k >= 1; k--) if (stack[k].name === nm) { idx = k; break; }
      if (VOID[nm] || idx < 1) { snap(i, 'Stray end tag <b>&lt;/' + nm + '&gt;</b> with nothing to close — the parser quietly <span class="c-r">ignores</span> it (this is why typos hide for so long).', hl); return; }
      var lost = stack.slice(idx + 1).map(function (e) { return e.name; });
      hl[stack[idx].id] = 'cur';
      while (stack.length > idx) stack.pop();
      snap(i, 'End tag <b>&lt;/' + nm + '&gt;</b> closes <code>' + nm + '</code>.' + (lost.length ? ' <span class="c-y">It also auto-closed ' + lost.join(', ') + ' which were still open</span> — forgetting an end tag is repaired silently.' : ' Perfect nesting: the newest open element was the one we closed.'), hl); return;
    }
    // start tag or text: first make sure html / head / body exist
    var nm2 = t.kind === 'open' ? t.name : '#text';
    if (phase === 'before-html') {
      if (nm2 === 'html') { var h0 = openEl('html'); hl[h0.id] = 'ok'; phase = 'in-html'; snap(i, 'Start tag <b>&lt;html&gt;</b>: the root of the whole page.', hl); return; }
      var hh = openEl('html', true); hl[hh.id] = 'sel'; phase = 'in-html'; notes.push('The parser added <b>html</b> for you.');
    }
    if (phase === 'in-html') {
      if (nm2 === 'head') { var h1 = openEl('head'); hl[h1.id] = 'ok'; phase = 'in-head'; snap(i, 'Start tag <b>&lt;head&gt;</b>: invisible info about the page (title, meta, CSS links).', hl); return; }
      if (nm2 === 'body') { var b1 = openEl('body'); hl[b1.id] = 'ok'; phase = 'in-body'; snap(i, 'Start tag <b>&lt;body&gt;</b>: everything the user sees lives here.', hl); return; }
      var hd = openEl('head', true); hl[hd.id] = 'sel'; notes.push('The parser added <b>head</b> for you.');
      if (HEADISH[nm2]) phase = 'in-head'; else { stack.pop(); phase = 'after-head'; }
    }
    if (phase === 'in-head' && top().name === 'head' && !(t.kind === 'open' && HEADISH[nm2])) {
      if (nm2 === 'body') { stack.pop(); phase = 'after-head'; } else { stack.pop(); phase = 'after-head'; notes.push('This is not a head tag, so the head was closed.'); }
    }
    if (phase === 'after-head') {
      if (nm2 === 'body') { var b2 = openEl('body'); hl[b2.id] = 'ok'; phase = 'in-body'; snap(i, notes.concat(['Start tag <b>&lt;body&gt;</b>.']).join(' '), hl); return; }
      var bd = openEl('body', true); hl[bd.id] = 'sel'; phase = 'in-body'; notes.push('The parser added <b>body</b> for you.');
    }
    if (phase === 'in-body' && (nm2 === 'html' || nm2 === 'head' || nm2 === 'body')) { snap(i, 'A second <b>' + nm2 + '</b> start tag makes no sense here, so it is ignored.', hl); return; }
    if (t.kind === 'text') {
      var tn = mk('#text', t.text); top().kids.push(tn); hl[tn.id] = 'ok';
      snap(i, notes.concat(['Text <b>"' + esc(clip(t.text, 24)) + '"</b> becomes a text node inside <code>' + top().name + '</code>.']).join(' '), hl); return;
    }
    // normal start tag
    if (nm2 === 'li' && top().name === 'li') { stack.pop(); notes.push('A new <b>li</b> starts, so the previous open <b>li</b> was closed automatically.'); }
    if (top().name === 'p' && BLOCKS[nm2]) { stack.pop(); notes.push('A <b>p</b> cannot contain a ' + nm2 + ', so the paragraph was closed first.'); }
    var el = mk(nm2); top().kids.push(el); hl[el.id] = 'ok';
    if (VOID[nm2]) notes.push('<b>' + nm2 + '</b> is a <span class="c-b">void element</span>: it never has children or an end tag, so it is not pushed on the stack.');
    else { stack.push(el); notes.push('Start tag <b>&lt;' + nm2 + '&gt;</b>: add it as a child of its parent and push it on the stack.'); }
    snap(i, notes.join(' '), hl);
  });
  var left = stack.slice(1).map(function (e) { return e.name; });
  while (stack.length > 1) stack.pop();
  snap(toks.length, 'End of input. ' + (left.length ? 'Still open and auto-closed: <b>' + left.join(', ') + '</b>. ' : '') + 'The tree above is what JavaScript and CSS will actually work with — <b>not</b> your original text.', {});
  return frames;
}

topics.push({
  title: 'Document Structure & How the Browser Reads Your HTML',
  analogy: `<p>Think of an HTML file as a <b>recipe card</b> and the browser as a <b>very patient cook</b>. The top of the card has the title, the language and the cooking notes (the <code>&lt;head&gt;</code>). The bottom half is the actual dish that guests see (the <code>&lt;body&gt;</code>). The cook reads line by line, and if you forget a step (a closing tag) the cook does not shout — they guess what you meant and keep going. That guessing is called <b>error recovery</b>, and it is why broken HTML still shows something on screen.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> HTML (HyperText Markup Language) is just <b>text with labels</b>. A label like <code>&lt;p&gt;</code> says "this chunk is a paragraph". The browser reads the text, builds a family tree of these labelled chunks called the <b>DOM</b> (Document Object Model), and then draws it.</p>
  <p>Every real page has the same skeleton:</p>
  ${H.table(['Part', 'What it is', 'Why it matters'], [
    ['<code>&lt;!doctype html&gt;</code>', 'First line of the file', 'Turns on modern <b>standards mode</b>. Forget it and the browser uses 1990s "quirks mode".'],
    ['<code>&lt;html lang="en"&gt;</code>', 'Root element', 'The <code>lang</code> helps screen readers pick the right voice and helps translation tools.'],
    ['<code>&lt;head&gt;</code>', 'Info <i>about</i> the page', 'Title, charset, viewport, CSS links. Nothing here is drawn on the page.'],
    ['<code>&lt;body&gt;</code>', 'The visible page', 'Headings, text, images, forms, buttons — everything the user sees.']
  ])}
  <p><b>Tags, elements, attributes.</b> A <b>tag</b> is the label in angle brackets. An <b>element</b> is the start tag + content + end tag together: <code>&lt;a href="/home"&gt;Home&lt;/a&gt;</code>. <code>href="/home"</code> is an <b>attribute</b> (extra settings written as name="value" inside the start tag).</p>
  <p><b>Nesting.</b> Elements go <i>inside</i> other elements like boxes inside boxes. The rule: <b>last opened, first closed</b>. <code>&lt;b&gt;&lt;i&gt;hi&lt;/i&gt;&lt;/b&gt;</code> is right, <code>&lt;b&gt;&lt;i&gt;hi&lt;/b&gt;&lt;/i&gt;</code> is wrong. (That is exactly a <b>stack</b> — you will watch one in the visualizer.)</p>
  <p><b>Void elements</b> have no content and no end tag: <code>&lt;br&gt; &lt;hr&gt; &lt;img&gt; &lt;input&gt; &lt;meta&gt; &lt;link&gt;</code>. Writing <code>&lt;br/&gt;</code> is allowed but the slash does nothing in HTML.</p>
  <p><b>Block vs inline (first look).</b> <i>Block</i> elements (<code>div, p, h1, ul</code>) start on a new line and take the full width. <i>Inline</i> elements (<code>span, a, strong, img</code>) flow inside a line of text. Rule of thumb: put inline elements inside block elements, not the other way round. One exception: an <code>&lt;a&gt;</code> may wrap a block in HTML5. But a <code>&lt;p&gt;</code> may never contain a <code>&lt;div&gt;</code>.</p>
  <p><b>Text details.</b> Whitespace is collapsed: many spaces and newlines show as one space. To show a real <code>&lt;</code> write <code>&amp;lt;</code>; an ampersand is <code>&amp;amp;</code>; a non-breaking space is <code>&amp;nbsp;</code>. Always add <code>&lt;meta charset="utf-8"&gt;</code> as the very first thing in the head so emoji and accents are not garbled.</p>`,
  clues: [
    '"What does <code>&lt;!DOCTYPE html&gt;</code> do?" → standards mode vs quirks mode',
    '"Why do we write <code>lang="en"</code> on the html tag?" → accessibility, translation, hyphenation, SEO',
    '"What are void / self-closing elements?" → br, hr, img, input, meta, link',
    '"What happens if I forget to close a tag?" → the parser repairs it silently (error recovery)',
    '"Where does <code>meta charset</code> go and why first?" → the browser must know the encoding before it reads other text (within the first 1024 bytes)',
    '"Is HTML case sensitive? Do quotes on attributes matter?" → tag names are not, but always quote values and use lowercase',
    '"Block vs inline element — can a p contain a div?" → no; the parser closes the p early'
  ],
  code: [
    { lang: 'html', title: 'The minimal valid HTML5 page', code: `<!doctype html>
<html lang="en">
  <head>
    <!-- charset first, so the browser decodes everything below correctly -->
    <meta charset="utf-8">
    <!-- makes the page fit phone screens instead of pretending to be 980px wide -->
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>My first page</title>
  </head>
  <body>
    <h1>Hello, web</h1>
    <p>This is a <strong>paragraph</strong> with a <a href="/about">link</a>.</p>
  </body>
</html>` },
    { lang: 'js', run: true, title: 'A tiny tag-balance checker (the stack idea behind the parser)', code: `// Walks over tag names and uses a stack, exactly like the HTML parser's
// "stack of open elements". Void elements are never pushed.
const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);

function checkNesting(html) {
  const stack = [];
  const re = /<(\\/?)([a-z][a-z0-9]*)[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const closing = m[1] === '/';
    const name = m[2].toLowerCase();
    if (VOID.has(name)) continue;              // br, img... have no end tag
    if (!closing) { stack.push(name); continue; }
    const top = stack.pop();                   // newest open element
    if (top !== name) return 'Mismatch: expected </' + top + '> but found </' + name + '>';
  }
  return stack.length ? 'Never closed: ' + stack.join(', ') : 'Nesting is fine';
}

console.log(checkNesting('<p>Hi <b>there</b><br></p>'));  // fine
console.log(checkNesting('<b><i>oops</b></i>'));           // mismatch
console.log(checkNesting('<ul><li>One<li>Two</ul>'));      // browsers fix this, a strict checker does not` }
  ],
  codeTitle: ['Boilerplate you will write hundreds of times', 'Stack-based nesting check'],
  viz: [
    {
      title: 'HTML text → open-elements stack → DOM tree',
      input: '<!doctype html><title>Hi</title><h1>Tea</h1><ul><li>Chai<li>Milk</ul>',
      inputLabel: 'HTML (try leaving out end tags or the body)',
      gen: function (input) { return domFrames(input); }
    },
    {
      title: 'Walking through the boilerplate line by line',
      gen: function () {
        var code = '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>My page</title>\n</head>\n<body>\n  <h1>Hello</h1>\n</body>\n</html>';
        var steps = [
          [1, 'Line 1 — <b>doctype</b>. "Please use standards mode." Always the very first line.', 'rendering mode', 'standards'],
          [2, 'Line 2 — <b>html lang="en"</b>. The root. <code>lang</code> tells screen readers which voice and pronunciation to use.', 'page language', 'en'],
          [4, 'Line 4 — <b>charset utf-8</b>. UTF-8 can write every language and emoji. Put it first in the head.', 'text decoding', 'UTF-8'],
          [5, 'Line 5 — <b>viewport</b>. Without it phones pretend the page is ~980px wide and shrink it. With it, 1 CSS pixel fits the real screen width.', 'layout width', 'device width'],
          [6, 'Line 6 — <b>title</b>. Shown in the browser tab, bookmarks, history and Google results.', 'tab text', 'My page'],
          [9, 'Line 9 — <b>h1</b> inside the body. Only the body content is drawn.', 'visible content', '"Hello"']
        ];
        var vals = {}, f = [];
        steps.forEach(function (s) {
          vals[s[2]] = s[3];
          var hl = {}; hl[s[0]] = 'cur';
          f.push({ narr: s[1], parts: [{ type: 'code', label: 'index.html', lang: 'html', code: code, hl: hl }, { type: 'vars', label: 'What the browser knows now', vals: JSON.parse(JSON.stringify(vals)) }] });
        });
        return f;
      }
    }
  ],
  examples: [
    {
      title: 'Same page, three ways to break it — and what the browser does',
      html: `<p>The parser never throws an error page at you. Compare:</p>
      ${H.table(['What you wrote', 'What the browser builds', 'Lesson'], [
        ['<code>&lt;p&gt;One&lt;p&gt;Two</code>', 'Two sibling paragraphs (the 2nd <code>p</code> closes the 1st)', 'End tag of <code>p</code> is optional but write it anyway'],
        ['<code>&lt;b&gt;&lt;i&gt;x&lt;/b&gt;&lt;/i&gt;</code>', 'Bold+italic text, with extra repair work', 'Mis-nesting is "fixed" with a complicated algorithm — avoid it'],
        ['<code>&lt;p&gt;&lt;div&gt;Hi&lt;/div&gt;&lt;/p&gt;</code>', '<code>&lt;p&gt;&lt;/p&gt;&lt;div&gt;Hi&lt;/div&gt;&lt;p&gt;&lt;/p&gt;</code> — an empty p, then the div, then the stray end tag becomes another <i>empty p</i>', 'A paragraph cannot hold a div; you get surprise empty paragraphs']
      ])}`
    },
    {
      title: 'Attributes: quoting, boolean attributes, custom data',
      html: `<p>Attributes are <code>name="value"</code>. <b>Boolean attributes</b> are on if present: <code>&lt;input disabled&gt;</code> means disabled, and <code>disabled="false"</code> is <span class="c-r">still disabled</span> (the mere presence counts!). Custom data goes in <code>data-*</code> attributes and is readable in JS as <code>el.dataset.userId</code>.</p>`,
      code: { lang: 'html', code: `<button id="save" class="btn primary" data-user-id="42" disabled>Save</button>
<!-- id: unique on the page   class: reusable style hook   data-*: your own info -->
<!-- unquoted values break on spaces: <p class=a b> means class="a" plus a boolean attribute "b" -->` }
    },
    {
      title: 'Entities: showing characters that HTML would eat',
      html: `${H.table(['You want to see', 'Write', 'Why'], [
        ['&lt;div&gt;', '<code>&amp;lt;div&amp;gt;</code>', 'A real &lt; would start a tag'],
        ['Tom &amp; Jerry', '<code>Tom &amp;amp; Jerry</code>', '&amp; starts an entity'],
        ['©  2026', '<code>&amp;copy; 2026</code> or just ©', 'With utf-8 you can type © directly'],
        ['two  spaces', '<code>two&amp;nbsp;&amp;nbsp;spaces</code>', 'Normal spaces are collapsed to one']
      ])}<p>If user text is placed into a page without escaping, that is the door to <b>XSS</b> (script injection) — you will meet it in the security module.</p>`
    },
    {
      title: 'Where do &lt;script&gt; and &lt;link&gt; go?',
      html: `<p><code>&lt;link rel="stylesheet"&gt;</code> goes in the head so styles arrive before the page is drawn (no flash of unstyled text). A classic <code>&lt;script&gt;</code> blocks the parser while it downloads and runs, so either put it at the end of the body or (better) use <code>defer</code> in the head. More in the Meta &amp; SEO topic's script-loading visualizer.</p>`,
      code: { lang: 'html', code: `<head>
  <link rel="stylesheet" href="/css/site.css">
  <script src="/js/app.js" defer><\/script>
</head>` }
    }
  ],
  deepDive: `<p><b>🟣 Under the hood.</b> The HTML parser is not a normal "strict" parser. The spec (WHATWG HTML Living Standard) defines a <b>tokenizer</b> (turns characters into start-tag, end-tag, text, comment tokens) and a <b>tree builder</b> with about 20 "insertion modes" (<i>before html, in head, in body, in table, in select</i>...). Because every possible byte sequence has a defined result, all browsers build the <b>same</b> DOM even for broken input — that is why the spec describes error recovery in such detail.</p>
  <p><b>Things the tree builder does for you:</b> creates <code>html/head/body</code> if missing; closes <code>li</code>, <code>p</code>, <code>td</code> etc. when a sibling starts; inserts a <code>tbody</code> inside a <code>table</code> if you write <code>tr</code> directly; moves stray text out of a table ("foster parenting"); and applies the "adoption agency algorithm" to repair mis-nested formatting tags (<code>b, i, a</code>).</p>
  <p><b>Streaming.</b> The browser parses while bytes arrive. A <code>&lt;script&gt;</code> without <code>defer/async</code> pauses parsing (and a "preload scanner" peeks ahead to start downloading images/CSS). That is why where tags sit in the file changes page speed.</p>
  <p><b>Quirks, limited-quirks, standards mode.</b> The doctype is only there to pick the mode. In quirks mode the box model, table font inheritance and line heights follow old IE rules. Modern pages always use <code>&lt;!doctype html&gt;</code> — a short magic string that is the shortest doctype that triggers standards mode.</p>
  <p><b>Encoding sniffing.</b> The browser checks a BOM (byte order mark) at the start of the file first, then the HTTP <code>Content-Type</code> header, then a <code>meta charset</code> found in the first 1024 bytes. Late or missing charset means mojibake ("Ã©" instead of "é").</p>
  <p><b>Performance reality.</b> A deep or huge DOM (tens of thousands of nodes) makes every style recalculation and layout slower. Lighthouse's DOM size audit warns above ~800 nodes and fails above ~1,400. Keep wrapper-<code>div</code> soup low.</p>
  <p><b>Interview edge cases:</b> "Why does <code>&lt;/br&gt;</code> act like <code>&lt;br&gt;</code>?" (spec quirk). "Is <code>&lt;html&gt;</code> optional?" (its tags are, the element never is). "Difference between the HTML source and the DOM?" — the DOM is what the parser produced <i>and</i> what scripts changed since; View Source shows the former, DevTools Elements shows the latter.</p>`,
  aiEra: `<p><b>🤖 What AI changes.</b> Assistants write full page skeletons in seconds, so typing boilerplate by hand is no longer the skill. What still matters is <b>reading</b> the output and knowing what is right.</p>
  <p><b>Use AI as a partner:</b> paste messy HTML and ask <code>List every parser error-recovery fix a browser would apply to this, and give me the DOM tree as an indented outline</code>. Compare with DevTools. Or ask: <code>Give me 5 broken HTML snippets for a nesting quiz, without the answers</code>, then check yourself with the visualizer above.</p>
  <p><b>Where AI goes wrong:</b> it likes <code>&lt;div&gt;</code> for everything, forgets <code>lang</code> and the viewport meta, writes self-closing syntax like <code>&lt;div /&gt;</code> (which does <b>not</b> close a div in HTML!), pastes old XHTML doctypes, and sometimes invents attributes. It also happily puts a <code>&lt;div&gt;</code> inside a <code>&lt;p&gt;</code>.</p>
  <p><b>What you must still own:</b> the mental model "text → tokens → tree", being able to run the validator, and checking the result in the browser DevTools <b>Elements</b> panel rather than trusting the source text. In an interview, narrate the parser, do not just recite tags.</p>`,
  problems: [{
    title: 'Repair the Broken Page Skeleton',
    level: 'Easy', tags: ['document structure', 'head', 'boilerplate'], companies: ['Infosys', 'TCS', 'Amazon'],
    statement: `<p>A junior wrote the page below. It "works" in Chrome but fails a code review. Rewrite it as a <b>valid, well-structured HTML5 document</b> with: the doctype, a language, the charset, a mobile viewport, a meaningful title, content inside the body only, and correctly nested/closed tags. Keep the visible content the same.</p>
    <pre>&lt;html&gt;
&lt;title&gt;home&lt;/title&gt;
&lt;h1&gt;Welcome to Chai Corner
&lt;p&gt;Fresh tea, &lt;b&gt;&lt;i&gt;every day&lt;/b&gt;&lt;/i&gt;
&lt;br&gt;&lt;img src="tea.jpg"&gt;</pre>`,
    constraints: `Use only standard HTML5 elements. Do not add CSS or JavaScript. Output a single document.`,
    example: `<p>${H.c('r', 'Input')}: no doctype, no head/body, <code>h1</code> never closed, <code>b</code>/<code>i</code> crossed, image without alt.</p><p>${H.c('g', 'Output')}: a skeleton with all parts, the h1 closed, nesting <code>&lt;b&gt;&lt;i&gt;...&lt;/i&gt;&lt;/b&gt;</code>, and <code>alt</code> on the image. <i>Why</i>: the browser repaired the original silently, but code that depends on repair is fragile.</p>`,
    brute: { why: `<p>The "brute force" is to leave it and trust the browser. It renders, but you rely on error recovery: the h1 swallows the paragraph in some validators, the image has no alternative text, phones render it tiny (no viewport) and Hindi/Tamil names would be garbled without a charset.</p>`, code: { lang: 'html', code: `<html>
<title>home</title>
<h1>Welcome to Chai Corner
<p>Fresh tea, <b><i>every day</b></i>
<br><img src="tea.jpg">` } },
    mcq: { q: 'Which is the FIRST thing you should check when a page looks tiny on a phone?', options: ['The viewport meta tag', 'The doctype', 'The body background colour', 'The title text'], answer: 0, explain: 'Without the viewport meta tag mobile browsers assume a ~980px wide layout and zoom out the whole page.' },
    hints: [
      `<p>Hint 1 (aha): a page = doctype + <code>html</code> root + <code>head</code> (about the page) + <code>body</code> (what people see). Find which line belongs where.</p>`,
      `<p>Hint 2: the head needs three things nearly every time: <code>meta charset</code>, <code>meta viewport</code> and a <code>title</code>. Put <code>lang</code> on the <code>html</code> tag.</p>`,
      `<p>Hint 3: close the h1 before the paragraph, nest <code>b</code> and <code>i</code> last-open-first-closed, give the image an <code>alt</code>. Recipe: doctype → html → head(meta, meta, title) → body(h1, p, img).</p>`
    ],
    solution: {
      approach: `<p>Build the skeleton first, then move each old line to the right home and fix the nesting. The <code>br</code> was only used for spacing, so it is dropped (use CSS for spacing); the image gets descriptive <code>alt</code> text.</p>`,
      code: { lang: 'html', code: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Chai Corner – Fresh tea every day</title>
  </head>
  <body>
    <h1>Welcome to Chai Corner</h1>
    <p>Fresh tea, <b><i>every day</i></b></p>
    <img src="tea.jpg" alt="A steaming glass of masala chai" width="320" height="240">
  </body>
</html>` },
      complexity: `<p>Parsing is linear, O(n) in the file size. The real win is not speed but predictability: every browser builds the same DOM with no reliance on guesswork.</p>`,
      followUps: ['Why add width and height on the img? (reserves space, avoids layout shift)', 'What would you change if this page were in Hindi?']
    }
  }]
});

/* ====================== TOPIC 2: SEMANTIC HTML ====================== */
var LANDMARKS = {
  header: { role: 'banner', x: 14, y: 22, parent: 'body', say: 'the site header (logo, title) — only when it is NOT inside article/section/main' },
  nav: { role: 'navigation', x: 38, y: 22, parent: 'body', say: 'a block of navigation links' },
  main: { role: 'main', x: 62, y: 22, parent: 'body', say: 'the one main content of the page (skip-to-content target)' },
  aside: { role: 'complementary', x: 86, y: 22, parent: 'body', say: 'side content related to the page (ads, related links)' },
  footer: { role: 'contentinfo', x: 50, y: 54, parent: 'body', say: 'the page footer (copyright, contact) — only when it is a direct child of body' },
  article: { role: 'article', x: 72, y: 38, parent: 'main', say: 'a self-contained piece (blog post, news story, comment)' },
  section: { role: 'region (only if it has a name)', x: 50, y: 38, parent: 'main', say: 'a themed group of content that has a heading' },
  search: { role: 'search', x: 14, y: 38, parent: 'header', say: 'a search box area' },
  div: { role: 'generic (none!)', x: 26, y: 54, parent: 'body', say: 'nothing — a screen reader skips it. It has no meaning.' }
};

function landmarkFrames(input) {
  var names = String(input).trim().toLowerCase().split(/[\s,]+/).filter(Boolean);
  if (!names.length) throw new Error('Type tag names such as: header nav main article aside footer');
  if (names.length > 9) throw new Error('Use at most 9 tags');
  names.forEach(function (nm) { if (!LANDMARKS[nm]) throw new Error('Unknown tag "' + nm + '". Use: ' + Object.keys(LANDMARKS).join(' ')); });
  var seen = {}, nodes = [{ id: 'body', label: 'body', x: 50, y: 6, shape: 'box' }], edges = [], tags = {}, frames = [], menu = [];
  function graph(hl, ehl) {
    return { type: 'graph', label: 'Page layout (boxes) and what assistive tech hears', directed: true, height: 62, nodes: nodes.map(function (n) { return n; }), edges: edges.map(function (e) { return e.slice(); }), hl: hl || {}, ehl: ehl || {}, tags: JSON.parse(JSON.stringify(tags)) };
  }
  frames.push({ narr: 'An empty <b>body</b>. A sighted person sees the layout at once. A screen-reader user cannot — they navigate by <b>landmarks</b> (jump list of regions). Let us add elements and see what they announce.', parts: [graph({ body: 'cur' }), { type: 'table', label: 'Landmark menu (what a screen-reader user can jump to)', columns: ['element', 'announced as'], rows: [] }] });
  names.forEach(function (nm) {
    var L = LANDMARKS[nm], id = nm + (seen[nm] ? seen[nm] + 1 : ''), dup = !!seen[nm];
    seen[nm] = (seen[nm] || 0) + 1;
    var parent = L.parent;
    var parentOk = parent === 'body' || nodes.some(function (n) { return n.id === parent; });
    if (!parentOk) parent = 'body';
    nodes.push({ id: id, label: nm === 'div' ? 'div' : '<' + nm + '>', x: L.x + (dup ? 6 : 0), y: L.y + (dup ? 8 : 0), shape: 'box' });
    edges.push([parent, id]);
    tags[id] = L.role;
    menu.push([nm === 'div' ? '<div>' : '<' + nm + '>', L.role]);
    var hl = {}, ehl = {}; hl[id] = nm === 'div' ? 'bad' : 'ok'; ehl[parent + '-' + id] = 'ok';
    var extra = '';
    if (dup && nm === 'main') extra = ' <span class="c-r">A page should have only ONE main.</span>';
    if (nm === 'section') extra = ' A <b>section</b> without a heading/name is just a <code>div</code> with extra letters.';
    if (nm === 'div') extra = ' Use <code>div</code> only as a last resort, when no meaningful element fits (pure layout hook).';
    frames.push({ narr: 'Add <b>&lt;' + nm + '&gt;</b> → announced as <b>' + L.role + '</b>: ' + L.say + '.' + extra, parts: [graph(hl, ehl), { type: 'table', label: 'Landmark menu (what a screen-reader user can jump to)', columns: ['element', 'announced as'], rows: menu.map(function (r) { return r.slice(); }), hl: (function () { var o = {}; o[menu.length - 1] = nm === 'div' ? 'bad' : 'ok'; return o; })() }] });
  });
  var useful = menu.filter(function (r) { return r[1].indexOf('generic') < 0; }).length;
  frames.push({ narr: 'Result: <b>' + useful + '</b> of ' + menu.length + ' elements give the user a jump target. Meaning comes for free with the right tag — no ARIA needed. Search engines use the same hints to understand which part is the real content.', parts: [graph({}, {}), { type: 'table', label: 'Landmark menu (what a screen-reader user can jump to)', columns: ['element', 'announced as'], rows: menu.map(function (r) { return r.slice(); }) }] });
  return frames;
}

function outlineFrames(input) {
  var lv = String(input).trim().split(/[\s,]+/).filter(Boolean).map(Number);
  if (!lv.length || lv.some(function (x) { return !(x >= 1 && x <= 6) || x % 1; })) throw new Error('Enter heading levels 1-6 separated by spaces, e.g. 1 2 3 2 4');
  if (lv.length > 12) throw new Error('Use at most 12 headings');
  var frames = [], rows = [], hl = {}, chain = [], h1s = 0, prev = 0, bad = 0;
  frames.push({ narr: 'Headings are the <b>table of contents</b> of your page. Screen-reader users jump heading to heading, and Google reads them to learn the topic. The rule: <b>one h1, and never skip a level going down</b> (h2 → h4 is a gap).', parts: [{ type: 'array', label: 'Heading levels in page order', values: lv.map(function (x) { return 'h' + x; }) }, { type: 'table', label: 'Outline check', columns: ['#', 'heading', 'verdict'], rows: [] }] });
  lv.forEach(function (x, i) {
    var verdict = 'ok', cls = 'ok';
    if (i === 0 && x !== 1) { verdict = 'page should start with h1'; cls = 'bad'; }
    else if (x === 1) { h1s++; if (h1s > 1) { verdict = 'second h1 (use one main title)'; cls = 'bad'; } }
    if (prev && x > prev + 1) { verdict = 'skips from h' + prev + ' to h' + x; cls = 'bad'; }
    if (cls === 'bad') bad++;
    while (chain.length && chain[chain.length - 1] >= x) chain.pop();
    chain.push(x);
    rows.push([String(i + 1), 'h' + x + '  ' + new Array(x).join('— '), verdict]);
    hl[rows.length - 1] = cls;
    var ahl = {}; ahl[i] = cls;
    frames.push({ narr: 'Heading <b>' + (i + 1) + '</b> is <b>h' + x + '</b>. ' + (cls === 'ok' ? 'It fits: it is the first heading, or at most one level deeper than the previous one (h' + prev + '), or it closes back up to a shallower level.' : '<span class="c-r">Problem: ' + verdict + '.</span> Headings describe nesting; a gap is like a book with chapter 1 and then section 1.2.1.'), parts: [{ type: 'array', label: 'Heading levels in page order', values: lv.map(function (y) { return 'h' + y; }), hl: ahl }, { type: 'stack', label: 'Current outline path (parents of this heading)', items: chain.map(function (c) { return 'h' + c; }) }, { type: 'table', label: 'Outline check', columns: ['#', 'heading', 'verdict'], rows: rows.map(function (r) { return r.slice(); }), hl: JSON.parse(JSON.stringify(hl)) }] });
    prev = x;
  });
  frames.push({ narr: bad ? '<span class="c-r">' + bad + ' problem(s) found.</span> Fix by choosing the heading level for its <i>meaning</i>, not its size — size is CSS\'s job.' : '<span class="c-g">Clean outline.</span> Each heading is exactly one step deeper than its parent.', parts: [{ type: 'table', label: 'Outline check', columns: ['#', 'heading', 'verdict'], rows: rows, hl: hl }] });
  return frames;
}

topics.push({
  title: 'Semantic HTML: Giving Elements Meaning',
  analogy: `<p>Imagine a building where every door is the same plain grey, no signs. That is a page made of <code>&lt;div&gt;</code>s. Now add signs: <b>Entrance, Reception, Lift, Exit</b>. That is semantic HTML. People can still walk through the plain building, but a blind visitor, a robot cleaner (a search engine) or someone in a hurry (keyboard user) needs the signs. <b>Semantic</b> just means "the tag name tells you what the thing <i>is</i>, not how it looks".</p>`,
  explain: `<p><b>🟢 The plain idea.</b> Use the element that <i>means</i> the right thing. The browser gives you free behaviour, free keyboard support and free meaning to screen readers and Google.</p>
  <p><b>Page-level landmarks</b> (big areas):</p>
  ${H.table(['Element', 'Means', 'Use it for', 'Screen reader says'], [
    ['<code>&lt;header&gt;</code>', 'Intro / top area', 'Logo, site title, top nav', '"banner" (when direct child of body)'],
    ['<code>&lt;nav&gt;</code>', 'Navigation links', 'Menus, breadcrumbs, pagination', '"navigation"'],
    ['<code>&lt;main&gt;</code>', 'Main content', 'The unique content of this page (only one)', '"main"'],
    ['<code>&lt;article&gt;</code>', 'Self-contained piece', 'Blog post, product card, comment', '"article"'],
    ['<code>&lt;section&gt;</code>', 'Themed group', 'A chapter that has its own heading', '"region" (if named)'],
    ['<code>&lt;aside&gt;</code>', 'Side info', 'Related links, sidebar, pull quote', '"complementary"'],
    ['<code>&lt;footer&gt;</code>', 'Closing area', 'Copyright, contact, legal links', '"contentinfo"']
  ])}
  <p><b>Text-level meaning.</b> Headings <code>h1–h6</code> make the outline. <code>&lt;p&gt;</code> is a paragraph. <code>&lt;strong&gt;</code> = important (not just bold), <code>&lt;em&gt;</code> = stressed word (not just italic). <code>&lt;b&gt;</code> and <code>&lt;i&gt;</code> are only for style-without-meaning (a product name, a foreign word). Others: <code>&lt;mark&gt;</code> (highlight), <code>&lt;time datetime="2026-10-15"&gt;</code>, <code>&lt;abbr title="..."&gt;</code>, <code>&lt;code&gt;</code>, <code>&lt;kbd&gt;</code>, <code>&lt;blockquote cite&gt;</code>, <code>&lt;figure&gt;</code> + <code>&lt;figcaption&gt;</code>.</p>
  <p><b>Lists.</b> <code>&lt;ul&gt;</code> (bullets, order does not matter), <code>&lt;ol&gt;</code> (numbered, order matters), <code>&lt;dl&gt;</code> (term + description pairs). A menu is a <i>list of links</i>: <code>nav &gt; ul &gt; li &gt; a</code>.</p>
  <p><b>Interactive meaning.</b> Use <code>&lt;button&gt;</code> for actions (do something here) and <code>&lt;a href&gt;</code> for navigation (go somewhere). A <code>&lt;div onclick&gt;</code> is not focusable, not triggered by Enter/Space, and says nothing to a screen reader. Fixing it with ARIA + tabindex + key handlers means re-building what <code>&lt;button&gt;</code> already does.</p>
  <p><b>Heading rule of thumb:</b> one <code>h1</code> per page, then go down one level at a time. Choose headings by <i>meaning</i>, style them with CSS.</p>
  <p><b>First rule of ARIA:</b> if a native element exists, use it instead of adding <code>role="..."</code> to a div.</p>`,
  clues: [
    '"Why use semantic HTML instead of divs?" → accessibility, SEO, keyboard behaviour, maintainability',
    '"Difference between <code>&lt;section&gt;</code>, <code>&lt;article&gt;</code> and <code>&lt;div&gt;</code>?"',
    '"<code>&lt;b&gt;</code> vs <code>&lt;strong&gt;</code>, <code>&lt;i&gt;</code> vs <code>&lt;em&gt;</code>"',
    '"How would a blind user find the main content quickly?" → landmarks, headings, skip link',
    '"Make this clickable div accessible" → just use <code>&lt;button&gt;</code>',
    '"How many <code>&lt;h1&gt;</code> / <code>&lt;main&gt;</code> should a page have?" → one each',
    '"Is a nav menu a list?" → yes, <code>nav &gt; ul &gt; li &gt; a</code>'
  ],
  code: [
    { lang: 'html', title: 'Div soup vs semantic page', code: `<!-- ❌ Div soup: looks fine, means nothing -->
<div class="top"><div class="logo">Chai Corner</div>
  <div class="menu"><div onclick="go('/menu')">Menu</div></div></div>

<!-- ✅ Semantic: same look (with CSS), full meaning -->
<header>
  <a href="/" class="logo">Chai Corner</a>
  <nav aria-label="Main">
    <ul>
      <li><a href="/menu" aria-current="page">Menu</a></li>
      <li><a href="/contact">Contact</a></li>
    </ul>
  </nav>
</header>
<main>
  <article>
    <h1>Why masala chai is better with ginger</h1>
    <p>Published <time datetime="2026-10-15">15 Oct 2026</time></p>
    <p>Fresh ginger gives <strong>warmth</strong>, not just heat.</p>
  </article>
  <aside><h2>Related</h2><ul><li><a href="/cardamom">Cardamom guide</a></li></ul></aside>
</main>
<footer><small>© 2026 Chai Corner</small></footer>` },
    { lang: 'js', run: true, title: 'Auditing a heading list (the logic behind the visualizer)', code: `// Given heading levels in page order, report accessibility problems.
function auditHeadings(levels) {
  const problems = [];
  let h1Count = 0, prev = 0;
  levels.forEach((lv, i) => {
    if (i === 0 && lv !== 1) problems.push('First heading is h' + lv + ', expected h1');
    if (lv === 1 && ++h1Count > 1) problems.push('More than one h1 (at position ' + (i + 1) + ')');
    if (prev && lv > prev + 1) problems.push('Skipped from h' + prev + ' to h' + lv + ' (position ' + (i + 1) + ')');
    prev = lv;
  });
  return problems;
}
console.log(auditHeadings([1, 2, 3, 2, 3]));        // []
console.log(auditHeadings([2, 4, 1, 1]));           // three problems` }
  ],
  codeTitle: ['Semantic page skeleton', 'Heading audit'],
  viz: [
    {
      title: 'Building a page from landmarks',
      input: 'header nav main article aside footer',
      inputLabel: 'Tags in order (header nav main aside footer article section search div)',
      gen: function (input) { return landmarkFrames(input); }
    },
    {
      title: 'Heading outline checker',
      input: '1 2 3 2 4 2',
      inputLabel: 'Heading levels in page order',
      gen: function (input) { return outlineFrames(input); }
    }
  ],
  examples: [
    {
      title: 'strong vs b, em vs i — same look, different meaning',
      html: `${H.table(['Tag', 'Looks', 'Meaning', 'Screen reader'], [
        ['<code>&lt;strong&gt;</code>', 'bold', 'Important / serious', 'May raise tone'],
        ['<code>&lt;b&gt;</code>', 'bold', 'Just visual attention (keyword, product name)', 'Normal tone'],
        ['<code>&lt;em&gt;</code>', 'italic', 'Stress: "I <em>love</em> chai" vs "<em>I</em> love chai"', 'Stresses the word'],
        ['<code>&lt;i&gt;</code>', 'italic', 'Other voice: foreign word, thought, ship name', 'Normal']
      ])}<p>Rule: ask "if I could not see this, would the meaning change?" If yes, use strong/em.</p>`
    },
    {
      title: 'Button vs link — which one?',
      html: `<p>Ask: <b>does it go to a new URL, or does it do something on this page?</b> A "Read more" that goes to another page is a link. "Add to cart", "Open menu", "Delete" are buttons. Links can open in a new tab and be bookmarked; buttons submit forms or run JS.</p>`,
      code: { lang: 'html', code: `<!-- navigation -->
<a href="/cart">Go to cart</a>

<!-- action (type="button" so it does NOT submit a surrounding form) -->
<button type="button" id="add">Add to cart</button>

<!-- ❌ never: a link used as a button, or a div used as either -->
<a href="#" onclick="add()">Add to cart</a>
<div class="btn" onclick="add()">Add to cart</div>` }
    },
    {
      title: 'Lists, figure and quotes in one article',
      html: `<p>Use the right container: steps → <code>ol</code>; ingredients → <code>ul</code>; a picture with a caption → <code>figure</code>; a quotation → <code>blockquote</code> with <code>cite</code>; a date → <code>time</code>.</p>`,
      code: { lang: 'html', code: `<article>
  <h2>Perfect chai in 3 steps</h2>
  <ol>
    <li>Boil water with ginger.</li>
    <li>Add tea leaves and milk.</li>
    <li>Strain and serve.</li>
  </ol>
  <figure>
    <img src="chai.jpg" alt="Two glasses of chai on a wooden table" width="600" height="400">
    <figcaption>Serve it hot, <abbr title="Do It Yourself">DIY</abbr> style.</figcaption>
  </figure>
  <blockquote cite="https://example.com/grandma">
    <p>A good cup needs patience.</p>
  </blockquote>
</article>` }
    },
    {
      title: 'Skip link: first focusable element',
      html: `<p>Keyboard users should not have to Tab through 30 menu links on every page. A <b>skip link</b> is the first link in the body: it jumps to <code>#main</code>. It is usually hidden until focused.</p>`,
      code: { lang: 'html', code: `<body>
  <a class="skip" href="#main">Skip to main content</a>
  <header>...nav with many links...</header>
  <main id="main" tabindex="-1">...</main>
</body>` }
    }
  ],
  deepDive: `<p><b>🟣 Under the hood: the accessibility tree.</b> Besides the DOM, the browser builds a second, smaller tree called the <b>accessibility tree</b>. Each node has a <b>role</b> (button, link, heading, navigation), a <b>name</b> (what it is called), <b>state</b> (checked, expanded, disabled) and <b>value</b>. Native elements fill these in automatically through "implicit ARIA roles" — <code>&lt;nav&gt;</code> becomes role <code>navigation</code> with no work. Screen readers, voice control and some browser translation tools read this tree, not your pixels. A <code>div</code> maps to <code>generic</code>, which is usually pruned out of the tree.</p>
  <p><b>Context-dependent roles.</b> <code>&lt;header&gt;</code> and <code>&lt;footer&gt;</code> are <code>banner</code>/<code>contentinfo</code> only when they are not inside <code>article</code>, <code>section</code>, <code>main</code>, <code>nav</code> or <code>aside</code>. Inside those they become plain generics. A <code>&lt;section&gt;</code> is only exposed as a <code>region</code> landmark when it has an accessible name (e.g. <code>aria-labelledby</code> pointing to its heading); otherwise it is generic. If you have two <code>&lt;nav&gt;</code>s, give each an <code>aria-label</code> ("Main", "Footer") so the user can tell them apart.</p>
  <p><b>The document outline algorithm is dead.</b> HTML5 once promised that nested <code>section</code>+<code>h1</code> would auto-compute levels. No browser or screen reader ever implemented it, and it was removed from the spec. So use real <code>h1–h6</code> levels yourself.</p>
  <p><b>Native behaviour for free.</b> <code>&lt;button&gt;</code>: focusable, Enter+Space activate, <code>disabled</code> support, form submit, announced "button". <code>&lt;details&gt;/&lt;summary&gt;</code>: an accordion with zero JS. <code>&lt;dialog&gt;</code> with <code>showModal()</code>: focus trapping, Esc to close, a backdrop. <code>&lt;label&gt;</code> expands the click target. Each saved line of JS is a bug that never exists.</p>
  <p><b>SEO angle.</b> Crawlers weigh headings, <code>main</code> content and link text. Link text like "click here" wastes a ranking signal; "Download the 2026 price list" helps. Semantic structure is also what lets AI crawlers pull clean main content (they usually drop nav/footer).</p>
  <p><b>Interview traps:</b> "Is <code>section</code> better than <code>div</code>?" — only if the content is a real section with a heading. "Can I have multiple <code>&lt;main&gt;</code>?" — only one visible at a time (others must have <code>hidden</code>). "Why not make everything <code>role="button"</code>?" — because ARIA changes only the announcement, not behaviour.</p>`,
  aiEra: `<p><b>🤖 What AI changes.</b> AI tools generate <code>div</code>-heavy markup because most of the web they learned from is div-heavy. AI-based browsing agents and answer engines also read your <b>accessibility tree and semantic structure</b> to find the main content, buttons and forms. Good semantics now helps humans, search engines <i>and</i> agents. (Computer-use agents often click by role and name such as "button: Add to cart" — a clickable <code>div</code> is invisible to them.)</p>
  <p><b>Use AI as a partner:</b> <code>Rewrite this div soup using semantic HTML, and explain each tag choice in one line</code>; <code>Which landmarks would a screen reader announce on this page?</code>; <code>Review this markup for heading-level gaps</code>.</p>
  <p><b>Where AI goes wrong:</b> over-using <code>&lt;section&gt;</code> without headings; adding <code>role="button"</code> on a <code>&lt;button&gt;</code> (redundant); wrapping a <code>&lt;button&gt;</code> inside an <code>&lt;a&gt;</code> (invalid); using several <code>&lt;h1&gt;</code> for styling; <code>aria-label</code> everywhere instead of visible text.</p>
  <p><b>What you must still own:</b> choosing the element by meaning, testing with only the keyboard (Tab, Enter, Space), and checking the Accessibility panel in DevTools. Tools like axe catch only part of the issues automatically (estimates run from about a third to over half); the rest needs human judgment.</p>`,
  problems: [{
    title: 'Turn Div Soup into a Semantic Page',
    level: 'Easy', tags: ['semantic', 'landmarks', 'accessibility'], companies: ['Flipkart', 'Wipro', 'Accenture'],
    statement: `<p>Rewrite the markup below using semantic HTML5 elements. Keep the same visible text. Required: header with site name and navigation list, one <code>main</code> with an <code>article</code> that has an <code>h1</code>, a related-links <code>aside</code>, a footer with copyright, a real <code>button</code> instead of the clickable div, and a <code>time</code> element for the date. Do not use ARIA roles.</p>
    <pre>&lt;div class="header"&gt;
  &lt;div class="logo"&gt;Chai Corner&lt;/div&gt;
  &lt;div class="menu"&gt;&lt;a href="/menu"&gt;Menu&lt;/a&gt; &lt;a href="/shop"&gt;Shop&lt;/a&gt;&lt;/div&gt;
&lt;/div&gt;
&lt;div class="content"&gt;
  &lt;div class="post"&gt;
    &lt;div class="title"&gt;Ginger chai tips&lt;/div&gt;
    &lt;div class="date"&gt;15 Oct 2026&lt;/div&gt;
    &lt;div class="btn" onclick="share()"&gt;Share&lt;/div&gt;
  &lt;/div&gt;
  &lt;div class="side"&gt;Related: &lt;a href="/cardamom"&gt;Cardamom&lt;/a&gt;&lt;/div&gt;
&lt;/div&gt;
&lt;div class="foot"&gt;© 2026 Chai Corner&lt;/div&gt;</pre>`,
    constraints: `No ARIA roles. Exactly one h1 and one main. Navigation must be a list of links.`,
    example: `<p>${H.c('r', 'div.menu')} → ${H.c('g', '&lt;nav&gt;&lt;ul&gt;&lt;li&gt;&lt;a&gt;...')}; ${H.c('r', 'div.btn onclick')} → ${H.c('g', '&lt;button type="button"&gt;')}; ${H.c('r', 'div.date')} → ${H.c('g', '&lt;time datetime="2026-10-15"&gt;')}. <i>Why</i>: each replacement gives the thing a role and keyboard behaviour for free.</p>`,
    brute: { why: `<p>The "naive" fix keeps divs and adds <code>role</code>, <code>tabindex</code> and key handlers by hand. It is long, easy to get wrong, and still misses things like form submission and focus styles that a real button includes.</p>`, code: { lang: 'html', code: `<div role="button" tabindex="0" onclick="share()" onkeydown="if(event.key==='Enter'||event.key===' ')share()">Share</div>
<div role="banner">...</div>
<div role="navigation">...</div>` } },
    mcq: { q: 'A "Share" control runs JavaScript and stays on the same page. Which element?', options: ['&lt;button type="button"&gt;', '&lt;a href="#"&gt;', '&lt;div onclick&gt;', '&lt;span role="link"&gt;'], answer: 0, explain: 'Actions that do not navigate are buttons. A link with href="#" jumps the page and announces "link".' },
    hints: [
      `<p>Hint 1 (aha): for each div ask "what IS this?" — site header, menu, main story, side note, footer, action. Pick the tag with that name.</p>`,
      `<p>Hint 2: a menu is a list of links, so <code>nav &gt; ul &gt; li &gt; a</code>. The post wrapper is an <code>article</code>; its title is the page <code>h1</code>.</p>`,
      `<p>Hint 3: structure = header(logo link + nav) · main(article(h1, time, button) , aside) · footer. Put the aside inside <code>main</code> since it relates to the page content, and give it an <code>h2</code>.</p>`
    ],
    solution: {
      approach: `<p>Map each div to the element that names its job. The logo becomes a link to home; the menu becomes a list inside <code>nav</code>; the post becomes an <code>article</code>; "Share" becomes a real button; the date becomes a <code>time</code> with a machine-readable value.</p>`,
      code: { lang: 'html', code: `<header>
  <a href="/" class="logo">Chai Corner</a>
  <nav aria-label="Main">
    <ul>
      <li><a href="/menu">Menu</a></li>
      <li><a href="/shop">Shop</a></li>
    </ul>
  </nav>
</header>
<main>
  <article>
    <h1>Ginger chai tips</h1>
    <p><time datetime="2026-10-15">15 Oct 2026</time></p>
    <button type="button" onclick="share()">Share</button>
  </article>
  <aside>
    <h2>Related</h2>
    <ul><li><a href="/cardamom">Cardamom</a></li></ul>
  </aside>
</main>
<footer><small>© 2026 Chai Corner</small></footer>` },
      complexity: `<p>No runtime cost — the same number of elements. The benefit is correctness: free keyboard handling, landmarks for screen readers, clearer content for search engines.</p>`,
      followUps: ['Which header/footer become generic if they are inside the article?', 'What would you add for a skip link?']
    }
  }]
});

/* ====================== TOPIC 3: LINKS, IMAGES, MEDIA ====================== */
function urlFrames(input) {
  var parts = String(input).split('|');
  if (parts.length !== 2) throw new Error('Format:  base URL | link written in href   e.g.  https://shop.com/a/b/page.html | ../img/cat.png');
  var base = parts[0].trim(), rel = parts[1].trim();
  var bm = base.match(/^([a-z][a-z0-9+.\-]*):\/\/([^\/?#]*)([^?#]*)/i);
  if (!bm || !bm[2]) throw new Error('The base must be a full URL like https://shop.com/a/b/page.html');
  if (!rel) throw new Error('Type something for the link (href) after the | sign');
  var scheme = bm[1].toLowerCase(), host = bm[2], bpath = bm[3] || '/', origin = scheme + '://' + host;
  var folderSegs = bpath.split('/').filter(Boolean);
  if (bpath.charAt(bpath.length - 1) !== '/') folderSegs.pop();
  var frames = [], full = '';
  var baseVars = { scheme: scheme, host: host, path: bpath, 'folder of this page': '/' + folderSegs.join('/') + (folderSegs.length ? '/' : '') };
  frames.push({ narr: 'The browser knows the <b>base URL</b> (the address of the page that contains the link). A relative link is resolved <i>against</i> it. The "folder" is the path without the file name.', parts: [{ type: 'vars', label: 'Base URL pieces', vals: baseVars }, { type: 'text', html: 'href = <code>' + esc(rel) + '</code>' }] });
  var kind, why;
  if (/^[a-z][a-z0-9+.\-]*:/i.test(rel)) { kind = 'absolute URL'; why = 'It starts with a scheme (like https:), so it is already complete. Nothing to resolve.'; full = rel; }
  else if (rel.indexOf('//') === 0) { kind = 'protocol-relative'; why = 'Starts with //. Keep the base scheme (' + scheme + ') and replace host + path.'; full = scheme + ':' + rel; }
  else if (rel.charAt(0) === '/') { kind = 'root-relative'; why = 'Starts with a single /. Start from the site root: same scheme + host, brand-new path.'; full = origin + rel; }
  else if (rel.charAt(0) === '#') { kind = 'fragment only'; why = 'Starts with #. Same page; only the part after # changes (scroll to that id).'; full = origin + bpath + rel; }
  else if (rel.charAt(0) === '?') { kind = 'query only'; why = 'Starts with ?. Same page path, new query string.'; full = origin + bpath + rel; }
  else { kind = 'path-relative'; why = 'No leading slash. Start in the page\'s own folder and walk: ".." goes up one folder, "." means stay, a name goes down.'; }
  frames.push({ narr: 'Classify the href: <b>' + kind + '</b>. ' + why, parts: [{ type: 'table', label: 'The 6 kinds of href', columns: ['kind', 'example', 'starts with'], rows: [['absolute URL', 'https://a.com/x', 'scheme:'], ['protocol-relative', '//cdn.com/x.js', '//'], ['root-relative', '/img/x.png', '/'], ['path-relative', '../img/x.png', 'a name, ./ or ../'], ['query only', '?page=2', '?'], ['fragment only', '#faq', '#']], hl: { 0: kind === 'absolute URL' ? 'ok' : '', 1: kind === 'protocol-relative' ? 'ok' : '', 2: kind === 'root-relative' ? 'ok' : '', 3: kind === 'path-relative' ? 'ok' : '', 4: kind === 'query only' ? 'ok' : '', 5: kind === 'fragment only' ? 'ok' : '' } }] });
  if (kind === 'path-relative') {
    var relPath = rel.split(/[?#]/)[0], suffix = rel.slice(relPath.length), segs = relPath.split('/'), stk = folderSegs.slice(), trailing = false;
    if (segs.length > 12) throw new Error('Use at most 12 path pieces');
    frames.push({ narr: 'Put the base folder on a <b>stack</b>: one item per folder. Then read the link piece by piece.', parts: [{ type: 'stack', label: 'Path so far (bottom = site root)', items: stk.slice() }] });
    segs.forEach(function (sg, i) {
      var hl = {}, msg;
      if (sg === '..') { if (stk.length) { stk.pop(); } msg = '<b>..</b> means "go up one folder": pop the stack' + (stk.length === 0 ? ' (already at the root, so it stays there)' : '') + '.'; trailing = true; }
      else if (sg === '.') { msg = '<b>.</b> means "this folder": nothing changes.'; trailing = true; }
      else if (sg === '') { msg = 'Empty piece (a trailing /): the link points to a folder.'; trailing = true; }
      else { stk.push(sg); msg = '<b>' + esc(sg) + '</b> is a name: go down into it (or it is the file).'; trailing = false; }
      if (stk.length) hl[stk.length - 1] = 'cur';
      frames.push({ narr: 'Piece ' + (i + 1) + ' of ' + segs.length + ': ' + msg, parts: [{ type: 'array', label: 'Link pieces', values: segs.map(function (s) { return s === '' ? '(empty)' : s; }), hl: (function () { var o = {}; o[i] = 'cur'; return o; })() }, { type: 'stack', label: 'Path so far (bottom = site root)', items: stk.slice(), hl: hl }] });
    });
    full = origin + '/' + stk.join('/') + (trailing && stk.length ? '/' : '') + suffix;
    frames.push({ narr: 'Join origin + path: <b>' + esc(full) + '</b>. This is exactly what JavaScript\'s <code>new URL(href, base)</code> returns.', parts: [{ type: 'vars', label: 'Final', vals: { 'resolved URL': full }, hl: { 'resolved URL': 'sel' } }] });
  } else {
    frames.push({ narr: 'Apply the rule for <b>' + kind + '</b>.', parts: [{ type: 'vars', label: 'Rule applied', vals: { scheme: kind === 'absolute URL' ? 'from href' : scheme, host: kind === 'absolute URL' || kind === 'protocol-relative' ? 'from href' : host, path: kind === 'fragment only' || kind === 'query only' ? bpath : 'from href' } }] });
    frames.push({ narr: 'Final URL the browser requests: <b>' + esc(full) + '</b> (the same answer as <code>new URL(href, base)</code>).', parts: [{ type: 'vars', label: 'Final', vals: { 'resolved URL': full }, hl: { 'resolved URL': 'sel' } }] });
  }
  return frames;
}

function srcsetFrames(input) {
  var p = String(input).trim().split(/[\s,x]+/).map(Number);
  if (p.length < 2 || isNaN(p[0]) || isNaN(p[1]) || p[0] < 200 || p[0] > 2600 || p[1] < 1 || p[1] > 4) throw new Error('Enter viewport width (200-2600) and pixel ratio (1-4), e.g. 390 3');
  var vw = p[0], dpr = p[1], cands = [400, 800, 1200, 1600], texts = cands.map(function (c) { return c + 'w'; });
  var slot = vw <= 600 ? vw : Math.round(vw * 0.5), need = Math.round(slot * dpr), pick = -1, i;
  for (i = 0; i < cands.length; i++) if (cands[i] >= need) { pick = i; break; }
  if (pick < 0) pick = cands.length - 1;
  var frames = [];
  var code = '<img\n  srcset="cat-400.jpg 400w, cat-800.jpg 800w,\n          cat-1200.jpg 1200w, cat-1600.jpg 1600w"\n  sizes="(max-width: 600px) 100vw, 50vw"\n  src="cat-800.jpg" alt="A sleepy orange cat">';
  frames.push({ narr: 'The page offers 4 files of the same picture. <code>srcset</code> lists them with their real widths; <code>sizes</code> tells the browser how wide the picture will be on screen <i>before</i> CSS has loaded.', parts: [{ type: 'code', label: 'The markup', lang: 'html', code: code, hl: { 2: 'cur', 4: 'cur' } }, { type: 'bars', label: 'Available files (pixel width)', values: cands, texts: texts }] });
  frames.push({ narr: 'The device: viewport <b>' + vw + 'px</b> wide, pixel ratio <b>' + dpr + '×</b> (a phone with ratio 3 packs 3×3 real pixels into each CSS pixel).', parts: [{ type: 'vars', label: 'Device', vals: { 'viewport (CSS px)': vw, 'pixel ratio': dpr } }] });
  frames.push({ narr: 'Read <code>sizes</code>: ' + (vw <= 600 ? 'the screen is ≤ 600px, so the image takes <b>100vw</b> = ' + slot + 'px.' : 'the screen is wider than 600px, so the image takes <b>50vw</b> = ' + slot + 'px.'), parts: [{ type: 'vars', label: 'Slot the image will fill', vals: { 'width on screen (CSS px)': slot }, hl: { 'width on screen (CSS px)': 'cur' } }, { type: 'code', label: 'sizes rule', lang: 'html', code: 'sizes="(max-width: 600px) 100vw, 50vw"', hl: { 1: 'cur' } }] });
  frames.push({ narr: 'Real pixels needed = slot × pixel ratio = ' + slot + ' × ' + dpr + ' = <b>' + need + '</b> pixels wide for a sharp picture.', parts: [{ type: 'vars', label: 'Needed', vals: { 'slot': slot, 'ratio': dpr, 'pixels needed': need }, hl: { 'pixels needed': 'cur' } }] });
  var hl = {}, ptr = {};
  cands.forEach(function (c, k) { hl[k] = c >= need ? 'ok' : 'bad'; });
  frames.push({ narr: 'Compare: files smaller than ' + need + 'px would look blurry (<span class="c-r">red</span>); files at least as big are sharp (<span class="c-g">green</span>). The browser takes the <b>smallest sharp file</b> to save data.', parts: [{ type: 'bars', label: 'Files vs ' + need + 'px needed', values: cands, texts: texts, hl: hl }] });
  hl = {}; ptr = {}; hl[pick] = 'sel'; ptr[pick] = 'chosen';
  frames.push({ narr: 'Chosen: <b>cat-' + cands[pick] + '.jpg</b>' + (need > cands[cands.length - 1] ? ' (nothing is big enough, so the biggest is used).' : '.') + ' Browsers may choose slightly differently (they can reuse an already cached bigger file), but this is the idea. Always keep a normal <code>src</code> as fallback.', parts: [{ type: 'bars', label: 'Chosen file', values: cands, texts: texts, hl: hl, ptr: ptr }] });
  return frames;
}

topics.push({
  title: 'Links, Images & Media',
  analogy: `<p>The web is a city, and every page has an <b>address</b> (URL). A link is a <b>signpost</b> that says "go to that address". A <b>relative</b> link is like saying "next door" or "two streets back" — it only makes sense once you know where you are standing. An image is a <b>photo frame</b> on the wall: the frame (width/height) should be fixed before the photo arrives, otherwise the furniture jumps around when the photo shows up. And <code>alt</code> text is the sticky note under the photo for people who cannot see it.</p>`,
  explain: `<p><b>🟢 Links.</b> <code>&lt;a href="URL"&gt;words&lt;/a&gt;</code>. The <b>words</b> matter: "Read the pricing guide" beats "click here" for people, screen readers (which can list all links) and Google.</p>
  ${H.table(['href value', 'Goes to', 'Notes'], [
    ['<code>https://other.com/page</code>', 'Another website', 'Absolute URL'],
    ['<code>/about</code>', 'Site root + /about', 'Root-relative: safe wherever the page lives'],
    ['<code>team.html</code>', 'Same folder', 'Path-relative'],
    ['<code>../img/a.png</code>', 'Up one folder, then img/', '<code>..</code> = parent folder'],
    ['<code>#faq</code>', 'Same page, element with <code>id="faq"</code>', 'Jump link (fragment)'],
    ['<code>mailto:hi@x.com</code>', 'Opens the email app', 'Also <code>tel:+911234567890</code>']
  ])}
  <p><b>Opening in a new tab.</b> <code>target="_blank"</code> opens a tab. Modern browsers already treat it as <code>rel="noopener"</code>, but writing <code>rel="noopener noreferrer"</code> is still the common safe habit (stops the new page from controlling the old one and from seeing where you came from). Also warn the user: "(opens in new tab)".</p>
  <p><b>🟢 Images.</b> <code>&lt;img src="cat.jpg" alt="A sleepy orange cat" width="600" height="400"&gt;</code>. Four things to remember:</p>
  <ul>
    <li><b>alt</b> – required. Describe the <i>purpose</i>. If the image is pure decoration use <code>alt=""</code> (empty, not missing!) so screen readers skip it.</li>
    <li><b>width + height</b> – tell the browser the shape early, so it reserves the space (prevents the page jumping: "layout shift").</li>
    <li><b>loading="lazy"</b> – do not download pictures far below the screen until the user scrolls near them. Never lazy-load the big top image.</li>
    <li><b>srcset + sizes</b> – give several files, let the browser pick a good one for the device (visualizer below).</li>
  </ul>
  <p><b>&lt;picture&gt;</b> chooses between <i>different</i> images or formats (<code>source type="image/avif"</code>, then webp, then the jpg fallback), or a different crop for phones (<b>art direction</b>, using <code>media</code>).</p>
  <p><b>🟢 Audio &amp; video.</b> <code>&lt;video controls src="movie.mp4" poster="thumb.jpg"&gt;</code> and <code>&lt;audio controls&gt;</code>. Give several <code>&lt;source&gt;</code>s for format fallbacks and a <code>&lt;track kind="captions"&gt;</code> for subtitles. Browsers usually block autoplay unless the video is <code>muted</code>. Other embeds: <code>&lt;iframe title="..." src="..."&gt;</code> (always give a title) and <code>&lt;figure&gt;</code> + <code>&lt;figcaption&gt;</code> to attach a caption to any of them.</p>`,
  clues: [
    '"Difference between absolute, relative and root-relative URLs?" → resolve against the base URL',
    '"Why does the image jump / page shift when it loads?" → missing width/height (CLS)',
    '"What should alt be for a decorative image / for a logo link / for a chart?"',
    '"Serve smaller images to phones" → srcset + sizes, or picture',
    '"What is the security risk of <code>target="_blank"</code>?" → window.opener / reverse tabnabbing → rel="noopener"',
    '"Make a video accessible" → captions track, transcript, controls, no sound autoplay',
    '"Lazy-load below-the-fold images only" → loading="lazy" (not for the LCP image)'
  ],
  code: [
    { lang: 'html', title: 'Responsive, accessible, fast image', code: `<!-- Modern formats first, jpg as the safe fallback. width/height reserve space. -->
<picture>
  <source type="image/avif" srcset="cat-400.avif 400w, cat-800.avif 800w" sizes="(max-width: 600px) 100vw, 50vw">
  <source type="image/webp" srcset="cat-400.webp 400w, cat-800.webp 800w" sizes="(max-width: 600px) 100vw, 50vw">
  <img src="cat-800.jpg" alt="A sleepy orange cat curled on a blue sofa"
       width="800" height="533" loading="lazy" decoding="async">
</picture>

<!-- Video with captions and a poster picture -->
<video controls preload="metadata" poster="intro.jpg" width="640" height="360">
  <source src="intro.webm" type="video/webm">
  <source src="intro.mp4" type="video/mp4">
  <track kind="captions" src="intro.en.vtt" srclang="en" label="English" default>
  Your browser cannot play this video. <a href="intro.mp4">Download it</a>.
</video>` },
    { lang: 'js', run: true, title: 'Resolving a link against a base URL (what the browser does)', code: `// new URL(href, base) is the same algorithm the browser uses for <a href> and <img src>.
const base = 'https://shop.com/products/tea/page.html';
const links = ['detail.html', './detail.html', '../coffee/', '/cart', '//cdn.com/x.js', '#reviews', '?page=2', 'https://other.org/a', '../../../../up'];
for (const href of links) {
  console.log(href.padEnd(22), '->', new URL(href, base).href);
}` }
  ],
  codeTitle: ['Picture, srcset and video', 'URL resolution'],
  viz: [
    {
      title: 'How the browser resolves a relative link',
      input: 'https://shop.com/products/tea/page.html | ../coffee/beans.png',
      inputLabel: 'base URL | href',
      gen: function (input) { return urlFrames(input); }
    },
    {
      title: 'How the browser picks a file from srcset',
      input: '390 3',
      inputLabel: 'viewport width, pixel ratio',
      gen: function (input) { return srcsetFrames(input); }
    }
  ],
  examples: [
    {
      title: 'Same page, three link styles — what breaks when you move the page?',
      html: `<p>Page lives at <code>/blog/2026/post.html</code> and links to the logo at <code>/img/logo.png</code>:</p>
      ${H.table(['href you wrote', 'Resolves to (from /blog/2026/)', 'If the page moves deeper, to /blog/2026/09/post.html'], [
        ['<code>../../img/logo.png</code>', '/img/logo.png ✅', '<span class="c-r">/blog/img/logo.png → wrong folder</span>'],
        ['<code>/img/logo.png</code>', '/img/logo.png ✅', '<span class="c-g">still /img/logo.png ✅</span>'],
        ['<code>https://shop.com/img/logo.png</code>', 'same ✅', 'works, but hard-coded domain (bad for staging)']
      ])}<p>Root-relative is the best default for your own site; use <code>&lt;base href&gt;</code> only if you know exactly why.</p>`
    },
    {
      title: 'alt text: three situations',
      html: `${H.table(['Image', 'Good alt', 'Why'], [
        ['Photo in an article', '<code>alt="Farmer picking tea leaves in Darjeeling"</code>', 'Says what a sighted person gets from it'],
        ['Logo that is the home link', '<code>alt="Chai Corner – home"</code>', 'Describe the <i>action/destination</i>, not "logo"'],
        ['Decorative swirl', '<code>alt=""</code>', 'Empty = skip. Missing alt = reader announces the file name!'],
        ['Chart', 'Short alt + the data in text/table nearby', 'Alt is not the place for 500 words']
      ])}`
    },
    {
      title: 'Safe external links and file downloads',
      html: `<p>Links to other sites in a new tab, mail/phone links and downloads:</p>`,
      code: { lang: 'html', code: `<a href="https://developer.mozilla.org/" target="_blank" rel="noopener noreferrer">MDN (opens in new tab)</a>
<a href="mailto:hello@chai.example?subject=Hi">Email us</a>
<a href="tel:+911234567890">Call +91 12345 67890</a>
<a href="/files/menu.pdf" download="chai-menu.pdf">Download the menu (PDF, 120 KB)</a>
<!-- Jump link: scrolls to the element whose id is "faq" -->
<a href="#faq">Jump to FAQ</a> ... <h2 id="faq">FAQ</h2>` }
    },
    {
      title: 'Art direction with &lt;picture&gt;: different crop on phones',
      html: `<p>A wide landscape photo is unreadable on a phone. <code>media</code> on a <code>source</code> swaps the file for narrow screens, and the <code>img</code> inside is the fallback and the element that actually shows.</p>`,
      code: { lang: 'html', code: `<picture>
  <source media="(max-width: 600px)" srcset="hero-square.jpg">
  <source media="(min-width: 601px)" srcset="hero-wide.jpg">
  <img src="hero-wide.jpg" alt="Our tea garden at sunrise" width="1600" height="600">
</picture>` }
    }
  ],
  deepDive: `<p><b>🟣 URL resolution (RFC 3986).</b> The "base URL" is the document's URL unless a <code>&lt;base href&gt;</code> exists. The browser then runs the standard <b>URL parser</b>: strip the file name from the base path, append the relative path, remove dot-segments (<code>.</code> and <code>..</code>), and re-attach query/fragment. It is the same algorithm as JavaScript's <code>new URL(href, base)</code>. <code>..</code> at the root never goes above the root.</p>
  <p><b>Image loading pipeline.</b> The preload scanner finds <code>img</code> tags early and starts downloads while the parser continues. For <code>srcset</code>, the browser multiplies slot width by device pixel ratio (or uses <code>x</code> descriptors like <code>2x</code>), then picks a candidate — it may pick a bigger cached one or a smaller one on slow networks. <code>sizes</code> is needed because CSS layout is not known during parsing. Wrong <code>sizes</code> is the #1 reason people download 2 MB pictures into a 300px box.</p>
  <p><b>Layout shift and LCP.</b> With <code>width</code>/<code>height</code> attributes the browser computes <code>aspect-ratio</code> before the file arrives, so there is no jump (CLS ≈ 0). The biggest above-the-fold image is usually the <b>LCP</b> element: give it <code>fetchpriority="high"</code> and <b>do not</b> lazy-load it. Below the fold use <code>loading="lazy"</code> and <code>decoding="async"</code>.</p>
  <p><b>Formats.</b> JPEG for photos (old, universal), PNG for sharp graphics with transparency, WebP (~25–35% smaller), AVIF (often ~50% smaller, slower to encode), SVG for icons/logos (vector, scales for free). Use <code>&lt;picture&gt;</code> to offer new formats with a fallback.</p>
  <p><b>Security corner.</b> <code>target="_blank"</code> without noopener used to give the new page <code>window.opener</code> access ("reverse tabnabbing"); browsers now default to noopener but explicit <code>rel</code> is still best practice. <code>rel="nofollow"</code>/<code>ugc</code>/<code>sponsored</code> tell search engines you do not vouch for a link. Never put user-supplied URLs into <code>href</code> without checking the scheme: <code>javascript:alert(1)</code> is a valid href and a classic XSS trick.</p>
  <p><b>Media extras.</b> Autoplaying video must be <code>muted playsinline</code> on mobile. <code>preload="none|metadata|auto"</code> controls how much is fetched before play. Streaming at scale uses adaptive formats (HLS/DASH) through MSE, not a plain <code>mp4</code> link. Captions are WCAG-required for prerecorded video with speech.</p>`,
  aiEra: `<p><b>🤖 What AI changes.</b> AI image generators produce pictures in seconds, and CDNs/image services (Cloudinary, Cloudflare Images, Next.js <code>&lt;Image&gt;</code>) resize and convert to AVIF/WebP on the fly — so hand-writing 12 sizes is rare in real products. AI vision models can also draft <b>alt text</b> for you, which is a huge time-saver for big libraries.</p>
  <p><b>Use AI as a partner:</b> <code>Write alt text for this product photo in under 120 characters, describe what matters for a shopper</code>; <code>Generate a picture element with avif/webp/jpg and correct sizes for a 2-column grid</code>; <code>Explain why the browser downloaded the 1600w file on my laptop</code>.</p>
  <p><b>Where AI goes wrong:</b> alt text like "image of a cat" (the word "image" is noise) or invented details it cannot really see; missing <code>width/height</code>; a perfect-looking <code>srcset</code> with a wrong <code>sizes</code> value; <code>loading="lazy"</code> on the hero image (hurts LCP); copying <code>target="_blank"</code> without <code>rel</code>.</p>
  <p><b>What you must still own:</b> deciding the <i>purpose</i> of each image (informative / decorative / functional), checking the Network tab to confirm the right file was downloaded, and verifying captions are accurate. Auto-generated alt text should be reviewed — a wrong description is worse than none.</p>`,
  problems: [{
    title: 'Responsive Hero Image with Art Direction',
    level: 'Medium', tags: ['picture', 'srcset', 'performance', 'images'], companies: ['Swiggy', 'Zomato', 'Adobe'],
    statement: `<p>Write the HTML for a hero banner. Files available: <code>hero-wide-800.webp</code> (800w), <code>hero-wide-1600.webp</code> (1600w), the same two as <code>.jpg</code>, and a square crop <code>hero-sq-400.webp</code>/<code>hero-sq-400.jpg</code> for phones. Requirements: phones (≤ 600px wide) get the square crop, others get the wide one; WebP is preferred with a JPG fallback; the image is the first thing on the page (so it must NOT be lazy-loaded and should be high priority); it must not cause layout shift; it needs useful alt text.</p>`,
    constraints: `Use picture/source/img only. Width/height must match the wide file's shape (1600×600). No CSS or JS.`,
    example: `<p>Viewport 390px, ratio 3 → <code>media="(max-width: 600px)"</code> matches the square sources → browser picks <code>hero-sq-400.webp</code> (WebP supported). Viewport 1200px → wide sources → webp 1600w if ratio makes it sharper. <i>Why</i>: the first source whose <code>media</code> and <code>type</code> both match wins, in document order.</p>`,
    brute: { why: `<p>A single <code>img</code> pointing at the 1600px JPG: phones download ~600 KB they cannot show, the crop shows a tiny strip of a wide photo, no modern format, and without width/height the page jumps.</p>`, code: { lang: 'html', code: `<img src="hero-wide-1600.jpg" alt="hero">` } },
    mcq: { q: 'In a &lt;picture&gt;, which source is used?', options: ['The first one whose media and type both match', 'The smallest file', 'The last source tag', 'All of them, merged'], answer: 0, explain: 'The browser walks the sources in order and uses the first usable one; the img is the fallback and the element that is actually rendered.' },
    hints: [
      `<p>Hint 1 (aha): order matters. Put the most specific (phone + webp) first and broader/fallback choices after.</p>`,
      `<p>Hint 2: each <code>source</code> can have <code>media</code> and <code>type</code>. Phone square: webp then jpg. Wide: webp then jpg via srcset widths and sizes.</p>`,
      `<p>Hint 3: the inner <code>img</code> carries alt, width, height, <code>fetchpriority="high"</code> and has NO <code>loading="lazy"</code>. Recipe: 4 sources (phone-webp, phone-jpg, wide-webp, wide-jpg) + fallback img.</p>`
    ],
    solution: {
      approach: `<p>Use one <code>&lt;picture&gt;</code>. Two sources for phones (webp then jpg, guarded by a <code>media</code> query), then two for everything else with <code>srcset</code> width descriptors. The <code>img</code> carries the fallback, size attributes and priority hints.</p>`,
      code: { lang: 'html', code: `<picture>
  <!-- phones: square crop, best format first -->
  <source media="(max-width: 600px)" type="image/webp" srcset="hero-sq-400.webp">
  <source media="(max-width: 600px)" srcset="hero-sq-400.jpg">
  <!-- everyone else: wide crop in two widths -->
  <source type="image/webp" srcset="hero-wide-800.webp 800w, hero-wide-1600.webp 1600w" sizes="100vw">
  <source srcset="hero-wide-800.jpg 800w, hero-wide-1600.jpg 1600w" sizes="100vw">
  <img src="hero-wide-1600.jpg" width="1600" height="600"
       alt="Pickers in a Darjeeling tea garden at sunrise"
       fetchpriority="high" decoding="async">
</picture>` },
      complexity: `<p>No algorithmic cost. Bytes saved: a phone downloads one ~20 KB square instead of a ~600 KB wide JPG. LCP improves because the browser knows the size early and starts the download with high priority.</p>`,
      followUps: ['What changes if the hero is below the fold?', 'How would you serve AVIF too?']
    }
  }]
});

/* ====================== TOPIC 4: FORMS & INPUTS ====================== */
function formFrames(input) {
  var specs = String(input).split(';').map(function (s) { return s.trim(); }).filter(Boolean);
  if (!specs.length) throw new Error('Example:  text q=blue shoes; checkbox gift=yes checked; submit go=Go');
  if (specs.length > 9) throw new Error('Use at most 9 fields');
  var fields = specs.map(function (s) {
    var tk = s.split(/\s+/), type = tk.shift().toLowerCase(), flags = { checked: false, disabled: false };
    while (tk.length && (tk[tk.length - 1] === 'checked' || tk[tk.length - 1] === 'disabled')) flags[tk.pop()] = true;
    var nv = tk.join(' '), eq = nv.indexOf('=');
    var name = eq < 0 ? nv : nv.slice(0, eq), value = eq < 0 ? '' : nv.slice(eq + 1);
    if (['text', 'password', 'email', 'number', 'checkbox', 'radio', 'hidden', 'submit', 'button', 'reset'].indexOf(type) < 0) throw new Error('Type "' + type + '" not supported here. Use: text password email number checkbox radio hidden submit button reset');
    if (name === '-') name = '';
    if ((type === 'checkbox' || type === 'radio') && eq < 0 && name && !value) value = 'on';
    return { type: type, name: name, value: value, checked: flags.checked, disabled: flags.disabled };
  });
  var frames = [], rows = [], pairs = [], hl = {}, clickedDone = false;
  function enc(s) { return encodeURIComponent(s).replace(/%20/g, '+'); }
  function query() { return pairs.join('&'); }
  function tableRows() { return rows.map(function (r) { return r.slice(); }); }
  frames.push({ narr: 'When the user presses submit, the browser walks <b>every control in the form</b> and builds a list of <code>name=value</code> pairs. Only some controls qualify. Let us see which.', parts: [{ type: 'table', label: 'Controls in the form', columns: ['type', 'name', 'value', 'checked', 'disabled'], rows: fields.map(function (f) { return [f.type, f.name || '(none)', f.value, f.checked ? 'yes' : '-', f.disabled ? 'yes' : '-']; }) }, { type: 'vars', label: 'Query string so far', vals: { query: '(empty)' } }] });
  fields.forEach(function (f, i) {
    var sent = true, why = 'has a name and is active', cls = 'ok';
    if (f.disabled) { sent = false; why = 'disabled controls are never sent'; }
    else if (!f.name) { sent = false; why = 'no name attribute: nothing to label the value with'; }
    else if (f.type === 'checkbox' || f.type === 'radio') {
      if (!f.checked) { sent = false; why = 'unchecked ' + f.type + ' is not sent at all (not even "off")'; } else why = 'checked ' + f.type + ' sends its value attribute (default "on")';
    } else if (f.type === 'button' || f.type === 'reset') { sent = false; why = f.type + ' buttons never send data'; }
    else if (f.type === 'submit') {
      if (clickedDone) { sent = false; why = 'only the submit button that was clicked is sent'; } else { why = 'this is the button that was clicked, so its name=value is sent'; }
      clickedDone = true;
    }
    if (!sent) cls = 'bad';
    if (sent) pairs.push(enc(f.name) + '=' + enc(f.value));
    rows.push([f.type + (f.name ? ' ' + f.name : ''), sent ? 'SENT' : 'skipped', why]);
    hl[rows.length - 1] = cls;
    frames.push({ narr: 'Control ' + (i + 1) + ': <b>' + esc(f.type) + (f.name ? ' "' + esc(f.name) + '"' : ' (no name)') + '</b> → ' + (sent ? '<span class="c-g">included</span>' : '<span class="c-r">skipped</span>') + ': ' + why + '.' + (sent && /[ &=+%é]/.test(f.value) ? ' Special characters are percent-encoded; a space becomes <b>+</b>.' : ''), parts: [{ type: 'table', label: 'Decision per control', columns: ['control', 'result', 'reason'], rows: tableRows(), hl: JSON.parse(JSON.stringify(hl)) }, { type: 'vars', label: 'Query string so far', vals: { query: query() || '(empty)' }, hl: { query: sent ? 'ok' : '' } }] });
  });
  frames.push({ narr: 'Final: <b>GET</b> puts this in the URL (<code>/search?' + esc(query()) + '</code>) — fine for searches, bookmarkable, but visible and length-limited. <b>POST</b> sends the same text in the request body — use it for logins, orders and anything that changes data. The server must still <b>validate again</b>: anyone can send any pairs they like.', parts: [{ type: 'vars', label: 'What goes over the wire', vals: { GET: '/search?' + query(), 'POST body': query() }, hl: { GET: 'sel', 'POST body': 'sel' } }] });
  return frames;
}

topics.push({
  title: 'Forms & Inputs',
  analogy: `<p>A web form is a <b>paper form at a bank counter</b>. Each box on the paper has a <b>printed label</b> ("Full name"), a place to write, and a <b>field code</b> the clerk uses when typing it into the computer. The <code>&lt;label&gt;</code> is the printed text, the <code>&lt;input&gt;</code> is the empty box, and the <code>name</code> attribute is the field code. If a box has no code, the clerk has nowhere to type it — so it is simply dropped. The <b>Submit</b> button is you handing the paper across the counter.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> A <code>&lt;form&gt;</code> groups controls and says <i>where</i> (<code>action</code>) and <i>how</i> (<code>method</code>) to send them. Pressing a submit button (or Enter in a text field) collects <code>name=value</code> pairs and makes a request.</p>
  <pre>&lt;form action="/signup" method="post"&gt;
  &lt;label for="email"&gt;Email&lt;/label&gt;
  &lt;input id="email" name="email" type="email" required&gt;
  &lt;button type="submit"&gt;Join&lt;/button&gt;
&lt;/form&gt;</pre>
  <p><b>Labels are not optional.</b> <code>&lt;label for="email"&gt;</code> links text to the control with <code>id="email"</code>. Clicking the text focuses the input, and screen readers read it aloud. <b>Placeholder is not a label</b> — it disappears while typing and has low contrast. You can also wrap: <code>&lt;label&gt;Email &lt;input name="email"&gt;&lt;/label&gt;</code>.</p>
  <p><b>Pick the right <code>type</code></b> – it gives you the right phone keyboard, free validation and sometimes a native picker:</p>
  ${H.table(['type', 'What you get', 'Notes'], [
    ['<code>text</code>', 'Single line', 'Default'],
    ['<code>email</code>, <code>url</code>, <code>tel</code>', '@-keyboard / url keyboard / number pad', 'email and url are validated automatically; tel is not'],
    ['<code>password</code>', 'Dots', 'Add <code>autocomplete="current-password"</code> or <code>new-password</code>'],
    ['<code>number</code>', 'Spinner, min/max/step', 'Not for phone numbers or ZIP codes (leading zeros are lost)'],
    ['<code>date</code>, <code>time</code>, <code>datetime-local</code>', 'Native date picker', 'Value is always ISO format <code>2026-10-15</code>'],
    ['<code>checkbox</code>', 'Yes/no, many can be on', 'Sent only when checked'],
    ['<code>radio</code>', 'Pick exactly one', 'Same <code>name</code> = one group'],
    ['<code>range</code>, <code>color</code>, <code>file</code>, <code>hidden</code>', 'Slider, colour picker, file chooser, invisible value', 'Forms with files need <code>enctype="multipart/form-data"</code>'],
    ['<code>search</code>', 'Search box with clear button', 'Use with <code>role="search"</code> form or <code>&lt;search&gt;</code>']
  ])}
  <p><b>Other controls.</b> <code>&lt;textarea&gt;</code> (multi-line), <code>&lt;select&gt;&lt;option&gt;</code> (dropdown; add <code>multiple</code> for many), <code>&lt;datalist&gt;</code> (suggestions while typing), <code>&lt;button&gt;</code> (always set <code>type</code>!), <code>&lt;fieldset&gt;&lt;legend&gt;</code> (group related controls like a radio set — screen readers read the legend before each option), <code>&lt;output&gt;</code>, <code>&lt;progress&gt;</code>, <code>&lt;meter&gt;</code>.</p>
  <p><b>Important attributes:</b> <code>name</code> (the key sent), <code>value</code>, <code>required</code>, <code>disabled</code> (not sent, not focusable), <code>readonly</code> (sent, not editable), <code>autocomplete</code> (<code>name, email, tel, one-time-code, postal-code</code> — big UX win), <code>autofocus</code>, <code>inputmode</code>, <code>maxlength</code>.</p>
  <p><b>Button trap.</b> Inside a form, <code>&lt;button&gt;</code> with no type is a <b>submit</b> button. A "Show password" toggle without <code>type="button"</code> will submit your form!</p>`,
  clues: [
    '"Difference between GET and POST in a form?" → URL vs body, idempotent vs changes data',
    '"Why is my checkbox/radio value missing from the request?" → unchecked is not sent; or no name',
    '"How do you group radio buttons?" → same name; wrap in fieldset + legend',
    '"Label vs placeholder" → label is required; placeholder is only a hint',
    '"My toggle button submits the form" → missing type="button"',
    '"Which input type for a phone number / ZIP / OTP?" → tel / text with inputmode=numeric / autocomplete=one-time-code',
    '"Upload a file in a form" → type=file, method=post, enctype=multipart/form-data'
  ],
  code: [
    { lang: 'html', title: 'A realistic, accessible sign-up form', code: `<form action="/signup" method="post" novalidate>
  <fieldset>
    <legend>Create your account</legend>

    <p>
      <label for="name">Full name</label>
      <input id="name" name="name" type="text" autocomplete="name" required>
    </p>
    <p>
      <label for="email">Email</label>
      <input id="email" name="email" type="email" autocomplete="email" required>
    </p>
    <p>
      <label for="pw">Password <small>(min 8 characters)</small></label>
      <input id="pw" name="password" type="password" minlength="8" autocomplete="new-password" required>
    </p>
    <p>
      <label for="plan">Plan</label>
      <select id="plan" name="plan">
        <option value="free" selected>Free</option>
        <option value="pro">Pro</option>
      </select>
    </p>
    <fieldset>
      <legend>How did you hear about us?</legend>
      <label><input type="radio" name="source" value="friend" checked> Friend</label>
      <label><input type="radio" name="source" value="ad"> Advert</label>
    </fieldset>
    <p><label><input type="checkbox" name="terms" value="yes" required> I accept the terms</label></p>
    <button type="submit">Sign up</button>
    <button type="reset">Clear</button>
  </fieldset>
</form>` },
    { lang: 'js', run: true, title: 'Building the same name=value list in code (URLSearchParams)', code: `// A form submit is basically this: a list of [name, value] pairs, URL-encoded.
const controls = [
  { name: 'q', value: 'blue shoes' },
  { name: 'size', value: 'M' },
  { name: 'gift', value: 'yes' }
];
const params = new URLSearchParams();
for (const c of controls) params.append(c.name, c.value);   // append keeps duplicates (checkbox groups)
console.log('GET  /search?' + params.toString());            // space -> +
console.log('POST body  :', params.toString());
// Many checkboxes with the same name produce repeated keys:
const tags = new URLSearchParams([['tag', 'tea'], ['tag', 'spice']]);
console.log(tags.toString(), '| getAll ->', tags.getAll('tag'));` }
  ],
  codeTitle: ['Sign-up form', 'What a submit really builds'],
  viz: [{
    title: 'Which form controls are submitted (and what the query string looks like)',
    input: 'text q=blue shoes; checkbox gift=yes checked; checkbox news=yes; radio size=M checked; text note=hello disabled; text -=mystery; submit go=Search',
    inputLabel: 'type name=value [checked] [disabled]; …  (use - as name for "no name")',
    gen: function (input) { return formFrames(input); }
  }],
  examples: [
    {
      title: 'Radio group: why name matters',
      html: `<p>Radios with the <b>same name</b> are one group — checking one unchecks the others and only one pair is sent: <code>size=M</code>. If every radio had a different name, you could tick them all and the browser would send many pairs. Wrap the group in <code>fieldset</code>/<code>legend</code> so assistive tech announces "Size, group".</p>`,
      code: { lang: 'html', code: `<fieldset>
  <legend>Size</legend>
  <label><input type="radio" name="size" value="S"> Small</label>
  <label><input type="radio" name="size" value="M" checked> Medium</label>
  <label><input type="radio" name="size" value="L"> Large</label>
</fieldset>` }
    },
    {
      title: 'GET vs POST',
      html: `${H.table(['', 'GET', 'POST'], [
        ['Data goes in', 'The URL (query string)', 'The request body'],
        ['Good for', 'Search, filters, anything bookmarkable', 'Login, payment, create/update/delete'],
        ['Visible in history/logs', '<span class="c-r">Yes</span>', 'No (but still not secret without HTTPS)'],
        ['Back button / refresh', 'Safe to repeat', 'Browser asks "resubmit?"'],
        ['Size limit', 'Few KB', 'Large; needed for file uploads']
      ])}<p>Never put passwords or tokens in a GET query string.</p>`
    },
    {
      title: 'Small UX wins: autocomplete, inputmode, datalist',
      html: `<p>These attributes cost nothing and make forms much faster to fill on phones: <code>autocomplete="one-time-code"</code> lets iOS/Android paste an SMS code; <code>inputmode="numeric"</code> shows the number pad without the problems of <code>type="number"</code>; <code>datalist</code> adds suggestions but still allows any text.</p>`,
      code: { lang: 'html', code: `<label for="otp">6-digit code</label>
<input id="otp" name="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}">

<label for="city">City</label>
<input id="city" name="city" list="cities" autocomplete="address-level2">
<datalist id="cities"><option value="Pune"><option value="Chennai"><option value="Kochi"></datalist>` }
    },
    {
      title: 'JavaScript peek: reading a form',
      html: `<p>In the browser you rarely parse by hand. <code>new FormData(formElement)</code> applies exactly the rules from the visualizer (name required, disabled skipped, unchecked skipped). Intercept the submit event, call <code>preventDefault()</code>, and send with <code>fetch</code>.</p>`,
      code: { lang: 'js', code: `// Browser-only code (needs a real form element)
form.addEventListener('submit', async (event) => {
  event.preventDefault();                       // stop the full page reload
  const data = new FormData(form);              // same rules as the browser's own submit
  const body = new URLSearchParams(data);       // or send multipart with the FormData itself
  const res = await fetch(form.action, { method: form.method, body });
  console.log(res.status);
});` }
    }
  ],
  deepDive: `<p><b>🟣 The "form data set" algorithm.</b> The HTML spec defines exactly how a submit builds the list (constructing the entry list). In order, for each <b>submittable element</b> in tree order: skip if it has no <code>name</code> or an empty name, if it is <code>disabled</code> (or inside a disabled fieldset), if it is an unchecked checkbox/radio, an unclicked submit button, or a <code>button/reset</code>. <code>&lt;select multiple&gt;</code> adds one pair per selected option. File inputs add file entries. Elements outside the form can join with the <code>form="formId"</code> attribute.</p>
  <p><b>Encodings (enctype).</b> <code>application/x-www-form-urlencoded</code> (default; spaces → <code>+</code>, other bytes <code>%XX</code>), <code>multipart/form-data</code> (needed for files; each field is a "part" with a boundary), <code>text/plain</code> (debug only). <code>method="dialog"</code> closes a <code>&lt;dialog&gt;</code> with no request.</p>
  <p><b>Submission flow.</b> Validate (constraint validation, see the Validation topic) → fire the <code>submit</code> event (cancelable) → build entry list → navigate. Calling <code>form.submit()</code> in JS skips validation and the submit event; <code>form.requestSubmit()</code> does it properly.</p>
  <p><b>Password managers &amp; autofill</b> depend on correct <code>type</code>, <code>name</code> and <code>autocomplete</code>. Wrong tokens mean broken autofill and, for payments, failed conversions. Prefer <code>autocomplete="new-password"</code> on sign-up and <code>current-password</code> on login so managers suggest or fill correctly. Do not disable paste on password fields — it blocks managers.</p>
  <p><b>Security reminders.</b> The browser's restrictions (required, maxlength, hidden fields, disabled) are just suggestions: anyone can edit them in DevTools or use curl. So <b>never trust the client</b> — recheck every value on the server, protect state-changing POSTs against CSRF (SameSite cookies + tokens), and never trust a <code>hidden</code> field for prices or user ids. Cover that in the Security module.</p>
  <p><b>Accessibility details.</b> Error messages should be linked with <code>aria-describedby</code>, required fields marked in text ("required") as well as with the attribute, and group labels via <code>fieldset/legend</code>. A visible focus ring must remain. Do not use <code>placeholder</code> for instructions the user needs while typing.</p>`,
  aiEra: `<p><b>🤖 What AI changes.</b> Form builders and AI assistants generate sign-up and checkout markup instantly, and browsers/agents increasingly <b>fill forms for people</b> (autofill, password managers, AI browser agents). Those agents decide what to type from the <code>label</code>, <code>name</code>, <code>type</code> and <code>autocomplete</code> — a form with good semantics is easy for them; a form built from unlabeled divs is not.</p>
  <p><b>Use AI as a partner:</b> <code>Generate a checkout address form with correct autocomplete tokens for India</code>; <code>Audit this form for accessibility issues and list them by severity</code>; <code>Write 8 test inputs, including edge cases, for this form</code>.</p>
  <p><b>Where AI goes wrong:</b> placeholders as the only label; <code>type="number"</code> for phone numbers and PIN codes; <code>&lt;button&gt;</code> without type; missing <code>name</code> (so the form sends nothing); copied <code>autocomplete="off"</code> everywhere; client-only validation with no mention of the server. It may also invent attributes that look real.</p>
  <p><b>What you must still own:</b> test with keyboard only and with autofill, look at the Network tab to see what is really sent, and own the server-side checks and privacy decisions (what personal data you collect and why).</p>`,
  problems: [{
    title: 'Accessible Contact Form with Grouped Controls',
    level: 'Medium', tags: ['forms', 'labels', 'fieldset', 'accessibility'], companies: ['Zoho', 'Freshworks', 'Paytm'],
    statement: `<p>Build a "Contact us" form that posts to <code>/contact</code>. Fields: name (required), email (required), phone (optional), a topic dropdown (Sales, Support, Other), a preferred contact method as radio buttons (Email or Phone, Email selected by default), a message textarea (required) and a checkbox "Send me updates". Add a submit button. Every control needs a real label, autofill-friendly <code>autocomplete</code>, the correct input types, and the radio group must be announced as a group.</p>`,
    constraints: `No ARIA needed. No placeholder-as-label. Buttons must have explicit types. Use method POST.`,
    example: `<p>Selecting "Phone" and leaving "updates" unchecked submits: <code>name=Asha&amp;email=asha%40x.com&amp;phone=&amp;topic=support&amp;method=phone&amp;message=Hi</code> — <code>${H.c('r', 'updates')}</code> is missing because unchecked boxes are not sent. <i>Why</i>: only checked checkboxes and the selected radio contribute pairs.</p>`,
    brute: { why: `<p>The quick version uses placeholders as labels, <code>type="text"</code> for everything, and unnamed radios. Screen readers announce "edit text, blank". Radios without a shared name can all be ticked, and nothing tells the user which question they belong to.</p>`, code: { lang: 'html', code: `<form>
  <input placeholder="Name">
  <input placeholder="Email">
  <input type="radio"> Email <input type="radio"> Phone
  <textarea placeholder="Message"></textarea>
  <button>Send</button>
</form>` } },
    mcq: { q: 'Why wrap the contact-method radios in fieldset + legend?', options: ['So assistive tech announces the question with each option', 'To make them side by side', 'To make them required', 'It is only for styling'], answer: 0, explain: 'The legend is read as the group name before each radio, giving each option its context.' },
    hints: [
      `<p>Hint 1 (aha): every control needs a <code>label</code> connected by <code>for</code>/<code>id</code> (or wrapping), and a <code>name</code> so it gets submitted.</p>`,
      `<p>Hint 2: types — <code>email</code>, <code>tel</code>; autocomplete tokens — <code>name</code>, <code>email</code>, <code>tel</code>. Radios share <code>name="method"</code> with different values.</p>`,
      `<p>Hint 3: recipe = form(method post, action /contact) → name, email, tel, select topic, fieldset(legend + 2 radios, one checked), textarea required, checkbox, <code>button type="submit"</code>.</p>`
    ],
    solution: {
      approach: `<p>Use one label per control, matching types and autocomplete values, a shared <code>name</code> for the radio pair inside a <code>fieldset</code> with a <code>legend</code>, <code>required</code> on the must-have fields, and a submit button with an explicit type.</p>`,
      code: { lang: 'html', code: `<form action="/contact" method="post">
  <p><label for="c-name">Name</label>
     <input id="c-name" name="name" type="text" autocomplete="name" required></p>
  <p><label for="c-email">Email</label>
     <input id="c-email" name="email" type="email" autocomplete="email" required></p>
  <p><label for="c-phone">Phone <small>(optional)</small></label>
     <input id="c-phone" name="phone" type="tel" autocomplete="tel"></p>
  <p><label for="c-topic">Topic</label>
     <select id="c-topic" name="topic">
       <option value="sales">Sales</option>
       <option value="support">Support</option>
       <option value="other">Other</option>
     </select></p>
  <fieldset>
    <legend>Preferred contact method</legend>
    <label><input type="radio" name="method" value="email" checked> Email</label>
    <label><input type="radio" name="method" value="phone"> Phone</label>
  </fieldset>
  <p><label for="c-msg">Message</label>
     <textarea id="c-msg" name="message" rows="5" required></textarea></p>
  <p><label><input type="checkbox" name="updates" value="yes"> Send me updates</label></p>
  <button type="submit">Send message</button>
</form>` },
      complexity: `<p>Browser work is O(number of controls) when building the entry list. The real cost to manage is user effort: correct types and autocomplete cut typing time on phones.</p>`,
      followUps: ['How would you show an error message for the email field accessibly?', 'What changes if you add a file attachment?']
    }
  }]
});

/* ====================== TOPIC 5: TABLES ====================== */
function tableFrames(input) {
  var rowsSrc = String(input).split('|').map(function (s) { return s.trim(); }).filter(Boolean);
  if (!rowsSrc.length) throw new Error('Example:  Class/r2 Mon/c2 Tue | AM PM AM | Math Art Art Gym');
  if (rowsSrc.length > 7) throw new Error('Use at most 7 rows');
  var occ = [], places = [], maxC = 0, maxR = rowsSrc.length, r, c, dr, dc;
  rowsSrc.forEach(function (line, r) {
    c = 0;
    line.split(/\s+/).forEach(function (tok) {
      var m = tok.match(/^(.*?)(?:\/(?:c(\d))?(?:r(\d))?)?$/), label = m[1] || tok, cs = +(m[2] || 1), rs = +(m[3] || 1);
      if (!m[1]) label = tok.split('/')[0];
      if (cs < 1 || rs < 1 || cs > 6 || rs > 6) throw new Error('colspan/rowspan must be 1-6 (write Name/c2, Name/r2 or Name/c2r2)');
      while (occ[r] && occ[r][c]) c++;
      for (dr = 0; dr < rs; dr++) for (dc = 0; dc < cs; dc++) {
        occ[r + dr] = occ[r + dr] || [];
        if (occ[r + dr][c + dc]) throw new Error('Cells overlap at row ' + (r + dr + 1) + ', column ' + (c + dc + 1) + ' — overlapping spans are a real HTML table error');
        occ[r + dr][c + dc] = { label: label, k: places.length };
      }
      places.push({ label: label, r: r, c: c, cs: cs, rs: rs });
      if (c + cs > maxC) maxC = c + cs;
      if (r + rs > maxR) maxR = r + rs;
      c += cs;
    });
  });
  if (maxC > 7 || maxR > 8) throw new Error('Table too big for the picture: max 7 columns and 8 rows');
  var colHead = [], rowHead = [];
  for (c = 0; c < maxC; c++) colHead.push('col ' + (c + 1));
  for (r = 0; r < maxR; r++) rowHead.push('row ' + (r + 1));
  function gridAt(upTo, cur) {
    var rows = [], hl = {};
    for (r = 0; r < maxR; r++) { rows.push([]); for (c = 0; c < maxC; c++) rows[r].push(''); }
    for (var k = 0; k <= upTo; k++) {
      var p = places[k];
      for (dr = 0; dr < p.rs; dr++) for (dc = 0; dc < p.cs; dc++) {
        rows[p.r + dr][p.c + dc] = p.label;
        hl[(p.r + dr) + ',' + (p.c + dc)] = k === cur ? (dr === 0 && dc === 0 ? 'ok' : 'win') : 'done';
      }
    }
    return { type: 'grid', label: 'The table grid (each box = one grid slot)', rows: rows, colHead: colHead, rowHead: rowHead, hl: hl };
  }
  var frames = [];
  frames.push({ narr: 'A table is a <b>grid</b>. You write it row by row with <code>&lt;tr&gt;</code>; each <code>&lt;td&gt;</code>/<code>&lt;th&gt;</code> goes into the <b>next free slot</b> of its row. <code>colspan</code> makes a cell wider, <code>rowspan</code> makes it taller — and it also <i>takes slots in the rows below</i>.', parts: [{ type: 'grid', label: 'Empty grid (' + maxR + ' rows × ' + maxC + ' columns)', rows: (function () { var a = []; for (var i = 0; i < maxR; i++) { a.push([]); for (var j = 0; j < maxC; j++) a[i].push(''); } return a; })(), colHead: colHead, rowHead: rowHead }] });
  places.forEach(function (p, k) {
    var skipped = 0;
    for (var cc = 0; cc < p.c; cc++) { var o = occ[p.r][cc]; if (o && o.k < k && places[o.k].r < p.r) skipped++; }
    frames.push({ narr: 'Row ' + (p.r + 1) + ': place <b>' + esc(p.label) + '</b> at column ' + (p.c + 1) + (skipped ? ' (<span class="c-y">' + skipped + ' slot(s) to the left were already taken by a rowspan from above</span>, so we skip them)' : '') + '. ' + (p.cs > 1 ? 'colspan=' + p.cs + ' covers ' + p.cs + ' columns. ' : '') + (p.rs > 1 ? 'rowspan=' + p.rs + ' covers ' + p.rs + ' rows. ' : '') + (p.cs === 1 && p.rs === 1 ? 'It fills exactly one slot.' : ''), parts: [gridAt(k, k), { type: 'vars', label: 'Placement', vals: { row: p.r + 1, 'first free column': p.c + 1, colspan: p.cs, rowspan: p.rs }, hl: { colspan: p.cs > 1 ? 'ok' : '', rowspan: p.rs > 1 ? 'ok' : '' } }] });
  });
  var holes = [];
  var finalGrid = gridAt(places.length - 1, -1);
  for (r = 0; r < maxR; r++) for (c = 0; c < maxC; c++) if (!occ[r] || !occ[r][c]) { holes.push('row ' + (r + 1) + ', col ' + (c + 1)); finalGrid.hl[r + ',' + c] = 'bad'; }
  frames.push({ narr: holes.length ? '<span class="c-r">Ragged table!</span> These slots are empty: ' + holes.join('; ') + '. Browsers draw gaps and screen readers get confused. Every row must add up to the same width (counting cells that hang down from above).' : '<span class="c-g">The grid is completely filled</span> — every row adds up to ' + maxC + ' columns. That is a valid, regular table.', parts: [finalGrid] });
  // generated HTML
  var out = '<table>\n  <caption>Weekly plan</caption>\n', cur = -1;
  for (r = 0; r < rowsSrc.length; r++) {
    out += '  <tr>\n';
    places.filter(function (p) { return p.r === r; }).forEach(function (p) {
      var tag = r === 0 ? 'th' : 'td', at = (r === 0 ? ' scope="' + (p.cs > 1 ? 'colgroup' : 'col') + '"' : '') + (p.cs > 1 ? ' colspan="' + p.cs + '"' : '') + (p.rs > 1 ? ' rowspan="' + p.rs + '"' : '');
      out += '    <' + tag + at + '>' + p.label + '</' + tag + '>\n';
    });
    out += '  </tr>\n';
  }
  out += '</table>';
  frames.push({ narr: 'The HTML for this grid. Notice rows with a hanging rowspan simply write <b>fewer cells</b>: the missing ones are already covered from above. Row 1 uses <code>th</code> with <code>scope</code> so each column has a header.', parts: [{ type: 'code', label: 'Generated table markup', lang: 'html', code: out }] });
  return frames;
}

topics.push({
  title: 'Tables: Tabular Data Done Right',
  analogy: `<p>A table is a <b>railway timetable on a station wall</b>. The top row says which train, the left column says which station, and every cell is where a row and a column meet. If you merge two boxes to say "Platform 1 and 2" you are using <b>colspan</b>; a label that stretches down several stations is a <b>rowspan</b>. A table is for <i>data you would put in a spreadsheet</i>. Using a table to position your page layout is like using a timetable board to organise a living room.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> HTML tables describe <b>rows of data with headers</b>. Structure it like a book: a caption (title), a header section, a body, an optional footer.</p>
  <pre>&lt;table&gt;
  &lt;caption&gt;Monthly sales (₹ lakh)&lt;/caption&gt;
  &lt;thead&gt;&lt;tr&gt;&lt;th scope="col"&gt;Month&lt;/th&gt;&lt;th scope="col"&gt;Sales&lt;/th&gt;&lt;/tr&gt;&lt;/thead&gt;
  &lt;tbody&gt;
    &lt;tr&gt;&lt;th scope="row"&gt;Jan&lt;/th&gt;&lt;td&gt;12&lt;/td&gt;&lt;/tr&gt;
    &lt;tr&gt;&lt;th scope="row"&gt;Feb&lt;/th&gt;&lt;td&gt;15&lt;/td&gt;&lt;/tr&gt;
  &lt;/tbody&gt;
  &lt;tfoot&gt;&lt;tr&gt;&lt;th scope="row"&gt;Total&lt;/th&gt;&lt;td&gt;27&lt;/td&gt;&lt;/tr&gt;&lt;/tfoot&gt;
&lt;/table&gt;</pre>
  ${H.table(['Element', 'Job'], [
    ['<code>table</code>', 'The whole table'],
    ['<code>caption</code>', 'Title of the table; announced by screen readers (first child of table)'],
    ['<code>thead / tbody / tfoot</code>', 'Header rows / data rows / summary rows. Enables repeating headers when printing, and scrolling the body alone.'],
    ['<code>tr</code>', 'One row'],
    ['<code>th</code>', 'Header cell. <code>scope="col"</code> or <code>"row"</code> says what it is the header of'],
    ['<code>td</code>', 'Data cell'],
    ['<code>colspan="n"</code> / <code>rowspan="n"</code>', 'Make a cell cover n columns / n rows'],
    ['<code>colgroup / col</code>', 'Style or group whole columns']
  ])}
  <p><b>Why <code>th</code> matters.</b> A screen reader says "Sales, Feb, 15" as you move across the cells — it finds the headers for you. With only <code>td</code> it just says "15". Always use <code>th</code> for headers and add <code>scope</code>.</p>
  <p><b>Spans.</b> A cell with <code>rowspan="2"</code> occupies a slot in the next row too, so the next row has one cell <i>fewer</i> to write. Try it in the visualizer: that is the part everyone gets wrong.</p>
  <p><b>Don't:</b> use tables for page layout (use CSS Flexbox/Grid); use <code>&lt;br&gt;</code> or empty cells to fake spacing; put a table inside a <code>&lt;p&gt;</code>; use <code>border="1"</code> and <code>cellpadding</code> (style with CSS: <code>border-collapse: collapse</code>).</p>
  <p><b>Phones.</b> Wide tables overflow. Wrap in a scroll container (<code>&lt;div style="overflow-x:auto"&gt;</code>) or reshape the data on small screens with CSS.</p>`,
  clues: [
    '"When should you use a table and when not?" → tabular data yes, page layout no',
    '"What is the difference between th and td? What does scope do?"',
    '"colspan vs rowspan — why does my row have extra cells / misaligned?" → spans take slots in other rows',
    '"Why do we have thead/tbody/tfoot?" → structure, print headers, independent scroll, a11y',
    '"How do you make a table accessible?" → caption, th with scope, headers/id for complex ones',
    '"How would you make a table responsive?" → horizontal scroll wrapper, CSS stacked layout, or fewer columns',
    '"Build a calendar / timetable / pricing grid in HTML"'
  ],
  code: [
    { lang: 'html', title: 'Timetable with row and column spans', code: `<table>
  <caption>Class timetable</caption>
  <thead>
    <tr>
      <th scope="col" rowspan="2">Class</th>
      <th scope="colgroup" colspan="2">Monday</th>
      <th scope="col">Tuesday</th>
    </tr>
    <tr>
      <th scope="col">AM</th>
      <th scope="col">PM</th>
      <th scope="col">AM</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Grade 5</th>
      <td>Math</td>
      <td colspan="2">Art workshop (2 slots)</td>
    </tr>
  </tbody>
</table>` },
    { lang: 'js', run: true, title: 'Generating a safe table from data', code: `// Turn an array of objects into table HTML. Escape text so data can never inject tags.
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function toTable(rows, caption) {
  const cols = Object.keys(rows[0]);
  const head = '<tr>' + cols.map(c => '<th scope="col">' + escapeHtml(c) + '</th>').join('') + '</tr>';
  const body = rows.map(r => '<tr>' + cols.map((c, i) =>
    (i === 0 ? '<th scope="row">' : '<td>') + escapeHtml(r[c]) + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('\\n    ');
  return '<table>\\n  <caption>' + escapeHtml(caption) + '</caption>\\n  <thead>' + head + '</thead>\\n  <tbody>\\n    ' + body + '\\n  </tbody>\\n</table>';
}
console.log(toTable([{ month: 'Jan', sales: 12 }, { month: 'Feb <b>', sales: 15 }], 'Sales & growth'));` }
  ],
  codeTitle: ['Spans in a header', 'Data → table with escaping'],
  viz: [{
    title: 'Placing cells into the grid (colspan / rowspan)',
    input: 'Class/r2 Mon/c2 Tue | AM PM AM | Math Art Art Gym',
    inputLabel: 'Rows split by |, cells by space. Add /c2 (colspan), /r2 (rowspan) or /c2r2',
    gen: function (input) { return tableFrames(input); }
  }],
  examples: [
    {
      title: 'th scope vs the headers attribute',
      html: `<p>Simple tables only need <code>scope</code>. For complex tables (multi-level headers where scope is not enough) give each header an <code>id</code> and list the ids in each data cell: <code>headers="mon am"</code>. It is rarely needed — if you need it, first ask whether the table can be split into two simpler ones.</p>`,
      code: { lang: 'html', code: `<table>
  <tr><td></td><th id="mon" colspan="2">Mon</th></tr>
  <tr><td></td><th id="am" headers="mon">AM</th><th id="pm" headers="mon">PM</th></tr>
  <tr><th id="math">Math</th><td headers="math mon am">Yes</td><td headers="math mon pm">No</td></tr>
</table>` }
    },
    {
      title: 'The parser adds tbody (and why CSS selectors surprise people)',
      html: `<p>If you write <code>&lt;table&gt;&lt;tr&gt;...&lt;/tr&gt;&lt;/table&gt;</code> the HTML parser <b>inserts a &lt;tbody&gt;</b> for you. So the CSS selector <code>table &gt; tr</code> never matches in the browser, even though your source looks like it should. Write <code>tbody</code> yourself or use <code>table tr</code>.</p>`
    },
    {
      title: 'Responsive wrapper for a wide table',
      html: `<p>A table keeps its own width; on a phone it would push the whole page sideways. Wrap it so only the table scrolls, and make that wrapper keyboard-focusable and named so people can scroll it with arrow keys.</p>`,
      code: { lang: 'html', code: `<div class="table-scroll" role="region" aria-labelledby="cap" tabindex="0">
  <table>
    <caption id="cap">Quarterly results</caption>
    <!-- rows go here -->
  </table>
</div>
<style>
  .table-scroll { overflow-x: auto; }
  table { border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: .5rem .75rem; }
</style>` }
    },
    {
      title: 'Table or not? Quick test',
      html: `${H.table(['Content', 'Use a table?', 'Better tool'], [
        ['Flight arrival times', '<span class="c-g">Yes</span>', '-'],
        ['Product cards in a grid', '<span class="c-r">No</span>', 'CSS Grid + <code>ul/li</code>'],
        ['Label next to input, repeated', '<span class="c-r">No</span>', 'Forms + CSS layout'],
        ['Pricing plan comparison', '<span class="c-g">Yes</span> (features × plans)', 'Table with <code>th scope</code>'],
        ['Whole page layout in 2 columns', '<span class="c-r">Never</span>', 'Flexbox/Grid']
      ])}`
    }
  ],
  deepDive: `<p><b>🟣 Table layout model.</b> The HTML spec describes a <b>table formation algorithm</b>: it walks the rows, keeps an array of "slots", and for every cell finds the next slot not already covered by a rowspan from an earlier row (the "downward-growing cells" list). Overlaps are a table-model error (the visualizer throws on them), and rows that are too short just leave empty slots. The visualizer follows that algorithm. A cell's <code>rowspan="0"</code> historically meant "to the end of the row group", but it is not supported consistently — avoid it.</p>
  <p><b>Accessibility tree.</b> Browsers expose a table as <code>table → rowgroup → row → columnheader / rowheader / cell</code>. Screen readers offer table navigation (Ctrl+Alt+arrows in JAWS/NVDA) and announce header cells automatically. <b>Important:</b> if you set <code>display: block</code>/<code>flex</code> on table parts for a responsive layout, some browsers drop the table semantics; add roles back or avoid this trick. The <code>caption</code> is the table's accessible name; <code>aria-describedby</code> can add a summary.</p>
  <p><b>Rendering performance.</b> Auto table layout needs to measure the content of all cells before sizing columns, so huge tables reflow slowly. <code>table-layout: fixed</code> uses the first row's widths and is much faster, enabling streaming render. For thousands of rows, use <b>virtualization</b> (render only visible rows; you will meet it in the performance module) — or a CSS Grid with <code>role="grid"</code>, which must then handle keyboard interaction itself.</p>
  <p><b>Sticky headers &amp; sorting.</b> <code>position: sticky; top: 0</code> on <code>th</code> in <code>thead</code> keeps headers visible. Sorting is JavaScript: sort the data, re-render the <code>tbody</code>, and update <code>aria-sort="ascending"</code> on the sorted header — otherwise screen-reader users get no feedback.</p>
  <p><b>Email &amp; legacy.</b> HTML email clients still need layout tables because of poor CSS support. That is the one place where "tables for layout" is acceptable — and you should mark them <code>role="presentation"</code> so they are not read as data.</p>
  <p><b>Edge cases for interviews:</b> "Can a <code>td</code> hold a <code>table</code>?" yes (nested). "Is <code>border</code> attribute valid?" obsolete. "Where does <code>caption</code> go?" first child of table. "Why does text outside td jump above my table?" foster parenting: stray text is moved out before the table.</p>`,
  aiEra: `<p><b>🤖 What AI changes.</b> LLMs are good at turning messy data (CSV, a screenshot, a PDF) into a clean HTML table, and they can read tables well — but only if the structure is clear. Pages that use proper <code>th</code>/<code>caption</code>/<code>scope</code> are far easier for answer engines and AI agents to extract facts from; layout-by-table or merged-cell mazes cause wrong answers. Large "dashboard" tables are also now commonly generated or summarised by AI.</p>
  <p><b>Use AI as a partner:</b> <code>Convert this CSV into an accessible HTML table with caption, thead/tbody and th scope</code>; <code>Review this table's rowspan/colspan; draw the slot grid and point out gaps</code>; <code>Write a quick script to sort this table by a column and update aria-sort</code>.</p>
  <p><b>Where AI goes wrong:</b> counting cells with rowspan (it often writes one cell too many, causing a ragged table); using only <code>td</code> with bold CSS for headers; forgetting <code>scope</code>; building layouts out of tables; unescaped data (<code>&lt;</code>, <code>&amp;</code>) in generated rows; returning markdown tables when you asked for HTML.</p>
  <p><b>What you must still own:</b> drawing the slot grid in your head (or with the visualizer), verifying every row adds to the same width, and testing with a screen reader or the DevTools Accessibility tab to hear the header announcements.</p>`,
  problems: [{
    title: 'Pricing Comparison Table with Grouped Headers',
    level: 'Medium', tags: ['tables', 'colspan', 'rowspan', 'accessibility'], companies: ['Zoho', 'Atlassian', 'Razorpay'],
    statement: `<p>Write the HTML for this pricing table. Columns: Feature, then Plans grouped under one heading "Plans" with sub-columns Free, Pro, Team. Rows: "Projects" (3 / 20 / Unlimited), "Support" (Community / Email / Priority), and a footer row "Price per month" (₹0 / ₹499 / ₹1,299). The top-left "Feature" cell spans both header rows. Include a caption and make every header accessible with <code>scope</code>.</p>`,
    constraints: `Use caption, thead, tbody, tfoot, th scope, colspan and rowspan. No layout attributes (border, cellpadding). Every row must add up to 4 columns.`,
    example: `<p>Header row 1: <code>Feature/r2 Plans/c3</code> (4 slots). Header row 2: <code>Free Pro Team</code> — only 3 cells, because column 1 is already taken by "Feature". ${H.c('g', 'Row width = 1 + 3 = 4 ✔')}. <i>Why</i>: a rowspan from above takes a slot in the row below.</p>`,
    brute: { why: `<p>The beginner approach writes four <code>td</code> per header row (leaving an empty first cell instead of spanning), uses bold text instead of <code>th</code>, and puts the totals in the body. Screen readers cannot announce which plan a value belongs to.</p>`, code: { lang: 'html', code: `<table border="1">
  <tr><td></td><td colspan="3"><b>Plans</b></td></tr>
  <tr><td><b>Feature</b></td><td><b>Free</b></td><td><b>Pro</b></td><td><b>Team</b></td></tr>
  <tr><td>Projects</td><td>3</td><td>20</td><td>Unlimited</td></tr>
</table>` } },
    mcq: { q: 'Header row 1 has Feature (rowspan=2) and Plans (colspan=3). How many cells does header row 2 need?', options: ['3', '4', '2', '1'], answer: 0, explain: 'The Feature cell already occupies column 1 of row 2, so only the three plan columns remain to be written.' },
    hints: [
      `<p>Hint 1 (aha): count slots per row. 4 columns in total; a rowspan means the next row writes fewer cells.</p>`,
      `<p>Hint 2: header cells are <code>th</code>. Use <code>scope="colgroup"</code> for "Plans", <code>scope="col"</code> for each plan, <code>scope="row"</code> for row labels like "Projects".</p>`,
      `<p>Hint 3: structure = caption → thead (2 rows) → tbody (2 rows with <code>th scope=row</code> + 3 td) → tfoot (1 row). Check each row adds up to 4.</p>`
    ],
    solution: {
      approach: `<p>Draw the 4-column grid, put "Feature" with <code>rowspan="2"</code> and "Plans" with <code>colspan="3"</code> in header row 1, write only three plan headers in row 2, then use <code>th scope="row"</code> as the first cell of every data and footer row.</p>`,
      code: { lang: 'html', code: `<table>
  <caption>Plan comparison</caption>
  <thead>
    <tr>
      <th scope="col" rowspan="2">Feature</th>
      <th scope="colgroup" colspan="3">Plans</th>
    </tr>
    <tr>
      <th scope="col">Free</th>
      <th scope="col">Pro</th>
      <th scope="col">Team</th>
    </tr>
  </thead>
  <tbody>
    <tr><th scope="row">Projects</th><td>3</td><td>20</td><td>Unlimited</td></tr>
    <tr><th scope="row">Support</th><td>Community</td><td>Email</td><td>Priority</td></tr>
  </tbody>
  <tfoot>
    <tr><th scope="row">Price per month</th><td>₹0</td><td>₹499</td><td>₹1,299</td></tr>
  </tfoot>
</table>` },
      complexity: `<p>Table formation is O(cells). The accessibility gain: a screen reader announces "Pro, Projects, 20" because each data cell is linked to its column and row headers.</p>`,
      followUps: ['How would you make the Pro column stand out without changing the semantics?', 'What if the table is too wide for a phone?']
    }
  }]
});

/* ====================== TOPIC 6: META TAGS & SEO ====================== */
function headFlowFrames() {
  var nodes = [
    { id: 'head', label: '<head> tags', x: 50, y: 8, shape: 'box' },
    { id: 'dec', label: 'Text decoder', x: 10, y: 42, shape: 'box' },
    { id: 'view', label: 'Phone layout', x: 30, y: 42, shape: 'box' },
    { id: 'tab', label: 'Browser tab', x: 50, y: 42, shape: 'box' },
    { id: 'serp', label: 'Google result', x: 71, y: 42, shape: 'box' },
    { id: 'card', label: 'Share card', x: 91, y: 42, shape: 'box' }
  ];
  var edges = [['head', 'dec'], ['head', 'view'], ['head', 'tab'], ['head', 'serp'], ['head', 'card']];
  var tags = {};
  function g(hl, ehl, tg) { return { type: 'graph', label: 'Who reads which head tag?', directed: true, height: 52, nodes: nodes, edges: edges, hl: hl || { head: 'cur' }, ehl: ehl || {}, tags: JSON.parse(JSON.stringify(tg || tags)) }; }
  var steps = [
    ['The <code>&lt;head&gt;</code> is not shown on the page, but <b>many different readers</b> use it: the browser itself, phones, search engines and apps that make link previews (WhatsApp, Slack, X, LinkedIn). Let us follow each tag.', null, null, null],
    ['<code>&lt;meta charset="utf-8"&gt;</code> → the <b>text decoder</b>. It says how bytes become letters. Without it, "café" can turn into "cafÃ©".', 'dec', 'charset', null],
    ['<code>&lt;meta name="viewport" content="width=device-width, initial-scale=1"&gt;</code> → <b>phone layout</b>. Tells the phone: use the real screen width, do not zoom the page out. It is the switch that makes responsive CSS work.', 'view', 'viewport', null],
    ['<code>&lt;title&gt;</code> → the <b>browser tab</b> (and bookmarks, history) <i>and</i> the blue headline in Google. The single most important head tag for SEO.', 'tab', 'title', 'serp'],
    ['<code>&lt;link rel="icon"&gt;</code> → the small picture in the <b>tab</b>. Not SEO, but users find your tab by it.', 'tab', 'icon', null],
    ['<code>&lt;meta name="description" content="..."&gt;</code> → the grey text under the blue headline in <b>Google results</b>. It does not directly rank you, but a good one gets more clicks.', 'serp', 'description', null],
    ['<code>&lt;link rel="canonical" href="..."&gt;</code> and <code>&lt;meta name="robots" content="noindex"&gt;</code> → tell <b>search engines</b> which URL is the "real" one and whether to index the page at all.', 'serp', 'canonical, robots', null],
    ['<b>Open Graph</b> tags (<code>og:title</code>, <code>og:description</code>, <code>og:image</code>, <code>og:url</code>) → the <b>share card</b> when someone pastes your link into WhatsApp, Slack, LinkedIn or Facebook. <code>twitter:card</code> does the same for X.', 'card', 'og:*', null],
    ['Summary: one small block of text in the head feeds the decoder, the phone, the tab, Google and every link preview. It costs a few lines and is the cheapest SEO and UX win on the web.', null, null, null]
  ];
  var frames = [];
  steps.forEach(function (s, i) {
    var hl = { head: 'cur' }, ehl = {};
    if (s[1]) { hl[s[1]] = 'ok'; ehl['head-' + s[1]] = 'ok'; tags[s[1]] = tags[s[1]] ? tags[s[1]] + ', ' + s[2] : s[2]; }
    if (s[3]) { hl[s[3]] = 'ok'; ehl['head-' + s[3]] = 'ok'; tags[s[3]] = tags[s[3]] ? tags[s[3]] + ', ' + s[2] : s[2]; }
    if (i === 8) hl = {};
    frames.push({ narr: s[0], parts: [g(hl, ehl)] });
  });
  return frames;
}

function snippetFrames(input) {
  var parts = String(input).split('|');
  if (parts.length !== 2) throw new Error('Format:  page title | meta description');
  var title = parts[0].trim(), desc = parts[1].trim();
  if (!title || !desc) throw new Error('Type a title, a | sign, and a description');
  var tl = title.length, dl = desc.length;
  function tv() { return tl === 0 ? ['missing', 'bad'] : tl < 30 ? ['short — wasted space', 'bad'] : tl <= 60 ? ['good', 'ok'] : ['too long — will be cut with …', 'bad']; }
  function dv() { return dl < 70 ? ['short — Google may write its own', 'bad'] : dl <= 160 ? ['good', 'ok'] : ['too long — will be cut with …', 'bad']; }
  var frames = [];
  frames.push({ narr: 'Search results show a <b>title</b> (blue link) and a <b>description</b> (grey text). Google shows roughly the first ~60 characters of the title and ~155 of the description (the real limit is pixel width, so treat these as guides).', parts: [{ type: 'bars', label: 'Length in characters', values: [tl, dl], idxLabels: ['title', 'description'], texts: [tl + ' chars', dl + ' chars'] }] });
  frames.push({ narr: 'Title check: <b>' + tl + '</b> characters → <b>' + tv()[0] + '</b>. Aim for 30–60, put the most important words first, make every page title unique, add the brand at the end.', parts: [{ type: 'bars', label: 'Length in characters', values: [tl, dl], idxLabels: ['title', 'description'], texts: [tl + ' chars', dl + ' chars'], hl: { 0: tv()[1] } }, { type: 'table', label: 'Targets', columns: ['field', 'good range', 'yours'], rows: [['title', '30–60', String(tl)], ['description', '70–160', String(dl)]], hl: { 0: tv()[1] } }] });
  frames.push({ narr: 'Description check: <b>' + dl + '</b> characters → <b>' + dv()[0] + '</b>. Write it like a one-line ad for the page: what will the visitor get? Unique per page, no keyword stuffing.', parts: [{ type: 'bars', label: 'Length in characters', values: [tl, dl], idxLabels: ['title', 'description'], texts: [tl + ' chars', dl + ' chars'], hl: { 0: tv()[1], 1: dv()[1] } }, { type: 'table', label: 'Targets', columns: ['field', 'good range', 'yours'], rows: [['title', '30–60', String(tl)], ['description', '70–160', String(dl)]], hl: { 0: tv()[1], 1: dv()[1] } }] });
  var t2 = tl > 60 ? title.slice(0, 59) + '…' : title, d2 = dl > 160 ? desc.slice(0, 159) + '…' : desc;
  frames.push({ narr: 'A rough preview of the Google result. Anything past the limit is cut off with "…". ' + ((tl > 60 || dl > 160) ? '<span class="c-r">Part of your text would be hidden.</span>' : '<span class="c-g">Everything fits.</span>'), parts: [{ type: 'text', label: 'Search result preview', html: '<div><div class="c-m"><small>https://chaicorner.example › blog</small></div><div class="c-b"><u><b>' + esc(t2) + '</b></u></div><div>' + esc(d2) + '</div></div>' }] });
  frames.push({ narr: 'The tags that make it happen. Remember: Google may still rewrite the snippet if it thinks another sentence on your page matches the search better.', parts: [{ type: 'code', label: 'In the head section', lang: 'html', code: '<title>' + title.replace(/</g, '&lt;') + '</title>\n<meta name="description"\n      content="' + desc.replace(/</g, '&lt;').replace(/"/g, '&quot;') + '">' }] });
  return frames;
}

function scriptFrames(input) {
  var mode = String(input).trim().toLowerCase();
  var S = {
    normal: { code: '<script src="app.js"><\/script>', rows: [
      ['1', 'Reading HTML…', '-', '-', 'The parser reads the page from the top, building the DOM.'],
      ['2', '<span class="c-r">PAUSED</span>', 'start download app.js', '-', 'It meets the script tag. A classic script may change the page while it runs, so the parser <b>stops and waits</b>.'],
      ['3', '<span class="c-r">PAUSED</span>', 'downloading…', '-', 'Still waiting for the network. Nothing after the script is built — the user may see a blank page.'],
      ['4', '<span class="c-r">PAUSED</span>', 'done', 'RUNS', 'The script executes. Only now can the parser go on.'],
      ['5', 'Reading rest of HTML…', '-', '-', 'Parsing resumes. Total delay = download time + run time.'],
      ['6', 'Finished → DOMContentLoaded', '-', '-', 'DOM is ready.']
    ] },
    defer: { code: '<script src="app.js" defer><\/script>', rows: [
      ['1', 'Reading HTML…', '-', '-', 'The parser reads the page.'],
      ['2', 'Reading HTML…', 'start download app.js (parallel)', '-', 'The browser sees <code>defer</code>: download in the background, <b>do not pause</b>.'],
      ['3', 'Reading HTML…', 'downloading…', '-', 'Parsing and downloading happen at the same time — no waiting.'],
      ['4', 'Finished parsing', 'done', '-', 'The whole DOM exists, so the script can safely touch any element.'],
      ['5', 'Finished', '-', 'RUNS (in order)', 'Deferred scripts run after parsing, in the order they appear, just before DOMContentLoaded.'],
      ['6', 'DOMContentLoaded fires', '-', '-', 'Best default for your own app code.']
    ] },
    async: { code: '<script src="analytics.js" async><\/script>', rows: [
      ['1', 'Reading HTML…', '-', '-', 'The parser reads the page.'],
      ['2', 'Reading HTML…', 'start download analytics.js (parallel)', '-', 'With <code>async</code> the download is also in the background.'],
      ['3', 'Reading HTML…', 'downloading…', '-', 'Parsing continues.'],
      ['4', '<span class="c-y">PAUSED briefly</span>', 'done', 'RUNS (as soon as ready)', 'The moment the file arrives, the parser pauses and the script runs — at an unpredictable time, in any order relative to other scripts.'],
      ['5', 'Reading rest of HTML…', '-', '-', 'Parsing resumes.'],
      ['6', 'Finished → DOMContentLoaded', '-', '-', 'Use async only for independent scripts (analytics, ads) that do not need the DOM or other scripts.']
    ] }
  };
  if (!S[mode]) throw new Error('Type one of: normal, defer, async');
  var cfg = S[mode], frames = [], rows = [];
  cfg.rows.forEach(function (r, i) {
    rows.push([r[0], r[1].replace(/<[^>]*>/g, ''), r[2], r[3]]);
    var hl = {}; hl[rows.length - 1] = i === 3 && mode !== 'defer' ? 'bad' : 'cur';
    frames.push({ narr: r[4], parts: [{ type: 'code', label: 'The tag in your head', lang: 'html', code: cfg.code, hl: { 1: 'cur' } }, { type: 'table', label: 'Timeline (' + mode + ')', columns: ['step', 'HTML parser', 'network', 'script'], rows: rows.map(function (x) { return x.slice(); }), hl: hl }] });
  });
  return frames;
}

topics.push({
  title: 'The Head, Meta Tags & SEO Basics',
  analogy: `<p>The <code>&lt;head&gt;</code> is the <b>cover and spine of a book</b> plus the <b>back-cover blurb</b>. Nobody reads it as part of the story, but the bookshop (Google) files the book by it, the library (browser) shows its title on the shelf (tab), and the postcard you send a friend (a shared link) uses the cover picture and one line of text. The story inside (the body) can be wonderful, but if the cover is blank, nobody picks it up.</p>`,
  explain: `<p><b>🟢 What goes in the head.</b> Information <i>about</i> the page. Here is a starter checklist:</p>
  ${H.table(['Tag', 'Example', 'Who uses it'], [
    ['<code>meta charset</code>', '<code>&lt;meta charset="utf-8"&gt;</code>', 'Browser: decodes text. Put first.'],
    ['<code>meta viewport</code>', '<code>&lt;meta name="viewport" content="width=device-width, initial-scale=1"&gt;</code>', 'Phones: responsive layout'],
    ['<code>title</code>', '<code>&lt;title&gt;Masala Chai Recipe | Chai Corner&lt;/title&gt;</code>', 'Tab, bookmarks, Google headline'],
    ['<code>meta description</code>', '<code>&lt;meta name="description" content="..."&gt;</code>', 'Google snippet (click-through)'],
    ['<code>link canonical</code>', '<code>&lt;link rel="canonical" href="https://chai.example/recipe"&gt;</code>', 'Search engines: the one true URL (duplicates)'],
    ['<code>meta robots</code>', '<code>&lt;meta name="robots" content="noindex"&gt;</code>', 'Search engines: do not list this page'],
    ['<code>link rel="icon"</code>', '<code>&lt;link rel="icon" href="/favicon.svg"&gt;</code>', 'Tabs, bookmarks'],
    ['Open Graph', '<code>&lt;meta property="og:title" content="..."&gt;</code> + <code>og:image</code>, <code>og:description</code>, <code>og:url</code>', 'WhatsApp, Slack, LinkedIn, Facebook link cards'],
    ['<code>link stylesheet</code>', '<code>&lt;link rel="stylesheet" href="site.css"&gt;</code>', 'Browser: loads CSS before painting'],
    ['<code>script</code>', '<code>&lt;script src="app.js" defer&gt;</code>', 'Browser: your JavaScript']
  ])}
  <p><b>🟢 SEO in simple words.</b> SEO = Search Engine Optimization = making it easy for Google to <b>find</b> (crawl), <b>understand</b> (index) and <b>rank</b> your page. Most of it is just good HTML:</p>
  <ul>
    <li>A unique, descriptive <code>&lt;title&gt;</code> and meta description on every page.</li>
    <li>One <code>&lt;h1&gt;</code> and a sensible heading outline; semantic landmarks (<code>main</code>, <code>nav</code>, <code>article</code>).</li>
    <li>Link text that describes the destination; <code>alt</code> text on images.</li>
    <li>Clean, readable URLs (<code>/recipes/masala-chai</code> not <code>/p?id=83&amp;x=7</code>); a <code>sitemap.xml</code> and <code>robots.txt</code>.</li>
    <li>Fast, mobile-friendly pages (the viewport tag and Core Web Vitals).</li>
    <li>Content that exists in the HTML the crawler receives — important text should not be created only after heavy JavaScript runs.</li>
  </ul>
  <p><b>🟢 Loading scripts.</b> Normal <code>&lt;script src&gt;</code> <b>blocks</b> the parser. <code>defer</code> downloads in parallel and runs after parsing (in order) — the best default. <code>async</code> runs the instant it arrives (any order). <code>type="module"</code> is deferred by default. Try the timeline below.</p>
  <p><b>Don't:</b> stuff keywords (<code>keywords</code> meta is ignored by Google), copy the same title on every page, block your whole site with <code>noindex</code> by accident, or forget that <code>noindex</code> pages blocked in <code>robots.txt</code> can never be crawled to see the noindex.</p>`,
  clues: [
    '"What goes in the head? What is the difference between head and body?"',
    '"Why is my page tiny on mobile?" → viewport meta',
    '"How do you make a shared link show a nice image?" → Open Graph tags',
    '"How would you improve this page\'s SEO?" → title, description, headings, alt, canonical, sitemap, speed',
    '"defer vs async vs normal script" → parser blocking and execution order',
    '"Two URLs show the same content — what do you do?" → rel="canonical" (or redirect)',
    '"SPA not showing in Google" → crawlers need HTML content: SSR / pre-rendering'
  ],
  code: [
    { lang: 'html', title: 'A complete, SEO-ready head', code: `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Masala Chai Recipe in 10 Minutes | Chai Corner</title>
  <meta name="description" content="Learn to brew authentic masala chai with ginger and cardamom in 10 minutes. Step-by-step recipe with tips.">
  <link rel="canonical" href="https://chai.example/recipes/masala-chai">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <meta name="theme-color" content="#7a3e00">

  <!-- Link previews (WhatsApp, Slack, LinkedIn, Facebook) -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="Masala Chai Recipe in 10 Minutes">
  <meta property="og:description" content="Authentic masala chai with ginger and cardamom.">
  <meta property="og:image" content="https://chai.example/img/chai-1200x630.jpg">
  <meta property="og:url" content="https://chai.example/recipes/masala-chai">
  <meta name="twitter:card" content="summary_large_image">

  <!-- Structured data: tells search engines exactly what this page is -->
  <script type="application/ld+json">
  { "@context": "https://schema.org", "@type": "Recipe", "name": "Masala Chai",
    "author": { "@type": "Person", "name": "Asha" }, "prepTime": "PT10M" }
  <\/script>

  <link rel="stylesheet" href="/css/site.css">
  <script src="/js/app.js" defer><\/script>
</head>` },
    { lang: 'js', run: true, title: 'Generate and sanity-check head tags from data', code: `// A tiny SEO helper: escape values, build tags, and warn about bad lengths.
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function buildHead(page) {
  const warnings = [];
  if (page.title.length < 30 || page.title.length > 60) warnings.push('title length ' + page.title.length + ' (aim 30-60)');
  if (page.description.length < 70 || page.description.length > 160) warnings.push('description length ' + page.description.length + ' (aim 70-160)');
  const tags = [
    '<title>' + page.title.replace(/</g, '&lt;') + '</title>',
    '<meta name="description" content="' + escAttr(page.description) + '">',
    '<link rel="canonical" href="' + escAttr(page.url) + '">',
    '<meta property="og:title" content="' + escAttr(page.title) + '">',
    '<meta property="og:image" content="' + escAttr(page.image) + '">'
  ];
  return { html: tags.join('\\n'), warnings };
}
const out = buildHead({
  title: 'Masala Chai Recipe in 10 Minutes | Chai Corner',
  description: 'Learn to brew "authentic" masala chai with ginger and cardamom in 10 minutes.',
  url: 'https://chai.example/recipes/masala-chai',
  image: 'https://chai.example/img/chai.jpg'
});
console.log(out.html);
console.log('warnings:', out.warnings);` }
  ],
  codeTitle: ['SEO-ready head', 'Head tag helper'],
  viz: [
    { title: 'Who reads each head tag?', gen: function () { return headFlowFrames(); } },
    {
      title: 'Title & description preview (Google snippet)',
      input: 'Masala Chai Recipe in 10 Minutes - Chai Corner | Learn to brew authentic masala chai with ginger and cardamom in 10 minutes. Step-by-step recipe.',
      inputLabel: 'title | description',
      gen: function (input) { return snippetFrames(input); }
    },
    {
      title: 'Script loading: normal vs defer vs async',
      input: 'defer',
      inputLabel: 'Type normal, defer or async',
      gen: function (input) { return scriptFrames(input); }
    }
  ],
  examples: [
    {
      title: 'Good vs bad titles',
      html: `${H.table(['Title', 'Verdict', 'Why'], [
        ['<code>Home</code>', '<span class="c-r">Bad</span>', 'Says nothing; same on every page'],
        ['<code>Chai Corner | Masala Chai | Best Chai | Buy Chai | Tea Online</code>', '<span class="c-r">Bad</span>', 'Keyword stuffing, too long'],
        ['<code>Masala Chai Recipe in 10 Minutes | Chai Corner</code>', '<span class="c-g">Good</span>', 'Specific topic first, brand last, 46 chars']
      ])}`
    },
    {
      title: 'Canonical, robots and noindex — three different jobs',
      html: `${H.table(['Tool', 'What it says', 'Use for'], [
        ['<code>link rel=canonical</code>', '"This page is a copy; the real one is over there."', 'URLs with tracking params, print versions, filtered lists'],
        ['<code>meta robots noindex</code>', '"Don\'t list this page in results."', 'Thank-you pages, internal search results, staging'],
        ['<code>robots.txt Disallow</code>', '"Don\'t even crawl this path."', 'Huge useless sections; <b>not</b> a way to hide pages (they can still be listed by link)'],
        ['<code>301 redirect</code>', '"This page moved permanently."', 'Old URLs, http → https']
      ])}`
    },
    {
      title: 'Structured data (JSON-LD)',
      html: `<p>Search engines can read a small JSON block that spells out facts: this is a Recipe / Product / Article / FAQ / Event. That may earn <b>rich results</b> (stars, price, time) in search. The block lives in a <code>script type="application/ld+json"</code> and is never run as JavaScript.</p>`,
      code: { lang: 'json', code: `{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Masala Chai Recipe in 10 Minutes",
  "datePublished": "2026-10-15",
  "author": { "@type": "Person", "name": "Asha" },
  "image": "https://chai.example/img/chai.jpg"
}` }
    },
    {
      title: 'Resource hints in the head',
      html: `<p>A few <code>link</code> tags tell the browser to get ready early: <code>preconnect</code> (open the connection to another domain now), <code>preload</code> (this file is needed very soon — fetch it with high priority), <code>dns-prefetch</code> (just resolve the name). Use them sparingly: too many "high priority" items cancel each other out.</p>`,
      code: { lang: 'html', code: `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/img/hero.avif" as="image" fetchpriority="high">` }
    }
  ],
  deepDive: `<p><b>🟣 How a search engine sees your page.</b> The pipeline is: <b>crawl</b> (fetch URL, respecting robots.txt) → <b>render</b> (Googlebot uses an evergreen Chromium; JavaScript is run in a second wave, which can lag) → <b>index</b> (store words, links, structured data; pick the canonical URL) → <b>rank</b> (hundreds of signals: relevance, links, page experience). A plain HTML page is indexed fast; content created only after heavy client-side JavaScript can be indexed late or incompletely — hence SSR/SSG/pre-rendering for content sites.</p>
  <p><b>Meta tag facts people get wrong.</b> The <code>keywords</code> meta is ignored by Google. The description is <i>not</i> a ranking factor but affects click-through, and Google rewrites it for many queries. <code>meta robots</code> values: <code>index/noindex</code>, <code>follow/nofollow</code>, <code>noarchive</code>, <code>max-snippet</code>. HTTP header <code>X-Robots-Tag</code> does the same for non-HTML files like PDFs. A <code>noindex</code> page must stay crawlable or Google never sees the tag.</p>
  <p><b>Open Graph is a separate protocol</b> (created by Facebook). Scrapers fetch your HTML <i>without running JavaScript</i>, so OG tags must be in the server-sent HTML, not injected on the client. Image: 1200×630, under ~8 MB. Caches are sticky — use each platform's debugger to refresh.</p>
  <p><b>The viewport tag, precisely.</b> Without it mobile browsers lay the page out in a virtual ~980px viewport and shrink it. <code>width=device-width, initial-scale=1</code> makes layout width = real width. Do <b>not</b> add <code>user-scalable=no</code> or <code>maximum-scale=1</code>: that blocks pinch-zoom and fails accessibility.</p>
  <p><b>Script loading precisely.</b> Classic: blocks parsing. <code>defer</code>: fetch in parallel, execute after the document is parsed, in document order, before <code>DOMContentLoaded</code>. <code>async</code>: fetch in parallel, execute ASAP (pauses the parser), order not guaranteed. <code>type="module"</code>: deferred by default, strict mode, own scope; <code>async</code> can override. Inline scripts always block. Third-party tags (analytics, chat widgets) are a leading cause of poor INP; load late and with <code>async</code>.</p>
  <p><b>Internationalisation.</b> <code>hreflang</code> link tags connect language/region versions (<code>en-in</code>, <code>hi-in</code>) so Google serves the right one; <code>lang</code> on html is for browsers/assistive tech and should match.</p>`,
  aiEra: `<p><b>🤖 What AI changes.</b> Search is shifting from "ten blue links" to <b>AI answers</b> (AI Overviews, ChatGPT search, Perplexity). These systems still start from crawled HTML, so clear titles, headings, structured data and fast, accessible pages help you get <i>cited</i>. Crawlers for AI training and AI search have their own user agents, and <code>robots.txt</code> is how you allow or block them (a business decision, not a coding one). A new idea, <code>llms.txt</code>, proposes a plain-text guide for AI readers — adoption is still uneven, so don't rely on it.</p>
  <p><b>Use AI as a partner:</b> <code>Write 3 title and description variants for this page under the length limits, no keyword stuffing</code>; <code>Generate JSON-LD for this recipe page and validate against schema.org types</code>; <code>Audit this head for missing tags and wrong values</code>.</p>
  <p><b>Where AI goes wrong:</b> invents facts in descriptions and structured data (a fake rating or price can violate search policies and mislead users); writes generic, near-identical titles for every page; suggests <code>keywords</code> meta; sets <code>noindex</code> on the wrong environment; mass-produces thin content, which search engines now actively demote.</p>
  <p><b>What you must still own:</b> accuracy of every claim, unique value on each page, checking Search Console, Lighthouse and the link-preview debuggers, and the decision of what to allow AI crawlers to read.</p>`,
  problems: [{
    title: 'Write the Head for a Blog Post',
    level: 'Medium', tags: ['head', 'meta', 'seo', 'open graph'], companies: ['Shopify', 'Medium', 'Hotstar'],
    statement: `<p>You publish the article <b>"How to Choose Running Shoes"</b> at <code>https://runfast.example/guides/choose-running-shoes</code>. It was posted on 2026-09-30, and the same article is also reachable at <code>/guides/choose-running-shoes?utm_source=news</code>. The cover image is <code>/img/shoes-1200x630.jpg</code>, and the site's CSS is <code>/css/main.css</code> and JS <code>/js/main.js</code>. Write the complete <code>&lt;head&gt;</code>: encoding, mobile support, unique title and description (within recommended lengths), a canonical URL (avoid duplicate-URL problems), social share tags with a big image, the stylesheet and the script that does not block parsing.</p>`,
    constraints: `Title 30–60 chars. Description 70–160 chars. charset must be the first tag. JS must not block the HTML parser.`,
    example: `<p>Visiting <code>...?utm_source=news</code> shows the same page. With <code>${H.c('g', '&lt;link rel="canonical" href=".../choose-running-shoes"&gt;')}</code> Google knows to combine both URLs into one result. <i>Why</i>: duplicate URLs split ranking signals otherwise.</p>`,
    brute: { why: `<p>The lazy head has only a title and a stylesheet. Phones render a shrunken desktop layout, there is no description (Google writes its own), duplicate URLs compete with each other, links shared on WhatsApp show no image, and a plain script tag blocks parsing.</p>`, code: { lang: 'html', code: `<head>
  <title>Shoes</title>
  <link rel="stylesheet" href="/css/main.css">
  <script src="/js/main.js"><\/script>
</head>` } },
    mcq: { q: 'Which tag fixes "the same page is reachable under many URLs"?', options: ['link rel="canonical"', 'meta name="keywords"', 'meta charset', 'og:url only'], answer: 0, explain: 'Canonical names the preferred URL so search engines merge duplicates into one result.' },
    hints: [
      `<p>Hint 1 (aha): split the work by reader — browser (charset, viewport, CSS, JS), Google (title, description, canonical), social apps (Open Graph).</p>`,
      `<p>Hint 2: put <code>meta charset</code> first. Use <code>defer</code> on the script. The canonical URL has <b>no</b> query string.</p>`,
      `<p>Hint 3: Open Graph needs <code>og:type=article</code>, <code>og:title</code>, <code>og:description</code>, <code>og:image</code> (absolute URL), <code>og:url</code>; add <code>twitter:card=summary_large_image</code>. Count characters to stay in range.</p>`
    ],
    solution: {
      approach: `<p>Order tags by importance: charset, viewport, title/description, canonical, social tags, CSS, then deferred JS. All URLs in canonical and OG tags must be absolute because external apps read them out of context.</p>`,
      code: { lang: 'html', code: `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>How to Choose Running Shoes: A Simple Guide | RunFast</title>
  <meta name="description" content="Fit, cushioning and terrain explained in plain words. Learn how to choose running shoes that match your feet and your runs.">
  <link rel="canonical" href="https://runfast.example/guides/choose-running-shoes">

  <meta property="og:type" content="article">
  <meta property="og:title" content="How to Choose Running Shoes: A Simple Guide">
  <meta property="og:description" content="Fit, cushioning and terrain explained in plain words.">
  <meta property="og:image" content="https://runfast.example/img/shoes-1200x630.jpg">
  <meta property="og:url" content="https://runfast.example/guides/choose-running-shoes">
  <meta property="article:published_time" content="2026-09-30">
  <meta name="twitter:card" content="summary_large_image">

  <link rel="stylesheet" href="/css/main.css">
  <script src="/js/main.js" defer><\/script>
</head>` },
      complexity: `<p>No runtime cost beyond a few hundred bytes of HTML. The title is 53 characters and the description 123, both inside the recommended ranges. Using <code>defer</code> removes the parser-blocking download from the critical path.</p>`,
      followUps: ['What would you add for an article in two languages?', 'How can you check what WhatsApp will show?']
    }
  }]
});

/* ====================== TOPIC 7: VALIDATION ====================== */
var EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function validityFrames(input) {
  var spec = { type: 'text', required: false, minlength: null, maxlength: null, min: null, max: null, step: null, pattern: null, value: '' };
  var items = String(input).split(';').map(function (s) { return s.trim(); }).filter(Boolean);
  if (!items.length) throw new Error('Example:  type=email; required; minlength=6; value=abc');
  items.forEach(function (it) {
    var eq = it.indexOf('='), k = (eq < 0 ? it : it.slice(0, eq)).trim().toLowerCase(), v = eq < 0 ? true : it.slice(eq + 1).trim();
    if (!spec.hasOwnProperty(k)) throw new Error('Unknown setting "' + k + '". Use: type required minlength maxlength min max step pattern value');
    spec[k] = k === 'required' ? true : v;
  });
  if (['text', 'email', 'url', 'number', 'tel', 'password'].indexOf(spec.type) < 0) throw new Error('type must be text, email, url, number, tel or password');
  var val = String(spec.value), len = val.length, frames = [], rows = [], hl = {}, failures = [];
  function show(narr, vals, cls) {
    frames.push({ narr: narr, parts: [{ type: 'vars', label: 'The input element', vals: vals || { type: spec.type, required: spec.required ? 'yes' : 'no', value: '"' + val + '"' } }, { type: 'table', label: 'ValidityState flags (what the browser computes)', columns: ['flag', 'rule that triggers it', 'result'], rows: rows.map(function (r) { return r.slice(); }), hl: JSON.parse(JSON.stringify(hl)) }] });
  }
  var attrs = [];
  ['type', 'required', 'minlength', 'maxlength', 'min', 'max', 'step', 'pattern'].forEach(function (k) { if (spec[k] !== null && spec[k] !== false && !(k === 'type' && spec.type === 'text')) attrs.push(k === 'required' ? 'required' : k + '="' + spec[k] + '"'); });
  show('The browser looks at the element <code>&lt;input ' + esc(attrs.join(' ')) + '&gt;</code> and the current value <b>"' + esc(val) + '"</b>. It runs a fixed list of checks; each failing check sets a flag on <code>input.validity</code>. If any flag is true, the field is <b>:invalid</b> and the form will not submit.');
  function row(flag, rule, applies, fails, why) {
    var res = !applies ? 'not applicable' : fails ? 'TRUE → invalid' : 'false (ok)', cls = !applies ? 'done' : fails ? 'bad' : 'ok';
    rows.push([flag, rule, res]); hl[rows.length - 1] = cls;
    if (applies && fails) failures.push(flag);
    show('<b>' + flag + '</b> — ' + why + ' → ' + (!applies ? '<span class="c-m">this rule is not set (or does not apply), skip</span>' : fails ? '<span class="c-r">fails</span>' : '<span class="c-g">passes</span>') + '.');
  }
  row('valueMissing', 'required and value is empty', spec.required, val === '', 'A required field must not be empty');
  var tm = false, tmApplies = (spec.type === 'email' || spec.type === 'url') && val !== '';
  if (spec.type === 'email') tm = !EMAIL_RE.test(val);
  if (spec.type === 'url') { try { new URL(val); } catch (e) { tm = true; } }
  row('typeMismatch', 'value does not look like the type (email / url)', tmApplies, tm, 'Email needs name@domain, URL needs a scheme like https://');
  var bad = spec.type === 'number' && val !== '' && isNaN(Number(val));
  row('badInput', 'type=number but the text is not a number', spec.type === 'number' && val !== '', bad, 'The browser could not turn the text into a number');
  var ml = spec.minlength !== null ? +spec.minlength : null;
  row('tooShort', 'minlength set and 0 < length < minlength', ml !== null && len > 0, ml !== null && len < ml, 'Length is ' + len + (ml !== null ? ' and the minimum is ' + ml : '') + ' (an empty value is "missing", not "too short")');
  var xl = spec.maxlength !== null ? +spec.maxlength : null;
  row('tooLong', 'maxlength set and length > maxlength', xl !== null, xl !== null && len > xl, 'Users cannot type past maxlength, but code can set a longer value');
  var pm = false, pApplies = spec.pattern !== null && val !== '';
  if (pApplies) { try { pm = !new RegExp('^(?:' + spec.pattern + ')$').test(val); } catch (e) { pApplies = false; } }
  row('patternMismatch', 'pattern set and value does not match the WHOLE pattern', pApplies, pm, 'The browser wraps your pattern like ^(?:pattern)$ — it must match all of the text');
  var num = Number(val), isNum = spec.type === 'number' && val !== '' && !isNaN(num);
  row('rangeUnderflow', 'number < min', isNum && spec.min !== null, isNum && spec.min !== null && num < +spec.min, 'Compare the number with min');
  row('rangeOverflow', 'number > max', isNum && spec.max !== null, isNum && spec.max !== null && num > +spec.max, 'Compare the number with max');
  var base = spec.min !== null ? +spec.min : 0, stp = spec.step !== null ? +spec.step : null;
  var sm = isNum && stp ? Math.abs((num - base) / stp - Math.round((num - base) / stp)) > 1e-9 : false;
  row('stepMismatch', '(number − min) is not a multiple of step', isNum && !!stp, sm, 'Allowed values are min, min+step, min+2·step, …');
  frames.push({ narr: failures.length ? '<span class="c-r">Result: :invalid</span> (' + failures.join(', ') + '). The browser blocks the submit, focuses the first bad field and shows a native message. In CSS the field matches <code>:invalid</code>; in JS <code>input.validity.valid === false</code> and <code>checkValidity()</code> returns false.' : '<span class="c-g">Result: :valid</span> — all flags are false. Remember: this only checks <b>format in the browser</b>. The server must validate again.', parts: [{ type: 'vars', label: 'Summary', vals: { valid: failures.length ? 'false' : 'true', 'failing flags': failures.length ? failures.join(', ') : 'none' }, hl: { valid: failures.length ? 'bad' : 'ok' } }, { type: 'table', label: 'ValidityState flags', columns: ['flag', 'rule that triggers it', 'result'], rows: rows, hl: hl }] });
  return frames;
}

topics.push({
  title: 'Validation: Forms in the Browser & Valid Markup',
  analogy: `<p>Think of an airport <b>check-in desk</b>. The first officer glances at your passport: "Is the name filled in? Is the date in the right format?" That is <b>browser (client-side) validation</b> — fast, friendly, saves everyone's time. But behind the desk there is a <b>security gate</b> that re-checks everything and does not trust the desk's stamp. That is <b>server-side validation</b>. The desk is for the traveller's comfort; the gate is for safety. And "valid markup" is a different check altogether — like a building inspector checking that the HTML itself follows the rules.</p>`,
  explain: `<p><b>🟢 Two meanings of "validation".</b></p>
  <ol>
    <li><b>Form validation</b> – is what the user typed acceptable?</li>
    <li><b>Markup validation</b> – is my HTML written correctly (nesting, required attributes, allowed children)?</li>
  </ol>
  <p><b>1) Built-in form validation (no JavaScript needed).</b> Add attributes and the browser checks them when the user submits:</p>
  ${H.table(['Attribute', 'Meaning', 'Works on'], [
    ['<code>required</code>', 'Must not be empty', 'most inputs, select, textarea'],
    ['<code>type="email" / "url"</code>', 'Must look like an email / URL', 'input'],
    ['<code>minlength</code> / <code>maxlength</code>', 'Number of characters', 'text-like inputs, textarea'],
    ['<code>min</code> / <code>max</code> / <code>step</code>', 'Number or date range, allowed steps', 'number, range, date…'],
    ['<code>pattern="[0-9]{6}"</code>', 'Whole value must match this regex', 'text-like inputs'],
    ['<code>novalidate</code> (on form)', 'Turn the browser check off (you do it yourself)', 'form']
  ])}
  <p><b>What the user sees:</b> the first invalid field gets focus and a bubble with a message such as "Please include an '@' in the email address". In CSS you can style <code>input:invalid</code> and <code>input:valid</code>. Modern browsers also support <code>:user-invalid</code>, which only applies <i>after</i> the user has touched the field — much friendlier than red boxes on a blank form.</p>
  <p><b>2) Custom rules with JavaScript.</b> Every field has <code>validity</code> (a list of flags: <code>valueMissing</code>, <code>typeMismatch</code>, <code>tooShort</code>, <code>patternMismatch</code>, <code>rangeUnderflow</code>...), <code>checkValidity()</code>, <code>reportValidity()</code> and <code>setCustomValidity("message")</code>. Setting a non-empty message makes the field invalid with your text; <b>clear it with an empty string</b> or the field stays invalid forever.</p>
  <p><b>3) Good error UX:</b> say what is wrong and how to fix it ("Password needs 8+ characters"), not "Invalid input"; show errors next to the field; connect them with <code>aria-describedby</code> and set <code>aria-invalid="true"</code>; do not show errors before the user finishes typing; keep the typed value.</p>
  <p><b>4) Never trust the browser.</b> A user can delete <code>required</code> in DevTools or use curl. The server must validate length, type, range, ownership and business rules again.</p>
  <p><b>5) Markup validation.</b> The W3C Nu HTML Checker (validator.w3.org/nu) and editor linters (HTMLHint, ESLint a11y plugins) find: unclosed or wrongly nested tags, duplicate <code>id</code>s, missing <code>alt</code>, a <code>&lt;div&gt;</code> inside a <code>&lt;p&gt;</code>, <code>&lt;li&gt;</code> outside a list, invalid attribute values, a <code>&lt;label for&gt;</code> that points to nothing. Valid markup does not guarantee good accessibility, but invalid markup nearly always means a bug.</p>`,
  clues: [
    '"How do you validate a form without JavaScript?" → required, type, pattern, min/max',
    '"Client-side vs server-side validation — do you need both?" → yes: UX vs security',
    '"Why does my custom error never go away?" → forgot setCustomValidity("")',
    '"Validate an email / phone / PIN code" → type=email, pattern, but beware over-strict regex; verify by sending a link',
    '"How do you show errors accessibly?" → aria-describedby, aria-invalid, role="alert"/live region, focus the first error',
    '"Is HTML5 validation enough for security?" → never; attackers skip the browser',
    '"What is the W3C validator / why validate HTML?" → catches nesting, id, attribute errors'
  ],
  code: [
    { lang: 'html', title: 'Native validation attributes', code: `<form action="/register" method="post">
  <label for="user">Username (4–12 letters/digits)</label>
  <input id="user" name="user" required minlength="4" maxlength="12"
         pattern="[A-Za-z0-9]+" title="Letters and digits only" autocomplete="username">

  <label for="mail">Email</label>
  <input id="mail" name="mail" type="email" required autocomplete="email">

  <label for="age">Age (18–99)</label>
  <input id="age" name="age" type="number" min="18" max="99" step="1" required>

  <label for="pin">6-digit PIN</label>
  <input id="pin" name="pin" inputmode="numeric" pattern="[0-9]{6}" required>

  <button type="submit">Register</button>
</form>
<style>
  /* only complain after the user has interacted */
  input:user-invalid { border: 2px solid crimson; }
  input:user-valid   { border: 2px solid seagreen; }
</style>` },
    { lang: 'js', run: true, title: 'Re-creating the browser checks (same flags as input.validity)', code: `// A small clone of the browser's constraint validation, so you can test rules anywhere (Node too).
const EMAIL = /^[a-zA-Z0-9.!#$%&'*+\\/=?^_\`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function validity(rules, value) {
  const v = String(value), flags = {};
  flags.valueMissing = !!rules.required && v === '';
  flags.typeMismatch = rules.type === 'email' && v !== '' && !EMAIL.test(v);
  flags.tooShort = rules.minlength != null && v.length > 0 && v.length < rules.minlength;
  flags.tooLong = rules.maxlength != null && v.length > rules.maxlength;
  flags.patternMismatch = !!rules.pattern && v !== '' && !new RegExp('^(?:' + rules.pattern + ')$').test(v);
  const n = Number(v);
  const isNum = rules.type === 'number' && v !== '' && !isNaN(n);
  flags.rangeUnderflow = isNum && rules.min != null && n < rules.min;
  flags.rangeOverflow = isNum && rules.max != null && n > rules.max;
  flags.valid = !Object.values(flags).some(Boolean);
  return flags;
}

console.log(validity({ type: 'email', required: true }, 'asha@example'));   // looks ok to the browser (no dot needed)
console.log(validity({ type: 'email', required: true }, 'asha.example.com')); // typeMismatch
console.log(validity({ pattern: '[0-9]{6}' }, '12345'));                      // patternMismatch (needs ALL 6)
console.log(validity({ type: 'number', min: 18, max: 99 }, '17').rangeUnderflow);` }
  ],
  codeTitle: ['Validation attributes', 'A clone of validity checks'],
  viz: [{
    title: 'What the browser checks, flag by flag',
    input: 'type=email; required; minlength=6; value=a@b',
    inputLabel: 'settings separated by ;  e.g. type=number; min=18; max=99; step=2; pattern=[0-9]+; value=17',
    gen: function (input) { return validityFrames(input); }
  }],
  examples: [
    {
      title: 'Confirm-password with setCustomValidity',
      html: `<p>HTML has no attribute for "these two fields must match". Use JavaScript and the built-in bubble:</p>`,
      code: { lang: 'js', code: `// Browser code: runs in the page with real inputs.
const pw = document.querySelector('#pw');
const pw2 = document.querySelector('#pw2');

function checkMatch() {
  // non-empty message => invalid + this message; empty string => valid again
  pw2.setCustomValidity(pw.value === pw2.value ? '' : 'Passwords do not match');
}
pw.addEventListener('input', checkMatch);
pw2.addEventListener('input', checkMatch);` }
    },
    {
      title: 'Custom messages and accessible errors with novalidate',
      html: `<p>If you want full control over wording and placement, switch the native bubbles off with <code>novalidate</code> and build the messages yourself — but keep using <code>input.validity</code> so the rules stay in HTML.</p>`,
      code: { lang: 'html', code: `<form id="f" novalidate>
  <label for="mail">Email</label>
  <input id="mail" type="email" required aria-describedby="mail-err">
  <p id="mail-err" class="error" role="alert" hidden></p>
  <button>Save</button>
</form>
<script>
  const f = document.getElementById('f'), mail = f.mail, err = document.getElementById('mail-err');
  f.addEventListener('submit', (e) => {
    if (!mail.validity.valid) {
      e.preventDefault();
      err.textContent = mail.validity.valueMissing ? 'Please enter your email.' : 'That does not look like an email address.';
      err.hidden = false;
      mail.setAttribute('aria-invalid', 'true');
      mail.focus();
    }
  });
<\/script>` }
    },
    {
      title: 'Why not a giant email regex?',
      html: `<p>Real addresses are strange (<code>o'brien@mail.co</code>, <code>user+tag@x.org</code>, internationalised domains). The browser's <code>type="email"</code> check is intentionally loose: it accepts <code>asha@example</code> (no dot). Do not try to be cleverer than that; if you need to know the address is real, <b>send a confirmation email</b>. Over-strict regexes reject real customers.</p>`
    },
    {
      title: 'Typical markup-validator errors',
      html: `${H.table(['Message', 'Cause', 'Fix'], [
        ['Element <code>div</code> not allowed as child of <code>p</code>', 'Block inside a paragraph', 'Use a <code>div</code> wrapper or close the <code>p</code> first'],
        ['Duplicate ID "menu"', 'Two elements share one id', 'ids must be unique; use classes for repeats'],
        ['An <code>img</code> element must have an <code>alt</code> attribute', 'Missing alt', 'Add alt text, or <code>alt=""</code> if decorative'],
        ['Stray end tag <code>&lt;/div&gt;</code>', 'Extra or misplaced closer', 'Re-indent and match each opener'],
        ['The <code>for</code> attribute of <code>label</code> must refer to a form control', 'Label points to nothing', 'Fix the id/for pair']
      ])}`
    }
  ],
  deepDive: `<p><b>🟣 The constraint validation algorithm.</b> The spec defines each control's "suffering from" flags: <i>valueMissing, typeMismatch, patternMismatch, tooLong, tooShort, rangeUnderflow, rangeOverflow, stepMismatch, badInput, customError</i>. A control is <b>valid</b> only when none is true. Controls <b>barred from validation</b> are skipped: <code>disabled</code>, <code>readonly</code>, hidden inputs, and buttons. <code>tooShort</code>/<code>tooLong</code> are only set after the value was changed by user interaction ("dirty value flag") — so a pre-filled too-short value is not flagged until edited, a quirk that surprises people.</p>
  <p><b>Events and methods.</b> On submit, the browser runs "interactively validate the constraints": for each invalid control it fires a cancelable <code>invalid</code> event, focuses the first, and shows the message (unless <code>novalidate</code> or <code>formnovalidate</code> on the clicked button). JS: <code>form.checkValidity()</code> (silent, fires invalid events), <code>form.reportValidity()</code> (also shows bubbles), <code>el.validationMessage</code> (the text), <code>form.requestSubmit()</code> (submit with validation; <code>form.submit()</code> skips it!).</p>
  <p><b>Pattern details.</b> The <code>pattern</code> regex is compiled with the <code>v</code> flag (unicode sets) in current browsers and implicitly anchored: <code>^(?:pattern)$</code>. So <code>pattern="[0-9]{6}"</code> needs exactly six digits, with no need for ^ and $. Always add a <code>title</code> or visible hint to explain the format — the old tooltip is used by some browsers.</p>
  <p><b>Server-side is the real validation.</b> Treat the client as hostile: validate type, size, range, enum membership, and ownership; return structured errors (field → message) with HTTP 400/422; escape output (XSS), use parameterised queries (SQL injection). Share the schema between client and server (Zod, Yup, JSON Schema) so the rules never drift.</p>
  <p><b>Accessibility.</b> Native bubbles are announced by modern screen readers but disappear quickly. For custom UI: keep a persistent error text linked via <code>aria-describedby</code>, set <code>aria-invalid</code>, move focus to the first invalid control (or an error summary at the top with links), and use a live region (<code>role="alert"</code>) for dynamic messages. Do not rely on colour alone — add an icon or text.</p>
  <p><b>Markup validity vs conformance.</b> Browsers never "fail" on invalid HTML, so validity is a quality tool, not a runtime need. The Nu checker implements the spec's content-model rules (which element may contain which). Integrate linting in CI (<code>html-validate</code>, <code>eslint-plugin-jsx-a11y</code>) so errors are caught before review.</p>`,
  aiEra: `<p><b>🤖 What AI changes.</b> AI makes it cheap to generate validation code and test data, but it also makes <b>mass bot signups and malicious payloads</b> easier. That raises the importance of server-side checks, rate limiting and bot defences — client validation cannot stop a script. And AI form-fillers/agents will often submit values that look plausible but fail strict rules, so clear <code>label</code>s, <code>autocomplete</code> tokens and helpful, <i>machine-readable</i> error messages make forms work for them too.</p>
  <p><b>Use AI as a partner:</b> <code>Generate 20 edge-case values (valid and invalid) for a 6-digit Indian PIN code field</code>; <code>Write a Zod schema equal to these HTML validation attributes</code>; <code>Review this regex for catastrophic backtracking</code>; <code>Run the W3C rules in your head on this markup and list the errors</code>.</p>
  <p><b>Where AI goes wrong:</b> huge "RFC-compliant" email regexes that reject valid addresses or hang on bad input (ReDoS); phone patterns for one country only; forgetting to clear <code>setCustomValidity</code>; telling you client validation is enough; unescaped error messages that echo user input back into the page (XSS).</p>
  <p><b>What you must still own:</b> the decision of <i>which</i> rules are right for the business (is a phone number required at all?), the server-side checks, privacy (do not log sensitive values), and testing real keyboard + screen reader flows.</p>`,
  problems: [{
    title: 'Implement validateField (a Mini Constraint Validation)',
    level: 'Medium', tags: ['validation', 'constraint validation', 'regex'], lang: 'js', companies: ['Atlassian', 'Zoho', 'Postman'],
    statement: `<p>Implement <code>validateField(rules, value)</code> that mimics the browser. <code>rules</code> may contain <code>required, type ('text' | 'email' | 'number'), minlength, maxlength, min, max, pattern</code> (a string). Return an <b>array of failing flag names</b> in this fixed order: <code>valueMissing, typeMismatch, tooShort, tooLong, patternMismatch, rangeUnderflow, rangeOverflow</code>. An empty array means valid. Rules: an empty value only triggers <code>valueMissing</code> (when required); <code>tooShort</code> needs length &gt; 0; the pattern must match the <b>whole</b> value; number rules apply only when type is number and the value is numeric.</p>`,
    constraints: `value is always a string. rules may omit any field. Do not use DOM APIs.`,
    example: `<p><code>validateField({required:true, type:'email'}, 'a@b')</code> → <b>[]</b> (the browser accepts a@b). <code>validateField({pattern:'[0-9]{6}'}, '12345')</code> → <b>['patternMismatch']</b>. <code>validateField({type:'number', min:18}, '17')</code> → <b>['rangeUnderflow']</b>. <i>Why</i>: each rule maps to one flag and empty text skips every rule except <code>required</code>.</p>`,
    brute: { why: `<p>The first attempt builds one giant <code>if/else</code> chain returning only the first problem and forgetting the whole-match rule for <code>pattern</code>. Users then fix one error, resubmit, see the next one — and a partial regex match like <code>/[0-9]{6}/</code> wrongly accepts <code>"1234567"</code>.</p>`, code: `function validateField(rules, value) {
  if (rules.required && value === '') return ['valueMissing'];
  if (rules.pattern && !new RegExp(rules.pattern).test(value)) return ['patternMismatch']; // not anchored!
  return [];
}` },
    mcq: { q: 'For pattern="[0-9]{6}" and value "1234567" the browser reports…', options: ['patternMismatch, because the whole value must match', 'valid, because six digits appear inside it', 'tooLong', 'typeMismatch'], answer: 0, explain: 'The pattern is anchored like ^(?:pattern)$, so seven digits do not match exactly six.' },
    hints: [
      `<p>Hint 1 (aha): do not stop at the first failure. Compute every flag independently and collect the names in a fixed order.</p>`,
      `<p>Hint 2: for <code>pattern</code> build <code>new RegExp('^(?:' + pattern + ')$')</code>. For email use a simple, permissive regex like <code>/^[^\\s@]+@[^\\s@]+$/</code>.</p>`,
      `<p>Hint 3: guard each rule with "is the rule set?" and "is the value non-empty?" (except required). Number rules need <code>type === 'number'</code> and <code>!isNaN(Number(value))</code>. Recipe: build a list of [flag, boolean] pairs, then filter by true.</p>`
    ],
    solution: {
      approach: `<p>Evaluate each flag as its own boolean, keep them in the specified order in an array of pairs, and return the names whose boolean is true. Empty text short-circuits all rules except <code>required</code> by testing <code>value !== ''</code>.</p>`,
      code: `function validateField(rules, value) {
  const v = String(value);
  const has = (k) => rules[k] !== undefined && rules[k] !== null;
  const nonEmpty = v !== '';
  const isNum = rules.type === 'number' && nonEmpty && !Number.isNaN(Number(v));
  const n = Number(v);

  const checks = [
    ['valueMissing', !!rules.required && !nonEmpty],
    ['typeMismatch', rules.type === 'email' && nonEmpty && !/^[^\\s@]+@[^\\s@]+$/.test(v)],
    ['tooShort', has('minlength') && nonEmpty && v.length < rules.minlength],
    ['tooLong', has('maxlength') && v.length > rules.maxlength],
    ['patternMismatch', has('pattern') && nonEmpty && !new RegExp('^(?:' + rules.pattern + ')$').test(v)],
    ['rangeUnderflow', isNum && has('min') && n < rules.min],
    ['rangeOverflow', isNum && has('max') && n > rules.max]
  ];
  return checks.filter(([, failed]) => failed).map(([name]) => name);
}

console.log(validateField({ required: true, type: 'email' }, 'a@b'));          // []
console.log(validateField({ pattern: '[0-9]{6}' }, '12345'));                    // [ 'patternMismatch' ]
console.log(validateField({ type: 'number', min: 18, max: 99 }, '17'));          // [ 'rangeUnderflow' ]
console.log(validateField({ required: true, minlength: 4 }, ''));                // [ 'valueMissing' ]`,
      alt: [{ lang: 'ts', code: `type Rules = { required?: boolean; type?: 'text' | 'email' | 'number'; minlength?: number; maxlength?: number; min?: number; max?: number; pattern?: string };
type Flag = 'valueMissing' | 'typeMismatch' | 'tooShort' | 'tooLong' | 'patternMismatch' | 'rangeUnderflow' | 'rangeOverflow';

export function validateField(rules: Rules, value: string): Flag[] {
  const nonEmpty = value !== '';
  const n = Number(value);
  const isNum = rules.type === 'number' && nonEmpty && !Number.isNaN(n);
  const checks: [Flag, boolean][] = [
    ['valueMissing', !!rules.required && !nonEmpty],
    ['typeMismatch', rules.type === 'email' && nonEmpty && !/^[^\\s@]+@[^\\s@]+$/.test(value)],
    ['tooShort', rules.minlength !== undefined && nonEmpty && value.length < rules.minlength],
    ['tooLong', rules.maxlength !== undefined && value.length > rules.maxlength],
    ['patternMismatch', rules.pattern !== undefined && nonEmpty && !new RegExp('^(?:' + rules.pattern + ')$').test(value)],
    ['rangeUnderflow', isNum && rules.min !== undefined && n < rules.min],
    ['rangeOverflow', isNum && rules.max !== undefined && n > rules.max]
  ];
  return checks.filter(([, failed]) => failed).map(([name]) => name);
}` }],
      dry: { head: ['rules', 'value', 'flags that fail', 'result'], rows: [['pattern [0-9]{6}', '12345', 'patternMismatch', '[patternMismatch]'], ['required, minlength 4', '(empty)', 'valueMissing only', '[valueMissing]'], ['number, min 18', '17', 'rangeUnderflow', '[rangeUnderflow]']] },
      complexity: `<p>Time O(L) for a value of length L (regex test and length checks), space O(1) besides the result array. The rules are checked independently so the user gets all errors at once.</p>`,
      followUps: ['How would you add step and a localized message map?', 'What if the pattern string comes from an untrusted source (ReDoS)?']
    }
  }]
});

/* ====================== PRACTICE (Easy → Medium → Hard) ====================== */
practice.push({
  title: 'Escape HTML Special Characters', level: 'Easy', tags: ['entities', 'xss', 'strings'], companies: ['Google', 'Amazon', 'Zoho'],
  statement: `<p>Write <code>escapeHtml(text)</code> that makes any string safe to place <b>inside HTML text or a double/single-quoted attribute</b>. Replace <code>&amp;</code>, <code>&lt;</code>, <code>&gt;</code>, <code>"</code> and <code>'</code> with their entities. Text that already contains entities must be escaped again (so <code>&amp;lt;</code> shows literally as <code>&amp;lt;</code>).</p>`,
  constraints: `0 ≤ text length ≤ 10<sup>5</sup>. Must run in one pass. Do not use the DOM.`,
  example: `<p>Input: <code>&lt;img src=x onerror="alert(1)"&gt;</code> → Output: <code>&amp;lt;img src=x onerror=&amp;quot;alert(1)&amp;quot;&amp;gt;</code>. <i>Why</i>: after escaping, the browser shows the characters as text instead of building an element, so the script never runs.</p>`,
  brute: { why: `<p>Doing one <code>replace</code> per character with the wrong order (for example replacing <code>&lt;</code> first and <code>&amp;</code> last) corrupts the entities you just created: <code>&amp;lt;</code> becomes <code>&amp;amp;lt;</code>. It also scans the string five times and forgets quotes, which breaks attribute values.</p>`, code: `function escapeHtml(s) {
  // BUG: & must be first, and quotes are forgotten
  return s.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;');
}` },
  mcq: { q: 'Which character must be handled so that already-escaped entities are not double-corrupted by a multi-step approach?', options: ['& (ampersand) — escape it first', '< (less than) — escape it first', 'Quotes — escape them first', 'Order does not matter'], answer: 0, explain: 'If you escape < to &lt; first and then escape &, the new &lt; turns into &amp;lt;. A single-pass map avoids order problems entirely.' },
  hints: [
    `<p>Hint 1 (aha): each of the five characters maps to exactly one replacement text, so one pass with a lookup table is enough.</p>`,
    `<p>Hint 2: use <code>String.replace</code> with a regex character class <code>/[&amp;&lt;&gt;"']/g</code> and a function that looks up the match in an object.</p>`,
    `<p>Hint 3: edge cases — empty string, numbers (convert with <code>String(x)</code>), and text that already contains <code>&amp;amp;</code>. Recipe: map = {char → entity}; return String(s).replace(regex, ch =&gt; map[ch]).</p>`
  ],
  solution: {
    approach: `<p>A lookup table plus one global regex replacement. Because every character is replaced exactly once and the replacements are never re-scanned, the order problem disappears.</p>`,
    code: { lang: 'js', run: true, code: `const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(text) {
  // one pass: each match is replaced once and never re-examined
  return String(text).replace(/[&<>"']/g, (ch) => ENTITIES[ch]);
}

console.log(escapeHtml('<img src=x onerror="alert(1)">'));
console.log(escapeHtml("Tom & Jerry's"));
console.log(escapeHtml('&lt;'));      // &amp;lt; (shown literally as &lt;)
console.log(JSON.stringify(escapeHtml('')));` },
    complexity: `<p>Time O(n), space O(n) for the output string. Where it matters: this runs on every user-provided string that is inserted as HTML, so it must be linear.</p>`,
    followUps: ['Is escaping enough inside a script block or a URL attribute?', 'Why is textContent safer than innerHTML?']
  }
});

practice.push({
  title: 'Label Every Input', level: 'Easy', tags: ['forms', 'labels', 'accessibility'], companies: ['Infosys', 'Capgemini', 'TCS'],
  statement: `<p>This login form has no labels and uses placeholders instead. Rewrite it so that each control has a real <code>&lt;label&gt;</code> connected to it, the password and username have correct <code>type</code> and <code>autocomplete</code> values, the "Show password" button does not submit the form, and the form posts to <code>/login</code>.</p>
  <pre>&lt;form&gt;
  &lt;input placeholder="Email"&gt;
  &lt;input placeholder="Password"&gt;
  &lt;button&gt;Show password&lt;/button&gt;
  &lt;button&gt;Log in&lt;/button&gt;
&lt;/form&gt;</pre>`,
  constraints: `Use only HTML. Every input needs name, id and a matching label. Buttons need explicit types.`,
  example: `<p>Before: a screen reader says "edit, blank". After: "Email, edit". And pressing "Show password" (type=button) no longer sends the form. <i>Why</i>: <code>label for</code> gives the control an accessible name, and a button with no type inside a form defaults to submit.</p>`,
  brute: { why: `<p>Adding <code>aria-label</code> everywhere hides the problem from screen readers but sighted users still lose the label as soon as they type, the click area stays small, and browsers cannot autofill reliably.</p>`, code: { lang: 'html', code: `<form>
  <input aria-label="Email" placeholder="Email">
  <input aria-label="Password" placeholder="Password">
  <button>Show password</button>
  <button>Log in</button>
</form>` } },
  mcq: { q: 'A "Show password" button inside a form has no type attribute. What happens when it is clicked?', options: ['It submits the form', 'Nothing, buttons only act with JavaScript', 'It resets the form', 'It validates only'], answer: 0, explain: 'The default type of a button is submit, so always write type="button" for buttons that do not submit.' },
  hints: [
    `<p>Hint 1 (aha): a label and its control are paired by <code>for</code> on the label and a matching <code>id</code> on the input.</p>`,
    `<p>Hint 2: the email field should use <code>type="email"</code> with <code>autocomplete="username"</code> (or email); the password uses <code>type="password"</code> and <code>autocomplete="current-password"</code>.</p>`,
    `<p>Hint 3: finish with names so the data is sent (<code>name="email"</code>, <code>name="password"</code>), <code>type="button"</code> for the toggle and <code>type="submit"</code> for login.</p>`
  ],
  solution: {
    approach: `<p>Wrap each control in a paragraph with a visible label tied by <code>for</code>/<code>id</code>, add the correct types and autofill hints, and make the toggle a plain button.</p>`,
    code: { lang: 'html', code: `<form action="/login" method="post">
  <p>
    <label for="login-email">Email</label>
    <input id="login-email" name="email" type="email" autocomplete="username" required>
  </p>
  <p>
    <label for="login-pw">Password</label>
    <input id="login-pw" name="password" type="password" autocomplete="current-password" required>
    <button type="button" aria-controls="login-pw">Show password</button>
  </p>
  <button type="submit">Log in</button>
</form>` },
    complexity: `<p>No algorithmic cost. Benefits: larger click targets (clicking the label focuses the input), working password-manager autofill and screen-reader names.</p>`,
    followUps: ['How would you toggle visibility accessibly (aria-pressed)?', 'Why not autocomplete="off" on a login form?']
  }
});

practice.push({
  title: 'Navigation Menu with Current Page', level: 'Easy', tags: ['nav', 'lists', 'aria-current', 'semantic'], companies: ['Cognizant', 'HCL', 'Swiggy'],
  statement: `<p>Build the main navigation for a site with the pages Home (<code>/</code>), Blog (<code>/blog</code>), About (<code>/about</code>) and Contact (<code>/contact</code>). The visitor is currently on the <b>Blog</b> page. The markup must be a proper navigation landmark with a name, built from a list of links, must tell assistive technology which page is current, and must start with a skip link that jumps to the element with id <code>content</code>.</p>`,
  constraints: `No div wrappers for the menu. No images. Use aria-current only where needed.`,
  example: `<p>A screen-reader user hears: "Main, navigation" then "list, 4 items", then "Blog, current page, link". <i>Why</i>: <code>nav aria-label</code> names the landmark, <code>ul</code> announces the count and <code>aria-current="page"</code> marks the active link.</p>`,
  brute: { why: `<p>Using <code>&lt;div class="menu"&gt;&lt;a&gt;...</code> with a CSS class for the current page: sighted users see it, but screen readers hear four unrelated links with no landmark or count, and keyboard users must Tab through everything on every page.</p>`, code: { lang: 'html', code: `<div class="menu">
  <a href="/">Home</a> <a href="/blog" class="active">Blog</a>
  <a href="/about">About</a> <a href="/contact">Contact</a>
</div>` } },
  mcq: { q: 'Which attribute tells assistive technology which link is the current page?', options: ['aria-current="page"', 'class="active"', 'tabindex="0"', 'role="link"'], answer: 0, explain: 'A CSS class is invisible to assistive technology; aria-current="page" is announced as "current page".' },
  hints: [
    `<p>Hint 1 (aha): a menu is a list of links inside a navigation landmark: <code>nav &gt; ul &gt; li &gt; a</code>.</p>`,
    `<p>Hint 2: name the landmark with <code>aria-label="Main"</code> (helps when a page has several navs), and add <code>aria-current="page"</code> on the Blog link only.</p>`,
    `<p>Hint 3: the skip link is the very first element in the body: <code>&lt;a href="#content"&gt;</code>; the target element needs <code>id="content"</code> (usually on <code>main</code>).</p>`
  ],
  solution: {
    approach: `<p>Skip link first, then a header containing a labelled nav with a list. Only the current page link gets <code>aria-current</code>; the styling can then hook onto <code>[aria-current="page"]</code>.</p>`,
    code: { lang: 'html', code: `<a class="skip-link" href="#content">Skip to main content</a>
<header>
  <nav aria-label="Main">
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/blog" aria-current="page">Blog</a></li>
      <li><a href="/about">About</a></li>
      <li><a href="/contact">Contact</a></li>
    </ul>
  </nav>
</header>
<main id="content" tabindex="-1">
  <h1>Blog</h1>
</main>` },
    complexity: `<p>No runtime cost. Keyboard users skip 4+ repeated links on every page; screen-reader users can jump straight to the navigation landmark.</p>`,
    followUps: ['How do you style the current page without a class?', 'What changes for a dropdown submenu?']
  }
});

practice.push({
  title: 'Resolve and Classify Links', level: 'Easy', tags: ['urls', 'links', 'new URL'], companies: ['Amazon', 'Flipkart', 'Microsoft'],
  statement: `<p>Given the <b>page URL</b> and a list of <code>href</code> values found on it, return an array of objects <code>{ href, url, external }</code>: <code>url</code> is the absolute URL the browser would request, and <code>external</code> is true when the target is on a different <b>origin</b> (scheme + host + port) than the page. If an href cannot be resolved, return <code>url: null</code> and <code>external: false</code>.</p>`,
  constraints: `1 ≤ hrefs.length ≤ 1000. Use only built-in URL APIs. No network access.`,
  example: `<p>Page <code>https://shop.com/a/b.html</code>. <code>c.html</code> → <code>https://shop.com/a/c.html</code> (internal). <code>../x</code> → <code>https://shop.com/x</code>. <code>//cdn.com/z.js</code> → <code>https://cdn.com/z.js</code> (external). <i>Why</i>: relative links are resolved against the page's folder; a leading <code>//</code> keeps only the scheme.</p>`,
  brute: { why: `<p>Hand-written string concatenation (<code>base + href</code>) cannot handle <code>..</code>, <code>//host</code>, a leading <code>/</code>, query strings or ports, and produces URLs like <code>https://shop.com/a/b.html../x</code>.</p>`, code: `function resolveLinks(base, hrefs) {
  // wrong for "../x", "/y", "//cdn.com/z.js"
  return hrefs.map((h) => ({ href: h, url: h.startsWith('http') ? h : base + h, external: !h.startsWith(base) }));
}` },
  mcq: { q: 'Two URLs are "same origin" when…', options: ['scheme, host and port all match', 'only the host matches', 'the path matches', 'the domain ends the same way'], answer: 0, explain: 'The origin is scheme + host + port; https://a.com and http://a.com are different origins.' },
  hints: [
    `<p>Hint 1 (aha): the platform already implements the exact resolution algorithm: <code>new URL(href, base)</code>.</p>`,
    `<p>Hint 2: the <code>origin</code> property of a URL gives scheme + host + port, so compare it with the page's origin.</p>`,
    `<p>Hint 3: wrap the call in <code>try/catch</code> because invalid hrefs throw. Recipe: parse base once; map each href; catch → {url: null}.</p>`
  ],
  solution: {
    approach: `<p>Parse the base URL once, resolve each href with <code>new URL(href, base)</code>, and compare origins. A <code>mailto:</code> link has origin <code>"null"</code>, so it counts as external.</p>`,
    code: { lang: 'js', run: true, code: `function resolveLinks(pageUrl, hrefs) {
  const page = new URL(pageUrl);
  return hrefs.map((href) => {
    try {
      const url = new URL(href, page);              // browser's own resolution algorithm
      return { href, url: url.href, external: url.origin !== page.origin };
    } catch (err) {
      return { href, url: null, external: false };  // e.g. "http://" cannot be parsed
    }
  });
}

const result = resolveLinks('https://shop.com/a/b.html',
  ['c.html', '../x', '/y?z=1', '//cdn.com/z.js', 'https://other.org/', 'mailto:hi@shop.com', '#top', 'http://']);
result.forEach((r) => console.log(r.href.padEnd(20), '->', String(r.url).padEnd(36), r.external ? 'external' : 'internal'));` },
    complexity: `<p>Time O(total href length). Space O(n) for the result. The built-in parser is far safer than string tricks and matches what the browser does.</p>`,
    followUps: ['How would you add rel="noopener noreferrer" automatically to external links?', 'What about links inside a page with a base href?']
  }
});

practice.push({
  title: 'Check Tag Nesting with a Stack', level: 'Medium', tags: ['stack', 'parsing', 'html'], companies: ['Google', 'Meta', 'Atlassian'],
  statement: `<p>Write <code>checkTags(html)</code> that returns <code>{ ok: true }</code> if all non-void elements are opened and closed in a properly nested way, otherwise <code>{ ok: false, error }</code> with a short message. Rules: tag names are case-insensitive; void elements (<code>br, hr, img, input, meta, link</code> and the other HTML void elements) never need closing; attributes may contain <code>&gt;</code> inside quotes; comments must be ignored. Do not treat a trailing slash as closing a normal element (<code>&lt;div/&gt;</code> still opens a div in HTML).</p>`,
  constraints: `Input length ≤ 10<sup>5</sup> characters. Must be O(n).`,
  example: `<p><code>&lt;p&gt;Hi &lt;b&gt;you&lt;/b&gt;&lt;br&gt;&lt;/p&gt;</code> → ok. <code>&lt;b&gt;&lt;i&gt;x&lt;/b&gt;&lt;/i&gt;</code> → error "expected &lt;/i&gt; but found &lt;/b&gt;". <code>&lt;ul&gt;&lt;li&gt;x</code> → error "never closed: ul, li". <i>Why</i>: the last tag opened must be the first closed — a stack.</p>`,
  brute: { why: `<p>Counting opening and closing tags per name looks right but accepts crossed tags like <code>&lt;b&gt;&lt;i&gt;x&lt;/b&gt;&lt;/i&gt;</code> (one b, one i, both closed) and ignores order.</p>`, code: `function checkTags(html) {
  const count = {};
  for (const m of html.matchAll(/<(\\/?)([a-z0-9]+)[^>]*>/gi)) {
    const name = m[2].toLowerCase();
    count[name] = (count[name] || 0) + (m[1] ? -1 : 1);
  }
  return { ok: Object.values(count).every((n) => n === 0) };   // order is ignored!
}` },
  mcq: { q: 'Why is a stack the natural data structure here?', options: ['The most recently opened element must be the first one closed', 'Stacks are faster than arrays', 'Tags are always sorted', 'We need random access to old tags'], answer: 0, explain: 'Nesting is last-in-first-out: pushing on open and popping on close mirrors it exactly.' },
  hints: [
    `<p>Hint 1 (aha): every end tag must match the element at the top of the stack of currently open elements.</p>`,
    `<p>Hint 2: scan tags with a regex that respects quoted attributes, strip comments first, skip void elements, push on open, pop and compare on close.</p>`,
    `<p>Hint 3: edge cases — end tag with an empty stack ("unexpected"), leftovers at the end ("never closed"), upper-case names, <code>&lt;img alt="a &gt; b"&gt;</code>. Recipe: loop matches; open → push; close → pop &amp; compare.</p>`
  ],
  solution: {
    approach: `<p>Remove comments, iterate tags with a regex that skips quoted attribute values, and use an array as stack. Return the first problem found; at the end, anything left on the stack was never closed.</p>`,
    code: { lang: 'js', run: true, code: `const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

function checkTags(html) {
  const clean = html.replace(/<!--[\\s\\S]*?-->/g, '');
  // <  optional "/"  tag name  attributes (quoted values may contain ">")  >
  const re = /<(\\/?)([a-zA-Z][a-zA-Z0-9-]*)(?:"[^"]*"|'[^']*'|[^>"'])*>/g;
  const stack = [];
  let m;
  while ((m = re.exec(clean)) !== null) {
    const closing = m[1] === '/';
    const name = m[2].toLowerCase();
    if (VOID.has(name)) continue;                       // never pushed, never popped
    if (!closing) { stack.push(name); continue; }
    if (stack.length === 0) return { ok: false, error: 'unexpected </' + name + '>' };
    const expected = stack.pop();
    if (expected !== name) return { ok: false, error: 'expected </' + expected + '> but found </' + name + '>' };
  }
  return stack.length ? { ok: false, error: 'never closed: ' + stack.join(', ') } : { ok: true };
}

console.log(checkTags('<p>Hi <b>you</b><br></p>'));
console.log(checkTags('<b><i>x</b></i>'));
console.log(checkTags('<ul><li>x'));
console.log(checkTags('<img alt="a > b"><!-- <div> --><DIV></DIV>'));
console.log(checkTags('</p>'));` },
    complexity: `<p>Time O(n) — each character is scanned once and each tag is pushed/popped once. Space O(depth) for the stack. Same idea as balanced brackets.</p>`,
    followUps: ['How would you also report the line number?', 'How do real parsers repair mismatches instead of failing?']
  }
});

practice.push({
  title: 'Conference Schedule Table with Spans', level: 'Medium', tags: ['tables', 'rowspan', 'colspan'], companies: ['Atlassian', 'Zoho', 'Salesforce'],
  statement: `<p>Mark up this conference timetable as one accessible table. Columns: Time, Room A, Room B. Rows: <b>09:00</b> "Opening keynote" is shown in both rooms (one wide cell); <b>10:00</b> Room A "Workshop: CSS Grid" lasts <b>two</b> slots (10:00 and 10:30) while Room B has "Talk: Web Vitals" at 10:00 and "Talk: Images" at 10:30; <b>11:00</b> "Lunch" for both rooms. Add a caption, header cells with scope, and keep each row's width consistent.</p>`,
  constraints: `Use thead/tbody, th scope, colspan and rowspan. Each row must add up to 3 columns (counting spans from above).`,
  example: `<p>Row 10:00 has <b>3</b> cells (time, Workshop with rowspan=2, Web Vitals). Row 10:30 has only <b>2</b> cells (time, Images) because the Workshop cell still occupies column 2. ${H.c('g', 'Width = 3 in both rows ✔')}. <i>Why</i>: a rowspan reserves its column in the next row.</p>`,
  brute: { why: `<p>Writing three cells in every row (and putting a duplicate "Workshop" in the 10:30 row) makes a 4-column row that misaligns everything. Merging with empty <code>td</code>s and bold text loses the header meaning for screen readers.</p>`, code: { lang: 'html', code: `<table border="1">
  <tr><td>10:00</td><td>Workshop</td><td>Web Vitals</td></tr>
  <tr><td>10:30</td><td>Workshop</td><td>Images</td></tr>
</table>` } },
  mcq: { q: 'In the 10:30 row, how many cells do you write when Room A uses rowspan="2" from the row above?', options: ['2', '3', '1', '4'], answer: 0, explain: 'The Workshop cell already occupies Room A for 10:30, so only the time and Room B cells are written.' },
  hints: [
    `<p>Hint 1 (aha): draw the 3×5 slot grid first; mark which slots are covered by a span.</p>`,
    `<p>Hint 2: times are row headers (<code>th scope="row"</code>), rooms are column headers (<code>th scope="col"</code>). The keynote and lunch use <code>colspan="2"</code>.</p>`,
    `<p>Hint 3: the workshop is <code>rowspan="2"</code> in the 10:00 row and is simply missing from the 10:30 row. Check every row sums to 3.</p>`
  ],
  solution: {
    approach: `<p>Place cells row by row. Row widths: 09:00 → 1 + 2 (colspan) = 3; 10:00 → 1 + 1 + 1 = 3; 10:30 → 1 + 1 (workshop hangs from above) + 1 = 3; 11:00 → 1 + 2 = 3.</p>`,
    code: { lang: 'html', code: `<table>
  <caption>Conference schedule</caption>
  <thead>
    <tr>
      <th scope="col">Time</th>
      <th scope="col">Room A</th>
      <th scope="col">Room B</th>
    </tr>
  </thead>
  <tbody>
    <tr><th scope="row">09:00</th><td colspan="2">Opening keynote</td></tr>
    <tr><th scope="row">10:00</th><td rowspan="2">Workshop: CSS Grid</td><td>Talk: Web Vitals</td></tr>
    <tr><th scope="row">10:30</th><td>Talk: Images</td></tr>
    <tr><th scope="row">11:00</th><td colspan="2">Lunch</td></tr>
  </tbody>
</table>` },
    complexity: `<p>Table formation is O(cells). A mistake in span counting is the number one cause of misaligned tables, so verifying "each row's slots add to the column count" is the habit to build.</p>`,
    followUps: ['How would you make Lunch visually different but still part of the table?', 'How does a screen reader announce the Workshop cell?']
  }
});

practice.push({
  title: 'Extract Links from HTML', level: 'Medium', tags: ['regex', 'parsing', 'links', 'seo'], companies: ['Google', 'Ahrefs', 'Zoho'],
  statement: `<p>Write <code>extractLinks(html, siteHost)</code> that returns an array of <code>{ href, text, external }</code> for every <code>&lt;a&gt;</code> element that has an <code>href</code> attribute. <code>text</code> is the visible text with inner tags removed and whitespace collapsed. <code>external</code> is true only for absolute <code>http(s)</code> URLs whose host is not <code>siteHost</code>. Handle double quotes, single quotes, unquoted values, upper-case tags/attributes and anchors without href (skip them).</p>`,
  constraints: `HTML length ≤ 10<sup>5</sup>. You may assume well-formed anchors (no nested a). Regex or string scanning is fine.`,
  example: `<p>Input: <code>&lt;a class="n" href="/blog"&gt;Our &lt;b&gt;blog&lt;/b&gt;&lt;/a&gt; &lt;A HREF='https://other.org/x'&gt;Partner&lt;/A&gt; &lt;a name="top"&gt;Top&lt;/a&gt;</code>. Output: <code>[{href:'/blog', text:'Our blog', external:false}, {href:'https://other.org/x', text:'Partner', external:true}]</code>. <i>Why</i>: the third anchor has no href and is skipped.</p>`,
  brute: { why: `<p>A naive <code>split('href="')</code> misses single-quoted and unquoted values, upper-case attributes and the visible text, and breaks on a <code>&gt;</code> inside the text.</p>`, code: `function extractLinks(html) {
  return html.split('href="').slice(1).map((chunk) => ({ href: chunk.split('"')[0] }));
}` },
  mcq: { q: 'Why is a regex only a "good enough" way to read HTML?', options: ['HTML is not a regular language; a real parser handles all edge cases', 'Regexes cannot match angle brackets', 'Regex is always slower', 'HTML has no attributes'], answer: 0, explain: 'Regex works on simple, controlled input. For arbitrary pages use a real parser (DOMParser in the browser, a library such as parse5 or cheerio in Node).' },
  hints: [
    `<p>Hint 1 (aha): one global, case-insensitive regex can capture the attribute value, the inner HTML and move on to the next anchor.</p>`,
    `<p>Hint 2: for the attribute value use alternation: <code>"..."</code> | <code>'...'</code> | unquoted <code>[^\\s&gt;]+</code>. Inner HTML: <code>[\\s\\S]*?</code> up to the closing anchor tag.</p>`,
    `<p>Hint 3: strip tags from the inner HTML with <code>/&lt;[^&gt;]*&gt;/g</code>, collapse spaces, and use <code>new URL(href, base)</code> only to compare hosts. Recipe: matchAll → build object → push.</p>`
  ],
  solution: {
    approach: `<p>One regex finds each anchor with an href in any of the three quoting styles and captures its inner HTML. We clean the text and decide "external" by parsing absolute URLs.</p>`,
    code: { lang: 'js', run: true, code: `function extractLinks(html, siteHost) {
  const re = /<a\\s+[^>]*?href\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))[^>]*>([\\s\\S]*?)<\\/a>/gi;
  const links = [];
  for (const m of html.matchAll(re)) {
    const href = m[1] ?? m[2] ?? m[3];
    const text = m[4].replace(/<[^>]*>/g, '').replace(/\\s+/g, ' ').trim();
    let external = false;
    if (/^https?:\\/\\//i.test(href)) {
      try { external = new URL(href).host !== siteHost; } catch (e) { external = false; }
    }
    links.push({ href, text, external });
  }
  return links;
}

const html = '<a class="n" href="/blog">Our <b>blog</b></a> <A HREF=\\'https://other.org/x\\'>Partner</A> <a name="top">Top</a> <a href=/about>About</a> <a href="https://shop.com/">Home</a>';
console.log(extractLinks(html, 'shop.com'));` },
    complexity: `<p>Time O(n) with a lazy match per anchor (no catastrophic backtracking because the sub-patterns are bounded by <code>&gt;</code>). Space O(k) for k links.</p>`,
    followUps: ['How would you do this in the browser with DOMParser?', 'How would you also skip links inside comments or script text?']
  }
});

practice.push({
  title: 'Serialize a Form Like the Browser', level: 'Medium', tags: ['forms', 'FormData', 'encoding'], companies: ['Amazon', 'Flipkart', 'PhonePe'],
  statement: `<p>Implement <code>serializeForm(controls, submitter)</code>. <code>controls</code> is an array of <code>{ type, name, value, checked, disabled }</code> in document order; <code>submitter</code> is the <code>name</code> of the submit button the user clicked (or <code>undefined</code> if they pressed Enter). Return the <code>application/x-www-form-urlencoded</code> string the browser would send. Rules: skip controls without a name, disabled ones, unchecked checkboxes/radios, <code>button</code>/<code>reset</code> types, and submit buttons other than the clicked one. A checked checkbox/radio with an empty value sends <code>on</code>. Spaces become <code>+</code>.</p>`,
  constraints: `1 ≤ controls ≤ 1000. Keep document order. Repeated names are allowed (checkbox groups).`,
  example: `<p>Controls: text q="blue shoes", checkbox gift="yes" checked, checkbox news="yes", radio size="M" checked, text note="hi" disabled, submit go="Search" (clicked). Output: <code>q=blue+shoes&amp;gift=yes&amp;size=M&amp;go=Search</code>. <i>Why</i>: <code>news</code> is unchecked and <code>note</code> disabled, so neither is sent.</p>`,
  brute: { why: `<p>Joining every control as <code>name=value</code> sends unchecked boxes, disabled fields and all submit buttons, and forgets to encode <code>&amp;</code>, <code>=</code> and spaces — one user typing <code>a&amp;b</code> would inject an extra parameter.</p>`, code: `function serializeForm(controls) {
  return controls.map((c) => c.name + '=' + c.value).join('&');   // sends everything, encodes nothing
}` },
  mcq: { q: 'A user types "a&b=c" in a text field named q. What must the serializer do?', options: ['Percent-encode it so it is sent as q=a%26b%3Dc', 'Send it as is', 'Drop the field', 'Replace & with a space'], answer: 0, explain: 'Reserved characters must be encoded or they would be read as separators and corrupt the parameter list.' },
  hints: [
    `<p>Hint 1 (aha): decide for each control "is it in the entry list?" first, then encode the survivors. Two small steps.</p>`,
    `<p>Hint 2: use <code>URLSearchParams</code> to append pairs — it applies the exact form encoding (space → +, reserved characters escaped).</p>`,
    `<p>Hint 3: edge cases — checkbox without a value attribute (use "on"), submit buttons (only the clicked one), the same name repeated, empty string values (still sent as <code>name=</code>).</p>`
  ],
  solution: {
    approach: `<p>Filter controls with the spec's rules, map each to a [name, value] pair and let <code>URLSearchParams</code> serialize. The filter order does not matter, document order does.</p>`,
    code: { lang: 'js', run: true, code: `function serializeForm(controls, submitter) {
  const params = new URLSearchParams();
  for (const c of controls) {
    if (!c.name || c.disabled) continue;                            // no name / disabled: never sent
    if (c.type === 'button' || c.type === 'reset') continue;        // plain buttons carry no data
    if (c.type === 'submit' && c.name !== submitter) continue;      // only the clicked submit button
    if ((c.type === 'checkbox' || c.type === 'radio')) {
      if (!c.checked) continue;                                     // unchecked: not sent at all
      params.append(c.name, c.value === '' || c.value === undefined ? 'on' : c.value);
      continue;
    }
    params.append(c.name, c.value === undefined ? '' : c.value);
  }
  return params.toString();
}

const controls = [
  { type: 'text', name: 'q', value: 'blue shoes' },
  { type: 'checkbox', name: 'gift', value: 'yes', checked: true },
  { type: 'checkbox', name: 'news', value: 'yes', checked: false },
  { type: 'radio', name: 'size', value: 'M', checked: true },
  { type: 'text', name: 'note', value: 'hi', disabled: true },
  { type: 'text', name: 'tag', value: 'a&b=c' },
  { type: 'submit', name: 'go', value: 'Search' },
  { type: 'submit', name: 'draft', value: 'Save' }
];
console.log(serializeForm(controls, 'go'));
console.log(serializeForm(controls));` },
    complexity: `<p>Time O(n + total value length), space O(output). Using the built-in encoder avoids the classic bug of forgetting to escape special characters.</p>`,
    followUps: ['How would multipart/form-data differ?', 'What about select multiple and file inputs?']
  }
});

practice.push({
  title: 'A Semantic Article Page', level: 'Medium', tags: ['semantic', 'article', 'figure', 'time'], companies: ['Medium', 'The Hindu', 'Adobe'],
  statement: `<p>Mark up a news story page: site header with logo link and navigation; main content with an article that has a title (h1), a byline with the author's name and the publish date (2026-10-15, machine-readable), a hero image with a visible caption, two paragraphs with one quotation attributed to a source, a sub-heading "What happens next" and an unordered list of three bullets; a related-stories aside with its own heading and links; and a footer with the contact email (marked as contact information for the article's owner) and copyright.</p>`,
  constraints: `One h1, one main. Use figure/figcaption, time, blockquote, address, aside. No ARIA roles and no div elements are needed.`,
  example: `<p>The date: <code>&lt;time datetime="2026-10-15"&gt;15 October 2026&lt;/time&gt;</code> shows human text but gives machines an ISO date. The contact: <code>&lt;address&gt;</code> inside the footer. <i>Why</i>: each element names the thing, so assistive tech and search engines understand the page without CSS.</p>`,
  brute: { why: `<p>All-div markup with classes (<code>.title</code>, <code>.date</code>, <code>.caption</code>) looks identical after styling but exposes no headings, landmarks, date or caption relationships to anything that does not run your CSS.</p>`, code: { lang: 'html', code: `<div class="page">
  <div class="title">Metro opens new line</div>
  <div class="by">By Asha, 15 Oct 2026</div>
  <img src="metro.jpg">
  <div class="cap">The new line opens.</div>
</div>` } },
  mcq: { q: 'Which element connects an image with its visible caption?', options: ['figure with figcaption', 'div with class caption', 'p right after img', 'img with title'], answer: 0, explain: 'figure groups self-contained media and figcaption provides its caption in a way the accessibility tree understands.' },
  hints: [
    `<p>Hint 1 (aha): start with the landmarks — header, main, aside inside main or beside it, footer — then fill them.</p>`,
    `<p>Hint 2: inside <code>article</code>: <code>h1</code>, a <code>p</code> byline with <code>time datetime</code>, <code>figure &gt; img + figcaption</code>, <code>blockquote</code> with <code>cite</code> or a <code>footer/cite</code> for the source.</p>`,
    `<p>Hint 3: use <code>h2</code> for "What happens next" and the aside's heading; give the image meaningful <code>alt</code> plus width/height; the footer holds <code>address</code> with a mailto link.</p>`
  ],
  solution: {
    approach: `<p>Landmarks first, then content in reading order. Meaning is carried by the element names, so no roles or div wrappers are needed.</p>`,
    code: { lang: 'html', code: `<header>
  <a href="/" class="logo">City Times</a>
  <nav aria-label="Main"><ul><li><a href="/news">News</a></li><li><a href="/sport">Sport</a></li></ul></nav>
</header>
<main>
  <article>
    <h1>Metro opens new line across the city</h1>
    <p>By <strong>Asha Rao</strong> · <time datetime="2026-10-15">15 October 2026</time></p>
    <figure>
      <img src="metro.jpg" alt="Passengers boarding the first train at Central station" width="1200" height="675">
      <figcaption>The first train leaves Central station on Thursday morning.</figcaption>
    </figure>
    <p>Thousands of commuters rode the new line on opening day, cutting some trips by half an hour.</p>
    <blockquote cite="https://city.example/mayor-statement">
      <p>This line gives every neighbourhood a faster way to work.</p>
      <footer>— <cite>Mayor Rao</cite></footer>
    </blockquote>
    <h2>What happens next</h2>
    <ul>
      <li>Two more stations open in spring.</li>
      <li>Fares are reviewed in January.</li>
      <li>Night service starts next month.</li>
    </ul>
  </article>
  <aside>
    <h2>Related stories</h2>
    <ul><li><a href="/news/bus-routes">Bus routes redrawn</a></li><li><a href="/news/fares">What fares will cost</a></li></ul>
  </aside>
</main>
<footer>
  <address>Contact the newsroom: <a href="mailto:news@citytimes.example">news@citytimes.example</a></address>
  <small>© 2026 City Times</small>
</footer>` },
    complexity: `<p>No runtime cost. The page exposes headings, landmarks, a caption relationship, a machine-readable date and a quotation source — all things search engines and screen readers use directly.</p>`,
    followUps: ['Where would JSON-LD NewsArticle data go?', 'When would the footer inside the article become a plain generic element?']
  }
});

practice.push({
  title: 'Build a Heading Outline Tree', level: 'Medium', tags: ['stack', 'headings', 'tree'], companies: ['Amazon', 'Notion', 'Atlassian'],
  statement: `<p>Given the headings of a page in order as <code>[{ level, text }]</code> (levels 1–6), build a nested outline (like a table of contents). Each node is <code>{ level, text, children }</code>. A heading becomes a child of the nearest previous heading with a <b>smaller</b> level; if there is none it is a top-level node. Headings may skip levels (h2 followed by h4) — the h4 simply becomes a child of that h2. Return the array of top-level nodes.</p>`,
  constraints: `1 ≤ headings ≤ 10<sup>4</sup>. Levels are integers 1–6. Must be O(n).`,
  example: `<p>[h1 Shop, h2 Tea, h3 Green, h3 Black, h2 Coffee, h4 Beans] → Shop(Tea(Green, Black), Coffee(Beans)). <i>Why</i>: Beans (h4) follows Coffee (h2), the nearest smaller level, even though h3 was skipped.</p>`,
  brute: { why: `<p>For each heading, scanning backwards through all previous headings to find a parent is O(n²) on long pages, and easy to get wrong when levels are skipped.</p>`, code: `function buildOutline(headings) {
  const nodes = headings.map((h) => ({ ...h, children: [] }));
  const top = [];
  nodes.forEach((n, i) => {
    let p = null;
    for (let j = i - 1; j >= 0; j--) if (nodes[j].level < n.level) { p = nodes[j]; break; }  // O(n) scan each time
    (p ? p.children : top).push(n);
  });
  return top;
}` },
  mcq: { q: 'When a new heading arrives, which headings should be popped off the stack of "open" headings?', options: ['Those with level greater than or equal to the new one', 'Those with level smaller than the new one', 'None', 'Only the top one'], answer: 0, explain: 'A heading of the same or deeper level is finished; the new heading is a sibling or ancestor-level item.' },
  hints: [
    `<p>Hint 1 (aha): the path from the root to the current heading is exactly a stack with strictly increasing levels.</p>`,
    `<p>Hint 2: use a virtual root with level 0. For each heading pop while the stack top has level ≥ the new level; the new top is the parent.</p>`,
    `<p>Hint 3: push the new node on the stack so later headings can attach under it. Each node is pushed and popped once → O(n).</p>`
  ],
  solution: {
    approach: `<p>Keep a stack of the current ancestor chain. Pop everything at the same or deeper level, attach the node to the remaining top, push the node.</p>`,
    code: { lang: 'js', run: true, code: `function buildOutline(headings) {
  const root = { level: 0, text: 'ROOT', children: [] };   // virtual parent for top-level headings
  const stack = [root];
  for (const h of headings) {
    while (stack[stack.length - 1].level >= h.level) stack.pop();   // finished sections
    const node = { level: h.level, text: h.text, children: [] };
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  return root.children;
}

function show(nodes, indent = '') {
  for (const n of nodes) { console.log(indent + 'h' + n.level + ' ' + n.text); show(n.children, indent + '  '); }
}
show(buildOutline([
  { level: 1, text: 'Shop' }, { level: 2, text: 'Tea' }, { level: 3, text: 'Green' }, { level: 3, text: 'Black' },
  { level: 2, text: 'Coffee' }, { level: 4, text: 'Beans' }
]));` },
    complexity: `<p>Time O(n): every heading is pushed once and popped at most once. Space O(depth) for the stack plus O(n) for the output tree.</p>`,
    followUps: ['How would you flag skipped levels while building?', 'How would you render the outline as a nested ul for a table of contents?']
  }
});

practice.push({
  title: 'Mini HTML Parser to a DOM Tree', level: 'Hard', tags: ['parsing', 'stack', 'dom', 'error recovery'], companies: ['Google', 'Meta', 'Microsoft'],
  statement: `<p>Write <code>parseHtml(html)</code> that returns the top-level nodes of a simple DOM tree: elements are <code>{ tag, children }</code>, text nodes are <code>{ text }</code>. Implement the browser-like recovery rules: tag names are lower-cased; comments are skipped; whitespace-only text is dropped and other text is trimmed; <b>void elements</b> (<code>br, hr, img, input, meta, link</code> ...) never get children; an end tag closes the nearest matching open element and automatically closes anything still open inside it; an end tag with no matching open element is ignored; a new <code>li</code> closes an open <code>li</code>; a block element (<code>p, div, ul, ol, h1–h6, table, ...</code>) closes an open <code>p</code>. At the end everything still open is closed implicitly.</p>`,
  constraints: `Input ≤ 10<sup>5</sup> characters. Attributes can be ignored but quoted values may contain &gt;. O(n) time.`,
  example: `<p><code>&lt;ul&gt;&lt;li&gt;Tea&lt;li&gt;Milk&lt;/ul&gt;&lt;p&gt;Hi&lt;div&gt;x&lt;/div&gt;&lt;/br&gt;</code> → <code>ul[li[Tea], li[Milk]], p[Hi], div[x]</code>. <i>Why</i>: the second <code>li</code> closes the first, <code>&lt;/ul&gt;</code> closes the open li too, <code>div</code> closes the open p, and the stray <code>&lt;/br&gt;</code> is ignored.</p>`,
  brute: { why: `<p>Recursive descent that demands perfect nesting throws on the first mismatch and cannot handle the common cases real pages contain: optional end tags (<code>li</code>, <code>p</code>), stray end tags and void elements.</p>`, code: `function parseStrict(tokens, i = 0) {
  const children = [];
  while (i < tokens.length) {
    const t = tokens[i++];
    if (t.close) return [children, i];
    const [kids, next] = parseStrict(tokens, i);       // assumes every element is closed
    children.push({ tag: t.name, children: kids });
    i = next;
  }
  return [children, i];
}` },
  mcq: { q: 'An end tag &lt;/b&gt; arrives while the open stack is [div, p, b, i]. What should the parser do?', options: ['Close i and b (pop down to b)', 'Throw an error', 'Ignore the tag', 'Close only the top element i'], answer: 0, explain: 'The nearest matching open element is b; everything above it (i) is auto-closed, which mirrors how browsers repair mis-nesting.' },
  hints: [
    `<p>Hint 1 (aha): a stack of open elements is all the state you need; the root is a virtual fragment node at the bottom.</p>`,
    `<p>Hint 2: tokenize with one regex that matches comments, tags (respecting quotes) and text. For a start tag: apply the implied-close rules, append to the stack top, push if not void. For an end tag: search the stack downward for the name.</p>`,
    `<p>Hint 3: if the search reaches the bottom (the virtual root) the end tag is stray: ignore it. Otherwise truncate the stack to the found index. Void end tags like <code>&lt;/br&gt;</code> are also ignored.</p>`
  ],
  solution: {
    approach: `<p>Single pass with a stack. Start tags append to the current parent (after the li/p implied-close checks); end tags truncate the stack to the matched element or are ignored; text is trimmed and appended. Trailing open elements need no work because they were already attached to their parents.</p>`,
    code: { lang: 'js', run: true, code: `const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const BLOCK = new Set(['p', 'div', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'section', 'article', 'header',
  'footer', 'nav', 'main', 'aside', 'pre', 'blockquote', 'form', 'fieldset', 'hr']);

function parseHtml(html) {
  const root = { tag: '#fragment', children: [] };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  // comment | tag (quoted attribute values may contain ">") | text | a lone "<"
  const re = /<!--[\\s\\S]*?-->|<(\\/?)([a-zA-Z][a-zA-Z0-9-]*)(?:"[^"]*"|'[^']*'|[^>"'])*>|[^<]+|</g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = m[0];
    if (raw.startsWith('<!--')) continue;
    if (m[2]) {
      const name = m[2].toLowerCase();
      if (m[1] === '/') {
        let i = stack.length - 1;
        while (i > 0 && stack[i].tag !== name) i--;      // nearest matching open element
        if (i > 0 && !VOID.has(name)) stack.length = i;  // closes it AND anything still open above it
        continue;                                        // no match: stray end tag, ignore
      }
      if (name === 'li' && top().tag === 'li') stack.pop();           // implied </li>
      if (top().tag === 'p' && BLOCK.has(name)) stack.pop();          // a p cannot contain blocks
      const node = { tag: name, children: [] };
      top().children.push(node);
      if (!VOID.has(name)) stack.push(node);
    } else if (raw !== '<') {
      const text = raw.replace(/\\s+/g, ' ').trim();
      if (text) top().children.push({ text });
    }
  }
  return root.children;
}

console.log(JSON.stringify(parseHtml('<ul><li>Tea<li>Milk</ul><p>Hi<div>x</div></br>')));
console.log(JSON.stringify(parseHtml('<b><i>x</b>y<br>z<!-- hi --><img alt="a > b">')));` },
    complexity: `<p>Time O(n): each token is handled once; the end-tag search walks the stack but each element is removed at most once, so the total work stays linear overall. Space O(depth + n).</p>`,
    followUps: ['How would you implement the adoption-agency algorithm for b/i crossings?', 'How would you add tbody insertion and html/head/body creation?']
  }
});

practice.push({
  title: 'Cross-Field Form Validator', level: 'Hard', tags: ['validation', 'forms', 'schema'], companies: ['Stripe', 'Razorpay', 'Atlassian'],
  statement: `<p>Implement <code>validateForm(schema, data)</code>. <code>schema</code> maps field names to rules: <code>required</code>, <code>requiredIf: { field, value }</code> (required only when another field has that value), <code>type</code> ('email'), <code>minlength</code>, <code>pattern</code> (whole-match), <code>equalTo</code> (name of another field that must have the same value, e.g. password confirmation). Return an object <code>{ fieldName: [messages...] }</code> containing <b>only fields with problems</b> (so <code>{}</code> means valid). Values are trimmed before checking except for <code>equalTo</code>, which compares the raw strings. An empty, optional field skips every rule. A missing required field reports only the required message.</p>`,
  constraints: `≤ 200 fields. Messages: "Required", "Not a valid email", "Must be at least N characters", "Wrong format", "Must match &lt;other field&gt;".`,
  example: `<p>Schema: password{required,minlength 8}, confirm{equalTo 'password'}, company{requiredIf role='employee'}. Data: password 'abc', confirm 'abd', role 'employee', company ''. Result: <code>{ password:['Must be at least 8 characters'], confirm:['Must match password'], company:['Required'] }</code>. <i>Why</i>: each rule is checked independently, and company becomes required because of role.</p>`,
  brute: { why: `<p>Validating inside each field's change handler in the UI scatters the rules, cannot express relationships (confirm vs password, conditional required) and cannot be reused on the server where the same checks must run again.</p>`, code: `function validateForm(schema, data) {
  const errors = {};
  for (const field in schema) {
    if (schema[field].required && !data[field]) errors[field] = ['Required'];   // no trimming, no other rules
  }
  return errors;
}` },
  mcq: { q: 'Why should the same schema also run on the server?', options: ['Clients can bypass or edit browser checks', 'Servers are faster at regex', 'Browsers cannot validate email', 'To make the form look nicer'], answer: 0, explain: 'Client-side validation is a convenience. Any request can be crafted by hand, so the server must enforce the rules again.' },
  hints: [
    `<p>Hint 1 (aha): treat each field as a small pipeline: normalise the value, decide if it is required, then run the other rules only if it is non-empty.</p>`,
    `<p>Hint 2: compute <code>isRequired</code> as <code>rules.required || (rules.requiredIf &amp;&amp; data[rules.requiredIf.field] === rules.requiredIf.value)</code>.</p>`,
    `<p>Hint 3: collect messages in an array per field and only attach the field to the result if the array is non-empty. Remember <code>equalTo</code> compares untrimmed raw values.</p>`
  ],
  solution: {
    approach: `<p>Loop through the schema, normalise (<code>String(x ?? '').trim()</code>), apply required/requiredIf, and if non-empty apply type, minlength, pattern and equalTo, pushing messages into an array that only exists in the output when non-empty.</p>`,
    code: { lang: 'js', run: true, code: `function validateForm(schema, data) {
  const errors = {};
  for (const [field, rules] of Object.entries(schema)) {
    const raw = String(data[field] ?? '');
    const value = raw.trim();
    const messages = [];

    const needed = !!rules.required ||
      (rules.requiredIf && String(data[rules.requiredIf.field] ?? '') === rules.requiredIf.value);

    if (value === '') {
      if (needed) messages.push('Required');       // required & empty: only this message
    } else {
      if (rules.type === 'email' && !/^[^\\s@]+@[^\\s@]+$/.test(value)) messages.push('Not a valid email');
      if (rules.minlength != null && value.length < rules.minlength) messages.push('Must be at least ' + rules.minlength + ' characters');
      if (rules.pattern && !new RegExp('^(?:' + rules.pattern + ')$').test(value)) messages.push('Wrong format');
      if (rules.equalTo && raw !== String(data[rules.equalTo] ?? '')) messages.push('Must match ' + rules.equalTo);
    }
    if (messages.length) errors[field] = messages;
  }
  return errors;
}

const schema = {
  email: { required: true, type: 'email' },
  password: { required: true, minlength: 8 },
  confirm: { equalTo: 'password' },
  role: {},
  company: { requiredIf: { field: 'role', value: 'employee' } },
  pin: { pattern: '[0-9]{6}' }
};
console.log(validateForm(schema, { email: 'asha@x', password: 'abc', confirm: 'abd', role: 'employee', company: '', pin: '12345' }));
console.log(validateForm(schema, { email: 'asha@x.com', password: 'longenough', confirm: 'longenough', role: 'student' }));` },
    complexity: `<p>Time O(F + total value length) for F fields (regex tests are linear for these simple patterns). Space O(number of messages). Sharing this schema between client and server prevents the rules from drifting apart.</p>`,
    followUps: ['How would you localise the messages?', 'How would you make it async to check "username already taken"?']
  }
});

practice.push({
  title: 'Accessible Error State After Server Validation', level: 'Hard', tags: ['forms', 'accessibility', 'aria', 'validation'], companies: ['Microsoft', 'Salesforce', 'Gov.uk'],
  statement: `<p>The server rejected a registration form with two errors: the email <code>asha@</code> is not valid and the "I accept the terms" box was not ticked. Write the HTML the server should send back so that the page is fully accessible: an <b>error summary</b> at the top that receives focus and links to each invalid field; per-field messages linked with <code>aria-describedby</code>; <code>aria-invalid</code> on bad fields; the typed values kept; a <code>fieldset/legend</code> around the "Date of birth" group (day, month, year); correct <code>autocomplete</code> tokens; and a tiny script that moves focus to the summary on load. Colour must not be the only signal.</p>`,
  constraints: `Plain HTML + a few lines of JS. Summary must be a role="alert" region or be focused programmatically. Each summary link targets a field id.`,
  example: `<p>Screen-reader flow: page loads → focus lands on "There is a problem" → user hears "Enter a valid email address, link" → activates it → focus jumps to the email field, which reads "Email, invalid entry, Enter a valid email address". <i>Why</i>: summary + aria-describedby + aria-invalid together tell the user what, where and how to fix it.</p>`,
  brute: { why: `<p>The typical result is a red border and a small red sentence under a field. Screen-reader users hear nothing when the page reloads, colour-blind users see only a subtle shade change, and nothing links the message to the input.</p>`, code: { lang: 'html', code: `<input name="email" value="asha@" style="border: 1px solid red">
<span style="color: red">Invalid</span>` } },
  mcq: { q: 'What does aria-describedby on an input do?', options: ['Links the input to extra text (like an error) that the screen reader reads after its name', 'Replaces the label', 'Validates the input', 'Hides the error visually'], answer: 0, explain: 'It references the id of another element whose text becomes the input\'s accessible description.' },
  hints: [
    `<p>Hint 1 (aha): three links must exist for each error — summary item → field (an href to the id), field → message (aria-describedby), field state (aria-invalid).</p>`,
    `<p>Hint 2: the summary is a container with <code>tabindex="-1"</code> and a heading; your script calls <code>.focus()</code> on it. Messages should start with a visually obvious word such as "Error:" so colour is not the only cue.</p>`,
    `<p>Hint 3: the date group uses <code>fieldset</code> + <code>legend</code> and three labelled number inputs with <code>autocomplete="bday-day"</code>, <code>bday-month</code>, <code>bday-year</code>. The terms checkbox gets its own message and aria-describedby.</p>`
  ],
  solution: {
    approach: `<p>Render an error summary first, then each field with its label, its error message (id) and the matching aria attributes. Keep the submitted values. The script only manages focus; everything else is plain HTML.</p>`,
    code: { lang: 'html', code: `<div id="error-summary" tabindex="-1" role="alert">
  <h2>There is a problem</h2>
  <ul>
    <li><a href="#email">Enter a valid email address</a></li>
    <li><a href="#terms">You must accept the terms to continue</a></li>
  </ul>
</div>

<form action="/register" method="post" novalidate>
  <p>
    <label for="email">Email</label>
    <span id="email-err" class="error"><strong>Error:</strong> Enter an email like name@example.com</span>
    <input id="email" name="email" type="email" value="asha@" autocomplete="email"
           aria-invalid="true" aria-describedby="email-err">
  </p>

  <fieldset>
    <legend>Date of birth</legend>
    <label for="dob-d">Day</label>
    <input id="dob-d" name="dob_day" inputmode="numeric" maxlength="2" value="14" autocomplete="bday-day">
    <label for="dob-m">Month</label>
    <input id="dob-m" name="dob_month" inputmode="numeric" maxlength="2" value="3" autocomplete="bday-month">
    <label for="dob-y">Year</label>
    <input id="dob-y" name="dob_year" inputmode="numeric" maxlength="4" value="1999" autocomplete="bday-year">
  </fieldset>

  <p>
    <span id="terms-err" class="error"><strong>Error:</strong> Tick the box to accept the terms</span>
    <label><input id="terms" type="checkbox" name="terms" value="yes" aria-invalid="true" aria-describedby="terms-err"> I accept the terms</label>
  </p>
  <button type="submit">Create account</button>
</form>

<script>
  // move focus to the summary so assistive technology announces it
  document.getElementById('error-summary').focus();
<\/script>` },
    complexity: `<p>No algorithmic cost; the value is predictable assistive-technology behaviour. The server rendering the errors means it also works when JavaScript fails.</p>`,
    followUps: ['How would you do inline validation on blur without annoying users?', 'Why keep the summary even when each field also shows its message?']
  }
});

practice.push({
  title: 'Table Slot Grid with Span Conflicts', level: 'Hard', tags: ['tables', 'grid', 'simulation'], companies: ['Google', 'Microsoft', 'Atlassian'],
  statement: `<p>Implement <code>tableGrid(rows)</code> that simulates the HTML table formation algorithm. <code>rows</code> is an array of rows; each row is an array of cells <code>{ text, colspan?, rowspan? }</code> (defaults 1). Place each cell in the first free slot of its row (skipping slots already occupied by a rowspan from above). Return <code>{ grid, width, height, errors }</code> where <code>grid[r][c]</code> is the text covering that slot (<code>null</code> for an empty slot), and <code>errors</code> lists human-readable problems: <code>overlap at row R, col C</code> when two cells claim a slot, <code>hole at row R, col C</code> when a slot stays empty, and <code>rowspan extends past the last row</code> (rows are 1-based in messages).</p>`,
  constraints: `≤ 50 rows, ≤ 50 cells per row, spans ≤ 50. Time O(slots).`,
  example: `<p>rows = [[{text:'A', rowspan:2}, {text:'B', colspan:2}], [{text:'C'}, {text:'D'}]] → grid [[A,B,B],[A,C,D]], width 3, height 2, no errors. <i>Why</i>: A hangs down so row 2's first free slot is column 2.</p>`,
  brute: { why: `<p>Assuming cell i of a row sits in column i ignores rowspans entirely: row 2's "C" would be placed in column 1 on top of A's slot.</p>`, code: `function tableGrid(rows) {
  return rows.map((cells) => cells.map((c) => c.text));   // column index = position in the row: wrong with spans
}` },
  mcq: { q: 'Row 1 has cells: A(rowspan=2), B(colspan=2). Row 2 has 2 cells. In which columns do they land?', options: ['Columns 2 and 3', 'Columns 1 and 2', 'Columns 1 and 3', 'Columns 3 and 4'], answer: 0, explain: 'Column 1 of row 2 is occupied by A, so the first free slot is column 2, and the next cell takes column 3.' },
  hints: [
    `<p>Hint 1 (aha): keep a 2D array of slots. A cell's column is "the first undefined slot at or after the current column in this row".</p>`,
    `<p>Hint 2: after finding the column, fill a rectangle rowspan × colspan; if a slot is already filled record an overlap instead of overwriting.</p>`,
    `<p>Hint 3: width is the largest end column seen; height is the number of rows in the grid (it can exceed the declared rows if a rowspan runs past the end). Finally scan every slot for holes.</p>`
  ],
  solution: {
    approach: `<p>Simulate the spec: a moving column pointer per row plus a slot grid. Placing a cell writes a rectangle; afterwards compare dimensions and find holes. Rows may need to be created on demand because a rowspan can create rows below.</p>`,
    code: { lang: 'js', run: true, code: `function tableGrid(rows) {
  const slots = [];              // slots[r][c] = text or undefined
  const errors = [];
  let width = 0;

  rows.forEach((cells, r) => {
    let c = 0;
    for (const cell of cells) {
      const cs = cell.colspan || 1, rs = cell.rowspan || 1;
      while (slots[r] && slots[r][c] !== undefined) c++;           // skip slots taken from above
      for (let dr = 0; dr < rs; dr++) {
        for (let dc = 0; dc < cs; dc++) {
          const rr = r + dr, cc = c + dc;
          if (!slots[rr]) slots[rr] = [];
          if (slots[rr][cc] !== undefined) errors.push('overlap at row ' + (rr + 1) + ', col ' + (cc + 1));
          else slots[rr][cc] = cell.text;
        }
      }
      c += cs;
      width = Math.max(width, c);
    }
  });

  const height = slots.length;
  if (height > rows.length) errors.push('rowspan extends past the last row');
  const grid = [];
  for (let r = 0; r < height; r++) {
    grid.push([]);
    for (let c = 0; c < width; c++) {
      const v = slots[r] && slots[r][c] !== undefined ? slots[r][c] : null;
      if (v === null) errors.push('hole at row ' + (r + 1) + ', col ' + (c + 1));
      grid[r].push(v);
    }
  }
  return { grid, width, height, errors };
}

console.log(JSON.stringify(tableGrid([[{ text: 'A', rowspan: 2 }, { text: 'B', colspan: 2 }], [{ text: 'C' }, { text: 'D' }]])));
console.log(JSON.stringify(tableGrid([[{ text: 'A' }, { text: 'B' }], [{ text: 'C' }]])));
console.log(JSON.stringify(tableGrid([[{ text: 'A', rowspan: 2 }, { text: 'B' }], [{ text: 'X', colspan: 2 }]])));` },
    complexity: `<p>Time O(S) where S is the total number of slots (sum of colspan×rowspan plus the final scan), space O(S). This is the same algorithm browsers use, so it explains every "why is my table misaligned?" bug.</p>`,
    followUps: ['How would you clip rowspan to the end of its thead/tbody row group?', 'How would you generate the HTML back from the grid?']
  }
});

/* ====================== QUIZ ====================== */
quiz.push({ q: 'What is the main job of <code>&lt;!doctype html&gt;</code>?', options: ['It tells the browser to use standards mode instead of quirks mode', 'It loads the HTML5 libraries', 'It sets the character encoding', 'It makes the page responsive on phones'], answer: 0, explain: 'The doctype only chooses the rendering mode. Encoding is meta charset and responsiveness is the viewport meta tag.' });
quiz.push({ q: 'The parser meets <code>&lt;p&gt;One&lt;p&gt;Two</code> with no end tags. What DOM does it build?', options: ['Two sibling paragraphs', 'A paragraph nested inside a paragraph', 'An error page', 'One paragraph with text "OneTwo"'], answer: 0, explain: 'A p cannot contain another p, so the second start tag closes the first. The parser repairs rather than fails.' });
quiz.push({ q: 'Which of these is a void element (no end tag, no children)?', options: ['<code>&lt;div&gt;</code>', '<code>&lt;span&gt;</code>', '<code>&lt;img&gt;</code>', '<code>&lt;li&gt;</code>'], answer: 2, explain: 'img, br, hr, input, meta and link are void elements. Writing a closing tag for them is invalid.' });
quiz.push({ q: 'You need a clickable control that adds an item to a cart on the same page. Which element is the right choice?', options: ['<code>&lt;a href="#"&gt;</code>', '<code>&lt;div onclick&gt;</code>', '<code>&lt;button type="button"&gt;</code>', '<code>&lt;span role="link"&gt;</code>'], answer: 2, explain: 'Actions that do not navigate are buttons: focusable, activated by Enter and Space, announced as "button".' });
quiz.push({ q: 'How many <code>&lt;h1&gt;</code> and visible <code>&lt;main&gt;</code> elements should a normal page have?', options: ['Exactly one of each', 'One h1 but as many main elements as needed', 'As many of each as sections', 'Zero h1; use h2 only'], answer: 0, explain: 'One h1 gives the page its main title and one main marks the unique central content. Extra mains confuse landmark navigation.' });
quiz.push({ q: 'A page at <code>https://a.com/x/y/page.html</code> contains <code>&lt;img src="../logo.png"&gt;</code>. Which URL is requested?', options: ['https://a.com/x/logo.png', 'https://a.com/logo.png', 'https://a.com/x/y/logo.png', 'https://a.com/x/y/page.html/logo.png'], answer: 0, explain: 'The base folder is /x/y/. ".." goes up one folder to /x/, so the file is /x/logo.png.' });
quiz.push({ q: 'What should the alt attribute be for a purely decorative swirl image?', options: ['alt="swirl"', 'No alt attribute at all', 'alt="" (empty)', 'alt="image"'], answer: 2, explain: 'Empty alt tells assistive technology to skip the image. A missing alt may cause the file name to be read out.' });
quiz.push({ q: 'Which attribute pair makes the browser reserve space for an image before it loads and so prevents layout shift?', options: ['width and height', 'alt and title', 'loading and decoding', 'srcset and sizes'], answer: 0, explain: 'With width and height the browser computes the aspect ratio early. loading and srcset affect download, not the reserved space.' });
quiz.push({ q: 'A form has a checkbox <code>name="news" value="yes"</code> that is NOT checked. What does the submitted data contain for it?', options: ['news=no', 'news=', 'news=off', 'Nothing at all'], answer: 3, explain: 'Unchecked checkboxes and radios are omitted from the form data entirely; the server must treat "missing" as false.' });
quiz.push({ q: 'Why does a "Show password" button inside a form sometimes submit the form?', options: ['Its type defaults to submit', 'Buttons always submit', 'The input is required', 'The form has method=post'], answer: 0, explain: 'A button without a type attribute is a submit button inside a form. Add type="button" for buttons that only run JavaScript.' });
quiz.push({ q: 'In a table, a cell with <code>rowspan="2"</code> is written in row 1. How does that change row 2?', options: ['Row 2 needs one fewer cell, because the slot is already taken', 'Row 2 must repeat the same cell', 'Nothing changes', 'Row 2 is deleted'], answer: 0, explain: 'The spanned cell occupies a slot in the next row, so the next row writes fewer cells to keep the same total width.' });
quiz.push({ q: 'Which attribute best helps a screen-reader user understand that a header cell describes a whole column?', options: ['<code>scope="col"</code> on the th', '<code>class="header"</code>', '<code>border="1"</code>', '<code>width="100"</code>'], answer: 0, explain: 'th with scope tells assistive technology which cells it labels. Classes and borders are only visual.' });
quiz.push({ q: 'For a script that needs the full DOM and should not block parsing, which loading attribute is the best default?', options: ['<code>defer</code>', '<code>async</code>', 'None, put it in the head', '<code>blocking</code>'], answer: 0, explain: 'defer downloads in parallel and runs after parsing, in order. async runs as soon as it arrives, in any order.' });
quiz.push({ q: 'You have two URLs that show the same page (with and without tracking parameters). Which head tag helps search engines?', options: ['<code>&lt;link rel="canonical"&gt;</code>', '<code>&lt;meta name="keywords"&gt;</code>', '<code>&lt;meta charset&gt;</code>', '<code>&lt;link rel="icon"&gt;</code>'], answer: 0, explain: 'The canonical link names the preferred URL so duplicate URLs are combined into one result.' });
quiz.push({ q: 'An input has <code>pattern="[0-9]{6}"</code> and the user types <code>1234567</code>. What does the browser report?', options: ['patternMismatch — the whole value must match', 'valid — six digits appear inside', 'tooLong', 'typeMismatch'], answer: 0, explain: 'The pattern is implicitly anchored as ^(?:pattern)$, so seven digits do not match exactly six.' });
quiz.push({ q: 'You call <code>input.setCustomValidity("Passwords differ")</code> and later the passwords match. What must you do?', options: ['Call setCustomValidity("") to clear it', 'Nothing, it clears itself', 'Reload the page', 'Remove the required attribute'], answer: 0, explain: 'A non-empty custom message keeps the field invalid until you reset it to the empty string.' });
quiz.push({ q: 'Which statement about browser form validation is true?', options: ['It improves user experience but the server must validate again', 'It makes server validation unnecessary', 'It cannot be bypassed', 'It works only with JavaScript'], answer: 0, explain: 'Anyone can edit the DOM or send raw requests, so client checks are a convenience, not a security measure.' });

/* ====================== INTERVIEW ====================== */
interview.push({
  q: 'What happens, step by step, when the browser receives an HTML file? How does it become what I see?', level: 'B',
  a: `<p>The browser reads the bytes, decodes them to text using the charset, then the <b>tokenizer</b> turns the text into tokens (start tags, end tags, text, comments). The <b>tree builder</b> uses a stack of open elements to turn tokens into the <b>DOM tree</b>, repairing errors like missing html/head/body or unclosed li. In parallel the preload scanner starts downloading CSS, images and scripts. CSS becomes the CSSOM; DOM + CSSOM combine into a render tree; the browser then does layout (size and position) and paint/composite to pixels. Scripts without <code>defer/async</code> pause the parser.</p><p>A good answer names: bytes → characters → tokens → DOM, and mentions that the DOM, not the source text, is what JavaScript and CSS see.</p>`,
  followUps: ['What is the difference between "View source" and the Elements panel?', 'Which things block rendering?']
});
interview.push({
  q: 'Why use semantic HTML instead of divs and spans? Give concrete examples.', level: 'B',
  a: `<p>Semantic elements carry <b>meaning and behaviour for free</b>. <code>nav</code>, <code>main</code>, <code>header</code> become landmarks that screen-reader users jump between; <code>h1–h6</code> create an outline; <code>button</code> is focusable and responds to Enter and Space; <code>label</code> enlarges the click area; <code>time</code> gives machines a date. Search engines use the same hints to find the main content, and the code is easier for teammates to read. Rebuilding this with divs needs ARIA roles, tabindex and key handlers — more code and more bugs. The "first rule of ARIA": use a native element if one exists.</p>`,
  followUps: ['When is a div the right choice?', 'What does the accessibility tree contain?']
});
interview.push({
  q: 'Explain the difference between <code>&lt;section&gt;</code>, <code>&lt;article&gt;</code>, <code>&lt;aside&gt;</code> and <code>&lt;div&gt;</code>.', level: 'B',
  a: `<p><b>article</b>: self-contained content that could stand alone or be syndicated (blog post, news story, product card, comment). <b>section</b>: a thematic grouping of content, normally with its own heading (a chapter of a page); without a name it is just a generic. <b>aside</b>: content tangentially related to its surroundings (sidebar, related links, pull quote) and exposed as the "complementary" landmark. <b>div</b>: no meaning at all, a styling/scripting hook used when no other element fits. A quick test: if you can name the thing with a heading, it is probably a section or article; if you are only grouping for layout, use a div.</p>`,
  followUps: ['Can articles be nested?', 'What landmark roles do header and footer get inside an article?']
});
interview.push({
  q: 'Difference between <code>&lt;b&gt;</code> and <code>&lt;strong&gt;</code>, and between <code>&lt;i&gt;</code> and <code>&lt;em&gt;</code>? Do they look different?', level: 'B',
  a: `<p>By default b and strong are both bold and i and em are both italic, so they look the same, but the <b>meaning</b> differs. <code>strong</code> means strong importance or seriousness; <code>em</code> means stress emphasis that can change a sentence's meaning ("I <em>love</em> chai" vs "<em>I</em> love chai"). <code>b</code> and <code>i</code> are purely presentational conventions (a keyword, a product name, a foreign phrase, a thought) with no extra importance. Assistive technology may announce strong/em differently, and CSS can restyle all of them. Rule: if removing the styling would lose meaning, use strong/em.</p>`,
  followUps: ['Is <code>&lt;u&gt;</code> still valid?', 'How would you bold text with no semantic meaning?']
});
interview.push({
  q: 'What is the difference between <code>defer</code>, <code>async</code> and a normal <code>&lt;script&gt;</code>? When do you use each?', level: 'I',
  a: `<p>A <b>normal</b> script blocks the HTML parser: it pauses, downloads, runs, then parsing resumes. <b><code>async</code></b> downloads in parallel and runs as soon as it arrives, pausing the parser at that moment; order between async scripts is not guaranteed, so it is for independent code like analytics. <b><code>defer</code></b> downloads in parallel and runs <b>after</b> the document is parsed, in the order the tags appear, before <code>DOMContentLoaded</code>; it is the best default for application code that needs the DOM. <code>type="module"</code> scripts are deferred by default. Put scripts at the end of the body only for legacy reasons; defer in the head also lets the preload scanner start early.</p>`,
  followUps: ['What happens with inline scripts?', 'What is the effect on LCP and INP?']
});
interview.push({
  q: 'How do relative URLs work? What is the difference between <code>./a</code>, <code>../a</code>, <code>/a</code> and <code>//a.com/a</code>?', level: 'B',
  a: `<p>A relative URL is resolved against the <b>base URL</b> (the page's URL, or <code>&lt;base href&gt;</code>). <code>a</code> and <code>./a</code> mean "in the current folder"; <code>../a</code> means "in the parent folder"; <code>/a</code> is <b>root-relative</b> (same scheme and host, start from the site root); <code>//a.com/a</code> is <b>protocol-relative</b> (keep the current scheme, different host — rarely needed now that everything is https). In code, <code>new URL(href, base)</code> performs exactly the browser's algorithm. Root-relative links are robust when pages move between folders, while path-relative links make a folder portable.</p>`,
  followUps: ['What does a fragment-only href like "#faq" do?', 'What goes wrong when you deploy the site under /app/ instead of /?']
});
interview.push({
  q: 'How do you make an image responsive and fast? Explain srcset, sizes and the picture element.', level: 'I',
  a: `<p>Provide several files and let the browser pick. <code>srcset="a-400.jpg 400w, a-800.jpg 800w"</code> lists the files with their real widths; <code>sizes="(max-width: 600px) 100vw, 50vw"</code> says how wide the image will be on screen (needed because CSS is not known yet). The browser multiplies the slot width by the device pixel ratio and picks the smallest sufficient file. <code>&lt;picture&gt;</code> with <code>&lt;source type&gt;</code> offers new formats (AVIF, WebP) with a JPEG fallback, and <code>media</code> allows art direction (different crops). Always add <code>width</code> and <code>height</code> (no layout shift), meaningful <code>alt</code>, <code>loading="lazy"</code> for below-the-fold images and <code>fetchpriority="high"</code> for the LCP image.</p>`,
  followUps: ['Why not lazy-load the hero image?', 'How do pixel density descriptors (2x) differ from width descriptors (w)?']
});
interview.push({
  q: 'What is the difference between GET and POST in a form? Which would you use for search, login and file upload?', level: 'B',
  a: `<p><b>GET</b> puts the name=value pairs in the URL query string: it is bookmarkable, cacheable and safe to repeat, but visible in history and logs and limited in size. Use it for <b>search</b> and filters. <b>POST</b> puts the data in the request body: it is for actions that change state, is not cached by default and has no practical size limit. Use it for <b>login</b> (never send credentials in a URL) and orders. A <b>file upload</b> needs POST with <code>enctype="multipart/form-data"</code>. Neither is secret without HTTPS, and state-changing POSTs need CSRF protection.</p>`,
  followUps: ['What are idempotent and safe methods?', 'What does enctype urlencoded vs multipart change?']
});
interview.push({
  q: 'A checkbox value is missing from the data my server receives. List the possible reasons.', level: 'I',
  a: `<p>Check these in order: (1) the checkbox is <b>unchecked</b> — unchecked checkboxes are never submitted, so the server must treat a missing key as false; (2) it has <b>no <code>name</code></b> attribute; (3) it is <b>disabled</b> (disabled controls are skipped); (4) it sits <b>outside the form</b> element without a matching <code>form="id"</code> attribute; (5) JavaScript builds the request body by hand and forgets the field; (6) the value attribute is empty and the framework drops it (the default is "on"). A common trick is to add a hidden input with the same name and value "false" before the checkbox if you need an explicit false.</p>`,
  followUps: ['How does FormData treat unchecked boxes?', 'What happens with many checkboxes sharing a name?']
});
interview.push({
  q: 'How would you make a form accessible? Walk me through the checklist.', level: 'I',
  a: `<p>(1) Every control has a visible <code>&lt;label&gt;</code> linked by for/id (placeholder is not a label). (2) Group related controls with <code>fieldset</code> + <code>legend</code> (radio groups, date parts). (3) Correct <code>type</code>, <code>autocomplete</code> tokens and <code>inputmode</code> so keyboards and autofill work. (4) Mark required fields in text and with <code>required</code>/<code>aria-required</code>. (5) Errors: specific messages next to the field, linked by <code>aria-describedby</code>, <code>aria-invalid="true"</code>, an error summary that receives focus after a failed submit, and not colour only. (6) Full keyboard operation with a visible focus ring. (7) Buttons with explicit types and clear names. (8) Test with a keyboard and a screen reader and run an automated checker (axe, Lighthouse).</p>`,
  followUps: ['What is wrong with using placeholder as a label?', 'How would you announce a dynamic error with a live region?']
});
interview.push({
  q: 'Explain client-side vs server-side validation. Is HTML5 validation enough?', level: 'I',
  a: `<p>Client-side validation (HTML attributes like required/pattern/type plus JS) gives instant feedback and reduces useless requests, but it is only a <b>user-experience feature</b>: anyone can disable it in DevTools or call the endpoint directly with curl. <b>Server-side validation is mandatory</b> for correctness and security — check type, length, range, allowed values, ownership and business rules, escape output (XSS), use parameterised queries (SQL injection), and return clear errors (HTTP 400/422 with field messages). Best practice: define one schema (Zod, Joi, JSON Schema) shared by both sides so rules never drift apart.</p>`,
  followUps: ['What about validating uniqueness (username taken)?', 'How would you protect against bots submitting valid-looking data?']
});
interview.push({
  q: 'Walk me through how colspan and rowspan work. Why do my table rows end up misaligned?', level: 'I',
  a: `<p>Think of the table as a grid of slots. The browser processes row by row; each cell goes into the <b>first free slot</b> of its row and then marks <code>colspan × rowspan</code> slots as occupied. A cell with <code>rowspan="2"</code> therefore occupies a slot in the next row, so the next row must contain <b>one fewer</b> cell. Misalignment almost always comes from (a) repeating a cell that is already covered by a rowspan, (b) rows whose cell widths do not add up to the same total, or (c) overlapping spans. Fix it by drawing the grid and checking each row's width equals the column count.</p>`,
  followUps: ['What does the table model do on overlap?', 'How would you make a very wide table work on phones?']
});
interview.push({
  q: 'What belongs in the head, and which meta tags matter for SEO and sharing?', level: 'B',
  a: `<p>The head holds metadata and resources: <code>meta charset</code> (first), <code>meta viewport</code> (responsive layout), <code>title</code> (tab and search headline — unique per page, ~30–60 characters), <code>meta description</code> (search snippet, ~70–160 characters), <code>link rel="canonical"</code> (preferred URL), <code>meta robots</code> (index or not), icons, stylesheets and deferred scripts. For link previews add Open Graph tags (<code>og:title, og:description, og:image, og:url</code>) and <code>twitter:card</code>; for rich results add JSON-LD structured data. The keywords meta is ignored by Google. Important: Open Graph and the main content should be in the server-sent HTML because many crawlers do not run JavaScript.</p>`,
  followUps: ['What is the difference between noindex in meta and Disallow in robots.txt?', 'How would you test the social preview?']
});
interview.push({
  q: 'Why does a single-page app sometimes rank badly in search, and what would you do?', level: 'A',
  a: `<p>If the HTML the server sends is an empty shell (<code>&lt;div id="root"&gt;&lt;/div&gt;</code>) and all content is created by JavaScript, crawlers must render the page, which is slower, queued and less reliable, and many other crawlers (social previews, some AI bots) do not run JavaScript at all. Titles, descriptions and Open Graph tags that are injected on the client are missed. Solutions: <b>server-side rendering</b> or <b>static generation</b> (Next.js, Nuxt, Astro) so meaningful HTML is in the first response, unique titles/meta per route, real links (<code>&lt;a href&gt;</code>, not click handlers), clean URLs, a sitemap, fast Core Web Vitals, and correct status codes (a real 404, not a 200 "not found" screen).</p>`,
  followUps: ['What is dynamic rendering and why is it discouraged?', 'How do you verify what Googlebot sees?']
});
interview.push({
  q: 'What does the browser do with invalid HTML? Why does it not just show an error like a compiler?', level: 'I',
  a: `<p>The HTML spec defines a precise <b>error-recovery algorithm</b> for every possible input, so every compliant browser builds the same DOM: it inserts missing html/head/body, auto-closes li/p/td when a sibling starts, ignores stray end tags, moves misplaced table content, and repairs crossed formatting tags with the adoption-agency algorithm. The web was born permissive (early authors were not programmers), and strictness (XHTML) failed because one typo would blank an entire page. Consequence: invalid HTML still "works", so use a validator or linter to catch mistakes, and inspect the <b>DOM in DevTools</b>, not the source, to see what really happened.</p>`,
  followUps: ['Give an example where the DOM differs from the source.', 'Why does table > tr never match in CSS?']
});

/* ====================== ASSEMBLE ====================== */
// Vary the position of the correct option in "What would you do?" checks (rotate options deterministically).
function rotateMcq(p, k) {
  var q = p && p.mcq;
  if (!q || !q.options || q.options.length < 2) return;
  var n = q.options.length, s = k % n;
  if (!s) return;
  q.options = q.options.slice(s).concat(q.options.slice(0, s));
  q.answer = (q.answer - s + n) % n;
}
var allProblems = [];
topics.forEach(function (t) { (t.problems || []).forEach(function (p) { allProblems.push(p); }); });
practice.forEach(function (p) { allProblems.push(p); });
allProblems.forEach(function (p, i) { rotateMcq(p, (i * 2 + 1) % 4); });

registerModule({
  id: 'fe02',
  title: 'HTML Fundamentals',
  intro: `<p>HTML is the skeleton of every web page, and almost every frontend interview starts with it — usually with "simple" questions that hide deep ideas: what does the parser really do, why does semantic HTML matter, how does a form decide what to send, why is my table misaligned, what must a page's head contain? In this module you will learn HTML the way a browser sees it: as <b>text that becomes a tree</b>. You will watch the parser build a DOM with a stack, place table cells in a grid, serialize a form, resolve URLs, and run the browser's validation checks step by step.</p>
  <p>You will practise with realistic interview questions — fix a broken document, convert div soup into semantic markup, build responsive images, write accessible forms and tables, craft SEO-ready head tags, and write small JavaScript helpers (tag checker, mini parser, form serializer, validator). Everything builds toward the next modules: CSS, the DOM and events, accessibility and React.</p>`,
  goals: [
    'Explain how the browser turns HTML text into a DOM tree, including auto-closed tags, void elements and implied html/head/body',
    'Choose semantic elements (landmarks, headings, button vs link, lists, figure, time) and justify them for accessibility and SEO',
    'Write correct links, relative URLs, responsive images (srcset, sizes, picture), video with captions and safe external links',
    'Build accessible forms: labels, input types, fieldsets, autocomplete, GET vs POST, and predict exactly which fields are submitted',
    'Mark up data tables with caption, thead/tbody, th scope, colspan and rowspan without misalignment',
    'Write a complete head with charset, viewport, title, description, canonical and Open Graph tags, and load scripts with defer or async',
    'Apply built-in constraint validation, custom validity, accessible error messages and know why the server must validate again'
  ],
  prereqs: `Module 1 (How the Web Works): browsers, URLs and the HTTP request/response cycle. A text editor and a browser with DevTools are all you need. Basic JavaScript (variables, functions, arrays, regex) helps for the code problems but is not required for the markup ones.`,
  hours: 10,
  topics: topics,
  practice: practice,
  quiz: quiz,
  interview: interview
});
})();
