(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // ---------- small shared helpers for the visualizers ----------
  function parseNums(input, minN, maxN, lo, hi, what) {
    var s = String(input === undefined ? '' : input).trim();
    if (!s) throw new Error('Please type some whole numbers separated by spaces, e.g. 3 1 5 8');
    var a = s.split(/[\s,]+/).map(Number);
    if (a.some(function (x) { return !Number.isInteger(x); })) throw new Error('Only whole numbers please (separated by spaces) for ' + (what || 'the list'));
    if (a.length < minN) throw new Error('Need at least ' + minN + ' numbers for ' + (what || 'the list'));
    if (a.length > maxN) throw new Error('Keep it small: at most ' + maxN + ' numbers for ' + (what || 'the list') + ' so the picture fits');
    if (a.some(function (x) { return x < lo || x > hi; })) throw new Error('Numbers for ' + (what || 'the list') + ' must be between ' + lo + ' and ' + hi);
    return a;
  }
  function one(k, v) { var o = {}; o[k] = v; return o; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function cleanWord(s, maxLen, what) {
    s = String(s === undefined ? '' : s).trim();
    if (!s) throw new Error('Please type ' + what);
    if (!/^[a-z]+$/.test(s)) throw new Error('Use only lowercase letters a-z for ' + what);
    if (s.length > maxLen) throw new Error('Keep ' + what + ' at most ' + maxLen + ' letters so the picture fits');
    return s;
  }
  // Tree input in "heap layout": children of index i are 2i+1 and 2i+2; null = no node
  function parseTree(input) {
    var s = String(input === undefined ? '' : input).trim();
    if (!s) throw new Error('Type the tree level by level, e.g. 3 2 3 null 3 null 1');
    var toks = s.split(/[\s,]+/);
    if (toks.length > 15) throw new Error('At most 15 slots (4 levels) so the tree fits');
    var arr = toks.map(function (t) {
      if (/^(null|x|-)$/i.test(t)) return null;
      var v = Number(t);
      if (!Number.isInteger(v) || Math.abs(v) > 999) throw new Error('Each slot must be an integer (|v| ≤ 999) or null');
      return v;
    });
    if (arr[0] === null) throw new Error('The root (first slot) cannot be null');
    for (var i = 1; i < arr.length; i++) {
      if (arr[i] !== null && arr[(i - 1) >> 1] === null) throw new Error('Slot ' + i + ' has a value but its parent slot ' + ((i - 1) >> 1) + ' is null');
    }
    return arr;
  }
  function postOrder(arr) {
    var order = [];
    (function go(i) {
      if (i >= arr.length || arr[i] === null) return;
      go(2 * i + 1); go(2 * i + 2); order.push(i);
    })(0);
    return order;
  }

  // ================= TOPIC 1: LIS =================
  topics.push({
    title: 'Longest Increasing Subsequence: O(N²) DP and the O(N log N) “tails” trick',
    analogy: `<p>Think of the card game <b>Patience</b>. You deal cards one at a time. Each card goes on the <b>leftmost pile whose top card is bigger or equal</b>; if no pile fits, you start a new pile on the right. When the deck is finished, the <b>number of piles</b> equals the length of the longest increasing run you could have picked out of the deck (keeping the deal order).</p>
      <p>Another picture: you walk past a line of people and want to pick a team where everyone you pick is <b>taller than the person picked before</b>. You may skip people, but you cannot reorder them. How big can the team get?</p>`,
    explain: `<p><b>Subsequence vs subarray.</b> A <b>subarray</b> is a solid block (no gaps). A <b>subsequence</b> keeps the order but may <b>skip</b> elements. In <code>[10, 9, 2, 5, 3, 7, 101, 18]</code> the subsequence <code>2, 3, 7, 18</code> is increasing and has length 4 — no longer one exists.</p>
      ${H.arr([10, 9, 2, 5, 3, 7, 101, 18], { label: 'nums', hl: { 2: 'g', 4: 'g', 5: 'g', 7: 'g' } })}
      <h4>Way 1 — O(N²): “best run that ENDS here”</h4>
      <p>Define <code>dp[i]</code> = length of the longest increasing subsequence that <b>ends exactly at index i</b>. Every element alone is a run of length 1. To extend, look back at every earlier <code>j</code> with a <b>smaller</b> value and take the best:</p>
      <p><code>dp[i] = 1 + max(dp[j])</code> over all <code>j &lt; i</code> with <code>nums[j] &lt; nums[i]</code> (or just 1 if none). The answer is the <b>max of all dp[i]</b> — not dp[n-1], because the best run can end anywhere.</p>
      ${H.table(['i', 'nums[i]', 'smaller values before it', 'dp[i]'], [
        ['0', '10', '—', '1'], ['1', '9', '—', '1'], ['2', '2', '—', '1'], ['3', '5', '2 (dp 1)', '2'], ['4', '3', '2 (dp 1)', '2'],
        ['5', '7', '2, 5, 3 (best dp 2)', '3'], ['6', '101', 'every earlier value (best dp 3, from 7)', '4'], ['7', '18', '10, 9, 2, 5, 3, 7 (best dp 3)', H.c('g', '4')]
      ])}
      <h4>Way 2 — O(N log N): keep the smallest possible “tail” for each length</h4>
      <p>Keep a list <code>tails</code> where <code>tails[k]</code> = the <b>smallest last value</b> of any increasing subsequence of length <code>k+1</code> seen so far. A small tail is good: it leaves the most room to grow. For each new number <code>x</code>:</p>
      <ul>
        <li>If <code>x</code> is bigger than every tail → <b>append</b> it (we found a longer run).</li>
        <li>Otherwise find the <b>first tail ≥ x</b> (lower bound) and <b>replace</b> it with <code>x</code> (same length, cheaper ending).</li>
      </ul>
      <p><code>tails</code> is always sorted, so “find the first tail ≥ x” is a <b>binary search</b>. N numbers × log N search = <b>O(N log N)</b>. The final length of <code>tails</code> is the LIS length.</p>
      ${H.table(['x', 'tails after', 'what happened'], [
        ['10', '[10]', 'append'], ['9', '[9]', 'replace 10 (cheaper length-1 ending)'], ['2', '[2]', 'replace 9'], ['5', '[2, 5]', 'append'],
        ['3', '[2, 3]', 'replace 5'], ['7', '[2, 3, 7]', 'append'], ['101', '[2, 3, 7, 101]', 'append'], ['18', '[2, 3, 7, ' + H.c('g', '18') + ']', 'replace 101 → length ' + H.c('g', '4')]
      ])}
      <p><b>Watch out:</b> <code>tails</code> is <b>not</b> the actual subsequence. It only has the right <b>length</b>. To rebuild the real LIS, store for every index which earlier index it extended (a <code>parent</code> array).</p>
      <p><b>Strict vs non-strict:</b> “strictly increasing” → lower bound (first tail ≥ x). “Non-decreasing” (equal allowed) → upper bound (first tail &gt; x).</p>`,
    clues: [
      '"<b>longest increasing / strictly increasing subsequence</b>" or "you may delete some elements but keep the order" → LIS.',
      '"Minimum number of elements to <b>remove</b> so the array becomes sorted" → N − LIS.',
      '"Nest / stack items where both width and height must grow" (envelopes, boxes, people on shoulders) → sort by one key, LIS on the other.',
      'N ≤ 2,500 → O(N²) dp is fine; N ≤ 10<sup>5</sup> → you need the O(N log N) tails + binary search version.',
      '"<b>Number of</b> longest increasing subsequences" → O(N²) dp with a second <code>count[]</code> array (or a Fenwick tree).',
      '"Minimum number of strictly decreasing piles / chains to cover everything" → equals LIS length (Dilworth / patience sorting).'
    ],
    code: [{ lang: 'java', code: `
      // O(N^2) LIS that also rebuilds one actual longest subsequence.
      static List<Integer> lisQuadratic(int[] a) {
          int n = a.length;
          if (n == 0) return new ArrayList<>();
          int[] dp = new int[n];       // dp[i] = LIS length ending exactly at i
          int[] parent = new int[n];   // parent[i] = previous index in that best run (-1 = none)
          int bestEnd = 0;
          for (int i = 0; i < n; i++) {
              dp[i] = 1;               // the element alone
              parent[i] = -1;
              for (int j = 0; j < i; j++) {
                  // extend a run that ends at j, only if it stays strictly increasing
                  if (a[j] < a[i] && dp[j] + 1 > dp[i]) {
                      dp[i] = dp[j] + 1;
                      parent[i] = j;
                  }
              }
              if (dp[i] > dp[bestEnd]) bestEnd = i;   // the best run may end anywhere
          }
          LinkedList<Integer> seq = new LinkedList<>();
          for (int k = bestEnd; k != -1; k = parent[k]) seq.addFirst(a[k]);  // walk back
          return seq;
      }`, alt: [{ lang: 'python', code: `def lis_quadratic(a):
    # O(N^2) LIS that also rebuilds one actual longest subsequence.
    n = len(a)
    if n == 0:
        return []
    dp = [1] * n                 # dp[i] = LIS length ending exactly at i
    parent = [-1] * n            # previous index in that best run
    best_end = 0
    for i in range(n):
        for j in range(i):
            if a[j] < a[i] and dp[j] + 1 > dp[i]:   # extend a run ending at j
                dp[i], parent[i] = dp[j] + 1, j
        if dp[i] > dp[best_end]:
            best_end = i         # the best run may end anywhere
    seq, k = [], best_end
    while k != -1:               # walk back through the parents
        seq.append(a[k])
        k = parent[k]
    return seq[::-1]` }, { lang: 'js', code: `// O(N^2) LIS that also rebuilds one actual longest subsequence.
function lisQuadratic(a) {
  const n = a.length;
  if (n === 0) return [];
  const dp = new Array(n).fill(1);       // dp[i] = LIS length ending exactly at i
  const parent = new Array(n).fill(-1);  // previous index in that best run
  let bestEnd = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (a[j] < a[i] && dp[j] + 1 > dp[i]) { dp[i] = dp[j] + 1; parent[i] = j; }
    }
    if (dp[i] > dp[bestEnd]) bestEnd = i;  // the best run may end anywhere
  }
  const seq = [];
  for (let k = bestEnd; k !== -1; k = parent[k]) seq.push(a[k]);   // walk back
  return seq.reverse();
}` }, { lang: 'cpp', code: `// O(N^2) LIS that also rebuilds one actual longest subsequence.
vector<int> lisQuadratic(const vector<int>& a) {
    int n = a.size();
    if (n == 0) return {};
    vector<int> dp(n, 1), parent(n, -1);   // dp[i] = LIS length ending exactly at i
    int bestEnd = 0;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < i; j++)
            if (a[j] < a[i] && dp[j] + 1 > dp[i]) { dp[i] = dp[j] + 1; parent[i] = j; }
        if (dp[i] > dp[bestEnd]) bestEnd = i;  // the best run may end anywhere
    }
    vector<int> seq;
    for (int k = bestEnd; k != -1; k = parent[k]) seq.push_back(a[k]);   // walk back
    reverse(seq.begin(), seq.end());
    return seq;
}` }] }, { lang: 'java', code: `
      // O(N log N) LIS with reconstruction: tailIdx[k] = index of smallest tail for length k+1.
      static List<Integer> lisFast(int[] a) {
          int n = a.length;
          int[] tailIdx = new int[n];
          int[] parent = new int[n];
          int len = 0;
          for (int i = 0; i < n; i++) {
              // lower bound: first position whose tail value is >= a[i]
              int lo = 0, hi = len;
              while (lo < hi) {
                  int mid = (lo + hi) >>> 1;
                  if (a[tailIdx[mid]] < a[i]) lo = mid + 1; else hi = mid;
              }
              parent[i] = lo > 0 ? tailIdx[lo - 1] : -1;   // we extend the run of length lo
              tailIdx[lo] = i;                             // replace or append
              if (lo == len) len++;
          }
          LinkedList<Integer> seq = new LinkedList<>();
          for (int k = len == 0 ? -1 : tailIdx[len - 1]; k != -1; k = parent[k]) seq.addFirst(a[k]);
          return seq;
      }`, alt: [{ lang: 'python', code: `def lis_fast(a):
    # O(N log N) LIS with reconstruction: tail_idx[k] = index of the smallest tail for length k+1.
    tail_idx, parent = [], [-1] * len(a)
    for i, x in enumerate(a):
        lo, hi = 0, len(tail_idx)
        while lo < hi:                       # lower bound: first tail value >= x
            mid = (lo + hi) // 2
            if a[tail_idx[mid]] < x:
                lo = mid + 1
            else:
                hi = mid
        parent[i] = tail_idx[lo - 1] if lo > 0 else -1   # we extend the run of length lo
        if lo == len(tail_idx):
            tail_idx.append(i)               # append
        else:
            tail_idx[lo] = i                 # replace
    seq, k = [], tail_idx[-1] if tail_idx else -1
    while k != -1:
        seq.append(a[k])
        k = parent[k]
    return seq[::-1]` }, { lang: 'js', code: `// O(N log N) LIS with reconstruction: tailIdx[k] = index of the smallest tail for length k+1.
function lisFast(a) {
  const tailIdx = [], parent = new Array(a.length).fill(-1);
  a.forEach((x, i) => {
    let lo = 0, hi = tailIdx.length;
    while (lo < hi) {                    // lower bound: first tail value >= x
      const mid = (lo + hi) >> 1;
      if (a[tailIdx[mid]] < x) lo = mid + 1; else hi = mid;
    }
    parent[i] = lo > 0 ? tailIdx[lo - 1] : -1;   // we extend the run of length lo
    tailIdx[lo] = i;                             // replace or append
  });
  const seq = [];
  for (let k = tailIdx.length ? tailIdx[tailIdx.length - 1] : -1; k !== -1; k = parent[k]) seq.push(a[k]);
  return seq.reverse();
}` }, { lang: 'cpp', code: `// O(N log N) LIS with reconstruction: tailIdx[k] = index of the smallest tail for length k+1.
vector<int> lisFast(const vector<int>& a) {
    vector<int> tailIdx, parent(a.size(), -1);
    for (int i = 0; i < (int)a.size(); i++) {
        // lower bound over tail VALUES: first position whose tail is >= a[i]
        auto it = lower_bound(tailIdx.begin(), tailIdx.end(), a[i], [&](int idx, int x) { return a[idx] < x; });
        int lo = it - tailIdx.begin();
        parent[i] = lo > 0 ? tailIdx[lo - 1] : -1;  // we extend the run of length lo
        if (it == tailIdx.end()) tailIdx.push_back(i); else *it = i;
    }
    vector<int> seq;
    for (int k = tailIdx.empty() ? -1 : tailIdx.back(); k != -1; k = parent[k]) seq.push_back(a[k]);
    reverse(seq.begin(), seq.end());
    return seq;
}` }] }, { lang: 'python', run: true, title: 'Both versions in Python (runnable)', code: `from bisect import bisect_left

def lis_quadratic(a):
    dp = [1] * len(a)                      # dp[i] = best run ending at i
    for i in range(len(a)):
        for j in range(i):
            if a[j] < a[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp, default=0)

def lis_fast(a):
    tails = []                             # tails[k] = smallest tail of a run of length k+1
    for x in a:
        k = bisect_left(tails, x)          # first tail >= x (strictly increasing)
        if k == len(tails):
            tails.append(x)                # longer run found
        else:
            tails[k] = x                   # same length, cheaper ending
    return len(tails)

for arr in ([10, 9, 2, 5, 3, 7, 101, 18], [0, 1, 0, 3, 2, 3], [7, 7, 7, 7], []):
    print(arr, lis_quadratic(arr), lis_fast(arr))
` }],
    codeTitle: ['O(N²) with reconstruction', 'O(N log N) with reconstruction', 'Python, runnable'],
    viz: [{
      title: 'Patience / tails: watch the binary search decide append vs replace',
      input: '10 9 2 5 3 7 101 18',
      inputLabel: 'Array (space separated, up to 14 numbers)',
      gen: function (input) {
        var a = parseNums(input, 1, 14, -999, 999, 'the array');
        var frames = [], tailIdx = [], parent = [];
        var tailsVals = function () { return tailIdx.map(function (k) { return a[k]; }); };
        frames.push({ narr: 'Start: <b>tails</b> is empty. tails[k] will hold the <b>smallest possible last value</b> of an increasing run of length k+1. Small tails are good — they are easier to extend later.', parts: [
          { type: 'array', label: 'input', values: a.slice(), showIdx: true },
          { type: 'text', label: 'tails', html: '<i>(empty)</i>' },
          { type: 'vars', label: 'state', vals: { 'LIS length': 0 } }
        ] });
        for (var i = 0; i < a.length; i++) {
          var lo = 0, hi = tailIdx.length, steps = [];
          while (lo < hi) {
            var mid = (lo + hi) >> 1;
            steps.push('tails[' + mid + ']=' + a[tailIdx[mid]] + (a[tailIdx[mid]] < a[i] ? ' &lt; ' : ' ≥ ') + a[i]);
            if (a[tailIdx[mid]] < a[i]) lo = mid + 1; else hi = mid;
          }
          var append = lo === tailIdx.length, old = append ? null : a[tailIdx[lo]];
          parent[i] = lo > 0 ? tailIdx[lo - 1] : -1;
          tailIdx[lo] = i;
          var hl = one(lo, append ? 'ok' : 'cur');
          frames.push({
            narr: 'x = <b>' + a[i] + '</b>. Binary search for the first tail ≥ ' + a[i] + (steps.length ? ' (' + steps.join('; ') + ')' : ' (list empty)') + ' → position <b>' + lo + '</b>. ' +
              (append ? '<span class="c-g">Bigger than every tail → APPEND. We now have a run of length ' + tailIdx.length + '.</span>'
                : '<span class="c-y">Replace ' + old + ' with ' + a[i] + ': a run of length ' + (lo + 1) + ' can now end with a smaller value, which is never worse.</span>'),
            parts: [
              { type: 'array', label: 'input', values: a.slice(), showIdx: true, ptr: one(i, 'x'), hl: one(i, 'cur') },
              { type: 'array', label: 'tails (sorted!)', values: tailsVals(), hl: hl, ptr: one(lo, append ? 'new' : 'pos') },
              { type: 'vars', label: 'state', vals: { x: a[i], position: lo, 'LIS length': tailIdx.length }, hl: { position: append ? 'ok' : 'cur' } }
            ]
          });
        }
        var seqIdx = [];
        for (var k = tailIdx[tailIdx.length - 1]; k !== -1; k = parent[k]) seqIdx.unshift(k);
        var hlSel = {};
        seqIdx.forEach(function (k) { hlSel[k] = 'sel'; });
        frames.push({ narr: 'Done. LIS length = <b>' + tailIdx.length + '</b>. Following the parent links back from the last tail gives one real LIS: <b>' + seqIdx.map(function (k) { return a[k]; }).join(', ') + '</b>. (The tails list itself, ' + tailsVals().join(', ') + ', is only guaranteed to have the right LENGTH.)', parts: [
          { type: 'array', label: 'input (purple = one LIS)', values: a.slice(), showIdx: true, hl: hlSel },
          { type: 'array', label: 'final tails', values: tailsVals(), hl: one(tailIdx.length - 1, 'sel') },
          { type: 'vars', label: 'answer', vals: { 'LIS length': tailIdx.length }, hl: { 'LIS length': 'sel' } }
        ] });
        return frames;
      }
    }, {
      title: 'O(N²) dp: every index asks “which smaller earlier element gives me the best run?”',
      input: '0 8 4 12 2 10 6 14',
      inputLabel: 'Array (space separated, up to 12 numbers)',
      gen: function (input) {
        var a = parseNums(input, 1, 12, -999, 999, 'the array');
        var n = a.length, dp = [], par = [], frames = [];
        frames.push({ narr: 'dp[i] = length of the best increasing run that <b>ends exactly at i</b>. Each element alone is a run of length 1.', parts: [
          { type: 'array', label: 'nums', values: a.slice(), showIdx: true },
          { type: 'text', label: 'dp', html: '<i>not computed yet</i>' }
        ] });
        for (var i = 0; i < n; i++) {
          dp[i] = 1; par[i] = -1;
          var hl = {}, cand = [];
          for (var j = 0; j < i; j++) {
            if (a[j] < a[i]) { hl[j] = 'win'; cand.push(a[j] + '→dp ' + dp[j]); if (dp[j] + 1 > dp[i]) { dp[i] = dp[j] + 1; par[i] = j; } }
          }
          if (par[i] >= 0) hl[par[i]] = 'sel';
          hl[i] = 'cur';
          var dhl = {}; dhl[i] = 'ok'; if (par[i] >= 0) dhl[par[i]] = 'sel';
          frames.push({
            narr: 'i = ' + i + ' (value ' + a[i] + '). Smaller values before it (blue): ' + (cand.length ? cand.join(', ') : '<i>none</i>') + '. ' +
              (par[i] >= 0 ? 'Best is index ' + par[i] + ' (purple) → dp[' + i + '] = ' + dp[par[i]] + ' + 1 = <b>' + dp[i] + '</b>.' : 'Nothing to extend → dp[' + i + '] = <b>1</b>.'),
            parts: [
              { type: 'array', label: 'nums', values: a.slice(), showIdx: true, hl: hl, ptr: one(i, 'i') },
              { type: 'bars', label: 'dp so far', values: dp.slice(), hl: dhl, texts: dp.map(String) }
            ]
          });
        }
        var best = 0;
        for (var t = 1; t < n; t++) if (dp[t] > dp[best]) best = t;
        var path = [], hs = {};
        for (var k = best; k !== -1; k = par[k]) { path.unshift(a[k]); hs[k] = 'sel'; }
        frames.push({ narr: 'Answer = <b>max(dp) = ' + dp[best] + '</b> (ends at index ' + best + '). Following parents: ' + path.join(' → ') + '. Notice the answer is NOT necessarily dp[n−1].', parts: [
          { type: 'array', label: 'nums', values: a.slice(), showIdx: true, hl: hs },
          { type: 'bars', label: 'dp', values: dp.slice(), hl: one(best, 'sel'), texts: dp.map(String) }
        ] });
        return frames;
      }
    }],
    examples: [
      {
        title: 'Why “replace” never hurts: [3, 4, 1, 2, 5, 6]',
        html: `${H.table(['x', 'tails', 'note'], [['3', '[3]', 'append'], ['4', '[3, 4]', 'append'], ['1', '[1, 4]', 'replace 3 — the run [3,4] still exists in our memory as “length 2 ends at 4”'], ['2', '[1, 2]', 'replace 4 — now length 2 can end at 2 (run [1,2])'], ['5', '[1, 2, 5]', 'append'], ['6', '[1, 2, 5, 6]', 'append → ' + H.c('g', '4')]])}
          <p>Midway, tails was <code>[1, 4]</code> — that is <b>not</b> a real subsequence (1 comes after 4). It does not matter: each slot is a fact about “some run of this length can end with this value”. Answer 4 (e.g. 3, 4, 5, 6 or 1, 2, 5, 6).</p>`
      },
      {
        title: 'Strict vs non-decreasing: [1, 3, 3, 2, 3]',
        html: `<p><b>Strict</b> (lower bound): tails [1] → [1,3] → [1,3] (3 replaces 3) → [1,2] → [1,2,3] → length ${H.c('g', '3')} (1, 2, 3).</p>
          <p><b>Non-decreasing</b> (upper bound = first tail <b>&gt;</b> x): [1] → [1,3] → [1,3,3] → [1,2,3] → [1,2,3,3] → length ${H.c('g', '4')} (1, 3, 3, 3). Change one comparison and the meaning flips — say which one you need out loud in an interview.</p>`,
        code: { lang: 'java', code: `// non-decreasing LIS: the only change is "<=" (upper bound: first tail STRICTLY greater than x)
static int longestNonDecreasing(int[] a) {
    int[] tails = new int[a.length];
    int len = 0;
    for (int x : a) {
        int lo = 0, hi = len;
        while (lo < hi) { int mid = (lo + hi) >>> 1; if (tails[mid] <= x) lo = mid + 1; else hi = mid; }
        tails[lo] = x;
        if (lo == len) len++;
    }
    return len;   // [1, 3, 3, 2, 3] -> 4
}`, alt: [{ lang: 'python', code: `from bisect import bisect_right

def longest_non_decreasing(a):
    # the only change from strict LIS: bisect_right (first tail STRICTLY greater than x)
    tails = []
    for x in a:
        k = bisect_right(tails, x)
        if k == len(tails):
            tails.append(x)
        else:
            tails[k] = x
    return len(tails)   # [1, 3, 3, 2, 3] -> 4` }, { lang: 'js', code: `// non-decreasing LIS: the only change is "<=" (upper bound: first tail STRICTLY greater than x)
function longestNonDecreasing(a) {
  const tails = [];
  for (const x of a) {
    let lo = 0, hi = tails.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (tails[mid] <= x) lo = mid + 1; else hi = mid; }
    tails[lo] = x;
  }
  return tails.length;   // [1, 3, 3, 2, 3] -> 4
}` }, { lang: 'cpp', code: `// non-decreasing LIS: the only change is upper_bound (first tail STRICTLY greater than x)
int longestNonDecreasing(const vector<int>& a) {
    vector<int> tails;
    for (int x : a) {
        auto it = upper_bound(tails.begin(), tails.end(), x);
        if (it == tails.end()) tails.push_back(x); else *it = x;
    }
    return (int)tails.size();   // [1, 3, 3, 2, 3] -> 4
}` }] }
      },
      {
        title: 'Russian Doll Envelopes: 2D LIS with a sorting trick',
        html: `<p>Envelopes (w, h) fit inside each other only if <b>both</b> w and h are strictly bigger. Sort by <b>w ascending</b>, and for equal w by <b>h descending</b>; then run strict LIS on the heights.</p>
          <p>Example: (5,4), (6,4), (6,7), (2,3) → sorted (2,3), (5,4), (6,7), (6,4) → heights [3, 4, 7, 4] → LIS = 3 ((2,3) → (5,4) → (6,7)).</p>
          <p><b>Why h descending for ties?</b> Two envelopes with the same width can never nest. Putting the taller one first makes their heights decreasing, so LIS can never pick both.</p>`
      },
      {
        title: 'Minimum deletions to make the array sorted',
        html: `<p>nums = [5, 1, 6, 2, 7, 3]. Keep the longest increasing subsequence and delete the rest. LIS = 1, 2, 3 or 1, 6, 7 or 5, 6, 7 → length 3. Deletions = 6 − 3 = ${H.c('g', '3')}.</p>
          <p>Same shape: “minimum moves to sort by taking an element and inserting it anywhere” = N − (longest subsequence already in the right relative order).</p>`
      },
      {
        title: 'Counting LIS: carry a count next to every length',
        html: `<p>nums = [1, 3, 5, 4, 7]. Keep <code>len[i]</code> and <code>cnt[i]</code>. When a better length appears, copy the count; when an equal length appears, add the count.</p>
          ${H.table(['i', 'val', 'len', 'cnt'], [['0', '1', '1', '1'], ['1', '3', '2', '1'], ['2', '5', '3', '1'], ['3', '4', '3', '1'], ['4', '7', '4', H.c('g', '2') + ' (via 5 and via 4)']])}
          <p>Answer = sum of cnt over all i with the maximum len = ${H.c('g', '2')}.</p>`
      }
    ],
    deepDive: `<p><b>Why tails stays sorted.</b> Suppose tails[k] ≥ tails[k+1]. The run of length k+2 ending at tails[k+1] has a length-(k+1) prefix ending with a value smaller than tails[k+1] ≤ tails[k] — contradicting that tails[k] is the smallest tail for length k+1. So tails is strictly increasing, and binary search is valid.</p>
      <p><b>Why replacement is safe (exchange argument).</b> Replacing tails[k] by a smaller x keeps every future extension that was possible before still possible (anything bigger than the old tail is also bigger than x). We only ever gain options.</p>
      <p><b>Patience sorting and Dilworth.</b> The number of piles equals the LIS length, and the piles themselves are decreasing sequences. So “minimum number of non-increasing chains that cover the array” = LIS length — the dual form behind questions like “minimum number of increasing groups” after reversing comparisons.</p>
      <p><b>Lower bound.</b> In the comparison model LIS needs Ω(N log N) (Fredman, 1975), so the tails algorithm is optimal. With small integer values, a Fenwick tree over values (best length ending at value ≤ v) also gives O(N log V), and it extends naturally to <b>counting</b> LIS and to weighted versions (“max sum increasing subsequence”) where tails does not work.</p>
      <p><b>Erdős–Szekeres.</b> Any sequence of more than (r−1)(s−1) distinct numbers has an increasing subsequence of length r or a decreasing one of length s. Fun fact for interviews: a random permutation has LIS ≈ 2√N.</p>
      <p><b>Production reality.</b> LIS shows up in diff tools (patience diff in Git matches unique lines, then LIS on their positions), in version reconciliation and in scheduling. Edge cases: empty input (answer 0), all equal (strict → 1), already sorted (N), reverse sorted (1), negative numbers (no change), and duplicates (decide strict vs non-strict).</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant will produce the <code>bisect_left</code> LIS in two seconds — it is one of the most memorised snippets on the internet. What it is bad at is <b>noticing the variant</b>: strict vs non-decreasing, “number of LIS”, 2D nesting with the tie-break, or that you need the actual sequence and not just the length.</p>
      <p><b>Use AI as a partner:</b> <code>Give me 8 inputs where lower_bound and upper_bound LIS give different answers, with expected outputs — do not show code</code>. Or ask it to explain why the envelope tie-break is h descending, then verify with two envelopes of equal width yourself.</p>
      <p><b>Where AI goes wrong:</b> printing <code>tails</code> as if it were the LIS; using Java’s <code>Arrays.binarySearch</code> and forgetting that it returns <code>-(insertion point) - 1</code> for missing keys and an arbitrary match for duplicates (Python’s <code>bisect_left</code> and C++’s <code>lower_bound</code> return the insertion point directly); sorting envelopes by h ascending on ties (wrong answer); returning dp[n−1] instead of max(dp).</p>
      <p><b>What you must still own:</b> spotting “keep order, may skip” in the wording, choosing O(N²) vs O(N log N) from the constraints, and proving the replacement step is safe in two sentences.</p>`,
    problems: [{
      title: 'Longest Increasing Subsequence', level: 'Medium', tags: ['dp', 'binary search', 'LIS'], companies: ['Google', 'Amazon', 'Microsoft', 'Meta'],
      statement: `<p>Given an integer array <code>nums</code>, return the length of the longest <b>strictly increasing subsequence</b>. A subsequence keeps the relative order but may skip elements.</p>`,
      constraints: `1 ≤ nums.length ≤ 2500 (follow-up: 10<sup>5</sup>), −10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup>. Target O(N log N).`,
      example: `${H.arr([0, 1, 0, 3, 2, 3], { label: 'nums', hl: { 0: 'g', 1: 'g', 4: 'g', 5: 'g' } })}<p>Output <b>4</b>: ${H.c('g', '0, 1, 2, 3')} (indices 0, 1, 4, 5). [7,7,7,7] → 1 because equal values are not strictly increasing.</p>`,
      brute: {
        why: `<p>Try every subset of indices (pick / skip each element) and keep the longest increasing one: 2<sup>N</sup> subsets. Already at N = 40 that is 10<sup>12</sup>. The waste: the best run ending at index i is recomputed again and again inside different subsets — classic overlapping subproblems.</p>`,
        code: { lang: 'java', code: `class Brute {
    // pick / skip recursion: prev = index of last picked element (-1 = none yet)
    int best(int[] a, int i, int prev) {
        if (i == a.length) return 0;
        int skip = best(a, i + 1, prev);
        int take = 0;
        if (prev == -1 || a[prev] < a[i]) take = 1 + best(a, i + 1, i);
        return Math.max(skip, take);
    }
    public int lengthOfLIS(int[] nums) { return best(nums, 0, -1); }
}`, alt: [
          { lang: 'python', code: `def length_of_lis(nums):
    # pick / skip recursion: prev = index of last picked element (-1 = none yet)
    def best(i, prev):
        if i == len(nums):
            return 0
        skip = best(i + 1, prev)
        take = 0
        if prev == -1 or nums[prev] < nums[i]:
            take = 1 + best(i + 1, i)
        return max(skip, take)

    return best(0, -1)` },
          { lang: 'js', code: `function lengthOfLIS(nums) {
  // pick / skip recursion: prev = index of last picked element (-1 = none yet)
  function best(i, prev) {
    if (i === nums.length) return 0;
    const skip = best(i + 1, prev);
    let take = 0;
    if (prev === -1 || nums[prev] < nums[i]) take = 1 + best(i + 1, i);
    return Math.max(skip, take);
  }
  return best(0, -1);
}` },
          { lang: 'cpp', code: `class Brute {
    // pick / skip recursion: prev = index of last picked element (-1 = none yet)
    int best(vector<int>& a, int i, int prev) {
        if (i == (int)a.size()) return 0;
        int skip = best(a, i + 1, prev);
        int take = 0;
        if (prev == -1 || a[prev] < a[i]) take = 1 + best(a, i + 1, i);
        return max(skip, take);
    }
public:
    int lengthOfLIS(vector<int>& nums) { return best(nums, 0, -1); }
};` }
        ] }
      },
      mcq: { q: 'tails = [2, 5, 9] and the next number is 6. What happens?', options: ['6 replaces 9 (first tail ≥ 6)', '6 is appended → [2, 5, 9, 6]', '6 replaces 5', 'Nothing — 6 is ignored'], answer: 0, explain: 'Lower bound of 6 in [2,5,9] is index 2 (value 9). A run of length 3 can now end at 6 instead of 9 — cheaper, so we replace.' },
      hints: [
        `<p>Hint 1: for each length L, only the <b>smallest possible ending value</b> matters — a run of length L ending in 5 beats one ending in 9 because more future numbers can extend it.</p>`,
        `<p>Hint 2: keep those smallest endings in a list <code>tails</code>. It is always sorted, so you can binary-search the spot for each new number.</p>`,
        `<p>Hint 3: recipe — for x in nums: pos = first index with tails[pos] ≥ x; if pos == size append else overwrite; answer = size. Edge cases: duplicates (lower bound keeps it strict), single element → 1.</p>`
      ],
      solution: {
        approach: `<p>Maintain <code>tails</code> as a plain array with a length counter. For each number find the lower bound (first tail ≥ x): write the binary search by hand, or use a library call that returns the insertion point — <code>bisect_left</code> in Python, <code>lower_bound</code> in C++. (Java’s <code>Arrays.binarySearch</code> is a trap here: on duplicates it may return any matching index.) Append when the position equals the length, otherwise overwrite. The final length is the answer. Mention the O(N²) dp as the warm-up and the reconstruction trick (parent indices) as a follow-up.</p>`,
        code: `class Solution {
    public int lengthOfLIS(int[] nums) {
        int[] tails = new int[nums.length]; // tails[k] = smallest tail of an increasing run of length k+1
        int len = 0;
        for (int x : nums) {
            int lo = 0, hi = len;           // search in tails[0..len)
            while (lo < hi) {
                int mid = (lo + hi) >>> 1;
                if (tails[mid] < x) lo = mid + 1;   // strictly increasing -> lower bound
                else hi = mid;
            }
            tails[lo] = x;                  // replace, or append when lo == len
            if (lo == len) len++;
        }
        return len;
    }
}`,
        alt: [{ lang: 'python', code: `from bisect import bisect_left

class Solution:
    def length_of_lis(self, nums):
        tails = []
        for x in nums:
            k = bisect_left(tails, x)
            if k == len(tails):
                tails.append(x)
            else:
                tails[k] = x
        return len(tails)` }, { lang: 'js', code: `function lengthOfLIS(nums) {
  const tails = [];                       // tails[k] = smallest tail of a run of length k+1
  for (const x of nums) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {                     // lower bound: first tail >= x
      const mid = (lo + hi) >> 1;
      if (tails[mid] < x) lo = mid + 1; else hi = mid;
    }
    tails[lo] = x;                        // replace, or append when lo == length
  }
  return tails.length;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int lengthOfLIS(vector<int>& nums) {
        vector<int> tails;
        for (int x : nums) {
            auto it = lower_bound(tails.begin(), tails.end(), x);
            if (it == tails.end()) tails.push_back(x); else *it = x;
        }
        return (int)tails.size();
    }
};` }],
        dry: { head: ['x', 'lower bound pos', 'action', 'tails', 'len'], rows: [
          ['0', '0', 'append', '[0]', '1'], ['1', '1', 'append', '[0, 1]', '2'], ['0', '0', 'replace 0 with 0', '[0, 1]', '2'],
          ['3', '2', 'append', '[0, 1, 3]', '3'], ['2', '2', 'replace 3', '[0, 1, 2]', '3'], ['3', '3', '<span class="c-g">append</span>', '[0, 1, 2, 3]', '<span class="c-g">4</span>']
        ] },
        complexity: `<p>Time <b>O(N log N)</b> — one binary search per element. Space <b>O(N)</b> for tails. The O(N²) dp version uses O(N) space and is fine for N ≤ ~3000.</p>`,
        followUps: ['Return the actual subsequence, not just the length.', 'Count how many LIS exist (LC 673).', 'Make it non-decreasing instead of strictly increasing.', 'Russian Doll Envelopes (2D version, LC 354).']
      },
      tests: { sig: 'int[] -> int', fn: 'lengthOfLIS', cases: [
        [[[10, 9, 2, 5, 3, 7, 101, 18]], 4],
        [[[0, 1, 0, 3, 2, 3]], 4],
        [[[7, 7, 7, 7]], 1],
        [[[5]], 1],
        [[[-3, -2, -1, 0]], 4],
        [[[5, 4, 3, 2, 1]], 1],
        [[[1, 3, 6, 7, 9, 4, 10, 5, 6]], 6],
        [[[3, 4, 1, 2, 5, 6]], 4],
        [[{ $range: [-1250, 1250] }], 2500],
        [[{ $range: [10000, -10000, -1] }], 1],
        [[{ $concat: [{ $range: [-10000, 10000] }, { $range: [-10000, 10000] }, { $range: [-10000, 10000] }, { $range: [-10000, 10000] }, { $range: [-10000, 10000] }] }], 20000]
      ] }
    }]
  });

  // ================= TOPIC 2: Partition DP =================
  topics.push({
    title: 'Partition DP: Word Break and Palindrome Partitioning (cut a string into good pieces)',
    analogy: `<p>Imagine a long <b>chocolate bar</b> with letters printed on it. You may snap it only at the grooves, and every piece you keep must be a “good” piece — a real word from the menu, or a word that reads the same backwards. Questions: <b>can</b> you snap it so every piece is good? <b>In how many ways</b>? With the <b>fewest snaps</b>?</p>
      <p>The trick: you never plan the whole bar at once. You stand at a groove and ask, “if the <b>last</b> piece ends here, where could it have started — and was everything before that start already solved?”</p>`,
    explain: `<p><b>Partition DP</b> = “split a sequence into consecutive pieces, each piece must satisfy a rule, optimise or count something.” The universal state is a <b>prefix</b>:</p>
      <p><code>dp[i]</code> = answer for the first <code>i</code> characters <code>s[0..i)</code>. To compute it, try every possible <b>last piece</b> <code>s[j..i)</code>:</p>
      <p><code>dp[i] = combine over j &lt; i of ( dp[j] ⊕ cost(piece s[j..i)) )</code>, only for pieces that are allowed. Base case <code>dp[0]</code> = the empty prefix (true / 0 cuts / 1 way).</p>
      ${H.table(['question', 'dp[i] means', 'combine', 'base'], [
        ['Word Break (can we?)', 'is s[0..i) splittable', 'OR of dp[j] where s[j..i) is a word', 'dp[0] = true'],
        ['Word Break count', 'number of ways', 'SUM of dp[j]', 'dp[0] = 1'],
        ['Palindrome min cuts', 'fewest pieces for s[0..i)', 'MIN of dp[j] + 1 where s[j..i) is a palindrome', 'dp[0] = 0 pieces'],
        ['Word Break II (list all)', 'all sentences', 'backtracking + memo of dp', 'empty sentence']
      ])}
      <h4>Word Break walk-through</h4>
      <p>s = <code>"leetcode"</code>, words = {leet, code}.</p>
      ${H.table(['i', 'prefix', 'last piece found', 'dp[i]'], [
        ['0', '""', '(empty prefix)', H.c('g', 'T')], ['1..3', 'l, le, lee', 'none is a word (and no earlier T except 0)', 'F'],
        ['4', 'leet', 's[0..4) = "leet", dp[0] = T', H.c('g', 'T')], ['5..7', 'leetc…leetcod', 'no word ends here', 'F'],
        ['8', 'leetcode', 's[4..8) = "code", dp[4] = T', H.c('g', 'T') + ' → answer']
      ])}
      <h4>Palindrome min cuts</h4>
      <p>First precompute <code>pal[j][i]</code> = “is s[j..i] a palindrome?” in O(N²): a piece is a palindrome when its two ends match <b>and</b> the inside is a palindrome (or the inside is empty / one letter). Then <code>cuts[i]</code> = 0 if s[0..i] is itself a palindrome, else <code>min(cuts[j−1] + 1)</code> over all j where s[j..i] is a palindrome.</p>
      <p>s = <code>"aab"</code>: cuts after "a" = 0, after "aa" = 0 (whole thing is a palindrome), after "aab": last piece "b" → cuts[1] + 1 = <b>1</b> ("aa" | "b").</p>
      <p><b>Listing every partition</b> (LC 131) is not optimisation — the output itself can be exponential (a string of N equal letters has 2<sup>N−1</sup> partitions), so you <b>backtrack</b>, but you still use the <code>pal</code> table to check each piece in O(1).</p>`,
    clues: [
      '"<b>segment / split / partition</b> the string into pieces such that every piece is …" → prefix dp over cut positions.',
      '"Can s be segmented into dictionary words?" → Word Break, dp[i] boolean, dp[0] = true.',
      '"<b>Minimum cuts</b> so that every piece is a palindrome" → precompute palindrome table + 1D min dp.',
      '"Return <b>all</b> possible sentences / partitions" → backtracking (output is exponential) + memo or a pal table to prune.',
      '"Split the array into k (or any number of) contiguous groups, minimise cost / maximise score" (Partition Array for Maximum Sum, Split Array Largest Sum) → same dp[i] = best over last group.',
      'Constraints like s.length ≤ 1000–2000 → O(N²) pieces is allowed; dictionary words ≤ 20 letters → only check pieces up to maxLen.'
    ],
    code: [{ lang: 'java', code: `
      // Word Break: dp[i] = can the first i characters be split into dictionary words?
      static boolean wordBreak(String s, List<String> wordDict) {
          Set<String> dict = new HashSet<>(wordDict);
          int maxLen = 0;
          for (String w : wordDict) maxLen = Math.max(maxLen, w.length());
          int n = s.length();
          boolean[] dp = new boolean[n + 1];
          dp[0] = true;                                   // empty prefix is always fine
          for (int i = 1; i <= n; i++) {
              // last piece is s[j..i); only lengths up to maxLen can be words
              for (int j = i - 1; j >= Math.max(0, i - maxLen); j--) {
                  if (dp[j] && dict.contains(s.substring(j, i))) { dp[i] = true; break; }
              }
          }
          return dp[n];
      }`, alt: [{ lang: 'python', code: `def word_break(s, word_dict):
    # dp[i] = can the first i characters be split into dictionary words?
    words = set(word_dict)
    max_len = max(map(len, word_dict))
    n = len(s)
    dp = [True] + [False] * n                        # empty prefix is always fine
    for i in range(1, n + 1):
        # last piece is s[j:i]; only lengths up to max_len can be words
        dp[i] = any(dp[j] and s[j:i] in words for j in range(max(0, i - max_len), i))
    return dp[n]` }, { lang: 'js', code: `// Word Break: dp[i] = can the first i characters be split into dictionary words?
function wordBreak(s, wordDict) {
  const dict = new Set(wordDict);
  const maxLen = Math.max(...wordDict.map((w) => w.length));
  const n = s.length, dp = new Array(n + 1).fill(false);
  dp[0] = true;                                      // empty prefix is always fine
  for (let i = 1; i <= n; i++) {
    // last piece is s[j..i); only lengths up to maxLen can be words
    for (let j = i - 1; j >= Math.max(0, i - maxLen); j--) {
      if (dp[j] && dict.has(s.slice(j, i))) { dp[i] = true; break; }
    }
  }
  return dp[n];
}` }, { lang: 'cpp', code: `// Word Break: dp[i] = can the first i characters be split into dictionary words?
bool wordBreak(const string& s, const vector<string>& wordDict) {
    unordered_set<string> dict(wordDict.begin(), wordDict.end());
    int maxLen = 0;
    for (auto& w : wordDict) maxLen = max(maxLen, (int)w.size());
    int n = s.size();
    vector<bool> dp(n + 1, false);
    dp[0] = true;                                    // empty prefix is always fine
    for (int i = 1; i <= n; i++)
        // last piece is s[j..i); only lengths up to maxLen can be words
        for (int j = i - 1; j >= max(0, i - maxLen); j--)
            if (dp[j] && dict.count(s.substr(j, i - j))) { dp[i] = true; break; }
    return dp[n];
}` }] }, { lang: 'java', code: `
      // Palindrome Partitioning II: minimum cuts so every piece is a palindrome.
      static int minCut(String s) {
          int n = s.length();
          boolean[][] pal = new boolean[n][n];            // pal[j][i]: s[j..i] is a palindrome
          int[] cuts = new int[n];                        // cuts[i]: min cuts for s[0..i]
          for (int i = 0; i < n; i++) {
              cuts[i] = i;                                // worst case: cut after every char
              for (int j = 0; j <= i; j++) {
                  // ends match AND (piece length <= 3 OR the inside is a palindrome)
                  if (s.charAt(j) == s.charAt(i) && (i - j < 3 || pal[j + 1][i - 1])) {
                      pal[j][i] = true;
                      cuts[i] = (j == 0) ? 0 : Math.min(cuts[i], cuts[j - 1] + 1);
                  }
              }
          }
          return cuts[n - 1];
      }`, alt: [{ lang: 'python', code: `def min_cut(s):
    # Palindrome Partitioning II: minimum cuts so every piece is a palindrome.
    n = len(s)
    pal = [[False] * n for _ in range(n)]            # pal[j][i]: s[j..i] is a palindrome
    cuts = list(range(n))                            # worst case: cut after every char
    for i in range(n):
        for j in range(i + 1):
            # ends match AND (piece length <= 3 OR the inside is a palindrome)
            if s[j] == s[i] and (i - j < 3 or pal[j + 1][i - 1]):
                pal[j][i] = True
                cuts[i] = 0 if j == 0 else min(cuts[i], cuts[j - 1] + 1)
    return cuts[n - 1]` }, { lang: 'js', code: `// Palindrome Partitioning II: minimum cuts so every piece is a palindrome.
function minCut(s) {
  const n = s.length;
  const pal = Array.from({ length: n }, () => new Array(n).fill(false));   // pal[j][i]: s[j..i] is a palindrome
  const cuts = new Array(n);
  for (let i = 0; i < n; i++) {
    cuts[i] = i;                                     // worst case: cut after every char
    for (let j = 0; j <= i; j++) {
      // ends match AND (piece length <= 3 OR the inside is a palindrome)
      if (s[j] === s[i] && (i - j < 3 || pal[j + 1][i - 1])) {
        pal[j][i] = true;
        cuts[i] = j === 0 ? 0 : Math.min(cuts[i], cuts[j - 1] + 1);
      }
    }
  }
  return cuts[n - 1];
}` }, { lang: 'cpp', code: `// Palindrome Partitioning II: minimum cuts so every piece is a palindrome.
int minCut(const string& s) {
    int n = s.size();
    vector<vector<bool>> pal(n, vector<bool>(n, false));   // pal[j][i]: s[j..i] is a palindrome
    vector<int> cuts(n);
    for (int i = 0; i < n; i++) {
        cuts[i] = i;                                 // worst case: cut after every char
        for (int j = 0; j <= i; j++) {
            // ends match AND (piece length <= 3 OR the inside is a palindrome)
            if (s[j] == s[i] && (i - j < 3 || pal[j + 1][i - 1])) {
                pal[j][i] = true;
                cuts[i] = j == 0 ? 0 : min(cuts[i], cuts[j - 1] + 1);
            }
        }
    }
    return cuts[n - 1];
}` }] }, { lang: 'python', run: true, title: 'Word Break count + all partitions (runnable)', code: `from functools import lru_cache

def word_break_ways(s, words):
    words = set(words)
    dp = [0] * (len(s) + 1)
    dp[0] = 1                                   # one way to split the empty prefix
    for i in range(1, len(s) + 1):
        for j in range(i):
            if dp[j] and s[j:i] in words:
                dp[i] += dp[j]                  # every split of s[:j] + the word s[j:i]
    return dp[len(s)]

def all_palindrome_partitions(s):
    n = len(s)
    pal = [[False] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1):
            if s[j] == s[i] and (i - j < 3 or pal[j + 1][i - 1]):
                pal[j][i] = True
    out, cur = [], []
    def go(start):
        if start == n:
            out.append(list(cur)); return
        for end in range(start, n):
            if pal[start][end]:
                cur.append(s[start:end + 1]); go(end + 1); cur.pop()   # choose, explore, unchoose
    go(0)
    return out

print(word_break_ways("catsanddog", ["cat", "cats", "and", "sand", "dog"]))   # 2
print(word_break_ways("aaaa", ["a", "aa"]))                                      # 5
print(all_palindrome_partitions("aab"))                                          # [['a','a','b'], ['aa','b']]
` }],
    codeTitle: ['Word Break with maxLen pruning', 'Palindrome min cuts in O(N²)', 'Counting splits + listing palindrome partitions (Python)'],
    viz: [{
      title: 'Word Break: dp[i] lights up when some word ends at i and its start was already reachable',
      input: 'catsanddog ; cat cats and sand dog',
      inputLabel: 'string ; dictionary words (lowercase, string ≤ 14 letters)',
      gen: function (input) {
        var raw = String(input === undefined ? '' : input).split(/[;|]/);
        if (raw.length < 2) throw new Error('Format: string ; word1 word2 …  e.g. leetcode ; leet code');
        var s = cleanWord(raw[0], 14, 'the string');
        var words = raw[1].trim().split(/[\s,]+/).filter(Boolean);
        if (!words.length || words.length > 10) throw new Error('Give 1 to 10 dictionary words after the ;');
        words.forEach(function (w) { cleanWord(w, 14, 'each dictionary word'); });
        var n = s.length, dp = [true], frames = [], how = [null];
        var chars = s.split('');
        var dpView = function (upto) { var v = []; for (var k = 0; k <= n; k++) v.push(k <= upto ? (dp[k] ? 'T' : 'F') : '?'); return v; };
        frames.push({ narr: 'dp[i] = “can the first i letters be split into words?”. dp[0] = <b>T</b>: the empty prefix needs no words at all. Dictionary: ' + words.join(', ') + '.', parts: [
          { type: 'array', label: 'string (index = letter position)', values: chars, showIdx: true },
          { type: 'array', label: 'dp (index i = first i letters)', values: dpView(0), hl: one(0, 'ok'), showIdx: true },
          { type: 'set', label: 'dictionary', items: words.slice() }
        ] });
        for (var i = 1; i <= n; i++) {
          dp[i] = false; how[i] = null;
          for (var j = i - 1; j >= 0; j--) {
            if (dp[j] && words.indexOf(s.slice(j, i)) >= 0) { dp[i] = true; how[i] = j; break; }
          }
          var dh = one(i, dp[i] ? 'ok' : 'bad');
          if (dp[i]) dh[how[i]] = 'sel';
          var setHl = {}; if (dp[i]) setHl[s.slice(how[i], i)] = 'ok';
          frames.push({
            narr: dp[i] ? 'i = ' + i + ': the last piece <b>"' + s.slice(how[i], i) + '"</b> (letters ' + how[i] + '..' + (i - 1) + ') is a word AND dp[' + how[i] + '] = T (purple) → <span class="c-g">dp[' + i + '] = T</span>.'
              : 'i = ' + i + ': no piece s[j..' + i + ') is a word that starts at a reachable point → <span class="c-r">dp[' + i + '] = F</span>.',
            parts: [
              { type: 'array', label: 'string', values: chars, showIdx: true, range: dp[i] ? [how[i], i - 1] : undefined, hl: dp[i] ? {} : one(i - 1, 'cur') },
              { type: 'array', label: 'dp', values: dpView(i), hl: dh, showIdx: true },
              { type: 'set', label: 'dictionary', items: words.slice(), hl: setHl }
            ]
          });
        }
        var pieces = [];
        if (dp[n]) { for (var k = n; k > 0; k = how[k]) pieces.unshift(s.slice(how[k], k)); }
        frames.push({ narr: dp[n] ? '<span class="c-g">dp[' + n + '] = T</span> — the whole string can be segmented. Following the stored starts backwards gives: <b>' + pieces.join(' + ') + '</b>.' : '<span class="c-r">dp[' + n + '] = F</span> — there is no way to segment the whole string.', parts: [
          { type: 'array', label: 'dp (final)', values: dpView(n), hl: one(n, dp[n] ? 'sel' : 'bad'), showIdx: true },
          { type: 'text', label: 'answer', html: dp[n] ? '<b>true</b>: ' + pieces.join(' | ') : '<b>false</b>' }
        ] });
        return frames;
      }
    }, {
      title: 'Palindrome min cuts: for each end, try every palindrome that can be the LAST piece',
      input: 'abaccd',
      inputLabel: 'lowercase string (≤ 12 letters)',
      gen: function (input) {
        var s = cleanWord(input, 12, 'the string');
        var n = s.length, chars = s.split(''), frames = [];
        var pal = [];
        for (var a = 0; a < n; a++) { pal.push([]); for (var b = 0; b < n; b++) pal[a].push(false); }
        var cuts = [], from = [];
        frames.push({ narr: 'cuts[i] = fewest cuts so that s[0..i] is split into palindromes. For each end i we look at every start j where s[j..i] is a palindrome; that piece is the <b>last</b> piece.', parts: [
          { type: 'array', label: 'string', values: chars, showIdx: true },
          { type: 'text', label: 'cuts', html: '<i>not computed yet</i>' }
        ] });
        for (var i = 0; i < n; i++) {
          cuts[i] = Infinity; from[i] = -1;
          var options = [];
          for (var j = 0; j <= i; j++) {
            if (s[j] === s[i] && (i - j < 3 || pal[j + 1][i - 1])) {
              pal[j][i] = true;
              var c = j === 0 ? 0 : cuts[j - 1] + 1;
              options.push('"' + s.slice(j, i + 1) + '" → ' + (j === 0 ? '0 (whole prefix is a palindrome)' : 'cuts[' + (j - 1) + ']+1 = ' + c));
              if (c < cuts[i]) { cuts[i] = c; from[i] = j; }
            }
          }
          var view = []; for (var k = 0; k < n; k++) view.push(k <= i ? cuts[k] : '?');
          frames.push({
            narr: 'End i = ' + i + ' (letter ' + s[i] + '). Palindromes ending here: ' + options.join('; ') + '. Best last piece is <b>"' + s.slice(from[i], i + 1) + '"</b> → cuts[' + i + '] = <b>' + cuts[i] + '</b>.',
            parts: [
              { type: 'array', label: 'string (blue = chosen last piece)', values: chars, showIdx: true, range: [from[i], i], ptr: one(i, 'i') },
              { type: 'array', label: 'cuts', values: view, hl: one(i, 'ok'), showIdx: true }
            ]
          });
        }
        var pieces = [];
        for (var e = n - 1; e >= 0; e = from[e] - 1) pieces.unshift(s.slice(from[e], e + 1));
        var grid = [];
        for (var r = 0; r < n; r++) { var row = []; for (var c2 = 0; c2 < n; c2++) row.push(c2 < r ? '' : (pal[r][c2] ? 'P' : '·')); grid.push(row); }
        var ghl = {};
        for (var r2 = 0; r2 < n; r2++) for (var c3 = r2; c3 < n; c3++) if (pal[r2][c3]) ghl[r2 + ',' + c3] = 'ok';
        frames.push({ narr: 'Answer: <b>' + cuts[n - 1] + '</b> cut(s): ' + pieces.join(' | ') + '. The grid shows the palindrome table pal[j][i] (row = start, column = end) we built along the way.', parts: [
          { type: 'grid', label: 'pal[start][end]', rows: grid, rowHead: chars, colHead: chars, hl: ghl },
          { type: 'vars', label: 'answer', vals: { 'min cuts': cuts[n - 1], pieces: pieces.join(' | ') }, hl: { 'min cuts': 'sel' } }
        ] });
        return frames;
      }
    }],
    examples: [
      {
        title: 'Word Break where greedy fails: "catsandog" vs "catsanddog"',
        html: `<p>s = <code>"catsandog"</code>, words = {cats, dog, sand, and, cat}. Greedy “take the longest word first” picks <b>cats</b>, then <b>and</b>, then is stuck at “og”. Picking <b>cat</b> first gives “sand”, then stuck at “og” too. dp checks every split point and correctly answers ${H.c('r', 'false')}.</p>
          <p>Now s = <code>"catsanddog"</code>: dp[3] (cat) and dp[4] (cats) are T, dp[7] via "sand" from 3 and via "and" from 4, dp[10] via "dog" from 7 → ${H.c('g', 'true')}, and there are exactly ${H.c('g', '2')} sentences.</p>`
      },
      {
        title: 'Counting segmentations of "aaaa" with {a, aa}',
        html: `${H.table(['i', 'ways[i]', 'why'], [['0', '1', 'empty'], ['1', '1', 'ways[0] ("a")'], ['2', '2', 'ways[1] + ways[0] ("a", "aa")'], ['3', '3', 'ways[2] + ways[1]'], ['4', H.c('g', '5'), 'ways[3] + ways[2]']])}
          <p>Fibonacci appears because the last piece is always "a" (from i−1) or "aa" (from i−2) — exactly the climbing-stairs recurrence from DP I. Partition DP is climbing stairs where the allowed step sizes depend on the text.</p>`
      },
      {
        title: 'Min cuts for "aabbaac"',
        html: `<p>Palindromes include "aabbaa" (indices 0..5). cuts[5] = 0. For i = 6 ("c"): last piece "c" → cuts[5] + 1 = ${H.c('g', '1')}. Partition: <b>aabbaa | c</b>.</p>
          <p>A greedy “cut at the first palindrome you see” would produce a | a | bb | aa | c (4 cuts). The dp considers the long palindrome because it tries every start for the last piece.</p>`
      },
      {
        title: 'Same template on arrays: Partition Array for Maximum Sum',
        html: `<p>Split arr into contiguous groups of length ≤ k; each group becomes its own max; maximise the total. arr = [1, 15, 7, 9, 2, 5, 10], k = 3.</p>
          <p><code>dp[i] = max over len 1..k of dp[i−len] + len × max(arr[i−len..i−1])</code>. Result 84 (groups [1,15,7] → 15·3, [9] → 9, [2,5,10] → 10·3 = 45 + 9 + 30). Same “try every last piece” loop — only the piece score changed.</p>`,
        code: { lang: 'java', code: `static int maxSumAfterPartitioning(int[] arr, int k) {
    int n = arr.length;
    int[] dp = new int[n + 1];               // dp[i] = best total for first i elements
    for (int i = 1; i <= n; i++) {
        int mx = 0;
        for (int len = 1; len <= k && len <= i; len++) {
            mx = Math.max(mx, arr[i - len]);  // max of the last group arr[i-len..i-1]
            dp[i] = Math.max(dp[i], dp[i - len] + mx * len);
        }
    }
    return dp[n];
}`, alt: [{ lang: 'python', code: `def max_sum_after_partitioning(arr, k):
    n = len(arr)
    dp = [0] * (n + 1)                       # dp[i] = best total for first i elements
    for i in range(1, n + 1):
        mx = 0
        for length in range(1, min(k, i) + 1):
            mx = max(mx, arr[i - length])    # max of the last group arr[i-length:i]
            dp[i] = max(dp[i], dp[i - length] + mx * length)
    return dp[n]` }, { lang: 'js', code: `function maxSumAfterPartitioning(arr, k) {
  const n = arr.length, dp = new Array(n + 1).fill(0);   // dp[i] = best total for first i elements
  for (let i = 1; i <= n; i++) {
    let mx = 0;
    for (let len = 1; len <= k && len <= i; len++) {
      mx = Math.max(mx, arr[i - len]);       // max of the last group arr[i-len..i-1]
      dp[i] = Math.max(dp[i], dp[i - len] + mx * len);
    }
  }
  return dp[n];
}` }, { lang: 'cpp', code: `int maxSumAfterPartitioning(const vector<int>& arr, int k) {
    int n = arr.size();
    vector<int> dp(n + 1, 0);                // dp[i] = best total for first i elements
    for (int i = 1; i <= n; i++) {
        int mx = 0;
        for (int len = 1; len <= k && len <= i; len++) {
            mx = max(mx, arr[i - len]);      // max of the last group arr[i-len..i-1]
            dp[i] = max(dp[i], dp[i - len] + mx * len);
        }
    }
    return dp[n];
}` }] }
      }
    ],
    deepDive: `<p><b>Complexity of Word Break.</b> The naive double loop does O(N²) substring checks, and each <code>substring + hash</code> costs O(L), so the honest bound is O(N² · L) or O(N³) when words are long. Fixes: (1) loop only over lengths ≤ maxWordLen → O(N · maxLen · maxLen); (2) walk a <b>trie</b> forward from every reachable start j, stopping when the trie path dies → O(N · maxLen) character steps and no substring allocation; (3) rolling hashes for O(1) piece lookups.</p>
      <p><b>Word Break II.</b> The number of sentences can be exponential ("aaaa…a" with {a, aa, aaa}), so no algorithm is polynomial in the output. Good practice: first run the boolean dp (or memoise “can the suffix from i be finished?”) so backtracking never enters a dead end. Without that pruning, inputs like "aaaa…ab" make naive backtracking explore 2<sup>N</sup> branches only to fail.</p>
      <p><b>Palindrome table tricks.</b> Filling <code>pal[j][i]</code> in the order “i ascending, j any” works because pal[j+1][i−1] belongs to a previous i. Memory O(N²) booleans = 4 MB at N = 2000 — fine. The O(N) memory alternative expands around every centre (2N−1 centres) and updates <code>cuts[right] = min(cuts[left−1] + 1)</code> as it expands; Manacher’s algorithm (DSA 24) finds all palindromic radii in O(N), but min-cut still needs O(N²) in the worst case using the simple dp.</p>
      <p><b>Correctness pattern.</b> Every partition has a unique last piece, so “min/OR/SUM over the last piece of (answer for the rest)” covers every partition exactly once — that is why the counting version does not double count. This is the same argument you will reuse in “Decode Ways”, “Split Array Largest Sum” (which also has a binary-search-on-answer solution) and “Minimum cost to segment text”.</p>
      <p><b>Production reality.</b> Word segmentation is used for languages written without spaces (Chinese, Japanese, Thai), URL/hashtag splitting (#nowhiring → now hiring / no whiring) and in tokenisers. Real systems replace “is a word” with a <b>probability</b> and the OR with a max over log-probabilities — the Viterbi algorithm is exactly this dp.</p>`,
    aiEra: `<p><b>What AI changes:</b> modern LLM tokenisers (BPE, WordPiece, unigram LM) literally solve partition problems — unigram tokenisation runs a Viterbi-style dp over the string to pick the most probable segmentation. Knowing partition dp lets you reason about why a token boundary appears where it does.</p>
      <p><b>Use AI as a partner:</b> ask <code>Generate adversarial Word Break II inputs that make naive backtracking exponential, and explain why</code>, then test whether your memoised version survives. Ask it to convert your O(N²)-memory palindrome table into the expand-around-centre O(N)-memory version and diff the outputs on random strings.</p>
      <p><b>Where AI goes wrong:</b> greedy longest-match segmentation presented as correct; forgetting <code>dp[0] = true</code>; quietly building substrings (<code>substring</code> / slicing) in a triple loop and calling it O(N²); listing all palindrome partitions without a pal table (re-checking each piece costs O(N) every time).</p>
      <p><b>What you must still own:</b> naming the state (“answer for the prefix of length i”), defending the base case, and spotting when the output is exponential so “optimise it” really means “prune it”.</p>`,
    problems: [{
      title: 'Word Break', level: 'Medium', tags: ['dp', 'string', 'hashing', 'trie'], companies: ['Amazon', 'Google', 'Meta', 'Bloomberg'],
      statement: `<p>Given a string <code>s</code> and a list of words <code>wordDict</code>, return <code>true</code> if <code>s</code> can be split into a sequence of one or more dictionary words. Words may be reused any number of times.</p>`,
      constraints: `1 ≤ s.length ≤ 300, 1 ≤ wordDict.length ≤ 1000, 1 ≤ word length ≤ 20, all lowercase, words are unique.`,
      example: `<p>s = ${H.c('b', '"applepenapple"')}, wordDict = [apple, pen] → <b>true</b>: ${H.c('g', 'apple | pen | apple')} (apple reused). s = "catsandog", [cats, dog, sand, and, cat] → <b>false</b> — every route gets stuck at "og".</p>`,
      brute: {
        why: `<p>Recursively try every word that matches at the current position and recurse on the rest. The same suffix is solved again and again: for s = "aaaa…ab" with {a, aa, aaa} the recursion tree is exponential before it discovers the final "b" can never match.</p>`,
        code: { lang: 'java', code: `class Brute {
    boolean canBreak(String s, int start, Set<String> dict) {
        if (start == s.length()) return true;
        for (int end = start + 1; end <= s.length(); end++) {
            if (dict.contains(s.substring(start, end)) && canBreak(s, end, dict)) return true;
        }
        return false;   // the same 'start' gets re-solved many times -> exponential
    }
    public boolean wordBreak(String s, List<String> wordDict) {
        return canBreak(s, 0, new HashSet<>(wordDict));
    }
}`, alt: [
          { lang: 'python', code: `def word_break(s, word_dict):
    words = set(word_dict)

    def can_break(start):
        if start == len(s):
            return True
        for end in range(start + 1, len(s) + 1):
            if s[start:end] in words and can_break(end):
                return True
        return False   # the same 'start' gets re-solved many times -> exponential

    return can_break(0)` },
          { lang: 'js', code: `function wordBreak(s, wordDict) {
  const dict = new Set(wordDict);
  function canBreak(start) {
    if (start === s.length) return true;
    for (let end = start + 1; end <= s.length; end++) {
      if (dict.has(s.substring(start, end)) && canBreak(end)) return true;
    }
    return false;   // the same 'start' gets re-solved many times -> exponential
  }
  return canBreak(0);
}` },
          { lang: 'cpp', code: `class Brute {
    bool canBreak(const string& s, int start, unordered_set<string>& dict) {
        if (start == (int)s.size()) return true;
        for (int end = start + 1; end <= (int)s.size(); end++) {
            if (dict.count(s.substr(start, end - start)) && canBreak(s, end, dict)) return true;
        }
        return false;   // the same 'start' gets re-solved many times -> exponential
    }
public:
    bool wordBreak(string s, vector<string>& wordDict) {
        unordered_set<string> dict(wordDict.begin(), wordDict.end());
        return canBreak(s, 0, dict);
    }
};` }
        ] }
      },
      mcq: { q: 'dp[i] means “s[0..i) can be segmented”. Which condition makes dp[i] true?', options: ['Some j &lt; i with dp[j] true AND s[j..i) in the dictionary', 'dp[i−1] true AND s[i−1] is a word', 'Any dictionary word is a substring of s[0..i)', 'All dp[j] for j &lt; i are true'], answer: 0, explain: 'The last word must be s[j..i) for some start j, and everything before it — s[0..j) — must already be splittable (dp[j]).' },
      hints: [
        `<p>Hint 1: whatever the full split looks like, it has a <b>last word</b>. If that last word is s[j..i), the rest s[0..j) must also be splittable — a smaller version of the same question.</p>`,
        `<p>Hint 2: boolean array <code>dp[0..n]</code>, dp[0] = true, a hash set for the dictionary (<code>HashSet</code> / <code>set</code> / <code>Set</code> / <code>unordered_set</code>). For each i, try each j.</p>`,
        `<p>Hint 3: speed-up — only try pieces whose length ≤ longest word. Recipe: for i in 1..n: for j from i−1 down to i−maxLen: if dp[j] and set has s[j:i] → dp[i] = true, break. Return dp[n].</p>`
      ],
      solution: {
        approach: `<p>Bottom-up prefix dp. dp[i] is true when there is a split point j with dp[j] true and s[j..i) in the set. We scan j downward from i−1 and stop at i−maxLen because no dictionary word is longer; we break at the first success because OR needs only one witness.</p>`,
        code: `class Solution {
    public boolean wordBreak(String s, List<String> wordDict) {
        Set<String> dict = new HashSet<>(wordDict);
        int maxLen = 0;
        for (String w : wordDict) maxLen = Math.max(maxLen, w.length());
        int n = s.length();
        boolean[] dp = new boolean[n + 1];
        dp[0] = true;                                  // empty prefix
        for (int i = 1; i <= n; i++) {
            for (int j = i - 1; j >= 0 && i - j <= maxLen; j--) {
                if (dp[j] && dict.contains(s.substring(j, i))) {
                    dp[i] = true;                      // found a valid last word
                    break;
                }
            }
        }
        return dp[n];
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def word_break(self, s, wordDict):
        words = set(wordDict)
        max_len = max(map(len, wordDict))
        n = len(s)
        dp = [False] * (n + 1)
        dp[0] = True
        for i in range(1, n + 1):
            for j in range(i - 1, max(-1, i - max_len - 1), -1):
                if dp[j] and s[j:i] in words:
                    dp[i] = True
                    break
        return dp[n]` }, { lang: 'js', code: `function wordBreak(s, wordDict) {
  const dict = new Set(wordDict);
  const maxLen = Math.max(...wordDict.map((w) => w.length));
  const n = s.length;
  const dp = new Array(n + 1).fill(false);
  dp[0] = true;                                    // empty prefix
  for (let i = 1; i <= n; i++) {
    for (let j = i - 1; j >= 0 && i - j <= maxLen; j--) {
      if (dp[j] && dict.has(s.slice(j, i))) { dp[i] = true; break; }   // valid last word
    }
  }
  return dp[n];
}` }, { lang: 'cpp', code: `class Solution {
public:
    bool wordBreak(string s, vector<string>& wordDict) {
        unordered_set<string> dict(wordDict.begin(), wordDict.end());
        size_t maxLen = 0;
        for (auto& w : wordDict) maxLen = max(maxLen, w.size());
        int n = s.size();
        vector<bool> dp(n + 1, false);
        dp[0] = true;                                  // empty prefix
        for (int i = 1; i <= n; i++) {
            for (int j = i - 1; j >= 0 && i - j <= (int)maxLen; j--) {
                if (dp[j] && dict.count(s.substr(j, i - j))) { dp[i] = true; break; }
            }
        }
        return dp[n];
    }
};` }],
        dry: { head: ['i', 'prefix', 'last word tried', 'dp[i]'], rows: [
          ['0', '""', '—', 'T'], ['5', 'apple', '"apple" from j=0 (dp[0]=T)', '<span class="c-g">T</span>'],
          ['6..7', 'applep, applepe', 'no word ends here', 'F'], ['8', 'applepen', '"pen" from j=5 (dp[5]=T)', '<span class="c-g">T</span>'],
          ['9..12', '…', 'no word ends here', 'F'], ['13', 'applepenapple', '"apple" from j=8 (dp[8]=T)', '<span class="c-g">T → answer</span>']
        ] },
        complexity: `<p>Time O(N · maxLen · maxLen) (maxLen choices of j, each substring/hash costs up to maxLen). Space O(N + dictionary). A trie walk removes the substring cost.</p>`,
        followUps: ['Return all sentences (Word Break II).', 'Count the number of segmentations modulo 10<sup>9</sup>+7.', 'Use a trie instead of a hash set — what changes in complexity?']
      },
      tests: { sig: 'string list<string> -> bool', fn: 'wordBreak', cases: [
        [['leetcode', ['leet', 'code']], true],
        [['applepenapple', ['apple', 'pen']], true],
        [['catsandog', ['cats', 'dog', 'sand', 'and', 'cat']], false],
        [['a', ['a']], true],
        [['a', ['b']], false],
        [['aaaaaaa', ['aaaa', 'aaa']], true],
        [['cars', ['car', 'ca', 'rs']], true],
        [['goalspecial', ['go', 'goal', 'goals', 'special']], true],
        [[{ $concat: [{ $rep: 'a', n: 299 }, 'b'] }, ['a', 'aa', 'aaa', 'aaaa', 'aaaaa', 'aaaaaa', 'aaaaaaa', 'aaaaaaaa', 'aaaaaaaaa', 'aaaaaaaaaa']], false],
        [[{ $rep: 'a', n: 300 }, ['aa', 'aaa']], true],
        [[{ $rep: 'abcdefghijklmnopqrst', n: 15 }, ['abcdefghijklmnopqrst']], true]
      ] }
    }, {
      title: 'Palindrome Partitioning II (minimum cuts)', level: 'Hard', tags: ['dp', 'string', 'palindrome'], companies: ['Google', 'Amazon', 'Adobe'],
      statement: `<p>Given a string <code>s</code>, split it so that every piece is a palindrome. Return the <b>minimum number of cuts</b> needed.</p>`,
      constraints: `1 ≤ s.length ≤ 2000, lowercase English letters. O(N²) time is expected.`,
      example: `<p>s = ${H.c('b', '"aab"')} → <b>1</b> (${H.c('g', 'aa | b')}). s = "a" → 0. s = "ab" → 1. s = "abccbc" → 2 (a | bccb | c).</p>`,
      brute: {
        why: `<p>Recursively try every palindromic first piece and recurse on the rest; checking each piece costs O(N) and the number of partitions is up to 2<sup>N−1</sup>. Even with memo on the start index, re-checking palindromes inside the loop gives O(N³).</p>`,
        code: { lang: 'java', code: `class Brute {
    boolean isPal(String s, int l, int r) {
        while (l < r) if (s.charAt(l++) != s.charAt(r--)) return false;
        return true;
    }
    int minCutFrom(String s, int start) {
        if (start == s.length() || isPal(s, start, s.length() - 1)) return 0;
        int best = Integer.MAX_VALUE;
        for (int end = start; end < s.length() - 1; end++) {
            if (isPal(s, start, end)) best = Math.min(best, 1 + minCutFrom(s, end + 1));
        }
        return best;   // exponential: same 'start' recomputed many times
    }
    public int minCut(String s) { return minCutFrom(s, 0); }
}`, alt: [
          { lang: 'python', code: `def is_pal(s, l, r):
    while l < r:
        if s[l] != s[r]:
            return False
        l += 1
        r -= 1
    return True

def min_cut_from(s, start):
    if start == len(s) or is_pal(s, start, len(s) - 1):
        return 0
    best = float('inf')
    for end in range(start, len(s) - 1):
        if is_pal(s, start, end):
            best = min(best, 1 + min_cut_from(s, end + 1))
    return best   # exponential: same 'start' recomputed many times

def min_cut(s):
    return min_cut_from(s, 0)` },
          { lang: 'js', code: `function isPal(s, l, r) {
  while (l < r) if (s[l++] !== s[r--]) return false;
  return true;
}

function minCutFrom(s, start) {
  if (start === s.length || isPal(s, start, s.length - 1)) return 0;
  let best = Infinity;
  for (let end = start; end < s.length - 1; end++) {
    if (isPal(s, start, end)) best = Math.min(best, 1 + minCutFrom(s, end + 1));
  }
  return best;   // exponential: same 'start' recomputed many times
}

function minCut(s) { return minCutFrom(s, 0); }` },
          { lang: 'cpp', code: `class Brute {
    bool isPal(const string& s, int l, int r) {
        while (l < r) if (s[l++] != s[r--]) return false;
        return true;
    }
    int minCutFrom(const string& s, int start) {
        if (start == (int)s.size() || isPal(s, start, s.size() - 1)) return 0;
        int best = INT_MAX;
        for (int end = start; end < (int)s.size() - 1; end++) {
            if (isPal(s, start, end)) best = min(best, 1 + minCutFrom(s, end + 1));
        }
        return best;   // exponential: same 'start' recomputed many times
    }
public:
    int minCut(string s) { return minCutFrom(s, 0); }
};` }
        ] }
      },
      mcq: { q: 'Why precompute pal[j][i] instead of checking each piece with two pointers?', options: ['It turns each palindrome check into O(1), so the whole dp is O(N²) instead of O(N³)', 'Two pointers give wrong answers for even lengths', 'It saves memory', 'Strings cannot be scanned with two pointers'], answer: 0, explain: 'There are O(N²) (j, i) pairs. A two-pointer check is O(N) each → O(N³). The table answers each check in O(1) using pal[j+1][i−1].' },
      hints: [
        `<p>Hint 1: look at the <b>last</b> palindromic piece s[j..i]. Everything before it, s[0..j−1], must be partitioned optimally on its own.</p>`,
        `<p>Hint 2: <code>pal[j][i] = s[j]==s[i] &amp;&amp; (i−j &lt; 3 || pal[j+1][i−1])</code> and <code>cuts[i] = 0 if pal[0][i] else min(cuts[j−1] + 1)</code>.</p>`,
        `<p>Hint 3: fill both in the same double loop with i ascending (pal[j+1][i−1] belongs to an earlier i). Initialise cuts[i] = i (cut after every letter). Answer cuts[n−1].</p>`
      ],
      solution: {
        approach: `<p>One pass over end positions i. For every start j ≤ i, decide pal[j][i] in O(1) from the inner piece, and if it is a palindrome treat it as the last piece: 0 cuts if j = 0, otherwise cuts[j−1] + 1. Keep the minimum.</p>`,
        code: `class Solution {
    public int minCut(String s) {
        int n = s.length();
        boolean[][] pal = new boolean[n][n];
        int[] cuts = new int[n];
        for (int i = 0; i < n; i++) {
            cuts[i] = i;                                  // upper bound: every char alone
            for (int j = 0; j <= i; j++) {
                if (s.charAt(j) == s.charAt(i) && (i - j < 3 || pal[j + 1][i - 1])) {
                    pal[j][i] = true;                     // s[j..i] is a palindrome
                    cuts[i] = (j == 0) ? 0 : Math.min(cuts[i], cuts[j - 1] + 1);
                }
            }
        }
        return cuts[n - 1];
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def min_cut(self, s):
        n = len(s)
        cuts = list(range(-1, n))       # cuts[k] = min cuts for s[:k]; cuts[0] = -1 sentinel
        for c in range(n):
            for left, right in ((c, c), (c, c + 1)):          # odd and even centres
                while left >= 0 and right < n and s[left] == s[right]:
                    cuts[right + 1] = min(cuts[right + 1], cuts[left] + 1)
                    left -= 1
                    right += 1
        return cuts[n]` }, { lang: 'js', code: `function minCut(s) {
  const n = s.length;
  const pal = Array.from({ length: n }, () => new Uint8Array(n));   // pal[j][i]: s[j..i] is a palindrome
  const cuts = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    cuts[i] = i;                                   // upper bound: every char alone
    for (let j = 0; j <= i; j++) {
      if (s[j] === s[i] && (i - j < 3 || pal[j + 1][i - 1])) {
        pal[j][i] = 1;
        cuts[i] = j === 0 ? 0 : Math.min(cuts[i], cuts[j - 1] + 1);
      }
    }
  }
  return cuts[n - 1];
}` }, { lang: 'cpp', code: `class Solution {
public:
    int minCut(string s) {
        int n = s.size();
        vector<vector<char>> pal(n, vector<char>(n, 0));   // pal[j][i]: s[j..i] is a palindrome
        vector<int> cuts(n);
        for (int i = 0; i < n; i++) {
            cuts[i] = i;                                   // upper bound: every char alone
            for (int j = 0; j <= i; j++) {
                if (s[j] == s[i] && (i - j < 3 || pal[j + 1][i - 1])) {
                    pal[j][i] = 1;
                    cuts[i] = j == 0 ? 0 : min(cuts[i], cuts[j - 1] + 1);
                }
            }
        }
        return cuts[n - 1];
    }
};` }],
        dry: { head: ['i', 'char', 'palindromes ending at i', 'cuts[i]'], rows: [
          ['0', 'a', '"a" (j=0)', '0'], ['1', 'b', '"b"', 'cuts[0]+1 = 1'], ['2', 'c', '"c"', '2'], ['3', 'c', '"c", "cc"', 'min(3, cuts[1]+1 = 2) = 2'],
          ['4', 'b', '"b", "bccb" (j=1)', 'cuts[0]+1 = <span class="c-g">1</span>'], ['5', 'c', '"c", "cbc" (j=3)', 'min(cuts[4]+1, cuts[2]+1) = <span class="c-g">2</span>']
        ] },
        complexity: `<p>Time O(N²). Space O(N²) for the table (O(N) with the expand-around-centre version shown in Python).</p>`,
        followUps: ['Return the actual pieces, not just the count.', 'List all palindrome partitions (LC 131) — why is that exponential?', 'Minimum cuts so each piece has at most k distinct letters.']
      },
      tests: { sig: 'string -> int', fn: 'minCut', cases: [
        [['aab'], 1],
        [['a'], 0],
        [['ab'], 1],
        [['abccbc'], 2],
        [['aabbaac'], 1],
        [['abcde'], 4],
        [['aaaa'], 0],
        [['abacdcxyx'], 2],
        [['banana'], 1],
        [[{ $rep: 'a', n: 2000 }], 0],
        [[{ $rep: 'ab', n: 1000 }], 1],
        [[{ $concat: [{ $rep: 'abc', n: 666 }, 'ab'] }], 1999]
      ] }
    }]
  });

  // ================= TOPIC 3: Interval DP =================
  topics.push({
    title: 'Interval DP: Matrix Chain Multiplication and Burst Balloons (solve every range, shortest first)',
    analogy: `<p>Think of a <b>knockout tournament bracket</b> drawn on paper. To know the best way to run the whole bracket, you first need the best result for every small group of neighbours (2 players), then groups of 3, 4, … until the whole line. Every big group is decided by <b>where you split it</b> into a left part and a right part — and both parts are smaller groups you already solved.</p>
      <p>Or <b>gluing a row of Lego bricks</b> into one block, two neighbours at a time, where each glue step has a cost. The order you glue in changes the total cost. Interval DP tries every “last glue point” for every stretch of bricks.</p>`,
    explain: `<p><b>Interval DP</b> works on a <b>range</b> <code>[i..j]</code> of a sequence. The state is <code>dp[i][j]</code> = best answer for just that range. You compute it by choosing a <b>split point</b> <code>k</code> inside the range:</p>
      <p><code>dp[i][j] = best over k of ( dp[i][k] ⊕ dp[k+1][j] ⊕ cost(i, k, j) )</code></p>
      <p>Since a range depends only on <b>shorter</b> ranges, you fill the table by <b>length</b>: all ranges of length 1, then 2, then 3… up to N. That is O(N²) states × O(N) split choices = <b>O(N³)</b>, fine for N ≤ ~500.</p>
      <h4>Matrix Chain Multiplication (MCM)</h4>
      <p>Multiplying a (p × q) matrix by a (q × r) matrix costs <code>p·q·r</code> scalar multiplications. For a chain A·B·C the result is the same in any bracket order, but the <b>cost</b> is not. Dimensions <code>p = [10, 30, 5, 60]</code> mean A is 10×30, B is 30×5, C is 5×60.</p>
      ${H.table(['order', 'cost'], [['(A·B)·C', '10·30·5 + 10·5·60 = 1500 + 3000 = ' + H.c('g', '4500')], ['A·(B·C)', '30·5·60 + 10·30·60 = 9000 + 18000 = ' + H.c('r', '27000')]])}
      <p>State: <code>dp[i][j]</code> = cheapest way to multiply matrices i..j. Choose the <b>last</b> multiplication split k: <code>dp[i][j] = min(dp[i][k] + dp[k+1][j] + p[i−1]·p[k]·p[j])</code>. Base: dp[i][i] = 0 (one matrix, nothing to do).</p>
      <h4>Burst Balloons — think about the LAST balloon, not the first</h4>
      <p>Bursting balloon k earns <code>left · k · right</code> where left/right are its <b>current</b> neighbours. If you pick the <b>first</b> balloon to burst, its neighbours change later, so the two sides are not independent. Flip it: pick the balloon <code>k</code> that bursts <b>last</b> inside range i..j. While the other balloons of the range are bursting, k is still standing, so it acts as a wall: the left part and right part never touch each other. When k finally bursts, its neighbours are the balloons just <b>outside</b> the range: <code>nums[i−1]</code> and <code>nums[j+1]</code> (pad the array with 1s on both ends).</p>
      <p><code>dp[i][j] = max over k in [i..j] of dp[i][k−1] + nums[i−1]·nums[k]·nums[j+1] + dp[k+1][j]</code>.</p>
      <p>For <code>[3, 1, 5, 8]</code> the answer is <b>167</b>: burst 1 (3·1·5 = 15), 5 (3·5·8 = 120), 3 (1·3·8 = 24), 8 (1·8·1 = 8).</p>
      <p><b>The family:</b> Minimum Score Triangulation, Minimum Cost to Cut a Stick, Merge Stones, Optimal BST, Strange Printer, Remove Boxes, Longest Palindromic Subsequence (a string version) — all “best for every range, choose a split / last action”.</p>`,
    clues: [
      '"<b>Merge / combine adjacent</b> elements until one remains, minimise total cost" → interval DP over [i..j].',
      '"Removing / bursting an element changes its <b>neighbours</b>" → think of the element removed <b>last</b> in the range.',
      '"Parenthesise / bracket the expression / order of multiplications" → MCM-style split point k.',
      '"Cut a stick / polygon at given points, cost depends on current length" → sort cut points, interval DP over consecutive cuts.',
      'N ≤ 100–500 and the answer depends on contiguous ranges → O(N³) interval DP is the intended solution.',
      'Prefix dp gets stuck because both ends of a range matter → you need two indices i and j.'
    ],
    code: [{ lang: 'java', code: `
      // Matrix Chain Multiplication: matrix i (1-based) has size p[i-1] x p[i].
      static long matrixChain(int[] p) {
          int n = p.length - 1;                      // number of matrices
          long[][] dp = new long[n + 1][n + 1];      // dp[i][j] = min cost for A_i..A_j
          int[][] split = new int[n + 1][n + 1];     // best k, to print the brackets
          for (int len = 2; len <= n; len++) {       // shorter ranges first!
              for (int i = 1; i + len - 1 <= n; i++) {
                  int j = i + len - 1;
                  dp[i][j] = Long.MAX_VALUE;
                  for (int k = i; k < j; k++) {      // last multiplication: (A_i..A_k)(A_k+1..A_j)
                      long cost = dp[i][k] + dp[k + 1][j] + (long) p[i - 1] * p[k] * p[j];
                      if (cost < dp[i][j]) { dp[i][j] = cost; split[i][j] = k; }
                  }
              }
          }
          System.out.println(brackets(split, 1, n));
          return dp[1][n];
      }

      static String brackets(int[][] split, int i, int j) {
          if (i == j) return "A" + i;
          int k = split[i][j];
          return "(" + brackets(split, i, k) + " x " + brackets(split, k + 1, j) + ")";
      }`, alt: [{ lang: 'python', code: `def matrix_chain(p):
    # Matrix Chain Multiplication: matrix i (1-based) has size p[i-1] x p[i].
    n = len(p) - 1                               # number of matrices
    dp = [[0] * (n + 1) for _ in range(n + 1)]   # dp[i][j] = min cost for A_i..A_j
    split = [[0] * (n + 1) for _ in range(n + 1)]
    for length in range(2, n + 1):               # shorter ranges first!
        for i in range(1, n - length + 2):
            j = i + length - 1
            # last multiplication: (A_i..A_k)(A_k+1..A_j)
            dp[i][j], split[i][j] = min((dp[i][k] + dp[k + 1][j] + p[i - 1] * p[k] * p[j], k) for k in range(i, j))

    def brackets(i, j):
        if i == j:
            return f"A{i}"
        k = split[i][j]
        return f"({brackets(i, k)} x {brackets(k + 1, j)})"
    print(brackets(1, n))
    return dp[1][n]` }, { lang: 'js', code: `// Matrix Chain Multiplication: matrix i (1-based) has size p[i-1] x p[i].
function matrixChain(p) {
  const n = p.length - 1;                          // number of matrices
  const dp = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(0));   // min cost for A_i..A_j
  const split = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(0));
  for (let len = 2; len <= n; len++) {             // shorter ranges first!
    for (let i = 1; i + len - 1 <= n; i++) {
      const j = i + len - 1;
      dp[i][j] = Infinity;
      for (let k = i; k < j; k++) {                // last multiplication: (A_i..A_k)(A_k+1..A_j)
        const cost = dp[i][k] + dp[k + 1][j] + p[i - 1] * p[k] * p[j];   // exact below 2^53
        if (cost < dp[i][j]) { dp[i][j] = cost; split[i][j] = k; }
      }
    }
  }
  const brackets = (i, j) => (i === j ? 'A' + i : '(' + brackets(i, split[i][j]) + ' x ' + brackets(split[i][j] + 1, j) + ')');
  console.log(brackets(1, n));
  return dp[1][n];
}` }, { lang: 'cpp', code: `string brackets(const vector<vector<int>>& split, int i, int j) {
    if (i == j) return "A" + to_string(i);
    int k = split[i][j];
    return "(" + brackets(split, i, k) + " x " + brackets(split, k + 1, j) + ")";
}

// Matrix Chain Multiplication: matrix i (1-based) has size p[i-1] x p[i].
long long matrixChain(const vector<int>& p) {
    int n = p.size() - 1;                            // number of matrices
    vector<vector<long long>> dp(n + 1, vector<long long>(n + 1, 0));   // min cost for A_i..A_j
    vector<vector<int>> split(n + 1, vector<int>(n + 1, 0));
    for (int len = 2; len <= n; len++) {             // shorter ranges first!
        for (int i = 1; i + len - 1 <= n; i++) {
            int j = i + len - 1;
            dp[i][j] = LLONG_MAX;
            for (int k = i; k < j; k++) {            // last multiplication: (A_i..A_k)(A_k+1..A_j)
                long long cost = dp[i][k] + dp[k + 1][j] + (long long)p[i - 1] * p[k] * p[j];
                if (cost < dp[i][j]) { dp[i][j] = cost; split[i][j] = k; }
            }
        }
    }
    cout << brackets(split, 1, n) << endl;
    return dp[1][n];
}` }] }, { lang: 'java', code: `
      // Burst Balloons with the "last balloon in the range" idea.
      static int maxCoins(int[] nums) {
          int n = nums.length;
          int[] b = new int[n + 2];                  // pad with 1 on both sides
          b[0] = b[n + 1] = 1;
          for (int i = 0; i < n; i++) b[i + 1] = nums[i];
          int[][] dp = new int[n + 2][n + 2];        // dp[i][j] for 1 <= i <= j <= n, 0 when i > j
          for (int len = 1; len <= n; len++) {
              for (int i = 1; i + len - 1 <= n; i++) {
                  int j = i + len - 1;
                  for (int k = i; k <= j; k++) {     // k bursts LAST inside [i..j]
                      int coins = dp[i][k - 1] + b[i - 1] * b[k] * b[j + 1] + dp[k + 1][j];
                      dp[i][j] = Math.max(dp[i][j], coins);
                  }
              }
          }
          return dp[1][n];
      }`, alt: [{ lang: 'python', code: `def max_coins(nums):
    # Burst Balloons with the "last balloon in the range" idea.
    n = len(nums)
    b = [1] + nums + [1]                           # pad with 1 on both sides
    dp = [[0] * (n + 2) for _ in range(n + 2)]     # dp[i][j] for 1 <= i <= j <= n, 0 when i > j
    for length in range(1, n + 1):
        for i in range(1, n - length + 2):
            j = i + length - 1
            # k bursts LAST inside [i..j]
            dp[i][j] = max(dp[i][k - 1] + b[i - 1] * b[k] * b[j + 1] + dp[k + 1][j] for k in range(i, j + 1))
    return dp[1][n]` }, { lang: 'js', code: `// Burst Balloons with the "last balloon in the range" idea.
function maxCoins(nums) {
  const n = nums.length, b = [1, ...nums, 1];     // pad with 1 on both sides
  const dp = Array.from({ length: n + 2 }, () => new Array(n + 2).fill(0));   // 0 when i > j
  for (let len = 1; len <= n; len++) {
    for (let i = 1; i + len - 1 <= n; i++) {
      const j = i + len - 1;
      for (let k = i; k <= j; k++) {              // k bursts LAST inside [i..j]
        const coins = dp[i][k - 1] + b[i - 1] * b[k] * b[j + 1] + dp[k + 1][j];
        dp[i][j] = Math.max(dp[i][j], coins);
      }
    }
  }
  return dp[1][n];
}` }, { lang: 'cpp', code: `// Burst Balloons with the "last balloon in the range" idea.
int maxCoins(const vector<int>& nums) {
    int n = nums.size();
    vector<int> b(n + 2, 1);                       // pad with 1 on both sides
    for (int i = 0; i < n; i++) b[i + 1] = nums[i];
    vector<vector<int>> dp(n + 2, vector<int>(n + 2, 0));   // 0 when i > j
    for (int len = 1; len <= n; len++)
        for (int i = 1; i + len - 1 <= n; i++) {
            int j = i + len - 1;
            for (int k = i; k <= j; k++)           // k bursts LAST inside [i..j]
                dp[i][j] = max(dp[i][j], dp[i][k - 1] + b[i - 1] * b[k] * b[j + 1] + dp[k + 1][j]);
        }
    return dp[1][n];
}` }] }, { lang: 'python', run: true, title: 'Top-down (memoised) versions in Python (runnable)', code: `from functools import lru_cache

def matrix_chain(p):
    @lru_cache(maxsize=None)
    def best(i, j):                 # min cost for matrices i..j (1-based)
        if i == j:
            return 0
        return min(best(i, k) + best(k + 1, j) + p[i - 1] * p[k] * p[j] for k in range(i, j))
    return best(1, len(p) - 1)

def max_coins(nums):
    b = [1] + nums + [1]
    @lru_cache(maxsize=None)
    def best(i, j):                 # balloons i..j (indices into b), k bursts last
        if i > j:
            return 0
        return max(best(i, k - 1) + b[i - 1] * b[k] * b[j + 1] + best(k + 1, j) for k in range(i, j + 1))
    return best(1, len(nums))

print(matrix_chain([10, 30, 5, 60]))     # 4500
print(matrix_chain([40, 20, 30, 10, 30]))  # 26000
print(max_coins([3, 1, 5, 8]))           # 167
print(max_coins([1, 5]))                 # 10
` }],
    codeTitle: ['Matrix Chain Multiplication with brackets', 'Burst Balloons', 'Memoised versions (Python)'],
    viz: [{
      title: 'Matrix Chain: fill dp[i][j] by range length, trying every split k',
      input: '40 20 30 10 30',
      inputLabel: 'Dimensions p0 p1 … pn (matrix i is p[i-1] × p[i]); 3 to 7 numbers',
      gen: function (input) {
        var p = parseNums(input, 3, 7, 1, 100, 'the dimensions');
        var n = p.length - 1, frames = [], dp = [], sp = [];
        for (var a = 0; a <= n; a++) { dp.push([]); sp.push([]); for (var b = 0; b <= n; b++) { dp[a].push(a === b && a > 0 ? 0 : null); sp[a].push(0); } }
        var head = []; for (var h = 1; h <= n; h++) head.push('A' + h);
        var gridOf = function () { var rows = []; for (var i = 1; i <= n; i++) { var r = []; for (var j = 1; j <= n; j++) r.push(j < i ? '' : (dp[i][j] === null ? '?' : dp[i][j])); rows.push(r); } return rows; };
        var mats = []; for (var m = 1; m <= n; m++) mats.push('A' + m + ': ' + p[m - 1] + '×' + p[m]);
        frames.push({ narr: 'We have ' + n + ' matrices. dp[i][j] = cheapest cost to multiply A<sub>i</sub>..A<sub>j</sub>. The diagonal (one matrix) costs 0. We now fill longer and longer ranges.', parts: [
          { type: 'array', label: 'matrices', values: mats },
          { type: 'grid', label: 'dp (row i, column j)', rows: gridOf(), rowHead: head, colHead: head, hl: (function () { var o = {}; for (var d = 0; d < n; d++) o[d + ',' + d] = 'done'; return o; })() }
        ] });
        for (var len = 2; len <= n; len++) {
          for (var i = 1; i + len - 1 <= n; i++) {
            var j = i + len - 1, best = Infinity, bk = i, tries = [];
            for (var k = i; k < j; k++) {
              var c = dp[i][k] + dp[k + 1][j] + p[i - 1] * p[k] * p[j];
              tries.push('k=' + k + ': ' + dp[i][k] + '+' + dp[k + 1][j] + '+' + p[i - 1] + '·' + p[k] + '·' + p[j] + '=' + c);
              if (c < best) { best = c; bk = k; }
            }
            dp[i][j] = best; sp[i][j] = bk;
            var hl = {}; hl[(i - 1) + ',' + (j - 1)] = 'cur'; hl[(i - 1) + ',' + (bk - 1)] = 'win'; hl[bk + ',' + (j - 1)] = 'win';
            frames.push({ narr: 'Range A' + i + '..A' + j + ' (length ' + len + '). Try each split: ' + tries.join(' | ') + '. Best split k = <b>' + bk + '</b> → dp[' + i + '][' + j + '] = <b>' + best + '</b>. The two blue cells are the sub-answers it used.', parts: [
              { type: 'array', label: 'matrices (blue = this range)', values: mats, range: [i - 1, j - 1], hl: one(bk - 1, 'sel'), ptr: one(bk - 1, 'k') },
              { type: 'grid', label: 'dp', rows: gridOf(), rowHead: head, colHead: head, hl: hl }
            ] });
          }
        }
        var br = (function go(i, j) { if (i === j) return 'A' + i; var k = sp[i][j]; return '(' + go(i, k) + '·' + go(k + 1, j) + ')'; })(1, n);
        frames.push({ narr: 'Answer: dp[1][' + n + '] = <b>' + dp[1][n] + '</b> scalar multiplications, using the brackets <b>' + br + '</b> (rebuilt by following the stored best splits).', parts: [
          { type: 'grid', label: 'dp (final)', rows: gridOf(), rowHead: head, colHead: head, hl: one('0,' + (n - 1), 'sel') },
          { type: 'vars', label: 'answer', vals: { 'min cost': dp[1][n], brackets: br }, hl: { 'min cost': 'sel' } }
        ] });
        return frames;
      }
    }, {
      title: 'Burst Balloons: for every range, which balloon pops LAST?',
      input: '3 1 5 8',
      inputLabel: 'Balloon values (2 to 6 numbers, 0..20)',
      gen: function (input) {
        var nums = parseNums(input, 2, 6, 0, 20, 'the balloons');
        var n = nums.length, b = [1].concat(nums).concat([1]), frames = [], dp = [], last = [];
        for (var a = 0; a <= n + 1; a++) { dp.push([]); last.push([]); for (var c = 0; c <= n + 1; c++) { dp[a].push(a > c ? 0 : null); last[a].push(0); } }
        var head = []; for (var h = 1; h <= n; h++) head.push(String(b[h]) + ' (#' + h + ')');
        var gridOf = function () { var rows = []; for (var i = 1; i <= n; i++) { var r = []; for (var j = 1; j <= n; j++) r.push(j < i ? '' : (dp[i][j] === null ? '?' : dp[i][j])); rows.push(r); } return rows; };
        frames.push({ narr: 'Pad with 1 on both ends: [' + b.join(', ') + ']. dp[i][j] = most coins from bursting ONLY balloons i..j, while balloons i−1 and j+1 are still standing as walls.', parts: [
          { type: 'array', label: 'padded balloons', values: b.slice(), showIdx: true, hl: (function () { var o = {}; o[0] = 'done'; o[n + 1] = 'done'; return o; })() },
          { type: 'grid', label: 'dp (row i, column j)', rows: gridOf(), rowHead: head, colHead: head }
        ] });
        for (var len = 1; len <= n; len++) {
          for (var i = 1; i + len - 1 <= n; i++) {
            var j = i + len - 1, best = -1, bk = i, tries = [];
            for (var k = i; k <= j; k++) {
              var coins = dp[i][k - 1] + b[i - 1] * b[k] * b[j + 1] + dp[k + 1][j];
              tries.push('#' + k + ' last: ' + dp[i][k - 1] + ' + ' + b[i - 1] + '·' + b[k] + '·' + b[j + 1] + ' + ' + dp[k + 1][j] + ' = ' + coins);
              if (coins > best) { best = coins; bk = k; }
            }
            dp[i][j] = best; last[i][j] = bk;
            var arrHl = {}; arrHl[i - 1] = 'cur'; arrHl[j + 1] = 'cur'; arrHl[bk] = 'sel';
            frames.push({ narr: 'Range #' + i + '..#' + j + ' (walls ' + b[i - 1] + ' and ' + b[j + 1] + '). ' + tries.join(' | ') + '. Best: balloon #' + bk + ' (value ' + b[bk] + ') bursts last → dp = <b>' + best + '</b>.', parts: [
              { type: 'array', label: 'padded balloons (amber = walls, purple = last to pop)', values: b.slice(), showIdx: true, range: [i, j], hl: arrHl },
              { type: 'grid', label: 'dp', rows: gridOf(), rowHead: head, colHead: head, hl: one((i - 1) + ',' + (j - 1), 'cur') }
            ] });
          }
        }
        var order = [];
        (function go(i, j) { if (i > j) return; var k = last[i][j]; go(i, k - 1); go(k + 1, j); order.push(b[k]); })(1, n);
        frames.push({ narr: 'Answer dp[1][' + n + '] = <b>' + dp[1][n] + '</b>. One optimal bursting order (inner ranges first, the “last” balloon at the end): <b>' + order.join(' → ') + '</b>.', parts: [
          { type: 'grid', label: 'dp (final)', rows: gridOf(), rowHead: head, colHead: head, hl: one('0,' + (n - 1), 'sel') },
          { type: 'vars', label: 'answer', vals: { 'max coins': dp[1][n], 'burst order': order.join(' → ') }, hl: { 'max coins': 'sel' } }
        ] });
        return frames;
      }
    }],
    examples: [
      {
        title: 'MCM with 4 matrices: p = [40, 20, 30, 10, 30]',
        html: `${H.table(['range', 'best split', 'cost'], [['A1A2', '—', '40·20·30 = 24000'], ['A2A3', '—', '20·30·10 = 6000'], ['A3A4', '—', '30·10·30 = 9000'], ['A1..A3', 'A1(A2A3)', '6000 + 40·20·10 = 14000'], ['A2..A4', '(A2A3)A4', '6000 + 20·10·30 = 12000'], ['A1..A4', '(A1(A2A3))A4', '14000 + 40·10·30 = ' + H.c('g', '26000')]])}
          <p>Notice how each length-3 row reuses length-2 answers and the final answer reuses length-3 answers. Run the visualizer with this input to see every split tried.</p>`
      },
      {
        title: 'Why “first balloon” fails and “last balloon” works',
        html: `<p>nums = [3, 1, 5]. If we say “burst 1 first” we earn 3·1·5 = 15, and then 3 and 5 become neighbours — the left side (3) and right side (5) <b>interact</b>, so we cannot solve them separately.</p>
          <p>If we say “5 bursts <b>last</b> in [3, 1, 5]”, then while 3 and 1 are bursting, 5 stands still as the right wall: sub-problem [3, 1] with walls (1, 5) is independent. Finally 5 bursts with neighbours 1 and 1: 1·5·1 = 5. Best overall: 1 first (15), then 3 (1·3·5 = 15), then 5 (5) = ${H.c('g', '35')}.</p>`
      },
      {
        title: 'Minimum Cost to Cut a Stick (same skeleton)',
        html: `<p>Stick length 7, cuts at [1, 3, 4, 5]. Each cut costs the <b>current</b> stick length. Add the ends and sort: c = [0, 1, 3, 4, 5, 7]. <code>dp[i][j]</code> = min cost to make all cuts strictly between c[i] and c[j]: <code>min over k of dp[i][k] + dp[k][j] + (c[j] − c[i])</code>. Answer ${H.c('g', '16')} (cut at 3 first: 7, then 1 at length 3: 3, then 5 on 3..7: 4, then 4 on 3..5: 2 → 16).</p>`,
        code: { lang: 'java', code: `static int minCostCut(int n, int[] cuts) {
    int m = cuts.length;
    int[] c = new int[m + 2];
    c[0] = 0; c[m + 1] = n;
    int[] sorted = cuts.clone(); Arrays.sort(sorted);
    for (int i = 0; i < m; i++) c[i + 1] = sorted[i];
    int[][] dp = new int[m + 2][m + 2];          // dp[i][j]: cuts strictly between c[i] and c[j]
    for (int len = 2; len <= m + 1; len++) {
        for (int i = 0; i + len <= m + 1; i++) {
            int j = i + len;
            dp[i][j] = Integer.MAX_VALUE;
            for (int k = i + 1; k < j; k++)        // first cut made at c[k]
                dp[i][j] = Math.min(dp[i][j], dp[i][k] + dp[k][j] + c[j] - c[i]);
        }
    }
    return dp[0][m + 1];
}`, alt: [{ lang: 'python', code: `def min_cost_cut(n, cuts):
    c = [0] + sorted(cuts) + [n]
    m = len(c)
    dp = [[0] * m for _ in range(m)]             # dp[i][j]: cuts strictly between c[i] and c[j]
    for length in range(2, m):
        for i in range(m - length):
            j = i + length
            # first cut made at c[k]
            dp[i][j] = min(dp[i][k] + dp[k][j] for k in range(i + 1, j)) + c[j] - c[i]
    return dp[0][m - 1]` }, { lang: 'js', code: `function minCostCut(n, cuts) {
  const c = [0, ...[...cuts].sort((a, b) => a - b), n];   // numeric sort
  const m = c.length;
  const dp = Array.from({ length: m }, () => new Array(m).fill(0));   // cuts strictly between c[i] and c[j]
  for (let len = 2; len < m; len++) {
    for (let i = 0; i + len < m; i++) {
      const j = i + len;
      dp[i][j] = Infinity;
      for (let k = i + 1; k < j; k++)              // first cut made at c[k]
        dp[i][j] = Math.min(dp[i][j], dp[i][k] + dp[k][j] + c[j] - c[i]);
    }
  }
  return dp[0][m - 1];
}` }, { lang: 'cpp', code: `int minCostCut(int n, vector<int> cuts) {
    sort(cuts.begin(), cuts.end());
    vector<int> c = {0};
    c.insert(c.end(), cuts.begin(), cuts.end());
    c.push_back(n);
    int m = c.size();
    vector<vector<int>> dp(m, vector<int>(m, 0));  // dp[i][j]: cuts strictly between c[i] and c[j]
    for (int len = 2; len < m; len++)
        for (int i = 0; i + len < m; i++) {
            int j = i + len;
            dp[i][j] = INT_MAX;
            for (int k = i + 1; k < j; k++)          // first cut made at c[k]
                dp[i][j] = min(dp[i][j], dp[i][k] + dp[k][j] + c[j] - c[i]);
        }
    return dp[0][m - 1];
}` }] }
      },
      {
        title: 'Minimum Score Triangulation of a polygon',
        html: `<p>Vertex values [1, 3, 1, 4, 1, 5]. Any triangulation of polygon i..j has exactly one triangle using the edge (i, j); its third vertex k splits the polygon into i..k and k..j. <code>dp[i][j] = min(dp[i][k] + dp[k][j] + v[i]·v[k]·v[j])</code>. Answer ${H.c('g', '13')}. It is literally MCM in disguise (a chain of n−1 matrices ↔ triangulating an (n+1)-gon).</p>`
      }
    ],
    deepDive: `<p><b>Order of filling.</b> Any order works as long as dp[i][k] and dp[k+1][j] are ready before dp[i][j]. “By length” is the safest. An equivalent trick: loop <code>i</code> from n down to 1 and <code>j</code> from i up to n — row i only needs rows below it and columns to its left.</p>
      <p><b>Complexity.</b> O(N²) states × O(N) splits = O(N³) time, O(N²) memory. N = 500 → 1.25·10<sup>8</sup>/6 ≈ 2·10<sup>7</sup> inner steps for the triangle of (i ≤ k &lt; j) — well under a second in Java or C++, a few seconds in JavaScript at worst, and slow enough in plain Python that tight loops (or <code>min</code> over a generator) matter.</p>
      <p><b>Knuth–Yao speed-up.</b> When the cost satisfies the quadrangle inequality and monotonicity (optimal BST, some merge problems), the best split obeys <code>opt[i][j−1] ≤ opt[i][j] ≤ opt[i+1][j]</code>, so scanning only that window brings the total to O(N²). MCM does <b>not</b> satisfy it in general (Hu–Shing solve MCM in O(N log N) with a polygon-based algorithm — good trivia, never asked to code).</p>
      <p><b>The “last action” trick</b> generalises: Burst Balloons, Remove Boxes (needs an extra dimension for “how many equal boxes are glued to the right”), Strange Printer, Zuma. When removing something changes neighbours, ask which element is handled <b>last</b> in the range so it can serve as a stable boundary.</p>
      <p><b>Merge Stones (k piles at a time)</b> adds feasibility: a range of length L can be merged into one pile only if (L − 1) % (k − 1) == 0. Expert-level interval problems often hide such a counting condition.</p>
      <p><b>Production reality.</b> Database query optimisers choose join orders with exactly this dp (Selinger-style dynamic programming over subsets/ranges of relations); compilers use MCM-like dp for expression evaluation order; CYK parsing of context-free grammars is interval DP over substrings.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI tools write the triple loop correctly for textbook MCM. The value you add is <b>modelling</b>: noticing that “cut a stick” needs the cut positions sorted and the ends added, that balloons need the “last burst” flip, and that a problem is interval-shaped at all.</p>
      <p><b>Use AI as a partner:</b> <code>Here is my recurrence for Burst Balloons. Try to find a 3-element counterexample where choosing the FIRST balloon to burst gives a different (wrong) recurrence.</code> Or ask it to brute-force all permutations for N ≤ 7 and compare against your dp — cheap, reliable testing.</p>
      <p><b>Where AI goes wrong:</b> filling the table row by row from i = 0 upward (reading cells that are not computed yet); <code>int</code> overflow in MCM costs (use long); off-by-one in the padded indices; forgetting dp[i][j] = 0 when i &gt; j.</p>
      <p><b>What you must still own:</b> drawing the 2D table and arrows on the whiteboard, explaining why sub-ranges are independent, and choosing the fill order.</p>`,
    problems: [{
      title: 'Burst Balloons', level: 'Hard', tags: ['interval dp', 'dp'], companies: ['Google', 'Amazon', 'Microsoft', 'Snap'],
      statement: `<p>You have <code>n</code> balloons with values <code>nums[i]</code>. Bursting balloon i gives <code>nums[left] · nums[i] · nums[right]</code> coins, where left/right are its <b>current</b> neighbours (treat missing neighbours as value 1). After bursting, its neighbours become adjacent. Return the maximum coins from bursting all balloons.</p>`,
      constraints: `1 ≤ n ≤ 300, 0 ≤ nums[i] ≤ 100. O(N³) is intended.`,
      example: `${H.arr([3, 1, 5, 8], { label: 'nums' })}<p>Output <b>167</b>: burst 1 → 3·1·5 = 15, then 5 → 3·5·8 = 120, then 3 → 1·3·8 = 24, then 8 → 1·8·1 = 8. Total ${H.c('g', '167')}.</p>`,
      brute: {
        why: `<p>Try every bursting order: n! permutations (300! is absurd, even 10! = 3.6 million). The wasted work: after some balloons are gone, the same remaining <b>set</b> is reached through many different orders and solved again each time.</p>`,
        code: { lang: 'java', code: `class Brute {
    int best(List<Integer> list) {
        if (list.isEmpty()) return 0;
        int ans = 0;
        for (int i = 0; i < list.size(); i++) {
            int left = i > 0 ? list.get(i - 1) : 1;
            int right = i + 1 < list.size() ? list.get(i + 1) : 1;
            List<Integer> rest = new ArrayList<>(list);
            int mid = rest.remove(i);                 // burst balloon i now
            ans = Math.max(ans, left * mid * right + best(rest));
        }
        return ans;
    }
    public int maxCoins(int[] nums) {
        List<Integer> list = new ArrayList<>();
        for (int x : nums) list.add(x);
        return best(list);
    }
}`, alt: [
          { lang: 'python', code: `def best(lst):
    if not lst:
        return 0
    ans = 0
    for i in range(len(lst)):
        left = lst[i - 1] if i > 0 else 1
        right = lst[i + 1] if i + 1 < len(lst) else 1
        mid = lst[i]
        rest = lst[:i] + lst[i + 1:]                  # burst balloon i now
        ans = max(ans, left * mid * right + best(rest))
    return ans

def max_coins(nums):
    return best(list(nums))` },
          { lang: 'js', code: `function best(list) {
  if (list.length === 0) return 0;
  let ans = 0;
  for (let i = 0; i < list.length; i++) {
    const left = i > 0 ? list[i - 1] : 1;
    const right = i + 1 < list.length ? list[i + 1] : 1;
    const rest = [...list];
    const mid = rest.splice(i, 1)[0];                 // burst balloon i now
    ans = Math.max(ans, left * mid * right + best(rest));
  }
  return ans;
}

function maxCoins(nums) { return best([...nums]); }` },
          { lang: 'cpp', code: `class Brute {
    int best(vector<int> list) {
        if (list.empty()) return 0;
        int ans = 0;
        for (int i = 0; i < (int)list.size(); i++) {
            int left = i > 0 ? list[i - 1] : 1;
            int right = i + 1 < (int)list.size() ? list[i + 1] : 1;
            vector<int> rest = list;
            int mid = rest[i];
            rest.erase(rest.begin() + i);             // burst balloon i now
            ans = max(ans, left * mid * right + best(rest));
        }
        return ans;
    }
public:
    int maxCoins(vector<int>& nums) { return best(nums); }
};` }
        ] }
      },
      mcq: { q: 'In range [i..j], balloon k bursts LAST. Who are its neighbours at that moment?', options: ['nums[i−1] and nums[j+1] (just outside the range)', 'nums[k−1] and nums[k+1]', 'The largest balloons in the range', 'Always 1 and 1'], answer: 0, explain: 'All other balloons in [i..j] are gone, so k touches the first balloons outside the range, which are still standing by definition of the sub-problem.' },
      hints: [
        `<p>Hint 1: picking the <b>first</b> balloon to burst makes the two sides interact. Pick the balloon that bursts <b>last</b> in a range — it acts as a wall that keeps the two sides independent.</p>`,
        `<p>Hint 2: pad the array with 1 at both ends. <code>dp[i][j]</code> = best for balloons i..j assuming i−1 and j+1 are still alive. Transition over k in [i..j].</p>`,
        `<p>Hint 3: fill by increasing length; dp is 0 for empty ranges (i &gt; j). Recipe: for len 1..n, for i, j = i+len−1, for k in i..j: dp[i][j] = max(dp[i][k−1] + b[i−1]·b[k]·b[j+1] + dp[k+1][j]). Answer dp[1][n].</p>`
      ],
      solution: {
        approach: `<p>Interval DP with the “last balloon” trick. Use a padded array b of size n+2 and a (n+2)×(n+2) table so that dp[i][k−1] and dp[k+1][j] are always in bounds (empty ranges stay 0).</p>`,
        code: `class Solution {
    public int maxCoins(int[] nums) {
        int n = nums.length;
        int[] b = new int[n + 2];
        b[0] = 1; b[n + 1] = 1;
        for (int i = 0; i < n; i++) b[i + 1] = nums[i];
        int[][] dp = new int[n + 2][n + 2];
        for (int len = 1; len <= n; len++) {
            for (int i = 1; i + len - 1 <= n; i++) {
                int j = i + len - 1;
                int best = 0;
                for (int k = i; k <= j; k++) {
                    // k is the last balloon in [i..j]; its neighbours are b[i-1] and b[j+1]
                    best = Math.max(best, dp[i][k - 1] + b[i - 1] * b[k] * b[j + 1] + dp[k + 1][j]);
                }
                dp[i][j] = best;
            }
        }
        return dp[1][n];
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def max_coins(self, nums):
        b = [1] + nums + [1]
        n = len(nums)
        dp = [[0] * (n + 2) for _ in range(n + 2)]
        for length in range(1, n + 1):
            for i in range(1, n - length + 2):
                j = i + length - 1
                dp[i][j] = max(dp[i][k - 1] + b[i - 1] * b[k] * b[j + 1] + dp[k + 1][j]
                               for k in range(i, j + 1))
        return dp[1][n]` }, { lang: 'js', code: `function maxCoins(nums) {
  const n = nums.length;
  const b = [1, ...nums, 1];                       // pad with 1 on both sides
  const dp = Array.from({ length: n + 2 }, () => new Int32Array(n + 2));
  for (let len = 1; len <= n; len++) {
    for (let i = 1; i + len - 1 <= n; i++) {
      const j = i + len - 1;
      let best = 0;
      for (let k = i; k <= j; k++) {               // k bursts LAST; walls are b[i-1] and b[j+1]
        best = Math.max(best, dp[i][k - 1] + b[i - 1] * b[k] * b[j + 1] + dp[k + 1][j]);
      }
      dp[i][j] = best;
    }
  }
  return dp[1][n];
}` }, { lang: 'cpp', code: `class Solution {
public:
    int maxCoins(vector<int>& nums) {
        int n = nums.size();
        vector<int> b(n + 2, 1);                       // pad with 1 on both sides
        for (int i = 0; i < n; i++) b[i + 1] = nums[i];
        vector<vector<int>> dp(n + 2, vector<int>(n + 2, 0));
        for (int len = 1; len <= n; len++) {
            for (int i = 1; i + len - 1 <= n; i++) {
                int j = i + len - 1, best = 0;
                for (int k = i; k <= j; k++)           // k bursts LAST; walls are b[i-1] and b[j+1]
                    best = max(best, dp[i][k - 1] + b[i - 1] * b[k] * b[j + 1] + dp[k + 1][j]);
                dp[i][j] = best;
            }
        }
        return dp[1][n];
    }
};` }],
        dry: { head: ['range (values)', 'walls', 'best last k', 'dp'], rows: [
          ['[3]', '1, 1', '3', '3'], ['[1]', '3, 5', '1', '15'], ['[5]', '1, 8', '5', '40'], ['[8]', '5, 1', '8', '40'],
          ['[3,1]', '1, 5', '3 last: 15 + 15 = 30', '30'], ['[1,5]', '3, 8', '5 last: 15 + 120 = 135', '135'], ['[5,8]', '1, 1', '8 last: 40 + 8 = 48', '48'],
          ['[3,1,5]', '1, 8', '3 last: 0 + 1·3·8 + 135 = 159', '159'], ['[1,5,8]', '3, 1', '8 last: 135 + 3·8·1 = 159', '159'],
          ['[3,1,5,8]', '1, 1', '8 last: 159 + 1·8·1 = 167 (3 last gives 162, 5 last 75, 1 last 52)', '<span class="c-g">167</span>']
        ] },
        complexity: `<p>Time O(N³) (≈ 4.5·10<sup>6</sup> steps for N = 300). Space O(N²).</p>`,
        followUps: ['Print the bursting order.', 'What if coins were left + i + right instead of a product?', 'Remove Boxes (LC 546) — why does it need a third dp dimension?']
      },
      tests: { sig: 'int[] -> int', fn: 'maxCoins', cases: [
        [[[3, 1, 5, 8]], 167],
        [[[1, 5]], 10],
        [[[5]], 5],
        [[[0]], 0],
        [[[3, 1, 5]], 35],
        [[[0, 0, 0]], 0],
        [[[9, 76, 64, 21]], 116718],
        [[[7, 9, 8, 0, 7, 1, 3, 5, 5, 2, 3]], 1654],
        [[{ $rep: 100, n: 10 }], 8010100],
        [[{ $rep: 100, n: 300 }], 298010100]
      ] }
    }]
  });

  // ================= TOPIC 4: DP on Trees =================
  topics.push({
    title: 'DP on Trees: House Robber III and Binary Tree Maximum Path Sum (children report, parent decides)',
    analogy: `<p>Picture a <b>company org chart</b> planning a party. Every manager asks each of their direct reports for a short report: “here is the best fun our team can bring <b>if I come</b>, and here is the best <b>if I stay home</b>.” The manager combines those two numbers from each child into their own two numbers and passes them upward. The CEO at the top only has to read two numbers to know the best party for the whole company.</p>
      <p>Nobody looks at the whole tree at once. Each node only talks to its <b>children</b> — that is tree DP.</p>`,
    explain: `<p><b>Tree DP</b> = run a <b>post-order DFS</b> (children first, then the parent). Each call <b>returns a small summary</b> of its subtree; the parent combines its children’s summaries. Because every subtree is solved exactly once, the total is <b>O(N)</b>.</p>
      <p>The art is choosing <b>what to return</b>. If the parent’s decision depends on a choice made at the child (was the child robbed? does the path go through it?), return one value <b>per choice</b>.</p>
      <h4>House Robber III — return a pair</h4>
      <p>Houses form a binary tree; you cannot rob a node and its direct child on the same night. For each node return <code>[rob, skip]</code>:</p>
      <ul>
        <li><code>rob = node.val + left.skip + right.skip</code> (if I am robbed, my children must be skipped)</li>
        <li><code>skip = max(left.rob, left.skip) + max(right.rob, right.skip)</code> (if I am skipped, each child picks its own best)</li>
      </ul>
      <p>Answer at the root: <code>max(rob, skip)</code>. A missing child returns <code>[0, 0]</code>.</p>
      ${H.table(['node', 'left [rob, skip]', 'right [rob, skip]', 'rob', 'skip'], [
        ['leaf 3', '[0,0]', '[0,0]', '3', '0'], ['leaf 1', '[0,0]', '[0,0]', '1', '0'],
        ['2 (right child 3)', '[0,0]', '[3,0]', '2 + 0 + 0 = 2', '0 + 3 = 3'], ['3 (right child 1)', '[0,0]', '[1,0]', '3 + 0 = 3', '1'],
        ['root 3', '[2,3]', '[3,1]', '3 + 3 + 1 = ' + H.c('g', '7'), 'max(2,3) + max(3,1) = 6']
      ])}
      <h4>Binary Tree Maximum Path Sum — return one thing, record another</h4>
      <p>A path can bend at one node (go up from the left, through the node, down to the right) but cannot branch. For each node compute <code>gain</code> = best sum of a path that <b>starts at this node and goes down one side</b>:</p>
      <p><code>gain(node) = node.val + max(0, gain(left), gain(right))</code> — the <code>max(0, …)</code> means “if a child’s branch is negative, just don’t take it”.</p>
      <p>The best path that <b>bends at this node</b> is <code>node.val + max(0, gain(left)) + max(0, gain(right))</code>. Update a global answer with it, but <b>return only the one-sided gain</b> to the parent (a parent cannot use a path that already bent — it would branch).</p>
      <p>This “<b>return the extendable part, record the complete part</b>” split is the single most important idea in tree DP. Diameter of a tree, longest univalue path, and longest zig-zag path all use it.</p>`,
    clues: [
      '"Binary tree" + "cannot pick a node and its <b>parent/child</b> together" → return [take, skip] pairs.',
      '"<b>Path</b> may start and end at <b>any</b> node" (max path sum, diameter, longest univalue path) → return one-sided gain, update a global with the two-sided bend.',
      '"Minimum number of cameras / guards / colours so every node is covered" → return a small state per node (covered / has camera / needs cover).',
      'N up to 10<sup>4</sup>–10<sup>5</sup> nodes → O(N) post-order DFS; deep skewed trees → watch recursion depth (iterative post-order or bigger stack).',
      '"Answer for <b>every</b> node as the root" (sum of distances in tree) → tree DP + <b>rerooting</b> (second pass top-down).',
      'Recursion that recomputes the same grandchild many times (plain recursion for House Robber III) → memoise or return pairs.'
    ],
    code: [{ lang: 'java', code: `
      // House Robber III: each call returns {robThisNode, skipThisNode}.
      static int rob(TreeNode root) {
          int[] r = dfs(root);
          return Math.max(r[0], r[1]);
      }

      static int[] dfs(TreeNode node) {
          if (node == null) return new int[]{0, 0};       // empty subtree gives nothing
          int[] L = dfs(node.left), R = dfs(node.right);   // children first (post-order)
          int robIt = node.val + L[1] + R[1];              // rob me -> children must be skipped
          int skipIt = Math.max(L[0], L[1]) + Math.max(R[0], R[1]);  // skip me -> children free
          return new int[]{robIt, skipIt};
      }`, alt: [{ lang: 'python', code: `# House Robber III: each call returns (rob_this_node, skip_this_node).
def rob(root):
    return max(dfs(root))

def dfs(node):
    if node is None:
        return (0, 0)                              # empty subtree gives nothing
    l_rob, l_skip = dfs(node.left)                 # children first (post-order)
    r_rob, r_skip = dfs(node.right)
    rob_it = node.val + l_skip + r_skip            # rob me -> children must be skipped
    skip_it = max(l_rob, l_skip) + max(r_rob, r_skip)   # skip me -> children free
    return (rob_it, skip_it)` }, { lang: 'js', code: `// House Robber III: each call returns [robThisNode, skipThisNode].
function rob(root) {
  return Math.max(...dfs(root));
}

function dfs(node) {
  if (!node) return [0, 0];                        // empty subtree gives nothing
  const [lRob, lSkip] = dfs(node.left);            // children first (post-order)
  const [rRob, rSkip] = dfs(node.right);
  const robIt = node.val + lSkip + rSkip;          // rob me -> children must be skipped
  const skipIt = Math.max(lRob, lSkip) + Math.max(rRob, rSkip);   // skip me -> children free
  return [robIt, skipIt];
}` }, { lang: 'cpp', code: `// House Robber III: each call returns {robThisNode, skipThisNode}.
pair<int, int> dfs(TreeNode* node) {
    if (!node) return {0, 0};                      // empty subtree gives nothing
    auto [lRob, lSkip] = dfs(node->left);          // children first (post-order)
    auto [rRob, rSkip] = dfs(node->right);
    int robIt = node->val + lSkip + rSkip;         // rob me -> children must be skipped
    int skipIt = max(lRob, lSkip) + max(rRob, rSkip);   // skip me -> children free
    return {robIt, skipIt};
}

int rob(TreeNode* root) {
    auto [r, s] = dfs(root);
    return max(r, s);
}` }] }, { lang: 'java', code: `
      // Binary Tree Maximum Path Sum: return one-sided gain, record the bent path globally.
      class MaxPath {
          private int best = Integer.MIN_VALUE;

          int maxPathSum(TreeNode root) {
              gain(root);
              return best;
          }

          private int gain(TreeNode node) {
              if (node == null) return 0;
              int left = Math.max(0, gain(node.left));     // drop negative branches
              int right = Math.max(0, gain(node.right));
              best = Math.max(best, node.val + left + right); // path that bends here (complete)
              return node.val + Math.max(left, right);        // path the parent can extend (one side)
          }
      }`, alt: [{ lang: 'python', code: `# Binary Tree Maximum Path Sum: return one-sided gain, record the bent path globally.
class MaxPath:
    def __init__(self):
        self.best = float('-inf')

    def max_path_sum(self, root):
        self.gain(root)
        return self.best

    def gain(self, node):
        if node is None:
            return 0
        left = max(0, self.gain(node.left))        # drop negative branches
        right = max(0, self.gain(node.right))
        self.best = max(self.best, node.val + left + right)   # path that bends here (complete)
        return node.val + max(left, right)         # path the parent can extend (one side)` }, { lang: 'js', code: `// Binary Tree Maximum Path Sum: return one-sided gain, record the bent path globally.
class MaxPath {
  best = -Infinity;

  maxPathSum(root) {
    this.gain(root);
    return this.best;
  }

  gain(node) {
    if (!node) return 0;
    const left = Math.max(0, this.gain(node.left));    // drop negative branches
    const right = Math.max(0, this.gain(node.right));
    this.best = Math.max(this.best, node.val + left + right);   // path that bends here (complete)
    return node.val + Math.max(left, right);           // path the parent can extend (one side)
  }
}` }, { lang: 'cpp', code: `// Binary Tree Maximum Path Sum: return one-sided gain, record the bent path globally.
class MaxPath {
    int best = INT_MIN;

    int gain(TreeNode* node) {
        if (!node) return 0;
        int left = max(0, gain(node->left));       // drop negative branches
        int right = max(0, gain(node->right));
        best = max(best, node->val + left + right); // path that bends here (complete)
        return node->val + max(left, right);        // path the parent can extend (one side)
    }

public:
    int maxPathSum(TreeNode* root) {
        gain(root);
        return best;
    }
};` }] }, { lang: 'python', run: true, title: 'Both, on trees built from heap-layout arrays (runnable)', code: `class Node:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def build(arr, i=0):
    # heap layout: children of i are 2i+1 and 2i+2, None = missing
    if i >= len(arr) or arr[i] is None:
        return None
    return Node(arr[i], build(arr, 2 * i + 1), build(arr, 2 * i + 2))

def rob(root):
    def dfs(n):
        if not n:
            return (0, 0)
        lr, ls = dfs(n.left)
        rr, rs = dfs(n.right)
        return (n.val + ls + rs, max(lr, ls) + max(rr, rs))
    return max(dfs(root))

def max_path_sum(root):
    best = float('-inf')
    def gain(n):
        nonlocal best
        if not n:
            return 0
        l, r = max(0, gain(n.left)), max(0, gain(n.right))
        best = max(best, n.val + l + r)
        return n.val + max(l, r)
    gain(root)
    return best

print(rob(build([3, 2, 3, None, 3, None, 1])))        # 7
print(rob(build([3, 4, 5, 1, 3, None, 1])))           # 9
print(max_path_sum(build([-10, 9, 20, None, None, 15, 7])))  # 42
print(max_path_sum(build([-3])))                      # -3
` }],
    codeTitle: ['House Robber III', 'Max Path Sum', 'Python, runnable'],
    viz: [{
      title: 'House Robber III: post-order, every node reports [rob, skip] to its parent',
      input: '3 4 5 1 3 null 1',
      inputLabel: 'Tree in heap layout (children of i are 2i+1, 2i+2; null = empty), ≤ 15 slots, values ≥ 0',
      gen: function (input) {
        var arr = parseTree(input);
        if (arr.some(function (v) { return v !== null && v < 0; })) throw new Error('House values must be ≥ 0');
        var order = postOrder(arr), R = {}, S = {}, frames = [], tags = {}, hl = {};
        var val = function (i) { return (i < arr.length && arr[i] !== null) ? i : -1; };
        frames.push({ narr: 'We visit nodes in <b>post-order</b> (children before parent): ' + order.map(function (i) { return arr[i]; }).join(', ') + '. Each node will report two numbers: <b>r</b> = best if this house IS robbed, <b>s</b> = best if it is skipped.', parts: [
          { type: 'tree', label: 'houses', arr: arr.slice() }
        ] });
        order.forEach(function (i) {
          var l = val(2 * i + 1), r = val(2 * i + 2);
          var lr = l >= 0 ? R[l] : 0, ls = l >= 0 ? S[l] : 0, rr = r >= 0 ? R[r] : 0, rs = r >= 0 ? S[r] : 0;
          R[i] = arr[i] + ls + rs;
          S[i] = Math.max(lr, ls) + Math.max(rr, rs);
          tags[i] = 'r' + R[i] + ' s' + S[i];
          var h = {}; Object.keys(hl).forEach(function (k) { h[k] = 'done'; });
          h[i] = 'cur'; if (l >= 0) h[l] = 'win'; if (r >= 0) h[r] = 'win';
          hl[i] = 'done';
          var ehl = {}; if (l >= 0) ehl[l] = 'ok'; if (r >= 0) ehl[r] = 'ok';
          frames.push({
            narr: 'Node ' + arr[i] + ': children report ' + (l >= 0 ? 'left [r' + lr + ', s' + ls + ']' : 'no left') + ', ' + (r >= 0 ? 'right [r' + rr + ', s' + rs + ']' : 'no right') + '. ' +
              '<b>rob</b> = ' + arr[i] + ' + ' + ls + ' + ' + rs + ' = ' + R[i] + ' (children must be skipped). <b>skip</b> = max(' + lr + ',' + ls + ') + max(' + rr + ',' + rs + ') = ' + S[i] + '.',
            parts: [
              { type: 'tree', label: 'houses (tags: r = rob, s = skip)', arr: arr.slice(), hl: h, ehl: ehl, tags: JSON.parse(JSON.stringify(tags)) },
              { type: 'vars', label: 'this node', vals: { node: arr[i], rob: R[i], skip: S[i] }, hl: { rob: R[i] >= S[i] ? 'ok' : '', skip: S[i] > R[i] ? 'ok' : '' } }
            ]
          });
        });
        // reconstruct which houses are robbed
        var robbed = {};
        (function pick(i, parentRobbed) {
          if (val(i) < 0) return;
          var take = !parentRobbed && R[i] >= S[i];
          if (take) robbed[i] = 'sel';
          pick(2 * i + 1, take); pick(2 * i + 2, take);
        })(0, false);
        var names = Object.keys(robbed).map(function (k) { return arr[k]; });
        frames.push({ narr: 'Root answer = max(rob ' + R[0] + ', skip ' + S[0] + ') = <b>' + Math.max(R[0], S[0]) + '</b>. Walking back down (rob a node only if its parent was not robbed and robbing is better) picks the purple houses: ' + names.join(' + ') + '.', parts: [
          { type: 'tree', label: 'purple = robbed', arr: arr.slice(), hl: robbed, tags: tags },
          { type: 'vars', label: 'answer', vals: { 'max money': Math.max(R[0], S[0]) }, hl: { 'max money': 'sel' } }
        ] });
        return frames;
      }
    }, {
      title: 'Max Path Sum: return the one-sided gain, record the bent path',
      input: '-10 9 20 null null 15 7',
      inputLabel: 'Tree in heap layout (children of i are 2i+1, 2i+2; null = empty), ≤ 15 slots',
      gen: function (input) {
        var arr = parseTree(input);
        var order = postOrder(arr), G = {}, frames = [], tags = {}, best = -Infinity, bestAt = 0, doneSet = {};
        var val = function (i) { return (i < arr.length && arr[i] !== null) ? i : -1; };
        frames.push({ narr: 'gain(node) = node + max(0, best child gain) — the best path that starts at node and goes DOWN one side. At each node we also check the path that <b>bends</b> there: node + left + right (negative sides dropped).', parts: [
          { type: 'tree', label: 'tree', arr: arr.slice() },
          { type: 'vars', label: 'global', vals: { best: '−∞' } }
        ] });
        order.forEach(function (i) {
          var l = val(2 * i + 1), r = val(2 * i + 2);
          var gl = l >= 0 ? Math.max(0, G[l]) : 0, gr = r >= 0 ? Math.max(0, G[r]) : 0;
          var bend = arr[i] + gl + gr, improved = bend > best;
          if (improved) { best = bend; bestAt = i; }
          G[i] = arr[i] + Math.max(gl, gr);
          tags[i] = 'g' + G[i];
          var h = {}; Object.keys(doneSet).forEach(function (k) { h[k] = 'done'; }); h[i] = 'cur';
          doneSet[i] = 1;
          if (l >= 0) h[l] = gl > 0 ? 'ok' : 'bad';
          if (r >= 0) h[r] = gr > 0 ? 'ok' : 'bad';
          frames.push({
            narr: 'Node ' + arr[i] + ': left gain used = ' + gl + ', right gain used = ' + gr + (l >= 0 && G[l] < 0 ? ' (left was negative → dropped)' : '') + (r >= 0 && G[r] < 0 ? ' (right was negative → dropped)' : '') +
              '. Bent path here = ' + arr[i] + ' + ' + gl + ' + ' + gr + ' = <b>' + bend + '</b>' + (improved ? ' <span class="c-g">→ new best!</span>' : '') + '. Return to parent only the one-sided gain = ' + arr[i] + ' + max(' + gl + ', ' + gr + ') = <b>' + G[i] + '</b>.',
            parts: [
              { type: 'tree', label: 'tags: g = gain returned upward', arr: arr.slice(), hl: h, tags: JSON.parse(JSON.stringify(tags)) },
              { type: 'vars', label: 'state', vals: { node: arr[i], 'bent path': bend, 'returned gain': G[i], best: best }, hl: { best: improved ? 'ok' : '' } }
            ]
          });
        });
        var fin = {}; fin[bestAt] = 'sel';
        frames.push({ narr: 'Done. The maximum path sum is <b>' + best + '</b>, bending at node ' + arr[bestAt] + '. Note the root\'s own gain (' + G[0] + ') is NOT the answer — the best path does not have to pass through the root.', parts: [
          { type: 'tree', label: 'purple = where the best path bends', arr: arr.slice(), hl: fin, tags: tags },
          { type: 'vars', label: 'answer', vals: { 'max path sum': best }, hl: { 'max path sum': 'sel' } }
        ] });
        return frames;
      }
    }],
    examples: [
      {
        title: 'House Robber III on [3, 4, 5, 1, 3, null, 1]',
        html: `${H.table(['node', 'rob', 'skip'], [['1 (leaf)', '1', '0'], ['3 (leaf)', '3', '0'], ['1 (leaf under 5)', '1', '0'], ['4', '4 + 0 + 0 = 4', '1 + 3 = 4'], ['5', '5 + 0 = 5', '1'], ['root 3', '3 + 4 + 1 = 8', 'max(4,4) + max(5,1) = ' + H.c('g', '9')]])}
          <p>Answer ${H.c('g', '9')}: rob 4 and 5 (the two children) and skip the root. A greedy “rob every other level” would give 3 + 1 + 3 + 1 = 8 — worse.</p>`
      },
      {
        title: 'Why plain recursion is slow (and pairs fix it)',
        html: `<p>The textbook first attempt: <code>rob(node) = max(node.val + rob(grandchildren), rob(children))</code>. Each grandchild is solved once from its grandparent and again from its parent, and that doubling compounds level after level — exponential on a deep tree.</p>
          <p>Returning <code>[rob, skip]</code> means each node is visited exactly <b>once</b>: O(N). Same idea as memoisation, but no hash map is needed because the parent receives everything it needs directly.</p>`
      },
      {
        title: 'Max path sum with negatives: [-10, 9, 20, null, null, 15, 7]',
        html: `<p>Gains: 9 → 9; 15 → 15; 7 → 7; 20 → 20 + max(15, 7) = 35 (bend at 20: 15 + 20 + 7 = ${H.c('g', '42')}); root −10 → bend = −10 + 9 + 35 = 34. Best = ${H.c('g', '42')} — the path 15 → 20 → 7 never touches the root.</p>
          <p>All-negative tree [−3]: the path must contain at least one node, so the answer is −3. That is why <code>best</code> starts at minus infinity (<code>Integer.MIN_VALUE</code> / <code>float('-inf')</code> / <code>-Infinity</code> / <code>INT_MIN</code>), not 0.</p>`
      },
      {
        title: 'Same skeleton: Diameter of a binary tree',
        html: `<p>Return height (one side), record left height + right height (the bend). For a root with a left chain of 3 nodes and a right chain of 2 nodes, the diameter is 3 + 2 = ${H.c('g', '5')} edges.</p>`,
        code: { lang: 'java', code: `class Diameter {
    int best = 0;
    int height(TreeNode n) {
        if (n == null) return 0;
        int l = height(n.left), r = height(n.right);
        best = Math.max(best, l + r);      // edges on the path bending at n
        return 1 + Math.max(l, r);         // one side, for the parent
    }
    int diameterOfBinaryTree(TreeNode root) { height(root); return best; }
}`, alt: [{ lang: 'python', code: `def diameter_of_binary_tree(root):
    best = 0
    def height(n):
        nonlocal best
        if n is None:
            return 0
        l, r = height(n.left), height(n.right)
        best = max(best, l + r)            # edges on the path bending at n
        return 1 + max(l, r)               # one side, for the parent
    height(root)
    return best` }, { lang: 'js', code: `function diameterOfBinaryTree(root) {
  let best = 0;
  const height = (n) => {
    if (!n) return 0;
    const l = height(n.left), r = height(n.right);
    best = Math.max(best, l + r);          // edges on the path bending at n
    return 1 + Math.max(l, r);             // one side, for the parent
  };
  height(root);
  return best;
}` }, { lang: 'cpp', code: `int diameterOfBinaryTree(TreeNode* root) {
    int best = 0;
    function<int(TreeNode*)> height = [&](TreeNode* n) {
        if (!n) return 0;
        int l = height(n->left), r = height(n->right);
        best = max(best, l + r);           // edges on the path bending at n
        return 1 + max(l, r);              // one side, for the parent
    };
    height(root);
    return best;
}` }] }
      }
    ],
    deepDive: `<p><b>Designing the return value.</b> Ask: “what does my parent need to know about my subtree to make <b>its</b> decision?” For robbing: whether I was robbed. For cameras: whether I am covered, have a camera, or still need cover (3 states). For path problems: the best downward chain. If the parent needs more, return a bigger tuple — each extra state multiplies work by a constant, not by N.</p>
      <p><b>Proof of O(N).</b> Each node is entered once and does O(1) work with its children’s answers (O(k) for k children in general trees, summing to O(N) edges).</p>
      <p><b>Recursion depth.</b> A skewed tree of 10<sup>5</sup> nodes means 10<sup>5</sup> nested calls. Default limits: Python stops at 1000 frames; Java’s default thread stack (~512 KB–1 MB) and Node’s stack overflow somewhere around 10<sup>4</sup> frames; C++ gets about 8 MB, which is usually enough for 10<sup>5</sup> small frames. The portable fix is an iterative post-order: push nodes on a stack, record them in “parent before children” order, then process that list backwards so children are finished first (the guided solutions here do exactly that). Language-specific escapes: a <code>new Thread(null, task, "dfs", 1 &lt;&lt; 26)</code> with a big stack in Java, or <code>sys.setrecursionlimit</code> together with <code>threading.stack_size</code> in Python.</p>
      <p><b>Rerooting (all roots in O(N)).</b> For “sum of distances from every node” first compute subtree sizes/answers bottom-up, then push answers top-down: when moving the root from parent p to child c, the c-subtree’s nodes get 1 closer and the other N − size[c] nodes get 1 further: <code>ans[c] = ans[p] − size[c] + (N − size[c])</code>.</p>
      <p><b>General graphs.</b> Tree DP needs <b>no cycles</b>: on a general graph the “children” could reach back to the parent. With an adjacency list for an unrooted tree, pass the parent to avoid walking back. On DAGs the same idea becomes DP in topological order.</p>
      <p><b>Production reality.</b> Tree DP evaluates expression trees in compilers (constant folding, register allocation by Sethi–Ullman numbers), computes aggregate sizes in file systems (<code>du</code>), and powers cost estimation in query plan trees.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants know both problems by heart. The interview has shifted to <b>variants</b>: “path must start at a leaf”, “at most k nodes robbed”, “generic tree with adjacency lists”, “answer for every root”. Those require you to redesign the return value — the part AI tends to copy from the closest famous problem.</p>
      <p><b>Use AI as a partner:</b> ask it to generate random trees (with negative values and deep chains) plus a brute force that tries every subset/path, then compare with your O(N) solution. Ask “what state would the parent need if robbing a node also forbade robbing its grandchildren?” and check the reasoning.</p>
      <p><b>Where AI goes wrong:</b> initialising the global best to 0 (fails on all-negative trees); returning the bent path to the parent (creates illegal branched paths); recursion on 10<sup>5</sup>-deep trees without mentioning stack limits; mutating shared fields in a non-thread-safe way when “parallelising” DFS.</p>
      <p><b>What you must still own:</b> the sentence “return the extendable part, record the complete part”, and the ability to derive the state tuple from the problem constraints.</p>`,
    problems: [{
      title: 'House Robber III', level: 'Medium', tags: ['tree dp', 'dfs', 'dp'], companies: ['Amazon', 'Google', 'Uber'],
      statement: `<p>Houses form a binary tree; each node holds money. Robbing two <b>directly-linked</b> houses on the same night alerts the police. Return the maximum money you can rob.</p>`,
      constraints: `1 ≤ number of nodes ≤ 10<sup>4</sup>, 0 ≤ Node.val ≤ 10<sup>4</sup>.`,
      example: `<p>Tree [3, 2, 3, null, 3, null, 1] → <b>7</b> = ${H.c('g', '3 (root) + 3 + 1')} (the two grandchildren). Tree [3, 4, 5, 1, 3, null, 1] → <b>9</b> = ${H.c('g', '4 + 5')}.</p>`,
      brute: {
        why: `<p>For each node either rob it (then jump to its 4 grandchildren) or skip it (recurse on 2 children). Grandchildren get recomputed from two different ancestors, so the call count grows exponentially with depth.</p>`,
        code: { lang: 'java', code: `class Brute {
    public int rob(TreeNode root) {
        if (root == null) return 0;
        int take = root.val;
        if (root.left != null) take += rob(root.left.left) + rob(root.left.right);
        if (root.right != null) take += rob(root.right.left) + rob(root.right.right);
        int skip = rob(root.left) + rob(root.right);   // children recomputed again later
        return Math.max(take, skip);
    }
}`, alt: [
          { lang: 'python', code: `def rob(root):
    if root is None:
        return 0
    take = root.val
    if root.left is not None:
        take += rob(root.left.left) + rob(root.left.right)
    if root.right is not None:
        take += rob(root.right.left) + rob(root.right.right)
    skip = rob(root.left) + rob(root.right)   # children recomputed again later
    return max(take, skip)` },
          { lang: 'js', code: `function rob(root) {
  if (root === null) return 0;
  let take = root.val;
  if (root.left !== null) take += rob(root.left.left) + rob(root.left.right);
  if (root.right !== null) take += rob(root.right.left) + rob(root.right.right);
  const skip = rob(root.left) + rob(root.right);   // children recomputed again later
  return Math.max(take, skip);
}` },
          { lang: 'cpp', code: `int rob(TreeNode* root) {
    if (root == nullptr) return 0;
    int take = root->val;
    if (root->left != nullptr) take += rob(root->left->left) + rob(root->left->right);
    if (root->right != nullptr) take += rob(root->right->left) + rob(root->right->right);
    int skip = rob(root->left) + rob(root->right);   // children recomputed again later
    return max(take, skip);
}` }
        ] }
      },
      mcq: { q: 'A node returns [rob, skip]. Its parent is being ROBBED. Which child value must the parent use?', options: ['The child\'s skip value', 'max(rob, skip) of the child', 'The child\'s rob value', 'Zero'], answer: 0, explain: 'Parent and child are directly linked, so if the parent is robbed the child cannot be — only skip is allowed.' },
      hints: [
        `<p>Hint 1: the parent only needs to know, for each child subtree, the best total <b>with</b> the child robbed and <b>without</b> it.</p>`,
        `<p>Hint 2: post-order DFS returning a pair <code>{rob, skip}</code>; a missing child returns {0, 0}.</p>`,
        `<p>Hint 3: rob = val + L.skip + R.skip; skip = max(L) + max(R); answer = max(root pair). Edge cases: single node, all zeros, deep skewed tree.</p>`
      ],
      solution: {
        approach: `<p>One post-order pass. Each node turns its children’s pairs into its own pair in O(1). The root’s larger value is the answer. No memo of repeated work is needed because each subtree is computed once and handed straight to its parent.</p>
          <p>A skewed tree can be 10<sup>4</sup> levels deep, which is enough to overflow the default stack in Java, Python and JavaScript. So the reference code does the post-order with an explicit stack: record nodes in “node, then children” order, then walk that list backwards so every child is finished before its parent. The recursive version (shown in the lesson) is the same logic and is fine when the tree is shallow.</p>`,
        code: `class Solution {
    public int rob(TreeNode root) {
        if (root == null) return 0;
        // Iterative post-order: recursion 10^4 levels deep can overflow Java's default stack.
        List<TreeNode> order = new ArrayList<>();         // every parent appears before its children
        Deque<TreeNode> stack = new ArrayDeque<>();
        stack.push(root);
        while (!stack.isEmpty()) {
            TreeNode node = stack.pop();
            order.add(node);
            if (node.left != null) stack.push(node.left);
            if (node.right != null) stack.push(node.right);
        }
        Map<TreeNode, int[]> pair = new HashMap<>();      // node -> {rob, skip}
        int[] none = {0, 0};                              // a missing child gives nothing
        for (int i = order.size() - 1; i >= 0; i--) {     // backwards: children before parents
            TreeNode node = order.get(i);
            int[] l = node.left == null ? none : pair.get(node.left);
            int[] r = node.right == null ? none : pair.get(node.right);
            int rob = node.val + l[1] + r[1];                          // children skipped
            int skip = Math.max(l[0], l[1]) + Math.max(r[0], r[1]);    // children choose freely
            pair.put(node, new int[]{rob, skip});
        }
        int[] res = pair.get(root);
        return Math.max(res[0], res[1]);
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def rob(self, root):
        # Iterative post-order: a skewed tree of 10^4 nodes would pass Python's 1000-frame limit.
        pair = {None: (0, 0)}                      # node -> (rob, skip)
        stack = [(root, False)]
        while stack:
            node, children_done = stack.pop()
            if node is None:
                continue
            if children_done:
                lr, ls = pair[node.left]
                rr, rs = pair[node.right]
                pair[node] = (node.val + ls + rs, max(lr, ls) + max(rr, rs))
            else:
                stack += [(node, True), (node.left, False), (node.right, False)]
        return max(pair[root])` }, { lang: 'js', code: `function rob(root) {
  // Iterative post-order: deep recursion on a skewed tree can overflow the JS stack.
  const pair = new Map([[null, [0, 0]]]);          // node -> [rob, skip]
  const stack = [[root, false]];
  while (stack.length) {
    const [node, childrenDone] = stack.pop();
    if (!node) continue;
    if (childrenDone) {
      const [lr, ls] = pair.get(node.left), [rr, rs] = pair.get(node.right);
      pair.set(node, [node.val + ls + rs, Math.max(lr, ls) + Math.max(rr, rs)]);
    } else {
      stack.push([node, true], [node.left, false], [node.right, false]);
    }
  }
  return Math.max(...pair.get(root));
}` }, { lang: 'cpp', code: `class Solution {
public:
    int rob(TreeNode* root) {
        auto [r, s] = dfs(root);
        return max(r, s);
    }
private:
    pair<int, int> dfs(TreeNode* node) {           // {rob, skip}; depth 10^4 fits the 8 MB stack
        if (!node) return {0, 0};
        auto [lr, ls] = dfs(node->left);
        auto [rr, rs] = dfs(node->right);
        return {node->val + ls + rs, max(lr, ls) + max(rr, rs)};
    }
};` }],
        dry: { head: ['node (post-order)', 'left pair', 'right pair', 'rob', 'skip'], rows: [
          ['3 (leaf)', '[0,0]', '[0,0]', '3', '0'], ['2', '[0,0]', '[3,0]', '2', '3'], ['1 (leaf)', '[0,0]', '[0,0]', '1', '0'],
          ['3 (right child)', '[0,0]', '[1,0]', '3', '1'], ['3 (root)', '[2,3]', '[3,1]', '<span class="c-g">7</span>', '6']
        ] },
        complexity: `<p>Time O(N). Space O(N) for the explicit stack, the visit order and the pairs (the recursive version uses O(H) stack, H = height, up to N for a skewed tree).</p>`,
        followUps: ['Print which houses to rob.', 'General tree (any number of children) given as an edge list.', 'You may not rob a node and its grandchild either — what state do you need?']
      },
      // robTree(root, chain): when chain is non-empty, the tree is a left-leaning chain with those values (deep-tree test).
      tests: { sig: 'TreeNode int[] -> int', fn: 'robTree', harness: {
        java: 'class Check { static int robTree(TreeNode root, int[] chain) { if (chain.length > 0) { root = null; for (int i = chain.length - 1; i >= 0; i--) root = new TreeNode(chain[i], root, null); } return new Solution().rob(root); } }',
        python: 'def rob_tree(root, chain):\n    if chain:\n        root = None\n        for v in reversed(chain):\n            root = TreeNode(v, root, None)\n    return Solution().rob(root)',
        js: 'function robTree(root, chain) { if (chain.length) { root = null; for (let i = chain.length - 1; i >= 0; i--) root = new TreeNode(chain[i], root, null); } return rob(root); }',
        cpp: 'int robTree(TreeNode* root, vector<int> chain) { if (!chain.empty()) { root = nullptr; for (int i = (int)chain.size() - 1; i >= 0; i--) root = new TreeNode(chain[i], root, nullptr); } return Solution().rob(root); }' },
        cases: [
          [[[3, 2, 3, null, 3, null, 1], []], 7],
          [[[3, 4, 5, 1, 3, null, 1], []], 9],
          [[[5], []], 5],
          [[[0, 0, 0], []], 0],
          [[[4, 1, null, 2, null, 3], []], 7],
          [[[2, 1, 3, null, 4], []], 7],
          [[null, { $range: [1, 10001] }], 25005000],
          [[null, { $rep: 10000, n: 10000 }], 50000000]
        ] }
    }, {
      title: 'Binary Tree Maximum Path Sum', level: 'Hard', tags: ['tree dp', 'dfs'], companies: ['Meta', 'Amazon', 'Google', 'Microsoft'],
      statement: `<p>A path is a sequence of nodes where each adjacent pair is connected by an edge; a node appears at most once and the path need not pass through the root. Return the maximum sum of node values over all non-empty paths.</p>`,
      constraints: `1 ≤ nodes ≤ 3·10<sup>4</sup>, −1000 ≤ Node.val ≤ 1000.`,
      example: `<p>Tree [−10, 9, 20, null, null, 15, 7] → <b>42</b> via ${H.c('g', '15 → 20 → 7')}. Tree [1, 2, 3] → 6 (2 → 1 → 3). Tree [−3] → −3.</p>`,
      brute: {
        why: `<p>Treat every node as the “top” (bend point) of the path and, for each one, compute the best downward chains on both sides by a fresh DFS: O(N) per node → O(N²). The waste: the best downward chain from a node is recomputed for every ancestor.</p>`,
        code: { lang: 'java', code: `class Brute {
    int down(TreeNode n) {                     // best downward chain starting at n (recomputed a lot)
        if (n == null) return 0;
        return n.val + Math.max(0, Math.max(down(n.left), down(n.right)));
    }
    int best = Integer.MIN_VALUE;
    void visit(TreeNode n) {
        if (n == null) return;
        best = Math.max(best, n.val + Math.max(0, down(n.left)) + Math.max(0, down(n.right)));
        visit(n.left);
        visit(n.right);
    }
    public int maxPathSum(TreeNode root) { visit(root); return best; }
}`, alt: [
          { lang: 'python', code: `def max_path_sum(root):
    best = float('-inf')

    def down(n):                       # best downward chain starting at n (recomputed a lot)
        if n is None:
            return 0
        return n.val + max(0, max(down(n.left), down(n.right)))

    def visit(n):
        nonlocal best
        if n is None:
            return
        best = max(best, n.val + max(0, down(n.left)) + max(0, down(n.right)))
        visit(n.left)
        visit(n.right)

    visit(root)
    return best` },
          { lang: 'js', code: `function maxPathSum(root) {
  let best = -Infinity;
  function down(n) {                   // best downward chain starting at n (recomputed a lot)
    if (n === null) return 0;
    return n.val + Math.max(0, Math.max(down(n.left), down(n.right)));
  }
  function visit(n) {
    if (n === null) return;
    best = Math.max(best, n.val + Math.max(0, down(n.left)) + Math.max(0, down(n.right)));
    visit(n.left);
    visit(n.right);
  }
  visit(root);
  return best;
}` },
          { lang: 'cpp', code: `class Brute {
    int down(TreeNode* n) {                    // best downward chain starting at n (recomputed a lot)
        if (n == nullptr) return 0;
        return n->val + max(0, max(down(n->left), down(n->right)));
    }
    int best = INT_MIN;
    void visit(TreeNode* n) {
        if (n == nullptr) return;
        best = max(best, n->val + max(0, down(n->left)) + max(0, down(n->right)));
        visit(n->left);
        visit(n->right);
    }
public:
    int maxPathSum(TreeNode* root) { visit(root); return best; }
};` }
        ] }
      },
      mcq: { q: 'Why does gain() return node.val + max(left, right) instead of node.val + left + right?', options: ['A parent extending the path can continue down only ONE side; using both would make the path branch', 'Because left + right might overflow', 'Because the right child is always smaller', 'To make the code shorter'], answer: 0, explain: 'If the parent attached itself to a path that already uses both children of this node, the node would have three path neighbours — not a path anymore.' },
      hints: [
        `<p>Hint 1: every path has exactly one <b>highest</b> node where it bends. Try every node as that bend point.</p>`,
        `<p>Hint 2: a post-order DFS can return the best <b>downward</b> chain from each node, so the bend value is val + max(0, leftChain) + max(0, rightChain) in O(1).</p>`,
        `<p>Hint 3: keep a global best initialised to −∞ (the smallest possible value); update with the bend value; return val + max(0, max(leftChain, rightChain)). Negative chains are clipped to 0 = “don’t take that side”.</p>`
      ],
      solution: {
        approach: `<p>Single post-order pass with a running <code>best</code>. At each node compute clipped left/right gains, update best with the two-sided sum, and hand the one-sided sum to the parent. Every node is visited once.</p>
          <p>A skewed tree can be 3·10<sup>4</sup> levels deep, which overflows the default stack in Java, Python and JavaScript. So the reference code replaces recursion with an explicit stack: list the nodes so every parent comes before its children, then walk the list backwards. The recursive version in the lesson is the same logic for shallow trees.</p>`,
        code: `class Solution {
    public int maxPathSum(TreeNode root) {
        // Iterative post-order: recursion 3*10^4 levels deep can overflow Java's default stack.
        List<TreeNode> order = new ArrayList<>();         // every parent appears before its children
        Deque<TreeNode> stack = new ArrayDeque<>();
        stack.push(root);
        while (!stack.isEmpty()) {
            TreeNode node = stack.pop();
            order.add(node);
            if (node.left != null) stack.push(node.left);
            if (node.right != null) stack.push(node.right);
        }
        Map<TreeNode, Integer> gain = new HashMap<>();    // best downward chain starting at a node
        int best = Integer.MIN_VALUE;
        for (int i = order.size() - 1; i >= 0; i--) {     // backwards: children before parents
            TreeNode node = order.get(i);
            int left = node.left == null ? 0 : Math.max(0, gain.get(node.left));     // ignore negative branches
            int right = node.right == null ? 0 : Math.max(0, gain.get(node.right));
            best = Math.max(best, node.val + left + right);  // path bending here
            gain.put(node, node.val + Math.max(left, right)); // extendable by the parent
        }
        return best;
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def max_path_sum(self, root):
        # Iterative post-order: a skewed tree of 3*10^4 nodes would pass Python's 1000-frame limit.
        order, stack = [], [root]
        while stack:                               # every parent is listed before its children
            node = stack.pop()
            order.append(node)
            stack += [c for c in (node.left, node.right) if c]
        gain = {None: 0}                           # best downward chain starting at a node
        best = float('-inf')
        for node in reversed(order):               # children before parents
            left = max(0, gain[node.left])
            right = max(0, gain[node.right])
            best = max(best, node.val + left + right)
            gain[node] = node.val + max(left, right)
        return best` }, { lang: 'js', code: `function maxPathSum(root) {
  // Iterative post-order: deep recursion on a skewed tree can overflow the JS stack.
  const order = [], stack = [root];
  while (stack.length) {                           // every parent is listed before its children
    const node = stack.pop();
    order.push(node);
    if (node.left) stack.push(node.left);
    if (node.right) stack.push(node.right);
  }
  const gain = new Map([[null, 0]]);               // best downward chain starting at a node
  let best = -Infinity;
  for (let i = order.length - 1; i >= 0; i--) {    // children before parents
    const node = order[i];
    const left = Math.max(0, gain.get(node.left)), right = Math.max(0, gain.get(node.right));
    best = Math.max(best, node.val + left + right);
    gain.set(node, node.val + Math.max(left, right));
  }
  return best;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int maxPathSum(TreeNode* root) {
        best = INT_MIN;
        gain(root);
        return best;
    }
private:
    int best;
    int gain(TreeNode* node) {                     // depth 3*10^4 fits the 8 MB stack
        if (!node) return 0;
        int left = max(0, gain(node->left));       // ignore negative branches
        int right = max(0, gain(node->right));
        best = max(best, node->val + left + right); // path bending here
        return node->val + max(left, right);        // extendable by the parent
    }
};` }],
        dry: { head: ['node', 'left gain', 'right gain', 'bend sum', 'best', 'returns'], rows: [
          ['9', '0', '0', '9', '9', '9'], ['15', '0', '0', '15', '15', '15'], ['7', '0', '0', '7', '15', '7'],
          ['20', '15', '7', '42', '<span class="c-g">42</span>', '35'], ['−10', '9', '35', '34', '42', '25']
        ] },
        complexity: `<p>Time O(N). Space O(N) for the explicit stack, the order list and the gains (O(H) stack for the recursive version).</p>`,
        followUps: ['Return the path itself.', 'Path must start and end at leaves.', 'Same question on a general tree given as an adjacency list.']
      },
      // pathTree(root, chain): when chain is non-empty, the tree is a right-leaning chain with those values (deep-tree test).
      tests: { sig: 'TreeNode int[] -> int', fn: 'pathTree', harness: {
        java: 'class Check { static int pathTree(TreeNode root, int[] chain) { if (chain.length > 0) { root = null; for (int i = chain.length - 1; i >= 0; i--) root = new TreeNode(chain[i], null, root); } return new Solution().maxPathSum(root); } }',
        python: 'def path_tree(root, chain):\n    if chain:\n        root = None\n        for v in reversed(chain):\n            root = TreeNode(v, None, root)\n    return Solution().max_path_sum(root)',
        js: 'function pathTree(root, chain) { if (chain.length) { root = null; for (let i = chain.length - 1; i >= 0; i--) root = new TreeNode(chain[i], null, root); } return maxPathSum(root); }',
        cpp: 'int pathTree(TreeNode* root, vector<int> chain) { if (!chain.empty()) { root = nullptr; for (int i = (int)chain.size() - 1; i >= 0; i--) root = new TreeNode(chain[i], nullptr, root); } return Solution().maxPathSum(root); }' },
        cases: [
          [[[-10, 9, 20, null, null, 15, 7], []], 42],
          [[[1, 2, 3], []], 6],
          [[[-3], []], -3],
          [[[2, -1], []], 2],
          [[[-2, -1], []], -1],
          [[[1, -2, 3], []], 4],
          [[[5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1], []], 48],
          [[null, { $concat: [{ $rep: -1000, n: 15000 }, { $rep: 1000, n: 15000 }] }], 15000000],
          [[null, { $rep: -1000, n: 30000 }], -1000],
          [[null, { $rep: 1000, n: 30000 }], 30000000]
        ] }
    }]
  });

  // ================= TOPIC 5: State-machine DP =================
  topics.push({
    title: 'State-Machine DP: the Buy/Sell Stock family (cooldown, fee, k transactions)',
    analogy: `<p>Think of a <b>traffic light</b> or your own day: at any moment you are in exactly one <b>mode</b> — “holding a share”, “just sold (must rest tomorrow)”, “free with cash”. Each day you may only move along certain arrows: from “free” you can buy, from “holding” you can sell, after selling you must take a forced day off.</p>
      <p>State-machine DP keeps, for <b>every mode</b>, the best money you could have if you are in that mode today. Tomorrow’s numbers come only from today’s numbers along the allowed arrows — like a board game where you track the best score on each square.</p>`,
    explain: `<p>When a problem has a <b>timeline</b> (days, characters, steps) and at each step you are in one of a few <b>modes</b>, define <code>dp[day][mode]</code> = best value after this day if you end in this mode. Draw the modes as circles and the legal moves as arrows; each arrow is one term in a <code>max</code>.</p>
      <h4>The stock family on one page</h4>
      ${H.table(['version', 'modes', 'transitions (p = today\'s price)'], [
        ['I: one transaction', 'hold, cash', 'hold = max(hold, −p) · cash = max(cash, hold + p)'],
        ['II: unlimited', 'hold, cash', 'hold = max(hold, cash − p) · cash = max(cash, hold + p)'],
        ['with fee', 'hold, cash', 'cash = max(cash, hold + p − fee) (pay fee once per sale)'],
        ['with cooldown', 'hold, sold, rest', 'hold = max(hold, rest − p) · sold = hold + p · rest = max(rest, sold)'],
        ['III / IV: at most k', 'buy[1..k], sell[1..k]', 'buy[j] = max(buy[j], sell[j−1] − p) · sell[j] = max(sell[j], buy[j] + p)']
      ])}
      <p>Only yesterday matters, so each mode is just <b>one variable</b>: O(1) memory (O(k) for k transactions).</p>
      <h4>Cooldown walk-through: prices = [1, 2, 3, 0, 2]</h4>
      <p>Modes after each day: <b>hold</b> (own a share), <b>sold</b> (sold today → tomorrow is cooldown), <b>rest</b> (no share, free to buy tomorrow).</p>
      ${H.table(['day', 'price', 'hold', 'sold', 'rest'], [
        ['start', '—', '−∞', '−∞', '0'], ['0', '1', 'max(−∞, 0−1) = −1', '−∞', '0'], ['1', '2', '−1', '−1+2 = 1', '0'],
        ['2', '3', '−1', '−1+3 = 2', 'max(0, 1) = 1'], ['3', '0', 'max(−1, 1−0) = 1', '−1+0 = −1', 'max(1, 2) = 2'], ['4', '2', '1', '1+2 = ' + H.c('g', '3'), '2']
      ])}
      <p>Answer = max(sold, rest) = ${H.c('g', '3')}: buy at 1, sell at 2, cooldown, buy at 0, sell at 2.</p>
      <p><b>The golden rule:</b> compute every new value from <b>yesterday’s</b> values. If you overwrite <code>sold</code> before computing <code>rest</code>, you accidentally let today’s sale feed today’s rest — a classic bug. Save the old value in a temp, or update in a safe order.</p>`,
    clues: [
      '"Buy and sell stock" + any extra rule (cooldown, fee, at most k transactions) → state machine with hold / not-hold modes.',
      '"After doing X you cannot do Y on the next step" (cooldown, no two adjacent, must rest) → add a mode for “just did X”.',
      '"At most k times" → add k to the state: buy[j], sell[j] for j = 1..k.',
      'Strings with modes: "flip string to monotone increasing", "count binary strings with no consecutive 1s", "paint fence" → small set of modes per position.',
      'N up to 10<sup>5</sup> days and k ≤ 100 → O(N·k) time, O(k) memory; k ≥ N/2 → effectively unlimited, use the greedy sum of rises.',
      'You can only be in one of a few conditions at each step and the next condition depends only on the current one → draw the diagram first.'
    ],
    code: [{ lang: 'java', code: `
      // Stock with cooldown: three modes, O(1) memory.
      static int maxProfitCooldown(int[] prices) {
          int hold = Integer.MIN_VALUE;   // own a share (impossible before day 0)
          int sold = 0;                   // sold today (on day 0 nothing could be sold, but 0 is harmless)
          int rest = 0;                   // no share, free to buy
          for (int p : prices) {
              int prevSold = sold;
              sold = hold + p;                      // sell the share we were holding
              hold = Math.max(hold, rest - p);      // keep holding, or buy (only from rest!)
              rest = Math.max(rest, prevSold);      // stay idle, or yesterday's sale cools down
          }
          return Math.max(sold, rest);              // ending with a share is never optimal
      }`, alt: [{ lang: 'python', code: `# Stock with cooldown: three modes, O(1) memory.
def max_profit_cooldown(prices):
    hold = float('-inf')     # own a share (impossible before day 0)
    sold = float('-inf')     # sold today
    rest = 0                 # no share, free to buy
    for p in prices:
        # tuple assignment: every right-hand value is yesterday's
        hold, sold, rest = max(hold, rest - p), hold + p, max(rest, sold)
    return max(sold, rest)   # ending with a share is never optimal` }, { lang: 'js', code: `// Stock with cooldown: three modes, O(1) memory.
function maxProfitCooldown(prices) {
  let hold = -Infinity;      // own a share (impossible before day 0)
  let sold = -Infinity;      // sold today
  let rest = 0;              // no share, free to buy
  for (const p of prices) {
    const prevSold = sold;
    sold = hold + p;                     // sell the share we were holding
    hold = Math.max(hold, rest - p);     // keep holding, or buy (only from rest!)
    rest = Math.max(rest, prevSold);     // stay idle, or yesterday's sale cools down
  }
  return Math.max(sold, rest);           // ending with a share is never optimal
}` }, { lang: 'cpp', code: `// Stock with cooldown: three modes, O(1) memory.
int maxProfitCooldown(const vector<int>& prices) {
    long long hold = LLONG_MIN / 2;      // own a share (impossible before day 0); /2 avoids overflow on + p
    long long sold = LLONG_MIN / 2;      // sold today
    long long rest = 0;                  // no share, free to buy
    for (int p : prices) {
        long long prevSold = sold;
        sold = hold + p;                     // sell the share we were holding
        hold = max(hold, rest - p);          // keep holding, or buy (only from rest!)
        rest = max(rest, prevSold);          // stay idle, or yesterday's sale cools down
    }
    return (int)max(sold, rest);         // ending with a share is never optimal
}` }] }, { lang: 'java', code: `
      // Stock with transaction fee: two modes.
      static int maxProfitFee(int[] prices, int fee) {
          int cash = 0, hold = -prices[0];
          for (int i = 1; i < prices.length; i++) {
              int p = prices[i];
              int newCash = Math.max(cash, hold + p - fee);  // sell (pay the fee once per round trip)
              int newHold = Math.max(hold, cash - p);        // buy using yesterday's cash
              cash = newCash;
              hold = newHold;
          }
          return cash;
      }`, alt: [{ lang: 'python', code: `# Stock with transaction fee: two modes.
def max_profit_fee(prices, fee):
    cash, hold = 0, -prices[0]
    for p in prices[1:]:
        # sell (pay the fee once per round trip), or buy using yesterday's cash
        cash, hold = max(cash, hold + p - fee), max(hold, cash - p)
    return cash` }, { lang: 'js', code: `// Stock with transaction fee: two modes.
function maxProfitFee(prices, fee) {
  let cash = 0, hold = -prices[0];
  for (let i = 1; i < prices.length; i++) {
    const p = prices[i];
    const newCash = Math.max(cash, hold + p - fee);   // sell (pay the fee once per round trip)
    const newHold = Math.max(hold, cash - p);         // buy using yesterday's cash
    cash = newCash;
    hold = newHold;
  }
  return cash;
}` }, { lang: 'cpp', code: `// Stock with transaction fee: two modes.
int maxProfitFee(const vector<int>& prices, int fee) {
    int cash = 0, hold = -prices[0];
    for (size_t i = 1; i < prices.size(); i++) {
        int p = prices[i];
        int newCash = max(cash, hold + p - fee);     // sell (pay the fee once per round trip)
        int newHold = max(hold, cash - p);           // buy using yesterday's cash
        cash = newCash;
        hold = newHold;
    }
    return cash;
}` }] }, { lang: 'java', code: `
      // At most k transactions (Stock IV). buy[j]/sell[j] = best cash in the j-th buy/sell mode.
      static int maxProfitK(int k, int[] prices) {
          int n = prices.length;
          if (n < 2 || k == 0) return 0;
          if (k >= n / 2) {                       // enough transactions to take every rise
              int sum = 0;
              for (int i = 1; i < n; i++) sum += Math.max(0, prices[i] - prices[i - 1]);
              return sum;
          }
          int[] buy = new int[k + 1], sell = new int[k + 1];
          Arrays.fill(buy, Integer.MIN_VALUE);
          for (int p : prices) {
              for (int j = 1; j <= k; j++) {
                  buy[j] = Math.max(buy[j], sell[j - 1] - p);   // j-th buy uses profit of (j-1) sells
                  sell[j] = Math.max(sell[j], buy[j] + p);      // j-th sell
              }
          }
          return sell[k];
      }`, alt: [{ lang: 'python', code: `# At most k transactions (Stock IV). buy[j]/sell[j] = best cash in the j-th buy/sell mode.
def max_profit_k(k, prices):
    n = len(prices)
    if n < 2 or k == 0:
        return 0
    if k >= n // 2:                          # enough transactions to take every rise
        return sum(max(0, b - a) for a, b in zip(prices, prices[1:]))
    buy, sell = [float('-inf')] * (k + 1), [0] * (k + 1)
    for p in prices:
        for j in range(1, k + 1):
            buy[j] = max(buy[j], sell[j - 1] - p)    # j-th buy uses profit of (j-1) sells
            sell[j] = max(sell[j], buy[j] + p)       # j-th sell
    return sell[k]` }, { lang: 'js', code: `// At most k transactions (Stock IV). buy[j]/sell[j] = best cash in the j-th buy/sell mode.
function maxProfitK(k, prices) {
  const n = prices.length;
  if (n < 2 || k === 0) return 0;
  if (k >= n >> 1) {                         // enough transactions to take every rise
    let sum = 0;
    for (let i = 1; i < n; i++) sum += Math.max(0, prices[i] - prices[i - 1]);
    return sum;
  }
  const buy = new Array(k + 1).fill(-Infinity), sell = new Array(k + 1).fill(0);
  for (const p of prices) {
    for (let j = 1; j <= k; j++) {
      buy[j] = Math.max(buy[j], sell[j - 1] - p);    // j-th buy uses profit of (j-1) sells
      sell[j] = Math.max(sell[j], buy[j] + p);       // j-th sell
    }
  }
  return sell[k];
}` }, { lang: 'cpp', code: `// At most k transactions (Stock IV). buy[j]/sell[j] = best cash in the j-th buy/sell mode.
int maxProfitK(int k, const vector<int>& prices) {
    int n = prices.size();
    if (n < 2 || k == 0) return 0;
    if (k >= n / 2) {                        // enough transactions to take every rise
        int sum = 0;
        for (int i = 1; i < n; i++) sum += max(0, prices[i] - prices[i - 1]);
        return sum;
    }
    vector<int> buy(k + 1, INT_MIN), sell(k + 1, 0);
    for (int p : prices)
        for (int j = 1; j <= k; j++) {
            buy[j] = max(buy[j], sell[j - 1] - p);   // j-th buy uses profit of (j-1) sells
            sell[j] = max(sell[j], buy[j] + p);      // j-th sell
        }
    return sell[k];
}` }] }, { lang: 'python', run: true, title: 'The whole family in Python (runnable)', code: `def one_transaction(prices):
    best, low = 0, float('inf')
    for p in prices:
        low = min(low, p)              # cheapest buy so far
        best = max(best, p - low)      # sell today
    return best

def unlimited(prices):
    return sum(max(0, b - a) for a, b in zip(prices, prices[1:]))

def cooldown(prices):
    hold, sold, rest = float('-inf'), float('-inf'), 0
    for p in prices:
        hold, sold, rest = max(hold, rest - p), hold + p, max(rest, sold)   # all from yesterday
    return max(sold, rest)

def with_fee(prices, fee):
    cash, hold = 0, float('-inf')
    for p in prices:
        cash, hold = max(cash, hold + p - fee), max(hold, cash - p)
    return cash

def at_most_k(prices, k):
    buy, sell = [float('-inf')] * (k + 1), [0] * (k + 1)
    for p in prices:
        for j in range(1, k + 1):
            buy[j] = max(buy[j], sell[j - 1] - p)
            sell[j] = max(sell[j], buy[j] + p)
    return sell[k]

print(one_transaction([7, 1, 5, 3, 6, 4]))      # 5
print(unlimited([7, 1, 5, 3, 6, 4]))            # 7
print(cooldown([1, 2, 3, 0, 2]))                # 3
print(with_fee([1, 3, 2, 8, 4, 9], 2))          # 8
print(at_most_k([3, 2, 6, 5, 0, 3], 2))         # 7
print(at_most_k([3, 3, 5, 0, 0, 3, 1, 4], 2))   # 6
` }],
    codeTitle: ['Cooldown', 'Transaction fee', 'At most k transactions', 'Whole family (Python, runnable)'],
    viz: [{
      title: 'Cooldown state machine: best money in each mode, day by day',
      input: '1 2 3 0 2',
      inputLabel: 'Prices (2 to 12 numbers, 0..999)',
      gen: function (input) {
        var pr = parseNums(input, 2, 12, 0, 999, 'the prices');
        var hold = -Infinity, sold = -Infinity, rest = 0, frames = [], rows = [];
        var f = function (v) { return v === -Infinity ? '−∞' : v; };
        var graph = function (hl, ehl, tags) {
          return { type: 'graph', label: 'modes and legal moves', directed: true, height: 56,
            nodes: [{ id: 'R', label: 'rest', x: 15, y: 28 }, { id: 'H', label: 'hold', x: 50, y: 8 }, { id: 'S', label: 'sold', x: 85, y: 28 }],
            edges: [['R', 'H', 'buy −p'], ['H', 'S', 'sell +p'], ['S', 'R', 'cooldown']],
            hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
        };
        frames.push({ narr: 'Three modes: <b>hold</b> (own a share), <b>sold</b> (sold today, so tomorrow is a forced rest), <b>rest</b> (free). Before day 0 we can only be resting with 0 money; the other modes are impossible (−∞).', parts: [
          graph({ R: 'ok' }, {}, { R: '0', H: '−∞', S: '−∞' }),
          { type: 'bars', label: 'prices', values: pr.slice(), texts: pr.map(String) }
        ] });
        for (var d = 0; d < pr.length; d++) {
          var p = pr[d];
          var nh = Math.max(hold, rest - p), ns = hold + p, nr = Math.max(rest, sold);
          var buyWins = rest - p > hold, coolWins = sold > rest;
          var why = 'hold = max(keep ' + f(hold) + ', buy from rest ' + f(rest) + '−' + p + ') = <b>' + f(nh) + '</b>' + (buyWins ? ' (buy today)' : ' (keep)') +
            '; sold = hold ' + f(hold) + ' + ' + p + ' = <b>' + f(ns) + '</b>; rest = max(' + f(rest) + ', yesterday sold ' + f(sold) + ') = <b>' + f(nr) + '</b>.';
          hold = nh; sold = ns; rest = nr;
          rows.push([d, p, f(hold), f(sold), f(rest)]);
          var ehl = { 'H-S': 'cur' }; if (buyWins) ehl['R-H'] = 'ok'; if (coolWins) ehl['S-R'] = 'ok';
          frames.push({ narr: 'Day ' + d + ', price ' + p + '. Every new value uses only <b>yesterday\'s</b> numbers (green arrows = the move that won today; keeping/idling are the silent self-moves): ' + why, parts: [
            graph({ H: 'cur', S: 'cur', R: 'cur' }, ehl, { R: String(f(rest)), H: String(f(hold)), S: String(f(sold)) }),
            { type: 'bars', label: 'prices', values: pr.slice(), texts: pr.map(String), hl: one(d, 'cur'), ptr: one(d, 'today') },
            { type: 'table', label: 'history', columns: ['day', 'price', 'hold', 'sold', 'rest'], rows: rows.map(function (r) { return r.slice(); }), hl: one(rows.length - 1, 'cur') }
          ] });
        }
        var ans = Math.max(sold, rest);
        frames.push({ narr: 'End: we should not finish holding a share, so the answer is max(sold, rest) = <b>' + f(ans) + '</b>.', parts: [
          graph(sold >= rest ? { S: 'sel' } : { R: 'sel' }, {}, { R: String(f(rest)), H: String(f(hold)), S: String(f(sold)) }),
          { type: 'vars', label: 'answer', vals: { 'max profit': f(ans) }, hl: { 'max profit': 'sel' } }
        ] });
        return frames;
      }
    }, {
      title: 'At most k transactions: buy[j] and sell[j] rows updated every day',
      input: '3 2 6 5 0 3 ; 2',
      inputLabel: 'prices ; k   (2–10 prices, k from 1 to 3)',
      gen: function (input) {
        var parts = String(input === undefined ? '' : input).split(/[;|]/);
        if (parts.length < 2) throw new Error('Format: prices ; k   e.g. 3 2 6 5 0 3 ; 2');
        var pr = parseNums(parts[0], 2, 10, 0, 999, 'the prices');
        var k = parseNums(parts[1], 1, 1, 1, 3, 'k')[0];
        var n = pr.length, buy = [], sell = [], frames = [], grid = [];
        for (var j = 0; j <= k; j++) { buy.push(-Infinity); sell.push(0); }
        var rowHead = [];
        for (var r = 1; r <= k; r++) { rowHead.push('buy' + r); rowHead.push('sell' + r); }
        for (var r2 = 0; r2 < 2 * k; r2++) { var row = []; for (var c = 0; c < n; c++) row.push(''); grid.push(row); }
        var colHead = pr.map(function (p, i) { return 'd' + i + ' (' + p + ')'; });
        var f = function (v) { return v === -Infinity ? '−∞' : v; };
        var cp = function () { return grid.map(function (rw) { return rw.slice(); }); };
        frames.push({ narr: 'buy[j] = best cash after making the j-th buy; sell[j] = best cash after the j-th sell. sell[0] = 0 (no trades yet). Rows are modes, columns are days.', parts: [
          { type: 'grid', label: 'state values per day', rows: cp(), rowHead: rowHead, colHead: colHead },
          { type: 'bars', label: 'prices', values: pr.slice(), texts: pr.map(String) }
        ] });
        for (var d = 0; d < n; d++) {
          var p = pr[d], notes = [], hl = {};
          for (var t = 1; t <= k; t++) {
            var nb = Math.max(buy[t], sell[t - 1] - p);
            if (nb > buy[t]) { hl[(2 * t - 2) + ',' + d] = 'ok'; notes.push('buy' + t + ' improves to ' + nb + ' (sell' + (t - 1) + ' ' + sell[t - 1] + ' − ' + p + ')'); }
            buy[t] = nb;
            var ns = Math.max(sell[t], buy[t] + p);
            if (ns > sell[t]) { hl[(2 * t - 1) + ',' + d] = 'ok'; notes.push('sell' + t + ' improves to ' + ns + ' (buy' + t + ' ' + buy[t] + ' + ' + p + ')'); }
            sell[t] = ns;
            grid[2 * t - 2][d] = f(buy[t]); grid[2 * t - 1][d] = f(sell[t]);
          }
          frames.push({ narr: 'Day ' + d + ', price ' + p + ': ' + (notes.length ? notes.join('; ') : 'nothing improves — keep yesterday\'s values') + '.', parts: [
            { type: 'grid', label: 'state values per day (green = improved today)', rows: cp(), rowHead: rowHead, colHead: colHead, hl: hl },
            { type: 'bars', label: 'prices', values: pr.slice(), texts: pr.map(String), hl: one(d, 'cur') }
          ] });
        }
        var fin = {}; fin[(2 * k - 1) + ',' + (n - 1)] = 'sel';
        frames.push({ narr: 'Answer = sell' + k + ' on the last day = <b>' + sell[k] + '</b>. (sell[k] already covers “fewer than k trades”, because buy then sell on the same day is a free no-op.)', parts: [
          { type: 'grid', label: 'final table', rows: cp(), rowHead: rowHead, colHead: colHead, hl: fin },
          { type: 'vars', label: 'answer', vals: { k: k, 'max profit': sell[k] }, hl: { 'max profit': 'sel' } }
        ] });
        return frames;
      }
    }],
    examples: [
      {
        title: 'Stock I vs II on [7, 1, 5, 3, 6, 4]',
        html: `<p><b>One transaction:</b> keep the lowest price so far (1) and the best “sell today − lowest” = 6 − 1 = ${H.c('g', '5')}.</p>
          <p><b>Unlimited:</b> every upward step can be its own trade: (5 − 1) + (6 − 3) = ${H.c('g', '7')}. The two-mode dp gives the same answer; the greedy “sum of positive differences” is its shortcut.</p>`
      },
      {
        title: 'Transaction fee: [1, 3, 2, 8, 4, 9], fee = 2',
        html: `${H.table(['day', 'price', 'cash', 'hold'], [['0', '1', '0', '−1'], ['1', '3', 'max(0, −1+3−2) = 0', '−1'], ['2', '2', '0', '−1'], ['3', '8', '−1+8−2 = 5', '−1'], ['4', '4', '5', 'max(−1, 5−4) = 1'], ['5', '9', 'max(5, 1+9−2) = ' + H.c('g', '8'), '1']])}
          <p>Answer ${H.c('g', '8')}: buy 1 → sell 8 (+5), buy 4 → sell 9 (+3). Selling at 3 is not worth it: the +2 rise is eaten by the fee.</p>`
      },
      {
        title: 'At most 2 transactions (Stock III): [3, 3, 5, 0, 0, 3, 1, 4]',
        html: `<p>Best pair of trades: buy 0 → sell 3 (+3), buy 1 → sell 4 (+3) = ${H.c('g', '6')}. One trade alone gives only 4 (0 → 4). The four variables end at buy1 = 0, sell1 = 4, buy2 = 2, sell2 = ${H.c('g', '6')}.</p>
          <p>Why buy2 = max(buy2, sell1 − p): the second buy is paid out of the profit of the first sell — that chaining is what “at most k” means.</p>`,
        code: { lang: 'java', code: `int buy1 = Integer.MIN_VALUE, sell1 = 0, buy2 = Integer.MIN_VALUE, sell2 = 0;
for (int p : new int[]{3, 3, 5, 0, 0, 3, 1, 4}) {
    buy1 = Math.max(buy1, -p);          // first buy
    sell1 = Math.max(sell1, buy1 + p);  // first sell
    buy2 = Math.max(buy2, sell1 - p);   // second buy, paid from first profit
    sell2 = Math.max(sell2, buy2 + p);  // second sell
}
System.out.println(sell2);              // 6`, alt: [{ lang: 'python', run: true, code: `buy1, sell1, buy2, sell2 = float('-inf'), 0, float('-inf'), 0
for p in [3, 3, 5, 0, 0, 3, 1, 4]:
    buy1 = max(buy1, -p)            # first buy
    sell1 = max(sell1, buy1 + p)    # first sell
    buy2 = max(buy2, sell1 - p)     # second buy, paid from first profit
    sell2 = max(sell2, buy2 + p)    # second sell
print(sell2)                        # 6` }, { lang: 'js', run: true, code: `let buy1 = -Infinity, sell1 = 0, buy2 = -Infinity, sell2 = 0;
for (const p of [3, 3, 5, 0, 0, 3, 1, 4]) {
  buy1 = Math.max(buy1, -p);          // first buy
  sell1 = Math.max(sell1, buy1 + p);  // first sell
  buy2 = Math.max(buy2, sell1 - p);   // second buy, paid from first profit
  sell2 = Math.max(sell2, buy2 + p);  // second sell
}
console.log(sell2);                   // 6` }, { lang: 'cpp', code: `int main() {
    int buy1 = INT_MIN, sell1 = 0, buy2 = INT_MIN, sell2 = 0;
    for (int p : {3, 3, 5, 0, 0, 3, 1, 4}) {
        buy1 = max(buy1, -p);           // first buy
        sell1 = max(sell1, buy1 + p);   // first sell
        buy2 = max(buy2, sell1 - p);    // second buy, paid from first profit
        sell2 = max(sell2, buy2 + p);   // second sell
    }
    cout << sell2 << endl;              // 6
}` }] }
      },
      {
        title: 'State machine outside stocks: Flip String to Monotone Increasing',
        html: `<p>Make a binary string look like 000…111 with the fewest flips. Two modes per position: “still in the zeros part” (zero) and “already in the ones part” (one).</p>
          <p><code>zero' = zero + (c == '1')</code>, <code>one' = min(zero, one) + (c == '0')</code>. For "00110": after each char (zero, one): (0,1) (0,1) (1,0) (2,0) (2,1) → answer min = ${H.c('g', '1')} (flip the last 0).</p>`
      }
    ],
    deepDive: `<p><b>Why “sell[k]” is the answer even when fewer trades are better.</b> A buy and sell on the same day cancels out (−p + p), so the dp can “waste” transactions for free; sell[j] is non-decreasing in j. Hence sell[k] = best with at most k trades.</p>
      <p><b>Order of updates inside one day.</b> For k transactions, updating buy[j] then sell[j] in the same day lets a share be bought and sold on the same day — harmless (profit 0). For cooldown, though, using today’s <code>sold</code> inside today’s <code>rest</code> would let you buy the next day legally anyway — but using today’s <code>sold</code> inside today’s <b>hold</b> would break the cooldown. Always reason about which values must be “yesterday’s”.</p>
      <p><b>k ≥ N/2 shortcut.</b> With N prices there are at most ⌊N/2⌋ useful non-overlapping trades, so large k means unlimited — the greedy sum of rises, O(N). Without the shortcut, k = 10<sup>9</sup> would make O(N·k) impossible (and allocate a giant array).</p>
      <p><b>Even faster k-transactions.</b> An O(N log N) solution exists: find all valley/peak pairs with a stack, then pick the k largest profits with a heap (merging pairs when needed). A newer trick is “Aliens / WQS binary search”: add a penalty λ per transaction, solve the unlimited version with fee λ in O(N), and binary-search λ until exactly k trades are used — O(N log(max price)).</p>
      <p><b>General shape.</b> State-machine DP = DP over a timeline × a small finite automaton. The same template counts strings that avoid a pattern (states = KMP automaton states), handles “at most 2 consecutive absences” (attendance record), and appears in HMM/Viterbi decoding where states are hidden labels.</p>
      <p><b>Production reality.</b> Backtesting engines encode position states (flat, long, short, cooldown) exactly like this. Protocol implementations (TCP connection states) and UI flows are state machines too; adding a cost to each transition turns them into shortest-path / DP problems.</p>`,
    aiEra: `<p><b>What AI changes:</b> the six stock problems are among the most solved problems online, so AI recalls them instantly. Interviews now twist them: “cooldown of 2 days”, “fee only on buying”, “can hold at most 2 shares”, “short selling allowed”. The skill being tested is <b>drawing the state diagram</b> for a new rule set — something you should do before asking any tool.</p>
      <p><b>Use AI as a partner:</b> describe your diagram in words and ask the assistant to list any transition you forgot, or to generate a brute force (try every buy/sell/rest choice per day for N ≤ 12) to fuzz your O(N) version.</p>
      <p><b>Where AI goes wrong:</b> in-place updates that read today’s values (breaking cooldown); initialising hold to 0 instead of −∞ (lets you “sell” a share you never bought); integer overflow when a “minus infinity” sentinel such as <code>Integer.MIN_VALUE</code> (Java) or <code>INT_MIN</code> (C++) is followed by a subtraction (Python’s <code>float('-inf')</code> and JavaScript’s <code>-Infinity</code> cannot overflow); forgetting the k ≥ N/2 shortcut and allocating huge arrays.</p>
      <p><b>What you must still own:</b> turning plain-English rules into modes and arrows, and explaining why each arrow uses yesterday’s value.</p>`,
    problems: [{
      title: 'Best Time to Buy and Sell Stock with Cooldown', level: 'Medium', tags: ['state machine dp', 'dp'], companies: ['Google', 'Amazon', 'Bloomberg', 'Goldman Sachs'],
      statement: `<p>Given daily prices, find the maximum profit with as many transactions as you like, but: you can hold at most one share at a time, and after you <b>sell</b> you cannot buy on the <b>next</b> day (one-day cooldown).</p>`,
      constraints: `1 ≤ prices.length ≤ 5000, 0 ≤ prices[i] ≤ 1000. O(N) time, O(1) space.`,
      example: `<p>prices = [1, 2, 3, 0, 2] → <b>3</b>: ${H.c('g', 'buy 1, sell 2, cooldown, buy 0, sell 2')}. Selling at 3 instead (+2) forces the cooldown on the day of price 0, so the second trade is lost.</p>`,
      brute: {
        why: `<p>Recursively decide each day: buy / sell / do nothing, tracking whether we hold a share and whether we are in cooldown. That is up to 3<sup>N</sup> paths; the same (day, holding, cooldown) situation is reached through many histories and solved again every time.</p>`,
        code: { lang: 'java', code: `class Brute {
    int go(int[] p, int day, boolean holding) {
        if (day >= p.length) return 0;
        int best = go(p, day + 1, holding);                              // do nothing
        if (holding) best = Math.max(best, p[day] + go(p, day + 2, false));  // sell, skip next day
        else best = Math.max(best, -p[day] + go(p, day + 1, true));      // buy
        return best;
    }
    public int maxProfit(int[] prices) { return go(prices, 0, false); }
}`, alt: [
          { lang: 'python', code: `def max_profit(prices):
    def go(day, holding):
        if day >= len(prices):
            return 0
        best = go(day + 1, holding)                              # do nothing
        if holding:
            best = max(best, prices[day] + go(day + 2, False))   # sell, skip next day
        else:
            best = max(best, -prices[day] + go(day + 1, True))   # buy
        return best

    return go(0, False)` },
          { lang: 'js', code: `function maxProfit(prices) {
  function go(day, holding) {
    if (day >= prices.length) return 0;
    let best = go(day + 1, holding);                                   // do nothing
    if (holding) best = Math.max(best, prices[day] + go(day + 2, false)); // sell, skip next day
    else best = Math.max(best, -prices[day] + go(day + 1, true));         // buy
    return best;
  }
  return go(0, false);
}` },
          { lang: 'cpp', code: `class Brute {
    int go(vector<int>& p, int day, bool holding) {
        if (day >= (int)p.size()) return 0;
        int best = go(p, day + 1, holding);                                  // do nothing
        if (holding) best = max(best, p[day] + go(p, day + 2, false));       // sell, skip next day
        else best = max(best, -p[day] + go(p, day + 1, true));               // buy
        return best;
    }
public:
    int maxProfit(vector<int>& prices) { return go(prices, 0, false); }
};` }
        ] }
      },
      mcq: { q: 'In the cooldown machine, from which mode is “buy today” allowed?', options: ['rest only', 'sold or rest', 'hold', 'any mode'], answer: 0, explain: 'If you sold yesterday you are in cooldown today. Only the rest mode (no share, not cooling down) can buy.' },
      hints: [
        `<p>Hint 1: at the end of each day you are in one of three situations: holding a share, just sold today, or resting with no share.</p>`,
        `<p>Hint 2: keep the best profit for each situation in three variables; derive today’s values only from yesterday’s.</p>`,
        `<p>Hint 3: hold = max(hold, rest − p); sold = hold + p; rest = max(rest, sold_yesterday). Start hold = −∞, sold = 0 (or −∞), rest = 0. Answer max(sold, rest).</p>`
      ],
      solution: {
        approach: `<p>Three-variable state machine updated once per day. The cooldown is encoded by forbidding the arrow sold → hold: a buy must come from rest, and rest only absorbs yesterday’s sold value.</p>`,
        code: `class Solution {
    public int maxProfit(int[] prices) {
        int hold = Integer.MIN_VALUE, sold = 0, rest = 0;
        for (int p : prices) {
            int prevSold = sold;
            sold = hold + p;                    // sell what we held yesterday
            hold = Math.max(hold, rest - p);    // keep, or buy from rest (not from sold!)
            rest = Math.max(rest, prevSold);    // idle, or yesterday's sale finishes cooldown
        }
        return Math.max(sold, rest);
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def max_profit(self, prices):
        hold, sold, rest = float('-inf'), float('-inf'), 0
        for p in prices:
            hold, sold, rest = max(hold, rest - p), hold + p, max(rest, sold)
        return max(sold, rest)` }, { lang: 'js', code: `function maxProfit(prices) {
  let hold = -Infinity, sold = -Infinity, rest = 0;
  for (const p of prices) {
    // destructuring reads only yesterday's values on the right-hand side
    [hold, sold, rest] = [Math.max(hold, rest - p), hold + p, Math.max(rest, sold)];
  }
  return Math.max(sold, rest);
}` }, { lang: 'cpp', code: `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        long hold = LONG_MIN / 2, sold = 0, rest = 0;
        for (int p : prices) {
            long prevSold = sold;
            sold = hold + p;
            hold = max(hold, rest - p);
            rest = max(rest, prevSold);
        }
        return (int)max(sold, rest);
    }
};` }],
        dry: { head: ['day', 'price', 'hold', 'sold', 'rest'], rows: [
          ['0', '1', '−1 (buy)', '−∞', '0'], ['1', '2', '−1', '1', '0'], ['2', '3', '−1', '2', '1'],
          ['3', '0', '1 (buy from rest 1)', '−1', '2'], ['4', '2', '1', '<span class="c-g">3</span>', '2']
        ] },
        complexity: `<p>Time O(N), space O(1).</p>`,
        followUps: ['Cooldown of c days instead of 1.', 'Add a transaction fee as well.', 'Allow at most k transactions with cooldown.']
      },
      tests: { sig: 'int[] -> int', fn: 'maxProfit', cases: [
        [[[1, 2, 3, 0, 2]], 3],
        [[[1]], 0],
        [[[1, 2]], 1],
        [[[2, 1]], 0],
        [[[6, 1, 3, 2, 4, 7]], 6],
        [[[1, 2, 4]], 3],
        [[[0, 0, 0]], 0],
        [[[3, 3, 5, 0, 0, 3, 1, 4]], 6],
        [[{ $concat: [{ $range: [0, 1000] }, { $range: [0, 1000] }, { $range: [0, 1000] }, { $range: [0, 1000] }, { $range: [0, 1000] }] }], 4991],
        [[{ $rep: 1000, n: 5000 }], 0]
      ] }
    }]
  });

  // ================= TOPIC 6: DP on subsequences / strings =================
  topics.push({
    title: 'DP on Subsequences & Strings: the two-pointer grid family (LPS, SCS, Distinct Subsequences, wildcard/regex)',
    analogy: `<p>Imagine two people reading two different books <b>side by side</b>, each with a finger on their current letter. At every step they compare the letters under their fingers and decide: <b>both move</b> (letters match), <b>only I move</b>, or <b>only you move</b>. Every string-DP problem is just a different rule for which moves are allowed and what each move scores.</p>
      <p>The grid <code>dp[i][j]</code> is a map of “where both fingers could be”; the answer lives in the corner where both books are finished.</p>`,
    explain: `<p>In DP I you met LCS and Edit Distance. They are two members of a big family. The state is always <code>dp[i][j]</code> = answer for the <b>prefixes</b> <code>a[0..i)</code> and <code>b[0..j)</code> (or for the substring <code>s[i..j]</code> when there is only one string). Each cell looks at up to three neighbours: <b>diagonal</b> (use both last characters), <b>up</b> (drop a’s last char), <b>left</b> (drop b’s last char).</p>
      ${H.table(['problem', 'if last chars match', 'if they differ', 'answer'], [
        ['LCS (recap)', 'diag + 1', 'max(up, left)', 'dp[m][n]'],
        ['Shortest Common Supersequence length', 'diag + 1', 'min(up, left) + 1', 'm + n − LCS'],
        ['Min deletions to make a, b equal', 'diag', 'min(up, left) + 1', 'm + n − 2·LCS'],
        ['Distinct Subsequences (count ways b appears in a)', 'up + diag', 'up', 'dp[m][n]'],
        ['Longest Palindromic Subsequence (one string, substring s[i..j])', 'inner + 2', 'max(drop left, drop right)', 'dp[0][n−1]'],
        ['Min insertions to make s a palindrome', '—', '—', 'n − LPS'],
        ['Wildcard matching (? and *)', '? or equal → diag', '* → up (use *) OR left (empty *)', 'dp[m][n]']
      ])}
      <h4>Distinct Subsequences walk-through: how many times does “bag” appear as a subsequence of “babgbag”?</h4>
      <p><code>dp[i][j]</code> = ways to form the first j letters of t using the first i letters of s. Empty t can be formed in exactly 1 way (pick nothing), so <code>dp[i][0] = 1</code>. For each new letter of s we can always <b>skip</b> it (dp[i−1][j]); if it matches t’s current letter we can also <b>use</b> it (dp[i−1][j−1]).</p>
      ${H.table(['s prefix', '""', 'b', 'ba', 'bag'], [
        ['""', '1', '0', '0', '0'], ['b', '1', '1', '0', '0'], ['ba', '1', '1', '1', '0'], ['bab', '1', '2', '1', '0'],
        ['babg', '1', '2', '1', '1'], ['babgb', '1', '3', '1', '1'], ['babgba', '1', '3', '4', '1'], ['babgbag', '1', '3', '4', H.c('g', '5')]
      ])}
      <h4>Longest Palindromic Subsequence</h4>
      <p>One string, so the state is a <b>substring</b> <code>s[i..j]</code> (interval DP!). If the ends match, both join the palindrome: <code>2 + dp[i+1][j−1]</code>; otherwise drop one end: <code>max(dp[i+1][j], dp[i][j−1])</code>. “bbbab” → <b>4</b> (“bbbb”). Equivalent shortcut: LPS(s) = LCS(s, reverse(s)).</p>
      <p><b>Subsequence vs substring reminder:</b> “longest palindromic <b>substring</b>” (contiguous) is a different problem — expand around centre (DSA 9). If the problem says “delete some characters”, it is a subsequence.</p>`,
    clues: [
      '"<b>Two strings</b>" + "subsequence / transform / match / interleave" → 2D grid over prefixes dp[i][j].',
      '"<b>Number of distinct ways</b> t appears as a subsequence of s" → counting grid: skip always, use when equal.',
      '"<b>Minimum insertions / deletions</b> to make a string a palindrome" → n − LPS; "to make two strings equal" → m + n − 2·LCS.',
      '"Shortest string that has both a and b as subsequences" → SCS = m + n − LCS, rebuild by walking the LCS grid backwards.',
      '"Pattern with <b>?</b> / <b>*</b> / <b>.</b>" (wildcard or regex matching) → boolean grid with a special rule for *.',
      'Lengths up to 1000–2000 → O(m·n) grid; memory tight → keep two rows (or one row updated in the right direction).'
    ],
    code: [{ lang: 'java', code: `
      // Distinct Subsequences with ONE row. j goes right-to-left so dp[j-1] is still "last row".
      static int numDistinct(String s, String t) {
          int m = s.length(), n = t.length();
          int[] dp = new int[n + 1];
          dp[0] = 1;                              // empty t: one way (choose nothing)
          for (int i = 1; i <= m; i++) {
              char c = s.charAt(i - 1);
              for (int j = Math.min(i, n); j >= 1; j--) {
                  // skip s[i-1] -> dp[j] unchanged; use it if it matches t[j-1] -> add dp[j-1]
                  if (c == t.charAt(j - 1)) dp[j] += dp[j - 1];
                  // int wrap-around is safe here: only additions, and the final answer fits in int
              }
          }
          return dp[n];
      }`, alt: [{ lang: 'python', code: `# Distinct Subsequences with ONE row. j goes right-to-left so dp[j-1] is still "last row".
def num_distinct(s, t):
    n = len(t)
    dp = [1] + [0] * n                       # empty t: one way (choose nothing)
    for i, c in enumerate(s, 1):
        for j in range(min(i, n), 0, -1):
            # skip s[i-1] -> dp[j] unchanged; use it if it matches t[j-1] -> add dp[j-1]
            if c == t[j - 1]:
                dp[j] += dp[j - 1]           # Python ints never overflow
    return dp[n]` }, { lang: 'js', code: `// Distinct Subsequences with ONE row. j goes right-to-left so dp[j-1] is still "last row".
function numDistinct(s, t) {
  const m = s.length, n = t.length;
  const dp = new Int32Array(n + 1);          // 32-bit cells wrap like Java int
  dp[0] = 1;                                 // empty t: one way (choose nothing)
  for (let i = 1; i <= m; i++) {
    const c = s[i - 1];
    for (let j = Math.min(i, n); j >= 1; j--) {
      // skip s[i-1] -> dp[j] unchanged; use it if it matches t[j-1] -> add dp[j-1]
      // plain Numbers would lose precision past 2^53; | 0 wraps mod 2^32, which is safe for sums
      if (c === t[j - 1]) dp[j] = (dp[j] + dp[j - 1]) | 0;
    }
  }
  return dp[n];
}` }, { lang: 'cpp', code: `// Distinct Subsequences with ONE row. j goes right-to-left so dp[j-1] is still "last row".
int numDistinct(const string& s, const string& t) {
    int m = s.size(), n = t.size();
    vector<unsigned int> dp(n + 1, 0);       // unsigned wrap-around is defined (signed overflow is not)
    dp[0] = 1;                               // empty t: one way (choose nothing)
    for (int i = 1; i <= m; i++) {
        char c = s[i - 1];
        for (int j = min(i, n); j >= 1; j--)
            // skip s[i-1] -> dp[j] unchanged; use it if it matches t[j-1] -> add dp[j-1]
            if (c == t[j - 1]) dp[j] += dp[j - 1];
    }
    return (int)dp[n];                       // the final answer fits in int
}` }] }, { lang: 'java', code: `
      // Longest Palindromic Subsequence (interval DP on one string).
      static int longestPalindromeSubseq(String s) {
          int n = s.length();
          int[][] dp = new int[n][n];
          for (int i = n - 1; i >= 0; i--) {       // i from the end so dp[i+1][*] is ready
              dp[i][i] = 1;
              for (int j = i + 1; j < n; j++) {
                  if (s.charAt(i) == s.charAt(j)) dp[i][j] = dp[i + 1][j - 1] + 2;   // both ends join
                  else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j - 1]);               // drop one end
              }
          }
          return dp[0][n - 1];
      }`, alt: [{ lang: 'python', code: `# Longest Palindromic Subsequence (interval DP on one string).
def longest_palindrome_subseq(s):
    n = len(s)
    dp = [[0] * n for _ in range(n)]
    for i in range(n - 1, -1, -1):           # i from the end so dp[i+1][*] is ready
        dp[i][i] = 1
        for j in range(i + 1, n):
            if s[i] == s[j]:
                dp[i][j] = dp[i + 1][j - 1] + 2                  # both ends join
            else:
                dp[i][j] = max(dp[i + 1][j], dp[i][j - 1])       # drop one end
    return dp[0][n - 1]` }, { lang: 'js', code: `// Longest Palindromic Subsequence (interval DP on one string).
function longestPalindromeSubseq(s) {
  const n = s.length;
  const dp = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = n - 1; i >= 0; i--) {         // i from the end so dp[i+1][*] is ready
    dp[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      if (s[i] === s[j]) dp[i][j] = dp[i + 1][j - 1] + 2;               // both ends join
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j - 1]);             // drop one end
    }
  }
  return dp[0][n - 1];
}` }, { lang: 'cpp', code: `// Longest Palindromic Subsequence (interval DP on one string).
int longestPalindromeSubseq(const string& s) {
    int n = s.size();
    vector<vector<int>> dp(n, vector<int>(n, 0));
    for (int i = n - 1; i >= 0; i--) {       // i from the end so dp[i+1][*] is ready
        dp[i][i] = 1;
        for (int j = i + 1; j < n; j++) {
            if (s[i] == s[j]) dp[i][j] = dp[i + 1][j - 1] + 2;          // both ends join
            else dp[i][j] = max(dp[i + 1][j], dp[i][j - 1]);            // drop one end
        }
    }
    return dp[0][n - 1];
}` }] }, { lang: 'java', code: `
      // Shortest Common Supersequence: build the LCS grid, then walk back from the corner.
      static String shortestCommonSupersequence(String a, String b) {
          int m = a.length(), n = b.length();
          int[][] L = new int[m + 1][n + 1];
          for (int i = 1; i <= m; i++)
              for (int j = 1; j <= n; j++)
                  L[i][j] = a.charAt(i - 1) == b.charAt(j - 1) ? L[i - 1][j - 1] + 1 : Math.max(L[i - 1][j], L[i][j - 1]);
          StringBuilder sb = new StringBuilder();
          int i = m, j = n;
          while (i > 0 && j > 0) {
              if (a.charAt(i - 1) == b.charAt(j - 1)) { sb.append(a.charAt(i - 1)); i--; j--; }  // shared char once
              else if (L[i - 1][j] >= L[i][j - 1]) sb.append(a.charAt(--i));                     // keep a's char
              else sb.append(b.charAt(--j));                                                      // keep b's char
          }
          while (i > 0) sb.append(a.charAt(--i));
          while (j > 0) sb.append(b.charAt(--j));
          return sb.reverse().toString();
      }`, alt: [{ lang: 'python', code: `# Shortest Common Supersequence: build the LCS grid, then walk back from the corner.
def shortest_common_supersequence(a, b):
    m, n = len(a), len(b)
    L = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            L[i][j] = L[i - 1][j - 1] + 1 if a[i - 1] == b[j - 1] else max(L[i - 1][j], L[i][j - 1])
    out, i, j = [], m, n                     # collect backwards, reverse at the end
    while i > 0 and j > 0:
        if a[i - 1] == b[j - 1]:
            out.append(a[i - 1]); i -= 1; j -= 1   # shared char once
        elif L[i - 1][j] >= L[i][j - 1]:
            out.append(a[i - 1]); i -= 1           # keep a's char
        else:
            out.append(b[j - 1]); j -= 1           # keep b's char
    out.extend(reversed(a[:i]))
    out.extend(reversed(b[:j]))
    return ''.join(reversed(out))` }, { lang: 'js', code: `// Shortest Common Supersequence: build the LCS grid, then walk back from the corner.
function shortestCommonSupersequence(a, b) {
  const m = a.length, n = b.length;
  const L = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      L[i][j] = a[i - 1] === b[j - 1] ? L[i - 1][j - 1] + 1 : Math.max(L[i - 1][j], L[i][j - 1]);
  const out = [];                            // collect backwards, reverse at the end
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { out.push(a[i - 1]); i--; j--; }   // shared char once
    else if (L[i - 1][j] >= L[i][j - 1]) out.push(a[--i]);           // keep a's char
    else out.push(b[--j]);                                            // keep b's char
  }
  while (i > 0) out.push(a[--i]);
  while (j > 0) out.push(b[--j]);
  return out.reverse().join('');
}` }, { lang: 'cpp', code: `// Shortest Common Supersequence: build the LCS grid, then walk back from the corner.
string shortestCommonSupersequence(const string& a, const string& b) {
    int m = a.size(), n = b.size();
    vector<vector<int>> L(m + 1, vector<int>(n + 1, 0));
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            L[i][j] = a[i - 1] == b[j - 1] ? L[i - 1][j - 1] + 1 : max(L[i - 1][j], L[i][j - 1]);
    string out;                              // collect backwards, reverse at the end
    int i = m, j = n;
    while (i > 0 && j > 0) {
        if (a[i - 1] == b[j - 1]) { out += a[i - 1]; i--; j--; }    // shared char once
        else if (L[i - 1][j] >= L[i][j - 1]) out += a[--i];          // keep a's char
        else out += b[--j];                                           // keep b's char
    }
    while (i > 0) out += a[--i];
    while (j > 0) out += b[--j];
    reverse(out.begin(), out.end());
    return out;
}` }] }, { lang: 'python', run: true, title: 'The family in Python (runnable)', code: `def lcs(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            dp[i][j] = dp[i-1][j-1] + 1 if a[i-1] == b[j-1] else max(dp[i-1][j], dp[i][j-1])
    return dp[m][n]

def num_distinct(s, t):
    dp = [1] + [0] * len(t)
    for c in s:
        for j in range(len(t), 0, -1):       # right to left: dp[j-1] is still the old row
            if c == t[j - 1]:
                dp[j] += dp[j - 1]
    return dp[-1]

def lps(s):
    return lcs(s, s[::-1])                   # LPS = LCS with the reverse

def wildcard(s, p):
    m, n = len(s), len(p)
    dp = [[False] * (n + 1) for _ in range(m + 1)]
    dp[0][0] = True
    for j in range(1, n + 1):
        dp[0][j] = dp[0][j - 1] and p[j - 1] == '*'      # leading stars match empty
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if p[j - 1] == '*':
                dp[i][j] = dp[i][j - 1] or dp[i - 1][j]  # star = empty, or star eats s[i-1]
            else:
                dp[i][j] = dp[i - 1][j - 1] and p[j - 1] in ('?', s[i - 1])
    return dp[m][n]

print(num_distinct("rabbbit", "rabbit"), num_distinct("babgbag", "bag"))   # 3 5
print(lps("bbbab"), len("mbadm") - lps("mbadm"))                            # 4 2 (min insertions)
print(len("abac") + len("cab") - lcs("abac", "cab"))                        # SCS length 5
print(wildcard("adceb", "*a*b"), wildcard("acdcb", "a*c?b"))                # True False
` }],
    codeTitle: ['Distinct Subsequences, one row', 'Longest Palindromic Subsequence', 'Shortest Common Supersequence with reconstruction', 'Family in Python (runnable)'],
    viz: [{
      title: 'Distinct Subsequences: each cell = “skip this letter” + (“use it” if it matches)',
      input: 'babgbag ; bag',
      inputLabel: 's ; t   (lowercase, s ≤ 10 letters, t ≤ 6 letters)',
      gen: function (input) {
        var parts = String(input === undefined ? '' : input).split(/[;|]/);
        if (parts.length < 2) throw new Error('Format: s ; t   e.g. rabbbit ; rabbit');
        var s = cleanWord(parts[0], 10, 's'), t = cleanWord(parts[1], 6, 't');
        var m = s.length, n = t.length, dp = [], frames = [];
        for (var i = 0; i <= m; i++) { dp.push([]); for (var j = 0; j <= n; j++) dp[i].push(i === 0 ? (j === 0 ? 1 : 0) : (j === 0 ? 1 : null)); }
        var colHead = ['""'].concat(t.split('')), rowHead = ['""'].concat(s.split(''));
        var view = function () { return dp.map(function (r) { return r.map(function (v) { return v === null ? '' : v; }); }); };
        frames.push({ narr: 'dp[i][j] = number of ways to form the first j letters of t = "' + t + '" from the first i letters of s = "' + s + '". Column "" is all 1s (forming the empty string: pick nothing). Row "" is 0 elsewhere (nothing to pick from).', parts: [
          { type: 'grid', label: 'dp (rows = s prefix, columns = t prefix)', rows: view(), rowHead: rowHead, colHead: colHead, hl: { '0,0': 'ok' } }
        ] });
        for (var r = 1; r <= m; r++) {
          var c = s[r - 1], hl = {}, notes = [];
          for (var col = 1; col <= n; col++) {
            var skip = dp[r - 1][col], use = c === t[col - 1] ? dp[r - 1][col - 1] : 0;
            dp[r][col] = skip + use;
            if (c === t[col - 1]) { hl[r + ',' + col] = 'ok'; hl[(r - 1) + ',' + (col - 1)] = 'win'; notes.push('t[' + (col - 1) + ']=' + t[col - 1] + ' matches: ' + skip + ' (skip) + ' + use + ' (use) = ' + dp[r][col]); }
            else hl[r + ',' + col] = 'cur';
          }
          frames.push({ narr: 'Row ' + r + ': new letter <b>' + c + '</b> from s. Every cell first copies the cell above (skip this letter). ' + (notes.length ? 'Matches (green) also add the diagonal (blue): ' + notes.join('; ') + '.' : 'It matches no letter of t, so the row is just a copy of the one above.'), parts: [
            { type: 'grid', label: 'dp', rows: view(), rowHead: rowHead, colHead: colHead, hl: hl },
            { type: 'array', label: 's', values: s.split(''), showIdx: true, hl: one(r - 1, 'cur') }
          ] });
        }
        frames.push({ narr: 'Answer = dp[' + m + '][' + n + '] = <b>' + dp[m][n] + '</b> distinct ways to pick "' + t + '" out of "' + s + '" (positions differ, letters kept in order).', parts: [
          { type: 'grid', label: 'dp (final)', rows: view(), rowHead: rowHead, colHead: colHead, hl: one(m + ',' + n, 'sel') },
          { type: 'vars', label: 'answer', vals: { ways: dp[m][n] }, hl: { ways: 'sel' } }
        ] });
        return frames;
      }
    }, {
      title: 'Longest Palindromic Subsequence: fill s[i..j] from short to long',
      input: 'bbbab',
      inputLabel: 'lowercase string (≤ 7 letters)',
      gen: function (input) {
        var s = cleanWord(input, 7, 'the string');
        var n = s.length, dp = [], frames = [], chars = s.split('');
        for (var a = 0; a < n; a++) { dp.push([]); for (var b = 0; b < n; b++) dp[a].push(b < a ? '' : (a === b ? 1 : '?')); }
        var view = function () { return dp.map(function (r) { return r.slice(); }); };
        var diag = {}; for (var d = 0; d < n; d++) diag[d + ',' + d] = 'ok';
        frames.push({ narr: 'dp[i][j] = longest palindromic subsequence inside s[i..j]. Every single letter is a palindrome of length 1 (diagonal). We now fill longer substrings.', parts: [
          { type: 'grid', label: 'dp (row = start i, column = end j)', rows: view(), rowHead: chars, colHead: chars, hl: diag }
        ] });
        for (var len = 2; len <= n; len++) {
          for (var i = 0; i + len - 1 < n; i++) {
            var j = i + len - 1, hl = {}, narr;
            hl[i + ',' + j] = 'cur';
            if (s[i] === s[j]) {
              var inner = len === 2 ? 0 : dp[i + 1][j - 1];
              dp[i][j] = inner + 2;
              if (len > 2) hl[(i + 1) + ',' + (j - 1)] = 'win';
              narr = 's[' + i + ']=' + s[i] + ' equals s[' + j + ']=' + s[j] + ' → both ends join: ' + inner + ' + 2 = <b>' + dp[i][j] + '</b>.';
            } else {
              dp[i][j] = Math.max(dp[i + 1][j], dp[i][j - 1]);
              hl[(i + 1) + ',' + j] = 'win'; hl[i + ',' + (j - 1)] = 'win';
              narr = 's[' + i + ']=' + s[i] + ' ≠ s[' + j + ']=' + s[j] + ' → drop one end: max(' + dp[i + 1][j] + ', ' + dp[i][j - 1] + ') = <b>' + dp[i][j] + '</b>.';
            }
            frames.push({ narr: 'Substring "' + s.slice(i, j + 1) + '": ' + narr, parts: [
              { type: 'array', label: 's', values: chars, showIdx: true, range: [i, j], hl: (function () { var o = {}; o[i] = 'cur'; o[j] = 'cur'; return o; })() },
              { type: 'grid', label: 'dp', rows: view(), rowHead: chars, colHead: chars, hl: hl }
            ] });
          }
        }
        frames.push({ narr: 'Answer dp[0][' + (n - 1) + '] = <b>' + dp[0][n - 1] + '</b>. Bonus: minimum insertions to make "' + s + '" a palindrome = ' + n + ' − ' + dp[0][n - 1] + ' = <b>' + (n - dp[0][n - 1]) + '</b>.', parts: [
          { type: 'grid', label: 'dp (final)', rows: view(), rowHead: chars, colHead: chars, hl: one('0,' + (n - 1), 'sel') },
          { type: 'vars', label: 'answer', vals: { LPS: dp[0][n - 1], 'min insertions': n - dp[0][n - 1] }, hl: { LPS: 'sel' } }
        ] });
        return frames;
      }
    }],
    examples: [
      {
        title: 'Minimum insertions to make "mbadm" a palindrome',
        html: `<p>LPS("mbadm") = 3 ("mam" or "mdm"). Every letter <b>not</b> in the LPS needs a mirror partner inserted, so insertions = 5 − 3 = ${H.c('g', '2')} (e.g. “mbdadbm”). Same count for <b>deletions</b> to make it a palindrome.</p>`
      },
      {
        title: 'Shortest Common Supersequence of "abac" and "cab"',
        html: `<p>LCS = "ab" (length 2). SCS length = 4 + 3 − 2 = ${H.c('g', '5')}. Walking back through the LCS grid: shared letters are written once, other letters come from whichever string they belong to → “cabac”. Check: “abac” ⊂ c<b>abac</b>, “cab” ⊂ <b>cab</b>ac.</p>`
      },
      {
        title: 'Wildcard matching: s = "adceb", p = "*a*b"',
        html: `<p><code>*</code> has two choices: match nothing (move left in p: dp[i][j−1]) or eat one more char of s (move up: dp[i−1][j], staying on the same *). <code>?</code> matches any single char (diagonal).</p>
          <p>Leading * matches "" → dp[0][1] = T. "a" matches 'a' via diagonal; second * eats "dce"; "b" matches 'b' → ${H.c('g', 'true')}. For s = "acdcb", p = "a*c?b": the pattern ends with <code>c?b</code>, so s must end with “c, any letter, b”. The last three letters of "acdcb" are d, c, b and d ≠ c → ${H.c('r', 'false')}.</p>`
      },
      {
        title: 'Interleaving String: is s3 a shuffle of s1 and s2?',
        html: `<p>dp[i][j] = can s3[0..i+j) be formed from s1[0..i) and s2[0..j) keeping each one’s order? <code>dp[i][j] = (dp[i−1][j] &amp;&amp; s1[i−1] == s3[i+j−1]) || (dp[i][j−1] &amp;&amp; s2[j−1] == s3[i+j−1])</code>. s1 = "aab", s2 = "axy", s3 = "aaxaby" → ${H.c('g', 'true')} (a from s1, then a, x from s2, then a, b from s1, then y from s2).</p>`,
        code: { lang: 'java', code: `static boolean isInterleave(String s1, String s2, String s3) {
    int m = s1.length(), n = s2.length();
    if (m + n != s3.length()) return false;
    boolean[] dp = new boolean[n + 1];        // one row: dp[j] for the current i
    for (int i = 0; i <= m; i++) {
        for (int j = 0; j <= n; j++) {
            if (i == 0 && j == 0) { dp[0] = true; continue; }
            boolean fromS1 = i > 0 && dp[j] && s1.charAt(i - 1) == s3.charAt(i + j - 1);       // dp[j] = old row (i-1)
            boolean fromS2 = j > 0 && dp[j - 1] && s2.charAt(j - 1) == s3.charAt(i + j - 1);   // dp[j-1] = this row
            dp[j] = fromS1 || fromS2;
        }
    }
    return dp[n];
}`, alt: [{ lang: 'python', code: `def is_interleave(s1, s2, s3):
    m, n = len(s1), len(s2)
    if m + n != len(s3):
        return False
    dp = [False] * (n + 1)                   # one row: dp[j] for the current i
    for i in range(m + 1):
        for j in range(n + 1):
            if i == 0 and j == 0:
                dp[0] = True
                continue
            from_s1 = i > 0 and dp[j] and s1[i - 1] == s3[i + j - 1]        # dp[j] = old row (i-1)
            from_s2 = j > 0 and dp[j - 1] and s2[j - 1] == s3[i + j - 1]    # dp[j-1] = this row
            dp[j] = from_s1 or from_s2
    return dp[n]` }, { lang: 'js', code: `function isInterleave(s1, s2, s3) {
  const m = s1.length, n = s2.length;
  if (m + n !== s3.length) return false;
  const dp = new Array(n + 1).fill(false);   // one row: dp[j] for the current i
  for (let i = 0; i <= m; i++) {
    for (let j = 0; j <= n; j++) {
      if (i === 0 && j === 0) { dp[0] = true; continue; }
      const fromS1 = i > 0 && dp[j] && s1[i - 1] === s3[i + j - 1];       // dp[j] = old row (i-1)
      const fromS2 = j > 0 && dp[j - 1] && s2[j - 1] === s3[i + j - 1];   // dp[j-1] = this row
      dp[j] = fromS1 || fromS2;
    }
  }
  return dp[n];
}` }, { lang: 'cpp', code: `bool isInterleave(const string& s1, const string& s2, const string& s3) {
    int m = s1.size(), n = s2.size();
    if (m + n != (int)s3.size()) return false;
    vector<bool> dp(n + 1, false);           // one row: dp[j] for the current i
    for (int i = 0; i <= m; i++) {
        for (int j = 0; j <= n; j++) {
            if (i == 0 && j == 0) { dp[0] = true; continue; }
            bool fromS1 = i > 0 && dp[j] && s1[i - 1] == s3[i + j - 1];       // dp[j] = old row (i-1)
            bool fromS2 = j > 0 && dp[j - 1] && s2[j - 1] == s3[i + j - 1];   // dp[j-1] = this row
            dp[j] = fromS1 || fromS2;
        }
    }
    return dp[n];
}` }] }
      }
    ],
    deepDive: `<p><b>Reading the grid as a graph.</b> Every string dp of this family is a shortest/longest/counting path problem on an (m+1)×(n+1) grid DAG where each cell has edges to its up, left and diagonal neighbours. LCS = longest path using diagonal edges only on matches; Edit Distance = shortest path with unit costs; Distinct Subsequences = count of paths. Thinking this way makes new variants (weighted edits, affine gaps in bioinformatics) feel natural.</p>
      <p><b>Memory.</b> Each row needs only the previous row → O(n) space. When a single row is updated in place, the <b>direction</b> matters: Distinct Subsequences reads dp[j−1] from the previous row, so iterate j <b>right to left</b>; Interleaving String reads dp[j−1] from the current row, so iterate left to right. Reconstruction (SCS, printing the LCS) needs the full table — or Hirschberg’s divide-and-conquer, which rebuilds an LCS in O(m·n) time and O(min(m, n)) space.</p>
      <p><b>Overflow in counting dp.</b> Distinct Subsequences counts can explode in intermediate cells even when the final answer fits. Because the recurrence only adds, 32-bit wrap-around keeps every value correct modulo 2<sup>32</sup>, so the final (small) answer comes out right. Java <code>int</code> wraps by itself; in C++ use <code>unsigned int</code> (signed overflow is undefined behaviour); in JavaScript plain numbers silently lose precision past 2<sup>53</sup>, so store cells in an <code>Int32Array</code> or add with <code>| 0</code>; Python integers never overflow (the big middle values just cost a little time). If the problem asks “modulo 10<sup>9</sup>+7”, apply the mod on every addition.</p>
      <p><b>Regex vs wildcard.</b> In regex <code>x*</code> means “zero or more of the previous element”, so the star looks two pattern characters back: <code>dp[i][j] = dp[i][j−2] || (match(s[i−1], p[j−2]) &amp;&amp; dp[i−1][j])</code>. Wildcard <code>*</code> stands alone. Mixing the two is a top interview bug. Wildcard also has a greedy O(m·n)-worst / usually linear two-pointer solution with backtracking to the last star.</p>
      <p><b>Speed limits.</b> LCS/edit distance cannot be solved in strongly sub-quadratic time unless the Strong Exponential Time Hypothesis fails (Backurs–Indyk 2015). Practical tools use bit-parallel LCS (Allison–Dix / Myers: 64 cells per machine word) and Myers’ O((m+n)·D) diff where D is the edit distance — that is what <code>git diff</code> uses.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes LCS-shaped code fluently, and many “string dp” questions are now asked as variants: weighted edits, “at most k mismatches”, “count modulo 1e9+7”, or “reconstruct one answer”. Your job is to define the cell meaning precisely and check the transitions — that is where generated code slips.</p>
      <p><b>Use AI as a partner:</b> <code>Write a brute force that enumerates all subsequences for strings up to length 12, and a random test harness comparing it to my dp.</code> Ask it to explain the difference between regex <code>*</code> and wildcard <code>*</code> with a 3-character example, then verify by hand on the grid.</p>
      <p><b>Where AI goes wrong:</b> 1D optimisation with the wrong loop direction (silently reusing the current row); confusing substring with subsequence; regex star handled like wildcard star; forgetting the empty-prefix row/column initialisation (leading stars, dp[i][0] = 1).</p>
      <p><b>What you must still own:</b> the sentence “dp[i][j] means … for prefixes of length i and j”, the base row/column, and the three-arrow picture.</p>`,
    problems: [{
      title: 'Distinct Subsequences', level: 'Hard', tags: ['string dp', 'counting', 'subsequence'], companies: ['Google', 'Amazon', 'Bloomberg'],
      statement: `<p>Given strings <code>s</code> and <code>t</code>, return the number of distinct <b>subsequences</b> of <code>s</code> that equal <code>t</code> (two subsequences are different if they use different index sets).</p>`,
      constraints: `1 ≤ s.length, t.length ≤ 1000, English letters. The answer fits in a 32-bit signed integer.`,
      example: `<p>s = ${H.c('b', '"rabbbit"')}, t = "rabbit" → <b>3</b>: the three b’s give three ways to drop exactly one b (ra${H.c('r', 'b')}bbit, rab${H.c('r', 'b')}bit, rabb${H.c('r', 'b')}it with the red b removed). s = "babgbag", t = "bag" → 5.</p>`,
      brute: {
        why: `<p>Enumerate all 2<sup>m</sup> subsequences of s and count those equal to t (or recurse “use / skip” on each character). The same (i, j) — “first i letters of s, first j of t” — is reached via many different choices and recounted each time.</p>`,
        code: { lang: 'java', code: `class Brute {
    int count(String s, String t, int i, int j) {
        if (j == t.length()) return 1;          // matched all of t
        if (i == s.length()) return 0;          // ran out of s
        int ways = count(s, t, i + 1, j);       // skip s[i]
        if (s.charAt(i) == t.charAt(j)) ways += count(s, t, i + 1, j + 1);  // use s[i]
        return ways;                            // exponential without memo
    }
    public int numDistinct(String s, String t) { return count(s, t, 0, 0); }
}`, alt: [
          { lang: 'python', code: `def num_distinct(s, t):
    def count(i, j):
        if j == len(t):
            return 1                         # matched all of t
        if i == len(s):
            return 0                         # ran out of s
        ways = count(i + 1, j)               # skip s[i]
        if s[i] == t[j]:
            ways += count(i + 1, j + 1)      # use s[i]
        return ways                          # exponential without memo

    return count(0, 0)` },
          { lang: 'js', code: `function numDistinct(s, t) {
  function count(i, j) {
    if (j === t.length) return 1;            // matched all of t
    if (i === s.length) return 0;            // ran out of s
    let ways = count(i + 1, j);              // skip s[i]
    if (s[i] === t[j]) ways += count(i + 1, j + 1);   // use s[i]
    return ways;                             // exponential without memo
  }
  return count(0, 0);
}` },
          { lang: 'cpp', code: `class Brute {
    int count(const string& s, const string& t, int i, int j) {
        if (j == (int)t.size()) return 1;    // matched all of t
        if (i == (int)s.size()) return 0;    // ran out of s
        int ways = count(s, t, i + 1, j);    // skip s[i]
        if (s[i] == t[j]) ways += count(s, t, i + 1, j + 1);   // use s[i]
        return ways;                         // exponential without memo
    }
public:
    int numDistinct(string s, string t) { return count(s, t, 0, 0); }
};` }
        ] }
      },
      mcq: { q: 's[i−1] equals t[j−1]. What is dp[i][j]?', options: ['dp[i−1][j] + dp[i−1][j−1]', 'dp[i−1][j−1] + 1', 'max(dp[i−1][j], dp[i][j−1])', 'dp[i−1][j−1]'], answer: 0, explain: 'We may skip s[i−1] (dp[i−1][j] ways) or use it to match t[j−1] (dp[i−1][j−1] ways). The two groups are disjoint, so we add.' },
      hints: [
        `<p>Hint 1: for the last letter of the s-prefix you have two choices: ignore it, or (only if it equals t’s current letter) use it.</p>`,
        `<p>Hint 2: grid dp[i][j] over prefixes; dp[i][0] = 1 for every i (empty t), dp[0][j] = 0 for j &gt; 0.</p>`,
        `<p>Hint 3: one row suffices if j runs right-to-left. Recipe: dp = [1, 0, …]; for c in s: for j = n..1: if c == t[j−1]: dp[j] += dp[j−1]. Return dp[n].</p>`
      ],
      solution: {
        approach: `<p>Counting grid compressed to one row. Iterating j downward guarantees dp[j−1] still holds the previous row’s value when we add it. Only additions are used, so 32-bit wrap-around in intermediate cells cannot corrupt the final answer (which fits in a 32-bit int). Java <code>int</code> wraps on its own, C++ uses <code>unsigned int</code>, JavaScript an <code>Int32Array</code>, and Python’s integers simply never overflow.</p>`,
        code: `class Solution {
    public int numDistinct(String s, String t) {
        int n = t.length();
        int[] dp = new int[n + 1];
        dp[0] = 1;                                   // one way to build the empty string
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            for (int j = n; j >= 1; j--) {           // right to left: dp[j-1] is the old row
                if (c == t.charAt(j - 1)) dp[j] += dp[j - 1];
            }
        }
        return dp[n];
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def num_distinct(self, s, t):
        dp = [1] + [0] * len(t)
        for c in s:
            for j in range(len(t), 0, -1):
                if c == t[j - 1]:
                    dp[j] += dp[j - 1]             # Python ints never overflow
        return dp[-1]` }, { lang: 'js', code: `function numDistinct(s, t) {
  const n = t.length;
  const dp = new Int32Array(n + 1);                // Int32Array wraps like Java int
  dp[0] = 1;                                       // one way to build the empty string
  for (const c of s) {
    for (let j = n; j >= 1; j--) {                 // right to left: dp[j-1] is the old row
      // middle cells can pass 2^53; wrapping mod 2^32 keeps the final (32-bit) answer exact
      if (c === t[j - 1]) dp[j] = (dp[j] + dp[j - 1]) | 0;
    }
  }
  return dp[n];
}` }, { lang: 'cpp', code: `class Solution {
public:
    int numDistinct(string s, string t) {
        int n = t.size();
        vector<unsigned int> dp(n + 1, 0);             // unsigned wrap-around is well defined
        dp[0] = 1;                                     // one way to build the empty string
        for (char c : s)
            for (int j = n; j >= 1; j--)               // right to left: dp[j-1] is the old row
                if (c == t[j - 1]) dp[j] += dp[j - 1];
        return (int)dp[n];                             // the final answer fits in int
    }
};` }],
        dry: { head: ['letter of s', 'dp[""]', 'dp[b]', 'dp[ba]', 'dp[bag]'], rows: [
          ['(start)', '1', '0', '0', '0'], ['b', '1', '1', '0', '0'], ['a', '1', '1', '1', '0'], ['b', '1', '2', '1', '0'],
          ['g', '1', '2', '1', '1'], ['b', '1', '3', '1', '1'], ['a', '1', '3', '4', '1'], ['g', '1', '3', '4', '<span class="c-g">5</span>']
        ] },
        complexity: `<p>Time O(m·n), space O(n).</p>`,
        followUps: ['Return the count modulo 10<sup>9</sup>+7 for huge inputs.', 'Count distinct subsequences of a single string (LC 940).', 'What if t may contain a wildcard “?”?']
      },
      tests: { sig: 'string string -> int', fn: 'numDistinct', cases: [
        [['rabbbit', 'rabbit'], 3],
        [['babgbag', 'bag'], 5],
        [['a', 'b'], 0],
        [['a', 'a'], 1],
        [['abc', 'abcd'], 0],
        [['aaa', 'a'], 3],
        [['aaaaa', 'aa'], 10],
        // middle cells reach C(999, 499) (far past 64 bits); the answer C(999, 998) = 999 fits
        [[{ $concat: ['b', { $rep: 'a', n: 999 }] }, { $concat: ['b', { $rep: 'a', n: 998 }] }], 999],
        [[{ $rep: 'a', n: 1000 }, { $rep: 'a', n: 1000 }], 1]
      ] }
    }]
  });

  // ================= TOPIC 7: Picking the right DP shape =================
  topics.push({
    title: 'Pattern Map: reading a problem and picking the right DP shape (state design checklist)',
    analogy: `<p>A doctor does not memorise a treatment for every possible patient. They ask a few <b>quick questions</b> — fever? cough? how long? — and each answer narrows the diagnosis. DP is the same: a handful of questions about the problem (“one sequence or two? does order matter? is it a tree? are there modes?”) tells you the <b>shape</b> of the table before you write any code.</p>`,
    explain: `<p>Every DP solution is three decisions: <b>(1) the state</b> (what a cell means), <b>(2) the transition</b> (which smaller cells it reads), <b>(3) the order</b> (so those cells are ready). The six shapes of DP II:</p>
      ${H.table(['shape', 'state', 'typical transition', 'cost'], [
        ['LIS / “ends at i”', 'dp[i] = best ending exactly at i', 'max over j &lt; i with a compatibility test', 'O(N²) or O(N log N)'],
        ['Partition (prefix)', 'dp[i] = best for first i items', 'try every last piece s[j..i)', 'O(N²) · piece check'],
        ['Interval', 'dp[i][j] = best for range i..j', 'split point k, or the element handled last', 'O(N³)'],
        ['Tree', 'f(node) = tuple about its subtree', 'combine children in post-order', 'O(N)'],
        ['State machine', 'dp[t][mode]', 'arrows between modes from t−1', 'O(N · modes)'],
        ['Two-string grid', 'dp[i][j] over prefixes', 'diag / up / left', 'O(m · n)']
      ])}
      <h4>The quick questions (in this order)</h4>
      <ol>
        <li>Is the input a <b>tree</b>? → tree DP (post-order, return a tuple).</li>
        <li>Is there a <b>timeline with modes</b> (holding/not, cooldown, at most k)? → state machine.</li>
        <li>Are there <b>two sequences</b> compared letter by letter? → 2D prefix grid.</li>
        <li>Do you <b>merge / remove / bracket</b> neighbours, so a range’s both ends matter? → interval DP.</li>
        <li>Do you <b>cut</b> one sequence into consecutive pieces? → partition (prefix) DP.</li>
        <li>Do you <b>pick a subsequence</b> where each pick must be compatible with the previous pick? → LIS-style dp[i] “ending at i”.</li>
      </ol>
      <p><b>Then sanity-check:</b> number of states × work per state must fit the constraints (≈ 10<sup>8</sup> simple steps per second). N = 10<sup>5</sup> rules out O(N²); N = 500 allows O(N³); N = 20 hints at bitmask DP (DSA 23).</p>
      <p><b>Write the sentence first.</b> “dp[i][j] = the maximum coins from bursting only balloons i..j while i−1 and j+1 are still standing.” If you cannot say the sentence, you do not have a state yet — and no amount of coding will fix that.</p>`,
    clues: [
      '"subsequence" + one array + "each chosen element must be bigger / divisible / compatible with the previous one" → LIS-style dp[i].',
      '"split / segment / partition into contiguous parts" → prefix dp over the last piece.',
      '"merge adjacent", "burst", "parenthesise", "cut at positions" + N ≤ 500 → interval dp[i][j].',
      '"binary tree" + "choose nodes" or "path anywhere" → tree dp returning a tuple / gain.',
      '"days", "cooldown", "at most k transactions", "consecutive" restrictions → state machine.',
      '"two strings" + "subsequence / edit / match / interleave" → 2D prefix grid.'
    ],
    viz: {
      title: 'Problem classifier: answer the quick questions for a sample problem statement',
      input: 'Given a binary tree, you cannot rob two directly linked houses',
      inputLabel: 'Type (or paste) a short problem statement in English',
      gen: function (input) {
        var txt = String(input === undefined ? '' : input).toLowerCase().trim();
        if (txt.length < 8) throw new Error('Type a short problem statement (at least 8 characters), e.g. "split the string into dictionary words"');
        if (txt.length > 400) txt = txt.slice(0, 400);
        var has = function (words) { return words.some(function (w) { return txt.indexOf(w) >= 0; }); };
        var Q = [
          { id: 'T', q: 'Is the input a tree?', words: ['tree', 'node', 'root', 'subtree'], ans: 'Tree DP: post-order DFS, return a tuple / gain per node.' },
          { id: 'S', q: 'Timeline with modes (hold, cooldown, at most k)?', words: ['stock', 'buy', 'sell', 'cooldown', 'transaction', 'consecutive', 'day'], ans: 'State-machine DP: one variable per mode, arrows from yesterday.' },
          { id: 'G', q: 'Two sequences compared position by position?', words: ['two strings', 'string s and', 's and t', 'word1', 'text1', 'pattern', 'interleav', 'supersequence', 'distinct subsequence'], ans: '2D grid over prefixes: diag / up / left.' },
          { id: 'I', q: 'Merge / burst / bracket neighbours (both range ends matter)?', words: ['burst', 'merge', 'matrix', 'parenthes', 'triangulat', 'cut a stick', 'cuts', 'balloon'], ans: 'Interval DP: dp[i][j], split point or last action, fill by length.' },
          { id: 'P', q: 'Cut one sequence into consecutive pieces?', words: ['split', 'segment', 'partition', 'break', 'cut', 'pieces', 'dictionary'], ans: 'Partition DP: dp[i] over prefixes, try every last piece.' },
          { id: 'L', q: 'Pick a subsequence where each pick must fit the previous?', words: ['increasing', 'subsequence', 'divisible', 'chain', 'envelope', 'nest'], ans: 'LIS-style DP: dp[i] = best ending at i (or tails + binary search).' }
        ];
        var nodes = Q.map(function (q, i) { return { id: q.id, label: q.q.split(' ').slice(0, 3).join(' ') + '…', x: 8 + i * 16.8, y: 14, shape: 'box', w: 15 }; });
        nodes.push({ id: 'X', label: 'none: rethink / DP I', x: 50, y: 48, shape: 'box', w: 30 });
        var edges = [];
        for (var e = 0; e + 1 < Q.length; e++) edges.push([Q[e].id, Q[e + 1].id, 'no']);
        edges.push([Q[Q.length - 1].id, 'X', 'no']);
        var frames = [], tags = {};
        frames.push({ narr: 'Statement: “' + esc(txt) + '”. We ask the quick questions in a fixed order; the first YES decides the shape (earlier questions are more specific).', parts: [
          { type: 'graph', label: 'decision chain', directed: true, height: 60, nodes: nodes, edges: edges },
          { type: 'text', label: 'tip', html: 'Keywords are only a first guess — always confirm by writing the state sentence.' }
        ] });
        var found = null;
        for (var i = 0; i < Q.length; i++) {
          var yes = has(Q[i].words), hl = {}, ehl = {};
          for (var k = 0; k < i; k++) { hl[Q[k].id] = 'done'; ehl[Q[k].id + '-' + Q[k + 1].id] = 'done'; }
          hl[Q[i].id] = yes ? 'ok' : 'bad';
          tags[Q[i].id] = yes ? 'YES' : 'no';
          var hits = Q[i].words.filter(function (w) { return txt.indexOf(w) >= 0; });
          frames.push({ narr: 'Q' + (i + 1) + ': <b>' + Q[i].q + '</b> ' + (yes ? '<span class="c-g">YES</span> — clue words found: ' + esc(hits.join(', ')) + '. → ' + Q[i].ans : '<span class="c-r">no</span> clue words, move on.'), parts: [
            { type: 'graph', label: 'decision chain', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: JSON.parse(JSON.stringify(tags)) }
          ] });
          if (yes) { found = Q[i]; break; }
        }
        if (!found) {
          frames.push({ narr: 'No shape matched. Go back to DP I shapes (knapsack, grid paths, coin change) or consider other techniques (greedy, binary search on answer, bitmask DP when N ≤ 20).', parts: [
            { type: 'graph', label: 'decision chain', directed: true, height: 60, nodes: nodes, edges: edges, hl: { X: 'sel' }, tags: tags }
          ] });
        }
        var TPL = { T: 'f(node) = [best if node is taken, best if skipped] (or: best downward gain from node)', S: 'dp[day][mode] = best money after this day when we end in this mode', G: 'dp[i][j] = answer for the first i letters of a and the first j letters of b', I: 'dp[i][j] = best answer using only the elements i..j', P: 'dp[i] = best answer for the first i characters (last piece is s[j..i))', L: 'dp[i] = best chain that ENDS exactly at index i' };
        frames.push({ narr: found ? 'Now write the state sentence before any code. For this shape a good template is: <b>' + TPL[found.id] + '</b>.' : 'Without a matching shape, start from the brute force recursion and ask which arguments repeat — those arguments become your state.', parts: [
          { type: 'text', label: 'state sentence', html: found ? TPL[found.id] : 'recursion arguments that repeat = DP state' },
          { type: 'vars', label: 'questions asked', vals: { asked: Object.keys(tags).length, matched: found ? found.id : '—' } }
        ] });
        frames.push({ narr: found ? 'Verdict: <b>' + found.ans + '</b> Next step: write the one-sentence state definition, the base case, and check states × transitions against the constraints.' : 'Verdict: none of the DP II shapes — try the DP I checklist.', parts: [
          { type: 'vars', label: 'verdict', vals: { shape: found ? found.ans.split(':')[0] : 'none of DP II' }, hl: { shape: 'sel' } },
          { type: 'text', label: 'checklist', html: '1) state sentence 2) transition 3) base case 4) fill order 5) answer cell 6) complexity vs constraints' }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: '“Largest Divisible Subset” → LIS shape',
        html: `<p>“Return the largest subset where every pair (a, b) satisfies a % b == 0 or b % a == 0.” A <b>subset</b> (order free) — so sort first; then divisibility is transitive along a sorted chain, and it becomes “longest chain where each element is divisible by the previous” = LIS with the test <code>nums[i] % nums[j] == 0</code>. [1, 2, 4, 8, 3] → sorted [1, 2, 3, 4, 8] → chain ${H.c('g', '1, 2, 4, 8')}.</p>`
      },
      {
        title: '“Minimum cost to merge stones” → interval shape',
        html: `<p>“Merge k consecutive piles into one, cost = their total.” Both ends of a range matter and merging changes neighbours → interval dp over [i..j] plus prefix sums for the range total. The extra twist (k-way merge feasibility (len − 1) % (k − 1) == 0) is typical of hard interval problems.</p>`
      },
      {
        title: '“Count binary strings of length n without consecutive 1s” → state machine',
        html: `<p>Modes: last char 0, last char 1. <code>end0' = end0 + end1</code>, <code>end1' = end0</code>. n = 3 → (1,1) → (2,1) → (3,2) → ${H.c('g', '5')} strings (000, 001, 010, 100, 101). The Fibonacci numbers appear again — the state machine is climbing stairs in disguise.</p>`
      },
      {
        title: '“Longest common substring” is NOT the LCS grid',
        html: `<p>Contiguous match → <code>dp[i][j] = a[i−1] == b[j−1] ? dp[i−1][j−1] + 1 : 0</code> (reset to 0 on mismatch, answer = max cell). Subsequence (LCS) instead takes max(up, left) on mismatch. One word in the statement — “substring” vs “subsequence” — changes the transition.</p>`
      }
    ],
    deepDive: `<p><b>State design rules of thumb.</b> (1) Include exactly what the future needs to know and nothing else (“Markov property”). (2) If two different histories lead to the same future options, they should share a state — that sharing is where DP saves time. (3) If the transition needs the previous chosen element, put it in the state (“ending at i”). (4) If removing something changes neighbours, look for a “last action” formulation.</p>
      <p><b>Top-down vs bottom-up.</b> Memoised recursion is easier to derive and only visits reachable states (great for sparse problems like Word Break II); bottom-up avoids recursion limits and enables row compression. Prefer bottom-up when the depth can pass the language’s recursion limit: 1000 frames in Python by default, roughly 10<sup>4</sup> in Java and JavaScript.</p>
      <p><b>Counting vs optimising vs deciding.</b> The same state graph supports OR (feasibility), MIN/MAX (optimisation) and SUM (counting). For counting, make sure each object is generated by exactly one path (unique “last piece”, unique “last balloon”), otherwise you over-count.</p>
      <p><b>When it is not DP.</b> If a greedy exchange argument works (single-transaction stocks, unlimited transactions), it beats DP. If the answer is monotone in a parameter, binary search on the answer may be simpler (Split Array Largest Sum). If states blow up exponentially, look for bitmasks (N ≤ 20) or meet-in-the-middle.</p>`,
    aiEra: `<p><b>What AI changes:</b> classification used to be a memory game (“have I seen this problem?”). With AI, anyone can retrieve a known solution; interviewers therefore choose <b>unseen variants</b> and watch how you derive the state. This checklist is your process when there is nothing to retrieve.</p>
      <p><b>Use AI as a partner:</b> paste a problem and ask <code>Which DP shape is this and what is the state sentence? Do not give code.</code> Then argue with it — if its state misses information the future needs, you will find a counterexample. Ask it to generate three disguised problems for each shape to drill recognition.</p>
      <p><b>Where AI goes wrong:</b> confidently matching a surface keyword (“subsequence”) to the wrong family; proposing O(N³) for N = 10<sup>5</sup>; missing a state component such as “cooldown” or “transactions left”.</p>
      <p><b>What you must still own:</b> the state sentence, the complexity check against constraints, and the correctness argument (each solution corresponds to exactly one path through the states).</p>`
  });

  // ================= PRACTICE: Easy =================
  practice.push({
    title: 'Longest Continuous Increasing Subsequence', level: 'Easy', tags: ['array', 'dp', 'LIS warm-up'], companies: ['Meta', 'Amazon'],
    statement: `<p>Given an unsorted integer array, return the length of the longest <b>continuous</b> (contiguous) strictly increasing subarray. This is the “no skipping allowed” cousin of LIS.</p>`,
    constraints: `1 ≤ nums.length ≤ 10<sup>4</sup>, −10<sup>9</sup> ≤ nums[i] ≤ 10<sup>9</sup>.`,
    example: `${H.arr([1, 3, 5, 4, 7], { label: 'nums', hl: { 0: 'g', 1: 'g', 2: 'g' } })}<p>Output <b>3</b> (${H.c('g', '1, 3, 5')}). 1, 3, 5, 7 is longer but 4 sits between 5 and 7, so it is not contiguous. [2, 2, 2] → 1.</p>`,
    brute: {
      why: `<p>Check every start index and walk right while the values increase: O(N²) in the worst case (a sorted array re-walks the same run from every start). The run ending at i only depends on whether nums[i−1] &lt; nums[i] — no need to restart.</p>`,
      code: { lang: 'java', code: `class Brute {
    public int findLengthOfLCIS(int[] nums) {
        int best = 0;
        for (int i = 0; i < nums.length; i++) {
            int j = i;
            while (j + 1 < nums.length && nums[j] < nums[j + 1]) j++;   // extend from i
            best = Math.max(best, j - i + 1);
        }
        return best;
    }
}`, alt: [
          { lang: 'python', code: `def find_length_of_lcis(nums):
    best = 0
    for i in range(len(nums)):
        j = i
        while j + 1 < len(nums) and nums[j] < nums[j + 1]:
            j += 1                              # extend from i
        best = max(best, j - i + 1)
    return best` },
          { lang: 'js', code: `function findLengthOfLCIS(nums) {
  let best = 0;
  for (let i = 0; i < nums.length; i++) {
    let j = i;
    while (j + 1 < nums.length && nums[j] < nums[j + 1]) j++;   // extend from i
    best = Math.max(best, j - i + 1);
  }
  return best;
}` },
          { lang: 'cpp', code: `int findLengthOfLCIS(vector<int>& nums) {
    int best = 0;
    for (int i = 0; i < (int)nums.size(); i++) {
        int j = i;
        while (j + 1 < (int)nums.size() && nums[j] < nums[j + 1]) j++;   // extend from i
        best = max(best, j - i + 1);
    }
    return best;
}` }
        ] }
    },
    mcq: { q: 'dp[i] = length of the increasing run ENDING at i. If nums[i−1] ≥ nums[i], dp[i] is…', options: ['1', 'dp[i−1]', 'dp[i−1] + 1', '0'], answer: 0, explain: 'The run is broken, so a new run starts with nums[i] alone.' },
    hints: [
      `<p>Hint 1: unlike LIS you cannot skip elements, so the run ending at i can only extend the run ending at i−1.</p>`,
      `<p>Hint 2: keep one counter <code>cur</code>: if nums[i] &gt; nums[i−1] then cur++ else cur = 1.</p>`,
      `<p>Hint 3: track the maximum of cur over the whole array; an array of length 1 gives 1. Equal neighbours break the run (strictly increasing).</p>`
    ],
    solution: {
      approach: `<p>One pass with a running length — the O(1)-memory version of <code>dp[i] = nums[i] &gt; nums[i−1] ? dp[i−1] + 1 : 1</code>. Compare with LIS where dp[i] looks at <b>every</b> earlier j because skipping is allowed.</p>`,
      code: `class Solution {
    public int findLengthOfLCIS(int[] nums) {
        int best = 1, cur = 1;
        for (int i = 1; i < nums.length; i++) {
            cur = nums[i] > nums[i - 1] ? cur + 1 : 1;   // extend or restart
            best = Math.max(best, cur);
        }
        return best;
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def find_length_of_lcis(self, nums):
        best = cur = 1
        for a, b in zip(nums, nums[1:]):
            cur = cur + 1 if b > a else 1
            best = max(best, cur)
        return best` }, { lang: 'js', code: `function findLengthOfLCIS(nums) {
  let best = 1, cur = 1;
  for (let i = 1; i < nums.length; i++) {
    cur = nums[i] > nums[i - 1] ? cur + 1 : 1;    // extend or restart
    best = Math.max(best, cur);
  }
  return best;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int findLengthOfLCIS(vector<int>& nums) {
        int best = 1, cur = 1;
        for (size_t i = 1; i < nums.size(); i++) {
            cur = nums[i] > nums[i - 1] ? cur + 1 : 1;   // extend or restart
            best = max(best, cur);
        }
        return best;
    }
};` }],
      dry: { head: ['i', 'nums[i]', 'cur', 'best'], rows: [['0', '1', '1', '1'], ['1', '3', '2', '2'], ['2', '5', '3', '3'], ['3', '4', '1 (5 ≥ 4)', '3'], ['4', '7', '2', '<span class="c-g">3</span>']] },
      complexity: `<p>Time O(N), space O(1).</p>`,
      followUps: ['Return the subarray itself.', 'Longest increasing subarray if you may delete at most one element.']
    },
    tests: { sig: 'int[] -> int', fn: 'findLengthOfLCIS', cases: [
      [[[1, 3, 5, 4, 7]], 3],
      [[[2, 2, 2, 2, 2]], 1],
      [[[5]], 1],
      [[[1, 2, 3, 4]], 4],
      [[[4, 3, 2, 1]], 1],
      [[[-1000000000, 0, 1000000000]], 3],
      [[[1, 3, 5, 7, 2, 4, 6, 8, 10]], 5],
      [[{ $range: [0, 10000] }], 10000],
      [[{ $concat: [{ $range: [5000, 0, -1] }, { $range: [2, 5002] }] }], 5001],
      [[{ $concat: [{ $range: [5000, 0, -1] }, { $range: [-5000, 0] }] }], 5000]
    ] }
  });

  practice.push({
    title: 'Best Time to Buy and Sell Stock (one transaction)', level: 'Easy', tags: ['state machine dp', 'array', 'greedy'], companies: ['Amazon', 'Meta', 'Microsoft', 'Goldman Sachs'],
    statement: `<p>Given daily prices, choose one day to buy and a <b>later</b> day to sell to maximise profit. Return the maximum profit, or 0 if no profit is possible.</p>`,
    constraints: `1 ≤ prices.length ≤ 10<sup>5</sup>, 0 ≤ prices[i] ≤ 10<sup>4</sup>.`,
    example: `${H.arr([7, 1, 5, 3, 6, 4], { label: 'prices', hl: { 1: 'g', 4: 'g' } })}<p>Output <b>5</b>: buy at ${H.c('g', '1')} (day 1), sell at ${H.c('g', '6')} (day 4). Selling at 7 is impossible because day 0 comes before the buy.</p>`,
    brute: {
      why: `<p>Try every (buy, sell) pair with buy &lt; sell: N²/2 pairs = 5·10<sup>9</sup> for N = 10<sup>5</sup>. Wasted work: for each sell day, only the <b>cheapest earlier</b> price matters, and that can be carried forward.</p>`,
      code: { lang: 'java', code: `class Brute {
    public int maxProfit(int[] prices) {
        int best = 0;
        for (int i = 0; i < prices.length; i++)
            for (int j = i + 1; j < prices.length; j++)
                best = Math.max(best, prices[j] - prices[i]);
        return best;
    }
}`, alt: [
          { lang: 'python', code: `def max_profit(prices):
    best = 0
    for i in range(len(prices)):
        for j in range(i + 1, len(prices)):
            best = max(best, prices[j] - prices[i])
    return best` },
          { lang: 'js', code: `function maxProfit(prices) {
  let best = 0;
  for (let i = 0; i < prices.length; i++)
    for (let j = i + 1; j < prices.length; j++)
      best = Math.max(best, prices[j] - prices[i]);
  return best;
}` },
          { lang: 'cpp', code: `int maxProfit(vector<int>& prices) {
    int best = 0;
    for (int i = 0; i < (int)prices.size(); i++)
        for (int j = i + 1; j < (int)prices.size(); j++)
            best = max(best, prices[j] - prices[i]);
    return best;
}` }
        ] }
    },
    mcq: { q: 'In the two-mode state machine (hold, cash) for ONE transaction, the buy arrow is…', options: ['hold = max(hold, −p)', 'hold = max(hold, cash − p)', 'cash = max(cash, hold − p)', 'hold = hold + p'], answer: 0, explain: 'With only one transaction allowed, a buy always starts from zero profit, so hold = max(hold, 0 − p). Using cash − p would allow repeated trades (that is Stock II).' },
    hints: [
      `<p>Hint 1: if you sell today, the best buy was the minimum price seen <b>before</b> today.</p>`,
      `<p>Hint 2: carry <code>minSoFar</code> and <code>best</code> in one left-to-right pass.</p>`,
      `<p>Hint 3: update best with price − minSoFar, then update minSoFar (order does not matter here because selling on the same day gives 0). Answer is never negative.</p>`
    ],
    solution: {
      approach: `<p>Carry-forward minimum — equivalently the 2-mode state machine with <code>hold = max(hold, −p)</code>, <code>cash = max(cash, hold + p)</code>. Show both: the state-machine view is what generalises to cooldown, fee and k transactions.</p>`,
      code: `class Solution {
    public int maxProfit(int[] prices) {
        int hold = Integer.MIN_VALUE, cash = 0;
        for (int p : prices) {
            hold = Math.max(hold, -p);         // best "bought once" state: cheapest buy so far
            cash = Math.max(cash, hold + p);   // sell today
        }
        return cash;
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def max_profit(self, prices):
        low, best = float('inf'), 0
        for p in prices:
            low = min(low, p)
            best = max(best, p - low)
        return best` }, { lang: 'js', code: `function maxProfit(prices) {
  let hold = -Infinity, cash = 0;
  for (const p of prices) {
    hold = Math.max(hold, -p);          // best "bought once" state: cheapest buy so far
    cash = Math.max(cash, hold + p);    // sell today
  }
  return cash;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int hold = INT_MIN, cash = 0;
        for (int p : prices) {
            hold = max(hold, -p);           // best "bought once" state: cheapest buy so far
            cash = max(cash, hold + p);     // sell today
        }
        return cash;
    }
};` }],
      dry: { head: ['day', 'price', 'hold (= −min)', 'cash'], rows: [['0', '7', '−7', '0'], ['1', '1', '−1', '0'], ['2', '5', '−1', '4'], ['3', '3', '−1', '4'], ['4', '6', '−1', '<span class="c-g">5</span>'], ['5', '4', '−1', '5']] },
      complexity: `<p>Time O(N), space O(1).</p>`,
      followUps: ['Unlimited transactions (Stock II).', 'Also return the buy and sell days.']
    },
    tests: { sig: 'int[] -> int', fn: 'maxProfit', cases: [
      [[[7, 1, 5, 3, 6, 4]], 5],
      [[[7, 6, 4, 3, 1]], 0],
      [[[5]], 0],
      [[[1, 2]], 1],
      [[[2, 4, 1]], 2],
      [[[3, 2, 6, 5, 0, 3]], 4],
      [[[0, 10000]], 10000],
      [[{ $concat: [{ $range: [10000, 0, -1] }, { $rep: 5000, n: 79999 }, { $range: [0, 10001] }] }], 10000],
      [[{ $range: [10000, 0, -1] }], 0]
    ] }
  });

  practice.push({
    title: 'Is Subsequence', level: 'Easy', tags: ['two pointers', 'string dp', 'binary search'], companies: ['Google', 'Pinterest'],
    statement: `<p>Given strings <code>s</code> and <code>t</code>, return true if <code>s</code> is a <b>subsequence</b> of <code>t</code> (delete some characters of t without reordering to get s). Follow-up: what if there are 10<sup>9</sup> incoming s strings to test against the same t?</p>`,
    constraints: `0 ≤ s.length ≤ 100, 0 ≤ t.length ≤ 10<sup>4</sup>, lowercase letters.`,
    example: `<p>s = ${H.c('g', '"abc"')}, t = "a<b>h</b>b<b>gd</b>c" → <b>true</b> (a, b, c appear in order). s = "axc" → <b>false</b> (no x in t).</p>`,
    brute: {
      why: `<p>The LCS grid answers it (s is a subsequence iff LCS(s, t) == |s|) but costs O(|s|·|t|) time and memory — overkill. A greedy match is enough: matching each letter of s as early as possible never hurts.</p>`,
      code: { lang: 'java', code: `class Brute {
    public boolean isSubsequence(String s, String t) {
        int m = s.length(), n = t.length();
        int[][] dp = new int[m + 1][n + 1];          // LCS grid
        for (int i = 1; i <= m; i++)
            for (int j = 1; j <= n; j++)
                dp[i][j] = s.charAt(i - 1) == t.charAt(j - 1) ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
        return dp[m][n] == m;
    }
}`, alt: [
          { lang: 'python', code: `def is_subsequence(s, t):
    m, n = len(s), len(t)
    dp = [[0] * (n + 1) for _ in range(m + 1)]        # LCS grid
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s[i - 1] == t[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n] == m` },
          { lang: 'js', code: `function isSubsequence(s, t) {
  const m = s.length, n = t.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));   // LCS grid
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = s[i - 1] === t[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[m][n] === m;
}` },
          { lang: 'cpp', code: `bool isSubsequence(string s, string t) {
    int m = s.size(), n = t.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));   // LCS grid
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            dp[i][j] = s[i - 1] == t[j - 1] ? dp[i - 1][j - 1] + 1 : max(dp[i - 1][j], dp[i][j - 1]);
    return dp[m][n] == m;
}` }
        ] }
    },
    mcq: { q: 'For 10<sup>9</sup> queries against one long t, the best preprocessing is…', options: ['For each letter, the sorted list of its positions in t; binary search the next position per query letter', 'Build the LCS grid once', 'Sort t', 'Hash every substring of t'], answer: 0, explain: 'Each query letter jumps to the next occurrence after the current position in O(log |t|), so a query costs O(|s| log |t|) with no rescanning of t.' },
    hints: [
      `<p>Hint 1: greedily match s[0] with its first occurrence in t, then s[1] after that, and so on — taking the earliest match leaves the most room.</p>`,
      `<p>Hint 2: two pointers i (in s) and j (in t); advance i only on a match, always advance j.</p>`,
      `<p>Hint 3: answer i == s.length(). Empty s → true. For many queries: positions-per-letter lists + binary search (or a next[j][c] table).</p>`
    ],
    solution: {
      approach: `<p>Two-pointer greedy, O(|t|). It is the degenerate case of the subsequence grid where only the diagonal (“match”) and left (“skip a t letter”) moves exist and the greedy choice is provably optimal (exchange argument: an earlier match can replace any later one).</p>`,
      code: `class Solution {
    public boolean isSubsequence(String s, String t) {
        int i = 0;
        for (int j = 0; j < t.length() && i < s.length(); j++) {
            if (s.charAt(i) == t.charAt(j)) i++;   // match s[i] as early as possible
        }
        return i == s.length();
    }
}`,
      alt: [{ lang: 'python', code: `from bisect import bisect_right
from collections import defaultdict

class Solution:
    def is_subsequence(self, s, t):
        pos = defaultdict(list)              # follow-up version: preprocess t once
        for j, c in enumerate(t):
            pos[c].append(j)
        cur = -1
        for c in s:
            lst = pos.get(c, [])
            k = bisect_right(lst, cur)       # next occurrence after cur
            if k == len(lst):
                return False
            cur = lst[k]
        return True` }, { lang: 'js', code: `function isSubsequence(s, t) {
  let i = 0;
  for (let j = 0; j < t.length && i < s.length; j++) {
    if (s[i] === t[j]) i++;                 // match s[i] as early as possible
  }
  return i === s.length;
}` }, { lang: 'cpp', code: `class Solution {
public:
    bool isSubsequence(string s, string t) {
        size_t i = 0;
        for (size_t j = 0; j < t.size() && i < s.size(); j++)
            if (s[i] == t[j]) i++;              // match s[i] as early as possible
        return i == s.size();
    }
};` }],
      dry: { head: ['j', 't[j]', 's[i] wanted', 'match?', 'i after'], rows: [['0', 'a', 'a', 'yes', '1'], ['1', 'h', 'b', 'no', '1'], ['2', 'b', 'b', 'yes', '2'], ['3', 'g', 'c', 'no', '2'], ['4', 'd', 'c', 'no', '2'], ['5', 'c', 'c', 'yes', '<span class="c-g">3 = |s| → true</span>']] },
      complexity: `<p>Time O(|t|), space O(1). Follow-up: O(|t|) preprocessing, O(|s| log |t|) per query.</p>`,
      followUps: ['Count how many words in a list are subsequences of t (LC 792).', 'Number of distinct ways s appears in t (Distinct Subsequences).']
    },
    tests: { sig: 'string string -> bool', fn: 'isSubsequence', cases: [
      [['abc', 'ahbgdc'], true],
      [['axc', 'ahbgdc'], false],
      [['', 'ahbgdc'], true],
      [['', ''], true],
      [['a', ''], false],
      [['aaa', 'aa'], false],
      [['acb', 'abc'], false],
      [['b', 'abc'], true],
      [[{ $rep: 'a', n: 100 }, { $concat: [{ $rep: 'b', n: 9900 }, { $rep: 'a', n: 100 }] }], true],
      [[{ $rep: 'a', n: 100 }, { $concat: [{ $rep: 'a', n: 99 }, { $rep: 'b', n: 9901 }] }], false]
    ] }
  });

  // ================= PRACTICE: Medium =================
  practice.push({
    title: 'Number of Longest Increasing Subsequence', level: 'Medium', tags: ['LIS', 'dp', 'counting'], companies: ['Google', 'Meta', 'Amazon'],
    statement: `<p>Given an integer array, return the <b>number</b> of longest strictly increasing subsequences (different index sets count separately).</p>`,
    constraints: `1 ≤ nums.length ≤ 2000, −10<sup>6</sup> ≤ nums[i] ≤ 10<sup>6</sup>. The answer fits in a 32-bit int.`,
    example: `<p>nums = [1, 3, 5, 4, 7] → <b>2</b>: ${H.c('g', '1, 3, 4, 7')} and ${H.c('g', '1, 3, 5, 7')}. nums = [2, 2, 2, 2, 2] → 5 (each single element is a longest subsequence of length 1).</p>`,
    brute: {
      why: `<p>DFS every increasing subsequence and tally lengths: the number of increasing subsequences can be 2<sup>N</sup> (sorted input). The same “runs ending at j” are rebuilt for every prefix that reaches j.</p>`,
      code: { lang: 'java', code: `class Brute {
    int bestLen = 0, count = 0;
    void dfs(int[] a, int last, int len) {               // last = index of last picked element
        if (len > bestLen) { bestLen = len; count = 1; }
        else if (len == bestLen) count++;
        for (int j = last + 1; j < a.length; j++)
            if (a[j] > a[last]) dfs(a, j, len + 1);
    }
    public int findNumberOfLIS(int[] nums) {
        for (int i = 0; i < nums.length; i++) dfs(nums, i, 1);
        return count;
    }
}`, alt: [
          { lang: 'python', code: `def find_number_of_lis(nums):
    best_len = count = 0

    def dfs(last, length):                  # last = index of last picked element
        nonlocal best_len, count
        if length > best_len:
            best_len = length
            count = 1
        elif length == best_len:
            count += 1
        for j in range(last + 1, len(nums)):
            if nums[j] > nums[last]:
                dfs(j, length + 1)

    for i in range(len(nums)):
        dfs(i, 1)
    return count` },
          { lang: 'js', code: `function findNumberOfLIS(nums) {
  let bestLen = 0, count = 0;
  function dfs(last, len) {                 // last = index of last picked element
    if (len > bestLen) { bestLen = len; count = 1; }
    else if (len === bestLen) count++;
    for (let j = last + 1; j < nums.length; j++)
      if (nums[j] > nums[last]) dfs(j, len + 1);
  }
  for (let i = 0; i < nums.length; i++) dfs(i, 1);
  return count;
}` },
          { lang: 'cpp', code: `class Brute {
    int bestLen = 0, count = 0;
    void dfs(vector<int>& a, int last, int len) {        // last = index of last picked element
        if (len > bestLen) { bestLen = len; count = 1; }
        else if (len == bestLen) count++;
        for (int j = last + 1; j < (int)a.size(); j++)
            if (a[j] > a[last]) dfs(a, j, len + 1);
    }
public:
    int findNumberOfLIS(vector<int>& nums) {
        for (int i = 0; i < (int)nums.size(); i++) dfs(nums, i, 1);
        return count;
    }
};` }
        ] }
    },
    mcq: { q: 'While computing index i, you find j with a[j] &lt; a[i] and len[j] + 1 == len[i]. What do you do with cnt[i]?', options: ['cnt[i] += cnt[j]', 'cnt[i] = cnt[j]', 'cnt[i]++', 'nothing'], answer: 0, explain: 'Another group of runs reaches the same best length at i, so their counts add. When len[j] + 1 is strictly larger, you reset: cnt[i] = cnt[j].' },
    hints: [
      `<p>Hint 1: alongside len[i] (LIS ending at i) keep cnt[i] = how many runs of that best length end at i.</p>`,
      `<p>Hint 2: for each j &lt; i with a[j] &lt; a[i]: if len[j]+1 &gt; len[i] → len[i] = len[j]+1, cnt[i] = cnt[j]; if equal → cnt[i] += cnt[j].</p>`,
      `<p>Hint 3: the answer sums cnt[i] over all i whose len[i] equals the global maximum. Initialise len[i] = cnt[i] = 1. For N = 10<sup>5</sup> use a Fenwick tree storing (bestLen, count) per compressed value.</p>`
    ],
    solution: {
      approach: `<p>O(N²) LIS dp extended with counts. Every longest run has a unique last index, so summing counts at the indices with maximal length counts each run exactly once.</p>`,
      code: `class Solution {
    public int findNumberOfLIS(int[] nums) {
        int n = nums.length, maxLen = 0, total = 0;
        int[] len = new int[n], cnt = new int[n];
        for (int i = 0; i < n; i++) {
            len[i] = 1; cnt[i] = 1;
            for (int j = 0; j < i; j++) {
                if (nums[j] < nums[i]) {
                    if (len[j] + 1 > len[i]) { len[i] = len[j] + 1; cnt[i] = cnt[j]; }   // better length
                    else if (len[j] + 1 == len[i]) cnt[i] += cnt[j];                    // same length, more ways
                }
            }
            if (len[i] > maxLen) { maxLen = len[i]; total = cnt[i]; }
            else if (len[i] == maxLen) total += cnt[i];
        }
        return total;
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def find_number_of_lis(self, nums):
        n = len(nums)
        ln, cnt = [1] * n, [1] * n
        for i in range(n):
            for j in range(i):
                if nums[j] < nums[i]:
                    if ln[j] + 1 > ln[i]:
                        ln[i], cnt[i] = ln[j] + 1, cnt[j]
                    elif ln[j] + 1 == ln[i]:
                        cnt[i] += cnt[j]
        m = max(ln)
        return sum(c for l, c in zip(ln, cnt) if l == m)` }, { lang: 'js', code: `function findNumberOfLIS(nums) {
  const n = nums.length;
  const len = new Array(n).fill(1), cnt = new Array(n).fill(1);
  let maxLen = 0, total = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] >= nums[i]) continue;
      if (len[j] + 1 > len[i]) { len[i] = len[j] + 1; cnt[i] = cnt[j]; }   // better length
      else if (len[j] + 1 === len[i]) cnt[i] += cnt[j];                    // same length, more ways
    }
    if (len[i] > maxLen) { maxLen = len[i]; total = cnt[i]; }
    else if (len[i] === maxLen) total += cnt[i];
  }
  return total;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int findNumberOfLIS(vector<int>& nums) {
        int n = nums.size(), maxLen = 0, total = 0;
        vector<int> len(n, 1), cnt(n, 1);
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < i; j++) {
                if (nums[j] >= nums[i]) continue;
                if (len[j] + 1 > len[i]) { len[i] = len[j] + 1; cnt[i] = cnt[j]; }   // better length
                else if (len[j] + 1 == len[i]) cnt[i] += cnt[j];                    // same length, more ways
            }
            if (len[i] > maxLen) { maxLen = len[i]; total = cnt[i]; }
            else if (len[i] == maxLen) total += cnt[i];
        }
        return total;
    }
};` }],
      dry: { head: ['i', 'val', 'len', 'cnt'], rows: [['0', '1', '1', '1'], ['1', '3', '2', '1'], ['2', '5', '3', '1'], ['3', '4', '3', '1'], ['4', '7', '4', '1 (via 5) + 1 (via 4) = <span class="c-g">2</span>']] },
      complexity: `<p>Time O(N²), space O(N). O(N log N) with a Fenwick/segment tree over compressed values.</p>`,
      followUps: ['Solve in O(N log N).', 'Count longest non-decreasing subsequences instead.']
    },
    tests: { sig: 'int[] -> int', fn: 'findNumberOfLIS', cases: [
      [[[1, 3, 5, 4, 7]], 2],
      [[[2, 2, 2, 2, 2]], 5],
      [[[1]], 1],
      [[[1, 2, 4, 3, 5, 4, 7, 2]], 3],
      [[[3, 2, 1]], 3],
      [[[-1, 0, -1, 0]], 3],
      [[[1, 0, 3, 2, 5, 4, 7, 6]], 16],
      // 30 pairs (2i+1, 2i): every LIS picks one value from each pair -> 2^30 ways, still a 32-bit int
      [[[1, 0, 3, 2, 5, 4, 7, 6, 9, 8, 11, 10, 13, 12, 15, 14, 17, 16, 19, 18, 21, 20, 23, 22, 25, 24, 27, 26, 29, 28, 31, 30, 33, 32, 35, 34, 37, 36, 39, 38, 41, 40, 43, 42, 45, 44, 47, 46, 49, 48, 51, 50, 53, 52, 55, 54, 57, 56, 59, 58]], 1073741824],
      [[{ $rep: 2, n: 2000 }], 2000],
      [[{ $range: [-1000000, -998000] }], 1]
    ] }
  });

  practice.push({
    title: 'Largest Divisible Subset', level: 'Medium', tags: ['LIS', 'dp', 'sorting', 'math'], companies: ['Google', 'Amazon'],
    statement: `<p>Given a set of distinct positive integers, return the largest subset such that for every pair (a, b) in it, <code>a % b == 0</code> or <code>b % a == 0</code>. Any valid largest subset may be returned.</p>`,
    constraints: `1 ≤ nums.length ≤ 1000, 1 ≤ nums[i] ≤ 2·10<sup>9</sup>, all distinct.`,
    example: `<p>nums = [1, 2, 4, 8, 3] → ${H.c('g', '[1, 2, 4, 8]')} (each divides the next). nums = [1, 2, 3] → [1, 2] or [1, 3].</p>`,
    brute: {
      why: `<p>Check all 2<sup>N</sup> subsets and verify every pair: hopeless beyond N ≈ 20. The key waste: once sorted, a valid subset is a <b>chain</b>, and the best chain ending at a given number is reused by many larger numbers.</p>`,
      code: { lang: 'java', code: `class Brute {
    public List<Integer> largestDivisibleSubset(int[] nums) {
        int n = nums.length;
        List<Integer> best = new ArrayList<>();
        for (int mask = 1; mask < (1 << Math.min(n, 20)); mask++) {
            List<Integer> pick = new ArrayList<>();
            for (int i = 0; i < n && i < 20; i++) if ((mask >> i & 1) == 1) pick.add(nums[i]);
            boolean ok = true;
            for (int a = 0; a < pick.size() && ok; a++)
                for (int b = a + 1; b < pick.size() && ok; b++)
                    if (pick.get(a) % pick.get(b) != 0 && pick.get(b) % pick.get(a) != 0) ok = false;
            if (ok && pick.size() > best.size()) best = pick;
        }
        return best;
    }
}`, alt: [
          { lang: 'python', code: `def largest_divisible_subset(nums):
    n = len(nums)
    k = min(n, 20)
    best = []
    for mask in range(1, 1 << k):
        pick = [nums[i] for i in range(k) if mask >> i & 1]
        ok = True
        for a in range(len(pick)):
            for b in range(a + 1, len(pick)):
                if pick[a] % pick[b] != 0 and pick[b] % pick[a] != 0:
                    ok = False
        if ok and len(pick) > len(best):
            best = pick
    return best` },
          { lang: 'js', code: `function largestDivisibleSubset(nums) {
  const n = nums.length;
  let best = [];
  for (let mask = 1; mask < (1 << Math.min(n, 20)); mask++) {
    const pick = [];
    for (let i = 0; i < n && i < 20; i++) if ((mask >> i & 1) === 1) pick.push(nums[i]);
    let ok = true;
    for (let a = 0; a < pick.length && ok; a++)
      for (let b = a + 1; b < pick.length && ok; b++)
        if (pick[a] % pick[b] !== 0 && pick[b] % pick[a] !== 0) ok = false;
    if (ok && pick.length > best.length) best = pick;
  }
  return best;
}` },
          { lang: 'cpp', code: `vector<int> largestDivisibleSubset(vector<int>& nums) {
    int n = nums.size();
    vector<int> best;
    for (int mask = 1; mask < (1 << min(n, 20)); mask++) {
        vector<int> pick;
        for (int i = 0; i < n && i < 20; i++) if ((mask >> i & 1) == 1) pick.push_back(nums[i]);
        bool ok = true;
        for (int a = 0; a < (int)pick.size() && ok; a++)
            for (int b = a + 1; b < (int)pick.size() && ok; b++)
                if (pick[a] % pick[b] != 0 && pick[b] % pick[a] != 0) ok = false;
        if (ok && pick.size() > best.size()) best = pick;
    }
    return best;
}` }
        ] }
    },
    mcq: { q: 'Why is it enough (after sorting) to check only that nums[i] % nums[j] == 0 for the PREVIOUS chain element j?', options: ['Divisibility is transitive: if c | b and b | a then c | a', 'Because all numbers are prime', 'Because the array is distinct', 'It is not enough; all pairs must be checked'], answer: 0, explain: 'In a sorted chain where each element divides the next, every earlier element divides every later one by transitivity — so the whole subset is pairwise divisible.' },
    hints: [
      `<p>Hint 1: sort ascending. Then a divisible subset is a chain where each element divides the next — just like an increasing subsequence.</p>`,
      `<p>Hint 2: dp[i] = size of the largest chain ending at nums[i]; dp[i] = 1 + max dp[j] over j &lt; i with nums[i] % nums[j] == 0. Keep parent[i].</p>`,
      `<p>Hint 3: pick the index with the largest dp and follow parents back to rebuild the list. Single element → that element.</p>`
    ],
    solution: {
      approach: `<p>Sort, then run the O(N²) LIS template with “divides” as the compatibility test, recording parents for reconstruction.</p>`,
      code: `class Solution {
    public List<Integer> largestDivisibleSubset(int[] nums) {
        Arrays.sort(nums);
        int n = nums.length, best = 0;
        int[] dp = new int[n], parent = new int[n];
        for (int i = 0; i < n; i++) {
            dp[i] = 1; parent[i] = -1;
            for (int j = 0; j < i; j++) {
                if (nums[i] % nums[j] == 0 && dp[j] + 1 > dp[i]) { dp[i] = dp[j] + 1; parent[i] = j; }
            }
            if (dp[i] > dp[best]) best = i;
        }
        LinkedList<Integer> res = new LinkedList<>();
        for (int k = best; k != -1; k = parent[k]) res.addFirst(nums[k]);
        return res;
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def largest_divisible_subset(self, nums):
        nums.sort()
        n = len(nums)
        dp, par = [1] * n, [-1] * n
        for i in range(n):
            for j in range(i):
                if nums[i] % nums[j] == 0 and dp[j] + 1 > dp[i]:
                    dp[i], par[i] = dp[j] + 1, j
        k = max(range(n), key=lambda x: dp[x])
        out = []
        while k != -1:
            out.append(nums[k]); k = par[k]
        return out[::-1]` }, { lang: 'js', code: `function largestDivisibleSubset(nums) {
  const a = [...nums].sort((x, y) => x - y);      // numeric comparator (default sort compares strings)
  const n = a.length, dp = new Array(n).fill(1), parent = new Array(n).fill(-1);
  let best = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (a[i] % a[j] === 0 && dp[j] + 1 > dp[i]) { dp[i] = dp[j] + 1; parent[i] = j; }
    }
    if (dp[i] > dp[best]) best = i;
  }
  const res = [];
  for (let k = best; k !== -1; k = parent[k]) res.push(a[k]);
  return res.reverse();
}` }, { lang: 'cpp', code: `class Solution {
public:
    vector<int> largestDivisibleSubset(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        int n = nums.size(), best = 0;
        vector<int> dp(n, 1), parent(n, -1);
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < i; j++)
                if (nums[i] % nums[j] == 0 && dp[j] + 1 > dp[i]) { dp[i] = dp[j] + 1; parent[i] = j; }
            if (dp[i] > dp[best]) best = i;
        }
        vector<int> res;
        for (int k = best; k != -1; k = parent[k]) res.push_back(nums[k]);
        reverse(res.begin(), res.end());
        return res;
    }
};` }],
      dry: { head: ['sorted value', 'dp', 'parent'], rows: [['1', '1', '—'], ['2', '2', '1'], ['3', '2', '1'], ['4', '3', '2'], ['8', '<span class="c-g">4</span>', '4 → chain 1, 2, 4, 8']] },
      complexity: `<p>Time O(N²) after O(N log N) sorting; space O(N).</p>`,
      followUps: ['Count the number of largest divisible subsets.', 'What if numbers are not distinct?']
    },
    // Any largest valid subset is accepted: same size as the expected one, distinct values from nums, pairwise divisible.
    tests: { sig: 'int[] -> list<int>', fn: 'largestDivisibleSubset',
      check: '(args, out, exp) => { if (!Array.isArray(out) || out.length !== exp.length) return false; const have = new Set(args[0]); if (new Set(out).size !== out.length || !out.every((x) => have.has(x))) return false; for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) if (out[i] % out[j] !== 0 && out[j] % out[i] !== 0) return false; return true; }',
      cases: [
        [[[1, 2, 3]], [1, 2]],
        [[[1, 2, 4, 8]], [1, 2, 4, 8]],
        [[[1, 2, 4, 8, 3]], [1, 2, 4, 8]],
        [[[5]], [5]],
        [[[2, 3, 5, 7]], [2]],
        [[[4, 8, 10, 240]], [4, 8, 240]],
        [[[3, 4, 16, 8]], [4, 8, 16]],
        [[[1, 2, 4, 8, 9, 72]], [1, 2, 4, 8, 72]],
        [[[2000000000, 1073741824, 536870912, 268435456, 134217728, 67108864, 33554432, 16777216, 8388608, 4194304, 2097152, 1048576, 524288, 262144, 131072, 65536, 32768, 16384, 8192, 4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1]],
          [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144, 524288, 1048576, 2097152, 4194304, 8388608, 16777216, 33554432, 67108864, 134217728, 268435456, 536870912, 1073741824]],
        [[{ $range: [1, 1001] }], [1, 2, 4, 8, 16, 32, 64, 128, 256, 512]]
      ] }
  });

  practice.push({
    title: 'Best Time to Buy and Sell Stock with Transaction Fee', level: 'Medium', tags: ['state machine dp', 'greedy'], companies: ['Meta', 'Bloomberg', 'Citadel'],
    statement: `<p>Given prices and a fixed <code>fee</code> charged per completed transaction (buy + sell), return the maximum profit with unlimited transactions, holding at most one share at a time.</p>`,
    constraints: `1 ≤ prices.length ≤ 5·10<sup>4</sup>, 1 ≤ prices[i] &lt; 5·10<sup>4</sup>, 0 ≤ fee &lt; 5·10<sup>4</sup>.`,
    example: `<p>prices = [1, 3, 2, 8, 4, 9], fee = 2 → <b>8</b>: ${H.c('g', 'buy 1 sell 8 (+7−2) and buy 4 sell 9 (+5−2)')}. Trading every rise (1→3, 2→8, 4→9) would pay the fee three times: 2+6+5−6 = 7.</p>`,
    brute: {
      why: `<p>Recursively decide buy / sell / wait each day while tracking whether you hold a share: 2 choices per day → 2<sup>N</sup> paths. The future only depends on (day, holding), so there are just 2N distinct situations.</p>`,
      code: { lang: 'java', code: `class Brute {
    int go(int[] p, int fee, int day, boolean holding) {
        if (day == p.length) return 0;
        int wait = go(p, fee, day + 1, holding);
        int act = holding ? p[day] - fee + go(p, fee, day + 1, false)
                          : -p[day] + go(p, fee, day + 1, true);
        return Math.max(wait, act);
    }
    public int maxProfit(int[] prices, int fee) { return go(prices, fee, 0, false); }
}`, alt: [
          { lang: 'python', code: `def max_profit(prices, fee):
    def go(day, holding):
        if day == len(prices):
            return 0
        wait = go(day + 1, holding)
        if holding:
            act = prices[day] - fee + go(day + 1, False)
        else:
            act = -prices[day] + go(day + 1, True)
        return max(wait, act)

    return go(0, False)` },
          { lang: 'js', code: `function maxProfit(prices, fee) {
  function go(day, holding) {
    if (day === prices.length) return 0;
    const wait = go(day + 1, holding);
    const act = holding ? prices[day] - fee + go(day + 1, false)
                        : -prices[day] + go(day + 1, true);
    return Math.max(wait, act);
  }
  return go(0, false);
}` },
          { lang: 'cpp', code: `class Brute {
    int go(vector<int>& p, int fee, int day, bool holding) {
        if (day == (int)p.size()) return 0;
        int wait = go(p, fee, day + 1, holding);
        int act = holding ? p[day] - fee + go(p, fee, day + 1, false)
                          : -p[day] + go(p, fee, day + 1, true);
        return max(wait, act);
    }
public:
    int maxProfit(vector<int>& prices, int fee) { return go(prices, fee, 0, false); }
};` }
        ] }
    },
    mcq: { q: 'Where should the fee be subtracted in the 2-mode machine?', options: ['On exactly one arrow per round trip (e.g. the sell arrow)', 'On both the buy and the sell arrow', 'Every day you hold a share', 'Only at the very end'], answer: 0, explain: 'The fee is per transaction. Charging it on both arrows would double-charge each round trip.' },
    hints: [
      `<p>Hint 1: two modes at the end of each day — holding a share or holding cash.</p>`,
      `<p>Hint 2: cash = max(cash, hold + p − fee); hold = max(hold, cash − p), both from yesterday’s values.</p>`,
      `<p>Hint 3: start cash = 0, hold = −prices[0]; answer is cash. Use temporaries so the new cash does not leak into today’s hold (it would be harmless here, but build the habit).</p>`
    ],
    solution: {
      approach: `<p>Two-variable state machine. The fee simply lowers the value of the sell arrow, which automatically suppresses trades whose rise is not bigger than the fee.</p>`,
      code: `class Solution {
    public int maxProfit(int[] prices, int fee) {
        int cash = 0, hold = -prices[0];
        for (int i = 1; i < prices.length; i++) {
            int newCash = Math.max(cash, hold + prices[i] - fee);   // sell today
            int newHold = Math.max(hold, cash - prices[i]);         // buy today
            cash = newCash; hold = newHold;
        }
        return cash;
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def max_profit(self, prices, fee):
        cash, hold = 0, -prices[0]
        for p in prices[1:]:
            cash, hold = max(cash, hold + p - fee), max(hold, cash - p)
        return cash` }, { lang: 'js', code: `function maxProfit(prices, fee) {
  let cash = 0, hold = -prices[0];
  for (let i = 1; i < prices.length; i++) {
    const p = prices[i];
    [cash, hold] = [Math.max(cash, hold + p - fee), Math.max(hold, cash - p)];   // both from yesterday
  }
  return cash;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int maxProfit(vector<int>& prices, int fee) {
        int cash = 0, hold = -prices[0];
        for (size_t i = 1; i < prices.size(); i++) {
            int newCash = max(cash, hold + prices[i] - fee);   // sell today
            int newHold = max(hold, cash - prices[i]);         // buy today
            cash = newCash; hold = newHold;
        }
        return cash;
    }
};` }],
      dry: { head: ['day', 'price', 'cash', 'hold'], rows: [['0', '1', '0', '−1'], ['1', '3', '0', '−1'], ['2', '2', '0', '−1'], ['3', '8', '5', '−1'], ['4', '4', '5', '1'], ['5', '9', '<span class="c-g">8</span>', '1']] },
      complexity: `<p>Time O(N), space O(1).</p>`,
      followUps: ['Fee charged only on buying — what changes?', 'Combine fee with a cooldown.']
    },
    tests: { sig: 'int[] int -> int', fn: 'maxProfit', cases: [
      [[[1, 3, 2, 8, 4, 9], 2], 8],
      [[[1, 3, 7, 5, 10, 3], 3], 6],
      [[[1], 0], 0],
      [[[1, 2], 0], 1],
      [[[1, 2], 1], 0],
      [[[5, 4, 3], 1], 0],
      [[[1, 4, 2, 5], 0], 6],
      [[{ $range: [1, 50000] }, 0], 49998],
      [[{ $range: [1, 50000] }, 49998], 0]
    ] }
  });

  practice.push({
    title: 'Palindrome Partitioning (list all)', level: 'Medium', tags: ['partition dp', 'backtracking', 'string'], companies: ['Amazon', 'Google', 'Bloomberg'],
    statement: `<p>Given a string <code>s</code>, return <b>all</b> ways to partition it so that every piece is a palindrome.</p>`,
    constraints: `1 ≤ s.length ≤ 16, lowercase letters.`,
    example: `<p>s = ${H.c('b', '"aab"')} → ${H.c('g', '[["a","a","b"], ["aa","b"]]')}. s = "a" → [["a"]].</p>`,
    brute: {
      why: `<p>Enumerate all 2<sup>N−1</sup> ways to place cuts and check every piece with two pointers. Correct but each piece is re-checked in O(N) many times; many cut patterns are generated even though an early piece is already not a palindrome.</p>`,
      code: { lang: 'java', code: `class Brute {
    boolean pal(String s) { return new StringBuilder(s).reverse().toString().equals(s); }
    public List<List<String>> partition(String s) {
        List<List<String>> res = new ArrayList<>();
        int n = s.length();
        for (int mask = 0; mask < (1 << (n - 1)); mask++) {     // bit i set = cut after char i
            List<String> parts = new ArrayList<>();
            int start = 0;
            boolean ok = true;
            for (int i = 0; i < n && ok; i++) {
                if (i == n - 1 || (mask >> i & 1) == 1) {
                    String piece = s.substring(start, i + 1);
                    if (!pal(piece)) ok = false;
                    parts.add(piece);
                    start = i + 1;
                }
            }
            if (ok) res.add(parts);
        }
        return res;
    }
}`, alt: [
          { lang: 'python', code: `def partition(s):
    def pal(x):
        return x == x[::-1]

    res = []
    n = len(s)
    for mask in range(1 << (n - 1)):                   # bit i set = cut after char i
        parts = []
        start = 0
        ok = True
        for i in range(n):
            if ok and (i == n - 1 or (mask >> i & 1) == 1):
                piece = s[start:i + 1]
                if not pal(piece):
                    ok = False
                parts.append(piece)
                start = i + 1
        if ok:
            res.append(parts)
    return res` },
          { lang: 'js', code: `function partition(s) {
  const pal = (x) => [...x].reverse().join('') === x;
  const res = [];
  const n = s.length;
  for (let mask = 0; mask < (1 << (n - 1)); mask++) {     // bit i set = cut after char i
    const parts = [];
    let start = 0;
    let ok = true;
    for (let i = 0; i < n && ok; i++) {
      if (i === n - 1 || (mask >> i & 1) === 1) {
        const piece = s.substring(start, i + 1);
        if (!pal(piece)) ok = false;
        parts.push(piece);
        start = i + 1;
      }
    }
    if (ok) res.push(parts);
  }
  return res;
}` },
          { lang: 'cpp', code: `vector<vector<string>> partition(string s) {
    auto pal = [](const string& x) { return string(x.rbegin(), x.rend()) == x; };
    vector<vector<string>> res;
    int n = s.size();
    for (int mask = 0; mask < (1 << (n - 1)); mask++) {    // bit i set = cut after char i
        vector<string> parts;
        int start = 0;
        bool ok = true;
        for (int i = 0; i < n && ok; i++) {
            if (i == n - 1 || (mask >> i & 1) == 1) {
                string piece = s.substr(start, i + 1 - start);
                if (!pal(piece)) ok = false;
                parts.push_back(piece);
                start = i + 1;
            }
        }
        if (ok) res.push_back(parts);
    }
    return res;
}` }
        ] }
    },
    mcq: { q: 'Why can this problem NOT be solved in polynomial time in general?', options: ['The output itself can contain 2<sup>N−1</sup> partitions (e.g. "aaaa…")', 'Palindrome checks are exponential', 'Backtracking is always exponential', 'It can; dp gives O(N²)'], answer: 0, explain: 'A string of N equal letters has every cut pattern valid, so just printing the answer is exponential. We can only make each output step cheap (O(1) palindrome checks, no dead branches).' },
    hints: [
      `<p>Hint 1: choose the first piece s[start..end] among palindromes, then recursively partition the rest — choose, explore, unchoose.</p>`,
      `<p>Hint 2: precompute pal[i][j] once in O(N²) so each check is O(1).</p>`,
      `<p>Hint 3: when start == n, copy the current list into the result. Iterate end from start to n−1 and recurse only when pal[start][end] is true.</p>`
    ],
    solution: {
      approach: `<p>Backtracking over the first piece, pruned by an O(N²) palindrome table (partition-DP preprocessing). Every recursive branch produces at least one valid partition, so no work is wasted on dead ends.</p>`,
      code: `class Solution {
    public List<List<String>> partition(String s) {
        int n = s.length();
        boolean[][] pal = new boolean[n][n];
        for (int i = n - 1; i >= 0; i--)
            for (int j = i; j < n; j++)
                pal[i][j] = s.charAt(i) == s.charAt(j) && (j - i < 2 || pal[i + 1][j - 1]);
        List<List<String>> res = new ArrayList<>();
        backtrack(s, 0, pal, new ArrayList<>(), res);
        return res;
    }
    private void backtrack(String s, int start, boolean[][] pal, List<String> cur, List<List<String>> res) {
        if (start == s.length()) { res.add(new ArrayList<>(cur)); return; }
        for (int end = start; end < s.length(); end++) {
            if (!pal[start][end]) continue;
            cur.add(s.substring(start, end + 1));      // choose
            backtrack(s, end + 1, pal, cur, res);      // explore
            cur.remove(cur.size() - 1);                // unchoose
        }
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def partition(self, s):
        n = len(s)
        pal = [[False] * n for _ in range(n)]
        for i in range(n - 1, -1, -1):
            for j in range(i, n):
                pal[i][j] = s[i] == s[j] and (j - i < 2 or pal[i + 1][j - 1])
        res, cur = [], []
        def go(start):
            if start == n:
                res.append(cur[:]); return
            for end in range(start, n):
                if pal[start][end]:
                    cur.append(s[start:end + 1]); go(end + 1); cur.pop()
        go(0)
        return res` }, { lang: 'js', code: `function partition(s) {
  const n = s.length;
  const pal = Array.from({ length: n }, () => new Array(n).fill(false));
  for (let i = n - 1; i >= 0; i--)
    for (let j = i; j < n; j++)
      pal[i][j] = s[i] === s[j] && (j - i < 2 || pal[i + 1][j - 1]);
  const res = [], cur = [];
  const go = (start) => {
    if (start === n) { res.push([...cur]); return; }
    for (let end = start; end < n; end++) {
      if (!pal[start][end]) continue;
      cur.push(s.slice(start, end + 1));   // choose
      go(end + 1);                         // explore
      cur.pop();                           // unchoose
    }
  };
  go(0);
  return res;
}` }, { lang: 'cpp', code: `class Solution {
public:
    vector<vector<string>> partition(string s) {
        int n = s.size();
        vector<vector<bool>> pal(n, vector<bool>(n, false));
        for (int i = n - 1; i >= 0; i--)
            for (int j = i; j < n; j++)
                pal[i][j] = s[i] == s[j] && (j - i < 2 || pal[i + 1][j - 1]);
        vector<vector<string>> res;
        vector<string> cur;
        backtrack(s, 0, pal, cur, res);
        return res;
    }
private:
    void backtrack(const string& s, int start, const vector<vector<bool>>& pal, vector<string>& cur, vector<vector<string>>& res) {
        if (start == (int)s.size()) { res.push_back(cur); return; }
        for (int end = start; end < (int)s.size(); end++) {
            if (!pal[start][end]) continue;
            cur.push_back(s.substr(start, end - start + 1));   // choose
            backtrack(s, end + 1, pal, cur, res);              // explore
            cur.pop_back();                                    // unchoose
        }
    }
};` }],
      dry: { head: ['call', 'start', 'pieces so far', 'action'], rows: [['1', '0', '[]', 'try "a" (pal), "aa" (pal), "aab" (no)'], ['2', '1', '[a]', 'try "a" → recurse; "ab" no'], ['3', '2', '[a, a]', '"b" → start 3 = n → <span class="c-g">add [a,a,b]</span>'], ['4', '2', '[aa]', '"b" → <span class="c-g">add [aa,b]</span>']] },
      complexity: `<p>Time O(N · 2<sup>N</sup>) in the worst case (output size), plus O(N²) preprocessing. Space O(N²) for the table, O(N) recursion.</p>`,
      followUps: ['Return only the count of partitions (dp, no listing).', 'Minimum cuts (Palindrome Partitioning II).']
    },
    // Partitions may come in any order. Every one must rebuild s from palindromes, with no repeats.
    // A number as the expected value means "this many partitions" (used for the 2^15-answer case).
    tests: { sig: 'string -> list<list<string>>', fn: 'partition',
      check: '(args, out, exp) => { const s = args[0]; if (!Array.isArray(out)) return false; const keys = out.map((p) => JSON.stringify(p)); if (new Set(keys).size !== keys.length) return false; const isPal = (w) => w.length > 0 && w === [...w].reverse().join(""); if (!out.every((p) => Array.isArray(p) && p.join("") === s && p.every(isPal))) return false; if (typeof exp === "number") return out.length === exp; return JSON.stringify(keys.sort()) === JSON.stringify(exp.map((p) => JSON.stringify(p)).sort()); }',
      cases: [
        [['aab'], [['a', 'a', 'b'], ['aa', 'b']]],
        [['a'], [['a']]],
        [['ab'], [['a', 'b']]],
        [['aaa'], [['a', 'a', 'a'], ['a', 'aa'], ['aa', 'a'], ['aaa']]],
        [['abba'], [['a', 'b', 'b', 'a'], ['a', 'bb', 'a'], ['abba']]],
        [['racecar'], [['r', 'a', 'c', 'e', 'c', 'a', 'r'], ['r', 'a', 'cec', 'a', 'r'], ['r', 'aceca', 'r'], ['racecar']]],
        [['abcdefghijklmnop'], [['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p']]],
        [[{ $rep: 'a', n: 16 }], 32768]
      ] }
  });

  practice.push({
    title: 'Longest Palindromic Subsequence', level: 'Medium', tags: ['string dp', 'interval dp'], companies: ['Amazon', 'LinkedIn', 'Uber'],
    statement: `<p>Given a string <code>s</code>, return the length of its longest <b>palindromic subsequence</b> (delete any characters, keep order, the result reads the same backwards).</p>`,
    constraints: `1 ≤ s.length ≤ 1000, lowercase letters.`,
    example: `<p>s = ${H.c('b', '"bbbab"')} → <b>4</b> (${H.c('g', '"bbbb"')}). s = "cbbd" → 2 ("bb").</p>`,
    brute: {
      why: `<p>Plain recursion on (i, j): if ends match take both, otherwise branch into dropping either end. Without memo the two branches overlap heavily (dropping left then right = dropping right then left), giving O(2<sup>N</sup>).</p>`,
      code: { lang: 'java', code: `class Brute {
    int lps(String s, int i, int j) {
        if (i > j) return 0;
        if (i == j) return 1;
        if (s.charAt(i) == s.charAt(j)) return 2 + lps(s, i + 1, j - 1);
        return Math.max(lps(s, i + 1, j), lps(s, i, j - 1));   // overlapping subproblems
    }
    public int longestPalindromeSubseq(String s) { return lps(s, 0, s.length() - 1); }
}`, alt: [
          { lang: 'python', code: `def longest_palindrome_subseq(s):
    def lps(i, j):
        if i > j:
            return 0
        if i == j:
            return 1
        if s[i] == s[j]:
            return 2 + lps(i + 1, j - 1)
        return max(lps(i + 1, j), lps(i, j - 1))     # overlapping subproblems

    return lps(0, len(s) - 1)` },
          { lang: 'js', code: `function longestPalindromeSubseq(s) {
  function lps(i, j) {
    if (i > j) return 0;
    if (i === j) return 1;
    if (s[i] === s[j]) return 2 + lps(i + 1, j - 1);
    return Math.max(lps(i + 1, j), lps(i, j - 1));   // overlapping subproblems
  }
  return lps(0, s.length - 1);
}` },
          { lang: 'cpp', code: `class Brute {
    int lps(const string& s, int i, int j) {
        if (i > j) return 0;
        if (i == j) return 1;
        if (s[i] == s[j]) return 2 + lps(s, i + 1, j - 1);
        return max(lps(s, i + 1, j), lps(s, i, j - 1));   // overlapping subproblems
    }
public:
    int longestPalindromeSubseq(string s) { return lps(s, 0, s.size() - 1); }
};` }
        ] }
    },
    mcq: { q: 'Which identity gives an alternative solution?', options: ['LPS(s) = LCS(s, reverse(s))', 'LPS(s) = n − LCS(s, s)', 'LPS(s) = longest palindromic substring', 'LPS(s) = LIS of character codes'], answer: 0, explain: 'A palindromic subsequence reads the same in s and reversed s, so it is a common subsequence of both; the longest common one is a palindrome of maximal length.' },
    hints: [
      `<p>Hint 1: look at the two ends of s[i..j]. If they are equal, both can be the outer layer of the palindrome.</p>`,
      `<p>Hint 2: dp[i][j] = s[i]==s[j] ? dp[i+1][j−1] + 2 : max(dp[i+1][j], dp[i][j−1]); dp[i][i] = 1.</p>`,
      `<p>Hint 3: fill i from n−1 down to 0 and j from i+1 up to n−1 so dependencies are ready. One-row optimisation is possible with a saved diagonal.</p>`
    ],
    solution: {
      approach: `<p>Interval DP over substrings, O(N²). For memory, keep one row plus a variable holding the old diagonal value (dp[i+1][j−1]).</p>`,
      code: `class Solution {
    public int longestPalindromeSubseq(String s) {
        int n = s.length();
        int[] dp = new int[n];                     // dp[j] = LPS of s[i..j] for the current i
        for (int i = n - 1; i >= 0; i--) {
            dp[i] = 1;
            int diag = 0;                          // dp[i+1][j-1] from the previous row
            for (int j = i + 1; j < n; j++) {
                int saved = dp[j];                 // dp[i+1][j] before overwrite
                if (s.charAt(i) == s.charAt(j)) dp[j] = diag + 2;
                else dp[j] = Math.max(dp[j], dp[j - 1]);
                diag = saved;
            }
        }
        return dp[n - 1];
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def longest_palindrome_subseq(self, s):
        n = len(s)
        dp = [[0] * n for _ in range(n)]
        for i in range(n - 1, -1, -1):
            dp[i][i] = 1
            for j in range(i + 1, n):
                dp[i][j] = dp[i + 1][j - 1] + 2 if s[i] == s[j] else max(dp[i + 1][j], dp[i][j - 1])
        return dp[0][n - 1]` }, { lang: 'js', code: `function longestPalindromeSubseq(s) {
  const n = s.length;
  const dp = new Int32Array(n);                    // dp[j] = LPS of s[i..j] for the current i
  for (let i = n - 1; i >= 0; i--) {
    dp[i] = 1;
    let diag = 0;                                  // dp[i+1][j-1] from the previous row
    for (let j = i + 1; j < n; j++) {
      const saved = dp[j];                         // dp[i+1][j] before overwrite
      dp[j] = s[i] === s[j] ? diag + 2 : Math.max(dp[j], dp[j - 1]);
      diag = saved;
    }
  }
  return dp[n - 1];
}` }, { lang: 'cpp', code: `class Solution {
public:
    int longestPalindromeSubseq(string s) {
        int n = s.size();
        vector<int> dp(n, 0);                          // dp[j] = LPS of s[i..j] for the current i
        for (int i = n - 1; i >= 0; i--) {
            dp[i] = 1;
            int diag = 0;                              // dp[i+1][j-1] from the previous row
            for (int j = i + 1; j < n; j++) {
                int saved = dp[j];                     // dp[i+1][j] before overwrite
                dp[j] = s[i] == s[j] ? diag + 2 : max(dp[j], dp[j - 1]);
                diag = saved;
            }
        }
        return dp[n - 1];
    }
};` }],
      dry: { head: ['substring', 'ends equal?', 'dp'], rows: [['"ba"', 'no', '1'], ['"ab"', 'no', '1'], ['"bab"', 'yes', '1 + 2 = 3'], ['"bbab"', 'yes', 'dp("ba") + 2 = 3'], ['"bbbab"', 'yes', 'dp("bba") + 2 = 2 + 2 = <span class="c-g">4</span>']] },
      complexity: `<p>Time O(N²), space O(N) with the rolling row.</p>`,
      followUps: ['Print the palindrome.', 'Minimum insertions to make s a palindrome (n − LPS).', 'Count palindromic subsequences.']
    },
    tests: { sig: 'string -> int', fn: 'longestPalindromeSubseq', cases: [
      [['bbbab'], 4],
      [['cbbd'], 2],
      [['a'], 1],
      [['abcde'], 1],
      [['aaaa'], 4],
      [['agbdba'], 5],
      [[{ $rep: 'a', n: 1000 }], 1000],
      [[{ $rep: 'ab', n: 500 }], 999],
      [[{ $concat: [{ $rep: 'abc', n: 333 }, 'a'] }], 667]
    ] }
  });

  practice.push({
    title: 'Minimum Score Triangulation of Polygon', level: 'Medium', tags: ['interval dp'], companies: ['Uber', 'Google'],
    statement: `<p>A convex polygon has vertex values <code>values[0..n−1]</code> in clockwise order. Triangulate it into n − 2 triangles; a triangle’s score is the product of its three vertex values. Return the minimum total score.</p>`,
    constraints: `3 ≤ n ≤ 50, 1 ≤ values[i] ≤ 100.`,
    example: `<p>values = [3, 7, 4, 5] → <b>144</b>: triangles (3,7,5) + (4,5,7) = 105 + 140 = 245, or (3,4,5) + (3,4,7) = 60 + 84 = ${H.c('g', '144')}. values = [1, 3, 1, 4, 1, 5] → 13.</p>`,
    brute: {
      why: `<p>Recursion over the third vertex of the triangle on edge (i, j) without memo: the number of triangulations is a Catalan number (≈ 4<sup>n</sup>/n<sup>1.5</sup>), and the same sub-polygon (i, j) is solved repeatedly.</p>`,
      code: { lang: 'java', code: `class Brute {
    int best(int[] v, int i, int j) {
        if (j - i < 2) return 0;                      // fewer than 3 vertices: no triangle
        int res = Integer.MAX_VALUE;
        for (int k = i + 1; k < j; k++)
            res = Math.min(res, best(v, i, k) + best(v, k, j) + v[i] * v[k] * v[j]);
        return res;
    }
    public int minScoreTriangulation(int[] values) { return best(values, 0, values.length - 1); }
}`, alt: [
          { lang: 'python', code: `def min_score_triangulation(values):
    def best(i, j):
        if j - i < 2:
            return 0                                  # fewer than 3 vertices: no triangle
        res = float('inf')
        for k in range(i + 1, j):
            res = min(res, best(i, k) + best(k, j) + values[i] * values[k] * values[j])
        return res

    return best(0, len(values) - 1)` },
          { lang: 'js', code: `function minScoreTriangulation(values) {
  function best(i, j) {
    if (j - i < 2) return 0;                          // fewer than 3 vertices: no triangle
    let res = Infinity;
    for (let k = i + 1; k < j; k++)
      res = Math.min(res, best(i, k) + best(k, j) + values[i] * values[k] * values[j]);
    return res;
  }
  return best(0, values.length - 1);
}` },
          { lang: 'cpp', code: `class Brute {
    int best(vector<int>& v, int i, int j) {
        if (j - i < 2) return 0;                      // fewer than 3 vertices: no triangle
        int res = INT_MAX;
        for (int k = i + 1; k < j; k++)
            res = min(res, best(v, i, k) + best(v, k, j) + v[i] * v[k] * v[j]);
        return res;
    }
public:
    int minScoreTriangulation(vector<int>& values) { return best(values, 0, values.size() - 1); }
};` }
        ] }
    },
    mcq: { q: 'Why does every triangulation of polygon i..j contain exactly one triangle using edge (i, j)?', options: ['Edge (i, j) is a side of the sub-polygon, and every side belongs to exactly one triangle', 'Because i and j are adjacent in the original array', 'Because the polygon is convex, all triangles use vertex 0', 'It does not; some use two'], answer: 0, explain: 'In a triangulation every polygon side lies in exactly one triangle. Its third vertex k splits the rest into polygons i..k and k..j — the interval split point.' },
    hints: [
      `<p>Hint 1: fix the side (i, j). Its triangle has some third vertex k between them; that triangle splits the polygon into two smaller polygons.</p>`,
      `<p>Hint 2: dp[i][j] = min over i &lt; k &lt; j of dp[i][k] + dp[k][j] + v[i]·v[k]·v[j]; dp[i][i+1] = 0.</p>`,
      `<p>Hint 3: fill by gap length (j − i) from 2 to n−1. Answer dp[0][n−1]. Use int: max 100³·48 fits easily.</p>`
    ],
    solution: {
      approach: `<p>Interval DP identical in shape to Matrix Chain Multiplication (an n-gon triangulation ↔ bracketing a chain of n−1 matrices).</p>`,
      code: `class Solution {
    public int minScoreTriangulation(int[] v) {
        int n = v.length;
        int[][] dp = new int[n][n];
        for (int gap = 2; gap < n; gap++) {
            for (int i = 0; i + gap < n; i++) {
                int j = i + gap;
                dp[i][j] = Integer.MAX_VALUE;
                for (int k = i + 1; k < j; k++)
                    dp[i][j] = Math.min(dp[i][j], dp[i][k] + dp[k][j] + v[i] * v[k] * v[j]);
            }
        }
        return dp[0][n - 1];
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def min_score_triangulation(self, v):
        n = len(v)
        dp = [[0] * n for _ in range(n)]
        for gap in range(2, n):
            for i in range(n - gap):
                j = i + gap
                dp[i][j] = min(dp[i][k] + dp[k][j] + v[i] * v[k] * v[j] for k in range(i + 1, j))
        return dp[0][n - 1]` }, { lang: 'js', code: `function minScoreTriangulation(v) {
  const n = v.length;
  const dp = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let gap = 2; gap < n; gap++) {
    for (let i = 0; i + gap < n; i++) {
      const j = i + gap;
      let best = Infinity;
      for (let k = i + 1; k < j; k++)             // k = third vertex of the triangle on edge (i, j)
        best = Math.min(best, dp[i][k] + dp[k][j] + v[i] * v[k] * v[j]);
      dp[i][j] = best;
    }
  }
  return dp[0][n - 1];
}` }, { lang: 'cpp', code: `class Solution {
public:
    int minScoreTriangulation(vector<int>& v) {
        int n = v.size();
        vector<vector<int>> dp(n, vector<int>(n, 0));
        for (int gap = 2; gap < n; gap++) {
            for (int i = 0; i + gap < n; i++) {
                int j = i + gap;
                dp[i][j] = INT_MAX;
                for (int k = i + 1; k < j; k++)       // k = third vertex of the triangle on edge (i, j)
                    dp[i][j] = min(dp[i][j], dp[i][k] + dp[k][j] + v[i] * v[k] * v[j]);
            }
        }
        return dp[0][n - 1];
    }
};` }],
      dry: { head: ['range (i, j)', 'k options', 'dp'], rows: [['(0,2) 3,7,4', 'k=1: 84', '84'], ['(1,3) 7,4,5', 'k=2: 140', '140'], ['(0,3)', 'k=1: 0 + 140 + 3·7·5 = 245; k=2: 84 + 0 + 3·4·5 = 144', '<span class="c-g">144</span>']] },
      complexity: `<p>Time O(n³), space O(n²).</p>`,
      followUps: ['Maximise instead of minimise.', 'Return the triangles chosen.']
    },
    tests: { sig: 'int[] -> int', fn: 'minScoreTriangulation', cases: [
      [[[1, 2, 3]], 6],
      [[[3, 7, 4, 5]], 144],
      [[[1, 3, 1, 4, 1, 5]], 13],
      [[[100, 100, 100]], 1000000],
      [[{ $rep: 100, n: 8 }], 6000000],
      [[[2, 1, 4, 3, 6, 5, 8, 7]], 170],
      [[{ $rep: 100, n: 50 }], 48000000]
    ] }
  });

  // ================= PRACTICE: Hard =================
  practice.push({
    title: 'Russian Doll Envelopes', level: 'Hard', tags: ['LIS', 'binary search', 'sorting'], companies: ['Google', 'Amazon', 'Microsoft'],
    statement: `<p>Envelopes are given as [width, height]. One fits inside another only if <b>both</b> width and height are strictly smaller. Return the maximum number of envelopes you can nest (Russian-doll style). Rotation is not allowed.</p>`,
    constraints: `1 ≤ envelopes.length ≤ 10<sup>5</sup>, 1 ≤ w, h ≤ 10<sup>5</sup>. O(N log N) required.`,
    example: `<p>[[5,4], [6,4], [6,7], [2,3]] → <b>3</b>: ${H.c('g', '[2,3] → [5,4] → [6,7]')}. [[1,1], [1,1], [1,1]] → 1.</p>`,
    brute: {
      why: `<p>Sort by width and run the O(N²) LIS-style dp checking both dimensions: correct but 10<sup>10</sup> steps at N = 10<sup>5</sup>. The fix is to reduce to a 1D LIS so the tails + binary search trick applies.</p>`,
      code: { lang: 'java', code: `class Brute {
    public int maxEnvelopes(int[][] env) {
        Arrays.sort(env, (a, b) -> a[0] - b[0]);
        int n = env.length, best = 0;
        int[] dp = new int[n];
        for (int i = 0; i < n; i++) {
            dp[i] = 1;
            for (int j = 0; j < i; j++)
                if (env[j][0] < env[i][0] && env[j][1] < env[i][1]) dp[i] = Math.max(dp[i], dp[j] + 1);
            best = Math.max(best, dp[i]);
        }
        return best;
    }
}`, alt: [
          { lang: 'python', code: `def max_envelopes(env):
    env = sorted(env, key=lambda e: e[0])
    n = len(env)
    best = 0
    dp = [0] * n
    for i in range(n):
        dp[i] = 1
        for j in range(i):
            if env[j][0] < env[i][0] and env[j][1] < env[i][1]:
                dp[i] = max(dp[i], dp[j] + 1)
        best = max(best, dp[i])
    return best` },
          { lang: 'js', code: `function maxEnvelopes(env) {
  env.sort((a, b) => a[0] - b[0]);
  const n = env.length;
  let best = 0;
  const dp = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    dp[i] = 1;
    for (let j = 0; j < i; j++)
      if (env[j][0] < env[i][0] && env[j][1] < env[i][1]) dp[i] = Math.max(dp[i], dp[j] + 1);
    best = Math.max(best, dp[i]);
  }
  return best;
}` },
          { lang: 'cpp', code: `int maxEnvelopes(vector<vector<int>>& env) {
    sort(env.begin(), env.end(), [](const vector<int>& a, const vector<int>& b) { return a[0] < b[0]; });
    int n = env.size(), best = 0;
    vector<int> dp(n, 0);
    for (int i = 0; i < n; i++) {
        dp[i] = 1;
        for (int j = 0; j < i; j++)
            if (env[j][0] < env[i][0] && env[j][1] < env[i][1]) dp[i] = max(dp[i], dp[j] + 1);
        best = max(best, dp[i]);
    }
    return best;
}` }
        ] }
    },
    mcq: { q: 'After sorting by width ascending, how must equal widths be ordered for the height-LIS to be correct?', options: ['Height descending', 'Height ascending', 'Any order', 'Remove duplicates of width'], answer: 0, explain: 'Envelopes with the same width cannot nest. Sorting their heights in decreasing order makes it impossible for a strictly increasing height subsequence to take two of them.' },
    hints: [
      `<p>Hint 1: if widths were all distinct, sorting by width would leave a pure LIS on heights.</p>`,
      `<p>Hint 2: handle equal widths by sorting them by height <b>descending</b> so at most one per width can join an increasing run.</p>`,
      `<p>Hint 3: then run the O(N log N) tails LIS (lower bound, strict) on the heights. In the comparator, compare values instead of subtracting them (<code>Integer.compare</code> in Java); in JavaScript always pass a numeric comparator to <code>sort</code>; in Python a key like <code>(w, -h)</code> does it.</p>`
    ],
    solution: {
      approach: `<p>Sort by (w ascending, h descending), extract heights, strict LIS with tails + binary search. The tie rule turns the 2D condition into a 1D one.</p>`,
      code: `class Solution {
    public int maxEnvelopes(int[][] envelopes) {
        Arrays.sort(envelopes, (a, b) -> a[0] != b[0] ? Integer.compare(a[0], b[0]) : Integer.compare(b[1], a[1]));
        int[] tails = new int[envelopes.length];
        int len = 0;
        for (int[] e : envelopes) {
            int h = e[1], lo = 0, hi = len;
            while (lo < hi) {
                int mid = (lo + hi) >>> 1;
                if (tails[mid] < h) lo = mid + 1; else hi = mid;
            }
            tails[lo] = h;
            if (lo == len) len++;
        }
        return len;
    }
}`,
      alt: [{ lang: 'python', code: `from bisect import bisect_left

class Solution:
    def max_envelopes(self, envelopes):
        envelopes.sort(key=lambda e: (e[0], -e[1]))
        tails = []
        for _, h in envelopes:
            k = bisect_left(tails, h)
            if k == len(tails):
                tails.append(h)
            else:
                tails[k] = h
        return len(tails)` }, { lang: 'js', code: `function maxEnvelopes(envelopes) {
  const env = [...envelopes].sort((a, b) => a[0] - b[0] || b[1] - a[1]);   // w asc, h desc on ties
  const tails = [];
  for (const [, h] of env) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {                              // lower bound: strict LIS on heights
      const mid = (lo + hi) >> 1;
      if (tails[mid] < h) lo = mid + 1; else hi = mid;
    }
    tails[lo] = h;
  }
  return tails.length;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int maxEnvelopes(vector<vector<int>>& envelopes) {
        sort(envelopes.begin(), envelopes.end(), [](const vector<int>& a, const vector<int>& b) {
            return a[0] != b[0] ? a[0] < b[0] : a[1] > b[1];   // w asc, h desc on ties
        });
        vector<int> tails;
        for (auto& e : envelopes) {
            auto it = lower_bound(tails.begin(), tails.end(), e[1]);   // strict LIS on heights
            if (it == tails.end()) tails.push_back(e[1]); else *it = e[1];
        }
        return (int)tails.size();
    }
};` }],
      dry: { head: ['sorted envelope', 'height', 'tails'], rows: [['[2,3]', '3', '[3]'], ['[5,4]', '4', '[3, 4]'], ['[6,7]', '7', '[3, 4, 7]'], ['[6,4]', '4', '[3, 4, 7] (replace 4 with 4) → <span class="c-g">3</span>']] },
      complexity: `<p>Time O(N log N), space O(N).</p>`,
      followUps: ['3D boxes (stacking boxes) — why does the trick not extend directly?', 'Return the actual nesting order.']
    },
    tests: { sig: 'int[][] -> int', fn: 'maxEnvelopes', cases: [
      [[[[5, 4], [6, 4], [6, 7], [2, 3]]], 3],
      [[[[1, 1], [1, 1], [1, 1]]], 1],
      [[[[1, 2]]], 1],
      [[[[4, 5], [4, 6], [6, 7], [2, 3], [1, 1]]], 4],
      [[[[1, 3], [3, 5], [6, 7], [6, 8], [8, 4], [9, 5]]], 3],
      [[[[2, 100], [3, 200], [4, 300], [5, 500], [5, 400], [5, 250], [6, 370], [6, 360], [7, 380]]], 5],
      [[[[10, 8], [1, 12], [6, 15], [2, 18]]], 2],
      [[{ $rep: [1, 1], n: 100000 }], 1],
      [[{ $concat: [{ $rep: [100000, 100000], n: 50000 }, { $rep: [1, 1], n: 50000 }] }], 2]
    ] }
  });

  practice.push({
    title: 'Best Time to Buy and Sell Stock IV (at most k transactions)', level: 'Hard', tags: ['state machine dp', 'dp'], companies: ['Amazon', 'Citadel', 'Two Sigma', 'Google'],
    statement: `<p>Given an integer <code>k</code> and daily prices, find the maximum profit with at most <code>k</code> transactions (each = one buy followed by one sell; at most one share held at a time).</p>`,
    constraints: `1 ≤ k ≤ 100, 1 ≤ prices.length ≤ 1000, 0 ≤ prices[i] ≤ 1000. (Be ready for k up to 10<sup>9</sup>.)`,
    example: `<p>k = 2, prices = [3, 2, 6, 5, 0, 3] → <b>7</b>: ${H.c('g', 'buy 2 sell 6 (+4), buy 0 sell 3 (+3)')}. k = 1 on the same prices → 4.</p>`,
    brute: {
      why: `<p>Recursion over (day, transactions left, holding) with choices wait / buy / sell — exponential without memo, even though there are only N·k·2 distinct situations.</p>`,
      code: { lang: 'java', code: `class Brute {
    int go(int[] p, int day, int left, boolean holding) {
        if (day == p.length || (left == 0 && !holding)) return 0;
        int best = go(p, day + 1, left, holding);                                   // wait
        if (holding) best = Math.max(best, p[day] + go(p, day + 1, left - 1, false)); // sell completes one
        else best = Math.max(best, -p[day] + go(p, day + 1, left, true));           // buy
        return best;
    }
    public int maxProfit(int k, int[] prices) { return go(prices, 0, k, false); }
}`, alt: [
          { lang: 'python', code: `def max_profit(k, prices):
    def go(day, left, holding):
        if day == len(prices) or (left == 0 and not holding):
            return 0
        best = go(day + 1, left, holding)                                   # wait
        if holding:
            best = max(best, prices[day] + go(day + 1, left - 1, False))    # sell completes one
        else:
            best = max(best, -prices[day] + go(day + 1, left, True))        # buy
        return best

    return go(0, k, False)` },
          { lang: 'js', code: `function maxProfit(k, prices) {
  function go(day, left, holding) {
    if (day === prices.length || (left === 0 && !holding)) return 0;
    let best = go(day + 1, left, holding);                                  // wait
    if (holding) best = Math.max(best, prices[day] + go(day + 1, left - 1, false)); // sell completes one
    else best = Math.max(best, -prices[day] + go(day + 1, left, true));             // buy
    return best;
  }
  return go(0, k, false);
}` },
          { lang: 'cpp', code: `class Brute {
    int go(vector<int>& p, int day, int left, bool holding) {
        if (day == (int)p.size() || (left == 0 && !holding)) return 0;
        int best = go(p, day + 1, left, holding);                                      // wait
        if (holding) best = max(best, p[day] + go(p, day + 1, left - 1, false));       // sell completes one
        else best = max(best, -p[day] + go(p, day + 1, left, true));                   // buy
        return best;
    }
public:
    int maxProfit(int k, vector<int>& prices) { return go(prices, 0, k, false); }
};` }
        ] }
    },
    mcq: { q: 'Why can you switch to the greedy “sum of all rises” when k ≥ n/2?', options: ['There can be at most ⌊n/2⌋ non-overlapping profitable trades, so the limit never binds', 'Because greedy is always optimal for stocks', 'Because k is too large for an array', 'Because the dp becomes incorrect'], answer: 0, explain: 'Each trade needs a distinct buy day and later sell day, so at most n/2 useful trades exist. If k is at least that, the problem is the unlimited version.' },
    hints: [
      `<p>Hint 1: extend the two-mode machine with a counter: buy[j] = best cash after the j-th buy, sell[j] = best cash after the j-th sell.</p>`,
      `<p>Hint 2: buy[j] = max(buy[j], sell[j−1] − p); sell[j] = max(sell[j], buy[j] + p) for j = 1..k, every day.</p>`,
      `<p>Hint 3: initialise buy[j] = −∞, sell[j] = 0; answer sell[k]. Add the k ≥ n/2 shortcut to avoid huge arrays and O(n·k) blow-up.</p>`
    ],
    solution: {
      approach: `<p>k-layer state machine with O(k) memory, plus the unlimited shortcut. sell[k] is monotone in k, so it already represents “at most k”.</p>`,
      code: `class Solution {
    public int maxProfit(int k, int[] prices) {
        int n = prices.length;
        if (n < 2 || k == 0) return 0;
        if (k >= n / 2) {                                  // unlimited transactions
            int sum = 0;
            for (int i = 1; i < n; i++) sum += Math.max(0, prices[i] - prices[i - 1]);
            return sum;
        }
        int[] buy = new int[k + 1], sell = new int[k + 1];
        Arrays.fill(buy, Integer.MIN_VALUE);
        for (int p : prices) {
            for (int j = 1; j <= k; j++) {
                buy[j] = Math.max(buy[j], sell[j - 1] - p);
                sell[j] = Math.max(sell[j], buy[j] + p);
            }
        }
        return sell[k];
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def max_profit(self, k, prices):
        n = len(prices)
        if k >= n // 2:
            return sum(max(0, b - a) for a, b in zip(prices, prices[1:]))
        buy, sell = [float('-inf')] * (k + 1), [0] * (k + 1)
        for p in prices:
            for j in range(1, k + 1):
                buy[j] = max(buy[j], sell[j - 1] - p)
                sell[j] = max(sell[j], buy[j] + p)
        return sell[k]` }, { lang: 'js', code: `function maxProfit(k, prices) {
  const n = prices.length;
  if (n < 2 || k === 0) return 0;
  if (k >= n >> 1) {                                // unlimited transactions: sum every rise
    let sum = 0;
    for (let i = 1; i < n; i++) sum += Math.max(0, prices[i] - prices[i - 1]);
    return sum;
  }
  const buy = new Array(k + 1).fill(-Infinity), sell = new Array(k + 1).fill(0);
  for (const p of prices) {
    for (let j = 1; j <= k; j++) {
      buy[j] = Math.max(buy[j], sell[j - 1] - p);   // j-th buy, paid from the (j-1)-th sell
      sell[j] = Math.max(sell[j], buy[j] + p);      // j-th sell
    }
  }
  return sell[k];
}` }, { lang: 'cpp', code: `class Solution {
public:
    int maxProfit(int k, vector<int>& prices) {
        int n = prices.size();
        if (n < 2 || k == 0) return 0;
        if (k >= n / 2) {                              // unlimited transactions: sum every rise
            int sum = 0;
            for (int i = 1; i < n; i++) sum += max(0, prices[i] - prices[i - 1]);
            return sum;
        }
        vector<int> buy(k + 1, INT_MIN), sell(k + 1, 0);
        for (int p : prices) {
            for (int j = 1; j <= k; j++) {
                buy[j] = max(buy[j], sell[j - 1] - p);  // j-th buy, paid from the (j-1)-th sell
                sell[j] = max(sell[j], buy[j] + p);     // j-th sell
            }
        }
        return sell[k];
    }
};` }],
      dry: { head: ['day', 'price', 'buy1', 'sell1', 'buy2', 'sell2'], rows: [['0', '3', '−3', '0', '−3', '0'], ['1', '2', '−2', '0', '−2', '0'], ['2', '6', '−2', '4', '−2', '4'], ['3', '5', '−2', '4', '−1', '4'], ['4', '0', '0', '4', '4', '4'], ['5', '3', '0', '4', '4', '<span class="c-g">7</span>']] },
      complexity: `<p>Time O(n·k) (or O(n) when k ≥ n/2), space O(k).</p>`,
      followUps: ['Add a cooldown.', 'Solve in O(n log n) independent of k (valley/peak pairs + heap, or the “Aliens” penalty trick).']
    },
    tests: { sig: 'int int[] -> int', fn: 'maxProfit', cases: [
      [[2, [2, 4, 1]], 2],
      [[2, [3, 2, 6, 5, 0, 3]], 7],
      [[1, [3, 2, 6, 5, 0, 3]], 4],
      [[1, [5]], 0],
      [[3, [1, 2, 3, 4, 5]], 4],
      [[2, [3, 3, 5, 0, 0, 3, 1, 4]], 6],
      [[2, [1, 2, 4, 2, 5, 7, 2, 4, 9, 0]], 13],
      [[1000000000, [1, 3, 1, 3]], 4],
      // ten rises 0 -> 99 (1000 prices): k = 100 is below n/2, so the k-layer dp runs
      [[100, { $concat: [{ $range: [0, 100] }, { $range: [0, 100] }, { $range: [0, 100] }, { $range: [0, 100] }, { $range: [0, 100] }, { $range: [0, 100] }, { $range: [0, 100] }, { $range: [0, 100] }, { $range: [0, 100] }, { $range: [0, 100] }] }], 990],
      [[5, { $concat: [{ $range: [0, 100] }, { $range: [0, 100] }, { $range: [0, 100] }, { $range: [0, 100] }, { $range: [0, 100] }, { $range: [0, 100] }, { $range: [0, 100] }, { $range: [0, 100] }, { $range: [0, 100] }, { $range: [0, 100] }] }], 495]
    ] }
  });

  practice.push({
    title: 'Minimum Cost to Cut a Stick', level: 'Hard', tags: ['interval dp', 'sorting'], companies: ['Google', 'Amazon'],
    statement: `<p>A wooden stick of length <code>n</code> must be cut at positions <code>cuts[i]</code>, in any order you choose. Each cut costs the <b>current length</b> of the piece being cut. Return the minimum total cost.</p>`,
    constraints: `2 ≤ n ≤ 10<sup>6</sup>, 1 ≤ cuts.length ≤ min(n − 1, 100), cut positions distinct.`,
    example: `<p>n = 7, cuts = [1, 3, 4, 5] → <b>16</b>: ${H.c('g', 'cut 3 (7), cut 5 (4), cut 1 (3), cut 4 (2)')}. The given order 1, 3, 4, 5 costs 7 + 6 + 4 + 3 = 20.</p>`,
    brute: {
      why: `<p>Try all m! cut orders, or recurse “which cut first” on each piece without memo. The state is just (left boundary, right boundary) — at most (m+2)² pairs — but the plain recursion recomputes each pair many times.</p>`,
      code: { lang: 'java', code: `class Brute {
    int best(int[] c, int i, int j) {                 // cuts strictly between c[i] and c[j]
        if (j - i < 2) return 0;
        int res = Integer.MAX_VALUE;
        for (int k = i + 1; k < j; k++)
            res = Math.min(res, c[j] - c[i] + best(c, i, k) + best(c, k, j));
        return res;
    }
    public int minCost(int n, int[] cuts) {
        int[] c = new int[cuts.length + 2];
        int[] s = cuts.clone(); Arrays.sort(s);
        for (int i = 0; i < s.length; i++) c[i + 1] = s[i];
        c[c.length - 1] = n;
        return best(c, 0, c.length - 1);
    }
}`, alt: [
          { lang: 'python', code: `def min_cost(n, cuts):
    c = [0] + sorted(cuts) + [n]

    def best(i, j):                                   # cuts strictly between c[i] and c[j]
        if j - i < 2:
            return 0
        res = float('inf')
        for k in range(i + 1, j):
            res = min(res, c[j] - c[i] + best(i, k) + best(k, j))
        return res

    return best(0, len(c) - 1)` },
          { lang: 'js', code: `function minCost(n, cuts) {
  const c = [0, ...[...cuts].sort((a, b) => a - b), n];
  function best(i, j) {                               // cuts strictly between c[i] and c[j]
    if (j - i < 2) return 0;
    let res = Infinity;
    for (let k = i + 1; k < j; k++)
      res = Math.min(res, c[j] - c[i] + best(i, k) + best(k, j));
    return res;
  }
  return best(0, c.length - 1);
}` },
          { lang: 'cpp', code: `class Brute {
    int best(vector<int>& c, int i, int j) {          // cuts strictly between c[i] and c[j]
        if (j - i < 2) return 0;
        int res = INT_MAX;
        for (int k = i + 1; k < j; k++)
            res = min(res, c[j] - c[i] + best(c, i, k) + best(c, k, j));
        return res;
    }
public:
    int minCost(int n, vector<int>& cuts) {
        vector<int> c(cuts.size() + 2);
        vector<int> s = cuts;
        sort(s.begin(), s.end());
        for (int i = 0; i < (int)s.size(); i++) c[i + 1] = s[i];
        c[c.size() - 1] = n;
        return best(c, 0, c.size() - 1);
    }
};` }
        ] }
    },
    mcq: { q: 'Why is the state built on cut INDICES (after sorting and adding 0 and n) rather than on stick positions 0..n?', options: ['n can be 10<sup>6</sup> but there are at most 102 boundaries, so (m+2)² states is tiny', 'Positions are not integers', 'Sorting is required by the language', 'Because cuts must happen left to right'], answer: 0, explain: 'Only boundaries that are cut points (plus the ends) can ever be piece ends, so the state space depends on m, not n.' },
    hints: [
      `<p>Hint 1: any piece you ever cut runs between two boundary points from the set {0, cuts…, n}.</p>`,
      `<p>Hint 2: sort cuts, add 0 and n: c[0..m+1]. dp[i][j] = min over k in (i, j) of dp[i][k] + dp[k][j] + (c[j] − c[i]) — k is the FIRST cut made inside the piece.</p>`,
      `<p>Hint 3: dp[i][i+1] = 0 (no cuts inside). Fill by gap j − i from 2 up. Answer dp[0][m+1].</p>`
    ],
    solution: {
      approach: `<p>Interval DP on sorted boundaries. Unlike Burst Balloons, here thinking of the FIRST cut is natural: it costs the full piece length and splits it into two independent pieces.</p>`,
      code: `class Solution {
    public int minCost(int n, int[] cuts) {
        int m = cuts.length;
        int[] c = new int[m + 2];
        int[] s = cuts.clone();
        Arrays.sort(s);
        for (int i = 0; i < m; i++) c[i + 1] = s[i];
        c[m + 1] = n;
        int[][] dp = new int[m + 2][m + 2];
        for (int gap = 2; gap <= m + 1; gap++) {
            for (int i = 0; i + gap <= m + 1; i++) {
                int j = i + gap;
                int best = Integer.MAX_VALUE;
                for (int k = i + 1; k < j; k++) best = Math.min(best, dp[i][k] + dp[k][j]);
                dp[i][j] = best + c[j] - c[i];          // the first cut costs the whole piece
            }
        }
        return dp[0][m + 1];
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def min_cost(self, n, cuts):
        c = [0] + sorted(cuts) + [n]
        m = len(c)
        dp = [[0] * m for _ in range(m)]
        for gap in range(2, m):
            for i in range(m - gap):
                j = i + gap
                dp[i][j] = min(dp[i][k] + dp[k][j] for k in range(i + 1, j)) + c[j] - c[i]
        return dp[0][m - 1]` }, { lang: 'js', code: `function minCost(n, cuts) {
  const c = [0, ...[...cuts].sort((a, b) => a - b), n];   // numeric sort, then add both ends
  const m = c.length;
  const dp = Array.from({ length: m }, () => new Array(m).fill(0));
  for (let gap = 2; gap < m; gap++) {
    for (let i = 0; i + gap < m; i++) {
      const j = i + gap;
      let best = Infinity;
      for (let k = i + 1; k < j; k++) best = Math.min(best, dp[i][k] + dp[k][j]);
      dp[i][j] = best + c[j] - c[i];               // the first cut costs the whole piece
    }
  }
  return dp[0][m - 1];
}` }, { lang: 'cpp', code: `class Solution {
public:
    int minCost(int n, vector<int>& cuts) {
        vector<int> c(cuts);
        sort(c.begin(), c.end());
        c.insert(c.begin(), 0);
        c.push_back(n);                                // boundaries: 0, sorted cuts, n
        int m = c.size();
        vector<vector<int>> dp(m, vector<int>(m, 0));
        for (int gap = 2; gap < m; gap++) {
            for (int i = 0; i + gap < m; i++) {
                int j = i + gap, best = INT_MAX;
                for (int k = i + 1; k < j; k++) best = min(best, dp[i][k] + dp[k][j]);
                dp[i][j] = best + c[j] - c[i];         // the first cut costs the whole piece
            }
        }
        return dp[0][m - 1];
    }
};` }],
      dry: { head: ['piece (boundaries)', 'best first cut', 'dp'], rows: [['0..3 (cut 1)', '1', '3'], ['3..5 (cut 4)', '4', '2'], ['4..7 (cut 5)', '5', '3'], ['3..7 (cuts 4, 5)', '5: 2 + 0 + 4', '6'], ['0..7 (all)', '3: dp(0..3)=3 + dp(3..7)=6 + 7', '<span class="c-g">16</span>']] },
      complexity: `<p>Time O(m³) with m ≤ 100 → ~10<sup>6</sup> steps; space O(m²).</p>`,
      followUps: ['Print the cutting order.', 'Knuth optimisation applies here — why, and what is the new complexity?']
    },
    tests: { sig: 'int int[] -> int', fn: 'minCost', cases: [
      [[7, [1, 3, 4, 5]], 16],
      [[9, [5, 6, 1, 4, 2]], 22],
      [[2, [1]], 2],
      [[10, [5]], 10],
      [[1000000, [1, 999999]], 1999999],
      [[3, [1, 2]], 5],
      [[30, [3, 11, 20, 5, 25, 8, 17]], 90],
      [[1000000, { $range: [10000, 1000000, 10000] }], 6720000],
      [[1000000, { $range: [100, 0, -1] }], 1000672]
    ] }
  });

  practice.push({
    title: 'Binary Tree Cameras', level: 'Hard', tags: ['tree dp', 'greedy', 'dfs'], companies: ['Meta', 'Google', 'Amazon'],
    statement: `<p>Cameras placed on tree nodes monitor the node itself, its parent and its immediate children. Return the minimum number of cameras needed to monitor every node of a binary tree.</p>`,
    constraints: `1 ≤ nodes ≤ 1000, Node.val == 0.`,
    example: `<p>A root with one child that has two children ([0, 0, null, 0, 0]) → <b>1</b> camera on ${H.c('g', 'the middle node')}. A chain of 5 nodes → 2 cameras.</p>`,
    brute: {
      why: `<p>Try every subset of nodes as camera positions and check coverage: 2<sup>N</sup> subsets × O(N) check. Each subtree’s situation only matters through a tiny summary (covered? has camera? needs cover?), which is what tree DP exploits.</p>`,
      code: { lang: 'java', code: `class Brute {
    List<TreeNode> nodes = new ArrayList<>();
    Map<TreeNode, TreeNode> parent = new HashMap<>();
    void collect(TreeNode n, TreeNode p) {
        if (n == null) return;
        nodes.add(n); parent.put(n, p);
        collect(n.left, n); collect(n.right, n);
    }
    public int minCameraCover(TreeNode root) {
        collect(root, null);
        int n = Math.min(nodes.size(), 20), best = Integer.MAX_VALUE;   // only feasible for tiny trees
        for (int mask = 0; mask < (1 << n); mask++) {
            Set<TreeNode> seen = new HashSet<>();
            for (int i = 0; i < n; i++) if ((mask >> i & 1) == 1) {
                TreeNode c = nodes.get(i);
                seen.add(c);
                if (parent.get(c) != null) seen.add(parent.get(c));
                if (c.left != null) seen.add(c.left);
                if (c.right != null) seen.add(c.right);
            }
            if (seen.size() == nodes.size()) best = Math.min(best, Integer.bitCount(mask));
        }
        return best;
    }
}`, alt: [
          { lang: 'python', code: `def min_camera_cover(root):
    nodes, parent = [], {}

    def collect(n, p):
        if n is None:
            return
        nodes.append(n)
        parent[n] = p
        collect(n.left, n)
        collect(n.right, n)

    collect(root, None)
    n = min(len(nodes), 20)                          # only feasible for tiny trees
    best = float('inf')
    for mask in range(1 << n):
        seen = set()
        for i in range(n):
            if mask >> i & 1:
                c = nodes[i]
                seen.add(c)
                if parent[c] is not None:
                    seen.add(parent[c])
                if c.left is not None:
                    seen.add(c.left)
                if c.right is not None:
                    seen.add(c.right)
        if len(seen) == len(nodes):
            best = min(best, bin(mask).count('1'))
    return best` },
          { lang: 'js', code: `function minCameraCover(root) {
  const nodes = [];
  const parent = new Map();
  function collect(n, p) {
    if (n === null) return;
    nodes.push(n);
    parent.set(n, p);
    collect(n.left, n);
    collect(n.right, n);
  }
  collect(root, null);
  const n = Math.min(nodes.length, 20);              // only feasible for tiny trees
  let best = Infinity;
  for (let mask = 0; mask < (1 << n); mask++) {
    const seen = new Set();
    let cams = 0;
    for (let i = 0; i < n; i++) if ((mask >> i & 1) === 1) {
      const c = nodes[i];
      cams++;
      seen.add(c);
      if (parent.get(c) !== null) seen.add(parent.get(c));
      if (c.left !== null) seen.add(c.left);
      if (c.right !== null) seen.add(c.right);
    }
    if (seen.size === nodes.length) best = Math.min(best, cams);
  }
  return best;
}` },
          { lang: 'cpp', code: `class Brute {
    vector<TreeNode*> nodes;
    unordered_map<TreeNode*, TreeNode*> parent;
    void collect(TreeNode* n, TreeNode* p) {
        if (n == nullptr) return;
        nodes.push_back(n);
        parent[n] = p;
        collect(n->left, n);
        collect(n->right, n);
    }
public:
    int minCameraCover(TreeNode* root) {
        collect(root, nullptr);
        int n = min((int)nodes.size(), 20), best = INT_MAX;   // only feasible for tiny trees
        for (int mask = 0; mask < (1 << n); mask++) {
            unordered_set<TreeNode*> seen;
            for (int i = 0; i < n; i++) if ((mask >> i & 1) == 1) {
                TreeNode* c = nodes[i];
                seen.insert(c);
                if (parent[c] != nullptr) seen.insert(parent[c]);
                if (c->left != nullptr) seen.insert(c->left);
                if (c->right != nullptr) seen.insert(c->right);
            }
            if (seen.size() == nodes.size()) best = min(best, __builtin_popcount(mask));
        }
        return best;
    }
};` }
        ] }
    },
    mcq: { q: 'A node reports state 0 = “I am NOT covered, my parent must cover me”. What must the parent do?', options: ['Place a camera on itself', 'Report 0 as well', 'Ignore it — the grandparent will handle it', 'Place a camera on the child'], answer: 0, explain: 'Only the node itself, its children or its parent can cover it. Its children already decided, so the parent must hold a camera.' },
    hints: [
      `<p>Hint 1: leaves should never hold cameras — putting the camera on a leaf’s parent covers at least as much. So decide bottom-up.</p>`,
      `<p>Hint 2: each node returns one of 3 states: 0 = not covered, 1 = has a camera, 2 = covered without a camera. A null child counts as 2 (covered, needs nothing).</p>`,
      `<p>Hint 3: if any child is 0 → place camera, return 1. Else if any child is 1 → return 2. Else return 0. At the end, if the root returns 0, add one more camera.</p>`
    ],
    solution: {
      approach: `<p>Post-order tree DP with three states (a greedy that is provably optimal by the leaf argument). Each node is processed once.</p>`,
      code: `class Solution {
    private int cameras = 0;
    public int minCameraCover(TreeNode root) {
        if (state(root) == 0) cameras++;          // root still uncovered
        return cameras;
    }
    // 0 = not covered, 1 = has camera, 2 = covered (no camera)
    private int state(TreeNode node) {
        if (node == null) return 2;               // empty child needs nothing
        int l = state(node.left), r = state(node.right);
        if (l == 0 || r == 0) { cameras++; return 1; }   // a child needs me
        if (l == 1 || r == 1) return 2;                  // a child's camera covers me
        return 0;                                        // ask my parent
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def min_camera_cover(self, root):
        # Iterative post-order: a chain of 1000 nodes would pass Python's 1000-frame limit.
        # 0 = not covered, 1 = has camera, 2 = covered (no camera)
        order, stack = [], [root]
        while stack:                                   # every parent is listed before its children
            node = stack.pop()
            order.append(node)
            stack += [c for c in (node.left, node.right) if c]
        state = {None: 2}                              # empty child needs nothing
        cams = 0
        for node in reversed(order):                   # children before parents
            l, r = state[node.left], state[node.right]
            if l == 0 or r == 0:
                cams += 1                              # a child needs me
                state[node] = 1
            elif l == 1 or r == 1:
                state[node] = 2                        # a child's camera covers me
            else:
                state[node] = 0                        # ask my parent
        return cams + (state[root] == 0)               # root still uncovered` }, { lang: 'js', code: `function minCameraCover(root) {
  let cameras = 0;
  // 0 = not covered, 1 = has camera, 2 = covered (no camera); depth <= 1000 is safe for recursion
  const state = (node) => {
    if (!node) return 2;                           // empty child needs nothing
    const l = state(node.left), r = state(node.right);
    if (l === 0 || r === 0) { cameras++; return 1; }   // a child needs me
    if (l === 1 || r === 1) return 2;                  // a child's camera covers me
    return 0;                                          // ask my parent
  };
  if (state(root) === 0) cameras++;                // root still uncovered
  return cameras;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int minCameraCover(TreeNode* root) {
        cameras = 0;
        if (state(root) == 0) cameras++;               // root still uncovered
        return cameras;
    }
private:
    int cameras;
    // 0 = not covered, 1 = has camera, 2 = covered (no camera)
    int state(TreeNode* node) {
        if (!node) return 2;                           // empty child needs nothing
        int l = state(node->left), r = state(node->right);
        if (l == 0 || r == 0) { cameras++; return 1; } // a child needs me
        if (l == 1 || r == 1) return 2;                // a child's camera covers me
        return 0;                                      // ask my parent
    }
};` }],
      dry: { head: ['node (post-order)', 'children states', 'returns', 'cameras'], rows: [['leaf A', '2, 2', '0 (needs cover)', '0'], ['leaf B', '2, 2', '0', '0'], ['middle', '0, 0', '1 (camera)', '1'], ['root', '1, 2', '2 (covered)', '<span class="c-g">1</span>']] },
      complexity: `<p>Time O(N), space O(H).</p>`,
      followUps: ['Cameras with different costs per node (needs real 3-state min dp).', 'Cover distance 2 instead of 1.']
    },
    // camTree(root, chain): when chain > 0, the tree is a right-leaning chain of that many nodes (deep-tree test).
    tests: { sig: 'TreeNode int -> int', fn: 'camTree', harness: {
      java: 'class Check { static int camTree(TreeNode root, int chain) { if (chain > 0) { root = null; for (int i = 0; i < chain; i++) root = new TreeNode(0, null, root); } return new Solution().minCameraCover(root); } }',
      python: 'def cam_tree(root, chain):\n    if chain > 0:\n        root = None\n        for _ in range(chain):\n            root = TreeNode(0, None, root)\n    return Solution().min_camera_cover(root)',
      js: 'function camTree(root, chain) { if (chain > 0) { root = null; for (let i = 0; i < chain; i++) root = new TreeNode(0, null, root); } return minCameraCover(root); }',
      cpp: 'int camTree(TreeNode* root, int chain) { if (chain > 0) { root = nullptr; for (int i = 0; i < chain; i++) root = new TreeNode(0, nullptr, root); } return Solution().minCameraCover(root); }' },
      cases: [
        [[[0, 0, null, 0, 0], 0], 1],
        [[[0, 0, null, 0, null, 0, null, null, 0], 0], 2],
        [[[0], 0], 1],
        [[[0, 0], 0], 1],
        [[[0, 0, 0], 0], 1],
        [[[0, 0, 0, 0, 0, 0, 0], 0], 2],
        [[null, 5], 2],
        [[null, 1000], 334],
        [[null, 999], 333]
      ] }
  });

  practice.push({
    title: 'Word Break II (all sentences)', level: 'Hard', tags: ['partition dp', 'backtracking', 'memoization'], companies: ['Google', 'Amazon', 'Meta', 'Uber'],
    statement: `<p>Given a string <code>s</code> and a dictionary, add spaces to form sentences where every word is in the dictionary. Return <b>all</b> such sentences in any order.</p>`,
    constraints: `1 ≤ s.length ≤ 20, 1 ≤ wordDict.length ≤ 1000, word length ≤ 10. Output size ≤ 10<sup>5</sup>.`,
    example: `<p>s = "catsanddog", dict = [cat, cats, and, sand, dog] → ${H.c('g', '["cats and dog", "cat sand dog"]')}. s = "catsandog" → [].</p>`,
    brute: {
      why: `<p>Plain backtracking: at each start try every dictionary prefix and recurse. On "aaaaaaaaaaaaaaaaaaab" with {a, aa, aaa} it explores an exponential tree only to find nothing at the end. Suffix results are recomputed for each way of reaching the same start.</p>`,
      code: { lang: 'java', code: `class Brute {
    public List<String> wordBreak(String s, List<String> wordDict) {
        List<String> res = new ArrayList<>();
        go(s, 0, new HashSet<>(wordDict), new ArrayList<>(), res);
        return res;
    }
    void go(String s, int start, Set<String> dict, List<String> cur, List<String> res) {
        if (start == s.length()) { res.add(String.join(" ", cur)); return; }
        for (int end = start + 1; end <= s.length(); end++) {
            String w = s.substring(start, end);
            if (dict.contains(w)) { cur.add(w); go(s, end, dict, cur, res); cur.remove(cur.size() - 1); }
        }
    }
}`, alt: [
          { lang: 'python', code: `def word_break(s, word_dict):
    words = set(word_dict)
    res = []

    def go(start, cur):
        if start == len(s):
            res.append(" ".join(cur))
            return
        for end in range(start + 1, len(s) + 1):
            w = s[start:end]
            if w in words:
                cur.append(w)
                go(end, cur)
                cur.pop()

    go(0, [])
    return res` },
          { lang: 'js', code: `function wordBreak(s, wordDict) {
  const dict = new Set(wordDict);
  const res = [];
  function go(start, cur) {
    if (start === s.length) { res.push(cur.join(" ")); return; }
    for (let end = start + 1; end <= s.length; end++) {
      const w = s.substring(start, end);
      if (dict.has(w)) { cur.push(w); go(end, cur); cur.pop(); }
    }
  }
  go(0, []);
  return res;
}` },
          { lang: 'cpp', code: `class Brute {
    void go(const string& s, int start, unordered_set<string>& dict, vector<string>& cur, vector<string>& res) {
        if (start == (int)s.size()) {
            string line;
            for (int i = 0; i < (int)cur.size(); i++) line += (i ? " " : "") + cur[i];
            res.push_back(line);
            return;
        }
        for (int end = start + 1; end <= (int)s.size(); end++) {
            string w = s.substr(start, end - start);
            if (dict.count(w)) { cur.push_back(w); go(s, end, dict, cur, res); cur.pop_back(); }
        }
    }
public:
    vector<string> wordBreak(string s, vector<string>& wordDict) {
        vector<string> res, cur;
        unordered_set<string> dict(wordDict.begin(), wordDict.end());
        go(s, 0, dict, cur, res);
        return res;
    }
};` }
        ] }
    },
    mcq: { q: 'What does memoising on the start index store?', options: ['The list of all sentences that complete the suffix s[start..]', 'Only whether the suffix can be completed', 'The longest word starting at start', 'The number of words used so far'], answer: 0, explain: 'All sentences for a suffix are the same no matter how we reached that start, so we compute them once and prepend the current word for each caller.' },
    hints: [
      `<p>Hint 1: the sentences for suffix s[i..] do not depend on how you reached i — cache them by i.</p>`,
      `<p>Hint 2: solve(i) = for each word w with s.startsWith(w, i): for each sentence t in solve(i + |w|): w + (t empty ? "" : " " + t).</p>`,
      `<p>Hint 3: solve(n) = [""] (one empty completion). Optionally run the boolean Word Break dp first to skip impossible suffixes entirely.</p>`
    ],
    solution: {
      approach: `<p>Top-down partition DP with a memo from start index to its list of completions. Dead suffixes return an empty list once and are never explored again; live suffixes are built once and shared.</p>`,
      code: `class Solution {
    public List<String> wordBreak(String s, List<String> wordDict) {
        return solve(s, 0, new HashSet<>(wordDict), new HashMap<>());
    }
    private List<String> solve(String s, int start, Set<String> dict, Map<Integer, List<String>> memo) {
        if (memo.containsKey(start)) return memo.get(start);
        List<String> res = new ArrayList<>();
        if (start == s.length()) { res.add(""); memo.put(start, res); return res; }
        for (int end = start + 1; end <= s.length() && end - start <= 10; end++) {
            String w = s.substring(start, end);
            if (!dict.contains(w)) continue;
            for (String rest : solve(s, end, dict, memo))
                res.add(rest.isEmpty() ? w : w + " " + rest);
        }
        memo.put(start, res);
        return res;
    }
}`,
      alt: [{ lang: 'python', code: `from functools import lru_cache

class Solution:
    def word_break(self, s, wordDict):
        words = set(wordDict)
        @lru_cache(maxsize=None)
        def solve(i):
            if i == len(s):
                return [""]
            out = []
            for j in range(i + 1, min(len(s), i + 10) + 1):
                w = s[i:j]
                if w in words:
                    for rest in solve(j):
                        out.append(w + (" " + rest if rest else ""))
            return out
        return solve(0)` }, { lang: 'js', code: `function wordBreak(s, wordDict) {
  const dict = new Set(wordDict), memo = new Map();   // start index -> all completions of s[start..]
  const solve = (start) => {
    if (memo.has(start)) return memo.get(start);
    const res = [];
    if (start === s.length) res.push('');
    for (let end = start + 1; end <= s.length && end - start <= 10; end++) {
      const w = s.slice(start, end);
      if (!dict.has(w)) continue;
      for (const rest of solve(end)) res.push(rest ? w + ' ' + rest : w);
    }
    memo.set(start, res);
    return res;
  };
  return solve(0);
}` }, { lang: 'cpp', code: `class Solution {
public:
    vector<string> wordBreak(string s, vector<string>& wordDict) {
        unordered_set<string> dict(wordDict.begin(), wordDict.end());
        unordered_map<int, vector<string>> memo;        // start index -> all completions of s[start..]
        return solve(s, 0, dict, memo);
    }
private:
    vector<string>& solve(const string& s, int start, const unordered_set<string>& dict, unordered_map<int, vector<string>>& memo) {
        auto it = memo.find(start);
        if (it != memo.end()) return it->second;
        vector<string> res;
        if (start == (int)s.size()) res.push_back("");
        for (int end = start + 1; end <= (int)s.size() && end - start <= 10; end++) {
            string w = s.substr(start, end - start);
            if (!dict.count(w)) continue;
            for (const string& rest : solve(s, end, dict, memo)) res.push_back(rest.empty() ? w : w + " " + rest);
        }
        return memo[start] = move(res);
    }
};` }],
      dry: { head: ['start', 'words found', 'completions'], rows: [['7', 'dog', '["dog"]'], ['4', 'and', '["and dog"]'], ['3', 'sand', '["sand dog"]'], ['0', 'cat (→3), cats (→4)', '<span class="c-g">["cat sand dog", "cats and dog"]</span>']] },
      complexity: `<p>Time O(n · L + output size × average sentence length); memo holds at most n + 1 lists. Worst case is exponential because the output is.</p>`,
      followUps: ['Return only the count (mod 10<sup>9</sup>+7).', 'Use a trie to avoid substring creation.']
    },
    // Sentences may come in any order; each must rebuild s from dictionary words, with no repeats.
    // A number as the expected value means "this many sentences" (used for the 10946-sentence case).
    tests: { sig: 'string list<string> -> list<string>', fn: 'wordBreak',
      check: '(args, out, exp) => { const [s, words] = args, dict = new Set(words); if (!Array.isArray(out) || new Set(out).size !== out.length) return false; if (!out.every((t) => typeof t === "string" && t.split(" ").join("") === s && t.split(" ").every((w) => dict.has(w)))) return false; if (typeof exp === "number") return out.length === exp; return JSON.stringify([...out].sort()) === JSON.stringify([...exp].sort()); }',
      cases: [
        [['catsanddog', ['cat', 'cats', 'and', 'sand', 'dog']], ['cats and dog', 'cat sand dog']],
        [['pineapplepenapple', ['apple', 'pen', 'applepen', 'pine', 'pineapple']], ['pine apple pen apple', 'pineapple pen apple', 'pine applepen apple']],
        [['catsandog', ['cats', 'dog', 'sand', 'and', 'cat']], []],
        [['a', ['a']], ['a']],
        [['aaaa', ['a', 'aa']], ['a a a a', 'aa a a', 'a aa a', 'a a aa', 'aa aa']],
        [['abcdefghijabcdefghij', ['abcdefghij', 'abcde', 'fghij']], ['abcdefghij abcdefghij', 'abcde fghij abcdefghij', 'abcdefghij abcde fghij', 'abcde fghij abcde fghij']],
        [[{ $concat: [{ $rep: 'a', n: 19 }, 'b'] }, ['a', 'aa', 'aaa']], []],
        [[{ $rep: 'a', n: 20 }, ['a', 'aa']], 10946]
      ] }
  });

  practice.push({
    title: 'Regular Expression Matching', level: 'Hard', tags: ['string dp', 'recursion'], companies: ['Google', 'Meta', 'Amazon', 'Microsoft'],
    statement: `<p>Implement matching of string <code>s</code> against pattern <code>p</code> supporting <code>.</code> (any single character) and <code>*</code> (zero or more of the <b>preceding</b> element). The match must cover the <b>entire</b> string.</p>`,
    constraints: `1 ≤ s.length ≤ 20, 1 ≤ p.length ≤ 20, s lowercase letters, p lowercase letters plus . and *; every * has a valid preceding element.`,
    example: `<p>s = "aa", p = "a" → false. s = "aa", p = ${H.c('b', '"a*"')} → <b>true</b>. s = "ab", p = ".*" → true. s = "aab", p = ${H.c('b', '"c*a*b"')} → <b>true</b> (c* matches zero c’s, a* matches "aa").</p>`,
    brute: {
      why: `<p>Plain recursion: match the first character, and for <code>x*</code> branch into “skip x* entirely” or “consume one char and stay on x*”. Without memo, patterns like "a*a*a*a*b" against "aaaaaaaa" branch exponentially, revisiting the same (i, j) pairs.</p>`,
      code: { lang: 'java', code: `class Brute {
    public boolean isMatch(String s, String p) {
        if (p.isEmpty()) return s.isEmpty();
        boolean first = !s.isEmpty() && (p.charAt(0) == s.charAt(0) || p.charAt(0) == '.');
        if (p.length() >= 2 && p.charAt(1) == '*') {
            return isMatch(s, p.substring(2))                  // x* matches zero chars
                || (first && isMatch(s.substring(1), p));     // x* eats one char, stays
        }
        return first && isMatch(s.substring(1), p.substring(1));
    }
}`, alt: [
          { lang: 'python', code: `def is_match(s, p):
    if not p:
        return not s
    first = bool(s) and (p[0] == s[0] or p[0] == '.')
    if len(p) >= 2 and p[1] == '*':
        return (is_match(s, p[2:])                    # x* matches zero chars
                or (first and is_match(s[1:], p)))    # x* eats one char, stays
    return first and is_match(s[1:], p[1:])` },
          { lang: 'js', code: `function isMatch(s, p) {
  if (p.length === 0) return s.length === 0;
  const first = s.length > 0 && (p[0] === s[0] || p[0] === '.');
  if (p.length >= 2 && p[1] === '*') {
    return isMatch(s, p.substring(2))                 // x* matches zero chars
        || (first && isMatch(s.substring(1), p));     // x* eats one char, stays
  }
  return first && isMatch(s.substring(1), p.substring(1));
}` },
          { lang: 'cpp', code: `bool isMatch(string s, string p) {
    if (p.empty()) return s.empty();
    bool first = !s.empty() && (p[0] == s[0] || p[0] == '.');
    if (p.size() >= 2 && p[1] == '*') {
        return isMatch(s, p.substr(2))                // x* matches zero chars
            || (first && isMatch(s.substr(1), p));    // x* eats one char, stays
    }
    return first && isMatch(s.substr(1), p.substr(1));
}` }
        ] }
    },
    mcq: { q: 'p[j−1] == \'*\'. Which two options define dp[i][j] (prefixes s[0..i), p[0..j))?', options: ['dp[i][j−2] (zero copies) OR (s[i−1] matches p[j−2] AND dp[i−1][j])', 'dp[i][j−1] OR dp[i−1][j]', 'dp[i−1][j−1] only', 'dp[i][j−2] AND dp[i−1][j]'], answer: 0, explain: 'In regex the star belongs to the previous element: drop the pair "x*" (j−2), or, if s’s last char matches x, let the star eat it and stay at j. dp[i][j−1] OR dp[i−1][j] is the WILDCARD rule.' },
    hints: [
      `<p>Hint 1: treat “x*” as one unit. It either matches nothing, or matches one more character of s and remains available.</p>`,
      `<p>Hint 2: dp[i][j] over prefixes; dp[0][0] = true; dp[0][j] = p[j−1]=='*' &amp;&amp; dp[0][j−2] (things like a*b*c* match the empty string).</p>`,
      `<p>Hint 3: if p[j−1] is a letter or '.', dp[i][j] = match(s[i−1], p[j−1]) &amp;&amp; dp[i−1][j−1]. If '*': dp[i][j−2] || (match(s[i−1], p[j−2]) &amp;&amp; dp[i−1][j]). Answer dp[m][n].</p>`
    ],
    solution: {
      approach: `<p>Bottom-up boolean grid over prefixes with a special two-step-back rule for the star. Each cell is O(1), so the whole thing is O(m·n).</p>`,
      code: `class Solution {
    public boolean isMatch(String s, String p) {
        int m = s.length(), n = p.length();
        boolean[][] dp = new boolean[m + 1][n + 1];
        dp[0][0] = true;
        for (int j = 2; j <= n; j++)                       // patterns like a*b* match ""
            dp[0][j] = p.charAt(j - 1) == '*' && dp[0][j - 2];
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                char pc = p.charAt(j - 1);
                if (pc == '*') {
                    char prev = p.charAt(j - 2);
                    boolean eat = (prev == '.' || prev == s.charAt(i - 1)) && dp[i - 1][j];
                    dp[i][j] = dp[i][j - 2] || eat;         // zero copies, or one more copy
                } else {
                    dp[i][j] = (pc == '.' || pc == s.charAt(i - 1)) && dp[i - 1][j - 1];
                }
            }
        }
        return dp[m][n];
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def is_match(self, s, p):
        m, n = len(s), len(p)
        dp = [[False] * (n + 1) for _ in range(m + 1)]
        dp[0][0] = True
        for j in range(2, n + 1):
            dp[0][j] = p[j - 1] == '*' and dp[0][j - 2]
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if p[j - 1] == '*':
                    dp[i][j] = dp[i][j - 2] or (p[j - 2] in ('.', s[i - 1]) and dp[i - 1][j])
                else:
                    dp[i][j] = p[j - 1] in ('.', s[i - 1]) and dp[i - 1][j - 1]
        return dp[m][n]` }, { lang: 'js', code: `function isMatch(s, p) {
  const m = s.length, n = p.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(false));
  dp[0][0] = true;
  for (let j = 2; j <= n; j++) dp[0][j] = p[j - 1] === '*' && dp[0][j - 2];   // a*b* matches ""
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const pc = p[j - 1];
      if (pc === '*') {
        const prev = p[j - 2];
        // zero copies of prev, or prev eats s[i-1] and the star stays
        dp[i][j] = dp[i][j - 2] || ((prev === '.' || prev === s[i - 1]) && dp[i - 1][j]);
      } else {
        dp[i][j] = (pc === '.' || pc === s[i - 1]) && dp[i - 1][j - 1];
      }
    }
  }
  return dp[m][n];
}` }, { lang: 'cpp', code: `class Solution {
public:
    bool isMatch(string s, string p) {
        int m = s.size(), n = p.size();
        vector<vector<bool>> dp(m + 1, vector<bool>(n + 1, false));
        dp[0][0] = true;
        for (int j = 2; j <= n; j++) dp[0][j] = p[j - 1] == '*' && dp[0][j - 2];   // a*b* matches ""
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                char pc = p[j - 1];
                if (pc == '*') {
                    char prev = p[j - 2];
                    // zero copies of prev, or prev eats s[i-1] and the star stays
                    dp[i][j] = dp[i][j - 2] || ((prev == '.' || prev == s[i - 1]) && dp[i - 1][j]);
                } else {
                    dp[i][j] = (pc == '.' || pc == s[i - 1]) && dp[i - 1][j - 1];
                }
            }
        }
        return dp[m][n];
    }
};` }],
      dry: { head: ['s prefix', 'p = "c*a*b": ""', 'c', 'c*', 'c*a', 'c*a*', 'c*a*b'], rows: [['""', 'T', 'F', 'T', 'F', 'T', 'F'], ['a', 'F', 'F', 'F', 'T', 'T', 'F'], ['aa', 'F', 'F', 'F', 'F', 'T', 'F'], ['aab', 'F', 'F', 'F', 'F', 'F', '<span class="c-g">T</span>']] },
      complexity: `<p>Time O(m·n), space O(m·n) (two rows suffice).</p>`,
      followUps: ['Add + (one or more).', 'Wildcard matching (LC 44) — compare the transitions.', 'Why do real regex engines use automata (Thompson NFA) instead of backtracking?']
    },
    tests: { sig: 'string string -> bool', fn: 'isMatch', cases: [
      [['aa', 'a'], false],
      [['aa', 'a*'], true],
      [['ab', '.*'], true],
      [['aab', 'c*a*b'], true],
      [['mississippi', 'mis*is*p*.'], false],
      [['a', 'ab*'], true],
      [['ab', '.*c'], false],
      [['aaa', 'a*a'], true],
      [['abcd', 'd*'], false],
      [['a', '.'], true],
      [['aaaaaaaaaaaaaaaaaaab', 'a*a*a*a*a*a*a*a*a*c'], false],
      [['aaaaaaaaaaaaaaaaaaaa', 'a*a*a*a*a*a*a*a*a*a'], true]
    ] }
  });

  // ================= QUIZ =================
  quiz.push(
    { q: 'In the O(N log N) LIS algorithm, what does <code>tails[k]</code> store?', options: ['The smallest possible last value of an increasing subsequence of length k+1', 'The k-th element of the actual LIS', 'The number of subsequences of length k+1', 'The largest value seen so far'], answer: 0, explain: 'tails is a list of “cheapest endings” per length. It has the right length but is generally not itself a valid subsequence.' },
    { q: 'You need the longest NON-DECREASING subsequence. Which binary search do you use on tails?', options: ['Upper bound (first tail strictly greater than x)', 'Lower bound (first tail ≥ x)', 'Exact-match search', 'No binary search — use O(N²)'], answer: 0, explain: 'Equal values may extend a run, so x should replace only a tail that is strictly bigger; equal tails stay and x can be appended after them.' },
    { q: 'For Word Break, dp[0] = true because…', options: ['The empty prefix can always be segmented (using zero words)', 'The first letter is always a word', 'Boolean arrays default to true', 'It marks the end of the string'], answer: 0, explain: 'It is the base case that lets dp[i] become true when s[0..i) is itself a dictionary word: dp[0] && dict.contains(s[0..i)).' },
    { q: 'Palindrome min cuts with a pal[j][i] table costs…', options: ['O(N²) time', 'O(N³) time', 'O(N log N) time', 'O(2<sup>N</sup>) time'], answer: 0, explain: 'There are O(N²) (j, i) pairs; each palindrome check is O(1) from pal[j+1][i−1], and each cuts update is O(1).' },
    { q: 'In Burst Balloons, why do we choose the balloon burst LAST in a range?', options: ['It stays as a wall while the rest burst, so the left and right sub-ranges are independent', 'Because the last balloon always has the largest value', 'It reduces the complexity to O(N²)', 'Because the first balloon has no neighbours'], answer: 0, explain: 'If we chose the first balloon, its removal would make its two neighbours adjacent and the sub-problems would interact. The last balloon keeps both sides separated.' },
    { q: 'Interval DP tables are usually filled…', options: ['By increasing range length', 'Row by row from i = 0 with j increasing', 'In random order with memoisation only', 'From the top-right corner'], answer: 0, explain: 'dp[i][j] needs shorter ranges inside [i..j]; filling by length guarantees they are ready. (i descending, j ascending also works.)' },
    { q: 'In Binary Tree Maximum Path Sum, what does the DFS return to the parent?', options: ['node.val + max(0, leftGain, rightGain) — a one-sided path', 'node.val + leftGain + rightGain', 'The global best so far', 'The height of the subtree'], answer: 0, explain: 'The parent can only extend a path that goes down one side; the two-sided (bent) sum is recorded in the global answer but not returned.' },
    { q: 'House Robber III returns [rob, skip] per node. What is skip?', options: ['max(L.rob, L.skip) + max(R.rob, R.skip)', 'L.skip + R.skip', 'L.rob + R.rob', 'node.val + L.skip + R.skip'], answer: 0, explain: 'If the node is skipped, each child is free to be robbed or not, so each contributes its best value.' },
    { q: 'Stock with cooldown: from which mode can you BUY today?', options: ['rest', 'sold', 'hold', 'any mode'], answer: 0, explain: 'sold means you sold yesterday → today is cooldown. hold already owns a share. Only rest may buy.' },
    { q: 'At most k transactions with k ≥ n/2 should be solved…', options: ['Greedily by summing every positive day-to-day rise', 'With an n×k table anyway', 'By sorting prices', 'With binary search on k'], answer: 0, explain: 'At most ⌊n/2⌋ disjoint trades exist, so the k limit cannot bind — it is the unlimited version, O(n).' },
    { q: 'Distinct Subsequences with ONE dp row: in which direction must j run?', options: ['Right to left (n down to 1)', 'Left to right (1 up to n)', 'Either direction', 'Only from the middle outwards'], answer: 0, explain: 'dp[j] += dp[j−1] needs dp[j−1] from the PREVIOUS row. Going right-to-left updates dp[j] before dp[j−1] is overwritten.' },
    { q: 'Minimum insertions to make a string a palindrome equals…', options: ['n − LPS(s)', 'n − LCS(s, s)', 'Number of distinct characters', 'Longest palindromic substring length'], answer: 0, explain: 'Characters outside a longest palindromic subsequence each need a mirror partner; characters inside it are already paired.' },
    { q: 'Regex: p = "a*" and s = "". What is the result and why?', options: ['true — "a*" can match zero a’s (dp[0][2] = dp[0][0])', 'false — the pattern has a letter', 'true — * matches anything', 'false — empty strings never match'], answer: 0, explain: 'In regex, x* means zero or more of x; dropping the "a*" pair leaves the empty pattern, which matches the empty string.' }
  );

  // ================= INTERVIEW Q&A =================
  interview.push(
    { q: 'Walk me through LIS in O(N log N). Why is it correct?', level: 'A', a: `<p>Keep <code>tails</code>, where tails[k] is the smallest possible ending value of an increasing subsequence of length k+1. For each x, binary search the first tail ≥ x: if none, append (a longer run exists); otherwise replace it (same length, smaller ending). Correctness: tails is strictly increasing (a shorter run inside a longer one ends lower), so binary search is valid; replacing a tail by a smaller value only adds options for future extensions, never removes any. The length of tails at the end is the LIS length. To reconstruct, store per index the index it extended (parent) and the index currently holding each tail.</p>`, followUps: ['How do you get the actual subsequence?', 'How would you count the LIS in O(N log N)?', 'Why can’t the tails trick maximise the SUM of an increasing subsequence?'] },
    { q: 'How do you solve Russian Doll Envelopes, and why the strange sort order?', level: 'A', a: `<p>Sort by width ascending and, for equal widths, by height <b>descending</b>; then run strict LIS on heights in O(N log N). Sorting by width makes the width condition automatic for any increasing subsequence of heights except among equal widths. Ordering equal widths by height descending makes their heights non-increasing, so a strictly increasing subsequence can pick at most one of them — exactly the rule that equal widths cannot nest. With ascending ties we would wrongly nest [6,4] inside [6,7].</p>`, followUps: ['What about 3D boxes?', 'What if rotation were allowed?'] },
    { q: 'Explain the Word Break DP and its real complexity.', level: 'I', a: `<p>dp[i] says whether the prefix s[0..i) can be split into words; dp[0] = true. dp[i] = OR over j of dp[j] AND s[j..i) in the dictionary. Naively that is O(N²) pairs, but each substring + hash lookup costs O(L), so it is really O(N²·L). Limiting j to i − maxWordLen gives O(N·maxLen²); walking a trie forward from each reachable start gives O(N·maxLen) with no substring allocation. Every valid split has a unique last word, which is why OR (or SUM for counting) over the last piece is exhaustive and not double counting.</p>`, followUps: ['How would you return all sentences efficiently?', 'How would you handle a dictionary of 10<sup>6</sup> words?', 'How is this related to tokenisers?'] },
    { q: 'How do you get minimum palindrome cuts in O(N²) — and can you do O(N) memory?', level: 'A', a: `<p>Build pal[j][i] (s[j..i] is a palindrome) using pal[j+1][i−1], and cuts[i] = 0 if s[0..i] is a palindrome else min over palindromic last pieces s[j..i] of cuts[j−1] + 1. Both fill in the same double loop, O(N²) time and memory. For O(N) memory, expand around each of the 2N−1 centres: whenever s[l..r] is a palindrome, update cuts[r+1] = min(cuts[r+1], cuts[l] + 1) using a shifted cuts array where cuts[0] = −1. Same O(N²) time, but only one array.</p>`, followUps: ['Why does listing all partitions take exponential time?', 'Could Manacher’s algorithm make min-cut linear?'] },
    { q: 'What is interval DP and how do you recognise it?', level: 'A', a: `<p>Interval DP has states dp[i][j] for contiguous ranges and transitions that split a range at k (or pick the element handled last), combining dp[i][k] and dp[k+1][j] with a cost that depends on i, k, j. Signals: “merge adjacent”, “burst/remove and neighbours change”, “parenthesise”, “cut at positions”, both ends of a range matter, and N up to a few hundred (O(N³)). Fill by increasing length. Examples: Matrix Chain Multiplication, Burst Balloons, Minimum Score Triangulation, Cut a Stick, Merge Stones, Longest Palindromic Subsequence, Strange Printer.</p>`, followUps: ['When can Knuth optimisation reduce O(N³) to O(N²)?', 'How does Merge Stones with k piles change feasibility?'] },
    { q: 'Derive the Burst Balloons recurrence out loud.', level: 'E', a: `<p>Pad nums with 1 at both ends. Let dp[i][j] be the max coins from bursting only balloons i..j while i−1 and j+1 are still alive. Choose k to be the <b>last</b> balloon burst in [i..j]. Before it bursts, the balloons in [i..k−1] burst with walls i−1 and k, and those in [k+1..j] with walls k and j+1 — independent sub-problems. Finally k bursts between i−1 and j+1: dp[i][j] = max over k of dp[i][k−1] + b[i−1]·b[k]·b[j+1] + dp[k+1][j]. Fill by length, O(N³) time, O(N²) space; answer dp[1][n]. The “first balloon” formulation fails because removing it couples the two sides.</p>`, followUps: ['How would you print the order?', 'Remove Boxes needs an extra dimension — why?'] },
    { q: 'How does tree DP work in House Robber III and why is plain recursion slow?', level: 'I', a: `<p>Post-order DFS returning a pair per node: rob = val + left.skip + right.skip, skip = max(left) + max(right). Each node is visited once, so O(N) time and O(H) stack. The naive recursion “rob node + grandchildren vs children” evaluates each grandchild from both its parent and grandparent, and that duplication compounds exponentially with depth. Returning both choices lets the parent decide without recomputation — it is memoisation built into the return value.</p>`, followUps: ['Generalise to an N-ary tree given as edges.', 'What if robbing a node also forbids its grandchildren?'] },
    { q: 'Binary Tree Maximum Path Sum: what are the classic bugs?', level: 'A', a: `<p>(1) Initialising the global best to 0 — an all-negative tree must return its largest single value, so start at −∞ (<code>Integer.MIN_VALUE</code>, <code>float('-inf')</code>, <code>-Infinity</code>, <code>INT_MIN</code>). (2) Returning node + left + right to the parent — that creates a branched “path”; return node + max(left, right). (3) Not clipping negative gains with max(0, gain), which forces bad branches into the path. (4) Assuming the path passes through the root. (5) Recursion depth on skewed trees of 10<sup>5</sup> nodes — use an iterative post-order, or a bigger stack (a thread with a large stack in Java; <code>sys.setrecursionlimit</code> plus <code>threading.stack_size</code> in Python).</p>`, followUps: ['Return the path itself.', 'What if the path must start at a leaf and end at a leaf?'] },
    { q: 'Design the state machine for Buy/Sell Stock with cooldown and fee together.', level: 'A', a: `<p>Modes after each day: hold (own a share), sold (sold today, cooldown tomorrow), rest (free). Transitions from yesterday’s values: hold = max(hold, rest − p); sold = hold + p − fee; rest = max(rest, sold_yesterday). Answer max(sold, rest). The fee is charged once per round trip (on the sell arrow), and the cooldown is enforced by allowing buys only from rest. Initialise hold = −∞, sold = −∞ (or 0), rest = 0. O(N) time, O(1) space. Use temporaries to avoid reading today’s values.</p>`, followUps: ['Cooldown of c days?', 'At most k transactions plus cooldown — state size?'] },
    { q: 'Why is sell[k] the answer for “at most k” transactions even if fewer trades are optimal?', level: 'A', a: `<p>Because a transaction can be “wasted” for free: buying and selling on the same day changes cash by −p + p = 0. So any schedule with fewer than k trades can be padded to exactly k without loss, making sell[j] non-decreasing in j, and sell[k] equals the best over all j ≤ k. Also mention the k ≥ n/2 shortcut (unlimited trades, greedy sum of rises) to avoid O(n·k) when k is huge, and the O(n log n) / WQS-binary-search approaches for very large n and k.</p>`, followUps: ['What is the “Aliens trick” in one sentence?', 'How do you also return the trades?'] },
    { q: 'Compare LCS, Edit Distance and Distinct Subsequences transitions.', level: 'I', a: `<p>All use dp[i][j] over prefixes. LCS: match → diag + 1; else max(up, left). Edit distance: match → diag; else 1 + min(diag (replace), up (delete), left (insert)). Distinct Subsequences counts ways t appears in s: always up (skip s[i−1]); on match also add diag (use it). Base rows differ: LCS/edit have 0/i/j borders, Distinct Subsequences has dp[i][0] = 1. One-row versions need the right loop direction: Distinct Subsequences runs j right-to-left so dp[j−1] is still the previous row.</p>`, followUps: ['How would you get O(n) memory and still reconstruct the LCS?', 'Why can’t LCS be done in strongly sub-quadratic time?'] },
    { q: 'Regex vs wildcard matching — what is different in the DP?', level: 'E', a: `<p>Wildcard ‘*’ stands alone and matches any sequence: dp[i][j] = dp[i][j−1] (empty) OR dp[i−1][j] (eat one char). Regex ‘*’ modifies the previous element x: dp[i][j] = dp[i][j−2] (zero copies of x) OR (s[i−1] matches x AND dp[i−1][j]) (one more copy). Base rows differ too: wildcard dp[0][j] is true for leading stars; regex dp[0][j] is true for patterns like a*b*c*. Mixing these rules is the most common bug. Production regex engines avoid exponential backtracking with automata (Thompson NFA / RE2) — the DP is the polynomial alternative.</p>`, followUps: ['Add support for +.', 'Give an input that makes naive backtracking regex exponential.'] },
    { q: 'You see a new DP problem in an interview. What is your process?', level: 'E', a: `<p>(1) Restate it and find the shape: tree? modes on a timeline? two sequences? ranges with merges? cutting a sequence? subsequence with compatibility? (2) Write the brute-force recursion and look for repeating arguments — those become the state. (3) Say the state sentence (“dp[i][j] is …”). (4) Write the transition from the last decision (last piece, last balloon, last character, yesterday’s mode). (5) Base cases and fill order. (6) Check states × transition cost against constraints. (7) Dry-run a tiny example, then optimise memory if asked. With AI tools available, I also generate a brute force + random tests to cross-check.</p>`, followUps: ['How do you decide between top-down and bottom-up?', 'How do you know when it is greedy instead?'] }
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
    id: 'dsa18',
    title: 'Dynamic Programming II',
    intro: `<p>DP I taught you the basic moves: define a state, write a recurrence, fill a table. <b>DP II is about shapes.</b> Most hard DP interview questions are one of six shapes wearing a costume: the <b>LIS</b> “best run ending here” array, <b>partition</b> DP that cuts a string into good pieces, <b>interval</b> DP that solves every range from short to long, <b>tree</b> DP where children report to parents, <b>state-machine</b> DP that tracks modes like “holding a stock” or “in cooldown”, and the <b>two-string grid</b> that compares sequences letter by letter.</p>
      <p>For each shape you get an everyday analogy, a step-by-step visualizer you can feed your own input, worked examples, the clue words that give the shape away in an interview, a deep dive (proofs, speed-ups, production uses) and how AI tools change the way you work with it. Guided problems walk you from brute force to the optimal solution with dry runs, and the practice set climbs from easy warm-ups to Burst Balloons, Regex Matching and Stock IV.</p>`,
    goals: [
      'Solve Longest Increasing Subsequence in O(N²) and O(N log N), rebuild the actual sequence, and adapt it to counting, non-strict and 2D (envelopes) variants',
      'Write prefix/partition DP for Word Break (I &amp; II) and Palindrome Partitioning (all partitions and minimum cuts) with the right complexity',
      'Design interval DP (Matrix Chain Multiplication, Burst Balloons, Cut a Stick) using split points or the “last action” trick and fill the table in a valid order',
      'Solve tree DP problems in O(N) by returning tuples (House Robber III) or “return one side, record both sides” gains (Maximum Path Sum)',
      'Draw a state machine for any Buy/Sell Stock variant (cooldown, fee, k transactions) and turn it into O(1)/O(k)-memory code',
      'Recognise the two-string grid family (LPS, SCS, Distinct Subsequences, wildcard/regex) and pick the correct transitions and loop directions'
    ],
    prereqs: `DSA 17 (Dynamic Programming I: memoisation vs tabulation, knapsack, LCS, edit distance), DSA 10 (Binary Search, for the O(N log N) LIS), DSA 11 (Recursion &amp; Backtracking, for listing partitions) and DSA 14 (Trees, for post-order DFS).`,
    hours: 16,
    langNotes: {
      java: `<p><b>Java:</b> <code>int</code> overflow wraps silently. The "minus infinity" sentinel <code>Integer.MIN_VALUE</code> in the stock state machines breaks the moment you subtract a price from it, so use a large negative such as <code>-1_000_000_000</code> or guard the transition. The counting dp for Distinct Subsequences may pass 2<sup>31</sup> in middle cells, but only additions are used, so wrap-around is harmless there; use <code>long</code> when a problem asks for a count modulo 10<sup>9</sup>+7. Recursion holds roughly 10<sup>4</sup> frames on the default thread stack, so skewed-tree DP uses an explicit stack. Do not subtract values in a comparator (Russian Doll): use <code>Integer.compare</code>. <code>Arrays.binarySearch</code> returns <code>-(insertion point) - 1</code> and any match on duplicates, so hand-write the lower-bound loop for the LIS tails array. Use <code>HashSet</code> for the Word Break dictionary and <code>new int[n][m]</code> tables; <code>Arrays.fill</code> only fills one row at a time.</p>`,
      python: `<p><b>Python:</b> integers never overflow, and <code>float('-inf')</code> is a safe sentinel for the stock states. Recursion stops at 1,000 frames: memoised top-down is fine for short strings (Word Break II, Palindrome Partitioning), but a skewed tree needs an iterative post-order or <code>sys.setrecursionlimit</code> together with <code>threading.stack_size</code>. <code>@lru_cache(maxsize=None)</code> gives memoisation in one line, but the cache keys must be hashable (tuples, not lists). Use <code>bisect_left</code> for the LIS tails array (the strict version); the Russian Doll sort key is <code>(w, -h)</code>. Pure-Python triple loops (interval DP at N = 500) are slow, so keep the inner work in <code>min(...)</code> / <code>max(...)</code> over a generator or slice. Build 2-D tables as <code>[[0] * m for _ in range(n)]</code>, never <code>[[0] * m] * n</code>, which aliases one row.</p>`,
      js: `<p><b>JavaScript:</b> <code>Number</code> is exact only up to 2<sup>53</sup>, so the Distinct Subsequences middle cells can lose precision; store them in an <code>Int32Array</code> (or add with <code>| 0</code>) because only the final 32-bit answer matters, and use <code>BigInt</code> if an exact large count is required. <code>-Infinity</code> is a safe sentinel for the stock states. Node's default stack holds roughly 10<sup>4</sup> frames, so skewed-tree DP uses an array as an explicit stack. <code>sort()</code> compares as strings unless you pass a comparator: write <code>(a, b) =&gt; a[0] - b[0] || b[1] - a[1]</code> for the envelopes. There is no built-in <code>bisect</code>, so write the lower-bound loop for LIS. Make 2-D tables with <code>Array.from({ length: n }, () =&gt; new Array(m).fill(0))</code>, not <code>new Array(n).fill(new Array(m))</code>, which shares one row. A <code>Set</code> makes the Word Break dictionary lookup O(1) on average.</p>`,
      cpp: `<p><b>C++:</b> signed overflow is undefined behaviour. <code>INT_MIN</code> as a "minus infinity" sentinel overflows as soon as you subtract a price, so use <code>INT_MIN / 2</code> or <code>-1e9</code>; use <code>long long</code> for big sums and counts, and <code>unsigned int</code> for the Distinct Subsequences counts whose middle cells may exceed 2<sup>31</sup>. The default stack is about 8 MB, enough for most recursive DP but not guaranteed for a 10<sup>5</sup>-deep skewed tree, so those solutions use an explicit <code>vector</code> stack. <code>lower_bound</code> returns the LIS insertion point directly. A comparator must be a strict weak ordering: sort envelopes with <code>a[0] != b[0] ? a[0] &lt; b[0] : a[1] &gt; b[1]</code>. Use <code>unordered_set&lt;string&gt;</code> for the Word Break dictionary (O(1) average; <code>set</code> is O(log n)) and <code>vector&lt;vector&lt;int&gt;&gt;(n, vector&lt;int&gt;(m))</code> for tables.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
