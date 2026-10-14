(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // ---------- small shared helpers for the visualizers ----------
  function parseNums(s, what, minLen, maxLen, lo, hi) {
    var t = String(s === undefined || s === null ? '' : s).trim();
    if (!t) throw new Error('Please type ' + what + ' (whole numbers separated by spaces).');
    var a = t.split(/[\s,]+/).map(Number);
    for (var i = 0; i < a.length; i++) {
      if (isNaN(a[i]) || Math.floor(a[i]) !== a[i]) throw new Error('Could not read ' + what + ': use whole numbers separated by spaces, e.g. "5 8 6 3".');
      if (a[i] < lo || a[i] > hi) throw new Error('Each value in ' + what + ' must be between ' + lo + ' and ' + hi + '.');
    }
    if (a.length < minLen || a.length > maxLen) throw new Error(what + ' must have ' + minLen + ' to ' + maxLen + ' values (got ' + a.length + ').');
    return a;
  }
  function splitBar(s, n, fmt) {
    var parts = String(s === undefined || s === null ? '' : s).split('|');
    if (parts.length !== n) throw new Error('Expected ' + n + ' parts separated by "|". Format: ' + fmt);
    return parts.map(function (x) { return x.trim(); });
  }
  function one(k, v) { var o = {}; o[k] = v; return o; }
  function copy(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }
  function show(v) { return v === Infinity ? '+∞' : v === -Infinity ? '−∞' : v; }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
  var OPS = {
    sum: { f: function (a, b) { return a + b; }, id: 0, sym: '+' },
    min: { f: function (a, b) { return Math.min(a, b); }, id: Infinity, sym: 'min' },
    max: { f: function (a, b) { return Math.max(a, b); }, id: -Infinity, sym: 'max' },
    gcd: { f: gcd, id: 0, sym: 'gcd' }
  };
  function getOp(name, allowed) {
    var k = String(name || '').trim().toLowerCase();
    if (allowed.indexOf(k) < 0) throw new Error('Operation must be one of: ' + allowed.join(', ') + ' (got "' + name + '").');
    return OPS[k];
  }
  function combineText(op, a, b, r) {
    if (op === OPS.sum) return show(a) + ' + ' + show(b) + ' = ' + show(r);
    return op.sym + '(' + show(a) + ', ' + show(b) + ') = ' + show(r);
  }
  // Segment tree layout in 0-based heap order (children 2k+1, 2k+2) — the order the tree part draws.
  function segLayout(n) {
    var L = [], R = [];
    (function go(k, l, r) {
      L[k] = l; R[k] = r;
      if (l === r) return;
      var m = (l + r) >> 1;
      go(2 * k + 1, l, m); go(2 * k + 2, m + 1, r);
    })(0, 0, n - 1);
    return { L: L, R: R, size: L.length };
  }
  function segArr(lay, vals) {
    var out = [];
    for (var k = 0; k < lay.size; k++) out.push(lay.L[k] === undefined ? null : (vals[k] === undefined ? '?' : show(vals[k])));
    return out;
  }
  function segTags(lay, extra) {
    var t = {};
    for (var k = 0; k < lay.size; k++) if (lay.L[k] !== undefined) {
      t[k] = lay.L[k] === lay.R[k] ? '[' + lay.L[k] + ']' : '[' + lay.L[k] + ',' + lay.R[k] + ']';
      if (extra && extra[k]) t[k] += ' ' + extra[k];
    }
    return t;
  }
  function rangeTxt(l, r) { return l === r ? '[' + l + ']' : '[' + l + ',' + r + ']'; }
  function lowbit(i) { return i & -i; }
  function log2floor(x) { var k = 0; while ((1 << (k + 1)) <= x) k++; return k; }

  // =====================================================================
  // TOPIC 1 — Segment tree: build, point update, range query
  // =====================================================================
  topics.push({
    title: 'Segment Tree I: Build, Point Update & Range Query',
    analogy: `<p>Think of a chain of <b>8 shops</b> and a company <b>org chart</b> above them. Each shop knows only its own sales. Above every two shops sits a <b>team lead</b> who knows the total of those two. Above two team leads sits a <b>regional manager</b> who knows the total of four shops. At the top, the <b>CEO</b> knows the total of all eight.</p>
      <p>Now two things keep happening all day:</p>
      <ul>
        <li><b>"What were the sales of shops 2 to 6?"</b> — you do not phone five shops. You phone the few managers whose whole team sits <i>inside</i> 2..6 and add up their numbers.</li>
        <li><b>"Shop 3 just sold more."</b> — only shop 3, its team lead, its regional manager and the CEO need to fix their numbers. Everybody else is untouched.</li>
      </ul>
      <p>That org chart is a <b>segment tree</b>. Every manager is a node, the "team" of a node is a range of the array, and both questions are answered by talking to about <b>log N</b> people instead of N.</p>`,
    explain: `<p><b>The problem it solves.</b> You have an array and you must handle, mixed together and many times, two kinds of requests: <b>change one element</b> and <b>ask about a range</b> (its sum, min, max, gcd…). Look at the two simple options first:</p>
      ${H.table(['approach', 'update a[i]', 'query a[l..r]', 'Q = 10<sup>5</sup> mixed requests on N = 10<sup>5</sup>'], [
        ['plain array', 'O(1)', H.c('r', 'O(N)'), H.c('r', '≈ 10<sup>10</sup> steps → TLE')],
        ['prefix sums', H.c('r', 'O(N) (rebuild the prefix)'), 'O(1)', H.c('r', '≈ 10<sup>10</sup> steps → TLE')],
        ['<b>segment tree</b>', H.c('g', 'O(log N)'), H.c('g', 'O(log N)'), H.c('g', '≈ 3.4 · 10<sup>6</sup> steps')]
      ])}
      <p>One is fast at updates, the other is fast at queries. A segment tree is the <b>compromise that is fast at both</b>.</p>
      <p><b>What it looks like.</b> The root owns the whole array <code>[0, N−1]</code>. Every node that owns <code>[l, r]</code> with <code>l &lt; r</code> splits at <code>mid = (l + r) / 2</code>: its left child owns <code>[l, mid]</code>, its right child owns <code>[mid+1, r]</code>. Leaves own a single index. Each node stores the <b>answer for its own range</b>. For <code>a = [5, 8, 6, 3, 2, 7, 2, 6]</code> and <b>sum</b>:</p>
      ${H.arr([5, 8, 6, 3, 2, 7, 2, 6], { label: 'a' })}
      ${H.table(['level', 'nodes (range → stored sum)'], [
        ['0 (root)', '[0,7] → 39'],
        ['1', '[0,3] → 22 &nbsp;·&nbsp; [4,7] → 17'],
        ['2', '[0,1] → 13 &nbsp;·&nbsp; [2,3] → 9 &nbsp;·&nbsp; [4,5] → 9 &nbsp;·&nbsp; [6,7] → 8'],
        ['3 (leaves)', '5 · 8 · 6 · 3 · 2 · 7 · 2 · 6']
      ])}
      <p><b>Storing it in an array.</b> No pointers needed: number the root <b>1</b>; node <code>k</code> has children <code>2k</code> and <code>2k+1</code> (exactly like a binary heap). Allocate <code>4N</code> slots and you will never run out.</p>
      <p><b>The three operations.</b></p>
      <ul>
        <li><b>Build — O(N).</b> Fill leaves with the array values, then every parent = <code>merge(left, right)</code>, bottom-up. There are about 2N nodes and each is computed once.</li>
        <li><b>Point update — O(log N).</b> Walk from the root down to the leaf of index <code>i</code> (go left if <code>i ≤ mid</code>, else right), change the leaf, then <b>recompute every node on the way back up</b>. Only the ancestors of that leaf can change — one node per level.</li>
        <li><b>Range query — O(log N).</b> At each node compare its range <code>[l, r]</code> with the question <code>[ql, qr]</code>:
          <ol>
            <li>${H.c('r', 'No overlap')} (<code>qr &lt; l</code> or <code>r &lt; ql</code>) → return the <b>identity</b> (0 for sum, +∞ for min, −∞ for max, 0 for gcd).</li>
            <li>${H.c('p', 'Fully inside')} (<code>ql ≤ l</code> and <code>r ≤ qr</code>) → return the stored value, <b>do not go deeper</b>.</li>
            <li>${H.c('y', 'Partial overlap')} → ask both children and merge their answers.</li>
          </ol>
        </li>
      </ul>
      <p><b>Worked query: sum of a[2..6].</b> Root [0,7] is partial → left child [0,3] partial → [0,1] no overlap (0), [2,3] fully inside (<b>9</b>). Right child [4,7] partial → [4,5] fully inside (<b>9</b>), [6,7] partial → leaf [6] inside (<b>2</b>), leaf [7] outside (0). Answer = 9 + 9 + 2 = <b>20</b>. We read only 3 stored values instead of adding 5 elements; for N = 10<sup>6</sup> it would be ~40 values instead of up to a million.</p>
      <p><b>What can a segment tree compute?</b> Any operation that is <b>associative</b> (<code>(x·y)·z = x·(y·z)</code>, so you may group pieces any way) and has an <b>identity</b> for the "no overlap" case: sum, product mod p, min, max, gcd, xor, and/or, matrix product, "count of zeros", or even a <b>custom struct</b> such as "best subarray sum inside this range". The operation does <i>not</i> need an inverse — that is exactly what makes the segment tree more powerful than a Fenwick tree (next topics).</p>`,
    clues: [
      '"<b>update an element</b>" <i>and</i> "<b>sum / min / max / gcd of a range</b>" mixed together → segment tree (or Fenwick if the op is sum/xor).',
      '<code>N, Q ≤ 10<sup>5</sup></code> or <code>2·10<sup>5</sup></code> with both updates and range queries → you need O(log N) per operation; O(N) per query is 10<sup>10</sup>.',
      '"<b>Range minimum / maximum with updates</b>" → segment tree; a Fenwick tree cannot undo a min, a sparse table cannot be updated.',
      '"Find the <b>first index</b> where the value is ≥ x" / "first position whose prefix sum reaches k" with updates → segment tree <b>descent</b> (walk down choosing a child), O(log N).',
      '"Each query asks for the <b>maximum subarray sum</b> / longest run / number of segments inside [l, r]" → segment tree with a <b>custom node</b> that merges two halves.',
      'The interviewer says "the array is <b>static</b>" → do <i>not</i> reach for a segment tree first; prefix sums or a sparse table are simpler and faster.'
    ],
    code: [`
      // Recursive segment tree for range SUM with point assignment.
      // Node numbering starts at 1: node k has children 2k (left) and 2k+1 (right).
      class SegmentTree {
          private final int n;
          private final long[] tree;            // tree[k] = sum of the range node k owns

          SegmentTree(int[] a) {
              n = a.length;
              tree = new long[4 * n];           // 4N slots are always enough
              build(a, 1, 0, n - 1);
          }

          private void build(int[] a, int node, int l, int r) {
              if (l == r) { tree[node] = a[l]; return; }          // leaf = one element
              int mid = l + (r - l) / 2;
              build(a, 2 * node, l, mid);                          // left half  [l, mid]
              build(a, 2 * node + 1, mid + 1, r);                  // right half [mid+1, r]
              tree[node] = tree[2 * node] + tree[2 * node + 1];    // parent = merge(children)
          }

          /** a[idx] = value in O(log N). */
          void update(int idx, int value) { update(1, 0, n - 1, idx, value); }

          private void update(int node, int l, int r, int idx, int value) {
              if (l == r) { tree[node] = value; return; }          // reached the leaf
              int mid = l + (r - l) / 2;
              if (idx <= mid) update(2 * node, l, mid, idx, value);
              else update(2 * node + 1, mid + 1, r, idx, value);
              tree[node] = tree[2 * node] + tree[2 * node + 1];    // repair this ancestor on the way up
          }

          /** sum of a[ql..qr] (inclusive) in O(log N). */
          long query(int ql, int qr) { return query(1, 0, n - 1, ql, qr); }

          private long query(int node, int l, int r, int ql, int qr) {
              if (qr < l || r < ql) return 0;                      // 1) no overlap: identity of sum
              if (ql <= l && r <= qr) return tree[node];           // 2) fully inside: take it whole
              int mid = l + (r - l) / 2;                           // 3) partial: ask both children
              return query(2 * node, l, mid, ql, qr) + query(2 * node + 1, mid + 1, r, ql, qr);
          }

          public static void main(String[] args) {
              SegmentTree st = new SegmentTree(new int[]{5, 8, 6, 3, 2, 7, 2, 6});
              System.out.println(st.query(2, 6));   // 20
              st.update(3, 10);
              System.out.println(st.query(2, 6));   // 27
          }
      }`, `
      // Bottom-up (iterative) segment tree for range MIN — short, fast, no recursion.
      // Leaves live at t[n .. 2n-1]; node p has children 2p and 2p+1; works for ANY n (not only powers of 2).
      class MinSegTree {
          private final int n;
          private final int[] t;

          MinSegTree(int[] a) {
              n = a.length;
              t = new int[2 * n];
              for (int i = 0; i < n; i++) t[n + i] = a[i];                       // copy leaves
              for (int p = n - 1; p >= 1; p--) t[p] = Math.min(t[2 * p], t[2 * p + 1]); // parents, bottom-up
          }

          /** a[idx] = value: change the leaf, then climb to the root. */
          void set(int idx, int value) {
              int p = idx + n;
              t[p] = value;
              for (p >>= 1; p >= 1; p >>= 1) t[p] = Math.min(t[2 * p], t[2 * p + 1]);
          }

          /** min of a[l..r] inclusive. */
          int query(int l, int r) {
              int res = Integer.MAX_VALUE;                  // identity of min
              for (l += n, r += n + 1; l < r; l >>= 1, r >>= 1) { // half-open window [l, r) on each level
                  if ((l & 1) == 1) res = Math.min(res, t[l++]);   // l is a right child: its parent sticks out, take l now
                  if ((r & 1) == 1) res = Math.min(res, t[--r]);   // r-1 is a left child: its parent sticks out, take r-1 now
              }
              return res;
          }

          public static void main(String[] args) {
              MinSegTree st = new MinSegTree(new int[]{4, 6, 1, 5, 7, 3, 8, 2, 9});
              System.out.println(st.query(3, 6));   // 3
              st.set(5, 10);
              System.out.println(st.query(3, 6));   // 5
          }
      }`, { lang: 'python', run: true, title: 'Python version + random stress test against brute force (runnable)', code: `class SegTree:
    """Range-sum segment tree, recursive, node k has children 2k and 2k+1."""

    def __init__(self, a):
        self.n = len(a)
        self.t = [0] * (4 * self.n)
        self._build(a, 1, 0, self.n - 1)

    def _build(self, a, node, l, r):
        if l == r:
            self.t[node] = a[l]
            return
        m = (l + r) // 2
        self._build(a, 2 * node, l, m)
        self._build(a, 2 * node + 1, m + 1, r)
        self.t[node] = self.t[2 * node] + self.t[2 * node + 1]

    def update(self, i, v, node=1, l=0, r=None):
        if r is None:
            r = self.n - 1
        if l == r:
            self.t[node] = v
            return
        m = (l + r) // 2
        if i <= m:
            self.update(i, v, 2 * node, l, m)
        else:
            self.update(i, v, 2 * node + 1, m + 1, r)
        self.t[node] = self.t[2 * node] + self.t[2 * node + 1]

    def query(self, ql, qr, node=1, l=0, r=None):
        if r is None:
            r = self.n - 1
        if qr < l or r < ql:          # no overlap
            return 0
        if ql <= l and r <= qr:       # fully inside
            return self.t[node]
        m = (l + r) // 2              # partial overlap
        return self.query(ql, qr, 2 * node, l, m) + self.query(ql, qr, 2 * node + 1, m + 1, r)


import random

a = [5, 8, 6, 3, 2, 7, 2, 6]
st = SegTree(a)
print("sum a[2..6] =", st.query(2, 6))          # 20
st.update(3, 10)
a[3] = 10
print("after a[3] = 10:", st.query(2, 6))       # 27

random.seed(7)
for _ in range(3000):
    if random.random() < 0.5:
        i = random.randrange(len(a))
        v = random.randint(-9, 9)
        a[i] = v
        st.update(i, v)
    else:
        l = random.randrange(len(a))
        r = random.randrange(l, len(a))
        assert st.query(l, r) == sum(a[l:r + 1])
print("3000 random operations agree with brute force")` }],
    codeTitle: ['Recursive segment tree (sum) — the interview version', 'Iterative bottom-up segment tree (min) — the contest version', 'Python + stress test'],
    viz: [{
      title: 'Build the tree, then answer a range query (ranges shown under each node)',
      input: 'sum | 5 8 6 3 2 7 2 6 | 2 6',
      inputLabel: 'op (sum/min/max/gcd) | array (2–16 numbers, −99..99) | query l r (0-based)',
      gen: function (input) {
        var p = splitBar(input, 3, 'op | array | l r   e.g.  sum | 5 8 6 3 | 1 3');
        var op = getOp(p[0], ['sum', 'min', 'max', 'gcd']);
        var a = parseNums(p[1], 'the array', 2, 16, -99, 99);
        var q = parseNums(p[2], 'the query "l r"', 2, 2, 0, a.length - 1);
        var ql = q[0], qr = q[1];
        if (ql > qr) throw new Error('The query needs l ≤ r.');
        var n = a.length, lay = segLayout(n), val = {}, frames = [], tags = segTags(lay);
        function treePart(hl, label) { return { type: 'tree', label: label || 'segment tree (value inside, range below)', arr: segArr(lay, val), hl: hl || {}, tags: tags }; }
        frames.push({
          narr: 'We will build a <b>' + p[0].toLowerCase() + '</b> segment tree over ' + n + ' numbers. Every circle is a node; the tag under it is the <b>range it is responsible for</b>. "?" means "not computed yet". The root owns everything, each child owns one half of its parent.',
          parts: [{ type: 'array', label: 'a', values: a }, treePart({})]
        });
        var leafHl = {};
        for (var k = 0; k < lay.size; k++) if (lay.L[k] !== undefined && lay.L[k] === lay.R[k]) { val[k] = a[lay.L[k]]; leafHl[k] = 'ok'; }
        frames.push({ narr: 'Step 1 of the build: every <b>leaf</b> owns exactly one index, so it just copies <code>a[i]</code>.', parts: [{ type: 'array', label: 'a', values: a, hl: (function () { var h = {}; for (var i = 0; i < n; i++) h[i] = 'ok'; return h; })() }, treePart(leafHl)] });
        (function build(k) {
          var l = lay.L[k], r = lay.R[k];
          if (l === r) return;
          build(2 * k + 1); build(2 * k + 2);
          val[k] = op.f(val[2 * k + 1], val[2 * k + 2]);
          var hl = {}; hl[k] = 'ok'; hl[2 * k + 1] = 'win'; hl[2 * k + 2] = 'win';
          frames.push({ narr: 'Node ' + rangeTxt(l, r) + ' = merge(left child ' + rangeTxt(lay.L[2 * k + 1], lay.R[2 * k + 1]) + ', right child ' + rangeTxt(lay.L[2 * k + 2], lay.R[2 * k + 2]) + ') = ' + combineText(op, val[2 * k + 1], val[2 * k + 2], val[k]) + '. Children are always ready first (post-order), so each node is computed exactly once → build is O(N).',
            parts: [{ type: 'array', label: 'a', values: a, range: [l, r] }, treePart(hl)] });
        })(0);
        frames.push({ narr: 'Build finished: ' + (2 * n - 1) + ' nodes for ' + n + ' elements (always 2N − 1). Now the query <b>' + p[0].toLowerCase() + ' of a[' + ql + '..' + qr + ']</b>. Colours: ' + '<span class="c-y">amber = partial, go deeper</span>, <span class="c-p">purple = fully inside, take whole</span>, <span class="c-r">red = outside, ignore</span>.',
          parts: [{ type: 'array', label: 'a (query range in blue)', values: a, range: [ql, qr] }, treePart({})] });
        var acc = {}, ans = op.id, visited = 0, taken = [], takenIdx = {};
        (function query(k) {
          var l = lay.L[k], r = lay.R[k], hl, ahl = {}, i;
          visited++;
          if (qr < l || r < ql) {
            acc[k] = 'done'; hl = copy(acc); hl[k] = 'bad';
            for (i = l; i <= r; i++) ahl[i] = 'bad';
            for (i in takenIdx) ahl[i] = 'sel';
            frames.push({ narr: 'Node ' + rangeTxt(l, r) + ' does <b>not overlap</b> [' + ql + ',' + qr + '] → return the identity (' + show(op.id) + ') and stop. Nothing below it can matter.',
              parts: [{ type: 'array', label: 'a', values: a, range: [ql, qr], hl: ahl }, treePart(hl), { type: 'vars', label: 'query state', vals: { answer: show(ans), 'nodes visited': visited, 'values taken': taken.join(', ') || '—' } }] });
            return;
          }
          if (ql <= l && r <= qr) {
            ans = op.f(ans, val[k]); taken.push(show(val[k]));
            for (i = l; i <= r; i++) takenIdx[i] = 1;
            acc[k] = 'sel'; hl = copy(acc);
            for (i in takenIdx) ahl[i] = 'sel';
            frames.push({ narr: 'Node ' + rangeTxt(l, r) + ' is <b>fully inside</b> the query → take its stored value <b>' + show(val[k]) + '</b> in one step and do <i>not</i> visit its children. Running answer = ' + show(ans) + '.',
              parts: [{ type: 'array', label: 'a', values: a, range: [ql, qr], hl: ahl }, treePart(hl), { type: 'vars', label: 'query state', vals: { answer: show(ans), 'nodes visited': visited, 'values taken': taken.join(', ') } }] });
            return;
          }
          acc[k] = 'win'; hl = copy(acc); hl[k] = 'cur';
          for (i = l; i <= r; i++) ahl[i] = 'cur';
          for (i in takenIdx) ahl[i] = 'sel';
          frames.push({ narr: 'Node ' + rangeTxt(l, r) + ' only <b>partly</b> overlaps [' + ql + ',' + qr + '] → its stored value would include wrong elements, so split: ask the left child, then the right child.',
            parts: [{ type: 'array', label: 'a', values: a, range: [ql, qr], hl: ahl }, treePart(hl), { type: 'vars', label: 'query state', vals: { answer: show(ans), 'nodes visited': visited, 'values taken': taken.join(', ') || '—' } }] });
          query(2 * k + 1); query(2 * k + 2);
        })(0);
        frames.push({ narr: '<b>Answer = ' + show(ans) + '</b> from just ' + taken.length + ' stored value(s) and ' + visited + ' visited nodes. A plain loop would touch ' + (qr - ql + 1) + ' elements; the tree never visits more than ~4 nodes per level, so for N = 10<sup>6</sup> it is about 80 nodes instead of up to a million.',
          parts: [{ type: 'array', label: 'a', values: a, range: [ql, qr] }, treePart(copy(acc)), { type: 'vars', label: 'result', vals: { answer: show(ans), 'nodes visited': visited, 'plain loop would read': qr - ql + 1 } }] });
        return frames;
      }
    }, {
      title: 'Point update: walk down to the leaf, repair every ancestor on the way up',
      input: 'sum | 5 8 6 3 2 7 2 6 | 3 10',
      inputLabel: 'op (sum/min/max/gcd) | array (2–16 numbers) | index newValue',
      gen: function (input) {
        var p = splitBar(input, 3, 'op | array | index value   e.g.  sum | 5 8 6 3 | 2 9');
        var op = getOp(p[0], ['sum', 'min', 'max', 'gcd']);
        var a = parseNums(p[1], 'the array', 2, 16, -99, 99);
        var u = parseNums(p[2], '"index value"', 2, 2, -99, 99);
        var idx = u[0], nv = u[1];
        if (idx < 0 || idx >= a.length) throw new Error('Index must be between 0 and ' + (a.length - 1) + '.');
        var n = a.length, lay = segLayout(n), val = {}, frames = [], tags = segTags(lay);
        (function build(k) {
          var l = lay.L[k], r = lay.R[k];
          if (l === r) { val[k] = a[l]; return; }
          build(2 * k + 1); build(2 * k + 2);
          val[k] = op.f(val[2 * k + 1], val[2 * k + 2]);
        })(0);
        function treePart(hl) { return { type: 'tree', label: 'segment tree (' + p[0].toLowerCase() + ')', arr: segArr(lay, val), hl: hl, tags: tags }; }
        frames.push({ narr: 'The tree is already built. Request: <b>a[' + idx + '] = ' + nv + '</b> (it was ' + a[idx] + '). Which nodes can possibly change? Only the ones whose range <i>contains</i> index ' + idx + ' — exactly one node per level.',
          parts: [{ type: 'array', label: 'a', values: a.slice(), hl: one(idx, 'cur') }, treePart({})] });
        var path = [], k = 0, hl = {};
        while (lay.L[k] !== lay.R[k]) {
          path.push(k);
          var mid = (lay.L[k] + lay.R[k]) >> 1, goLeft = idx <= mid;
          hl = copy(hl); hl[k] = 'cur';
          frames.push({ narr: 'At node ' + rangeTxt(lay.L[k], lay.R[k]) + ': mid = ' + mid + '. Index ' + idx + (goLeft ? ' ≤ ' : ' &gt; ') + mid + ' → go <b>' + (goLeft ? 'left' : 'right') + '</b>. The other child does not contain ' + idx + ', so it is never touched.',
            parts: [{ type: 'array', label: 'a', values: a.slice(), hl: one(idx, 'cur'), range: [lay.L[k], lay.R[k]] }, treePart(hl)] });
          k = goLeft ? 2 * k + 1 : 2 * k + 2;
        }
        var old = val[k];
        a[idx] = nv; val[k] = nv;
        hl = copy(hl); hl[k] = 'ok';
        frames.push({ narr: 'Reached the leaf ' + rangeTxt(idx, idx) + ': change ' + old + ' → <b>' + nv + '</b>. Now its ancestors hold stale answers, so we repair them on the way back up.',
          parts: [{ type: 'array', label: 'a', values: a.slice(), hl: one(idx, 'ok') }, treePart(hl)] });
        for (var j = path.length - 1; j >= 0; j--) {
          var x = path[j], before = val[x];
          val[x] = op.f(val[2 * x + 1], val[2 * x + 2]);
          hl = copy(hl); hl[x] = 'ok';
          frames.push({ narr: 'Repair ' + rangeTxt(lay.L[x], lay.R[x]) + ': ' + combineText(op, val[2 * x + 1], val[2 * x + 2], val[x]) + ' (was ' + show(before) + '). Its sibling subtree was already correct, so one merge fixes this node.',
            parts: [{ type: 'array', label: 'a', values: a.slice(), hl: one(idx, 'ok'), range: [lay.L[x], lay.R[x]] }, treePart(hl)] });
        }
        frames.push({ narr: 'Done: we touched <b>' + (path.length + 1) + '</b> nodes (the height of the tree + 1), i.e. O(log N). With prefix sums the same change would have forced rewriting up to N prefix values.',
          parts: [{ type: 'array', label: 'a', values: a.slice() }, treePart(hl), { type: 'vars', label: 'cost', vals: { 'nodes touched': path.length + 1, N: n, 'log2 N (rounded up)': Math.ceil(Math.log2(n)) } }] });
        return frames;
      }
    }],
    examples: [
      {
        title: 'Counting the work: why a query never visits more than ~4 nodes per level',
        html: `<p>Take N = 8 and the query [1, 6]. Level by level, which nodes are <i>partial</i> (the only ones that go deeper)?</p>
          ${H.table(['level', 'nodes visited', 'partial (go deeper)', 'taken whole'], [
            ['0', '[0,7]', '[0,7]', '—'],
            ['1', '[0,3], [4,7]', '[0,3], [4,7]', '—'],
            ['2', '[0,1], [2,3], [4,5], [6,7]', '[0,1], [6,7]', H.c('p', '[2,3], [4,5]')],
            ['3', '[0], [1], [6], [7]', '—', H.c('p', '[1], [6]')]
          ])}
          <p>At every level at most <b>two</b> nodes are partial — the one containing the left end <code>ql</code> and the one containing the right end <code>qr</code>. Everything strictly between them is fully inside. Two partial nodes have at most four children, so each level costs ≤ 4 visits. Height is ⌈log₂ N⌉, so a query is at most about <b>4·log₂ N</b> visits: 80 for N = 10<sup>6</sup>.</p>`
      },
      {
        title: 'Same tree, different operation: range MIN with an update',
        html: `<p>a = [4, 6, 1, 5, 7, 3, 8, 2]. Build with <code>min</code> instead of <code>+</code>: leaves = the array, [0,1]=4, [2,3]=1, [4,5]=3, [6,7]=2, [0,3]=1, [4,7]=2, root=1.</p>
          ${H.arr([4, 6, 1, 5, 7, 3, 8, 2], { label: 'a', hl: { 3: 'b', 4: 'b', 5: 'b', 6: 'b' } })}
          <p>Query min of a[3..6]: [3] (5) + [4,5] (3) + [6] (8) → min(5, 3, 8) = <b>3</b>. Identity for "no overlap" must be <b>+∞</b> — returning 0 would be a bug that only shows up when all numbers are positive.</p>
          <p>Update a[5] = 10: the leaf becomes 10, [4,5] becomes min(7, 10) = 7, [4,7] = min(7, 2) = 2, root unchanged = 1. Query again: min(5, 7, 8) = <b>5</b>. Exactly the pattern of the iterative <code>MinSegTree</code> above.</p>`
      },
      {
        title: 'Why allocate 4N (and not 2N) for the recursive version',
        html: `<p>With node numbering 1, 2k, 2k+1, the indices are <i>not</i> packed tightly when N is not a power of two. N = 6: root [0,5] = 1, [0,2] = 2, [3,5] = 3, [0,1] = 4, [2] = 5, [3,4] = 6, [5] = 7, [0] = 8, [1] = 9, then [3] = <b>12</b> and [4] = <b>13</b>. Only 11 real nodes (2N − 1) but the largest index is 13 &gt; 2N: slots 10 and 11 are empty holes.</p>
          ${H.table(['N', 'real nodes (2N−1)', 'largest index used', '4N'], [['5', '9', '9', '20'], ['6', '11', '13', '24'], ['17', '33', '33', '68'], ['10<sup>5</sup>', '199 999', '262 141', '400 000']])}
          <p>The tree has height h = ⌈log₂ N⌉, so indices stay below 2<sup>h+1</sup> &lt; 4N. That is why <code>new long[4 * n]</code> is the safe rule. The <b>iterative</b> bottom-up tree packs leaves at [n, 2n) and needs only <b>2N</b>.</p>`
      },
      {
        title: 'A custom node: maximum subarray sum inside [l, r] with updates',
        html: `<p>Sum/min/max are one number per node. Some questions need a small <b>struct</b> per node. For "best subarray sum in a range" store four numbers: <code>sum</code>, best <code>prefix</code>, best <code>suffix</code>, <code>best</code> overall. Merging left L and right R:</p>
          ${H.table(['field', 'formula', 'why'], [
            ['sum', 'L.sum + R.sum', 'whole range'],
            ['pref', 'max(L.pref, L.sum + R.pref)', 'a prefix either stays in L or swallows all of L'],
            ['suf', 'max(R.suf, R.sum + L.suf)', 'mirror image'],
            ['best', 'max(L.best, R.best, L.suf + R.pref)', 'inside L, inside R, or crossing the middle']
          ])}
          <p>Example: L = [2, −1] gives sum 1, pref 2 (just [2]), suf 1 ([2, −1] beats [−1]), best 2. R = [3, −4] gives sum −1, pref 3, suf −1 ([3, −4] beats [−4]), best 3. Merged best = max(2, 3, L.suf + R.pref = 1 + 3) = <b>4</b> = the subarray [2, −1, 3]. ✔ This is practice problem "Subarray Sum Queries".</p>`
      }
    ],
    deepDive: `<p><b>Proof of O(log N) query.</b> Claim: on every level at most two visited nodes are <i>partial</i>. A partial node contains <code>ql</code> or <code>qr</code> strictly inside it (otherwise it would be disjoint or fully covered). Ranges on one level are disjoint, so at most one node contains <code>ql</code> and at most one contains <code>qr</code>. Only partial nodes recurse, so ≤ 4 nodes are visited per level → ≤ 4⌈log₂ N⌉ + 1 visits total.</p>
      <p><b>Identity and associativity are the contract.</b> The merge must be associative because the tree groups elements in a fixed shape that has nothing to do with your query. It does <b>not</b> need to be commutative in the recursive version (left is always merged before right). In the iterative bottom-up version you must keep two accumulators — <code>resLeft = merge(resLeft, t[l++])</code> and <code>resRight = merge(t[--r], resRight)</code> — and combine them at the end, otherwise non-commutative merges (matrix products, string hashes, the max-subarray struct) come out in the wrong order.</p>
      <p><b>Descent: "first index with value ≥ x" in O(log N).</b> If every node stores the max of its range, start at the root: if the left child's max ≥ x go left, else go right. You never backtrack, so it is one root-to-leaf walk. Same idea finds the k-th one in a 0/1 array (store counts; go left if <code>left.count ≥ k</code>, else subtract and go right). Doing this with a binary search over <code>query(0, mid)</code> costs O(log² N) — interviewers like to see the single-walk version.</p>
      <p><b>Huge coordinates.</b> If indices go up to 10<sup>9</sup>, you cannot allocate 4·10<sup>9</sup>. Two fixes: (1) <b>coordinate compression</b> when all positions are known in advance (offline) — sort the distinct positions and map them to 0..K−1; (2) a <b>dynamic (implicit) segment tree</b> that creates child nodes only when first touched, using O(Q log C) memory. A <b>persistent</b> segment tree goes one step further: every update copies only the O(log N) nodes on its path, so you keep every past version — used for "k-th smallest in a[l..r]" online.</p>
      <p><b>Performance reality (Java).</b> Recursive trees do ~2–3·10<sup>7</sup> node visits per second comfortably; the iterative tree is often 2–3× faster and uses half the memory. Use <code>long[]</code> for sums (10<sup>5</sup> values of 10<sup>9</sup> overflow <code>int</code>), avoid object nodes (pointer chasing kills the cache), and read input with a fast reader — with 2·10<sup>5</sup> queries, <code>Scanner</code> alone can cost a second.</p>
      <p><b>Production.</b> The same "store aggregates for power-of-two blocks" idea appears in database indexes that keep counts/sums per B-tree page (order-statistic and aggregate trees), in monitoring systems that pre-aggregate metrics into minute/hour/day rollups, and in game engines and schedulers that need "minimum over a range of slots" with frequent changes. The interview tree is the clean, in-memory version of that idea.</p>`,
    aiEra: `<p><b>What AI changes:</b> any assistant will produce a correct-looking segment tree in seconds, and in an AI-allowed round nobody is impressed by typing it. What is still tested is whether you <b>recognise</b> that the problem needs one (updates + range aggregate), whether you choose the <b>simplest</b> structure that works, and whether you can <b>debug</b> it when the generated code is subtly wrong.</p>
      <p><b>Where generated segment trees typically go wrong:</b> returning 0 instead of +∞ as the identity for min; sizing the array 2N for the recursive version (index out of bounds only for some N); <code>int</code> sums that overflow; <code>mid = (l + r) / 2</code> with negative coordinates in a dynamic tree; merging in the wrong order in the iterative version for non-commutative operations; using <code>query(0, mid)</code> inside a binary search (O(log² N)) when a descent is expected.</p>
      <p><b>Use AI as a partner:</b> ask <code>"Write a brute-force O(N) version and a random stress test that compares it with my segment tree for 10 000 operations"</code> — exactly like the Python snippet above. Ask it to list edge cases (N = 1, l = r, all negative values). <b>What you must own:</b> the three-case query logic, the O(log N) proof (≤ 2 partial nodes per level), the identity/associativity contract, and the judgement call of segment tree vs Fenwick vs sparse table.</p>`,
    problems: [{
      title: 'Range Sum Query — Mutable',
      level: 'Medium',
      tags: ['segment tree', 'design', 'point update'],
      companies: ['Google', 'Amazon', 'Meta', 'Microsoft'],
      statement: `<p>Design a class <code>NumArray</code> built from an integer array <code>nums</code> that supports two operations, called in any order:</p>
        <ul><li><code>update(index, val)</code> — set <code>nums[index] = val</code>.</li><li><code>sumRange(left, right)</code> — return the sum of <code>nums[left..right]</code> (inclusive).</li></ul>`,
      constraints: `1 ≤ N ≤ 3·10<sup>4</sup>, −100 ≤ nums[i], val ≤ 100, at most 3·10<sup>4</sup> calls in total to update and sumRange.`,
      example: `${H.arr([1, 3, 5], { label: 'nums' })}
        <p>sumRange(0, 2) → ${H.c('g', '9')} (1 + 3 + 5). update(1, 2) → nums = [1, 2, 5]. sumRange(0, 2) → ${H.c('g', '8')}. The second answer differs because the update changed the middle element; a structure that cached the first answer without repairing it would wrongly print 9 again.</p>`,
      brute: {
        why: `<p>Store the array; <code>update</code> is O(1), <code>sumRange</code> loops in O(N). Worst case: 3·10<sup>4</sup> queries × 3·10<sup>4</sup> elements = 9·10<sup>8</sup> additions — too slow. A prefix-sum array flips the problem: O(1) queries but O(N) updates. The waste: every query re-adds the same untouched chunks of the array again and again.</p>`,
        code: `
          class NumArrayBrute {
              private final int[] a;
              NumArrayBrute(int[] nums) { a = nums.clone(); }
              void update(int index, int val) { a[index] = val; }          // O(1)
              int sumRange(int left, int right) {                          // O(N) per call
                  int s = 0;
                  for (int i = left; i <= right; i++) s += a[i];
                  return s;
              }
          }`
      },
      mcq: {
        q: 'You need both update and sumRange fast. Which pair of costs can a segment tree give you?',
        options: ['O(1) update, O(1) query', 'O(log N) update, O(log N) query', 'O(N) update, O(1) query', 'O(√N) update, O(log N) query'],
        answer: 1,
        explain: 'A segment tree repairs only the log N ancestors of the changed leaf, and answers a range with at most ~4 nodes per level. O(1)/O(1) for both is impossible in general for dynamic range sums (there is a known Ω(log N) lower bound for this problem in the cell-probe model).'
      },
      hints: [
        `<p><b>Aha:</b> a sum over [l, r] can be glued together from a few precomputed "block sums", and one element belongs to only log N nested blocks. Precompute blocks of sizes 1, 2, 4, … arranged as a tree.</p>`,
        `<p>Use a segment tree with <code>long[] tree = new long[4n]</code> (or the iterative 2n version). Build once, <code>update</code> walks root → leaf → repair, <code>sumRange</code> uses the three cases (no overlap → 0, fully inside → tree[node], partial → both children).</p>`,
        `<p>Edge cases: N = 1, <code>left == right</code>, updating to the same value, negative numbers. Recipe: build(1, 0, n−1); update → recurse to leaf, set, recompute parents; query → three cases. Alternatively a Fenwick tree works too because sum has an inverse (store the array to compute the delta <code>val − nums[i]</code>).</p>`
      ],
      solution: {
        approach: `<p>Build a sum segment tree over <code>nums</code>. <code>update</code> overwrites the leaf and repairs the path to the root; <code>sumRange</code> runs the three-case recursive query. Both are O(log N). The iterative bottom-up tree is shown because it is short and fast; the recursive one from the topic code is equally correct.</p>`,
        code: `
          class NumArray {
              private final int n;
              private final int[] t;                 // leaves at t[n..2n-1], internal nodes at t[1..n-1]

              public NumArray(int[] nums) {
                  n = nums.length;
                  t = new int[2 * n];
                  for (int i = 0; i < n; i++) t[n + i] = nums[i];
                  for (int p = n - 1; p >= 1; p--) t[p] = t[2 * p] + t[2 * p + 1];
              }

              public void update(int index, int val) {
                  int p = index + n;
                  t[p] = val;                          // fix the leaf
                  for (p >>= 1; p >= 1; p >>= 1)       // climb: every ancestor = left + right
                      t[p] = t[2 * p] + t[2 * p + 1];
              }

              public int sumRange(int left, int right) {
                  int s = 0;
                  for (int l = left + n, r = right + n + 1; l < r; l >>= 1, r >>= 1) {
                      if ((l & 1) == 1) s += t[l++];   // l is a right child: take it alone
                      if ((r & 1) == 1) s += t[--r];   // r-1 is a left child: take it alone
                  }
                  return s;
              }

              public static void main(String[] args) {
                  NumArray na = new NumArray(new int[]{1, 3, 5});
                  System.out.println(na.sumRange(0, 2)); // 9
                  na.update(1, 2);
                  System.out.println(na.sumRange(0, 2)); // 8
              }
          }`,
        alt: [{ lang: 'python', code: `class NumArray:
    def __init__(self, nums):
        self.n = n = len(nums)
        self.t = [0] * n + list(nums)          # leaves at n..2n-1
        for p in range(n - 1, 0, -1):
            self.t[p] = self.t[2 * p] + self.t[2 * p + 1]

    def update(self, index, val):
        p = index + self.n
        self.t[p] = val
        p //= 2
        while p >= 1:
            self.t[p] = self.t[2 * p] + self.t[2 * p + 1]
            p //= 2

    def sumRange(self, left, right):
        s, l, r = 0, left + self.n, right + self.n + 1
        while l < r:
            if l & 1:
                s += self.t[l]; l += 1
            if r & 1:
                r -= 1; s += self.t[r]
            l //= 2; r //= 2
        return s


na = NumArray([1, 3, 5])
print(na.sumRange(0, 2))  # 9
na.update(1, 2)
print(na.sumRange(0, 2))  # 8`, run: true }],
        dry: {
          head: ['step', 'operation', 'what the tree does', 'result'],
          rows: [
            ['1', 'build [1,3,5]', 'leaves t[3..5] = 1,3,5; t[2] = t[4]+t[5] = 8; t[1] = t[2]+t[3] = 9', 'tree ready'],
            ['2', 'sumRange(0,2)', 'l=3,r=6: l odd → take t[3]=1, l=4; r even; l=2,r=3: r odd → take t[2]=8; l=1,r=1 stop', H.c('g', '9')],
            ['3', 'update(1,2)', 't[4]=2 → t[2]=2+5=7 → t[1]=7+1=8', 'repaired 3 nodes'],
            ['4', 'sumRange(0,2)', 'take t[3]=1 and t[2]=7', H.c('g', '8')]
          ]
        },
        complexity: `<p>Build O(N); update O(log N); sumRange O(log N); memory 2N ints. 3·10<sup>4</sup> operations × ~15 steps ≈ 5·10<sup>5</sup> steps.</p>`,
        followUps: ['Make it range MIN instead of sum — what changes (identity, merge)?', 'Solve it with a Fenwick tree; why must you remember the old values?', 'Add an operation "add v to every element in [l, r]" — see lazy propagation.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 2 — Lazy propagation (range updates)
  // =====================================================================
  topics.push({
    title: 'Segment Tree II: Lazy Propagation for Range Updates',
    analogy: `<p>A school principal announces: <b>"Every student in classes 3 to 7 gets 5 bonus marks."</b> The slow way: walk into every classroom and rewrite 200 report cards. The smart way: stick a <b>note on each class teacher's register</b> — "+5 for everyone in my class, not yet written on the cards" — and immediately update the class totals. Nobody touches the individual cards.</p>
      <p>Later a parent asks for <i>one</i> student's mark. Only then does the teacher open the register, see the sticky note, <b>pass it down</b> to that student's card, and remove it. If no parent ever asks about class 6, its 40 cards are never rewritten at all.</p>
      <p>That sticky note is the <b>lazy tag</b>: an IOU stored on a node that says "everything below me still owes this change". We pay it only when we are forced to look inside.</p>`,
    explain: `<p><b>The problem.</b> Now updates hit a whole range: "add v to every element in [l, r]" (or "set every element in [l, r] to x"). With the plain segment tree you would do r − l + 1 point updates — O(N log N) for one update. Lazy propagation makes a <b>range update O(log N)</b>, the same cost as a query.</p>
      <p><b>Key idea.</b> A range update visits exactly the same nodes as a range query: a few <i>fully covered</i> nodes plus the partial ones above them. For a fully covered node we can fix its stored answer <b>in O(1) without looking at its children</b>:</p>
      ${H.table(['stored value', 'effect of "+v to all k elements below"', 'example'], [
        ['sum', 'sum += v · k', '[2,3] holds 7 (3 + 4). +3 on both → 7 + 3·2 = 13'],
        ['min / max', 'min += v (everyone moved by v, so the smallest did too)', 'min 3 → 6 after +3'],
        ['count of elements', 'unchanged', '—']
      ])}
      <p>Then we write the IOU <code>lazy[node] += v</code> and <b>stop</b>. The children are now stale, but nobody has looked at them yet.</p>
      <p><b>The one rule that keeps it correct — push before you go down.</b> Whenever an update or query needs to step <i>into</i> a node's children, first call <code>push(node)</code>: apply the node's IOU to both children (fix their values, add to their IOUs) and clear it. After the recursion, <b>pull</b> the node's value back up from its now-correct children.</p>
      ${H.table(['function', 'job', 'cost'], [
        ['<code>apply(node, v)</code>', 'fix the node\'s value as if v were applied to every element; add v to its IOU', 'O(1)'],
        ['<code>push(node)</code>', 'apply(left, lazy), apply(right, lazy), lazy = 0', 'O(1)'],
        ['<code>pull(node)</code>', 'value = merge(left, right)', 'O(1)'],
        ['update / query', 'three cases as before; push on partial nodes', 'O(log N)']
      ])}
      <p><b>Worked example.</b> a = [1, 2, 3, 4, 5, 6, 7, 8], <b>add 3 on [2, 6]</b>. Fully covered nodes: [2,3] (sum 7 → 13, IOU +3), [4,5] (11 → 17, IOU +3), leaf [6] (7 → 10). Partial nodes [0,7], [0,3], [4,7], [6,7] get re-pulled: [6,7] = 10 + 8 = 18, [4,7] = 17 + 18 = 35, [0,3] = 3 + 13 = 16, root = 51. Only <b>9 nodes</b> were touched, and the 4 leaves under [2,3] and [4,5] still show their old numbers — that is fine, their parents' IOUs explain the difference.</p>
      ${H.arr([1, 2, 6, 7, 8, 9, 10, 8], { label: 'array the tree now represents', hl: { 2: 'g', 3: 'g', 4: 'g', 5: 'g', 6: 'g' } })}
      <p><b>Which updates can be lazy?</b> Two conditions (the "lazy contract"):</p>
      <ol>
        <li>You can update a node's stored answer from the tag <b>alone</b> (plus the node's length): sum += v·len ✔, min += v ✔, sum after "set to x" = x·len ✔. Counter-example: "replace every a[i] by √a[i]" — the new sum cannot be computed from the old sum ✘.</li>
        <li>Two tags can be <b>composed</b> into one tag: +3 then +5 = +8 ✔; set 4 then +2 = set 6 ✔; set then set = the later set ✔.</li>
      </ol>`,
    clues: [
      '"<b>Add v to all elements from l to r</b>" <i>and</i> "report the sum / min / max of [l, r]" interleaved → lazy segment tree.',
      '"<b>Set / paint / assign</b> every element in [l, r] to x" then query ranges → lazy tag = pending assignment (it overrides older tags).',
      '"Booking / calendar / meetings: what is the <b>maximum overlap</b> after each new interval?" → range add +1, global max → lazy add + max tree (with coordinate compression).',
      '"<b>Flip</b> all bits in [l, r], count ones in [l, r]" → lazy tag = flip flag; ones = len − ones.',
      '"Multiply by b then add c on a range, answer sums mod 998244353" → affine lazy tags (b, c) with composition.',
      'Only range updates + single-element reads (no range queries) → you do <b>not</b> need lazy: use a difference array (offline) or a Fenwick tree on differences.'
    ],
    code: [`
      // Lazy segment tree: range ADD + range SUM, both O(log N).
      class LazySegTree {
          private final int n;
          private final long[] sum;   // sum[node] = correct sum of node's range (its own IOU already included)
          private final long[] lazy;  // lazy[node] = "add this to every element below me", not yet given to children

          LazySegTree(int[] a) {
              n = a.length;
              sum = new long[4 * n];
              lazy = new long[4 * n];
              build(a, 1, 0, n - 1);
          }

          private void build(int[] a, int node, int l, int r) {
              if (l == r) { sum[node] = a[l]; return; }
              int mid = (l + r) >>> 1;
              build(a, 2 * node, l, mid);
              build(a, 2 * node + 1, mid + 1, r);
              sum[node] = sum[2 * node] + sum[2 * node + 1];
          }

          // Apply "+v to every element" to a WHOLE node in O(1): fix its sum, remember the IOU.
          private void apply(int node, int l, int r, long v) {
              sum[node] += v * (r - l + 1);
              if (l != r) lazy[node] += v;          // leaves have no children to owe anything to
          }

          // Hand the IOU one level down before looking inside this node.
          private void push(int node, int l, int r) {
              if (lazy[node] != 0) {
                  int mid = (l + r) >>> 1;
                  apply(2 * node, l, mid, lazy[node]);
                  apply(2 * node + 1, mid + 1, r, lazy[node]);
                  lazy[node] = 0;
              }
          }

          void add(int ql, int qr, long v) { add(1, 0, n - 1, ql, qr, v); }

          private void add(int node, int l, int r, int ql, int qr, long v) {
              if (qr < l || r < ql) return;                              // outside: nothing to do
              if (ql <= l && r <= qr) { apply(node, l, r, v); return; }  // fully covered: O(1) and STOP
              push(node, l, r);                                          // partial: settle old IOUs first
              int mid = (l + r) >>> 1;
              add(2 * node, l, mid, ql, qr, v);
              add(2 * node + 1, mid + 1, r, ql, qr, v);
              sum[node] = sum[2 * node] + sum[2 * node + 1];             // pull fresh answers up
          }

          long query(int ql, int qr) { return query(1, 0, n - 1, ql, qr); }

          private long query(int node, int l, int r, int ql, int qr) {
              if (qr < l || r < ql) return 0;
              if (ql <= l && r <= qr) return sum[node];                  // correct: its IOU is already counted
              push(node, l, r);
              int mid = (l + r) >>> 1;
              return query(2 * node, l, mid, ql, qr) + query(2 * node + 1, mid + 1, r, ql, qr);
          }

          public static void main(String[] args) {
              LazySegTree st = new LazySegTree(new int[]{1, 2, 3, 4, 5, 6, 7, 8});
              st.add(2, 6, 3);                       // a = 1 2 6 7 8 9 10 8
              System.out.println(st.query(3, 7));    // 7+8+9+10+8 = 42
              st.add(0, 3, -1);                      // a = 0 1 5 6 8 9 10 8
              System.out.println(st.query(0, 7));    // 47
          }
      }`, `
      // Range ADD + range MAX: "after each booking, how busy is the busiest time slot?"
      class AddMaxSegTree {
          private final int n;
          private final long[] mx, lz;

          AddMaxSegTree(int n) { this.n = n; mx = new long[4 * n]; lz = new long[4 * n]; } // all slots start at 0

          private void apply(int node, long v) { mx[node] += v; lz[node] += v; } // the max shifts by v as a whole
          private void push(int node) {
              if (lz[node] != 0) { apply(2 * node, lz[node]); apply(2 * node + 1, lz[node]); lz[node] = 0; }
          }

          void add(int ql, int qr, long v) { add(1, 0, n - 1, ql, qr, v); }

          private void add(int node, int l, int r, int ql, int qr, long v) {
              if (qr < l || r < ql) return;
              if (ql <= l && r <= qr) { apply(node, v); return; }
              push(node);
              int mid = (l + r) >>> 1;
              add(2 * node, l, mid, ql, qr, v);
              add(2 * node + 1, mid + 1, r, ql, qr, v);
              mx[node] = Math.max(mx[2 * node], mx[2 * node + 1]);
          }

          long max(int ql, int qr) { return max(1, 0, n - 1, ql, qr); }

          private long max(int node, int l, int r, int ql, int qr) {
              if (qr < l || r < ql) return Long.MIN_VALUE;                  // identity of max
              if (ql <= l && r <= qr) return mx[node];
              push(node);
              int mid = (l + r) >>> 1;
              return Math.max(max(2 * node, l, mid, ql, qr), max(2 * node + 1, mid + 1, r, ql, qr));
          }

          public static void main(String[] args) {
              AddMaxSegTree t = new AddMaxSegTree(10);   // time slots 0..9
              t.add(1, 4, 1);                             // booking [1,4]
              t.add(3, 7, 1);                             // booking [3,7]
              t.add(4, 5, 1);                             // booking [4,5]
              System.out.println(t.max(0, 9));            // 3: slot 4 is inside all three bookings
          }
      }`, { lang: 'python', run: true, title: 'Python lazy tree + stress test (runnable)', code: `class LazySeg:
    """Range add, range sum."""

    def __init__(self, a):
        self.n = len(a)
        self.s = [0] * (4 * self.n)
        self.lz = [0] * (4 * self.n)
        self._build(a, 1, 0, self.n - 1)

    def _build(self, a, k, l, r):
        if l == r:
            self.s[k] = a[l]
            return
        m = (l + r) // 2
        self._build(a, 2 * k, l, m)
        self._build(a, 2 * k + 1, m + 1, r)
        self.s[k] = self.s[2 * k] + self.s[2 * k + 1]

    def _apply(self, k, l, r, v):
        self.s[k] += v * (r - l + 1)
        if l != r:
            self.lz[k] += v

    def _push(self, k, l, r):
        if self.lz[k]:
            m = (l + r) // 2
            self._apply(2 * k, l, m, self.lz[k])
            self._apply(2 * k + 1, m + 1, r, self.lz[k])
            self.lz[k] = 0

    def add(self, ql, qr, v, k=1, l=0, r=None):
        if r is None:
            r = self.n - 1
        if qr < l or r < ql:
            return
        if ql <= l and r <= qr:
            self._apply(k, l, r, v)
            return
        self._push(k, l, r)
        m = (l + r) // 2
        self.add(ql, qr, v, 2 * k, l, m)
        self.add(ql, qr, v, 2 * k + 1, m + 1, r)
        self.s[k] = self.s[2 * k] + self.s[2 * k + 1]

    def query(self, ql, qr, k=1, l=0, r=None):
        if r is None:
            r = self.n - 1
        if qr < l or r < ql:
            return 0
        if ql <= l and r <= qr:
            return self.s[k]
        self._push(k, l, r)
        m = (l + r) // 2
        return self.query(ql, qr, 2 * k, l, m) + self.query(ql, qr, 2 * k + 1, m + 1, r)


import random

a = [1, 2, 3, 4, 5, 6, 7, 8]
t = LazySeg(a)
t.add(2, 6, 3)
for i in range(2, 7):
    a[i] += 3                         # keep the brute-force copy in sync
print("sum[3..7] =", t.query(3, 7))   # 42
random.seed(3)
for _ in range(3000):
    l = random.randrange(len(a))
    r = random.randrange(l, len(a))
    if random.random() < 0.5:
        v = random.randint(-5, 5)
        t.add(l, r, v)
        for i in range(l, r + 1):
            a[i] += v
    else:
        assert t.query(l, r) == sum(a[l:r + 1])
print("3000 random range-adds / range-sums match brute force")` }],
    codeTitle: ['Range add + range sum (the classic)', 'Range add + range max (booking overlaps)', 'Python + stress test'],
    viz: {
      title: 'Lazy tags in action: IOUs are written on covered nodes and pushed down only when needed',
      input: '1 2 3 4 5 6 7 8 | add 2 6 3 ; sum 3 7 ; add 0 3 -1 ; sum 0 7',
      inputLabel: 'array (2–16 numbers) | operations separated by ";" — "add l r v" or "sum l r" (0-based, up to 5 ops)',
      gen: function (input) {
        var p = splitBar(input, 2, 'array | ops   e.g.  1 2 3 4 | add 0 2 5 ; sum 1 3');
        var a = parseNums(p[0], 'the array', 2, 16, -99, 99);
        var n = a.length;
        var ops = p[1].split(';').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (!ops.length || ops.length > 5) throw new Error('Give 1 to 5 operations separated by ";".');
        ops = ops.map(function (s) {
          var t = s.split(/\s+/), kind = t[0].toLowerCase();
          if (kind !== 'add' && kind !== 'sum') throw new Error('Each operation must start with "add" or "sum" (got "' + t[0] + '").');
          var nums = parseNums(t.slice(1).join(' '), 'the numbers of "' + s + '"', kind === 'add' ? 3 : 2, kind === 'add' ? 3 : 2, -99, 99);
          if (nums[0] < 0 || nums[1] >= n || nums[0] > nums[1]) throw new Error('"' + s + '": need 0 ≤ l ≤ r ≤ ' + (n - 1) + '.');
          return { kind: kind, l: nums[0], r: nums[1], v: nums[2] };
        });
        var lay = segLayout(n), val = {}, lz = {}, frames = [], truth = a.slice(), touched = 0;
        (function build(k) {
          var l = lay.L[k], r = lay.R[k];
          if (l === r) { val[k] = a[l]; return; }
          build(2 * k + 1); build(2 * k + 2);
          val[k] = val[2 * k + 1] + val[2 * k + 2];
        })(0);
        function tagsNow() { var ex = {}; for (var k in lz) if (lz[k]) ex[k] = (lz[k] > 0 ? 'IOU +' : 'IOU ') + lz[k]; return segTags(lay, ex); }
        function parts(hl, range, extra) {
          var ps = [{ type: 'array', label: 'array the tree represents (the truth)', values: truth.slice(), range: range }, { type: 'tree', label: 'sum tree — tag = range + pending lazy IOU', arr: segArr(lay, val), hl: hl, tags: tagsNow() }];
          ps.push({ type: 'vars', label: 'bookkeeping', vals: extra });
          return ps;
        }
        function isLeaf(k) { return lay.L[k] === lay.R[k]; }
        function apply(k, v) { val[k] += v * (lay.R[k] - lay.L[k] + 1); if (!isLeaf(k)) lz[k] = (lz[k] || 0) + v; }
        frames.push({ narr: 'Start: a sum segment tree, no IOUs yet. Each node\'s tag shows its range; when a node carries an unpaid change it will show <b>IOU +v</b>.', parts: parts({}, null, { operation: '—', 'nodes touched': 0 }) });
        ops.forEach(function (op, oi) {
          var name = op.kind === 'add' ? 'add ' + op.v + ' on [' + op.l + ',' + op.r + ']' : 'sum of [' + op.l + ',' + op.r + ']';
          var hl = {}, ans = 0;
          touched = 0;
          if (op.kind === 'add') for (var i = op.l; i <= op.r; i++) truth[i] += op.v;
          frames.push({ narr: 'Operation ' + (oi + 1) + ': <b>' + name + '</b>.' + (op.kind === 'add' ? ' (The top row already shows the intended result; watch how little of the tree we need to touch to represent it.)' : ''), parts: parts({}, [op.l, op.r], { operation: name, 'nodes touched': 0 }) });
          function push(k) {
            if (!lz[k]) return;
            var v = lz[k];
            apply(2 * k + 1, v); apply(2 * k + 2, v); lz[k] = 0;
            touched += 2;
            var h = copy(hl); h[k] = 'cur'; h[2 * k + 1] = 'ok'; h[2 * k + 2] = 'ok';
            frames.push({ narr: 'We must look inside ' + rangeTxt(lay.L[k], lay.R[k]) + ', but it carries an unpaid IOU of ' + v + '. <b>Push</b> it: both children get their values fixed (+' + v + ' × their length) and inherit the IOU; the parent\'s IOU is cleared.', parts: parts(h, [op.l, op.r], { operation: name, 'nodes touched': touched }) });
          }
          (function go(k) {
            var l = lay.L[k], r = lay.R[k];
            touched++;
            if (op.r < l || r < op.l) {
              hl[k] = 'done';
              var h0 = copy(hl); h0[k] = 'bad';
              frames.push({ narr: rangeTxt(l, r) + ' is outside [' + op.l + ',' + op.r + '] → ' + (op.kind === 'add' ? 'nothing changes here' : 'contributes 0') + '.', parts: parts(h0, [op.l, op.r], { operation: name, 'nodes touched': touched }) });
              return;
            }
            if (op.l <= l && r <= op.r) {
              if (op.kind === 'add') {
                var before = val[k];
                apply(k, op.v);
                hl[k] = 'sel';
                frames.push({ narr: rangeTxt(l, r) + ' is <b>fully covered</b>: sum ' + before + ' + ' + op.v + ' × ' + (r - l + 1) + ' = <b>' + val[k] + '</b>' + (isLeaf(k) ? ' (a leaf: no IOU needed).' : ', write <b>IOU ' + (op.v > 0 ? '+' : '') + op.v + '</b> on it and STOP — its ' + (r - l + 1) + ' elements are not visited.'), parts: parts(copy(hl), [op.l, op.r], { operation: name, 'nodes touched': touched }) });
              } else {
                ans += val[k];
                hl[k] = 'sel';
                frames.push({ narr: rangeTxt(l, r) + ' is <b>fully inside</b>: its value ' + val[k] + ' is already correct (any IOU on it is counted in its own sum), so take it whole. Running sum = ' + ans + '.', parts: parts(copy(hl), [op.l, op.r], { operation: name, 'running sum': ans, 'nodes touched': touched }) });
              }
              return;
            }
            hl[k] = 'win';
            var h1 = copy(hl); h1[k] = 'cur';
            frames.push({ narr: rangeTxt(l, r) + ' is only <b>partly</b> covered → we have to go into its children.', parts: parts(h1, [op.l, op.r], { operation: name, 'nodes touched': touched }) });
            push(k);
            go(2 * k + 1); go(2 * k + 2);
            if (op.kind === 'add') {
              val[k] = val[2 * k + 1] + val[2 * k + 2];
              var h2 = copy(hl); h2[k] = 'ok';
              frames.push({ narr: '<b>Pull</b> ' + rangeTxt(l, r) + ' back up: ' + val[2 * k + 1] + ' + ' + val[2 * k + 2] + ' = ' + val[k] + '.', parts: parts(h2, [op.l, op.r], { operation: name, 'nodes touched': touched }) });
            }
          })(0);
          var real = 0; for (var j = op.l; j <= op.r; j++) real += truth[j];
          frames.push({ narr: op.kind === 'add' ? 'Update done after touching <b>' + touched + '</b> nodes, although ' + (op.r - op.l + 1) + ' elements changed. Leaves under an IOU still show old numbers — that is expected; the IOU above them explains the difference.' : 'Query answer = <b>' + ans + '</b> (check against the top row: ' + real + '). Touched ' + touched + ' nodes.',
            parts: parts({}, [op.l, op.r], op.kind === 'add' ? { operation: name, 'nodes touched': touched } : { operation: name, answer: ans, 'nodes touched': touched }) });
        });
        return frames;
      }
    },
    examples: [
      {
        title: 'Tracing "add 3 on [2,6]" then "sum of [3,7]"',
        html: `<p>a = [1, 2, 3, 4, 5, 6, 7, 8]. After the add (see explain): [2,3] = 13 with IOU +3, [4,5] = 17 with IOU +3, leaf [6] = 10, root = 51.</p>
          ${H.table(['node visited by sum[3,7]', 'case', 'action', 'running sum'], [
            ['[0,7]', 'partial', 'no IOU, go down', '0'],
            ['[0,3]', 'partial', 'no IOU, go down', '0'],
            ['[0,1]', 'outside', 'return 0', '0'],
            ['[2,3]', 'partial', H.c('y', 'push IOU +3') + ': [2] 3→6, [3] 4→7', '0'],
            ['[2] / [3]', 'outside / inside', 'take 7', '7'],
            ['[4,7]', 'partial', 'no IOU, go down', '7'],
            ['[4,5]', 'fully inside', 'take 17 (IOU stays, never needed)', '24'],
            ['[6,7]', 'fully inside', 'take 18', H.c('g', '42')]
          ])}
          <p>Note how [4,5] kept its IOU: the query never needed its children, so nobody paid it. That laziness is the whole trick.</p>`
      },
      {
        title: 'Two kinds of tags: "set to x" and "add v" together',
        html: `<p>Some problems mix <b>assign</b> and <b>add</b> on ranges. Store a tag pair <code>(set, add)</code> meaning "first set everything to <code>set</code> (if present), then add <code>add</code>".</p>
          ${H.table(['old tag', 'new operation', 'combined tag', 'reason'], [
            ['(none, +2)', 'add 5', '(none, +7)', 'adds stack up'],
            ['(none, +7)', 'set 4', '(4, +0)', 'a set wipes out everything older'],
            ['(4, +0)', 'add 3', '(4, +3)', 'set 4 then +3 = every element 7'],
            ['(4, +3)', 'set 1', '(1, +0)', 'again, the newer set wins']
          ])}
          <p>Effect on a node of length k: if set is present, <code>sum = set·k</code>; then <code>sum += add·k</code>. Order matters — getting it backwards is the #1 bug in "Range Updates and Sums" (practice problem).</p>`
      },
      {
        title: 'Affine tags: multiply-then-add modulo p',
        html: `<p>Operation "for i in [l, r]: a[i] = b·a[i] + c (mod p)". Tag = <code>(b, c)</code>. A node's sum becomes <code>b·sum + c·len</code>. Composing: first (b1, c1), then (b2, c2) gives <code>x → b2(b1·x + c1) + c2 = (b2·b1)·x + (b2·c1 + c2)</code>.</p>
          <p>Numbers: tag (2, 1) then (3, 4) → (6, 3·1 + 4) = (6, 7). Check on x = 5: 2·5 + 1 = 11, then 3·11 + 4 = 37; and 6·5 + 7 = 37 ✔. Identity tag = (1, 0). This single tag type covers "add" (1, c), "multiply" (b, 0) and "assign" (0, c).</p>`
      },
      {
        title: 'Booking overlaps with range add + max (My Calendar III style)',
        html: `<p>Each booking [s, e] adds +1 to every time slot it covers; after each booking report the busiest slot = global max. With the <code>AddMaxSegTree</code> above:</p>
          ${H.table(['booking', 'slots after (0..9)', 'global max'], [
            ['[1,4]', '0 1 1 1 1 0 0 0 0 0', '1'],
            ['[3,7]', '0 1 1 2 2 1 1 1 0 0', '2'],
            ['[4,5]', '0 1 1 2 3 2 1 1 0 0', H.c('g', '3')]
          ])}
          <p>For real time values up to 10<sup>9</sup>, compress the booking endpoints first (only ≤ 2Q distinct boundaries matter) or use a dynamic segment tree that creates nodes on demand.</p>`
      }
    ],
    deepDive: `<p><b>Invariant that makes it correct.</b> For every node, <code>value[node]</code> equals the true aggregate of its range <i>after</i> applying every update that reached this node or any descendant — but <i>not</i> the IOUs still sitting on its ancestors. Because every update/query pushes all IOUs along the root-to-node path before descending, when we read a node no ancestor on that path has a pending tag. Hence the value we read is the truth.</p>
      <p><b>Complexity.</b> A range update visits the same node set as a range query: at most 2 partial nodes per level, each with ≤ 2 children → ≤ 4 visits per level, O(log N). <code>push</code> and <code>apply</code> are O(1), so lazy changes only the constant. Memory doubles (a second 4N array, or a struct per node).</p>
      <p><b>Formal view.</b> Values form a monoid (associative merge + identity); tags form another monoid under composition; and applying a tag must distribute over merge: <code>apply(t, merge(x, y)) = merge(apply(t, x), apply(t, y))</code>. AtCoder Library's <code>lazy_segtree&lt;S, op, e, F, mapping, composition, id&gt;</code> is exactly this interface, iterative and fast. If your node needs the length (sum += v·len), store the length inside S.</p>
      <p><b>When lazy breaks.</b> "a[i] = a[i] mod x", "a[i] = ⌊√a[i]⌋" or "a[i] = min(a[i], x)" do not satisfy condition 1. Tricks: (1) <b>amortised brute force</b> — each element can be square-rooted only ~6 times before it becomes 1 (for values ≤ 10<sup>18</sup>), so recurse while max &gt; 1 and stop on all-ones nodes; (2) <b>Segment Tree Beats</b> (Ji Ruyi) for chmin/chmax: store max, second max and count of max; if x is between second max and max, update lazily, else recurse — amortised O((N + Q) log N) for the basic version.</p>
      <p><b>Alternatives you should know.</b> Range add + range sum can also be done with <b>two Fenwick trees</b> (shorter, faster, see Fenwick topic). Range add + point query needs only one Fenwick tree on the difference array. If all updates come before all queries, a plain <b>difference array</b> (O(1) per update, one O(N) prefix pass) beats everything.</p>
      <p><b>Common bugs.</b> Forgetting to push in the <i>query</i> (only in update); pushing on leaves into out-of-range children (guard with <code>l != r</code> or allocate 4N); multiplying <code>v · len</code> in <code>int</code>; for assign tags using 0 as "no tag" when 0 is a legal value (use a separate boolean or a sentinel like <code>Long.MIN_VALUE</code>).</p>`,
    aiEra: `<p><b>What AI changes:</b> a lazy segment tree is ~60 lines of fiddly code — the kind of thing assistants autocomplete well for the textbook case (range add, range sum). The value you add is in the <b>non-textbook</b> parts: designing the tag, writing the composition rule, and spotting when an operation is not lazy-friendly at all.</p>
      <p><b>Typical AI mistakes to look for:</b> applying a "set" tag after an "add" in the wrong order; using 0 as the "no assignment" sentinel; forgetting <code>push</code> inside the query; treating min-tree updates as <code>min += v·len</code> (copying the sum formula); proposing lazy propagation for <code>a[i] = √a[i]</code>, which cannot be lazy.</p>
      <p><b>Use AI as a partner:</b> describe your tag algebra in words and ask it to try to find a counter-example to your composition rule; ask for a randomised test that compares your tree with an O(N) simulation (as in the Python snippet) — lazy bugs often appear only after 3–4 overlapping updates, which random tests find in milliseconds. <b>What you must own:</b> the invariant ("ancestors on my path have no pending tags"), the two-condition lazy contract, and the decision whether a cheaper tool (difference array, two BITs) is enough.</p>`,
    problems: [{
      title: 'Horrible Queries: Range Add & Range Sum',
      level: 'Medium',
      tags: ['lazy propagation', 'segment tree', 'range update'],
      companies: ['Google', 'Uber', 'Codenation'],
      statement: `<p>An array of <code>N</code> zeros receives <code>Q</code> commands. Command <code>[0, l, r, v]</code> adds <code>v</code> to every element with index in <code>[l, r]</code>. Command <code>[1, l, r]</code> asks for the sum of the elements in <code>[l, r]</code>. Return the answers of all type-1 commands in order. Indices are 0-based.</p>`,
      constraints: `1 ≤ N, Q ≤ 10<sup>5</sup>, 0 ≤ l ≤ r &lt; N, 0 ≤ v ≤ 10<sup>7</sup>. Sums can reach 10<sup>5</sup> · 10<sup>5</sup> · 10<sup>7</sup> = 10<sup>17</sup> → use <code>long</code>.`,
      example: `<p>N = 8, commands: [0,1,6,10], [0,0,3,2], [1,2,4], [0,4,7,1], [1,0,7]</p>
        ${H.arr([2, 12, 12, 12, 11, 11, 11, 1], { label: 'after all adds', hl: { 2: 'g', 3: 'g', 4: 'g' } })}
        <p>Output ${H.c('g', '[34, 72]')}. After the first two adds the array is [2,12,12,12,10,10,10,0], so sum[2..4] = 12+12+10 = 34. After +1 on [4,7] it becomes [2,12,12,12,11,11,11,1] and the total is 72.</p>`,
      brute: {
        why: `<p>Keep the array and loop over [l, r] for both commands: up to 10<sup>5</sup> elements × 10<sup>5</sup> commands = 10<sup>10</sup> steps. The waste: an add on [0, 99 999] rewrites 10<sup>5</sup> cells even if the next query only looks at their total.</p>`,
        code: `
          long[] bruteHorrible(int n, int[][] cmds) {
              long[] a = new long[n];
              List<Long> out = new ArrayList<>();
              for (int[] c : cmds) {
                  if (c[0] == 0) for (int i = c[1]; i <= c[2]; i++) a[i] += c[3];   // O(N) add
                  else { long s = 0; for (int i = c[1]; i <= c[2]; i++) s += a[i]; out.add(s); } // O(N) sum
              }
              long[] res = new long[out.size()];
              for (int i = 0; i < res.length; i++) res[i] = out.get(i);
              return res;
          }`
      },
      mcq: {
        q: 'A node covering [4, 7] (sum 40) is fully inside an "add 3" update. What do you do?',
        options: ['Visit its 4 leaves and add 3 to each', 'Set its sum to 52, add 3 to its lazy tag, stop', 'Set its sum to 43 and stop', 'Mark it dirty and rebuild the whole tree later'],
        answer: 1,
        explain: '4 elements each grew by 3, so the sum grows by 3 × 4 = 12 → 52. The children are left stale with an IOU of +3 that will be pushed only if someone needs to look inside.'
      },
      hints: [
        `<p><b>Aha:</b> when an update fully covers a node, you know its new sum without visiting its children: <code>sum += v × length</code>. Remember the unpaid part as a tag.</p>`,
        `<p>Lazy segment tree with <code>long[] sum, lazy</code> of size 4N: <code>apply</code>, <code>push</code> before descending, <code>pull</code> after. (Alternative: two Fenwick trees with the formula <code>prefix(x) = B1(x)·x − B2(x)</code>.)</p>`,
        `<p>Edge cases: l = r; adds of 0; queries on untouched parts (sum 0); overflow → long everywhere, including <code>v * (r − l + 1)</code>. Recipe: build zeros → for each command run add or query → collect answers.</p>`
      ],
      solution: {
        approach: `<p>Lazy segment tree over N zeros. Type 0 → range add (apply on fully covered nodes, push on partial ones, pull on the way up). Type 1 → range sum with push on partial nodes. Each command is O(log N).</p>`,
        code: `
          class Solution {
              private long[] sum, lazy;
              private int n;

              public long[] horrible(int n, int[][] cmds) {
                  this.n = n;
                  sum = new long[4 * n];
                  lazy = new long[4 * n];
                  List<Long> out = new ArrayList<>();
                  for (int[] c : cmds) {
                      if (c[0] == 0) add(1, 0, n - 1, c[1], c[2], c[3]);
                      else out.add(query(1, 0, n - 1, c[1], c[2]));
                  }
                  long[] res = new long[out.size()];
                  for (int i = 0; i < res.length; i++) res[i] = out.get(i);
                  return res;
              }

              private void apply(int node, int l, int r, long v) {
                  sum[node] += v * (r - l + 1);
                  if (l != r) lazy[node] += v;
              }

              private void push(int node, int l, int r) {
                  if (lazy[node] == 0) return;
                  int mid = (l + r) >>> 1;
                  apply(2 * node, l, mid, lazy[node]);
                  apply(2 * node + 1, mid + 1, r, lazy[node]);
                  lazy[node] = 0;
              }

              private void add(int node, int l, int r, int ql, int qr, long v) {
                  if (qr < l || r < ql) return;
                  if (ql <= l && r <= qr) { apply(node, l, r, v); return; }
                  push(node, l, r);
                  int mid = (l + r) >>> 1;
                  add(2 * node, l, mid, ql, qr, v);
                  add(2 * node + 1, mid + 1, r, ql, qr, v);
                  sum[node] = sum[2 * node] + sum[2 * node + 1];
              }

              private long query(int node, int l, int r, int ql, int qr) {
                  if (qr < l || r < ql) return 0;
                  if (ql <= l && r <= qr) return sum[node];
                  push(node, l, r);
                  int mid = (l + r) >>> 1;
                  return query(2 * node, l, mid, ql, qr) + query(2 * node + 1, mid + 1, r, ql, qr);
              }

              public static void main(String[] args) {
                  int[][] cmds = {{0, 1, 6, 10}, {0, 0, 3, 2}, {1, 2, 4}, {0, 4, 7, 1}, {1, 0, 7}};
                  System.out.println(Arrays.toString(new Solution().horrible(8, cmds))); // [34, 72]
              }
          }`,
        alt: [{ lang: 'python', code: `def horrible(n, cmds):
    # Two Fenwick trees (range add + range sum) - same complexity, shorter code.
    b1 = [0] * (n + 1)
    b2 = [0] * (n + 1)

    def upd(b, i, v):
        while i <= n:
            b[i] += v
            i += i & -i

    def pre(b, i):
        s = 0
        while i > 0:
            s += b[i]
            i -= i & -i
        return s

    def range_add(l, r, v):          # 1-based inclusive
        upd(b1, l, v); upd(b1, r + 1, -v)
        upd(b2, l, v * (l - 1)); upd(b2, r + 1, -v * r)

    def prefix(x):
        return pre(b1, x) * x - pre(b2, x)

    out = []
    for c in cmds:
        if c[0] == 0:
            range_add(c[1] + 1, c[2] + 1, c[3])
        else:
            out.append(prefix(c[2] + 1) - prefix(c[1]))
    return out


print(horrible(8, [[0, 1, 6, 10], [0, 0, 3, 2], [1, 2, 4], [0, 4, 7, 1], [1, 0, 7]]))  # [34, 72]`, run: true }],
        dry: {
          head: ['command', 'nodes fully covered (apply)', 'state after', 'output'],
          rows: [
            ['add 10 on [1,6]', '[1], [2,3], [4,5], [6]', 'root sum = 60', '—'],
            ['add 2 on [0,3]', '[0,3] (IOU +2)', 'root sum = 68', '—'],
            ['sum [2,4]', 'push [0,3] → [0,1],[2,3] get +2; take [2,3] = 24 whole; [4,5] partial → push its +10, take [4] = 10', 'unchanged', H.c('g', '34')],
            ['add 1 on [4,7]', '[4,7] (IOU +1)', 'root sum = 72', '—'],
            ['sum [0,7]', 'root fully inside', 'unchanged', H.c('g', '72')]
          ]
        },
        complexity: `<p>O(log N) per command → O(Q log N) ≈ 1.7·10<sup>6</sup> node visits; memory 8N longs.</p>`,
        followUps: ['Add a third command "set every element in [l, r] to x" — design the tag pair.', 'Answer "max of [l, r]" instead of sum — what changes in apply?', 'Do it with two Fenwick trees and derive the formula.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 3 — Fenwick tree / Binary Indexed Tree
  // =====================================================================
  topics.push({
    title: 'Fenwick Tree (Binary Indexed Tree): Prefix Sums That Can Change',
    analogy: `<p>You need to pay ₹13 using only coins of 1, 2, 4, 8, 16… The cashier's trick: write 13 in binary, <b>1101</b>, and grab one coin per 1-bit: <b>8 + 4 + 1</b>. Never more than log₂ coins.</p>
      <p>A Fenwick tree does the same with <b>sums</b>. Box number 13 holds the total of just day 13; box 12 holds days 9–12; box 8 holds days 1–8. To get "total of days 1..13" you open boxes 13, 12 and 8 — one per 1-bit of 13 — and add them. When day 5 changes, you correct the few boxes whose stretch covers day 5 (boxes 5, 6, 8, 16 — again about log₂ N). No tree pointers, no recursion: just an array and a bit trick.</p>`,
    explain: `<p><b>What it is.</b> A Fenwick tree (also called a <b>Binary Indexed Tree</b>, BIT; published by Peter Fenwick in 1994 for compression software) is an array <code>tree[1..N]</code> that supports:</p>
      <ul><li><code>add(i, delta)</code> — a[i] += delta, O(log N)</li><li><code>prefix(i)</code> — a[1] + … + a[i], O(log N)</li><li>range sum <code>[l, r] = prefix(r) − prefix(l − 1)</code></li></ul>
      <p>Same job as a sum segment tree, but <b>N + 1 slots instead of 4N</b>, ~10 lines of code, and 2–3× faster in practice. The price: it needs an <b>invertible</b> operation (sum, xor, product mod p with no zeros) because a range answer is computed as a <i>difference</i> of two prefixes. It cannot do range min/max with arbitrary updates.</p>
      <p><b>The one bit trick: lowbit(i) = i &amp; −i.</b> In two's complement, <code>−i = ~i + 1</code>, which flips every bit above the lowest 1-bit and keeps that 1-bit. So <code>i &amp; −i</code> isolates the lowest set bit:</p>
      ${H.bits(12, 6, { label: 'i = 12', hl: { 2: 'y' } })}
      ${H.bits(-12, 6, { label: '−i (two\'s complement)', hl: { 2: 'y' }, dec: false })}
      ${H.bits(4, 6, { label: 'i &amp; −i = lowbit = 4', hl: { 2: 'g' } })}
      <p><b>Who stores what.</b> <code>tree[i]</code> stores the sum of the <b>last lowbit(i) elements ending at i</b>, i.e. a(i − lowbit(i), i]:</p>
      ${H.table(['i', 'binary', 'lowbit', 'tree[i] covers'], [
        ['1', '0001', '1', 'a[1]'], ['2', '0010', '2', 'a[1..2]'], ['3', '0011', '1', 'a[3]'], ['4', '0100', '4', 'a[1..4]'],
        ['5', '0101', '1', 'a[5]'], ['6', '0110', '2', 'a[5..6]'], ['7', '0111', '1', 'a[7]'], ['8', '1000', '8', 'a[1..8]']
      ])}
      <p><b>prefix(i): strip the lowest bit until 0.</b> prefix(7): tree[7] (a[7]) → 7 − 1 = 6: tree[6] (a[5..6]) → 6 − 2 = 4: tree[4] (a[1..4]) → 0, stop. The three pieces [1..4] + [5..6] + [7] tile 1..7 exactly — one piece per 1-bit of 7 = 111.</p>
      <p><b>add(i, d): add the lowest bit until past N.</b> add(5): tree[5] → 5 + 1 = 6: tree[6] → 6 + 2 = 8: tree[8] → 16 &gt; N, stop. Those are exactly the boxes whose range contains 5.</p>
      <p><b>Family of tricks built on the same 10 lines:</b></p>
      ${H.table(['need', 'Fenwick trick', 'cost'], [
        ['point update, range sum', 'plain BIT', 'O(log N)'],
        ['range add, point query', 'BIT over the difference array: add(l, v), add(r+1, −v); a[i] = prefix(i)', 'O(log N)'],
        ['range add, range sum', 'two BITs: prefix(x) = B1(x)·x − B2(x)', 'O(log N)'],
        ['count of values ≤ x seen so far (inversions, "smaller after self")', 'BIT indexed by <b>value</b> (compress values first)', 'O(log N)'],
        ['k-th smallest in a dynamic multiset', 'BIT of counts + binary lifting descent', 'O(log N)'],
        ['2D: point update, rectangle sum', 'BIT of BITs (nested loops)', 'O(log N · log M)']
      ])}`,
    clues: [
      '"<b>Count inversions</b>" / "how many earlier elements are greater" / "count of smaller numbers after self" → BIT over values (with coordinate compression), O(N log N).',
      '"<b>Prefix sums with updates</b>", "running total that changes", "dynamic cumulative frequency" → Fenwick, the shortest correct answer.',
      '"Add v to [l, r]" + "what is a[i] now?" → BIT on the difference array (one BIT).',
      '"Find the <b>k-th smallest</b> / k-th remaining element after deletions" (List Removals, Josephus-like) → BIT of counts + binary lifting.',
      'Values up to 10<sup>9</sup> but only N ≤ 10<sup>5</sup> of them → <b>coordinate compression</b>, then BIT of size N.',
      'The operation is <b>min / max with arbitrary updates</b> → BIT is the wrong tool (no inverse); use a segment tree.'
    ],
    code: [`
      // Fenwick tree (Binary Indexed Tree), 1-based: tree[i] = sum of a(i - lowbit(i), i].
      class Fenwick {
          private final int n;
          private final long[] tree;

          Fenwick(int n) { this.n = n; tree = new long[n + 1]; }

          /** O(N) build from a 0-based array: every box hands its total to its parent box once. */
          Fenwick(int[] a) {
              this(a.length);
              for (int i = 1; i <= n; i++) {
                  tree[i] += a[i - 1];
                  int parent = i + (i & -i);
                  if (parent <= n) tree[parent] += tree[i];
              }
          }

          /** a[i] += delta (1-based): visit every box whose range contains i. */
          void add(int i, long delta) {
              for (; i <= n; i += i & -i) tree[i] += delta;
          }

          /** a[1] + ... + a[i]: strip the lowest set bit each step. */
          long prefix(int i) {
              long s = 0;
              for (; i > 0; i -= i & -i) s += tree[i];
              return s;
          }

          long rangeSum(int l, int r) { return prefix(r) - prefix(l - 1); }

          /** Smallest p with prefix(p) >= k (needs all a[i] >= 0). Returns n + 1 if no such p. O(log N). */
          int lowerBound(long k) {
              int pos = 0;
              for (int step = Integer.highestOneBit(Math.max(n, 1)); step > 0; step >>= 1) {
                  if (pos + step <= n && tree[pos + step] < k) {   // whole block still too small: jump over it
                      pos += step;
                      k -= tree[pos];
                  }
              }
              return pos + 1;
          }

          public static void main(String[] args) {
              Fenwick f = new Fenwick(new int[]{3, 2, -1, 6, 5, 4, -3, 3});
              System.out.println(f.prefix(7));       // 16
              System.out.println(f.rangeSum(3, 5));  // -1 + 6 + 5 = 10
              f.add(3, 5);                           // a[3]: -1 -> 4
              System.out.println(f.rangeSum(3, 5));  // 15
          }
      }`, `
      // Range ADD + range SUM with two Fenwick trees (1-based).
      // With d = difference array: prefix(x) = x * sum(d[1..x]) - sum(d[i] * (i - 1)).
      class RangeFenwick {
          private final int n;
          private final long[] b1, b2;

          RangeFenwick(int n) { this.n = n; b1 = new long[n + 2]; b2 = new long[n + 2]; }

          private void upd(long[] b, int i, long v) { for (; i <= n; i += i & -i) b[i] += v; }
          private long pre(long[] b, int i) { long s = 0; for (; i > 0; i -= i & -i) s += b[i]; return s; }

          /** a[l..r] += v */
          void rangeAdd(int l, int r, long v) {
              upd(b1, l, v);
              upd(b1, r + 1, -v);
              upd(b2, l, v * (l - 1));
              upd(b2, r + 1, -v * r);
          }

          long prefixSum(int x) { return pre(b1, x) * x - pre(b2, x); }

          long rangeSum(int l, int r) { return prefixSum(r) - prefixSum(l - 1); }

          public static void main(String[] args) {
              RangeFenwick rf = new RangeFenwick(8);   // a = 0 0 0 0 0 0 0 0
              rf.rangeAdd(2, 5, 3);                     // a = 0 3 3 3 3 0 0 0
              rf.rangeAdd(4, 8, 1);                     // a = 0 3 3 4 4 1 1 1
              System.out.println(rf.rangeSum(3, 6));    // 3 + 4 + 4 + 1 = 12
          }
      }`, { lang: 'python', run: true, title: 'Python: BIT, inversion count and k-th smallest (runnable)', code: `class BIT:
    def __init__(self, n):
        self.n = n
        self.t = [0] * (n + 1)

    def add(self, i, d):            # 1-based
        while i <= self.n:
            self.t[i] += d
            i += i & -i

    def prefix(self, i):
        s = 0
        while i > 0:
            s += self.t[i]
            i -= i & -i
        return s

    def kth(self, k):               # smallest p with prefix(p) >= k
        pos, step = 0, 1 << self.n.bit_length()
        while step:
            if pos + step <= self.n and self.t[pos + step] < k:
                pos += step
                k -= self.t[pos]
            step >>= 1
        return pos + 1


def inversions(a):
    ranks = {v: i + 1 for i, v in enumerate(sorted(set(a)))}   # coordinate compression
    bit, inv = BIT(len(ranks)), 0
    for seen, v in enumerate(a):
        r = ranks[v]
        inv += seen - bit.prefix(r)       # earlier elements strictly greater than v
        bit.add(r, 1)
    return inv


print("inversions of [8, 4, 2, 1] =", inversions([8, 4, 2, 1]))      # 6
print("inversions of [3, 1, 2] =", inversions([3, 1, 2]))            # 2

counts = BIT(10)                     # multiset of values 1..10
for v in [7, 2, 9, 2, 5]:
    counts.add(v, 1)
print("3rd smallest =", counts.kth(3))  # sorted: 2 2 5 7 9 -> 5
counts.add(2, -1)                    # remove one 2
print("3rd smallest now =", counts.kth(3))  # 2 5 7 9 -> 7` }],
    codeTitle: ['Fenwick tree with O(N) build and binary-lifting search', 'Two BITs: range add + range sum', 'Python: inversions + k-th smallest'],
    viz: {
      title: 'Fenwick tree: lowbit jumps for prefix sums and updates',
      input: '3 2 -1 6 5 4 -3 3 | sum 7 ; add 3 5 ; sum 5',
      inputLabel: 'array (2–16 numbers) | operations ";"-separated: "sum i" (prefix a[1..i]) or "add i v" — positions are 1-based',
      gen: function (input) {
        var p = splitBar(input, 2, 'array | ops   e.g.  3 2 -1 6 | sum 3 ; add 2 4');
        var a = parseNums(p[0], 'the array', 2, 16, -99, 99), n = a.length;
        var ops = p[1].split(';').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (!ops.length || ops.length > 5) throw new Error('Give 1 to 5 operations separated by ";".');
        ops = ops.map(function (s) {
          var t = s.split(/\s+/), kind = t[0].toLowerCase();
          if (kind !== 'add' && kind !== 'sum') throw new Error('Each operation must be "sum i" or "add i v" (got "' + s + '").');
          var nums = parseNums(t.slice(1).join(' '), 'the numbers of "' + s + '"', kind === 'add' ? 2 : 1, kind === 'add' ? 2 : 1, -99, 99);
          if (nums[0] < 1 || nums[0] > n) throw new Error('"' + s + '": position must be between 1 and ' + n + ' (1-based).');
          return { kind: kind, i: nums[0], v: nums[1] };
        });
        var w = Math.max(3, n.toString(2).length), tree = [], i, frames = [], idx = [];
        for (i = 0; i <= n; i++) tree.push(0);
        for (i = 1; i <= n; i++) idx.push(String(i));
        function treeVals() { return tree.slice(1); }
        function cover(i) { var lb = lowbit(i); return lb === 1 ? 'a[' + i + ']' : 'a[' + (i - lb + 1) + '..' + i + ']'; }
        function coverGrid(hlRow) {
          var rows = [], hl = {};
          for (var j = 1; j <= n; j++) rows.push([j, j.toString(2).padStart(w, '0'), lowbit(j), cover(j), tree[j]]);
          if (hlRow) hl[(hlRow - 1) + ',3'] = 'cur';
          return { type: 'grid', label: 'who stores what: tree[i] = sum of the last lowbit(i) elements ending at i', colHead: ['i', 'binary', 'lowbit', 'covers', 'tree[i]'], rows: rows, hl: hl };
        }
        frames.push({ narr: 'Positions are <b>1-based</b>. Box <code>tree[i]</code> is responsible for the last <b>lowbit(i)</b> elements ending at i (lowbit = the value of the lowest 1-bit). Odd i → just one element; i = 4, 8, 16 → everything from 1. All boxes start at 0.',
          parts: [{ type: 'array', label: 'a (1-based)', values: a, idxLabels: idx }, coverGrid(0)] });
        var demo = n >= 12 ? 12 : (n >= 6 ? 6 : 2);
        frames.push({ narr: 'How do we get lowbit fast? <code>i &amp; −i</code>. In two\'s complement −i flips every bit above the lowest 1 and keeps that 1, so AND leaves only that bit. For i = ' + demo + ': lowbit = <b>' + lowbit(demo) + '</b>.',
          parts: [{ type: 'bits', label: 'i = ' + demo, value: demo, width: w + 1, hl: one(Math.log2(lowbit(demo)), 'cur') },
            { type: 'bits', label: '−i (two\'s complement, low bits shown)', value: -demo, width: w + 1, hl: one(Math.log2(lowbit(demo)), 'cur'), showDec: false },
            { type: 'bits', label: 'i &amp; −i', value: lowbit(demo), width: w + 1, hl: one(Math.log2(lowbit(demo)), 'ok') }] });
        for (i = 1; i <= n; i++) {
          tree[i] += a[i - 1];
          var par = i + lowbit(i), hl = one(i - 1, 'ok');
          if (par <= n) { tree[par] += tree[i]; hl[par - 1] = 'cur'; }
          frames.push({ narr: 'O(N) build, i = ' + i + ': tree[' + i + '] gets a[' + i + '] = ' + a[i - 1] + ' and is now complete (' + cover(i) + ' = ' + tree[i] + '). ' + (par <= n ? 'Hand its total to its parent box i + lowbit(i) = ' + i + ' + ' + lowbit(i) + ' = <b>' + par + '</b>, whose range contains ours.' : 'Parent ' + par + ' &gt; N, nothing to hand over.'),
            parts: [{ type: 'array', label: 'a', values: a, idxLabels: idx, hl: one(i - 1, 'ok') }, { type: 'array', label: 'tree[1..N]', values: treeVals(), idxLabels: idx, hl: hl }, { type: 'bits', label: 'i', value: i, width: w, hl: one(Math.log2(lowbit(i)), 'cur') }] });
        }
        ops.forEach(function (op) {
          var j, steps = [], s = 0, hlT = {};
          if (op.kind === 'sum') {
            frames.push({ narr: '<b>prefix(' + op.i + ')</b> = a[1] + … + a[' + op.i + ']. Recipe: take tree[i], then remove the lowest 1-bit of i, repeat until i = 0. One box per 1-bit of ' + op.i + ' = ' + op.i.toString(2) + '₂.',
              parts: [{ type: 'array', label: 'a', values: a, idxLabels: idx, range: [0, op.i - 1] }, { type: 'array', label: 'tree', values: treeVals(), idxLabels: idx }, coverGrid(0)] });
            for (j = op.i; j > 0; j -= lowbit(j)) {
              s += tree[j]; steps.push(j); hlT[j - 1] = 'sel';
              var lo = j - lowbit(j) + 1;
              frames.push({ narr: 'i = ' + j + ' (' + j.toString(2) + '₂): take tree[' + j + '] = ' + tree[j] + ', which covers ' + cover(j) + '. Running sum = <b>' + s + '</b>. Next i = ' + j + ' − ' + lowbit(j) + ' = ' + (j - lowbit(j)) + (j - lowbit(j) === 0 ? ' → stop.' : '.'),
                parts: [{ type: 'array', label: 'a — the stretch just added', values: a, idxLabels: idx, range: [lo - 1, j - 1] }, { type: 'array', label: 'tree', values: treeVals(), idxLabels: idx, hl: copy(hlT) }, { type: 'bits', label: 'i', value: j, width: w, hl: one(Math.log2(lowbit(j)), 'cur') }, { type: 'vars', label: 'prefix(' + op.i + ')', vals: { 'boxes read': steps.join(' → '), sum: s } }] });
            }
            var chk = 0; for (j = 0; j < op.i; j++) chk += a[j];
            frames.push({ narr: 'prefix(' + op.i + ') = <b>' + s + '</b> after reading ' + steps.length + ' boxes (a loop would add ' + op.i + ' numbers; check: ' + chk + '). A range sum [l, r] is just prefix(r) − prefix(l − 1).',
              parts: [{ type: 'array', label: 'a', values: a, idxLabels: idx, range: [0, op.i - 1] }, { type: 'array', label: 'tree', values: treeVals(), idxLabels: idx, hl: copy(hlT) }, { type: 'vars', label: 'result', vals: { answer: s, 'boxes read': steps.length } }] });
          } else {
            a[op.i - 1] += op.v;
            frames.push({ narr: '<b>add(' + op.i + ', ' + op.v + ')</b>: a[' + op.i + '] becomes ' + a[op.i - 1] + '. Every box whose range contains position ' + op.i + ' must change. Recipe: start at i, then i += lowbit(i) until i &gt; N.',
              parts: [{ type: 'array', label: 'a', values: a, idxLabels: idx, hl: one(op.i - 1, 'ok') }, { type: 'array', label: 'tree', values: treeVals(), idxLabels: idx }] });
            for (j = op.i; j <= n; j += lowbit(j)) {
              tree[j] += op.v; steps.push(j); hlT[j - 1] = 'ok';
              frames.push({ narr: 'i = ' + j + ' (' + j.toString(2) + '₂): tree[' + j + '] covers ' + cover(j) + ', which contains ' + op.i + ' → add ' + op.v + ' → ' + tree[j] + '. Next i = ' + j + ' + ' + lowbit(j) + ' = ' + (j + lowbit(j)) + (j + lowbit(j) > n ? ' &gt; N → stop.' : '.'),
                parts: [{ type: 'array', label: 'a', values: a, idxLabels: idx, hl: one(op.i - 1, 'ok'), range: [j - lowbit(j), j - 1] }, { type: 'array', label: 'tree', values: treeVals(), idxLabels: idx, hl: copy(hlT) }, { type: 'bits', label: 'i', value: j, width: w, hl: one(Math.log2(lowbit(j)), 'cur') }, { type: 'vars', label: 'add(' + op.i + ', ' + op.v + ')', vals: { 'boxes updated': steps.join(' → ') } }] });
            }
          }
        });
        return frames;
      }
    },
    examples: [
      {
        title: 'prefix(13) is "pay 13 with coins 8 + 4 + 1"',
        html: `<p>N = 16. 13 = <b>1101</b>₂.</p>
          ${H.table(['step', 'i (binary)', 'lowbit', 'box covers', 'next i'], [
            ['1', '13 (1101)', '1', 'a[13]', '12'],
            ['2', '12 (1100)', '4', 'a[9..12]', '8'],
            ['3', '8 (1000)', '8', 'a[1..8]', '0 → stop']
          ])}
          <p>Pieces [1..8] + [9..12] + [13] tile 1..13 with no gaps and no overlaps. The number of steps = number of 1-bits ≤ ⌊log₂ N⌋ + 1 = 5 for N = 16.</p>`
      },
      {
        title: 'add(5, d) climbs 5 → 6 → 8 → 16',
        html: `<p>N = 16. Which boxes contain position 5?</p>
          ${H.table(['i', 'binary', 'covers', 'contains 5?', 'next = i + lowbit'], [
            ['5', '00101', 'a[5]', '✔', '6'], ['6', '00110', 'a[5..6]', '✔', '8'], ['8', '01000', 'a[1..8]', '✔', '16'], ['16', '10000', 'a[1..16]', '✔', '32 &gt; 16 stop']
          ])}
          <p>Boxes 7 (a[7]) and 12 (a[9..12]) do not contain 5 and are correctly skipped. Adding lowbit "carries" the lowest 1-bit upward, jumping to the next box whose range is larger and still ends after 5.</p>`
      },
      {
        title: 'Counting inversions with a BIT over values',
        html: `<p>a = [3, 1, 2]. An <b>inversion</b> is a pair i &lt; j with a[i] &gt; a[j]. Walk left to right; before inserting v, the number of earlier elements greater than v = <code>seen − prefix(v)</code>.</p>
          ${H.table(['v', 'seen so far', 'prefix(v) = earlier ≤ v', 'greater earlier', 'BIT counts after insert', 'total'], [
            ['3', '0', '0', '0', '{3:1}', '0'],
            ['1', '1', '0', H.c('r', '1') + ' (the 3)', '{1:1, 3:1}', '1'],
            ['2', '2', '1 (the 1)', H.c('r', '1') + ' (the 3)', '{1:1, 2:1, 3:1}', H.c('g', '2')]
          ])}
          <p>If values are up to 10<sup>9</sup> or negative, first replace each value by its rank among the sorted distinct values (coordinate compression). Total O(N log N), and it is the standard alternative to merge-sort inversion counting.</p>`
      },
      {
        title: 'Range add + point query with one BIT on differences',
        html: `<p>Difference array <code>d[i] = a[i] − a[i−1]</code>, so <code>a[i] = d[1] + … + d[i]</code> = a prefix sum. "Add v to a[l..r]" changes only two differences: d[l] += v, d[r+1] −= v.</p>
          ${H.arr([0, 0, 0, 0, 0, 0], { label: 'a (1..6) start', start: 1 })}
          <p>add 5 to [2,4] → BIT: add(2, 5), add(5, −5). add 2 to [3,6] → add(3, 2), add(7, −2) (7 &gt; N, skipped). Now a[4] = prefix(4) = 5 + 2 = 7 ✔ and a[5] = prefix(5) = 5 + 2 − 5 = 2 ✔.</p>
          ${H.arr([0, 5, 7, 7, 2, 2], { label: 'a after both adds', start: 1, hl: { 3: 'g', 4: 'g' } })}`
      }
    ],
    deepDive: `<p><b>Why the tiling works (proof sketch).</b> Write i = 2<sup>b₁</sup> + 2<sup>b₂</sup> + … + 2<sup>bₖ</sup> with b₁ &gt; … &gt; bₖ. The prefix loop visits i, i − 2<sup>bₖ</sup>, … ; each box covers exactly the block between consecutive numbers in that chain, so the blocks tile (0, i]. For updates: box j covers position p iff j − lowbit(j) &lt; p ≤ j. Starting from j = p and repeatedly adding lowbit produces exactly the boxes satisfying that condition in increasing order — any j in between would have a lowbit too small to reach back to p. Each step either removes or carries a bit, so both loops take ≤ ⌊log₂ N⌋ + 1 iterations.</p>
      <p><b>Binary lifting search (lowerBound) in O(log N).</b> Binary searching with <code>prefix(mid)</code> costs O(log² N). Instead walk powers of two from high to low: from position <code>pos</code>, box <code>pos + 2<sup>k</sup></code> covers exactly (pos, pos + 2<sup>k</sup>] because pos is a multiple of 2<sup>k+1</sup> at that moment. If its total is still &lt; k-remaining, jump over it. This is how you find "the k-th remaining element" in O(log N) — "List Removals" and order-statistic multisets.</p>
      <p><b>Fenwick vs segment tree.</b></p>
      ${H.table(['', 'Fenwick', 'segment tree'], [
        ['memory', 'N + 1', '2N (iterative) / 4N (recursive)'],
        ['code', '~10 lines', '30–60 lines'],
        ['ops', 'invertible (sum, xor, counts)', 'any associative op, custom nodes, lazy'],
        ['speed (Java, 10<sup>6</sup> ops)', 'fastest', '2–3× slower recursive'],
        ['range update', 'add only (two BITs)', 'add, assign, affine, flips…']
      ])}
      <p><b>Max-Fenwick caveat.</b> A Fenwick tree for prefix <i>max</i> works only when values never decrease (each update is <code>tree[j] = max(tree[j], v)</code>). That is enough for LIS in O(N log N) or "best dp value among smaller keys", a common DP-with-data-structure trick, but not for general max with arbitrary updates.</p>
      <p><b>2D and beyond.</b> A 2D BIT nests the two loops: update (x, y) touches O(log N · log M) cells; rectangle sum uses inclusion–exclusion of four prefix queries. Memory N·M, so it fits only moderate grids (e.g. 2000 × 2000 longs = 32 MB). For sparse huge grids use offline sweep + 1D BIT instead.</p>
      <p><b>Practical notes.</b> Keep 1-based indexing inside the class and convert at the boundary — mixing 0- and 1-based is the most common Fenwick bug (an infinite loop at i = 0 because 0 &amp; −0 = 0). Use <code>long</code> sums. For counts over values, compress with sort + dedupe + binary search, or a HashMap from value to rank.</p>`,
    aiEra: `<p><b>What AI changes:</b> the 10-line Fenwick is pure boilerplate for a model — and that is exactly why interviewers now probe the <i>why</i>: "why does <code>i &amp; −i</code> work?", "why can't you do max?", "derive the two-BIT formula". Expect to explain two's complement and the tiling argument without notes.</p>
      <p><b>Typical AI mistakes:</b> 0-based Fenwick with <code>for (; i &gt; 0; ...)</code> that silently drops index 0 or loops forever; forgetting coordinate compression and allocating a 10<sup>9</sup>-sized array; inversion counts using <code>prefix(v)</code> where <code>prefix(v − 1)</code> is needed (ties counted wrongly); claiming a BIT can answer range minimum with arbitrary updates.</p>
      <p><b>Use AI as a partner:</b> ask it to generate tricky inputs (duplicates, negatives, all equal values) for your inversion counter and to cross-check against an O(N²) brute force; ask it to explain the two-BIT derivation step by step and verify each line yourself with a tiny numeric example. <b>What you must own:</b> recognising "count of earlier elements with property X" as a BIT-over-values problem, the strict vs non-strict boundary (v vs v − 1), and choosing BIT over a segment tree when the op is invertible.</p>`,
    problems: [{
      title: 'Count of Smaller Numbers After Self',
      level: 'Hard',
      tags: ['fenwick tree', 'coordinate compression', 'counting'],
      companies: ['Google', 'Amazon', 'Apple', 'ByteDance'],
      statement: `<p>Given an integer array <code>nums</code>, return an array <code>counts</code> where <code>counts[i]</code> is the number of elements to the <b>right</b> of <code>nums[i]</code> that are <b>strictly smaller</b> than <code>nums[i]</code>.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>5</sup>, −10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup>`,
      example: `${H.arr([5, 2, 6, 1], { label: 'nums' })}${H.arr([2, 1, 1, 0], { label: 'counts', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g' } })}
        <p>Right of 5 the smaller ones are ${H.c('g', '2 and 1')} → 2. Right of 2: only 1 → 1. Right of 6: only 1 → 1. Nothing is right of 1 → 0.</p>`,
      brute: {
        why: `<p>For each i scan everything to its right: N(N−1)/2 ≈ 5·10<sup>9</sup> comparisons for N = 10<sup>5</sup>. The waste: each scan re-counts the same suffix from scratch instead of keeping a running "how many of each value have I seen".</p>`,
        code: `
          List<Integer> countSmallerBrute(int[] nums) {
              List<Integer> res = new ArrayList<>();
              for (int i = 0; i < nums.length; i++) {
                  int c = 0;
                  for (int j = i + 1; j < nums.length; j++) if (nums[j] < nums[i]) c++;
                  res.add(c);
              }
              return res;
          }`
      },
      mcq: {
        q: 'Walking from right to left with a BIT of counts indexed by value, what do you ask before inserting nums[i] = v?',
        options: ['prefix(v)', 'prefix(v − 1)', 'prefix(N) − prefix(v)', 'lowerBound(v)'],
        answer: 1,
        explain: 'Everything in the BIT is to the right of i. "Strictly smaller than v" = count of values in [min, v − 1] = prefix(v − 1). prefix(v) would also count equal values.'
      },
      hints: [
        `<p><b>Aha:</b> process from the right. Then "elements to the right" = "elements already processed". You need a structure that answers "how many processed values are &lt; v" and supports "insert v".</p>`,
        `<p>BIT indexed by <b>value</b>: shift values by +10<sup>4</sup> + 1 so they become 1..20001 (or compress ranks for arbitrary values). Query <code>prefix(rank − 1)</code>, then <code>add(rank, 1)</code>.</p>`,
        `<p>Edge cases: duplicates (strict, so v − 1), negative numbers (offset), N = 1. Recipe: for i from N−1 down to 0 → r = nums[i] + OFFSET → ans[i] = prefix(r − 1) → add(r, 1).</p>`
      ],
      solution: {
        approach: `<p>Right-to-left sweep with a Fenwick tree of counts over the value range. Each step is one prefix query and one point add, so the whole thing is O(N log V). Merge sort with index tracking is the alternative O(N log N) solution.</p>`,
        code: `
          class Solution {
              public List<Integer> countSmaller(int[] nums) {
                  final int OFFSET = 10001;                 // maps -10000..10000 to 1..20001
                  int size = 20002;
                  int[] bit = new int[size + 1];
                  Integer[] ans = new Integer[nums.length];
                  for (int i = nums.length - 1; i >= 0; i--) {
                      int r = nums[i] + OFFSET;
                      int c = 0;
                      for (int j = r - 1; j > 0; j -= j & -j) c += bit[j];       // how many seen values < nums[i]
                      ans[i] = c;
                      for (int j = r; j <= size; j += j & -j) bit[j]++;           // insert nums[i]
                  }
                  return Arrays.asList(ans);
              }

              public static void main(String[] args) {
                  System.out.println(new Solution().countSmaller(new int[]{5, 2, 6, 1}));   // [2, 1, 1, 0]
                  System.out.println(new Solution().countSmaller(new int[]{-1, -1}));       // [0, 0]
              }
          }`,
        alt: [{ lang: 'python', code: `def count_smaller(nums):
    ranks = {v: i + 1 for i, v in enumerate(sorted(set(nums)))}   # works for any value range
    n = len(ranks)
    bit = [0] * (n + 1)
    out = [0] * len(nums)
    for i in range(len(nums) - 1, -1, -1):
        r = ranks[nums[i]]
        j, c = r - 1, 0
        while j > 0:
            c += bit[j]
            j -= j & -j
        out[i] = c
        j = r
        while j <= n:
            bit[j] += 1
            j += j & -j
    return out


print(count_smaller([5, 2, 6, 1]))  # [2, 1, 1, 0]`, run: true }],
        dry: {
          head: ['i', 'nums[i]', 'values already in BIT (to the right)', 'prefix(v − 1) = smaller', 'counts[i]'],
          rows: [
            ['3', '1', '{}', '0', '0'],
            ['2', '6', '{1}', '1', '1'],
            ['1', '2', '{1, 6}', '1 (the 1)', '1'],
            ['0', '5', '{1, 2, 6}', '2 (1 and 2)', H.c('g', '2')]
          ]
        },
        complexity: `<p>O(N log V) time with V = 20 001 (≈ 15 steps per loop), O(V) memory. With compression: O(N log N) time, O(N) memory.</p>`,
        followUps: ['Count "reverse pairs" where nums[i] &gt; 2·nums[j] (LeetCode 493).', 'Return the total number of inversions instead of per-index counts.', 'What if values are up to 10<sup>9</sup>? (compress)']
      }
    }]
  });

  // =====================================================================
  // TOPIC 4 — Sparse table for RMQ
  // =====================================================================
  topics.push({
    title: 'Sparse Table: O(1) Range Minimum on a Static Array',
    analogy: `<p>A long school corridor has security cameras. Each camera watches a stretch whose length is a power of two: 1 metre, 2 metres, 4, 8… and there is one camera of each size starting at every metre. You want the <b>tallest person</b> standing between metre 2 and metre 6 (5 metres). There is no 5-metre camera, but you can look at <b>two 4-metre cameras</b>: one covering 2–5 and one covering 3–6. They <b>overlap</b> on 3–5 — but who cares? The tallest person in the overlap is seen by both, and "tallest" does not change if you see someone twice.</p>
      <p>That is the sparse table: precompute every power-of-two window once, then answer any min/max question by looking at just <b>two</b> overlapping windows. It only works because the corridor never changes (no updates) and because seeing someone twice does not change a min or max. Counting people would be ruined by the double look — that is why sums need a different trick.</p>`,
    explain: `<p><b>When to use it.</b> The array is <b>static</b> (no updates) and you get many queries like min, max or gcd of <code>a[l..r]</code>. Prefix sums handle static <i>sums</i>; the sparse table handles static <i>min/max/gcd</i> — and answers in <b>O(1)</b>, faster than a segment tree's O(log N).</p>
      <p><b>The table.</b> <code>st[k][i]</code> = min of the window that starts at <code>i</code> and has length <code>2<sup>k</sup></code>, i.e. <code>a[i .. i + 2<sup>k</sup> − 1]</code>.</p>
      <ul>
        <li>Row k = 0 is the array itself (windows of length 1).</li>
        <li>Each next row is built from two halves of the previous row: <code>st[k][i] = min(st[k−1][i], st[k−1][i + 2<sup>k−1</sup>])</code>.</li>
        <li>There are ⌊log₂ N⌋ + 1 rows, each with ≤ N entries → <b>O(N log N)</b> build time and memory.</li>
      </ul>
      ${H.arr([4, 6, 1, 5, 7, 3, 8, 2], { label: 'a' })}
      ${H.table(['k (window length)', 'i = 0', '1', '2', '3', '4', '5', '6', '7'], [
        ['0 (1)', '4', '6', '1', '5', '7', '3', '8', '2'],
        ['1 (2)', '4', '1', '1', '5', '3', '3', '2', '·'],
        ['2 (4)', '1', '1', '1', '3', '2', '·', '·', '·'],
        ['3 (8)', '1', '·', '·', '·', '·', '·', '·', '·']
      ])}
      <p><b>The O(1) query.</b> For <code>[l, r]</code> with length <code>len = r − l + 1</code>, let <code>k = ⌊log₂ len⌋</code> (the biggest power of two that fits). Two windows of length 2<sup>k</sup> — one starting at <code>l</code>, one ending at <code>r</code> — together cover [l, r] (because 2·2<sup>k</sup> ≥ len):</p>
      <p style="text-align:center"><code>min(a[l..r]) = min(st[k][l], st[k][r − 2<sup>k</sup> + 1])</code></p>
      <p>Example: [2, 6] → len 5, k = 2 → windows [2..5] (= 1) and [3..6] (= 3) → <b>1</b>. Precompute <code>lg[x] = lg[x/2] + 1</code> so you never call a slow log function.</p>
      <p><b>Which operations allow the overlap?</b> The ones where counting an element twice changes nothing — <b>idempotent</b> operations: <code>x ⊕ x = x</code>.</p>
      ${H.table(['operation', 'idempotent?', 'sparse table query'], [
        ['min, max', H.c('g', 'yes'), 'O(1), two overlapping windows'],
        ['gcd, bitwise AND, bitwise OR', H.c('g', 'yes'), 'O(1)'],
        ['sum, product, xor, count', H.c('r', 'no — overlap double counts'), 'O(log N): split len into disjoint powers of two (its binary digits)'],
      ])}
      <p><b>Trade-off in one line:</b> sparse table = fastest queries, zero updates, N log N memory. One update means rebuilding — if updates exist, use a segment tree.</p>`,
    clues: [
      '"The array <b>does not change</b>" + "<b>many</b> min / max queries" (Q up to 10<sup>6</sup>) → sparse table, O(1) per query.',
      '"<b>Range GCD</b>" / "range AND / OR" on a static array → sparse table (all idempotent).',
      '"<b>Lowest common ancestor</b>, many queries, tree never changes" → Euler tour + sparse table RMQ gives O(1) LCA.',
      '"Longest subarray where <b>max − min ≤ limit</b>" / "count subarrays with gcd = g" → two pointers or binary search + O(1) range max/min/gcd.',
      'Q is huge (10<sup>6</sup>–10<sup>7</sup>) and even log N per query is too slow → O(1) RMQ is the hint.',
      'Updates are mentioned at all → sparse table is <b>out</b> (rebuild costs O(N log N)).'
    ],
    code: [`
      // Sparse table for static range MIN: O(N log N) build, O(1) query.
      class SparseTable {
          private final int[][] st;   // st[k][i] = min of a[i .. i + 2^k - 1]
          private final int[] lg;     // lg[x] = floor(log2 x), precomputed

          SparseTable(int[] a) {
              int n = a.length;
              lg = new int[n + 1];
              for (int x = 2; x <= n; x++) lg[x] = lg[x / 2] + 1;
              int levels = lg[n] + 1;
              st = new int[levels][];
              st[0] = a.clone();                                     // windows of length 1
              for (int k = 1; k < levels; k++) {
                  int len = 1 << k, half = len >> 1;
                  st[k] = new int[n - len + 1];                      // only windows that fit inside the array
                  for (int i = 0; i + len <= n; i++)
                      st[k][i] = Math.min(st[k - 1][i], st[k - 1][i + half]); // left half, right half
              }
          }

          /** min of a[l..r] in O(1): two overlapping power-of-two windows. */
          int query(int l, int r) {
              int k = lg[r - l + 1];
              return Math.min(st[k][l], st[k][r - (1 << k) + 1]);
          }

          public static void main(String[] args) {
              SparseTable t = new SparseTable(new int[]{4, 6, 1, 5, 7, 3, 8, 2});
              System.out.println(t.query(2, 6));   // 1
              System.out.println(t.query(3, 7));   // 2
              System.out.println(t.query(4, 5));   // 3
          }
      }`, `
      // One table for GCD (idempotent, O(1) query) and one for SUM (not idempotent, O(log N) disjoint jumps).
      class SparseGcdSum {
          private final long[][] g, s;
          private final int[] lg;

          SparseGcdSum(long[] a) {
              int n = a.length;
              lg = new int[n + 1];
              for (int x = 2; x <= n; x++) lg[x] = lg[x / 2] + 1;
              int levels = lg[n] + 1;
              g = new long[levels][n];
              s = new long[levels][n];
              for (int i = 0; i < n; i++) { g[0][i] = a[i]; s[0][i] = a[i]; }
              for (int k = 1; k < levels; k++)
                  for (int i = 0; i + (1 << k) <= n; i++) {
                      int j = i + (1 << (k - 1));
                      g[k][i] = gcd(g[k - 1][i], g[k - 1][j]);
                      s[k][i] = s[k - 1][i] + s[k - 1][j];
                  }
          }

          static long gcd(long x, long y) { while (y != 0) { long t = x % y; x = y; y = t; } return Math.abs(x); }

          /** Overlap is harmless for gcd: gcd(x, x) = x. */
          long rangeGcd(int l, int r) {
              int k = lg[r - l + 1];
              return gcd(g[k][l], g[k][r - (1 << k) + 1]);
          }

          /** Overlap would double count, so walk the binary digits of the length: disjoint blocks. */
          long rangeSum(int l, int r) {
              long total = 0;
              int len = r - l + 1;
              for (int k = lg[len]; k >= 0; k--) {
                  if (((len >> k) & 1) == 1) { total += s[k][l]; l += 1 << k; }
              }
              return total;
          }

          public static void main(String[] args) {
              SparseGcdSum t = new SparseGcdSum(new long[]{12, 18, 24, 36, 10});
              System.out.println(t.rangeGcd(0, 3));  // 6
              System.out.println(t.rangeGcd(1, 4));  // 2
              System.out.println(t.rangeSum(0, 2));  // 54
          }
      }`, { lang: 'python', run: true, title: 'Python sparse table + brute-force check (runnable)', code: `import random


def build(a, op):
    n = len(a)
    lg = [0] * (n + 1)
    for x in range(2, n + 1):
        lg[x] = lg[x // 2] + 1
    st = [a[:]]
    k = 1
    while (1 << k) <= n:
        prev, half = st[-1], 1 << (k - 1)
        st.append([op(prev[i], prev[i + half]) for i in range(n - (1 << k) + 1)])
        k += 1
    return st, lg


def query(st, lg, op, l, r):
    k = lg[r - l + 1]
    return op(st[k][l], st[k][r - (1 << k) + 1])


a = [4, 6, 1, 5, 7, 3, 8, 2]
st, lg = build(a, min)
print("min a[2..6] =", query(st, lg, min, 2, 6))   # 1
print("rows:", [row for row in st])

random.seed(5)
b = [random.randint(-50, 50) for _ in range(200)]
st, lg = build(b, max)
for _ in range(2000):
    l = random.randrange(200)
    r = random.randrange(l, 200)
    assert query(st, lg, max, l, r) == max(b[l:r + 1])
print("2000 random max queries match brute force")` }],
    codeTitle: ['Sparse table (min) — interview version', 'GCD in O(1), SUM in O(log N) with the same table idea', 'Python + brute-force check'],
    viz: {
      title: 'Build the sparse table row by row, then answer with two overlapping windows',
      input: 'min | 4 6 1 5 7 3 8 2 | 2 6',
      inputLabel: 'op (min/max/gcd/sum) | array (2–16 numbers, 0..99 for gcd) | query l r (0-based)',
      gen: function (input) {
        var p = splitBar(input, 3, 'op | array | l r   e.g.  min | 4 6 1 5 | 1 3');
        var opName = p[0].toLowerCase(), op = getOp(opName, ['min', 'max', 'gcd', 'sum']);
        var a = parseNums(p[1], 'the array', 2, 16, -99, 99), n = a.length;
        var q = parseNums(p[2], 'the query "l r"', 2, 2, 0, n - 1), ql = q[0], qr = q[1];
        if (ql > qr) throw new Error('The query needs l ≤ r.');
        var K = log2floor(n), st = [a.slice()], frames = [], k, i;
        function grid(hl, upto) {
          var rows = [], heads = [];
          for (var kk = 0; kk <= K; kk++) {
            heads.push('k=' + kk + ' (len ' + (1 << kk) + ')');
            var row = [];
            for (var ii = 0; ii < n; ii++) row.push(kk <= upto && st[kk] && ii < st[kk].length ? show(st[kk][ii]) : (ii + (1 << kk) <= n ? '?' : '·'));
            rows.push(row);
          }
          var ch = []; for (var c = 0; c < n; c++) ch.push('i=' + c);
          return { type: 'grid', label: 'st[k][i] = ' + opName + ' of a[i .. i+2^k−1]  ("·" = window would stick out of the array)', rowHead: heads, colHead: ch, rows: rows, hl: hl || {} };
        }
        frames.push({ narr: 'Static array, ' + n + ' elements → ' + (K + 1) + ' rows (k = 0 … ⌊log₂ ' + n + '⌋ = ' + K + '). Row k stores the ' + opName + ' of every window of length 2<sup>k</sup>. "·" marks windows that would run past the end.',
          parts: [{ type: 'array', label: 'a', values: a }, grid({}, -1)] });
        var hl0 = {}; for (i = 0; i < n; i++) hl0['0,' + i] = 'ok';
        frames.push({ narr: 'Row k = 0: a window of length 1 is a single element, so row 0 is just a copy of the array.', parts: [{ type: 'array', label: 'a', values: a }, grid(hl0, 0)] });
        for (k = 1; k <= K; k++) {
          var half = 1 << (k - 1), row = [];
          for (i = 0; i + (1 << k) <= n; i++) row.push(op.f(st[k - 1][i], st[k - 1][i + half]));
          st.push(row);
          var ex = Math.min(1, row.length - 1), h = {};
          for (i = 0; i < row.length; i++) h[k + ',' + i] = 'ok';
          h[k + ',' + ex] = 'sel'; h[(k - 1) + ',' + ex] = 'cur'; h[(k - 1) + ',' + (ex + half)] = 'cur';
          frames.push({ narr: 'Row k = ' + k + ' (windows of length ' + (1 << k) + '): each window = its left half + its right half, both already in row ' + (k - 1) + '. Example: st[' + k + '][' + ex + '] = ' + combineText(op, st[k - 1][ex], st[k - 1][ex + half], row[ex]) + ' (halves start at i = ' + ex + ' and i = ' + (ex + half) + ').',
            parts: [{ type: 'array', label: 'a — the example window', values: a, range: [ex, ex + (1 << k) - 1] }, grid(h, k)] });
        }
        frames.push({ narr: 'Build done: about N·log N = ' + n + '·' + (K + 1) + ' cells, each computed in O(1). Now the query <b>' + opName + ' of a[' + ql + '..' + qr + ']</b>.', parts: [{ type: 'array', label: 'a', values: a, range: [ql, qr] }, grid({}, K)] });
        var len = qr - ql + 1, kq = log2floor(len);
        if (opName !== 'sum') {
          var l2 = qr - (1 << kq) + 1, ahl = {};
          for (i = ql; i < ql + (1 << kq); i++) ahl[i] = 'cur';
          for (i = l2; i <= qr; i++) ahl[i] = ahl[i] ? 'sel' : 'ok';
          frames.push({ narr: 'Length = ' + len + ' → k = ⌊log₂ ' + len + '⌋ = <b>' + kq + '</b>: the biggest power of two that fits is ' + (1 << kq) + '. One window starts at l = ' + ql + ', the other ends at r = ' + qr + ' (starts at ' + l2 + '). Together they cover the whole range; purple cells are covered twice.',
            parts: [{ type: 'array', label: 'a: amber = first window, green = second, purple = overlap', values: a, hl: ahl }, grid((function () { var g = {}; g[kq + ',' + ql] = 'cur'; g[kq + ',' + l2] = 'ok'; return g; })(), K)] });
          var res = op.f(st[kq][ql], st[kq][l2]);
          frames.push({ narr: 'Answer = ' + combineText(op, st[kq][ql], st[kq][l2], res) + '. Seeing the overlap twice is harmless because ' + opName + '(x, x) = x (idempotent). Two table reads → <b>O(1)</b>, no matter how long the range.',
            parts: [{ type: 'array', label: 'a', values: a, range: [ql, qr] }, grid((function () { var g = {}; g[kq + ',' + ql] = 'sel'; g[kq + ',' + l2] = 'sel'; return g; })(), K), { type: 'vars', label: 'result', vals: { len: len, k: kq, answer: show(res), 'cells read': 2 } }] });
          if (ql !== l2) {
            var dbl = 0; for (i = l2; i < ql + (1 << kq); i++) dbl += a[i];
            frames.push({ narr: 'Why sums cannot do this: adding both windows would count the overlap a[' + l2 + '..' + (ql + (1 << kq) - 1) + '] twice (extra ' + dbl + '). For a sum table you instead split the length into <b>disjoint</b> powers of two — try the op "sum" in the input to see it.',
              parts: [{ type: 'array', label: 'a — overlap highlighted', values: a, hl: ahl }, { type: 'text', label: 'idempotent vs not', html: '<b>min/max/gcd/and/or</b>: overlap OK → O(1). <b>sum/xor/product</b>: overlap breaks → O(log N) disjoint jumps.' }] });
          }
        } else {
          var bitsLen = len, pos = ql, total = 0, used = [];
          frames.push({ narr: 'Sum is <b>not idempotent</b>: overlapping windows would double count. Instead write the length ' + len + ' in binary (' + len.toString(2) + '₂) and take one <b>disjoint</b> window per 1-bit, from the biggest down.',
            parts: [{ type: 'array', label: 'a', values: a, range: [ql, qr] }, { type: 'bits', label: 'length', value: len, width: Math.max(3, len.toString(2).length) }, grid({}, K)] });
          for (k = K; k >= 0; k--) if ((bitsLen >> k) & 1) {
            total += st[k][pos]; used.push('st[' + k + '][' + pos + ']');
            var g2 = {}; g2[k + ',' + pos] = 'sel';
            frames.push({ narr: 'Bit ' + k + ' of the length is 1 → take the window of length ' + (1 << k) + ' starting at ' + pos + ': st[' + k + '][' + pos + '] = ' + st[k][pos] + '. Running sum = <b>' + total + '</b>. Move start to ' + (pos + (1 << k)) + '.',
              parts: [{ type: 'array', label: 'a — this block', values: a, range: [pos, pos + (1 << k) - 1] }, { type: 'bits', label: 'length', value: len, width: Math.max(3, len.toString(2).length), hl: one(k, 'cur') }, grid(g2, K), { type: 'vars', label: 'sum so far', vals: { blocks: used.join(' + '), total: total } }] });
            pos += 1 << k;
          }
          frames.push({ narr: 'Sum = <b>' + total + '</b> from ' + used.length + ' disjoint blocks (O(log N)). For a static sum, plain prefix sums are simpler and O(1) — the sparse table shines for min/max/gcd.',
            parts: [{ type: 'array', label: 'a', values: a, range: [ql, qr] }, { type: 'vars', label: 'result', vals: { answer: total, 'blocks read': used.length } }] });
        }
        return frames;
      }
    },
    examples: [
      {
        title: 'Three queries on the same table',
        html: `${H.arr([4, 6, 1, 5, 7, 3, 8, 2], { label: 'a' })}
          ${H.table(['query', 'len', 'k = ⌊log₂ len⌋', 'windows (start, length 2<sup>k</sup>)', 'answer'], [
            ['min[2,6]', '5', '2', 'st[2][2] = min(1,5,7,3) = 1 · st[2][3] = min(5,7,3,8) = 3', H.c('g', '1')],
            ['min[3,7]', '5', '2', 'st[2][3] = 3 · st[2][4] = min(7,3,8,2) = 2', H.c('g', '2')],
            ['min[4,5]', '2', '1', 'st[1][4] = 3 · st[1][4] = 3 (same window twice!)', H.c('g', '3')]
          ])}
          <p>When the length is an exact power of two, both windows are the same window — still correct.</p>`
      },
      {
        title: 'Range GCD with overlap',
        html: `<p>a = [12, 18, 24, 36, 10]. gcd of [0, 2]: len 3 → k = 1 → windows [0,1] = gcd(12, 18) = 6 and [1,2] = gcd(18, 24) = 6 → gcd(6, 6) = <b>6</b>. 18 was used twice and nothing broke, because gcd(x, x) = x.</p>
          <p>gcd of [1, 4]: len 4 → k = 2 → one window [1..4] = gcd(18, 24, 36, 10) = <b>2</b>.</p>
          <p>A classic use: "count subarrays whose gcd equals g" — for each left end, the gcd only decreases as the right end grows and takes at most log(max) distinct values, so you binary search the boundaries with O(1) range-gcd queries.</p>`
      },
      {
        title: 'Why sum breaks with overlap (and how to fix it)',
        html: `<p>a = [1, 2, 3]. Sum of [0, 2] with the min-trick: windows [0,1] = 3 and [1,2] = 5 → 3 + 5 = <b>${H.c('r', '8')}</b>, but the truth is 6: a[1] = 2 was counted twice.</p>
          <p>Fix: length 3 = 11₂ = 2 + 1 → disjoint blocks st[1][0] = 3 (covers [0,1]) then st[0][2] = 3 (covers [2]) → <b>${H.c('g', '6')}</b>. That is O(log N) per query — fine, but for static sums plain prefix sums are O(1) and simpler. Use this only when you need the table anyway (e.g. "sum of the 2<sup>k</sup> next jumps" in binary lifting).</p>`
      },
      {
        title: 'LCA in O(1) via Euler tour + RMQ',
        html: `<p>Walk the tree with DFS and write down every node each time you enter or return to it (Euler tour), with its depth. The LCA of u and v is the <b>shallowest node</b> written between the first visits of u and v — a range-minimum query on the depth array!</p>
          ${H.table(['position', '0', '1', '2', '3', '4', '5', '6'], [['node', 'A', 'B', 'D', 'B', 'A', 'C', 'A'], ['depth', '0', '1', '2', '1', '0', '1', '0']])}
          <p>LCA(D, C): first visits at positions 2 and 5 → min depth on [2, 5] is 0 at position 4 → node <b>A</b>. Tour length 2N − 1, sparse table O(N log N) build, then every LCA is O(1). (Binary lifting is the other classic, O(log N) per query — see Advanced Graphs.)</p>`
      }
    ],
    deepDive: `<p><b>Correctness of the query.</b> With k = ⌊log₂ len⌋ we have 2<sup>k</sup> ≤ len &lt; 2<sup>k+1</sup>. The window [l, l + 2<sup>k</sup> − 1] stays inside [l, r] because 2<sup>k</sup> ≤ len; the window [r − 2<sup>k</sup> + 1, r] too. Their union is [l, r] because 2·2<sup>k</sup> &gt; len, so they meet or overlap. For an idempotent, associative, commutative op the result equals the op over [l, r].</p>
      <p><b>Memory and layout.</b> N = 10<sup>6</sup> → 20 rows × 10<sup>6</sup> ints = 80 MB: often over the limit. Store <code>st[k][i]</code> (row by level), not <code>st[i][k]</code>: the build loop and the two query reads walk contiguous memory. If memory is tight, store <b>indices</b> in a smaller type, or use the block trick below.</p>
      <p><b>Beyond the basic table.</b></p>
      <ul>
        <li><b>Disjoint sparse table</b>: for each level, store prefix/suffix aggregates around block midpoints; any associative op (even sum, matrix product) is answered in O(1) with exactly one combine. Same N log N memory.</li>
        <li><b>⟨O(N), O(1)⟩ RMQ</b> (Fischer–Heun, Bender–Farach-Colton): cut the array into blocks of ~log N, build a sparse table over block minima (N/log N · log N = O(N)), and answer inside blocks with precomputed tables. A practical version uses blocks of 32/64 and a monotonic-stack bitmask per position, answering in-block queries with one <code>numberOfTrailingZeros</code>.</li>
        <li><b>Sqrt tree</b>: O(1) queries for any associative op with O(N log log N) build and even supports updates in O(√N).</li>
      </ul>
      <p><b>Sparse table vs segment tree for static RMQ.</b> Sparse: O(1) query, N log N memory, no updates. Segment tree: O(log N) query, 2N memory, updates. For Q = 10<sup>6</sup> static queries on N = 10<sup>5</sup>, sparse table does 2·10<sup>6</sup> reads vs ~3.4·10<sup>7</sup> node visits.</p>
      <p><b>Where the idea lives in production.</b> Binary lifting tables (<code>up[k][v]</code> = 2<sup>k</sup>-th ancestor) are sparse tables over a tree. Time-series databases and observability tools keep pre-aggregated min/max rollups at several power-of-two-ish granularities so dashboards can show "max latency over any window" instantly — the same "precompute power-of-two windows" thinking.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating a sparse table is trivial; deciding that one is appropriate is not. A model will happily build a sparse table for a problem that later says "and support updates", or use it for range sums with the overlapping trick (wrong answer). Your job is to read the constraints and check idempotence before accepting the code.</p>
      <p><b>Typical AI mistakes:</b> computing <code>k</code> with <code>(int) Math.log(len) / Math.log(2)</code> (floating-point error at exact powers of two — use a precomputed <code>lg[]</code> or <code>31 − Integer.numberOfLeadingZeros(len)</code>); allocating <code>st[n][LOG]</code> with LOG = 20 for N = 10<sup>6</sup> (memory limit); off-by-one in <code>r − (1 &lt;&lt; k) + 1</code>; using the overlap trick for sum or xor.</p>
      <p><b>Use AI as a partner:</b> ask it "for which of these operations is the sparse table O(1) query valid: min, sum, gcd, xor, OR?" and verify its reasoning with the x ⊕ x = x test; ask for a brute-force checker on random arrays including N = 1 and exact powers of two. <b>What you must own:</b> the static-vs-dynamic decision, the idempotence argument, and the memory estimate.</p>`,
    problems: [{
      title: 'Longest Subarray with Max − Min ≤ Limit',
      level: 'Medium',
      tags: ['sparse table', 'two pointers', 'range min/max'],
      companies: ['Google', 'Amazon', 'Uber'],
      statement: `<p>Given an integer array <code>nums</code> and an integer <code>limit</code>, return the length of the longest non-empty contiguous subarray such that the absolute difference between <b>any two</b> of its elements is ≤ <code>limit</code> (equivalently, <code>max − min ≤ limit</code>).</p>`,
      constraints: `1 ≤ N ≤ 10<sup>5</sup>, 1 ≤ nums[i] ≤ 10<sup>9</sup>, 0 ≤ limit ≤ 10<sup>9</sup>`,
      example: `${H.arr([8, 2, 4, 7], { label: 'nums', hl: { 1: 'g', 2: 'g' } })}<p>limit = 4 → output ${H.c('g', '2')}. [2, 4] has max − min = 2 ≤ 4 (and [4, 7] has 3 ≤ 4). Both windows of length 3 fail: [8, 2, 4] has max − min = 6 and [2, 4, 7] has 5, both &gt; 4.</p>`,
      brute: {
        why: `<p>Try every subarray and compute its max and min while extending the right end: O(N²) = 10<sup>10</sup> for N = 10<sup>5</sup>. The waste: when [l, r] fails, every longer window starting at l fails too, but brute force keeps checking them.</p>`,
        code: `
          int longestBrute(int[] nums, int limit) {
              int best = 0;
              for (int l = 0; l < nums.length; l++) {
                  int mx = nums[l], mn = nums[l];
                  for (int r = l; r < nums.length; r++) {
                      mx = Math.max(mx, nums[r]);
                      mn = Math.min(mn, nums[r]);
                      if (mx - mn > limit) break;      // longer windows from l only get worse
                      best = Math.max(best, r - l + 1);
                  }
              }
              return best;
          }`
      },
      mcq: {
        q: 'Inside a two-pointer loop you need max(nums[l..r]) and min(nums[l..r]) many times, and nums never changes. Which tool gives each answer in O(1)?',
        options: ['Prefix sums', 'Sparse tables for max and min', 'A Fenwick tree', 'Sorting the window each time'],
        answer: 1,
        explain: 'max and min are idempotent, the array is static → two overlapping power-of-two windows answer each in O(1). Prefix sums only work for invertible ops; a BIT cannot do arbitrary max/min ranges.'
      },
      hints: [
        `<p><b>Aha:</b> if [l, r] is valid, every sub-window is valid; if it is invalid, every bigger window containing it is invalid. That monotonicity is the signal for <b>two pointers</b>: extend r, shrink l while invalid.</p>`,
        `<p>The only thing you need inside the loop is <code>max(l..r) − min(l..r)</code>. Precompute two sparse tables (max and min) → each check is O(1). (The O(N) alternative uses two monotonic deques.)</p>`,
        `<p>Edge cases: limit = 0 (longest run of equal values), N = 1 (answer 1). Recipe: build lg[], mx[][], mn[][] → l = 0 → for r in 0..N−1: while range(l, r) invalid: l++ → best = max(best, r − l + 1).</p>`
      ],
      solution: {
        approach: `<p>Two pointers over a static array with O(1) range max/min from two sparse tables. Each pointer moves at most N times, so after the O(N log N) build the sweep is O(N).</p>`,
        code: `
          class Solution {
              public int longestSubarray(int[] nums, int limit) {
                  int n = nums.length;
                  int[] lg = new int[n + 1];
                  for (int x = 2; x <= n; x++) lg[x] = lg[x / 2] + 1;
                  int levels = lg[n] + 1;
                  int[][] mx = new int[levels][n], mn = new int[levels][n];
                  mx[0] = nums.clone();
                  mn[0] = nums.clone();
                  for (int k = 1; k < levels; k++)
                      for (int i = 0; i + (1 << k) <= n; i++) {
                          int j = i + (1 << (k - 1));
                          mx[k][i] = Math.max(mx[k - 1][i], mx[k - 1][j]);
                          mn[k][i] = Math.min(mn[k - 1][i], mn[k - 1][j]);
                      }
                  int best = 0, l = 0;
                  for (int r = 0; r < n; r++) {
                      while (true) {
                          int k = lg[r - l + 1], s = r - (1 << k) + 1;
                          int hi = Math.max(mx[k][l], mx[k][s]);
                          int lo = Math.min(mn[k][l], mn[k][s]);
                          if (hi - lo <= limit) break;        // window valid
                          l++;                                // too wide: shrink from the left
                      }
                      best = Math.max(best, r - l + 1);
                  }
                  return best;
              }

              public static void main(String[] args) {
                  System.out.println(new Solution().longestSubarray(new int[]{8, 2, 4, 7}, 4));               // 2
                  System.out.println(new Solution().longestSubarray(new int[]{10, 1, 2, 4, 7, 2}, 5));        // 4
                  System.out.println(new Solution().longestSubarray(new int[]{4, 2, 2, 2, 4, 4, 2, 2}, 0));   // 3
              }
          }`,
        alt: [{ lang: 'python', code: `from collections import deque


def longest_subarray(nums, limit):
    # O(N) alternative with monotonic deques (same two-pointer skeleton)
    mx, mn = deque(), deque()
    l = best = 0
    for r, v in enumerate(nums):
        while mx and nums[mx[-1]] <= v:
            mx.pop()
        mx.append(r)
        while mn and nums[mn[-1]] >= v:
            mn.pop()
        mn.append(r)
        while nums[mx[0]] - nums[mn[0]] > limit:
            l += 1
            if mx[0] < l:
                mx.popleft()
            if mn[0] < l:
                mn.popleft()
        best = max(best, r - l + 1)
    return best


print(longest_subarray([8, 2, 4, 7], 4))          # 2
print(longest_subarray([10, 1, 2, 4, 7, 2], 5))   # 4`, run: true }],
        dry: {
          head: ['r', 'window before check', 'max − min', 'action', 'best'],
          rows: [
            ['0', '[8]', '0', 'valid', '1'],
            ['1', '[8, 2]', '6 &gt; 4', 'l → 1: [2] valid', '1'],
            ['2', '[2, 4]', '2', 'valid', '2'],
            ['3', '[2, 4, 7]', '5 &gt; 4', 'l → 2: [4, 7] = 3 valid', H.c('g', '2')]
          ]
        },
        complexity: `<p>Build O(N log N) time and memory (2 × 17 × 10<sup>5</sup> ints ≈ 13.6 MB); sweep O(N) with O(1) checks. Deque version: O(N) time, O(N) memory.</p>`,
        followUps: ['Solve it in O(N) with monotonic deques — why is that better here?', 'Count all subarrays with max − min ≤ limit (sum of window lengths).', 'Answer Q offline queries "longest valid subarray inside [L, R]".']
      }
    }]
  });

  // =====================================================================
  // TOPIC 5 — Sqrt decomposition
  // =====================================================================
  topics.push({
    title: 'Sqrt Decomposition: Cut the Array into √N Blocks',
    analogy: `<p>A library has one very long shelf of 10 000 books. The librarian sticks a <b>label on every 100-book section</b>: "this section has 31 240 pages". A visitor asks: "how many pages from book 1 234 to book 8 765?" She counts the few loose books at the two ends one by one (at most 100 + 100), and for the ~75 sections fully in between she just <b>reads the labels</b>. About 250 steps instead of 7 500.</p>
      <p>When a book is replaced, she fixes the book and the one label of its section. Nothing fancy, no tree — just <b>sections of √N books</b>, chosen so that "loose books at the ends" and "number of labels" are balanced. That simple idea, called <b>sqrt decomposition</b>, also handles weird queries that trees struggle with.</p>`,
    explain: `<p><b>The recipe.</b> Pick a block size <code>B ≈ √N</code>. Element i lives in block <code>i / B</code>. For every block keep a summary (sum, min, a sorted copy, a frequency table — whatever the query needs).</p>
      ${H.arr([4, 1, 7, 2, 9, 3, 6, 8, 5, 2], { label: 'a (N = 10, B = 3)', hl: { 0: 'b', 1: 'b', 2: 'b', 6: 'b', 7: 'b', 8: 'b' } })}
      ${H.table(['block', 'indices', 'elements', 'block sum'], [['b0', '0–2', '4 1 7', '12'], ['b1', '3–5', '2 9 3', '14'], ['b2', '6–8', '6 8 5', '19'], ['b3', '9', '2', '2']])}
      <p><b>Query [l, r]</b> = left partial block (walk elements) + full blocks in the middle (read summaries) + right partial block (walk elements). At most 2B elements + N/B summaries. <b>Point update</b> = fix the element + its block summary.</p>
      <p>Sum of a[1..8]: left partial a[1], a[2] = 1 + 7; full block b1 = 14; right part (block b2 holds 8, so we walk it) 6 + 8 + 5 → total 8 + 14 + 19 = <b>41</b>.</p>
      <p><b>Why √N?</b> Cost per query ≈ <code>2B + N/B</code>. If B is tiny there are too many blocks; if B is huge the partial walks are long. The sum <code>B + N/B</code> is smallest when <code>B = N/B</code>, i.e. <b>B = √N</b>, giving O(√N) per operation:</p>
      ${H.table(['B', 'element walk ~2B', 'block reads N/B', 'total (N = 10<sup>6</sup>)'], [['10', '20', '100 000', H.c('r', '100 020')], ['1 000 (√N)', '2 000', '1 000', H.c('g', '3 000')], ['100 000', '200 000', '10', H.c('r', '200 010')]])}
      <p><b>Range updates</b> work like a mini-lazy: for a full block store a block-level tag (<code>blockAdd[b] += v</code>), for partial blocks touch the elements. Sum of a full block = <code>blockSum[b] + blockAdd[b]·B</code>.</p>
      <p><b>Why learn it when segment trees are O(log N)?</b> Because the block summary can be <i>anything</i>:</p>
      <ul>
        <li><b>Sorted copy</b> per block → "how many elements ≤ x in [l, r] with updates" in O(√N log N). A segment tree needs a merge-sort tree, which cannot be updated easily.</li>
        <li><b>Frequency table</b> per block → "most frequent value in a range" style queries (with extra precomputation).</li>
        <li><b>Sqrt on queries</b>: buffer updates; every √Q operations rebuild a static structure (like prefix sums) from scratch. Each query = static answer + scan of the small buffer.</li>
        <li><b>Heavy/light threshold</b>: items with frequency/degree &gt; √N are "heavy" (there are at most √N of them) and get precomputed answers; light items are brute-forced.</li>
      </ul>
      <p>It is the Swiss-army knife for "weird" range problems, and the foundation of <b>Mo's algorithm</b> (next topic).</p>`,
    clues: [
      '"Count elements <b>≤ x</b> (or equal to x) in [l, r]" <i>with updates</i> → sorted blocks + binary search, O(√N log N).',
      'The merge operation is <b>awkward</b> (cannot combine two halves cheaply) but a block-by-block scan is easy → sqrt decomposition.',
      '<code>N, Q ≤ 10<sup>5</sup></code> and time limit 2–5 s → O(Q·√N) ≈ 3·10<sup>7</sup>–10<sup>8</sup> is affordable: a hint that √N is intended.',
      '"Jump / bounce" problems: "from position i jump a[i] steps, how many jumps to leave?" with updates → per-block "jumps to exit block + exit position" (the classic Holes problem).',
      'A threshold like "if the value appears more than √N times" or "degree &gt; √M" in the editorial-style reasoning → heavy/light sqrt split.',
      'You need a <b>fallback</b> in an interview: "I don\'t remember lazy segment trees perfectly, but blocks of √N give O(√N) safely" — a valid, explainable answer.'
    ],
    code: [`
      // Sqrt decomposition: range ADD + range SUM, O(√N) per operation.
      class SqrtDecomposition {
          private final int n, B;
          private final long[] a;          // element values WITHOUT their block's pending add
          private final long[] blockSum;   // sum of a[] inside each block (also without blockAdd)
          private final long[] blockAdd;   // pending "+v" for a WHOLE block

          SqrtDecomposition(int[] arr) {
              n = arr.length;
              B = Math.max(1, (int) Math.sqrt(n));
              a = new long[n];
              int blocks = (n + B - 1) / B;
              blockSum = new long[blocks];
              blockAdd = new long[blocks];
              for (int i = 0; i < n; i++) { a[i] = arr[i]; blockSum[i / B] += arr[i]; }
          }

          void rangeAdd(int l, int r, long v) {
              int bl = l / B, br = r / B;
              if (bl == br) {                                        // both ends in one block: walk it
                  for (int i = l; i <= r; i++) { a[i] += v; blockSum[bl] += v; }
                  return;
              }
              for (int i = l; i < (bl + 1) * B; i++) { a[i] += v; blockSum[bl] += v; }   // left partial
              for (int b = bl + 1; b < br; b++) blockAdd[b] += v;                         // full blocks, O(1) each
              for (int i = br * B; i <= r; i++) { a[i] += v; blockSum[br] += v; }        // right partial
          }

          long rangeSum(int l, int r) {
              int bl = l / B, br = r / B;
              long s = 0;
              if (bl == br) {
                  for (int i = l; i <= r; i++) s += a[i] + blockAdd[bl];
                  return s;
              }
              for (int i = l; i < (bl + 1) * B; i++) s += a[i] + blockAdd[bl];
              for (int b = bl + 1; b < br; b++) s += blockSum[b] + blockAdd[b] * B;       // middle blocks are full (size B)
              for (int i = br * B; i <= r; i++) s += a[i] + blockAdd[br];
              return s;
          }

          public static void main(String[] args) {
              SqrtDecomposition sd = new SqrtDecomposition(new int[]{4, 1, 7, 2, 9, 3, 6, 8, 5, 2});
              System.out.println(sd.rangeSum(1, 8));   // 41
              sd.rangeAdd(2, 7, 10);                   // six elements +10
              System.out.println(sd.rangeSum(1, 8));   // 101
          }
      }`, { lang: 'python', run: true, title: 'Python sqrt decomposition + stress test (runnable)', code: `import math
import random


class Sqrt:
    def __init__(self, arr):
        self.n = len(arr)
        self.B = max(1, math.isqrt(self.n))
        self.a = list(arr)
        nb = (self.n + self.B - 1) // self.B
        self.bsum = [0] * nb
        self.badd = [0] * nb
        for i, v in enumerate(arr):
            self.bsum[i // self.B] += v

    def add(self, l, r, v):
        B = self.B
        i = l
        while i <= r:
            b = i // B
            if i % B == 0 and i + B - 1 <= r:      # whole block inside [l, r]
                self.badd[b] += v
                i += B
            else:                                  # loose element
                self.a[i] += v
                self.bsum[b] += v
                i += 1

    def sum(self, l, r):
        B, s, i = self.B, 0, l
        while i <= r:
            b = i // B
            if i % B == 0 and i + B - 1 <= r:
                s += self.bsum[b] + self.badd[b] * B
                i += B
            else:
                s += self.a[i] + self.badd[b]
                i += 1
        return s


arr = [4, 1, 7, 2, 9, 3, 6, 8, 5, 2]
sd = Sqrt(arr)
print("sum[1..8] =", sd.sum(1, 8))        # 41
random.seed(11)
truth = [random.randint(-9, 9) for _ in range(57)]
sd = Sqrt(truth)
for _ in range(3000):
    l = random.randrange(57)
    r = random.randrange(l, 57)
    if random.random() < 0.5:
        v = random.randint(-5, 5)
        sd.add(l, r, v)
        for i in range(l, r + 1):
            truth[i] += v
    else:
        assert sd.sum(l, r) == sum(truth[l:r + 1])
print("3000 random range-add / range-sum ops match, block size", sd.B)` }],
    codeTitle: ['Range add + range sum with √N blocks', 'Python + stress test'],
    viz: {
      title: 'Blocks of √N: walk loose elements at the edges, read block labels in the middle',
      input: '4 1 7 2 9 3 6 8 5 2 | sum 1 8 ; add 2 7 10 ; sum 1 8 ; set 4 0',
      inputLabel: 'array (2–25 numbers) | ops ";"-separated: "sum l r", "add l r v", "set i v" (0-based, up to 5)',
      gen: function (input) {
        var p = splitBar(input, 2, 'array | ops   e.g.  4 1 7 2 | sum 0 3 ; set 1 5');
        var arr = parseNums(p[0], 'the array', 2, 25, -99, 99), n = arr.length;
        var B = Math.max(1, Math.floor(Math.sqrt(n))), nb = Math.ceil(n / B);
        var ops = p[1].split(';').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (!ops.length || ops.length > 5) throw new Error('Give 1 to 5 operations separated by ";".');
        ops = ops.map(function (s) {
          var t = s.split(/\s+/), kind = t[0].toLowerCase(), need = { sum: 2, add: 3, set: 2 }[kind];
          if (!need) throw new Error('Operations are "sum l r", "add l r v" or "set i v" (got "' + s + '").');
          var nums = parseNums(t.slice(1).join(' '), 'the numbers of "' + s + '"', need, need, -99, 99);
          if (kind !== 'set' && (nums[0] < 0 || nums[1] >= n || nums[0] > nums[1])) throw new Error('"' + s + '": need 0 ≤ l ≤ r ≤ ' + (n - 1) + '.');
          if (kind === 'set' && (nums[0] < 0 || nums[0] >= n)) throw new Error('"' + s + '": index must be 0..' + (n - 1) + '.');
          return { kind: kind, x: nums };
        });
        var a = arr.slice(), bsum = [], badd = [], i, b, frames = [];
        for (b = 0; b < nb; b++) { bsum.push(0); badd.push(0); }
        for (i = 0; i < n; i++) bsum[Math.floor(i / B)] += a[i];
        var idxL = []; for (i = 0; i < n; i++) idxL.push(i + '·b' + Math.floor(i / B));
        var bL = []; for (b = 0; b < nb; b++) bL.push('b' + b + ' [' + (b * B) + '–' + Math.min(n - 1, b * B + B - 1) + ']');
        function real() { var r = []; for (var j = 0; j < n; j++) r.push(a[j] + badd[Math.floor(j / B)]); return r; }
        function blockColors() { var h = {}; for (var j = 0; j < n; j++) if (Math.floor(j / B) % 2 === 1) h[j] = 'done'; return h; }
        function parts(ahl, bhl, vals, range) {
          return [{ type: 'array', label: 'true values (index·block; alternate blocks faded)', values: real(), idxLabels: idxL, hl: ahl, range: range },
            { type: 'array', label: 'block sums (stored)', values: bsum.slice(), idxLabels: bL, hl: bhl || {} },
            { type: 'array', label: 'block pending add (lazy)', values: badd.slice(), idxLabels: bL, hl: bhl || {} },
            { type: 'vars', label: 'state', vals: vals }];
        }
        frames.push({ narr: 'N = ' + n + ' → block size B = ⌊√' + n + '⌋ = <b>' + B + '</b>, so ' + nb + ' blocks. Every block keeps one label: the sum of its elements (plus a pending "add to whole block" tag for range updates).',
          parts: parts(blockColors(), {}, { B: B, blocks: nb }) });
        ops.forEach(function (op) {
          var x = op.x, steps = 0;
          if (op.kind === 'set') {
            var bi = Math.floor(x[0] / B), old = a[x[0]] + badd[bi], stored = x[1] - badd[bi];
            bsum[bi] += stored - a[x[0]]; a[x[0]] = stored;
            frames.push({ narr: '<b>set a[' + x[0] + '] = ' + x[1] + '</b> (was ' + old + '): change the element and fix its block label b' + bi + ' by the difference ' + (x[1] - old) + '. Just 2 writes → O(1).',
              parts: parts(one(x[0], 'ok'), one(bi, 'ok'), { op: 'set ' + x[0] + ' ' + x[1], 'steps': 2 }) });
            return;
          }
          var l = x[0], r = x[1], v = x[2], s = 0, ahl = {}, bhl = {}, name = op.kind === 'sum' ? 'sum ' + l + '..' + r : 'add ' + v + ' to ' + l + '..' + r;
          frames.push({ narr: '<b>' + name + '</b>: left end in block b' + Math.floor(l / B) + ', right end in block b' + Math.floor(r / B) + '. Loose elements at the edges are handled one by one; blocks completely inside are handled by their label in O(1).',
            parts: parts({}, {}, { op: name, steps: 0 }, [l, r]) });
          i = l;
          while (i <= r) {
            b = Math.floor(i / B);
            if (i % B === 0 && i + B - 1 <= r) {
              steps++;
              for (var j = i; j < i + B; j++) ahl[j] = 'sel';
              bhl[b] = 'sel';
              if (op.kind === 'sum') {
                s += bsum[b] + badd[b] * B;
                frames.push({ narr: 'Block b' + b + ' lies <b>completely inside</b> → read its label: ' + (badd[b] ? bsum[b] + ' + pending ' + badd[b] + ' × ' + B + ' = ' + (bsum[b] + badd[b] * B) : bsum[b]) + '. One step for ' + B + ' elements. Running sum = <b>' + s + '</b>.',
                  parts: parts(copy(ahl), copy(bhl), { op: name, 'running sum': s, steps: steps }, [l, r]) });
              } else {
                badd[b] += v;
                frames.push({ narr: 'Block b' + b + ' lies <b>completely inside</b> → do not touch its elements; just add ' + v + ' to its pending tag (now ' + badd[b] + '). One step instead of ' + B + '.',
                  parts: parts(copy(ahl), copy(bhl), { op: name, steps: steps }, [l, r]) });
              }
              i += B;
            } else {
              steps++;
              ahl[i] = 'cur';
              if (op.kind === 'sum') {
                s += a[i] + badd[b];
                frames.push({ narr: 'Index ' + i + ' is a <b>loose</b> element (its block b' + b + ' is only partly inside) → add it directly: ' + (a[i] + badd[b]) + '. Running sum = <b>' + s + '</b>.',
                  parts: parts(copy(ahl), copy(bhl), { op: name, 'running sum': s, steps: steps }, [l, r]) });
              } else {
                a[i] += v; bsum[b] += v;
                frames.push({ narr: 'Index ' + i + ' is a <b>loose</b> element → change it directly (+' + v + ') and keep block b' + b + '\'s label in sync (+' + v + ').',
                  parts: parts(copy(ahl), copy(bhl), { op: name, steps: steps }, [l, r]) });
              }
              ahl[i] = 'ok';
              i++;
            }
          }
          frames.push({ narr: (op.kind === 'sum' ? 'Answer = <b>' + s + '</b>' : 'Update done') + ' in ' + steps + ' steps (a plain loop needs ' + (r - l + 1) + '). Worst case is about 2B + N/B = ' + (2 * B + nb) + ' here; for N = 10<sup>6</sup> that is ~3 000 instead of 10<sup>6</sup>.',
            parts: parts({}, {}, op.kind === 'sum' ? { op: name, answer: s, steps: steps } : { op: name, steps: steps }, [l, r]) });
        });
        return frames;
      }
    },
    examples: [
      {
        title: 'Tracing sum[1..8] with N = 10, B = 3',
        html: `${H.table(['piece', 'indices', 'how', 'value'], [
            ['left loose', '1, 2', 'walk elements', '1 + 7 = 8'],
            ['full block b1', '3–5', 'read label', '14'],
            ['full block b2', '6–8', 'read label', '19'],
            ['total', '', '4 steps instead of 8', H.c('g', '41')]
          ])}
          <p>In the Java version the block containing r is always walked as "right partial" even when it is fully covered (it may be the short last block). Both styles are correct; the Python version checks "whole block inside [l, r]" explicitly.</p>`
      },
      {
        title: 'Count of values ≤ x in [l, r] with sorted blocks',
        html: `<p>a = [5, 1, 4, 8, 2, 7, 3, 6, 9], B = 3. Keep a <b>sorted copy</b> of every block: [1, 4, 5], [2, 7, 8], [3, 6, 9].</p>
          <p>Query "how many ≤ 5 in [1, 7]": loose a[1], a[2] = 1, 4 → 2; full block b1 → binary search in [2, 7, 8] → 1; loose a[6], a[7] = 3, 6 → 1. Total <b>4</b> (values 1, 4, 2, 3).</p>
          <p>Update a[3] = 0: replace 8 by 0 in b1's sorted copy and bubble it into place → [0, 2, 7] (O(B)). Query cost O(B + (N/B)·log B). This is the guided problem below.</p>`
      },
      {
        title: 'Sqrt on queries: rebuild every √Q operations',
        html: `<p>Problem: point updates + range sums, but you only remember prefix sums. Keep a <b>buffer</b> of pending updates (index, delta). A query = <code>prefix[r+1] − prefix[l]</code> + every buffered delta whose index lies in [l, r]. When the buffer reaches √Q entries, apply them to the array and rebuild the prefix sums in O(N).</p>
          ${H.table(['cost', 'formula', 'N = Q = 10<sup>5</sup>'], [['rebuilds', '(Q / √Q) · N = √Q · N', '≈ 3.2·10<sup>7</sup>'], ['queries', 'Q · √Q', '≈ 3.2·10<sup>7</sup>']])}
          <p>Useful when the static structure is easy but making it dynamic is hard (e.g. a static data structure that is expensive to update, like a sorted array or a precomputed graph answer).</p>`
      },
      {
        title: 'Heavy/light split by a √N threshold',
        html: `<p>Query: "for two values x and y, what is the minimum distance between an occurrence of x and one of y?" Values that appear more than √N times are <b>heavy</b> — there are at most √N of them. For each heavy value precompute the answer against every other value with one O(N) sweep → O(N√N) total. For two <b>light</b> values merge their position lists (each &lt; √N long) in O(√N). Every query becomes O(√N) or O(1).</p>`
      }
    ],
    deepDive: `<p><b>Choosing B for real.</b> The textbook B = √N balances only the simplest costs. If full blocks cost log B each (sorted blocks + binary search), minimise 2B + (N/B)·log B → B ≈ √(N log N). If partial-block work is cheap array scanning (cache-friendly) and block work involves random access, a <b>larger</b> B is often faster in practice. Measure with your data; powers of two (e.g. 256, 512) let the compiler turn <code>i / B</code> into a shift.</p>
      <p><b>When sqrt beats a segment tree.</b> (1) The node merge is expensive or impossible (sorted lists, frequency tables, "number of distinct"). (2) Updates change elements in ways that are not lazy-friendly (e.g. "a[i] = a[i] mod x" — rebuild only the touched partial blocks). (3) You need something working in 15 minutes with low bug risk. Constant factors matter too: O(√N) with simple loops can beat O(log² N) with heavy recursion for N ≈ 10<sup>5</sup>.</p>
      <p><b>Complexity reality check (Java, ~10<sup>8</sup>–10<sup>9</sup> simple ops/s).</b> N = Q = 2·10<sup>5</sup>, B = 450 → Q·(2B + N/B) ≈ 2·10<sup>5</sup> · 1 350 ≈ 2.7·10<sup>8</sup>. Fine if the inner loops are tight primitive-array scans; too slow with boxed collections or HashMaps inside.</p>
      <p><b>Classic sqrt problems.</b> "Holes" (jump game with updates): per block store, for each position, how many jumps to leave the block and where you land — updates rebuild one block in O(B), queries hop block to block in O(N/B). "Range mode" (most frequent value) uses precomputed answers between block boundaries. Sqrt ideas also appear in graph algorithms (triangle counting in O(M√M) by orienting edges from low to high degree).</p>
      <p><b>Relation to other techniques.</b> Mo's algorithm is sqrt decomposition applied to the <i>order of queries</i>. Sqrt tree and van Emde Boas-style structures recursively apply √N splits (√N, then √√N, …) to reach O(log log N). In systems, page-level summaries (B-tree pages, columnar storage "zone maps" with per-block min/max that let a database skip whole blocks during a scan) are the same idea: summarise fixed-size blocks, scan only the edges.</p>`,
    aiEra: `<p><b>What AI changes:</b> because AI makes heavy structures cheap to type, people over-engineer: a persistent segment tree where a 30-line sqrt decomposition would do. In an interview, proposing the sqrt version first, stating its complexity honestly ("O(√N) per op, ~3·10<sup>7</sup> total, fits"), and then optionally upgrading shows judgement.</p>
      <p><b>Typical AI mistakes:</b> treating the last (shorter) block as full size B in the sum formula <code>blockSum + blockAdd·B</code>; forgetting to add the block's pending tag when walking loose elements; recomputing block summaries from scratch on every point update (O(B) instead of O(1) for sums); choosing B = 100 hard-coded for N = 10<sup>6</sup>.</p>
      <p><b>Use AI as a partner:</b> ask for a stress test with block sizes 1, 2, √N and N (the edge cases where partial/full logic breaks); ask it to estimate operation counts for your constraints; ask "is there a √ or offline trick that avoids a persistent structure here?" — then verify. <b>What you must own:</b> the B + N/B balancing argument and the decision of what summary each block stores.</p>`,
    problems: [{
      title: 'Count Values ≤ x in a Range, with Updates',
      level: 'Hard',
      tags: ['sqrt decomposition', 'binary search', 'online queries'],
      companies: ['Google', 'Codenation', 'DE Shaw'],
      statement: `<p>You are given an array <code>a</code> of N integers and Q operations, processed online in order:</p>
        <ul><li><code>[1, i, v]</code> — set <code>a[i] = v</code>.</li><li><code>[2, l, r, x]</code> — report how many indices <code>j</code> in <code>[l, r]</code> have <code>a[j] ≤ x</code>.</li></ul>
        <p>Return the answers of all type-2 operations.</p>`,
      constraints: `1 ≤ N, Q ≤ 5·10<sup>4</sup>, |a[i]|, |v|, |x| ≤ 10<sup>9</sup>, 0-based indices, time limit 2 s.`,
      example: `${H.arr([5, 1, 4, 8, 2, 7, 3, 6, 9], { label: 'a', hl: { 1: 'g', 2: 'g', 4: 'g', 6: 'g' } })}
        <p>Ops: [2,1,7,5], [1,3,0], [2,1,7,5] → output ${H.c('g', '[4, 5]')}. In a[1..7] = [1,4,8,2,7,3,6] the values ≤ 5 are 1, 4, 2, 3 → 4. After a[3] = 0 the 8 becomes 0 → 5.</p>`,
      brute: {
        why: `<p>Loop over [l, r] for every query: O(N) each, up to 5·10<sup>4</sup> × 5·10<sup>4</sup> = 2.5·10<sup>9</sup>. Updates are O(1). The waste: the same middle elements are compared against x over and over, although a sorted summary of them would answer "how many ≤ x" with one binary search.</p>`,
        code: `
          List<Integer> bruteCount(int[] a0, int[][] ops) {
              int[] a = a0.clone();
              List<Integer> out = new ArrayList<>();
              for (int[] op : ops) {
                  if (op[0] == 1) a[op[1]] = op[2];
                  else {
                      int c = 0;
                      for (int j = op[1]; j <= op[2]; j++) if (a[j] <= op[3]) c++;
                      out.add(c);
                  }
              }
              return out;
          }`
      },
      mcq: {
        q: 'Why is a plain segment tree awkward here, while √N blocks are easy?',
        options: ['Segment trees cannot store negative numbers', 'Merging "sorted lists" of two children costs O(size), and updating every sorted list on a path is expensive', 'Segment trees need the array length to be a power of two', 'Binary search does not work on segment trees'],
        answer: 1,
        explain: 'A merge-sort tree answers static queries in O(log² N), but an update would have to fix a sorted list in every one of the log N nodes on its path, each O(size). With blocks only one sorted list of size √N changes.'
      },
      hints: [
        `<p><b>Aha:</b> "how many ≤ x" in a <i>sorted</i> list is one binary search. So keep each block of √N elements also as a sorted copy.</p>`,
        `<p>Query: loose elements at the two edges are compared one by one; each full block contributes <code>upperBound(sorted[b], x)</code>. Update: in that block's sorted copy, replace the old value by the new one and bubble it into position (O(B)).</p>`,
        `<p>Edge cases: l and r in the same block (just walk), the last block shorter than B, duplicates (use upper bound "≤ x", not lower bound). Recipe: B = √N → build sorted blocks → per op: update = find old value, overwrite, bubble; query = edges + binary searches.</p>`
      ],
      solution: {
        approach: `<p>Sqrt decomposition with a sorted copy per block. Query: O(B + (N/B)·log B). Update: O(B). With B ≈ √N ≈ 224 that is ≈ 2 000 steps per op, 10<sup>8</sup> in total — comfortably inside 2 s.</p>`,
        code: `
          class Solution {
              private int n, B;
              private int[] a;
              private int[][] sorted;            // sorted copy of every block

              public List<Integer> process(int[] arr, int[][] ops) {
                  n = arr.length;
                  B = Math.max(1, (int) Math.sqrt(n));
                  a = arr.clone();
                  int blocks = (n + B - 1) / B;
                  sorted = new int[blocks][];
                  for (int b = 0; b < blocks; b++) {
                      sorted[b] = Arrays.copyOfRange(a, b * B, Math.min(n, b * B + B));
                      Arrays.sort(sorted[b]);
                  }
                  List<Integer> out = new ArrayList<>();
                  for (int[] op : ops) {
                      if (op[0] == 1) update(op[1], op[2]);
                      else out.add(query(op[1], op[2], op[3]));
                  }
                  return out;
              }

              /** number of values <= x in a sorted array (upper bound). */
              private static int countLE(int[] s, int x) {
                  int lo = 0, hi = s.length;
                  while (lo < hi) {
                      int mid = (lo + hi) >>> 1;
                      if (s[mid] <= x) lo = mid + 1; else hi = mid;
                  }
                  return lo;
              }

              private void update(int i, int v) {
                  int[] s = sorted[i / B];
                  int pos = Arrays.binarySearch(s, a[i]);     // some slot holding the old value
                  s[pos] = v;
                  while (pos > 0 && s[pos - 1] > s[pos]) { int t = s[pos]; s[pos] = s[pos - 1]; s[pos - 1] = t; pos--; }
                  while (pos + 1 < s.length && s[pos + 1] < s[pos]) { int t = s[pos]; s[pos] = s[pos + 1]; s[pos + 1] = t; pos++; }
                  a[i] = v;
              }

              private int query(int l, int r, int x) {
                  int bl = l / B, br = r / B, c = 0;
                  if (bl == br) {
                      for (int i = l; i <= r; i++) if (a[i] <= x) c++;
                      return c;
                  }
                  for (int i = l; i < (bl + 1) * B; i++) if (a[i] <= x) c++;   // left edge
                  for (int b = bl + 1; b < br; b++) c += countLE(sorted[b], x);  // full blocks
                  for (int i = br * B; i <= r; i++) if (a[i] <= x) c++;         // right edge
                  return c;
              }

              public static void main(String[] args) {
                  int[] a = {5, 1, 4, 8, 2, 7, 3, 6, 9};
                  int[][] ops = {{2, 1, 7, 5}, {1, 3, 0}, {2, 1, 7, 5}};
                  System.out.println(new Solution().process(a, ops));   // [4, 5]
              }
          }`,
        alt: [{ lang: 'python', code: `import bisect
import math


def process(arr, ops):
    a = list(arr)
    n = len(a)
    B = max(1, math.isqrt(n))
    blocks = [sorted(a[i:i + B]) for i in range(0, n, B)]
    out = []
    for op in ops:
        if op[0] == 1:
            _, i, v = op
            s = blocks[i // B]
            s.pop(bisect.bisect_left(s, a[i]))     # remove old value
            bisect.insort(s, v)                    # insert new value, O(B)
            a[i] = v
        else:
            _, l, r, x = op
            c, i = 0, l
            while i <= r:
                if i % B == 0 and i + B - 1 <= r:  # full block
                    c += bisect.bisect_right(blocks[i // B], x)
                    i += B
                else:
                    c += a[i] <= x
                    i += 1
            out.append(c)
    return out


print(process([5, 1, 4, 8, 2, 7, 3, 6, 9], [[2, 1, 7, 5], [1, 3, 0], [2, 1, 7, 5]]))  # [4, 5]`, run: true }],
        dry: {
          head: ['op', 'left edge', 'full blocks (binary search)', 'right edge', 'answer'],
          rows: [
            ['count ≤ 5 in [1,7]', 'a[1]=1 ✔, a[2]=4 ✔ → 2', 'b1 sorted [2,7,8] → 1', 'a[6]=3 ✔, a[7]=6 ✘ → 1', H.c('g', '4')],
            ['set a[3] = 0', '—', 'b1: [2,7,8] → replace 8 by 0 → bubble → [0,2,7]', '—', '—'],
            ['count ≤ 5 in [1,7]', '2', 'b1 [0,2,7] → 2', '1', H.c('g', '5')]
          ]
        },
        complexity: `<p>Build O(N log N). Query O(B + (N/B) log B), update O(B). With B = √N: ≈ O(√N log N) per query. Memory O(N).</p>`,
        followUps: ['Pick B to minimise B + (N/B)·log B — what is the best B for N = 5·10<sup>4</sup>?', 'Offline alternative: sort queries by x and points by value, use a BIT (only without updates).', 'How would a merge-sort tree answer the static version in O(log² N)?']
      }
    }]
  });

  // =====================================================================
  // TOPIC 6 — Mo's algorithm (offline range queries)
  // =====================================================================
  topics.push({
    title: 'Mo\'s Algorithm: Answer Offline Range Queries by Sliding a Window Smartly',
    analogy: `<p>A courier must visit 200 addresses today, given in random order. Driving them in the given order zig-zags across the city all day. A smart courier first <b>groups the stops by neighbourhood</b>, and inside each neighbourhood drives along the main road in increasing house number. Same stops, a fraction of the driving.</p>
      <p>Mo's algorithm is that courier. Every query [l, r] is a "stop". You hold a <b>stretchy window</b> over the array whose two ends you can move one step at a time, updating a running answer (like a frequency counter). Answering queries in the given order makes the window ends fly back and forth; <b>sorting the queries</b> by "block of l, then r" keeps the total movement around N·√N instead of N·Q.</p>`,
    explain: `<p><b>When it applies.</b> Three conditions:</p>
      <ol>
        <li><b>Offline:</b> you know all queries in advance and may answer them in any order (then put answers back in the original order).</li>
        <li><b>No updates</b> to the array (there is an extended "Mo's with updates" variant).</li>
        <li>You can <b>add</b> one element to the window and <b>remove</b> one element from it in O(1) (or O(log N)), keeping the answer up to date.</li>
      </ol>
      <p>Typical query: "how many <b>distinct</b> values in a[l..r]?" — hard to merge from two halves (a segment tree would need sets), but trivial to maintain while sliding: keep <code>cnt[value]</code> and a counter <code>distinct</code>; adding x with cnt[x] = 0 makes distinct + 1, removing the last copy makes it − 1.</p>
      <p><b>The algorithm.</b></p>
      <ol>
        <li>Choose block size <code>B ≈ √N</code> (more precisely N/√Q).</li>
        <li>Sort queries by <code>(l / B, r)</code> — first by the block of the left end, then by right end.</li>
        <li>Start with an empty window <code>curL = 0, curR = −1</code>. For each query in sorted order move <code>curR</code> and <code>curL</code> step by step to <code>r</code> and <code>l</code>, calling add/remove; record the answer under the query's original index.</li>
      </ol>
      ${H.arr([1, 2, 1, 3, 2, 2, 4, 1, 3, 1], { label: 'a (N = 10, B = 3)' })}
      ${H.table(['query', 'l', 'r', 'block = l / 3', 'sorted position'], [
        ['q0', '0', '4', '0', '2nd'], ['q1', '2', '7', '0', '3rd'], ['q2', '1', '3', '0', '1st'], ['q3', '5', '9', '1', '4th'], ['q4', '6', '8', '2', '5th']
      ])}
      <p>(Sorted order: q2 [1,3], q0 [0,4], q1 [2,7] in block 0 by increasing r; q3 [5,9] in block 1; q4 [6,8] in block 2.) Within one block, <code>r</code> only moves <b>right</b>, and <code>l</code> wobbles inside a block of width B.</p>
      <p><b>Why it is fast.</b></p>
      ${H.table(['pointer', 'movement bound', 'with N = Q = 10<sup>5</sup>, B = 316'], [
        ['right end r', 'sorted inside a block → ≤ N per block, N/B blocks → N²/B', '≈ 3.2·10<sup>7</sup>'],
        ['left end l', 'stays within one block (± B) per query → Q·B', '≈ 3.2·10<sup>7</sup>'],
        ['total', 'O((N + Q)·√N)', H.c('g', '≈ 6·10<sup>7</sup> O(1) steps')]
      ])}
      <p>Compare with answering each query by scanning: up to N·Q = 10<sup>10</sup>.</p>
      <p><b>Pointer order matters.</b> Grow before you shrink: first extend <code>curR</code> right and <code>curL</code> left, then shrink. Shrinking first can make the window "negative" (curL &gt; curR + 1) and drive counts below zero.</p>`,
    clues: [
      '"Answer Q queries: number of <b>distinct</b> elements / pairs of equal elements / most frequent count in a[l..r]" with <b>no updates</b> → Mo\'s algorithm.',
      'All queries are given <b>up front</b> ("offline", "read all queries first") and the per-range statistic is <b>not mergeable</b> from two halves.',
      '<code>N, Q ≤ 2·10<sup>5</sup></code>, time limit 2–5 s → O((N + Q)√N) ≈ 10<sup>8</sup> simple steps is the intended budget.',
      '"Sum over values of cnt[x]² · x in a range" (Powerful Array) / "count of x with cnt[x] = x" → add/remove change the answer in O(1).',
      '"Queries on <b>paths</b> of a static tree, count distinct colours" → Mo\'s on trees (Euler tour flattening).',
      'Queries arrive <b>online</b> (each depends on the previous answer, "decode with lastans") → Mo\'s is <b>impossible</b>; think persistent segment tree or sqrt structures.'
    ],
    code: [`
      // Mo's algorithm: offline "number of distinct values in a[l..r]".
      class MoDistinct {
          private int[] cnt;          // cnt[v] = copies of compressed value v inside the window
          private int distinct;       // number of values with cnt > 0

          private void add(int v)    { if (cnt[v]++ == 0) distinct++; }   // first copy enters
          private void remove(int v) { if (--cnt[v] == 0) distinct--; }   // last copy leaves

          int[] solve(int[] a, int[][] queries) {
              int n = a.length, q = queries.length;
              // 1) compress values to 0..k-1 so cnt[] is a plain array (no HashMap in the hot loop)
              int[] sorted = a.clone();
              Arrays.sort(sorted);
              int k = 0;
              for (int i = 0; i < n; i++) if (i == 0 || sorted[i] != sorted[i - 1]) sorted[k++] = sorted[i];
              int[] comp = new int[n];
              for (int i = 0; i < n; i++) comp[i] = Arrays.binarySearch(sorted, 0, k, a[i]);
              cnt = new int[k];
              distinct = 0;

              // 2) sort queries by (block of l, r); odd blocks sweep r backwards ("odd-even" trick)
              final int B = Math.max(1, (int) (n / Math.sqrt(Math.max(1, q))));
              Integer[] order = new Integer[q];
              for (int i = 0; i < q; i++) order[i] = i;
              Arrays.sort(order, (x, y) -> {
                  int bx = queries[x][0] / B, by = queries[y][0] / B;
                  if (bx != by) return Integer.compare(bx, by);
                  return (bx & 1) == 0 ? Integer.compare(queries[x][1], queries[y][1])
                                       : Integer.compare(queries[y][1], queries[x][1]);
              });

              // 3) slide the window from query to query; grow first, then shrink
              int[] ans = new int[q];
              int curL = 0, curR = -1;                       // empty window
              for (int id : order) {
                  int l = queries[id][0], r = queries[id][1];
                  while (curR < r) add(comp[++curR]);
                  while (curL > l) add(comp[--curL]);
                  while (curR > r) remove(comp[curR--]);
                  while (curL < l) remove(comp[curL++]);
                  ans[id] = distinct;                        // store under the ORIGINAL index
              }
              return ans;
          }

          public static void main(String[] args) {
              int[] a = {1, 2, 1, 3, 2, 2, 4, 1, 3, 1};
              int[][] qs = {{0, 4}, {2, 7}, {1, 3}, {5, 9}, {6, 8}};
              System.out.println(Arrays.toString(new MoDistinct().solve(a, qs)));   // [3, 4, 3, 4, 3]
          }
      }`, { lang: 'python', run: true, title: 'Python Mo\'s + move counting vs naive (runnable)', code: `import math
import random


def mo_distinct(a, queries):
    n, q = len(a), len(queries)
    B = max(1, int(n / math.sqrt(max(1, q))))
    order = sorted(range(q), key=lambda i: (queries[i][0] // B,
                                            queries[i][1] if (queries[i][0] // B) % 2 == 0 else -queries[i][1]))
    cnt, distinct, moves = {}, 0, 0
    ans = [0] * q
    cur_l, cur_r = 0, -1

    def add(x):
        nonlocal distinct
        cnt[x] = cnt.get(x, 0) + 1
        if cnt[x] == 1:
            distinct += 1

    def remove(x):
        nonlocal distinct
        cnt[x] -= 1
        if cnt[x] == 0:
            distinct -= 1

    for i in order:
        l, r = queries[i]
        while cur_r < r:
            cur_r += 1; add(a[cur_r]); moves += 1
        while cur_l > l:
            cur_l -= 1; add(a[cur_l]); moves += 1
        while cur_r > r:
            remove(a[cur_r]); cur_r -= 1; moves += 1
        while cur_l < l:
            remove(a[cur_l]); cur_l += 1; moves += 1
        ans[i] = distinct
    return ans, moves


print(mo_distinct([1, 2, 1, 3, 2, 2, 4, 1, 3, 1], [(0, 4), (2, 7), (1, 3), (5, 9), (6, 8)])[0])  # [3, 4, 3, 4, 3]

random.seed(2)
n, q = 3000, 3000
a = [random.randint(1, 50) for _ in range(n)]
qs = []
for _ in range(q):
    l = random.randrange(n)
    qs.append((l, random.randrange(l, n)))
ans, moves = mo_distinct(a, qs)
assert all(ans[i] == len(set(a[l:r + 1])) for i, (l, r) in enumerate(qs))
naive = sum(r - l + 1 for l, r in qs)
print("pointer moves with Mo:", moves, "| elements a naive scan touches:", naive)` }],
    codeTitle: ['Mo\'s algorithm in Java (distinct values)', 'Python + how many moves Mo saves'],
    viz: {
      title: 'Mo\'s algorithm: sort queries, then slide one window across all of them',
      input: '1 2 1 3 2 2 4 1 3 1 | 0 4 ; 2 7 ; 1 3 ; 5 9 ; 6 8',
      inputLabel: 'array (2–16 numbers, 0..20) | queries "l r" separated by ";" (0-based, up to 6)',
      gen: function (input) {
        var p = splitBar(input, 2, 'array | queries   e.g.  1 2 1 3 | 0 2 ; 1 3');
        var a = parseNums(p[0], 'the array', 2, 16, 0, 20), n = a.length;
        var qs = p[1].split(';').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (!qs.length || qs.length > 6) throw new Error('Give 1 to 6 queries separated by ";".');
        qs = qs.map(function (s) {
          var v = parseNums(s, 'query "' + s + '"', 2, 2, 0, n - 1);
          if (v[0] > v[1]) throw new Error('Query "' + s + '" needs l ≤ r.');
          return v;
        });
        var B = Math.max(1, Math.floor(Math.sqrt(n))), frames = [], i;
        var order = qs.map(function (_, k) { return k; }).sort(function (x, y) {
          var bx = Math.floor(qs[x][0] / B), by = Math.floor(qs[y][0] / B);
          return bx !== by ? bx - by : (qs[x][1] - qs[y][1]) || (x - y);
        });
        var ans = qs.map(function () { return '?'; });
        function qTable(hlRow, sorted) {
          var ids = sorted ? order : qs.map(function (_, k) { return k; });
          return { type: 'table', label: sorted ? 'queries in Mo order (block of l, then r)' : 'queries as given', columns: ['query', 'l', 'r', 'block = ⌊l/' + B + '⌋', 'answer'],
            rows: ids.map(function (k) { return ['q' + k, qs[k][0], qs[k][1], Math.floor(qs[k][0] / B), ans[k]]; }), hl: hlRow === undefined ? {} : one(hlRow, 'cur') };
        }
        frames.push({ narr: 'We have ' + qs.length + ' queries "how many <b>distinct</b> values in a[l..r]?". Answering them in this order would move the window ends back and forth. Block size B = ⌊√' + n + '⌋ = ' + B + '.',
          parts: [{ type: 'array', label: 'a', values: a }, qTable(undefined, false)] });
        frames.push({ narr: 'Sort the queries by <b>block of l</b> first, then by <b>r</b>. Inside one block, r will only move to the right, and l only wiggles inside a block of width ' + B + '. Answers will be written back under each query\'s original name.',
          parts: [{ type: 'array', label: 'a', values: a }, qTable(undefined, true)] });
        var cnt = {}, distinct = 0, curL = 0, curR = -1, moves = 0;
        function mapEntries() { var e = []; Object.keys(cnt).sort(function (x, y) { return x - y; }).forEach(function (k) { if (cnt[k] > 0) e.push([k, cnt[k]]); }); return e; }
        function frame(narr, hlIdx, cls, pos, extraHl) {
          var h = {}; if (hlIdx !== null) h[hlIdx] = cls;
          var ptr = {};
          if (curL <= curR) { ptr[curL] = 'L'; ptr[curR] = curL === curR ? ['L', 'R'] : 'R'; }
          frames.push({ narr: narr, parts: [
            { type: 'array', label: 'a — window [curL, curR] in blue', values: a, range: curL <= curR ? [curL, curR] : null, hl: h, ptr: ptr },
            { type: 'map', label: 'cnt[value] inside the window', entries: mapEntries(), hl: extraHl || {} },
            { type: 'vars', label: 'state', vals: { curL: curL, curR: curR, distinct: distinct, 'total pointer moves': moves } },
            qTable(pos, true)] });
        }
        order.forEach(function (id, pos) {
          var l = qs[id][0], r = qs[id][1], v;
          frame('Next: <b>q' + id + ' = [' + l + ', ' + r + ']</b>. Move the window ends from [' + curL + ', ' + curR + '] to [' + l + ', ' + r + '] one step at a time (grow first, then shrink).', null, '', pos);
          while (curR < r) { curR++; moves++; v = a[curR]; cnt[v] = (cnt[v] || 0) + 1; if (cnt[v] === 1) distinct++;
            frame('curR → ' + curR + ': <b>add</b> ' + v + '. cnt[' + v + '] = ' + cnt[v] + (cnt[v] === 1 ? ' → a brand-new value, distinct = ' + distinct : ' → already present, distinct stays ' + distinct) + '.', curR, 'ok', pos, one(String(v), 'ok')); }
          while (curL > l) { curL--; moves++; v = a[curL]; cnt[v] = (cnt[v] || 0) + 1; if (cnt[v] === 1) distinct++;
            frame('curL → ' + curL + ': <b>add</b> ' + v + ' on the left. cnt[' + v + '] = ' + cnt[v] + ', distinct = ' + distinct + '.', curL, 'ok', pos, one(String(v), 'ok')); }
          while (curR > r) { v = a[curR]; cnt[v]--; if (cnt[v] === 0) distinct--; moves++; var was = curR; curR--;
            frame('Shrink right: <b>remove</b> a[' + was + '] = ' + v + '. cnt[' + v + '] = ' + cnt[v] + (cnt[v] === 0 ? ' → last copy gone, distinct = ' + distinct : ', distinct stays ' + distinct) + '.', was, 'bad', pos, one(String(v), 'bad')); }
          while (curL < l) { v = a[curL]; cnt[v]--; if (cnt[v] === 0) distinct--; moves++; var wl = curL; curL++;
            frame('Shrink left: <b>remove</b> a[' + wl + '] = ' + v + '. cnt[' + v + '] = ' + cnt[v] + (cnt[v] === 0 ? ' → last copy gone, distinct = ' + distinct : ', distinct stays ' + distinct) + '.', wl, 'bad', pos, one(String(v), 'bad')); }
          ans[id] = distinct;
          frame('Window = [' + l + ', ' + r + '] → answer for q' + id + ' is <b>' + distinct + '</b> (the number of keys in the cnt map).', null, '', pos);
        });
        var naive = 0; qs.forEach(function (q) { naive += q[1] - q[0] + 1; });
        frames.push({ narr: 'All queries answered with <b>' + moves + '</b> pointer moves; scanning each range separately would touch ' + naive + ' elements. On tiny inputs the gap is small, but for N = Q = 10<sup>5</sup> it is ~6·10<sup>7</sup> vs up to 10<sup>10</sup>.',
          parts: [{ type: 'array', label: 'a', values: a }, qTable(undefined, false), { type: 'vars', label: 'cost', vals: { 'Mo pointer moves': moves, 'naive element reads': naive } }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'The sorted order and the window\'s journey',
        html: `<p>a = [1, 2, 1, 3, 2, 2, 4, 1, 3, 1], B = 3, queries q0 [0,4], q1 [2,7], q2 [1,3], q3 [5,9], q4 [6,8].</p>
          ${H.table(['order', 'query', 'window move', 'moves', 'distinct'], [
            ['1', 'q2 [1,3]', 'empty window at curL = 0: grow right adding 1, 2, 1, 3, then remove a[0] = 1', '5', '3'],
            ['2', 'q0 [0,4]', 'curR 3→4 (+2), curL 1→0 (+1)', '2', '3'],
            ['3', 'q1 [2,7]', 'curR 4→7 (+2,+4,+1), curL 0→2 (−1,−2)', '5', '4'],
            ['4', 'q3 [5,9]', 'curR 7→9 (+3,+1), curL 2→5 (−1,−3,−2)', '5', '4'],
            ['5', 'q4 [6,8]', 'curR 9→8 (−1), curL 5→6 (−2)', '2', '3']
          ])}
          <p>Final answers in original order: <b>[3, 4, 3, 4, 3]</b>. Notice r never had to jump back across the array within block 0.</p>`
      },
      {
        title: 'Count pairs of equal elements in a range',
        html: `<p>Query: number of pairs i &lt; j in [l, r] with a[i] = a[j]. Maintain <code>pairs</code>:</p>
          <ul><li>add x: the new copy pairs up with every existing copy → <code>pairs += cnt[x]; cnt[x]++</code></li>
          <li>remove x: <code>cnt[x]--; pairs -= cnt[x]</code></li></ul>
          <p>Window [2, 2, 5, 2]: adding the three 2s contributes 0 + 1 + 2 = 3 pairs; the 5 adds 0 → <b>3</b> = C(3, 2) ✔. Both updates are O(1), so Mo's applies directly.</p>`
      },
      {
        title: 'Choosing B: N/√Q is better than √N when Q ≠ N',
        html: `<p>Total cost ≈ Q·B (left pointer) + N·(N/B) (right pointer). Minimising gives <b>B = N/√Q</b> and cost <b>O(N√Q)</b>.</p>
          ${H.table(['N', 'Q', 'B = √N → cost', 'B = N/√Q → cost'], [
            ['10<sup>5</sup>', '10<sup>3</sup>', 'B = 316 → 3.2·10<sup>5</sup> + 3.2·10<sup>7</sup>', 'B = 3 162 → 3.2·10<sup>6</sup> + 3.2·10<sup>6</sup> = ' + H.c('g', '6.3·10<sup>6</sup>')],
            ['10<sup>5</sup>', '10<sup>5</sup>', '≈ 6.3·10<sup>7</sup>', 'same (B = 316)']
          ])}
          <p>With few queries, wider blocks are much better.</p>`
      },
      {
        title: 'Distinct values without Mo: offline BIT by right endpoint',
        html: `<p>Sort queries by r. Sweep i = 0..N−1; for value a[i] keep only its <b>last occurrence</b> marked with 1 in a Fenwick tree (unmark the previous occurrence). For every query with r = i, the answer is the number of marks in [l, r] = <code>prefix(r) − prefix(l − 1)</code>. Total O((N + Q) log N) — asymptotically better than Mo's. Mo's remains the general tool when no such clever invariant exists (pairs, cnt² sums, "count values with cnt = k").</p>`
      }
    ],
    deepDive: `<p><b>Proof of the bound.</b> Group queries by block of l. Inside a group r is sorted, so r moves ≤ N per group; there are ⌈N/B⌉ groups → O(N²/B). Between consecutive queries l moves ≤ 2B inside a group, and ≤ 2B + (block jump) across groups, which sums to O(N) over all groups → O(Q·B + N). Total O(Q·B + N²/B) → with B = N/√Q, O(N√Q). Each move is one add/remove, so the add/remove cost multiplies everything — keep them O(1) with plain arrays (compress values first).</p>
      <p><b>Constant-factor tricks.</b> (1) <b>Odd-even ordering</b>: in odd blocks sort r descending so r sweeps back instead of resetting to the left — often ~2× fewer moves. (2) <b>Hilbert curve order</b>: map (l, r) to its position on a Hilbert curve and sort by that; empirically faster for large Q. (3) Avoid HashMap and boxing in add/remove; a 2·10<sup>5</sup>-size int array is far faster.</p>
      <p><b>Variants.</b></p>
      <ul>
        <li><b>Mo's with updates</b>: add a time coordinate t (number of updates applied). Sort by (l/B, r/B, t) with B ≈ N<sup>2/3</sup>; moving t applies/undoes one update. Total O(N<sup>5/3</sup>) for N ≈ Q.</li>
        <li><b>Mo's on trees</b>: flatten with an Euler tour that records entry and exit times; a path u–v becomes a range in which nodes appearing twice cancel out (toggle on/off), plus a special case for the LCA.</li>
        <li><b>Rollback Mo's</b> (a.k.a. "Mo's without delete"): when removal is hard (e.g. maintaining a maximum), for each block reset the window to the block boundary, only ever <i>add</i> to the right, and for the left part add then roll back using a saved snapshot. Same O(N√Q).</li>
      </ul>
      <p><b>Limits.</b> Mo's needs every query in memory and answers out of order — it is impossible when queries are online (forced decoding with the previous answer). With N, Q around 10<sup>6</sup> it is usually too slow; offline sweeps with BITs or persistent segment trees take over.</p>`,
    aiEra: `<p><b>What AI changes:</b> Mo's algorithm has a fixed template, and assistants reproduce it well. Where they stumble is the <b>problem-specific add/remove</b> logic and the subtle ordering of pointer moves. Also, AI tools will sometimes suggest Mo's for online problems or problems with updates, where it simply does not apply.</p>
      <p><b>Typical AI mistakes:</b> shrinking before growing (counts go negative); forgetting to store answers under the original query index; using <code>HashMap&lt;Integer,Integer&gt;</code> in the hot loop (5–10× slower); block size computed as <code>sqrt(Q)</code> instead of N/√Q; missing the O(N log N) offline-BIT alternative for distinct counts.</p>
      <p><b>Use AI as a partner:</b> describe your statistic and ask "give me O(1) add and remove functions and prove they keep the invariant"; ask it to count pointer moves for different block sizes on random data (the Python snippet does exactly this). <b>What you must own:</b> checking the three preconditions (offline, static, cheap add/remove), the O(N√Q) argument, and knowing when a smarter offline sweep exists.</p>`,
    problems: [{
      title: 'Distinct Values Queries',
      level: 'Hard',
      tags: ['mo\'s algorithm', 'offline queries', 'coordinate compression'],
      companies: ['Google', 'Codeforces-style OA', 'Flipkart'],
      statement: `<p>Given an array <code>a</code> of N integers and Q queries <code>[l, r]</code> (0-based, inclusive), return for each query the number of <b>distinct</b> values in <code>a[l..r]</code>. All queries are known in advance.</p>`,
      constraints: `1 ≤ N, Q ≤ 2·10<sup>5</sup>, 1 ≤ a[i] ≤ 10<sup>9</sup>`,
      example: `${H.arr([3, 2, 3, 1, 2], { label: 'a' })}<p>Queries [0,2], [1,3], [2,4], [0,4] → ${H.c('g', '[2, 3, 3, 3]')}. [3,2,3] has {2,3}; [2,3,1] has {1,2,3}; [3,1,2] has {1,2,3}; the whole array has {1,2,3}.</p>`,
      brute: {
        why: `<p>For each query build a HashSet of a[l..r]: O(length) each → up to 2·10<sup>5</sup> × 2·10<sup>5</sup> = 4·10<sup>10</sup>. The waste: consecutive queries overlap heavily, yet every set is rebuilt from scratch.</p>`,
        code: `
          int[] bruteDistinct(int[] a, int[][] qs) {
              int[] ans = new int[qs.length];
              for (int i = 0; i < qs.length; i++) {
                  Set<Integer> seen = new HashSet<>();
                  for (int j = qs[i][0]; j <= qs[i][1]; j++) seen.add(a[j]);
                  ans[i] = seen.size();
              }
              return ans;
          }`
      },
      mcq: {
        q: 'Which property of "distinct count" makes Mo\'s algorithm work?',
        options: ['It is idempotent, like min', 'It can be updated in O(1) when one element enters or leaves the window (using cnt[])', 'It can be merged from two halves in O(1)', 'It has an inverse operation, like sum'],
        answer: 1,
        explain: 'Distinct count is NOT cheaply mergeable (two halves may share values) and not idempotent/invertible in the usual sense. But with a frequency array, adding/removing a single element changes it in O(1) — exactly what Mo needs.'
      },
      hints: [
        `<p><b>Aha:</b> if you already know the answer for [l, r], the answer for [l, r+1] needs only one look at a[r+1] — if its count was 0 it is new. So answers can be "walked" from one range to the next.</p>`,
        `<p>Mo's algorithm: compress values to 0..K−1, keep <code>cnt[]</code> and <code>distinct</code>; sort queries by (l / B, r) with B ≈ N/√Q; move the window, grow before shrink; store answers by original index.</p>`,
        `<p>Edge cases: equal queries, l = r, all values equal, huge values (compress!). Recipe: compress → order queries → curL = 0, curR = −1 → four while-loops → ans[id] = distinct. Bonus: the offline BIT solution sorts by r and marks last occurrences.</p>`
      ],
      solution: {
        approach: `<p>Mo's algorithm with value compression and the odd-even ordering. O((N + Q)·√N) ≈ 10<sup>8</sup> very cheap steps for the maximum input. (The asymptotically faster O((N + Q) log N) offline-BIT approach is a great follow-up.)</p>`,
        code: `
          class Solution {
              private int[] cnt;
              private int distinct;

              public int[] distinctQueries(int[] a, int[][] qs) {
                  int n = a.length, q = qs.length;
                  int[] vals = a.clone();
                  Arrays.sort(vals);
                  int k = 0;
                  for (int i = 0; i < n; i++) if (i == 0 || vals[i] != vals[i - 1]) vals[k++] = vals[i];
                  int[] c = new int[n];
                  for (int i = 0; i < n; i++) c[i] = Arrays.binarySearch(vals, 0, k, a[i]);
                  cnt = new int[k];
                  distinct = 0;

                  final int B = Math.max(1, (int) (n / Math.sqrt(Math.max(1, q))));
                  Integer[] order = new Integer[q];
                  for (int i = 0; i < q; i++) order[i] = i;
                  Arrays.sort(order, (x, y) -> {
                      int bx = qs[x][0] / B, by = qs[y][0] / B;
                      if (bx != by) return bx - by;
                      return (bx & 1) == 0 ? qs[x][1] - qs[y][1] : qs[y][1] - qs[x][1];
                  });

                  int[] ans = new int[q];
                  int curL = 0, curR = -1;
                  for (int id : order) {
                      int l = qs[id][0], r = qs[id][1];
                      while (curR < r) { if (cnt[c[++curR]]++ == 0) distinct++; }
                      while (curL > l) { if (cnt[c[--curL]]++ == 0) distinct++; }
                      while (curR > r) { if (--cnt[c[curR--]] == 0) distinct--; }
                      while (curL < l) { if (--cnt[c[curL++]] == 0) distinct--; }
                      ans[id] = distinct;
                  }
                  return ans;
              }

              public static void main(String[] args) {
                  int[] a = {3, 2, 3, 1, 2};
                  int[][] qs = {{0, 2}, {1, 3}, {2, 4}, {0, 4}};
                  System.out.println(Arrays.toString(new Solution().distinctQueries(a, qs)));   // [2, 3, 3, 3]
              }
          }`,
        alt: [{ lang: 'python', code: `def distinct_queries(a, qs):
    # Offline BIT by right endpoint: O((N + Q) log N)
    n = len(a)
    bit = [0] * (n + 1)

    def add(i, v):
        i += 1
        while i <= n:
            bit[i] += v
            i += i & -i

    def pre(i):                      # sum of marks at positions 0..i
        i += 1
        s = 0
        while i > 0:
            s += bit[i]
            i -= i & -i
        return s

    by_r = sorted(range(len(qs)), key=lambda i: qs[i][1])
    last, ans, j = {}, [0] * len(qs), 0
    for i, v in enumerate(a):
        if v in last:
            add(last[v], -1)         # only the latest copy of v stays marked
        last[v] = i
        add(i, 1)
        while j < len(by_r) and qs[by_r[j]][1] == i:
            l, r = qs[by_r[j]]
            ans[by_r[j]] = pre(r) - (pre(l - 1) if l > 0 else 0)
            j += 1
    return ans


print(distinct_queries([3, 2, 3, 1, 2], [(0, 2), (1, 3), (2, 4), (0, 4)]))  # [2, 3, 3, 3]`, run: true }],
        dry: {
          head: ['Mo order', 'query', 'window moves', 'cnt after', 'distinct'],
          rows: [
            ['1', '[0,2]', 'add 3, 2, 3', '{3:2, 2:1}', '2'],
            ['2', '[1,3]', 'add a[3]=1; remove a[0]=3 (cnt 2→1)', '{1:1, 2:1, 3:1}', '3'],
            ['3', '[0,4]', 'add a[4]=2; add a[0]=3', '{1:1, 2:2, 3:2}', '3'],
            ['4', '[2,4] (block 1)', 'remove a[0]=3, remove a[1]=2', '{1:1, 2:1, 3:1}', '3']
          ]
        },
        complexity: `<p>Mo's: O(Q log Q + (N + Q)·√N) time, O(N + Q) memory. Offline BIT: O((N + Q) log N).</p>`,
        followUps: ['Queries become online ("l = (l + lastAns) mod N") — what now? (persistent segment tree on "next occurrence")', 'Add point updates — Mo\'s with updates, B = N<sup>2/3</sup>.', 'Count values that appear exactly twice in [l, r].']
      }
    }]
  });

  // =====================================================================
  // TOPIC 7 — Choosing the right structure
  // =====================================================================
  topics.push({
    title: 'Choosing the Right Range-Query Structure (Decision Guide)',
    analogy: `<p>To move across town you can walk, cycle, drive, take a truck or book a train. Walking is perfect for 200 metres; a truck is silly for a sandwich and essential for a sofa; the train is fastest but only runs on a <b>fixed timetable</b> you must plan around.</p>
      <p>Range-query structures are the same garage of vehicles: <b>prefix sums</b> (walking — trivial, but nothing may change), <b>Fenwick</b> (bicycle — light and quick, limited cargo), <b>segment tree</b> (car — goes anywhere), <b>lazy segment tree</b> (truck — carries range updates), <b>sparse table</b> (motorbike on an empty road — fastest, but only if the road never changes), <b>sqrt blocks</b> (a reliable van for odd-shaped loads) and <b>Mo's</b> (the train — only if you can plan all trips in advance). Picking the right one quickly is what interviewers actually grade.</p>`,
    explain: `<p><b>Ask five questions, in this order.</b></p>
      <ol>
        <li><b>Can the answer for a range be built from the answers of two halves?</b> (sum, min, gcd, max-subarray struct → yes; number of distinct values, mode, "count values with frequency k" → no)</li>
        <li><b>Are there updates?</b> None / point updates / range updates.</li>
        <li><b>What is the operation like?</b> <i>Invertible</i> (sum, xor: you can "subtract" a prefix) or <i>idempotent</i> (min, max, gcd, and, or: overlap is harmless) or neither.</li>
        <li><b>Online or offline?</b> Must each query be answered before the next one is read (or does it depend on the previous answer)? If not, you may sort queries.</li>
        <li><b>What do the constraints allow?</b> N, Q → operation budget (≈ 10<sup>8</sup> simple steps per second in Java/C++), and memory (N log N ints for N = 10<sup>6</sup> is 80 MB).</li>
      </ol>
      ${H.table(['structure', 'build', 'query', 'update', 'memory', 'best for'], [
        ['prefix sums', 'O(N)', H.c('g', 'O(1)'), H.c('r', 'O(N)'), 'N', 'static sum / xor / count'],
        ['difference array', 'O(N)', 'O(N) once at the end', 'O(1) range add', 'N', 'many range adds, read the array once'],
        ['sparse table', 'O(N log N)', H.c('g', 'O(1)'), H.c('r', 'none'), 'N log N', 'static min / max / gcd, LCA'],
        ['Fenwick (BIT)', 'O(N)', 'O(log N)', 'O(log N)', 'N', 'dynamic sums, counts, inversions, k-th'],
        ['segment tree', 'O(N)', 'O(log N)', 'O(log N)', '2N–4N', 'any associative op, custom nodes, descent'],
        ['lazy segment tree', 'O(N)', 'O(log N)', 'O(log N) range', '8N', 'range add / assign + range query'],
        ['sqrt decomposition', 'O(N)', 'O(√N)', 'O(1)–O(√N)', 'N', 'awkward queries with updates, quick to write'],
        ['Mo\'s algorithm', '—', 'O((N+Q)√N) total', 'none (or N<sup>5/3</sup> variant)', 'N + Q', 'offline non-mergeable queries (distinct, pairs)']
      ])}
      <p><b>The quick decision path</b> (the visualizer below walks it for any combination):</p>
      ${H.table(['situation', 'pick'], [
        ['static + sum/xor', 'prefix sums'],
        ['static + min/max/gcd, many queries', 'sparse table'],
        ['point updates + sum/xor/count', 'Fenwick'],
        ['point updates + min/max/gcd or custom merge', 'segment tree'],
        ['range updates + range queries', 'lazy segment tree (or two Fenwicks for add + sum)'],
        ['range updates, only final array needed', 'difference array'],
        ['non-mergeable query, offline, static', 'Mo\'s algorithm (or a clever offline sweep + BIT)'],
        ['non-mergeable query, online / with updates', 'sqrt decomposition (or persistent structures)']
      ])}
      <p><b>Do not forget the non-tree shortcuts</b>: sliding-window max of a <i>fixed</i> size → monotonic deque O(N); "count of x in [l, r]" → per-value position lists + binary search; "next greater index" → monotonic stack; values up to 10<sup>9</sup> → coordinate compression before any array-indexed structure.</p>`,
    clues: [
      '"The array never changes" → start from prefix sums / sparse table; a segment tree here is over-engineering.',
      '"Update" + "sum" → Fenwick is the shortest; "update" + "min/max" → segment tree (BIT cannot undo a min).',
      '"Add to a range" + "query a range" → lazy segment tree; "add to a range" + "query one element" → Fenwick on differences.',
      '"<b>Distinct</b> / <b>frequency</b> / pairs in a range" → not mergeable → Mo\'s (offline) or sqrt (online), or position lists if it is about one value.',
      '"Answer queries in the order given, each depends on the last answer" → online only: Mo\'s and offline sweeps are ruled out.',
      'Constraints: Q ≤ 10<sup>3</sup> → brute force may already pass; Q ~ 10<sup>5</sup> → log or √; Q ~ 10<sup>6</sup>+ static → O(1) queries (prefix, sparse table).'
    ],
    code: [`
      // Coordinate compression: map arbitrary values (up to 1e9, negatives) to ranks 1..K
      // so they can index a Fenwick tree / segment tree / count array.
      class Compressor {
          private final int[] sortedUnique;

          Compressor(int[] values) {
              int[] s = values.clone();
              Arrays.sort(s);
              int k = 0;
              for (int i = 0; i < s.length; i++) if (i == 0 || s[i] != s[i - 1]) s[k++] = s[i];
              sortedUnique = Arrays.copyOf(s, k);
          }

          int size() { return sortedUnique.length; }

          /** 1-based rank of a value that is present (binary search, O(log K)). */
          int rank(int v) { return Arrays.binarySearch(sortedUnique, v) + 1; }

          /** number of distinct values <= v (works for values that are NOT present too). */
          int countLE(int v) {
              int lo = 0, hi = sortedUnique.length;
              while (lo < hi) { int mid = (lo + hi) >>> 1; if (sortedUnique[mid] <= v) lo = mid + 1; else hi = mid; }
              return lo;
          }

          public static void main(String[] args) {
              Compressor c = new Compressor(new int[]{1000000000, -5, 42, 42, 7});
              System.out.println(c.size());          // 4 distinct values: -5, 7, 42, 1e9
              System.out.println(c.rank(42));        // 3
              System.out.println(c.countLE(10));     // 2 (-5 and 7)
          }
      }`, `
      // Stress-testing harness: compare a fast structure against a brute force on random operations.
      // Writing this takes 5 minutes and catches almost every off-by-one before the interviewer does.
      class StressTest {
          // structure under test: iterative min segment tree
          static int n;
          static int[] t;
          static void build(int[] a) { n = a.length; t = new int[2 * n]; for (int i = 0; i < n; i++) t[n + i] = a[i]; for (int p = n - 1; p > 0; p--) t[p] = Math.min(t[2 * p], t[2 * p + 1]); }
          static void set(int i, int v) { for (t[i += n] = v; i > 1; i >>= 1) t[i >> 1] = Math.min(t[i], t[i ^ 1]); }
          static int query(int l, int r) {   // inclusive
              int res = Integer.MAX_VALUE;
              for (l += n, r += n + 1; l < r; l >>= 1, r >>= 1) {
                  if ((l & 1) == 1) res = Math.min(res, t[l++]);
                  if ((r & 1) == 1) res = Math.min(res, t[--r]);
              }
              return res;
          }

          public static void main(String[] args) {
              Random rnd = new Random(42);
              for (int round = 0; round < 200; round++) {
                  int size = 1 + rnd.nextInt(20);                  // include tiny sizes like 1 and 2
                  int[] a = new int[size];
                  for (int i = 0; i < size; i++) a[i] = rnd.nextInt(21) - 10;
                  build(a);
                  for (int op = 0; op < 200; op++) {
                      int l = rnd.nextInt(size), r = l + rnd.nextInt(size - l);
                      if (rnd.nextBoolean()) { int v = rnd.nextInt(21) - 10; a[l] = v; set(l, v); }
                      else {
                          int brute = Integer.MAX_VALUE;
                          for (int i = l; i <= r; i++) brute = Math.min(brute, a[i]);
                          if (brute != query(l, r)) throw new AssertionError("mismatch at round " + round);
                      }
                  }
              }
              System.out.println("40 000 random operations: segment tree agrees with brute force");
          }
      }`, { lang: 'python', run: true, title: 'The decision guide as code (runnable)', code: `def choose(updates, query, online):
    """updates: 'none' | 'point' | 'range'; query: 'sum','xor','min','max','gcd','distinct','mode'."""
    mergeable = query not in ("distinct", "mode")
    invertible = query in ("sum", "xor")
    idempotent = query in ("min", "max", "gcd")
    if not mergeable:
        if not online and updates == "none":
            return "Mo's algorithm (or an offline sweep + Fenwick)"
        if not online and updates == "point":
            return "Mo's algorithm with updates (B = N^(2/3))"
        return "sqrt decomposition / persistent segment tree"
    if updates == "none":
        return "sparse table, O(1) query" if idempotent else "prefix sums, O(1) query"
    if updates == "point":
        return "Fenwick tree" if invertible else "segment tree"
    return "lazy segment tree (two Fenwicks if add + sum)"


cases = [
    ("none", "sum", True), ("none", "min", True), ("point", "sum", True),
    ("point", "max", True), ("range", "sum", True), ("none", "distinct", False),
    ("point", "distinct", True),
]
for upd, q, online in cases:
    mode = "online" if online else "offline"
    print(f"{upd:>5} updates, {q:>8} query, {mode:>7} -> {choose(upd, q, online)}")` }],
    codeTitle: ['Coordinate compression helper', 'Stress-test harness (do this before you trust any tree)', 'Decision guide in Python'],
    viz: [{
      title: 'Decision walk: which structure fits your problem?',
      input: 'point | min | online',
      inputLabel: 'updates (none/point/range) | query (sum/xor/min/max/gcd/distinct/mode) | online or offline',
      gen: function (input) {
        var p = splitBar(input, 3, 'updates | query | online/offline   e.g.  none | gcd | online');
        var upd = p[0].toLowerCase(), qy = p[1].toLowerCase(), md = p[2].toLowerCase();
        if (['none', 'point', 'range'].indexOf(upd) < 0) throw new Error('updates must be none, point or range.');
        if (['sum', 'xor', 'min', 'max', 'gcd', 'distinct', 'mode'].indexOf(qy) < 0) throw new Error('query must be sum, xor, min, max, gcd, distinct or mode.');
        if (['online', 'offline'].indexOf(md) < 0) throw new Error('third part must be online or offline.');
        var nodes = [
          { id: 'A', label: 'Mergeable from 2 halves?', x: 50, y: 6, shape: 'box' },
          { id: 'B', label: 'Updates?', x: 26, y: 22, shape: 'box' },
          { id: 'C', label: 'Offline OK?', x: 80, y: 22, shape: 'box' },
          { id: 'D', label: 'Idempotent op?', x: 11, y: 40, shape: 'box' },
          { id: 'E', label: 'Invertible op?', x: 37, y: 40, shape: 'box' },
          { id: 'F', label: 'Lazy segment tree', x: 62, y: 40, shape: 'box' },
          { id: 'H', label: 'Sqrt blocks', x: 90, y: 40, shape: 'box' },
          { id: 'SP', label: 'Sparse table', x: 10, y: 60, shape: 'box' },
          { id: 'FW', label: 'Fenwick tree', x: 36, y: 60, shape: 'box' },
          { id: 'G', label: 'Mo\'s algorithm', x: 72, y: 60, shape: 'box' },
          { id: 'PS', label: 'Prefix sums', x: 22, y: 76, shape: 'box' },
          { id: 'ST', label: 'Segment tree', x: 48, y: 76, shape: 'box' }
        ];
        var edges = [['A', 'B', 'yes'], ['A', 'C', 'no'], ['B', 'D', 'none'], ['B', 'E', 'point'], ['B', 'F', 'range'], ['D', 'SP', 'yes'], ['D', 'PS', 'no'], ['E', 'FW', 'yes'], ['E', 'ST', 'no'], ['C', 'G', 'yes'], ['C', 'H', 'no']];
        var mergeable = qy !== 'distinct' && qy !== 'mode', invertible = qy === 'sum' || qy === 'xor', idem = qy === 'min' || qy === 'max' || qy === 'gcd';
        var steps = [];
        steps.push({ node: 'A', why: '<b>Can the answer for [l, r] be combined from two halves?</b> ' + (mergeable ? qy + ' of two halves is just ' + qy + '(left, right) → <b>yes</b>.' : '"' + qy + '" of two halves is NOT simple: both halves may contain the same values → <b>no</b>.') });
        var leaf, note;
        if (mergeable) {
          steps.push({ node: 'B', edge: 'A-B', why: '<b>What kind of updates?</b> You said: <b>' + upd + '</b>.' });
          if (upd === 'none') {
            steps.push({ node: 'D', edge: 'B-D', why: '<b>Static array.</b> Is ' + qy + ' idempotent (x ⊕ x = x, so overlapping windows are harmless)? ' + (idem ? '<b>Yes</b>.' : '<b>No</b> (' + qy + ' would double count an overlap) — but it is invertible, so prefix differences work.') });
            leaf = idem ? 'SP' : 'PS'; steps.push({ node: leaf, edge: 'D-' + leaf, leaf: true });
            note = idem ? 'Sparse table: O(N log N) build, <b>O(1)</b> per query, no updates.' : 'Prefix sums: O(N) build, <b>O(1)</b> per query as pre[r+1] − pre[l].';
          } else if (upd === 'point') {
            steps.push({ node: 'E', edge: 'B-E', why: '<b>Point updates.</b> Is ' + qy + ' invertible (can you "subtract" prefix(l−1) from prefix(r))? ' + (invertible ? '<b>Yes</b> → a Fenwick tree is enough.' : '<b>No</b>: you cannot un-take a ' + qy + ' → you need a real segment tree.') });
            leaf = invertible ? 'FW' : 'ST'; steps.push({ node: leaf, edge: 'E-' + leaf, leaf: true });
            note = invertible ? 'Fenwick tree: N + 1 memory, ~10 lines, O(log N) update and query.' : 'Segment tree: O(log N) update and query for any associative op (min, max, gcd, custom structs).';
          } else {
            leaf = 'F'; steps.push({ node: 'F', edge: 'B-F', leaf: true });
            note = 'Lazy segment tree: O(log N) range update and range query.' + (qy === 'sum' ? ' For add + sum, two Fenwick trees are a shorter alternative.' : '') + (qy === 'gcd' ? ' Careful: gcd with range add needs the difference-array trick (gcd(a[l], d[l+1..r])).' : '');
          }
        } else {
          steps.push({ node: 'C', edge: 'A-C', why: '<b>May we read all queries first and answer them in any order?</b> You said: <b>' + md + '</b>' + (upd !== 'none' ? ', with ' + upd + ' updates' : '') + '.' });
          if (md === 'offline' && upd !== 'range') {
            leaf = 'G'; steps.push({ node: 'G', edge: 'C-G', leaf: true });
            note = upd === 'none' ? 'Mo\'s algorithm: O((N + Q)√N) with O(1) add/remove. (For distinct counts, an offline sweep by r + Fenwick is O((N + Q) log N).)' : 'Mo\'s algorithm <b>with updates</b>: add a time axis, block size N<sup>2/3</sup>, O(N<sup>5/3</sup>).';
          } else {
            leaf = 'H'; steps.push({ node: 'H', edge: 'C-H', leaf: true });
            note = 'Online / heavy updates: sqrt decomposition with per-block frequency summaries, or a persistent segment tree for static online distinct counts.';
          }
        }
        var frames = [], hl = {}, ehl = {};
        frames.push({ narr: 'Your problem: <b>' + upd + '</b> updates, <b>' + qy + '</b> queries, <b>' + md + '</b>. We walk the decision tree from the top; each box is one question you should ask aloud in an interview.',
          parts: [{ type: 'graph', directed: true, height: 84, nodes: nodes, edges: edges, hl: {}, ehl: {} }] });
        steps.forEach(function (s) {
          hl = copy(hl); ehl = copy(ehl);
          for (var k in hl) hl[k] = 'done';
          for (var e in ehl) ehl[e] = 'ok';
          hl[s.node] = s.leaf ? 'sel' : 'cur';
          if (s.edge) ehl[s.edge] = 'cur';
          frames.push({ narr: s.leaf ? 'Recommendation: <b>' + nodes.filter(function (n) { return n.id === s.node; })[0].label + '</b>. ' + note : s.why,
            parts: [{ type: 'graph', directed: true, height: 84, nodes: nodes, edges: edges, hl: hl, ehl: ehl }] });
        });
        var rows = [['prefix sums', 'O(1)', 'O(N)', 'static sum/xor'], ['sparse table', 'O(1)', '—', 'static min/max/gcd'], ['Fenwick', 'O(log N)', 'O(log N)', 'sum/xor/count'], ['segment tree', 'O(log N)', 'O(log N)', 'any associative'], ['lazy segment tree', 'O(log N)', 'O(log N) range', 'range updates'], ['sqrt blocks', 'O(√N)', 'O(√N)', 'awkward queries'], ['Mo\'s algorithm', 'O((N+Q)√N) total', '— (or N^5/3)', 'offline, non-mergeable']];
        var pick = { PS: 0, SP: 1, FW: 2, ST: 3, F: 4, H: 5, G: 6 }[leaf];
        frames.push({ narr: 'The whole menu side by side. Your pick is highlighted. In an interview, say the alternatives you rejected and <i>why</i> — that is half the grade.',
          parts: [{ type: 'table', label: 'cheat sheet', columns: ['structure', 'query', 'update', 'use when'], rows: rows, hl: one(pick, 'sel') }] });
        return frames;
      }
    }, {
      title: 'Budget check: estimated operations for N and Q (10⁸ simple steps ≈ 1 second)',
      input: '200000 200000',
      inputLabel: 'N Q (each 1 .. 10 000 000)',
      gen: function (input) {
        var v = parseNums(input, '"N Q"', 2, 2, 1, 10000000), N = v[0], Q = v[1];
        var lg = Math.max(1, Math.log2(N)), sq = Math.sqrt(N);
        var list = [
          ['brute', N * Q, 'scan every range: N·Q'],
          ['prefix', N + Q, 'static sums only: N + Q'],
          ['sparse', N * lg + 2 * Q, 'static min/max: N log N + 2Q'],
          ['BIT', N + 2 * Q * lg, 'Fenwick: N + 2Q log N'],
          ['segtree', 2 * N + 4 * Q * lg, 'segment tree: 2N + 4Q log N'],
          ['lazy', 4 * N + 8 * Q * lg, 'lazy tree: ~2× a plain tree'],
          ['sqrt', N + 3 * Q * sq, 'sqrt blocks: N + 3Q√N'],
          ['Mo', Q * Math.log2(Math.max(2, Q)) + (N + Q) * sq, 'Mo: Q log Q + (N+Q)√N']
        ];
        function fmt(x) { if (x < 1000) return String(Math.round(x)); var e = Math.floor(Math.log10(x)); return (x / Math.pow(10, e)).toFixed(1) + 'e' + e; }
        function cls(x) { return x <= 1e8 ? 'ok' : x <= 1e9 ? 'cur' : 'bad'; }
        var frames = [], vals = [], texts = [], labels = [], hl = {};
        frames.push({ narr: 'N = ' + N + ', Q = ' + Q + '. Rule of thumb: ~10<sup>8</sup> simple steps per second (Java/C++). Bars show <b>log₁₀(estimated steps)</b>; green ≤ 10<sup>8</sup>, amber ≤ 10<sup>9</sup>, red = too slow.',
          parts: [{ type: 'vars', label: 'input', vals: { N: N, Q: Q, 'log2 N': Math.round(lg * 10) / 10, '√N': Math.round(sq) } }, { type: 'text', label: 'reminder', html: 'Constants are rough; the point is the <b>order of magnitude</b>, exactly like an interviewer\'s back-of-the-envelope check.' }] });
        list.forEach(function (it, k) {
          vals.push(Math.round(Math.log10(Math.max(1, it[1])) * 10) / 10); texts.push(fmt(it[1])); labels.push(it[0]); hl[k] = cls(it[1]);
          frames.push({ narr: '<b>' + it[2] + '</b> ≈ ' + fmt(it[1]) + ' steps → ' + (it[1] <= 1e8 ? H.c('g', 'fits comfortably') : it[1] <= 1e9 ? H.c('y', 'borderline: needs tight code / 2–5 s limit') : H.c('r', 'too slow')) + '.',
            parts: [{ type: 'bars', label: 'log₁₀(steps) — lower is better', values: vals.slice(), texts: texts.slice(), idxLabels: labels.slice(), hl: copy(hl) }] });
        });
        frames.push({ narr: 'Summary: with these limits, everything green is safe. Remember the structural limits too — prefix sums and sparse tables need a <b>static</b> array, Mo needs <b>offline</b> queries, and Fenwick needs an <b>invertible</b> operation.',
          parts: [{ type: 'bars', label: 'log₁₀(steps)', values: vals, texts: texts, idxLabels: labels, hl: hl }] });
        return frames;
      }
    }],
    examples: [
      {
        title: 'Four problem statements, four different answers',
        html: `${H.table(['statement', 'key words', 'pick', 'why not the others'], [
            ['"Given prices, answer 10<sup>6</sup> queries: cheapest price between day l and day r."', 'static, min, huge Q', H.c('g', 'sparse table'), 'segment tree is O(log N) per query; prefix sums cannot do min'],
            ['"Users update their score; report the sum of scores of users l..r."', 'point update, sum', H.c('g', 'Fenwick'), 'segment tree also works but is longer; prefix sums need O(N) per update'],
            ['"Stock prices change; report the highest price in [l, r]."', 'point update, max', H.c('g', 'segment tree'), 'Fenwick cannot undo a max; sparse table cannot update'],
            ['"Add bonus v to employees l..r many times, then print all salaries."', 'range add, read once', H.c('g', 'difference array'), 'lazy tree works but O(log N) per op is wasted when you read once']
          ])}`
      },
      {
        title: 'Range Frequency: no tree needed at all',
        html: `<p>"How many times does value x occur in a[l..r]?" (online, static). For each value store the sorted list of its positions. Answer = number of positions in [l, r] = <code>upperBound(r) − lowerBound(l)</code> — two binary searches.</p>
          ${H.arr([12, 33, 4, 56, 22, 2, 34, 33, 22, 12, 34, 56], { label: 'a', hl: { 1: 'y', 7: 'y' } })}
          ${H.kv([['33', '[1, 7]'], ['22', '[4, 8]'], ['12', '[0, 9]']], { label: 'positions' })}
          <p>count(33 in [0, 11]) = 2; count(22 in [5, 8]) = positions ≥ 5 and ≤ 8 → [8] → 1. O(log N) per query, O(N) memory. This is the guided problem below.</p>`
      },
      {
        title: 'Same constraints, very different budgets',
        html: `<p>N = Q = 2·10<sup>5</sup> (a very common limit):</p>
          ${H.table(['approach', 'estimated steps', 'verdict'], [
            ['scan each query', '4·10<sup>10</sup>', H.c('r', 'TLE')],
            ['Fenwick', '≈ 7·10<sup>6</sup>', H.c('g', 'instant')],
            ['segment tree', '≈ 1.4·10<sup>7</sup>', H.c('g', 'fast')],
            ['sqrt blocks', '≈ 2.7·10<sup>8</sup>', H.c('y', 'OK with tight code')],
            ['Mo\'s', '≈ 1.8·10<sup>8</sup>', H.c('y', 'OK if add/remove are O(1) array ops')]
          ])}
          <p>Use the second visualizer above to recompute these for your own constraints.</p>`
      },
      {
        title: 'Memory budget at N = 10<sup>6</sup>',
        html: `${H.table(['structure', 'cells', 'bytes (int / long)'], [
            ['Fenwick', '10<sup>6</sup>', '4 MB / 8 MB'],
            ['iterative segment tree', '2·10<sup>6</sup>', '8 MB / 16 MB'],
            ['recursive segment tree', '4·10<sup>6</sup>', '16 MB / 32 MB'],
            ['lazy segment tree', '8·10<sup>6</sup>', '32 MB / 64 MB'],
            ['sparse table', '2·10<sup>7</sup>', H.c('r', '80 MB / 160 MB')]
          ])}
          <p>With a 256 MB limit the sparse table of longs is risky; a segment tree (or an O(N)-memory RMQ with blocks) is the safer choice even for static data.</p>`
      }
    ],
    deepDive: `<p><b>Lower bounds you can quote.</b> For dynamic prefix sums (point update + prefix query) there is a proven Ω(log N / log log N) per-operation lower bound in the cell-probe model (Fredman–Saks), and Ω(log N) for the trade-off product (Pătraşcu–Demaine). So "O(1) update and O(1) query" for dynamic sums is impossible — Fenwick and segment trees are essentially optimal. For static RMQ, O(N) preprocessing with O(1) queries is achievable, so the sparse table's N log N is <i>not</i> optimal, only simple.</p>
      <p><b>Offline tricks that replace heavy structures.</b> (1) <b>Sort queries by r</b> and sweep with a Fenwick tree (distinct values, "count of x ≤ value" by sorting values too). (2) <b>Sort events by value</b> and insert positions in increasing order of value, answering "count ≤ x in [l, r]" with a BIT over positions — O((N + Q) log N), no sqrt needed when offline. (3) <b>Divide and conquer over time</b> (CDQ) turns a dynamic problem into static sub-problems. (4) <b>Parallel binary search</b> for "first time a condition holds" over many queries.</p>
      <p><b>Heavier artillery (know they exist).</b> Persistent segment trees (online k-th smallest in a range, online distinct counts), wavelet trees (k-th smallest / count ≤ x in O(log σ)), merge-sort trees (static "count ≤ x" in O(log² N)), segment trees of BITs or ordered sets (2D dynamic counting), Li Chao trees (min of lines at a point), and Segment Tree Beats (chmin/chmax). In interviews it is enough to name the right one and explain why the simpler ones fail.</p>
      <p><b>Engineering view.</b> In real systems, the same choices show up as: precomputed prefix aggregates (immutable, rebuilt in batch), mutable counters with tree-structured aggregation, block-level summaries that let a scan skip blocks (columnar "zone maps"), and offline batch jobs that sort work to maximise locality — Mo's courier idea at data-centre scale. The interview question "which structure?" is really "what are your update pattern, query pattern and latency budget?".</p>
      <p><b>A good spoken answer</b> has four parts: (1) restate the operations and constraints, (2) reject the brute force with a number, (3) name the structure and its complexity, (4) mention one alternative and the trade-off ("a sparse table would be O(1) per query but cannot handle the updates").</p>`,
    aiEra: `<p><b>What AI changes:</b> writing any one of these structures is now cheap; <b>choosing</b> is the scarce skill. Assistants often default to the most powerful tool they know (lazy segment tree, persistent tree) even when prefix sums or a Fenwick would do, or they miss a decisive word like "static", "offline" or "online".</p>
      <p><b>A good human–AI workflow:</b> (1) you extract the five decision facts (mergeable? updates? invertible/idempotent? online? limits?) from the statement; (2) you choose the structure and state the complexity; (3) let the assistant write the boilerplate; (4) you demand a brute-force stress test (like the Java harness above) and review the tricky lines yourself — identities, index bases, overflow.</p>
      <p><b>Prompts that work:</b> <code>"List three data structures that solve this, with complexity and one reason each might fail on these constraints"</code>; <code>"Estimate the number of operations for N = Q = 2e5 for each"</code>. <b>What you must own:</b> the decision itself, the back-of-the-envelope budget, and the honest trade-off discussion — that is exactly what interviewers still score in 2026.</p>`,
    problems: [{
      title: 'Range Frequency Queries',
      level: 'Medium',
      tags: ['binary search', 'hash map', 'choosing a structure'],
      companies: ['Google', 'Amazon', 'Microsoft'],
      statement: `<p>Design <code>RangeFreqQuery</code>: the constructor receives an integer array <code>arr</code>; <code>query(left, right, value)</code> returns how many times <code>value</code> occurs in the subarray <code>arr[left..right]</code> (inclusive). Queries are answered online, one by one.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>5</sup>, 1 ≤ arr[i], value ≤ 10<sup>4</sup>, at most 10<sup>5</sup> calls to query.`,
      example: `${H.arr([12, 33, 4, 56, 22, 2, 34, 33, 22, 12, 34, 56], { label: 'arr', hl: { 1: 'g', 7: 'g' } })}
        <p>query(1, 2, 4) → ${H.c('g', '1')} (arr[1..2] = [33, 4]). query(0, 11, 33) → ${H.c('g', '2')} (positions 1 and 7).</p>`,
      brute: {
        why: `<p>Scan arr[left..right] and count: O(N) per query, 10<sup>5</sup> × 10<sup>5</sup> = 10<sup>10</sup>. A segment tree of hash maps would answer in O(log N) but needs O(N log N) map entries — heavy and slow. The waste in brute force: we look at every element, although only the positions of <i>one</i> value matter.</p>`,
        code: `
          class RangeFreqQueryBrute {
              private final int[] a;
              RangeFreqQueryBrute(int[] arr) { a = arr.clone(); }
              int query(int left, int right, int value) {
                  int c = 0;
                  for (int i = left; i <= right; i++) if (a[i] == value) c++;
                  return c;
              }
          }`
      },
      mcq: {
        q: 'The array is static and each query asks about ONE value. What is the lightest correct structure?',
        options: ['Lazy segment tree', 'For every value, the sorted list of its positions + binary search', 'Mo\'s algorithm', 'Sparse table of frequency maps'],
        answer: 1,
        explain: 'Only the positions of the queried value matter. Lists of positions total N entries, are sorted for free by building left to right, and two binary searches count those inside [left, right]. Mo\'s is offline-only; the others are heavy.'
      },
      hints: [
        `<p><b>Aha:</b> count of value x in [l, r] = number of <i>positions of x</i> that lie in [l, r]. You don't need the other values at all.</p>`,
        `<p>Build <code>Map&lt;Integer, List&lt;Integer&gt;&gt;</code> (or an array of lists since values ≤ 10<sup>4</sup>) by scanning left to right — each list is automatically sorted. Then answer with lowerBound(l) and upperBound(r).</p>`,
        `<p>Edge cases: value never appears (empty list → 0), l = r, value at exactly l or r (inclusive bounds). Recipe: pos = lists[value] → return upperBound(pos, right) − lowerBound(pos, left).</p>`
      ],
      solution: {
        approach: `<p>Per-value sorted position lists + two binary searches. Construction O(N), query O(log N), memory O(N). A good example of "choose the lightest structure": no tree is needed because the query focuses on a single value.</p>`,
        code: `
          class RangeFreqQuery {
              private final Map<Integer, List<Integer>> positions = new HashMap<>();

              public RangeFreqQuery(int[] arr) {
                  for (int i = 0; i < arr.length; i++)
                      positions.computeIfAbsent(arr[i], k -> new ArrayList<>()).add(i);  // added in increasing i → sorted
              }

              /** first index in list with list[idx] >= x */
              private static int lowerBound(List<Integer> list, int x) {
                  int lo = 0, hi = list.size();
                  while (lo < hi) { int mid = (lo + hi) >>> 1; if (list.get(mid) < x) lo = mid + 1; else hi = mid; }
                  return lo;
              }

              public int query(int left, int right, int value) {
                  List<Integer> pos = positions.get(value);
                  if (pos == null) return 0;
                  return lowerBound(pos, right + 1) - lowerBound(pos, left);   // count of positions in [left, right]
              }

              public static void main(String[] args) {
                  RangeFreqQuery r = new RangeFreqQuery(new int[]{12, 33, 4, 56, 22, 2, 34, 33, 22, 12, 34, 56});
                  System.out.println(r.query(1, 2, 4));    // 1
                  System.out.println(r.query(0, 11, 33));  // 2
                  System.out.println(r.query(5, 8, 22));   // 1
              }
          }`,
        alt: [{ lang: 'python', code: `from bisect import bisect_left, bisect_right
from collections import defaultdict


class RangeFreqQuery:
    def __init__(self, arr):
        self.pos = defaultdict(list)
        for i, v in enumerate(arr):
            self.pos[v].append(i)          # sorted automatically

    def query(self, left, right, value):
        p = self.pos.get(value, [])
        return bisect_right(p, right) - bisect_left(p, left)


r = RangeFreqQuery([12, 33, 4, 56, 22, 2, 34, 33, 22, 12, 34, 56])
print(r.query(1, 2, 4), r.query(0, 11, 33), r.query(5, 8, 22))  # 1 2 1`, run: true }],
        dry: {
          head: ['call', 'positions list', 'lowerBound(left)', 'lowerBound(right + 1)', 'answer'],
          rows: [
            ['query(1, 2, 4)', '[2]', '0', '1', H.c('g', '1')],
            ['query(0, 11, 33)', '[1, 7]', '0', '2', H.c('g', '2')],
            ['query(5, 8, 22)', '[4, 8]', '1', '2', H.c('g', '1')],
            ['query(0, 3, 99)', 'none', '—', '—', '0']
          ]
        },
        complexity: `<p>Build O(N); each query O(log N); memory O(N).</p>`,
        followUps: ['Add point updates arr[i] = v — what breaks, and what would you use (ordered sets per value / sqrt blocks)?', 'Instead of one value, count values in a <i>range</i> [x, y] inside [l, r] — wavelet tree or offline BIT.', 'Queries are given offline — is Mo\'s better here? (No: binary search is already O(log N).)']
      }
    }]
  });

  // =====================================================================
  // PRACTICE — Easy
  // =====================================================================
  practice.push({
    title: 'Range Sum Query — Immutable',
    level: 'Easy',
    tags: ['prefix sums', 'static array', 'design'],
    companies: ['Amazon', 'Meta', 'Bloomberg'],
    statement: `<p>Design <code>NumArray</code>: the constructor receives an integer array <code>nums</code> that <b>never changes</b>; <code>sumRange(left, right)</code> returns the sum of <code>nums[left..right]</code> (inclusive). Many calls are made.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>4</sup>, −10<sup>5</sup> ≤ nums[i] ≤ 10<sup>5</sup>, at most 10<sup>4</sup> calls to sumRange.`,
    example: `${H.arr([-2, 0, 3, -5, 2, -1], { label: 'nums', hl: { 2: 'g', 3: 'g', 4: 'g', 5: 'g' } })}
      <p>sumRange(0, 2) → ${H.c('g', '1')}, sumRange(2, 5) → ${H.c('g', '−1')} (3 − 5 + 2 − 1), sumRange(0, 5) → ${H.c('g', '−3')}. With prefix sums pre = [0, −2, −2, 1, −4, −2, −3], sumRange(2, 5) = pre[6] − pre[2] = −3 − (−2) = −1.</p>`,
    brute: {
      why: `<p>Loop from left to right on every call: O(N) per call, 10<sup>8</sup> in the worst case. It works here but wastes time re-adding the same elements. Because the array is static, a segment tree or Fenwick would also be overkill — prefix sums give O(1).</p>`,
      code: `
        class NumArrayBrute {
            private final int[] a;
            NumArrayBrute(int[] nums) { a = nums.clone(); }
            int sumRange(int left, int right) {
                int s = 0;
                for (int i = left; i <= right; i++) s += a[i];
                return s;
            }
        }`
    },
    mcq: {
      q: 'The array never changes. Which structure is the simplest with O(1) queries?',
      options: ['Segment tree', 'Fenwick tree', 'Prefix sum array', 'Sparse table'],
      answer: 2,
      explain: 'Sum is invertible, so sum(l..r) = pre[r+1] − pre[l] in O(1) after an O(N) build. A sparse table would need O(log N) for sums (not idempotent); trees are for updates.'
    },
    hints: [
      `<p><b>Aha:</b> sum(l..r) = (sum of the first r+1 elements) − (sum of the first l elements). Precompute all "first k elements" sums once.</p>`,
      `<p>Build <code>pre</code> of length N+1 with <code>pre[0] = 0</code> and <code>pre[i+1] = pre[i] + nums[i]</code>. The extra leading zero removes the special case l = 0.</p>`,
      `<p>Edge cases: left = 0, left = right, negative numbers. Recipe: build pre in the constructor → return pre[right + 1] − pre[left].</p>`
    ],
    solution: {
      approach: `<p>Prefix sums with a leading zero; each query is one subtraction.</p>`,
      code: `
        class NumArray {
            private final long[] pre;

            public NumArray(int[] nums) {
                pre = new long[nums.length + 1];
                for (int i = 0; i < nums.length; i++) pre[i + 1] = pre[i] + nums[i];
            }

            public int sumRange(int left, int right) {
                return (int) (pre[right + 1] - pre[left]);
            }

            public static void main(String[] args) {
                NumArray na = new NumArray(new int[]{-2, 0, 3, -5, 2, -1});
                System.out.println(na.sumRange(0, 2));  // 1
                System.out.println(na.sumRange(2, 5));  // -1
                System.out.println(na.sumRange(0, 5));  // -3
            }
        }`,
      alt: [{ lang: 'python', code: `from itertools import accumulate


class NumArray:
    def __init__(self, nums):
        self.pre = [0] + list(accumulate(nums))

    def sumRange(self, left, right):
        return self.pre[right + 1] - self.pre[left]


na = NumArray([-2, 0, 3, -5, 2, -1])
print(na.sumRange(0, 2), na.sumRange(2, 5), na.sumRange(0, 5))  # 1 -1 -3`, run: true }],
      dry: { head: ['call', 'pre[right+1]', 'pre[left]', 'answer'], rows: [['(0, 2)', '1', '0', '1'], ['(2, 5)', '−3', '−2', '−1'], ['(0, 5)', '−3', '0', '−3']] },
      complexity: `<p>Build O(N), query O(1), memory O(N).</p>`,
      followUps: ['Now nums can change — what do you switch to?', '2D version: sum of a sub-rectangle with 2D prefix sums.']
    }
  });

  practice.push({
    title: 'Range Addition (Apply Many Range Adds, Read Once)',
    level: 'Easy',
    tags: ['difference array', 'offline updates'],
    companies: ['Google', 'Amazon'],
    statement: `<p>You start with an array of <code>length</code> zeros and a list of <code>updates</code>, each <code>[start, end, inc]</code> meaning "add <code>inc</code> to every element in <code>[start, end]</code>". Return the final array after all updates.</p>`,
    constraints: `1 ≤ length ≤ 10<sup>5</sup>, 0 ≤ number of updates ≤ 10<sup>4</sup>, 0 ≤ start ≤ end &lt; length, −1000 ≤ inc ≤ 1000.`,
    example: `<p>length = 5, updates = [[1,3,2], [2,4,3], [0,2,−2]]</p>
      ${H.arr([-2, 0, 3, 5, 3], { label: 'result', hl: { 3: 'g' } })}
      <p>After [1,3,+2]: [0,2,2,2,0]; after [2,4,+3]: [0,2,5,5,3]; after [0,2,−2]: ${H.c('g', '[−2,0,3,5,3]')}.</p>`,
    brute: {
      why: `<p>Apply each update element by element: up to 10<sup>4</sup> × 10<sup>5</sup> = 10<sup>9</sup> additions. The waste: we only need the final array, so there is no reason to keep it correct after every single update.</p>`,
      code: `
        int[] bruteRangeAddition(int length, int[][] updates) {
            int[] a = new int[length];
            for (int[] u : updates)
                for (int i = u[0]; i <= u[1]; i++) a[i] += u[2];
            return a;
        }`
    },
    mcq: {
      q: 'In a difference array d, how do you record "add v to [l, r]"?',
      options: ['d[l] += v and d[r] −= v', 'd[l] += v and d[r + 1] −= v', 'd[l..r] += v', 'd[r + 1] += v only'],
      answer: 1,
      explain: 'The final array is the prefix sum of d. +v at l starts the bonus, −v at r+1 stops it right after r. (Skip the second write if r + 1 = length.)'
    },
    hints: [
      `<p><b>Aha:</b> a range add changes the array's <i>differences</i> (a[i] − a[i−1]) at only two places: the start and just after the end.</p>`,
      `<p>Difference array <code>d</code> of size length + 1: for each update <code>d[start] += inc; d[end + 1] −= inc</code>. At the end, a running sum over d rebuilds the array.</p>`,
      `<p>Edge cases: end = length − 1 (d has the extra slot, so it is safe), no updates (all zeros). Recipe: O(1) per update, one O(N) prefix pass. If you had to <i>read</i> between updates you would need a Fenwick on d instead.</p>`
    ],
    solution: {
      approach: `<p>Difference array: two writes per update, one prefix pass at the end. This is the "offline" cousin of lazy propagation.</p>`,
      code: `
        class Solution {
            public int[] getModifiedArray(int length, int[][] updates) {
                int[] d = new int[length + 1];
                for (int[] u : updates) {
                    d[u[0]] += u[2];          // bonus starts at start
                    d[u[1] + 1] -= u[2];      // and stops right after end
                }
                int[] res = new int[length];
                int run = 0;
                for (int i = 0; i < length; i++) {
                    run += d[i];
                    res[i] = run;
                }
                return res;
            }

            public static void main(String[] args) {
                int[][] ups = {{1, 3, 2}, {2, 4, 3}, {0, 2, -2}};
                System.out.println(Arrays.toString(new Solution().getModifiedArray(5, ups)));  // [-2, 0, 3, 5, 3]
            }
        }`,
      dry: { head: ['step', 'd (indices 0..5)', 'note'], rows: [['[1,3,+2]', '0 2 0 0 −2 0', 'start +2 at 1, stop at 4'], ['[2,4,+3]', '0 2 3 0 −2 −3', 'stop at 5 (extra slot)'], ['[0,2,−2]', '−2 2 3 2 −2 −3', ''], ['prefix', '−2 0 3 5 3', H.c('g', 'answer')]] },
      complexity: `<p>O(N + U) time, O(N) extra memory.</p>`,
      followUps: ['Interleave "what is a[i] now?" queries — Fenwick on the difference array.', 'Ranges in 2D (add to a sub-rectangle) — 2D difference array with four corners.']
    }
  });

  practice.push({
    title: 'Static Range Minimum Queries',
    level: 'Easy',
    tags: ['sparse table', 'RMQ'],
    companies: ['CSES classic', 'Google'],
    statement: `<p>Given a static array <code>a</code> of N integers and Q queries <code>[l, r]</code> (0-based, inclusive), return the minimum of each range.</p>`,
    constraints: `1 ≤ N, Q ≤ 2·10<sup>5</sup>, 1 ≤ a[i] ≤ 10<sup>9</sup>`,
    example: `${H.arr([3, 2, 4, 5, 1, 1, 5, 3], { label: 'a' })}
      <p>Queries [1,3], [4,5], [0,7], [2,2] → ${H.c('g', '[2, 1, 1, 4]')}. For [1,3]: len 3, k = 1, windows [1,2] (min 2) and [2,3] (min 4) → 2.</p>`,
    brute: {
      why: `<p>Scan each range: O(N) per query → 4·10<sup>10</sup>. The waste: the same windows are scanned again and again although the array never changes, so their minima could be precomputed once.</p>`,
      code: `
        int[] bruteRmq(int[] a, int[][] qs) {
            int[] res = new int[qs.length];
            for (int i = 0; i < qs.length; i++) {
                int m = Integer.MAX_VALUE;
                for (int j = qs[i][0]; j <= qs[i][1]; j++) m = Math.min(m, a[j]);
                res[i] = m;
            }
            return res;
        }`
    },
    mcq: {
      q: 'For the query [3, 9] (length 7), which two sparse-table cells answer it?',
      options: ['st[2][3] and st[2][6]', 'st[3][3] and st[3][2]', 'st[2][3] and st[2][7]', 'st[1][3], st[1][5], st[1][7], st[0][9]'],
      answer: 0,
      explain: 'k = ⌊log₂ 7⌋ = 2 (length 4). One window starts at l = 3 → [3..6]; the other ends at r = 9 → starts at 9 − 4 + 1 = 6 → [6..9]. They overlap on 6, which is fine for min.'
    },
    hints: [
      `<p><b>Aha:</b> min is idempotent, so two overlapping power-of-two windows that cover [l, r] give the exact answer.</p>`,
      `<p>Build <code>st[k][i]</code> = min of a[i .. i + 2<sup>k</sup> − 1] from row k−1, plus <code>lg[]</code> for ⌊log₂⌋. Query: k = lg[len]; min(st[k][l], st[k][r − 2<sup>k</sup> + 1]).</p>`,
      `<p>Edge cases: l = r (k = 0, both cells are the same), N = 1, exact powers of two. Use fast input for 2·10<sup>5</sup> queries. Memory: 18 rows × 2·10<sup>5</sup> ints ≈ 14 MB.</p>`
    ],
    solution: {
      approach: `<p>Sparse table, O(N log N) build, O(1) per query.</p>`,
      code: `
        class Solution {
            public int[] rangeMin(int[] a, int[][] qs) {
                int n = a.length;
                int[] lg = new int[n + 1];
                for (int x = 2; x <= n; x++) lg[x] = lg[x / 2] + 1;
                int[][] st = new int[lg[n] + 1][];
                st[0] = a.clone();
                for (int k = 1; k <= lg[n]; k++) {
                    st[k] = new int[n - (1 << k) + 1];
                    for (int i = 0; i + (1 << k) <= n; i++)
                        st[k][i] = Math.min(st[k - 1][i], st[k - 1][i + (1 << (k - 1))]);
                }
                int[] res = new int[qs.length];
                for (int i = 0; i < qs.length; i++) {
                    int l = qs[i][0], r = qs[i][1], k = lg[r - l + 1];
                    res[i] = Math.min(st[k][l], st[k][r - (1 << k) + 1]);
                }
                return res;
            }

            public static void main(String[] args) {
                int[] a = {3, 2, 4, 5, 1, 1, 5, 3};
                int[][] qs = {{1, 3}, {4, 5}, {0, 7}, {2, 2}};
                System.out.println(Arrays.toString(new Solution().rangeMin(a, qs)));  // [2, 1, 1, 4]
            }
        }`,
      dry: { head: ['query', 'len', 'k', 'cells', 'answer'], rows: [['[1,3]', '3', '1', 'st[1][1]=2, st[1][2]=4', '2'], ['[4,5]', '2', '1', 'st[1][4]=1 (twice)', '1'], ['[0,7]', '8', '3', 'st[3][0]=1', '1'], ['[2,2]', '1', '0', 'st[0][2]=4', '4']] },
      complexity: `<p>Build O(N log N), each query O(1); memory O(N log N).</p>`,
      followUps: ['Add point updates — what replaces the sparse table?', 'Return the index of the minimum (store indices, compare values).']
    }
  });

  practice.push({
    title: 'Dynamic Range Sum Queries',
    level: 'Easy',
    tags: ['fenwick tree', 'point update'],
    companies: ['CSES classic', 'Microsoft'],
    statement: `<p>Given an array <code>a</code> and a list of operations: <code>[1, k, u]</code> sets <code>a[k] = u</code>; <code>[2, l, r]</code> asks for the sum of <code>a[l..r]</code>. Return the answers of type-2 operations (0-based indices).</p>`,
    constraints: `1 ≤ N, Q ≤ 2·10<sup>5</sup>, 1 ≤ a[i], u ≤ 10<sup>9</sup> → sums up to 2·10<sup>14</sup> (use long).`,
    example: `${H.arr([3, 2, 4, 5, 1, 1, 5, 3], { label: 'a' })}
      <p>Ops [2,0,3], [2,4,5], [1,2,1], [2,0,3] → ${H.c('g', '[14, 2, 11]')}. After setting a[2] = 1 the first four sum to 3 + 2 + 1 + 5 = 11.</p>`,
    brute: {
      why: `<p>Loop over [l, r] for each sum: O(N) → 4·10<sup>10</sup> worst case. Prefix sums would make sums O(1) but every set would cost O(N). The waste: one changed element forces rescanning or rebuilding everything.</p>`,
      code: `
        long[] bruteDynamic(int[] a0, int[][] ops) {
            long[] a = new long[a0.length];
            for (int i = 0; i < a0.length; i++) a[i] = a0[i];
            List<Long> out = new ArrayList<>();
            for (int[] op : ops) {
                if (op[0] == 1) a[op[1]] = op[2];
                else { long s = 0; for (int i = op[1]; i <= op[2]; i++) s += a[i]; out.add(s); }
            }
            long[] res = new long[out.size()];
            for (int i = 0; i < res.length; i++) res[i] = out.get(i);
            return res;
        }`
    },
    mcq: {
      q: 'A Fenwick tree supports "add delta at i". How do you implement "set a[k] = u"?',
      options: ['add(k, u)', 'add(k, u − a[k]) and then a[k] = u, keeping a copy of the array', 'rebuild the tree', 'add(k, −u)'],
      answer: 1,
      explain: 'A Fenwick tree stores sums, not individual values, so remember the current values in a plain array and add only the difference.'
    },
    hints: [
      `<p><b>Aha:</b> sum is invertible: sum(l..r) = prefix(r) − prefix(l − 1), and a Fenwick tree gives prefix sums with updates in O(log N).</p>`,
      `<p>Keep <code>long[] cur</code> with the current values. "set" → <code>add(k + 1, u − cur[k]); cur[k] = u</code> (1-based inside the tree).</p>`,
      `<p>Edge cases: l = 0 (prefix(0) = 0), setting to the same value (delta 0), overflow → long. Build in O(N) or with N adds.</p>`
    ],
    solution: {
      approach: `<p>Fenwick tree over the array plus a copy of current values for computing deltas.</p>`,
      code: `
        class Solution {
            private long[] bit;
            private int n;

            private void add(int i, long d) { for (; i <= n; i += i & -i) bit[i] += d; }
            private long prefix(int i) { long s = 0; for (; i > 0; i -= i & -i) s += bit[i]; return s; }

            public long[] process(int[] a, int[][] ops) {
                n = a.length;
                bit = new long[n + 1];
                long[] cur = new long[n];
                for (int i = 0; i < n; i++) { cur[i] = a[i]; add(i + 1, a[i]); }
                List<Long> out = new ArrayList<>();
                for (int[] op : ops) {
                    if (op[0] == 1) {
                        add(op[1] + 1, op[2] - cur[op[1]]);   // only the difference
                        cur[op[1]] = op[2];
                    } else {
                        out.add(prefix(op[2] + 1) - prefix(op[1]));
                    }
                }
                long[] res = new long[out.size()];
                for (int i = 0; i < res.length; i++) res[i] = out.get(i);
                return res;
            }

            public static void main(String[] args) {
                int[] a = {3, 2, 4, 5, 1, 1, 5, 3};
                int[][] ops = {{2, 0, 3}, {2, 4, 5}, {1, 2, 1}, {2, 0, 3}};
                System.out.println(Arrays.toString(new Solution().process(a, ops)));  // [14, 2, 11]
            }
        }`,
      complexity: `<p>O((N + Q) log N) time, O(N) memory.</p>`,
      followUps: ['Range add instead of set — two Fenwicks.', 'Return the first index whose prefix sum reaches S — Fenwick binary lifting.']
    }
  });

  // =====================================================================
  // PRACTICE — Medium
  // =====================================================================
  practice.push({
    title: 'Count Inversions',
    level: 'Medium',
    tags: ['fenwick tree', 'coordinate compression', 'counting'],
    companies: ['Amazon', 'Microsoft', 'Adobe', 'Goldman Sachs'],
    statement: `<p>Given an array <code>a</code>, count the pairs <code>(i, j)</code> with <code>i &lt; j</code> and <code>a[i] &gt; a[j]</code> (inversions).</p>`,
    constraints: `1 ≤ N ≤ 2·10<sup>5</sup>, −10<sup>9</sup> ≤ a[i] ≤ 10<sup>9</sup>. The answer can reach ~2·10<sup>10</sup> → long.`,
    example: `${H.arr([8, 4, 2, 1], { label: 'a' })}<p>Output ${H.c('g', '6')}: every pair is inverted (4·3/2). For [3, 1, 2] the answer is ${H.c('g', '2')}: (3,1) and (3,2).</p>`,
    brute: {
      why: `<p>Check all pairs: N(N−1)/2 ≈ 2·10<sup>10</sup> comparisons. The waste: for each new element we recount all earlier elements instead of keeping a running "how many seen values are greater than v".</p>`,
      code: `
        long bruteInversions(int[] a) {
            long c = 0;
            for (int i = 0; i < a.length; i++)
                for (int j = i + 1; j < a.length; j++)
                    if (a[i] > a[j]) c++;
            return c;
        }`
    },
    mcq: {
      q: 'Scanning left to right with a BIT of value counts, how many earlier elements are strictly greater than the current value with rank r?',
      options: ['prefix(r)', 'seen − prefix(r)', 'seen − prefix(r − 1)', 'prefix(N) − prefix(r − 1)'],
      answer: 1,
      explain: 'prefix(r) counts earlier values ≤ v (equal values are not inversions). seen − prefix(r) is the number of earlier values strictly greater.'
    },
    hints: [
      `<p><b>Aha:</b> inversions ending at j = number of earlier values greater than a[j]. A data structure that counts "values ≤ v seen so far" answers that.</p>`,
      `<p>Compress values to ranks 1..K, then BIT of counts: for each element add <code>seen − prefix(rank)</code>, then <code>add(rank, 1)</code>.</p>`,
      `<p>Edge cases: duplicates (not inversions → use prefix(rank), not prefix(rank − 1)), N = 1 (0), long answer. Alternative: merge sort counting cross pairs.</p>`
    ],
    solution: {
      approach: `<p>Coordinate compression + Fenwick tree of counts, one pass.</p>`,
      code: `
        class Solution {
            public long countInversions(int[] a) {
                int n = a.length;
                int[] s = a.clone();
                Arrays.sort(s);
                int k = 0;
                for (int i = 0; i < n; i++) if (i == 0 || s[i] != s[i - 1]) s[k++] = s[i];
                int[] bit = new int[k + 1];
                long inv = 0;
                for (int seen = 0; seen < n; seen++) {
                    int r = Arrays.binarySearch(s, 0, k, a[seen]) + 1;          // rank 1..k
                    int le = 0;
                    for (int i = r; i > 0; i -= i & -i) le += bit[i];          // earlier values <= a[seen]
                    inv += seen - le;                                         // earlier values > a[seen]
                    for (int i = r; i <= k; i += i & -i) bit[i]++;
                }
                return inv;
            }

            public static void main(String[] args) {
                System.out.println(new Solution().countInversions(new int[]{8, 4, 2, 1}));     // 6
                System.out.println(new Solution().countInversions(new int[]{3, 1, 2}));        // 2
                System.out.println(new Solution().countInversions(new int[]{2, 2, 1}));        // 2
            }
        }`,
      dry: { head: ['v', 'rank', 'seen', 'prefix(rank)', 'added', 'total'], rows: [['8', '4', '0', '0', '0', '0'], ['4', '3', '1', '0', '1', '1'], ['2', '2', '2', '0', '2', '3'], ['1', '1', '3', '0', '3', H.c('g', '6')]] },
      complexity: `<p>O(N log N) time (sort + N BIT operations), O(N) memory.</p>`,
      followUps: ['Count pairs with a[i] &gt; 2·a[j] (Reverse Pairs).', 'Minimum adjacent swaps to sort = number of inversions — why?']
    }
  });

  practice.push({
    title: 'Range Update, Point Query',
    level: 'Medium',
    tags: ['fenwick tree', 'difference array'],
    companies: ['CSES classic', 'Uber'],
    statement: `<p>Given an array <code>a</code>, process operations: <code>[1, l, r, u]</code> adds <code>u</code> to every element in <code>[l, r]</code>; <code>[2, k]</code> asks for the current value of <code>a[k]</code>. Return the answers (0-based).</p>`,
    constraints: `1 ≤ N, Q ≤ 2·10<sup>5</sup>, 1 ≤ a[i], u ≤ 10<sup>9</sup> → values up to ~2·10<sup>14</sup> (long).`,
    example: `${H.arr([3, 2, 4, 5, 1, 1, 5, 3], { label: 'a' })}
      <p>Ops [2,3], [1,1,4,1], [2,3], [2,4] → ${H.c('g', '[5, 6, 2]')}. The add raises a[1..4] by 1, so a[3] becomes 6 and a[4] becomes 2.</p>`,
    brute: {
      why: `<p>Apply every add element by element: O(N) per add → 4·10<sup>10</sup> worst case. A difference array makes adds O(1) but then reading a[k] costs an O(N) prefix sum. The waste is on one side or the other.</p>`,
      code: `
        long[] bruteRangePoint(int[] a0, int[][] ops) {
            long[] a = new long[a0.length];
            for (int i = 0; i < a0.length; i++) a[i] = a0[i];
            List<Long> out = new ArrayList<>();
            for (int[] op : ops) {
                if (op[0] == 1) for (int i = op[1]; i <= op[2]; i++) a[i] += op[3];
                else out.add(a[op[1]]);
            }
            long[] res = new long[out.size()];
            for (int i = 0; i < res.length; i++) res[i] = out.get(i);
            return res;
        }`
    },
    mcq: {
      q: 'You keep a Fenwick tree over the difference array d. What is a[k]?',
      options: ['d[k]', 'original a[k] + prefix(k) over the BIT of added differences', 'prefix(N) − prefix(k)', 'the max of d[0..k]'],
      answer: 1,
      explain: 'If the BIT only stores the added differences (start with zeros), the total bonus at k is prefix(k); add it to the original value.'
    },
    hints: [
      `<p><b>Aha:</b> "add u to [l, r]" changes the difference array at two points; "value at k" is a prefix sum of differences. Both are Fenwick operations.</p>`,
      `<p>BIT of size N+1 starting at zero (only the bonuses): <code>add(l, u); add(r + 1, −u)</code> (1-based). Answer = <code>a[k] + prefix(k)</code>.</p>`,
      `<p>Edge cases: r = N − 1 → r + 2 &gt; N in 1-based, so the second add is skipped automatically by the loop; long values. Recipe: two BIT updates per add, one prefix per query.</p>`
    ],
    solution: {
      approach: `<p>Fenwick tree over the differences of the bonuses; the original array stays untouched.</p>`,
      code: `
        class Solution {
            public long[] process(int[] a, int[][] ops) {
                int n = a.length;
                long[] bit = new long[n + 2];
                List<Long> out = new ArrayList<>();
                for (int[] op : ops) {
                    if (op[0] == 1) {
                        int l = op[1] + 1, r = op[2] + 1;                          // 1-based
                        for (int i = l; i <= n; i += i & -i) bit[i] += op[3];      // bonus starts at l
                        for (int i = r + 1; i <= n; i += i & -i) bit[i] -= op[3];  // and stops after r
                    } else {
                        long bonus = 0;
                        for (int i = op[1] + 1; i > 0; i -= i & -i) bonus += bit[i];
                        out.add(a[op[1]] + bonus);
                    }
                }
                long[] res = new long[out.size()];
                for (int i = 0; i < res.length; i++) res[i] = out.get(i);
                return res;
            }

            public static void main(String[] args) {
                int[] a = {3, 2, 4, 5, 1, 1, 5, 3};
                int[][] ops = {{2, 3}, {1, 1, 4, 1}, {2, 3}, {2, 4}};
                System.out.println(Arrays.toString(new Solution().process(a, ops)));  // [5, 6, 2]
            }
        }`,
      complexity: `<p>O(log N) per operation, O(N) memory.</p>`,
      followUps: ['Also ask "sum of [l, r]" — two Fenwicks (range add + range sum).', 'Range assign instead of add — lazy segment tree.']
    }
  });

  practice.push({
    title: 'Range Sum Query 2D — Mutable',
    level: 'Medium',
    tags: ['2D fenwick tree', 'matrix', 'design'],
    companies: ['Google', 'Meta', 'Bloomberg'],
    statement: `<p>Design <code>NumMatrix</code> over an integer matrix: <code>update(row, col, val)</code> sets one cell; <code>sumRegion(r1, c1, r2, c2)</code> returns the sum of the rectangle with top-left (r1, c1) and bottom-right (r2, c2).</p>`,
    constraints: `1 ≤ rows, cols ≤ 200, −1000 ≤ values ≤ 1000, at most 5000 calls in total.`,
    example: `${H.table(['', 'c0', 'c1', 'c2', 'c3', 'c4'], [['r0', '3', '0', '1', '4', '2'], ['r1', '5', '6', '3', '2', '1'], ['r2', '1', H.c('g', '2'), H.c('g', '0'), H.c('g', '1'), '5'], ['r3', '4', H.c('g', '1'), H.c('g', '0'), H.c('g', '1'), '7'], ['r4', '1', H.c('g', '0'), H.c('g', '3'), H.c('g', '0'), '5']])}
      <p>sumRegion(2,1,4,3) → ${H.c('g', '8')}; update(3,2,2); sumRegion(2,1,4,3) → ${H.c('g', '10')} (the 0 at (3,2) became 2).</p>`,
    brute: {
      why: `<p>Loop over the rectangle: up to 200 × 200 = 4·10<sup>4</sup> per query, 2·10<sup>8</sup> for 5000 calls — borderline. 2D prefix sums make queries O(1) but updates O(rows·cols). A 2D Fenwick tree balances both at O(log R · log C).</p>`,
      code: `
        class NumMatrixBrute {
            private final int[][] m;
            NumMatrixBrute(int[][] matrix) { m = new int[matrix.length][]; for (int i = 0; i < m.length; i++) m[i] = matrix[i].clone(); }
            void update(int r, int c, int val) { m[r][c] = val; }
            int sumRegion(int r1, int c1, int r2, int c2) {
                int s = 0;
                for (int r = r1; r <= r2; r++) for (int c = c1; c <= c2; c++) s += m[r][c];
                return s;
            }
        }`
    },
    mcq: {
      q: 'With a 2D prefix function P(r, c) = sum of the rectangle (0,0)..(r,c), the region sum is…',
      options: ['P(r2,c2) − P(r1,c1)', 'P(r2,c2) − P(r1−1,c2) − P(r2,c1−1) + P(r1−1,c1−1)', 'P(r2,c2) − P(r1−1,c1−1)', 'P(r2,c2) + P(r1,c1)'],
      answer: 1,
      explain: 'Inclusion–exclusion: remove the strip above and the strip to the left, then add back the corner that was removed twice.'
    },
    hints: [
      `<p><b>Aha:</b> a Fenwick tree works per dimension: a 2D BIT is "a Fenwick tree of Fenwick trees" — nested lowbit loops over rows and columns.</p>`,
      `<p><code>add(r, c, d)</code>: for i = r; i ≤ R; i += i&amp;−i: for j = c; j ≤ C; j += j&amp;−j: t[i][j] += d. <code>prefix(r, c)</code> mirrors it with subtraction. Keep the matrix to compute deltas for updates.</p>`,
      `<p>Edge cases: r1 = 0 or c1 = 0 (prefix with index 0 returns 0 in 1-based), single cell. Region = inclusion–exclusion of four prefixes.</p>`
    ],
    solution: {
      approach: `<p>2D Fenwick tree with a copy of the matrix for deltas; inclusion–exclusion for regions.</p>`,
      code: `
        class NumMatrix {
            private final int R, C;
            private final int[][] t, val;

            public NumMatrix(int[][] matrix) {
                R = matrix.length; C = matrix[0].length;
                t = new int[R + 1][C + 1];
                val = new int[R][C];
                for (int r = 0; r < R; r++) for (int c = 0; c < C; c++) update(r, c, matrix[r][c]);
            }

            public void update(int row, int col, int v) {
                int d = v - val[row][col];
                val[row][col] = v;
                for (int i = row + 1; i <= R; i += i & -i)
                    for (int j = col + 1; j <= C; j += j & -j) t[i][j] += d;
            }

            private int prefix(int row, int col) {           // sum of (0,0)..(row-1, col-1)
                int s = 0;
                for (int i = row; i > 0; i -= i & -i)
                    for (int j = col; j > 0; j -= j & -j) s += t[i][j];
                return s;
            }

            public int sumRegion(int r1, int c1, int r2, int c2) {
                return prefix(r2 + 1, c2 + 1) - prefix(r1, c2 + 1) - prefix(r2 + 1, c1) + prefix(r1, c1);
            }

            public static void main(String[] args) {
                int[][] m = {{3, 0, 1, 4, 2}, {5, 6, 3, 2, 1}, {1, 2, 0, 1, 5}, {4, 1, 0, 1, 7}, {1, 0, 3, 0, 5}};
                NumMatrix nm = new NumMatrix(m);
                System.out.println(nm.sumRegion(2, 1, 4, 3));  // 8
                nm.update(3, 2, 2);
                System.out.println(nm.sumRegion(2, 1, 4, 3));  // 10
            }
        }`,
      complexity: `<p>Update and query O(log R · log C); build O(R·C·log R·log C) (or O(R·C) with the parent trick); memory O(R·C).</p>`,
      followUps: ['Range add on rectangles + point query (2D difference + 2D BIT).', 'Huge sparse grid (10<sup>9</sup> × 10<sup>9</sup>) with offline queries — sweep line + 1D BIT.']
    }
  });

  practice.push({
    title: 'Dynamic Range Minimum Queries',
    level: 'Medium',
    tags: ['segment tree', 'range min', 'point update'],
    companies: ['CSES classic', 'Amazon', 'Citadel'],
    statement: `<p>Given an array <code>a</code>, process operations: <code>[1, k, u]</code> sets <code>a[k] = u</code>; <code>[2, l, r]</code> asks for the minimum of <code>a[l..r]</code>. Return the answers of type-2 operations (0-based).</p>`,
    constraints: `1 ≤ N, Q ≤ 2·10<sup>5</sup>, 1 ≤ a[i], u ≤ 10<sup>9</sup>`,
    example: `${H.arr([3, 2, 4, 5, 1, 1, 5, 3], { label: 'a' })}
      <p>Ops [2,0,3], [2,4,5], [1,1,6], [2,0,3] → ${H.c('g', '[2, 1, 3]')}. After a[1] = 6, the first four are 3, 6, 4, 5 → min 3.</p>`,
    brute: {
      why: `<p>Scan [l, r] per query: O(N) → 4·10<sup>10</sup>. A sparse table answers in O(1) but each set forces an O(N log N) rebuild. A Fenwick tree cannot "un-min" a prefix. The waste: recomputing minima of unchanged blocks.</p>`,
      code: `
        int[] bruteDynMin(int[] a0, int[][] ops) {
            int[] a = a0.clone();
            List<Integer> out = new ArrayList<>();
            for (int[] op : ops) {
                if (op[0] == 1) a[op[1]] = op[2];
                else { int m = Integer.MAX_VALUE; for (int i = op[1]; i <= op[2]; i++) m = Math.min(m, a[i]); out.add(m); }
            }
            int[] res = new int[out.size()];
            for (int i = 0; i < res.length; i++) res[i] = out.get(i);
            return res;
        }`
    },
    mcq: {
      q: 'Why can\'t a Fenwick tree answer min(a[l..r]) with arbitrary updates?',
      options: ['It uses too much memory', 'min has no inverse: you cannot remove prefix(l − 1) from prefix(r)', 'It only works for powers of two', 'It cannot store negative numbers'],
      answer: 1,
      explain: 'Range answers in a BIT are prefix(r) "minus" prefix(l − 1). For sums subtraction exists; for min there is no way to undo the influence of the first l − 1 elements.'
    },
    hints: [
      `<p><b>Aha:</b> min is associative with identity +∞, so a segment tree handles both operations in O(log N).</p>`,
      `<p>Iterative tree: leaves at <code>t[n + i]</code>; set climbs <code>p &gt;&gt;= 1</code> recomputing <code>min(t[2p], t[2p+1])</code>; query uses the half-open [l, r+1) loop.</p>`,
      `<p>Edge cases: l = r, N = 1, identity must be <code>Integer.MAX_VALUE</code> (not 0). Use fast I/O for 2·10<sup>5</sup> lines.</p>`
    ],
    solution: {
      approach: `<p>Bottom-up segment tree for min: O(log N) per set and per query, 2N memory.</p>`,
      code: `
        class Solution {
            public int[] process(int[] a, int[][] ops) {
                int n = a.length;
                int[] t = new int[2 * n];
                for (int i = 0; i < n; i++) t[n + i] = a[i];
                for (int p = n - 1; p >= 1; p--) t[p] = Math.min(t[2 * p], t[2 * p + 1]);
                List<Integer> out = new ArrayList<>();
                for (int[] op : ops) {
                    if (op[0] == 1) {
                        int p = op[1] + n;
                        t[p] = op[2];
                        for (p >>= 1; p >= 1; p >>= 1) t[p] = Math.min(t[2 * p], t[2 * p + 1]);
                    } else {
                        int res = Integer.MAX_VALUE;
                        for (int l = op[1] + n, r = op[2] + n + 1; l < r; l >>= 1, r >>= 1) {
                            if ((l & 1) == 1) res = Math.min(res, t[l++]);
                            if ((r & 1) == 1) res = Math.min(res, t[--r]);
                        }
                        out.add(res);
                    }
                }
                int[] res = new int[out.size()];
                for (int i = 0; i < res.length; i++) res[i] = out.get(i);
                return res;
            }

            public static void main(String[] args) {
                int[] a = {3, 2, 4, 5, 1, 1, 5, 3};
                int[][] ops = {{2, 0, 3}, {2, 4, 5}, {1, 1, 6}, {2, 0, 3}};
                System.out.println(Arrays.toString(new Solution().process(a, ops)));  // [2, 1, 3]
            }
        }`,
      complexity: `<p>O((N + Q) log N) time, O(N) memory.</p>`,
      followUps: ['Also return how many times the minimum occurs (node = (min, count)).', 'Range add + range min — lazy propagation.']
    }
  });

  practice.push({
    title: 'Hotel Queries (First Position With Enough Capacity)',
    level: 'Medium',
    tags: ['segment tree', 'descent', 'range max'],
    companies: ['CSES classic', 'Amazon', 'Booking.com'],
    statement: `<p>There are N hotels in a row; hotel i has <code>h[i]</code> free rooms. Groups arrive one by one; group j needs <code>g[j]</code> rooms and takes the <b>first</b> hotel (smallest index) with at least that many free rooms, which then has <code>g[j]</code> fewer rooms. For each group output the 1-based hotel number, or 0 if no hotel fits.</p>`,
    constraints: `1 ≤ N, M ≤ 2·10<sup>5</sup>, 1 ≤ h[i], g[j] ≤ 10<sup>9</sup>`,
    example: `${H.arr([3, 2, 4, 1, 5, 5, 2, 6], { label: 'free rooms h (hotels 1..8)', start: 1 })}
      <p>Groups [4, 4, 7, 1, 1] → ${H.c('g', '[3, 5, 0, 1, 1]')}. The first 4 goes to hotel 3 (now 0 rooms), the next 4 to hotel 5 (now 1), nobody has 7, then two groups of 1 both fit in hotel 1 (3 → 2 → 1).</p>`,
    brute: {
      why: `<p>Scan from hotel 1 for each group: O(N) per group → 4·10<sup>10</sup>. Binary search on "max of prefix" with a range-max tree would be O(log² N). The waste: we revisit many hotels that are too small, although one stored maximum per block tells us immediately whether a whole block can be skipped.</p>`,
      code: `
        int[] bruteHotels(int[] h0, int[] groups) {
            int[] h = h0.clone();
            int[] res = new int[groups.length];
            for (int j = 0; j < groups.length; j++) {
                for (int i = 0; i < h.length; i++)
                    if (h[i] >= groups[j]) { h[i] -= groups[j]; res[j] = i + 1; break; }
            }
            return res;
        }`
    },
    mcq: {
      q: 'Each node stores the max of its range. At a node whose left child has max ≥ g, where do you go?',
      options: ['Right child, to find a bigger hotel', 'Left child — the first fitting hotel must be there', 'Both children and compare', 'Stop: this node is the answer'],
      answer: 1,
      explain: 'If the left half contains any hotel with ≥ g rooms, the first such hotel is in the left half. Only if it does not do we go right. One root-to-leaf walk: O(log N).'
    },
    hints: [
      `<p><b>Aha:</b> "first index with value ≥ g" can be found by walking down a max-segment tree: prefer the left child whenever its max is big enough.</p>`,
      `<p>Max tree over h. For each group: if root max &lt; g → 0. Otherwise descend to the leaf, record its index, subtract g at that leaf and recompute maxima up the path.</p>`,
      `<p>Edge cases: several hotels with exactly g (take the leftmost), rooms dropping to 0, 1-based output. The descent and the update are both O(log N).</p>`
    ],
    solution: {
      approach: `<p>Range-max segment tree + descent (no binary search needed) + point update.</p>`,
      code: `
        class Solution {
            private int n;
            private int[] mx;

            private void build(int[] h, int node, int l, int r) {
                if (l == r) { mx[node] = h[l]; return; }
                int mid = (l + r) >>> 1;
                build(h, 2 * node, l, mid);
                build(h, 2 * node + 1, mid + 1, r);
                mx[node] = Math.max(mx[2 * node], mx[2 * node + 1]);
            }

            /** leftmost index with value >= need (caller checked mx[1] >= need). Subtracts need there. */
            private int takeFirst(int node, int l, int r, int need) {
                int idx;
                if (l == r) { mx[node] -= need; return l; }
                int mid = (l + r) >>> 1;
                if (mx[2 * node] >= need) idx = takeFirst(2 * node, l, mid, need);   // prefer the left half
                else idx = takeFirst(2 * node + 1, mid + 1, r, need);
                mx[node] = Math.max(mx[2 * node], mx[2 * node + 1]);              // repair on the way up
                return idx;
            }

            public int[] assign(int[] hotels, int[] groups) {
                n = hotels.length;
                mx = new int[4 * n];
                build(hotels, 1, 0, n - 1);
                int[] res = new int[groups.length];
                for (int j = 0; j < groups.length; j++)
                    res[j] = mx[1] < groups[j] ? 0 : takeFirst(1, 0, n - 1, groups[j]) + 1;
                return res;
            }

            public static void main(String[] args) {
                int[] h = {3, 2, 4, 1, 5, 5, 2, 6};
                int[] g = {4, 4, 7, 1, 1};
                System.out.println(Arrays.toString(new Solution().assign(h, g)));  // [3, 5, 0, 1, 1]
            }
        }`,
      dry: { head: ['group', 'root max', 'walk', 'hotel', 'rooms after'], rows: [['4', '6', 'left [1..4] max 4 ≥ 4 → … → hotel 3', '3', 'h3 = 0'], ['4', '6', 'left max now 3 &lt; 4 → right → [5..6] → hotel 5', '5', 'h5 = 1'], ['7', '6', 'root max 6 &lt; 7', '0', '—'], ['1', '6', 'leftmost leaf', '1', 'h1 = 2'], ['1', '6', 'leftmost leaf', '1', 'h1 = 1']] },
      complexity: `<p>O(N + M log N) time, O(N) memory.</p>`,
      followUps: ['Groups may only use hotels in [l, r] — descent restricted to a range.', 'Find the first hotel with ≥ g rooms at or after position p.']
    }
  });

  practice.push({
    title: 'List Removals (k-th Remaining Element)',
    level: 'Medium',
    tags: ['fenwick tree', 'binary lifting', 'order statistics'],
    companies: ['CSES classic', 'Google'],
    statement: `<p>You have a list of N numbers. You remove elements one at a time: each step gives a position <code>p</code> (1-based, in the <b>current</b> list) and you remove the element at that position. Return the removed elements in order.</p>`,
    constraints: `1 ≤ N ≤ 2·10<sup>5</sup>, 1 ≤ p ≤ current size, 1 ≤ values ≤ 10<sup>9</sup>`,
    example: `${H.arr([2, 6, 1, 4, 2], { label: 'list', start: 1 })}
      <p>Positions [3, 1, 3, 1, 1] → ${H.c('g', '[1, 2, 2, 6, 4]')}. Remove 3rd (1) → [2,6,4,2]; 1st (2) → [6,4,2]; 3rd (2) → [6,4]; 1st (6) → [4]; 1st (4).</p>`,
    brute: {
      why: `<p>An ArrayList removal shifts everything after it: O(N) per removal, O(N²) = 4·10<sup>10</sup> worst case. The waste: physically moving elements, when we only need to know "which original index is the p-th still alive".</p>`,
      code: `
        int[] bruteRemovals(int[] list, int[] positions) {
            List<Integer> cur = new ArrayList<>();
            for (int v : list) cur.add(v);
            int[] out = new int[positions.length];
            for (int i = 0; i < positions.length; i++) out[i] = cur.remove(positions[i] - 1);  // O(N) shift
            return out;
        }`
    },
    mcq: {
      q: 'Keep a Fenwick tree with 1 for every alive index. The p-th alive element is at…',
      options: ['index p', 'the smallest i with prefix(i) ≥ p', 'the largest i with prefix(i) ≤ p', 'index N − p'],
      answer: 1,
      explain: 'prefix(i) counts alive elements among the first i original positions. The p-th alive one is where that count first reaches p — found by Fenwick binary lifting in O(log N).'
    },
    hints: [
      `<p><b>Aha:</b> never move elements; mark them dead. Then "the p-th alive" is an order-statistic query over a 0/1 array.</p>`,
      `<p>Fenwick tree of ones. Find the smallest index with prefix ≥ p using binary lifting (walk powers of two from high to low), output list[idx], then <code>add(idx, −1)</code>.</p>`,
      `<p>Edge cases: N = 1, always p = 1 (queue behaviour), always p = current size (stack behaviour). Build the all-ones BIT in O(N) with the parent trick or with N adds.</p>`
    ],
    solution: {
      approach: `<p>Fenwick tree of alive flags + binary-lifting lower bound. Each removal is O(log N).</p>`,
      code: `
        class Solution {
            public int[] removals(int[] list, int[] positions) {
                int n = list.length;
                int[] bit = new int[n + 1];
                for (int i = 1; i <= n; i++) {                    // O(N) build of an all-ones array
                    bit[i]++;
                    int p = i + (i & -i);
                    if (p <= n) bit[p] += bit[i];
                }
                int top = Integer.highestOneBit(n);
                int[] out = new int[positions.length];
                for (int q = 0; q < positions.length; q++) {
                    int k = positions[q], pos = 0;
                    for (int step = top; step > 0; step >>= 1)
                        if (pos + step <= n && bit[pos + step] < k) { pos += step; k -= bit[pos]; }
                    int idx = pos + 1;                              // 1-based original index of the k-th alive
                    out[q] = list[idx - 1];
                    for (int i = idx; i <= n; i += i & -i) bit[i]--;   // mark it dead
                }
                return out;
            }

            public static void main(String[] args) {
                int[] list = {2, 6, 1, 4, 2};
                int[] pos = {3, 1, 3, 1, 1};
                System.out.println(Arrays.toString(new Solution().removals(list, pos)));  // [1, 2, 2, 6, 4]
            }
        }`,
      complexity: `<p>O(N + Q log N) time, O(N) memory.</p>`,
      followUps: ['Josephus problem with step k — same tool.', 'Support insertions at a position too — implicit treap or offline reverse processing.']
    }
  });

  // =====================================================================
  // PRACTICE — Hard
  // =====================================================================
  practice.push({
    title: 'Maximum Subarray Sum with Point Updates',
    level: 'Hard',
    tags: ['segment tree', 'custom node', 'Kadane'],
    companies: ['CSES classic', 'Google', 'Jane Street'],
    statement: `<p>Given an array <code>a</code> and a list of updates <code>[k, x]</code> (set <code>a[k] = x</code>, 0-based), output after <b>each</b> update the maximum subarray sum of the whole array. The empty subarray is allowed (so the answer is at least 0).</p>`,
    constraints: `1 ≤ N, M ≤ 2·10<sup>5</sup>, −10<sup>9</sup> ≤ a[i], x ≤ 10<sup>9</sup> (use long)`,
    example: `${H.arr([1, 2, -3, 5, -1], { label: 'a' })}
      <p>Updates [1,6], [2,1], [1,−2] → ${H.c('g', '[9, 13, 6]')}. After the first update [1, 6, −3, 5, −1]: best is 1 + 6 − 3 + 5 = 9. After the second: [1, 6, 1, 5, −1] → 13. After the third: [1, −2, 1, 5, −1] → 6 (just 1 + 5).</p>`,
    brute: {
      why: `<p>Run Kadane's algorithm after every update: O(N) each → 4·10<sup>10</sup>. The waste: one element changed, yet we recompute the best subarray of the untouched parts from scratch.</p>`,
      code: `
        long[] bruteMaxSub(int[] a0, int[][] ups) {
            long[] a = new long[a0.length];
            for (int i = 0; i < a0.length; i++) a[i] = a0[i];
            long[] res = new long[ups.length];
            for (int j = 0; j < ups.length; j++) {
                a[ups[j][0]] = ups[j][1];
                long best = 0, cur = 0;
                for (long v : a) { cur = Math.max(0, cur + v); best = Math.max(best, cur); }   // Kadane
                res[j] = best;
            }
            return res;
        }`
    },
    mcq: {
      q: 'Merging left L and right R, which formula gives the best subarray of the combined range?',
      options: ['max(L.best, R.best)', 'L.best + R.best', 'max(L.best, R.best, L.suf + R.pref)', 'max(L.pref, R.suf)'],
      answer: 2,
      explain: 'The best subarray is entirely in L, entirely in R, or crosses the middle — then it is a suffix of L glued to a prefix of R.'
    },
    hints: [
      `<p><b>Aha:</b> store four numbers per node — sum, best prefix, best suffix, best — and the best subarray of any range can be merged from its two halves.</p>`,
      `<p>Merge: sum = L.sum + R.sum; pref = max(L.pref, L.sum + R.pref); suf = max(R.suf, R.sum + L.suf); best = max(L.best, R.best, L.suf + R.pref). Leaf with value v (empty allowed): pref = suf = best = max(0, v).</p>`,
      `<p>Edge cases: all negative (answer 0), huge values (long), N = 1. Recipe: build → for each update: set leaf, recompute the path → print root.best.</p>`
    ],
    solution: {
      approach: `<p>Segment tree with a 4-field node; each update recomputes O(log N) nodes and the answer is the root's best.</p>`,
      code: `
        class Solution {
            private long[] sum, pref, suf, best;
            private int n;

            private void setLeaf(int node, long v) {
                sum[node] = v;
                pref[node] = suf[node] = best[node] = Math.max(0, v);   // empty subarray allowed
            }

            private void pull(int node) {
                int L = 2 * node, R = 2 * node + 1;
                sum[node] = sum[L] + sum[R];
                pref[node] = Math.max(pref[L], sum[L] + pref[R]);
                suf[node] = Math.max(suf[R], sum[R] + suf[L]);
                best[node] = Math.max(Math.max(best[L], best[R]), suf[L] + pref[R]);
            }

            private void build(int[] a, int node, int l, int r) {
                if (l == r) { setLeaf(node, a[l]); return; }
                int mid = (l + r) >>> 1;
                build(a, 2 * node, l, mid);
                build(a, 2 * node + 1, mid + 1, r);
                pull(node);
            }

            private void update(int node, int l, int r, int idx, long v) {
                if (l == r) { setLeaf(node, v); return; }
                int mid = (l + r) >>> 1;
                if (idx <= mid) update(2 * node, l, mid, idx, v);
                else update(2 * node + 1, mid + 1, r, idx, v);
                pull(node);
            }

            public long[] process(int[] a, int[][] ups) {
                n = a.length;
                sum = new long[4 * n]; pref = new long[4 * n]; suf = new long[4 * n]; best = new long[4 * n];
                build(a, 1, 0, n - 1);
                long[] res = new long[ups.length];
                for (int j = 0; j < ups.length; j++) {
                    update(1, 0, n - 1, ups[j][0], ups[j][1]);
                    res[j] = best[1];
                }
                return res;
            }

            public static void main(String[] args) {
                int[] a = {1, 2, -3, 5, -1};
                int[][] ups = {{1, 6}, {2, 1}, {1, -2}};
                System.out.println(Arrays.toString(new Solution().process(a, ups)));  // [9, 13, 6]
            }
        }`,
      dry: { head: ['update', 'array', 'best crossing / inside', 'root.best'], rows: [['a[1] = 6', '1 6 −3 5 −1', 'suffix [1,6] + prefix [−3,5] = 7 + 2', '9'], ['a[2] = 1', '1 6 1 5 −1', '[1,6,1,5]', '13'], ['a[1] = −2', '1 −2 1 5 −1', '[1,5] inside right part', '6']] },
      complexity: `<p>Build O(N); each update O(log N); memory 16N longs.</p>`,
      followUps: ['Answer max subarray sum inside [l, r] (combine nodes left-to-right in order).', 'Non-empty subarray required — change the leaf to pref = suf = best = v.']
    }
  });

  practice.push({
    title: 'Range Add, Range Assign, Range Sum',
    level: 'Hard',
    tags: ['lazy propagation', 'tag composition', 'segment tree'],
    companies: ['CSES classic', 'Codenation', 'Tower Research'],
    statement: `<p>Given an array <code>a</code>, process three kinds of operations (0-based, inclusive): <code>[1, l, r, x]</code> add x to every element in [l, r]; <code>[2, l, r, x]</code> set every element in [l, r] to x; <code>[3, l, r]</code> report the sum of [l, r].</p>`,
    constraints: `1 ≤ N, Q ≤ 2·10<sup>5</sup>, 1 ≤ a[i], x ≤ 10<sup>6</sup> (sums need long).`,
    example: `${H.arr([2, 3, 1, 1, 5, 3], { label: 'a' })}
      <p>Ops [3,2,4], [1,1,3,2], [3,2,4], [2,1,3,5], [3,2,4] → ${H.c('g', '[7, 11, 15]')}. 1 + 1 + 5 = 7; after +2 on [1,3]: [2,5,3,3,5,3] → 3 + 3 + 5 = 11; after setting [1,3] to 5: [2,5,5,5,5,3] → 15.</p>`,
    brute: {
      why: `<p>Loop over [l, r] for every operation: O(N) each → 4·10<sup>10</sup>. The waste: assignments and adds on huge ranges touch every element, although the sums of whole blocks could be updated in O(1).</p>`,
      code: `
        long[] bruteAddAssign(int[] a0, int[][] ops) {
            long[] a = new long[a0.length];
            for (int i = 0; i < a0.length; i++) a[i] = a0[i];
            List<Long> out = new ArrayList<>();
            for (int[] op : ops) {
                if (op[0] == 1) for (int i = op[1]; i <= op[2]; i++) a[i] += op[3];
                else if (op[0] == 2) for (int i = op[1]; i <= op[2]; i++) a[i] = op[3];
                else { long s = 0; for (int i = op[1]; i <= op[2]; i++) s += a[i]; out.add(s); }
            }
            long[] res = new long[out.size()];
            for (int i = 0; i < res.length; i++) res[i] = out.get(i);
            return res;
        }`
    },
    mcq: {
      q: 'A node already has the tag "set to 4, then add 3". A new "add 2" arrives for the whole node. The new tag is…',
      options: ['set 4, add 2', 'set 4, add 5', 'set 6, add 0', 'add 5 (the set is dropped)'],
      answer: 1,
      explain: 'Adds stack on top of the pending set: every element will be 4 + 3 + 2 = 9. (Writing it as "set 9, add 0" is equivalent; dropping the set is wrong.) A new SET, on the other hand, would wipe both.'
    },
    hints: [
      `<p><b>Aha:</b> keep a tag pair (set, add) meaning "first assign set (if present), then add add". Both effects on a node's sum are O(1): sum = set·len, then sum += add·len.</p>`,
      `<p>Composition: new set x → (x, 0). New add v → (set, add + v). Push order: set first, then add. Use a boolean <code>hasSet</code> because 0 could be a legal value in variants.</p>`,
      `<p>Edge cases: assigning after adds (adds disappear), long overflow in x·len, pushing only on internal nodes. Recipe: applySet, applyAdd, push, update(type), query — all with the three classic cases.</p>`
    ],
    solution: {
      approach: `<p>Lazy segment tree with two tags and a fixed composition order (set before add). Every operation is O(log N).</p>`,
      code: `
        class Solution {
            private long[] sum, addTag, setTag;
            private boolean[] hasSet;
            private int n;

            private void applySet(int node, int l, int r, long x) {
                sum[node] = x * (r - l + 1);
                setTag[node] = x; hasSet[node] = true;
                addTag[node] = 0;                                  // an assignment wipes older adds
            }

            private void applyAdd(int node, int l, int r, long x) {
                sum[node] += x * (r - l + 1);
                addTag[node] += x;                                 // stacks on top of any pending set
            }

            private void push(int node, int l, int r) {
                int mid = (l + r) >>> 1;
                if (hasSet[node]) {                                // order matters: set first
                    applySet(2 * node, l, mid, setTag[node]);
                    applySet(2 * node + 1, mid + 1, r, setTag[node]);
                    hasSet[node] = false;
                }
                if (addTag[node] != 0) {                           // then add
                    applyAdd(2 * node, l, mid, addTag[node]);
                    applyAdd(2 * node + 1, mid + 1, r, addTag[node]);
                    addTag[node] = 0;
                }
            }

            private void build(int[] a, int node, int l, int r) {
                if (l == r) { sum[node] = a[l]; return; }
                int mid = (l + r) >>> 1;
                build(a, 2 * node, l, mid);
                build(a, 2 * node + 1, mid + 1, r);
                sum[node] = sum[2 * node] + sum[2 * node + 1];
            }

            private void update(int node, int l, int r, int ql, int qr, int type, long x) {
                if (qr < l || r < ql) return;
                if (ql <= l && r <= qr) {
                    if (type == 1) applyAdd(node, l, r, x); else applySet(node, l, r, x);
                    return;
                }
                push(node, l, r);
                int mid = (l + r) >>> 1;
                update(2 * node, l, mid, ql, qr, type, x);
                update(2 * node + 1, mid + 1, r, ql, qr, type, x);
                sum[node] = sum[2 * node] + sum[2 * node + 1];
            }

            private long query(int node, int l, int r, int ql, int qr) {
                if (qr < l || r < ql) return 0;
                if (ql <= l && r <= qr) return sum[node];
                push(node, l, r);
                int mid = (l + r) >>> 1;
                return query(2 * node, l, mid, ql, qr) + query(2 * node + 1, mid + 1, r, ql, qr);
            }

            public long[] process(int[] a, int[][] ops) {
                n = a.length;
                sum = new long[4 * n]; addTag = new long[4 * n]; setTag = new long[4 * n]; hasSet = new boolean[4 * n];
                build(a, 1, 0, n - 1);
                List<Long> out = new ArrayList<>();
                for (int[] op : ops) {
                    if (op[0] == 3) out.add(query(1, 0, n - 1, op[1], op[2]));
                    else update(1, 0, n - 1, op[1], op[2], op[0], op[3]);
                }
                long[] res = new long[out.size()];
                for (int i = 0; i < res.length; i++) res[i] = out.get(i);
                return res;
            }

            public static void main(String[] args) {
                int[] a = {2, 3, 1, 1, 5, 3};
                int[][] ops = {{3, 2, 4}, {1, 1, 3, 2}, {3, 2, 4}, {2, 1, 3, 5}, {3, 2, 4}};
                System.out.println(Arrays.toString(new Solution().process(a, ops)));  // [7, 11, 15]
            }
        }`,
      complexity: `<p>O(log N) per operation, O(Q log N) total; memory ~4 arrays of 4N.</p>`,
      followUps: ['Add "range min" queries too — what extra field per node?', 'Replace add with multiply (affine tags modulo p).']
    }
  });

  practice.push({
    title: 'Count of Range Sum',
    level: 'Hard',
    tags: ['fenwick tree', 'prefix sums', 'coordinate compression'],
    companies: ['Google', 'Amazon', 'ByteDance'],
    statement: `<p>Given an integer array <code>nums</code> and two integers <code>lower</code> and <code>upper</code>, return the number of subarrays whose sum lies in <code>[lower, upper]</code> (inclusive).</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, −2<sup>31</sup> ≤ nums[i] ≤ 2<sup>31</sup> − 1, −10<sup>5</sup> ≤ lower ≤ upper ≤ 10<sup>5</sup>; the answer fits in an int. Prefix sums need long.`,
    example: `${H.arr([-2, 5, -1], { label: 'nums' })}
      <p>lower = −2, upper = 2 → ${H.c('g', '3')}: [0,0] sums to −2, [2,2] to −1, and [0,2] to 2. Prefix sums P = [0, −2, 3, 2]; we need pairs i &lt; j with −2 ≤ P[j] − P[i] ≤ 2.</p>`,
    brute: {
      why: `<p>Every (i, j) pair with a running sum: N²/2 = 5·10<sup>9</sup>. The waste: for each right end j we test every earlier prefix individually instead of asking "how many earlier prefixes lie in the window [P[j] − upper, P[j] − lower]" — a counting query.</p>`,
      code: `
        int bruteCountRangeSum(int[] nums, int lower, int upper) {
            int c = 0;
            for (int i = 0; i < nums.length; i++) {
                long s = 0;
                for (int j = i; j < nums.length; j++) {
                    s += nums[j];
                    if (s >= lower && s <= upper) c++;
                }
            }
            return c;
        }`
    },
    mcq: {
      q: 'Subarray (i, j] has sum P[j] − P[i]. For a fixed j, which earlier prefixes P[i] count?',
      options: ['lower ≤ P[i] ≤ upper', 'P[j] − upper ≤ P[i] ≤ P[j] − lower', 'P[j] + lower ≤ P[i] ≤ P[j] + upper', 'P[i] ≤ P[j]'],
      answer: 1,
      explain: 'lower ≤ P[j] − P[i] ≤ upper ⇔ P[j] − upper ≤ P[i] ≤ P[j] − lower. So each step is a "count values in a range" query over the prefixes seen so far.'
    },
    hints: [
      `<p><b>Aha:</b> turn subarray sums into differences of prefix sums. For each j, count earlier prefixes inside a value window — a range-count over values.</p>`,
      `<p>Compress all prefix sums (they are the only values ever inserted). BIT of counts over ranks. For window [lo, hi]: count = (# ≤ hi) − (# &lt; lo), found with binary searches on the sorted unique prefix array (the bounds themselves need not be present).</p>`,
      `<p>Edge cases: insert P[0] = 0 before anything; use long everywhere (prefixes reach ±2·10<sup>14</sup>); query before inserting P[j] so i &lt; j. Alternative: merge sort counting (also O(N log N)).</p>`
    ],
    solution: {
      approach: `<p>Prefix sums + coordinate compression + Fenwick tree of counts, sweeping j from left to right.</p>`,
      code: `
        class Solution {
            public int countRangeSum(int[] nums, int lower, int upper) {
                int n = nums.length;
                long[] pre = new long[n + 1];
                for (int i = 0; i < n; i++) pre[i + 1] = pre[i] + nums[i];
                long[] vals = pre.clone();
                Arrays.sort(vals);
                int k = 0;
                for (int i = 0; i <= n; i++) if (i == 0 || vals[i] != vals[i - 1]) vals[k++] = vals[i];
                int[] bit = new int[k + 1];
                long count = 0;
                for (int j = 0; j <= n; j++) {
                    long lo = pre[j] - upper, hi = pre[j] - lower;
                    int below = lowerBound(vals, k, lo);          // ranks of values < lo
                    int upto = lowerBound(vals, k, hi + 1);       // ranks of values <= hi
                    count += prefix(bit, upto) - prefix(bit, below);
                    int r = lowerBound(vals, k, pre[j]) + 1;      // 1-based rank of pre[j]
                    for (int i = r; i <= k; i += i & -i) bit[i]++;
                }
                return (int) count;
            }

            private static int lowerBound(long[] a, int len, long x) {   // first index with a[idx] >= x
                int lo = 0, hi = len;
                while (lo < hi) { int mid = (lo + hi) >>> 1; if (a[mid] < x) lo = mid + 1; else hi = mid; }
                return lo;
            }

            private static int prefix(int[] bit, int i) {
                int s = 0;
                for (; i > 0; i -= i & -i) s += bit[i];
                return s;
            }

            public static void main(String[] args) {
                System.out.println(new Solution().countRangeSum(new int[]{-2, 5, -1}, -2, 2));  // 3
                System.out.println(new Solution().countRangeSum(new int[]{0}, 0, 0));          // 1
            }
        }`,
      dry: { head: ['j', 'P[j]', 'window [P[j]−upper, P[j]−lower]', 'earlier prefixes inside', 'count'], rows: [['0', '0', '[−2, 2]', 'none yet', '0'], ['1', '−2', '[−4, 0]', '0', '1'], ['2', '3', '[1, 5]', '—', '1'], ['3', '2', '[0, 4]', '0 and 3', H.c('g', '3')]] },
      complexity: `<p>O(N log N) time (sort + 2 binary searches + BIT ops per j), O(N) memory.</p>`,
      followUps: ['Solve it with merge sort (count during the merge step).', 'Count subarrays with sum ≥ K only — simpler one-sided query.']
    }
  });

  practice.push({
    title: 'Powerful Array (Mo\'s Algorithm)',
    level: 'Hard',
    tags: ['mo\'s algorithm', 'offline queries', 'frequency counting'],
    companies: ['Codeforces classic', 'DE Shaw'],
    statement: `<p>For a subarray, let <code>K<sub>s</sub></code> be the number of occurrences of value <code>s</code> in it. Its <b>power</b> is <code>Σ K<sub>s</sub>² · s</code> over all values s. Given an array and Q queries <code>[l, r]</code> (0-based, inclusive, all known in advance), return the power of each subarray.</p>`,
    constraints: `1 ≤ N, Q ≤ 2·10<sup>5</sup>, 1 ≤ a[i] ≤ 10<sup>6</sup>. Answers up to ~4·10<sup>16</sup> → long.`,
    example: `${H.arr([1, 1, 2, 2, 1, 3, 1, 1], { label: 'a' })}
      <p>Query [1, 6] covers [1, 2, 2, 1, 3, 1]: K₁ = 3, K₂ = 2, K₃ = 1 → 9·1 + 4·2 + 1·3 = ${H.c('g', '20')}. For a = [1, 2, 1], queries [0,1] → ${H.c('g', '3')} and [0,2] → ${H.c('g', '6')} (4·1 + 1·2).</p>`,
    brute: {
      why: `<p>Count frequencies for each query separately: O(length) each → 4·10<sup>10</sup>. The answer is not mergeable from halves cheaply (the K² terms interact), so segment trees do not help. The waste: neighbouring queries share most of their elements.</p>`,
      code: `
        long[] brutePower(int[] a, int[][] qs) {
            long[] res = new long[qs.length];
            for (int i = 0; i < qs.length; i++) {
                Map<Integer, Long> cnt = new HashMap<>();
                for (int j = qs[i][0]; j <= qs[i][1]; j++) cnt.merge(a[j], 1L, Long::sum);
                long p = 0;
                for (Map.Entry<Integer, Long> e : cnt.entrySet()) p += e.getValue() * e.getValue() * e.getKey();
                res[i] = p;
            }
            return res;
        }`
    },
    mcq: {
      q: 'Value x currently appears c times in the window. You add one more x. How does the power change?',
      options: ['+ x', '+ (c + 1)² · x', '+ (2c + 1) · x', '+ c · x'],
      answer: 2,
      explain: '(c + 1)²·x − c²·x = (2c + 1)·x. Removing one copy (going from c to c − 1) subtracts (2c − 1)·x. Both are O(1), so Mo\'s algorithm applies.'
    },
    hints: [
      `<p><b>Aha:</b> when one element enters or leaves, only its own term K²·s changes, by (2K ± 1)·s. O(1) add/remove + offline queries + static array = Mo's algorithm.</p>`,
      `<p>Plain <code>int[] cnt</code> of size 10<sup>6</sup> + 1 (no HashMap!), <code>long power</code>. Sort queries by (l / B, r) with odd-even trick, B ≈ N/√Q. Add: power += (2·cnt[x] + 1)·x; cnt[x]++. Remove: cnt[x]--; power −= (2·cnt[x] + 1)·x.</p>`,
      `<p>Edge cases: long arithmetic in (2c + 1)·x, answers stored by original index, grow before shrink. ~(N + Q)√N ≈ 9·10<sup>7</sup> O(1) steps — fine with arrays and fast I/O.</p>`
    ],
    solution: {
      approach: `<p>Mo's algorithm with O(1) add/remove updating the power incrementally.</p>`,
      code: `
        class Solution {
            private long power;
            private int[] cnt;

            private void add(int x)    { power += (2L * cnt[x] + 1) * x; cnt[x]++; }
            private void remove(int x) { cnt[x]--; power -= (2L * cnt[x] + 1) * x; }

            public long[] powers(int[] a, int[][] qs) {
                int n = a.length, q = qs.length, maxV = 0;
                for (int v : a) maxV = Math.max(maxV, v);
                cnt = new int[maxV + 1];
                power = 0;
                final int B = Math.max(1, (int) (n / Math.sqrt(Math.max(1, q))));
                Integer[] order = new Integer[q];
                for (int i = 0; i < q; i++) order[i] = i;
                Arrays.sort(order, (x, y) -> {
                    int bx = qs[x][0] / B, by = qs[y][0] / B;
                    if (bx != by) return bx - by;
                    return (bx & 1) == 0 ? qs[x][1] - qs[y][1] : qs[y][1] - qs[x][1];
                });
                long[] ans = new long[q];
                int curL = 0, curR = -1;
                for (int id : order) {
                    int l = qs[id][0], r = qs[id][1];
                    while (curR < r) add(a[++curR]);
                    while (curL > l) add(a[--curL]);
                    while (curR > r) remove(a[curR--]);
                    while (curL < l) remove(a[curL++]);
                    ans[id] = power;
                }
                return ans;
            }

            public static void main(String[] args) {
                System.out.println(Arrays.toString(new Solution().powers(new int[]{1, 2, 1}, new int[][]{{0, 1}, {0, 2}})));   // [3, 6]
                int[] a = {1, 1, 2, 2, 1, 3, 1, 1};
                System.out.println(Arrays.toString(new Solution().powers(a, new int[][]{{1, 6}, {0, 5}, {1, 6}})));          // [20, 20, 20]
            }
        }`,
      alt: [{ lang: 'python', code: `import math


def powers(a, qs):
    n, q = len(a), len(qs)
    B = max(1, int(n / math.sqrt(max(1, q))))
    order = sorted(range(q), key=lambda i: (qs[i][0] // B, qs[i][1] if (qs[i][0] // B) % 2 == 0 else -qs[i][1]))
    cnt = [0] * (max(a) + 1)
    power, cl, cr = 0, 0, -1
    ans = [0] * q
    for i in order:
        l, r = qs[i]
        while cr < r:
            cr += 1; x = a[cr]; power += (2 * cnt[x] + 1) * x; cnt[x] += 1
        while cl > l:
            cl -= 1; x = a[cl]; power += (2 * cnt[x] + 1) * x; cnt[x] += 1
        while cr > r:
            x = a[cr]; cnt[x] -= 1; power -= (2 * cnt[x] + 1) * x; cr -= 1
        while cl < l:
            x = a[cl]; cnt[x] -= 1; power -= (2 * cnt[x] + 1) * x; cl += 1
        ans[i] = power
    return ans


print(powers([1, 2, 1], [(0, 1), (0, 2)]))                          # [3, 6]
print(powers([1, 1, 2, 2, 1, 3, 1, 1], [(1, 6), (0, 5), (1, 6)]))   # [20, 20, 20]`, run: true }],
      dry: { head: ['step', 'element', 'cnt before', 'change', 'power'], rows: [['add a[0]', '1', '0', '+1·1', '1'], ['add a[1]', '2', '0', '+1·2', H.c('g', '3 (query [0,1])')], ['add a[2]', '1', '1', '+3·1', H.c('g', '6 (query [0,2])')]] },
      complexity: `<p>O(Q log Q + (N + Q)·√N) time, O(N + Q + maxV) memory.</p>`,
      followUps: ['Use Hilbert-curve ordering — why does it reduce pointer movement?', 'Add point updates: Mo\'s with a time dimension, B = N<sup>2/3</sup>.']
    }
  });

  // =====================================================================
  // QUIZ
  // =====================================================================
  quiz.push(
    { q: 'An array never changes and you must answer 10<sup>6</sup> "minimum of a[l..r]" queries. Best choice?', options: ['Segment tree', 'Sparse table', 'Fenwick tree', 'Mo\'s algorithm'], answer: 1, explain: 'Static + idempotent op + huge Q → sparse table: O(N log N) build, O(1) per query. A segment tree would cost O(log N) per query and supports updates you do not need.' },
    { q: 'Why does the two-overlapping-windows trick of a sparse table fail for range <b>sum</b>?', options: ['Sums can overflow', 'Elements in the overlap are counted twice', 'Sum is not associative', 'The table would need N² cells'], answer: 1, explain: 'min(x, x) = x, but x + x ≠ x. For sums use disjoint power-of-two blocks (O(log N)) or simply prefix sums (O(1)).' },
    { q: 'What is <code>12 &amp; −12</code> (lowbit of 12)?', options: ['1', '2', '4', '8'], answer: 2, explain: '12 = 1100₂. The lowest set bit is the 4s bit, so lowbit(12) = 4. In a Fenwick tree, tree[12] covers a[9..12].' },
    { q: 'Which boxes does Fenwick <code>prefix(13)</code> read?', options: ['13, 14, 16', '13, 12, 8', '13, 11, 7, 3', '1, 2, 4, 8'], answer: 1, explain: 'Strip the lowest set bit each time: 13 (1101) → 12 (1100) → 8 (1000) → 0. They cover [13], [9..12] and [1..8].' },
    { q: 'In a range query on a segment tree, at most how many nodes per level are <i>partially</i> overlapped (and therefore recurse)?', options: ['1', '2', '4', 'log N'], answer: 1, explain: 'Only the node containing the left boundary and the node containing the right boundary can be partial. Everything between them is fully inside. Hence ≤ 4 visits per level and O(log N) total.' },
    { q: 'For a recursive segment tree with node k having children 2k and 2k+1, how big should the array be to be always safe?', options: ['N', '2N', '2N − 1', '4N'], answer: 3, explain: 'Indices are not packed for non-powers of two; the largest index stays below 2<sup>⌈log₂ N⌉+1</sup> &lt; 4N. The iterative bottom-up tree needs only 2N.' },
    { q: 'In lazy propagation, when must <code>push(node)</code> be called?', options: ['After every update at the root', 'Before recursing into the children of a partially covered node (in both updates and queries)', 'Only at leaves', 'Only during queries'], answer: 1, explain: 'Children may be stale while their parent holds an IOU. Anyone who looks inside a node must first hand the IOU down; forgetting it in queries is a classic bug.' },
    { q: 'A segment tree for range <b>minimum</b>: what should a node that does not overlap the query return?', options: ['0', '−1', '+∞ (e.g. Integer.MAX_VALUE)', 'the node\'s own value'], answer: 2, explain: 'It must be the identity of min, which never wins: min(x, +∞) = x. Returning 0 silently breaks every query on positive data.' },
    { q: 'Which is NOT a requirement of Mo\'s algorithm?', options: ['All queries known in advance', 'No updates to the array (basic version)', 'O(1)-ish add/remove of one element', 'The query answer must be mergeable from two halves'], answer: 3, explain: 'Mo\'s algorithm is exactly for answers that are NOT easily mergeable (distinct counts, pair counts). It needs offline queries, a static array and cheap add/remove.' },
    { q: 'For sqrt decomposition with point updates and range sums, why is B ≈ √N the best block size?', options: ['Because √N is always an integer', 'Query cost ≈ 2B + N/B, which is smallest when B = N/B', 'It minimizes memory', 'Because the blocks then fit in the CPU cache'], answer: 1, explain: 'Partial blocks cost up to 2B, full blocks cost N/B. B + N/B is minimized at B = √N, giving O(√N) per query.' },
    { q: 'You need "add v to a[l..r]" and "what is a[k] now?" (no range sums). Lightest structure?', options: ['Lazy segment tree', 'One Fenwick tree over the difference array', 'Sparse table', 'Two Fenwick trees'], answer: 1, explain: 'A range add touches the difference array at two points; a[k] is a prefix sum of differences. One BIT does both in O(log N). Two BITs are needed only for range sums.' },
    { q: 'Which operation is idempotent and therefore works with the O(1) sparse-table query?', options: ['xor', 'product', 'gcd', 'sum of squares'], answer: 2, explain: 'gcd(x, x) = x, so counting an element twice does not change the result. xor, product and sums are not idempotent.' },
    { q: 'Mo\'s algorithm with N = Q = 10<sup>5</sup> and block size √N performs about how many pointer moves?', options: ['≈ 10<sup>5</sup>', '≈ 6·10<sup>7</sup>', '≈ 10<sup>10</sup>', '≈ 10<sup>15</sup>'], answer: 1, explain: 'Right pointer ≤ N per block × √N blocks ≈ 3.2·10<sup>7</sup>; left pointer ≤ √N per query × Q ≈ 3.2·10<sup>7</sup>. Total ≈ 6·10<sup>7</sup>, versus up to 10<sup>10</sup> for scanning every query.' }
  );

  // =====================================================================
  // INTERVIEW Q&A
  // =====================================================================
  interview.push(
    {
      q: 'What is a segment tree, and when would you reach for one instead of prefix sums?',
      level: 'B',
      a: `<p>A segment tree is a binary tree over an array where every node stores the answer (sum, min, max, gcd…) for a contiguous range; the root covers everything and each child covers half of its parent. It supports <b>point updates and range queries in O(log N)</b>, with O(N) build and 2N–4N memory.</p>
        <p>Prefix sums give O(1) queries but O(N) updates, so they only win when the array is static (and the operation is invertible). I reach for a segment tree when the problem mixes updates and range queries, or when the operation is not invertible (min/max) or needs a custom merged node (max subarray sum).</p>`,
      followUps: ['What operations can a segment tree support? (associative + identity)', 'How would you find the first index with value ≥ x?']
    },
    {
      q: 'Explain lazy propagation. What invariant makes it correct?',
      level: 'I',
      a: `<p>For range updates, when an update fully covers a node I fix that node's stored value in O(1) (e.g. sum += v·len) and record a <b>lazy tag</b> ("my children still owe +v") instead of visiting the subtree. Before any later update or query descends into that node's children, I <b>push</b> the tag down (apply it to both children, clear it) and after recursing I <b>pull</b> the node's value from its children.</p>
        <p>Invariant: every node's value is correct for its range taking into account all updates except tags still pending at its <i>ancestors</i>; since we push along the whole root-to-node path before reading, the nodes we read have no pending ancestors on that path. Requirements: the tag can update a node's aggregate without its children, and two tags can be composed into one.</p>`,
      followUps: ['Design tags for range assign + range add.', 'Give an update that cannot be done lazily (√ or mod) and how to handle it.']
    },
    {
      q: 'Fenwick tree vs segment tree: how do you decide?',
      level: 'I',
      a: `<p>Both give O(log N) point updates and range queries. A <b>Fenwick tree</b> uses N + 1 cells, about 10 lines, and is faster in practice — but it only answers prefix queries, so range answers need an <b>invertible</b> operation (sum, xor, counts). It is ideal for dynamic sums, inversion counting, order statistics with binary lifting, and range-add/range-sum via two BITs.</p>
        <p>A <b>segment tree</b> handles any associative operation (min, max, gcd, matrix products), custom nodes, lazy range updates of many kinds, and tree descents. Rule: invertible op + simple updates → Fenwick; otherwise → segment tree.</p>`,
      followUps: ['Can a Fenwick tree do prefix max? Under what restriction?', 'Derive the two-BIT formula for range add + range sum.']
    },
    {
      q: 'Why does <code>i &amp; −i</code> give the lowest set bit, and how does a Fenwick tree use it?',
      level: 'I',
      a: `<p>In two's complement, <code>−i = ~i + 1</code>. Inverting flips every bit; adding 1 turns the trailing ones (which were trailing zeros of i) back into zeros and carries into the position of i's lowest set bit, making it 1 again. All bits above it are opposite to i's bits, so the AND keeps only that lowest set bit. Example: 12 = 01100, −12 = …10100, AND = 00100 = 4.</p>
        <p>In a Fenwick tree, <code>tree[i]</code> stores the sum of the last lowbit(i) elements ending at i. A prefix query repeatedly subtracts lowbit (one box per set bit), an update repeatedly adds lowbit (climbing to every box that covers the index). Both take ≤ log₂ N + 1 steps.</p>`,
      followUps: ['What happens if you call prefix with i = 0 in a loop "while (i != 0)" vs 0-based indices?', 'How does binary lifting find the k-th element?']
    },
    {
      q: 'Prove that a segment tree range query runs in O(log N).',
      level: 'A',
      a: `<p>Claim: on each level at most two visited nodes are partially overlapping. A partial node must contain one of the query boundaries <code>ql</code> or <code>qr</code> strictly inside it — otherwise it would be either disjoint or fully covered. Nodes on the same level have disjoint ranges, so at most one contains <code>ql</code> and at most one contains <code>qr</code>.</p>
        <p>Only partial nodes recurse, each into 2 children, so at most 4 nodes are visited per level. The height is ⌈log₂ N⌉, giving at most about 4·log₂ N + 1 visits. Fully covered nodes return immediately, disjoint ones return the identity. The same argument bounds range updates with lazy propagation.</p>`,
      followUps: ['Does the same bound hold for the iterative bottom-up tree?', 'How many nodes does a point update touch?']
    },
    {
      q: 'Why do recursive segment trees use an array of size 4N?',
      level: 'A',
      a: `<p>With root 1 and children 2k, 2k + 1, a node at depth d has index below 2<sup>d+1</sup>. The tree's depth is ⌈log₂ N⌉ because each level halves the range. So all indices are below 2<sup>⌈log₂ N⌉+1</sup>, and since 2<sup>⌈log₂ N⌉</sup> &lt; 2N, that bound is below 4N.</p>
        <p>Only 2N − 1 nodes really exist, but for N that is not a power of two the numbering leaves holes (for N = 6 the largest index is 13). The iterative bottom-up layout stores leaves at [N, 2N) and needs exactly 2N, and a dynamic tree with explicit child indices needs 2N − 1 nodes allocated on demand.</p>`,
      followUps: ['When is 2·(next power of two) the tighter choice?', 'How does the bottom-up tree handle non-commutative merges?']
    },
    {
      q: 'A sparse table answers RMQ in O(1). Why only for some operations, and what are its costs?',
      level: 'I',
      a: `<p><code>st[k][i]</code> stores the answer for a[i .. i + 2<sup>k</sup> − 1]. A query [l, r] takes k = ⌊log₂(len)⌋ and combines the window starting at l with the window ending at r. These two windows overlap, so the operation must be <b>idempotent</b> (x ⊕ x = x): min, max, gcd, bitwise and/or. For sums, xor or products the overlap double counts; you can still split the length into disjoint powers of two for O(log N), or use a disjoint sparse table.</p>
        <p>Costs: O(N log N) time and memory to build (80 MB for 10<sup>6</sup> ints × 20 levels) and <b>no updates</b> — any change means rebuilding.</p>`,
      followUps: ['How would you get O(N) memory with O(1) queries?', 'Use RMQ to answer LCA queries.']
    },
    {
      q: 'Explain Mo\'s algorithm and its complexity. How do you choose the block size?',
      level: 'A',
      a: `<p>Mo's algorithm answers offline range queries on a static array when you can add or remove one element from a window in O(1). Sort queries by (⌊l/B⌋, r) and move a window [curL, curR] from one query to the next with add/remove calls, storing answers by original index.</p>
        <p>Within a block, r increases monotonically: ≤ N moves per block, N/B blocks → N²/B. The left pointer moves ≤ B per query → Q·B. Total O(Q·B + N²/B), minimized at B = N/√Q, giving O(N√Q) (≈ O((N + Q)√N) when N ≈ Q). Practical tweaks: odd-even ordering of r, Hilbert order, compressed values in plain arrays, grow before shrink.</p>`,
      followUps: ['How do you support updates (Mo with time)?', 'When is an offline BIT sweep better than Mo?']
    },
    {
      q: 'Design a segment tree that supports range assign, range add and range sum. What are the tag rules?',
      level: 'A',
      a: `<p>Each node keeps <code>sum</code> and a tag pair <code>(hasSet, setVal, add)</code> meaning "first assign setVal to every element (if hasSet), then add add". Applying to a node of length len: assign x → sum = x·len, tag = (true, x, 0); add v → sum += v·len, tag.add += v (a pending set stays).</p>
        <p>Composition order is the crux: a newer assign wipes everything older; a newer add stacks on top. When pushing, apply the set to the children first, then the add. Use a separate boolean (not 0) for "no assignment" because 0 can be a real value, and long for x·len. Everything remains O(log N) per operation.</p>`,
      followUps: ['Add range min queries — what changes?', 'Generalize to affine tags (multiply then add) modulo p.']
    },
    {
      q: 'How would you answer "k-th smallest value in a[l..r]" online, with up to 10<sup>5</sup> queries?',
      level: 'E',
      a: `<p>Compress values to ranks. Build a <b>persistent segment tree</b> over ranks: version i is version i − 1 plus one insertion of rank(a[i]), sharing all untouched nodes, so each version costs O(log N) new nodes (O(N log N) total). The counts of values inside a[l..r] for any value range are <code>count(version r) − count(version l − 1)</code>.</p>
        <p>To find the k-th smallest, walk both versions down in parallel: if the left child difference ≥ k go left, else subtract it and go right — O(log N) per query, fully online. Alternatives: a wavelet tree (O(log σ)), or offline parallel binary search; the merge-sort tree gives O(log³ N) with binary search over answers.</p>`,
      followUps: ['How much memory does the persistent tree use for N = 10<sup>5</sup>?', 'Can you support point updates as well? (BIT of persistent trees / sqrt)']
    },
    {
      q: 'Some range updates cannot be done lazily, e.g. "replace every a[i] in [l, r] by ⌊√a[i]⌋". How do you handle them?',
      level: 'E',
      a: `<p>Lazy propagation needs the node's new aggregate to be computable from the tag alone; the sum of square roots is not a function of the old sum. Instead use an <b>amortized</b> argument: any value ≤ 10<sup>18</sup> becomes 1 after about 6 square roots, and 1 stays 1. So store sum and max per node; on update, stop at nodes whose max ≤ 1 (nothing changes), otherwise recurse to the leaves.</p>
        <p>Each element is touched O(log log V) times overall, so the total is O((N log log V + Q) log N). The same idea handles "a[i] mod x" (a value at least halves whenever the mod changes it). For range chmin/chmax with sum queries, <b>Segment Tree Beats</b> keeps max, second max and the max count to apply updates lazily when possible.</p>`,
      followUps: ['Prove the mod-x amortization bound.', 'What does Segment Tree Beats store per node and why?']
    },
    {
      q: 'Coordinates go up to 10<sup>9</sup>. How do you still use a Fenwick or segment tree?',
      level: 'A',
      a: `<p>If all coordinates are known in advance (offline), <b>coordinate compression</b>: collect them, sort, deduplicate, and map each to its rank 0..K−1 with binary search or a hash map. Then the tree has size K ≤ number of distinct coordinates. Careful with queries whose bounds are not present — use lower/upper bound to convert them to rank ranges.</p>
        <p>If coordinates arrive online, use a <b>dynamic (implicit) segment tree</b> that allocates children only when touched (O(Q log C) nodes for C = 10<sup>9</sup>), or an ordered map-based structure. For interval problems, remember that compressing only endpoints can lose the gaps between them; add r + 1 points or work with half-open intervals.</p>`,
      followUps: ['How many nodes does a dynamic tree create for Q = 10<sup>5</sup>, C = 10<sup>9</sup>?', 'Show a bug caused by compressing interval endpoints only.']
    },
    {
      q: 'Where do range-aggregate ideas appear in real systems?',
      level: 'E',
      a: `<p>Monitoring and time-series systems pre-aggregate metrics into rollups at several granularities (minute, hour, day) so dashboards can answer "max latency over the last week" without scanning raw points — the same "precompute blocks, combine a few" idea as sparse tables and segment trees. Columnar databases keep per-block min/max statistics (zone maps) to skip whole blocks during scans, which is sqrt-decomposition thinking.</p>
        <p>Order-statistic and aggregate B-trees store subtree counts or sums in internal nodes, supporting "rank of a key" or "sum over a key range" in O(log N). Schedulers and allocators keep trees of free capacity to find "first slot with enough room" by descent, like the Hotel Queries problem. In-memory interview trees are the clean version; production versions add concurrency control, persistence and cache-aware layouts.</p>`,
      followUps: ['How would you make a range-sum structure safe for concurrent writers?', 'Why do databases prefer B-trees over binary segment trees?']
    },
    {
      q: 'You wrote a segment tree in an interview and one test fails. How do you debug it quickly?',
      level: 'I',
      a: `<p>First shrink the failing case: N = 1, 2, 3 and a single query often reproduce it. Then check the usual suspects in order: identity value for disjoint nodes (0 vs +∞), boundary conditions (<code>qr &lt; l || r &lt; ql</code>), mid split consistency between build/update/query, array size (4N), overflow (long), and — for lazy trees — a missing push in the query or the wrong tag composition order.</p>
        <p>The most reliable method is a 5-minute <b>stress test</b>: an O(N) brute force and a random generator with tiny sizes and small values, comparing results after every operation and printing the first mismatch. Narrate this plan to the interviewer; systematic debugging is part of the evaluation, especially when AI tools write the first draft.</p>`,
      followUps: ['Which random sizes catch the most bugs?', 'How would you print the tree compactly to inspect it?']
    },
    {
      q: 'Count distinct values in a[l..r]: compare the offline and online solutions.',
      level: 'A',
      a: `<p><b>Offline</b>: (1) Mo's algorithm with a frequency array — O((N + Q)√N), simple and general. (2) Better: sort queries by r and sweep i from left to right, keeping a 1 in a Fenwick tree only at the <i>last occurrence</i> of each value; a query (l, r) with r = i is answered by the sum over [l, r] — O((N + Q) log N).</p>
        <p><b>Online</b>: define next[i] = next index with the same value (or N). The number of distinct values in [l, r] equals the number of i in [l, r] with next[i] &gt; r — a 2D dominance count, answered online with a persistent segment tree or a merge-sort tree in O(log N) or O(log² N). With updates, sqrt decomposition or a BIT of ordered sets is needed.</p>`,
      followUps: ['Why does keeping only last occurrences work?', 'Add point updates to the online version — what is the complexity?']
    }
  );

  registerModule({
    id: 'dsa21',
    title: 'Range Query Data Structures',
    intro: `<p>So far, "sum of a[l..r]" was easy: build prefix sums once and subtract. Real problems are rarely that polite. Prices change while people ask for the cheapest day in a range. Bonuses are added to whole ranges of employees. Someone asks how many <i>different</i> values sit between two positions. Done naively, each request costs O(N), and with N, Q = 2·10<sup>5</sup> that is 4·10<sup>10</sup> steps, far over any time limit.</p>
      <p>This module is your toolbox for those situations. It covers the <b>segment tree</b> (the all-rounder) with <b>lazy propagation</b> for range updates, the tiny and fast <b>Fenwick tree</b>, the O(1)-query <b>sparse table</b> for static data, <b>sqrt decomposition</b> for awkward queries, and <b>Mo's algorithm</b> for offline questions that cannot be merged. The last topic ties them together in a <b>decision guide</b>, so you can pick the lightest correct tool from the wording of a problem. That choice is what interviewers grade, especially now that AI can type any of these structures for you.</p>
      <p>Every topic starts with an everyday analogy, then gives the mechanics with step-by-step visualizers (tree nodes labelled with their ranges, Fenwick bit jumps, the sparse-table grid, sliding Mo windows), worked examples, a deep dive into proofs and performance, and a section on working alongside AI.</p>`,
    goals: [
      'Build, update and query a segment tree (recursive and iterative) and prove its O(log N) bounds',
      'Design lazy tags for range add / assign / affine updates and state the lazy-propagation invariant',
      'Implement a Fenwick tree from the <code>i &amp; −i</code> trick and use it for inversions, k-th element, range-add + range-sum and 2D sums',
      'Answer static RMQ / GCD queries in O(1) with a sparse table and explain why sums need a different trick',
      'Use √N blocks and Mo\'s algorithm for queries that segment trees handle badly (counts ≤ x with updates, distinct values)',
      'Choose the lightest correct structure from the constraints (static or dynamic, invertible or idempotent, online or offline) and justify it with an operation-count estimate'
    ],
    prereqs: `<p>DSA 5 (Arrays &amp; Prefix Sums), DSA 4 (Bit Manipulation, for <code>i &amp; −i</code>), DSA 10 (Binary Search), DSA 11 (Recursion), DSA 14 (Trees) and DSA 15 (Heaps, for array-based trees). It also helps to be comfortable with Big-O estimates from DSA 2.</p>`,
    hours: 16,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
