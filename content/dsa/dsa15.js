(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // ---------- small shared helpers for the visualizers ----------
  function parseNums(input, minN, maxN, lo, hi, what) {
    var s = String(input === undefined ? '' : input).trim();
    if (!s) throw new Error('Please type some whole numbers separated by spaces, e.g. 5 3 8 1');
    var a = s.split(/[\s,]+/).map(Number);
    if (a.some(function (x) { return !Number.isInteger(x); })) throw new Error('Only whole numbers please (separated by spaces) for ' + (what || 'the list'));
    if (a.length < minN) throw new Error('Need at least ' + minN + ' numbers for ' + (what || 'the list'));
    if (a.length > maxN) throw new Error('Keep it small: at most ' + maxN + ' numbers for ' + (what || 'the list') + ' so the picture fits');
    if (a.some(function (x) { return x < lo || x > hi; })) throw new Error('Numbers for ' + (what || 'the list') + ' must be between ' + lo + ' and ' + hi);
    return a;
  }
  function one(k, v) { var o = {}; o[k] = v; return o; }
  function two(k1, v1, k2, v2) { var o = {}; o[k1] = v1; o[k2] = v2; return o; }
  function swap(a, i, j) { var t = a[i]; a[i] = a[j]; a[j] = t; }
  // generic binary heap on a JS array; less(a,b) true means a should be above b
  function hpush(h, x, less) {
    h.push(x);
    var i = h.length - 1;
    while (i > 0) { var p = (i - 1) >> 1; if (less(h[i], h[p])) { swap(h, i, p); i = p; } else break; }
  }
  function hpop(h, less) {
    var top = h[0], last = h.pop();
    if (h.length) {
      h[0] = last;
      var i = 0;
      for (;;) {
        var l = 2 * i + 1, r = l + 1, b = i;
        if (l < h.length && less(h[l], h[b])) b = l;
        if (r < h.length && less(h[r], h[b])) b = r;
        if (b === i) break;
        swap(h, i, b); i = b;
      }
    }
    return top;
  }
  var MINLESS = function (a, b) { return a < b; };
  var MAXLESS = function (a, b) { return a > b; };

  // tree + array view of the SAME heap, kept in sync
  function heapParts(h, hl, ptr, ehl, treeLabel, arrLabel) {
    return [
      { type: 'tree', label: treeLabel || 'Heap drawn as a tree', arr: h.slice(), hl: hl || {}, ehl: ehl || {} },
      { type: 'array', label: arrLabel || 'The SAME heap stored in an array', values: h.slice(), hl: hl || {}, ptr: ptr || {} }
    ];
  }

  // ================= TOPIC 1: heap basics =================
  topics.push({
    title: 'Min-Heap & Max-Heap: the array trick, insert (sift-up), extract (sift-down)',
    analogy: `<p>Think of a <b>hospital emergency room</b>. Patients do not get treated in the order they walk in. The nurse always calls the <b>most serious</b> patient next. New patients keep arriving, and each time the nurse must instantly know “who is the most urgent right now?”.</p>
      <p>A <b>heap</b> is exactly that nurse's clipboard: it always keeps the “most important” item on top, and it can take in a new patient or send out the top patient quickly — without sorting everybody.</p>`,
    explain: `<p><b>What is a heap?</b> It is a binary tree with two simple rules:</p>
      <ol>
        <li><b>Shape rule</b> — the tree is filled level by level, left to right, no gaps (a “complete” tree).</li>
        <li><b>Order rule</b> — in a ${H.c('g', 'min-heap')} every parent is ≤ its children, so the smallest value sits at the top. In a ${H.c('p', 'max-heap')} every parent is ≥ its children, so the biggest sits at the top.</li>
      </ol>
      <p>Note: a heap is <b>not</b> fully sorted. Brothers and cousins can be in any order. Only “parent vs child” is guaranteed. That is why it is so cheap to maintain.</p>
      <h4>The array trick (no pointers needed!)</h4>
      <p>Because the tree has no gaps, we can write it level by level into a plain array. Then for any index <code>i</code>:</p>
      ${H.table(['you are at', 'formula', 'example i = 1'], [
        ['parent', '<code>(i - 1) / 2</code> (integer division)', '(1-1)/2 = 0'],
        ['left child', '<code>2*i + 1</code>', '3'],
        ['right child', '<code>2*i + 2</code>', '4']
      ])}
      ${H.arr([1, 3, 2, 5, 9, 8, 4], { label: 'min-heap', hl: { 0: 'p', 1: 'y', 3: 'g', 4: 'g' } })}
      <p>Here ${H.c('y', 'index 1 (value 3)')} has children at ${H.c('g', 'indices 3 and 4 (values 5, 9)')} — both bigger than 3, as the min-heap rule says. The ${H.c('p', 'root at index 0')} is the minimum.</p>
      <h4>Insert = “sift-up” (bubble up)</h4>
      <p>1) Put the new value at the <b>end</b> of the array (the next free spot in the tree). 2) While it is smaller than its parent, <b>swap</b> it with the parent. Stop when the parent is smaller or you reach the root.</p>
      ${H.table(['step', 'array', 'what happened'], [
        ['start', '[1, 3, 2, 5]', 'insert 0'],
        ['append', '[1, 3, 2, 5, ' + H.c('y', '0') + ']', '0 sits at index 4, parent = (4-1)/2 = 1 (value 3)'],
        ['swap', '[1, ' + H.c('y', '0') + ', 2, 5, 3]', '0 &lt; 3 → swap; now at index 1, parent index 0 (value 1)'],
        ['swap', '[' + H.c('g', '0') + ', 1, 2, 5, 3]', '0 &lt; 1 → swap; reached the root → stop']
      ])}
      <h4>Extract (remove the top) = “sift-down” (sink down)</h4>
      <p>1) Remember the root (that is the answer). 2) Move the <b>last</b> element into the root's place and shrink the array. 3) While this element is bigger than its <b>smaller</b> child, swap with that smaller child.</p>
      <p><b>Why pick the smaller child?</b> The smaller child will become the parent of the other child, so it must be the smaller one or the rule breaks.</p>
      <p><b>Speed:</b> a complete tree with N items has height about log₂N (1,000,000 items → only 20 levels). Sift-up and sift-down walk one path, so both are <b>O(log N)</b>. Peeking at the top is <b>O(1)</b>.</p>
      <p><b>Max-heap</b> is the mirror image: flip every “&lt;” into “&gt;”. Nothing else changes.</p>`,
    clues: [
      '"Repeatedly get the <b>smallest / largest</b> item while new items keep arriving" → heap.',
      '"<b>Priority</b>", "most urgent first", "cheapest next", "earliest deadline next" → priority queue (a heap inside).',
      'You need min/max many times but <b>never need the whole thing sorted</b> → heap beats sorting.',
      'Constraints like <code>N, Q ≤ 10<sup>5</sup></code> with "insert" + "get min" operations → each must be O(log N) → heap.',
      '"Implement a priority queue / heap from scratch" → array with parent <code>(i-1)/2</code>, children <code>2i+1</code>, <code>2i+2</code>.'
    ],
    code: [{ lang: 'java', code: `
      // Max-heap version: identical to min-heap, only the comparisons are flipped.
      class MaxHeap {
          private int[] a = new int[16];   // the tree, stored level by level
          private int size = 0;

          void insert(int x) {
              if (size == a.length) a = Arrays.copyOf(a, size * 2);  // grow when full
              a[size] = x;                 // 1) put new value at the end
              int i = size++;
              while (i > 0 && a[i] > a[(i - 1) / 2]) {   // 2) bigger than parent? (max-heap)
                  int p = (i - 1) / 2;
                  int t = a[i]; a[i] = a[p]; a[p] = t;    // swap child and parent
                  i = p;                                  // keep bubbling up
              }
          }

          int extractMax() {
              if (size == 0) throw new IllegalStateException("heap is empty");
              int top = a[0];              // the answer: largest value
              a[0] = a[--size];            // move last element to the root
              int i = 0;
              while (true) {
                  int l = 2 * i + 1, r = 2 * i + 2, big = i;
                  if (l < size && a[l] > a[big]) big = l;   // pick the BIGGER child
                  if (r < size && a[r] > a[big]) big = r;
                  if (big == i) break;                      // parent already biggest: done
                  int t = a[i]; a[i] = a[big]; a[big] = t;
                  i = big;                                  // keep sinking down
              }
              return top;
          }
      }`, alt: [
      { lang: 'python', run: true, code: `class MaxHeap:
    def __init__(self):
        self.a = []                       # the tree, stored level by level

    def insert(self, x):
        a = self.a
        a.append(x)                       # 1) put the new value at the end
        i = len(a) - 1
        while i > 0 and a[i] > a[(i - 1) // 2]:   # 2) bigger than parent? (max-heap)
            p = (i - 1) // 2
            a[i], a[p] = a[p], a[i]       # swap child and parent
            i = p                         # keep bubbling up

    def extract_max(self):
        a = self.a
        if not a:
            raise IndexError("heap is empty")
        top = a[0]                        # the answer: largest value
        last = a.pop()
        if a:
            a[0] = last                   # move the last element to the root
            i = 0
            while True:
                l, r, big = 2 * i + 1, 2 * i + 2, i
                if l < len(a) and a[l] > a[big]:
                    big = l               # pick the BIGGER child
                if r < len(a) and a[r] > a[big]:
                    big = r
                if big == i:
                    break                 # parent already biggest: done
                a[i], a[big] = a[big], a[i]
                i = big                   # keep sinking down
        return top


h = MaxHeap()
for x in [5, 3, 8, 1]:
    h.insert(x)
print(h.extract_max(), h.extract_max())   # 8 5
` },
      { lang: 'js', run: true, code: `class MaxHeap {
  constructor() { this.a = []; }          // the tree, stored level by level

  insert(x) {
    const a = this.a;
    a.push(x);                            // 1) put the new value at the end
    let i = a.length - 1;
    while (i > 0 && a[i] > a[(i - 1) >> 1]) {   // 2) bigger than parent? (max-heap)
      const p = (i - 1) >> 1;
      [a[i], a[p]] = [a[p], a[i]];        // swap child and parent
      i = p;                              // keep bubbling up
    }
  }

  extractMax() {
    const a = this.a;
    if (!a.length) throw new Error('heap is empty');
    const top = a[0], last = a.pop();     // the answer: largest value
    if (a.length) {
      a[0] = last;                        // move the last element to the root
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let big = i;
        if (l < a.length && a[l] > a[big]) big = l;   // pick the BIGGER child
        if (r < a.length && a[r] > a[big]) big = r;
        if (big === i) break;             // parent already biggest: done
        [a[i], a[big]] = [a[big], a[i]];
        i = big;                          // keep sinking down
      }
    }
    return top;
  }
}

const h = new MaxHeap();
for (const x of [5, 3, 8, 1]) h.insert(x);
console.log(h.extractMax(), h.extractMax());  // 8 5
` },
      { lang: 'cpp', code: `// Max-heap version: identical to min-heap, only the comparisons are flipped.
class MaxHeap {
    vector<int> a;                        // the tree, stored level by level

public:
    void insert(int x) {
        a.push_back(x);                   // 1) put the new value at the end
        size_t i = a.size() - 1;
        while (i > 0 && a[i] > a[(i - 1) / 2]) {   // 2) bigger than parent? (max-heap)
            swap(a[i], a[(i - 1) / 2]);   // swap child and parent
            i = (i - 1) / 2;              // keep bubbling up
        }
    }

    int extractMax() {
        if (a.empty()) throw out_of_range("heap is empty");
        int top = a[0];                   // the answer: largest value
        a[0] = a.back();                  // move the last element to the root
        a.pop_back();
        size_t i = 0, n = a.size();
        while (true) {
            size_t l = 2 * i + 1, r = l + 1, big = i;
            if (l < n && a[l] > a[big]) big = l;   // pick the BIGGER child
            if (r < n && a[r] > a[big]) big = r;
            if (big == i) break;          // parent already biggest: done
            swap(a[i], a[big]);
            i = big;                      // keep sinking down
        }
        return top;
    }
};

int main() {
    MaxHeap h;
    for (int x : {5, 3, 8, 1}) h.insert(x);
    int first = h.extractMax();
    int second = h.extractMax();
    cout << first << " " << second << endl;   // 8 5
}
` },
      { lang: 'csharp', run: true, code: `using System;

// Max-heap version: identical to min-heap, only the comparisons are flipped.
class MaxHeap
{
    private int[] a = new int[16];   // the tree, stored level by level
    private int size = 0;

    public void Insert(int x)
    {
        if (size == a.Length) Array.Resize(ref a, size * 2);  // grow when full
        a[size] = x;                 // 1) put new value at the end
        int i = size++;
        while (i > 0 && a[i] > a[(i - 1) / 2])     // 2) bigger than parent? (max-heap)
        {
            int p = (i - 1) / 2;
            int t = a[i]; a[i] = a[p]; a[p] = t;    // swap child and parent
            i = p;                                  // keep bubbling up
        }
    }

    public int ExtractMax()
    {
        if (size == 0) throw new InvalidOperationException("heap is empty");
        int top = a[0];              // the answer: largest value
        a[0] = a[--size];            // move last element to the root
        int i = 0;
        while (true)
        {
            int l = 2 * i + 1, r = 2 * i + 2, big = i;
            if (l < size && a[l] > a[big]) big = l;   // pick the BIGGER child
            if (r < size && a[r] > a[big]) big = r;
            if (big == i) break;                      // parent already biggest: done
            int t = a[i]; a[i] = a[big]; a[big] = t;
            i = big;                                  // keep sinking down
        }
        return top;
    }

    static void Main()
    {
        var h = new MaxHeap();
        foreach (int x in new[] { 4, 10, 3, 5, 1 }) h.Insert(x);
        Console.WriteLine(h.ExtractMax() + " " + h.ExtractMax());   // 10 5
    }
}` }
    ] }],
    codeTitle: ['Max-heap: same code, comparisons flipped'],
    examples: [
      {
        title: 'Read parent/child positions straight from the array',
        html: `<p>Array ${H.arr([2, 7, 4, 9, 8, 6, 5], { label: 'min-heap', hl: { 2: 'y', 5: 'g', 6: 'g' } })}</p>
          <p>Take ${H.c('y', 'index 2 (value 4)')}. Children: 2·2+1 = ${H.c('g', '5 (value 6)')} and 2·2+2 = ${H.c('g', '6 (value 5)')}. Parent: (2-1)/2 = 0 (value 2). Check the rule: 2 ≤ 4 ≤ 5 and 4 ≤ 6 → valid. No pointers were stored anywhere — the positions <b>are</b> the tree.</p>
          <p>Bonus fact: indices <code>n/2 … n-1</code> are always leaves. Here n = 7, so indices 3, 4, 5, 6 have no children (2·3+1 = 7 is already outside the array).</p>`
      },
      {
        title: 'Insert 1 into [2, 7, 4, 9, 8, 6, 5]',
        html: `${H.table(['step', 'array', 'why'], [
            ['append', '[2, 7, 4, 9, 8, 6, 5, ' + H.c('y', '1') + ']', 'next free slot is index 7; parent = (7-1)/2 = 3 (value 9)'],
            ['swap', '[2, 7, 4, ' + H.c('y', '1') + ', 8, 6, 5, 9]', '1 &lt; 9 → swap; now index 3, parent index 1 (value 7)'],
            ['swap', '[2, ' + H.c('y', '1') + ', 4, 7, 8, 6, 5, 9]', '1 &lt; 7 → swap; now index 1, parent index 0 (value 2)'],
            ['swap', '[' + H.c('g', '1') + ', 2, 4, 7, 8, 6, 5, 9]', '1 &lt; 2 → swap; reached the root, stop']
          ])}
          <p>Three swaps for 8 items: log₂8 = 3. That is the worst case — a new global minimum always travels the full height.</p>`
      },
      {
        title: 'Extract-min from [1, 2, 4, 7, 8, 6, 5, 9]',
        html: `${H.table(['step', 'array', 'why'], [
            ['take root', 'answer = ' + H.c('p', '1'), 'the minimum always lives at index 0'],
            ['last → root', '[' + H.c('y', '9') + ', 2, 4, 7, 8, 6, 5]', 'move index 7 to index 0, size becomes 7'],
            ['sink', '[2, ' + H.c('y', '9') + ', 4, 7, 8, 6, 5]', 'children 2 and 4 → smaller is 2 → swap'],
            ['sink', '[2, 7, 4, ' + H.c('y', '9') + ', 8, 6, 5]', 'children 7 and 8 → smaller is 7 → swap'],
            ['stop', '[2, 7, 4, 9, 8, 6, 5]', 'index 3 has no children (2·3+1 = 7 ≥ size)']
          ])}
          <p>If we had swapped with the <b>bigger</b> child 4 in the first sink step, 4 would sit above 2 — broken heap. Always swap with the smaller child (min-heap).</p>`
      },
      {
        title: 'Max-heap mirror: the same numbers, flipped rule',
        html: `<p>Inserting 5, 3, 8, 1 into a <b>max-heap</b>:</p>
          ${H.table(['insert', 'array after', 'note'], [['5', '[5]', 'root'], ['3', '[5, 3]', '3 ≤ 5, stays'], ['8', '[8, 3, 5]', '8 &gt; 5 → swap to the root'], ['1', '[8, 3, 5, 1]', '1 ≤ parent 3, stays']])}
          <p>Peek gives ${H.c('p', '8')}. A common shortcut in contests: store <code>-x</code> in a min-heap to fake a max-heap (careful: <code>-Integer.MIN_VALUE</code> overflows back to itself).</p>`
      }
    ],
    deepDive: `<p><b>Why the array trick works.</b> A complete tree has no holes, so “position in level order” is a perfect, gap-free numbering. With 0-based indices the children of <code>i</code> are <code>2i+1</code>, <code>2i+2</code>; with 1-based indices (common in textbooks) they become <code>2i</code>, <code>2i+1</code> and the parent is <code>i/2</code> — same idea, slightly cleaner maths. Pick one and be consistent.</p>
      <p><b>Exact height.</b> A heap of N nodes has height ⌊log₂N⌋. For N = 10<sup>6</sup> that is 19, so even the worst sift touches 20 cells. Sift-down does up to 2 comparisons per level (left vs right, then winner vs parent), sift-up only 1.</p>
      <p><b>Invariant thinking.</b> During sift-up the only possible violation is between the moving element and its parent; everything else is already a heap. During sift-down the only violation is between the moving element and its children. Proving correctness = showing each swap moves the single violation one level and never creates another one.</p>
      <p><b>Performance in real life.</b> Instead of swapping at every level, production code (including <code>java.util.PriorityQueue.siftUpComparable</code>) holds the moving value in a local variable, shifts parents/children by one copy per level, and writes the value once at the end — half the memory writes. Binary heaps are cache-friendly at the top but jump around near the leaves; <b>d-ary heaps</b> (4 children per node) are shallower and often faster in practice for big heaps, at the cost of more comparisons per sift-down.</p>
      <p><b>What a heap cannot do cheaply:</b> find an arbitrary value (O(N)), delete an arbitrary value without knowing its index (O(N) search + O(log N) fix), or decrease a key unless you keep an index map (the “indexed priority queue” used in fast Dijkstra/Prim). Edge cases to always handle: empty heap on peek/extract, duplicates (allowed — use ≤ / ≥ correctly), and capacity growth.</p>`,
    aiEra: `<p><b>What AI changes:</b> nobody hand-writes a heap at work any more — <code>PriorityQueue</code>, Python <code>heapq</code>, C++ <code>priority_queue</code> exist, and an AI assistant will generate a correct-looking heap class in seconds. Interviews still ask you to build one because it proves you understand <b>invariants</b>, index maths and O(log N) reasoning — the exact things you need to review AI code.</p>
      <p><b>Use AI as a partner:</b> ask <code>Write 10 tricky operation sequences for a min-heap (duplicates, empty extract, growth) and the expected outputs — do not show the implementation</code>, then run your own heap against them. Or ask it to explain why sift-down must pick the smaller child, and check the explanation with a 3-node counterexample.</p>
      <p><b>Where AI goes wrong:</b> off-by-one parent formula (<code>i/2</code> with 0-based indices), forgetting to check <code>r &lt; size</code> before reading the right child, swapping with the wrong child in sift-down, or not shrinking <code>size</code> before sifting. Read generated heaps line by line for exactly these.</p>
      <p><b>What you must still own:</b> drawing the tree from the array in your head, dry-running a sift in front of an interviewer, and explaining why insert/extract are O(log N) while peek is O(1).</p>`,
    viz: [
      {
        title: 'Min-heap insert: sift-up (tree and array move together)',
        input: '5 3 8 1 9 2 0',
        inputLabel: 'values to insert one by one (up to 15)',
        gen: function (input) {
          var a = parseNums(input, 2, 15, -99, 999, 'insert values');
          var h = [], frames = [];
          frames.push({ narr: 'We start with an <b>empty min-heap</b>. We will insert ' + a.join(', ') + ' one at a time. Watch the tree and the array: they are the same data drawn two ways.', parts: heapParts(h).concat([{ type: 'vars', vals: { 'to insert': a.join(' ') } }]) });
          for (var k = 0; k < a.length; k++) {
            var x = a[k];
            h.push(x);
            var i = h.length - 1;
            frames.push({ narr: 'Insert <b>' + x + '</b>: put it at the <b>end</b> of the array (index ' + i + '). In the tree that is the next empty spot, left to right. The shape rule is kept; now we fix the order rule.', parts: heapParts(h, one(i, 'ok'), one(i, 'new')).concat([{ type: 'vars', vals: { i: i, parent: i > 0 ? '(' + i + '-1)/2 = ' + ((i - 1) >> 1) : 'none (root)' } }]) });
            while (i > 0) {
              var p = (i - 1) >> 1;
              if (h[i] < h[p]) {
                var cv = h[i], pv = h[p];
                swap(h, i, p);
                frames.push({ narr: 'Child ' + cv + ' &lt; parent ' + pv + ' (parent index (' + i + '-1)/2 = ' + p + ') → the min-heap rule is broken, so <b>swap</b> them. ' + cv + ' moves up to index ' + p + '.', parts: heapParts(h, two(p, 'cur', i, 'win'), one(p, 'i'), one(i, 'ok')).concat([{ type: 'vars', vals: { i: p, parent: p > 0 ? ((p - 1) >> 1) : 'none' } }]) });
                i = p;
              } else {
                frames.push({ narr: 'Child ' + h[i] + ' ≥ parent ' + h[p] + ' (index ' + p + ') → order is fine. <b>Stop</b> sifting up. Only one path was touched: that is why insert is O(log N).', parts: heapParts(h, two(i, 'ok', p, 'done'), one(i, 'i')).concat([{ type: 'vars', vals: { i: i, parent: p } }]) });
                break;
              }
            }
            if (i === 0) frames.push({ narr: '<b>' + h[0] + '</b> reached the root (index 0). It is the new minimum of the whole heap.', parts: heapParts(h, one(0, 'sel'), one(0, 'top')).concat([{ type: 'vars', vals: { min: h[0], size: h.length } }]) });
          }
          frames.push({ narr: 'All inserted. The root <b>' + h[0] + '</b> is the smallest value. Notice the array is <b>not</b> sorted — only every parent ≤ its children.', parts: heapParts(h, one(0, 'sel')).concat([{ type: 'vars', vals: { min: h[0], size: h.length } }]) });
          return frames;
        }
      },
      {
        title: 'Min-heap extract-min: sift-down',
        input: '1 3 2 5 9 8 4 | 3',
        inputLabel: 'heap values | how many extractions',
        gen: function (input) {
          var s = String(input === undefined ? '' : input).split('|');
          if (s.length !== 2) throw new Error('Format: numbers | count, e.g. 1 3 2 5 9 8 4 | 3');
          var vals = parseNums(s[0], 2, 15, -99, 999, 'heap values');
          var cnt = parseNums(s[1], 1, 1, 1, 15, 'extraction count')[0];
          if (cnt > vals.length) throw new Error('Cannot extract more items than the heap holds');
          var h = [], frames = [], out = [];
          vals.forEach(function (v) { hpush(h, v, MINLESS); });
          frames.push({ narr: 'Here is a valid min-heap built from your numbers. The smallest value <b>' + h[0] + '</b> is at the root. Now we remove the top ' + cnt + ' time(s).', parts: heapParts(h, one(0, 'sel')).concat([{ type: 'array', label: 'extracted so far', values: out.slice() }]) });
          for (var t = 0; t < cnt; t++) {
            var top = h[0], last = h.length - 1;
            frames.push({ narr: 'Extract #' + (t + 1) + ': the answer is the root <b>' + top + '</b>. To keep the tree gap-free we will move the <b>last</b> element (' + h[last] + ', index ' + last + ') into the root.', parts: heapParts(h, two(0, 'sel', last, 'cur'), two(0, 'top', last, 'last')).concat([{ type: 'array', label: 'extracted so far', values: out.slice() }]) });
            out.push(top);
            var lv = h.pop();
            if (!h.length) {
              frames.push({ narr: 'That was the only item. The heap is now empty.', parts: heapParts(h).concat([{ type: 'array', label: 'extracted so far', values: out.slice(), hl: one(out.length - 1, 'ok') }]) });
              break;
            }
            h[0] = lv;
            frames.push({ narr: lv + ' now sits at the root. It is probably too big for the top, so it must <b>sink down</b>.', parts: heapParts(h, one(0, 'cur'), one(0, 'i')).concat([{ type: 'array', label: 'extracted so far', values: out.slice(), hl: one(out.length - 1, 'ok') }]) });
            var i = 0;
            for (;;) {
              var l = 2 * i + 1, r = 2 * i + 2, b = i;
              if (l < h.length && h[l] < h[b]) b = l;
              if (r < h.length && h[r] < h[b]) b = r;
              if (b === i) {
                var why = l >= h.length ? 'it has no children (it is a leaf)' : 'it is ≤ its children';
                frames.push({ narr: h[i] + ' at index ' + i + ' stops: ' + why + '. Heap rule restored. New minimum is <b>' + h[0] + '</b>.', parts: heapParts(h, two(i, 'ok', 0, 'sel'), one(i, 'i')).concat([{ type: 'array', label: 'extracted so far', values: out.slice() }]) });
                break;
              }
              var a1 = h[i], b1 = h[b];
              swap(h, i, b);
              frames.push({ narr: 'Children of index ' + i + ' are at ' + l + (r < h.length ? ' and ' + r : '') + '. The <b>smaller child</b> is ' + b1 + ' (index ' + b + '). ' + a1 + ' &gt; ' + b1 + ', so swap. We pick the smaller child so it can safely be the parent of its sibling.', parts: heapParts(h, two(i, 'ok', b, 'cur'), one(b, 'i'), one(b, 'win')).concat([{ type: 'array', label: 'extracted so far', values: out.slice() }]) });
              i = b;
            }
          }
          frames.push({ narr: 'Done. Extracted values come out in increasing order: <b>' + out.join(', ') + '</b>. Each extraction walked one root-to-leaf path → O(log N).', parts: heapParts(h, h.length ? one(0, 'sel') : {}).concat([{ type: 'array', label: 'extracted so far', values: out.slice(), hl: (function () { var o = {}; out.forEach(function (_, k) { o[k] = 'sel'; }); return o; })() }]) });
          return frames;
        }
      }
    ],
    problems: [
      {
        title: 'Implement a Min-Heap',
        level: 'Medium',
        tags: ['heap', 'design', 'array'],
        statement: `<p>Build a <code>MinHeap</code> class from scratch (no <code>PriorityQueue</code>) that supports:</p>
          <ul><li><code>insert(x)</code> — add a value.</li><li><code>getMin()</code> — return the smallest value, or <code>-1</code> if empty.</li><li><code>extractMin()</code> — remove and return the smallest value, or <code>-1</code> if empty.</li><li><code>size()</code> — number of values stored.</li></ul>`,
        constraints: `Up to 10<sup>5</sup> operations, -10<sup>9</sup> ≤ x ≤ 10<sup>9</sup>. Each operation must be O(log N) or better.`,
        example: `<p>Operations: insert 5, insert 3, insert 8, insert 1, getMin, extractMin, getMin</p>
          <p>Output: ${H.c('p', '1')}, ${H.c('p', '1')}, ${H.c('p', '3')}</p>
          ${H.arr([1, 3, 8, 5], { label: 'heap after 4 inserts', hl: { 0: 'p' } })}
          ${H.arr([3, 5, 8], { label: 'after extractMin', hl: { 0: 'p' } })}
          <p><b>Why:</b> after the inserts the smallest (1) is at the root → getMin = 1. extractMin removes it; 5 moves to the root and sinks below 3, so the new root is 3.</p>`,
        brute: {
          why: `<p>Keep values in an unsorted list. Insert is O(1), but <b>every</b> getMin/extractMin scans all N values → O(N) each. With 10<sup>5</sup> operations that is up to 10<sup>10</sup> steps. The wasted work: each scan forgets everything it learned about which values are small.</p>`,
          code: { lang: 'java', code: `
            class SlowMinHeap {
                private List<Integer> list = new ArrayList<>();

                void insert(int x) { list.add(x); }          // O(1)

                int getMin() {
                    if (list.isEmpty()) return -1;
                    int best = list.get(0);
                    for (int v : list) best = Math.min(best, v); // O(N) scan every time
                    return best;
                }

                int extractMin() {
                    if (list.isEmpty()) return -1;
                    int bi = 0;
                    for (int i = 1; i < list.size(); i++)
                        if (list.get(i) < list.get(bi)) bi = i;  // O(N) scan
                    return list.remove(bi);                      // O(N) shift
                }

                int size() { return list.size(); }
            }`, alt: [
          { lang: 'python', code: `class SlowMinHeap:
    def __init__(self):
        self.items = []

    def insert(self, x):
        self.items.append(x)                      # O(1)

    def getMin(self):
        if not self.items:
            return -1
        best = self.items[0]
        for v in self.items:
            best = min(best, v)                   # O(N) scan every time
        return best

    def extractMin(self):
        if not self.items:
            return -1
        bi = 0
        for i in range(1, len(self.items)):
            if self.items[i] < self.items[bi]:
                bi = i                            # O(N) scan
        return self.items.pop(bi)                 # O(N) shift

    def size(self):
        return len(self.items)` },
          { lang: 'js', code: `class SlowMinHeap {
  constructor() { this.list = []; }

  insert(x) { this.list.push(x); }               // O(1)

  getMin() {
    if (this.list.length === 0) return -1;
    let best = this.list[0];
    for (const v of this.list) best = Math.min(best, v); // O(N) scan every time
    return best;
  }

  extractMin() {
    if (this.list.length === 0) return -1;
    let bi = 0;
    for (let i = 1; i < this.list.length; i++)
      if (this.list[i] < this.list[bi]) bi = i;  // O(N) scan
    return this.list.splice(bi, 1)[0];           // O(N) shift
  }

  size() { return this.list.length; }
}` },
          { lang: 'cpp', code: `class SlowMinHeap {
    vector<int> list;
public:
    void insert(int x) { list.push_back(x); }        // O(1)

    int getMin() {
        if (list.empty()) return -1;
        int best = list[0];
        for (int v : list) best = min(best, v);      // O(N) scan every time
        return best;
    }

    int extractMin() {
        if (list.empty()) return -1;
        int bi = 0;
        for (int i = 1; i < (int)list.size(); i++)
            if (list[i] < list[bi]) bi = i;          // O(N) scan
        int v = list[bi];
        list.erase(list.begin() + bi);               // O(N) shift
        return v;
    }

    int size() { return list.size(); }
};` },
          { lang: 'csharp', code: `class SlowMinHeap
{
    private List<int> list = new List<int>();

    public void Insert(int x) { list.Add(x); }    // O(1)

    public int GetMin()
    {
        if (list.Count == 0) return -1;
        int best = list[0];
        foreach (int v in list) best = Math.Min(best, v); // O(N) scan every time
        return best;
    }

    public int ExtractMin()
    {
        if (list.Count == 0) return -1;
        int bi = 0;
        for (int i = 1; i < list.Count; i++)
            if (list[i] < list[bi]) bi = i;         // O(N) scan
        int v2 = list[bi];
        list.RemoveAt(bi);                          // O(N) shift
        return v2;
    }

    public int Size() { return list.Count; }
}` }
        ] }
        },
        mcq: {
          q: 'A heap is stored in an array. Where are the children of index 4, and where is its parent?',
          options: ['Children 9 and 10, parent 1', 'Children 8 and 9, parent 2', 'Children 5 and 6, parent 3', 'Children 9 and 10, parent 2'],
          answer: 0,
          explain: 'Children are 2·4+1 = 9 and 2·4+2 = 10. Parent is (4-1)/2 = 1 (integer division drops the .5).'
        },
        hints: [
          `<p>A complete tree fits in an array with no gaps. For index <code>i</code>: parent <code>(i-1)/2</code>, children <code>2i+1</code> and <code>2i+2</code>. The minimum always lives at index 0.</p>`,
          `<p>Use an <code>int[]</code> plus a <code>size</code> counter. Insert: write at <code>a[size]</code>, then <b>sift-up</b> (swap with parent while smaller). Extract: save <code>a[0]</code>, move <code>a[size-1]</code> to index 0, then <b>sift-down</b> (swap with the smaller child while bigger).</p>`,
          `<p>Traps: return -1 on empty heap; check <code>l &lt; size</code> and <code>r &lt; size</code> before reading children; grow the array when full. Recipe: insert → place at end, bubble up. extractMin → take root, last → root, size--, sink down choosing the smaller child.</p>`
        ],
        tests: { cls: 'MinHeap', sigs: { MinHeap: '', insert: 'int -> void', getMin: '-> int', extractMin: '-> int', size: '-> int' }, cases: [
          { ops: ['MinHeap', 'insert', 'insert', 'insert', 'insert', 'getMin', 'extractMin', 'getMin'], args: [[], [5], [3], [8], [1], [], [], []], out: [null, null, null, null, null, 1, 1, 3] },
          { ops: ['MinHeap', 'getMin', 'extractMin', 'size'], args: [[], [], [], []], out: [null, -1, -1, 0] },
          { ops: ['MinHeap', 'insert', 'extractMin', 'extractMin', 'getMin', 'size', 'insert', 'size', 'getMin'], args: [[], [7], [], [], [], [], [4], [], []], out: [null, null, 7, -1, -1, 0, null, 1, 4] },
          { ops: ['MinHeap', 'insert', 'insert', 'insert', 'insert', 'size', 'extractMin', 'extractMin', 'extractMin', 'extractMin', 'extractMin', 'size'], args: [[], [2], [2], [1], [1], [], [], [], [], [], [], []], out: [null, null, null, null, null, 4, 1, 1, 2, 2, -1, 0] },
          { ops: ['MinHeap', 'insert', 'insert', 'insert', 'getMin', 'extractMin', 'getMin', 'extractMin', 'getMin', 'extractMin', 'getMin'], args: [[], [1000000000], [-1000000000], [0], [], [], [], [], [], [], []], out: [null, null, null, null, -1000000000, -1000000000, 0, 0, 1000000000, 1000000000, -1] },
          { ops: ['MinHeap', 'insert', 'insert', 'insert', 'insert', 'insert', 'insert', 'insert', 'insert', 'insert', 'insert', 'insert', 'insert', 'insert', 'insert', 'insert', 'insert', 'insert', 'insert', 'insert', 'insert', 'size', 'extractMin', 'extractMin', 'extractMin', 'extractMin', 'extractMin', 'extractMin', 'extractMin', 'extractMin', 'extractMin', 'extractMin', 'extractMin', 'extractMin', 'extractMin', 'extractMin', 'extractMin', 'extractMin', 'extractMin', 'extractMin', 'extractMin', 'extractMin', 'extractMin', 'size'],
            args: [[], [20], [19], [18], [17], [16], [15], [14], [13], [12], [11], [10], [9], [8], [7], [6], [5], [4], [3], [2], [1], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []],
            out: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 20, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, -1, 0] },
          { ops: ['MinHeap', 'insert', 'insert', 'extractMin', 'insert', 'insert', 'extractMin', 'insert', 'getMin', 'extractMin', 'extractMin', 'extractMin', 'size'], args: [[], [9], [4], [], [6], [1], [], [8], [], [], [], [], []], out: [null, null, null, 4, null, null, 1, null, 6, 6, 8, 9, 0] }
        ] },
        solution: {
          approach: `<p>Array-backed complete binary tree. Sift-up after insert, sift-down after extract. Each walks a single path of height log₂N.</p>`,
          code: `
            class MinHeap {
                private int[] a = new int[16];  // heap stored level by level
                private int size = 0;           // how many values are in use

                public void insert(int x) {
                    if (size == a.length) a = Arrays.copyOf(a, size * 2); // grow
                    a[size] = x;            // new value goes to the next free spot
                    siftUp(size);           // fix order by bubbling it up
                    size++;
                }

                public int getMin() {
                    return size == 0 ? -1 : a[0];   // root is the minimum
                }

                public int extractMin() {
                    if (size == 0) return -1;
                    int min = a[0];         // answer
                    size--;
                    a[0] = a[size];         // move last value to the root
                    siftDown(0);            // let it sink to the right place
                    return min;
                }

                public int size() { return size; }

                private void siftUp(int i) {
                    while (i > 0) {
                        int p = (i - 1) / 2;            // parent index
                        if (a[i] >= a[p]) break;        // parent already smaller: done
                        swap(i, p);
                        i = p;                          // continue from the parent spot
                    }
                }

                private void siftDown(int i) {
                    while (true) {
                        int l = 2 * i + 1, r = 2 * i + 2, small = i;
                        if (l < size && a[l] < a[small]) small = l;  // smaller child?
                        if (r < size && a[r] < a[small]) small = r;
                        if (small == i) break;                       // no child is smaller
                        swap(i, small);
                        i = small;
                    }
                }

                private void swap(int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }

                public static void main(String[] args) {
                    MinHeap h = new MinHeap();
                    h.insert(5); h.insert(3); h.insert(8); h.insert(1);
                    System.out.println(h.getMin());     // 1
                    System.out.println(h.extractMin()); // 1
                    System.out.println(h.getMin());     // 3
                }
            }`,
          alt: [
            { lang: 'python', code: `class MinHeap:
    def __init__(self):
        self.a = []                       # heap stored level by level

    def insert(self, x):
        a = self.a
        a.append(x)                       # new value goes to the next free spot
        i = len(a) - 1
        while i > 0 and a[i] < a[(i - 1) // 2]:   # smaller than its parent: bubble up
            p = (i - 1) // 2
            a[i], a[p] = a[p], a[i]
            i = p

    def getMin(self):
        return self.a[0] if self.a else -1        # root is the minimum

    def extractMin(self):
        a = self.a
        if not a:
            return -1
        top = a[0]                        # answer
        last = a.pop()                    # remove the last slot
        if a:
            a[0] = last                   # last value moves to the root
            i, n = 0, len(a)
            while True:                   # sink it, always towards the smaller child
                l, r, small = 2 * i + 1, 2 * i + 2, i
                if l < n and a[l] < a[small]:
                    small = l
                if r < n and a[r] < a[small]:
                    small = r
                if small == i:
                    break
                a[i], a[small] = a[small], a[i]
                i = small
        return top

    def size(self):
        return len(self.a)
` },
            { lang: 'js', code: `class MinHeap {
  constructor() {
    this.a = [];                          // heap stored level by level
  }

  insert(x) {
    const a = this.a;
    a.push(x);                            // next free spot
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;             // parent index
      if (a[i] >= a[p]) break;            // parent already smaller: done
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }

  getMin() {
    return this.a.length ? this.a[0] : -1;
  }

  extractMin() {
    const a = this.a;
    if (!a.length) return -1;
    const top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;                        // last value moves to the root
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let small = i;
        if (l < a.length && a[l] < a[small]) small = l;
        if (r < a.length && a[r] < a[small]) small = r;
        if (small === i) break;           // no child is smaller
        [a[i], a[small]] = [a[small], a[i]];
        i = small;
      }
    }
    return top;
  }

  size() {
    return this.a.length;
  }
}
` },
            { lang: 'cpp', code: `class MinHeap {
    vector<int> a;                        // heap stored level by level

public:
    void insert(int x) {
        a.push_back(x);                   // next free spot
        size_t i = a.size() - 1;
        while (i > 0 && a[i] < a[(i - 1) / 2]) {   // smaller than parent: bubble up
            swap(a[i], a[(i - 1) / 2]);
            i = (i - 1) / 2;
        }
    }

    int getMin() const { return a.empty() ? -1 : a[0]; }

    int extractMin() {
        if (a.empty()) return -1;
        int top = a[0];
        a[0] = a.back();                  // last value moves to the root
        a.pop_back();
        size_t i = 0, n = a.size();
        while (true) {
            size_t l = 2 * i + 1, r = l + 1, small = i;
            if (l < n && a[l] < a[small]) small = l;
            if (r < n && a[r] < a[small]) small = r;
            if (small == i) break;        // no child is smaller
            swap(a[i], a[small]);
            i = small;
        }
        return top;
    }

    int size() const { return (int)a.size(); }
};
` },
            { lang: 'csharp', code: `using System;

public class MinHeap
{
    private int[] a = new int[16];  // heap stored level by level
    private int size = 0;           // how many values are in use

    public void Insert(int x)
    {
        if (size == a.Length) Array.Resize(ref a, size * 2); // grow
        a[size] = x;            // new value goes to the next free spot
        SiftUp(size);           // fix order by bubbling it up
        size++;
    }

    public int GetMin()
    {
        return size == 0 ? -1 : a[0];   // root is the minimum
    }

    public int ExtractMin()
    {
        if (size == 0) return -1;
        int min = a[0];         // answer
        size--;
        a[0] = a[size];         // move last value to the root
        SiftDown(0);            // let it sink to the right place
        return min;
    }

    public int Size() { return size; }

    private void SiftUp(int i)
    {
        while (i > 0)
        {
            int p = (i - 1) / 2;            // parent index
            if (a[i] >= a[p]) break;        // parent already smaller: done
            Swap(i, p);
            i = p;                          // continue from the parent spot
        }
    }

    private void SiftDown(int i)
    {
        while (true)
        {
            int l = 2 * i + 1, r = 2 * i + 2, small = i;
            if (l < size && a[l] < a[small]) small = l;  // smaller child?
            if (r < size && a[r] < a[small]) small = r;
            if (small == i) break;                       // no child is smaller
            Swap(i, small);
            i = small;
        }
    }

    private void Swap(int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }
}` }
          ],
          dry: {
            head: ['operation', 'array before fix', 'sift steps', 'array after', 'returns'],
            rows: [
              ['insert 5', '[5]', 'root, nothing to do', '[5]', '-'],
              ['insert 3', '[5, <span class="c-y">3</span>]', '3 &lt; parent 5 → swap', '[3, 5]', '-'],
              ['insert 8', '[3, 5, <span class="c-y">8</span>]', '8 ≥ parent 3 → stop', '[3, 5, 8]', '-'],
              ['insert 1', '[3, 5, 8, <span class="c-y">1</span>]', '1 &lt; 5 swap (i=3→1); 1 &lt; 3 swap (i=1→0)', '[1, 3, 8, 5]', '-'],
              ['getMin', '[1, 3, 8, 5]', 'read a[0]', '[1, 3, 8, 5]', '<span class="c-p">1</span>'],
              ['extractMin', '[<span class="c-y">5</span>, 3, 8]', 'children 3, 8 → smaller 3 &lt; 5 → swap; 5 is a leaf → stop', '[3, 5, 8]', '<span class="c-p">1</span>'],
              ['getMin', '[3, 5, 8]', 'read a[0]', '[3, 5, 8]', '<span class="c-p">3</span>']
            ]
          },
          complexity: `<p><b>Time:</b> insert and extractMin walk at most one root-to-leaf path. A complete tree of N nodes is about log₂N tall → <b>O(log N)</b>. getMin just reads index 0 → <b>O(1)</b>. <b>Space:</b> the array holds N values → <b>O(N)</b>.</p>`
        }
      }
    ]
  });

  // ================= TOPIC 2: build-heap + heap sort =================
  topics.push({
    title: 'Heapify / Build-Heap in O(N) and Heap Sort',
    analogy: `<p>Imagine a company where people were seated randomly in an org chart. To fix it, you <b>do not</b> start at the CEO. You start with the <b>smallest teams at the bottom</b>: in each tiny team, the strongest person becomes the team lead. Then you move one level up and fix those bigger teams, and so on until the CEO's seat. Each fix only has to look <b>downwards</b>, and most people sit near the bottom where there is almost nothing below them — so the whole job is surprisingly quick.</p>
      <p><b>Heap sort</b> is like a talent show: the winner (top of the max-heap) walks to the end of the stage, the rest re-organise, the next winner walks off, and so on.</p>`,
    explain: `<p><b>Build-heap (heapify)</b> turns any array into a heap <b>in place</b>.</p>
      <p>Leaves (the second half of the array, indices <code>n/2 … n-1</code>) are already tiny heaps of size 1. So we only call <b>sift-down</b> on indices <code>n/2 - 1</code> down to <code>0</code> — <b>bottom-up</b>.</p>
      ${H.arr([4, 10, 3, 5, 1], { label: 'start', hl: { 0: 'y', 1: 'y', 2: 'm', 3: 'm', 4: 'm' } })}
      <p>n = 5 → start at index 5/2 - 1 = ${H.c('y', '1')}, then ${H.c('y', '0')}. Indices 2, 3, 4 are leaves (nothing below them), so they are skipped.</p>
      <h4>Why is it O(N) and not O(N log N)?</h4>
      <p>Sift-down from a node costs at most its <b>height</b> (distance to the bottom). Most nodes are near the bottom:</p>
      ${H.table(['height h', 'how many nodes (N = 15)', 'max swaps each', 'total'], [
        ['0 (leaves)', '8', '0', '0'],
        ['1', '4', '1', '4'],
        ['2', '2', '2', '4'],
        ['3 (root)', '1', '3', '3'],
        ['', '', 'sum', H.c('g', '11 ≤ N')]
      ])}
      <p>Half the nodes do 0 work, a quarter do 1, an eighth do 2… The sum N/4·1 + N/8·2 + N/16·3 + … never exceeds N. So build-heap is <b>O(N)</b>, while inserting one by one is O(N log N).</p>
      <h4>Heap sort (ascending)</h4>
      <ol>
        <li>Build a <b>max-heap</b> from the array: O(N).</li>
        <li>Swap the root (largest) with the last element of the heap part. That largest value is now in its final sorted position.</li>
        <li>Shrink the heap by one and sift-down the new root.</li>
        <li>Repeat until the heap has one element.</li>
      </ol>
      <p>Heap sort is <b>O(N log N)</b> always (no bad worst case like quicksort) and uses <b>O(1)</b> extra memory. It is <b>not stable</b> (equal values can change order).</p>`,
    clues: [
      '"Convert this array into a heap" / "heapify" → bottom-up sift-down from <code>n/2 - 1</code> to <code>0</code>, O(N).',
      '"Sort in-place, O(1) extra space, guaranteed O(N log N) worst case" → heap sort.',
      'You get <b>all N items up front</b> (not one at a time) → build the heap in one go (O(N)) instead of N inserts.',
      '"Is this array a valid heap?" → check every <code>i</code>: <code>a[i] ≤ a[2i+1]</code> and <code>a[i] ≤ a[2i+2]</code>.',
      'Library bulk builds are O(N) too: Java <code>new PriorityQueue&lt;&gt;(collection)</code>, Python <code>heapq.heapify(list)</code>, C++ <code>make_heap</code> or <code>priority_queue(first, last)</code>.'
    ],
    code: [{ lang: 'java', code: `
      class HeapSort {
          // Sorts ascending using a max-heap built in place.
          static void heapSort(int[] a) {
              int n = a.length;
              // 1) Build max-heap bottom-up: last non-leaf is n/2 - 1
              for (int i = n / 2 - 1; i >= 0; i--) {
                  siftDown(a, i, n);
              }
              // 2) Move the max to the end, shrink the heap, repair the root
              for (int end = n - 1; end > 0; end--) {
                  int t = a[0]; a[0] = a[end]; a[end] = t;  // largest goes to its final spot
                  siftDown(a, 0, end);                      // heap is now a[0..end-1]
              }
          }

          // Sink a[i] down inside a[0..size-1] (max-heap version).
          static void siftDown(int[] a, int i, int size) {
              while (true) {
                  int l = 2 * i + 1, r = 2 * i + 2, big = i;
                  if (l < size && a[l] > a[big]) big = l;
                  if (r < size && a[r] > a[big]) big = r;
                  if (big == i) return;                     // already bigger than children
                  int t = a[i]; a[i] = a[big]; a[big] = t;
                  i = big;
              }
          }

          public static void main(String[] args) {
              int[] a = {4, 10, 3, 5, 1};
              heapSort(a);
              System.out.println(Arrays.toString(a));   // [1, 3, 4, 5, 10]
          }
      }`, alt: [
      { lang: 'python', run: true, code: `def sift_down(a, i, size):
    """Sink a[i] down inside a[0..size-1] (max-heap version)."""
    while True:
        l, r, big = 2 * i + 1, 2 * i + 2, i
        if l < size and a[l] > a[big]:
            big = l
        if r < size and a[r] > a[big]:
            big = r
        if big == i:
            return                        # already bigger than its children
        a[i], a[big] = a[big], a[i]
        i = big


def heap_sort(a):
    n = len(a)
    for i in range(n // 2 - 1, -1, -1):   # 1) build max-heap bottom-up
        sift_down(a, i, n)
    for end in range(n - 1, 0, -1):       # 2) move the max to the end, shrink, repair
        a[0], a[end] = a[end], a[0]
        sift_down(a, 0, end)


a = [4, 10, 3, 5, 1]
heap_sort(a)
print(a)                                  # [1, 3, 4, 5, 10]
# Library shortcut: heapq.heapify(list) is the same O(N) bottom-up build (min-heap).
` },
      { lang: 'js', run: true, code: `// Sink a[i] down inside a[0..size-1] (max-heap version).
function siftDown(a, i, size) {
  for (;;) {
    const l = 2 * i + 1, r = l + 1;
    let big = i;
    if (l < size && a[l] > a[big]) big = l;
    if (r < size && a[r] > a[big]) big = r;
    if (big === i) return;                // already bigger than its children
    [a[i], a[big]] = [a[big], a[i]];
    i = big;
  }
}

function heapSort(a) {
  const n = a.length;
  for (let i = (n >> 1) - 1; i >= 0; i--) siftDown(a, i, n);  // 1) build max-heap bottom-up
  for (let end = n - 1; end > 0; end--) {                     // 2) max to the end, repair root
    [a[0], a[end]] = [a[end], a[0]];
    siftDown(a, 0, end);
  }
}

const a = [4, 10, 3, 5, 1];
heapSort(a);
console.log(a);                           // [ 1, 3, 4, 5, 10 ]
` },
      { lang: 'cpp', code: `// Sink a[i] down inside a[0..size-1] (max-heap version).
void siftDown(vector<int>& a, int i, int size) {
    while (true) {
        int l = 2 * i + 1, r = 2 * i + 2, big = i;
        if (l < size && a[l] > a[big]) big = l;
        if (r < size && a[r] > a[big]) big = r;
        if (big == i) return;             // already bigger than its children
        swap(a[i], a[big]);
        i = big;
    }
}

void heapSort(vector<int>& a) {
    int n = a.size();
    for (int i = n / 2 - 1; i >= 0; i--) siftDown(a, i, n);   // 1) build max-heap bottom-up
    for (int end = n - 1; end > 0; end--) {                   // 2) max to the end, repair root
        swap(a[0], a[end]);
        siftDown(a, 0, end);
    }
}

int main() {
    vector<int> a = {4, 10, 3, 5, 1};
    heapSort(a);
    for (int x : a) cout << x << " ";     // 1 3 4 5 10
    cout << endl;
    // The STL has the same building blocks: make_heap (O(N) build) + sort_heap.
    vector<int> b = {4, 10, 3, 5, 1};
    make_heap(b.begin(), b.end());
    sort_heap(b.begin(), b.end());
}
` },
      { lang: 'csharp', run: true, code: `using System;

class HeapSort
{
    // Sorts ascending using a max-heap built in place.
    static void Sort(int[] a)
    {
        int n = a.Length;
        // 1) Build max-heap bottom-up: last non-leaf is n/2 - 1
        for (int i = n / 2 - 1; i >= 0; i--)
        {
            SiftDown(a, i, n);
        }
        // 2) Move the max to the end, shrink the heap, repair the root
        for (int end = n - 1; end > 0; end--)
        {
            int t = a[0]; a[0] = a[end]; a[end] = t;  // largest goes to its final spot
            SiftDown(a, 0, end);                      // heap is now a[0..end-1]
        }
    }

    // Sink a[i] down inside a[0..size-1] (max-heap version).
    static void SiftDown(int[] a, int i, int size)
    {
        while (true)
        {
            int l = 2 * i + 1, r = 2 * i + 2, big = i;
            if (l < size && a[l] > a[big]) big = l;
            if (r < size && a[r] > a[big]) big = r;
            if (big == i) return;                     // already bigger than children
            int t = a[i]; a[i] = a[big]; a[big] = t;
            i = big;
        }
    }

    static void Main()
    {
        int[] a = { 4, 10, 3, 5, 1 };
        Sort(a);
        Console.WriteLine("[" + string.Join(", ", a) + "]");   // [1, 3, 4, 5, 10]
    }
}` }
    ] }],
    codeTitle: ['Build-heap (O(N)) + Heap Sort (O(N log N), in place)'],
    examples: [
      {
        title: 'Build a max-heap from [4, 10, 3, 5, 1]',
        html: `${H.table(['sift-down index', 'array before', 'what happens', 'array after'], [
            ['1 (value 10)', '[4, 10, 3, 5, 1]', 'children 5, 1 → 10 is already bigger → stays', '[4, 10, 3, 5, 1]'],
            ['0 (value 4)', '[4, 10, 3, 5, 1]', 'children 10, 3 → bigger 10 → swap', '[10, 4, 3, 5, 1]'],
            ['1 (value 4)', '[10, 4, 3, 5, 1]', 'children 5, 1 → bigger 5 → swap', '[10, 5, 3, 4, 1]']
          ])}
          <p>Result ${H.arr([10, 5, 3, 4, 1], { label: 'max-heap', hl: { 0: 'p' } })} Only 2 calls (indices 1 and 0) and 2 swaps for 5 items.</p>`
      },
      {
        title: 'Heap sort the max-heap [10, 5, 3, 4, 1]',
        html: `${H.table(['round', 'swap root ↔ end', 'sift-down result (heap | sorted)'], [
            ['1', '10 ↔ 1', '[5, 4, 3, 1 | ' + H.c('g', '10') + ']'],
            ['2', '5 ↔ 1', '[4, 1, 3 | ' + H.c('g', '5, 10') + ']'],
            ['3', '4 ↔ 3', '[3, 1 | ' + H.c('g', '4, 5, 10') + ']'],
            ['4', '3 ↔ 1', '[1 | ' + H.c('g', '3, 4, 5, 10') + ']']
          ])}
          <p>The sorted part grows from the right. Using a <b>max</b>-heap gives ascending order; a min-heap would give descending order in place.</p>`
      },
      {
        title: 'Why N inserts is slower than one heapify',
        html: `<p>Inserting the already-sorted ascending array [1, 2, 3, …, N] into a <b>max</b>-heap one by one: every new value is the largest so far, so it bubbles all the way to the root → about log₂N swaps each → <b>O(N log N)</b> total.</p>
          <p>Bottom-up heapify of the same array: half the nodes are leaves (0 work), a quarter sink at most 1 level, an eighth at most 2… total ≤ N swaps → <b>O(N)</b>. For N = 10<sup>6</sup>: ~20 million vs ~1 million swaps.</p>`
      },
      {
        title: 'Heap sort is not stable',
        html: `<p>Sort pairs by number only: ${H.c('b', '(2,a)')}, ${H.c('y', '(2,b)')}, (1,c). Build max-heap: (2,a) is the root. Swap root with the end → (2,a) lands at the <b>last</b> position, so the final order is (1,c), (2,b), (2,a): the two 2s switched places. Merge sort would keep a before b. If stability matters (sorting rows by one column after another), heap sort is the wrong tool.</p>`
      }
    ],
    deepDive: `<p><b>The O(N) proof in one line.</b> A heap of N nodes has at most ⌈N / 2<sup>h+1</sup>⌉ nodes of height h, and each costs O(h) to sift down. Total = ∑ N·h / 2<sup>h+1</sup> = N/2 · ∑ h/2<sup>h</sup> = N/2 · 2 = <b>N</b>. The series ∑ h/2<sup>h</sup> converges to 2, which is why the total is linear. Sifting <i>up</i> from the top instead would be O(N log N), because then the many leaves do the long trips.</p>
      <p><b>Heap sort facts for interviews:</b> O(N log N) worst case, O(1) extra space, not stable, not adaptive (already-sorted input is no faster). In practice it is 2–3× slower than quicksort because the sift-down jumps far in memory (poor cache locality). That is why <b>introsort</b> (C++ <code>std::sort</code>) runs quicksort and falls back to heap sort only when recursion gets too deep — getting quicksort's speed with heap sort's worst-case guarantee.</p>
      <p><b>Java details.</b> <code>Arrays.sort(int[])</code> uses dual-pivot quicksort; <code>Arrays.sort(Object[])</code> uses TimSort (stable). <code>new PriorityQueue&lt;&gt;(collection)</code> calls an internal <code>heapify()</code> which is the same bottom-up O(N) build; <code>addAll</code> instead inserts one by one (O(N log N)).</p>
      <p><b>Partial sort.</b> If you only need the smallest K in order, heapify (O(N)) then extract K times → O(N + K log N). That beats a full sort when K is small, and it is how “give me the first page of results” can be served without sorting everything.</p>
      <p><b>Edge cases:</b> arrays of size 0 or 1 (loops simply do not run), all-equal values (no swaps, still correct), negative numbers (comparisons only, no arithmetic, so no overflow).</p>`,
    aiEra: `<p><b>What AI changes:</b> you will almost never write heap sort for production — library sorts are faster and battle-tested, and an AI will happily write one if asked. The idea that survives is <b>bottom-up construction is linear</b>: it shows up when you bulk-load a priority queue, build a heap from a database result, or explain why <code>new PriorityQueue&lt;&gt;(list)</code> beats a loop of <code>offer</code>.</p>
      <p><b>Use AI as a partner:</b> ask it to <code>prove build-heap is O(N) step by step with N = 15</code> and verify every number in its table against your own (the counts per height are 8, 4, 2, 1). Ask it for a property-based test that heapifies random arrays and checks the heap rule at every index.</p>
      <p><b>Where AI goes wrong:</b> starting the build loop at <code>n/2</code> instead of <code>n/2 - 1</code> (harmless but sloppy), or at <code>0</code> going upward (wrong order — children must be heaps first), sifting with the full length <code>n</code> during the sort phase instead of the shrinking <code>end</code>, and confidently claiming heap sort is stable.</p>
      <p><b>What you must still own:</b> the counting argument for O(N), the stability/cache trade-offs, and choosing heap sort only when O(1) memory with a hard worst-case bound is truly required.</p>`,
    viz: {
      title: 'Build max-heap bottom-up, then heap sort',
      input: '4 10 3 5 1 8 9 2',
      inputLabel: 'array (up to 15 numbers)',
      gen: function (input) {
        var a = parseNums(input, 3, 15, -99, 999, 'the array');
        var n = a.length, frames = [];
        function sortedHl(size, extra) {
          var o = {};
          for (var k = size; k < n; k++) o[k] = 'done';
          for (var key in extra) o[key] = extra[key];
          return o;
        }
        function parts(size, hl, ptr, note) {
          var treeHl = {};
          for (var key in hl) if (+key < size) treeHl[key] = hl[key];
          return [
            { type: 'tree', label: 'heap part a[0..' + (size - 1) + '] as a tree', arr: a.slice(0, size), hl: treeHl },
            { type: 'array', label: 'whole array (faded = already sorted)', values: a.slice(), hl: sortedHl(size, hl), ptr: ptr || {} },
            { type: 'vars', vals: note }
          ];
        }
        function sink(i, size, phase) {
          for (;;) {
            var l = 2 * i + 1, r = 2 * i + 2, b = i;
            if (l < size && a[l] > a[b]) b = l;
            if (r < size && a[r] > a[b]) b = r;
            if (b === i) {
              frames.push({ narr: a[i] + ' at index ' + i + ' is ≥ its children (or has none) → it stays. This little sub-tree is now a valid max-heap.', parts: parts(size, one(i, 'ok'), one(i, 'i'), { phase: phase, i: i, 'heap size': size }) });
              return;
            }
            var big = a[b], small = a[i];
            swap(a, i, b);
            frames.push({ narr: 'Bigger child of index ' + i + ' is ' + big + ' (index ' + b + '). ' + small + ' &lt; ' + big + ' → swap so the bigger one is on top. Keep sinking ' + small + '.', parts: parts(size, two(i, 'ok', b, 'cur'), one(b, 'i'), { phase: phase, i: b, 'heap size': size }) });
            i = b;
          }
        }
        frames.push({ narr: 'Random array. Read it as a tree level by level. Leaves (indices ' + Math.floor(n / 2) + '..' + (n - 1) + ') are already tiny heaps, so we start sift-down at the last non-leaf: index n/2 - 1 = <b>' + (Math.floor(n / 2) - 1) + '</b>, then move left to index 0.', parts: parts(n, (function () { var o = {}; for (var k = Math.floor(n / 2); k < n; k++) o[k] = 'win'; return o; })(), {}, { phase: 'build', n: n }) });
        for (var i = Math.floor(n / 2) - 1; i >= 0; i--) {
          frames.push({ narr: 'Build step: sift-down index <b>' + i + '</b> (value ' + a[i] + '). Everything below it is already a heap, so we only need to sink this one value.', parts: parts(n, one(i, 'cur'), one(i, 'i'), { phase: 'build', i: i }) });
          sink(i, n, 'build');
        }
        frames.push({ narr: 'Build-heap finished in O(N). The largest value <b>' + a[0] + '</b> is at the root. Now heap sort begins.', parts: parts(n, one(0, 'sel'), one(0, 'max'), { phase: 'sort', max: a[0] }) });
        for (var end = n - 1; end > 0; end--) {
          var mx = a[0];
          swap(a, 0, end);
          frames.push({ narr: 'Swap the max <b>' + mx + '</b> (root) with the last heap slot (index ' + end + '). ' + mx + ' is now in its <b>final sorted place</b>. The heap shrinks to size ' + end + '.', parts: parts(end, two(0, 'cur', end, 'sel'), two(0, 'root', end, 'end'), { phase: 'sort', placed: mx, 'heap size': end }) });
          sink(0, end, 'sort');
        }
        var all = {}; for (var k = 0; k < n; k++) all[k] = 'sel';
        frames.push({ narr: 'Sorted ascending: <b>' + a.join(', ') + '</b>. O(N) build + (N-1) extractions × O(log N) = O(N log N), with zero extra arrays.', parts: [{ type: 'array', label: 'sorted array', values: a.slice(), hl: all }, { type: 'vars', vals: { phase: 'done' } }] });
        return frames;
      }
    }
  });

  // ================= TOPIC 3: Java PriorityQueue =================
  topics.push({
    title: 'Java PriorityQueue: min by default, max with reverseOrder / comparator',
    analogy: `<p>Back to the hospital: Java already gives you a ready-made nurse called <code>PriorityQueue</code>. You hand her patients (<code>offer</code>), ask who is next (<code>peek</code>), or send the next one in (<code>poll</code>). By default she calls the <b>smallest</b> number first (like “ticket #1 first”). If you want the <b>biggest</b> first (most serious injury score), you just give her a different rule card — a <b>comparator</b>.</p>`,
    explain: `<p>Every mainstream language ships this structure: Java <code>PriorityQueue</code> (min-heap), Python <code>heapq</code> (min-heap functions over a plain list), C++ <code>priority_queue</code> (a <b>max</b>-heap by default). JavaScript has none built in, so the JS code in this module carries a small <code>MinHeap</code> class with a comparator. This topic uses Java's names; the code tabs show the same ideas in each language.</p>
      <p><code>PriorityQueue</code> is a binary heap stored in an array — exactly what you built above.</p>
      ${H.table(['method', 'what it does', 'cost'], [
        ['<code>offer(x)</code> / <code>add(x)</code>', 'insert (sift-up)', 'O(log N)'],
        ['<code>poll()</code>', 'remove and return the top, <code>null</code> if empty', 'O(log N)'],
        ['<code>peek()</code>', 'look at the top without removing, <code>null</code> if empty', 'O(1)'],
        ['<code>size()</code>, <code>isEmpty()</code>', 'counts', 'O(1)'],
        ['<code>remove(x)</code>, <code>contains(x)</code>', 'search the whole array', H.c('r', 'O(N) — avoid in loops')],
        ['<code>new PriorityQueue&lt;&gt;(list)</code>', 'build-heap from a collection', 'O(N)']
      ])}
      <h4>Min-heap vs max-heap</h4>
      <ul>
        <li><code>new PriorityQueue&lt;Integer&gt;()</code> → ${H.c('g', 'min-heap')} (smallest on top).</li>
        <li><code>new PriorityQueue&lt;Integer&gt;(Collections.reverseOrder())</code> → ${H.c('p', 'max-heap')}.</li>
        <li><code>new PriorityQueue&lt;Integer&gt;((a, b) -&gt; Integer.compare(b, a))</code> → also a max-heap.</li>
      </ul>
      <p><b>The comparator rule in one sentence:</b> <code>compare(a, b)</code> returns a <b>negative</b> number when <code>a</code> should come out <b>first</b>.</p>
      <h4>Three classic traps</h4>
      <ol>
        <li>${H.c('r', '(a, b) -&gt; b - a')} can <b>overflow</b> for huge values (e.g. b = 2·10<sup>9</sup>, a = -2·10<sup>9</sup>). Use <code>Integer.compare(b, a)</code>.</li>
        <li>Printing or iterating a PriorityQueue does <b>not</b> show sorted order — it shows the heap array. Only repeated <code>poll()</code> gives sorted order.</li>
        <li>For pairs, store <code>int[]</code> or a small class and compare a field: <code>(x, y) -&gt; x[0] - y[0]</code> or <code>Comparator.comparingInt(x -&gt; x[0])</code>.</li>
      </ol>
      ${H.table(['operation', 'min-heap state (array)', 'peek'], [
        ['offer 5', '[5]', '5'],
        ['offer 2', '[2, 5]', H.c('g', '2')],
        ['offer 8', '[2, 5, 8]', '2'],
        ['poll → 2', '[5, 8]', '5']
      ])}`,
    clues: [
      '"K-th largest / smallest", "top K", "K closest" → <code>PriorityQueue</code> of size K.',
      '"Always process the cheapest / earliest / shortest next" (Dijkstra, scheduling, merging) → PriorityQueue with a comparator.',
      'Need biggest first → <code>Collections.reverseOrder()</code> or <code>(a, b) -&gt; Integer.compare(b, a)</code>.',
      'Items are pairs / objects (point, frequency, list node) → custom comparator on the field that decides priority.',
      'Values near ±2·10<sup>9</sup> → never use <code>b - a</code> in a comparator (overflow) → use <code>Integer.compare</code> / <code>Long.compare</code>.'
    ],
    code: [{ lang: 'java', code: `
      // 1) Min-heap (default): smallest comes out first
      PriorityQueue<Integer> minHeap = new PriorityQueue<>();
      minHeap.offer(5); minHeap.offer(2); minHeap.offer(8);
      System.out.println(minHeap.peek());   // 2

      // 2) Max-heap: two equivalent ways
      PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());
      PriorityQueue<Integer> maxHeap2 = new PriorityQueue<>((a, b) -> Integer.compare(b, a));
      maxHeap.offer(5); maxHeap.offer(2); maxHeap.offer(8);
      maxHeap2.addAll(maxHeap);
      System.out.println(maxHeap.poll());   // 8
      System.out.println(maxHeap2.peek());  // 8

      // 3) Pairs: {value, index}, ordered by value, ties by index
      PriorityQueue<int[]> pq = new PriorityQueue<>(
          (x, y) -> x[0] != y[0] ? Integer.compare(x[0], y[0]) : Integer.compare(x[1], y[1]));
      pq.offer(new int[]{7, 0});
      pq.offer(new int[]{3, 1});
      pq.offer(new int[]{3, 0});
      int[] top = pq.poll();                 // {3, 0}
      System.out.println(top[0] + " at " + top[1]);

      // 4) Build from a whole list in O(N), then drain in sorted order
      PriorityQueue<Integer> built = new PriorityQueue<>(Arrays.asList(9, 4, 7, 1));
      StringBuilder sb = new StringBuilder();
      while (!built.isEmpty()) sb.append(built.poll()).append(' ');
      System.out.println(sb);               // 1 4 7 9`, alt: [
      { lang: 'python', run: true, code: `import heapq

# 1) Min-heap (heapq's only kind): smallest comes out first
min_heap = []
for x in (5, 2, 8):
    heapq.heappush(min_heap, x)
print(min_heap[0])                        # 2  (peek = index 0)

# 2) Max-heap: push negatives, negate again when reading
max_heap = []
for x in (5, 2, 8):
    heapq.heappush(max_heap, -x)
print(-heapq.heappop(max_heap))           # 8

# 3) Pairs: tuples compare field by field, so (value, index) gives ties by index
pq = []
heapq.heappush(pq, (7, 0))
heapq.heappush(pq, (3, 1))
heapq.heappush(pq, (3, 0))
value, index = heapq.heappop(pq)          # (3, 0)
print(value, "at", index)

# 4) Build from a whole list in O(N), then drain in sorted order
built = [9, 4, 7, 1]
heapq.heapify(built)
print(*[heapq.heappop(built) for _ in range(len(built))])   # 1 4 7 9
` },
      { lang: 'js', run: true, code: `// JavaScript has no built-in heap, so lessons and solutions carry this small class.
class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }  // less(a, b): a comes out first
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

// 1) Min-heap (default comparator): smallest comes out first
const minHeap = new MinHeap();
[5, 2, 8].forEach((x) => minHeap.push(x));
console.log(minHeap.peek());              // 2

// 2) Max-heap: flip the comparator
const maxHeap = new MinHeap((a, b) => a > b);
[5, 2, 8].forEach((x) => maxHeap.push(x));
console.log(maxHeap.pop());               // 8

// 3) Pairs [value, index], ordered by value, ties by index
const pq = new MinHeap((x, y) => (x[0] !== y[0] ? x[0] < y[0] : x[1] < y[1]));
pq.push([7, 0]); pq.push([3, 1]); pq.push([3, 0]);
const top = pq.pop();                     // [3, 0]
console.log(top[0] + ' at ' + top[1]);

// 4) Drain in sorted order
const built = new MinHeap();
[9, 4, 7, 1].forEach((x) => built.push(x));
const out = [];
while (built.size()) out.push(built.pop());
console.log(out.join(' '));               // 1 4 7 9
` },
      { lang: 'cpp', code: `int main() {
    // 1) Min-heap: C++ priority_queue is a MAX-heap by default, so pass greater<int>
    priority_queue<int, vector<int>, greater<int>> minHeap;
    minHeap.push(5); minHeap.push(2); minHeap.push(8);
    cout << minHeap.top() << endl;        // 2

    // 2) Max-heap: the default
    priority_queue<int> maxHeap;
    maxHeap.push(5); maxHeap.push(2); maxHeap.push(8);
    cout << maxHeap.top() << endl;        // 8
    maxHeap.pop();                        // pop() returns nothing; read top() first

    // 3) Pairs {value, index}: pairs compare field by field; greater<> makes the smallest come first
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> pq;
    pq.push({7, 0}); pq.push({3, 1}); pq.push({3, 0});
    auto [value, index] = pq.top();       // {3, 0}
    cout << value << " at " << index << endl;

    // 4) Build from a whole range in O(N), then drain in sorted order
    vector<int> v = {9, 4, 7, 1};
    priority_queue<int, vector<int>, greater<int>> built(v.begin(), v.end());
    while (!built.empty()) { cout << built.top() << ' '; built.pop(); }   // 1 4 7 9
    cout << endl;
}
` },
      { lang: 'csharp', run: true, code: `using System;
using System.Collections.Generic;
using System.Text;

class HeapUsage
{
    static void Main()
    {
        // 1) Min-heap: the comparison says what comes out first
        var minHeap = new MinHeap<int>((a, b) => a.CompareTo(b));
        minHeap.Push(5); minHeap.Push(2); minHeap.Push(8);
        Console.WriteLine(minHeap.Peek());   // 2

        // 2) Max-heap: flip the comparison
        var maxHeap = new MinHeap<int>((a, b) => b.CompareTo(a));
        maxHeap.Push(5); maxHeap.Push(2); maxHeap.Push(8);
        Console.WriteLine(maxHeap.Pop());    // 8

        // 3) Pairs: {value, index}, ordered by value, ties by index
        var pq = new MinHeap<int[]>((x, y) => x[0] != y[0] ? x[0].CompareTo(y[0]) : x[1].CompareTo(y[1]));
        pq.Push(new[] { 7, 0 });
        pq.Push(new[] { 3, 1 });
        pq.Push(new[] { 3, 0 });
        int[] top = pq.Pop();                // {3, 0}
        Console.WriteLine(top[0] + " at " + top[1]);

        // 4) Build from a whole list, then drain in sorted order
        var built = new MinHeap<int>((a, b) => a.CompareTo(b));
        foreach (int x in new[] { 9, 4, 7, 1 }) built.Push(x);
        var sb = new StringBuilder();
        while (built.Count > 0) sb.Append(built.Pop()).Append(' ');
        Console.WriteLine(sb);               // 1 4 7 9
    }
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }
    ] },
      { lang: 'java', code: `
      // Custom objects: a patient with a severity score; most severe first.
      class Patient {
          String name; int severity;
          Patient(String n, int s) { name = n; severity = s; }
      }

      class ER {
          public static void main(String[] args) {
              PriorityQueue<Patient> er = new PriorityQueue<>(
                  Comparator.comparingInt((Patient p) -> p.severity).reversed());
              er.offer(new Patient("cut finger", 2));
              er.offer(new Patient("heart attack", 10));
              er.offer(new Patient("broken arm", 6));
              while (!er.isEmpty()) {
                  System.out.println(er.poll().name);  // heart attack, broken arm, cut finger
              }
          }
      }`, alt: [
      { lang: 'python', run: true, code: `import heapq
from dataclasses import dataclass, field


@dataclass(order=True)
class Patient:
    sort_key: int = field(init=False, repr=False)   # heapq compares this field only
    name: str = field(compare=False)
    severity: int = field(compare=False)

    def __post_init__(self):
        self.sort_key = -self.severity    # negate: most severe comes out first


er = []
heapq.heappush(er, Patient("cut finger", 2))
heapq.heappush(er, Patient("heart attack", 10))
heapq.heappush(er, Patient("broken arm", 6))
while er:
    print(heapq.heappop(er).name)         # heart attack, broken arm, cut finger
` },
      { lang: 'js', run: true, code: `class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }  // less(a, b): a comes out first
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

// Custom objects: most severe patient first.
const er = new MinHeap((p, q) => p.severity > q.severity);
er.push({ name: 'cut finger', severity: 2 });
er.push({ name: 'heart attack', severity: 10 });
er.push({ name: 'broken arm', severity: 6 });
while (er.size()) console.log(er.pop().name);   // heart attack, broken arm, cut finger
` },
      { lang: 'cpp', code: `// Custom objects: a patient with a severity score; most severe first.
struct Patient {
    string name;
    int severity;
};

int main() {
    // priority_queue puts on top the element that is NOT "less" than the others,
    // so "a < b when a.severity < b.severity" keeps the most severe on top.
    auto lessSevere = [](const Patient& a, const Patient& b) { return a.severity < b.severity; };
    priority_queue<Patient, vector<Patient>, decltype(lessSevere)> er(lessSevere);
    er.push({"cut finger", 2});
    er.push({"heart attack", 10});
    er.push({"broken arm", 6});
    while (!er.empty()) {
        cout << er.top().name << endl;    // heart attack, broken arm, cut finger
        er.pop();
    }
}
` },
      { lang: 'csharp', run: true, code: `using System;
using System.Collections.Generic;

// Custom objects: a patient with a severity score; most severe first.
class Patient
{
    public string Name; public int Severity;
    public Patient(string n, int s) { Name = n; Severity = s; }
}

class ER
{
    static void Main()
    {
        var er = new MinHeap<Patient>((p, q) => q.Severity.CompareTo(p.Severity));   // reversed: max first
        er.Push(new Patient("cut finger", 2));
        er.Push(new Patient("heart attack", 10));
        er.Push(new Patient("broken arm", 6));
        while (er.Count > 0)
        {
            Console.WriteLine(er.Pop().Name);   // heart attack, broken arm, cut finger
        }
    }
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }
    ] }],
    codeTitle: ['PriorityQueue cheat-sheet', 'Comparator on your own class (emergency room)'],
    viz: {
      title: 'PriorityQueue offer / poll with a min or max comparator',
      input: 'max | 5 2 8 p 1 9 p p 3',
      inputLabel: 'min or max | numbers = offer, p = poll',
      gen: function (input) {
        var s = String(input === undefined ? '' : input).split('|');
        if (s.length !== 2) throw new Error('Format: min or max | operations, e.g. max | 5 2 8 p 1 9 p');
        var mode = s[0].trim().toLowerCase();
        if (mode !== 'min' && mode !== 'max') throw new Error('First part must be the word min or max');
        var ops = s[1].trim().split(/[\s,]+/).filter(function (x) { return x; });
        if (!ops.length) throw new Error('Give some operations: numbers to offer, p to poll');
        if (ops.length > 18) throw new Error('At most 18 operations so the picture fits');
        ops.forEach(function (o) { if (o !== 'p' && !/^-?\d{1,3}$/.test(o)) throw new Error('Each operation is a number (-999..999) or the letter p, "' + o + '" is not'); });
        var less = mode === 'min' ? MINLESS : MAXLESS, h = [], out = [], frames = [];
        var cmpText = mode === 'min' ? 'new PriorityQueue<>()' : 'new PriorityQueue<>(Collections.reverseOrder())';
        function fr(narr, hl, line) {
          var hlCode = {}; if (line) hlCode[line] = 'cur';
          return { narr: narr, parts: heapParts(h, hl || {}, h.length ? one(0, 'top') : {}, null, 'PriorityQueue internal tree (' + mode + '-heap)', 'internal array = what toString() prints').concat([
            { type: 'array', label: 'values returned by poll() so far', values: out.slice(), hl: out.length ? one(out.length - 1, 'sel') : {} },
            { type: 'code', label: 'Java', lang: 'java', code: 'PriorityQueue<Integer> pq = ' + cmpText + ';\npq.offer(x);   // O(log N) sift-up\nInteger top = pq.poll(); // O(log N) sift-down\nInteger p = pq.peek();   // O(1)', hl: hlCode }
          ]) };
        }
        frames.push(fr('We create a ' + (mode === 'min' ? '<b>min-heap</b> (Java default: natural order, smallest first)' : '<b>max-heap</b> by passing <code>Collections.reverseOrder()</code> (biggest first)') + '. Inside it is just an array plus sift-up and sift-down.', {}, 1));
        ops.forEach(function (o) {
          if (o === 'p') {
            if (!h.length) { frames.push(fr('<code>poll()</code> on an empty queue returns <b>null</b> (no exception). Unboxing that null into an <code>int</code> would crash — always check <code>isEmpty()</code> first.', {}, 3)); return; }
            var top = hpop(h, less); out.push(top);
            frames.push(fr('<code>poll()</code> → returns <b>' + top + '</b>, the ' + (mode === 'min' ? 'smallest' : 'largest') + ' value. The last array element moved to the root and sank down. ' + (h.length ? 'New top: <b>' + h[0] + '</b>.' : 'Queue is now empty.'), h.length ? one(0, 'sel') : {}, 3));
          } else {
            var x = Number(o); hpush(h, x, less);
            var at = h.indexOf(x);
            frames.push(fr('<code>offer(' + x + ')</code>: appended at the end, then sifted up to index ' + at + '. peek() is now <b>' + h[0] + '</b>. Notice the array is <b>not</b> sorted.', one(at, 'ok'), 2));
          }
        });
        var drained = [], copy = h.slice();
        while (copy.length) drained.push(hpop(copy, less));
        frames.push({ narr: 'Final check: printing the queue shows the raw heap array <b>[' + h.join(', ') + ']</b>, but polling everything gives sorted order <b>[' + drained.join(', ') + ']</b>. Only <code>poll()</code> guarantees priority order.', parts: [
          { type: 'array', label: 'System.out.println(pq) (heap order)', values: h.slice() },
          { type: 'array', label: 'while (!pq.isEmpty()) poll() (priority order)', values: drained, hl: (function () { var o2 = {}; drained.forEach(function (_, k) { o2[k] = 'sel'; }); return o2; })() },
          { type: 'vars', vals: { comparator: mode === 'min' ? 'natural order' : 'reverseOrder()', size: h.length } }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Comparator that sorts by frequency, then by value',
        html: `<p>Counts: ${H.kv([['4', 3], ['1', 3], ['7', 1]], { label: 'freq' })} We want the <b>most frequent first</b>, ties broken by the <b>smaller value</b>.</p>
          <p>Comparator: <code>(a, b) -&gt; f.get(a).equals(f.get(b)) ? Integer.compare(a, b) : Integer.compare(f.get(b), f.get(a))</code>. Poll order: ${H.c('p', '1, 4, 7')} — 1 and 4 both appear 3 times, 1 is smaller so it wins the tie.</p>`,
        code: { lang: 'java', code: `
          Map<Integer, Integer> f = new HashMap<>(Map.of(4, 3, 1, 3, 7, 1));
          PriorityQueue<Integer> pq = new PriorityQueue<>((a, b) ->
              f.get(a).equals(f.get(b)) ? Integer.compare(a, b)        // tie → smaller value first
                                        : Integer.compare(f.get(b), f.get(a))); // higher count first
          pq.addAll(f.keySet());
          while (!pq.isEmpty()) System.out.print(pq.poll() + " ");      // 1 4 7`, alt: [
          { lang: 'python', run: true, code: `import heapq

f = {4: 3, 1: 3, 7: 1}
# tuple (-count, value): higher count first, and on a tie the smaller value first
pq = [(-cnt, v) for v, cnt in f.items()]
heapq.heapify(pq)
print(*[heapq.heappop(pq)[1] for _ in range(len(pq))])   # 1 4 7
` },
          { lang: 'js', run: true, code: `// No heap needed to show the ordering rule: the same comparator drives Array.sort.
const f = new Map([[4, 3], [1, 3], [7, 1]]);
const order = [...f.keys()].sort((a, b) =>
  f.get(a) === f.get(b) ? a - b           // tie: smaller value first
                        : f.get(b) - f.get(a));  // higher count first (small numbers, no overflow)
console.log(order.join(' '));             // 1 4 7
` },
          { lang: 'cpp', code: `int main() {
    map<int, int> f = {{4, 3}, {1, 3}, {7, 1}};
    // comparator returns true when a should come out LATER (priority_queue keeps the "largest" on top)
    auto later = [&](int a, int b) {
        return f[a] != f[b] ? f[a] < f[b]   // lower count comes later
                            : a > b;        // tie: bigger value comes later
    };
    priority_queue<int, vector<int>, decltype(later)> pq(later);
    for (auto& [v, cnt] : f) pq.push(v);
    while (!pq.empty()) { cout << pq.top() << ' '; pq.pop(); }   // 1 4 7
    cout << endl;
}
` },
          { lang: 'csharp', run: true, code: `using System;
using System.Collections.Generic;

class FrequencyOrder
{
    static void Main()
    {
        var f = new Dictionary<int, int> { { 4, 3 }, { 1, 3 }, { 7, 1 } };
        var pq = new MinHeap<int>((a, b) =>
            f[a] == f[b] ? a.CompareTo(b)             // tie -> smaller value first
                         : f[b].CompareTo(f[a]));     // higher count first
        foreach (int k in f.Keys) pq.Push(k);
        while (pq.Count > 0) Console.Write(pq.Pop() + " ");      // 1 4 7
        Console.WriteLine();
    }
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }
        ] }
      },
      {
        title: 'The b - a overflow trap, with real numbers',
        html: `<p>Max-heap comparator <code>(a, b) -&gt; b - a</code> with a = -2,000,000,000 and b = 2,000,000,000: b - a = 4,000,000,000, which does not fit in an <code>int</code> (max 2,147,483,647). It wraps to <b>-294,967,296</b> — negative — so Java thinks <b>a</b> should come first. The “max-heap” now returns -2·10<sup>9</sup> before 2·10<sup>9</sup>. ${H.c('g', 'Integer.compare(b, a)')} never overflows.</p>`
      },
      {
        title: 'Comparator.comparing chains for objects',
        html: `<p>Tasks with (priority, deadline). Highest priority first; on a tie, earliest deadline first:</p>
          ${H.table(['task', 'priority', 'deadline', 'poll order'], [['A', '2', '5', '3rd'], ['B', '3', '9', H.c('p', '1st')], ['C', '2', '1', '2nd (ties with A on priority, earlier deadline)']])}
          <p>Correct poll order: ${H.c('p', 'B, C, A')}. <code>Comparator.comparingInt((Task t) -&gt; -t.priority).thenComparingInt(t -&gt; t.deadline)</code>. Negating is safe here because priorities are small. For full-range values start the chain with <code>Comparator.comparing((Task t) -&gt; t.priority, Comparator.reverseOrder())</code> and chain <code>.thenComparingInt(t -&gt; t.deadline)</code> — avoid calling <code>.reversed()</code> at the end of a chain, because it reverses <b>every</b> key, including the tie-breaker.</p>`
      },
      {
        title: 'Iterating is NOT priority order',
        html: `<p>Offer 5, 1, 4, 2, 3 into a min-heap. <code>System.out.println(pq)</code> prints ${H.c('r', '[1, 2, 4, 5, 3]')} (the heap array). <code>for (int x : pq)</code> walks the same array order. Only repeated <code>poll()</code> yields ${H.c('g', '1, 2, 3, 4, 5')}. Interviewers love this one.</p>`
      }
    ],
    deepDive: `<p><b>Inside java.util.PriorityQueue.</b> Fields: <code>Object[] queue</code>, <code>int size</code>, <code>Comparator comparator</code>, <code>modCount</code>. Default capacity 11; growth doubles while small (below 64) and then grows by 50%. It is <b>not thread-safe</b> — use <code>PriorityBlockingQueue</code> for producer/consumer code. Null elements are rejected (<code>NullPointerException</code>) because <code>poll()</code> uses null to mean “empty”.</p>
      <p><b>Comparator contract.</b> It must be consistent: if a &lt; b and b &lt; c then a &lt; c, and <code>compare(a, b)</code> must equal <code>-compare(b, a)</code> in sign. A comparator that reads a <b>mutable</b> field breaks the heap if that field changes while the object is inside — the heap never re-sifts on its own. Fix: remove, update, re-insert (O(N) to find), or insert a new entry and skip stale ones on poll (<b>lazy deletion</b>, the standard Dijkstra trick).</p>
      <p><b>Costs that bite:</b> <code>remove(Object)</code> and <code>contains</code> are linear scans; boxing every <code>int</code> into <code>Integer</code> costs memory (≈16 bytes per object + 4–8 per reference). For huge numeric heaps, a hand-written <code>int[]</code> heap or packing two ints into one <code>long</code> (value in the high bits, index in the low bits) is much leaner.</p>
      <p><b>Ties.</b> PriorityQueue is not stable: equal-priority items come out in no promised order. If FIFO among equals matters (fair schedulers), add a sequence number as the final tie-breaker.</p>
      <p><b>Other languages:</b> Python <code>heapq</code> is a min-heap over a list (push <code>-x</code> or tuples for max/priority); C++ <code>priority_queue</code> is a <b>max</b>-heap by default and takes <code>greater&lt;int&gt;</code> for min — the opposite default to Java.</p>`,
    aiEra: `<p><b>What AI changes:</b> boilerplate comparators are exactly what assistants autocomplete well, so typing them is no longer the skill. Choosing the <b>right ordering</b> (which key, which direction, which tie-breaker) and spotting a subtly wrong one still is.</p>
      <p><b>Use AI as a partner:</b> ask <code>Given this comparator, list 5 input pairs where it could misbehave (overflow, null, ties, inconsistency)</code>. Paste a comparator and ask it to rewrite it with <code>Comparator.comparingInt(...).thenComparing(...)</code>, then verify the order on a tiny example by hand.</p>
      <p><b>Where AI goes wrong:</b> generating <code>(a, b) -&gt; b - a</code>; using <code>reversed()</code> on a lambda without a type and getting a compile error; assuming iteration order is sorted; calling <code>pq.remove(x)</code> inside a loop (hidden O(N<sup>2</sup>)); forgetting that C++ and Java have opposite defaults when translating code.</p>
      <p><b>What you must still own:</b> the one-sentence comparator rule (negative means “a first”), the min-vs-max choice for each pattern, and knowing which PriorityQueue methods are O(log N) and which are O(N).</p>`,
    problems: [
      {
        title: 'Last Stone Weight',
        level: 'Easy',
        tags: ['heap', 'priority queue', 'simulation'],
        companies: ['Amazon', 'Google'],
        statement: `<p>You have stones with positive weights. Each turn, take the <b>two heaviest</b> stones x ≤ y and smash them: if x == y both are destroyed, otherwise the result is one stone of weight y - x. Repeat until at most one stone is left. Return its weight, or 0 if none remain.</p>`,
        constraints: `1 ≤ N ≤ 30 (classic) — design it to work for N up to 10<sup>5</sup>; 1 ≤ weight ≤ 1000`,
        example: `${H.arr([2, 7, 4, 1, 8, 1], { label: 'stones', hl: { 1: 'y', 4: 'y' } })}<p>Output ${H.c('p', '1')}. <b>Why:</b> 8 vs 7 → 1 left → [2, 4, 1, 1, 1]; 4 vs 2 → 2 → [2, 1, 1, 1]; 2 vs 1 → 1 → [1, 1, 1]; 1 vs 1 → gone → [1]. One stone of weight 1 remains.</p>`,
        brute: {
          why: `<p>Sort the list every turn and take the last two: O(N log N) per turn × up to N turns = O(N<sup>2</sup> log N). The waste: after each smash only one value changes, yet we re-sort everything.</p>`,
          code: { lang: 'java', code: `
            int lastStoneWeight(int[] stones) {
                List<Integer> list = new ArrayList<>();
                for (int s : stones) list.add(s);
                while (list.size() > 1) {
                    Collections.sort(list);                          // full sort every turn
                    int y = list.remove(list.size() - 1);
                    int x = list.remove(list.size() - 1);
                    if (y != x) list.add(y - x);
                }
                return list.isEmpty() ? 0 : list.get(0);
            }`, alt: [
          { lang: 'python', code: `def last_stone_weight(stones):
    lst = list(stones)
    while len(lst) > 1:
        lst.sort()                                   # full sort every turn
        y = lst.pop()
        x = lst.pop()
        if y != x:
            lst.append(y - x)
    return lst[0] if lst else 0` },
          { lang: 'js', code: `function lastStoneWeight(stones) {
  const list = [...stones];
  while (list.length > 1) {
    list.sort((a, b) => a - b);                      // full sort every turn
    const y = list.pop();
    const x = list.pop();
    if (y !== x) list.push(y - x);
  }
  return list.length === 0 ? 0 : list[0];
}` },
          { lang: 'cpp', code: `int lastStoneWeight(vector<int> stones) {
    vector<int> list = stones;
    while (list.size() > 1) {
        sort(list.begin(), list.end());              // full sort every turn
        int y = list.back(); list.pop_back();
        int x = list.back(); list.pop_back();
        if (y != x) list.push_back(y - x);
    }
    return list.empty() ? 0 : list[0];
}` },
          { lang: 'csharp', code: `int LastStoneWeight(int[] stones)
{
    var list = new List<int>(stones);
    while (list.Count > 1)
    {
        list.Sort();                                     // full sort every turn
        int y = list[list.Count - 1]; list.RemoveAt(list.Count - 1);
        int x = list[list.Count - 1]; list.RemoveAt(list.Count - 1);
        if (y != x) list.Add(y - x);
    }
    return list.Count == 0 ? 0 : list[0];
}` }
        ] }
        },
        mcq: {
          q: 'You repeatedly need the two LARGEST values and insert a new value. Which structure?',
          options: ['Max-heap (PriorityQueue with reverseOrder)', 'Min-heap (default PriorityQueue)', 'Sorted array with binary search insert', 'HashSet'],
          answer: 0,
          explain: 'A max-heap gives the largest in O(log N) per poll and accepts the leftover stone in O(log N). A sorted array needs O(N) shifting per insert; a HashSet has no order and loses duplicates.'
        },
        hints: [
          `<p>Each turn only needs “the biggest” and “the second biggest”. That is two polls from a max-heap.</p>`,
          `<p>Use a max-heap: Java <code>new PriorityQueue&lt;&gt;(Collections.reverseOrder())</code>, Python <code>heapq</code> with negated weights, C++ <code>priority_queue&lt;int&gt;</code> (max by default), JS a heap class with a “bigger first” comparator. Add all stones; while size &gt; 1: y = pop, x = pop, if y != x push y - x.</p>`,
          `<p>Edge cases: equal stones vanish (offer nothing); a single stone from the start is the answer; an empty heap at the end means return 0. Recipe: heapify all → loop while size ≥ 2 → return isEmpty ? 0 : peek.</p>`
        ],
        tests: { sig: 'int[] -> int', fn: 'lastStoneWeight', cases: [
          [[[2, 7, 4, 1, 8, 1]], 1],
          [[[1]], 1],
          [[[2, 2]], 0],
          [[[10, 4]], 6],
          [[[3, 7, 2]], 2],
          [[[1, 1, 1]], 1],
          [[[9, 3, 1000, 1000, 2]], 4],
          [[{ $rep: 1000, n: 99999 }], 1000],
          [[{ $rep: 1000, n: 100000 }], 0]
        ] },
        solution: {
          approach: `<p>Max-heap simulation. Each smash = 2 polls + at most 1 offer.</p>`,
          code: `
            class Solution {
                public int lastStoneWeight(int[] stones) {
                    PriorityQueue<Integer> pq = new PriorityQueue<>(Collections.reverseOrder()); // max-heap
                    for (int s : stones) pq.offer(s);
                    while (pq.size() > 1) {
                        int y = pq.poll();          // heaviest
                        int x = pq.poll();          // second heaviest
                        if (y != x) pq.offer(y - x); // leftover goes back in
                    }
                    return pq.isEmpty() ? 0 : pq.peek();
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().lastStoneWeight(new int[]{2, 7, 4, 1, 8, 1})); // 1
                }
            }`,
          alt: [
            { lang: 'python', code: `import heapq

def last_stone_weight(stones):
    heap = [-s for s in stones]           # heapq is a min-heap, so store negatives
    heapq.heapify(heap)                   # O(N) build
    while len(heap) > 1:
        y = -heapq.heappop(heap)          # heaviest
        x = -heapq.heappop(heap)          # second heaviest
        if y != x:
            heapq.heappush(heap, -(y - x))  # leftover goes back in
    return -heap[0] if heap else 0
` },
            { lang: 'js', code: `class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }  // less(a, b): a comes out first
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function lastStoneWeight(stones) {
  const pq = new MinHeap((a, b) => a > b);  // "bigger first" turns it into a max-heap
  for (const s of stones) pq.push(s);
  while (pq.size() > 1) {
    const y = pq.pop();                     // heaviest
    const x = pq.pop();                     // second heaviest
    if (y !== x) pq.push(y - x);            // leftover goes back in
  }
  return pq.size() ? pq.peek() : 0;
}
` },
            { lang: 'cpp', code: `class Solution {
public:
    int lastStoneWeight(vector<int>& stones) {
        priority_queue<int> pq(stones.begin(), stones.end());  // max-heap by default, O(N) build
        while (pq.size() > 1) {
            int y = pq.top(); pq.pop();       // heaviest
            int x = pq.top(); pq.pop();       // second heaviest
            if (y != x) pq.push(y - x);       // leftover goes back in
        }
        return pq.empty() ? 0 : pq.top();
    }
};
` },
            { lang: 'csharp', code: `using System;
using System.Collections.Generic;

public class Solution
{
    public int LastStoneWeight(int[] stones)
    {
        var pq = new MinHeap<int>((a, b) => b.CompareTo(a));   // max-heap: reversed comparison
        foreach (int s in stones) pq.Push(s);
        while (pq.Count > 1)
        {
            int y = pq.Pop();           // heaviest
            int x = pq.Pop();           // second heaviest
            if (y != x) pq.Push(y - x); // leftover goes back in
        }
        return pq.Count == 0 ? 0 : pq.Peek();
    }
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }
          ],
          dry: {
            head: ['turn', 'heap (sorted view)', 'y', 'x', 'push back'],
            rows: [
              ['start', '{8, 7, 4, 2, 1, 1}', '-', '-', '-'],
              ['1', '{4, 2, 1, 1}', '8', '7', '1 → {4, 2, 1, 1, 1}'],
              ['2', '{1, 1, 1}', '4', '2', '2 → {2, 1, 1, 1}'],
              ['3', '{1, 1}', '2', '1', '1 → {1, 1, 1}'],
              ['4', '{1}', '1', '1', 'nothing (equal)'],
              ['end', '{1}', '-', '-', '<span class="c-p">return 1</span>']
            ]
          },
          complexity: `<p><b>Time O(N log N):</b> each turn removes at least one stone, so at most N - 1 turns, each O(log N). <b>Space O(N)</b> for the heap.</p>`,
          followUps: ['Last Stone Weight II (smash any two) is a different problem: a 0/1 knapsack / subset-sum DP, not a heap.', 'What if weights fit in 0..1000? A counting array also works in O(N + W).']
        }
      }
    ]
  });

  // ================= TOPIC 4: Top-K =================
  topics.push({
    title: 'K Largest / K Smallest Elements (the Top-K pattern)',
    analogy: `<p>A talent show has only <b>3 trophies</b>. Contestants perform one after another. You keep the current 3 winners on a small stage, and you always know who is the <b>weakest of the 3</b> (they stand at the door). When a new contestant beats that weakest winner, the weakest one is sent home and the newcomer takes a seat. If the newcomer is weaker, they go home immediately.</p>
      <p>The stage is a <b>min-heap of size K</b>: its top is the weakest winner, the one we may need to kick out.</p>`,
    explain: `<p><b>Counter-intuitive but key:</b> to keep the K <b>largest</b> values, use a ${H.c('g', 'MIN-heap')} of size K. To keep the K <b>smallest</b>, use a ${H.c('p', 'MAX-heap')} of size K.</p>
      <p>Why? The heap is a “club”. The top must be the member we would <b>throw out first</b>. For “K largest”, the one to throw out is the smallest member → min-heap.</p>
      ${H.arr([3, 1, 5, 12, 2, 11, 9], { label: 'arr', hl: { 3: 'p', 5: 'p', 6: 'p' } })}
      ${H.table(['x', 'heap (K = 3) after', 'what happened'], [
        ['3, 1, 5', '{1, 3, 5}', 'heap not full yet → just add'],
        ['12', '{3, 5, 12}', '12 &gt; top 1 → ' + H.c('r', 'remove 1') + ', add 12'],
        ['2', '{3, 5, 12}', '2 ≤ top 3 → ' + H.c('m', 'ignore')],
        ['11', '{5, 11, 12}', '11 &gt; 3 → remove 3, add 11'],
        ['9', '{9, 11, 12}', '9 &gt; 5 → remove 5, add 9']
      ])}
      <p>Answer: ${H.c('p', '{9, 11, 12}')}. The top of the heap, ${H.c('y', '9')}, is exactly the <b>K-th largest</b>.</p>
      <h4>Cost</h4>
      <p>Each of the N numbers does at most one push/pop on a heap of size K → <b>O(N log K)</b> time, <b>O(K)</b> space. Sorting would be O(N log N) and needs all data at once; the heap also works on an <b>endless stream</b>.</p>
      <p><b>Other option:</b> Quickselect finds the K-th element in O(N) on average (O(N<sup>2</sup>) worst case). In interviews, the heap is the safe, easy-to-explain answer; mention Quickselect as a follow-up.</p>`,
    clues: [
      '"<b>K largest</b>", "top K", "K-th largest" → min-heap of size K (top = K-th largest).',
      '"<b>K smallest</b>", "K-th smallest", "<b>K closest</b>" → max-heap of size K (top = the worst one inside).',
      '"Most frequent K" → count with HashMap, then Top-K heap on the counts.',
      'Data arrives as a <b>stream</b> / too big for memory → keep only K items in a heap.',
      'K is much smaller than N (e.g. N = 10<sup>6</sup>, K = 10) → O(N log K) is nearly linear.'
    ],
    code: { lang: 'java', code: `
      // K smallest elements: MAX-heap of size K (top = the biggest of the small ones)
      int[] kSmallest(int[] a, int k) {
          PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());
          for (int x : a) {
              maxHeap.offer(x);
              if (maxHeap.size() > k) maxHeap.poll();   // throw out the largest: it can't be in the K smallest
          }
          int[] res = new int[maxHeap.size()];
          for (int i = res.length - 1; i >= 0; i--) res[i] = maxHeap.poll(); // fill from the back → ascending
          return res;
      }`, alt: [
      { lang: 'python', run: true, code: `import heapq

# K smallest elements: MAX-heap of size K (negatives, because heapq is a min-heap)
def k_smallest(a, k):
    max_heap = []
    for x in a:
        heapq.heappush(max_heap, -x)
        if len(max_heap) > k:
            heapq.heappop(max_heap)       # throw out the largest: it can't be in the K smallest
    return sorted(-v for v in max_heap)   # ascending


print(k_smallest([7, 10, 4, 3, 20, 15], 3))   # [3, 4, 7]
# One-liner with the same O(N log K) idea: heapq.nsmallest(3, a)
` },
      { lang: 'js', run: true, code: `class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }  // less(a, b): a comes out first
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

// K smallest elements: MAX-heap of size K (top = the biggest of the small ones)
function kSmallest(a, k) {
  const maxHeap = new MinHeap((x, y) => x > y);
  for (const x of a) {
    maxHeap.push(x);
    if (maxHeap.size() > k) maxHeap.pop();          // throw out the largest
  }
  const res = new Array(maxHeap.size());
  for (let i = res.length - 1; i >= 0; i--) res[i] = maxHeap.pop();  // fill from the back
  return res;
}

console.log(kSmallest([7, 10, 4, 3, 20, 15], 3));  // [ 3, 4, 7 ]
` },
      { lang: 'cpp', code: `// K smallest elements: MAX-heap of size K (C++ priority_queue is a max-heap by default)
vector<int> kSmallest(const vector<int>& a, int k) {
    priority_queue<int> maxHeap;
    for (int x : a) {
        maxHeap.push(x);
        if ((int)maxHeap.size() > k) maxHeap.pop();   // throw out the largest
    }
    vector<int> res(maxHeap.size());
    for (int i = (int)res.size() - 1; i >= 0; i--) { res[i] = maxHeap.top(); maxHeap.pop(); }
    return res;                                       // ascending
}
// Library alternative: std::partial_sort or std::nth_element on a copy.
` },
      { lang: 'csharp', code: `// K smallest elements: MAX-heap of size K (top = the biggest of the small ones)
int[] KSmallest(int[] a, int k)
{
    var maxHeap = new MinHeap<int>((x, y) => y.CompareTo(x));   // reversed comparison = max-heap
    foreach (int x in a)
    {
        maxHeap.Push(x);
        if (maxHeap.Count > k) maxHeap.Pop();      // throw out the largest: it can't be in the K smallest
    }
    int[] res = new int[maxHeap.Count];
    for (int i = res.Length - 1; i >= 0; i--) res[i] = maxHeap.Pop(); // fill from the back -> ascending
    return res;
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }
    ] },
    codeTitle: 'Mirror pattern: K smallest with a max-heap',
    examples: [
      {
        title: '3 smallest of [7, 10, 4, 3, 20, 15] with a max-heap',
        html: `${H.table(['x', 'max-heap after', 'action'], [
            ['7, 10, 4', '{10, 7, 4}', 'fill up to K = 3'],
            ['3', '{7, 4, 3}', '3 &lt; top 10 → ' + H.c('r', 'drop 10') + ', keep 3'],
            ['20', '{7, 4, 3}', '20 ≥ top 7 → ignore'],
            ['15', '{7, 4, 3}', '15 ≥ 7 → ignore']
          ])}
          <p>3 smallest = ${H.c('p', '{3, 4, 7}')}; the top ${H.c('y', '7')} is the 3rd smallest.</p>`
      },
      {
        title: 'K closest points to the origin',
        html: `<p>Points (1,3), (-2,2), (5,8), (0,1), K = 2. Squared distances: 10, 8, 89, 1 (no square root needed — it keeps the order and avoids doubles).</p>
          <p>“Closest” = “smallest distance” → <b>max-heap</b> of size 2 on distance. After all points: ${H.c('p', '{(-2,2) d=8, (0,1) d=1}')}. The far point (5,8) was rejected immediately because 89 ≥ top.</p>`,
        code: { lang: 'java', code: `
          int[][] kClosest(int[][] pts, int k) {
              // max-heap on squared distance: the farthest kept point is on top
              PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) ->
                  Long.compare((long) b[0] * b[0] + (long) b[1] * b[1], (long) a[0] * a[0] + (long) a[1] * a[1]));
              for (int[] p : pts) {
                  pq.offer(p);
                  if (pq.size() > k) pq.poll();   // drop the farthest
              }
              return pq.toArray(new int[0][]);
          }`, alt: [
          { lang: 'python', code: `import heapq

def k_closest(pts, k):
    # nsmallest keeps a bounded heap of size k on the squared distance
    return heapq.nsmallest(k, pts, key=lambda p: p[0] * p[0] + p[1] * p[1])
` },
          { lang: 'js', code: `class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }  // less(a, b): a comes out first
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function kClosest(pts, k) {
  const d = (p) => p[0] * p[0] + p[1] * p[1];    // exact: at most about 2·10^8 here
  const pq = new MinHeap((a, b) => d(a) > d(b)); // farthest kept point on top
  for (const p of pts) {
    pq.push(p);
    if (pq.size() > k) pq.pop();                 // drop the farthest
  }
  return pq.a.slice();
}
` },
          { lang: 'cpp', code: `vector<vector<int>> kClosest(vector<vector<int>>& pts, int k) {
    auto d = [](const vector<int>& p) { return (long long)p[0] * p[0] + (long long)p[1] * p[1]; };
    // comparator "a below b if a is closer" keeps the farthest kept point on top
    auto closer = [&](const vector<int>& a, const vector<int>& b) { return d(a) < d(b); };
    priority_queue<vector<int>, vector<vector<int>>, decltype(closer)> pq(closer);
    for (auto& p : pts) {
        pq.push(p);
        if ((int)pq.size() > k) pq.pop();         // drop the farthest
    }
    vector<vector<int>> res;
    while (!pq.empty()) { res.push_back(pq.top()); pq.pop(); }
    return res;
}
` },
          { lang: 'csharp', code: `int[][] KClosest(int[][] pts, int k)
{
    // max-heap on squared distance: the farthest kept point is on top
    Func<int[], long> d = p => (long)p[0] * p[0] + (long)p[1] * p[1];
    var pq = new MinHeap<int[]>((a, b) => d(b).CompareTo(d(a)));
    foreach (int[] p in pts)
    {
        pq.Push(p);
        if (pq.Count > k) pq.Pop();     // drop the farthest
    }
    var res = new List<int[]>();
    while (pq.Count > 0) res.Add(pq.Pop());
    return res.ToArray();
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }
        ] }
      },
      {
        title: 'Top-K frequent words: count first, then heap',
        html: `<p>words = [the, day, is, sunny, the, the, sunny, is, is], K = 2. Count: the 3, is 3, sunny 2, day 1. Min-heap of size 2 ordered by (count asc, word <b>desc</b>) so the “weakest” is on top: among equal counts the alphabetically <b>later</b> word is weaker. Result (strongest first): ${H.c('p', '[is, the]')} — both count 3, “is” comes first alphabetically.</p>`
      },
      {
        title: 'When sorting is actually fine',
        html: `<p>N = 1000, K = 500: N log N ≈ 10,000 vs N log K ≈ 9,000 — no real difference, and <code>Arrays.sort</code> is simpler and faster in practice. The heap shines when <b>K ≪ N</b> (N = 10<sup>7</sup>, K = 10 → log K ≈ 3.3 vs log N ≈ 23) or when data is a <b>stream</b> you cannot store.</p>`
      }
    ],
    deepDive: `<p><b>Three ways to get the K-th largest:</b></p>
      ${H.table(['method', 'time', 'space', 'notes'], [
        ['sort', 'O(N log N)', 'O(1)–O(N)', 'simplest; needs all data'],
        ['min-heap of size K', 'O(N log K)', 'O(K)', 'works on streams; answer at any moment'],
        ['max-heap of all N, poll K times', 'O(N + K log N)', 'O(N)', 'heapify is O(N); good when K is tiny and data is in memory'],
        ['quickselect', 'O(N) average, O(N<sup>2</sup>) worst', 'O(1)', 'random pivot makes worst case very unlikely; median-of-medians gives O(N) worst case but is slow in practice'],
        ['counting (small value range)', 'O(N + range)', 'O(range)', 'values in 0..10<sup>4</sup> → bucket counts beat everything']
      ])}
      <p><b>Micro-optimisation:</b> once the heap is full, compare with <code>peek()</code> first and skip <code>offer</code> when <code>x ≤ peek()</code>. On random data most elements are rejected after the first few K, so the real cost is closer to O(N + K log K · log(N/K)).</p>
      <p><b>Distributed Top-K:</b> each machine computes its local top K, then a coordinator merges M·K candidates. Exact for “K largest values”. For “K most frequent items” across shards, local top-K can miss globally frequent items whose counts are spread thin — real systems use sketches (Count-Min + heap, or Space-Saving) and accept approximate answers.</p>
      <p><b>Ties and order:</b> decide whether the output needs to be sorted. Draining the heap gives ascending order for a min-heap; reverse it for “largest first”. Make the comparator total (add a tie-breaker) when the expected output is unique, e.g. LeetCode's Top K Frequent Words.</p>`,
    aiEra: `<p><b>What AI changes:</b> “Top-K” is one of the patterns AI writes most reliably, and in production you often get it for free (<code>ORDER BY … LIMIT K</code>, Redis sorted sets, Elasticsearch). The skill that remains is <b>choosing</b>: heap vs quickselect vs sort vs a database index, and whether approximate answers are acceptable at scale.</p>
      <p><b>Use AI as a partner:</b> ask <code>Generate adversarial inputs for kth-largest: duplicates, K = N, K = 1, all equal, negative values</code>; ask it to compare the heap and quickselect on 10<sup>7</sup> random ints and explain the measured difference. In GenAI systems Top-K appears everywhere: retrieving the K most similar vectors, top-k sampling of next tokens, ranking search results — the same min-heap-of-size-K under the hood.</p>
      <p><b>Where AI goes wrong:</b> using a max-heap of size K for K largest (keeps the smallest ones!), forgetting the final reverse, comparators with subtraction overflow, and ignoring tie-break rules the problem states.</p>
      <p><b>What you must still own:</b> the “bouncer” intuition (top = the one to kick out), the O(N log K) argument, and the trade-off discussion an interviewer expects.</p>`,
    viz: {
      title: 'K largest: min-heap of size K as a bouncer',
      input: '3 1 5 12 2 11 9 7 | 3',
      inputLabel: 'array | K',
      gen: function (input) {
        var s = String(input === undefined ? '' : input).split('|');
        if (s.length !== 2) throw new Error('Format: numbers | K, e.g. 3 1 5 12 2 11 9 | 3');
        var a = parseNums(s[0], 2, 16, -99, 999, 'the array');
        var k = parseNums(s[1], 1, 1, 1, 15, 'K')[0];
        if (k > a.length) throw new Error('K cannot be bigger than the array length');
        var h = [], frames = [];
        function fr(i, narr, hhl, ahl, extra) {
          var ptr = i >= 0 ? one(i, 'i') : {};
          return { narr: narr, parts: [
            { type: 'array', label: 'input array', values: a, ptr: ptr, hl: ahl || (i >= 0 ? one(i, 'cur') : {}) },
            { type: 'tree', label: 'min-heap (size ≤ K = ' + k + ')', arr: h.slice(), hl: hhl || {} },
            { type: 'array', label: 'same heap as array', values: h.slice(), hl: hhl || {} },
            { type: 'vars', vals: extra || { K: k, 'heap size': h.length, 'top (weakest kept)': h.length ? h[0] : '-' } }
          ] };
        }
        frames.push(fr(-1, 'Goal: keep the <b>' + k + ' largest</b> values. We use a <b>min-heap</b> so the weakest of our kept values is always on top, ready to be kicked out.'));
        for (var i = 0; i < a.length; i++) {
          var x = a[i];
          if (h.length < k) {
            hpush(h, x, MINLESS);
            frames.push(fr(i, 'x = ' + x + '. The heap has fewer than K items, so <b>just add</b> it. (No competition yet.)', one(h.indexOf(x), 'ok')));
          } else if (x > h[0]) {
            var out = h[0];
            frames.push(fr(i, 'x = ' + x + ' is bigger than the top ' + out + ' (the weakest of our top ' + k + '). So ' + out + ' cannot be in the top ' + k + ' any more → <b>poll</b> it.', one(0, 'bad')));
            hpop(h, MINLESS);
            hpush(h, x, MINLESS);
            frames.push(fr(i, 'Add ' + x + ' and let the heap fix itself. Same result as "offer then poll if size &gt; K". New weakest kept = <b>' + h[0] + '</b>.', one(h.indexOf(x), 'ok')));
          } else {
            frames.push(fr(i, 'x = ' + x + ' ≤ top ' + h[0] + '. It is not better than even the weakest kept value → <b>ignore</b> it. No heap work at all.', one(0, 'cur'), one(i, 'bad')));
          }
        }
        var all = {}; h.forEach(function (_, j) { all[j] = 'sel'; });
        frames.push(fr(-1, 'Finished. The heap holds the ' + k + ' largest values: <b>' + h.slice().sort(function (p, q) { return q - p; }).join(', ') + '</b>. The top <b>' + h[0] + '</b> is the K-th largest. Cost: N steps × O(log K).', all, null, { K: k, 'K-th largest': h[0], 'top K': h.slice().sort(function (p, q) { return q - p; }).join(' ') }));
        return frames;
      }
    },
    problems: [
      {
        title: 'Kth Largest Element in an Array',
        level: 'Medium',
        tags: ['heap', 'top-k'],
        statement: `<p>Given an integer array <code>nums</code> and an integer <code>k</code>, return the <b>k-th largest</b> element in sorted order (not the k-th distinct). Try to beat full sorting.</p>`,
        constraints: `1 ≤ k ≤ N ≤ 10<sup>5</sup>, -10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup>`,
        example: `${H.arr([3, 2, 1, 5, 6, 4], { label: 'nums', hl: { 3: 'p', 4: 'g' } })}<p>k = 2 → Output ${H.c('p', '5')}.</p><p><b>Why:</b> sorted descending it is 6, ${H.c('p', '5')}, 4, 3, 2, 1. The 1st largest is ${H.c('g', '6')}, the 2nd is ${H.c('p', '5')}.</p>`,
        brute: {
          why: `<p>Sort the whole array and pick <code>nums[n-k]</code>: O(N log N). It works, but it orders all N values when we only care about the top k. With a stream of numbers you would have to re-sort every time.</p>`,
          code: { lang: 'java', code: `
            int findKthLargest(int[] nums, int k) {
                int[] copy = nums.clone();
                Arrays.sort(copy);              // ascending
                return copy[copy.length - k];   // k-th from the end
            }`, alt: [
          { lang: 'python', code: `def find_kth_largest(nums, k):
    copy = sorted(nums)                              # ascending
    return copy[len(copy) - k]                       # k-th from the end` },
          { lang: 'js', code: `function findKthLargest(nums, k) {
  const copy = [...nums].sort((a, b) => a - b);      // ascending
  return copy[copy.length - k];                      // k-th from the end
}` },
          { lang: 'cpp', code: `int findKthLargest(vector<int> nums, int k) {
    vector<int> copy = nums;
    sort(copy.begin(), copy.end());                  // ascending
    return copy[copy.size() - k];                    // k-th from the end
}` },
          { lang: 'csharp', code: `int FindKthLargest(int[] nums, int k)
{
    int[] copy = (int[])nums.Clone();
    Array.Sort(copy);               // ascending
    return copy[copy.Length - k];   // k-th from the end
}` }
        ] }
        },
        mcq: {
          q: 'You keep a heap of the k largest values seen so far. Which heap, and where is the answer?',
          options: ['Min-heap of size k; answer is its top', 'Max-heap of size k; answer is its top', 'Max-heap of all N values; poll k times is the only way', 'Min-heap of size k; answer is its last array element'],
          answer: 0,
          explain: 'The min-heap top is the smallest of the k largest values — that is exactly the k-th largest. (A max-heap of all N and polling k times also works but costs O(N + k log N) memory O(N).)'
        },
        hints: [
          `<p>The k-th largest is the <b>smallest</b> member of the “top k club”. If you keep exactly the k largest numbers, the answer is the minimum among them.</p>`,
          `<p>Use a min-heap (Java <code>PriorityQueue&lt;Integer&gt;</code>, Python <code>heapq</code>, C++ <code>priority_queue</code> with <code>greater&lt;int&gt;</code>, JS a small heap class). For each number: push it; if size becomes k + 1, pop (removes the smallest, which cannot be in the top k).</p>`,
          `<p>Traps: duplicates count separately (k-th largest, not distinct) — the heap handles that naturally. Do not use a max-heap of size k (that keeps the k smallest!). Recipe: for x in nums → offer x; if size &gt; k → poll. Return peek.</p>`
        ],
        tests: { sig: 'int[] int -> int', fn: 'findKthLargest', cases: [
          [[[3, 2, 1, 5, 6, 4], 2], 5],
          [[[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], 4],
          [[[1], 1], 1],
          [[[7, 7, 7, 7], 3], 7],
          [[[-1, -5, -3], 3], -5],
          [[[10000, -10000, 0], 1], 10000],
          [[[2, 1], 2], 1],
          [[{ $range: [-10000, 10001] }, 1], 10000],
          [[{ $range: [-10000, 10001] }, 20001], -10000],
          [[{ $range: [10000, -10001, -1] }, 10001], 0]
        ] },
        solution: {
          approach: `<p>Min-heap of size k. After the scan its top is the k-th largest.</p>`,
          code: `
            class Solution {
                public int findKthLargest(int[] nums, int k) {
                    PriorityQueue<Integer> heap = new PriorityQueue<>(); // min-heap
                    for (int x : nums) {
                        heap.offer(x);            // try x in the top-k club
                        if (heap.size() > k) {
                            heap.poll();          // kick out the weakest: not in top k
                        }
                    }
                    return heap.peek();           // weakest of the top k = k-th largest
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().findKthLargest(new int[]{3, 2, 1, 5, 6, 4}, 2)); // 5
                }
            }`,
          alt: [
            { lang: 'python', code: `import heapq

def find_kth_largest(nums, k):
    heap = []                             # min-heap: the top-k club
    for x in nums:
        heapq.heappush(heap, x)           # try x in the club
        if len(heap) > k:
            heapq.heappop(heap)           # kick out the weakest
    return heap[0]                        # weakest of the top k = k-th largest
` },
            { lang: 'js', code: `class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }  // less(a, b): a comes out first
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function findKthLargest(nums, k) {
  const heap = new MinHeap();             // min-heap: the top-k club
  for (const x of nums) {
    heap.push(x);
    if (heap.size() > k) heap.pop();      // kick out the weakest
  }
  return heap.peek();                     // weakest of the top k = k-th largest
}
` },
            { lang: 'cpp', code: `class Solution {
public:
    int findKthLargest(vector<int>& nums, int k) {
        priority_queue<int, vector<int>, greater<int>> heap;  // greater<int> makes it a min-heap
        for (int x : nums) {
            heap.push(x);
            if ((int)heap.size() > k) heap.pop();             // kick out the weakest
        }
        return heap.top();                                    // k-th largest
    }
};
` },
            { lang: 'csharp', code: `using System;
using System.Collections.Generic;

public class Solution
{
    public int FindKthLargest(int[] nums, int k)
    {
        var heap = new MinHeap<int>((a, b) => a.CompareTo(b)); // min-heap
        foreach (int x in nums)
        {
            heap.Push(x);             // try x in the top-k club
            if (heap.Count > k)
            {
                heap.Pop();           // kick out the weakest: not in top k
            }
        }
        return heap.Peek();           // weakest of the top k = k-th largest
    }
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }
          ],
          dry: {
            head: ['x', 'after offer', 'size &gt; k?', 'heap after', 'peek'],
            rows: [
              ['3', '{3}', 'no', '{3}', '3'],
              ['2', '{2, 3}', 'no', '{2, 3}', '2'],
              ['1', '{1, 2, 3}', 'yes → poll <span class="c-r">1</span>', '{2, 3}', '2'],
              ['5', '{2, 3, 5}', 'yes → poll <span class="c-r">2</span>', '{3, 5}', '3'],
              ['6', '{3, 5, 6}', 'yes → poll <span class="c-r">3</span>', '{5, 6}', '5'],
              ['4', '{4, 5, 6}', 'yes → poll <span class="c-r">4</span>', '{5, 6}', '<span class="c-p">5</span>']
            ]
          },
          complexity: `<p><b>Time O(N log k):</b> each of the N numbers does an offer and maybe a poll on a heap that never holds more than k + 1 items, so each costs log k. <b>Space O(k)</b> for the heap.</p>`
        }
      },
      {
        title: 'K Largest Elements (in decreasing order)',
        level: 'Medium',
        tags: ['heap', 'top-k'],
        statement: `<p>Given an array <code>arr</code> of N <b>distinct</b> integers and a number <code>k</code>, return the <code>k</code> largest elements in <b>decreasing</b> order.</p>`,
        constraints: `1 ≤ k ≤ N ≤ 10<sup>5</sup>, 1 ≤ arr[i] ≤ 10<sup>6</sup>`,
        example: `${H.arr([1, 23, 12, 9, 30, 2, 50], { label: 'arr', hl: { 1: 'p', 4: 'p', 6: 'p' } })}<p>k = 3 → Output ${H.c('p', '[50, 30, 23]')}.</p><p><b>Why:</b> the three biggest values are 50, 30 and 23; listed from biggest to smallest.</p>`,
        brute: {
          why: `<p>Repeat k times: scan the array for the largest value not yet taken. That is O(N·k) — with N = k = 10<sup>5</sup> it is 10<sup>10</sup> steps. Each scan re-checks the same numbers again and again.</p>`,
          code: { lang: 'java', code: `
            List<Integer> kLargest(int[] arr, int k) {
                boolean[] used = new boolean[arr.length];
                List<Integer> res = new ArrayList<>();
                for (int t = 0; t < k; t++) {
                    int best = -1;
                    for (int i = 0; i < arr.length; i++)          // full scan every round
                        if (!used[i] && (best == -1 || arr[i] > arr[best])) best = i;
                    used[best] = true;
                    res.add(arr[best]);
                }
                return res;
            }`, alt: [
          { lang: 'python', code: `def k_largest(arr, k):
    used = [False] * len(arr)
    res = []
    for _ in range(k):
        best = -1
        for i in range(len(arr)):                    # full scan every round
            if not used[i] and (best == -1 or arr[i] > arr[best]):
                best = i
        used[best] = True
        res.append(arr[best])
    return res` },
          { lang: 'js', code: `function kLargest(arr, k) {
  const used = new Array(arr.length).fill(false);
  const res = [];
  for (let t = 0; t < k; t++) {
    let best = -1;
    for (let i = 0; i < arr.length; i++)             // full scan every round
      if (!used[i] && (best === -1 || arr[i] > arr[best])) best = i;
    used[best] = true;
    res.push(arr[best]);
  }
  return res;
}` },
          { lang: 'cpp', code: `vector<int> kLargest(vector<int> arr, int k) {
    vector<bool> used(arr.size(), false);
    vector<int> res;
    for (int t = 0; t < k; t++) {
        int best = -1;
        for (int i = 0; i < (int)arr.size(); i++)    // full scan every round
            if (!used[i] && (best == -1 || arr[i] > arr[best])) best = i;
        used[best] = true;
        res.push_back(arr[best]);
    }
    return res;
}` },
          { lang: 'csharp', code: `List<int> KLargest(int[] arr, int k)
{
    bool[] used = new bool[arr.Length];
    var res = new List<int>();
    for (int t = 0; t < k; t++)
    {
        int best = -1;
        for (int i = 0; i < arr.Length; i++)          // full scan every round
            if (!used[i] && (best == -1 || arr[i] > arr[best])) best = i;
        used[best] = true;
        res.Add(arr[best]);
    }
    return res;
}` }
        ] }
        },
        mcq: {
          q: 'After the scan, your min-heap of size k holds the answer. Polling it gives values in which order, and what do you do?',
          options: ['Increasing order → fill the result from the back (or reverse)', 'Decreasing order → copy directly', 'Random order → sort with Arrays.sort', 'Only the top is meaningful; scan the array again'],
          answer: 0,
          explain: 'A min-heap releases the smallest first: 23, 30, 50. Reverse it (or write into the result from the last index) to get 50, 30, 23.'
        },
        hints: [
          `<p>Same as “k-th largest”, but keep the whole club at the end, not just the weakest member.</p>`,
          `<p>Min-heap of size k: offer each number, poll when size exceeds k. At the end, poll everything — that gives ascending order.</p>`,
          `<p>Traps: polling gives <b>ascending</b> order, but we need descending → fill the result array from the back. Recipe: heap; for x → offer, if size &gt; k poll; res = new int[k]; for i = k-1 down to 0: res[i] = poll.</p>`
        ],
        tests: { sig: 'int[] int -> list<int>', fn: 'kLargest', cases: [
          [[[1, 23, 12, 9, 30, 2, 50], 3], [50, 30, 23]],
          [[[5], 1], [5]],
          [[[4, 1, 3], 3], [4, 3, 1]],
          [[[9, 8, 7, 6], 2], [9, 8]],
          [[[1000000, 1, 500000], 1], [1000000]],
          [[[3, 1, 2], 2], [3, 2]],
          [[{ $range: [1, 100001] }, 3], [100000, 99999, 99998]],
          [[{ $range: [1, 100001] }, 100000], { $range: [100000, 0, -1] }]
        ] },
        solution: {
          approach: `<p>Top-K min-heap, then drain it backwards into the result.</p>`,
          code: `
            class Solution {
                public List<Integer> kLargest(int[] arr, int k) {
                    PriorityQueue<Integer> heap = new PriorityQueue<>();   // min-heap
                    for (int x : arr) {
                        heap.offer(x);
                        if (heap.size() > k) heap.poll();  // drop the smallest of k+1
                    }
                    Integer[] res = new Integer[k];
                    for (int i = k - 1; i >= 0; i--) {
                        res[i] = heap.poll();   // smallest goes to the back → decreasing order
                    }
                    return Arrays.asList(res);
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().kLargest(new int[]{1, 23, 12, 9, 30, 2, 50}, 3)); // [50, 30, 23]
                }
            }`,
          alt: [
            { lang: 'python', code: `import heapq

def k_largest(arr, k):
    heap = []                             # min-heap of the k largest so far
    for x in arr:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)           # drop the smallest of k + 1
    # popping gives increasing order; reverse it for decreasing order
    return [heapq.heappop(heap) for _ in range(len(heap))][::-1]
` },
            { lang: 'js', code: `class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }  // less(a, b): a comes out first
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function kLargest(arr, k) {
  const heap = new MinHeap();
  for (const x of arr) {
    heap.push(x);
    if (heap.size() > k) heap.pop();      // drop the smallest of k + 1
  }
  const res = new Array(k);
  for (let i = k - 1; i >= 0; i--) res[i] = heap.pop();  // smallest goes to the back
  return res;
}
` },
            { lang: 'cpp', code: `class Solution {
public:
    vector<int> kLargest(vector<int>& arr, int k) {
        priority_queue<int, vector<int>, greater<int>> heap;  // min-heap of the k largest
        for (int x : arr) {
            heap.push(x);
            if ((int)heap.size() > k) heap.pop();             // drop the smallest of k + 1
        }
        vector<int> res(k);
        for (int i = k - 1; i >= 0; i--) { res[i] = heap.top(); heap.pop(); }  // fill from the back
        return res;
    }
};
` },
            { lang: 'csharp', code: `using System;
using System.Collections.Generic;

public class Solution
{
    public IList<int> KLargest(int[] arr, int k)
    {
        var heap = new MinHeap<int>((a, b) => a.CompareTo(b));   // min-heap of the k largest
        foreach (int x in arr)
        {
            heap.Push(x);
            if (heap.Count > k) heap.Pop();   // drop the smallest of k+1
        }
        int[] res = new int[k];
        for (int i = k - 1; i >= 0; i--)
        {
            res[i] = heap.Pop();    // smallest goes to the back -> decreasing order
        }
        return res;
    }
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }
          ],
          dry: {
            head: ['x', 'heap after offer', 'poll?', 'heap after'],
            rows: [
              ['1', '{1}', 'no', '{1}'],
              ['23', '{1, 23}', 'no', '{1, 23}'],
              ['12', '{1, 12, 23}', 'no (size = k)', '{1, 12, 23}'],
              ['9', '{1, 9, 12, 23}', 'poll <span class="c-r">1</span>', '{9, 12, 23}'],
              ['30', '{9, 12, 23, 30}', 'poll <span class="c-r">9</span>', '{12, 23, 30}'],
              ['2', '{2, 12, 23, 30}', 'poll <span class="c-r">2</span>', '{12, 23, 30}'],
              ['50', '{12, 23, 30, 50}', 'poll <span class="c-r">12</span>', '{23, 30, 50}'],
              ['drain', 'poll 23 → res[2], 30 → res[1], 50 → res[0]', '-', '<span class="c-p">[50, 30, 23]</span>']
            ]
          },
          complexity: `<p><b>Time O(N log k + k log k):</b> N offers/polls on a heap of size ≤ k + 1, then k final polls. <b>Space O(k)</b> for the heap and result.</p>`
        }
      }
    ]
  });

  // ================= TOPIC 5: Merge K sorted lists =================
  topics.push({
    title: 'Merge K Sorted Lists (heap of the current heads)',
    analogy: `<p>A cinema has <b>K ticket lines</b>, and inside each line people already stand in order of their ticket number. You must let everybody in by ticket number. You do not need to look at everyone — only the <b>person at the front of each line</b>. Pick the smallest ticket among those K front people, let them in, and the next person in that same line steps forward. Repeat.</p>
      <p>A min-heap holds exactly those K “front people”, so picking the smallest takes only O(log K).</p>`,
    explain: `<p>Each list is already sorted, so the overall smallest value must be one of the <b>K heads</b>.</p>
      ${H.arr([1, 4, 7], { label: 'L0', hl: { 0: 'y' } })}
      ${H.arr([2, 5, 8], { label: 'L1', hl: { 0: 'y' } })}
      ${H.arr([3, 6, 9], { label: 'L2', hl: { 0: 'y' } })}
      <p>Heap of heads = ${H.c('y', '{1, 2, 3}')}. Poll ${H.c('g', '1')} (from L0), put it in the answer, and push L0's next node ${H.c('y', '4')}. Heap = {2, 3, 4}. Poll 2, push 5. And so on.</p>
      ${H.table(['poll', 'push next from same list', 'heap after', 'answer so far'], [
        ['1 (L0)', '4', '{2, 3, 4}', '1'],
        ['2 (L1)', '5', '{3, 4, 5}', '1 2'],
        ['3 (L2)', '6', '{4, 5, 6}', '1 2 3'],
        ['4 (L0)', '7', '{5, 6, 7}', '1 2 3 4']
      ])}
      <p><b>Cost:</b> N total nodes; each is pushed once and polled once on a heap of size ≤ K → <b>O(N log K)</b> time, <b>O(K)</b> extra space. A dummy head node makes building the answer list easy.</p>
      <p><b>Alternative:</b> divide and conquer — merge lists in pairs (like merge sort) → also O(N log K). Merging one by one into a growing result is O(N·K) — too slow.</p>
      <p>The same idea solves: merge K sorted arrays (store <code>{value, arrayIndex, position}</code> in the heap), smallest range covering K lists, K-th smallest in a sorted matrix.</p>`,
    clues: [
      '"Merge <b>K sorted</b> lists / arrays / files" → min-heap of the K current heads.',
      '"K-th smallest in a <b>row-and-column sorted matrix</b>" / "K smallest pairs" → same heap-of-fronts idea.',
      'Total nodes N up to 10<sup>4</sup>–10<sup>5</sup> and K up to 10<sup>4</sup> → O(N·K) too slow, need O(N log K).',
      '"External sorting" / "merge sorted chunks from disk" → K-way merge with a heap.'
    ],
    code: { lang: 'java', code: `
      // Merge K sorted ARRAYS: heap stores {value, which array, index inside it}
      int[] mergeKArrays(int[][] arrs) {
          PriorityQueue<int[]> pq = new PriorityQueue<>((x, y) -> Integer.compare(x[0], y[0]));
          int total = 0;
          for (int i = 0; i < arrs.length; i++) {
              total += arrs[i].length;
              if (arrs[i].length > 0) pq.offer(new int[]{arrs[i][0], i, 0}); // front of each array
          }
          int[] res = new int[total];
          int w = 0;
          while (!pq.isEmpty()) {
              int[] cur = pq.poll();               // smallest front
              res[w++] = cur[0];
              int arr = cur[1], pos = cur[2] + 1;
              if (pos < arrs[arr].length) pq.offer(new int[]{arrs[arr][pos], arr, pos}); // next in same array
          }
          return res;
      }`, alt: [
      { lang: 'python', run: true, code: `import heapq

# Merge K sorted ARRAYS: heap stores (value, which array, index inside it)
def merge_k_arrays(arrs):
    heap = [(a[0], i, 0) for i, a in enumerate(arrs) if a]   # front of each array
    heapq.heapify(heap)
    res = []
    while heap:
        v, i, pos = heapq.heappop(heap)   # smallest front
        res.append(v)
        if pos + 1 < len(arrs[i]):
            heapq.heappush(heap, (arrs[i][pos + 1], i, pos + 1))   # next in same array
    return res


print(merge_k_arrays([[1, 9], [2, 3, 4, 10], [5]]))   # [1, 2, 3, 4, 5, 9, 10]
# The standard library already does this lazily: list(heapq.merge(*arrs))
` },
      { lang: 'js', run: true, code: `class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }  // less(a, b): a comes out first
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

// Merge K sorted ARRAYS: heap stores [value, which array, index inside it]
function mergeKArrays(arrs) {
  const pq = new MinHeap((x, y) => x[0] < y[0]);
  arrs.forEach((a, i) => { if (a.length) pq.push([a[0], i, 0]); });   // front of each array
  const res = [];
  while (pq.size()) {
    const [v, i, pos] = pq.pop();         // smallest front
    res.push(v);
    if (pos + 1 < arrs[i].length) pq.push([arrs[i][pos + 1], i, pos + 1]);  // next in same array
  }
  return res;
}

console.log(mergeKArrays([[1, 9], [2, 3, 4, 10], [5]]).join(' '));   // 1 2 3 4 5 9 10
` },
      { lang: 'cpp', code: `// Merge K sorted ARRAYS: heap stores {value, which array, index inside it}
vector<int> mergeKArrays(const vector<vector<int>>& arrs) {
    priority_queue<tuple<int, int, int>, vector<tuple<int, int, int>>, greater<>> pq;  // min-heap
    for (int i = 0; i < (int)arrs.size(); i++)
        if (!arrs[i].empty()) pq.push({arrs[i][0], i, 0});   // front of each array
    vector<int> res;
    while (!pq.empty()) {
        auto [v, i, pos] = pq.top(); pq.pop();               // smallest front
        res.push_back(v);
        if (pos + 1 < (int)arrs[i].size()) pq.push({arrs[i][pos + 1], i, pos + 1});
    }
    return res;
}
` },
      { lang: 'csharp', code: `// Merge K sorted ARRAYS: heap stores {value, which array, index inside it}
int[] MergeKArrays(int[][] arrs)
{
    var pq = new MinHeap<int[]>((x, y) => x[0].CompareTo(y[0]));
    int total = 0;
    for (int i = 0; i < arrs.Length; i++)
    {
        total += arrs[i].Length;
        if (arrs[i].Length > 0) pq.Push(new[] { arrs[i][0], i, 0 }); // front of each array
    }
    int[] res = new int[total];
    int w = 0;
    while (pq.Count > 0)
    {
        int[] cur = pq.Pop();                // smallest front
        res[w++] = cur[0];
        int arr = cur[1], pos = cur[2] + 1;
        if (pos < arrs[arr].Length) pq.Push(new[] { arrs[arr][pos], arr, pos }); // next in same array
    }
    return res;
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }
    ] },
    codeTitle: 'Same idea for K sorted arrays',
    examples: [
      {
        title: 'Merge 3 sorted arrays with uneven lengths',
        html: `<p>A = [1, 9], B = [2, 3, 4, 10], C = [5]. Heap entries are {value, array, index}.</p>
          ${H.table(['poll', 'push', 'heap after', 'output'], [
            ['seed', '1(A), 2(B), 5(C)', '{1, 2, 5}', '-'],
            ['1 (A)', '9 (A)', '{2, 5, 9}', '1'],
            ['2 (B)', '3 (B)', '{3, 5, 9}', '1 2'],
            ['3 (B)', '4 (B)', '{4, 5, 9}', '1 2 3'],
            ['4 (B)', '10 (B)', '{5, 9, 10}', '1 2 3 4'],
            ['5 (C)', 'C empty', '{9, 10}', '1 2 3 4 5'],
            ['9 (A)', 'A empty', '{10}', '… 9'],
            ['10 (B)', 'B empty', '{}', H.c('p', '1 2 3 4 5 9 10')]
          ])}`
      },
      {
        title: 'Divide and conquer alternative (no heap)',
        html: `<p>K = 4 lists: round 1 merges (L0, L1) and (L2, L3); round 2 merges the two results. Every node is touched once per round and there are log₂K rounds → <b>O(N log K)</b>, same as the heap, with O(1) extra space for linked lists (if done iteratively). Sequential merging (L0+L1, then +L2, then +L3) re-walks the growing result: ≈ N·K/2.</p>`
      },
      {
        title: 'K-th smallest in a row- and column-sorted matrix',
        html: `${H.table(['', 'c0', 'c1', 'c2'], [['r0', '1', '5', '9'], ['r1', '10', '11', '13'], ['r2', '12', '13', '15']])}
          <p>Treat every row as a sorted list. Seed the heap with the first column (1, 10, 12). Poll K - 1 times, each time pushing the next item of that row. For K = 8: polls give 1, 5, 9, 10, 11, 12, 13 → the next top is ${H.c('p', '13')}. Cost O(K log n).</p>`
      }
    ],
    deepDive: `<p><b>Why the heap never holds more than K entries:</b> every list contributes at most one “current front”. When a front is polled, only its successor (same list) is pushed. So heap size ≤ K and each operation is O(log K).</p>
      <p><b>Tie handling:</b> if two heads are equal, either order is correct for values, but if stability across lists matters (merging log files with identical timestamps from servers 1..K), add the list index as a tie-breaker so output is deterministic.</p>
      <p><b>External merge sort (real systems):</b> to sort 1 TB with 16 GB RAM, sort 16 GB chunks in memory and write them as sorted “runs”, then K-way merge the runs with a heap while streaming through small read buffers. Databases (sort-merge joins, <code>ORDER BY</code> spilling to disk), LSM-tree compaction in RocksDB/Cassandra, and MapReduce shuffle all use exactly this heap-of-fronts merge. A <b>tournament / loser tree</b> is a heap variant that needs only one comparison per level on replacement and is preferred when K is large.</p>
      <p><b>Linked-list specifics:</b> reuse the original nodes (no allocation), use a dummy head, and seed only non-null heads. With N = 10<sup>4</sup> nodes the recursion-free heap version is safe; the recursive divide-and-conquer version has log K depth, which is also fine.</p>
      <p><b>Complexities to quote:</b> heap O(N log K) time, O(K) space; divide and conquer O(N log K) time, O(log K) recursion or O(1) iterative; brute force collect-and-sort O(N log N) time, O(N) space.</p>`,
    aiEra: `<p><b>What AI changes:</b> merge-K is a staple that every assistant has memorised, so the coding part is cheap. The value you add is recognising the K-way merge in disguise — merging sorted Kafka partitions by timestamp, combining paged API results, compacting sorted files — and reasoning about memory and I/O.</p>
      <p><b>Use AI as a partner:</b> ask it to <code>turn this merge-K-lists solution into an iterator that yields one element at a time</code> (useful for streaming), or to generate tests with empty lists, all-null input, one giant list, and many single-node lists.</p>
      <p><b>Where AI goes wrong:</b> pushing null heads into the heap (NullPointerException in the comparator), using <code>a.val - b.val</code> comparators, forgetting to advance to <code>node.next</code>, or proposing “collect all and sort” and calling it optimal.</p>
      <p><b>What you must still own:</b> the invariant (heap = set of current fronts), the O(N log K) proof, and the comparison with divide-and-conquer when an interviewer asks for O(1) extra space.</p>`,
    viz: {
      title: 'Merge K sorted lists with a heap of heads',
      input: '1 4 7 | 2 5 8 | 3 6 9',
      inputLabel: 'sorted lists separated by |',
      gen: function (input) {
        var raw = String(input === undefined ? '' : input).split('|');
        if (raw.length < 2 || raw.length > 5) throw new Error('Give 2 to 5 sorted lists separated by |, e.g. 1 4 7 | 2 5 8 | 3 6 9');
        var L = raw.map(function (s, i) {
          var a = parseNums(s, 1, 6, -99, 999, 'list ' + i);
          for (var j = 1; j < a.length; j++) if (a[j] < a[j - 1]) throw new Error('List ' + i + ' must be sorted (non-decreasing)');
          return a;
        });
        var pos = L.map(function () { return 0; }), heap = [], res = [], frames = [];
        var less = function (p, q) { return p.v !== q.v ? p.v < q.v : p.li < q.li; };
        function parts(hlHeap, hlList, note) {
          var ps = L.map(function (a, i) {
            var hl = {}, ptr = {};
            for (var j = 0; j < pos[i] && j < a.length; j++) hl[j] = 'done';
            if (pos[i] < a.length) { ptr[pos[i]] = 'head'; hl[pos[i]] = hlList === i ? 'ok' : 'cur'; }
            return { type: 'list', label: 'L' + i + (pos[i] >= a.length ? ' (finished)' : ''), values: a, hl: hl, ptr: ptr };
          });
          ps.push({ type: 'tree', label: 'min-heap of heads (value)', arr: heap.map(function (e) { return e.v; }), hl: hlHeap || {} });
          ps.push({ type: 'array', label: 'heap entries (value from list)', values: heap.map(function (e) { return e.v + ' L' + e.li; }), hl: hlHeap || {} });
          ps.push({ type: 'list', label: 'merged result (dummy → …)', values: ['dummy'].concat(res), hl: res.length ? one(res.length, 'sel') : {} });
          if (note) ps.push({ type: 'vars', vals: note });
          return ps;
        }
        frames.push({ narr: 'We have ' + L.length + ' sorted lists. The smallest value overall must be one of the <b>heads</b> (fronts). Start with an empty heap and a dummy result node.', parts: parts({}, -1, { 'heap size': 0 }) });
        L.forEach(function (a, i) { hpush(heap, { v: a[0], li: i }, less); });
        frames.push({ narr: 'Push every list\'s head into the min-heap: ' + L.map(function (a, i) { return a[0] + ' (L' + i + ')'; }).join(', ') + '. The heap never holds more than K = ' + L.length + ' entries.', parts: parts(one(0, 'sel'), -1, { K: L.length, 'heap top': heap[0].v }) });
        while (heap.length) {
          var e = hpop(heap, less);
          res.push(e.v);
          pos[e.li]++;
          var narr = 'Poll the smallest head <b>' + e.v + '</b> (from L' + e.li + ') and attach it to the result. ';
          if (pos[e.li] < L[e.li].length) {
            var nv = L[e.li][pos[e.li]];
            hpush(heap, { v: nv, li: e.li }, less);
            narr += 'L' + e.li + ' still has nodes, so push its next node <b>' + nv + '</b> into the heap. Only that list can supply the next candidate from its line.';
          } else {
            narr += 'L' + e.li + ' is now empty, so nothing is pushed. The heap shrinks.';
          }
          var hh = {};
          heap.forEach(function (x, j) { if (x.li === e.li && pos[e.li] < L[e.li].length && x.v === L[e.li][pos[e.li]]) hh[j] = 'ok'; });
          frames.push({ narr: narr, parts: parts(hh, e.li, { polled: e.v + ' (L' + e.li + ')', 'heap size': heap.length, 'result length': res.length }) });
        }
        frames.push({ narr: 'Heap is empty → every node was used. Merged list: <b>' + res.join(' → ') + '</b>. Return dummy.next. Each of the N nodes cost one push + one poll → O(N log K).', parts: parts({}, -1, { 'total nodes': res.length }) });
        return frames;
      }
    },
    problems: [
      {
        title: 'Merge K Sorted Lists',
        level: 'Hard',
        tags: ['heap', 'linked list', 'k-way merge'],
        statement: `<p>You are given an array of <code>k</code> linked lists <code>lists</code>; each list is sorted in ascending order. Merge all of them into <b>one sorted linked list</b> and return its head.</p>`,
        constraints: `0 ≤ k ≤ 10<sup>4</sup>, 0 ≤ each list length ≤ 500, total nodes N ≤ 10<sup>4</sup>, -10<sup>4</sup> ≤ val ≤ 10<sup>4</sup>`,
        example: `${H.arr([1, 4, 5], { label: 'L0' })}${H.arr([1, 3, 4], { label: 'L1' })}${H.arr([2, 6], { label: 'L2' })}
          ${H.arr([1, 1, 2, 3, 4, 4, 5, 6], { label: 'Output', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g', 4: 'g', 5: 'g', 6: 'g', 7: 'g' } })}
          <p><b>Why:</b> it is simply all 8 values in sorted order; equal values (the two 1s and two 4s) may come from either list.</p>`,
        brute: {
          why: `<p>Merge lists one at a time: result = merge(result, L0), then merge(result, L1), … The growing result is re-walked K times, so total work is about N·K (10<sup>4</sup> × 10<sup>4</sup> = 10<sup>8</sup> steps in the worst case). Another brute: dump all values into an array and sort, O(N log N) with O(N) extra space, ignoring that the lists were already sorted.</p>`,
          code: { lang: 'java', code: `
            class Brute {
                public ListNode mergeKLists(ListNode[] lists) {
                    ListNode result = null;
                    for (ListNode l : lists) result = mergeTwo(result, l); // re-walks result each time
                    return result;
                }

                private ListNode mergeTwo(ListNode a, ListNode b) {
                    ListNode dummy = new ListNode(0), t = dummy;
                    while (a != null && b != null) {
                        if (a.val <= b.val) { t.next = a; a = a.next; }
                        else { t.next = b; b = b.next; }
                        t = t.next;
                    }
                    t.next = (a != null) ? a : b;
                    return dummy.next;
                }
            }`, alt: [
          { lang: 'python', code: `def merge_k_lists(lists):
    result = None
    for l in lists:
        result = merge_two(result, l)                # re-walks result each time
    return result

def merge_two(a, b):
    dummy = t = ListNode(0)
    while a and b:
        if a.val <= b.val:
            t.next = a
            a = a.next
        else:
            t.next = b
            b = b.next
        t = t.next
    t.next = a if a else b
    return dummy.next` },
          { lang: 'js', code: `function mergeKLists(lists) {
  let result = null;
  for (const l of lists) result = mergeTwo(result, l); // re-walks result each time
  return result;
}

function mergeTwo(a, b) {
  const dummy = new ListNode(0);
  let t = dummy;
  while (a !== null && b !== null) {
    if (a.val <= b.val) { t.next = a; a = a.next; }
    else { t.next = b; b = b.next; }
    t = t.next;
  }
  t.next = a !== null ? a : b;
  return dummy.next;
}` },
          { lang: 'cpp', code: `ListNode* mergeTwo(ListNode* a, ListNode* b) {
    ListNode dummy(0);
    ListNode* t = &dummy;
    while (a && b) {
        if (a->val <= b->val) { t->next = a; a = a->next; }
        else { t->next = b; b = b->next; }
        t = t->next;
    }
    t->next = a ? a : b;
    return dummy.next;
}

ListNode* mergeKLists(vector<ListNode*>& lists) {
    ListNode* result = nullptr;
    for (ListNode* l : lists) result = mergeTwo(result, l); // re-walks result each time
    return result;
}` },
          { lang: 'csharp', code: `class Brute
{
    public ListNode MergeKLists(ListNode[] lists)
    {
        ListNode result = null;
        foreach (ListNode l in lists) result = MergeTwo(result, l); // re-walks result each time
        return result;
    }

    private ListNode MergeTwo(ListNode a, ListNode b)
    {
        var dummy = new ListNode(0); ListNode t = dummy;
        while (a != null && b != null)
        {
            if (a.val <= b.val) { t.next = a; a = a.next; }
            else { t.next = b; b = b.next; }
            t = t.next;
        }
        t.next = a ?? b;
        return dummy.next;
    }
}` }
        ] }
        },
        mcq: {
          q: 'At any moment, how many nodes can the heap contain?',
          options: ['At most K (one per list)', 'At most N (all nodes)', 'Exactly 2', 'At most log K'],
          answer: 0,
          explain: 'Each list has at most one representative (its current head) in the heap. When we poll a node, we push only its successor from the same list.'
        },
        hints: [
          `<p>The globally smallest remaining node is always one of the K current heads, because each list is sorted.</p>`,
          `<p>A min-heap of nodes ordered by <code>val</code> (Java <code>PriorityQueue&lt;ListNode&gt;</code> with a comparator; Python tuples <code>(val, i, node)</code> because nodes cannot be compared; C++ <code>priority_queue</code> with a comparator; JS a heap class). Push all non-null heads. Repeatedly poll the smallest, attach it to the tail of a dummy-headed result, and push <code>node.next</code> if not null.</p>`,
          `<p>Traps: some lists can be <code>null</code> (or the array empty) → skip nulls when seeding the heap; use <code>Integer.compare</code> in the comparator. Recipe: dummy, tail = dummy; seed heap; while heap not empty: n = poll; tail.next = n; tail = n; if n.next != null push n.next. Return dummy.next.</p>`
        ],
        tests: { sig: 'ListNode[] -> ListNode', fn: 'mergeKLists', cases: [
          [[[[1, 4, 5], [1, 3, 4], [2, 6]]], [1, 1, 2, 3, 4, 4, 5, 6]],
          [[[]], []],
          [[[[]]], []],
          [[[[], [1]]], [1]],
          [[[[-10000, 0, 10000]]], [-10000, 0, 10000]],
          [[[[5], [3], [4], [1], [2]]], [1, 2, 3, 4, 5]],
          [[[[1, 1, 1], [1, 1], [-3, 2]]], [-3, 1, 1, 1, 1, 1, 2]],
          [[[{ $range: [-10000, 10000, 4] }, { $range: [-9998, 10000, 4] }]], { $range: [-10000, 10000, 2] }]
        ] },
        solution: {
          approach: `<p>Min-heap of current heads, dummy node for the result.</p>`,
          code: `
            class Solution {
                public ListNode mergeKLists(ListNode[] lists) {
                    // min-heap ordered by node value
                    PriorityQueue<ListNode> pq = new PriorityQueue<>((a, b) -> Integer.compare(a.val, b.val));
                    for (ListNode head : lists) {
                        if (head != null) pq.offer(head);     // seed with each list's front
                    }
                    ListNode dummy = new ListNode(0);         // fake head: no special first case
                    ListNode tail = dummy;
                    while (!pq.isEmpty()) {
                        ListNode node = pq.poll();            // smallest of all fronts
                        tail.next = node;                     // attach to answer
                        tail = node;
                        if (node.next != null) {
                            pq.offer(node.next);              // that list's next front
                        }
                    }
                    tail.next = null;                         // tidy end (already null here)
                    return dummy.next;
                }
            }`,
          alt: [
            { lang: 'python', code: `import heapq

def merge_k_lists(lists):
    # (value, list index, node): the index breaks ties, because nodes cannot be compared
    heap = [(head.val, i, head) for i, head in enumerate(lists) if head]
    heapq.heapify(heap)
    dummy = tail = ListNode(0)            # fake head: no special first case
    while heap:
        _, i, node = heapq.heappop(heap)  # smallest of all fronts
        tail.next = tail = node           # attach to the answer and move the tail
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))  # that list's next front
    tail.next = None
    return dummy.next
` },
            { lang: 'js', code: `class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }  // less(a, b): a comes out first
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function mergeKLists(lists) {
  const pq = new MinHeap((a, b) => a.val < b.val);  // ordered by node value
  for (const head of lists) if (head) pq.push(head); // seed with each list's front
  const dummy = new ListNode(0);
  let tail = dummy;
  while (pq.size()) {
    const node = pq.pop();                // smallest of all fronts
    tail.next = node;
    tail = node;
    if (node.next) pq.push(node.next);    // that list's next front
  }
  tail.next = null;
  return dummy.next;
}
` },
            { lang: 'cpp', code: `// LeetCode-style node (the judge provides the same definition)
struct ListNode { int val; ListNode* next; ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {} };

class Solution {
public:
    ListNode* mergeKLists(vector<ListNode*>& lists) {
        // priority_queue is a max-heap, so "a comes later if a.val > b.val" gives a min-heap
        auto later = [](ListNode* a, ListNode* b) { return a->val > b->val; };
        priority_queue<ListNode*, vector<ListNode*>, decltype(later)> pq(later);
        for (ListNode* head : lists)
            if (head) pq.push(head);          // seed with each list's front
        ListNode dummy(0);
        ListNode* tail = &dummy;
        while (!pq.empty()) {
            ListNode* node = pq.top(); pq.pop();  // smallest of all fronts
            tail->next = node;
            tail = node;
            if (node->next) pq.push(node->next);  // that list's next front
        }
        tail->next = nullptr;
        return dummy.next;
    }
};
` },
            { lang: 'csharp', code: `using System;
using System.Collections.Generic;

public class Solution
{
    public ListNode MergeKLists(ListNode[] lists)
    {
        // min-heap ordered by node value
        var pq = new MinHeap<ListNode>((a, b) => a.val.CompareTo(b.val));
        foreach (ListNode head in lists)
        {
            if (head != null) pq.Push(head);      // seed with each list's front
        }
        var dummy = new ListNode(0);              // fake head: no special first case
        ListNode tail = dummy;
        while (pq.Count > 0)
        {
            ListNode node = pq.Pop();             // smallest of all fronts
            tail.next = node;                     // attach to answer
            tail = node;
            if (node.next != null)
            {
                pq.Push(node.next);               // that list's next front
            }
        }
        tail.next = null;                         // tidy end (already null here)
        return dummy.next;
    }
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }
          ],
          dry: {
            head: ['step', 'poll', 'push', 'heap after', 'result'],
            rows: [
              ['seed', '-', '1 (L0), 1 (L1), 2 (L2)', '{1, 1, 2}', '-'],
              ['1', '1 (L0)', '4 (L0)', '{1, 2, 4}', '1'],
              ['2', '1 (L1)', '3 (L1)', '{2, 3, 4}', '1 1'],
              ['3', '2 (L2)', '6 (L2)', '{3, 4, 6}', '1 1 2'],
              ['4', '3 (L1)', '4 (L1)', '{4, 4, 6}', '1 1 2 3'],
              ['5', '4 (L0)*', '5 (L0)', '{4, 5, 6}', '1 1 2 3 4'],
              ['6', '4 (L1)', 'L1 ends', '{5, 6}', '1 1 2 3 4 4'],
              ['7', '5 (L0)', 'L0 ends', '{6}', '1 1 2 3 4 4 5'],
              ['8', '6 (L2)', 'L2 ends', '{}', '<span class="c-p">1 1 2 3 4 4 5 6</span>']
            ]
          },
          complexity: `<p><small>* Two 4s tie; the heap may poll L1's 4 first instead. The pushes then happen in a different order, but the output list is identical.</small></p><p><b>Time O(N log K):</b> every one of the N nodes is pushed once and polled once, and the heap never holds more than K nodes, so each operation costs log K. <b>Space O(K)</b> for the heap (we reuse the original nodes, no copies).</p>`
        }
      }
    ]
  });

  // ================= TOPIC 6: running median =================
  topics.push({
    title: 'Running Median of a Data Stream (two heaps)',
    analogy: `<p>Students walk into a classroom one by one, and after each arrival the teacher wants the <b>middle height</b>. She splits the class into two groups: the <b>short half</b> stands on the left, the <b>tall half</b> on the right. She only ever looks at two people: the <b>tallest of the short group</b> and the <b>shortest of the tall group</b>. The middle height is one of them (or their average). When a new student arrives, at most one person has to switch groups to keep the halves equal.</p>`,
    explain: `<p>Keep two heaps:</p>
      <ul>
        <li>${H.c('b', 'low')} = a <b>max-heap</b> with the smaller half (its top = biggest of the small numbers).</li>
        <li>${H.c('p', 'high')} = a <b>min-heap</b> with the bigger half (its top = smallest of the big numbers).</li>
      </ul>
      <p>Two promises we always keep: (1) every number in low ≤ every number in high, (2) <code>low.size() == high.size()</code> or <code>low.size() == high.size() + 1</code>.</p>
      <p>Then the median is easy:</p>
      ${H.table(['total count', 'median'], [['odd', 'low.peek()'], ['even', '(low.peek() + high.peek()) / 2.0']])}
      <h4>The simple 3-line add (never breaks the promises)</h4>
      <ol>
        <li><code>low.offer(x)</code></li>
        <li><code>high.offer(low.poll())</code> — the biggest of low moves right, so promise (1) holds.</li>
        <li>If <code>high.size() &gt; low.size()</code>: <code>low.offer(high.poll())</code> — rebalance sizes.</li>
      </ol>
      ${H.table(['add', 'low (max-heap)', 'high (min-heap)', 'median'], [
        ['5', '{5}', '{}', '5'],
        ['15', '{5}', '{15}', '(5 + 15)/2 = 10'],
        ['1', '{1, 5}', '{15}', '5'],
        ['3', '{1, 3}', '{5, 15}', '(3 + 5)/2 = 4']
      ])}
      <p><b>Cost:</b> each add does a constant number of heap operations → <b>O(log N)</b>. Each findMedian just peeks → <b>O(1)</b>. Re-sorting after each add would cost O(N log N) per number.</p>`,
    clues: [
      '"<b>Median</b>" of a <b>stream</b> / "after each insertion, report the median" → two heaps.',
      '"addNum / findMedian" design question → max-heap for the lower half, min-heap for the upper half.',
      '"Sliding window median" → two heaps + lazy deletion (or two TreeMaps).',
      'Up to 5·10<sup>4</sup> calls → sorting per call is too slow; need O(log N) per add.',
      'Anything that needs the "middle" or a fixed percentile as data keeps coming → split into a left heap and a right heap.'
    ],
    code: [{ lang: 'python', run: true, title: 'Same two-heap idea in Python (heapq is a min-heap, so low stores negatives)', code: `import heapq

class MedianFinder:
    def __init__(self):
        self.low = []    # max-heap of the smaller half, stored as negatives
        self.high = []   # min-heap of the bigger half

    def add(self, x):
        heapq.heappush(self.low, -x)                          # 1) into the small half
        heapq.heappush(self.high, -heapq.heappop(self.low))   # 2) its biggest moves right
        if len(self.high) > len(self.low):                    # 3) keep low >= high in size
            heapq.heappush(self.low, -heapq.heappop(self.high))

    def median(self):
        if len(self.low) > len(self.high):
            return float(-self.low[0])
        return (-self.low[0] + self.high[0]) / 2.0

mf = MedianFinder()
for x in [5, 15, 1, 3, 8, 7, 9, 10]:
    mf.add(x)
    print("added", x, "-> median", mf.median())
`, alt: [
      { lang: 'java', code: `class MedianFinder {
    private final PriorityQueue<Integer> low = new PriorityQueue<>(Collections.reverseOrder()); // smaller half
    private final PriorityQueue<Integer> high = new PriorityQueue<>();                          // bigger half

    void add(int x) {
        low.offer(x);                        // 1) into the small half
        high.offer(low.poll());              // 2) its biggest moves right
        if (high.size() > low.size()) low.offer(high.poll());   // 3) keep low >= high in size
    }

    double median() {
        if (low.size() > high.size()) return low.peek();
        return ((long) low.peek() + high.peek()) / 2.0;   // widen before adding
    }

    public static void main(String[] args) {
        MedianFinder mf = new MedianFinder();
        for (int x : new int[]{5, 15, 1, 3, 8, 7, 9, 10}) {
            mf.add(x);
            System.out.println("added " + x + " -> median " + mf.median());
        }
    }
}
` },
      { lang: 'js', run: true, code: `class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }  // less(a, b): a comes out first
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

class MedianFinder {
  constructor() {
    this.low = new MinHeap((a, b) => a > b);   // smaller half, biggest on top
    this.high = new MinHeap();                 // bigger half, smallest on top
  }
  add(x) {
    this.low.push(x);                          // 1) into the small half
    this.high.push(this.low.pop());            // 2) its biggest moves right
    if (this.high.size() > this.low.size()) this.low.push(this.high.pop());  // 3) rebalance
  }
  median() {
    if (this.low.size() > this.high.size()) return this.low.peek();
    return (this.low.peek() + this.high.peek()) / 2;
  }
}

const mf = new MedianFinder();
for (const x of [5, 15, 1, 3, 8, 7, 9, 10]) {
  mf.add(x);
  console.log('added', x, '-> median', mf.median());
}
` },
      { lang: 'cpp', code: `class MedianFinder {
    priority_queue<int> low;                              // smaller half (max-heap is the default)
    priority_queue<int, vector<int>, greater<int>> high;  // bigger half (min-heap)

public:
    void add(int x) {
        low.push(x);                          // 1) into the small half
        high.push(low.top()); low.pop();      // 2) its biggest moves right
        if (high.size() > low.size()) { low.push(high.top()); high.pop(); }   // 3) rebalance
    }
    double median() const {
        if (low.size() > high.size()) return low.top();
        return ((long long)low.top() + high.top()) / 2.0;
    }
};

int main() {
    MedianFinder mf;
    for (int x : {5, 15, 1, 3, 8, 7, 9, 10}) {
        mf.add(x);
        cout << "added " << x << " -> median " << mf.median() << endl;
    }
}
` },
      { lang: 'csharp', run: true, code: `using System;
using System.Collections.Generic;

// Same two-heap idea in C#: low is a max-heap (reversed comparison), high a min-heap
class MedianFinder
{
    private readonly MinHeap<int> low = new MinHeap<int>((a, b) => b.CompareTo(a));    // smaller half, biggest on top
    private readonly MinHeap<int> high = new MinHeap<int>((a, b) => a.CompareTo(b));   // bigger half, smallest on top

    public void Add(int x)
    {
        low.Push(x);                                 // 1) into the small half
        high.Push(low.Pop());                        // 2) its biggest moves right
        if (high.Count > low.Count) low.Push(high.Pop());   // 3) keep low >= high in size
    }

    public double Median()
    {
        if (low.Count > high.Count) return low.Peek();
        return (low.Peek() + high.Peek()) / 2.0;
    }

    static void Main()
    {
        var mf = new MedianFinder();
        foreach (int x in new[] { 5, 15, 1, 3, 8, 7, 9, 10 })
        {
            mf.Add(x);
            Console.WriteLine("added " + x + " -> median " + mf.Median());
        }
    }
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }
    ] }, { lang: 'java', code: `
      // Sliding-window median building block: two heaps + lazy deletion counts.
      class WindowMedian {
          PriorityQueue<Integer> low = new PriorityQueue<>(Collections.reverseOrder()); // smaller half
          PriorityQueue<Integer> high = new PriorityQueue<>();                          // bigger half
          Map<Integer, Integer> delayed = new HashMap<>();  // value -> how many copies to delete later
          int lowSize = 0, highSize = 0;                    // sizes WITHOUT the delayed values

          void add(int x) {
              if (low.isEmpty() || x <= low.peek()) { low.offer(x); lowSize++; }
              else { high.offer(x); highSize++; }
              balance();
          }

          void remove(int x) {
              delayed.merge(x, 1, Integer::sum);              // remember, delete when it reaches a top
              if (x <= low.peek()) { lowSize--; if (x == low.peek()) prune(low); }
              else { highSize--; if (!high.isEmpty() && x == high.peek()) prune(high); }
              balance();
          }

          double median() {
              return lowSize > highSize ? low.peek() : ((long) low.peek() + high.peek()) / 2.0;
          }

          private void balance() {
              if (lowSize > highSize + 1) { high.offer(low.poll()); lowSize--; highSize++; prune(low); }
              else if (lowSize < highSize) { low.offer(high.poll()); highSize--; lowSize++; prune(high); }
          }

          private void prune(PriorityQueue<Integer> pq) {   // pop tops that were deleted earlier
              while (!pq.isEmpty() && delayed.getOrDefault(pq.peek(), 0) > 0) {
                  int v = pq.poll();
                  delayed.merge(v, -1, Integer::sum);
              }
          }
      }`, alt: [
      { lang: 'python', code: `import heapq
from collections import defaultdict


class WindowMedian:
    """Two heaps + lazy deletion counts."""

    def __init__(self):
        self.low = []                     # smaller half, stored as negatives (max-heap)
        self.high = []                    # bigger half (min-heap)
        self.delayed = defaultdict(int)   # value -> how many copies to delete later
        self.low_size = self.high_size = 0   # sizes WITHOUT the delayed values

    def add(self, x):
        if not self.low or x <= -self.low[0]:
            heapq.heappush(self.low, -x); self.low_size += 1
        else:
            heapq.heappush(self.high, x); self.high_size += 1
        self._balance()

    def remove(self, x):
        self.delayed[x] += 1              # remember; delete when it reaches a top
        if x <= -self.low[0]:
            self.low_size -= 1
            if x == -self.low[0]:
                self._prune(self.low, -1)
        else:
            self.high_size -= 1
            if self.high and x == self.high[0]:
                self._prune(self.high, 1)
        self._balance()

    def median(self):
        if self.low_size > self.high_size:
            return float(-self.low[0])
        return (-self.low[0] + self.high[0]) / 2

    def _balance(self):
        if self.low_size > self.high_size + 1:
            heapq.heappush(self.high, -heapq.heappop(self.low))
            self.low_size -= 1; self.high_size += 1
            self._prune(self.low, -1)
        elif self.low_size < self.high_size:
            heapq.heappush(self.low, -heapq.heappop(self.high))
            self.high_size -= 1; self.low_size += 1
            self._prune(self.high, 1)

    def _prune(self, heap, sign):         # pop tops that were deleted earlier
        while heap and self.delayed[sign * heap[0]] > 0:
            self.delayed[sign * heapq.heappop(heap)] -= 1
` },
      { lang: 'js', code: `class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }  // less(a, b): a comes out first
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

// Sliding-window median building block: two heaps + lazy deletion counts.
class WindowMedian {
  constructor() {
    this.low = new MinHeap((a, b) => a > b);  // smaller half
    this.high = new MinHeap();                // bigger half
    this.delayed = new Map();                 // value -> how many copies to delete later
    this.lowSize = 0; this.highSize = 0;      // sizes WITHOUT the delayed values
  }
  add(x) {
    if (!this.low.size() || x <= this.low.peek()) { this.low.push(x); this.lowSize++; }
    else { this.high.push(x); this.highSize++; }
    this.balance();
  }
  remove(x) {
    this.delayed.set(x, (this.delayed.get(x) || 0) + 1);  // delete when it reaches a top
    if (x <= this.low.peek()) { this.lowSize--; if (x === this.low.peek()) this.prune(this.low); }
    else { this.highSize--; if (this.high.size() && x === this.high.peek()) this.prune(this.high); }
    this.balance();
  }
  median() {
    return this.lowSize > this.highSize ? this.low.peek() : (this.low.peek() + this.high.peek()) / 2;
  }
  balance() {
    if (this.lowSize > this.highSize + 1) { this.high.push(this.low.pop()); this.lowSize--; this.highSize++; this.prune(this.low); }
    else if (this.lowSize < this.highSize) { this.low.push(this.high.pop()); this.highSize--; this.lowSize++; this.prune(this.high); }
  }
  prune(h) {                                  // pop tops that were deleted earlier
    while (h.size() && (this.delayed.get(h.peek()) || 0) > 0) {
      const v = h.pop();
      this.delayed.set(v, this.delayed.get(v) - 1);
    }
  }
}
` },
      { lang: 'cpp', code: `// In C++ a multiset can erase one exact copy in O(log N), so no lazy deletion is needed:
// keep two sorted halves directly.
class WindowMedian {
    multiset<int> low, high;              // low: smaller half, high: bigger half

    void balance() {
        if (low.size() > high.size() + 1) { high.insert(*prev(low.end())); low.erase(prev(low.end())); }
        else if (low.size() < high.size()) { low.insert(*high.begin()); high.erase(high.begin()); }
    }

public:
    void add(int x) {
        if (low.empty() || x <= *prev(low.end())) low.insert(x);
        else high.insert(x);
        balance();
    }

    void remove(int x) {
        auto it = low.find(x);
        if (it != low.end()) low.erase(it);   // erase ONE copy, not all of them
        else high.erase(high.find(x));
        balance();
    }

    double median() const {
        if (low.size() > high.size()) return *prev(low.end());
        return ((double)*prev(low.end()) + *high.begin()) / 2.0;
    }
};
` },
      { lang: 'csharp', code: `// Sliding-window median building block: two heaps + lazy deletion counts.
class WindowMedian
{
    MinHeap<int> low = new MinHeap<int>((a, b) => b.CompareTo(a));   // smaller half (max on top)
    MinHeap<int> high = new MinHeap<int>((a, b) => a.CompareTo(b));  // bigger half (min on top)
    Dictionary<int, int> delayed = new Dictionary<int, int>();       // value -> how many copies to delete later
    int lowSize = 0, highSize = 0;                                   // sizes WITHOUT the delayed values

    public void Add(int x)
    {
        if (low.Count == 0 || x <= low.Peek()) { low.Push(x); lowSize++; }
        else { high.Push(x); highSize++; }
        Balance();
    }

    public void Remove(int x)
    {
        int c; delayed.TryGetValue(x, out c); delayed[x] = c + 1;   // remember, delete when it reaches a top
        if (x <= low.Peek()) { lowSize--; if (x == low.Peek()) Prune(low); }
        else { highSize--; if (high.Count > 0 && x == high.Peek()) Prune(high); }
        Balance();
    }

    public double Median()
    {
        return lowSize > highSize ? low.Peek() : ((long)low.Peek() + high.Peek()) / 2.0;
    }

    private void Balance()
    {
        if (lowSize > highSize + 1) { high.Push(low.Pop()); lowSize--; highSize++; Prune(low); }
        else if (lowSize < highSize) { low.Push(high.Pop()); highSize--; lowSize++; Prune(high); }
    }

    private void Prune(MinHeap<int> pq)      // pop tops that were deleted earlier
    {
        int c;
        while (pq.Count > 0 && delayed.TryGetValue(pq.Peek(), out c) && c > 0)
        {
            int v = pq.Pop();
            delayed[v] = c - 1;
        }
    }
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }
    ] }],
    codeTitle: ['Python version (runnable)', 'Sliding window median helper: lazy deletion'],
    examples: [
      {
        title: 'Stream 5, 15, 1, 3, 8 step by step',
        html: `${H.table(['add', 'low (max-heap)', 'high (min-heap)', 'median'], [
            ['5', '{5}', '{}', '5'],
            ['15', '{5}', '{15}', '10'],
            ['1', '{5, 1}', '{15}', '5'],
            ['3', '{3, 1}', '{5, 15}', '4'],
            ['8', '{5, 3, 1}', '{8, 15}', H.c('p', '5')]
          ])}
          <p>After adding 8: low gets 8, gives its biggest (8) to high, high now has 3 items vs low's 2 → high gives back its smallest (5). Sorted view: 1, 3, ${H.c('p', '5')}, 8, 15 ✔.</p>`
      },
      {
        title: 'Even count and integer overflow',
        html: `<p>Stream: 2,000,000,000 and 2,000,000,000. Median = (2·10<sup>9</sup> + 2·10<sup>9</sup>) / 2.0. In <code>int</code> the sum is 4·10<sup>9</sup> → overflows to a negative number before dividing! Cast to <code>long</code> first: <code>((long) a + b) / 2.0</code>, or compute <code>a / 2.0 + b / 2.0</code>.</p>`
      },
      {
        title: 'Generalise: the 90th percentile of a stream',
        html: `<p>Keep <code>low</code> at exactly ⌈0.9 · count⌉ items and <code>high</code> with the rest. The 90th percentile is <code>low.peek()</code>. Same 3-step add, just a different size target. Latency dashboards (p90/p99) use this idea — or, at huge scale, approximate sketches like t-digest.</p>`
      },
      {
        title: 'Sliding window median (window 3) on [1, 3, -1, -3, 5]',
        html: `${H.table(['window', 'sorted window', 'median'], [['[1, 3, -1]', '-1, 1, 3', '1'], ['[3, -1, -3]', '-3, -1, 3', '-1'], ['[-1, -3, 5]', '-3, -1, 5', H.c('p', '-1')]])}
          <p>Each slide = add the new value + remove the leaving one. A library binary heap (Java <code>PriorityQueue</code>, Python <code>heapq</code>, C++ <code>priority_queue</code>) cannot remove an arbitrary value fast, so we <b>delay</b> the delete: record it in a map and throw it away only when it reaches a heap top (the second code tab).</p>`
      }
    ],
    deepDive: `<p><b>Invariants and proof.</b> (1) max(low) ≤ min(high); (2) |low| - |high| ∈ {0, 1}. The 3-step add keeps both: pushing x into low and moving low's maximum to high guarantees (1) whatever x is; the optional move back fixes (2) and preserves (1) because it moves the smallest of high, which is ≥ everything in low. With both invariants, low holds exactly the ⌈n/2⌉ smallest values, so its top is the lower median.</p>
      <p><b>Cheaper add:</b> the 3-step version always does 2–3 heap operations. A branchy version compares x with <code>low.peek()</code>, pushes to the correct side, then rebalances only if sizes break — usually 1–2 operations. Both are O(log N); interviewers accept either if you state the invariants.</p>
      <p><b>Alternatives:</b> an order-statistic tree (balanced BST with subtree sizes) supports insert, delete and k-th in O(log N) — what you need for sliding window median without lazy deletion. Java has no built-in one; <code>TreeMap&lt;Integer, Integer&gt;</code> with counts plus two size counters works. C++ <code>multiset</code> erases one exact copy in O(log N), so two multisets (or one with an iterator to the middle) need no lazy deletion; Python needs the third-party <code>sortedcontainers.SortedList</code> or the heap trick. If values are small integers (e.g. 0..100), a counting array + Fenwick tree gives O(log V) median and supports deletes trivially.</p>
      <p><b>Lazy deletion details:</b> sizes must count only “live” items; after every operation that can expose a deleted value at a top, prune it. Heaps can grow with dead entries, but each value is pushed and popped at most once, so total work stays O(N log N).</p>
      <p><b>Production reality:</b> exact medians over billions of events per minute do not fit in memory. Monitoring systems use mergeable sketches (t-digest, KLL, HDR histograms) that answer percentiles with small relative error in kilobytes of memory.</p>`,
    aiEra: `<p><b>What AI changes:</b> Find Median from Data Stream is so famous that any assistant produces the two-heap solution instantly. In an interview the signal is whether you can <b>state and defend the invariants</b>, handle the follow-ups (sliding window, percentiles, deletes) and talk about scale.</p>
      <p><b>Use AI as a partner:</b> ask <code>Write a randomized test that compares my MedianFinder with a sort-based oracle for 10,000 random operations</code> — a brute-force oracle is the best way to catch balancing bugs. Ask it to explain t-digest in plain words and when p99 from a sketch is “good enough”.</p>
      <p><b>Where AI goes wrong:</b> integer division (<code>/ 2</code> instead of <code>/ 2.0</code>), overflow in the sum, mixing up which heap is min and which is max, and in sliding-window median, removing with <code>pq.remove(x)</code> (O(K) each) while claiming O(log K).</p>
      <p><b>What you must still own:</b> the classroom-split intuition, the two invariants, the overflow-safe average, and a clear plan for deletions.</p>`,
    viz: {
      title: 'Two heaps keep the median at the tops',
      input: '5 15 1 3 8 7 9 10',
      inputLabel: 'stream of numbers (up to 14)',
      gen: function (input) {
        var a = parseNums(input, 2, 14, -99, 999, 'the stream');
        var low = [], high = [], frames = [];
        function med() {
          if (!low.length) return '-';
          return low.length > high.length ? String(low[0]) : String((low[0] + high[0]) / 2);
        }
        function fr(i, narr, lhl, hhl, vhl) {
          return { narr: narr, parts: [
            { type: 'array', label: 'stream', values: a, ptr: i >= 0 ? one(i, 'new') : {}, hl: (function () { var o = {}; for (var k = 0; k < i; k++) o[k] = 'done'; if (i >= 0) o[i] = 'cur'; return o; })() },
            { type: 'tree', label: 'low = MAX-heap (smaller half)', arr: low.slice(), hl: lhl || {} },
            { type: 'array', label: 'low as array', values: low.slice(), hl: lhl || {} },
            { type: 'tree', label: 'high = MIN-heap (bigger half)', arr: high.slice(), hl: hhl || {} },
            { type: 'array', label: 'high as array', values: high.slice(), hl: hhl || {} },
            { type: 'vars', vals: { 'low size': low.length, 'high size': high.length, 'low top': low.length ? low[0] : '-', 'high top': high.length ? high[0] : '-', median: med() }, hl: vhl || {} }
          ] };
        }
        frames.push(fr(-1, 'Two empty heaps. <b>low</b> (max-heap) will hold the smaller half, <b>high</b> (min-heap) the bigger half. The median will always sit on their tops.'));
        for (var i = 0; i < a.length; i++) {
          var x = a[i];
          hpush(low, x, MAXLESS);
          frames.push(fr(i, 'Step 1: add ' + x + ' to <b>low</b> (max-heap). Low\'s top is now ' + low[0] + '.', one(low.indexOf(x), 'ok')));
          var mv = hpop(low, MAXLESS);
          hpush(high, mv, MINLESS);
          frames.push(fr(i, 'Step 2: move low\'s biggest (<b>' + mv + '</b>) to <b>high</b>. This guarantees every number in low ≤ every number in high.', {}, one(high.indexOf(mv), 'ok')));
          if (high.length > low.length) {
            var back = hpop(high, MINLESS);
            hpush(low, back, MAXLESS);
            frames.push(fr(i, 'Step 3: high had more items than low → move high\'s smallest (<b>' + back + '</b>) back to low. Now low has the same size or one more.', one(low.indexOf(back), 'ok'), {}));
          } else {
            frames.push(fr(i, 'Step 3: sizes are fine (low ' + low.length + ', high ' + high.length + ') → no rebalance needed.', {}, {}));
          }
          var odd = low.length > high.length;
          frames.push(fr(i, 'Median after ' + (i + 1) + ' numbers: ' + (odd ? 'count is odd → median = low top = <b>' + low[0] + '</b>.' : 'count is even → median = (' + low[0] + ' + ' + high[0] + ') / 2 = <b>' + med() + '</b>.'), one(0, 'sel'), odd ? {} : one(0, 'sel'), { median: 'sel' }));
        }
        return frames;
      }
    },
    problems: [
      {
        title: 'Find Median from Data Stream',
        level: 'Hard',
        tags: ['two heaps', 'design', 'stream'],
        statement: `<p>Design a class <code>MedianFinder</code>:</p><ul><li><code>addNum(int num)</code> adds a number from the stream.</li><li><code>findMedian()</code> returns the median of all numbers so far (a <code>double</code>). If the count is even, the median is the average of the two middle values.</li></ul>`,
        constraints: `-10<sup>5</sup> ≤ num ≤ 10<sup>5</sup>, up to 5·10<sup>4</sup> calls in total, findMedian is called only when at least one number exists.`,
        example: `<p>addNum(1), addNum(2), findMedian() → ${H.c('p', '1.5')}, addNum(3), findMedian() → ${H.c('p', '2.0')}</p>
          ${H.arr([1, 2], { label: 'after 2 adds', hl: { 0: 'p', 1: 'p' } })}${H.arr([1, 2, 3], { label: 'after 3 adds', hl: { 1: 'p' } })}
          <p><b>Why:</b> with {1, 2} the two middle values average to 1.5. With {1, 2, 3} the single middle value is 2.</p>`,
        brute: {
          why: `<p>Store numbers in a list; on every findMedian, sort and pick the middle → O(N log N) per call. With 5·10<sup>4</sup> calls that is around 10<sup>10</sup> work. Even keeping the list sorted with insertion costs O(N) per add because elements must shift.</p>`,
          code: { lang: 'java', code: `
            class SlowMedianFinder {
                private List<Integer> data = new ArrayList<>();

                public void addNum(int num) { data.add(num); }

                public double findMedian() {
                    List<Integer> s = new ArrayList<>(data);
                    Collections.sort(s);                            // full sort each call
                    int n = s.size();
                    if (n % 2 == 1) return s.get(n / 2);
                    return (s.get(n / 2 - 1) + s.get(n / 2)) / 2.0;
                }
            }`, alt: [
          { lang: 'python', code: `class SlowMedianFinder:
    def __init__(self):
        self.data = []

    def addNum(self, num):
        self.data.append(num)

    def findMedian(self):
        s = sorted(self.data)                        # full sort each call
        n = len(s)
        if n % 2 == 1:
            return float(s[n // 2])
        return (s[n // 2 - 1] + s[n // 2]) / 2.0` },
          { lang: 'js', code: `class SlowMedianFinder {
  constructor() { this.data = []; }

  addNum(num) { this.data.push(num); }

  findMedian() {
    const s = [...this.data].sort((a, b) => a - b);  // full sort each call
    const n = s.length;
    if (n % 2 === 1) return s[Math.floor(n / 2)];
    return (s[n / 2 - 1] + s[n / 2]) / 2;
  }
}` },
          { lang: 'cpp', code: `class SlowMedianFinder {
    vector<int> data;
public:
    void addNum(int num) { data.push_back(num); }

    double findMedian() {
        vector<int> s = data;
        sort(s.begin(), s.end());                    // full sort each call
        int n = s.size();
        if (n % 2 == 1) return s[n / 2];
        return (s[n / 2 - 1] + s[n / 2]) / 2.0;
    }
};` },
          { lang: 'csharp', code: `class SlowMedianFinder
{
    private List<int> data = new List<int>();

    public void AddNum(int num) { data.Add(num); }

    public double FindMedian()
    {
        var s = new List<int>(data);
        s.Sort();                                       // full sort each call
        int n = s.Count;
        if (n % 2 == 1) return s[n / 2];
        return (s[n / 2 - 1] + s[n / 2]) / 2.0;
    }
}` }
        ] }
        },
        mcq: {
          q: 'Which pair of heaps lets you read the median in O(1)?',
          options: ['Max-heap for the smaller half + min-heap for the bigger half', 'Min-heap for the smaller half + max-heap for the bigger half', 'One min-heap holding everything', 'Two min-heaps of equal size'],
          answer: 0,
          explain: 'The median sits on the boundary between the halves: the biggest of the small half (max-heap top) and the smallest of the big half (min-heap top).'
        },
        hints: [
          `<p>The median only depends on the <b>boundary</b> between the smaller half and the bigger half: the largest value on the left and the smallest value on the right.</p>`,
          `<p><code>low</code> = max-heap (Java <code>Collections.reverseOrder()</code>, Python <code>heapq</code> with negated values, C++ default <code>priority_queue</code>), <code>high</code> = min-heap. Keep <code>low.size()</code> equal to <code>high.size()</code> or one more. Add: push to low, move low's top to high, and if high got bigger, move high's top back to low.</p>`,
          `<p>Traps: divide by <code>2.0</code> (not 2) to get a double; with values up to 10<sup>5</sup> the sum fits in int, but use <code>long</code> or <code>2.0</code> casting if values could be near 2·10<sup>9</sup>. Recipe: addNum → low.offer(x); high.offer(low.poll()); if high.size() &gt; low.size() → low.offer(high.poll()). findMedian → odd ? low.peek() : (low.peek() + high.peek()) / 2.0.</p>`
        ],
        tests: { cls: 'MedianFinder', sigs: { MedianFinder: '', addNum: 'int -> void', findMedian: '-> double' }, cmp: 'float', cases: [
          { ops: ['MedianFinder', 'addNum', 'addNum', 'findMedian', 'addNum', 'findMedian'], args: [[], [1], [2], [], [3], []], out: [null, null, null, 1.5, null, 2.0] },
          { ops: ['MedianFinder', 'addNum', 'findMedian'], args: [[], [-7], []], out: [null, null, -7.0] },
          { ops: ['MedianFinder', 'addNum', 'addNum', 'addNum', 'addNum', 'addNum', 'findMedian', 'addNum', 'findMedian', 'addNum', 'findMedian', 'addNum', 'findMedian'], args: [[], [5], [15], [1], [3], [8], [], [7], [], [9], [], [10], []], out: [null, null, null, null, null, null, 5.0, null, 6.0, null, 7.0, null, 7.5] },
          { ops: ['MedianFinder', 'addNum', 'addNum', 'addNum', 'findMedian', 'addNum', 'findMedian'], args: [[], [4], [4], [4], [], [4], []], out: [null, null, null, null, 4.0, null, 4.0] },
          { ops: ['MedianFinder', 'addNum', 'addNum', 'findMedian', 'addNum', 'findMedian', 'addNum', 'findMedian'], args: [[], [100000], [-100000], [], [100000], [], [100000], []], out: [null, null, null, 0.0, null, 100000.0, null, 100000.0] },
          { ops: ['MedianFinder', 'addNum', 'addNum', 'addNum', 'addNum', 'addNum', 'addNum', 'findMedian', 'addNum', 'findMedian'], args: [[], [6], [5], [4], [3], [2], [1], [], [0], []], out: [null, null, null, null, null, null, null, 3.5, null, 3.0] },
          { ops: ['MedianFinder', 'addNum', 'addNum', 'findMedian', 'addNum', 'findMedian', 'addNum', 'findMedian'], args: [[], [-1], [-2], [], [-3], [], [-4], []], out: [null, null, null, -1.5, null, -2.0, null, -2.5] }
        ] },
        solution: {
          approach: `<p>Two heaps split at the middle; tops give the median.</p>`,
          code: `
            class MedianFinder {
                // low: smaller half, biggest on top
                private PriorityQueue<Integer> low = new PriorityQueue<>(Collections.reverseOrder());
                // high: bigger half, smallest on top
                private PriorityQueue<Integer> high = new PriorityQueue<>();

                public void addNum(int num) {
                    low.offer(num);                 // 1) go to the small half first
                    high.offer(low.poll());         // 2) its biggest moves right → low ≤ high holds
                    if (high.size() > low.size()) { // 3) keep low as big or one bigger
                        low.offer(high.poll());
                    }
                }

                public double findMedian() {
                    if (low.size() > high.size()) return low.peek();   // odd count
                    return ((long) low.peek() + high.peek()) / 2.0;    // even count
                }

                public static void main(String[] args) {
                    MedianFinder mf = new MedianFinder();
                    mf.addNum(1); mf.addNum(2);
                    System.out.println(mf.findMedian());  // 1.5
                    mf.addNum(3);
                    System.out.println(mf.findMedian());  // 2.0
                }
            }`,
          alt: [
            { lang: 'python', code: `import heapq

class MedianFinder:
    def __init__(self):
        self.low = []                     # smaller half as a max-heap: store negatives
        self.high = []                    # bigger half, min-heap

    def addNum(self, num):
        heapq.heappush(self.low, -num)                          # 1) small half first
        heapq.heappush(self.high, -heapq.heappop(self.low))     # 2) its biggest moves right
        if len(self.high) > len(self.low):                      # 3) keep low as big or one bigger
            heapq.heappush(self.low, -heapq.heappop(self.high))

    def findMedian(self):
        if len(self.low) > len(self.high):
            return float(-self.low[0])    # odd count
        return (-self.low[0] + self.high[0]) / 2   # even count; Python ints never overflow
` },
            { lang: 'js', code: `class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }  // less(a, b): a comes out first
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

class MedianFinder {
  constructor() {
    this.low = new MinHeap((a, b) => a > b);  // smaller half, biggest on top
    this.high = new MinHeap();                // bigger half, smallest on top
  }

  addNum(num) {
    this.low.push(num);                       // 1) small half first
    this.high.push(this.low.pop());           // 2) its biggest moves right
    if (this.high.size() > this.low.size()) this.low.push(this.high.pop());  // 3) rebalance
  }

  findMedian() {
    if (this.low.size() > this.high.size()) return this.low.peek();
    return (this.low.peek() + this.high.peek()) / 2;  // / always gives a fraction in JS
  }
}
` },
            { lang: 'cpp', code: `class MedianFinder {
    priority_queue<int> low;                              // smaller half, max-heap (C++ default)
    priority_queue<int, vector<int>, greater<int>> high;  // bigger half, min-heap

public:
    void addNum(int num) {
        low.push(num);                        // 1) small half first
        high.push(low.top()); low.pop();      // 2) its biggest moves right
        if (high.size() > low.size()) {       // 3) keep low as big or one bigger
            low.push(high.top()); high.pop();
        }
    }

    double findMedian() {
        if (low.size() > high.size()) return low.top();
        return ((long long)low.top() + high.top()) / 2.0;   // widen before adding
    }
};
` },
            { lang: 'csharp', code: `using System;
using System.Collections.Generic;

public class MedianFinder
{
    // low: smaller half, biggest on top (reversed comparison = max-heap)
    private MinHeap<int> low = new MinHeap<int>((a, b) => b.CompareTo(a));
    // high: bigger half, smallest on top
    private MinHeap<int> high = new MinHeap<int>((a, b) => a.CompareTo(b));

    public void AddNum(int num)
    {
        low.Push(num);                  // 1) go to the small half first
        high.Push(low.Pop());           // 2) its biggest moves right -> low <= high holds
        if (high.Count > low.Count)     // 3) keep low as big or one bigger
        {
            low.Push(high.Pop());
        }
    }

    public double FindMedian()
    {
        if (low.Count > high.Count) return low.Peek();     // odd count
        return ((long)low.Peek() + high.Peek()) / 2.0;     // even count
    }
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }
          ],
          dry: {
            head: ['call', 'after step 1 (low += x)', 'after step 2 (move to high)', 'after step 3 (rebalance)', 'result'],
            rows: [
              ['addNum(1)', 'low {1}, high {}', 'low {}, high {1}', 'high bigger → low {1}, high {}', '-'],
              ['addNum(2)', 'low {1, 2}, high {}', 'low {1}, high {2}', 'sizes equal → no move', '-'],
              ['findMedian', '-', '-', 'even: (1 + 2) / 2.0', '<span class="c-p">1.5</span>'],
              ['addNum(3)', 'low {1, 3}, high {2}', 'low {1}, high {2, 3}', 'high bigger → low {1, 2}, high {3}', '-'],
              ['findMedian', '-', '-', 'odd: low.peek()', '<span class="c-p">2.0</span>']
            ]
          },
          complexity: `<p><b>addNum O(log N):</b> at most 3 offers/polls, each on a heap of about N/2 items. <b>findMedian O(1):</b> two peeks. <b>Space O(N):</b> every number lives in exactly one of the heaps.</p>`
        }
      }
    ]
  });

  // ================= TOPIC 7: Trie =================
  topics.push({
    title: 'Prefix Trees (Tries): insert, search, startsWith, autocomplete',
    analogy: `<p>Type “ca” on your <b>phone keyboard</b> and it instantly suggests “car”, “cat”, “cart”. The phone does not compare “ca” against every word it knows. It keeps words in a <b>letter tree</b>: from the start, take the branch “c”, then the branch “a” — and every word hanging below that spot starts with “ca”.</p>
      <p>It is like an old paper dictionary with <b>thumb tabs</b>: jump to the “C” section, then the “CA” pages, and you are already standing among all the words you want.</p>`,
    explain: `<p>A <b>trie</b> (say “try”, from re<b>trie</b>val) is a tree where each <b>edge is a letter</b>. A path from the root spells a prefix. Each node stores:</p>
      <ul><li><code>children[26]</code> — one slot per letter a–z (null if no word continues with that letter),</li><li><code>isEnd</code> — true if a complete word finishes here.</li></ul>
      <p>Words ${H.c('g', 'car')}, ${H.c('g', 'cat')}, ${H.c('g', 'cart')}, ${H.c('g', 'do')}, ${H.c('g', 'dog')} share prefixes, so they share nodes:</p>
      ${H.table(['path', 'node', 'isEnd?'], [
        ['c', 'c', 'no'], ['c → a', 'ca', 'no'], ['c → a → r', 'car', H.c('p', 'yes')], ['c → a → r → t', 'cart', H.c('p', 'yes')],
        ['c → a → t', 'cat', H.c('p', 'yes')], ['d → o', 'do', H.c('p', 'yes')], ['d → o → g', 'dog', H.c('p', 'yes')]
      ])}
      <h4>The three operations (L = length of the word)</h4>
      <ul>
        <li><b>insert(word)</b>: walk letter by letter; create a child node when it is missing; mark the last node <code>isEnd = true</code>. O(L).</li>
        <li><b>search(word)</b>: walk; if a letter is missing → false. At the end, return <code>isEnd</code> (“ca” exists as a path but is <b>not</b> a word). O(L).</li>
        <li><b>startsWith(prefix)</b>: same walk, but at the end return <b>true</b> regardless of <code>isEnd</code>. O(L).</li>
      </ul>
      <p><b>Autocomplete</b> = walk to the prefix node, then DFS below it collecting every node with <code>isEnd</code>.</p>
      <p><b>Why not a HashSet?</b> A HashSet answers “is this exact word present?”, but “does any word start with ca?” would need checking every word. The trie answers prefix questions in O(L), independent of how many words are stored. Memory: up to 26 pointers per node, total nodes ≤ total characters inserted.</p>`,
    clues: [
      '"<b>Prefix</b>", "starts with", "autocomplete", "search suggestions", "type-ahead" → trie.',
      '"Implement a dictionary with insert / search / startsWith" → trie with <code>children[26]</code> + <code>isEnd</code>.',
      '"Find all dictionary words in a grid" (Word Search II) → put words in a trie, DFS the grid and prune when the prefix is dead.',
      '"Longest common prefix", "longest word built one letter at a time", "replace words with their root" → walk a trie.',
      'Many words (10<sup>4</sup>–10<sup>5</sup>) and many prefix queries → trie gives O(length) per query.'
    ],
    code: { lang: 'java', code: `
      class TrieNode {
          TrieNode[] child = new TrieNode[26];
          boolean isEnd;
      }

      class Autocomplete {
          TrieNode root = new TrieNode();

          void insert(String w) {
              TrieNode cur = root;
              for (char ch : w.toCharArray()) {
                  int c = ch - 'a';
                  if (cur.child[c] == null) cur.child[c] = new TrieNode();
                  cur = cur.child[c];
              }
              cur.isEnd = true;
          }

          // All stored words that start with prefix, in alphabetical order.
          List<String> suggest(String prefix) {
              List<String> out = new ArrayList<>();
              TrieNode cur = root;
              for (char ch : prefix.toCharArray()) {
                  cur = cur.child[ch - 'a'];
                  if (cur == null) return out;          // no word has this prefix
              }
              collect(cur, new StringBuilder(prefix), out);
              return out;
          }

          private void collect(TrieNode node, StringBuilder sb, List<String> out) {
              if (node.isEnd) out.add(sb.toString());   // a full word ends here
              for (int c = 0; c < 26; c++) {
                  if (node.child[c] != null) {
                      sb.append((char) ('a' + c));       // go down letter c
                      collect(node.child[c], sb, out);
                      sb.deleteCharAt(sb.length() - 1);  // come back up (backtrack)
                  }
              }
          }

          public static void main(String[] args) {
              Autocomplete ac = new Autocomplete();
              for (String w : new String[]{"car", "cat", "cart", "dog", "do"}) ac.insert(w);
              System.out.println(ac.suggest("ca"));   // [car, cart, cat]
          }
      }`, alt: [
      { lang: 'python', run: true, code: `class Autocomplete:
    END = '$'                             # key that marks "a word ends here"

    def __init__(self):
        self.root = {}                    # node = dict: letter -> child node

    def insert(self, w):
        node = self.root
        for ch in w:
            node = node.setdefault(ch, {})
        node[Autocomplete.END] = True

    def suggest(self, prefix):
        """All stored words that start with prefix, in alphabetical order."""
        node = self.root
        for ch in prefix:
            node = node.get(ch)
            if node is None:
                return []                 # no word has this prefix
        out = []
        self._collect(node, list(prefix), out)
        return out

    def _collect(self, node, path, out):  # depth = word length, far below the 1000-frame limit
        if Autocomplete.END in node:
            out.append(''.join(path))     # a full word ends here
        for ch in sorted(k for k in node if k != Autocomplete.END):
            path.append(ch)               # go down letter ch
            self._collect(node[ch], path, out)
            path.pop()                    # come back up (backtrack)


ac = Autocomplete()
for w in ["car", "cat", "cart", "dog", "do"]:
    ac.insert(w)
print(ac.suggest("ca"))                   # ['car', 'cart', 'cat']
` },
      { lang: 'js', run: true, code: `class TrieNode {
  constructor() {
    this.child = new Array(26).fill(null);  // child[c] = next node for letter 'a' + c
    this.isEnd = false;
  }
}

class Autocomplete {
  constructor() { this.root = new TrieNode(); }

  insert(w) {
    let cur = this.root;
    for (const ch of w) {
      const c = ch.charCodeAt(0) - 97;
      if (!cur.child[c]) cur.child[c] = new TrieNode();
      cur = cur.child[c];
    }
    cur.isEnd = true;
  }

  // All stored words that start with prefix, in alphabetical order.
  suggest(prefix) {
    let cur = this.root;
    for (const ch of prefix) {
      cur = cur.child[ch.charCodeAt(0) - 97];
      if (!cur) return [];                // no word has this prefix
    }
    const out = [], path = [...prefix];
    const collect = (node) => {
      if (node.isEnd) out.push(path.join(''));   // a full word ends here
      for (let c = 0; c < 26; c++) {
        if (node.child[c]) {
          path.push(String.fromCharCode(97 + c)); // go down letter c
          collect(node.child[c]);
          path.pop();                             // come back up (backtrack)
        }
      }
    };
    collect(cur);
    return out;
  }
}

const ac = new Autocomplete();
for (const w of ['car', 'cat', 'cart', 'dog', 'do']) ac.insert(w);
console.log(ac.suggest('ca'));            // [ 'car', 'cart', 'cat' ]
` },
      { lang: 'cpp', code: `struct TrieNode {
    array<unique_ptr<TrieNode>, 26> child;
    bool isEnd = false;
};

class Autocomplete {
    TrieNode root;

    void collect(const TrieNode* node, string& path, vector<string>& out) const {
        if (node->isEnd) out.push_back(path);       // a full word ends here
        for (int c = 0; c < 26; c++) {
            if (node->child[c]) {
                path.push_back(char('a' + c));      // go down letter c
                collect(node->child[c].get(), path, out);
                path.pop_back();                    // come back up (backtrack)
            }
        }
    }

public:
    void insert(const string& w) {
        TrieNode* cur = &root;
        for (char ch : w) {
            auto& next = cur->child[ch - 'a'];
            if (!next) next = make_unique<TrieNode>();
            cur = next.get();
        }
        cur->isEnd = true;
    }

    // All stored words that start with prefix, in alphabetical order.
    vector<string> suggest(const string& prefix) const {
        const TrieNode* cur = &root;
        for (char ch : prefix) {
            cur = cur->child[ch - 'a'].get();
            if (!cur) return {};                    // no word has this prefix
        }
        vector<string> out;
        string path = prefix;
        collect(cur, path, out);
        return out;
    }
};

int main() {
    Autocomplete ac;
    for (string w : {"car", "cat", "cart", "dog", "do"}) ac.insert(w);
    for (const string& s : ac.suggest("ca")) cout << s << " ";   // car cart cat
    cout << endl;
}
` },
      { lang: 'csharp', run: true, code: `using System;
using System.Collections.Generic;
using System.Text;

class TrieNode
{
    public TrieNode[] child = new TrieNode[26];
    public bool isEnd;
}

class Autocomplete
{
    TrieNode root = new TrieNode();

    public void Insert(string w)
    {
        TrieNode cur = root;
        foreach (char ch in w)
        {
            int c = ch - 'a';
            if (cur.child[c] == null) cur.child[c] = new TrieNode();
            cur = cur.child[c];
        }
        cur.isEnd = true;
    }

    // All stored words that start with prefix, in alphabetical order.
    public List<string> Suggest(string prefix)
    {
        var result = new List<string>();
        TrieNode cur = root;
        foreach (char ch in prefix)
        {
            cur = cur.child[ch - 'a'];
            if (cur == null) return result;       // no word has this prefix
        }
        Collect(cur, new StringBuilder(prefix), result);
        return result;
    }

    private void Collect(TrieNode node, StringBuilder sb, List<string> result)
    {
        if (node.isEnd) result.Add(sb.ToString()); // a full word ends here
        for (int c = 0; c < 26; c++)
        {
            if (node.child[c] != null)
            {
                sb.Append((char)('a' + c));        // go down letter c
                Collect(node.child[c], sb, result);
                sb.Length--;                       // come back up (backtrack)
            }
        }
    }

    static void Main()
    {
        var ac = new Autocomplete();
        foreach (string w in new[] { "car", "cat", "cart", "dog", "do" }) ac.Insert(w);
        Console.WriteLine("[" + string.Join(", ", ac.Suggest("ca")) + "]");   // [car, cart, cat]
    }
}` }
    ] },
    codeTitle: 'Autocomplete: walk to the prefix, then DFS for all words below',
    examples: [
      {
        title: 'Count words with a given prefix',
        html: `<p>Add a counter <code>pass</code> to every node: “how many inserted words walk through me”. Insert apple, app, apt, bat:</p>
          ${H.table(['node', 'pass', 'isEnd'], [['a', '3', 'no'], ['ap', '3', 'no'], ['app', '2', 'yes'], ['apt', '1', 'yes'], ['b', '1', 'no']])}
          <p><code>countPrefix("ap")</code> = ${H.c('p', '3')} in O(length of prefix) — no DFS needed. This is how “how many contacts start with …” questions are answered.</p>`,
        code: { lang: 'java', code: `
          class CountTrie {
              CountTrie[] kid = new CountTrie[26];
              int pass, end;                       // words passing through / ending here

              void insert(String w) {
                  CountTrie cur = this;
                  for (char ch : w.toCharArray()) {
                      int c = ch - 'a';
                      if (cur.kid[c] == null) cur.kid[c] = new CountTrie();
                      cur = cur.kid[c];
                      cur.pass++;                  // one more word goes through this node
                  }
                  cur.end++;
              }

              int countPrefix(String p) {
                  CountTrie cur = this;
                  for (char ch : p.toCharArray()) {
                      cur = cur.kid[ch - 'a'];
                      if (cur == null) return 0;
                  }
                  return cur.pass;
              }
          }`, alt: [
          { lang: 'python', run: true, code: `class CountTrie:
    def __init__(self):
        self.kid = {}                     # letter -> CountTrie
        self.passes = 0                   # words passing through this node
        self.end = 0                      # words ending here

    def insert(self, w):
        cur = self
        for ch in w:
            cur = cur.kid.setdefault(ch, CountTrie())
            cur.passes += 1               # one more word goes through this node
        cur.end += 1

    def count_prefix(self, p):
        cur = self
        for ch in p:
            cur = cur.kid.get(ch)
            if cur is None:
                return 0
        return cur.passes


t = CountTrie()
for w in ["apple", "app", "apt", "bat"]:
    t.insert(w)
print(t.count_prefix("ap"))               # 3
` },
          { lang: 'js', run: true, code: `class CountTrie {
  constructor() {
    this.kid = new Map();                 // letter -> CountTrie
    this.pass = 0;                        // words passing through this node
    this.end = 0;                         // words ending here
  }
  insert(w) {
    let cur = this;
    for (const ch of w) {
      if (!cur.kid.has(ch)) cur.kid.set(ch, new CountTrie());
      cur = cur.kid.get(ch);
      cur.pass++;                         // one more word goes through this node
    }
    cur.end++;
  }
  countPrefix(p) {
    let cur = this;
    for (const ch of p) {
      cur = cur.kid.get(ch);
      if (!cur) return 0;
    }
    return cur.pass;
  }
}

const t = new CountTrie();
['apple', 'app', 'apt', 'bat'].forEach((w) => t.insert(w));
console.log(t.countPrefix('ap'));         // 3
` },
          { lang: 'cpp', code: `struct CountTrie {
    array<unique_ptr<CountTrie>, 26> kid;
    int pass = 0, end = 0;                // words passing through / ending here

    void insert(const string& w) {
        CountTrie* cur = this;
        for (char ch : w) {
            auto& next = cur->kid[ch - 'a'];
            if (!next) next = make_unique<CountTrie>();
            cur = next.get();
            cur->pass++;                  // one more word goes through this node
        }
        cur->end++;
    }

    int countPrefix(const string& p) const {
        const CountTrie* cur = this;
        for (char ch : p) {
            cur = cur->kid[ch - 'a'].get();
            if (!cur) return 0;
        }
        return cur->pass;
    }
};
` },
          { lang: 'csharp', run: true, code: `using System;

class CountTrie
{
    CountTrie[] kid = new CountTrie[26];
    int pass, end;                       // words passing through / ending here

    public void Insert(string w)
    {
        CountTrie cur = this;
        foreach (char ch in w)
        {
            int c = ch - 'a';
            if (cur.kid[c] == null) cur.kid[c] = new CountTrie();
            cur = cur.kid[c];
            cur.pass++;                  // one more word goes through this node
        }
        cur.end++;
    }

    public int CountPrefix(string p)
    {
        CountTrie cur = this;
        foreach (char ch in p)
        {
            cur = cur.kid[ch - 'a'];
            if (cur == null) return 0;
        }
        return cur.pass;
    }

    static void Main()
    {
        var t = new CountTrie();
        foreach (string w in new[] { "apple", "app", "apt", "bat" }) t.Insert(w);
        Console.WriteLine(t.CountPrefix("ap") + " " + t.CountPrefix("app") + " " + t.CountPrefix("c"));   // 3 2 0
    }
}` }
        ] }
      },
      {
        title: 'Longest common prefix of [flower, flow, flight]',
        html: `<p>Insert all three. Walk from the root while the current node has <b>exactly one child</b> and is <b>not</b> the end of a word: f → l → then the node “fl” has two children (o, i) → stop. Answer ${H.c('p', '"fl"')}. (For a single query, comparing characters column by column is simpler; the trie wins when you ask many prefix questions on the same word set.)</p>`
      },
      {
        title: 'Replace words with their shortest root',
        html: `<p>Roots: cat, bat, rat. Sentence: “the cattle was rattled by the battery”. For each word walk the trie and stop at the <b>first</b> node with <code>isEnd</code>: cattle → ${H.c('g', 'cat')}, rattled → ${H.c('g', 'rat')}, battery → ${H.c('g', 'bat')}; “the”, “was”, “by” fall off the trie → unchanged. Output: “the cat was rat by the bat”.</p>`
      },
      {
        title: 'Delete a word safely',
        html: `<p>Words: app, apple. Delete “apple”: unmark <code>isEnd</code> at “apple”, then walk back up removing nodes that now have no children and are not word ends (e, l). Stop at “app” because it is a word. Deleting “app” instead would only clear its flag — the nodes are still needed by “apple”. With <code>pass</code> counters, decrement along the path and drop a child when its count hits 0.</p>`
      }
    ],
    deepDive: `<p><b>Node layout trade-offs.</b> <code>TrieNode[26]</code> is fastest (direct index) but each node costs ~16 bytes header + 26 × 4–8 byte references ≈ 120–230 bytes even when almost empty. A <code>HashMap&lt;Character, TrieNode&gt;</code> handles any alphabet (Unicode, URLs) with less waste for sparse nodes but slower constant factors. Competitive programmers use a <b>flat array</b> <code>int[maxNodes][26]</code> with node ids — no objects, cache-friendly, trivial to reset.</p>
      <p><b>Complexities:</b> insert/search/startsWith O(L). Space O(total characters × alphabet) worst case. Autocomplete O(P + size of the subtree) — to return only the top 5 suggestions quickly, store at each node a small precomputed list of the best completions (what real typeahead systems do) or keep counts and use a heap during the DFS.</p>
      <p><b>Compressed tries.</b> A <b>radix tree / Patricia trie</b> merges chains of single-child nodes into one edge labelled with a whole string (“ap|ple”). Used in Linux kernel routing tables, Redis (rax), Ethereum state (Merkle-Patricia). A <b>DAWG/FST</b> also shares suffixes and powers Lucene's term dictionary. <b>Ternary search trees</b> sit between BSTs and tries in memory use.</p>
      <p><b>Trie vs HashSet:</b> for exact lookups a HashSet is simpler, uses less memory and is O(L) too (hashing reads the whole string). Choose a trie only when you need prefix queries, ordered traversal (DFS in a–z order yields sorted words), longest-prefix matching (IP routing), or pruning while searching (Word Search II).</p>
      <p><b>Edge cases:</b> empty string (the root itself becomes an end), uppercase or non-letters breaking <code>ch - 'a'</code> (validate or map), duplicate inserts (counters vs boolean), and very deep recursion in DFS for long words (use an explicit stack if L can be 10<sup>5</sup>).</p>`,
    aiEra: `<p><b>What AI changes:</b> the code for a trie is short and every model writes it well. Meanwhile tries quietly power AI systems themselves: tokenizers (BPE/WordPiece vocabularies) do longest-match lookups, constrained decoding uses a trie of allowed outputs to mask invalid next tokens, and search boxes still use tries/FSTs for instant suggestions alongside vector search.</p>
      <p><b>Use AI as a partner:</b> ask <code>Compare memory of array-children vs HashMap-children tries for 100k English words, estimate in bytes</code> and check its arithmetic. Ask it to generate tests mixing words that are prefixes of each other (app/apple), empty prefix and missing letters.</p>
      <p><b>Where AI goes wrong:</b> <code>search</code> returning true for a prefix (forgot <code>isEnd</code>), autocomplete forgetting to include the prefix word itself, delete that removes nodes still used by longer words, and assuming lowercase input when the problem allows anything.</p>
      <p><b>What you must still own:</b> the decision trie vs HashSet vs sorted array + binary search, the memory estimate, and how to extend the node (counts, best-K lists, word index) to answer the follow-up question asked.</p>`,
    viz: {
      title: 'Trie insert, search and startsWith (letter tree)',
      input: 'car cat cart do dog | ca cart dot',
      inputLabel: 'words to insert | words to look up',
      gen: function (input) {
        var s = String(input === undefined ? '' : input).split('|');
        if (s.length !== 2) throw new Error('Format: words | queries, e.g. car cat cart | ca dot');
        function words(t, what) {
          var w = t.trim().split(/[\s,]+/).filter(function (x) { return x; });
          if (!w.length) throw new Error('Need at least one word for ' + what);
          if (w.length > 6) throw new Error('At most 6 words for ' + what + ' so the tree fits');
          w.forEach(function (x) { if (!/^[a-z]{1,6}$/.test(x)) throw new Error('Use lowercase letters a-z only, 1 to 6 letters per word ("' + x + '" is not ok)'); });
          return w;
        }
        var W = words(s[0], 'insert'), Q = words(s[1], 'queries');
        // final shape of the trie for a stable layout
        var kids = { '': [] }, depth = { '': 0 };
        W.forEach(function (w) {
          for (var i = 1; i <= w.length; i++) {
            var id = w.slice(0, i), par = w.slice(0, i - 1);
            if (!kids[id]) { kids[id] = []; depth[id] = i; kids[par].push(id); }
          }
        });
        Object.keys(kids).forEach(function (k) { kids[k].sort(); });
        var leaves = 0, X = {};
        (function count(id) { if (!kids[id].length) leaves++; kids[id].forEach(count); })('');
        var slot = 0;
        (function place(id) {
          if (!kids[id].length) { X[id] = (slot + 0.5) * 100 / leaves; slot++; return; }
          kids[id].forEach(place);
          X[id] = (X[kids[id][0]] + X[kids[id][kids[id].length - 1]]) / 2;
        })('');
        var maxD = 0; Object.keys(depth).forEach(function (k) { if (depth[k] > maxD) maxD = depth[k]; });
        var height = 8 + maxD * 11 + 8;
        var exists = { '': true }, isEnd = {}, frames = [];
        function graph(hl, label) {
          var nodes = [], edges = [], tags = {};
          Object.keys(exists).forEach(function (id) {
            nodes.push({ id: 'n' + id, label: id === '' ? '•' : id.charAt(id.length - 1), x: Math.max(3, Math.min(97, X[id])), y: 8 + depth[id] * 11 });
            if (id !== '') edges.push(['n' + id.slice(0, -1), 'n' + id]);
            if (isEnd[id]) tags['n' + id] = 'end';
          });
          var h = {};
          Object.keys(isEnd).forEach(function (id) { h['n' + id] = 'sel'; });
          Object.keys(hl || {}).forEach(function (id) { h['n' + id] = hl[id]; });
          return { type: 'graph', label: label || 'Trie (purple node + "end" tag = a word ends here)', directed: true, nodes: nodes, edges: edges, hl: h, tags: tags, height: height };
        }
        function wordArr(w, i, cls) { var o = {}; for (var k = 0; k < i; k++) o[k] = 'done'; if (i < w.length) o[i] = cls || 'cur'; return { type: 'array', label: 'word', values: w.split(''), hl: o, ptr: i < w.length ? one(i, 'i') : {} }; }
        frames.push({ narr: 'An empty trie is just a <b>root</b> node (•). Every word will be a path of letters going down from it.', parts: [graph({ '': 'cur' }), { type: 'vars', vals: { words: W.join(' '), queries: Q.join(' ') } }] });
        W.forEach(function (w) {
          var cur = '';
          for (var i = 0; i < w.length; i++) {
            var nx = cur + w.charAt(i), made = !exists[nx];
            exists[nx] = true;
            var hl = {}; hl[nx] = made ? 'ok' : 'cur';
            frames.push({ narr: 'insert("' + w + '"): letter <b>' + w.charAt(i) + '</b>. ' + (made ? 'No child for "' + w.charAt(i) + '" yet → <b>create</b> a new node.' : 'Child "' + w.charAt(i) + '" already exists (shared prefix "' + nx + '") → just walk down, nothing new to store.'), parts: [graph(hl), wordArr(w, i, made ? 'ok' : 'cur'), { type: 'vars', vals: { word: w, i: i, prefix: nx } }] });
            cur = nx;
          }
          isEnd[cur] = true;
          frames.push({ narr: 'Last letter reached → set <b>isEnd = true</b> on node "' + cur + '". That flag is what makes "' + cur + '" a real word and not just a prefix.', parts: [graph(one(cur, 'ok')), wordArr(w, w.length), { type: 'vars', vals: { word: w, isEnd: true } }] });
        });
        Q.forEach(function (q) {
          var cur = '', path = { '': 'win' };
          for (var i = 0; i < q.length; i++) {
            var nx = cur + q.charAt(i);
            if (!exists[nx]) {
              path[cur] = 'bad';
              frames.push({ narr: 'lookup("' + q + '"): node "' + (cur || 'root') + '" has <b>no child "' + q.charAt(i) + '"</b>. So no stored word starts with "' + nx + '" → search = <b>false</b>, startsWith = <b>false</b>.', parts: [graph(path), wordArr(q, i, 'bad'), { type: 'vars', vals: { query: q, search: false, startsWith: false } }] });
              return;
            }
            path[nx] = 'cur';
            frames.push({ narr: 'lookup("' + q + '"): letter <b>' + q.charAt(i) + '</b> found → walk down to "' + nx + '".', parts: [graph(path), wordArr(q, i), { type: 'vars', vals: { query: q, at: nx } }] });
            path[nx] = 'win';
            cur = nx;
          }
          var below = Object.keys(isEnd).filter(function (w) { return w.indexOf(cur) === 0; }).sort();
          path[cur] = isEnd[cur] ? 'ok' : 'cur';
          frames.push({ narr: 'All letters of "' + q + '" found. search("' + q + '") = isEnd = <b>' + !!isEnd[cur] + '</b>' + (isEnd[cur] ? ' (a word ends here).' : ' (it is only a prefix, no word ends here).') + ' startsWith("' + q + '") = <b>true</b>. Autocomplete would suggest: ' + below.join(', ') + '.', parts: [graph(path), wordArr(q, q.length), { type: 'vars', vals: { query: q, search: !!isEnd[cur], startsWith: true, suggestions: below.join(' ') }, hl: { search: isEnd[cur] ? 'ok' : 'bad', startsWith: 'ok' } }] });
        });
        return frames;
      }
    },
    problems: [
      {
        title: 'Implement Trie (Prefix Tree)',
        level: 'Medium',
        tags: ['trie', 'design', 'string'],
        statement: `<p>Implement a <code>Trie</code> class with:</p><ul><li><code>insert(String word)</code> — store the word.</li><li><code>search(String word)</code> — <code>true</code> if the exact word was inserted before.</li><li><code>startsWith(String prefix)</code> — <code>true</code> if any inserted word starts with <code>prefix</code>.</li></ul>`,
        constraints: `1 ≤ word.length, prefix.length ≤ 2000, only lowercase a–z, at most 3·10<sup>4</sup> calls in total.`,
        example: `${H.table(['call', 'output', 'why'], [
          ['insert("apple")', '-', 'stores a-p-p-l-e, marks "e" as end'],
          ['search("apple")', H.c('g', 'true'), 'path exists and isEnd at "e"'],
          ['search("app")', H.c('r', 'false'), 'path exists but no word ends at the second "p"'],
          ['startsWith("app")', H.c('g', 'true'), 'path exists — that is enough for a prefix'],
          ['insert("app")', '-', 'path already there, just set isEnd at the second "p"'],
          ['search("app")', H.c('g', 'true'), 'now a word ends there']
        ])}`,
        brute: {
          why: `<p>Keep all words in a list. <code>search</code> compares against every word, and <code>startsWith</code> runs a prefix test on every word → O(N·L) per call. With 3·10<sup>4</sup> words and calls that is about 10<sup>9</sup>+ character comparisons. Shared prefixes are compared again and again.</p>`,
          code: { lang: 'java', code: `
            class SlowTrie {
                private List<String> words = new ArrayList<>();

                public void insert(String word) { words.add(word); }

                public boolean search(String word) {
                    for (String w : words) if (w.equals(word)) return true;      // O(N·L)
                    return false;
                }

                public boolean startsWith(String prefix) {
                    for (String w : words) if (w.startsWith(prefix)) return true; // O(N·L)
                    return false;
                }
            }`, alt: [
          { lang: 'python', code: `class SlowTrie:
    def __init__(self):
        self.words = []

    def insert(self, word):
        self.words.append(word)

    def search(self, word):
        for w in self.words:
            if w == word:                            # O(N*L)
                return True
        return False

    def startsWith(self, prefix):
        for w in self.words:
            if w.startswith(prefix):                 # O(N*L)
                return True
        return False` },
          { lang: 'js', code: `class SlowTrie {
  constructor() { this.words = []; }

  insert(word) { this.words.push(word); }

  search(word) {
    for (const w of this.words) if (w === word) return true;         // O(N*L)
    return false;
  }

  startsWith(prefix) {
    for (const w of this.words) if (w.startsWith(prefix)) return true; // O(N*L)
    return false;
  }
}` },
          { lang: 'cpp', code: `class SlowTrie {
    vector<string> words;
public:
    void insert(string word) { words.push_back(word); }

    bool search(string word) {
        for (const string& w : words) if (w == word) return true;               // O(N*L)
        return false;
    }

    bool startsWith(string prefix) {
        for (const string& w : words) if (w.compare(0, prefix.size(), prefix) == 0) return true; // O(N*L)
        return false;
    }
};` },
          { lang: 'csharp', code: `class SlowTrie
{
    private List<string> words = new List<string>();

    public void Insert(string word) { words.Add(word); }

    public bool Search(string word)
    {
        foreach (string w in words) if (w == word) return true;                   // O(N*L)
        return false;
    }

    public bool StartsWith(string prefix)
    {
        foreach (string w in words) if (w.StartsWith(prefix, StringComparison.Ordinal)) return true; // O(N*L)
        return false;
    }
}` }
        ] }
        },
        mcq: {
          q: 'After inserting only "apple", what do search("app") and startsWith("app") return?',
          options: ['false and true', 'true and true', 'false and false', 'true and false'],
          answer: 0,
          explain: 'The path a-p-p exists (so startsWith is true), but the node for the second "p" has isEnd = false because no word ends there (so search is false).'
        },
        hints: [
          `<p>Words with the same beginning can <b>share</b> the same starting path. A word = a path from the root + an “end” flag on its last node.</p>`,
          `<p>Define <code>TrieNode { TrieNode[] child = new TrieNode[26]; boolean isEnd; }</code>. Index of letter <code>ch</code> is <code>ch - 'a'</code>. Write a helper <code>walk(s)</code> that returns the node at the end of the path, or <code>null</code> if a letter is missing.</p>`,
          `<p>Traps: <code>search</code> must check <code>isEnd</code> (a prefix is not a word); <code>startsWith</code> must NOT check it; inserting the same word twice should be harmless. Recipe: insert → for each char create-if-missing, move; set isEnd. search → node = walk(word); return node != null &amp;&amp; node.isEnd. startsWith → walk(prefix) != null.</p>`
        ],
        tests: { cls: 'Trie', sigs: { Trie: '', insert: 'string -> void', search: 'string -> bool', startsWith: 'string -> bool' }, cases: [
          { ops: ['Trie', 'insert', 'search', 'search', 'startsWith', 'insert', 'search'], args: [[], ['apple'], ['apple'], ['app'], ['app'], ['app'], ['app']], out: [null, null, true, false, true, null, true] },
          { ops: ['Trie', 'search', 'startsWith', 'insert', 'search', 'startsWith', 'search'], args: [[], ['a'], ['a'], ['a'], ['a'], ['a'], ['aa']], out: [null, false, false, null, true, true, false] },
          { ops: ['Trie', 'insert', 'insert', 'insert', 'search', 'startsWith', 'search', 'search', 'startsWith', 'startsWith'], args: [[], ['car'], ['cart'], ['cat'], ['ca'], ['ca'], ['cart'], ['carts'], ['cartz'], ['d']], out: [null, null, null, null, false, true, true, false, false, false] },
          { ops: ['Trie', 'insert', 'insert', 'search', 'search', 'startsWith', 'startsWith'], args: [[], ['abc'], ['abc'], ['abc'], ['ab'], ['abc'], ['abcd']], out: [null, null, null, true, false, true, false] },
          { ops: ['Trie', 'insert', 'insert', 'search', 'search', 'startsWith', 'search'], args: [[], ['zzz'], ['z'], ['zz'], ['z'], ['zz'], ['zzz']], out: [null, null, null, false, true, true, true] },
          { ops: ['Trie', 'insert', 'insert', 'insert', 'startsWith', 'search', 'search', 'startsWith', 'search'], args: [[], ['hello'], ['help'], ['world'], ['hel'], ['hel'], ['help'], ['wor'], ['word']], out: [null, null, null, null, true, false, true, true, false] },
          { ops: ['Trie', 'insert', 'search', 'search', 'startsWith', 'startsWith'], args: [[], [{ $rep: 'a', n: 2000 }], [{ $rep: 'a', n: 2000 }], [{ $rep: 'a', n: 1999 }], [{ $rep: 'a', n: 1999 }], [{ $concat: [{ $rep: 'a', n: 1999 }, 'b'] }]], out: [null, null, true, false, true, false] }
        ] },
        solution: {
          approach: `<p>26-way tree; shared helper walks a string down the tree.</p>`,
          code: `
            class TrieNode {
                TrieNode[] child = new TrieNode[26];  // child[c] = next node for letter 'a'+c
                boolean isEnd;                        // true if a word finishes at this node
            }

            class Trie {
                private final TrieNode root = new TrieNode();

                public void insert(String word) {
                    TrieNode cur = root;
                    for (int i = 0; i < word.length(); i++) {
                        int c = word.charAt(i) - 'a';
                        if (cur.child[c] == null) {
                            cur.child[c] = new TrieNode();   // create missing branch
                        }
                        cur = cur.child[c];                  // step down
                    }
                    cur.isEnd = true;                        // mark the word's last letter
                }

                public boolean search(String word) {
                    TrieNode node = walk(word);
                    return node != null && node.isEnd;       // must be a full word
                }

                public boolean startsWith(String prefix) {
                    return walk(prefix) != null;             // path existing is enough
                }

                // Follow s from the root; null if some letter is missing.
                private TrieNode walk(String s) {
                    TrieNode cur = root;
                    for (int i = 0; i < s.length(); i++) {
                        cur = cur.child[s.charAt(i) - 'a'];
                        if (cur == null) return null;
                    }
                    return cur;
                }

                public static void main(String[] args) {
                    Trie t = new Trie();
                    t.insert("apple");
                    System.out.println(t.search("apple"));    // true
                    System.out.println(t.search("app"));      // false
                    System.out.println(t.startsWith("app"));  // true
                    t.insert("app");
                    System.out.println(t.search("app"));      // true
                }
            }`,
          alt: [
            { lang: 'python', code: `class Trie:
    END = '$'                             # key that marks "a word ends here"

    def __init__(self):
        self.root = {}                    # each node is a dict: letter -> child node

    def insert(self, word):
        node = self.root
        for ch in word:
            node = node.setdefault(ch, {})  # create the branch if missing, then step down
        node[Trie.END] = True             # mark the word's last letter

    def search(self, word):
        node = self._walk(word)
        return node is not None and Trie.END in node   # must be a full word

    def startsWith(self, prefix):
        return self._walk(prefix) is not None          # path existing is enough

    def _walk(self, s):
        node = self.root
        for ch in s:
            node = node.get(ch)
            if node is None:
                return None               # some letter is missing
        return node
` },
            { lang: 'js', code: `class TrieNode {
  constructor() {
    this.child = new Map();               // letter -> TrieNode
    this.isEnd = false;                   // true if a word finishes here
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word) {
    let cur = this.root;
    for (const ch of word) {
      if (!cur.child.has(ch)) cur.child.set(ch, new TrieNode());  // create missing branch
      cur = cur.child.get(ch);
    }
    cur.isEnd = true;
  }

  search(word) {
    const node = this.walk(word);
    return node !== null && node.isEnd;   // must be a full word
  }

  startsWith(prefix) {
    return this.walk(prefix) !== null;    // path existing is enough
  }

  walk(s) {
    let cur = this.root;
    for (const ch of s) {
      cur = cur.child.get(ch);
      if (!cur) return null;
    }
    return cur;
  }
}
` },
            { lang: 'cpp', code: `struct TrieNode {
    array<unique_ptr<TrieNode>, 26> child;  // child[c] = next node for letter 'a' + c
    bool isEnd = false;                     // true if a word finishes here
};

class Trie {
    TrieNode root;

    // Follow s from the root; nullptr if some letter is missing.
    const TrieNode* walk(const string& s) const {
        const TrieNode* cur = &root;
        for (char ch : s) {
            cur = cur->child[ch - 'a'].get();
            if (!cur) return nullptr;
        }
        return cur;
    }

public:
    void insert(const string& word) {
        TrieNode* cur = &root;
        for (char ch : word) {
            auto& next = cur->child[ch - 'a'];
            if (!next) next = make_unique<TrieNode>();  // create missing branch
            cur = next.get();
        }
        cur->isEnd = true;
    }

    bool search(const string& word) const {
        const TrieNode* node = walk(word);
        return node && node->isEnd;       // must be a full word
    }

    bool startsWith(const string& prefix) const {
        return walk(prefix) != nullptr;   // path existing is enough
    }
};
` },
            { lang: 'csharp', code: `public class TrieNode
{
    public TrieNode[] child = new TrieNode[26];  // child[c] = next node for letter 'a'+c
    public bool isEnd;                           // true if a word finishes at this node
}

public class Trie
{
    private readonly TrieNode root = new TrieNode();

    public void Insert(string word)
    {
        TrieNode cur = root;
        for (int i = 0; i < word.Length; i++)
        {
            int c = word[i] - 'a';
            if (cur.child[c] == null)
            {
                cur.child[c] = new TrieNode();   // create missing branch
            }
            cur = cur.child[c];                  // step down
        }
        cur.isEnd = true;                        // mark the word's last letter
    }

    public bool Search(string word)
    {
        TrieNode node = Walk(word);
        return node != null && node.isEnd;       // must be a full word
    }

    public bool StartsWith(string prefix)
    {
        return Walk(prefix) != null;             // path existing is enough
    }

    // Follow s from the root; null if some letter is missing.
    private TrieNode Walk(string s)
    {
        TrieNode cur = root;
        for (int i = 0; i < s.Length; i++)
        {
            cur = cur.child[s[i] - 'a'];
            if (cur == null) return null;
        }
        return cur;
    }
}` }
          ],
          dry: {
            head: ['call', 'walk', 'node reached', 'isEnd there', 'returns'],
            rows: [
              ['insert("apple")', 'creates a, p, p, l, e', '"apple"', 'set to true', '-'],
              ['search("apple")', 'a → p → p → l → e', '"apple"', 'true', '<span class="c-g">true</span>'],
              ['search("app")', 'a → p → p', '"app"', 'false', '<span class="c-r">false</span>'],
              ['startsWith("app")', 'a → p → p', '"app" (not null)', 'not checked', '<span class="c-g">true</span>'],
              ['insert("app")', 'a → p → p (all exist, nothing created)', '"app"', 'set to true', '-'],
              ['search("app")', 'a → p → p', '"app"', 'true', '<span class="c-g">true</span>']
            ]
          },
          complexity: `<p><b>Time O(L)</b> per call, where L is the length of the word/prefix: one step per letter, each step is an array lookup. <b>Space O(total letters inserted × 26)</b> in the worst case (no shared prefixes); shared prefixes save a lot in practice.</p>`
        }
      }
    ]
  });

  // ================= TOPIC 8: Max XOR with a binary trie =================
  topics.push({
    title: 'Maximum XOR Pair (binary trie + greedy opposite bit)',
    analogy: `<p>You want a debate partner who <b>disagrees with you as much as possible</b>, and the questions have very different weights: question 1 is worth 16 points, question 2 is worth 8, then 4, 2, 1. Winning question 1 alone (16) beats winning all the others together (8 + 4 + 2 + 1 = 15)! So you <b>greedily</b> look for someone who disagrees on question 1 first; among those, someone who also disagrees on question 2; and so on.</p>
      <p>A <b>binary trie</b> is the seating chart that lets you find “who disagrees with me on this question” in one step.</p>`,
    explain: `<p><b>XOR refresher:</b> a bit of <code>x ^ y</code> is 1 exactly when the two bits are <b>different</b>.</p>
      ${H.bits(5, 5, { label: '5', hl: { 4: 'y', 3: 'y' } })}
      ${H.bits(25, 5, { label: '25', hl: { 4: 'y', 3: 'y' } })}
      ${H.bits(28, 5, { label: '5 ^ 25', hl: { 4: 'g', 3: 'g', 2: 'g' } })}
      <p><b>Key fact:</b> a 1 in a higher bit beats everything below it (16 &gt; 15). So to maximise <code>x ^ y</code>, make the <b>highest bit</b> differ if at all possible, then the next one, and so on — a greedy choice that is always safe.</p>
      <h4>Binary trie</h4>
      <p>Insert every number as its bits from the highest (bit 30 for non-negative 32-bit <code>int</code>s) down to bit 0. Each node has just 2 children: <code>[0]</code> and <code>[1]</code>. A root-to-leaf path spells a number.</p>
      <h4>Query for the best partner of x</h4>
      <p>Walk down from the top bit. At bit <code>b</code>, x has bit <code>t</code>. We <b>want</b> the opposite bit <code>1 - t</code>:</p>
      <ul><li>If that child exists → go there, and this bit of the XOR becomes ${H.c('g', '1')}.</li><li>Otherwise → we are forced to take the same bit; this XOR bit is ${H.c('r', '0')}.</li></ul>
      ${H.table(['bit', 'x = 5 bit', 'want', 'trie has it?', 'xor bit'], [
        ['4 (16)', '0', '1', H.c('g', 'yes (25)'), '1'],
        ['3 (8)', '0', '1', H.c('g', 'yes'), '1'],
        ['2 (4)', '1', '0', H.c('g', 'yes'), '1'],
        ['1 (2)', '0', '1', H.c('r', 'no → take 0'), '0'],
        ['0 (1)', '1', '0', H.c('r', 'no → take 1'), '0']
      ])}
      <p>Result 11100₂ = ${H.c('p', '28')}. Do this query for every x and keep the maximum: <b>O(N · B)</b> with B = 31 bits, instead of O(N<sup>2</sup>) for checking all pairs.</p>
      <p><b>Offline trick</b> (for queries like “max XOR with an element ≤ m”): sort the numbers and the queries by m, and insert numbers into the trie only when they become allowed.</p>`,
    clues: [
      '"<b>Maximum XOR</b> of two numbers / of a pair / with an element" → binary trie + greedy opposite bit.',
      'N up to 10<sup>5</sup> or more → all pairs O(N<sup>2</sup>) is too slow; trie gives O(N · 31).',
      '"Max XOR <b>subarray</b>" → prefix XORs (x ^ y of two prefixes) + the same trie.',
      '"Max XOR with an element ≤ m" for many queries → sort queries by m, insert numbers <b>offline</b> as m grows.',
      'Any "make the high bits differ / match" question → think bit by bit from the top, greedy works because 2<sup>b</sup> &gt; 2<sup>b-1</sup> + … + 1.'
    ],
    code: { lang: 'java', code: `
      // Maximum XOR of a SUBARRAY: prefix XOR p[j] ^ p[i] = xor of a[i..j-1].
      // Insert prefixes into a binary trie and ask each new prefix for its best partner.
      int maxSubarrayXor(int[] a) {
          int[][] trie = new int[(a.length + 1) * 31 + 1][2];  // flat trie: node -> {child0, child1}, 0 = none
          int nodes = 1, best = 0, pref = 0;
          // insert prefix 0 (the empty prefix) so subarrays starting at index 0 count
          int cur = 0;
          for (int b = 30; b >= 0; b--) { trie[cur][0] = trie[cur][0] == 0 ? nodes++ : trie[cur][0]; cur = trie[cur][0]; }
          for (int x : a) {
              pref ^= x;
              // query: greedily take the opposite bit
              int q = 0, xr = 0;
              for (int b = 30; b >= 0; b--) {
                  int bit = (pref >> b) & 1;
                  if (trie[q][bit ^ 1] != 0) { xr |= 1 << b; q = trie[q][bit ^ 1]; }
                  else q = trie[q][bit];
              }
              best = Math.max(best, xr);
              // insert pref
              int t = 0;
              for (int b = 30; b >= 0; b--) {
                  int bit = (pref >> b) & 1;
                  if (trie[t][bit] == 0) trie[t][bit] = nodes++;
                  t = trie[t][bit];
              }
          }
          return best;
      }`, alt: [
      { lang: 'python', run: true, code: `# Maximum XOR of a SUBARRAY: prefix XOR p[j] ^ p[i] = xor of a[i..j-1].
# Insert prefixes into a binary trie and ask each new prefix for its best partner.
def max_subarray_xor(a, top=30):
    kids = [[0, 0]]                       # flat trie: node -> [child0, child1]; 0 = none

    def insert(v):
        node = 0
        for b in range(top, -1, -1):
            bit = (v >> b) & 1
            if not kids[node][bit]:
                kids[node][bit] = len(kids)
                kids.append([0, 0])
            node = kids[node][bit]

    insert(0)                             # the empty prefix, so subarrays starting at 0 count
    best = pref = 0
    for x in a:
        pref ^= x
        node = xr = 0
        for b in range(top, -1, -1):      # query: greedily take the opposite bit
            bit = (pref >> b) & 1
            if kids[node][bit ^ 1]:
                xr |= 1 << b
                node = kids[node][bit ^ 1]
            else:
                node = kids[node][bit]
        best = max(best, xr)
        insert(pref)
    return best


print(max_subarray_xor([1, 2, 3, 4]))     # 7
` },
      { lang: 'js', run: true, code: `// Maximum XOR of a SUBARRAY: prefix XOR p[j] ^ p[i] = xor of a[i..j-1].
function maxSubarrayXor(a) {
  const kids = new Int32Array(((a.length + 1) * 31 + 1) * 2);   // flat trie: node*2 + bit -> child
  let nodes = 1;
  const insert = (v) => {
    let cur = 0;
    for (let b = 30; b >= 0; b--) {
      const bit = (v >> b) & 1;
      if (!kids[cur * 2 + bit]) kids[cur * 2 + bit] = nodes++;
      cur = kids[cur * 2 + bit];
    }
  };
  insert(0);                              // the empty prefix
  let best = 0, pref = 0;
  for (const x of a) {
    pref ^= x;
    let cur = 0, xr = 0;
    for (let b = 30; b >= 0; b--) {       // query: greedily take the opposite bit
      const want = ((pref >> b) & 1) ^ 1;
      if (kids[cur * 2 + want]) { xr |= 1 << b; cur = kids[cur * 2 + want]; }
      else cur = kids[cur * 2 + (want ^ 1)];
    }
    best = Math.max(best, xr);
    insert(pref);
  }
  return best;
}

console.log(maxSubarrayXor([1, 2, 3, 4]));   // 7
` },
      { lang: 'cpp', code: `// Maximum XOR of a SUBARRAY: prefix XOR p[j] ^ p[i] = xor of a[i..j-1].
int maxSubarrayXor(const vector<int>& a) {
    vector<array<int, 2>> kids(1, {0, 0});    // flat trie: node -> {child0, child1}, 0 = none
    auto insert = [&](int v) {
        int cur = 0;
        for (int b = 30; b >= 0; b--) {
            int bit = (v >> b) & 1;
            if (!kids[cur][bit]) { kids[cur][bit] = (int)kids.size(); kids.push_back({0, 0}); }
            cur = kids[cur][bit];
        }
    };
    insert(0);                                // the empty prefix
    int best = 0, pref = 0;
    for (int x : a) {
        pref ^= x;
        int cur = 0, xr = 0;
        for (int b = 30; b >= 0; b--) {       // query: greedily take the opposite bit
            int bit = (pref >> b) & 1;
            if (kids[cur][bit ^ 1]) { xr |= 1 << b; cur = kids[cur][bit ^ 1]; }
            else cur = kids[cur][bit];
        }
        best = max(best, xr);
        insert(pref);
    }
    return best;
}
` },
      { lang: 'csharp', code: `// Maximum XOR of a SUBARRAY: prefix XOR p[j] ^ p[i] = xor of a[i..j-1].
// Insert prefixes into a binary trie and ask each new prefix for its best partner.
int MaxSubarrayXor(int[] a)
{
    int[,] trie = new int[(a.Length + 1) * 31 + 1, 2];  // flat trie: node -> {child0, child1}, 0 = none
    int nodes = 1, best = 0, pref = 0;
    // insert prefix 0 (the empty prefix) so subarrays starting at index 0 count
    int cur = 0;
    for (int b = 30; b >= 0; b--) { if (trie[cur, 0] == 0) trie[cur, 0] = nodes++; cur = trie[cur, 0]; }
    foreach (int x in a)
    {
        pref ^= x;
        // query: greedily take the opposite bit
        int q = 0, xr = 0;
        for (int b = 30; b >= 0; b--)
        {
            int bit = (pref >> b) & 1;
            if (trie[q, bit ^ 1] != 0) { xr |= 1 << b; q = trie[q, bit ^ 1]; }
            else q = trie[q, bit];
        }
        best = Math.Max(best, xr);
        // insert pref
        int t = 0;
        for (int b = 30; b >= 0; b--)
        {
            int bit = (pref >> b) & 1;
            if (trie[t, bit] == 0) trie[t, bit] = nodes++;
            t = trie[t, bit];
        }
    }
    return best;
}` }
    ] },
    codeTitle: 'Variation: maximum XOR subarray with a flat-array binary trie',
    examples: [
      {
        title: 'Max XOR of [8, 1, 2, 12]',
        html: `${H.bits(8, 4, { label: '8' })}${H.bits(1, 4, { label: '1' })}${H.bits(2, 4, { label: '2' })}${H.bits(12, 4, { label: '12' })}
          <p>Query 2 (0010): bit 3 want 1 → 8 or 12; bit 2: 2 has 0, want 1 → 12; bits 1 and 0 forced → partner 12, 2 ^ 12 = 1110 = ${H.c('p', '14')}. Query 1 (0001): → 12 too, 1 ^ 12 = 13. Answer ${H.c('p', '14')}.</p>`
      },
      {
        title: 'Maximum XOR subarray of [1, 2, 3, 4]',
        html: `${H.table(['j', 'a[j]', 'prefix p', 'best partner among earlier prefixes', 'xor'], [
            ['-', '-', '0', '-', '-'], ['0', '1', '1', '0', '1'], ['1', '2', '3', '0', '3'], ['2', '3', '0', '3', '3'], ['3', '4', '4', '3', H.c('p', '7')]
          ])}
          <p>p = 4 vs earlier prefix 3 → 4 ^ 3 = 7 = XOR of a[2..3] = 3 ^ 4 = ${H.c('p', '7')}. Same trie, but we insert prefix XORs instead of the numbers.</p>`
      },
      {
        title: 'Offline queries: max XOR with an element ≤ m',
        html: `<p>nums = [0, 1, 2, 3, 4], queries (x, m) = (3, 1), (1, 3), (5, 6). Sort nums; sort queries by m. For (3, 1) insert 0, 1 → best 3 ^ 0 = ${H.c('p', '3')}. For (1, 3) also insert 2, 3 → best 1 ^ 2 = ${H.c('p', '3')}. For (5, 6) insert 4 → best 5 ^ 2 = ${H.c('p', '7')}. If no number is allowed yet, the answer is -1. Each number is inserted once: O((N + Q) · 31 + sorting).</p>`
      }
    ],
    deepDive: `<p><b>Why greedy is correct:</b> bit b contributes 2<sup>b</sup>, while all lower bits together contribute at most 2<sup>b</sup> - 1. So any partner that makes bit b of the XOR equal to 1 beats every partner that does not, regardless of lower bits. Walking down the trie, the set of numbers below the current node is exactly the set of candidates that agree with the decisions made so far; taking the opposite branch whenever it exists is therefore optimal at each level.</p>
      <p><b>Bit width:</b> for non-negative 32-bit ints (Java/C++ <code>int</code>, JS bit operators) use bits 30..0 (bit 31 is the sign bit and is 0). Python ints have no fixed width, so <code>max(nums).bit_length()</code> tells you how many bits to walk. For values up to 10<sup>9</sup>, 30 bits suffice (2<sup>30</sup> ≈ 1.07·10<sup>9</sup>). For <code>long</code> use 62..0. If negatives can appear, shift every value by adding 2<sup>31</sup> (as long) or treat the sign bit carefully, because two's complement flips its meaning.</p>
      <p><b>Memory:</b> object nodes with <code>TrieNode[2]</code> cost ~32+ bytes each; N = 2·10<sup>5</sup> numbers × 31 levels ≈ 6.2 million nodes → hundreds of MB. The <b>flat array</b> (<code>int[nodes][2]</code> or two <code>int[]</code> arrays) shown in the code tab is the safe choice. An alternative with no trie at all builds the answer bit by bit using a HashSet of prefixes (<code>(x &gt;&gt; b)</code>) and the identity a ^ b = c ⇔ a ^ c = b — also O(N · 31).</p>
      <p><b>Deletions:</b> keep a <code>count</code> per node (how many numbers pass through) and decrement on delete; during a query treat a child with count 0 as missing. This supports sliding windows and “max XOR with a range of elements”. A <b>persistent</b> binary trie (new path per insert, sharing the rest) answers “max XOR with any element in a[l..r]” online.</p>`,
    aiEra: `<p><b>What AI changes:</b> the binary trie trick is well known to models, so recall is not the bottleneck. What interviewers probe is whether you can <b>explain</b> why greedy works (the 2<sup>b</sup> &gt; sum of lower bits argument) and adapt the structure: prefix XORs, offline sorting, deletions with counts, memory limits.</p>
      <p><b>Use AI as a partner:</b> ask it for the brute-force O(N<sup>2</sup>) checker and a random test harness, then compare with your trie on thousands of arrays. Ask <code>estimate memory for 2e5 numbers in an object-based binary trie in Java</code> to see why flat arrays matter.</p>
      <p><b>Where AI goes wrong:</b> starting at bit 31 and mishandling the sign, using <code>1 &lt;&lt; b</code> with <code>long</code> values (needs <code>1L</code>), querying before inserting anything (null child), and forgetting the empty prefix 0 in the subarray variant.</p>
      <p><b>What you must still own:</b> thinking in bits from the top, the exchange-style proof, and choosing between trie, HashSet-prefix method and brute force based on N and memory.</p>`,
    viz: {
      title: 'Max XOR: greedy walk, bit by bit',
      input: '3 10 5 25 2 8',
      inputLabel: 'numbers 0..63 (2 to 8 of them)',
      gen: function (input) {
        var a = parseNums(input, 2, 8, 0, 63, 'the numbers');
        var mx = Math.max.apply(null, a), W = 3;
        while ((1 << W) <= mx) W++;
        var frames = [], best = -1, bestPair = '-';
        var listHtml = a.map(function (v) { return H.bits(v, W, { label: String(v) }); }).join('');
        var tkids = { '': [] }, tdepth = { '': 0 }, tleaf = {};
        a.forEach(function (v) {
          var s2 = '';
          for (var bb = W - 1; bb >= 0; bb--) {
            var id = s2 + ((v >> bb) & 1);
            if (!tkids[id]) { tkids[id] = []; tdepth[id] = W - bb; tkids[s2].push(id); }
            s2 = id;
          }
          tleaf[s2] = (tleaf[s2] !== undefined ? tleaf[s2] + ',' : '') + v;
        });
        Object.keys(tkids).forEach(function (k) { tkids[k].sort(); });
        var tl = 0, TX = {}, ts = 0;
        (function cnt(id) { if (!tkids[id].length) tl++; tkids[id].forEach(cnt); })('');
        (function place(id) {
          if (!tkids[id].length) { TX[id] = (ts + 0.5) * 100 / tl; ts++; return; }
          tkids[id].forEach(place);
          TX[id] = (TX[tkids[id][0]] + TX[tkids[id][tkids[id].length - 1]]) / 2;
        })('');
        var TH = 12 + W * 10 + 6;
        // draw the binary trie; path = list of prefix ids from the root, last one gets endCls
        function trieGraph(path, endCls, label) {
          var nodes = [], edges = [], hl = {}, tags = {}, eh = {};
          Object.keys(tkids).forEach(function (id) {
            nodes.push({ id: 'b' + id, label: id === '' ? '•' : id.charAt(id.length - 1), x: Math.max(3, Math.min(97, TX[id])), y: 6 + tdepth[id] * 10 });
            if (id !== '') edges.push(['b' + id.slice(0, -1), 'b' + id]);
            if (tleaf[id] !== undefined) tags['b' + id] = tleaf[id];
          });
          (path || []).forEach(function (id, k) {
            hl['b' + id] = k === path.length - 1 ? (endCls || 'cur') : 'win';
            if (id !== '') eh['b' + id.slice(0, -1) + '-b' + id] = k === path.length - 1 ? (endCls || 'cur') : 'win';
          });
          return { type: 'graph', label: label || 'Binary trie (left child = bit 0, right child = bit 1, leaf tag = the number)', directed: true, height: TH, nodes: nodes, edges: edges, hl: hl, ehl: eh, tags: tags };
        }
        frames.push({ narr: 'Every number is inserted into a <b>binary trie</b>, highest bit first. With max value ' + mx + ' we only need <b>' + W + ' bits</b> (bit ' + (W - 1) + ' down to bit 0). Real code uses bits 30..0; the extra leading bits are 0 for everyone, so they change nothing.', parts: [trieGraph([''], 'cur'), { type: 'text', label: 'numbers in the trie (as bit paths)', html: listHtml }, { type: 'vars', vals: { bits: W, numbers: a.length } }] });
        a.forEach(function (x) {
          var cand = a.slice(), xr = 0, partnerPrefix = 0, pstr = '', pids = [''];
          for (var b = W - 1; b >= 0; b--) {
            var t = (x >> b) & 1, want = 1 - t;
            var withWant = cand.filter(function (c) { return ((c >> b) & 1) === want; });
            var got, good;
            if (withWant.length) { cand = withWant; got = want; good = true; xr |= (1 << b); }
            else { cand = cand.filter(function (c) { return ((c >> b) & 1) === t; }); got = t; good = false; }
            partnerPrefix |= (got << b);
            pstr += got; pids.push(pstr);
            var hlc = {}; cand.forEach(function (c) { hlc[String(c)] = good ? 'ok' : 'cur'; });
            frames.push({
              narr: 'x = ' + x + ', bit ' + b + ' (worth ' + (1 << b) + '): x has <b>' + t + '</b>, we want the opposite <b>' + want + '</b>. ' + (good ? '<span class="c-g">The trie has a branch ' + want + '</span> → take it, this XOR bit becomes 1.' : '<span class="c-r">No branch ' + want + ' on this path</span> → forced to take ' + t + ', this XOR bit is 0.'),
              parts: [
                trieGraph(pids.slice(), good ? 'ok' : 'bad'),
                { type: 'bits', label: 'x = ' + x, value: x, width: W, hl: one(b, 'cur'), ptr: one(b, 'b') },
                { type: 'bits', label: 'path taken in trie (partner so far)', value: partnerPrefix, width: W, hl: one(b, good ? 'ok' : 'bad'), dec: 'bits ' + (W - 1) + '..' + b + ' chosen' },
                { type: 'bits', label: 'x XOR partner (so far)', value: xr, width: W, hl: one(b, good ? 'ok' : 'bad') },
                { type: 'set', label: 'numbers still on this trie path', items: cand.map(String), hl: hlc },
                { type: 'vars', vals: { bit: b, 'x bit': t, want: want, took: got, 'best so far': best < 0 ? '-' : best } }
              ]
            });
          }
          var isBest = xr > best;
          if (isBest) { best = xr; bestPair = x + ' ^ ' + cand[0]; }
          frames.push({ narr: 'Best partner for ' + x + ' is <b>' + cand[0] + '</b>: ' + x + ' ^ ' + cand[0] + ' = <b>' + xr + '</b>. ' + (isBest ? '<span class="c-g">New overall best!</span>' : 'Not better than the best ' + best + '.'), parts: [
            trieGraph(pids.slice(), 'sel', 'Greedy path for x = ' + x + ' ends at leaf ' + cand[0]),
            { type: 'bits', label: 'x = ' + x, value: x, width: W },
            { type: 'bits', label: 'partner = ' + cand[0], value: cand[0], width: W },
            { type: 'bits', label: 'x XOR partner', value: xr, width: W, hl: (function () { var o = {}; for (var k = 0; k < W; k++) if ((xr >> k) & 1) o[k] = 'ok'; return o; })() },
            { type: 'vars', vals: { 'best XOR': best, pair: bestPair }, hl: isBest ? { 'best XOR': 'sel' } : {} }
          ] });
        });
        frames.push({ narr: 'Done: every number asked the trie for its best partner. Maximum XOR = <b>' + best + '</b> (' + bestPair + '). Work = N numbers × ' + W + ' bits, not N × N pairs.', parts: [{ type: 'vars', vals: { answer: best, pair: bestPair }, hl: { answer: 'sel' } }, { type: 'bits', label: 'answer', value: best, width: W, hl: (function () { var o = {}; for (var k = 0; k < W; k++) if ((best >> k) & 1) o[k] = 'sel'; return o; })() }] });
        return frames;
      }
    },
    problems: [
      {
        title: 'Maximum XOR of Two Numbers in an Array',
        level: 'Medium',
        tags: ['binary trie', 'bit manipulation', 'greedy'],
        statement: `<p>Given an integer array <code>nums</code>, return the maximum value of <code>nums[i] ^ nums[j]</code> over all <code>0 ≤ i ≤ j &lt; n</code>.</p>`,
        constraints: `1 ≤ N ≤ 2·10<sup>5</sup>, 0 ≤ nums[i] ≤ 2<sup>31</sup> - 1`,
        example: `${H.arr([3, 10, 5, 25, 2, 8], { label: 'nums', hl: { 2: 'p', 3: 'p' } })}
          ${H.bits(5, 5, { label: '5' })}${H.bits(25, 5, { label: '25' })}${H.bits(28, 5, { label: '5^25', hl: { 4: 'g', 3: 'g', 2: 'g' } })}
          <p>Output ${H.c('p', '28')}. <b>Why:</b> 5 and 25 differ in the three highest bits (16 + 8 + 4 = 28). No pair can turn on bit 4 and bit 3 and bit 2 together any better.</p>`,
        brute: {
          why: `<p>Check every pair: N·(N-1)/2 ≈ 2·10<sup>10</sup> XORs for N = 2·10<sup>5</sup> → far too slow. The waste: for each x we look at every y, although only the y with the most opposite high bits matters.</p>`,
          code: { lang: 'java', code: `
            int findMaximumXOR(int[] nums) {
                int best = 0;
                for (int i = 0; i < nums.length; i++)
                    for (int j = i; j < nums.length; j++)
                        best = Math.max(best, nums[i] ^ nums[j]);   // O(N^2) pairs
                return best;
            }`, alt: [
          { lang: 'python', code: `def find_maximum_xor(nums):
    best = 0
    for i in range(len(nums)):
        for j in range(i, len(nums)):
            best = max(best, nums[i] ^ nums[j])      # O(N^2) pairs
    return best` },
          { lang: 'js', code: `function findMaximumXOR(nums) {
  let best = 0;
  for (let i = 0; i < nums.length; i++)
    for (let j = i; j < nums.length; j++)
      best = Math.max(best, nums[i] ^ nums[j]);      // O(N^2) pairs
  return best;
}` },
          { lang: 'cpp', code: `int findMaximumXOR(vector<int> nums) {
    int best = 0;
    for (int i = 0; i < (int)nums.size(); i++)
        for (int j = i; j < (int)nums.size(); j++)
            best = max(best, nums[i] ^ nums[j]);     // O(N^2) pairs
    return best;
}` },
          { lang: 'csharp', code: `int FindMaximumXOR(int[] nums)
{
    int best = 0;
    for (int i = 0; i < nums.Length; i++)
        for (int j = i; j < nums.Length; j++)
            best = Math.Max(best, nums[i] ^ nums[j]);   // O(N^2) pairs
    return best;
}` }
        ] }
        },
        mcq: {
          q: 'x = 01010₂. At the top bit the trie has only a 0-branch, at the next bit both branches exist. What do you do?',
          options: ['Take 0 at the top bit (forced), then take 0 at the next bit because x has 1 there', 'Stop: the answer cannot use this x', 'Take 1 at the next bit to match x', 'Go back and try the other branch at the top bit'],
          answer: 0,
          explain: 'At the top bit x has 0 and we want 1, but only 0 exists, so we are forced. At the next bit x has 1, we want 0 and it exists, so we take it and that XOR bit is 1. Greedy never needs to go back because a higher bit is worth more than all lower bits together.'
        },
        hints: [
          `<p>Bit <code>b</code> is worth 2<sup>b</sup>, which is more than all lower bits combined (2<sup>b</sup> - 1). So, from the highest bit down, always try to make the XOR bit 1 — that greedy choice is never wrong.</p>`,
          `<p>Build a binary trie: node with <code>child[2]</code>. Insert each number from bit 30 down to 0. For each x, walk down preferring the child <code>1 - bit</code>; if missing, take <code>bit</code>. Add <code>1 &lt;&lt; b</code> to the XOR whenever you got the opposite bit.</p>`,
          `<p>Traps: use bit 30 as the top for non-negative ints (bit 31 is the sign); insert <b>all</b> numbers before querying (or insert-then-query each, both work since x ^ x = 0 is harmless); single-element array → answer 0. Recipe: insert all; best = 0; for x: node = root, xr = 0; for b = 30..0: t = bit, if node.child[1-t] → xr |= 1&lt;&lt;b, go there; else go child[t]. best = max(best, xr).</p>`
        ],
        tests: { sig: 'int[] -> int', fn: 'findMaximumXOR', cases: [
          [[[3, 10, 5, 25, 2, 8]], 28],
          [[[0]], 0],
          [[[14, 70, 53, 83, 49, 91, 36, 80, 92, 51, 66, 70]], 127],
          [[[2147483647, 0]], 2147483647],
          [[[2147483647, 1073741824]], 1073741823],
          [[[8, 1, 2, 12]], 14],
          [[[5, 5]], 0],
          [[{ $range: [0, 100000] }], 131071]
        ] },
        solution: {
          approach: `<p>Binary trie of all numbers; greedy query per number.</p>`,
          code: `
            class TrieNode {
                TrieNode[] child = new TrieNode[2];   // child[0] = bit 0, child[1] = bit 1
            }

            class Solution {
                private static final int TOP = 30;    // highest bit for non-negative int

                public int findMaximumXOR(int[] nums) {
                    TrieNode root = new TrieNode();
                    // 1) insert every number, highest bit first
                    for (int x : nums) {
                        TrieNode cur = root;
                        for (int b = TOP; b >= 0; b--) {
                            int bit = (x >> b) & 1;
                            if (cur.child[bit] == null) cur.child[bit] = new TrieNode();
                            cur = cur.child[bit];
                        }
                    }
                    // 2) for every number, greedily walk towards opposite bits
                    int best = 0;
                    for (int x : nums) {
                        TrieNode cur = root;
                        int xr = 0;
                        for (int b = TOP; b >= 0; b--) {
                            int bit = (x >> b) & 1;
                            int want = bit ^ 1;                   // opposite bit
                            if (cur.child[want] != null) {
                                xr |= (1 << b);                   // this XOR bit becomes 1
                                cur = cur.child[want];
                            } else {
                                cur = cur.child[bit];             // forced: same bit, XOR bit 0
                            }
                        }
                        best = Math.max(best, xr);
                    }
                    return best;
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().findMaximumXOR(new int[]{3, 10, 5, 25, 2, 8})); // 28
                }
            }`,
          alt: [
            { lang: 'python', code: `def find_maximum_xor(nums):
    top = max(nums).bit_length()          # only as many bits as the biggest number needs
    kids = [[0, 0]]                       # flat trie: node -> [child for bit 0, child for bit 1]; 0 = none
    for x in nums:                        # 1) insert every number, highest bit first
        node = 0
        for b in range(top - 1, -1, -1):
            bit = (x >> b) & 1
            if not kids[node][bit]:
                kids[node][bit] = len(kids)
                kids.append([0, 0])
            node = kids[node][bit]
    best = 0
    for x in nums:                        # 2) greedy walk towards opposite bits
        node = xr = 0
        for b in range(top - 1, -1, -1):
            bit = (x >> b) & 1
            if kids[node][bit ^ 1]:
                xr |= 1 << b              # this XOR bit becomes 1
                node = kids[node][bit ^ 1]
            else:
                node = kids[node][bit]    # forced: same bit
        best = max(best, xr)
    return best
` },
            { lang: 'js', code: `function findMaximumXOR(nums) {
  const TOP = 30;                                         // highest bit for non-negative 32-bit ints
  const kids = new Int32Array((nums.length * 31 + 1) * 2); // flat trie: node*2 + bit -> child, 0 = none
  let nodes = 1;
  for (const x of nums) {                                 // 1) insert every number
    let cur = 0;
    for (let b = TOP; b >= 0; b--) {
      const bit = (x >> b) & 1;
      if (!kids[cur * 2 + bit]) kids[cur * 2 + bit] = nodes++;
      cur = kids[cur * 2 + bit];
    }
  }
  let best = 0;
  for (const x of nums) {                                 // 2) greedy opposite-bit walk
    let cur = 0, xr = 0;
    for (let b = TOP; b >= 0; b--) {
      const want = ((x >> b) & 1) ^ 1;
      if (kids[cur * 2 + want]) { xr |= 1 << b; cur = kids[cur * 2 + want]; }
      else cur = kids[cur * 2 + (want ^ 1)];
    }
    best = Math.max(best, xr);
  }
  return best;
}
` },
            { lang: 'cpp', code: `class Solution {
public:
    int findMaximumXOR(vector<int>& nums) {
        const int TOP = 30;                       // highest bit for non-negative int
        vector<array<int, 2>> kids(1, {0, 0});    // flat trie: node -> {child0, child1}, 0 = none
        for (int x : nums) {                      // 1) insert every number
            int cur = 0;
            for (int b = TOP; b >= 0; b--) {
                int bit = (x >> b) & 1;
                if (!kids[cur][bit]) {
                    kids[cur][bit] = (int)kids.size();
                    kids.push_back({0, 0});
                }
                cur = kids[cur][bit];
            }
        }
        int best = 0;
        for (int x : nums) {                      // 2) greedy opposite-bit walk
            int cur = 0, xr = 0;
            for (int b = TOP; b >= 0; b--) {
                int bit = (x >> b) & 1;
                if (kids[cur][bit ^ 1]) { xr |= 1 << b; cur = kids[cur][bit ^ 1]; }
                else cur = kids[cur][bit];
            }
            best = max(best, xr);
        }
        return best;
    }
};
` },
            { lang: 'csharp', code: `using System;

public class TrieNode
{
    public TrieNode[] child = new TrieNode[2];   // child[0] = bit 0, child[1] = bit 1
}

public class Solution
{
    private const int TOP = 30;    // highest bit for non-negative int

    public int FindMaximumXOR(int[] nums)
    {
        var root = new TrieNode();
        // 1) insert every number, highest bit first
        foreach (int x in nums)
        {
            TrieNode cur = root;
            for (int b = TOP; b >= 0; b--)
            {
                int bit = (x >> b) & 1;
                if (cur.child[bit] == null) cur.child[bit] = new TrieNode();
                cur = cur.child[bit];
            }
        }
        // 2) for every number, greedily walk towards opposite bits
        int best = 0;
        foreach (int x in nums)
        {
            TrieNode cur = root;
            int xr = 0;
            for (int b = TOP; b >= 0; b--)
            {
                int bit = (x >> b) & 1;
                int want = bit ^ 1;                   // opposite bit
                if (cur.child[want] != null)
                {
                    xr |= (1 << b);                   // this XOR bit becomes 1
                    cur = cur.child[want];
                }
                else
                {
                    cur = cur.child[bit];             // forced: same bit, XOR bit 0
                }
            }
            best = Math.Max(best, xr);
        }
        return best;
    }
}` }
          ],
          dry: {
            head: ['x', 'binary (5 low bits)', 'greedy path ends at', 'x ^ partner', 'best'],
            rows: [
              ['3', '00011', '25 (11001)', '11010 = 26', '26'],
              ['10', '01010', '25 (11001)', '10011 = 19', '26'],
              ['5', '00101', '25 (11001)', '11100 = 28', '<span class="c-g">28</span>'],
              ['25', '11001', '5 (00101)', '11100 = 28', '28'],
              ['2', '00010', '25 (11001)', '11011 = 27', '28'],
              ['8', '01000', '25 (11001)', '10001 = 17', '<span class="c-p">28</span>']
            ]
          },
          complexity: `<p><b>Time O(N · 31):</b> each number is inserted with 31 steps and queried with 31 steps — linear in N. <b>Space O(N · 31)</b> trie nodes in the worst case (each number adds at most 31 new nodes).</p>`
        }
      }
    ]
  });

  // ================= PRACTICE: Easy =================
  practice.push({
    title: 'Kth Largest Element in a Stream',
    level: 'Easy',
    tags: ['heap', 'top-k', 'design', 'stream'],
    companies: ['Amazon', 'Meta', 'Adobe'],
    statement: `<p>Design a class <code>KthLargest(int k, int[] nums)</code> with a method <code>add(int val)</code> that inserts <code>val</code> into the stream and returns the <b>k-th largest</b> element seen so far (counting duplicates).</p>`,
    constraints: `1 ≤ k ≤ 10<sup>4</sup>, 0 ≤ nums.length ≤ 10<sup>4</sup>, up to 10<sup>4</sup> calls to add, -10<sup>4</sup> ≤ val ≤ 10<sup>4</sup>; when add is called there are at least k elements.`,
    example: `<p>k = 3, nums = [4, 5, 8, 2]. add(3) → ${H.c('p', '4')}, add(5) → ${H.c('p', '5')}, add(10) → 5, add(9) → 8, add(4) → 8.</p>
      <p><b>Why:</b> after add(3) the values are 2, 3, 4, 5, 8; the three largest are 8, 5, ${H.c('p', '4')} → 4. After add(5): 8, 5, ${H.c('p', '5')} → 5.</p>`,
    brute: {
      why: `<p>Keep every value in a list and sort on every add: O(N log N) per call, 10<sup>4</sup> calls on a growing list → around 10<sup>9</sup> operations. We keep re-sorting values that can never be the answer again (anything below the current k-th largest).</p>`,
      code: { lang: 'java', code: `
        class KthLargestSlow {
            private final List<Integer> all = new ArrayList<>();
            private final int k;

            KthLargestSlow(int k, int[] nums) {
                this.k = k;
                for (int x : nums) all.add(x);
            }

            int add(int val) {
                all.add(val);
                Collections.sort(all);              // full sort each call
                return all.get(all.size() - k);
            }
        }`, alt: [
          { lang: 'python', code: `class KthLargestSlow:
    def __init__(self, k, nums):
        self.k = k
        self.all = list(nums)

    def add(self, val):
        self.all.append(val)
        self.all.sort()                              # full sort each call
        return self.all[len(self.all) - self.k]` },
          { lang: 'js', code: `class KthLargestSlow {
  constructor(k, nums) {
    this.k = k;
    this.all = [...nums];
  }

  add(val) {
    this.all.push(val);
    this.all.sort((a, b) => a - b);                  // full sort each call
    return this.all[this.all.length - this.k];
  }
}` },
          { lang: 'cpp', code: `class KthLargestSlow {
    vector<int> all;
    int k;
public:
    KthLargestSlow(int k, vector<int>& nums) : all(nums), k(k) {}

    int add(int val) {
        all.push_back(val);
        sort(all.begin(), all.end());                // full sort each call
        return all[all.size() - k];
    }
};` },
          { lang: 'csharp', code: `class KthLargestSlow
{
    private readonly List<int> all = new List<int>();
    private readonly int k;

    public KthLargestSlow(int k, int[] nums)
    {
        this.k = k;
        all.AddRange(nums);
    }

    public int Add(int val)
    {
        all.Add(val);
        all.Sort();                         // full sort each call
        return all[all.Count - k];
    }
}` }
        ] }
    },
    mcq: { q: 'Which state is enough to answer every add() call?', options: ['A min-heap holding only the k largest values seen', 'A max-heap of all values', 'A sorted array of all values', 'Only the current maximum'], answer: 0, explain: 'Values smaller than the current k-th largest can never become the k-th largest again (new values only push them further down), so a min-heap of size k is all we need; its top is the answer.' },
    hints: [
      `<p>Once a value falls out of the top k, can it ever come back? No — the stream only adds, so the top-k club only gets stronger.</p>`,
      `<p>Min-heap of size k. In <code>add</code>: offer, and if size &gt; k poll. Return <code>peek()</code>.</p>`,
      `<p>Edge case: the constructor may receive fewer than k numbers — do not poll below k. Recipe: constructor calls add for each num (ignoring the return); add → offer; if size &gt; k poll; return peek.</p>`
    ],
    tests: { cls: 'KthLargest', sigs: { KthLargest: 'int int[]', add: 'int -> int' }, cases: [
      { ops: ['KthLargest', 'add', 'add', 'add', 'add', 'add'], args: [[3, [4, 5, 8, 2]], [3], [5], [10], [9], [4]], out: [null, 4, 5, 5, 8, 8] },
      { ops: ['KthLargest', 'add', 'add', 'add', 'add', 'add'], args: [[1, []], [-3], [-2], [-4], [0], [4]], out: [null, -3, -2, -2, 0, 4] },
      { ops: ['KthLargest', 'add', 'add', 'add', 'add', 'add'], args: [[2, [0]], [-1], [1], [-2], [-4], [3]], out: [null, -1, 0, 0, 0, 1] },
      { ops: ['KthLargest', 'add', 'add', 'add', 'add', 'add'], args: [[3, [5, 5]], [5], [5], [1], [6], [6]], out: [null, 5, 5, 5, 5, 5] },
      { ops: ['KthLargest', 'add', 'add'], args: [[1, [10000]], [-10000], [10000]], out: [null, 10000, 10000] },
      { ops: ['KthLargest', 'add', 'add', 'add', 'add'], args: [[4, [9, 1, 8, 2, 7, 3]], [6], [0], [10], [5]], out: [null, 6, 6, 7, 7] },
      { ops: ['KthLargest', 'add', 'add'], args: [[1, { $range: [-10000, 10001] }], [-10000], [10000]], out: [null, 10000, 10000] }
    ] },
    solution: {
      approach: `<p>Min-heap of the k largest values; its top is the k-th largest.</p>`,
      code: `
        class KthLargest {
            private final PriorityQueue<Integer> heap = new PriorityQueue<>(); // min-heap of top k
            private final int k;

            public KthLargest(int k, int[] nums) {
                this.k = k;
                for (int x : nums) add(x);
            }

            public int add(int val) {
                heap.offer(val);
                if (heap.size() > k) heap.poll();   // drop the weakest of k+1
                return heap.peek();                  // weakest of the top k = k-th largest
            }

            public static void main(String[] args) {
                KthLargest kl = new KthLargest(3, new int[]{4, 5, 8, 2});
                System.out.println(kl.add(3));   // 4
                System.out.println(kl.add(5));   // 5
                System.out.println(kl.add(10));  // 5
            }
        }`,
      alt: [
        { lang: 'python', code: `import heapq

class KthLargest:
    def __init__(self, k, nums):
        self.k = k
        self.heap = []                    # min-heap of the k largest values
        for x in nums:
            self.add(x)

    def add(self, val):
        heapq.heappush(self.heap, val)
        if len(self.heap) > self.k:
            heapq.heappop(self.heap)      # drop the weakest of k + 1
        return self.heap[0]               # k-th largest
` },
        { lang: 'js', code: `class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }  // less(a, b): a comes out first
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

class KthLargest {
  constructor(k, nums) {
    this.k = k;
    this.heap = new MinHeap();            // min-heap of the k largest values
    for (const x of nums) this.add(x);
  }

  add(val) {
    this.heap.push(val);
    if (this.heap.size() > this.k) this.heap.pop();  // drop the weakest of k + 1
    return this.heap.peek();                          // k-th largest
  }
}
` },
        { lang: 'cpp', code: `class KthLargest {
    priority_queue<int, vector<int>, greater<int>> heap;  // min-heap of the k largest
    int k;

public:
    KthLargest(int k, const vector<int>& nums) : k(k) {
        for (int x : nums) add(x);
    }

    int add(int val) {
        heap.push(val);
        if ((int)heap.size() > k) heap.pop();   // drop the weakest of k + 1
        return heap.top();                      // k-th largest
    }
};
` },
        { lang: 'csharp', code: `using System;
using System.Collections.Generic;

public class KthLargest
{
    private readonly MinHeap<int> heap = new MinHeap<int>((a, b) => a.CompareTo(b)); // min-heap of top k
    private readonly int k;

    public KthLargest(int k, int[] nums)
    {
        this.k = k;
        foreach (int x in nums) Add(x);
    }

    public int Add(int val)
    {
        heap.Push(val);
        if (heap.Count > k) heap.Pop();     // drop the weakest of k+1
        return heap.Peek();                 // weakest of the top k = k-th largest
    }
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }
      ],
      dry: {
        head: ['call', 'heap after offer', 'poll?', 'heap', 'return'],
        rows: [
          ['init 4, 5, 8', '{4, 5, 8}', 'no', '{4, 5, 8}', '-'],
          ['init 2', '{2, 4, 5, 8}', 'poll 2', '{4, 5, 8}', '-'],
          ['add(3)', '{3, 4, 5, 8}', 'poll 3', '{4, 5, 8}', '<span class="c-p">4</span>'],
          ['add(5)', '{4, 5, 5, 8}', 'poll 4', '{5, 5, 8}', '<span class="c-p">5</span>'],
          ['add(10)', '{5, 5, 8, 10}', 'poll 5', '{5, 8, 10}', '<span class="c-p">5</span>']
        ]
      },
      complexity: `<p><b>Time:</b> O(log k) per add (O(N log k) for the constructor). <b>Space:</b> O(k).</p>`,
      followUps: ['What if values could also be deleted from the stream?', 'Return the k-th largest in a sliding window of the last W values.']
    }
  });

  practice.push({
    title: 'Check if an Array Represents a Min-Heap',
    level: 'Easy',
    tags: ['heap', 'array'],
    companies: ['Amazon', 'Samsung'],
    statement: `<p>Given an array <code>a</code> of N integers, return <code>true</code> if it is a valid <b>min-heap</b> stored level by level (every parent ≤ each of its children), else <code>false</code>.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, |a[i]| ≤ 10<sup>9</sup>`,
    example: `${H.arr([1, 3, 2, 7, 4, 2], { label: 'a', hl: { 0: 'g', 1: 'g', 2: 'g' } })}<p>Output ${H.c('g', 'true')}: index 0 (1) ≤ 3 and 2; index 1 (3) ≤ 7 and 4; index 2 (2) ≤ its only child 2 (equal is allowed).</p>
      ${H.arr([2, 5, 1], { label: 'b', hl: { 0: 'r', 2: 'r' } })}<p>Output ${H.c('r', 'false')}: parent 2 &gt; child 1.</p>`,
    brute: {
      why: `<p>A naive check compares every element against <b>every</b> element below it in the tree (all descendants): O(N log N) or worse, and much more code. The heap rule is local — checking parent vs direct children is enough because ≤ is transitive.</p>`,
      code: { lang: 'java', code: `
        boolean isMinHeapSlow(int[] a) {
            int n = a.length;
            for (int i = 0; i < n; i++) {
                // walk every descendant of i using an explicit stack
                Deque<Integer> st = new ArrayDeque<>();
                st.push(i);
                while (!st.isEmpty()) {
                    int j = st.pop();
                    if (a[j] < a[i]) return false;
                    if (2 * j + 1 < n) st.push(2 * j + 1);
                    if (2 * j + 2 < n) st.push(2 * j + 2);
                }
            }
            return true;
        }`, alt: [
          { lang: 'python', code: `def is_min_heap(a):
    n = len(a)
    for i in range(n):
        # walk every descendant of i using an explicit stack
        st = [i]
        while st:
            j = st.pop()
            if a[j] < a[i]:
                return False
            if 2 * j + 1 < n:
                st.append(2 * j + 1)
            if 2 * j + 2 < n:
                st.append(2 * j + 2)
    return True` },
          { lang: 'js', code: `function isMinHeap(a) {
  const n = a.length;
  for (let i = 0; i < n; i++) {
    // walk every descendant of i using an explicit stack
    const st = [i];
    while (st.length > 0) {
      const j = st.pop();
      if (a[j] < a[i]) return false;
      if (2 * j + 1 < n) st.push(2 * j + 1);
      if (2 * j + 2 < n) st.push(2 * j + 2);
    }
  }
  return true;
}` },
          { lang: 'cpp', code: `bool isMinHeap(vector<int>& a) {
    int n = a.size();
    for (int i = 0; i < n; i++) {
        // walk every descendant of i using an explicit stack
        stack<int> st;
        st.push(i);
        while (!st.empty()) {
            int j = st.top(); st.pop();
            if (a[j] < a[i]) return false;
            if (2 * j + 1 < n) st.push(2 * j + 1);
            if (2 * j + 2 < n) st.push(2 * j + 2);
        }
    }
    return true;
}` },
          { lang: 'csharp', code: `bool IsMinHeapSlow(int[] a)
{
    int n = a.Length;
    for (int i = 0; i < n; i++)
    {
        // walk every descendant of i using an explicit stack
        var st = new Stack<int>();
        st.Push(i);
        while (st.Count > 0)
        {
            int j = st.Pop();
            if (a[j] < a[i]) return false;
            if (2 * j + 1 < n) st.Push(2 * j + 1);
            if (2 * j + 2 < n) st.Push(2 * j + 2);
        }
    }
    return true;
}` }
        ] }
    },
    mcq: { q: 'Which indices actually need checking?', options: ['Only the non-leaves: 0 .. n/2 - 1', 'Every index 0 .. n-1 including leaves', 'Only index 0', 'Only the last level'], answer: 0, explain: 'Indices n/2 and above are leaves (their left child 2i+1 would be ≥ n). Leaves have no children, so there is nothing to compare.' },
    hints: [
      `<p>The heap property is local: if every parent is ≤ its direct children, then by chaining, every ancestor is ≤ every descendant.</p>`,
      `<p>Loop i from 0 to n/2 - 1. Compare a[i] with a[2i+1], and with a[2i+2] if it exists.</p>`,
      `<p>Edge cases: N = 1 is a heap; the last parent may have only a left child; equal values are fine (use &gt; to detect a violation). Recipe: for i in 0..n/2-1: if a[i] &gt; a[l] or (r &lt; n and a[i] &gt; a[r]) return false; return true.</p>`
    ],
    tests: { sig: 'int[] -> bool', fn: 'isMinHeap', cases: [
      [[[1, 3, 2, 7, 4, 2]], true],
      [[[2, 5, 1]], false],
      [[[1]], true],
      [[[5, 5, 5]], true],
      [[[1, 2]], true],
      [[[2, 1]], false],
      [[[1, 2, 3, 4, 0]], false],
      [[[-1000000000, 1000000000]], true],
      [[[1, 4, 2, 7, 5, 3]], true],
      [[[1, 4, 2, 3, 5, 1]], false],
      [[{ $range: [0, 100000] }], true],
      [[{ $range: [100000, 0, -1] }], false],
      [[{ $concat: [{ $rep: 5, n: 99999 }, [4]] }], false]
    ] },
    solution: {
      approach: `<p>Check every parent against its children; leaves are skipped.</p>`,
      code: `
        class Solution {
            public boolean isMinHeap(int[] a) {
                int n = a.length;
                for (int i = 0; i <= n / 2 - 1; i++) {        // only non-leaf nodes
                    int l = 2 * i + 1, r = 2 * i + 2;
                    if (a[i] > a[l]) return false;            // left child always exists here
                    if (r < n && a[i] > a[r]) return false;   // right child may be missing
                }
                return true;
            }

            public static void main(String[] args) {
                System.out.println(new Solution().isMinHeap(new int[]{1, 3, 2, 7, 4, 2})); // true
                System.out.println(new Solution().isMinHeap(new int[]{2, 5, 1}));          // false
            }
        }`,
      alt: [
        { lang: 'python', code: `def is_min_heap(a):
    # same rule seen from the child side: every child is >= its parent (i - 1) // 2
    return all(a[(i - 1) // 2] <= a[i] for i in range(1, len(a)))
` },
        { lang: 'js', code: `function isMinHeap(a) {
  const n = a.length;
  for (let i = 0; i <= (n >> 1) - 1; i++) {   // only non-leaf nodes
    const l = 2 * i + 1, r = l + 1;
    if (a[i] > a[l]) return false;            // left child always exists here
    if (r < n && a[i] > a[r]) return false;   // right child may be missing
  }
  return true;
}
` },
        { lang: 'cpp', code: `class Solution {
public:
    bool isMinHeap(vector<int>& a) {
        // std::is_heap checks a max-heap by default; greater<int>() flips it to a min-heap
        return is_heap(a.begin(), a.end(), greater<int>());
    }
};
` },
        { lang: 'csharp', code: `public class Solution
{
    public bool IsMinHeap(int[] a)
    {
        int n = a.Length;
        for (int i = 0; i <= n / 2 - 1; i++)          // only non-leaf nodes
        {
            int l = 2 * i + 1, r = 2 * i + 2;
            if (a[i] > a[l]) return false;            // left child always exists here
            if (r < n && a[i] > a[r]) return false;   // right child may be missing
        }
        return true;
    }
}` }
      ],
      dry: {
        head: ['i', 'a[i]', 'left (idx: val)', 'right (idx: val)', 'ok?'],
        rows: [
          ['0', '1', '1: 3', '2: 2', 'yes'],
          ['1', '3', '3: 7', '4: 4', 'yes'],
          ['2', '2', '5: 2', 'none (6 ≥ n)', 'yes (equal allowed)'],
          ['end', '-', '-', '-', '<span class="c-g">true</span>']
        ]
      },
      complexity: `<p><b>Time O(N)</b> — n/2 parents, at most 2 comparisons each. <b>Space O(1)</b>.</p>`,
      followUps: ['Check a max-heap instead (flip the comparisons).', 'Check a binary tree given with pointers: also verify completeness with a BFS (no node after the first missing child).']
    }
  });

  practice.push({
    title: 'Minimum Cost to Connect Ropes',
    level: 'Easy',
    tags: ['heap', 'greedy'],
    companies: ['Amazon', 'Microsoft', 'Goldman Sachs'],
    statement: `<p>You have N ropes with given lengths. Joining two ropes of lengths x and y costs x + y and produces one rope of length x + y. Return the <b>minimum total cost</b> to join all ropes into one.</p>`,
    constraints: `1 ≤ N ≤ 2·10<sup>5</sup>, 1 ≤ length ≤ 10<sup>6</sup> (use long for the total)`,
    example: `${H.arr([4, 3, 2, 6], { label: 'ropes', hl: { 1: 'y', 2: 'y' } })}<p>Output ${H.c('p', '29')}. <b>Why:</b> join 2 + 3 = 5 (cost 5) → [4, 5, 6]; join 4 + 5 = 9 (cost 9) → [6, 9]; join 6 + 9 = 15 (cost 15). Total 5 + 9 + 15 = 29. Joining the long ropes early would make them count again and again.</p>`,
    brute: {
      why: `<p>Each round, scan for the two shortest ropes: O(N) per round × N rounds = O(N<sup>2</sup>) — 4·10<sup>10</sup> for N = 2·10<sup>5</sup>. Trying every order (all join trees) is exponential.</p>`,
      code: { lang: 'java', code: `
        long connectRopesSlow(int[] ropes) {
            List<Long> r = new ArrayList<>();
            for (int x : ropes) r.add((long) x);
            long cost = 0;
            while (r.size() > 1) {
                Collections.sort(r);                 // O(N log N) every round
                long a = r.remove(0), b = r.remove(0);
                cost += a + b;
                r.add(a + b);
            }
            return cost;
        }`, alt: [
          { lang: 'python', code: `def min_cost(ropes):
    r = list(ropes)
    cost = 0
    while len(r) > 1:
        r.sort()                                     # O(N log N) every round
        a = r.pop(0)
        b = r.pop(0)
        cost += a + b
        r.append(a + b)
    return cost` },
          { lang: 'js', code: `function minCost(ropes) {
  const r = [...ropes];
  let cost = 0;
  while (r.length > 1) {
    r.sort((x, y) => x - y);                         // O(N log N) every round
    const a = r.shift(), b = r.shift();
    cost += a + b;
    r.push(a + b);
  }
  return cost;
}` },
          { lang: 'cpp', code: `long long minCost(vector<int> ropes) {
    vector<long long> r(ropes.begin(), ropes.end());
    long long cost = 0;
    while (r.size() > 1) {
        sort(r.begin(), r.end());                    // O(N log N) every round
        long long a = r[0], b = r[1];
        r.erase(r.begin(), r.begin() + 2);
        cost += a + b;
        r.push_back(a + b);
    }
    return cost;
}` },
          { lang: 'csharp', code: `long ConnectRopesSlow(int[] ropes)
{
    var r = new List<long>();
    foreach (int x in ropes) r.Add(x);
    long cost = 0;
    while (r.Count > 1)
    {
        r.Sort();                            // O(N log N) every round
        long a = r[0], b = r[1];
        r.RemoveRange(0, 2);
        cost += a + b;
        r.Add(a + b);
    }
    return cost;
}` }
        ] }
    },
    mcq: { q: 'Why always join the two shortest ropes first?', options: ['A rope joined early is paid for again in every later join, so short ones should be the ones repeated', 'Because the heap requires it', 'Longest-first gives the same answer', 'To keep the number of ropes even'], answer: 0, explain: 'Each original rope is paid once per join it takes part in (its depth in the join tree). Putting the shortest ropes deepest minimises the total — the same exchange argument as Huffman coding.' },
    hints: [
      `<p>Draw the joins as a tree: each rope length is added once per level above it. Short ropes should be the deep ones.</p>`,
      `<p>Min-heap: repeatedly poll the two smallest, add their sum to the cost, offer the sum back.</p>`,
      `<p>Edge cases: one rope → cost 0; use <code>long</code> for both the heap values and the cost. Recipe: heap of longs; while size &gt; 1: a = poll, b = poll, cost += a + b, offer a + b.</p>`
    ],
    tests: { sig: 'int[] -> long', fn: 'minCost', cases: [
      [[[4, 3, 2, 6]], 29],
      [[[5]], 0],
      [[[1, 2]], 3],
      [[[1, 1, 1, 1]], 8],
      [[[1000000, 1000000, 1000000]], 5000000],
      [[[8, 4, 6, 12]], 58],
      [[[2, 2, 3, 3, 9, 1]], 45],
      [[{ $rep: 1000000, n: 131072 }], 2228224000000]
    ] },
    solution: {
      approach: `<p>Greedy with a min-heap (Huffman-style merging).</p>`,
      code: `
        class Solution {
            public long minCost(int[] ropes) {
                PriorityQueue<Long> pq = new PriorityQueue<>();
                for (int x : ropes) pq.offer((long) x);
                long cost = 0;
                while (pq.size() > 1) {
                    long a = pq.poll(), b = pq.poll();   // two shortest ropes
                    cost += a + b;                        // pay for this join
                    pq.offer(a + b);                      // the new rope goes back in
                }
                return cost;
            }

            public static void main(String[] args) {
                System.out.println(new Solution().minCost(new int[]{4, 3, 2, 6})); // 29
            }
        }`,
      alt: [
        { lang: 'python', code: `import heapq

def min_cost(ropes):
    heap = list(ropes)
    heapq.heapify(heap)                   # O(N) build
    cost = 0                              # Python ints never overflow
    while len(heap) > 1:
        a = heapq.heappop(heap)           # two shortest ropes
        b = heapq.heappop(heap)
        cost += a + b                     # pay for this join
        heapq.heappush(heap, a + b)       # the new rope goes back in
    return cost
` },
        { lang: 'js', code: `class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }  // less(a, b): a comes out first
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function minCost(ropes) {
  const pq = new MinHeap();
  for (const x of ropes) pq.push(x);
  let cost = 0;                           // stays far below 2^53, so Number is exact here
  while (pq.size() > 1) {
    const a = pq.pop(), b = pq.pop();     // two shortest ropes
    cost += a + b;
    pq.push(a + b);
  }
  return cost;
}
` },
        { lang: 'cpp', code: `class Solution {
public:
    long long minCost(vector<int>& ropes) {
        priority_queue<long long, vector<long long>, greater<long long>> pq(ropes.begin(), ropes.end());
        long long cost = 0;                   // the total passes 2^31, so long long
        while (pq.size() > 1) {
            long long a = pq.top(); pq.pop();  // two shortest ropes
            long long b = pq.top(); pq.pop();
            cost += a + b;
            pq.push(a + b);
        }
        return cost;
    }
};
` },
        { lang: 'csharp', code: `using System;
using System.Collections.Generic;

public class Solution
{
    public long MinCost(int[] ropes)
    {
        var pq = new MinHeap<long>((a, b) => a.CompareTo(b));
        foreach (int x in ropes) pq.Push(x);
        long cost = 0;
        while (pq.Count > 1)
        {
            long a = pq.Pop(), b = pq.Pop();      // two shortest ropes
            cost += a + b;                        // pay for this join
            pq.Push(a + b);                       // the new rope goes back in
        }
        return cost;
    }
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }
      ],
      dry: {
        head: ['round', 'heap before', 'join', 'cost so far', 'heap after'],
        rows: [
          ['1', '{2, 3, 4, 6}', '2 + 3 = 5', '5', '{4, 5, 6}'],
          ['2', '{4, 5, 6}', '4 + 5 = 9', '14', '{6, 9}'],
          ['3', '{6, 9}', '6 + 9 = 15', '<span class="c-p">29</span>', '{15}']
        ]
      },
      complexity: `<p><b>Time O(N log N)</b>: N - 1 rounds, each with 2 polls and 1 offer. <b>Space O(N)</b>.</p>`,
      followUps: ['Prove optimality with an exchange argument (Huffman).', 'If lengths are already sorted, an O(N) two-queue method exists — describe it.']
    }
  });

  practice.push({
    title: 'Longest Common Prefix (using a Trie)',
    level: 'Easy',
    tags: ['trie', 'string'],
    companies: ['Google', 'Amazon', 'Apple'],
    statement: `<p>Given an array of lowercase strings, return the <b>longest common prefix</b> shared by all of them, or an empty string if there is none. Solve it with a trie.</p>`,
    constraints: `1 ≤ N ≤ 200, 0 ≤ length ≤ 200, lowercase a–z`,
    example: `<p>["flower", "flow", "flight"] → ${H.c('p', '"fl"')}. <b>Why:</b> all three start with f, l; at the third letter they split into o and i.</p><p>["dog", "racecar", "car"] → ${H.c('r', '""')}: the root already has two different children (d, r, c).</p>`,
    brute: {
      why: `<p>Try every prefix of the first word, longest first, and check all other words with <code>startsWith</code>: O(L · N · L). Fine for these limits, but repeats the same comparisons for every candidate length.</p>`,
      code: { lang: 'java', code: `
        String lcpSlow(String[] strs) {
            String first = strs[0];
            for (int len = first.length(); len >= 0; len--) {
                String p = first.substring(0, len);
                boolean ok = true;
                for (String s : strs) if (!s.startsWith(p)) { ok = false; break; }
                if (ok) return p;
            }
            return "";
        }`, alt: [
          { lang: 'python', code: `def longest_common_prefix(strs):
    first = strs[0]
    for ln in range(len(first), -1, -1):
        p = first[:ln]
        if all(s.startswith(p) for s in strs):
            return p
    return ""` },
          { lang: 'js', code: `function longestCommonPrefix(strs) {
  const first = strs[0];
  for (let len = first.length; len >= 0; len--) {
    const p = first.substring(0, len);
    if (strs.every((s) => s.startsWith(p))) return p;
  }
  return "";
}` },
          { lang: 'cpp', code: `string longestCommonPrefix(vector<string>& strs) {
    string first = strs[0];
    for (int len = first.size(); len >= 0; len--) {
        string p = first.substr(0, len);
        bool ok = true;
        for (const string& s : strs)
            if (s.compare(0, p.size(), p) != 0) { ok = false; break; }
        if (ok) return p;
    }
    return "";
}` },
          { lang: 'csharp', code: `string LcpSlow(string[] strs)
{
    string first = strs[0];
    for (int len = first.Length; len >= 0; len--)
    {
        string p = first.Substring(0, len);
        bool ok = true;
        foreach (string s in strs) if (!s.StartsWith(p, StringComparison.Ordinal)) { ok = false; break; }
        if (ok) return p;
    }
    return "";
}` }
        ] }
    },
    mcq: { q: 'While walking down from the root, when must you stop?', options: ['When the node has more than one child OR a word ends at it', 'Only when the node has no children', 'After exactly min-length steps, always', 'When you reach a node with isEnd = false'], answer: 0, explain: 'Two children means the words disagree on the next letter. A word ending here (e.g. "fl" in the list) means that word is fully used, so the prefix cannot grow.' },
    hints: [
      `<p>Insert every word. The common prefix is the path from the root that never branches.</p>`,
      `<p>Store <code>childCount</code> (or count non-null children) and <code>isEnd</code>. Walk while the node has exactly one child and is not an end.</p>`,
      `<p>Edge cases: an empty string in the input → answer ""; one word → the word itself. Recipe: insert all; node = root; sb = ""; while node.count == 1 and !node.isEnd: take the single child, append its letter.</p>`
    ],
    tests: { sig: 'string[] -> string', fn: 'longestCommonPrefix', cases: [
      [[['flower', 'flow', 'flight']], 'fl'],
      [[['dog', 'racecar', 'car']], ''],
      [[['a']], 'a'],
      [[['', 'b']], ''],
      [[['ab', 'a']], 'a'],
      [[['abc', 'abc']], 'abc'],
      [[['interview', 'internet', 'interval', 'internal']], 'inter'],
      [[[{ $rep: 'z', n: 200 }, { $rep: 'z', n: 200 }, { $concat: [{ $rep: 'z', n: 199 }, 'y'] }]], { $rep: 'z', n: 199 }]
    ] },
    solution: {
      approach: `<p>Build a trie; walk down the single-child chain.</p>`,
      code: `
        class Solution {
            public String longestCommonPrefix(String[] strs) {
                Node root = new Node();
                for (String s : strs) {
                    if (s.isEmpty()) return "";               // empty word kills any prefix
                    Node cur = root;
                    for (char ch : s.toCharArray()) {
                        int c = ch - 'a';
                        if (cur.kid[c] == null) { cur.kid[c] = new Node(); cur.count++; }
                        cur = cur.kid[c];
                    }
                    cur.isEnd = true;
                }
                StringBuilder sb = new StringBuilder();
                Node cur = root;
                while (cur.count == 1 && !cur.isEnd) {
                    int c = 0;
                    while (cur.kid[c] == null) c++;               // the only child
                    sb.append((char) ('a' + c));
                    cur = cur.kid[c];
                }
                return sb.toString();
            }

            static class Node {
                Node[] kid = new Node[26];
                int count;        // how many distinct children
                boolean isEnd;
            }

            public static void main(String[] args) {
                System.out.println(new Solution().longestCommonPrefix(new String[]{"flower", "flow", "flight"})); // fl
            }
        }`,
      alt: [
        { lang: 'python', code: `def longest_common_prefix(strs):
    END = '$'                             # marks "a word ends here"
    root = {}
    for s in strs:                        # build the trie (dict of dicts)
        node = root
        for ch in s:
            node = node.setdefault(ch, {})
        node[END] = True                  # "" marks the root itself, so the answer becomes ""
    prefix, node = [], root
    while len(node) == 1 and END not in node:   # exactly one child and no word ends here
        (ch, node), = node.items()        # the only child
        prefix.append(ch)
    return ''.join(prefix)
` },
        { lang: 'js', code: `function longestCommonPrefix(strs) {
  const root = { kids: new Map(), isEnd: false };
  for (const s of strs) {                       // build the trie
    let cur = root;
    for (const ch of s) {
      if (!cur.kids.has(ch)) cur.kids.set(ch, { kids: new Map(), isEnd: false });
      cur = cur.kids.get(ch);
    }
    cur.isEnd = true;                           // an empty word marks the root, so the answer is ""
  }
  let prefix = '', cur = root;
  while (cur.kids.size === 1 && !cur.isEnd) {   // single child, no word ends here
    const [ch, next] = cur.kids.entries().next().value;
    prefix += ch;
    cur = next;
  }
  return prefix;
}
` },
        { lang: 'cpp', code: `class Solution {
    struct Node {
        array<unique_ptr<Node>, 26> kid;
        int count = 0;                    // how many distinct children
        bool isEnd = false;
    };

public:
    string longestCommonPrefix(vector<string>& strs) {
        Node root;
        for (const string& s : strs) {
            Node* cur = &root;
            for (char ch : s) {
                auto& next = cur->kid[ch - 'a'];
                if (!next) { next = make_unique<Node>(); cur->count++; }
                cur = next.get();
            }
            cur->isEnd = true;            // an empty word marks the root, so the answer is ""
        }
        string prefix;
        const Node* cur = &root;
        while (cur->count == 1 && !cur->isEnd) {
            int c = 0;
            while (!cur->kid[c]) c++;     // the only child
            prefix += char('a' + c);
            cur = cur->kid[c].get();
        }
        return prefix;
    }
};
` },
        { lang: 'csharp', code: `using System.Text;

public class Solution
{
    public string LongestCommonPrefix(string[] strs)
    {
        var root = new Node();
        foreach (string s in strs)
        {
            if (s.Length == 0) return "";             // empty word kills any prefix
            Node cur = root;
            foreach (char ch in s)
            {
                int c = ch - 'a';
                if (cur.kid[c] == null) { cur.kid[c] = new Node(); cur.count++; }
                cur = cur.kid[c];
            }
            cur.isEnd = true;
        }
        var sb = new StringBuilder();
        Node walk = root;
        while (walk.count == 1 && !walk.isEnd)
        {
            int c = 0;
            while (walk.kid[c] == null) c++;              // the only child
            sb.Append((char)('a' + c));
            walk = walk.kid[c];
        }
        return sb.ToString();
    }

    class Node
    {
        public Node[] kid = new Node[26];
        public int count;       // how many distinct children
        public bool isEnd;
    }
}` }
      ],
      dry: {
        head: ['node', 'children', 'isEnd', 'action', 'prefix'],
        rows: [
          ['root', 'f', 'no', 'one child → take f', 'f'],
          ['f', 'l', 'no', 'one child → take l', 'fl'],
          ['fl', 'o, i', 'no', '<span class="c-r">two children → stop</span>', '<span class="c-p">fl</span>']
        ]
      },
      complexity: `<p><b>Time O(S)</b> where S is the total number of characters. <b>Space O(S · 26)</b> for the trie (the column-by-column scan uses O(1), so mention it as the simpler alternative).</p>`,
      followUps: ['Answer many queries "LCP of words i..j" — what would you precompute?', 'Longest common prefix of all pairs: which pair has the longest one? (sort + adjacent pairs)']
    }
  });

  // ================= PRACTICE: Medium =================
  practice.push({
    title: 'Top K Frequent Elements',
    level: 'Medium',
    tags: ['heap', 'hashmap', 'top-k', 'bucket sort'],
    companies: ['Amazon', 'Meta', 'Google', 'Uber'],
    statement: `<p>Given an integer array <code>nums</code> and an integer <code>k</code>, return the <code>k</code> most frequent elements in any order. The answer is guaranteed to be unique.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, k ≤ number of distinct values, -10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup>. Better than O(N log N) is expected.`,
    example: `${H.arr([1, 1, 1, 2, 2, 3], { label: 'nums', hl: { 0: 'p', 1: 'p', 2: 'p', 3: 'b', 4: 'b' } })}<p>k = 2 → ${H.c('p', '[1, 2]')}. <b>Why:</b> 1 appears 3 times, 2 appears 2 times, 3 once; the top two counts belong to 1 and 2.</p>`,
    brute: {
      why: `<p>Count with a map, then sort all distinct values by count: O(D log D) where D can be ~N. Correct, but we order the whole list when we need only k of them.</p>`,
      code: { lang: 'java', code: `
        int[] topKSlow(int[] nums, int k) {
            Map<Integer, Integer> f = new HashMap<>();
            for (int x : nums) f.merge(x, 1, Integer::sum);
            List<Integer> keys = new ArrayList<>(f.keySet());
            keys.sort((a, b) -> Integer.compare(f.get(b), f.get(a)));   // sort all by count desc
            int[] res = new int[k];
            for (int i = 0; i < k; i++) res[i] = keys.get(i);
            return res;
        }`, alt: [
          { lang: 'python', code: `def top_k_frequent(nums, k):
    f = {}
    for x in nums:
        f[x] = f.get(x, 0) + 1
    keys = sorted(f, key=lambda v: -f[v])            # sort all by count desc
    return keys[:k]` },
          { lang: 'js', code: `function topKFrequent(nums, k) {
  const f = new Map();
  for (const x of nums) f.set(x, (f.get(x) || 0) + 1);
  const keys = [...f.keys()];
  keys.sort((a, b) => f.get(b) - f.get(a));          // sort all by count desc
  return keys.slice(0, k);
}` },
          { lang: 'cpp', code: `vector<int> topKFrequent(vector<int> nums, int k) {
    unordered_map<int, int> f;
    for (int x : nums) f[x]++;
    vector<int> keys;
    for (auto& kv : f) keys.push_back(kv.first);
    sort(keys.begin(), keys.end(), [&](int a, int b) { return f[a] > f[b]; }); // sort all by count desc
    keys.resize(k);
    return keys;
}` },
          { lang: 'csharp', code: `int[] TopKSlow(int[] nums, int k)
{
    var f = new Dictionary<int, int>();
    foreach (int x in nums) { int c; f.TryGetValue(x, out c); f[x] = c + 1; }
    var keys = new List<int>(f.Keys);
    keys.Sort((a, b) => f[b].CompareTo(f[a]));   // sort all by count desc
    int[] res = new int[k];
    for (int i = 0; i < k; i++) res[i] = keys[i];
    return res;
}` }
        ] }
    },
    mcq: { q: 'After counting, you keep a heap of size k ordered by count. Which kind?', options: ['Min-heap by count (top = least frequent kept, the one to evict)', 'Max-heap by count of size k', 'Min-heap by value', 'No heap: a TreeSet of values'], answer: 0, explain: 'Same "bouncer" rule as K largest: we keep the k largest counts, so the top must be the smallest count among them.' },
    hints: [
      `<p>Two phases: count frequencies with a HashMap (O(N)), then pick the k largest counts.</p>`,
      `<p>Min-heap of map keys ordered by <code>Integer.compare(f.get(a), f.get(b))</code>; offer each key, poll when size &gt; k.</p>`,
      `<p>Bonus O(N): bucket sort — <code>List[] bucket</code> indexed by count (0..N); walk from N down and collect until you have k. Recipe for heap: count → for each key offer, if size &gt; k poll → drain into array.</p>`
    ],
    tests: { sig: 'int[] int -> int[]', fn: 'topKFrequent', cmp: 'set', cases: [
      [[[1, 1, 1, 2, 2, 3], 2], [1, 2]],
      [[[1], 1], [1]],
      [[[-1, -1, -2, 3, 3, 3], 2], [3, -1]],
      [[[4, 4, 5, 6, 6, 6], 3], [6, 4, 5]],
      [[[10000, -10000, 10000], 1], [10000]],
      [[[7, 8, 8, 9, 9, 9, 7, 9, 7], 2], [9, 7]],
      [[{ $concat: [{ $rep: 7, n: 50000 }, { $rep: -3, n: 30000 }, { $range: [-10000, 10000] }] }, 2], [7, -3]]
    ] },
    solution: {
      approach: `<p>HashMap counts + min-heap of size k on counts.</p>`,
      code: `
        class Solution {
            public int[] topKFrequent(int[] nums, int k) {
                Map<Integer, Integer> f = new HashMap<>();
                for (int x : nums) f.merge(x, 1, Integer::sum);              // value -> count
                PriorityQueue<Integer> pq = new PriorityQueue<>(
                    (a, b) -> Integer.compare(f.get(a), f.get(b)));          // min-heap by count
                for (int key : f.keySet()) {
                    pq.offer(key);
                    if (pq.size() > k) pq.poll();                            // evict least frequent
                }
                int[] res = new int[k];
                for (int i = k - 1; i >= 0; i--) res[i] = pq.poll();        // most frequent first
                return res;
            }

            public static void main(String[] args) {
                System.out.println(Arrays.toString(new Solution().topKFrequent(new int[]{1, 1, 1, 2, 2, 3}, 2))); // [1, 2]
            }
        }`,
      alt: [{ lang: 'python', code: `import heapq
from collections import Counter

def top_k_frequent(nums, k):
    count = Counter(nums)                 # value -> frequency, counted once
    # heapq.nlargest keeps a size-k heap internally: O(D log k)
    return heapq.nlargest(k, count, key=count.get)

print(top_k_frequent([1, 1, 1, 2, 2, 3], 2))`, run: true },
        { lang: 'js', code: `class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }  // less(a, b): a comes out first
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function topKFrequent(nums, k) {
  const f = new Map();
  for (const x of nums) f.set(x, (f.get(x) || 0) + 1);      // value -> count
  const pq = new MinHeap((a, b) => f.get(a) < f.get(b));    // min-heap by count
  for (const key of f.keys()) {
    pq.push(key);
    if (pq.size() > k) pq.pop();                            // evict the least frequent
  }
  const res = new Array(k);
  for (let i = k - 1; i >= 0; i--) res[i] = pq.pop();       // most frequent first
  return res;
}
` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<int> topKFrequent(vector<int>& nums, int k) {
        unordered_map<int, int> f;
        for (int x : nums) f[x]++;                               // value -> count
        // pairs compare by count first; greater<> makes it a min-heap
        priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> pq;
        for (auto& [val, cnt] : f) {
            pq.push({cnt, val});
            if ((int)pq.size() > k) pq.pop();                    // evict the least frequent
        }
        vector<int> res(k);
        for (int i = k - 1; i >= 0; i--) { res[i] = pq.top().second; pq.pop(); }
        return res;
    }
};
` },
        { lang: 'csharp', code: `using System;
using System.Collections.Generic;

public class Solution
{
    public int[] TopKFrequent(int[] nums, int k)
    {
        var f = new Dictionary<int, int>();
        foreach (int x in nums) { int c; f.TryGetValue(x, out c); f[x] = c + 1; }   // value -> count
        var pq = new MinHeap<int>((a, b) => f[a].CompareTo(f[b]));                 // min-heap by count
        foreach (int key in f.Keys)
        {
            pq.Push(key);
            if (pq.Count > k) pq.Pop();                              // evict least frequent
        }
        int[] res = new int[k];
        for (int i = k - 1; i >= 0; i--) res[i] = pq.Pop();         // most frequent first
        return res;
    }
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }],
      dry: {
        head: ['key (count)', 'heap after offer', 'poll?', 'heap'],
        rows: [
          ['1 (3)', '{1}', 'no', '{1}'],
          ['2 (2)', '{2, 1}', 'no', '{2, 1}'],
          ['3 (1)', '{3, 1, 2}', 'poll 3 (count 1)', '{2, 1}'],
          ['drain', 'poll 2 → res[1], poll 1 → res[0]', '-', '<span class="c-p">[1, 2]</span>']
        ]
      },
      complexity: `<p><b>Time O(N + D log k)</b> with D distinct values. <b>Space O(D)</b> for the map. Bucket sort variant: O(N) time.</p>`,
      followUps: ['Top K Frequent Words with alphabetical tie-break.', 'Stream of billions of items: Count-Min sketch + heap (approximate heavy hitters).']
    }
  });

  practice.push({
    title: 'K Closest Points to Origin',
    level: 'Medium',
    tags: ['heap', 'top-k', 'geometry'],
    companies: ['Meta', 'Amazon', 'LinkedIn'],
    statement: `<p>Given an array of points <code>[x, y]</code> and an integer <code>k</code>, return the <code>k</code> points closest to (0, 0) by Euclidean distance, in any order.</p>`,
    constraints: `1 ≤ k ≤ N ≤ 10<sup>4</sup>, -10<sup>4</sup> ≤ x, y ≤ 10<sup>4</sup>`,
    example: `<p>points = [[3, 3], [5, -1], [-2, 4]], k = 2 → ${H.c('p', '[[3, 3], [-2, 4]]')}.</p>${H.table(['point', 'x² + y²'], [['(3, 3)', H.c('g', '18')], ['(5, -1)', H.c('r', '26')], ['(-2, 4)', H.c('g', '20')]])}<p><b>Why:</b> the two smallest squared distances are 18 and 20.</p>`,
    brute: {
      why: `<p>Sort all points by distance: O(N log N). It works but orders points we will throw away; with a huge stream of points sorting is impossible.</p>`,
      code: { lang: 'java', code: `
        int[][] kClosestSlow(int[][] points, int k) {
            int[][] p = points.clone();
            Arrays.sort(p, (a, b) -> Integer.compare(a[0] * a[0] + a[1] * a[1], b[0] * b[0] + b[1] * b[1]));
            return Arrays.copyOf(p, k);
        }`, alt: [
          { lang: 'python', code: `def k_closest(points, k):
    p = sorted(points, key=lambda q: q[0] * q[0] + q[1] * q[1])
    return p[:k]` },
          { lang: 'js', code: `function kClosest(points, k) {
  const p = [...points];
  p.sort((a, b) => a[0] * a[0] + a[1] * a[1] - (b[0] * b[0] + b[1] * b[1]));
  return p.slice(0, k);
}` },
          { lang: 'cpp', code: `vector<vector<int>> kClosest(vector<vector<int>> points, int k) {
    vector<vector<int>> p = points;
    sort(p.begin(), p.end(), [](const vector<int>& a, const vector<int>& b) {
        return a[0] * a[0] + a[1] * a[1] < b[0] * b[0] + b[1] * b[1];
    });
    p.resize(k);
    return p;
}` },
          { lang: 'csharp', code: `int[][] KClosestSlow(int[][] points, int k)
{
    int[][] p = (int[][])points.Clone();
    Array.Sort(p, (a, b) => (a[0] * a[0] + a[1] * a[1]).CompareTo(b[0] * b[0] + b[1] * b[1]));
    return p.Take(k).ToArray();
}` }
        ] }
    },
    mcq: { q: 'Why compare x² + y² instead of √(x² + y²)?', options: ['Square root keeps the order, so it is wasted work and introduces floating-point error', 'Square root would change the answer', 'Square roots are not available in the standard library', 'x² + y² can overflow less than √'], answer: 0, explain: 'For non-negative numbers, a &lt; b ⇔ √a &lt; √b. Comparing the squares gives the same ranking with exact integer arithmetic.' },
    hints: [
      `<p>“k closest” = “k smallest distances” → max-heap of size k, top = the farthest point we are keeping.</p>`,
      `<p>Comparator on squared distance, descending: <code>Integer.compare(d(b), d(a))</code>. Offer each point; poll when size &gt; k.</p>`,
      `<p>Max squared distance here is 2·10<sup>8</sup> — fits in int; for bigger coordinates use long. Recipe: max-heap; for p: offer, if size &gt; k poll; return heap contents.</p>`
    ],
    tests: { sig: 'int[][] int -> int[][]', fn: 'kClosest', check: "(a, out, exp) => { const d = (p) => p[0] * p[0] + p[1] * p[1]; if (!Array.isArray(out) || out.length !== a[1]) return false; const pool = a[0].map((p) => p.join(',')); for (const p of out) { if (!Array.isArray(p) || p.length !== 2) return false; const i = pool.indexOf(p.join(',')); if (i < 0) return false; pool.splice(i, 1); } const od = out.map(d).sort((x, y) => x - y), ed = exp.map(d).sort((x, y) => x - y); return od.every((v, i) => v === ed[i]); }", cases: [
      [[[[3, 3], [5, -1], [-2, 4]], 2], [[3, 3], [-2, 4]]],
      [[[[1, 3], [-2, 2]], 1], [[-2, 2]]],
      [[[[1, 1]], 1], [[1, 1]]],
      [[[[10000, 10000], [-10000, -10000], [0, 0]], 1], [[0, 0]]],
      [[[[0, 1], [1, 0], [2, 2], [-1, 0]], 3], [[0, 1], [1, 0], [-1, 0]]],
      [[[[2, 2], [2, 2], [3, 3]], 2], [[2, 2], [2, 2]]],
      [[[[5, 5], [-4, 6], [1, -9]], 3], [[5, 5], [-4, 6], [1, -9]]]
    ] },
    solution: {
      approach: `<p>Max-heap of size k on squared distance.</p>`,
      code: `
        class Solution {
            private static int d(int[] p) { return p[0] * p[0] + p[1] * p[1]; }   // squared distance

            public int[][] kClosest(int[][] points, int k) {
                PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(d(b), d(a))); // farthest on top
                for (int[] p : points) {
                    pq.offer(p);
                    if (pq.size() > k) pq.poll();     // drop the farthest
                }
                int[][] res = new int[k][];
                for (int i = 0; i < k; i++) res[i] = pq.poll();
                return res;
            }

            public static void main(String[] args) {
                int[][] r = new Solution().kClosest(new int[][]{{3, 3}, {5, -1}, {-2, 4}}, 2);
                for (int[] p : r) System.out.println(Arrays.toString(p));
            }
        }`,
      alt: [
        { lang: 'python', code: `import heapq

def k_closest(points, k):
    # nsmallest keeps a bounded heap internally: O(N log k); x*x + y*y avoids square roots
    return heapq.nsmallest(k, points, key=lambda p: p[0] * p[0] + p[1] * p[1])
` },
        { lang: 'js', code: `class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }  // less(a, b): a comes out first
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function kClosest(points, k) {
  const d = (p) => p[0] * p[0] + p[1] * p[1];        // squared distance
  const pq = new MinHeap((a, b) => d(a) > d(b));     // farthest on top
  for (const p of points) {
    pq.push(p);
    if (pq.size() > k) pq.pop();                     // drop the farthest
  }
  return pq.a.slice();                               // any order is accepted
}
` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<vector<int>> kClosest(vector<vector<int>>& points, int k) {
        priority_queue<pair<int, int>> pq;            // {squared distance, index}: max-heap, farthest on top
        for (int i = 0; i < (int)points.size(); i++) {
            pq.push({points[i][0] * points[i][0] + points[i][1] * points[i][1], i});
            if ((int)pq.size() > k) pq.pop();         // drop the farthest
        }
        vector<vector<int>> res;
        while (!pq.empty()) { res.push_back(points[pq.top().second]); pq.pop(); }
        return res;
    }
};
` },
        { lang: 'csharp', code: `using System;
using System.Collections.Generic;

public class Solution
{
    private static int D(int[] p) { return p[0] * p[0] + p[1] * p[1]; }   // squared distance

    public int[][] KClosest(int[][] points, int k)
    {
        var pq = new MinHeap<int[]>((a, b) => D(b).CompareTo(D(a))); // farthest on top
        foreach (int[] p in points)
        {
            pq.Push(p);
            if (pq.Count > k) pq.Pop();       // drop the farthest
        }
        int[][] res = new int[k][];
        for (int i = 0; i < k; i++) res[i] = pq.Pop();
        return res;
    }
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }
      ],
      dry: {
        head: ['point (d²)', 'heap after offer (by d²)', 'poll?', 'heap'],
        rows: [
          ['(3, 3) 18', '{18}', 'no', '{18}'],
          ['(5, -1) 26', '{26, 18}', 'no', '{26, 18}'],
          ['(-2, 4) 20', '{26, 18, 20}', 'poll 26', '<span class="c-p">{20, 18}</span>']
        ]
      },
      complexity: `<p><b>Time O(N log k)</b>, <b>space O(k)</b>. Quickselect on distances gives O(N) average.</p>`,
      followUps: ['Points arrive as a stream — any change?', 'K closest to an arbitrary point q, for many queries: k-d tree.']
    }
  });

  practice.push({
    title: 'Sort a K-Sorted (Nearly Sorted) Array',
    level: 'Medium',
    tags: ['heap', 'sorting'],
    companies: ['Amazon', 'Microsoft', 'Walmart'],
    statement: `<p>Every element of the array is at most <code>k</code> positions away from its position in the sorted order. Sort the array efficiently.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>6</sup>, 0 ≤ k &lt; N`,
    example: `${H.arr([6, 5, 3, 2, 8, 10, 9], { label: 'arr (k = 3)' })}${H.arr([2, 3, 5, 6, 8, 9, 10], { label: 'sorted', hl: { 0: 'g' } })}<p><b>Why a window works:</b> the smallest value (2) sits at index 3, at most k = 3 away from index 0. So the first k + 1 elements always contain the next smallest value.</p>`,
    brute: {
      why: `<p>A library sort (<code>Arrays.sort</code> / <code>sorted</code> / <code>sort</code>) costs O(N log N) and ignores the hint. Insertion sort uses the hint (each element moves ≤ k steps) for O(N·k), which is bad when k is large.</p>`,
      code: { lang: 'java', code: `
        void sortKSlow(int[] a, int k) {
            for (int i = 1; i < a.length; i++) {      // insertion sort: each element shifts at most k times
                int x = a[i], j = i - 1;
                while (j >= 0 && a[j] > x) { a[j + 1] = a[j]; j--; }
                a[j + 1] = x;
            }
        }`, alt: [
          { lang: 'python', code: `def sort_k(a, k):
    for i in range(1, len(a)):                       # insertion sort: each element shifts at most k times
        x = a[i]
        j = i - 1
        while j >= 0 and a[j] > x:
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = x` },
          { lang: 'js', code: `function sortK(a, k) {
  for (let i = 1; i < a.length; i++) {               // insertion sort: each element shifts at most k times
    const x = a[i];
    let j = i - 1;
    while (j >= 0 && a[j] > x) { a[j + 1] = a[j]; j--; }
    a[j + 1] = x;
  }
}` },
          { lang: 'cpp', code: `void sortK(vector<int>& a, int k) {
    for (int i = 1; i < (int)a.size(); i++) {        // insertion sort: each element shifts at most k times
        int x = a[i], j = i - 1;
        while (j >= 0 && a[j] > x) { a[j + 1] = a[j]; j--; }
        a[j + 1] = x;
    }
}` },
          { lang: 'csharp', code: `void SortKSlow(int[] a, int k)
{
    for (int i = 1; i < a.Length; i++)        // insertion sort: each element shifts at most k times
    {
        int x = a[i], j = i - 1;
        while (j >= 0 && a[j] > x) { a[j + 1] = a[j]; j--; }
        a[j + 1] = x;
    }
}` }
        ] }
    },
    mcq: { q: 'How big must the heap be?', options: ['k + 1 elements', 'k elements', '2k elements', 'N elements'], answer: 0, explain: 'The correct value for position i is somewhere in a[i..i+k] — that is k + 1 candidates, so the window/heap must hold k + 1 elements before each poll.' },
    hints: [
      `<p>The value that belongs at position 0 must be among the first k + 1 elements.</p>`,
      `<p>Min-heap of size k + 1: push elements; whenever size exceeds k, poll and write to the next output slot.</p>`,
      `<p>Drain the remaining heap at the end. Recipe: w = 0; for x in a: offer x; if size &gt; k: a[w++] = poll. While heap not empty: a[w++] = poll. Writing back into the same array is safe because w never passes the read index.</p>`
    ],
    tests: { sig: 'int[] int -> void', fn: 'sortK', mutate: 0, cases: [
      [[[6, 5, 3, 2, 8, 10, 9], 3], [2, 3, 5, 6, 8, 9, 10]],
      [[[1], 0], [1]],
      [[[1, 2, 3], 0], [1, 2, 3]],
      [[[3, 2, 1], 2], [1, 2, 3]],
      [[[2, 1, 4, 3, 6, 5], 1], [1, 2, 3, 4, 5, 6]],
      [[[-5, -9, 0, -9], 2], [-9, -9, -5, 0]],
      [[{ $range: [100000, 0, -1] }, 99999], { $range: [1, 100001] }]
    ] },
    solution: {
      approach: `<p>Sliding min-heap of k + 1 elements; poll gives the next sorted value.</p>`,
      code: `
        class Solution {
            public void sortK(int[] a, int k) {
                PriorityQueue<Integer> pq = new PriorityQueue<>();
                int w = 0;                                  // next position to fill
                for (int x : a) {
                    pq.offer(x);
                    if (pq.size() > k) a[w++] = pq.poll();  // smallest of the window is final
                }
                while (!pq.isEmpty()) a[w++] = pq.poll();   // flush the rest
            }

            public static void main(String[] args) {
                int[] a = {6, 5, 3, 2, 8, 10, 9};
                new Solution().sortK(a, 3);
                System.out.println(Arrays.toString(a));    // [2, 3, 5, 6, 8, 9, 10]
            }
        }`,
      alt: [
        { lang: 'python', code: `import heapq

def sort_k(a, k):
    heap, w = [], 0                       # w = next position to fill
    for x in a:                           # iterating a while writing behind the reader is safe
        heapq.heappush(heap, x)
        if len(heap) > k:
            a[w] = heapq.heappop(heap)    # smallest of the window is final
            w += 1
    while heap:                           # flush the rest
        a[w] = heapq.heappop(heap)
        w += 1
` },
        { lang: 'js', code: `class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }  // less(a, b): a comes out first
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function sortK(a, k) {
  const pq = new MinHeap();
  let w = 0;                              // next position to fill
  for (let i = 0; i < a.length; i++) {
    pq.push(a[i]);
    if (pq.size() > k) a[w++] = pq.pop(); // smallest of the window is final
  }
  while (pq.size()) a[w++] = pq.pop();    // flush the rest
}
` },
        { lang: 'cpp', code: `class Solution {
public:
    void sortK(vector<int>& a, int k) {
        priority_queue<int, vector<int>, greater<int>> pq;   // min-heap window of k + 1
        size_t w = 0;                                        // next position to fill
        for (size_t i = 0; i < a.size(); i++) {
            pq.push(a[i]);
            if ((int)pq.size() > k) { a[w++] = pq.top(); pq.pop(); }
        }
        while (!pq.empty()) { a[w++] = pq.top(); pq.pop(); } // flush the rest
    }
};
` },
        { lang: 'csharp', code: `using System;
using System.Collections.Generic;

public class Solution
{
    public void SortK(int[] a, int k)
    {
        var pq = new MinHeap<int>((x, y) => x.CompareTo(y));   // min-heap window of k + 1
        int w = 0;                                  // next position to fill
        foreach (int x in a)
        {
            pq.Push(x);
            if (pq.Count > k) a[w++] = pq.Pop();    // smallest of the window is final
        }
        while (pq.Count > 0) a[w++] = pq.Pop();     // flush the rest
    }
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }
      ],
      dry: {
        head: ['read', 'heap after offer', 'poll → write', 'output so far'],
        rows: [
          ['6, 5, 3', '{3, 5, 6}', 'size ≤ 3, no poll', '-'],
          ['2', '{2, 3, 5, 6}', '2 → a[0]', '2'],
          ['8', '{3, 5, 6, 8}', '3 → a[1]', '2 3'],
          ['10', '{5, 6, 8, 10}', '5 → a[2]', '2 3 5'],
          ['9', '{6, 8, 9, 10}', '6 → a[3]', '2 3 5 6'],
          ['flush', '{}', '8, 9, 10', '<span class="c-p">2 3 5 6 8 9 10</span>']
        ]
      },
      complexity: `<p><b>Time O(N log k)</b>, <b>space O(k)</b>. For k = O(1) it is linear.</p>`,
      followUps: ['Why is it impossible to beat O(N log k) comparisons in general?', 'Merging out-of-order event logs that arrive at most 5 seconds late uses this exact idea (watermarks in stream processing).']
    }
  });

  practice.push({
    title: 'Replace Words',
    level: 'Medium',
    tags: ['trie', 'string'],
    companies: ['Uber', 'Amazon'],
    statement: `<p>Given a dictionary of <b>roots</b> and a sentence, replace every word in the sentence by the <b>shortest root</b> that is a prefix of it. Words without such a root stay unchanged. Return the new sentence.</p>`,
    constraints: `1 ≤ roots ≤ 1000, root length ≤ 100, sentence length ≤ 10<sup>6</sup>, lowercase letters and single spaces`,
    example: `<p>roots = [cat, bat, rat], sentence = "the cattle was rattled by the battery" → ${H.c('p', '"the cat was rat by the bat"')}.</p><p><b>Why:</b> “cattle” starts with “cat”, “rattled” with “rat”, “battery” with “bat”; the other words have no root as a prefix.</p>`,
    brute: {
      why: `<p>For every word, test every root with <code>startsWith</code> and keep the shortest match: O(W · R · L). With 10<sup>5</sup> words and 1000 roots that is 10<sup>8</sup>+ character checks, and we re-compare common prefixes of roots again and again.</p>`,
      code: { lang: 'java', code: `
        String replaceWordsSlow(List<String> roots, String sentence) {
            StringBuilder sb = new StringBuilder();
            for (String w : sentence.split(" ")) {
                String best = w;
                for (String r : roots)
                    if (w.startsWith(r) && r.length() < best.length()) best = r;
                if (sb.length() > 0) sb.append(' ');
                sb.append(best);
            }
            return sb.toString();
        }`, alt: [
          { lang: 'python', code: `def replace_words(roots, sentence):
    out = []
    for w in sentence.split(" "):
        best = w
        for r in roots:
            if w.startswith(r) and len(r) < len(best):
                best = r
        out.append(best)
    return " ".join(out)` },
          { lang: 'js', code: `function replaceWords(roots, sentence) {
  const out = [];
  for (const w of sentence.split(" ")) {
    let best = w;
    for (const r of roots)
      if (w.startsWith(r) && r.length < best.length) best = r;
    out.push(best);
  }
  return out.join(" ");
}` },
          { lang: 'cpp', code: `string replaceWords(vector<string>& roots, string sentence) {
    string result, w;
    istringstream in(sentence);
    while (in >> w) {
        string best = w;
        for (const string& r : roots)
            if (w.compare(0, r.size(), r) == 0 && r.size() < best.size()) best = r;
        if (!result.empty()) result += ' ';
        result += best;
    }
    return result;
}` },
          { lang: 'csharp', code: `string ReplaceWordsSlow(IList<string> roots, string sentence)
{
    var sb = new StringBuilder();
    foreach (string w in sentence.Split(' '))
    {
        string best = w;
        foreach (string r in roots)
            if (w.StartsWith(r, StringComparison.Ordinal) && r.Length < best.Length) best = r;
        if (sb.Length > 0) sb.Append(' ');
        sb.Append(best);
    }
    return sb.ToString();
}` }
        ] }
    },
    mcq: { q: 'Walking a word down the trie, when do you stop?', options: ['At the FIRST node with isEnd = true (shortest root) or when a letter is missing', 'At the deepest node with isEnd = true', 'Only at the end of the word', 'When the node has two children'], answer: 0, explain: 'The first word-end on the path is the shortest root. A missing letter means no root is a prefix, so the word stays as it is.' },
    hints: [
      `<p>Put the roots in a trie; then each word only needs one walk from the root.</p>`,
      `<p>For a word, walk letter by letter. If you hit a node with <code>isEnd</code>, output the prefix so far. If a child is missing, output the whole word.</p>`,
      `<p>Build the output without repeated string concatenation (strings are immutable): <code>StringBuilder</code> in Java, <code>' '.join(...)</code> in Python, an array plus <code>join(' ')</code> in JS, <code>string::append</code> in C++. Recipe: build trie; for each word: cur = root; for i: cur = cur.child[c]; if null → whole word; if cur.isEnd → word[0..i]; append.</p>`
    ],
    tests: { sig: 'list<string> string -> string', fn: 'replaceWords', cases: [
      [[['cat', 'bat', 'rat'], 'the cattle was rattled by the battery'], 'the cat was rat by the bat'],
      [[['a', 'b', 'c'], 'aadsfasf absbs bbab cadsfafs'], 'a a b c'],
      [[['catt', 'cat', 'bat', 'rat'], 'the cattle was rattled by the battery'], 'the cat was rat by the bat'],
      [[['a', 'aa', 'aaa'], 'aaaa aa a b'], 'a a a b'],
      [[['xyz'], 'hello world'], 'hello world'],
      [[['go'], 'go'], 'go'],
      [[['ab', 'abc'], 'abcd ab abx b'], 'ab ab ab b'],
      [[['cat'], { $concat: [{ $rep: 'cattle ', n: 100000 }, 'end'] }], { $concat: [{ $rep: 'cat ', n: 100000 }, 'end'] }]
    ] },
    solution: {
      approach: `<p>Trie of roots + one walk per word, stopping at the first end marker.</p>`,
      code: `
        class Solution {
            public String replaceWords(List<String> roots, String sentence) {
                Node root = new Node();
                for (String r : roots) {                       // build the trie of roots
                    Node cur = root;
                    for (char ch : r.toCharArray()) {
                        int c = ch - 'a';
                        if (cur.kid[c] == null) cur.kid[c] = new Node();
                        cur = cur.kid[c];
                    }
                    cur.isEnd = true;
                }
                StringBuilder out = new StringBuilder();
                for (String w : sentence.split(" ")) {
                    if (out.length() > 0) out.append(' ');
                    out.append(shortestRoot(root, w));
                }
                return out.toString();
            }

            private String shortestRoot(Node root, String w) {
                Node cur = root;
                for (int i = 0; i < w.length(); i++) {
                    cur = cur.kid[w.charAt(i) - 'a'];
                    if (cur == null) return w;                 // no root matches
                    if (cur.isEnd) return w.substring(0, i + 1); // first (shortest) root
                }
                return w;
            }

            static class Node { Node[] kid = new Node[26]; boolean isEnd; }

            public static void main(String[] args) {
                System.out.println(new Solution().replaceWords(List.of("cat", "bat", "rat"),
                    "the cattle was rattled by the battery")); // the cat was rat by the bat
            }
        }`,
      alt: [
        { lang: 'python', code: `def replace_words(roots, sentence):
    END = '$'                             # marks "a root ends here"
    trie = {}
    for r in roots:                       # build the trie of roots
        node = trie
        for ch in r:
            node = node.setdefault(ch, {})
        node[END] = True

    def shortest_root(w):
        node = trie
        for i, ch in enumerate(w):
            node = node.get(ch)
            if node is None:
                return w                  # no root matches
            if END in node:
                return w[:i + 1]          # first (shortest) root
        return w

    return ' '.join(shortest_root(w) for w in sentence.split(' '))  # join is O(total length)
` },
        { lang: 'js', code: `function replaceWords(roots, sentence) {
  const root = { kids: new Map(), isEnd: false };
  for (const r of roots) {                // build the trie of roots
    let cur = root;
    for (const ch of r) {
      if (!cur.kids.has(ch)) cur.kids.set(ch, { kids: new Map(), isEnd: false });
      cur = cur.kids.get(ch);
    }
    cur.isEnd = true;
  }
  const shortestRoot = (w) => {
    let cur = root;
    for (let i = 0; i < w.length; i++) {
      cur = cur.kids.get(w[i]);
      if (!cur) return w;                 // no root matches
      if (cur.isEnd) return w.slice(0, i + 1);  // first (shortest) root
    }
    return w;
  };
  return sentence.split(' ').map(shortestRoot).join(' ');  // build once with join
}
` },
        { lang: 'cpp', code: `class Solution {
    struct Node {
        array<unique_ptr<Node>, 26> kid;
        bool isEnd = false;
    };

public:
    string replaceWords(vector<string>& roots, string sentence) {
        Node root;
        for (const string& r : roots) {               // build the trie of roots
            Node* cur = &root;
            for (char ch : r) {
                auto& next = cur->kid[ch - 'a'];
                if (!next) next = make_unique<Node>();
                cur = next.get();
            }
            cur->isEnd = true;
        }
        string out, w;
        istringstream in(sentence);
        while (in >> w) {
            if (!out.empty()) out += ' ';
            const Node* cur = &root;
            size_t len = w.size();                    // default: keep the whole word
            for (size_t i = 0; i < w.size(); i++) {
                cur = cur->kid[w[i] - 'a'].get();
                if (!cur) break;                      // no root matches
                if (cur->isEnd) { len = i + 1; break; }  // first (shortest) root
            }
            out.append(w, 0, len);
        }
        return out;
    }
};
` },
        { lang: 'csharp', code: `using System.Collections.Generic;
using System.Text;

public class Solution
{
    public string ReplaceWords(IList<string> roots, string sentence)
    {
        var root = new Node();
        foreach (string r in roots)                    // build the trie of roots
        {
            Node cur = root;
            foreach (char ch in r)
            {
                int c = ch - 'a';
                if (cur.kid[c] == null) cur.kid[c] = new Node();
                cur = cur.kid[c];
            }
            cur.isEnd = true;
        }
        var result = new StringBuilder();
        foreach (string w in sentence.Split(' '))
        {
            if (result.Length > 0) result.Append(' ');
            result.Append(ShortestRoot(root, w));
        }
        return result.ToString();
    }

    private string ShortestRoot(Node root, string w)
    {
        Node cur = root;
        for (int i = 0; i < w.Length; i++)
        {
            cur = cur.kid[w[i] - 'a'];
            if (cur == null) return w;                 // no root matches
            if (cur.isEnd) return w.Substring(0, i + 1); // first (shortest) root
        }
        return w;
    }

    class Node { public Node[] kid = new Node[26]; public bool isEnd; }
}` }
      ],
      dry: {
        head: ['word', 'walk', 'stops because', 'output'],
        rows: [
          ['the', 't → missing', 'no child t', 'the'],
          ['cattle', 'c → a → t (isEnd)', 'first end at "cat"', '<span class="c-g">cat</span>'],
          ['rattled', 'r → a → t (isEnd)', 'first end at "rat"', '<span class="c-g">rat</span>'],
          ['battery', 'b → a → t (isEnd)', 'first end at "bat"', '<span class="c-g">bat</span>']
        ]
      },
      complexity: `<p><b>Time O(total root letters + total sentence letters)</b>. <b>Space O(root letters × 26)</b> for the trie plus the output.</p>`,
      followUps: ['Use the longest root instead.', 'Roots contain wildcards like "c.t" — DFS over both branches at a dot.']
    }
  });

  practice.push({
    title: 'Kth Smallest Element in a Sorted Matrix',
    level: 'Medium',
    tags: ['heap', 'k-way merge', 'binary search on answer'],
    companies: ['Google', 'Meta', 'Amazon'],
    statement: `<p>Given an n × n matrix where every row and every column is sorted in ascending order, return the k-th smallest element (counting duplicates).</p>`,
    constraints: `1 ≤ n ≤ 300, 1 ≤ k ≤ n<sup>2</sup>, -10<sup>9</sup> ≤ matrix[i][j] ≤ 10<sup>9</sup>`,
    example: `${H.table(['', 'c0', 'c1', 'c2'], [['r0', '1', '5', '9'], ['r1', '10', '11', '13'], ['r2', '12', '13', '15']])}<p>k = 8 → ${H.c('p', '13')}. <b>Why:</b> in sorted order: 1, 5, 9, 10, 11, 12, 13, ${H.c('p', '13')}, 15 — the 8th is 13.</p>`,
    brute: {
      why: `<p>Copy all n<sup>2</sup> values into an array and sort: O(n<sup>2</sup> log n) time and O(n<sup>2</sup>) memory, ignoring that rows are already sorted.</p>`,
      code: { lang: 'java', code: `
        int kthSmallestSlow(int[][] m, int k) {
            int n = m.length;
            int[] all = new int[n * n];
            int w = 0;
            for (int[] row : m) for (int v : row) all[w++] = v;
            Arrays.sort(all);
            return all[k - 1];
        }`, alt: [
          { lang: 'python', code: `def kth_smallest(m, k):
    vals = []
    for row in m:
        for v in row:
            vals.append(v)
    vals.sort()
    return vals[k - 1]` },
          { lang: 'js', code: `function kthSmallest(m, k) {
  const all = [];
  for (const row of m) for (const v of row) all.push(v);
  all.sort((a, b) => a - b);
  return all[k - 1];
}` },
          { lang: 'cpp', code: `int kthSmallest(vector<vector<int>>& m, int k) {
    vector<int> all;
    for (const auto& row : m) for (int v : row) all.push_back(v);
    sort(all.begin(), all.end());
    return all[k - 1];
}` },
          { lang: 'csharp', code: `int KthSmallestSlow(int[][] m, int k)
{
    int n = m.Length;
    int[] all = new int[n * n];
    int w = 0;
    foreach (int[] row in m) foreach (int v in row) all[w++] = v;
    Array.Sort(all);
    return all[k - 1];
}` }
        ] }
    },
    mcq: { q: 'Using the merge-K idea, what goes into the heap first?', options: ['The first element of each row: {value, row, col = 0}', 'The whole first row', 'The diagonal', 'All n² elements'], answer: 0, explain: 'Each row is a sorted list; its head is the first column. Polling the smallest head and pushing its right neighbour walks the matrix in sorted order.' },
    hints: [
      `<p>Each row is a sorted list → this is “merge n sorted lists, stop after k elements”.</p>`,
      `<p>Heap of int[]{value, row, col}. Seed with column 0 of every row (or only the first k rows). Poll k - 1 times, each time pushing (row, col + 1) if it exists. The top is the answer.</p>`,
      `<p>Use <code>Integer.compare</code> (values reach ±10<sup>9</sup>). Alternative O(n log(max - min)): binary search on the value and count elements ≤ mid with a staircase walk from the bottom-left corner.</p>`
    ],
    tests: { sig: 'int[][] int -> int', fn: 'kthSmallest', cases: [
      [[[[1, 5, 9], [10, 11, 13], [12, 13, 15]], 8], 13],
      [[[[-5]], 1], -5],
      [[[[1, 2], [1, 3]], 2], 1],
      [[[[1, 2], [3, 4]], 4], 4],
      [[[[-1000000000, 0], [0, 1000000000]], 4], 1000000000],
      [[[[1, 3, 5], [6, 7, 12], [11, 14, 14]], 6], 11],
      [[[[2, 2], [2, 2]], 3], 2],
      [[{ $rep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299], n: 300 }, 45000], 149],
      [[{ $rep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299], n: 300 }, 90000], 299]
    ] },
    solution: {
      approach: `<p>K-way merge over rows with a min-heap; stop at the k-th poll.</p>`,
      code: `
        class Solution {
            public int kthSmallest(int[][] m, int k) {
                int n = m.length;
                PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
                for (int r = 0; r < Math.min(n, k); r++) pq.offer(new int[]{m[r][0], r, 0}); // row heads
                for (int i = 0; i < k - 1; i++) {                 // throw away the k-1 smallest
                    int[] cur = pq.poll();
                    int r = cur[1], c = cur[2];
                    if (c + 1 < n) pq.offer(new int[]{m[r][c + 1], r, c + 1}); // next in the same row
                }
                return pq.peek()[0];
            }

            public static void main(String[] args) {
                int[][] m = {{1, 5, 9}, {10, 11, 13}, {12, 13, 15}};
                System.out.println(new Solution().kthSmallest(m, 8));   // 13
            }
        }`,
      alt: [
        { lang: 'python', code: `import heapq

def kth_smallest(m, k):
    n = len(m)
    heap = [(m[r][0], r, 0) for r in range(min(n, k))]   # row heads; tuples compare by value first
    heapq.heapify(heap)
    for _ in range(k - 1):                # throw away the k - 1 smallest
        _, r, c = heapq.heappop(heap)
        if c + 1 < n:
            heapq.heappush(heap, (m[r][c + 1], r, c + 1))  # next in the same row
    return heap[0][0]
` },
        { lang: 'js', code: `class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }  // less(a, b): a comes out first
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function kthSmallest(m, k) {
  const n = m.length;
  const pq = new MinHeap((a, b) => a[0] < b[0]);   // entries: [value, row, col]
  for (let r = 0; r < Math.min(n, k); r++) pq.push([m[r][0], r, 0]);
  for (let i = 0; i < k - 1; i++) {                // throw away the k - 1 smallest
    const [, r, c] = pq.pop();
    if (c + 1 < n) pq.push([m[r][c + 1], r, c + 1]);
  }
  return pq.peek()[0];
}
` },
        { lang: 'cpp', code: `class Solution {
public:
    int kthSmallest(vector<vector<int>>& m, int k) {
        int n = m.size();
        // tuple {value, row, col}; greater<> turns the default max-heap into a min-heap
        priority_queue<tuple<int, int, int>, vector<tuple<int, int, int>>, greater<>> pq;
        for (int r = 0; r < min(n, k); r++) pq.push({m[r][0], r, 0});
        for (int i = 0; i < k - 1; i++) {         // throw away the k - 1 smallest
            auto [v, r, c] = pq.top(); pq.pop();
            if (c + 1 < n) pq.push({m[r][c + 1], r, c + 1});
        }
        return get<0>(pq.top());
    }
};
` },
        { lang: 'csharp', code: `using System;
using System.Collections.Generic;

public class Solution
{
    public int KthSmallest(int[][] m, int k)
    {
        int n = m.Length;
        var pq = new MinHeap<int[]>((a, b) => a[0].CompareTo(b[0]));       // {value, row, col}
        for (int r = 0; r < Math.Min(n, k); r++) pq.Push(new[] { m[r][0], r, 0 }); // row heads
        for (int i = 0; i < k - 1; i++)                   // throw away the k-1 smallest
        {
            int[] cur = pq.Pop();
            int r = cur[1], c = cur[2];
            if (c + 1 < n) pq.Push(new[] { m[r][c + 1], r, c + 1 }); // next in the same row
        }
        return pq.Peek()[0];
    }
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }
      ],
      dry: {
        head: ['poll #', 'polled (r, c)', 'push', 'heap values after'],
        rows: [
          ['seed', '-', '1, 10, 12', '{1, 10, 12}'],
          ['1', '1 (0, 0)', '5', '{5, 10, 12}'],
          ['2', '5 (0, 1)', '9', '{9, 10, 12}'],
          ['3', '9 (0, 2)', 'row 0 done', '{10, 12}'],
          ['4', '10 (1, 0)', '11', '{11, 12}'],
          ['5', '11 (1, 1)', '13', '{12, 13}'],
          ['6', '12 (2, 0)', '13', '{13, 13}'],
          ['7', '13', '…', 'peek = <span class="c-p">13</span>']
        ]
      },
      complexity: `<p><b>Time O(min(n, k) + k log min(n, k))</b>, <b>space O(min(n, k))</b>. Binary search version: O(n log(range)) time, O(1) space.</p>`,
      followUps: ['Find K Pairs with Smallest Sums uses the same heap of fronts.', 'Explain the staircase counting step of the binary-search solution.']
    }
  });

  // ================= PRACTICE: Hard =================
  practice.push({
    title: 'Smallest Range Covering Elements from K Lists',
    level: 'Hard',
    tags: ['heap', 'k-way merge', 'sliding window'],
    companies: ['Google', 'Amazon', 'Snap'],
    statement: `<p>You have k lists of sorted integers. Find the smallest range [a, b] that includes at least one number from each list. Range [a, b] is smaller than [c, d] if b - a &lt; d - c, or b - a == d - c and a &lt; c.</p>`,
    constraints: `1 ≤ k ≤ 3500, 1 ≤ list length ≤ 50, -10<sup>5</sup> ≤ values ≤ 10<sup>5</sup>`,
    example: `<p>[[4, 10, 15, 24, 26], [0, 9, 12, 20], [5, 18, 22, 30]] → ${H.c('p', '[20, 24]')}.</p><p><b>Why:</b> 24 is in list 0, 20 in list 1, 22 in list 2 — all inside [20, 24], width 4. No range of width &lt; 4 contains one number from each list.</p>`,
    brute: {
      why: `<p>Try every pair (a, b) of values as range ends and check every list for a member inside: O(V<sup>2</sup> · k · log L) with V = total values (~1.75·10<sup>5</sup>) — hopeless. The waste: most candidate ranges are clearly dominated.</p>`,
      code: { lang: 'java', code: `
        int[] smallestRangeSlow(List<List<Integer>> lists) {
            List<Integer> vals = new ArrayList<>();
            for (List<Integer> l : lists) vals.addAll(l);
            Collections.sort(vals);
            int[] best = null;
            for (int i = 0; i < vals.size(); i++)
                for (int j = i; j < vals.size(); j++) {
                    int a = vals.get(i), b = vals.get(j);
                    boolean ok = true;
                    for (List<Integer> l : lists) {
                        boolean has = false;
                        for (int v : l) if (v >= a && v <= b) { has = true; break; }
                        if (!has) { ok = false; break; }
                    }
                    if (ok && (best == null || b - a < best[1] - best[0])) best = new int[]{a, b};
                }
            return best;
        }`, alt: [
          { lang: 'python', code: `def smallest_range(lists):
    vals = sorted(v for l in lists for v in l)
    best = None
    for i in range(len(vals)):
        for j in range(i, len(vals)):
            a, b = vals[i], vals[j]
            ok = True
            for l in lists:
                has = False
                for v in l:
                    if a <= v <= b:
                        has = True
                        break
                if not has:
                    ok = False
                    break
            if ok and (best is None or b - a < best[1] - best[0]):
                best = [a, b]
    return best` },
          { lang: 'js', code: `function smallestRange(lists) {
  const vals = lists.flat().sort((x, y) => x - y);
  let best = null;
  for (let i = 0; i < vals.length; i++)
    for (let j = i; j < vals.length; j++) {
      const a = vals[i], b = vals[j];
      let ok = true;
      for (const l of lists) {
        let has = false;
        for (const v of l) if (v >= a && v <= b) { has = true; break; }
        if (!has) { ok = false; break; }
      }
      if (ok && (best === null || b - a < best[1] - best[0])) best = [a, b];
    }
  return best;
}` },
          { lang: 'cpp', code: `vector<int> smallestRange(vector<vector<int>>& lists) {
    vector<int> vals;
    for (auto& l : lists) vals.insert(vals.end(), l.begin(), l.end());
    sort(vals.begin(), vals.end());
    vector<int> best;
    for (int i = 0; i < (int)vals.size(); i++)
        for (int j = i; j < (int)vals.size(); j++) {
            int a = vals[i], b = vals[j];
            bool ok = true;
            for (auto& l : lists) {
                bool has = false;
                for (int v : l) if (v >= a && v <= b) { has = true; break; }
                if (!has) { ok = false; break; }
            }
            if (ok && (best.empty() || b - a < best[1] - best[0])) best = {a, b};
        }
    return best;
}` },
          { lang: 'csharp', code: `int[] SmallestRangeSlow(IList<IList<int>> lists)
{
    var vals = new List<int>();
    foreach (var l in lists) vals.AddRange(l);
    vals.Sort();
    int[] best = null;
    for (int i = 0; i < vals.Count; i++)
        for (int j = i; j < vals.Count; j++)
        {
            int a = vals[i], b = vals[j];
            bool ok = true;
            foreach (var l in lists)
            {
                bool has = false;
                foreach (int v in l) if (v >= a && v <= b) { has = true; break; }
                if (!has) { ok = false; break; }
            }
            if (ok && (best == null || b - a < best[1] - best[0])) best = new[] { a, b };
        }
    return best;
}` }
        ] }
    },
    mcq: { q: 'The heap holds one current element per list. Which element do you advance each step?', options: ['The minimum (heap top) — it is the only way the range can shrink', 'The maximum', 'A random list', 'All of them at once'], answer: 0, explain: 'The range is [heap min, current max]. Advancing anything other than the minimum can only keep or raise the max without lifting the min, so it never helps.' },
    hints: [
      `<p>Pick one pointer per list. The range they cover is [min of pointed values, max of pointed values].</p>`,
      `<p>Min-heap of {value, list, index} plus a variable <code>curMax</code>. Each step: record [top, curMax] if better; poll the top; push its successor and update curMax.</p>`,
      `<p>Stop as soon as the polled list has no next element — after that some list cannot be represented. Recipe: seed heads, curMax = max head; loop: top = poll; update best; if top is last in its list break; push next; curMax = max(curMax, next).</p>`
    ],
    tests: { sig: 'list<list<int>> -> int[]', fn: 'smallestRange', cases: [
      [[[[4, 10, 15, 24, 26], [0, 9, 12, 20], [5, 18, 22, 30]]], [20, 24]],
      [[[[1, 2, 3], [1, 2, 3], [1, 2, 3]]], [1, 1]],
      [[[[5, 8]]], [5, 5]],
      [[[[10], [11]]], [10, 11]],
      [[[[-100000], [100000]]], [-100000, 100000]],
      [[[[1, 5], [3, 7]]], [1, 3]],
      [[[[-5, -1, 6], [-3, 4], [0, 2, 8]]], [-3, 0]],
      [[{ $rep: [-100000, 0, 100000], n: 3500 }], [-100000, -100000]],
      [[{ $concat: [{ $rep: [1, 2, 3], n: 3499 }, [[100000]]] }], [3, 100000]]
    ] },
    solution: {
      approach: `<p>K-way merge with a heap of current fronts, tracking the maximum: a sliding window over the merged order that always holds one element per list.</p>`,
      code: `
        class Solution {
            public int[] smallestRange(List<List<Integer>> nums) {
                PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0])); // {value, list, idx}
                int curMax = Integer.MIN_VALUE;
                for (int i = 0; i < nums.size(); i++) {
                    int v = nums.get(i).get(0);
                    pq.offer(new int[]{v, i, 0});
                    curMax = Math.max(curMax, v);
                }
                int bestLo = 0, bestHi = Integer.MAX_VALUE;
                while (true) {
                    int[] top = pq.poll();                    // current minimum
                    if ((long) curMax - top[0] < (long) bestHi - bestLo) { bestLo = top[0]; bestHi = curMax; }
                    int li = top[1], idx = top[2] + 1;
                    if (idx == nums.get(li).size()) break;    // this list is exhausted
                    int nv = nums.get(li).get(idx);
                    pq.offer(new int[]{nv, li, idx});
                    curMax = Math.max(curMax, nv);
                }
                return new int[]{bestLo, bestHi};
            }

            public static void main(String[] args) {
                List<List<Integer>> in = List.of(List.of(4, 10, 15, 24, 26), List.of(0, 9, 12, 20), List.of(5, 18, 22, 30));
                System.out.println(Arrays.toString(new Solution().smallestRange(in))); // [20, 24]
            }
        }`,
      alt: [
        { lang: 'python', code: `import heapq

def smallest_range(nums):
    heap = [(lst[0], i, 0) for i, lst in enumerate(nums)]   # (value, list, index)
    heapq.heapify(heap)
    cur_max = max(lst[0] for lst in nums)
    best = [heap[0][0], cur_max]
    while True:
        v, i, j = heapq.heappop(heap)     # current minimum
        if cur_max - v < best[1] - best[0]:
            best = [v, cur_max]           # strictly smaller only, so ties keep the smaller start
        if j + 1 == len(nums[i]):
            return best                   # this list is exhausted
        nv = nums[i][j + 1]
        heapq.heappush(heap, (nv, i, j + 1))
        cur_max = max(cur_max, nv)
` },
        { lang: 'js', code: `class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }  // less(a, b): a comes out first
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function smallestRange(nums) {
  const pq = new MinHeap((a, b) => a[0] < b[0]);   // entries: [value, list, index]
  let curMax = -Infinity;
  nums.forEach((lst, i) => { pq.push([lst[0], i, 0]); curMax = Math.max(curMax, lst[0]); });
  let bestLo = 0, bestHi = Infinity;
  for (;;) {
    const [v, i, j] = pq.pop();                    // current minimum
    if (curMax - v < bestHi - bestLo) { bestLo = v; bestHi = curMax; }
    if (j + 1 === nums[i].length) break;           // this list is exhausted
    const nv = nums[i][j + 1];
    pq.push([nv, i, j + 1]);
    curMax = Math.max(curMax, nv);
  }
  return [bestLo, bestHi];
}
` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<int> smallestRange(vector<vector<int>>& nums) {
        // {value, list, index}; greater<> turns the default max-heap into a min-heap
        priority_queue<tuple<int, int, int>, vector<tuple<int, int, int>>, greater<>> pq;
        int curMax = INT_MIN;
        for (int i = 0; i < (int)nums.size(); i++) {
            pq.push({nums[i][0], i, 0});
            curMax = max(curMax, nums[i][0]);
        }
        int bestLo = 0, bestHi = INT_MAX;
        while (true) {
            auto [v, i, j] = pq.top(); pq.pop();          // current minimum
            if ((long long)curMax - v < (long long)bestHi - bestLo) { bestLo = v; bestHi = curMax; }
            if (j + 1 == (int)nums[i].size()) break;      // this list is exhausted
            int nv = nums[i][j + 1];
            pq.push({nv, i, j + 1});
            curMax = max(curMax, nv);
        }
        return {bestLo, bestHi};
    }
};
` },
        { lang: 'csharp', code: `using System;
using System.Collections.Generic;

public class Solution
{
    public int[] SmallestRange(IList<IList<int>> nums)
    {
        var pq = new MinHeap<int[]>((a, b) => a[0].CompareTo(b[0]));   // {value, list, idx}
        int curMax = int.MinValue;
        for (int i = 0; i < nums.Count; i++)
        {
            int v = nums[i][0];
            pq.Push(new[] { v, i, 0 });
            curMax = Math.Max(curMax, v);
        }
        int bestLo = 0, bestHi = int.MaxValue;
        while (true)
        {
            int[] top = pq.Pop();                     // current minimum
            if ((long)curMax - top[0] < (long)bestHi - bestLo) { bestLo = top[0]; bestHi = curMax; }
            int li = top[1], idx = top[2] + 1;
            if (idx == nums[li].Count) break;         // this list is exhausted
            int nv = nums[li][idx];
            pq.Push(new[] { nv, li, idx });
            curMax = Math.Max(curMax, nv);
        }
        return new[] { bestLo, bestHi };
    }
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }
      ],
      dry: {
        head: ['heap (values)', 'min', 'max', 'range', 'best', 'advance'],
        rows: [
          ['{0, 4, 5}', '0', '5', '[0, 5] w5', '[0, 5]', 'list 1 → 9'],
          ['{4, 5, 9}', '4', '9', '[4, 9] w5', '[0, 5]', 'list 0 → 10'],
          ['{5, 9, 10}', '5', '10', '[5, 10] w5', '[0, 5]', 'list 2 → 18'],
          ['{9, 10, 18}', '9', '18', 'w9', '[0, 5]', 'list 1 → 12'],
          ['{10, 12, 18}', '10', '18', 'w8', '[0, 5]', 'list 0 → 15'],
          ['{12, 15, 18}', '12', '18', 'w6', '[0, 5]', 'list 1 → 20'],
          ['{15, 18, 20}', '15', '20', '[15, 20] w5', '[0, 5]', 'list 0 → 24'],
          ['{18, 20, 24}', '18', '24', 'w6', '[0, 5]', 'list 2 → 22'],
          ['{20, 22, 24}', '20', '24', '[20, 24] <span class="c-g">w4</span>', '<span class="c-p">[20, 24]</span>', 'list 1 ends → stop']
        ]
      },
      complexity: `<p><b>Time O(V log k)</b> where V is the total number of values; <b>space O(k)</b>.</p>`,
      followUps: ['Solve it with a sort-all + sliding window + count map (minimum window covering all colours).', 'Return the range of the k closest elements from different lists.']
    }
  });

  practice.push({
    title: 'Sliding Window Median',
    level: 'Hard',
    tags: ['two heaps', 'lazy deletion', 'sliding window'],
    companies: ['Google', 'Amazon', 'Spotify'],
    statement: `<p>Given an array <code>nums</code> and a window size <code>k</code>, return the median of every window of size k as it slides from left to right (an array of N - k + 1 doubles).</p>`,
    constraints: `1 ≤ k ≤ N ≤ 10<sup>5</sup>, -2<sup>31</sup> ≤ nums[i] ≤ 2<sup>31</sup> - 1`,
    example: `<p>nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3 → ${H.c('p', '[1, -1, -1, 3, 5, 6]')}.</p>${H.table(['window', 'sorted', 'median'], [['1 3 -1', '-1 1 3', '1'], ['3 -1 -3', '-3 -1 3', '-1'], ['-1 -3 5', '-3 -1 5', '-1'], ['-3 5 3', '-3 3 5', '3'], ['5 3 6', '3 5 6', '5'], ['3 6 7', '3 6 7', '6']])}`,
    brute: {
      why: `<p>Copy and sort every window: O((N - k + 1) · k log k) — with N = 10<sup>5</sup>, k = 5·10<sup>4</sup> that is ~4·10<sup>10</sup>. Consecutive windows share k - 1 elements, yet we rebuild order from scratch every time.</p>`,
      code: { lang: 'java', code: `
        double[] medianSlidingWindowSlow(int[] nums, int k) {
            double[] res = new double[nums.length - k + 1];
            for (int i = 0; i + k <= nums.length; i++) {
                int[] w = Arrays.copyOfRange(nums, i, i + k);
                Arrays.sort(w);
                res[i] = k % 2 == 1 ? w[k / 2] : ((double) w[k / 2 - 1] + w[k / 2]) / 2.0;
            }
            return res;
        }`, alt: [
          { lang: 'python', code: `def median_sliding_window(nums, k):
    res = []
    for i in range(len(nums) - k + 1):
        w = sorted(nums[i:i + k])
        if k % 2 == 1:
            res.append(float(w[k // 2]))
        else:
            res.append((w[k // 2 - 1] + w[k // 2]) / 2.0)
    return res` },
          { lang: 'js', code: `function medianSlidingWindow(nums, k) {
  const res = [];
  for (let i = 0; i + k <= nums.length; i++) {
    const w = nums.slice(i, i + k).sort((a, b) => a - b);
    res.push(k % 2 === 1 ? w[(k - 1) / 2] : (w[k / 2 - 1] + w[k / 2]) / 2);
  }
  return res;
}` },
          { lang: 'cpp', code: `vector<double> medianSlidingWindow(vector<int>& nums, int k) {
    vector<double> res;
    for (int i = 0; i + k <= (int)nums.size(); i++) {
        vector<int> w(nums.begin() + i, nums.begin() + i + k);
        sort(w.begin(), w.end());
        res.push_back(k % 2 == 1 ? w[k / 2] : ((double)w[k / 2 - 1] + w[k / 2]) / 2.0);
    }
    return res;
}` },
          { lang: 'csharp', code: `double[] MedianSlidingWindowSlow(int[] nums, int k)
{
    double[] res = new double[nums.Length - k + 1];
    for (int i = 0; i + k <= nums.Length; i++)
    {
        int[] w = new int[k];
        Array.Copy(nums, i, w, 0, k);
        Array.Sort(w);
        res[i] = k % 2 == 1 ? w[k / 2] : ((double)w[k / 2 - 1] + w[k / 2]) / 2.0;
    }
    return res;
}` }
        ] }
    },
    mcq: { q: 'Removing an arbitrary value from a library heap (Java PriorityQueue.remove(Object), Python list.remove + heapify) is O(k). How do you delete the outgoing element in O(log k) amortized?', options: ['Lazy deletion: count it in a map and discard it when it reaches a heap top', 'Rebuild both heaps every step', 'Use a HashSet instead of heaps', 'Sort the heap array'], answer: 0, explain: 'Keep "to delete" counts and fix the live sizes; dead values are popped only when they surface at a top. Each value is pushed and popped once overall.' },
    hints: [
      `<p>Reuse “median from data stream”: low = max-heap, high = min-heap, low has the same size or one more.</p>`,
      `<p>Removal is the hard part: decrement the live size of the heap the value belongs to (decide with <code>x ≤ low.peek()</code>), record it in a <code>delayed</code> map, and prune tops.</p>`,
      `<p>Overflow: values reach ±2<sup>31</sup>, so average with <code>((double) a + b) / 2</code>. (Python ints never overflow; JS numbers hold the sum exactly; in Java and C++ widen before adding.) In Java, <code>Collections.reverseOrder()</code> is safe; a subtraction comparator is not. Recipe per step: add new; remove old; balance; prune; record median.</p>`
    ],
    tests: { sig: 'int[] int -> double[]', fn: 'medianSlidingWindow', cmp: 'float', cases: [
      [[[1, 3, -1, -3, 5, 3, 6, 7], 3], [1.0, -1.0, -1.0, 3.0, 5.0, 6.0]],
      [[[5, 2, 9], 1], [5.0, 2.0, 9.0]],
      [[[4, 1, 7, 3], 4], [3.5]],
      [[[1, 2, 3, 4], 2], [1.5, 2.5, 3.5]],
      [[[1, 1, 1, 1], 2], [1.0, 1.0, 1.0]],
      [[[2147483647, 2147483647], 2], [2147483647.0]],
      [[[-2147483648, -2147483648, -2147483648], 2], [-2147483648.0, -2147483648.0]],
      [[[1, 2, 3, 4, 2, 3, 1, 4, 2], 3], [2.0, 3.0, 3.0, 3.0, 2.0, 3.0, 2.0]],
      [[[2147483647, -2147483648, 0, 2147483647], 2], [-0.5, -1073741824.0, 1073741823.5]],
      [[{ $range: [0, 100000] }, 50001], { $range: [25000, 75000] }],
      [[{ $rep: 7, n: 100000 }, 4], { $rep: 7, n: 99997 }]
    ] },
    solution: {
      approach: `<p>Two heaps + lazy deletion with live-size counters.</p>`,
      code: `
        class Solution {
            PriorityQueue<Integer> low = new PriorityQueue<>(Collections.reverseOrder());
            PriorityQueue<Integer> high = new PriorityQueue<>();
            Map<Integer, Integer> delayed = new HashMap<>();
            int lowSize, highSize;                                  // live counts

            public double[] medianSlidingWindow(int[] nums, int k) {
                double[] res = new double[nums.length - k + 1];
                for (int i = 0; i < nums.length; i++) {
                    add(nums[i]);
                    if (i >= k) remove(nums[i - k]);
                    if (i >= k - 1) res[i - k + 1] = median(k);
                }
                return res;
            }

            private void add(int x) {
                if (low.isEmpty() || x <= low.peek()) { low.offer(x); lowSize++; }
                else { high.offer(x); highSize++; }
                balance();
            }

            private void remove(int x) {
                delayed.merge(x, 1, Integer::sum);
                if (x <= low.peek()) { lowSize--; if (x == low.peek()) prune(low); }
                else { highSize--; if (x == high.peek()) prune(high); }
                balance();
            }

            private void balance() {
                if (lowSize > highSize + 1) { high.offer(low.poll()); lowSize--; highSize++; prune(low); }
                else if (lowSize < highSize) { low.offer(high.poll()); highSize--; lowSize++; prune(high); }
            }

            private void prune(PriorityQueue<Integer> pq) {
                while (!pq.isEmpty() && delayed.getOrDefault(pq.peek(), 0) > 0) {
                    int v = pq.poll();
                    if (delayed.merge(v, -1, Integer::sum) == 0) delayed.remove(v);
                }
            }

            private double median(int k) {
                return k % 2 == 1 ? low.peek() : ((double) low.peek() + high.peek()) / 2.0;
            }

            public static void main(String[] args) {
                System.out.println(Arrays.toString(new Solution().medianSlidingWindow(new int[]{1, 3, -1, -3, 5, 3, 6, 7}, 3)));
            }
        }`,
      alt: [
        { lang: 'python', code: `import heapq
from collections import defaultdict

def median_sliding_window(nums, k):
    low, high = [], []                    # low: smaller half as negatives (max-heap), high: min-heap
    dead = defaultdict(int)               # value -> copies waiting to be deleted
    sizes = [0, 0]                        # live counts of low and high

    def prune(heap, sign):                # pop tops that were deleted earlier
        while heap and dead[sign * heap[0]]:
            dead[sign * heap[0]] -= 1
            heapq.heappop(heap)

    def balance():
        if sizes[0] > sizes[1] + 1:
            heapq.heappush(high, -heapq.heappop(low)); sizes[0] -= 1; sizes[1] += 1; prune(low, -1)
        elif sizes[0] < sizes[1]:
            heapq.heappush(low, -heapq.heappop(high)); sizes[1] -= 1; sizes[0] += 1; prune(high, 1)

    res = []
    for i, x in enumerate(nums):
        if not low or x <= -low[0]:       # add
            heapq.heappush(low, -x); sizes[0] += 1
        else:
            heapq.heappush(high, x); sizes[1] += 1
        balance()
        if i >= k:                        # remove the value leaving the window, lazily
            y = nums[i - k]
            dead[y] += 1
            if y <= -low[0]:
                sizes[0] -= 1
                if y == -low[0]:
                    prune(low, -1)
            else:
                sizes[1] -= 1
                if y == high[0]:
                    prune(high, 1)
            balance()
        if i >= k - 1:                    # Python ints never overflow, so the sum is safe
            res.append(float(-low[0]) if k % 2 else (-low[0] + high[0]) / 2)
    return res
` },
        { lang: 'js', code: `class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }  // less(a, b): a comes out first
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function medianSlidingWindow(nums, k) {
  const low = new MinHeap((a, b) => a > b);   // smaller half, biggest on top
  const high = new MinHeap();                 // bigger half, smallest on top
  const dead = new Map();                     // value -> copies waiting to be deleted
  let lowSize = 0, highSize = 0;              // live counts

  const prune = (h) => {                      // pop tops that were deleted earlier
    while (h.size() && (dead.get(h.peek()) || 0) > 0) {
      const v = h.pop();
      dead.set(v, dead.get(v) - 1);
    }
  };
  const balance = () => {
    if (lowSize > highSize + 1) { high.push(low.pop()); lowSize--; highSize++; prune(low); }
    else if (lowSize < highSize) { low.push(high.pop()); highSize--; lowSize++; prune(high); }
  };

  const res = [];
  for (let i = 0; i < nums.length; i++) {
    const x = nums[i];
    if (!low.size() || x <= low.peek()) { low.push(x); lowSize++; }
    else { high.push(x); highSize++; }
    balance();
    if (i >= k) {
      const y = nums[i - k];
      dead.set(y, (dead.get(y) || 0) + 1);
      if (y <= low.peek()) { lowSize--; if (y === low.peek()) prune(low); }
      else { highSize--; if (y === high.peek()) prune(high); }
      balance();
    }
    // a Number holds the sum of two 32-bit ints exactly, so no overflow here
    if (i >= k - 1) res.push(k % 2 ? low.peek() : (low.peek() + high.peek()) / 2);
  }
  return res;
}
` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<double> medianSlidingWindow(vector<int>& nums, int k) {
        // A multiset is a sorted multiset with O(log k) insert and erase,
        // so one iterator can point at the middle of the window the whole time.
        multiset<int> win(nums.begin(), nums.begin() + k);
        auto mid = next(win.begin(), k / 2);           // upper middle element
        vector<double> res;
        for (int i = k;; i++) {
            // odd k: *mid twice; even k: the two middle values. Sum in double: no overflow.
            res.push_back(((double)*mid + *prev(mid, 1 - k % 2)) / 2.0);
            if (i == (int)nums.size()) break;
            win.insert(nums[i]);                       // equal values go after existing ones
            if (nums[i] < *mid) mid--;                 // new value landed left of mid
            if (nums[i - k] <= *mid) mid++;            // leaving value is left of (or at) mid
            win.erase(win.lower_bound(nums[i - k]));   // erase exactly one copy
        }
        return res;
    }
};
` },
        { lang: 'csharp', code: `using System;
using System.Collections.Generic;

public class Solution
{
    MinHeap<int> low = new MinHeap<int>((a, b) => b.CompareTo(a));   // smaller half, max on top
    MinHeap<int> high = new MinHeap<int>((a, b) => a.CompareTo(b));  // bigger half, min on top
    Dictionary<int, int> delayed = new Dictionary<int, int>();       // value -> copies to delete lazily
    int lowSize, highSize;                                           // live counts

    public double[] MedianSlidingWindow(int[] nums, int k)
    {
        double[] res = new double[nums.Length - k + 1];
        for (int i = 0; i < nums.Length; i++)
        {
            Add(nums[i]);
            if (i >= k) Remove(nums[i - k]);
            if (i >= k - 1) res[i - k + 1] = Median(k);
        }
        return res;
    }

    private void Add(int x)
    {
        if (low.Count == 0 || x <= low.Peek()) { low.Push(x); lowSize++; }
        else { high.Push(x); highSize++; }
        Balance();
    }

    private void Remove(int x)
    {
        int c; delayed.TryGetValue(x, out c); delayed[x] = c + 1;
        if (x <= low.Peek()) { lowSize--; if (x == low.Peek()) Prune(low); }
        else { highSize--; if (x == high.Peek()) Prune(high); }
        Balance();
    }

    private void Balance()
    {
        if (lowSize > highSize + 1) { high.Push(low.Pop()); lowSize--; highSize++; Prune(low); }
        else if (lowSize < highSize) { low.Push(high.Pop()); highSize--; lowSize++; Prune(high); }
    }

    private void Prune(MinHeap<int> pq)
    {
        int c;
        while (pq.Count > 0 && delayed.TryGetValue(pq.Peek(), out c) && c > 0)
        {
            int v = pq.Pop();
            if (c == 1) delayed.Remove(v); else delayed[v] = c - 1;
        }
    }

    private double Median(int k)
    {
        return k % 2 == 1 ? low.Peek() : ((double)low.Peek() + high.Peek()) / 2.0;
    }
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }
      ],
      dry: {
        head: ['i', 'add', 'remove', 'live low | high', 'median'],
        rows: [
          ['2', '-1', '-', '{1, -1} | {3}', '<span class="c-p">1</span>'],
          ['3', '-3', '1 (delayed)', '{-1, -3} | {3}', '<span class="c-p">-1</span>'],
          ['4', '5', '3', '{-1, -3} | {5}', '<span class="c-p">-1</span>'],
          ['5', '3', '-1', '{3, -3} | {5}', '<span class="c-p">3</span>'],
          ['6', '6', '-3', '{5, 3} | {6}', '<span class="c-p">5</span>'],
          ['7', '7', '5', '{6, 3} | {7}', '<span class="c-p">6</span>']
        ]
      },
      complexity: `<p><b>Time O(N log N)</b> amortized (each value is pushed and popped at most once; heaps may temporarily hold dead values). <b>Space O(N)</b> worst case.</p>`,
      followUps: ['Use two TreeMaps (multiset) instead — what changes?', 'Sliding window 90th percentile.']
    }
  });

  practice.push({
    title: 'Word Search II',
    level: 'Hard',
    tags: ['trie', 'backtracking', 'dfs', 'grid'],
    companies: ['Microsoft', 'Amazon', 'Airbnb', 'Uber'],
    statement: `<p>Given an m × n board of letters and a list of words, return all words that can be formed by a path of horizontally or vertically adjacent cells, using each cell at most once per word.</p>`,
    constraints: `1 ≤ m, n ≤ 12, 1 ≤ words ≤ 3·10<sup>4</sup>, word length ≤ 10, lowercase letters, words are distinct`,
    example: `${H.table(['', '0', '1', '2', '3'], [['0', 'o', 'a', 'a', 'n'], ['1', 'e', 't', 'a', 'e'], ['2', 'i', 'h', 'k', 'r'], ['3', 'i', 'f', 'l', 'v']])}<p>words = [oath, pea, eat, rain] → ${H.c('p', '[oath, eat]')}. <b>Why:</b> o(0,0) → a(0,1) → t(1,1) → h(2,1) spells oath; e(1,3) → a(1,2) → t(1,1) spells eat; no p exists and “rain” has no connected path.</p>`,
    brute: {
      why: `<p>Run the single-word DFS (Word Search I) for each of the 3·10<sup>4</sup> words: each DFS can explore m·n·4·3<sup>L-1</sup> paths. Words sharing prefixes (“oath”, “oat”, “oak”) repeat identical work.</p>`,
      code: { lang: 'java', code: `
        class WordSearchSlow {
            public List<String> findWords(char[][] b, String[] words) {
                List<String> res = new ArrayList<>();
                for (String w : words) {
                    boolean found = false;
                    for (int r = 0; r < b.length && !found; r++)
                        for (int c = 0; c < b[0].length && !found; c++)
                            if (dfs(b, w, 0, r, c)) found = true;
                    if (found) res.add(w);
                }
                return res;
            }

            private boolean dfs(char[][] b, String w, int i, int r, int c) {
                if (i == w.length()) return true;
                if (r < 0 || c < 0 || r >= b.length || c >= b[0].length || b[r][c] != w.charAt(i)) return false;
                char t = b[r][c];
                b[r][c] = '#';                                     // mark used
                boolean ok = dfs(b, w, i + 1, r + 1, c) || dfs(b, w, i + 1, r - 1, c)
                          || dfs(b, w, i + 1, r, c + 1) || dfs(b, w, i + 1, r, c - 1);
                b[r][c] = t;                                       // unmark
                return ok;
            }
        }`, alt: [
          { lang: 'python', code: `def find_words(b, words):
    def dfs(w, i, r, c):
        if i == len(w):
            return True
        if r < 0 or c < 0 or r >= len(b) or c >= len(b[0]) or b[r][c] != w[i]:
            return False
        t = b[r][c]
        b[r][c] = '#'                                # mark used
        ok = (dfs(w, i + 1, r + 1, c) or dfs(w, i + 1, r - 1, c)
              or dfs(w, i + 1, r, c + 1) or dfs(w, i + 1, r, c - 1))
        b[r][c] = t                                  # unmark
        return ok

    res = []
    for w in words:
        found = False
        for r in range(len(b)):
            for c in range(len(b[0])):
                if not found and dfs(w, 0, r, c):
                    found = True
        if found:
            res.append(w)
    return res` },
          { lang: 'js', code: `function findWords(b, words) {
  function dfs(w, i, r, c) {
    if (i === w.length) return true;
    if (r < 0 || c < 0 || r >= b.length || c >= b[0].length || b[r][c] !== w[i]) return false;
    const t = b[r][c];
    b[r][c] = '#';                                   // mark used
    const ok = dfs(w, i + 1, r + 1, c) || dfs(w, i + 1, r - 1, c)
            || dfs(w, i + 1, r, c + 1) || dfs(w, i + 1, r, c - 1);
    b[r][c] = t;                                     // unmark
    return ok;
  }

  const res = [];
  for (const w of words) {
    let found = false;
    for (let r = 0; r < b.length && !found; r++)
      for (let c = 0; c < b[0].length && !found; c++)
        if (dfs(w, 0, r, c)) found = true;
    if (found) res.push(w);
  }
  return res;
}` },
          { lang: 'cpp', code: `bool dfs(vector<vector<char>>& b, const string& w, int i, int r, int c) {
    if (i == (int)w.size()) return true;
    if (r < 0 || c < 0 || r >= (int)b.size() || c >= (int)b[0].size() || b[r][c] != w[i]) return false;
    char t = b[r][c];
    b[r][c] = '#';                                   // mark used
    bool ok = dfs(b, w, i + 1, r + 1, c) || dfs(b, w, i + 1, r - 1, c)
           || dfs(b, w, i + 1, r, c + 1) || dfs(b, w, i + 1, r, c - 1);
    b[r][c] = t;                                     // unmark
    return ok;
}

vector<string> findWords(vector<vector<char>>& b, vector<string>& words) {
    vector<string> res;
    for (const string& w : words) {
        bool found = false;
        for (int r = 0; r < (int)b.size() && !found; r++)
            for (int c = 0; c < (int)b[0].size() && !found; c++)
                if (dfs(b, w, 0, r, c)) found = true;
        if (found) res.push_back(w);
    }
    return res;
}` },
          { lang: 'csharp', code: `class WordSearchSlow
{
    public List<string> FindWords(char[][] b, string[] words)
    {
        var res = new List<string>();
        foreach (string w in words)
        {
            bool found = false;
            for (int r = 0; r < b.Length && !found; r++)
                for (int c = 0; c < b[0].Length && !found; c++)
                    if (Dfs(b, w, 0, r, c)) found = true;
            if (found) res.Add(w);
        }
        return res;
    }

    private bool Dfs(char[][] b, string w, int i, int r, int c)
    {
        if (i == w.Length) return true;
        if (r < 0 || c < 0 || r >= b.Length || c >= b[0].Length || b[r][c] != w[i]) return false;
        char t = b[r][c];
        b[r][c] = '#';                                     // mark used
        bool ok = Dfs(b, w, i + 1, r + 1, c) || Dfs(b, w, i + 1, r - 1, c)
               || Dfs(b, w, i + 1, r, c + 1) || Dfs(b, w, i + 1, r, c - 1);
        b[r][c] = t;                                       // unmark
        return ok;
    }
}` }
        ] }
    },
    mcq: { q: 'What does the trie give the board DFS?', options: ['Instant pruning: stop as soon as the path is not a prefix of any word', 'Faster neighbour lookup', 'Sorting of the output', 'Nothing; it is only for storage'], answer: 0, explain: 'One DFS from each cell walks the trie in parallel. If the current node has no child for the next letter, no word can continue, so the branch dies immediately.' },
    hints: [
      `<p>Search all words at once: build a trie and DFS the board while walking the trie.</p>`,
      `<p>Store the full word at its end node (<code>node.word</code>). When the DFS reaches a node with a word, add it and set <code>node.word = null</code> to avoid duplicates.</p>`,
      `<p>Optimisations: mark visited cells with '#' and restore; prune trie leaves after a word is found (decrement a child count) so later DFS does not re-enter dead branches. Recipe: build trie; for each cell dfs(r, c, root): ch = board; next = node.kid[ch]; if null return; if next.word → add; mark; recurse 4 ways; unmark.</p>`
    ],
    tests: { sig: 'char[][] string[] -> list<string>', fn: 'findWords', cmp: 'set', cases: [
      [[[['o', 'a', 'a', 'n'], ['e', 't', 'a', 'e'], ['i', 'h', 'k', 'r'], ['i', 'f', 'l', 'v']], ['oath', 'pea', 'eat', 'rain']], ['oath', 'eat']],
      [[[['a', 'b'], ['c', 'd']], ['abcb']], []],
      [[[['a']], ['a']], ['a']],
      [[[['a', 'b'], ['c', 'd']], ['abdc', 'abcd', 'acdb', 'ab', 'dcba', 'bd']], ['abdc', 'acdb', 'ab', 'bd']],
      [[[['o', 'a', 'a', 'n'], ['e', 't', 'a', 'e'], ['i', 'h', 'k', 'r'], ['i', 'f', 'l', 'v']], ['oath', 'oat', 'oa', 'eta', 'kale']], ['oath', 'oat', 'oa', 'eta']],
      [[[['a', 'a']], ['aaa', 'aa', 'a']], ['aa', 'a']],
      [[[['a', 'a', 'a', 'a', 'a'], ['a', 'a', 'a', 'a', 'a'], ['a', 'a', 'a', 'a', 'a'], ['a', 'a', 'a', 'a', 'a'], ['a', 'a', 'a', 'a', 'a']], ['aaaaaaaaaa', 'aaaaaaaaab', 'b']], ['aaaaaaaaaa']]
    ] },
    solution: {
      approach: `<p>Trie of all words + backtracking DFS from every cell, pruned by the trie.</p>`,
      code: `
        class Solution {
            private final List<String> res = new ArrayList<>();

            public List<String> findWords(char[][] board, String[] words) {
                Node root = new Node();
                for (String w : words) {                          // build trie
                    Node cur = root;
                    for (char ch : w.toCharArray()) {
                        int c = ch - 'a';
                        if (cur.kid[c] == null) cur.kid[c] = new Node();
                        cur = cur.kid[c];
                    }
                    cur.word = w;                                 // full word stored at its end
                }
                for (int r = 0; r < board.length; r++)
                    for (int c = 0; c < board[0].length; c++)
                        dfs(board, r, c, root);
                return res;
            }

            private void dfs(char[][] b, int r, int c, Node node) {
                if (r < 0 || c < 0 || r >= b.length || c >= b[0].length) return;
                char ch = b[r][c];
                if (ch == '#') return;                            // already on the path
                Node next = node.kid[ch - 'a'];
                if (next == null) return;                         // no word continues: prune
                if (next.word != null) { res.add(next.word); next.word = null; } // found, no duplicates
                b[r][c] = '#';                                    // choose
                dfs(b, r + 1, c, next); dfs(b, r - 1, c, next);   // explore
                dfs(b, r, c + 1, next); dfs(b, r, c - 1, next);
                b[r][c] = ch;                                     // un-choose
            }

            static class Node { Node[] kid = new Node[26]; String word; }

            public static void main(String[] args) {
                char[][] board = {{'o', 'a', 'a', 'n'}, {'e', 't', 'a', 'e'}, {'i', 'h', 'k', 'r'}, {'i', 'f', 'l', 'v'}};
                System.out.println(new Solution().findWords(board, new String[]{"oath", "pea", "eat", "rain"}));
            }
        }`,
      alt: [
        { lang: 'python', code: `def find_words(board, words):
    WORD = '$'                            # key that stores the full word at its end node
    trie = {}
    for w in words:                       # build the trie (dict of dicts)
        node = trie
        for ch in w:
            node = node.setdefault(ch, {})
        node[WORD] = w
    rows, cols, res = len(board), len(board[0]), []

    def dfs(r, c, parent):
        ch = board[r][c]
        node = parent.get(ch)
        if node is None:
            return                        # no word continues: prune
        if WORD in node:
            res.append(node.pop(WORD))    # found; popping avoids duplicates
        board[r][c] = '#'                 # choose
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] != '#':
                dfs(nr, nc, node)         # explore (depth is at most the word length)
        board[r][c] = ch                  # un-choose
        if not node:
            del parent[ch]                # branch is used up: never walk it again

    for r in range(rows):
        for c in range(cols):
            dfs(r, c, trie)
    return res
` },
        { lang: 'js', code: `function findWords(board, words) {
  const newNode = () => ({ kids: new Map(), word: null });
  const root = newNode();
  for (const w of words) {                // build the trie
    let cur = root;
    for (const ch of w) {
      if (!cur.kids.has(ch)) cur.kids.set(ch, newNode());
      cur = cur.kids.get(ch);
    }
    cur.word = w;                         // full word stored at its end
  }
  const rows = board.length, cols = board[0].length, res = [];
  const dfs = (r, c, node) => {
    if (r < 0 || c < 0 || r >= rows || c >= cols) return;
    const ch = board[r][c];
    if (ch === '#') return;               // already on the path
    const next = node.kids.get(ch);
    if (!next) return;                    // no word continues: prune
    if (next.word !== null) { res.push(next.word); next.word = null; }  // no duplicates
    board[r][c] = '#';                    // choose
    dfs(r + 1, c, next); dfs(r - 1, c, next);
    dfs(r, c + 1, next); dfs(r, c - 1, next);
    board[r][c] = ch;                     // un-choose
  };
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) dfs(r, c, root);
  return res;
}
` },
        { lang: 'cpp', code: `class Solution {
    struct Node {
        array<unique_ptr<Node>, 26> kid;
        string word;                      // non-empty at the end of a word
    };
    vector<string> res;

    void dfs(vector<vector<char>>& b, int r, int c, Node* node) {
        if (r < 0 || c < 0 || r >= (int)b.size() || c >= (int)b[0].size()) return;
        char ch = b[r][c];
        if (ch == '#') return;            // already on the path
        Node* next = node->kid[ch - 'a'].get();
        if (!next) return;                // no word continues: prune
        if (!next->word.empty()) { res.push_back(next->word); next->word.clear(); }  // no duplicates
        b[r][c] = '#';                    // choose
        dfs(b, r + 1, c, next); dfs(b, r - 1, c, next);
        dfs(b, r, c + 1, next); dfs(b, r, c - 1, next);
        b[r][c] = ch;                     // un-choose
    }

public:
    vector<string> findWords(vector<vector<char>>& board, vector<string>& words) {
        Node root;
        for (const string& w : words) {   // build the trie
            Node* cur = &root;
            for (char ch : w) {
                auto& next = cur->kid[ch - 'a'];
                if (!next) next = make_unique<Node>();
                cur = next.get();
            }
            cur->word = w;
        }
        for (int r = 0; r < (int)board.size(); r++)
            for (int c = 0; c < (int)board[0].size(); c++)
                dfs(board, r, c, &root);
        return res;
    }
};
` },
        { lang: 'csharp', code: `using System.Collections.Generic;

public class Solution
{
    private readonly List<string> res = new List<string>();

    public IList<string> FindWords(char[][] board, string[] words)
    {
        var root = new Node();
        foreach (string w in words)                       // build trie
        {
            Node cur = root;
            foreach (char ch in w)
            {
                int c = ch - 'a';
                if (cur.kid[c] == null) cur.kid[c] = new Node();
                cur = cur.kid[c];
            }
            cur.word = w;                                 // full word stored at its end
        }
        for (int r = 0; r < board.Length; r++)
            for (int c = 0; c < board[0].Length; c++)
                Dfs(board, r, c, root);
        return res;
    }

    private void Dfs(char[][] b, int r, int c, Node node)
    {
        if (r < 0 || c < 0 || r >= b.Length || c >= b[0].Length) return;
        char ch = b[r][c];
        if (ch == '#') return;                            // already on the path
        Node next = node.kid[ch - 'a'];
        if (next == null) return;                         // no word continues: prune
        if (next.word != null) { res.Add(next.word); next.word = null; } // found, no duplicates
        b[r][c] = '#';                                    // choose
        Dfs(b, r + 1, c, next); Dfs(b, r - 1, c, next);   // explore
        Dfs(b, r, c + 1, next); Dfs(b, r, c - 1, next);
        b[r][c] = ch;                                     // un-choose
    }

    class Node { public Node[] kid = new Node[26]; public string word; }
}` }
      ],
      dry: {
        head: ['start cell', 'path', 'trie node', 'result'],
        rows: [
          ['(0,0) o', 'o → a(0,1) → t(1,1) → h(2,1)', '"oath" has word', '<span class="c-g">add oath</span>'],
          ['(0,1) a', 'a', 'no word starts with a', 'pruned at once'],
          ['(1,0) e', 'e → neighbours i, t, o', 'no child i/t/o under e', 'pruned'],
          ['(1,3) e', 'e → a(1,2) → t(1,1)', '"eat" has word', '<span class="c-g">add eat</span>'],
          ['(2,3) r', 'r → a? neighbours e, k, v', 'no child', 'rain not found']
        ]
      },
      complexity: `<p><b>Time</b> O(m · n · 4 · 3<sup>L-1</sup>) worst case (L = max word length), but pruning makes it far smaller in practice; building the trie is O(total letters). <b>Space</b> O(total letters) for the trie + O(L) recursion.</p>`,
      followUps: ['Remove leaf nodes after finding a word — why does it help on boards full of the same letter?', 'Boggle with diagonal moves.']
    }
  });

  practice.push({
    title: 'Maximum XOR With an Element From Array',
    level: 'Hard',
    tags: ['binary trie', 'offline queries', 'sorting', 'bit manipulation'],
    companies: ['Google', 'Amazon'],
    statement: `<p>Given an array <code>nums</code> of non-negative integers and queries <code>[x, m]</code>, answer each query with the maximum of <code>x XOR nums[j]</code> over all <code>nums[j] ≤ m</code>, or <code>-1</code> if every element is greater than m.</p>`,
    constraints: `1 ≤ N, Q ≤ 10<sup>5</sup>, 0 ≤ nums[j], x, m ≤ 10<sup>9</sup>`,
    example: `<p>nums = [0, 1, 2, 3, 4], queries = [[3, 1], [1, 3], [5, 6]] → ${H.c('p', '[3, 3, 7]')}.</p>${H.table(['query', 'allowed nums', 'best'], [['x = 3, m = 1', '0, 1', '3 ^ 0 = 3'], ['x = 1, m = 3', '0, 1, 2, 3', '1 ^ 2 = 3'], ['x = 5, m = 6', '0..4', '5 ^ 2 = 7']])}`,
    brute: {
      why: `<p>For each query scan all nums: O(N · Q) = 10<sup>10</sup>. The waste: each query rebuilds knowledge about which numbers are allowed and which have opposite high bits.</p>`,
      code: { lang: 'java', code: `
        int[] maximizeXorSlow(int[] nums, int[][] queries) {
            int[] ans = new int[queries.length];
            for (int q = 0; q < queries.length; q++) {
                int best = -1;
                for (int v : nums) if (v <= queries[q][1]) best = Math.max(best, v ^ queries[q][0]);
                ans[q] = best;
            }
            return ans;
        }`, alt: [
          { lang: 'python', code: `def maximize_xor(nums, queries):
    ans = []
    for x, m in queries:
        best = -1
        for v in nums:
            if v <= m:
                best = max(best, v ^ x)
        ans.append(best)
    return ans` },
          { lang: 'js', code: `function maximizeXor(nums, queries) {
  const ans = [];
  for (const [x, m] of queries) {
    let best = -1;
    for (const v of nums) if (v <= m) best = Math.max(best, v ^ x);
    ans.push(best);
  }
  return ans;
}` },
          { lang: 'cpp', code: `vector<int> maximizeXor(vector<int>& nums, vector<vector<int>>& queries) {
    vector<int> ans;
    for (auto& q : queries) {
        int best = -1;
        for (int v : nums) if (v <= q[1]) best = max(best, v ^ q[0]);
        ans.push_back(best);
    }
    return ans;
}` },
          { lang: 'csharp', code: `int[] MaximizeXorSlow(int[] nums, int[][] queries)
{
    int[] ans = new int[queries.Length];
    for (int q = 0; q < queries.Length; q++)
    {
        int best = -1;
        foreach (int v in nums) if (v <= queries[q][1]) best = Math.Max(best, v ^ queries[q][0]);
        ans[q] = best;
    }
    return ans;
}` }
        ] }
    },
    mcq: { q: 'How do you make "only nums ≤ m" easy for a trie?', options: ['Answer queries offline sorted by m, inserting nums in ascending order as they become allowed', 'Build one trie per query', 'Delete numbers greater than m after each query', 'Sort nums descending and insert all'], answer: 0, explain: 'With queries sorted by m, the allowed set only grows. Insert each number once when its turn comes; every query then sees exactly the numbers ≤ its m.' },
    hints: [
      `<p>The constraint only grows if you process queries in increasing m — think “offline”.</p>`,
      `<p>Sort nums. Sort query indices by m. Pointer j inserts nums[j] into a binary trie while nums[j] ≤ m. Then run the greedy opposite-bit query.</p>`,
      `<p>If nothing is inserted yet, answer -1. Values ≤ 10<sup>9</sup> &lt; 2<sup>30</sup>, so bits 29..0 suffice (30..0 is also safe). Use a flat array trie sized (N · 31 + 1) × 2 to avoid millions of objects.</p>`
    ],
    tests: { sig: 'int[] int[][] -> int[]', fn: 'maximizeXor', cases: [
      [[[0, 1, 2, 3, 4], [[3, 1], [1, 3], [5, 6]]], [3, 3, 7]],
      [[[5, 2, 4, 6, 6, 3], [[12, 4], [8, 1], [6, 3]]], [15, -1, 5]],
      [[[7], [[1, 6], [1, 7]]], [-1, 6]],
      [[[1000000000], [[0, 1000000000], [1000000000, 999999999]]], [1000000000, -1]],
      [[[0, 536870912], [[1000000000, 1000000000], [0, 0]]], [1000000000, 0]],
      [[[3, 3, 3], [[3, 3], [0, 2], [4, 1000000000]]], [0, -1, 7]],
      [[{ $range: [0, 100000] }, [[0, 99999], [99999, 99999], [131071, 5], [65536, 65535]]], [99999, 131071, 131071, 131071]]
    ] },
    solution: {
      approach: `<p>Offline: sort nums and queries by m; incremental binary trie; greedy query.</p>`,
      code: `
        class Solution {
            public int[] maximizeXor(int[] nums, int[][] queries) {
                Arrays.sort(nums);
                int q = queries.length;
                Integer[] order = new Integer[q];
                for (int i = 0; i < q; i++) order[i] = i;
                Arrays.sort(order, (a, b) -> Integer.compare(queries[a][1], queries[b][1])); // by m
                int[][] trie = new int[nums.length * 31 + 1][2];   // node -> children, 0 = none
                int nodes = 1, j = 0;
                int[] ans = new int[q];
                for (int id : order) {
                    int x = queries[id][0], m = queries[id][1];
                    while (j < nums.length && nums[j] <= m) {       // insert newly allowed numbers
                        int cur = 0;
                        for (int b = 30; b >= 0; b--) {
                            int bit = (nums[j] >> b) & 1;
                            if (trie[cur][bit] == 0) trie[cur][bit] = nodes++;
                            cur = trie[cur][bit];
                        }
                        j++;
                    }
                    if (j == 0) { ans[id] = -1; continue; }          // nothing allowed
                    int cur = 0, xr = 0;
                    for (int b = 30; b >= 0; b--) {                  // greedy opposite bit
                        int bit = (x >> b) & 1;
                        if (trie[cur][bit ^ 1] != 0) { xr |= 1 << b; cur = trie[cur][bit ^ 1]; }
                        else cur = trie[cur][bit];
                    }
                    ans[id] = xr;
                }
                return ans;
            }

            public static void main(String[] args) {
                System.out.println(Arrays.toString(new Solution().maximizeXor(new int[]{0, 1, 2, 3, 4},
                    new int[][]{{3, 1}, {1, 3}, {5, 6}})));   // [3, 3, 7]
            }
        }`,
      alt: [
        { lang: 'python', code: `def maximize_xor(nums, queries):
    nums = sorted(nums)
    order = sorted(range(len(queries)), key=lambda i: queries[i][1])   # answer queries by m
    TOP = 30                              # values <= 10^9 < 2^30
    kids = [[0, 0]]                       # flat trie: node -> [child0, child1]; 0 = none
    ans = [-1] * len(queries)
    j = 0
    for qi in order:
        x, m = queries[qi]
        while j < len(nums) and nums[j] <= m:    # insert newly allowed numbers
            node = 0
            for b in range(TOP, -1, -1):
                bit = (nums[j] >> b) & 1
                if not kids[node][bit]:
                    kids[node][bit] = len(kids)
                    kids.append([0, 0])
                node = kids[node][bit]
            j += 1
        if j == 0:
            continue                      # nothing allowed: stays -1
        node = xr = 0
        for b in range(TOP, -1, -1):      # greedy opposite bit
            bit = (x >> b) & 1
            if kids[node][bit ^ 1]:
                xr |= 1 << b
                node = kids[node][bit ^ 1]
            else:
                node = kids[node][bit]
        ans[qi] = xr
    return ans
` },
        { lang: 'js', code: `function maximizeXor(nums, queries) {
  const sorted = [...nums].sort((a, b) => a - b);          // numeric comparator, not string order
  const order = queries.map((_, i) => i).sort((a, b) => queries[a][1] - queries[b][1]);  // by m
  const kids = new Int32Array((sorted.length * 31 + 1) * 2); // flat trie: node*2 + bit -> child
  let nodes = 1, j = 0;
  const ans = new Array(queries.length).fill(-1);
  for (const id of order) {
    const [x, m] = queries[id];
    while (j < sorted.length && sorted[j] <= m) {           // insert newly allowed numbers
      let cur = 0;
      for (let b = 30; b >= 0; b--) {
        const bit = (sorted[j] >> b) & 1;
        if (!kids[cur * 2 + bit]) kids[cur * 2 + bit] = nodes++;
        cur = kids[cur * 2 + bit];
      }
      j++;
    }
    if (j === 0) continue;                                  // nothing allowed: stays -1
    let cur = 0, xr = 0;
    for (let b = 30; b >= 0; b--) {                         // greedy opposite bit
      const want = ((x >> b) & 1) ^ 1;
      if (kids[cur * 2 + want]) { xr |= 1 << b; cur = kids[cur * 2 + want]; }
      else cur = kids[cur * 2 + (want ^ 1)];
    }
    ans[id] = xr;
  }
  return ans;
}
` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<int> maximizeXor(vector<int>& nums, vector<vector<int>>& queries) {
        sort(nums.begin(), nums.end());
        vector<int> order(queries.size());
        iota(order.begin(), order.end(), 0);
        sort(order.begin(), order.end(), [&](int a, int b) { return queries[a][1] < queries[b][1]; });  // by m
        vector<array<int, 2>> kids(1, {0, 0});   // flat trie: node -> {child0, child1}, 0 = none
        vector<int> ans(queries.size(), -1);
        size_t j = 0;
        for (int id : order) {
            int x = queries[id][0], m = queries[id][1];
            while (j < nums.size() && nums[j] <= m) {   // insert newly allowed numbers
                int cur = 0;
                for (int b = 30; b >= 0; b--) {
                    int bit = (nums[j] >> b) & 1;
                    if (!kids[cur][bit]) { kids[cur][bit] = (int)kids.size(); kids.push_back({0, 0}); }
                    cur = kids[cur][bit];
                }
                j++;
            }
            if (j == 0) continue;                       // nothing allowed: stays -1
            int cur = 0, xr = 0;
            for (int b = 30; b >= 0; b--) {             // greedy opposite bit
                int bit = (x >> b) & 1;
                if (kids[cur][bit ^ 1]) { xr |= 1 << b; cur = kids[cur][bit ^ 1]; }
                else cur = kids[cur][bit];
            }
            ans[id] = xr;
        }
        return ans;
    }
};
` },
        { lang: 'csharp', code: `using System;

public class Solution
{
    public int[] MaximizeXor(int[] nums, int[][] queries)
    {
        Array.Sort(nums);
        int q = queries.Length;
        int[] order = new int[q];
        for (int i = 0; i < q; i++) order[i] = i;
        Array.Sort(order, (a, b) => queries[a][1].CompareTo(queries[b][1])); // by m
        int[,] trie = new int[nums.Length * 31 + 1, 2];    // node -> children, 0 = none
        int nodes = 1, j = 0;
        int[] ans = new int[q];
        foreach (int id in order)
        {
            int x = queries[id][0], m = queries[id][1];
            while (j < nums.Length && nums[j] <= m)         // insert newly allowed numbers
            {
                int cur = 0;
                for (int b = 30; b >= 0; b--)
                {
                    int bit = (nums[j] >> b) & 1;
                    if (trie[cur, bit] == 0) trie[cur, bit] = nodes++;
                    cur = trie[cur, bit];
                }
                j++;
            }
            if (j == 0) { ans[id] = -1; continue; }          // nothing allowed
            int node = 0, xr = 0;
            for (int b = 30; b >= 0; b--)                    // greedy opposite bit
            {
                int bit = (x >> b) & 1;
                if (trie[node, bit ^ 1] != 0) { xr |= 1 << b; node = trie[node, bit ^ 1]; }
                else node = trie[node, bit];
            }
            ans[id] = xr;
        }
        return ans;
    }
}` }
      ],
      dry: {
        head: ['query (x, m)', 'inserted now', 'trie holds', 'greedy partner', 'answer'],
        rows: [
          ['(3, 1)', '0, 1', '{0, 1}', '0 (want bit1 = 0, bit0 = 0)', '<span class="c-p">3</span>'],
          ['(1, 3)', '2, 3', '{0, 1, 2, 3}', '2 (bit1: want 1 ✓, bit0: want 0 ✓)', '<span class="c-p">3</span>'],
          ['(5, 6)', '4', '{0..4}', '2 (bit2: want 0 ✓, bit1: want 1 ✓, bit0: want 0 ✓)', '<span class="c-p">7</span>']
        ]
      },
      complexity: `<p><b>Time O(N log N + Q log Q + (N + Q) · 31)</b>. <b>Space O(N · 31)</b> trie nodes.</p>`,
      followUps: ['Answer the queries online (in the given order): store the minimum value in each trie subtree and refuse branches whose minimum exceeds m.', 'Maximum XOR of a subarray, or of a pair within index range [l, r] (persistent trie).']
    }
  });

  // ================= QUIZ =================
  quiz.push(
    { q: 'In a 0-indexed array heap, what are the children of index 5?', options: ['11 and 12', '10 and 11', '6 and 7', '12 and 13'], answer: 0, explain: 'Left = 2·5 + 1 = 11, right = 2·5 + 2 = 12. The parent of 5 is (5 - 1) / 2 = 2.' },
    { q: 'Which array is a valid MIN-heap?', options: ['[1, 4, 2, 7, 5, 3]', '[1, 4, 2, 3, 5, 1]', '[2, 1, 3]', '[5, 6, 4]'], answer: 0, explain: 'In [1, 4, 2, 7, 5, 3]: 1 ≤ 4, 2; 4 ≤ 7, 5; 2 ≤ 3 → valid. [1, 4, 2, 3, 5, 1] breaks twice (4 &gt; 3 and 2 &gt; 1); in [2, 1, 3] and [5, 6, 4] the root is bigger than a child.' },
    { q: 'Building a heap from N given values bottom-up costs…', options: ['O(N)', 'O(N log N)', 'O(log N)', 'O(N<sup>2</sup>)'], answer: 0, explain: 'Most nodes are near the bottom and sink only a few levels; the sum N/4·1 + N/8·2 + … is at most N. Inserting one by one would be O(N log N).' },
    { q: 'To keep the K LARGEST elements of a stream you use…', options: ['A min-heap of size K', 'A max-heap of size K', 'A max-heap of all elements', 'A sorted linked list'], answer: 0, explain: 'The top must be the element to evict when something better arrives — the smallest of the K largest — so a min-heap.' },
    { q: 'What does <code>new PriorityQueue&lt;Integer&gt;()</code> return first on <code>poll()</code> after offering 5, 1, 9?', options: ['1', '9', '5', 'It depends on insertion order'], answer: 0, explain: 'Java’s PriorityQueue is a min-heap by natural order. Use Collections.reverseOrder() for a max-heap.' },
    { q: 'Why is <code>(a, b) -&gt; b - a</code> a risky max-heap comparator?', options: ['b - a can overflow for large magnitudes and flip the sign', 'It produces a min-heap', 'Lambdas are not allowed in PriorityQueue', 'It is slower than reverseOrder'], answer: 0, explain: 'With a = -2·10<sup>9</sup>, b = 2·10<sup>9</sup>, b - a overflows int and becomes negative. Integer.compare(b, a) is always correct.' },
    { q: 'Merging K sorted lists with N total nodes using a heap costs…', options: ['O(N log K)', 'O(N log N)', 'O(N K)', 'O(K log N)'], answer: 0, explain: 'Every node is pushed and popped once; the heap holds at most K nodes, so each operation is O(log K).' },
    { q: 'For the running median, the lower half is stored in a ___ and the upper half in a ___.', options: ['max-heap; min-heap', 'min-heap; max-heap', 'min-heap; min-heap', 'sorted array; hash set'], answer: 0, explain: 'The median lives at the boundary: the largest of the lower half (max-heap top) and the smallest of the upper half (min-heap top).' },
    { q: 'After inserting only "car" and "cart" into a trie, what is <code>search("ca")</code>?', options: ['false', 'true', 'Exception', 'Depends on the order of insertion'], answer: 0, explain: 'The path c → a exists, but no word ends at "ca" (isEnd is false), so search is false. startsWith("ca") would be true.' },
    { q: 'Time to search a word of length L in a trie holding N words?', options: ['O(L)', 'O(N)', 'O(L log N)', 'O(N · L)'], answer: 0, explain: 'You follow one child pointer per letter. The number of stored words does not matter.' },
    { q: 'Why does the greedy “take the opposite bit” walk find the maximum XOR?', options: ['Bit b is worth 2<sup>b</sup>, more than all lower bits combined (2<sup>b</sup> - 1)', 'XOR is commutative', 'The trie is balanced', 'Numbers are sorted in the trie'], answer: 0, explain: 'Making a higher bit 1 always beats any combination of lower bits, so deciding from the top down is never wrong.' },
    { q: 'Heap sort is…', options: ['O(N log N) worst case, in place, not stable', 'O(N) average, stable', 'O(N<sup>2</sup>) worst case, in place', 'O(N log N), stable, needs O(N) extra space'], answer: 0, explain: 'Build-heap O(N) + N extractions O(log N) each, done inside the array. Swapping the root to the end can reorder equal keys, so it is not stable.' },
    { q: 'Which PriorityQueue operation is O(N), not O(log N)?', options: ['remove(Object o)', 'poll()', 'offer(e)', 'peek()'], answer: 0, explain: 'remove(Object) must first search the array linearly to find the element. peek is O(1); offer and poll are O(log N).' }
  );

  // ================= INTERVIEW =================
  interview.push(
    { q: 'What is a heap and why is it stored in an array?', level: 'B', a: `<p>A binary heap is a <b>complete</b> binary tree (filled level by level, left to right) with the <b>heap order</b>: every parent ≤ its children in a min-heap (≥ in a max-heap). Because the tree has no gaps, level-order positions map perfectly to array indices: parent <code>(i-1)/2</code>, children <code>2i+1</code>, <code>2i+2</code>. No pointers, great memory locality, and growth is just an array resize. Peek is O(1), insert and extract are O(log N) because the height is ⌊log₂N⌋.</p>`, followUps: ['What changes with 1-based indexing?', 'Why must the tree be complete?'] },
    { q: 'Walk me through insert and extract-min.', level: 'B', a: `<p><b>Insert:</b> place the value at the end (keeps the shape), then <b>sift up</b>: while it is smaller than its parent, swap. <b>Extract-min:</b> save the root, move the last element to the root, shrink, then <b>sift down</b>: swap with the <b>smaller</b> child while larger than it. Choosing the smaller child guarantees the new parent is ≤ its sibling. Both walk one root-to-leaf path → O(log N).</p>`, followUps: ['Why the smaller child and not the left child?', 'How would you implement decrease-key?'] },
    { q: 'Prove that build-heap is O(N).', level: 'I', a: `<p>Bottom-up heapify calls sift-down on indices n/2-1 down to 0. A node at height h sinks at most h levels, and there are at most ⌈N/2<sup>h+1</sup>⌉ nodes of height h. Total work ≤ ∑ N/2<sup>h+1</sup> · h = (N/2) ∑ h/2<sup>h</sup> ≤ (N/2) · 2 = N. Intuition: half the nodes are leaves doing nothing, a quarter move one level, and only the root can move log N levels. Top-down inserts would be O(N log N) because the many leaves would take the long trips.</p>`, followUps: ['Why go from n/2-1 down to 0 and not upward?', 'Where do standard libraries use this internally?'] },
    { q: 'Kth largest element: compare the approaches.', level: 'I', a: `<p><b>Sort:</b> O(N log N), trivial. <b>Min-heap of size K:</b> O(N log K) time, O(K) memory, works on streams — my default. <b>Heapify all + K polls:</b> O(N + K log N). <b>Quickselect:</b> O(N) average, O(N<sup>2</sup>) worst case (mitigated with random pivots or introselect), in place but mutates the array. <b>Counting:</b> O(N + range) when values are small. I would code the heap and mention quickselect as the optimisation, discussing whether mutating input or worst-case guarantees matter.</p>`, followUps: ['Implement quickselect with Lomuto partitioning.', 'What if the data is spread over 100 machines?'] },
    { q: 'How do you make a max-heap in Java, and what are the comparator pitfalls?', level: 'B', a: `<p><code>new PriorityQueue&lt;&gt;(Collections.reverseOrder())</code> or <code>new PriorityQueue&lt;&gt;((a, b) -&gt; Integer.compare(b, a))</code>. Pitfalls: <code>b - a</code> overflows; iteration and <code>toString</code> are in heap order, not sorted; <code>remove(Object)</code>/<code>contains</code> are O(N); objects whose priority field changes while inside the queue corrupt the heap; ties come out in no guaranteed order — add a tie-breaker (e.g. a sequence number) if order matters; <code>poll()</code> returns null when empty, which crashes on unboxing. Other languages: Python pushes <code>-x</code> (or <code>(-key, item)</code> tuples) into <code>heapq</code>; C++ <code>priority_queue&lt;int&gt;</code> is already a max-heap; JS needs its own heap class with a “bigger first” comparator.</p>`, followUps: ['How do you do multi-key ordering?', 'Which queue would you use across threads?'] },
    { q: 'Merge K sorted lists — explain both optimal solutions.', level: 'I', a: `<p><b>Heap of heads:</b> push all non-null heads into a min-heap; repeatedly poll the smallest, append it to a dummy-headed result, and push its next node. Heap size ≤ K → O(N log K) time, O(K) space. <b>Divide and conquer:</b> merge lists pairwise in rounds (like merge sort); log K rounds, each touching all N nodes → O(N log K), O(1) extra if iterative. Merging one by one is O(N·K). The same K-way merge powers external sorting and LSM compaction.</p>`, followUps: ['How would you merge K sorted files that do not fit in memory?', 'What is a loser tree?'] },
    { q: 'Design a data structure for the median of a data stream.', level: 'I', a: `<p>Two heaps: <code>low</code> max-heap for the smaller half, <code>high</code> min-heap for the larger half, with invariants max(low) ≤ min(high) and size(low) ∈ {size(high), size(high)+1}. Add: push to low, move low's top to high, and if high is larger move its top back. Median: low's top if the count is odd, else the average of both tops (computed in long/double to avoid overflow). Add is O(log N), median O(1).</p>`, followUps: ['How do you support deletions (sliding window)?', 'What if 99% of numbers are in 0..100?', 'Exact p99 over billions of events?'] },
    { q: 'What is a trie and when would you choose it over a hash set (<code>HashSet</code> / <code>set</code> / <code>Set</code> / <code>unordered_set</code>)?', level: 'B', a: `<p>A trie is a tree where each edge is a character and each node marks whether a word ends there. Insert/search/startsWith are O(L) for a word of length L, independent of how many words are stored. A hash set also gives O(L) exact lookups with less memory, so I choose a trie when I need <b>prefix</b> operations (autocomplete, counting words with a prefix), <b>longest-prefix match</b> (routing tables, replace words), sorted traversal, or pruning a search (Word Search II).</p>`, followUps: ['How much memory does a 26-array trie use?', 'What is a radix tree?'] },
    { q: 'How would you build autocomplete returning the top 5 suggestions by popularity?', level: 'A', a: `<p>Trie of queries with a popularity count at word ends. Naive: walk to the prefix node, DFS its subtree, keep a min-heap of size 5 — O(P + subtree size), too slow for short prefixes like "a". Better: precompute at every node a list of its top-5 completions (merged bottom-up) so a query is O(P). Updates re-propagate along the path. At scale: shard by prefix, cache hot prefixes, rebuild the trie offline from logs periodically, and blend with personalisation/ML ranking. Sizes are bounded by storing only the top K per node.</p>`, followUps: ['How do you handle typos?', 'How often do you rebuild, and how do you deploy the new trie?'] },
    { q: 'Explain maximum XOR of two numbers using a binary trie.', level: 'A', a: `<p>Insert every number as a 31-bit path (bit 30 to 0) into a trie with children 0/1. For each x, walk from the top and prefer the child with the opposite bit; if it exists, that XOR bit becomes 1, else take the same bit. Greedy is correct because 2<sup>b</sup> exceeds the sum of all lower bits. Total O(N · 31) time, O(N · 31) nodes — use a flat two-column array (<code>int[][2]</code> in Java, <code>array&lt;int,2&gt;</code> in C++) to keep memory reasonable. Variants: max XOR subarray (prefix XORs), max XOR with element ≤ m (offline sorting), deletions (counts per node).</p>`, followUps: ['How do you handle negative numbers?', 'Can you do it without a trie (HashSet of prefixes)?'] },
    { q: 'How does Dijkstra use a priority queue, and why lazy deletion?', level: 'A', a: `<p>Dijkstra repeatedly takes the unvisited vertex with the smallest tentative distance — a min-heap keyed by distance. Library heaps (Java <code>PriorityQueue</code>, Python <code>heapq</code>, C++ <code>priority_queue</code>) have no decrease-key, so when we find a shorter distance we simply push a new (dist, node) pair. When polling, we skip entries whose distance is larger than the best known (stale entries). The heap may hold up to E entries, giving O(E log E) = O(E log V). An indexed heap with decrease-key gives O(E log V) with less memory; Fibonacci heaps give O(E + V log V) theoretically but are slow in practice.</p>`, followUps: ['What breaks with negative edges?', 'When is a plain array O(V²) Dijkstra better?'] },
    { q: 'You need to schedule tasks by priority, but equal-priority tasks must run FIFO. How?', level: 'I', a: `<p>A heap-based priority queue is not stable, so add a monotonically increasing sequence number at insertion time and order by (priority, sequence). Java: <code>Comparator.comparingInt((Task t) -&gt; t.priority).thenComparingLong(t -&gt; t.seq)</code>; Python: push tuples <code>(priority, seq, task)</code> into <code>heapq</code>; C++: a struct or tuple with <code>seq</code> as the last key; JS: a comparator that falls back to <code>seq</code>. This is how many job schedulers and event loops (timers with the same deadline) guarantee fairness. For multi-threaded producers use a thread-safe queue (Java <code>PriorityBlockingQueue</code>, Python <code>queue.PriorityQueue</code>) with the same ordering and an atomic counter.</p>`, followUps: ['How would you add aging so low-priority tasks do not starve?', 'How do delayed tasks (DelayQueue) work?'] },
    { q: 'In the AI era, where do heaps and tries show up in real systems?', level: 'E', a: `<p><b>Heaps:</b> top-k retrieval in vector search (keep the k best similarity scores while scanning or traversing an HNSW graph uses bounded heaps), top-k/top-p token sampling, request schedulers in LLM inference servers (priority and fairness queues), timers, Dijkstra/A* in routing and agent planning, K-way merges in LSM-based storage. <b>Tries:</b> tokenizer vocabularies with longest-match lookup, constrained/grammar decoding (mask tokens not allowed by a trie of valid outputs), autocomplete and search suggestions, IP routing. Knowing the complexity lets you judge AI-generated code that silently uses O(N) operations inside hot loops.</p>`, followUps: ['How would you constrain an LLM to output only valid product IDs?', 'Why does HNSW keep two heaps during search?'] }
  );

  // Spread correct answers across positions (deterministic rotation) so "always A" is never a pattern.
  function rotate(q, r) {
    if (!q || !q.options || !r) return;
    r = r % q.options.length;
    var correct = q.options[q.answer];
    q.options = q.options.slice(r).concat(q.options.slice(0, r));
    q.answer = q.options.indexOf(correct);
  }
  quiz.forEach(function (q, i) { rotate(q, i + 1); });
  var mc = 0;
  topics.forEach(function (t) { (t.problems || []).forEach(function (p) { rotate(p.mcq, ++mc); }); });
  practice.forEach(function (p) { rotate(p.mcq, ++mc); });

  registerModule({
    id: 'dsa15',
    title: 'Heaps (PriorityQueue) & Tries',
    intro: `<p>Some questions only ever ask “<b>what is the most important thing right now?</b>” — the smallest, the largest, the cheapest, the most urgent. Sorting everything again and again is wasteful. A <b>heap</b> keeps just enough order to answer that question in O(1) and to accept new items in O(log N). Other questions are all about <b>beginnings of words</b> — autocomplete, “starts with”, longest prefix. A <b>trie</b> answers those in time proportional to the word length, no matter how many words you store.</p>
      <p>In this module you will build a heap by hand (tree and array side by side), learn why heapify is O(N), sort with a heap, master your language's priority queue (Java <code>PriorityQueue</code>, Python <code>heapq</code>, C++ <code>priority_queue</code>, or a small JS heap class) and its ordering rules, and then apply the famous patterns: <b>Top-K</b>, <b>merge K sorted lists</b>, <b>running median with two heaps</b>, the <b>trie</b> for prefixes, and the <b>binary trie</b> for maximum XOR. Every topic has a visualizer, worked examples and interview clues.</p>`,
    goals: [
      'Draw any heap as a tree and as an array, and perform sift-up / sift-down by hand in O(log N)',
      'Explain why bottom-up heapify is O(N) and implement heap sort in place',
      'Use a library priority queue confidently (Java PriorityQueue, Python heapq, C++ priority_queue, a JS heap class): min vs max, safe comparators, multi-key ordering, and which operations are O(N)',
      'Recognise and code the Top-K, K-way merge and two-heap (running median) patterns from the wording of a question',
      'Implement a trie with insert / search / startsWith / autocomplete and extend nodes with counters',
      'Solve maximum-XOR problems with a binary trie and prove the greedy bit choice'
    ],
    prereqs: `DSA 4 (Bit Manipulation) for the XOR topic, DSA 7 (Sorting) for heap sort comparisons, DSA 8 (Hashing) for frequency maps, DSA 12 (Linked Lists) for merge K lists, and DSA 14 (Trees) for tree vocabulary.`,
    hours: 14,
    langNotes: {
      java: `<p><b>Java:</b> <code>PriorityQueue</code> is a <b>min</b>-heap; pass <code>Collections.reverseOrder()</code> or <code>(a, b) -&gt; Integer.compare(b, a)</code> for a max-heap. Never write <code>(a, b) -&gt; b - a</code>: it overflows near ±2<sup>31</sup>. <code>poll()</code>/<code>peek()</code> return <code>null</code> when empty (unboxing that into an <code>int</code> throws), iteration and <code>toString()</code> show heap order, not sorted order, and <code>remove(Object)</code>/<code>contains</code> are O(N). <code>new PriorityQueue&lt;&gt;(collection)</code> builds in O(N). <code>int</code> overflow wraps silently, so use <code>long</code> for rope costs and widen before averaging two medians. Recursion (trie DFS) is safe for word-length depth; the default stack holds about 10<sup>4</sup> frames. Object tries cost ~100+ bytes per node, so use a flat <code>int[][2]</code> for big binary tries.</p>`,
      python: `<p><b>Python:</b> <code>heapq</code> is a set of <b>min</b>-heap functions over a plain list: <code>heappush</code>, <code>heappop</code>, <code>heapify</code> (O(N)), <code>heap[0]</code> to peek. For a max-heap push <code>-x</code>; for priorities push tuples such as <code>(dist, i, item)</code>, adding an index so ties never compare items that cannot be compared (list nodes, dicts). <code>heapq.nlargest</code>/<code>nsmallest</code> give Top-K in one line and <code>heapq.merge</code> merges sorted inputs lazily. There is no built-in sorted multiset, so sliding-window median uses two heaps with lazy deletion. Integers never overflow. A dict of dicts (with a marker key like <code>'$'</code>) is the idiomatic trie. Recursion stops at <b>1000</b> frames by default; trie DFS here is only word-length deep, but for deeper searches use an explicit stack or <code>sys.setrecursionlimit</code>. <code>list.pop(0)</code> is O(N).</p>`,
      js: `<p><b>JavaScript:</b> there is <b>no built-in heap</b>. Every JS solution in this module carries the same small <code>MinHeap</code> class (<code>push</code>, <code>pop</code>, <code>peek</code>, <code>size</code>) whose constructor takes <code>less(a, b)</code>; pass <code>(a, b) =&gt; a &gt; b</code> for a max-heap and compare fields for pairs or nodes. <code>arr.sort()</code> without a comparator sorts as strings, so always pass <code>(a, b) =&gt; a - b</code>. <code>Number</code> is exact up to 2<sup>53</sup>, enough for rope costs here; past that use <code>BigInt</code>. Bit operators work on 32-bit signed ints, which is fine for 31-bit binary tries; an <code>Int32Array</code> makes a compact flat trie. <code>array.shift()</code> is O(N), and V8 allows roughly 10<sup>4</sup> recursive frames.</p>`,
      cpp: `<p><b>C++:</b> <code>priority_queue</code> is a <b>max</b>-heap by default, the opposite of Java; use <code>priority_queue&lt;int, vector&lt;int&gt;, greater&lt;int&gt;&gt;</code> for a min-heap. Its comparator returns true when the first argument should come out <b>later</b>. <code>pop()</code> returns nothing, so read <code>top()</code> first; pairs and tuples compare field by field. <code>make_heap</code>/<code>sort_heap</code>/<code>is_heap</code> work on any vector. <code>multiset</code> erases one exact copy with <code>s.erase(s.find(x))</code> in O(log N), which makes sliding-window median easy (<code>s.erase(x)</code> would remove <b>all</b> copies). Signed overflow is undefined behaviour, so use <code>long long</code> for sums and averages. Own trie nodes with <code>unique_ptr</code> or a flat <code>vector&lt;array&lt;int, 2&gt;&gt;</code>; the default stack is about 8 MB.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
