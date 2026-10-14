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
