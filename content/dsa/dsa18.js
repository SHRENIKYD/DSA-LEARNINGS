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
    code: [`
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
      }`, `
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
      }`, { lang: 'python', run: true, title: 'Both versions in Python (runnable)', code: `from bisect import bisect_left

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
    codeTitle: ['O(N²) with reconstruction (Java)', 'O(N log N) with reconstruction (Java)', 'Python, runnable'],
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
        code: `// non-decreasing LIS: the only change is "<=" (upper bound: first tail STRICTLY greater than x)
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
}`
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
      <p><b>Where AI goes wrong:</b> printing <code>tails</code> as if it were the LIS; using <code>Arrays.binarySearch</code> and forgetting that it returns <code>-(insertion point) - 1</code> for missing keys and an arbitrary match for duplicates; sorting envelopes by h ascending on ties (wrong answer); returning dp[n−1] instead of max(dp).</p>
      <p><b>What you must still own:</b> spotting “keep order, may skip” in the wording, choosing O(N²) vs O(N log N) from the constraints, and proving the replacement step is safe in two sentences.</p>`,
    problems: [{
      title: 'Longest Increasing Subsequence', level: 'Medium', tags: ['dp', 'binary search', 'LIS'], companies: ['Google', 'Amazon', 'Microsoft', 'Meta'],
      statement: `<p>Given an integer array <code>nums</code>, return the length of the longest <b>strictly increasing subsequence</b>. A subsequence keeps the relative order but may skip elements.</p>`,
      constraints: `1 ≤ nums.length ≤ 2500 (follow-up: 10<sup>5</sup>), −10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup>. Target O(N log N).`,
      example: `${H.arr([0, 1, 0, 3, 2, 3], { label: 'nums', hl: { 0: 'g', 1: 'g', 4: 'g', 5: 'g' } })}<p>Output <b>4</b>: ${H.c('g', '0, 1, 2, 3')} (indices 0, 1, 4, 5). [7,7,7,7] → 1 because equal values are not strictly increasing.</p>`,
      brute: {
        why: `<p>Try every subset of indices (pick / skip each element) and keep the longest increasing one: 2<sup>N</sup> subsets. Already at N = 40 that is 10<sup>12</sup>. The waste: the best run ending at index i is recomputed again and again inside different subsets — classic overlapping subproblems.</p>`,
        code: `class Brute {
    // pick / skip recursion: prev = index of last picked element (-1 = none yet)
    int best(int[] a, int i, int prev) {
        if (i == a.length) return 0;
        int skip = best(a, i + 1, prev);
        int take = 0;
        if (prev == -1 || a[prev] < a[i]) take = 1 + best(a, i + 1, i);
        return Math.max(skip, take);
    }
    public int lengthOfLIS(int[] nums) { return best(nums, 0, -1); }
}`
      },
      mcq: { q: 'tails = [2, 5, 9] and the next number is 6. What happens?', options: ['6 replaces 9 (first tail ≥ 6)', '6 is appended → [2, 5, 9, 6]', '6 replaces 5', 'Nothing — 6 is ignored'], answer: 0, explain: 'Lower bound of 6 in [2,5,9] is index 2 (value 9). A run of length 3 can now end at 6 instead of 9 — cheaper, so we replace.' },
      hints: [
        `<p>Hint 1: for each length L, only the <b>smallest possible ending value</b> matters — a run of length L ending in 5 beats one ending in 9 because more future numbers can extend it.</p>`,
        `<p>Hint 2: keep those smallest endings in a list <code>tails</code>. It is always sorted, so you can binary-search the spot for each new number.</p>`,
        `<p>Hint 3: recipe — for x in nums: pos = first index with tails[pos] ≥ x; if pos == size append else overwrite; answer = size. Edge cases: duplicates (lower bound keeps it strict), single element → 1.</p>`
      ],
      solution: {
        approach: `<p>Maintain <code>tails</code> as a plain int array with a length counter. For each number do a hand-written lower-bound binary search (no boxing, no surprises with <code>Arrays.binarySearch</code> on duplicates). Append when the position equals the length, otherwise overwrite. The final length is the answer. Mention the O(N²) dp as the warm-up and the reconstruction trick (parent indices) as a follow-up.</p>`,
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
    def lengthOfLIS(self, nums):
        tails = []
        for x in nums:
            k = bisect_left(tails, x)
            if k == len(tails):
                tails.append(x)
            else:
                tails[k] = x
        return len(tails)` }, { lang: 'cpp', code: `class Solution {
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
      }
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
    code: [`
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
      }`, `
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
      }`, { lang: 'python', run: true, title: 'Word Break count + all partitions (runnable)', code: `from functools import lru_cache

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
    codeTitle: ['Word Break with maxLen pruning (Java)', 'Palindrome min cuts in O(N²) (Java)', 'Counting splits + listing palindrome partitions (Python)'],
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
        code: `static int maxSumAfterPartitioning(int[] arr, int k) {
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
}`
      }
    ],
    deepDive: `<p><b>Complexity of Word Break.</b> The naive double loop does O(N²) substring checks, and each <code>substring + hash</code> costs O(L), so the honest bound is O(N² · L) or O(N³) when words are long. Fixes: (1) loop only over lengths ≤ maxWordLen → O(N · maxLen · maxLen); (2) walk a <b>trie</b> forward from every reachable start j, stopping when the trie path dies → O(N · maxLen) character steps and no substring allocation; (3) rolling hashes for O(1) piece lookups.</p>
      <p><b>Word Break II.</b> The number of sentences can be exponential ("aaaa…a" with {a, aa, aaa}), so no algorithm is polynomial in the output. Good practice: first run the boolean dp (or memoise “can the suffix from i be finished?”) so backtracking never enters a dead end. Without that pruning, inputs like "aaaa…ab" make naive backtracking explore 2<sup>N</sup> branches only to fail.</p>
      <p><b>Palindrome table tricks.</b> Filling <code>pal[j][i]</code> in the order “i ascending, j any” works because pal[j+1][i−1] belongs to a previous i. Memory O(N²) booleans = 4 MB at N = 2000 — fine. The O(N) memory alternative expands around every centre (2N−1 centres) and updates <code>cuts[right] = min(cuts[left−1] + 1)</code> as it expands; Manacher’s algorithm (DSA 24) finds all palindromic radii in O(N), but min-cut still needs O(N²) in the worst case using the simple dp.</p>
      <p><b>Correctness pattern.</b> Every partition has a unique last piece, so “min/OR/SUM over the last piece of (answer for the rest)” covers every partition exactly once — that is why the counting version does not double count. This is the same argument you will reuse in “Decode Ways”, “Split Array Largest Sum” (which also has a binary-search-on-answer solution) and “Minimum cost to segment text”.</p>
      <p><b>Production reality.</b> Word segmentation is used for languages written without spaces (Chinese, Japanese, Thai), URL/hashtag splitting (#nowhiring → now hiring / no whiring) and in tokenisers. Real systems replace “is a word” with a <b>probability</b> and the OR with a max over log-probabilities — the Viterbi algorithm is exactly this dp.</p>`,
    aiEra: `<p><b>What AI changes:</b> modern LLM tokenisers (BPE, WordPiece, unigram LM) literally solve partition problems — unigram tokenisation runs a Viterbi-style dp over the string to pick the most probable segmentation. Knowing partition dp lets you reason about why a token boundary appears where it does.</p>
      <p><b>Use AI as a partner:</b> ask <code>Generate adversarial Word Break II inputs that make naive backtracking exponential, and explain why</code>, then test whether your memoised version survives. Ask it to convert your O(N²)-memory palindrome table into the expand-around-centre O(N)-memory version and diff the outputs on random strings.</p>
      <p><b>Where AI goes wrong:</b> greedy longest-match segmentation presented as correct; forgetting <code>dp[0] = true</code>; quietly using <code>s.substring</code> in a triple loop and calling it O(N²); listing all palindrome partitions without a pal table (re-checking each piece costs O(N) every time).</p>
      <p><b>What you must still own:</b> naming the state (“answer for the prefix of length i”), defending the base case, and spotting when the output is exponential so “optimise it” really means “prune it”.</p>`,
    problems: [{
      title: 'Word Break', level: 'Medium', tags: ['dp', 'string', 'hashing', 'trie'], companies: ['Amazon', 'Google', 'Meta', 'Bloomberg'],
      statement: `<p>Given a string <code>s</code> and a list of words <code>wordDict</code>, return <code>true</code> if <code>s</code> can be split into a sequence of one or more dictionary words. Words may be reused any number of times.</p>`,
      constraints: `1 ≤ s.length ≤ 300, 1 ≤ wordDict.length ≤ 1000, 1 ≤ word length ≤ 20, all lowercase, words are unique.`,
      example: `<p>s = ${H.c('b', '"applepenapple"')}, wordDict = [apple, pen] → <b>true</b>: ${H.c('g', 'apple | pen | apple')} (apple reused). s = "catsandog", [cats, dog, sand, and, cat] → <b>false</b> — every route gets stuck at "og".</p>`,
      brute: {
        why: `<p>Recursively try every word that matches at the current position and recurse on the rest. The same suffix is solved again and again: for s = "aaaa…ab" with {a, aa, aaa} the recursion tree is exponential before it discovers the final "b" can never match.</p>`,
        code: `class Brute {
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
}`
      },
      mcq: { q: 'dp[i] means “s[0..i) can be segmented”. Which condition makes dp[i] true?', options: ['Some j &lt; i with dp[j] true AND s[j..i) in the dictionary', 'dp[i−1] true AND s[i−1] is a word', 'Any dictionary word is a substring of s[0..i)', 'All dp[j] for j &lt; i are true'], answer: 0, explain: 'The last word must be s[j..i) for some start j, and everything before it — s[0..j) — must already be splittable (dp[j]).' },
      hints: [
        `<p>Hint 1: whatever the full split looks like, it has a <b>last word</b>. If that last word is s[j..i), the rest s[0..j) must also be splittable — a smaller version of the same question.</p>`,
        `<p>Hint 2: boolean array <code>dp[0..n]</code>, dp[0] = true, a HashSet for the dictionary. For each i, try each j.</p>`,
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
    def wordBreak(self, s, wordDict):
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
        return dp[n]` }],
        dry: { head: ['i', 'prefix', 'last word tried', 'dp[i]'], rows: [
          ['0', '""', '—', 'T'], ['5', 'apple', '"apple" from j=0 (dp[0]=T)', '<span class="c-g">T</span>'],
          ['6..7', 'applep, applepe', 'no word ends here', 'F'], ['8', 'applepen', '"pen" from j=5 (dp[5]=T)', '<span class="c-g">T</span>'],
          ['9..12', '…', 'no word ends here', 'F'], ['13', 'applepenapple', '"apple" from j=8 (dp[8]=T)', '<span class="c-g">T → answer</span>']
        ] },
        complexity: `<p>Time O(N · maxLen · maxLen) (maxLen choices of j, each substring/hash costs up to maxLen). Space O(N + dictionary). A trie walk removes the substring cost.</p>`,
        followUps: ['Return all sentences (Word Break II).', 'Count the number of segmentations modulo 10<sup>9</sup>+7.', 'Use a trie instead of a HashSet — what changes in complexity?']
      }
    }, {
      title: 'Palindrome Partitioning II (minimum cuts)', level: 'Hard', tags: ['dp', 'string', 'palindrome'], companies: ['Google', 'Amazon', 'Adobe'],
      statement: `<p>Given a string <code>s</code>, split it so that every piece is a palindrome. Return the <b>minimum number of cuts</b> needed.</p>`,
      constraints: `1 ≤ s.length ≤ 2000, lowercase English letters. O(N²) time is expected.`,
      example: `<p>s = ${H.c('b', '"aab"')} → <b>1</b> (${H.c('g', 'aa | b')}). s = "a" → 0. s = "ab" → 1. s = "abccbc" → 2 (a | bccb | c).</p>`,
      brute: {
        why: `<p>Recursively try every palindromic first piece and recurse on the rest; checking each piece costs O(N) and the number of partitions is up to 2<sup>N−1</sup>. Even with memo on the start index, re-checking palindromes inside the loop gives O(N³).</p>`,
        code: `class Brute {
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
}`
      },
      mcq: { q: 'Why precompute pal[j][i] instead of checking each piece with two pointers?', options: ['It turns each palindrome check into O(1), so the whole dp is O(N²) instead of O(N³)', 'Two pointers give wrong answers for even lengths', 'It saves memory', 'Java strings cannot be scanned with two pointers'], answer: 0, explain: 'There are O(N²) (j, i) pairs. A two-pointer check is O(N) each → O(N³). The table answers each check in O(1) using pal[j+1][i−1].' },
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
    def minCut(self, s):
        n = len(s)
        cuts = list(range(-1, n))       # cuts[k] = min cuts for s[:k]; cuts[0] = -1 sentinel
        for c in range(n):
            for left, right in ((c, c), (c, c + 1)):          # odd and even centres
                while left >= 0 and right < n and s[left] == s[right]:
                    cuts[right + 1] = min(cuts[right + 1], cuts[left] + 1)
                    left -= 1
                    right += 1
        return cuts[n]` }],
        dry: { head: ['i', 'char', 'palindromes ending at i', 'cuts[i]'], rows: [
          ['0', 'a', '"a" (j=0)', '0'], ['1', 'b', '"b"', 'cuts[0]+1 = 1'], ['2', 'c', '"c"', '2'], ['3', 'c', '"c", "cc"', 'min(3, cuts[1]+1 = 2) = 2'],
          ['4', 'b', '"b", "bccb" (j=1)', 'cuts[0]+1 = <span class="c-g">1</span>'], ['5', 'c', '"c", "cbc" (j=3)', 'min(cuts[4]+1, cuts[2]+1) = <span class="c-g">2</span>']
        ] },
        complexity: `<p>Time O(N²). Space O(N²) for the table (O(N) with the expand-around-centre version shown in Python).</p>`,
        followUps: ['Return the actual pieces, not just the count.', 'List all palindrome partitions (LC 131) — why is that exponential?', 'Minimum cuts so each piece has at most k distinct letters.']
      }
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
    code: [`
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
      }`, `
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
      }`, { lang: 'python', run: true, title: 'Top-down (memoised) versions in Python (runnable)', code: `from functools import lru_cache

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
    codeTitle: ['Matrix Chain Multiplication with brackets (Java)', 'Burst Balloons (Java)', 'Memoised versions (Python)'],
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
        code: `static int minCostCut(int n, int[] cuts) {
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
}`
      },
      {
        title: 'Minimum Score Triangulation of a polygon',
        html: `<p>Vertex values [1, 3, 1, 4, 1, 5]. Any triangulation of polygon i..j has exactly one triangle using the edge (i, j); its third vertex k splits the polygon into i..k and k..j. <code>dp[i][j] = min(dp[i][k] + dp[k][j] + v[i]·v[k]·v[j])</code>. Answer ${H.c('g', '13')}. It is literally MCM in disguise (a chain of n−1 matrices ↔ triangulating an (n+1)-gon).</p>`
      }
    ],
    deepDive: `<p><b>Order of filling.</b> Any order works as long as dp[i][k] and dp[k+1][j] are ready before dp[i][j]. “By length” is the safest. An equivalent trick: loop <code>i</code> from n down to 1 and <code>j</code> from i up to n — row i only needs rows below it and columns to its left.</p>
      <p><b>Complexity.</b> O(N²) states × O(N) splits = O(N³) time, O(N²) memory. N = 500 → 1.25·10<sup>8</sup>/6 ≈ 2·10<sup>7</sup> inner steps for the triangle of (i ≤ k &lt; j) — fast in Java.</p>
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
        code: `class Brute {
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
}`
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
    def maxCoins(self, nums):
        b = [1] + nums + [1]
        n = len(nums)
        dp = [[0] * (n + 2) for _ in range(n + 2)]
        for length in range(1, n + 1):
            for i in range(1, n - length + 2):
                j = i + length - 1
                dp[i][j] = max(dp[i][k - 1] + b[i - 1] * b[k] * b[j + 1] + dp[k + 1][j]
                               for k in range(i, j + 1))
        return dp[1][n]` }],
        dry: { head: ['range (values)', 'walls', 'best last k', 'dp'], rows: [
          ['[3]', '1, 1', '3', '3'], ['[1]', '3, 5', '1', '15'], ['[5]', '1, 8', '5', '40'], ['[8]', '5, 1', '8', '40'],
          ['[3,1]', '1, 5', '3 last: 15 + 15 = 30', '30'], ['[1,5]', '3, 8', '5 last: 15 + 120 = 135', '135'], ['[5,8]', '1, 1', '8 last: 40 + 8 = 48', '48'],
          ['[3,1,5]', '1, 8', '3 last: 0 + 1·3·8 + 135 = 159', '159'], ['[1,5,8]', '3, 1', '8 last: 135 + 3·8·1 = 159', '159'],
          ['[3,1,5,8]', '1, 1', '8 last: 159 + 1·8·1 = 167 (3 last gives 162, 5 last 75, 1 last 52)', '<span class="c-g">167</span>']
        ] },
        complexity: `<p>Time O(N³) (≈ 4.5·10<sup>6</sup> steps for N = 300). Space O(N²).</p>`,
        followUps: ['Print the bursting order.', 'What if coins were left + i + right instead of a product?', 'Remove Boxes (LC 546) — why does it need a third dp dimension?']
      }
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
    code: [`
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
      }`, `
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
      }`, { lang: 'python', run: true, title: 'Both, on trees built from heap-layout arrays (runnable)', code: `class Node:
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
    codeTitle: ['House Robber III (Java)', 'Max Path Sum (Java)', 'Python, runnable'],
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
          <p>Returning <code>[rob, skip]</code> means each node is visited exactly <b>once</b>: O(N). Same idea as memoisation, but no HashMap is needed because the parent receives everything it needs directly.</p>`
      },
      {
        title: 'Max path sum with negatives: [-10, 9, 20, null, null, 15, 7]',
        html: `<p>Gains: 9 → 9; 15 → 15; 7 → 7; 20 → 20 + max(15, 7) = 35 (bend at 20: 15 + 20 + 7 = ${H.c('g', '42')}); root −10 → bend = −10 + 9 + 35 = 34. Best = ${H.c('g', '42')} — the path 15 → 20 → 7 never touches the root.</p>
          <p>All-negative tree [−3]: the path must contain at least one node, so the answer is −3. That is why <code>best</code> starts at <code>Integer.MIN_VALUE</code>, not 0.</p>`
      },
      {
        title: 'Same skeleton: Diameter of a binary tree',
        html: `<p>Return height (one side), record left height + right height (the bend). For a root with a left chain of 3 nodes and a right chain of 2 nodes, the diameter is 3 + 2 = ${H.c('g', '5')} edges.</p>`,
        code: `class Diameter {
    int best = 0;
    int height(TreeNode n) {
        if (n == null) return 0;
        int l = height(n.left), r = height(n.right);
        best = Math.max(best, l + r);      // edges on the path bending at n
        return 1 + Math.max(l, r);         // one side, for the parent
    }
    int diameterOfBinaryTree(TreeNode root) { height(root); return best; }
}`
      }
    ],
    deepDive: `<p><b>Designing the return value.</b> Ask: “what does my parent need to know about my subtree to make <b>its</b> decision?” For robbing: whether I was robbed. For cameras: whether I am covered, have a camera, or still need cover (3 states). For path problems: the best downward chain. If the parent needs more, return a bigger tuple — each extra state multiplies work by a constant, not by N.</p>
      <p><b>Proof of O(N).</b> Each node is entered once and does O(1) work with its children’s answers (O(k) for k children in general trees, summing to O(N) edges).</p>
      <p><b>Recursion depth.</b> A skewed tree of 10<sup>5</sup> nodes means 10<sup>5</sup> nested calls — Java’s default thread stack (~512 KB–1 MB) can overflow around 10<sup>4</sup>–10<sup>5</sup> frames. Fixes: run inside <code>new Thread(null, task, "dfs", 1 &lt;&lt; 26)</code> with a big stack, or do an iterative post-order (push nodes on a stack, process them in reverse pre-order so children are finished first).</p>
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
        code: `class Brute {
    public int rob(TreeNode root) {
        if (root == null) return 0;
        int take = root.val;
        if (root.left != null) take += rob(root.left.left) + rob(root.left.right);
        if (root.right != null) take += rob(root.right.left) + rob(root.right.right);
        int skip = rob(root.left) + rob(root.right);   // children recomputed again later
        return Math.max(take, skip);
    }
}`
      },
      mcq: { q: 'A node returns [rob, skip]. Its parent is being ROBBED. Which child value must the parent use?', options: ['The child\'s skip value', 'max(rob, skip) of the child', 'The child\'s rob value', 'Zero'], answer: 0, explain: 'Parent and child are directly linked, so if the parent is robbed the child cannot be — only skip is allowed.' },
      hints: [
        `<p>Hint 1: the parent only needs to know, for each child subtree, the best total <b>with</b> the child robbed and <b>without</b> it.</p>`,
        `<p>Hint 2: post-order DFS returning <code>int[]{rob, skip}</code>; null returns {0, 0}.</p>`,
        `<p>Hint 3: rob = val + L.skip + R.skip; skip = max(L) + max(R); answer = max(root pair). Edge cases: single node, all zeros, deep skewed tree.</p>`
      ],
      solution: {
        approach: `<p>One post-order pass. Each node turns its children’s pairs into its own pair in O(1). The root’s larger value is the answer. No memo map is needed because each subtree is computed once and handed straight to its parent.</p>`,
        code: `class Solution {
    public int rob(TreeNode root) {
        int[] res = dfs(root);
        return Math.max(res[0], res[1]);
    }
    private int[] dfs(TreeNode node) {
        if (node == null) return new int[]{0, 0};
        int[] l = dfs(node.left);
        int[] r = dfs(node.right);
        int rob = node.val + l[1] + r[1];                          // children skipped
        int skip = Math.max(l[0], l[1]) + Math.max(r[0], r[1]);    // children choose freely
        return new int[]{rob, skip};
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def rob(self, root):
        def dfs(node):
            if not node:
                return (0, 0)
            lr, ls = dfs(node.left)
            rr, rs = dfs(node.right)
            return (node.val + ls + rs, max(lr, ls) + max(rr, rs))
        return max(dfs(root))` }],
        dry: { head: ['node (post-order)', 'left pair', 'right pair', 'rob', 'skip'], rows: [
          ['3 (leaf)', '[0,0]', '[0,0]', '3', '0'], ['2', '[0,0]', '[3,0]', '2', '3'], ['1 (leaf)', '[0,0]', '[0,0]', '1', '0'],
          ['3 (right child)', '[0,0]', '[1,0]', '3', '1'], ['3 (root)', '[2,3]', '[3,1]', '<span class="c-g">7</span>', '6']
        ] },
        complexity: `<p>Time O(N), space O(H) recursion stack (H = height, up to N for a skewed tree).</p>`,
        followUps: ['Print which houses to rob.', 'General tree (any number of children) given as an edge list.', 'You may not rob a node and its grandchild either — what state do you need?']
      }
    }, {
      title: 'Binary Tree Maximum Path Sum', level: 'Hard', tags: ['tree dp', 'dfs'], companies: ['Meta', 'Amazon', 'Google', 'Microsoft'],
      statement: `<p>A path is a sequence of nodes where each adjacent pair is connected by an edge; a node appears at most once and the path need not pass through the root. Return the maximum sum of node values over all non-empty paths.</p>`,
      constraints: `1 ≤ nodes ≤ 3·10<sup>4</sup>, −1000 ≤ Node.val ≤ 1000.`,
      example: `<p>Tree [−10, 9, 20, null, null, 15, 7] → <b>42</b> via ${H.c('g', '15 → 20 → 7')}. Tree [1, 2, 3] → 6 (2 → 1 → 3). Tree [−3] → −3.</p>`,
      brute: {
        why: `<p>Treat every node as the “top” (bend point) of the path and, for each one, compute the best downward chains on both sides by a fresh DFS: O(N) per node → O(N²). The waste: the best downward chain from a node is recomputed for every ancestor.</p>`,
        code: `class Brute {
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
}`
      },
      mcq: { q: 'Why does gain() return node.val + max(left, right) instead of node.val + left + right?', options: ['A parent extending the path can continue down only ONE side; using both would make the path branch', 'Because left + right might overflow', 'Because the right child is always smaller', 'To make the code shorter'], answer: 0, explain: 'If the parent attached itself to a path that already uses both children of this node, the node would have three path neighbours — not a path anymore.' },
      hints: [
        `<p>Hint 1: every path has exactly one <b>highest</b> node where it bends. Try every node as that bend point.</p>`,
        `<p>Hint 2: a post-order DFS can return the best <b>downward</b> chain from each node, so the bend value is val + max(0, leftChain) + max(0, rightChain) in O(1).</p>`,
        `<p>Hint 3: keep a global best initialised to MIN_VALUE; update with the bend value; return val + max(0, max(leftChain, rightChain)). Negative chains are clipped to 0 = “don’t take that side”.</p>`
      ],
      solution: {
        approach: `<p>Single post-order DFS with a field <code>best</code>. At each node compute clipped left/right gains, update best with the two-sided sum, and return the one-sided sum. Every node is visited once.</p>`,
        code: `class Solution {
    private int best = Integer.MIN_VALUE;
    public int maxPathSum(TreeNode root) {
        gain(root);
        return best;
    }
    private int gain(TreeNode node) {
        if (node == null) return 0;
        int left = Math.max(0, gain(node.left));    // ignore negative branches
        int right = Math.max(0, gain(node.right));
        best = Math.max(best, node.val + left + right);  // path bending here
        return node.val + Math.max(left, right);         // extendable by the parent
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def maxPathSum(self, root):
        best = float('-inf')
        def gain(node):
            nonlocal best
            if not node:
                return 0
            left = max(0, gain(node.left))
            right = max(0, gain(node.right))
            best = max(best, node.val + left + right)
            return node.val + max(left, right)
        gain(root)
        return best` }],
        dry: { head: ['node', 'left gain', 'right gain', 'bend sum', 'best', 'returns'], rows: [
          ['9', '0', '0', '9', '9', '9'], ['15', '0', '0', '15', '15', '15'], ['7', '0', '0', '7', '15', '7'],
          ['20', '15', '7', '42', '<span class="c-g">42</span>', '35'], ['−10', '9', '35', '34', '42', '25']
        ] },
        complexity: `<p>Time O(N), space O(H) stack.</p>`,
        followUps: ['Return the path itself.', 'Path must start and end at leaves.', 'Same question on a general tree given as an adjacency list.']
      }
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
    code: [`
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
      }`, `
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
      }`, `
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
      }`, { lang: 'python', run: true, title: 'The whole family in Python (runnable)', code: `def one_transaction(prices):
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
    codeTitle: ['Cooldown (Java)', 'Transaction fee (Java)', 'At most k transactions (Java)', 'Whole family (Python, runnable)'],
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
        code: `int buy1 = Integer.MIN_VALUE, sell1 = 0, buy2 = Integer.MIN_VALUE, sell2 = 0;
for (int p : new int[]{3, 3, 5, 0, 0, 3, 1, 4}) {
    buy1 = Math.max(buy1, -p);          // first buy
    sell1 = Math.max(sell1, buy1 + p);  // first sell
    buy2 = Math.max(buy2, sell1 - p);   // second buy, paid from first profit
    sell2 = Math.max(sell2, buy2 + p);  // second sell
}
System.out.println(sell2);              // 6`
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
      <p><b>Where AI goes wrong:</b> in-place updates that read today’s values (breaking cooldown); initialising hold to 0 instead of −∞ (lets you “sell” a share you never bought); integer overflow when <code>Integer.MIN_VALUE + p</code> is followed by subtracting; forgetting the k ≥ N/2 shortcut and allocating huge arrays.</p>
      <p><b>What you must still own:</b> turning plain-English rules into modes and arrows, and explaining why each arrow uses yesterday’s value.</p>`,
    problems: [{
      title: 'Best Time to Buy and Sell Stock with Cooldown', level: 'Medium', tags: ['state machine dp', 'dp'], companies: ['Google', 'Amazon', 'Bloomberg', 'Goldman Sachs'],
      statement: `<p>Given daily prices, find the maximum profit with as many transactions as you like, but: you can hold at most one share at a time, and after you <b>sell</b> you cannot buy on the <b>next</b> day (one-day cooldown).</p>`,
      constraints: `1 ≤ prices.length ≤ 5000, 0 ≤ prices[i] ≤ 1000. O(N) time, O(1) space.`,
      example: `<p>prices = [1, 2, 3, 0, 2] → <b>3</b>: ${H.c('g', 'buy 1, sell 2, cooldown, buy 0, sell 2')}. Selling at 3 instead (+2) forces the cooldown on the day of price 0, so the second trade is lost.</p>`,
      brute: {
        why: `<p>Recursively decide each day: buy / sell / do nothing, tracking whether we hold a share and whether we are in cooldown. That is up to 3<sup>N</sup> paths; the same (day, holding, cooldown) situation is reached through many histories and solved again every time.</p>`,
        code: `class Brute {
    int go(int[] p, int day, boolean holding) {
        if (day >= p.length) return 0;
        int best = go(p, day + 1, holding);                              // do nothing
        if (holding) best = Math.max(best, p[day] + go(p, day + 2, false));  // sell, skip next day
        else best = Math.max(best, -p[day] + go(p, day + 1, true));      // buy
        return best;
    }
    public int maxProfit(int[] prices) { return go(prices, 0, false); }
}`
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
    def maxProfit(self, prices):
        hold, sold, rest = float('-inf'), float('-inf'), 0
        for p in prices:
            hold, sold, rest = max(hold, rest - p), hold + p, max(rest, sold)
        return max(sold, rest)` }, { lang: 'cpp', code: `class Solution {
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
      }
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
    code: [`
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
      }`, `
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
      }`, `
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
      }`, { lang: 'python', run: true, title: 'The family in Python (runnable)', code: `def lcs(a, b):
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
    codeTitle: ['Distinct Subsequences, one row (Java)', 'Longest Palindromic Subsequence (Java)', 'Shortest Common Supersequence with reconstruction (Java)', 'Family in Python (runnable)'],
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
        code: `static boolean isInterleave(String s1, String s2, String s3) {
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
}`
      }
    ],
    deepDive: `<p><b>Reading the grid as a graph.</b> Every string dp of this family is a shortest/longest/counting path problem on an (m+1)×(n+1) grid DAG where each cell has edges to its up, left and diagonal neighbours. LCS = longest path using diagonal edges only on matches; Edit Distance = shortest path with unit costs; Distinct Subsequences = count of paths. Thinking this way makes new variants (weighted edits, affine gaps in bioinformatics) feel natural.</p>
      <p><b>Memory.</b> Each row needs only the previous row → O(n) space. When a single row is updated in place, the <b>direction</b> matters: Distinct Subsequences reads dp[j−1] from the previous row, so iterate j <b>right to left</b>; Interleaving String reads dp[j−1] from the current row, so iterate left to right. Reconstruction (SCS, printing the LCS) needs the full table — or Hirschberg’s divide-and-conquer, which rebuilds an LCS in O(m·n) time and O(min(m, n)) space.</p>
      <p><b>Overflow in counting dp.</b> Distinct Subsequences counts can explode in intermediate cells even when the final answer fits. Because the recurrence only adds, Java’s int wrap-around keeps every value correct modulo 2<sup>32</sup>, so the final (small) answer comes out right. If the problem asks “modulo 10<sup>9</sup>+7”, apply the mod on every addition.</p>
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
        code: `class Brute {
    int count(String s, String t, int i, int j) {
        if (j == t.length()) return 1;          // matched all of t
        if (i == s.length()) return 0;          // ran out of s
        int ways = count(s, t, i + 1, j);       // skip s[i]
        if (s.charAt(i) == t.charAt(j)) ways += count(s, t, i + 1, j + 1);  // use s[i]
        return ways;                            // exponential without memo
    }
    public int numDistinct(String s, String t) { return count(s, t, 0, 0); }
}`
      },
      mcq: { q: 's[i−1] equals t[j−1]. What is dp[i][j]?', options: ['dp[i−1][j] + dp[i−1][j−1]', 'dp[i−1][j−1] + 1', 'max(dp[i−1][j], dp[i][j−1])', 'dp[i−1][j−1]'], answer: 0, explain: 'We may skip s[i−1] (dp[i−1][j] ways) or use it to match t[j−1] (dp[i−1][j−1] ways). The two groups are disjoint, so we add.' },
      hints: [
        `<p>Hint 1: for the last letter of the s-prefix you have two choices: ignore it, or (only if it equals t’s current letter) use it.</p>`,
        `<p>Hint 2: grid dp[i][j] over prefixes; dp[i][0] = 1 for every i (empty t), dp[0][j] = 0 for j &gt; 0.</p>`,
        `<p>Hint 3: one row suffices if j runs right-to-left. Recipe: dp = [1, 0, …]; for c in s: for j = n..1: if c == t[j−1]: dp[j] += dp[j−1]. Return dp[n].</p>`
      ],
      solution: {
        approach: `<p>Counting grid compressed to one row. Iterating j downward guarantees dp[j−1] still holds the previous row’s value when we add it. Only additions are used, so int wrap-around in intermediate cells cannot corrupt the final answer (which fits in int).</p>`,
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
    def numDistinct(self, s, t):
        dp = [1] + [0] * len(t)
        for c in s:
            for j in range(len(t), 0, -1):
                if c == t[j - 1]:
                    dp[j] += dp[j - 1]
        return dp[-1]` }],
        dry: { head: ['letter of s', 'dp[""]', 'dp[b]', 'dp[ba]', 'dp[bag]'], rows: [
          ['(start)', '1', '0', '0', '0'], ['b', '1', '1', '0', '0'], ['a', '1', '1', '1', '0'], ['b', '1', '2', '1', '0'],
          ['g', '1', '2', '1', '1'], ['b', '1', '3', '1', '1'], ['a', '1', '3', '4', '1'], ['g', '1', '3', '4', '<span class="c-g">5</span>']
        ] },
        complexity: `<p>Time O(m·n), space O(n).</p>`,
        followUps: ['Return the count modulo 10<sup>9</sup>+7 for huge inputs.', 'Count distinct subsequences of a single string (LC 940).', 'What if t may contain a wildcard “?”?']
      }
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
      <p><b>Top-down vs bottom-up.</b> Memoised recursion is easier to derive and only visits reachable states (great for sparse problems like Word Break II); bottom-up avoids recursion limits and enables row compression. In Java prefer bottom-up when depth can exceed ~10<sup>4</sup>.</p>
      <p><b>Counting vs optimising vs deciding.</b> The same state graph supports OR (feasibility), MIN/MAX (optimisation) and SUM (counting). For counting, make sure each object is generated by exactly one path (unique “last piece”, unique “last balloon”), otherwise you over-count.</p>
      <p><b>When it is not DP.</b> If a greedy exchange argument works (single-transaction stocks, unlimited transactions), it beats DP. If the answer is monotone in a parameter, binary search on the answer may be simpler (Split Array Largest Sum). If states blow up exponentially, look for bitmasks (N ≤ 20) or meet-in-the-middle.</p>`,
    aiEra: `<p><b>What AI changes:</b> classification used to be a memory game (“have I seen this problem?”). With AI, anyone can retrieve a known solution; interviewers therefore choose <b>unseen variants</b> and watch how you derive the state. This checklist is your process when there is nothing to retrieve.</p>
      <p><b>Use AI as a partner:</b> paste a problem and ask <code>Which DP shape is this and what is the state sentence? Do not give code.</code> Then argue with it — if its state misses information the future needs, you will find a counterexample. Ask it to generate three disguised problems for each shape to drill recognition.</p>
      <p><b>Where AI goes wrong:</b> confidently matching a surface keyword (“subsequence”) to the wrong family; proposing O(N³) for N = 10<sup>5</sup>; missing a state component such as “cooldown” or “transactions left”.</p>
      <p><b>What you must still own:</b> the state sentence, the complexity check against constraints, and the correctness argument (each solution corresponds to exactly one path through the states).</p>`
  });

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
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
