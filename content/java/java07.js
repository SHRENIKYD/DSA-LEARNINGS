(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared little helpers for the visualizers ---------------- */
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function esc(s) { return H.esc(String(s)); }
  function clean(input) { return String(input === undefined || input === null ? '' : input).trim(); }
  function wordsOf(input, maxN, hint) {
    var s = clean(input);
    if (!s) throw new Error(hint);
    var w = s.split(/[\s,]+/).filter(function (x) { return x.length; });
    if (!w.length || w.length > maxN || w.some(function (x) { return x.length > 12 || !/^[A-Za-z0-9_]+$/.test(x); })) throw new Error(hint);
    return w;
  }
  function intsOf(input, minN, maxN, lo, hi, hint) {
    var s = clean(input);
    if (!s) throw new Error(hint);
    var a = s.split(/[\s,]+/).map(Number);
    if (a.length < minN || a.length > maxN || a.some(function (x) { return isNaN(x) || x !== Math.floor(x) || x < lo || x > hi; })) throw new Error(hint);
    return a;
  }
  /* Java's String.hashCode(): s[0]*31^(n-1) + ... + s[n-1], with int overflow */
  function jHash(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h;
  }
  /* HashMap.hash(): spread the high bits down, then index = hash & (capacity - 1) */
  function jBucket(s, cap) { var h = jHash(s); return ((h ^ (h >>> 16)) & (cap - 1)) >>> 0; }
  /* Iteration order of a HashSet/HashMap with default capacity 16 (valid while size <= 12, no resize).
     put()/add() APPEND a new key to the end of its bucket chain; merge()/compute()/computeIfAbsent()
     PREPEND it (that is what OpenJDK does) — so pass prepend = true for merge-based counting. */
  function hashOrder(keys, prepend) {
    var buckets = [];
    for (var b = 0; b < 16; b++) buckets.push([]);
    keys.forEach(function (k) { if (prepend) buckets[jBucket(k, 16)].unshift(k); else buckets[jBucket(k, 16)].push(k); });
    var out = [];
    buckets.forEach(function (bk) { bk.forEach(function (k) { out.push(k); }); });
    return out;
  }
  function out(text) {
    return { type: 'text', label: 'Console output', html: text ? '<code>' + esc(text).replace(/\n/g, '<br>') + '</code>' : '<span class="c-m">(nothing printed yet)</span>' };
  }
  function note(html, label) { return { type: 'text', label: label || 'Why', html: html }; }
  /* Turns a list of steps into visualizer frames for a fixed code listing.
     step = { l: line | [lines], cls, v: {vars}, hv: {name: cls}, vl: 'vars label', out: 'console', extra: [parts], narr } */
  function codeFrames(code, steps, label) {
    return steps.map(function (s) {
      var hl = {};
      [].concat(s.l === undefined ? [] : s.l).forEach(function (n) { hl[n] = s.cls || 'cur'; });
      var parts = [{ type: 'code', label: label || 'Code (highlighted line = running now)', lang: 'java', code: code, hl: hl }];
      if (s.v) parts.push({ type: 'vars', label: s.vl || 'Variables', vals: s.v, hl: s.hv || {} });
      (s.extra || []).forEach(function (p) { parts.push(p); });
      if (s.out !== undefined) parts.push(out(s.out));
      return { narr: s.narr, parts: parts };
    });
  }

  /* ======================================================================
     TOPIC 1 — The family tree: Iterable, Collection, List, Set, Queue, Deque, Map
     ====================================================================== */
  var HIER_C = [
    { id: 'Iterable', x: 50, y: 5 }, { id: 'Collection', x: 50, y: 19 },
    { id: 'List', x: 14, y: 34 }, { id: 'Set', x: 46, y: 34 }, { id: 'Queue', x: 78, y: 34 },
    { id: 'SortedSet', x: 42, y: 49 }, { id: 'Deque', x: 88, y: 49 }, { id: 'NavigableSet', x: 40, y: 63 },
    { id: 'ArrayList', x: 8, y: 80 }, { id: 'LinkedList', x: 24, y: 80 }, { id: 'TreeSet', x: 40, y: 80 },
    { id: 'HashSet', x: 54, y: 80 }, { id: 'PriorityQueue', x: 72, y: 80 }, { id: 'ArrayDeque', x: 91, y: 80 },
    { id: 'LinkedHashSet', x: 56, y: 94 }
  ];
  var HIER_M = [
    { id: 'Map', x: 50, y: 5 }, { id: 'SortedMap', x: 76, y: 19 }, { id: 'NavigableMap', x: 76, y: 33 },
    { id: 'HashMap', x: 24, y: 33 }, { id: 'LinkedHashMap', x: 24, y: 48 }, { id: 'TreeMap', x: 76, y: 48 }
  ];
  var PARENTS = {
    Collection: ['Iterable'], List: ['Collection'], Set: ['Collection'], Queue: ['Collection'], Deque: ['Queue'],
    SortedSet: ['Set'], NavigableSet: ['SortedSet'], ArrayList: ['List'], LinkedList: ['List', 'Deque'],
    TreeSet: ['NavigableSet'], HashSet: ['Set'], LinkedHashSet: ['HashSet'], PriorityQueue: ['Queue'], ArrayDeque: ['Deque'],
    SortedMap: ['Map'], NavigableMap: ['SortedMap'], HashMap: ['Map'], LinkedHashMap: ['HashMap'], TreeMap: ['NavigableMap']
  };
  var ADDS = {
    Iterable: 'the ability to be walked with a for-each loop (it hands out an <code>Iterator</code>).',
    Collection: 'a <b>bag of elements</b>: <code>add</code>, <code>remove(Object)</code>, <code>contains</code>, <code>size</code>, <code>isEmpty</code>, <code>stream()</code>.',
    List: '<b>positions</b>: every element has an index → <code>get(i)</code>, <code>set(i, x)</code>, <code>add(i, x)</code>, <code>remove(int)</code>, <code>indexOf</code>. Duplicates allowed.',
    Set: '<b>no duplicates</b>: adding an equal element (by <code>equals</code>) is ignored and <code>add</code> returns false.',
    Queue: '<b>waiting line</b>: <code>offer</code> at the back, <code>poll</code>/<code>peek</code> at the head.',
    Deque: '<b>double-ended</b> line: add/remove at <b>both</b> ends — also the modern stack (<code>push</code>/<code>pop</code>).',
    SortedSet: 'elements kept in <b>sorted order</b>: <code>first()</code>, <code>last()</code>, <code>headSet</code>, <code>tailSet</code>.',
    NavigableSet: '<b>nearest-neighbour</b> questions: <code>floor</code>, <code>ceiling</code>, <code>lower</code>, <code>higher</code>, <code>descendingSet</code>.',
    Map: 'a <b>dictionary</b> of key → value pairs: <code>put</code>, <code>get</code>, <code>containsKey</code>, <code>keySet</code>, <code>entrySet</code>. NOT a Collection!',
    SortedMap: 'keys kept in <b>sorted order</b>: <code>firstKey</code>, <code>lastKey</code>, <code>headMap</code>, <code>tailMap</code>.',
    NavigableMap: 'nearest keys: <code>floorKey</code>, <code>ceilingKey</code>, <code>floorEntry</code>, <code>descendingMap</code>.',
    ArrayList: 'a <b>resizable array</b> — O(1) <code>get(i)</code>, amortised O(1) add at the end.',
    LinkedList: 'a <b>doubly linked list</b> — it is BOTH a List and a Deque.',
    TreeSet: 'a <b>red-black tree</b> — sorted, O(log n) add/remove/contains.',
    HashSet: 'a <b>hash table</b> (really a HashMap with dummy values) — O(1) average, no order promise.',
    LinkedHashSet: 'a HashSet that also remembers <b>insertion order</b>.',
    PriorityQueue: 'a <b>binary min-heap</b> — <code>poll()</code> always gives the smallest.',
    ArrayDeque: 'a <b>circular array</b> — the fastest general stack and queue in the JDK.',
    HashMap: 'a <b>hash table</b> of buckets — O(1) average get/put, no order promise.',
    LinkedHashMap: 'a HashMap with a linked list through its entries → <b>insertion (or access) order</b>.',
    TreeMap: 'a <b>red-black tree</b> keyed by sorted keys — O(log n), range queries.'
  };
  var FACTS = {
    ArrayList: ['by index (insertion position)', 'yes', 'yes (many)', 'get(i) O(1); add end O(1)*; insert/remove middle O(n)'],
    LinkedList: ['by index (insertion position)', 'yes', 'yes', 'get(i) O(n); add/remove at ends O(1)'],
    HashSet: ['no promise', 'no', 'one null', 'add/contains/remove O(1) average'],
    LinkedHashSet: ['insertion order', 'no', 'one null', 'add/contains/remove O(1) average'],
    TreeSet: ['sorted', 'no', 'no (throws NPE)', 'add/contains/remove O(log n)'],
    PriorityQueue: ['heap order (only head is guaranteed)', 'yes', 'no (throws NPE)', 'offer/poll O(log n); peek O(1)'],
    ArrayDeque: ['insertion position (both ends)', 'yes', 'no (throws NPE)', 'add/remove at either end O(1)*'],
    HashMap: ['no promise', 'keys no / values yes', 'one null key, many null values', 'get/put O(1) average'],
    LinkedHashMap: ['insertion (or access) order', 'keys no / values yes', 'one null key, many null values', 'get/put O(1) average'],
    TreeMap: ['sorted by key', 'keys no / values yes', 'no null key (natural order)', 'get/put O(log n)']
  };
  function hierGraph(nodes, hl, ehl, tags, label, height) {
    return {
      type: 'graph', label: label, directed: true, height: height,
      nodes: nodes.map(function (n) { return { id: n.id, label: n.id, x: n.x, y: n.y, shape: 'box' }; }),
      edges: nodes.reduce(function (acc, n) { (PARENTS[n.id] || []).forEach(function (p) { acc.push([n.id, p]); }); return acc; }, []),
      hl: hl, ehl: ehl, tags: tags || {}
    };
  }

  topics.push({
    title: 'The Family Tree: Iterable → Collection → List / Set / Queue / Deque, and Map',
    analogy: `<p>Think of a big <b>supermarket chain's job descriptions</b>. "Staff member who can be listed on a roster" is the most general job (<b>Iterable</b>). "Shelf worker" (<b>Collection</b>) can put items in, take items out and count them. Then there are specialists: the <b>numbered-shelf keeper</b> (List — every item sits in slot 0, 1, 2…), the <b>no-duplicates stamp collector</b> (Set — the same stamp is never kept twice), the <b>checkout line</b> (Queue — first come, first served) and the <b>two-door line</b> (Deque — people can join or leave from either end). The <b>locker room with numbered keys</b> (Map — look up a locker by its key) is a different department altogether.</p>
<p>The <b>job description</b> is the <b>interface</b> (what you can ask for). The <b>actual person hired</b> is the <b>class</b> (ArrayList, HashSet, TreeMap…) — how the work really gets done.</p>`,
    explain: `<p>The <b>Java Collections Framework</b> (in <code>java.util</code>) is a set of ready-made containers. It has two layers:</p>
<ul>
<li><b>Interfaces</b> = promises about <i>behaviour</i>: <code>List</code>, <code>Set</code>, <code>Queue</code>, <code>Deque</code>, <code>Map</code>.</li>
<li><b>Implementations</b> = real classes that keep those promises in different ways: <code>ArrayList</code>, <code>LinkedList</code>, <code>HashSet</code>, <code>TreeSet</code>, <code>HashMap</code>, <code>ArrayDeque</code>, <code>PriorityQueue</code>…</li>
</ul>
${H.table(['Family', 'One-line promise', 'Everyday picture', 'Go-to class'], [
      ['<b>List</b>', 'ordered by position, duplicates OK', 'a numbered playlist', '<code>ArrayList</code>'],
      ['<b>Set</b>', 'no duplicates', 'guest list at a party', '<code>HashSet</code>'],
      ['<b>Queue</b>', 'take from the head', 'checkout line / to-do pile by priority', '<code>ArrayDeque</code>, <code>PriorityQueue</code>'],
      ['<b>Deque</b>', 'add/remove at both ends', 'a train you can couple from either side', '<code>ArrayDeque</code>'],
      ['<b>Map</b>', 'key → value lookup', 'a phone book', '<code>HashMap</code>']
    ])}
<p><b>Rule #1 — program to the interface.</b> Write <code>List&lt;String&gt; names = new ArrayList&lt;&gt;();</code>, not <code>ArrayList&lt;String&gt; names = …</code>. The left side says <i>what you need</i>; the right side says <i>which engine you picked</i>. Later you can swap the engine in one place. Method parameters should be as general as the method needs: a method that only loops over items should take <code>Collection&lt;T&gt;</code> or even <code>Iterable&lt;T&gt;</code>.</p>
<p><b>Rule #2 — Map is NOT a Collection.</b> A Collection holds single elements; a Map holds <i>pairs</i>. You reach a Map's contents through three <b>views</b>: <code>keySet()</code> (a Set), <code>values()</code> (a Collection) and <code>entrySet()</code> (a Set of <code>Map.Entry</code>).</p>
<p><b>Rule #3 — Collection vs Collections.</b> <code>Collection</code> (singular) is the interface. <code>Collections</code> (plural) is a utility class full of static helpers like <code>sort</code>, <code>reverse</code>, <code>max</code>. Same for <code>Array</code> (reflection) vs <code>Arrays</code> (helpers).</p>
<p><b>Quick-to-build, read-only collections</b> (Java 9+): <code>List.of(1, 2, 3)</code>, <code>Set.of("a", "b")</code>, <code>Map.of("k", 1)</code>. They are <b>unmodifiable</b> (any <code>add</code>/<code>put</code> throws <code>UnsupportedOperationException</code>), reject <code>null</code>, and <code>Set.of</code>/<code>Map.of</code> reject duplicate keys.</p>
<p><b>Java 21 bonus:</b> new <code>SequencedCollection</code> / <code>SequencedMap</code> interfaces give every ordered collection the same <code>getFirst()</code>, <code>getLast()</code>, <code>addFirst()</code>, <code>reversed()</code> methods.</p>`,
    clues: [
      '"store <b>unique</b> …" / "remove duplicates" / "have we seen this before?" → a <b>Set</b>',
      '"look up by id / name / key", "count how many times" → a <b>Map</b>',
      '"in the order they arrived", "first come first served" → a <b>Queue</b> (ArrayDeque); "always the smallest / most urgent next" → <b>PriorityQueue</b>',
      '"undo / back button / most recent first" → a stack → <b>Deque</b> (<code>ArrayDeque.push/pop</code>), not the legacy <code>Stack</code>',
      '"the method should accept any kind of list" → parameter type <code>List&lt;T&gt;</code> or <code>Collection&lt;T&gt;</code>, never <code>ArrayList&lt;T&gt;</code>',
      'Trick questions: "Is Map a Collection?" (no), "Collection vs Collections?" (interface vs utility class), "what does <code>List.of(…).add(x)</code> do?" (throws)'
    ],
    code: [`List<String> playlist = new ArrayList<>();      // List: positions, duplicates OK
playlist.add("intro"); playlist.add("song"); playlist.add("song");
Set<String> guests = new HashSet<>(playlist);    // Set: duplicates vanish
Queue<String> line = new ArrayDeque<>(playlist); // Queue: take from the head
Map<String, Integer> plays = new HashMap<>();    // Map: key -> value
for (String s : playlist) plays.merge(s, 1, Integer::sum);

System.out.println(playlist);        // [intro, song, song]
System.out.println(guests.size());   // 2
System.out.println(line.poll());     // intro
System.out.println(plays.get("song")); // 2

// Map is NOT a Collection, but it hands out three Collection "views"
Set<String> keys = plays.keySet();
Collection<Integer> counts = plays.values();
for (Map.Entry<String, Integer> e : plays.entrySet())
    System.out.println(e.getKey() + " -> " + e.getValue());

// Java 21 sequenced methods work on any ordered collection
List<Integer> nums = new ArrayList<>(List.of(3, 1, 4));
System.out.println(nums.getFirst() + " " + nums.getLast() + " " + nums.reversed()); // 3 4 [4, 1, 3]`],
    codeTitle: ['The five families in ten lines'],
    viz: {
      title: 'Climb the family tree of any collection class',
      input: 'LinkedList',
      inputLabel: 'Class name (ArrayList, LinkedList, HashSet, LinkedHashSet, TreeSet, PriorityQueue, ArrayDeque, HashMap, LinkedHashMap, TreeMap)',
      gen: function (input) {
        var name = clean(input);
        if (!FACTS[name]) throw new Error('Type one of: ArrayList, LinkedList, HashSet, LinkedHashSet, TreeSet, PriorityQueue, ArrayDeque, HashMap, LinkedHashMap, TreeMap');
        var isMap = /Map$/.test(name);
        var nodes = isMap ? HIER_M : HIER_C, height = isMap ? 56 : 100;
        var lbl = isMap ? 'The Map side (a separate tree — Map does NOT extend Collection)' : 'The Collection side (arrows = "extends / implements")';
        var frames = [];
        frames.push({ narr: 'Here is the whole family. Boxes in the top part are <b>interfaces</b> (promises); boxes in the bottom row are <b>classes</b> (real engines). We will start at <b>' + esc(name) + '</b> and climb upward, collecting every promise it keeps.', parts: [hierGraph(nodes, one(name, 'cur'), {}, one(name, 'start'), lbl, height)] });
        /* breadth-first climb up the parents */
        var seen = {}, order = [name], q = [name], hl = {}, ehl = {}, gained = [];
        seen[name] = 1;
        while (q.length) {
          var cur = q.shift();
          (PARENTS[cur] || []).forEach(function (p) { if (!seen[p]) { seen[p] = 1; order.push(p); q.push(p); } });
        }
        order.forEach(function (id, k) {
          hl[id] = 'ok';
          (PARENTS[id] || []).forEach(function (p) { if (seen[p]) ehl[id + '-' + p] = 'ok'; });
          var h2 = {}; Object.keys(hl).forEach(function (x) { h2[x] = hl[x] === 'ok' ? 'done' : hl[x]; }); h2[id] = 'cur';
          gained.push([id, ADDS[id]]);
          frames.push({
            narr: (k === 0 ? '<b>' + esc(name) + '</b> itself is ' : 'Next ancestor: <b>' + esc(id) + '</b> adds ') + ADDS[id],
            parts: [hierGraph(nodes, h2, JSON.parse(JSON.stringify(ehl)), one(id, k === 0 ? 'class' : 'interface'), lbl, height),
              { type: 'table', label: 'Promises collected so far', columns: ['Type', 'What it gives you'], rows: gained.map(function (g) { return [g[0], g[1].replace(/<[^>]*>/g, '')]; }), hl: one(gained.length - 1, 'ok') }]
          });
        });
        if (isMap) {
          frames.push({ narr: 'Notice: <b>Map</b> sits at the top of its own tree. It does <b>not</b> extend <code>Collection</code> or <code>Iterable</code>, so <code>for (x : map)</code> does not compile. Loop over a <b>view</b> instead: <code>map.keySet()</code>, <code>map.values()</code> or <code>map.entrySet()</code>.', parts: [hierGraph(nodes, one('Map', 'sel'), {}, one('Map', 'not a Collection'), lbl, height), { type: 'code', label: 'How to loop over a map', lang: 'java', code: 'for (Map.Entry<String, Integer> e : map.entrySet())\n    System.out.println(e.getKey() + "=" + e.getValue());', hl: { 1: 'ok' } }] });
        } else {
          frames.push({ narr: 'Because <b>' + esc(name) + '</b> is-a <b>' + order.slice(1).join('</b>, <b>') + '</b>, you can store it in a variable of ANY of those types. Choose the most general type that still has the methods you need — that is "programming to the interface".', parts: [hierGraph(nodes, hl, ehl, {}, lbl, height), { type: 'code', label: 'Each of these lines compiles', lang: 'java', code: order.filter(function (t) { return t !== 'Iterable'; }).map(function (t) { return t + '<String> c = new ' + name + '<>();'; }).join('\n') + '\nIterable<String> it = new ' + name + '<>();', hl: { 2: 'ok' } }] });
        }
        var f = FACTS[name];
        frames.push({ narr: 'Fact card for <b>' + esc(name) + '</b> — this is exactly what an interviewer expects you to rattle off.', parts: [{ type: 'table', label: name + ' fact card', columns: ['Question', 'Answer'], rows: [['Iteration order?', f[0]], ['Duplicates?', f[1]], ['null allowed?', f[2]], ['Key costs', f[3]]], hl: { 3: 'sel' } }, note(ADDS[name], 'Engine inside')] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Swap the engine in one line',
        html: `<p>Because the variable is typed as the interface, changing <code>ArrayList</code> to <code>LinkedList</code> touches exactly one line — every other line only uses <code>List</code> methods. If you had written <code>ArrayList&lt;String&gt; tasks</code> everywhere (fields, parameters, return types), the change would ripple through the whole codebase.</p>`,
        code: `List<String> tasks = new ArrayList<>();   // try: new LinkedList<>();
tasks.add("write");
tasks.add("test");
tasks.add(0, "plan");
System.out.println(tasks);        // [plan, write, test] with either engine`
      },
      {
        title: 'Predict the output: Collection.remove vs List.remove',
        html: `<p>Same object, two variable types, two different answers! <code>Collection</code> only has <code>remove(Object)</code>, so <code>c.remove(1)</code> autoboxes 1 and removes the <b>value</b> 1. <code>List</code> also has <code>remove(int index)</code>; the compiler prefers the exact <code>int</code> match, so <code>l.remove(1)</code> removes <b>index</b> 1 (the value 2).</p>
${H.table(['Line', 'Method chosen', 'Result'], [['<code>c.remove(1)</code>', 'remove(Object) — value', H.c('g', '[2, 3]')], ['<code>l.remove(1)</code>', 'remove(int) — index', H.c('r', '[1, 3]')]])}`,
        code: `Collection<Integer> c = new ArrayList<>(List.of(1, 2, 3));
c.remove(1);
System.out.println(c);   // [2, 3]
List<Integer> l = new ArrayList<>(List.of(1, 2, 3));
l.remove(1);
System.out.println(l);   // [1, 3]
l.remove(Integer.valueOf(1));
System.out.println(l);   // [3]`
      },
      {
        title: 'Read-only factories bite back',
        html: `<p><code>List.of</code>, <code>Set.of</code>, <code>Map.of</code> build <b>unmodifiable</b> collections. Three classic surprises: <b>mutation throws</b> <code>UnsupportedOperationException</code>; <b>null throws</b> <code>NullPointerException</code> (even <code>contains(null)</code> on <code>List.of</code>!); <b>duplicates</b> in <code>Set.of</code>/<code>Map.of</code> throw <code>IllegalArgumentException</code>. Wrap in <code>new ArrayList&lt;&gt;(…)</code> when you need to change it.</p>`,
        code: `List<Integer> fixed = List.of(1, 2, 3);
try { fixed.add(4); } catch (UnsupportedOperationException e) { System.out.println("add -> UOE"); }
try { Set.of("a", "a"); } catch (IllegalArgumentException e) { System.out.println("dup -> IAE"); }
try { List.of("x", null); } catch (NullPointerException e) { System.out.println("null -> NPE"); }
List<Integer> mutable = new ArrayList<>(fixed);
mutable.add(4);
System.out.println(mutable);   // [1, 2, 3, 4]`
      },
      {
        title: 'Java 21: first and last, the same way everywhere',
        html: `<p>Before Java 21, "get the last element" was <code>list.get(list.size() - 1)</code>, <code>deque.peekLast()</code>, <code>sortedSet.last()</code> — three spellings. Now every <b>sequenced</b> collection (List, Deque, LinkedHashSet, SortedSet) answers <code>getFirst()</code>, <code>getLast()</code> and <code>reversed()</code>, and LinkedHashMap/TreeMap answer <code>firstEntry()</code>, <code>lastEntry()</code>, <code>reversed()</code>.</p>`,
        code: `List<String> l = new ArrayList<>(List.of("a", "b", "c"));
Deque<String> d = new ArrayDeque<>(l);
LinkedHashSet<String> s = new LinkedHashSet<>(l);
System.out.println(l.getLast() + d.getLast() + s.getLast());   // ccc
LinkedHashMap<String, Integer> m = new LinkedHashMap<>();
m.put("x", 1); m.put("y", 2);
System.out.println(m.firstEntry() + " " + m.reversed());       // x=1 {y=2, x=1}`
      }
    ],
    deepDive: `<p><b>Why is Map outside the Collection tree?</b> <code>Collection.add(E)</code> takes one element; a map entry needs two. The designers (Josh Bloch, JDK 1.2) chose <b>views</b> instead: <code>keySet()</code>, <code>values()</code>, <code>entrySet()</code> are live windows onto the map — removing from <code>keySet()</code> removes the mapping; you cannot <code>add</code> to them (that throws).</p>
<p><b>Optional operations.</b> To avoid an explosion of interfaces (ModifiableList, FixedSizeList, AppendOnlyList…), mutators like <code>add</code>/<code>remove</code> are documented as "optional": an implementation may throw <code>UnsupportedOperationException</code>. That is why <code>Arrays.asList(arr)</code> lets you <code>set</code> (it writes through to the array) but not <code>add</code> (fixed size), and why <code>Collections.unmodifiableList</code> compiles fine yet throws at runtime. The type system cannot tell you — only the docs can.</p>
<p><b>Marker interface <code>RandomAccess</code>.</b> ArrayList implements it, LinkedList does not. Algorithms such as <code>Collections.binarySearch</code> and <code>Collections.shuffle</code> check <code>instanceof RandomAccess</code> to choose index-based or iterator-based code.</p>
<p><b>Skeletal classes.</b> <code>AbstractList</code>, <code>AbstractSet</code>, <code>AbstractMap</code> let you create a full collection by implementing just 2–3 methods (e.g. <code>get</code> + <code>size</code> for a read-only list).</p>
<p><b>Legacy classes to avoid:</b> <code>Vector</code>, <code>Stack</code>, <code>Hashtable</code> (JDK 1.0) synchronize every call and predate the framework. <code>Stack extends Vector</code> is a famous design mistake — it lets you <code>add(0, x)</code> underneath the top. Use <code>ArrayDeque</code> for stacks and <code>HashMap</code>/<code>ConcurrentHashMap</code> for maps.</p>
<p><b>Sequenced collections (JEP 431, Java 21)</b> were retrofitted into the middle of the tree: <code>List</code>, <code>Deque</code>, <code>SortedSet</code> and <code>LinkedHashSet</code> now implement <code>SequencedCollection</code>; <code>LinkedHashMap</code> and <code>SortedMap</code> implement <code>SequencedMap</code>. A side effect: a class that already had a conflicting <code>getFirst()</code> signature broke on upgrade — a real-world reminder that adding interface methods is not free.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants autocomplete <code>Map&lt;String, List&lt;Integer&gt;&gt; m = new HashMap&lt;&gt;();</code> before you finish typing, so the <i>typing</i> part of collections is free. The <i>choosing</i> part is not: models trained on old code still suggest <code>Vector</code>, <code>Stack</code> and <code>Hashtable</code>, declare parameters as <code>ArrayList</code>, or build a <code>List.of(…)</code> and then call <code>add</code> on it.</p>
<p><b>Use AI as a partner:</b> ask "<i>List every interface <code>TreeSet</code> implements in JDK 21</i>" — then verify in 10 seconds with <code>javap java.util.TreeSet</code> or your IDE's type hierarchy (IntelliJ: <kbd>Ctrl</kbd>+<kbd>H</kbd>). Ask it to "<i>refactor these signatures to the most general collection interface that still compiles</i>" and review each change.</p>
<p><b>What you must still own:</b> naming the family from the wording of a requirement (unique? ordered? keyed? FIFO?), knowing that Map is not a Collection, and spotting a read-only collection that will explode at runtime. Code review of AI output is where these bugs are caught.</p>`,
    problems: [{
      title: 'Capability Report: which families does it belong to?',
      level: 'Easy', tags: ['instanceof', 'interfaces', 'hierarchy'], companies: ['TCS', 'Infosys', 'Amazon'],
      statement: `<p>Write <code>String describe(Object o)</code> that returns the collection families <code>o</code> belongs to, in this fixed order, joined by commas: <code>List</code>, <code>Set</code>, <code>Queue</code>, <code>Deque</code>, <code>Map</code>. If it belongs to none, return <code>"none"</code>.</p>`,
      constraints: `<code>o</code> may be any object, including <code>null</code>, anonymous subclasses and wrappers such as <code>Collections.unmodifiableList(…)</code>.`,
      example: `<p><code>describe(new LinkedList&lt;&gt;())</code> → ${H.c('g', '"List,Queue,Deque"')} because LinkedList implements both <code>List</code> and <code>Deque</code> (and Deque extends Queue).<br><code>describe(new TreeMap&lt;&gt;())</code> → ${H.c('g', '"Map"')}; <code>describe("hi")</code> → ${H.c('m', '"none"')}.</p>`,
      brute: {
        why: `<p>A lookup table on the <b>class name</b> works for the handful of classes you typed in, but breaks for everything else: a subclass of ArrayList, an anonymous <code>new HashMap&lt;&gt;() {{ … }}</code>, <code>Collections.unmodifiableList</code> (class name <code>UnmodifiableRandomAccessList</code>), <code>List.of</code> (<code>ListN</code>)… It ignores the whole point of interfaces.</p>`,
        code: `class Solution {
    String describe(Object o) {
        if (o == null) return "none";
        switch (o.getClass().getSimpleName()) {
            case "ArrayList": return "List";
            case "LinkedList": return "List,Queue,Deque";
            case "HashSet": case "TreeSet": case "LinkedHashSet": return "Set";
            case "ArrayDeque": return "Queue,Deque";
            case "PriorityQueue": return "Queue";
            case "HashMap": case "TreeMap": case "LinkedHashMap": return "Map";
            default: return "none";   // wrong for every class not listed!
        }
    }
}`
      },
      mcq: { q: 'Which check correctly detects "is this a queue" for both <code>ArrayDeque</code> and <code>LinkedList</code>?', options: ['<code>o instanceof Queue</code>', '<code>o.getClass() == Queue.class</code>', '<code>o.getClass().getSimpleName().contains("Queue")</code>', '<code>o instanceof PriorityQueue</code>'], answer: 0, explain: '<code>instanceof</code> follows the whole type hierarchy (Deque extends Queue). <code>getClass()</code> is the concrete class, never an interface, and name matching misses ArrayDeque/LinkedList.' },
      hints: [
        `<p>Hint 1: Ask "is-a" questions about <b>interfaces</b>, not names. <code>instanceof</code> walks the entire hierarchy for you, including wrappers and subclasses.</p>`,
        `<p>Hint 2: The families are independent yes/no checks — one object can be several (LinkedList is List AND Deque AND Queue). Use a <code>StringJoiner(",")</code> and add each family that matches.</p>`,
        `<p>Hint 3: Edge cases: <code>null instanceof X</code> is simply false (no exception), so null naturally yields "none". If the joiner is empty at the end, return "none". Recipe: 5 if-statements in the required order, then check <code>sj.length()</code>.</p>`
      ],
      solution: {
        approach: `<p>Five independent <code>instanceof</code> tests in the required order, collected with a <code>StringJoiner</code>. Because <code>instanceof</code> respects inheritance, every present and future implementation (including JDK-internal ones like <code>List.of</code>'s <code>ListN</code>) is classified correctly.</p>`,
        code: `class Solution {
    String describe(Object o) {
        StringJoiner sj = new StringJoiner(",");
        if (o instanceof List) sj.add("List");
        if (o instanceof Set) sj.add("Set");
        if (o instanceof Queue) sj.add("Queue");   // Deque extends Queue, so ArrayDeque/LinkedList match
        if (o instanceof Deque) sj.add("Deque");
        if (o instanceof Map) sj.add("Map");      // Map is its own tree
        return sj.length() == 0 ? "none" : sj.toString();
    }

    public static void main(String[] args) {
        Solution s = new Solution();
        System.out.println(s.describe(new LinkedList<Integer>()));            // List,Queue,Deque
        System.out.println(s.describe(Collections.unmodifiableList(new ArrayList<>()))); // List
        System.out.println(s.describe(new TreeMap<String, Integer>()));       // Map
        System.out.println(s.describe(null));                                 // none
    }
}`,
        dry: { head: ['Input', 'List?', 'Set?', 'Queue?', 'Deque?', 'Map?', 'Result'], rows: [
          ['new LinkedList()', 'yes', 'no', 'yes', 'yes', 'no', '<span class="c-g">List,Queue,Deque</span>'],
          ['new ArrayDeque()', 'no', 'no', 'yes', 'yes', 'no', 'Queue,Deque'],
          ['new TreeSet()', 'no', 'yes', 'no', 'no', 'no', 'Set'],
          ['Map.of()', 'no', 'no', 'no', 'no', 'yes', 'Map'],
          ['null', 'no', 'no', 'no', 'no', 'no', '<span class="c-m">none</span>']
        ] },
        complexity: `<p>O(1) time and space — five type checks. The JVM makes <code>instanceof</code> against an interface very cheap (cached secondary-supertype checks).</p>`,
        followUps: ['Also report "Sorted" for SortedSet/SortedMap instances.', 'How would Java 21 pattern matching (<code>switch (o) { case List&lt;?&gt; l -&gt; … }</code>) change this — and why would a switch be WRONG here when one object matches several cases?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Lists: ArrayList vs LinkedList
     ====================================================================== */
  topics.push({
    title: 'Lists: ArrayList vs LinkedList (and the Real Cost of Each Operation)',
    analogy: `<p><b>ArrayList is a bookshelf with numbered slots.</b> Want book #7? Walk straight to slot 7 — instant. Want to squeeze a new book into slot 2? Every book from slot 2 onward must slide one place right. When the shelf is full you buy a bigger shelf (1.5× as long) and move every book across.</p>
<p><b>LinkedList is a treasure hunt.</b> Each clue (node) tells you where the next and previous clues are. Adding a clue in the middle is just rewriting two notes — <i>but only once you are standing there</i>. To reach clue #7 you must follow the trail from the start (or from the end) one clue at a time.</p>`,
    explain: `<p>A <code>List</code> keeps elements <b>in positions</b> 0, 1, 2… and allows duplicates. The two classic engines are:</p>
${H.table(['Operation', 'ArrayList (resizable array)', 'LinkedList (doubly linked nodes)'], [
      ['<code>get(i)</code> / <code>set(i, x)</code>', H.c('g', 'O(1) — jump to slot i'), H.c('r', 'O(n) — walk from the nearer end')],
      ['<code>add(x)</code> at the end', H.c('g', 'O(1) amortised (sometimes grows)'), H.c('g', 'O(1)')],
      ['<code>add(0, x)</code> / <code>remove(0)</code>', H.c('r', 'O(n) — shift everything'), H.c('g', 'O(1)')],
      ['<code>add(i, x)</code> / <code>remove(i)</code> in the middle', 'O(n) shifting (but a very fast memory copy)', 'O(n) walking (slow pointer chasing) + O(1) relink'],
      ['<code>contains(x)</code> / <code>indexOf(x)</code>', 'O(n) scan', 'O(n) scan'],
      ['Memory per element', '≈ 4–8 bytes (one reference) + spare slots', '≈ 24 bytes node (prev, next, item) — 3–6× more'],
      ['Also a…', '<code>RandomAccess</code> list', '<code>Deque</code> (queue/stack at both ends)']
    ])}
<p><b>Default answer: use <code>ArrayList</code>.</b> It wins nearly every real benchmark because its data sits side by side in memory, which CPUs love (cache-friendly). Even "insert in the middle" is usually faster on ArrayList, because LinkedList spends its time <i>walking</i> to the middle. For add/remove at both ends use <code>ArrayDeque</code>, not LinkedList.</p>
<p><b>Everyday List methods</b> you should know cold: <code>add(x)</code>, <code>add(i, x)</code>, <code>get(i)</code>, <code>set(i, x)</code> (returns the old value), <code>remove(int index)</code>, <code>remove(Object o)</code>, <code>indexOf</code>, <code>lastIndexOf</code>, <code>contains</code>, <code>size</code>, <code>isEmpty</code>, <code>clear</code>, <code>subList(from, to)</code>, <code>sort(cmp)</code>, <code>removeIf(pred)</code>, <code>replaceAll(op)</code>, <code>toArray</code>.</p>
<p><b>The #1 List trap:</b> on a <code>List&lt;Integer&gt;</code>, <code>list.remove(1)</code> removes <b>index 1</b>; to remove the <b>value</b> 1 write <code>list.remove(Integer.valueOf(1))</code>.</p>
<p><b>Building lists:</b> <code>new ArrayList&lt;&gt;()</code> (empty, grows), <code>new ArrayList&lt;&gt;(1000)</code> (pre-sized — no regrowth), <code>new ArrayList&lt;&gt;(otherCollection)</code> (copy), <code>List.of(…)</code> (read-only), <code>Arrays.asList(arr)</code> (fixed-size view of an array).</p>`,
    clues: [
      '"access the k-th element", "random access", "binary search on the list" → <b>ArrayList</b> (O(1) <code>get</code>)',
      '"insert at the front many times" → not ArrayList.add(0, x) (O(n) each, O(n²) total) — use <b>ArrayDeque.addFirst</b> or append then reverse',
      '"remove all elements that…" while scanning → <code>removeIf</code> (one O(n) pass), never <code>remove(i)</code> in a loop',
      '"LinkedList vs ArrayList — which is faster for inserts?" → it depends on WHERE; walking to the middle costs O(n) in LinkedList too',
      '<code>List&lt;Integer&gt;</code> + <code>remove(…)</code> in the question → check index vs value overload',
      '"N up to 10<sup>7</sup> numbers, memory limit" → avoid <code>List&lt;Integer&gt;</code> boxing; use <code>int[]</code>'
    ],
    code: [`List<String> names = new ArrayList<>(List.of("Asha", "Ben", "Chen"));
names.add("Dev");                 // [Asha, Ben, Chen, Dev]      end: O(1) amortised
names.add(1, "Bo");               // [Asha, Bo, Ben, Chen, Dev]  shifts 4 elements
String old = names.set(0, "Ana"); // returns "Asha"
names.remove("Chen");             // by value (Object overload)
names.remove(0);                  // by index -> removes "Ana"
System.out.println(names + " old=" + old);    // [Bo, Ben, Dev] old=Asha
System.out.println(names.indexOf("Dev"));     // 2

LinkedList<Integer> ll = new LinkedList<>(List.of(1, 2, 3));
ll.addFirst(0);                   // O(1) at the head
ll.addLast(4);                    // O(1) at the tail
System.out.println(ll.getFirst() + " " + ll.get(2) + " " + ll); // 0 2 [0, 1, 2, 3, 4]

List<Integer> nums = new ArrayList<>(List.of(5, 8, 1, 6, 3));
nums.removeIf(n -> n % 2 == 0);   // [5, 1, 3]  one pass
nums.replaceAll(n -> n * 10);     // [50, 10, 30]
nums.sort(null);                  // natural order -> [10, 30, 50]
System.out.println(nums);`],
    codeTitle: ['Everyday List API'],
    viz: {
      title: 'Same operations, two engines: count the work',
      input: 'add 10, add 20, add 30, add 40, add 50, add 0 5, get 4, remove 1, set 2 99',
      inputLabel: 'Ops separated by commas: add X | add I X | get I | set I X | remove I',
      gen: function (input) {
        var hint = 'Use ops like: add 10, add 0 5, get 2, set 1 7, remove 0 (max 14 ops, list size ≤ 12, values -999..999)';
        var s = clean(input);
        if (!s) throw new Error(hint);
        var ops = s.split(/\s*,\s*/).filter(function (x) { return x.length; });
        if (!ops.length || ops.length > 14) throw new Error(hint);
        var a = [], cap = 4, totA = 0, totL = 0, frames = [];
        function alPart(hl, label) {
          var vals = a.slice();
          while (vals.length < cap) vals.push('·');
          return { type: 'array', label: label || ('ArrayList — backing array (capacity ' + cap + ', size ' + a.length + ')'), values: vals, hl: hl || {}, showIdx: true };
        }
        function llPart(hl, ptr) { return { type: 'list', label: 'LinkedList — nodes (head → tail)', values: a.length ? a.slice() : ['(empty)'], hl: hl || {}, ptr: ptr || {} }; }
        function vars(ca, cl) { return { type: 'vars', label: 'Work done (moves = elements copied/shifted, hops = nodes walked)', vals: { size: a.length, capacity: cap, 'AL this op': ca, 'LL this op': cl, 'AL total': totA, 'LL total': totL }, hl: { 'AL this op': ca > cl ? 'bad' : 'ok', 'LL this op': cl > ca ? 'bad' : 'ok' } }; }
        function hops(i, n) { return i < (n >> 1) ? i : n - 1 - i; }
        frames.push({ narr: 'Both lists start empty. To keep the picture small this demo starts the ArrayList with <b>capacity 4</b> (real Java uses 10 on the first add) but grows it with the <b>real rule</b>: new capacity = old + old/2 (×1.5).', parts: [alPart(), llPart(), vars(0, 0)] });
        ops.forEach(function (op) {
          var t = op.trim().split(/\s+/), name = t[0].toLowerCase(), n = t.slice(1).map(Number);
          if (n.some(function (x) { return isNaN(x) || x !== Math.floor(x) || Math.abs(x) > 999; })) throw new Error(hint);
          var ca = 0, cl = 0, hlA = {}, hlL = {}, ptrL = {}, narr = '', k;
          if (name === 'add' && (n.length === 1 || n.length === 2)) {
            var idx = n.length === 1 ? a.length : n[0], val = n.length === 1 ? n[0] : n[1];
            if (idx < 0 || idx > a.length) throw new Error('add I X: index must be 0..size (' + a.length + ')');
            if (a.length >= 12) throw new Error('Keep the list at 12 elements or fewer');
            var grew = '';
            if (a.length === cap) { var oc = cap; cap = cap + (cap >> 1); ca += a.length; grew = ' The array was <b>full</b> → allocate capacity ' + cap + ' (' + oc + ' + ' + oc + '/2) and <b>copy ' + a.length + '</b> elements across.'; }
            var shift = a.length - idx; ca += shift + 1;
            a.splice(idx, 0, val);
            for (k = idx + 1; k < a.length; k++) hlA[k] = 'win';
            hlA[idx] = 'ok'; hlL[idx] = 'ok';
            if (idx === a.length - 1) { cl = 1; ptrL[idx] = 'tail'; } else { cl = hops(idx, a.length - 1) + 1; for (k = 0; k < a.length; k++) if ((idx < ((a.length - 1) >> 1) && k < idx) || (idx >= ((a.length - 1) >> 1) && k > idx)) hlL[k] = 'win'; ptrL[idx] = 'new'; }
            narr = '<code>add(' + (n.length === 2 ? idx + ', ' : '') + val + ')</code>: ArrayList ' + (shift ? 'slides <b>' + shift + '</b> element(s) one place right (blue) to open slot ' + idx + '.' : 'drops it into the next free slot.') + grew + ' LinkedList ' + (idx === a.length - 1 ? 'links a new node after the tail — O(1).' : 'walks <b>' + hops(idx, a.length - 1) + '</b> node(s) from the nearer end (blue), then relinks two pointers.');
          } else if (name === 'get' && n.length === 1) {
            if (n[0] < 0 || n[0] >= a.length) throw new Error('get I: index must be 0..size-1');
            ca = 1; cl = hops(n[0], a.length) + 1; hlA[n[0]] = 'sel'; hlL[n[0]] = 'sel'; ptrL[n[0]] = 'i';
            for (k = 0; k < a.length; k++) if ((n[0] < (a.length >> 1) && k < n[0]) || (n[0] >= (a.length >> 1) && k > n[0])) hlL[k] = 'win';
            narr = '<code>get(' + n[0] + ')</code> → <b>' + a[n[0]] + '</b>. ArrayList computes the address directly (base + ' + n[0] + ' × slot size) — 1 step. LinkedList must hop <b>' + hops(n[0], a.length) + '</b> node(s) from the ' + (n[0] < (a.length >> 1) ? 'head' : 'tail') + ' (it picks the nearer end).';
          } else if (name === 'set' && n.length === 2) {
            if (n[0] < 0 || n[0] >= a.length) throw new Error('set I X: index must be 0..size-1');
            var oldv = a[n[0]]; a[n[0]] = n[1];
            ca = 1; cl = hops(n[0], a.length) + 1; hlA[n[0]] = 'ok'; hlL[n[0]] = 'ok'; ptrL[n[0]] = 'i';
            narr = '<code>set(' + n[0] + ', ' + n[1] + ')</code> replaces ' + oldv + ' and <b>returns the old value ' + oldv + '</b>. Same costs as get: 1 step vs ' + hops(n[0], a.length) + ' hop(s).';
          } else if (name === 'remove' && n.length === 1) {
            if (n[0] < 0 || n[0] >= a.length) throw new Error('remove I: index must be 0..size-1');
            var gone = a[n[0]], sh = a.length - 1 - n[0];
            cl = hops(n[0], a.length) + 1; ca = sh;
            a.splice(n[0], 1);
            for (k = n[0]; k < a.length; k++) hlA[k] = 'win';
            if (n[0] < a.length) ptrL[n[0]] = 'was ' + gone;
            narr = '<code>remove(' + n[0] + ')</code> removes <b>' + gone + '</b>. ArrayList slides the <b>' + sh + '</b> later element(s) left (blue) and nulls the last slot so the garbage collector can reclaim it. LinkedList walks to the node, then unlinks it (prev.next = next, next.prev = prev). Capacity does <b>not</b> shrink.';
          } else throw new Error(hint);
          totA += ca; totL += cl;
          frames.push({ narr: narr, parts: [alPart(hlA), llPart(hlL, ptrL), vars(ca, cl)] });
        });
        frames.push({ narr: 'Totals: ArrayList did <b>' + totA + '</b> units of work, LinkedList <b>' + totL + '</b>. But the units are not equal: ArrayList moves are one fast block copy (<code>System.arraycopy</code>) over neighbouring memory, while every LinkedList hop is a pointer chase that can miss the CPU cache. In real benchmarks ArrayList usually wins even when the counts look close.', parts: [alPart({}, 'ArrayList final state'), llPart(), vars(0, 0)] });
        frames.push({ narr: 'Rule of thumb: <b>ArrayList by default</b>; <b>ArrayDeque</b> when you work at both ends; <b>LinkedList</b> only when you insert/remove through a <code>ListIterator</code> you are already holding.', parts: [{ type: 'table', label: 'Cheat sheet', columns: ['Need', 'Pick'], rows: [['index access, append, iterate', 'ArrayList'], ['push/pop or offer/poll at the ends', 'ArrayDeque'], ['many edits at an iterator position', 'LinkedList (ListIterator.add/remove)'], ['millions of ints', 'int[] (no boxing)']], hl: { 0: 'ok' } }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Arrays.asList: a fixed-size window onto an array',
        html: `<p><code>Arrays.asList(arr)</code> does not copy — it wraps the array. <code>set</code> writes through to the array, but <code>add</code>/<code>remove</code> throw <code>UnsupportedOperationException</code> because an array cannot change length. Copy it into a real ArrayList when you need to grow it.</p>
${H.table(['Call', 'Works?', 'Why'], [['<code>view.set(0, "Z")</code>', H.c('g', 'yes, arr[0] becomes "Z"'), 'same storage'], ['<code>view.add("D")</code>', H.c('r', 'UnsupportedOperationException'), 'fixed size']])}`,
        code: `String[] arr = {"A", "B", "C"};
List<String> view = Arrays.asList(arr);
view.set(0, "Z");
System.out.println(arr[0]);            // Z  (write-through)
try { view.add("D"); } catch (UnsupportedOperationException e) { System.out.println("cannot grow"); }
List<String> real = new ArrayList<>(view);
real.add("D");
System.out.println(real);              // [Z, B, C, D]`
      },
      {
        title: 'Predict the output: subList is a live view',
        html: `<p><code>subList(from, to)</code> (from inclusive, to exclusive) returns a <b>view</b>, not a copy. Clearing the view removes that range from the original list — the idiomatic way to delete a range in one O(n) step. Structurally changing the <i>original</i> afterwards makes the view throw <code>ConcurrentModificationException</code> on next use.</p>
${H.arr([10, 20, 30, 40, 50], { label: 'before', hl: { 1: 'r', 2: 'r' } })} ${H.arr([10, 40, 50], { label: 'after subList(1, 3).clear()' })}`,
        code: `List<Integer> list = new ArrayList<>(List.of(10, 20, 30, 40, 50));
list.subList(1, 3).clear();
System.out.println(list);                         // [10, 40, 50]
List<Integer> top2 = new ArrayList<>(list.subList(0, 2)); // copy if you need to keep it
System.out.println(top2);                         // [10, 40]`
      },
      {
        title: 'The hidden O(n²): get(i) in a loop over a LinkedList',
        html: `<p>On an ArrayList the indexed loop is fine. On a LinkedList each <code>get(i)</code> walks from an end, so a loop of n gets costs about n²/4 hops: for n = 100 000 that is ~2.5 billion hops. The for-each loop uses an iterator that just follows <code>next</code> pointers — O(n) total for both lists. Moral: <b>iterate with for-each or an iterator</b>; keep indexing for ArrayList.</p>`,
        code: `List<Integer> linked = new LinkedList<>();
for (int i = 0; i < 1000; i++) linked.add(i);
long slow = 0;
for (int i = 0; i < linked.size(); i++) slow += linked.get(i); // O(n^2) on LinkedList
long fast = 0;
for (int x : linked) fast += x;                                // O(n) via iterator
System.out.println(slow == fast);                              // true, but very different cost`
      },
      {
        title: 'Front-inserts: O(n²) vs O(n)',
        html: `<p>Need the result in reverse arrival order? Calling <code>add(0, x)</code> on an ArrayList n times shifts 0 + 1 + … + (n−1) ≈ n²/2 elements. Better: <code>ArrayDeque.addFirst</code> (O(1) each), or append normally and call <code>Collections.reverse</code> once (O(n)).</p>
${H.table(['n', 'add(0,x) shifts', 'append + reverse'], [['1 000', '≈ 500 000', '≈ 1 500'], ['100 000', H.c('r', '≈ 5 000 000 000'), H.c('g', '≈ 150 000')]])}`,
        code: `List<Integer> out = new ArrayList<>();
for (int i = 1; i <= 5; i++) out.add(i);    // O(1) each
Collections.reverse(out);                     // one O(n) pass
System.out.println(out);                      // [5, 4, 3, 2, 1]
ArrayDeque<Integer> dq = new ArrayDeque<>();
for (int i = 1; i <= 5; i++) dq.addFirst(i);  // O(1) each
System.out.println(dq);                       // [5, 4, 3, 2, 1]`
      }
    ],
    deepDive: `<p><b>ArrayList growth.</b> <code>new ArrayList&lt;&gt;()</code> starts with a shared empty array; the first <code>add</code> allocates 10 slots. When full, it allocates <code>old + (old &gt;&gt; 1)</code> (≈1.5×) and copies with <code>Arrays.copyOf</code> → <code>System.arraycopy</code> (an intrinsic memmove). Capacities go 10 → 15 → 22 → 33 → 49… Total copying over n appends is bounded by a geometric series ≈ 2n–3n element moves, so each append is <b>amortised O(1)</b>. It never shrinks on its own — call <code>trimToSize()</code> after building a big, now-stable list. If you know the size, <code>new ArrayList&lt;&gt;(n)</code> or <code>ensureCapacity(n)</code> skips every regrowth.</p>
<p><b>Memory reality (64-bit JVM, compressed references).</b> ArrayList: ~4 bytes per slot plus up to 50% spare slots. LinkedList: each <code>Node</code> object has a 12-byte header + 3 references (item, next, prev) = 24 bytes, plus allocation pressure on the GC for every add. On top of that, a <code>List&lt;Integer&gt;</code> stores pointers to <code>Integer</code> objects (16 bytes each, except the cached −128..127), so a million ints cost ~20 MB in an ArrayList vs 4 MB in an <code>int[]</code>.</p>
<p><b>Why "O(1) insert" rarely helps LinkedList.</b> The O(1) is only for the <i>relink</i>; you still pay O(n) to <i>find</i> the spot, and each hop is a dependent memory load the CPU cannot prefetch. ArrayList's O(n) shift is a sequential copy that runs at memory bandwidth. Joshua Bloch, who wrote LinkedList, has joked that he never uses it. The one true win: holding a <code>ListIterator</code> and calling <code>add</code>/<code>remove</code> at its cursor repeatedly (e.g. splicing while scanning).</p>
<p><b>removeIf / removeAll on ArrayList</b> are O(n): they mark survivors and compact in one pass. A hand-written loop of <code>remove(i)</code> is O(n²). <b>Collections.binarySearch</b> on a LinkedList silently degrades to O(n) traversals (iterator-based) because it is not <code>RandomAccess</code>.</p>
<p><b>Thread safety:</b> neither is synchronized. Concurrent writers can lose updates or even corrupt the size; use <code>CopyOnWriteArrayList</code> (read-mostly), <code>Collections.synchronizedList</code>, or better, confine the list to one thread.</p>`,
    aiEra: `<p><b>What AI changes:</b> ask a chatbot "ArrayList or LinkedList for frequent insertions?" and it often recites the textbook answer: "LinkedList, O(1) inserts". You now know that is usually wrong in practice. AI is excellent for generating a <b>JMH benchmark</b> skeleton (<i>"write a JMH benchmark comparing add(size/2, x) on ArrayList vs LinkedList for n = 10k, 100k"</i>) — run it yourself and let data settle the argument.</p>
<p><b>Where AI goes wrong:</b> <code>list.remove(i)</code> inside a forward index loop (skips elements), <code>remove(int)</code> vs <code>remove(Object)</code> confusion on <code>List&lt;Integer&gt;</code>, calling <code>add</code> on <code>Arrays.asList</code> / <code>List.of</code>, and using <code>LinkedList</code> as a queue where <code>ArrayDeque</code> is better.</p>
<p><b>What you must still own:</b> estimating the cost of a loop (is that <code>get(i)</code> O(1) or O(n)?), knowing the overload rules, and explaining the cache-locality argument in an interview — the model can draft it, but you must be able to defend it live.</p>`,
    problems: [{
      title: 'Remove All Even Numbers — in One Pass',
      level: 'Easy', tags: ['ArrayList', 'removeIf', 'two pointers'], companies: ['Amazon', 'Accenture', 'Wipro'],
      statement: `<p>Given an <code>ArrayList&lt;Integer&gt;</code>, remove every even number <b>in place</b> (the same list object must end up holding only the odd numbers, in their original order). Do it in O(n) time.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>6</sup>; values fit in int; the list is mutable.`,
      example: `${H.arr([4, 7, 2, 9, 6, 3], { label: 'input', hl: { 0: 'r', 2: 'r', 4: 'r' } })}<p>Output ${H.c('g', '[7, 9, 3]')} — the red evens are gone and the odds keep their order.</p>`,
      brute: {
        why: `<p>Calling <code>list.remove(i)</code> for each even number shifts every later element left, so k removals cost O(k·n) — about O(n²) when half are even (10<sup>6</sup> → ~2.5·10<sup>11</sup> moves). It is also easy to get wrong: after removing index i, the next element slides into i, so a plain <code>i++</code> skips it (that is why the loop below walks backwards).</p>`,
        code: `class Solution {
    void removeEvens(List<Integer> list) {
        for (int i = list.size() - 1; i >= 0; i--) {   // backwards so removals don't skip elements
            if (list.get(i) % 2 == 0) list.remove(i);   // remove(int): O(n) shift each time
        }
    }
}`
      },
      mcq: { q: 'Why is a forward loop <code>for (i = 0; i &lt; size; i++) if (even) list.remove(i);</code> buggy on [2, 4, 5]?', options: ['After removing index 0, the 4 slides into index 0 and i moves on to 1 — the 4 is never checked', 'It throws ConcurrentModificationException', 'remove(i) removes the value i', 'It loops forever'], answer: 0, explain: 'Index loops do not use an iterator, so no CME — instead the shifting silently skips the element that moved into the freed slot. Result: [4, 5].' },
      hints: [
        `<p>Hint 1: Every removal shifts the tail. Instead of removing one at a time, think "keep the good ones and pack them to the front", like squeezing toothpaste.</p>`,
        `<p>Hint 2: Use a <b>write pointer</b> <code>w</code>: scan with <code>r</code>; when <code>list.get(r)</code> is odd, <code>list.set(w++, value)</code>. At the end, delete the leftover tail in one shot with <code>list.subList(w, size).clear()</code>. Or simply call <code>list.removeIf(x -&gt; x % 2 == 0)</code>, which does exactly this internally.</p>`,
        `<p>Hint 3: Edge cases: all even (w stays 0 → whole list cleared), none even (w == size → nothing cleared), negative numbers (<code>-3 % 2 == -1</code>, so test <code>% 2 == 0</code>, not <code>== 1</code>).</p>`
      ],
      solution: {
        approach: `<p><b>Compaction with a write pointer.</b> Read every element once; copy each odd value to the next "write" slot. Everything after the write pointer is junk, removed by one range clear. <code>removeIf</code> is the one-liner that does the same O(n) work for ArrayList.</p>`,
        code: `class Solution {
    void removeEvens(List<Integer> list) {
        int w = 0;                                   // next slot to write a survivor into
        for (int r = 0; r < list.size(); r++) {
            int v = list.get(r);
            if (v % 2 != 0) list.set(w++, v);        // keep odd values, packed to the front
        }
        list.subList(w, list.size()).clear();        // drop the leftover tail in one O(n) step
    }

    void removeEvensIdiomatic(List<Integer> list) {
        list.removeIf(x -> x % 2 == 0);              // same O(n) compaction inside ArrayList
    }

    public static void main(String[] args) {
        List<Integer> a = new ArrayList<>(List.of(4, 7, 2, 9, 6, 3));
        new Solution().removeEvens(a);
        System.out.println(a);                       // [7, 9, 3]
    }
}`,
        dry: { head: ['r', 'list[r]', 'odd?', 'action', 'w after', 'front of list'], rows: [
          ['0', '4', 'no', 'skip', '0', '[4, 7, 2, 9, 6, 3]'],
          ['1', '7', 'yes', 'set(0, 7)', '1', '[<span class="c-g">7</span>, 7, 2, 9, 6, 3]'],
          ['2', '2', 'no', 'skip', '1', '[7, 7, 2, 9, 6, 3]'],
          ['3', '9', 'yes', 'set(1, 9)', '2', '[7, <span class="c-g">9</span>, 2, 9, 6, 3]'],
          ['4', '6', 'no', 'skip', '2', '[7, 9, 2, 9, 6, 3]'],
          ['5', '3', 'yes', 'set(2, 3)', '3', '[7, 9, <span class="c-g">3</span>, 9, 6, 3]'],
          ['end', '', '', 'subList(3, 6).clear()', '3', '<span class="c-g">[7, 9, 3]</span>']
        ] },
        complexity: `<p>Time O(n): one read pass plus one tail clear. Extra space O(1). The brute force is O(n²) shifting.</p>`,
        followUps: ['What changes if the input is a LinkedList? (Use an <code>Iterator</code> and <code>it.remove()</code> — each removal is O(1) there.)', 'Keep only the first occurrence of each value, still in place.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — Sets: HashSet, LinkedHashSet, TreeSet
     ====================================================================== */
  topics.push({
    title: 'Sets: HashSet vs LinkedHashSet vs TreeSet',
    analogy: `<p>Three ways to run a <b>party guest list</b> where nobody may be listed twice:</p>
<ul><li><b>HashSet</b> — a wall of 16 pigeonholes. Each name is dropped into a hole picked by a quick formula on its letters. Checking "is Priya here?" means looking in just one hole — super fast — but reading the list out gives a jumbled order.</li>
<li><b>LinkedHashSet</b> — the same pigeonholes <i>plus</i> a ribbon tying the names together in the order they arrived. Fast lookups <i>and</i> arrival order.</li>
<li><b>TreeSet</b> — a carefully alphabetised binder. Every insert finds its exact alphabetical spot (a few comparisons), so reading it out is always sorted, and you can ask "who comes right before Meera?".</li></ul>`,
    explain: `<p>A <code>Set</code> stores <b>unique</b> elements. "Unique" means: no two elements are <code>equals()</code> to each other (TreeSet uses <code>compareTo</code>/<code>compare</code> == 0 instead). <code>add(x)</code> returns <code>true</code> if x was new and <code>false</code> if it was already there — a free "have I seen this before?" test.</p>
${H.table(['', 'HashSet', 'LinkedHashSet', 'TreeSet'], [
      ['Iteration order', H.c('r', 'no promise (bucket order)'), H.c('g', 'insertion order'), H.c('b', 'sorted (natural or Comparator)')],
      ['add / remove / contains', 'O(1) average', 'O(1) average', 'O(log n)'],
      ['Uniqueness decided by', '<code>hashCode</code> + <code>equals</code>', '<code>hashCode</code> + <code>equals</code>', '<code>compareTo</code> / <code>compare</code>'],
      ['null element', 'one allowed', 'one allowed', 'NPE (natural ordering)'],
      ['Extra powers', '—', 'first/last (Java 21)', '<code>first, last, floor, ceiling, lower, higher, headSet, tailSet, subSet, pollFirst</code>'],
      ['Built on', 'HashMap', 'LinkedHashMap', 'TreeMap (red-black tree)']
    ])}
<p><b>Set algebra</b> with bulk methods (they modify the receiver, so copy first):</p>
${H.table(['Math', 'Java', 'A = {1,2,3}, B = {2,3,4}'], [['A ∪ B', '<code>a.addAll(b)</code>', '{1,2,3,4}'], ['A ∩ B', '<code>a.retainAll(b)</code>', '{2,3}'], ['A − B', '<code>a.removeAll(b)</code>', '{1}'], ['B ⊆ A ?', '<code>a.containsAll(b)</code>', 'false']])}
<p><b>The golden rule:</b> if you put your own objects in a HashSet, they <b>must</b> override <code>equals</code> AND <code>hashCode</code> consistently (records do this for you). And never change a field used by <code>hashCode</code> while the object sits in the set — it becomes "lost" in the wrong pigeonhole.</p>
<p><b>Which one?</b> Need speed only → HashSet. Need to remember arrival order (dedupe but keep order) → LinkedHashSet. Need sorted output or "closest value" queries → TreeSet.</p>`,
    clues: [
      '"remove duplicates", "distinct", "unique visitors" → <b>Set</b>; "…and keep the original order" → <b>LinkedHashSet</b>',
      '"have we seen X before?" / "first repeated element" → <code>if (!seen.add(x))</code> on a HashSet',
      '"smallest element greater than x", "closest value", "next available slot" → <b>TreeSet.ceiling/floor/higher/lower</b>',
      '"print in sorted order" + "no duplicates" → <b>TreeSet</b> (or sort once at the end if you only need it sorted once)',
      '"common elements of two lists" → <code>retainAll</code> (intersection); "in A but not in B" → <code>removeAll</code>',
      'Custom objects "treated as duplicates when ids match" → override <b>equals and hashCode</b> (or use a record)'
    ],
    code: [`Set<String> hash = new HashSet<>(), linked = new LinkedHashSet<>(), tree = new TreeSet<>();
for (String w : "banana apple cherry apple date banana".split(" ")) {
    hash.add(w); linked.add(w); tree.add(w);
}
System.out.println(hash);    // [banana, date, apple, cherry]   (bucket order — never rely on it)
System.out.println(linked);  // [banana, apple, cherry, date]   (arrival order)
System.out.println(tree);    // [apple, banana, cherry, date]   (sorted)

Set<String> seen = new HashSet<>();
System.out.println(seen.add("x") + " " + seen.add("x"));   // true false

TreeSet<Integer> slots = new TreeSet<>(List.of(10, 20, 30, 40));
System.out.println(slots.floor(25) + " " + slots.ceiling(25));   // 20 30
System.out.println(slots.higher(40) + " " + slots.first());      // null 10
System.out.println(slots.headSet(30) + " " + slots.tailSet(30)); // [10, 20] [30, 40]
System.out.println(slots.descendingSet());                       // [40, 30, 20, 10]`],
    codeTitle: ['Three sets, one input'],
    viz: {
      title: 'Insert words into all three sets and watch the order',
      input: 'banana apple cherry apple date banana',
      inputLabel: 'Words (letters/digits, max 14 words, max 12 distinct)',
      gen: function (input) {
        var w = wordsOf(input, 14, 'Enter up to 14 words separated by spaces (letters/digits only)');
        var distinct = [];
        w.forEach(function (x) { if (distinct.indexOf(x) < 0) distinct.push(x); });
        if (distinct.length > 12) throw new Error('Use at most 12 distinct words (so the HashSet stays at capacity 16)');
        var ins = [], frames = [];
        function sorted() { return ins.slice().sort(function (p, q) { return p < q ? -1 : p > q ? 1 : 0; }); }
        function parts(cur, dup) {
          var hs = hashOrder(ins), ts = sorted();
          var bk = [];
          for (var b = 0; b < 16; b++) {
            var inB = ins.filter(function (k) { return jBucket(k, 16) === b; });
            if (inB.length) bk.push(['bucket ' + b, inB.join(' → ')]);
          }
          var hb = {};
          if (cur !== undefined) hb['bucket ' + jBucket(cur, 16)] = dup ? 'bad' : 'ok';
          return [
            { type: 'map', label: 'HashSet internals: 16 buckets (only non-empty shown)', entries: bk.length ? bk : [['(all 16 buckets)', 'empty']], hl: hb },
            { type: 'set', label: 'HashSet — prints in bucket order', items: hs.slice(), hl: cur !== undefined ? one(cur, dup ? 'bad' : 'ok') : {} },
            { type: 'set', label: 'LinkedHashSet — prints in arrival order', items: ins.slice(), hl: cur !== undefined ? one(cur, dup ? 'bad' : 'ok') : {} },
            { type: 'set', label: 'TreeSet — prints sorted', items: ts, hl: cur !== undefined ? one(cur, dup ? 'bad' : 'ok') : {} }
          ];
        }
        frames.push({ narr: 'Three empty sets. The HashSet starts with <b>16 buckets</b> (its default capacity). Each word goes to bucket <code>(h ^ (h &gt;&gt;&gt; 16)) &amp; 15</code>, where h = <code>word.hashCode()</code>.', parts: parts() });
        w.forEach(function (x) {
          var dup = ins.indexOf(x) >= 0;
          if (!dup) ins.push(x);
          var h = jHash(x), pos = sorted().indexOf(x);
          var narr = '<code>add("' + esc(x) + '")</code>: hashCode = ' + h + ' → bucket <b>' + jBucket(x, 16) + '</b>. ';
          narr += dup ? '<span class="c-r">Already present (equals() matched)</span> → <code>add</code> returns <b>false</b> in all three sets; nothing changes.' : 'New → returns <b>true</b>. LinkedHashSet appends it to the ribbon (position ' + (ins.length - 1) + '); TreeSet compares its way to sorted position ' + pos + ' (about log₂ n comparisons).';
          var f = { narr: narr, parts: parts(x, dup) };
          f.parts.push({ type: 'code', label: 'What runs', lang: 'java', code: 'boolean added = set.add("' + x + '");   // ' + (dup ? 'false' : 'true'), hl: { 1: dup ? 'bad' : 'ok' } });
          frames.push(f);
        });
        frames.push({ narr: 'Final print-out. Same elements, three different orders. HashSet order is just "bucket 0 first, then bucket 1…" — it can change with capacity, Java version, or even which method inserted the keys. <b>Never write code or tests that depend on HashSet order.</b>', parts: parts().concat([out('HashSet:       ' + '[' + hashOrder(ins).join(', ') + ']\nLinkedHashSet: [' + ins.join(', ') + ']\nTreeSet:       [' + sorted().join(', ') + ']')]) });
        return frames;
      }
    },
    examples: [
      {
        title: 'Predict the output: HashSet of small Integers "looks sorted"',
        html: `<p>An <code>Integer</code>'s hashCode is the number itself, so small non-negative numbers land in bucket = value (for capacity 16) and print in ascending order — by accident! Bigger numbers break the illusion: 17 goes to bucket 1, 64 to bucket 0, 30 to bucket 14.</p>
${H.table(['value', 'bucket = value &amp; 15'], [['30', '14'], ['5', '5'], ['17', '1'], ['2', '2'], ['64', '0']])}<p>Bucket order 0,1,2,5,14 → prints ${H.c('y', '[64, 17, 2, 5, 30]')}.</p>`,
        code: `Set<Integer> small = new HashSet<>(List.of(3, 1, 2));
System.out.println(small);                        // [1, 2, 3] — looks sorted, is not guaranteed
Set<Integer> big = new HashSet<>(List.of(30, 5, 17, 2, 64));
System.out.println(big);                          // [64, 17, 2, 5, 30]
System.out.println(new TreeSet<>(big));           // [2, 5, 17, 30, 64] — sorted on purpose`
      },
      {
        title: 'Custom objects: forget hashCode and duplicates sneak in',
        html: `<p>A class that overrides only <code>equals</code> still uses <code>Object.hashCode</code> (based on identity), so two "equal" points land in different buckets and the set keeps both. A <b>record</b> generates matching <code>equals</code>/<code>hashCode</code> from its fields automatically.</p>
${H.table(['Type', 'set.size() after adding (1,2) twice'], [['class with equals only', H.c('r', '2 (broken)')], ['record Pt(int x, int y)', H.c('g', '1')]])}`,
        code: `class BadPt {
    final int x, y;
    BadPt(int x, int y) { this.x = x; this.y = y; }
    @Override public boolean equals(Object o) {
        return o instanceof BadPt p && p.x == x && p.y == y;   // hashCode NOT overridden!
    }
}
record Pt(int x, int y) {}

class Demo {
    public static void main(String[] args) {
        Set<BadPt> bad = new HashSet<>(List.of(new BadPt(1, 2), new BadPt(1, 2)));
        Set<Pt> good = new HashSet<>();
        good.add(new Pt(1, 2)); good.add(new Pt(1, 2));
        System.out.println(bad.size() + " " + good.size());   // 2 1  (bad.size() is almost always 2)
    }
}`
      },
      {
        title: 'TreeSet with a Comparator: "equal" means compare == 0',
        html: `<p>A TreeSet sorted by string <b>length</b> treats "cat" and "dog" as duplicates because the comparator returns 0 — the second one is silently dropped! Add a tie-breaker (<code>thenComparing</code>) so the comparator is <b>consistent with equals</b>.</p>`,
        code: `Set<String> byLen = new TreeSet<>(Comparator.comparingInt(String::length));
byLen.addAll(List.of("cat", "dog", "horse", "ox"));
System.out.println(byLen);     // [ox, cat, horse]  — "dog" vanished!
Set<String> fixed = new TreeSet<>(Comparator.comparingInt(String::length).thenComparing(Comparator.naturalOrder()));
fixed.addAll(List.of("cat", "dog", "horse", "ox"));
System.out.println(fixed);     // [ox, cat, dog, horse]`
      },
      {
        title: 'TreeSet of numeric Strings sorts like a dictionary',
        html: `<p>Strings compare character by character, so "10" &lt; "100" &lt; "2" &lt; "9". If the values are numbers, store them as <code>Integer</code> or supply a comparator.</p>`,
        code: `System.out.println(new TreeSet<>(List.of("10", "9", "100", "2")));   // [10, 100, 2, 9]
System.out.println(new TreeSet<>(List.of(10, 9, 100, 2)));           // [2, 9, 10, 100]`
      }
    ],
    deepDive: `<p><b>A HashSet is a HashMap in disguise.</b> <code>HashSet.add(e)</code> is literally <code>map.put(e, PRESENT) == null</code> where <code>PRESENT</code> is one shared dummy Object. So everything about HashMap applies: default capacity 16, load factor 0.75 (resize to 32 when the 13th element arrives, which can reshuffle the iteration order), buckets that turn into red-black trees when a chain exceeds 8 entries (and the table is at least 64), and the bit-spreading step <code>h ^ (h &gt;&gt;&gt; 16)</code> so that high bits influence the bucket index. Details belong to the Collections Internals module.</p>
<p><b>LinkedHashSet</b> adds a doubly linked list through all entries (before/after pointers) — about 8 extra bytes per element — giving predictable insertion order and slightly faster iteration (it walks the list instead of scanning empty buckets). Re-adding an existing element does <b>not</b> move it.</p>
<p><b>TreeSet</b> is a <code>TreeMap</code> with dummy values: a red-black tree, height ≤ 2·log₂(n+1), so every operation is O(log n) with no hashing at all. That is why it needs a total order: <code>compareTo</code> must be consistent (transitive, antisymmetric). If <code>compare(a, b) == 0</code> the set treats a and b as the same element — even if <code>equals</code> says otherwise — which is how the "dog vanished" bug happens. <code>BigDecimal</code> is the classic real-world case: <code>new BigDecimal("1.0")</code> and <code>"1.00"</code> are not <code>equals</code> (different scale) but compare as 0 — a HashSet keeps both, a TreeSet keeps one.</p>
<p><b>Mutable keys</b> are poison: changing a field used in <code>hashCode</code> after insertion strands the element in its old bucket; <code>contains</code> then returns false and <code>remove</code> fails, a memory leak in long-lived caches. Same for TreeSet if you change a field the comparator reads.</p>
<p><b>EnumSet</b> deserves a mention: for enum elements it is a bit-vector (one <code>long</code> for ≤ 64 constants) — far faster and smaller than HashSet, iterates in declaration order. <b>Concurrent sets:</b> <code>ConcurrentHashMap.newKeySet()</code>, <code>ConcurrentSkipListSet</code> (sorted), <code>CopyOnWriteArraySet</code> (tiny, read-mostly).</p>`,
    aiEra: `<p><b>What AI changes:</b> asking "dedupe this list and keep order" gets you <code>new ArrayList&lt;&gt;(new LinkedHashSet&lt;&gt;(list))</code> or <code>list.stream().distinct().toList()</code> instantly — both correct. The risk is subtler: AI-written tests often <b>assert on HashSet print order</b> (<code>assertEquals("[a, b, c]", set.toString())</code>). They pass today and fail after a JDK upgrade or a resize. Flag them in review and compare sets with <code>assertEquals(Set.of(…), set)</code>.</p>
<p><b>Use AI as a partner:</b> "<i>Generate equals/hashCode for this class and explain which fields you used</i>", or better, "<i>can this be a record?</i>". Ask it for adversarial test data: "<i>give me two Strings with the same hashCode</i>" ("Aa" and "BB" — a classic).</p>
<p><b>What you must still own:</b> knowing that TreeSet equality is the comparator's, that HashSet order is not a contract, that mutable keys break sets, and choosing between O(1) hashing and O(log n) ordered navigation for the problem in front of you.</p>`,
    problems: [{
      title: 'Remove Duplicates but Keep First-Seen Order',
      level: 'Easy', tags: ['LinkedHashSet', 'HashSet', 'dedupe'], companies: ['Google', 'Flipkart', 'Capgemini'],
      statement: `<p>Given a <code>List&lt;String&gt;</code> of user ids from a log, return a new list with duplicates removed, keeping each id at the position of its <b>first</b> appearance.</p>`,
      constraints: `0 ≤ n ≤ 10<sup>6</sup>; ids are non-null strings.`,
      example: `<p>Input ${H.arr(['u7', 'u2', 'u7', 'u9', 'u2'], { hl: { 2: 'r', 4: 'r' } })} Output ${H.c('g', '[u7, u2, u9]')} — the red repeats are dropped, survivors keep their original relative order.</p>`,
      brute: {
        why: `<p>For each id, check <code>result.contains(id)</code> — a linear scan of the result list. That is O(n) per element, O(n²) overall: 10<sup>6</sup> ids → up to ~5·10<sup>11</sup> comparisons.</p>`,
        code: `class Solution {
    List<String> dedupe(List<String> ids) {
        List<String> result = new ArrayList<>();
        for (String id : ids)
            if (!result.contains(id)) result.add(id);   // O(n) scan each time
        return result;
    }
}`
      },
      mcq: { q: 'Which single collection gives O(1) "seen?" checks AND remembers first-insertion order?', options: ['LinkedHashSet', 'HashSet', 'TreeSet', 'ArrayList'], answer: 0, explain: 'HashSet forgets the order, TreeSet sorts (O(log n)), ArrayList has O(n) contains. LinkedHashSet = hash table + insertion-order linked list, and re-adding an existing element does not move it.' },
      hints: [
        `<p>Hint 1: The slow part is "have I already kept this id?". That is a membership question — a hash-based set answers it in O(1).</p>`,
        `<p>Hint 2: Either keep a <code>HashSet&lt;String&gt; seen</code> next to the result list (<code>if (seen.add(id)) result.add(id);</code>), or let a <code>LinkedHashSet</code> do both jobs at once.</p>`,
        `<p>Hint 3: Re-adding an existing element to a LinkedHashSet does not move it, so first-seen order is preserved automatically. Empty input → empty list. Recipe: <code>return new ArrayList&lt;&gt;(new LinkedHashSet&lt;&gt;(ids));</code></p>`
      ],
      solution: {
        approach: `<p>Use <code>seen.add(id)</code> as the test: it returns <code>true</code> only the first time. A LinkedHashSet combines the set and the order in one structure; the stream version <code>distinct()</code> also keeps encounter order for ordered streams.</p>`,
        code: `class Solution {
    List<String> dedupe(List<String> ids) {
        return new ArrayList<>(new LinkedHashSet<>(ids));   // O(n): hash set + insertion order
    }

    List<String> dedupeExplicit(List<String> ids) {
        Set<String> seen = new HashSet<>();
        List<String> result = new ArrayList<>();
        for (String id : ids)
            if (seen.add(id)) result.add(id);   // add() returns false for a repeat
        return result;
    }

    List<String> dedupeStream(List<String> ids) {
        return ids.stream().distinct().toList();   // ordered stream keeps first occurrence
    }

    public static void main(String[] args) {
        System.out.println(new Solution().dedupe(List.of("u7", "u2", "u7", "u9", "u2")));  // [u7, u2, u9]
    }
}`,
        dry: { head: ['id', 'seen before?', 'seen.add returns', 'result'], rows: [
          ['u7', 'no', 'true', '[u7]'],
          ['u2', 'no', 'true', '[u7, u2]'],
          ['u7', '<span class="c-r">yes</span>', 'false', '[u7, u2]'],
          ['u9', 'no', 'true', '[u7, u2, u9]'],
          ['u2', '<span class="c-r">yes</span>', 'false', '<span class="c-g">[u7, u2, u9]</span>']
        ] },
        complexity: `<p>Time O(n) average (each hash lookup O(1)), space O(n) for the set. Brute force is O(n²).</p>`,
        followUps: ['Keep the <b>last</b> occurrence instead of the first.', 'Case-insensitive dedupe ("U7" equals "u7") while printing the first original spelling.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Maps: HashMap, LinkedHashMap, TreeMap
     ====================================================================== */
  topics.push({
    title: 'Maps: HashMap vs LinkedHashMap vs TreeMap (and the Modern Map API)',
    analogy: `<p>A Map is a <b>coat check</b>. You hand over a coat (the <b>value</b>) and get a numbered ticket (the <b>key</b>). Later, the ticket alone gets your coat back instantly — nobody searches every hanger. Hand in a second coat with the <i>same</i> ticket number and the old coat is swapped out and returned to you (that is what <code>put</code> returns).</p>
<p>The three coat checks differ in how the rack is arranged: <b>HashMap</b> hangs coats by a quick formula on the ticket (fast, messy order), <b>LinkedHashMap</b> also keeps a ribbon in the order coats arrived, and <b>TreeMap</b> hangs them in ticket-number order so you can ask "what is the nearest ticket below 57?".</p>`,
    explain: `<p>A <code>Map&lt;K, V&gt;</code> stores <b>key → value</b> pairs with <b>unique keys</b> (values may repeat). Core API:</p>
${H.table(['Method', 'Meaning', 'Returns'], [
      ['<code>put(k, v)</code>', 'insert or overwrite', 'the <b>previous</b> value, or null'],
      ['<code>get(k)</code>', 'look up', 'value, or <b>null</b> if absent'],
      ['<code>getOrDefault(k, d)</code>', 'look up with a fallback', 'value or d'],
      ['<code>containsKey(k)</code> / <code>containsValue(v)</code>', 'membership', 'O(1) avg / O(n)!'],
      ['<code>putIfAbsent(k, v)</code>', 'insert only if missing', 'existing value or null'],
      ['<code>merge(k, v, fn)</code>', 'insert v, or combine old and v with fn', 'new value'],
      ['<code>computeIfAbsent(k, k -&gt; new …)</code>', 'create a value on first use', 'the (new or existing) value'],
      ['<code>remove(k)</code>', 'delete', 'removed value or null'],
      ['<code>keySet()</code>, <code>values()</code>, <code>entrySet()</code>', 'live views for looping', 'Set / Collection / Set']
    ])}
<p><b>Three idioms you will write in every interview:</b></p>
<ul><li><b>Counting:</b> <code>count.merge(word, 1, Integer::sum);</code></li>
<li><b>Grouping:</b> <code>groups.computeIfAbsent(key, k -&gt; new ArrayList&lt;&gt;()).add(item);</code></li>
<li><b>Looping:</b> <code>for (Map.Entry&lt;K, V&gt; e : map.entrySet())</code> — one lookup per entry, unlike <code>keySet()</code> + <code>get</code>.</li></ul>
${H.table(['', 'HashMap', 'LinkedHashMap', 'TreeMap'], [
      ['Key order when looping', H.c('r', 'no promise'), H.c('g', 'insertion (or access) order'), H.c('b', 'sorted by key')],
      ['get / put', 'O(1) avg', 'O(1) avg', 'O(log n)'],
      ['null key', 'one allowed', 'one allowed', 'NPE (natural order)'],
      ['Special powers', '—', 'access-order mode → LRU cache', '<code>firstKey, lastKey, floorKey, ceilingKey, headMap, tailMap, subMap, pollFirstEntry</code>']
    ])}
<p><b>Pick:</b> HashMap by default; LinkedHashMap when output order must match input order (or for LRU); TreeMap for sorted keys, ranges and "nearest key" lookups (time-series, price levels, calendars, grade bands).</p>`,
    clues: [
      '"count occurrences / frequency / most common" → <b>HashMap&lt;T, Integer&gt;</b> + <code>merge</code>',
      '"group by …" / "anagrams together" / "adjacency list" → <code>computeIfAbsent(k, x -&gt; new ArrayList&lt;&gt;())</code>',
      '"first unique / first non-repeating in order" → <b>LinkedHashMap</b> (counts + arrival order)',
      '"latest value at or before time t", "price level just below x", "which booking overlaps" → <b>TreeMap.floorEntry / ceilingKey</b>',
      '"two-sum / complement seen before" → HashMap value → index',
      '"output sorted by key" → TreeMap (or sort the entries once at the end)'
    ],
    code: [`Map<String, Integer> count = new HashMap<>();
for (String w : "to be or not to be".split(" "))
    count.merge(w, 1, Integer::sum);              // insert 1, or add 1 to the old count
System.out.println(count.get("be") + " " + count.getOrDefault("xyz", 0));   // 2 0

Map<Integer, List<String>> byLen = new TreeMap<>();
for (String w : List.of("ox", "cat", "dog", "horse"))
    byLen.computeIfAbsent(w.length(), k -> new ArrayList<>()).add(w);
System.out.println(byLen);                        // {2=[ox], 3=[cat, dog], 5=[horse]}

Map<String, Integer> stock = new LinkedHashMap<>();
System.out.println(stock.put("pen", 10));         // null (nothing before)
System.out.println(stock.put("pen", 7));          // 10   (old value returned)
stock.putIfAbsent("pen", 99);                     // ignored, key exists
stock.put("ink", 3);
for (Map.Entry<String, Integer> e : stock.entrySet())
    System.out.println(e.getKey() + "=" + e.getValue());   // pen=7, ink=3 (insertion order)

TreeMap<Integer, String> grade = new TreeMap<>(Map.of(0, "F", 40, "C", 60, "B", 80, "A"));
System.out.println(grade.floorEntry(73).getValue());        // B  (largest key <= 73)
System.out.println(grade.ceilingKey(61) + " " + grade.headMap(60));   // 80 {0=F, 40=C}`],
    codeTitle: ['Counting, grouping, ordered maps and floor lookups'],
    viz: {
      title: 'Word count with merge() in all three maps',
      input: 'the cat and the dog and the bird',
      inputLabel: 'Sentence (max 16 words, max 12 distinct)',
      gen: function (input) {
        var w = wordsOf(input, 16, 'Enter up to 16 words separated by spaces (letters/digits only)');
        var keys = [], cnt = {}, frames = [];
        w.forEach(function (x) { if (keys.indexOf(x) < 0) keys.push(x); });
        if (keys.length > 12) throw new Error('Use at most 12 distinct words');
        keys = [];
        function ents(order) { return order.map(function (k) { return [k, cnt[k]]; }); }
        function sorted() { return keys.slice().sort(function (p, q) { return p < q ? -1 : p > q ? 1 : 0; }); }
        var CODE = 'Map<String, Integer> count = new HashMap<>();\nfor (String w : words)\n    count.merge(w, 1, Integer::sum);\nSystem.out.println(count);';
        function parts(cur, isNew, line) {
          var h = cur === undefined ? {} : one(cur, isNew ? 'ok' : 'cur');
          return [
            { type: 'code', label: 'Code', lang: 'java', code: CODE, hl: one(line, isNew === false ? 'cur' : 'ok') },
            { type: 'map', label: 'HashMap (bucket order; merge() puts a NEW key at the FRONT of its bucket)', entries: ents(hashOrder(keys, true)), hl: h },
            { type: 'map', label: 'LinkedHashMap (insertion order)', entries: ents(keys), hl: h },
            { type: 'map', label: 'TreeMap (sorted keys)', entries: ents(sorted()), hl: h }
          ];
        }
        frames.push({ narr: 'Three empty maps. We will count words with <code>merge(w, 1, Integer::sum)</code>: if the key is missing, store 1; otherwise store <code>Integer.sum(old, 1)</code>.', parts: parts(undefined, undefined, 1) });
        w.forEach(function (x) {
          var isNew = keys.indexOf(x) < 0;
          if (isNew) { keys.push(x); cnt[x] = 1; } else cnt[x]++;
          frames.push({
            narr: '<code>merge("' + esc(x) + '", 1, Integer::sum)</code>: ' + (isNew ? '<b>new key</b> → value 1. HashMap drops it into bucket ' + jBucket(x, 16) + '; LinkedHashMap appends it; TreeMap places it in sorted position.' : 'key exists with ' + (cnt[x] - 1) + ' → <code>Integer.sum(' + (cnt[x] - 1) + ', 1)</code> = <b>' + cnt[x] + '</b>. Order does not change in any map.'),
            parts: parts(x, isNew, 3)
          });
        });
        var top = keys.slice().sort(function (p, q) { return cnt[q] - cnt[p] || (p < q ? -1 : 1); })[0];
        frames.push({ narr: 'Done. Printing each map gives the same counts in three different orders. The most frequent word is <b>' + esc(top) + '</b> (' + cnt[top] + '). Notice how the HashMap order depends on bucket numbers, not on the words or the counts.', parts: parts(top, undefined, 4).concat([out('HashMap:       {' + ents(hashOrder(keys, true)).map(function (e) { return e[0] + '=' + e[1]; }).join(', ') + '}\nLinkedHashMap: {' + ents(keys).map(function (e) { return e[0] + '=' + e[1]; }).join(', ') + '}\nTreeMap:       {' + ents(sorted()).map(function (e) { return e[0] + '=' + e[1]; }).join(', ') + '}')]) });
        return frames;
      }
    },
    examples: [
      {
        title: 'Counting three ways (old school → new school)',
        html: `<p>All three produce the same map. The <code>merge</code> version does one hash lookup instead of two and has no null-handling branch.</p>
${H.table(['Style', 'Lookups per word', 'Verdict'], [['containsKey + get + put', '3', 'verbose'], ['getOrDefault + put', '2', 'fine'], ['merge(k, 1, Integer::sum)', '1', H.c('g', 'idiomatic')]])}`,
        code: `String[] words = {"a", "b", "a"};
Map<String, Integer> m1 = new HashMap<>(), m2 = new HashMap<>(), m3 = new HashMap<>();
for (String w : words) {
    if (m1.containsKey(w)) m1.put(w, m1.get(w) + 1); else m1.put(w, 1);
    m2.put(w, m2.getOrDefault(w, 0) + 1);
    m3.merge(w, 1, Integer::sum);
}
System.out.println(m1.equals(m2) && m2.equals(m3));   // true
System.out.println(m3);                               // {a=2, b=1}`
      },
      {
        title: 'Predict the output: the null-unboxing crash',
        html: `<p><code>get</code> returns <code>null</code> for a missing key. Assigning that to an <code>int</code> auto-unboxes it → <code>NullPointerException</code>. Use <code>getOrDefault</code> or keep the type as <code>Integer</code> and check.</p>
${H.table(['Line', 'Outcome'], [['<code>Integer a = ages.get("zoe");</code>', 'a = null (fine)'], ['<code>int b = ages.get("zoe");</code>', H.c('r', 'NullPointerException')], ['<code>int c = ages.getOrDefault("zoe", 0);</code>', H.c('g', '0')]])}`,
        code: `Map<String, Integer> ages = new HashMap<>(Map.of("ann", 30));
Integer a = ages.get("zoe");
System.out.println(a);                                // null
try { int b = ages.get("zoe"); } catch (NullPointerException e) { System.out.println("NPE on unboxing"); }
System.out.println(ages.getOrDefault("zoe", 0));      // 0`
      },
      {
        title: 'Predict the output: HashMap order surprise',
        html: `<p>Counting "the cat and the dog and the bird" with <code>merge</code> prints <code>{the=3, and=2, bird=1, cat=1, dog=1}</code> on OpenJDK 21. Why is <b>bird</b> before <b>cat</b>? Both hash to bucket 7, and <code>merge</code>/<code>compute</code> insert a new key at the <i>front</i> of its bucket while <code>put</code> appends at the back. With <code>put</code>-based counting you get <code>cat</code> first. The lesson is not to memorise this — it is that HashMap order is an implementation detail. Use LinkedHashMap or TreeMap when order matters.</p>`,
        code: `Map<String, Integer> viaMerge = new HashMap<>(), viaPut = new HashMap<>();
for (String w : "the cat and the dog and the bird".split(" ")) {
    viaMerge.merge(w, 1, Integer::sum);
    viaPut.put(w, viaPut.getOrDefault(w, 0) + 1);
}
System.out.println(viaMerge);   // {the=3, and=2, bird=1, cat=1, dog=1}
System.out.println(viaPut);     // {the=3, and=2, cat=1, bird=1, dog=1}
System.out.println(viaMerge.equals(viaPut));   // true — same mappings, order irrelevant to equals`
      },
      {
        title: 'TreeMap as a "price ladder": floor and ceiling',
        html: `<p>Shipping fee by parcel weight: a TreeMap from <i>minimum weight</i> → fee. <code>floorEntry(w)</code> finds the band with the largest minimum ≤ w in O(log n) — no if-ladder, and new bands are just new entries.</p>
${H.table(['min kg', 'fee'], [['0', '₹40'], ['2', '₹70'], ['5', '₹120'], ['10', '₹200']])}<p>3.5 kg → floor key 2 → ${H.c('g', '₹70')}; 12 kg → floor key 10 → ${H.c('g', '₹200')}.</p>`,
        code: `TreeMap<Double, Integer> fee = new TreeMap<>(Map.of(0.0, 40, 2.0, 70, 5.0, 120, 10.0, 200));
System.out.println(fee.floorEntry(3.5).getValue());   // 70
System.out.println(fee.floorEntry(12.0).getValue());  // 200
System.out.println(fee.firstKey() + " " + fee.lastEntry());   // 0.0 10.0=200
System.out.println(fee.subMap(2.0, true, 5.0, true)); // {2.0=70, 5.0=120}`
      }
    ],
    deepDive: `<p><b>How HashMap finds a key in O(1):</b> compute <code>key.hashCode()</code>, spread it (<code>h ^ (h &gt;&gt;&gt; 16)</code>), and keep the low bits as the bucket index (<code>hash &amp; (capacity − 1)</code> — capacity is always a power of two). Inside the bucket, compare hashes then <code>equals</code>. When size exceeds capacity × 0.75 the table doubles and entries are split between bucket i and i + oldCapacity. Long chains (more than 8) become red-black trees once the table has 64+ buckets, so even a flood of colliding keys costs O(log n), not O(n). The full story is in the Collections Internals module.</p>
<p><b>merge / compute semantics you must know:</b> if the remapping function returns <code>null</code>, the entry is <b>removed</b> — handy for decrementing counters: <code>count.merge(w, -1, (a, b) -&gt; a + b == 0 ? null : a + b)</code>. <code>computeIfAbsent</code> does not store anything if the function returns null. Never modify the same map from inside the function (Java 9+ throws <code>ConcurrentModificationException</code> on HashMap for that).</p>
<p><b>Views are live.</b> <code>map.keySet().remove(k)</code> deletes the mapping; <code>map.values().removeIf(v -&gt; v == 0)</code> deletes all zero-count entries; <code>entry.setValue(x)</code> writes through. But <code>Map.entry(k, v)</code> and entries of <code>Map.of</code> are immutable.</p>
<p><b>LinkedHashMap</b> threads a doubly linked list through entries. With the constructor <code>new LinkedHashMap&lt;&gt;(16, 0.75f, true)</code> it switches to <b>access order</b>: every <code>get</code> moves the entry to the end, and overriding <code>removeEldestEntry</code> turns it into a bounded LRU cache in ~5 lines (see the "choosing" topic).</p>
<p><b>TreeMap</b> is a red-black tree: O(log n) everything, keys must be mutually comparable (or a Comparator supplied), and the comparator — not <code>equals</code> — decides key identity. Views like <code>headMap</code>/<code>tailMap</code>/<code>subMap</code> are live windows (O(log n) to create). <b>Other maps worth naming:</b> <code>EnumMap</code> (array indexed by ordinal — fastest for enum keys), <code>IdentityHashMap</code> (== instead of equals), <code>WeakHashMap</code> (entries vanish when keys become unreachable), <code>ConcurrentHashMap</code> and <code>ConcurrentSkipListMap</code> for multi-threaded code. <code>Hashtable</code> is legacy — avoid.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes counting and grouping code fluently — often as streams: <code>Collectors.groupingBy(w -&gt; w, Collectors.counting())</code>. That returns <code>Map&lt;String, Long&gt;</code> (not Integer), and a HashMap with no order — two details generated code regularly gets wrong when it later formats or compares the result.</p>
<p><b>Use AI as a partner:</b> "<i>Rewrite this containsKey/get/put block using merge or computeIfAbsent</i>" is a safe, reviewable refactor. "<i>Which map should hold a time series where I need the latest value at or before t?</i>" — it should answer TreeMap.floorEntry; if it suggests scanning a HashMap, push back.</p>
<p><b>Where AI goes wrong:</b> <code>int x = map.get(k)</code> on a maybe-missing key, iterating <code>keySet()</code> then calling <code>get</code> (double lookups), using a mutable object (like a List) as a key, and asserting on HashMap print order in tests. <b>You must still own</b> the choice of key (what makes two things "the same"?), the order contract, and complexity: HashMap O(1) vs TreeMap O(log n).</p>`,
    problems: [{
      title: 'First Non-Repeating Character',
      level: 'Easy', tags: ['LinkedHashMap', 'counting', 'strings'], companies: ['Amazon', 'Bloomberg', 'Microsoft'],
      statement: `<p>Given a string <code>s</code>, return the index of the first character that appears exactly once. If there is none, return <code>-1</code>.</p>`,
      constraints: `1 ≤ s.length ≤ 10<sup>5</sup>; any chars (do not assume only a–z).`,
      example: `<p><code>s = "swiss"</code> → counts s:3, w:1, i:1. Scanning in order, the first count-1 character is ${H.c('g', 'w at index 1')}. <code>"aabb"</code> → ${H.c('m', '-1')}.</p>`,
      brute: {
        why: `<p>For each position i, scan the whole string to count how many times <code>s.charAt(i)</code> occurs. That is n scans of n characters → O(n²) = 10<sup>10</sup> steps for n = 10<sup>5</sup>.</p>`,
        code: `class Solution {
    int firstUniqChar(String s) {
        for (int i = 0; i < s.length(); i++) {
            int c = 0;
            for (int j = 0; j < s.length(); j++)       // full rescan for every i
                if (s.charAt(j) == s.charAt(i)) c++;
            if (c == 1) return i;
        }
        return -1;
    }
}`
      },
      mcq: { q: 'You count characters in a map. Which map lets you find the first unique char by iterating the map itself (without re-scanning the string)?', options: ['LinkedHashMap (insertion order = first-seen order)', 'HashMap', 'TreeMap', 'Any map — they all keep insertion order'], answer: 0, explain: 'LinkedHashMap iterates keys in the order they were first inserted, which is exactly first-appearance order. HashMap order is arbitrary; TreeMap is alphabetical.' },
      hints: [
        `<p>Hint 1: Split the job: first <b>count</b> every character (one pass), then <b>find</b> the first one with count 1.</p>`,
        `<p>Hint 2: Count with <code>map.merge(ch, 1, Integer::sum)</code>. For the second pass, either re-scan the string checking <code>map.get(s.charAt(i)) == 1</code>, or use a LinkedHashMap and walk its entries in insertion order.</p>`,
        `<p>Hint 3: If you walk the LinkedHashMap you need the <b>index</b>, so store the first index alongside the count (e.g. value = <code>int[]{count, firstIndex}</code>). Return -1 when no count is 1. For only lowercase letters an <code>int[26]</code> is even faster.</p>`
      ],
      solution: {
        approach: `<p>Two passes over the string: count with a HashMap, then re-scan the string in order and return the first index whose count is 1. The LinkedHashMap variant iterates the map (at most the number of distinct characters) instead of the string in pass two.</p>`,
        code: `class Solution {
    int firstUniqChar(String s) {
        Map<Character, Integer> count = new HashMap<>();
        for (char ch : s.toCharArray()) count.merge(ch, 1, Integer::sum);   // pass 1: count
        for (int i = 0; i < s.length(); i++)
            if (count.get(s.charAt(i)) == 1) return i;                       // pass 2: first unique
        return -1;
    }

    int firstUniqLinked(String s) {
        Map<Character, int[]> info = new LinkedHashMap<>();                  // char -> {count, firstIndex}
        for (int i = 0; i < s.length(); i++) {
            int idx = i;
            info.computeIfAbsent(s.charAt(i), k -> new int[]{0, idx})[0]++;
        }
        for (int[] v : info.values())                                        // first-seen order
            if (v[0] == 1) return v[1];
        return -1;
    }

    public static void main(String[] args) {
        Solution sol = new Solution();
        System.out.println(sol.firstUniqChar("swiss") + " " + sol.firstUniqLinked("swiss") + " " + sol.firstUniqChar("aabb"));  // 1 1 -1
    }
}`,
        dry: { head: ['step', 'char', 'LinkedHashMap (char → {count, first})'], rows: [
          ['i=0', 's', '{s:[1,0]}'],
          ['i=1', 'w', '{s:[1,0], w:[1,1]}'],
          ['i=2', 'i', '{s:[1,0], w:[1,1], i:[1,2]}'],
          ['i=3', 's', '{s:[2,0], w:[1,1], i:[1,2]}'],
          ['i=4', 's', '{s:[3,0], w:[1,1], i:[1,2]}'],
          ['scan', 's → count 3 skip; w → count 1', '<span class="c-g">return 1</span>']
        ] },
        complexity: `<p>Time O(n), space O(k) where k = number of distinct characters (≤ 26 for lowercase letters, so effectively O(1)).</p>`,
        followUps: ['Streaming version: characters arrive one at a time and you must answer "first unique so far" after each one (hint: LinkedHashSet of candidates + HashSet of repeated).', 'Return the first non-repeating <b>word</b> in a sentence.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — Queues: PriorityQueue and ArrayDeque (queue, stack, deque)
     ====================================================================== */
  topics.push({
    title: 'Queues & Deques: PriorityQueue, ArrayDeque as Queue and Stack',
    analogy: `<p><b>ArrayDeque is a bus with doors at both ends.</b> As a <i>queue</i>, people get on at the back and off at the front (first in, first out — a ticket counter). As a <i>stack</i>, everyone uses the front door only, so the last one in is the first one out (a pile of plates, the browser back button).</p>
<p><b>PriorityQueue is a hospital emergency room.</b> Patients do not leave in arrival order — the most urgent case is always seen next. The nurse does not keep the whole waiting room perfectly sorted; she only makes sure the most urgent patient is at the front. That is a <b>heap</b>.</p>`,
    explain: `<p>A <code>Queue</code> hands out elements from its <b>head</b>. Every operation comes in two flavours — one <b>throws</b> when it fails, one returns a <b>special value</b> (false/null):</p>
${H.table(['Action', 'Throws exception', 'Returns special value'], [
      ['insert at tail', '<code>add(e)</code>', '<code>offer(e)</code> → false if full'],
      ['remove head', '<code>remove()</code> → NoSuchElementException', '<code>poll()</code> → null if empty'],
      ['look at head', '<code>element()</code> → NoSuchElementException', '<code>peek()</code> → null if empty']
    ])}
<p>A <code>Deque</code> ("deck", double-ended queue) has the same trio for <b>each end</b>: <code>offerFirst/offerLast</code>, <code>pollFirst/pollLast</code>, <code>peekFirst/peekLast</code> — plus the stack trio <code>push</code> (= addFirst), <code>pop</code> (= removeFirst), <code>peek</code> (= peekFirst).</p>
${H.table(['Need', 'Use', 'Main calls', 'Cost'], [
      ['FIFO queue (BFS, task line)', '<code>ArrayDeque</code>', 'offer / poll / peek', 'O(1)'],
      ['LIFO stack (undo, brackets, DFS)', '<code>ArrayDeque</code>', 'push / pop / peek', 'O(1)'],
      ['both ends (sliding window)', '<code>ArrayDeque</code>', 'offerLast / pollFirst / pollLast / peekLast', 'O(1)'],
      ['smallest (or largest) first', '<code>PriorityQueue</code>', 'offer / poll / peek', 'O(log n) / O(log n) / O(1)']
    ])}
<p><b>PriorityQueue</b> is a <b>min-heap</b> by default: <code>poll()</code> returns the smallest element. For a max-heap pass <code>Comparator.reverseOrder()</code>; for objects pass a comparator like <code>Comparator.comparingInt(Task::priority)</code>. Two surprises: <b>printing or iterating a PriorityQueue is NOT sorted</b> (only the head is guaranteed), and <code>contains</code>/<code>remove(Object)</code> are O(n).</p>
<p><b>Do not use</b> the legacy <code>Stack</code> class (synchronized, extends Vector) or <code>LinkedList</code> as a queue (more memory, slower). <code>ArrayDeque</code> does not accept <code>null</code> — because <code>poll()</code> uses null to mean "empty".</p>`,
    clues: [
      '"k largest / k smallest / top k" → <b>PriorityQueue of size k</b> (min-heap for k largest!) → O(n log k)',
      '"always process the cheapest / earliest / most urgent next", "merge k sorted", Dijkstra → <b>PriorityQueue</b>',
      '"level by level", "shortest path in an unweighted grid", "in arrival order" → <b>ArrayDeque</b> as a FIFO queue (BFS)',
      '"matching brackets", "undo", "next greater element", "evaluate expression" → <b>ArrayDeque</b> as a stack',
      '"maximum of every window of size k" → <b>ArrayDeque</b> as a monotonic deque (both ends)',
      '"running median" → <b>two heaps</b> (max-heap for the lower half, min-heap for the upper half)'
    ],
    code: [`Deque<Integer> stack = new ArrayDeque<>();
stack.push(1); stack.push(2); stack.push(3);
System.out.println(stack.pop() + " " + stack.peek());   // 3 2   (LIFO)

Queue<String> line = new ArrayDeque<>();
line.offer("A"); line.offer("B"); line.offer("C");
System.out.println(line.poll() + " " + line.peek());    // A B   (FIFO)
System.out.println(new ArrayDeque<Integer>().poll());   // null  (empty: special value)

PriorityQueue<Integer> minHeap = new PriorityQueue<>(List.of(5, 1, 8, 3));
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());
maxHeap.addAll(List.of(5, 1, 8, 3));
System.out.println(minHeap.poll() + " " + maxHeap.poll());   // 1 8

record Task(String name, int priority) {}
PriorityQueue<Task> tasks = new PriorityQueue<>(
        Comparator.comparingInt(Task::priority).thenComparing(Task::name));
tasks.add(new Task("deploy", 2)); tasks.add(new Task("hotfix", 1)); tasks.add(new Task("docs", 3));
while (!tasks.isEmpty()) System.out.print(tasks.poll().name() + " ");   // hotfix deploy docs`],
    codeTitle: ['Stack, queue, min-heap, max-heap and a task scheduler'],
    viz: [{
      title: 'PriorityQueue: watch the heap sift up and down',
      input: 'add 5, add 1, add 8, add 3, add 2, poll, add 0, poll, peek',
      inputLabel: 'Ops: add X | poll | peek (start with "max," for a max-heap). Max 15 elements.',
      gen: function (input) {
        var hint = 'Use ops like: add 5, add 1, poll, peek — optionally start with "max," (values -99..999, ≤ 15 elements)';
        var s = clean(input);
        if (!s) throw new Error(hint);
        var ops = s.split(/\s*,\s*/).filter(function (x) { return x.length; });
        var isMax = false;
        if (ops.length && ops[0].toLowerCase() === 'max') { isMax = true; ops.shift(); }
        if (!ops.length || ops.length > 20) throw new Error(hint);
        var h = [], frames = [], log = [];
        function less(a, b) { return isMax ? a > b : a < b; }
        function snap(hl, ptr, narr, extra) {
          var th = {}; Object.keys(hl || {}).forEach(function (k) { th[k] = hl[k]; });
          var parts = [
            { type: 'tree', label: (isMax ? 'Max' : 'Min') + '-heap as a tree (parent ' + (isMax ? '≥' : '≤') + ' children)', arr: h.length ? h.slice() : [null], hl: th },
            { type: 'array', label: 'The real storage: one array (children of i are 2i+1 and 2i+2)', values: h.length ? h.slice() : ['(empty)'], hl: hl || {}, ptr: ptr || {}, showIdx: true },
            out(log.join('\n'))
          ];
          (extra || []).forEach(function (p) { parts.push(p); });
          frames.push({ narr: narr, parts: parts });
        }
        snap({}, {}, 'An empty ' + (isMax ? '<b>max</b>-heap (<code>new PriorityQueue&lt;&gt;(Comparator.reverseOrder())</code>)' : '<b>min</b>-heap (<code>new PriorityQueue&lt;&gt;()</code>)') + '. The heap is stored in a plain array; the tree is just a way of looking at it.');
        ops.forEach(function (op) {
          var t = op.trim().split(/\s+/), name = t[0].toLowerCase();
          if ((name === 'add' || name === 'offer') && t.length === 2) {
            var v = Number(t[1]);
            if (isNaN(v) || v !== Math.floor(v) || v < -99 || v > 999) throw new Error(hint);
            if (h.length >= 15) throw new Error('Keep the heap at 15 elements or fewer (tree depth ≤ 4)');
            h.push(v);
            var k = h.length - 1;
            snap(one(k, 'ok'), one(k, 'new'), '<code>add(' + v + ')</code>: put it in the first free slot (index ' + k + ', the bottom of the tree). Now <b>sift up</b>: compare with the parent at (i−1)/2.');
            while (k > 0) {
              var p = (k - 1) >> 1;
              if (!less(h[k], h[p])) { var hh = {}; hh[k] = 'ok'; hh[p] = 'done'; snap(hh, {}, h[k] + (isMax ? ' ≤ ' : ' ≥ ') + 'parent ' + h[p] + ' → heap order holds, stop.'); break; }
              var tmp = h[k]; h[k] = h[p]; h[p] = tmp;
              var hs = {}; hs[p] = 'cur'; hs[k] = 'win';
              snap(hs, one(p, 'i'), h[p] + (isMax ? ' > ' : ' < ') + 'parent ' + h[k] + ' → <b>swap</b> them; continue from index ' + p + '.');
              k = p;
            }
            if (k === 0 && h.length > 1) snap(one(0, 'sel'), {}, h[0] + ' reached the root — it is the new ' + (isMax ? 'maximum' : 'minimum') + '. Cost: at most log₂ n swaps.');
          } else if (name === 'poll' || name === 'remove') {
            if (!h.length) { log.push('poll() -> null'); snap({}, {}, '<code>poll()</code> on an empty queue returns <b>null</b> (<code>remove()</code> would throw NoSuchElementException).'); return; }
            var top = h[0], last = h.pop();
            log.push('poll() -> ' + top);
            if (!h.length) { snap({}, {}, '<code>poll()</code> → <b>' + top + '</b>. The heap is now empty.'); return; }
            h[0] = last;
            snap(one(0, 'cur'), one(0, 'moved'), '<code>poll()</code> → <b>' + top + '</b> (the root). Fill the hole with the LAST element (' + last + ') and <b>sift down</b>: swap with the ' + (isMax ? 'larger' : 'smaller') + ' child while it is ' + (isMax ? 'smaller' : 'larger') + '.');
            var i = 0, n = h.length;
            while (2 * i + 1 < n) {
              var c = 2 * i + 1;
              if (c + 1 < n && less(h[c + 1], h[c])) c = c + 1;
              if (!less(h[c], h[i])) { var hb = {}; hb[i] = 'ok'; hb[c] = 'done'; snap(hb, {}, h[i] + ' is already ' + (isMax ? '≥' : '≤') + ' its best child ' + h[c] + ' → stop.'); break; }
              var t2 = h[i]; h[i] = h[c]; h[c] = t2;
              var hd = {}; hd[i] = 'win'; hd[c] = 'cur';
              snap(hd, one(c, 'i'), 'Child ' + h[i] + ' wins → swap; continue from index ' + c + '.');
              i = c;
            }
          } else if (name === 'peek' || name === 'element') {
            log.push('peek() -> ' + (h.length ? h[0] : 'null'));
            snap(h.length ? one(0, 'sel') : {}, {}, '<code>peek()</code> → <b>' + (h.length ? h[0] : 'null') + '</b> — just reads index 0, O(1). Nothing moves.');
          } else throw new Error(hint);
        });
        snap({}, {}, '<code>System.out.println(pq)</code> would print <b>[' + h.join(', ') + ']</b> — array order, <b>not sorted</b>! Only the head is guaranteed. To get sorted output, poll repeatedly (heap sort) or copy into a list and sort.', [{ type: 'table', label: 'Cost summary', columns: ['Operation', 'Cost'], rows: [['offer / add', 'O(log n)'], ['poll', 'O(log n)'], ['peek', 'O(1)'], ['contains / remove(Object)', 'O(n)'], ['new PriorityQueue<>(collection)', 'O(n) heapify']] }]);
        return frames;
      }
    }, {
      title: 'ArrayDeque: a circular array with head and tail',
      input: 'offerLast 1, offerLast 2, offerFirst 0, push 9, pollFirst, pollLast, offerLast 7, pop',
      inputLabel: 'Ops: offerFirst X | offerLast X | push X | pollFirst | pollLast | pop | peekFirst | peekLast',
      gen: function (input) {
        var hint = 'Use ops: offerFirst X, offerLast X, push X, pollFirst, pollLast, pop, peekFirst, peekLast (max 16 ops, values -99..999)';
        var s = clean(input);
        if (!s) throw new Error(hint);
        var ops = s.split(/\s*,\s*/).filter(function (x) { return x.length; });
        if (!ops.length || ops.length > 16) throw new Error(hint);
        var L = 17, es = [], head = 0, tail = 0, frames = [], log = [];
        for (var i = 0; i < L; i++) es.push('·');
        function contents() { var r = [], k = head; while (k !== tail) { r.push(es[k]); k = (k + 1) % L; } return r; }
        function snap(narr, hl) {
          var ptr = {};
          if (head === tail) ptr[head] = ['head', 'tail']; else { ptr[head] = 'head'; ptr[tail] = 'tail'; }
          var c = contents();
          frames.push({ narr: narr, parts: [
            { type: 'array', label: 'Backing array (17 slots; real JDK default) — tail points at the next FREE slot', values: es.slice(), ptr: ptr, hl: hl || {}, showIdx: true },
            { type: 'queue', label: 'Logical deque (front → back)', items: c.length ? c : ['(empty)'], frontLabel: 'first / top of stack', backLabel: 'last' },
            { type: 'vars', vals: { head: head, tail: tail, size: c.length }, hl: {} },
            out(log.join('\n'))
          ] });
        }
        snap('An empty ArrayDeque: <code>head == tail</code> means empty. Indices wrap around: one step left of 0 is 16, one step right of 16 is 0.');
        ops.forEach(function (op) {
          var t = op.trim().split(/\s+/), name = t[0].toLowerCase(), v = t.length > 1 ? Number(t[1]) : null;
          var needV = name === 'offerfirst' || name === 'offerlast' || name === 'push' || name === 'addfirst' || name === 'addlast' || name === 'offer';
          if (needV && (t.length !== 2 || isNaN(v) || v !== Math.floor(v) || v < -99 || v > 999)) throw new Error(hint);
          if (!needV && t.length !== 1) throw new Error(hint);
          if (needV && contents().length >= 16) throw new Error('Keep at most 16 elements (no resize in this demo)');
          var c = contents();
          if (name === 'offerfirst' || name === 'addfirst' || name === 'push') {
            head = (head - 1 + L) % L; es[head] = v;
            snap('<code>' + t[0] + '(' + v + ')</code>: move <b>head one step left</b> (wrapping if needed) to ' + head + ' and store ' + v + ' there. O(1).' + (name === 'push' ? ' (<code>push</code> is exactly <code>addFirst</code> — the front is the top of the stack.)' : ''), one(head, 'ok'));
          } else if (name === 'offerlast' || name === 'addlast' || name === 'offer') {
            es[tail] = v; var at = tail; tail = (tail + 1) % L;
            snap('<code>' + t[0] + '(' + v + ')</code>: store at <b>tail</b> (' + at + ') then move tail right to ' + tail + '. O(1).', one(at, 'ok'));
          } else if (name === 'pollfirst' || name === 'pop' || name === 'poll') {
            if (!c.length) { log.push(t[0] + '() -> ' + (name === 'pop' ? 'NoSuchElementException' : 'null')); snap('Empty! <code>' + t[0] + '()</code> ' + (name === 'pop' ? 'throws <b>NoSuchElementException</b>.' : 'returns <b>null</b>.')); return; }
            var x = es[head], at2 = head; es[head] = '·'; head = (head + 1) % L;
            log.push(t[0] + '() -> ' + x);
            snap('<code>' + t[0] + '()</code> → <b>' + x + '</b>: take slot ' + at2 + ', null it out (so the GC can reclaim it), move head right to ' + head + '.', one(at2, 'bad'));
          } else if (name === 'polllast') {
            if (!c.length) { log.push('pollLast() -> null'); snap('Empty! <code>pollLast()</code> returns <b>null</b>.'); return; }
            tail = (tail - 1 + L) % L; var y = es[tail]; es[tail] = '·';
            log.push('pollLast() -> ' + y);
            snap('<code>pollLast()</code> → <b>' + y + '</b>: move tail left to ' + tail + ' and take that slot.', one(tail, 'bad'));
          } else if (name === 'peekfirst' || name === 'peek') {
            log.push(t[0] + '() -> ' + (c.length ? c[0] : 'null'));
            snap('<code>' + t[0] + '()</code> → <b>' + (c.length ? c[0] : 'null') + '</b>, nothing moves.', c.length ? one(head, 'sel') : {});
          } else if (name === 'peeklast') {
            log.push('peekLast() -> ' + (c.length ? c[c.length - 1] : 'null'));
            snap('<code>peekLast()</code> → <b>' + (c.length ? c[c.length - 1] : 'null') + '</b>, nothing moves.', c.length ? one((tail - 1 + L) % L, 'sel') : {});
          } else throw new Error(hint);
        });
        snap('Every operation only moved a pointer and touched one slot — that is why ArrayDeque is O(1) at both ends. When head would meet tail on an insert the real class grows the array (doubling while small, +50% when large) and unwraps the elements.');
        return frames;
      }
    }],
    examples: [
      {
        title: 'Predict the output: printing a PriorityQueue',
        html: `<p>Adding 5, 1, 8, 3, 2 one by one gives the array <code>[1, 2, 8, 5, 3]</code> — a valid heap, not a sorted list. Building from a collection uses <b>heapify</b> (bottom-up) and can give a different, equally valid array: <code>[1, 2, 8, 3, 5]</code>. Polling always returns 1, 2, 3, 5, 8.</p>
${H.arr([1, 2, 8, 5, 3], { label: 'add one by one', hl: { 0: 'g' } })} ${H.arr([1, 2, 8, 3, 5], { label: 'new PriorityQueue&lt;&gt;(List.of(5,1,8,3,2))', hl: { 0: 'g' } })}`,
        code: `PriorityQueue<Integer> pq = new PriorityQueue<>();
for (int x : new int[]{5, 1, 8, 3, 2}) pq.add(x);
System.out.println(pq);                                            // [1, 2, 8, 5, 3]
System.out.println(new PriorityQueue<>(List.of(5, 1, 8, 3, 2)));   // [1, 2, 8, 3, 5]
StringBuilder sb = new StringBuilder();
while (!pq.isEmpty()) sb.append(pq.poll()).append(' ');
System.out.println(sb.toString().trim());                          // 1 2 3 5 8`
      },
      {
        title: 'The comparator overflow trap: (a, b) -> b - a',
        html: `<p>A popular max-heap shortcut is <code>(a, b) -&gt; b - a</code>. With large values the subtraction overflows: <code>Integer.MIN_VALUE - 1</code> wraps to a huge positive number and the ordering breaks. Use <code>Comparator.reverseOrder()</code> or <code>Integer.compare(b, a)</code>.</p>
${H.table(['Comparator', 'Safe?'], [['<code>(a, b) -&gt; b - a</code>', H.c('r', 'overflows near ±2³¹')], ['<code>(a, b) -&gt; Integer.compare(b, a)</code>', H.c('g', 'yes')], ['<code>Comparator.reverseOrder()</code>', H.c('g', 'yes, clearest')]])}`,
        code: `PriorityQueue<Integer> bad = new PriorityQueue<>((a, b) -> b - a);
PriorityQueue<Integer> good = new PriorityQueue<>(Comparator.reverseOrder());
for (int x : new int[]{Integer.MIN_VALUE, 1, Integer.MAX_VALUE}) { bad.add(x); good.add(x); }
System.out.println(bad.peek());    // not MAX_VALUE: the overflowing comparator lies
System.out.println(good.peek());   // 2147483647`
      },
      {
        title: 'BFS shortest path in a grid with ArrayDeque',
        html: `<p>A FIFO queue explores cells in rings of equal distance, so the first time we reach the target is the shortest path. Each cell is enqueued once → O(rows × cols).</p>
${H.table(['', 'c0', 'c1', 'c2'], [['r0', 'S', '.', '.'], ['r1', '#', '#', '.'], ['r2', '.', '.', 'T']])}<p>Distance S → T = ${H.c('g', '4')} (right, right, down, down).</p>`,
        code: `char[][] g = {"S..".toCharArray(), "##.".toCharArray(), "..T".toCharArray()};
int R = g.length, C = g[0].length;
int[][] dist = new int[R][C];
for (int[] row : dist) Arrays.fill(row, -1);
Deque<int[]> q = new ArrayDeque<>();
q.offer(new int[]{0, 0}); dist[0][0] = 0;
int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
while (!q.isEmpty()) {
    int[] cur = q.poll();
    for (int[] d : dirs) {
        int r = cur[0] + d[0], c = cur[1] + d[1];
        if (r >= 0 && r < R && c >= 0 && c < C && g[r][c] != '#' && dist[r][c] == -1) {
            dist[r][c] = dist[cur[0]][cur[1]] + 1;
            q.offer(new int[]{r, c});
        }
    }
}
System.out.println(dist[2][2]);   // 4`
      },
      {
        title: 'Why not Stack? Why no nulls?',
        html: `<p><code>Stack</code> extends <code>Vector</code>, so it is synchronized (slower) and exposes index methods that break the LIFO idea; its iteration order is bottom-to-top while ArrayDeque iterates top-to-bottom. ArrayDeque rejects <code>null</code> with NPE because <code>poll()</code>/<code>peek()</code> return null to signal "empty" — allowing null elements would make that ambiguous.</p>`,
        code: `Stack<Integer> old = new Stack<>();
old.push(1); old.push(2); old.add(0, 99);        // legal, but breaks the stack idea
System.out.println(old);                         // [99, 1, 2]
Deque<Integer> modern = new ArrayDeque<>();
modern.push(1); modern.push(2);
System.out.println(modern);                      // [2, 1]  (top first)
try { modern.push(null); } catch (NullPointerException e) { System.out.println("no nulls"); }`
      }
    ],
    deepDive: `<p><b>PriorityQueue = binary heap in an array.</b> Index 0 is the root; children of i live at 2i+1 and 2i+2; the parent of i is (i−1)/2. <code>offer</code> appends and <b>sifts up</b> (≤ log₂ n swaps); <code>poll</code> moves the last element to the root and <b>sifts down</b>, choosing the smaller child each time. The constructor from a collection uses Floyd's bottom-up <b>heapify</b>, which is O(n), not O(n log n) — useful when you have all elements up front. <code>remove(Object)</code> must first find the element by linear scan (O(n)); for "decrease-key" in Dijkstra the usual trick is to insert a duplicate entry and skip stale ones when polled ("lazy deletion"). The iterator walks the raw array — that is why the print order looks random — and PriorityQueue is not thread-safe (<code>PriorityBlockingQueue</code> is).</p>
<p><b>Comparator must be a strict, consistent ordering.</b> If it is not transitive (e.g. comparing doubles with subtraction and casting to int, or the overflowing <code>b - a</code>), the heap invariant silently breaks and <code>poll</code> returns wrong answers — no exception. Ties are broken arbitrarily, so PriorityQueue is <b>not stable</b>; add a tie-breaker (sequence number) if equal-priority items must stay FIFO.</p>
<p><b>ArrayDeque = circular buffer.</b> Two indices, <code>head</code> and <code>tail</code>, chase each other round the array with wrap-around. All end operations are O(1); growth is amortised O(1) (doubling for small arrays, +50% for large ones). It is faster than <code>LinkedList</code> because there is no node allocation and elements sit together in memory. It is not thread-safe; concurrent alternatives are <code>ConcurrentLinkedDeque</code> (lock-free) and the blocking queues (<code>ArrayBlockingQueue</code>, <code>LinkedBlockingDeque</code>) used for producer–consumer, covered in the concurrency modules.</p>
<p><b>Top-k reasoning:</b> to keep the k <i>largest</i> of n items, use a <b>min</b>-heap of size k: the root is the weakest of the current top k, so each new item either beats it (poll + offer, O(log k)) or is discarded. Total O(n log k) time and O(k) memory — ideal for streams that do not fit in memory. Sorting everything is O(n log n) and needs all data.</p>`,
    aiEra: `<p><b>What AI changes:</b> "top k", "merge k sorted lists", "running median" — models pattern-match these to heaps instantly and produce working code. Your value moves to <b>verifying</b> it: is the heap the right direction (min-heap of size k for the k <i>largest</i>)? Is the comparator overflow-safe? Does the code print the PriorityQueue and assume it is sorted?</p>
<p><b>Use AI as a partner:</b> ask it to "<i>add a stable tie-breaker to this PriorityQueue comparator</i>", or "<i>generate 10 edge cases for this BFS: empty grid, start blocked, target unreachable</i>". Ask "<i>why ArrayDeque instead of Stack here?</i>" and check the answer matches this page.</p>
<p><b>Where AI goes wrong:</b> <code>new Stack&lt;&gt;()</code> and <code>new LinkedList&lt;&gt;()</code> queues from old training data, <code>(a, b) -&gt; b - a</code> comparators, using <code>remove()</code> where <code>poll()</code> was meant (exception vs null), and O(n) <code>pq.remove(x)</code> inside a loop. <b>You must own</b> the invariant (what the heap/deque guarantees and what it does not) and the complexity argument.</p>`,
    problems: [{
      title: 'Kth Largest Element in a Stream of Numbers',
      level: 'Medium', tags: ['PriorityQueue', 'heap', 'top-k'], companies: ['Facebook', 'Amazon', 'Uber'],
      statement: `<p>Given an int array <code>nums</code> and an integer <code>k</code>, return the k-th largest element (in sorted order, not the k-th distinct).</p>`,
      constraints: `1 ≤ k ≤ n ≤ 10<sup>5</sup>; −10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup>`,
      example: `${H.arr([3, 2, 1, 5, 6, 4], { label: 'nums, k = 2' })}<p>Sorted descending: 6, ${H.c('g', '5')}, 4, 3, 2, 1 → answer ${H.c('g', '5')}.</p>`,
      brute: {
        why: `<p>Sorting the whole array costs O(n log n) and needs all data in memory at once. It is acceptable here, but wasteful when k is tiny compared with n, and impossible for an endless stream.</p>`,
        code: `class Solution {
    int findKthLargest(int[] nums, int k) {
        int[] copy = nums.clone();
        Arrays.sort(copy);                 // O(n log n)
        return copy[copy.length - k];      // k-th from the end
    }
}`
      },
      mcq: { q: 'To track the k LARGEST elements seen so far, which heap and size?', options: ['A MIN-heap of size k — its root is the k-th largest', 'A MAX-heap of size k', 'A MAX-heap of all n elements', 'A MIN-heap of all n elements'], answer: 0, explain: 'A min-heap of the best k keeps the weakest survivor on top, so a new number only needs to beat that root. Memory O(k), time O(n log k).' },
      hints: [
        `<p>Hint 1: You only care about the top k numbers. Keep a small "club" of the k biggest seen so far; the entry bar is the smallest member of the club.</p>`,
        `<p>Hint 2: A <b>min</b>-heap (<code>new PriorityQueue&lt;Integer&gt;()</code>) of size k exposes that smallest member at <code>peek()</code> in O(1).</p>`,
        `<p>Hint 3: Recipe: for each x → <code>offer(x)</code>; if size &gt; k → <code>poll()</code> (kick out the smallest). At the end <code>peek()</code> is the answer. Duplicates are fine (they count separately). k == n → the answer is the minimum.</p>`
      ],
      solution: {
        approach: `<p>Maintain a min-heap holding the k largest values seen so far. Each new value is offered; if the heap grows beyond k we evict the smallest. After processing everything the root is exactly the k-th largest. Works for streams too.</p>`,
        code: `class Solution {
    int findKthLargest(int[] nums, int k) {
        PriorityQueue<Integer> club = new PriorityQueue<>();   // min-heap: root = weakest member
        for (int x : nums) {
            club.offer(x);                                     // O(log k)
            if (club.size() > k) club.poll();                  // evict the smallest
        }
        return club.peek();                                    // k-th largest
    }

    public static void main(String[] args) {
        System.out.println(new Solution().findKthLargest(new int[]{3, 2, 1, 5, 6, 4}, 2));        // 5
        System.out.println(new Solution().findKthLargest(new int[]{3, 2, 3, 1, 2, 4, 5, 5, 6}, 4)); // 4
    }
}`,
        dry: { head: ['x', 'after offer', 'size > k?', 'heap after (k = 2)'], rows: [
          ['3', '[3]', 'no', '[3]'],
          ['2', '[2, 3]', 'no', '[2, 3]'],
          ['1', '[1, 3, 2]', 'yes → poll 1', '[2, 3]'],
          ['5', '[2, 3, 5]', 'yes → poll 2', '[3, 5]'],
          ['6', '[3, 5, 6]', 'yes → poll 3', '[5, 6]'],
          ['4', '[4, 6, 5]', 'yes → poll 4', '<span class="c-g">[5, 6] → peek = 5</span>']
        ] },
        complexity: `<p>Time O(n log k), space O(k). For k ≪ n this beats sorting; Quickselect gives O(n) average but is not streaming-friendly.</p>`,
        followUps: ['Design a <code>KthLargest</code> class with an <code>add(val)</code> method for a live stream.', 'Return the k largest elements in descending order.', 'Implement Quickselect and compare.']
      }
    }]
  });


  registerModule({
    id: 'java07',
    title: 'Collections Framework in Practice',
    lang: 'java',
    intro: `<p>Almost every Java program — and almost every coding-interview answer — stores data in a <b>collection</b>: a list of orders, a set of seen user ids, a map from word to count, a queue of jobs. The <b>Java Collections Framework</b> gives you a small family of interfaces (<code>List</code>, <code>Set</code>, <code>Queue</code>, <code>Deque</code>, <code>Map</code>) and a handful of battle-tested classes behind them (<code>ArrayList</code>, <code>LinkedList</code>, <code>HashSet</code>, <code>LinkedHashSet</code>, <code>TreeSet</code>, <code>HashMap</code>, <code>LinkedHashMap</code>, <code>TreeMap</code>, <code>PriorityQueue</code>, <code>ArrayDeque</code>).</p>
<p>This module is about <b>using them well</b>: what each one promises, what each operation really costs, which order you will see when you print or loop, why a for-each loop can throw <code>ConcurrentModificationException</code>, which <code>Collections</code> helpers save you code, and — most important in interviews — how to <b>pick the right collection from the wording of a question</b>. Every topic starts with an everyday analogy, has a step-by-step visualizer that mirrors what the JDK really does (down to the exact <code>HashSet</code> print order), worked examples, "predict the output" traps, a deep dive and a section on working alongside AI tools. How the classes work <i>inside</i> (resize maths, treeification, red-black balancing, ConcurrentHashMap) is the subject of the later Collections Internals module.</p>`,
    goals: [
      'Draw the Collection/Map hierarchy from memory and explain why Map is not a Collection, Collection vs Collections, and what List.of / Set.of / Map.of forbid',
      'Choose between ArrayList and LinkedList using real costs (shifting, pointer chasing, cache misses) and avoid the remove(int) vs remove(Object) trap',
      'Predict the iteration order of HashSet/LinkedHashSet/TreeSet and HashMap/LinkedHashMap/TreeMap, and use getOrDefault, merge, computeIfAbsent, floorKey and ceilingKey fluently',
      'Use PriorityQueue (min/max heap with comparators) and ArrayDeque (stack, queue, monotonic deque) correctly, including offer/poll vs add/remove semantics',
      'Explain fail-fast iterators (modCount), predict when ConcurrentModificationException is thrown — and when it is silently NOT — and remove safely with Iterator.remove or removeIf',
      'Apply the Collections and Arrays utility methods (sort, reverse, rotate, frequency, binarySearch, unmodifiable vs copyOf vs of) and pick the right collection for any interview scenario'
    ],
    prereqs: `Java 3–5 (classes and objects, OOP pillars, and especially <b>equals/hashCode</b> and <b>Comparable vs Comparator</b> from the Strings &amp; Wrappers module). Basic generics syntax such as <code>List&lt;String&gt;</code> is enough — full generics come in the next module. DSA familiarity with arrays and Big-O helps.`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
