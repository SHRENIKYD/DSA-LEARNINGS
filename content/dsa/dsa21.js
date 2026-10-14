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
          <p>Update a[5] = 10: the leaf becomes 10, [4,5] becomes min(7, 10) = 7, [4,7] = min(7, 2) = 2, root unchanged = 1. Query again: min(5, 7, 8) = <b>5</b>. Exactly the pattern of the iterative <code>MinSegTree</code> above.</p>`,
        code: `MinSegTree st = new MinSegTree(new int[]{4, 6, 1, 5, 7, 3, 8, 2});
System.out.println(st.query(3, 6)); // 3
st.set(5, 10);
System.out.println(st.query(3, 6)); // 5`
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

registerModule({ id: 'dsa21', title: 'Range Query Data Structures', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
