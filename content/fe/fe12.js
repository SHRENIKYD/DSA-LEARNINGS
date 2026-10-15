(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared helpers for this module's visualizers ---------- */
  function pad4(frames, tip) {
    while (frames.length < 4) {
      var last = frames[frames.length - 1];
      frames.push({ narr: tip || 'Tip: use a longer input above to see more steps.', parts: last.parts });
    }
    return frames;
  }
  function cp(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }
  // "a,b,_,c" -> ['a','b',null,'c']  (level-order tree; _ or empty = missing)
  function parseTree(str, hint) {
    var a = String(str === undefined ? '' : str).split(',').map(function (s) { return s.trim(); }).map(function (s) { return (s === '' || s === '_' || s === 'null') ? null : s; });
    if (!a.length || a[0] === null) throw new Error(hint);
    if (a.length > 15) throw new Error('Use at most 15 slots (4 levels). ' + hint);
    return a;
  }
  function has(arr, i) { return i < arr.length && arr[i] !== null && arr[i] !== undefined; }
  // mark node i and everything below it
  function markSub(hl, arr, i, cls) {
    if (!has(arr, i)) return;
    hl[i] = cls;
    markSub(hl, arr, 2 * i + 1, cls);
    markSub(hl, arr, 2 * i + 2, cls);
  }
  function splitWords(input, max, hint) {
    var items = String(input === undefined ? '' : input).split(/[\s,]+/).filter(Boolean);
    if (!items.length) throw new Error(hint);
    if (items.length > max) throw new Error('Use at most ' + max + ' items. ' + hint);
    return items;
  }

  /* =====================================================================
     TOPIC 1 — Virtual DOM & reconciliation
     ===================================================================== */
  topics.push({
    title: 'Virtual DOM & Reconciliation: How React Decides What to Change',
    analogy: `<p>Think of an <b>architect with two blueprints</b> of the same house: the one that was built yesterday and the new one the client just sent. The architect does not knock the house down and rebuild it. She lays the blueprints side by side, circles only the differences ("this window is now bigger, this door is gone"), and sends a short to-do list to the builders. The blueprint is the <b>virtual DOM</b>. Laying them side by side is <b>reconciliation</b>. The builders are the <b>real DOM</b>, which is slow to touch, so we want them to do as little as possible.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> The real DOM (the page the browser draws) is slow to change. So React keeps a cheap copy of the UI in memory: a tree of plain JavaScript objects. Every time your component renders, it returns a <i>new</i> tree of these objects. React then compares the <b>old tree</b> with the <b>new tree</b>, works out the smallest list of changes, and applies only those to the real DOM. That compare-and-update step is called <b>reconciliation</b> (the algorithm is nicknamed "diffing").</p>
      <p>A "virtual DOM node" is nothing magical. <code>&lt;p className="big"&gt;Hi&lt;/p&gt;</code> becomes an object roughly like this:</p>
      ${H.kv([['type', '"p"'], ['props', '{ className: "big", children: "Hi" }'], ['key', 'null']], { label: 'one React element (virtual node)' })}
      <p>Comparing any two trees perfectly takes about O(n<sup>3</sup>) time, which is far too slow for a 1,000-node page. React cheats with <b>two sensible assumptions</b> that make it O(n):</p>
      <ol>
        <li><b>Different type means different tree.</b> If a <code>&lt;div&gt;</code> became a <code>&lt;section&gt;</code> (or <code>&lt;Profile&gt;</code> became <code>&lt;Settings&gt;</code>), React does not try to be clever. It throws the old subtree away and builds a new one.</li>
        <li><b>Keys say who is who.</b> In a list, a <code>key</code> is a stable ID that lets React recognise the same item even when it moves to a new position.</li>
      </ol>
      <p>🔵 <b>What happens at each spot in the tree.</b> React walks both trees together, one position at a time:</p>
      ${H.table(['Old vs new at the same position', 'What React does', 'What happens to state?'], [
        ['Same type (<code>div</code> to <code>div</code>)', 'Keeps the DOM node, updates only changed props, then compares the children', '<span class="c-g">Kept</span>'],
        ['Same component type (<code>&lt;Cart/&gt;</code> to <code>&lt;Cart/&gt;</code>)', 'Calls the component again with new props, compares what it returns', '<span class="c-g">Kept</span>'],
        ['Different type (<code>div</code> to <code>section</code>)', 'Destroys the old subtree, builds the new one from scratch', '<span class="c-r">Lost (unmount + mount)</span>'],
        ['Node only in the new tree', 'Creates and inserts it', 'Fresh state'],
        ['Node only in the old tree', 'Removes it and runs cleanups', '<span class="c-r">Gone</span>']
      ])}
      <p>🔵 <b>Lists and keys.</b> With no key, React matches children <i>by position</i>: first with first, second with second. If you insert one item at the top of a 100-item list, every row now "looks different" from the row that used to sit there, so React updates all 100. With <code>key="id-42"</code> React sees "item 42 just moved down one spot" and only inserts one new row.</p>
      ${H.arr(['A', 'B', 'C', 'D'], { label: 'old list (keys)', hl: { 0: 'b', 1: 'b', 2: 'b', 3: 'b' } })}
      ${H.arr(['X', 'A', 'B', 'C', 'D'], { label: 'new list: X inserted at the top', hl: { 0: 'g' } })}
      <p>Without keys React compares A to X, B to A, C to B... and rewrites four rows. With keys it inserts one. Never use the array index as a key when the list can be reordered, filtered, or inserted into, because the index is a position, not an identity. Never use <code>Math.random()</code> either: a new key every render means React remounts every row every time.</p>
      <p><b>Is the "virtual DOM" actually faster?</b> Not always. Plain <code>element.textContent = "x"</code> beats any framework for one tiny change. The real win is that you describe <i>what the UI should look like</i> and React finds the changes for you, so your code stays simple and correct as the app grows. Several modern tools (Svelte, Solid, Vue Vapor mode) skip the virtual DOM and update the DOM directly with compile-time knowledge; React answers that with the React Compiler, which adds automatic memoization to avoid needless re-renders.</p>`,
    clues: [
      '"Why does my input lose what I typed when the parent re-renders?" → the element type or position changed, so React remounted it',
      '"List items flicker / keep stale text after delete or reorder" → bad keys (usually the array index)',
      '"What is the virtual DOM / how does React know what to update?" → describe the two diffing assumptions (type + key) and the O(n) result',
      '"Component state resets when I wrap it in a div / move it into a conditional" → different type or different position = unmount and remount',
      '"Does render mean the DOM changed?" → no: render builds a new virtual tree; only the commit phase touches the real DOM, and only for real differences',
      '"Is the virtual DOM faster than the real DOM?" → it is not magic; it is a way to batch and minimise DOM work while keeping the code declarative'
    ],
    code: [
      {
        lang: 'js', run: true, title: 'A tiny virtual DOM diff that prints patch operations',
        code: `// A virtual node is just a plain object: { type, props, children }.
// Text children are plain strings.
function h(type, props, ...children) {
  return { type, props: props || {}, children: children.flat() };
}

function label(node) {
  return typeof node === 'string' ? '"' + node + '"' : '<' + node.type + '>';
}

// Compare two virtual nodes and return a list of patch operations.
// "path" tells us where we are in the tree (just for printing).
function diff(oldNode, newNode, path) {
  path = path || 'root';
  if (oldNode === undefined && newNode === undefined) return [];
  if (oldNode === undefined) return [{ op: 'CREATE', at: path, node: label(newNode) }];
  if (newNode === undefined) return [{ op: 'REMOVE', at: path, node: label(oldNode) }];

  // Text on either side
  if (typeof oldNode === 'string' || typeof newNode === 'string') {
    if (typeof oldNode === 'string' && typeof newNode === 'string') {
      return oldNode === newNode ? [] : [{ op: 'SET_TEXT', at: path, from: oldNode, to: newNode }];
    }
    return [{ op: 'REPLACE', at: path, from: label(oldNode), to: label(newNode) }];
  }

  // Assumption 1: different type => throw the old subtree away. No digging deeper.
  if (oldNode.type !== newNode.type) {
    return [{ op: 'REPLACE', at: path, from: label(oldNode), to: label(newNode) }];
  }

  // Same type: keep the DOM node, patch changed props
  const patches = [];
  const names = new Set([...Object.keys(oldNode.props), ...Object.keys(newNode.props)]);
  for (const name of names) {
    if (!(name in newNode.props)) patches.push({ op: 'REMOVE_PROP', at: path, name });
    else if (oldNode.props[name] !== newNode.props[name]) {
      patches.push({ op: 'SET_PROP', at: path, name, value: newNode.props[name] });
    }
  }
  // ...then compare children position by position (no keys in this version)
  const count = Math.max(oldNode.children.length, newNode.children.length);
  for (let i = 0; i < count; i++) {
    patches.push(...diff(oldNode.children[i], newNode.children[i], path + '/' + oldNode.type + '[' + i + ']'));
  }
  return patches;
}

const before = h('div', { class: 'card' },
  h('h1', null, 'Hi'),
  h('p', null, 'Hello'),
  h('ul', null, h('li', null, 'apple')));

const after = h('div', { class: 'card big' },
  h('h1', null, 'Hi Ada'),
  h('span', null, 'Hello'),
  h('ul', null, h('li', null, 'apple'), h('li', null, 'pear')));

for (const p of diff(before, after)) console.log(JSON.stringify(p));
// The <p> became a <span>: whole subtree REPLACEd. Everything else was a cheap patch.`
      },
      {
        lang: 'js', run: true, title: 'Keyed list reconciliation (the "lastPlacedIndex" idea)',
        code: `// React matches list children by key. It remembers the highest OLD position
// it has already "kept in place" (lastPlaced). A reused item whose old
// position is LOWER than that must physically MOVE to get behind it.
function reconcileKeyed(oldKeys, newKeys) {
  const oldIndex = new Map(oldKeys.map((k, i) => [k, i]));
  const ops = [];
  let lastPlaced = 0;
  newKeys.forEach((key, newPos) => {
    if (!oldIndex.has(key)) {
      ops.push('INSERT ' + key + ' at ' + newPos);
      return;
    }
    const was = oldIndex.get(key);
    if (was < lastPlaced) ops.push('MOVE   ' + key + ' (was ' + was + ', now ' + newPos + ')');
    else {
      lastPlaced = was;
      ops.push('KEEP   ' + key);
    }
  });
  const alive = new Set(newKeys);
  oldKeys.forEach((k) => { if (!alive.has(k)) ops.push('REMOVE ' + k); });
  return ops;
}

console.log('--- insert at top');
console.log(reconcileKeyed(['A', 'B', 'C', 'D'], ['X', 'A', 'B', 'C', 'D']).join(' | '));
console.log('--- last item jumps to front');
console.log(reconcileKeyed(['A', 'B', 'C', 'D'], ['D', 'A', 'B', 'C']).join(' | '));
console.log('--- delete B');
console.log(reconcileKeyed(['A', 'B', 'C', 'D'], ['A', 'C', 'D']).join(' | '));`
      }
    ],
    codeTitle: ['Plain-JS model: diff two virtual trees', 'Plain-JS model: keyed list diff'],
    viz: [
      {
        title: 'Two virtual trees, one diff (green = reused, red = thrown away)',
        input: 'div,header,ul,h1,_,li,li | div,header,ol,h1,_,li,li',
        inputLabel: 'Old tree | New tree (level order, comma separated, _ = empty, max 15 slots, short names)',
        gen: function (input) {
          var hint = 'Format: old | new, for example  div,header,ul,h1,_,li,li | div,header,ol,h1,_,li,li';
          var parts = String(input).split('|');
          if (parts.length !== 2) throw new Error(hint);
          var A = parseTree(parts[0], hint), B = parseTree(parts[1], hint);
          var hlA = {}, hlB = {}, ops = [], frames = [], reused = 0, thrown = 0, made = 0;
          function snap(narr, cur) {
            var tg = {};
            if (cur !== undefined) tg[cur] = 'here';
            frames.push({ narr: narr, parts: [
              { type: 'tree', label: 'OLD tree (what React has on screen)', arr: A, hl: cp(hlA), tags: tg },
              { type: 'tree', label: 'NEW tree (what render just returned)', arr: B, hl: cp(hlB), tags: tg },
              { type: 'table', label: 'Decisions so far', columns: ['#', 'spot', 'decision', 'what React does'], rows: ops.map(function (r) { return r.slice(); }), hl: ops.length ? { 0: '' } : {} }
            ] });
          }
          snap('Left is the tree React drew last time. Right is what your component returned this time. React now walks both together from the top, one spot at a time. <b>Green</b> = kept, <b>red</b> = thrown away, <b>purple</b> = newly built.');
          function walk(i) {
            var o = has(A, i) ? A[i] : null, n = has(B, i) ? B[i] : null;
            if (o === null && n === null) return;
            var step = ops.length + 1;
            if (n === null) {
              markSub(hlA, A, i, 'bad');
              thrown++;
              ops.push([step, 'spot ' + i, '<span class="c-r">removed</span>', 'unmount <b>' + o + '</b> and everything inside it']);
              snap('Spot ' + i + ': the old tree had <b>' + o + '</b> but the new one has nothing here. React removes it and runs the cleanup code of everything inside.', i);
              return;
            }
            if (o === null) {
              markSub(hlB, B, i, 'sel');
              made++;
              ops.push([step, 'spot ' + i, '<span class="c-p">created</span>', 'mount <b>' + n + '</b> (fresh state)']);
              snap('Spot ' + i + ': nothing was here before, now there is <b>' + n + '</b>. React creates it (and anything inside it) and inserts it into the page.', i);
              return;
            }
            if (o !== n) {
              markSub(hlA, A, i, 'bad');
              markSub(hlB, B, i, 'sel');
              thrown++; made++;
              ops.push([step, 'spot ' + i, '<span class="c-r">replaced</span>', '<b>' + o + '</b> to <b>' + n + '</b>: destroy old subtree, build new one']);
              snap('Spot ' + i + ': type changed from <b>' + o + '</b> to <b>' + n + '</b>. React does <b>not</b> look inside. The whole old subtree is destroyed (state lost!) and a new one is built. Children are never compared.', i);
              return;
            }
            hlA[i] = 'ok'; hlB[i] = 'ok';
            reused++;
            ops.push([step, 'spot ' + i, '<span class="c-g">reused</span>', 'same type <b>' + n + '</b>: keep the DOM node + state, patch props, then compare children']);
            snap('Spot ' + i + ': <b>' + n + '</b> is the same type on both sides. React keeps the real DOM node and its state, updates any changed props, then goes down to compare the children.', i);
            walk(2 * i + 1);
            walk(2 * i + 2);
          }
          walk(0);
          snap('Done. <b>' + reused + '</b> node(s) reused, <b>' + thrown + '</b> destroyed, <b>' + made + '</b> created. Only the red/purple parts cost real DOM work. If this surprised you, check: did a wrapper or the element type change by accident?');
          return pad4(frames);
        }
      },
      {
        title: 'Keys: position matching vs key matching',
        input: 'A,B,C,D | D,A,B,C',
        inputLabel: 'Old keys | New keys (no repeats, max 8 each)',
        gen: function (input) {
          var hint = 'Format: old | new, for example  A,B,C,D | D,A,B,C';
          var p = String(input).split('|');
          if (p.length !== 2) throw new Error(hint);
          var O = splitWords(p[0], 8, hint), N = splitWords(p[1], 8, hint);
          [O, N].forEach(function (L) { if (L.some(function (k, i) { return L.indexOf(k) !== i; })) throw new Error('Keys must be unique inside one list. ' + hint); });
          var frames = [], i;
          frames.push({ narr: 'Same list, two ways to match. <b>No keys</b>: React compares old[0] with new[0], old[1] with new[1], and so on. <b>With keys</b>: React looks each item up by its ID.', parts: [
            { type: 'array', label: 'old list', values: O, hl: {} },
            { type: 'array', label: 'new list', values: N, hl: {} }
          ] });
          // --- by position
          var work = 0, len = Math.max(O.length, N.length);
          var hlN = {}, hlO = {};
          for (i = 0; i < len; i++) {
            var o = i < O.length ? O[i] : null, n = i < N.length ? N[i] : null, why;
            if (o === null) { hlN[i] = 'sel'; work++; why = 'new row ' + i + ' has no partner: <b>create</b> row <b>' + n + '</b>.'; }
            else if (n === null) { hlO[i] = 'bad'; work++; why = 'old row ' + i + ' (<b>' + o + '</b>) has no partner: <b>remove</b> it.'; }
            else if (o === n) { hlN[i] = 'ok'; hlO[i] = 'ok'; why = 'row ' + i + ' is <b>' + n + '</b> in both lists: nothing to do.'; }
            else { hlN[i] = 'bad'; hlO[i] = 'bad'; work++; why = 'row ' + i + ' was <b>' + o + '</b> but is now <b>' + n + '</b>: React <b>updates</b> the old row to show new data (and any state typed in it stays glued to this POSITION, not to the item).'; }
            frames.push({ narr: '<b>Without keys</b>, position ' + i + ': ' + why, parts: [
              { type: 'array', label: 'old list', values: O, hl: cp(hlO), ptr: (function () { var q = {}; q[i] = 'i'; return q; })() },
              { type: 'array', label: 'new list', values: N, hl: cp(hlN), ptr: (function () { var q = {}; q[i] = 'i'; return q; })() }
            ] });
          }
          // --- by key
          var oldIndex = {}; O.forEach(function (k, ix) { oldIndex[k] = ix; });
          var last = 0, kwork = 0, hlK = {}, newSet = {};
          N.forEach(function (k) { newSet[k] = true; });
          N.forEach(function (k, ix) {
            var msg;
            if (oldIndex[k] === undefined) { hlK[ix] = 'sel'; kwork++; msg = 'key <b>' + k + '</b> is new: <b>insert</b> a row.'; }
            else if (oldIndex[k] < last) { hlK[ix] = 'cur'; kwork++; msg = 'key <b>' + k + '</b> existed at old spot ' + oldIndex[k] + ', which is BEFORE lastPlaced=' + last + ', so its DOM row must <b>move</b>.'; }
            else { last = oldIndex[k]; hlK[ix] = 'ok'; msg = 'key <b>' + k + '</b> existed at old spot ' + oldIndex[k] + ': <b>keep</b> it, no DOM work. lastPlaced is now ' + last + '.'; }
            frames.push({ narr: '<b>With keys</b>, new position ' + ix + ': ' + msg, parts: [
              { type: 'array', label: 'old list', values: O, hl: {} },
              { type: 'array', label: 'new list (keyed)', values: N, hl: cp(hlK) },
              { type: 'vars', label: 'React bookkeeping', vals: { lastPlaced: last, 'DOM operations so far': kwork } }
            ] });
          });
          var removed = O.filter(function (k) { return !newSet[k]; });
          kwork += removed.length;
          frames.push({ narr: 'Totals: matching by <b>position</b> touched <b>' + work + '</b> row(s); matching by <b>key</b> touched <b>' + kwork + '</b> (' + removed.length + ' removal(s) included). Bigger lists make the gap huge, and keyed rows also keep their own state.', parts: [
            { type: 'bars', label: 'DOM operations', values: [work, kwork], idxLabels: ['by position (no keys)', 'by key'], hl: { 0: 'bad', 1: 'ok' } }
          ] });
          return pad4(frames);
        }
      }
    ],
    examples: [
      {
        title: 'Same type: only the changed prop is touched',
        html: `<p>You render <code>&lt;button className="btn"&gt;Buy&lt;/button&gt;</code> and later <code>&lt;button className="btn btn-big"&gt;Buy&lt;/button&gt;</code>. Both are a <code>button</code> at the same spot, so React keeps the existing DOM button, sets one attribute (<code>class</code>), and leaves the text alone. If the user was keyboard-focused on that button, the focus stays. This is the cheap, common case and 95% of re-renders look like this.</p>`,
        code: { lang: 'jsx', check: false, code: `function Buy({ big }) {
  // Same type ("button") at the same spot on every render:
  // React patches className only. DOM node, focus, state all survive.
  return <button className={big ? 'btn btn-big' : 'btn'}>Buy</button>;
}` }
      },
      {
        title: 'Different type: state is lost (the classic wrapper bug)',
        html: `<p>A form lives inside <code>&lt;div&gt;</code> while loading and inside <code>&lt;section&gt;</code> afterwards. To React these are different types at the same spot, so the whole form is <b>unmounted and a new form mounted</b>. The text the user typed vanishes and the input loses focus. The same happens when a component is defined <i>inside</i> another component: every parent render creates a brand-new function, which is a brand-new type, so the child remounts on every keystroke.</p>`,
        code: { lang: 'jsx', check: false, code: `function Page({ loaded }) {
  // BUG: div and section are different types at the same spot.
  return loaded ? <section><Form /></section> : <div><Form /></div>;
}

function Parent() {
  // BUG: Inner is a NEW function on every render, so React sees a new type
  // and remounts it (state lost, input blurred) each time Parent renders.
  function Inner() { return <input />; }
  return <Inner />;
}

// FIX: keep the wrapper type the same and define components at module level.
function Inner() { return <input />; }
function ParentFixed() { return <Inner />; }` }
      },
      {
        title: 'Keys: why the index is a trap',
        html: `<p>A todo list of <code>Buy milk</code>, <code>Walk dog</code>, <code>Call mum</code> where each row has an uncontrolled text input for notes. You delete the first todo. With <code>key={index}</code>, the row at index 0 is now matched with the old index-0 row, so React simply updates the text of that row and the <i>typed note stays in the first input</i>. The notes shift to the wrong todo. With <code>key={todo.id}</code>, React removes exactly the deleted row together with its input and everything stays attached to the right item.</p>`,
        code: { lang: 'jsx', check: false, code: `// BAD: identity = position, which changes when items are removed or reordered
{todos.map((t, i) => <TodoRow key={i} todo={t} />)}

// GOOD: identity = a stable ID that belongs to the data
{todos.map((t) => <TodoRow key={t.id} todo={t} />)}

// Also fine: a key can be used on purpose to RESET a component.
// Changing userId remounts the whole editor with fresh state.
<ProfileEditor key={userId} userId={userId} />` }
      },
      {
        title: 'Render is not commit: React can render and change nothing',
        html: `<p>If a parent re-renders and a child returns the exact same tree, React still <i>ran</i> the child function (render phase), but the diff finds zero differences, so the DOM is not touched at all. People often say "React re-rendered, so the DOM was rebuilt". That is wrong: re-rendering is cheap JavaScript, DOM writes are the expensive part and are skipped when nothing changed. The real cost of needless renders is the JavaScript time, which is why memoization (<code>React.memo</code>, the React Compiler) exists.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>The O(n) heuristic in detail.</b> A general tree-edit-distance algorithm is O(n<sup>3</sup>). React's reconciler instead compares only siblings at the same depth, one pass, so cost grows linearly with the number of nodes. The price: it cannot detect "this subtree moved to a different parent" (it sees delete plus create) and it relies on you giving stable types and keys.</p>
      <p><b>Child reconciliation inside React.</b> For arrays, React first walks both lists in order while keys match (the fast path). On the first key mismatch it builds a <code>Map&lt;key, oldFiber&gt;</code> of the remaining old children and looks each new child up. The <code>lastPlacedIndex</code> trick (the second code sample) decides which nodes physically move: a reused node whose old index is smaller than the highest old index already placed must be moved; others stay put. Consequence: moving the <i>last</i> item to the <i>front</i> costs <b>3 moves</b> (everything else is "moved" past it), while moving the <i>first</i> item to the <i>end</i> costs <b>1 move</b>. This is a known quirk, not a bug.</p>
      <p><b>What is compared for props?</b> React shallow-compares prop by prop (<code>Object.is</code>) when deciding whether to bail out of a component with <code>memo</code>. For DOM elements it diffs each attribute and style key. New object or function props created inline (<code>style={{ ... }}</code>, <code>onClick={() =&gt; ...}</code>) are "different" every render but still produce only a tiny DOM patch; they only hurt when they defeat a <code>memo</code> boundary.</p>
      <p><b>Position also identifies state.</b> State is stored on the fiber for a (type, position, key) slot, not inside your function. That is why <code>{cond ? &lt;A /&gt; : &lt;A /&gt;}</code> keeps state (same type, same slot) while <code>{cond ? &lt;A /&gt; : &lt;B /&gt;}</code> resets it, and why <code>cond &amp;&amp; &lt;A /&gt;</code> followed by a sibling shifts positions only if you use a falsy value that is not <code>null</code> in an array (React keeps a placeholder slot for <code>false</code>/<code>null</code> so siblings do not shift).</p>
      <p><b>Edge cases that bite.</b> (1) <code>key</code> is not a prop: the child cannot read <code>props.key</code>. (2) Duplicate keys give undefined behaviour: items can be duplicated or dropped on updates. (3) Keys only need to be unique among <i>siblings</i>. (4) Fragments with keys (<code>&lt;Fragment key=...&gt;</code>) are the way to key a group of rows. (5) Hidden inputs of <code>type="text"</code> keep the user's typed text across keyed moves, which is the main reason keys matter for forms.</p>
      <p><b>Production reality.</b> The diff is almost never your bottleneck. Typical slowness comes from rendering <i>too many components</i> (fix: virtualize long lists, split state, memoize), not from the diff itself. Measure with the React DevTools Profiler ("why did this render?") before optimizing.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants write JSX fast, and the two most common reconciliation mistakes they produce are exactly the ones in this topic: <code>key={index}</code> on dynamic lists and components declared inside other components. Linters (<code>react/no-array-index-key</code>, <code>react/no-unstable-nested-components</code>) catch both, so keep them on and let the AI fix what the linter flags.</p>
      <p><b>Use AI as a partner:</b> paste a component and ask <code>List every place where this component could remount or lose state when props change, and why</code>. Or ask for a failing React Testing Library test that types in an input, reorders the list, and asserts the text stayed with the right row. Ask it to explain a profiler flame graph you pasted ("which commits were caused by remounts?").</p>
      <p><b>Where AI goes wrong:</b> it often says "React re-renders the whole DOM" or "the virtual DOM is always faster", both false. It may also add <code>React.memo</code> and <code>useCallback</code> everywhere "for performance" without measuring, adding complexity and sometimes making things slower. With the React Compiler enabled (stable since late 2025), much of that manual memoization is redundant.</p>
      <p><b>What you must still own:</b> explaining the two diffing assumptions in plain English, spotting identity bugs (type, position, key), and deciding when a <code>key</code> should <i>intentionally</i> change to reset state.</p>`,
    problems: [
      {
        title: 'Predict the Patch: diffProps',
        level: 'Easy', tags: ['virtual dom', 'diffing', 'props'], companies: ['Meta', 'Atlassian'],
        statement: `<p>Two virtual elements of the <b>same type</b> have props objects <code>oldProps</code> and <code>newProps</code>. Write <code>diffProps(oldProps, newProps)</code> that returns the list of minimal DOM operations as objects: <code>{ op: 'set', name, value }</code> for a new or changed prop and <code>{ op: 'remove', name }</code> for a prop that no longer exists. Unchanged props must produce <b>no</b> operation. Return the operations with all <code>remove</code>s first, then the <code>set</code>s, each group in the order the names appear.</p>`,
        constraints: `Props are flat objects of strings, numbers or booleans. At most 50 props. Compare values with <code>===</code>.`,
        example: `<p>old = <code>{ class: 'btn', title: 'Buy', disabled: true }</code><br>new = <code>{ class: 'btn big', title: 'Buy' }</code></p>
          <p>Output: ${H.c('r', "remove disabled")}, ${H.c('g', "set class = 'btn big'")}. <code>title</code> did not change, so React does not touch it.</p>`,
        brute: { why: `<p>The lazy way is "always overwrite everything": set every new prop and remove every old prop. That produces a DOM write for each prop on every render, including props that did not change. DOM attribute writes can trigger style recalculation, so doing 50 needless writes per node per render is wasted work.</p>`,
          code: `function diffPropsBrute(oldProps, newProps) {
  const ops = [];
  for (const name of Object.keys(oldProps)) ops.push({ op: 'remove', name });
  for (const name of Object.keys(newProps)) ops.push({ op: 'set', name, value: newProps[name] });
  return ops; // correct final DOM, but touches every prop every time
}` },
        mcq: { q: 'A prop exists in oldProps and newProps with the same value. What should the diff produce?', options: ['A set operation, to be safe', 'Nothing at all', 'A remove followed by a set'], answer: 1, explain: 'Equal value means the DOM already shows the right thing. Skipping it is the whole point of diffing.' },
        hints: [
          `<p>Hint 1: there are only three situations per prop name: it vanished, it is new or changed, or it is unchanged. Only the first two need work.</p>`,
          `<p>Hint 2: loop over the keys of oldProps to find vanished props, then loop over the keys of newProps to find new or changed ones. Use <code>name in obj</code> or <code>Object.hasOwn</code> to test existence.</p>`,
          `<p>Hint 3: edge case: a prop whose value is <code>undefined</code> or <code>false</code> still exists. Test with <code>in</code>, not with truthiness. Recipe: removes = old keys missing in new; sets = new keys where old[name] !== new[name] (or missing in old).</p>`
        ],
        solution: {
          approach: `<p>Two small loops. First collect <b>removes</b>: every name in <code>oldProps</code> that is not in <code>newProps</code>. Then collect <b>sets</b>: every name in <code>newProps</code> that is missing from <code>oldProps</code> or has a different value. This is exactly what React does for DOM elements during the commit preparation: it builds an "update payload" of changed props and applies it once.</p>`,
          code: { lang: 'js', run: true, code: `function diffProps(oldProps, newProps) {
  const ops = [];
  // 1) props that disappeared
  for (const name of Object.keys(oldProps)) {
    if (!(name in newProps)) ops.push({ op: 'remove', name });
  }
  // 2) props that are new or changed
  for (const name of Object.keys(newProps)) {
    if (!(name in oldProps) || oldProps[name] !== newProps[name]) {
      ops.push({ op: 'set', name, value: newProps[name] });
    }
  }
  return ops;
}

console.log(JSON.stringify(diffProps(
  { class: 'btn', title: 'Buy', disabled: true },
  { class: 'btn big', title: 'Buy' }
)));
console.log(JSON.stringify(diffProps({ a: 1 }, { a: 1 }))); // []` },
          complexity: `<p>Time O(p) for p props, space O(changes). The DOM work is proportional to what changed, not to how many props the element has.</p>`,
          followUps: ['How would you handle event handler props such as onClick? (React does not set them as attributes; it stores them on the fiber and uses one root listener.)', 'How does React treat style objects: whole-object replace or per-key diff?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 2 — Fiber architecture & time slicing
     ===================================================================== */
  topics.push({
    title: 'Fiber Architecture: Work You Can Pause and Resume',
    analogy: `<p>Imagine reading a 500-page book out loud to a friend. The <b>old way</b> (the "stack reconciler") is: you must finish the whole book without stopping, even if the doorbell rings. The <b>Fiber way</b> is: you put a <b>bookmark</b> after every page. When the doorbell rings, you finish your page, answer the door, then continue from the bookmark. Each page is a <b>unit of work</b>, each bookmark is a <b>fiber</b> (a small object that remembers where you are), and answering the door is the browser handling a click or drawing a frame.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Before React 16, rendering used <b>recursion</b>: React called your component, which called its children, which called theirs... all on the JavaScript call stack. A call stack cannot be paused halfway. If the tree was big, the page froze (no clicks, no typing, no animation) until the whole thing finished.</p>
      <p>React 16 rewrote the engine as <b>Fiber</b>. A <b>fiber</b> is just a JavaScript object, one per component instance (and one per DOM element), that holds the facts React needs about that spot in the tree. Because the facts live in objects (not on the call stack), React can stop after any fiber and later continue exactly where it left off.</p>
      ${H.kv([['type', 'the component function or "div"'], ['key', 'identity among siblings'], ['child', 'first child fiber'], ['sibling', 'next fiber with the same parent'], ['return', 'parent fiber (where to go back up)'], ['pendingProps / memoizedProps', 'new props / last committed props'], ['memoizedState', 'your hooks (a linked list)'], ['alternate', 'the other copy of this fiber (double buffering)'], ['flags / lanes', 'what must be done / how urgent']], { label: 'a fiber (simplified)' })}
      <p>🔵 <b>How the loop works.</b> The fibers form a tree, but React walks it with a <b>plain loop</b> using the three pointers <code>child</code>, <code>sibling</code> and <code>return</code>, not with recursion:</p>
      <ol>
        <li><b>beginWork(fiber)</b>: run the component, compare what it returned with the old children (reconciliation), and go <i>down</i> to the first child.</li>
        <li>No child? <b>completeWork(fiber)</b>: create/prepare the DOM node, bubble up flags, then go <i>sideways</i> to the sibling. No sibling? go <i>up</i> to the parent and complete that.</li>
        <li>Between any two units, ask <code>shouldYield()</code>: "have I used up my slice (about 5 ms)?" If yes, stop, give the main thread back to the browser, and schedule the rest.</li>
      </ol>
      ${H.table(['Phase', 'What happens', 'Can it be paused?', 'Touches the real DOM?'], [
        ['<b>Render</b> (a.k.a. reconcile)', 'Call components, build the new fiber tree "off screen", find the changes', '<span class="c-g">Yes (concurrent render)</span>', 'No'],
        ['<b>Commit</b>', 'Apply all changes to the DOM in one go, attach refs, run layout effects', '<span class="c-r">No, always synchronous</span>', 'Yes'],
        ['<b>Passive effects</b>', '<code>useEffect</code> callbacks run after the browser has painted', 'Scheduled separately', 'Maybe (your code)']
      ])}
      <p><b>Two trees, one swap (double buffering).</b> React keeps the <b>current</b> tree (what is on screen) and builds a <b>work-in-progress</b> tree beside it. Every fiber points at its twin through <code>alternate</code>. When the work-in-progress tree is finished, React flips one pointer (<code>root.current = finishedWork</code>) and the new tree becomes "current". If React gets interrupted, it can simply throw the half-built tree away. The screen never shows a half-finished state.</p>
      <p>🔵 <b>Why the render phase must be pure.</b> Because React may start rendering a component, abandon it, and run it again (or run it twice on purpose in StrictMode), render must not have side effects: no fetching, no changing outside variables, no touching the DOM. Put side effects in event handlers or <code>useEffect</code>.</p>`,
    clues: [
      '"What is Fiber?" → say: a plain object per component plus a loop over child/sibling/return pointers that can pause between units',
      '"Why was React 16 rewritten / why was the old reconciler a problem?" → recursion on the call stack could not be interrupted, so long renders froze input',
      '"Why does StrictMode render components twice?" → render is meant to be pure and restartable, so React helps you find impure code',
      '"Can React pause in the middle of the DOM update?" → no: render phase is interruptible, commit phase is not',
      '"Why must hooks run in the same order every render?" → hook state is stored as a linked list on the fiber (memoizedState), matched by order',
      '"How does React know when to yield?" → Scheduler checks elapsed time (about 5 ms) and uses MessageChannel to resume in a new macrotask'
    ],
    code: [
      {
        lang: 'js', run: true, title: 'A mini Fiber work loop: begin, complete, and yield every N units',
        code: `// Each fiber is a plain object linked by child / sibling / return.
function fiber(name, ...kids) {
  const f = { name, child: null, sibling: null, return: null };
  kids.forEach((k, i) => {
    k.return = f;
    if (i === 0) f.child = k;
    else kids[i - 1].sibling = k;
  });
  return f;
}

const root = fiber('App',
  fiber('Header', fiber('Logo'), fiber('Nav')),
  fiber('Main', fiber('Feed')),
  fiber('Footer'));

const log = [];

// Do one unit of work. Returns the NEXT fiber to work on (or null when done).
function performUnitOfWork(f) {
  log.push('begin    ' + f.name);   // beginWork: "render" this component
  if (f.child) return f.child;      // go down
  let node = f;                     // nothing below: complete upward
  while (node) {
    log.push('complete ' + node.name);
    if (node.sibling) return node.sibling; // go sideways
    node = node.return;                    // go up
  }
  return null;                      // finished the whole tree
}

let nextUnit = root;

// The concurrent work loop: stop whenever the slice budget is used up.
function workLoop(unitsAllowed) {
  let used = 0;
  while (nextUnit !== null && used < unitsAllowed) {
    nextUnit = performUnitOfWork(nextUnit);
    used++;
  }
  return nextUnit !== null; // true = more work left, we yielded
}

let slice = 1;
while (workLoop(3)) {           // pretend "3 units" is our 5 ms budget
  log.push('--- yield: browser can handle clicks / paint (slice ' + slice + ' done) ---');
  slice++;
}
log.push('=== render finished, now COMMIT (synchronous) ===');
console.log(log.join('\\n'));`
      },
      {
        lang: 'js', run: true, title: 'Interruptible render: an urgent click throws the half-done work away',
        code: `// A low-priority render (8 units) is running in slices of 3 units.
// A click arrives. React yields, handles the click FIRST, then restarts the
// low-priority render from the root because its inputs changed.
const TOTAL = 8, SLICE = 3;
let progress = 0;          // units finished of the current low-priority render
let shown = 'v1';          // what is on screen
const urgentQueue = [];    // pretend the browser delivers events here

function runSlice(n) {
  // At every yield point React asks: is anything more urgent waiting?
  if (urgentQueue.length) {
    const what = urgentQueue.shift();
    console.log('slice ' + n + ': urgent "' + what + '" -> render + commit immediately');
    shown = 'v2';
    if (progress > 0) console.log('  threw away ' + progress + ' unit(s) of half-finished work, restarting');
    progress = 0;
    return true;
  }
  progress = Math.min(TOTAL, progress + SLICE);
  console.log('slice ' + n + ': low-priority work ' + progress + '/' + TOTAL);
  if (progress === TOTAL) {
    console.log('  commit low-priority result; screen shows ' + shown);
    return false;
  }
  return true;
}

let n = 1;
while (runSlice(n)) {
  if (n === 1) urgentQueue.push('click');  // a click arrives after the first slice
  n++;
}` }
    ],
    codeTitle: ['Plain-JS model: Fiber loop with child/sibling/return', 'Plain-JS model: urgent work interrupts a slow render'],
    viz: [
      {
        title: 'Time slicing: the work loop yields every N units',
        input: '12 4 7',
        inputLabel: 'totalUnits sliceSize clickAtUnit  (click 0 = none, max 24 units)',
        gen: function (input) {
          var hint = 'Format: totalUnits sliceSize clickAtUnit, for example  12 4 7  (use 0 for no click)';
          var nums = String(input).trim().split(/[\s,]+/).map(Number);
          if (nums.length < 2 || nums.some(isNaN)) throw new Error(hint);
          var N = nums[0], S = nums[1], C = nums.length > 2 ? nums[2] : 0;
          if (N < 2 || N > 24 || S < 1 || S > N || C < 0 || C > N) throw new Error('Need 2 ≤ totalUnits ≤ 24, 1 ≤ sliceSize ≤ totalUnits, 0 ≤ click ≤ totalUnits. ' + hint);
          var labels = [], i;
          for (i = 1; i <= N; i++) labels.push('u' + i);
          var frames = [], done = {}, inSlice = 0, slice = 1, queue = [], arrived = 0, waitedFiber = 0, handled = false;
          function arr(curIdx) {
            var hl = cp(done);
            if (curIdx !== undefined) hl[curIdx] = 'cur';
            return { type: 'array', label: 'fibers to process (one unit of work each)', values: labels, hl: hl };
          }
          frames.push({ narr: 'A big render is split into <b>' + N + ' units</b> (one fiber each). React will work for <b>' + S + ' units</b> per slice, then <b>yield</b> so the browser can paint and run events.' + (C ? ' A click will arrive at unit ' + C + '.' : ''), parts: [arr(), { type: 'queue', label: 'Browser main-thread queue', items: ['React slice 1'], frontLabel: 'runs next' }] });
          for (var u = 1; u <= N; u++) {
            inSlice++;
            if (C === u) { queue.push('click'); arrived = u; }
            var q = ['React slice ' + slice].concat(queue);
            var hlq = {}; hlq[0] = 'cur'; if (queue.length) hlq[1] = 'bad';
            var note = C === u ? ' <span class="c-r">A click arrives now, but the browser cannot run it until React gives the thread back.</span>' : (queue.length ? ' The click is still waiting.' : '');
            frames.push({ narr: 'Slice ' + slice + ', unit <b>' + u + '</b>: beginWork + completeWork on one fiber (about 1 ms).' + note, parts: [arr(u - 1), { type: 'queue', label: 'Browser main-thread queue', items: q, hl: hlq, frontLabel: 'runs now' }, { type: 'vars', vals: { 'units used this slice': inSlice + ' / ' + S, 'units done in total': u } }] });
            done[u - 1] = 'ok';
            if (inSlice === S && u < N) {
              var items = queue.length ? ['click handler', 'paint', 'React slice ' + (slice + 1)] : ['paint', 'React slice ' + (slice + 1)];
              var hl2 = {}; hl2[0] = queue.length ? 'ok' : 'win';
              if (queue.length) { handled = true; waitedFiber = u - arrived + 1; }
              frames.push({ narr: '<b>YIELD.</b> The slice budget is used up, so React stops and gives the main thread back. The browser runs ' + (queue.length ? '<span class="c-g">the click handler</span> (it waited only ' + waitedFiber + ' unit(s)), then ' : '') + 'paints, then React continues with slice ' + (slice + 1) + ' exactly where the bookmark was.', parts: [arr(), { type: 'queue', label: 'Browser main-thread queue', items: items, hl: hl2, frontLabel: 'runs next' }] });
              queue = []; slice++; inSlice = 0;
            }
          }
          var tail = 'All ' + N + ' units are done, so React COMMITS (one synchronous step) and the screen updates.';
          if (C && !handled) { waitedFiber = N - C + 1; tail += ' The click arrived in the last slice, so it had to wait until the end anyway.'; }
          var fin = [arr(), { type: 'text', html: tail }];
          if (C) {
            var oldWait = N - C + 1;
            fin.push({ type: 'bars', label: 'How long the click waited (in units)', values: [oldWait, waitedFiber], idxLabels: ['old stack reconciler', 'Fiber (time sliced)'], hl: { 0: 'bad', 1: 'ok' } });
          }
          frames.push({ narr: tail, parts: fin });
          return pad4(frames);
        }
      },
      {
        title: 'beginWork down, completeWork up (the child / sibling / return walk)',
        input: 'App,Header,Main,Logo,Nav,Feed,_',
        inputLabel: 'Component tree (level order, _ = none, max 15 slots, short names)',
        gen: function (input) {
          var hint = 'Example: App,Header,Main,Logo,Nav,Feed,_  (slot i has children at 2i+1 and 2i+2)';
          var T = parseTree(input, hint), frames = [], hl = {}, stack = [], log = [];
          function snap(narr, cur) {
            var tg = {}; if (cur !== undefined) tg[cur] = 'now';
            var hq = {}; hq[Math.max(0, log.length - 1)] = 'cur';
            frames.push({ narr: narr, parts: [
              { type: 'tree', label: 'Fiber tree', arr: T, hl: cp(hl), tags: tg },
              { type: 'stack', label: 'return path (parents still being worked on)', items: stack.slice() },
              { type: 'queue', label: 'Event log (latest on the right)', items: log.slice(-6), hl: (function () { var o = {}; o[Math.min(5, log.length - 1)] = 'cur'; return o; })(), frontLabel: 'older', backLabel: 'newest' }
            ] });
          }
          log.push('start');
          snap('We have a tree of components. React starts at the root and uses just three pointers per fiber: <b>child</b> (down), <b>sibling</b> (sideways) and <b>return</b> (up).');
          function visit(i) {
            if (!has(T, i)) return;
            hl[i] = 'cur'; stack.push(T[i]); log.push('begin ' + T[i]);
            var kids = [2 * i + 1, 2 * i + 2].filter(function (k) { return has(T, k); });
            snap('<b>beginWork(' + T[i] + ')</b>: run the component, diff its children. ' + (kids.length ? 'It has a child, so React goes <b>down</b> to ' + T[kids[0]] + '.' : 'No children: it is a leaf, so it can complete right away.'), i);
            kids.forEach(function (k, idx) {
              visit(k);
              if (idx < kids.length - 1) { /* sibling hop is shown by the next begin */ }
            });
            hl[i] = 'ok'; stack.pop(); log.push('complete ' + T[i]);
            var sib = null, p = i === 0 ? -1 : Math.floor((i - 1) / 2);
            if (p >= 0 && 2 * p + 1 === i && has(T, 2 * p + 2)) sib = 2 * p + 2;
            snap('<b>completeWork(' + T[i] + ')</b>: its subtree is done (DOM node prepared, flags bubbled up). ' + (sib !== null ? 'It has a <b>sibling</b>, ' + T[sib] + ', so React moves <b>sideways</b>.' : (p >= 0 ? 'No more siblings, so React goes <b>up</b> (via <code>return</code>) to ' + T[p] + '.' : 'That was the root: the whole render phase is finished.')), i);
          }
          visit(0);
          log.push('commit');
          snap('The whole work-in-progress tree is built. Now comes the <b>commit phase</b>: one synchronous pass that applies the DOM changes. It can never be paused.');
          return pad4(frames);
        }
      },
      {
        title: 'Double buffering: current tree vs work-in-progress tree',
        gen: function () {
          var cols = ['', 'current tree (on screen)', 'work-in-progress tree (off screen)', 'user sees'];
          return [
            { narr: 'Before any update, there is only the <b>current</b> tree. It is what the user sees.', parts: [{ type: 'table', label: 'Fibers', columns: cols, rows: [['App', 'count = 0', 'none yet', 'Count: 0'], ['Counter', 'props {n:0}', 'none yet', 'Count: 0']], hl: {} }] },
            { narr: 'You call <code>setCount(1)</code>. React creates a <b>work-in-progress</b> copy of each fiber it must visit (the <code>alternate</code>). The screen is untouched.', parts: [{ type: 'table', label: 'Fibers', columns: cols, rows: [['App', 'count = 0', 'count = 1 (building)', 'Count: 0'], ['Counter', 'props {n:0}', 'props {n:1} (building)', 'Count: 0']], hl: { 0: 'cur', 1: 'cur' } }] },
            { narr: 'If an urgent update arrives now, React can simply <b>drop</b> the work-in-progress tree. Nothing on screen was ever half-changed.', parts: [{ type: 'table', label: 'Fibers', columns: cols, rows: [['App', 'count = 0', '<span class="c-r">discarded</span>', 'Count: 0'], ['Counter', 'props {n:0}', '<span class="c-r">discarded</span>', 'Count: 0']], hl: { 0: 'bad', 1: 'bad' } }] },
            { narr: 'If it finishes, the <b>commit</b> applies the DOM changes and flips one pointer: <code>root.current = finishedWork</code>. The old current tree becomes the spare for the next update.', parts: [{ type: 'table', label: 'Fibers', columns: ['', 'old current (now spare)', 'new current tree', 'user sees'], rows: [['App', 'count = 0', 'count = 1', 'Count: 1'], ['Counter', 'props {n:0}', 'props {n:1}', 'Count: 1']], hl: { 0: 'ok', 1: 'ok' } }] }
          ];
        }
      }
    ],
    examples: [
      {
        title: 'A 5,000-row list render and a click',
        html: `<p>A search page renders 5,000 rows. With the old reconciler the main thread was busy for, say, 400 ms in one block: a click on "Cancel" felt dead for 0.4 s. With Fiber and time slicing the same work is cut into ~5 ms pieces. Between pieces the browser handles the click, so "Cancel" responds in about one slice (5 ms). The <b>total</b> work is the same or slightly more; what improved is <b>responsiveness</b>. Time slicing only happens for non-urgent (concurrent) updates, so you opt in with <code>useTransition</code> or <code>useDeferredValue</code> (next topics).</p>`
      },
      {
        title: 'StrictMode double render shows impure code',
        html: `<p>In development, StrictMode calls your component function twice per render and throws one result away. If your component does <code>items.push(x)</code> on a module-level array, you will see the item added twice. That is not a React bug: render must be a pure function of props and state, because Fiber is allowed to start, abandon, and restart render work any time. Fix: copy instead of mutating, and move side effects into handlers or <code>useEffect</code>.</p>`,
        code: { lang: 'jsx', check: false, code: `const seen = [];            // module-level, outside React

function Bad({ id }) {
  seen.push(id);            // BUG: side effect during render, runs twice in StrictMode
  return <li>{id}</li>;
}

function Good({ id }) {
  useEffect(() => {         // side effects belong here (runs after commit)
    analytics.track('row-shown', id);
  }, [id]);
  return <li>{id}</li>;
}` }
      },
      {
        title: 'Why the Rules of Hooks exist (linked list on the fiber)',
        html: `<p>Your <code>useState</code> and <code>useEffect</code> calls are not stored by name. React stores them as a <b>linked list on <code>fiber.memoizedState</code></b>: first hook call = first node, second call = second node, and so on. On the next render, the n-th hook call reads the n-th node. If you call a hook inside an <code>if</code>, the order shifts on some renders and the n-th call would read the wrong node. That is why hooks must be called at the top level, in the same order, every time.</p>`,
        code: { lang: 'jsx', check: false, code: `function Profile({ loggedIn }) {
  if (loggedIn) {
    const [name, setName] = useState('Ada');   // BUG: hook #1 only on some renders
  }
  const [count, setCount] = useState(0);        // sometimes hook #1, sometimes hook #2
  return <p>{count}</p>;
}` }
      },
      {
        title: 'Commit is synchronous: heavy layout effects still block',
        html: `<p>Only the <i>render</i> phase can be sliced. If you put 50 ms of work inside <code>useLayoutEffect</code> (which runs during commit), no amount of Fiber cleverness can help: the page is stuck until it finishes. Likewise, a giant DOM write (thousands of new nodes) in one commit is one long task. The cure is doing less in commit: render fewer nodes (virtualize), move work to <code>useEffect</code>, or move it to a Web Worker.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>The real loops.</b> React has two work loops: <code>workLoopSync</code> (<code>while (workInProgress !== null) performUnitOfWork(...)</code>) for urgent updates, and <code>workLoopConcurrent</code> (<code>while (workInProgress !== null &amp;&amp; !shouldYield())</code>) for non-urgent ones. Choosing between them is decided by the update's <b>lane</b> (next topics). So "concurrent rendering" is not a different renderer; it is the same Fiber loop that is allowed to stop.</p>
      <p><b>The Scheduler.</b> React ships a tiny package called <code>scheduler</code>. It tracks tasks in priority queues and runs them with <b>MessageChannel</b> (post a message to yourself = a fresh macrotask with no 4 ms clamp like nested <code>setTimeout</code>, and unlike <code>requestAnimationFrame</code> it still runs in background tabs). Its default slice is about <b>5 ms</b>. In Chrome it can also ask <code>navigator.scheduling.isInputPending()</code> to yield early when the user has pressed a key; the native <code>scheduler.postTask()</code> and <code>scheduler.yield()</code> APIs are the browser-built versions of the same idea.</p>
      <p><b>Effects and flags.</b> During completeWork, each fiber that needs DOM work gets <b>flags</b> (Placement, Update, Deletion, Ref, Passive, Snapshot...). Parents collect child flags into <code>subtreeFlags</code>, so the commit can skip entire subtrees whose <code>subtreeFlags</code> is zero. Commit then runs: (1) before-mutation (snapshots), (2) mutation (actual DOM writes), swap <code>root.current</code>, (3) layout (<code>useLayoutEffect</code>, ref attach, <code>componentDidMount</code>), and later (4) passive effects (<code>useEffect</code>). Because layout runs after the DOM changed but before paint, you can measure and fix layout without flicker.</p>
      <p><b>Interrupted work and reuse.</b> When a render is abandoned, React keeps the already-computed work-in-progress fibers only if nothing they depended on changed. Otherwise it restarts from the root (<code>prepareFreshStack</code>). A render that was <i>finished but not committed</i> because a higher lane preempted it is discarded: the work is wasted. This is the main cost of concurrent rendering and one reason to keep transitions cheap.</p>
      <p><b>Edge cases.</b> (1) Components that read mutable external data during render can show <b>tearing</b> (two parts of the UI showing different values from one render pass); <code>useSyncExternalStore</code> exists to prevent this. (2) Never mutate props/state/context during render. (3) A single enormous component (one fiber, 200 ms of its own work) cannot be sliced because the slice boundary is between fibers, not inside your function. Split the work into child components or move it off the main thread.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants are good at translating "my app janks while typing" into a diagnosis, but they usually reach for <code>useMemo</code> and <code>React.memo</code> first. With a mental model of Fiber you can steer them to the right tool: is the lag from <i>too much render work</i> (slice it with transitions, virtualize, split state) or from <i>one long non-React task</i> (move to a worker)?</p>
      <p><b>Use AI as a partner:</b> record a Chrome Performance trace, summarise the long tasks, and ask <code>Which of these long tasks are React render work and which are commit or my own code? Suggest the smallest change for each.</code> Ask it to write a tiny benchmark component that renders N rows so you can compare sync vs transition. Let it explain unfamiliar lines of the React source you are reading.</p>
      <p><b>Where AI goes wrong:</b> it confuses <i>render</i> with <i>commit</i>, claims "React runs in a separate thread" (it does not: everything is on the main thread, just sliced), or says "React.memo makes renders concurrent". It may also invent internals (field names, file paths) that sound right but do not exist, so verify against the React repository.</p>
      <p><b>What you must still own:</b> the model (fibers are objects, loop between units, render pausable, commit not), reading the Profiler, and knowing that time slicing improves responsiveness, not total throughput.</p>`,
    problems: [
      {
        title: 'Run Units in Time Slices',
        level: 'Medium', tags: ['fiber', 'time slicing', 'scheduler'], companies: ['Meta', 'Vercel'],
        statement: `<p>You are given an array <code>units</code> of functions (each is one unit of work that returns a value) and a number <code>perSlice</code>. Write <code>runInSlices(units, perSlice)</code> that executes the units <b>in order</b> but groups them into slices of at most <code>perSlice</code> units. It must return an array of slices, where each slice is an array of the results produced in that slice. Between two slices a real scheduler would yield to the browser, so also push the string <code>'yield'</code> between slices (but not after the last one).</p>`,
        constraints: `0 ≤ units.length ≤ 1000, 1 ≤ perSlice ≤ 1000. Units must run exactly once and in order.`,
        example: `<p>units return 1..5, perSlice = 2.</p>
          <p>Output: ${H.c('g', '[[1, 2], "yield", [3, 4], "yield", [5]]')}. Five units, slices of two, a yield between slices.</p>`,
        brute: { why: `<p>The naive loop runs every unit back-to-back and returns one big array. That is the old stack-reconciler behaviour: there is no point at which a click, a paint or a key press could be handled, so a long list of units freezes the page.</p>`,
          code: `function runAllAtOnce(units) {
  return [units.map((u) => u())]; // one huge uninterrupted block, never yields
}` },
        mcq: { q: 'Where is the correct place to check "should I yield?" in a Fiber-style loop?', options: ['Inside a unit, halfway through running it', 'Between units of work', 'Only after the whole tree is rendered'], answer: 1, explain: 'A unit (one fiber) cannot be split. React checks shouldYield() between units, which is where a bookmark can be saved safely.' },
        hints: [
          `<p>Hint 1: you need a counter that says how many units ran in the current slice. When it reaches <code>perSlice</code>, close the slice.</p>`,
          `<p>Hint 2: keep a <code>current</code> array for the slice being built and a <code>result</code> array for the final answer. Push <code>current</code> to <code>result</code> when full, and insert <code>'yield'</code> before starting a new one.</p>`,
          `<p>Hint 3: edge cases: no units returns an empty array; the last slice may be shorter; do not add a trailing <code>'yield'</code>. Recipe: loop i over units; run units[i]; push the value; if current.length === perSlice and i is not the last index, push current, push 'yield', start a new current. After the loop, push any non-empty current.</p>`
        ],
        solution: {
          approach: `<p>Walk through the units with an index. Run each one and collect its value into the current slice. When the slice is full and more units remain, close the slice, add a <code>'yield'</code> marker (this is where React would call <code>shouldYield()</code>, give the thread to the browser, and later resume from its bookmark, i.e. the loop index), and begin a new slice. After the loop, flush a partial last slice.</p>`,
          code: { lang: 'js', run: true, code: `function runInSlices(units, perSlice) {
  const result = [];
  let current = [];
  for (let i = 0; i < units.length; i++) {
    current.push(units[i]());                 // do ONE unit of work
    const sliceFull = current.length === perSlice;
    const moreLeft = i < units.length - 1;
    if (sliceFull && moreLeft) {
      result.push(current, 'yield');          // hand the thread back to the browser
      current = [];                           // the next slice starts at the bookmark (i + 1)
    }
  }
  if (current.length) result.push(current);   // last, possibly shorter, slice
  return result;
}

const units = [1, 2, 3, 4, 5].map((n) => () => n);
console.log(JSON.stringify(runInSlices(units, 2)));  // [[1,2],"yield",[3,4],"yield",[5]]
console.log(JSON.stringify(runInSlices([], 3)));     // []
console.log(JSON.stringify(runInSlices(units, 5)));  // [[1,2,3,4,5]]` },
          complexity: `<p>Time O(n) (each unit runs once), space O(n) for the result. In real React the "slice" is measured in milliseconds, not a fixed count, but the shape of the loop is identical.</p>`,
          followUps: ['Change it to measure time with performance.now() and yield after ~5 ms instead of a fixed count.', 'How would you let an urgent task cancel the remaining units and restart? (This is what a higher-priority lane does.)']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 3 — Batching
     ===================================================================== */
  topics.push({
    title: 'Batching: Many setState Calls, One Render',
    analogy: `<p>A waiter takes your table's order. You say "a soup", then "a salad", then "a juice". A bad waiter walks to the kitchen three times. A good waiter writes all three on one <b>order slip</b> and walks once when you are done talking. <b>Batching</b> is the good waiter: React collects every <code>setState</code> call made during one "moment" (one click, one network callback) on a slip, then does <b>one render</b> with all the changes. Also notice the slip is only read in the kitchen: the number you see on your table (<code>count</code> in your function) does not change until the next serving.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Calling <code>setCount(5)</code> does <b>not</b> change the variable <code>count</code> right now. It tells React "please render again with count = 5" and puts that request in a queue. React runs your component again later with the new value. If you call three setters in a row, React does not render three times. It waits until your code finishes, applies all three, and renders <b>once</b>. That is <b>batching</b>.</p>
      ${H.table(['Where the setState calls happen', 'React 17 (and legacy ReactDOM.render)', 'React 18+ with createRoot'], [
        ['Inside a React event handler (onClick...)', '<span class="c-g">1 render (batched)</span>', '<span class="c-g">1 render (batched)</span>'],
        ['Inside setTimeout / setInterval', '<span class="c-r">1 render per setState</span>', '<span class="c-g">1 render (batched)</span>'],
        ['Inside a Promise .then / async code after await', '<span class="c-r">1 render per setState</span>', '<span class="c-g">1 render (batched)</span>'],
        ['Inside a native addEventListener callback', '<span class="c-r">1 render per setState</span>', '<span class="c-g">1 render (batched)</span>']
      ])}
      <p>That is why React 18 calls it <b>automatic batching</b>: it now works everywhere, not only inside React's own event handlers. You get it for free by switching from <code>ReactDOM.render</code> to <code>createRoot</code>.</p>
      <p>🔵 <b>The snapshot rule (the part that trips everybody).</b> Inside one render, <code>count</code> is a <b>constant</b>, a photo taken when that render started. So in a handler:</p>
      ${H.table(['Code in the handler (count is 0)', 'Value you read right after', 'Count after the next render'], [
        ['<code>setCount(count + 1)</code> three times', '<code>count</code> is still <b>0</b> each time', '<span class="c-y">1</span> (0+1, 0+1, 0+1: the last one wins)'],
        ['<code>setCount(c =&gt; c + 1)</code> three times', '<code>count</code> is still <b>0</b>', '<span class="c-g">3</span> (each updater gets the latest value)'],
        ['<code>setCount(5)</code> then <code>setCount(c =&gt; c + 1)</code>', 'still <b>0</b>', '<span class="c-g">6</span> (queue: set 5, then add 1)'],
        ['<code>setCount(c =&gt; c + 1)</code> then <code>setCount(10)</code>', 'still <b>0</b>', '<span class="c-b">10</span> (the later value replaces it)']
      ])}
      <p>🔵 <b>The queue.</b> React keeps updates in order. Each one is either a <b>value</b> (replace the state) or an <b>updater function</b> (get the latest state, return the next one). At the next render React walks the queue from first to last and the final result is your new state. The second code sample below is a 10-line model of exactly that.</p>
      <p>🔵 <b>When batches split.</b> Updates are grouped by the moment (tick) they happen in. Two setters called together are batched. But if you call one, <code>await</code> something, then call another, they are in different ticks and cause two renders. That is normal and usually fine.</p>
      <p>🔵 <b>Opting out: <code>flushSync</code>.</b> Rarely you need the DOM updated <i>right now</i>, for example to scroll to the item you just added. Wrap that one update: <code>flushSync(() =&gt; setItems(next))</code>. It renders immediately and synchronously. Use it as a last resort because it gives up the batching benefit.</p>
      <p>🔵 <b>Same value, no render.</b> If you set state to the same value (checked with <code>Object.is</code>), React may skip rendering the children or bail out entirely. Setting a new object or array with the same content is a <i>different</i> value and does re-render, so never mutate state in place and then call the setter with the same reference (the render will be skipped and the UI will look stale).</p>`,
    clues: [
      '"Why does console.log(count) right after setCount(count + 1) show the old value?" → state is a snapshot per render; the update is queued',
      '"I call setCount(count+1) three times but it only goes up by one" → use the updater form setCount(c => c + 1)',
      '"How many times will this component render? (handler / setTimeout / fetch callback)" → 1 in React 18 with createRoot; N in React 17 outside handlers',
      '"What is automatic batching and what changed in React 18?" → batching now works in timeouts, promises and native events, not only React handlers',
      '"I need the DOM updated immediately after setState" → flushSync (and explain the cost)',
      '"UI does not update after I push onto my state array" → mutated state: same reference, React bails out; copy first'
    ],
    code: [
      {
        lang: 'js', run: true, title: 'A tiny model of batching: queue first, render once',
        code: `// store.setState() puts the update on a queue. In batched mode we flush
// ONCE in a microtask (end of the current tick). In unbatched mode (React 17
// outside handlers) every call renders immediately.
function makeStore(batched) {
  let state = { count: 0, flag: false };
  let queue = [];
  let renders = 0;
  let scheduled = false;

  function flush() {
    scheduled = false;
    // apply queued updates in order: object = merge, function = updater
    for (const u of queue) {
      const patch = typeof u === 'function' ? u(state) : u;
      state = { ...state, ...patch };
    }
    queue = [];
    renders++;               // ONE render for everything that was queued
  }

  return {
    setState(update) {
      queue.push(update);
      if (!batched) flush();                                  // render every time
      else if (!scheduled) { scheduled = true; queueMicrotask(flush); }
    },
    snapshot: () => ({ renders, count: state.count })
  };
}

async function demo(label, batched) {
  const store = makeStore(batched);
  store.setState({ count: 1 });
  store.setState({ flag: true });
  store.setState((s) => ({ count: s.count + 1 }));
  console.log(label, 'right after 3 calls ->', JSON.stringify(store.snapshot()));
  await Promise.resolve();             // let the end-of-tick flush run
  console.log(label, 'after the flush     ->', JSON.stringify(store.snapshot()));
}

demo('batched  ', true).then(() => demo('unbatched', false));`
      },
      {
        lang: 'js', run: true, title: 'The update queue: values vs updater functions',
        code: `// React walks the queue in order. A VALUE replaces the state.
// An UPDATER FUNCTION receives the latest state and returns the next one.
function processQueue(initial, updates) {
  let state = initial;
  for (const u of updates) {
    state = typeof u === 'function' ? u(state) : u;
  }
  return state;
}

const count = 0; // the snapshot value your handler sees during this render

console.log('setCount(count + 1) x3    =>', processQueue(0, [count + 1, count + 1, count + 1])); // 1
console.log('setCount(c => c + 1) x3   =>', processQueue(0, [(c) => c + 1, (c) => c + 1, (c) => c + 1])); // 3
console.log('set 5, then c => c + 1    =>', processQueue(0, [5, (c) => c + 1]));                 // 6
console.log('c => c + 1, then set 10   =>', processQueue(0, [(c) => c + 1, 10]));                 // 10
console.log('+1 (snapshot), set 10, x2  =>', processQueue(0, [count + 1, 10, (c) => c * 2]));    // 20`
      }
    ],
    codeTitle: ['Plain-JS model: batching and render count', 'Plain-JS model: update queue semantics'],
    viz: [
      {
        title: 'Automatic batching: how many renders?',
        input: '18 timeout',
        inputLabel: 'React version (17 or 18) and where the calls happen (handler, timeout, promise)',
        gen: function (input) {
          var hint = 'Format: version context, for example  18 timeout  or  17 promise  (version = 17|18, context = handler|timeout|promise)';
          var w = String(input).trim().toLowerCase().split(/[\s,]+/);
          if (w.length !== 2 || ['17', '18'].indexOf(w[0]) < 0 || ['handler', 'timeout', 'promise'].indexOf(w[1]) < 0) throw new Error(hint);
          var ver = w[0], ctx = w[1];
          var batched = ver === '18' || ctx === 'handler';
          var head = { handler: 'function onClick() {', timeout: 'setTimeout(() => {', promise: 'fetch(url).then(() => {' }[ctx];
          var tail = ctx === 'handler' ? '}' : '});';
          var calls = ['setCount(c => c + 1);', 'setName("Ada");', 'setFlag(true);'];
          var code = head + '\n  ' + calls.join('\n  ') + '\n' + tail;
          var frames = [], renders = 0, pending = [];
          var why = batched
            ? (ver === '18' ? 'React 18 with <code>createRoot</code> batches <b>everywhere</b>.' : 'React 17 batches inside <b>React event handlers</b>.')
            : 'React 17 does <b>not</b> batch outside React event handlers.';
          function vars() { return { 'React version': ver, 'where': ctx, 'renders so far': renders }; }
          frames.push({ narr: 'We run the same 3 setState calls in React <b>' + ver + '</b> inside a <b>' + ctx + '</b>. ' + why, parts: [{ type: 'code', label: 'your code', lang: 'js', code: code, hl: { 1: 'cur' } }, { type: 'vars', vals: vars() }] });
          calls.forEach(function (c, i) {
            var name = ['setCount(c => c + 1)', 'setName("Ada")', 'setFlag(true)'][i];
            if (batched) {
              pending.push(name);
              frames.push({ narr: '<b>' + name + '</b> runs. React does <b>not</b> render. It just writes it on the order slip (the update queue). The screen still shows the old values.', parts: [
                { type: 'code', label: 'your code', lang: 'js', code: code, hl: (function () { var o = {}; o[i + 2] = 'cur'; return o; })() },
                { type: 'queue', label: 'pending update queue', items: pending.slice(), hl: (function () { var o = {}; o[pending.length - 1] = 'ok'; return o; })(), frontLabel: 'applied first' },
                { type: 'vars', vals: vars() }
              ] });
            } else {
              renders++;
              frames.push({ narr: '<b>' + name + '</b> runs and React 17 renders <span class="c-r">immediately</span> (render #' + renders + '). The component function runs again and the DOM may be updated, before the next line even executes.', parts: [
                { type: 'code', label: 'your code', lang: 'js', code: code, hl: (function () { var o = {}; o[i + 2] = 'bad'; return o; })() },
                { type: 'vars', vals: vars(), hl: { 'renders so far': 'bad' } }
              ] });
            }
          });
          if (batched) {
            renders = 1;
            frames.push({ narr: 'The ' + ctx + ' code has finished. <b>Now</b> React flushes the queue: apply all 3 updates in order and render <span class="c-g">once</span>.', parts: [
              { type: 'code', label: 'your code', lang: 'js', code: code, hl: { 5: 'ok' } },
              { type: 'queue', label: 'queue being applied', items: pending.slice(), hl: { 0: 'ok', 1: 'ok', 2: 'ok' }, frontLabel: 'applied first' },
              { type: 'vars', vals: vars(), hl: { 'renders so far': 'ok' } }
            ] });
          }
          frames.push({ narr: 'Result: <b>' + renders + ' render' + (renders === 1 ? '' : 's') + '</b> for 3 state changes. ' + (batched ? 'Fewer renders = less JavaScript work and no flicker of half-updated UI (for example, count changed but name not yet).' : 'This is the React 17 outside-handler behaviour that automatic batching in React 18 fixed. Switching to createRoot gives you the batched version.'), parts: [
            { type: 'bars', label: 'renders caused by 3 setState calls', values: [3, renders], idxLabels: ['unbatched', 'this run'], hl: { 0: 'bad', 1: batched ? 'ok' : 'bad' } }
          ] });
          return frames;
        }
      },
      {
        title: 'The update queue, step by step (values vs updater functions)',
        input: '0 snap+1 snap+1 snap+1',
        inputLabel: 'start value, then updates: snap+N (setCount(count+N)), +N (c=>c+N), *N (c=>c*N), =N (setCount(N))',
        gen: function (input) {
          var hint = 'Example: 0 snap+1 snap+1 +1 *2   (first number = start; then snap+N, +N, *N, =N)';
          var tk = String(input).trim().split(/\s+/);
          var start = Number(tk[0]);
          if (!tk.length || isNaN(start)) throw new Error(hint);
          var ups = tk.slice(1);
          if (!ups.length) throw new Error(hint);
          if (ups.length > 8) throw new Error('Use at most 8 updates. ' + hint);
          var queue = [], fn = [];
          ups.forEach(function (t) {
            var m;
            if ((m = /^snap\+(-?\d+)$/.exec(t))) { var v = start + Number(m[1]); queue.push('set ' + v); fn.push(function () { return v; }); }
            else if ((m = /^\+(-?\d+)$/.exec(t))) { var a = Number(m[1]); queue.push('c => c + ' + a); fn.push(function (c) { return c + a; }); }
            else if ((m = /^\*(-?\d+)$/.exec(t))) { var b = Number(m[1]); queue.push('c => c * ' + b); fn.push(function (c) { return c * b; }); }
            else if ((m = /^=(-?\d+)$/.exec(t))) { var d = Number(m[1]); queue.push('set ' + d); fn.push(function () { return d; }); }
            else throw new Error('Cannot read "' + t + '". ' + hint);
          });
          var frames = [], s = start;
          frames.push({ narr: 'During this render <code>count</code> is the constant <b>' + start + '</b>. Your handler calls the setter ' + queue.length + ' times; React just queues them. (<code>snap+N</code> means you wrote <code>setCount(count + N)</code>, so the value was calculated from the snapshot.)', parts: [
            { type: 'queue', label: 'queued updates', items: queue.slice(), frontLabel: 'applied first' },
            { type: 'vars', vals: { 'count (snapshot)': start, 'state being computed': s } }
          ] });
          fn.forEach(function (f, i) {
            var before = s; s = f(s);
            var hl = {}; hl[i] = 'cur';
            frames.push({ narr: 'Apply update ' + (i + 1) + ' <b>' + queue[i] + '</b>: ' + (/^set/.test(queue[i]) ? 'a plain value just <b>replaces</b> the state (' + before + ' becomes ' + s + ').' : 'the updater receives the <b>latest</b> state ' + before + ' and returns <b>' + s + '</b>.'), parts: [
              { type: 'queue', label: 'queued updates', items: queue.slice(), hl: hl, frontLabel: 'applied first' },
              { type: 'vars', vals: { 'count (snapshot)': start, 'state being computed': s }, hl: { 'state being computed': 'ok' } }
            ] });
          });
          frames.push({ narr: 'Queue empty. React renders <b>once</b> with <code>count = ' + s + '</code>. ' + (s === start + 1 && ups.length > 1 ? 'Notice the surprise: several snapshot-based updates collapse into a single +1.' : 'Remember: only after this render does your code see the new number.'), parts: [
            { type: 'vars', vals: { 'new count': s, 'renders': 1 }, hl: { 'new count': 'sel' } }
          ] });
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'Predict the console output (React 18)',
        html: `<p>The count is <code>0</code> when the button is clicked. What is printed, and what does the screen show after the click?</p>
          <p>1. <code>console.log(count)</code> right after <code>setCount(count + 1)</code> prints <b>0</b> (snapshot).<br>
          2. The updater call adds one more to the queue, so the queue is <i>set 1</i>, then <i>c =&gt; c + 1</i>, final state <b>2</b>.<br>
          3. The <code>setTimeout</code> callback closes over the <b>old render's</b> <code>count</code>, so it still prints <b>0</b>, not 2.<br>
          4. Only <b>one</b> render happens for the two setter calls. The <code>console.log("render", count)</code> in the body prints once with 2.</p>`,
        code: { lang: 'jsx', check: false, code: `function Counter() {
  const [count, setCount] = useState(0);
  console.log('render', count);

  function handleClick() {
    setCount(count + 1);           // queue: set 1
    console.log('A', count);       // 0  (snapshot)
    setCount((c) => c + 1);        // queue: c => c + 1  -> final 2
    setTimeout(() => console.log('B', count), 0); // 0  (closure over old render)
  }
  return <button onClick={handleClick}>{count}</button>;
}
// Output after one click: A 0 / render 2 / B 0` }
      },
      {
        title: 'React 17 vs 18 with fetch',
        html: `<p>A common pattern: after <code>fetch</code> returns, you call <code>setData(json)</code>, <code>setLoading(false)</code> and <code>setError(null)</code>. In React 17 each call re-rendered synchronously, so for a moment the UI could show <i>loading = true with data already filled in</i> or the reverse (a "tearing" flicker). In React 18 all three are applied together before anything is drawn, so the intermediate states never appear. The code is identical; only <code>createRoot</code> changed.</p>`,
        code: { lang: 'jsx', check: false, code: `useEffect(() => {
  fetch('/api/user')
    .then((r) => r.json())
    .then((json) => {
      setData(json);       // React 17: render #1 (half-updated UI!)
      setLoading(false);   // React 17: render #2
      setError(null);      // React 17: render #3
      // React 18 + createRoot: ONE render after this callback finishes
    });
}, []);` }
      },
      {
        title: 'flushSync: when you really need the DOM now',
        html: `<p>You add a message to a chat and want to scroll the list to the bottom. If you call <code>setMessages(...)</code> and then <code>list.scrollTop = list.scrollHeight</code> straight away, the new message is not in the DOM yet (the update is only queued), so you scroll to the old bottom. <code>flushSync</code> forces React to render and commit synchronously, so the next line sees the new DOM. A better habit is usually to scroll inside <code>useLayoutEffect</code> or with a <code>ref</code> callback, which run after the commit without opting out of batching.</p>`,
        code: { lang: 'jsx', check: false, code: `import { flushSync } from 'react-dom';

function send(text) {
  flushSync(() => {
    setMessages((m) => [...m, { id: crypto.randomUUID(), text }]);
  });
  // DOM is updated here, so this scrolls to the NEW bottom
  listRef.current.scrollTop = listRef.current.scrollHeight;
}` }
      },
      {
        title: 'Mutating state hides the update',
        html: `<p>Writing <code>items.push(x); setItems(items)</code> passes the <b>same array reference</b>. React compares with <code>Object.is</code>, sees "same", and bails out: nothing re-renders even though the array has a new item. Always create a new array or object: <code>setItems([...items, x])</code>. Together with the snapshot rule this is the root of most "my UI is one step behind" bugs.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>How batching is really implemented.</b> There is no special "batch" API you call. Every <code>setState</code> creates an <b>update object</b>, attaches it to the fiber's hook queue (a circular linked list), tags it with a <b>lane</b> (priority) and calls <code>scheduleUpdateOnFiber</code>. That marks the fiber and its ancestors as having pending work in that lane and asks React to <code>ensureRootIsScheduled</code>. If a render task for that lane is already scheduled for the root, nothing else happens: that single scheduled task is the batch. When it runs, it processes <i>all</i> updates in the lanes it is rendering.</p>
      <p><b>React 17's limit.</b> Batching was tied to a global flag (<code>executionContext</code>) that React set while running its own event handlers. Outside those, <code>setState</code> flushed synchronously at the end of the call. React 18 replaced "are we inside a handler?" with "which lane does this update belong to?" and flushes sync-lane work in a <b>microtask</b> (so everything queued in the same tick is included) and other lanes in a scheduler task.</p>
      <p><b>Which lane?</b> Updates inside discrete events (click, keydown) get <code>SyncLane</code>; continuous events (mousemove, scroll) get <code>InputContinuousLane</code>; updates from timers/promises/effects get <code>DefaultLane</code>; updates inside <code>startTransition</code> get a <code>TransitionLane</code>. Updates in different lanes are <b>not</b> forced into one render: the urgent lane renders first.</p>
      <p><b>Rules and traps.</b> (1) Updater functions must be pure and may run twice in StrictMode (like all render code). (2) In class components, <code>this.setState(obj)</code> merges; with hooks the setter <b>replaces</b>, so object state needs spread. (3) Passing a function to <code>useState(initial)</code> is "lazy initial state" (called once), while passing a function to the <i>setter</i> means "updater". Do not confuse them when state is a function. (4) <code>useReducer</code> avoids many stale-snapshot issues because the reducer always gets the latest state; (5) in React 19 <b>Actions</b> (async functions passed to <code>startTransition</code> or <code>useActionState</code>) batch the state updates made inside them and keep <code>isPending</code> true across <code>await</code>s, but plain <code>setState</code> calls after an <code>await</code> inside a transition callback must be wrapped in another <code>startTransition</code> to stay in the transition lane.</p>
      <p><b>Production reality.</b> Batching is invisible when it works. The pain shows up in tests: assertions made right after <code>fireEvent</code> must be wrapped in <code>act()</code> (React Testing Library does this for you) so the queued render is flushed before you look at the DOM.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-generated components love chains like <code>setA(x); setB(y); setC(z);</code> and, when asked to "fix the stale value", often wrap everything in <code>useEffect</code> that sets more state, creating extra renders and loops. Knowing the snapshot-plus-queue model lets you spot that the real fix is usually the updater form or <code>useReducer</code>, not another effect.</p>
      <p><b>Use AI as a partner:</b> paste a handler and ask <code>Simulate this handler in React 18 step by step: show the queue, the number of renders, and every console.log value</code>, then check its answer against the model you learned here. Ask it to rewrite a messy bundle of related <code>useState</code> calls into one <code>useReducer</code> with a typed action union.</p>
      <p><b>Where AI goes wrong:</b> it says "setState is async" (it is not async in the promise sense; it is <i>deferred</i>), claims React 18 batches updates "across awaits" (it does not), or tells you to use <code>flushSync</code> as a general fix for stale reads. It may also forget that <code>setTimeout(() =&gt; log(count))</code> closes over the old snapshot.</p>
      <p><b>What you must still own:</b> predicting render counts and printed values by hand, choosing between value and updater form, and spotting mutation bugs in review.</p>`,
    problems: [
      {
        title: 'Simulate Batched vs Unbatched Updates',
        level: 'Easy', tags: ['batching', 'setState', 'update queue'], companies: ['Meta', 'Flipkart'],
        statement: `<p>Write <code>simulate(version, context, updates)</code>. <code>version</code> is <code>17</code> or <code>18</code>. <code>context</code> is <code>'handler'</code>, <code>'timeout'</code> or <code>'promise'</code>. <code>updates</code> is an array where each item is either a number (like <code>setCount(5)</code>) or a function (like <code>c =&gt; c + 1</code>); all start from state <code>0</code>. Return <code>{ renders, state }</code> where <code>state</code> is the final value after all updates in order, and <code>renders</code> is how many renders React performs. Batching rule: React 18 always batches; React 17 only batches in <code>'handler'</code>. A batched run with at least one update renders once; an unbatched run renders once per update; no updates means zero renders.</p>`,
        constraints: `0 ≤ updates.length ≤ 100. Updater functions are pure. Numbers are integers.`,
        example: `<p>simulate(18, 'timeout', [1, c =&gt; c + 1, c =&gt; c * 3]) gives ${H.c('g', '{ renders: 1, state: 6 }')}: set 1, then 1+1 = 2, then 2*3 = 6, one batched render.</p>
          <p>simulate(17, 'timeout', same updates) gives ${H.c('r', '{ renders: 3, state: 6 }')}: the same final state but three renders.</p>`,
        brute: { why: `<p>A first attempt often renders after every update regardless of version and context. The final state is right, but the render count is wrong for every batched case, which is exactly the thing the question tests.</p>`,
          code: `function simulateBrute(version, context, updates) {
  let state = 0;
  for (const u of updates) state = typeof u === 'function' ? u(state) : u;
  return { renders: updates.length, state }; // wrong: ignores batching
}` },
        mcq: { q: 'In React 18 with createRoot, a fetch callback calls setA, setB, setC. How many renders?', options: ['3', '1', '0'], answer: 1, explain: 'Automatic batching groups updates from the same tick, including promise callbacks, into a single render.' },
        hints: [
          `<p>Hint 1: the final <i>state</i> never depends on batching. Only the render count does.</p>`,
          `<p>Hint 2: decide a boolean <code>batched</code> first: it is true when version is 18, or when context is 'handler'.</p>`,
          `<p>Hint 3: edge case: empty updates means 0 renders in both modes. Recipe: fold the updates into state; renders = updates.length === 0 ? 0 : (batched ? 1 : updates.length).</p>`
        ],
        solution: {
          approach: `<p>Fold the updates exactly like React's queue: a function receives the previous state, a number replaces it. Then compute the render count from the batching rule. Version 18 batches everywhere; version 17 batches only inside React event handlers.</p>`,
          code: { lang: 'js', run: true, code: `function simulate(version, context, updates) {
  let state = 0;
  for (const u of updates) {
    state = typeof u === 'function' ? u(state) : u;   // value replaces, updater transforms
  }
  const batched = version === 18 || context === 'handler';
  let renders = 0;
  if (updates.length > 0) renders = batched ? 1 : updates.length;
  return { renders, state };
}

const ups = [1, (c) => c + 1, (c) => c * 3];
console.log(JSON.stringify(simulate(18, 'timeout', ups)));  // renders 1, state 6
console.log(JSON.stringify(simulate(17, 'timeout', ups)));  // renders 3, state 6
console.log(JSON.stringify(simulate(17, 'handler', ups)));  // renders 1, state 6
console.log(JSON.stringify(simulate(18, 'promise', [])));   // renders 0, state 0` },
          complexity: `<p>Time O(n) for n updates, space O(1).</p>`,
          followUps: ['Add a "flushSync" marker update that forces an immediate render and splits the batch.', 'What changes if two updates are separated by an await (two ticks)?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 4 — Concurrent rendering, transitions, Suspense
     ===================================================================== */
  topics.push({
    title: 'Concurrent Rendering, Transitions & Suspense',
    analogy: `<p>A coffee shop has two kinds of orders. A <b>quick espresso</b> (urgent: someone is standing at the counter) and a <b>three-tier wedding cake</b> (important but can wait). A smart barista starts the cake, but the moment a customer asks for an espresso she <b>puts the cake aside</b>, makes the coffee, and only then goes back. If the cake order changes mid-way ("make it chocolate instead"), she throws away the half-finished sponge and starts the new one. The espresso is the <b>urgent update</b> (typing, clicking). The cake is a <b>transition</b> (re-filtering a big list, switching a tab). And when the cake ingredients have not arrived yet, she puts a <b>"back in 5 minutes" sign</b> on that table and keeps serving everyone else: that sign is <b>Suspense</b>.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Normal rendering is all-or-nothing: once React starts, it finishes. <b>Concurrent rendering</b> means React is allowed to <b>start rendering, pause, drop that work, or resume later</b>, so important things (like the letter you just typed) are never stuck behind unimportant things (like re-drawing 10,000 search results). It is not a mode you switch on for the whole app; it is a capability that features such as <code>useTransition</code>, <code>useDeferredValue</code> and <code>Suspense</code> use. You get the ability by rendering with <code>createRoot</code>.</p>
      <p>🔵 <b>Every update has a priority (a "lane").</b> React labels each update with how urgent it is and always works on the most urgent lane first:</p>
      ${H.table(['Lane (priority)', 'Typical source', 'Can be interrupted?', 'Feels like'], [
        ['<b>SyncLane</b> (highest)', 'click, keydown, input: discrete user events', '<span class="c-r">No: renders to completion</span>', 'instant'],
        ['<b>InputContinuousLane</b>', 'mousemove, scroll, drag', 'Barely', 'smooth tracking'],
        ['<b>DefaultLane</b>', 'setState in timers, promises, effects', 'Yes (time-sliced)', 'normal'],
        ['<b>TransitionLanes</b>', 'anything inside <code>startTransition</code>', '<span class="c-g">Yes, and may be restarted</span>', 'can lag a bit, never blocks'],
        ['<b>IdleLane</b> (lowest)', 'offscreen / hidden work', 'Yes', 'when nothing else to do']
      ])}
      <p>🔵 <b><code>useTransition</code>: mark an update as "not urgent".</b> You split one user action into two updates: the <b>urgent</b> one (show what the user typed) and the <b>transition</b> (do the expensive result update). If the user types again before the expensive render finishes, React <b>abandons</b> the stale render and starts over with the newest value. The input never freezes.</p>
      ${H.table(['', 'Without transition', 'With transition'], [
        ['Key press', 'input and big list update in ONE urgent render', 'input updates urgently; list update is a low-priority transition'],
        ['Typing fast', 'each key waits for the previous list render: input feels laggy', 'input stays instant; older list renders are thrown away'],
        ['While waiting', 'nothing to show', '<code>isPending</code> is true: show a dim effect or spinner']
      ])}
      <p>🔵 <b><code>useDeferredValue</code></b> is the same idea when you do not own the setter (the value comes from a prop). <code>const deferredQuery = useDeferredValue(query)</code> gives you a copy that "lags behind": React first renders with the old value (fast), then silently re-renders in the background with the new value.</p>
      <p>🔵 <b>Suspense: "this part is not ready yet".</b> Wrap a part of the tree in <code>&lt;Suspense fallback={...}&gt;</code>. If a component inside needs something that is not ready (data via <code>use(promise)</code> or a Suspense-enabled library like React Query or Relay, code from <code>React.lazy</code>), React stops rendering that component, shows the <b>fallback</b> for that boundary only, and renders the rest of the page normally. When the thing is ready React tries again automatically. Underneath, the component literally <b>throws a Promise</b>; React catches it like an exception, waits for it, then re-renders (the second code sample models this).</p>
      <p>🔵 <b>Suspense + transitions are friends.</b> If a click would make already-visible content suspend, React normally swaps it for the fallback (a spinner flash). If the click's state update is inside a transition, React instead <b>keeps showing the old screen</b> until the new one is ready, and gives you <code>isPending</code>. That is the smooth tab-switching experience.</p>
      <p><b>Limits to remember.</b> Transitions help with <i>rendering</i> work, not with slow networks or a slow single component. A controlled text input value must stay <b>urgent</b> (never put the typed value itself in a transition). Transition updates cannot control text input state.</p>`,
    clues: [
      '"Typing in a search box with a big list is laggy" → split urgent input from the heavy result update: useTransition or useDeferredValue',
      '"Keep the UI responsive during an expensive render" → concurrent features (transition), then virtualization / memoization',
      '"Show a spinner only for part of the page / stream the page in pieces" → Suspense boundaries (and streaming SSR)',
      '"Switching tabs flashes a loading spinner" → wrap the state update in startTransition so old content stays until the new is ready',
      '"What is the difference between useTransition and useDeferredValue?" → one wraps the setter you own, the other defers a value you receive',
      '"Debounce vs transition?" → debounce delays the work; a transition does the work but lets urgent updates cut in and drops stale renders'
    ],
    code: [
      {
        lang: 'js', run: true, title: 'A lane scheduler: urgent work interrupts a transition and restarts it',
        code: `// Priorities: lower number = more urgent.
const PRIORITY = { sync: 0, default: 1, transition: 2 };
const SLICE = 5; // ms of work per time slice

// What happens: a slow transition render (cost 20ms) starts at t=0.
// At t=10 the user types, which creates an urgent sync update (cost 3ms).
const incoming = [
  { name: 'list for "re" (transition)', lane: 'transition', cost: 20, at: 0 },
  { name: 'input "rea" (sync)', lane: 'sync', cost: 3, at: 10 },
  { name: 'list for "rea" (transition)', lane: 'transition', cost: 20, at: 10 }
];

const pending = [];
let t = 0, last = null;
const log = (msg) => console.log('t=' + String(t).padStart(3) + 'ms  ' + msg);

while (t < 200 && (pending.length || incoming.some((u) => !u.arrived))) {
  incoming.filter((u) => !u.arrived && u.at <= t).forEach((u) => {
    u.arrived = true;
    if (u.lane === 'transition') {
      // a newer transition makes older, still-pending transitions pointless
      for (let i = pending.length - 1; i >= 0; i--) {
        if (pending[i].lane === 'transition') {
          log('SUPERSEDED: dropped "' + pending[i].name + '"');
          if (last === pending[i]) last = null;
          pending.splice(i, 1);
        }
      }
    }
    pending.push({ ...u, left: u.cost });
  });
  if (!pending.length) { t += SLICE; continue; }

  // Most urgent lane first; ties go to the oldest update.
  pending.sort((a, b) => PRIORITY[a.lane] - PRIORITY[b.lane] || a.at - b.at);
  const job = pending[0];

  // A half-done transition that got pre-empted loses its progress (restart).
  if (last && last !== job && last.lane === 'transition' && last.left > 0 && last.left < last.cost) {
    log('INTERRUPTED: threw away ' + (last.cost - last.left) + 'ms of "' + last.name + '"');
    last.left = last.cost;
  }
  last = job;

  // Sync lane runs to completion; other lanes work one slice at a time.
  const work = job.lane === 'sync' ? job.left : Math.min(SLICE, job.left);
  job.left -= work;
  t += work;
  if (job.left === 0) {
    log('COMMIT "' + job.name + '"');
    pending.splice(pending.indexOf(job), 1);
  } else {
    log('worked ' + work + 'ms on "' + job.name + '" (' + job.left + 'ms left)');
  }
}`
      },
      {
        lang: 'js', run: true, title: 'Suspense in miniature: throw a promise, show the fallback, retry',
        code: `// The Suspense contract: if data is not ready, THROW the promise.
function createResource(loader) {
  let status = 'pending', value, promise = loader().then((v) => { status = 'done'; value = v; });
  return {
    read() {
      if (status === 'pending') throw promise; // "not ready: wake me up when this settles"
      return value;
    }
  };
}

const user = createResource(() => new Promise((res) => setTimeout(() => res('Ada'), 30)));

function Profile() {
  return 'Profile of ' + user.read(); // may throw a promise
}

// A mini <Suspense>: catch thrown promises, show fallback, re-render when settled.
function suspense(Component, fallback, onRender) {
  function attempt() {
    try {
      onRender(Component());
    } catch (thrown) {
      if (thrown && typeof thrown.then === 'function') {
        onRender(fallback);                 // show the fallback for THIS boundary
        thrown.then(attempt);               // retry once the data has arrived
      } else throw thrown;                  // real errors go to an error boundary
    }
  }
  attempt();
}

suspense(Profile, '<Spinner/>', (out) => console.log('screen shows:', out));
console.log('(the rest of the page keeps working while we wait)');` },
      {
        lang: 'jsx', check: false, title: 'useTransition and useDeferredValue in real React',
        code: `import { useState, useTransition, useDeferredValue, Suspense, use } from 'react';

// 1) useTransition: you own the state setter
function Search({ items }) {
  const [text, setText] = useState('');          // urgent: what the box shows
  const [query, setQuery] = useState('');        // non-urgent: what the list uses
  const [isPending, startTransition] = useTransition();

  function onChange(e) {
    setText(e.target.value);                     // urgent lane: input never lags
    startTransition(() => {
      setQuery(e.target.value);                  // transition lane: may be interrupted
    });
  }

  return (
    <>
      <input value={text} onChange={onChange} />
      {isPending && <span>updating...</span>}
      <ResultList items={items} query={query} />
    </>
  );
}

// 2) useDeferredValue: the value comes from outside
function Results({ query }) {
  const deferred = useDeferredValue(query);      // lags behind query
  const stale = deferred !== query;              // true while catching up
  return <div style={{ opacity: stale ? 0.6 : 1 }}><ResultList query={deferred} /></div>;
}

// 3) Suspense + use(): show a fallback only around the slow part
function Page({ userPromise }) {
  return (
    <Suspense fallback={<p>Loading profile...</p>}>
      <Profile userPromise={userPromise} />
    </Suspense>
  );
}
function Profile({ userPromise }) {
  const user = use(userPromise);                 // suspends until the promise resolves
  return <h1>{user.name}</h1>;
}` }
    ],
    codeTitle: ['Plain-JS model: lanes, interruption, restart', 'Plain-JS model: throw a promise, show fallback', 'React: useTransition, useDeferredValue, Suspense'],
    viz: [
      {
        title: 'Render lanes: urgent input vs transition list',
        input: 'react transition',
        inputLabel: 'word to type (letters, max 8) and mode: transition or sync',
        gen: function (input) {
          var hint = 'Format: word mode, for example  react transition  or  react sync  (word = 2-8 characters)';
          var w = String(input).trim().split(/\s+/);
          if (w.length !== 2 || w[0].length < 2 || w[0].length > 8 || ['transition', 'sync'].indexOf(w[1].toLowerCase()) < 0) throw new Error(hint);
          var word = w[0], mode = w[1].toLowerCase(), GAP = 60, LIST = 120, INPUT = 3;
          var cols = ['time (ms)', 'key', 'urgent lane: the input box', 'transition lane: the results list', 'how it feels'];
          var frames = [], rows = [], lat = [], freeAt = 0, k;
          frames.push({ narr: 'You type <b>"' + word + '"</b>, one key every ' + GAP + ' ms. Re-drawing the results list costs about ' + LIST + ' ms, which is <b>more than the gap between keys</b>. Mode: <b>' + mode + '</b>.', parts: [{ type: 'table', label: 'Render lanes over time', columns: cols, rows: [['-', '-', '-', '-', '-']], hl: {} }] });
          for (k = 0; k < word.length; k++) {
            var at = GAP * k, pre = word.slice(0, k + 1), key = word[k];
            if (mode === 'transition') {
              if (k > 0) rows[k - 1][3] = '<span class="c-r">render for "' + word.slice(0, k) + '" interrupted, thrown away</span>';
              var last = k === word.length - 1;
              lat.push(INPUT + 5);
              rows.push([at, key, '<span class="c-g">"' + pre + '" on screen in about ' + (INPUT + 5) + ' ms</span>', last ? 'render for "' + pre + '" runs, finishes at t=' + (at + LIST) + ' ms and is <span class="c-g">committed</span>' : 'render for "' + pre + '" started (low priority)...', last ? 'smooth; list catches up ' + LIST + ' ms after the last key' : 'smooth']);
              frames.push({ narr: 'Key <b>' + key + '</b> at ' + at + ' ms. The <b>urgent lane</b> updates the input box right away. The list update is in a <b>transition lane</b>: ' + (k > 0 ? 'the previous list render was not finished, so React <b>drops it</b> and restarts with "' + pre + '". ' : 'it starts in time slices. ') + (last ? 'Nobody interrupts this one, so it completes and commits.' : 'The next key will probably interrupt it.'), parts: [{ type: 'table', label: 'Render lanes over time', columns: cols, rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var o = {}; o[rows.length - 1] = 'cur'; return o; })() }] });
            } else {
              var start = Math.max(at, freeAt), finish = start + LIST + INPUT, late = finish - at;
              freeAt = finish; lat.push(late);
              rows.push([at, key, '<span class="c-r">"' + pre + '" appears at t=' + finish + ' ms (waited ' + late + ' ms)</span>', 'rendered in the same urgent render', late > 150 ? '<span class="c-r">laggy, keys pile up</span>' : 'slightly sticky']);
              frames.push({ narr: 'Key <b>' + key + '</b> at ' + at + ' ms. Input and list are in the <b>same urgent render</b>, which cannot be interrupted. It starts at ' + start + ' ms' + (start > at ? ' (the main thread was still busy with the last key)' : '') + ', takes ' + (LIST + INPUT) + ' ms, so the letter shows up <b>' + late + ' ms</b> after you pressed it.', parts: [{ type: 'table', label: 'Render lanes over time', columns: cols, rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var o = {}; o[rows.length - 1] = 'bad'; return o; })() }] });
            }
          }
          var labels = word.split('').map(function (c, i) { return mode === 'sync' ? 'sync ' + c : 'trans ' + c; });
          frames.push({ narr: 'Delay between pressing a key and seeing it in the input box (ms). ' + (mode === 'sync' ? 'In sync mode the delay <b>grows with every key</b> because each key waits for all earlier list renders.' : 'With a transition the delay stays tiny (the urgent lane only waits for the current time slice). Total CPU work is similar, but only the <b>last</b> list render actually commits.'), parts: [{ type: 'bars', label: 'input latency per key (ms)', values: lat, idxLabels: labels, hl: lat.reduce(function (o, v, i) { o[i] = mode === 'sync' ? 'bad' : 'ok'; return o; }, {}) }] });
          return frames;
        }
      },
      {
        title: 'Suspense: a boundary shows a fallback while one child waits',
        gen: function () {
          var T = ['App', 'Nav', 'Susp', 'Logo', null, 'Prof', 'Spin'];
          function fr(narr, hl, tags, extra) {
            var parts = [{ type: 'tree', label: 'Component tree (Susp = Suspense boundary, Spin = its fallback)', arr: T, hl: hl, tags: tags || {} }];
            if (extra) parts.push(extra);
            return { narr: narr, parts: parts };
          }
          return [
            fr('The page has a <b>Suspense</b> boundary around <b>Profile</b>. Its <b>fallback</b> is a spinner. Nav and Logo are outside the boundary. React starts rendering from the top.', {}, {}),
            fr('React renders <b>App</b>, <b>Nav</b> and <b>Logo</b>. They need no waiting, so they are finished and will be shown.', { 0: 'ok', 1: 'ok', 3: 'ok' }, {}),
            fr('Next React enters the <b>Suspense</b> boundary and starts rendering <b>Profile</b>.', { 0: 'ok', 1: 'ok', 3: 'ok', 2: 'cur', 5: 'cur' }, {}),
            fr('<b>Profile</b> asks for its data (<code>use(promise)</code>), but the data has not arrived. It <span class="c-r">throws the promise</span> instead of returning UI. This is not an error: React treats it as "not ready yet".', { 0: 'ok', 1: 'ok', 3: 'ok', 2: 'cur', 5: 'bad' }, { 5: 'threw' }, { type: 'vars', vals: { 'data status': 'pending', 'nearest boundary': 'Susp' }, hl: { 'data status': 'bad' } }),
            fr('React walks up to the <b>nearest Suspense boundary</b> and renders its <b>fallback</b> (Spin) instead. Only this boundary is affected: Nav and Logo are fully visible and clickable.', { 0: 'ok', 1: 'ok', 3: 'ok', 2: 'cur', 5: 'done', 6: 'sel' }, { 6: 'shown' }),
            fr('Time passes. The browser still handles clicks on Nav. React is waiting on the promise but is not blocked.', { 0: 'ok', 1: 'ok', 3: 'ok', 2: 'cur', 5: 'done', 6: 'sel' }, { 6: 'waiting' }, { type: 'vars', vals: { 'data status': 'pending...', 'main thread': 'free' }, hl: {} }),
            fr('The promise <span class="c-g">resolves</span>. React schedules a retry: it renders <b>Profile</b> again, and this time <code>use(promise)</code> returns the data.', { 0: 'ok', 1: 'ok', 3: 'ok', 2: 'cur', 5: 'cur', 6: 'done' }, {}, { type: 'vars', vals: { 'data status': 'resolved' }, hl: { 'data status': 'ok' } }),
            fr('Commit: the fallback is removed and the real <b>Profile</b> appears. The rest of the page never flickered.', { 0: 'ok', 1: 'ok', 3: 'ok', 2: 'ok', 5: 'ok', 6: 'done' }, {})
          ];
        }
      },
      {
        title: 'Tab switch: Suspense fallback vs transition (old UI stays)',
        gen: function () {
          var cols = ['moment', 'setTab("posts") without a transition', 'startTransition(() => setTab("posts"))'];
          function t(rows, hl) { return [{ type: 'table', label: 'What the user sees', columns: cols, rows: rows, hl: hl || {} }]; }
          var r1 = ['0 ms: click "Posts"', 'urgent render starts', 'transition render starts in the background'];
          var r2 = ['1 ms: Posts needs data and suspends', '<span class="c-r">screen swaps to the fallback spinner (Profile content disappears)</span>', '<span class="c-g">Profile stays visible, tab button shows isPending (dim)</span>'];
          var r3 = ['500 ms: still waiting', 'spinner keeps spinning; layout jumps', 'user can still scroll, read and click Profile'];
          var r4 = ['800 ms: data arrives', 'Posts replaces the spinner', '<span class="c-g">Posts replaces Profile in one smooth commit</span>'];
          return [
            { narr: 'Scenario: a tabbed page. The user is on <b>Profile</b> and clicks <b>Posts</b>, whose data takes ~800 ms. Compare the two ways of doing the state update.', parts: t([r1]) },
            { narr: 'Without a transition the click is an <b>urgent</b> update. Posts suspends, so React must show <b>something</b> for the new tab right now: the Suspense fallback. Content the user was reading vanishes.', parts: t([r1, r2], { 1: 'cur' }) },
            { narr: 'With <code>startTransition</code> React renders Posts in the <b>background</b>. If it suspends, React does not hide the content that is already visible; it keeps the old screen and flips <code>isPending</code> to true so you can dim the button.', parts: t([r1, r2, r3], { 2: 'cur' }) },
            { narr: 'When the data arrives, the transition finishes and React commits the new tab in one go. Rule of thumb: <b>navigation-style updates go inside a transition</b>; Suspense fallbacks are for the first load of a section.', parts: t([r1, r2, r3, r4], { 3: 'ok' }) }
          ];
        }
      }
    ],
    examples: [
      {
        title: 'Filtering 20,000 rows while typing',
        html: `<p>A product table has 20,000 rows. Each keystroke filters the list and re-renders every visible row (about 120 ms). With one <code>useState</code> for the text, the input and the list update together, so typing "laptop" feels sticky: letters show up late and in bursts. With <code>useTransition</code> (or <code>useDeferredValue</code>) the input stays instant and the list quietly catches up. If the user types faster than the list can render, React throws away the outdated list renders: you only pay for the final one. For truly huge lists also <b>virtualize</b> (render only what is on screen), because a transition makes the lag invisible but does not make the work smaller.</p>`
      },
      {
        title: 'useDeferredValue to dim the stale results',
        html: `<p>A reusable <code>&lt;Results query=... /&gt;</code> component receives <code>query</code> from a parent you do not control, so you cannot wrap the setter in a transition. Use <code>useDeferredValue(query)</code> inside the child. While <code>deferred !== query</code> the screen still shows the old results; dim them (<code>opacity: 0.6</code>) so users know a refresh is coming. Wrap the heavy list in <code>React.memo</code> so it does not re-render for the urgent pass, otherwise the deferral gains nothing.</p>`,
        code: { lang: 'jsx', check: false, code: `const HeavyList = memo(function HeavyList({ query }) {
  const rows = filterAndRank(allItems, query);       // expensive
  return <ul>{rows.map((r) => <Row key={r.id} row={r} />)}</ul>;
});

function Results({ query }) {
  const deferred = useDeferredValue(query);
  return (
    <div style={{ opacity: deferred === query ? 1 : 0.6 }}>
      <HeavyList query={deferred} />   {/* memo: skipped while deferred is unchanged */}
    </div>
  );
}` }
      },
      {
        title: 'Two Suspense boundaries = independent loading',
        html: `<p>A dashboard has a fast "Orders" panel (100 ms) and a slow "Revenue chart" (2 s). With one big boundary the whole dashboard waits 2 s behind a single spinner. With <b>two separate boundaries</b> the Orders panel appears at 100 ms and only the chart shows its own skeleton. Where you put boundaries is a design decision: too few means big spinners, too many means a "popcorn" effect of things popping in at different times. Group things that make sense together, and use <code>&lt;SuspenseList&gt;</code>-style ordering ideas (or CSS reserved space) to avoid layout jumps.</p>`,
        code: { lang: 'jsx', check: false, code: `<main>
  <Suspense fallback={<OrdersSkeleton />}>
    <Orders />            {/* ready in 100 ms: shows early */}
  </Suspense>
  <Suspense fallback={<ChartSkeleton />}>
    <RevenueChart />      {/* ready in 2 s: has its own fallback */}
  </Suspense>
</main>` }
      },
      {
        title: 'Transition vs debounce: choose by what hurts',
        html: `<p><b>Debounce</b> waits (say 300 ms) after the last key before doing any work. Good for <i>network requests</i>: you avoid spamming the server. A <b>transition</b> does the work right away but at low priority and lets urgent updates cut in. Good for <i>render-heavy</i> local work. They solve different problems and combine well: debounce the fetch, put the resulting <code>setResults</code> in a transition. A transition does <b>not</b> reduce the number of network calls.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>Lanes are bit flags.</b> Internally a lane is a bit in a 31-bit integer, so a set of lanes is one number and operations like "highest priority lane in this set" are a single bit trick (<code>lanes &amp; -lanes</code>). Transition updates start in one of a handful of <code>TransitionLane</code> bits and rotate, so two independent transitions do not accidentally merge. Updates that are entangled (the same state queue) are rendered together.</p>
      <p><b>Starvation and expiry.</b> If urgent work keeps arriving, low-priority lanes could starve. React gives each lane an <b>expiration time</b>; once expired, the lane is treated as urgent and rendered synchronously. That is why a transition can still finish under heavy load, at the cost of that render no longer being interruptible.</p>
      <p><b>What "interrupt" really costs.</b> Interrupting means the partially built work-in-progress tree is discarded, and when the transition restarts React redoes the work from the root of the update. Memoization and pure components make the redo cheap; a giant un-memoized tree makes it expensive. A transition keeps the app responsive but can increase total CPU work.</p>
      <p><b>Suspense internals.</b> When a component throws a thenable, React marks the nearest boundary with the <code>ShouldCapture</code> flag, unwinds (<code>throwException</code>), and re-renders the boundary with the fallback branch. It attaches a <b>ping</b> listener to the thenable. When it settles, <code>pingSuspendedRoot</code> schedules a retry. In transitions, React avoids committing a fallback for content that is already visible: it suspends the whole transition render instead (committing nothing) until the data is ready, or until a short fallback throttle (about 300 ms) lets a fallback in, so the page does not flicker between states.</p>
      <p><b>React 19 additions worth knowing.</b> <code>use(promise)</code> and <code>use(context)</code> can be called conditionally and in loops (unlike hooks). Create the promise <i>outside</i> render (in a parent, a Server Component, or a cache), otherwise a new promise every render re-suspends forever. Actions (<code>useActionState</code>, <code>useOptimistic</code>, <code>form action</code>) run inside transitions, so pending state and optimistic UI follow the same lane rules. React 19.2 added <code>&lt;Activity&gt;</code>, which can hide a part of the UI and keep its state while rendering it at idle priority, a neat use of the lowest lane.</p>
      <p><b>Edge cases.</b> (1) An error thrown instead of a promise goes to the nearest <b>Error Boundary</b>, not Suspense; combine them. (2) A fallback that itself suspends bubbles to the next boundary up. (3) <code>useDeferredValue</code> accepts an <code>initialValue</code> in React 19 for the first render. (4) Do not start a transition for text input values: the controlled input must be updated in the urgent lane or the caret jumps.</p>`,
    aiEra: `<p><b>What AI changes:</b> "make this faster" prompts often get you debounce plus <code>useMemo</code> everywhere. Knowing lanes lets you ask for the right fix: split urgent and non-urgent state, wrap the setter in <code>startTransition</code>, place Suspense boundaries so one slow query does not block the page. AI features themselves also lean on these tools: a chat UI that <b>streams</b> tokens updates state many times per second, and putting the heavy markdown re-parse in a transition keeps the input box smooth.</p>
      <p><b>Use AI as a partner:</b> describe the UI and ask <code>Where would you put Suspense boundaries for this dashboard, and which updates should be transitions? Explain the trade-off for each.</code> Have it generate a deliberately slow component (busy loop of 100 ms) so you can see the difference in the Profiler's "Transition" track. Ask for a Playwright test that types quickly and asserts the input value is never behind.</p>
      <p><b>Where AI goes wrong:</b> it wraps <i>everything</i> in <code>startTransition</code>, puts the controlled input value inside a transition (caret jumps), forgets <code>isPending</code> feedback, or creates the promise inside the component that calls <code>use()</code> (infinite suspend loop). It also says transitions "run in a worker" (they do not) or "make code faster" (they make it feel faster).</p>
      <p><b>What you must still own:</b> deciding what is urgent, measuring with the Profiler, choosing boundary granularity, and error handling for suspended data.</p>`,
    problems: [
      {
        title: 'Keep Typing Responsive with useTransition',
        level: 'Medium', tags: ['useTransition', 'concurrent', 'react'], companies: ['Meta', 'Swiggy', 'Atlassian'],
        statement: `<p>The component below filters 30,000 products on every keystroke. Typing feels laggy because the input value and the filtered list are driven by <b>one</b> state and one urgent render. Rewrite it so the input stays instant, the list updates at low priority, and the user sees a subtle "updating" hint while the list is behind. Do not use a debounce.</p>`,
        constraints: `Use only React hooks. The input must remain a controlled input. <code>filterProducts(products, query)</code> is a pure function and is expensive (about 100 ms).`,
        example: `<p>User types "lap" quickly. ${H.c('r', 'Before')}: each letter appears after the previous list render, so the box lags by 100-300 ms. ${H.c('g', 'After')}: letters appear within one frame; the list shows results for "l" or "la" while behind, then jumps to "lap", and an "updating..." label shows while it catches up.</p>`,
        brute: { why: `<p>One state drives both the text box and the heavy list, so every keystroke produces one big <b>urgent</b> render. React cannot interrupt urgent work, so the input waits for the list. A debounce would make the <i>list</i> late but also delays the input if you debounce the wrong state; it never lets the list be interrupted either.</p>`,
          code: { lang: 'jsx', check: false, code: `function Products({ products }) {
  const [query, setQuery] = useState('');
  const rows = filterProducts(products, query);          // ~100 ms every keystroke
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul>{rows.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
    </>
  );
}` } },
        mcq: { q: 'Which update should be wrapped in startTransition?', options: ['setText(e.target.value) for the controlled input', 'setQuery(e.target.value) that feeds the expensive list', 'Both, to be safe'], answer: 1, explain: 'The input value must stay urgent so the caret and typed characters never lag. Only the expensive derived update goes into the transition.' },
        hints: [
          `<p>Hint 1: the same keystroke contains two different jobs with different urgency: showing the typed letter (urgent) and recomputing the list (can wait).</p>`,
          `<p>Hint 2: use two pieces of state: <code>text</code> for the input and <code>query</code> for the list. Update <code>query</code> inside <code>startTransition</code> from <code>useTransition()</code>.</p>`,
          `<p>Hint 3: memoize the list part so it does not re-run for the urgent render (<code>React.memo</code> or compute the rows from <code>query</code> with <code>useMemo</code>). Show <code>isPending</code> feedback. Recipe: onChange sets text now, then startTransition(() =&gt; setQuery(value)).</p>`
        ],
        solution: {
          approach: `<p>Split the state. <code>text</code> is updated normally so the controlled input is always instant. <code>query</code> is updated inside <code>startTransition</code>, which puts the render that depends on it in a transition lane. If the user types again, React throws the older list render away. The list lives in a memoized child, so the urgent render (input only) does not redo the expensive filtering. <code>isPending</code> drives the hint.</p>`,
          code: { lang: 'jsx', check: false, code: `import { useState, useTransition, useMemo, memo } from 'react';

const ProductList = memo(function ProductList({ products, query }) {
  // Only re-runs when query (the transition value) really changes.
  const rows = useMemo(() => filterProducts(products, query), [products, query]);
  return <ul>{rows.map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
});

function Products({ products }) {
  const [text, setText] = useState('');            // urgent: what the box shows
  const [query, setQuery] = useState('');          // transition: what the list uses
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    const value = e.target.value;
    setText(value);                                // urgent lane
    startTransition(() => setQuery(value));        // low-priority lane
  }

  return (
    <>
      <input value={text} onChange={handleChange} />
      {isPending && <small>updating...</small>}
      <div style={{ opacity: isPending ? 0.6 : 1 }}>
        <ProductList products={products} query={query} />
      </div>
    </>
  );
}` },
          complexity: `<p>Total filtering work is the same or slightly lower (stale renders are dropped); perceived input latency drops from about 100 ms per key to about one frame.</p>`,
          followUps: ['Rewrite with useDeferredValue instead and explain when you would prefer it.', 'Combine with react-window virtualization: what does each technique fix?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 5 — React Server Components
     ===================================================================== */
  topics.push({
    title: 'React Server Components & the Client Boundary',
    analogy: `<p>A restaurant has a <b>kitchen</b> and a <b>dining room</b>. A diner does not need the oven, the fridge, the recipe books or the safe with the supplier contracts. They only need the finished plate and maybe a salt shaker they can use themselves. <b>Server Components</b> are the kitchen: they run where the data and secrets are, and send only the finished plate (a description of the UI) to the table. <b>Client Components</b> are the salt shakers: small interactive things that must physically be at the table (buttons, inputs, anything that reacts to the user). The less equipment you carry to the dining room, the faster dinner is served.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Until recently every React component was shipped to the browser as JavaScript, even a component that only prints a list from a database. A <b>React Server Component (RSC)</b> is a component that runs <b>only on the server</b> (at request time or at build time). Its code and its libraries never reach the browser. React sends the browser the <b>result</b> of running it. Components that need clicks, state, effects or browser APIs stay <b>Client Components</b>.</p>
      <p>🔵 <b>How you choose in Next.js (App Router).</b> Every component in the <code>app/</code> folder is a Server Component <b>by default</b>. You opt a file into the browser by writing the string <code>'use client'</code> at the very top. That line marks a <b>boundary</b>: this file, and everything it imports, becomes part of the client JavaScript bundle.</p>
      ${H.table(['', 'Server Component', 'Client Component (<code>\'use client\'</code>)'], [
        ['Where it runs', 'Server only (request or build time)', 'Browser (and also on the server once, to make the first HTML)'],
        ['JS sent to browser', '<span class="c-g">None</span>', '<span class="c-r">Yes: its code + libraries</span>'],
        ['Can use', '<code>async/await</code>, database, file system, secrets, huge libraries', '<code>useState</code>, <code>useEffect</code>, onClick, <code>window</code>, <code>localStorage</code>'],
        ['Cannot use', 'State, effects, event handlers, browser APIs, <code>useContext</code>', 'Server-only code, secrets, direct DB access'],
        ['Re-renders on state change?', 'No: it renders once per request', 'Yes: like normal React']
      ])}
      <p>🔵 <b>Server Components are not the same as SSR.</b> People mix these up all the time:</p>
      ${H.table(['', 'SSR (server-side rendering)', 'Server Components'], [
        ['Question it answers', '"Can the first HTML already contain the page?"', '"Which components' + "'" + ' code runs where?"'],
        ['Components involved', 'All of them (client ones too) render on the server once', 'Only the ones without <code>\'use client\'</code> stay server-only'],
        ['JS still shipped?', 'Yes, every component, to hydrate', '<span class="c-g">No, for server components</span>'],
        ['Works together?', 'Yes: Next.js server-renders both kinds to HTML, then hydrates only the client ones', '']
      ])}
      <p>🔵 <b>What actually travels.</b> The server renders the server components and produces the <b>RSC payload</b>: a compact stream describing the tree. Plain elements are written out; wherever a Client Component sits the payload holds only a <b>reference</b> ("component file X, with these props") instead of code. The browser loads the JavaScript for the referenced client components and plugs them in. On later navigation, only a new RSC payload is fetched, and React merges it into the page <b>without losing client state</b> such as the text in a search box.</p>
      <p>🔵 <b>Rules at the boundary.</b></p>
      <ul>
        <li><b>Server can import client</b>, never the other way around. A client file cannot import a server-only component (it would pull the server code into the bundle).</li>
        <li>A client component <b>can still show server components</b> if they are passed in as <code>children</code> or props: the server renders them, the client component just places them. This is called the <b>donut pattern</b>.</li>
        <li><b>Props crossing the boundary must be serializable</b>: strings, numbers, booleans, arrays, plain objects, Dates, Maps, Sets, Promises, and Server Actions. Not functions, not class instances, not React elements built on the client.</li>
        <li><b>Push <code>'use client'</code> down to the leaves.</b> Make only the button or the form client-side, not the whole page, or you lose the benefit.</li>
      </ul>
      <p>🔵 <b>Server Actions.</b> A function marked <code>'use server'</code> runs on the server but can be called from a form or a client event. React turns the call into a POST request for you. Use them for mutations (add to cart, save profile) without writing an API route.</p>`,
    clues: [
      '"Reduce the JavaScript bundle / large library only used to render static content" → move that component to the server (RSC)',
      '"Fetch data close to the component without exposing keys or writing an API" → async Server Component',
      '"Where do I put \'use client\'?" → as low as possible: the smallest interactive leaf',
      '"Error: useState only works in a Client Component" / "Functions cannot be passed directly to Client Components" → boundary rule violations',
      '"What is the difference between SSR and Server Components?" → SSR makes HTML (everything is still hydrated); RSC decides what code ships at all',
      '"Context provider in the App Router" → a small Client Component that wraps {children} (children can stay server components)'
    ],
    code: [
      {
        lang: 'js', run: true, title: 'Which files end up in the browser bundle?',
        code: `// Every module lists what it imports. "client: true" means the file starts
// with 'use client'. A client file and EVERYTHING it imports ships to the browser.
const modules = {
  'page.js':         { client: false, kb: 2,  imports: ['Header.js', 'ProductList.js', 'AddToCart.js'] },
  'Header.js':       { client: false, kb: 3,  imports: [] },
  'ProductList.js':  { client: false, kb: 4,  imports: ['markdown-lib'] },
  'markdown-lib':    { client: false, kb: 90, imports: [] },
  'AddToCart.js':    { client: true,  kb: 2,  imports: ['Button.js', 'date-lib'] },
  'Button.js':       { client: false, kb: 1,  imports: [] },
  'date-lib':        { client: false, kb: 30, imports: [] }
};

function clientBundle(entry) {
  const client = new Set();
  const seen = new Set();
  // once we cross a 'use client' boundary, everything below is client code
  function addAll(name) {
    if (client.has(name)) return;
    client.add(name);
    modules[name].imports.forEach(addAll);
  }
  function walk(name) {
    if (seen.has(name)) return;
    seen.add(name);
    if (modules[name].client) { addAll(name); return; } // boundary found
    modules[name].imports.forEach(walk);                // still server code: keep looking
  }
  walk(entry);
  return [...client];
}

const shipped = clientBundle('page.js');
const sum = (names) => names.reduce((total, n) => total + modules[n].kb, 0);
console.log('sent to browser:', shipped.join(', '), '=>', sum(shipped), 'kB');
console.log('if everything were client code:', sum(Object.keys(modules)), 'kB');
console.log('markdown-lib (90 kB) stayed on the server, because only server files import it.');`
      },
      {
        lang: 'js', run: true, title: 'A mini RSC renderer: client components become references',
        code: `// h() builds elements like JSX does. Client components are marked with $client.
const h = (type, props, ...children) => ({ type, props: { ...(props || {}), children } });
const clientComponent = (id) => { const f = () => null; f.$client = id; return f; };

const AddToCart = clientComponent('AddToCart.js');   // a 'use client' file

// Props that cross the server -> client boundary must be plain data.
function assertSerializable(props, where) {
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'function') throw new Error('Functions cannot be passed to Client Components (prop "' + k + '" of ' + where + ')');
  }
}

// "Server" renderer: runs server components NOW, and turns client components
// into a small reference instead of running or shipping their code.
function renderServer(el) {
  if (el === null || typeof el === 'string' || typeof el === 'number') return el;
  if (Array.isArray(el)) return el.map(renderServer);
  if (typeof el.type === 'function' && el.type.$client) {
    const { children, ...plain } = el.props;
    assertSerializable(plain, el.type.$client);
    return { $client: el.type.$client, props: plain };             // reference, not code
  }
  if (typeof el.type === 'function') return renderServer(el.type(el.props)); // server component: run it
  return { tag: el.type, kids: el.props.children.map(renderServer) };
}

// A server component that reads "the database" directly.
const db = { 42: { name: 'Lamp', price: 30 } };
function ProductPage({ id }) {
  const p = db[id];                                   // secrets / DB never leave the server
  return h('main', null, h('h1', null, p.name), h(AddToCart, { productId: id, price: p.price }));
}

console.log(JSON.stringify(renderServer(h(ProductPage, { id: 42 }))));

try {
  renderServer(h(AddToCart, { onBuy: () => 1 }));
} catch (e) {
  console.log('ERROR:', e.message);
}` },
      {
        lang: 'jsx', check: false, title: 'Next.js App Router: server page, client leaf, server action',
        code: `// app/products/[id]/page.js   -> Server Component (no directive needed)
import { db } from '@/lib/db';              // server-only: never reaches the browser
import AddToCart from './AddToCart';        // a Client Component
import { addToCart } from './actions';

export default async function ProductPage({ params }) {
  const { id } = await params;              // Next.js 15+: params is a Promise
  const product = await db.product.findUnique({ where: { id } });  // runs on the server
  return (
    <main>
      <h1>{product.name}</h1>
      <p>{product.description}</p>          {/* static: zero client JS */}
      <AddToCart productId={product.id} action={addToCart} />
    </main>
  );
}

// app/products/[id]/AddToCart.js   -> Client Component
'use client';
import { useState, useTransition } from 'react';

export default function AddToCart({ productId, action }) {
  const [added, setAdded] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(async () => { await action(productId); setAdded(true); })}
    >
      {added ? 'Added' : 'Add to cart'}
    </button>
  );
}

// app/products/[id]/actions.js   -> Server Action
'use server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export async function addToCart(productId) {
  const userId = (await cookies()).get('uid')?.value;   // secrets stay on the server
  await db.cartItem.create({ data: { userId, productId } });
}` }
    ],
    codeTitle: ['Plain-JS model: what ships in the bundle', 'Plain-JS model: RSC payload and serializable props', 'Next.js: page + client leaf + server action'],
    viz: [
      {
        title: 'Client boundary: what code ships to the browser?',
        input: 'Page,Header,Main,Logo,Nav,Cart*,List',
        inputLabel: 'Component tree in level order (add * to a name = it has \'use client\'; _ = none; max 15 slots; names up to 5 letters)',
        gen: function (input) {
          var hint = 'Example: Page,Header,Main,Logo,Nav,Cart*,List   (mark client components with *)';
          var raw = parseTree(input, hint), names = [], isClient = [], i;
          raw.forEach(function (s) { names.push(s === null ? null : s.replace('*', '')); isClient.push(s !== null && s.indexOf('*') >= 0); });
          function kb(n) { var s = 0; for (var k = 0; k < n.length; k++) s += n.charCodeAt(k); return 10 + (s % 20); }
          var state = [], tags = {}, hl = {}, shipped = 0, total = 0, frames = [];
          for (i = 0; i < names.length; i++) { if (names[i] === null) { state.push(null); continue; } total += kb(names[i]); state.push(''); }
          frames.push({ narr: 'In the App Router every component is a <b>Server Component</b> unless its file says <code>\'use client\'</code>. Components marked <b>*</b> in your input have that directive. We walk the tree top-down and ask: does this node ship JavaScript to the browser?', parts: [
            { type: 'tree', label: 'Component tree', arr: names, hl: {}, tags: {} },
            { type: 'bars', label: 'JavaScript sent to the browser (kB)', values: [0, total], idxLabels: ['with RSC (so far)', 'if all were client'], hl: { 1: 'bad' } }
          ] });
          function visit(idx, underClient) {
            if (!has(names, idx)) return;
            var client = underClient || isClient[idx], size = kb(names[idx]);
            var msg;
            if (isClient[idx] && !underClient) { hl[idx] = 'sel'; tags[idx] = 'boundary'; shipped += size; msg = '<b>' + names[idx] + '</b> has <code>\'use client\'</code>: this is a <b>boundary</b>. Its code (' + size + ' kB) ships to the browser, and so does everything it imports below.'; }
            else if (underClient) { hl[idx] = 'cur'; tags[idx] = 'client'; shipped += size; msg = '<b>' + names[idx] + '</b> sits below a client boundary, so it is part of the client bundle too (' + size + ' kB), even without its own directive.'; }
            else { hl[idx] = 'ok'; tags[idx] = 'server'; msg = '<b>' + names[idx] + '</b> is a Server Component: it runs on the server and sends <span class="c-g">0 kB</span> of JavaScript. Only its output travels.'; }
            frames.push({ narr: msg, parts: [
              { type: 'tree', label: 'Component tree', arr: names, hl: cp(hl), tags: cp(tags) },
              { type: 'bars', label: 'JavaScript sent to the browser (kB)', values: [shipped, total], idxLabels: ['with RSC (so far)', 'if all were client'], hl: { 0: 'ok', 1: 'bad' } }
            ] });
            visit(2 * idx + 1, client);
            visit(2 * idx + 2, client);
          }
          visit(0, false);
          var saved = total - shipped;
          frames.push({ narr: 'Result: <b>' + shipped + ' kB</b> ships instead of <b>' + total + ' kB</b> (saving ' + saved + ' kB, about ' + Math.round(saved * 100 / total) + '%). Moving <code>\'use client\'</code> lower or splitting a big client component usually saves even more. Try moving the * to a leaf.', parts: [
            { type: 'tree', label: 'Component tree', arr: names, hl: cp(hl), tags: cp(tags) },
            { type: 'bars', label: 'JavaScript sent to the browser (kB)', values: [shipped, total], idxLabels: ['with RSC', 'if all were client'], hl: { 0: 'ok', 1: 'bad' } }
          ] });
          return pad4(frames);
        }
      },
      {
        title: 'One request through the RSC pipeline',
        gen: function () {
          var nodes = [
            { id: 'B', label: 'Browser', x: 10, y: 22, shape: 'box' },
            { id: 'S', label: 'Next.js server (RSC)', x: 48, y: 22, shape: 'box' },
            { id: 'D', label: 'Database', x: 88, y: 22, shape: 'box' },
            { id: 'J', label: 'Client JS (AddToCart only)', x: 30, y: 52, shape: 'box' }
          ];
          function g(narr, hl, ehl, tags, vals) {
            var parts = [{ type: 'graph', directed: true, height: 62, nodes: nodes, edges: [['B', 'S', 'request'], ['S', 'D', 'query'], ['S', 'B', 'HTML + RSC payload'], ['J', 'B', 'tiny bundle']], hl: hl, ehl: ehl, tags: tags || {} }];
            if (vals) parts.push({ type: 'vars', vals: vals });
            return { narr: narr, parts: parts };
          }
          return [
            g('The user opens <code>/products/42</code>. The browser sends one ordinary request to the Next.js server.', { B: 'cur' }, { 'B-S': 'cur' }),
            g('The server starts rendering the page. <code>ProductPage</code> is a <b>Server Component</b>, so it simply <code>await</code>s the database. No API route, no key in the browser.', { S: 'cur', D: 'win' }, { 'S-D': 'cur' }, { 'secrets sent to browser': 'none' }),
            g('The server finishes the server components and writes the <b>RSC payload</b>. Where <code>AddToCart</code> goes it writes only a reference ("load AddToCart.js with productId=42"). It also renders HTML for a fast first paint.', { S: 'ok' }, {}, { 'AddToCart': 'reference only', 'ProductPage code': 'stays on server' }),
            g('The server streams <b>HTML + payload</b> to the browser. The user already sees the product name and description, although nothing is interactive yet.', { B: 'ok', S: 'ok' }, { 'S-B': 'ok' }, { B: 'painted' }),
            g('The browser downloads <b>only the client JavaScript</b> that the payload references: here just the small AddToCart bundle plus React. The 90 kB markdown library never leaves the server.', { B: 'cur', J: 'sel' }, { 'J-B': 'sel' }, { J: 'small' }),
            g('React <b>hydrates</b> the client component: AddToCart becomes interactive. Server-rendered parts stay as plain HTML and need no hydration work at all.', { B: 'ok', J: 'ok' }, {}, { B: 'interactive' }),
            g('The user clicks "Add to cart". The Client Component calls a <b>Server Action</b>; React sends a POST to the server, which runs the function next to the database.', { B: 'cur', S: 'cur', D: 'win' }, { 'B-S': 'cur', 'S-D': 'cur' }),
            g('Later navigation fetches just a new RSC payload and React merges it in. The page does not reload and client state (typed text, open menus) is preserved.', { B: 'ok', S: 'ok' }, { 'S-B': 'ok' }, { B: 'state kept' })
          ];
        }
      }
    ],
    examples: [
      {
        title: 'The product page: where to put the line',
        html: `<p>A product page shows a title, long description (rendered from markdown with a 90 kB library), a related-products list, and an "Add to cart" button. Only the button needs <code>onClick</code> and state. So: the page, description and related list stay <b>Server Components</b>; only <code>AddToCart</code> gets <code>'use client'</code>. The browser downloads a few kilobytes instead of the markdown library, and the database query happens right inside the page with no API layer. If someone puts <code>'use client'</code> on the page "to make the button work", the markdown library and everything else are suddenly shipped, which is the most common RSC mistake.</p>`
      },
      {
        title: 'Context provider without making the whole app client-side',
        html: `<p>Context needs a Client Component, but wrapping the app in one does not turn everything inside into client code: whatever you pass as <code>children</code> is rendered by the server first. Put the provider in its own small file and wrap <code>{children}</code> in the root layout. Pages under it can stay Server Components and may still read the context if they contain Client Component leaves.</p>`,
        code: { lang: 'jsx', check: false, code: `// app/ThemeProvider.js
'use client';
import { createContext, useState } from 'react';
export const ThemeContext = createContext('light');

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

// app/layout.js   (Server Component)
import ThemeProvider from './ThemeProvider';
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>{children}</ThemeProvider>   {/* children = server-rendered output */}
      </body>
    </html>
  );
}` }
      },
      {
        title: 'The "donut" pattern: server content inside a client shell',
        html: `<p>A <code>Modal</code> needs state (open/closed) so it is a Client Component. Its content is a heavy server-rendered report. If the modal <i>imports</i> the report, the report becomes client code. If the server page renders <code>&lt;Modal&gt;&lt;Report /&gt;&lt;/Modal&gt;</code>, the report is rendered on the server and handed to the modal as <code>children</code> (already-finished output). The client file only knows "there is something to put in my hole", like a donut: client ring, server filling.</p>`,
        code: { lang: 'jsx', check: false, code: `// Modal.js
'use client';
import { useState } from 'react';
export default function Modal({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Show report</button>
      {open && <div role="dialog">{children}</div>}
    </>
  );
}

// page.js (Server Component)
import Modal from './Modal';
import Report from './Report';          // heavy, server-only, uses the DB
export default function Page() {
  return <Modal><Report /></Modal>;     // Report renders on the server
}` }
      },
      {
        title: 'Error messages you will meet',
        html: `<p><b>"You're importing a component that needs useState. It only works in a Client Component"</b>: add <code>'use client'</code> to the file that calls the hook, or move the stateful part into its own small file. <b>"Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with 'use server'"</b>: a server file passed an <code>onClick</code> function as a prop; make the handler live inside the client file or use a Server Action. <b>"Text content does not match server-rendered HTML"</b>: that is hydration (next topic), not a boundary problem.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>The Flight protocol.</b> The RSC payload is produced by React's "Flight" renderer (<code>react-server-dom-*</code> packages) as a line-based stream of rows: each row has an ID and a JSON-like chunk. Client component references look like <code>I["app/AddToCart.js", ["chunk-1.js"], "default"]</code> (module ID, which JS chunks to load, export name). Elements appear as <code>["$","h1",null,{"children":"Lamp"}]</code>. Because it is a stream, slow parts can arrive later: a Suspense boundary shows its fallback first, and the real content is sent as a later row that replaces it. That is how <b>streaming</b> works in the App Router.</p>
      <p><b>Bundlers do the work.</b> RSC needs bundler support to build separate server and client module graphs and to turn each <code>'use client'</code> file into a chunk with a manifest entry. Next.js (webpack/Turbopack), Parcel and Vite plugins (e.g. the RSC plugin and frameworks like React Router's RSC mode, Waku, RedwoodSDK) implement this. You cannot use plain Create React App for RSC.</p>
      <p><b>Waterfalls move, they do not vanish.</b> A Server Component that <code>await</code>s data and then renders a child that <code>await</code>s its own data creates a sequential <b>server-side waterfall</b>: 100 ms + 100 ms + 100 ms. Fixes: start independent fetches together (<code>Promise.all</code>), pass the promise down and read it with <code>use()</code> / inside a Suspense boundary, or preload data. On the server these round trips are short (same data center), but they still add up.</p>
      <p><b>Caching and dedupe.</b> React gives you <code>cache()</code> to memoize a function per request, so ten components asking for "current user" cause one DB call. Next.js adds its own layers: the data cache (fetch results), the full route cache for static routes, and the client router cache. Their defaults changed in Next.js 15 (fetch and GET handlers no longer cached by default) and Next.js 16 moved toward explicit opt-in caching with the <code>'use cache'</code> directive. Always check the docs for the version you run.</p>
      <p><b>Security model.</b> Server code is private, but anything you <i>pass as a prop</i> to a Client Component is serialized into the page and visible to the user: never pass a whole database row if you only need a name. Use a data access layer that returns safe DTOs, and the <code>server-only</code> package so an accidental client import fails the build. Server Actions are public HTTP endpoints: always authenticate and validate inputs inside them (never trust the arguments). Critical vulnerabilities in the RSC protocol have been found and patched in the past, so keep React and your framework on the latest patch release.</p>
      <p><b>Edge cases.</b> (1) A module imported by both a server and a client file is bundled twice (once per graph). (2) Third-party UI libraries without a <code>'use client'</code> directive break when imported from a server file; wrap them in your own small client file. (3) Async components are only for the server; a Client Component cannot be <code>async</code> (use <code>use()</code> with a promise instead). (4) <code>useId</code> and <code>use</code> are allowed on both sides.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI tools (v0, Cursor, Copilot, Claude) generate a lot of Next.js code, and the single most frequent mistake is a <code>'use client'</code> at the top of every file "to make errors go away". That silently turns your app back into a heavy SPA. Understanding the boundary lets you review generated code in seconds: where is the directive, why, and could it move down?</p>
      <p><b>Use AI as a partner:</b> ask <code>Audit this app/ directory: list every 'use client' file, what hook or event handler forces it, and propose how to push the boundary to a smaller leaf component.</code> Ask it to draw the import graph and compute what each page ships. Use it to convert a client-side <code>useEffect</code> + <code>fetch</code> page into an async Server Component plus a small client leaf, then compare the bundle analyzer output (<code>@next/bundle-analyzer</code>).</p>
      <p><b>Where AI goes wrong:</b> it mixes up Pages Router APIs (<code>getServerSideProps</code>) with App Router, imports server code into client files, passes functions or class instances as props across the boundary, forgets to authorize inside Server Actions, and confuses <code>'use server'</code> (Server Actions) with "this is a server component". Server Components are the default; there is no directive for them.</p>
      <p><b>What you must still own:</b> the boundary decisions, data exposure review (what is serialized to the browser), authorization in actions, and measuring the real bundle and waterfalls. AI features like streaming chat also fit well: a Server Component or route handler calls the model and streams tokens; only the chat input and message list are client components.</p>`,
    problems: [
      {
        title: 'Split Client and Server Components',
        level: 'Medium', tags: ['server components', 'use client', 'next.js'], companies: ['Vercel', 'Shopify', 'Atlassian'],
        statement: `<p>A developer made the whole product page a Client Component because the "Like" button needs <code>useState</code>. The page also loads a 90 kB markdown library to render the description and fetches the product from an API in <code>useEffect</code>. Refactor the Next.js App Router code so the page and description are Server Components that read the database directly, and only the like button is a Client Component.</p>`,
        constraints: `Next.js App Router. The Like button keeps its count in local state and may call a Server Action. Do not pass functions from server to client other than Server Actions.`,
        example: `<p>${H.c('r', 'Before')}: <code>page.js</code> has <code>'use client'</code>, so the markdown library (90 kB) and all components are in the client bundle, and data loads after the page appears (spinner). ${H.c('g', 'After')}: the page ships about 2 kB of client JS (the button), the description HTML arrives ready, and the data is loaded on the server before the response is sent.</p>`,
        brute: { why: `<p>Marking the entire page <code>'use client'</code> works, but it ships every dependency to the browser, forces data fetching after hydration (a loading spinner and an extra network round trip), and exposes API details. The only thing that needed the browser was one button.</p>`,
          code: { lang: 'jsx', check: false, code: `'use client';
import { useState, useEffect } from 'react';
import { marked } from 'marked';            // 90 kB shipped to every visitor

export default function ProductPage({ id }) {
  const [product, setProduct] = useState(null);
  const [likes, setLikes] = useState(0);
  useEffect(() => {
    fetch('/api/products/' + id).then((r) => r.json()).then(setProduct);  // after render
  }, [id]);
  if (!product) return <p>Loading...</p>;
  return (
    <main>
      <h1>{product.name}</h1>
      <div dangerouslySetInnerHTML={{ __html: marked(product.description) }} />
      <button onClick={() => setLikes(likes + 1)}>Like ({likes})</button>
    </main>
  );
}` } },
        mcq: { q: 'Where should the \'use client\' directive go?', options: ['At the top of page.js, so everything works', 'Only in the file of the Like button component', 'In every file, to be safe'], answer: 1, explain: 'Put the directive on the smallest piece that needs state or events. Everything else stays a Server Component and ships no JavaScript.' },
        hints: [
          `<p>Hint 1: ask of each piece "does it need state, effects, or browser events?" The description and title do not. Only the button does.</p>`,
          `<p>Hint 2: make <code>page.js</code> an <code>async</code> Server Component that awaits the data directly and imports the markdown library. Move the button to its own file with <code>'use client'</code>.</p>`,
          `<p>Hint 3: pass only plain data (the product id, initial like count) to the button. If the count must be saved, pass a Server Action. Remember to sanitize markdown HTML (or use a safe renderer) since it is rendered as HTML.</p>`
        ],
        solution: {
          approach: `<p>Turn the page into an <code>async</code> Server Component: it queries the database and renders markdown on the server, so neither the library nor the fetch code is sent to the browser. Create <code>LikeButton.js</code> as the only client file; it receives plain, serializable props (<code>productId</code>, <code>initialLikes</code>) and an optional Server Action. The browser receives HTML for the content immediately and a tiny bundle for the button.</p>`,
          code: { lang: 'jsx', check: false, code: `// app/products/[id]/page.js  (Server Component, no directive)
import { marked } from 'marked';                 // stays on the server
import DOMPurify from 'isomorphic-dompurify';    // sanitize HTML we inject
import { db } from '@/lib/db';
import LikeButton from './LikeButton';
import { likeProduct } from './actions';

export default async function ProductPage({ params }) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });   // no API hop
  const html = DOMPurify.sanitize(await marked(product.description));
  return (
    <main>
      <h1>{product.name}</h1>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <LikeButton productId={product.id} initialLikes={product.likes} action={likeProduct} />
    </main>
  );
}

// app/products/[id]/LikeButton.js  (the only Client Component)
'use client';
import { useState, useTransition } from 'react';

export default function LikeButton({ productId, initialLikes, action }) {
  const [likes, setLikes] = useState(initialLikes);
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        setLikes((n) => n + 1);                                    // instant feedback
        startTransition(() => action(productId));                  // server does the real save
      }}
    >
      Like ({likes})
    </button>
  );
}

// app/products/[id]/actions.js
'use server';
import { db } from '@/lib/db';
export async function likeProduct(productId) {
  await db.product.update({ where: { id: productId }, data: { likes: { increment: 1 } } });
}` },
          complexity: `<p>Client JS drops from roughly 90+ kB (library + page + React glue) to the button bundle (a few kB). The data fetch moves from "after hydration, via public API" to "before the first byte, inside the data center".</p>`,
          followUps: ['How would you show the like count optimistically with useOptimistic?', 'The description is user-written markdown. What security issue does rendering it as HTML create, and where do you fix it?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 6 — CSR vs SSR vs SSG vs ISR
     ===================================================================== */
  var NETMS = 50; // one network round trip used by the strategy timeline model
  function strategyTimes(name, dataMs, jsMs, hydrateMs) {
    var ttfb, fcp, tti, steps;
    if (name === 'CSR') {
      ttfb = NETMS + 20;
      fcp = ttfb + jsMs + NETMS + dataMs;
      tti = fcp;
      steps = [[0, 'user opens the URL'], [ttfb, '<b>TTFB</b>: an almost empty HTML shell arrives from a CDN (blank page or spinner)'], [ttfb + jsMs, 'JavaScript bundle downloaded and run; the app now calls the API'], [fcp, '<b>FCP/LCP and TTI</b>: data arrives, the browser renders real content, and the page is already interactive']];
    } else if (name === 'SSR') {
      ttfb = NETMS + dataMs + 20;
      fcp = ttfb + 30;
      tti = Math.max(fcp, ttfb + jsMs) + hydrateMs;
      steps = [[0, 'user opens the URL'], [ttfb, '<b>TTFB</b>: server fetched the data and rendered HTML for THIS request (the wait is here)'], [fcp, '<b>FCP</b>: browser paints real content straight from the HTML'], [tti, '<b>TTI</b>: JS downloaded, React hydrates; only now do clicks work']];
    } else {
      ttfb = NETMS + 5;
      fcp = ttfb + 30;
      tti = Math.max(fcp, ttfb + jsMs) + hydrateMs;
      steps = [[0, 'user opens the URL'], [ttfb, '<b>TTFB</b>: a ready-made HTML file comes from the CDN edge (no server work)'], [fcp, '<b>FCP</b>: browser paints real content straight from the HTML'], [tti, '<b>TTI</b>: JS downloaded, React hydrates; clicks work']];
    }
    return { ttfb: ttfb, fcp: fcp, tti: tti, steps: steps };
  }

  topics.push({
    title: 'CSR vs SSR vs SSG vs ISR in Next.js',
    analogy: `<p>You run a pizza shop and have four ways to serve a pizza.</p>
      <p><b>CSR (client-side rendering)</b>: you hand the customer a box with dough, sauce and instructions. They cook at home. Delivery is instant, but they are hungry and staring at raw dough until they finish cooking. <b>SSR (server-side rendering)</b>: you bake a fresh pizza when each order arrives. It is always fresh and can be made exactly their way, but the customer waits while the oven works, and a busy night needs many ovens. <b>SSG (static site generation)</b>: you bake all the pizzas in the morning and keep them on a shelf by the door. Hand-over is instant, but the pizza is as old as the morning bake. <b>ISR (incremental static regeneration)</b>: shelf pizzas, but a worker quietly bakes a replacement in the background once a pizza is older than an hour. Customers always get a pizza instantly; it is just never much older than an hour.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> The big question is <b>"when and where is the HTML for this page created?"</b> There are four answers, and Next.js lets you choose per page (per route):</p>
      ${H.table(['Strategy', 'HTML is made...', 'Where', 'Good for', 'Watch out for'], [
        ['<b>CSR</b>', 'in the browser, after JS loads and data arrives', 'Browser', 'Dashboards behind login, highly interactive tools, admin panels', 'Blank screen first, weak SEO/social previews, slow on weak phones'],
        ['<b>SSR</b>', 'on the server, for every request', 'Server (or edge)', 'Personalized or always-fresh pages that need SEO: search results, feeds, carts', 'Slower TTFB (user waits for data), server cost, caching is harder'],
        ['<b>SSG</b>', 'once, at build time', 'Build machine, served from CDN', 'Blogs, docs, marketing pages, changelogs', 'Stale until the next build; very many pages = long builds'],
        ['<b>ISR</b>', 'at build time, then regenerated in the background after N seconds or on demand', 'Server, served from cache/CDN', 'Product pages, news, catalogs: big, mostly-static, sometimes changing', 'Briefly stale content; first request after expiry still sees old page']
      ])}
      <p>🔵 <b>The numbers that make them different.</b> Three moments matter:</p>
      <ul>
        <li><b>TTFB</b> (time to first byte): how long until the first byte of the response arrives.</li>
        <li><b>FCP / LCP</b> (first / largest contentful paint): when the user sees real content.</li>
        <li><b>TTI</b> (time to interactive, the idea behind today's INP and Total Blocking Time): when clicking actually works.</li>
      </ul>
      ${H.table(['', 'TTFB', 'Content visible', 'Interactive', 'Why'], [
        ['CSR', '<span class="c-g">fast</span>', '<span class="c-r">late</span>', '<span class="c-y">same time as content</span>', 'nothing to show until JS + API call finish'],
        ['SSR', '<span class="c-r">slow</span>', '<span class="c-g">early</span>', '<span class="c-y">later (hydration gap)</span>', 'server waits for data first; page looks ready before it works'],
        ['SSG / ISR', '<span class="c-g">fastest</span>', '<span class="c-g">earliest</span>', '<span class="c-y">after hydration</span>', 'file is already built; CDN just hands it over']
      ])}
      <p>🔵 <b>How this looks in the Next.js App Router.</b> You mostly do <b>not</b> pick a strategy by name. Next.js looks at your code:</p>
      <ul>
        <li>A route with no dynamic inputs is <b>static</b> (SSG) by default, built once. Dynamic routes like <code>/blog/[slug]</code> are pre-built for the slugs returned by <code>generateStaticParams()</code>.</li>
        <li>Add <code>export const revalidate = 60</code> (or fetch with <code>next: { revalidate: 60 }</code>) and the static page becomes <b>ISR</b>: after 60 seconds the next visit still gets the cached page, and triggers a rebuild in the background (stale-while-revalidate).</li>
        <li>Using request-time things like <code>cookies()</code>, <code>headers()</code>, <code>searchParams</code>, uncached <code>fetch</code>, or <code>export const dynamic = 'force-dynamic'</code> makes the route <b>dynamic</b> (SSR).</li>
        <li>A Client Component that fetches in <code>useEffect</code> (or React Query/SWR) is <b>CSR</b> for that part. The surrounding page can still be static or server-rendered.</li>
        <li><b>On-demand</b> ISR: call <code>revalidatePath('/blog/hello')</code> or <code>revalidateTag('posts')</code> from a Server Action or webhook when content changes, instead of waiting for a timer.</li>
      </ul>
      <p>🔵 <b>Mixing is the point.</b> One page can be a static shell with a dynamic hole: a product page is cached (ISR) while "price for you" and "stock now" are streamed in (SSR inside a <code>Suspense</code> boundary) or fetched on the client (CSR). Next.js calls the newer, more explicit form of this <b>Partial Prerendering / Cache Components</b>. The best answer in an interview is almost never one strategy; it is "static where I can, dynamic where I must".</p>`,
    clues: [
      '"SEO matters and content rarely changes" → SSG',
      '"Millions of product pages, price changes a few times a day" → ISR (revalidate or on-demand), not a full rebuild',
      '"Personalized, per-user data and it must be crawlable/shareable" → SSR (or static shell + streamed personalized parts)',
      '"Behind login, no SEO, very interactive" → CSR is fine (a dashboard)',
      '"Page looks loaded but buttons do nothing for a second" → SSR/SSG hydration gap (TTI later than FCP)',
      '"Time to first byte is high" → server work before sending HTML (SSR waiting on data): cache, stream, or move to static/ISR'
    ],
    code: [
      {
        lang: 'js', run: true, title: 'Model: when does the user see content? (TTFB / FCP / TTI)',
        code: `// A rough timing model. All numbers are milliseconds.
const NET = 50; // one network round trip

function times(strategy, { dataMs, jsMs, hydrateMs }) {
  if (strategy === 'CSR') {
    const ttfb = NET + 20;                       // tiny HTML shell from a CDN
    const content = ttfb + jsMs + NET + dataMs;  // load JS, then call the API, then render
    return { ttfb, content, tti: content };      // interactive as soon as it renders
  }
  if (strategy === 'SSR') {
    const ttfb = NET + dataMs + 20;              // the server waits for the data
    const content = ttfb + 30;                   // HTML already contains the page
    const tti = Math.max(content, ttfb + jsMs) + hydrateMs; // JS loads in parallel, then hydrate
    return { ttfb, content, tti };
  }
  // SSG and ISR (cache hit): the HTML file already exists
  const ttfb = NET + 5;
  const content = ttfb + 30;
  const tti = Math.max(content, ttfb + jsMs) + hydrateMs;
  return { ttfb, content, tti };
}

const page = { dataMs: 300, jsMs: 800, hydrateMs: 200 };
for (const s of ['CSR', 'SSR', 'SSG']) {
  const t = times(s, page);
  console.log(s.padEnd(4), 'TTFB', String(t.ttfb).padStart(5), '| content', String(t.content).padStart(5), '| interactive', String(t.tti).padStart(5));
}
// CSR: fast first byte, slow content. SSR: slow first byte, early content, later interactive.
// SSG: best of both, but the page is only as fresh as the last build.`
      },
      {
        lang: 'js', run: true, title: 'Model: ISR is stale-while-revalidate',
        code: `// Which version of the page does each visitor see?
// revalidate = seconds before a cached page counts as stale
// regenTime  = seconds the background rebuild takes
function isr(revalidate, regenTime, requestTimes) {
  let version = 1, generatedAt = 0;           // built at deploy time (t = 0)
  let regenDoneAt = null, nextVersion = null; // a background rebuild in flight
  return requestTimes.map((t) => {
    // has the background rebuild finished by now? swap it into the cache
    if (regenDoneAt !== null && t >= regenDoneAt) {
      version = nextVersion; generatedAt = regenDoneAt; regenDoneAt = null;
    }
    const age = t - generatedAt;
    let note = 'fresh, served from cache';
    if (age >= revalidate) {
      note = 'STALE page served instantly';
      if (regenDoneAt === null) {                // first visitor after expiry starts the rebuild
        regenDoneAt = t + regenTime; nextVersion = version + 1;
        note += ' + rebuild started (ready at t=' + regenDoneAt + ')';
      }
    }
    return 't=' + String(t).padStart(3) + '  sees v' + version + '  (age ' + age + 's)  ' + note;
  });
}

isr(60, 2, [10, 50, 70, 71, 75, 140, 200]).forEach((line) => console.log(line));
// Nobody ever waits for the rebuild; one unlucky visitor (t=70) sees the old page.` },
      {
        lang: 'jsx', check: false, title: 'Next.js App Router: SSG, ISR, SSR, CSR side by side',
        code: `// ---------- SSG: static by default, params pre-built at build time ----------
// app/blog/[slug]/page.js
export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((p) => ({ slug: p.slug }));      // /blog/hello, /blog/world...
}
export default async function Post({ params }) {
  const { slug } = await params;
  const post = await getPost(slug);                 // runs at build time
  return <article><h1>{post.title}</h1></article>;
}

// ---------- ISR: same page, but regenerate in the background ----------
export const revalidate = 60;                       // seconds (route-level)
// or per request:  fetch(url, { next: { revalidate: 60, tags: ['posts'] } })

// on-demand: call after editing content in a CMS (Server Action or route handler)
'use server';
import { revalidatePath, revalidateTag } from 'next/cache';
export async function publish(slug) {
  await savePost(slug);
  revalidatePath('/blog/' + slug);                  // rebuild just this page
  revalidateTag('posts');                           // or everything tagged "posts"
}

// ---------- SSR: depends on the request, so render per request ----------
// app/search/page.js
export default async function Search({ searchParams }) {
  const { q } = await searchParams;                 // request-time input => dynamic
  const results = await searchProducts(q);
  return <ResultList results={results} />;
}
// or force it:   export const dynamic = 'force-dynamic';

// ---------- CSR: a Client Component fetching after load ----------
// app/dashboard/Stats.js
'use client';
import useSWR from 'swr';
export default function Stats() {
  const { data, isLoading } = useSWR('/api/stats', fetcher);   // runs in the browser
  return isLoading ? <p>Loading...</p> : <Chart data={data} />;
}

// ---------- Streaming: static shell, dynamic part arrives later ----------
import { Suspense } from 'react';
export default function Product({ params }) {
  return (
    <>
      <ProductInfo params={params} />                      {/* cached / static */}
      <Suspense fallback={<p>Checking stock...</p>}>
        <LiveStock params={params} />                      {/* dynamic, streamed in */}
      </Suspense>
    </>
  );
}` }
    ],
    codeTitle: ['Plain-JS model: TTFB, content and TTI per strategy', 'Plain-JS model: ISR stale-while-revalidate', 'Next.js: all four strategies in code'],
    viz: [
      {
        title: 'Rendering strategy timelines: TTFB vs content vs interactive',
        input: '300 800 200',
        inputLabel: 'dataMs (API/DB time)  jsMs (download+parse JS)  hydrateMs',
        gen: function (input) {
          var hint = 'Format: dataMs jsMs hydrateMs, for example  300 800 200';
          var n = String(input).trim().split(/[\s,]+/).map(Number);
          if (n.length !== 3 || n.some(function (x) { return isNaN(x) || x < 0 || x > 5000; })) throw new Error(hint);
          var d = n[0], j = n[1], hy = n[2];
          var frames = [], all = {}, names = ['CSR', 'SSR', 'SSG'];
          frames.push({ narr: 'Same page, same network: data takes <b>' + d + ' ms</b>, JS takes <b>' + j + ' ms</b> to load, hydration takes <b>' + hy + ' ms</b>. We measure three moments: <b>TTFB</b> (first byte), <b>content</b> (user sees the page), <b>TTI</b> (clicks work).', parts: [
            { type: 'table', label: 'Strategies', columns: ['strategy', 'HTML is created', 'by whom'], rows: [['CSR', 'after JS runs', 'browser'], ['SSR', 'on every request', 'server'], ['SSG', 'once at build', 'build machine'], ['ISR', 'at build + refreshed later', 'server in background']], hl: {} }
          ] });
          names.forEach(function (nm) {
            var t = strategyTimes(nm, d, j, hy); all[nm] = t;
            var hlb = { 0: 'win', 1: 'ok', 2: 'sel' };
            frames.push({ narr: '<b>' + nm + '</b>: ' + ({
              CSR: 'the first byte is quick, but the page is empty until the JS has loaded <i>and</i> the API call has returned. Content and interactivity arrive together, late.',
              SSR: 'the server must fetch the data before it can send anything, so the first byte is slow. But when HTML arrives it already contains the page, so content shows quickly. Buttons work only after JS loads and hydrates.',
              SSG: 'no work happens at request time: a CDN returns a file that already exists. First byte and content are the fastest possible. Only hydration remains before clicks work.'
            })[nm], parts: [
              { type: 'bars', label: nm + ' (milliseconds)', values: [t.ttfb, t.fcp, t.tti], idxLabels: ['TTFB', 'content visible', 'interactive'], hl: hlb },
              { type: 'table', label: 'Timeline', columns: ['at (ms)', 'what happens'], rows: t.steps.map(function (s) { return [s[0], s[1]]; }), hl: {} }
            ] });
          });
          frames.push({ narr: '<b>ISR</b> is SSG with a refresh timer. A visitor who hits a cached page gets exactly the SSG numbers. Only the page <i>content</i> can be a little old (at most "revalidate" seconds plus rebuild time). Compare when users <b>see</b> the page:', parts: [
            { type: 'bars', label: 'time until content is visible (ms)', values: [all.CSR.fcp, all.SSR.fcp, all.SSG.fcp, all.SSG.fcp], idxLabels: ['CSR', 'SSR', 'SSG', 'ISR (cache hit)'], hl: { 0: 'bad', 1: 'cur', 2: 'ok', 3: 'ok' } },
            { type: 'bars', label: 'time until interactive (ms)', values: [all.CSR.tti, all.SSR.tti, all.SSG.tti, all.SSG.tti], idxLabels: ['CSR', 'SSR', 'SSG', 'ISR (cache hit)'], hl: { 0: 'bad', 1: 'cur', 2: 'ok', 3: 'ok' } }
          ] });
          frames.push({ narr: 'Take-away: change the inputs. Make <b>dataMs</b> bigger and SSR gets slower to first byte while SSG does not change. Make <b>jsMs</b> bigger and CSR suffers most, because it cannot show anything until JS is ready. Static wins on speed, dynamic wins on freshness and personalization.', parts: [
            { type: 'table', label: 'Summary (ms)', columns: ['strategy', 'TTFB', 'content', 'interactive'], rows: names.map(function (nm) { return [nm, all[nm].ttfb, all[nm].fcp, all[nm].tti]; }), hl: {} }
          ] });
          return frames;
        }
      },
      {
        title: 'ISR in action: who sees which version?',
        input: '60 2 10 50 70 71 75 140',
        inputLabel: 'revalidate(s)  rebuildTime(s)  then request times in seconds (increasing, max 10)',
        gen: function (input) {
          var hint = 'Format: revalidate rebuildTime t1 t2 t3 ...   for example  60 2 10 50 70 71 75 140';
          var n = String(input).trim().split(/[\s,]+/).map(Number);
          if (n.length < 5 || n.some(isNaN) || n.length > 12) throw new Error(hint);
          var rev = n[0], regen = n[1], reqs = n.slice(2);
          for (var q = 1; q < reqs.length; q++) if (reqs[q] < reqs[q - 1]) throw new Error('Request times must increase. ' + hint);
          var version = 1, gen = 0, done = null, next = null, rows = [], frames = [];
          frames.push({ narr: 'The site is built at <b>t = 0</b> (page version v1). We set <code>revalidate = ' + rev + '</code>: a page older than ' + rev + ' s is <b>stale</b>. A rebuild takes ' + regen + ' s. Visitors arrive at the times you typed.', parts: [
            { type: 'vars', label: 'cache', vals: { 'cached version': 'v1', 'built at': 0, revalidate: rev } },
            { type: 'table', label: 'Requests', columns: ['time (s)', 'cache age (s)', 'visitor sees', 'what happens'], rows: [['-', '-', '-', '-']], hl: {} }
          ] });
          reqs.forEach(function (t) {
            var swapped = false;
            if (done !== null && t >= done) { version = next; gen = done; done = null; swapped = true; }
            var age = t - gen, note, cls = 'ok', started = false;
            if (age >= rev) {
              cls = 'bad'; note = 'page is stale, but it is still served instantly';
              if (done === null) { done = t + regen; next = version + 1; started = true; note += '; <b>this visit starts the rebuild</b> (v' + next + ' ready at ' + done + ' s)'; }
              else note += '; a rebuild is already running';
            } else note = 'fresh page from cache' + (swapped ? ' (the new v' + version + ' was swapped in just before)' : '');
            rows.push([t, age, 'v' + version, note]);
            var hl = {}; hl[rows.length - 1] = cls === 'bad' ? 'bad' : 'ok';
            frames.push({ narr: 'Request at <b>t=' + t + ' s</b>: the cached page is <b>' + age + ' s</b> old. ' + note + '.', parts: [
              { type: 'vars', label: 'cache', vals: { 'cached version': 'v' + version, 'built at': gen, 'rebuild running': done === null ? 'no' : 'until ' + done + ' s' }, hl: { 'cached version': swapped ? 'ok' : '' } },
              { type: 'table', label: 'Requests', columns: ['time (s)', 'cache age (s)', 'visitor sees', 'what happens'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }
            ] });
          });
          frames.push({ narr: 'No visitor ever waited for a rebuild: stale-while-revalidate trades <b>a little freshness</b> for <b>always-fast responses</b>. If you need the change to appear <i>now</i> (a price fix), call <code>revalidatePath</code> or <code>revalidateTag</code> on demand.', parts: [
            { type: 'table', label: 'Requests', columns: ['time (s)', 'cache age (s)', 'visitor sees', 'what happens'], rows: rows.map(function (r) { return r.slice(); }), hl: {} }
          ] });
          return frames;
        }
      },
      {
        title: 'Pick the strategy: questions to ask',
        input: 'blog, product, dashboard, search, news',
        inputLabel: 'Pages to classify (blog, docs, marketing, product, dashboard, feed, search, checkout, news, profile)',
        gen: function (input) {
          var info = {
            blog: ['no', 'rarely (days)', 'yes', 'SSG', 'Same for everyone, changes only when you publish, needs SEO: build it once and serve from a CDN.'],
            docs: ['no', 'rarely (days)', 'yes', 'SSG', 'Static text for everyone and great SEO needed: pre-build every page.'],
            marketing: ['no', 'rarely (days)', 'yes', 'SSG', 'Fastest first paint matters for conversion, content changes with deploys.'],
            product: ['no', 'sometimes (minutes-hours)', 'yes', 'ISR', 'Thousands of pages that change now and then: serve cached, refresh in background, revalidate on demand when price changes.'],
            news: ['no', 'often (minutes)', 'yes', 'ISR', 'Fresh within a minute is fine for everyone: revalidate = 60 keeps it fast and almost live.'],
            dashboard: ['yes', 'constantly', 'no', 'CSR', 'Behind login, per-user, no SEO needed, very interactive: ship the app and fetch data in the browser (or stream from the server).'],
            feed: ['yes', 'constantly', 'yes', 'SSR', 'Personalized but should be fast to first paint and crawlable: render per request, stream parts with Suspense.'],
            search: ['no', 'per query', 'yes', 'SSR', 'The result depends on the query string, so it cannot be pre-built for every query: render per request (and cache hot queries).'],
            checkout: ['yes', 'constantly', 'no', 'SSR', 'Per-user and security sensitive; render on the server so sensitive logic and cookies stay there (CSR also works for the interactive form).'],
            profile: ['yes', 'sometimes', 'no', 'CSR', 'Per-user page behind login with no SEO need: a client-fetched or server-streamed page both fit.']
          };
          var list = String(input).split(/[\s,]+/).map(function (s) { return s.toLowerCase(); }).filter(Boolean);
          if (!list.length || list.length > 8 || list.some(function (s) { return !info[s]; })) throw new Error('Use up to 8 of: blog, docs, marketing, product, dashboard, feed, search, checkout, news, profile');
          var frames = [], summary = [];
          frames.push({ narr: 'Three questions decide most cases: <b>Is it different for each user? How often does the content change? Does it need SEO / link previews?</b> Let us ask them for each page.', parts: [{ type: 'table', label: 'Decision rules', columns: ['personalized?', 'changes often?', 'verdict'], rows: [['yes, no SEO', 'any', 'CSR'], ['yes, needs SEO', 'any', 'SSR (+ streaming)'], ['no', 'rarely (days)', 'SSG'], ['no', 'minutes to hours', 'ISR'], ['no', 'every second / per query', 'SSR']], hl: {} }] });
          list.forEach(function (p) {
            var r = info[p]; summary.push([p, r[3]]);
            var v = { SSG: 'ok', ISR: 'win', SSR: 'cur', CSR: 'sel' }[r[3]];
            frames.push({ narr: '<b>' + p + '</b>: ' + r[4] + ' Verdict: <b>' + r[3] + '</b>.', parts: [
              { type: 'table', label: 'Page: ' + p, columns: ['question', 'answer'], rows: [['Different for each user?', r[0]], ['How often does it change?', r[1]], ['Needs SEO / link previews?', r[2]], ['<b>Strategy</b>', '<b>' + r[3] + '</b>']], hl: (function () { var o = {}; o[3] = v; return o; })() }
            ] });
          });
          frames.push({ narr: 'Summary of your pages. Real apps mix strategies: a product page can be ISR with a small CSR or streamed SSR part for stock and personalized price.', parts: [{ type: 'table', label: 'Your pages', columns: ['page', 'strategy'], rows: summary, hl: {} }] });
          return pad4(frames);
        }
      }
    ],
    examples: [
      {
        title: 'E-commerce product page: ISR plus a live part',
        html: `<p>An online store has 2 million product pages. Building them all on every deploy is impossible (SSG), and rendering each on demand for every visitor is expensive and slow (SSR). Use <b>ISR</b>: pre-build the top few thousand, generate the rest on first visit, cache them, and refresh with <code>revalidate = 300</code>. When a merchant edits a price, call <code>revalidateTag('product-42')</code> so the page updates within seconds. The truly live bits ("only 3 left", "price for you") are a small <code>&lt;Suspense&gt;</code> streamed part or a client fetch, so the cached shell stays cacheable.</p>`
      },
      {
        title: 'Analytics dashboard: CSR is fine',
        html: `<p>A logged-in dashboard shows charts with data different for every user, refreshing every 10 seconds. Search engines will never see it (it's behind login) and there is no first-visit marketing pressure. A single-page app (or a Next.js page with Client Components using SWR/React Query) is perfectly good: the shell loads once, then data streams in and updates are cheap. Spending server resources on SSR for a page nobody crawls and that updates every 10 s buys little. Add a skeleton so the user sees structure while the first data loads.</p>`
      },
      {
        title: 'Search results: SSR, with a cache hint',
        html: `<p>The page for <code>/search?q=laptop</code> depends on the query, so it can't be pre-built for every possible query. Render it per request (SSR) so the HTML contains the results (good for SEO and fast first paint). Reduce the cost: cache the query result for 60 s in your data layer, put a CDN with <code>Cache-Control: s-maxage=60, stale-while-revalidate=300</code> in front for popular queries, and stream the filter sidebar and recommendations behind <code>Suspense</code>.</p>`
      },
      {
        title: 'The hydration gap on a marketing page',
        html: `<p>A static landing page scores a great LCP, but users report that the "Get started" button sometimes does nothing in the first second on slow phones. That is the <b>hydration gap</b>: the HTML is painted (looks ready) but the 400 kB bundle has not finished hydrating (not yet working). Fixes: ship less JS (Server Components, lazy-load below-the-fold widgets), make that button a plain <code>&lt;a href&gt;</code> that works without JS, and use selective hydration so the hero hydrates first. Measure with INP, not just LCP.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>Build-time vs request-time vs revalidate-time.</b> Think of three clocks. SSG uses the <b>build clock</b>. SSR uses the <b>request clock</b>. ISR adds a <b>revalidate clock</b>. In ISR, Next.js stores each page's HTML and RSC payload in a cache with a timestamp. Past the revalidate window, the next request is served from cache <i>and</i> kicks off one regeneration (deduplicated across all requests). The new result replaces the entry only after it succeeds, so a failing rebuild keeps serving the last good page. Self-hosting multiple instances needs a shared cache handler, otherwise each instance has its own cache and own idea of "fresh".</p>
      <p><b>Dynamic params and fallbacks.</b> With <code>generateStaticParams</code>, paths not returned at build time are by default rendered on first request and then cached (<code>dynamicParams = true</code>); set it to <code>false</code> to return 404 for unknown slugs. In the old Pages Router the equivalents are <code>getStaticProps</code> (+ <code>revalidate</code>), <code>getStaticPaths</code> with <code>fallback</code> (<code>false</code> / <code>'blocking'</code> / <code>true</code>), and <code>getServerSideProps</code>. Interviewers still ask about both.</p>
      <p><b>Streaming SSR.</b> Classic SSR renders the whole page, then sends it. Streaming SSR (<code>renderToPipeableStream</code> / <code>renderToReadableStream</code>) sends the HTML shell first and flushes <code>Suspense</code> boundaries as their data resolves. TTFB improves because the server can respond as soon as the shell is ready, and slow queries no longer hold up the whole page. Each late chunk comes with a tiny inline script that swaps the fallback for the real HTML, then hydration picks it up.</p>
      <p><b>Partial Prerendering (PPR) / Cache Components.</b> The newer model prerenders a static shell at build time and leaves marked dynamic holes (usually <code>Suspense</code> boundaries around code that reads cookies, headers or uncached data). The shell comes from the CDN instantly; the holes stream from the server in the same response. In Next.js 16 this is expressed with Cache Components and the <code>'use cache'</code> directive, where you opt specific data/components into caching rather than opting out of it. Behaviour of defaults differs by version, so always check the docs for yours.</p>
      <p><b>Other levers.</b> Edge rendering (SSR on CDN nodes near the user) cuts latency but limits the runtime and database access (use edge-friendly drivers or caches). CDN caching of SSR output via <code>s-maxage</code>/<code>stale-while-revalidate</code> turns SSR into "ISR by hand". <b>Islands architecture</b> (Astro) and <b>resumability</b> (Qwik) attack the hydration gap by hydrating less or nothing.</p>
      <p><b>Edge cases and traps.</b> (1) Reading <code>cookies()</code> anywhere in a static page silently turns the entire route dynamic. (2) Personalization inside an ISR page leaks one user's data to others if you cache it: personalize on the client or in a dynamic hole. (3) ISR with <code>revalidate</code> shorter than the rebuild time wastes CPU. (4) Build times grow with SSG page count; ISR or on-demand generation fixes that. (5) Measure with real-user data (CrUX, RUM), not only Lighthouse, because TTFB and hydration depend heavily on the device and network.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-generated apps often default to "everything client-side" (<code>useEffect</code> + <code>fetch</code>), which is CSR with all its SEO and first-paint weaknesses, because that's what most training code looks like. Conversely, AI chat products show the opposite case: the conversation page is per-user and interactive (CSR/streamed SSR), while the marketing site and docs are SSG. Knowing which tool fits which page lets you correct an assistant's default.</p>
      <p><b>Use AI as a partner:</b> give it your list of routes and ask <code>For each route choose SSG, ISR, SSR or CSR using: personalization, update frequency, SEO need, traffic. Output a table with the Next.js code switch (revalidate, dynamic, generateStaticParams) for each and the risk.</code> Ask it to review <code>next build</code> output (the table of static / dynamic routes) and explain why a route became dynamic. Have it write a Lighthouse CI budget for TTFB, LCP and INP.</p>
      <p><b>Where AI goes wrong:</b> it mixes Pages Router and App Router APIs, still recommends <code>getServerSideProps</code> in App Router answers, assumes <code>fetch</code> is cached by default (that changed in Next.js 15), caches personalized HTML on a CDN, or recommends SSR "for SEO" when a static page would be faster and cheaper. It also tends to ignore the hydration gap.</p>
      <p><b>What you must still own:</b> the decision per page, with data to back it (TTFB, LCP, INP from real users), cache invalidation strategy, and not leaking per-user data into shared caches. LLM-powered pages (streamed answers) add a new twist: the response is dynamic by nature, so use streaming SSR or route handlers with server-sent events and keep the surrounding shell static.</p>`,
    problems: [
      {
        title: 'Choose the Rendering Strategy',
        level: 'Easy', tags: ['ssr', 'ssg', 'isr', 'csr', 'next.js'], companies: ['Vercel', 'Walmart', 'Myntra'],
        statement: `<p>Write <code>chooseStrategy(page)</code> where <code>page</code> is <code>{ personalized: boolean, seo: boolean, changeSeconds: number | null }</code> (<code>changeSeconds</code> is how often the content changes; <code>null</code> means "only when we deploy"). Return one of <code>'CSR'</code>, <code>'SSR'</code>, <code>'SSG'</code>, <code>'ISR'</code> using these rules in order: (1) personalized and no SEO need gives CSR; (2) personalized with SEO need gives SSR; (3) not personalized: <code>null</code> or ≥ 86400 gives SSG, 60 up to 86399 gives ISR, below 60 gives SSR.</p>`,
        constraints: `<code>changeSeconds</code> is null or a positive number. Return exactly one of the four strings.`,
        example: `<p>Blog post: <code>{ personalized: false, seo: true, changeSeconds: null }</code> gives ${H.c('g', 'SSG')}. News homepage: <code>{ false, true, 120 }</code> gives ${H.c('b', 'ISR')}. Admin dashboard: <code>{ true, false, 5 }</code> gives ${H.c('p', 'CSR')}. Search results: <code>{ false, true, 5 }</code> gives ${H.c('y', 'SSR')} because it changes too fast to cache.</p>`,
        brute: { why: `<p>The lazy answer is "always SSR, it is the most flexible". It works, but every page then pays server time on every request, the blog gets slower than a static file would be, and traffic spikes cost money. The point of the question is to match the strategy to how often content changes and who it is for.</p>`,
          code: `function chooseStrategyBrute(page) {
  return 'SSR'; // always render on the server: correct everywhere, optimal almost nowhere
}` },
        mcq: { q: 'A product page changes price a few times a day and has 500,000 URLs. Best fit?', options: ['SSG with a full rebuild on every price change', 'ISR with on-demand revalidation', 'CSR only'], answer: 1, explain: 'ISR avoids huge rebuilds, keeps pages fast from cache, and on-demand revalidation updates a page right after a price change.' },
        hints: [
          `<p>Hint 1: two yes/no questions come first: is it personalized, and does it need SEO? They settle personalized pages immediately.</p>`,
          `<p>Hint 2: for non-personalized pages only the update frequency matters: very rare, medium, or fast.</p>`,
          `<p>Hint 3: handle <code>null</code> before comparing numbers. Recipe: if personalized return seo ? 'SSR' : 'CSR'; if changeSeconds === null or ≥ 86400 return 'SSG'; if ≥ 60 return 'ISR'; else 'SSR'.</p>`
        ],
        solution: {
          approach: `<p>Follow the rules top to bottom. Personalization decides first because shared caches (CDN, static files) cannot hold per-user content. Then the update frequency decides how long a cached copy can live: forever (SSG), minutes to hours (ISR), or seconds (not worth caching, so SSR).</p>`,
          code: { lang: 'js', run: true, code: `function chooseStrategy(page) {
  const { personalized, seo, changeSeconds } = page;
  if (personalized) return seo ? 'SSR' : 'CSR';         // per-user content cannot be a shared static file
  if (changeSeconds === null || changeSeconds >= 86400) return 'SSG'; // changes only on deploy / daily
  if (changeSeconds >= 60) return 'ISR';                // cache it, refresh in the background
  return 'SSR';                                         // changes too fast for a cache to help
}

const pages = {
  blog: { personalized: false, seo: true, changeSeconds: null },
  newsHome: { personalized: false, seo: true, changeSeconds: 120 },
  dashboard: { personalized: true, seo: false, changeSeconds: 5 },
  feed: { personalized: true, seo: true, changeSeconds: 30 },
  search: { personalized: false, seo: true, changeSeconds: 5 }
};
for (const [name, p] of Object.entries(pages)) console.log(name.padEnd(10), chooseStrategy(p));` },
          complexity: `<p>O(1). The real work is knowing the inputs; in production also consider traffic, cost and the hybrid options (static shell with a streamed dynamic hole).</p>`,
          followUps: ['How would you extend the function for pages that are mostly static but include a personalized widget?', 'What data would you collect (RUM) to confirm the choice was right?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 7 — Hydration
     ===================================================================== */
  topics.push({
    title: 'Hydration: Waking Up Server-Rendered HTML',
    analogy: `<p>You buy a toy robot that arrives fully assembled and painted, standing in the box. It <b>looks</b> perfect, but its batteries are not in: pressing its buttons does nothing. <b>Hydration</b> is the moment you walk around the robot, find each button, and connect it to a wire and a battery, one part at a time. The robot's body (HTML) was made on the server so you could <i>see</i> it immediately; the wiring (JavaScript) is attached in the browser so it can <i>do</i> things. The rule that makes this possible: the body must match the blueprint you hold. If the factory painted the left arm red but your blueprint says blue, you can't wire it safely and you may have to rebuild the arm (or the whole robot).</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> With SSR or SSG, the server sends <b>real HTML</b>, so the user sees the page quickly. But HTML alone is dead: no buttons work, no state exists. React must run your components <b>again in the browser</b> and connect that result to the HTML that is already there. That step is <b>hydration</b>. In code it is one call:</p>
      ${H.table(['Without server HTML', 'With server HTML'], [
        ['<code>createRoot(el).render(&lt;App /&gt;)</code>: builds the DOM from nothing', '<code>hydrateRoot(el, &lt;App /&gt;)</code>: reuses the DOM that is already there']
      ])}
      <p>🔵 <b>What happens, step by step.</b></p>
      <ol>
        <li><b>Server:</b> renders the components to an HTML string (and sends data/payload React will need).</li>
        <li><b>Browser:</b> paints that HTML immediately. The page is visible but <b>not interactive</b>.</li>
        <li><b>JavaScript downloads and runs.</b> React renders the component tree <b>in memory on the client</b>.</li>
        <li><b>React walks the existing DOM and the new tree side by side</b>, node by node. For each node it checks "is this the element I would have created?" If yes, it <b>adopts</b> that DOM node: links it to its fiber, sets up its event handling and state.</li>
        <li>Page is now <b>interactive</b>. Time from step 2 to step 5 is the "hydration gap".</li>
      </ol>
      <p>🔵 <b>The golden rule: the first client render must produce the same output as the server.</b> React does not re-create the HTML; it trusts it. If the client's first render differs, you get a <b>hydration mismatch</b>:</p>
      ${H.table(['What differs', 'What React 18/19 does', 'User impact'], [
        ['Text content or element structure', 'Throws a (recoverable) error and falls back to <b>client-rendering</b> the nearest Suspense boundary or the whole root', '<span class="c-r">Wasted server HTML, flash, slower page</span>'],
        ['An attribute (class, style, id)', 'Warns in development only. Does <b>not</b> fix it', '<span class="c-r">UI may silently stay wrong</span>'],
        ['Extra tags injected by extensions/third-party scripts', 'React 19 skips unexpected tags in head/body; React 18 warned', 'Usually harmless in 19']
      ])}
      <p>🔵 <b>Typical causes (the detective list).</b> Anything that gives a different answer on the server and in the browser:</p>
      <ul>
        <li><code>Date.now()</code>, <code>new Date().toLocaleString()</code> (different time and time zone)</li>
        <li><code>Math.random()</code>, <code>crypto.randomUUID()</code> used for ids (use <code>useId</code> instead)</li>
        <li><code>typeof window !== 'undefined'</code> or <code>window.innerWidth</code> used while rendering</li>
        <li><code>localStorage</code> / <code>cookies</code> / user agent read during render</li>
        <li>Number/date formatting with the machine's default locale</li>
        <li>Invalid HTML nesting (<code>&lt;p&gt;</code> containing <code>&lt;div&gt;</code>, <code>&lt;a&gt;</code> inside <code>&lt;a&gt;</code>, table rows outside <code>&lt;tbody&gt;</code>): the browser's HTML parser silently rearranges it before React sees it</li>
      </ul>
      <p>🔵 <b>The fixes.</b> Make the first render identical, then add the client-only difference <i>after</i> mount: store it in state set from <code>useEffect</code> (runs only in the browser, after hydration); read browser-only stores with <code>useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)</code>; use <code>useId()</code> for ids; render with fixed locale and timezone; for one harmless text difference (like a timestamp) use <code>suppressHydrationWarning</code>; for widgets that cannot render on the server at all use <code>next/dynamic</code> with <code>ssr: false</code> inside a Client Component.</p>
      <p>🔵 <b>Since React 18: selective hydration.</b> If you wrap parts of the page in <code>&lt;Suspense&gt;</code>, React hydrates them <b>independently and in chunks</b>, without blocking the rest. If the user clicks inside a part that is not hydrated yet, React <b>raises that part's priority</b>, hydrates it first, and then replays the click so it isn't lost. Combined with streaming, a slow component no longer holds back the whole page.</p>`,
    clues: [
      '"Warning: Text content did not match. Server: ... Client: ..." / "Hydration failed because the initial UI does not match"',
      '"Works in dev, flickers or double-renders in production SSR" → output depends on time, random, window or locale',
      '"Page looks ready but clicks do nothing for a moment" → the hydration gap (TTI later than FCP)',
      '"How do I read localStorage / window.innerWidth in an SSR app?" → in useEffect or useSyncExternalStore with a server snapshot, never directly in render',
      '"Generated ids differ between server and client" → useId',
      '"Reduce hydration cost / total blocking time on a content site" → Server Components, lazy hydration with Suspense, ship less JS, islands'
    ],
    code: [
      {
        lang: 'js', run: true, title: 'Model: hydrate walks server HTML and client tree, node by node',
        code: `// DOM nodes are what the server HTML became in the browser.
// Virtual nodes are what the client's first render produced.
const dom = { tag: 'main', kids: [
  { tag: 'h1', text: 'Shop' },
  { tag: 'p',  text: 'Time: 9:41' },
  { tag: 'button', text: 'Buy' }
] };

const makeClientTree = (time) => ({ tag: 'main', kids: [
  { tag: 'h1', text: 'Shop' },
  { tag: 'p', text: 'Time: ' + time },
  { tag: 'button', text: 'Buy', onClick: () => 'bought!' }
] });

function hydrate(domNode, vnode, path, report) {
  // 1) does the existing DOM node look like what React would have made?
  if (domNode.tag !== vnode.tag || (vnode.text !== undefined && domNode.text !== vnode.text)) {
    report.push('MISMATCH at ' + path + ': server has "' + (domNode.text || domNode.tag) + '", client wants "' + (vnode.text || vnode.tag) + '"');
    return false;                                  // real React: fall back to client rendering
  }
  // 2) it matches: adopt it and wire it up (React really uses one delegated root listener)
  if (vnode.onClick) { domNode.onClick = vnode.onClick; report.push('wired   ' + path + ' (<' + vnode.tag + '> is now clickable)'); }
  else report.push('adopted ' + path);
  // 3) continue with the children
  return (vnode.kids || []).every((kid, i) => hydrate(domNode.kids[i], kid, path + '/' + kid.tag, report));
}

console.log('--- client first render uses the SAME time as the server');
let report = [];
console.log(hydrate(dom, makeClientTree('9:41'), 'main', report), '\\n' + report.join('\\n'));

console.log('--- client first render calls new Date() => different text');
report = [];
console.log(hydrate(dom, makeClientTree('9:42'), 'main', report), '\\n' + report.join('\\n'));`
      },
      {
        lang: 'jsx', check: false, title: 'Real fixes for hydration mismatches',
        code: `import { useEffect, useId, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';

// BUG 1: server and browser clocks/time zones differ.
function ClockBad() {
  return <p>{new Date().toLocaleTimeString()}</p>;
}
// FIX 1a: same first render, real time after mount.
function Clock() {
  const [now, setNow] = useState(null);
  useEffect(() => { setNow(new Date()); }, []);     // runs only in the browser
  return <p>{now ? now.toLocaleTimeString('en-US', { timeZone: 'UTC' }) : '--:--'}</p>;
}
// FIX 1b: one harmless text difference you accept (only one level deep).
function ClockLoose() {
  return <p suppressHydrationWarning>{new Date().toLocaleTimeString()}</p>;
}

// BUG 2: random ids differ between server and client.
function FieldBad() {
  const id = 'f' + Math.random();
  return <><label htmlFor={id}>Name</label><input id={id} /></>;
}
// FIX 2: useId is stable across server and client.
function Field() {
  const id = useId();
  return <><label htmlFor={id}>Name</label><input id={id} /></>;
}

// BUG 3: window does not exist on the server, so branches differ.
function NavBad() {
  return typeof window !== 'undefined' && window.innerWidth < 600 ? <MobileNav /> : <DesktopNav />;
}
// FIX 3: subscribe with a server snapshot (what the server and first client render both use).
function useIsNarrow() {
  return useSyncExternalStore(
    (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb); },
    () => window.innerWidth < 600,   // client snapshot
    () => false                      // server snapshot (also used during hydration)
  );
}

// BUG 4: a widget that cannot run on the server (touches window at import time).
// FIX 4: skip SSR for it (must be inside a Client Component in Next.js 15+).
const Map = dynamic(() => import('./Map'), { ssr: false, loading: () => <p>Loading map</p> });` }
    ],
    codeTitle: ['Plain-JS model: hydrate and mismatch detection', 'React: fixing the classic mismatches'],
    viz: [
      {
        title: 'Hydration walks the tree and wires each node',
        input: 'App,Header,Main,Logo,Nav*,Feed,Buy*',
        inputLabel: 'Component tree (level order; add * to nodes that have an onClick; _ = empty; names up to 5 letters)',
        gen: function (input) {
          var hint = 'Example: App,Header,Main,Logo,Nav*,Feed,Buy*   (* = has an event handler)';
          var raw = parseTree(input, hint), names = [], inter = [], i, total = 0, clicks = 0;
          raw.forEach(function (s) { names.push(s === null ? null : s.replace('*', '')); inter.push(s !== null && s.indexOf('*') >= 0); if (s !== null) { total++; if (s.indexOf('*') >= 0) clicks++; } });
          var hl = {}, tags = {}, done = 0, live = 0, frames = [];
          for (i = 0; i < names.length; i++) if (names[i] !== null) hl[i] = 'done';
          function parts() {
            return [
              { type: 'tree', label: 'DOM from the server (faded = inert HTML, green = hydrated)', arr: names, hl: cp(hl), tags: cp(tags) },
              { type: 'vars', vals: { 'nodes hydrated': done + ' / ' + total, 'handlers wired (clicks work)': live + ' / ' + clicks }, hl: done === total ? { 'nodes hydrated': 'ok' } : {} }
            ];
          }
          frames.push({ narr: 'The browser has painted the <b>server HTML</b>. Everything is visible, but nothing is wired up: <b>' + clicks + '</b> element(s) with a click handler would do nothing if you pressed them now. JavaScript is still downloading.', parts: parts() });
          frames.push({ narr: 'The JS is ready. <code>hydrateRoot</code> renders your components <b>in memory</b> and will now walk that new tree together with the existing DOM, from the root, in order.', parts: parts() });
          function visit(idx) {
            if (!has(names, idx)) return;
            hl[idx] = 'cur';
            frames.push({ narr: 'Visiting <b>' + names[idx] + '</b>: React asks "is the DOM node here the same kind of element, with the same text, that I would have created?"', parts: parts() });
            hl[idx] = 'ok'; done++;
            if (inter[idx]) { live++; tags[idx] = 'wired'; }
            frames.push({ narr: 'Match! React <b>adopts</b> the existing node for <b>' + names[idx] + '</b> (no new DOM is created). ' + (inter[idx] ? 'It has an <code>onClick</code>, so React makes this element respond to clicks now. <span class="c-g">Clicking it works from this moment.</span>' : 'It has no handler, so adopting it just links it to its fiber so future updates can patch it.'), parts: parts() });
            visit(2 * idx + 1);
            visit(2 * idx + 2);
          }
          visit(0);
          frames.push({ narr: 'Every node has been adopted. The page is fully <b>interactive</b>. The time between "page visible" and now is the <b>hydration gap</b>. With Suspense boundaries React 18 can do this in separate chunks and hydrate first whatever the user taps.', parts: parts() });
          return pad4(frames);
        }
      },
      {
        title: 'Server HTML vs client first render: spot the mismatch',
        input: 'div,h1,p,Hi,_,9:41,_ | div,h1,p,Hi,_,9:42,_',
        inputLabel: 'Server tree | Client first-render tree (level order, _ = empty, max 15 slots)',
        gen: function (input) {
          var hint = 'Format: server | client, for example  div,h1,p,Hi,_,9:41,_ | div,h1,p,Hi,_,9:42,_';
          var parts = String(input).split('|');
          if (parts.length !== 2) throw new Error(hint);
          var S = parseTree(parts[0], hint), C = parseTree(parts[1], hint);
          var hlS = {}, hlC = {}, frames = [], bad = null;
          function snap(narr, cur, extra) {
            var tg = {}; if (cur !== undefined) tg[cur] = 'here';
            var p = [
              { type: 'tree', label: 'SERVER HTML (what the browser already has)', arr: S, hl: cp(hlS), tags: tg },
              { type: 'tree', label: 'CLIENT first render (what React would build now)', arr: C, hl: cp(hlC), tags: tg }
            ];
            if (extra) p.push(extra);
            frames.push({ narr: narr, parts: p });
          }
          snap('React wants to <b>reuse</b> the server HTML, so it compares it to the tree the client just rendered, node by node. Same everywhere? Then hydration is cheap. Different anywhere? Trouble.');
          function walk(i) {
            if (bad !== null) return;
            var s = has(S, i) ? S[i] : null, c = has(C, i) ? C[i] : null;
            if (s === null && c === null) return;
            if (s !== c) {
              bad = i; hlS[i] = 'bad'; hlC[i] = 'bad';
              snap('<span class="c-r">Mismatch at spot ' + i + '</span>: the server HTML has <b>' + (s === null ? 'nothing' : s) + '</b> but the client wants <b>' + (c === null ? 'nothing' : c) + '</b>. React cannot safely adopt this. This is the hydration error you see in the console.', i);
              return;
            }
            hlS[i] = 'ok'; hlC[i] = 'ok';
            snap('Spot ' + i + ': <b>' + s + '</b> equals <b>' + c + '</b>. Adopt it.', i);
            walk(2 * i + 1); walk(2 * i + 2);
          }
          walk(0);
          if (bad === null) {
            snap('No differences anywhere: <span class="c-g">hydration succeeds</span> and React keeps all the server HTML. This is the goal.');
          } else {
            var all = {}; markSub(all, C, 0, 'sel');
            snap('Recovery: because the mismatch is in text/structure, React 18/19 <b>throws away the server HTML</b> for the nearest Suspense boundary (here the whole root, since there is no boundary) and renders it again from scratch on the client. The page still works, but you lost the benefit of SSR and pay for the work twice.', bad, { type: 'table', label: 'What to do', columns: ['symptom', 'likely cause', 'fix'], rows: [['one text differs', 'time, random, locale, user data', 'render it after mount (useEffect) or use a fixed format'], ['structure differs', 'branch on window / invalid nesting', 'same first render; fix HTML nesting'], ['only an attribute differs', 'generated id, class from window', 'useId, same first render'] ], hl: {} });
            hlC = all;
            snap('After recovery the client tree is fully client-rendered (purple). It is correct, just slower than a successful hydration. Fix the cause and the console warning disappears.', undefined);
          }
          return pad4(frames);
        }
      },
      {
        title: 'Hydration mismatch detective (cause, symptom, fix)',
        input: 'time',
        inputLabel: 'Cause: time, random, window, locale, nesting, storage',
        gen: function (input) {
          var cases = {
            time: { bug: 'function Clock() {\n  return <p>{new Date().toLocaleTimeString()}</p>;\n}', srv: '<p>9:41:03 AM</p>  (server in UTC, rendered at 09:41)', cli: '<p>3:11:04 PM</p>  (browser in India, 1 second later)', fix: 'function Clock() {\n  const [now, setNow] = useState(null);\n  useEffect(() => setNow(new Date()), []);\n  return <p>{now ? now.toLocaleTimeString() : "--:--"}</p>;\n}', why: 'The server and the browser disagree about the time and time zone. Render a placeholder first, then the real value after mount.' },
            random: { bug: 'function Field() {\n  const id = "f" + Math.random();\n  return <input id={id} />;\n}', srv: '<input id="f0.7123">', cli: '<input id="f0.1987">', fix: 'function Field() {\n  const id = useId();\n  return <input id={id} />;\n}', why: 'Random values differ on every run. useId derives a stable id from the tree position, identical on server and client.' },
            window: { bug: 'function Nav() {\n  const wide = typeof window !== "undefined" && window.innerWidth > 800;\n  return wide ? <DesktopNav /> : <MobileNav />;\n}', srv: '<MobileNav> (window does not exist, so wide = false)', cli: '<DesktopNav> (window.innerWidth is 1200)', fix: 'function useWide() {\n  return useSyncExternalStore(subscribeResize, () => window.innerWidth > 800, () => false);\n}\nfunction Nav() { return useWide() ? <DesktopNav /> : <MobileNav />; }', why: 'Branching on window gives different trees. A server snapshot makes the first client render match the server; the real value follows right after. Often a CSS media query is even simpler.' },
            locale: { bug: 'function Price({ value }) {\n  return <p>{value.toLocaleString()}</p>;\n}', srv: '<p>1,234.5</p>  (server locale en-US)', cli: '<p>1.234,5</p>  (browser locale de-DE)', fix: 'function Price({ value }) {\n  return <p>{value.toLocaleString("en-US")}</p>;\n}', why: 'The default locale comes from the machine. Always pass an explicit locale (and time zone) when formatting during render.' },
            nesting: { bug: 'function Card() {\n  return <p><div>Hello</div></p>;\n}', srv: '<p></p><div>Hello</div><p></p>  (the HTML parser closes the p early)', cli: '<p><div>Hello</div></p>  (React expects div inside p)', fix: 'function Card() {\n  return <div><div>Hello</div></div>;\n}', why: 'Browsers repair invalid HTML before React sees it, so the DOM no longer matches the tree. Use valid nesting (p cannot contain div, a cannot contain a, tr needs tbody).' },
            storage: { bug: 'function Theme() {\n  const t = localStorage.getItem("theme") || "light";\n  return <body className={t} />;\n}', srv: 'ReferenceError: localStorage is not defined (or the default "light")', cli: 'class="dark" (read from the browser)', fix: 'function Theme() {\n  const [t, setT] = useState("light");\n  useEffect(() => setT(localStorage.getItem("theme") || "light"), []);\n  return <div className={t} />;\n}', why: 'Browser storage only exists in the browser. Read it in an effect (or store the choice in a cookie so the server can render it correctly the first time).' }
          };
          var key = String(input).trim().toLowerCase();
          var c = cases[key];
          if (!c) throw new Error('Choose one of: time, random, window, locale, nesting, storage');
          return [
            { narr: 'The component below looks innocent. Let us see what the server and the browser each produce for it.', parts: [{ type: 'code', label: 'component (cause: ' + key + ')', lang: 'jsx', code: c.bug, hl: { 2: 'cur' } }] },
            { narr: '<b>Step 1, server render:</b> this is the HTML the user receives and sees first.', parts: [{ type: 'code', label: 'component', lang: 'jsx', code: c.bug, hl: {} }, { type: 'text', html: '<b>Server HTML:</b> <code>' + H.esc(c.srv) + '</code>' }] },
            { narr: '<b>Step 2, client first render during hydration:</b> React runs the same component in the browser and gets a different answer.', parts: [{ type: 'code', label: 'component', lang: 'jsx', code: c.bug, hl: {} }, { type: 'text', html: '<b>Server HTML:</b> <code>' + H.esc(c.srv) + '</code>' }, { type: 'text', html: '<b>Client render:</b> <code>' + H.esc(c.cli) + '</code>' }] },
            { narr: '<span class="c-r">Mismatch.</span> ' + c.why, parts: [{ type: 'table', label: 'Comparison', columns: ['server', 'client first render', 'verdict'], rows: [[H.esc(c.srv), H.esc(c.cli), '<span class="c-r">different</span>']], hl: { 0: 'bad' } }] },
            { narr: '<b>The fix:</b> make the first client render equal to the server output, and bring in the browser-only information afterwards (or use a stable API).', parts: [{ type: 'code', label: 'fixed component', lang: 'jsx', code: c.fix, hl: {} }] },
            { narr: 'After the fix the first render is identical on both sides, hydration adopts the HTML as-is, and the console is clean.', parts: [{ type: 'table', label: 'Result', columns: ['check', 'status'], rows: [['server HTML equals client first render', '<span class="c-g">yes</span>'], ['console warning', '<span class="c-g">gone</span>'], ['server HTML reused (no client re-render)', '<span class="c-g">yes</span>']], hl: { 0: 'ok', 1: 'ok', 2: 'ok' } }] }
          ];
        }
      }
    ],
    examples: [
      {
        title: 'A timestamp in the header breaks hydration',
        html: `<p>A news site shows "Updated at 9:41 AM" using <code>new Date().toLocaleTimeString()</code> during render. The server (in UTC) produced <code>9:41 AM</code>; a reader in Mumbai hydrates and computes <code>3:11 PM</code>. The console says "Text content does not match server-rendered HTML". In React 18 the nearest Suspense boundary (or the whole page) is thrown away and rendered again on the client, which causes a flash and a slower interaction. Fix: format the time on the server with a fixed time zone, or render a stable placeholder and update it in <code>useEffect</code>. If you can pass the timestamp as a string from the server and render exactly that string, both sides match.</p>`
      },
      {
        title: 'Invalid HTML nesting that only fails in production SSR',
        html: `<p>A team renders markdown output into a <code>&lt;p&gt;</code> and the output contains a <code>&lt;div&gt;</code>. In the browser built purely with client rendering this works, because React creates the DOM with <code>createElement</code> and does not run the HTML parser. With SSR the string <code>&lt;p&gt;&lt;div&gt;..&lt;/div&gt;&lt;/p&gt;</code> goes through the HTML parser, which closes the paragraph early. The browser DOM no longer has the shape React expects, and hydration fails. Always validate nesting: no <code>div</code> inside <code>p</code>, no <code>a</code> inside <code>a</code>, no <code>button</code> inside <code>button</code>, and put <code>tbody</code> inside <code>table</code> before <code>tr</code>. React logs "validateDOMNesting" warnings in dev.</p>`
      },
      {
        title: 'Clicking before hydration finishes',
        html: `<p>On a slow phone, the user taps "Add to cart" while the bundle is still downloading. In the old days the tap vanished. In React 18+, because React listens for events at the root from the start, it <b>records</b> the discrete event (click, keydown...), finishes hydrating that part first (raising its priority), and then <b>replays</b> the event on the now-live component. That only works when the interactive part sits inside a <code>Suspense</code> boundary that can be hydrated independently, and when the button is a real element (a plain form button or link even works with no JS at all as a progressive-enhancement fallback).</p>`
      },
      {
        title: 'suppressHydrationWarning: a scalpel, not a hammer',
        html: `<p>Adding <code>suppressHydrationWarning</code> to an element tells React "I know this text or attribute will differ, do not warn, and keep the server's value for now". It works only <b>one level deep</b> (this element's own text and attributes, not its children) and it does not repair the difference. Good for a timestamp or a theme class you update right after mount. Bad as a blanket fix: it hides real bugs. Use it on the single element that is expected to differ.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>"Wiring" is not what you think.</b> Since React 17, React does not call <code>addEventListener</code> on each button. It attaches <b>one listener per event type on the root container</b> (event delegation) and, when an event fires, looks up the target DOM node's fiber to find the matching <code>onClick</code> prop. Hydration therefore means: walk the DOM in order, and for each node verify its type/text, store a pointer from the DOM node to its fiber (internal <code>__reactFiber$...</code> keys) and its props, and rebuild the fiber tree with state. That is why a successful hydration is mostly "render + link", not "attach thousands of listeners".</p>
      <p><b>The cursor.</b> React keeps a "next hydratable instance" pointer that moves through the DOM as it renders. For each host component it checks the node at the cursor; if the tag differs it tries to skip ahead a little (to tolerate extras like extension-injected nodes) and otherwise reports a mismatch. Text is compared exactly. Attributes are only compared in development to produce a warning; production skips this to stay fast. Because of this, a mismatch may exist in prod without any error, and you only see the wrong class or style on screen.</p>
      <p><b>Suspense boundaries in HTML.</b> The server wraps boundaries in comment markers: <code>&lt;!--$--&gt;...&lt;!--/$--&gt;</code> for completed content, <code>&lt;!--$?--&gt;</code> for pending (streamed in later), and <code>&lt;!--$!--&gt;</code> for a boundary that errored on the server and should be client-rendered. React uses them to hydrate each boundary as its own unit. Streaming adds inline scripts like <code>$RC("B:1","S:1")</code> that move late-arriving HTML into place before React even loads.</p>
      <p><b>Cost and the "uncanny valley".</b> You pay for rendering twice (server and client), you send the data twice (once inside the HTML, once as props or payload JSON so the client can reproduce the same render), and you ship all component code. In between visible and interactive, the page <i>looks</i> usable but isn't. Mitigations: (1) <b>Server Components</b>: not hydrated at all, no code shipped; (2) <b>selective hydration</b> with Suspense plus <code>next/dynamic</code> or <code>React.lazy</code> for below-the-fold widgets; (3) hydrate on interaction/visibility with a tiny wrapper (idle, visible, on-click); (4) smaller bundles and less work in the first render; (5) alternative architectures: <b>islands</b> (Astro hydrates only marked islands), <b>resumability</b> (Qwik serializes app state and listeners into HTML and never replays render).</p>
      <p><b>React 19 improvements.</b> Hydration errors now produce a single message with a <b>diff</b> of server vs client markup instead of several cryptic ones; React skips unexpected elements in <code>&lt;head&gt;</code> and <code>&lt;body&gt;</code> inserted by browser extensions or third-party scripts; and recoverable errors are reported through <code>onRecoverableError</code> on <code>hydrateRoot</code> so you can send them to monitoring. Always log them: they are real wasted renders happening to real users.</p>
      <p><b>Edge cases.</b> (1) <code>useEffect</code>-based "isClient" flags cause an extra render and a visible flash; for layout-critical values use CSS or a cookie the server can read. (2) <code>useSyncExternalStore</code> requires <code>getServerSnapshot</code> whenever it renders on the server, and it must return the same value as the first client snapshot during hydration. (3) Libraries that read <code>document</code> at import time crash SSR; load them lazily or with <code>ssr: false</code>. (4) Content that legitimately differs per user (cookies, A/B tests) must be decided on the server and passed down, or the first render must be neutral.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants write plenty of SSR-unsafe code: <code>localStorage</code> read inside a component body, <code>Date.now()</code> keys, <code>window.matchMedia</code> in render. These work in a client-only demo and break the moment the app is server-rendered. Hydration errors are a great example of a bug where the console message looks scary but the cause is always the same pattern: <i>the first client render is not the same as the server HTML</i>.</p>
      <p><b>Use AI as a partner:</b> paste the React 19 hydration diff from the console together with the component and ask <code>Which expression in this component can produce different output on the server and in the browser? Give the smallest fix that keeps SSR and explain why.</code> Ask it to scan a codebase for <code>typeof window</code>, <code>Date.now</code>, <code>Math.random</code>, <code>toLocale</code> and <code>localStorage</code> used during render. Use it to write a Playwright test that loads the page with JavaScript disabled and with a different time zone/locale and compares console errors.</p>
      <p><b>Where AI goes wrong:</b> it "fixes" the warning with <code>suppressHydrationWarning</code> everywhere, adds <code>useEffect(() =&gt; setMounted(true))</code> around entire pages (turning SSR into a blank shell, effectively CSR), or disables SSR for whole routes. It sometimes claims hydration "re-attaches every listener" or "re-creates the DOM", both inaccurate. In AI chat UIs, streamed markdown re-parsed on the server and client with different plugins is a frequent source of mismatches.</p>
      <p><b>What you must still own:</b> the invariant (first client render equals server HTML), monitoring of recoverable errors in production, and weighing hydration cost against interactivity needs (should this component even be a Client Component?).</p>`,
    problems: [
      {
        title: 'Debug a Hydration Mismatch',
        level: 'Medium', tags: ['hydration', 'ssr', 'useEffect', 'next.js'], companies: ['Vercel', 'Zalando', 'Flipkart'],
        statement: `<p>This Next.js component renders fine in development with <code>npm run dev</code> when you refresh, but the console shows "Hydration failed because the initial UI does not match what was rendered on the server" in production, and the cart badge flashes. Find <b>every</b> expression that can differ between server and browser, then fix the component so server HTML and the first client render are identical while still showing the visitor's local time and the saved cart count.</p>`,
        constraints: `Next.js App Router, React 19. The cart count is stored in <code>localStorage</code> under the key <code>cart</code> (a JSON array). The component must still render on the server (no <code>ssr: false</code>).`,
        example: `<p>Server renders <code>Hello! 09:41 UTC. Cart (0)</code> with id <code>f0.71</code>; the browser's first render computes <code>03:11 PM</code>, cart <code>(3)</code> and id <code>f0.19</code>. ${H.c('r', 'Three differences')} from one component: time, localStorage, and a random id.</p>`,
        brute: { why: `<p>The quick patch is to put <code>suppressHydrationWarning</code> on the whole wrapper or to wrap the component so it renders only after mount. That silences the console but either hides real bugs (attributes are never repaired) or removes all server-rendered HTML for this part, which means a blank shell and a worse LCP.</p>`,
          code: { lang: 'jsx', check: false, code: `'use client';
import { useState, useEffect } from 'react';

export default function Header() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;            // no server HTML at all: SSR benefit lost
  const id = 'h' + Math.random();
  const count = JSON.parse(localStorage.getItem('cart') || '[]').length;
  return <header id={id}>Hello! {new Date().toLocaleTimeString()} Cart ({count})</header>;
}` } },
        mcq: { q: 'Which is the best fix for reading localStorage in a server-rendered component?', options: ['Read it directly in render with a try/catch', 'Render a neutral default first, then read localStorage in useEffect and update state', 'Add suppressHydrationWarning to the whole page'], answer: 1, explain: 'The first client render must match the server. A neutral default does, then the effect brings the browser-only value in after hydration.' },
        hints: [
          `<p>Hint 1: list every value that is not purely a function of props: <code>Math.random()</code>, <code>new Date()</code> with the default locale/timezone, and <code>localStorage</code>.</p>`,
          `<p>Hint 2: replace the random id with <code>useId()</code>. For time and cart count, keep state with a neutral initial value and fill it in <code>useEffect</code>.</p>`,
          `<p>Hint 3: choose neutral values that look right: for example "--:--" and cart (0)? Better to hide the badge until known so users do not see a wrong 0. Recipe: useId, useState(null) for both values, one useEffect that reads localStorage and sets the time, render fallbacks while null.</p>`
        ],
        solution: {
          approach: `<p>Three sources of difference, three fixes. (1) <code>Math.random()</code> becomes <code>useId()</code>, which is deterministic per tree position. (2) <code>new Date().toLocaleTimeString()</code> depends on clock and time zone, so keep it in state initialised to <code>null</code> and set it in an effect. (3) <code>localStorage</code> is browser-only: same approach. The first render prints neutral placeholders (identical on both sides), so hydration succeeds and keeps the server HTML; the effect then fills in the real values. No part of the page is hidden from the server, the layout does not shift because placeholders reserve similar space.</p>`,
          code: { lang: 'jsx', check: false, code: `'use client';
import { useEffect, useId, useState } from 'react';

export default function Header() {
  const id = useId();                       // stable across server and client
  const [time, setTime] = useState(null);   // null = "not known yet" (same on both sides)
  const [count, setCount] = useState(null);

  useEffect(() => {                         // runs only in the browser, after hydration
    setTime(new Date().toLocaleTimeString());
    try {
      setCount(JSON.parse(localStorage.getItem('cart') || '[]').length);
    } catch {
      setCount(0);                          // corrupted JSON or storage blocked
    }
  }, []);

  return (
    <header id={id}>
      Hello! <span>{time ?? '--:--'}</span>{' '}
      Cart{count !== null && <> ({count})</>}
    </header>
  );
}

// Option: store the cart count in a cookie too, so the server can render the right number
// in the very first HTML and no placeholder is needed.` },
          complexity: `<p>One extra render after hydration (a tiny state update). Server HTML is preserved, hydration succeeds, and the console is clean. For layout-critical values prefer cookies (readable on the server) to avoid the placeholder flash.</p>`,
          followUps: ['How would useSyncExternalStore with a server snapshot change this code?', 'How would you track hydration errors in production (hint: onRecoverableError)?']
        }
      }
    ]
  });

  /* =====================================================================
     PRACTICE (Easy -> Medium -> Hard)
     ===================================================================== */
  practice.push({
    title: 'Same Slot: Update, Replace, Mount or Unmount?',
    level: 'Easy', tags: ['reconciliation', 'keys', 'element type'], companies: ['Meta', 'Amazon'],
    statement: `<p>React compares the element that was at a position last render (<code>oldEl</code>) with the element at that position now (<code>newEl</code>). Each element looks like <code>{ type, key?, props? }</code> or is <code>null</code>/<code>undefined</code> (nothing there). Write <code>outcome(oldEl, newEl)</code> returning exactly one of: <code>'nothing'</code> (both empty), <code>'mount'</code> (new appears), <code>'unmount'</code> (old disappears), <code>'update'</code> (same type and same key: keep the instance and its state, patch props), or <code>'replace'</code> (different type or different key: destroy the old instance and build a new one).</p>`,
    constraints: `<code>type</code> is a string (e.g. <code>'div'</code>) or a function reference. <code>key</code> is a string or missing (treat missing as <code>null</code>). Props never affect the answer.`,
    example: `<p><code>outcome({type:'div'}, {type:'div', props:{className:'x'}})</code> gives ${H.c('g', 'update')}: same type and key, only props changed.</p>
      <p><code>outcome({type:'div'}, {type:'section'})</code> gives ${H.c('r', 'replace')}. <code>outcome({type:'li', key:'a'}, {type:'li', key:'b'})</code> also gives ${H.c('r', 'replace')} because the key changed: a different identity.</p>`,
    brute: { why: `<p>A common wrong idea is "if anything about the element changed, rebuild it". Comparing the whole element (props included) reports <code>replace</code> for a plain class name change. That would be extremely wasteful and would reset state in every re-render.</p>`,
      code: `function outcomeBrute(oldEl, newEl) {
  if (!oldEl && !newEl) return 'nothing';
  if (!oldEl) return 'mount';
  if (!newEl) return 'unmount';
  // wrong: props are compared too, so any prop change looks like a replacement
  return JSON.stringify(oldEl) === JSON.stringify(newEl) ? 'update' : 'replace';
}` },
    mcq: { q: 'A <code>&lt;Form /&gt;</code> inside a <code>&lt;div&gt;</code> is changed to sit inside a <code>&lt;section&gt;</code>. What happens to the Form\'s state?', options: ['It is kept, because Form is the same component', 'It is lost: the parent type changed so the subtree is replaced', 'It is copied to the new Form'], answer: 1, explain: 'React compares types at each level top-down. div to section is a different type, so everything below is unmounted and mounted again.' },
    hints: [
      `<p>Hint 1: handle the "one side empty" cases first; they have nothing to compare.</p>`,
      `<p>Hint 2: identity is the pair (type, key). Props are the <i>content</i> of an identity, not part of it.</p>`,
      `<p>Hint 3: normalise missing keys to <code>null</code> before comparing, so <code>undefined</code> and <code>null</code> are treated the same. Recipe: both empty, then mount/unmount, then same type and same key means update, else replace.</p>`
    ],
    solution: {
      approach: `<p>Check emptiness first, then compare the identity pair. Same <code>type</code> and same <code>key</code> means React reuses the instance (and its state) and just patches props. Anything else is a different thing living at that spot, so the old one is destroyed and a new one created.</p>`,
      code: { lang: 'js', run: true, code: `function outcome(oldEl, newEl) {
  if (oldEl == null && newEl == null) return 'nothing';
  if (oldEl == null) return 'mount';
  if (newEl == null) return 'unmount';
  const sameKey = (oldEl.key ?? null) === (newEl.key ?? null);
  return oldEl.type === newEl.type && sameKey ? 'update' : 'replace';
}

console.log(outcome({ type: 'div' }, { type: 'div', props: { className: 'x' } })); // update
console.log(outcome({ type: 'div' }, { type: 'section' }));                         // replace
console.log(outcome({ type: 'li', key: 'a' }, { type: 'li', key: 'b' }));           // replace
console.log(outcome(null, { type: 'p' }));                                           // mount
console.log(outcome({ type: 'p' }, undefined));                                      // unmount
console.log(outcome(null, undefined));                                               // nothing` },
      complexity: `<p>O(1). This single decision is made for every node during reconciliation, which is why the whole diff is O(n).</p>`,
      followUps: ['What changes if the type is a component function defined inside the parent component?', 'How can you use a changing key on purpose to reset a form?']
    }
  });

  practice.push({
    title: 'Count the Renders and the Logs (React 18 batching)',
    level: 'Easy', tags: ['batching', 'setState', 'closures'], companies: ['Meta', 'Razorpay'],
    statement: `<p>With React 18 and <code>createRoot</code>, the component below is mounted and the button is clicked <b>once</b>. List, in order, everything that is printed to the console (ignore StrictMode double rendering), and say how many renders happen because of the click.</p>
      <pre>function App() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  console.log('render', a, b);
  function onClick() {
    setA(a + 1);
    setB(b + 1);
    console.log('handler', a, b);
    setTimeout(() =&gt; { setA((x) =&gt; x + 10); setB((x) =&gt; x + 10); }, 0);
  }
  return &lt;button onClick={onClick}&gt;{a} {b}&lt;/button&gt;;
}</pre>`,
    constraints: `React 18+, <code>createRoot</code>, no StrictMode. Timer callback runs after the first re-render has been committed.`,
    example: `<p>Initial mount prints ${H.c('b', 'render 0 0')}. After one click the full output is ${H.c('g', 'render 0 0, handler 0 0, render 1 1, render 11 11')}: two renders after the click, one for the handler batch and one for the timeout batch.</p>`,
    brute: { why: `<p>The tempting answer is "setState updates the variable, so the handler logs 1 1 and there are four renders (one per setter)". It ignores two facts: state is a per-render snapshot, and React 18 batches updates in the handler <i>and</i> in the timeout, so each group produces a single render.</p>`,
      code: { lang: 'jsx', check: false, code: `// Wrong mental model (React 17 outside handlers, plus "state changes immediately"):
// render 0 0
// handler 1 1     <- wrong: a and b are still 0 in this render's closure
// render 1 0      <- wrong: updates are batched in a handler
// render 1 1
// render 11 1     <- wrong in React 18: the timeout updates are batched too
// render 11 11` } },
    mcq: { q: 'Why does the handler log "handler 0 0" even after setA(a + 1)?', options: ['setA is asynchronous and slow', 'a is a constant snapshot for this render; the update is queued', 'React ignores the first call'], answer: 1, explain: 'Each render has its own a and b. The setters schedule the next render but do not change the current variables.' },
    hints: [
      `<p>Hint 1: inside one render, <code>a</code> and <code>b</code> never change. Every line of <code>onClick</code> sees 0 and 0.</p>`,
      `<p>Hint 2: both setters in the handler are batched into one render. The setTimeout callback runs later, but React 18 batches its two setters into one render as well.</p>`,
      `<p>Hint 3: values: after the click batch, a = 0+1 = 1, b = 1. In the timeout, updaters add 10 to the latest values: 11 and 11. Count the renders after the click: 2.</p>`
    ],
    solution: {
      approach: `<p>Trace the snapshot and the queue. Mount: <code>render 0 0</code>. Click: the handler sees a = 0, b = 0 and queues <i>set 1</i> for each, logs <code>handler 0 0</code>, and schedules the timer. When the handler returns, React renders once: <code>render 1 1</code>. Later the timer fires and queues two updaters (+10); React 18 batches them, renders once with 11 and 11: <code>render 11 11</code>. Total after the click: <b>2 renders</b>. (React 17 would give 3 renders after the click: the timeout would render twice, <code>render 11 1</code> then <code>render 11 11</code>.)</p>`,
      code: { lang: 'jsx', check: false, code: `// Console output, in order:
// render 0 0       <- mount
// handler 0 0      <- click: snapshot values, nothing re-rendered yet
// render 1 1       <- ONE batched render for setA(a+1) + setB(b+1)
// render 11 11     <- timeout: updaters x => x+10 batched into ONE render (React 18)
//
// Renders caused by the click: 2.
// In React 17 the timeout would add one more: render 11 1, then render 11 11.` },
      complexity: `<p>Not an algorithm question: the skill is tracing snapshots and the batching rule by hand.</p>`,
      followUps: ['What would change if the timer callback were wrapped in flushSync between the two setters?', 'Rewrite the handler so the first update uses an updater function too. What is the final state then?']
    }
  });

  practice.push({
    title: 'Rank Strategies by Time to Content',
    level: 'Easy', tags: ['csr', 'ssr', 'ssg', 'isr', 'performance'], companies: ['Vercel', 'Myntra'],
    statement: `<p>Use this timing model (milliseconds, one network round trip <code>NET = 50</code>). <b>CSR</b>: content appears at <code>NET + 20 + jsMs + NET + dataMs</code>. <b>SSR</b>: content appears at <code>NET + dataMs + 20 + 30</code>. <b>SSG</b> and <b>ISR</b> (cache hit): content appears at <code>NET + 5 + 30</code>. Write <code>rankByContent({ dataMs, jsMs })</code> that returns an array of <code>'NAME:time'</code> strings sorted by time ascending (ties alphabetical by name) for the four strategies.</p>`,
    constraints: `0 ≤ dataMs, jsMs ≤ 10000. Always return four entries.`,
    example: `<p><code>rankByContent({ dataMs: 300, jsMs: 800 })</code> gives ${H.c('g', '["ISR:85","SSG:85","SSR:400","CSR:1220"]')}. The static strategies win, CSR is last because it waits for JS and then for the API.</p>`,
    brute: { why: `<p>Hard-coding the order "SSG, ISR, SSR, CSR" ignores the inputs. It cannot show how much faster one strategy is, it cannot tell that SSG and ISR tie, and it would stay wrong if you changed the model (for example a slower CDN). The ranking and the times have to be computed from <code>dataMs</code> and <code>jsMs</code>.</p>`,
      code: `function rankBrute() {
  return ['SSG', 'ISR', 'SSR', 'CSR']; // fixed answer: ignores dataMs and jsMs completely
}` },
    mcq: { q: 'In this model, whose time to content does NOT depend on dataMs?', options: ['CSR', 'SSR', 'SSG and ISR (cache hit)'], answer: 2, explain: 'Static strategies serve a file that was built earlier, so the data time was paid at build time. CSR and SSR both pay dataMs on every visit, just in different places.' },
    hints: [
      `<p>Hint 1: write one tiny function per strategy that returns its content time from the formulas in the statement.</p>`,
      `<p>Hint 2: put the four results in an array of objects, sort by time, and break ties by name with <code>localeCompare</code>.</p>`,
      `<p>Hint 3: format as <code>name + ':' + time</code>. Recipe: const t = { CSR, SSR, SSG, ISR }; Object.entries(t).sort(...).map(...).</p>`
    ],
    solution: {
      approach: `<p>Compute each strategy's content time from its formula, then sort. ISR with a cache hit is identical to SSG because both serve a prebuilt file; the difference between them is freshness, not speed.</p>`,
      code: { lang: 'js', run: true, code: `function rankByContent({ dataMs, jsMs }) {
  const NET = 50;
  const staticTime = NET + 5 + 30;
  const times = {
    CSR: NET + 20 + jsMs + NET + dataMs,   // shell, then JS, then API, then render
    SSR: NET + dataMs + 20 + 30,           // server waits for data, HTML already has content
    SSG: staticTime,                       // prebuilt file from a CDN
    ISR: staticTime                        // cache hit looks exactly like SSG
  };
  return Object.entries(times)
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .map(([name, t]) => name + ':' + t);
}

console.log(JSON.stringify(rankByContent({ dataMs: 300, jsMs: 800 })));
console.log(JSON.stringify(rankByContent({ dataMs: 0, jsMs: 0 })));` },
      complexity: `<p>O(1) work (four items). The model is rough; real numbers need RUM data (CrUX) and depend on device and network.</p>`,
      followUps: ['Add TTI to the ranking. Which strategy has the biggest gap between content and TTI?', 'Where does a cache miss in ISR land in this ranking?']
    }
  });

  practice.push({
    title: 'Server or Client Component?',
    level: 'Easy', tags: ['server components', 'use client', 'boundary'], companies: ['Vercel', 'Shopify'],
    statement: `<p>A component uses a list of <b>features</b> (strings). Client-only features are: <code>useState</code>, <code>useEffect</code>, <code>onClick</code>, <code>onChange</code>, <code>window</code>, <code>localStorage</code>, <code>useContext</code>. Server-only features are: <code>db</code>, <code>secret</code>, <code>fs</code>, <code>heavyLib</code>. Anything else (for example <code>static</code>) is neutral. Write <code>decide(features)</code> returning <code>{ mode, client, server }</code> where <code>client</code>/<code>server</code> list the matching features. <code>mode</code> is <code>'client'</code> if it has only client features (neutral ones allowed), <code>'server'</code> if it has none or only server features, and <code>'split'</code> if it needs both worlds (the interactive part must be extracted into a small client leaf).</p>`,
    constraints: `Features may repeat; list each matching feature once, in first-seen order. Up to 50 features.`,
    example: `<p><code>decide(['db', 'static'])</code> gives ${H.c('g', "{ mode: 'server', client: [], server: ['db'] }")}. <code>decide(['db', 'onClick'])</code> gives ${H.c('y', "split")}: query on the server, button in a client leaf.</p>`,
    brute: { why: `<p>The lazy rule "if there is any doubt, add 'use client'" sends the database client, secrets and heavy libraries into the browser bundle (or breaks the build) and removes the main benefit of Server Components.</p>`,
      code: `function decideBrute(features) {
  return { mode: 'client', client: features, server: [] }; // always client: safe to compile, bad for bundle and secrets
}` },
    mcq: { q: 'A component calls db.query() and also has an onClick handler. What is the right design?', options: ['Add use client to the whole component', 'Server Component for the query, extracted client leaf for the button', 'Call db.query() inside the onClick handler on the client'], answer: 1, explain: 'The database must stay on the server; the click needs the browser. Split them and pass plain data across the boundary.' },
    hints: [
      `<p>Hint 1: two sets, one for client-only features and one for server-only features. Check each feature against both.</p>`,
      `<p>Hint 2: collect matches without duplicates, preserving first-seen order, then decide by whether either list is empty.</p>`,
      `<p>Hint 3: edge cases: empty list or only neutral features means 'server' (the default). Recipe: client.length &amp;&amp; server.length is 'split'; client.length is 'client'; otherwise 'server'.</p>`
    ],
    solution: {
      approach: `<p>Classify each feature, dedupe while keeping order, and map the two lists to a mode. 'split' is the interesting result: it is the signal to move the client features into their own small component, so the rest keeps its server-only powers.</p>`,
      code: { lang: 'js', run: true, code: `function decide(features) {
  const CLIENT = new Set(['useState', 'useEffect', 'onClick', 'onChange', 'window', 'localStorage', 'useContext']);
  const SERVER = new Set(['db', 'secret', 'fs', 'heavyLib']);
  const client = [], server = [];
  for (const f of features) {
    if (CLIENT.has(f) && !client.includes(f)) client.push(f);
    else if (SERVER.has(f) && !server.includes(f)) server.push(f);
  }
  let mode = 'server';
  if (client.length && server.length) mode = 'split';
  else if (client.length) mode = 'client';
  return { mode, client, server };
}

console.log(JSON.stringify(decide(['db', 'static'])));
console.log(JSON.stringify(decide(['useState', 'onClick', 'onClick'])));
console.log(JSON.stringify(decide(['db', 'onClick', 'secret'])));
console.log(JSON.stringify(decide([])));` },
      complexity: `<p>O(f) for f features, O(1) set lookups. In real projects a lint rule or the compiler error messages play this role.</p>`,
      followUps: ['How does the "donut" pattern let a client component still display server-rendered content?', 'Which of the server-only features would you also protect with the server-only package?']
    }
  });

  practice.push({
    title: 'Fix the List: Keys That Keep Input State',
    level: 'Medium', tags: ['keys', 'lists', 'state', 'react'], companies: ['Meta', 'Atlassian', 'Zomato'],
    statement: `<p>The todo list below lets users type a note in each row. After deleting the first todo, the notes appear next to the wrong items, and sometimes the input cursor jumps. Explain why and fix it. Also say what is wrong with <code>key={Math.random()}</code> as an alternative.</p>
      <pre>function Todos({ todos, onDelete }) {
  return (
    &lt;ul&gt;
      {todos.map((t, i) =&gt; (
        &lt;li key={i}&gt;
          {t.title} &lt;input placeholder="note" /&gt;
          &lt;button onClick={() =&gt; onDelete(t.id)}&gt;x&lt;/button&gt;
        &lt;/li&gt;
      ))}
    &lt;/ul&gt;
  );
}</pre>`,
    constraints: `Each todo has a stable unique <code>id</code>. The inputs are uncontrolled (their text lives in the DOM node). Do not move the note into state.`,
    example: `<p>Todos: A (note "milk"), B (note "dog"). Delete A. ${H.c('r', 'Bug')}: list shows B with the note "milk" (the DOM input at position 0 kept its text). ${H.c('g', 'Fixed')}: B keeps "dog" because its row (with its input) is identified by B's id.</p>`,
    brute: { why: `<p>Using <code>key={Math.random()}</code> or <code>key={Date.now()}</code> "fixes" the stale text by throwing away every row on every render. All inputs are recreated, so every note typed is lost and focus is dropped on each keystroke elsewhere that triggers a render. It is slow and breaks UX.</p>`,
      code: { lang: 'jsx', check: false, code: `{todos.map((t) => (
  <li key={Math.random()}>        {/* new key each render: every row remounts every render */}
    {t.title} <input placeholder="note" />
  </li>
))}` } },
    mcq: { q: 'Why does key={index} show the wrong note after deleting the first item?', options: ['React sorts items by index', 'Row 0 is matched with the old row 0 so its DOM input (with typed text) is reused for the next item', 'Keys are only used for CSS'], answer: 1, explain: 'With index keys, identity is the position. Deleting item 0 makes item B take position 0 and inherit the DOM node and state that belonged to A.' },
    hints: [
      `<p>Hint 1: the typed note lives in the DOM input, which React keeps if it believes the row is the same row.</p>`,
      `<p>Hint 2: a key should identify the <i>data</i>, not its current position. What does each todo already own that never changes?</p>`,
      `<p>Hint 3: use <code>t.id</code> as the key, on the outermost element returned by <code>map</code>. Keys only need to be unique among siblings.</p>`
    ],
    solution: {
      approach: `<p>With <code>key={i}</code>, React matches rows by position. After deleting the first todo, the second todo moves to index 0, so React reuses the DOM node and uncontrolled input of the old index 0, text included, and just changes the title. Use the data's own stable ID as the key so React matches rows by identity: it removes exactly the deleted row and its input and leaves the others untouched. Random keys are the opposite mistake: identity changes every render so nothing is ever reused.</p>`,
      code: { lang: 'jsx', check: false, code: `function Todos({ todos, onDelete }) {
  return (
    <ul>
      {todos.map((t) => (
        // identity = the todo's id, which follows the item when it moves or is deleted
        <li key={t.id}>
          {t.title} <input placeholder="note" />
          <button onClick={() => onDelete(t.id)}>x</button>
        </li>
      ))}
    </ul>
  );
}

// Bonus: a key can also be used to RESET a component on purpose.
// <NoteEditor key={selectedTodo.id} todo={selectedTodo} />   // switching todo remounts the editor` },
      complexity: `<p>Reconciliation stays O(n). Deleting one row costs one DOM removal instead of rewriting every row below it.</p>`,
      followUps: ['What if items have no id? Where do you generate ids and why must it not be during render?', 'How do keys interact with CSS animations when items reorder?']
    }
  });

  practice.push({
    title: 'Count DOM Moves in a Keyed List',
    level: 'Medium', tags: ['reconciliation', 'keys', 'lastPlacedIndex'], companies: ['Meta', 'Google'],
    statement: `<p>Implement React's keyed child reconciliation counting. Given <code>oldKeys</code> and <code>newKeys</code> (arrays of unique strings), return <code>{ moves, inserts, removes }</code>. Walk <code>newKeys</code> in order while remembering <code>lastPlaced</code> (starts at 0): a key not in the old list is an <b>insert</b>; a reused key whose old index is <b>less than</b> <code>lastPlaced</code> is a <b>move</b>; otherwise the node stays and <code>lastPlaced</code> becomes its old index. Old keys missing from the new list are <b>removes</b>.</p>`,
    constraints: `0 ≤ list lengths ≤ 10<sup>5</sup>. Keys are unique within each list. Aim for O(n).`,
    example: `<p>old <code>[A,B,C,D]</code>, new <code>[D,A,B,C]</code> gives ${H.c('r', '{ moves: 3, inserts: 0, removes: 0 }')}: D stays (lastPlaced = 3), then A, B, C are all "behind" it. But new <code>[B,C,D,A]</code> gives ${H.c('g', '{ moves: 1, ... }')}: only A moves.</p>`,
    brute: { why: `<p>Checking, for every new key, whether it exists with <code>oldKeys.indexOf(key)</code> costs O(n) each, so O(n<sup>2</sup>) for the whole list. With 100,000 rows that is 10 billion steps. A Map from key to old index makes each lookup O(1).</p>`,
      code: `function countBrute(oldKeys, newKeys) {
  let moves = 0, inserts = 0, removes = 0, last = 0;
  for (const k of newKeys) {
    const was = oldKeys.indexOf(k);           // O(n) scan every time
    if (was === -1) inserts++;
    else if (was < last) moves++;
    else last = was;
  }
  for (const k of oldKeys) if (!newKeys.includes(k)) removes++; // another O(n) per key
  return { moves, inserts, removes };
}` },
    mcq: { q: 'Old [A,B,C,D], new [D,A,B,C]. How many DOM moves does React perform?', options: ['1 (move D to the front)', '3 (A, B and C move behind D)', '4'], answer: 1, explain: 'Careful: React keeps D (its old index 3 sets lastPlaced = 3) and then moves A, B and C, so the answer is 3. The one-move intuition is wrong for React\'s algorithm. Moving the first item to the end costs only 1.' },
    hints: [
      `<p>Hint 1: first build a map from each old key to its old index, so lookups are O(1).</p>`,
      `<p>Hint 2: <code>lastPlaced</code> is the highest old index already "settled in place". A reused item with a lower old index than that must be moved to go after it.</p>`,
      `<p>Hint 3: removes are the old keys that never appear in the new list; use a Set of the new keys. Recipe: one pass over newKeys (insert / move / keep), one pass over oldKeys (remove).</p>`
    ],
    solution: {
      approach: `<p>Map old keys to indices. Loop over the new list: a missing key is an insert; otherwise compare its old index with <code>lastPlaced</code>: smaller means a move, otherwise it stays and raises <code>lastPlaced</code>. A final pass counts old keys that vanished. This is the logic of React's <code>reconcileChildrenArray</code> (the real one works with fibers and a linked list but makes the same decisions).</p>`,
      code: { lang: 'js', run: true, code: `function countOps(oldKeys, newKeys) {
  const oldIndex = new Map(oldKeys.map((k, i) => [k, i]));
  const newSet = new Set(newKeys);
  let moves = 0, inserts = 0, removes = 0, lastPlaced = 0;
  for (const key of newKeys) {
    if (!oldIndex.has(key)) { inserts++; continue; }       // brand new item
    const was = oldIndex.get(key);
    if (was < lastPlaced) moves++;                         // must hop behind a settled item
    else lastPlaced = was;                                 // stays where it is
  }
  for (const key of oldKeys) if (!newSet.has(key)) removes++;
  return { moves, inserts, removes };
}

console.log(JSON.stringify(countOps(['A', 'B', 'C', 'D'], ['D', 'A', 'B', 'C']))); // 3 moves
console.log(JSON.stringify(countOps(['A', 'B', 'C', 'D'], ['B', 'C', 'D', 'A']))); // 1 move
console.log(JSON.stringify(countOps(['A', 'B', 'C', 'D'], ['X', 'A', 'B', 'C', 'D']))); // 1 insert
console.log(JSON.stringify(countOps(['A', 'B', 'C', 'D'], ['A', 'C', 'D']))); // 1 remove` },
      complexity: `<p>Time O(n + m), space O(n) for the map and set. The result is not always the minimum number of moves (a longest-increasing-subsequence approach, as used in Vue 3 and Inferno, would be), but it is simple and fast.</p>`,
      followUps: ['Implement the minimal-move version with the longest increasing subsequence and compare on [D,A,B,C].', 'Why is moving the last item to the front the worst case for React?']
    }
  });

  practice.push({
    title: 'useTransition or useDeferredValue?',
    level: 'Medium', tags: ['useDeferredValue', 'useTransition', 'concurrent', 'memo'], companies: ['Meta', 'Swiggy'],
    statement: `<p>A parent component you cannot edit renders <code>&lt;PriceChart query={query} /&gt;</code>, where <code>query</code> changes on every keystroke from a text box. <code>PriceChart</code> is expensive (about 150 ms) and is the file you <b>can</b> edit. Make the typing smooth without changing the parent and without debouncing. Show a stale-results hint. Explain why <code>useTransition</code> is not the right tool here.</p>`,
    constraints: `You can only modify the child component. React 18+.`,
    example: `<p>Before: each key press freezes the page for 150 ms. After: the box stays instant; the chart shows the previous query dimmed until the new one is ready, then jumps to the latest (outdated renders are dropped).</p>`,
    brute: { why: `<p>Doing nothing leaves the heavy chart in the urgent render. A debounce delays the chart but does not make the render itself interruptible, and can feel laggy (you wait 300 ms, then freeze for 150 ms). <code>useTransition</code> needs access to the code that calls <code>setQuery</code>, which lives in the parent we can't edit.</p>`,
      code: { lang: 'jsx', check: false, code: `function PriceChart({ query }) {
  const data = computeSeries(query);            // 150 ms on the urgent render, every key
  return <Chart data={data} />;
}` } },
    mcq: { q: 'Why choose useDeferredValue over useTransition here?', options: ['Because it is faster', 'Because we do not own the setState call, only the received value', 'Because transitions do not work with charts'], answer: 1, explain: 'startTransition must wrap the update itself. When you only receive a value as a prop, useDeferredValue gives you a lagging copy to render the heavy part with.' },
    hints: [
      `<p>Hint 1: the urgent update (the text box) and the heavy chart are in the same component tree; you want the chart to lag behind the value, not block it.</p>`,
      `<p>Hint 2: <code>const deferred = useDeferredValue(query)</code> gives you the previous value first and the new one later in a background render.</p>`,
      `<p>Hint 3: move the expensive work into a memoized child that receives <code>deferred</code>, otherwise it still re-renders in the urgent pass because the parent re-rendered. Dim it when <code>deferred !== query</code>.</p>`
    ],
    solution: {
      approach: `<p>Inside <code>PriceChart</code> call <code>useDeferredValue(query)</code>. The first (urgent) render uses the old deferred value, so the memoized heavy child is skipped and the text box stays instant. React then schedules a second, low-priority render with the new value, which can be interrupted by further typing; outdated ones are dropped. <code>useTransition</code> needs control of the setter, which we do not have.</p>`,
      code: { lang: 'jsx', check: false, code: `import { memo, useDeferredValue, useMemo } from 'react';

const HeavyChart = memo(function HeavyChart({ query }) {
  const data = useMemo(() => computeSeries(query), [query]);   // runs only when query changes
  return <Chart data={data} />;
});

export default function PriceChart({ query }) {
  const deferredQuery = useDeferredValue(query);   // lags behind during fast typing
  const isStale = deferredQuery !== query;
  return (
    <div style={{ opacity: isStale ? 0.6 : 1, transition: 'opacity 0.2s' }}>
      <HeavyChart query={deferredQuery} />
    </div>
  );
}` },
      complexity: `<p>Work per final query is the same (150 ms) but happens off the urgent path; intermediate queries are skipped when typing is fast.</p>`,
      followUps: ['What happens if HeavyChart is not wrapped in memo?', 'When would you add a debounce on top of useDeferredValue?']
    }
  });

  practice.push({
    title: 'Find the First Hydration Mismatch',
    level: 'Medium', tags: ['hydration', 'ssr', 'tree comparison'], companies: ['Vercel', 'Walmart Global Tech'],
    statement: `<p>A node is either a string (text) or <code>{ tag, children: [...] }</code>. Given the <code>server</code> tree and the <code>client</code> tree, return the path of the <b>first</b> mismatch in depth-first order, or <code>null</code> if they match. Path format: root tag, then <code>/tag[i]</code> for each child index (for text children use <code>text[i]</code>). A mismatch is: different kind (text vs element), different text, different tag, or different number of children (report the path of the first child present on only one side).</p>`,
    constraints: `Up to 10<sup>4</sup> nodes, depth up to 100. Trees are finite and acyclic.`,
    example: `<p>server <code>main &gt; [h1 &gt; ["Shop"], p &gt; ["9:41"]]</code> vs client <code>main &gt; [h1 &gt; ["Shop"], p &gt; ["9:42"]]</code> gives ${H.c('r', "main/p[1]/text[0]")}.</p>`,
    brute: { why: `<p>Serialising both trees to strings and comparing them tells you <i>that</i> they differ but not <i>where</i>; finding the position by scanning for the first differing character gives an offset in HTML text, not a node path, and can point inside a tag name or attribute.</p>`,
      code: `function findBrute(server, client) {
  const a = JSON.stringify(server), b = JSON.stringify(client);
  if (a === b) return null;
  let i = 0; while (a[i] === b[i]) i++;
  return 'char offset ' + i;       // not a node path: hard to act on
}` },
    mcq: { q: 'In React 18, what happens to a text mismatch during hydration?', options: ['React patches the text and continues quietly', 'React logs a recoverable error and re-renders the nearest Suspense boundary or root on the client', 'The page crashes with a blank screen'], answer: 1, explain: 'Text and structure mismatches cause a recoverable error and client rendering of the affected boundary; the server HTML for it is thrown away.' },
    hints: [
      `<p>Hint 1: walk both trees together, depth first. A recursive helper that receives the current path is enough.</p>`,
      `<p>Hint 2: first compare the node kinds (string vs object), then text values, then tags, then children one index at a time.</p>`,
      `<p>Hint 3: loop <code>i</code> up to the longer children length; if one side has no child at <code>i</code>, return that child's path immediately. Recurse for the others; return the first non-null result.</p>`
    ],
    solution: {
      approach: `<p>Recursive comparison that mimics how React's hydration cursor consumes the DOM in order. Return as soon as the first difference is seen, with a readable path that names the element chain and child index.</p>`,
      code: { lang: 'js', run: true, code: `function findMismatch(server, client, path = '') {
  const isText = (n) => typeof n === 'string';
  if (isText(server) || isText(client)) {
    return server === client ? null : path;                // different kind or different text
  }
  const here = path === '' ? server.tag : path;
  if (server.tag !== client.tag) return here;
  const a = server.children || [], b = client.children || [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const s = a[i], c = b[i];
    const name = (s !== undefined ? s : c);
    const label = isText(name) ? 'text[' + i + ']' : name.tag + '[' + i + ']';
    if (s === undefined || c === undefined) return here + '/' + label;   // present on one side only
    const r = findMismatch(s, c, here + '/' + label);
    if (r) return r;
  }
  return null;
}

const server = { tag: 'main', children: [{ tag: 'h1', children: ['Shop'] }, { tag: 'p', children: ['9:41'] }] };
const same = JSON.parse(JSON.stringify(server));
const diffText = JSON.parse(JSON.stringify(server)); diffText.children[1].children[0] = '9:42';
const extra = JSON.parse(JSON.stringify(server)); extra.children.push({ tag: 'footer', children: [] });
console.log(findMismatch(server, same));      // null
console.log(findMismatch(server, diffText));  // main/p[1]/text[0]
console.log(findMismatch(server, extra));     // main/footer[2]` },
      complexity: `<p>Time O(n) in the worst case, space O(depth) for the recursion.</p>`,
      followUps: ['Extend it to compare attributes. Why does React only warn about attribute mismatches in development?', 'How would you collect all mismatches instead of stopping at the first?']
    }
  });

  practice.push({
    title: 'ISR Timeline with On-Demand Revalidation',
    level: 'Medium', tags: ['isr', 'revalidate', 'stale-while-revalidate', 'next.js'], companies: ['Vercel', 'Shopify', 'Walmart Global Tech'],
    statement: `<p>Simulate an ISR page. Inputs: <code>revalidate</code> (seconds), <code>regen</code> (seconds a rebuild takes) and a sorted list of <code>events</code>: <code>{ t, type: 'req' }</code> (a visitor) or <code>{ t, type: 'purge' }</code> (an on-demand <code>revalidatePath</code>). The page starts as version 1, built at t = 0. Rules: (1) a request when the cached page is younger than <code>revalidate</code> sees the cached version. (2) Older: the visitor still sees the stale cached version and, if no rebuild is running, starts one that finishes at <code>t + regen</code> and becomes the new cached version (built at that time). (3) A finished rebuild is swapped in before handling any event at or after its finish time. (4) After a purge the cache entry is gone: the <b>next request</b> waits for a blocking fresh render and sees the next version (any running rebuild is cancelled). Return one string per <b>request</b>: <code>'t=70 v1 stale'</code>, <code>'t=10 v1 fresh'</code> or <code>'t=100 v3 blocking'</code>.</p>`,
    constraints: `0 ≤ events ≤ 10<sup>4</sup>, times non-decreasing, <code>revalidate &gt; 0</code>, <code>regen ≥ 0</code>.`,
    example: `<p><code>revalidate = 60, regen = 2</code>, events: req 10, req 70, req 71, req 75 gives ${H.c('g', '["t=10 v1 fresh", "t=70 v1 stale", "t=71 v1 stale", "t=75 v2 fresh"]')}. The rebuild started at 70 finishes at 72, so the request at 75 sees v2 (age 3 s).</p>`,
    brute: { why: `<p>A quick answer is "whenever the page is older than <code>revalidate</code>, regenerate and serve the new page". That makes the unlucky visitor wait for the rebuild (it is just SSR with extra steps) and ignores that many visitors arriving during the rebuild all see the stale page, which is the entire point of stale-while-revalidate.</p>`,
      code: `function simulateBrute(revalidate, regen, events) {
  let version = 1, builtAt = 0;
  return events.filter((e) => e.type === 'req').map((e) => {
    if (e.t - builtAt >= revalidate) { version++; builtAt = e.t; return 't=' + e.t + ' v' + version + ' blocking'; }
    return 't=' + e.t + ' v' + version + ' fresh';
  }); // wrong: no stale-while-revalidate, no purge handling
}` },
    mcq: { q: 'With stale-while-revalidate, who waits for the rebuild?', options: ['The first visitor after expiry', 'Nobody; they get the stale page immediately', 'Every visitor during the rebuild'], answer: 1, explain: 'The stale page is served instantly and the rebuild happens in the background. Only after a purge (cache removed) does a visitor wait for a fresh render.' },
    hints: [
      `<p>Hint 1: keep state: <code>version</code>, <code>builtAt</code>, <code>rebuild</code> (null or { doneAt, version }) and <code>purged</code> (boolean).</p>`,
      `<p>Hint 2: at the start of every event, if a rebuild exists and <code>e.t &gt;= rebuild.doneAt</code>, swap it in (version = rebuild.version, builtAt = rebuild.doneAt).</p>`,
      `<p>Hint 3: a purge just sets <code>purged = true</code> and cancels the rebuild. A request with <code>purged</code> set bumps the version, sets builtAt = t and clears purged. Otherwise compare the age with revalidate. Remember that only requests produce output.</p>`
    ],
    solution: {
      approach: `<p>Process events in order with a tiny state machine. Always apply finished rebuilds first. A purge removes the cache and cancels any running rebuild. A request is then one of three things: <b>blocking</b> (cache was purged, build a new version now), <b>stale</b> (older than revalidate: serve old version, start a background rebuild if none is running), or <b>fresh</b>.</p>`,
      code: { lang: 'js', run: true, code: `function simulateISR(revalidate, regen, events) {
  let version = 1, builtAt = 0, rebuild = null, purged = false;
  const out = [];
  for (const e of events) {
    // 1) swap in a finished background rebuild
    if (rebuild && e.t >= rebuild.doneAt) {
      version = rebuild.version; builtAt = rebuild.doneAt; rebuild = null;
    }
    if (e.type === 'purge') {                    // revalidatePath: cache entry removed
      purged = true;
      if (rebuild) rebuild = null;
      continue;
    }
    if (purged) {                                // nothing cached: this visitor waits for a fresh render
      version += 1; builtAt = e.t; purged = false;
      out.push('t=' + e.t + ' v' + version + ' blocking');
    } else if (e.t - builtAt >= revalidate) {    // stale: serve it now, refresh in the background
      if (!rebuild) rebuild = { doneAt: e.t + regen, version: version + 1 };
      out.push('t=' + e.t + ' v' + version + ' stale');
    } else {
      out.push('t=' + e.t + ' v' + version + ' fresh');
    }
  }
  return out;
}

const reqs = [10, 70, 71, 75].map((t) => ({ t, type: 'req' }));
console.log(JSON.stringify(simulateISR(60, 2, reqs)));
const withPurge = [{ t: 10, type: 'req' }, { t: 20, type: 'purge' }, { t: 21, type: 'req' }, { t: 30, type: 'req' }];
console.log(JSON.stringify(simulateISR(60, 2, withPurge)));` },
      complexity: `<p>Time O(e) for e events, O(1) space. The model ignores that real Next.js deduplicates concurrent rebuilds across servers and keeps the old page if a rebuild fails.</p>`,
      followUps: ['What happens in the model if a rebuild throws an error? What does Next.js do?', 'How would you change the purge rule to be stale-while-revalidate as well (serve stale once, then fresh)?']
    }
  });

  practice.push({
    title: 'Build a Mini Virtual DOM: diff and patch',
    level: 'Hard', tags: ['virtual dom', 'diff', 'patch', 'algorithms'], companies: ['Meta', 'Google', 'Atlassian'],
    statement: `<p>Nodes are either strings or <code>{ type, props, children }</code>. Implement <code>diff(a, b)</code> that returns a list of patch operations and <code>apply(tree, ops)</code> that returns a new tree with the operations applied, so that <code>apply(a, diff(a, b))</code> deep-equals <code>b</code>. Operations: <code>replace</code> (different type, or text vs element, or changed text), <code>props</code> (set/remove props on same-type nodes) and, for children compared by position, <code>append</code> (extra new children) and <code>remove</code> (extra old children, removed from the last index down). Do not descend into a replaced subtree.</p>`,
    constraints: `Up to 10<sup>4</sup> nodes. Paths are arrays of child indexes from the root (empty array = root). Do not mutate the input trees.`,
    example: `<p>a = <code>div.card &gt; [h1 "Hi", p "x"]</code>, b = <code>div.card.big &gt; [h1 "Hi", span "x", p "new"]</code> produces ${H.c('g', 'props on root')}, ${H.c('r', 'replace p by span')} and ${H.c('b', 'append p "new"')}. Applying them to a gives b.</p>`,
    brute: { why: `<p>Rebuilding the whole tree on every change (<code>replace</code> at the root) is trivially correct, but it destroys every DOM node and all component state each time, and does O(n) DOM creation even for a one-attribute change. The point of diffing is to emit a handful of tiny operations.</p>`,
      code: `function diffBrute(a, b) {
  return [{ op: 'replace', path: [], node: b }];   // always correct, always the most expensive patch
}` },
    mcq: { q: 'Why emit removals from the last index down to the first?', options: ['It is faster', 'Removing index i shifts later items left; going from the end keeps earlier indexes valid', 'React requires it'], answer: 1, explain: 'If you remove index 2 first, the item formerly at index 3 becomes index 2 and your next remove(3) hits the wrong node. Removing from the end avoids shifting.' },
    hints: [
      `<p>Hint 1: three cases for a pair of nodes: either is text, types differ, or same type. Only the last one recurses.</p>`,
      `<p>Hint 2: for same-type nodes compare props (set changed/new, remove missing) and then compare children pairwise up to the shorter length.</p>`,
      `<p>Hint 3: extra new children become <code>append</code> on the parent path; extra old children become <code>remove</code> ops with the child path, emitted from the end. In <code>apply</code>, walk the path with <code>reduce</code> and clone the tree first.</p>`
    ],
    solution: {
      approach: `<p>The diff is a recursive function returning an array of ops, each addressed by a child-index path. For a pair of nodes: text or different type gives one <code>replace</code> and stops (assumption 1: different type means different tree). Same type: emit one <code>props</code> op if needed, then recurse over the common children, then <code>append</code> the surplus new children and <code>remove</code> the surplus old ones from the end. <code>apply</code> deep-clones the tree and interprets the ops in order; because replaced subtrees are never descended into and removals go from the end, earlier paths stay valid.</p>`,
      code: { lang: 'js', run: true, code: `const h = (type, props, ...children) => ({ type, props: props || {}, children });

function diff(a, b, path = []) {
  if (typeof a === 'string' || typeof b === 'string') {
    return a === b ? [] : [{ op: 'replace', path, node: b }];       // text change or kind change
  }
  if (a.type !== b.type) return [{ op: 'replace', path, node: b }]; // different type: rebuild subtree
  const ops = [];
  const set = {}, remove = [];
  for (const k of Object.keys(b.props)) if (a.props[k] !== b.props[k]) set[k] = b.props[k];
  for (const k of Object.keys(a.props)) if (!(k in b.props)) remove.push(k);
  if (Object.keys(set).length || remove.length) ops.push({ op: 'props', path, set, remove });
  const common = Math.min(a.children.length, b.children.length);
  for (let i = 0; i < common; i++) ops.push(...diff(a.children[i], b.children[i], [...path, i]));
  for (let i = common; i < b.children.length; i++) ops.push({ op: 'append', path, node: b.children[i] });
  for (let i = a.children.length - 1; i >= common; i--) ops.push({ op: 'remove', path: [...path, i] });
  return ops;
}

function apply(tree, ops) {
  let root = structuredClone(tree);
  const at = (path) => path.reduce((node, i) => node.children[i], root);
  for (const op of ops) {
    if (op.op === 'replace') {
      if (op.path.length === 0) root = structuredClone(op.node);
      else at(op.path.slice(0, -1)).children[op.path[op.path.length - 1]] = structuredClone(op.node);
    } else if (op.op === 'props') {
      const n = at(op.path);
      Object.assign(n.props, op.set);
      op.remove.forEach((k) => delete n.props[k]);
    } else if (op.op === 'append') {
      at(op.path).children.push(structuredClone(op.node));
    } else if (op.op === 'remove') {
      at(op.path.slice(0, -1)).children.splice(op.path[op.path.length - 1], 1);
    }
  }
  return root;
}

// canonical JSON (sorted keys) so property order does not matter when comparing
const canon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map((key) => [key, v[key]])) : v));

const a = h('div', { class: 'card' }, h('h1', null, 'Hi'), h('p', null, 'x'));
const b = h('div', { class: 'card big', id: 'c1' }, h('h1', null, 'Hi'), h('span', null, 'x'), h('p', null, 'new'));
const ops = diff(a, b);
console.log(ops.map((o) => o.op + '@' + JSON.stringify(o.path)).join(' | '));
console.log('apply(a, diff(a, b)) equals b:', canon(apply(a, ops)) === canon(b));

const c = h('ul', null, h('li', null, '1'), h('li', null, '2'), h('li', null, '3'));
const d = h('ul', null, h('li', null, '1'));
console.log('shrinking list works:', canon(apply(c, diff(c, d))) === canon(d), JSON.stringify(diff(c, d).map((o) => o.path)));
console.log('type change at root works:', canon(apply(a, diff(a, h('section')))) === canon(h('section')));` },
      complexity: `<p>Time O(n) in the number of nodes visited (each pair is compared once), space O(depth + ops). This is exactly the O(n) heuristic React relies on; keyed children would add a Map from key to old child.</p>`,
      followUps: ['Add keyed children: match by props.key and emit move ops, then compare the op counts with positional matching on a reorder.', 'How would you batch the resulting DOM writes to avoid layout thrashing?']
    }
  });

  practice.push({
    title: 'Priority Scheduler: Urgent Work, Transitions, Restarts',
    level: 'Hard', tags: ['concurrent rendering', 'lanes', 'scheduler', 'simulation'], companies: ['Meta', 'Vercel'],
    statement: `<p>Simulate React's lane scheduling. Tasks: <code>{ id, lane: 'sync'|'default'|'transition', cost, arrive }</code> (all in ms). The scheduler works in slices of <code>slice</code> ms: lanes are ranked sync, then default, then transition (ties: earlier arrival first). A <b>sync</b> task runs to completion without being sliced. <b>default</b> and <b>transition</b> tasks work one slice at a time. If a transition has made progress and a different task is chosen, that progress is <b>wasted</b> and the transition restarts from zero when it runs again. A newly arriving transition <b>supersedes</b> (drops) every older pending transition; their progress counts as wasted. Return <code>{ commits: [{ id, t }], wasted }</code>, where <code>t</code> is when the task's work finished.</p>`,
    constraints: `1 ≤ tasks ≤ 1000, integer times, <code>slice ≥ 1</code>. Process arrivals whenever <code>arrive ≤ current time</code>; if nothing is pending, jump to the next arrival.`,
    example: `<p>tasks: T1 transition cost 20 at 0; S sync cost 3 at 10; T2 transition cost 20 at 10; slice = 5 gives ${H.c('g', 'commits [S@13, T2@33], wasted = 10')}. T1 had 10 ms of progress when T2 superseded it. S runs first and is never interrupted.</p>`,
    brute: { why: `<p>A first-come-first-served queue ignores priority: the sync (typing) task waits behind a 20 ms transition, the exact lag transitions are designed to prevent. It also never drops stale transitions, so the CPU renders results nobody will see.</p>`,
      code: `function scheduleBrute(tasks) {
  let t = 0; const commits = [];
  for (const task of [...tasks].sort((a, b) => a.arrive - b.arrive)) {
    t = Math.max(t, task.arrive) + task.cost;      // run in arrival order, no priorities, no slicing
    commits.push({ id: task.id, t });
  }
  return { commits, wasted: 0 };
}` },
    mcq: { q: 'Why does the sync task never get sliced in this model?', options: ['Slicing is too slow', 'Urgent input updates must finish immediately so the UI responds; React renders them synchronously', 'Because it has the lowest cost'], answer: 1, explain: 'SyncLane work (clicks, typing) is rendered without yielding. Time slicing only applies to concurrent lanes such as transitions and default updates.' },
    hints: [
      `<p>Hint 1: keep a list of pending tasks with a <code>left</code> field. Each loop iteration: admit arrivals, pick the most urgent task, run it for one slice (or fully if sync).</p>`,
      `<p>Hint 2: remember the task you ran last (<code>last</code>). If you now pick a different task and <code>last</code> is an unfinished transition with progress, add that progress to <code>wasted</code> and reset its <code>left</code>.</p>`,
      `<p>Hint 3: when a transition arrives, remove all pending transitions first (adding their progress, <code>cost - left</code>, to wasted). If nothing is pending and tasks remain, jump <code>t</code> to the next arrival.</p>`
    ],
    solution: {
      approach: `<p>An event loop over simulated time. Admit arrivals (superseding older transitions), sort pending by lane rank then arrival, and process one chunk of the winner: the whole remaining cost for sync, one slice otherwise. Track the previously worked task to detect pre-emption of a half-done transition. A task commits when its remaining work reaches zero.</p>`,
      code: { lang: 'js', run: true, code: `const RANK = { sync: 0, default: 1, transition: 2 };

function schedule(tasks, slice) {
  const incoming = tasks.map((x) => ({ ...x, left: x.cost, arrived: false }));
  const pending = [], commits = [];
  let t = 0, last = null, wasted = 0;

  while (incoming.some((x) => !x.arrived) || pending.length) {
    // admit everything that has arrived by now
    for (const x of incoming) {
      if (x.arrived || x.arrive > t) continue;
      x.arrived = true;
      if (x.lane === 'transition') {            // a newer transition makes older ones pointless
        for (let i = pending.length - 1; i >= 0; i--) {
          if (pending[i].lane === 'transition') {
            wasted += pending[i].cost - pending[i].left;
            if (last === pending[i]) last = null;
            pending.splice(i, 1);
          }
        }
      }
      pending.push(x);
    }
    if (!pending.length) {                      // idle: jump to the next arrival
      t = Math.min(...incoming.filter((x) => !x.arrived).map((x) => x.arrive));
      continue;
    }
    pending.sort((a, b) => RANK[a.lane] - RANK[b.lane] || a.arrive - b.arrive);
    const job = pending[0];

    // a half-done transition that gets pre-empted loses its progress
    if (last && last !== job && last.lane === 'transition' && last.left < last.cost && last.left > 0) {
      wasted += last.cost - last.left;
      last.left = last.cost;
    }
    last = job;

    const work = job.lane === 'sync' ? job.left : Math.min(slice, job.left);
    job.left -= work;
    t += work;
    if (job.left === 0) {
      commits.push({ id: job.id, t });
      pending.splice(pending.indexOf(job), 1);
      last = null;
    }
  }
  return { commits, wasted };
}

const tasks = [
  { id: 'T1', lane: 'transition', cost: 20, arrive: 0 },
  { id: 'S',  lane: 'sync',       cost: 3,  arrive: 10 },
  { id: 'T2', lane: 'transition', cost: 20, arrive: 10 }
];
console.log(JSON.stringify(schedule(tasks, 5)));  // commits S@13, T2@33, wasted 10` },
      complexity: `<p>Each loop iteration advances time by at least 1 ms of work or jumps to an arrival, so there are O(total cost / slice + n) iterations, each O(n log n) because of the sort. Fine for a simulation; real React uses lane bitmasks and a heap.</p>`,
      followUps: ['Add lane expiration: a transition pending for longer than X ms is treated as sync. What does that do to wasted work?', 'How does entangling two updates to the same state change which one is dropped?']
    }
  });

  practice.push({
    title: 'Which Suspense Fallbacks Are Visible at Time t?',
    level: 'Hard', tags: ['suspense', 'boundaries', 'recursion'], companies: ['Meta', 'Atlassian'],
    statement: `<p>A UI tree has three kinds of nodes: <code>{ type: 'box', children }</code> (plain wrapper), <code>{ type: 'boundary', name, children }</code> (a Suspense boundary) and <code>{ type: 'comp', name, readyAt }</code> (a component whose data arrives at time <code>readyAt</code>; before that it suspends). Write <code>visibleFallbacks(root, t)</code> returning the names of the boundaries currently showing their <b>fallback</b>, in tree order. Rules: a suspended component makes its <b>nearest</b> boundary ancestor show its fallback; a boundary whose own (non-nested) components are all ready shows its content, and its inner boundaries are evaluated independently; if a boundary shows its fallback, its inner boundaries are hidden and are not reported. If a component suspends with <b>no</b> boundary above it, return <code>['(whole page)']</code>.</p>`,
    constraints: `Up to 10<sup>4</sup> nodes, depth up to 100. A component suspends when <code>t &lt; readyAt</code>.`,
    example: `<p>boundary Page &gt; [comp Nav (ready 0), boundary Feed &gt; [comp Posts (ready 500)], boundary Side &gt; [comp Ads (ready 100)]]. At t = 50 gives ${H.c('y', '["Feed", "Side"]')}; at t = 200 gives ${H.c('y', '["Feed"]')}; at t = 600 gives ${H.c('g', '[]')}. Nav is ready, so Page itself never shows its fallback.</p>`,
    brute: { why: `<p>Treating every suspended component as blocking the whole page (one big spinner) is what you get with no boundaries or with a single boundary at the root. Users wait for the slowest piece before seeing anything, even though most of the page is ready.</p>`,
      code: `function visibleBrute(root, t) {
  // one global spinner: if anything anywhere is not ready, report the whole page
  const anySuspended = (n) => n.type === 'comp' ? t < n.readyAt : (n.children || []).some(anySuspended);
  return anySuspended(root) ? ['(whole page)'] : [];
}` },
    mcq: { q: 'Two sibling boundaries, A (ready at 100) and B (ready at 500). At t = 200, what shows?', options: ['Both fallbacks', 'Only B\'s fallback; A already shows content', 'The whole page waits'], answer: 1, explain: 'Each boundary is independent. A has resolved, B has not. That independence is why you place boundaries around separately loading sections.' },
    hints: [
      `<p>Hint 1: write a helper <code>blocks(node)</code> that asks "does something directly under this node (not behind another boundary) suspend?"</p>`,
      `<p>Hint 2: <code>blocks</code> recurses through boxes, returns <code>t &lt; readyAt</code> for components, and returns <code>false</code> for nested boundaries (they handle their own).</p>`,
      `<p>Hint 3: main walk: at a boundary, if any child blocks, push the name and do not go deeper; otherwise walk the children. Check the root-level case first with the same helper.</p>`
    ],
    solution: {
      approach: `<p>Two mutually recursive ideas. <code>blocks(n)</code> tells whether a subtree has a suspended component that is not shielded by an inner boundary. The main walk visits boundaries in order: if the boundary is blocked it reports its fallback and stops descending (its children are hidden behind the fallback); otherwise it continues into children, where inner boundaries make their own decisions. A suspension at the top, outside any boundary, blocks everything.</p>`,
      code: { lang: 'js', run: true, code: `function visibleFallbacks(root, t) {
  // true if something under n suspends and is NOT shielded by an inner boundary
  function blocks(n) {
    if (n.type === 'comp') return t < n.readyAt;
    if (n.type === 'boundary') return false;            // inner boundary handles its own children
    return (n.children || []).some(blocks);
  }
  if (blocks(root)) return ['(whole page)'];              // no boundary above the suspended component

  const out = [];
  function walk(n) {
    if (n.type === 'comp') return;
    if (n.type === 'boundary') {
      if ((n.children || []).some(blocks)) { out.push(n.name); return; } // fallback replaces all content
    }
    (n.children || []).forEach(walk);
  }
  walk(root);
  return out;
}

const ui = { type: 'boundary', name: 'Page', children: [
  { type: 'comp', name: 'Nav', readyAt: 0 },
  { type: 'boundary', name: 'Feed', children: [{ type: 'comp', name: 'Posts', readyAt: 500 }] },
  { type: 'boundary', name: 'Side', children: [{ type: 'comp', name: 'Ads', readyAt: 100 }] }
] };
for (const t of [50, 200, 600]) console.log('t=' + t, JSON.stringify(visibleFallbacks(ui, t)));
console.log(JSON.stringify(visibleFallbacks({ type: 'box', children: [{ type: 'comp', name: 'X', readyAt: 10 }] }, 0)));` },
      complexity: `<p>Time O(n) per query (each node visited a constant number of times; <code>blocks</code> can be memoised per boundary if you query many times), space O(depth).</p>`,
      followUps: ['What changes if the update happens inside a transition (old content stays visible)?', 'How would you report the time at which the last fallback disappears?']
    }
  });

  practice.push({
    title: 'Streaming SSR: In What Order Do Chunks Arrive?',
    level: 'Hard', tags: ['streaming ssr', 'suspense', 'ttfb', 'scheduling'], companies: ['Vercel', 'Meta'],
    statement: `<p>With streaming SSR the server first sends the HTML <b>shell</b> (all Suspense fallbacks) at t = 0, then sends each boundary's real HTML when it is ready. A boundary nested inside another can only be sent <b>after its parent</b> has been sent (its content lives inside the parent's content). Given <code>boundaries</code> as <code>[{ name, readyAt, parent }]</code> (<code>parent</code> is a name or <code>null</code>), return the list of chunks in send order as strings <code>'name@time'</code>, beginning with <code>'shell@0'</code>. A boundary's send time is <code>max(readyAt, parent's send time)</code>. Sort by time; break ties by the order in the input array.</p>`,
    constraints: `Up to 10<sup>4</sup> boundaries, parents always appear in the input before their children, names are unique.`,
    example: `<p>A ready 300 (no parent), B ready 100 (no parent), C ready 50 with parent A. Output ${H.c('g', '["shell@0", "B@100", "A@300", "C@300"]')}: C finished its data at 50 but must wait for A at 300; ties keep input order (A before C).</p>`,
    brute: { why: `<p>Classic (non-streaming) SSR waits for the slowest data before sending anything: the whole page would arrive at the max of all <code>readyAt</code> values (300 in the example) and the shell never gets a chance to paint early. Sorting by raw <code>readyAt</code> without the parent rule would send C at 50, which is impossible: its HTML does not exist yet in any sent content.</p>`,
      code: `function brute(boundaries) {
  const t = Math.max(0, ...boundaries.map((b) => b.readyAt));
  return ['page@' + t]; // everything waits for the slowest piece: worst TTFB, no early paint
}` },
    mcq: { q: 'What is the main benefit of streaming SSR compared with classic SSR?', options: ['The server uses less CPU in total', 'The shell and fast sections reach the browser before slow data is ready', 'It removes the need for hydration'], answer: 1, explain: 'Streaming improves TTFB and first paint because the server does not wait for the slowest query. CPU work and hydration are still needed.' },
    hints: [
      `<p>Hint 1: a boundary cannot be sent before its parent, so its send time is the max of its own readiness and its parent's send time.</p>`,
      `<p>Hint 2: because parents come first in the input, one pass with a Map from name to send time is enough; no recursion needed.</p>`,
      `<p>Hint 3: attach the original index to each chunk and sort by (time, index) so ties are stable. Put <code>shell@0</code> first.</p>`
    ],
    solution: {
      approach: `<p>One pass computes each send time as <code>max(readyAt, sendTime[parent])</code>. Then sort chunks by time with the input index as tie-breaker. The shell is always first at time 0 because it contains only fallbacks and needs no data.</p>`,
      code: { lang: 'js', run: true, code: `function streamOrder(boundaries) {
  const sendAt = new Map();
  const chunks = boundaries.map((b, index) => {
    const parentTime = b.parent ? sendAt.get(b.parent) : 0;   // parents are listed first
    const time = Math.max(b.readyAt, parentTime);              // cannot be sent before its parent
    sendAt.set(b.name, time);
    return { name: b.name, time, index };
  });
  chunks.sort((x, y) => x.time - y.time || x.index - y.index);
  return ['shell@0', ...chunks.map((c) => c.name + '@' + c.time)];
}

console.log(JSON.stringify(streamOrder([
  { name: 'A', readyAt: 300, parent: null },
  { name: 'B', readyAt: 100, parent: null },
  { name: 'C', readyAt: 50, parent: 'A' }
])));  // shell@0, B@100, A@300, C@300
console.log(JSON.stringify(streamOrder([])));  // shell@0` },
      complexity: `<p>Time O(n log n) for the sort, space O(n).</p>`,
      followUps: ['In real React the inner boundary is usually sent as a separate chunk once the parent content exists. What would break if C were sent before A?', 'How would you compute TTFB and the time of the last chunk from this list?']
    }
  });

  practice.push({
    title: 'Design the Rendering Strategy for an Online Store',
    level: 'Hard', tags: ['next.js', 'isr', 'ssr', 'streaming', 'architecture'], companies: ['Amazon', 'Flipkart', 'Shopify'],
    statement: `<p>You are the frontend lead for an online store with 3 million product pages, a home page with personalised recommendations, a search page, a cart/checkout flow and a seller dashboard. Using Next.js (App Router), choose a rendering strategy for each page type, say which parts need <code>Suspense</code>/client components, explain how price changes reach users, and name the metrics you would watch. Sketch the route configuration code.</p>`,
    constraints: `Traffic spikes 20x on sale days. Prices change thousands of times a day. SEO matters for products and search. Checkout and dashboard are behind login.`,
    example: `<p>${H.c('g', 'Product page')}: ISR with a long <code>revalidate</code> plus on-demand revalidation by tag when a price changes, live stock and personalised price in a <code>Suspense</code> hole. ${H.c('p', 'Dashboard')}: CSR with SWR/React Query. ${H.c('y', 'Search')}: SSR with caching of popular queries.</p>`,
    brute: { why: `<p>"Make everything SSR" is simple but expensive: every visit to a product page runs the database query and a render, so a 20x sale-day spike needs 20x the servers and TTFB suffers. "Make everything SSG" is impossible: 3 million pages cannot be rebuilt on every price change and the home page and cart must be per user. A single strategy cannot fit pages with such different needs.</p>`,
      code: { lang: 'jsx', check: false, code: `// Everything dynamic: simple, but the product page does a DB query + full render per visit
export const dynamic = 'force-dynamic';
export default async function Product({ params }) {
  const { id } = await params;
  const p = await db.product.find(id);
  return <ProductView product={p} />;
}` } },
    mcq: { q: 'How should a price change on one product appear on its ISR page within seconds?', options: ['Wait for the revalidate timer', 'Call revalidateTag/revalidatePath for that product when the price is saved', 'Rebuild the whole site'], answer: 1, explain: 'On-demand revalidation invalidates just that page (or tag) immediately, so the next visit regenerates it. Timers alone leave stale prices.' },
    hints: [
      `<p>Hint 1: group pages by who sees them and how often they change: static content, shared but changing content, per-user content, per-request content.</p>`,
      `<p>Hint 2: the product page is shared by everyone, so cache it (ISR, tagged). The live or personal bits go in dynamic holes so they do not poison the cache.</p>`,
      `<p>Hint 3: add the safety nets: on-demand revalidation, a CDN, monitoring of TTFB/LCP/INP and cache hit rate, plus a plan for the sale-day spike (pre-warm top products, stale-while-revalidate).</p>`
    ],
    solution: {
      approach: `<p><b>Product pages (millions):</b> ISR. Pre-render the top few thousand with <code>generateStaticParams</code> and generate the long tail on first visit (<code>dynamicParams = true</code>). Cache tags like <code>product-42</code>; when the price service saves a change it calls <code>revalidateTag('product-42')</code>, so freshness is seconds, not hours. A <code>revalidate</code> of a few minutes is the safety net if a webhook is missed. The shell (title, images, description, reviews summary) is shared HTML from the CDN. Live stock and the visitor's personalised price/delivery date are components that read cookies or call an API, wrapped in <code>&lt;Suspense fallback={skeleton}&gt;</code> (a streamed dynamic hole) so they never make the whole page dynamic. <b>Home page:</b> static shell (ISR, short revalidate) with the "recommended for you" row streamed (SSR) or fetched on the client from a Server Action/route handler. <b>Search:</b> SSR (depends on the query), stream filters and recommendations, cache popular queries in Redis/CDN with <code>s-maxage</code> plus stale-while-revalidate. <b>Cart/checkout:</b> dynamic SSR with Server Actions, because it is per user and security-sensitive; interactive form pieces are small Client Components. <b>Seller dashboard:</b> behind login, no SEO: a mostly CSR app (Client Components with React Query), charts lazy-loaded. <b>Metrics:</b> TTFB, LCP, INP (real users via CrUX/RUM), cache hit rate, ISR regeneration time and error rate, hydration error count. <b>Sale spike:</b> mostly served from cache (cheap), pre-warm the top products before the sale, protect the origin with request coalescing and the stale-while-revalidate behaviour.</p>`,
      code: { lang: 'jsx', check: false, code: `// app/product/[id]/page.js  -> ISR + tag-based invalidation + streamed live parts
import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';

const getProduct = (id) => unstable_cache(
  () => db.product.find(id),
  ['product', id],
  { tags: ['product-' + id], revalidate: 300 }      // safety net: at most 5 min stale
)();

export async function generateStaticParams() {
  const top = await db.product.topSellers(5000);     // pre-render the best sellers
  return top.map((p) => ({ id: String(p.id) }));
}

export default async function Product({ params }) {
  const { id } = await params;
  const product = await getProduct(id);              // cached, shared by everyone
  return (
    <>
      <ProductInfo product={product} />              {/* static shell, served from CDN */}
      <Suspense fallback={<PriceSkeleton />}>
        <PersonalPrice id={id} />                    {/* reads cookies: dynamic hole, streamed */}
      </Suspense>
      <Suspense fallback={<StockSkeleton />}>
        <LiveStock id={id} />                        {/* no-store fetch: always live */}
      </Suspense>
    </>
  );
}

// app/admin/actions.js  -> called when a price is saved
'use server';
import { revalidateTag } from 'next/cache';
export async function savePrice(id, price) {
  await db.product.update(id, { price });
  revalidateTag('product-' + id);                    // next visit regenerates just this product
}

// app/search/page.js -> SSR (depends on searchParams)
export default async function Search({ searchParams }) {
  const { q } = await searchParams;
  const results = await cachedSearch(q);              // short-lived cache for hot queries
  return <Results results={results} />;
}

// app/dashboard/layout.js -> behind auth, rendered mostly on the client
// 'use client' leaves with React Query; no SEO needed.` },
      complexity: `<p>Cost model: with ISR the origin sees roughly one render per product per revalidation, not one per visit, so a 20x spike hits the CDN/cache. Only dynamic holes, search and checkout scale with traffic.</p>`,
      followUps: ['Where would Partial Prerendering / Cache Components simplify this design?', 'What can go wrong if the personalised price is rendered inside the cached part?']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({ q: 'What are the two assumptions that make React\'s diffing algorithm O(n)?', options: ['Elements of different types produce different trees, and keys identify items among siblings', 'Only the first child is compared, and props are never compared', 'Components never re-render, and the DOM is rebuilt every time'], answer: 0, explain: 'React skips deep comparison when the type changes (it rebuilds that subtree) and uses keys to match list items by identity. Together they allow a single pass over the trees.' });
  quiz.push({ q: 'A <code>&lt;Counter /&gt;</code> with state sits inside a <code>&lt;div&gt;</code>. Next render the parent returns <code>&lt;section&gt;&lt;Counter /&gt;&lt;/section&gt;</code> instead. What happens to the counter\'s state?', options: ['It is preserved because Counter is the same component', 'It is reset: the parent element type changed, so the subtree is unmounted and remounted', 'It is copied to the new section'], answer: 1, explain: 'Reconciliation compares types top-down. div to section is a different type, so React destroys the old subtree (state included) and builds a new one.' });
  quiz.push({ q: 'Why is <code>key={index}</code> a bad choice for a list that can be reordered or filtered?', options: ['It is slower than random keys', 'The index identifies a position, not an item, so state and DOM get attached to the wrong data after changes', 'React throws an error'], answer: 1, explain: 'When items move or are removed, the same index now belongs to a different item. React reuses the old DOM node and state for it. Use a stable ID from the data.' });
  quiz.push({ q: 'Which statement about React Fiber is true?', options: ['Fiber moves rendering to a Web Worker', 'The render phase can be paused and resumed between units of work, but the commit phase is synchronous', 'Fiber makes the whole render faster in total CPU time'], answer: 1, explain: 'Fiber turns recursion into a loop over child/sibling/return pointers so rendering can yield between fibers. Commit (the DOM changes) always runs in one go. Total work is similar; responsiveness improves.' });
  quiz.push({ q: 'In React 18 with <code>createRoot</code>, a <code>setTimeout</code> callback calls <code>setA(1); setB(2); setC(3);</code>. How many renders does it cause?', options: ['3', '1', '0'], answer: 1, explain: 'Automatic batching groups all updates from the same tick, including those in timeouts, promises and native events. React 17 would render three times here.' });
  quiz.push({ q: 'The count is 0. A handler runs <code>setCount(count + 1)</code> three times. What is the count after the next render?', options: ['3', '1', '0'], answer: 1, explain: 'count is a snapshot (0) for the whole handler, so each call queues "set 1". The last one wins. Use <code>setCount(c =&gt; c + 1)</code> to get 3.' });
  quiz.push({ q: 'You want typing in a search box to stay smooth while a heavy list re-renders. Which update goes inside <code>startTransition</code>?', options: ['The setState that stores what is shown in the input box', 'The setState that feeds the expensive list', 'Both, so React treats everything as low priority'], answer: 1, explain: 'The controlled input value must stay urgent. Only the expensive derived update is marked as a transition, so React can interrupt it when the user types again.' });
  quiz.push({ q: 'How does a component signal to Suspense that its data is not ready (the classic contract)?', options: ['It returns null', 'It throws a Promise (or calls use(promise))', 'It sets a loading state to true in useEffect'], answer: 1, explain: 'React catches the thrown promise, shows the nearest Suspense fallback, and re-renders the component when the promise settles. use(promise) wraps this contract.' });
  quiz.push({ q: 'Which of these can a React Server Component do that a Client Component cannot?', options: ['Use useState', 'Await a database query directly in the component body', 'Attach an onClick handler'], answer: 1, explain: 'Server Components run only on the server, so they can be async and use databases, secrets and the file system. State, effects and event handlers need Client Components.' });
  quiz.push({ q: 'Which prop value cannot be passed from a Server Component to a Client Component?', options: ['A string or number', 'A plain object or Date', 'A regular function such as an inline onClick handler'], answer: 2, explain: 'Props crossing the boundary must be serializable. Ordinary functions are not (only Server Actions marked with use server can be passed).' });
  quiz.push({ q: 'A news homepage must be fast for everyone, shows the same content to all visitors, and can be up to 60 seconds old. Best strategy?', options: ['CSR', 'ISR with revalidate = 60', 'SSR on every request with no caching'], answer: 1, explain: 'Shared content that can be slightly stale is the textbook ISR case: instant cached responses plus a background refresh at most every 60 seconds.' });
  quiz.push({ q: 'What is the main cost of SSR compared with SSG, from the user\'s point of view?', options: ['No SEO', 'A slower time to first byte, because the server must render before responding', 'The page is never interactive'], answer: 1, explain: 'With SSR the server fetches data and renders HTML for each request, which delays the first byte. SSG serves a file that already exists.' });
  quiz.push({ q: 'Which line of render code is most likely to cause a hydration mismatch?', options: ['<code>const total = items.length * 2</code>', '<code>const t = new Date().toLocaleTimeString()</code> shown in the text', '<code>const id = useId()</code>'], answer: 1, explain: 'Time and time zone differ between server and browser. Plain arithmetic on props and useId are deterministic across both.' });
  quiz.push({ q: 'What is the difference between SSR and React Server Components?', options: ['They are the same thing', 'SSR produces HTML for all components on the server (still hydrating them all); RSC keeps some components server-only so their code never ships', 'RSC replaces hydration entirely for the whole page'], answer: 1, explain: 'SSR answers "when is HTML made?". RSC answers "which component code runs where?". They are combined in the Next.js App Router: server components render to payload, client components are SSR\'d and hydrated.' });
  quiz.push({ q: 'A user taps a button inside a Suspense boundary that has not hydrated yet (React 18+). What happens?', options: ['The tap is lost', 'React hydrates that boundary first (raising its priority) and then replays the tap', 'The whole page reloads'], answer: 1, explain: 'Selective hydration lets React prioritise the part the user interacts with and replay the recorded discrete event after hydration.' });

  /* =====================================================================
     INTERVIEW
     ===================================================================== */
  interview.push({ q: 'What is the virtual DOM and how does React use it?', level: 'B',
    a: `<p>The virtual DOM is a lightweight tree of plain JavaScript objects (React elements) that describes what the UI should look like. When state or props change, React re-runs the component and gets a <b>new</b> tree. It then <b>diffs</b> the new tree against the previous one and works out the smallest set of real DOM changes, and applies only those in the commit phase. The benefit is not that it is magically faster than hand-written DOM code, but that you write declarative code ("this is the UI for this state") and React figures out how to get there, batching DOM writes for you.</p>`,
    followUps: ['Is the virtual DOM always faster than direct DOM manipulation?', 'What would a framework without a virtual DOM (Svelte, Solid) do differently?'] });
  interview.push({ q: 'How does React\'s diffing (reconciliation) algorithm work, and why is it O(n)?', level: 'I',
    a: `<p>A fully general tree diff is O(n<sup>3</sup>), so React uses two heuristics. First, <b>elements of different types produce different trees</b>: if a <code>div</code> becomes a <code>section</code> or <code>&lt;A /&gt;</code> becomes <code>&lt;B /&gt;</code>, React unmounts the old subtree (destroying state) and mounts a new one without comparing children. If the type is the same, it keeps the instance, updates changed props and recurses into children. Second, <b>keys</b>: among siblings, keys tell React which child is which, so inserts, deletes and reorders are handled without rewriting every row. Because it only compares nodes at the same level in one pass, the cost is linear in the number of nodes.</p>`,
    followUps: ['What happens to state when the element type at a position changes?', 'What are the limits of this heuristic (e.g. moving a subtree to a different parent)?'] });
  interview.push({ q: 'Why do keys matter in lists, and why is index a bad key?', level: 'B',
    a: `<p>A key is the identity of a list item. React uses it to decide whether an item is the same as in the previous render (reuse its DOM node and state), is new, or was removed. With index keys the identity is the position, which changes when you insert, delete, filter or reorder, so React attaches old state and DOM (like typed input text, focus, animations) to the wrong data and does needless updates. Use a stable unique ID from the data. Random keys are worse: every render creates new identities so every row remounts. Index keys are acceptable only for static lists that never reorder, filter or change length.</p>`,
    followUps: ['How can you use a key to intentionally reset a component?', 'What happens with duplicate keys among siblings?'] });
  interview.push({ q: 'Explain React Fiber. Why was it introduced and what does it enable?', level: 'A',
    a: `<p>Before React 16 the reconciler was recursive: it walked the tree on the JavaScript call stack and could not stop until done, so big updates froze the page. Fiber is a rewrite where each component instance has a <b>fiber</b>, a plain object with <code>child</code>, <code>sibling</code>, <code>return</code>, props/state, flags and lanes. React walks fibers in a loop (beginWork going down, completeWork going up), so it can check <code>shouldYield()</code> between units, hand control to the browser, and resume later from the saved position. It also builds the new tree off-screen (work-in-progress) next to the current one (double buffering) and swaps pointers at commit. This enables time slicing, priorities (lanes), transitions, Suspense, and error boundaries. The render phase is interruptible and must be pure; the commit phase is synchronous.</p>`,
    followUps: ['Why does StrictMode render components twice in development?', 'Why must hooks be called in the same order every render?', 'What is the difference between the current tree and the work-in-progress tree?'] });
  interview.push({ q: 'What is automatic batching in React 18? Predict the renders: three setState calls inside a setTimeout.', level: 'I',
    a: `<p>Batching means React groups multiple state updates that happen in the same tick into one re-render. React 17 batched only inside React event handlers; updates in timeouts, promises or native listeners each caused a render. React 18 with <code>createRoot</code> batches <b>everywhere</b>, so three setState calls in one setTimeout produce exactly <b>one render</b> after the callback finishes. Remember the snapshot rule: state variables do not change inside the callback; setters queue updates. Use the updater form <code>setCount(c =&gt; c + 1)</code> when the next value depends on the previous one. If you need a synchronous DOM update you can opt out for one update with <code>flushSync</code>.</p>`,
    followUps: ['Why does console.log(count) right after setCount(count + 1) print the old value?', 'When would two updates in the same function still cause two renders?', 'How is flushSync different from a normal update?'] });
  interview.push({ q: 'Explain concurrent rendering. What changes for the developer?', level: 'A',
    a: `<p>Concurrent rendering lets React prepare a new UI in memory <b>without blocking</b> the main thread: it can start rendering, pause to handle more urgent work, abandon the work, or resume. It is enabled by <code>createRoot</code> and is used by features you opt into: <code>useTransition</code>/<code>startTransition</code>, <code>useDeferredValue</code>, Suspense for data, and streaming SSR. Each update gets a priority lane (sync for discrete events like clicks, default, transition, idle); the highest-priority lane renders first, and urgent updates can interrupt transition renders, which are then restarted. For the developer this means render functions must be <b>pure and idempotent</b> (they can run more than once), external mutable stores should use <code>useSyncExternalStore</code> to avoid tearing, and you decide which updates are urgent (typing) versus deferrable (filtering a huge list).</p>`,
    followUps: ['What is tearing and how does useSyncExternalStore prevent it?', 'Do transitions make the total work smaller?', 'What happens to an in-progress transition render when the user types again?'] });
  interview.push({ q: 'useTransition vs useDeferredValue vs debounce: when do you use each?', level: 'I',
    a: `<p><b>useTransition</b>: you own the state update; wrap the non-urgent <code>setState</code> in <code>startTransition</code> so React renders it at low priority and can interrupt it; you also get <code>isPending</code>. <b>useDeferredValue</b>: you receive a value (a prop) and cannot wrap the setter; it gives a lagging copy that is updated in a background render, so the heavy child should be memoized. <b>Debounce</b> waits N ms of silence before doing work at all: good for limiting <i>network requests</i>, but it does not make an expensive render interruptible and adds fixed delay. They combine well: debounce the fetch, transition the render. None of them reduce the cost of a single render, so for huge lists still virtualize.</p>`,
    followUps: ['Why must a controlled input value not be inside a transition?', 'What does isPending tell you and how would you show it?'] });
  interview.push({ q: 'How does Suspense work, and how does it interact with transitions and error boundaries?', level: 'A',
    a: `<p>A component that is not ready (data via <code>use(promise)</code> or a Suspense-enabled library, or code from <code>React.lazy</code>) throws a promise. React catches it, finds the nearest <code>&lt;Suspense&gt;</code> boundary, renders its <b>fallback</b> instead of that subtree, and retries rendering when the promise resolves. Boundaries are independent, so you can place them around separately loading sections. If the update that caused the suspension is inside a <b>transition</b>, React avoids replacing already visible content with a fallback; it keeps the old UI and sets <code>isPending</code> until the new UI is ready. Real errors (thrown Errors) are not handled by Suspense but by the nearest <b>error boundary</b>, so you usually pair them. On the server, Suspense enables streaming SSR: the shell with fallbacks is sent first and each boundary streams in as its data resolves, and on the client it enables selective hydration.</p>`,
    followUps: ['Why should the promise passed to use() be created outside render?', 'Where would you put Suspense boundaries in a dashboard with a fast and a slow widget?', 'What is the fallback throttle?'] });
  interview.push({ q: 'What are React Server Components and how do they differ from SSR?', level: 'A',
    a: `<p>Server Components are components that run only on the server (per request or at build time) and never ship their code to the browser. They can be <code>async</code>, read databases and secrets directly, and use heavy libraries at no bundle cost; their output is sent as an <b>RSC payload</b> (a serialized tree with references to client components). Client Components (<code>'use client'</code>) handle state, effects and events. <b>SSR</b> is different: it is about producing the initial <b>HTML</b> for the page on the server, and in classic SSR every component still ships to the browser to be hydrated. In the Next.js App Router both are combined: server components render to payload, client components are SSR'd to HTML once and hydrated, and only client components cost JavaScript. Benefits are smaller bundles, direct data access without API layers, and fewer client waterfalls.</p>`,
    followUps: ['What rules apply to props that cross the server/client boundary?', 'How can a client component render server components inside it?', 'What is a Server Action and what security checks does it need?', 'Where does \'use client\' belong in the tree and why low?'] });
  interview.push({ q: 'Compare CSR, SSR, SSG and ISR. How do you choose for a given page?', level: 'I',
    a: `<p>CSR builds HTML in the browser after JS and data load: fast first byte, slow content, weak SEO; good for logged-in dashboards. SSR renders HTML per request on the server: fresh and personalizable with good SEO, but slower TTFB and server cost. SSG renders at build time and serves from a CDN: fastest, but only as fresh as the last build and builds grow with page count. ISR is SSG plus background regeneration after a revalidate time or on demand: fast and almost fresh at large scale. Choose by asking: is it per-user (CSR/SSR)? Does it need SEO? How often does it change (days: SSG; minutes to hours: ISR; seconds or per query: SSR)? How many pages? Mixed designs are common: a cached static shell with streamed dynamic holes (Suspense, Partial Prerendering), or ISR page with a client-fetched live widget.</p>`,
    followUps: ['Which metrics (TTFB, LCP, INP) differ most between them?', 'How does a price change reach an ISR page immediately?', 'Why can personalising an ISR page leak data?'] });
  interview.push({ q: 'What is hydration, and what causes a hydration mismatch?', level: 'I',
    a: `<p>Hydration is the step where React, running in the browser, takes the HTML the server already produced and makes it interactive: it renders the component tree in memory, walks the existing DOM in order, verifies each node matches, adopts it (links DOM nodes to fibers, restores state, makes handlers work), without rebuilding the DOM. A mismatch happens when the first client render produces something different from the server HTML. Typical causes: <code>Date.now()</code>/time zone/locale formatting, <code>Math.random()</code> ids, branching on <code>typeof window</code>, reading <code>localStorage</code> in render, invalid HTML nesting that the parser rewrites, and browser extensions. React 18/19 recover from text/structure mismatches by client-rendering the nearest Suspense boundary or root (wasting the server HTML); attribute mismatches are only warned about in development. Fixes: make the first render deterministic and bring browser-only data in via <code>useEffect</code>, use <code>useId</code>, <code>useSyncExternalStore</code> with a server snapshot, fixed locale/timezone, or <code>suppressHydrationWarning</code> for a single harmless difference.</p>`,
    followUps: ['Does React attach an event listener to every element during hydration?', 'What is the hydration gap and how do you reduce it?', 'What is selective hydration?'] });
  interview.push({ q: 'How would you reduce hydration cost and improve INP on a content-heavy Next.js site?', level: 'E',
    a: `<p>First measure: use real-user INP/LCP/TBT data and the React Profiler or Chrome performance trace to see how much main-thread time hydration takes. Then reduce the work: (1) push <code>'use client'</code> down so most components are Server Components that are never hydrated and ship no JS; (2) lazy-load below-the-fold or interaction-only widgets with <code>next/dynamic</code> or <code>React.lazy</code> inside Suspense boundaries, so selective hydration handles them separately and later; (3) trim bundles (analyse with the bundle analyzer, replace heavy libraries, avoid shipping large JSON props that duplicate server data); (4) keep first-render work small and memoize expensive computation, move heavy work to a Web Worker; (5) use progressive enhancement: links and forms that work without JS; (6) consider hydrating on idle/visible/interaction for non-critical islands, and for extreme cases an islands or resumable architecture. Verify the improvement with field data, not just Lighthouse.</p>`,
    followUps: ['How do you detect hydration errors in production?', 'What is the trade-off of lazy hydration for SEO and UX?', 'When are Server Components not enough?'] });
  interview.push({ q: 'Walk me through what happens from a click on a button to the DOM update in React 18.', level: 'E',
    a: `<p>The browser fires a click; React has one listener per event type on the root container (event delegation), finds the fiber for the target and calls the <code>onClick</code> handler inside a discrete-event context. Calls to <code>setState</code> create update objects placed on the hook's queue, tagged with the <b>SyncLane</b> (click is urgent), and React schedules a render for the root, flushed in a microtask at the end of the event. The render phase runs <code>workLoopSync</code> because the lane is sync: it clones fibers into the work-in-progress tree (alternate), calls components with the new state, reconciles children (type, key), and marks flags on fibers that need DOM changes. Then the commit phase runs synchronously: before-mutation, mutation (real DOM writes), swap <code>root.current</code>, layout effects and refs. After paint, passive effects (<code>useEffect</code>) run (for discrete events React may flush them synchronously). If the update were in a transition, the render would use <code>workLoopConcurrent</code>, yield every ~5 ms, and be restartable.</p>`,
    followUps: ['Where do batching and lanes come into this flow?', 'When do useLayoutEffect and useEffect run relative to paint?', 'What would make this flow slow, and where would you look?'] });
  interview.push({ q: 'A Next.js page is slow to first byte after you moved a data fetch into the page. How do you investigate and fix it?', level: 'A',
    a: `<p>A slow TTFB after adding a server-side fetch usually means the route became dynamic (SSR) and the server now waits for the data before sending anything. Investigate: check the <code>next build</code> route table (static vs dynamic), look for request-time APIs like <code>cookies()</code>, <code>headers()</code>, <code>searchParams</code> or <code>no-store</code> fetches that opt the page into dynamic rendering, and time the data source (waterfalls from sequential <code>await</code>s are common). Fixes in order of impact: make the page static or ISR if the data is shared (<code>revalidate</code>, tags, on-demand revalidation); cache the data (<code>unstable_cache</code>, <code>use cache</code> in newer versions, or Redis); parallelize independent fetches with <code>Promise.all</code>; wrap slow parts in <code>Suspense</code> so the shell streams immediately; add loading UI (<code>loading.js</code>); and move personalised parts to dynamic holes or the client. Then verify TTFB and LCP with RUM.</p>`,
    followUps: ['What is a server-side waterfall and how do you spot it?', 'How does streaming change TTFB versus time to complete?', 'How would Partial Prerendering help here?'] });

  /* spread the correct answers around: rotate the options of each quiz question */
  quiz.forEach(function (q, i) {
    var n = q.options.length, k = i % n;
    if (!k) return;
    q.options = q.options.slice(k).concat(q.options.slice(0, k));
    q.answer = (q.answer - k + n) % n;
  });

  registerModule({
    id: 'fe12',
    title: 'React Internals & Rendering Strategies',
    intro: `<p>You already know how to <i>use</i> React. This module opens the hood. You will see how React decides <b>what to change</b> (virtual DOM and reconciliation), how it can <b>pause and resume</b> work (Fiber, time slicing, lanes, transitions, Suspense), how it <b>groups updates</b> (batching), and where the work happens: on the <b>server or the browser</b> (Server Components, CSR, SSR, SSG, ISR, hydration). These are the topics senior frontend and Next.js interviews love, because they separate people who copy patterns from people who understand why the patterns work.</p>
      <p>Every topic starts with an everyday analogy, then a visual you can step through, then small runnable JavaScript models (a tiny diff, a time-sliced work loop, a batching queue, a streaming scheduler) so you can <i>see</i> the idea work in plain code. At the end you get quiz questions, interview Q&amp;A with follow-ups, and 14 practice problems from "predict the output" to "design the rendering strategy for a store".</p>`,
    goals: [
      'Explain virtual DOM diffing, the two heuristics (type and key) and predict exactly what React keeps, replaces or moves for a given change',
      'Describe Fiber (child/sibling/return, work loop, render vs commit, double buffering) and why rendering can be paused but committing cannot',
      'Predict render counts and console output with automatic batching, state snapshots and updater functions',
      'Keep a UI responsive with useTransition, useDeferredValue and Suspense boundaries, and explain lanes and interruption',
      'Split an app into Server and Client Components, choose CSR, SSR, SSG or ISR for real pages in Next.js, and defend the choice with TTFB, LCP and INP',
      'Debug and fix hydration mismatches and reduce hydration cost'
    ],
    prereqs: `Frontend modules on React Fundamentals (fe08), React Hooks Deep Dive (fe09), State Management & Data Fetching (fe10) and Rendering Pipeline & Web Performance (fe11). Comfort with JavaScript closures, promises and the event loop (JS track) helps a lot.`,
    hours: 14,
    topics: topics,
    quiz: quiz,
    interview: interview,
    practice: practice
  });
})();
