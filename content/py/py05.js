(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared visualizer helpers (py05) ---------- */
  function fr(narr, parts) { return { narr: narr, parts: parts }; }
  function tx(html, label) { return { type: 'text', label: label, html: html }; }
  // Code part with one (or several, comma separated) highlighted lines.
  function cp(code, lines, cls, label) {
    var hl = {};
    if (lines) String(lines).split(',').forEach(function (l) { hl[Number(l)] = cls || 'cur'; });
    return { type: 'code', label: label || 'Python (current line highlighted)', lang: 'python', code: code, hl: hl };
  }
  function vp(vals, hlKeys, cls, label) {
    var hl = {};
    if (hlKeys) String(hlKeys).split(',').forEach(function (k) { hl[k] = cls || 'ok'; });
    return { type: 'vars', label: label || 'Variables', vals: vals, hl: hl };
  }
  function nums(s, what) {
    var t = String(s === undefined ? '' : s).trim().split(/[\s,]+/).filter(function (x) { return x.length; });
    var a = t.map(Number);
    if (!a.length || a.some(function (x) { return isNaN(x) || Math.floor(x) !== x; })) throw new Error('Enter ' + (what || 'whole numbers') + ' separated by spaces');
    return a;
  }
  function pyList(a) { return '[' + a.join(', ') + ']'; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ================= TOPIC 1: list = dynamic array ================= */
  topics.push({
    title: 'list Under the Hood: A Dynamic Array of Pointers (Growth, Amortized O(1), Costly Shifts)',
    analogy: `<p>Think of a <b>row of numbered lockers</b> in a school corridor that the school rents in blocks. Putting a bag in the <b>next empty locker at the end</b> is instant. But when every rented locker is full, the school must rent a <b>bigger block somewhere else</b> and carry every bag across — slow, but it happens rarely, and they always rent a few <b>extra lockers</b> so the next few bags are instant again. Squeezing a new bag into <b>locker #0</b> is the painful one: every bag has to shuffle one locker to the right first.</p>
<p>A Python <code>list</code> is exactly that row of lockers — except each locker holds only a <b>note saying where the real object lives</b> (a pointer), not the object itself.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A <code>list</code> in CPython (the normal Python you download from python.org) is a <b>dynamic array</b>: one continuous block of memory holding <b>pointers</b> (8-byte addresses on a 64-bit machine) to the actual objects. Because the block is continuous, Python can jump straight to slot <code>i</code> with simple arithmetic — that is why <code>lst[i]</code> is <b>O(1)</b> no matter how long the list is.</p>
${H.arr(['→ 7', '→ \'hi\'', '→ 3.5', '→ None', '·', '·', '·', '·'], { label: 'lst = [7, \'hi\', 3.5, None]  — len 4, capacity 8 (4 spare slots)', hl: { 4: 'm', 5: 'm', 6: 'm', 7: 'm' } })}
<p>Two numbers describe a list at any moment:</p>
${H.table(['Name', 'Meaning', 'Who sees it'], [['<b>length</b>', 'how many items you stored', 'you — <code>len(lst)</code>, O(1)'], ['<b>capacity</b>', 'how many pointer slots are reserved', 'hidden — peek with <code>sys.getsizeof</code>']])}
<p><b>append</b>: if there is a spare slot, write the pointer there → O(1). If the list is <b>full</b>, CPython reserves a <b>bigger block</b> (about 12.5% bigger plus a few slots), copies all pointers over, then appends. That copy is O(n), but it happens so rarely that the <b>average</b> cost per append stays O(1). This is called <b>amortized O(1)</b> — "spread the rare big cost over many cheap steps".</p>
${H.table(['len after append', '1', '5', '9', '17', '25', '33', '41'], [['capacity (CPython 3.9+)', '4', '8', '16', '24', '32', '40', '52']])}
<p><b>The costly operations</b> are the ones that make items <b>shift</b>:</p>
<ul><li><code>lst.insert(0, x)</code> and <code>lst.pop(0)</code> move every other pointer by one slot → <b>O(n)</b>.</li>
<li><code>lst.remove(x)</code> must first <b>search</b> (O(n)) then shift (O(n)).</li>
<li><code>x in lst</code> scans left to right → <b>O(n)</b>.</li>
<li><code>lst.pop()</code> (from the end) and <code>lst.append(x)</code> touch only the end → O(1).</li></ul>
<p><b>Rule of thumb:</b> work at the <b>end</b> of a list. If you need fast work at <b>both ends</b> (queues, BFS, sliding windows) use <code>collections.deque</code>. If you need fast membership tests, use a <code>set</code>.</p>`,
    clues: [
      '"process items in the order they arrived" / BFS / "queue" → <code>collections.deque</code> with <code>popleft()</code>, never <code>list.pop(0)</code> (O(n) each)',
      '"build up a result then return it" → <code>append</code> in a loop is fine (amortized O(1)); prepend with <code>insert(0, x)</code> is a red flag → append then <code>reverse()</code>',
      '"N ≤ 10<sup>5</sup>" and the code does <code>lst.insert(0, …)</code> / <code>lst.remove(…)</code> / <code>x in lst</code> inside a loop → hidden O(N²), likely TLE',
      '"random access by index", "update the i-th element" → list is perfect: O(1) get/set',
      '"memory-tight array of millions of numbers" → <code>array.array</code> or NumPy (packed C values) instead of a list of pointers to int objects',
      '"why is my append sometimes slow?" / "amortized analysis" → over-allocation + occasional resize copy'
    ],
    code: [{ lang: 'python', title: 'Watch capacity grow with sys.getsizeof (runnable)', run: true, code: `
import sys

lst = []
header = sys.getsizeof(lst)          # empty list: just the header (56 bytes on 64-bit CPython)
last = header
print("empty list bytes:", header)
for i in range(1, 41):
    lst.append(i)
    size = sys.getsizeof(lst)
    if size != last:                 # the block was re-allocated -> capacity changed
        capacity = (size - header) // 8   # each slot is an 8-byte pointer
        print(f"len={len(lst):>2}  new capacity={capacity:>2}  bytes={size}")
        last = size
` }, { lang: 'python', title: 'pop(0) shifts everything; deque.popleft does not (runnable timing)', run: true, code: `
from collections import deque
from time import perf_counter

N = 20_000

lst = list(range(N))
t0 = perf_counter()
while lst:
    lst.pop(0)            # O(n) each time: every remaining pointer shifts left
t_list = perf_counter() - t0

dq = deque(range(N))
t0 = perf_counter()
while dq:
    dq.popleft()          # O(1): deque is a linked list of fixed-size blocks
t_deque = perf_counter() - t0

print(f"list.pop(0) x {N}: {t_list * 1000:.1f} ms")
print(f"deque.popleft x {N}: {t_deque * 1000:.1f} ms")
print("deque faster?", t_deque < t_list)
` }],
    codeTitle: ['Capacity growth', 'pop(0) vs popleft'],
    viz: [{
      title: 'Append, append, append — watch the hidden capacity grow',
      input: '20',
      inputLabel: 'How many appends (1–200)',
      gen: function (input) {
        var n = nums(input, 'one whole number')[0];
        if (n < 1 || n > 200) throw new Error('Pick a number of appends between 1 and 200');
        var frames = [], cap = 0, size = 0, copies = 0, caps = [], labels = [];
        frames.push(fr('Start: <code>lst = []</code>. Length 0, capacity 0 — only the 56-byte list header exists, no pointer slots yet.', [
          vp({ 'len(lst)': 0, capacity: 0, 'sys.getsizeof': '56 bytes', 'pointers copied so far': 0 }),
          tx('Every append asks one question: <b>is there a spare slot?</b> Yes → write the pointer (O(1)). No → grab a bigger block, copy all pointers (O(n)), then write.')
        ]));
        for (var k = 1; k <= n; k++) {
          var resized = false, oldCap = cap, moved = 0;
          if (k > cap) {
            var na = (k + (k >> 3) + 6) & ~3;
            if (k - size > na - k) na = (k + 3) & ~3;
            moved = size; copies += size; cap = na; resized = true;
          }
          size = k;
          caps.push(cap); labels.push('#' + k);
          if (!(n <= 24 || resized || k === n || k % 10 === 0)) continue;
          var parts = [];
          if (cap <= 40) {
            var vals = [], hl = {};
            for (var s = 0; s < cap; s++) vals.push(s < size ? 'p' + s : '·');
            for (var s2 = 0; s2 < size - 1; s2++) if (resized) hl[s2] = 'cur';
            hl[size - 1] = 'ok';
            for (var s3 = size; s3 < cap; s3++) hl[s3] = 'done';
            parts.push({ type: 'array', label: 'pointer slots (p = pointer to an object, · = spare)', values: vals, hl: hl, showIdx: true });
          } else {
            parts.push(tx('Block now has <b>' + cap + '</b> slots: ' + size + ' used, ' + (cap - size) + ' spare (too wide to draw).', 'pointer slots'));
          }
          var from = Math.max(0, caps.length - 30);
          parts.push({ type: 'bars', label: 'capacity after each append (last 30)', values: caps.slice(from), idxLabels: labels.slice(from), hl: resized ? (function () { var h = {}; h[caps.length - 1 - from] = 'bad'; return h; })() : {} });
          parts.push(vp({ 'len(lst)': size, capacity: cap, spare: cap - size, 'sys.getsizeof': (56 + 8 * cap) + ' bytes', 'pointers copied so far': copies, 'copies per append': (copies / k).toFixed(2) }, resized ? 'capacity,pointers copied so far' : 'len(lst)', resized ? 'bad' : 'ok'));
          var narr = resized
            ? 'Append #' + k + ': the block was <b>full</b> (' + oldCap + ' slots). CPython reserves a new block of <b>' + cap + '</b> slots (≈ newsize + newsize/8 + 6, rounded down to a multiple of 4), copies <b>' + moved + '</b> pointers across, then writes the new one. <span class="c-r">This single append is O(n).</span>'
            : 'Append #' + k + ': a spare slot was waiting, so Python just writes the pointer into slot ' + (k - 1) + '. <span class="c-g">O(1) — no copying.</span>';
          frames.push(fr(narr, parts));
        }
        frames.push(fr('Done: <b>' + n + '</b> appends caused <b>' + copies + '</b> pointer copies in total — only <b>' + (copies / n).toFixed(2) + '</b> per append on average. Because each resize grows the block by a fixed fraction, total copying is bounded by a constant × n. That is <b>amortized O(1)</b> append.', [
          { type: 'bars', label: 'capacity history', values: caps.slice(Math.max(0, caps.length - 30)), idxLabels: labels.slice(Math.max(0, caps.length - 30)) },
          vp({ appends: n, 'total pointer copies': copies, 'average per append': (copies / n).toFixed(2), 'final capacity': cap, 'wasted spare slots': cap - n }, 'average per append', 'sel')
        ]));
        return frames;
      }
    }, {
      title: 'insert(i, x) and pop(0): every pointer after i must shift',
      input: '10 20 30 40 50 60; 1; 99',
      inputLabel: 'values ; insert index ; new value',
      gen: function (input) {
        var bits = String(input || '').split(';');
        if (bits.length !== 3) throw new Error('Format: values ; index ; new value   e.g. 10 20 30 ; 0 ; 99');
        var a = nums(bits[0]), idx = nums(bits[1], 'an index')[0], x = nums(bits[2], 'a number')[0];
        if (a.length > 12) throw new Error('Use at most 12 values');
        if (idx < 0 || idx > a.length) throw new Error('Index must be between 0 and ' + a.length);
        var frames = [], moves = 0, cap = a.length + 2, cur = a.slice();
        function slots(arr, hl, ptr) { var v = arr.slice(); while (v.length < cap) v.push('·'); return { type: 'array', label: 'lst (· = spare capacity)', values: v, hl: hl || {}, ptr: ptr || {}, showIdx: true }; }
        var code = 'lst.insert(' + idx + ', ' + x + ')\nlst.pop(0)';
        frames.push(fr('Start: <code>lst = ' + pyList(a) + '</code>. We want <code>lst.insert(' + idx + ', ' + x + ')</code>. Slot ' + idx + ' is occupied, so everything from index ' + idx + ' to the end must move one step right first.', [slots(cur), cp(code, 1)]));
        cur.push('·');
        for (var j = a.length - 1; j >= idx; j--) {
          cur[j + 1] = cur[j]; cur[j] = '·'; moves++;
          var hl = {}; hl[j + 1] = 'cur'; hl[j] = 'done';
          var ptr = {}; ptr[j + 1] = 'moved';
          frames.push(fr('Shift: copy the pointer in slot ' + j + ' into slot ' + (j + 1) + '. Moves so far: <b>' + moves + '</b>. (We start from the <b>end</b> so nothing gets overwritten.)', [slots(cur, hl, ptr), cp(code, 1), vp({ moves: moves })]));
        }
        cur[idx] = x;
        var hl2 = {}; hl2[idx] = 'ok';
        frames.push(fr('Slot ' + idx + ' is free → write <b>' + x + '</b>. Total moves = <b>' + moves + '</b> = len − index. Inserting at index 0 of a million-item list means a million moves: <b>O(n)</b>.', [slots(cur, hl2), cp(code, 1, 'ok'), vp({ moves: moves }, 'moves', 'bad')]));
        var removed = cur[0], m2 = 0;
        for (var k = 1; k < cur.length; k++) {
          cur[k - 1] = cur[k]; m2++;
          if (k === 1 || k === cur.length - 1) {
            var h3 = {}; h3[k - 1] = 'cur';
            frames.push(fr('<code>lst.pop(0)</code> removed <b>' + removed + '</b> from the front, so every remaining pointer slides left one slot to close the gap. Moves so far: <b>' + m2 + '</b>.', [slots(cur.slice(0, k).concat(cur.slice(k)), h3), cp(code, 2), vp({ 'pop(0) moves': m2 })]));
          }
        }
        cur.pop();
        frames.push(fr('pop(0) finished after <b>' + m2 + '</b> moves → O(n). In a loop of n pops that is O(n²). <code>collections.deque</code> keeps blocks linked at both ends, so <code>appendleft</code>/<code>popleft</code> are O(1).', [slots(cur), cp(code, 2, 'bad'), tx('Fix: <code>from collections import deque; q = deque(lst); q.popleft()</code>', 'Better tool')]));
        return frames;
      }
    }],
    examples: [
      { title: 'Predict the output: aliasing through append', html: `<p>What prints?</p><pre>a = [1, 2]
b = a
b.append(3)
print(a, a is b)</pre><p>${H.c('g', '[1, 2, 3] True')}. <code>b = a</code> copies the <b>reference</b>, not the list. One list, two names. <code>append</code> mutates that single list in place, so both names see 3.</p>`, code: { lang: 'python', run: true, code: `a = [1, 2]\nb = a\nb.append(3)\nprint(a, a is b)` } },
      { title: 'Build in reverse without insert(0, …)', html: `<p>You need the numbers 1..n in <b>descending</b> order and you read them ascending. <code>res.insert(0, x)</code> each time costs 0 + 1 + 2 + … + (n−1) ≈ n²/2 moves. Appending then reversing once is O(n) total.</p>${H.table(['Approach', 'n = 100 000', 'Big-O'], [['insert(0, x) in loop', '≈ 5 000 000 000 moves', H.c('r', 'O(n²)')], ['append + reverse()', '≈ 200 000 moves', H.c('g', 'O(n)')]])}`, code: { lang: 'python', run: true, code: `n = 8\nres = []\nfor x in range(1, n + 1):\n    res.append(x)        # O(1) amortized\nres.reverse()            # one O(n) pass, in place\nprint(res)` } },
      { title: 'Predict the output: slice assignment can grow a list', html: `<pre>a = [1, 2, 3]
a[1:2] = [7, 8, 9]
print(a, len(a))</pre><p>${H.c('g', '[1, 7, 8, 9, 3] 5')}. A slice on the <b>left</b> of <code>=</code> replaces that range with any number of items; the tail shifts to make room — O(n) like an insert.</p>`, code: { lang: 'python', run: true, code: `a = [1, 2, 3]\na[1:2] = [7, 8, 9]\nprint(a, len(a))` } },
      { title: 'Pre-sizing when you know n', html: `<p>If you will fill exactly n slots by index, create them once: <code>dp = [0] * (n + 1)</code>. That allocates the block with the <b>exact</b> size in one go — no repeated resizes and no <code>IndexError</code> from writing to <code>dp[i]</code> on an empty list.</p>`, code: { lang: 'python', run: true, code: `n = 10\ndp = [0] * (n + 1)\ndp[1] = 1\nfor i in range(2, n + 1):\n    dp[i] = dp[i - 1] + dp[i - 2]\nprint(dp[n], len(dp))` } }
    ],
    deepDive: `<p>🟣 <b>The exact growth rule.</b> In <code>Objects/listobject.c</code> (CPython 3.9+), <code>list_resize</code> computes <code>new_allocated = (newsize + (newsize &gt;&gt; 3) + 6) &amp; ~3</code> — about <b>1.125×</b> plus a constant, rounded down to a multiple of 4. If a single <code>extend</code> needs more than that, it allocates just enough (rounded up to 4). Older versions (≤ 3.8) used <code>newsize + (newsize &gt;&gt; 3) + (newsize &lt; 9 ? 3 : 6)</code>, giving the famous 0, 4, 8, 16, 25, 35, 46… sequence you may see in old blog posts. Java's <code>ArrayList</code> grows 1.5×, C++ <code>std::vector</code> usually 2× — Python deliberately wastes less memory per list.</p>
<p><b>Why amortized O(1) still holds with 1.125×.</b> With growth factor g, the total number of pointers ever copied while reaching n items is at most n/(g − 1). For g = 1.125 that is ≤ 8n, a constant per append. Larger g → fewer copies but more wasted spare slots. Also <code>realloc</code> can often grow the block <b>in place</b>, so many "resizes" copy nothing.</p>
<p><b>Shrinking.</b> When length drops below half the capacity, <code>list_resize</code> shrinks the block too, so a list that briefly held a million items does not keep all that memory forever.</p>
<p><b>Pointers, not values.</b> <code>[0] * 1_000_000</code> is 8 MB of pointers that all point to the <b>same</b> cached <code>0</code> object. A list of a million <i>different</i> ints also stores ~28 bytes per int object elsewhere. That is why <code>array.array('q')</code> (8 bytes per number, packed) or NumPy arrays are 3–4× smaller for numeric data and why <code>sum()</code> over NumPy is faster.</p>
<p><b>Other costs worth knowing:</b> slicing <code>lst[a:b]</code> copies b − a pointers (O(k), a shallow copy); <code>del lst[:k]</code> and <code>lst[:k] = []</code> shift the tail (O(n)); <code>lst.sort()</code> is Timsort (powersort merge policy since 3.11), O(n log n) worst, O(n) on already sorted runs; <code>lst.reverse()</code> is in-place O(n).</p>
<p><b>Concurrency reality (2026).</b> Under the GIL, a single <code>append</code> is effectively atomic. In free-threaded builds (PEP 703, officially supported since 3.14), lists use per-object locking so single operations stay safe, but <b>compound</b> actions like <code>if x not in lst: lst.append(x)</code> are never atomic — use a lock or a thread-safe queue.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> Copilot-style tools write list code instantly, so the skill that matters is <b>spotting hidden O(n) operations</b> in code you did not type. AI-generated BFS often uses <code>queue = [start]</code> with <code>queue.pop(0)</code> — it works on the example and times out on a 10<sup>5</sup>-node graph.</p>
<p><b>Use AI as a partner:</b> ask "<i>list every operation in this function with its CPython time complexity and flag anything O(n) inside a loop</i>", or "<i>write a timeit benchmark comparing pop(0) and deque.popleft for n = 10<sup>3</sup>, 10<sup>4</sup>, 10<sup>5</sup></i>". Then run it — numbers beat opinions.</p>
<p><b>Where AI goes wrong:</b> it often claims Python lists "double in size like vectors" (they grow ~12.5%), quotes stale growth sequences from pre-3.9 posts, or "optimizes" by pre-allocating <code>[None] * n</code> then appending (now you have 2n items). It may also suggest <code>insert(0, x)</code> to "keep order" when append + reverse is linear.</p>
<p><b>What you must still own:</b> the mental model — contiguous pointer array, amortized resize, shifting cost — so you can explain in an interview <i>why</i> a solution is O(n²) and choose deque/set/array/NumPy deliberately.</p>`,
    problems: [{
      title: 'Rotate a List Right by k (without O(n·k) shifting)',
      level: 'Easy', tags: ['list', 'slicing', 'amortized'], companies: ['Microsoft', 'Amazon', 'Adobe'],
      statement: `<p>Given a list <code>nums</code> and a non-negative integer <code>k</code>, rotate the list to the <b>right</b> by <code>k</code> steps <b>in place</b> (the caller's list object must change) and also return it.</p>`,
      constraints: `1 ≤ len(nums) ≤ 10<sup>5</sup>, 0 ≤ k ≤ 10<sup>9</sup>`,
      example: `<p>nums = ${H.arr([1, 2, 3, 4, 5, 6, 7])} k = 3 → ${H.arr([5, 6, 7, 1, 2, 3, 4], { hl: { 0: 'g', 1: 'g', 2: 'g' } })}</p><p>The last 3 items ${H.c('g', '5, 6, 7')} wrap around to the front. k can be larger than n: rotating by n changes nothing, so only <code>k % n</code> matters.</p>`,
      brute: { why: `<p>Repeat k times: <code>pop()</code> the last item and <code>insert(0, …)</code> it. Each insert(0) shifts n pointers → O(n·k). With n = 10<sup>5</sup> and k up to 10<sup>9</sup> this never finishes (even with k % n it is up to 10<sup>10</sup> moves).</p>`, code: `
def rotate_brute(nums, k):
    for _ in range(k % len(nums)):
        nums.insert(0, nums.pop())   # insert(0) is O(n) -> O(n*k) overall
    return nums

print(rotate_brute([1, 2, 3, 4, 5, 6, 7], 3))` },
      mcq: { q: 'Which line rotates in place in O(n) while keeping the same list object?', options: ['<code>nums = nums[-k:] + nums[:-k]</code>', '<code>nums[:] = nums[-k:] + nums[:-k]</code>', '<code>nums.insert(0, nums.pop())</code> k times', '<code>nums.sort()</code>'], answer: 1, explain: 'Option A rebinds the local name to a NEW list, so the caller never sees it. Slice assignment <code>nums[:] = …</code> replaces the contents of the same object. Note: k must be reduced with k % n first, and k == 0 needs care because nums[-0:] is the whole list.' },
      hints: [`<p>Hint 1: Rotating by n gives back the same list, so reduce <code>k = k % n</code> first. When k becomes 0, return early.</p>`, `<p>Hint 2: The answer is just two slices glued together: the last k items followed by the first n − k items. Slicing copies pointers once — O(n).</p>`, `<p>Hint 3: To mutate the caller's list, assign into a full slice: <code>nums[:] = …</code>. Plain <code>nums = …</code> only rebinds your local name. Recipe: n = len; k %= n; if k: nums[:] = nums[-k:] + nums[:-k]; return nums.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_run',
        cases: [
          [
            [
              'nums = [1, 2, 3, 4, 5, 6, 7]\n' +
                'r = rotate(nums, 3)\n' +
                'result = [nums, r is nums]'
            ],
            [[5, 6, 7, 1, 2, 3, 4], true]
          ],
          [
            [
              'nums = [1, 2, 3, 4, 5, 6, 7]\n' +
                'r = rotate(nums, 10)\n' +
                'result = [nums, r is nums]'
            ],
            [[5, 6, 7, 1, 2, 3, 4], true]
          ],
          [
            [
              'nums = [1, 2, 3]\n' +
                'r = rotate(nums, 0)\n' +
                'result = [nums, r is nums]'
            ],
            [[1, 2, 3], true]
          ],
          [['nums = [1]\nr = rotate(nums, 100)\nresult = [nums, r is nums]'], [[1], true]],
          [['nums = [1, 2]\nr = rotate(nums, 5)\nresult = [nums, r is nums]'], [[2, 1], true]],
          [
            [
              'nums = [1, 2, 3, 4]\n' +
                'r = rotate(nums, 4)\n' +
                'result = [nums, r is nums]'
            ],
            [[1, 2, 3, 4], true]
          ],
          [['nums = [5, 6]\nr = rotate(nums, 1)\nresult = [nums, r is nums]'], [[6, 5], true]],
          [
            [
              'nums = [1, 2, 3]\n' +
                'r = rotate(nums, 1000000000)\n' +
                'result = [nums, r is nums]'
            ],
            [[3, 1, 2], true]
          ],
          [
            [
              'nums = [-1, 0, 1]\n' +
                'r = rotate(nums, 2)\n' +
                'result = [nums, r is nums]'
            ],
            [[0, 1, -1], true]
          ],
          [
            [
              'nums = [1, 1, 2]\n' +
                'r = rotate(nums, 1)\n' +
                'result = [nums, r is nums]'
            ],
            [[2, 1, 1], true]
          ],
          [
            [
              'nums = list(range(100000))\n' +
                'r = rotate(nums, 999999999)\n' +
                'result = [nums[0], nums[1], nums[-1], len(nums), r is nums, nums[5000]]'
            ],
            [1, 2, 0, 100000, true, 5001]
          ],
          [
            [
              'nums = list(range(100000))\n' +
                'alias = nums\n' +
                'rotate(nums, 7)\n' +
                'result = [alias[:3], alias[-1]]'
            ],
            [[99993, 99994, 99995], 99992]
          ]
        ],
        harness: {
          python: 'def t_run(src):\n' +
            '    ns = dict(globals())\n' +
            '    try:\n' +
            '        exec(src, ns)\n' +
            '        return ns[\'result\']\n' +
            '    except Exception as e:\n' +
            '        return \'!\' + type(e).__name__'
        }
      },
      solution: {
        approach: `<p>Reduce k modulo n, build the rotated sequence from two slices (each slice is a shallow O(k) pointer copy), and write it back with slice assignment so the original object is updated. An O(1)-extra-space alternative uses the three-reversal trick.</p>`,
        code: `
def rotate(nums, k):
    n = len(nums)
    k %= n                      # rotating by n is a no-op
    if k:                       # careful: nums[-0:] would be the WHOLE list
        nums[:] = nums[-k:] + nums[:-k]   # slice assignment mutates in place
    return nums

data = [1, 2, 3, 4, 5, 6, 7]
alias = data
rotate(data, 3)
print(data, alias is data)      # same object, rotated
print(rotate([1, 2], 5))`,
        alt: [{ lang: 'python', title: 'O(1) extra space: three reversals', code: `
def rotate_reverse(nums, k):
    n = len(nums)
    k %= n

    def rev(lo, hi):            # reverse nums[lo..hi] in place with two pointers
        while lo < hi:
            nums[lo], nums[hi] = nums[hi], nums[lo]
            lo += 1
            hi -= 1

    rev(0, n - 1)               # 7 6 5 4 3 2 1
    rev(0, k - 1)               # 5 6 7 | 4 3 2 1
    rev(k, n - 1)               # 5 6 7 | 1 2 3 4
    return nums

print(rotate_reverse([1, 2, 3, 4, 5, 6, 7], 3))` }],
        dry: { head: ['step', 'k', 'nums[-k:]', 'nums[:-k]', 'nums after'], rows: [['reduce', '3 % 7 = 3', '—', '—', '[1,2,3,4,5,6,7]'], ['slice', '3', '[5,6,7]', '[1,2,3,4]', '—'], ['assign', '3', '—', '—', '<span class="c-g">[5,6,7,1,2,3,4]</span>']] },
        complexity: `<p>Time O(n): two slices + one concatenation + one slice assignment, each linear. Extra space O(n) for the temporary list (O(1) with the three-reversal version).</p>`,
        followUps: ['Rotate left instead of right', 'Why does <code>collections.deque.rotate(k)</code> exist and what is its cost?', 'What happens if you forget the k == 0 check?']
      }
    }]
  });

  /* ================= TOPIC 2: dict = compact hash table ================= */
  topics.push({
    title: 'dict Internals: Hashing, Slots, Collisions & Why Insertion Order Is Kept',
    analogy: `<p>Picture a <b>coat check</b> at a theatre. You hand over your coat; the attendant computes a number from your ticket (the <b>hash</b>), walks straight to that hook, and hangs it. To get it back, she computes the same number and walks straight there — no searching through every coat. If the hook is already taken by someone else's coat (a <b>collision</b>), she follows a fixed rule to try other hooks until she finds a free one.</p>
<p>Modern Python adds a twist: besides the hooks, she keeps a <b>logbook</b> listing coats in the order they arrived. The hooks only store "line number in the logbook". That logbook is why a <code>dict</code> remembers insertion order.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A <code>dict</code> maps <b>keys → values</b> and can find a key in <b>O(1) on average</b>, no matter whether it holds 10 or 10 million items. It does this with a <b>hash table</b>:</p>
<ol><li>Python calls <code>hash(key)</code> → a big integer. (For small non-negative ints, <code>hash(n) == n</code>.)</li>
<li>It keeps only the low bits: <code>slot = hash &amp; (size − 1)</code>. With 8 slots, <code>hash(18) &amp; 7 = 2</code>.</li>
<li>If that slot is free, done. If it is taken by a <b>different</b> key, that is a <b>collision</b>: Python jumps to another slot with the rule <code>slot = (5·slot + 1 + perturb) &amp; mask</code>, where <code>perturb</code> mixes in higher bits of the hash. This is called <b>open addressing</b> — all keys live in one table, no linked lists.</li></ol>
<p><b>The compact layout (since 3.6):</b> a dict is really <b>two arrays</b>:</p>
${H.table(['Array', 'Holds', 'Order'], [['<b>indices</b> (sparse)', 'small ints: "entry #k" or EMPTY / DUMMY', 'by hash slot'], ['<b>entries</b> (dense)', '(hash, key, value) triples', H.c('g', 'by insertion time')]])}
<p>Iterating a dict walks the <b>entries</b> array, so you get keys in the order you inserted them. Since <b>Python 3.7</b> this order is a <b>language guarantee</b>, not an accident. Re-assigning an existing key keeps its position; deleting and re-inserting moves it to the end.</p>
<p><b>Staying fast:</b> the table never gets more than about <b>2/3 full</b>. When the entries array is used up, Python builds a bigger table (≈ 3 × the live keys, rounded up to a power of two) and re-inserts everything — an O(n) step that happens rarely, so inserts are <b>amortized O(1)</b>.</p>
<p><b>Keys must be hashable:</b> their hash must never change while they are in the dict. Immutable built-ins (<code>int</code>, <code>str</code>, <code>tuple</code> of hashables, <code>frozenset</code>) are hashable; <code>list</code>, <code>dict</code> and <code>set</code> are not. And the golden rule: <b>if <code>a == b</code> then <code>hash(a) == hash(b)</code></b>. That is why <code>1</code>, <code>1.0</code> and <code>True</code> are the <b>same key</b>.</p>`,
    clues: [
      '"count occurrences / frequency / how many times" → dict (or <code>collections.Counter</code>), O(1) per update',
      '"have I seen this value before and where?" → dict value → index (Two Sum pattern)',
      '"return results in the order they first appeared" → plain dict keeps insertion order (3.7+), no need for OrderedDict',
      '"group items by a property" → dict of lists / <code>defaultdict(list)</code> with a hashable key (tuple, frozenset, sorted string)',
      '"use a list/point/set as a key" → convert to <code>tuple</code> / <code>frozenset</code> first; lists are unhashable',
      '"worst case of dict lookup?" / "hash flooding" → O(n) when keys collide; hash randomization for str/bytes defends against it'
    ],
    code: [{ lang: 'python', title: 'Ordering rules, equal keys and growth (runnable)', run: true, code: `
import sys

d = {"b": 1, "a": 2}
d["b"] = 99                  # updating an existing key keeps its position
print(list(d))               # ['b', 'a']
del d["b"]
d["b"] = 1                   # delete + re-insert moves it to the end
print(list(d))               # ['a', 'b']

# 1, 1.0 and True are equal AND hash the same -> one key; first key object is kept
print({1: "int", 1.0: "float", True: "bool"})

print(hash(10), hash(-1), hash(2**61 - 1))   # small ints hash to themselves (-1 is special)

# watch the table grow: 8 slots hold 5 keys, 16 slots hold 10 keys ...
g, last = {}, None
for i in range(12):
    g[i] = i
    size = sys.getsizeof(g)
    if size != last:
        print(f"{len(g):>2} keys -> {size} bytes")
        last = size
` }, { lang: 'python', title: 'A terrible __hash__ makes dict O(n) per lookup (runnable)', run: true, code: `
from time import perf_counter

class GoodKey:
    def __init__(self, v):
        self.v = v
    def __eq__(self, other):
        return isinstance(other, type(self)) and self.v == other.v
    def __hash__(self):
        return hash(self.v)          # equal objects -> equal hashes, well spread

class BadKey(GoodKey):
    def __hash__(self):
        return 42                    # legal but awful: every key collides

for cls in (GoodKey, BadKey):
    t0 = perf_counter()
    d = {cls(i): i for i in range(1500)}   # each insert probes past all earlier keys
    ms = (perf_counter() - t0) * 1000
    print(f"{cls.__name__}: built {len(d)} keys in {ms:.1f} ms")
` }],
    codeTitle: ['Order + equal keys + growth', 'Collisions cost'],
    viz: {
      title: 'Inside a dict: indices table, entries log, probing, deletion and resize',
      input: '10 3 18 26 get 18 del 3 42 7',
      inputLabel: 'ops: N = d[N] = …,  get N,  del N  (keys 0–9999)',
      gen: function (input) {
        var toks = String(input || '').trim().split(/[\s,]+/).filter(function (x) { return x.length; });
        var ops = [];
        for (var t = 0; t < toks.length; t++) {
          var op = 'set', tok = toks[t];
          if (tok === 'get' || tok === 'del') { op = tok; tok = toks[++t]; }
          var k = Number(tok);
          if (tok === undefined || isNaN(k) || Math.floor(k) !== k || k < 0 || k > 9999) throw new Error('Use keys 0–9999, e.g.  10 3 18 get 18 del 3 42');
          ops.push({ op: op, k: k });
        }
        if (!ops.length) throw new Error('Type at least one key, e.g.  10 3 18');
        if (ops.length > 12) throw new Error('Use at most 12 operations');
        var EMPTY = -1, DUMMY = -2, size = 8, idx = [], entries = [], used = 0, usable = 5, letters = 'abcdefghijklmnop', li = 0, frames = [];
        for (var z = 0; z < size; z++) idx.push(EMPTY);
        function grid(hl) {
          var row = idx.map(function (ix) { return ix === EMPTY ? '—' : ix === DUMMY ? 'DUMMY' : '#' + ix; });
          var ch = []; for (var c = 0; c < size; c++) ch.push(String(c));
          var h = {}; Object.keys(hl || {}).forEach(function (s) { h['0,' + s] = hl[s]; });
          return { type: 'grid', label: 'indices table (' + size + ' slots, mask = ' + (size - 1) + ')', colHead: ch, rowHead: ['entry #'], rows: [row], hl: h };
        }
        function ents(hlRow) {
          var rows = entries.map(function (e, i) { return e ? ['#' + i, String(e.k), String(e.k), "'" + e.v + "'"] : ['#' + i, '—', 'hole (deleted)', '—']; });
          var h = {}; if (hlRow !== undefined && hlRow !== null) h[hlRow] = 'cur';
          return { type: 'table', label: 'entries array (insertion order) — usable left: ' + usable, columns: ['#', 'hash', 'key', 'value'], rows: rows, hl: h };
        }
        function repr() { return '{' + entries.filter(Boolean).map(function (e) { return e.k + ": '" + e.v + "'"; }).join(', ') + '}'; }
        function lookup(k, verb) {
          var mask = size - 1, i = k & mask, perturb = k, steps = 0;
          while (true) {
            var ix = idx[i], h = {};
            steps++;
            if (ix === EMPTY) {
              h[i] = 'ok';
              frames.push(fr(verb + ' ' + k + ': slot <b>' + i + '</b> is EMPTY → key ' + k + ' is <b>not</b> in the dict (' + steps + ' probe' + (steps > 1 ? 's' : '') + ').', [grid(h), ents(null), vp({ 'hash(k)': k, slot: i, perturb: perturb, probes: steps })]));
              return { found: false, slot: i };
            }
            if (ix >= 0 && entries[ix].k === k) {
              h[i] = 'sel';
              frames.push(fr(verb + ' ' + k + ': slot <b>' + i + '</b> → entry #' + ix + ' whose key is ' + k + ' → <span class="c-g">match</span> after ' + steps + ' probe' + (steps > 1 ? 's' : '') + '.', [grid(h), ents(ix), vp({ 'hash(k)': k, slot: i, probes: steps }, 'probes')]));
              return { found: true, slot: i, ix: ix };
            }
            h[i] = 'bad';
            var why = ix === DUMMY ? 'a DUMMY (a deleted key used to live here) — keep probing, the key might be further along the chain' : 'entry #' + ix + ' with key ' + entries[ix].k + ' ≠ ' + k + ' → <span class="c-r">collision</span>';
            perturb = Math.floor(perturb / 32);
            var ni = (i * 5 + perturb + 1) & mask;
            frames.push(fr(verb + ' ' + k + ': slot <b>' + i + '</b> holds ' + why + '. Next slot = (5·' + i + ' + 1 + perturb ' + perturb + ') &amp; ' + mask + ' = <b>' + ni + '</b>.', [grid(h), ents(ix >= 0 ? ix : null), vp({ 'hash(k)': k, slot: i, 'perturb (>>5)': perturb, 'next slot': ni })]));
            i = ni;
          }
        }
        function emptySlot(k) { var mask = size - 1, i = k & mask, perturb = k; while (idx[i] >= 0) { perturb = Math.floor(perturb / 32); i = (i * 5 + perturb + 1) & mask; } return i; }
        frames.push(fr('An empty dict starts with <b>8</b> index slots and room for <b>5</b> entries (2/3 of 8). For small ints, <code>hash(n) == n</code>, so we can predict every slot exactly.', [grid({}), ents(null), vp({ 'len(d)': 0, usable: 5 })]));
        ops.forEach(function (o) {
          if (o.op === 'get') { var r = lookup(o.k, '<code>d[' + o.k + ']</code>'); if (!r.found) frames.push(fr('<code>d[' + o.k + ']</code> would raise <b>KeyError</b> (use <code>d.get(' + o.k + ')</code> for None).', [grid({}), ents(null)])); else frames.push(fr('<code>d[' + o.k + ']</code> returns <b>\'' + entries[r.ix].v + '\'</b> — O(1) on average because only a few slots were checked.', [grid({}), ents(r.ix), tx(repr(), 'd')])); return; }
          if (o.op === 'del') {
            var rd = lookup(o.k, '<code>del d[' + o.k + ']</code>');
            if (!rd.found) { frames.push(fr('Key ' + o.k + ' missing → <code>del</code> raises <b>KeyError</b>. Nothing changes.', [grid({}), ents(null)])); return; }
            idx[rd.slot] = DUMMY; entries[rd.ix] = null; used--;
            var hd = {}; hd[rd.slot] = 'bad';
            frames.push(fr('Deleted: slot ' + rd.slot + ' becomes <b>DUMMY</b>, not EMPTY — otherwise a later lookup for a key that collided past this slot would stop early and wrongly say "missing". Entry #' + rd.ix + ' becomes a hole; order of the others is untouched.', [grid(hd), ents(rd.ix), tx(repr(), 'd now'), vp({ 'len(d)': used, usable: usable })]));
            return;
          }
          var rs = lookup(o.k, '<code>d[' + o.k + '] = …</code>');
          var v = letters[li++ % letters.length];
          if (rs.found) {
            entries[rs.ix].v = v;
            frames.push(fr('Key already present → only the <b>value</b> is replaced (now \'' + v + '\'). Its position in the entries log does not move.', [grid({}), ents(rs.ix), tx(repr(), 'd now')]));
            return;
          }
          if (usable <= 0) {
            var live = entries.filter(Boolean), ns = 8;
            while (ns < used * 3) ns *= 2;
            frames.push(fr('No usable entry left (holes from deletions still count!). <b>Resize</b>: new size = smallest power of 2 ≥ 3 × ' + used + ' live keys = <b>' + ns + '</b>. Every live key is re-inserted; holes and DUMMYs vanish.', [grid({}), ents(null), vp({ 'live keys': used, 'new size': ns, 'new usable': Math.floor(ns * 2 / 3) }, 'new size', 'bad')]));
            size = ns; idx = []; for (var q = 0; q < size; q++) idx.push(EMPTY);
            entries = live; usable = Math.floor(ns * 2 / 3) - live.length;
            entries.forEach(function (e, ei) { idx[emptySlot(e.k)] = ei; });
            frames.push(fr('After the resize: ' + size + ' slots, entries compacted in the <b>same order</b>. Keys landed in new slots because the mask changed (' + (size - 1) + ' now).', [grid({}), ents(null), vp({ 'len(d)': used, usable: usable })]));
          }
          var slot = emptySlot(o.k), hs = {};
          idx[slot] = entries.length; entries.push({ k: o.k, v: v }); used++; usable--;
          hs[slot] = 'ok';
          frames.push(fr('Insert ' + o.k + ': first EMPTY/DUMMY slot on its probe path is <b>' + slot + '</b>. Append (' + o.k + ', \'' + v + '\') to the entries log as #' + (entries.length - 1) + ' and store that number in slot ' + slot + '.', [grid(hs), ents(entries.length - 1), tx(repr(), 'd now — printing follows the entries log'), vp({ 'len(d)': used, usable: usable }, 'len(d)')]));
        });
        frames.push(fr('Final dict: <code>' + repr() + '</code>. Iteration order = entries order = insertion order, completely independent of which slots the keys hashed to.', [grid({}), ents(null), tx(repr(), 'print(d)')]));
        return frames;
      }
    },
    examples: [
      { title: 'Predict the output: equal keys collapse', html: `<pre>d = {True: 'a', 1: 'b', 1.0: 'c'}
print(d)</pre><p>${H.c('g', "{True: 'c'}")}. All three keys are equal and hash to 1. The <b>first key object</b> (<code>True</code>) is kept; each later assignment only replaces the <b>value</b>.</p>`, code: { lang: 'python', run: true, code: `d = {True: 'a', 1: 'b', 1.0: 'c'}\nprint(d, len(d))` } },
      { title: 'Predict the output: changing a dict while looping', html: `<pre>d = {'a': 1, 'b': 2}
for k in d:
    d[k + '!'] = 0</pre><p>${H.c('r', 'RuntimeError: dictionary changed size during iteration')}. Adding or removing keys could trigger a resize mid-loop, so Python refuses. Loop over a snapshot instead: <code>for k in list(d):</code>. (Changing <b>values</b> of existing keys is fine.)</p>`, code: { lang: 'python', run: true, code: `d = {'a': 1, 'b': 2}\ntry:\n    for k in d:\n        d[k + '!'] = 0\nexcept RuntimeError as e:\n    print('RuntimeError:', e)\nd = {'a': 1, 'b': 2}       # start fresh (the failed loop added 'a!')\nfor k in list(d):          # snapshot of keys\n    d[k + '!'] = 0\nprint(d)` } },
      { title: 'Unhashable key? Freeze it.', html: `<p><code>seen[[1, 2]] = True</code> raises <b>TypeError: unhashable type: 'list'</b>. A list can change, so its hash could change and the key would be lost in the wrong slot. Use <code>tuple([1, 2])</code> for ordered data or <code>frozenset(...)</code> when order does not matter.</p>`, code: { lang: 'python', run: true, code: `seen = {}\npoint = [1, 2]\ntry:\n    seen[point] = True\nexcept TypeError as e:\n    print('TypeError:', e)\nseen[tuple(point)] = True\nseen[frozenset({'x', 'y'})] = 'pair'\nprint(seen)` } },
      { title: 'Counting the Pythonic way', html: `<p>Three equivalent counters, from manual to batteries-included:</p>${H.table(['Style', 'Code'], [['manual', '<code>d[w] = d.get(w, 0) + 1</code>'], ['defaultdict', '<code>d = defaultdict(int); d[w] += 1</code>'], ['Counter', '<code>Counter(words).most_common(2)</code>']])}<p>All are O(n) total; <code>Counter</code> is a dict subclass, so it also keeps first-seen order for ties.</p>`, code: { lang: 'python', run: true, code: `from collections import Counter, defaultdict\nwords = 'the cat and the hat and the bat'.split()\nd = {}\nfor w in words:\n    d[w] = d.get(w, 0) + 1\ndd = defaultdict(int)\nfor w in words:\n    dd[w] += 1\nprint(d == dd, Counter(words).most_common(2))` } }
    ],
    deepDive: `<p>🟣 <b>Real CPython details.</b> <code>Objects/dictobject.c</code> stores a <code>PyDictKeysObject</code> with an <b>indices</b> array whose element width adapts to the table size (int8 for ≤ 128 slots, then int16/int32/int64) followed by the dense <b>entries</b> array. That compact design (Raymond Hettinger's idea, shipped in 3.6) cut dict memory by 20–25% and made ordering free. Lookup: <code>i = hash &amp; mask; perturb = hash</code>, then repeatedly <code>perturb &gt;&gt;= 5; i = (5*i + perturb + 1) &amp; mask</code>. The 5i + 1 recurrence alone visits every slot of a power-of-two table; <code>perturb</code> makes higher hash bits matter so keys sharing low bits spread out.</p>
<p><b>Load factor and growth.</b> <code>USABLE_FRACTION(n) = 2n/3</code>. Insertion consumes "usable" even after deletions (holes stay until a resize). On overflow, <code>GROWTH_RATE = used × 3</code> picks the new size (next power of two). Deleted slots become <b>DUMMY</b> tombstones so probe chains are not broken; lookups skip them, insertions may reuse them.</p>
<p><b>Specialisations:</b> dicts whose keys are all <code>str</code> use a slimmer entry layout (no stored hash — the str caches its own). Instance <code>__dict__</code>s share one keys table across objects of a class (key-sharing dicts, PEP 412), and 3.11+ goes further with inline "managed" dicts; <code>__slots__</code> removes the dict entirely.</p>
<p><b>Hashing.</b> <code>int</code> hashes are the value modulo the Mersenne prime 2<sup>61</sup> − 1, except −1 maps to −2 (−1 means "error" in C). <code>float</code> hashes agree with <code>int</code> for integral values. <code>str</code>/<code>bytes</code> use SipHash-1-3 (default since 3.11) with a <b>random per-process seed</b> (PEP 456), so string hash values — and set iteration order of strings — differ between runs unless <code>PYTHONHASHSEED</code> is fixed. This stops "hash-flooding" denial-of-service attacks that force every key into one probe chain (O(n) per op, O(n²) overall).</p>
<p><b>Identity shortcut:</b> lookups compare <code>is</code> before <code>==</code>, which is why <code>d[nan]</code> works with the <i>same</i> NaN object even though <code>nan != nan</code>.</p>
<p><b>Ordered containers:</b> <code>OrderedDict</code> still exists for <code>move_to_end()</code>, <code>popitem(last=False)</code> and order-sensitive equality (plain dicts compare equal regardless of order). Since 3.9 dicts support <code>|</code> and <code>|=</code> merges.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI will happily produce dict-heavy solutions (Counter, defaultdict, Two Sum maps) in seconds. Your value is <b>verifying assumptions</b>: is the key really hashable and stable? Is order relied on? Could keys collide on purpose (user-controlled input)?</p>
<p><b>Use AI as a partner:</b> "<i>Write a custom class for (lat, lon) keys with correct __eq__ and __hash__; then generate tests showing equal objects hash equal</i>" or "<i>explain why this dataclass is unhashable</i>" (a regular <code>@dataclass</code> with <code>eq=True</code> sets <code>__hash__ = None</code> unless <code>frozen=True</code>).</p>
<p><b>Where AI goes wrong:</b> it still writes <code>OrderedDict</code> "to keep insertion order" (unneeded since 3.7), claims dicts use <b>chaining</b> like Java's HashMap (CPython uses open addressing), mutates a dict while iterating, or uses a mutable object whose hash depends on mutable fields — the key silently "disappears" after a change.</p>
<p><b>What you must still own:</b> the hash/eq contract, average vs worst-case cost, and the ability to sketch indices + entries on a whiteboard when an interviewer asks "how does a Python dict work?"</p>`,
    problems: [{
      title: 'First Unique Character (use dict ordering)',
      level: 'Easy', tags: ['dict', 'counting', 'ordering'], companies: ['Amazon', 'Bloomberg', 'Goldman Sachs'],
      statement: `<p>Given a string <code>s</code>, return the <b>index</b> of the first character that appears exactly once. If none exists, return <code>-1</code>.</p>`,
      constraints: `1 ≤ len(s) ≤ 10<sup>5</sup>, lowercase English letters`,
      example: `<p>s = "leetcode" → ${H.c('g', '0')} ('l' appears once). s = "loveleetcode" → ${H.c('g', '2')} ('v'). s = "aabb" → ${H.c('r', '-1')}.</p>`,
      brute: { why: `<p>For every index i, call <code>s.count(s[i])</code> — that rescans the whole string each time → O(n²) = 10<sup>10</sup> character checks in the worst case.</p>`, code: `
def first_unique_brute(s):
    for i, ch in enumerate(s):
        if s.count(ch) == 1:      # O(n) scan for every i -> O(n^2)
            return i
    return -1

print(first_unique_brute("loveleetcode"))` },
      mcq: { q: 'After counting with a dict built in one pass, how do we find the FIRST unique character fastest?', options: ['Sort the dict keys', 'Iterate the dict: keys come back in first-seen order (3.7+)', 'Pick a random key with count 1', 'Use max(d.values())'], answer: 1, explain: 'A dict iterates in insertion order, which here equals first-occurrence order. If we also store each char\'s first index, the first key with count 1 is the answer — scanning at most 26 keys.' },
      hints: [`<p>Hint 1: One pass is enough to know, for every character, how many times it appears and where it first appeared.</p>`, `<p>Hint 2: Store <code>info[ch] = [first_index, count]</code> in a dict. Because dicts keep insertion order, iterating <code>info</code> visits characters in order of their first appearance.</p>`, `<p>Hint 3: Edge cases: every char repeated → -1; single-char string → 0. Recipe: build info; for ch, (i, c) in info.items(): if c == 1: return i; return -1.</p>`],
      tests: {
        sig: 'string -> int',
        fn: 'firstUnique',
        cases: [
          [['leetcode'], 0],
          [['loveleetcode'], 2],
          [['aabb'], -1],
          [['z'], 0],
          [['aa'], -1],
          [['abcabcd'], 6],
          [['abab'], -1],
          [['zxyzx'], 2],
          [[{ $concat: [{ $rep: 'a', n: 50000 }, 'b', { $rep: 'a', n: 49999 }] }], 50000],
          [[{ $rep: 'zz', n: 50000 }], -1]
        ]
      },
      solution: {
        approach: `<p>One pass fills a dict with the first index and count of each character. A second pass over the <b>dict</b> (≤ 26 keys) — not over the string — returns the first character whose count is 1. Insertion order makes "first" correct.</p>`,
        code: `
def first_unique(s):
    info = {}                          # ch -> [first_index, count], insertion-ordered
    for i, ch in enumerate(s):
        if ch in info:
            info[ch][1] += 1
        else:
            info[ch] = [i, 1]
    for ch, (first, count) in info.items():   # first-seen order
        if count == 1:
            return first
    return -1

for s in ["leetcode", "loveleetcode", "aabb", "z"]:
    print(s, first_unique(s))`,
        alt: [{ lang: 'python', title: 'Counter version', code: `
from collections import Counter

def first_unique(s):
    counts = Counter(s)                 # O(n)
    for i, ch in enumerate(s):          # second pass over the string
        if counts[ch] == 1:
            return i
    return -1

print(first_unique("loveleetcode"))` }],
        dry: { head: ['i', 'ch', 'info after step'], rows: [['0', 'l', "{l:[0,1]}"], ['1', 'o', "{l:[0,1], o:[1,1]}"], ['2', 'v', "{l, o, v:[2,1]}"], ['4', 'l', "{l:[0,2], o, v, e}"], ['…', '…', 'o → count 2, e → count 4'], ['scan', 'l→2, o→2, v→1', '<span class="c-g">return 2</span>']] },
        complexity: `<p>Time O(n) + O(σ) where σ ≤ 26 distinct chars. Space O(σ).</p>`,
        followUps: ['Stream version: characters arrive one by one; report the first unique so far after each one', 'What if the alphabet is all of Unicode?']
      }
    }]
  });

  /* ================= TOPIC 3: set = keys-only hash table ================= */
  topics.push({
    title: 'set & frozenset: Keys-Only Hash Tables, Fast Membership, "Random-Looking" Order',
    analogy: `<p>A <code>set</code> is a <b>guest list at the door</b>. The bouncer does not care in which order people arrived and never writes anyone twice — he only needs to answer one question super fast: "<b>Is this name on the list?</b>" He files names by a code derived from the name (the hash), so he can check instantly instead of reading the whole list.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A <code>set</code> stores <b>unique, hashable</b> items with no values attached. Like a dict it is a hash table, so these are <b>O(1) on average</b>:</p>
${H.table(['Operation', 'Code', 'Average cost'], [['add', '<code>s.add(x)</code>', 'O(1)'], ['membership', '<code>x in s</code>', H.c('g', 'O(1)') + ' (list: ' + H.c('r', 'O(n)') + ')'], ['remove', '<code>s.remove(x)</code> / <code>s.discard(x)</code>', 'O(1)'], ['union', '<code>a | b</code>', 'O(len(a) + len(b))'], ['intersection', '<code>a &amp; b</code>', 'O(min(len(a), len(b)))'], ['difference', '<code>a - b</code>', 'O(len(a))'], ['symmetric difference', '<code>a ^ b</code>', 'O(len(a) + len(b))'], ['subset test', '<code>a &lt;= b</code>', 'O(len(a))']])}
<p><b>Order is NOT guaranteed.</b> Unlike dict, a set has no entries log — iteration walks the hash slots. For small ints (<code>hash(n) == n</code>) that <i>often</i> looks sorted, which fools beginners: <code>{5, 1, 3}</code> prints <code>{1, 3, 5}</code>, but <code>{8, 1}</code> prints <code>{8, 1}</code> because 8 lands in slot 0 of an 8-slot table. String sets change order between runs (hash randomization). <b>Never rely on set order</b>; use <code>sorted(s)</code> or <code>dict.fromkeys(items)</code> for ordered de-duplication.</p>
<p><b>Creating sets:</b> <code>{1, 2}</code>, <code>set(iterable)</code>, set comprehension <code>{x % 3 for x in nums}</code>. Careful: <code>{}</code> is an <b>empty dict</b>; an empty set is <code>set()</code>.</p>
<p><b>frozenset</b> is the immutable twin: hashable, so it can be a dict key or live inside another set (e.g. a set of groups where order inside a group does not matter).</p>
<p><b>Operators vs methods:</b> <code>a | b</code> needs both to be sets; <code>a.union(b_list)</code> accepts any iterable. In-place versions (<code>|=</code>, <code>&amp;=</code>, <code>-=</code>) mutate the left set without building a new one.</p>`,
    clues: [
      '"have we seen this before?" / "visited" / "detect duplicates" → set, O(1) membership',
      '"unique values", "distinct count" → <code>len(set(items))</code>',
      '"common elements", "in A but not in B", "in exactly one of" → <code>&amp;</code>, <code>-</code>, <code>^</code>',
      '"longest substring without repeating characters" / sliding window with uniqueness → set of the current window',
      '"is the result order important?" → if yes, a set alone is wrong; use dict.fromkeys or sort',
      '"group of items as a key where order inside doesn\'t matter" → <code>frozenset</code>'
    ],
    code: [{ lang: 'python', title: 'Set order demo + operations (runnable)', run: true, code: `
# Small-int sets often LOOK sorted -- it is an accident of hash(n) == n
s = set()
for x in (3, 11, 19):
    s.add(x)
print(s)                     # {11, 19, 3}: slot order, not insertion order, not sorted

a = {1, 2, 3, 4, 5}
b = {4, 5, 6}
print("union        ", a | b)
print("intersection ", a & b)
print("difference   ", a - b)
print("sym diff     ", a ^ b)
print("subset?      ", {4, 5} <= a)

items = ["b", "a", "b", "c", "a"]
print("ordered dedupe:", list(dict.fromkeys(items)))   # keeps first-seen order
print("unique count:  ", len(set(items)))

groups = {frozenset({"x", "y"}): "pair", frozenset({"z"}): "solo"}
print(groups[frozenset({"y", "x"})])                   # order inside does not matter
` }],
    codeTitle: ['set essentials'],
    viz: [{
      title: 'Adding ints to an 8-slot set: collisions and the printed order',
      input: '3 11 19 5 in 19 in 7',
      inputLabel: 'numbers to add (0–9999),  "in N" to test membership',
      gen: function (input) {
        var toks = String(input || '').trim().split(/[\s,]+/).filter(function (x) { return x.length; });
        var ops = [];
        for (var t = 0; t < toks.length; t++) {
          var op = 'add', tok = toks[t];
          if (tok === 'in') { op = 'in'; tok = toks[++t]; }
          var k = Number(tok);
          if (tok === undefined || isNaN(k) || Math.floor(k) !== k || k < 0 || k > 9999) throw new Error('Use whole numbers 0–9999, e.g.  3 11 19 in 19');
          ops.push({ op: op, k: k });
        }
        if (!ops.length) throw new Error('Type some numbers, e.g.  3 11 19');
        if (ops.length > 12) throw new Error('Use at most 12 operations');
        var table = [null, null, null, null, null, null, null, null], frames = [], count = 0;
        function g(hl) { var h = {}; Object.keys(hl || {}).forEach(function (s) { h['0,' + s] = hl[s]; }); return { type: 'grid', label: 'hash table: 8 slots, mask 7', colHead: ['0', '1', '2', '3', '4', '5', '6', '7'], rowHead: ['key'], rows: [table.map(function (v) { return v === null ? '—' : v; })], hl: h }; }
        function shown() { return '{' + table.filter(function (v) { return v !== null; }).join(', ') + '}'; }
        frames.push(fr('An empty set starts with <b>8 slots</b>. For a small int, <code>hash(n) == n</code>, so the first slot tried is <code>n &amp; 7</code> (the last 3 bits).', [g({}), tx('set()', 'print(s)')]));
        for (var o = 0; o < ops.length; o++) {
          var k = ops[o].k, i = k & 7, perturb = k, probes = 0, done = false;
          while (!done) {
            probes++;
            var h = {};
            if (table[i] === null) {
              h[i] = ops[o].op === 'add' ? 'ok' : 'win';
              if (ops[o].op === 'in') {
                frames.push(fr('<code>' + k + ' in s</code>: slot ' + i + ' is empty → <b>False</b> after ' + probes + ' probe(s). We never scanned the whole set.', [g(h), vp({ x: k, slot: i, probes: probes, result: 'False' }, 'result', 'bad')]));
                done = true; break;
              }
              if (count === 4) {
                frames.push(fr('Adding a 5th distinct key would make the table ~60% full, so CPython resizes to <b>32 slots</b> (≈ 4 × the number of items) and re-inserts everything. The printed order can change completely — another reason never to rely on set order.', [g({}), vp({ 'len(s)': count, 'next size': 32 }, 'next size', 'bad')]));
                frames.push(fr('Final state before the resize: <code>print(s)</code> walks slots 0 → 7 and shows <b>' + shown() + '</b>.', [g({}), tx(shown(), 'print(s)')]));
                return frames;
              }
              table[i] = k; count++;
              frames.push(fr('<code>s.add(' + k + ')</code>: slot <b>' + i + '</b> is free → store it. ' + (probes > 1 ? 'It took ' + probes + ' probes because of collisions.' : 'Direct hit, 1 probe.'), [g(h), tx(shown(), 'print(s) right now (slot order!)'), vp({ 'len(s)': count, probes: probes })]));
              done = true; break;
            }
            if (table[i] === k) {
              h[i] = 'sel';
              frames.push(fr(ops[o].op === 'in' ? '<code>' + k + ' in s</code>: slot ' + i + ' holds ' + k + ' → <b>True</b> (' + probes + ' probe(s)).' : '<code>s.add(' + k + ')</code>: ' + k + ' is already in slot ' + i + ' → sets never store duplicates; nothing changes.', [g(h), vp({ x: k, slot: i, probes: probes, result: 'True' }, 'result')]));
              done = true; break;
            }
            h[i] = 'bad';
            perturb = Math.floor(perturb / 32);
            var ni = (i * 5 + 1 + perturb) & 7;
            frames.push(fr((ops[o].op === 'in' ? 'Looking for ' : 'Adding ') + k + ': slot <b>' + i + '</b> already holds ' + table[i] + ' → <span class="c-r">collision</span>. Next = (5·' + i + ' + 1 + ' + perturb + ') &amp; 7 = <b>' + ni + '</b>.', [g(h), vp({ x: k, slot: i, 'perturb >> 5': perturb, next: ni })]));
            i = ni;
          }
        }
        frames.push(fr('Printing a set walks the slots from 0 to 7: <b>' + shown() + '</b>. That is neither insertion order nor sorted order in general — it is <b>slot order</b>.', [g({}), tx(shown(), 'print(s)')]));
        return frames;
      }
    }, {
      title: 'a & b: loop over the SMALLER set, test membership in the larger',
      input: '1 2 3 4 5 6 7 8 | 9 4 2',
      inputLabel: 'set A | set B',
      gen: function (input) {
        var p = String(input || '').split('|');
        if (p.length !== 2) throw new Error('Format: 1 2 3 | 2 3 4');
        var A = nums(p[0]), B = nums(p[1]);
        A = A.filter(function (v, i) { return A.indexOf(v) === i; }); B = B.filter(function (v, i) { return B.indexOf(v) === i; });
        if (A.length > 14 || B.length > 14) throw new Error('At most 14 numbers per set');
        var small = A.length <= B.length ? A : B, big = small === A ? B : A, res = [], frames = [];
        frames.push(fr('A has ' + A.length + ' items, B has ' + B.length + '. CPython\'s intersection iterates the <b>smaller</b> set (' + small.length + ' items) and does an O(1) hash lookup in the bigger one → O(min(len A, len B)).', [{ type: 'set', label: 'A', items: A.slice() }, { type: 'set', label: 'B', items: B.slice() }, { type: 'set', label: 'A & B', items: [] }]));
        small.forEach(function (x) {
          var hit = big.indexOf(x) >= 0, h1 = {}, h2 = {};
          h1[String(x)] = 'cur'; if (hit) { h2[String(x)] = 'ok'; res.push(x); }
          frames.push(fr('Take <b>' + x + '</b> from the smaller set. Hash it, jump to its slot in the bigger set: ' + (hit ? '<span class="c-g">present → keep it</span>' : '<span class="c-r">absent → skip</span>') + '. One probe, not a scan.', [{ type: 'set', label: 'smaller set', items: small.slice(), hl: h1 }, { type: 'set', label: 'bigger set', items: big.slice(), hl: h2 }, { type: 'set', label: 'A & B so far', items: res.slice() }]));
        });
        frames.push(fr('Done with ' + small.length + ' lookups. With lists instead of sets the same job is O(len A × len B) comparisons.', [{ type: 'set', label: 'A & B', items: res.slice(), hl: (function () { var h = {}; res.forEach(function (v) { h[String(v)] = 'sel'; }); return h; })() }, vp({ lookups: small.length, 'list-based comparisons': A.length * B.length }, 'lookups')]));
        return frames;
      }
    }],
    examples: [
      { title: 'Predict the output: {} is not an empty set', html: `<pre>a = {}
b = set()
print(type(a).__name__, type(b).__name__, {1, 1, 2})</pre><p>${H.c('g', 'dict set {1, 2}')}. Curly braces with nothing inside create a dict (dicts came first). Duplicates vanish on creation.</p>`, code: { lang: 'python', run: true, code: `a = {}\nb = set()\nprint(type(a).__name__, type(b).__name__, {1, 1, 2})` } },
      { title: 'Predict the output: list vs set membership speed', html: `<p>Checking 1 000 lookups against 100 000 items: list → up to 10<sup>8</sup> comparisons; set → about 1 000 hash probes. Convert <b>once</b> outside the loop: <code>allowed = set(allowed_list)</code>.</p>`, code: { lang: 'python', run: true, code: `from time import perf_counter\ndata = list(range(100_000))\nqueries = range(99_000, 100_000)\nt0 = perf_counter(); hits = sum(q in data for q in queries); t_list = perf_counter() - t0\nds = set(data)\nt0 = perf_counter(); hits2 = sum(q in ds for q in queries); t_set = perf_counter() - t0\nprint(hits, hits2, 'set faster:', t_set < t_list)` } },
      { title: 'Visited set for grid BFS', html: `<p>Coordinates are tuples (hashable), so <code>visited = {(0, 0)}</code> and <code>if (r, c) not in visited</code> are O(1). Using a list of visited cells turns BFS from O(R·C) into O((R·C)²).</p>`, code: { lang: 'python', run: true, code: `from collections import deque\ngrid = ['..#', '.#.', '...']\nR, C = len(grid), len(grid[0])\nvisited = {(0, 0)}\nq = deque([(0, 0)])\nwhile q:\n    r, c = q.popleft()\n    for nr, nc in ((r+1, c), (r-1, c), (r, c+1), (r, c-1)):\n        if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == '.' and (nr, nc) not in visited:\n            visited.add((nr, nc))\n            q.append((nr, nc))\nprint(len(visited), (2, 2) in visited)` } },
      { title: 'remove vs discard vs pop', html: `${H.table(['Call', 'Missing item', 'Notes'], [['<code>s.remove(x)</code>', H.c('r', 'KeyError'), 'when absence is a bug'], ['<code>s.discard(x)</code>', 'silently nothing', 'idempotent cleanup'], ['<code>s.pop()</code>', 'KeyError if empty', 'removes an <b>arbitrary</b> item']])}`, code: { lang: 'python', run: true, code: `s = {1, 2, 3}\ns.discard(99)\ntry:\n    s.remove(99)\nexcept KeyError as e:\n    print('KeyError', e)\nprint(len(s), s.pop() in {1, 2, 3})` } }
    ],
    deepDive: `<p>🟣 <b>CPython's set is its own hash table</b> (<code>Objects/setobject.c</code>), not a dict with dummy values. Each slot stores (key, hash) directly — there is no separate entries log, which is exactly why sets have no insertion order. The table starts at 8 slots and is resized when it reaches ~60% fill (<code>fill*5 &gt;= mask*3</code>) to about 4× the used count (2× for very large sets).</p>
<p><b>Probing is cache-friendly:</b> on tables large enough, after a collision CPython first checks up to <b>9 neighbouring slots</b> (<code>LINEAR_PROBES</code>) — they share a CPU cache line — before jumping with the same <code>5i + 1 + perturb</code> recurrence that dict uses. Tiny 8-slot tables skip the linear phase, which is what the visualizer shows.</p>
<p><b>Cost edge cases:</b> average O(1) assumes a good hash. All keys colliding (adversarial or a bad <code>__hash__</code>) degrades every operation to O(n). <code>set(list)</code> is O(n). <code>a &lt;= b</code> short-circuits if <code>len(a) &gt; len(b)</code>. <code>a == b</code> first compares lengths. <code>s.pop()</code> keeps a "finger" so repeated pops do not rescan from slot 0.</p>
<p><b>Memory:</b> a set of 1 000 small ints takes ~32 KB versus ~8 KB for the list of pointers — you pay ~4× memory for O(1) membership. For huge static membership checks, consider a sorted list + <code>bisect</code> (O(log n), compact) or a Bloom filter (probabilistic).</p>
<p><b>frozenset</b> caches its hash after the first computation; <code>frozenset()</code> of an existing frozenset returns the same object. Set comprehensions (<code>{f(x) for x in it}</code>) build the set directly without an intermediate list.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI tools reach for <code>set()</code> quickly for de-duplication — sometimes too quickly, silently <b>losing order</b> that your output format needed, or making test output flaky because string-set order changes every run.</p>
<p><b>Use AI as a partner:</b> ask it to "<i>replace every list membership test inside loops with a set built once outside the loop and show the before/after complexity</i>" — a classic, safe refactor you then verify with a benchmark.</p>
<p><b>Where AI goes wrong:</b> writes <code>s = {}</code> expecting a set; compares <code>str(set_obj)</code> in tests; uses a set of dicts (unhashable); or claims set iteration is "sorted for ints".</p>
<p><b>What you must still own:</b> when uniqueness/membership is the real requirement versus when order or multiplicity (use <code>Counter</code>) matters, and the average vs worst-case cost story.</p>`,
    problems: [{
      title: 'Longest Substring Without Repeating Characters',
      level: 'Medium', tags: ['set', 'sliding window', 'hashing'], companies: ['Amazon', 'Google', 'Meta', 'Microsoft'],
      statement: `<p>Given a string <code>s</code>, return the length of the longest <b>contiguous substring</b> that contains no repeated character.</p>`,
      constraints: `0 ≤ len(s) ≤ 5·10<sup>4</sup>; letters, digits, symbols and spaces`,
      example: `<p>s = "abcabcbb" → ${H.c('g', '3')} ("abc"). s = "pwwkew" → ${H.c('g', '3')} ("wke" — "pwke" is not contiguous). s = "bbbbb" → ${H.c('g', '1')}.</p>`,
      brute: { why: `<p>Check every substring with a fresh set: O(n²) substrings × O(n) build = O(n³) — around 10<sup>14</sup> steps for n = 5·10<sup>4</sup>. Even the O(n²) "extend until repeat" version re-does work for every start.</p>`, code: `
def longest_brute(s):
    best = 0
    for i in range(len(s)):
        seen = set()
        for j in range(i, len(s)):       # extend from every start: O(n^2)
            if s[j] in seen:
                break
            seen.add(s[j])
        best = max(best, len(seen))
    return best

print(longest_brute("pwwkew"))` },
      mcq: { q: 'The window is "abc" and the next char is "a". What should the window do?', options: ['Reset the window to empty', 'Shrink from the left until the old "a" leaves, then add the new "a"', 'Skip the new "a"', 'Restart from the next index'], answer: 1, explain: 'Remove s[left] from the set and move left forward until "a" is no longer in the window; then add it. Each char enters and leaves the set at most once → O(n).' },
      hints: [`<p>Hint 1: Keep a window [left, right] that never contains a repeat. When the right edge brings a duplicate, only the left edge needs to move.</p>`, `<p>Hint 2: A <code>set</code> holds exactly the characters in the window, so "is this char already inside?" is O(1).</p>`, `<p>Hint 3: Empty string → 0. Recipe: for right, ch in enumerate(s): while ch in window: window.remove(s[left]); left += 1; window.add(ch); best = max(best, right - left + 1).</p>`],
      tests: {
        sig: 'string -> int',
        fn: 'lengthOfLongestSubstring',
        cases: [
          [['abcabcbb'], 3],
          [['pwwkew'], 3],
          [['bbbbb'], 1],
          [[''], 0],
          [['abba'], 2],
          [['a'], 1],
          [['dvdf'], 3],
          [[' '], 1],
          [['tmmzuxt'], 5],
          [['abcdefg'], 7],
          [['aab'], 2],
          [['a b a'], 3],
          [['!@#!@#'], 3],
          [['12345 12345'], 6],
          [[{ $rep: 'ab', n: 25000 }], 2],
          [
            [
              {
                $rep: '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~',
                n: 500
              }
            ],
            94
          ],
          [[{ $concat: [{ $rep: 'a', n: 25000 }, { $rep: 'b', n: 25000 }] }], 2]
        ]
      },
      solution: {
        approach: `<p>Sliding window + set. Each character is added once and removed at most once, so the total work is linear. (A dict of last-seen indices lets <code>left</code> jump directly — same complexity, fewer steps.)</p>`,
        code: `
def length_of_longest_substring(s):
    window = set()          # characters currently in s[left:right+1]
    left = best = 0
    for right, ch in enumerate(s):
        while ch in window:            # O(1) membership check
            window.remove(s[left])     # shrink from the left
            left += 1
        window.add(ch)
        best = max(best, right - left + 1)
    return best

for s in ["abcabcbb", "pwwkew", "bbbbb", ""]:
    print(repr(s), length_of_longest_substring(s))`,
        alt: [{ lang: 'python', title: 'dict of last index (jumping left pointer)', code: `
def length_of_longest_substring(s):
    last = {}                 # char -> last index seen
    left = best = 0
    for right, ch in enumerate(s):
        if last.get(ch, -1) >= left:   # repeat inside the current window
            left = last[ch] + 1
        last[ch] = right
        best = max(best, right - left + 1)
    return best

print(length_of_longest_substring("abcabcbb"))` }],
        dry: { head: ['right', 'ch', 'action', 'window', 'best'], rows: [['0', 'p', 'add', '{p}', '1'], ['1', 'w', 'add', '{p,w}', '2'], ['2', 'w', 'remove p, remove w, add w', '{w}', '2'], ['3', 'k', 'add', '{w,k}', '2'], ['4', 'e', 'add', '{w,k,e}', '<span class="c-g">3</span>'], ['5', 'w', 'remove w, add w', '{k,e,w}', '3']] },
        complexity: `<p>Time O(n) amortized (each char added and removed at most once). Space O(min(n, alphabet)).</p>`,
        followUps: ['Return the substring itself, not just the length', 'At most k distinct characters instead of no repeats', 'Why is a list instead of a set O(n·k)?']
      }
    }]
  });

  /* ================= TOPIC 4: tuple immutability ================= */
  topics.push({
    title: 'Tuples & Immutability: What "Can\'t Change" Really Means',
    analogy: `<p>A tuple is a <b>sealed envelope of address labels</b>. Once sealed, you cannot swap, add or remove labels. But if a label points to a <b>house</b>, people can still repaint that house. The envelope never changed — what it points to did.</p>
<p>That is the whole story of tuple immutability: the <b>slots</b> are frozen, the <b>objects in them</b> may not be.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A <code>tuple</code> is an <b>ordered, immutable</b> sequence: <code>point = (3, 4)</code>. You can index, slice, loop, unpack and compare it like a list, but you can <b>never</b> assign <code>point[0] = 9</code>, append, or delete items. It has only two methods: <code>count</code> and <code>index</code>.</p>
${H.table(['', 'list', 'tuple'], [['mutable?', 'yes', H.c('g', 'no')], ['hashable (dict key / set item)?', 'no', H.c('g', 'yes, if all items are hashable')], ['memory for 3 items', '88 bytes (with spare capacity)', H.c('g', '64 bytes (exact, items inline)')], ['typical meaning', 'many things of the same kind', 'one record with fixed fields: (x, y), (name, age)']])}
<p><b>Syntax traps:</b> the <b>comma</b> makes a tuple, not the parentheses. <code>(5)</code> is just the int 5; a one-item tuple is <code>(5,)</code> or <code>5,</code>. The empty tuple is <code>()</code>.</p>
<p><b>Shallow immutability.</b> A tuple stores pointers. Those pointers can't change, but a mutable object they point to can:</p>
<pre>t = (1, [2, 3])
t[1].append(4)     # fine! t is now (1, [2, 3, 4])
t[1] = [9]         # TypeError: 'tuple' object does not support item assignment</pre>
<p>And because <code>[2, 3, 4]</code> is a list, <code>hash(t)</code> raises <b>TypeError</b> — a tuple is hashable only if <b>everything inside</b> is hashable.</p>
<p><b><code>t += (5,)</code> does not modify t.</b> It builds a <b>new</b> tuple and rebinds the name <code>t</code>. Any other name that pointed at the old tuple still sees the old one. (For a list, <code>+=</code> mutates in place — a famous difference.)</p>
<p><b>Why use tuples?</b> Safety (nobody can accidentally change a record), hashability (keys like <code>(row, col)</code>), multiple return values (<code>return lo, hi</code>), and small speed/memory wins. For records with names, use <code>collections.namedtuple</code> / <code>typing.NamedTuple</code> or a <code>@dataclass(frozen=True)</code>.</p>`,
    clues: [
      '"use coordinates / pairs / several fields as a dict key or in a set" → tuple key: <code>(r, c)</code>, <code>(a, b)</code>',
      '"return multiple values" → return a tuple and unpack: <code>lo, hi = bounds(nums)</code>',
      '"why does t[0] += [1] raise an error but still change t?" → augmented assignment on a mutable item inside a tuple',
      '"make this record read-only / safe to share between threads" → tuple, NamedTuple, frozen dataclass',
      '"unhashable type: list" error when building keys → convert the list (or each inner list) to a tuple',
      '"memoize a function with list arguments" → <code>functools.cache</code> needs hashable args → pass tuples'
    ],
    code: [{ lang: 'python', title: 'Immutability, hashability and the += puzzle (runnable)', run: true, code: `
import sys
from collections import namedtuple

t = (1, [2, 3])
t[1].append(4)                 # mutating the list INSIDE the tuple is allowed
print(t)

try:
    hash(t)                    # contains a list -> unhashable
except TypeError as e:
    print("hash failed:", e)

u = t
t += (5,)                      # builds a NEW tuple, rebinds t only
print(t, u, t is u)

# The famous puzzle: error AND mutation
try:
    t[1] += [6]                # list.__iadd__ mutates, then tuple item assignment fails
except TypeError as e:
    print("TypeError:", e)
print("but the list changed:", t)

print(type((5)).__name__, type((5,)).__name__)
print(sys.getsizeof((1, 2, 3)), "bytes vs", sys.getsizeof([1, 2, 3]))

Point = namedtuple("Point", "x y")
p = Point(3, 4)
print(p.x + p.y, p._replace(x=10), {p: "origin-ish"}[Point(3, 4)])
` }],
    codeTitle: ['Tuple behaviour'],
    viz: [{
      title: 'Names, a tuple, and the list inside it — step by step',
      gen: function () {
        var code = 't = (1, [2, 3])\nu = t\nt[1].append(4)\nt += (5,)\nt[1] += [6]\nprint(u)';
        function G(state) {
          var nodes = [
            { id: 't', label: 't', x: 8, y: 12, shape: 'box', w: 10 },
            { id: 'u', label: 'u', x: 8, y: 48, shape: 'box', w: 10 },
            { id: 'A', label: 'tuple #1 (1, •)', x: 42, y: 12, shape: 'box', w: 26 },
            { id: 'L', label: state.list, x: 84, y: 30, shape: 'box', w: 24 }
          ];
          var edges = [];
          if (state.B) nodes.push({ id: 'B', label: 'tuple #2 (1, •, 5)', x: 42, y: 48, shape: 'box', w: 28 });
          if (state.tTo) edges.push(['t', state.tTo]);
          if (state.uTo) edges.push(['u', state.uTo]);
          edges.push(['A', 'L', '[1]']);
          if (state.B) edges.push(['B', 'L', '[1]']);
          var p = { type: 'graph', label: 'names → objects (arrows are references)', directed: true, height: 60, nodes: nodes.filter(function (n) { return n.id !== 'u' || state.uTo; }), edges: edges, hl: state.hl || {}, ehl: state.ehl || {}, tags: state.tags || {} };
          return p;
        }
        return [
          fr('Line 1: Python creates a list <b>[2, 3]</b>, then a tuple whose slot [1] <b>points to</b> that list, and binds the name <code>t</code> to the tuple.', [G({ list: 'list [2, 3]', tTo: 'A', hl: { A: 'ok', L: 'ok' } }), cp(code, 1)]),
          fr('Line 2: <code>u = t</code> copies the <b>reference</b>. Two names, one tuple object.', [G({ list: 'list [2, 3]', tTo: 'A', uTo: 'A', hl: { u: 'ok' }, ehl: { 'u-A': 'ok' } }), cp(code, 2)]),
          fr('Line 3: <code>t[1].append(4)</code> follows the arrow to the list and mutates <b>the list</b>. The tuple\'s slots did not change — it still holds the same two pointers. Immutability is <b>shallow</b>.', [G({ list: 'list [2, 3, 4]', tTo: 'A', uTo: 'A', hl: { L: 'cur' }, tags: { A: 'unchanged' } }), cp(code, 3)]),
          fr('Line 4: <code>t += (5,)</code> cannot modify tuple #1, so Python builds a <b>new tuple #2</b> = (1, same list, 5) and rebinds <code>t</code>. <code>u</code> still points to tuple #1.', [G({ list: 'list [2, 3, 4]', tTo: 'B', uTo: 'A', B: true, hl: { B: 'ok', t: 'cur' }, ehl: { 't-B': 'ok' } }), cp(code, 4), vp({ 't is u': 'False' }, 't is u', 'bad')]),
          fr('Line 5, part 1: <code>t[1] += [6]</code> means <code>x = t[1]; x = x.__iadd__([6]); t[1] = x</code>. <code>list.__iadd__</code> extends the list <b>in place</b> → [2, 3, 4, 6].', [G({ list: 'list [2, 3, 4, 6]', tTo: 'B', uTo: 'A', B: true, hl: { L: 'ok' } }), cp(code, 5)]),
          fr('Line 5, part 2: now Python tries <code>t[1] = x</code> — item assignment on a tuple → <span class="c-r">TypeError</span>. The error is raised <b>after</b> the list already changed!', [G({ list: 'list [2, 3, 4, 6]', tTo: 'B', uTo: 'A', B: true, hl: { B: 'bad' }, tags: { B: 'TypeError' } }), cp(code, 5, 'bad')]),
          fr('Line 6 (if we caught the error): <code>print(u)</code> → <b>(1, [2, 3, 4, 6])</b>. Both tuples share the same list, so every mutation of it is visible through both.', [G({ list: 'list [2, 3, 4, 6]', tTo: 'B', uTo: 'A', B: true, hl: { u: 'sel', A: 'sel', L: 'sel' } }), cp(code, 6, 'ok'), tx('(1, [2, 3, 4, 6])', 'output')])
        ];
      }
    }, {
      title: 'Memory: list grown by append vs tuple of the same length',
      input: '12',
      inputLabel: 'max length n (1–24)',
      gen: function (input) {
        var n = nums(input, 'one whole number')[0];
        if (n < 1 || n > 24) throw new Error('Pick n between 1 and 24');
        var frames = [], L = [], T = [], lab = [], cap = 0;
        for (var k = 0; k <= n; k++) {
          if (k > cap) { var na = (k + (k >> 3) + 6) & ~3; cap = na; }
          var ls = 56 + 8 * cap, ts = 40 + 8 * k;
          L.push(ls); T.push(ts); lab.push('n=' + k);
          if (k < 4 || k === n || k % 4 === 0) {
            frames.push(fr('n = ' + k + ': list (built with append) uses <b>' + ls + '</b> bytes (header 56 + 8 × capacity ' + cap + '); tuple uses <b>' + ts + '</b> bytes (header 40 + 8 × ' + k + ', items stored inline, no spare slots). Saving: ' + (ls - ts) + ' bytes.', [
              { type: 'bars', label: 'list bytes', values: L.slice(), idxLabels: lab.slice(), hl: (function () { var h = {}; h[k] = 'cur'; return h; })() },
              { type: 'bars', label: 'tuple bytes', values: T.slice(), idxLabels: lab.slice(), hl: (function () { var h = {}; h[k] = 'ok'; return h; })() },
              vp({ n: k, 'list capacity': cap, 'list bytes': ls, 'tuple bytes': ts })
            ]));
          }
        }
        frames.push(fr('Tuples are always the exact size: one allocation holding header + item pointers. Lists keep a separate, over-allocated pointer block so they can grow. For millions of small fixed records, tuples (or <code>__slots__</code> classes) noticeably cut memory.', [{ type: 'bars', label: 'list − tuple (bytes saved)', values: L.map(function (v, i) { return v - T[i]; }), idxLabels: lab.slice() }]));
        return frames;
      }
    }],
    examples: [
      { title: 'Predict the output: (5) vs (5,)', html: `<pre>a = (5)
b = (5,)
c = 5, 6
print(type(a).__name__, type(b).__name__, type(c).__name__, len(c))</pre><p>${H.c('g', 'int tuple tuple 2')}. Parentheses only group; the <b>comma</b> builds the tuple.</p>`, code: { lang: 'python', run: true, code: `a = (5)\nb = (5,)\nc = 5, 6\nprint(type(a).__name__, type(b).__name__, type(c).__name__, len(c))` } },
      { title: 'Predict the output: += on list vs tuple with an alias', html: `<pre>a = [1]; b = a; a += [2]
x = (1,); y = x; x += (2,)
print(b, y)</pre><p>${H.c('g', '[1, 2] (1,)')}. List <code>+=</code> calls <code>__iadd__</code> → same object mutated, so <code>b</code> sees it. Tuples have no <code>__iadd__</code>, so <code>x += …</code> falls back to <code>x = x + …</code> → new object; <code>y</code> keeps the old one.</p>`, code: { lang: 'python', run: true, code: `a = [1]; b = a; a += [2]\nx = (1,); y = x; x += (2,)\nprint(b, y)` } },
      { title: 'Tuple keys for a 2-D memo', html: `<p>Memoizing <code>paths(r, c)</code> needs a key for the pair. A tuple <code>(r, c)</code> is hashable; a list <code>[r, c]</code> is not. <code>functools.cache</code> builds such tuple keys from the arguments for you — which is why every argument must be hashable.</p>`, code: { lang: 'python', run: true, code: `from functools import cache\n\nmemo = {}\ndef paths(r, c):\n    if r == 0 or c == 0:\n        return 1\n    if (r, c) not in memo:                  # tuple key\n        memo[(r, c)] = paths(r - 1, c) + paths(r, c - 1)\n    return memo[(r, c)]\n\n@cache\ndef paths2(r, c):\n    return 1 if r == 0 or c == 0 else paths2(r - 1, c) + paths2(r, c - 1)\n\nprint(paths(10, 10), paths2(10, 10), len(memo))` } },
      { title: 'Frozen records: NamedTuple and frozen dataclass', html: `<p><code>typing.NamedTuple</code> gives field names, type hints and still behaves like a tuple (unpacking, indexing, hashing). <code>@dataclass(frozen=True)</code> forbids attribute assignment and generates <code>__hash__</code>. Since Python 3.13, <code>copy.replace(obj, x=…)</code> makes a modified copy of either.</p>`, code: { lang: 'python', run: true, code: `from typing import NamedTuple\nfrom dataclasses import dataclass, FrozenInstanceError\n\nclass P(NamedTuple):\n    x: int\n    y: int\n\n@dataclass(frozen=True)\nclass Q:\n    x: int\n    y: int\n\np, q = P(1, 2), Q(1, 2)\nx, y = p                     # NamedTuple unpacks like a tuple\ntry:\n    q.x = 5\nexcept FrozenInstanceError as e:\n    print('frozen:', e)\nprint(x + y, hash(p) == hash((1, 2)), {q: 'ok'}[Q(1, 2)])` } }
    ],
    deepDive: `<p>🟣 <b>Layout.</b> A <code>PyTupleObject</code> is a single variable-size allocation: header (refcount, type, size) followed directly by the item pointers (<code>ob_item[]</code>). A list has a header plus a <b>separate</b> pointer block that can be reallocated. One allocation instead of two is why tuples are smaller and slightly faster to create.</p>
<p><b>Free lists and singletons.</b> CPython keeps per-size free lists for small tuples (lengths 1–19), so creating and destroying short tuples is cheap. The empty tuple <code>()</code> is a singleton. <code>tuple(t)</code> and <code>copy.copy(t)</code> return the <b>same</b> object for an existing tuple — there is no reason to copy something immutable.</p>
<p><b>Compiler tricks.</b> A tuple of constants like <code>(1, 2, 3)</code> is folded into a single constant stored in the code object — no runtime building at all. The compiler also turns <code>x in [1, 2, 3]</code> and <code>for x in [1, 2, 3]</code> into tuple constants because the list is never observable.</p>
<p><b>Hashing.</b> <code>hash(tuple)</code> combines the item hashes with an xxHash-style mix (since 3.8) and is <b>recomputed each call</b> (O(len)). That is fine for small keys, but avoid huge tuples as hot dict keys. Equal tuples have equal hashes because the combination depends only on item hashes and order.</p>
<p><b>GC untracking.</b> Tuples that contain only atomic objects (ints, strs, None…) are untracked by the cycle garbage collector after their first scan, reducing GC overhead for programs with millions of small records.</p>
<p><b>"Immutable" ≠ "deeply frozen".</b> If you need a deeply immutable structure, freeze recursively (tuples of tuples, <code>frozenset</code>, <code>types.MappingProxyType</code> for read-only dict views) or validate at construction.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI often defaults to lists for everything, including fixed records and dict keys, then "fixes" the resulting <code>TypeError: unhashable type</code> with <code>str(lst)</code> keys — slower and bug-prone. Knowing that a tuple is the right key type is an instant review win.</p>
<p><b>Use AI as a partner:</b> "<i>convert these record dicts to typing.NamedTuple or frozen dataclasses and explain which fields must be hashable</i>"; "<i>generate test cases proving this tuple-keyed cache returns equal results for equal inputs</i>".</p>
<p><b>Where AI goes wrong:</b> claiming tuples are "deeply immutable"; using <code>(x)</code> as a one-tuple; or explaining the <code>t[0] += [1]</code> puzzle as "nothing changes" — it changes <b>and</b> raises.</p>
<p><b>What you must still own:</b> the reference model (slots point to objects), the difference between rebinding and mutating, and when immutability buys you safety, hashability and speed.</p>`,
    problems: [{
      title: 'Find Duplicate Rows in a Matrix',
      level: 'Easy', tags: ['tuple', 'set', 'hashing'], companies: ['Amazon', 'Flipkart', 'Samsung'],
      statement: `<p>Given a matrix (list of lists) of integers, return the indices of all rows that are an <b>exact duplicate of an earlier row</b>, in increasing order.</p>`,
      constraints: `1 ≤ R ≤ 10<sup>4</sup>, 1 ≤ C ≤ 100`,
      example: `<p>matrix = [[1,0,1], [0,1,0], [1,0,1], [0,1,0], [1,1,1]] → ${H.c('g', '[2, 3]')}. Row 2 repeats row 0, row 3 repeats row 1.</p>`,
      brute: { why: `<p>Compare every row with every earlier row: O(R²·C) = 10<sup>10</sup> element comparisons in the worst case. Using a <b>list</b> of seen rows has the same cost because <code>row in seen_list</code> is a linear scan.</p>`, code: `
def dup_rows_brute(matrix):
    out = []
    for i in range(len(matrix)):
        for j in range(i):                  # every earlier row
            if matrix[i] == matrix[j]:      # O(C) comparison
                out.append(i)
                break
    return out

print(dup_rows_brute([[1, 0, 1], [0, 1, 0], [1, 0, 1], [0, 1, 0], [1, 1, 1]]))` },
      mcq: { q: 'Why can\'t we do <code>seen.add(row)</code> directly?', options: ['Sets are too small', 'A list is unhashable because it is mutable', 'Rows may contain zeros', 'Sets only hold strings'], answer: 1, explain: 'A list could change after insertion, breaking its hash slot, so Python forbids hashing it. <code>tuple(row)</code> is an immutable snapshot that can be hashed.' },
      hints: [`<p>Hint 1: "Have I seen this exact row before?" is a membership question — a set answers it in O(1) average.</p>`, `<p>Hint 2: Lists cannot go into a set; freeze each row with <code>tuple(row)</code> (O(C)).</p>`, `<p>Hint 3: Keep the indices in the order you scan. Recipe: seen = set(); for i, row in enumerate(matrix): key = tuple(row); if key in seen: out.append(i) else: seen.add(key).</p>`],
      tests: {
        sig: 'int[][] -> int[]',
        fn: 'duplicateRows',
        cases: [
          [[[[1, 0, 1], [0, 1, 0], [1, 0, 1], [0, 1, 0], [1, 1, 1]]], [2, 3]],
          [[[[1, 2]]], []],
          [[[[1, 2], [2, 1]]], []],
          [[[[1, 2], [1, 2], [1, 2], [1, 2], [1, 2]]], [1, 2, 3, 4]],
          [[[[0], [0], [0]]], [1, 2]],
          [[[[1, 2, 3], [1, 2, 4], [1, 2, 3]]], [2]],
          [[[[-1, 0], [0, -1], [-1, 0]]], [2]],
          [
            [
              {
                $rep: [
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7,
                  7
                ],
                n: 10000
              }
            ],
            { $range: [1, 10000, 1] }
          ],
          [
            [
              {
                $concat: [
                  [
                    [
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      1
                    ]
                  ],
                  {
                    $rep: [
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0,
                      0
                    ],
                    n: 9999
                  }
                ]
              }
            ],
            { $range: [2, 10000, 1] }
          ]
        ]
      },
      solution: {
        approach: `<p>Scan rows once. Convert each row to a tuple (hashable snapshot), test membership in a set of earlier rows, record the index on a hit.</p>`,
        code: `
def duplicate_rows(matrix):
    seen = set()                  # tuples of rows already met
    out = []
    for i, row in enumerate(matrix):
        key = tuple(row)          # O(C): immutable, hashable copy
        if key in seen:           # O(C) hash + O(1) average lookup
            out.append(i)
        else:
            seen.add(key)
    return out

print(duplicate_rows([[1, 0, 1], [0, 1, 0], [1, 0, 1], [0, 1, 0], [1, 1, 1]]))`,
        dry: { head: ['i', 'tuple(row)', 'in seen?', 'out'], rows: [['0', '(1,0,1)', 'no → add', '[]'], ['1', '(0,1,0)', 'no → add', '[]'], ['2', '(1,0,1)', '<span class="c-g">yes</span>', '[2]'], ['3', '(0,1,0)', '<span class="c-g">yes</span>', '[2, 3]'], ['4', '(1,1,1)', 'no → add', '[2, 3]']] },
        complexity: `<p>Time O(R·C) — each row is converted and hashed once. Space O(R·C) for the stored tuples.</p>`,
        followUps: ['Rows are equal up to column order — what key now? (sorted tuple or Counter-based frozenset)', 'Return groups of identical rows (dict of tuple → list of indices)']
      }
    }]
  });

  /* ================= TOPIC 5: comprehensions & generator expressions ================= */
  topics.push({
    title: 'Comprehensions: list, dict, set & Generator Expressions (Eager vs Lazy)',
    analogy: `<p>A comprehension is like giving a <b>barista one complete order</b> — "a latte for everyone at the table who isn't vegan, oat milk for the rest" — instead of walking up to the counter once per person. Same result, said in one sentence.</p>
<p>A <b>generator expression</b> is a <b>sushi conveyor belt</b>: plates are made only when someone takes one. Nothing is cooked in advance, the kitchen never needs space for all the plates at once, and once a plate has passed, it is gone.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A comprehension builds a collection from another iterable in one readable expression:</p>
${H.table(['Kind', 'Syntax', 'Result'], [['list', '<code>[x * x for x in nums if x &gt; 0]</code>', 'a new list (eager)'], ['set', '<code>{w.lower() for w in words}</code>', 'a new set (eager, unique)'], ['dict', '<code>{name: len(name) for name in names}</code>', 'a new dict (eager)'], ['generator expression', '<code>(x * x for x in nums)</code>', H.c('p', 'a lazy iterator — computes on demand')]])}
<p><b>Read it like the loop it replaces.</b> <code>[f(x) for x in A if c(x)]</code> is exactly:</p>
<pre>result = []
for x in A:
    if c(x):
        result.append(f(x))</pre>
<p><b>Several <code>for</code> clauses</b> nest left-to-right, outer first: <code>[(i, j) for i in range(2) for j in range(3)]</code> loops <code>i</code> outside and <code>j</code> inside. Flatten a matrix with <code>[v for row in grid for v in row]</code>.</p>
<p><b>Filter vs choose:</b> an <code>if</code> at the <b>end</b> drops items (<code>[x for x in a if x % 2]</code>). An <code>if … else</code> at the <b>front</b> transforms every item (<code>[x if x &gt; 0 else 0 for x in a]</code>). You cannot put <code>else</code> on the trailing filter.</p>
<p><b>Eager vs lazy.</b> List/set/dict comprehensions build everything immediately. A generator expression produces items one at a time when something asks (<code>next()</code>, a <code>for</code> loop, <code>sum()</code>, <code>any()</code>…). It uses almost no memory (~200 bytes no matter how many items) but can be iterated <b>only once</b>. Inside a function call you can drop the extra parentheses: <code>sum(x * x for x in nums)</code>.</p>
<p><b>Scope:</b> the loop variable lives in the comprehension's own scope — it does <b>not</b> leak or overwrite an outer variable of the same name (Python 3).</p>
<p><b>When NOT to use one:</b> when you need side effects (printing, appending elsewhere), complicated branching, or more than two <code>for</code> clauses — a normal loop reads better.</p>`,
    clues: [
      '"transform every element" / "filter elements that satisfy …" → list comprehension (faster than for + append)',
      '"build a lookup table / index from a list" → dict comprehension <code>{key(x): x for x in items}</code>',
      '"sum / any / all / max over a huge or infinite stream" → generator expression (O(1) memory, short-circuits)',
      '"flatten a 2-D list" → <code>[v for row in grid for v in row]</code> (outer loop first)',
      '"distinct transformed values" → set comprehension',
      '"why is my second loop over the result empty?" → the result was a generator and is exhausted',
      '"lambdas created in a loop all return the last value" → late binding; bind with a default argument'
    ],
    code: [{ lang: 'python', title: 'All four flavours + laziness + scope (runnable)', run: true, code: `
import sys

nums = [3, -1, 4, -1, 5, 9]
squares = [n * n for n in nums if n > 0]          # list: filter at the end
clipped = [n if n > 0 else 0 for n in nums]       # conditional expression at the front
unique = {abs(n) for n in nums}                   # set
index = {n: i for i, n in enumerate(nums)}        # dict: later duplicates overwrite
print(squares, clipped, unique, index, sep="  ")

grid = [[1, 2], [3, 4], [5, 6]]
print([v for row in grid for v in row])           # flatten: outer loop written first
print([[row[c] for row in grid] for c in range(2)])  # transpose: nested comprehension

big_list = [i for i in range(1_000_000)]
big_gen = (i for i in range(1_000_000))
print(sys.getsizeof(big_list), "bytes vs", sys.getsizeof(big_gen), "bytes")
print(sum(big_gen), sum(big_gen))                 # second sum is 0: generator exhausted

x = "outer"
_ = [x for x in range(3)]
print(x)                                          # still 'outer': no leaking

print(any(n > 5 for n in range(10**12)))          # True instantly: stops at n = 6
` }, { lang: 'python', title: 'Late binding gotcha and the walrus operator (runnable)', run: true, code: `
funcs = [lambda: i for i in range(3)]
print([f() for f in funcs])            # [2, 2, 2]: every lambda reads i AFTER the loop ends

funcs = [lambda i=i: i for i in range(3)]
print([f() for f in funcs])            # [0, 1, 2]: default value captured per iteration

data = [4, 9, 16, 25, 2]
# walrus: compute once, use in both filter and output
roots = [r for x in data if (r := x ** 0.5).is_integer()]
print(roots, "last r =", r)            # := binds r in the ENCLOSING scope
` }],
    codeTitle: ['Comprehension flavours', 'Gotchas'],
    viz: [{
      title: 'A nested comprehension, unrolled into the loop Python actually runs',
      input: '3 3',
      inputLabel: 'A B  for  [(i, j) for i in range(A) for j in range(B) if i != j]  (each 1–5)',
      gen: function (input) {
        var ab = nums(input, 'two numbers A B');
        if (ab.length !== 2 || ab[0] < 1 || ab[1] < 1 || ab[0] > 5 || ab[1] > 5) throw new Error('Enter two numbers between 1 and 5, e.g. 3 3');
        var A = ab[0], B = ab[1], res = [], frames = [];
        var code = 'result = []\nfor i in range(' + A + '):          # first for-clause = OUTER loop\n    for j in range(' + B + '):      # second for-clause = INNER loop\n        if i != j:              # trailing if = filter\n            result.append((i, j))';
        frames.push(fr('The comprehension <code>[(i, j) for i in range(' + A + ') for j in range(' + B + ') if i != j]</code> runs exactly like this loop. Clauses are read <b>left to right = outside to inside</b>.', [cp(code, 1), { type: 'array', label: 'result', values: ['(empty)'] }]));
        for (var i = 0; i < A; i++) {
          frames.push(fr('Outer loop: <code>i = ' + i + '</code>. The inner loop now runs completely for this i.', [cp(code, 2), vp({ i: i, j: '—' }, 'i', 'cur'), { type: 'array', label: 'result', values: res.length ? res.slice() : ['(empty)'] }]));
          for (var j = 0; j < B; j++) {
            var keep = i !== j;
            if (keep) res.push('(' + i + ',' + j + ')');
            var hl = {}; if (keep) hl[res.length - 1] = 'ok';
            frames.push(fr('<code>j = ' + j + '</code>: is ' + i + ' != ' + j + '? ' + (keep ? '<span class="c-g">Yes → append (' + i + ', ' + j + ')</span>' : '<span class="c-r">No → filtered out</span>, nothing appended.'), [cp(code, keep ? '4,5' : '4', keep ? 'ok' : 'bad'), vp({ i: i, j: j, 'i != j': keep ? 'True' : 'False' }, 'i != j', keep ? 'ok' : 'bad'), { type: 'array', label: 'result', values: res.length ? res.slice() : ['(empty)'], hl: hl }]));
          }
        }
        frames.push(fr('Finished: ' + res.length + ' pairs out of ' + (A * B) + ' combinations. The whole list exists in memory now — that is <b>eager</b> evaluation. Wrap it in ( ) instead of [ ] to get a lazy generator.', [cp(code, 0), { type: 'array', label: 'result (final)', values: res.length ? res.slice() : ['(empty)'], hl: (function () { var h = {}; res.forEach(function (_, k) { h[k] = 'sel'; }); return h; })() }]));
        return frames;
      }
    }, {
      title: 'Generator pipeline: values are pulled one at a time, only as needed',
      input: '1 2 3 4 5 6 7 8 9 10; 2',
      inputLabel: 'numbers ; how many results to take (k)',
      gen: function (input) {
        var p = String(input || '').split(';');
        if (p.length !== 2) throw new Error('Format: 1 2 3 4 5 ; 2');
        var a = nums(p[0]), k = nums(p[1], 'k')[0];
        if (a.length > 16) throw new Error('Use at most 16 numbers');
        if (k < 1 || k > 8) throw new Error('k must be between 1 and 8');
        var code = 'evens   = (x for x in nums if x % 2 == 0)\nsquares = (e * e for e in evens)\nfirst   = list(islice(squares, ' + k + '))';
        function G(hl, ehl, tags) {
          return { type: 'graph', label: 'pipeline (nothing runs until the consumer asks)', directed: true, height: 40, nodes: [
            { id: 'N', label: 'nums list', x: 10, y: 20, shape: 'box', w: 16 },
            { id: 'E', label: 'evens gen', x: 37, y: 20, shape: 'box', w: 16 },
            { id: 'S', label: 'squares gen', x: 64, y: 20, shape: 'box', w: 18 },
            { id: 'C', label: 'islice / list', x: 91, y: 20, shape: 'box', w: 16 }], edges: [['N', 'E'], ['E', 'S'], ['S', 'C']], hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
        }
        var frames = [], out = [], pos = 0, examined = 0;
        frames.push(fr('Lines 1–2 create two generator objects but compute <b>nothing</b> yet. No number has been read. Memory used: two small frames, independent of len(nums).', [G({ E: 'cur', S: 'cur' }), cp(code, '1,2'), { type: 'array', label: 'nums', values: a.slice(), showIdx: true }, { type: 'queue', label: 'first', items: [] }]));
        while (out.length < k && pos < a.length) {
          var x = a[pos], ptr = {}; ptr[pos] = 'next';
          examined++;
          var hl = {}; hl[pos] = x % 2 === 0 ? 'ok' : 'bad';
          if (x % 2 !== 0) {
            frames.push(fr('Consumer asks squares for a value → squares asks evens → evens reads <b>' + x + '</b> from nums. Odd → filtered out, evens keeps pulling.', [G({ N: 'cur', E: 'cur' }, { 'N-E': 'cur' }), cp(code, 1), { type: 'array', label: 'nums', values: a.slice(), hl: hl, ptr: ptr, showIdx: true }, { type: 'queue', label: 'first', items: out.slice() }]));
          } else {
            out.push(x * x);
            frames.push(fr('evens reads <b>' + x + '</b> (even) and yields it → squares computes ' + x + ' × ' + x + ' = <b>' + (x * x) + '</b> and yields it → islice hands it to the list. ' + out.length + ' of ' + k + ' collected.', [G({ E: 'ok', S: 'ok', C: 'ok' }, { 'N-E': 'ok', 'E-S': 'ok', 'S-C': 'ok' }), cp(code, 3, 'ok'), { type: 'array', label: 'nums', values: a.slice(), hl: hl, ptr: ptr, showIdx: true }, { type: 'queue', label: 'first', items: out.slice(), hl: (function () { var h = {}; h[out.length - 1] = 'ok'; return h; })() }]));
          }
          pos++;
        }
        var rest = {}; for (var r = pos; r < a.length; r++) rest[r] = 'done';
        frames.push(fr('Done: <code>first = ' + pyList(out) + '</code>. Only <b>' + examined + '</b> of ' + a.length + ' numbers were ever read; the faded ones were never touched. A list comprehension would have processed all ' + a.length + ' up front.', [G({ C: 'sel' }, {}, { C: 'done' }), cp(code, 3, 'ok'), { type: 'array', label: 'nums (faded = never read)', values: a.slice(), hl: rest, showIdx: true }, { type: 'queue', label: 'first', items: out.slice() }]));
        frames.push(fr('Generators are <b>single-use</b>: calling <code>list(squares)</code> now would continue from where it stopped, and after the end it yields nothing forever. Need the data twice? Build a list, or recreate the generator.', [G({ S: 'bad' }, {}, { S: 'partly used' }), tx('<code>next(squares)</code> continues after ' + (out.length ? out[out.length - 1] : 'start') + '; once exhausted → StopIteration.', 'remember')]));
        return frames;
      }
    }],
    examples: [
      { title: 'Predict the output: generator used twice', html: `<pre>g = (n * 2 for n in [1, 2, 3])
print(list(g))
print(list(g))</pre><p>${H.c('g', '[2, 4, 6]')} then ${H.c('r', '[]')}. The first <code>list()</code> drained the generator; there is nothing left. Classic bug when a function returns a generator and the caller loops over it twice.</p>`, code: { lang: 'python', run: true, code: `g = (n * 2 for n in [1, 2, 3])\nprint(list(g))\nprint(list(g))` } },
      { title: 'Predict the output: order of for-clauses', html: `<pre>print([a + b for a in 'xy' for b in '12'])</pre><p>${H.c('g', "['x1', 'x2', 'y1', 'y2']")}. The first <code>for</code> is the outer loop, so <code>a</code> changes slowest. Compare the nested version <code>[[a + b for b in '12'] for a in 'xy']</code> → <code>[['x1','x2'], ['y1','y2']]</code> — a list of lists.</p>`, code: { lang: 'python', run: true, code: `print([a + b for a in 'xy' for b in '12'])\nprint([[a + b for b in '12'] for a in 'xy'])` } },
      { title: 'Dict comprehension: inverting a mapping loses duplicates', html: `<p><code>{v: k for k, v in d.items()}</code> silently keeps only the <b>last</b> key for a repeated value. If values can repeat, group instead (see the guided problem below).</p>`, code: { lang: 'python', run: true, code: `d = {'a': 1, 'b': 2, 'c': 1}\nprint({v: k for k, v in d.items()})        # {1: 'c', 2: 'b'}  -- 'a' lost\ngroups = {}\nfor k, v in d.items():\n    groups.setdefault(v, []).append(k)\nprint(groups)` } },
      { title: 'Speed: comprehension vs loop vs map', html: `<p>A list comprehension avoids looking up <code>result.append</code> on each iteration and uses a dedicated <code>LIST_APPEND</code> bytecode, so it is typically 10–40% faster than an explicit loop (measure on your machine). <code>map</code> with a <b>built-in</b> function can be similar or faster; with a lambda it is usually slower than a comprehension.</p>`, code: { lang: 'python', run: true, code: `from timeit import timeit\nsetup = 'data = list(range(10_000))'\nloop = 'r = []\\nfor x in data:\\n    r.append(x * 2)'\ncomp = '[x * 2 for x in data]'\nprint('loop  ', round(timeit(loop, setup, number=200), 3))\nprint('comp  ', round(timeit(comp, setup, number=200), 3))\nprint('map+lambda', round(timeit('list(map(lambda x: x * 2, data))', setup, number=200), 3))` } }
    ],
    deepDive: `<p>🟣 <b>How they compile.</b> Before 3.12, every comprehension compiled to a hidden nested function that was created and called on each evaluation. <b>PEP 709 (Python 3.12)</b> inlines list/dict/set comprehensions into the enclosing function's bytecode — removing that call overhead (up to ~2× faster on tiny comprehensions) while keeping the iteration variable isolated. Generator expressions are still separate generator objects (they must suspend). One quirk survives: inside a <b>class body</b>, a comprehension cannot see class-level names except in its first iterable.</p>
<p><b>Evaluation timing.</b> In a generator expression, the <b>first</b> iterable (<code>range(n)</code> in <code>(x for x in range(n))</code>) is evaluated immediately at creation; everything else is lazy. So <code>(1/x for x in data)</code> raises ZeroDivisionError only when consumed — a debugging surprise.</p>
<p><b>Generators under the hood.</b> A generator object holds a suspended frame (instruction pointer + local variables). Each <code>next()</code> resumes it until the next <code>yield</code>. That is why memory is O(1) in the number of items, and why pipelines of generators (and <code>itertools</code>: <code>islice</code>, <code>chain</code>, <code>groupby</code>, <code>accumulate</code>) can process files bigger than RAM.</p>
<p><b>Closures and late binding.</b> Lambdas made in a comprehension close over the <b>variable</b>, not its current value, so they all see its final value. Capture with a default argument (<code>lambda i=i: i</code>) or <code>functools.partial</code>.</p>
<p><b>Walrus <code>:=</code></b> inside a comprehension binds in the <b>containing</b> scope (deliberately, PEP 572), useful for "compute once, filter and keep" but it leaks by design.</p>
<p><b>Complexity:</b> a comprehension over n items with O(1) work per item is O(n) time; the list/dict/set result is O(n) space; a generator is O(1) extra space. <code>sorted(gen)</code> or <code>list(gen)</code> materializes everything anyway — laziness only helps if the consumer streams.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI loves one-liners. It will cheerfully produce a triple-nested comprehension with two conditionals that nobody can review. Your job is to keep comprehensions <b>readable</b> and to choose eager vs lazy deliberately.</p>
<p><b>Use AI as a partner:</b> "<i>rewrite this comprehension as an explicit loop with comments, then tell me which is clearer</i>"; "<i>turn this file-processing script into a generator pipeline so it runs in constant memory</i>"; "<i>add tests that would catch a generator being consumed twice</i>".</p>
<p><b>Where AI goes wrong:</b> returning a generator where the caller iterates twice; using a list comprehension purely for side effects (<code>[print(x) for x in xs]</code>); late-binding lambdas in callbacks; using <code>[...]</code> inside <code>sum()</code>/<code>any()</code> and losing short-circuiting and memory savings.</p>
<p><b>What you must still own:</b> translating any comprehension to its loop in your head (interviewers ask), knowing the scoping rules, and predicting memory/time behaviour at scale.</p>`,
    problems: [{
      title: 'Invert a Mapping When Values Repeat (Group Keys by Value)',
      level: 'Easy', tags: ['dict', 'comprehension', 'grouping'], companies: ['Google', 'Atlassian', 'Stripe'],
      statement: `<p>Given a dict <code>owner</code> mapping file name → owner name, return a dict mapping each owner → <b>sorted list</b> of their files. Owners must appear in the order their <b>first</b> file appears in the input.</p>`,
      constraints: `0 ≤ len(owner) ≤ 10<sup>5</sup>`,
      example: `<p>{'a.py': 'ann', 'b.py': 'bob', 'c.py': 'ann'} → ${H.c('g', "{'ann': ['a.py', 'c.py'], 'bob': ['b.py']}")}. The naive <code>{v: k for k, v in owner.items()}</code> gives <code>{'ann': 'c.py', 'bob': 'b.py'}</code> — ${H.c('r', "'a.py' is lost")}.</p>`,
      brute: { why: `<p>For every distinct owner, scan the whole dict again to collect their files: O(n · u) where u = number of owners. With 10<sup>5</sup> files and 10<sup>4</sup> owners that is 10<sup>9</sup> steps.</p>`, code: `
def group_brute(owner):
    result = {}
    for o in owner.values():
        if o not in result:
            result[o] = sorted(f for f, who in owner.items() if who == o)   # rescans everything
    return result

print(group_brute({"a.py": "ann", "b.py": "bob", "c.py": "ann"}))` },
      mcq: { q: 'Which one-pass approach groups correctly?', options: ['<code>{v: k for k, v in d.items()}</code>', '<code>for k, v in d.items(): out.setdefault(v, []).append(k)</code>', '<code>dict(zip(d.values(), d.keys()))</code>', '<code>set(d.values())</code>'], answer: 1, explain: 'setdefault returns the existing list or inserts a new empty one, so each key is appended to its owner\'s list in one O(1) step. Option A and Option C overwrite duplicates; Option D loses the files entirely.' },
      hints: [`<p>Hint 1: Each (file, owner) pair needs to be put into its owner's bucket exactly once — one pass is enough.</p>`, `<p>Hint 2: Use <code>dict.setdefault(owner, [])</code> or <code>collections.defaultdict(list)</code>. Plain dicts keep first-insertion order, which matches the required owner order.</p>`, `<p>Hint 3: Sort each bucket at the end (a dict comprehension does it neatly). Recipe: groups = {}; for f, o in owner.items(): groups.setdefault(o, []).append(f); return {o: sorted(fs) for o, fs in groups.items()}.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_val',
        cases: [
          [
            ['list(group_by_owner({\'a.py\': \'ann\', \'b.py\': \'bob\', \'c.py\': \'ann\'}).items())'],
            [['ann', ['a.py', 'c.py']], ['bob', ['b.py']]]
          ],
          [['list(group_by_owner({}).items())'], []],
          [['list(group_by_owner({\'x\': \'z\'}).items())'], [['z', ['x']]]],
          [
            ['list(group_by_owner({\'z\': \'bob\', \'y\': \'ann\', \'x\': \'bob\'}).items())'],
            [['bob', ['x', 'z']], ['ann', ['y']]]
          ],
          [
            ['list(group_by_owner({\'f10\': \'o\', \'f2\': \'o\', \'f1\': \'o\'}).items())'],
            [['o', ['f1', 'f10', 'f2']]]
          ],
          [
            ['list(group_by_owner({\'a\': \'1\', \'b\': \'1\', \'c\': \'1\'}).items())'],
            [['1', ['a', 'b', 'c']]]
          ],
          [['list(group_by_owner({\'b\': \'x\', \'a\': \'y\'}).items())'], [['x', ['b']], ['y', ['a']]]],
          [
            [
              'list(group_by_owner({\'0.md\': \'bob\', \'a.py\': \'ann\', \'b.py\': \'bob\', \'c.py\': \'ann\'}).items())'
            ],
            [['bob', ['0.md', 'b.py']], ['ann', ['a.py', 'c.py']]]
          ],
          [
            [
              '(lambda g: [(w, len(fs), fs[0], fs[-1]) for w, fs in g.items()])(group_by_owner({\'f%d\' % i: \'o%d\' % (i % 3) for i in range(100000)}))'
            ],
            [['o0', 33334, 'f0', 'f99999'], ['o1', 33333, 'f1', 'f99997'], ['o2', 33333, 'f10001', 'f99998']]
          ],
          [
            [
              'group_by_owner({\'a.py\': \'ann\', \'b.py\': \'bob\', \'c.py\': \'ann\'}) == {\'ann\': [\'a.py\', \'c.py\'], \'bob\': [\'b.py\']}'
            ],
            true
          ]
        ],
        harness: {
          python: 'def t_val(src):\n' +
            '    try:\n' +
            '        return eval(src)\n' +
            '    except Exception as e:\n' +
            '        return \'!\' + type(e).__name__'
        }
      },
      solution: {
        approach: `<p>One pass groups files into lists keyed by owner (insertion order gives first-appearance order of owners). A final dict comprehension sorts each list. Comprehension for the clean transform, loop for the accumulation — each tool where it reads best.</p>`,
        code: `
def group_by_owner(owner):
    groups = {}                                   # owner -> list of files
    for file, who in owner.items():
        groups.setdefault(who, []).append(file)   # O(1) amortized
    return {who: sorted(files) for who, files in groups.items()}   # comprehension

print(group_by_owner({"a.py": "ann", "b.py": "bob", "c.py": "ann", "0.md": "bob"}))
print(group_by_owner({}))`,
        alt: [{ lang: 'python', title: 'defaultdict version', code: `
from collections import defaultdict

def group_by_owner(owner):
    groups = defaultdict(list)
    for file, who in owner.items():
        groups[who].append(file)
    return {who: sorted(files) for who, files in groups.items()}

print(group_by_owner({"a.py": "ann", "b.py": "bob", "c.py": "ann"}))` }],
        dry: { head: ['file', 'owner', 'groups after'], rows: [['a.py', 'ann', "{ann: [a.py]}"], ['b.py', 'bob', "{ann: [a.py], bob: [b.py]}"], ['c.py', 'ann', "{ann: [a.py, c.py], bob: [b.py]}"], ['0.md', 'bob', "{ann: [a.py, c.py], bob: [b.py, 0.md]}"], ['sort', '—', "<span class=\"c-g\">{ann: [a.py, c.py], bob: [0.md, b.py]}</span>"]] },
        complexity: `<p>Time O(n log n) in the worst case (sorting the buckets; O(n) for the grouping). Space O(n).</p>`,
        followUps: ['Return owners sorted by number of files (descending)', 'Do it with <code>itertools.groupby</code> — what must be true about the input first?']
      }
    }]
  });

  /* ================= TOPIC 6: copying ================= */
  topics.push({
    title: 'Copying: Assignment vs Shallow Copy vs Deep Copy (and the [[0]*n]*n Trap)',
    analogy: `<p>You have a <b>binder of recipe cards</b>.</p>
<ul><li><b>Assignment</b> (<code>b = a</code>) is putting a second <b>name sticker</b> on the same binder. Scribble in it and both "binders" show the scribble — there is only one.</li>
<li><b>Shallow copy</b> is buying a <b>new binder</b> and clipping in the <b>same cards</b>. Add or remove cards in your binder and the old one is unaffected — but write on a card and it shows in both, because the cards are shared.</li>
<li><b>Deep copy</b> is <b>photocopying every card</b> into a new binder. Nothing is shared; do whatever you like.</li></ul>`,
    explain: `<p>🟢 <b>The plain idea.</b> Python variables are <b>names pointing at objects</b>. Copying is about <b>how many new objects</b> you create.</p>
${H.table(['Operation', 'New outer object?', 'New inner objects?', 'Examples'], [['assignment', H.c('r', 'no'), H.c('r', 'no'), '<code>b = a</code>, passing <code>a</code> to a function'], ['shallow copy', H.c('g', 'yes'), H.c('r', 'no (shared)'), '<code>a[:]</code>, <code>list(a)</code>, <code>a.copy()</code>, <code>copy.copy(a)</code>, <code>dict(d)</code>, <code>{**d}</code>, <code>set(s)</code>'], ['deep copy', H.c('g', 'yes'), H.c('g', 'yes, recursively'), '<code>copy.deepcopy(a)</code>']])}
<p>For a <b>flat</b> list of immutable things (ints, strings), a shallow copy is all you ever need: the shared items can't be changed anyway. The difference only matters for <b>nested mutable</b> data — lists of lists, dicts of lists, objects holding lists.</p>
<pre>a = [[1, 2], [3, 4]]
b = a.copy()          # shallow
b.append([5])         # only b grows       → a unchanged
b[0].append(99)       # shared inner list  → a[0] is now [1, 2, 99] too!</pre>
<p><b>The grid trap.</b> <code>grid = [[0] * 3] * 3</code> creates <b>one</b> inner list and three pointers to it. <code>grid[0][0] = 1</code> changes "all three rows". Build each row separately: <code>grid = [[0] * 3 for _ in range(3)]</code>. (<code>[0] * 3</code> itself is fine — ints are immutable.)</p>
<p><b>Check yourself</b> with <code>is</code> (same object?) versus <code>==</code> (equal value?): after a shallow copy, <code>b == a</code> and <code>b is not a</code>, but <code>b[0] is a[0]</code>.</p>
<p><b>Functions don't copy.</b> Passing a list to a function hands over a reference ("call by sharing"). If the function mutates it, the caller sees it. Copy at the boundary if you must not change the caller's data — and never use a mutable default argument (<code>def f(x, acc=[])</code>): that one list is shared across all calls.</p>`,
    clues: [
      '"modify a copy without affecting the original" with nested data → <code>copy.deepcopy</code> (or a targeted copy like <code>[row[:] for row in grid]</code>)',
      '"create an m × n grid / DP table" → <code>[[0] * n for _ in range(m)]</code>, never <code>[[0] * n] * m</code>',
      '"backtracking: record the current path" → append a <b>copy</b> (<code>path[:]</code>), not the list you keep mutating',
      '"simulate the next state from the current state" (Game of Life) → read from a copy, write to the board',
      '"clone a graph / linked structure with cycles" → a memo dict id → copy (what deepcopy does internally)',
      '"why did changing one row change every row?" → aliasing via list multiplication'
    ],
    code: [{ lang: 'python', title: 'Three levels of copying, verified with is (runnable)', run: true, code: `
import copy

a = [[1, 2], [3, 4]]
alias = a                    # same object
shallow = a.copy()           # new outer list, SAME inner lists
deep = copy.deepcopy(a)      # new outer list, NEW inner lists

print(alias is a, shallow is a, deep is a)          # True False False
print(shallow[0] is a[0], deep[0] is a[0])          # True False

shallow[0].append(99)        # visible through a (shared inner list)
deep[1].append(-1)           # private to deep
print("a      :", a)
print("shallow:", shallow)
print("deep   :", deep)

# The grid trap
bad = [[0] * 3] * 3
bad[0][0] = 1
good = [[0] * 3 for _ in range(3)]
good[0][0] = 1
print("bad :", bad)
print("good:", good)

# Backtracking: store a copy of the path, not the path itself
res, path = [], []
for x in (1, 2, 3):
    path.append(x)
    res.append(path[:])      # snapshot
print(res)
` }, { lang: 'python', title: 'deepcopy keeps shared references and survives cycles (runnable)', run: true, code: `
import copy

shared = [0]
data = {"x": shared, "y": shared}      # two keys -> one list
data["self"] = data                     # a cycle!

clone = copy.deepcopy(data)             # memo dict: id(original) -> copy
print(clone["x"] is clone["y"])         # True: sharing preserved inside the copy
print(clone["x"] is shared)             # False: but it is a NEW list
print(clone["self"] is clone)           # True: cycle reproduced, no infinite loop

class Config:
    def __init__(self, items):
        self.items = items
    def __deepcopy__(self, memo):       # customise: copy the list, keep strings shared
        new = Config(list(self.items))
        memo[id(self)] = new
        return new

c1 = Config(["a", "b"])
c2 = copy.deepcopy(c1)
c2.items.append("c")
print(c1.items, c2.items)
` }],
    codeTitle: ['Alias vs shallow vs deep', 'deepcopy internals'],
    viz: {
      title: 'Who points to what? Copy, then mutate, and watch the arrows',
      input: 'shallow',
      inputLabel: 'mode: assign | shallow | deep | trap',
      gen: function (input) {
        var mode = String(input || '').trim().toLowerCase();
        if (['assign', 'shallow', 'deep', 'trap'].indexOf(mode) < 0) throw new Error('Type one of: assign, shallow, deep, trap');
        var frames = [];
        if (mode === 'trap') {
          var codeT = 'grid = [[0] * 3] * 3\ngrid[0][0] = 1\nprint(grid)\ngrid = [[0] * 3 for _ in range(3)]\ngrid[0][0] = 1';
          var GT = function (rows, inner, hl, ehl) {
            var nodes = [{ id: 'g', label: 'grid', x: 8, y: 30, shape: 'box', w: 10 }, { id: 'O', label: 'outer [•, •, •]', x: 38, y: 30, shape: 'box', w: 24 }], edges = [['g', 'O']];
            if (rows === 1) { nodes.push({ id: 'R', label: inner[0], x: 82, y: 30, shape: 'box', w: 22 }); edges.push(['O', 'R', '[0]'], ['O', 'R', '[1]'], ['O', 'R', '[2]']); }
            else { [0, 1, 2].forEach(function (r) { nodes.push({ id: 'R' + r, label: inner[r], x: 82, y: 8 + r * 22, shape: 'box', w: 22 }); edges.push(['O', 'R' + r, '[' + r + ']']); }); }
            return { type: 'graph', label: 'names → objects', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {} };
          };
          frames.push(fr('<code>[0] * 3</code> builds <b>one</b> list [0, 0, 0]. Multiplying the outer list by 3 copies the <b>pointer</b> three times — all rows are the same object.', [GT(1, ['[0, 0, 0]'], { R: 'cur' }), cp(codeT, 1)]));
          frames.push(fr('<code>grid[0][0] = 1</code> follows pointer [0] to that single inner list and changes it. Pointers [1] and [2] lead to the very same list…', [GT(1, ['[1, 0, 0]'], { R: 'bad' }, { 'O-R': 'bad' }), cp(codeT, 2, 'bad')]));
          frames.push(fr('…so printing shows <b>[[1, 0, 0], [1, 0, 0], [1, 0, 0]]</b>. Every row "changed" because there is only one row.', [GT(1, ['[1, 0, 0]'], { R: 'bad' }), cp(codeT, 3), tx('[[1, 0, 0], [1, 0, 0], [1, 0, 0]]', 'output')]));
          frames.push(fr('The fix: a comprehension evaluates <code>[0] * 3</code> <b>once per row</b>, creating three distinct lists.', [GT(3, ['[0, 0, 0]', '[0, 0, 0]', '[0, 0, 0]'], { R0: 'ok', R1: 'ok', R2: 'ok' }), cp(codeT, 4, 'ok')]));
          frames.push(fr('Now <code>grid[0][0] = 1</code> touches only row 0: <b>[[1, 0, 0], [0, 0, 0], [0, 0, 0]]</b>.', [GT(3, ['[1, 0, 0]', '[0, 0, 0]', '[0, 0, 0]'], { R0: 'ok' }, { 'O-R0': 'ok' }), cp(codeT, 5, 'ok')]));
          return frames;
        }
        var expr = { assign: 'a', shallow: 'a.copy()', deep: 'copy.deepcopy(a)' }[mode];
        var code = 'a = [[1, 2], [3, 4]]\nb = ' + expr + '\nb.append([5])\nb[0].append(99)\nprint(a)\nprint(b)';
        var st = { i1: '[1, 2]', i2: '[3, 4]', c1: '[1, 2]', c2: '[3, 4]', bHasNew: false };
        function G(stage, hl, ehl, tags) {
          var nodes = [{ id: 'a', label: 'a', x: 6, y: 12, shape: 'box', w: 8 }, { id: 'A', label: 'outer list A', x: 32, y: 12, shape: 'box', w: 20 }, { id: 'I1', label: st.i1, x: 66, y: 6, shape: 'box', w: 18 }, { id: 'I2', label: st.i2, x: 66, y: 22, shape: 'box', w: 14 }];
          var edges = [['a', 'A'], ['A', 'I1', '[0]'], ['A', 'I2', '[1]']];
          if (stage >= 2) {
            nodes.push({ id: 'b', label: 'b', x: 6, y: 48, shape: 'box', w: 8 });
            if (mode === 'assign') edges.push(['b', 'A']);
            else {
              nodes.push({ id: 'B', label: 'outer list B', x: 32, y: 48, shape: 'box', w: 20 });
              edges.push(['b', 'B']);
              if (mode === 'shallow') edges.push(['B', 'I1', '[0]'], ['B', 'I2', '[1]']);
              else { nodes.push({ id: 'C1', label: st.c1, x: 66, y: 40, shape: 'box', w: 18 }, { id: 'C2', label: st.c2, x: 66, y: 55, shape: 'box', w: 14 }); edges.push(['B', 'C1', '[0]'], ['B', 'C2', '[1]']); }
            }
          }
          if (st.bHasNew) { nodes.push({ id: 'N', label: '[5]', x: 92, y: 40, shape: 'box', w: 10 }); edges.push([mode === 'assign' ? 'A' : 'B', 'N', '[2]']); }
          return { type: 'graph', label: 'names → objects (mode: ' + mode + ')', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
        }
        frames.push(fr('Line 1: one outer list A holding pointers to two inner lists.', [G(1, { A: 'ok', I1: 'ok', I2: 'ok' }), cp(code, 1)]));
        var n2 = { assign: '<code>b = a</code> creates <b>no</b> new object: b is a second name for A.', shallow: '<code>a.copy()</code> creates a <b>new outer list B</b>, but its slots hold the <b>same</b> pointers → the inner lists are shared.', deep: '<code>copy.deepcopy(a)</code> creates a new outer list <b>and</b> new copies of every inner list — nothing mutable is shared.' }[mode];
        frames.push(fr('Line 2: ' + n2, [G(2, mode === 'assign' ? { b: 'cur', A: 'cur' } : mode === 'shallow' ? { B: 'ok', I1: 'cur', I2: 'cur' } : { B: 'ok', C1: 'ok', C2: 'ok' }, {}, mode === 'shallow' ? { I1: 'shared', I2: 'shared' } : {}), cp(code, 2)]));
        st.bHasNew = true;
        frames.push(fr('Line 3: <code>b.append([5])</code> changes the <b>outer</b> list that b names. ' + (mode === 'assign' ? '<span class="c-r">That is A itself, so a grows too.</span>' : '<span class="c-g">That is B, so a is unaffected.</span>'), [G(3, mode === 'assign' ? { A: 'bad', N: 'ok' } : { B: 'ok', N: 'ok' }), cp(code, 3, mode === 'assign' ? 'bad' : 'ok')]));
        if (mode === 'deep') st.c1 = '[1, 2, 99]'; else st.i1 = '[1, 2, 99]';
        var bad = mode !== 'deep';
        frames.push(fr('Line 4: <code>b[0].append(99)</code> follows b\'s slot [0] to an inner list and mutates it. ' + (bad ? '<span class="c-r">That inner list is also a[0] — the change leaks into a.</span>' : '<span class="c-g">That is b\'s private copy — a[0] stays [1, 2].</span>'), [G(4, bad ? { I1: 'bad' } : { C1: 'ok', I1: 'done' }), cp(code, 4, bad ? 'bad' : 'ok')]));
        var outA = { assign: '[[1, 2, 99], [3, 4], [5]]', shallow: '[[1, 2, 99], [3, 4]]', deep: '[[1, 2], [3, 4]]' }[mode];
        var outB = { assign: '[[1, 2, 99], [3, 4], [5]]', shallow: '[[1, 2, 99], [3, 4], [5]]', deep: '[[1, 2, 99], [3, 4], [5]]' }[mode];
        frames.push(fr('Lines 5–6 print: a = <b>' + outA + '</b>, b = <b>' + outB + '</b>. ' + { assign: 'Assignment shares everything.', shallow: 'Shallow copy isolates the outer list but shares the inner ones.', deep: 'Deep copy isolates everything (at the cost of copying every nested object).' }[mode], [G(5, { a: 'sel', b: 'sel' }), cp(code, '5,6', 'ok'), tx('a = ' + outA + '<br>b = ' + outB, 'output')]));
        return frames;
      }
    },
    examples: [
      { title: 'Predict the output: slicing a nested list', html: `<pre>m = [[0, 0], [0, 0]]
n = m[:]
n[0][0] = 7
n[1] = [9, 9]
print(m)</pre><p>${H.c('g', '[[7, 0], [0, 0]]')}. <code>m[:]</code> is shallow: <code>n[0]</code> is the same row as <code>m[0]</code>, so writing into it shows in m. <code>n[1] = …</code> rebinds a slot of n only.</p>`, code: { lang: 'python', run: true, code: `m = [[0, 0], [0, 0]]\nn = m[:]\nn[0][0] = 7\nn[1] = [9, 9]\nprint(m)` } },
      { title: 'Predict the output: mutable default argument', html: `<pre>def add(x, acc=[]):
    acc.append(x)
    return acc
print(add(1), add(2))</pre><p>${H.c('r', '[1, 2] [1, 2]')}. The default list is created <b>once</b> when the function is defined and shared by every call (and both printed values are the same object). Use <code>acc=None</code> then <code>acc = [] if acc is None else acc</code>.</p>`, code: { lang: 'python', run: true, code: `def add(x, acc=[]):\n    acc.append(x)\n    return acc\nprint(add(1), add(2))\n\ndef add_fixed(x, acc=None):\n    acc = [] if acc is None else acc\n    acc.append(x)\n    return acc\nprint(add_fixed(1), add_fixed(2))` } },
      { title: 'Copying dicts: shallow by default', html: `<p><code>dict(d)</code>, <code>d.copy()</code> and <code>{**d}</code> are all shallow. Merge-with-override <code>{**defaults, **overrides}</code> is common in config code — if a value is a nested dict, both configs share it.</p>`, code: { lang: 'python', run: true, code: `import copy\ndefaults = {'retries': 3, 'headers': {'ua': 'bot'}}\ncfg = {**defaults, 'retries': 5}\ncfg['headers']['ua'] = 'custom'        # leaks into defaults!\nprint(defaults['headers'])\nsafe = copy.deepcopy(defaults)\nsafe['headers']['ua'] = 'other'\nprint(defaults['headers'], safe['headers'])` } },
      { title: 'Cheaper than deepcopy for 2-D data', html: `<p>For a grid of immutable values, <code>[row[:] for row in grid]</code> (or <code>[row.copy() …]</code>) is a complete copy and is typically 10× faster than <code>copy.deepcopy</code>, which must inspect every object and maintain a memo dict.</p>`, code: { lang: 'python', run: true, code: `import copy\nfrom timeit import timeit\ngrid = [[0] * 100 for _ in range(100)]\nt_rows = timeit(lambda: [row[:] for row in grid], number=200)\nt_deep = timeit(lambda: copy.deepcopy(grid), number=200)\nprint(f'row copies: {t_rows:.3f}s  deepcopy: {t_deep:.3f}s  faster: {t_rows < t_deep}')` } }
    ],
    deepDive: `<p>🟣 <b>How <code>copy.copy</code> works.</b> It first looks for a type-specific fast path (lists, dicts, sets have one), then for a <code>__copy__</code> method, then falls back to the pickle protocol (<code>__reduce_ex__(4)</code>) to rebuild an object of the same class with the same <code>__dict__</code> contents (shared, of course). Immutable atoms (int, str, tuple of atoms, frozenset, None, functions, classes) are returned <b>as is</b>.</p>
<p><b>How <code>copy.deepcopy</code> works.</b> It walks the object graph recursively, carrying a <b>memo dict</b> <code>{id(original): copy}</code>. Before copying any object it checks the memo; this both <b>preserves sharing</b> (two references to one list become two references to one new list) and makes <b>cycles</b> terminate. A tuple is only re-created if any element actually changed during copying. Custom classes can override with <code>__deepcopy__(self, memo)</code> — remember to register yourself in <code>memo</code> before recursing to support cycles.</p>
<p><b>Costs.</b> Shallow copy of a container is O(n) in its length (pointer copies plus refcount increments). Deep copy is O(total objects reachable) with significant per-object overhead (Python-level recursion, memo lookups) — often 10–100× slower than a tailored copy. Deep recursion on very deep structures can hit the recursion limit.</p>
<p><b>Alternatives in production:</b> design data as <b>immutable</b> (tuples, frozen dataclasses, <code>copy.replace()</code> in 3.13+) so you never need defensive copies; for JSON-like data, rebuild with comprehensions or (less efficiently) <code>json.loads(json.dumps(x))</code>; for numeric arrays use <code>numpy.copy</code>. Things that can't be deep-copied meaningfully: open files, sockets, locks, generators — deepcopy raises <code>TypeError</code> for many of them.</p>
<p><b>Identity tools:</b> <code>id(x)</code> is the object's identity (its memory address in CPython); <code>is</code> compares identities; <code>sys.getrefcount</code> shows how many references exist (plus one for the call itself).</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI-generated code frequently contains the subtle aliasing bugs: <code>[[0] * n] * m</code> grids, backtracking that appends <code>path</code> instead of <code>path[:]</code>, mutable defaults, and "defensive" <code>deepcopy</code> calls sprinkled everywhere that make hot loops crawl.</p>
<p><b>Use AI as a partner:</b> "<i>draw the object graph (names → objects) after each line of this snippet</i>", "<i>find every place this function mutates its arguments</i>", or "<i>replace deepcopy here with the cheapest copy that is still correct, and justify it</i>".</p>
<p><b>Where AI goes wrong:</b> it calls <code>list(a)</code> a "full copy", claims <code>dict.copy()</code> copies nested dicts, or "fixes" a shared-row bug by deep-copying the whole board every iteration instead of building rows correctly once.</p>
<p><b>What you must still own:</b> the reference model and the ability to predict exactly which objects are shared after any line — the basis for debugging the bugs AI writes most often.</p>`,
    problems: [{
      title: 'Game of Life — One Step (Copy the Board Correctly)',
      level: 'Medium', tags: ['copying', 'matrix', 'simulation'], companies: ['Google', 'Dropbox', 'Microsoft', 'Amazon'],
      statement: `<p>Given an m × n board of 0 (dead) and 1 (live) cells, update it <b>in place</b> to the next state. All cells change <b>simultaneously</b> using these rules on the 8 neighbours: a live cell with 2 or 3 live neighbours stays alive, otherwise dies; a dead cell with exactly 3 live neighbours becomes alive.</p>`,
      constraints: `1 ≤ m, n ≤ 25`,
      example: `<p>[[0,1,0],[0,0,1],[1,1,1],[0,0,0]] → ${H.c('g', '[[0,0,0],[1,0,1],[0,1,1],[0,1,0]]')}. "Simultaneously" means every cell must read the <b>old</b> state of its neighbours — if you overwrite cells as you go, later cells read new values and the answer is wrong.</p>`,
      brute: { why: `<p>Easiest correct version: <code>copy.deepcopy(board)</code> each step and read from the copy. It works, but deepcopy inspects every int object through a memo dict — far slower than needed. The <b>buggy</b> "fast" version uses <code>old = board[:]</code>: that copies only the outer list, so <code>old[r]</code> <b>is</b> <code>board[r]</code> and every write leaks into the "old" board.</p>`, code: `
import copy

def game_of_life_deepcopy(board):
    old = copy.deepcopy(board)          # correct but heavy: walks every object
    m, n = len(board), len(board[0])
    for r in range(m):
        for c in range(n):
            live = sum(old[i][j]
                       for i in range(max(0, r - 1), min(m, r + 2))
                       for j in range(max(0, c - 1), min(n, c + 2))
                       if (i, j) != (r, c))
            board[r][c] = 1 if live == 3 or (old[r][c] and live == 2) else 0
    return board

print(game_of_life_deepcopy([[0, 1, 0], [0, 0, 1], [1, 1, 1], [0, 0, 0]]))` },
      mcq: { q: '<code>old = board[:]</code> then writing into <code>board[r][c]</code>… what happens to <code>old[r][c]</code>?', options: ['It keeps the old value', 'It changes too — rows are shared by a shallow copy', 'Python raises an error', 'It becomes None'], answer: 1, explain: 'Slicing copies the outer list only; <code>old[r] is board[r]</code> for every r, so the "snapshot" is not a snapshot. Copy each row: <code>[row[:] for row in board]</code>.' },
      hints: [`<p>Hint 1: Every cell must read the <b>previous</b> generation. So you need the old values somewhere while you write new ones.</p>`, `<p>Hint 2: The board is a list of rows of ints. Copying each row (<code>[row[:] for row in board]</code>) gives a full independent snapshot — no need for deepcopy because ints are immutable.</p>`, `<p>Hint 3: For O(1) extra space, encode both states in each cell: 2 = "was live, now dead", 3 = "was dead, now live"; read old state as <code>cell in (1, 2)</code>, then normalise with <code>% 2</code>... careful: 2 % 2 = 0 (dead) and 3 % 2 = 1 (live) — exactly right.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_run',
        cases: [
          [
            [
              'b = [[0, 1, 0], [0, 0, 1], [1, 1, 1], [0, 0, 0]]\n' +
                'r = game_of_life(b)\n' +
                'result = [b, r is b]'
            ],
            [[[0, 0, 0], [1, 0, 1], [0, 1, 1], [0, 1, 0]], true]
          ],
          [
            [
              'b = [[1, 1], [1, 1]]\n' +
                'r = game_of_life(b)\n' +
                'result = [b, r is b]'
            ],
            [[[1, 1], [1, 1]], true]
          ],
          [
            [
              'b = [[0, 0, 0], [1, 1, 1], [0, 0, 0]]\n' +
                'r = game_of_life(b)\n' +
                'result = [b, r is b]'
            ],
            [[[0, 1, 0], [0, 1, 0], [0, 1, 0]], true]
          ],
          [['b = [[1]]\nr = game_of_life(b)\nresult = [b, r is b]'], [[[0]], true]],
          [['b = [[0]]\nr = game_of_life(b)\nresult = [b, r is b]'], [[[0]], true]],
          [
            [
              'b = [[1, 1, 1], [1, 1, 1], [1, 1, 1]]\n' +
                'r = game_of_life(b)\n' +
                'result = [b, r is b]'
            ],
            [[[1, 0, 1], [0, 0, 0], [1, 0, 1]], true]
          ],
          [
            [
              'b = [[0, 1, 0, 0, 0], [0, 0, 1, 0, 0], [1, 1, 1, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]\n' +
                'r = game_of_life(b)\n' +
                'result = [b, r is b]'
            ],
            [[[0, 0, 0, 0, 0], [1, 0, 1, 0, 0], [0, 1, 1, 0, 0], [0, 1, 0, 0, 0], [0, 0, 0, 0, 0]], true]
          ],
          [
            [
              'b = [[1, 0], [0, 1]]\n' +
                'r = game_of_life(b)\n' +
                'result = [b, r is b]'
            ],
            [[[0, 0], [0, 0]], true]
          ],
          [
            [
              'b = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]\n' +
                'r = game_of_life(b)\n' +
                'result = [b, r is b]'
            ],
            [[[0, 0, 0], [0, 0, 0], [0, 0, 0]], true]
          ],
          [['b = [[1, 1, 0]]\nr = game_of_life(b)\nresult = [b, r is b]'], [[[0, 0, 0]], true]],
          [
            [
              'import random\n' +
                'rnd = random.Random(5)\n' +
                'b = [[rnd.randint(0, 1) for _ in range(25)] for _ in range(25)]\n' +
                'game_of_life(b)\n' +
                'result = b'
            ],
            [
              [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0],
              [1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0],
              [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
              [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
              [1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
              [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1],
              [1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
              [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0],
              [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1],
              [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
              [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
              [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
              [1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
              [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
              [0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
              [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0],
              [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1],
              [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1],
              [1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0],
              [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0],
              [0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0],
              [0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0],
              [0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0]
            ]
          ],
          [
            [
              'b = [[1] * 25 for _ in range(25)]\n' +
                'game_of_life(b)\n' +
                'result = [sum(map(sum, b)), b[0][0], b[0][1], b[1][1], b[12][12]]'
            ],
            [4, 1, 0, 0, 0]
          ]
        ],
        harness: {
          python: 'def t_run(src):\n' +
            '    ns = dict(globals())\n' +
            '    try:\n' +
            '        exec(src, ns)\n' +
            '        return ns[\'result\']\n' +
            '    except Exception as e:\n' +
            '        return \'!\' + type(e).__name__'
        }
      },
      solution: {
        approach: `<p>Take a row-wise snapshot (shallow copy of each row = complete copy of a 2-D int grid), count neighbours from the snapshot, write into the board. The alternative encodes transitions in place for O(1) extra space.</p>`,
        code: `
def game_of_life(board):
    m, n = len(board), len(board[0])
    old = [row[:] for row in board]           # independent copy of every row
    for r in range(m):
        for c in range(n):
            live = 0
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    if (dr or dc) and 0 <= r + dr < m and 0 <= c + dc < n:
                        live += old[r + dr][c + dc]   # always read the OLD state
            board[r][c] = 1 if live == 3 or (old[r][c] == 1 and live == 2) else 0
    return board

print(game_of_life([[0, 1, 0], [0, 0, 1], [1, 1, 1], [0, 0, 0]]))`,
        alt: [{ lang: 'python', title: 'O(1) extra space: encode transitions', code: `
def game_of_life_inplace(board):
    m, n = len(board), len(board[0])
    for r in range(m):
        for c in range(n):
            live = 0
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    rr, cc = r + dr, c + dc
                    if (dr or dc) and 0 <= rr < m and 0 <= cc < n and board[rr][cc] in (1, 2):
                        live += 1             # 1 = live, 2 = was live (dying)
            if board[r][c] == 1 and live not in (2, 3):
                board[r][c] = 2               # live -> dead
            elif board[r][c] == 0 and live == 3:
                board[r][c] = 3               # dead -> live
    for r in range(m):
        for c in range(n):
            board[r][c] %= 2                  # 2 -> 0, 3 -> 1
    return board

print(game_of_life_inplace([[0, 1, 0], [0, 0, 1], [1, 1, 1], [0, 0, 0]]))` }],
        dry: { head: ['cell', 'old value', 'live neighbours (from old)', 'new value'], rows: [['(0,1)', '1', '1', '0 (under-population)'], ['(1,0)', '0', '3', '<span class="c-g">1 (birth)</span>'], ['(1,2)', '1', '3', '1 (survives)'], ['(2,1)', '1', '3', '1 (survives)'], ['(3,1)', '0', '3', '<span class="c-g">1 (birth)</span>']] },
        complexity: `<p>Time O(m·n·8) = O(m·n). Extra space O(m·n) for the snapshot, or O(1) with the encoding trick.</p>`,
        followUps: ['Infinite board: store only live cells in a set of (r, c) tuples', 'Why is deepcopy unnecessary here but necessary for a board of mutable Cell objects?']
      }
    }]
  });

  /* ================= TOPIC 7: Big-O of common operations ================= */
  topics.push({
    title: 'Big-O Cheat Sheet for Built-ins: list, dict, set, deque, str, heapq, sort',
    analogy: `<p>Big-O is the <b>price list</b> of a shop. Before filling your basket (writing a loop), you glance at what each item costs. "<code>x in list</code>" looks cheap on the shelf but the price is <b>per item in the list</b>; do it inside a loop and the bill silently becomes n × n. Knowing the price list is how you avoid a shocking receipt (a timeout) at the checkout.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Big-O describes how the work <b>grows</b> as the input size n grows. Python's built-ins have well-known costs. Memorise the table and you can price any solution line by line.</p>
${H.table(['Operation', 'list', 'dict / set', 'deque'], [['index get/set <code>x[i]</code>', H.c('g', 'O(1)'), 'O(1) by key', 'O(1) at ends, O(n) middle'], ['append / add at end', H.c('g', 'O(1)*'), H.c('g', 'O(1)*'), H.c('g', 'O(1)')], ['add/remove at front', H.c('r', 'O(n)'), '—', H.c('g', 'O(1)')], ['pop() from end', H.c('g', 'O(1)'), '<code>popitem</code> O(1)', H.c('g', 'O(1)')], ['insert / pop at index i', H.c('r', 'O(n − i)'), '—', 'O(n)'], ['<code>x in c</code>', H.c('r', 'O(n)'), H.c('g', 'O(1) avg'), H.c('r', 'O(n)')], ['remove by value', H.c('r', 'O(n)'), H.c('g', 'O(1) avg'), H.c('r', 'O(n)')], ['len()', 'O(1)', 'O(1)', 'O(1)'], ['iterate all / copy', 'O(n)', 'O(n)', 'O(n)'], ['slice <code>a[i:j]</code>', 'O(j − i)', '—', '—'], ['sort / sorted', 'O(n log n)', '—', '—'], ['min / max / sum', 'O(n)', 'O(n)', 'O(n)']])}
<p><small>* amortized: occasionally O(n) for a resize, O(1) on average over many calls.</small></p>
<p><b>Strings</b> are immutable: <code>s + t</code> is O(len(s) + len(t)) because it builds a new string. Building a string with <code>+=</code> in a loop is O(n²) in principle — use <code>''.join(parts)</code>, which is O(total length). <code>sub in s</code> is O(n) on typical input.</p>
<p><b>Other workhorses:</b> <code>heapq.heappush/heappop</code> O(log n), <code>heapq.heapify</code> O(n), <code>bisect.bisect_left</code> O(log n) (but <code>insort</code> is O(n) because of the list insert), <code>Counter(it)</code> O(n), <code>Counter.most_common(k)</code> O(n log k).</p>
<p><b>Three different words:</b> <b>worst case</b> (guaranteed upper bound), <b>average case</b> (typical, e.g. hash tables with a good hash), and <b>amortized</b> (averaged over a sequence of operations, e.g. list append). Interviewers like hearing which one you mean.</p>
<p><b>Budget rule (Python):</b> roughly 10<sup>7</sup> simple operations per second. n = 10<sup>5</sup> → O(n log n) ≈ 1.7·10<sup>6</sup> ✓, O(n²) = 10<sup>10</sup> ✗.</p>`,
    clues: [
      '"N ≤ 10<sup>5</sup> or 10<sup>6</sup>" → you can afford O(N) or O(N log N); any O(N) built-in inside a loop (<code>in list</code>, <code>remove</code>, <code>insert(0)</code>, <code>index</code>, slicing) is a red flag',
      '"N ≤ 1000" → O(N²) nested loops are fine in Python (~10<sup>6</sup>)',
      '"k largest / smallest", "stream of numbers, get min" → heapq: O(n log k) or O(log n) per op',
      '"sorted data, find position / count in range" → bisect, O(log n)',
      '"build a long string from pieces" → collect in a list and <code>"".join</code>, not <code>+=</code>',
      '"what is the time complexity of your solution?" → price every line: loop count × cost of the operations inside'
    ],
    code: [{ lang: 'python', title: 'Measure it: the same task with an O(n²) and an O(n) data structure (runnable)', run: true, code: `
from timeit import timeit

def common_slow(a, b):
    return [x for x in a if x in b]          # b is a list: O(len(a) * len(b))

def common_fast(a, b):
    bs = set(b)                              # O(len(b)) once
    return [x for x in a if x in bs]         # O(len(a)) lookups at O(1)

for n in (1_000, 2_000, 4_000):
    a = list(range(n))
    b = list(range(n // 2, n + n // 2))
    t_slow = timeit(lambda: common_slow(a, b), number=1)
    t_fast = timeit(lambda: common_fast(a, b), number=1)
    print(f"n={n:>5}: list {t_slow*1000:7.1f} ms   set {t_fast*1000:5.2f} ms")
# Doubling n roughly quadruples the list version (O(n^2)) and doubles the set version (O(n)).
` }, { lang: 'python', title: 'String building, heap and bisect costs (runnable)', run: true, code: `
import bisect
import heapq

parts = [str(i) for i in range(10)]
s = "".join(parts)                 # O(total length) -- the idiomatic way
print(s)

nums = [9, 4, 7, 1, 8, 2]
print(heapq.nsmallest(3, nums))    # O(n log k)
heap = nums[:]
heapq.heapify(heap)                # O(n)
heapq.heappush(heap, 0)            # O(log n)
print(heapq.heappop(heap), heapq.heappop(heap))

sorted_nums = sorted(nums)         # O(n log n), Timsort
i = bisect.bisect_left(sorted_nums, 7)   # O(log n) search
print(sorted_nums, "7 goes at index", i)
print("count in [2, 8):", bisect.bisect_left(sorted_nums, 8) - bisect.bisect_left(sorted_nums, 2))
` }],
    codeTitle: ['list vs set membership at scale', 'str / heapq / bisect'],
    viz: [{
      title: 'How fast does the work grow? (log-scale bars, real step counts)',
      input: '100000',
      inputLabel: 'input size n (10 – 10,000,000)',
      gen: function (input) {
        var n = nums(input, 'one whole number')[0];
        if (n < 10 || n > 10000000) throw new Error('Pick n between 10 and 10,000,000');
        var classes = [
          ['O(1)', 1, 'dict/set lookup, list[i], append, len()'],
          ['O(log n)', Math.log2(n), 'heappush/heappop, bisect, binary search'],
          ['O(n)', n, 'x in list, list.insert(0, x), min/max/sum, one loop'],
          ['O(n log n)', n * Math.log2(n), 'sorted(), list.sort(), heap of all items'],
          ['O(n²)', n * n, 'nested loops, "x in list" inside a loop, insert(0) in a loop']
        ];
        function fmt(v) { return v >= 1e9 ? (v / 1e9).toFixed(1) + 'B' : v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : String(Math.round(v)); }
        function secs(v) { var s = v / 1e7; return s < 0.001 ? 'under 1 ms' : s < 1 ? (s * 1000).toFixed(0) + ' ms' : s < 3600 ? s.toFixed(1) + ' s' : (s / 3600).toFixed(1) + ' hours'; }
        var frames = [], vals = [], texts = [], labels = [];
        frames.push(fr('Input size n = <b>' + fmt(n) + '</b>. We will add one complexity class at a time. Bars use a <b>log scale</b> (bar height = number of digits) because O(n²) would otherwise dwarf everything. Python does roughly <b>10<sup>7</sup></b> simple steps per second.', [vp({ n: n, 'steps/second (Python, rough)': '10,000,000' })]));
        classes.forEach(function (c, i) {
          vals.push(Math.round(Math.log10(c[1] + 1) * 10) / 10); texts.push(fmt(c[1])); labels.push(c[0]);
          var hl = {}; hl[i] = c[1] / 1e7 > 2 ? 'bad' : 'ok';
          frames.push(fr('<b>' + c[0] + '</b> ≈ ' + fmt(c[1]) + ' steps → about <b>' + secs(c[1]) + '</b>. Examples: ' + c[2] + '. ' + (c[1] / 1e7 > 2 ? '<span class="c-r">Too slow for a 1–2 s limit.</span>' : '<span class="c-g">Comfortably fast.</span>'), [{ type: 'bars', label: 'log₁₀(steps)', values: vals.slice(), texts: texts.slice(), idxLabels: labels.slice(), hl: hl }, vp({ class: c[0], steps: fmt(c[1]), 'time ≈': secs(c[1]) })]));
        });
        frames.push(fr('Takeaway for n = ' + fmt(n) + ': pick data structures so that the operation <b>inside</b> your loop is O(1) or O(log n). One O(n) call hidden in a loop turns O(n) into O(n²).', [{ type: 'bars', label: 'log₁₀(steps)', values: vals.slice(), texts: texts.slice(), idxLabels: labels.slice(), hl: { 4: 'bad', 2: 'win', 0: 'ok' } }]));
        return frames;
      }
    }, {
      title: 'x in list scans; x in set jumps',
      input: '42 7 19 3 88 61 25 14 50 33; 50',
      inputLabel: 'values ; target',
      gen: function (input) {
        var p = String(input || '').split(';');
        if (p.length !== 2) throw new Error('Format: 4 8 15 16 ; 16');
        var a = nums(p[0]), t = nums(p[1], 'a target')[0];
        if (a.length > 16) throw new Error('Use at most 16 values');
        var frames = [], code = 'target in lst    # list: compare one by one\ntarget in st     # set: hash -> slot -> done';
        frames.push(fr('Searching for <b>' + t + '</b>. A list has no idea where values are, so <code>in</code> must compare from the left until it finds a match or reaches the end.', [{ type: 'array', label: 'lst', values: a.slice(), showIdx: true }, cp(code, 1)]));
        var found = -1;
        for (var i = 0; i < a.length; i++) {
          var hl = {}, ptr = {}; for (var j = 0; j < i; j++) hl[j] = 'done';
          hl[i] = a[i] === t ? 'ok' : 'cur'; ptr[i] = 'i';
          frames.push(fr('Compare lst[' + i + '] = ' + a[i] + ' with ' + t + ': ' + (a[i] === t ? '<span class="c-g">equal → True</span>' : 'not equal, keep going') + '. Comparisons so far: <b>' + (i + 1) + '</b>.', [{ type: 'array', label: 'lst', values: a.slice(), hl: hl, ptr: ptr, showIdx: true }, cp(code, 1), vp({ comparisons: i + 1 })]));
          if (a[i] === t) { found = i; break; }
        }
        var comps = found >= 0 ? found + 1 : a.length;
        if (found < 0) frames.push(fr('Reached the end: <b>False</b> after ' + comps + ' comparisons — the worst case is always n.', [{ type: 'array', label: 'lst', values: a.slice(), showIdx: true }, vp({ comparisons: comps }, 'comparisons', 'bad')]));
        var h = {}; h[String(t)] = a.indexOf(t) >= 0 ? 'ok' : 'bad';
        frames.push(fr('Set version: compute <code>hash(' + t + ')</code>, jump to its slot, compare once (a few times if collisions) → <b>' + (a.indexOf(t) >= 0 ? 'True' : 'False') + '</b>. Cost does not depend on how many items the set holds.', [{ type: 'set', label: 'st = set(lst)', items: a.slice(), hl: h }, cp(code, 2, 'ok'), vp({ 'list comparisons': comps, 'set probes': '≈ 1' }, 'set probes')]));
        frames.push(fr('Inside a loop of m queries: list → up to m × n comparisons, set → about m probes (+ n once to build it). Build the set <b>once</b>, outside the loop.', [vp({ 'm × n (list)': 'O(m·n)', 'n + m (set)': 'O(n + m)' }, 'n + m (set)', 'sel')]));
        return frames;
      }
    }],
    examples: [
      { title: 'Price a solution line by line', html: `<pre>def has_pair(nums, target):          # n = len(nums)
    seen = []                          # O(1)
    for x in nums:                     # n iterations
        if target - x in seen:         # O(n) scan  ← hidden cost
            return True
        seen.append(x)                 # O(1) amortized
    return False</pre><p>Total: n × O(n) = ${H.c('r', 'O(n²)')}. Changing <code>seen = []</code> to <code>seen = set()</code> and <code>append</code> to <code>add</code> makes the inner check O(1) → ${H.c('g', 'O(n)')}. One character class of change, a 10<sup>5</sup>× speed-up at n = 10<sup>5</sup>.</p>`, code: { lang: 'python', run: true, code: `def has_pair(nums, target):\n    seen = set()\n    for x in nums:\n        if target - x in seen:     # O(1) average\n            return True\n        seen.add(x)\n    return False\nprint(has_pair([3, 9, 14, 2], 11), has_pair([1, 2], 7))` } },
      { title: 'Predict the cost: x in d.values()', html: `<p><code>key in d</code> is O(1), but <code>value in d.values()</code> is ${H.c('r', 'O(n)')} — values are not indexed by hash. If you need reverse lookups, keep a second dict (value → key).</p>`, code: { lang: 'python', run: true, code: `d = {i: i * i for i in range(100_000)}\nprint(99_999 in d)                 # O(1): key lookup\nprint(99_999 ** 2 in d.values())   # O(n): linear scan of values\nrev = {v: k for k, v in d.items()} # O(n) once, then O(1) each\nprint(rev[99_999 ** 2])` } },
      { title: 'String building: += vs join', html: `<p>Each <code>s += piece</code> may copy the whole string so far (1 + 2 + … + n characters ≈ n²/2). CPython has a special trick that sometimes resizes in place when nothing else references <code>s</code>, but it is fragile (fails if another name refers to the string, and does not exist in PyPy). <code>"".join(list_of_pieces)</code> computes the final length once and copies each piece once: O(total).</p>`, code: { lang: 'python', run: true, code: `pieces = [str(i % 10) for i in range(100_000)]\ns = ''.join(pieces)                # O(total length)\nprint(len(s), s[:12])` } },
      { title: 'Sorting dominates', html: `<p>Sort once (O(n log n)) then answer many queries with <code>bisect</code> (O(log n) each) instead of scanning per query (O(n) each). For q = n = 10<sup>5</sup>: 1.7·10<sup>6</sup> + 1.7·10<sup>6</sup> vs 10<sup>10</sup>.</p>`, code: { lang: 'python', run: true, code: `import bisect\nscores = sorted([55, 91, 72, 38, 88, 64, 79])\ndef count_at_least(x):\n    return len(scores) - bisect.bisect_left(scores, x)   # O(log n)\nprint([count_at_least(q) for q in (50, 75, 95)])` } }
    ],
    deepDive: `<p>🟣 <b>Where the numbers come from.</b> The canonical reference is the CPython "TimeComplexity" wiki page; the costs follow directly from the data structures: contiguous pointer array (list), open-addressing hash tables (dict/set), doubly linked list of 64-slot blocks (deque), binary heap stored in a list (heapq).</p>
<p><b>Constant factors matter in Python.</b> Every bytecode costs tens of nanoseconds, so an O(n) loop written in Python can be slower than an O(n log n) <code>sorted()</code> implemented in C. Prefer built-ins and C-implemented helpers (<code>sum</code>, <code>max</code>, <code>sorted</code>, <code>str.join</code>, <code>collections</code>, <code>itertools</code>) over hand-written loops for the heavy lifting.</p>
<p><b>Hidden costs to watch:</b> slicing in a loop (<code>arr[1:]</code> in recursion is O(n) per call → O(n²)); <code>list.index</code> and <code>list.count</code>; <code>sum(lists, [])</code> for flattening (quadratic — use <code>itertools.chain.from_iterable</code>); <code>str.replace</code>/<code>split</code> each O(n); <code>sorted()</code> inside a loop; <code>len(list(gen))</code> materializing a generator; copying a dict to "freeze" it on every call.</p>
<p><b>Worst cases:</b> dict/set operations degrade to O(n) with pathological collisions; Timsort is O(n log n) worst case and O(n) on already-sorted or reverse-sorted input; <code>heapq</code> has no decrease-key (push duplicates and skip stale entries — "lazy deletion"); <code>deque[i]</code> is O(n) toward the middle.</p>
<p><b>Space complexity counts too:</b> a list comprehension over n items is O(n) memory; a generator is O(1). Recursion depth costs stack frames (default limit 1000). An interviewer asking "can you do better?" often means "can you drop the O(n) extra space?"</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> asking an assistant "what is the time complexity?" gets an answer instantly — and it is wrong surprisingly often when costs hide inside built-ins (slicing, <code>in</code> on a list, string concatenation). Treat AI complexity claims as hypotheses.</p>
<p><b>Use AI as a partner:</b> "<i>annotate every line of this function with its CPython cost and the total</i>", then check the annotations against the table above; or "<i>write a benchmark that doubles n five times and prints the ratio of runtimes</i>" — a ratio near 2 means O(n), near 4 means O(n²). Empirical growth checks are cheap and convincing.</p>
<p><b>Where AI goes wrong:</b> calling <code>x in d.values()</code> O(1), calling a recursion with slicing O(n), ignoring the cost of <code>sorted()</code> inside a loop, or confusing amortized with worst case.</p>
<p><b>What you must still own:</b> fast, confident pricing of code in your head during an interview — that is exactly the signal being measured, and no tool is allowed in the room.</p>`,
    problems: [{
      title: 'Find All Numbers Missing from 1..n',
      level: 'Easy', tags: ['set', 'complexity', 'arrays'], companies: ['Google', 'Amazon', 'Apple'],
      statement: `<p>Given a list <code>nums</code> of length n where every value is in the range [1, n] (some values appear twice, some not at all), return all numbers in [1, n] that do <b>not</b> appear, in increasing order.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>5</sup>, 1 ≤ nums[i] ≤ n`,
      example: `<p>nums = ${H.arr([4, 3, 2, 7, 8, 2, 3, 1])} (n = 8) → ${H.c('g', '[5, 6]')}. Values 5 and 6 never occur.</p>`,
      brute: { why: `<p>For each k in 1..n, check <code>k not in nums</code> — a linear scan of the list each time → n × n = 10<sup>10</sup> comparisons for n = 10<sup>5</sup>. The code looks like one loop, but the <code>in</code> hides the second.</p>`, code: `
def missing_brute(nums):
    n = len(nums)
    return [k for k in range(1, n + 1) if k not in nums]   # 'in list' is O(n) -> O(n^2)

print(missing_brute([4, 3, 2, 7, 8, 2, 3, 1]))` },
      mcq: { q: 'Which single change makes the brute force O(n)?', options: ['Sort nums first', 'Convert nums to a set once before the comprehension', 'Use a generator instead of a list', 'Iterate in reverse'], answer: 1, explain: '<code>present = set(nums)</code> costs O(n) once; each <code>k not in present</code> is then O(1) on average. Sorting would give O(n log n) and still need a merge-like scan.' },
      hints: [`<p>Hint 1: The slow part is the membership test, not the loop. Which structure answers "is k present?" in O(1)?</p>`, `<p>Hint 2: Build <code>present = set(nums)</code> once, outside the loop, then keep the comprehension.</p>`, `<p>Hint 3: For O(1) extra space: for each value v, mark index |v| − 1 by making that entry negative; indices still positive at the end are missing numbers. Restore signs afterwards if the caller needs nums unchanged.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_run',
        cases: [
          [
            [
              'a = [4, 3, 2, 7, 8, 2, 3, 1]\n' +
                'result = [find_missing(a), find_missing_inplace(list(a)), a]'
            ],
            [[5, 6], [5, 6], [4, 3, 2, 7, 8, 2, 3, 1]]
          ],
          [
            [
              'a = [1, 1]\n' +
                'result = [find_missing(a), find_missing_inplace(list(a)), a]'
            ],
            [[2], [2], [1, 1]]
          ],
          [
            [
              'a = [1]\n' +
                'result = [find_missing(a), find_missing_inplace(list(a)), a]'
            ],
            [[], [], [1]]
          ],
          [
            [
              'a = [2, 2]\n' +
                'result = [find_missing(a), find_missing_inplace(list(a)), a]'
            ],
            [[1], [1], [2, 2]]
          ],
          [
            [
              'a = [3, 3, 3]\n' +
                'result = [find_missing(a), find_missing_inplace(list(a)), a]'
            ],
            [[1, 2], [1, 2], [3, 3, 3]]
          ],
          [
            [
              'a = [1, 2, 3]\n' +
                'result = [find_missing(a), find_missing_inplace(list(a)), a]'
            ],
            [[], [], [1, 2, 3]]
          ],
          [
            [
              'a = [3, 2, 1]\n' +
                'result = [find_missing(a), find_missing_inplace(list(a)), a]'
            ],
            [[], [], [3, 2, 1]]
          ],
          [
            [
              'a = [2, 3, 4, 5, 5]\n' +
                'result = [find_missing(a), find_missing_inplace(list(a)), a]'
            ],
            [[1], [1], [2, 3, 4, 5, 5]]
          ],
          [
            [
              'a = [1, 1, 1, 1, 1, 1]\n' +
                'result = [find_missing(a), find_missing_inplace(list(a)), a]'
            ],
            [[2, 3, 4, 5, 6], [2, 3, 4, 5, 6], [1, 1, 1, 1, 1, 1]]
          ],
          [
            [
              'a = [4, 3, 2, 7, 8, 2, 3, 1]\n' +
                'r = find_missing_inplace(a)\n' +
                'result = [r, a]'
            ],
            [[5, 6], [4, 3, 2, 7, 8, 2, 3, 1]]
          ],
          [
            [
              'a = [1] * 100000\n' +
                'result = [find_missing(a) == list(range(2, 100001)), find_missing_inplace(a) == list(range(2, 100001)), a == [1] * 100000]'
            ],
            [true, true, true]
          ],
          [
            [
              'a = [100000] * 100000\n' +
                'result = [find_missing(a) == list(range(1, 100000)), find_missing_inplace(list(a)) == list(range(1, 100000))]'
            ],
            [true, true]
          ]
        ],
        harness: {
          python: 'def t_run(src):\n' +
            '    ns = dict(globals())\n' +
            '    try:\n' +
            '        exec(src, ns)\n' +
            '        return ns[\'result\']\n' +
            '    except Exception as e:\n' +
            '        return \'!\' + type(e).__name__'
        }
      },
      solution: {
        approach: `<p>Price each line: building a set is O(n), each lookup O(1) average, the comprehension runs n times → O(n) total. The follow-up variant uses the input itself as a presence bitmap via negation (O(1) extra space).</p>`,
        code: `
def find_missing(nums):
    present = set(nums)                                    # O(n) once
    return [k for k in range(1, len(nums) + 1) if k not in present]   # n * O(1)

def find_missing_inplace(nums):
    for v in nums:
        i = abs(v) - 1
        nums[i] = -abs(nums[i])          # mark value i+1 as seen
    res = [i + 1 for i, v in enumerate(nums) if v > 0]
    for i in range(len(nums)):
        nums[i] = abs(nums[i])           # restore the input
    return res

print(find_missing([4, 3, 2, 7, 8, 2, 3, 1]))
print(find_missing_inplace([4, 3, 2, 7, 8, 2, 3, 1]))`,
        dry: { head: ['k', 'k in present? (present = {1,2,3,4,7,8})', 'result'], rows: [['1–4', 'yes', '[]'], ['5', '<span class="c-r">no</span>', '[5]'], ['6', '<span class="c-r">no</span>', '[5, 6]'], ['7–8', 'yes', '<span class="c-g">[5, 6]</span>']] },
        complexity: `<p>Set version: time O(n), extra space O(n). In-place version: time O(n), extra space O(1) (besides the output).</p>`,
        followUps: ['Also return the duplicated numbers', 'What if values can be outside [1, n]?']
      }
    }]
  });

  /* ================= PRACTICE: Easy ================= */
  practice.push({
    title: 'Remove Duplicates, Keep First-Seen Order',
    level: 'Easy', tags: ['dict', 'set', 'ordering'], companies: ['Amazon', 'Zoho', 'Infosys'],
    statement: `<p>Given a list <code>items</code> of hashable values, return a new list with duplicates removed, keeping the <b>first occurrence</b> of each value in its original order.</p>`,
    constraints: `0 ≤ len(items) ≤ 10<sup>6</sup>`,
    example: `<p>["b", "a", "b", "c", "a"] → ${H.c('g', '["b", "a", "c"]')}. <code>list(set(items))</code> would also remove duplicates but in ${H.c('r', 'arbitrary order')}.</p>`,
    brute: { why: `<p>Append each item if it is not already in the <b>result list</b>: the <code>in</code> check scans the result, so the total is O(n · u) — up to 10<sup>12</sup> for a million unique items.</p>`, code: `
def dedupe_brute(items):
    out = []
    for x in items:
        if x not in out:        # O(len(out)) scan each time
            out.append(x)
    return out

print(dedupe_brute(["b", "a", "b", "c", "a"]))` },
    mcq: { q: 'Which one-liner keeps first-seen order in O(n)?', options: ['<code>list(set(items))</code>', '<code>sorted(set(items))</code>', '<code>list(dict.fromkeys(items))</code>', '<code>[x for x in items if items.count(x) == 1]</code>'], answer: 2, explain: 'dict keys are unique and keep insertion order (3.7+). fromkeys inserts each item once in order; later duplicates are ignored. Option A loses order, Option B sorts, Option D keeps only the never-duplicated items and is O(n²).' },
    hints: [`<p>Hint 1: You need two things: a fast "seen before?" test and a record of order. A set gives the first; a list or a dict gives the second.</p>`, `<p>Hint 2: A dict does both at once: unique keys + insertion order. <code>dict.fromkeys(items)</code> builds it in one pass.</p>`, `<p>Hint 3: If items are unhashable (lists), convert each to a tuple for the "seen" key but output the original. Recipe: seen = set(); out = []; for x in items: if x not in seen: seen.add(x); out.append(x).</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_val',
      cases: [
        [['dedupe([\'b\', \'a\', \'b\', \'c\', \'a\'])'], ['b', 'a', 'c']],
        [['dedupe([])'], []],
        [['dedupe([1, 1, 1])'], [1]],
        [['dedupe([3, 1, 3, 2, 1])'], [3, 1, 2]],
        [['dedupe([1, \'1\', 1])'], [1, '1']],
        [['dedupe([None, 0, None, False])'], [null, 0]],
        [['dedupe([(1, 2), (1, 2), (2, 1)])'], [[1, 2], [2, 1]]],
        [['dedupe_by([\'Hi\', \'hi\', \'Yo\'], str.lower)'], ['Hi', 'Yo']],
        [['dedupe_by([[1, 2], [1, 2], [3]], tuple)'], [[1, 2], [3]]],
        [['dedupe_by([], len)'], []],
        [['dedupe_by([\'aa\', \'b\', \'cc\', \'d\'], len)'], ['aa', 'b']],
        [['len(dedupe(list(range(1000)) * 1000))'], 1000],
        [['dedupe(list(range(1000)) * 1000) == list(range(1000))'], true],
        [['len(dedupe(list(range(10**6))))'], 1000000],
        [['dedupe([\'x\'] * 10**6)'], ['x']],
        [['len(dedupe_by(list(range(10**5)), lambda v: v % 7))'], 7]
      ],
      harness: {
        python: 'def t_val(src):\n' +
          '    try:\n' +
          '        return eval(src)\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Use a hash-based "seen" structure so each membership test is O(1) on average; output in scan order. The dict trick is the most idiomatic; the explicit set + list loop is the most flexible (e.g., when deduping by a key function).</p>`,
      code: `
def dedupe(items):
    return list(dict.fromkeys(items))      # unique keys, insertion order, O(n)

def dedupe_by(items, key):
    seen, out = set(), []
    for x in items:
        k = key(x)                         # e.g. case-insensitive or tuple(list)
        if k not in seen:
            seen.add(k)
            out.append(x)
    return out

print(dedupe(["b", "a", "b", "c", "a"]))
print(dedupe_by(["Hi", "hi", "Yo"], str.lower))
print(dedupe_by([[1, 2], [1, 2], [3]], tuple))`,
      dry: { head: ['x', 'seen', 'out'], rows: [['b', '{b}', '[b]'], ['a', '{b,a}', '[b,a]'], ['b', 'skip', '[b,a]'], ['c', '{b,a,c}', '[b,a,c]'], ['a', 'skip', '<span class="c-g">[b,a,c]</span>']] },
      complexity: `<p>Time O(n) average, space O(u) for u unique items.</p>`,
      followUps: ['Keep the LAST occurrence instead', 'Do it in place on the list with O(1) extra space if the list is sorted']
    }
  });

  practice.push({
    title: 'Two Sum (One-Pass Dict)',
    level: 'Easy', tags: ['dict', 'hashing'], companies: ['Google', 'Amazon', 'Meta', 'Apple'],
    statement: `<p>Given a list <code>nums</code> and an integer <code>target</code>, return indices <code>[i, j]</code> (i &lt; j) of the two numbers that add up to target. Exactly one answer exists; you may not use the same element twice.</p>`,
    constraints: `2 ≤ n ≤ 10<sup>5</sup>, −10<sup>9</sup> ≤ nums[i], target ≤ 10<sup>9</sup>`,
    example: `<p>nums = ${H.arr([2, 7, 11, 15], { hl: { 0: 'g', 1: 'g' } })} target = 9 → ${H.c('g', '[0, 1]')} because 2 + 7 = 9.</p>`,
    brute: { why: `<p>Try every pair: n(n−1)/2 ≈ 5·10<sup>9</sup> additions for n = 10<sup>5</sup>. The wasted work: for each x we re-scan everything to find target − x instead of remembering what we have seen.</p>`, code: `
def two_sum_brute(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):    # O(n^2) pairs
            if nums[i] + nums[j] == target:
                return [i, j]
    return []

print(two_sum_brute([2, 7, 11, 15], 9))` },
    mcq: { q: 'Why check for the complement BEFORE storing the current number?', options: ['It is faster', 'So an element is never paired with itself (e.g. target 6, nums [3, …])', 'Dicts require it', 'To keep insertion order'], answer: 1, explain: 'If we stored 3 first, looking up 6 − 3 = 3 would find the same index. Checking first means the dict only holds earlier indices.' },
    hints: [`<p>Hint 1: For each x, the partner you need is exactly <code>target − x</code>. The question becomes "have I already seen that value, and where?"</p>`, `<p>Hint 2: A dict value → index answers that in O(1) average time.</p>`, `<p>Hint 3: Look up first, then insert. Duplicates like [3, 3] with target 6 work because the first 3 is stored before the second is checked. Recipe: seen = {}; for j, x in enumerate(nums): if target - x in seen: return [seen[target - x], j]; seen[x] = j.</p>`],
    tests: {
      sig: 'int[] int -> int[]',
      fn: 'twoSum',
      cases: [
        [[[2, 7, 11, 15], 9], [0, 1]],
        [[[3, 2, 4], 6], [1, 2]],
        [[[3, 3], 6], [0, 1]],
        [[[-3, 4, 3, 90], 0], [0, 2]],
        [[[0, 4, 3, 0], 0], [0, 3]],
        [[[1, 2], 3], [0, 1]],
        [[[-1000000000, 1000000000, 5], 0], [0, 1]],
        [[[5, 75, 25], 100], [1, 2]],
        [[[-1, -2, -3, -4, -5], -8], [2, 4]],
        [[{ $range: [0, 100000, 1] }, 199997], [99998, 99999]]
      ]
    },
    solution: {
      approach: `<p>One pass with a dict from value to index. Each step does one O(1) lookup and one O(1) insert.</p>`,
      code: `
def two_sum(nums, target):
    seen = {}                          # value -> index of an earlier element
    for j, x in enumerate(nums):
        need = target - x
        if need in seen:               # O(1) average
            return [seen[need], j]
        seen[x] = j                    # store AFTER checking
    return []

print(two_sum([2, 7, 11, 15], 9), two_sum([3, 3], 6), two_sum([3, 2, 4], 6))`,
      dry: { head: ['j', 'x', 'need', 'seen before step', 'action'], rows: [['0', '2', '7', '{}', 'store 2→0'], ['1', '7', '2', '{2:0}', '<span class="c-g">found → [0, 1]</span>']] },
      complexity: `<p>Time O(n) average, space O(n).</p>`,
      followUps: ['Return all unique pairs of values', 'Input is sorted — do it in O(1) space with two pointers']
    }
  });

  practice.push({
    title: 'Transpose a Matrix (Comprehension & zip)',
    level: 'Easy', tags: ['comprehension', 'zip', 'matrix'], companies: ['Adobe', 'Cisco'],
    statement: `<p>Given an R × C matrix as a list of lists, return its transpose (C × R): row i of the result is column i of the input.</p>`,
    constraints: `1 ≤ R, C ≤ 1000`,
    example: `<p>[[1, 2, 3], [4, 5, 6]] → ${H.c('g', '[[1, 4], [2, 5], [3, 6]]')}.</p>`,
    brute: { why: `<p>Pre-building the result with <code>[[0] * R] * C</code> and filling it looks natural but is <b>wrong</b>: all C rows are the same list, so every write lands in every row. Even the correct manual double loop is just verbose; the real lesson is building rows independently.</p>`, code: `
def transpose_buggy(m):
    R, C = len(m), len(m[0])
    out = [[0] * R] * C               # BUG: C references to ONE row
    for r in range(R):
        for c in range(C):
            out[c][r] = m[r][c]
    return out

print(transpose_buggy([[1, 2, 3], [4, 5, 6]]))   # every row shows the last column` },
    mcq: { q: 'What does <code>list(zip(*m))</code> return for m = [[1, 2], [3, 4]]?', options: ['[[1, 3], [2, 4]]', '[(1, 3), (2, 4)]', '[(1, 2), (3, 4)]', '[1, 2, 3, 4]'], answer: 1, explain: '<code>*m</code> passes each row as a separate argument; zip groups the i-th items together as <b>tuples</b>. Wrap with <code>[list(t) for t in zip(*m)]</code> if lists are required.' },
    hints: [`<p>Hint 1: Result row c is "the c-th item of every input row" — that is a comprehension over rows.</p>`, `<p>Hint 2: Nested comprehension: <code>[[row[c] for row in m] for c in range(C)]</code>. The outer comprehension creates a fresh inner list each time — no aliasing.</p>`, `<p>Hint 3: <code>zip(*m)</code> does the same in C code and returns tuples. Ragged rows? zip truncates to the shortest row; itertools.zip_longest pads.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'm = [[1, 2, 3], [4, 5, 6]]\n' +
              'result = [transpose(m), transpose_zip(m), m]'
          ],
          [[[1, 4], [2, 5], [3, 6]], [[1, 4], [2, 5], [3, 6]], [[1, 2, 3], [4, 5, 6]]]
        ],
        [['m = [[1]]\nresult = [transpose(m), transpose_zip(m), m]'], [[[1]], [[1]], [[1]]]],
        [
          ['m = [[1, 2, 3]]\nresult = [transpose(m), transpose_zip(m), m]'],
          [[[1], [2], [3]], [[1], [2], [3]], [[1, 2, 3]]]
        ],
        [
          [
            'm = [[1], [2], [3]]\n' +
              'result = [transpose(m), transpose_zip(m), m]'
          ],
          [[[1, 2, 3]], [[1, 2, 3]], [[1], [2], [3]]]
        ],
        [
          [
            'm = [[1, 2], [3, 4], [5, 6]]\n' +
              'result = [transpose(m), transpose_zip(m), m]'
          ],
          [[[1, 3, 5], [2, 4, 6]], [[1, 3, 5], [2, 4, 6]], [[1, 2], [3, 4], [5, 6]]]
        ],
        [
          [
            'm = [[0, -1], [-2, 0]]\n' +
              'result = [transpose(m), transpose_zip(m), m]'
          ],
          [[[0, -2], [-1, 0]], [[0, -2], [-1, 0]], [[0, -1], [-2, 0]]]
        ],
        [
          [
            'm = [[1, 2], [3, 4]]\n' +
              't = transpose(m)\n' +
              't[0][0] = 99\n' +
              'z = transpose_zip(m)\n' +
              'z[0][0] = 77\n' +
              'result = m'
          ],
          [[1, 2], [3, 4]]
        ],
        [
          [
            'm = [[i * 1000 + j for j in range(1000)] for i in range(1000)]\n' +
              't = transpose(m)\n' +
              'z = transpose_zip(m)\n' +
              'result = [t[0][1], t[999][0], t[5][7], t == z, len(t), len(t[0]), type(z[0]).__name__]'
          ],
          [1000, 999, 7005, true, 1000, 1000, 'list']
        ],
        [
          [
            'm = [[i * 7 + j for j in range(3)] for i in range(1000)]\n' +
              'result = [len(transpose(m)), len(transpose(m)[0]), transpose(m)[2][999], transpose_zip(m) == transpose(m)]'
          ],
          [3, 1000, 6995, true]
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Build each output row with its own comprehension (fresh list per row), or use the <code>zip(*m)</code> idiom.</p>`,
      code: `
def transpose(m):
    C = len(m[0])
    return [[row[c] for row in m] for c in range(C)]   # new inner list per c

def transpose_zip(m):
    return [list(col) for col in zip(*m)]              # columns as tuples -> lists

print(transpose([[1, 2, 3], [4, 5, 6]]))
print(transpose_zip([[1, 2, 3], [4, 5, 6]]))`,
      dry: { head: ['c', 'row[c] for each row', 'result so far'], rows: [['0', '1, 4', '[[1,4]]'], ['1', '2, 5', '[[1,4],[2,5]]'], ['2', '3, 6', '<span class="c-g">[[1,4],[2,5],[3,6]]</span>']] },
      complexity: `<p>Time O(R·C), space O(R·C) for the output.</p>`,
      followUps: ['Rotate a square matrix 90° clockwise using transpose + reverse each row', 'Why does the buggy version print identical rows?']
    }
  });

  practice.push({
    title: 'Create a Safe m × n Grid and Mark the Diagonal',
    level: 'Easy', tags: ['copying', 'aliasing', 'comprehension'], companies: ['Microsoft', 'Uber'],
    statement: `<p>Write <code>make_grid(m, n)</code> that returns an m × n grid of zeros where cell (i, i) is 1 for every i &lt; min(m, n). Changing one cell later must never affect other rows.</p>`,
    constraints: `1 ≤ m, n ≤ 10<sup>3</sup>`,
    example: `<p>make_grid(3, 4) → ${H.c('g', '[[1,0,0,0],[0,1,0,0],[0,0,1,0]]')}. With the trap version you would get ${H.c('r', '[[1,1,1,0],[1,1,1,0],[1,1,1,0]]')}.</p>`,
    brute: { why: `<p>The "obvious" <code>[[0] * n] * m</code> creates <b>one</b> row object referenced m times. Setting (0,0), (1,1), (2,2) writes into the same list three times, so every row shows all three 1s.</p>`, code: `
def make_grid_trap(m, n):
    grid = [[0] * n] * m          # m references to the SAME row
    for i in range(min(m, n)):
        grid[i][i] = 1
    return grid

g = make_grid_trap(3, 4)
print(g, g[0] is g[1])` },
    mcq: { q: 'Why is <code>[0] * n</code> safe while <code>[[0] * n] * m</code> is not?', options: ['Ints are immutable — sharing the same 0 object is harmless; rows are mutable lists', 'Python copies ints but not lists', 'Multiplication is buggy for nested lists', 'It is safe; the bug is elsewhere'], answer: 0, explain: 'Both multiply references. Sharing an immutable 0 is fine because you can only replace it (rebinding a slot), never modify it in place. Sharing a mutable row means modifications are visible through every reference.' },
    hints: [`<p>Hint 1: The problem is not the zeros — it is that every row must be a <b>different</b> list object.</p>`, `<p>Hint 2: A comprehension evaluates its expression once per iteration: <code>[[0] * n for _ in range(m)]</code> creates m distinct rows.</p>`, `<p>Hint 3: Verify with <code>grid[0] is grid[1]</code> → must be False. Recipe: grid = [[0] * n for _ in range(m)]; for i in range(min(m, n)): grid[i][i] = 1.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          ['result = [make_grid(3, 4), make_grid_direct(3, 4)]'],
          [[[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]], [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]]]
        ],
        [
          ['result = [make_grid(4, 3), make_grid_direct(4, 3)]'],
          [[[1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, 0]], [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, 0]]]
        ],
        [['result = [make_grid(1, 1), make_grid_direct(1, 1)]'], [[[1]], [[1]]]],
        [['result = [make_grid(1, 5), make_grid_direct(1, 5)]'], [[[1, 0, 0, 0, 0]], [[1, 0, 0, 0, 0]]]],
        [
          ['result = [make_grid(5, 1), make_grid_direct(5, 1)]'],
          [[[1], [0], [0], [0], [0]], [[1], [0], [0], [0], [0]]]
        ],
        [['result = [make_grid(2, 2), make_grid_direct(2, 2)]'], [[[1, 0], [0, 1]], [[1, 0], [0, 1]]]],
        [
          [
            'g = make_grid(3, 3)\n' +
              'g[0][2] = 7\n' +
              'h = make_grid_direct(3, 3)\n' +
              'h[0][2] = 7\n' +
              'result = [g[1][2], g[2][2], h[1][2], h[2][2], g[0][2]]'
          ],
          [0, 1, 0, 1, 7]
        ],
        [['g = make_grid(3, 4)\nresult = [g[0] is g[1], g[1] is g[2]]'], [false, false]],
        [
          [
            'g = make_grid(1000, 1000)\n' +
              'result = [len(g), len(g[0]), sum(map(sum, g)), g[999][999], g[0][999], g == make_grid_direct(1000, 1000)]'
          ],
          [1000, 1000, 1000, 1, 0, true]
        ],
        [
          [
            'g = make_grid(1000, 3)\n' +
              'result = [sum(map(sum, g)), g[2][2], g[3][2]]'
          ],
          [3, 1, 0]
        ],
        [
          [
            'g = make_grid(2, 1000)\n' +
              'result = [sum(map(sum, g)), g[1][1], g[1][2]]'
          ],
          [2, 1, 0]
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Build rows with a comprehension so each row is a separate list, then set the diagonal. A one-shot comprehension can even compute the values directly.</p>`,
      code: `
def make_grid(m, n):
    grid = [[0] * n for _ in range(m)]     # m DIFFERENT row objects
    for i in range(min(m, n)):
        grid[i][i] = 1
    return grid

def make_grid_direct(m, n):
    return [[1 if r == c else 0 for c in range(n)] for r in range(m)]

g = make_grid(3, 4)
print(g, g[0] is g[1])
print(make_grid_direct(3, 4) == g)`,
      dry: { head: ['step', 'grid', 'g[0] is g[1]'], rows: [['build', '[[0,0,0,0],[0,0,0,0],[0,0,0,0]]', 'False'], ['i = 0', '[[1,0,0,0],[0,0,0,0],[0,0,0,0]]', 'False'], ['i = 2', '<span class="c-g">[[1,0,0,0],[0,1,0,0],[0,0,1,0]]</span>', 'False']] },
      complexity: `<p>Time O(m·n), space O(m·n).</p>`,
      followUps: ['Build a 3-D grid safely', 'Where else does list multiplication bite? (e.g. <code>[set()] * k</code>, <code>[[]] * k</code>)']
    }
  });

  /* ================= PRACTICE: Medium ================= */
  practice.push({
    title: 'Group Anagrams',
    level: 'Medium', tags: ['dict', 'tuple keys', 'hashing'], companies: ['Amazon', 'Meta', 'Uber', 'Goldman Sachs'],
    statement: `<p>Given a list of lowercase words, group the anagrams together. Return the groups in order of each group's first appearance, words within a group in input order.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>4</sup>, 0 ≤ len(word) ≤ 100`,
    example: `<p>["eat","tea","tan","ate","nat","bat"] → ${H.c('g', '[["eat","tea","ate"], ["tan","nat"], ["bat"]]')}.</p>`,
    brute: { why: `<p>Compare every word with every existing group's representative using <code>sorted(a) == sorted(b)</code>: O(n · g · k log k). With many small groups that approaches O(n² k log k).</p>`, code: `
def group_brute(words):
    groups = []
    for w in words:
        for g in groups:
            if sorted(g[0]) == sorted(w):    # re-sorts representatives over and over
                g.append(w)
                break
        else:
            groups.append([w])
    return groups

print(group_brute(["eat", "tea", "tan", "ate", "nat", "bat"]))` },
    mcq: { q: 'Which of these can be a dict key that identifies an anagram class?', options: ['<code>sorted(w)</code> (a list)', '<code>"".join(sorted(w))</code> or <code>tuple(sorted(w))</code>', '<code>set(w)</code>', '<code>Counter(w)</code>'], answer: 1, explain: 'Lists, sets and Counters are unhashable. A sorted string or tuple is hashable and equal for anagrams. (set(w) would also be wrong for "aab" vs "abb".) A 26-count tuple is another valid key.' },
    hints: [`<p>Hint 1: Anagrams share a canonical form: their sorted letters. Equal canonical form ⇔ same group.</p>`, `<p>Hint 2: Map canonical form → list of words in a dict; insertion order gives group order for free.</p>`, `<p>Hint 3: For long words, a 26-length count tuple avoids the k log k sort: key = tuple(counts). Recipe: groups = {}; for w in words: groups.setdefault(key(w), []).append(w); return list(groups.values()).</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_val',
      cases: [
        [
          [
            '[group_anagrams([\'eat\', \'tea\', \'tan\', \'ate\', \'nat\', \'bat\']), group_anagrams_counts([\'eat\', \'tea\', \'tan\', \'ate\', \'nat\', \'bat\'])]'
          ],
          [[['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']], [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]]
        ],
        [['[group_anagrams([\'\', \'\']), group_anagrams_counts([\'\', \'\'])]'], [[['', '']], [['', '']]]],
        [['[group_anagrams([\'a\']), group_anagrams_counts([\'a\'])]'], [[['a']], [['a']]]],
        [
          ['[group_anagrams([\'ab\', \'ba\', \'ab\']), group_anagrams_counts([\'ab\', \'ba\', \'ab\'])]'],
          [[['ab', 'ba', 'ab']], [['ab', 'ba', 'ab']]]
        ],
        [
          ['[group_anagrams([\'abc\', \'def\']), group_anagrams_counts([\'abc\', \'def\'])]'],
          [[['abc'], ['def']], [['abc'], ['def']]]
        ],
        [
          [
            '[group_anagrams([\'listen\', \'silent\', \'enlist\', \'google\', \'gogole\']), group_anagrams_counts([\'listen\', \'silent\', \'enlist\', \'google\', \'gogole\'])]'
          ],
          [
            [['listen', 'silent', 'enlist'], ['google', 'gogole']],
            [['listen', 'silent', 'enlist'], ['google', 'gogole']]
          ]
        ],
        [
          ['[group_anagrams([\'b\', \'a\', \'b\']), group_anagrams_counts([\'b\', \'a\', \'b\'])]'],
          [[['b', 'b'], ['a']], [['b', 'b'], ['a']]]
        ],
        [
          [
            '[group_anagrams([\'ab\', \'a\', \'ba\', \'\']), group_anagrams_counts([\'ab\', \'a\', \'ba\', \'\'])]'
          ],
          [[['ab', 'ba'], ['a'], ['']], [['ab', 'ba'], ['a'], ['']]]
        ],
        [
          [
            '(lambda w: [group_anagrams(w) == group_anagrams_counts(w), len(group_anagrams(w)), len(group_anagrams(w)[0])])([\'ab\', \'ba\'] * 5000)'
          ],
          [true, 1, 10000]
        ],
        [
          [
            '(lambda w: [len(group_anagrams(w)), group_anagrams(w) == group_anagrams_counts(w)])([\'a\' * i for i in range(100)] * 100)'
          ],
          [100, true]
        ]
      ],
      harness: {
        python: 'def t_val(src):\n' +
          '    try:\n' +
          '        return eval(src)\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Hash each word to a canonical, <b>hashable</b> key and bucket words in a dict. Iterating the dict's values returns groups in first-appearance order.</p>`,
      code: `
def group_anagrams(words):
    groups = {}                                  # canonical key -> list of words
    for w in words:
        key = "".join(sorted(w))                 # hashable canonical form
        groups.setdefault(key, []).append(w)
    return list(groups.values())

def group_anagrams_counts(words):
    groups = {}
    for w in words:
        counts = [0] * 26
        for ch in w:
            counts[ord(ch) - 97] += 1
        groups.setdefault(tuple(counts), []).append(w)   # tuple: hashable
    return list(groups.values())

print(group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))
print(group_anagrams_counts(["eat", "tea", "tan", "ate", "nat", "bat"]))`,
      dry: { head: ['word', 'key', 'groups'], rows: [['eat', 'aet', '{aet:[eat]}'], ['tea', 'aet', '{aet:[eat,tea]}'], ['tan', 'ant', '{aet:[…], ant:[tan]}'], ['bat', 'abt', '<span class="c-g">3 groups</span>']] },
      complexity: `<p>Sorted key: O(n · k log k). Count key: O(n · (k + 26)). Space O(n · k).</p>`,
      followUps: ['Unicode words — which key still works?', 'Return only groups with size ≥ 2, largest first']
    }
  });

  practice.push({
    title: 'Top K Frequent Elements',
    level: 'Medium', tags: ['Counter', 'heapq', 'bucket sort'], companies: ['Amazon', 'Meta', 'Yelp', 'Oracle'],
    statement: `<p>Given a list <code>nums</code> and an integer <code>k</code>, return the k most frequent values (any order). The answer is unique.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>5</sup>, 1 ≤ k ≤ number of distinct values`,
    example: `<p>nums = [1,1,1,2,2,3], k = 2 → ${H.c('g', '[1, 2]')} (1 appears 3×, 2 appears 2×).</p>`,
    brute: { why: `<p>For each distinct value call <code>nums.count(v)</code> (O(n) each) → O(n · u), up to 10<sup>10</sup>; then sort. The wasted work is recounting the whole list for every value.</p>`, code: `
def top_k_brute(nums, k):
    distinct = list(dict.fromkeys(nums))
    freq = [(nums.count(v), v) for v in distinct]     # O(n) per distinct value
    freq.sort(reverse=True)
    return [v for _, v in freq[:k]]

print(top_k_brute([1, 1, 1, 2, 2, 3], 2))` },
    mcq: { q: 'Cost of <code>Counter(nums).most_common(k)</code> for n items, u distinct?', options: ['O(n²)', 'O(n + u log k) — count in one pass, then a size-k heap', 'O(1)', 'O(n · k)'], answer: 1, explain: 'Counting is one O(n) pass with dict updates. most_common(k) uses heapq.nlargest → O(u log k). Without k it sorts everything: O(u log u).' },
    hints: [`<p>Hint 1: First count frequencies in one pass with a dict / Counter — never with list.count in a loop.</p>`, `<p>Hint 2: Selecting the k largest of u counts: a heap of size k (<code>heapq.nlargest</code>) is O(u log k).</p>`, `<p>Hint 3: For O(n): bucket sort — bucket[f] = list of values with frequency f (f ≤ n); walk buckets from high to low until k collected.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_val',
      cases: [
        [
          ['[sorted(top_k([1, 1, 1, 2, 2, 3], 2)), sorted(top_k_bucket([1, 1, 1, 2, 2, 3], 2))]'],
          [[1, 2], [1, 2]]
        ],
        [['[sorted(top_k([1], 1)), sorted(top_k_bucket([1], 1))]'], [[1], [1]]],
        [['[sorted(top_k([1, 2, 3, 3], 1)), sorted(top_k_bucket([1, 2, 3, 3], 1))]'], [[3], [3]]],
        [['[sorted(top_k([-1, -1, -2], 1)), sorted(top_k_bucket([-1, -1, -2], 1))]'], [[-1], [-1]]],
        [
          ['[sorted(top_k([5, 5, 5, 6, 6, 7], 3)), sorted(top_k_bucket([5, 5, 5, 6, 6, 7], 3))]'],
          [[5, 6, 7], [5, 6, 7]]
        ],
        [['[sorted(top_k([0, 0, 0, 1], 1)), sorted(top_k_bucket([0, 0, 0, 1], 1))]'], [[0], [0]]],
        [
          [
            '[sorted(top_k([4, 4, 4, 4, 2, 2, 2, 9, 9, 1], 2)), sorted(top_k_bucket([4, 4, 4, 4, 2, 2, 2, 9, 9, 1], 2))]'
          ],
          [[2, 4], [2, 4]]
        ],
        [
          [
            '(lambda n: [sorted(top_k(n, 2)), sorted(top_k_bucket(n, 2))])([1] * 50000 + [2] * 30000 + [3] * 20000)'
          ],
          [[1, 2], [1, 2]]
        ],
        [
          [
            '(lambda n: [sorted(top_k(n, 3)), sorted(top_k_bucket(n, 3))])([1] * 50000 + [2] * 30000 + [3] * 20000)'
          ],
          [[1, 2, 3], [1, 2, 3]]
        ],
        [
          ['(lambda n: [sorted(top_k(n, 1)), sorted(top_k_bucket(n, 1))])(list(range(99999)) + [7])'],
          [[7], [7]]
        ]
      ],
      harness: {
        python: 'def t_val(src):\n' +
          '    try:\n' +
          '        return eval(src)\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Count with <code>Counter</code> (dict-based, O(n)), then either use <code>most_common(k)</code> (heap, O(u log k)) or bucket by frequency for a strict O(n).</p>`,
      code: `
from collections import Counter

def top_k(nums, k):
    return [v for v, _ in Counter(nums).most_common(k)]   # O(n + u log k)

def top_k_bucket(nums, k):
    counts = Counter(nums)
    buckets = [[] for _ in range(len(nums) + 1)]          # fresh list per bucket!
    for v, f in counts.items():
        buckets[f].append(v)
    out = []
    for f in range(len(buckets) - 1, 0, -1):              # highest frequency first
        for v in buckets[f]:
            out.append(v)
            if len(out) == k:
                return out
    return out

print(top_k([1, 1, 1, 2, 2, 3], 2), top_k_bucket([1, 1, 1, 2, 2, 3], 2))`,
      dry: { head: ['step', 'state'], rows: [['count', '{1:3, 2:2, 3:1}'], ['buckets', '[[], [3], [2], [1], [], [], []]'], ['scan f = 3, 2', '<span class="c-g">[1, 2]</span>']] },
      complexity: `<p>Heap version O(n + u log k); bucket version O(n). Space O(n).</p>`,
      followUps: ['Stream of numbers: maintain top k continuously', 'Ties: return smaller value first']
    }
  });

  practice.push({
    title: 'Longest Consecutive Sequence (Set in O(n))',
    level: 'Medium', tags: ['set', 'hashing'], companies: ['Google', 'Amazon', 'Spotify'],
    statement: `<p>Given an unsorted list of integers, return the length of the longest run of consecutive values (e.g., 4, 5, 6, 7) that all appear in the list. Must run in O(n).</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>, −10<sup>9</sup> ≤ nums[i] ≤ 10<sup>9</sup>`,
    example: `<p>[100, 4, 200, 1, 3, 2] → ${H.c('g', '4')} (the run 1, 2, 3, 4).</p>`,
    brute: { why: `<p>Sorting works in O(n log n) but breaks the O(n) requirement. The truly naive version starts a run from <b>every</b> value and checks <code>x + 1 in nums</code> on the list → O(n) per check, O(n³) worst.</p>`, code: `
def longest_brute(nums):
    best = 0
    for x in nums:
        length = 1
        while x + length in nums:        # list membership: O(n)
            length += 1
        best = max(best, length)
    return best

print(longest_brute([100, 4, 200, 1, 3, 2]))` },
    mcq: { q: 'Why only start counting at x when x − 1 is NOT in the set?', options: ['To save memory', 'So each run is walked once from its start → total O(n)', 'Because negative numbers break it', 'It is required for correctness only, not speed'], answer: 1, explain: 'Without the check, a run of length L would be re-walked from each of its L members → O(n²). Starting only at run beginnings means every number is visited by at most one walk.' },
    hints: [`<p>Hint 1: Put all numbers in a set so "is y present?" is O(1).</p>`, `<p>Hint 2: A number x starts a run only if x − 1 is absent. From each start, walk x + 1, x + 2, … while present.</p>`, `<p>Hint 3: Iterate over the set (not the list) to skip duplicates. Empty input → 0. Recipe: s = set(nums); for x in s: if x - 1 not in s: y = x; while y + 1 in s: y += 1; best = max(best, y - x + 1).</p>`],
    tests: {
      sig: 'int[] -> int',
      fn: 'longestConsecutive',
      cases: [
        [[[100, 4, 200, 1, 3, 2]], 4],
        [[[]], 0],
        [[[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]], 9],
        [[[1]], 1],
        [[[1, 1, 1]], 1],
        [[[-3, -2, -1, 0, 1]], 5],
        [[[10, 5, 12, 3, 55, 30, 4, 11, 2]], 4],
        [[[-1000000000, 1000000000]], 1],
        [[[-1000000000, -999999999]], 2],
        [[[5, 4, 3, 2, 1]], 5],
        [[[1, 3, 5, 7]], 1],
        [[{ $range: [0, 100000, 1] }], 100000],
        [[{ $range: [100000, 0, -1] }], 100000],
        [[{ $range: [0, 200000, 2] }], 1],
        [[{ $concat: [{ $range: [0, 50000, 1] }, { $range: [60000, 110000, 1] }] }], 50000],
        [[{ $rep: 5, n: 100000 }], 1]
      ]
    },
    solution: {
      approach: `<p>Hash set + "start of run" check. Each element is touched O(1) times overall: once in the outer loop, at most once inside a walk.</p>`,
      code: `
def longest_consecutive(nums):
    s = set(nums)                      # O(n), removes duplicates
    best = 0
    for x in s:
        if x - 1 not in s:             # x begins a run
            y = x
            while y + 1 in s:          # each number is walked at most once overall
                y += 1
            best = max(best, y - x + 1)
    return best

print(longest_consecutive([100, 4, 200, 1, 3, 2]), longest_consecutive([]), longest_consecutive([0, 3, 7, 2, 5, 8, 4, 6, 0, 1]))`,
      dry: { head: ['x', 'x−1 in s?', 'walk', 'best'], rows: [['100', 'no', '100', '1'], ['4', 'yes → skip', '—', '1'], ['200', 'no', '200', '1'], ['1', 'no', '1→2→3→4', '<span class="c-g">4</span>']] },
      complexity: `<p>Time O(n) average, space O(n).</p>`,
      followUps: ['Return the run itself', 'Union-Find alternative — when is it useful?']
    }
  });

  practice.push({
    title: 'Flatten an Arbitrarily Nested List Lazily',
    level: 'Medium', tags: ['generator', 'recursion', 'yield from'], companies: ['LinkedIn', 'Airbnb', 'Twitter'],
    statement: `<p>Write a generator <code>flatten(x)</code> that yields every non-list value of an arbitrarily nested list in left-to-right order, without building intermediate lists. It must work when the consumer stops early (e.g., only wants the first 3 values).</p>`,
    constraints: `Total values ≤ 10<sup>6</sup>, nesting depth ≤ 500`,
    example: `<p>[1, [2, [3, 4]], [], 5] → yields ${H.c('g', '1, 2, 3, 4, 5')}. <code>list(islice(flatten(big), 3))</code> must touch only what it needs.</p>`,
    brute: { why: `<p>Recursive concatenation: <code>result = result + flatten_list(item)</code> builds and copies new lists at every level — O(n · depth) copying and O(n) memory even if the caller wants only the first item.</p>`, code: `
def flatten_list(x):
    result = []
    for item in x:
        if isinstance(item, list):
            result = result + flatten_list(item)   # copies result every time
        else:
            result = result + [item]
    return result

print(flatten_list([1, [2, [3, 4]], [], 5]))` },
    mcq: { q: 'What does <code>yield from flatten(item)</code> do?', options: ['Returns the whole sub-list at once', 'Delegates: re-yields every value the inner generator produces, one at a time', 'Starts a thread', 'Copies the inner generator'], answer: 1, explain: '<code>yield from g</code> is shorthand for <code>for v in g: yield v</code> (plus forwarding of send/throw). Values flow lazily through the chain of generators.' },
    hints: [`<p>Hint 1: Recursion fits the shape: a list item is either a value (yield it) or another list (flatten it).</p>`, `<p>Hint 2: Use <code>yield</code> for values and <code>yield from flatten(item)</code> for sub-lists — no list is ever built.</p>`, `<p>Hint 3: Very deep nesting can exceed the recursion limit; an explicit stack of iterators avoids that. Recipe: stack = [iter(x)]; while stack: for item in stack[-1]: if list: push iter(item); break; else yield item; else: stack.pop().</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          ['result = [list(flatten([1, [2, [3, 4]], [], 5])), list(flatten_iter([1, [2, [3, 4]], [], 5]))]'],
          [[1, 2, 3, 4, 5], [1, 2, 3, 4, 5]]
        ],
        [['result = [list(flatten([])), list(flatten_iter([]))]'], [[], []]],
        [['result = [list(flatten([[]])), list(flatten_iter([[]]))]'], [[], []]],
        [['result = [list(flatten([[[[1]]]])), list(flatten_iter([[[[1]]]]))]'], [[1], [1]]],
        [
          ['result = [list(flatten([(1, 2), [3]])), list(flatten_iter([(1, 2), [3]]))]'],
          [[[1, 2], 3], [[1, 2], 3]]
        ],
        [
          ['result = [list(flatten([\'ab\', [\'c\']])), list(flatten_iter([\'ab\', [\'c\']]))]'],
          [['ab', 'c'], ['ab', 'c']]
        ],
        [
          [
            'result = [list(flatten([[1, 2], [3, [4, [5, [6]]]], 7])), list(flatten_iter([[1, 2], [3, [4, [5, [6]]]], 7]))]'
          ],
          [[1, 2, 3, 4, 5, 6, 7], [1, 2, 3, 4, 5, 6, 7]]
        ],
        [
          ['result = [list(flatten([None, [None]])), list(flatten_iter([None, [None]]))]'],
          [[null, null], [null, null]]
        ],
        [['result = [list(flatten([[[], []], [[]]])), list(flatten_iter([[[], []], [[]]]))]'], [[], []]],
        [
          [
            'class Boom(list):\n' +
              '    def __iter__(self):\n' +
              '        raise RuntimeError(\'touched\')\n' +
              'from itertools import islice\n' +
              'result = [list(islice(flatten([1, 2, 3, Boom()]), 3)), list(islice(flatten_iter([1, 2, 3, Boom()]), 3))]'
          ],
          [[1, 2, 3], [1, 2, 3]]
        ],
        [
          [
            'x = [0]\n' +
              'for i in range(1, 500):\n' +
              '    x = [x, i]\n' +
              'result = [list(flatten(x)) == list(range(500)), list(flatten_iter(x)) == list(range(500))]'
          ],
          [true, true]
        ],
        [
          [
            'x = [0]\n' +
              'for i in range(1, 20000):\n' +
              '    x = [x, i]\n' +
              'result = list(flatten_iter(x)) == list(range(20000))'
          ],
          true
        ],
        [
          [
            'result = [sum(1 for _ in flatten([list(range(1000)) for _ in range(1000)])), sum(1 for _ in flatten_iter([list(range(1000)) for _ in range(1000)]))]'
          ],
          [1000000, 1000000]
        ],
        [
          [
            'from itertools import islice\n' +
              'big = [[i, [i]] for i in range(10**5)]\n' +
              'result = [list(islice(flatten(big), 3)), list(islice(flatten_iter(big), 3))]'
          ],
          [[0, 0, 1], [0, 0, 1]]
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>A recursive generator with <code>yield from</code> streams values lazily with O(depth) memory. The iterative version keeps a stack of iterators to survive deep nesting.</p>`,
      code: `
from itertools import islice

def flatten(x):
    for item in x:
        if isinstance(item, list):
            yield from flatten(item)     # delegate to the sub-generator
        else:
            yield item

def flatten_iter(x):
    stack = [iter(x)]                    # explicit stack: no recursion limit issues
    while stack:
        for item in stack[-1]:
            if isinstance(item, list):
                stack.append(iter(item))
                break                    # go deeper first
            yield item
        else:
            stack.pop()                  # this level is exhausted

data = [1, [2, [3, 4]], [], 5]
print(list(flatten(data)), list(flatten_iter(data)))
big = [[i, [i]] for i in range(10**5)]
print(list(islice(flatten(big), 3)))   # stops after 3 values: lazy`,
      dry: { head: ['stack depth', 'item', 'action', 'yielded'], rows: [['1', '1', 'yield', '1'], ['1', '[2,[3,4]]', 'push', '1'], ['2', '2', 'yield', '1,2'], ['2', '[3,4]', 'push', '1,2'], ['3', '3, 4', 'yield, then pop', '1,2,3,4'], ['1', '[] then 5', 'push/pop, yield', '<span class="c-g">1,2,3,4,5</span>']] },
      complexity: `<p>Time O(total items + total lists). Extra memory O(depth) — no intermediate lists.</p>`,
      followUps: ['Also flatten tuples but treat strings as atoms', 'Make it handle self-referencing lists without looping forever']
    }
  });

  practice.push({
    title: 'Subarray Sum Equals K (Prefix Sums in a Dict)',
    level: 'Medium', tags: ['dict', 'prefix sum', 'counting'], companies: ['Meta', 'Google', 'Amazon', 'Microsoft'],
    statement: `<p>Given a list of integers (negatives allowed) and an integer k, return the number of <b>contiguous</b> subarrays whose sum equals k.</p>`,
    constraints: `1 ≤ n ≤ 2·10<sup>4</sup>, −1000 ≤ nums[i] ≤ 1000, −10<sup>7</sup> ≤ k ≤ 10<sup>7</sup>`,
    example: `<p>nums = [1, 2, 3], k = 3 → ${H.c('g', '2')} ([1, 2] and [3]). nums = [1, -1, 0], k = 0 → ${H.c('g', '3')}.</p>`,
    brute: { why: `<p>Every start i, extend j and keep a running sum: O(n²) = 4·10<sup>8</sup> Python steps — far too slow. Sliding window does not work because negative numbers break monotonicity.</p>`, code: `
def count_brute(nums, k):
    count = 0
    for i in range(len(nums)):
        s = 0
        for j in range(i, len(nums)):    # O(n^2) subarrays
            s += nums[j]
            if s == k:
                count += 1
    return count

print(count_brute([1, 2, 3], 3), count_brute([1, -1, 0], 0))` },
    mcq: { q: 'Why is the dict seeded with <code>{0: 1}</code>?', options: ['To avoid KeyError', 'It represents the empty prefix, so subarrays starting at index 0 are counted', 'Dicts cannot start empty', 'It handles negative numbers'], answer: 1, explain: 'sum(i..j) = prefix[j] − prefix[i−1]. When the subarray starts at 0, the "previous prefix" is the empty sum 0, which must already be counted once.' },
    hints: [`<p>Hint 1: sum(i..j) = P[j] − P[i−1] where P is the running prefix sum. We need P[i−1] = P[j] − k.</p>`, `<p>Hint 2: Keep a dict prefix_sum → how many times seen so far. At each j add <code>count[P − k]</code> to the answer.</p>`, `<p>Hint 3: Seed {0: 1}; look up before inserting the current prefix (so a subarray is never empty). Recipe: P = ans = 0; seen = {0: 1}; for x in nums: P += x; ans += seen.get(P - k, 0); seen[P] = seen.get(P, 0) + 1.</p>`],
    tests: {
      sig: 'int[] int -> int',
      fn: 'subarraySum',
      cases: [
        [[[1, 2, 3], 3], 2],
        [[[1, -1, 0], 0], 3],
        [[[1, 1, 1], 2], 2],
        [[[1], 1], 1],
        [[[1], 2], 0],
        [[[0, 0, 0], 0], 6],
        [[[-1, -1, 1], 0], 1],
        [[[3, 4, 7, 2, -3, 1, 4, 2], 7], 4],
        [[[1, 2, 1, 2, 1], 3], 4],
        [[[-5, 5, -5, 5], 0], 4],
        [[[1000, -1000, 1000], 0], 2],
        [[{ $rep: 0, n: 20000 }, 0], 200010000],
        [[{ $rep: 1, n: 20000 }, 3], 19998],
        [[{ $concat: [{ $rep: 1000, n: 10000 }, { $rep: -1000, n: 10000 }] }, 0], 10000]
      ]
    },
    solution: {
      approach: `<p>One pass, running prefix sum, dict of prefix frequencies. Each step is O(1) average, giving O(n) overall even with negatives.</p>`,
      code: `
def subarray_sum(nums, k):
    seen = {0: 1}             # prefix sum -> times seen (empty prefix once)
    prefix = ans = 0
    for x in nums:
        prefix += x
        ans += seen.get(prefix - k, 0)        # earlier prefixes that complete a sum of k
        seen[prefix] = seen.get(prefix, 0) + 1
    return ans

print(subarray_sum([1, 2, 3], 3), subarray_sum([1, -1, 0], 0), subarray_sum([1, 1, 1], 2))`,
      dry: { head: ['x', 'prefix', 'prefix − k', 'ans', 'seen'], rows: [['1', '1', '-2', '0', '{0:1, 1:1}'], ['2', '3', '0', '1', '{0:1, 1:1, 3:1}'], ['3', '6', '3', '<span class="c-g">2</span>', '{0:1, 1:1, 3:1, 6:1}']] },
      complexity: `<p>Time O(n) average, space O(n).</p>`,
      followUps: ['Return the longest such subarray', 'Count subarrays whose sum is divisible by k']
    }
  });

  practice.push({
    title: 'LRU Cache Using Only a Plain dict',
    level: 'Medium', tags: ['dict ordering', 'design', 'O(1)'], companies: ['Amazon', 'Microsoft', 'Bloomberg', 'Salesforce'],
    statement: `<p>Design <code>LRUCache(capacity)</code> with <code>get(key)</code> (return value or -1) and <code>put(key, value)</code>. When full, <code>put</code> evicts the <b>least recently used</b> key. Both operations must be O(1) average. Use dict insertion order instead of a hand-written linked list.</p>`,
    constraints: `1 ≤ capacity ≤ 3000, up to 2·10<sup>5</sup> calls`,
    example: `<p>cap 2: put(1,1), put(2,2), get(1) → 1, put(3,3) evicts ${H.c('r', 'key 2')}, get(2) → -1, put(4,4) evicts ${H.c('r', 'key 1')}, get(1) → -1, get(3) → 3, get(4) → 4.</p>`,
    brute: { why: `<p>Keep a list of keys in usage order and call <code>order.remove(key)</code> on every access: O(capacity) per call → 3000 × 2·10<sup>5</sup> = 6·10<sup>8</sup> steps.</p>`, code: `
class LRUBrute:
    def __init__(self, capacity):
        self.cap, self.data, self.order = capacity, {}, []
    def get(self, key):
        if key not in self.data:
            return -1
        self.order.remove(key)          # O(n) scan + shift
        self.order.append(key)
        return self.data[key]
    def put(self, key, value):
        if key in self.data:
            self.order.remove(key)
        elif len(self.data) == self.cap:
            del self.data[self.order.pop(0)]   # O(n) shift
        self.data[key] = value
        self.order.append(key)

c = LRUBrute(2); c.put(1, 1); c.put(2, 2); print(c.get(1)); c.put(3, 3); print(c.get(2))` },
    mcq: { q: 'How do you mark a key as "most recently used" in a plain dict in O(1)?', options: ['<code>d[key] = d[key]</code>', '<code>d[key] = d.pop(key)</code> (delete, then re-insert at the end)', '<code>d.move_to_end(key)</code>', 'Sort the dict'], answer: 1, explain: 'Reassigning an existing key keeps its position, so option A does nothing to the order. Popping and re-inserting moves it to the end. move_to_end exists only on OrderedDict.' },
    hints: [`<p>Hint 1: A dict iterates oldest-inserted first. If every access moves a key to the end, the first key is always the least recently used.</p>`, `<p>Hint 2: Move to end = <code>d[key] = d.pop(key)</code>. Oldest key = <code>next(iter(d))</code> — O(1) amortized.</p>`, `<p>Hint 3: In put, if the key exists, pop it first (it becomes newest); else, if full, evict <code>next(iter(d))</code>. Then insert.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'c = LRUCache(2)\n' +
              'r = []\n' +
              'c.put(1, 1); c.put(2, 2)\n' +
              'r.append(c.get(1))\n' +
              'c.put(3, 3)\n' +
              'r.append(c.get(2))\n' +
              'c.put(4, 4)\n' +
              'r += [c.get(1), c.get(3), c.get(4)]\n' +
              'result = r'
          ],
          [1, -1, -1, 3, 4]
        ],
        [
          [
            'c = LRUCache(1)\n' +
              'c.put(1, 10)\n' +
              'r = [c.get(1)]\n' +
              'c.put(2, 20)\n' +
              'r += [c.get(1), c.get(2)]\n' +
              'result = r'
          ],
          [10, -1, 20]
        ],
        [['c = LRUCache(2)\nresult = [c.get(5)]'], [-1]],
        [
          [
            'c = LRUCache(2)\n' +
              'c.put(1, 1); c.put(2, 2); c.put(1, 100)\n' +
              'c.put(3, 3)\n' +
              'result = [c.get(1), c.get(2), c.get(3)]'
          ],
          [100, -1, 3]
        ],
        [['c = LRUCache(2)\nc.put(1, 0)\nresult = [c.get(1)]'], [0]],
        [
          [
            'c = LRUCache(2)\n' +
              'c.put(1, 1); c.put(2, 2); c.get(1); c.put(3, 3)\n' +
              'result = [c.get(1), c.get(2), c.get(3)]'
          ],
          [1, -1, 3]
        ],
        [
          [
            'c = LRUCache(3)\n' +
              'for k in range(5):\n' +
              '    c.put(k, k * k)\n' +
              'result = [c.get(k) for k in range(5)]'
          ],
          [-1, -1, 4, 9, 16]
        ],
        [
          [
            'c = LRUCache(2)\n' +
              'c.put(1, 1); c.put(1, 2); c.put(1, 3)\n' +
              'c.put(2, 2)\n' +
              'result = [c.get(1), c.get(2)]'
          ],
          [3, 2]
        ],
        [
          [
            'a, b = LRUCache(1), LRUCache(1)\n' +
              'a.put(1, 1)\n' +
              'result = [a.get(1), b.get(1)]'
          ],
          [1, -1]
        ],
        [
          [
            'import random\n' +
              'from collections import OrderedDict\n' +
              'rnd = random.Random(1)\n' +
              'c = LRUCache(5)\n' +
              'ref = OrderedDict()\n' +
              'ok = True\n' +
              'for _ in range(5000):\n' +
              '    k = rnd.randrange(9)\n' +
              '    if rnd.random() < 0.5:\n' +
              '        want = -1\n' +
              '        if k in ref:\n' +
              '            ref.move_to_end(k)\n' +
              '            want = ref[k]\n' +
              '        ok = ok and c.get(k) == want\n' +
              '    else:\n' +
              '        v = rnd.randrange(100)\n' +
              '        c.put(k, v)\n' +
              '        ref[k] = v\n' +
              '        ref.move_to_end(k)\n' +
              '        if len(ref) > 5:\n' +
              '            ref.popitem(last=False)\n' +
              'result = ok'
          ],
          true
        ],
        [
          [
            'import random\n' +
              'from collections import OrderedDict\n' +
              'rnd = random.Random(2)\n' +
              'c = LRUCache(1)\n' +
              'ref = OrderedDict()\n' +
              'ok = True\n' +
              'for _ in range(3000):\n' +
              '    k = rnd.randrange(4)\n' +
              '    if rnd.random() < 0.5:\n' +
              '        want = -1\n' +
              '        if k in ref:\n' +
              '            ref.move_to_end(k)\n' +
              '            want = ref[k]\n' +
              '        ok = ok and c.get(k) == want\n' +
              '    else:\n' +
              '        v = rnd.randrange(100)\n' +
              '        c.put(k, v)\n' +
              '        ref[k] = v\n' +
              '        ref.move_to_end(k)\n' +
              '        if len(ref) > 1:\n' +
              '            ref.popitem(last=False)\n' +
              'result = ok'
          ],
          true
        ],
        [
          [
            'import random\n' +
              'from collections import OrderedDict\n' +
              'rnd = random.Random(3)\n' +
              'c = LRUCache(3000)\n' +
              'ref = OrderedDict()\n' +
              'ok = True\n' +
              'for _ in range(200000):\n' +
              '    k = rnd.randrange(4000)\n' +
              '    if rnd.random() < 0.5:\n' +
              '        want = -1\n' +
              '        if k in ref:\n' +
              '            ref.move_to_end(k)\n' +
              '            want = ref[k]\n' +
              '        ok = ok and c.get(k) == want\n' +
              '    else:\n' +
              '        v = rnd.randrange(100)\n' +
              '        c.put(k, v)\n' +
              '        ref[k] = v\n' +
              '        ref.move_to_end(k)\n' +
              '        if len(ref) > 3000:\n' +
              '            ref.popitem(last=False)\n' +
              'result = ok'
          ],
          true
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Exploit insertion order: the dict is both the hash map and the recency list. Pop + re-insert moves a key to the newest end; the first key is the eviction victim. (OrderedDict's <code>move_to_end</code>/<code>popitem(last=False)</code> is the explicit alternative.)</p>`,
      code: `
class LRUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.d = {}                      # insertion order == recency order

    def get(self, key):
        if key not in self.d:
            return -1
        value = self.d.pop(key)          # remove ...
        self.d[key] = value              # ... and re-insert as newest
        return value

    def put(self, key, value):
        if key in self.d:
            self.d.pop(key)
        elif len(self.d) >= self.cap:
            del self.d[next(iter(self.d))]   # oldest key = least recently used
        self.d[key] = value

c = LRUCache(2)
c.put(1, 1); c.put(2, 2)
print(c.get(1)); c.put(3, 3)
print(c.get(2)); c.put(4, 4)
print(c.get(1), c.get(3), c.get(4))`,
      alt: [{ lang: 'python', title: 'OrderedDict version', code: `
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.cap, self.d = capacity, OrderedDict()
    def get(self, key):
        if key not in self.d:
            return -1
        self.d.move_to_end(key)
        return self.d[key]
    def put(self, key, value):
        self.d[key] = value
        self.d.move_to_end(key)
        if len(self.d) > self.cap:
            self.d.popitem(last=False)

c = LRUCache(1); c.put(1, 1); c.put(2, 2); print(c.get(1), c.get(2))` }],
      dry: { head: ['call', 'dict order (oldest → newest)', 'returns'], rows: [['put(1,1), put(2,2)', '1, 2', '—'], ['get(1)', '2, 1', '1'], ['put(3,3)', 'evict 2 → 1, 3', '—'], ['get(2)', '1, 3', '-1'], ['put(4,4)', 'evict 1 → 3, 4', '—']] },
      complexity: `<p>O(1) average per call. Note: <code>next(iter(d))</code> can slow down if many deletions leave holes at the front; CPython compacts on resize, and in practice it stays fast. OrderedDict guarantees O(1).</p>`,
      followUps: ['Add a TTL (expire entries after t seconds)', 'Make it thread-safe', 'How does functools.lru_cache implement this?']
    }
  });

  practice.push({
    title: 'Deep-Clone Nested Data with Shared References and Cycles',
    level: 'Medium', tags: ['copying', 'recursion', 'memoization'], companies: ['Google', 'Stripe', 'Databricks'],
    statement: `<p>Write <code>clone(obj)</code> for data built from <code>list</code>, <code>dict</code> and immutable atoms (int, float, str, bool, None, tuples of atoms). The clone must share <b>nothing mutable</b> with the original, must <b>preserve sharing</b> inside the structure (if two slots point to one list, the clone's two slots point to one new list), and must handle <b>cycles</b>.</p>`,
    constraints: `Up to 10<sup>5</sup> containers, depth ≤ 500`,
    example: `<p>shared = [1]; data = {"a": shared, "b": shared}; data["me"] = data → clone c has ${H.c('g', 'c["a"] is c["b"]')}, ${H.c('g', 'c["me"] is c')}, and ${H.c('g', 'c["a"] is not shared')}.</p>`,
    brute: { why: `<p>Naive recursion without memory copies a shared list <b>twice</b> (breaking sharing) and recurses forever on a cycle (RecursionError).</p>`, code: `
def clone_naive(obj):
    if isinstance(obj, list):
        return [clone_naive(x) for x in obj]
    if isinstance(obj, dict):
        return {k: clone_naive(v) for k, v in obj.items()}
    return obj

shared = [1]
c = clone_naive({"a": shared, "b": shared})
print(c["a"] is c["b"])     # False: sharing lost (and a cycle would recurse forever)` },
    mcq: { q: 'When must the new container be registered in the memo?', options: ['After all children are cloned', 'Before cloning its children', 'Never — ids are enough', 'Only for dicts'], answer: 1, explain: 'If a child refers back to its parent (a cycle), the recursive call must find the parent\'s copy in the memo. So create the empty copy, store memo[id(obj)] = copy, then fill it.' },
    hints: [`<p>Hint 1: Keep a memo dict <code>id(original) → copy</code>. Before copying any container, check the memo; if present, return the existing copy.</p>`, `<p>Hint 2: Create the empty container first, register it in the memo, then fill it — that is what makes cycles terminate.</p>`, `<p>Hint 3: Immutable atoms can be returned as they are. Recipe: if id in memo → return; if list: new = []; memo[id] = new; new.extend(clone(x) for x in obj); same for dict; else return obj.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'shared = [1]\n' +
              'data = {\'a\': shared, \'b\': shared}\n' +
              'data[\'me\'] = data\n' +
              'c = clone(data)\n' +
              'result = [c[\'a\'] is c[\'b\'], c[\'me\'] is c, c[\'a\'] is shared, c[\'a\'], c is data]'
          ],
          [true, true, false, [1], false]
        ],
        [['o = [[1], [2]]\nc = clone(o)\nc[0].append(9)\nresult = [o, c]'], [[[1], [2]], [[1, 9], [2]]]],
        [
          ['result = [clone(5), clone(\'s\'), clone(None), clone((1, 2)), clone(2.5)]'],
          [5, 's', null, [1, 2], 2.5]
        ],
        [
          [
            'o = {\'k\': [1, {\'z\': [2]}]}\n' +
              'c = clone(o)\n' +
              'c[\'k\'][1][\'z\'].append(3)\n' +
              'result = [o, c]'
          ],
          [{ k: [1, { z: [2] }] }, { k: [1, { z: [2, 3] }] }]
        ],
        [
          [
            'l = []\n' +
              'l.append(l)\n' +
              'c = clone(l)\n' +
              'result = [c is not l, c[0] is c, len(c)]'
          ],
          [true, true, 1]
        ],
        [
          [
            'a = [1]\n' +
              'b = [a]\n' +
              'a.append(b)\n' +
              'c = clone(a)\n' +
              'result = [c is not a, c[1][0] is c, c[0]]'
          ],
          [true, true, 1]
        ],
        [
          [
            'x = [0]\n' +
              'for i in range(499):\n' +
              '    x = [x]\n' +
              'c = clone(x)\n' +
              'd = 0\n' +
              'y, z = c, x\n' +
              'while isinstance(y, list) and y and isinstance(y[0], list):\n' +
              '    assert y is not z\n' +
              '    y, z = y[0], z[0]\n' +
              '    d += 1\n' +
              'result = [d, y == [0], y is not z]'
          ],
          [499, true, true]
        ],
        [
          [
            's = [1]\n' +
              'data = [s] * 100000\n' +
              'c = clone(data)\n' +
              'result = [len(c), all(e is c[0] for e in c), c[0] is not s, c[0]]'
          ],
          [100000, true, true, [1]]
        ],
        [
          [
            'data = [[] for _ in range(100000)]\n' +
              'c = clone(data)\n' +
              'result = [len(c), c[0] is not data[0], c[5] is not c[6], c == data]'
          ],
          [100000, true, true, true]
        ],
        [['result = clone([])'], []],
        [['result = clone({})'], {  }],
        [['t = (1, 2)\nc = clone([t, t])\nresult = [c[0] is t, c[1] is t]'], [true, true]],
        [
          [
            'o = {\'a\': [1], \'b\': [1]}\n' +
              'c = clone(o)\n' +
              'result = [c[\'a\'] is c[\'b\'], c == o]'
          ],
          [false, true]
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Recursive copy with a memo keyed by object identity — the same strategy as <code>copy.deepcopy</code>. Registering the new container before recursing handles cycles; reusing memo entries preserves sharing.</p>`,
      code: `
def clone(obj, memo=None):
    if memo is None:
        memo = {}
    oid = id(obj)
    if oid in memo:                      # already copied: reuse (sharing / cycles)
        return memo[oid]
    if isinstance(obj, list):
        new = []
        memo[oid] = new                  # register BEFORE recursing
        for x in obj:                    # plain loop: one frame per level, so depth 500 fits
            new.append(clone(x, memo))
        return new
    if isinstance(obj, dict):
        new = {}
        memo[oid] = new
        for k, v in obj.items():         # keys are hashable -> immutable enough to share
            new[k] = clone(v, memo)
        return new
    return obj                           # immutable atoms are shared safely

shared = [1]
data = {"a": shared, "b": shared}
data["me"] = data
c = clone(data)
print(c["a"] is c["b"], c["me"] is c, c["a"] is shared, c["a"])`,
      dry: { head: ['call', 'memo after', 'result'], rows: [['clone(data)', '{id(data): {}}', 'fill dict'], ['clone(shared) for "a"', '+ {id(shared): []}', 'new list [1]'], ['clone(shared) for "b"', 'hit', 'same new list'], ['clone(data) for "me"', 'hit', '<span class="c-g">the dict being built (cycle)</span>']] },
      complexity: `<p>Time O(total objects + references), space O(objects) for the memo and recursion depth O(depth).</p>`,
      followUps: ['Support sets and tuples containing lists', 'Make it iterative to avoid RecursionError on deep data', 'Why must the memo keep originals alive? (ids can be reused after garbage collection)']
    }
  });

  /* ================= PRACTICE: Hard ================= */
  practice.push({
    title: 'Implement a Dynamic Array with Amortized O(1) Append and Safe Shrinking',
    level: 'Hard', tags: ['dynamic array', 'amortized analysis', 'design'], companies: ['Google', 'Microsoft', 'Nvidia'],
    statement: `<p>Implement <code>DynArray</code> on top of a fixed-size Python list used as raw storage (you may only allocate a new storage list of a given size and copy into it). Support <code>append</code>, <code>pop()</code>, <code>insert(i, x)</code>, <code>d[i]</code> get/set with negative indices and <code>IndexError</code>, and <code>len()</code>. Appends must be amortized O(1), and a long alternating sequence of push/pop at a capacity boundary must <b>not</b> cause repeated resizes (no thrashing).</p>`,
    constraints: `Up to 10<sup>6</sup> operations`,
    example: `<p>append 1..9 → capacities 1, 2, 4, 8, 16 (doubling). Pop down to 4 items with cap 16 → shrink to 8 only when size ≤ cap/4. Alternating append/pop at size 8/9 never resizes repeatedly.</p>`,
    brute: { why: `<p>Growing by exactly <b>one</b> slot on each append copies 1 + 2 + … + n ≈ n²/2 elements — 5·10<sup>11</sup> copies for 10<sup>6</sup> appends. And shrinking as soon as size ≤ cap/2 thrashes: push at the boundary grows, pop immediately shrinks, each O(n).</p>`, code: `
class GrowByOne:
    def __init__(self):
        self.store, self.n, self.copies = [], 0, 0
    def append(self, x):
        new = [None] * (self.n + 1)          # exact fit every time
        for i in range(self.n):
            new[i] = self.store[i]
            self.copies += 1
        new[self.n] = x
        self.store, self.n = new, self.n + 1

g = GrowByOne()
for i in range(1000):
    g.append(i)
print(g.copies)                              # 499500 copies for 1000 appends` },
    mcq: { q: 'Why shrink at size ≤ cap/4 (to cap/2) instead of at size ≤ cap/2?', options: ['It saves more memory', 'It leaves a buffer so a push right after a shrink does not immediately trigger a grow — no thrashing', 'Python requires it', 'It makes get() faster'], answer: 1, explain: 'After shrinking to cap/2 at size cap/4, the array is half full: Θ(n) cheap operations must happen before the next resize in either direction, which keeps both push and pop amortized O(1).' },
    hints: [`<p>Hint 1: Grow geometrically (×2, or ×1.125 like CPython). Each element is then copied O(1) times on average.</p>`, `<p>Hint 2: Shrink with hysteresis: halve the capacity only when size drops to a quarter. Keep a minimum capacity of 1.</p>`, `<p>Hint 3: insert(i, x): ensure capacity, shift items i..n−1 right by one from the END backwards, write x. Normalise negative indices with i += n and validate 0 ≤ i &lt; n, raising IndexError otherwise.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'd = DynArray()\n' +
              'for i in range(1, 10):\n' +
              '    d.append(i)\n' +
              'result = [len(d), d[0], d[8], d[-1], d[-9]]'
          ],
          [9, 1, 9, 9, 1]
        ],
        [['d = DynArray()\nresult = [len(d)]'], [0]],
        [['d = DynArray()\nresult = d[0]'], '!IndexError'],
        [['d = DynArray()\nd.append(1)\nresult = d[1]'], '!IndexError'],
        [['d = DynArray()\nd.append(1)\nresult = d[-2]'], '!IndexError'],
        [['d = DynArray()\nd[0] = 5'], '!IndexError'],
        [['d = DynArray()\nresult = d.pop()'], '!IndexError'],
        [
          [
            'd = DynArray()\n' +
              'for i in range(5):\n' +
              '    d.append(i)\n' +
              'd[-1] = 40\n' +
              'd[0] = -1\n' +
              'result = [d[i] for i in range(5)]'
          ],
          [-1, 1, 2, 3, 40]
        ],
        [
          [
            'd = DynArray()\n' +
              'for i in range(1000):\n' +
              '    d.append(i)\n' +
              'd.insert(0, -1)\n' +
              'result = [d[0], d[1], len(d), d[-1]]'
          ],
          [-1, 0, 1001, 999]
        ],
        [
          [
            'd = DynArray()\n' +
              'for x in \'abc\':\n' +
              '    d.append(x)\n' +
              'd.insert(1, \'X\')\n' +
              'd.insert(-1, \'Y\')\n' +
              'd.insert(100, \'Z\')\n' +
              'd.insert(-100, \'W\')\n' +
              'result = [d[i] for i in range(len(d))]'
          ],
          ['W', 'a', 'X', 'b', 'Y', 'c', 'Z']
        ],
        [
          [
            'd = DynArray()\n' +
              'for i in range(1000):\n' +
              '    d.append(i)\n' +
              'before = d.copies\n' +
              'result = before < 2 * 1000'
          ],
          true
        ],
        [
          [
            'd = DynArray()\n' +
              'for i in range(8):\n' +
              '    d.append(i)\n' +
              'd.append(8)\n' +
              'before = d.copies\n' +
              'for _ in range(10000):\n' +
              '    d.pop()\n' +
              '    d.append(0)\n' +
              'result = [d.copies - before, len(d)]'
          ],
          [0, 9]
        ],
        [
          [
            'd = DynArray()\n' +
              'for i in range(9):\n' +
              '    d.append(i)\n' +
              'for _ in range(9):\n' +
              '    d.pop()\n' +
              'r = [len(d)]\n' +
              'd.append(7)\n' +
              'result = r + [len(d), d[0]]'
          ],
          [0, 1, 7]
        ],
        [
          [
            'd = DynArray()\n' +
              'for i in range(10**6):\n' +
              '    d.append(i)\n' +
              'result = [len(d), d[-1], d[0], d.copies < 2 * len(d)]'
          ],
          [1000000, 999999, 0, true]
        ],
        [
          [
            'd = DynArray()\n' +
              'for i in range(100000):\n' +
              '    d.append(i)\n' +
              'for _ in range(100000):\n' +
              '    d.pop()\n' +
              'result = [len(d), d.copies < 4 * 100000]'
          ],
          [0, true]
        ],
        [
          [
            'import random\n' +
              'rnd = random.Random(1)\n' +
              'd = DynArray()\n' +
              'm = []\n' +
              'ok = True\n' +
              'for _ in range(3000):\n' +
              '    op = rnd.randrange(5)\n' +
              '    if op <= 1 or not m:\n' +
              '        x = rnd.randrange(100)\n' +
              '        d.append(x); m.append(x)\n' +
              '    elif op == 2:\n' +
              '        ok = ok and d.pop() == m.pop()\n' +
              '    elif op == 3:\n' +
              '        i = rnd.randrange(-len(m) - 3, len(m) + 3)\n' +
              '        x = rnd.randrange(100)\n' +
              '        d.insert(i, x); m.insert(i, x)\n' +
              '    else:\n' +
              '        i = rnd.randrange(-len(m), len(m))\n' +
              '        x = rnd.randrange(100)\n' +
              '        d[i] = x; m[i] = x\n' +
              '        ok = ok and d[i] == m[i]\n' +
              '    ok = ok and len(d) == len(m)\n' +
              'result = ok and [d[i] for i in range(len(d))] == m'
          ],
          true
        ],
        [
          [
            'import random\n' +
              'rnd = random.Random(2)\n' +
              'd = DynArray()\n' +
              'm = []\n' +
              'ok = True\n' +
              'for _ in range(20000):\n' +
              '    op = rnd.randrange(5)\n' +
              '    if op <= 1 or not m:\n' +
              '        x = rnd.randrange(100)\n' +
              '        d.append(x); m.append(x)\n' +
              '    elif op == 2:\n' +
              '        ok = ok and d.pop() == m.pop()\n' +
              '    elif op == 3:\n' +
              '        i = rnd.randrange(-len(m) - 3, len(m) + 3)\n' +
              '        x = rnd.randrange(100)\n' +
              '        d.insert(i, x); m.insert(i, x)\n' +
              '    else:\n' +
              '        i = rnd.randrange(-len(m), len(m))\n' +
              '        x = rnd.randrange(100)\n' +
              '        d[i] = x; m[i] = x\n' +
              '        ok = ok and d[i] == m[i]\n' +
              '    ok = ok and len(d) == len(m)\n' +
              'result = ok and [d[i] for i in range(len(d))] == m'
          ],
          true
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Classic doubling dynamic array with quarter-full shrinking. A copy counter shows the amortized bound empirically (≈ n copies for n appends with doubling).</p>`,
      code: `
class DynArray:
    def __init__(self):
        self._cap = 1
        self._n = 0
        self._store = [None] * self._cap
        self.copies = 0                      # instrumentation for the analysis

    def __len__(self):
        return self._n

    def _resize(self, new_cap):
        new = [None] * new_cap
        for i in range(self._n):             # O(n) copy, but rare
            new[i] = self._store[i]
        self.copies += self._n
        self._store, self._cap = new, new_cap

    def _index(self, i):
        if i < 0:
            i += self._n
        if not 0 <= i < self._n:
            raise IndexError("DynArray index out of range")
        return i

    def __getitem__(self, i):
        return self._store[self._index(i)]

    def __setitem__(self, i, x):
        self._store[self._index(i)] = x

    def append(self, x):
        if self._n == self._cap:
            self._resize(2 * self._cap)      # geometric growth -> amortized O(1)
        self._store[self._n] = x
        self._n += 1

    def insert(self, i, x):
        i = max(0, min(i + self._n if i < 0 else i, self._n))   # clamp like list.insert
        if self._n == self._cap:
            self._resize(2 * self._cap)
        for j in range(self._n, i, -1):      # shift right, from the end backwards
            self._store[j] = self._store[j - 1]
        self._store[i] = x
        self._n += 1

    def pop(self):
        if self._n == 0:
            raise IndexError("pop from empty DynArray")
        self._n -= 1
        x = self._store[self._n]
        self._store[self._n] = None          # drop the reference (lets GC free it)
        if self._cap > 1 and self._n <= self._cap // 4:
            self._resize(self._cap // 2)     # hysteresis: no thrashing
        return x

d = DynArray()
for i in range(1000):
    d.append(i)
print(len(d), d[-1], d.copies)               # copies < 2 * n
d.insert(0, -1)
print(d[0], d[1], len(d))
for _ in range(10_000):                      # alternate at a boundary: no repeated resizes
    d.append(0)
    d.pop()
print("copies after alternating:", d.copies)`,
      dry: { head: ['op', 'n', 'cap', 'copies'], rows: [['append ×1', '1', '1', '0'], ['append ×2', '2', '2', '1'], ['append ×3', '3', '4', '3'], ['append ×5', '5', '8', '7'], ['append ×9', '9', '16', '15'], ['pop to 4', '4', '8', '19']] },
      complexity: `<p>append/pop amortized O(1) (potential-function argument: each cheap op "pays" for future copies); insert O(n − i); get/set O(1). Memory ≤ 4 × n slots.</p>`,
      followUps: ['Why does CPython use ~1.125× growth instead of 2×?', 'Prove that n appends with doubling copy fewer than 2n elements']
    }
  });

  practice.push({
    title: 'Build a HashMap with Open Addressing, Tombstones and Resizing',
    level: 'Hard', tags: ['hash table', 'open addressing', 'design'], companies: ['Google', 'Amazon', 'Meta', 'Jane Street'],
    statement: `<p>Implement <code>OpenHashMap</code> with <code>put(key, value)</code>, <code>get(key, default=None)</code>, <code>remove(key)</code> (returns True/False) and <code>len()</code>, using a <b>single array of slots</b> (no chaining) and CPython-style probing <code>i = (5·i + 1 + perturb) mod size</code>. Deletions must not break later lookups, and the table must resize to keep operations O(1) on average.</p>`,
    constraints: `Up to 2·10<sup>5</sup> operations; keys are any hashable objects`,
    example: `<p>put("a", 1), put("b", 2), remove("a"), get("b") → ${H.c('g', '2')}. Marking "a"'s slot EMPTY instead of a tombstone could make get("b") stop early and return ${H.c('r', 'None')} if "b" had collided past it.</p>`,
    brute: { why: `<p>A list of (key, value) pairs with linear search is O(n) per operation → 2·10<sup>5</sup> × 10<sup>5</sup> = 2·10<sup>10</sup>. A fixed-size table without resizing degrades to O(n) as it fills, and deleting by emptying slots breaks probe chains.</p>`, code: `
class PairListMap:
    def __init__(self):
        self.pairs = []
    def put(self, k, v):
        for i, (kk, _) in enumerate(self.pairs):   # O(n) search
            if kk == k:
                self.pairs[i] = (k, v)
                return
        self.pairs.append((k, v))
    def get(self, k, default=None):
        for kk, vv in self.pairs:
            if kk == k:
                return vv
        return default

m = PairListMap(); m.put("a", 1); m.put("a", 3); print(m.get("a"), m.get("z"))` },
    mcq: { q: 'Why must <code>perturb</code> be made non-negative (masked to 64 bits) in Python?', options: ['Python ints overflow', 'Right-shifting a negative int converges to −1, not 0, so the probe sequence can get stuck', 'Negative hashes are illegal', 'It makes hashing faster'], answer: 1, explain: 'In Python, -5 >> 5 == -1 forever. Then i = (5i + 1 − 1) & mask = 5i & mask can cycle among a few slots (e.g. stuck at 0) and never reach an empty one. Masking with (1 << 64) − 1 mimics C\'s unsigned size_t.' },
    hints: [`<p>Hint 1: Three slot states: EMPTY (never used — stops a search), TOMBSTONE (deleted — keep searching, but reusable for insertion), and LIVE.</p>`, `<p>Hint 2: Track "used" = live + tombstones; when used reaches 2/3 of the table, rebuild into a table sized from the live count (this also clears tombstones).</p>`, `<p>Hint 3: Probe: i = h &amp; mask; perturb = h &amp; (2<sup>64</sup> − 1); then repeatedly perturb &gt;&gt;= 5; i = (5i + 1 + perturb) &amp; mask. Remember the first tombstone you pass so put can reuse it if the key is absent.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'm = OpenHashMap()\n' +
              'm.put(\'a\', 1); m.put(\'b\', 2); m.remove(\'a\')\n' +
              'result = [m.get(\'b\'), m.get(\'a\'), len(m)]'
          ],
          [2, null, 1]
        ],
        [
          [
            'm = OpenHashMap()\n' +
              'm.put(-1, \'neg\'); m.put(-2, \'neg2\')\n' +
              'result = [m.get(-1), m.get(-2), len(m)]'
          ],
          ['neg', 'neg2', 2]
        ],
        [
          [
            'm = OpenHashMap()\n' +
              'result = [m.get(\'x\'), m.get(\'x\', 5), m.remove(\'x\'), len(m)]'
          ],
          [null, 5, false, 0]
        ],
        [
          [
            'm = OpenHashMap()\n' +
              'm.put(\'k\', 1); m.put(\'k\', 2)\n' +
              'result = [m.get(\'k\'), len(m)]'
          ],
          [2, 1]
        ],
        [
          [
            'm = OpenHashMap()\n' +
              'm.put(\'k\', 1)\n' +
              'result = [m.remove(\'k\'), m.remove(\'k\'), len(m), m.get(\'k\')]'
          ],
          [true, false, 0, null]
        ],
        [
          [
            'm = OpenHashMap()\n' +
              'm.put(1, \'a\'); m.put(1.0, \'b\'); m.put(True, \'c\')\n' +
              'result = [len(m), m.get(1)]'
          ],
          [1, 'c']
        ],
        [
          [
            'm = OpenHashMap()\n' +
              'for k in [None, (1, 2), \'x\', 3.5, frozenset([1])]:\n' +
              '    m.put(k, str(k))\n' +
              'result = [m.get(None), m.get((1, 2)), m.get(\'x\'), m.get(3.5), m.get(frozenset([1])), len(m)]'
          ],
          ['None', '(1, 2)', 'x', '3.5', 'frozenset({1})', 5]
        ],
        [
          [
            'm = OpenHashMap()\n' +
              'for i in range(1000):\n' +
              '    m.put(\'k%d\' % i, i)\n' +
              'for i in range(0, 1000, 2):\n' +
              '    m.remove(\'k%d\' % i)\n' +
              'result = [len(m), m.get(\'k1\'), m.get(\'k2\'), m.get(\'k999\'), m.remove(\'nope\')]'
          ],
          [500, 1, null, 999, false]
        ],
        [
          [
            'm = OpenHashMap()\n' +
              'for i in range(100000):\n' +
              '    m.put(i, i * 2)\n' +
              'r = [len(m), m.get(99999), m.get(0)]\n' +
              'for i in range(100000):\n' +
              '    m.remove(i)\n' +
              'r += [len(m), m.get(5)]\n' +
              'for i in range(100000):\n' +
              '    m.put(i, i)\n' +
              'result = r + [len(m), m.get(77777)]'
          ],
          [100000, 199998, 0, 0, null, 100000, 77777]
        ],
        [
          [
            'm = OpenHashMap()\n' +
              'for i in range(200000):\n' +
              '    m.put(i, i)\n' +
              '    m.remove(i)\n' +
              'result = [len(m), m.get(5), m.get(199999)]'
          ],
          [0, null, null]
        ],
        [
          [
            'm = OpenHashMap()\n' +
              'm.put(\'a\', None)\n' +
              'result = [m.get(\'a\', \'dflt\'), len(m)]'
          ],
          [null, 1]
        ],
        [
          [
            'm = OpenHashMap()\n' +
              'for i in range(16):\n' +
              '    m.put(i * 8, i)\n' +
              'for i in range(0, 16, 2):\n' +
              '    m.remove(i * 8)\n' +
              'result = [m.get(i * 8) for i in range(16)]'
          ],
          [null, 1, null, 3, null, 5, null, 7, null, 9, null, 11, null, 13, null, 15]
        ],
        [
          [
            'import random\n' +
              'rnd = random.Random(1)\n' +
              'm = OpenHashMap()\n' +
              'ref = {}\n' +
              'ok = True\n' +
              'for _ in range(3000):\n' +
              '    op = rnd.randrange(3)\n' +
              '    k = rnd.randrange(50)\n' +
              '    if op == 0:\n' +
              '        v = rnd.randrange(1000)\n' +
              '        m.put(k, v); ref[k] = v\n' +
              '    elif op == 1:\n' +
              '        ok = ok and m.get(k, \'none\') == ref.get(k, \'none\')\n' +
              '    else:\n' +
              '        ok = ok and m.remove(k) == (k in ref)\n' +
              '        ref.pop(k, None)\n' +
              '    ok = ok and len(m) == len(ref)\n' +
              'result = ok and all(m.get(k) == v for k, v in ref.items())'
          ],
          true
        ],
        [
          [
            'import random\n' +
              'rnd = random.Random(2)\n' +
              'm = OpenHashMap()\n' +
              'ref = {}\n' +
              'ok = True\n' +
              'for _ in range(30000):\n' +
              '    op = rnd.randrange(3)\n' +
              '    k = rnd.randrange(2000)\n' +
              '    if op == 0:\n' +
              '        v = rnd.randrange(1000)\n' +
              '        m.put(k, v); ref[k] = v\n' +
              '    elif op == 1:\n' +
              '        ok = ok and m.get(k, \'none\') == ref.get(k, \'none\')\n' +
              '    else:\n' +
              '        ok = ok and m.remove(k) == (k in ref)\n' +
              '        ref.pop(k, None)\n' +
              '    ok = ok and len(m) == len(ref)\n' +
              'result = ok and all(m.get(k) == v for k, v in ref.items())'
          ],
          true
        ],
        [
          [
            'import random\n' +
              'rnd = random.Random(3)\n' +
              'm = OpenHashMap()\n' +
              'ref = {}\n' +
              'ok = True\n' +
              'for _ in range(200000):\n' +
              '    op = rnd.randrange(3)\n' +
              '    k = rnd.randrange(30000)\n' +
              '    if op == 0:\n' +
              '        v = rnd.randrange(1000)\n' +
              '        m.put(k, v); ref[k] = v\n' +
              '    elif op == 1:\n' +
              '        ok = ok and m.get(k, \'none\') == ref.get(k, \'none\')\n' +
              '    else:\n' +
              '        ok = ok and m.remove(k) == (k in ref)\n' +
              '        ref.pop(k, None)\n' +
              '    ok = ok and len(m) == len(ref)\n' +
              'result = ok and all(m.get(k) == v for k, v in ref.items())'
          ],
          true
        ],
        [
          [
            'import random\n' +
              'rnd = random.Random(4)\n' +
              'm = OpenHashMap()\n' +
              'ref = {}\n' +
              'ok = True\n' +
              'for _ in range(5000):\n' +
              '    op = rnd.randrange(3)\n' +
              '    k = \'s%d\' % rnd.randrange(300)\n' +
              '    if op == 0:\n' +
              '        v = rnd.randrange(1000)\n' +
              '        m.put(k, v); ref[k] = v\n' +
              '    elif op == 1:\n' +
              '        ok = ok and m.get(k, \'none\') == ref.get(k, \'none\')\n' +
              '    else:\n' +
              '        ok = ok and m.remove(k) == (k in ref)\n' +
              '        ref.pop(k, None)\n' +
              '    ok = ok and len(m) == len(ref)\n' +
              'result = ok and all(m.get(k) == v for k, v in ref.items())'
          ],
          true
        ],
        [
          [
            'import random\n' +
              'rnd = random.Random(5)\n' +
              'm = OpenHashMap()\n' +
              'ref = {}\n' +
              'ok = True\n' +
              'for _ in range(5000):\n' +
              '    op = rnd.randrange(3)\n' +
              '    k = rnd.randrange(-100, 100) * 1024\n' +
              '    if op == 0:\n' +
              '        v = rnd.randrange(1000)\n' +
              '        m.put(k, v); ref[k] = v\n' +
              '    elif op == 1:\n' +
              '        ok = ok and m.get(k, \'none\') == ref.get(k, \'none\')\n' +
              '    else:\n' +
              '        ok = ok and m.remove(k) == (k in ref)\n' +
              '        ref.pop(k, None)\n' +
              '    ok = ok and len(m) == len(ref)\n' +
              'result = ok and all(m.get(k) == v for k, v in ref.items())'
          ],
          true
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Parallel arrays of keys and values, sentinel objects for EMPTY and TOMBSTONE, CPython's perturbation probe, load factor ≤ 2/3 counting tombstones, rebuild on overflow. Lookups compare identity first, then equality (like CPython).</p>`,
      code: `
class OpenHashMap:
    _EMPTY = object()
    _TOMB = object()
    _MASK64 = (1 << 64) - 1

    def __init__(self, capacity=8):
        self._keys = [self._EMPTY] * capacity     # capacity must be a power of two
        self._vals = [None] * capacity
        self._size = 0                            # live keys
        self._used = 0                            # live keys + tombstones

    def __len__(self):
        return self._size

    def _probe(self, key):
        mask = len(self._keys) - 1
        h = hash(key)
        i, perturb = h & mask, h & self._MASK64   # unsigned perturb, like C
        while True:
            yield i
            perturb >>= 5
            i = (5 * i + 1 + perturb) & mask

    def _find(self, key):
        """Return (slot of key or None, best free slot for inserting key)."""
        first_tomb = None
        for i in self._probe(key):
            k = self._keys[i]
            if k is self._EMPTY:
                return None, (first_tomb if first_tomb is not None else i)
            if k is self._TOMB:
                if first_tomb is None:
                    first_tomb = i
            elif k is key or k == key:
                return i, None

    def put(self, key, value):
        i, free = self._find(key)
        if i is not None:
            self._vals[i] = value                 # update in place
            return
        if self._keys[free] is self._EMPTY:
            self._used += 1                       # reusing a tombstone does not add to used
        self._keys[free], self._vals[free] = key, value
        self._size += 1
        if self._used * 3 >= len(self._keys) * 2:
            self._rebuild()

    def get(self, key, default=None):
        i, _ = self._find(key)
        return default if i is None else self._vals[i]

    def remove(self, key):
        i, _ = self._find(key)
        if i is None:
            return False
        self._keys[i], self._vals[i] = self._TOMB, None   # tombstone keeps chains intact
        self._size -= 1
        return True

    def _rebuild(self):
        live = [(k, v) for k, v in zip(self._keys, self._vals) if k is not self._EMPTY and k is not self._TOMB]
        cap = 8
        while cap * 2 < len(live) * 3 + 3:        # keep load <= ~2/3 after rebuild, with headroom
            cap *= 2
        cap *= 2
        self._keys, self._vals = [self._EMPTY] * cap, [None] * cap
        self._size = self._used = 0
        for k, v in live:
            self.put(k, v)

m = OpenHashMap()
for i in range(1000):
    m.put(f"k{i}", i)
for i in range(0, 1000, 2):
    m.remove(f"k{i}")
print(len(m), m.get("k1"), m.get("k2"), m.get("k999"), m.remove("nope"))
m.put(-1, "neg"); m.put(-2, "neg2")            # hash(-1) == hash(-2) == -2: collision
print(m.get(-1), m.get(-2))`,
      dry: { head: ['op', 'slot path', 'result'], rows: [['put("a",1)', 'h&amp;7 → EMPTY', 'store, used=1'], ['put("b",2) (collides)', 'slot of a → next slot EMPTY', 'store, used=2'], ['remove("a")', 'found', 'TOMB, size=1'], ['get("b")', 'TOMB → keep probing → b', '<span class="c-g">2</span>']] },
      complexity: `<p>Average O(1) per operation (load ≤ 2/3); rebuild O(n) amortized over Θ(n) inserts. Worst case O(n) with adversarial hashes.</p>`,
      followUps: ['Add iteration in insertion order (hint: CPython\'s compact indices + entries design)', 'Compare with Robin Hood hashing and Swiss tables']
    }
  });

  practice.push({
    title: 'Sliding Window Maximum (Monotonic deque)',
    level: 'Hard', tags: ['deque', 'monotonic queue', 'sliding window'], companies: ['Amazon', 'Google', 'Citadel', 'Microsoft'],
    statement: `<p>Given a list <code>nums</code> and window size <code>k</code>, return the maximum of every contiguous window of size k, left to right.</p>`,
    constraints: `1 ≤ k ≤ n ≤ 10<sup>5</sup>`,
    example: `<p>nums = [1,3,-1,-3,5,3,6,7], k = 3 → ${H.c('g', '[3, 3, 5, 5, 6, 7]')}.</p>`,
    brute: { why: `<p><code>max(nums[i:i+k])</code> for each window: slicing copies k items and max scans k → O(n·k) = 10<sup>10</sup> at worst. Using a list as the queue with <code>pop(0)</code> adds another hidden O(k) per step.</p>`, code: `
def window_max_brute(nums, k):
    return [max(nums[i:i + k]) for i in range(len(nums) - k + 1)]   # O(n*k)

print(window_max_brute([1, 3, -1, -3, 5, 3, 6, 7], 3))` },
    mcq: { q: 'Why can we drop smaller elements from the back of the deque when a bigger one arrives?', options: ['To save memory only', 'They can never be a window maximum again: the new bigger element is newer and larger', 'Because deque is sorted', 'They are duplicates'], answer: 1, explain: 'Any future window containing the old smaller element also contains the newer bigger one (it leaves later), so the smaller one is useless forever. That keeps the deque decreasing.' },
    hints: [`<p>Hint 1: Keep candidate <b>indices</b> in a deque whose values are strictly decreasing from front to back. The front is the current maximum.</p>`, `<p>Hint 2: For each new index i: pop from the back while nums[back] ≤ nums[i]; append i; pop from the front if it fell out of the window (index ≤ i − k).</p>`, `<p>Hint 3: Start recording answers once i ≥ k − 1. A list with pop(0) would make the front removal O(k) — use collections.deque for O(1) at both ends.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_val',
      cases: [
        [['max_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 3)'], [3, 3, 5, 5, 6, 7]],
        [['max_sliding_window([9, 8, 7], 1)'], [9, 8, 7]],
        [['max_sliding_window([1], 1)'], [1]],
        [['max_sliding_window([1, 2, 3], 3)'], [3]],
        [['max_sliding_window([3, 2, 1], 3)'], [3]],
        [['max_sliding_window([5, 5, 5, 5], 2)'], [5, 5, 5]],
        [['max_sliding_window([-1, -2, -3], 2)'], [-1, -2]],
        [['max_sliding_window([1, -1], 1)'], [1, -1]],
        [['max_sliding_window([4, 2, 12, 3], 2)'], [4, 12, 12]],
        [['max_sliding_window([7, 2, 4], 2)'], [7, 4]],
        [['max_sliding_window([0, 0, 0], 3)'], [0]],
        [
          ['(lambda r: [len(r), r[0], r[-1], sum(r)])(max_sliding_window(list(range(100000)), 50000))'],
          [50001, 49999, 99999, 3750024999]
        ],
        [
          ['(lambda r: [len(r), r[0], r[-1], sum(r)])(max_sliding_window(list(range(100000, 0, -1)), 50000))'],
          [50001, 100000, 50000, 3750075000]
        ],
        [
          [
            '(lambda r: [len(r), r[0], r[-1], sum(r)])(max_sliding_window([(i * 7919) % 100003 for i in range(100000)], 1000))'
          ],
          [99001, 99984, 99910, 9895353342]
        ],
        [
          ['(lambda r: [len(r), r[0], r[-1], sum(r)])(max_sliding_window([5] * 100000, 100000))'],
          [1, 5, 5, 5]
        ],
        [
          [
            '(lambda r: [len(r), r[0], r[-1], sum(r)])(max_sliding_window([(-1) ** i * i for i in range(100000)], 3))'
          ],
          [99998, 2, 99998, 4999900000]
        ],
        [
          [
            '(lambda r: [len(r), r[0], r[-1], sum(r)])(max_sliding_window([i % 10 for i in range(100000)], 1))'
          ],
          [100000, 0, 9, 450000]
        ]
      ],
      harness: {
        python: 'def t_val(src):\n' +
          '    try:\n' +
          '        return eval(src)\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Monotonic decreasing deque of indices: each index is appended once and popped at most once, so total work is O(n). This relies on deque's O(1) <code>pop</code>/<code>popleft</code>.</p>`,
      code: `
from collections import deque

def max_sliding_window(nums, k):
    dq = deque()                  # indices; nums[dq[0]] is the window maximum
    out = []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:   # smaller, older elements are useless now
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:                # front slid out of the window
            dq.popleft()                  # O(1) -- list.pop(0) would be O(n)
        if i >= k - 1:
            out.append(nums[dq[0]])
    return out

print(max_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 3))
print(max_sliding_window([9, 8, 7], 1))`,
      dry: { head: ['i', 'x', 'deque (values)', 'output'], rows: [['0', '1', '[1]', '—'], ['1', '3', '[3]', '—'], ['2', '-1', '[3, -1]', '3'], ['3', '-3', '[3, -1, -3]', '3, 3'], ['4', '5', '[5]', '3, 3, 5'], ['7', '7', '[7]', '<span class="c-g">… 6, 7</span>']] },
      complexity: `<p>Time O(n) (each index pushed and popped once). Space O(k).</p>`,
      followUps: ['Sliding window minimum', 'Shortest subarray with sum at least K (negatives allowed) — monotonic deque on prefix sums']
    }
  });

  practice.push({
    title: 'Insert / Delete / GetRandom in O(1) — Duplicates Allowed',
    level: 'Hard', tags: ['list', 'dict of sets', 'design'], companies: ['Meta', 'Amazon', 'LinkedIn', 'Yelp'],
    statement: `<p>Design <code>RandomizedCollection</code> with <code>insert(val)</code> (returns True if val was not present before), <code>remove(val)</code> (removes one occurrence, returns True if present), and <code>get_random()</code> (each element returned with probability proportional to its count). All operations average O(1).</p>`,
    constraints: `Up to 2·10<sup>5</sup> calls; get_random only called when non-empty`,
    example: `<p>insert(1) → True, insert(1) → False, insert(2) → True, get_random() → 1 with probability ${H.c('g', '2/3')}, remove(1) → True, get_random() → 1 or 2 with ${H.c('g', '1/2')} each.</p>`,
    brute: { why: `<p>A plain list makes get_random O(1) (<code>random.choice</code>) but <code>remove(val)</code> must find and shift: O(n). A Counter makes insert/remove O(1) but get_random must walk counts: O(u).</p>`, code: `
import random

class ListOnly:
    def __init__(self):
        self.vals = []
    def insert(self, val):
        present = val in self.vals            # O(n)
        self.vals.append(val)
        return not present
    def remove(self, val):
        if val in self.vals:
            self.vals.remove(val)             # O(n) search + shift
            return True
        return False
    def get_random(self):
        return random.choice(self.vals)

c = ListOnly(); print(c.insert(1), c.insert(1), c.remove(1), c.vals)` },
    mcq: { q: 'How do you delete from the middle of a list in O(1) when order does not matter?', options: ['<code>del lst[i]</code>', 'Overwrite slot i with the LAST element, then <code>pop()</code> the end', 'Set lst[i] = None', 'Use lst.remove'], answer: 1, explain: 'Swap-with-last avoids the shift: pop() from the end is O(1). You must then update the index bookkeeping for the element that moved.' },
    hints: [`<p>Hint 1: A list gives O(1) random choice; the problem is O(1) removal. Order does not matter, so move the last element into the hole.</p>`, `<p>Hint 2: To find "some index of val" in O(1), keep <code>pos: dict[val → set of indices]</code>. Sets give O(1) add/remove of indices.</p>`, `<p>Hint 3: In remove: i = pos[val].pop(); last = vals[-1]; vals[i] = last; pos[last].add(i); pos[last].discard(len(vals) − 1); vals.pop(); delete pos[val] if empty. The add-then-discard order handles i == last index.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'rc = RandomizedCollection()\n' +
              'result = [rc.insert(1), rc.insert(1), rc.insert(2), rc.remove(1), rc.remove(1), rc.remove(1), rc.remove(2), rc.insert(1)]'
          ],
          [true, false, true, true, true, false, true, true]
        ],
        [
          [
            'import random\n' +
              'random.seed(1)\n' +
              'rc = RandomizedCollection()\n' +
              'rc.insert(1); rc.insert(1); rc.insert(2)\n' +
              'c = sum(1 for _ in range(30000) if rc.get_random() == 1)\n' +
              'result = 19000 < c < 21000'
          ],
          true
        ],
        [
          [
            'import random\n' +
              'random.seed(2)\n' +
              'rc = RandomizedCollection()\n' +
              'rc.insert(1); rc.insert(1); rc.insert(2)\n' +
              'rc.remove(1)\n' +
              'c = sum(1 for _ in range(20000) if rc.get_random() == 1)\n' +
              'result = 9000 < c < 11000'
          ],
          true
        ],
        [
          [
            'rc = RandomizedCollection()\n' +
              'rc.insert(5); rc.insert(6)\n' +
              'rc.remove(5)\n' +
              'result = sorted({rc.get_random() for _ in range(50)})'
          ],
          [6]
        ],
        [
          [
            'rc = RandomizedCollection()\n' +
              'result = [rc.remove(3), rc.insert(3), rc.remove(3), rc.remove(3), rc.insert(3)]'
          ],
          [false, true, true, false, true]
        ],
        [
          [
            'rc = RandomizedCollection()\n' +
              'rc.insert(7)\n' +
              'result = [rc.get_random(), rc.get_random()]'
          ],
          [7, 7]
        ],
        [
          [
            'rc = RandomizedCollection()\n' +
              'rc.insert(0); rc.insert(0); rc.insert(0)\n' +
              'result = [rc.remove(0), rc.remove(0), rc.get_random(), rc.remove(0), rc.remove(0)]'
          ],
          [true, true, 0, true, false]
        ],
        [
          [
            'rc = RandomizedCollection()\n' +
              'rc.insert(-1); rc.insert(10**9); rc.insert(-1)\n' +
              'result = [rc.remove(-1), rc.remove(10**9), rc.get_random()]'
          ],
          [true, true, -1]
        ],
        [
          [
            'import random\n' +
              'rnd = random.Random(1)\n' +
              'rc = RandomizedCollection()\n' +
              'from collections import Counter\n' +
              'model = Counter()\n' +
              'ok = True\n' +
              'for _ in range(3000):\n' +
              '    v = rnd.randrange(10)\n' +
              '    if rnd.random() < 0.55:\n' +
              '        ok = ok and rc.insert(v) == (model[v] == 0)\n' +
              '        model[v] += 1\n' +
              '    else:\n' +
              '        had = model[v] > 0\n' +
              '        ok = ok and rc.remove(v) == had\n' +
              '        if had:\n' +
              '            model[v] -= 1\n' +
              '    if sum(model.values()) and _ % 50 == 0:\n' +
              '        ok = ok and model[rc.get_random()] > 0\n' +
              'for v, c in list(model.items()):\n' +
              '    for _ in range(c):\n' +
              '        ok = ok and rc.remove(v)\n' +
              '    ok = ok and not rc.remove(v)\n' +
              'result = ok'
          ],
          true
        ],
        [
          [
            'import random\n' +
              'rnd = random.Random(2)\n' +
              'rc = RandomizedCollection()\n' +
              'from collections import Counter\n' +
              'model = Counter()\n' +
              'ok = True\n' +
              'for _ in range(20000):\n' +
              '    v = rnd.randrange(100)\n' +
              '    if rnd.random() < 0.55:\n' +
              '        ok = ok and rc.insert(v) == (model[v] == 0)\n' +
              '        model[v] += 1\n' +
              '    else:\n' +
              '        had = model[v] > 0\n' +
              '        ok = ok and rc.remove(v) == had\n' +
              '        if had:\n' +
              '            model[v] -= 1\n' +
              '    if sum(model.values()) and _ % 50 == 0:\n' +
              '        ok = ok and model[rc.get_random()] > 0\n' +
              'for v, c in list(model.items()):\n' +
              '    for _ in range(c):\n' +
              '        ok = ok and rc.remove(v)\n' +
              '    ok = ok and not rc.remove(v)\n' +
              'result = ok'
          ],
          true
        ],
        [
          [
            'import random\n' +
              'rnd = random.Random(3)\n' +
              'rc = RandomizedCollection()\n' +
              'from collections import Counter\n' +
              'model = Counter()\n' +
              'ok = True\n' +
              'for _ in range(200000):\n' +
              '    v = rnd.randrange(1000)\n' +
              '    if rnd.random() < 0.55:\n' +
              '        ok = ok and rc.insert(v) == (model[v] == 0)\n' +
              '        model[v] += 1\n' +
              '    else:\n' +
              '        had = model[v] > 0\n' +
              '        ok = ok and rc.remove(v) == had\n' +
              '        if had:\n' +
              '            model[v] -= 1\n' +
              '    if sum(model.values()) and _ % 50 == 0:\n' +
              '        ok = ok and model[rc.get_random()] > 0\n' +
              'for v, c in list(model.items()):\n' +
              '    for _ in range(c):\n' +
              '        ok = ok and rc.remove(v)\n' +
              '    ok = ok and not rc.remove(v)\n' +
              'result = ok'
          ],
          true
        ],
        [
          [
            'import random\n' +
              'rnd = random.Random(4)\n' +
              'rc = RandomizedCollection()\n' +
              'from collections import Counter\n' +
              'model = Counter()\n' +
              'ok = True\n' +
              'for _ in range(5000):\n' +
              '    v = rnd.randrange(2)\n' +
              '    if rnd.random() < 0.55:\n' +
              '        ok = ok and rc.insert(v) == (model[v] == 0)\n' +
              '        model[v] += 1\n' +
              '    else:\n' +
              '        had = model[v] > 0\n' +
              '        ok = ok and rc.remove(v) == had\n' +
              '        if had:\n' +
              '            model[v] -= 1\n' +
              '    if sum(model.values()) and _ % 50 == 0:\n' +
              '        ok = ok and model[rc.get_random()] > 0\n' +
              'for v, c in list(model.items()):\n' +
              '    for _ in range(c):\n' +
              '        ok = ok and rc.remove(v)\n' +
              '    ok = ok and not rc.remove(v)\n' +
              'result = ok'
          ],
          true
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Combine a list (random access) with a dict of index sets (O(1) location of any occurrence). Removal swaps the target with the last element and pops — no shifting.</p>`,
      code: `
import random
from collections import defaultdict

class RandomizedCollection:
    def __init__(self):
        self.vals = []                     # all occurrences, any order
        self.pos = defaultdict(set)        # value -> set of indices in vals

    def insert(self, val):
        fresh = not self.pos[val]
        self.pos[val].add(len(self.vals))
        self.vals.append(val)              # O(1) amortized
        return fresh

    def remove(self, val):
        if not self.pos.get(val):
            return False
        i = self.pos[val].pop()            # any index holding val
        last = self.vals[-1]
        self.vals[i] = last                # move last element into the hole
        self.pos[last].add(i)
        self.pos[last].discard(len(self.vals) - 1)
        self.vals.pop()                    # O(1): remove from the end
        if not self.pos[val]:
            del self.pos[val]
        return True

    def get_random(self):
        return random.choice(self.vals)    # uniform over occurrences

random.seed(7)
rc = RandomizedCollection()
print(rc.insert(1), rc.insert(1), rc.insert(2))
counts = {1: 0, 2: 0}
for _ in range(3000):
    counts[rc.get_random()] += 1
print(counts)                              # about 2000 vs 1000
print(rc.remove(1), sorted(rc.vals), dict(rc.pos))`,
      dry: { head: ['op', 'vals', 'pos'], rows: [['insert 1, 1, 2', '[1, 1, 2]', '{1:{0,1}, 2:{2}}'], ['remove(1): i = 0, last = 2', '[2, 1, 2] → pop', '{1:{1}, 2:{0}}'], ['result', '<span class="c-g">[2, 1]</span>', '{1:{1}, 2:{0}}']] },
      complexity: `<p>All operations O(1) average (amortized for list append). Space O(n).</p>`,
      followUps: ['Without duplicates (LeetCode 380) — simplify to dict[val → index]', 'Weighted random by a custom weight per value']
    }
  });

  /* ================= QUIZ ================= */
  quiz.push(
    { q: 'What does a CPython <code>list</code> physically store in its slots?', options: ['The objects themselves, packed', 'Pointers (references) to objects stored elsewhere', 'Hash values of the objects', 'Linked-list nodes'], answer: 1, explain: 'A list is a contiguous array of PyObject* pointers. That is why it can hold mixed types and why lst[i] is O(1): address = base + 8·i.' },
    { q: 'Why is <code>list.append</code> O(1) <i>amortized</i> rather than O(1) worst case?', options: ['Because of hashing', 'Occasionally the array is full and must be re-allocated and copied (O(n)), but geometric growth makes the average constant', 'Because Python is interpreted', 'Because of garbage collection'], answer: 1, explain: 'Over-allocation by a fixed fraction (~12.5% + constant in CPython) means the total copying across n appends is O(n), so the per-append average is O(1).' },
    { q: 'Predict: <code>d = {1: "a"}; d[1.0] = "b"; d[True] = "c"; print(d)</code>', options: ["{1: 'a', 1.0: 'b', True: 'c'}", "{1: 'c'}", "{True: 'c'}", "{1.0: 'b'}"], answer: 1, explain: '1 == 1.0 == True and their hashes are equal, so they are the same key. The original key object (1) stays; only the value is replaced each time.' },
    { q: 'Since which Python version is dict insertion order a language guarantee?', options: ['2.7', '3.5', '3.6 (implementation detail only); guaranteed in 3.7', '3.10'], answer: 2, explain: 'The compact dict landed in CPython 3.6 and preserved order as a side effect; Python 3.7 made it part of the language spec.' },
    { q: 'Predict: <code>s = set(); [s.add(x) for x in (8, 1)]; print(s)</code>', options: ['{1, 8}', '{8, 1}', 'It is random every run', 'TypeError'], answer: 1, explain: 'hash(8) & 7 = 0 and hash(1) & 7 = 1, so 8 sits in slot 0 and 1 in slot 1. Sets print in slot order. (Also: using a comprehension for side effects is bad style!)' },
    { q: 'Predict: <code>t = ([1],); t[0] += [2]</code> — what happens?', options: ['t becomes ([1, 2],) silently', 'TypeError, and t is unchanged', 'TypeError, but t[0] is now [1, 2]', 'SyntaxError'], answer: 2, explain: 'list.__iadd__ mutates the list in place first, then Python tries to store the result back into the tuple slot, which raises TypeError. Both effects happen.' },
    { q: 'Predict: <code>g = (x * x for x in range(3)); print(sum(g), sum(g))</code>', options: ['5 5', '5 0', '0 0', 'TypeError'], answer: 1, explain: '0 + 1 + 4 = 5. The generator is exhausted after the first sum, so the second sum adds nothing and returns 0.' },
    { q: 'Order of clauses: <code>[(a, b) for a in "xy" for b in "12"]</code> gives…', options: ["[('x','1'), ('x','2'), ('y','1'), ('y','2')]", "[('x','1'), ('y','1'), ('x','2'), ('y','2')]", "[('x','y'), ('1','2')]", 'An error'], answer: 0, explain: 'The first for-clause is the outer loop. b cycles fastest.' },
    { q: 'After <code>a = [[1], [2]]; b = a[:]; b[0].append(9); b[1] = [7]</code>, what is a?', options: ['[[1], [2]]', '[[1, 9], [2]]', '[[1, 9], [7]]', '[[1], [7]]'], answer: 1, explain: 'a[:] is a shallow copy: b[0] is a[0], so append shows in a. b[1] = [7] rebinds a slot of b only.' },
    { q: 'What does <code>copy.deepcopy</code> use to handle cycles and shared references?', options: ['A recursion limit', 'A memo dict mapping id(original) → copy', 'Pickle files on disk', 'Weak references'], answer: 1, explain: 'Before copying an object it checks the memo; if present the existing copy is reused. Registering a container before recursing makes cycles terminate and keeps sharing intact.' },
    { q: 'Which operation is O(n) even though it looks like a simple lookup?', options: ['<code>key in d</code>', '<code>x in s</code> for a set', '<code>value in d.values()</code>', '<code>len(lst)</code>'], answer: 2, explain: 'Values are not hashed into slots; checking membership in a values view scans all of them. Keys and set members are hashed → O(1) average.' },
    { q: 'Best data structure for a BFS queue in Python?', options: ['list with pop(0)', 'collections.deque with popleft()', 'set', 'heapq'], answer: 1, explain: 'deque supports O(1) append and popleft. list.pop(0) shifts every remaining pointer → O(n) per pop, O(V²) for a BFS.' },
    { q: 'Why does a dict deletion leave a DUMMY marker instead of EMPTY in the index table?', options: ['To save memory', 'So probe chains stay intact: lookups for keys that collided past that slot must keep searching', 'To preserve sort order', 'To make deletion O(n)'], answer: 1, explain: 'Lookup stops at EMPTY. If a deleted slot became EMPTY, a key inserted later in the same probe chain would become unreachable.' }
  );

  /* ================= INTERVIEW ================= */
  interview.push(
    { q: 'How is a Python list implemented, and what are the costs of its main operations?', level: 'B', a: `<p>In CPython a list is a <b>dynamic array of pointers</b>: a header with the length and capacity plus a separately allocated, contiguous block of <code>PyObject*</code>. Indexing is O(1) arithmetic. <code>append</code> is amortized O(1) thanks to over-allocation (~1.125× + small constant, rounded to a multiple of 4). <code>pop()</code> at the end is O(1). <code>insert(i)</code>, <code>pop(i)</code>, <code>remove</code>, <code>in</code>, <code>index</code> are O(n) because they shift or scan. Slicing copies k pointers (O(k)); <code>sort</code> is Timsort, O(n log n).</p>`, followUps: ['Why is pop(0) slow and what do you use instead?', 'Why does a list of ints use much more memory than array.array?'] },
    { q: 'Explain amortized analysis using list.append as the example.', level: 'I', a: `<p>Amortized cost is the average cost per operation over a worst-case <b>sequence</b>. Most appends write into a spare slot (O(1)); occasionally the array is full and all n pointers are copied to a bigger block (O(n)). Because the capacity grows <b>geometrically</b> by factor g, the copies form a geometric series bounded by n/(g − 1) — about 8n for CPython's 1.125 factor and n for doubling. Dividing by n appends gives O(1) per append. With additive growth (+1 or +k), copies sum to Θ(n²) and append would be O(n) amortized.</p>`, followUps: ['What is the trade-off between growth factor and wasted memory?', 'How do you avoid thrashing when also shrinking?'] },
    { q: 'How does a Python dict work internally?', level: 'I', a: `<p>Since 3.6 it is a <b>compact hash table</b>: a sparse <b>indices</b> array (power-of-two size, small ints) and a dense <b>entries</b> array of (hash, key, value) in insertion order. Lookup: compute <code>hash(key)</code>, start at <code>hash &amp; mask</code>, and on collision probe with <code>i = (5i + 1 + perturb) &amp; mask</code>, <code>perturb &gt;&gt;= 5</code> (open addressing). An index slot is EMPTY, DUMMY (deleted) or an entry number. The table is kept ≤ 2/3 full; when usable entries run out it is rebuilt at ~3 × used rounded up to a power of two. Iteration walks the entries array, which is why order is preserved.</p>`, followUps: ['Why are deleted slots marked DUMMY?', 'Why did the compact layout save memory?'] },
    { q: 'What makes an object hashable, and what is the contract between __eq__ and __hash__?', level: 'I', a: `<p>An object is hashable if it has a <code>__hash__</code> that returns an int which <b>never changes during its lifetime</b>, and it can be compared with <code>__eq__</code>. The contract: <b>a == b must imply hash(a) == hash(b)</b> (the reverse need not hold — that is a collision). Mutable built-ins (list, dict, set) set <code>__hash__ = None</code>. If you define <code>__eq__</code> in a class without <code>__hash__</code>, Python makes instances unhashable. A <code>@dataclass</code> is hashable only with <code>frozen=True</code> (or <code>unsafe_hash=True</code>). Hashing on mutable fields causes "lost" keys after mutation.</p>`, followUps: ['Why are 1, 1.0 and True the same dict key?', 'What happens if two unequal objects always hash the same?'] },
    { q: 'Why is set iteration order unpredictable, and why do small int sets often look sorted?', level: 'I', a: `<p>A set is a hash table with no insertion log; iteration walks the slots from 0 upward. Slot position depends on <code>hash(x) &amp; mask</code> plus collision probing and resizes. For small non-negative ints, <code>hash(n) == n</code>, so in a big-enough table each int lands at its own index and iteration <i>looks</i> sorted — but collisions (e.g. 8 and 1 in an 8-slot table, giving <code>{8, 1}</code>) break that. String hashes are randomized per process (PEP 456), so string-set order changes between runs. Never rely on it; use <code>sorted()</code> or <code>dict.fromkeys</code>.</p>`, followUps: ['How would you de-duplicate while keeping order?', 'What is PYTHONHASHSEED for?'] },
    { q: 'Tuple vs list: when do you choose each, and is a tuple truly immutable?', level: 'B', a: `<p>Use a <b>list</b> for a variable-length collection of similar items you will modify; use a <b>tuple</b> for a fixed-size record (coordinates, return values), for dict keys and set members, and when you want to prevent accidental changes. Tuples are smaller (single allocation, no spare capacity), can be constant-folded by the compiler, and are hashable if their contents are. Immutability is <b>shallow</b>: the slots can't be rebound, but a mutable object inside (e.g. a list) can still change — and then the tuple is not hashable.</p>`, followUps: ['Explain why t[0] += [1] both raises and mutates', 'NamedTuple vs frozen dataclass?'] },
    { q: 'Shallow copy vs deep copy — explain with an example and name ways to make each.', level: 'B', a: `<p>A <b>shallow copy</b> creates a new outer container whose slots point to the <b>same</b> inner objects: <code>lst[:]</code>, <code>list(lst)</code>, <code>lst.copy()</code>, <code>copy.copy</code>, <code>dict(d)</code>, <code>{**d}</code>. A <b>deep copy</b> (<code>copy.deepcopy</code>) recursively copies every mutable object reachable, using a memo dict to preserve sharing and handle cycles. Example: <code>a = [[1], [2]]; b = a.copy(); b[0].append(9)</code> changes <code>a[0]</code> too; with deepcopy it does not. For flat lists of immutables, shallow is enough.</p>`, followUps: ['When is deepcopy a bad idea?', 'How would you copy a 2-D grid of ints cheaply?'] },
    { q: 'What is the [[0] * n] * m bug and how do you fix it?', level: 'B', a: `<p>List multiplication copies <b>references</b>. <code>[[0] * n] * m</code> builds one inner list and puts m pointers to it in the outer list, so <code>grid[0][0] = 1</code> appears in every row. The inner <code>[0] * n</code> is safe because 0 is immutable. Fix: create a new row per iteration with a comprehension, <code>[[0] * n for _ in range(m)]</code>. Verify with <code>grid[0] is grid[1]</code> → False. Same trap: <code>[[]] * k</code>, <code>[set()] * k</code>, <code>dict.fromkeys(keys, [])</code>.</p>`, followUps: ['Why does dict.fromkeys(keys, []) have the same problem?', 'How would you detect this bug in code review?'] },
    { q: 'List comprehension vs generator expression — differences in evaluation, memory and use cases.', level: 'I', a: `<p>A list comprehension is <b>eager</b>: it runs immediately and stores all results (O(n) memory), can be indexed and iterated many times. A generator expression is <b>lazy</b>: it returns an iterator that computes one item per <code>next()</code> call, uses O(1) memory, can be consumed <b>only once</b>, and supports early termination (<code>any</code>, <code>next</code>, <code>islice</code>). Only the first iterable of a generator expression is evaluated at creation. Use generators for streaming/large data or reductions (<code>sum(x*x for x in data)</code>); use lists when you need the results more than once, random access or <code>len</code>.</p>`, followUps: ['What bug appears when a function returns a generator that callers iterate twice?', 'What did PEP 709 change for comprehensions?'] },
    { q: 'Explain the late-binding closure gotcha in comprehensions and two ways to fix it.', level: 'A', a: `<p><code>funcs = [lambda: i for i in range(3)]</code> creates three closures over the <b>same variable</b> <code>i</code>, not over its value at creation time. When called after the comprehension ends, all read the final value, giving <code>[2, 2, 2]</code>. Fixes: capture the current value as a default argument, <code>lambda i=i: i</code>, or use <code>functools.partial(f, i)</code>, or create the closure inside a factory function <code>make(i)</code>. The same issue arises with callbacks created in loops (GUI handlers, threads).</p>`, followUps: ['Why does the default-argument trick work?', 'Does the walrus operator in a comprehension leak its variable?'] },
    { q: 'Give the time complexity of these and why: x in list, x in set, dict.get, list.insert(0, x), deque.appendleft, heappush, sorted, "".join.', level: 'I', a: `<p><code>x in list</code> O(n) — linear scan. <code>x in set</code> and <code>dict.get</code> O(1) average (hash → slot), O(n) worst with collisions. <code>list.insert(0, x)</code> O(n) — shifts all pointers. <code>deque.appendleft</code> O(1) — block-linked structure. <code>heapq.heappush</code> O(log n) — sift-up in a binary heap. <code>sorted</code> O(n log n) worst (Timsort), O(n) on already-sorted runs. <code>"".join(parts)</code> O(total length) — sizes once, copies each piece once (unlike repeated <code>+=</code>, which can be quadratic).</p>`, followUps: ['When is O(n log n) in C faster than O(n) in a Python loop?', 'What is the cost of slicing in recursion?'] },
    { q: 'What is hash flooding and how does Python defend against it?', level: 'A', a: `<p>If an attacker can choose keys (e.g. JSON field names or query parameters) that all collide in a hash table, every insert/lookup degrades to O(n), and building a dict of n keys takes O(n²) — a cheap denial-of-service. Python randomizes the hash of <code>str</code> and <code>bytes</code> with a secret per-process key using SipHash (SipHash-1-3 by default since 3.11; PEP 456), so collisions can't be precomputed. <code>PYTHONHASHSEED</code> can fix the seed for reproducibility. Ints are not randomized, so services should also cap input sizes and nesting.</p>`, followUps: ['Why are int hashes not randomized?', 'How does this affect set ordering in tests?'] },
    { q: 'How does copy.deepcopy work and how would you customize it for your class?', level: 'A', a: `<p><code>deepcopy(x, memo)</code> checks <code>memo[id(x)]</code> first; atoms (int, str, None, functions, classes) are returned unchanged; built-in containers use dedicated copiers; otherwise it looks for <code>__deepcopy__</code>, then falls back to the pickle protocol (<code>__reduce_ex__</code>) to rebuild the object and recursively deep-copy its state. A tuple is only rebuilt if an element changed. To customize, define <code>__deepcopy__(self, memo)</code>: create the new instance, <b>store it in memo before recursing</b> (for cycles), and deep-copy only the fields that need it — e.g. share an immutable config or a connection pool instead of copying it.</p>`, followUps: ['Why can\'t you deepcopy a lock or open file meaningfully?', 'What does copy.replace (3.13) do?'] },
    { q: 'Design question: you must check 10 million incoming user IDs against a blocklist of 50 million IDs in Python. What structures and costs?', level: 'E', a: `<p>A Python <code>set</code> of 50M ints gives O(1) average lookups but costs several GB (~28 bytes per int object plus ~16+ bytes per slot at ≤ 60% load). Options: (1) a sorted <code>array.array('q')</code> or NumPy array (~400 MB) with <code>bisect</code>/<code>np.searchsorted</code> → O(log n) per query, vectorized for batches; (2) a <b>Bloom filter</b> (~60 MB at 1% false positives) as a fast negative check, confirmed against an exact store; (3) push the join into a database or a columnar engine. Batch queries, avoid per-item Python overhead, and measure memory with real data — the asymptotics are equal-ish, constant factors decide.</p>`, followUps: ['How many bits per element does a 1% Bloom filter need?', 'What if the blocklist updates every minute?'] }
  );

  registerModule({
    id: 'py05',
    title: 'Data Structure Internals & Comprehensions',
    intro: `<p>You already <i>use</i> lists, dicts, sets and tuples. This module opens the hood. You will see a <code>list</code> as a growing row of pointer slots, a <code>dict</code> as an indices table plus an insertion-ordered log, a <code>set</code> as a keys-only hash table, and a <code>tuple</code> as a sealed record. Then you will learn comprehensions and generator expressions properly — eager vs lazy, scope, gotchas — and the three levels of copying (alias, shallow, deep) that cause so many real bugs.</p>
<p>Why it matters: interviewers love "<i>what is the complexity of this line?</i>", "<i>how does a dict work?</i>" and "<i>why did changing one row change every row?</i>". Every topic has a step-by-step visualizer built on CPython's real algorithms (growth formula, probe sequence, resize rules), runnable "predict the output" examples, and guided problems. It ends with a Big-O price list for every built-in you use daily.</p>`,
    goals: [
      'Explain how CPython\'s list grows (over-allocation, amortized O(1) append) and spot hidden O(n) operations like <code>insert(0)</code>, <code>pop(0)</code>, <code>remove</code> and <code>in</code>',
      'Sketch a dict\'s indices + entries tables, trace hashing, collision probing, DUMMY deletion and resizing, and explain why insertion order is preserved',
      'Choose between list, tuple, set, frozenset, dict and deque from the wording of a problem, including hashability requirements for keys',
      'Write and read list/dict/set comprehensions and generator expressions fluently, and predict laziness, scope and late-binding behaviour',
      'Predict exactly which objects are shared after assignment, shallow copy and deep copy, and fix aliasing bugs such as <code>[[0] * n] * m</code>',
      'Price any Python solution line by line using the Big-O table of built-in operations'
    ],
    prereqs: `Python 2 (Control Flow, Functions &amp; Core Collections) and Python 4 (OOP Basics) — you should be comfortable creating lists/dicts/sets, writing loops and functions, and defining a simple class. Basic Big-O notation helps but is reviewed here.`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
