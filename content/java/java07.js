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
      tests: { sig: 'string -> string', fn: 'famCheck',
        harness: { java: `class Check { static String famCheck(String kind) { Object o; switch (kind) { case "LinkedList": o = new LinkedList<Integer>(); break; case "ArrayList": o = new ArrayList<Integer>(); break; case "TreeMap": o = new TreeMap<String, Integer>(); break; case "HashMap": o = new HashMap<String, Integer>(); break; case "LinkedHashMap": o = new LinkedHashMap<String, Integer>(); break; case "HashSet": o = new HashSet<Integer>(); break; case "TreeSet": o = new TreeSet<Integer>(); break; case "LinkedHashSet": o = new LinkedHashSet<Integer>(); break; case "ArrayDeque": o = new ArrayDeque<Integer>(); break; case "PriorityQueue": o = new PriorityQueue<Integer>(); break; case "String": o = "hi"; break; case "Integer": o = Integer.valueOf(3); break; case "intArray": o = new int[]{1}; break; case "nil": o = null; break; case "Object": o = new Object(); break; case "unmodList": o = Collections.unmodifiableList(new ArrayList<Integer>()); break; case "unmodSet": o = Collections.unmodifiableSet(new HashSet<Integer>()); break; case "unmodMap": o = Collections.unmodifiableMap(new HashMap<String, Integer>()); break; case "unmodCollection": o = Collections.unmodifiableCollection(new ArrayList<Integer>()); break; case "Vector": o = new Vector<Integer>(); break; case "Stack": o = new Stack<Integer>(); break; case "ConcurrentLinkedDeque": o = new java.util.concurrent.ConcurrentLinkedDeque<Integer>(); break; case "ConcurrentHashMap": o = new java.util.concurrent.ConcurrentHashMap<String, Integer>(); break; case "asList": o = Arrays.asList(1, 2); break; case "listOf": o = List.of(1); break; case "mapOf": o = Map.of("a", 1); break; case "setOf": o = Set.of(1); break; case "keySet": o = new HashMap<String, Integer>().keySet(); break; case "values": o = new HashMap<String, Integer>().values(); break; case "entrySet": o = new HashMap<String, Integer>().entrySet(); break; case "subList": o = new ArrayList<Integer>(List.of(1, 2, 3)).subList(0, 2); break; case "anonList": o = new ArrayList<Integer>() { }; break; case "blockingDeque": o = new java.util.concurrent.LinkedBlockingDeque<Integer>(); break; case "copyOnWrite": o = new java.util.concurrent.CopyOnWriteArrayList<Integer>(); break; case "stringBuilder": o = new StringBuilder("x"); break; default: o = null; } return new Solution().describe(o); } }` }, cases: [
        [["LinkedList"],"List,Queue,Deque"],
        [["TreeMap"],"Map"],
        [["String"],"none"],
        [["nil"],"none"],
        [["unmodList"],"List"],
        [["ArrayList"],"List"],
        [["HashSet"],"Set"],
        [["TreeSet"],"Set"],
        [["ArrayDeque"],"Queue,Deque"],
        [["PriorityQueue"],"Queue"],
        [["HashMap"],"Map"],
        [["LinkedHashMap"],"Map"],
        [["LinkedHashSet"],"Set"],
        [["unmodSet"],"Set"],
        [["unmodMap"],"Map"],
        [["unmodCollection"],"none"],
        [["Vector"],"List"],
        [["Stack"],"List"],
        [["ConcurrentLinkedDeque"],"Queue,Deque"],
        [["ConcurrentHashMap"],"Map"],
        [["asList"],"List"],
        [["listOf"],"List"],
        [["mapOf"],"Map"],
        [["setOf"],"Set"],
        [["keySet"],"Set"],
        [["values"],"none"],
        [["entrySet"],"Set"],
        [["subList"],"List"],
        [["anonList"],"List"],
        [["blockingDeque"],"Queue,Deque"],
        [["copyOnWrite"],"List"],
        [["Integer"],"none"],
        [["intArray"],"none"],
        [["Object"],"none"],
        [["stringBuilder"],"none"]
      ] },
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
      tests: { sig: 'list<int> -> void', fn: 'removeEvens', mutate: 0, cases: [
        [[[4,7,2,9,6,3]],[7,9,3]],
        [[[1]],[1]],
        [[[2]],[]],
        [[[0]],[]],
        [[[1,3,5]],[1,3,5]],
        [[[2,4,6]],[]],
        [[[-3,-4,0,5,-1,8]],[-3,5,-1]],
        [[[2147483647,-2147483648,2147483646,-2147483647]],[2147483647,-2147483647]],
        [[[2,2,2,3,2,2]],[3]],
        [[[1,2,1,2,1,2]],[1,1,1]],
        [[[7,7,8,8,9,9]],[7,7,9,9]],
        [[{"$rep":2,"n":1000000}],[]],
        [[{"$rep":1,"n":1000000}],{"$rep":1,"n":1000000}],
        [[{"$concat":[{"$rep":2,"n":500000},{"$rep":3,"n":500000}]}],{"$rep":3,"n":500000}],
        [[{"$concat":[{"$rep":5,"n":250000},{"$rep":4,"n":500000},{"$rep":7,"n":250000}]}],{"$concat":[{"$rep":5,"n":250000},{"$rep":7,"n":250000}]}]
      ] },
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
        while (frames.length < 4) frames.push({ narr: 'Recap: try a longer input to see more steps — every frame above shows exactly what the JDK does for each call.', parts: frames[frames.length - 1].parts });
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
      tests: { sig: 'list<string> -> list<string>', fn: 'dedupe', cases: [
        [[["u7","u2","u7","u9","u2"]],["u7","u2","u9"]],
        [[[]],[]],
        [[["a"]],["a"]],
        [[["a","a","a"]],["a"]],
        [[["a","b","c"]],["a","b","c"]],
        [[["c","b","a","b","c"]],["c","b","a"]],
        [[["","","x",""]],["","x"]],
        [[["A","a","A"]],["A","a"]],
        [[["b","a","b","a","b"]],["b","a"]],
        [[{"$rep":"u1","n":1000000}],["u1"]],
        [[{"$concat":[{"$rep":"a","n":500000},{"$rep":"b","n":500000}]}],["a","b"]],
        [[{"$concat":[{"$rep":"x","n":300000},["y"],{"$rep":"x","n":300000},["z"],{"$rep":"y","n":399998}]}],["x","y","z"]]
      ] },
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
        while (frames.length < 4) frames.push({ narr: 'Recap: try a longer input to see more steps — every frame above shows exactly what the JDK does for each call.', parts: frames[frames.length - 1].parts });
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
      tests: { sig: 'string -> int', fn: 'firstUniqChar', cases: [
        [["swiss"],1],
        [["aabb"],-1],
        [["a"],0],
        [["aab"],2],
        [["baa"],0],
        [["abab"],-1],
        [["loveleetcode"],2],
        [["leetcode"],0],
        [["aabbc"],4],
        [["abéa"],1],
        [["éé€"],2],
        [["A a A"],2],
        [["  x"],2],
        [["11223"],4],
        [[{"$concat":[{"$rep":"a","n":99999},"b"]}],99999],
        [[{"$rep":"a","n":100000}],-1],
        [[{"$concat":["b",{"$rep":"a","n":99999}]}],0],
        [[{"$concat":[{"$rep":"ab","n":49999},"c",{"$rep":"ab","n":1}]}],99998]
      ] },
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
        while (frames.length < 4) frames.push({ narr: 'Recap: try a longer input to see more steps — every frame above shows exactly what the JDK does for each call.', parts: frames[frames.length - 1].parts });
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
        while (frames.length < 4) frames.push({ narr: 'Recap: try a longer input to see more steps — every frame above shows exactly what the JDK does for each call.', parts: frames[frames.length - 1].parts });
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
System.out.println(bad.peek());    // -2147483648 (MIN_VALUE!) — the overflowing comparator lies
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
      tests: { sig: 'int[] int -> int', fn: 'findKthLargest', cases: [
        [[[3,2,1,5,6,4],2],5],
        [[[3,2,3,1,2,4,5,5,6],4],4],
        [[[1],1],1],
        [[[1,2],1],2],
        [[[1,2],2],1],
        [[[5,5,5],2],5],
        [[[-1,-5,-3],1],-1],
        [[[-1,-5,-3],3],-5],
        [[[0,0,0,1],2],0],
        [[[10000,-10000],2],-10000],
        [[[7,7,6,6,5],3],6],
        [[[2,1],2],1],
        [[{"$concat":[{"$rep":5,"n":50000},{"$rep":-10000,"n":50000}]},50001],-10000],
        [[{"$concat":[{"$rep":5,"n":50000},{"$rep":-10000,"n":50000}]},50000],5],
        [[{"$range":[-10000,10000]},1],9999],
        [[{"$range":[10000,-10000,-1]},20000],-9999],
        [[{"$rep":3,"n":100000},77777],3],
        [[{"$concat":[{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]}]},15000],5000]
      ] },
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

  /* ======================================================================
     TOPIC 6 — Iterators, fail-fast and ConcurrentModificationException
     ====================================================================== */
  topics.push({
    title: 'Iterators, Fail-Fast Behaviour & ConcurrentModificationException',
    analogy: `<p>You are a <b>ticket checker walking down a train</b>, counting seats with a clicker. The conductor gives you the train's "version number" when you start. If someone uncouples a carriage behind your back, your count no longer matches reality — so at the next seat you check the version number, see it changed, and <b>stop with an alarm</b> rather than report nonsense. That alarm is <code>ConcurrentModificationException</code>.</p>
<p>The polite way to remove a carriage is to <b>ask the checker to do it</b> (<code>iterator.remove()</code>): she removes it and updates her own notes, so no alarm.</p>`,
    explain: `<p>An <b>Iterator</b> is a cursor that walks a collection: <code>hasNext()</code> (is there more?), <code>next()</code> (give me the next one and move on), <code>remove()</code> (delete the one I just got). The for-each loop is just shorthand:</p>
${H.table(['You write', 'The compiler produces'], [['<code>for (String s : list) { … }</code>', '<code>Iterator&lt;String&gt; it = list.iterator();<br>while (it.hasNext()) { String s = it.next(); … }</code>']])}
<p><b>Fail-fast:</b> ArrayList, HashMap, HashSet, TreeMap… keep a counter called <code>modCount</code> that goes up on every <b>structural change</b> (anything that changes the size: <code>add</code>, <code>remove</code>, <code>clear</code>; <i>not</i> <code>set</code> or <code>put</code> on an existing key). The iterator remembers the value it started with (<code>expectedModCount</code>). On each <code>next()</code> it compares them; if they differ, it throws <code>ConcurrentModificationException</code> (CME). Despite the name, this happens in <b>single-threaded</b> code all the time.</p>
${H.table(['Want to…', 'Safe way', 'Unsafe way'], [
      ['remove matching items', '<code>list.removeIf(x -&gt; …)</code> or <code>it.remove()</code>', H.c('r', '<code>list.remove(x)</code> inside for-each')],
      ['remove map entries', '<code>map.entrySet().removeIf(e -&gt; …)</code> / <code>map.values().removeIf(…)</code>', H.c('r', '<code>map.remove(k)</code> inside for-each over keySet')],
      ['replace values', '<code>list.replaceAll(…)</code>, <code>map.replaceAll(…)</code>, <code>ListIterator.set</code>, <code>entry.setValue</code>', '—  (set does not trigger CME)'],
      ['add while walking', '<code>ListIterator.add</code>, or collect into a new list then <code>addAll</code>', H.c('r', '<code>list.add</code> inside for-each')]
    ])}
<p><b>ListIterator</b> (lists only) can go both ways (<code>hasPrevious/previous</code>), tells you the index (<code>nextIndex</code>), and can <code>set</code> and <code>add</code> at the cursor.</p>
<p><b>Fail-safe / weakly consistent</b> iterators belong to concurrent collections: <code>CopyOnWriteArrayList</code> iterates a <b>snapshot</b> (changes during the loop are invisible to it), <code>ConcurrentHashMap</code> iterators never throw CME and may or may not see concurrent updates.</p>`,
    clues: [
      '"remove items while looping / filter in place" → <code>removeIf</code> or <code>Iterator.remove()</code>',
      'Stack trace shows <code>ArrayList$Itr.checkForComodification</code> → you changed the list inside a for-each',
      '"What does this print?" + <code>list.remove</code> inside for-each → check WHICH element is removed (second-to-last = no exception!)',
      '"many threads read, few write, iteration must never fail" → <b>CopyOnWriteArrayList</b> / <b>ConcurrentHashMap</b>',
      '"modify each element in place" → <code>replaceAll</code> or <code>ListIterator.set</code> (no structural change)',
      '"fail-fast vs fail-safe iterator?" → classic interview question: modCount check vs snapshot/weakly consistent'
    ],
    code: [`List<String> names = new ArrayList<>(List.of("ann", "bob", "cy", "dee"));

// 1) Iterator.remove — removes the element just returned by next()
Iterator<String> it = names.iterator();
while (it.hasNext())
    if (it.next().length() == 2) it.remove();
System.out.println(names);                       // [ann, bob, dee]

// 2) removeIf — the modern one-liner
names.removeIf(n -> n.startsWith("b"));
System.out.println(names);                       // [ann, dee]

// 3) ListIterator — set and add at the cursor
ListIterator<String> li = names.listIterator();
while (li.hasNext()) {
    String n = li.next();
    li.set(n.toUpperCase());                     // replace in place
    if (n.equals("ann")) li.add("amy");          // insert after current
}
System.out.println(names);                       // [ANN, amy, DEE]

// 4) Maps: remove through a view
Map<String, Integer> stock = new HashMap<>(Map.of("pen", 0, "ink", 4, "cap", 0));
stock.values().removeIf(q -> q == 0);
System.out.println(stock);                       // {ink=4}`],
    codeTitle: ['Four safe ways to change a collection while walking it'],
    viz: {
      title: 'Inside a for-each: cursor, size and modCount',
      input: 'a b c d | c',
      inputLabel: 'Words, then | and the word to remove (max 10 words). Try "a b c d | d" or "a b c d | b".',
      gen: function (input) {
        var hint = 'Format: words | target   e.g.  a b c d | c   (max 10 words)';
        var s = clean(input);
        var bar = s.split('|');
        if (bar.length !== 2) throw new Error(hint);
        var list = wordsOf(bar[0], 10, hint), target = clean(bar[1]);
        if (!/^[A-Za-z0-9_]+$/.test(target)) throw new Error(hint);
        var orig = list.slice();
        var CODE = 'List<String> list = new ArrayList<>(List.of(' + orig.map(function (x) { return '"' + x + '"'; }).join(', ') + '));\nIterator<String> it = list.iterator();   // what for-each really does\nwhile (it.hasNext()) {                    // cursor != size ?\n    String s = it.next();                 // modCount == expectedModCount ?\n    if (s.equals("' + target + '"))\n        list.remove(s);                   // modCount++  (iterator NOT told)\n}\nSystem.out.println(list);';
        var frames = [], cursor = 0, modCount = 0, expected = 0, size = list.length, steps = 0, cur = null;
        function arr(hl, lab) {
          var ptr = {};
          if (cursor < Math.max(list.length, 1)) ptr[cursor] = 'cursor';
          return { type: 'array', label: lab || 'list (backing array)', values: list.length ? list.slice() : ['(empty)'], hl: hl || {}, ptr: ptr, showIdx: true };
        }
        function v(h) { return { type: 'vars', label: 'Iterator state vs list state', vals: { cursor: cursor, size: list.length, modCount: modCount, expectedModCount: expected, s: cur === null ? '—' : cur }, hl: h || {} }; }
        function fr(line, cls, narr, hl, vh, extra) { var p = [{ type: 'code', label: 'The for-each loop, de-sugared', lang: 'java', code: CODE, hl: one(line, cls) }, arr(hl), v(vh)]; (extra || []).forEach(function (x) { p.push(x); }); frames.push({ narr: narr, parts: p }); }
        fr(2, 'cur', 'The for-each loop asks the list for an iterator. The iterator starts with <b>cursor = 0</b> and copies <b>expectedModCount = modCount = 0</b>.', {}, { expectedModCount: 'ok' });
        var crashed = false;
        while (steps++ < 40) {
          var hn = cursor !== list.length;
          fr(3, hn ? 'ok' : 'done', '<code>hasNext()</code> is just <code>cursor != size</code> → ' + cursor + ' != ' + list.length + ' → <b>' + hn + '</b>.' + (hn ? '' : ' The loop ends.'), {}, { cursor: 'cur', size: 'cur' });
          if (!hn) break;
          if (modCount !== expected) {
            crashed = true;
            fr(4, 'bad', '<code>next()</code> first checks <code>modCount == expectedModCount</code>: ' + modCount + ' ≠ ' + expected + ' → <span class="c-r"><b>ConcurrentModificationException</b></span>! The list changed behind the iterator\'s back.', {}, { modCount: 'bad', expectedModCount: 'bad' }, [out('Exception in thread "main" java.util.ConcurrentModificationException\n    at java.util.ArrayList$Itr.checkForComodification')]);
            break;
          }
          if (cursor >= list.length) break;
          cur = list[cursor]; var at = cursor; cursor++;
          fr(4, 'cur', '<code>next()</code>: counts match, so return element ' + at + ' (<b>' + esc(cur) + '</b>) and move cursor to ' + cursor + '.', one(at, 'cur'), { s: 'cur', cursor: 'cur' });
          if (cur === target) {
            var idx = list.indexOf(cur);
            list.splice(idx, 1); modCount++;
            fr(6, 'bad', '<b>' + esc(cur) + '</b> matches → <code>list.remove(s)</code> deletes index ' + idx + ', shifts the rest left, and bumps <b>modCount to ' + modCount + '</b>. The iterator still believes ' + expected + ' and its cursor (' + cursor + ') now points one element further than intended.', {}, { modCount: 'bad', size: 'cur' });
          } else {
            fr(5, 'done', '"' + esc(cur) + '" is not "' + esc(target) + '" → nothing to do.', {}, {});
          }
        }
        if (!crashed) {
          var silent = orig.length !== list.length;
          fr(8, silent ? 'bad' : 'ok', silent ? 'The loop ended <b>without an exception</b>, because after the removal <code>cursor == size</code> made <code>hasNext()</code> false before <code>next()</code> could check modCount. This happens when you remove the <b>second-to-last</b> element. It looks like it works — but any other position would crash. Fail-fast is "best effort", never a guarantee.' : 'No removal happened, so modCount never changed and the loop finished normally.', {}, {}, [out('[' + list.join(', ') + ']')]);
        }
        /* the safe version with it.remove() */
        list = orig.slice(); cursor = 0; modCount = 0; expected = 0; cur = null;
        var lastRet = -1;
        CODE = 'Iterator<String> it = list.iterator();\nwhile (it.hasNext()) {\n    String s = it.next();\n    if (s.equals("' + target + '"))\n        it.remove();      // remove THROUGH the iterator\n}\nSystem.out.println(list);   // or simply: list.removeIf(x -> x.equals("' + target + '"));';
        fr(1, 'ok', '<b>The fix:</b> remove through the iterator. <code>it.remove()</code> deletes the element just returned, steps the cursor back, and re-syncs <code>expectedModCount</code>.', {}, {});
        steps = 0;
        while (cursor !== list.length && steps++ < 20) {
          cur = list[cursor]; lastRet = cursor; cursor++;
          if (cur === target) {
            list.splice(lastRet, 1); modCount++; cursor = lastRet; expected = modCount;
            fr(5, 'ok', '<code>it.remove()</code> deletes "' + esc(cur) + '": modCount → ' + modCount + ' <b>and</b> expectedModCount → ' + expected + '; cursor goes back to ' + cursor + ' so the shifted element is not skipped.', one(cursor, 'win'), { modCount: 'ok', expectedModCount: 'ok' });
          }
        }
        fr(7, 'ok', 'Every element was visited, all "' + esc(target) + '" removed, no exception. In modern code just write <code>list.removeIf(x -&gt; x.equals("' + esc(target) + '"))</code> — same safety, one line, O(n) for ArrayList.', {}, {}, [out('[' + list.join(', ') + ']')]);
        return frames;
      }
    },
    examples: [
      {
        title: 'Predict the output: remove the second-to-last element',
        html: `<p>Removing "c" from [a, b, c, d] inside a for-each prints <b>[a, b, d]</b> with no exception — and "d" is never even visited! After the removal, size drops to 3 and cursor is 3, so <code>hasNext()</code> returns false before <code>next()</code> can notice the change.</p>
${H.table(['After visiting', 'cursor', 'size', 'hasNext()'], [['a', '1', '4', 'true'], ['b', '2', '4', 'true'], ['c (removed)', '3', H.c('r', '3'), H.c('r', 'false → loop ends silently')]])}`,
        code: `List<String> l = new ArrayList<>(List.of("a", "b", "c", "d"));
for (String s : l)
    if (s.equals("c")) l.remove(s);
System.out.println(l);   // [a, b, d]   — no exception, "d" never visited`
      },
      {
        title: 'Predict the output: remove the LAST element',
        html: `<p>Now remove "d". After the removal size = 3 but cursor = 4, so <code>hasNext()</code> (4 != 3) is <b>true</b>; <code>next()</code> then checks modCount and throws <code>ConcurrentModificationException</code>. Same mistake, different symptom — which is why you never rely on either.</p>`,
        code: `List<String> l = new ArrayList<>(List.of("a", "b", "c", "d"));
try {
    for (String s : l)
        if (s.equals("d")) l.remove(s);
} catch (ConcurrentModificationException e) {
    System.out.println("CME!");      // printed
}
System.out.println(l);               // [a, b, c] — the removal happened before the crash`
      },
      {
        title: 'set() is not structural; add() is',
        html: `<p><code>set</code> replaces a value without changing the size, so modCount is untouched and the loop is fine. <code>add</code> changes the size → CME on the next <code>next()</code>. Same for maps: <code>put</code> on an <b>existing</b> key is fine, <code>put</code> of a <b>new</b> key during iteration throws.</p>
${H.table(['Inside for-each', 'Result'], [['<code>list.set(1, 20)</code>', H.c('g', 'OK → [1, 20, 3, 4]')], ['<code>list.add(99)</code>', H.c('r', 'CME')], ['<code>map.put(existingKey, v)</code>', H.c('g', 'OK')], ['<code>map.put(newKey, v)</code>', H.c('r', 'CME (HashMap)')]])}`,
        code: `List<Integer> l = new ArrayList<>(List.of(1, 2, 3, 4));
for (Integer x : l)
    if (x == 1) l.set(1, 20);        // not structural
System.out.println(l);               // [1, 20, 3, 4]
Map<String, Integer> m = new HashMap<>(Map.of("a", 1, "b", 2));
for (Map.Entry<String, Integer> e : m.entrySet())
    e.setValue(e.getValue() * 10);   // write-through, safe
System.out.println(m.get("a") + m.get("b"));   // 30`
      },
      {
        title: 'CopyOnWriteArrayList iterates a snapshot',
        html: `<p>Each write copies the whole backing array; an iterator keeps the array that existed when it started. So adding during iteration is legal and the loop does not see the new elements — no CME, no infinite loop. Great for listener lists (rare writes, frequent reads); terrible for write-heavy data (every add is O(n)).</p>`,
        code: `List<Integer> listeners = new CopyOnWriteArrayList<>(List.of(1, 2, 3));
for (Integer x : listeners) listeners.add(x * 10);   // loop sees only 1, 2, 3
System.out.println(listeners);                      // [1, 2, 3, 10, 20, 30]`
      }
    ],
    deepDive: `<p><b>The exact ArrayList mechanics.</b> <code>ArrayList.Itr</code> has three fields: <code>cursor</code> (index of the next element), <code>lastRet</code> (index of the last returned, −1 if none) and <code>expectedModCount</code>. <code>hasNext()</code> is only <code>cursor != size</code> — it does <b>not</b> check modCount. <code>next()</code> calls <code>checkForComodification()</code> first. <code>Itr.remove()</code> throws <code>IllegalStateException</code> if called twice in a row or before <code>next()</code> (lastRet == −1), otherwise removes at lastRet, sets <code>cursor = lastRet</code> and re-syncs expectedModCount. That asymmetry is what makes the "second-to-last element" removal silently succeed.</p>
<p><b>Why "best effort"?</b> The JDK docs say fail-fast behaviour "cannot be guaranteed" — the counter is a plain int, not volatile, so another thread's change may not be visible, and the check only happens in certain methods. Use CME as a <b>bug detector</b>, never as program logic. For real concurrency you need concurrent collections or locks.</p>
<p><b>Other CME sources:</b> <code>subList</code> views after the parent list was structurally changed; modifying a HashMap inside its own <code>computeIfAbsent</code> function (Java 9+ throws); <code>Collections.sort</code> / <code>list.sort</code> while another iterator is open (sort bumps modCount since Java 8); streams over a collection modified mid-pipeline (<code>forEach</code> on ArrayList checks modCount at the end).</p>
<p><b>Fail-safe flavours.</b> <code>CopyOnWriteArrayList</code>/<code>CopyOnWriteArraySet</code>: snapshot iterators, O(n) writes, iterator <code>remove</code> unsupported. <code>ConcurrentHashMap</code>, <code>ConcurrentSkipListMap</code>, <code>ConcurrentLinkedQueue</code>: <b>weakly consistent</b> iterators — never throw CME, reflect some state at or after creation, each element at most once. <code>Collections.synchronizedList</code> is <b>not</b> safe to iterate without holding its lock: you must wrap the loop in <code>synchronized (list) { … }</code>.</p>
<p><b>Spliterator</b> (Java 8) is the iterator's parallel sibling used by streams; it can split a collection for parallel processing and carries characteristics such as ORDERED, SIZED, DISTINCT, SORTED that let the stream library skip work.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI code assistants still produce "remove inside for-each" bugs, especially when translating from Python (where <code>for x in list[:]</code> iterates a copy) or JavaScript (<code>filter</code> creates a new array). The good news: if you paste the stack trace (<code>ArrayList$Itr.checkForComodification</code>), any modern model diagnoses it instantly and suggests <code>removeIf</code>.</p>
<p><b>Use AI as a partner:</b> ask "<i>find every place in this file where a collection is modified while being iterated</i>" — a mechanical scan it does well — and "<i>write a unit test that proves this loop removes every match including adjacent duplicates</i>" (the classic index-loop skip bug).</p>
<p><b>What you must still own:</b> knowing that a passing test does not prove safety (the second-to-last case passes!), choosing between snapshot (CopyOnWrite) and weakly consistent (ConcurrentHashMap) semantics for multi-threaded code, and explaining modCount in an interview without notes.</p>`,
    problems: [{
      title: 'Evict Inactive Users from a Session Map',
      level: 'Easy', tags: ['Iterator', 'removeIf', 'HashMap'], companies: ['Paytm', 'Atlassian', 'Oracle'],
      statement: `<p>A <code>Map&lt;String, Integer&gt; lastSeen</code> maps user id → last active day number. Given <code>today</code> and <code>maxIdle</code>, remove every user whose idle time <code>today - lastSeen</code> is <b>greater than</b> <code>maxIdle</code>, <b>in place</b>, and return how many were removed.</p>`,
      constraints: `0 ≤ map size ≤ 10<sup>6</sup>; 0 ≤ day ≤ 10<sup>9</sup>; the same Map object must be modified (other code holds a reference to it).`,
      example: `<p>lastSeen = {ann=10, bob=2, cy=9, dee=1}, today = 12, maxIdle = 5 → idle times ann 2, ${H.c('r', 'bob 10')}, cy 3, ${H.c('r', 'dee 11')} → remove bob and dee → returns ${H.c('g', '2')}, map {ann=10, cy=9}.</p>`,
      brute: {
        why: `<p>The naive <code>for (String id : map.keySet()) if (…) map.remove(id);</code> throws ConcurrentModificationException (or silently misses entries). The common "fix" — copy the keys to a list first, then remove — works but allocates an O(n) copy and does a second hash lookup per key.</p>`,
        code: `class Solution {
    int evict(Map<String, Integer> lastSeen, int today, int maxIdle) {
        List<String> doomed = new ArrayList<>();
        for (String id : lastSeen.keySet())               // iterate the original...
            if (today - lastSeen.get(id) > maxIdle) doomed.add(id);   // extra get() per key
        for (String id : doomed) lastSeen.remove(id);     // ...modify afterwards
        return doomed.size();
    }
}`
      },
      mcq: { q: 'Which line removes entries from a HashMap during iteration WITHOUT risking CME?', options: ['<code>it.remove()</code> on an iterator of <code>map.entrySet()</code>', '<code>map.remove(key)</code> inside <code>for (K key : map.keySet())</code>', '<code>map.put(key, null)</code> inside the loop', '<code>map.keySet().clear()</code> inside the loop'], answer: 0, explain: 'Only the iterator\'s own remove keeps expectedModCount in sync. map.remove changes modCount behind the iterator\'s back; put(key, null) keeps the key (value null); clearing inside the loop is still a structural change.' },
      hints: [
        `<p>Hint 1: The map's views (<code>entrySet()</code>, <code>keySet()</code>, <code>values()</code>) are live: removing from a view removes from the map.</p>`,
        `<p>Hint 2: <code>map.entrySet().removeIf(e -&gt; today - e.getValue() &gt; maxIdle)</code> does it in one pass. To return the count, compare <code>size()</code> before and after, or use an explicit <code>Iterator&lt;Map.Entry&lt;…&gt;&gt;</code> and count each <code>it.remove()</code>.</p>`,
        `<p>Hint 3: Edge cases: empty map → 0; idle exactly equal to maxIdle stays (strictly greater is removed); <code>today - lastSeen</code> fits in int here but prefer <code>long</code> if days could be negative or huge.</p>`
      ],
      tests: { sig: 'string[] int[] int int -> string', fn: 'evictCheck',
        harness: { java: `class Check { static String evictCheck(String[] keys, int[] vals, int today, int maxIdle) { Map<String, Integer> m = new HashMap<>(); for (int i = 0; i < vals.length; i++) m.put(keys.length > 0 ? keys[i] : "k" + i, vals[i]); Map<String, Integer> same = m; int removed = new Solution().evict(m, today, maxIdle); long sum = 0; for (int v : same.values()) sum += v; return removed + " " + (same.size() <= 10 ? new TreeMap<>(same).toString() : "n=" + same.size() + " sum=" + sum); } }` }, cases: [
        [[["ann","bob","cy","dee"],[10,2,9,1],12,5],"2 {ann=10, cy=9}"],
        [[[],[],5,1],"0 {}"],
        [[["a"],[5],5,0],"0 {a=5}"],
        [[["a"],[4],5,0],"1 {}"],
        [[["a","b"],[3,4],10,6],"1 {b=4}"],
        [[["a","b"],[7,7],10,3],"0 {a=7, b=7}"],
        [[["a","b"],[7,7],10,2],"2 {}"],
        [[["a","b","c"],[0,5,10],10,10],"0 {a=0, b=5, c=10}"],
        [[["a","b"],[20,30],10,0],"0 {a=20, b=30}"],
        [[["a","b"],[0,1000000000],1000000000,999999999],"1 {b=1000000000}"],
        [[[],{"$range":[0,1000000]},1000000,500000],"500000 n=500000 sum=374999750000"],
        [[[],{"$rep":0,"n":1000000},10,5],"1000000 {}"],
        [[[],{"$rep":9,"n":1000000},10,5],"0 n=1000000 sum=9000000"],
        [[[],{"$concat":[{"$rep":1,"n":500000},{"$rep":9,"n":500000}]},10,5],"500000 n=500000 sum=4500000"]
      ] },
      solution: {
        approach: `<p>Walk the entry set once with an explicit iterator; for each entry over the idle limit call <code>it.remove()</code>, which removes it from the map and keeps the iterator consistent. The one-liner <code>entrySet().removeIf</code> is equivalent.</p>`,
        code: `class Solution {
    int evict(Map<String, Integer> lastSeen, int today, int maxIdle) {
        int removed = 0;
        Iterator<Map.Entry<String, Integer>> it = lastSeen.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, Integer> e = it.next();
            if ((long) today - e.getValue() > maxIdle) {   // idle strictly greater
                it.remove();                                // safe structural change
                removed++;
            }
        }
        return removed;
    }

    int evictOneLiner(Map<String, Integer> lastSeen, int today, int maxIdle) {
        int before = lastSeen.size();
        lastSeen.entrySet().removeIf(e -> (long) today - e.getValue() > maxIdle);
        return before - lastSeen.size();
    }

    public static void main(String[] args) {
        Map<String, Integer> m = new TreeMap<>(Map.of("ann", 10, "bob", 2, "cy", 9, "dee", 1));
        System.out.println(new Solution().evict(m, 12, 5) + " " + m);   // 2 {ann=10, cy=9}
    }
}`,
        dry: { head: ['entry', 'idle = 12 − day', '> 5?', 'action', 'removed'], rows: [
          ['ann=10', '2', 'no', 'keep', '0'],
          ['bob=2', '10', 'yes', '<span class="c-r">it.remove()</span>', '1'],
          ['cy=9', '3', 'no', 'keep', '1'],
          ['dee=1', '11', 'yes', '<span class="c-r">it.remove()</span>', '<span class="c-g">2</span>']
        ] },
        complexity: `<p>Time O(n) — one pass, no extra lookups. Extra space O(1) (the brute force needs O(n) for the copied keys).</p>`,
        followUps: ['If this map is shared by many request threads, what do you change? (ConcurrentHashMap — its removeIf/iterators are safe and weakly consistent.)', 'Evict in O(k) instead of O(n) when only k users are stale (hint: keep a TreeMap from day → users, or a LinkedHashMap in access order).']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — The Collections (and Arrays) utility toolbox
     ====================================================================== */
  topics.push({
    title: 'The Collections Toolbox: sort, binarySearch, reverse, rotate, frequency, unmodifiable & more',
    analogy: `<p><code>Collection</code> (singular) is the <b>kitchen</b>; <code>Collections</code> (plural) is the <b>drawer of gadgets</b> next to it — peeler, grater, timer. You could peel with a knife (write the loop yourself), but the gadget is faster to use, already tested, and everyone reading your code knows what it does instantly. Interviewers notice when you reach for the right gadget instead of hand-rolling twenty lines.</p>`,
    explain: `<p><code>java.util.Collections</code> is a class with only <b>static methods</b> that work on any collection. The ones worth knowing by heart:</p>
${H.table(['Method', 'What it does', 'Example result'], [
      ['<code>sort(list)</code> / <code>sort(list, cmp)</code>', 'stable sort (same as <code>list.sort</code>)', '[3,1,2] → [1,2,3]'],
      ['<code>reverse(list)</code>', 'reverse in place', '[1,2,3] → [3,2,1]'],
      ['<code>shuffle(list[, rnd])</code>', 'random order (pass a seeded Random for repeatable tests)', '—'],
      ['<code>swap(list, i, j)</code>', 'swap two positions', '—'],
      ['<code>rotate(list, d)</code>', 'element at i moves to (i + d) mod n', '[1,2,3,4,5], 2 → [4,5,1,2,3]'],
      ['<code>max(c)</code> / <code>min(c[, cmp])</code>', 'largest / smallest in one pass', '—'],
      ['<code>frequency(c, x)</code>', 'how many elements equal x', '—'],
      ['<code>binarySearch(sortedList, key)</code>', 'index if found, else <code>-(insertionPoint) - 1</code>', '[1,3,5,7], 4 → -3'],
      ['<code>nCopies(n, x)</code>', 'read-only list of n copies', 'nCopies(3,"ab") → [ab, ab, ab]'],
      ['<code>disjoint(a, b)</code>', 'true if no common element', '—'],
      ['<code>addAll(c, e1, e2, …)</code>', 'add many at once', '—'],
      ['<code>emptyList()</code>, <code>singletonList(x)</code>', 'tiny read-only lists', '—'],
      ['<code>unmodifiableList(l)</code>', 'read-only <b>view</b> (still sees changes to l)', '—'],
      ['<code>synchronizedList(l)</code>', 'every call locked (legacy-style thread safety)', '—'],
      ['<code>reverseOrder()</code>', 'comparator for descending natural order', '—']
    ])}
<p><b>Three ways to make a read-only list — know the difference:</b></p>
${H.table(['', '<code>Collections.unmodifiableList(l)</code>', '<code>List.copyOf(l)</code>', '<code>List.of(a, b)</code>'], [
      ['Copy or view?', 'view (changes to l show through)', 'snapshot copy', 'new list'],
      ['nulls', 'allowed (if l has them)', 'NPE', 'NPE'],
      ['Mutation', 'throws UOE', 'throws UOE', 'throws UOE']
    ])}
<p><b>The Arrays sibling</b> does the same for arrays: <code>Arrays.sort</code>, <code>Arrays.binarySearch</code>, <code>Arrays.fill</code>, <code>Arrays.asList</code>, <code>Arrays.toString</code>, <code>Arrays.equals</code>, <code>Arrays.stream</code>. And <b>Comparator</b> has its own helpers: <code>Comparator.comparing(Person::age).thenComparing(Person::name).reversed()</code>, <code>nullsFirst(…)</code>.</p>`,
    clues: [
      '"sort by X, then by Y" → <code>list.sort(Comparator.comparing(…).thenComparing(…))</code>',
      '"find where to insert to keep it sorted" → <code>binarySearch</code> and decode <code>-(ip) - 1</code>',
      '"rotate the array/list by k" → <code>Collections.rotate</code> or the three-reversal trick',
      '"return the data but callers must not modify it" → <code>unmodifiableList</code> (view) vs <code>List.copyOf</code> (defensive copy)',
      '"how many times does x appear" in a small list → <code>Collections.frequency</code> (O(n)); many queries → build a frequency map',
      '"do these two groups share anything?" → <code>Collections.disjoint</code>'
    ],
    code: [`List<Integer> nums = new ArrayList<>(List.of(5, 3, 9, 1, 3, 7));
Collections.sort(nums);                                  // [1, 3, 3, 5, 7, 9]
System.out.println(Collections.binarySearch(nums, 7));   // 4
System.out.println(Collections.binarySearch(nums, 4));   // -4  -> insertion point 3
Collections.reverse(nums);                               // [9, 7, 5, 3, 3, 1]
Collections.swap(nums, 0, nums.size() - 1);              // [1, 7, 5, 3, 3, 9]
Collections.rotate(nums, 2);                             // [3, 9, 1, 7, 5, 3]
System.out.println(nums);
System.out.println(Collections.frequency(nums, 3) + " " + Collections.max(nums) + " " + Collections.min(nums)); // 2 9 1
System.out.println(Collections.nCopies(3, "ab"));        // [ab, ab, ab]
System.out.println(Collections.disjoint(List.of(1, 2), Set.of(3, 4)));   // true

List<String> words = new ArrayList<>(List.of("pear", "fig", "apple", "kiwi"));
words.sort(Comparator.comparing(String::length).thenComparing(Comparator.reverseOrder()));
System.out.println(words);                               // [fig, pear, kiwi, apple]
System.out.println(Collections.max(words, Comparator.comparing(String::length)));   // apple`],
    codeTitle: ['The toolbox in action'],
    viz: {
      title: 'Run the toolbox on your list',
      input: '5 3 9 1 3 7 | 7',
      inputLabel: 'Integers, then | and a key to binary-search (max 12 numbers)',
      gen: function (input) {
        var hint = 'Format: numbers | key   e.g.  5 3 9 1 3 7 | 7';
        var parts = clean(input).split('|');
        if (parts.length !== 2) throw new Error(hint);
        var a = intsOf(parts[0], 2, 12, -999, 999, hint), key = intsOf(parts[1], 1, 1, -999, 999, hint)[0];
        var frames = [], orig = a.slice();
        function arr(vals, hl, ptr, label, range) { var p = { type: 'array', label: label || 'list', values: vals.slice(), hl: hl || {}, ptr: ptr || {}, showIdx: true }; if (range) p.range = range; return p; }
        function cd(line) { return { type: 'code', label: 'Call', lang: 'java', code: line, hl: { 1: 'cur' } }; }
        frames.push({ narr: 'Starting list. Every call below is a single line of <code>Collections</code> — no hand-written loops.', parts: [arr(a, {}, {}, 'list (original)')] });
        a.sort(function (x, y) { return x - y; });
        var hs = {}; a.forEach(function (_, i) { hs[i] = 'ok'; });
        frames.push({ narr: '<code>Collections.sort(list)</code> → ascending, <b>stable</b> (equal elements keep their relative order). Internally it dumps the list into an array, runs TimSort (O(n log n), very fast on partly-sorted data) and writes it back.', parts: [cd('Collections.sort(list);'), arr(a, hs, {}, 'after sort')] });
        /* exact java.util.Collections.indexedBinarySearch */
        var lo = 0, hi = a.length - 1, found = null;
        while (lo <= hi) {
          var mid = (lo + hi) >>> 1, mv = a[mid], h2 = {}, p2 = {};
          h2[mid] = 'cur'; p2[lo] = 'lo'; p2[hi] = (p2[hi] ? p2[hi] + ',' : '') + 'hi'; p2[mid] = (p2[mid] ? p2[mid] + ',' : '') + 'mid';
          var cmp = mv < key ? -1 : mv > key ? 1 : 0;
          frames.push({ narr: '<code>binarySearch(list, ' + key + ')</code>: lo=' + lo + ', hi=' + hi + ', mid=' + mid + ' → list[mid] = ' + mv + (cmp < 0 ? ' &lt; ' + key + ' → search the right half (lo = mid + 1).' : cmp > 0 ? ' &gt; ' + key + ' → search the left half (hi = mid − 1).' : ' == key → <b>found at index ' + mid + '</b>.'), parts: [cd('int r = Collections.binarySearch(list, ' + key + ');'), arr(a, h2, p2, 'sorted list', [lo, hi]), { type: 'vars', vals: { lo: lo, hi: hi, mid: mid, 'list[mid]': mv }, hl: { mid: 'cur' } }] });
          if (cmp < 0) lo = mid + 1; else if (cmp > 0) hi = mid - 1; else { found = mid; break; }
        }
        if (found === null) frames.push({ narr: 'lo (' + lo + ') passed hi (' + hi + ') → not found. Java returns <b>-(insertionPoint) - 1 = ' + (-lo - 1) + '</b>, where insertionPoint = lo = ' + lo + ' is where ' + key + ' would go to keep the list sorted. Decode it with <code>-r - 1</code>. (The −1 makes "not found at index 0" negative instead of 0.)', parts: [cd('int r = Collections.binarySearch(list, ' + key + ');   // ' + (-lo - 1)), arr(a, one(Math.min(lo, a.length - 1), 'sel'), one(Math.min(lo, a.length - 1), lo >= a.length ? 'insert after' : 'insert here'), 'sorted list'), { type: 'vars', vals: { result: -lo - 1, insertionPoint: lo }, hl: { result: 'sel' } }] });
        a.reverse();
        frames.push({ narr: '<code>Collections.reverse(list)</code> swaps from both ends toward the middle: n/2 swaps, O(n).', parts: [cd('Collections.reverse(list);'), arr(a, {}, {}, 'after reverse')] });
        var n = a.length, t = a[0]; a[0] = a[n - 1]; a[n - 1] = t;
        var sw = {}; sw[0] = 'win'; sw[n - 1] = 'win';
        frames.push({ narr: '<code>Collections.swap(list, 0, ' + (n - 1) + ')</code> exchanges the first and last elements.', parts: [cd('Collections.swap(list, 0, list.size() - 1);'), arr(a, sw, {}, 'after swap')] });
        var d = 2 % n, rot = [];
        for (var i = 0; i < n; i++) rot[(i + d) % n] = a[i];
        var rh = {}; for (i = 0; i < d; i++) rh[i] = 'ok';
        frames.push({ narr: '<code>Collections.rotate(list, 2)</code>: the element at index i moves to (i + 2) mod ' + n + '. The last 2 elements wrap round to the front (green). A negative distance rotates left.', parts: [cd('Collections.rotate(list, 2);'), arr(a, {}, {}, 'before rotate'), arr(rot, rh, {}, 'after rotate')] });
        a = rot;
        var fq = 0, fh = {};
        a.forEach(function (x, j) { if (x === key) { fq++; fh[j] = 'sel'; } });
        var mx = Math.max.apply(null, a), mn = Math.min.apply(null, a);
        frames.push({ narr: '<code>frequency(list, ' + key + ')</code> = <b>' + fq + '</b>, <code>max</code> = <b>' + mx + '</b>, <code>min</code> = <b>' + mn + '</b>. Each is a single O(n) scan — fine once, but for many frequency questions build a <code>Map</code> of counts instead.', parts: [cd('Collections.frequency(list, ' + key + ');  Collections.max(list);  Collections.min(list);'), arr(a, fh, {}, 'list'), { type: 'vars', vals: { frequency: fq, max: mx, min: mn }, hl: { frequency: 'sel' } }, out('[' + a.join(', ') + ']\n' + fq + ' ' + mx + ' ' + mn)] });
        frames.push({ narr: 'Finally, hand the list to callers safely. <code>Collections.unmodifiableList(list)</code> is a read-only <b>window</b> (they cannot change it, but they will see your later changes); <code>List.copyOf(list)</code> is a frozen <b>snapshot</b>.', parts: [{ type: 'table', label: 'Read-only options', columns: ['Call', 'Copy?', 'Sees later changes?', 'nulls?'], rows: [['Collections.unmodifiableList(list)', 'no (view)', 'yes', 'allowed'], ['List.copyOf(list)', 'yes', 'no', 'NPE'], ['List.of(...)', 'yes', 'no', 'NPE']], hl: { 1: 'ok' } }, arr(orig, {}, {}, 'what you started with')] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Predict the output: decoding a negative binarySearch',
        html: `<p>In [10, 20, 30, 40] searching for 25 returns <b>-3</b>. Decode: insertion point = −(−3) − 1 = <b>2</b> → 25 belongs at index 2, between 20 and 30. Use it to insert while keeping the list sorted. Searching an <b>unsorted</b> list gives undefined (meaningless) answers — no exception.</p>
${H.arr([10, 20, 30, 40], { label: 'sorted', ptr: { 2: 'ip' } })}`,
        code: `List<Integer> sorted = new ArrayList<>(List.of(10, 20, 30, 40));
int r = Collections.binarySearch(sorted, 25);
System.out.println(r);                       // -3
int ip = r >= 0 ? r : -r - 1;
sorted.add(ip, 25);
System.out.println(sorted);                  // [10, 20, 25, 30, 40]`
      },
      {
        title: 'View vs copy: unmodifiableList keeps watching',
        html: `<p>An unmodifiable <b>view</b> is read-only for the holder of the view, but the owner can still change the underlying list, and the view shows it. <code>List.copyOf</code> takes a snapshot that never changes. Pick the copy when returning internal state from a class (defensive copying).</p>
${H.table(['After <code>base.add("c")</code>', 'Prints'], [['view', '[a, b, c]'], ['snapshot', '[a, b]']])}`,
        code: `List<String> base = new ArrayList<>(List.of("a", "b"));
List<String> view = Collections.unmodifiableList(base);
List<String> snapshot = List.copyOf(base);
base.add("c");
System.out.println(view + " " + snapshot);   // [a, b, c] [a, b]
try { view.add("x"); } catch (UnsupportedOperationException e) { System.out.println("view is read-only"); }`
      },
      {
        title: 'Multi-key sorting with Comparator helpers',
        html: `<p>Sort employees by department ascending, then salary <b>descending</b>, then name. Each <code>thenComparing</code> only breaks ties left by the previous key. <code>Comparator.comparing(Emp::salary).reversed()</code> inside thenComparing reverses only that key. Java's object sort is <b>stable</b>, so you could also sort by the least important key first and the most important last.</p>`,
        code: `record Emp(String name, String dept, int salary) {}
List<Emp> staff = new ArrayList<>(List.of(
        new Emp("Ria", "eng", 90), new Emp("Sam", "ops", 70),
        new Emp("Ann", "eng", 120), new Emp("Bo", "eng", 90)));
staff.sort(Comparator.comparing(Emp::dept)
        .thenComparing(Comparator.comparingInt(Emp::salary).reversed())
        .thenComparing(Emp::name));
staff.forEach(e -> System.out.print(e.name() + " "));   // Ann Bo Ria Sam`
      },
      {
        title: 'Seeded shuffle for repeatable tests',
        html: `<p><code>Collections.shuffle(list)</code> uses a fresh random source each run. In tests (or a replayable game), pass <code>new Random(seed)</code>: the same seed always gives the same order on the same JDK, so failures can be reproduced. The algorithm is Fisher–Yates: O(n), every permutation equally likely.</p>`,
        code: `List<Integer> a = new ArrayList<>(List.of(1, 2, 3, 4, 5));
List<Integer> b = new ArrayList<>(a);
Collections.shuffle(a, new Random(42));
Collections.shuffle(b, new Random(42));
System.out.println(a.equals(b));   // true — same seed, same order`
      }
    ],
    deepDive: `<p><b>Sorting internals.</b> <code>Collections.sort(list)</code> simply calls <code>list.sort(null)</code>; ArrayList sorts its backing array directly, other lists are copied to an array, sorted, and written back via a ListIterator. Object sorting uses <b>TimSort</b> — a stable merge-sort/insertion-sort hybrid that finds existing runs, so nearly-sorted input is close to O(n). Primitive arrays (<code>Arrays.sort(int[])</code>) use <b>dual-pivot quicksort</b>, which is not stable — stability is meaningless for primitives anyway. A comparator that violates its contract (e.g. not transitive) can make TimSort throw <code>IllegalArgumentException: Comparison method violates its general contract!</code>.</p>
<p><b>binarySearch</b> picks an index-based loop for <code>RandomAccess</code> lists (and small lists) and an iterator-based one otherwise; on a big LinkedList that degrades to O(n) node walks. With duplicates it returns <i>some</i> matching index, not necessarily the first — write your own lower-bound search (or use a <code>TreeMap</code>/<code>TreeSet</code>) when you need the first occurrence.</p>
<p><b>rotate</b> uses either a cycle-leader algorithm (for RandomAccess or small lists) or three reversals: reverse the whole list, then reverse the first d, then the rest — both O(n) time, O(1) space. <b>shuffle</b> is Fisher–Yates from the back; with <code>Random</code>'s 48-bit state not all permutations of very large lists are reachable — irrelevant for games, relevant for cryptography (use <code>SecureRandom</code>).</p>
<p><b>Wrapper families.</b> <code>unmodifiableX</code>, <code>synchronizedX</code>, <code>checkedX</code> (runtime type checks against heap pollution) are all <b>decorators</b> — thin views forwarding to the real collection. A synchronized wrapper locks every single call but compound actions (check-then-act, iteration) still need <code>synchronized (list) { … }</code>; modern code prefers <code>java.util.concurrent</code> classes. <code>emptyList()</code>/<code>singletonList()</code> return shared immutable instances — zero allocation for "nothing to return".</p>`,
    aiEra: `<p><b>What AI changes:</b> when you describe the intent ("move the last k items to the front", "sort by department then salary descending"), AI usually reaches straight for <code>Collections.rotate</code> or a comparator chain. That makes knowing the toolbox <i>names</i> less critical — but knowing the <b>contracts</b> matters more, because generated code often misses them: binarySearch on an unsorted list, ignoring the negative return value, <code>unmodifiableList</code> where a defensive copy was needed, or <code>.reversed()</code> applied to the whole chain instead of one key.</p>
<p><b>Use AI as a partner:</b> "<i>rewrite this 15-line loop with Collections/Comparator helpers</i>" and then ask "<i>is the new version stable, and what happens with nulls?</i>". Ask for property-based tests (sorted output is a permutation of input and is non-decreasing).</p>
<p><b>What you must still own:</b> the meaning of <code>-(ip) - 1</code>, stability, view-vs-copy semantics and the cost of each call (frequency/max/min are O(n) scans — calling them inside a loop is a hidden O(n²)).</p>`,
    problems: [{
      title: 'Rotate a List Right by k Steps',
      level: 'Easy', tags: ['Collections.rotate', 'reverse', 'in place'], companies: ['Microsoft', 'Amazon', 'Adobe'],
      statement: `<p>Rotate a <code>List&lt;Integer&gt;</code> to the right by <code>k</code> steps <b>in place</b>: the element at index i moves to index (i + k) mod n.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>5</sup>; 0 ≤ k ≤ 10<sup>9</sup> (k can be much larger than n); O(1) extra space preferred.`,
      example: `${H.arr([1, 2, 3, 4, 5, 6, 7], { label: 'k = 3', hl: { 4: 'g', 5: 'g', 6: 'g' } })} ${H.arr([5, 6, 7, 1, 2, 3, 4], { label: 'result', hl: { 0: 'g', 1: 'g', 2: 'g' } })}<p>The last 3 elements wrap round to the front.</p>`,
      brute: {
        why: `<p>Rotating one step at a time (remove the last, insert at the front) costs O(n) per step on an ArrayList, so O(n·k) total — with n = 10<sup>5</sup> and k up to 10<sup>9</sup> that never finishes. Even after reducing k mod n it is O(n²) in the worst case.</p>`,
        code: `class Solution {
    void rotate(List<Integer> list, int k) {
        int n = list.size();
        for (int step = 0; step < k % n; step++)
            list.add(0, list.remove(n - 1));   // O(n) shift every single step
    }
}`
      },
      mcq: { q: 'Using three reversals to rotate right by k (after k %= n), which order is correct?', options: ['Reverse all, then reverse the first k, then reverse the last n − k', 'Reverse the first k, then all', 'Reverse the last k only', 'Sort, then reverse'], answer: 0, explain: 'Reversing everything puts the last k elements first (but backwards); reversing each block fixes the inside order. [1..7], k=3 → [7,6,5,4,3,2,1] → [5,6,7,4,3,2,1] → [5,6,7,1,2,3,4].' },
      hints: [
        `<p>Hint 1: Rotating by n changes nothing, so first do <code>k %= n</code>. Now k &lt; n.</p>`,
        `<p>Hint 2: The JDK already has it: <code>Collections.rotate(list, k)</code>. To build it yourself in O(1) extra space, use reversals: <code>Collections.reverse</code> on <code>subList</code> views reverses a range in place.</p>`,
        `<p>Hint 3: Recipe: <code>k %= n; reverse(0..n); reverse(0..k); reverse(k..n)</code>. Edge cases: k == 0 or k multiple of n → unchanged; n == 1 → unchanged; negative k would mean rotate left (normalise with <code>((k % n) + n) % n</code>).</p>`
      ],
      tests: { sig: 'list<int> int -> void', fn: 'rotate', mutate: 0, cases: [
        [[[1,2,3,4,5,6,7],3],[5,6,7,1,2,3,4]],
        [[[1,2,3,4,5,6,7],0],[1,2,3,4,5,6,7]],
        [[[1,2,3,4,5,6,7],7],[1,2,3,4,5,6,7]],
        [[[1,2,3,4,5,6,7],10],[5,6,7,1,2,3,4]],
        [[[1],5],[1]],
        [[[1,2],1],[2,1]],
        [[[1,2],3],[2,1]],
        [[[1,2,3],1000000000],[3,1,2]],
        [[[-1,0,2147483647,-2147483648],1],[-2147483648,-1,0,2147483647]],
        [[[1,2,3,4],2],[3,4,1,2]],
        [[[1,1,2,2],1],[2,1,1,2]],
        [[[5,6,7],2],[6,7,5]],
        [[{"$range":[0,100000]},1000000007],{"$concat":[{"$range":[99993,100000]},{"$range":[0,99993]}]}],
        [[{"$range":[0,100000]},99999],{"$concat":[{"$range":[1,100000]},[0]]}],
        [[{"$range":[0,100000]},100000],{"$range":[0,100000]}],
        [[{"$rep":4,"n":100000},12345],{"$rep":4,"n":100000}],
        [[{"$concat":[{"$rep":0,"n":60000},{"$rep":1,"n":40000}]},40000],{"$concat":[{"$rep":1,"n":40000},{"$rep":0,"n":60000}]}]
      ] },
      solution: {
        approach: `<p>Reduce k modulo n, then apply the three-reversal trick on subList views (each reversal is in place). This is O(n) time and O(1) extra space — and it is exactly one of the two strategies <code>Collections.rotate</code> uses internally.</p>`,
        code: `class Solution {
    void rotate(List<Integer> list, int k) {
        int n = list.size();
        if (n == 0) return;
        k = ((k % n) + n) % n;                          // also handles negative k
        Collections.reverse(list);                      // [7,6,5,4,3,2,1]
        Collections.reverse(list.subList(0, k));        // [5,6,7,4,3,2,1]
        Collections.reverse(list.subList(k, n));        // [5,6,7,1,2,3,4]
    }

    public static void main(String[] args) {
        List<Integer> a = new ArrayList<>(List.of(1, 2, 3, 4, 5, 6, 7));
        new Solution().rotate(a, 3);
        System.out.println(a);                           // [5, 6, 7, 1, 2, 3, 4]
        List<Integer> b = new ArrayList<>(List.of(1, 2, 3, 4, 5, 6, 7));
        Collections.rotate(b, 3);                       // the one-liner
        System.out.println(a.equals(b));                // true
    }
}`,
        dry: { head: ['Step', 'Operation', 'List'], rows: [
          ['0', 'k = 3 % 7 = 3', '[1, 2, 3, 4, 5, 6, 7]'],
          ['1', 'reverse all', '[7, 6, 5, 4, 3, 2, 1]'],
          ['2', 'reverse subList(0, 3)', '[<span class="c-g">5, 6, 7</span>, 4, 3, 2, 1]'],
          ['3', 'reverse subList(3, 7)', '[5, 6, 7, <span class="c-g">1, 2, 3, 4</span>]']
        ] },
        complexity: `<p>Time O(n) (each element is swapped about twice), extra space O(1). The brute force is O(n·k).</p>`,
        followUps: ['Rotate an <code>int[]</code> the same way (write your own reverse(lo, hi)).', 'Rotate LEFT by k — which call changes?', 'Rotate a singly linked list by k (LeetCode 61).']
      }
    }]
  });

  /* ======================================================================
     TOPIC 8 — Choosing the right collection
     ====================================================================== */
  var DEC_NODES = [
    { id: 'Q1', label: 'key → value?', x: 50, y: 6 }, { id: 'Q2', label: 'sorted keys?', x: 17, y: 24 }, { id: 'Q4', label: 'unique only?', x: 62, y: 24 },
    { id: 'TreeMap', label: 'TreeMap', x: 6, y: 42 }, { id: 'Q3', label: 'keep order?', x: 24, y: 42 }, { id: 'Q5', label: 'sorted?', x: 46, y: 42 }, { id: 'Q7', label: 'by priority?', x: 82, y: 42 },
    { id: 'LinkedHashMap', label: 'LinkedHashMap', x: 11, y: 60 }, { id: 'HashMap', label: 'HashMap', x: 28, y: 60 }, { id: 'TreeSet', label: 'TreeSet', x: 41, y: 60 }, { id: 'Q6', label: 'keep order?', x: 58, y: 60 }, { id: 'PriorityQueue', label: 'PriorityQueue', x: 88, y: 60 },
    { id: 'LinkedHashSet', label: 'LinkedHashSet', x: 50, y: 78 }, { id: 'HashSet', label: 'HashSet', x: 67, y: 78 }, { id: 'Q8', label: 'ends only?', x: 84, y: 78 },
    { id: 'ArrayDeque', label: 'ArrayDeque', x: 75, y: 96 }, { id: 'ArrayList', label: 'ArrayList', x: 92, y: 96 }
  ];
  var DEC_EDGES = [['Q1', 'Q2', 'yes'], ['Q1', 'Q4', 'no'], ['Q2', 'TreeMap', 'yes'], ['Q2', 'Q3', 'no'], ['Q3', 'LinkedHashMap', 'yes'], ['Q3', 'HashMap', 'no'],
    ['Q4', 'Q5', 'yes'], ['Q4', 'Q7', 'no'], ['Q5', 'TreeSet', 'yes'], ['Q5', 'Q6', 'no'], ['Q6', 'LinkedHashSet', 'yes'], ['Q6', 'HashSet', 'no'],
    ['Q7', 'PriorityQueue', 'yes'], ['Q7', 'Q8', 'no'], ['Q8', 'ArrayDeque', 'yes'], ['Q8', 'ArrayList', 'no']];
  var DEC_INFO = {
    TreeMap: ['sorted keys, floor/ceiling/range queries', 'O(log n) get/put', 'ConcurrentSkipListMap', 'NavigableMap<K, V> m = new TreeMap<>();'],
    LinkedHashMap: ['predictable insertion order (or access order → LRU)', 'O(1) avg get/put', 'Collections.synchronizedMap(new LinkedHashMap<>()) or a lock', 'Map<K, V> m = new LinkedHashMap<>();'],
    HashMap: ['the default map: fastest lookups', 'O(1) avg get/put', 'ConcurrentHashMap', 'Map<K, V> m = new HashMap<>();'],
    TreeSet: ['sorted unique elements, nearest-value queries', 'O(log n) add/contains', 'ConcurrentSkipListSet', 'NavigableSet<E> s = new TreeSet<>();'],
    LinkedHashSet: ['dedupe while keeping arrival order', 'O(1) avg add/contains', 'Collections.synchronizedSet(new LinkedHashSet<>())', 'Set<E> s = new LinkedHashSet<>();'],
    HashSet: ['the default set: fastest membership tests', 'O(1) avg add/contains', 'ConcurrentHashMap.newKeySet()', 'Set<E> s = new HashSet<>();'],
    PriorityQueue: ['always take the smallest/largest/most urgent next', 'O(log n) offer/poll, O(1) peek', 'PriorityBlockingQueue', 'Queue<E> q = new PriorityQueue<>(comparator);'],
    ArrayDeque: ['stack (LIFO), queue (FIFO) or both ends', 'O(1) at both ends', 'ConcurrentLinkedDeque / LinkedBlockingDeque', 'Deque<E> d = new ArrayDeque<>();'],
    ArrayList: ['the default list: index access, append, iterate', 'O(1) get(i), amortised O(1) add', 'CopyOnWriteArrayList (read-mostly)', 'List<E> l = new ArrayList<>();']
  };
  function decGraph(hl, ehl, tags) {
    return { type: 'graph', label: 'Decision tree (edges labelled yes / no)', directed: true, height: 104,
      nodes: DEC_NODES.map(function (n) { return { id: n.id, label: n.label, x: n.x, y: n.y, shape: 'box' }; }), edges: DEC_EDGES, hl: hl, ehl: ehl, tags: tags || {} };
  }

  topics.push({
    title: 'Choosing the Right Collection (Big-O Cheat Sheet, Decision Tree & LRU Cache)',
    analogy: `<p>Picking a collection is like picking a <b>vehicle</b>. A bicycle (ArrayList) is the right answer for most short trips. You hire a truck with numbered pallets (TreeMap) only when you need things in order, a taxi rank (ArrayDeque) when people leave in the order they came, and an ambulance queue (PriorityQueue) when urgency decides. Turning up to a job interview in the wrong vehicle does not stop you arriving — it just makes everything slower and more awkward.</p>`,
    explain: `<p>Ask four questions, in this order, about the <b>wording of the problem</b>:</p>
<ol><li><b>Do I look things up by a key?</b> → Map. Then: need sorted keys or nearest-key queries → <code>TreeMap</code>; need insertion order → <code>LinkedHashMap</code>; otherwise → <code>HashMap</code>.</li>
<li><b>Do I only care about membership / uniqueness?</b> → Set. Sorted → <code>TreeSet</code>; arrival order → <code>LinkedHashSet</code>; otherwise → <code>HashSet</code>.</li>
<li><b>Do I always want the "best" next element?</b> → <code>PriorityQueue</code>.</li>
<li><b>Do I add/remove only at the ends?</b> → <code>ArrayDeque</code> (stack or queue). Otherwise → <code>ArrayList</code>.</li></ol>
${H.table(['Class', 'get / contains', 'add', 'remove', 'Order', 'Memory'], [
      ['ArrayList', 'get(i) O(1), contains O(n)', 'O(1)* end, O(n) middle', 'O(n)', 'insertion/index', 'lowest'],
      ['LinkedList', 'O(n)', 'O(1) ends', 'O(1) ends, O(n) by index', 'insertion', 'high'],
      ['ArrayDeque', 'peek O(1), contains O(n)', 'O(1)* ends', 'O(1) ends', 'insertion', 'low'],
      ['HashSet / HashMap', 'O(1) avg', 'O(1) avg', 'O(1) avg', 'none', 'medium'],
      ['LinkedHashSet / LinkedHashMap', 'O(1) avg', 'O(1) avg', 'O(1) avg', 'insertion / access', 'medium+'],
      ['TreeSet / TreeMap', 'O(log n)', 'O(log n)', 'O(log n)', 'sorted', 'medium+'],
      ['PriorityQueue', 'peek O(1), contains O(n)', 'O(log n)', 'poll O(log n), remove(x) O(n)', 'head only', 'low']
    ])}
<p><small>* amortised — occasionally a resize copies everything, but averaged over many adds each is O(1).</small></p>
<p><b>Specialists worth naming:</b> <code>EnumMap</code>/<code>EnumSet</code> for enum keys (array/bit-vector fast), <code>IdentityHashMap</code> (== instead of equals), <code>WeakHashMap</code> (caches keyed by objects that may die), <code>BitSet</code> (millions of booleans), primitive arrays (<code>int[]</code>) when boxing would hurt. <b>Multi-threaded?</b> Switch to the <code>java.util.concurrent</code> sibling: <code>ConcurrentHashMap</code>, <code>ConcurrentSkipListMap/Set</code>, <code>CopyOnWriteArrayList</code>, <code>ConcurrentLinkedQueue</code>, <code>BlockingQueue</code>s.</p>`,
    clues: [
      '"O(1) get and put" + "evict the least recently used" → <b>LinkedHashMap(accessOrder = true)</b> or HashMap + doubly linked list',
      '"N ≤ 10<sup>5</sup>, many lookups" → hash-based O(1) (HashMap/HashSet); "need sorted output too" → Tree* at O(log n) or sort once at the end',
      '"range query / floor / ceiling / closest timestamp" → <b>TreeMap/TreeSet</b> — the hash classes cannot do this',
      '"schedule by earliest deadline / cheapest cost" → <b>PriorityQueue</b>; "process in arrival order" → <b>ArrayDeque</b>',
      '"thread-safe map with high read/write concurrency" → <b>ConcurrentHashMap</b> (not Hashtable, not synchronizedMap)',
      '"keys are enum constants" → <b>EnumMap/EnumSet</b>; "millions of ints" → <code>int[]</code> or BitSet'
    ],
    code: [`// Same requirement — "count visits per page, print pages alphabetically" — three choices
Map<String, Integer> fast = new HashMap<>();           // O(1) updates, sort only when printing
Map<String, Integer> sorted = new TreeMap<>();         // O(log n) updates, always sorted
for (String p : List.of("home", "cart", "home", "about")) {
    fast.merge(p, 1, Integer::sum);
    sorted.merge(p, 1, Integer::sum);
}
List<String> keys = new ArrayList<>(fast.keySet());
Collections.sort(keys);                                // pay O(k log k) once
System.out.println(keys + " " + sorted);               // [about, cart, home] {about=1, cart=1, home=2}

// Enum keys: EnumMap is an array under the hood
enum Day { MON, TUE, WED }
Map<Day, Integer> shifts = new EnumMap<>(Day.class);
shifts.put(Day.WED, 3); shifts.put(Day.MON, 1);
System.out.println(shifts);                            // {MON=1, WED=3}  (declaration order)

// Multi-threaded counters: ConcurrentHashMap + merge is atomic per key
Map<String, Integer> hits = new ConcurrentHashMap<>();
hits.merge("home", 1, Integer::sum);
System.out.println(hits);                              // {home=1}`],
    codeTitle: ['Same job, different collections'],
    viz: {
      title: 'Walk the decision tree for your requirement',
      input: 'kv order',
      inputLabel: 'Requirement keywords: kv (key→value), unique, sorted, order (keep insertion order), priority, ends (stack/queue), concurrent',
      gen: function (input) {
        var s = clean(input).toLowerCase();
        if (!s) throw new Error('Type keywords like: kv sorted   |   unique order   |   priority   |   ends   |   (empty-ish) index');
        var tok = s.split(/[\s,]+/), known = ['kv', 'map', 'unique', 'set', 'sorted', 'order', 'insertion', 'priority', 'ends', 'stack', 'queue', 'fifo', 'lifo', 'concurrent', 'threadsafe', 'index', 'list'];
        if (tok.some(function (t) { return known.indexOf(t) < 0; })) throw new Error('Unknown keyword. Use: kv, unique, sorted, order, priority, ends, concurrent, index');
        function has() { for (var i = 0; i < arguments.length; i++) if (tok.indexOf(arguments[i]) >= 0) return true; return false; }
        var ans = { Q1: has('kv', 'map'), Q2: has('sorted'), Q3: has('order', 'insertion'), Q4: has('unique', 'set'), Q5: has('sorted'), Q6: has('order', 'insertion'), Q7: has('priority'), Q8: has('ends', 'stack', 'queue', 'fifo', 'lifo') };
        var why = {
          Q1: ['you mentioned key → value lookups', 'no key → value lookups mentioned'], Q2: ['you need keys in sorted order / range queries', 'sorted keys not required'], Q3: ['output must follow insertion order', 'no ordering requirement'],
          Q4: ['you need uniqueness / membership tests', 'duplicates are fine'], Q5: ['you need sorted elements', 'sorted order not required'], Q6: ['you want arrival order kept', 'no ordering requirement'],
          Q7: ['the "best" element must come out first', 'no priority rule'], Q8: ['you only add/remove at the ends (stack or queue)', 'you need positions / indexes / general list use']
        };
        var frames = [], hl = {}, ehl = {}, node = 'Q1', path = [];
        frames.push({ narr: 'The whole decision tree. Your keywords: <b>' + esc(tok.join(', ')) + '</b>. We start at the top question and follow yes/no edges until we reach a class (the bottom boxes).', parts: [decGraph(one('Q1', 'cur'), {}, {}), { type: 'set', label: 'Your requirement keywords', items: tok }] });
        while (/^Q/.test(node)) {
          var yes = ans[node], next = null;
          DEC_EDGES.forEach(function (e) { if (e[0] === node && e[2] === (yes ? 'yes' : 'no')) next = e[1]; });
          var lbl = DEC_NODES.filter(function (n) { return n.id === node; })[0].label;
          hl[node] = 'done'; ehl[node + '-' + next] = 'ok';
          var h2 = JSON.parse(JSON.stringify(hl)); h2[node] = 'cur'; h2[next] = /^Q/.test(next) ? 'win' : 'sel';
          path.push([lbl, yes ? 'yes' : 'no', why[node][yes ? 0 : 1]]);
          frames.push({ narr: '<b>' + esc(lbl) + '</b> → <b>' + (yes ? 'yes' : 'no') + '</b>, because ' + why[node][yes ? 0 : 1] + '. Follow the "' + (yes ? 'yes' : 'no') + '" edge to <b>' + esc(DEC_NODES.filter(function (n) { return n.id === next; })[0].label) + '</b>.', parts: [decGraph(h2, JSON.parse(JSON.stringify(ehl)), one(node, yes ? 'yes' : 'no')), { type: 'table', label: 'Decisions so far', columns: ['Question', 'Answer', 'Reason'], rows: path.map(function (p) { return p.slice(); }), hl: one(path.length - 1, 'ok') }] });
          node = next;
        }
        var info = DEC_INFO[node], conc = has('concurrent', 'threadsafe');
        hl[node] = 'sel';
        frames.push({ narr: 'Answer: <b>' + node + '</b> — ' + info[0] + '. ' + (conc ? 'Because you need thread safety, use <b>' + esc(info[2]) + '</b> instead.' : 'Declare the variable with the interface type so you can swap engines later.'), parts: [decGraph(hl, ehl, one(node, 'pick')), { type: 'table', label: node + ' summary', columns: ['Property', 'Value'], rows: [['Best for', info[0]], ['Cost', info[1]], ['Thread-safe sibling', info[2]]], hl: conc ? { 2: 'sel' } : { 0: 'sel' } }, { type: 'code', label: 'Declaration', lang: 'java', code: conc ? '// shared between threads:\n// ' + info[2] + '\n' + info[3] : info[3], hl: { 1: 'ok' } }] });
        frames.push({ narr: 'Sanity-check the choice against the <b>operations you will call most</b>. If the hot operation is O(n) in your pick (e.g. <code>contains</code> on a list, <code>remove(x)</code> on a PriorityQueue), reconsider or combine two structures (e.g. HashMap + PriorityQueue, HashMap + linked list for LRU).', parts: [{ type: 'table', label: 'Hot-path check', columns: ['If you mostly…', 'Avoid', 'Prefer'], rows: [['ask "is x present?"', 'List.contains O(n)', 'HashSet O(1)'], ['take the minimum repeatedly', 'sorting each time', 'PriorityQueue'], ['need floor/ceiling', 'HashMap (cannot)', 'TreeMap'], ['push/pop at the front', 'ArrayList.add(0, x)', 'ArrayDeque']], hl: {} }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Scenario round: name the collection',
        html: `${H.table(['Requirement (as an interviewer says it)', 'Pick', 'Why'], [
          ['"Unique visitor ids for today"', 'HashSet&lt;Long&gt;', 'uniqueness, O(1) add/contains'],
          ['"Leaderboard, show top 10 and rank of any player"', 'TreeMap / TreeSet (or a PriorityQueue for top-k only)', 'sorted + navigation'],
          ['"Browser back button"', 'ArrayDeque (stack)', 'LIFO at one end'],
          ['"Print the menu in the order items were added, look up price by name"', 'LinkedHashMap', 'keyed + insertion order'],
          ['"Job scheduler: run the earliest deadline first"', 'PriorityQueue&lt;Job&gt;', 'min by deadline'],
          ['"Latest stock price at or before time t"', 'TreeMap&lt;Long, Price&gt;.floorEntry(t)', 'nearest key ≤ t'],
          ['"Settings per day of week"', 'EnumMap&lt;DayOfWeek, Settings&gt;', 'enum keys']
        ])}`
      },
      {
        title: 'Two structures together: HashMap + PriorityQueue for "top k frequent"',
        html: `<p>No single collection answers "count words AND give me the k most frequent". Combine them: a HashMap for O(1) counting, then a min-heap of size k ordered by count (ties by word) to keep only the best k. Total O(n + m log k) for n words and m distinct.</p>`,
        code: `String[] words = "a b a c b a d".split(" ");
Map<String, Integer> freq = new HashMap<>();
for (String w : words) freq.merge(w, 1, Integer::sum);
int k = 2;
PriorityQueue<Map.Entry<String, Integer>> heap = new PriorityQueue<>(
        Map.Entry.<String, Integer>comparingByValue().thenComparing(Map.Entry.comparingByKey(Comparator.reverseOrder())));
for (Map.Entry<String, Integer> e : freq.entrySet()) {
    heap.offer(e);
    if (heap.size() > k) heap.poll();          // drop the weakest
}
List<String> top = new ArrayList<>();
while (!heap.isEmpty()) top.add(heap.poll().getKey());
Collections.reverse(top);
System.out.println(top);                        // [a, b]`
      },
      {
        title: 'Pre-size when you know the size',
        html: `<p>Collections grow by copying. If you know you will insert n items, say so: <code>new ArrayList&lt;&gt;(n)</code> avoids every regrowth; for hash maps, <code>HashMap.newHashMap(n)</code> (Java 19+) computes the right capacity for n entries without resizing (the old manual formula was <code>(int) (n / 0.75f) + 1</code>).</p>
${H.table(['Call', 'Resizes while adding 1 000 000'], [['new ArrayList&lt;&gt;()', '≈ 30 (10 → 15 → 22 → …)'], ['new ArrayList&lt;&gt;(1_000_000)', H.c('g', '0')], ['new HashMap&lt;&gt;()', '17 (16 → … → 2²¹)'], ['HashMap.newHashMap(1_000_000)', H.c('g', '0')]])}`,
        code: `int n = 1_000_000;
List<Integer> list = new ArrayList<>(n);
Map<Integer, Integer> map = HashMap.newHashMap(n);   // Java 19+
for (int i = 0; i < n; i++) { list.add(i); map.put(i, i); }
System.out.println(list.size() + " " + map.size());  // 1000000 1000000`
      },
      {
        title: 'Predict the output: TreeMap vs HashMap with a null key',
        html: `<p>HashMap allows one <code>null</code> key (stored in bucket 0). TreeMap with natural ordering must call <code>compareTo</code> on the key, so <code>put(null, …)</code> throws NPE. If your keys may be null, either avoid TreeMap or give it <code>Comparator.nullsFirst(Comparator.naturalOrder())</code>.</p>`,
        code: `Map<String, Integer> h = new HashMap<>();
h.put(null, 1);
System.out.println(h.get(null));                 // 1
Map<String, Integer> t = new TreeMap<>();
try { t.put(null, 1); } catch (NullPointerException e) { System.out.println("TreeMap: NPE"); }
Map<String, Integer> t2 = new TreeMap<>(Comparator.nullsFirst(Comparator.naturalOrder()));
t2.put(null, 1); t2.put("a", 2);
System.out.println(t2);                          // {null=1, a=2}`
      }
    ],
    deepDive: `<p><b>Big-O is not the whole story.</b> Constant factors matter at interview-scale inputs (10<sup>5</sup>–10<sup>6</sup>): a hash lookup costs a hashCode call, a modulo/bit-mask, an equals call and often a cache miss; a TreeMap lookup costs ~20 compareTo calls and ~20 pointer hops for a million keys. For tiny collections (≤ 10 elements) a linear scan of an ArrayList can beat both. Boxing is often the hidden cost: <code>Map&lt;Integer, Integer&gt;</code> allocates Integer objects outside −128..127 and an entry object per mapping (~48+ bytes per entry). When profiling says collections dominate, look at primitive arrays, <code>BitSet</code>, or primitive-collection libraries (fastutil, Eclipse Collections, HPPC).</p>
<p><b>Combining structures</b> is the expert move. LRU cache = hash map + doubly linked list (what LinkedHashMap is). LFU = map + map of frequency → LinkedHashSet. Dijkstra = PriorityQueue + distance array with lazy deletion. Sliding-window max = ArrayDeque of indices. Order book = TreeMap of price → ArrayDeque of orders. Each pairing gives one structure the lookup and the other the ordering.</p>
<p><b>Immutability as a choice.</b> Returning <code>List.copyOf</code>/<code>Map.copyOf</code> or records holding immutable collections makes code thread-safe for readers and easier to reason about; the cost is a copy on construction. Java's immutable <code>List.of</code>/<code>Map.of</code> are also more compact than ArrayList/HashMap (no spare capacity, field-based small variants).</p>
<p><b>Concurrency mapping:</b> HashMap → <code>ConcurrentHashMap</code> (lock striping / CAS per bin; <code>merge</code>/<code>compute</code> atomic per key); TreeMap → <code>ConcurrentSkipListMap</code>; ArrayList → <code>CopyOnWriteArrayList</code> (read-mostly) or a lock; queue → <code>ConcurrentLinkedQueue</code> or a <code>BlockingQueue</code> for producer–consumer. <code>Collections.synchronizedMap</code> serialises every call through one lock and still needs manual locking for iteration — it is the "works but slow" option.</p>
<p><b>Java 21 sequenced types</b> also inform API design: a method that needs "first and last" can now accept <code>SequencedCollection&lt;E&gt;</code> and work with lists, deques and LinkedHashSets alike.</p>`,
    aiEra: `<p><b>What AI changes:</b> describe your requirement in plain words and an assistant will name a collection — usually a reasonable one. Where it struggles is <b>reading the hidden requirements</b>: "show results in the order users submitted them" (needs LinkedHashMap, not HashMap), "accessed from request threads" (needs ConcurrentHashMap), "100 million ids" (needs primitives or a BitSet). Spell those constraints out in your prompt, and verify the answer against the decision tree above.</p>
<p><b>Use AI as a partner:</b> "<i>Here is my data access pattern: … Which Java collection(s) minimise the hot-path cost? Give Big-O per operation.</i>" Then ask it to produce a JMH benchmark if the choice is close. For LRU/LFU-style designs, ask it to list invariants and write tests for eviction order — eviction bugs are subtle.</p>
<p><b>What you must still own:</b> extracting requirements from an interviewer's wording (the clues), justifying the trade-off out loud, and knowing when to combine two structures. In interviews you cannot paste into a chatbot — the decision tree must live in your head.</p>`,
    problems: [{
      title: 'LRU Cache with O(1) get and put',
      level: 'Medium', tags: ['LinkedHashMap', 'design', 'HashMap + linked list'], companies: ['Amazon', 'Google', 'Microsoft', 'Swiggy'],
      statement: `<p>Design <code>LRUCache(int capacity)</code> with <code>int get(int key)</code> (value or −1) and <code>void put(int key, int value)</code>. When the cache is full, <code>put</code> of a new key evicts the <b>least recently used</b> key first. Both operations must run in O(1) average time. A <code>get</code> or <code>put</code> counts as a "use".</p>`,
      constraints: `1 ≤ capacity ≤ 3000; up to 2·10<sup>5</sup> calls; keys and values 0..10<sup>4</sup>.`,
      example: `<p>capacity 2: put(1,1), put(2,2), get(1) → ${H.c('g', '1')} (1 is now most recent), put(3,3) evicts ${H.c('r', 'key 2')}, get(2) → ${H.c('r', '-1')}, put(4,4) evicts ${H.c('r', 'key 1')}, get(1) → -1, get(3) → 3, get(4) → 4.</p>`,
      brute: {
        why: `<p>A HashMap for values plus an ArrayList recording use order: every get/put must find the key in the list (<code>indexOf</code>, O(n)), remove it (O(n) shift) and append it. With capacity 3000 and 2·10<sup>5</sup> calls that is ~10<sup>9</sup> operations — too slow, and it violates the O(1) requirement.</p>`,
        code: `class LRUCache {
    private final int cap;
    private final Map<Integer, Integer> vals = new HashMap<>();
    private final List<Integer> order = new ArrayList<>();   // least recent at index 0

    LRUCache(int capacity) { cap = capacity; }

    int get(int key) {
        if (!vals.containsKey(key)) return -1;
        order.remove(Integer.valueOf(key));   // O(n) search + shift
        order.add(key);
        return vals.get(key);
    }

    void put(int key, int value) {
        if (vals.containsKey(key)) order.remove(Integer.valueOf(key));
        else if (vals.size() == cap) vals.remove(order.remove(0));   // evict LRU, O(n) shift
        vals.put(key, value);
        order.add(key);
    }
}`
      },
      mcq: { q: 'Which LinkedHashMap constructor argument turns it into a recency-ordered (LRU) map?', options: ['<code>new LinkedHashMap&lt;&gt;(16, 0.75f, true)</code> — accessOrder = true', '<code>new LinkedHashMap&lt;&gt;(capacity)</code>', '<code>new LinkedHashMap&lt;&gt;(map)</code>', 'There is none; you must use TreeMap'], answer: 0, explain: 'The third parameter accessOrder = true makes every get/put move the entry to the end of the linked list; the head is then the least recently used. Override removeEldestEntry to evict it automatically.' },
      hints: [
        `<p>Hint 1: You need two things in O(1): find a key (hash map) and move/evict entries by recency (a doubly linked list, where unlinking a known node is O(1)).</p>`,
        `<p>Hint 2: <code>LinkedHashMap</code> <i>is</i> a HashMap plus a doubly linked list. With <code>accessOrder = true</code> each access moves the entry to the tail, so the head is the LRU entry.</p>`,
        `<p>Hint 3: Subclass it and override <code>protected boolean removeEldestEntry(Map.Entry&lt;K,V&gt; eldest)</code> to return <code>size() &gt; capacity</code>; it is called after every put. Use <code>getOrDefault(key, -1)</code> for get (it also counts as an access). Edge: put on an existing key updates the value AND refreshes recency, without eviction.</p>`
      ],
      tests: { sig: 'int int[] int[] int[] -> string', fn: 'lruCheck',
        harness: { java: `class Check { static String lruCheck(int cap, int[] ops, int[] keys, int[] vals) { LRUCache c = new LRUCache(cap); List<Integer> out = new ArrayList<>(); long sum = 0; for (int i = 0; i < ops.length; i++) { if (ops[i] == 0) c.put(keys[i], vals[i]); else { int v = c.get(keys[i]); out.add(v); sum += v; } } if (out.size() <= 30) { StringBuilder sb = new StringBuilder(); for (int i = 0; i < out.size(); i++) sb.append(i > 0 ? "," : "").append(out.get(i)); return sb.toString(); } return "n=" + out.size() + " sum=" + sum; } }` }, cases: [
        [[2,[0,0,1,0,1,0,1,1,1],[1,2,1,3,2,4,1,3,4],[1,2,0,3,0,4,0,0,0]],"1,-1,-1,3,4"],
        [[1,[0,1,0,1,1],[5,5,6,5,6],[50,0,60,0,0]],"50,-1,60"],
        [[1,[1],[9],[0]],"-1"],
        [[2,[0,0,0,1,1,1],[1,2,3,1,2,3],[10,20,30,0,0,0]],"-1,20,30"],
        [[2,[0,0,0,1,1],[1,2,1,1,2],[10,20,99,0,0]],"99,20"],
        [[2,[0,0,1,0,1,1],[1,2,1,3,2,3],[1,2,0,3,0,0]],"1,-1,3"],
        [[3,[0,0,0,1,0,1,1,1,1],[1,2,3,1,4,2,1,3,4],[1,2,3,0,4,0,0,0,0]],"1,-1,1,3,4"],
        [[2,[0,0,0,1,1],[1,1,1,1,2],[1,2,3,0,0]],"3,-1"],
        [[2,[0,1,0,1],[0,0,10000,10000],[0,0,10000,0]],"0,10000"],
        [[3,[0,0,0,0,1,1,1,1],[1,2,3,4,1,2,3,4],[1,2,3,4,0,0,0,0]],"-1,2,3,4"],
        [[3000,{"$concat":[{"$rep":0,"n":100000},{"$rep":1,"n":100000}]},{"$concat":[{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]}]},{"$concat":[{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]},{"$range":[0,10000]}]}],"n=100000 sum=254915000"],
        [[1,{"$concat":[{"$rep":0,"n":100000},{"$rep":1,"n":100000}]},{"$concat":[{"$range":[0,100000]},{"$range":[99999,-1,-1]}]},{"$concat":[{"$range":[0,100000]},{"$range":[0,100000]}]}],"n=100000 sum=0"],
        [[3000,{"$concat":[{"$rep":0,"n":3000},{"$rep":1,"n":3000},{"$rep":0,"n":3000},{"$rep":1,"n":3000}]},{"$concat":[{"$range":[0,3000]},{"$range":[0,3000]},{"$range":[3000,6000]},{"$range":[0,3000]}]},{"$concat":[{"$range":[0,3000]},{"$range":[0,3000]},{"$range":[3000,6000]},{"$range":[0,3000]}]}],"n=6000 sum=4495500"]
      ] },
      solution: {
        approach: `<p>Extend <code>LinkedHashMap</code> in access-order mode. Its internal linked list keeps entries from least to most recently used; <code>removeEldestEntry</code> lets us drop the head as soon as the size exceeds capacity. Every operation is a hash lookup plus O(1) pointer relinking. In interviews you may be asked to build the HashMap + doubly linked list by hand — the alternative below shows that version.</p>`,
        code: `class LRUCache extends LinkedHashMap<Integer, Integer> {
    private final int capacity;

    LRUCache(int capacity) {
        super(16, 0.75f, true);              // accessOrder = true: iteration = least → most recent
        this.capacity = capacity;
    }

    int get(int key) { return getOrDefault(key, -1); }   // counts as an access

    void put(int key, int value) { super.put(key, value); }  // insert/update + refresh recency

    @Override
    protected boolean removeEldestEntry(Map.Entry<Integer, Integer> eldest) {
        return size() > capacity;            // called after each put: evict the head (LRU)
    }

    public static void main(String[] args) {
        LRUCache c = new LRUCache(2);
        c.put(1, 1); c.put(2, 2);
        System.out.print(c.get(1) + " ");    // 1
        c.put(3, 3);                         // evicts 2
        System.out.print(c.get(2) + " ");    // -1
        c.put(4, 4);                         // evicts 1
        System.out.println(c.get(1) + " " + c.get(3) + " " + c.get(4));   // -1 3 4
    }
}`,
        alt: [{ lang: 'java', title: 'Hand-built: HashMap + doubly linked list', code: `class LRUCacheManual {
    private static final class Node {
        int key, val; Node prev, next;
        Node(int k, int v) { key = k; val = v; }
    }
    private final int cap;
    private final Map<Integer, Node> map = new HashMap<>();
    private final Node head = new Node(0, 0), tail = new Node(0, 0);   // sentinels: head.next = LRU

    LRUCacheManual(int capacity) { cap = capacity; head.next = tail; tail.prev = head; }

    private void unlink(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }
    private void addLast(Node n) { n.prev = tail.prev; n.next = tail; tail.prev.next = n; tail.prev = n; }

    int get(int key) {
        Node n = map.get(key);
        if (n == null) return -1;
        unlink(n); addLast(n);                 // mark as most recent
        return n.val;
    }

    void put(int key, int value) {
        Node n = map.get(key);
        if (n != null) { n.val = value; unlink(n); addLast(n); return; }
        if (map.size() == cap) { Node lru = head.next; unlink(lru); map.remove(lru.key); }
        n = new Node(key, value);
        map.put(key, n); addLast(n);
    }
}` }],
        dry: { head: ['call', 'result', 'recency order (LRU → MRU)', 'note'], rows: [
          ['put(1,1)', '', '[1]', ''],
          ['put(2,2)', '', '[1, 2]', ''],
          ['get(1)', '1', '[2, 1]', '1 moved to MRU'],
          ['put(3,3)', '', '[1, 3]', '<span class="c-r">size 3 &gt; 2 → evict 2</span>'],
          ['get(2)', '-1', '[1, 3]', 'miss'],
          ['put(4,4)', '', '[3, 4]', '<span class="c-r">evict 1</span>'],
          ['get(1), get(3), get(4)', '-1, 3, 4', '[3, 4] → [4, 3] → [3, 4]', 'final']
        ] },
        complexity: `<p>O(1) average for both get and put (hash lookup + constant pointer updates); O(capacity) memory. The brute force is O(capacity) per call.</p>`,
        followUps: ['Make it thread-safe. (Synchronise the methods, or use a concurrent cache library such as Caffeine — LinkedHashMap is not concurrent.)', 'Add time-to-live expiry per entry.', 'Design an LFU cache (evict least <b>frequently</b> used, ties by recency).']
      }
    }]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Predict & Fix: Remove a Value from a List<Integer>',
    level: 'Easy', tags: ['List', 'overloading', 'autoboxing', 'predict the output'], companies: ['TCS', 'Cognizant', 'Amazon'],
    statement: `<p>First, predict what this prints:</p>
<pre>List&lt;Integer&gt; a = new ArrayList&lt;&gt;(List.of(5, 200, 7, 200));
a.remove(1);
System.out.println(a);</pre>
<p>Then write <code>boolean removeValue(List&lt;Integer&gt; list, int v)</code> that removes the <b>first occurrence of the value</b> <code>v</code> (not index v) and returns whether anything was removed.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>; values may be any int (including values outside −128..127).`,
    example: `<p>The snippet prints ${H.c('r', '[5, 7, 200]')} — <code>remove(1)</code> picks the <code>remove(int index)</code> overload and deletes index 1 (the first 200).<br><code>removeValue([5, 200, 7, 200], 200)</code> → list becomes ${H.c('g', '[5, 7, 200]')}, returns true. <code>removeValue([5, 7], 1)</code> → unchanged, returns false.</p>`,
    brute: {
      why: `<p>A hand-written scan that compares with <code>list.get(i) == v</code> where <code>v</code> is an <code>Integer</code> compares <b>references</b>. It works for −128..127 (the Integer cache returns shared objects) and silently fails for 200. It also re-implements what <code>List.remove(Object)</code> already does.</p>`,
      code: `class Solution {
    boolean removeValue(List<Integer> list, Integer v) {
        for (int i = 0; i < list.size(); i++) {
            if (list.get(i) == v) {          // BUG: reference comparison of two Integers
                list.remove(i);
                return true;
            }
        }
        return false;
    }
}`
    },
    mcq: { q: 'On a <code>List&lt;Integer&gt;</code>, which call removes the VALUE 7?', options: ['<code>list.remove(Integer.valueOf(7))</code>', '<code>list.remove(7)</code>', '<code>list.remove((int) 7)</code>', '<code>list.removeAll(7)</code>'], answer: 0, explain: 'Passing an Integer object selects remove(Object). A plain int literal selects remove(int index). removeAll needs a Collection.' },
    hints: [
      `<p>Hint 1: Overload resolution prefers an exact primitive match (phase 1, no boxing) over boxing. That is why <code>remove(1)</code> is the index version.</p>`,
      `<p>Hint 2: Force the Object overload by passing an <code>Integer</code>: <code>list.remove(Integer.valueOf(v))</code> or <code>list.remove((Integer) v)</code>. It uses <code>equals</code>, so 200 matches 200.</p>`,
      `<p>Hint 3: <code>remove(Object)</code> already returns a boolean "was something removed?" and removes only the first occurrence. To remove all occurrences use <code>list.removeIf(x -&gt; x == v)</code> (here x unboxes to int, so == is numeric).</p>`
    ],
    tests: { sig: 'list<int> int -> bool', fn: 'removeValue', both: 0,
      check: '(args, out, exp) => JSON.stringify(out) === JSON.stringify(exp)', cases: [
      [[[5,200,7,200],200],[true,[5,7,200]]],
      [[[5,7],1],[false,[5,7]]],
      [[[],3],[false,[]]],
      [[[3],3],[true,[]]],
      [[[0,1,2],1],[true,[0,2]]],
      [[[9,9,9],2],[false,[9,9,9]]],
      [[[9,9,9],0],[false,[9,9,9]]],
      [[[1000,1000],1000],[true,[1000]]],
      [[[127,128,128],128],[true,[127,128]]],
      [[[-129,-129],-129],[true,[-129]]],
      [[[2147483647,-2147483648],-2147483648],[true,[2147483647]]],
      [[[1,2,3,2,1],1],[true,[2,3,2,1]]],
      [[[5],6],[false,[5]]],
      [[[300,5,300,6],300],[true,[5,300,6]]],
      [[{"$rep":5,"n":100000},5],[true,{"$rep":5,"n":99999}]],
      [[{"$rep":5,"n":100000},6],[false,{"$rep":5,"n":100000}]],
      [[{"$concat":[{"$rep":1,"n":99999},[2]]},2],[true,{"$rep":1,"n":99999}]]
    ] },
    solution: {
      approach: `<p>Box the value explicitly so the compiler chooses <code>remove(Object)</code>, which finds the first element <code>equals</code> to it, removes it and reports success.</p>`,
      code: `class Solution {
    boolean removeValue(List<Integer> list, int v) {
        return list.remove(Integer.valueOf(v));   // remove(Object): first equal element
    }

    public static void main(String[] args) {
        List<Integer> a = new ArrayList<>(List.of(5, 200, 7, 200));
        a.remove(1);                                // remove(int index)
        System.out.println(a);                      // [5, 7, 200]
        List<Integer> b = new ArrayList<>(List.of(5, 200, 7, 200));
        System.out.println(new Solution().removeValue(b, 200) + " " + b);   // true [5, 7, 200]
    }
}`,
      dry: { head: ['Call', 'Overload chosen', 'List after'], rows: [
        ['a.remove(1)', 'remove(int index)', '[5, 7, 200]'],
        ['b.remove(Integer.valueOf(200))', 'remove(Object)', '[5, 7, 200]'],
        ['b.remove(Integer.valueOf(1))', 'remove(Object) → not found', 'unchanged, returns false']
      ] },
      complexity: `<p>O(n) time (scan + shift), O(1) space.</p>`,
      followUps: ['Remove ALL occurrences in O(n).', 'Why does <code>Integer a = 127, b = 127; a == b</code> print true but 128 prints false?']
    }
  });

  practice.push({
    title: 'Two Sum with a HashMap',
    level: 'Easy', tags: ['HashMap', 'complement lookup'], companies: ['Amazon', 'Google', 'Adobe', 'Infosys'],
    statement: `<p>Given <code>int[] nums</code> and <code>target</code>, return indices <code>[i, j]</code> (i &lt; j) such that <code>nums[i] + nums[j] == target</code>. Exactly one answer exists; you may not use the same element twice.</p>`,
    constraints: `2 ≤ n ≤ 10<sup>4</sup>; −10<sup>9</sup> ≤ nums[i], target ≤ 10<sup>9</sup>.`,
    example: `${H.arr([2, 7, 11, 15], { label: 'target = 9', hl: { 0: 'g', 1: 'g' } })}<p>Answer ${H.c('g', '[0, 1]')} because 2 + 7 = 9. At index 1 we need 9 − 7 = 2, which the map already holds at index 0.</p>`,
    brute: {
      why: `<p>Check every pair (i, j): n(n−1)/2 ≈ 5·10<sup>7</sup> additions for n = 10<sup>4</sup>. The wasted work: for each j we rescan everything before it to find the complement, instead of remembering what we have seen.</p>`,
      code: `class Solution {
    int[] twoSum(int[] nums, int target) {
        for (int i = 0; i < nums.length; i++)
            for (int j = i + 1; j < nums.length; j++)
                if ((long) nums[i] + nums[j] == target) return new int[]{i, j};
        return new int[0];
    }
}`
    },
    mcq: { q: 'What should the map store so the lookup is O(1)?', options: ['value → index of numbers already seen', 'index → value', 'sum → pair', 'target → index'], answer: 0, explain: 'For each x we ask "have I seen target − x?" — a key lookup by value, returning where it was.' },
    hints: [
      `<p>Hint 1: For the current number x, the partner must be exactly <code>target − x</code>. The question becomes "have I seen that value before, and where?".</p>`,
      `<p>Hint 2: Keep a <code>HashMap&lt;Integer, Integer&gt;</code> from value → index of everything to the left of the current position.</p>`,
      `<p>Hint 3: Look up the complement <b>before</b> inserting the current number, so an element is never paired with itself (e.g. target 6, nums [3, …]). Duplicates like [3, 3] work because the first 3 is already in the map when the second arrives.</p>`
    ],
    tests: { sig: 'int[] int -> int[]', fn: 'twoSum', cases: [
      [[[2,7,11,15],9],[0,1]],
      [[[3,3],6],[0,1]],
      [[[3,2,4],6],[1,2]],
      [[[0,4,3,0],0],[0,3]],
      [[[-1,-2,-3,-4,-5],-8],[2,4]],
      [[[1000000000,-1000000000,5],0],[0,1]],
      [[[-1000000000,1000000000],0],[0,1]],
      [[[1,5,9,14],23],[2,3]],
      [[[5,75,25],100],[1,2]],
      [[[1,2],3],[0,1]],
      [[[4,4,9],8],[0,1]],
      [[[-3,4,3,90],0],[0,2]],
      [[{"$concat":[{"$rep":1,"n":5000},[2,7],{"$rep":1,"n":4998}]},9],[5000,5001]],
      [[{"$range":[0,10000]},19997],[9998,9999]],
      [[{"$concat":[{"$rep":-1000000000,"n":4999},[1000000000,7]]},1000000007],[4999,5000]]
    ] },
    solution: {
      approach: `<p>One pass. For each index j, compute <code>need = target − nums[j]</code>; if the map contains it, return its index and j. Otherwise record <code>nums[j] → j</code>.</p>`,
      code: `class Solution {
    int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();          // value -> index
        for (int j = 0; j < nums.length; j++) {
            Integer i = seen.get(target - nums[j]);             // complement seen before?
            if (i != null) return new int[]{i, j};
            seen.put(nums[j], j);                               // insert AFTER the check
        }
        return new int[0];
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(new Solution().twoSum(new int[]{2, 7, 11, 15}, 9)));   // [0, 1]
        System.out.println(Arrays.toString(new Solution().twoSum(new int[]{3, 3}, 6)));           // [0, 1]
    }
}`,
      dry: { head: ['j', 'nums[j]', 'need', 'map before', 'action'], rows: [
        ['0', '2', '7', '{}', 'put 2→0'],
        ['1', '7', '2', '{2=0}', '<span class="c-g">found 2 at 0 → [0, 1]</span>']
      ] },
      complexity: `<p>Time O(n) average, space O(n).</p>`,
      followUps: ['Return all pairs with distinct values.', 'If the array is sorted, solve it in O(1) extra space (two pointers).']
    }
  });

  practice.push({
    title: 'Valid Parentheses with ArrayDeque',
    level: 'Easy', tags: ['ArrayDeque', 'stack'], companies: ['Amazon', 'Meta', 'Bloomberg', 'Wipro'],
    statement: `<p>Given a string of the characters <code>()[]{}</code>, return true if every opening bracket is closed by the same type of bracket in the correct order.</p>`,
    constraints: `1 ≤ s.length ≤ 10<sup>4</sup>.`,
    example: `<p><code>"([]{})"</code> → ${H.c('g', 'true')}. <code>"([)]"</code> → ${H.c('r', 'false')}: when <code>)</code> arrives, the most recent unclosed bracket is <code>[</code>, not <code>(</code>.</p>`,
    brute: {
      why: `<p>Repeatedly delete adjacent pairs "()", "[]", "{}" until nothing changes. Each pass is O(n) and creates a new String; nested input like "((((…))))" needs n/2 passes → O(n²) time and lots of garbage.</p>`,
      code: `class Solution {
    boolean isValid(String s) {
        String prev;
        do {
            prev = s;
            s = s.replace("()", "").replace("[]", "").replace("{}", "");   // O(n) per pass
        } while (!s.equals(prev));
        return s.isEmpty();
    }
}`
    },
    mcq: { q: 'Why is a stack (LIFO) the natural fit?', options: ['The most recently opened bracket must be the first one closed', 'Brackets must be sorted', 'We need O(1) random access', 'Duplicates must be removed'], answer: 0, explain: 'Nesting is last-opened, first-closed — exactly LIFO. ArrayDeque.push/pop gives O(1) at the top.' },
    hints: [
      `<p>Hint 1: Read left to right. An opener is a promise to be kept later; a closer must keep the <b>latest</b> unkept promise.</p>`,
      `<p>Hint 2: <code>Deque&lt;Character&gt; st = new ArrayDeque&lt;&gt;()</code>. Push the <b>expected closer</b> when you see an opener (push ')' for '('); when you see a closer, pop and compare.</p>`,
      `<p>Hint 3: Fail if you meet a closer while the stack is empty (<code>pop()</code> would throw — check <code>isEmpty()</code> or use <code>pollFirst()</code> which returns null). At the end the stack must be empty ("((" is invalid). Odd length → immediately false.</p>`
    ],
    tests: { sig: 'string -> bool', fn: 'isValid', cases: [
      [["([]{})"],true],
      [["([)]"],false],
      [["(("],false],
      [["()"],true],
      [["(]"],false],
      [["("],false],
      [[")"],false],
      [["()[]{}"],true],
      [["{[]}"],true],
      [[")("],false],
      [["(()"],false],
      [["())"],false],
      [["[({})]"],true],
      [["{{{{}}}}"],true],
      [["([{"],false],
      [["}])"],false],
      [["(){}}{"],false],
      [["[[]]()"],true],
      [[{"$rep":"()","n":5000}],true],
      [[{"$concat":[{"$rep":"(","n":5000},{"$rep":")","n":5000}]}],true],
      [[{"$rep":"(","n":10000}],false],
      [[{"$concat":[{"$rep":"[","n":4999},"(","]",{"$rep":"]","n":4999}]}],false],
      [[{"$concat":[{"$rep":"{","n":5000},{"$rep":"}","n":4999},"]"]}],false]
    ] },
    solution: {
      approach: `<p>Use ArrayDeque as a stack of expected closing brackets. Each opener pushes its partner; each closer must equal the popped top. Valid iff no mismatch and the stack ends empty.</p>`,
      code: `class Solution {
    boolean isValid(String s) {
        if (s.length() % 2 == 1) return false;
        Deque<Character> st = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(') st.push(')');
            else if (c == '[') st.push(']');
            else if (c == '{') st.push('}');
            else if (st.isEmpty() || st.pop() != c) return false;   // wrong or missing opener
        }
        return st.isEmpty();                                        // nothing left unclosed
    }

    public static void main(String[] args) {
        Solution sol = new Solution();
        System.out.println(sol.isValid("([]{})") + " " + sol.isValid("([)]") + " " + sol.isValid("(("));   // true false false
    }
}`,
      dry: { head: ['char', 'action', 'stack (top first)'], rows: [
        ['(', 'push )', '[)]'],
        ['[', 'push ]', '[], )]'],
        [']', 'pop ] == ] ✓', '[)]'],
        ['{', 'push }', '[}, )]'],
        ['}', 'pop } == } ✓', '[)]'],
        [')', 'pop ) == ) ✓', '<span class="c-g">[] → true</span>']
      ] },
      complexity: `<p>Time O(n), space O(n) in the worst case (all openers).</p>`,
      followUps: ['Return the length of the longest valid parentheses substring.', 'Why is <code>st.pop() != c</code> safe here even though it compares a Character with a char? (Unboxing to char.)']
    }
  });

  practice.push({
    title: 'Sorted Intersection of Two Arrays',
    level: 'Easy', tags: ['HashSet', 'TreeSet', 'retainAll'], companies: ['Google', 'Facebook', 'Accenture'],
    statement: `<p>Given two int arrays, return the values that appear in <b>both</b>, each value once, in <b>ascending</b> order.</p>`,
    constraints: `1 ≤ n, m ≤ 10<sup>5</sup>; values fit in int.`,
    example: `<p>a = [4, 9, 5, 4], b = [9, 4, 9, 8, 4] → common values {4, 9} → ${H.c('g', '[4, 9]')}.</p>`,
    brute: {
      why: `<p>For every element of a, scan all of b (O(n·m) = 10<sup>10</sup> in the worst case) and also check the result list for duplicates (another linear scan). Two different "have I seen it?" questions, both answered by slow scans.</p>`,
      code: `class Solution {
    List<Integer> intersect(int[] a, int[] b) {
        List<Integer> res = new ArrayList<>();
        for (int x : a)
            for (int y : b)
                if (x == y && !res.contains(x)) { res.add(x); break; }   // O(m) + O(res)
        Collections.sort(res);
        return res;
    }
}`
    },
    mcq: { q: 'Which pair of Set operations gives a sorted intersection most directly?', options: ['Build TreeSet from a, then retainAll(set of b)', 'HashSet of a, then addAll(b)', 'TreeSet of a, then removeAll(b)', 'ArrayList of a, then sort'], answer: 0, explain: 'retainAll keeps only elements also in the other set (intersection). A TreeSet keeps the result sorted. Make the argument a HashSet so each contains check is O(1).' },
    hints: [
      `<p>Hint 1: "Appears in both, each once" is set intersection. Sets remove duplicates for free.</p>`,
      `<p>Hint 2: Put b into a <code>HashSet</code> (O(1) contains). Then put a into a <code>TreeSet</code> and call <code>retainAll(bSet)</code>.</p>`,
      `<p>Hint 3: <code>retainAll</code> calls <code>bSet.contains</code> for each element — fast because bSet is hashed. Empty intersection → empty list. Alternative: sort both arrays and walk with two pointers in O(n log n) with O(1) extra space.</p>`
    ],
    tests: { sig: 'int[] int[] -> list<int>', fn: 'intersect', cases: [
      [[[4,9,5,4],[9,4,9,8,4]],[4,9]],
      [[[1],[2]],[]],
      [[[1],[1]],[1]],
      [[[1,1,1],[1,1]],[1]],
      [[[-3,-1,0],[0,-1,5]],[-1,0]],
      [[[2147483647,-2147483648],[-2147483648,2147483647,0]],[-2147483648,2147483647]],
      [[[5,4,3,2,1],[1,2,3,4,5]],[1,2,3,4,5]],
      [[[1,2,3],[4,5,6]],[]],
      [[[7,7,8],[8,7]],[7,8]],
      [[[0],[0,0]],[0]],
      [[[10,20],[20,10]],[10,20]],
      [[{"$range":[0,100000]},{"$range":[50000,150000]}],{"$range":[50000,100000]}],
      [[{"$range":[100000,0,-1]},{"$range":[0,100000]}],{"$range":[1,100000]}],
      [[{"$rep":3,"n":100000},{"$rep":3,"n":100000}],[3]],
      [[{"$range":[0,100000]},{"$range":[100000,200000]}],[]]
    ] },
    solution: {
      approach: `<p>Hash the second array, keep a sorted set of the first, intersect with retainAll, and copy into a list.</p>`,
      code: `class Solution {
    List<Integer> intersect(int[] a, int[] b) {
        Set<Integer> inB = new HashSet<>();
        for (int y : b) inB.add(y);
        TreeSet<Integer> res = new TreeSet<>();
        for (int x : a) res.add(x);          // unique + sorted
        res.retainAll(inB);                   // intersection, O(n) contains checks
        return new ArrayList<>(res);
    }

    public static void main(String[] args) {
        System.out.println(new Solution().intersect(new int[]{4, 9, 5, 4}, new int[]{9, 4, 9, 8, 4}));   // [4, 9]
    }
}`,
      dry: { head: ['Step', 'Set contents'], rows: [
        ['inB from b', '{4, 8, 9}'],
        ['TreeSet from a', '[4, 5, 9]'],
        ['retainAll(inB)', '5 not in inB → removed'],
        ['result', '<span class="c-g">[4, 9]</span>']
      ] },
      complexity: `<p>Time O(n log n + m) (TreeSet inserts), space O(n + m).</p>`,
      followUps: ['Keep duplicates as many times as they appear in both (multiset intersection — use a count map).', 'What if b is too big for memory but sorted on disk?']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Group Anagrams',
    level: 'Medium', tags: ['HashMap', 'computeIfAbsent', 'grouping'], companies: ['Amazon', 'Uber', 'Goldman Sachs'],
    statement: `<p>Given an array of lowercase words, group the anagrams together (words made of the same letters). Return the groups in any order.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>4</sup>; 0 ≤ word length ≤ 100; lowercase a–z.`,
    example: `<p>["eat","tea","tan","ate","nat","bat"] → ${H.c('g', '[[eat, tea, ate], [tan, nat], [bat]]')}. "eat", "tea", "ate" all sort to the key "aet".</p>`,
    brute: {
      why: `<p>Compare every word with every existing group by checking "are these anagrams?" (sort both or count letters) — O(n · groups · L). With many distinct groups that approaches O(n²·L). The waste: we recompute a comparison instead of computing one canonical <b>key</b> per word.</p>`,
      code: `class Solution {
    List<List<String>> groupAnagrams(String[] words) {
        List<List<String>> groups = new ArrayList<>();
        for (String w : words) {
            boolean placed = false;
            for (List<String> g : groups) {
                if (isAnagram(g.get(0), w)) { g.add(w); placed = true; break; }   // scan all groups
            }
            if (!placed) groups.add(new ArrayList<>(List.of(w)));
        }
        return groups;
    }
    private boolean isAnagram(String a, String b) {
        char[] x = a.toCharArray(), y = b.toCharArray();
        Arrays.sort(x); Arrays.sort(y);
        return Arrays.equals(x, y);
    }
}`
    },
    mcq: { q: 'What is a good HashMap key for "same letters, any order"?', options: ['The word with its letters sorted (e.g. "aet")', 'The word itself', 'The word length', 'The first letter'], answer: 0, explain: 'All anagrams share the same sorted form, and non-anagrams differ. A 26-count signature like "1#0#0#…" also works in O(L).' },
    hints: [
      `<p>Hint 1: Turn each word into a <b>canonical key</b> that is identical for all its anagrams.</p>`,
      `<p>Hint 2: Sort the characters: <code>char[] c = w.toCharArray(); Arrays.sort(c); String key = new String(c);</code>. Then <code>map.computeIfAbsent(key, k -&gt; new ArrayList&lt;&gt;()).add(w)</code>.</p>`,
      `<p>Hint 3: Return <code>new ArrayList&lt;&gt;(map.values())</code>. Empty string is its own group (key ""). For long words, a count-based key avoids the L log L sort.</p>`
    ],
    tests: { sig: 'string[] -> list<list<string>>', fn: 'groupAnagrams', cmp: 'sets', cases: [
      [[["eat","tea","tan","ate","nat","bat"]],[["eat","tea","ate"],["tan","nat"],["bat"]]],
      [[[""]],[[""]]],
      [[["a"]],[["a"]]],
      [[["",""]],[["",""]]],
      [[["ab","ba"]],[["ab","ba"]]],
      [[["ab","cd"]],[["ab"],["cd"]]],
      [[["a","a","a"]],[["a","a","a"]]],
      [[["abc","bca","cab","bac","abd"]],[["abc","bca","cab","bac"],["abd"]]],
      [[["","a",""]],[["",""],["a"]]],
      [[["listen","silent","enlist","google","gogole"]],[["listen","silent","enlist"],["google","gogole"]]],
      [[["aab","aba","baa","abb"]],[["aab","aba","baa"],["abb"]]],
      [[{"$rep":"abc","n":10000}],[{"$rep":"abc","n":10000}]],
      [[{"$concat":[{"$rep":"ab","n":5000},{"$rep":"ba","n":5000}]}],[{"$concat":[{"$rep":"ab","n":5000},{"$rep":"ba","n":5000}]}]],
      [[{"$rep":"abcdefghijklmnopqrstuvwxyz","n":100}],[{"$rep":"abcdefghijklmnopqrstuvwxyz","n":100}]]
    ] },
    solution: {
      approach: `<p>Map each word to its sorted-letter key and group with <code>computeIfAbsent</code>. The map's values are the answer.</p>`,
      code: `class Solution {
    List<List<String>> groupAnagrams(String[] words) {
        Map<String, List<String>> groups = new HashMap<>();
        for (String w : words) {
            char[] c = w.toCharArray();
            Arrays.sort(c);                                         // canonical form
            groups.computeIfAbsent(new String(c), k -> new ArrayList<>()).add(w);
        }
        return new ArrayList<>(groups.values());
    }

    public static void main(String[] args) {
        List<List<String>> g = new Solution().groupAnagrams(new String[]{"eat", "tea", "tan", "ate", "nat", "bat"});
        g.sort(Comparator.comparing((List<String> l) -> -l.size()).thenComparing(l -> l.get(0)));
        System.out.println(g);   // [[eat, tea, ate], [tan, nat], [bat]]
    }
}`,
      dry: { head: ['word', 'key', 'map after'], rows: [
        ['eat', 'aet', '{aet=[eat]}'],
        ['tea', 'aet', '{aet=[eat, tea]}'],
        ['tan', 'ant', '{aet=[eat, tea], ant=[tan]}'],
        ['ate', 'aet', '{aet=[eat, tea, ate], ant=[tan]}'],
        ['nat', 'ant', '{…, ant=[tan, nat]}'],
        ['bat', 'abt', '<span class="c-g">3 groups</span>']
      ] },
      complexity: `<p>Time O(n · L log L), space O(n · L).</p>`,
      followUps: ['Use a 26-letter count signature for O(n · L).', 'Return only groups of size ≥ 2, sorted by size.']
    }
  });

  practice.push({
    title: 'Top K Frequent Elements',
    level: 'Medium', tags: ['HashMap', 'PriorityQueue', 'bucket sort'], companies: ['Amazon', 'Facebook', 'Yelp'],
    statement: `<p>Given an int array and k, return the k most frequent elements (any order). The answer is unique.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>5</sup>; 1 ≤ k ≤ number of distinct elements. Aim for better than O(n log n).`,
    example: `<p>[1,1,1,2,2,3], k = 2 → counts {1:3, 2:2, 3:1} → ${H.c('g', '[1, 2]')}.</p>`,
    brute: {
      why: `<p>Count with a map (fine), then sort <b>all</b> distinct entries by count — O(m log m) — even though only k are needed. Acceptable, but the heap gets O(m log k) and bucket sort O(n).</p>`,
      code: `class Solution {
    int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> cnt = new HashMap<>();
        for (int x : nums) cnt.merge(x, 1, Integer::sum);
        List<Map.Entry<Integer, Integer>> all = new ArrayList<>(cnt.entrySet());
        all.sort((a, b) -> Integer.compare(b.getValue(), a.getValue()));   // sorts everything
        int[] res = new int[k];
        for (int i = 0; i < k; i++) res[i] = all.get(i).getKey();
        return res;
    }
}`
    },
    mcq: { q: 'To keep the k MOST frequent with a heap of size k, the heap should be ordered by…', options: ['count ascending (min-heap) so the least frequent of the top k is evicted', 'count descending (max-heap)', 'value ascending', 'insertion order'], answer: 0, explain: 'Same idea as k-th largest: the root is the weakest member of the club; anything better replaces it.' },
    hints: [
      `<p>Hint 1: Two jobs: count (HashMap + merge), then select the best k by count.</p>`,
      `<p>Hint 2: Min-heap of map entries ordered by value, capped at size k: offer, and poll when size &gt; k.</p>`,
      `<p>Hint 3: For O(n): bucket sort — <code>List&lt;Integer&gt;[] buckets</code> indexed by frequency (max n), then walk from the highest bucket down until you have k. k equal to distinct count → return all keys.</p>`
    ],
    tests: { sig: 'int[] int -> int[]', fn: 'topKFrequent', cmp: 'set', cases: [
      [[[1,1,1,2,2,3],2],[1,2]],
      [[[1],1],[1]],
      [[[1,2],2],[1,2]],
      [[[4,4,4,4,5,5,6],1],[4]],
      [[[-1,-1,-2,-2,-2,3],2],[-2,-1]],
      [[[5,3,5,3,5,1],3],[5,3,1]],
      [[[0,0,0,7,7],2],[0,7]],
      [[[2147483647,2147483647,-2147483648],1],[2147483647]],
      [[[9,8,8,7,7,7],2],[7,8]],
      [[[2,2,3,3,3,4,4,4,4],3],[4,3,2]],
      [[{"$concat":[{"$rep":7,"n":50000},{"$rep":8,"n":30000},{"$rep":9,"n":20000}]},2],[7,8]],
      [[{"$concat":[{"$rep":7,"n":50000},{"$rep":8,"n":30000},{"$rep":9,"n":20000}]},3],[7,8,9]],
      [[{"$concat":[{"$rep":1,"n":99990},{"$range":[2,12]}]},1],[1]]
    ] },
    solution: {
      approach: `<p>Count with merge, keep a size-k min-heap keyed on frequency, then drain it. O(n + m log k).</p>`,
      code: `class Solution {
    int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> cnt = new HashMap<>();
        for (int x : nums) cnt.merge(x, 1, Integer::sum);
        PriorityQueue<Map.Entry<Integer, Integer>> heap =
                new PriorityQueue<>(Map.Entry.comparingByValue());          // min-heap by count
        for (Map.Entry<Integer, Integer> e : cnt.entrySet()) {
            heap.offer(e);
            if (heap.size() > k) heap.poll();                               // drop least frequent
        }
        int[] res = new int[k];
        for (int i = k - 1; i >= 0; i--) res[i] = heap.poll().getKey();     // most frequent first
        return res;
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(new Solution().topKFrequent(new int[]{1, 1, 1, 2, 2, 3}, 2)));   // [1, 2]
    }
}`,
      dry: { head: ['entry offered', 'heap (by count)', 'size > 2?'], rows: [
        ['1=3', '[1=3]', 'no'],
        ['2=2', '[2=2, 1=3]', 'no'],
        ['3=1', '[3=1, 1=3, 2=2]', 'yes → poll 3=1'],
        ['drain', '2=2 then 1=3', '<span class="c-g">res = [1, 2]</span>']
      ] },
      complexity: `<p>Time O(n + m log k) where m = distinct values; space O(m). Bucket sort variant: O(n).</p>`,
      followUps: ['Top k frequent <b>words</b>, ties broken alphabetically (LeetCode 692).', 'Streaming version with limited memory (Count-Min Sketch + heap).']
    }
  });

  practice.push({
    title: 'Design a Hit Counter (last 5 minutes)',
    level: 'Medium', tags: ['ArrayDeque', 'queue', 'design', 'sliding window'], companies: ['Dropbox', 'Google', 'Microsoft'],
    statement: `<p>Design <code>HitCounter</code> with <code>void hit(int timestamp)</code> and <code>int getHits(int timestamp)</code> returning the number of hits in the past 300 seconds, i.e. in <code>(timestamp − 300, timestamp]</code>. Calls arrive in non-decreasing timestamp order; several hits may share a timestamp.</p>`,
    constraints: `1 ≤ timestamp ≤ 2·10<sup>9</sup>; up to 10<sup>5</sup> calls.`,
    example: `<p>hit(1), hit(2), hit(3), getHits(4) → ${H.c('g', '3')}; hit(300), getHits(300) → ${H.c('g', '4')}; getHits(301) → ${H.c('g', '3')} (the hit at 1 is now older than 300 s).</p>`,
    brute: {
      why: `<p>Store every hit in a list forever and count matching timestamps on each <code>getHits</code>: O(total hits) per query and unbounded memory. The waste: hits older than 300 s can never matter again, yet we keep scanning them.</p>`,
      code: `class HitCounter {
    private final List<Integer> hits = new ArrayList<>();
    void hit(int t) { hits.add(t); }
    int getHits(int t) {
        int c = 0;
        for (int h : hits) if (h > t - 300) c++;   // scans everything, forever
        return c;
    }
}`
    },
    mcq: { q: 'Timestamps arrive in order. Which structure lets you drop expired hits cheaply?', options: ['A FIFO queue (ArrayDeque): expired hits are always at the front', 'A HashSet', 'A TreeSet of all hits', 'A stack'], answer: 0, explain: 'Oldest hits are at the head, so poll from the front while they are expired — each hit is added once and removed once (amortised O(1)).' },
    hints: [
      `<p>Hint 1: Because time only moves forward, the hits that expire first are the ones that arrived first — FIFO.</p>`,
      `<p>Hint 2: <code>ArrayDeque&lt;Integer&gt;</code>: <code>hit</code> → <code>offerLast(t)</code>; <code>getHits(t)</code> → while <code>peekFirst() &lt;= t - 300</code>, <code>pollFirst()</code>; return <code>size()</code>.</p>`,
      `<p>Hint 3: Many hits per second? Store <code>int[]{time, count}</code> pairs and merge equal timestamps into the last pair to bound memory to 300 entries. Use <code>&lt;=</code> so a hit exactly 300 s old is expired.</p>`
    ],
    tests: { sig: 'int[] int[] -> string', fn: 'hitCheck',
      harness: { java: `class Check { static String hitCheck(int[] ops, int[] ts) { HitCounter h = new HitCounter(); List<Integer> out = new ArrayList<>(); long sum = 0; for (int i = 0; i < ops.length; i++) { if (ops[i] == 0) h.hit(ts[i]); else { int v = h.getHits(ts[i]); out.add(v); sum += v; } } if (out.size() <= 30) { StringBuilder sb = new StringBuilder(); for (int i = 0; i < out.size(); i++) sb.append(i > 0 ? "," : "").append(out.get(i)); return sb.toString(); } return "n=" + out.size() + " sum=" + sum; } }` }, cases: [
      [[[0,0,0,1,0,1,1],[1,2,3,4,300,300,301]],"3,4,3"],
      [[[1],[5]],"0"],
      [[[0,1],[10,10]],"1"],
      [[[0,1,1],[1,300,301]],"1,0"],
      [[[0,0,0,1],[5,5,5,305]],"0"],
      [[[0,0,0,1],[5,5,5,304]],"3"],
      [[[0,1,0,1,0,1],[1,1,150,150,299,299]],"1,2,3"],
      [[[0,1,1,1],[100,399,400,401]],"1,0,0"],
      [[[0,1],[2000000000,2000000000]],"1"],
      [[[0,0,1,1],[1999999700,2000000000,2000000000,2000000000]],"1,1"],
      [[[0,1,0,1,0,1],[1,301,301,601,601,901]],"0,0,0"],
      [[{"$concat":[{"$rep":0,"n":50000},{"$rep":1,"n":50000}]},{"$concat":[{"$range":[1,50001]},{"$range":[50001,100001]}]}],"n=50000 sum=44850"],
      [[{"$concat":[{"$rep":0,"n":99990},{"$rep":1,"n":10}]},{"$concat":[{"$rep":5,"n":99990},{"$rep":400,"n":10}]}],"0,0,0,0,0,0,0,0,0,0"]
    ] },
    solution: {
      approach: `<p>Queue of timestamps. Evict from the front everything at or before <code>t − 300</code>, then the queue size is the answer. Each timestamp is enqueued once and dequeued at most once.</p>`,
      code: `class HitCounter {
    private final Deque<Integer> q = new ArrayDeque<>();

    void hit(int timestamp) { q.offerLast(timestamp); }

    int getHits(int timestamp) {
        while (!q.isEmpty() && q.peekFirst() <= timestamp - 300) q.pollFirst();   // expire old hits
        return q.size();
    }

    public static void main(String[] args) {
        HitCounter hc = new HitCounter();
        hc.hit(1); hc.hit(2); hc.hit(3);
        System.out.print(hc.getHits(4) + " ");     // 3
        hc.hit(300);
        System.out.print(hc.getHits(300) + " ");   // 4
        System.out.println(hc.getHits(301));       // 3
    }
}`,
      dry: { head: ['call', 'evicted', 'queue', 'answer'], rows: [
        ['hit 1,2,3', '', '[1, 2, 3]', ''],
        ['getHits(4)', 'none (≤ −296)', '[1, 2, 3]', '3'],
        ['hit(300)', '', '[1, 2, 3, 300]', ''],
        ['getHits(300)', 'none (≤ 0)', '[1, 2, 3, 300]', '4'],
        ['getHits(301)', '<span class="c-r">1</span> (≤ 1)', '[2, 3, 300]', '<span class="c-g">3</span>']
      ] },
      complexity: `<p>Amortised O(1) per call; memory O(hits in the window) — O(300) with the merged-count variant.</p>`,
      followUps: ['Make it thread-safe for a web server.', 'Use a fixed circular array of 300 buckets instead of a queue.']
    }
  });

  practice.push({
    title: 'My Calendar: Book Without Overlaps (TreeMap)',
    level: 'Medium', tags: ['TreeMap', 'floorKey', 'ceilingKey', 'intervals'], companies: ['Google', 'Uber', 'Atlassian'],
    statement: `<p>Implement <code>MyCalendar</code> with <code>boolean book(int start, int end)</code> for the half-open interval <code>[start, end)</code>. Add the booking and return true only if it does not overlap any existing booking; otherwise return false and do not add it.</p>`,
    constraints: `0 ≤ start &lt; end ≤ 10<sup>9</sup>; up to 10<sup>4</sup> (follow-up: 10<sup>5</sup>) calls.`,
    example: `<p>book(10, 20) → ${H.c('g', 'true')}; book(15, 25) → ${H.c('r', 'false')} (overlaps 10–20); book(20, 30) → ${H.c('g', 'true')} (touching at 20 is fine because intervals are half-open).</p>`,
    brute: {
      why: `<p>Keep a list of bookings and test the new interval against every one: O(n) per call, O(n²) overall. The waste: only the two bookings <b>nearest</b> to <code>start</code> can possibly overlap.</p>`,
      code: `class MyCalendar {
    private final List<int[]> booked = new ArrayList<>();
    boolean book(int start, int end) {
        for (int[] b : booked)
            if (start < b[1] && b[0] < end) return false;   // overlap test against all
        booked.add(new int[]{start, end});
        return true;
    }
}`
    },
    mcq: { q: 'With bookings stored as TreeMap start → end, which two lookups decide overlap for [s, e)?', options: ['floorKey(s) (previous booking) and ceilingKey(s) (next booking)', 'firstKey() and lastKey()', 'get(s) and get(e)', 'headMap(s) and tailMap(e) sizes'], answer: 0, explain: 'Only the booking starting at or before s (it must end ≤ s) and the one starting at or after s (it must start ≥ e) can collide.' },
    hints: [
      `<p>Hint 1: Existing bookings never overlap each other, so sorted by start they are also sorted by end. Only the neighbours of the new start matter.</p>`,
      `<p>Hint 2: <code>TreeMap&lt;Integer, Integer&gt; cal</code> (start → end). <code>Integer prev = cal.floorKey(start)</code>, <code>Integer next = cal.ceilingKey(start)</code>.</p>`,
      `<p>Hint 3: Overlap if <code>prev != null &amp;&amp; cal.get(prev) &gt; start</code> or <code>next != null &amp;&amp; next &lt; end</code>. Half-open: end == next start is allowed. Both lookups may return null (no neighbour).</p>`
    ],
    tests: { sig: 'int[] int[] -> string', fn: 'calCheck',
      harness: { java: `class Check { static String calCheck(int[] s, int[] e) { MyCalendar c = new MyCalendar(); int trues = 0, n = s.length; StringBuilder sb = new StringBuilder(); for (int i = 0; i < n; i++) { boolean ok = c.book(s[i], e[i]); if (ok) trues++; if (n <= 30) sb.append(i > 0 ? "," : "").append(ok); } return n <= 30 ? sb.toString() : "n=" + n + " trues=" + trues; } }` }, cases: [
      [[[10,15,20],[20,25,30]],"true,false,true"],
      [[[0],[1]],"true"],
      [[[5,5],[10,10]],"true,false"],
      [[[10,5],[20,10]],"true,true"],
      [[[10,5],[20,11]],"true,false"],
      [[[10,12],[20,18]],"true,false"],
      [[[12,10],[18,20]],"true,false"],
      [[[10,0],[20,30]],"true,false"],
      [[[0,999999999],[1,1000000000]],"true,true"],
      [[[20,10,15,30],[30,20,25,40]],"true,true,false,true"],
      [[[1,2,3],[2,3,4]],"true,true,true"],
      [[[1,1,1],[2,2,2]],"true,false,false"],
      [[[50,40,45],[60,50,55]],"true,true,false"],
      [[{"$range":[0,10000]},{"$range":[1,10001]}],"n=10000 trues=10000"],
      [[{"$range":[0,10000,2]},{"$range":[2,10002,2]}],"n=5000 trues=5000"],
      [[{"$rep":0,"n":10000},{"$rep":1,"n":10000}],"n=10000 trues=1"]
    ] },
    solution: {
      approach: `<p>TreeMap from start to end. For a new [s, e) check only the floor neighbour (must end ≤ s) and the ceiling neighbour (must start ≥ e). Insert on success. Each call is O(log n).</p>`,
      code: `class MyCalendar {
    private final TreeMap<Integer, Integer> cal = new TreeMap<>();   // start -> end

    boolean book(int start, int end) {
        Integer prev = cal.floorKey(start);          // booking starting at or before start
        if (prev != null && cal.get(prev) > start) return false;
        Integer next = cal.ceilingKey(start);        // booking starting at or after start
        if (next != null && next < end) return false;
        cal.put(start, end);
        return true;
    }

    public static void main(String[] args) {
        MyCalendar c = new MyCalendar();
        System.out.println(c.book(10, 20) + " " + c.book(15, 25) + " " + c.book(20, 30));   // true false true
    }
}`,
      dry: { head: ['call', 'floor (prev)', 'ceiling (next)', 'result', 'calendar'], rows: [
        ['book(10,20)', 'null', 'null', 'true', '{10=20}'],
        ['book(15,25)', '10 → ends 20 &gt; 15', '—', '<span class="c-r">false</span>', '{10=20}'],
        ['book(20,30)', '10 → ends 20, not &gt; 20', 'null', '<span class="c-g">true</span>', '{10=20, 20=30}']
      ] },
      complexity: `<p>O(log n) per booking, O(n) space. Brute force O(n) per booking.</p>`,
      followUps: ['My Calendar II: allow double booking but not triple (count map with a sweep).', 'Return the maximum number of simultaneous bookings (TreeMap of +1/−1 deltas).']
    }
  });

  practice.push({
    title: 'Meeting Rooms II: Minimum Rooms Needed',
    level: 'Medium', tags: ['PriorityQueue', 'sorting', 'intervals'], companies: ['Facebook', 'Google', 'Amazon', 'Bloomberg'],
    statement: `<p>Given meeting intervals <code>[start, end)</code>, return the minimum number of conference rooms required so that no two overlapping meetings share a room.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>4</sup>; 0 ≤ start &lt; end ≤ 10<sup>6</sup>.`,
    example: `<p>[[0,30],[5,10],[15,20]] → ${H.c('g', '2')}: [0,30] needs a room; [5,10] overlaps it → second room; [15,20] reuses the room freed at 10.</p>`,
    brute: {
      why: `<p>For every time point that is a start, count how many meetings are active at that moment by scanning all meetings: O(n²). The waste: we re-scan all meetings instead of tracking which rooms free up next.</p>`,
      code: `class Solution {
    int minMeetingRooms(int[][] m) {
        int best = 0;
        for (int[] a : m) {
            int active = 0;
            for (int[] b : m) if (b[0] <= a[0] && a[0] < b[1]) active++;   // meetings live at a's start
            best = Math.max(best, active);
        }
        return best;
    }
}`
    },
    mcq: { q: 'After sorting by start time, what should the PriorityQueue hold?', options: ['End times of meetings currently using a room (min-heap)', 'Start times', 'Meeting lengths', 'Room numbers in a max-heap'], answer: 0, explain: 'The room that frees up soonest is the min end time. If it is ≤ the new start, reuse that room (poll), then push the new end.' },
    hints: [
      `<p>Hint 1: Process meetings in start order. For each, ask "has any room become free by now?" — only the room that frees up earliest matters.</p>`,
      `<p>Hint 2: Min-heap of end times. If <code>heap.peek() &lt;= start</code>, poll it (reuse the room). Always offer the new end.</p>`,
      `<p>Hint 3: The answer is the heap's maximum size, which equals its final size with this algorithm. Sort with <code>Arrays.sort(m, Comparator.comparingInt(x -&gt; x[0]))</code>. Back-to-back meetings ([5,10] then [10,15]) share a room because of <code>&lt;=</code>.</p>`
    ],
    tests: { sig: 'int[] int[] -> int', fn: 'roomsCheck',
      harness: { java: `class Check { static int roomsCheck(int[] s, int[] e) { int[][] m = new int[s.length][]; for (int i = 0; i < s.length; i++) m[i] = new int[]{s[i], e[i]}; return new Solution().minMeetingRooms(m); } }` }, cases: [
      [[[0,5,15],[30,10,20]],2],
      [[[7],[10]],1],
      [[[1,2,3],[4,5,6]],3],
      [[[0,10,20],[10,20,30]],1],
      [[[0,0,0],[1,1,1]],3],
      [[[1,2],[3,3]],2],
      [[[0,5],[5,10]],1],
      [[[0,4],[5,10]],2],
      [[[1,3,5,7],[2,4,6,8]],1],
      [[[0,1,2,3],[10,9,8,7]],4],
      [[[5,1,3],[6,4,5]],2],
      [[[0,999999],[999999,1000000]],1],
      [[{"$range":[0,10000]},{"$range":[1,10001]}],1],
      [[{"$rep":0,"n":10000},{"$rep":1000000,"n":10000}],10000],
      [[{"$range":[0,10000]},{"$range":[10000,20000]}],10000]
    ] },
    solution: {
      approach: `<p>Sort by start. Keep a min-heap of end times for occupied rooms. For each meeting, free the earliest-ending room if it is done, then occupy a room with this meeting's end. The heap size is the number of rooms in use; it never shrinks below the peak because we poll at most one per meeting.</p>`,
      code: `class Solution {
    int minMeetingRooms(int[][] meetings) {
        int[][] m = meetings.clone();
        Arrays.sort(m, Comparator.comparingInt(x -> x[0]));      // by start time
        PriorityQueue<Integer> ends = new PriorityQueue<>();      // end times of busy rooms
        for (int[] mt : m) {
            if (!ends.isEmpty() && ends.peek() <= mt[0]) ends.poll();   // reuse freed room
            ends.offer(mt[1]);
        }
        return ends.size();
    }

    public static void main(String[] args) {
        System.out.println(new Solution().minMeetingRooms(new int[][]{{0, 30}, {5, 10}, {15, 20}}));   // 2
    }
}`,
      dry: { head: ['meeting', 'heap.peek() ≤ start?', 'heap after', 'rooms'], rows: [
        ['[0,30]', 'empty', '[30]', '1'],
        ['[5,10]', '30 ≤ 5? no', '[10, 30]', '2'],
        ['[15,20]', '10 ≤ 15? yes → poll', '[20, 30]', '<span class="c-g">2</span>']
      ] },
      complexity: `<p>Time O(n log n), space O(n).</p>`,
      followUps: ['Return which room each meeting gets (heap of [end, roomId]).', 'Solve with a TreeMap of +1/−1 deltas (sweep line).']
    }
  });

  practice.push({
    title: 'Time-Based Key-Value Store',
    level: 'Medium', tags: ['HashMap', 'TreeMap', 'floorEntry', 'design'], companies: ['Netflix', 'Lyft', 'Google'],
    statement: `<p>Design <code>TimeMap</code>: <code>set(key, value, timestamp)</code> stores a value at a time; <code>get(key, timestamp)</code> returns the value set for <code>key</code> at the largest timestamp ≤ the given one, or <code>""</code> if none.</p>`,
    constraints: `Up to 2·10<sup>5</sup> calls; timestamps for each key may arrive in any order; 1 ≤ timestamp ≤ 10<sup>7</sup>.`,
    example: `<p>set("foo","bar",1); get("foo",1) → ${H.c('g', '"bar"')}; get("foo",3) → ${H.c('g', '"bar"')} (latest ≤ 3 is time 1); set("foo","bar2",4); get("foo",4) → ${H.c('g', '"bar2"')}; get("foo",0) → ${H.c('m', '""')}.</p>`,
    brute: {
      why: `<p>Keep a list of (time, value) per key and scan it on every <code>get</code> for the best timestamp ≤ t: O(versions) per query. The waste: the versions could be kept sorted so the answer is found by a O(log n) search.</p>`,
      code: `class TimeMap {
    private final Map<String, List<Object[]>> data = new HashMap<>();
    void set(String key, String value, int t) {
        data.computeIfAbsent(key, k -> new ArrayList<>()).add(new Object[]{t, value});
    }
    String get(String key, int t) {
        String best = ""; int bestT = -1;
        for (Object[] e : data.getOrDefault(key, List.of())) {      // linear scan of versions
            int et = (Integer) e[0];
            if (et <= t && et > bestT) { bestT = et; best = (String) e[1]; }
        }
        return best;
    }
}`
    },
    mcq: { q: 'Which TreeMap method answers "value at the largest timestamp ≤ t"?', options: ['floorEntry(t)', 'ceilingEntry(t)', 'higherEntry(t)', 'firstEntry()'], answer: 0, explain: 'floor = greatest key less than or equal to t. ceiling would be the smallest ≥ t (the future), higher the smallest > t.' },
    hints: [
      `<p>Hint 1: Two levels of lookup: by key (exact → hash map), then by time (nearest at or below → sorted map).</p>`,
      `<p>Hint 2: <code>Map&lt;String, TreeMap&lt;Integer, String&gt;&gt;</code>; set uses <code>computeIfAbsent(key, k -&gt; new TreeMap&lt;&gt;()).put(t, v)</code>.</p>`,
      `<p>Hint 3: get: fetch the TreeMap (may be null → ""), call <code>floorEntry(t)</code> (may be null → ""), return its value. Works even if timestamps arrive out of order.</p>`
    ],
    tests: { sig: 'string[] int[] -> string', fn: 'tmCheck',
      harness: { java: `class Check { static String tmCheck(String[] ops, int[] ts) { TimeMap tm = new TimeMap(); List<String> out = new ArrayList<>(); for (int i = 0; i < ops.length; i++) { String[] p = ops[i].split(":"); if (p[0].equals("s")) tm.set(p[1], p[2], ts[i]); else out.add(tm.get(p[1], ts[i])); } if (out.size() <= 30) { StringBuilder sb = new StringBuilder(); for (String s : out) sb.append("[").append(s).append("]"); return sb.toString(); } int ne = 0; for (String s : out) if (!s.isEmpty()) ne++; return "n=" + out.size() + " nonEmpty=" + ne; } }` }, cases: [
      [[["s:foo:bar","g:foo","g:foo","s:foo:bar2","g:foo","g:foo"],[1,1,3,4,4,0]],"[bar][bar][bar2][]"],
      [[["g:x"],[5]],"[]"],
      [[["s:a:v","g:b"],[1,1]],"[]"],
      [[["s:a:v1","s:a:v2","g:a","g:a","g:a"],[5,10,4,5,9]],"[][v1][v1]"],
      [[["s:a:late","s:a:early","g:a","g:a","g:a"],[10,2,1,2,10]],"[][early][late]"],
      [[["s:a:x","s:b:y","g:a","g:b","g:c"],[1,2,3,3,3]],"[x][y][]"],
      [[["s:k:1","s:k:2","s:k:3","g:k","g:k","g:k","g:k"],[1,3,5,0,2,4,100]],"[][1][2][3]"],
      [[["s:a:old","s:a:new","g:a"],[10000000,1,10000000]],"[old]"],
      [[["s:a:v","g:a"],[10000000,9999999]],"[]"],
      [[["s:a:v","g:a"],[1,10000000]],"[v]"],
      [[{"$concat":[{"$rep":"s:k:v","n":100000},{"$rep":"g:k","n":100000}]},{"$concat":[{"$range":[1,100001]},{"$range":[1,100001]}]}],"n=100000 nonEmpty=100000"],
      [[{"$concat":[{"$rep":"g:k","n":50000},{"$rep":"s:k:v","n":50000},{"$rep":"g:k","n":50000}]},{"$concat":[{"$rep":1,"n":50000},{"$range":[1,50001]},{"$range":[1,50001]}]}],"n=100000 nonEmpty=50000"]
    ] },
    solution: {
      approach: `<p>HashMap from key to a TreeMap of timestamp → value. Lookups use <code>floorEntry</code> for the latest version at or before t in O(log v).</p>`,
      code: `class TimeMap {
    private final Map<String, TreeMap<Integer, String>> data = new HashMap<>();

    void set(String key, String value, int timestamp) {
        data.computeIfAbsent(key, k -> new TreeMap<>()).put(timestamp, value);
    }

    String get(String key, int timestamp) {
        TreeMap<Integer, String> versions = data.get(key);
        if (versions == null) return "";
        Map.Entry<Integer, String> e = versions.floorEntry(timestamp);   // latest <= timestamp
        return e == null ? "" : e.getValue();
    }

    public static void main(String[] args) {
        TimeMap tm = new TimeMap();
        tm.set("foo", "bar", 1);
        System.out.print(tm.get("foo", 1) + " " + tm.get("foo", 3) + " ");   // bar bar
        tm.set("foo", "bar2", 4);
        System.out.println(tm.get("foo", 4) + " [" + tm.get("foo", 0) + "]");  // bar2 []
    }
}`,
      dry: { head: ['call', 'TreeMap for foo', 'floorEntry', 'result'], rows: [
        ['set(foo,bar,1)', '{1=bar}', '', ''],
        ['get(foo,3)', '{1=bar}', '1=bar', 'bar'],
        ['set(foo,bar2,4)', '{1=bar, 4=bar2}', '', ''],
        ['get(foo,4)', '{1=bar, 4=bar2}', '4=bar2', 'bar2'],
        ['get(foo,0)', '{1=bar, 4=bar2}', 'null', '<span class="c-m">""</span>']
      ] },
      complexity: `<p>set and get O(log v) where v = versions of that key; space O(total sets).</p>`,
      followUps: ['If timestamps per key always increase, replace the TreeMap with an ArrayList + binary search (less memory).', 'Add <code>delete(key, t)</code> and range queries (subMap).']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Sliding Window Maximum (Monotonic ArrayDeque)',
    level: 'Hard', tags: ['ArrayDeque', 'monotonic deque', 'sliding window'], companies: ['Amazon', 'Google', 'Citadel'],
    statement: `<p>Given <code>int[] nums</code> and window size <code>k</code>, return the maximum of every contiguous window of size k, left to right.</p>`,
    constraints: `1 ≤ k ≤ n ≤ 10<sup>5</sup>; −10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup>. Target O(n).`,
    example: `${H.arr([1, 3, -1, -3, 5, 3, 6, 7], { label: 'k = 3' })}<p>Windows: [1,3,−1]→3, [3,−1,−3]→3, [−1,−3,5]→5, [−3,5,3]→5, [5,3,6]→6, [3,6,7]→7 → ${H.c('g', '[3, 3, 5, 5, 6, 7]')}.</p>`,
    brute: {
      why: `<p>Recompute the max of each window from scratch: (n − k + 1) · k comparisons — about 2.5·10<sup>9</sup> for n = 10<sup>5</sup>, k = 5·10<sup>4</sup>. A max-heap with lazy deletion gets O(n log n); the deque gets O(n) by throwing away elements that can never be a maximum.</p>`,
      code: `class Solution {
    int[] maxSlidingWindow(int[] nums, int k) {
        int[] res = new int[nums.length - k + 1];
        for (int i = 0; i + k <= nums.length; i++) {
            int m = Integer.MIN_VALUE;
            for (int j = i; j < i + k; j++) m = Math.max(m, nums[j]);   // O(k) per window
            res[i] = m;
        }
        return res;
    }
}`
    },
    mcq: { q: 'Why can index j be discarded when a later index i has nums[i] ≥ nums[j]?', options: ['j leaves the window before i and is never bigger, so it can never be a maximum again', 'Because j is smaller than k', 'To keep the deque sorted by index', 'It cannot be discarded'], answer: 0, explain: 'A newer, bigger-or-equal element dominates every older smaller element for all future windows. Removing dominated indices keeps the deque values decreasing; the front is always the max.' },
    hints: [
      `<p>Hint 1: Keep only "candidates" — elements that could still be the maximum of some future window. Older elements smaller than a newer one are hopeless.</p>`,
      `<p>Hint 2: <code>Deque&lt;Integer&gt; dq</code> of <b>indices</b> with decreasing values. For each i: pop from the back while <code>nums[back] &lt;= nums[i]</code>; push i at the back; pop the front if it is outside the window (<code>front &lt;= i - k</code>).</p>`,
      `<p>Hint 3: Once <code>i &gt;= k - 1</code>, record <code>nums[dq.peekFirst()]</code>. Store indices (not values) so you can tell when the front expires. Each index is pushed and popped at most once → O(n).</p>`
    ],
    tests: { sig: 'int[] int -> int[]', fn: 'maxSlidingWindow', cases: [
      [[[1,3,-1,-3,5,3,6,7],3],[3,3,5,5,6,7]],
      [[[1],1],[1]],
      [[[1,-1],1],[1,-1]],
      [[[9,11],2],[11]],
      [[[4,3,2,1],2],[4,3,2]],
      [[[1,2,3,4],2],[2,3,4]],
      [[[5,5,5,5],3],[5,5]],
      [[[-1,-2,-3],2],[-1,-2]],
      [[[7,2,4],2],[7,4]],
      [[[1,3,1,2,0,5],3],[3,3,2,5]],
      [[[10000,-10000,10000],3],[10000]],
      [[{"$range":[0,100000]},1000],{"$range":[999,100000]}],
      [[{"$rep":5,"n":100000},100000],[5]],
      [[{"$range":[100000,0,-1]},3],{"$range":[100000,2,-1]}],
      [[{"$range":[0,100000]},1],{"$range":[0,100000]}],
      [[{"$concat":[{"$range":[0,50000]},{"$range":[50000,0,-1]}]},50000],[49999,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000]]
    ] },
    solution: {
      approach: `<p>Monotonic deque of indices whose values strictly decrease from front to back. The front is the current window's maximum; dominated elements are popped from the back, expired ones from the front.</p>`,
      code: `class Solution {
    int[] maxSlidingWindow(int[] nums, int k) {
        int n = nums.length;
        int[] res = new int[n - k + 1];
        Deque<Integer> dq = new ArrayDeque<>();                 // indices, values decreasing
        for (int i = 0; i < n; i++) {
            while (!dq.isEmpty() && nums[dq.peekLast()] <= nums[i]) dq.pollLast();   // drop dominated
            dq.offerLast(i);
            if (dq.peekFirst() <= i - k) dq.pollFirst();       // front slid out of the window
            if (i >= k - 1) res[i - k + 1] = nums[dq.peekFirst()];
        }
        return res;
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(new Solution().maxSlidingWindow(new int[]{1, 3, -1, -3, 5, 3, 6, 7}, 3)));
        // [3, 3, 5, 5, 6, 7]
    }
}`,
      dry: { head: ['i', 'nums[i]', 'deque (indices → values)', 'output'], rows: [
        ['0', '1', '[0→1]', ''],
        ['1', '3', '[1→3] (popped 0)', ''],
        ['2', '-1', '[1→3, 2→-1]', '3'],
        ['3', '-3', '[1→3, 2→-1, 3→-3]', '3'],
        ['4', '5', '[4→5] (popped 3,2,1)', '5'],
        ['5', '3', '[4→5, 5→3]', '5'],
        ['6', '6', '[6→6]', '6'],
        ['7', '7', '[7→7]', '<span class="c-g">7</span>']
      ] },
      complexity: `<p>Time O(n) amortised (each index enters and leaves once), space O(k).</p>`,
      followUps: ['Sliding window minimum — what flips?', 'Shortest subarray with sum ≥ K with negatives (LeetCode 862) uses the same deque idea on prefix sums.']
    }
  });

  practice.push({
    title: 'Merge K Sorted Linked Lists',
    level: 'Hard', tags: ['PriorityQueue', 'linked list', 'k-way merge'], companies: ['Amazon', 'Meta', 'Microsoft', 'Airbnb'],
    statement: `<p>Given an array of k sorted linked lists (<code>ListNode</code> with <code>val</code> and <code>next</code>), merge them into one sorted list and return its head.</p>`,
    constraints: `0 ≤ k ≤ 10<sup>4</sup>; total nodes N ≤ 10<sup>4</sup>…10<sup>5</sup>; values in [−10<sup>4</sup>, 10<sup>4</sup>].`,
    example: `<p>[1→4→5, 1→3→4, 2→6] → ${H.c('g', '1→1→2→3→4→4→5→6')}. At each step the smallest of the k current heads is taken.</p>`,
    brute: {
      why: `<p>Dump every value into an ArrayList, sort, and rebuild: O(N log N) time and O(N) extra nodes/values — it ignores that each list is already sorted. Merging lists one by one is worse: O(k·N).</p>`,
      code: `class Solution {
    ListNode mergeKLists(ListNode[] lists) {
        List<Integer> all = new ArrayList<>();
        for (ListNode l : lists)
            for (ListNode p = l; p != null; p = p.next) all.add(p.val);
        Collections.sort(all);                                  // ignores existing order
        ListNode dummy = new ListNode(0), tail = dummy;
        for (int v : all) { tail.next = new ListNode(v); tail = tail.next; }
        return dummy.next;
    }
}`
    },
    mcq: { q: 'What does the PriorityQueue hold in the k-way merge?', options: ['The current head node of each non-empty list (at most k nodes)', 'All N nodes', 'Only the values, not nodes', 'The tails of each list'], answer: 0, explain: 'Keeping only the k frontier nodes makes every poll/offer O(log k), for O(N log k) total.' },
    hints: [
      `<p>Hint 1: The next node in the output is always one of the k current heads — the smallest one.</p>`,
      `<p>Hint 2: <code>PriorityQueue&lt;ListNode&gt; pq = new PriorityQueue&lt;&gt;(Comparator.comparingInt(n -&gt; n.val))</code>. Seed it with all non-null heads.</p>`,
      `<p>Hint 3: Loop: poll the smallest node, append it to the result (reuse the node), and if it has a <code>next</code>, offer that. Skip null lists (k may contain nulls, or be 0). Use a dummy head to avoid special cases.</p>`
    ],
    tests: { sig: 'ListNode[] -> ListNode', fn: 'mergeKLists', cases: [
      [[[[1,4,5],[1,3,4],[2,6]]],[1,1,2,3,4,4,5,6]],
      [[[]],[]],
      [[[[]]],[]],
      [[[[],[]]],[]],
      [[[[1]]],[1]],
      [[[[],[1],[]]],[1]],
      [[[[-3,-1],[-2,0]]],[-3,-2,-1,0]],
      [[[[5,5],[5,5]]],[5,5,5,5]],
      [[[[1,2,3],[4,5,6]]],[1,2,3,4,5,6]],
      [[[[4,5,6],[1,2,3]]],[1,2,3,4,5,6]],
      [[[[10000],[-10000]]],[-10000,10000]],
      [[[[1],[1],[1],[1]]],[1,1,1,1]],
      [[{"$rep":[3],"n":10000}],{"$rep":3,"n":10000}],
      [[{"$rep":{"$range":[0,10]},"n":10000}],{"$concat":[{"$rep":0,"n":10000},{"$rep":1,"n":10000},{"$rep":2,"n":10000},{"$rep":3,"n":10000},{"$rep":4,"n":10000},{"$rep":5,"n":10000},{"$rep":6,"n":10000},{"$rep":7,"n":10000},{"$rep":8,"n":10000},{"$rep":9,"n":10000}]}],
      [[[{"$range":[0,50000]},{"$range":[50000,100000]}]],{"$range":[0,100000]}],
      [[[{"$range":[0,100000]}]],{"$range":[0,100000]}]
    ] },
    solution: {
      approach: `<p>Min-heap of the frontier nodes ordered by value. Repeatedly take the smallest, link it into the output and push its successor. Nodes are relinked, not copied.</p>`,
      code: `class Solution {
    ListNode mergeKLists(ListNode[] lists) {
        PriorityQueue<ListNode> pq = new PriorityQueue<>(Comparator.comparingInt(n -> n.val));
        for (ListNode head : lists) if (head != null) pq.offer(head);   // k frontier nodes
        ListNode dummy = new ListNode(0), tail = dummy;
        while (!pq.isEmpty()) {
            ListNode smallest = pq.poll();
            tail.next = smallest;                                       // relink, no copy
            tail = smallest;
            if (smallest.next != null) pq.offer(smallest.next);
        }
        return dummy.next;
    }

    public static void main(String[] args) {
        ListNode a = new ListNode(1, new ListNode(4, new ListNode(5)));
        ListNode b = new ListNode(1, new ListNode(3, new ListNode(4)));
        ListNode c = new ListNode(2, new ListNode(6));
        StringBuilder sb = new StringBuilder();
        for (ListNode p = new Solution().mergeKLists(new ListNode[]{a, b, c}); p != null; p = p.next) sb.append(p.val).append(' ');
        System.out.println(sb.toString().trim());   // 1 1 2 3 4 4 5 6
    }
}`,
      dry: { head: ['poll', 'offer next', 'heap values after', 'output so far'], rows: [
        ['1 (a)', '4', '{1, 2, 4}', '1'],
        ['1 (b)', '3', '{2, 3, 4}', '1 1'],
        ['2 (c)', '6', '{3, 4, 6}', '1 1 2'],
        ['3 (b)', '4', '{4, 4, 6}', '1 1 2 3'],
        ['4, 4, 5, 6', '…', '{}', '<span class="c-g">1 1 2 3 4 4 5 6</span>']
      ] },
      complexity: `<p>Time O(N log k), extra space O(k) for the heap.</p>`,
      followUps: ['Divide and conquer: merge pairs of lists — also O(N log k) with O(1) extra space (besides recursion).', 'Merge k sorted <b>arrays</b> (heap of [value, arrayIndex, elementIndex]).']
    }
  });

  practice.push({
    title: 'Find Median from a Data Stream (Two Heaps)',
    level: 'Hard', tags: ['PriorityQueue', 'two heaps', 'design'], companies: ['Google', 'Amazon', 'Apple', 'Two Sigma'],
    statement: `<p>Design <code>MedianFinder</code> with <code>void addNum(int num)</code> and <code>double findMedian()</code>. The median of an even count is the mean of the two middle values.</p>`,
    constraints: `Up to 5·10<sup>4</sup> calls; values in [−10<sup>5</sup>, 10<sup>5</sup>]; findMedian is called only when at least one number exists.`,
    example: `<p>addNum(1), addNum(2) → findMedian() = ${H.c('g', '1.5')}; addNum(3) → findMedian() = ${H.c('g', '2.0')}.</p>`,
    brute: {
      why: `<p>Keep a sorted ArrayList and insert each number at its binary-search position: finding the spot is O(log n) but the insert shifts O(n) elements, so n additions cost O(n²). Sorting on every findMedian is worse: O(n log n) per query.</p>`,
      code: `class MedianFinder {
    private final List<Integer> sorted = new ArrayList<>();
    void addNum(int num) {
        int i = Collections.binarySearch(sorted, num);
        if (i < 0) i = -i - 1;
        sorted.add(i, num);                                     // O(n) shift
    }
    double findMedian() {
        int n = sorted.size();
        return n % 2 == 1 ? sorted.get(n / 2) : (sorted.get(n / 2 - 1) + (double) sorted.get(n / 2)) / 2;
    }
}`
    },
    mcq: { q: 'In the two-heap design, which heap holds the LOWER half?', options: ['A max-heap, so its top is the largest of the small numbers', 'A min-heap', 'Either, it does not matter', 'A TreeSet'], answer: 0, explain: 'The median sits at the boundary: the largest of the lower half (max-heap top) and the smallest of the upper half (min-heap top).' },
    hints: [
      `<p>Hint 1: You never need the whole order — only the two middle values. Split the numbers into a lower half and an upper half.</p>`,
      `<p>Hint 2: <code>low</code> = max-heap (<code>Comparator.reverseOrder()</code>), <code>high</code> = min-heap. Invariant: every low ≤ every high, and <code>low.size()</code> is equal to or one more than <code>high.size()</code>.</p>`,
      `<p>Hint 3: addNum: push into low, move low's top to high (keeps order), then if high is bigger move high's top back to low. Median: odd count → <code>low.peek()</code>; even → <code>(low.peek() + (double) high.peek()) / 2</code> (cast to avoid int division/overflow).</p>`
    ],
    tests: { sig: 'int[] int[] -> string', fn: 'medCheck',
      harness: { java: `class Check { static String medCheck(int[] ops, int[] vals) { MedianFinder m = new MedianFinder(); List<String> out = new ArrayList<>(); long sum2 = 0; for (int i = 0; i < ops.length; i++) { if (ops[i] == 0) m.addNum(vals[i]); else { double d = m.findMedian(); sum2 += Math.round(2 * d); out.add(String.valueOf(d)); } } return out.size() <= 20 ? String.join(",", out) : "n=" + out.size() + " sum2=" + sum2; } }` }, cases: [
      [[[0,0,1,0,1],[1,2,0,3,0]],"1.5,2.0"],
      [[[0,1],[5,0]],"5.0"],
      [[[0,0,1],[-1,-2,0]],"-1.5"],
      [[[0,1,0,1,0,1],[3,0,1,0,2,0]],"3.0,2.0,2.0"],
      [[[0,0,0,1],[100000,-100000,0,0]],"0.0"],
      [[[0,0,1],[100000,99999,0]],"99999.5"],
      [[[0,0,0,0,1],[1,1,1,1,0]],"1.0"],
      [[[0,1,0,1],[-100000,0,-100000,0]],"-100000.0,-100000.0"],
      [[[0,0,1,0,1,0,1,0,1],[5,3,0,8,0,1,0,9,0]],"4.0,5.0,4.0,5.0"],
      [[[0,0,0,0,0,1],[9,8,7,6,5,0]],"7.0"],
      [[[0,0,1,0,0,1],[1,2,0,3,4,0]],"1.5,2.5"],
      [[{"$concat":[{"$rep":0,"n":25000},{"$rep":1,"n":25000}]},{"$concat":[{"$range":[-100000,-75000]},{"$rep":0,"n":25000}]}],"n=25000 sum2=-4375025000"],
      [[{"$concat":[{"$rep":0,"n":25000},{"$rep":1,"n":25000}]},{"$concat":[{"$range":[75000,100000]},{"$rep":0,"n":25000}]}],"n=25000 sum2=4374975000"],
      [[{"$concat":[{"$rep":0,"n":49999},[1]]},{"$concat":[{"$rep":7,"n":49999},[0]]}],"7.0"]
    ] },
    solution: {
      approach: `<p>Two heaps meeting at the middle. Each insertion does at most three heap operations (O(log n)); the median is read from the tops in O(1).</p>`,
      code: `class MedianFinder {
    private final PriorityQueue<Integer> low = new PriorityQueue<>(Comparator.reverseOrder()); // max-heap
    private final PriorityQueue<Integer> high = new PriorityQueue<>();                         // min-heap

    void addNum(int num) {
        low.offer(num);
        high.offer(low.poll());                     // largest of low moves up: keeps low <= high
        if (high.size() > low.size()) low.offer(high.poll());   // rebalance: low has the extra one
    }

    double findMedian() {
        return low.size() > high.size() ? low.peek() : (low.peek() + (double) high.peek()) / 2.0;
    }

    public static void main(String[] args) {
        MedianFinder mf = new MedianFinder();
        mf.addNum(1); mf.addNum(2);
        System.out.print(mf.findMedian() + " ");    // 1.5
        mf.addNum(3);
        System.out.println(mf.findMedian());        // 2.0
    }
}`,
      dry: { head: ['add', 'low (max-heap)', 'high (min-heap)', 'median'], rows: [
        ['1', '[1]', '[]', '1.0'],
        ['2', '[1]', '[2]', '1.5'],
        ['3', '[2, 1]', '[3]', '<span class="c-g">2.0</span>']
      ] },
      complexity: `<p>addNum O(log n), findMedian O(1), space O(n).</p>`,
      followUps: ['Sliding window median (needs deletions: two TreeMaps with counts, or lazy deletion).', 'If all numbers are in 0..100, use a count array for O(1) add and O(100) median.']
    }
  });

  practice.push({
    title: 'Maximum Frequency Stack',
    level: 'Hard', tags: ['HashMap', 'ArrayDeque', 'design', 'stack of stacks'], companies: ['Amazon', 'Google', 'Apple'],
    statement: `<p>Design <code>FreqStack</code>: <code>push(int val)</code> and <code>int pop()</code>, where pop removes and returns the <b>most frequent</b> element; if several tie, the one pushed <b>most recently</b> among them.</p>`,
    constraints: `Up to 2·10<sup>4</sup> calls; pop is only called on a non-empty stack. O(1) per operation is possible.`,
    example: `<p>push 5, 7, 5, 7, 4, 5 → pop() = ${H.c('g', '5')} (freq 3), pop() = ${H.c('g', '7')} (5 and 7 now tie at 2; 7 is more recent), pop() = ${H.c('g', '5')}, pop() = ${H.c('g', '4')}.</p>`,
    brute: {
      why: `<p>Keep all pushes in a list; on pop, count frequencies of everything (O(n)), find the max, then scan backwards for the most recent element with that frequency and remove it (O(n)). Every pop is O(n), so n pops cost O(n²).</p>`,
      code: `class FreqStack {
    private final List<Integer> all = new ArrayList<>();
    void push(int val) { all.add(val); }
    int pop() {
        Map<Integer, Integer> f = new HashMap<>();
        int max = 0;
        for (int v : all) max = Math.max(max, f.merge(v, 1, Integer::sum));   // recount: O(n)
        for (int i = all.size() - 1; i >= 0; i--)
            if (f.get(all.get(i)) == max) return all.remove(i);               // remove(int): O(n)
        throw new IllegalStateException("empty");
    }
}`
    },
    mcq: { q: 'What is the key trick for O(1) pops?', options: ['A map from frequency → stack of values pushed at that frequency, plus the current max frequency', 'A PriorityQueue keyed by frequency only', 'Sorting on each pop', 'A single TreeMap'], answer: 0, explain: 'When a value reaches frequency f it is pushed onto stack f. The top of stack[maxFreq] is the answer; ties are resolved by LIFO automatically. A heap with (freq, time) also works in O(log n).' },
    hints: [
      `<p>Hint 1: Track each value's current count in a <code>HashMap&lt;Integer, Integer&gt; freq</code>.</p>`,
      `<p>Hint 2: Also keep <code>Map&lt;Integer, Deque&lt;Integer&gt;&gt; group</code>: when a push makes val's count f, push val onto <code>group[f]</code>. A value with count 3 appears in groups 1, 2 and 3 — that is intended.</p>`,
      `<p>Hint 3: pop: take <code>group[maxFreq].pop()</code>, decrement its count; if that stack became empty, <code>maxFreq--</code>. Recency ties are handled by each group being a stack.</p>`
    ],
    tests: { sig: 'int[] int[] -> string', fn: 'fsCheck',
      harness: { java: `class Check { static String fsCheck(int[] ops, int[] vals) { FreqStack fs = new FreqStack(); List<Integer> out = new ArrayList<>(); long sum = 0; for (int i = 0; i < ops.length; i++) { if (ops[i] == 0) fs.push(vals[i]); else { int v = fs.pop(); out.add(v); sum += v; } } if (out.size() <= 20) { StringBuilder sb = new StringBuilder(); for (int i = 0; i < out.size(); i++) sb.append(i > 0 ? "," : "").append(out.get(i)); return sb.toString(); } return "n=" + out.size() + " sum=" + sum; } }` }, cases: [
      [[[0,0,0,0,0,0,1,1,1,1],[5,7,5,7,4,5,0,0,0,0]],"5,7,5,4"],
      [[[0,1],[3,0]],"3"],
      [[[0,0,1,1],[1,2,0,0]],"2,1"],
      [[[0,0,0,1,1,1],[1,1,1,0,0,0]],"1,1,1"],
      [[[0,0,1,0,1,1],[1,2,0,1,0,0]],"2,1,1"],
      [[[0,0,0,1,0,1,1,1],[1,2,2,0,1,0,0,0]],"2,1,2,1"],
      [[[0,0,0,0,1,1,1,1],[-1,-2,-1,-2,0,0,0,0]],"-2,-1,-2,-1"],
      [[[0,0,1,0,0,1,1,1],[0,0,0,5,5,0,0,0]],"0,5,5,0"],
      [[[0,1,0,1,0,1],[9,0,9,0,8,0]],"9,9,8"],
      [[[0,0,0,0,1,0,1,1,1],[1,2,3,1,0,2,0,0,0]],"1,2,3,2"],
      [[{"$concat":[{"$rep":0,"n":10000},{"$rep":1,"n":10000}]},{"$concat":[{"$range":[0,10000]},{"$rep":0,"n":10000}]}],"n=10000 sum=49995000"],
      [[{"$concat":[{"$rep":0,"n":10000},{"$rep":1,"n":10000}]},{"$concat":[{"$rep":4,"n":10000},{"$rep":0,"n":10000}]}],"n=10000 sum=40000"],
      [[{"$concat":[{"$rep":0,"n":5000},{"$rep":1,"n":5000},{"$rep":0,"n":5000},{"$rep":1,"n":5000}]},{"$concat":[{"$range":[0,5000]},{"$rep":0,"n":5000},{"$range":[0,5000]},{"$rep":0,"n":5000}]}],"n=10000 sum=24995000"]
    ] },
    solution: {
      approach: `<p>Stack of stacks indexed by frequency. Pushing a value with new frequency f adds it to group f; the answer is always the top of the highest non-empty group. All operations are O(1).</p>`,
      code: `class FreqStack {
    private final Map<Integer, Integer> freq = new HashMap<>();
    private final Map<Integer, Deque<Integer>> group = new HashMap<>();
    private int maxFreq = 0;

    void push(int val) {
        int f = freq.merge(val, 1, Integer::sum);                   // new count of val
        maxFreq = Math.max(maxFreq, f);
        group.computeIfAbsent(f, k -> new ArrayDeque<>()).push(val);
    }

    int pop() {
        Deque<Integer> top = group.get(maxFreq);
        int val = top.pop();                                         // most recent at max freq
        freq.merge(val, -1, Integer::sum);
        if (top.isEmpty()) maxFreq--;
        return val;
    }

    public static void main(String[] args) {
        FreqStack fs = new FreqStack();
        for (int v : new int[]{5, 7, 5, 7, 4, 5}) fs.push(v);
        System.out.println(fs.pop() + " " + fs.pop() + " " + fs.pop() + " " + fs.pop());   // 5 7 5 4
    }
}`,
      dry: { head: ['op', 'freq', 'groups (top first)', 'maxFreq', 'return'], rows: [
        ['push ×6', '{5:3, 7:2, 4:1}', '1:[4,7,5] 2:[7,5] 3:[5]', '3', ''],
        ['pop', '{5:2, 7:2, 4:1}', '3:[] → maxFreq 2', '2', '<span class="c-g">5</span>'],
        ['pop', '{5:2, 7:1, 4:1}', '2:[5]', '2', '<span class="c-g">7</span>'],
        ['pop', '{5:1, 7:1, 4:1}', '2:[] → maxFreq 1', '1', '<span class="c-g">5</span>'],
        ['pop', '{5:1, 7:1, 4:0}', '1:[7,5]', '1', '<span class="c-g">4</span>']
      ] },
      complexity: `<p>O(1) average per push and pop; O(n) space.</p>`,
      followUps: ['Implement with a PriorityQueue of (freq, pushTime, val) — O(log n) — and compare.', 'Support <code>peek()</code> and <code>getMaxFrequency()</code>.']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push({ q: 'Which of these does <b>not</b> extend <code>java.util.Collection</code>?', options: ['<code>Map</code>', '<code>Deque</code>', '<code>Set</code>', '<code>List</code>'], answer: 0, explain: 'Map stores key–value pairs and sits in its own hierarchy. You reach its contents through the keySet(), values() and entrySet() views.' });
  quiz.push({ q: 'What does this print?<br><code>List&lt;Integer&gt; l = new ArrayList&lt;&gt;(List.of(10, 20, 30)); l.remove(1); System.out.println(l);</code>', options: ['<code>[10, 30]</code>', '<code>[20, 30]</code>', '<code>[10, 20, 30]</code>', 'It throws an exception'], answer: 0, explain: 'The int literal 1 matches remove(int index) exactly (no boxing needed), so index 1 (the value 20) is removed.' });
  quiz.push({ q: 'What happens on <code>List.of(1, 2, 3).add(4)</code>?', options: ['<code>UnsupportedOperationException</code> at runtime', 'Compile error', 'Returns false', 'The list becomes [1, 2, 3, 4]'], answer: 0, explain: 'List.of returns an unmodifiable list. The add method exists on the List interface (optional operation), so it compiles, but throws UOE when called.' });
  quiz.push({ q: 'Which set prints its elements in the order they were first added?', options: ['<code>LinkedHashSet</code>', '<code>HashSet</code>', '<code>TreeSet</code>', '<code>EnumSet</code> always'], answer: 0, explain: 'LinkedHashSet threads a linked list through its entries in insertion order. HashSet has no order promise; TreeSet sorts; EnumSet uses enum declaration order.' });
  quiz.push({ q: '<code>Set&lt;String&gt; s = new TreeSet&lt;&gt;(Comparator.comparingInt(String::length)); s.addAll(List.of("cat", "dog", "ox"));</code> What is <code>s.size()</code>?', options: ['2', '3', '1', 'It throws ClassCastException'], answer: 0, explain: 'TreeSet decides equality with the comparator. "cat" and "dog" both have length 3 → compare returns 0 → "dog" is treated as a duplicate and dropped. Set = [ox, cat].' });
  quiz.push({ q: 'A <code>PriorityQueue&lt;Integer&gt;</code> received 5, 1, 8, 3 via <code>add</code>. What is guaranteed about <code>System.out.println(pq)</code>?', options: ['Only that the first printed element is 1', 'It prints [1, 3, 5, 8]', 'It prints [8, 5, 3, 1]', 'It prints in insertion order'], answer: 0, explain: 'toString walks the internal heap array. The heap only guarantees the root is the minimum; the rest is in heap order, not sorted (here [1, 3, 8, 5]).' });
  quiz.push({ q: 'You remove the second-to-last element of an ArrayList inside a for-each loop. What usually happens?', options: ['The loop ends silently without CME and skips the last element', 'ConcurrentModificationException immediately', 'An infinite loop', 'Compile error'], answer: 0, explain: 'After removal cursor == size, so hasNext() returns false before next() can check modCount. It "works" by accident — and never visits the last element.' });
  quiz.push({ q: 'Which call removes elements safely while iterating a HashMap\'s entries?', options: ['<code>map.entrySet().removeIf(e -&gt; e.getValue() == 0)</code>', '<code>map.remove(k)</code> inside <code>for (K k : map.keySet())</code>', '<code>map.put(k, null)</code>', '<code>map.keySet().add(k)</code>'], answer: 0, explain: 'removeIf on the live entrySet view uses the iterator\'s own remove internally. Calling map.remove inside a for-each changes modCount behind the iterator\'s back.' });
  quiz.push({ q: '<code>Collections.binarySearch(List.of(10, 20, 30, 40), 35)</code> returns…', options: ['-4', '-3', '3', '-1'], answer: 0, explain: '35 would be inserted at index 3 (before 40). Not found → -(insertionPoint) - 1 = -(3) - 1 = -4.' });
  quiz.push({ q: 'Best choice for "for each timestamp query, find the latest price at or before time t"?', options: ['<code>TreeMap&lt;Long, Price&gt;</code> with <code>floorEntry(t)</code>', '<code>HashMap&lt;Long, Price&gt;</code> with <code>get(t)</code>', '<code>ArrayList</code> scanned from the start', '<code>PriorityQueue</code> of prices'], answer: 0, explain: 'floorEntry returns the greatest key ≤ t in O(log n). A HashMap can only answer exact keys.' });
  quiz.push({ q: 'Which is the recommended stack implementation in modern Java?', options: ['<code>ArrayDeque</code> with push/pop/peek', '<code>Stack</code>', '<code>Vector</code>', '<code>LinkedList</code> with add/remove(size-1)'], answer: 0, explain: 'Stack extends Vector (synchronized, exposes index operations). The Deque javadoc itself recommends ArrayDeque for LIFO stacks.' });
  quiz.push({ q: '<code>Collections.unmodifiableList(base)</code> vs <code>List.copyOf(base)</code>: after <code>base.add(x)</code>…', options: ['the unmodifiable view shows x; the copyOf list does not', 'both show x', 'neither shows x', 'both throw UnsupportedOperationException'], answer: 0, explain: 'unmodifiableList is a read-only view over base (changes show through). List.copyOf makes an independent immutable snapshot.' });
  quiz.push({ q: 'What is the time complexity of <code>get(i)</code> on a <code>LinkedList</code> of size n?', options: ['O(n) — it walks from the nearer end', 'O(1)', 'O(log n)', 'O(1) amortised'], answer: 0, explain: 'LinkedList.node(i) starts at the head if i &lt; n/2, else at the tail, and follows pointers. At most n/2 hops, still O(n).' });

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push({
    q: 'Explain the Java Collections Framework hierarchy. Why is Map not a Collection?', level: 'B',
    a: `<p><code>Iterable</code> is at the root (anything usable in for-each). <code>Collection</code> extends it with add/remove/contains/size. Three main sub-interfaces: <code>List</code> (indexed, duplicates allowed), <code>Set</code> (no duplicates; <code>SortedSet</code> → <code>NavigableSet</code>) and <code>Queue</code> (head-based; <code>Deque</code> adds both ends). Implementations: ArrayList/LinkedList, HashSet/LinkedHashSet/TreeSet, PriorityQueue/ArrayDeque.</p>
<p><code>Map</code> is a separate tree (<code>SortedMap</code> → <code>NavigableMap</code>; HashMap, LinkedHashMap, TreeMap) because its unit is a key–value <b>pair</b>; <code>Collection.add(E)</code> takes a single element, so the contract does not fit. Instead Map exposes three Collection <b>views</b>: <code>keySet()</code>, <code>values()</code>, <code>entrySet()</code>.</p>`,
    followUps: ['What is the difference between Collection and Collections?', 'Which interfaces does LinkedList implement?', 'What did Java 21 add to the hierarchy (SequencedCollection)?']
  });
  interview.push({
    q: 'ArrayList vs LinkedList — when would you use each?', level: 'B',
    a: `<p><b>ArrayList</b> is a resizable array: O(1) <code>get(i)</code>, amortised O(1) append, O(n) insert/remove in the middle (a fast memory shift). <b>LinkedList</b> is a doubly linked list: O(1) at the ends, but O(n) to reach index i, ~24 bytes per node and poor cache locality.</p>
<p>In practice ArrayList wins almost everywhere — even for middle insertions, because LinkedList must first <i>walk</i> to the position. For queue/stack use <b>ArrayDeque</b>. LinkedList only shines when you already hold a <code>ListIterator</code> at the spot and do many inserts/removes there. I would back any claim with a JMH benchmark.</p>`,
    followUps: ['How does ArrayList grow?', 'Why is a for-each loop fine on LinkedList but an index loop is O(n²)?', 'What does RandomAccess mean?']
  });
  interview.push({
    q: 'HashSet vs LinkedHashSet vs TreeSet — differences and when to use each.', level: 'B',
    a: `<p>All three reject duplicates. <b>HashSet</b> (backed by HashMap) gives O(1) average add/contains/remove and no order guarantee. <b>LinkedHashSet</b> adds a linked list through entries for predictable <b>insertion order</b>, same O(1), a little more memory. <b>TreeSet</b> (backed by TreeMap, a red-black tree) keeps elements <b>sorted</b>, costs O(log n), forbids null with natural ordering, and adds navigation: <code>floor</code>, <code>ceiling</code>, <code>higher</code>, <code>lower</code>, <code>headSet</code>, <code>tailSet</code>.</p>
<p>Use HashSet for pure membership, LinkedHashSet for "dedupe but keep order", TreeSet for sorted output or nearest-value queries. HashSet/LinkedHashSet rely on equals/hashCode; TreeSet relies on compareTo/compare.</p>`,
    followUps: ['What happens if a TreeSet comparator is inconsistent with equals?', 'Why should elements in a HashSet be immutable?']
  });
  interview.push({
    q: 'What is a fail-fast iterator? How is it implemented, and how do you avoid ConcurrentModificationException?', level: 'I',
    a: `<p>Non-concurrent collections keep a <code>modCount</code> incremented on every structural change (size change). An iterator records <code>expectedModCount</code> when created and, in <code>next()</code>, throws <code>ConcurrentModificationException</code> if they differ. It is "best effort" — e.g. removing the second-to-last element of an ArrayList inside for-each exits silently because <code>hasNext()</code> only checks <code>cursor != size</code>.</p>
<p>Avoid it with <code>Iterator.remove()</code>, <code>removeIf</code>, <code>ListIterator.set/add</code>, <code>map.entrySet().removeIf</code>, iterating a copy, or collecting changes and applying them after the loop. In multi-threaded code use concurrent collections: <code>CopyOnWriteArrayList</code> (snapshot iterator) or <code>ConcurrentHashMap</code> (weakly consistent iterator, never throws CME).</p>`,
    followUps: ['Fail-fast vs fail-safe vs weakly consistent?', 'Does list.set() inside a for-each throw CME?', 'Can CME occur in single-threaded code?']
  });
  interview.push({
    q: 'How does a HashMap decide where to put a key, and what must equals and hashCode guarantee?', level: 'I',
    a: `<p>It calls <code>hashCode()</code>, spreads the bits (<code>h ^ (h &gt;&gt;&gt; 16)</code>) and uses <code>hash &amp; (capacity − 1)</code> as the bucket index. Within a bucket it compares hashes and then <code>equals</code>. The table doubles when size exceeds capacity × 0.75; long chains become red-black trees (threshold 8, table ≥ 64).</p>
<p>The contract: equal objects <b>must</b> have equal hash codes (otherwise lookups miss), hashCode must be stable while the object is in the map, and equals must be reflexive, symmetric, transitive and consistent. Unequal objects may share hash codes (collisions) — that only costs performance. Using mutable fields in hashCode and then changing them strands the entry. Records generate a correct pair automatically.</p>`,
    followUps: ['What happens if you override equals but not hashCode?', 'Why is the capacity a power of two?', 'How does Java 8 protect against hash-flooding attacks?']
  });
  interview.push({
    q: 'Explain getOrDefault, putIfAbsent, computeIfAbsent and merge with use cases.', level: 'I',
    a: `<p><code>getOrDefault(k, d)</code> reads with a fallback (no insertion). <code>putIfAbsent(k, v)</code> inserts only if missing and returns the existing value — but evaluates <code>v</code> eagerly. <code>computeIfAbsent(k, fn)</code> computes the value lazily only when missing and returns the current value — perfect for grouping: <code>map.computeIfAbsent(dept, d -&gt; new ArrayList&lt;&gt;()).add(emp)</code>. <code>merge(k, v, fn)</code> inserts v if absent or replaces with <code>fn(old, v)</code> — perfect for counting: <code>count.merge(word, 1, Integer::sum)</code>; if fn returns null the entry is removed.</p>
<p>On <code>ConcurrentHashMap</code> these are atomic per key, which makes them the right tool for concurrent counters and caches.</p>`,
    followUps: ['Why is putIfAbsent(k, new ArrayList&lt;&gt;()) wasteful?', 'What happens if the computeIfAbsent function modifies the same map?']
  });
  interview.push({
    q: 'How does PriorityQueue work? How do you make a max-heap or order custom objects?', level: 'I',
    a: `<p>PriorityQueue is a binary <b>min-heap</b> stored in an array (children of i at 2i+1 and 2i+2). <code>offer</code> appends and sifts up; <code>poll</code> moves the last element to the root and sifts down — both O(log n); <code>peek</code> is O(1); <code>contains</code>/<code>remove(Object)</code> are O(n). Iteration and <code>toString</code> are in array order, not sorted. It is not thread-safe (PriorityBlockingQueue is) and not stable.</p>
<p>Max-heap: <code>new PriorityQueue&lt;&gt;(Comparator.reverseOrder())</code>. Objects: <code>Comparator.comparingInt(Task::priority).thenComparing(Task::createdAt)</code>. Avoid <code>(a, b) -&gt; b - a</code>, which overflows for large values. Building from a collection uses O(n) heapify.</p>`,
    followUps: ['How do you get the k largest elements of a stream in O(n log k)?', 'How would you implement decrease-key for Dijkstra?']
  });
  interview.push({
    q: 'Why is ArrayDeque preferred over Stack and LinkedList? What are its limitations?', level: 'I',
    a: `<p>ArrayDeque is a resizable <b>circular array</b> with head and tail indices: O(1) amortised at both ends, no per-element node allocation, cache-friendly. <code>Stack</code> extends <code>Vector</code> — every method is synchronized and it exposes index operations (you can insert below the top). <code>LinkedList</code> allocates a node per element and has worse locality.</p>
<p>Limitations: no <code>null</code> elements (null is the "empty" signal of poll/peek), not thread-safe (use <code>ConcurrentLinkedDeque</code> or a <code>BlockingDeque</code>), no index access, and <code>remove(Object)</code>/<code>contains</code> are O(n). Note iteration order differs: ArrayDeque used as a stack iterates top-first, Stack iterates bottom-first.</p>`,
    followUps: ['Show push/pop vs offer/poll on the same ArrayDeque.', 'How does ArrayDeque grow?']
  });
  interview.push({
    q: 'What are the differences between Collections.unmodifiableList, List.copyOf, List.of and Arrays.asList?', level: 'I',
    a: `<p><code>Collections.unmodifiableList(l)</code>: a read-only <b>view</b>; the owner can still modify l and the view reflects it; allows nulls. <code>List.copyOf(c)</code>: an immutable <b>snapshot</b>; rejects nulls; returns the same instance if c is already an immutable list. <code>List.of(…)</code>: immutable, rejects nulls (even <code>contains(null)</code> throws NPE). <code>Arrays.asList(arr)</code>: a fixed-size, <b>write-through</b> view of the array — <code>set</code> works and changes the array, <code>add/remove</code> throw UnsupportedOperationException; allows nulls.</p>
<p>For defensive copies of internal state, return <code>List.copyOf</code>; for a cheap read-only window, return the unmodifiable view.</p>`,
    followUps: ['Is an unmodifiable collection thread-safe?', 'Why does Arrays.asList(int[]) give a List&lt;int[]&gt;?']
  });
  interview.push({
    q: 'TreeMap: what navigation methods does it offer and what real problems do they solve?', level: 'I',
    a: `<p><code>firstKey/lastKey</code>, <code>floorKey(k)</code> (greatest ≤ k), <code>ceilingKey(k)</code> (smallest ≥ k), <code>lowerKey/higherKey</code> (strict), their <code>…Entry</code> versions, <code>headMap/tailMap/subMap</code> (live range views), <code>pollFirstEntry/pollLastEntry</code> and <code>descendingMap</code>. All O(log n) thanks to the red-black tree.</p>
<p>Uses: price/tax bands (floorEntry), time-series "value as of time t", calendar overlap checks (floor + ceiling neighbours), order books (best bid = lastKey, best ask = firstKey), leaderboards and range counts, interval merging and sweep lines (TreeMap of deltas). A HashMap cannot answer any "nearest key" question.</p>`,
    followUps: ['How would you count events in a time range efficiently?', 'Why does TreeMap reject a null key?']
  });
  interview.push({
    q: 'Design an LRU cache in Java. What are the trade-offs of using LinkedHashMap?', level: 'A',
    a: `<p>Fast path: extend <code>LinkedHashMap</code> with <code>accessOrder = true</code> (constructor <code>(16, 0.75f, true)</code>) and override <code>removeEldestEntry</code> to return <code>size() &gt; capacity</code>. Every get/put moves the entry to the tail; the head is the least recently used and is evicted after a put. O(1) for get and put.</p>
<p>Manual version: <code>HashMap&lt;K, Node&gt;</code> + a doubly linked list with sentinel head/tail; get unlinks and re-appends the node; put evicts <code>head.next</code> when full. Trade-offs of LinkedHashMap: not thread-safe (and in access-order mode even <code>get</code> is a structural modification, so concurrent readers corrupt it), no TTL, no size-by-weight. In production use a library such as Caffeine (W-TinyLFU, concurrent, expiry).</p>`,
    followUps: ['Make it thread-safe — what is the simplest correct approach?', 'How would you implement LFU?', 'Why does get() count as a modification in access-order mode?']
  });
  interview.push({
    q: 'What does "amortised O(1)" mean for ArrayList.add? Walk through the growth policy.', level: 'A',
    a: `<p>A no-arg ArrayList starts with a shared empty array; the first add allocates 10 slots. When full, it allocates <code>old + (old &gt;&gt; 1)</code> (1.5×) and copies with <code>System.arraycopy</code>. Most adds are a single store; occasionally one add costs O(n) for the copy. Across n adds the copies sum to a geometric series bounded by a small constant × n, so the <b>average cost per add is O(1)</b> — that is amortised analysis (worst case per call is still O(n)).</p>
<p>Practical consequences: pre-size with <code>new ArrayList&lt;&gt;(n)</code> or <code>ensureCapacity</code> when n is known; latency-sensitive code may see an occasional spike; capacity never shrinks automatically (<code>trimToSize()</code>). HashMap is similar: it doubles at 75% load, and <code>HashMap.newHashMap(n)</code> (Java 19+) pre-sizes correctly.</p>`,
    followUps: ['Why 1.5× and not 2×?', 'How many resizes does it take to reach one million elements?']
  });
  interview.push({
    q: 'How do you choose a collection when the code is multi-threaded?', level: 'A',
    a: `<p>Map: <code>ConcurrentHashMap</code> (fine-grained locking/CAS per bin, atomic <code>merge/compute</code>, weakly consistent iterators) — not <code>Hashtable</code> or <code>Collections.synchronizedMap</code>, which serialise everything. Sorted map/set: <code>ConcurrentSkipListMap/Set</code>. Read-mostly lists (listeners, config): <code>CopyOnWriteArrayList</code> — snapshot iteration, O(n) writes. Queues: <code>ConcurrentLinkedQueue/Deque</code> (non-blocking) or <code>BlockingQueue</code> (<code>ArrayBlockingQueue</code>, <code>LinkedBlockingQueue</code>, <code>PriorityBlockingQueue</code>) for producer–consumer.</p>
<p>Synchronized wrappers still need external locking for compound actions and iteration (<code>synchronized (list) { for (…) }</code>). Often the best design is to avoid sharing: confine mutable collections to one thread and publish immutable snapshots (<code>List.copyOf</code>).</p>`,
    followUps: ['Is "if (!map.containsKey(k)) map.put(k, v)" safe on ConcurrentHashMap?', 'When is CopyOnWriteArrayList a bad idea?']
  });
  interview.push({
    q: 'An AI assistant generated code that removes items from a list inside a for-each and tests pass. How do you review it?', level: 'E',
    a: `<p>I would flag it regardless of the green tests: removal inside for-each is undefined-by-design — it throws CME for most positions and silently skips the last element when the removed item is second-to-last, so a test with that shape can pass while production data crashes. I would ask for <code>removeIf</code> (O(n), intent-revealing) or an explicit <code>Iterator.remove()</code>, and add tests covering: adjacent matches, a match at the last index, all elements matching, none matching, and an empty list.</p>
<p>I would also check the collection type (on a <code>List&lt;Integer&gt;</code>, is <code>remove</code> picking the index overload?), whether the list is a <code>List.of</code>/<code>Arrays.asList</code> that cannot shrink, and whether it is shared across threads. The point of review in the AI era is exactly these contract-level checks the generator does not reason about.</p>`,
    followUps: ['What static-analysis rules (SpotBugs/ErrorProne/IntelliJ inspections) catch this?', 'How would you write a property-based test for a filter function?']
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
