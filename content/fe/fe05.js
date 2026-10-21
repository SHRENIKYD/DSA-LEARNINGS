(function () {
var topics = [], practice = [], quiz = [], interview = [];
// small snippet helpers so every code block carries an explicit language
function cs(code, title) { return { lang: 'css', code: code, title: title }; }
function hm(code, title) { return { lang: 'html', code: code, title: title }; }
function jr(code, title) { return { lang: 'js', code: code, title: title, run: true }; }
function jc(code, title) { return { lang: 'js', code: code, title: title }; }

/* =====================================================================
   TOPIC 1 - FLEXBOX IN DEPTH
   ===================================================================== */
topics.push({
  title: 'Flexbox in Depth: Axes, Alignment, grow / shrink / basis',
  analogy: `<p>Picture a <b>bench</b> in a park with a few friends sitting on it. The bench is the <b>flex container</b>; each friend is a <b>flex item</b>. Every friend has a <i>preferred seat width</i> (<code>flex-basis</code>). If the bench has spare room, you decide who gets to spread out (<code>flex-grow</code>). If too many friends squeeze in, you decide who gets squashed first (<code>flex-shrink</code>). <code>justify-content</code> decides where the group sits on the bench, and <code>align-items</code> decides whether they sit at the top, middle or bottom of a tall bench.</p>`,
  explain: `<p>🟢 <b>The big idea.</b> Flexbox lays out items in <b>one line at a time</b> (a row or a column) and shares out the space on that line. Write <code>display: flex</code> on the parent and its direct children become flex items. Everything else follows from two <b>axes</b>:</p>
  <ul>
    <li><b>Main axis</b> - the direction items flow. Row by default (left to right). <code>justify-content</code> works along it.</li>
    <li><b>Cross axis</b> - at right angles to the main axis. <code>align-items</code> works along it.</li>
  </ul>
  <p>If you set <code>flex-direction: column</code>, the two axes swap: the main axis is now vertical, so <code>justify-content</code> now moves things up and down. This swap is the #1 reason people get confused.</p>
  ${H.table(['Property', 'Axis', 'What it does'], [
    ['<code>justify-content</code>', 'main', 'Where the whole group of items sits and how leftover space is spread (<code>flex-start</code>, <code>center</code>, <code>space-between</code>, <code>space-around</code>, <code>space-evenly</code>)'],
    ['<code>align-items</code>', 'cross', 'How each item lines up inside the line (<code>stretch</code> is the default, also <code>center</code>, <code>flex-start</code>, <code>baseline</code>)'],
    ['<code>align-content</code>', 'cross', 'Only when there are several wrapped lines: how the lines are spread out'],
    ['<code>align-self</code>', 'cross', 'One item overrides the container\'s <code>align-items</code>'],
    ['<code>gap</code>', 'both', 'Space between items, with no margin hacks and no space at the edges']
  ])}
  <p>🔵 <b>The three sizing knobs.</b> Each item has three numbers, usually written together as <code>flex: grow shrink basis</code>:</p>
  ${H.table(['Knob', 'Default', 'Plain meaning'], [
    ['<code>flex-basis</code>', '<code>auto</code>', 'The starting width (main size) before any sharing happens. <code>auto</code> means "look at my <code>width</code>, or my content".'],
    ['<code>flex-grow</code>', '0', 'My share of the <b>spare</b> space if the line has room. 0 means "I never grow".'],
    ['<code>flex-shrink</code>', '1', 'How eagerly I give up space if the line is <b>too full</b>. 0 means "never squash me".']
  ])}
  <p><b>Growing.</b> Free space = container width - sum of all bases. Each growing item gets <code>free x (its grow / sum of all grow)</code> added to its basis. Example: container 700px, three items with basis 200px and grow 1, 2, 0. Free = 700 - 600 = 100px. The grow total is 3, so the first gets 100 x 1/3 = 33.33px, the second gets 66.67px, the third gets 0. Final widths: <b>233.33 / 266.67 / 200</b>.</p>
  ${H.arr([233.33, 266.67, 200], { label: 'final widths (px)', hl: { 0: 'g', 1: 'g', 2: 'm' } })}
  <p><b>Shrinking.</b> Shrinking is <i>weighted by the basis</i>, so big items give up more pixels than small ones. Each item's weight is <code>shrink x basis</code>; the overflow is shared in proportion to those weights. Example: container 200px, items with basis 300px and 100px, both shrink 1. Overflow = 400 - 200 = 200px. Weights are 300 and 100, so the shares are 150px and 50px. Final widths: <b>150 / 50</b>.</p>
  <p><b>Shorthands you will use daily:</b> <code>flex: 1</code> means <code>1 1 0%</code> (share all the room equally, ignore content size). <code>flex: auto</code> is <code>1 1 auto</code> (start from content size, then share leftovers). <code>flex: none</code> is <code>0 0 auto</code> (rigid, exactly my size).</p>
  <p><b>Two more handy tools.</b> <code>margin-left: auto</code> on an item eats all the free space on its left (the classic "logo left, links right" navbar). <code>flex-wrap: wrap</code> lets items drop onto new lines instead of shrinking forever.</p>`,
  clues: [
    '"Centre this vertically and horizontally" - think <code>display:flex; justify-content:center; align-items:center</code>',
    '"Sidebar fixed width, content takes the rest" - <code>flex: 0 0 240px</code> + <code>flex: 1</code>',
    '"Footer / button must stick to the bottom of a card" - column flex + <code>margin-top: auto</code>',
    '"Items must be equal width no matter their content" - <code>flex: 1 1 0</code> (basis 0, not auto)',
    '"Long text makes the flex child overflow its parent" - <code>min-width: 0</code> fix',
    '"Space between logo and links" / "push one item to the far end" - <code>margin-left: auto</code>',
    '"Compute the final widths" - free space, grow factors, scaled shrink factors'
  ],
  code: [
    cs(`/* The three everyday flex recipes */
.row {
  display: flex;
  gap: 16px;                 /* space between items, none at the edges */
  align-items: center;       /* cross axis (vertical for a row) */
  justify-content: space-between; /* main axis (horizontal for a row) */
}

/* Fixed sidebar + fluid content */
.sidebar { flex: 0 0 240px; }  /* grow 0, shrink 0, basis 240px: rigid */
.content { flex: 1; min-width: 0; } /* take everything left; min-width:0 lets long text shrink */

/* Equal-width columns, ignoring content size */
.cols > * { flex: 1 1 0; }     /* basis 0 => every item starts equal */`, 'Everyday flexbox recipes'),
    jr(`// Flexbox main-size resolver for ONE line (no wrap). Mirrors the browser's
// "resolve flexible lengths" loop: distribute, clamp, freeze, repeat.
function flexResolve(container, items) {
  const size = items.map(it => it.basis);
  const frozen = items.map(() => false);
  for (let round = 0; round <= items.length; round++) {
    // free space = container - (frozen sizes + unfrozen bases)
    let used = 0;
    items.forEach((it, i) => { used += frozen[i] ? size[i] : it.basis; });
    const free = container - used;
    const growing = free > 0;
    // items that cannot move in this direction are frozen at their basis
    items.forEach((it, i) => {
      if (!frozen[i] && (free === 0 || (growing && it.grow === 0) || (!growing && it.shrink === 0))) {
        frozen[i] = true; size[i] = it.basis;
      }
    });
    const live = [];
    items.forEach((it, i) => { if (!frozen[i]) live.push(i); });
    if (live.length === 0) break;
    let total;
    if (growing) {
      total = live.reduce((s, i) => s + items[i].grow, 0);
      // if the grow factors add up to less than 1, only that fraction of the space is handed out
      const handOut = free * Math.min(total, 1);
      live.forEach(i => { size[i] = items[i].basis + handOut * items[i].grow / total; });
    } else {
      // shrink is weighted by basis: scaled shrink factor = shrink * basis
      total = live.reduce((s, i) => s + items[i].shrink * items[i].basis, 0);
      if (total === 0) { live.forEach(i => { frozen[i] = true; size[i] = items[i].basis; }); break; }
      live.forEach(i => { size[i] = items[i].basis + free * (items[i].shrink * items[i].basis) / total; });
    }
    // nothing can be narrower than 0: clamp, freeze, and run another round
    let clamped = false;
    live.forEach(i => { if (size[i] < 0) { size[i] = 0; frozen[i] = true; clamped = true; } });
    if (!clamped) break;
  }
  return size;
}

const fmt = a => a.map(x => +x.toFixed(2));
console.log('grow  :', fmt(flexResolve(700, [
  { basis: 200, grow: 1, shrink: 1 }, { basis: 200, grow: 2, shrink: 1 }, { basis: 200, grow: 0, shrink: 1 }])));
console.log('shrink:', fmt(flexResolve(200, [
  { basis: 300, grow: 0, shrink: 1 }, { basis: 100, grow: 0, shrink: 1 }])));
console.log('flex:1 (basis 0):', fmt(flexResolve(600, [
  { basis: 0, grow: 1, shrink: 1 }, { basis: 0, grow: 1, shrink: 1 }, { basis: 0, grow: 1, shrink: 1 }])));
console.log('half grow factor:', fmt(flexResolve(500, [
  { basis: 100, grow: 0.5, shrink: 1 }, { basis: 100, grow: 0, shrink: 1 }])));`, 'Runnable: flex grow / shrink calculator')
  ],
  codeTitle: ['Everyday flexbox recipes', 'Runnable: flex grow / shrink calculator'],
  viz: [
    {
      title: 'Flex items growing and shrinking (free-space maths)',
      input: '700; 200/1/1, 200/2/1, 200/0/1',
      inputLabel: 'container width; basis/grow/shrink per item (comma separated, up to 6)',
      gen: function (input) {
        var bad = 'Format: "700; 200/1/1, 200/2/1" = container width; basis/grow/shrink for each item';
        var parts = String(input).split(';');
        var W = Number(parts[0]);
        if (!(W > 0) || W > 3000 || parts.length < 2) throw new Error(bad);
        var items = String(parts[1]).split(',').map(function (t) {
          var n = t.trim().split('/').map(Number);
          return { b: n[0], g: n.length > 1 ? n[1] : 0, s: n.length > 2 ? n[2] : 1 };
        });
        if (items.length < 1 || items.length > 6 || items.some(function (it) { return isNaN(it.b) || isNaN(it.g) || isNaN(it.s) || it.b < 0 || it.g < 0 || it.s < 0; })) throw new Error(bad);
        var names = items.map(function (_, i) { return 'item ' + (i + 1); });
        var bases = items.map(function (it) { return it.b; });
        var sumB = bases.reduce(function (a, b) { return a + b; }, 0);
        var free = W - sumB;
        var frames = [];
        var r2 = function (x) { return Math.round(x * 100) / 100; };
        frames.push({ narr: 'The container is <b>' + W + 'px</b> wide. Each item starts at its <b>flex-basis</b> (its wish). Bars show those starting widths.', parts: [
          { type: 'bars', label: 'flex-basis of each item (px)', values: bases, texts: bases.map(function (b) { return b + 'px'; }), idxLabels: names },
          { type: 'vars', vals: { container: W + 'px', 'sum of bases': sumB + 'px' } }
        ] });
        frames.push({ narr: 'Free space = container - sum of bases = ' + W + ' - ' + sumB + ' = <b>' + free + 'px</b>. ' + (free > 0 ? '<span class="c-g">Positive: there is room, so flex-grow decides who takes it.</span>' : free < 0 ? '<span class="c-r">Negative: the items overflow, so flex-shrink decides who gives up space.</span>' : 'Exactly zero: nothing to share, every item keeps its basis.'), parts: [
          { type: 'bars', label: 'flex-basis (px)', values: bases, texts: bases.map(function (b) { return b + 'px'; }), idxLabels: names, hl: bases.reduce(function (h, _, i) { h[i] = free < 0 ? 'bad' : 'win'; return h; }, {}) },
          { type: 'vars', vals: { 'free space': free + 'px' }, hl: { 'free space': free < 0 ? 'bad' : free > 0 ? 'ok' : 'cur' } }
        ] });
        // resolve with the freeze loop (min size 0)
        var size = bases.slice(), frozen = items.map(function () { return false; }), notes = [];
        for (var round = 0; round <= items.length; round++) {
          var used = 0;
          items.forEach(function (it, i) { used += frozen[i] ? size[i] : it.b; });
          var fr = W - used, growing = fr > 0;
          items.forEach(function (it, i) {
            if (!frozen[i] && (fr === 0 || (growing && it.g === 0) || (!growing && it.s === 0))) { frozen[i] = true; size[i] = it.b; }
          });
          var live = [];
          items.forEach(function (it, i) { if (!frozen[i]) live.push(i); });
          if (!live.length) break;
          var total = 0;
          if (growing) {
            live.forEach(function (i) { total += items[i].g; });
            var hand = fr * Math.min(total, 1);
            live.forEach(function (i) { size[i] = items[i].b + hand * items[i].g / total; });
            notes.push('Growing: ' + r2(hand) + 'px handed out over total grow ' + r2(total));
          } else {
            live.forEach(function (i) { total += items[i].s * items[i].b; });
            if (total === 0) { live.forEach(function (i) { frozen[i] = true; }); break; }
            live.forEach(function (i) { size[i] = items[i].b + fr * (items[i].s * items[i].b) / total; });
            notes.push('Shrinking: ' + r2(-fr) + 'px of overflow shared by scaled factors (shrink x basis), total ' + r2(total));
          }
          var clamped = false;
          live.forEach(function (i) { if (size[i] < 0) { size[i] = 0; frozen[i] = true; clamped = true; } });
          if (!clamped) break;
          notes.push('An item hit 0px, so it was frozen and the loop ran again.');
        }
        if (free === 0) notes.push('Free space is 0, nothing moves.');
        if (free > 0 && notes.length === 0) notes.push('No item has flex-grow above 0, so the spare space stays empty at the end of the line.');
        // share table
        var rows = items.map(function (it, i) {
          var weight = free < 0 ? r2(it.s * it.b) : it.g;
          return [names[i], it.b, it.g, it.s, weight, r2(size[i] - it.b >= 0 ? size[i] - it.b : size[i] - it.b)];
        });
        frames.push({ narr: free >= 0 ? 'Each growing item gets <code>free x grow / sum(grow)</code>. Items with grow 0 stay at their basis.' : 'Each item loses <code>overflow x (shrink x basis) / sum(shrink x basis)</code>. Big items lose more pixels.', parts: [
          { type: 'table', label: free >= 0 ? 'Grow weights' : 'Scaled shrink weights (shrink x basis)', columns: ['item', 'basis', 'grow', 'shrink', 'weight', 'change (px)'], rows: rows },
          { type: 'text', html: notes.map(function (n) { return '&bull; ' + n; }).join('<br>') }
        ] });
        var hl = {};
        size.forEach(function (s, i) { hl[i] = s > bases[i] ? 'ok' : s < bases[i] ? 'bad' : 'done'; });
        frames.push({ narr: 'Final widths: green items grew, red items shrank, faded items stayed put.', parts: [
          { type: 'bars', label: 'final width (px)', values: size.map(r2), texts: size.map(function (s) { return r2(s) + 'px'; }), idxLabels: names, hl: hl },
          { type: 'vars', vals: { 'sum of finals': r2(size.reduce(function (a, b) { return a + b; }, 0)) + 'px', container: W + 'px' } }
        ] });
        frames.push({ narr: 'Check: finals add up to the container whenever something could move. If every item is rigid (grow 0 / shrink 0), the line simply overflows or leaves a gap.', parts: [
          { type: 'bars', label: 'basis vs final (px)', values: bases.concat(size.map(r2)), idxLabels: names.map(function (n) { return n + ' basis'; }).concat(names.map(function (n) { return n + ' final'; })) }
        ] });
        return frames;
      }
    },
    {
      title: 'justify-content on the main axis (12 cells wide)',
      input: '2 3 2',
      inputLabel: 'Item widths in cells (container is 12 cells wide)',
      gen: function (input) {
        var w = String(input).trim().split(/[\s,]+/).map(Number);
        if (!w.length || w.length > 5 || w.some(function (x) { return !(x >= 1) || x !== Math.floor(x); })) throw new Error('Enter 1 to 5 whole numbers, e.g. "2 3 2"');
        var sum = w.reduce(function (a, b) { return a + b; }, 0);
        if (sum > 12) throw new Error('Total width must be 12 cells or less');
        var free = 12 - sum, n = w.length;
        var letters = 'ABCDE';
        var modes = ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'];
        var frames = [];
        var hlCls = ['ok', 'win', 'sel', 'cur', 'bad'];
        frames.push({ narr: 'The container is 12 cells wide and the items take ' + sum + ' cells, so <b>' + free + ' cells are free</b>. <code>justify-content</code> decides where that free space goes. (Positions are rounded to whole cells here.)', parts: [
          { type: 'grid', label: 'before layout', rows: [new Array(12).fill('')], colHead: '123456789012'.split('').map(function (_, i) { return String(i + 1); }), rowHead: [''] },
          { type: 'vars', vals: { 'item widths': w.join(' + '), 'free cells': free } }
        ] });
        modes.forEach(function (m) {
          var gaps; // [before first, between each, after last]
          if (m === 'flex-start') gaps = [0, 0, free];
          else if (m === 'flex-end') gaps = [free, 0, 0];
          else if (m === 'center') gaps = [free / 2, 0, free / 2];
          else if (m === 'space-between') gaps = [0, n > 1 ? free / (n - 1) : 0, n > 1 ? 0 : free];
          else if (m === 'space-around') gaps = [free / n / 2, free / n, free / n / 2];
          else gaps = [free / (n + 1), free / (n + 1), free / (n + 1)];
          if (m === 'space-between' && n === 1) gaps = [0, 0, free];
          var row = new Array(12).fill(''), hl = {}, pos = gaps[0];
          for (var i = 0; i < n; i++) {
            var start = Math.round(pos);
            for (var c = 0; c < w[i] && start + c < 12; c++) { row[start + c] = letters[i]; hl['0,' + (start + c)] = hlCls[i]; }
            pos += w[i] + gaps[1];
          }
          var why = { 'flex-start': 'All free space goes after the last item.', 'flex-end': 'All free space goes before the first item.', 'center': 'Free space is split into two equal halves, one on each end.', 'space-between': 'Free space goes only between items; the first and last touch the edges.', 'space-around': 'Every item gets an equal half-gap on both sides, so edge gaps are half the size of inner gaps.', 'space-evenly': 'All gaps, including the two edge gaps, are exactly equal.' };
          frames.push({ narr: '<code>justify-content: ' + m + '</code> - ' + why[m], parts: [
            { type: 'grid', label: m, rows: [row], colHead: '123456789012'.split('').map(function (_, i) { return String(i + 1); }), rowHead: [''], hl: hl }
          ] });
        });
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Worked example: items grow in proportion (700px container)', html: `<p>Three items, <code>flex: 1 1 200px</code>, <code>flex: 2 1 200px</code>, <code>flex: 0 1 200px</code> inside a 700px container.</p>
      ${H.table(['Step', 'Number'], [['Sum of bases', '200 + 200 + 200 = 600'], ['Free space', '700 - 600 = <b>100px</b>'], ['Sum of grow', '1 + 2 + 0 = 3'], ['Item 1 gets', '100 x 1/3 = +33.33 -> <b>233.33px</b>'], ['Item 2 gets', '100 x 2/3 = +66.67 -> <b>266.67px</b>'], ['Item 3 gets', '0 -> <b>200px</b>']])}
      <p>Notice the 2 means "twice the <i>share of free space</i>", NOT "twice as wide". Item 2 ends up only 14% wider than item 1 because the shared pool is small.</p>` },
    { title: 'Worked example: flex: 1 vs flex: auto (why columns look uneven)', html: `<p>Container 600px with two items: one has a 100px logo, one has 300px of text. With <code>flex: 1</code> (basis <b>0</b>), free space is 600px and it is split 300 / 300 - equal columns. With <code>flex: auto</code> (basis <b>auto</b> = content size 100 and 300), free space is 600 - 400 = 200px, split 100 / 100, so you get <b>200px and 400px</b>.</p>
      <p>Rule of thumb: want <b>equal columns</b>? use <code>flex: 1</code> (or <code>1 1 0</code>). Want <b>content-sized but still stretchy</b>? use <code>flex: auto</code>.</p>`, code: cs(`.equal  > * { flex: 1; }      /* 1 1 0%   -> 300 / 300 */
.natural > * { flex: auto; }   /* 1 1 auto -> 200 / 400 */`, 'flex:1 vs flex:auto') },
    { title: 'Worked example: shrinking is weighted by basis', html: `<p>A 300px item and a 100px item are forced into a 200px bar with default <code>flex-shrink: 1</code>. The overflow is 200px. Scaled factors: 1 x 300 = 300 and 1 x 100 = 100. So the big one loses 200 x 300/400 = <b>150px</b> and the small one loses 200 x 100/400 = <b>50px</b>. Finals: <b>150px and 50px</b> (not 100 / 100).</p>
      <p>That is why a long text column is squashed far more than a small icon next to it. Set <code>flex-shrink: 0</code> on the icon to protect it completely.</p>` },
    { title: 'Navbar: logo left, links right, button pinned far right', html: `<p>No spacer divs needed. An <code>auto</code> margin on a flex item absorbs all leftover space on that side, which beats <code>justify-content</code> when you only want ONE gap.</p>`, code: cs(`.nav { display: flex; align-items: center; gap: 16px; }
.nav .links { margin-left: auto; }   /* pushes links + button to the right */
.nav .cta   { margin-left: 8px; }`, 'margin-left: auto') },
    { title: 'Axes swap in column mode', html: `<p>In <code>flex-direction: column</code> the main axis is vertical. <code>justify-content: center</code> now centres items <b>vertically</b> and <code>align-items: center</code> centres them <b>horizontally</b>. Also, a column flex container only has spare vertical space to share if it has a height (e.g. <code>min-height: 100vh</code>). Without a height, there is nothing to "grow" into.</p>` }
  ],
  deepDive: `<p>🟣 <b>The real algorithm (CSS Flexbox Level 1, section 9.7).</b> The browser (1) works out each item's <i>flex base size</i> and <i>hypothetical main size</i> (basis clamped by min/max), (2) collects items into lines, (3) picks "grow" or "shrink" by comparing the sum of hypothetical sizes to the container, then (4) runs a <b>resolve flexible lengths</b> loop: distribute, find items that violate their min or max, freeze those, repeat. The calculator above implements that loop with only a "min = 0" constraint.</p>
  <p><b>The min-width: auto trap.</b> A flex item's automatic minimum size is its <i>min-content</i> width, so a long unbreakable word or wide image refuses to shrink below it and overflows. Fix with <code>min-width: 0</code> (or <code>overflow: hidden</code>) on the item. The same applies to <code>min-height: 0</code> in column flex, which is why scrollable panels inside a column layout need <code>min-height: 0</code> on the flex child.</p>
  <p><b>Grow factors below 1.</b> If the grow factors add up to less than 1, only that fraction of the free space is handed out. <code>flex-grow: 0.5</code> on a lone item grows it by half of the free space, not all of it.</p>
  <p><b>Percent basis, <code>width</code> and <code>flex-basis</code>.</b> <code>flex-basis</code> beats <code>width</code> when it is not <code>auto</code>. <code>flex-basis: 0</code> with <code>flex-grow: 1</code> gives pure proportional layout; with <code>padding</code>/<code>border</code> and <code>box-sizing: content-box</code> those extras sit on top of the basis, which is why <code>box-sizing: border-box</code> everywhere makes flex maths predictable.</p>
  <p><b>Wrapping and alignment.</b> With <code>flex-wrap: wrap</code>, each line is resolved separately, and <code>align-content</code> (not <code>align-items</code>) spreads the lines. Items in the last line do NOT stretch to match the line above, which is exactly the gap that CSS Grid fixes. Flex also supports <code>order</code> and <code>row-reverse</code>, but visual reordering never changes the DOM/tab order, which is an accessibility trap.</p>
  <p><b>Performance.</b> Flexbox is cheap in modern engines, but deep nesting of flex containers whose sizes depend on content forces multiple layout passes. Prefer fewer, flatter containers and avoid animating <code>flex-basis</code>/<code>width</code> (layout every frame); animate <code>transform</code> instead.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> an assistant will write a flex layout in seconds and for common shapes (navbar, card row, centred hero) it is usually right. Screenshot-to-code tools also produce flex by default.</p>
  <p><b>Use AI as a partner:</b> paste your broken layout and ask <code>Which flex item is overflowing and which min-width/min-height auto behaviour causes it?</code> Ask for "three ways to centre this and the trade-offs". Ask it to <i>explain the free-space maths</i> for your numbers, then verify with the calculator above.</p>
  <p><b>Where AI goes wrong:</b> it loves piling on <code>width: 33.33%</code> and margins instead of <code>flex</code> + <code>gap</code>, forgets <code>min-width: 0</code>, mixes up <code>justify-content</code> vs <code>align-items</code> after a <code>flex-direction: column</code>, and often wraps everything in extra containers.</p>
  <p><b>What you must still own:</b> knowing which axis is which, predicting the final widths on paper, spotting the <code>min-width: auto</code> overflow, and choosing flex (one dimension) vs grid (two dimensions). In an interview you will be asked to compute the widths by hand - the model cannot do that for you.</p>`,
  problems: [
    {
      title: 'Equal-Height Cards with the Button Pinned to the Bottom',
      level: 'Easy', tags: ['flexbox', 'margin auto', 'column'], companies: ['Amazon', 'Shopify'], lang: 'css',
      statement: `<p>You have a row of three product cards. Their text lengths differ, but all cards must be the <b>same height</b> and each card's <b>Buy button must sit at the bottom edge</b> of its card, aligned across all cards. Write the CSS (HTML is given).</p>
      <p>HTML: <code>&lt;div class="cards"&gt;&lt;article class="card"&gt;&lt;h3&gt;...&lt;/h3&gt;&lt;p&gt;...&lt;/p&gt;&lt;button&gt;Buy&lt;/button&gt;&lt;/article&gt; ... &lt;/div&gt;</code></p>`,
      constraints: `Do not use fixed heights or JavaScript. Must still work when one card has 10 lines of text.`,
      example: `<p>Card A has 2 lines, card B has 6 lines, card C has 3 lines.</p>
      ${H.table(['Card', 'Text', 'Button position'], [['A', '2 lines', H.c('g', 'bottom, aligned')], ['B', '6 lines', H.c('g', 'bottom, aligned')], ['C', '3 lines', H.c('g', 'bottom, aligned')]])}
      <p>The outer flex row stretches every card to the tallest one (<code>align-items: stretch</code> is the default), and inside each card a column flex + <code>margin-top: auto</code> pushes the button down.</p>`,
      brute: { why: `<p>Hard-coding <code>height: 320px</code> on every card breaks as soon as text grows or the font size changes, and a button with <code>position: absolute; bottom: 0</code> needs bottom padding guesses and overlaps long text.</p>`, code: cs(`.card { height: 320px; position: relative; }
.card button { position: absolute; bottom: 12px; left: 12px; }  /* overlaps text if it grows */`) },
      mcq: { q: 'Which single declaration pushes the button to the bottom inside a column flex card?', options: ['<code>margin-top: auto</code> on the button', '<code>align-items: flex-end</code> on the card', '<code>float: bottom</code> on the button'], answer: 0, explain: 'In a column flex container an auto margin absorbs all the free vertical space on that side, shoving the button to the bottom.' },
      hints: [`<p>Two flex containers are needed: the row of cards, and each card itself.</p>`, `<p>The row: <code>display: flex</code> (cards stretch to equal height by default). The card: <code>display: flex; flex-direction: column</code>.</p>`, `<p>Recipe: <code>.cards {display:flex; gap:16px}</code>, <code>.card {flex:1; display:flex; flex-direction:column}</code>, <code>.card button {margin-top:auto}</code>. Add <code>min-width:0</code> on the card so long words cannot force overflow.</p>`],
      solution: {
        approach: `<p>The outer container is a flex row so all cards stretch to the tallest. Each card is also a flex <b>column</b>; the button gets <code>margin-top: auto</code> which absorbs the leftover vertical space.</p>`,
        code: cs(`.cards { display: flex; gap: 16px; }          /* cards stretch to equal height by default */
.card  {
  flex: 1 1 0;                                  /* equal widths */
  min-width: 0;                                 /* long words must not force overflow */
  display: flex; flex-direction: column;        /* inner column */
  padding: 16px; border: 1px solid #ddd; border-radius: 8px;
}
.card button { margin-top: auto; }              /* eat all free space above the button */`),
        complexity: `<p>Pure CSS, one layout pass. No JavaScript.</p>`,
        followUps: ['What changes if the cards wrap onto a second row?', 'Do the same thing with CSS Grid and <code>grid-template-rows: auto 1fr auto</code>']
      }
    }
  ]
});
/* =====================================================================
   TOPIC 2 - CSS GRID IN DEPTH
   ===================================================================== */
topics.push({
  title: 'CSS Grid in Depth: Tracks, fr, minmax, auto-fit, Areas, Spans',
  analogy: `<p>Flexbox is a <b>single shelf</b>: you line things up along it. Grid is a <b>whole bookcase with a ruler already drawn on it</b>: you first decide the rows and columns (the <i>tracks</i>), then you tell each book which shelf boxes it occupies. A book can even span two columns or three rows, like a tall dictionary that takes several slots. The bookcase keeps its shape even when a shelf is half empty.</p>`,
  explain: `<p>🟢 <b>The big idea.</b> Grid lays things out in <b>two dimensions at once</b>. You describe the empty frame on the <i>parent</i> (<code>grid-template-columns</code>, <code>grid-template-rows</code>), and the children drop into cells. The lines between tracks are numbered starting from <b>1</b>, so a 4-column grid has 5 column lines.</p>
  ${H.table(['Piece', 'What it means', 'Example'], [
    ['<b>Track</b>', 'One row or one column', '<code>grid-template-columns: 200px 1fr 1fr</code> = 3 column tracks'],
    ['<b>Line</b>', 'The numbered edges between tracks (start at 1)', '<code>grid-column: 2 / 4</code> = from line 2 to line 4 (2 columns wide)'],
    ['<b>Cell / Area</b>', 'One slot / a rectangle of slots', '<code>grid-column: 1 / span 3</code>'],
    ['<b>Gap</b>', 'Space between tracks', '<code>gap: 16px</code>'],
    ['<b>fr</b>', 'A fraction of the <i>leftover</i> space', '<code>1fr 2fr</code> = one third / two thirds']
  ])}
  <p>🔵 <b>Sizing tracks.</b> Fixed tracks (<code>px</code>, <code>rem</code>) are taken off first. Then whatever is left is shared among the <code>fr</code> tracks. Example: container 900px, gap 16px, columns <code>200px 1fr 2fr</code>. Gaps take 2 x 16 = 32px. Fixed track takes 200px. Left = 900 - 32 - 200 = <b>668px</b>. One <code>fr</code> = 668 / 3 = 222.67px, so tracks are <b>200 / 222.67 / 445.33</b>.</p>
  ${H.arr([200, 222.67, 445.33], { label: 'track widths (px)', hl: { 0: 'b', 1: 'g', 2: 'g' } })}
  <p><b>minmax(min, max).</b> A track is never smaller than <i>min</i> and never bigger than <i>max</i>. <code>minmax(150px, 1fr)</code> means "share the space equally, but never go below 150px". This is why <code>1fr</code> alone can overflow (its minimum is <code>auto</code>, i.e. content size) while <code>minmax(0, 1fr)</code> truly stays flexible.</p>
  <p><b>The responsive card grid in ONE line:</b> <code>grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))</code>. The browser works out how many 220px columns fit, then stretches them with <code>1fr</code>. Number of columns = <code>floor((container + gap) / (min + gap))</code>. Container 1000, gap 16, min 220: floor(1016 / 236) = <b>4</b> columns, each (1000 - 48) / 4 = <b>238px</b>. No media queries!</p>
  <p><b>auto-fit vs auto-fill.</b> With fewer items than columns, <code>auto-fill</code> keeps the empty tracks (cards stay 238px and the row has a hole on the right), while <code>auto-fit</code> collapses the empty ones so the cards stretch to fill the line.</p>
  <p><b>Placing items.</b> Three ways, from simple to powerful:</p>
  <ol>
    <li><b>Auto-placement</b> - do nothing, items fill cells row by row.</li>
    <li><b>Lines and spans</b> - <code>grid-column: 1 / span 2</code>, <code>grid-row: 2 / 4</code>, or <code>grid-column: 1 / -1</code> (-1 is the last line, so "the full width").</li>
    <li><b>Named areas</b> - draw the layout with words: <code>grid-template-areas: "header header" "nav main" "footer footer"</code>, then <code>grid-area: header</code> on the child. The ASCII art in your CSS is the layout.</li>
  </ol>
  <p><b>Alignment.</b> <code>justify-items</code> / <code>align-items</code> position items <i>inside their cell</i>; <code>justify-content</code> / <code>align-content</code> position the <i>whole grid</i> inside the container if tracks don't fill it. <code>place-items: center</code> is the shortest way to centre content in every cell. Extra rows/columns created by items that don't fit your template are the <b>implicit grid</b>, sized by <code>grid-auto-rows</code> / <code>grid-auto-columns</code>.</p>`,
  clues: [
    '"Layout with rows AND columns" / "header, sidebar, main, footer" - Grid, not flexbox',
    '"Cards that wrap into as many columns as fit, no media queries" - <code>repeat(auto-fit, minmax(220px, 1fr))</code>',
    '"Item spans two columns" / "featured tile is bigger" - <code>grid-column: span 2</code>',
    '"Full-width row inside a grid" - <code>grid-column: 1 / -1</code>',
    '"Holy grail layout" - <code>grid-template-areas</code> + <code>grid-template-rows: auto 1fr auto</code>',
    '"Column grows but never below 300px" - <code>minmax(300px, 1fr)</code>; "1fr overflows" - use <code>minmax(0, 1fr)</code>',
    '"Align nested card content to the parent\'s rows" - <code>subgrid</code>'
  ],
  code: [
    cs(`/* Responsive card grid - no media queries */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
.cards .featured { grid-column: span 2; }   /* two columns wide when there is room */
.cards .banner   { grid-column: 1 / -1; }   /* full width row */

/* Holy-grail with named areas */
.page {
  display: grid;
  grid-template-columns: 220px 1fr 180px;
  grid-template-rows: auto 1fr auto;        /* middle row takes the leftover height */
  grid-template-areas:
    "header header header"
    "nav    main   aside"
    "footer footer footer";
  min-height: 100vh;
}
.page > header { grid-area: header; }
.page > nav    { grid-area: nav; }
.page > main   { grid-area: main; min-width: 0; }
.page > aside  { grid-area: aside; }
.page > footer { grid-area: footer; }`, 'Grid: auto-fit cards and holy-grail areas'),
    jr(`// Grid track calculator (one axis).
// track = { px: 200 }  fixed size
// track = { fr: 1, min: 0 }  flexible: minmax(min, <fr>fr)
function gridTracks(container, gap, tracks) {
  const n = tracks.length;
  let free = container - gap * (n - 1);                 // gaps come off first
  tracks.forEach(t => { if (t.px !== undefined) free -= t.px; }); // then fixed tracks
  const size = tracks.map(t => (t.px !== undefined ? t.px : 0));
  const frozen = tracks.map(t => t.px !== undefined);
  for (let round = 0; round <= n; round++) {
    let frSum = 0, space = free;
    tracks.forEach((t, i) => {
      if (frozen[i] && t.px === undefined) space -= size[i]; // fr tracks pinned at their min
      else if (!frozen[i]) frSum += t.fr;
    });
    if (frSum === 0) break;
    // when the fr factors add up to less than 1, they claim only that fraction of the space
    const oneFr = space / Math.max(frSum, 1);
    let violated = false;
    tracks.forEach((t, i) => {
      if (frozen[i]) return;
      const want = oneFr * t.fr;
      if (want < (t.min || 0)) { size[i] = t.min; frozen[i] = true; violated = true; }
      else size[i] = want;
    });
    if (!violated) break;                               // everything satisfied, done
  }
  return size;
}

// How many columns does repeat(auto-fit | auto-fill, minmax(min, 1fr)) make?
function autoColumns(container, gap, min, items, mode) {
  const fit = Math.max(1, Math.floor((container + gap) / (min + gap)));
  const used = mode === 'fit' ? Math.min(fit, Math.max(items, 1)) : fit; // auto-fit collapses empty tracks
  const width = (container - gap * (used - 1)) / used;
  return { columns: used, width: +width.toFixed(2) };
}

const r = a => a.map(x => +x.toFixed(2));
console.log('200px 1fr 2fr in 900 (gap 16):', r(gridTracks(900, 16, [{ px: 200 }, { fr: 1 }, { fr: 2 }])));
console.log('minmax(300px,1fr) 1fr in 700 (gap 0):', r(gridTracks(700, 0, [{ fr: 1, min: 300 }, { fr: 1 }])));
console.log('minmax(450px,1fr) 1fr in 700 (gap 0):', r(gridTracks(700, 0, [{ fr: 1, min: 450 }, { fr: 1 }])));
console.log('auto-fit 1000/16/220 with 2 items :', autoColumns(1000, 16, 220, 2, 'fit'));
console.log('auto-fill 1000/16/220 with 2 items:', autoColumns(1000, 16, 220, 2, 'fill'));
console.log('auto-fit 1000/16/220 with 9 items :', autoColumns(1000, 16, 220, 9, 'fit'));`, 'Runnable: grid track-size and auto-fit calculator')
  ],
  codeTitle: ['Grid: auto-fit cards and holy-grail areas', 'Runnable: grid track-size and auto-fit calculator'],
  viz: [
    {
      title: 'Grid placement with spans, step by step',
      input: '4 4 | Header 1 1 4 1 | Side 1 2 1 2 | Main 2 2 3 2 | Footer 1 4 4 1',
      inputLabel: 'cols rows | name col row colSpan rowSpan | ... (max 8 items)',
      gen: function (input) {
        var bad = 'Format: "4 4 | Header 1 1 4 1 | Side 1 2 1 2" = cols rows | name col row colSpan rowSpan';
        var seg = String(input).split('|').map(function (s) { return s.trim(); });
        var dims = seg[0].split(/\s+/).map(Number);
        if (dims.length !== 2 || dims.some(function (x) { return !(x >= 1 && x <= 8); })) throw new Error(bad);
        var C = dims[0], R = dims[1];
        var items = seg.slice(1).filter(function (s) { return s; }).map(function (s) {
          var t = s.split(/\s+/);
          if (t.length !== 5) throw new Error(bad);
          var n = t.slice(1).map(Number);
          if (n.some(function (x) { return !(x >= 1) || x !== Math.floor(x); })) throw new Error(bad);
          return { name: t[0], c: n[0], r: n[1], cs: n[2], rs: n[3] };
        });
        if (!items.length || items.length > 8) throw new Error(bad);
        items.forEach(function (it) { if (it.c + it.cs - 1 > C || it.r + it.rs - 1 > R) throw new Error(it.name + ' does not fit inside a ' + C + ' x ' + R + ' grid'); });
        var cols = [], rowsH = [], i;
        for (i = 1; i <= C; i++) cols.push('col ' + i);
        for (i = 1; i <= R; i++) rowsH.push('row ' + i);
        var cls = ['ok', 'win', 'sel', 'cur', 'ok', 'win', 'sel', 'cur'];
        var cells = [], owner = [], r, c;
        for (r = 0; r < R; r++) { cells.push(new Array(C).fill('')); owner.push(new Array(C).fill(-1)); }
        var frames = [];
        frames.push({ narr: 'An empty <b>' + C + ' x ' + R + '</b> grid. It has <b>' + (C + 1) + ' column lines</b> and <b>' + (R + 1) + ' row lines</b>, numbered from 1. Every item will be placed by naming its start line and how many tracks it spans.', parts: [
          { type: 'grid', label: 'empty grid', rows: cells.map(function (x) { return x.slice(); }), colHead: cols, rowHead: rowsH }
        ] });
        items.forEach(function (it, k) {
          var clash = false, hl = {}, rr, cc;
          for (rr = it.r - 1; rr < it.r - 1 + it.rs; rr++) for (cc = it.c - 1; cc < it.c - 1 + it.cs; cc++) {
            if (owner[rr][cc] >= 0) clash = true;
          }
          for (rr = it.r - 1; rr < it.r - 1 + it.rs; rr++) for (cc = it.c - 1; cc < it.c - 1 + it.cs; cc++) {
            if (owner[rr][cc] >= 0) { hl[rr + ',' + cc] = 'bad'; cells[rr][cc] = owner[rr][cc] + ''; cells[rr][cc] = items[owner[rr][cc]].name + '+' + it.name; }
            else { owner[rr][cc] = k; cells[rr][cc] = it.name; hl[rr + ',' + cc] = cls[k]; }
          }
          // keep earlier items coloured
          for (rr = 0; rr < R; rr++) for (cc = 0; cc < C; cc++) { if (owner[rr][cc] >= 0 && !hl[rr + ',' + cc]) hl[rr + ',' + cc] = 'done'; }
          var css = 'grid-column: ' + it.c + ' / span ' + it.cs + '; grid-row: ' + it.r + ' / span ' + it.rs + ';';
          frames.push({ narr: '<b>' + it.name + '</b> starts at column line ' + it.c + ', row line ' + it.r + ' and spans ' + it.cs + ' column(s) x ' + it.rs + ' row(s). ' + (clash ? '<span class="c-r">It overlaps an earlier item (red cells) - grid allows overlap, but you usually want to avoid it.</span>' : '<span class="c-g">All its cells were free.</span>'), parts: [
            { type: 'grid', label: 'placing ' + it.name, rows: cells.map(function (x) { return x.slice(); }), colHead: cols, rowHead: rowsH, hl: hl },
            { type: 'vars', vals: { css: css, 'cells covered': it.cs * it.rs } }
          ] });
        });
        var empty = 0;
        for (r = 0; r < R; r++) for (c = 0; c < C; c++) if (owner[r][c] < 0) empty++;
        var hl2 = {};
        for (r = 0; r < R; r++) for (c = 0; c < C; c++) hl2[r + ',' + c] = owner[r][c] < 0 ? 'bad' : cls[owner[r][c]];
        frames.push({ narr: 'Done. ' + (empty ? '<b>' + empty + '</b> cell(s) are still empty (red) - they stay as blank space unless auto-placed items flow in.' : 'Every cell is covered - a tidy layout with no holes.'), parts: [
          { type: 'grid', label: 'final layout', rows: cells.map(function (x) { return x.slice(); }), colHead: cols, rowHead: rowsH, hl: hl2 },
          { type: 'table', label: 'The CSS for each item', columns: ['item', 'grid-column', 'grid-row'], rows: items.map(function (it) { return [it.name, it.c + ' / span ' + it.cs, it.r + ' / span ' + it.rs]; }) }
        ] });
        return frames;
      }
    },
    {
      title: 'How fr and minmax() share the space',
      input: '900; 16; 200 1fr 2fr',
      inputLabel: 'container; gap; tracks (e.g. 200 = 200px, 1fr, or 150+1fr = minmax(150px, 1fr))',
      gen: function (input) {
        var bad = 'Format: "900; 16; 200 1fr 2fr" (200 = px, 1fr, 150+1fr = minmax(150px,1fr))';
        var seg = String(input).split(';').map(function (s) { return s.trim(); });
        if (seg.length !== 3) throw new Error(bad);
        var W = Number(seg[0]), gap = Number(seg[1]);
        if (!(W > 0) || W > 3000 || !(gap >= 0)) throw new Error(bad);
        var tracks = seg[2].split(/\s+/).map(function (tok) {
          var m;
          if ((m = tok.match(/^(\d+(?:\.\d+)?)(?:px)?$/))) return { px: Number(m[1]), label: m[1] + 'px' };
          if ((m = tok.match(/^(\d+(?:\.\d+)?)fr$/))) return { fr: Number(m[1]), min: 0, label: m[1] + 'fr' };
          if ((m = tok.match(/^(\d+(?:\.\d+)?)\+(\d+(?:\.\d+)?)fr$/))) return { fr: Number(m[2]), min: Number(m[1]), label: 'minmax(' + m[1] + 'px, ' + m[2] + 'fr)' };
          throw new Error(bad);
        });
        if (tracks.length < 1 || tracks.length > 6) throw new Error(bad);
        var n = tracks.length, labels = tracks.map(function (t, i) { return 'col ' + (i + 1) + ': ' + t.label; });
        var r2 = function (x) { return Math.round(x * 100) / 100; };
        var frames = [];
        var free = W - gap * (n - 1), fixed = 0;
        tracks.forEach(function (t) { if (t.px !== undefined) fixed += t.px; });
        frames.push({ narr: 'The grid is <b>' + W + 'px</b> wide with <b>' + n + '</b> tracks. There are ' + (n - 1) + ' gaps of ' + gap + 'px, so gaps use <b>' + gap * (n - 1) + 'px</b> before anything else.', parts: [
          { type: 'vars', vals: { container: W + 'px', gaps: gap * (n - 1) + 'px', 'left after gaps': free + 'px' } },
          { type: 'table', label: 'tracks', columns: ['track', 'definition'], rows: tracks.map(function (t, i) { return [i + 1, t.label]; }) }
        ] });
        free -= fixed;
        frames.push({ narr: 'Fixed (px) tracks take <b>' + fixed + 'px</b>. What remains, <b>' + r2(free) + 'px</b>, is the pool the <code>fr</code> tracks share.' + (free < 0 ? ' <span class="c-r">The pool is negative - the grid overflows its container.</span>' : ''), parts: [
          { type: 'vars', vals: { 'fixed tracks': fixed + 'px', 'pool for fr': r2(free) + 'px' }, hl: { 'pool for fr': free < 0 ? 'bad' : 'ok' } }
        ] });
        var size = tracks.map(function (t) { return t.px !== undefined ? t.px : 0; });
        var frozen = tracks.map(function (t) { return t.px !== undefined; });
        var rounds = [];
        for (var round = 0; round <= n; round++) {
          var frSum = 0, space = free;
          tracks.forEach(function (t, i) { if (frozen[i] && t.px === undefined) space -= size[i]; else if (!frozen[i]) frSum += t.fr; });
          if (frSum === 0) break;
          var oneFr = space / Math.max(frSum, 1), violated = false, names = [];
          tracks.forEach(function (t, i) {
            if (frozen[i]) return;
            var want = oneFr * t.fr;
            if (want < t.min) { size[i] = t.min; frozen[i] = true; violated = true; names.push('col ' + (i + 1)); } else size[i] = want;
          });
          rounds.push({ frSum: frSum, space: space, oneFr: oneFr, violated: violated, names: names });
          if (!violated) break;
        }
        rounds.forEach(function (rd, k) {
          frames.push({ narr: 'Round ' + (k + 1) + ': pool ' + r2(rd.space) + 'px / ' + r2(rd.frSum) + ' fr = <b>1fr = ' + r2(rd.oneFr) + 'px</b>. ' + (rd.violated ? '<span class="c-r">' + rd.names.join(', ') + ' would be narrower than its minmax() minimum, so it is pinned at the minimum and the share is recomputed.</span>' : '<span class="c-g">Every fr track respects its minimum, so we are done.</span>'), parts: [
            { type: 'vars', vals: { 'fr total': r2(rd.frSum), '1fr': r2(rd.oneFr) + 'px' }, hl: { '1fr': rd.violated ? 'bad' : 'ok' } }
          ] });
        });
        var hl = {};
        tracks.forEach(function (t, i) { hl[i] = t.px !== undefined ? 'win' : frozen[i] ? 'bad' : 'ok'; });
        frames.push({ narr: 'Final track widths. Blue = fixed, green = flexible, red = pinned at the minmax() minimum.', parts: [
          { type: 'bars', label: 'track width (px)', values: size.map(r2), texts: size.map(function (s) { return r2(s) + 'px'; }), idxLabels: labels, hl: hl },
          { type: 'vars', vals: { 'tracks + gaps': r2(size.reduce(function (a, b) { return a + b; }, 0) + gap * (n - 1)) + 'px', container: W + 'px' } }
        ] });
        return frames;
      }
    },
    {
      title: 'auto-fit vs auto-fill: how many columns?',
      input: '1000 16 220 2',
      inputLabel: 'container, gap, min column width, number of items',
      gen: function (input) {
        var a = String(input).trim().split(/[\s,]+/).map(Number);
        if (a.length !== 4 || a.some(function (x) { return isNaN(x) || x < 0; }) || a[0] <= 0 || a[2] <= 0 || a[3] < 1 || a[3] > 12) throw new Error('Enter: container gap min items (items 1-12), e.g. "1000 16 220 2"');
        var W = a[0], gap = a[1], min = a[2], items = Math.floor(a[3]);
        var cols = Math.max(1, Math.floor((W + gap) / (min + gap)));
        var r2 = function (x) { return Math.round(x * 100) / 100; };
        var frames = [];
        frames.push({ narr: 'Question: how many <b>' + min + 'px</b> columns fit in <b>' + W + 'px</b> with a <b>' + gap + 'px</b> gap? Each column needs min + gap of room, but the very last column needs no gap after it, so we add one gap to the container first.', parts: [
          { type: 'vars', vals: { 'formula': 'floor((W + gap) / (min + gap))', 'numbers': 'floor((' + W + ' + ' + gap + ') / (' + min + ' + ' + gap + '))', 'columns that fit': cols }, hl: { 'columns that fit': 'ok' } }
        ] });
        var w = (W - gap * (cols - 1)) / cols;
        var rowCells = [], hl = {}, i;
        for (i = 0; i < cols; i++) { rowCells.push(i < items ? 'card ' + (i + 1) : ''); hl['0,' + i] = i < items ? 'ok' : 'bad'; }
        frames.push({ narr: '<code>auto-fill</code> keeps all <b>' + cols + '</b> tracks, even empty ones. With <code>1fr</code> as the max, each is <b>' + r2(w) + 'px</b>. ' + (items < cols ? '<span class="c-r">Red cells are empty tracks - the cards stay narrow and the line has a hole.</span>' : 'There are enough items to fill the first line.'), parts: [
          { type: 'grid', label: 'auto-fill, first line', rows: [rowCells], colHead: rowCells.map(function (_, k) { return 'track ' + (k + 1); }), rowHead: ['row 1'], hl: hl },
          { type: 'bars', label: 'track widths (px)', values: rowCells.map(function () { return r2(w); }) }
        ] });
        var used = Math.min(cols, items);
        var w2 = (W - gap * (used - 1)) / used;
        var rc2 = [], hl2 = {};
        for (i = 0; i < used; i++) { rc2.push('card ' + (i + 1)); hl2['0,' + i] = 'ok'; }
        frames.push({ narr: '<code>auto-fit</code> first makes the same tracks, then <b>collapses empty ones to 0px</b> (their gaps vanish too). The remaining <b>' + used + '</b> track(s) share the full width: <b>' + r2(w2) + 'px</b> each.', parts: [
          { type: 'grid', label: 'auto-fit, first line', rows: [rc2], colHead: rc2.map(function (_, k) { return 'track ' + (k + 1); }), rowHead: ['row 1'], hl: hl2 },
          { type: 'bars', label: 'track widths (px)', values: rc2.map(function () { return r2(w2); }) }
        ] });
        frames.push({ narr: 'Summary. When there are <b>at least as many items as columns</b> the two keywords behave identically. They only differ when items run out before the first line is full.', parts: [
          { type: 'table', columns: ['keyword', 'tracks kept', 'card width (px)', 'good for'], rows: [
            ['auto-fill', cols, r2(w), 'a steady column rhythm even with few items'],
            ['auto-fit', used, r2(w2), 'a few cards that should stretch to fill the row']
          ], hl: { 0: 'cur', 1: 'ok' } }
        ] });
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Worked example: 200px 1fr 2fr in a 900px container', html: `<p>Gaps: 2 x 16 = 32px. Fixed: 200px. Pool = 900 - 32 - 200 = 668px. Total fr = 3, so <b>1fr = 222.67px</b>. Tracks: <b>200 / 222.67 / 445.33</b>. Notice <code>2fr</code> is exactly twice <code>1fr</code> <i>because both start from zero</i>. If the tracks were <code>1fr</code> with wide content, the minimum-content rule would break that ratio.</p>`, code: cs(`.layout { display: grid; grid-template-columns: 200px 1fr 2fr; gap: 16px; }`, 'Three tracks') },
    { title: 'Worked example: the full-width banner inside a card grid', html: `<p>A card grid of unknown column count needs one banner that always spans <i>every</i> column. Counting lines does not work when the column count changes, but <b>-1</b> always means "last line", so <code>grid-column: 1 / -1</code> works at any width. (This only works on <i>explicit</i> tracks; with <code>auto-fit</code> the implicit-line count follows the explicit tracks it generated, so it spans them all.)</p>`, code: cs(`.cards .banner { grid-column: 1 / -1; }`, 'Full-width row') },
    { title: 'Worked example: minmax() pins a track', html: `<p>Container 700px, columns <code>minmax(450px, 1fr) 1fr</code>. Naively each gets 350px, but 350 &lt; 450 so the first column is <b>pinned at 450px</b>, and the second gets the rest: <b>250px</b>. The browser does exactly this "freeze and recompute" loop (try it in the calculator above).</p>
      ${H.arr([450, 250], { label: 'final tracks (px)', hl: { 0: 'r', 1: 'g' } })}` },
    { title: 'Spanning: a 12-column grid like Bootstrap, in 3 lines', html: `<p>Make 12 equal tracks and let items say how many they need. Items then span 4, 6 or 8 columns with a single declaration each.</p>`, code: cs(`.grid12 { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; }
.col-4  { grid-column: span 4; }   /* a third */
.col-8  { grid-column: span 8; }   /* two thirds */`, '12 column grid') },
    { title: 'Subgrid: line up the insides of different cards', html: `<p>Three cards each have a title, text and button. Without subgrid, titles of different heights push the buttons out of line. With <code>grid-template-rows: subgrid</code> each card borrows the parent's row tracks, so all titles share one row and all buttons share another. Subgrid is supported in all current browsers (Chrome 117+, Safari 16+, Firefox 71+).</p>`, code: cs(`.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.card  { display: grid; grid-row: span 3; grid-template-rows: subgrid; } /* title / text / button rows shared */`, 'subgrid') }
  ],
  deepDive: `<p>🟣 <b>fr is not a percentage.</b> <code>1fr</code> is <i>1 part of the leftover space after fixed tracks, gaps and content minimums</i>. A track defined as <code>1fr</code> actually means <code>minmax(auto, 1fr)</code>, and <code>auto</code> as a minimum is the item's min-content size, so a long URL or a wide table can blow the track open. Use <code>minmax(0, 1fr)</code> (or <code>min-width: 0</code> on the item) when you want columns that truly share space.</p>
  <p><b>Track sizing algorithm in short.</b> (1) Size tracks with fixed sizes. (2) Size content-based tracks (<code>auto</code>, <code>min-content</code>, <code>max-content</code>) from their items. (3) Maximise tracks up to growth limits. (4) Expand flexible (<code>fr</code>) tracks using the "find the size of an fr" loop - the one in the calculator. Note: if the sum of <code>fr</code> factors is below 1, they claim only that fraction of the leftover space, same as flex-grow.</p>
  <p><b>Auto-placement.</b> <code>grid-auto-flow: row</code> (default) fills each row left to right. <code>dense</code> backfills holes with later, smaller items - great for photo galleries but it changes <i>visual</i> order away from DOM order (keyboard/screen-reader order stays the DOM order, a WCAG "meaningful sequence" risk).</p>
  <p><b>Intrinsic sizing keywords.</b> <code>min-content</code> (as narrow as possible without overflow), <code>max-content</code> (as wide as the content wants), <code>fit-content(300px)</code> (content size capped at 300px). <code>auto</code> tracks stretch with <code>align-content: normal</code>.</p>
  <p><b>Named lines and areas.</b> Areas generate implicit line names (<code>header-start</code>, <code>header-end</code>), letting you place items by name even in templates you redefine at breakpoints. This is the cleanest way to rearrange a layout in media queries: change only <code>grid-template-areas</code>, never the children.</p>
  <p><b>Performance and robustness.</b> Grid is as fast as flex for normal sizes. A grid with thousands of auto-sized tracks is costly because the algorithm iterates; for huge lists use virtualisation instead. Prefer <code>gap</code> over margins (no end-of-row leftovers), and give <code>auto-fit</code> grids a sane <code>min()</code> so tiny phones do not overflow: <code>minmax(min(220px, 100%), 1fr)</code>.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> models are good at grid boilerplate and area diagrams, and design-to-code tools usually emit nested flex or absolute positioning. You can describe a layout in words ("sidebar, header, scrollable main, sticky footer") and get working <code>grid-template-areas</code>.</p>
  <p><b>Use AI as a partner:</b> ask <code>Rewrite this float/flex layout as CSS Grid and explain each track</code>; ask for the layout at three widths as ASCII art, then compare with your own mental picture. Have it generate edge cases: "what happens with 1, 2, 3 and 13 cards?"</p>
  <p><b>Where AI goes wrong:</b> it often writes <code>repeat(3, 1fr)</code> plus three media queries when one <code>auto-fit/minmax</code> line does the job, confuses <code>auto-fit</code> with <code>auto-fill</code>, forgets <code>min-width: 0</code>/<code>minmax(0, 1fr)</code> so long content overflows, and places items by guessed line numbers that break when the template changes.</p>
  <p><b>What you must still own:</b> choosing grid vs flex, doing the track-size arithmetic, knowing why <code>1fr</code> can overflow, and protecting source order for accessibility.</p>`,
  problems: [
    {
      title: 'Responsive Card Grid with auto-fit / minmax',
      level: 'Medium', tags: ['grid', 'auto-fit', 'minmax', 'responsive'], companies: ['Google', 'Atlassian'], lang: 'css',
      statement: `<p>Build a product grid where cards are <b>at least 220px wide</b>, grow equally to fill the row, wrap onto new lines automatically, and never overflow a 320px phone. Do it with <b>no media queries</b>. Also work out how many columns appear at 1000px with a 16px gap, and how wide each card is.</p>`,
      constraints: `Pure CSS. Container width can be anything from 320px to 1920px. Gap is 16px.`,
      example: `${H.table(['Container', 'Columns', 'Card width'], [['320px', '1', '320px'], ['500px', '2', '242px'], ['1000px', '4', '238px'], ['1440px', '6', '226.67px']])}
      <p>At 1000px: floor((1000 + 16) / (220 + 16)) = floor(4.3) = <b>4</b> columns; width = (1000 - 3 x 16) / 4 = <b>238px</b>.</p>`,
      brute: { why: `<p>The classic approach hard-codes columns at fixed breakpoints. It needs several media queries, jumps abruptly between layouts, and still breaks for containers that are not the viewport (e.g. a card grid inside a narrow sidebar).</p>`, code: cs(`.cards { display: grid; gap: 16px; grid-template-columns: 1fr; }
@media (min-width: 560px)  { .cards { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 840px)  { .cards { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1100px) { .cards { grid-template-columns: repeat(4, 1fr); } }`) },
      mcq: { q: 'You have only 2 cards but the container fits 4 columns. You want the 2 cards to stretch and fill the line. Which keyword?', options: ['<code>auto-fit</code>', '<code>auto-fill</code>', '<code>span 4</code>'], answer: 0, explain: 'auto-fit collapses the empty tracks to 0, so the remaining tracks (with a 1fr maximum) stretch across the whole line. auto-fill keeps the empty tracks.' },
      hints: [`<p>The browser can count columns for you: <code>repeat(auto-fit, ...)</code>.</p>`, `<p>Each track is <code>minmax(220px, 1fr)</code>: never below 220, then share equally.</p>`, `<p>On a 320px phone 220px + padding may overflow, so wrap the min: <code>minmax(min(220px, 100%), 1fr)</code>. Use <code>gap: 16px</code>.</p>`],
      solution: {
        approach: `<p>One declaration does it. <code>repeat(auto-fit, ...)</code> asks the browser to create as many tracks as fit; <code>minmax(min(220px, 100%), 1fr)</code> sets a minimum of 220px (but never wider than the container) and lets leftover space be shared equally.</p>`,
        code: cs(`.cards {
  display: grid;
  gap: 16px;
  /* as many columns as fit, each >= 220px (or the full width on tiny screens), then share the rest */
  grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
}
.card { min-width: 0; }  /* long words/images must not stretch a track */`),
        complexity: `<p>One layout pass; columns = floor((W + gap) / (min + gap)).</p>`,
        followUps: ['What changes if I use <code>auto-fill</code> with only two cards?', 'How would you cap each card at 320px wide but keep the row centred?']
      }
    }
  ]
});
/* =====================================================================
   TOPIC 3 - POSITIONING AND STACKING CONTEXT
   ===================================================================== */
topics.push({
  title: 'Positioning and Stacking Context (z-index)',
  analogy: `<p>Think of a <b>filing cabinet with folders</b>. Inside every folder the papers are numbered 1, 2, 3 - "paper 9999" is on top of "paper 2" <i>in the same folder</i>. But the folders themselves are stacked too. A paper numbered 9999 inside a folder at the bottom of the cabinet still sits <b>below</b> a paper numbered 1 inside a folder higher up. A <b>stacking context</b> is a folder, and <code>z-index</code> only ever compares papers in the <i>same</i> folder. That is the whole mystery behind "my z-index: 9999 doesn't work".</p>`,
  explain: `<p>🟢 <b>Part 1 - The five positions.</b> <code>position</code> decides how an element is placed and what its offsets (<code>top</code>, <code>left</code>, <code>inset</code>...) are measured from.</p>
  ${H.table(['Value', 'In normal flow?', 'Offsets measured from', 'Typical use'], [
    ['<code>static</code> (default)', 'yes', 'offsets ignored', 'everything'],
    ['<code>relative</code>', 'yes (its old space stays)', 'its own normal spot', 'nudge, or make a <b>containing block</b> for children'],
    ['<code>absolute</code>', 'no (removed from flow)', 'nearest <b>positioned</b> ancestor (not static)', 'badges, dropdowns, overlays'],
    ['<code>fixed</code>', 'no', 'the viewport', 'toasts, floating buttons, modals'],
    ['<code>sticky</code>', 'yes', 'its scroll container, once it hits the threshold', 'sticky headers, table headers, sidebars']
  ])}
  <p><b>Absolute needs an anchor.</b> If no ancestor is positioned, an absolute element anchors to the page (the initial containing block). The everyday fix: put <code>position: relative</code> on the parent you want as the anchor. Centre an overlay with <code>inset: 0; margin: auto; width: 300px; height: 200px</code> or <code>top: 50%; left: 50%; transform: translate(-50%, -50%)</code>.</p>
  <p><b>Sticky needs three things:</b> (1) a threshold like <code>top: 0</code>, (2) no ancestor between it and the scroller with <code>overflow: hidden/auto/scroll</code> (that ancestor becomes the scroll container, so the element sticks to a box that never scrolls), and (3) a parent tall enough - a sticky element can never leave its parent box.</p>
  <p>🔵 <b>Part 2 - z-index and stacking contexts.</b> <code>z-index</code> only works on <b>positioned</b> elements (anything but <code>static</code>) and on flex/grid children. Higher numbers sit in front - but only against siblings in the <b>same stacking context</b>. A new stacking context starts when an element:</p>
  <ul>
    <li>is the root element (<code>&lt;html&gt;</code>);</li>
    <li>has <code>position: relative/absolute</code> <b>and</b> a <code>z-index</code> other than <code>auto</code>;</li>
    <li>has <code>position: fixed</code> or <code>sticky</code> (always, even with <code>z-index: auto</code>);</li>
    <li>is a flex/grid child with a <code>z-index</code> other than <code>auto</code>;</li>
    <li>has <code>opacity</code> below 1, a <code>transform</code>, <code>filter</code>, <code>perspective</code>, <code>clip-path</code>, <code>mask</code>;</li>
    <li>has <code>isolation: isolate</code>, <code>mix-blend-mode</code> other than normal, <code>will-change</code> of a context-making property, or <code>contain: layout/paint</code>.</li>
  </ul>
  <p>Inside one context, painting goes from <b>back to front</b> in this order:</p>
  <ol>
    <li>the context root's own background and border</li>
    <li>children with <b>negative</b> z-index</li>
    <li>normal in-flow blocks (non-positioned)</li>
    <li>floats</li>
    <li>inline content (text)</li>
    <li>positioned children with <code>z-index: auto</code> or <code>0</code>, in DOM order</li>
    <li>positioned children with <b>positive</b> z-index, lowest first</li>
  </ol>
  <p>Ties are broken by DOM order: the later element wins. A child context is painted as <b>one flat sheet</b> at its parent's level - nothing inside can escape in between two outside layers.</p>
  <p><b>The classic bug.</b> Sticky header has <code>z-index: 10</code>. A card has <code>transform: translateZ(0)</code> (made for a hover animation), so it becomes a context at level <code>0</code>. Inside it a modal has <code>z-index: 9999</code> - but that 9999 only beats things <i>inside the card</i>. At the page level the whole card sits at level 0, below the header's 10. The modal slides under the header. <b>Fixes:</b> remove the transform from the ancestor, render the modal in a portal at the end of <code>&lt;body&gt;</code>, or raise the card's own level above 10. Prefer a small, documented z-index scale (e.g. 10 header, 20 dropdown, 30 modal) over 9999.</p>`,
  clues: [
    '"z-index not working" / "z-index 9999 still behind" - look for an ancestor that created a stacking context',
    '"Dropdown / tooltip is cut off or hidden behind a sibling" - overflow clipping or a trapped stacking context',
    '"position: sticky does nothing" - check ancestors with <code>overflow</code>, missing <code>top</code>, parent too short',
    '"Absolute child ends up at the page corner" - the parent forgot <code>position: relative</code>',
    '"Modal inside a transformed / filtered parent" - <code>fixed</code> now anchors to that parent, not the viewport',
    '"Fix without changing z-index numbers" - <code>isolation: isolate</code> or portal',
    '"Which element is on top?" - find each element\'s stacking context chain, compare level in the first shared context'
  ],
  code: [
    cs(`/* Sticky header that works */
.page-header { position: sticky; top: 0; z-index: 10; background: white; }
/* ancestors must NOT have overflow: hidden/auto, or the header sticks to a box that never scrolls */

/* Anchor an absolute badge */
.avatar        { position: relative; }          /* the anchor */
.avatar .badge { position: absolute; top: 0; right: 0; transform: translate(40%, -40%); }

/* A tiny z-index scale in variables */
:root { --z-header: 10; --z-dropdown: 20; --z-modal: 30; --z-toast: 40; }
.modal { position: fixed; inset: 0; z-index: var(--z-modal); }

/* Contain z-index chaos inside a widget without using a big number */
.widget { isolation: isolate; }                 /* new context, no visual change */`, 'Positioning and z-index recipes'),
    jr(`// Does this element create a stacking context? And what is the paint order?
// A mini model of the rules in CSS 2.1 Appendix E + the modern triggers.
const numZ = n => (n.zIndex === undefined || n.zIndex === 'auto') ? null : Number(n.zIndex);

function createsContext(n, parent) {
  if (!parent) return 'root element';
  const positioned = n.position && n.position !== 'static';
  const z = numZ(n);
  if (n.position === 'fixed' || n.position === 'sticky') return 'position: ' + n.position;
  if (positioned && z !== null) return 'positioned + z-index';
  if (parent.display && /flex|grid/.test(parent.display) && z !== null) return 'flex/grid item + z-index';
  if (n.opacity !== undefined && n.opacity < 1) return 'opacity < 1';
  if (n.transform && n.transform !== 'none') return 'transform';
  if (n.filter && n.filter !== 'none') return 'filter';
  if (n.isolation === 'isolate') return 'isolation: isolate';
  if (n.willChange && /transform|opacity/.test(n.willChange)) return 'will-change';
  return null;
}

function annotate(n, parent, all) {
  n.order = all.length;                       // DOM order (depth-first)
  n.why = createsContext(n, parent);
  n.isCtx = !!n.why;
  n.ctxRoot = parent ? (parent.isCtx ? parent : parent.ctxRoot) : null; // nearest ancestor that is a context
  all.push(n);
  (n.children || []).forEach(c => annotate(c, n, all));
}

function paint(ctx, all, indent) {
  // layers that live directly in this context: positioned or context-creating descendants
  const layers = all.filter(n => n.ctxRoot === ctx && (n.isCtx || (n.position && n.position !== 'static')));
  const lvl = n => (numZ(n) === null ? 0 : numZ(n));
  const neg = layers.filter(n => lvl(n) < 0).sort((a, b) => lvl(a) - lvl(b) || a.order - b.order);
  const zero = layers.filter(n => lvl(n) === 0).sort((a, b) => a.order - b.order);
  const pos = layers.filter(n => lvl(n) > 0).sort((a, b) => lvl(a) - lvl(b) || a.order - b.order);
  const pad = ' '.repeat(indent);
  const lines = [pad + '[background of ' + ctx.name + ']'];
  const show = n => {
    lines.push(pad + '- ' + n.name + ' (level ' + lvl(n) + (n.isCtx ? ', context: ' + n.why : '') + ')');
    if (n.isCtx) lines.push(...paint(n, all, indent + 4));
  };
  neg.forEach(show);
  lines.push(pad + '[in-flow content of ' + ctx.name + ']');
  zero.forEach(show);
  pos.forEach(show);
  return lines;
}

// the classic bug: a transformed card traps the modal
const page = { name: 'html', display: 'block', children: [
  { name: 'header', position: 'sticky', zIndex: 10, children: [] },
  { name: 'main', display: 'block', children: [
    { name: '.card', position: 'relative', transform: 'translateZ(0)', children: [
      { name: '.modal', position: 'fixed', zIndex: 9999, children: [] } ] } ] }
] };
const all = [];
annotate(page, null, all);
console.log('Contexts:', all.filter(n => n.isCtx).map(n => n.name + ' (' + n.why + ')').join(', '));
console.log('Paint order, back to front:');
console.log(paint(page, all, 0).join('\\n'));`, 'Runnable: stacking-context detector and paint order')
  ],
  codeTitle: ['Positioning and z-index recipes', 'Runnable: stacking-context detector and paint order'],
  viz: [
    {
      title: 'Stacking-context tree: why z-index 9999 loses (and three fixes)',
      input: 'portal',
      inputLabel: 'Fix to apply: portal, remove-transform or raise-main',
      gen: function (input) {
        var fix = String(input).trim().toLowerCase();
        if (['portal', 'remove-transform', 'raise-main'].indexOf(fix) < 0) throw new Error('Type one of: portal, remove-transform, raise-main');
        var frames = [];
        var bug = ['html', 'header', 'main', 'nav', null, '.card', null, null, null, null, null, '.modal', null];
        frames.push({ narr: 'The page: a sticky <b>header</b> and a <b>main</b> that holds a <b>.card</b>. The card has <code>transform: translateZ(0)</code> and contains a <b>.modal</b> with <code>z-index: 9999</code>. Users report the modal is hidden <i>under</i> the header.', parts: [
          { type: 'tree', label: 'DOM tree', arr: bug, tags: { 1: 'sticky z:10', 5: 'transform', 11: 'fixed z:9999' } }
        ] });
        frames.push({ narr: 'Find the stacking contexts (purple). <b>html</b> is always one. <b>header</b> is sticky, so it is one at level <b>10</b>. <b>.card</b> has a transform, so it is one at level <b>0</b> (auto). <b>.modal</b> is fixed, so it is one too - but it lives <i>inside the card\'s</i> context. <b>main</b> creates nothing.', parts: [
          { type: 'tree', label: 'stacking contexts highlighted', arr: bug, hl: { 0: 'sel', 1: 'sel', 5: 'sel', 11: 'sel', 2: 'done', 3: 'done' }, tags: { 0: 'root ctx', 1: 'ctx level 10', 5: 'ctx level 0', 11: 'ctx inside card' } }
        ] });
        frames.push({ narr: 'Paint order in the <b>root</b> context, back to front: the page background, main\'s in-flow content, then the <b>.card</b> (level 0) as ONE flat sheet that already contains the modal, and finally the <b>header</b> (level 10) on top. The header is painted over the whole card, modal included.', parts: [
          { type: 'stack', label: 'root context, bottom to top', items: ['html background', 'main (in-flow)', '.card sheet [contains .modal 9999]', 'header z:10'], hl: { 2: 'bad', 3: 'cur' } }
        ] });
        frames.push({ narr: 'So the 9999 only competes <i>inside</i> the card\'s context, where it beats everything - but the header is outside that folder. The bug is not a small number; it is a <b>trapped</b> number.', parts: [
          { type: 'tree', label: 'the modal is trapped', arr: bug, hl: { 11: 'bad', 5: 'cur', 1: 'win' }, tags: { 11: '9999 (trapped)', 5: 'level 0 in root', 1: 'level 10 in root' } }
        ] });
        if (fix === 'portal') {
          var portal = ['html', 'header', 'main', 'nav', null, '.card', '#modal-root', null, null, null, null, null, null, '.modal'];
          frames.push({ narr: '<b>Fix: portal.</b> Render the modal into a <code>#modal-root</code> element at the end of the page, outside the transformed card. Now the modal is a direct layer of the root context.', parts: [
            { type: 'tree', label: 'after: modal moved out of .card', arr: portal, hl: { 13: 'ok', 6: 'ok' }, tags: { 1: 'ctx level 10', 5: 'ctx level 0', 13: 'fixed z:9999' } }
          ] });
          frames.push({ narr: 'New root-context order: modal at 9999 is above the header at 10. In React this is <code>createPortal(modal, document.getElementById("modal-root"))</code>.', parts: [
            { type: 'stack', label: 'root context, bottom to top', items: ['html background', 'main + .card (level 0)', 'header z:10', '.modal z:9999'], hl: { 3: 'ok' } }
          ] });
        } else if (fix === 'remove-transform') {
          frames.push({ narr: '<b>Fix: remove the transform</b> from .card (animate with <code>box-shadow</code>/<code>translate</code> on a child, or only add the transform on hover if needed). The card is no longer a context, so the modal becomes a direct layer of the root context.', parts: [
            { type: 'tree', label: 'after: .card is a plain box', arr: bug, hl: { 5: 'ok', 11: 'ok' }, tags: { 1: 'ctx level 10', 5: 'no ctx', 11: 'fixed z:9999' } }
          ] });
          frames.push({ narr: 'Now the modal (9999) and the header (10) are in the same context and 9999 wins.', parts: [
            { type: 'stack', label: 'root context, bottom to top', items: ['html background', 'main + .card content', 'header z:10', '.modal z:9999'], hl: { 3: 'ok' } }
          ] });
        } else {
          frames.push({ narr: '<b>Fix: raise main.</b> Give <code>main</code> <code>position: relative; z-index: 20</code>. Now main is a context at level 20 (above the header\'s 10), and the card and modal ride inside it.', parts: [
            { type: 'tree', label: 'after: main is a context at 20', arr: bug, hl: { 2: 'ok' }, tags: { 1: 'ctx level 10', 2: 'ctx level 20', 5: 'ctx inside main', 11: 'z:9999 inside' } }
          ] });
          frames.push({ narr: 'The whole main sheet (with the modal) now paints above the header. Downside: <i>everything</i> in main now covers the header when scrolled under it, which may not be what you want for a sticky header.', parts: [
            { type: 'stack', label: 'root context, bottom to top', items: ['html background', 'header z:10', 'main z:20 [.card + .modal]'], hl: { 2: 'ok' } }
          ] });
        }
        return frames;
      }
    },
    {
      title: 'Paint order inside one stacking context',
      input: 'a:2 b:auto c:-1 d:5 e:0',
      inputLabel: 'positioned siblings as name:z-index (use auto for none), in DOM order',
      gen: function (input) {
        var toks = String(input).trim().split(/[\s,]+/);
        if (toks.length < 2 || toks.length > 8) throw new Error('Enter 2 to 8 items like "a:2 b:auto c:-1"');
        var els = toks.map(function (t, i) {
          var p = t.split(':');
          if (p.length !== 2 || !p[0]) throw new Error('Each item looks like name:z (z is a whole number or auto)');
          var z = p[1] === 'auto' ? 0 : Number(p[1]);
          if (isNaN(z) || z !== Math.floor(z)) throw new Error('z must be a whole number or auto');
          return { name: p[0], z: z, label: p[1], dom: i };
        });
        var neg = els.filter(function (e) { return e.z < 0; }).sort(function (a, b) { return a.z - b.z || a.dom - b.dom; });
        var zero = els.filter(function (e) { return e.z === 0; }).sort(function (a, b) { return a.dom - b.dom; });
        var pos = els.filter(function (e) { return e.z > 0; }).sort(function (a, b) { return a.z - b.z || a.dom - b.dom; });
        var fmt = function (e) { return e.name + ' (z:' + e.label + ')'; };
        var stack = ['context background'], frames = [];
        frames.push({ narr: 'All these elements are positioned siblings in <b>one</b> stacking context. Painting goes back to front. Step 1: the context root paints its own background and border first.', parts: [
          { type: 'stack', label: 'bottom to top', items: stack.slice(), hl: { 0: 'cur' } },
          { type: 'table', label: 'DOM order', columns: ['DOM #', 'name', 'z-index'], rows: els.map(function (e) { return [e.dom + 1, e.name, e.label]; }) }
        ] });
        neg.forEach(function (e) { stack.push(fmt(e)); });
        frames.push({ narr: 'Step 2: <b>negative z-index</b> children, most negative first. ' + (neg.length ? 'Here: ' + neg.map(fmt).join(', ') + '. They sit behind normal content, even behind the parent\'s text (but in front of the context\'s background).' : 'None in this example.'), parts: [
          { type: 'stack', label: 'bottom to top', items: stack.slice(), hl: neg.length ? (function () { var h = {}; neg.forEach(function (_, i) { h[1 + i] = 'ok'; }); return h; })() : {} }
        ] });
        stack.push('normal-flow blocks, floats, inline text');
        frames.push({ narr: 'Step 3: ordinary non-positioned content - blocks, then floats, then inline text. All of this paints <i>above</i> negative layers and <i>below</i> any positioned layer.', parts: [
          { type: 'stack', label: 'bottom to top', items: stack.slice(), hl: (function () { var h = {}; h[stack.length - 1] = 'win'; return h; })() }
        ] });
        var start = stack.length;
        zero.forEach(function (e) { stack.push(fmt(e)); });
        frames.push({ narr: 'Step 4: positioned children with <b>z-index auto or 0</b>, in DOM order (later in the DOM paints on top). ' + (zero.length ? 'Here: ' + zero.map(fmt).join(', ') + '.' : 'None in this example.'), parts: [
          { type: 'stack', label: 'bottom to top', items: stack.slice(), hl: (function () { var h = {}; zero.forEach(function (_, i) { h[start + i] = 'ok'; }); return h; })() }
        ] });
        start = stack.length;
        pos.forEach(function (e) { stack.push(fmt(e)); });
        frames.push({ narr: 'Step 5: <b>positive z-index</b>, smallest first; equal values fall back to DOM order. ' + (pos.length ? 'Here: ' + pos.map(fmt).join(', ') + '.' : 'None in this example.') + ' The last item in the stack is what the user sees on top.', parts: [
          { type: 'stack', label: 'final order, bottom to top', items: stack.slice(), hl: (function () { var h = {}; pos.forEach(function (_, i) { h[start + i] = 'sel'; }); return h; })() }
        ] });
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Absolute child lands in the wrong place', html: `<p>A "NEW" badge with <code>position: absolute; top: 0; right: 0</code> appears in the top-right of the <b>whole page</b> instead of the product card. Nothing between the badge and the page is positioned, so it anchors to the page. Add <code>position: relative</code> to the card (no offsets needed) and the card becomes the anchor.</p>`, code: cs(`.product { position: relative; }              /* the anchor */
.product .badge { position: absolute; top: 8px; right: 8px; }`, 'Give absolute an anchor') },
    { title: 'Sticky header that refuses to stick', html: `<p>You wrote <code>.header { position: sticky; top: 0 }</code> but it scrolls away. Checklist: (1) is there an ancestor with <code>overflow: hidden</code>, <code>auto</code> or <code>scroll</code>? That ancestor is now the scroller, and it never scrolls. Change it to <code>overflow: clip</code> (which does not create a scroll container) or remove it. (2) Is the header's parent exactly as tall as the header? A sticky element can never leave its parent, so if the header is wrapped in a tiny div it has no room to stick. Make the header a direct child of the tall page wrapper. (3) Did you forget <code>top</code>?</p>`, code: cs(`.app      { overflow: clip; }          /* instead of hidden: no scroll container, sticky still works */
.header   { position: sticky; top: 0; }`, 'overflow: clip keeps sticky alive') },
    { title: 'Opacity quietly creates a context', html: `<p>A dropdown with <code>z-index: 50</code> inside a card that you faded with <code>opacity: 0.99</code> is trapped inside that card. Opacity below 1 is one of the sneakiest triggers. The same goes for <code>filter: drop-shadow</code> and <code>transform</code>. When you see trapped layers, open DevTools - the Layers/3D panels and the computed-style panel show which ancestor is the folder.</p>` },
    { title: 'position: fixed inside a transformed parent', html: `<p>Normally <code>fixed</code> is measured from the viewport. If any ancestor has <code>transform</code>, <code>filter</code>, <code>perspective</code> or <code>contain: paint</code>, that ancestor becomes the <i>containing block</i> for fixed descendants too. A "full-screen overlay" suddenly only covers the animated card. The fix is the same as for z-index: move the overlay out with a portal.</p>` },
    { title: 'A small z-index scale beats 99999', html: `<p>Teams end up with <code>z-index: 99999</code> wars. Instead define a scale in one place (CSS variables) and use <code>isolation: isolate</code> on components so their internal z-indexes cannot leak. Reading <code>z-index: var(--z-modal)</code> is also self-documenting.</p>${H.table(['Layer', 'Value'], [['sticky header', '10'], ['dropdown / popover', '20'], ['modal + backdrop', '30'], ['toast', '40']])}` }
  ],
  deepDive: `<p>🟣 <b>What the spec actually says.</b> Stacking is defined in CSS 2.1 Appendix E ("Elaborate description of stacking contexts") plus the modern properties in CSS Positioned Layout. Painting is recursive: a context paints its background, then negative children, then in-flow, floats, inline, then <code>z-index: auto/0</code> positioned layers and positive layers; each child context is painted <i>atomically</i> as a unit at its parent's level. That atomic rule is the entire reason a high number cannot escape.</p>
  <p><b>z-index: auto is not 0.</b> A positioned element with <code>z-index: auto</code> does NOT start a context - its positioned children participate in the parent's context directly. With <code>z-index: 0</code> it does start one. They paint at the same level but behave differently for their descendants. (Exceptions: <code>fixed</code>/<code>sticky</code> always create one.)</p>
  <p><b>Compositing vs painting.</b> The browser may promote <code>transform</code>/<code>opacity</code>/<code>will-change</code> elements to their own GPU layer. Those triggers also make stacking contexts (partly why), but layers and stacking contexts are different ideas. Over-promotion costs memory; do not sprinkle <code>will-change</code> everywhere.</p>
  <p><b>Sticky internals.</b> Sticky position is computed from the nearest <i>scrolling ancestor</i>'s scrollport and constrained by the element's containing block. That is why the parent's height limits it, and why <code>overflow: hidden</code> (which creates a scroll container even if nothing scrolls) breaks it while <code>overflow: clip</code> does not.</p>
  <p><b>Top layer.</b> Native <code>&lt;dialog&gt;</code> opened with <code>showModal()</code> and elements with the popover attribute render in the browser's <b>top layer</b>, above every z-index and outside every stacking context. In 2026 this is the cleanest answer to "my modal is behind things": use <code>&lt;dialog&gt;</code> or <code>popover</code> instead of fighting z-index. You also get focus trapping, <code>Esc</code> to close and a styleable <code>::backdrop</code> for free.</p>
  <p><b>Accessibility.</b> Visual stacking never changes keyboard order or the accessibility tree. A modal painted on top still lets Tab reach the content beneath unless you trap focus or use <code>inert</code>.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> a chatbot can explain stacking contexts well and can often spot the culprit if you paste the ancestor chain. AI-generated components, however, tend to <i>cause</i> these bugs: random <code>z-index: 9999</code>, <code>transform: translateZ(0)</code> "for performance", and <code>overflow: hidden</code> on wrappers.</p>
  <p><b>Use AI as a partner:</b> give it the HTML plus the computed styles of each ancestor and ask <code>List every ancestor that creates a stacking context and the level it sits at in its parent context</code>. Ask for a z-index scale proposal for your whole app. Ask it to convert a hand-rolled modal into a native <code>&lt;dialog&gt;</code>.</p>
  <p><b>Where AI goes wrong:</b> its first answer is nearly always "increase the z-index" - which cannot work when the layer is trapped. It also forgets that <code>sticky</code> dies under <code>overflow: hidden</code>, and that fixed overlays break inside transformed parents.</p>
  <p><b>What you must still own:</b> reading the tree. Debugging stacking is "walk up the ancestors, find the first shared context, compare levels there". That mental model is exactly what the runnable detector above encodes, and it is a frequent interview question.</p>`,
  problems: [
    {
      title: 'Fix the Modal Hidden Behind the Sticky Header',
      level: 'Medium', tags: ['z-index', 'stacking context', 'transform', 'sticky'], companies: ['Meta', 'Airbnb'], lang: 'css',
      statement: `<p>The page has a sticky header (<code>z-index: 10</code>). A product card has <code>transform: translateZ(0)</code> for a hover animation, and a "Quick view" modal (<code>position: fixed; z-index: 9999</code>) is rendered <b>inside</b> the card. When the modal opens, the header still covers its top edge. Explain why, and give a fix that keeps the card hover animation and does not rely on bigger z-index numbers.</p>`,
      constraints: `You may change the CSS and move the modal element. Do not use <code>!important</code>. The hover animation on the card must remain.`,
      example: `${H.table(['Element', 'Creates context?', 'Level in root'], [['html', 'yes (root)', '-'], ['header (sticky)', 'yes', '10'], ['.card (transform)', 'yes', '0 (auto)'], ['.modal (fixed, 9999)', 'yes, inside .card', 'competes only inside .card']])}
      <p>At the root level the card paints at 0, below the header at 10, and the modal rides inside the card, so the header covers it.</p>`,
      brute: { why: `<p>"Just make the number bigger" fails: the modal's 9999 is compared only against siblings inside the card's context. Raising it to 99999 changes nothing. Setting a huge z-index on the card (e.g. 100) would work but then the whole card sits above the sticky header while scrolling, which looks wrong.</p>`, code: cs(`.modal { position: fixed; z-index: 999999; }   /* still trapped inside .card */
.card  { transform: translateZ(0); }`) },
      mcq: { q: 'Why does <code>z-index: 9999</code> on the modal lose to a header with <code>z-index: 10</code>?', options: ['The card created a stacking context at level 0, so the modal is compared only inside it', '9999 is above the maximum z-index value', 'position: fixed ignores z-index'], answer: 0, explain: 'transform creates a stacking context. Everything inside it is painted as one sheet at the card\'s level (0), which is below the header (10).' },
      hints: [`<p>Ask: which ancestor of the modal creates a stacking context?</p>`, `<p>Two clean exits: take the modal out of the card (portal), or stop the card from being a context.</p>`, `<p>Recipe: render the modal as a child of <code>&lt;body&gt;</code> (or a <code>#modal-root</code>) so it is a direct layer in the root context; give it <code>z-index: var(--z-modal)</code> (30). Or use a native <code>&lt;dialog&gt;</code>, which lives in the top layer.</p>`],
      solution: {
        approach: `<p>The card's transform makes it a stacking context at level 0. The modal's 9999 is trapped inside. Move the modal to the end of the body (portal) so it competes with the header in the <b>root</b> context, and use a small z-index scale. The card keeps its transform animation.</p>`,
        code: cs(`:root { --z-header: 10; --z-modal: 30; }

.site-header { position: sticky; top: 0; z-index: var(--z-header); }
.card        { transition: transform 0.2s; }
.card:hover  { transform: translateY(-4px); }      /* still allowed: the modal is no longer inside */

/* the modal now lives in <div id="modal-root"> at the end of <body> */
#modal-root .modal { position: fixed; inset: 0; z-index: var(--z-modal); }`),
        alt: [hm(`<body>
  <header class="site-header">Shop</header>
  <main>
    <article class="card">Product</article>      <!-- no modal inside the card any more -->
  </main>
  <div id="modal-root">
    <div class="modal" role="dialog" aria-modal="true">Quick view</div>
  </div>
</body>`, 'Modal moved out of the card'), cs(`/* Even simpler: a native dialog renders in the top layer, above all z-index values */
dialog::backdrop { background: rgb(0 0 0 / 0.5); }`, 'Native dialog alternative')],
        complexity: `<p>No runtime cost. Debug rule: first shared stacking context decides the winner.</p>`,
        followUps: ['What if you cannot move the modal in the DOM?', 'How does <code>isolation: isolate</code> on a component help?']
      }
    }
  ]
});
/* =====================================================================
   TOPIC 4 - MEDIA QUERIES AND MOBILE-FIRST
   ===================================================================== */
topics.push({
  title: 'Media Queries, Breakpoints and Mobile-First Design',
  analogy: `<p>Imagine packing for a trip. <b>Mobile-first</b> is packing a small backpack with only the essentials, then adding extra bags if you are driving instead of flying. <b>Desktop-first</b> is packing a huge suitcase and then taking things <i>out</i> for each smaller trip. Starting small means you never carry things you don't need, and a media query is simply the rule "if the trip is at least this long, bring one more bag".</p>`,
  explain: `<p>🟢 <b>What a media query is.</b> It is an <code>if</code> for CSS: "only apply these rules when the screen (or user preference) looks like this".</p>
  <pre>@media (min-width: 768px) {
  .nav { flex-direction: row; }
}</pre>
  <p>Read it as: "when the viewport is <b>at least</b> 768px wide, make the nav a row". Above the query is your <b>base</b> CSS that always applies.</p>
  <p>🔵 <b>Mobile-first in three steps.</b></p>
  <ol>
    <li>Write the base CSS for the <b>smallest</b> screen: single column, big tap targets, simple layout.</li>
    <li>Add <code>@media (min-width: ...)</code> blocks that <b>enhance</b> the layout as there is more room. Later blocks only add or override; they never need to "undo" a complicated desktop layout.</li>
    <li>Choose breakpoints where <b>your content breaks</b> (lines get too long, cards get too cramped), not at the exact size of a particular phone. Typical starting points: 600, 768, 1024, 1280 - but they are a menu, not a rule.</li>
  </ol>
  <p><b>min-width vs max-width.</b> <code>min-width</code> = "this wide or <i>wider</i>" and builds up (mobile-first). <code>max-width</code> = "this wide or <i>narrower</i>" and builds down (desktop-first). Mixing them causes overlaps: at exactly 768px both <code>(max-width: 768px)</code> and <code>(min-width: 768px)</code> match. Use the modern range syntax to avoid off-by-one fixes: <code>(width &lt; 768px)</code> and <code>(width &gt;= 768px)</code>.</p>
  ${H.table(['Viewport', 'Matches (min-width: 768px)?', 'Matches (min-width: 1024px)?', 'Layout'], [
    ['360px', H.c('r', 'no'), H.c('r', 'no'), '1 column (base)'],
    ['768px', H.c('g', 'yes'), H.c('r', 'no'), '2 columns'],
    ['1100px', H.c('g', 'yes'), H.c('g', 'yes'), '3 columns']
  ])}
  <p><b>Media features beyond width.</b> Queries can also ask about the <i>person</i> and their device, not just the window:</p>
  <ul>
    <li><code>(prefers-color-scheme: dark)</code> - the OS is in dark mode.</li>
    <li><code>(prefers-reduced-motion: reduce)</code> - the person asked for less animation (an accessibility must-honour).</li>
    <li><code>(hover: hover) and (pointer: fine)</code> - a mouse, so hover effects make sense; touch screens report <code>hover: none</code>.</li>
    <li><code>(orientation: landscape)</code>, <code>(min-resolution: 2dppx)</code>, and <code>print</code> for printing.</li>
  </ul>
  <p><b>Don't forget the viewport tag.</b> Without <code>&lt;meta name="viewport" content="width=device-width, initial-scale=1"&gt;</code> a phone pretends to be about 980px wide and zooms out, so your <code>min-width: 768px</code> rules would fire on a phone! This single line is required for mobile-first to work.</p>
  <p><b>Fluid between breakpoints.</b> Use <code>clamp()</code> for sizes that glide smoothly: <code>font-size: clamp(1rem, 0.9rem + 1vw, 1.5rem)</code> means "never below 1rem, never above 1.5rem, in between grow with the viewport". Fewer breakpoints are needed when the pieces themselves are fluid (<code>auto-fit</code> grids, <code>flex-wrap</code>, <code>clamp</code>).</p>`,
  clues: [
    '"Make it responsive" / "works on phone and desktop" - viewport meta + fluid units + a few <code>min-width</code> queries',
    '"Mobile-first" - base styles are the phone layout; queries use <code>min-width</code>',
    '"Honour the user\'s dark mode / reduce motion" - <code>prefers-color-scheme</code>, <code>prefers-reduced-motion</code>',
    '"Hover menu on touch devices is stuck open" - guard with <code>(hover: hover)</code>',
    '"Component should adapt to its own container, not the window" - container queries, not media queries',
    '"Breakpoints overlap at exactly 768px" - use the range syntax or 767.98px',
    '"Phone shows tiny desktop site" - the viewport meta tag is missing'
  ],
  code: [
    hm(`<!-- Required: tell the phone to use its real width -->
<meta name="viewport" content="width=device-width, initial-scale=1">`, 'Viewport meta tag'),
    cs(`/* BASE = phone. No media query needed. */
.layout { display: grid; gap: 16px; grid-template-columns: 1fr; padding: 16px; }
.layout > header, .layout > footer { grid-column: 1 / -1; }

/* >= 768px: add a sidebar */
@media (min-width: 768px) {
  .layout { grid-template-columns: 220px 1fr; }
}

/* >= 1024px: add a right rail */
@media (min-width: 1024px) {
  .layout { grid-template-columns: 220px 1fr 200px; padding: 32px; }
}

/* Preferences, not sizes */
@media (prefers-color-scheme: dark) { :root { color-scheme: dark; } }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
@media (hover: hover) and (pointer: fine) { .card:hover { transform: translateY(-4px); } }

/* Modern range syntax: no 767px / 768px overlap bugs */
@media (width < 768px)  { .only-phone  { display: block; } }
@media (width >= 768px) { .only-phone  { display: none; } }

/* Fluid type between breakpoints */
h1 { font-size: clamp(1.75rem, 1.2rem + 2vw, 3rem); }`, 'Mobile-first stylesheet'),
    jr(`// Evaluate width-based media queries and resolve "last matching rule wins".
function matches(query, width) {
  // supports: (min-width: Npx), (max-width: Npx), (width >= Npx), (width < Npx) joined by "and"
  return query.split(/\\s+and\\s+/).every(part => {
    let m = part.match(/\\((min|max)-width:\\s*(\\d+(?:\\.\\d+)?)px\\)/);
    if (m) return m[1] === 'min' ? width >= Number(m[2]) : width <= Number(m[2]);
    m = part.match(/\\(width\\s*(>=|<=|>|<)\\s*(\\d+(?:\\.\\d+)?)px\\)/);
    if (m) {
      const n = Number(m[2]);
      return { '>=': width >= n, '<=': width <= n, '>': width > n, '<': width < n }[m[1]];
    }
    return false;
  });
}

// Mobile-first rules in source order: base first, then min-width upgrades.
const rules = [
  { query: null, columns: 1 },
  { query: '(min-width: 768px)', columns: 2 },
  { query: '(min-width: 1024px)', columns: 3 }
];

function columnsAt(width) {
  let cols = null;
  for (const r of rules) {
    if (r.query === null || matches(r.query, width)) cols = r.columns; // later rule overrides earlier
  }
  return cols;
}

[360, 767, 768, 1023, 1024, 1440].forEach(w => {
  const hits = rules.filter(r => r.query && matches(r.query, w)).map(r => r.query);
  console.log(w + 'px -> ' + columnsAt(w) + ' column(s)', hits.length ? ' matched: ' + hits.join(' | ') : ' (base only)');
});

// the overlap bug with max-width + min-width at exactly 768px
console.log('768 matches max-width:768 ?', matches('(max-width: 768px)', 768), '| min-width:768 ?', matches('(min-width: 768px)', 768));
console.log('768 matches width < 768   ?', matches('(width < 768px)', 768), '| width >= 768 ?', matches('(width >= 768px)', 768));`, 'Runnable: media query matcher and mobile-first cascade')
  ],
  codeTitle: ['Viewport meta tag', 'Mobile-first stylesheet', 'Runnable: media query matcher and mobile-first cascade'],
  viz: [
    {
      title: 'Breakpoints switching the layout (mobile-first)',
      input: '360 768 1024 1440',
      inputLabel: 'Viewport widths to try (px), up to 8',
      gen: function (input) {
        var ws = String(input).trim().split(/[\s,]+/).map(Number);
        if (!ws.length || ws.length > 8 || ws.some(function (w) { return !(w >= 200 && w <= 4000); })) throw new Error('Enter 1 to 8 widths between 200 and 4000, e.g. "360 768 1024"');
        var CLS = { Header: 'win', Nav: 'ok', Main: 'sel', Aside: 'cur', Footer: 'done' };
        function layout(w) {
          if (w >= 1024) return { name: '3 columns', rows: [['Header', 'Header', 'Header'], ['Nav', 'Main', 'Aside'], ['Footer', 'Footer', 'Footer']], cols: ['220px', '1fr', '200px'] };
          if (w >= 768) return { name: '2 columns', rows: [['Header', 'Header'], ['Nav', 'Main'], ['Aside', 'Main'], ['Footer', 'Footer']], cols: ['220px', '1fr'] };
          return { name: '1 column', rows: [['Header'], ['Nav'], ['Main'], ['Aside'], ['Footer']], cols: ['1fr'] };
        }
        var frames = [];
        frames.push({ narr: 'Mobile-first: the <b>base</b> CSS is the phone layout (everything stacked). Two <code>min-width</code> queries add columns at 768px and 1024px. Watch the same five blocks rearrange as the viewport grows.', parts: [
          { type: 'table', label: 'Stylesheet', columns: ['rule', 'applies when', 'columns'], rows: [['base', 'always', '1fr'], ['@media (min-width: 768px)', 'viewport &gt;= 768px', '220px 1fr'], ['@media (min-width: 1024px)', 'viewport &gt;= 1024px', '220px 1fr 200px']] }
        ] });
        ws.forEach(function (w) {
          var L = layout(w), hl = {};
          L.rows.forEach(function (row, r) { row.forEach(function (cell, c) { hl[r + ',' + c] = CLS[cell]; }); });
          var m768 = w >= 768, m1024 = w >= 1024;
          frames.push({ narr: 'Viewport <b>' + w + 'px</b> gives <b>' + L.name + '</b>. ' + (m1024 ? 'Both queries match; the last one in the file wins for <code>grid-template-columns</code>.' : m768 ? 'Only the 768px query matches, so the sidebar appears.' : 'No query matches, so only the base phone layout applies.'), parts: [
            { type: 'grid', label: L.name + ' at ' + w + 'px', rows: L.rows, colHead: L.cols, rowHead: L.rows.map(function (_, i) { return 'row ' + (i + 1); }), hl: hl },
            { type: 'table', label: 'Which rules match?', columns: ['rule', 'match?'], rows: [['base', 'yes'], ['min-width: 768px', m768 ? 'YES' : 'no'], ['min-width: 1024px', m1024 ? 'YES' : 'no']], hl: m1024 ? { 2: 'ok' } : m768 ? { 1: 'ok' } : { 0: 'ok' } },
            { type: 'vars', vals: { viewport: w + 'px', 'grid-template-columns': L.cols.join(' ') } }
          ] });
        });
        frames.push({ narr: 'Because the base is the smallest layout, a phone downloads and parses <b>no desktop overrides it cannot use</b> (they sit behind failing queries), and each breakpoint only adds. Desktop-first would flip this: you would write the 3-column layout first and then undo it for phones.', parts: [
          { type: 'text', html: '<b>Rule of thumb:</b> content decides breakpoints. Resize the window; when the layout looks stretched or cramped, add a breakpoint right there.' }
        ] });
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Worked example: which rules apply at 800px?', html: `<p>Rules in source order: base (<code>columns: 1</code>), <code>min-width: 768px</code> (<code>columns: 2</code>), <code>min-width: 1024px</code> (<code>columns: 3</code>). At 800px: base applies, the 768 query matches (800 &ge; 768), the 1024 query does not. Equal specificity, so the <b>later matching rule wins</b>: <b>2 columns</b>. Order in the file matters. If the 1024 rule came first, the later 768 rule would override it at 1100px, and you would get 2 columns instead of 3.</p>` },
    { title: 'Worked example: the exact-768 overlap', html: `<p>Old-style code often has <code>@media (max-width: 768px) { ... }</code> for phones and <code>@media (min-width: 768px) { ... }</code> for desktops. At exactly 768px <b>both</b> match, so the layouts mix. Fix with range syntax: <code>(width &lt; 768px)</code> and <code>(width &gt;= 768px)</code>, or by using only min-width queries (mobile-first has no overlaps by design).</p>` },
    { title: 'Respect reduced motion and dark mode', html: `<p>Preferences are media features. Always provide a reduced-motion path for large animations and let the browser follow the OS theme.</p>`, code: cs(`:root { color-scheme: light dark; }               /* browser form controls follow the theme */
@media (prefers-reduced-motion: reduce) {
  .hero-bg { animation: none; }
  html { scroll-behavior: auto; }
}`, 'Preference media queries') },
    { title: 'Hover only where hover exists', html: `<p>On a phone a tap triggers <code>:hover</code> and it often "sticks" until you tap elsewhere. Wrap hover-only affordances in <code>@media (hover: hover)</code> so touch users get the clean version.</p>`, code: cs(`@media (hover: hover) {
  .menu li:hover > .submenu { display: block; }
}
.menu li:focus-within > .submenu { display: block; }  /* keyboard users always get it */`, 'Safe hover menus') },
    { title: 'Container queries: respond to the parent, not the window', html: `<p>A card in a wide main column and the same card in a narrow sidebar need different layouts at the <i>same</i> viewport width. Media queries can't tell them apart; <b>container queries</b> can. Mark the wrapper as a container, then query its width. Supported in all current browsers (Chrome 105+, Safari 16+, Firefox 110+).</p>`, code: cs(`.card-wrap { container-type: inline-size; }
.card { display: grid; gap: 8px; }
@container (min-width: 420px) {
  .card { grid-template-columns: 120px 1fr; }   /* image left, text right when the WRAPPER is wide */
}`, 'Container query') }
  ],
  deepDive: `<p>🟣 <b>How the browser evaluates queries.</b> Media queries are evaluated against the <i>viewport</i> (for width) and re-evaluated on resize, rotation, zoom and preference change. A rule inside a non-matching <code>@media</code> is simply ignored by the cascade; the stylesheet is still downloaded because it is linked or inlined (unless you split it with <code>&lt;link media="(min-width: 768px)"&gt;</code>, which is fetched at lower priority but still fetched).</p>
  <p><b>Units in queries.</b> <code>em</code> in a media query is relative to the browser's <i>initial</i> font size (16px by default), not your CSS. Breakpoints in <code>em</code> (48em = 768px) therefore react when a user bumps their default font size or zooms text, giving big-text users the roomy layout they need. Pixel breakpoints ignore font-size changes.</p>
  <p><b>Zoom is a width change.</b> Zooming a page to 200% halves the CSS-pixel viewport width. WCAG 1.4.10 (Reflow) requires content to work at 320 CSS px wide without two-dimensional scrolling, which is exactly why mobile-first single-column bases are accessible by default.</p>
  <p><b>Cascade order, not magic.</b> Media queries add <b>no specificity</b>. A base rule <code>.card.featured { ... }</code> beats a later <code>@media { .card { ... } }</code> because specificity is checked before source order. Keep selectors flat and let source order carry the breakpoints. Cascade layers (<code>@layer</code>) make this ordering explicit in big codebases.</p>
  <p><b>Fewer breakpoints, more fluidity.</b> Modern CSS reduces the need: <code>auto-fit/minmax</code> grids, <code>flex-wrap</code>, <code>clamp()</code>, <code>min()</code>/<code>max()</code>, <code>aspect-ratio</code>, intrinsic images (<code>max-width: 100%; height: auto</code>), and container queries / container units (<code>cqi</code>). Aim for 2-3 media queries per page, not 20.</p>
  <p><b>Images and performance.</b> Layout queries do not choose which image to download. Use <code>srcset</code>/<code>sizes</code> and <code>&lt;picture&gt;</code> for that, and avoid hiding big images with <code>display: none</code> (they may still download).</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> assistants and design tools generate a lot of responsive CSS, but often desktop-first with <code>max-width</code> queries at 480/768/1024 copied from old tutorials, and they pick breakpoints by device names ("iPad") that are outdated.</p>
  <p><b>Use AI as a partner:</b> ask <code>Convert this desktop-first stylesheet to mobile-first and list what each breakpoint adds</code>; ask it to find horizontal overflow at 320px; ask for a test matrix of widths (320, 375, 768, 1024, 1440) and zoom/text-size cases. Ask: <code>Replace these three breakpoints with auto-fit/clamp where possible</code>.</p>
  <p><b>Where AI goes wrong:</b> it forgets the viewport meta tag, mixes <code>max-width</code> and <code>min-width</code> so the exact boundary matches both, ignores <code>prefers-reduced-motion</code>, uses hover-only menus that fail on touch, and sprinkles <code>!important</code> inside media queries.</p>
  <p><b>What you must still own:</b> looking at the real layout at many widths (including browser zoom), choosing breakpoints from content, and keeping the number of queries small. A model can't see your design in a real browser unless you give it screenshots - and even then, check yourself.</p>`,
  problems: [
    {
      title: 'Mobile-First Navigation: Stacked on Phones, a Row on Tablets',
      level: 'Easy', tags: ['media query', 'mobile-first', 'flexbox', 'navigation'], companies: ['Microsoft', 'Zalando'], lang: 'css',
      statement: `<p>Build a site nav. On phones (under 768px) the links are stacked vertically, each a big 48px-tall tap target. From 768px up they sit in a single row, the logo on the left and the links pushed to the right. Write it <b>mobile-first</b> using a single media query.</p>`,
      constraints: `Use only <code>min-width</code>. No JavaScript. Tap targets at least 48px tall on mobile.`,
      example: `${H.table(['Viewport', 'Layout'], [['360px', 'logo on top, then four links stacked, each 48px tall'], ['768px+', 'logo left, four links in a row on the right']])}`,
      brute: { why: `<p>Desktop-first: write the row layout first, then override it for phones with <code>max-width</code>. You must remember to undo every desktop property, and at exactly 768px or on browsers with odd zoom you can get both layouts mixed.</p>`, code: cs(`.nav { display: flex; align-items: center; }
.nav ul { display: flex; margin-left: auto; }
@media (max-width: 768px) {            /* must UNDO everything above */
  .nav { flex-direction: column; align-items: stretch; }
  .nav ul { flex-direction: column; margin-left: 0; }
}`) },
      mcq: { q: 'In a mobile-first stylesheet, which query adds the desktop row layout?', options: ['<code>@media (min-width: 768px)</code>', '<code>@media (max-width: 767px)</code>', '<code>@media print</code>'], answer: 0, explain: 'Mobile-first writes the phone layout as the base and uses min-width to add behaviour as space grows.' },
      hints: [`<p>The base (no query) should already be the phone layout.</p>`, `<p>Make the nav a column flex in the base; links get <code>min-height: 48px</code> and <code>display: flex; align-items: center</code>.</p>`, `<p>In <code>@media (min-width: 768px)</code>: switch the nav to <code>flex-direction: row</code>, the list to a row and push it with <code>margin-left: auto</code>. Do not forget the viewport meta tag.</p>`],
      solution: {
        approach: `<p>Base CSS is the phone design: column flex, tall links. A single <code>min-width: 768px</code> query switches to a row and pushes the list to the right with an auto margin. No undoing of anything.</p>`,
        code: cs(`.nav { display: flex; flex-direction: column; }           /* phone: stacked */
.nav ul { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; }
.nav a  { display: flex; align-items: center; min-height: 48px; padding: 0 16px; } /* big tap target */

@media (min-width: 768px) {
  .nav { flex-direction: row; align-items: center; }       /* tablet+: one row */
  .nav ul { flex-direction: row; margin-left: auto; }      /* links pushed to the right */
}`),
        alt: [hm(`<meta name="viewport" content="width=device-width, initial-scale=1">
<nav class="nav">
  <a class="logo" href="/">Acme</a>
  <ul>
    <li><a href="/products">Products</a></li>
    <li><a href="/pricing">Pricing</a></li>
    <li><a href="/docs">Docs</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
</nav>`, 'Matching HTML')],
        complexity: `<p>One media query; the phone downloads nothing extra. Each new breakpoint only adds.</p>`,
        followUps: ['How would you add a hamburger toggle using <code>&lt;details&gt;</code> and no JS?', 'Convert the 768px to an em-based breakpoint and explain why.']
      }
    }
  ]
});
/* =====================================================================
   TOPIC 5 - TRANSITIONS AND ANIMATIONS
   ===================================================================== */
topics.push({
  title: 'Transitions, Keyframe Animations and Easing',
  analogy: `<p>A <b>transition</b> is like a lift: you press a button (a state change such as <code>:hover</code>) and the lift smoothly travels from floor A to floor B on its own. A <b>keyframe animation</b> is like a dance routine with marks on the stage: "at the start stand here, halfway be there, at the end be here" - and it can run by itself, repeat, and go back and forth, with no button press needed. <b>Easing</b> is the style of the move: a lift that speeds up then gently slows down feels natural, one that moves at robot-constant speed feels stiff.</p>`,
  explain: `<p>🟢 <b>Transition = smooth change between two states.</b> You say <i>which property</i>, <i>how long</i>, and <i>what easing</i>, on the element's normal state. When the property changes (hover, class toggled by JS, focus) the browser fills in the in-between frames.</p>
  <pre>.btn { background: #2563eb; transition: background-color 200ms ease, transform 200ms ease; }
.btn:hover { background: #1d4ed8; transform: translateY(-2px); }</pre>
  <p>Shorthand order: <code>transition: property duration timing-function delay</code>. Put it on the <b>base</b> state so it runs both ways (hover in <i>and</i> out).</p>
  <p>🔵 <b>Animation = a timeline you write yourself.</b> Define the timeline with <code>@keyframes</code>, then attach it with <code>animation</code>:</p>
  <pre>@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.loader { animation: spin 1s linear infinite; }</pre>
  ${H.table(['animation-*', 'Meaning', 'Common values'], [
    ['<code>name</code>', 'which @keyframes', 'spin, fade-in'],
    ['<code>duration</code>', 'one cycle length', '200ms, 1s'],
    ['<code>timing-function</code>', 'easing PER keyframe interval', 'ease, linear, cubic-bezier(), steps(4)'],
    ['<code>delay</code>', 'wait before start (negative = start mid-way)', '0s, 300ms'],
    ['<code>iteration-count</code>', 'how many cycles', '1, 3, infinite'],
    ['<code>direction</code>', 'play order', 'normal, reverse, alternate'],
    ['<code>fill-mode</code>', 'styles before/after running', 'none, forwards, backwards, both'],
    ['<code>play-state</code>', 'pause / resume', 'running, paused']
  ])}
  <p><b>Easing in numbers.</b> The easing function turns "fraction of time elapsed" t (0 to 1) into "fraction of the journey completed" (0 to 1). <code>linear</code>: 25% of the time = 25% of the way. <code>ease-in-out</code> at 25% of the time has only travelled about <b>13%</b> (slow start) and at 75% is at about <b>87%</b> (slow end). The default <code>ease</code> at half-time is already <b>80%</b> of the way there - it starts fast and slows down. For a box that slides 200px with <code>ease</code>, at half-time it sits at about 160.5px.</p>
  ${H.table(['Easing', 't = 25%', 't = 50%', 't = 75%'], [['linear', '25%', '50%', '75%'], ['ease', '40.9%', '80.2%', '96.0%'], ['ease-in', '9.3%', '31.5%', '62.2%'], ['ease-out', '37.8%', '68.5%', '90.7%'], ['ease-in-out', '12.9%', '50.0%', '87.1%']])}
  <p><b>Which properties are cheap to animate?</b> The browser pipeline is <i>layout -&gt; paint -&gt; composite</i>. Changing <code>width</code>, <code>height</code>, <code>top</code>, <code>margin</code> re-runs <b>layout</b> every frame (expensive). Changing <code>color</code>, <code>background</code>, <code>box-shadow</code> re-runs <b>paint</b> (medium). Changing only <code>transform</code> and <code>opacity</code> usually runs on the <b>compositor/GPU</b> and skips layout and paint (cheap, 60-120fps). Rule: <b>animate transform and opacity</b>.</p>
  <p><b>What cannot be transitioned.</b> Things with no "in between": <code>display: none -&gt; block</code> and <code>height: auto</code>. Modern fixes (2026): <code>@starting-style</code> + <code>transition-behavior: allow-discrete</code> to animate <code>display</code>/<code>overlay</code> for popovers and dialogs, and <code>interpolate-size: allow-keywords</code> to animate to <code>auto</code> in Chrome/Edge; the classic cross-browser trick is animating a grid row from <code>0fr</code> to <code>1fr</code>.</p>
  <p><b>Respect the user.</b> Wrap non-essential motion in <code>@media (prefers-reduced-motion: no-preference)</code> or turn it off inside <code>reduce</code>. Never auto-play something that flashes more than 3 times per second.</p>`,
  clues: [
    '"Smooth hover effect / fade on state change" - <code>transition</code>',
    '"Loading spinner / pulse / runs on its own / repeats" - <code>@keyframes</code> + <code>animation</code>',
    '"Keep the final state after the animation ends" - <code>animation-fill-mode: forwards</code>',
    '"Animation janks / drops frames" - animating layout properties; switch to <code>transform</code>/<code>opacity</code>',
    '"Animate height from 0 to auto" - <code>grid-template-rows: 0fr -> 1fr</code> or <code>interpolate-size</code>',
    '"Frame-by-frame sprite" - <code>steps(n)</code>',
    '"Users with vestibular disorders" - <code>prefers-reduced-motion</code>'
  ],
  code: [
    cs(`/* 1. Transition on the base state: works in both directions */
.card {
  transition: transform 200ms ease-out, box-shadow 200ms ease-out;
}
@media (hover: hover) {
  .card:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgb(0 0 0 / 0.15); }
}

/* 2. Keyframe animation */
@keyframes fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.toast { animation: fade-up 300ms ease-out both; }   /* both = fill-mode: hold first AND last frame */

/* 3. Pulsing skeleton with several keyframes (easing applies BETWEEN each pair) */
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.skeleton { animation: pulse 1.5s ease-in-out infinite; }

/* 4. Frame-by-frame with steps() */
.sprite { animation: walk 0.8s steps(8) infinite; }

/* 5. Always provide a calm path */
@media (prefers-reduced-motion: reduce) {
  .toast, .skeleton, .sprite { animation: none; }
  .card { transition: none; }
}`, 'Transitions and animations'),
    jr(`// Easing + keyframe interpolation calculator.
// cubic-bezier(x1,y1,x2,y2): returns progress (0..1) for time fraction t (0..1)
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = s => ((ax * s + bx) * s + cx) * s;   // x(s) of the curve
  const Y = s => ((ay * s + by) * s + cy) * s;   // y(s) of the curve
  return t => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let lo = 0, hi = 1, s = t;
    for (let i = 0; i < 40; i++) {               // x(s) is increasing, so bisect to find s with x(s) = t
      s = (lo + hi) / 2;
      if (X(s) < t) lo = s; else hi = s;
    }
    return Y(s);
  };
}
const easings = {
  linear: t => t,
  ease: bezier(0.25, 0.1, 0.25, 1),
  'ease-in': bezier(0.42, 0, 1, 1),
  'ease-out': bezier(0, 0, 0.58, 1),
  'ease-in-out': bezier(0.42, 0, 0.58, 1),
  'steps(4)': t => Math.floor(t * 4) / 4        // jump-end steps
};

console.log('progress at t = 0.25, 0.5, 0.75');
for (const [name, fn] of Object.entries(easings)) {
  console.log(name.padEnd(12), [0.25, 0.5, 0.75].map(t => (fn(t) * 100).toFixed(1) + '%').join('  '));
}

// Keyframes: [percent, value]. Easing applies INSIDE each pair of neighbouring keyframes.
function valueAt(keyframes, percent, easing) {
  for (let i = 0; i < keyframes.length - 1; i++) {
    const [p0, v0] = keyframes[i], [p1, v1] = keyframes[i + 1];
    if (percent >= p0 && percent <= p1) {
      const local = (percent - p0) / (p1 - p0);  // 0..1 inside this segment
      return v0 + (v1 - v0) * easing(local);
    }
  }
  return keyframes[keyframes.length - 1][1];
}
const kf = [[0, 0], [30, 100], [100, 40]];       // translateX in px
console.log('keyframes 0%:0px, 30%:100px, 100%:40px  (ease)');
for (const p of [0, 15, 30, 65, 100]) console.log(p + '% ->', valueAt(kf, p, easings.ease).toFixed(1) + 'px');`, 'Runnable: easing and keyframe calculator')
  ],
  codeTitle: ['Transitions and animations', 'Runnable: easing and keyframe calculator'],
  viz: [
    {
      title: 'Easing curves: progress over time',
      input: 'ease-in-out',
      inputLabel: 'linear, ease, ease-in, ease-out, ease-in-out, steps(4) or cubic-bezier(0.2, 0.8, 0.2, 1)',
      gen: function (input) {
        var s = String(input).trim().toLowerCase(), fn, m;
        function bezier(x1, y1, x2, y2) {
          var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
          var X = function (u) { return ((ax * u + bx) * u + cx) * u; }, Y = function (u) { return ((ay * u + by) * u + cy) * u; };
          return function (t) { if (t <= 0) return 0; if (t >= 1) return 1; var lo = 0, hi = 1, u = t; for (var i = 0; i < 40; i++) { u = (lo + hi) / 2; if (X(u) < t) lo = u; else hi = u; } return Y(u); };
        }
        if (s === 'linear') fn = function (t) { return t; };
        else if (s === 'ease') fn = bezier(0.25, 0.1, 0.25, 1);
        else if (s === 'ease-in') fn = bezier(0.42, 0, 1, 1);
        else if (s === 'ease-out') fn = bezier(0, 0, 0.58, 1);
        else if (s === 'ease-in-out') fn = bezier(0.42, 0, 0.58, 1);
        else if ((m = s.match(/^steps\((\d+)\)$/)) && Number(m[1]) >= 1 && Number(m[1]) <= 20) { var n = Number(m[1]); fn = function (t) { return Math.floor(t * n) / n; }; }
        else if ((m = s.match(/^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/)) && Number(m[1]) >= 0 && Number(m[1]) <= 1 && Number(m[3]) >= 0 && Number(m[3]) <= 1) fn = bezier(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]));
        else throw new Error('Try: linear, ease, ease-in, ease-out, ease-in-out, steps(4) or cubic-bezier(0.2, 0.8, 0.2, 1) (x values between 0 and 1)');
        var frames = [], vals = [], i;
        frames.push({ narr: 'A box slides 200px to the right over 1 second using <code>' + s + '</code>. Each step below samples the clock every 10%, and the bar shows how far (in px) the box has travelled. A straight staircase of bars would mean <code>linear</code>.', parts: [
          { type: 'bars', label: 'distance travelled (px) - empty so far', values: [0] }
        ] });
        for (i = 0; i <= 10; i++) {
          var t = i / 10, p = fn(t), px = Math.round(p * 2000) / 10;
          vals.push(px);
          var speed = i === 0 ? 0 : Math.round((vals[i] - vals[i - 1]) * 10) / 10;
          var hl = {}; hl[i] = 'cur';
          frames.push({ narr: 'At <b>' + Math.round(t * 100) + '%</b> of the time, the easing function says the box has done <b>' + Math.round(p * 1000) / 10 + '%</b> of the journey = <b>' + px + 'px</b>. ' + (i === 0 ? 'Start position.' : 'It moved <b>' + speed + 'px</b> in this last 10% slice - ' + (speed > 20 ? 'fast.' : speed < 20 ? 'slow.' : 'steady.')), parts: [
            { type: 'bars', label: 'distance at each 10% tick (px)', values: vals.slice(), texts: vals.map(function (v) { return v + ''; }), hl: hl, idxLabels: vals.map(function (_, k) { return (k * 10) + '%'; }) },
            { type: 'vars', vals: { time: Math.round(t * 100) + '%', progress: Math.round(p * 1000) / 10 + '%', 'translateX': px + 'px' }, hl: { progress: 'ok' } }
          ] });
        }
        return frames;
      }
    },
    {
      title: 'Keyframe timeline: interpolating between keyframes',
      input: '0:0, 30:100, 100:40',
      inputLabel: 'keyframes as percent:value, ascending (e.g. translateX in px)',
      gen: function (input) {
        var kf = String(input).split(',').map(function (t) { var p = t.trim().split(':').map(Number); return p; });
        if (kf.length < 2 || kf.length > 6 || kf.some(function (p) { return p.length !== 2 || isNaN(p[0]) || isNaN(p[1]) || p[0] < 0 || p[0] > 100; })) throw new Error('Format: "0:0, 30:100, 100:40" (percent:value, 2 to 6 keyframes)');
        for (var j = 1; j < kf.length; j++) if (kf[j][0] <= kf[j - 1][0]) throw new Error('Percentages must increase');
        if (kf[0][0] !== 0 || kf[kf.length - 1][0] !== 100) throw new Error('First keyframe must be 0% and last must be 100%');
        var frames = [], vals = [], r1 = function (x) { return Math.round(x * 10) / 10; };
        frames.push({ narr: 'The browser only stores your keyframes. For every moment in between it <b>linearly interpolates</b> (then applies easing inside each pair). Here are your ' + kf.length + ' keyframes.', parts: [
          { type: 'table', label: '@keyframes', columns: ['keyframe', 'value'], rows: kf.map(function (p) { return [p[0] + '%', p[1]]; }) },
          { type: 'bars', label: 'keyframe values', values: kf.map(function (p) { return p[1]; }), idxLabels: kf.map(function (p) { return p[0] + '%'; }) }
        ] });
        for (var pc = 0; pc <= 100; pc += 10) {
          var seg = 0;
          for (var i = 0; i < kf.length - 1; i++) if (pc >= kf[i][0] && pc <= kf[i + 1][0]) { seg = i; break; }
          var a = kf[seg], b = kf[seg + 1], local = (pc - a[0]) / (b[0] - a[0]), v = a[1] + (b[1] - a[1]) * local;
          vals.push(r1(v));
          var hl = {}; hl[vals.length - 1] = 'cur';
          frames.push({ narr: 'At <b>' + pc + '%</b> we are between the <b>' + a[0] + '%</b> and <b>' + b[0] + '%</b> keyframes, ' + Math.round(local * 100) + '% of the way through that gap. Value = ' + a[1] + ' + (' + b[1] + ' - ' + a[1] + ') x ' + r1(local) + ' = <b>' + r1(v) + '</b> (with linear easing).', parts: [
            { type: 'bars', label: 'value at each 10% tick', values: vals.slice(), texts: vals.map(String), hl: hl, idxLabels: vals.map(function (_, k) { return (k * 10) + '%'; }) },
            { type: 'vars', vals: { 'current %': pc + '%', segment: a[0] + '% to ' + b[0] + '%', value: r1(v) } }
          ] });
        }
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Worked example: animating a slide with ease (about 160.5px at half-time)', html: `<p>A panel slides 200px with <code>transition: transform 1s ease</code>. At 0.5s the time fraction is 0.5; the <code>ease</code> curve maps that to about <b>0.8024</b>, so the panel has already moved 200 x 0.8024 = about <b>160.5px</b>. It covers 80% of the distance in 50% of the time and spends the last half-second creeping the last 40px. With <code>ease-in-out</code> it would be exactly at 100px at half-time, and with <code>linear</code> also 100px.</p>` },
    { title: 'Worked example: animation-fill-mode', html: `<p>A banner has <code>animation: fade-in 1s</code>, <code>from {opacity:0} to {opacity:1}</code> and a <code>0.5s</code> delay. Without fill-mode: for the first 0.5s it shows at full opacity (its normal style!), then flickers to 0 and fades in. With <code>both</code>: <b>backwards</b> applies the first keyframe during the delay (so it stays invisible) and <b>forwards</b> keeps the last keyframe after the end. <code>animation: fade-in 1s 0.5s both</code> is the safe default for entrance animations.</p>`, code: cs(`.banner { animation: fade-in 1s ease 0.5s both; }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }`, 'fill-mode: both') },
    { title: 'Worked example: transform vs left (jank)', html: `<p>Moving a box 300px with <code>left</code> forces layout every frame (the browser recalculates positions of all affected neighbours). Moving it with <code>transform: translateX(300px)</code> only changes where the already-painted layer is composited. On a low-end phone the first can stutter at 20fps while the second holds 60fps.</p>`, code: cs(`.box.slow { transition: left 300ms; }              /* layout + paint every frame */
.box.fast { transition: transform 300ms; }         /* composite only */
.box.fast.moved { transform: translateX(300px); }`, 'Animate transform, not left') },
    { title: 'Worked example: smooth accordion with the 0fr to 1fr trick', html: `<p>You cannot transition <code>height: auto</code>. But you can transition a grid track from <code>0fr</code> to <code>1fr</code>, because both are numbers. The inner element needs <code>overflow: hidden</code> and <code>min-height: 0</code> so it can shrink to nothing.</p>`, code: cs(`.panel         { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 300ms ease; }
.panel.open    { grid-template-rows: 1fr; }
.panel > .body { overflow: hidden; min-height: 0; }`, 'Animate to auto height') },
    { title: 'Worked example: entry animation for display none', html: `<p>Showing a hidden element (display from <code>none</code> to <code>block</code>) used to skip transitions because it had no "before" state. <code>@starting-style</code> supplies that before state; <code>transition-behavior: allow-discrete</code> lets <code>display</code> itself take part. Supported in current Chrome, Safari and Firefox.</p>`, code: cs(`.popover { opacity: 1; transition: opacity 200ms, display 200ms allow-discrete; }
.popover[hidden] { opacity: 0; display: none; }
@starting-style { .popover { opacity: 0; } }   /* the "from" state when it first renders */`, '@starting-style') }
  ],
  deepDive: `<p>🟣 <b>The rendering pipeline.</b> Each frame is: style recalculation -&gt; layout -&gt; paint -&gt; composite. Compositor-only properties (<code>transform</code>, <code>opacity</code>, and <code>filter</code> in many engines) run on a separate thread, so animations stay smooth even if the main thread is busy with JavaScript. Layout properties run on the main thread and will stutter whenever JS blocks it. That is the practical reason for "animate transform and opacity".</p>
  <p><b>Easing is per interval.</b> <code>animation-timing-function</code> applies <i>between each pair of keyframes</i>, not across the whole animation. A 3-keyframe animation with <code>ease-in-out</code> eases in and out <b>twice</b>. To use a different easing on one segment, set <code>animation-timing-function</code> <i>inside</i> that keyframe block. The calculator above implements exactly this.</p>
  <p><b>Cubic-bezier maths.</b> A cubic-bezier easing is a curve from (0,0) to (1,1) with two control points; the browser solves for the curve parameter <i>s</i> where x(s) = elapsed fraction, then reads y(s). x1 and x2 must lie in [0,1] (so time never runs backwards); y values can exceed the range to create overshoot ("spring" feel). The newer <code>linear()</code> easing function takes a list of points and can describe bounces and springs without JavaScript.</p>
  <p><b>Interrupting a transition.</b> If the user un-hovers halfway, the transition reverses from the <i>current</i> value, and the browser shortens the reverse duration proportionally (the "reversing shortening factor"). That is why hover effects feel natural even with fast mouse movement. Animations, by contrast, restart from keyframes unless you manage them.</p>
  <p><b>Beyond CSS.</b> The Web Animations API (<code>element.animate()</code>) gives JS control with the same engine (pause, reverse, <code>finished</code> promise). Scroll-driven animations (<code>animation-timeline: scroll()</code> / <code>view()</code>) tie progress to scroll with no JS. The View Transitions API animates between DOM states or even pages. <b>FLIP</b> (First, Last, Invert, Play) is the pattern to animate layout changes with transforms: measure before and after, apply the inverse transform, then remove it with a transition.</p>
  <p><b>Pitfalls.</b> <code>will-change</code> reserves GPU memory - apply it briefly, not globally. Animating <code>box-shadow</code> on many elements is paint-heavy; animate the opacity of a pseudo-element holding the shadow instead. <code>transition: all</code> is convenient but animates things you didn't intend (including layout properties).</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> assistants can produce polished animations quickly (shimmer loaders, entrance effects, stagger delays) and can convert Figma motion specs to keyframes. Libraries like Framer Motion and animation helpers are routinely AI-suggested.</p>
  <p><b>Use AI as a partner:</b> ask <code>Rewrite this animation so it only uses transform and opacity</code>, <code>Add a prefers-reduced-motion variant</code>, <code>Explain the easing at t=0.25 and t=0.75 for this cubic-bezier</code>, or <code>Create a stagger using animation-delay with CSS variables</code>. Have it profile suggestions: ask which properties trigger layout.</p>
  <p><b>Where AI goes wrong:</b> <code>transition: all 0.3s</code> everywhere, animating <code>width</code>/<code>height</code>/<code>top</code>, forgetting fill-mode (flash of unstyled content), 5-second decorative animations, no reduced-motion fallback, and <code>will-change: transform</code> on dozens of elements.</p>
  <p><b>What you must still own:</b> choosing which motion actually helps users (feedback, continuity, attention) versus decoration, measuring frame cost in DevTools Performance, and accessibility. Be ready to explain why transform/opacity are cheap in an interview.</p>`,
  problems: [
    {
      title: 'Hover Lift Button and a Loading Spinner (with Reduced Motion)',
      level: 'Easy', tags: ['transition', 'keyframes', 'prefers-reduced-motion'], companies: ['Stripe', 'Spotify'], lang: 'css',
      statement: `<p>Create (1) a primary button that lifts 2px and gets a soft shadow on hover over 150ms with ease-out, and returns smoothly when the mouse leaves, and (2) a spinner that rotates forever in 1 second. For users who prefer reduced motion, the button must not move and the spinner should slow to a gentle 4s rotation (don't remove it entirely - users still need to see loading).</p>`,
      constraints: `Only animate <code>transform</code>, <code>opacity</code> or <code>box-shadow</code>. No JavaScript.`,
      example: `${H.table(['State', 'transform', 'duration'], [['idle', 'none', '-'], [':hover', 'translateY(-2px)', '150ms ease-out'], ['mouse leaves', 'back to none', 'same 150ms (transition lives on the base state)']])}`,
      brute: { why: `<p>Putting the <code>transition</code> only on <code>:hover</code> makes the hover-in smooth but the hover-out instant. <code>transition: all</code> and animating <code>margin-top</code> to lift the button re-runs layout and pushes neighbours around.</p>`, code: cs(`.btn:hover { margin-top: -2px; transition: all 0.15s; }   /* hover-out is instant; margin causes layout */`) },
      mcq: { q: 'Where should the <code>transition</code> declaration go so the hover-out is smooth too?', options: ['On the base <code>.btn</code> rule', 'Only on <code>.btn:hover</code>', 'Inside @keyframes'], answer: 0, explain: 'The transition used is the one on the element in its NEW state. Keeping it on the base rule means it applies both when entering and leaving :hover.' },
      hints: [`<p>Transitions belong to the element\'s resting style.</p>`, `<p>Lift with <code>transform: translateY(-2px)</code>, not margin or top.</p>`, `<p>Spinner: <code>@keyframes spin { to { transform: rotate(360deg); } }</code> with <code>animation: spin 1s linear infinite</code>. Under <code>prefers-reduced-motion: reduce</code>, set <code>animation-duration: 4s</code> and <code>transition: none</code> on the button.</p>`],
      solution: {
        approach: `<p>Base rule owns the transition; hover only changes the target values. The spinner uses linear easing (so it rotates at constant speed). The reduced-motion block removes the lift and slows (not stops) the spinner.</p>`,
        code: cs(`.btn {
  background: #2563eb; color: #fff; border: 0; padding: 12px 20px; border-radius: 8px;
  transition: transform 150ms ease-out, box-shadow 150ms ease-out;   /* on the BASE state: both directions */
}
@media (hover: hover) {
  .btn:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgb(37 99 235 / 0.35); }
}

@keyframes spin { to { transform: rotate(360deg); } }
.spinner {
  width: 24px; height: 24px; border: 3px solid #cbd5e1; border-top-color: #2563eb; border-radius: 50%;
  animation: spin 1s linear infinite;                                /* linear = constant speed */
}

@media (prefers-reduced-motion: reduce) {
  .btn { transition: none; }
  .btn:hover { transform: none; }
  .spinner { animation-duration: 4s; }                               /* calmer, still shows progress */
}`),
        complexity: `<p>Both effects are compositor-friendly (transform / opacity / shadow on one element).</p>`,
        followUps: ['How would you pause the spinner when the tab is hidden?', 'Why is <code>linear</code> right for a spinner but wrong for a hover lift?']
      }
    }
  ]
});
/* =====================================================================
   TOPIC 6 - CSS VARIABLES (CUSTOM PROPERTIES)
   ===================================================================== */
topics.push({
  title: 'CSS Variables (Custom Properties) and Theming',
  analogy: `<p>Think of the paint colours for a house. Instead of writing "#2563eb" on every wall, you write <b>"brand blue"</b> on a card at the front door. Every room says "use the front-door colour". To repaint the whole house you change one card. And a single room can pin up its <i>own</i> card that says "in here, brand blue means red" - the room (and everything inside it) now uses red, while the rest of the house is unchanged. CSS variables work exactly like those cards: <b>defined once, inherited downwards, overridable in any room</b>.</p>`,
  explain: `<p>🟢 <b>The basics.</b> A custom property name always starts with <code>--</code>. Define it on an element (usually <code>:root</code>, which is the <code>&lt;html&gt;</code> element) and read it anywhere with <code>var()</code>:</p>
  <pre>:root { --brand: #2563eb; --space: 8px; }
.btn  { background: var(--brand); padding: calc(var(--space) * 2); }</pre>
  <p><code>var(--name, fallback)</code> uses the fallback only when the variable is <b>not defined</b> at that element: <code>color: var(--accent, black)</code>.</p>
  <p>🔵 <b>They really cascade and inherit.</b> Unlike Sass variables, which vanish at build time, CSS variables live in the browser and follow the same rules as any inherited property. A child sees the value from the <b>nearest ancestor</b> that defines it.</p>
  ${H.table(['Element', 'Declares', '<code>var(--brand)</code> resolves to'], [
    [':root', '<code>--brand: #2563eb</code>', '#2563eb'],
    ['header', '(nothing)', '#2563eb (inherited from :root)'],
    ['main.card', '<code>--brand: #dc2626</code>', '#dc2626 (own value wins)'],
    ['button inside the card', '(nothing)', '#dc2626 (inherited from the card)']
  ])}
  <p>This is how you build themes and variants: change a few variables on a wrapper and every descendant updates, with no extra class on each child.</p>
  <pre>[data-theme="dark"] { --bg: #0f172a; --text: #e2e8f0; }
body { background: var(--bg); color: var(--text); }</pre>
  <p><b>Tokens in layers.</b> Good design systems use two levels: <i>primitive</i> tokens (<code>--blue-600: #2563eb</code>) and <i>semantic</i> tokens (<code>--color-primary: var(--blue-600)</code>). Components only use semantic tokens, so a theme change remaps semantic to different primitives.</p>
  <p><b>Runtime and JavaScript.</b> Variables can change at runtime: <code>el.style.setProperty('--x', '20px')</code> and read with <code>getComputedStyle(el).getPropertyValue('--x')</code>. This is the cleanest way to pass data from JS to CSS (mouse position, scroll progress, a computed hue) without touching many styles.</p>
  <p><b>What they cannot do.</b> You cannot use <code>var()</code> inside a media query condition (<code>@media (min-width: var(--bp))</code> does nothing), cannot build selectors or property names from variables, and a custom property by itself is just text - it is validated only when substituted into a real property. Missing variable with no fallback makes the property <b>invalid at computed-value time</b>, which acts like <code>unset</code>: inherited properties inherit, others fall back to their initial value.</p>
  <p><b>Typed variables with <code>@property</code>.</b> Register a variable with a type and initial value, and the browser can <b>animate</b> it (otherwise it is just a string and flips instantly): <code>@property --angle { syntax: '&lt;angle&gt;'; inherits: false; initial-value: 0deg; }</code>.</p>`,
  clues: [
    '"Dark mode" / "theme switcher" / "brand colours configurable" - semantic tokens as variables + attribute on <code>html</code>',
    '"Change one value and the whole UI updates" - custom properties on <code>:root</code>',
    '"Variant of a component" (danger button, compact card) - override variables on the variant class',
    '"Pass a value from JavaScript into CSS" - <code>style.setProperty("--x", ...)</code>',
    '"Animate a gradient / angle" - <code>@property</code> registration',
    '"Media query with a variable does not work" - variables are not allowed in media conditions',
    '"Why is my var() showing no colour?" - undefined variable with no fallback, or typo in the name'
  ],
  code: [
    cs(`/* Tokens: primitives -> semantic -> components */
:root {
  --blue-600: #2563eb;  --blue-700: #1d4ed8;
  --gray-50: #f8fafc;   --gray-900: #0f172a;

  --color-primary: var(--blue-600);
  --color-bg:      var(--gray-50);
  --color-text:    var(--gray-900);
  --space-1: 4px;  --space-2: 8px;  --space-3: 16px;
  --radius: 8px;
}

/* Dark theme: same names, new values. Choose by user attribute, default to the OS */
:root[data-theme="dark"] { --color-bg: #0b1220; --color-text: #e2e8f0; --color-primary: #60a5fa; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --color-bg: #0b1220; --color-text: #e2e8f0; --color-primary: #60a5fa; }
}

body  { background: var(--color-bg); color: var(--color-text); }
.btn  { background: var(--btn-bg, var(--color-primary));      /* fallback chain */
        padding: var(--space-2) var(--space-3); border-radius: var(--radius); }
.btn.danger { --btn-bg: #dc2626; }                             /* a variant is one line */`, 'Design tokens and theming'),
    jr(`// A tiny model of how the browser resolves custom properties down a DOM chain.
// Key facts: (1) inherit from parent, (2) own declarations win,
// (3) var() inside a custom property is substituted ON THE ELEMENT THAT DECLARES IT,
// (4) cycles make the value invalid.
const INVALID = '(invalid at computed-value time)';

function computeElement(own, inherited) {
  const out = Object.assign({}, inherited);
  const state = {};                              // name -> 'busy' | 'done' (for cycle detection)
  const get = name => {
    if (!(name in own)) return out[name];        // inherited (or undefined)
    if (state[name] === 'done') return out[name];
    if (state[name] === 'busy') return INVALID;  // we came back to ourselves: a cycle
    state[name] = 'busy';
    let invalid = false;
    const text = own[name].replace(/var\\(\\s*(--[\\w-]+)\\s*(?:,\\s*([^)]*?))?\\s*\\)/g, (all, ref, fallback) => {
      const v = get(ref);
      if (v === undefined || v === INVALID) {
        if (fallback !== undefined) return fallback;
        invalid = true;
        return '';
      }
      return v;
    });
    state[name] = 'done';
    out[name] = invalid ? INVALID : text;
    return out[name];
  };
  Object.keys(own).forEach(get);
  return out;
}

// :root > main.card > button
const tree = [
  { name: ':root',     own: { '--brand': '#2563eb', '--accent': 'var(--brand)', '--gap': '8px' } },
  { name: 'main.card', own: { '--brand': '#dc2626', '--radius': '12px' } },
  { name: 'button',    own: { '--gap': 'calc(var(--gap) * 2)' } } // self reference => cycle
];
let inherited = {};
for (const el of tree) {
  inherited = computeElement(el.own, inherited);
  console.log(el.name.padEnd(10), JSON.stringify(inherited));
}

// A used var() reads the computed value ON THE ELEMENT THAT USES IT:
const card = computeElement(tree[1].own, computeElement(tree[0].own, {}));
console.log('card: var(--brand) used directly  ->', card['--brand']);
console.log('card: --accent (was var(--brand) on :root) ->', card['--accent'], '(already resolved at :root!)');
console.log('undefined var with fallback:', card['--missing'] === undefined ? 'use fallback' : card['--missing']);`, 'Runnable: custom property resolver')
  ],
  codeTitle: ['Design tokens and theming', 'Runnable: custom property resolver'],
  viz: [
    {
      title: 'Resolving var(--name) up the DOM tree',
      input: 'button --brand',
      inputLabel: 'element (root, header, card, logo, button, note) and variable (--brand, --gap, --radius, --shadow)',
      gen: function (input) {
        var t = String(input).trim().split(/\s+/);
        var idxOf = { root: 0, header: 1, card: 2, logo: 3, button: 5, note: 6 };
        if (t.length !== 2 || !(t[0] in idxOf) || !/^--[a-z-]+$/.test(t[1])) throw new Error('Try: "button --brand" (elements: root header card logo button note)');
        var arr = [':root', 'header', 'main.card', 'a.logo', null, 'button', 'p.note'];
        var decl = { 0: { '--brand': '#2563eb', '--gap': '8px' }, 2: { '--brand': '#dc2626', '--radius': '12px' }, 5: { '--gap': '16px' } };
        var parent = function (i) { return (i - 1) >> 1; };
        var name = t[1], start = idxOf[t[0]], frames = [], cur = start, visited = {}, found = -1;
        var declText = function (i) { var d = decl[i]; return d ? Object.keys(d).map(function (k) { return k + ': ' + d[k]; }).join('; ') : 'nothing'; };
        frames.push({ narr: 'We need <code>var(' + name + ')</code> on <b>' + arr[start] + '</b>. A custom property is inherited, so the browser looks at the element itself first, then climbs to the parent, grandparent... until some element <i>declares</i> it.', parts: [
          { type: 'tree', label: 'DOM tree (each node may declare variables)', arr: arr, hl: (function () { var h = {}; h[start] = 'cur'; return h; })(), tags: { 0: '--brand, --gap', 2: '--brand, --radius', 5: '--gap' } }
        ] });
        while (true) {
          visited[cur] = 'win';
          var d = decl[cur], has = d && (name in d);
          if (has) {
            found = cur;
            var hh = {}; Object.keys(visited).forEach(function (k) { hh[k] = 'win'; }); hh[cur] = 'sel';
            frames.push({ narr: 'Check <b>' + arr[cur] + '</b>: it declares <code>' + name + ': ' + d[name] + '</code>. <span class="c-g">Found - this value is used.</span>' + (cur !== start ? ' (It was inherited down ' + (function () { var n = 0, x = start; while (x !== cur) { x = parent(x); n++; } return n; })() + ' level(s).)' : ''), parts: [
              { type: 'tree', label: 'walking up', arr: arr, hl: hh },
              { type: 'vars', vals: (function () { var v = {}; v[name] = d[name]; return v; })(), hl: (function () { var v = {}; v[name] = 'ok'; return v; })() }
            ] });
            break;
          }
          var h2 = {}; Object.keys(visited).forEach(function (k) { h2[k] = 'win'; }); h2[cur] = 'cur';
          frames.push({ narr: 'Check <b>' + arr[cur] + '</b>: declares ' + declText(cur) + '. <span class="c-r">No ' + name + ' here</span>' + (cur === 0 ? ' and we are already at the top.' + '' : ', go to the parent.'), parts: [
            { type: 'tree', label: 'walking up', arr: arr, hl: h2 }
          ] });
          if (cur === 0) break;
          cur = parent(cur);
        }
        frames.push({ narr: found >= 0 ? 'Result: <code>var(' + name + ')</code> on <b>' + arr[start] + '</b> = <b>' + decl[found][name] + '</b>, declared by <b>' + arr[found] + '</b>. With a fallback, e.g. <code>var(' + name + ', black)</code>, the fallback would be ignored because the variable exists.' : 'Result: <code>' + name + '</code> is not declared anywhere on the path. <code>var(' + name + ', black)</code> would use <b>black</b>; with no fallback the property becomes <b>invalid at computed-value time</b> (acts like <code>unset</code>).', parts: [
          { type: 'vars', vals: { element: arr[start], variable: name, 'declared by': found >= 0 ? arr[found] : '(nobody)', value: found >= 0 ? decl[found][name] : 'fallback / unset' }, hl: { value: found >= 0 ? 'ok' : 'bad' } }
        ] });
        frames.push({ narr: 'Remember the scoping rule: overriding a variable on a wrapper changes it for <b>everything inside</b>, and only inside. That is how component variants and themes work.', parts: [
          { type: 'table', label: 'who declares what', columns: ['element', 'declares'], rows: [[':root', declText(0)], ['main.card', declText(2)], ['button', declText(5)]] }
        ] });
        return frames;
      }
    },
    {
      title: 'Theme switch: same names, different values',
      input: 'dark',
      inputLabel: 'Theme: light or dark',
      gen: function (input) {
        var th = String(input).trim().toLowerCase();
        if (th !== 'light' && th !== 'dark') throw new Error('Type light or dark');
        var tokens = [
          ['--color-bg', '#f8fafc', '#0b1220'], ['--color-text', '#0f172a', '#e2e8f0'], ['--color-primary', '#2563eb', '#60a5fa'], ['--color-border', '#cbd5e1', '#334155'], ['--radius', '8px', '8px']
        ];
        var frames = [];
        frames.push({ narr: 'Components never use raw colours. They use semantic tokens such as <code>var(--color-bg)</code>. The <b>light</b> values are defined once on <code>:root</code>.', parts: [
          { type: 'table', label: ':root (default / light)', columns: ['token', 'value'], rows: tokens.map(function (r) { return [r[0], r[1]]; }) }
        ] });
        frames.push({ narr: 'A component such as a card reads those names: <code>background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border)</code>. It contains <b>no theme logic at all</b>.', parts: [
          { type: 'code', label: 'component CSS', lang: 'css', code: '.card {\n  background: var(--color-bg);\n  color: var(--color-text);\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius);\n}', hl: { 2: 'cur', 3: 'cur', 4: 'cur' } }
        ] });
        frames.push({ narr: 'The dark theme redeclares only the tokens that change, on <code>[data-theme="dark"]</code> (or inside <code>@media (prefers-color-scheme: dark)</code> as the default). The radius is not mentioned, so it stays inherited.', parts: [
          { type: 'code', label: 'theme override', lang: 'css', code: ':root[data-theme="dark"] {\n  --color-bg: #0b1220;\n  --color-text: #e2e8f0;\n  --color-primary: #60a5fa;\n  --color-border: #334155;\n}', hl: { 2: 'ok', 3: 'ok', 4: 'ok', 5: 'ok' } }
        ] });
        var col = th === 'dark' ? 2 : 1;
        var hl = {};
        tokens.forEach(function (r, i) { if (r[1] !== r[2] && th === 'dark') hl[i] = 'ok'; });
        frames.push({ narr: 'Active theme: <b>' + th + '</b>. ' + (th === 'dark' ? 'Four tokens changed (green); every component using them restyles instantly, with no per-component code.' : 'Nothing is overridden, so the :root values apply.') + ' JS only has to set <code>document.documentElement.dataset.theme = "' + th + '"</code> (and remember it in localStorage).', parts: [
          { type: 'table', label: 'computed values on the page', columns: ['token', 'value'], rows: tokens.map(function (r) { return [r[0], r[col]]; }), hl: hl }
        ] });
        frames.push({ narr: 'Prevent a flash of the wrong theme: set the attribute with a tiny inline script in <code>&lt;head&gt;</code> before the first paint, and add <code>color-scheme: light dark</code> so built-in controls (scrollbars, inputs) match.', parts: [
          { type: 'text', html: '<b>Pattern:</b> user choice (attribute) &gt; OS preference (media query) &gt; light default.' }
        ] });
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Worked example: a component variant in one line', html: `<p>Instead of writing <code>.btn-danger { background: #dc2626; border-color: #dc2626; box-shadow: ... }</code> in five places, make the button read <code>var(--btn-bg)</code> for everything colour-related and let a variant set only that variable. The variant class changes one declaration and the button picks up the new colour for background, border and focus ring.</p>`, code: cs(`.btn { --btn-bg: var(--color-primary);
       background: var(--btn-bg); border: 1px solid var(--btn-bg);
       box-shadow: 0 0 0 0 var(--btn-bg); }
.btn:focus-visible { box-shadow: 0 0 0 3px color-mix(in srgb, var(--btn-bg) 40%, transparent); }
.btn.danger  { --btn-bg: #dc2626; }
.btn.success { --btn-bg: #16a34a; }`, 'Variants via variables') },
    { title: 'Worked example: fallbacks and invalid values', html: `<p><code>color: var(--accent, #333)</code> uses <code>#333</code> only if <code>--accent</code> is <i>undefined</i>. A defined-but-wrong value (like <code>--accent: 12px</code>) is NOT replaced by the fallback; the declaration becomes invalid at computed-value time and the property falls back to inherited/initial (for <code>color</code> that means the parent's colour). You can chain fallbacks: <code>var(--btn-bg, var(--color-primary, blue))</code>. An empty fallback is allowed: <code>var(--x,)</code>.</p>` },
    { title: 'Worked example: JavaScript feeds CSS', html: `<p>Set one variable from JS and let CSS do the visual work. This spotlight effect updates a single property on mouse move instead of recalculating styles for many elements.</p>`, code: jc(`const card = document.querySelector('.spotlight');
card.addEventListener('pointermove', (e) => {
  const r = card.getBoundingClientRect();
  card.style.setProperty('--mx', (e.clientX - r.left) + 'px');   // CSS reads var(--mx)
  card.style.setProperty('--my', (e.clientY - r.top) + 'px');
});
// CSS: .spotlight { background: radial-gradient(200px at var(--mx, 50%) var(--my, 50%), #fff3, transparent); }
const brand = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();`, 'setProperty / getPropertyValue') },
    { title: 'Worked example: animating with @property', html: `<p>A plain custom property is a string, so a transition on it jumps. Registering it with <code>@property</code> tells the browser it is an angle, so it can interpolate smoothly. This makes spinning conic gradients and animated gradient borders possible with pure CSS.</p>`, code: cs(`@property --angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
.ring { background: conic-gradient(from var(--angle), #2563eb, #22d3ee, #2563eb); animation: turn 3s linear infinite; }
@keyframes turn { to { --angle: 360deg; } }`, '@property') },
    { title: 'Worked example: the surprising self-reference', html: `<p>You cannot write <code>--gap: calc(var(--gap) * 2)</code> on the same element expecting "double the parent's gap". A property that refers to itself forms a cycle and becomes invalid. Use a different name: <code>--gap-lg: calc(var(--gap) * 2)</code>. The runnable resolver above shows the cycle being detected.</p>` }
  ],
  deepDive: `<p>🟣 <b>When does substitution happen?</b> <code>var()</code> inside a normal property is substituted at computed-value time, <i>after</i> the cascade picks the winning declaration. Inside another custom property it is substituted on the element that <b>declares</b> that custom property, and children inherit the <b>already resolved</b> text. So with <code>:root { --brand: blue; --accent: var(--brand); }</code> and <code>.card { --brand: red; }</code>, <code>var(--brand)</code> inside the card is red, but <code>var(--accent)</code> inside the card is still <b>blue</b>. To make --accent follow the card, redeclare <code>--accent: var(--brand)</code> on the card (or on every element: <code>* { --accent: var(--brand) }</code>). The runnable resolver demonstrates this.</p>
  <p><b>Performance.</b> Changing a variable on <code>:root</code> forces style recalculation for every element that depends on it - cheap for a theme switch, costly if you update it 60 times a second on the root (a scroll-driven animation on root can touch thousands of nodes). Scope fast-changing variables to the smallest element that needs them (like the spotlight card above). Variable lookups themselves are fast.</p>
  <p><b>Registered properties.</b> <code>@property</code> (also <code>CSS.registerProperty()</code> in JS) gives a variable a syntax (<code>&lt;color&gt;</code>, <code>&lt;length&gt;</code>, <code>&lt;number&gt;</code>, <code>&lt;percentage&gt;</code>...), an <code>inherits</code> flag and an initial value. Benefits: type safety, animatable values, and cheaper invalidation when <code>inherits: false</code>.</p>
  <p><b>Tokens at scale.</b> Treat variables as a public API: prefix them (<code>--ds-color-primary</code>), keep a clear naming convention (<code>--space-1..8</code>, <code>--font-size-sm</code>), document which are public, and avoid component CSS reading global primitives directly. For white-label products, a theme is just a block of variable overrides loaded as a stylesheet or set via <code>style</code> on a wrapper.</p>
  <p><b>Modern companions.</b> <code>color-mix(in oklch, var(--brand) 20%, white)</code> creates tints without precomputing them; <code>light-dark(#fff, #000)</code> picks per colour scheme; relative colour syntax (<code>oklch(from var(--brand) calc(l + 0.1) c h)</code>) derives hover colours. Together they remove most of the need for a Sass colour function.</p>
  <p><b>Security and robustness.</b> If you let users supply theme values (for example from a database), validate them - a value like <code>url(...)</code> inside a custom property can later be used in a <code>background</code> and trigger a network request. And remember printing: many designs need a <code>@media print</code> block resetting tokens to black-on-white.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> design-to-code tools and chat assistants can export a palette to tokens, create a dark theme, and generate a scale (spacing, type, radii) from a brand colour. Tailwind and other utility frameworks expose their theme as CSS variables, so these skills transfer.</p>
  <p><b>Use AI as a partner:</b> ask <code>Extract every repeated colour, spacing and radius from this stylesheet into semantic tokens with a naming convention</code>; ask <code>Generate WCAG AA-contrast pairs for light and dark themes and show the ratios</code>; ask for a migration plan from Sass variables to CSS variables, and for tests that fail if a hard-coded hex slips back in.</p>
  <p><b>Where AI goes wrong:</b> it creates dozens of near-duplicate tokens (<code>--blue-1</code>, <code>--blue-main</code>, <code>--primary-blue</code>), uses raw primitives in components, forgets <code>color-scheme</code>, puts <code>var()</code> inside media queries, and misjudges the "resolved at the declaring element" rule so the theme only half-switches.</p>
  <p><b>What you must still own:</b> the token vocabulary (it is your design language), accessibility contrast checks, understanding scope/inheritance well enough to debug "why is this still the old colour?", and a deliberate dark-mode story (user choice vs OS default).</p>`,
  problems: [
    {
      title: 'Light / Dark Theme with Design Tokens',
      level: 'Medium', tags: ['css variables', 'theming', 'dark mode', 'prefers-color-scheme'], companies: ['Notion', 'GitHub'], lang: 'css',
      statement: `<p>Add dark mode to a small app. Requirements: (1) components use only semantic tokens (<code>--color-bg</code>, <code>--color-text</code>, <code>--color-primary</code>), (2) with no saved choice, follow the OS (<code>prefers-color-scheme</code>), (3) a toggle button can force <code>light</code> or <code>dark</code> by setting <code>data-theme</code> on <code>&lt;html&gt;</code>, and the forced choice beats the OS setting, (4) a danger button variant overrides one variable only.</p>`,
      constraints: `No duplicated component CSS between themes. A forced "light" must stay light even if the OS is dark.`,
      example: `${H.table(['data-theme', 'OS setting', 'Result'], [['(none)', 'light', 'light'], ['(none)', 'dark', 'dark'], ['light', 'dark', H.c('g', 'light (user wins)')], ['dark', 'light', H.c('g', 'dark (user wins)')]])}`,
      brute: { why: `<p>Duplicate every component rule inside a <code>.dark</code> class (<code>.dark .card {...}</code>, <code>.dark .btn {...}</code>). Every new component needs a second rule; themes drift apart, and specificity fights begin.</p>`, code: cs(`.card { background: #fff; color: #111; }
.btn  { background: #2563eb; color: #fff; }
.dark .card { background: #111; color: #eee; }          /* duplicated for every component */
.dark .btn  { background: #60a5fa; color: #000; }`) },
      mcq: { q: 'How do you make a forced <code>data-theme="light"</code> beat the OS dark preference?', options: ['Apply the media-query dark tokens only to <code>:root:not([data-theme="light"])</code>', 'Use <code>!important</code> on every colour', 'Put <code>var()</code> inside the media query condition'], answer: 0, explain: 'The OS-driven dark block excludes the root when the user has forced light, so explicit attribute rules and the default light tokens apply.' },
      hints: [`<p>Components should know nothing about themes - only token names.</p>`, `<p>Define the light tokens on <code>:root</code>. Override them under <code>:root[data-theme="dark"]</code> and under the media query.</p>`, `<p>In the media query guard with <code>:root:not([data-theme="light"])</code> so a forced light wins. Add <code>color-scheme</code> to match built-in controls. A variant sets <code>--btn-bg</code> only.</p>`],
      solution: {
        approach: `<p>Three blocks of tokens: default (light), forced dark, and OS dark that steps aside if the user forced light. Components read tokens; the danger variant overrides a single variable.</p>`,
        code: cs(`:root {
  color-scheme: light;
  --color-bg: #f8fafc; --color-text: #0f172a; --color-primary: #2563eb;
}
:root[data-theme="dark"] {                       /* explicit user choice */
  color-scheme: dark;
  --color-bg: #0b1220; --color-text: #e2e8f0; --color-primary: #60a5fa;
}
@media (prefers-color-scheme: dark) {            /* OS default, unless the user forced light */
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --color-bg: #0b1220; --color-text: #e2e8f0; --color-primary: #60a5fa;
  }
}

body { background: var(--color-bg); color: var(--color-text); }
.btn { --btn-bg: var(--color-primary); background: var(--btn-bg); color: #fff; border: 0; padding: 8px 16px; border-radius: 8px; }
.btn.danger { --btn-bg: #dc2626; }               /* one variable, one line */`),
        alt: [jc(`// Toggle: light -> dark -> follow OS (remove attribute). Run early in <head> to avoid a flash.
const root = document.documentElement;
function setTheme(theme) {
  if (theme === 'system') { root.removeAttribute('data-theme'); localStorage.removeItem('theme'); return; }
  root.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}
const saved = localStorage.getItem('theme');
if (saved) root.setAttribute('data-theme', saved);`, 'Theme toggle')],
        complexity: `<p>O(1) per theme switch for you; the browser restyles only elements that read changed tokens.</p>`,
        followUps: ['How do you avoid the flash of the wrong theme on first paint?', 'Add a third "high contrast" theme using only token overrides.']
      }
    }
  ]
});
/* =====================================================================
   PRACTICE - EASY
   ===================================================================== */
practice.push({
  title: 'Centre Anything, Four Ways', level: 'Easy', tags: ['centering', 'flexbox', 'grid', 'absolute'], companies: ['Google', 'Amazon', 'Meta'], lang: 'css',
  statement: `<p>The classic interview opener: centre a box <b>both horizontally and vertically</b> inside its parent. Show four different techniques (flexbox, grid, absolute with <code>inset</code> and auto margins, absolute with transform) and say when you would use each. The parent is <code>400px</code> tall; the child has an unknown size except in the absolute-with-margin version.</p>`,
  constraints: `No JavaScript. The child may be any size. Must work without knowing the child's width or height (except where noted).`,
  example: `<p>Parent 400 x 400, child 100 x 60.</p>${H.table(['Axis', 'Free space', 'Offset from edge'], [['Horizontal', '400 - 100 = 300', H.c('g', '150px each side')], ['Vertical', '400 - 60 = 340', H.c('g', '170px top and bottom')]])}<p>Every technique has to produce those 150px / 170px margins around the child.</p>`,
  brute: { why: `<p>Hard-coded margins only work for one exact child size and one exact parent size. Any change in text length, font size or screen size breaks it.</p>`, code: cs(`.parent { height: 400px; }
.child  { width: 100px; height: 60px; margin-left: 150px; margin-top: 170px; }  /* magic numbers */`) },
  mcq: { q: 'Which is the shortest way to centre one child both ways without knowing its size?', options: ['<code>display: grid; place-items: center</code> on the parent', '<code>text-align: center</code> on the parent', '<code>margin: 0 auto</code> on the child'], answer: 0, explain: 'place-items is shorthand for align-items + justify-items, so a grid with one cell centres the child on both axes. text-align and margin auto only help horizontally.' },
  hints: [`<p>Think: which parent display modes give you control over both axes?</p>`, `<p>Flex: <code>justify-content</code> (main axis) and <code>align-items</code> (cross axis) both set to <code>center</code>. Grid: <code>place-items: center</code>.</p>`, `<p>Absolute: parent needs <code>position: relative</code>. Then either <code>inset: 0; margin: auto</code> with a known width and height, or <code>top: 50%; left: 50%; transform: translate(-50%, -50%)</code> for unknown size.</p>`],
  solution: {
    approach: `<p>Modern layouts: flexbox or grid (best default). Absolute techniques are for overlays and badges. Mention <code>margin: auto</code> inside a flex/grid child as a fifth option.</p>`,
    code: cs(`/* 1. Flexbox - best when the parent already is a flex row */
.a { display: flex; justify-content: center; align-items: center; height: 400px; }

/* 2. Grid - shortest */
.b { display: grid; place-items: center; height: 400px; }

/* 3. Absolute + inset + auto margins - needs a known width AND height */
.c { position: relative; height: 400px; }
.c > .child { position: absolute; inset: 0; width: 100px; height: 60px; margin: auto; }

/* 4. Absolute + transform - works for unknown size (but may blur text on odd pixels) */
.d { position: relative; height: 400px; }
.d > .child { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }

/* Bonus: auto margins inside flex/grid */
.e { display: flex; height: 400px; }
.e > .child { margin: auto; }`),
    complexity: `<p>All are O(1) layout work. Prefer flex/grid; avoid the transform trick for text-heavy children (sub-pixel blur) and in the layout flow.</p>`,
    followUps: ['How do you centre vertically in the viewport with <code>100dvh</code>?', 'Centre text inside a button using only line-height.']
  }
});

practice.push({
  title: 'Navbar: Logo Left, Links Right, Button Far Right', level: 'Easy', tags: ['flexbox', 'margin auto', 'gap'], companies: ['Shopify', 'Atlassian'], lang: 'css',
  statement: `<p>Build a one-row header: a logo on the far left, a group of text links, then a "Sign up" button at the far right. The links should sit next to the button, <b>not</b> next to the logo. All items are vertically centred and spaced 16px apart. Do not add spacer elements.</p>`,
  constraints: `Use flexbox. HTML: <code>&lt;header class="bar"&gt;&lt;a class="logo"&gt;...&lt;/a&gt;&lt;nav&gt;...&lt;/nav&gt;&lt;button&gt;Sign up&lt;/button&gt;&lt;/header&gt;</code>. No float, no fixed widths.`,
  example: `<p>Container 1000px wide: logo 100px, nav 300px, button 100px, gaps 16px. Free space = 1000 - 500 - 32 = 468px. An <code>auto</code> left margin on <code>nav</code> takes all 468px, pushing nav + button right.</p>${H.arr([100, 468, 300, 100], { label: 'logo | free (auto margin) | nav | button', hl: { 0: 'b', 1: 'y', 2: 'g', 3: 'g' } })}`,
  brute: { why: `<p><code>justify-content: space-between</code> with three children spreads the middle one into the centre, not beside the button. Using floats or spacer divs adds markup and breaks on wrap.</p>`, code: cs(`.bar { display: flex; justify-content: space-between; }   /* nav lands in the middle */`) },
  mcq: { q: 'Which declaration pushes <code>nav</code> and everything after it to the right?', options: ['<code>nav { margin-left: auto }</code>', '<code>nav { float: right }</code>', '<code>.bar { text-align: right }</code>'], answer: 0, explain: 'An auto margin on a flex item absorbs all free space on that side, so everything from nav onwards moves to the end of the line.' },
  hints: [`<p>You want exactly ONE big gap, between the logo and the nav.</p>`, `<p>Flex container with <code>align-items: center</code> and <code>gap: 16px</code>.</p>`, `<p>Give <code>nav</code> <code>margin-left: auto</code>. Add <code>flex-wrap: wrap</code> if you also want it to wrap on narrow screens; give the logo <code>flex: none</code> so it never shrinks.</p>`],
  solution: {
    approach: `<p>An auto margin on a flex item grabs all the free space on that side. One margin replaces the "spacer" hack and is not affected by item widths.</p>`,
    code: cs(`.bar { display: flex; align-items: center; gap: 16px; padding: 0 16px; }
.logo { flex: none; }                         /* never squash the logo */
.bar nav { margin-left: auto; display: flex; gap: 16px; }   /* eats ALL free space on its left */
.bar button { flex: none; }`),
    complexity: `<p>One layout pass. The auto margin gets free = container - sum(items) - gaps.</p>`,
    followUps: ['How would you collapse the links into a menu below 600px?', 'Why does space-between not do this?']
  }
});

practice.push({
  title: 'Three Equal Columns, Whatever the Content', level: 'Easy', tags: ['flexbox', 'flex-basis', 'min-width'], companies: ['Adobe', 'Walmart'], lang: 'css',
  statement: `<p>A row has three boxes with very different content: a short word, a paragraph, and one long unbreakable URL. All three must be exactly the <b>same width</b> with 16px gaps, never overflow the container, and the URL must wrap or be cut with an ellipsis instead of stretching its column.</p>`,
  constraints: `Use flexbox only. Container width is unknown. Do not set percentage widths.`,
  example: `<p>Container 640px, gap 16px: free for boxes = 640 - 32 = 608px. Equal share: 608 / 3 = <b>202.67px</b> each - but only with <code>flex-basis: 0</code>. With <code>flex: auto</code> the boxes would start from their content sizes and come out different widths.</p>${H.arr([202.67, 202.67, 202.67], { label: 'column widths (px)', hl: { 0: 'g', 1: 'g', 2: 'g' } })}`,
  brute: { why: `<p><code>width: 33.33%</code> plus margins overflows (33.33% x 3 + gaps &gt; 100%), and a flex item with a long unbreakable word refuses to shrink below its min-content width, so the row grows past the container.</p>`, code: cs(`.row { display: flex; }
.row > * { width: 33.33%; margin-right: 16px; }    /* 100% + 32px => overflow */`) },
  mcq: { q: 'Why can a long URL make one flex column wider than its siblings even with <code>flex: 1</code>?', options: ['A flex item has <code>min-width: auto</code>, so it will not shrink below its min-content', 'flex: 1 means no shrink', 'URLs are inline-block'], answer: 0, explain: 'The automatic minimum size of a flex item is its min-content width. Set min-width: 0 (and overflow-wrap or text-overflow) so the item can shrink.' },
  hints: [`<p>Equal columns = same starting size (basis 0) plus same grow factor.</p>`, `<p><code>flex: 1 1 0</code> (or just <code>flex: 1</code>). Use <code>gap</code> for spacing.</p>`, `<p>Add <code>min-width: 0</code> to the items and <code>overflow-wrap: anywhere</code> (or <code>text-overflow: ellipsis</code> with <code>overflow: hidden; white-space: nowrap</code>) so the long URL stops forcing width.</p>`],
  solution: {
    approach: `<p>Basis 0 with grow 1 makes all free space (after gaps) split equally regardless of content. <code>min-width: 0</code> removes the content-based floor so the long URL can shrink and wrap.</p>`,
    code: cs(`.row { display: flex; gap: 16px; }
.row > * {
  flex: 1 1 0;               /* equal share of the space left after gaps */
  min-width: 0;              /* allow shrinking below the longest word */
  overflow-wrap: anywhere;   /* break long URLs */
}`),
    complexity: `<p>Each box = (container - 2 x gap) / 3.</p>`,
    followUps: ['What widths would <code>flex: auto</code> give for contents of 50, 300 and 700px in a 640px row?', 'Same result in CSS Grid?']
  }
});

practice.push({
  title: 'Brand Colour with Fallbacks and a Scoped Override', level: 'Easy', tags: ['css variables', 'fallback', 'scope'], companies: ['Twilio', 'Canva'], lang: 'css',
  statement: `<p>Define one brand colour as a CSS variable and use it for buttons and links. A promo banner (<code>.promo</code>) must show everything inside it in purple <b>without</b> editing any button or link rule. If a developer forgets to define the text-on-primary colour, buttons should still use white.</p>`,
  constraints: `Use custom properties and <code>var()</code> fallbacks. Do not repeat the colour value in more than one place per scope.`,
  example: `${H.table(['Where', '--color-primary', 'Button background'], [['normal page', '#2563eb', '#2563eb (blue)'], ['inside .promo', '#7c3aed', '#7c3aed (purple, inherited)']])}`,
  brute: { why: `<p>Copy the colour into every rule, then copy a second set of rules for <code>.promo .btn</code>, <code>.promo a</code>... Every new component needs a second override and values drift.</p>`, code: cs(`.btn { background: #2563eb; }
a { color: #2563eb; }
.promo .btn { background: #7c3aed; }
.promo a { color: #7c3aed; }`) },
  mcq: { q: 'What does <code>color: var(--on-primary, white)</code> do if <code>--on-primary</code> is not defined?', options: ['Uses white', 'Makes the declaration invalid and inherits', 'Throws an error'], answer: 0, explain: 'The fallback after the comma is used when the custom property is undefined at that element.' },
  hints: [`<p>Define the variable on <code>:root</code>; read it with <code>var()</code>.</p>`, `<p>Custom properties inherit, so redefining it on <code>.promo</code> changes all descendants.</p>`, `<p>Use <code>var(--on-primary, #fff)</code> for the text colour, and <code>.promo { --color-primary: #7c3aed; }</code> for the override.</p>`],
  solution: {
    approach: `<p>One definition, many readers. Scope the override on the wrapper; descendants inherit it. The fallback protects against a missing token.</p>`,
    code: cs(`:root  { --color-primary: #2563eb; }
.btn   { background: var(--color-primary); color: var(--on-primary, #fff); }   /* fallback to white */
a      { color: var(--color-primary); }
.promo { --color-primary: #7c3aed; }     /* every .btn and a inside .promo turns purple */`),
    complexity: `<p>No runtime cost; the cascade does the inheritance.</p>`,
    followUps: ['What happens if the override is placed on <code>.btn</code> inside .promo and another token depends on --color-primary at :root?', 'How would you also supply a dark variant?']
  }
});

/* =====================================================================
   PRACTICE - MEDIUM
   ===================================================================== */
practice.push({
  title: 'Photo Gallery with Featured Tiles (grid spans)', level: 'Medium', tags: ['grid', 'span', 'dense', 'auto-fill'], companies: ['Pinterest', 'Airbnb'], lang: 'css',
  statement: `<p>Build an image gallery: square 160px-high rows, as many columns of at least 160px as fit, a <code>.wide</code> tile spanning 2 columns, a <code>.tall</code> tile spanning 2 rows and a <code>.big</code> tile spanning both. There must be no ugly holes left behind by the large tiles, and the gallery must also work on a 320px phone (where a 2-column span cannot fit).</p>`,
  constraints: `CSS Grid only. Mention the accessibility cost of anything that visually reorders items.`,
  example: `<p>Container 800px, gap 8px, min 160px: columns = floor((800 + 8) / (160 + 8)) = <b>4</b>. A 2x2 big tile fills 4 of the 16 cells in the top-left; <code>dense</code> backfills the gaps it leaves with later small images.</p>${H.table(['Tile', 'Span'], [['.big', '2 cols x 2 rows'], ['.wide', '2 cols x 1 row'], ['.tall', '1 col x 2 rows'], ['others', '1 x 1']])}`,
  brute: { why: `<p>Absolute positioning every tile with pixel coordinates breaks when the container resizes, and a plain flex-wrap gallery cannot span rows, so tall tiles cannot exist.</p>`, code: cs(`.gallery { position: relative; }
.gallery .a { position: absolute; left: 0; top: 0; width: 336px; height: 336px; }
.gallery .b { position: absolute; left: 344px; top: 0; width: 160px; height: 160px; }  /* ...for every tile */`) },
  mcq: { q: 'A 2-column tile follows a row with only one free cell. With default <code>grid-auto-flow: row</code> what happens?', options: ['It moves to the next row, leaving a hole', 'It overlaps the next tile', 'It shrinks to one column'], answer: 0, explain: 'The auto-placement algorithm never goes backwards, so the cell stays empty. grid-auto-flow: dense lets later smaller items backfill it.' },
  hints: [`<p>The tracks come from <code>repeat(auto-fill, minmax(160px, 1fr))</code> and the row height from <code>grid-auto-rows</code>.</p>`, `<p>Make big tiles span with <code>grid-column: span 2</code> and <code>grid-row: span 2</code>.</p>`, `<p>Add <code>grid-auto-flow: dense</code> to backfill holes. Guard against narrow screens: apply the 2-column span only in a <code>min-width</code> media query (a span larger than the track count creates extra implicit columns).</p>`],
  solution: {
    approach: `<p>An auto-filled column template with fixed-height implicit rows. Spans use the <code>span</code> keyword so you never count lines. <code>dense</code> repairs holes. Spans larger than the track count are only enabled when there is room.</p>`,
    code: cs(`.gallery {
  display: grid; gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  grid-auto-rows: 160px;
  grid-auto-flow: dense;                 /* backfill holes: visual order may differ from DOM order */
}
.gallery img { width: 100%; height: 100%; object-fit: cover; }
.tall { grid-row: span 2; }              /* safe on any width: only needs 1 column */

@media (min-width: 480px) {              /* a 2-column span needs at least 2 columns */
  .wide { grid-column: span 2; }
  .big  { grid-column: span 2; grid-row: span 2; }
}`),
    complexity: `<p>Auto-placement is O(items x tracks) in the worst case, trivial for galleries.</p>`,
    followUps: ['Why is <code>dense</code> risky for keyboard users?', 'Replace <code>auto-fill</code> with <code>auto-fit</code>: what changes with only 3 images?']
  }
});

practice.push({
  title: 'Sticky Header and Sticky Sidebar That Actually Stick', level: 'Medium', tags: ['sticky', 'overflow', 'flexbox', 'debugging'], companies: ['Stripe', 'Netflix'], lang: 'css',
  statement: `<p>A docs page has a 64px sticky header and a 240px sidebar next to the article. Both are supposed to stay in view while the article scrolls, but neither sticks. The layout is <code>.page { display: flex; overflow: hidden; }</code> with the sidebar as a plain flex child. Find every cause and fix it. The sidebar should stick 16px below the header.</p>`,
  constraints: `Keep a two-column flex or grid layout. The page itself scrolls (no inner scroll box).`,
  example: `${H.table(['Cause', 'Why sticky fails', 'Fix'], [['overflow: hidden on .page', 'it becomes the scroll container, which never scrolls', '<code>overflow: clip</code> or remove'], ['sidebar stretches in flex', 'align-items: stretch makes it as tall as the article, so there is nothing to scroll within', '<code>align-self: flex-start</code>'], ['no top offset', 'sticky needs a threshold', '<code>top: calc(64px + 16px)</code>']])}`,
  brute: { why: `<p>Using <code>position: fixed</code> removes the element from flow, so you must hand-code left offsets and the article must reserve space with magic margins; it also stays visible after the content ends and over the footer.</p>`, code: cs(`.sidebar { position: fixed; top: 80px; left: 0; width: 240px; }
.article { margin-left: 240px; }          /* magic number */`) },
  mcq: { q: 'A sticky flex child never sticks. It has <code>top: 0</code> and no overflow ancestor. What is the next suspect?', options: ['It is stretched to the full height of the flex row (align-items: stretch)', 'position: sticky needs z-index', 'The parent needs display: block'], answer: 0, explain: 'A sticky element can only move within its parent. If it is as tall as the parent (stretch), there is no room to move. align-self: flex-start (or start) gives it its natural height.' },
  hints: [`<p>List the three requirements: a threshold, no scroll-container ancestor in between, and room to move inside the parent.</p>`, `<p>Replace <code>overflow: hidden</code> on the page with <code>overflow: clip</code> (clips but does not create a scroll container).</p>`, `<p>Put <code>align-self: flex-start</code> on the sidebar, <code>position: sticky; top: calc(var(--header-h) + 16px)</code>, and the header <code>position: sticky; top: 0; z-index: 10</code>. Add <code>max-height: calc(100dvh - ...)</code> with <code>overflow: auto</code> for long sidebars.</p>`],
  solution: {
    approach: `<p>Three bugs: overflow on an ancestor, the sidebar stretched to full height, and no top offset. Fix all three and give the header a z-index so content slides underneath it.</p>`,
    code: cs(`:root { --header-h: 64px; }
.header  { position: sticky; top: 0; height: var(--header-h); z-index: 10; background: #fff; }
.page    { display: flex; align-items: flex-start; gap: 24px; overflow: clip; }  /* clip, not hidden */
.sidebar {
  flex: 0 0 240px;
  position: sticky;
  top: calc(var(--header-h) + 16px);               /* the threshold */
  align-self: flex-start;                           /* natural height => room to move */
  max-height: calc(100dvh - var(--header-h) - 32px);
  overflow: auto;                                   /* long nav scrolls inside itself */
}
.article { flex: 1; min-width: 0; }`),
    complexity: `<p>Sticky positioning is computed by the compositor-friendly scroll logic; no JS needed.</p>`,
    followUps: ['What if the sticky element must live in a container that really needs <code>overflow: auto</code>?', 'How does <code>scroll-margin-top</code> relate to anchor links under a sticky header?']
  }
});

practice.push({
  title: 'Compute Flex Item Widths (grow, shrink, basis)', level: 'Medium', tags: ['flexbox', 'algorithm', 'calculation'], companies: ['Google', 'Meta', 'Uber'], lang: 'js',
  statement: `<p>Write <code>flexWidths(container, items)</code> that returns the final main-size of each item in a single-line flex container. Each item is <code>{ basis, grow, shrink }</code> in px. Follow the browser: positive free space is shared by <code>grow</code>; negative free space is shared by <code>shrink x basis</code> (scaled shrink factor); no item may go below 0; an item that hits 0 is frozen and the rest recalculated. Ignore wrapping, margins and min-width.</p>`,
  constraints: `1 ≤ items ≤ 20; values are non-negative numbers. Return numbers rounded to 2 decimals. If the grow factors add up to less than 1, only that fraction of the free space is distributed.`,
  example: `<p>Container 500, items basis 300 and 100 (shrink 1 each, grow 0)? Sum = 400 &lt; 500 so we GROW - but grow is 0, so widths stay <b>[300, 100]</b>. Container 200 instead: overflow 200, scaled factors 300 and 100: loses 150 and 50 -> <b>[150, 50]</b>. Container 700 with grow 1/2/0 and basis 200 each: <b>[233.33, 266.67, 200]</b>.</p>`,
  brute: { why: `<p>The tempting shortcut shares the overflow equally (or by shrink factor only). That ignores that shrink is weighted by basis, so big items must lose more pixels.</p>`, code: jc(`function flexWidthsBrute(container, items) {
  const used = items.reduce((s, it) => s + it.basis, 0);
  const free = container - used;
  if (free >= 0) {
    const g = items.reduce((s, it) => s + it.grow, 0);
    return items.map(it => (g ? it.basis + free * it.grow / g : it.basis));
  }
  // WRONG: split the overflow by shrink factor only, ignoring basis
  const s = items.reduce((t, it) => t + it.shrink, 0);
  return items.map(it => it.basis + free * it.shrink / s);
}`, 'Naive: ignores the basis weighting') },
  mcq: { q: 'Two items, basis 300 and 100, both shrink 1, in a 200px container. How much does the 300px item lose?', options: ['150px', '100px', '200px'], answer: 0, explain: 'Overflow 200px, scaled shrink factors 300 and 100: the 300 item takes 300/400 of 200 = 150px.' },
  hints: [`<p>First compute free space = container - sum(bases). Its sign picks grow or shrink.</p>`, `<p>Growing: each item gets <code>free x grow / sumGrow</code>. Shrinking: each item loses <code>overflow x (shrink x basis) / sum(shrink x basis)</code>.</p>`, `<p>Loop: distribute, clamp negatives to 0 and freeze those items, then recompute with only the unfrozen items until nothing is clamped. Freeze items that cannot move in the current direction (grow 0 when growing, shrink 0 when shrinking) at their basis.</p>`],
  solution: {
    approach: `<p>Implement the "resolve flexible lengths" loop: compute free space against frozen sizes plus unfrozen bases, freeze items that cannot flex, distribute the remaining space proportionally (grow factor, or shrink x basis), clamp at 0 and repeat while something got clamped.</p>`,
    code: jr(`function flexWidths(container, items) {
  const size = items.map(it => it.basis);
  const frozen = items.map(() => false);
  for (let round = 0; round <= items.length; round++) {
    let used = 0;
    items.forEach((it, i) => { used += frozen[i] ? size[i] : it.basis; });
    const free = container - used;
    const growing = free > 0;
    items.forEach((it, i) => {                    // items that cannot flex this way keep their basis
      if (!frozen[i] && (free === 0 || (growing && it.grow === 0) || (!growing && it.shrink === 0))) {
        frozen[i] = true; size[i] = it.basis;
      }
    });
    const live = [];
    items.forEach((it, i) => { if (!frozen[i]) live.push(i); });
    if (!live.length) break;
    if (growing) {
      const total = live.reduce((s, i) => s + items[i].grow, 0);
      const handOut = free * Math.min(total, 1);   // grow factors under 1 hand out only that fraction
      live.forEach(i => { size[i] = items[i].basis + handOut * items[i].grow / total; });
    } else {
      const total = live.reduce((s, i) => s + items[i].shrink * items[i].basis, 0);
      if (total === 0) break;                      // all live items have basis 0: nothing to take from
      live.forEach(i => { size[i] = items[i].basis + free * (items[i].shrink * items[i].basis) / total; });
    }
    let clamped = false;
    live.forEach(i => { if (size[i] < 0) { size[i] = 0; frozen[i] = true; clamped = true; } });
    if (!clamped) break;
  }
  return size.map(x => Math.round(x * 100) / 100);
}

console.log(flexWidths(700, [{ basis: 200, grow: 1, shrink: 1 }, { basis: 200, grow: 2, shrink: 1 }, { basis: 200, grow: 0, shrink: 1 }]));
console.log(flexWidths(200, [{ basis: 300, grow: 0, shrink: 1 }, { basis: 100, grow: 0, shrink: 1 }]));
console.log(flexWidths(500, [{ basis: 100, grow: 0.5, shrink: 1 }, { basis: 100, grow: 0, shrink: 1 }]));
console.log(flexWidths(300, [{ basis: 400, grow: 0, shrink: 1 }, { basis: 50, grow: 0, shrink: 10 }, { basis: 100, grow: 0, shrink: 0 }]));`, 'flexWidths (runnable)'),
    complexity: `<p>O(n<sup>2</sup>) worst case (n rounds of O(n)); n ≤ 20 in practice. Space O(n).</p>`,
    followUps: ['Add <code>min-width</code> per item and freeze on min violations.', 'What changes with <code>flex-wrap: wrap</code>?']
  }
});

practice.push({
  title: 'Dropdown Hidden Behind the Next Card (trapped z-index)', level: 'Medium', tags: ['z-index', 'stacking context', 'opacity', 'isolation'], companies: ['Atlassian', 'Salesforce'], lang: 'css',
  statement: `<p>A list of cards each has <code>opacity: 0.98</code> (a design tweak) and contains an actions dropdown with <code>position: absolute; z-index: 100</code>. When you open the dropdown of card 1, it appears <b>behind</b> card 2. Explain the cause and give two fixes: one that removes the cause and one that keeps the opacity but raises the active card.</p>`,
  constraints: `Do not use z-index above 50. Keyboard users who tab into the dropdown must see it on top too.`,
  example: `${H.table(['Element', 'Context?', 'Level in page'], [['card 1 (opacity .98)', 'yes', 'auto (0), DOM order 1'], ['card 2 (opacity .98)', 'yes', 'auto (0), DOM order 2'], ['dropdown in card 1 (z 100)', 'inside card 1', 'trapped']])}<p>Cards 1 and 2 tie at level 0, and DOM order says card 2 paints on top of card 1 - dropdown included.</p>`,
  brute: { why: `<p>Raising the dropdown's z-index to 9999 does nothing: the dropdown is compared only against siblings inside card 1's stacking context.</p>`, code: cs(`.dropdown { position: absolute; z-index: 9999; }   /* still trapped in the opacity context */`) },
  mcq: { q: 'Why do two cards with opacity: 0.98 stack by DOM order?', options: ['Each is a stacking context at level auto/0, so later siblings paint above earlier ones', 'opacity ignores z-index', 'Cards are display: inline'], answer: 0, explain: 'opacity below 1 creates a stacking context. Equal levels fall back to DOM order, so card 2 covers card 1 including its overflowing dropdown.' },
  hints: [`<p>Find the ancestor that creates a context between the dropdown and the page.</p>`, `<p>Either remove the trigger (opacity) or make the <i>whole active card</i> rise above its siblings.</p>`, `<p>Give cards <code>position: relative</code> and raise the card that contains an open dropdown or focus: <code>.card:focus-within, .card:has(.dropdown[open]) { z-index: 2 }</code>. Or use the native <code>popover</code> attribute so the menu goes to the top layer.</p>`],
  solution: {
    approach: `<p>The opacity makes every card a stacking context, so the dropdown's 100 is trapped. Fix 1: drop the opacity (use a semi-transparent background colour instead). Fix 2: raise the active card using <code>:focus-within</code> or an open state so its whole sheet, with the dropdown, paints above siblings.</p>`,
    code: cs(`/* Fix 1: remove the cause - transparency on the BACKGROUND, not the whole element */
.card { background: rgb(255 255 255 / 0.98); }        /* no stacking context created */

/* Fix 2: keep opacity, but lift the active card above its siblings */
.card { position: relative; opacity: 0.98; z-index: 1; }
.card:focus-within,
.card:has(.dropdown[open]) { z-index: 2; }             /* its whole sheet, dropdown included, now wins */

.dropdown { position: absolute; top: 100%; right: 0; z-index: 5; }   /* small numbers are enough */`),
    alt: [hm(`<!-- Fix 3: the popover attribute renders in the top layer, above everything -->
<button popovertarget="menu-1">Actions</button>
<div id="menu-1" popover>
  <button>Edit</button> <button>Delete</button>
</div>`, 'Native popover')],
    complexity: `<p>Constant. The key skill is finding the first shared stacking context.</p>`,
    followUps: ['How would <code>isolation: isolate</code> on the card list change things?', 'Why is the popover attribute better for menus inside scroll containers?']
  }
});

practice.push({
  title: 'Fluid Article Layout: clamp() and a Single Breakpoint', level: 'Medium', tags: ['clamp', 'media query', 'typography', 'responsive'], companies: ['Medium', 'The New York Times'], lang: 'css',
  statement: `<p>Style a blog post so that: the heading scales smoothly between 28px (phone) and 48px (desktop); body text is at least 16px; the text column is never wider than about 65 characters; page padding grows from 16px to 48px; and a table-of-contents sidebar appears <b>only</b> at 900px and above. Use <code>clamp()</code> and exactly one media query.</p>`,
  constraints: `Mobile-first. No JavaScript. Use rem units for font sizes so user font settings are respected.`,
  example: `<p>Heading: <code>clamp(1.75rem, 1rem + 3vw, 3rem)</code>. At 360px wide: 16 + 10.8 = 26.8px, clamped up to 28px (1.75rem). At 800px: 16 + 24 = 40px. At 1200px: 16 + 36 = 52px, clamped down to 48px.</p>${H.arr([28, 40, 48], { label: 'h1 at 360 | 800 | 1200', hl: { 0: 'b', 1: 'g', 2: 'y' } })}`,
  brute: { why: `<p>Setting a font size per breakpoint produces visible jumps at each width, needs several media queries, and px sizes ignore the user's preferred font size.</p>`, code: cs(`h1 { font-size: 28px; }
@media (min-width: 600px)  { h1 { font-size: 36px; } }
@media (min-width: 900px)  { h1 { font-size: 42px; } }
@media (min-width: 1200px) { h1 { font-size: 48px; } }`) },
  mcq: { q: '<code>clamp(1rem, 2vw, 2rem)</code> at a 400px viewport gives:', options: ['1rem (16px), because 2vw = 8px is below the minimum', '8px', '2rem'], answer: 0, explain: 'clamp(min, preferred, max) picks the preferred value but never below min or above max: 8px is below 16px, so 16px.' },
  hints: [`<p>clamp(min, preferred, max): the preferred value mixes a rem base with a vw part so it grows with the screen.</p>`, `<p>Limit line length with <code>max-width: 65ch</code> and centre with <code>margin-inline: auto</code>; padding with <code>clamp(1rem, 4vw, 3rem)</code>.</p>`, `<p>Only the sidebar needs a breakpoint: below 900px it is hidden (or stacked); at <code>min-width: 900px</code> use a two-column grid <code>minmax(0, 65ch) 220px</code>.</p>`],
  solution: {
    approach: `<p>Make every size fluid with <code>clamp()</code>, cap line length in <code>ch</code>, and keep one media query for the structural change (adding the sidebar column).</p>`,
    code: cs(`:root { --pad: clamp(1rem, 4vw, 3rem); }
body    { font-size: 1rem; line-height: 1.6; padding-inline: var(--pad); }
h1      { font-size: clamp(1.75rem, 1rem + 3vw, 3rem); line-height: 1.1; }
.post   { max-width: 65ch; margin-inline: auto; }          /* about 65 characters per line */
.toc    { display: none; }                                  /* mobile-first: hidden */

@media (min-width: 900px) {                                 /* the ONLY breakpoint */
  .layout { display: grid; grid-template-columns: minmax(0, 65ch) 220px; gap: 48px; justify-content: center; }
  .toc    { display: block; position: sticky; top: 24px; align-self: start; }
}`),
    complexity: `<p>One media query; sizes interpolate continuously between breakpoints.</p>`,
    followUps: ['Why is <code>1rem + 3vw</code> better than <code>3vw</code> alone for accessibility?', 'How would container queries change the sidebar rule?']
  }
});

practice.push({
  title: 'Staggered Entrance Animation with CSS Variables', level: 'Medium', tags: ['animation', 'css variables', 'stagger', 'reduced motion'], companies: ['Linear', 'Vercel'], lang: 'css',
  statement: `<p>A list of up to 12 items should fade and rise into place one after another, 80ms apart, using a single keyframe animation. Each item gets its index through a CSS variable (<code>style="--i: 3"</code>). Items must not flash visible before their animation begins, and nothing may animate for users who prefer reduced motion.</p>`,
  constraints: `Animate only opacity and transform. No JavaScript for the timing.`,
  example: `${H.table(['Item', '--i', 'delay', 'starts at'], [['1', '0', '0ms', '0ms'], ['2', '1', '80ms', '80ms'], ['3', '2', '160ms', '160ms'], ['12', '11', '880ms', '880ms (ends 1180ms with a 300ms animation)']])}`,
  brute: { why: `<p>Writing <code>:nth-child(1) { animation-delay: 0ms } :nth-child(2) { animation-delay: 80ms }</code> for every item is long, breaks when the list grows, and forgetting fill-mode makes items visible during their delay.</p>`, code: cs(`.item { animation: rise 300ms ease-out; }                /* no fill-mode: flash before delay */
.item:nth-child(2) { animation-delay: 80ms; }
.item:nth-child(3) { animation-delay: 160ms; }
.item:nth-child(4) { animation-delay: 240ms; }`) },
  mcq: { q: 'Why do items flash at full opacity during their delay when <code>animation-fill-mode</code> is omitted?', options: ['Before the animation starts the element uses its normal style (visible); fill-mode backwards applies the first keyframe early', 'The delay is ignored', 'opacity can not be animated'], answer: 0, explain: 'With fill-mode none, the keyframes only apply while running. <code>both</code> (or backwards) applies the from-keyframe during the delay.' },
  hints: [`<p>Delay = index x step. CSS can multiply with <code>calc()</code>.</p>`, `<p><code>animation-delay: calc(var(--i) * 80ms)</code>, and fill-mode <code>both</code>.</p>`, `<p>Wrap the animation in <code>@media (prefers-reduced-motion: no-preference)</code> so nothing runs for reduced-motion users; keep items visible by default.</p>`],
  solution: {
    approach: `<p>One keyframe set, one rule, delay computed from the index variable. <code>both</code> hides items during the delay and keeps the final state. The animation only exists inside a no-preference media query, so reduced-motion users see the final layout with zero motion.</p>`,
    code: cs(`@keyframes rise {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: no-preference) {
  .item {
    animation: rise 300ms ease-out both;            /* both: hidden during delay, kept after */
    animation-delay: calc(var(--i, 0) * 80ms);       /* stagger from the index variable */
  }
}`),
    alt: [hm(`<ul class="list">
  <li class="item" style="--i: 0">First</li>
  <li class="item" style="--i: 1">Second</li>
  <li class="item" style="--i: 2">Third</li>
</ul>`, 'Markup')],
    complexity: `<p>Compositor-only properties; total time = 300ms + 80ms x (n - 1).</p>`,
    followUps: ['How do you generate --i from a framework\'s list index?', 'Cap the total duration so a 200-item list does not take 16 seconds.']
  }
});
/* =====================================================================
   PRACTICE - HARD
   ===================================================================== */
practice.push({
  title: 'The Holy-Grail Layout (responsive, footer at the bottom)', level: 'Hard', tags: ['grid', 'grid-template-areas', 'responsive', 'layout'], companies: ['Google', 'Microsoft', 'Amazon'], lang: 'css',
  statement: `<p>Build the classic <b>holy grail</b>: full-width header, then three columns (left nav 220px, fluid main, right aside 180px), then a full-width footer. Requirements: (1) on short pages the footer still sits at the very bottom of the viewport; (2) the main column comes <b>first in the HTML</b> for SEO and screen readers but appears in the middle visually; (3) mobile-first: on phones everything stacks in the order header, main, nav, aside, footer; between 768px and 1023px nav and main sit side by side with the aside under them; at 1024px+ it is the full three columns.</p>`,
  constraints: `CSS Grid with <code>grid-template-areas</code>. HTML order: header, main, nav, aside, footer. No JavaScript, no floats, no negative margins. Main must not overflow with long content.`,
  example: `${H.table(['Viewport', 'Areas (rows)'], [['&lt; 768px', 'header / main / nav / aside / footer'], ['768 - 1023px', 'header header / nav main / aside aside / footer footer'], ['&ge; 1024px', 'header header header / nav main aside / footer footer footer']])}<p>Rows: <code>auto 1fr auto</code> on the wide layout, so the middle row absorbs spare height and pushes the footer down.</p>`,
  brute: { why: `<p>The 2005 solution: floats with negative margins and a "clearfix", equal-height columns faked with faux backgrounds, and the footer glued down with JavaScript or magic heights. It needs the HTML in a specific, SEO-unfriendly order and breaks on any content change.</p>`, code: cs(`.col-main  { float: left; width: 100%; }
.col-left  { float: left; width: 220px; margin-left: -100%; }
.col-right { float: left; width: 180px; margin-left: -180px; }
.wrapper   { padding: 0 180px 0 220px; overflow: hidden; }
footer     { clear: both; }`) },
  mcq: { q: 'Which row template keeps the footer at the bottom on a short page?', options: ['<code>min-height: 100dvh; grid-template-rows: auto 1fr auto</code>', '<code>grid-template-rows: 1fr 1fr 1fr</code>', '<code>height: auto</code>'], answer: 0, explain: 'The grid is at least viewport tall; the middle track is 1fr so it takes all spare height, pushing the auto-height footer to the bottom.' },
  hints: [`<p>Name the five areas and write the layout as ASCII art; change only the template in media queries.</p>`, `<p>Children just say <code>grid-area: main</code> etc., so source order and visual order are independent.</p>`, `<p>Use <code>min-height: 100dvh</code> and rows <code>auto 1fr auto</code> on the wide layouts. Columns: <code>220px minmax(0, 1fr) 180px</code> - the <code>minmax(0, 1fr)</code> stops long content blowing the main column open.</p>`],
  solution: {
    approach: `<p>One grid, three templates. Mobile-first base is a single column with areas stacked in the requested order; two media queries redraw the ASCII art. Children never change.</p>`,
    code: cs(`.page {
  display: grid; min-height: 100dvh;
  grid-template-columns: minmax(0, 1fr);                 /* phone: one column */
  grid-template-rows: auto;
  grid-template-areas: "header" "main" "nav" "aside" "footer";
  gap: 16px;
}
.page > header { grid-area: header; }
.page > main   { grid-area: main; min-width: 0; }         /* first in HTML, middle on desktop */
.page > nav    { grid-area: nav; }
.page > aside  { grid-area: aside; }
.page > footer { grid-area: footer; }

@media (min-width: 768px) {
  .page {
    grid-template-columns: 220px minmax(0, 1fr);
    grid-template-rows: auto 1fr auto auto;
    grid-template-areas: "header header" "nav main" "aside aside" "footer footer";
  }
}
@media (min-width: 1024px) {
  .page {
    grid-template-columns: 220px minmax(0, 1fr) 180px;
    grid-template-rows: auto 1fr auto;                    /* middle row absorbs spare height */
    grid-template-areas: "header header header" "nav main aside" "footer footer footer";
  }
}`),
    alt: [hm(`<body class="page">
  <header>Site</header>
  <main>Content first for SEO and screen readers</main>
  <nav>Left nav</nav>
  <aside>Right aside</aside>
  <footer>Footer</footer>
</body>`, 'Source order: main before nav')],
    complexity: `<p>One layout pass. Rearranging is a template change, not an element move.</p>`,
    followUps: ['Why can visually reordering with grid still hurt keyboard users?', 'Add a sticky footer variant when content is long using <code>position: sticky; bottom: 0</code>.']
  }
});

practice.push({
  title: 'Grid Track Sizing Calculator (px, fr, minmax, auto-fit)', level: 'Hard', tags: ['grid', 'algorithm', 'fr', 'auto-fit'], companies: ['Google', 'Apple'], lang: 'js',
  statement: `<p>Write <code>resolveColumns(template, width, gap, itemCount)</code> that returns the final column widths (array of numbers) for these <code>grid-template-columns</code> strings: space-separated tokens of <code>NNpx</code>, <code>Nfr</code>, <code>minmax(NNpx, Nfr)</code>, or a single <code>repeat(auto-fit | auto-fill, minmax(NNpx, 1fr))</code>. Gaps come off first, then fixed tracks, then the <code>fr</code> tracks share what is left; a minmax minimum that would be violated pins that track and the remainder is recomputed. <code>auto-fit</code> collapses empty tracks when <code>itemCount</code> is smaller than the column count.</p>`,
  constraints: `1 ≤ width ≤ 5000; 0 ≤ gap ≤ 100; 1 ≤ itemCount ≤ 100. Round results to 2 decimals. If the fr factors sum to less than 1, they only take that fraction of the free space.`,
  example: `<p><code>200px 1fr 2fr</code> in 900 with gap 16 -> <b>[200, 222.67, 445.33]</b>. <code>minmax(450px,1fr) 1fr</code> in 700 -> <b>[450, 250]</b>. <code>repeat(auto-fit, minmax(220px,1fr))</code> in 1000, gap 16, 2 items -> 4 columns fit but only 2 are used: <b>[492, 492]</b>; with <code>auto-fill</code> -> <b>[238, 238, 238, 238]</b>.</p>`,
  brute: { why: `<p>Dividing the container by the number of tracks ignores fixed tracks, gaps and minimums, so every example above comes out wrong.</p>`, code: jc(`function resolveColumnsBrute(tracks, width) {
  return tracks.map(() => width / tracks.length);   // ignores px, fr ratios, gaps and minmax
}`, 'Naive equal split') },
  mcq: { q: 'For <code>repeat(auto-fit, minmax(220px, 1fr))</code> in 1000px with a 16px gap, how many columns are created before collapsing?', options: ['4', '5', '3'], answer: 0, explain: 'floor((1000 + 16) / (220 + 16)) = floor(4.3) = 4 columns.' },
  hints: [`<p>Parse tokens into objects: fixed (px) or flexible (fr with a min).</p>`, `<p>free = width - gaps - sum(fixed). Loop: 1fr = (free - pinned minimums) / sum(unpinned fr). If an fr track would be smaller than its minimum, pin it at the minimum and loop again.</p>`, `<p>For repeat(): columns = max(1, floor((width + gap) / (min + gap))). auto-fit uses min(columns, itemCount) columns; auto-fill keeps them all. Then feed the generated tracks (each minmax(min, 1fr)) into the same solver.</p>`],
  solution: {
    approach: `<p>Parse into a track list (expanding repeat), then run the "find the size of an fr" loop: subtract gaps and fixed sizes, divide by total fr, pin any track below its minimum, repeat until stable.</p>`,
    code: jr(`function parseTrack(tok) {
  let m;
  if ((m = tok.match(/^(\\d+(?:\\.\\d+)?)px$/))) return { px: Number(m[1]) };
  if ((m = tok.match(/^(\\d+(?:\\.\\d+)?)fr$/))) return { fr: Number(m[1]), min: 0 };
  if ((m = tok.match(/^minmax\\(\\s*(\\d+(?:\\.\\d+)?)px\\s*,\\s*(\\d+(?:\\.\\d+)?)fr\\s*\\)$/))) return { fr: Number(m[2]), min: Number(m[1]) };
  throw new Error('bad track: ' + tok);
}

function resolveColumns(template, width, gap, itemCount) {
  let tracks;
  const rep = template.match(/^repeat\\(\\s*(auto-fit|auto-fill)\\s*,\\s*minmax\\(\\s*(\\d+(?:\\.\\d+)?)px\\s*,\\s*1fr\\s*\\)\\s*\\)$/);
  if (rep) {
    const cols = Math.max(1, Math.floor((width + gap) / (Number(rep[2]) + gap)));
    const used = rep[1] === 'auto-fit' ? Math.min(cols, itemCount) : cols;   // fit collapses empty tracks
    tracks = Array.from({ length: used }, () => ({ fr: 1, min: Number(rep[2]) }));
  } else {
    tracks = template.trim().split(/\\s+(?![^(]*\\))/).map(parseTrack);        // split on spaces outside parentheses
  }
  const n = tracks.length;
  const size = tracks.map(t => (t.px !== undefined ? t.px : 0));
  const frozen = tracks.map(t => t.px !== undefined);
  let free = width - gap * (n - 1);
  tracks.forEach(t => { if (t.px !== undefined) free -= t.px; });
  for (let round = 0; round <= n; round++) {
    let frSum = 0, space = free;
    tracks.forEach((t, i) => {
      if (frozen[i] && t.px === undefined) space -= size[i];   // pinned fr tracks keep their minimum
      else if (!frozen[i]) frSum += t.fr;
    });
    if (frSum === 0) break;
    const oneFr = space / Math.max(frSum, 1);
    let pinned = false;
    tracks.forEach((t, i) => {
      if (frozen[i]) return;
      const want = oneFr * t.fr;
      if (want < t.min) { size[i] = t.min; frozen[i] = true; pinned = true; } else size[i] = want;
    });
    if (!pinned) break;
  }
  return size.map(x => Math.round(x * 100) / 100);
}

console.log(resolveColumns('200px 1fr 2fr', 900, 16, 3));
console.log(resolveColumns('minmax(450px, 1fr) 1fr', 700, 0, 2));
console.log(resolveColumns('repeat(auto-fit, minmax(220px, 1fr))', 1000, 16, 2));
console.log(resolveColumns('repeat(auto-fill, minmax(220px, 1fr))', 1000, 16, 2));
console.log(resolveColumns('repeat(auto-fit, minmax(220px, 1fr))', 320, 16, 9));`, 'resolveColumns (runnable)'),
    complexity: `<p>O(n<sup>2</sup>) worst case for the freeze loop with n tracks; auto-fit counting is O(1).</p>`,
    followUps: ['Add <code>auto</code> and <code>min-content</code> tracks using item content sizes.', 'Why does a plain <code>1fr</code> behave like <code>minmax(auto, 1fr)</code>?']
  }
});

practice.push({
  title: 'Animate an Accordion to height: auto (0fr to 1fr)', level: 'Hard', tags: ['transition', 'grid', 'accordion', 'accessibility'], companies: ['Apple', 'Slack'], lang: 'css',
  statement: `<p>Build an FAQ accordion whose panel opens and closes with a smooth height animation although the content height is unknown (<code>auto</code>). Requirements: no JavaScript for the animation itself (a tiny script may toggle a class and the <code>aria-expanded</code> state), the collapsed content must not be focusable or readable by screen readers, and motion must be disabled for users who prefer reduced motion.</p>`,
  constraints: `Cross-browser: do not rely on <code>interpolate-size</code> alone. Animate only layout-friendly properties; the panel can contain any HTML.`,
  example: `${H.table(['State', 'grid-template-rows', 'visibility', 'Outcome'], [['closed', '0fr', 'hidden', 'height 0, content not focusable'], ['open', '1fr', 'visible', 'height = content height'], ['transitioning', '0fr to 1fr over 300ms', 'visible (delayed on close)', 'smooth']])}`,
  brute: { why: `<p><code>transition: height</code> from <code>0</code> to <code>auto</code> does not animate (no numeric midpoint), so the panel jumps. The JS workaround (measure <code>scrollHeight</code>, set px height, then reset to auto) adds code, breaks when the content changes size, and flashes.</p>`, code: cs(`.panel { height: 0; overflow: hidden; transition: height 300ms; }
.panel.open { height: auto; }          /* auto is not animatable: it just snaps open */`) },
  mcq: { q: 'Why does <code>grid-template-rows: 0fr -> 1fr</code> animate while <code>height: 0 -> auto</code> does not?', options: ['fr values are numbers the browser can interpolate; auto is a keyword', 'grid is GPU accelerated', 'height cannot be transitioned'], answer: 0, explain: '0fr and 1fr are both numeric track sizes, so there are valid in-between values. The track resolves to the content height at 1fr.' },
  hints: [`<p>Make the panel a one-column grid whose single row is the thing that animates.</p>`, `<p>The inner wrapper needs <code>overflow: hidden</code> and <code>min-height: 0</code> so the 0fr row can truly collapse.</p>`, `<p>Also hide the closed content from keyboard and screen readers with <code>visibility: hidden</code>, transitioned so it flips at the end of the collapse. Use a <code>&lt;button aria-expanded aria-controls&gt;</code>. Wrap transitions in a reduced-motion check.</p>`],
  solution: {
    approach: `<p>The classic modern trick: animate the grid row between 0fr and 1fr. The inner element is clipped and can shrink to 0. <code>visibility</code> (transitioned with a delay on close) removes the closed content from the tab order and the accessibility tree. The button carries <code>aria-expanded</code>.</p>`,
    code: cs(`.acc-panel {
  display: grid;
  grid-template-rows: 0fr;                       /* closed */
  transition: grid-template-rows 300ms ease;
}
.acc-panel > .acc-inner { overflow: hidden; min-height: 0; visibility: hidden;
  transition: visibility 0s linear 300ms; }       /* hide AFTER the collapse finishes */
.acc-item.open .acc-panel { grid-template-rows: 1fr; }                /* open */
.acc-item.open .acc-inner { visibility: visible; transition-delay: 0s; } /* show immediately on open */

@media (prefers-reduced-motion: reduce) {
  .acc-panel, .acc-inner { transition: none; }
}`),
    alt: [hm(`<div class="acc-item">
  <h3><button aria-expanded="false" aria-controls="p1">What is your refund policy?</button></h3>
  <div class="acc-panel" id="p1">
    <div class="acc-inner"><p>Refunds within 30 days, no questions asked.</p></div>
  </div>
</div>`, 'Markup'), jc(`document.querySelectorAll('.acc-item button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.acc-item');
    const open = item.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));   // keep assistive tech in sync
  });
});`, 'Tiny toggle script')],
    complexity: `<p>Animates a grid track (layout each frame, but cheap for one panel). For many simultaneous panels prefer <code>interpolate-size</code> where supported, or the native <code>&lt;details&gt;</code> with <code>::details-content</code>.</p>`,
    followUps: ['How does <code>interpolate-size: allow-keywords</code> simplify this?', 'Make only one panel open at a time.']
  }
});

practice.push({
  title: 'Which Element Paints on Top? (stacking-order function)', level: 'Hard', tags: ['stacking context', 'z-index', 'algorithm'], companies: ['Meta', 'Figma'], lang: 'js',
  statement: `<p>Write <code>isAbove(a, b)</code> for two elements in a page tree. Each node is <code>{ name, z, ctx, order, parent }</code>: <code>z</code> is a number (use 0 for <code>auto</code>), <code>ctx</code> says whether it creates a stacking context, <code>order</code> is DOM order (depth-first), <code>parent</code> is the parent node or <code>null</code> for the root. All nodes are positioned. Return <code>true</code> if <code>a</code> paints above <code>b</code>. Rule: compare in the <b>first stacking context both share</b> - the layers that matter are the context-creating ancestors (and the elements themselves).</p>`,
  constraints: `Up to 1000 nodes; depth up to 50. The root has ctx = true. Descendants paint above their own ancestor (unless the ancestor is a context whose negative children are behind it - ignore that case).`,
  example: `<p>Tree: <code>html</code> (ctx) -&gt; <code>header</code> (z 10, ctx) and <code>card</code> (z 0, ctx, order later) -&gt; <code>modal</code> (z 9999, ctx). Layer keys from the root: header = [(10, 1)]; modal = [(0, 2), (9999, 3)]. First difference: (10,1) vs (0,2) - 10 wins. <b>isAbove(header, modal) = true</b>, even though 9999 &gt; 10.</p>`,
  brute: { why: `<p>Comparing the raw z-index numbers is the bug the whole topic is about: it ignores that an ancestor context traps its descendants.</p>`, code: jc(`function isAboveBrute(a, b) {
  return a.z > b.z || (a.z === b.z && a.order > b.order);   // WRONG: ignores stacking contexts
}`, 'Naive: compare raw z') },
  mcq: { q: 'Header: z-index 10 (context). Card: transform (context, z auto) containing a modal with z-index 9999. Which is on top?', options: ['The header', 'The modal', 'They tie'], answer: 0, explain: 'The modal is trapped in the card, which sits at level 0 in the root context. The header at 10 is above the entire card sheet.' },
  hints: [`<p>Build the chain of context-creating ancestors (plus the node itself) for each element.</p>`, `<p>Each chain item is a pair (z, order). Compare the chains from the root downward; the first pair that differs decides.</p>`, `<p>Compare pairs by z first, then by order. If one chain is a prefix of the other, the longer one (the descendant) is on top. Skip the root from the chains because everything shares it.</p>`],
  solution: {
    approach: `<p>Reduce each element to its list of (z, order) layers along the path of stacking contexts. Lexicographic comparison of these lists is exactly the browser's recursive painting rule: the first level where the paths split decides, because each branch is painted atomically.</p>`,
    code: jr(`function layers(node) {
  const chain = [];
  for (let n = node; n && n.parent; n = n.parent) {     // stop before the root
    if (n.ctx || n === node) chain.unshift([n.z, n.order]);
  }
  return chain;                                          // root-most layer first
}

function isAbove(a, b) {
  const A = layers(a), B = layers(b);
  const len = Math.min(A.length, B.length);
  for (let i = 0; i < len; i++) {
    if (A[i][0] !== B[i][0]) return A[i][0] > B[i][0];   // higher z in the shared context wins
    if (A[i][1] !== B[i][1]) return A[i][1] > B[i][1];   // tie: later in the DOM wins
  }
  return A.length > B.length;                            // same path so far: the descendant is on top
}

const html   = { name: 'html',   z: 0,    ctx: true, order: 0, parent: null };
const header = { name: 'header', z: 10,   ctx: true, order: 1, parent: html };
const card   = { name: 'card',   z: 0,    ctx: true, order: 2, parent: html };   // transform => context at level auto/0
const modal  = { name: 'modal',  z: 9999, ctx: true, order: 3, parent: card };

console.log('header above modal?', isAbove(header, modal));   // true: the modal is trapped in the card
console.log('modal above header?', isAbove(modal, header));   // false
console.log('modal above card?  ', isAbove(modal, card));     // true: a descendant paints over its ancestor
card.z = 20;                                                   // the "raise the card" fix
console.log('after card z=20, modal above header?', isAbove(modal, header)); // true`, 'isAbove (runnable)'),
    complexity: `<p>O(depth) per comparison; sorting n elements by paint order is O(n depth log n).</p>`,
    followUps: ['Extend it to non-positioned in-flow content and floats using the 7-step paint order.', 'How would you detect which ancestor created the context from computed styles?']
  }
});

practice.push({
  title: 'Container-Query Dashboard that Rearranges Itself', level: 'Hard', tags: ['container queries', 'grid', 'named areas', 'responsive'], companies: ['Datadog', 'Grafana', 'Atlassian'], lang: 'css',
  statement: `<p>A dashboard widget area is placed in different shells: a full-width page, a narrow sidebar, a modal. The <b>same markup</b> must adapt to the width of <i>its container</i>, not the screen: under 480px it stacks (title, chart, stats); from 480px it shows chart and stats side by side under the title; from 800px it adds a third "details" column. Use named areas and container queries, and add a fallback so the layout still works if container queries are unsupported.</p>`,
  constraints: `The wrapper can be any width. No JavaScript, no viewport media queries for the widget layout. Make the chart keep a 16/9 ratio.`,
  example: `${H.table(['Container width', 'Template'], [['300px (sidebar)', '"title" "chart" "stats"'], ['600px', '"title title" "chart stats"'], ['1000px', '"title title title" "chart stats details"']])}<p>The same widget at the same 1440px viewport shows three different layouts depending on where it sits.</p>`,
  brute: { why: `<p>Viewport media queries only know the window width. A widget in a 300px sidebar on a 1440px screen would pick the desktop three-column layout and be crushed.</p>`, code: cs(`@media (min-width: 1024px) {
  .widget { grid-template-columns: 2fr 1fr 1fr; }      /* wrong in a 300px sidebar on a big screen */
}`) },
  mcq: { q: 'What must be set on the wrapper so <code>@container (min-width: 480px)</code> works?', options: ['<code>container-type: inline-size</code>', 'position: relative', 'display: container'], answer: 0, explain: 'Container queries query the nearest ancestor with a container-type. inline-size makes its width queryable (and applies containment).' },
  hints: [`<p>Container queries need a container: a wrapper with <code>container-type: inline-size</code> (you cannot query the element you style).</p>`, `<p>Style the inner <code>.widget</code> with grid areas and change only <code>grid-template-areas</code>/columns inside <code>@container</code> blocks.</p>`, `<p>Base (no query) = stacked layout, which is also the fallback for older browsers. Wrap the container rules in <code>@supports (container-type: inline-size)</code> if you need an explicit fallback story. Use <code>aspect-ratio: 16 / 9</code> for the chart.</p>`],
  solution: {
    approach: `<p>Wrapper = container; widget = grid whose template depends on the wrapper width. Mobile-first inside the container: the base stacked layout needs no query, so unsupporting browsers get a usable layout.</p>`,
    code: cs(`.widget-wrap { container-type: inline-size; container-name: widget; }   /* the thing we query */

.widget  { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr);
           grid-template-areas: "title" "chart" "stats"; }               /* base: stacked */
.w-title   { grid-area: title; }
.w-chart   { grid-area: chart; aspect-ratio: 16 / 9; background: #e2e8f0; }
.w-stats   { grid-area: stats; }
.w-details { grid-area: details; display: none; }

@container widget (min-width: 480px) {
  .widget { grid-template-columns: 2fr 1fr; grid-template-areas: "title title" "chart stats"; }
}
@container widget (min-width: 800px) {
  .widget { grid-template-columns: 2fr 1fr 1fr; grid-template-areas: "title title title" "chart stats details"; }
  .w-details { display: block; }
}`),
    complexity: `<p>The browser re-evaluates container queries on container resize; containment keeps the cost local to the widget.</p>`,
    followUps: ['Use container query units (cqi) to scale the chart title.', 'Why can you not query the width of the very element you style?']
  }
});
/* =====================================================================
   QUIZ
   ===================================================================== */
quiz.push({ q: 'A flex container is 700px wide with three items of <code>flex-basis: 200px</code> and grow factors 1, 2 and 0. What are the final widths?', options: ['233.33 / 266.67 / 200', '300 / 400 / 0', '200 / 400 / 100', '233.33 / 233.33 / 233.33'], answer: 0, explain: 'Free space = 700 - 600 = 100px. Grow total = 3: item 1 gets 33.33, item 2 gets 66.67, item 3 gets 0. Finals: 233.33, 266.67, 200.' });
quiz.push({ q: 'Two items with basis 300px and 100px (shrink 1 each) are in a 200px container. What are the final widths?', options: ['150 / 50', '100 / 100', '200 / 0', '250 / 50'], answer: 0, explain: 'Overflow = 200px. The scaled shrink factors are 300 and 100, so the 300px item loses 3/4 of 200 = 150px and the 100px item loses 1/4 = 50px. That leaves 150 and 50.' });
quiz.push({ q: 'In <code>flex-direction: column</code>, which property aligns items horizontally (the cross axis)?', options: ['<code>align-items</code>', '<code>justify-content</code>', '<code>flex-wrap</code>', '<code>align-content</code> only'], answer: 0, explain: 'In column mode the main axis is vertical, so justify-content works vertically and align-items works horizontally.' });
quiz.push({ q: 'What does <code>flex: 1</code> expand to?', options: ['<code>1 1 0%</code>', '<code>1 1 auto</code>', '<code>0 1 auto</code>', '<code>1 0 0</code>'], answer: 0, explain: 'The single-number form sets grow to 1, shrink to 1 and basis to 0%, so all free space is shared equally ignoring content size.' });
quiz.push({ q: 'A grid is 900px wide, gap 16px, with columns <code>200px 1fr 2fr</code>. How wide is the <code>2fr</code> column?', options: ['445.33px', '450px', '300px', '400px'], answer: 0, explain: 'Pool = 900 - 32 (gaps) - 200 = 668px. 1fr = 668 / 3 = 222.67px, so 2fr = 445.33px.' });
quiz.push({ q: 'With only 2 cards in <code>repeat(auto-fit, minmax(220px, 1fr))</code>, what happens compared with <code>auto-fill</code>?', options: ['auto-fit collapses empty tracks so the 2 cards stretch to fill the row', 'auto-fit leaves empty columns on the right', 'They behave identically', 'auto-fit makes the cards 220px exactly'], answer: 0, explain: 'auto-fit collapses unused tracks to 0 width so the remaining tracks (1fr max) grow; auto-fill keeps the empty tracks.' });
quiz.push({ q: 'An absolutely positioned badge appears at the corner of the page instead of its card. What is the most likely fix?', options: ['Add <code>position: relative</code> to the card', 'Add <code>z-index: 1</code> to the badge', 'Use <code>float: right</code>', 'Add <code>display: block</code> to the badge'], answer: 0, explain: 'An absolute element is positioned against its nearest positioned ancestor. With none, it uses the page, so make the card a (relative) containing block.' });
quiz.push({ q: 'A modal has <code>z-index: 9999</code> but still appears under a header with <code>z-index: 10</code>. The modal sits inside a card with <code>transform: translateZ(0)</code>. Why?', options: ['The transform created a stacking context at level 0 that traps the modal', 'z-index is capped at 1000', 'position: fixed ignores z-index', 'Headers always win'], answer: 0, explain: 'The card is a stacking context painted as one sheet at level 0 in the root context. The header at 10 is above that whole sheet.' });
quiz.push({ q: 'Which of these does NOT create a stacking context by itself?', options: ['<code>position: relative</code> with <code>z-index: auto</code>', '<code>opacity: 0.9</code>', '<code>position: fixed</code>', '<code>transform: scale(1)</code>'], answer: 0, explain: 'A relatively positioned element with z-index auto stays in its parent context. Opacity below 1, fixed positioning and transforms all create contexts.' });
quiz.push({ q: 'A <code>position: sticky; top: 0</code> header does not stick. An ancestor has <code>overflow: hidden</code>. What is a safe fix?', options: ['Use <code>overflow: clip</code> on the ancestor (or remove it)', 'Add <code>z-index: 9999</code> to the header', 'Switch the header to <code>position: absolute</code>', 'Add <code>display: flex</code> to the ancestor'], answer: 0, explain: 'overflow: hidden makes the ancestor a scroll container, so the header sticks to a box that never scrolls. overflow: clip clips without creating a scroll container.' });
quiz.push({ q: 'What is the benefit of mobile-first CSS (min-width queries)?', options: ['The base styles are the simplest layout and larger screens only add rules', 'Mobile devices ignore media queries', 'It removes the need for the viewport meta tag', 'It makes CSS files smaller than any other approach'], answer: 0, explain: 'You start from the smallest layout and progressively enhance, avoiding undoing complex desktop rules and overlapping ranges.' });
quiz.push({ q: 'Which pair of properties is cheapest to animate (compositor-only in most browsers)?', options: ['<code>transform</code> and <code>opacity</code>', '<code>width</code> and <code>height</code>', '<code>top</code> and <code>left</code>', '<code>margin</code> and <code>padding</code>'], answer: 0, explain: 'transform and opacity can be handled by the compositor without re-running layout or paint each frame.' });
quiz.push({ q: 'You define <code>:root { --brand: blue; --accent: var(--brand); }</code> and <code>.card { --brand: red; }</code>. Inside the card, what is <code>var(--accent)</code>?', options: ['blue', 'red', 'invalid', 'transparent'], answer: 0, explain: 'var() inside a custom property is resolved on the element that declares it (:root), and descendants inherit the resolved value (blue), even though --brand is redefined on the card.' });
quiz.push({ q: 'Where should the <code>transition</code> property be placed to animate both hover-in and hover-out?', options: ['On the element\'s base state', 'Only on the :hover rule', 'Inside the @keyframes block', 'On the parent element'], answer: 0, explain: 'The transition used is taken from the element\'s destination state. Declared on the base rule, it applies when entering and when leaving :hover.' });

/* =====================================================================
   INTERVIEW
   ===================================================================== */
interview.push({ q: 'Explain how flex-grow, flex-shrink and flex-basis work together. How would you compute the final widths by hand?', level: 'I', a: `<p>Each item starts at its <b>flex-basis</b>. Add up the bases and compare with the container: <b>free space = container - sum(bases)</b>. If it is positive, items grow: each gets <code>free x grow / sum(grow)</code> added (if the grow factors sum to less than 1, only that fraction of the free space is handed out). If it is negative, items shrink, and the shrink is <b>weighted by basis</b>: each item's weight is <code>shrink x basis</code>, and it loses <code>overflow x weight / sum(weights)</code>.</p><p>Example: 700px container, three 200px items with grow 1/2/0 gives free = 100, widths 233.33 / 266.67 / 200. Finally the browser clamps against min/max sizes, freezes violators and repeats - the "resolve flexible lengths" loop.</p>`, followUps: ['Why does a long word stop an item shrinking?', 'What changes if flex-basis is 0 instead of auto?'] });
interview.push({ q: 'When would you choose CSS Grid over Flexbox, and vice versa?', level: 'B', a: `<p>Flexbox is <b>one-dimensional</b>: it distributes items along a single axis and is content-driven - great for navbars, toolbars, button rows, and centring. Grid is <b>two-dimensional</b>: you define rows and columns first and place items into them - great for page layouts, card grids, dashboards, and anything where items must align on both axes.</p><p>Rule of thumb: if you are laying out a row <i>or</i> a column of things and want content to decide sizes, use flex. If you need alignment across rows and columns, or you can draw the layout as a table of areas, use grid. They combine well: a grid for the page, flex inside the cells. Grid also fixes the "last row doesn't line up" problem of wrapped flex.</p>`, followUps: ['Build a card grid that wraps without media queries.', 'How does subgrid help nested components?'] });
interview.push({ q: 'How do you centre a div horizontally and vertically? Give at least three ways and trade-offs.', level: 'B', a: `<p>(1) <b>Flexbox</b>: parent <code>display: flex; justify-content: center; align-items: center</code>. (2) <b>Grid</b>: parent <code>display: grid; place-items: center</code> - the shortest. (3) <b>Auto margins</b> on a flex/grid child: <code>margin: auto</code>. (4) <b>Absolute</b>: parent <code>position: relative</code>, child <code>position: absolute; inset: 0; margin: auto</code> with a known width/height, or <code>top: 50%; left: 50%; transform: translate(-50%, -50%)</code> for unknown sizes.</p><p>Trade-offs: flex/grid are in-flow and robust; absolute removes the element from flow (the parent will not size to it) and the transform version can blur text on fractional pixels.</p>`, followUps: ['How do you centre in the viewport on mobile with dynamic toolbars?', 'Centre text vertically inside a button.'] });
interview.push({ q: 'What is a stacking context? Why does z-index: 9999 sometimes not work?', level: 'I', a: `<p>A stacking context is an isolated "folder" of layers: z-index values only compare elements inside the <b>same</b> context, and the whole context is painted as a single unit at its own level in its parent context. It is created by the root element, positioned elements with a z-index other than auto, fixed/sticky positioning, flex/grid children with z-index, and by opacity &lt; 1, transform, filter, isolation: isolate, will-change, contain, mix-blend-mode and similar.</p><p>So <code>z-index: 9999</code> fails when an ancestor created a context at a lower level than the thing you want to be above: the 9999 is trapped inside. Debug by walking up the ancestors, finding the first shared context, and comparing the levels there.</p>`, followUps: ['Does z-index: auto create a context?', 'How does the top layer (dialog/popover) avoid this?'] });
interview.push({ q: 'Describe the paint order inside a stacking context.', level: 'A', a: `<p>Back to front: (1) the context root's own background and borders; (2) descendants with <b>negative</b> z-index (most negative first); (3) in-flow non-positioned block descendants; (4) floats; (5) inline content (text); (6) positioned descendants with z-index <code>auto</code> or <code>0</code> in DOM order; (7) positioned descendants with <b>positive</b> z-index, lowest first. Ties fall back to DOM order.</p><p>Child stacking contexts are painted atomically at the level where they sit (their own z-index), so nothing inside them can interleave with outside layers. This is why a deeply nested high z-index cannot pop out.</p>`, followUps: ['Where does a float with a negative-z-index sibling end up?', 'What is the difference between z-index auto and 0?'] });
interview.push({ q: 'How do position: relative, absolute, fixed and sticky differ?', level: 'B', a: `<p><b>relative</b> keeps the element in flow (its original space is reserved) and offsets it from where it would be; it is also the usual way to create a containing block for absolute children. <b>absolute</b> removes it from flow and positions it against the nearest positioned ancestor. <b>fixed</b> removes it from flow and positions against the viewport (unless an ancestor has transform/filter/perspective, which becomes its containing block). <b>sticky</b> is in flow like relative until the scroll position hits its threshold (e.g. top: 0), then it sticks - but only within its parent and only if no ancestor between it and the scroller has overflow hidden/auto.</p>`, followUps: ['Why does sticky stop working with overflow hidden?', 'What is the containing block for fixed inside a transformed parent?'] });
interview.push({ q: 'Explain mobile-first design and how media queries support it. What breakpoints would you choose?', level: 'B', a: `<p>Mobile-first means the base CSS (no media query) targets the smallest screens, usually a single stacked column with large tap targets. You then use <code>min-width</code> queries to progressively enhance for larger viewports. Benefits: simpler base, fewer overrides, no overlapping ranges, and a good baseline for accessibility and slow devices.</p><p>I choose breakpoints from the <b>content</b>: resize until the layout looks cramped or too stretched, then add a breakpoint. Typical results are around 600, 768, 1024 and 1280px, but I prefer few breakpoints plus fluid techniques (auto-fit grids, flex-wrap, clamp) and container queries for components. I always include the viewport meta tag.</p>`, followUps: ['What is wrong with max-width: 768px and min-width: 768px used together?', 'When would you use container queries instead?'] });
interview.push({ q: 'What is the difference between a CSS transition and a CSS animation? When would you use each?', level: 'B', a: `<p>A <b>transition</b> animates a property between two states when it changes (hover, class toggle, JS change); it needs a trigger and has no intermediate keyframes. A <b>keyframe animation</b> (<code>@keyframes</code> + <code>animation</code>) defines a timeline with multiple steps; it can run automatically, loop, alternate direction, delay, and be paused. Use transitions for simple state feedback (hover, focus, open/close) and animations for loaders, entrance effects, looping or multi-step motion.</p><p>Both should stick to transform and opacity for performance, and respect <code>prefers-reduced-motion</code>.</p>`, followUps: ['What does animation-fill-mode: both do?', 'How can you animate to height: auto?'] });
interview.push({ q: 'Why are transform and opacity recommended for animation? What happens in the browser pipeline?', level: 'I', a: `<p>Each frame can involve style recalculation, layout, paint and composite. Properties like <code>width</code>, <code>height</code>, <code>top</code>, <code>left</code> and <code>margin</code> change geometry, so every frame re-runs <b>layout</b> (and paint). Colour and box-shadow changes need <b>paint</b>. <code>transform</code> and <code>opacity</code> can be applied by the <b>compositor</b> to an already-painted layer, often on the GPU and on a separate thread, so they stay smooth even when the main thread is busy.</p><p>Caveats: over-promoting layers (<code>will-change</code> everywhere) wastes memory, and animating transform on text can blur at sub-pixel positions.</p>`, followUps: ['What is FLIP?', 'How do you check what your animation triggers in DevTools?'] });
interview.push({ q: 'How do CSS custom properties differ from Sass variables? What are the gotchas?', level: 'I', a: `<p>Sass variables are compile-time and disappear in the output. CSS custom properties are <b>runtime</b> values: they live in the cascade, inherit down the DOM, can be overridden per element, changed via JavaScript (<code>style.setProperty</code>) and used for theming (dark mode) without recompiling.</p><p>Gotchas: they cannot be used in media query conditions or to build selectors/property names; an undefined variable without a fallback makes the property invalid at computed-value time; <code>var()</code> inside another custom property resolves on the element that declares it, so descendants inherit the already-resolved value; self-referencing creates a cycle; unregistered variables are strings and do not animate (register with <code>@property</code>).</p>`, followUps: ['How would you implement dark mode with variables?', 'What does @property add?'] });
interview.push({ q: 'A flex child with a long URL overflows its container even though it has flex: 1. How do you fix it and why does it happen?', level: 'I', a: `<p>Flex items have <code>min-width: auto</code>, which resolves to their <b>min-content</b> width. A long unbreakable string has a large min-content size, so the item refuses to shrink below it and overflows. Fix with <code>min-width: 0</code> on the flex item (and <code>overflow-wrap: anywhere</code> or <code>text-overflow: ellipsis</code> with <code>overflow: hidden</code> for the text). In column flex containers the same applies vertically with <code>min-height: 0</code>, which is why scrollable panels inside a flex column need it. In grid, use <code>minmax(0, 1fr)</code> instead of plain <code>1fr</code>.</p>`, followUps: ['Why does a plain 1fr track behave similarly?', 'Does overflow: hidden change the automatic minimum size?'] });
interview.push({ q: 'Design a responsive card layout that needs the fewest media queries. Walk through your choices.', level: 'A', a: `<p>Start with a grid: <code>grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); gap: 16px</code>. The browser computes the column count as <code>floor((W + gap) / (min + gap))</code>, so there are zero breakpoints for the card count. Use <code>clamp()</code> for padding and type sizes so spacing and text scale smoothly. Make cards themselves flex columns with the action pinned via <code>margin-top: auto</code>. For layout changes inside a card that depend on the space it has (not the window), add a container query on a wrapper with <code>container-type: inline-size</code>. Keep only structural media queries (sidebar appearing) at a content-based width, and honour <code>prefers-reduced-motion</code> for hover/entrance effects. Test at 320px, zoomed to 200%, and with long words.</p>`, followUps: ['auto-fit versus auto-fill with 2 cards?', 'How do you keep a featured card spanning two columns safely on phones?'] });
interview.push({ q: 'You are asked to implement a dark theme for a large app. How do you approach it with CSS variables?', level: 'A', a: `<p>Introduce a <b>token layer</b>: primitive tokens (<code>--gray-900</code>) and semantic tokens (<code>--color-bg</code>, <code>--color-text</code>, <code>--color-primary</code>, <code>--color-border</code>). Migrate components to use only semantic tokens (lint for hard-coded hex values). Define light values on <code>:root</code>; define dark values under <code>:root[data-theme="dark"]</code> and under <code>@media (prefers-color-scheme: dark)</code> guarded by <code>:root:not([data-theme="light"])</code>, so user choice beats the OS default. Set <code>color-scheme</code> so native controls match, store the choice in localStorage, apply it with an inline script before first paint to avoid a flash, and check contrast (WCAG AA) in both themes, plus images/shadows that assume a light background.</p>`, followUps: ['How do you avoid the flash of the wrong theme?', 'How would you support a high-contrast theme?'] });
registerModule({
  id: 'fe05',
  title: 'CSS Layout Mastery & Responsive Design',
  intro: `<p>You already know selectors and the box model. This module teaches you to <b>build real page layouts</b> that work on a phone, a laptop and a huge monitor: Flexbox and Grid in depth (with the actual maths of how space is shared), positioning and the famous <b>stacking context</b> that makes <code>z-index: 9999</code> fail, media queries and mobile-first design, transitions and keyframe animations, and CSS variables for themes. Every topic has a step-by-step visualizer and a runnable calculator, and the practice set contains the layout questions interviewers love: the holy grail, centring anything, responsive card grids, sticky headers and computing flex widths by hand.</p>`,
  goals: [
    'Predict the final width of every flex item from <code>flex-basis</code>, <code>flex-grow</code> and <code>flex-shrink</code> using the free-space formula',
    'Build page layouts with CSS Grid: tracks, <code>fr</code>, <code>minmax()</code>, <code>auto-fit</code>, named areas and spans, including a responsive card grid with no media queries',
    'Choose the right <code>position</code> value, make <code>sticky</code> work, and debug any z-index problem by finding the stacking context',
    'Write mobile-first CSS with a small number of content-driven breakpoints, preference queries and container queries',
    'Add smooth, performant transitions and keyframe animations that respect <code>prefers-reduced-motion</code>',
    'Create themes and component variants with CSS custom properties, and explain how they inherit and resolve'
  ],
  prereqs: `<b>FE 3 (CSS Basics)</b>: selectors, cascade, specificity, box model, units, display types and basic positioning. Basic HTML from <b>FE 2</b>. No JavaScript is required except for the small runnable calculators (plain loops and functions).`,
  hours: 14,
  topics: topics,
  practice: practice,
  quiz: quiz,
  interview: interview
});
})();
