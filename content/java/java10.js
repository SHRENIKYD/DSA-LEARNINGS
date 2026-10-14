(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared helpers for the visualizers ---------------- */
  function clean(input) { return String(input === undefined || input === null ? '' : input).trim(); }
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function note(html, label) { return { type: 'text', label: label || 'Why', html: html }; }
  /* Java's String.hashCode(): s[0]*31^(n-1) + ... + s[n-1], with 32-bit int overflow */
  function jHash(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h;
  }
  /* HashMap.hash(): XOR the top 16 bits into the bottom 16 bits */
  function spread(h) { return (h ^ (h >>> 16)) | 0; }
  /* index = hash & (capacity - 1) */
  function bucketOf(h, cap) { return (spread(h) & (cap - 1)) >>> 0; }
  function low(v, w) { var s = (v >>> 0).toString(2); while (s.length < 32) s = '0' + s; return s.slice(32 - w); }
  /* turns bucket arrays into grid rows padded to the same width */
  function bucketRows(buckets, minW) {
    var w = minW || 1;
    buckets.forEach(function (b) { if (b.length > w) w = b.length; });
    return buckets.map(function (b) { var r = b.slice(); while (r.length < w) r.push(''); return r; });
  }
  function colHeads(rows) {
    var w = rows.length ? rows[0].length : 1, h = [];
    for (var i = 0; i < w; i++) h.push(i === 0 ? 'first node' : 'node ' + (i + 1));
    return h;
  }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(String(i)); return a; }

  /* ---------- red-black tree (same algorithm as TreeMap.fixAfterInsertion) ---------- */
  function rbNew() { return { root: null, size: 0 }; }
  function rbRotL(t, x) {
    var y = x.r; x.r = y.l; if (y.l) y.l.p = x; y.p = x.p;
    if (!x.p) t.root = y; else if (x.p.l === x) x.p.l = y; else x.p.r = y;
    y.l = x; x.p = y;
  }
  function rbRotR(t, x) {
    var y = x.l; x.l = y.r; if (y.r) y.r.p = x; y.p = x.p;
    if (!x.p) t.root = y; else if (x.p.r === x) x.p.r = y; else x.p.l = y;
    y.r = x; x.p = y;
  }
  /* level-order array for the 'tree' part; returns null if deeper than 4 levels below root */
  function rbArr(t, cur, extra) {
    var arr = [], hl = {}, tags = {}, ok = true;
    (function walk(n, i) {
      if (!n) return;
      if (i > 30) { ok = false; return; }
      while (arr.length <= i) arr.push(null);
      arr[i] = n.k; tags[i] = n.red ? 'R' : 'B';
      if (n.red) hl[i] = 'bad';
      if (extra && extra[n.k]) hl[i] = extra[n.k];
      if (cur !== undefined && n.k === cur) hl[i] = 'cur';
      walk(n.l, 2 * i + 1); walk(n.r, 2 * i + 2);
    })(t.root, 0);
    return ok ? { arr: arr, hl: hl, tags: tags } : null;
  }
  /* insert key k; calls log(narr, focusKey) after each meaningful step; returns false on duplicate */
  function rbInsert(t, k, log) {
    var y = null, x = t.root;
    while (x) { y = x; if (k < x.k) x = x.l; else if (k > x.k) x = x.r; else { log('Key <b>' + k + '</b> already exists — TreeMap just replaces the value; the tree shape does not change.', k); return false; } }
    var z = { k: k, red: true, l: null, r: null, p: y };
    if (!y) t.root = z; else if (k < y.k) y.l = z; else y.r = z;
    t.size++;
    log('Insert <b>' + k + '</b> like a normal BST (walk left if smaller, right if bigger) and colour it <span class="c-r">RED</span>. A red node never changes any path\'s black count, so only the "no red-red" rule can break.', k);
    x = z;
    while (x !== t.root && x.p.red) {
      var par = x.p, g = par.p, uncle;
      if (par === g.l) {
        uncle = g.r;
        if (uncle && uncle.red) {
          par.red = false; uncle.red = false; g.red = true;
          log('Red parent ' + par.k + ' + <b>red uncle</b> ' + uncle.k + ' → <b>recolour</b>: parent and uncle become black, grandparent ' + g.k + ' becomes red. The problem (if any) moves two levels up.', g.k);
          x = g;
        } else {
          if (x === par.r) { x = par; rbRotL(t, x); log('Red parent, <b>black/missing uncle</b>, and ' + x.p.k + ' is an "inner" grandchild (left-right zig-zag) → <b>rotate left</b> at ' + x.k + ' to straighten the line.', x.k); }
          x.p.red = false; x.p.p.red = true; var gg = x.p.p; rbRotR(t, gg);
          log('Straight line (left-left) → <b>rotate right</b> at grandparent ' + gg.k + ' and swap colours: the middle key ' + x.p.k + ' becomes the black top of this little subtree.', x.p.k);
        }
      } else {
        uncle = g.l;
        if (uncle && uncle.red) {
          par.red = false; uncle.red = false; g.red = true;
          log('Red parent ' + par.k + ' + <b>red uncle</b> ' + uncle.k + ' → <b>recolour</b>: parent and uncle become black, grandparent ' + g.k + ' becomes red. The problem (if any) moves two levels up.', g.k);
          x = g;
        } else {
          if (x === par.l) { x = par; rbRotR(t, x); log('Red parent, <b>black/missing uncle</b>, and ' + x.p.k + ' is an "inner" grandchild (right-left zig-zag) → <b>rotate right</b> at ' + x.k + ' to straighten the line.', x.k); }
          x.p.red = false; x.p.p.red = true; var gg2 = x.p.p; rbRotL(t, gg2);
          log('Straight line (right-right) → <b>rotate left</b> at grandparent ' + gg2.k + ' and swap colours: the middle key ' + x.p.k + ' becomes the black top of this little subtree.', x.p.k);
        }
      }
    }
    if (t.root.red) { t.root.red = false; log('Rule: the <b>root is always black</b>. Recolour root ' + t.root.k + ' black (this adds one black node to every path equally, so it is always safe).', t.root.k); }
    return true;
  }
  function rbBlackHeight(n) { if (!n) return 1; var l = rbBlackHeight(n.l); return l + (n.red ? 0 : 1); }
  function rbHeight(n) { return n ? 1 + Math.max(rbHeight(n.l), rbHeight(n.r)) : 0; }

  /* =====================================================================
     TOPIC 1 — ArrayList growth
     ===================================================================== */
  topics.push({
    title: 'ArrayList Internals: the Growing Array, Shifting & modCount',
    analogy: `<p>Think of an <b>egg carton</b>. You buy a carton with 10 slots. Eggs go in one after another — easy. When the carton is full and one more egg arrives, you cannot stretch the cardboard. You buy a <b>bigger carton (about 1.5× bigger)</b>, move every egg across, and throw the old carton away. Moving eggs is slow, but it happens rarely, so on average adding an egg still feels instant. Taking an egg out of the <i>middle</i> is the annoying part: every egg after it must slide one slot left so there is no gap.</p>`,
    explain: `<p>An <code>ArrayList</code> is just <b>a plain Java array plus a counter</b>. Inside it there are two fields that matter:</p>
      <ul>
        <li><code>Object[] elementData</code> — the real array (the "carton"). Its length is the <b>capacity</b>.</li>
        <li><code>int size</code> — how many slots are actually used. Always <code>size ≤ capacity</code>.</li>
      </ul>
      ${H.arr(['A', 'B', 'C', 'D', '·', '·', '·', '·', '·', '·'], { label: 'elementData (capacity 10), size = 4', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g' } })}
      <p><b>Lazy start:</b> <code>new ArrayList&lt;&gt;()</code> does <i>not</i> allocate 10 slots. It points at a shared empty array. The first <code>add</code> creates a real array of <b>10</b>.</p>
      <p><b>Growing:</b> when <code>size == capacity</code> and you add, <code>grow()</code> makes a new array of <code>old + (old &gt;&gt; 1)</code> — that is <b>1.5×</b> — and copies everything over with <code>Arrays.copyOf</code>. So capacities go:</p>
      ${H.table(['grow #', 'old capacity', 'old >> 1', 'new capacity'], [['1st add', '0', '-', '10'], ['1', '10', '5', '15'], ['2', '15', '7', '22'], ['3', '22', '11', '33'], ['4', '33', '16', '49'], ['5', '49', '24', '73']])}
      <p><b>Cost of each operation:</b></p>
      ${H.table(['operation', 'cost', 'why'], [['get(i) / set(i, x)', H.c('g', 'O(1)'), 'array index → direct jump to the slot'], ['add(x) at end', H.c('g', 'O(1) amortized'), 'usually one write; a rare O(n) copy when full'], ['add(i, x) / remove(i)', H.c('r', 'O(n − i)'), 'everything after i slides by one (System.arraycopy)'], ['contains(x) / indexOf(x)', H.c('r', 'O(n)'), 'linear scan calling equals()'], ['remove at end', H.c('g', 'O(1)'), 'nothing to slide']])}
      <p><b>modCount</b> is a counter bumped on every <i>structural</i> change (add, remove, clear — not <code>set</code>). Iterators remember the value when they start; if it changes under them, the next <code>next()</code> throws <code>ConcurrentModificationException</code>. That is the "fail-fast" behaviour.</p>`,
    clues: ['"amortized O(1) append" or "why is add() O(1) if it sometimes copies?"', '"random access by index" / "get the i-th element fast" → array-backed list', '"we know the size up front" → <code>new ArrayList&lt;&gt;(n)</code> or <code>ensureCapacity</code>', '"remove from the front repeatedly" → ArrayList is O(n) per removal; use <code>ArrayDeque</code>', '"ConcurrentModificationException in a for-each" → modCount / fail-fast iterator', '"memory footprint of a list of a million ints" → boxing + reference array overhead'],
    code: [`
import java.util.Arrays;
import java.util.ConcurrentModificationException;
import java.util.Iterator;
import java.util.NoSuchElementException;
import java.util.Objects;

/** A cut-down copy of how java.util.ArrayList really works in JDK 21. */
class MyArrayList<E> implements Iterable<E> {
    private static final int DEFAULT_CAPACITY = 10;
    // Shared marker array: "created with no-arg constructor, not allocated yet"
    private static final Object[] DEFAULTCAPACITY_EMPTY = {};

    private Object[] elementData;   // the real storage; length == capacity
    private int size;               // slots actually in use
    private int modCount;           // bumped on every structural change

    MyArrayList() { elementData = DEFAULTCAPACITY_EMPTY; }      // lazy: no 10-slot array yet

    MyArrayList(int initialCapacity) {
        if (initialCapacity < 0) throw new IllegalArgumentException("Illegal Capacity: " + initialCapacity);
        elementData = new Object[initialCapacity];
    }

    public boolean add(E e) {
        modCount++;                                           // structural change
        if (size == elementData.length) elementData = grow(size + 1);
        elementData[size++] = e;                              // the cheap, common path
        return true;
    }

    private Object[] grow(int minCapacity) {
        int old = elementData.length;
        if (old > 0 || elementData != DEFAULTCAPACITY_EMPTY) {
            // preferred growth = old >> 1 (50%), but never less than what is needed
            int newCap = old + Math.max(minCapacity - old, old >> 1);
            if (newCap < 0) throw new OutOfMemoryError("Required array length too large");
            return Arrays.copyOf(elementData, newCap);        // O(size) copy
        }
        return new Object[Math.max(DEFAULT_CAPACITY, minCapacity)]; // first real allocation: 10
    }

    @SuppressWarnings("unchecked")
    public E get(int index) {
        Objects.checkIndex(index, size);                      // IndexOutOfBoundsException if bad
        return (E) elementData[index];                        // O(1) direct jump
    }

    public E remove(int index) {
        Objects.checkIndex(index, size);
        @SuppressWarnings("unchecked") E old = (E) elementData[index];
        modCount++;
        int moved = size - index - 1;
        if (moved > 0) System.arraycopy(elementData, index + 1, elementData, index, moved); // slide left
        elementData[--size] = null;                           // clear last slot so GC can reclaim it
        return old;
    }

    public int size() { return size; }
    public int capacity() { return elementData.length; }

    public void trimToSize() {
        modCount++;
        if (size < elementData.length) elementData = Arrays.copyOf(elementData, size);
    }

    @Override
    public Iterator<E> iterator() {
        return new Iterator<E>() {
            int cursor;
            final int expectedModCount = modCount;            // snapshot at creation
            public boolean hasNext() { return cursor != size; }
            @SuppressWarnings("unchecked")
            public E next() {
                if (modCount != expectedModCount) throw new ConcurrentModificationException();
                if (cursor >= size) throw new NoSuchElementException();
                return (E) elementData[cursor++];
            }
        };
    }

    public static void main(String[] args) {
        MyArrayList<Integer> list = new MyArrayList<>();
        int lastCap = -1;
        for (int i = 0; i < 80; i++) {
            list.add(i);
            if (list.capacity() != lastCap) {
                lastCap = list.capacity();
                System.out.println("size=" + list.size() + " -> capacity=" + lastCap);
            }
        }
        // prints capacity 10, 15, 22, 33, 49, 73, 109
    }
}`],
    codeTitle: ['MyArrayList — the real growth, shift and modCount logic'],
    viz: {
      title: 'Watch the backing array grow 1.5× and elements shift',
      input: '16',
      inputLabel: 'N [initialCapacity] — e.g. "16" (no-arg constructor), "14 0", "12 4"',
      gen: function (input) {
        var t = clean(input).split(/[\s,]+/).filter(function (x) { return x.length; }).map(Number);
        if (!t.length || t.length > 2 || t.some(function (x) { return isNaN(x) || x !== Math.floor(x); })) throw new Error('Format: N [initialCapacity], e.g. "16" or "12 4"');
        var n = t[0], init = t.length > 1 ? t[1] : -1;
        if (n < 1 || n > 30) throw new Error('N must be between 1 and 30');
        if (t.length > 1 && (init < 0 || init > 20)) throw new Error('initialCapacity must be between 0 and 20');
        var lazy = init < 0, cap = lazy ? 0 : init, data = [], size = 0, mod = 0, copies = 0, costs = [], frames = [];
        function view() { var v = []; for (var i = 0; i < cap; i++) v.push(i < size ? data[i] : '·'); return v; }
        function vars(h) {
          var avg = costs.length ? (costs.reduce(function (a, b) { return a + b; }, 0) / costs.length).toFixed(2) : '-';
          return { type: 'vars', label: 'ArrayList fields', vals: { size: size, capacity: cap, modCount: mod, 'elements copied so far': copies, 'avg work per add': avg }, hl: h || {} };
        }
        function barsPart() { return { type: 'bars', label: 'work done by each add (1 = write, spike = full copy)', values: costs.slice(), idxLabels: costs.map(function (_, i) { return 'add' + (i + 1); }) }; }
        frames.push({ narr: lazy ? '<code>new ArrayList&lt;&gt;()</code> — no real array yet. <code>elementData</code> points at a shared empty array; capacity is <b>0</b>. The 10-slot array is created lazily on the first add.' : '<code>new ArrayList&lt;&gt;(' + init + ')</code> — an array of exactly <b>' + init + '</b> slots is allocated right now.', parts: [cap ? { type: 'array', label: 'elementData', values: view() } : note('elementData = {} (empty, length 0)', 'elementData'), vars()] });
        for (var k = 0; k < n; k++) {
          var val = (k + 1) * 10, cost = 1;
          if (size === cap) {
            var minCap = size + 1, newCap = (cap === 0 && lazy) ? Math.max(10, minCap) : cap + Math.max(minCap - cap, cap >> 1);
            if (cap > 0) {
              var full = {}; for (var f = 0; f < cap; f++) full[f] = 'bad';
              frames.push({ narr: 'add(' + val + '): size == capacity == <b>' + cap + '</b>. No free slot! <code>grow(' + minCap + ')</code> computes ' + cap + ' + max(' + (minCap - cap) + ', ' + cap + ' &gt;&gt; 1 = ' + (cap >> 1) + ') = <b>' + newCap + '</b>.', parts: [{ type: 'array', label: 'old elementData (full)', values: view(), hl: full }, vars({ capacity: 'bad' })] });
            }
            var oldSize = size;
            copies += oldSize; cost += oldSize;
            cap = newCap; lazy = false;
            var cp = {}; for (var c = 0; c < oldSize; c++) cp[c] = 'ok';
            frames.push({ narr: oldSize ? '<code>Arrays.copyOf</code> makes a fresh array of <b>' + cap + '</b> slots and copies all <b>' + oldSize + '</b> elements (green). The old array becomes garbage. This copy is the rare expensive step.' : 'First real allocation: <code>new Object[' + cap + ']</code>' + (cap === 10 ? ' — the famous default capacity 10.' : '.'), parts: [{ type: 'array', label: 'new elementData', values: view(), hl: cp }, vars({ capacity: 'ok', 'elements copied so far': oldSize ? 'cur' : '' })] });
          }
          data[size++] = val; mod++; costs.push(cost);
          frames.push({ narr: 'add(' + val + ') → <code>elementData[' + (size - 1) + '] = ' + val + '</code>, size becomes ' + size + ', modCount ' + mod + '. ' + (cost > 1 ? 'This add paid for a copy of ' + (cost - 1) + ' elements.' : 'Just one write — O(1).'), parts: [{ type: 'array', label: 'elementData', values: view(), hl: one(size - 1, 'cur'), ptr: one(size - 1, 'size-1') }, barsPart(), vars({ size: 'cur', modCount: 'cur' })] });
        }
        if (size >= 2) {
          var before = view(), sh = {};
          frames.push({ narr: 'Now <code>remove(0)</code>: the element at index 0 must go, but arrays cannot have holes…', parts: [{ type: 'array', label: 'elementData', values: before, hl: one(0, 'bad') }, vars()] });
          data.splice(0, 1); data.push(undefined); size--; mod++;
          for (var s = 0; s < size; s++) sh[s] = 'win';
          frames.push({ narr: '<code>System.arraycopy(elementData, 1, elementData, 0, ' + size + ')</code> slides <b>' + size + '</b> elements one step left (blue). That is why remove(0) is <b>O(n)</b>. Then <code>elementData[--size] = null</code> clears the stale last slot so the GC can reclaim the object.', parts: [{ type: 'array', label: 'elementData after remove(0)', values: view(), hl: sh }, vars({ size: 'cur', modCount: 'cur' })] });
          var oldCap = cap; cap = size; mod++;
          frames.push({ narr: '<code>trimToSize()</code> shrinks capacity from ' + oldCap + ' to exactly ' + size + ' (one more copy). ArrayList never shrinks on its own — only when you ask.', parts: [{ type: 'array', label: 'elementData after trimToSize()', values: view() }, vars({ capacity: 'ok' })] });
        }
        frames.push({ narr: 'Total: <b>' + n + '</b> adds caused <b>' + copies + '</b> element copies → about ' + (copies / n).toFixed(2) + ' extra copies per add. Because capacity grows geometrically (×1.5), the copies form a shrinking series and the average stays a small constant: <b>amortized O(1)</b>.', parts: [barsPart(), vars()] });
        return frames;
      }
    },
    examples: [
      { title: 'The capacity ladder and the real copy bill', html: `<p>Add 100 elements to <code>new ArrayList&lt;&gt;()</code>. Grows happen when size hits 10, 15, 22, 33, 49 and 73:</p>
        ${H.table(['size when full', 'new capacity', 'elements copied'], [['0', '10', '0'], ['10', '15', '10'], ['15', '22', '15'], ['22', '33', '22'], ['33', '49', '33'], ['49', '73', '49'], ['73', '109', '73']])}
        <p>Total copies = 10+15+22+33+49+73 = <b>202</b> for 100 adds → about <b>2 copies per add</b>, a constant. With growth factor 1.5 the bound is ≤ 3 copies per add in the worst case: amortized O(1).</p>` },
      { title: 'Pre-sizing removes every copy', html: `<p>If you know you will add 1,000,000 items, <code>new ArrayList&lt;&gt;(1_000_000)</code> allocates once and never copies. With the default constructor you would grow about 29 times and copy roughly 2 million references in total. <code>ensureCapacity(n)</code> does the same for an existing list.</p>`, code: `List<Integer> ids = new ArrayList<>(1_000_000);   // one allocation, zero grows
for (int i = 0; i < 1_000_000; i++) ids.add(i);
List<String> names = new ArrayList<>();
((ArrayList<String>) names).ensureCapacity(500);   // grow once, up front
System.out.println(ids.size() + " " + names.size()); // 1000000 0` },
      { title: 'remove(0) in a loop is secretly O(n²)', html: `<p>Each <code>remove(0)</code> slides every remaining element left. Draining 100,000 items this way moves about 5 billion references. Use <code>removeIf</code> (one compacting pass, O(n)), remove from the <b>end</b>, or switch to <code>ArrayDeque</code> for queue behaviour.</p>`, code: `List<Integer> list = new ArrayList<>();
for (int i = 0; i < 100_000; i++) list.add(i);
// BAD:  while (!list.isEmpty()) list.remove(0);   -> O(n^2)
list.removeIf(x -> x % 2 == 0);                    // GOOD: single O(n) pass
System.out.println(list.size());                   // 50000
Deque<Integer> queue = new ArrayDeque<>(list);     // O(1) removal at the front
System.out.println(queue.pollFirst());             // 1` },
      { title: 'Predict the output: remove(int) vs remove(Object)', html: `<p><code>List&lt;Integer&gt;</code> has two <code>remove</code> methods. <code>remove(1)</code> picks the <b>int index</b> overload (exact primitive match beats boxing), so it removes the element at index 1, not the value 1.</p>
        ${H.arr([10, 20, 30], { label: 'before', hl: { 1: 'r' } })}${H.arr([10, 30], { label: 'after remove(1)' })}`, code: `List<Integer> nums = new ArrayList<>(List.of(10, 20, 30));
nums.remove(1);                     // index 1 -> removes 20
System.out.println(nums);           // [10, 30]
nums.remove(Integer.valueOf(10));   // the Object overload -> removes value 10
System.out.println(nums);           // [30]` },
      { title: 'new ArrayList<>(0) grows painfully slowly at first', html: `<p>With an explicit capacity of 0 there is no "jump to 10" rule — growth is <code>old + max(1, old &gt;&gt; 1)</code>: 0 → 1 → 2 → 3 → 4 → 6 → 9 → 13 → 19 → 28. Seven copies just to hold 10 items. Only pass 0 if the list will most likely stay empty.</p>` }
    ],
    deepDive: `<p><b>Amortized proof.</b> Let the final size be N. Grows copy c, 1.5c, 1.5²c … up to N elements. That geometric series sums to at most N · 1/(1 − 1/1.5) = <b>3N</b>, so N adds cost O(N) total → O(1) each on average. With doubling it would be ≤ 2N. Any constant factor &gt; 1 works; adding a <i>fixed</i> amount (+10 each time) would make it O(N²).</p>
      <p><b>Why 1.5 and not 2?</b> Smaller factor wastes less memory (at most ~33% slack instead of 50%) and, in theory, lets freed old blocks be reused for later arrays (with a factor below the golden ratio ≈1.618 the sum of old blocks can eventually fit the next request). In the JVM, with a moving GC, the second argument barely matters; the memory slack does.</p>
      <p><b>Real JDK 21 code.</b> <code>grow()</code> calls <code>ArraysSupport.newLength(oldLength, minGrowth, prefGrowth)</code>, which returns <code>old + max(minGrowth, prefGrowth)</code> and caps at <code>SOFT_MAX_ARRAY_LENGTH = Integer.MAX_VALUE − 8</code> (some VMs reserve header words). Past that it tries the exact needed size, and beyond <code>Integer.MAX_VALUE</code> it throws <code>OutOfMemoryError: Required array length too large</code>. <code>addAll</code> grows straight to the needed size in one copy.</p>
      <p><b>Memory reality.</b> With compressed oops each slot is a 4-byte reference, and each boxed <code>Integer</code> is a separate ~16-byte object. A million-element <code>ArrayList&lt;Integer&gt;</code> therefore costs ~20 MB, versus 4 MB for an <code>int[]</code> — and the boxes are scattered, so iteration has worse cache locality. For hot numeric paths use primitive arrays or a primitive collection library.</p>
      <p><b>Fail-fast is best-effort.</b> <code>hasNext()</code> only checks <code>cursor != size</code>; the modCount check is in <code>next()</code>. So removing the second-to-last element inside a for-each finishes silently (size shrinks to cursor) — a famous trick question. Never use CME for correctness; it is a bug detector. <code>subList</code> is a <b>view</b> sharing the parent's array and tracks the parent's modCount, so structurally changing the parent invalidates it.</p>
      <p><b>Serialization and friends.</b> <code>elementData</code> is <code>transient</code>; a custom <code>writeObject</code> writes only <code>size</code> elements, not empty slots. <code>Vector</code> is the legacy synchronized cousin that doubles by default. <code>Arrays.asList</code> is a fixed-size view over your array (add throws <code>UnsupportedOperationException</code>), and <code>List.of</code> is a compact immutable list. Java 21 adds <code>getFirst()</code>, <code>getLast()</code>, <code>reversed()</code> (SequencedCollection) — <code>addFirst</code> on an ArrayList is still an O(n) shift.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants happily write <code>list.remove(0)</code> inside loops, build lists without pre-sizing in hot code, and wrap everything as <code>List&lt;Integer&gt;</code>. Those patterns pass tests on 100 items and melt at 10 million. Reviewing for <i>hidden O(n) inside O(n)</i> is now a core human skill.</p>
      <p><b>Use AI as a partner:</b> ask <code>List every operation in this method that is O(n) on an ArrayList and could be O(1) with a different structure</code>, or <code>Write a JMH benchmark comparing pre-sized vs default ArrayList for 10^6 adds</code>. Then run the benchmark yourself — AI-quoted numbers are often invented.</p>
      <p><b>Where AI goes wrong:</b> it often claims capacity "doubles" (that is Vector or C++ vectors in some libraries), that the default constructor allocates 10 slots immediately (it is lazy since Java 7u40/8), or that fail-fast iteration is guaranteed. <b>What you must own:</b> the amortized argument, the shift cost, and knowing when ArrayDeque or a primitive array is the right answer.</p>`,
    problems: [{
      title: 'Build a Growable IntList (no boxing)', level: 'Easy', tags: ['dynamic array', 'amortized analysis', 'design'], companies: ['Amazon', 'Google', 'Bloomberg'],
      statement: `<p>Implement <code>IntList</code>, a dynamic array of primitive <code>int</code> values with: <code>add(int x)</code> (append), <code>get(int i)</code>, <code>removeAt(int i)</code> (returns the removed value and keeps elements contiguous), <code>size()</code> and <code>capacity()</code>. Start lazily with capacity 0, jump to <b>10</b> on the first add, then grow like ArrayList: <code>old + (old &gt;&gt; 1)</code>. Invalid indexes must throw <code>IndexOutOfBoundsException</code>.</p>`,
      constraints: `Up to 10<sup>6</sup> operations. add must be amortized O(1); get O(1).`,
      example: `<p>add 1..11 → after the 10th add capacity is ${H.c('g', '10')}, the 11th add triggers a grow to ${H.c('b', '15')}. removeAt(0) returns ${H.c('y', '1')} and get(0) is now 2 because everything slid left.</p>`,
      brute: { why: `<p>Growing by exactly one slot each time (<code>Arrays.copyOf(a, size + 1)</code>) copies 1 + 2 + … + n ≈ n²/2 elements. For 10<sup>6</sup> adds that is 5·10<sup>11</sup> copies — far too slow. The wasted work is re-copying the same early elements over and over.</p>`, code: `class SlowIntList {
    private int[] a = new int[0];
    void add(int x) {
        a = java.util.Arrays.copyOf(a, a.length + 1);   // copy EVERYTHING on EVERY add -> O(n) each
        a[a.length - 1] = x;
    }
    int get(int i) { return a[i]; }
    int size() { return a.length; }
}` },
      mcq: { q: 'Why does growing by a constant factor (×1.5) make add() O(1) amortized but growing by +10 does not?', options: ['Geometric growth makes total copies a convergent series ≤ c·N; fixed growth makes copies ~N²/20', 'Because ×1.5 uses less memory', 'Because System.arraycopy is O(1)', 'It does not; both are O(1)'], answer: 0, explain: 'With +10, a grow happens every 10 adds and each copies up to N elements → N/10 · N/2 = O(N²) total. With ×1.5 the copy sizes shrink geometrically going backwards, so the total is linear.' },
      hints: [`<p>Hint 1: keep an <code>int[] data</code> and an <code>int size</code>. Capacity is just <code>data.length</code>; free space is the tail of the array.</p>`, `<p>Hint 2: only grow when <code>size == data.length</code>. New length = data.length == 0 ? 10 : data.length + (data.length &gt;&gt; 1). Copy with <code>Arrays.copyOf</code>.</p>`, `<p>Hint 3: for removeAt(i) validate with <code>Objects.checkIndex(i, size)</code>, save <code>data[i]</code>, then <code>System.arraycopy(data, i + 1, data, i, size - i - 1)</code> and <code>size--</code>. No need to null out ints (no GC references).</p>`],
      solution: {
        approach: `<p>Mirror ArrayList but with an <code>int[]</code>: lazy allocation, 1.5× geometric growth, arraycopy-based removal. Primitives mean 4 bytes per element and no boxing allocations.</p>`,
        code: `import java.util.Arrays;
import java.util.Objects;

class IntList {
    private int[] data = new int[0];   // capacity 0 until first add
    private int size;

    public void add(int x) {
        if (size == data.length) {
            int newCap = data.length == 0 ? 10 : data.length + (data.length >> 1);
            data = Arrays.copyOf(data, newCap);   // rare O(n) copy
        }
        data[size++] = x;                         // common O(1) write
    }

    public int get(int i) {
        Objects.checkIndex(i, size);              // throws IndexOutOfBoundsException
        return data[i];
    }

    public int removeAt(int i) {
        Objects.checkIndex(i, size);
        int old = data[i];
        System.arraycopy(data, i + 1, data, i, size - i - 1);  // slide the tail left
        size--;
        return old;
    }

    public int size() { return size; }
    public int capacity() { return data.length; }

    public static void main(String[] args) {
        IntList l = new IntList();
        for (int v = 1; v <= 11; v++) l.add(v);
        System.out.println(l.size() + " " + l.capacity());   // 11 15
        System.out.println(l.removeAt(0) + " " + l.get(0));   // 1 2
    }
}`,
        alt: [{ lang: 'python', code: `class IntList:
    def __init__(self):
        self.data, self.size = [], 0
    def add(self, x):
        if self.size == len(self.data):
            cap = 10 if not self.data else len(self.data) + (len(self.data) >> 1)
            self.data = self.data + [0] * (cap - len(self.data))
        self.data[self.size] = x
        self.size += 1
    def get(self, i):
        if not 0 <= i < self.size:
            raise IndexError(i)
        return self.data[i]

l = IntList()
for v in range(1, 12):
    l.add(v)
print(l.size, len(l.data))` }],
        dry: { head: ['operation', 'size before', 'capacity before', 'action', 'capacity after'], rows: [['add(1)', '0', '0', 'lazy alloc → new int[10]', '10'], ['add(2..10)', '1..9', '10', 'plain writes', '10'], ['add(11)', '10', '10', H.c('r', 'full → copyOf to 15'), '15'], ['removeAt(0)', '11', '15', 'arraycopy 10 elements left', '15'], ['get(0)', '10', '15', 'returns 2', '15']] },
        complexity: `<p>add: O(1) amortized (≤ 3 copies per element overall). get: O(1). removeAt(i): O(size − i). Space: O(capacity) ≤ 1.5 × size + 10.</p>`,
        followUps: ['Add a shrink policy (halve when size ≤ capacity/4) — why not shrink at capacity/2?', 'Make it Iterable with a fail-fast iterator using a modCount field']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — HashMap: hashing, buckets, put/get
     ===================================================================== */
  topics.push({
    title: 'HashMap Internals I: hashCode → Spread → Bucket → Chain',
    analogy: `<p>Picture a <b>coat check with 16 numbered hooks</b>. When you hand over your coat, the attendant does a quick calculation on your ticket name to pick a hook number — no searching the whole room. If two people land on the same hook, coats just hang one behind the other on that hook (a <b>chain</b>). To get your coat back, the attendant does the same calculation, walks straight to that hook, and checks the few coats there by name. When the room gets about <b>¾ full</b>, the attendant moves to a room with twice as many hooks so chains stay short.</p>`,
    explain: `<p>A <code>HashMap</code> is an <b>array of buckets</b> called <code>table</code>. Each bucket holds a small linked list of <code>Node</code> objects: <code>{ hash, key, value, next }</code>.</p>
      <p><b>Step 1 — hashCode:</b> call <code>key.hashCode()</code> → a 32-bit int. For <code>"apple"</code> that is 93029210.</p>
      <p><b>Step 2 — spread:</b> <code>hash = h ^ (h &gt;&gt;&gt; 16)</code>. This folds the top 16 bits into the bottom 16. Why? Because the next step only looks at the <i>low</i> bits, and many hashCodes differ only in their high bits.</p>
      <p><b>Step 3 — bucket index:</b> <code>index = (n − 1) &amp; hash</code> where n = table length. n is always a <b>power of two</b>, so <code>n − 1</code> is a mask of ones (15 = 1111₂) and the AND keeps just the low 4 bits — a super-fast version of <code>hash % n</code> that is never negative.</p>
      ${H.bits(0b1111, 8, { label: 'n − 1 = 15 (mask)', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g' } })}
      <p><b>Step 4 — walk the chain:</b> compare each node with <code>node.hash == hash &amp;&amp; (node.key == key || key.equals(node.key))</code>. The cheap int compare filters almost everything; <code>equals</code> runs only on real candidates.</p>
      ${H.table(['operation', 'average', 'worst (Java 8+)'], [['get / put / remove / containsKey', H.c('g', 'O(1)'), 'O(log n) in a treeified bucket'], ['containsValue', H.c('r', 'O(n)'), 'scans every bucket'], ['iteration', 'O(n + capacity)', 'walks empty buckets too']])}
      <p><b>Key defaults:</b> capacity 16, load factor 0.75, so the first resize happens when size goes past <b>threshold = 12</b>. The table itself is created lazily on the first put. One <code>null</code> key is allowed (its hash is 0 → bucket 0), and values may be null.</p>`,
    clues: ['"O(1) lookup by key" / "have I seen this before?" → hashing', '"design a hash map without built-in libraries" (LeetCode 706) → array of buckets + chaining', '"why must I override hashCode when I override equals?" → bucket selection uses hashCode, match uses equals', '"why is capacity a power of two?" → index = hash &amp; (n − 1)', '"two different strings, same hashCode" ("Aa" vs "BB") → collisions are normal; equals decides', '"key changed after insertion and now get() returns null" → mutable key in the wrong bucket'],
    code: [`
import java.util.Objects;

/** Educational HashMap: same hashing, indexing, chaining and resize rules as java.util.HashMap (minus treeification). */
class MiniHashMap<K, V> {
    static final class Node<K, V> {
        final int hash; final K key; V value; Node<K, V> next;
        Node(int hash, K key, V value, Node<K, V> next) { this.hash = hash; this.key = key; this.value = value; this.next = next; }
    }

    private Node<K, V>[] table;              // created lazily
    private int size, threshold;
    private static final float LOAD_FACTOR = 0.75f;

    /** Same as HashMap.hash(): spread high bits into low bits. null key -> 0. */
    static int hash(Object key) {
        int h;
        return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
    }

    public V get(K key) {
        if (table == null) return null;
        int h = hash(key);
        for (Node<K, V> e = table[(table.length - 1) & h]; e != null; e = e.next)
            if (e.hash == h && Objects.equals(e.key, key)) return e.value;  // cheap int check first
        return null;
    }

    public V put(K key, V value) {
        if (table == null) resize();                         // lazy first allocation (16)
        int h = hash(key), i = (table.length - 1) & h;
        Node<K, V> p = table[i];
        if (p == null) table[i] = new Node<>(h, key, value, null);
        else {
            while (true) {
                if (p.hash == h && Objects.equals(p.key, key)) { V old = p.value; p.value = value; return old; } // replace
                if (p.next == null) { p.next = new Node<>(h, key, value, null); break; }               // append at TAIL
                p = p.next;
            }
        }
        if (++size > threshold) resize();
        return null;
    }

    @SuppressWarnings("unchecked")
    private void resize() {
        Node<K, V>[] old = table;
        int oldCap = old == null ? 0 : old.length, newCap = oldCap == 0 ? 16 : oldCap << 1;
        Node<K, V>[] nt = (Node<K, V>[]) new Node[newCap];
        for (int j = 0; j < oldCap; j++) {
            Node<K, V> loH = null, loT = null, hiH = null, hiT = null;
            for (Node<K, V> e = old[j], next; e != null; e = next) {
                next = e.next; e.next = null;
                if ((e.hash & oldCap) == 0) { if (loT == null) loH = e; else loT.next = e; loT = e; } // stays at j
                else                        { if (hiT == null) hiH = e; else hiT.next = e; hiT = e; } // moves to j+oldCap
            }
            nt[j] = loH; nt[j + oldCap] = hiH;
        }
        table = nt;
        threshold = (int) (newCap * LOAD_FACTOR);
    }

    public int size() { return size; }

    public static void main(String[] args) {
        MiniHashMap<String, Integer> m = new MiniHashMap<>();
        String[] words = {"apple", "banana", "cherry", "date", "Aa", "BB"};
        for (int i = 0; i < words.length; i++) m.put(words[i], i);
        System.out.println(m.get("cherry") + " " + m.get("BB") + " " + m.get("zzz")); // 2 5 null
        int h = hash("apple");
        System.out.println("apple -> hashCode " + "apple".hashCode() + ", spread " + h + ", bucket " + (h & 15));
    }
}`],
    codeTitle: ['MiniHashMap — hash spreading, (n-1) & hash indexing, tail-append chaining, lo/hi resize'],
    viz: {
      title: 'HashMap.put step by step (real Java String hashes)',
      input: '4 | apple banana cherry date elder fig grape kiwi',
      inputLabel: 'initialCapacity | words (max 16 words, letters/digits)',
      gen: function (input) {
        var s = clean(input), cap = 16, words;
        if (s.indexOf('|') >= 0) {
          var parts = s.split('|'); cap = Number(parts[0].trim()); s = parts.slice(1).join('|');
          if (isNaN(cap) || cap < 1 || cap > 16 || cap !== Math.floor(cap)) throw new Error('initialCapacity must be 1..16, e.g. "4 | apple banana"');
          var c = 1; while (c < cap) c <<= 1; cap = c;          /* tableSizeFor: round up to a power of two */
        }
        words = s.split(/[\s,]+/).filter(function (x) { return x.length; });
        if (!words.length || words.length > 16 || words.some(function (w) { return !/^[A-Za-z0-9]{1,10}$/.test(w); })) throw new Error('Give 1..16 words of letters/digits, e.g. "4 | apple banana cherry"');
        var buckets = [], frames = [], size = 0, thr = Math.floor(cap * 0.75);
        for (var b = 0; b < cap; b++) buckets.push([]);
        function grid(hl, label) { var rows = bucketRows(buckets, 2); return { type: 'grid', label: label || ('table[' + cap + '] — each row is a bucket, cells are the chain'), rowHead: range(cap), colHead: colHeads(rows), rows: rows, hl: hl || {} }; }
        function vars(h) { return { type: 'vars', label: 'HashMap fields', vals: { 'table.length': cap, size: size, threshold: thr, loadFactor: 0.75 }, hl: h || {} }; }
        frames.push({ narr: 'Empty map, table length <b>' + cap + '</b> (power of two), threshold = ' + cap + ' × 0.75 = <b>' + thr + '</b>. Each row below is one bucket.', parts: [grid(), vars()] });
        words.forEach(function (w, wi) {
          var h = jHash(w), sp = spread(h), mask = cap - 1, idx = (sp & mask) >>> 0, lb = {}, bitsN = Math.round(Math.log2(cap));
          for (var q = 0; q < bitsN; q++) lb[q] = 'cur';
          frames.push({ narr: 'put("' + w + '", ' + wi + '): <code>"' + w + '".hashCode()</code> = <b>' + h + '</b>. Spread it: <code>h ^ (h &gt;&gt;&gt; 16)</code> = ' + sp + '. Keep the low ' + bitsN + ' bit(s) with <code>&amp; ' + mask + '</code> → bucket <b>' + idx + '</b> (' + (bitsN ? low(sp, bitsN) : '0') + '₂).', parts: [
            { type: 'bits', label: 'hashCode', value: h, width: 32, dec: h },
            { type: 'bits', label: 'h >>> 16', value: h >>> 16, width: 32, dec: h >>> 16 },
            { type: 'bits', label: 'spread hash (only the amber low bits pick the bucket)', value: sp, width: 32, hl: lb, dec: sp },
            vars()] });
          var chain = buckets[idx], found = -1;
          for (var k = 0; k < chain.length; k++) if (chain[k] === w) found = k;
          var hl = {};
          if (found >= 0) {
            for (var k2 = 0; k2 < found; k2++) hl[idx + ',' + k2] = 'done';
            hl[idx + ',' + found] = 'sel';
            frames.push({ narr: 'Walk bucket ' + idx + ': found a node with the same hash and <code>equals</code> → <b>replace the value</b>. Size does not change.', parts: [grid(hl), vars()] });
            return;
          }
          for (var k3 = 0; k3 < chain.length; k3++) hl[idx + ',' + k3] = 'cur';
          chain.push(w); size++;
          hl[idx + ',' + (chain.length - 1)] = 'ok';
          frames.push({ narr: chain.length === 1 ? 'Bucket ' + idx + ' was empty → <code>table[' + idx + '] = new Node(hash, "' + w + '", ' + wi + ', null)</code>. size = ' + size + '.' : '<b>Collision!</b> Bucket ' + idx + ' already has ' + (chain.length - 1) + ' node(s) (amber). Java compares <code>hash</code> then <code>equals</code> with each one; no match, so the new node is <b>appended at the tail</b> (Java 8+). size = ' + size + '.', parts: [grid(hl), vars({ size: 'cur' })] });
          if (size > thr) {
            var oldCap = cap, old = buckets, moved = {};
            frames.push({ narr: '<b>size ' + size + ' &gt; threshold ' + thr + '</b> → <code>resize()</code>: double the table to ' + (oldCap * 2) + '. No hashCode is recomputed — every node already stores its hash.', parts: [grid({}, 'old table[' + oldCap + ']'), vars({ size: 'bad', threshold: 'bad' })] });
            cap = oldCap * 2; thr = Math.floor(cap * 0.75); buckets = [];
            for (var b2 = 0; b2 < cap; b2++) buckets.push([]);
            old.forEach(function (ch, j) {
              ch.forEach(function (key) {
                var nb = (spread(jHash(key)) & oldCap) ? j + oldCap : j;
                buckets[nb].push(key);
                moved[nb + ',' + (buckets[nb].length - 1)] = nb === j ? 'ok' : 'win';
              });
            });
            frames.push({ narr: 'Each node either <span class="c-g">stays at index j</span> (green) or <span class="c-b">moves to j + ' + oldCap + '</span> (blue), decided by one bit: <code>hash &amp; ' + oldCap + '</code>. Chains keep their relative order. New threshold = <b>' + thr + '</b>.', parts: [grid(moved), vars({ 'table.length': 'ok', threshold: 'ok' })] });
          }
        });
        var order = [];
        buckets.forEach(function (ch) { ch.forEach(function (k) { order.push(k); }); });
        frames.push({ narr: 'Iteration walks buckets 0 → ' + (cap - 1) + ' and each chain front to back. That is why HashMap order looks "random" and can change after a resize — never rely on it (use LinkedHashMap for insertion order).', parts: [grid(), { type: 'text', label: 'System.out.println(map.keySet())', html: '<code>[' + order.join(', ') + ']</code>' }] });
        return frames;
      }
    },
    examples: [
      { title: '"Aa" and "BB" collide on purpose', html: `<p>String hashCode is <code>s[0]·31 + s[1]</code> for two letters. "Aa" = 65·31 + 97 = <b>2112</b>. "BB" = 66·31 + 66 = <b>2112</b>. Same hash → same bucket → same chain. HashMap still works: <code>equals</code> tells them apart. Because the pair is interchangeable, "AaAa", "AaBB", "BBAa", "BBBB" all collide too — 2<sup>k</sup> colliding strings of length 2k. That is how hash-flooding attacks are built.</p>`, code: `System.out.println("Aa".hashCode() + " " + "BB".hashCode());     // 2112 2112
Map<String, Integer> m = new HashMap<>();
m.put("Aa", 1); m.put("BB", 2);
System.out.println(m.get("Aa") + " " + m.get("BB") + " " + m.size()); // 1 2 2` },
      { title: 'Why the spread step exists', html: `<p>Integer keys 0, 65536, 131072, 196608 have hashCodes equal to themselves. Their low 16 bits are all zero, so <code>&amp; 15</code> would put <b>all of them in bucket 0</b>. After spreading, 65536 ^ (65536 &gt;&gt;&gt; 16) = 65537 → bucket 1, 131072 → bucket 2, 196608 → bucket 3. One XOR rescues keys that differ only in high bits.</p>
        ${H.table(['key', 'hashCode & 15', 'spread & 15'], [['0', '0', '0'], ['65536', H.c('r', '0'), H.c('g', '1')], ['131072', H.c('r', '0'), H.c('g', '2')], ['196608', H.c('r', '0'), H.c('g', '3')]])}` },
      { title: 'Predict the output: a mutable key gets lost', html: `<p>The list is stored in the bucket for hash([1, 2]). After <code>add(3)</code> its hashCode changes, so <code>get</code> looks in a different bucket and finds nothing. The entry is still inside the map (size 1), just unreachable — a classic memory leak.</p>`, code: `List<Integer> key = new ArrayList<>(List.of(1, 2));
Map<List<Integer>, String> m = new HashMap<>();
m.put(key, "v");
key.add(3);                                 // hashCode changes!
System.out.println(m.get(key));             // null
System.out.println(m.containsKey(key));     // false
System.out.println(m.size());               // 1  (orphaned entry)` },
      { title: 'equals without hashCode → duplicates', html: `<p>If you override <code>equals</code> but not <code>hashCode</code>, two "equal" points get different identity hashes and almost always land in different buckets. HashMap never even calls equals on them, so you get two entries. Records generate both methods correctly.</p>`, code: `class P { int x, y; P(int x, int y) { this.x = x; this.y = y; }
    @Override public boolean equals(Object o) { return o instanceof P p && p.x == x && p.y == y; } } // no hashCode!
record Q(int x, int y) {}                                    // equals + hashCode generated
class Demo { public static void main(String[] a) {
    Set<P> ps = new HashSet<>(List.of(new P(1, 2)));
    System.out.println(ps.contains(new P(1, 2)));            // almost always false
    Set<Q> qs = new HashSet<>(List.of(new Q(1, 2)));
    System.out.println(qs.contains(new Q(1, 2)));            // true
} }` },
      { title: 'The null key and the ambiguous null', html: `<p><code>HashMap</code> allows one null key (hash 0, bucket 0). But <code>get</code> returns null both for "missing" and for "mapped to null", so use <code>containsKey</code> or <code>getOrDefault</code> when nulls are possible. (ConcurrentHashMap bans nulls precisely to avoid this ambiguity.)</p>`, code: `Map<String, String> m = new HashMap<>();
m.put(null, "nullKey");
m.put("k", null);
System.out.println(m.get(null) + " " + m.get("k") + " " + m.get("missing")); // nullKey null null
System.out.println(m.containsKey("k") + " " + m.containsKey("missing"));    // true false` }
    ],
    deepDive: `<p><b>Why 0.75?</b> With load factor α, bucket sizes follow roughly a Poisson distribution with mean ≈ α/2 right after resizes. The JDK comment lists probabilities for λ = 0.5: P(0) = 0.607, P(1) = 0.303, P(2) = 0.076, P(3) = 0.013 … P(8) ≈ 6·10<sup>−8</sup>. So most buckets hold 0–2 nodes. A lower α wastes memory; a higher α lengthens chains. 0.75 is the classic time/space compromise.</p>
      <p><b>Cached hash.</b> Every Node stores its <code>final int hash</code>. That lets lookups skip <code>equals</code> on mismatched hashes, and lets resize redistribute without calling <code>hashCode()</code> again. <code>String</code> also caches its own hashCode in a field (with a <code>hashIsZero</code> flag since JDK 13 so "" style zero hashes are cached too).</p>
      <p><b>Sizing for N entries.</b> <code>new HashMap&lt;&gt;(n)</code> means "table capacity ≥ n", not "holds n without resizing". <code>tableSizeFor</code> rounds up to the next power of two, and the threshold is 0.75 of that. For 100 entries, <code>new HashMap&lt;&gt;(100)</code> gives 128 slots, threshold 96 → one resize! Use <code>HashMap.newHashMap(100)</code> (Java 19+), which computes ⌈100 / 0.75⌉ = 134 → 256 slots.</p>
      <p><b>Java 7 vs Java 8.</b> Java 7 inserted at the <i>head</i> of the chain and rehashed during resize, which reversed chains; two threads resizing at once could create a <b>cycle</b> and spin a CPU at 100% in <code>get()</code>. Java 8 appends at the tail and splits into order-preserving lo/hi lists, so no cycle — but HashMap is <b>still not thread-safe</b> (lost puts, broken size, visibility bugs). Use ConcurrentHashMap.</p>
      <p><b>Memory.</b> Each entry is a ~32-byte Node (with compressed oops) plus the key and value objects plus a 4-byte table slot. <code>HashSet</code> is literally a HashMap whose values are a shared dummy <code>PRESENT</code> object, so it pays the same per-entry cost.</p>
      <p><b>Security.</b> Attackers who control keys (HTTP parameters, JSON field names) can send thousands of colliding Strings. Java 8's treeified buckets (next topic) turn that worst case from O(n) per lookup into O(log n) when keys are Comparable.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating <code>equals</code>/<code>hashCode</code> is free now (IDEs, records, Lombok, AI). The skill that remains is <b>spotting when a generated hashCode uses mutable fields</b>, or when a key class is used in a map while still being edited — bugs that no generator warns about.</p>
      <p><b>Use AI as a partner:</b> <code>Generate 1,000 Strings that all collide with "Aa".hashCode() and a benchmark that shows HashMap get() time</code> — a great way to see treeification. Or <code>Review this class: is it safe to use as a HashMap key?</code></p>
      <p><b>Where AI goes wrong:</b> claims the index is <code>hashCode() % capacity</code> (it is a bit-mask on the spread hash), that the default table is allocated in the constructor (it is lazy), that <code>new HashMap&lt;&gt;(n)</code> avoids resizes for n entries, or that Java 8 still inserts at the head. Interviewers love these details; know them cold so you can correct the machine.</p>`,
    problems: [{
      title: 'Design HashMap (no java.util maps)', level: 'Medium', tags: ['hashing', 'design', 'chaining'], companies: ['Amazon', 'Microsoft', 'Apple', 'Uber'],
      statement: `<p>Design <code>MyHashMap</code> with <code>put(int key, int value)</code> (insert or update), <code>get(int key)</code> (value or −1) and <code>remove(int key)</code>, without using built-in hash tables. Use <b>separate chaining</b>, a power-of-two table, Java-style hash spreading and resize at load factor 0.75.</p>`,
      constraints: `0 ≤ key, value ≤ 10<sup>6</sup>; at most 10<sup>4</sup> calls (follow-up: 10<sup>6</sup> calls).`,
      example: `<p>put(1,1), put(2,2), get(1) → ${H.c('g', '1')}, get(3) → ${H.c('r', '-1')}, put(2,1) (update), get(2) → ${H.c('g', '1')}, remove(2), get(2) → ${H.c('r', '-1')}.</p>`,
      brute: { why: `<p>Store pairs in one list and scan it every time: O(n) per call, 10<sup>8</sup> steps for 10<sup>4</sup> calls in the worst case. A <code>new int[1_000_001]</code> direct-address table is O(1) but wastes 4 MB regardless of how many keys exist and fails if keys become large/negative.</p>`, code: `class SlowMap {
    private final java.util.List<int[]> pairs = new java.util.ArrayList<>();
    public void put(int k, int v) { for (int[] p : pairs) if (p[0] == k) { p[1] = v; return; } pairs.add(new int[]{k, v}); }
    public int get(int k) { for (int[] p : pairs) if (p[0] == k) return p[1]; return -1; }
    public void remove(int k) { pairs.removeIf(p -> p[0] == k); }
}` },
      mcq: { q: 'You use table length 16 and index = hash & 15. Which choice keeps chains short when keys are multiples of 1024?', options: ['Spread the hash (h ^ h >>> 16) or mix bits before masking', 'Use a bigger load factor', 'Use hash % 16 instead of & 15', 'Store keys sorted inside each bucket'], answer: 0, explain: 'Multiples of 1024 have their low 10 bits all zero, so & 15 sends them all to bucket 0 (and % 16 is identical for non-negative ints). Mixing high bits into low bits is the fix; for keys below 65536 Java\'s simple spread does not help, so production code may use a stronger mixer (e.g. multiply by a large odd constant).' },
      hints: [`<p>Hint 1: an array of linked-list heads is all you need. index = (table.length − 1) &amp; spread(key).</p>`, `<p>Hint 2: put walks the chain: if the key exists, overwrite; otherwise append. After inserting, if ++size &gt; 0.75 × length, double the table and re-place every node using <code>hash &amp; oldCap</code> to choose j or j + oldCap.</p>`, `<p>Hint 3: remove needs the previous node (or a dummy head) to unlink. Edge cases: removing the first node of a chain, removing a missing key, updating without changing size.</p>`],
      solution: {
        approach: `<p>Separate chaining with singly linked nodes. Integer keys are mixed with a strong multiplicative hash (golden-ratio constant) so sequential and patterned keys spread well, then masked by <code>length − 1</code>. Resize doubles and splits chains with the single-bit lo/hi trick, exactly like the JDK.</p>`,
        code: `class MyHashMap {
    private static final class Node { final int key, hash; int val; Node next; Node(int k, int h, int v, Node n) { key = k; hash = h; val = v; next = n; } }
    private Node[] table = new Node[16];
    private int size;

    private static int hash(int key) {
        int h = key * 0x9E3779B9;            // multiply by an odd constant: mixes every bit
        return h ^ (h >>> 16);               // then Java-style spread
    }

    public void put(int key, int value) {
        int h = hash(key), i = h & (table.length - 1);
        for (Node e = table[i]; e != null; e = e.next)
            if (e.key == key) { e.val = value; return; }        // update in place
        table[i] = new Node(key, h, value, table[i]);            // push at head (order irrelevant here)
        if (++size > table.length * 3 / 4) resize();
    }

    public int get(int key) {
        int h = hash(key);
        for (Node e = table[h & (table.length - 1)]; e != null; e = e.next)
            if (e.key == key) return e.val;
        return -1;
    }

    public void remove(int key) {
        int h = hash(key), i = h & (table.length - 1);
        Node dummy = new Node(0, 0, 0, table[i]), prev = dummy;
        while (prev.next != null) {
            if (prev.next.key == key) { prev.next = prev.next.next; size--; break; }
            prev = prev.next;
        }
        table[i] = dummy.next;
    }

    private void resize() {
        Node[] old = table;
        int oldCap = old.length;
        table = new Node[oldCap << 1];
        for (int j = 0; j < oldCap; j++) {
            for (Node e = old[j], next; e != null; e = next) {
                next = e.next;
                int ni = (e.hash & oldCap) == 0 ? j : j + oldCap;  // one bit decides
                e.next = table[ni];
                table[ni] = e;
            }
        }
    }

    public static void main(String[] args) {
        MyHashMap m = new MyHashMap();
        m.put(1, 1); m.put(2, 2);
        System.out.println(m.get(1) + " " + m.get(3));   // 1 -1
        m.put(2, 1); System.out.println(m.get(2));       // 1
        m.remove(2); System.out.println(m.get(2));       // -1
        for (int k = 0; k < 100_000; k++) m.put(k, k);
        System.out.println(m.get(99_999) + " " + m.table.length); // 99999 262144
    }
}`,
        dry: { head: ['call', 'hash → bucket (len 16)', 'chain before', 'action', 'size'], rows: [['put(1,1)', 'b1', '(empty)', 'new node', '1'], ['put(2,2)', 'b2', '(empty)', 'new node', '2'], ['get(1)', 'b1', '[1]', H.c('g', 'found → 1'), '2'], ['put(2,1)', 'b2', '[2]', 'key match → overwrite', '2'], ['remove(2)', 'b2', '[2]', 'unlink via dummy', '1'], ['get(2)', 'b2', '(empty)', H.c('r', '-1'), '1']] },
        complexity: `<p>Average O(1) per operation with a good hash; worst case O(n) if every key collides. Resize is O(n) but happens after Θ(n) inserts → amortized O(1). Space O(n + capacity).</p>`,
        followUps: ['Switch to open addressing with linear probing — how do you delete without breaking probe chains (tombstones)?', 'Make a chain become a balanced tree after 8 nodes — what must keys support?', 'Shrink the table when size drops below capacity/8']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — HashMap resize split & treeification
     ===================================================================== */
  topics.push({
    title: 'HashMap Internals II: Resize (lo/hi split) & Treeification',
    analogy: `<p>A library shelf sorted by the <b>last digit</b> of each book's code has 10 sections. When it moves to a shelf with 20 sections sorted by the <b>last two digits</b>, each book either stays in "its" section or moves exactly 10 sections over — you only need to look at <b>one extra digit</b> to decide. And if one section ever becomes a giant pile (someone gave many books the same code), the librarian stops stacking them and builds a <b>sorted mini-index</b> for that section so finding a book takes a few hops instead of reading the whole pile.</p>`,
    explain: `<p><b>Resize = double + split.</b> When <code>size &gt; threshold</code>, HashMap allocates a table twice as big. Because the table length is a power of two, the new index uses <b>one more low bit</b> of the hash. So a node from old bucket <code>j</code> can only go to:</p>
      <ul><li><code>j</code> if <code>(hash &amp; oldCap) == 0</code> — the "<b>lo</b>" list</li><li><code>j + oldCap</code> otherwise — the "<b>hi</b>" list</li></ul>
      ${H.bits(0b01011, 5, { label: 'hash 11, oldCap 8: bit 3 is 1 → moves from 3 to 3 + 8 = 11', hl: { 3: 'y' } })}
      ${H.bits(0b10011, 5, { label: 'hash 19, oldCap 8: bit 3 is 0 → stays at 3', hl: { 3: 'y' } })}
      <p>No hashCode calls, no modulo, and each chain splits into two lists that keep their original order.</p>
      <p><b>Treeification (Java 8+).</b> If a chain grows past <b>TREEIFY_THRESHOLD = 8</b> nodes, HashMap calls <code>treeifyBin</code>:</p>
      <ul>
        <li>If the table is still small (<code>length &lt; MIN_TREEIFY_CAPACITY = 64</code>) it just <b>resizes</b> instead — long chains in a tiny table usually mean "table too small", not "bad hashes".</li>
        <li>Otherwise the bucket becomes a <b>red-black tree</b> of <code>TreeNode</code>s ordered by hash (then by <code>compareTo</code> if keys are Comparable, then by a tie-break on identity hash). Lookups in that bucket drop from O(k) to O(log k).</li>
        <li>When a resize splits a tree bin and one half has ≤ <b>UNTREEIFY_THRESHOLD = 6</b> nodes, it turns back into a plain list. (8 vs 6 is hysteresis, so a bucket hovering around 7 does not flip back and forth.)</li>
      </ul>
      ${H.table(['constant', 'value', 'meaning'], [['DEFAULT_INITIAL_CAPACITY', '16', 'first table length'], ['DEFAULT_LOAD_FACTOR', '0.75', 'resize when size > 0.75 × length'], ['TREEIFY_THRESHOLD', '8', 'chain longer than this → try to treeify'], ['UNTREEIFY_THRESHOLD', '6', 'tree this small after split → back to list'], ['MIN_TREEIFY_CAPACITY', '64', 'smaller table → resize instead of treeify']])}`,
    clues: ['"what happens when HashMap resizes?" → doubling, lo/hi split by <code>hash &amp; oldCap</code>, order preserved', '"worst-case lookup in Java 8 HashMap" → O(log n) with treeified buckets (Comparable keys help)', '"hash-flooding / DoS with colliding keys" → treeification as mitigation', '"why 8 and 6?" → Poisson: 8 colliding nodes is ~1-in-10-million; hysteresis avoids flapping', '"pre-size a map for 1 million entries" → avoid ~16 resizes; <code>HashMap.newHashMap(n)</code>', '"HashMap infinite loop" → Java 7 concurrent resize; Java 8 still not thread-safe'],
    code: [`
import java.util.HashMap;
import java.util.Map;

/** Keys that ALL collide. Being Comparable lets a treeified bucket search in O(log n). */
final class BadKey implements Comparable<BadKey> {
    final int id;
    BadKey(int id) { this.id = id; }
    @Override public int hashCode() { return 42; }                       // every key -> same bucket
    @Override public boolean equals(Object o) { return o instanceof BadKey b && b.id == id; }
    @Override public int compareTo(BadKey o) { return Integer.compare(id, o.id); } // tie-breaker inside the tree
}

class TreeifyDemo {
    /** Same rounding as HashMap.tableSizeFor: next power of two >= cap. */
    static int tableSizeFor(int cap) {
        int n = -1 >>> Integer.numberOfLeadingZeros(cap - 1);
        return (n < 0) ? 1 : (n >= (1 << 30)) ? (1 << 30) : n + 1;
    }

    public static void main(String[] args) {
        Map<BadKey, Integer> m = new HashMap<>();
        int n = 20_000;
        long t0 = System.nanoTime();
        for (int i = 0; i < n; i++) m.put(new BadKey(i), i);
        for (int i = 0; i < n; i++) m.get(new BadKey(i));
        long ms = (System.nanoTime() - t0) / 1_000_000;
        // With treeification this finishes quickly (O(n log n)); as a plain chain it would be O(n^2).
        System.out.println("size=" + m.size() + " in ~" + ms + " ms");

        System.out.println(tableSizeFor(100) + " " + tableSizeFor(16) + " " + tableSizeFor(17)); // 128 16 32
        Map<String, Integer> sized = HashMap.newHashMap(100);   // Java 19+: room for 100 entries, no resize
        System.out.println(sized.isEmpty());
    }
}`],
    codeTitle: ['Colliding Comparable keys + tableSizeFor + newHashMap'],
    viz: [{
      title: 'Resize: split every chain into lo (stay) and hi (move by oldCap)',
      input: '8 | 3 11 19 27 35 6 14 22',
      inputLabel: 'oldCap (2..16, power of two) | spread hash values (ints 0..9999, max 12)',
      gen: function (input) {
        var s = clean(input);
        if (s.indexOf('|') < 0) throw new Error('Format: oldCap | hashes, e.g. "8 | 3 11 19 27"');
        var p = s.split('|'), oldCap = Number(p[0].trim());
        if ([2, 4, 8, 16].indexOf(oldCap) < 0) throw new Error('oldCap must be 2, 4, 8 or 16');
        var hs = p[1].trim().split(/[\s,]+/).filter(function (x) { return x.length; }).map(Number);
        if (!hs.length || hs.length > 12 || hs.some(function (x) { return isNaN(x) || x < 0 || x > 9999 || x !== Math.floor(x); })) throw new Error('Give 1..12 hash values between 0 and 9999');
        var old = [], frames = [], nw = [], bitPos = Math.round(Math.log2(oldCap)), b;
        for (b = 0; b < oldCap; b++) old.push([]);
        hs.forEach(function (h) { old[h & (oldCap - 1)].push(h); });
        for (b = 0; b < 2 * oldCap; b++) nw.push([]);
        function g(arr, label, hl) { var rows = bucketRows(arr, 2); return { type: 'grid', label: label, rowHead: range(arr.length), colHead: colHeads(rows), rows: rows, hl: hl || {} }; }
        frames.push({ narr: 'Old table has length <b>' + oldCap + '</b>, so index = hash &amp; ' + (oldCap - 1) + ' (low ' + bitPos + ' bits). We are about to double to ' + (2 * oldCap) + ', which looks at one more bit: <b>bit ' + bitPos + '</b> (value ' + oldCap + ').', parts: [g(old, 'old table[' + oldCap + ']'), g(nw, 'new table[' + (2 * oldCap) + '] (empty)')] });
        for (b = 0; b < oldCap; b++) {
          if (!old[b].length) continue;
          var lo = [], hi = [];
          old[b].forEach(function (h, k) {
            var isHi = (h & oldCap) !== 0, hl = {}, bh = {};
            if (isHi) hi.push(h); else lo.push(h);
            hl[b + ',' + k] = 'cur'; bh[bitPos] = isHi ? 'win' : 'ok';
            frames.push({ narr: 'Bucket ' + b + ', node hash <b>' + h + '</b>: <code>' + h + ' &amp; ' + oldCap + ' = ' + (h & oldCap) + '</code> → ' + (isHi ? '<span class="c-b">hi list</span> (will move to ' + (b + oldCap) + ')' : '<span class="c-g">lo list</span> (stays at ' + b + ')') + '. Appended at the tail, so the order inside each list is preserved.', parts: [
              g(old, 'old table[' + oldCap + ']', hl),
              { type: 'bits', label: 'hash ' + h + ' (deciding bit highlighted)', value: h, width: Math.max(bitPos + 2, 6), hl: bh },
              { type: 'list', label: 'lo list → new[' + b + ']', values: lo.length ? lo.slice() : ['∅'] },
              { type: 'list', label: 'hi list → new[' + (b + oldCap) + ']', values: hi.length ? hi.slice() : ['∅'] }] });
          });
          nw[b] = lo; nw[b + oldCap] = hi;
          var nh = {};
          lo.forEach(function (_, k) { nh[b + ',' + k] = 'ok'; });
          hi.forEach(function (_, k) { nh[(b + oldCap) + ',' + k] = 'win'; });
          frames.push({ narr: 'Bucket ' + b + ' done: <code>newTab[' + b + '] = loHead</code>, <code>newTab[' + (b + oldCap) + '] = hiHead</code>. Two pointer assignments — no per-node re-hashing.', parts: [g(nw, 'new table[' + (2 * oldCap) + ']', nh)] });
        }
        frames.push({ narr: 'Resize complete. Every node either stayed (green before) or moved by exactly +' + oldCap + '. New threshold = ' + (2 * oldCap) + ' × 0.75 = <b>' + Math.floor(1.5 * oldCap) + '</b>.', parts: [g(nw, 'new table[' + (2 * oldCap) + ']')] });
        return frames;
      }
    }, {
      title: 'Treeify or resize? A bucket full of collisions',
      input: '11 16',
      inputLabel: 'colliding keys to insert (9..13) and starting table length (16, 32 or 64)',
      gen: function (input) {
        var t = clean(input).split(/[\s,]+/).filter(function (x) { return x.length; }).map(Number);
        if (t.length !== 2 || [16, 32, 64].indexOf(t[1]) < 0 || isNaN(t[0]) || t[0] < 9 || t[0] > 13) throw new Error('Format: "keys tableLength", keys 9..13, tableLength 16/32/64 — e.g. "11 16"');
        var n = t[0], cap = t[1], chain = [], frames = [], tree = null, treeKeys = [];
        function vars(h) { return { type: 'vars', label: 'state', vals: { 'table.length': cap, 'bucket 5 nodes': tree ? tree.size : chain.length, 'bucket kind': tree ? 'TreeNode (red-black)' : 'Node list' }, hl: h || {} }; }
        frames.push({ narr: 'Every key has a hash of the form <b>64·k + 5</b>, so its low 6 bits are always 000101. In any table of length ≤ 64 they ALL land in <b>bucket 5</b>. Watch what HashMap does as the chain grows.', parts: [vars()] });
        for (var i = 0; i < n; i++) {
          var h = 64 * i + 5;
          if (tree) {
            rbInsert(tree, h, function () {});
            var ta = rbArr(tree, h);
            frames.push({ narr: 'put(hash ' + h + '): bucket 5 is a tree bin → <code>putTreeVal</code> walks about log₂(' + tree.size + ') ≈ ' + Math.ceil(Math.log2(tree.size)) + ' levels instead of ' + tree.size + ' nodes.', parts: [{ type: 'tree', label: 'bucket 5 as a red-black tree (ordered by hash)', arr: ta.arr, hl: ta.hl, tags: ta.tags }, vars({ 'bucket 5 nodes': 'ok' })] });
            continue;
          }
          chain.push(h);
          var hl = {}; hl[chain.length - 1] = 'ok';
          frames.push({ narr: 'put(hash ' + h + ') → bucket 5, appended at the tail. Chain length now <b>' + chain.length + '</b>' + (chain.length > 8 ? ' — <span class="c-r">longer than TREEIFY_THRESHOLD (8)</span> → <code>treeifyBin()</code> is called.' : '.'), parts: [{ type: 'list', label: 'bucket 5 chain', values: chain.slice(), hl: hl }, vars({ 'bucket 5 nodes': chain.length > 8 ? 'bad' : 'cur' })] });
          if (chain.length > 8) {
            if (cap < 64) {
              cap *= 2;
              frames.push({ narr: '<code>treeifyBin</code>: table length ' + (cap / 2) + ' &lt; MIN_TREEIFY_CAPACITY (64) → <b>resize to ' + cap + ' instead</b>. A long chain in a small table usually just means the table is too small. Here it does not help: all hashes still share their low bits, so the chain stays in bucket 5.', parts: [{ type: 'list', label: 'bucket 5 chain after resize', values: chain.slice() }, vars({ 'table.length': 'cur' })] });
            } else {
              tree = rbNew();
              var stepFrames = [];
              chain.forEach(function (k) { rbInsert(tree, k, function () {}); });
              var a2 = rbArr(tree);
              frames.push({ narr: 'Table length is ' + cap + ' (≥ 64) → <b>treeify</b>: the ' + chain.length + ' Nodes are replaced by TreeNodes and inserted into a red-black tree ordered by hash (Comparable keys break ties). They also keep a <code>next</code> link so iteration and untreeify are cheap. Height is now ' + rbHeight(tree.root) + ' instead of ' + chain.length + '.', parts: [{ type: 'tree', label: 'bucket 5 as a red-black tree', arr: a2.arr, hl: a2.hl, tags: a2.tags }, vars({ 'bucket kind': 'ok' })] });
              chain = [];
            }
          }
        }
        frames.push({ narr: tree ? 'Final: one tree bin with ' + tree.size + ' nodes. If a later resize splits it and a half has ≤ 6 nodes (UNTREEIFY_THRESHOLD), that half becomes a plain list again.' : 'Final: still a plain chain of ' + chain.length + ' nodes — the table has not reached 64 yet. Insert more keys to see treeification.', parts: [vars()] });
        return frames;
      }
    }],
    examples: [
      { title: 'Split a bucket by hand', html: `<p>oldCap = 16, bucket 5 holds hashes 5, 21, 37, 53. Check bit 4 (value 16) of each:</p>
        ${H.table(['hash', 'binary', 'hash & 16', 'goes to'], [['5', '000101', '0', H.c('g', 'lo → 5')], ['21', '010101', '16', H.c('b', 'hi → 21')], ['37', '100101', '0', H.c('g', 'lo → 5')], ['53', '110101', '16', H.c('b', 'hi → 21')]])}
        <p>New bucket 5 = [5, 37], new bucket 21 = [21, 53] — same relative order as before.</p>` },
      { title: 'How many resizes for a million entries?', html: `<p>Default map: capacity 16 → 32 → … → 2<sup>21</sup> = 2,097,152 (threshold 1,572,864 ≥ 10<sup>6</sup>). That is <b>17 resizes</b>, each touching every node. <code>HashMap.newHashMap(1_000_000)</code> computes ⌈10<sup>6</sup>/0.75⌉ = 1,333,334 → tableSizeFor → 2<sup>21</sup> once, zero resizes.</p>`, code: `Map<Integer, Integer> slow = new HashMap<>();                    // 17 resizes on the way to 1M
Map<Integer, Integer> fast = HashMap.newHashMap(1_000_000);      // Java 19+: sized once
for (int i = 0; i < 1_000_000; i++) { slow.put(i, i); fast.put(i, i); }
System.out.println(slow.size() == fast.size());                  // true` },
      { title: 'Treeify needs table ≥ 64', html: `<p>Nine keys with identical hashCode in <code>new HashMap&lt;&gt;()</code> (length 16): the 9th insert calls treeifyBin, but 16 &lt; 64 so the table resizes to 32. The 10th resizes again to 64. The 11th finally converts the bucket into a red-black tree. Tiny maps never treeify — they grow.</p>` },
      { title: 'Non-Comparable colliding keys still work', html: `<p>If colliding keys are not Comparable, the tree still orders them by hash; for equal hashes it uses <code>tieBreakOrder</code> (class name, then <code>System.identityHashCode</code>) just to place them, and a lookup may have to search <b>both</b> subtrees (<code>find</code> recurses). So the O(log n) guarantee really holds for Comparable keys; make keys Comparable if hostile collisions are possible.</p>` }
    ],
    deepDive: `<p><b>Why the lo/hi trick is correct.</b> Old index = hash &amp; (oldCap − 1); new index = hash &amp; (2·oldCap − 1). The new mask has exactly one extra bit, the one with value oldCap. If that bit of the hash is 0, both masks give the same index; if it is 1, the new index is old + oldCap. QED — and it is why table length must be a power of two.</p>
      <p><b>Cost of resize.</b> O(n + oldCap) and it runs on the thread that triggered it, causing latency spikes in big maps (copying a 2-million-slot table is milliseconds). Pre-size hot maps. In ConcurrentHashMap many threads cooperate on one resize instead.</p>
      <p><b>TreeNode layout.</b> <code>TreeNode extends LinkedHashMap.Entry extends HashMap.Node</code> and adds parent, left, right, prev and a red flag — roughly <b>twice the size</b> of a Node. That is why treeify only kicks in when chains are pathologically long; with a sane hashCode and load factor 0.75, the chance of a bin reaching 8 is about 6·10<sup>−8</sup>. The root of a tree bin is moved to the front of the bin (<code>moveRootToFront</code>) so <code>table[i]</code> always points at the root.</p>
      <p><b>Ordering inside a tree bin.</b> By hash first; for equal hashes by <code>compareTo</code> if both keys are the same Comparable class (<code>comparableClassFor</code>); otherwise <code>tieBreakOrder</code>. With non-comparable equal-hash keys, <code>find</code> may explore both children, so a fully hostile set of non-comparable keys can still be O(n).</p>
      <p><b>Removal can untreeify too.</b> <code>removeTreeNode</code> converts the bin back to a list when the tree gets "too small" (root or its children are null — roughly 2–6 nodes), and <code>split</code> during resize untreeifies halves with ≤ 6 nodes.</p>
      <p><b>Concurrency horror story.</b> Pre-Java-8 HashMap transferred chains by head-insertion, reversing them. Two threads resizing simultaneously could interleave so that A.next = B and B.next = A: a cycle, and any later <code>get</code> on that bucket loops forever at 100% CPU. Java 8's order-preserving split removed the cycle, but concurrent puts can still lose entries or corrupt size.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI tools will tell you "HashMap is O(1)" and stop. Production incidents come from the parts they skip: resize latency spikes, memory doubling during resize (old and new tables alive together), and hostile keys. Being able to reason about <i>which bucket, which bit, which threshold</i> is what lets you debug a heap dump or a flame graph that AI cannot see.</p>
      <p><b>Use AI as a partner:</b> <code>Write a JMH benchmark that measures HashMap.get with 10^5 colliding Comparable keys vs non-Comparable keys</code>, or <code>Explain this heap histogram: why do I have 2 million HashMap$TreeNode objects?</code> (answer: a terrible hashCode). Verify any explanation against the OpenJDK source.</p>
      <p><b>Where AI goes wrong:</b> it often says treeify happens "at 8 entries" regardless of table size (forgets MIN_TREEIFY_CAPACITY = 64), says resize recomputes hashCode, or that Java 8 HashMap is safe for concurrent writes "because the infinite loop was fixed". You own the precise rules.</p>`,
    problems: [{
      title: 'Predict the Table Length after N Inserts', level: 'Medium', tags: ['hashmap internals', 'simulation', 'bit manipulation'], companies: ['Goldman Sachs', 'Oracle', 'Atlassian'],
      statement: `<p>Write <code>int[] simulate(int initialCapacity, int n)</code> that returns <b>{final table length, number of resizes}</b> after inserting n distinct keys into <code>new HashMap&lt;&gt;(initialCapacity)</code> with load factor 0.75. Rules: the table is created on the first put with length <code>tableSizeFor(initialCapacity)</code> (next power of two ≥ it, minimum 1); after each insert, if <code>size &gt; threshold</code> the length doubles; threshold = (int)(length × 0.75). The first allocation does <b>not</b> count as a resize. Ignore treeification.</p>`,
      constraints: `0 ≤ initialCapacity ≤ 2<sup>20</sup>, 0 ≤ n ≤ 10<sup>8</sup> (simulate per resize, not per insert).`,
      example: `<p>simulate(16, 13) → ${H.c('g', '{32, 1}')}: threshold 12, the 13th insert makes size 13 &gt; 12. simulate(100, 100) → ${H.c('y', '{256, 1}')}: tableSizeFor(100) = 128, threshold 96 &lt; 100 → one resize. simulate(0, 1) → {2, 1}: length 1 has threshold 0, so the first insert already resizes.</p>`,
      brute: { why: `<p>Actually inserting n keys into a real HashMap and inspecting the table via reflection is slow (10<sup>8</sup> boxed puts, gigabytes of memory) and reflection on <code>java.util</code> internals is blocked by strong encapsulation since JDK 16. Even a plain loop over every insert costs O(n).</p>`, code: `class BruteSim {
    static int[] simulate(int initialCapacity, int n) {
        int cap = 1; while (cap < initialCapacity) cap <<= 1;
        int thr = (int) (cap * 0.75f), size = 0, resizes = 0;
        for (int i = 0; i < n; i++) {                 // O(n): one step per insert
            if (++size > thr) { cap <<= 1; thr = (int) (cap * 0.75f); resizes++; }
        }
        return new int[]{cap, resizes};
    }
}` },
      mcq: { q: 'new HashMap<>(64) then 49 puts. What is the table length?', options: ['128 — threshold of 64 is 48, the 49th put exceeds it', '64 — capacity 64 holds 64 entries', '256', '96'], answer: 0, explain: 'Capacity is not the number of entries it can hold. Threshold = 0.75 × 64 = 48; size 49 > 48 triggers a resize to 128.' },
      hints: [`<p>Hint 1: size only matters when it crosses a threshold. Between resizes nothing interesting happens, so jump straight from threshold to threshold.</p>`, `<p>Hint 2: compute <code>cap = tableSizeFor(initialCapacity)</code>. While <code>n &gt; (int)(cap × 0.75)</code>: double cap and count a resize. That is at most ~30 iterations.</p>`, `<p>Hint 3: edge cases: n = 0 → no table yet (return {0, 0}); initialCapacity 0 or 1 → length 1, threshold 0. Use long math if cap could overflow (cap ≤ 2<sup>30</sup> in the JDK).</p>`],
      solution: {
        approach: `<p>The table only changes when size exceeds the current threshold. Starting from tableSizeFor(initialCapacity), keep doubling while n is above the threshold. Each loop step is one real resize.</p>`,
        code: `class TableSim {
    static int tableSizeFor(int cap) {
        int n = -1 >>> Integer.numberOfLeadingZeros(Math.max(cap, 1) - 1);  // all ones below the top bit
        return (n < 0) ? 1 : (n >= (1 << 30)) ? (1 << 30) : n + 1;
    }

    static int[] simulate(int initialCapacity, int n) {
        if (n == 0) return new int[]{0, 0};          // table is lazy: never allocated
        int cap = tableSizeFor(initialCapacity), resizes = 0;
        while (cap < (1 << 30) && n > (int) (cap * 0.75f)) {   // size will exceed this threshold
            cap <<= 1;
            resizes++;
        }
        return new int[]{cap, resizes};
    }

    public static void main(String[] args) {
        System.out.println(java.util.Arrays.toString(simulate(16, 13)));        // [32, 1]
        System.out.println(java.util.Arrays.toString(simulate(100, 100)));      // [256, 1]
        System.out.println(java.util.Arrays.toString(simulate(0, 1)));          // [2, 1]
        System.out.println(java.util.Arrays.toString(simulate(16, 1_000_000))); // [2097152, 17]
    }
}`,
        dry: { head: ['call', 'start length', 'threshold checks', 'result'], rows: [['simulate(16, 13)', '16', '13 > 12 → 32; 13 > 24? no', '{32, 1}'], ['simulate(100, 100)', '128', '100 > 96 → 256; 100 > 192? no', '{256, 1}'], ['simulate(0, 1)', '1', '1 > 0 → 2; 1 > 1? no', '{2, 1}'], ['simulate(16, 10^6)', '16', '17 doublings up to 2^21 (threshold 1,572,864)', '{2097152, 17}']] },
        complexity: `<p>O(log n) time (one iteration per doubling), O(1) space.</p>`,
        followUps: ['What initialCapacity should you pass so that n entries never resize? (⌈n / 0.75⌉, or HashMap.newHashMap(n))', 'How does the answer change with load factor 0.5 or 1.0?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — LinkedHashMap access order & LRU
     ===================================================================== */
  topics.push({
    title: 'LinkedHashMap: Insertion vs Access Order & the 5-line LRU Cache',
    analogy: `<p>Think of the <b>"recently used" shelf on your desk</b>. Every time you use a book you put it back on the <b>right end</b>. Books you have not touched for ages drift to the <b>left end</b>. When the shelf is full and a new book arrives, you throw away the leftmost one — the <b>least recently used</b>. You still find any book instantly thanks to a separate index card box (the hash table); the shelf just remembers the order.</p>`,
    explain: `<p><code>LinkedHashMap</code> = a normal <code>HashMap</code> <b>plus a doubly-linked list running through all entries</b>. Each entry has extra <code>before</code> and <code>after</code> pointers, and the map keeps <code>head</code> (eldest) and <code>tail</code> (youngest).</p>
      ${H.table(['mode', 'how to create', 'list order', 'moves an entry to the tail when…'], [['insertion order (default)', '<code>new LinkedHashMap&lt;&gt;()</code>', 'order keys were first inserted', 'never (re-putting an existing key keeps its spot)'], ['access order', '<code>new LinkedHashMap&lt;&gt;(16, 0.75f, true)</code>', 'least → most recently used', 'get, getOrDefault, put/putIfAbsent of an existing key, compute*, merge, replace']])}
      <p><b>The eviction hook:</b> after every insertion LinkedHashMap calls <code>removeEldestEntry(eldest)</code>. It returns false by default. Override it to return <code>size() &gt; capacity</code> and the head entry is removed automatically. Access order + this hook = an <b>LRU cache</b>:</p>
      ${H.arr(['b', 'c', 'a'], { label: 'head (LRU) → tail (MRU) after put a, put b, put c, get a', hl: { 0: 'r', 2: 'g' } })}
      <p>All operations stay <b>O(1)</b>: the hash table finds the entry, and unlinking/relinking in a doubly-linked list is a few pointer writes. Iteration is O(size) (it follows the list, not the buckets), and the order is predictable — great for reproducible output, JSON field order and caches.</p>
      <p><b>Java 21 bonus:</b> LinkedHashMap implements <code>SequencedMap</code>: <code>firstEntry()</code>, <code>lastEntry()</code>, <code>pollFirstEntry()</code>, <code>putFirst</code>, <code>putLast</code>, <code>reversed()</code>.</p>`,
    clues: ['"design an LRU cache with O(1) get and put" (LeetCode 146) → HashMap + doubly-linked list, or LinkedHashMap(accessOrder = true)', '"evict the least recently used item when capacity is exceeded" → <code>removeEldestEntry</code>', '"keep insertion order" / "predictable iteration order" → LinkedHashMap', '"first unique / first non-repeating" in a stream → insertion-ordered map or set', '"ConcurrentModificationException while iterating a cache and calling get" → get is a structural change in access-order mode', '"thread-safe LRU" → lock around it, or Caffeine in production'],
    code: [`
import java.util.LinkedHashMap;
import java.util.Map;

/** An LRU cache in five meaningful lines. */
class LRUCache<K, V> extends LinkedHashMap<K, V> {
    private final int capacity;

    LRUCache(int capacity) {
        super(16, 0.75f, true);          // accessOrder = true: get() moves the entry to the tail
        this.capacity = capacity;
    }

    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        return size() > capacity;        // called after each insert; true -> evict head (LRU)
    }

    public static void main(String[] args) {
        LRUCache<String, Integer> c = new LRUCache<>(3);
        c.put("a", 1); c.put("b", 2); c.put("c", 3);
        c.get("a");                      // a becomes most recently used
        c.put("d", 4);                   // evicts b (least recently used)
        System.out.println(c.keySet());  // [c, a, d]
        System.out.println(c.firstEntry() + " " + c.lastEntry()); // c=3 d=4 (Java 21 SequencedMap)
    }
}`],
    codeTitle: ['LRUCache via LinkedHashMap(accessOrder = true) + removeEldestEntry'],
    viz: {
      title: 'LRU cache: hash lookup + recency list',
      input: '3 | put a, put b, put c, get a, put d, get b, get c, put e, put a',
      inputLabel: 'capacity | ops (put X / get X), comma separated, max 20',
      gen: function (input) {
        var s = clean(input);
        if (s.indexOf('|') < 0) throw new Error('Format: capacity | put a, get a, ...');
        var p = s.split('|'), cap = Number(p[0].trim());
        if (isNaN(cap) || cap < 1 || cap > 6 || cap !== Math.floor(cap)) throw new Error('capacity must be 1..6');
        var ops = p[1].split(',').map(function (x) { return x.trim().split(/\s+/); }).filter(function (x) { return x[0]; });
        if (!ops.length || ops.length > 20 || ops.some(function (o) { return o.length !== 2 || !/^(put|get)$/i.test(o[0]) || !/^[A-Za-z0-9]{1,6}$/.test(o[1]); })) throw new Error('Each op must be "put X" or "get X" (max 20 ops)');
        var order = [], vals = {}, frames = [], counter = 0, hits = 0, misses = 0;
        function parts(hlList, hlMap, extra) {
          var arr = [{ type: 'list', label: 'doubly-linked list: head (eldest / LRU) → tail (youngest / MRU)', values: order.length ? order.slice() : ['(empty)'], hl: hlList || {} },
            { type: 'map', label: 'hash table (key → value), O(1) lookup', entries: order.map(function (k) { return [k, vals[k]]; }), hl: hlMap || {} },
            { type: 'vars', label: 'stats', vals: { size: order.length, capacity: cap, hits: hits, misses: misses } }];
          return extra ? arr.concat(extra) : arr;
        }
        frames.push({ narr: '<code>new LinkedHashMap&lt;&gt;(16, 0.75f, true)</code> with <code>removeEldestEntry → size() &gt; ' + cap + '</code>. The list on top is the recency order; the map below is the hash index.', parts: parts() });
        ops.forEach(function (o) {
          var op = o[0].toLowerCase(), k = o[1], pos = order.indexOf(k);
          if (op === 'get') {
            if (pos < 0) { misses++; frames.push({ narr: 'get(' + k + '): hash lookup finds nothing → returns <b>null</b> (a cache miss). The order does not change.', parts: parts({}, {}) }); return; }
            hits++;
            frames.push({ narr: 'get(' + k + '): found in O(1) via the hash table (a hit, value ' + vals[k] + '). In access-order mode, <code>afterNodeAccess</code> will now unlink it…', parts: parts(one(pos, 'cur'), one(k, 'cur')) });
            order.splice(pos, 1); order.push(k);
            frames.push({ narr: '…and relink it at the <b>tail</b>: it is now the most recently used. Just 4–6 pointer writes, no shifting.', parts: parts(one(order.length - 1, 'ok'), one(k, 'ok')) });
            return;
          }
          counter++;
          if (pos >= 0) {
            vals[k] = counter;
            order.splice(pos, 1); order.push(k);
            frames.push({ narr: 'put(' + k + ', ' + counter + '): key exists → value replaced. In access-order mode this also counts as an access, so ' + k + ' moves to the tail. No eviction check (nothing was inserted).', parts: parts(one(order.length - 1, 'ok'), one(k, 'ok')) });
            return;
          }
          vals[k] = counter; order.push(k);
          frames.push({ narr: 'put(' + k + ', ' + counter + '): new key → new entry linked at the <b>tail</b>. size = ' + order.length + '. Now <code>afterNodeInsertion</code> asks <code>removeEldestEntry(head = ' + order[0] + ')</code>: ' + order.length + ' &gt; ' + cap + '? <b>' + (order.length > cap) + '</b>.', parts: parts(one(order.length - 1, 'ok'), one(k, 'ok')) });
          if (order.length > cap) {
            var ev = order[0];
            frames.push({ narr: 'Evict the head <b>' + ev + '</b> — the least recently used entry. It is removed from both the list and its hash bucket.', parts: parts(one(0, 'bad'), one(ev, 'bad')) });
            order.shift(); delete vals[ev];
            frames.push({ narr: 'After eviction: ' + order.join(' → ') + '. The cache never exceeds ' + cap + ' entries.', parts: parts() });
          }
        });
        frames.push({ narr: 'Done. Iterating this map prints keys from LRU to MRU: <b>[' + order.join(', ') + ']</b>. Hits ' + hits + ', misses ' + misses + '.', parts: parts() });
        return frames;
      }
    },
    examples: [
      { title: 'Predict the output: insertion order ignores re-puts', html: `<p>In the default (insertion-order) mode, putting an existing key again <b>keeps its original position</b>; only remove + put moves it to the end.</p>`, code: `Map<String, Integer> m = new LinkedHashMap<>();
m.put("x", 1); m.put("y", 2); m.put("z", 3);
m.put("x", 9);                         // update in place, position unchanged
System.out.println(m);                 // {x=9, y=2, z=3}
m.remove("y"); m.put("y", 5);          // re-insert -> goes to the end
System.out.println(m);                 // {x=9, z=3, y=5}` },
      { title: 'Predict the output: access order after gets', html: `<p>With <code>accessOrder = true</code>, every get pulls the key to the tail. Plain iteration does <b>not</b> count as access.</p>
        ${H.table(['step', 'list (LRU → MRU)'], [['put a, b, c', 'a, b, c'], ['get(a)', 'b, c, a'], ['get(b)', 'c, a, b'], ['put(d)', 'c, a, b, d']])}`, code: `Map<String, Integer> m = new LinkedHashMap<>(16, 0.75f, true);
m.put("a", 1); m.put("b", 2); m.put("c", 3);
m.get("a"); m.get("b"); m.put("d", 4);
System.out.println(m.keySet());        // [c, a, b, d]` },
      { title: 'The CME trap: get() inside iteration', html: `<p>In access-order mode, <code>get</code> relinks the entry, which is a <b>structural modification</b> (modCount++). Calling it while iterating over <code>keySet()</code> throws <code>ConcurrentModificationException</code> on the next step. Iterate over <code>entrySet()</code> and use <code>e.getValue()</code> instead.</p>`, code: `Map<String, Integer> m = new LinkedHashMap<>(16, 0.75f, true);
m.put("a", 1); m.put("b", 2); m.put("c", 3);
try {
    for (String k : m.keySet()) System.out.println(k + "=" + m.get(k)); // get() moves k!
} catch (ConcurrentModificationException e) {
    System.out.println("CME");                                        // prints a=1 then CME
}
for (Map.Entry<String, Integer> e : m.entrySet()) System.out.println(e.getKey() + "=" + e.getValue()); // safe` },
      { title: 'First non-repeating character in a stream', html: `<p>An insertion-ordered set of "seen once" characters lets you answer "first unique so far" in O(1) each step: add on first sight, remove on second sight; the head of the set is the answer.</p>`, code: `String s = "aabcbd";
Set<Character> once = new LinkedHashSet<>(), seen = new HashSet<>();
StringBuilder out = new StringBuilder();
for (char ch : s.toCharArray()) {
    if (seen.add(ch)) once.add(ch); else once.remove(ch);
    out.append(once.isEmpty() ? '#' : once.iterator().next());
}
System.out.println(out);   // a#bbcc` }
    ],
    deepDive: `<p><b>How it hooks into HashMap.</b> HashMap's code calls three empty template methods: <code>afterNodeAccess</code> (after get/replace), <code>afterNodeInsertion</code> (after put → may evict via removeEldestEntry), and <code>afterNodeRemoval</code> (unlink from the list). LinkedHashMap overrides them and creates <code>LinkedHashMap.Entry</code> nodes (Node + before/after). That is the Template Method pattern inside the JDK.</p>
      <p><b>Memory cost.</b> Each entry gains two references (8 bytes with compressed oops) over a HashMap Node, plus head/tail fields. Iteration is O(size) instead of O(capacity + size), which is faster for sparse tables.</p>
      <p><b>Access-order subtleties.</b> <code>get</code> modifies structure, so even a "read-only" LRU must be externally synchronized for reads — a <code>ReadWriteLock</code> read lock around <code>get</code> is a <b>bug</b>: two readers can relink the list at the same time and corrupt it. <code>Collections.synchronizedMap(lru)</code> or a single <code>ReentrantLock</code> is correct but serializes everything. Calling <code>put</code> on an existing key also moves it; <code>containsKey</code> does not.</p>
      <p><b>removeEldestEntry rules.</b> It is called <i>after</i> the new entry is linked, with the current head. Returning true removes that one entry; for policies like "evict until under a byte budget", remove entries yourself in a loop and return false. Expired-entry checks (TTL) can also live here.</p>
      <p><b>Production caches.</b> LinkedHashMap LRU is fine for single-threaded or low-contention code. Real services use <b>Caffeine</b> (Window TinyLFU: an admission filter based on a frequency sketch beats plain LRU hit rates, especially against scans) with concurrent, amortized bookkeeping via ring buffers. Plain LRU suffers from <b>scan pollution</b>: one big sequential read evicts the whole hot set.</p>`,
    aiEra: `<p><b>What AI changes:</b> "Design an LRU cache" is the most-memorized interview problem on the internet, so AI produces it instantly. Interviewers therefore push on follow-ups: thread safety, TTL, LFU vs LRU, scan resistance, memory per entry. Those are where you show real understanding.</p>
      <p><b>Use AI as a partner:</b> <code>Generate a randomized test that compares my LRU cache against LinkedHashMap(accessOrder=true) for 10^5 random operations</code> — differential testing catches pointer bugs fast. Or ask it to explain Caffeine's W-TinyLFU and then check the explanation against the Caffeine wiki.</p>
      <p><b>Where AI goes wrong:</b> it often wraps an access-ordered LinkedHashMap in a ReadWriteLock and uses the read lock for get (corrupting the list), forgets <code>super(cap, 0.75f, true)</code> so the "LRU" is really FIFO, or evicts by checking <code>size() &gt;= capacity</code> (off by one). Reading the generated code line by line still matters.</p>`,
    problems: [{
      title: 'LRU Cache with O(1) get and put (hand-rolled)', level: 'Medium', tags: ['design', 'hashmap', 'doubly linked list'], companies: ['Amazon', 'Meta', 'Microsoft', 'Google', 'Bloomberg'],
      statement: `<p>Implement <code>LRUCache(int capacity)</code> with <code>int get(int key)</code> (value or −1) and <code>void put(int key, int value)</code>. When inserting beyond capacity, evict the least recently used key. Both operations must be <b>O(1)</b>. Do it without LinkedHashMap (interviewers usually ask for both versions).</p>`,
      constraints: `1 ≤ capacity ≤ 3000; 0 ≤ key ≤ 10<sup>4</sup>; up to 2·10<sup>5</sup> calls.`,
      example: `<p>cap 2: put(1,1), put(2,2), get(1) → ${H.c('g', '1')} (1 becomes MRU), put(3,3) evicts ${H.c('r', 'key 2')}, get(2) → ${H.c('r', '-1')}, put(4,4) evicts key 1, get(1) → -1, get(3) → 3, get(4) → 4.</p>`,
      brute: { why: `<p>Keep keys in an <code>ArrayList</code> ordered by recency: moving a key to the end needs <code>remove(Object)</code> — an O(n) search plus O(n) shift. With 2·10<sup>5</sup> calls and capacity 3000 that is ~6·10<sup>8</sup> element moves.</p>`, code: `class SlowLRU {
    private final int cap;
    private final java.util.Map<Integer, Integer> vals = new java.util.HashMap<>();
    private final java.util.List<Integer> order = new java.util.ArrayList<>();   // LRU at index 0
    SlowLRU(int cap) { this.cap = cap; }
    public int get(int k) {
        if (!vals.containsKey(k)) return -1;
        order.remove(Integer.valueOf(k)); order.add(k);                          // O(n)
        return vals.get(k);
    }
    public void put(int k, int v) {
        if (vals.containsKey(k)) order.remove(Integer.valueOf(k));
        else if (vals.size() == cap) vals.remove(order.remove(0));               // O(n) shift
        vals.put(k, v); order.add(k);
    }
}` },
      mcq: { q: 'Why a DOUBLY linked list and not a singly linked one?', options: ['To unlink a node in O(1) given only a pointer to it (we need its predecessor)', 'To iterate backwards for printing', 'Because Java has no singly linked list', 'To save memory'], answer: 0, explain: 'The hash map gives you the node directly. Removing it from the middle requires updating prev.next; with only next pointers you would have to search for prev in O(n).' },
      hints: [`<p>Hint 1: two structures: <code>HashMap&lt;Integer, Node&gt;</code> for O(1) find, and a doubly-linked list for recency (head = LRU, tail = MRU).</p>`, `<p>Hint 2: use <b>sentinel</b> head and tail nodes so you never special-case an empty list. Write two helpers: <code>unlink(node)</code> and <code>addLast(node)</code>.</p>`, `<p>Hint 3: get: miss → −1; hit → unlink + addLast. put: existing → update value, unlink + addLast; new → if size == capacity, remove <code>head.next</code> from list AND map; then create, addLast, map.put. Do not forget to delete the evicted key from the map.</p>`],
      solution: {
        approach: `<p>HashMap from key to node plus a sentinel-bounded doubly-linked list. Every access moves the node to the tail; eviction takes the node after the head sentinel. This is exactly what LinkedHashMap does internally.</p>`,
        code: `import java.util.HashMap;
import java.util.Map;

class LRUCacheManual {
    private static final class Node { int key, val; Node prev, next; Node(int k, int v) { key = k; val = v; } }
    private final int capacity;
    private final Map<Integer, Node> map = new HashMap<>();
    private final Node head = new Node(0, 0), tail = new Node(0, 0);   // sentinels

    LRUCacheManual(int capacity) {
        this.capacity = capacity;
        head.next = tail; tail.prev = head;
    }

    private void unlink(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }
    private void addLast(Node n) { n.prev = tail.prev; n.next = tail; tail.prev.next = n; tail.prev = n; }

    public int get(int key) {
        Node n = map.get(key);
        if (n == null) return -1;
        unlink(n); addLast(n);                 // now most recently used
        return n.val;
    }

    public void put(int key, int value) {
        Node n = map.get(key);
        if (n != null) { n.val = value; unlink(n); addLast(n); return; }
        if (map.size() == capacity) {
            Node lru = head.next;              // least recently used
            unlink(lru);
            map.remove(lru.key);
        }
        n = new Node(key, value);
        addLast(n);
        map.put(key, n);
    }

    public static void main(String[] args) {
        LRUCacheManual c = new LRUCacheManual(2);
        c.put(1, 1); c.put(2, 2);
        System.out.print(c.get(1) + " ");      // 1
        c.put(3, 3);                           // evicts 2
        System.out.print(c.get(2) + " ");      // -1
        c.put(4, 4);                           // evicts 1
        System.out.println(c.get(1) + " " + c.get(3) + " " + c.get(4)); // -1 3 4
    }
}`,
        alt: [{ lang: 'python', code: `from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.cap, self.d = capacity, OrderedDict()
    def get(self, key):
        if key not in self.d:
            return -1
        self.d.move_to_end(key)
        return self.d[key]
    def put(self, key, value):
        if key in self.d:
            self.d.move_to_end(key)
        self.d[key] = value
        if len(self.d) > self.cap:
            self.d.popitem(last=False)

c = LRUCache(2)
c.put(1, 1); c.put(2, 2); print(c.get(1)); c.put(3, 3); print(c.get(2))` }],
        dry: { head: ['call', 'list head→tail after', 'map keys', 'returns'], rows: [['put(1,1)', '1', '{1}', '-'], ['put(2,2)', '1 ⇄ 2', '{1,2}', '-'], ['get(1)', '2 ⇄ 1', '{1,2}', H.c('g', '1')], ['put(3,3)', H.c('r', 'evict 2') + ' → 1 ⇄ 3', '{1,3}', '-'], ['get(2)', '1 ⇄ 3', '{1,3}', H.c('r', '-1')], ['put(4,4)', H.c('r', 'evict 1') + ' → 3 ⇄ 4', '{3,4}', '-']] },
        complexity: `<p>O(1) per get/put (hash lookup + constant pointer updates). Space O(capacity).</p>`,
        followUps: ['Make it thread-safe — why is a ReadWriteLock read lock on get() wrong?', 'Add a TTL per entry', 'Turn it into LFU (evict least frequently used, ties by LRU) in O(1)']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — TreeMap red-black tree
     ===================================================================== */
  topics.push({
    title: 'TreeMap Internals: the Red-Black Tree & Navigable Queries',
    analogy: `<p>A <b>family tree that keeps itself tidy</b>. Every new person joins at the bottom in sorted position, wearing a <span class="c-r">red</span> badge ("new, maybe unstable"). Two rules keep the tree from leaning: a red person may not have a red child, and every path from the top to the bottom passes the same number of <b>black</b> badges. When a rule breaks, the family either <b>swaps badge colours</b> (cheap) or <b>rotates</b> a small group — a parent steps down and a child steps up, like re-hanging three picture frames — so no branch ever gets more than twice as long as another.</p>`,
    explain: `<p><code>TreeMap</code> stores entries in a <b>red-black tree</b>: a binary search tree (left &lt; node &lt; right, by <code>compareTo</code> or your <code>Comparator</code>) where each node has a colour bit. It obeys 4 rules:</p>
      <ol><li>Every node is red or black.</li><li>The <b>root is black</b>.</li><li>A <b>red node has no red child</b> (no two reds in a row).</li><li>Every path from a node down to a null leaf has the <b>same number of black nodes</b> (the "black height").</li></ol>
      <p>Rules 3 + 4 mean the longest path (alternating red/black) is at most <b>twice</b> the shortest (all black). So the height is ≤ <b>2·log₂(n + 1)</b> and every <code>get</code>, <code>put</code>, <code>remove</code>, <code>floorKey</code> … is <b>O(log n)</b> — guaranteed, not just on average.</p>
      <p><b>Insert recipe</b> (what <code>fixAfterInsertion</code> does): insert like a BST, colour the new node red. If its parent is red:</p>
      ${H.table(['case', 'situation', 'fix'], [['1', 'uncle is ' + H.c('r', 'RED'), 'recolour: parent + uncle → black, grandparent → red; continue from grandparent'], ['2', 'uncle black, zig-zag (inner child)', 'rotate at parent → becomes case 3'], ['3', 'uncle black, straight line', 'rotate at grandparent + swap colours → done']])}
      <p>At most <b>2 rotations</b> per insert (≤ 3 per delete); recolouring may bubble up O(log n) levels.</p>
      <p><b>What you get from the order</b> (NavigableMap), all O(log n):</p>
      ${H.table(['method', 'returns', 'map {10, 20, 30}'], [['floorKey(25)', 'greatest ≤ 25', '20'], ['ceilingKey(25)', 'least ≥ 25', '30'], ['lowerKey(20)', 'greatest &lt; 20', '10'], ['higherKey(20)', 'least &gt; 20', '30'], ['firstKey() / lastKey()', 'min / max', '10 / 30'], ['headMap(20) / tailMap(20)', 'views &lt; 20 / ≥ 20', '{10} / {20, 30}']])}`,
    clues: ['"sorted order" / "iterate keys in order" with frequent updates → TreeMap / TreeSet', '"closest value ≤ x" / "next bigger" / "floor / ceiling" → NavigableMap', '"range query: all keys between a and b" → subMap', '"guaranteed O(log n) worst case" (no hashing worst case) → balanced BST', '"book intervals without overlap" / "calendar" / "time-based key-value store" → floorEntry / ceilingEntry', '"two keys equal by compareTo but not equals" → TreeMap treats them as the SAME key'],
    code: [`
import java.util.Map;
import java.util.NavigableMap;
import java.util.TreeMap;

class TreeMapTour {
    public static void main(String[] args) {
        NavigableMap<Integer, String> prices = new TreeMap<>();
        prices.put(100, "basic"); prices.put(250, "plus"); prices.put(500, "pro"); prices.put(1000, "team");

        int budget = 300;
        Map.Entry<Integer, String> best = prices.floorEntry(budget);       // greatest price <= 300
        System.out.println("Can afford: " + best);                          // 250=plus
        System.out.println("Next tier: " + prices.ceilingKey(budget));      // 500
        System.out.println("Strictly above 500: " + prices.higherKey(500)); // 1000
        System.out.println("Below 100: " + prices.lowerKey(100));           // null
        System.out.println("Range [200, 600]: " + prices.subMap(200, true, 600, true)); // {250=plus, 500=pro}
        System.out.println("Descending: " + prices.descendingMap().keySet()); // [1000, 500, 250, 100]
        System.out.println("Cheapest: " + prices.pollFirstEntry() + ", left " + prices.keySet()); // 100=basic, [250, 500, 1000]
    }
}`, `
/** Minimal red-black insert — the same three cases as TreeMap.fixAfterInsertion. */
class RedBlackTree {
    static final boolean RED = true, BLACK = false;
    static final class Node {
        int key; boolean color = RED; Node left, right, parent;
        Node(int key, Node parent) { this.key = key; this.parent = parent; }
    }
    Node root;

    void insert(int key) {
        Node p = null, x = root;
        while (x != null) {                         // ordinary BST descent
            p = x;
            if (key < x.key) x = x.left; else if (key > x.key) x = x.right; else return;
        }
        Node z = new Node(key, p);
        if (p == null) root = z; else if (key < p.key) p.left = z; else p.right = z;
        fixAfterInsertion(z);
    }

    private void fixAfterInsertion(Node x) {
        while (x != root && x.parent.color == RED) {
            Node parent = x.parent, grand = parent.parent;
            if (parent == grand.left) {
                Node uncle = grand.right;
                if (uncle != null && uncle.color == RED) {          // case 1: recolour, move up
                    parent.color = BLACK; uncle.color = BLACK; grand.color = RED; x = grand;
                } else {
                    if (x == parent.right) { x = parent; rotateLeft(x); }   // case 2: zig-zag -> line
                    x.parent.color = BLACK; x.parent.parent.color = RED;      // case 3: line
                    rotateRight(x.parent.parent);
                }
            } else {                                                 // mirror image
                Node uncle = grand.left;
                if (uncle != null && uncle.color == RED) {
                    parent.color = BLACK; uncle.color = BLACK; grand.color = RED; x = grand;
                } else {
                    if (x == parent.left) { x = parent; rotateRight(x); }
                    x.parent.color = BLACK; x.parent.parent.color = RED;
                    rotateLeft(x.parent.parent);
                }
            }
        }
        root.color = BLACK;                                          // rule 2
    }

    private void rotateLeft(Node x) {
        Node y = x.right;
        x.right = y.left; if (y.left != null) y.left.parent = x;
        y.parent = x.parent;
        if (x.parent == null) root = y; else if (x == x.parent.left) x.parent.left = y; else x.parent.right = y;
        y.left = x; x.parent = y;
    }

    private void rotateRight(Node x) {
        Node y = x.left;
        x.left = y.right; if (y.right != null) y.right.parent = x;
        y.parent = x.parent;
        if (x.parent == null) root = y; else if (x == x.parent.right) x.parent.right = y; else x.parent.left = y;
        y.right = x; x.parent = y;
    }

    int height(Node n) { return n == null ? 0 : 1 + Math.max(height(n.left), height(n.right)); }

    public static void main(String[] args) {
        RedBlackTree t = new RedBlackTree();
        for (int i = 1; i <= 1_000_000; i++) t.insert(i);   // sorted input: worst case for a plain BST
        System.out.println("height = " + t.height(t.root)); // about 2*log2(n) at most (~40), a plain BST would be 1,000,000
    }
}`],
    codeTitle: ['NavigableMap API tour', 'Red-black insertion (TreeMap\'s algorithm, int keys)'],
    viz: {
      title: 'Red-black insertion: recolour and rotate (R = red, B = black)',
      input: '10 20 30 15 25 5 1 12 | 14',
      inputLabel: 'keys to insert (max 13 ints) | optional floorKey query',
      gen: function (input) {
        var s = clean(input), q = null;
        if (s.indexOf('|') >= 0) { var sp = s.split('|'); s = sp[0]; q = Number(sp[1].trim()); if (sp[1].trim() === '' || isNaN(q)) throw new Error('Query after | must be a number'); }
        var keys = s.split(/[\s,]+/).filter(function (x) { return x.length; }).map(Number);
        if (!keys.length || keys.length > 13 || keys.some(function (x) { return isNaN(x) || x !== Math.floor(x) || Math.abs(x) > 999; })) throw new Error('Give 1..13 integers between -999 and 999');
        var t = rbNew(), frames = [], tooDeep = false;
        function snap(narr, focus) {
          var a = rbArr(t, focus);
          if (!a) { tooDeep = true; return; }
          frames.push({ narr: narr, parts: [{ type: 'tree', label: 'TreeMap (red nodes highlighted red, amber = node being fixed)', arr: a.arr, hl: a.hl, tags: a.tags }, { type: 'vars', label: 'tree stats', vals: { size: t.size, height: rbHeight(t.root), 'black height': t.root ? rbBlackHeight(t.root) - 1 : 0, 'max allowed height 2·log₂(n+1)': (2 * Math.log2(t.size + 1)).toFixed(1) } }] });
        }
        frames.push({ narr: 'Empty TreeMap: <code>root = null</code>. We insert ' + keys.join(', ') + ' one by one. Watch for the two repair moves: <b>recolour</b> and <b>rotate</b>.', parts: [{ type: 'text', label: 'TreeMap', html: '<span class="c-m">(empty tree)</span>' }] });
        keys.forEach(function (k) { if (!tooDeep) rbInsert(t, k, snap); });
        if (tooDeep) throw new Error('That sequence makes the tree too deep to draw; try fewer keys');
        var a = rbArr(t);
        frames.push({ narr: 'All inserted. Check the rules: root is black ✔, no red node has a red child ✔, every root-to-null path has the same number of black nodes ✔ (black height ' + (rbBlackHeight(t.root) - 1) + '). Height ' + rbHeight(t.root) + ' for ' + t.size + ' keys.', parts: [{ type: 'tree', label: 'final red-black tree', arr: a.arr, hl: a.hl, tags: a.tags }] });
        if (q !== null) {
          var n = t.root, best = null, path = [];
          while (n) {
            path.push(n.k);
            var ex = {}; path.forEach(function (pk) { ex[pk] = 'done'; }); if (best !== null) ex[best] = 'sel';
            var ar = rbArr(t, n.k, ex);
            var dir = q < n.k ? 'left (' + q + ' &lt; ' + n.k + ')' : q > n.k ? 'right — and ' + n.k + ' is a new best candidate (≤ ' + q + ')' : 'exact match!';
            if (q >= n.k) best = n.k;
            frames.push({ narr: 'floorKey(' + q + '): at node <b>' + n.k + '</b> → go ' + dir + '. Best so far: <b>' + (best === null ? 'none' : best) + '</b>.', parts: [{ type: 'tree', label: 'floorKey search path', arr: ar.arr, hl: ar.hl, tags: ar.tags }, { type: 'vars', label: 'search', vals: { query: q, current: n.k, best: best === null ? 'null' : best }, hl: { best: 'sel' } }] });
            if (q === n.k) break;
            n = q < n.k ? n.l : n.r;
          }
          frames.push({ narr: 'floorKey(' + q + ') = <b>' + (best === null ? 'null' : best) + '</b>. One root-to-leaf walk: O(height) = O(log n). Remember the last node where we went right — that is the floor.', parts: [{ type: 'vars', label: 'answer', vals: one('floorKey(' + q + ')', best === null ? 'null' : best), hl: one('floorKey(' + q + ')', 'sel') }] });
        }
        return frames;
      }
    },
    examples: [
      { title: 'Sorted input: plain BST vs red-black tree', html: `<p>Insert 1, 2, 3, 4, 5, 6, 7. A plain BST becomes a 7-level "linked list leaning right" (O(n) searches). The red-black tree rotates at 3, then recolours, rotates again … and ends with height <b>4</b>, root 2:</p>
        ${H.table(['structure', 'height after 1..7', 'height after 1..10<sup>6</sup>'], [['plain BST', H.c('r', '7'), H.c('r', '1,000,000')], ['red-black tree (TreeMap)', H.c('g', '4'), H.c('g', '≤ 40')]])}` },
      { title: 'Predict the output: BigDecimal in HashSet vs TreeSet', html: `<p><code>new BigDecimal("1.0").equals(new BigDecimal("1.00"))</code> is <b>false</b> (different scale), but <code>compareTo</code> returns <b>0</b>. HashSet uses equals/hashCode; TreeSet uses only compareTo. Same data, different sizes!</p>`, code: `Set<java.math.BigDecimal> hs = new HashSet<>(), ts = new TreeSet<>();
for (String s : new String[]{"1.0", "1.00"}) { hs.add(new java.math.BigDecimal(s)); ts.add(new java.math.BigDecimal(s)); }
System.out.println(hs.size() + " " + ts.size());   // 2 1` },
      { title: 'A comparator that silently corrupts the tree', html: `<p><code>(a, b) -&gt; a - b</code> overflows: for a = Integer.MIN_VALUE, b = 1 it returns a large <i>positive</i> number, claiming MIN_VALUE &gt; 1. The tree's ordering becomes inconsistent and lookups miss keys. Always use <code>Integer.compare</code> or <code>Comparator.comparingInt</code>.</p>`, code: `Comparator<Integer> bad = (a, b) -> a - b;
Comparator<Integer> good = Integer::compare;
System.out.println(bad.compare(Integer.MIN_VALUE, 1) > 0);   // true  (wrong!)
System.out.println(good.compare(Integer.MIN_VALUE, 1) > 0);  // false (correct)` },
      { title: 'Counting keys in a range is O(log n + k), not O(log n)', html: `<p><code>subMap(a, b)</code> is a cheap O(log n) <b>view</b>, but its <code>size()</code> walks the range (O(k)). For many "how many keys in [a, b]?" queries on large data, use a Fenwick tree over compressed coordinates, or an order-statistic tree.</p>`, code: `TreeMap<Integer, String> events = new TreeMap<>();
for (int t = 0; t < 1000; t += 10) events.put(t, "e" + t);
NavigableMap<Integer, String> window = events.subMap(100, true, 200, false);  // live view
System.out.println(window.size() + " " + window.firstKey());  // 10 100
events.put(150 + 5, "late");                                   // visible through the view
System.out.println(window.size());                             // 11` },
      { title: 'Null keys and the Comparator contract', html: `<p>With natural ordering, <code>put(null, v)</code> throws <code>NullPointerException</code> (it calls compareTo). Values may be null. With <code>Comparator.nullsFirst(Comparator.naturalOrder())</code> null keys become legal. Since Java 7, even the <i>first</i> put into an empty TreeMap type-checks the key by comparing it with itself.</p>` }
    ],
    deepDive: `<p><b>Height proof sketch.</b> Let bh = black height of the root. A subtree with black height bh has at least 2<sup>bh</sup> − 1 internal nodes (induction). Since reds cannot be adjacent, at least half the nodes on any root-to-leaf path are black, so bh ≥ h/2. Therefore n ≥ 2<sup>h/2</sup> − 1 → h ≤ 2·log₂(n + 1). For a million keys: h ≤ 40 (in practice ~20–25).</p>
      <p><b>Entry layout.</b> <code>TreeMap.Entry</code> has key, value, left, right, parent and a boolean colour — about 40 bytes with compressed oops, more than a HashMap Node, and every lookup chases ~log n pointers through scattered memory (cache misses). That is why HashMap usually beats TreeMap by 3–10× for pure lookups; choose TreeMap for <b>ordering</b>, not speed.</p>
      <p><b>Red-black vs AVL vs skip list.</b> AVL keeps height ≤ 1.44·log₂n (faster lookups) but rotates more on updates. Red-black does ≤ 2 rotations per insert and ≤ 3 per delete, which suits write-heavy maps (also used in Linux's CFS scheduler and in HashMap tree bins). <code>ConcurrentSkipListMap</code> is the concurrent sorted map — skip lists are far easier to make lock-free than rotating trees.</p>
      <p><b>Consistency with equals.</b> TreeMap uses <i>only</i> compareTo/compare. If that ordering is "inconsistent with equals" (BigDecimal, case-insensitive comparators), the map still works as a map over the comparator's equivalence classes but breaks the general <code>Map</code> contract — e.g. <code>treeMap.equals(hashMap)</code> may be false with "the same" entries.</p>
      <p><b>Views and iteration.</b> keySet/entrySet/subMap/headMap/descendingMap are live views. Iteration uses <code>successor()</code>: amortized O(1) per step, O(n) for a full pass. Iterators are fail-fast via modCount. <code>put</code> on an existing key just replaces the value — no rotations. Java 21 retrofits <code>SequencedMap</code>; <code>putFirst</code>/<code>putLast</code> throw <code>UnsupportedOperationException</code> because a sorted map decides positions itself.</p>`,
    aiEra: `<p><b>What AI changes:</b> nobody hand-codes red-black deletion at work, and AI can generate it on demand. Interviews therefore test whether you can <b>explain the invariants and why they bound the height</b>, and whether you reach for <code>floorKey/ceilingKey</code> instead of writing a binary search over a sorted list that is O(n) to update.</p>
      <p><b>Use AI as a partner:</b> <code>Write a property-based test that inserts random keys into my red-black tree and checks the 4 invariants after every operation</code>. Invariant checkers are short, mechanical and perfect to delegate; then read the checker carefully, because a weak checker gives false confidence.</p>
      <p><b>Where AI goes wrong:</b> it mixes up left-leaning red-black trees (Sedgewick, 2-3 trees) with the CLRS/TreeMap variant, claims TreeMap allows null keys, writes comparators with subtraction, or says <code>subMap().size()</code> is O(log n). Ask for sources and check the JDK Javadoc.</p>`,
    problems: [{
      title: 'My Calendar I (no double booking)', level: 'Medium', tags: ['treemap', 'intervals', 'floor/ceiling'], companies: ['Google', 'Uber', 'Amazon'],
      statement: `<p>Implement <code>MyCalendar</code> with <code>boolean book(int start, int end)</code> for half-open intervals [start, end). Return true and store the event if it does <b>not overlap</b> any existing event; otherwise return false and do not store it.</p>`,
      constraints: `0 ≤ start &lt; end ≤ 10<sup>9</sup>; up to 10<sup>5</sup> calls to book.`,
      example: `<p>book(10,20) → ${H.c('g', 'true')}; book(15,25) → ${H.c('r', 'false')} (15 lies inside [10,20)); book(20,30) → ${H.c('g', 'true')} (touching at 20 is fine because intervals are half-open).</p>`,
      brute: { why: `<p>Keep a list of events and check every one for overlap: O(n) per call → 5·10<sup>9</sup> comparisons for 10<sup>5</sup> calls. Most comparisons are wasted on events nowhere near the new one — only the immediate neighbours in start order can overlap.</p>`, code: `class SlowCalendar {
    private final java.util.List<int[]> events = new java.util.ArrayList<>();
    public boolean book(int start, int end) {
        for (int[] e : events) if (start < e[1] && e[0] < end) return false;   // overlap test
        events.add(new int[]{start, end});
        return true;
    }
}` },
      mcq: { q: 'Events are stored in a TreeMap&lt;start, end&gt;. Which existing events can possibly overlap a new [s, e)?', options: ['Only floorEntry(s) and ceilingEntry(s) — the neighbours around s', 'All events with start < e', 'Only the first and last events', 'Any event; you must scan them all'], answer: 0, explain: 'Booked events never overlap each other, so they are sorted by start AND by end. The one just before s (floor) might end after s; the one just after s (ceiling) might start before e. Everything else is further away.' },
      hints: [`<p>Hint 1: since stored events never overlap, sorting by start also sorts them by end. Only neighbours of the new start can clash.</p>`, `<p>Hint 2: <code>TreeMap&lt;Integer, Integer&gt;</code> start → end. prev = floorEntry(start), next = ceilingEntry(start).</p>`, `<p>Hint 3: clash if <code>prev != null &amp;&amp; prev.getValue() &gt; start</code> or <code>next != null &amp;&amp; next.getKey() &lt; end</code>. Half-open intervals mean equality is fine. Otherwise put(start, end).</p>`],
      solution: {
        approach: `<p>Keep non-overlapping events in a TreeMap keyed by start. A new interval only needs checking against its floor and ceiling neighbours, each found in O(log n) by walking the red-black tree.</p>`,
        code: `import java.util.Map;
import java.util.TreeMap;

class MyCalendar {
    private final TreeMap<Integer, Integer> cal = new TreeMap<>();   // start -> end

    public boolean book(int start, int end) {
        Map.Entry<Integer, Integer> prev = cal.floorEntry(start);    // starts at or before 'start'
        Map.Entry<Integer, Integer> next = cal.ceilingEntry(start);  // starts at or after 'start'
        if (prev != null && prev.getValue() > start) return false;   // previous event still running
        if (next != null && next.getKey() < end) return false;       // next event starts too early
        cal.put(start, end);
        return true;
    }

    public static void main(String[] args) {
        MyCalendar c = new MyCalendar();
        System.out.println(c.book(10, 20) + " " + c.book(15, 25) + " " + c.book(20, 30)); // true false true
        System.out.println(c.book(5, 10) + " " + c.book(5, 11));                          // true false
    }
}`,
        alt: [{ lang: 'python', code: `import bisect

class MyCalendar:
    def __init__(self):
        self.starts, self.ends = [], []
    def book(self, s, e):
        i = bisect.bisect_right(self.starts, s)
        if i > 0 and self.ends[i - 1] > s:
            return False
        if i < len(self.starts) and self.starts[i] < e:
            return False
        self.starts.insert(i, s)   # O(n) insert: fine in Python for moderate n
        self.ends.insert(i, e)
        return True

c = MyCalendar()
print(c.book(10, 20), c.book(15, 25), c.book(20, 30))` }],
        dry: { head: ['call', 'floorEntry', 'ceilingEntry', 'verdict', 'map after'], rows: [['book(10,20)', 'null', 'null', H.c('g', 'true'), '{10=20}'], ['book(15,25)', '10=20 (20 &gt; 15)', 'null', H.c('r', 'false'), '{10=20}'], ['book(20,30)', '10=20 (20 &gt; 20? no)', 'null', H.c('g', 'true'), '{10=20, 20=30}'], ['book(5,10)', 'null', '10=20 (10 &lt; 10? no)', H.c('g', 'true'), '{5=10, 10=20, 20=30}'], ['book(5,11)', '5=10 (10 &gt; 5)', '-', H.c('r', 'false'), 'unchanged']] },
        complexity: `<p>O(log n) per book (two tree searches + one insert with ≤ 2 rotations). Space O(n).</p>`,
        followUps: ['My Calendar II: allow double but not triple booking (sweep with a TreeMap of +1/−1 deltas)', 'Return the conflicting event instead of false', 'Support cancel(start) — what changes?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — PriorityQueue binary heap
     ===================================================================== */
  topics.push({
    title: 'PriorityQueue Internals: a Binary Heap Living in an Array',
    analogy: `<p>A <b>hospital emergency room</b>. Patients do not leave in arrival order — the most urgent one is always seen next. The triage nurse does not keep everyone in perfect sorted order (too much work); she only guarantees that <b>every patient is less urgent than the person "above" them</b> in the chart. A new patient starts at the bottom and is <b>bumped up</b> past anyone less urgent. When the top patient leaves, the last arrival temporarily takes the top spot and <b>sinks down</b> until things are right again.</p>`,
    explain: `<p><code>PriorityQueue</code> is a <b>binary min-heap</b> stored in a plain <code>Object[] queue</code> (default capacity 11). There are no node objects — the tree shape is implied by indexes:</p>
      ${H.table(['relation', 'formula', 'example (i = 1)'], [['parent', '(i − 1) &gt;&gt;&gt; 1', '0'], ['left child', '2i + 1', '3'], ['right child', '2i + 2', '4']])}
      ${H.arr([1, 3, 2, 5, 9, 8], { label: 'queue[] — a valid min-heap', hl: { 0: 'g' } })}
      <p>The only rule (heap property): <b>every parent ≤ its children</b>. Siblings are not ordered, so the array is <i>not</i> sorted — but the smallest element is always at index 0.</p>
      ${H.table(['operation', 'cost', 'how'], [['peek()', H.c('g', 'O(1)'), 'return queue[0]'], ['offer(x)', H.c('g', 'O(log n)'), 'put at the end, <b>sift up</b> while smaller than parent'], ['poll()', H.c('g', 'O(log n)'), 'take root, move last element to root, <b>sift down</b> to the smaller child'], ['remove(Object) / contains', H.c('r', 'O(n)'), 'linear scan to find it'], ['new PriorityQueue&lt;&gt;(collection)', H.c('g', 'O(n)'), 'bottom-up heapify'], ['iterator / toString', 'O(n)', H.c('r', 'array order, NOT sorted')]])}
      <p>Want a <b>max-heap</b>? Pass a comparator: <code>new PriorityQueue&lt;&gt;(Comparator.reverseOrder())</code>. Ordering comes from <code>compareTo</code> or the comparator; null elements are not allowed. It is <b>not thread-safe</b> (use <code>PriorityBlockingQueue</code>) and <b>not stable</b> (equal priorities come out in no guaranteed order).</p>`,
    clues: ['"k largest / k smallest / top k" → heap of size k: O(n log k)', '"repeatedly take the minimum (or maximum)" → PriorityQueue', '"merge k sorted lists / streams" → heap of k heads', '"median of a data stream" → two heaps', '"schedule by deadline / priority", "Dijkstra", "event simulation" → min-heap', '"iterating a PriorityQueue prints unsorted values" → array order, only poll() is ordered'],
    code: [`
import java.util.Arrays;
import java.util.NoSuchElementException;

/** The same algorithm as java.util.PriorityQueue for ints (min-heap). */
class IntMinHeap {
    private int[] queue = new int[11];          // default capacity 11, like the JDK
    private int size;

    public void offer(int x) {
        if (size == queue.length) {
            int old = queue.length;
            queue = Arrays.copyOf(queue, old + (old < 64 ? old + 2 : old >> 1)); // JDK growth rule
        }
        siftUp(size++, x);
    }

    public int peek() { if (size == 0) throw new NoSuchElementException(); return queue[0]; }

    public int poll() {
        if (size == 0) throw new NoSuchElementException();
        int result = queue[0];
        int last = queue[--size];               // take the last element out...
        if (size > 0) siftDown(0, last);        // ...and let it sink from the root
        return result;
    }

    /** "Hole" technique: move parents down, write x once at the end (fewer writes than swapping). */
    private void siftUp(int k, int x) {
        while (k > 0) {
            int parent = (k - 1) >>> 1;
            if (x >= queue[parent]) break;      // heap property holds
            queue[k] = queue[parent];           // parent slides down into the hole
            k = parent;
        }
        queue[k] = x;
    }

    private void siftDown(int k, int x) {
        int half = size >>> 1;                  // nodes at index >= half are leaves
        while (k < half) {
            int child = 2 * k + 1, right = child + 1;
            if (right < size && queue[right] < queue[child]) child = right;  // pick the smaller child
            if (x <= queue[child]) break;
            queue[k] = queue[child];            // child moves up into the hole
            k = child;
        }
        queue[k] = x;
    }

    public int size() { return size; }

    public static void main(String[] args) {
        IntMinHeap h = new IntMinHeap();
        for (int v : new int[]{5, 1, 4, 2, 3, 9, 0}) h.offer(v);
        StringBuilder sb = new StringBuilder();
        while (h.size() > 0) sb.append(h.poll()).append(' ');
        System.out.println(sb.toString().trim());   // 0 1 2 3 4 5 9
    }
}`, `
import java.util.*;

class PQRecipes {
    public static void main(String[] args) {
        // Max-heap: reverse the comparator (never write (a, b) -> b - a : it can overflow)
        PriorityQueue<Integer> max = new PriorityQueue<>(Comparator.reverseOrder());
        max.addAll(List.of(3, 9, 1, 7));
        System.out.println(max.poll() + " " + max.poll());          // 9 7

        // Top-3 largest of a stream with a size-3 MIN-heap: O(n log k)
        PriorityQueue<Integer> top = new PriorityQueue<>();
        for (int x : new int[]{4, 10, 2, 8, 15, 6, 11}) {
            top.offer(x);
            if (top.size() > 3) top.poll();                          // drop the smallest
        }
        System.out.println(top.peek() + " is the 3rd largest");      // 10 is the 3rd largest

        // Records ordered by priority, then by arrival sequence (makes it FIFO among equals)
        record Task(int priority, long seq, String name) {}
        PriorityQueue<Task> tasks = new PriorityQueue<>(
            Comparator.comparingInt(Task::priority).thenComparingLong(Task::seq));
        long seq = 0;
        tasks.add(new Task(2, seq++, "email")); tasks.add(new Task(1, seq++, "deploy")); tasks.add(new Task(2, seq++, "lunch"));
        while (!tasks.isEmpty()) System.out.print(tasks.poll().name() + " ");   // deploy email lunch
        System.out.println();
    }
}`],
    codeTitle: ['IntMinHeap — JDK siftUp/siftDown with the "hole" trick', 'PriorityQueue recipes: max-heap, top-k, stable ordering'],
    viz: {
      title: 'Heap as tree AND array: sift up on offer, sift down on poll',
      input: '5 3 8 1 9 2 poll poll 0 7',
      inputLabel: 'numbers to offer and the word "poll" (max 24 tokens, at most 20 elements in the heap)',
      gen: function (input) {
        var toks = clean(input).split(/[\s,]+/).filter(function (x) { return x.length; });
        if (!toks.length || toks.length > 24) throw new Error('Give 1..24 tokens: numbers or "poll"');
        var ops = toks.map(function (x) { if (/^poll$/i.test(x)) return 'poll'; var v = Number(x); if (isNaN(v) || v !== Math.floor(v) || Math.abs(v) > 999) throw new Error('Tokens must be integers (-999..999) or "poll"'); return v; });
        var h = [], frames = [], cap = 11, polled = [];
        function parts(hl, extra, label) {
          var th = {}; Object.keys(hl || {}).forEach(function (k) { th[k] = hl[k]; });
          var arr = [{ type: 'tree', label: label || 'heap as a tree (parent ≤ children)', arr: h.length ? h.slice() : [], hl: th },
            { type: 'array', label: 'queue[] (what is really stored)', values: h.length ? h.slice() : ['(empty)'], hl: hl || {} },
            { type: 'vars', label: 'PriorityQueue fields', vals: { size: h.length, 'queue.length (capacity)': cap, 'polled so far': polled.length ? polled.join(' ') : '-' } }];
          return extra ? arr.concat(extra) : arr;
        }
        frames.push({ narr: '<code>new PriorityQueue&lt;Integer&gt;()</code>: an empty <code>Object[11]</code>. Natural ordering → min-heap: the smallest value always sits at index 0.', parts: parts({}) });
        ops.forEach(function (op) {
          if (op === 'poll') {
            if (!h.length) { frames.push({ narr: 'poll() on an empty queue returns <b>null</b> (remove() would throw NoSuchElementException).', parts: parts({}) }); return; }
            var top = h[0]; polled.push(top);
            frames.push({ narr: 'poll(): the answer is the root <b>' + top + '</b> (the minimum). Now fill the hole: move the <b>last</b> element to the root.', parts: parts(one(0, 'sel')) });
            var last = h.pop();
            if (!h.length) { frames.push({ narr: 'That was the only element; the heap is empty again.', parts: parts({}) }); return; }
            h[0] = last; var k = 0;
            frames.push({ narr: 'Last element <b>' + last + '</b> now sits at the root — probably too big. <b>Sift down</b>: compare with the smaller child.', parts: parts(one(0, 'cur')) });
            while (true) {
              var l = 2 * k + 1, r = l + 1, c = l;
              if (l >= h.length) break;
              if (r < h.length && h[r] < h[l]) c = r;
              var hl = {}; hl[k] = 'cur'; hl[l] = 'win'; if (r < h.length) hl[r] = 'win'; hl[c] = 'ok';
              if (h[k] <= h[c]) { frames.push({ narr: h[k] + ' ≤ smaller child ' + h[c] + ' → heap property holds, stop. Sift-down took at most log₂(n) levels.', parts: parts(hl) }); break; }
              frames.push({ narr: 'Children of ' + h[k] + ': ' + h[l] + (r < h.length ? ' and ' + h[r] : '') + '. Smaller child is <b>' + h[c] + '</b> &lt; ' + h[k] + ' → swap them (the JDK moves the child up into the "hole").', parts: parts(hl) });
              var tmp = h[k]; h[k] = h[c]; h[c] = tmp; k = c;
            }
            frames.push({ narr: 'poll() returned <b>' + top + '</b>. New minimum at the root: <b>' + h[0] + '</b>.', parts: parts(one(0, 'ok')) });
            return;
          }
          if (h.length >= 20) throw new Error('Keep at most 20 elements in the heap (add some polls)');
          if (h.length === cap) { var oc = cap; cap = cap + (cap < 64 ? cap + 2 : cap >> 1); frames.push({ narr: 'Array full (' + oc + ') → grow: capacity &lt; 64 so new capacity = ' + oc + ' + (' + oc + ' + 2) = <b>' + cap + '</b>.', parts: parts({}) }); }
          h.push(op); var i = h.length - 1;
          frames.push({ narr: 'offer(' + op + '): place it in the next free slot, index ' + i + ' (the next position in the bottom level, keeping the tree complete).', parts: parts(one(i, 'ok')) });
          while (i > 0) {
            var p = (i - 1) >> 1, hl2 = {}; hl2[i] = 'cur'; hl2[p] = 'win';
            if (h[p] <= h[i]) { frames.push({ narr: 'Parent ' + h[p] + ' (index ' + p + ') ≤ ' + h[i] + ' → stop sifting up.', parts: parts(hl2) }); break; }
            frames.push({ narr: h[i] + ' &lt; parent ' + h[p] + ' (index ' + p + ' = (' + i + ' − 1) &gt;&gt;&gt; 1) → swap: the smaller value bubbles up.', parts: parts(hl2) });
            var t2 = h[i]; h[i] = h[p]; h[p] = t2; i = p;
          }
          if (i === 0 && h.length > 1) frames.push({ narr: op + ' reached the root — it is the new minimum.', parts: parts(one(0, 'ok')) });
        });
        frames.push({ narr: 'Final array: [' + h.join(', ') + ']. Note it is <b>not sorted</b> — <code>System.out.println(pq)</code> prints this array order. Only repeated poll() gives sorted output.', parts: parts({}) });
        return frames;
      }
    },
    examples: [
      { title: 'Predict the output: printing a PriorityQueue', html: `<p>Offer 5, 1, 4, 2, 3. Sift-ups: 1 swaps with 5; 4 stays; 2 swaps with 5; 3 stays under 2. The array — and therefore <code>toString()</code> — is <b>[1, 2, 4, 5, 3]</b>, not sorted.</p>
        ${H.arr([1, 2, 4, 5, 3], { label: 'queue[] after the offers', hl: { 0: 'g' } })}`, code: `PriorityQueue<Integer> pq = new PriorityQueue<>(List.of(5));
for (int x : new int[]{1, 4, 2, 3}) pq.offer(x);
System.out.println(pq);                 // [1, 2, 4, 5, 3]
StringBuilder sb = new StringBuilder();
while (!pq.isEmpty()) sb.append(pq.poll()).append(' ');
System.out.println(sb.toString().trim()); // 1 2 3 4 5` },
      { title: 'Heapify is O(n), not O(n log n)', html: `<p><code>new PriorityQueue&lt;&gt;(list)</code> runs Floyd's bottom-up heapify: sift down each non-leaf from index n/2 − 1 to 0. Half the nodes are leaves (0 work), a quarter move ≤ 1 level, an eighth ≤ 2 … The total ∑ n/2<sup>h+1</sup>·h ≤ n. Offering n items one by one is O(n log n).</p>
        ${H.table(['level from bottom', 'nodes', 'max moves', 'work'], [['0 (leaves)', 'n/2', '0', '0'], ['1', 'n/4', '1', 'n/4'], ['2', 'n/8', '2', 'n/4'], ['3', 'n/16', '3', '3n/16']])}` },
      { title: 'Dijkstra without decrease-key: lazy deletion', html: `<p>PriorityQueue has no decrease-key, and <code>remove(Object)</code> is O(n). The standard trick: push a new (distance, node) pair whenever you find a shorter path, and when polling <b>skip stale pairs</b> whose distance is larger than the best known.</p>`, code: `int n = 4;
int[][] edges = {{0, 1, 4}, {0, 2, 1}, {2, 1, 2}, {1, 3, 1}};
List<List<int[]>> g = new ArrayList<>();
for (int i = 0; i < n; i++) g.add(new ArrayList<>());
for (int[] e : edges) g.get(e[0]).add(new int[]{e[1], e[2]});
int[] dist = new int[n]; Arrays.fill(dist, Integer.MAX_VALUE); dist[0] = 0;
PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[0]));
pq.add(new int[]{0, 0});
while (!pq.isEmpty()) {
    int[] cur = pq.poll();
    if (cur[0] > dist[cur[1]]) continue;              // stale entry: skip (lazy deletion)
    for (int[] e : g.get(cur[1]))
        if (cur[0] + e[1] < dist[e[0]]) { dist[e[0]] = cur[0] + e[1]; pq.add(new int[]{dist[e[0]], e[0]}); }
}
System.out.println(Arrays.toString(dist));             // [0, 3, 1, 4]` },
      { title: 'Equal priorities are not FIFO', html: `<p>A heap is not stable: two tasks with the same priority can come out in either order depending on the array layout. If order matters (e.g. job scheduling fairness), add a monotonically increasing sequence number as a tie-breaker, as in the recipes code above.</p>` }
    ],
    deepDive: `<p><b>Why an array works.</b> A heap is a <i>complete</i> binary tree (every level full except the last, filled left to right), so there are no gaps and index arithmetic replaces pointers. That gives great cache locality and zero per-node object overhead (only the element references).</p>
      <p><b>JDK details.</b> <code>siftUpComparable</code>/<code>siftDownComparable</code> vs the comparator versions; the "hole" technique writes each moved element once. <code>poll()</code> nulls out the last slot for GC. Growth: <code>old &lt; 64 ? old + 2 : old &gt;&gt; 1</code> extra → 11 → 24 → 50 → 102 → 153 → 229. <code>removeAt(i)</code> (used by <code>remove(Object)</code> and the iterator) moves the last element into the gap and sifts it down, and if it did not move, up. The iterator walks the array and handles the rare case where removal moves an unvisited element backwards (the <code>forgetMeNot</code> deque).</p>
      <p><b>Complexities that surprise people.</b> <code>contains</code> and <code>remove(Object)</code> are O(n). <code>addAll</code> on an existing PQ is n × O(log n), but the constructor from a Collection/SortedSet/PQ is O(n) (and a SortedSet or PriorityQueue source is copied without re-heapifying). <code>toArray()</code> and iteration are unordered; to get sorted output, poll repeatedly (heap sort, O(n log n)) or copy and <code>Arrays.sort</code>.</p>
      <p><b>Variants.</b> <code>PriorityBlockingQueue</code> (one ReentrantLock, unbounded, blocking take), <code>DelayQueue</code> (elements become available after a delay — built on a PQ), <code>ScheduledThreadPoolExecutor</code>'s DelayedWorkQueue (a heap that records each task's index for O(log n) cancellation). d-ary heaps (4-ary) have shallower trees and better cache behaviour; pairing/Fibonacci heaps offer cheaper decrease-key in theory but are rarely faster in practice.</p>
      <p><b>Mutation hazard.</b> If you change a field that the comparator reads while the object is inside the heap, the heap property silently breaks: poll returns wrong elements. Remove, mutate, re-add — or use immutable records.</p>`,
    aiEra: `<p><b>What AI changes:</b> "top K" and "merge K sorted" are solved instantly by assistants. What still separates candidates: choosing the <b>size-K min-heap</b> (O(n log k)) over sorting everything (O(n log n)), knowing heapify is O(n), and spotting the O(n) <code>remove(Object)</code> hidden inside a loop of generated code.</p>
      <p><b>Use AI as a partner:</b> <code>Generate adversarial inputs (all equal, sorted, reverse sorted, extreme ints) for my top-K function</code>, or <code>Convert this Dijkstra to lazy deletion and explain why stale entries are safe to skip</code>.</p>
      <p><b>Where AI goes wrong:</b> it writes <code>(a, b) -&gt; b - a</code> max-heap comparators (overflow with large values), prints a PriorityQueue expecting sorted output, claims the iterator returns elements in priority order, or uses <code>pq.remove(x)</code> to implement decrease-key inside a hot loop. You catch these by knowing the array model.</p>`,
    problems: [{
      title: 'K-th Largest Element in a Stream', level: 'Easy', tags: ['heap', 'priority queue', 'design'], companies: ['Amazon', 'Meta', 'Adobe'],
      statement: `<p>Design <code>KthLargest(int k, int[] nums)</code> with <code>int add(int val)</code> that adds val to the stream and returns the current <b>k-th largest</b> element (counting duplicates).</p>`,
      constraints: `1 ≤ k ≤ 10<sup>4</sup>; up to 10<sup>4</sup> initial numbers and 10<sup>4</sup> add calls; it is guaranteed there are at least k elements when add returns.`,
      example: `<p>k = 3, nums = [4, 5, 8, 2]. add(3) → ${H.c('g', '4')}, add(5) → ${H.c('g', '5')}, add(10) → 5, add(9) → 8, add(4) → 8. After add(3) the stream sorted descending is 8, 5, ${H.c('g', '4')}, 3, 2.</p>`,
      brute: { why: `<p>Keep every value in a list and sort it on each add: O(n log n) per call, ~10<sup>4</sup> × 2·10<sup>4</sup> log → about 3·10<sup>9</sup> operations. We only ever need the top k values; everything smaller is dead weight.</p>`, code: `class SlowKthLargest {
    private final int k;
    private final java.util.List<Integer> all = new java.util.ArrayList<>();
    SlowKthLargest(int k, int[] nums) { this.k = k; for (int x : nums) all.add(x); }
    public int add(int val) {
        all.add(val);
        all.sort(java.util.Collections.reverseOrder());   // O(n log n) every time
        return all.get(k - 1);
    }
}` },
      mcq: { q: 'To track the k-th LARGEST value, which heap do you keep, and of what size?', options: ['A MIN-heap of size k: its root is the smallest of the top k = the answer', 'A MAX-heap of all elements', 'A MAX-heap of size k', 'Two heaps of size k/2'], answer: 0, explain: 'The min-heap holds exactly the k largest values seen so far. Its root is the smallest of them — the k-th largest overall. Anything smaller than the root can be discarded forever.' },
      hints: [`<p>Hint 1: you never need values smaller than the current k-th largest. Keep only the k biggest.</p>`, `<p>Hint 2: a <code>PriorityQueue&lt;Integer&gt;</code> (min-heap). After each offer, if size &gt; k, poll() — that removes the smallest.</p>`, `<p>Hint 3: the constructor just calls add for each initial number. Return <code>peek()</code>. Optimization: if size == k and val ≤ peek(), skip the offer entirely.</p>`],
      solution: {
        approach: `<p>Maintain a min-heap containing the k largest values. Each add is one offer plus at most one poll, both O(log k); the root is always the answer.</p>`,
        code: `import java.util.PriorityQueue;

class KthLargest {
    private final int k;
    private final PriorityQueue<Integer> heap = new PriorityQueue<>();   // min-heap of the k largest

    KthLargest(int k, int[] nums) {
        this.k = k;
        for (int x : nums) add(x);
    }

    public int add(int val) {
        if (heap.size() < k) heap.offer(val);
        else if (val > heap.peek()) {      // only values beating the current k-th largest matter
            heap.poll();
            heap.offer(val);
        }
        return heap.peek();
    }

    public static void main(String[] args) {
        KthLargest kl = new KthLargest(3, new int[]{4, 5, 8, 2});
        System.out.println(kl.add(3) + " " + kl.add(5) + " " + kl.add(10) + " " + kl.add(9) + " " + kl.add(4)); // 4 5 5 8 8
    }
}`,
        alt: [{ lang: 'python', code: `import heapq

class KthLargest:
    def __init__(self, k, nums):
        self.k, self.h = k, []
        for x in nums:
            self.add(x)
    def add(self, val):
        if len(self.h) < self.k:
            heapq.heappush(self.h, val)
        elif val > self.h[0]:
            heapq.heapreplace(self.h, val)
        return self.h[0]

kl = KthLargest(3, [4, 5, 8, 2])
print([kl.add(v) for v in (3, 5, 10, 9, 4)])` }],
        dry: { head: ['step', 'heap array (min at index 0)', 'action', 'returns'], rows: [['init 4,5,8', '[4, 5, 8]', 'offer ×3', '-'], ['init 2', '[4, 5, 8]', '2 ≤ peek 4 → skip', '-'], ['add(3)', '[4, 5, 8]', '3 ≤ 4 → skip', H.c('g', '4')], ['add(5)', '[5, 8, 5]', 'poll 4, offer 5', H.c('g', '5')], ['add(10)', '[5, 8, 10]', 'poll 5, offer 10', '5'], ['add(9)', '[8, 10, 9]', 'poll 5, offer 9', '8'], ['add(4)', '[8, 10, 9]', '4 ≤ 8 → skip', '8']] },
        complexity: `<p>O(log k) per add, O(n log k) for the constructor. Space O(k).</p>`,
        followUps: ['Support removing a value from the stream (lazy deletion map or TreeMap of counts)', 'Return the k-th SMALLEST instead (max-heap of size k)', 'Running median: two heaps']
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 — ConcurrentHashMap design
     ===================================================================== */
  topics.push({
    title: 'ConcurrentHashMap Design: CAS, Per-Bin Locks, Counter Cells & Cooperative Resize',
    analogy: `<p>A <b>bank with 16 cash drawers</b> instead of one big vault. If a drawer is <b>empty</b>, a teller drops the first bundle in with a quick "is it still empty? then mine!" check (CAS) — no key needed. If a drawer already has money, the teller <b>locks just that drawer</b>; tellers at other drawers keep working. Customers who only want to <b>look</b> at a balance never need a key at all. Counting the total money is done with several tally sheets instead of one shared sheet so tellers do not queue to write on it. And when the bank moves to 32 drawers, every teller who passes by <b>helps carry drawers</b> to the new room, leaving a "moved → look in the new room" sign behind.</p>`,
    explain: `<p><code>HashMap</code> is unsafe with multiple writers; <code>Collections.synchronizedMap</code> and <code>Hashtable</code> put <b>one lock around everything</b>, so only one thread works at a time. <code>ConcurrentHashMap</code> (Java 8+) is a HashMap-like table where:</p>
      ${H.table(['operation', 'mechanism', 'blocks?'], [['get / containsKey', 'volatile reads of the table slot and node fields', H.c('g', 'never')], ['put into an EMPTY bin', '<code>casTabAt(tab, i, null, newNode)</code> — compare-and-swap', H.c('g', 'no lock; retry if CAS loses')], ['put into a NON-empty bin', '<code>synchronized (firstNodeOfBin)</code>', H.c('y', 'only writers on the same bin')], ['size()', 'baseCount + CounterCell[] (LongAdder style)', H.c('g', 'no lock, an estimate under concurrency')], ['resize', 'many threads transfer chunks of bins; done bins get a ForwardingNode', H.c('g', 'readers follow the forward')]])}
      <p>So two threads writing to <b>different bins</b> run truly in parallel, and readers are never blocked by writers.</p>
      <p><b>Atomic compound operations</b> are the real reason to use it:</p>
      ${H.table(['want', 'WRONG (race)', 'RIGHT (atomic)'], [['count words', '<code>m.put(w, m.get(w) + 1)</code>', '<code>m.merge(w, 1, Integer::sum)</code>'], ['create if missing', '<code>if (!m.containsKey(k)) m.put(k, v)</code>', '<code>m.putIfAbsent(k, v)</code> / <code>computeIfAbsent</code>'], ['multimap add', 'get list, null-check, put', '<code>m.computeIfAbsent(k, x -&gt; new CopyOnWriteArrayList&lt;&gt;()).add(v)</code>']])}
      <p><b>No nulls:</b> keys and values cannot be null (NPE). Otherwise <code>get(k) == null</code> could mean "absent" or "mapped to null", and between your <code>containsKey</code> and <code>get</code> another thread could change the answer.</p>
      <p><b>Iterators are weakly consistent:</b> they never throw ConcurrentModificationException, reflect the map at some point at or after creation, and may or may not show concurrent updates.</p>`,
    clues: ['"thread-safe map with high read and write concurrency" → ConcurrentHashMap, not Hashtable/synchronizedMap', '"count events from many threads" → <code>merge</code> or <code>computeIfAbsent(k, x -&gt; new LongAdder()).increment()</code>', '"check-then-act" / "lost updates" on a shared map → atomic compute/merge/putIfAbsent', '"why does ConcurrentHashMap not allow null?" → ambiguity of get() under concurrency', '"Java 7 segments vs Java 8" → per-bin CAS + synchronized replaced 16 fixed segment locks', '"computeIfAbsent hangs / throws Recursive update" → never modify the same map inside the mapping function'],
    code: [`
import java.util.Map;
import java.util.concurrent.*;
import java.util.concurrent.atomic.LongAdder;

class ChmPatterns {
    public static void main(String[] args) throws Exception {
        ConcurrentHashMap<String, Integer> racy = new ConcurrentHashMap<>();
        ConcurrentHashMap<String, Integer> safe = new ConcurrentHashMap<>();
        ConcurrentHashMap<String, LongAdder> hot = new ConcurrentHashMap<>();
        racy.put("hits", 0);

        ExecutorService pool = Executors.newFixedThreadPool(4);
        Runnable work = () -> {
            for (int i = 0; i < 10_000; i++) {
                racy.put("hits", racy.get("hits") + 1);             // check-then-act: LOSES updates
                safe.merge("hits", 1, Integer::sum);                // atomic read-modify-write on one bin
                hot.computeIfAbsent("hits", k -> new LongAdder()).increment(); // best for very hot keys
            }
        };
        for (int t = 0; t < 4; t++) pool.submit(work);
        pool.shutdown();
        pool.awaitTermination(10, TimeUnit.SECONDS);

        System.out.println("racy = " + racy.get("hits"));          // usually < 40000
        System.out.println("safe = " + safe.get("hits"));          // 40000
        System.out.println("hot  = " + hot.get("hits").sum());     // 40000

        // Weakly consistent iteration: no ConcurrentModificationException
        Map<Integer, Integer> m = new ConcurrentHashMap<>(Map.of(1, 1, 2, 2, 3, 3));
        for (Integer k : m.keySet()) if (k % 2 == 1) m.remove(k);   // removing while iterating: allowed, no CME
        System.out.println(m);                                        // {2=2}

        // A concurrent Set: backed by a ConcurrentHashMap
        var seen = ConcurrentHashMap.<String>newKeySet();
        System.out.println(seen.add("x") + " " + seen.add("x"));   // true false
    }
}`],
    codeTitle: ['Lost updates vs merge vs LongAdder; weakly consistent iteration; newKeySet'],
    viz: {
      title: 'Threads on a ConcurrentHashMap: CAS on empty bins, lock on busy bins, lock-free reads',
      input: 'T1 put apple & T2 put date, T1 put cherry & T2 put banana & T3 get apple, T2 put kiwi & T1 put lemon, T3 get kiwi',
      inputLabel: 'rounds separated by "," ; ops in the same round run at the same time, joined by "&" (Tn put|get word)',
      gen: function (input) {
        var rounds = clean(input).split(',').map(function (r) { return r.split('&').map(function (o) { return o.trim().split(/\s+/); }).filter(function (o) { return o[0]; }); }).filter(function (r) { return r.length; });
        var total = 0;
        rounds.forEach(function (r) { total += r.length; });
        if (!rounds.length || rounds.length > 8 || total > 16) throw new Error('Give 1..8 rounds and at most 16 ops, e.g. "T1 put a & T2 put b, T3 get a"');
        rounds.forEach(function (r) { r.forEach(function (o) { if (o.length !== 3 || !/^T\d$/.test(o[0]) || !/^(put|get)$/i.test(o[1]) || !/^[A-Za-z0-9]{1,10}$/.test(o[2])) throw new Error('Each op must look like "T1 put apple" or "T3 get apple"'); }); });
        var cap = 16, bins = [], frames = [], base = 0, cells = [0, 0], cellUse = 0;
        for (var b = 0; b < cap; b++) bins.push([]);
        function grid(hl) { var rows = bucketRows(bins, 2); return { type: 'grid', label: 'table[16] — bins (rows) and their chains', rowHead: range(cap), colHead: colHeads(rows), rows: rows, hl: hl || {} }; }
        function counters(h) { return { type: 'vars', label: 'size counting (LongAdder style)', vals: { baseCount: base, 'counterCells[0]': cells[0], 'counterCells[1]': cells[1], 'size() = sum': base + cells[0] + cells[1] }, hl: h || {} }; }
        frames.push({ narr: '<code>new ConcurrentHashMap&lt;&gt;()</code>. The table is created lazily by the first writer, which wins a CAS on the <code>sizeCtl</code> field (losers spin-yield until it is ready). Each round below shows operations that happen <b>at the same time</b> on different threads.', parts: [grid(), counters()] });
        rounds.forEach(function (round, ri) {
          var rows = [], hl = {}, touched = {}, putsThisRound = 0;
          round.forEach(function (o) {
            var th = o[0], op = o[1].toLowerCase(), key = o[2], idx = bucketOf(jHash(key), cap), chain = bins[idx];
            if (op === 'get') {
              var pos = chain.indexOf(key);
              rows.push([th, 'get("' + key + '")', idx, 'volatile read of tab[' + idx + '], walk chain', pos >= 0 ? 'found — never blocked' : 'null — never blocked']);
              if (pos >= 0) hl[idx + ',' + pos] = 'sel';
              return;
            }
            if (chain.indexOf(key) >= 0) {
              rows.push([th, 'put("' + key + '")', idx, 'synchronized(first node of bin ' + idx + ')', 'key exists → value replaced']);
              hl[idx + ',' + chain.indexOf(key)] = 'cur';
              return;
            }
            putsThisRound++;
            if (!chain.length && !touched[idx]) {
              chain.push(key); touched[idx] = th;
              rows.push([th, 'put("' + key + '")', idx, 'bin empty → casTabAt(null → node)', 'CAS succeeded, no lock']);
              hl[idx + ',0'] = 'ok';
            } else if (touched[idx]) {
              chain.push(key);
              rows.push([th, 'put("' + key + '")', idx, 'CAS / lock on bin ' + idx + ' lost to ' + touched[idx], 'waited/retried, then synchronized(first) → appended']);
              hl[idx + ',' + (chain.length - 1)] = 'bad';
            } else {
              chain.push(key); touched[idx] = th;
              rows.push([th, 'put("' + key + '")', idx, 'bin busy → synchronized(first node "' + chain[0] + '")', 'only bin ' + idx + ' is locked; appended']);
              hl[idx + ',' + (chain.length - 1)] = 'cur';
            }
          });
          var hv = {};
          if (putsThisRound === 1) { base++; hv.baseCount = 'ok'; }
          else if (putsThisRound > 1) { base++; for (var c = 1; c < putsThisRound; c++) { cells[cellUse % 2]++; hv['counterCells[' + (cellUse % 2) + ']'] = 'cur'; cellUse++; } hv.baseCount = 'ok'; }
          var conflict = rows.some(function (r) { return /lost to/.test(r[3]); });
          frames.push({ narr: 'Round ' + (ri + 1) + ': ' + round.length + ' operation(s) in parallel. ' + (conflict ? '<span class="c-r">Two writers hit the same bin</span> — one wins, the other retries (CAS failure) or waits on the bin lock. ' : 'Different bins → no contention at all. ') + 'Readers never take a lock.' + (putsThisRound > 1 ? ' Several threads tried to bump <code>baseCount</code> with CAS at once; the losers add to a <b>CounterCell</b> instead of retrying on the hot field.' : ''), parts: [grid(hl), { type: 'table', label: 'what each thread does', columns: ['thread', 'operation', 'bin', 'mechanism', 'result'], rows: rows }, counters(hv)] });
        });
        var count = base + cells[0] + cells[1];
        frames.push({ narr: '<code>size()</code> = baseCount + Σ counterCells = <b>' + count + '</b>. It is computed without locking, so under concurrent writes it is a moment-in-time <b>estimate</b>. Prefer <code>mappingCount()</code> (returns long) for huge maps.', parts: [counters({ 'size() = sum': 'sel' })] });
        var old = bins.map(function (ch) { return ch.slice(); }), fwd = {};
        function oldGrid(done, label) {
          var rows = bucketRows(old.map(function (ch, i) { return done[i] ? ['FWD →'] : ch; }), 2), h = {};
          Object.keys(done).forEach(function (i) { h[i + ',0'] = 'done'; });
          return { type: 'grid', label: label, rowHead: range(cap), colHead: colHeads(rows), rows: rows, hl: h };
        }
        frames.push({ narr: 'Suppose size passes <code>sizeCtl</code> (12 for a 16-bin table). A thread starts a <b>resize</b>: it allocates <code>nextTable</code> of 32 bins and claims a <b>stride</b> of bins to move, working from the <b>highest index downwards</b> (via <code>transferIndex</code>). The minimum stride is 16 bins, so here one stride covers the whole table; on big tables many threads each claim their own stride.', parts: [oldGrid({}, 'old table[16] before transfer')] });
        for (var bb = cap - 1; bb >= 8; bb--) fwd[bb] = true;
        frames.push({ narr: 'Bins 15…8 moved (each split into lo/hi lists, like HashMap, while holding that bin\'s lock). Each finished bin now holds a <b>ForwardingNode</b> (hash = MOVED = −1). A <code>get</code> that lands here follows it to <code>nextTable</code>; a <code>put</code> that lands here calls <b>helpTransfer</b> and joins the resize instead of waiting.', parts: [oldGrid(fwd, 'old table[16] mid-transfer')] });
        for (bb = 7; bb >= 0; bb--) fwd[bb] = true;
        var nb = [];
        for (b = 0; b < 2 * cap; b++) nb.push([]);
        old.forEach(function (ch) { ch.forEach(function (k) { nb[bucketOf(jHash(k), 2 * cap)].push(k); }); });
        var nrows = bucketRows(nb, 2);
        frames.push({ narr: 'All bins forwarded → <code>table = nextTable</code>, <code>sizeCtl</code> = 0.75 × 32 = 24. Readers were never blocked during the whole resize.', parts: [oldGrid(fwd, 'old table (all forwarded)'), { type: 'grid', label: 'new table[32]', rowHead: range(2 * cap), colHead: colHeads(nrows), rows: nrows }] });
        return frames;
      }
    },
    examples: [
      { title: 'Predict the output: lost updates even on a "thread-safe" map', html: `<p>Each individual <code>get</code> and <code>put</code> is thread-safe, but the <b>pair</b> is not: two threads read 41, both write 42, one increment vanishes. With 4 threads × 10,000 increments the racy counter typically ends far below 40,000; the <code>merge</code> counter is always exactly 40,000. See the reference code above.</p>
        ${H.table(['time', 'T1', 'T2', 'map value'], [['1', 'get → 41', '', '41'], ['2', '', 'get → 41', '41'], ['3', 'put 42', '', '42'], ['4', '', 'put 42', H.c('r', '42 (one update lost)')]])}` },
      { title: 'Predict the output: null is rejected', html: `<p>Both null keys and null values throw <code>NullPointerException</code>. <code>getOrDefault</code> and <code>putIfAbsent</code> are the null-free idioms.</p>`, code: `Map<String, String> chm = new ConcurrentHashMap<>();
try { chm.put("k", null); } catch (NullPointerException e) { System.out.println("NPE value"); }
try { chm.put(null, "v"); } catch (NullPointerException e) { System.out.println("NPE key"); }
System.out.println(chm.getOrDefault("k", "none"));   // none` },
      { title: 'computeIfAbsent must not touch the same map', html: `<p>A recursive memoized Fibonacci using <code>computeIfAbsent</code> on the same ConcurrentHashMap re-enters a bin that the current thread is already computing. Java 8 could spin forever; Java 9+ detects it and throws <code>IllegalStateException: Recursive update</code>. Use a plain loop, or compute outside and then <code>putIfAbsent</code>.</p>`, code: `Map<Integer, Long> memo = new ConcurrentHashMap<>();
memo.put(0, 0L); memo.put(1, 1L);
for (int i = 2; i <= 50; i++) memo.put(i, memo.get(i - 1) + memo.get(i - 2));  // iterative: safe
System.out.println(memo.get(50));   // 12586269025` },
      { title: 'Java 7 segments vs Java 8 bins', html: `${H.table(['aspect', 'Java 7', 'Java 8+'], [['structure', '16 Segments (each a mini-HashMap + ReentrantLock)', 'one Node[] table'], ['write lock granularity', 'per segment (fixed by concurrencyLevel)', 'per bin (first node), CAS for empty bins'], ['max write parallelism', '≈ concurrencyLevel', '≈ number of bins'], ['long chains', 'linked list', 'TreeBin (red-black) after 8'], ['size()', 'retry unlocked sums, then lock all segments', 'baseCount + CounterCells'], ['resize', 'per segment', 'cooperative, ForwardingNodes']])}<p>The <code>concurrencyLevel</code> constructor argument still exists but is now only a sizing hint.</p>` }
    ],
    deepDive: `<p><b>Special hashes.</b> <code>spread(h) = (h ^ (h &gt;&gt;&gt; 16)) &amp; HASH_BITS</code> (0x7fffffff), so normal nodes always have a non-negative hash. Negative values mark special nodes: <code>MOVED = −1</code> (ForwardingNode), <code>TREEBIN = −2</code> (root holder of a red-black bin), <code>RESERVED = −3</code> (placeholder used by computeIfAbsent/compute on an empty bin). Code checks <code>fh &lt; 0</code> to branch into the special paths.</p>
      <p><b>Why get() needs no lock.</b> The table slot is read with acquire semantics (<code>tabAt</code> → <code>getReferenceAcquire</code>), and <code>Node.val</code> and <code>Node.next</code> are <code>volatile</code>. A writer publishes a fully-built node with a release CAS/write, so a reader either sees the old chain or a correctly constructed new node — happens-before is guaranteed by the volatile write/read pair. In a TreeBin, readers use a lightweight lock-state; if a writer is restructuring the tree, readers fall back to walking the linked <code>next</code> list instead of blocking.</p>
      <p><b>sizeCtl</b> is a multi-purpose volatile int: −1 while initializing, a negative encoded "resize stamp + number of resizing threads" during transfer, otherwise the next resize threshold (0.75·n, computed as <code>n − (n &gt;&gt;&gt; 2)</code>). The constructor's loadFactor only affects the initial size; the running threshold is always 0.75.</p>
      <p><b>Counting.</b> <code>addCount</code> first CASes <code>baseCount</code>; on contention it moves to a randomly probed <code>CounterCell</code> (padded with <code>@Contended</code> to avoid false sharing), growing the cell array up to the number of CPUs. That is the same design as <code>LongAdder</code>, and why <code>size()</code> scales but is not a linearizable snapshot.</p>
      <p><b>Locking cost model.</b> <code>compute</code>, <code>computeIfAbsent</code> and <code>merge</code> run your function <b>while holding the bin lock</b>; a slow function (I/O, remote call) blocks other writers to that bin and every thread that needs the bin during resize. Keep them tiny. Since JDK 9, <code>computeIfAbsent</code> first checks the bin's first node without locking, so hits on that node are cheap.</p>
      <p><b>Bulk operations.</b> <code>forEach</code>, <code>search</code>, <code>reduce</code> (e.g. <code>reduceValuesToLong(parallelismThreshold, ...)</code>) can run in parallel on the common ForkJoinPool. And remember: thread safety of the map says nothing about thread safety of the <b>values</b> — a shared <code>ArrayList</code> value needs its own protection.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI often fixes a race by "switching HashMap to ConcurrentHashMap" and stops — leaving <code>get</code>-then-<code>put</code> check-then-act logic that is still racy. Code review for <b>compound atomicity</b> is a skill you must own; it does not show up in single-threaded unit tests.</p>
      <p><b>Use AI as a partner:</b> <code>Find every non-atomic read-modify-write on shared maps in this class and rewrite each with merge/compute/putIfAbsent</code>, then ask it for a <b>jcstress</b> or stress test that hammers the code with many threads. Also: <code>Explain why my computeIfAbsent throws IllegalStateException: Recursive update</code>.</p>
      <p><b>Where AI goes wrong:</b> it describes Java 7 segments as current, claims <code>size()</code> is exact, puts blocking network calls inside <code>computeIfAbsent</code> (bin-level stalls), or stores null values. In interviews, being precise about CAS-on-empty, lock-on-first-node, lock-free reads and cooperative resize is exactly what distinguishes a senior answer.</p>`,
    problems: [{
      title: 'Thread-Safe Word Frequency Counter', level: 'Medium', tags: ['concurrency', 'concurrenthashmap', 'executor'], companies: ['Netflix', 'Uber', 'LinkedIn', 'Amazon'],
      statement: `<p>Given a list of text lines and a thread count T, count how many times each lowercase word appears, processing lines in parallel with an <code>ExecutorService</code> of T threads. Return a <code>Map&lt;String, Long&gt;</code>. Results must be exact regardless of interleaving.</p>`,
      constraints: `Up to 10<sup>6</sup> lines, T ≤ 64. Words are split on non-letters.`,
      example: `<p>lines = ["the cat", "the dog", "THE end"] → ${H.c('g', '{the=3, cat=1, dog=1, end=1}')}. With get-then-put on a shared map you might get ${H.c('r', 'the=2')} because two threads read 1 and both write 2.</p>`,
      brute: { why: `<p>One global lock (<code>synchronized</code> around every update) is correct but serializes all threads — adding threads makes it slower due to contention. A plain HashMap with get/put is fast but loses updates and can corrupt the table under concurrent resize.</p>`, code: `class LockedCounter {
    private final java.util.Map<String, Long> counts = new java.util.HashMap<>();
    synchronized void add(String w) { counts.put(w, counts.getOrDefault(w, 0L) + 1); } // one big lock
    synchronized java.util.Map<String, Long> snapshot() { return new java.util.HashMap<>(counts); }
}` },
      mcq: { q: 'Which update is atomic for a ConcurrentHashMap&lt;String, Long&gt; counts?', options: ['counts.merge(w, 1L, Long::sum)', 'counts.put(w, counts.get(w) + 1)', 'if (!counts.containsKey(w)) counts.put(w, 1L); else counts.put(w, counts.get(w) + 1)', 'counts.put(w, counts.getOrDefault(w, 0L) + 1)'], answer: 0, explain: 'merge performs the read-modify-write while holding the bin lock (or by CAS on an empty bin). All the other options read and write in separate steps, so concurrent threads can overwrite each other.' },
      hints: [`<p>Hint 1: the map can be shared, but every update must be a <b>single atomic call</b> on it.</p>`, `<p>Hint 2: <code>counts.merge(word, 1L, Long::sum)</code>; for extremely hot keys use <code>computeIfAbsent(word, k -&gt; new LongAdder()).increment()</code> and sum at the end.</p>`, `<p>Hint 3: submit one task per chunk of lines (not per line — task overhead). Call <code>shutdown()</code> and <code>awaitTermination</code> (or collect Futures and <code>get()</code> them to surface exceptions) before reading results.</p>`],
      solution: {
        approach: `<p>Split the lines into T chunks; each task tokenizes its chunk and calls <code>merge</code> on a shared ConcurrentHashMap. Different words usually hit different bins, so threads rarely contend; same-word updates are serialized only on that bin.</p>`,
        code: `import java.util.*;
import java.util.concurrent.*;

class WordCount {
    static Map<String, Long> count(List<String> lines, int threads) throws Exception {
        ConcurrentHashMap<String, Long> counts = new ConcurrentHashMap<>();
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        try {
            List<Future<?>> futures = new ArrayList<>();
            int chunk = Math.max(1, (lines.size() + threads - 1) / threads);
            for (int from = 0; from < lines.size(); from += chunk) {
                List<String> part = lines.subList(from, Math.min(lines.size(), from + chunk));
                futures.add(pool.submit(() -> {
                    for (String line : part)
                        for (String w : line.toLowerCase().split("[^a-z]+"))
                            if (!w.isEmpty()) counts.merge(w, 1L, Long::sum);   // atomic per key
                }));
            }
            for (Future<?> f : futures) f.get();       // wait + rethrow task exceptions
        } finally {
            pool.shutdown();
        }
        return new TreeMap<>(counts);                   // sorted copy for stable printing
    }

    public static void main(String[] args) throws Exception {
        List<String> lines = new ArrayList<>();
        for (int i = 0; i < 30_000; i++) lines.add(i % 3 == 2 ? "THE end" : (i % 3 == 0 ? "the cat" : "the dog"));
        System.out.println(count(lines, 8));   // {cat=10000, dog=10000, end=10000, the=30000}
    }
}`,
        dry: { head: ['time', 'thread A (line "the cat")', 'thread B (line "the dog")', 'counts after'], rows: [['1', 'merge(the) → bin empty → CAS insert 1', '', '{the=1}'], ['2', '', 'merge(the) → bin busy → lock, 1+1', '{the=2}'], ['3', 'merge(cat) → other bin, CAS', 'merge(dog) → other bin, CAS (parallel)', '{the=2, cat=1, dog=1}'], ['4', 'done', 'done', 'f.get() returns; read the map safely']] },
        complexity: `<p>O(total characters / T) wall time ideally; each merge is O(1) average. Contention only on identical words. Space O(distinct words).</p>`,
        followUps: ['Why is reading the map after f.get() guaranteed to see all updates? (Future.get happens-before)', 'Use parallel streams with Collectors.groupingByConcurrent instead', 'Return the top 10 words without sorting everything']
      }
    }]
  });

  /* =====================================================================
     TOPIC 8 — CopyOnWriteArrayList
     ===================================================================== */
  topics.push({
    title: 'CopyOnWriteArrayList: Snapshot Reads, Copy-Every-Write',
    analogy: `<p>A <b>restaurant menu board</b>. Hundreds of customers read it all day, and nobody needs permission to look. When the chef changes a dish, she does not wipe the board while people are reading — she <b>prints a whole new board</b> in the back room, then swaps it onto the wall in one move. Someone who started reading the old board finishes reading the old board, undisturbed. Perfect when changes are <b>rare</b>; silly if the menu changed every second (you would be printing boards nonstop).</p>`,
    explain: `<p><code>CopyOnWriteArrayList</code> (COW list) keeps a <code>volatile Object[] array</code>. The rule is simple:</p>
      <ul>
        <li><b>Reads</b> (<code>get</code>, <code>size</code>, <code>contains</code>, iteration) just read the current array reference — <b>no lock, never blocked</b>.</li>
        <li><b>Writes</b> (<code>add</code>, <code>set</code>, <code>remove</code>…) take a lock, <b>copy the whole array</b> with the change applied, then publish the new array with one volatile write. The old array is never modified.</li>
      </ul>
      ${H.arr(['A', 'B', 'C'], { label: 'array v1 (an iterator holds this)' })}${H.arr(['A', 'B', 'C', 'D'], { label: 'array v2 after add(D) — a brand-new array', hl: { 3: 'g' } })}
      ${H.table(['operation', 'cost', 'note'], [['get(i), size()', H.c('g', 'O(1)'), 'one volatile read'], ['iteration', H.c('g', 'O(n), lock-free'), 'over a frozen <b>snapshot</b>; never throws CME'], ['add / set / remove', H.c('r', 'O(n) copy'), 'plus lock; writers are serialized'], ['iterator.remove()/set()/add()', H.c('r', 'UnsupportedOperationException'), 'snapshots are read-only'], ['addIfAbsent(x)', 'O(n)', 'atomic check-then-add']])}
      <p><b>Use it when</b> reads vastly outnumber writes and lists are small: event listener lists, observer registries, routing tables, feature-flag rule lists, plugin chains. <b>Avoid it</b> for large or write-heavy lists — every write allocates and copies the whole array.</p>
      <p>Its sibling <code>CopyOnWriteArraySet</code> is a COW list that uses <code>addIfAbsent</code> (so <code>add</code> is O(n)).</p>`,
    clues: ['"listeners may register/unregister while events are being dispatched" → CopyOnWriteArrayList', '"read-mostly, rarely modified list shared by many threads" → copy-on-write', '"iterate without locking and without ConcurrentModificationException" → snapshot iterator', '"iterator.remove() throws UnsupportedOperationException" → COW snapshot', '"many writes per second to a shared list" → NOT COW; use a concurrent queue or locks', '"atomic add if not present" on a list → <code>addIfAbsent</code>'],
    code: [`
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

/** Listener registry: listeners may unsubscribe themselves (or others) during dispatch. */
class EventBus<E> {
    private final List<Consumer<E>> listeners = new CopyOnWriteArrayList<>();

    Runnable subscribe(Consumer<E> l) {
        listeners.add(l);                          // copy + publish (rare)
        return () -> listeners.remove(l);          // unsubscribe handle
    }

    void publish(E event) {
        for (Consumer<E> l : listeners) l.accept(event);   // iterates a snapshot: no lock, no CME
    }

    public static void main(String[] args) {
        EventBus<String> bus = new EventBus<>();
        List<String> log = new ArrayList<>();
        Runnable[] once = new Runnable[1];
        once[0] = bus.subscribe(e -> { log.add("once:" + e); once[0].run(); });  // removes itself mid-dispatch
        bus.subscribe(e -> log.add("always:" + e));
        bus.publish("a");
        bus.publish("b");
        System.out.println(log);   // [once:a, always:a, always:b]
    }
}`],
    codeTitle: ['A safe event bus with CopyOnWriteArrayList'],
    viz: {
      title: 'Copy-on-write: writers publish new arrays, iterators keep their snapshot',
      input: 'add A, add B, add C, iter, next, add D, remove B, next, next, next, iter, next',
      inputLabel: 'ops: add X, remove X, set i X, iter, next, get i (comma separated, max 20)',
      gen: function (input) {
        var ops = clean(input).split(',').map(function (x) { return x.trim().split(/\s+/); }).filter(function (o) { return o[0]; });
        if (!ops.length || ops.length > 20) throw new Error('Give 1..20 comma-separated ops');
        var arr = [], ver = 1, frames = [], copies = 0, copied = 0, it = null;
        function parts(hl, extra) {
          var p = [{ type: 'array', label: 'current array (v' + ver + ') — what new readers see', values: arr.length ? arr.slice() : ['(empty)'], hl: hl || {} }];
          if (it) p.push({ type: 'array', label: 'iterator snapshot (v' + it.ver + ') — frozen', values: it.snap.length ? it.snap.slice() : ['(empty)'], ptr: it.cursor < it.snap.length ? one(it.cursor, 'cursor') : {}, hl: it.done ? {} : {} });
          p.push({ type: 'vars', label: 'stats', vals: { version: 'v' + ver, 'arrays allocated by writes': copies, 'elements copied': copied, size: arr.length } });
          return extra ? p.concat(extra) : p;
        }
        frames.push({ narr: '<code>new CopyOnWriteArrayList&lt;&gt;()</code>: <code>array</code> is an empty <code>Object[0]</code>, held in a <b>volatile</b> field.', parts: parts() });
        ops.forEach(function (o) {
          var op = o[0].toLowerCase();
          if (op === 'add' && o.length === 2) {
            if (arr.length >= 10) throw new Error('Keep at most 10 elements');
            var na = arr.concat([o[1]]); copies++; copied += arr.length;
            frames.push({ narr: 'add(' + o[1] + '): take the write lock, <code>Arrays.copyOf(array, ' + (arr.length + 1) + ')</code> — copying all ' + arr.length + ' existing element(s) — and write ' + o[1] + ' in the last slot of the <b>new</b> array.', parts: parts({}, [{ type: 'array', label: 'new array being built (private to the writer)', values: na, hl: one(na.length - 1, 'ok') }]) });
            arr = na; ver++;
            frames.push({ narr: '<code>setArray(newArray)</code>: one volatile write publishes v' + ver + ' to all threads, then the lock is released.' + (it ? ' The iterator still points at its own v' + it.ver + ' array.' : ''), parts: parts(one(arr.length - 1, 'ok')) });
          } else if (op === 'remove' && o.length === 2) {
            var pos = arr.indexOf(o[1]);
            if (pos < 0) { frames.push({ narr: 'remove(' + o[1] + '): not found in the current array → returns false, nothing copied.', parts: parts() }); return; }
            frames.push({ narr: 'remove(' + o[1] + '): lock, find it at index ' + pos + ' in the current array…', parts: parts(one(pos, 'bad')) });
            arr = arr.slice(0, pos).concat(arr.slice(pos + 1)); copies++; copied += arr.length; ver++;
            frames.push({ narr: '…build a new array of length ' + arr.length + ' without it (two arraycopy calls) and publish it as v' + ver + '. Old snapshots still contain ' + o[1] + '.', parts: parts() });
          } else if (op === 'set' && o.length === 3) {
            var i = Number(o[1]);
            if (isNaN(i) || i < 0 || i >= arr.length) throw new Error('set index out of range: ' + o[1]);
            arr = arr.slice(); arr[i] = o[2]; copies++; copied += arr.length; ver++;
            frames.push({ narr: 'set(' + i + ', ' + o[2] + '): even replacing ONE element copies the whole array (' + arr.length + ' elements) and publishes v' + ver + '.', parts: parts(one(i, 'ok')) });
          } else if (op === 'iter' && o.length === 1) {
            it = { snap: arr.slice(), ver: ver, cursor: 0 };
            frames.push({ narr: '<code>iterator()</code> grabs the current array reference (v' + ver + ') — a <b>snapshot</b>. No copy, no lock: it simply keeps pointing at that array forever.', parts: parts() });
          } else if (op === 'next' && o.length === 1) {
            if (!it) throw new Error('"next" needs an "iter" first');
            if (it.cursor >= it.snap.length) { frames.push({ narr: 'hasNext() is false: the snapshot v' + it.ver + ' has only ' + it.snap.length + ' element(s). Elements added later are invisible to this iterator.', parts: parts() }); return; }
            var v = it.snap[it.cursor];
            frames.push({ narr: 'next() → <b>' + v + '</b> from snapshot v' + it.ver + (arr.indexOf(v) < 0 ? ' — even though it has been <span class="c-r">removed</span> from the current list!' : '') + ' No ConcurrentModificationException is possible.', parts: parts() });
            it.cursor++;
          } else if (op === 'get' && o.length === 2) {
            var gi = Number(o[1]);
            if (isNaN(gi) || gi < 0 || gi >= arr.length) throw new Error('get index out of range: ' + o[1]);
            frames.push({ narr: 'get(' + gi + ') = <b>' + arr[gi] + '</b>: one volatile read of <code>array</code> + an index — no lock, never blocked by writers.', parts: parts(one(gi, 'sel')) });
          } else throw new Error('Unknown op "' + o.join(' ') + '" — use add X, remove X, set i X, iter, next, get i');
        });
        frames.push({ narr: 'Summary: ' + copies + ' write(s) allocated ' + copies + ' new arrays and copied ' + copied + ' element references in total. Reads cost nothing extra. That trade-off only pays when reads dominate.', parts: parts() });
        return frames;
      }
    },
    examples: [
      { title: 'Predict the output: adding while iterating', html: `<p>The for-each loop iterates the snapshot taken at the start, so the elements added inside the loop are <b>not visited</b> and nothing throws. Do the same with an ArrayList and you get a ConcurrentModificationException.</p>`, code: `List<String> cow = new CopyOnWriteArrayList<>(List.of("a", "b"));
for (String s : cow) cow.add(s.toUpperCase());     // snapshot: loop runs exactly twice
System.out.println(cow);                            // [a, b, A, B]
List<String> al = new ArrayList<>(List.of("a", "b"));
try { for (String s : al) al.add(s.toUpperCase()); }
catch (ConcurrentModificationException e) { System.out.println("CME from ArrayList"); }` },
      { title: 'Predict the output: iterator.remove()', html: `<p>Snapshot iterators are read-only. To remove while scanning, call <code>removeIf</code> on the list (one copy) or <code>list.remove(x)</code> (one copy per call).</p>`, code: `List<Integer> cow = new CopyOnWriteArrayList<>(List.of(1, 2, 3, 4));
Iterator<Integer> it = cow.iterator();
it.next();
try { it.remove(); } catch (UnsupportedOperationException e) { System.out.println("UOE"); }
cow.removeIf(x -> x % 2 == 0);                 // one copy for the whole batch
System.out.println(cow);                        // [1, 3]` },
      { title: 'The O(n²) build trap', html: `<p>Adding 100,000 elements one at a time copies 0 + 1 + … + 99,999 ≈ <b>5 billion</b> references and allocates 100,000 arrays. Build a normal list first and hand it to the constructor (or use <code>addAll</code>, which copies once).</p>`, code: `List<Integer> tmp = new ArrayList<>();
for (int i = 0; i < 100_000; i++) tmp.add(i);
List<Integer> cow = new CopyOnWriteArrayList<>(tmp);   // ONE copy
cow.addAll(List.of(-1, -2));                           // one more copy, not two
System.out.println(cow.size());                        // 100002` },
      { title: 'Choosing a thread-safe list', html: `${H.table(['need', 'pick', 'why'], [['read-mostly, small, iterate often', 'CopyOnWriteArrayList', 'lock-free snapshot reads'], ['producer/consumer FIFO', 'ConcurrentLinkedQueue / BlockingQueue', 'O(1) concurrent add/poll'], ['random writes + reads, moderate contention', 'Collections.synchronizedList + manual sync when iterating', 'simple, but iteration needs <code>synchronized (list)</code>'], ['never modified after build', 'List.copyOf / List.of', 'immutable, safe to share freely']])}` }
    ],
    deepDive: `<p><b>Implementation.</b> In JDK 9+ writers synchronize on a private <code>final transient Object lock</code> (JDK 8 used a <code>ReentrantLock</code>). <code>getArray()</code>/<code>setArray()</code> read and write the <code>volatile Object[] array</code>. Because the published array is never mutated afterwards, any thread that reads the reference sees a fully initialized array (volatile write → read gives happens-before), which is what makes lock-free reads correct. The Javadoc guarantee: actions in a thread before placing an object into the list happen-before actions after accessing that element from another thread.</p>
      <p><b>Snapshot semantics.</b> <code>COWIterator</code> stores the array and a cursor. It never sees later writes and never throws CME; its mutators throw <code>UnsupportedOperationException</code>. <code>subList</code> is different: it is a view that checks the backing array identity and throws <code>ConcurrentModificationException</code> if the list was modified behind its back.</p>
      <p><b>Compound actions.</b> Every single method is atomic, but "if (!list.contains(x)) list.add(x)" is not — use <code>addIfAbsent</code> or <code>addAllAbsent</code>. Index-based code across calls (<code>get(size() − 1)</code>) can race with a concurrent remove; grab one snapshot via iterator or <code>toArray()</code> and work on that.</p>
      <p><b>Memory and GC.</b> Each write allocates a new array of the full size. For a 1-million-element list each add allocates ~4 MB; in G1 an array larger than half a region becomes a <b>humongous object</b>, which is expensive to allocate and reclaim. Old snapshots stay alive as long as any iterator references them.</p>
      <p><b>Persistent alternatives.</b> Functional/persistent vectors (e.g. Vavr, PCollections) share structure and make each "copy" O(log n) instead of O(n). A common modern pattern is an immutable <code>List.copyOf</code> held in an <code>AtomicReference</code> and replaced with <code>updateAndGet</code> — the same idea as COW with explicit control.</p>`,
    aiEra: `<p><b>What AI changes:</b> asked to "make this list thread-safe", assistants often reach for CopyOnWriteArrayList everywhere — including hot write paths like request logs or metrics buffers, where it causes allocation storms. Your job is to read the <b>read/write ratio</b> and size and pick the structure.</p>
      <p><b>Use AI as a partner:</b> <code>Estimate the allocation rate if this CopyOnWriteArrayList receives 5,000 adds per second at 20,000 elements</code> (answer: ~5,000 × 80 KB = 400 MB/s — check the math yourself), or <code>Generate a JFR allocation-profiling checklist for this service</code>.</p>
      <p><b>Where AI goes wrong:</b> it claims COW iterators "reflect the latest data", that <code>iterator.remove()</code> works, or that COW makes compound check-then-act operations atomic. It also forgets that thread-safe containers do not make the <b>elements</b> thread-safe. Knowing the snapshot model makes these errors obvious.</p>`,
    problems: [{
      title: 'Safe Listener Dispatch with Self-Unsubscribe', level: 'Easy', tags: ['concurrency', 'copy-on-write', 'observer pattern'], companies: ['Google', 'JetBrains', 'Atlassian'],
      statement: `<p>Implement <code>Dispatcher</code> with <code>int register(IntConsumer l)</code> (returns an id), <code>void unregister(int id)</code>, and <code>void fire(int value)</code> which calls every registered listener in registration order. Listeners may call <code>register</code>/<code>unregister</code> <b>during</b> <code>fire</code> (including on themselves), and other threads may fire at the same time. A listener registered during a fire must <b>not</b> be called by that same fire.</p>`,
      constraints: `Up to 100 listeners, up to 10<sup>6</sup> fire calls per second, a few register/unregister calls per minute.`,
      example: `<p>Register L1 (unregisters itself on first call) and L2. fire(1) → ${H.c('g', 'L1(1), L2(1)')}; fire(2) → ${H.c('g', 'L2(2)')} only. With a plain ArrayList, L1 removing itself during the loop throws ${H.c('r', 'ConcurrentModificationException')}.</p>`,
      brute: { why: `<p>An <code>ArrayList</code> guarded by <code>synchronized</code>: fire must hold the lock while calling listeners (slow listeners block everyone, and a listener that calls unregister re-enters fine but modifies the list being iterated → CME). Copying the list into a new array on every fire avoids CME but allocates on the hot path a million times per second.</p>`, code: `class NaiveDispatcher {
    private final java.util.List<java.util.function.IntConsumer> ls = new java.util.ArrayList<>();
    synchronized void register(java.util.function.IntConsumer l) { ls.add(l); }
    synchronized void unregister(java.util.function.IntConsumer l) { ls.remove(l); }
    synchronized void fire(int v) {
        for (java.util.function.IntConsumer l : ls) l.accept(v);   // CME if l unregisters itself
    }
}` },
      mcq: { q: 'Writes are rare, fire() is extremely hot and listeners mutate the list during dispatch. Best structure?', options: ['CopyOnWriteArrayList: fire iterates a snapshot lock-free; rare writes pay the copy', 'Collections.synchronizedList(new ArrayList<>())', 'ConcurrentLinkedQueue with a lock around fire', 'A plain ArrayList with try/catch for CME'], answer: 0, explain: 'The snapshot iterator never throws CME and costs nothing to create, so the hot path is allocation-free. The occasional register/unregister copies a ~100-element array, which is negligible.' },
      hints: [`<p>Hint 1: the hot path (fire) should take no lock and allocate nothing; the cold path (register) can be expensive.</p>`, `<p>Hint 2: store listener records <code>(id, consumer)</code> in a <code>CopyOnWriteArrayList</code>; ids come from an <code>AtomicInteger</code>.</p>`, `<p>Hint 3: unregister = <code>removeIf(r -&gt; r.id == id)</code>. Because fire iterates the snapshot taken at its start, listeners added during a fire are not called, and removed ones already in the snapshot still are — define and document which semantics you want.</p>`],
      solution: {
        approach: `<p>Copy-on-write list of (id, listener) records. fire() iterates the current snapshot with zero locking; register/unregister create a new array. This matches the problem's read/write ratio exactly.</p>`,
        code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.IntConsumer;

class Dispatcher {
    private record Reg(int id, IntConsumer listener) {}
    private final List<Reg> regs = new CopyOnWriteArrayList<>();
    private final AtomicInteger nextId = new AtomicInteger();

    int register(IntConsumer l) {
        int id = nextId.incrementAndGet();
        regs.add(new Reg(id, l));                     // rare: copies the array
        return id;
    }

    void unregister(int id) { regs.removeIf(r -> r.id() == id); }   // one copy

    void fire(int value) {
        for (Reg r : regs) r.listener().accept(value);              // snapshot, lock-free, no CME
    }

    public static void main(String[] args) {
        Dispatcher d = new Dispatcher();
        List<String> log = new ArrayList<>();
        int[] id1 = new int[1];
        id1[0] = d.register(v -> { log.add("L1(" + v + ")"); d.unregister(id1[0]); });
        d.register(v -> {
            log.add("L2(" + v + ")");
            if (v == 1) d.register(x -> log.add("L3(" + x + ")"));   // added during fire(1): not called by it
        });
        d.fire(1);
        d.fire(2);
        System.out.println(log);   // [L1(1), L2(1), L2(2), L3(2)]
    }
}`,
        dry: { head: ['step', 'snapshot iterated', 'listener calls', 'list after'], rows: [['register L1, L2', '-', '-', '[L1, L2]'], ['fire(1)', '[L1, L2]', 'L1(1) → unregister L1; L2(1) → register L3', '[L2, L3]'], ['fire(2)', '[L2, L3]', 'L2(2), L3(2)', '[L2, L3]']] },
        complexity: `<p>fire: O(k) for k listeners, no locks, no allocation. register/unregister: O(k) copy. Space O(k) plus transient old snapshots.</p>`,
        followUps: ['How would you guarantee that an unregistered listener is never called again, even by an in-flight fire? (check a volatile "active" flag)', 'What if listeners must be called in priority order?', 'Should one throwing listener stop the others? Wrap and collect exceptions.']
      }
    }]
  });

  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'Predict the Output: Arrays.asList vs List.of vs ArrayList', level: 'Easy', tags: ['predict the output', 'list views', 'immutability'], companies: ['TCS', 'Infosys', 'Accenture', 'Amazon'],
    statement: `<p>What does this program print? Explain each line in terms of what object is <b>really</b> behind each <code>List</code>.</p>
      <pre>Integer[] arr = {1, 2, 3};
List&lt;Integer&gt; view = Arrays.asList(arr);
view.set(0, 99);
System.out.println(arr[0]);                     // line A
try { view.add(4); } catch (UnsupportedOperationException e) { System.out.println("B: UOE"); }
List&lt;Integer&gt; imm = List.of(1, 2, 3);
try { imm.set(0, 5); } catch (UnsupportedOperationException e) { System.out.println("C: UOE"); }
try { imm.contains(null); } catch (NullPointerException e) { System.out.println("D: NPE"); }
List&lt;Integer&gt; copy = new ArrayList&lt;&gt;(view);
copy.add(4);
System.out.println(copy + " " + view);          // line E</pre>`,
    constraints: `Java 21. Assume no other code runs.`,
    example: `<p>Expected output:</p><pre>99
B: UOE
C: UOE
D: NPE
[99, 2, 3, 4] [99, 2, 3]</pre><p>${H.c('b', 'Arrays.asList')} is a fixed-size <b>view</b> over the array (writes go through), ${H.c('r', 'List.of')} is fully immutable and null-hostile, and ${H.c('g', 'new ArrayList<>(…)')} is an independent growable copy.</p>`,
    brute: { why: `<p>The naive mental model "every List is an ArrayList" predicts <code>1</code> for line A (assuming a copy), no exceptions for B and C, and <code>false</code> for D. All four are wrong because the three lists have completely different internals.</p>`, code: `Integer[] arr = {1, 2, 3};
List<Integer> assumedCopy = new ArrayList<>(Arrays.asList(arr));   // what people THINK asList does
assumedCopy.set(0, 99);
System.out.println(arr[0]);   // 1 — but the real asList prints 99` },
    mcq: { q: 'Why does view.set(0, 99) change arr[0]?', options: ['Arrays.asList wraps the original array without copying it', 'Autoboxing writes back', 'Integer cache', 'set() copies the list back into the array'], answer: 0, explain: 'Arrays.asList returns Arrays$ArrayList whose field IS your array. set writes into it; add/remove would need to resize the array, so they throw UnsupportedOperationException.' },
    hints: [`<p>Hint 1: <code>Arrays.asList</code> returns a private class <code>Arrays$ArrayList</code> that stores a reference to your array — no copy, no growth.</p>`, `<p>Hint 2: <code>List.of</code> returns <code>ImmutableCollections.ListN</code>/<code>List12</code>: every mutator throws UOE, and <code>contains(null)</code> throws NPE because nulls are banned.</p>`, `<p>Hint 3: <code>new ArrayList&lt;&gt;(view)</code> copies the elements (via toArray) into its own <code>elementData</code>; changing the copy never touches the view or the array.</p>`],
    solution: {
      approach: `<p>Map each list to its implementation: a write-through fixed-size view, an immutable compact list, and a real ArrayList copy. Then each line follows directly.</p>`,
      code: `import java.util.*;

class ListKinds {
    public static void main(String[] args) {
        Integer[] arr = {1, 2, 3};
        List<Integer> view = Arrays.asList(arr);          // Arrays$ArrayList: wraps arr
        view.set(0, 99);                                  // writes into arr[0]
        System.out.println(arr[0]);                       // 99
        try { view.add(4); } catch (UnsupportedOperationException e) { System.out.println("B: UOE"); } // fixed size
        List<Integer> imm = List.of(1, 2, 3);             // ImmutableCollections.ListN
        try { imm.set(0, 5); } catch (UnsupportedOperationException e) { System.out.println("C: UOE"); }
        try { imm.contains(null); } catch (NullPointerException e) { System.out.println("D: NPE"); }   // null-hostile
        List<Integer> copy = new ArrayList<>(view);       // independent elementData
        copy.add(4);
        System.out.println(copy + " " + view);            // [99, 2, 3, 4] [99, 2, 3]
    }
}`,
      dry: { head: ['line', 'object behind the List', 'result'], rows: [['A', 'Arrays$ArrayList over arr', '99 (write-through)'], ['B', 'same, fixed length', 'UOE'], ['C', 'ImmutableCollections.ListN', 'UOE'], ['D', 'same, nulls banned', 'NPE'], ['E', 'java.util.ArrayList copy', '[99, 2, 3, 4] [99, 2, 3]']] },
      complexity: `<p>Arrays.asList is O(1) (no copy); new ArrayList&lt;&gt;(c) is O(n); List.of is O(n) to build and O(1) memory overhead per element beyond the array.</p>`,
      followUps: ['What does Arrays.asList(new int[]{1, 2}) return? (a List&lt;int[]&gt; of size 1)', 'Is List.copyOf(list) a copy if list is already immutable? (no — it may return the same instance)']
    }
  });

  practice.push({
    title: 'Predict the Output: a Max-Heap\'s toString and poll', level: 'Easy', tags: ['predict the output', 'priority queue', 'heap'], companies: ['Amazon', 'Walmart', 'Flipkart'],
    statement: `<p>What does this print? Trace the heap array after every offer.</p>
      <pre>PriorityQueue&lt;Integer&gt; pq = new PriorityQueue&lt;&gt;(Comparator.reverseOrder());
for (int x : new int[]{3, 1, 2, 5, 4}) pq.offer(x);
System.out.println(pq);
System.out.println(pq.poll() + " " + pq);</pre>`,
    constraints: `Use the JDK sift-up / sift-down rules (parent = (i − 1) / 2, children 2i + 1 and 2i + 2).`,
    example: `<p>Output:</p><pre>[5, 4, 2, 1, 3]
5 [4, 3, 2, 1]</pre><p>${H.c('r', 'Not [5, 4, 3, 2, 1]')}: toString prints the heap array, which is only partially ordered.</p>`,
    brute: { why: `<p>Assuming the queue keeps itself sorted predicts <code>[5, 4, 3, 2, 1]</code>. That would need O(n) work per insert; the heap only promises parent ≥ children, which is O(log n).</p>`, code: `List<Integer> sorted = new ArrayList<>(List.of(3, 1, 2, 5, 4));
sorted.sort(Comparator.reverseOrder());
System.out.println(sorted);   // [5, 4, 3, 2, 1] — what people expect, not what PriorityQueue prints` },
    mcq: { q: 'After offering 3, 1, 2 the array is [3, 1, 2]. Where does 5 end up after offer(5)?', options: ['Index 0 — it bubbles past 1 and then 3', 'Index 3 — new elements stay at the end', 'Index 1', 'Index 2'], answer: 0, explain: '5 starts at index 3, parent index 1 holds 1 (smaller in a max-heap) → swap; then parent index 0 holds 3 → swap. 5 becomes the root.' },
    hints: [`<p>Hint 1: max-heap rule: every parent ≥ its children. New elements start at the end and bubble up.</p>`, `<p>Hint 2: trace: [3] → [3,1] → [3,1,2] → 5 at idx 3 swaps with 1 then 3 → [5,3,2,1] → 4 at idx 4 swaps with 3 (idx 1), stops under 5 → [5,4,2,1,3].</p>`, `<p>Hint 3: poll removes 5, moves the last element (3) to the root, then sifts down toward the LARGER child (4) → [4,3,2,1].</p>`],
    solution: {
      approach: `<p>Simulate the heap array exactly as the JDK does: offers sift up, poll moves the last element to the root and sifts down toward the larger child (because of reverseOrder).</p>`,
      code: `import java.util.*;

class MaxHeapTrace {
    public static void main(String[] args) {
        PriorityQueue<Integer> pq = new PriorityQueue<>(Comparator.reverseOrder());
        for (int x : new int[]{3, 1, 2, 5, 4}) {
            pq.offer(x);
            System.out.println("after offer " + x + ": " + pq);
        }
        // after offer 3: [3]
        // after offer 1: [3, 1]
        // after offer 2: [3, 1, 2]
        // after offer 5: [5, 3, 2, 1]
        // after offer 4: [5, 4, 2, 1, 3]
        System.out.println(pq.poll() + " " + pq);   // 5 [4, 3, 2, 1]
    }
}`,
      dry: { head: ['op', 'array before', 'moves', 'array after'], rows: [['offer 5', '[3, 1, 2]', 'idx3↔idx1, idx1↔idx0', '[5, 3, 2, 1]'], ['offer 4', '[5, 3, 2, 1]', 'idx4↔idx1; 5 ≥ 4 stop', '[5, 4, 2, 1, 3]'], ['poll', '[5, 4, 2, 1, 3]', 'return 5; 3 → root; swap with 4', '[4, 3, 2, 1]']] },
      complexity: `<p>Each offer/poll is O(log n); printing is O(n) in array order.</p>`,
      followUps: ['How do you print a PriorityQueue in sorted order without destroying it? (copy, then poll the copy, or sort toArray())']
    }
  });

  practice.push({
    title: 'Bucket Index Calculator (HashMap Math)', level: 'Easy', tags: ['hashing', 'bit manipulation', 'hashmap internals'], companies: ['Oracle', 'SAP', 'Morgan Stanley'],
    statement: `<p>Write two functions that reproduce <code>java.util.HashMap</code>'s math: <code>int tableSizeFor(int requested)</code> — the smallest power of two ≥ requested (minimum 1, maximum 2<sup>30</sup>) — and <code>int bucketIndex(Object key, int tableLength)</code> — spread the key's hashCode with <code>h ^ (h &gt;&gt;&gt; 16)</code> (null → 0) and mask with <code>tableLength − 1</code>.</p>`,
    constraints: `tableLength is a power of two between 1 and 2<sup>30</sup>. No modulo operator, no loops over bits for bucketIndex.`,
    example: `<p>tableSizeFor(10) = ${H.c('g', '16')}, tableSizeFor(16) = 16, tableSizeFor(17) = 32. bucketIndex("apple", 16) = ${H.c('g', '1')} (hashCode 93029210), bucketIndex(null, 16) = 0, bucketIndex(65536, 16) = ${H.c('b', '1')} — without spreading it would be 0.</p>`,
    brute: { why: `<p>Using <code>Math.abs(h) % n</code> is slower (division) and has a famous bug: <code>Math.abs(Integer.MIN_VALUE)</code> is still negative, giving a negative index. Rounding up by looping <code>p *= 2</code> works but is O(log n) and needs overflow care.</p>`, code: `class BruteIndex {
    static int tableSizeFor(int requested) { int p = 1; while (p < requested && p < (1 << 30)) p *= 2; return p; }
    static int bucketIndex(Object key, int n) {
        int h = key == null ? 0 : key.hashCode();
        return Math.abs(h) % n;            // breaks for Integer.MIN_VALUE, ignores high bits
    }
}` },
    mcq: { q: 'Why is (n − 1) & h equal to h mod n only when n is a power of two?', options: ['Then n − 1 is all ones in the low bits, so AND keeps exactly the remainder bits', 'Because AND is always equal to modulo', 'Because h is always positive', 'Because Java rounds negative numbers'], answer: 0, explain: 'For n = 16, n − 1 = 0b1111; AND keeps the low 4 bits, which is the non-negative remainder mod 16. For n = 10 the mask 0b1001 would skip values entirely.' },
    hints: [`<p>Hint 1: for powers of two, <code>x &amp; (n − 1)</code> is the remainder mod n and is never negative, even for negative x.</p>`, `<p>Hint 2: <code>-1 &gt;&gt;&gt; Integer.numberOfLeadingZeros(cap − 1)</code> gives a mask of all ones covering cap − 1; add 1 to get the next power of two.</p>`, `<p>Hint 3: handle requested ≤ 1 → 1, and clamp to 2<sup>30</sup>. In bucketIndex, null maps to hash 0 just like HashMap.</p>`],
    solution: {
      approach: `<p>Copy the JDK: a branch-free next-power-of-two via numberOfLeadingZeros, and the spread-then-mask index computation.</p>`,
      code: `class HashMath {
    static final int MAX = 1 << 30;

    static int tableSizeFor(int requested) {
        int n = -1 >>> Integer.numberOfLeadingZeros(Math.max(requested, 1) - 1);
        return (n < 0) ? 1 : (n >= MAX) ? MAX : n + 1;
    }

    static int bucketIndex(Object key, int tableLength) {
        int h = (key == null) ? 0 : key.hashCode();
        h ^= (h >>> 16);                       // fold high bits into low bits
        return (tableLength - 1) & h;          // fast, never negative
    }

    public static void main(String[] args) {
        System.out.println(tableSizeFor(10) + " " + tableSizeFor(16) + " " + tableSizeFor(17) + " " + tableSizeFor(0)); // 16 16 32 1
        System.out.println(bucketIndex("apple", 16) + " " + bucketIndex(null, 16) + " " + bucketIndex(65536, 16));   // 1 0 1
        System.out.println(bucketIndex(Integer.MIN_VALUE, 16));                                                     // 0 (never negative)
    }
}`,
      dry: { head: ['input', 'intermediate', 'result'], rows: [['tableSizeFor(17)', 'nlz(16) = 27 → -1 >>> 27 = 31', '32'], ['bucketIndex("apple",16)', 'h = 93029210, spread = 93030097', '93030097 & 15 = 1'], ['bucketIndex(65536,16)', '65536 ^ 1 = 65537', '1'], ['bucketIndex(MIN_VALUE,16)', '0x80000000 ^ 0x8000 = 0x80008000', '0']] },
      complexity: `<p>Both O(1): a handful of bit operations.</p>`,
      followUps: ['Why does ConcurrentHashMap additionally AND with 0x7fffffff? (negative hashes are reserved for special nodes)']
    }
  });

  practice.push({
    title: 'Bounded "Recently Added" Map (FIFO eviction)', level: 'Easy', tags: ['linkedhashmap', 'design', 'eviction'], companies: ['Microsoft', 'Salesforce', 'Zoho'],
    statement: `<p>Create a map that remembers at most <code>maxEntries</code> keys and, when full, evicts the key that was <b>inserted earliest</b> (FIFO — reads do not refresh anything). Updating an existing key keeps its original position. Implement it by extending <code>LinkedHashMap</code> in insertion-order mode.</p>`,
    constraints: `1 ≤ maxEntries ≤ 10<sup>5</sup>; put/get must be O(1).`,
    example: `<p>max = 2: put(a), put(b), get(a), put(c) → map is ${H.c('g', '{b, c}')} — ${H.c('r', 'a')} was evicted even though it was just read, because this is FIFO, not LRU.</p>`,
    brute: { why: `<p>A HashMap plus an ArrayList of keys: evicting the oldest uses <code>keys.remove(0)</code>, an O(n) shift on every insert once full; updates also need an O(n) search to avoid duplicate keys in the list.</p>`, code: `class SlowFifo<K, V> {
    private final int max;
    private final java.util.Map<K, V> map = new java.util.HashMap<>();
    private final java.util.List<K> order = new java.util.ArrayList<>();
    SlowFifo(int max) { this.max = max; }
    void put(K k, V v) {
        if (!map.containsKey(k)) { order.add(k); if (order.size() > max) map.remove(order.remove(0)); } // O(n) shift
        map.put(k, v);
    }
    V get(K k) { return map.get(k); }
}` },
    mcq: { q: 'Which single constructor argument turns this FIFO map into an LRU cache?', options: ['accessOrder = true in new LinkedHashMap<>(cap, 0.75f, true)', 'A smaller load factor', 'A TreeMap comparator', 'Overriding get()'], answer: 0, explain: 'With accessOrder = true, get and put of existing keys move the entry to the tail, so the head becomes the least recently used entry instead of the earliest inserted one.' },
    hints: [`<p>Hint 1: the default LinkedHashMap already keeps insertion order and ignores re-puts for ordering.</p>`, `<p>Hint 2: override <code>protected boolean removeEldestEntry(Map.Entry&lt;K,V&gt; eldest)</code> and return <code>size() &gt; maxEntries</code>.</p>`, `<p>Hint 3: do NOT pass accessOrder = true (that would make it LRU). Check: max = 2, put a, put b, get a, put c → a is evicted.</p>`],
    solution: {
      approach: `<p>Insertion-ordered LinkedHashMap with the eviction hook. The head is always the earliest-inserted surviving key, so evicting it is O(1).</p>`,
      code: `import java.util.LinkedHashMap;
import java.util.Map;

class FifoMap<K, V> extends LinkedHashMap<K, V> {
    private final int maxEntries;

    FifoMap(int maxEntries) {
        super(16, 0.75f, false);              // insertion order (the default)
        this.maxEntries = maxEntries;
    }

    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        return size() > maxEntries;           // evict the earliest-inserted key
    }

    public static void main(String[] args) {
        FifoMap<String, Integer> m = new FifoMap<>(2);
        m.put("a", 1); m.put("b", 2);
        m.get("a");                           // does not refresh in insertion-order mode
        m.put("c", 3);
        System.out.println(m);                // {b=2, c=3}
        m.put("b", 20);                       // update keeps position
        System.out.println(m.keySet());       // [b, c]
    }
}`,
      dry: { head: ['op', 'list head → tail', 'size > 2?', 'evicted'], rows: [['put a', 'a', 'no', '-'], ['put b', 'a, b', 'no', '-'], ['get a', 'a, b (unchanged)', '-', '-'], ['put c', 'a, b, c', 'yes', H.c('r', 'a')], ['put b=20', 'b, c', 'no (update)', '-']] },
      complexity: `<p>O(1) per put/get; O(maxEntries) space.</p>`,
      followUps: ['Evict by total byte size instead of entry count', 'Add a time-to-live per entry using the eldest entry\'s timestamp']
    }
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Predict the Output: Which for-each Removal Throws CME?', level: 'Medium', tags: ['predict the output', 'fail-fast', 'modCount'], companies: ['Goldman Sachs', 'JP Morgan', 'Amazon', 'Wipro'],
    statement: `<p>For each target value t ∈ {1, 2, 3}, this method runs on a fresh list <code>[1, 2, 3]</code>. What is printed for each t?</p>
      <pre>static String run(int t) {
    List&lt;Integer&gt; list = new ArrayList&lt;&gt;(List.of(1, 2, 3));
    try {
        for (Integer x : list) if (x == t) list.remove(x);
        return list.toString();
    } catch (ConcurrentModificationException e) { return "CME"; }
}</pre>`,
    constraints: `Use the real ArrayList.Itr logic: hasNext() is cursor != size; next() checks modCount first.`,
    example: `<p>run(1) → ${H.c('r', 'CME')}, run(2) → ${H.c('g', '[1, 3]')} (no exception!), run(3) → ${H.c('r', 'CME')}.</p>`,
    brute: { why: `<p>The usual belief "removing inside for-each always throws CME" predicts CME for all three. It misses that the check lives in <code>next()</code>, and the loop may end before <code>next()</code> is called again.</p>`, code: `for (int t = 1; t <= 3; t++) System.out.println("t=" + t + " -> CME (assumed)");   // the naive answer` },
    mcq: { q: 'Why does removing the SECOND-TO-LAST element not throw?', options: ['After removal, size equals cursor, so hasNext() returns false and next() (which checks modCount) is never called', 'ArrayList ignores removals of middle elements', 'The JIT optimizes the check away', 'remove(Object) does not change modCount'], answer: 0, explain: 'cursor is 2 after returning the 2nd element; removing makes size 2; hasNext() = (2 != 2) = false, loop exits silently — skipping element 3 without any error.' },
    hints: [`<p>Hint 1: track two numbers: <code>cursor</code> (index of next element to return) and <code>size</code>. The modCount check happens only inside <code>next()</code>.</p>`, `<p>Hint 2: t = 2: after returning 2, cursor = 2; remove → size = 2 → hasNext false. t = 3: after returning 3, cursor = 3; remove → size = 2 → 3 != 2 → hasNext TRUE → next() → CME.</p>`, `<p>Hint 3: note that <code>list.remove(x)</code> with an <code>Integer</code> argument calls remove(Object), not remove(int index). The correct way: <code>list.removeIf(x -&gt; x == t)</code> or an explicit Iterator with <code>it.remove()</code>.</p>`],
    solution: {
      approach: `<p>Simulate cursor/size/modCount. The silent case is a real bug: the loop exits early and would skip any element after the removed one. Always use Iterator.remove or removeIf.</p>`,
      code: `import java.util.*;

class FailFastQuiz {
    static String run(int t) {
        List<Integer> list = new ArrayList<>(List.of(1, 2, 3));
        try {
            for (Integer x : list) if (x == t) list.remove(x);   // remove(Object)
            return list.toString();
        } catch (ConcurrentModificationException e) { return "CME"; }
    }

    static String fixed(int t) {
        List<Integer> list = new ArrayList<>(List.of(1, 2, 3));
        list.removeIf(x -> x == t);                              // single pass, no CME
        return list.toString();
    }

    public static void main(String[] args) {
        for (int t = 1; t <= 3; t++) System.out.println("t=" + t + " -> " + run(t) + " | fixed " + fixed(t));
        // t=1 -> CME    | fixed [2, 3]
        // t=2 -> [1, 3] | fixed [1, 3]
        // t=3 -> CME    | fixed [1, 2]
    }
}`,
      dry: { head: ['t', 'returned before remove', 'cursor', 'size after remove', 'hasNext()', 'outcome'], rows: [['1', '1', '1', '2', 'true → next()', H.c('r', 'CME')], ['2', '1, 2', '2', '2', 'false', H.c('g', '[1, 3]')], ['3', '1, 2, 3', '3', '2', 'true (3 != 2) → next()', H.c('r', 'CME')]] },
      complexity: `<p>Trivial sizes; the lesson is semantic. removeIf is O(n) overall.</p>`,
      followUps: ['What happens with a CopyOnWriteArrayList instead? (no CME; removes, iterates the snapshot)', 'With a HashMap keySet and map.remove(k) inside the loop?']
    }
  });

  practice.push({
    title: 'Predict the Output: HashMap Iteration Order of Integer Keys', level: 'Medium', tags: ['predict the output', 'hashmap internals', 'buckets'], companies: ['Adobe', 'Oracle', 'Paytm'],
    statement: `<p>What do the two print statements output? (Integer.hashCode() is the value itself; the table has the default 16 buckets.)</p>
      <pre>Map&lt;Integer, String&gt; m = new HashMap&lt;&gt;();
for (int k : new int[]{100, 3, 17, 33, 1}) m.put(k, "v");
System.out.println(m.keySet());
m.put(16, "v");
System.out.println(m.keySet());</pre>`,
    constraints: `Default capacity 16, load factor 0.75 (no resize happens: size stays ≤ 12). For values below 65536 the spread step changes nothing.`,
    example: `<p>Output:</p><pre>[17, 33, 1, 3, 100]
[16, 17, 33, 1, 3, 100]</pre><p>Bucket 1 holds the chain ${H.c('g', '17 → 33 → 1')} (in insertion order, appended at the tail), bucket 3 holds 3, bucket 4 holds 100; 16 lands in ${H.c('b', 'bucket 0')} and therefore prints first.</p>`,
    brute: { why: `<p>Guessing "insertion order" ([100, 3, 17, 33, 1]) or "sorted order" ([1, 3, 17, 33, 100]) are both wrong: HashMap iterates bucket by bucket, and within a bucket in chain order.</p>`, code: `int[] keys = {100, 3, 17, 33, 1};
System.out.println(Arrays.toString(keys));   // insertion order — NOT what HashMap prints
int[] s = keys.clone(); Arrays.sort(s);
System.out.println(Arrays.toString(s));      // sorted order — also NOT what HashMap prints` },
    mcq: { q: 'Which bucket does key 33 go to in a 16-bucket table?', options: ['1, because 33 & 15 = 1', '33', '3, the first digit', '0'], answer: 0, explain: '33 = 0b100001; the low 4 bits are 0001 → bucket 1, the same bucket as 1 and 17.' },
    hints: [`<p>Hint 1: index = key &amp; 15 for these small Integers. Compute it for 100, 3, 17, 33, 1 and 16.</p>`, `<p>Hint 2: 100 → 4, 3 → 3, 17 → 1, 33 → 1, 1 → 1, 16 → 0. Chains keep insertion order (Java 8+ appends at the tail).</p>`, `<p>Hint 3: iteration goes bucket 0, 1, 2, … and walks each chain front to back. Never rely on this in real code — it changes with capacity and Java version.</p>`],
    solution: {
      approach: `<p>Compute each key's bucket with <code>key &amp; 15</code>, keep each chain in insertion order, then read buckets in index order.</p>`,
      code: `import java.util.*;

class HashOrder {
    public static void main(String[] args) {
        Map<Integer, String> m = new HashMap<>();
        for (int k : new int[]{100, 3, 17, 33, 1}) {
            m.put(k, "v");
            System.out.println(k + " -> bucket " + (k & 15));   // 4, 3, 1, 1, 1
        }
        System.out.println(m.keySet());   // [17, 33, 1, 3, 100]
        m.put(16, "v");                   // 16 & 15 = 0
        System.out.println(m.keySet());   // [16, 17, 33, 1, 3, 100]
        System.out.println(new TreeMap<>(m).keySet());          // need sorted? use TreeMap: [1, 3, 16, 17, 33, 100]
        System.out.println(new LinkedHashMap<>(m).keySet());    // copies the HashMap's order at that moment
    }
}`,
      dry: { head: ['key', 'binary (low 5 bits)', '& 15', 'chain after insert'], rows: [['100', '00100', '4', 'b4: [100]'], ['3', '00011', '3', 'b3: [3]'], ['17', '10001', '1', 'b1: [17]'], ['33', '00001', '1', 'b1: [17, 33]'], ['1', '00001', '1', 'b1: [17, 33, 1]'], ['16', '10000', '0', 'b0: [16]']] },
      complexity: `<p>Iteration is O(capacity + size).</p>`,
      followUps: ['What changes after enough puts to resize to 32 buckets? (17 moves to bucket 17, 33 and 1 stay in 1)', 'Why do HashSet&lt;String&gt; outputs differ between Java 7 and 8? (different hashing and chain insertion)']
    }
  });

  practice.push({
    title: 'Top K Frequent Elements', level: 'Medium', tags: ['hashmap', 'heap', 'bucket sort'], companies: ['Amazon', 'Meta', 'Google', 'Yelp'],
    statement: `<p>Given an integer array <code>nums</code> and k, return the k most frequent elements (any order). The answer is unique.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>5</sup>, −10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup>, k ≤ number of distinct values. Better than O(n log n).`,
    example: `<p>nums = [1,1,1,2,2,3], k = 2 → ${H.c('g', '[1, 2]')}. Counts: 1→3, 2→2, 3→1; the two largest counts belong to 1 and 2.</p>`,
    brute: { why: `<p>Count with a HashMap, then sort all distinct entries by count: O(d log d). Fine for small d, but we only need the top k — sorting the rest is wasted work when d ≫ k.</p>`, code: `class TopKSort {
    static int[] topK(int[] nums, int k) {
        java.util.Map<Integer, Integer> cnt = new java.util.HashMap<>();
        for (int x : nums) cnt.merge(x, 1, Integer::sum);
        java.util.List<Integer> keys = new java.util.ArrayList<>(cnt.keySet());
        keys.sort((a, b) -> Integer.compare(cnt.get(b), cnt.get(a)));   // O(d log d)
        int[] res = new int[k];
        for (int i = 0; i < k; i++) res[i] = keys.get(i);
        return res;
    }
}` },
    mcq: { q: 'Using a heap of size k, which heap and which comparison?', options: ['Min-heap ordered by count; pop when size > k so the least frequent of the candidates leaves', 'Max-heap of all entries, pop k times', 'Min-heap ordered by value', 'Max-heap of size k ordered by count'], answer: 0, explain: 'A size-k min-heap by count keeps the k best seen so far, evicting the weakest in O(log k): O(d log k) total. (A full max-heap also works but is O(d + k log d).)' },
    hints: [`<p>Hint 1: first count frequencies with <code>HashMap.merge(x, 1, Integer::sum)</code> — O(n).</p>`, `<p>Hint 2: push (value, count) into a min-heap by count; when size exceeds k, poll. The heap ends with the k most frequent.</p>`, `<p>Hint 3: O(n) alternative — bucket sort: list[count] holds values with that count (counts ≤ n); scan from n down to 1 until you collect k values.</p>`],
    solution: {
      approach: `<p>HashMap for counts, then a size-k min-heap over the distinct values keyed by count. Alternative tab: bucket sort by frequency for O(n).</p>`,
      code: `import java.util.*;

class TopKFrequent {
    static int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> cnt = new HashMap<>();
        for (int x : nums) cnt.merge(x, 1, Integer::sum);                 // O(n)
        PriorityQueue<Map.Entry<Integer, Integer>> heap =
            new PriorityQueue<>(Map.Entry.comparingByValue());           // min-heap by count
        for (Map.Entry<Integer, Integer> e : cnt.entrySet()) {
            heap.offer(e);
            if (heap.size() > k) heap.poll();                            // drop the least frequent
        }
        int[] res = new int[k];
        for (int i = k - 1; i >= 0; i--) res[i] = heap.poll().getKey();  // most frequent first
        return res;
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(topKFrequent(new int[]{1, 1, 1, 2, 2, 3}, 2)));  // [1, 2]
    }
}`,
      alt: [{ lang: 'python', code: `from collections import Counter

def top_k(nums, k):
    cnt = Counter(nums)
    buckets = [[] for _ in range(len(nums) + 1)]   # bucket sort by frequency: O(n)
    for v, c in cnt.items():
        buckets[c].append(v)
    out = []
    for c in range(len(nums), 0, -1):
        for v in buckets[c]:
            out.append(v)
            if len(out) == k:
                return out
    return out

print(top_k([1, 1, 1, 2, 2, 3], 2))` }],
      dry: { head: ['entry offered', 'heap (by count) after', 'size > k?'], rows: [['1=3', '[1=3]', 'no'], ['2=2', '[2=2, 1=3]', 'no'], ['3=1', '[3=1, 1=3, 2=2] → poll 3=1', 'yes'], ['result', 'poll 2=2, then 1=3', '[1, 2]']] },
      complexity: `<p>O(n + d log k) time, O(d) space (d = distinct values). Bucket-sort variant: O(n).</p>`,
      followUps: ['Stream version: the input never ends — use a count map + periodically refreshed heap, or Count-Min Sketch for approximate heavy hitters', 'Return them sorted by frequency, ties by value']
    }
  });

  practice.push({
    title: 'Time-Based Key-Value Store', level: 'Medium', tags: ['hashmap', 'treemap', 'floorEntry', 'design'], companies: ['Google', 'Netflix', 'Lyft', 'Apple'],
    statement: `<p>Design <code>TimeMap</code> with <code>set(String key, String value, int timestamp)</code> and <code>String get(String key, int timestamp)</code>, which returns the value set for key at the <b>largest timestamp ≤ timestamp</b>, or "" if none.</p>`,
    constraints: `Up to 2·10<sup>5</sup> calls; timestamps are positive (not necessarily increasing in the follow-up).`,
    example: `<p>set("foo","bar",1); get("foo",1) → ${H.c('g', '"bar"')}; get("foo",3) → ${H.c('g', '"bar"')} (floor of 3 is 1); set("foo","bar2",4); get("foo",4) → "bar2"; get("foo",5) → "bar2"; get("foo",0) → ${H.c('r', '""')}.</p>`,
    brute: { why: `<p>Store every (key, value, timestamp) in one list and scan it for the best match: O(total sets) per get. With 10<sup>5</sup> sets and gets that is 10<sup>10</sup> steps.</p>`, code: `class SlowTimeMap {
    private final java.util.List<Object[]> rows = new java.util.ArrayList<>();
    public void set(String k, String v, int t) { rows.add(new Object[]{k, v, t}); }
    public String get(String k, int t) {
        String best = ""; int bestT = -1;
        for (Object[] r : rows) if (r[0].equals(k) && (int) r[2] <= t && (int) r[2] > bestT) { bestT = (int) r[2]; best = (String) r[1]; }
        return best;
    }
}` },
    mcq: { q: 'Inside one key\'s history, which TreeMap call answers get(key, t)?', options: ['floorEntry(t)', 'ceilingEntry(t)', 'higherEntry(t)', 'headMap(t).lastKey() always'], answer: 0, explain: 'floorEntry(t) returns the entry with the greatest timestamp ≤ t, or null if every timestamp is larger. (headMap(t, true).lastKey() also works but throws on an empty view.)' },
    hints: [`<p>Hint 1: two-level structure: key → (timestamp → value). The outer level needs exact lookup, the inner needs "greatest ≤ t".</p>`, `<p>Hint 2: <code>HashMap&lt;String, TreeMap&lt;Integer, String&gt;&gt;</code> with <code>computeIfAbsent(key, k -&gt; new TreeMap&lt;&gt;())</code>.</p>`, `<p>Hint 3: get: inner map missing → ""; e = floorEntry(t); return e == null ? "" : e.getValue(). If timestamps arrive strictly increasing, an ArrayList + binary search is even lighter.</p>`],
    solution: {
      approach: `<p>HashMap for the key (O(1)), TreeMap per key for timestamps; floorEntry walks the red-black tree in O(log h) where h is that key's history length.</p>`,
      code: `import java.util.*;

class TimeMap {
    private final Map<String, TreeMap<Integer, String>> store = new HashMap<>();

    public void set(String key, String value, int timestamp) {
        store.computeIfAbsent(key, k -> new TreeMap<>()).put(timestamp, value);
    }

    public String get(String key, int timestamp) {
        TreeMap<Integer, String> history = store.get(key);
        if (history == null) return "";
        Map.Entry<Integer, String> e = history.floorEntry(timestamp);   // greatest ts <= timestamp
        return e == null ? "" : e.getValue();
    }

    public static void main(String[] args) {
        TimeMap tm = new TimeMap();
        tm.set("foo", "bar", 1);
        System.out.println(tm.get("foo", 1) + " " + tm.get("foo", 3));   // bar bar
        tm.set("foo", "bar2", 4);
        System.out.println(tm.get("foo", 4) + " " + tm.get("foo", 5) + " [" + tm.get("foo", 0) + "]"); // bar2 bar2 []
    }
}`,
      dry: { head: ['call', 'foo history (TreeMap)', 'floorEntry', 'returns'], rows: [['set(foo,bar,1)', '{1=bar}', '-', '-'], ['get(foo,3)', '{1=bar}', '1=bar', 'bar'], ['set(foo,bar2,4)', '{1=bar, 4=bar2}', '-', '-'], ['get(foo,5)', '{1=bar, 4=bar2}', '4=bar2', 'bar2'], ['get(foo,0)', '{1=bar, 4=bar2}', 'null', '""']] },
      complexity: `<p>set and get: O(log h). Space O(total sets).</p>`,
      followUps: ['Make it thread-safe: ConcurrentHashMap + ConcurrentSkipListMap', 'Add delete(key, timestamp) and range queries between t1 and t2 (subMap)']
    }
  });

  practice.push({
    title: 'K Closest Points to Origin', level: 'Medium', tags: ['heap', 'priority queue', 'geometry'], companies: ['Meta', 'Amazon', 'Uber', 'DoorDash'],
    statement: `<p>Given points <code>[x, y]</code> and k, return the k points closest to (0, 0) by Euclidean distance (any order).</p>`,
    constraints: `1 ≤ k ≤ n ≤ 10<sup>4</sup>, −10<sup>4</sup> ≤ x, y ≤ 10<sup>4</sup>.`,
    example: `<p>points = [[3,3],[5,−1],[−2,4]], k = 2 → ${H.c('g', '[[3,3],[−2,4]]')}: squared distances 18, 26, 20 — the two smallest are 18 and 20.</p>`,
    brute: { why: `<p>Sort all points by distance: O(n log n). It works, but it orders the n − k far points we will discard anyway.</p>`, code: `class SortClosest {
    static int[][] kClosest(int[][] p, int k) {
        int[][] c = p.clone();
        java.util.Arrays.sort(c, java.util.Comparator.comparingLong(a -> (long) a[0] * a[0] + (long) a[1] * a[1]));
        return java.util.Arrays.copyOf(c, k);
    }
}` },
    mcq: { q: 'With a heap of size k, which point should be evicted when a closer one arrives?', options: ['The FARTHEST of the current k — so use a max-heap by distance', 'The closest one', 'A random one', 'The oldest one'], answer: 0, explain: 'You are keeping the k closest; the weakest member is the farthest. A max-heap exposes it at the root in O(1) and removes it in O(log k).' },
    hints: [`<p>Hint 1: compare squared distances x² + y² (no sqrt needed, and use long to be safe).</p>`, `<p>Hint 2: max-heap by distance of size k: offer each point; if size &gt; k, poll (removes the farthest).</p>`, `<p>Hint 3: comparator: <code>(a, b) -&gt; Long.compare(d(b), d(a))</code> — never subtract. O(n) average alternative: Quickselect.</p>`],
    solution: {
      approach: `<p>Max-heap of size k on squared distance. Every point costs O(log k); the heap's contents at the end are the answer.</p>`,
      code: `import java.util.*;

class KClosest {
    static long d(int[] p) { return (long) p[0] * p[0] + (long) p[1] * p[1]; }

    static int[][] kClosest(int[][] points, int k) {
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> Long.compare(d(b), d(a)));  // max-heap
        for (int[] p : points) {
            heap.offer(p);
            if (heap.size() > k) heap.poll();          // evict the farthest
        }
        return heap.toArray(new int[0][]);
    }

    public static void main(String[] args) {
        int[][] res = kClosest(new int[][]{{3, 3}, {5, -1}, {-2, 4}}, 2);
        for (int[] p : res) System.out.print(Arrays.toString(p) + " ");   // [-2, 4] [3, 3] (heap order)
        System.out.println();
    }
}`,
      dry: { head: ['point', 'dist²', 'heap after (max at root)', 'action'], rows: [['[3,3]', '18', '[18]', 'offer'], ['[5,−1]', '26', '[26, 18]', 'offer'], ['[−2,4]', '20', '[26, 18, 20] → poll 26', 'size 3 > 2'], ['end', '-', '[20, 18]', 'answer [[−2,4],[3,3]]']] },
      complexity: `<p>O(n log k) time, O(k) space.</p>`,
      followUps: ['Points arrive as an infinite stream — same heap works online', 'Average O(n) with Quickselect; what is its worst case?']
    }
  });

  practice.push({
    title: 'Open-Addressing HashSet with Tombstones', level: 'Medium', tags: ['hashing', 'open addressing', 'design', 'internals'], companies: ['Google', 'Two Sigma', 'Citadel'],
    statement: `<p>Implement <code>IntHashSet</code> for int keys using <b>open addressing with linear probing</b> (no linked lists): <code>add(x)</code>, <code>contains(x)</code>, <code>remove(x)</code>, <code>size()</code>. Removals must not break later lookups. Resize (double) when occupied slots (live + tombstones) exceed 0.5 of capacity.</p>`,
    constraints: `Up to 10<sup>6</sup> operations; any int value (including 0 and negatives) may be stored.`,
    example: `<p>Capacity 8 with a plain identity hash (x &amp; 7): keys 1, 9, 17 all hash to slot 1 → stored at slots ${H.c('b', '1, 2, 3')}. remove(9) must leave a ${H.c('y', 'TOMBSTONE')} at slot 2; otherwise contains(17) would stop at the empty slot 2 and wrongly answer false.</p>`,
    brute: { why: `<p>Removing by simply clearing the slot breaks probe chains: lookups stop at the first empty slot, so keys inserted after a collision become unreachable. Rehashing the whole table on every removal fixes it but costs O(n) per remove.</p>`, code: `class BrokenProbeSet {
    private final int[] keys = new int[16];
    private final boolean[] used = new boolean[16];
    void add(int x) { int i = x & 15; while (used[i] && keys[i] != x) i = (i + 1) & 15; keys[i] = x; used[i] = true; }
    boolean contains(int x) { int i = x & 15; while (used[i]) { if (keys[i] == x) return true; i = (i + 1) & 15; } return false; }
    void remove(int x) { int i = x & 15; while (used[i]) { if (keys[i] == x) { used[i] = false; return; } i = (i + 1) & 15; } } // BUG: breaks the chain
}` },
    mcq: { q: 'Why do tombstones count toward the resize threshold?', options: ['They lengthen probe sequences like live keys do; ignoring them can make lookups loop or crawl', 'They hold memory that must be freed', 'They are live keys in disguise', 'They do not; only live keys matter'], answer: 0, explain: 'A lookup must probe past tombstones. A table full of tombstones and no EMPTY slot makes a miss scan the whole table (or loop forever). Counting them and rebuilding on resize cleans them out.' },
    hints: [`<p>Hint 1: three slot states: EMPTY, LIVE, TOMBSTONE (deleted). Use a byte[] state array so any int (even 0) can be a key.</p>`, `<p>Hint 2: contains: probe from the home slot, skip tombstones, stop at EMPTY. add: remember the first tombstone you pass and reuse it if the key is not found.</p>`, `<p>Hint 3: resize by re-inserting only LIVE keys into a fresh table of double capacity — tombstones vanish. Mix the hash (multiply by an odd constant) so sequential keys do not cluster.</p>`],
    solution: {
      approach: `<p>Linear probing over parallel arrays (int keys + byte states). Deletion writes a tombstone; insertion reuses the first tombstone on its probe path; rebuild on 50% occupancy. This is the design used by many high-performance primitive collections (and Python dicts use a similar idea with perturbation).</p>`,
      code: `class IntHashSet {
    private static final byte EMPTY = 0, LIVE = 1, TOMB = 2;
    private int[] keys = new int[8];
    private byte[] state = new byte[8];
    private int size, occupied;                       // occupied = live + tombstones

    private static int mix(int x) { int h = x * 0x9E3779B9; return h ^ (h >>> 16); }

    public boolean contains(int x) {
        int mask = keys.length - 1;
        for (int i = mix(x) & mask; state[i] != EMPTY; i = (i + 1) & mask)
            if (state[i] == LIVE && keys[i] == x) return true;   // skip tombstones, stop at EMPTY
        return false;
    }

    public boolean add(int x) {
        if ((occupied + 1) * 2 > keys.length) rebuild(keys.length * 2);
        int mask = keys.length - 1, firstTomb = -1, i = mix(x) & mask;
        for (; state[i] != EMPTY; i = (i + 1) & mask) {
            if (state[i] == LIVE && keys[i] == x) return false;    // already present
            if (state[i] == TOMB && firstTomb < 0) firstTomb = i;
        }
        if (firstTomb >= 0) i = firstTomb; else occupied++;       // reuse a tombstone if we passed one
        keys[i] = x; state[i] = LIVE; size++;
        return true;
    }

    public boolean remove(int x) {
        int mask = keys.length - 1;
        for (int i = mix(x) & mask; state[i] != EMPTY; i = (i + 1) & mask)
            if (state[i] == LIVE && keys[i] == x) { state[i] = TOMB; size--; return true; }  // keep chain intact
        return false;
    }

    private void rebuild(int newCap) {
        int[] oldK = keys; byte[] oldS = state;
        keys = new int[newCap]; state = new byte[newCap]; size = 0; occupied = 0;
        for (int i = 0; i < oldK.length; i++) if (oldS[i] == LIVE) add(oldK[i]);   // tombstones dropped
    }

    public int size() { return size; }

    public static void main(String[] args) {
        IntHashSet s = new IntHashSet();
        for (int x : new int[]{1, 9, 17, 0, -5}) s.add(x);
        s.remove(9);
        System.out.println(s.contains(17) + " " + s.contains(9) + " " + s.contains(0) + " " + s.size()); // true false true 4
        for (int i = 0; i < 100_000; i++) s.add(i);
        System.out.println(s.size());   // 100001 (0..99999 plus -5)
    }
}`,
      dry: { head: ['op', 'probe path', 'slot states touched', 'result'], rows: [['add 1, 9, 17 (same home h)', 'h, h+1, h+2', 'LIVE, LIVE, LIVE', 'stored consecutively'], ['remove 9', 'h → h+1', 'h+1 → TOMB', 'true'], ['contains 17', 'h (1), h+1 (TOMB, skip), h+2', 'found', 'true'], ['add 25 (home h)', 'h, h+1 TOMB (remember), h+2, h+3 EMPTY', 'reuse h+1', 'stored at h+1']] },
      complexity: `<p>Expected O(1) per operation at load ≤ 0.5 (expected probes ≈ 1.5 hit / 2.5 miss). Rebuild O(n), amortized O(1). Memory: 5 bytes per slot, no node objects — far smaller than HashSet&lt;Integer&gt;.</p>`,
      followUps: ['Robin Hood hashing: reduce probe-length variance', 'Backward-shift deletion instead of tombstones', 'Why is Java\'s HashMap chaining rather than open addressing? (null-friendly, simple removal, treeification)']
    }
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'LFU Cache in O(1)', level: 'Hard', tags: ['design', 'hashmap', 'linkedhashset', 'frequency buckets'], companies: ['Amazon', 'Google', 'Microsoft', 'Snowflake'],
    statement: `<p>Implement <code>LFUCache(int capacity)</code> with <code>get(key)</code> (−1 if absent) and <code>put(key, value)</code>. When full, evict the <b>least frequently used</b> key; among ties, evict the <b>least recently used</b> of them. Each get or put of a key increments its use count. Both operations must be O(1) average.</p>`,
    constraints: `1 ≤ capacity ≤ 10<sup>4</sup>; 0 ≤ key ≤ 10<sup>5</sup>; up to 2·10<sup>5</sup> calls.`,
    example: `<p>cap 2: put(1,1), put(2,2), get(1) → 1 (freq: 1→2, 2→1), put(3,3) evicts ${H.c('r', '2')} (lowest freq), get(2) → −1, get(3) → 3 (freq 2), put(4,4): keys 1 and 3 both have freq 2 → evict the LRU among them, ${H.c('r', '1')}. get(1) → −1, get(3) → 3, get(4) → 4.</p>`,
    brute: { why: `<p>Store (value, freq, lastUsedTick) per key and scan all keys on eviction to find the minimum (freq, tick): O(capacity) per eviction — up to 2·10<sup>9</sup> steps. The waste: recomputing a minimum that changes only slightly each call.</p>`, code: `class SlowLFU {
    private final int cap; private long tick;
    private final java.util.Map<Integer, long[]> m = new java.util.HashMap<>();   // key -> {value, freq, lastUsed}
    SlowLFU(int cap) { this.cap = cap; }
    public int get(int k) { long[] e = m.get(k); if (e == null) return -1; e[1]++; e[2] = ++tick; return (int) e[0]; }
    public void put(int k, int v) {
        long[] e = m.get(k);
        if (e != null) { e[0] = v; e[1]++; e[2] = ++tick; return; }
        if (m.size() == cap) {
            int victim = -1; long[] best = null;
            for (var en : m.entrySet()) { long[] x = en.getValue();                     // O(n) scan
                if (best == null || x[1] < best[1] || (x[1] == best[1] && x[2] < best[2])) { best = x; victim = en.getKey(); } }
            m.remove(victim);
        }
        m.put(k, new long[]{v, 1, ++tick});
    }
}` },
    mcq: { q: 'How do you find the eviction victim in O(1)?', options: ['Keep minFreq and a map freq → LinkedHashSet of keys; victim = first key of the set at minFreq', 'Keep a PriorityQueue by frequency', 'Sort keys by frequency on every put', 'Use a TreeMap from frequency to key'], answer: 0, explain: 'Insertion-ordered sets per frequency give LRU order within a frequency for free; minFreq only ever increases by 1 on access or resets to 1 on insert, so it is maintained in O(1). A heap or TreeMap would be O(log n).' },
    hints: [`<p>Hint 1: three maps: key → value, key → freq, freq → <code>LinkedHashSet</code> of keys (insertion order = recency within that frequency). Plus an int <code>minFreq</code>.</p>`, `<p>Hint 2: touch(key): remove it from set[f], add to set[f + 1]; if set[f] became empty and f == minFreq, minFreq++.</p>`, `<p>Hint 3: put of a NEW key when full: victim = set[minFreq].iterator().next(); remove it everywhere; insert the new key with freq 1 and set minFreq = 1. Edge case: capacity 0 → ignore puts.</p>`],
    solution: {
      approach: `<p>Frequency buckets of insertion-ordered key sets. Accesses move a key one bucket up (O(1)); eviction pulls the oldest key from the minimum bucket (O(1)). LinkedHashSet is a LinkedHashMap underneath, so we are reusing the same doubly-linked-list trick as LRU.</p>`,
      code: `import java.util.*;

class LFUCache {
    private final int capacity;
    private final Map<Integer, Integer> vals = new HashMap<>(), freq = new HashMap<>();
    private final Map<Integer, LinkedHashSet<Integer>> buckets = new HashMap<>();
    private int minFreq;

    LFUCache(int capacity) { this.capacity = capacity; }

    private void touch(int key) {
        int f = freq.get(key);
        freq.put(key, f + 1);
        LinkedHashSet<Integer> set = buckets.get(f);
        set.remove(key);
        if (set.isEmpty()) { buckets.remove(f); if (minFreq == f) minFreq++; }
        buckets.computeIfAbsent(f + 1, x -> new LinkedHashSet<>()).add(key);   // newest at the end
    }

    public int get(int key) {
        Integer v = vals.get(key);
        if (v == null) return -1;
        touch(key);
        return v;
    }

    public void put(int key, int value) {
        if (capacity == 0) return;
        if (vals.containsKey(key)) { vals.put(key, value); touch(key); return; }
        if (vals.size() == capacity) {
            LinkedHashSet<Integer> set = buckets.get(minFreq);
            int victim = set.iterator().next();          // least recently used among least frequent
            set.remove(victim);
            if (set.isEmpty()) buckets.remove(minFreq);
            vals.remove(victim); freq.remove(victim);
        }
        vals.put(key, value); freq.put(key, 1);
        buckets.computeIfAbsent(1, x -> new LinkedHashSet<>()).add(key);
        minFreq = 1;
    }

    public static void main(String[] args) {
        LFUCache c = new LFUCache(2);
        c.put(1, 1); c.put(2, 2);
        System.out.print(c.get(1) + " ");                // 1
        c.put(3, 3);                                     // evicts 2
        System.out.print(c.get(2) + " " + c.get(3) + " "); // -1 3
        c.put(4, 4);                                     // 1 and 3 have freq 2; 1 is LRU -> evicted
        System.out.println(c.get(1) + " " + c.get(3) + " " + c.get(4)); // -1 3 4
    }
}`,
      dry: { head: ['call', 'buckets (freq → keys, oldest first)', 'minFreq', 'result'], rows: [['put 1, put 2', '1:[1, 2]', '1', '-'], ['get(1)', '1:[2], 2:[1]', '1', '1'], ['put(3)', 'evict 2 → 1:[3], 2:[1]', '1', '-'], ['get(3)', '2:[1, 3]', '2', '3'], ['put(4)', 'evict 1 (oldest in 2) → 1:[4], 2:[3]', '1', '-'], ['get 1, 3, 4', 'miss; 3 → 3:[3]; 4 → 2:[4]', '2', '-1 3 4']] },
      complexity: `<p>O(1) average per operation (hash maps + linked hash sets). Space O(capacity).</p>`,
      followUps: ['Frequencies grow forever — add aging (halve all counts periodically) as TinyLFU does', 'Make it thread-safe without one global lock']
    }
  });

  practice.push({
    title: 'Validate a Red-Black Tree', level: 'Hard', tags: ['red-black tree', 'recursion', 'invariants', 'treemap internals'], companies: ['Microsoft', 'Oracle', 'Bloomberg'],
    statement: `<p>Given the root of a tree of <code>RBNode { int key; boolean red; RBNode left, right; }</code>, return true if it is a valid red-black tree: (1) strict BST ordering on keys, (2) root is black, (3) no red node has a red child, (4) every path from the root to a null link contains the same number of black nodes. An empty tree is valid.</p>`,
    constraints: `Up to 10<sup>5</sup> nodes; keys are any ints (beware Integer.MIN_VALUE / MAX_VALUE bounds). Solve in one O(n) pass.`,
    example: `<p>Root 20(B) with children 10(R) and 30(R) → ${H.c('g', 'true')}. Root 20(B) → 10(R) → 5(R) → ${H.c('r', 'false')} (red-red). Root 20(B) with left 10(B) and no right child → ${H.c('r', 'false')}: the left path has 2 blacks, the right null link only 1.</p>`,
    brute: { why: `<p>Collect every root-to-null path and count its blacks, check the BST property by comparing each node with every node in its subtrees: O(n²) in the worst case (and O(n·h) memory for paths). The redundancy: each subtree's black height is recomputed for every ancestor.</p>`, code: `class BruteRBCheck {
    static final class RBNode { int key; boolean red; RBNode left, right; RBNode(int k, boolean r) { key = k; red = r; } }
    static java.util.Set<Integer> heights = new java.util.HashSet<>();
    static void paths(RBNode n, int blacks) {                   // record black count of every null link
        if (n == null) { heights.add(blacks); return; }
        paths(n.left, blacks + (n.red ? 0 : 1)); paths(n.right, blacks + (n.red ? 0 : 1));
    }
    static boolean allLess(RBNode n, int k) { return n == null || (n.key < k && allLess(n.left, k) && allLess(n.right, k)); }
    static boolean allMore(RBNode n, int k) { return n == null || (n.key > k && allMore(n.left, k) && allMore(n.right, k)); }
    static boolean bstAndColors(RBNode n) {                       // O(n^2): rescans subtrees per node
        if (n == null) return true;
        if (n.red && ((n.left != null && n.left.red) || (n.right != null && n.right.red))) return false;
        return allLess(n.left, n.key) && allMore(n.right, n.key) && bstAndColors(n.left) && bstAndColors(n.right);
    }
    static boolean valid(RBNode root) {
        heights.clear(); paths(root, 0);
        return (root == null || !root.red) && heights.size() <= 1 && bstAndColors(root);
    }
}` },
    mcq: { q: 'What should the recursive helper return so that each node is visited once?', options: ['The subtree\'s black height, or −1 if the subtree is invalid', 'A boolean only', 'The number of red nodes', 'The subtree size'], answer: 0, explain: 'Returning the black height lets the parent compare left vs right in O(1); −1 propagates failure. Pass (lo, hi) bounds down for the BST check and the parent colour for the red-red check.' },
    hints: [`<p>Hint 1: one DFS can check everything if it carries <b>bounds</b> (lo, hi) down and returns the <b>black height</b> up.</p>`, `<p>Hint 2: <code>int bh(node, lo, hi, parentRed)</code>: null → 1 (null leaves count as black). Fail (−1) if key ∉ (lo, hi), or node.red &amp;&amp; parentRed, or left height ≠ right height.</p>`, `<p>Hint 3: use <code>long</code> bounds starting at Long.MIN_VALUE / Long.MAX_VALUE so keys equal to Integer extremes work. Check root colour separately.</p>`],
    solution: {
      approach: `<p>Single post-order DFS: bounds enforce BST order, a parentRed flag enforces "no red-red", and returned black heights must match at every node. Any violation returns −1 all the way up.</p>`,
      code: `class RBValidator {
    static final class RBNode {
        int key; boolean red; RBNode left, right;
        RBNode(int key, boolean red, RBNode left, RBNode right) { this.key = key; this.red = red; this.left = left; this.right = right; }
    }

    static boolean isValid(RBNode root) {
        if (root == null) return true;
        if (root.red) return false;                                  // rule 2
        return blackHeight(root, Long.MIN_VALUE, Long.MAX_VALUE, false) > 0;
    }

    /** Returns black height of the subtree (null = 1), or -1 if invalid. */
    private static int blackHeight(RBNode n, long lo, long hi, boolean parentRed) {
        if (n == null) return 1;
        if (n.key <= lo || n.key >= hi) return -1;                   // rule 1: strict BST bounds
        if (n.red && parentRed) return -1;                           // rule 3: no red-red
        int l = blackHeight(n.left, lo, n.key, n.red);
        if (l < 0) return -1;
        int r = blackHeight(n.right, n.key, hi, n.red);
        if (r < 0 || l != r) return -1;                              // rule 4: equal black heights
        return l + (n.red ? 0 : 1);
    }

    public static void main(String[] args) {
        RBNode ok = new RBNode(20, false, new RBNode(10, true, null, null), new RBNode(30, true, null, null));
        RBNode redRed = new RBNode(20, false, new RBNode(10, true, new RBNode(5, true, null, null), null), null);
        RBNode unbalanced = new RBNode(20, false, new RBNode(10, false, null, null), null);
        RBNode badOrder = new RBNode(20, false, new RBNode(10, true, null, new RBNode(25, false, null, null)), new RBNode(30, true, null, null));
        System.out.println(isValid(ok) + " " + isValid(redRed) + " " + isValid(unbalanced) + " " + isValid(badOrder)); // true false false false
    }
}`,
      dry: { head: ['tree', 'node checked', 'left bh', 'right bh', 'verdict'], rows: [['ok', '10(R)', '1', '1', 'bh 1'], ['ok', '20(B)', '1', '1', H.c('g', 'bh 2 → true')], ['redRed', '5(R) under 10(R)', '-', '-', H.c('r', 'red-red → −1')], ['unbalanced', '20(B)', '2 (via 10B)', '1 (null)', H.c('r', '2 ≠ 1 → −1')], ['badOrder', '25 under 10 inside left of 20', '-', '-', H.c('r', '25 ∉ (10, 20) → −1')]] },
      complexity: `<p>O(n) time (each node once), O(h) recursion stack — h ≤ 2·log₂(n + 1) for a valid tree, but an invalid degenerate input can be O(n) deep; use an explicit stack for hostile inputs.</p>`,
      followUps: ['Also verify parent pointers are consistent', 'Given a valid RB tree, compute its height bound from the black height']
    }
  });

  practice.push({
    title: 'Sliding Window Median', level: 'Hard', tags: ['treeset', 'heaps', 'sliding window', 'order statistics'], companies: ['Google', 'Amazon', 'Two Sigma', 'Hudson River Trading'],
    statement: `<p>Given <code>nums</code> and window size k, return the median of every window of length k as a <code>double[]</code> (for even k, the mean of the two middle values).</p>`,
    constraints: `1 ≤ k ≤ n ≤ 10<sup>5</sup>; values are any ints (watch overflow when averaging).`,
    example: `<p>nums = [1,3,−1,−3,5,3,6,7], k = 3 → ${H.c('g', '[1, −1, −1, 3, 5, 6]')}. Window [1,3,−1] sorted is [−1, ${H.c('y', '1')}, 3].</p>`,
    brute: { why: `<p>Copy and sort each window: O((n − k + 1) · k log k) ≈ 10<sup>10</sup> for n = 10<sup>5</sup>, k = 5·10<sup>4</sup>. Consecutive windows differ by one element, yet we re-sort everything.</p>`, code: `class BruteMedian {
    static double[] medians(int[] a, int k) {
        double[] res = new double[a.length - k + 1];
        for (int i = 0; i + k <= a.length; i++) {
            int[] w = java.util.Arrays.copyOfRange(a, i, i + k);
            java.util.Arrays.sort(w);                                   // O(k log k) each time
            res[i] = (k % 2 == 1) ? w[k / 2] : ((double) w[k / 2 - 1] + w[k / 2]) / 2.0;
        }
        return res;
    }
}` },
    mcq: { q: 'Why store INDEXES in TreeSets instead of values?', options: ['Duplicates: a TreeSet of values would collapse equal numbers; (value, index) pairs are unique and removable in O(log k)', 'Indexes are smaller', 'TreeSet cannot hold ints', 'It makes the median O(1)'], answer: 0, explain: 'A TreeSet treats compare() == 0 as "same element". Ordering indexes by (nums[i], i) keeps duplicates distinct and lets you remove exactly the outgoing element.' },
    hints: [`<p>Hint 1: keep two balanced halves: <code>low</code> (smaller half) and <code>high</code> (larger half), with low.size() == high.size() or one more.</p>`, `<p>Hint 2: use two <code>TreeSet&lt;Integer&gt;</code> of indexes ordered by <code>(nums[i], i)</code>. TreeSet supports remove(any) in O(log k) — a PriorityQueue's remove(Object) is O(k).</p>`, `<p>Hint 3: add: put into low, move low.last() to high, rebalance if high is bigger. Remove the outgoing index from whichever set holds it, then rebalance. Median: low.last() for odd k, average as doubles for even k.</p>`],
    solution: {
      approach: `<p>Two red-black trees (TreeSets) holding the lower and upper halves of the window, keyed by (value, index). Each slide is one insert, one delete and O(1) rebalancing moves — each O(log k).</p>`,
      code: `import java.util.*;

class SlidingMedian {
    static double[] medianSlidingWindow(int[] nums, int k) {
        Comparator<Integer> byVal = (i, j) -> nums[i] != nums[j] ? Integer.compare(nums[i], nums[j]) : Integer.compare(i, j);
        TreeSet<Integer> low = new TreeSet<>(byVal), high = new TreeSet<>(byVal);
        double[] res = new double[nums.length - k + 1];
        for (int i = 0; i < nums.length; i++) {
            low.add(i);
            high.add(low.pollLast());                         // largest of low goes up
            if (high.size() > low.size()) low.add(high.pollFirst());
            if (i >= k) {                                     // remove the element leaving the window
                int out = i - k;
                if (!low.remove(out)) high.remove(out);
                while (low.size() < high.size()) low.add(high.pollFirst());
                while (low.size() > high.size() + 1) high.add(low.pollLast());
            }
            if (i >= k - 1) {
                res[i - k + 1] = (k % 2 == 1) ? nums[low.last()]
                    : ((double) nums[low.last()] + nums[high.first()]) / 2.0;   // double math: no overflow
            }
        }
        return res;
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(medianSlidingWindow(new int[]{1, 3, -1, -3, 5, 3, 6, 7}, 3)));
        // [1.0, -1.0, -1.0, 3.0, 5.0, 6.0]
        System.out.println(Arrays.toString(medianSlidingWindow(new int[]{Integer.MAX_VALUE, Integer.MAX_VALUE}, 2)));
        // [2.147483647E9]
    }
}`,
      dry: { head: ['i', 'window', 'low (values)', 'high (values)', 'median'], rows: [['2', '[1, 3, −1]', '[−1, 1]', '[3]', '1'], ['3', '[3, −1, −3]', '[−3, −1]', '[3]', '−1'], ['4', '[−1, −3, 5]', '[−3, −1]', '[5]', '−1'], ['5', '[−3, 5, 3]', '[−3, 3]', '[5]', '3'], ['6', '[5, 3, 6]', '[3, 5]', '[6]', '5'], ['7', '[3, 6, 7]', '[3, 6]', '[7]', '6']] },
      complexity: `<p>O(n log k) time, O(k) space.</p>`,
      followUps: ['Two PriorityQueues with lazy deletion (a HashMap of pending removals) — same complexity, smaller constants', 'Sliding window k-th smallest for arbitrary k (order-statistic tree / Fenwick tree over compressed values)']
    }
  });

  practice.push({
    title: 'Thread-Safe Sharded LRU Cache', level: 'Hard', tags: ['concurrency', 'lru', 'locks', 'design'], companies: ['Netflix', 'Uber', 'Stripe', 'Datadog'],
    statement: `<p>Build <code>ShardedLruCache&lt;K, V&gt;</code> safe for many threads: <code>V get(K key)</code>, <code>void put(K key, V value)</code>, <code>long hits()</code>, <code>long misses()</code>. Total capacity C is split across S shards (power of two); each shard is an independent LRU. Explain why protecting an access-ordered <code>LinkedHashMap</code> with a <code>ReadWriteLock</code> (read lock for get) is broken.</p>`,
    constraints: `C up to 10<sup>6</sup>, S up to 256, 64 threads, read-heavy (90% gets).`,
    example: `<p>C = 4, S = 2 → each shard holds 2 keys. Keys hashing to shard 0 never evict keys in shard 1; eviction is LRU ${H.c('y', 'per shard')} (approximate global LRU). 64 threads mostly contend on different shard locks, so throughput scales roughly with S.</p>`,
    brute: { why: `<p>The tempting design uses a <code>ReentrantReadWriteLock</code> and lets many readers call <code>get</code> concurrently. But in access-order mode <code>get</code> <b>relinks the entry</b> (it writes before/after pointers and modCount). Two readers relinking at the same time can corrupt the list — lost nodes, cycles, NPEs. It is a write disguised as a read.</p>`, code: `import java.util.*;
import java.util.concurrent.locks.*;

class BrokenRwLru<K, V> {
    private final ReadWriteLock rw = new ReentrantReadWriteLock();
    private final Map<K, V> map;
    BrokenRwLru(int cap) {
        map = new LinkedHashMap<>(16, 0.75f, true) {
            @Override protected boolean removeEldestEntry(Map.Entry<K, V> e) { return size() > cap; }
        };
    }
    V get(K k) { rw.readLock().lock(); try { return map.get(k); } finally { rw.readLock().unlock(); } } // BUG: get mutates!
    void put(K k, V v) { rw.writeLock().lock(); try { map.put(k, v); } finally { rw.writeLock().unlock(); } }
}` },
    mcq: { q: 'Why does sharding help throughput?', options: ['Each shard has its own lock, so threads touching different shards never wait for each other', 'It makes get() lock-free', 'It improves the hit rate', 'It reduces memory usage'], answer: 0, explain: 'With one lock, 64 threads serialize on every get (which mutates the LRU list). With S shards, contention drops roughly S-fold. The cost: eviction is LRU within a shard, not globally exact.' },
    hints: [`<p>Hint 1: every operation on an access-ordered LinkedHashMap — including get — needs <b>exclusive</b> access. So use a plain lock, not a read lock.</p>`, `<p>Hint 2: shard = <code>spread(key.hashCode()) &amp; (S − 1)</code>; each shard = LinkedHashMap(accessOrder=true) + its own ReentrantLock (or synchronized). Capacity per shard = ⌈C / S⌉.</p>`, `<p>Hint 3: count hits/misses with <code>LongAdder</code> outside the lock so statistics never add contention. Never call user code (loaders) while holding a shard lock.</p>`],
    solution: {
      approach: `<p>Partition keys into S independent LRU shards, each guarded by its own ReentrantLock around an access-ordered LinkedHashMap. Statistics use LongAdder. This is the classic "lock striping" design (similar in spirit to Java 7's ConcurrentHashMap segments); production systems typically use Caffeine, which avoids locking on reads by buffering access events.</p>`,
      code: `import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.LongAdder;
import java.util.concurrent.locks.ReentrantLock;

class ShardedLruCache<K, V> {
    private static final class Shard<K, V> {
        final ReentrantLock lock = new ReentrantLock();
        final LinkedHashMap<K, V> map;
        Shard(int cap) {
            map = new LinkedHashMap<>(16, 0.75f, true) {                 // access order
                @Override protected boolean removeEldestEntry(Map.Entry<K, V> e) { return size() > cap; }
            };
        }
    }

    private final Shard<K, V>[] shards;
    private final LongAdder hits = new LongAdder(), misses = new LongAdder();

    @SuppressWarnings("unchecked")
    ShardedLruCache(int capacity, int shardCount) {
        if (Integer.bitCount(shardCount) != 1) throw new IllegalArgumentException("shardCount must be a power of two");
        shards = new Shard[shardCount];
        int per = (capacity + shardCount - 1) / shardCount;
        for (int i = 0; i < shardCount; i++) shards[i] = new Shard<>(per);
    }

    private Shard<K, V> shardFor(Object key) {
        int h = key.hashCode();
        return shards[(h ^ (h >>> 16)) & (shards.length - 1)];
    }

    public V get(K key) {
        Shard<K, V> s = shardFor(key);
        V v;
        s.lock.lock();                       // exclusive: get() relinks the entry
        try { v = s.map.get(key); } finally { s.lock.unlock(); }
        (v != null ? hits : misses).increment();   // stats outside the lock
        return v;
    }

    public void put(K key, V value) {
        Shard<K, V> s = shardFor(key);
        s.lock.lock();
        try { s.map.put(key, value); } finally { s.lock.unlock(); }
    }

    public long hits() { return hits.sum(); }
    public long misses() { return misses.sum(); }

    public static void main(String[] args) throws Exception {
        ShardedLruCache<Integer, Integer> cache = new ShardedLruCache<>(1_000, 16);
        ExecutorService pool = Executors.newFixedThreadPool(8);
        List<Future<?>> fs = new ArrayList<>();
        for (int t = 0; t < 8; t++) {
            final int seed = t;
            fs.add(pool.submit(() -> {
                Random r = new Random(seed);
                for (int i = 0; i < 100_000; i++) {
                    int k = r.nextInt(2_000);
                    if (cache.get(k) == null) cache.put(k, k * k);
                }
            }));
        }
        for (Future<?> f : fs) f.get();
        pool.shutdown();
        System.out.println("hits + misses = " + (cache.hits() + cache.misses()));   // 800000
    }
}`,
      dry: { head: ['time', 'thread A', 'thread B', 'why it is safe'], rows: [['1', 'get(k1) → shard 3 lock', 'get(k2) → shard 9 lock', 'different shards: fully parallel'], ['2', 'relink k1 in shard 3', 'relink k2 in shard 9', 'each list mutated by one thread only'], ['3', 'put(k5) → shard 3 lock acquired', 'get(k6) → shard 3 lock wait', 'same shard: serialized by its lock'], ['4', 'hits.increment()', 'misses.increment()', 'LongAdder: no lock, no lost counts']] },
      complexity: `<p>O(1) per operation; contention ≈ 1/S of a single-lock design. Space O(C). Eviction is per-shard LRU (approximate global LRU).</p>`,
      followUps: ['How does Caffeine make reads nearly lock-free? (record accesses in striped ring buffers, replay them under a tryLock)', 'Add a loader: get(key, k -> load(k)) without holding the shard lock during load (and without thundering herds)']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push(
    { q: 'You call <code>new ArrayList&lt;&gt;()</code> and then add 11 elements. What is the capacity of <code>elementData</code> now?', options: ['15', '11', '20', '16'], answer: 0, explain: 'The first add lazily allocates 10 slots; the 11th add finds it full and grows to 10 + (10 &gt;&gt; 1) = 15.' },
    { q: 'Which expression does HashMap use to pick a bucket for a key whose spread hash is <code>h</code> in a table of length <code>n</code>?', options: ['<code>(n - 1) &amp; h</code>', '<code>h % n</code>', '<code>Math.abs(h) % n</code>', '<code>h &gt;&gt;&gt; (32 - n)</code>'], answer: 0, explain: 'n is always a power of two, so n − 1 is a mask of low one-bits; AND gives a non-negative index in [0, n) and is faster than division.' },
    { q: 'What does <code>h ^ (h &gt;&gt;&gt; 16)</code> in <code>HashMap.hash()</code> achieve?', options: ['Mixes the high 16 bits into the low 16 bits so the bucket mask sees them', 'Makes the hash positive', 'Encrypts the key', 'Halves the number of collisions in all cases'], answer: 0, explain: 'The bucket index uses only the low bits. Keys whose hashCodes differ only in high bits (e.g. multiples of 65536) would otherwise all collide.' },
    { q: 'A bucket\'s chain grows past 8 nodes in a HashMap whose table length is 32. What happens?', options: ['The table is resized to 64 instead of treeifying', 'The bucket becomes a red-black tree', 'An exception is thrown', 'Nothing until the chain reaches 64'], answer: 0, explain: 'treeifyBin checks MIN_TREEIFY_CAPACITY (64). Below it, a resize is considered the better fix; treeification happens only when the table is at least 64 long.' },
    { q: 'During a HashMap resize from 16 to 32 buckets, where can a node from old bucket 5 end up?', options: ['Bucket 5 or bucket 21', 'Any bucket', 'Bucket 5 or bucket 10', 'Always bucket 21'], answer: 0, explain: 'The new index adds exactly one bit (value 16). If (hash &amp; 16) == 0 it stays at 5, otherwise it moves to 5 + 16 = 21.' },
    { q: 'You need <code>new HashMap&lt;&gt;(100)</code> to hold 100 entries. How many resizes happen while inserting them?', options: ['1 — capacity 128 has threshold 96', '0 — capacity 100 holds 100', '0 — capacity 128 is enough', '2'], answer: 0, explain: 'The 97th insert exceeds 0.75 × 128 = 96 and doubles the table to 256. Use HashMap.newHashMap(100) (Java 19+) or pass ⌈100 / 0.75⌉.' },
    { q: 'Which constructor makes a LinkedHashMap order entries from least to most recently ACCESSED?', options: ['<code>new LinkedHashMap&lt;&gt;(16, 0.75f, true)</code>', '<code>new LinkedHashMap&lt;&gt;()</code>', '<code>new LinkedHashMap&lt;&gt;(16, 0.75f)</code>', '<code>new LinkedHashMap&lt;&gt;(true)</code>'], answer: 0, explain: 'The third argument is accessOrder. With true, get/put of existing keys move the entry to the tail, so the head is the LRU entry.' },
    { q: 'In a red-black tree, the new node\'s parent is red and its uncle is also red. What is the fix?', options: ['Recolour parent and uncle black, grandparent red, and continue from the grandparent', 'Rotate at the grandparent', 'Delete the new node', 'Colour the new node black and stop'], answer: 0, explain: 'The red-uncle case needs no rotation: pushing the "redness" up two levels keeps black heights equal. Rotations are needed only when the uncle is black or missing.' },
    { q: 'What is the maximum height of a red-black tree with n keys?', options: ['2·log₂(n + 1)', 'log₂(n)', 'n / 2', '1.44·log₂(n) exactly'], answer: 0, explain: 'Black height bh satisfies n ≥ 2<sup>bh</sup> − 1 and h ≤ 2·bh (no red-red), giving h ≤ 2·log₂(n + 1). The 1.44 bound belongs to AVL trees.' },
    { q: 'For the PriorityQueue array, which index holds the parent of index 9?', options: ['4', '3', '5', '8'], answer: 0, explain: 'parent = (i − 1) &gt;&gt;&gt; 1 = 8 &gt;&gt;&gt; 1 = 4. Children of i are 2i + 1 and 2i + 2, so 4\'s children are 9 and 10.' },
    { q: 'Which PriorityQueue operation is O(n)?', options: ['<code>remove(Object)</code>', '<code>peek()</code>', '<code>offer(e)</code>', '<code>poll()</code>'], answer: 0, explain: 'The heap has no index from element to position, so remove(Object) and contains scan the array. peek is O(1); offer and poll are O(log n).' },
    { q: 'How does ConcurrentHashMap (Java 8+) insert into an EMPTY bin?', options: ['A CAS on the table slot, with no lock', 'It locks the whole table', 'It locks one of 16 segments', 'It uses synchronized on the map object'], answer: 0, explain: 'casTabAt(tab, i, null, newNode). If the CAS fails because another thread got there first, it loops and takes the non-empty path: synchronized on the first node.' },
    { q: 'Why does ConcurrentHashMap reject null keys and values?', options: ['A null from get() would be ambiguous (absent vs mapped to null) and cannot be resolved atomically under concurrency', 'Nulls do not have hashCodes so they would crash spread()', 'For backward compatibility with Hashtable only', 'To save memory'], answer: 0, explain: 'In a single-threaded HashMap you can check containsKey afterwards; in a concurrent map the answer may change between the two calls. Banning nulls removes the ambiguity (Doug Lea\'s stated reason).' },
    { q: 'What happens when you call <code>iterator.remove()</code> on a CopyOnWriteArrayList iterator?', options: ['UnsupportedOperationException', 'The element is removed from the snapshot only', 'ConcurrentModificationException', 'The element is removed from the list'], answer: 0, explain: 'COW iterators traverse an immutable snapshot array; all of their mutators throw UnsupportedOperationException. Use list.remove or removeIf instead.' },
    { q: 'Which workload fits CopyOnWriteArrayList best?', options: ['A small listener list read on every event, modified a few times per hour', 'A log buffer receiving 50,000 appends per second', 'A 10-million-element list updated by index', 'A work queue for producers and consumers'], answer: 0, explain: 'Reads are lock-free snapshots; every write copies the whole array. It shines when writes are rare and the list is small.' }
  );

  /* =====================================================================
     INTERVIEW Q&A
     ===================================================================== */
  interview.push(
    { q: 'Walk me through what happens inside <code>HashMap.put(key, value)</code>.', level: 'I', a: `<p>1) If the table is null, <code>resize()</code> allocates it (16 buckets by default). 2) <code>hash = h ^ (h &gt;&gt;&gt; 16)</code> where h = key.hashCode() (null key → 0). 3) index = <code>(n − 1) &amp; hash</code>. 4) If the bucket is empty, a new Node goes there. Otherwise walk the bucket: a node with equal hash and (same reference or <code>equals</code>) gets its value replaced and the old value is returned; if the bucket is a TreeNode bin, <code>putTreeVal</code> inserts into the red-black tree; else the node is appended at the tail, and if the chain now exceeds 8 nodes, <code>treeifyBin</code> runs (which resizes instead if the table is smaller than 64). 5) modCount++ and if <code>++size &gt; threshold</code> (0.75 × capacity) the table doubles, splitting each bucket into lo/hi lists by <code>hash &amp; oldCap</code>.</p>`, followUps: ['What does put return?', 'Where does LinkedHashMap hook into this flow? (afterNodeAccess / afterNodeInsertion)', 'What changes for putIfAbsent?'] },
    { q: 'Why is the HashMap capacity always a power of two, and what is the hash-spreading step for?', level: 'A', a: `<p>With n = 2<sup>k</sup>, <code>hash &amp; (n − 1)</code> equals the non-negative remainder mod n using one AND instead of a division, and it never produces negative indexes. It also enables the cheap resize split: doubling adds exactly one mask bit, so each node either stays at j or moves to j + oldCap, decided by <code>hash &amp; oldCap</code>, with no rehashing. The downside is that only the low k bits pick the bucket, so hashCodes differing only in high bits would collide; <code>h ^ (h &gt;&gt;&gt; 16)</code> folds the high half into the low half cheaply. It is a deliberate trade-off: a weak mix, backed by treeification for the bad cases. <code>tableSizeFor</code> rounds any requested capacity up to the next power of two.</p>`, followUps: ['How would a prime-sized table differ?', 'Why not use a strong hash like MurmurHash for every key?'] },
    { q: 'What is treeification in Java 8 HashMap? Give the exact thresholds and why they exist.', level: 'A', a: `<p>When a bucket's chain grows beyond <b>TREEIFY_THRESHOLD = 8</b> and the table length is at least <b>MIN_TREEIFY_CAPACITY = 64</b>, the chain is converted into a red-black tree of TreeNodes ordered by hash, then by compareTo for Comparable keys of the same class, then a tie-break order. Lookups in that bucket become O(log k) instead of O(k). If the table is smaller than 64 it resizes instead, because long chains in small tables usually mean "too full", not "bad hash". When a resize split leaves ≤ <b>UNTREEIFY_THRESHOLD = 6</b> nodes, the bin reverts to a list (the 8/6 gap prevents flapping). TreeNodes are about twice the size of Nodes; with a decent hash, a chain of 8 has probability ~6·10<sup>−8</sup> under the Poisson model, so trees appear mainly with bad hashCodes or hash-flooding attacks — which is exactly the defence they were added for.</p>`, followUps: ['What if colliding keys are not Comparable?', 'How does a tree bin keep iteration cheap? (TreeNodes still keep next links)'] },
    { q: 'Compare HashMap, Hashtable, Collections.synchronizedMap and ConcurrentHashMap.', level: 'I', a: `<p><b>HashMap</b>: not thread-safe, allows one null key and null values, fastest single-threaded. <b>Hashtable</b>: legacy (Java 1.0), every method synchronized on the table, no nulls, uses modulo on a non-power-of-two table — avoid. <b>synchronizedMap</b>: a wrapper that synchronizes every call on one mutex; compound actions and iteration still need external <code>synchronized (map)</code> blocks; throughput collapses under contention. <b>ConcurrentHashMap</b>: lock-free reads, CAS for empty bins, per-bin locks for writes, cooperative resizing, atomic <code>compute/merge/putIfAbsent</code>, weakly consistent iterators that never throw CME, no nulls. Default choice for shared mutable maps; for sorted concurrent maps use <code>ConcurrentSkipListMap</code>.</p>`, followUps: ['When is synchronizedMap still reasonable?', 'Why can iterating a synchronizedMap without a lock throw CME?'] },
    { q: 'How does ConcurrentHashMap achieve thread safety in Java 8 and later?', level: 'A', a: `<p>It is one <code>Node[]</code> table with volatile slot access. <b>Reads</b> use acquire reads of the slot plus volatile <code>val</code>/<code>next</code> fields — no locks; they follow ForwardingNodes during resize. <b>Writes</b>: an empty bin is filled with a CAS; a non-empty bin is updated inside <code>synchronized</code> on its first node, so only that bin is locked. Long bins become TreeBins with a small reader/writer lock-state. <b>Size</b> uses <code>baseCount</code> plus striped <code>CounterCell</code>s (LongAdder design) to avoid a hot counter. <b>Resize</b>: <code>sizeCtl</code> coordinates; threads claim strides of bins via <code>transferIndex</code> (from the high end), move them, and leave ForwardingNodes (hash −1); writers hitting a forwarded bin help transfer. Java 7 instead used 16 Segments, each a ReentrantLock-protected mini table.</p>`, followUps: ['Why is size() only an estimate under concurrency?', 'What are the special negative hash values?', 'Why keep the function in computeIfAbsent short?'] },
    { q: 'Why does ConcurrentHashMap not allow null keys or values, while HashMap does?', level: 'I', a: `<p>Because <code>get(k)</code> returning null must mean exactly one thing. In a HashMap you can disambiguate "absent" vs "mapped to null" with a follow-up <code>containsKey</code>, since no one else changes the map. In a concurrent map another thread can insert or remove between your two calls, so the pair is not atomic and the answer is meaningless. Banning nulls makes null an unambiguous "absent" signal, which also lets methods like <code>putIfAbsent</code>, <code>computeIfAbsent</code> and <code>getOrDefault</code> use null internally as the "no mapping" sentinel. Doug Lea has stated this ambiguity argument as the reason. Use <code>Optional</code> or a sentinel object if you need to cache "known missing".</p>`, followUps: ['How would you cache a negative lookup result in a CHM?', 'Does ConcurrentSkipListMap allow nulls? (no)'] },
    { q: 'How does ArrayList grow, and why is add() amortized O(1)?', level: 'I', a: `<p>ArrayList wraps an <code>Object[] elementData</code>. The no-arg constructor uses a shared empty array; the first add allocates 10. When full, <code>grow()</code> creates an array of <code>old + (old &gt;&gt; 1)</code> (1.5×), or exactly what is needed if that is more, and copies with <code>Arrays.copyOf</code>. Capacities go 10, 15, 22, 33, 49, 73… Because sizes grow geometrically, the total number of element copies over N adds is a geometric series bounded by about 3N, so the average cost per add is constant even though an individual add can be O(n). The array never shrinks automatically (use <code>trimToSize</code>). Max size is capped near <code>Integer.MAX_VALUE − 8</code>. Pre-size with the capacity constructor or <code>ensureCapacity</code> when N is known.</p>`, followUps: ['Why not grow by a fixed amount?', 'What does remove(0) cost and why?', 'How does Vector grow?'] },
    { q: 'ArrayList vs LinkedList — when, if ever, would you choose LinkedList?', level: 'I', a: `<p>ArrayList: O(1) random access, amortized O(1) append, contiguous references (cache-friendly), ~4 bytes per slot. LinkedList: a doubly linked list with ~24-byte Node objects per element, O(n) <code>get(i)</code> (walks from the nearer end), O(1) add/remove only when you already hold a <code>ListIterator</code> at that position. In practice ArrayList (or ArrayDeque for queue/deque use) wins almost every benchmark because pointer chasing causes cache misses and allocation pressure, and System.arraycopy shifting is very fast for moderate sizes. LinkedList is reasonable only for frequent insert/remove through an iterator in the middle of large lists, or when you need its <code>Deque</code> plus <code>List</code> API together — and even then ArrayDeque usually covers the deque need.</p>`, followUps: ['Why is ArrayDeque faster than LinkedList as a queue?', 'What is the memory footprint per element of each?'] },
    { q: 'Design an LRU cache. How would you do it with LinkedHashMap, and how does that work internally?', level: 'I', a: `<p>Extend <code>LinkedHashMap</code> with <code>super(capacity, 0.75f, true)</code> (accessOrder) and override <code>removeEldestEntry</code> to return <code>size() &gt; capacity</code>. Internally LinkedHashMap is a HashMap whose entries also form a doubly linked list (before/after pointers, head = eldest, tail = youngest). HashMap calls the hooks <code>afterNodeAccess</code> (moves the entry to the tail on get/put of an existing key in access-order mode), <code>afterNodeInsertion</code> (asks removeEldestEntry about the head and removes it if true) and <code>afterNodeRemoval</code>. Everything is O(1). Hand-rolled: HashMap&lt;K, Node&gt; + doubly linked list with sentinel head/tail. For concurrency, every operation (including get) mutates the list, so you need an exclusive lock, sharding, or a library like Caffeine.</p>`, followUps: ['Why is a ReadWriteLock read lock on get() a bug?', 'LRU vs LFU vs W-TinyLFU?', 'How would you add TTL?'] },
    { q: 'Explain red-black tree properties and why TreeMap uses one.', level: 'A', a: `<p>Rules: every node red or black; root black; no red node has a red child; every root-to-null path has the same number of black nodes. Together they force height ≤ 2·log₂(n + 1), so get/put/remove and the navigation methods (floor, ceiling, higher, lower, subMap) are O(log n) worst case. Inserts colour the new node red and repair with recolouring (red uncle) or one or two rotations (black uncle), at most 2 rotations per insert and 3 per delete. TreeMap needs a sorted map with good worst-case bounds and cheap updates; red-black trees rotate less than AVL trees on writes, and the code is well understood (CLRS). Keys are compared with compareTo or a Comparator — equals is never used — so a comparator inconsistent with equals changes what counts as a duplicate key.</p>`, followUps: ['Prove the height bound', 'Why does ConcurrentSkipListMap use a skip list instead of a tree?', 'What happens on put(null, v) with natural ordering?'] },
    { q: 'How is PriorityQueue implemented, and why is building it from a collection O(n)?', level: 'A', a: `<p>It is a binary heap in an <code>Object[]</code> (default capacity 11): parent (i − 1) &gt;&gt;&gt; 1, children 2i + 1 and 2i + 2, and every parent ≤ children by compareTo/Comparator. offer appends and sifts up; poll takes index 0, moves the last element to the root and sifts down toward the smaller child — both O(log n); peek is O(1); remove(Object) and contains are O(n); iteration and toString follow array order, not priority order. Growth is +old+2 below 64 elements, +50% above. The collection constructor uses Floyd's heapify: sift down every internal node from n/2 − 1 to 0. Most nodes are near the bottom and move only a little, and ∑ (n / 2<sup>h+1</sup>)·h ≤ n, so it is O(n) versus O(n log n) for n offers. It is not thread-safe (PriorityBlockingQueue is) and not stable.</p>`, followUps: ['How do you implement decrease-key with it? (lazy deletion)', 'Why might a 4-ary heap be faster?'] },
    { q: 'What is the difference between fail-fast, weakly consistent and snapshot iterators?', level: 'I', a: `<p><b>Fail-fast</b> (ArrayList, HashMap, TreeMap…): the iterator records <code>modCount</code> and its <code>next()</code> throws ConcurrentModificationException if the collection was structurally modified other than through the iterator. It is best-effort (for example, removing the second-to-last ArrayList element inside a for-each ends the loop silently) and is a bug detector, not a concurrency mechanism. <b>Weakly consistent</b> (ConcurrentHashMap, ConcurrentLinkedQueue, ConcurrentSkipListMap): never throws CME, traverses elements as they existed at some point, may or may not reflect later updates, and never returns an element twice. <b>Snapshot</b> (CopyOnWriteArrayList/Set): iterates an immutable array captured at creation, sees no later changes, and its remove/set/add throw UnsupportedOperationException. "Fail-safe" is the informal name for the last two.</p>`, followUps: ['How do you remove safely while iterating an ArrayList?', 'Can a weakly consistent iterator see an element that was removed after it started?'] },
    { q: 'When should and should not you use CopyOnWriteArrayList?', level: 'A', a: `<p>It keeps a volatile array; reads (get, iteration) are lock-free and never block; every write takes a lock, copies the entire array with the change, and publishes it with a volatile write. Use it for small, read-mostly shared lists that are iterated often and modified rarely: listener and observer lists, interceptor chains, configuration or routing snapshots. Avoid it when writes are frequent or the list is large: each write is O(n) time and allocation (a 100k-element list costs ~400 KB per add with compressed oops), which creates GC pressure and, in G1, possibly humongous allocations. Compound operations still need atomic methods like <code>addIfAbsent</code>; snapshot iterators do not see updates and do not support remove. Alternatives: ConcurrentLinkedQueue for producer/consumer, an immutable List in an AtomicReference, or a lock-protected ArrayList.</p>`, followUps: ['How does it guarantee visibility without locks on reads?', 'Is subList a snapshot? (no — it checks for comodification)'] },
    { q: 'What happens if a key\'s hashCode changes after it is put into a HashMap?', level: 'I', a: `<p>The node stays in the bucket chosen by the <b>old</b> hash, and it also caches that old hash in its <code>hash</code> field. A later <code>get</code> computes the new hash, looks in a different bucket (or compares the cached old hash and fails), and returns null; <code>containsKey</code> is false; <code>remove</code> fails. The entry is still counted in <code>size()</code> and reachable through iteration — effectively a memory leak and a correctness bug. Even a resize does not fix it, because the split uses the cached hash. The same applies to HashSet elements, and TreeMap keys whose compared fields change break the tree's ordering. Rule: keys must be immutable (records, String, boxed numbers, enums) or at least never mutate the fields used by equals/hashCode while they are in a collection.</p>`, followUps: ['How would you find such a leak in a heap dump?', 'Are records always safe keys? (only if their components are immutable)'] },
    { q: 'Describe the Java 7 HashMap infinite loop. Is Java 8\'s HashMap safe for concurrent use?', level: 'E', a: `<p>Java 7's <code>transfer()</code> moved each chain to the new table by inserting nodes at the <b>head</b> of the destination bucket, which reverses the chain. If two threads resized concurrently, one could be paused holding <code>e</code> and <code>next</code> while the other finished reversing the chain; when the first resumed it could set A.next = B with B.next already = A, producing a cycle. Any later <code>get</code> on that bucket spun forever at 100% CPU — a classic production outage. Java 8 preserves order with lo/hi tail lists, so that specific cycle cannot form. But HashMap is still <b>not thread-safe</b>: concurrent puts can lose entries (two threads writing the same empty slot), size can be wrong, and without happens-before edges other threads may see stale or partially constructed state; concurrent treeification can also corrupt bins. Use ConcurrentHashMap or external synchronization.</p>`, followUps: ['How would you diagnose a thread spinning in HashMap.get? (jstack shows it repeatedly in the same frame)', 'Why is "it worked in testing" weak evidence for thread safety?'] },
    { q: 'You must hold 10 million Long → Long mappings in memory. Estimate HashMap\'s footprint and propose alternatives.', level: 'E', a: `<p>With compressed oops: each HashMap.Node is ~32 bytes (header 12 + hash 4 + three references 12, aligned), each boxed Long ~16 bytes (two of them → 32), plus a table slot of 4 bytes at load ≤ 0.75 → table of 2<sup>24</sup> slots = 64 MB. Roughly 32 + 32 = 64 bytes per entry plus ~6.7 bytes of table each → ~700 MB for 10<sup>7</sup> entries, versus 160 MB of raw key/value data. Pre-size with <code>HashMap.newHashMap(10_000_000)</code> to avoid ~20 resizes (each temporarily holding two tables). Better: a primitive open-addressing map (fastutil Long2LongOpenHashMap, Eclipse Collections, HPPC) using two long[] arrays — about 16 bytes per slot / load factor → ~300 MB or less, with no per-entry objects and far less GC work; or off-heap / memory-mapped storage, or a sorted long[] with binary search if the data is static. Measure with JOL or a heap histogram rather than trusting estimates.</p>`, followUps: ['How does Integer caching affect this for small values?', 'What GC problems do 10 million small objects cause?'] }
  );

  registerModule({
    id: 'java10',
    title: 'Collections Internals',
    intro: `<p>You have used <code>ArrayList</code>, <code>HashMap</code> and <code>PriorityQueue</code> for years — now we open the hood. This module shows the <b>real data structures inside the JDK</b>: the growing array behind ArrayList, the bucket array, hash spreading, resize split and red-black tree bins inside HashMap, the hidden doubly-linked list that turns LinkedHashMap into an LRU cache, the red-black tree in TreeMap, the array-backed binary heap in PriorityQueue, the CAS + per-bin locking design of ConcurrentHashMap, and the snapshot trick of CopyOnWriteArrayList.</p>
      <p>Every topic starts with an everyday analogy, then a step-by-step visualizer you can feed your own input (real Java String hashes, real JDK growth rules, real red-black fix-ups), then worked examples, "predict the output" puzzles, an expert deep dive and an AI-era section. Senior Java interviews almost always include at least one of these questions — "how does HashMap work?", "design an LRU cache", "why is ConcurrentHashMap fast?" — and the answers that impress are the precise ones you will be able to give after this module.</p>`,
    goals: [
      'Explain ArrayList growth (lazy 10, then 1.5×), the amortized O(1) proof, shifting costs and fail-fast modCount checks',
      'Trace HashMap.put by hand: hashCode → spread → (n − 1) &amp; hash → chain, including resize lo/hi splitting and the 8 / 6 / 64 treeification rules',
      'Build an LRU cache both with LinkedHashMap(accessOrder = true) + removeEldestEntry and from scratch with a HashMap + doubly linked list',
      'State the red-black tree invariants, apply recolour/rotation insert fixes, and use TreeMap\'s floor/ceiling/subMap API to solve interval and time-series problems',
      'Simulate PriorityQueue sift-up/sift-down on its array, explain O(n) heapify, and pick size-k heaps for top-k problems',
      'Describe ConcurrentHashMap\'s design (lock-free reads, CAS on empty bins, per-bin synchronized, CounterCells, cooperative resize) and choose CopyOnWriteArrayList only for read-mostly data'
    ],
    prereqs: `Java 7 (Collections Framework in Practice), Java 5 (Strings, equals &amp; hashCode), Java 8 (Generics). Helpful: DSA modules on hashing, binary search trees and heaps; Big-O notation. Concurrency topics are introduced gently here and covered fully in Java 11–12.`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
