(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- small shared helpers for the visualizers ---------- */
  function m09nums(s, what) {
    var t = String(s === undefined || s === null ? '' : s).trim();
    if (!t) throw new Error('Please type some numbers for ' + what + ', separated by spaces.');
    var a = t.split(/[\s,]+/).map(Number);
    if (a.some(function (x) { return isNaN(x) || !isFinite(x) || Math.floor(x) !== x; })) throw new Error('Only whole numbers please for ' + what + ' (e.g. 1 3 5 7).');
    return a;
  }
  function m09split(input, n, example) {
    var p = String(input === undefined || input === null ? '' : input).split('|');
    if (p.length !== n) throw new Error('Expected format: ' + example);
    return p;
  }
  function m09ptr(o, len) {
    var r = {};
    Object.keys(o).forEach(function (name) {
      var i = o[name];
      if (i === null || i === undefined || i < 0 || i >= len) return;
      if (r[i] === undefined) r[i] = name;
      else if (Array.isArray(r[i])) r[i].push(name);
      else r[i] = [r[i], name];
    });
    return r;
  }
  function m09shade(len, lo, hi) {
    var h = {};
    for (var i = 0; i < len; i++) if (i < lo || i > hi) h[i] = 'done';
    return h;
  }
  function m09sorted(a) {
    for (var i = 1; i < a.length; i++) if (a[i] < a[i - 1]) return false;
    return true;
  }

  /* ================= TOPIC 1: Classic Binary Search ================= */
  topics.push({
    title: 'Classic Binary Search: Halving the Dictionary',
    analogy: `<p>You want the word <b>"mango"</b> in a thick paper dictionary. You don't read page 1, page 2, page 3... You open it <b>roughly in the middle</b> and see words starting with <b>"lion"</b>. Since the words are in alphabetical order, "mango" must be <b>after</b> this page, so you <b>ignore the whole left half</b> without reading it. Open the middle of what is left, look, throw away half again. A 1,000-page dictionary needs only about <b>10 flips</b>.</p>
      <p>That is binary search: <b>look at the middle, decide which half cannot contain the answer, throw that half away.</b></p>`,
    explain: `<p><b>When can you use it?</b> When the data is <b>sorted</b> (or, more generally, when a yes/no question flips only once, like <code>no no no yes yes</code>). Sorted order is what lets one look at the middle tell you about a whole half.</p>
      <h4>Why it is so fast: halving</h4>
      ${H.table(['Items left', 'After 1 look', 'After 2', 'After 3', '...', 'Looks needed'], [
        ['16', '8', '4', '2', '1', '<b>4–5</b>'],
        ['1,000', '500', '250', '125', '... 1', '<b>~10</b>'],
        ['1,000,000', '500,000', '250,000', '125,000', '... 1', '<b>~20</b>'],
        ['10<sup>9</sup>', '5·10<sup>8</sup>', '2.5·10<sup>8</sup>', '...', '... 1', '<b>~30</b>']
      ])}
      <p>Number of looks = how many times you can halve N before reaching 1 = <b>log₂ N</b>. So binary search is <b>O(log N)</b>, while checking every item one by one is O(N).</p>
      <h4>Three pointers: lo, mid, hi</h4>
      ${H.arr([1, 3, 5, 7, 9, 11, 13], { label: 'a', ptr: { 0: 'lo', 3: 'mid', 6: 'hi' }, hl: { 3: 'y' } })}
      <p><code>lo</code> and <code>hi</code> are the edges of the part we still believe in (the <span class="c-b">search window</span>). <code>mid</code> is the middle we look at. Looking for 11: ${H.c('y', 'a[3] = 7')} is too small, so 7 and everything left of it is useless:</p>
      ${H.arr([1, 3, 5, 7, 9, 11, 13], { label: 'a', ptr: { 4: 'lo', 5: 'mid', 6: 'hi' }, hl: { 0: 'm', 1: 'm', 2: 'm', 3: 'm', 5: 'g' } })}
      <h4>The overflow trap: mid = lo + (hi - lo) / 2</h4>
      <p>The "obvious" <code>(lo + hi) / 2</code> can break. A Java <code>int</code> holds at most <b>2,147,483,647</b>. If <code>lo = 2,000,000,000</code> and <code>hi = 2,100,000,000</code>, then <code>lo + hi = 4,100,000,000</code> does not fit and wraps around to a ${H.c('r', 'negative number')} → crash or wrong index.</p>
      ${H.table(['Formula', 'Biggest number it builds', 'Safe?'], [
        ['<code>(lo + hi) / 2</code>', 'lo + hi (can be ~4·10<sup>9</sup>)', H.c('r', 'NO – overflow')],
        ['<code>lo + (hi - lo) / 2</code>', 'hi - lo, then add to lo (never bigger than hi)', H.c('g', 'YES')]
      ])}
      <p>Both give the same middle; the second simply never builds a too-big number. (In Java <code>(lo + hi) &gt;&gt;&gt; 1</code> also works, but <code>lo + (hi - lo) / 2</code> is the one to remember.)</p>
      <h4>Loop invariant = the promise you never break</h4>
      <p>An <b>invariant</b> is a sentence that is true before every loop round. For classic search it is: <i>"If the target exists, it is somewhere inside <code>[lo, hi]</code>."</i> Every move must keep that promise:</p>
      <ul>
        <li><code>a[mid] &lt; target</code> → target is to the right of mid → <code>lo = mid + 1</code> (mid itself is not it, so skip it).</li>
        <li><code>a[mid] &gt; target</code> → target is left of mid → <code>hi = mid - 1</code>.</li>
        <li>Equal → found.</li>
      </ul>
      <p>When the window becomes empty (<code>lo &gt; hi</code>), the promise says: the target is nowhere → return -1.</p>
      <h4>Two templates: lo ≤ hi vs lo &lt; hi</h4>
      ${H.table(['', 'Template A: <code>while (lo ≤ hi)</code>', 'Template B: <code>while (lo &lt; hi)</code>'], [
        ['Window meaning', '[lo, hi] both included, may become empty', '[lo, hi] always holds at least 1 candidate'],
        ['Start', '<code>lo = 0, hi = n - 1</code>', '<code>lo = 0, hi = n - 1</code> (or <code>n</code> if "not found" is possible)'],
        ['Moves', '<code>lo = mid + 1</code> / <code>hi = mid - 1</code>', '<code>lo = mid + 1</code> / <code>hi = mid</code> (keep mid, it may be the answer)'],
        ['Ends when', 'lo = hi + 1 (window empty)', 'lo == hi (one candidate left = the answer)'],
        ['Best for', 'find an exact value, or keep an <code>ans</code> variable', '"first index where condition is true", peak, minimum in rotated array']
      ])}
      <p>${H.c('r', 'Infinite-loop trap')}: in Template B, if you ever write <code>lo = mid</code>, use the <b>upper</b> middle <code>mid = lo + (hi - lo + 1) / 2</code>. Otherwise with lo = 3, hi = 4 you get mid = 3, set lo = 3 again, and the loop never ends.</p>`,
    clues: [
      'The words <b>"sorted array"</b> / "non-decreasing order" + "find / search / position" → binary search.',
      '"You must write an algorithm with <b>O(log n)</b> runtime complexity" → the problem is begging for binary search.',
      '<code>N ≤ 10<sup>5</sup></code> with up to 10<sup>5</sup> queries → O(N) per query = 10<sup>10</sup> (too slow), O(log N) per query = ~2·10<sup>6</sup> (fine).',
      'A yes/no question that is <b>monotonic</b>: once it becomes "yes" it stays "yes" (or the reverse) → binary search on that question.',
      'Values or indices up to <b>10<sup>9</sup></b> → remember <code>mid = lo + (hi - lo) / 2</code> and use <code>long</code> when multiplying.'
    ],
    code: [`
      // Template A: closed window [lo, hi]. Use for "find exact value".
      int binarySearch(int[] a, int target) {
          int lo = 0, hi = a.length - 1;          // window = whole array
          while (lo <= hi) {                       // window not empty
              int mid = lo + (hi - lo) / 2;        // overflow-safe middle
              if (a[mid] == target) return mid;    // found it
              if (a[mid] < target) lo = mid + 1;   // target is right of mid
              else hi = mid - 1;                   // target is left of mid
          }
          return -1;                               // window empty: not present
      }`, `
      // Template B: shrink until one candidate is left.
      // Finds the FIRST index whose value is >= target (n if none).
      int firstAtLeast(int[] a, int target) {
          int lo = 0, hi = a.length;               // hi = n means "none found"
          while (lo < hi) {                        // more than one candidate
              int mid = lo + (hi - lo) / 2;        // lower middle (never equals hi)
              if (a[mid] >= target) hi = mid;      // mid could be the answer: keep it
              else lo = mid + 1;                   // mid is too small: drop it
          }
          return lo;                               // lo == hi: the single survivor
      }`],
    codeTitle: ['Template A: while (lo <= hi)', 'Template B: while (lo < hi)'],
    viz: {
      title: 'Classic binary search: lo / mid / hi',
      input: '2 5 8 12 16 23 38 56 72 91 | 23',
      inputLabel: 'sorted array | target',
      gen: function (input) {
        var p = m09split(input, 2, 'sorted numbers | target   e.g. 2 5 8 12 | 8');
        var a = m09nums(p[0], 'the array'), t = Number(p[1].trim());
        if (!p[1].trim() || isNaN(t)) throw new Error('Put one target number after the | sign.');
        if (a.length > 16) throw new Error('Please use at most 16 numbers so the picture fits.');
        if (!m09sorted(a)) throw new Error('Binary search needs a SORTED array. Please sort your numbers first.');
        var n = a.length, lo = 0, hi = n - 1, frames = [], step = 0;
        frames.push({ narr: 'We look for <b>' + t + '</b>. The window starts as the whole array: lo = 0, hi = ' + (n - 1) + '. Promise (invariant): if ' + t + ' exists, it is inside [lo, hi].',
          parts: [{ type: 'array', label: 'a', values: a.slice(), ptr: m09ptr({ lo: lo, hi: hi }, n), range: [lo, hi] },
            { type: 'vars', vals: { target: t, lo: lo, hi: hi, steps: 0 } }] });
        while (lo <= hi) {
          var mid = lo + Math.floor((hi - lo) / 2);
          step++;
          var hl = m09shade(n, lo, hi); hl[mid] = 'cur';
          frames.push({ narr: 'Step ' + step + ': mid = lo + (hi - lo) / 2 = ' + lo + ' + (' + hi + ' - ' + lo + ') / 2 = <b>' + mid + '</b>. Peek at a[' + mid + '] = <b>' + a[mid] + '</b>.',
            parts: [{ type: 'array', label: 'a', values: a.slice(), hl: hl, ptr: m09ptr({ lo: lo, mid: mid, hi: hi }, n), range: [lo, hi] },
              { type: 'vars', vals: { target: t, lo: lo, mid: mid, hi: hi, 'a[mid]': a[mid], steps: step }, hl: { 'a[mid]': 'cur' } }] });
          if (a[mid] === t) {
            var hf = m09shade(n, lo, hi); hf[mid] = 'sel';
            frames.push({ narr: '<span class="c-g">a[' + mid + '] equals ' + t + ' → found at index ' + mid + '</span> after only ' + step + ' look(s), out of ' + n + ' items.',
              parts: [{ type: 'array', label: 'a', values: a.slice(), hl: hf, ptr: m09ptr({ found: mid }, n) },
                { type: 'vars', vals: { answer: mid, steps: step }, hl: { answer: 'sel' } }] });
            return frames;
          }
          var why;
          if (a[mid] < t) { why = a[mid] + ' &lt; ' + t + ', so the target must be to the RIGHT. Everything from lo to mid is too small → throw it away: lo = mid + 1 = ' + (mid + 1) + '.'; lo = mid + 1; }
          else { why = a[mid] + ' &gt; ' + t + ', so the target must be to the LEFT. Everything from mid to hi is too big → throw it away: hi = mid - 1 = ' + (mid - 1) + '.'; hi = mid - 1; }
          frames.push({ narr: why + (lo <= hi ? ' The window shrank to [' + lo + ', ' + hi + '].' : ' Now lo &gt; hi: the window is empty.'),
            parts: [{ type: 'array', label: 'a', values: a.slice(), hl: m09shade(n, lo, hi), ptr: m09ptr({ lo: lo, hi: hi }, n), range: lo <= hi ? [lo, hi] : undefined },
              { type: 'vars', vals: { target: t, lo: lo, hi: hi, steps: step } }] });
        }
        frames.push({ narr: '<span class="c-r">Window is empty (lo = ' + lo + ' &gt; hi = ' + hi + ').</span> By our promise, ' + t + ' is not in the array → return -1. Bonus: lo = ' + lo + ' is exactly where ' + t + ' would be inserted to keep the array sorted.',
          parts: [{ type: 'array', label: 'a', values: a.slice(), hl: m09shade(n, 1, 0) },
            { type: 'vars', vals: { answer: -1, 'insert position (lo)': lo, steps: step }, hl: { answer: 'bad' } }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Target sitting at the very left edge',
        html: `<p>Find <b>2</b> in ${H.arr([2, 5, 8, 12, 16], { label: 'a', hl: { 0: 'g' } })}</p>
          ${H.table(['round', 'lo', 'hi', 'mid', 'a[mid]', 'decision'], [
            ['1', '0', '4', '2', '8', '8 &gt; 2 → hi = 1 (indices 2..4 are now ' + H.c('m', 'discarded') + ')'],
            ['2', '0', '1', '0', '2', H.c('g', 'equal → return 0')]
          ])}
          <p>Only 2 looks. The edge cases (first index, last index) are exactly where off-by-one bugs hide, so always test them by hand.</p>`
      },
      {
        title: 'Watching (lo + hi) / 2 overflow for real',
        html: `<p>Suppose the window is <code>lo = 1,500,000,000</code>, <code>hi = 2,000,000,000</code> (think: binary searching over a huge range of IDs or answers).</p>
          ${H.table(['Formula', 'Math', 'What Java int gets'], [
            ['<code>(lo + hi) / 2</code>', '3,500,000,000 / 2', H.c('r', '(-794,967,296) / 2 = -397,483,648 → crash or wrong index')],
            ['<code>lo + (hi - lo) / 2</code>', '1.5·10<sup>9</sup> + 250,000,000', H.c('g', '1,750,000,000 ✔')],
            ['<code>(lo + hi) &gt;&gt;&gt; 1</code>', 'unsigned shift reads the wrapped bits correctly', H.c('g', '1,750,000,000 ✔')]
          ])}
          <p>3,500,000,000 is bigger than 2,147,483,647, so it wraps around by 2<sup>32</sup> = 4,294,967,296 and becomes negative.</p>`,
        code: `int lo = 1_500_000_000, hi = 2_000_000_000;
System.out.println((lo + hi) / 2);        // -397483648  (overflow!)
System.out.println(lo + (hi - lo) / 2);   // 1750000000  (safe)
System.out.println((lo + hi) >>> 1);      // 1750000000  (safe, unsigned shift)`
      },
      {
        title: 'The one-element bug: lo &lt; hi with Template A moves',
        html: `<p>Someone writes <code>while (lo &lt; hi)</code> but keeps the Template A moves (<code>lo = mid + 1</code>, <code>hi = mid - 1</code>) and returns -1 after the loop.</p>
          <p>Search 5 in ${H.arr([5], { label: 'a' })}: lo = 0, hi = 0 → the loop condition <code>0 &lt; 0</code> is false, the loop never runs, and the code returns ${H.c('r', '-1')} even though 5 is right there.</p>
          <p><b>Lesson:</b> pick ONE template and keep all its parts together: <code>lo ≤ hi</code> ⇔ <code>mid ± 1</code> ⇔ "window may become empty". Mixing parts of two templates is the #1 binary search bug.</p>`
      },
      {
        title: 'How many looks for a million items?',
        html: `${H.table(['n', '⌊log₂ n⌋ + 1 = worst-case looks', 'linear scan worst case'], [
            ['8', '4', '8'],
            ['1,000', '10', '1,000'],
            ['1,000,000', '20', '1,000,000'],
            ['10<sup>9</sup>', '30', '10<sup>9</sup> (about 1 second of work)'],
            ['10<sup>18</sup> (a range of longs)', '60', 'impossible']
          ])}
          <p>Doubling the data adds just <b>one</b> more look. That is why binary search is everywhere: database indexes, <code>git bisect</code>, autocomplete on a sorted word list.</p>`
      }
    ],
    deepDive: `<p><b>Proof of correctness (Template A).</b> Invariant: <i>if target is in the array, its index is in [lo, hi]</i>. Initially true (whole array). Each move discards only indices whose values are provably ≠ target (they are all &lt; or all &gt; target because the array is sorted). <b>Termination:</b> each round either returns or makes <code>hi − lo</code> strictly smaller (mid ± 1 always excludes mid), so the loop ends after at most ⌊log₂ n⌋ + 1 rounds. When it ends with lo &gt; hi, the invariant says target is nowhere.</p>
      <p><b>Half-open windows [lo, hi).</b> Many libraries (C++ <code>std::lower_bound</code>, Python <code>bisect</code>, Go <code>sort.Search</code>) use <code>hi = n</code> exclusive and <code>while (lo &lt; hi)</code>. It composes nicely: the empty range is <code>lo == hi</code> and the answer "n" means "not found / insert at end". Java's <code>Arrays.binarySearch</code> returns the index if found, else <code>-(insertionPoint) - 1</code> — always negative for "missing", and it still encodes where the value would go.</p>
      <p><b>The famous bug.</b> In 2006 Joshua Bloch reported that the JDK's own <code>Arrays.binarySearch</code> (and the version in <i>Programming Pearls</i>) used <code>(low + high) / 2</code> and broke for arrays with more than ~2<sup>30</sup> elements. It had shipped for about nine years. The fix in the JDK was <code>(low + high) &gt;&gt;&gt; 1</code>.</p>
      <p><b>Performance reality.</b> On modern CPUs the cost is cache misses and branch mispredictions, not comparisons. For tiny arrays (a few dozen ints) a linear scan can beat binary search. High-performance code uses <i>branchless</i> binary search (conditional moves) or an <i>Eytzinger</i> (BFS-order) layout so the next probes sit in the same cache lines. Also: <code>Collections.binarySearch</code> on a <code>LinkedList</code> still needs O(n) pointer walking — binary search needs <b>O(1) random access</b>.</p>
      <p><b>Where it hides in production:</b> B-tree pages binary search their keys, LSM-tree SSTables binary search sparse indexes, Kafka finds an offset via a binary search over its index file, and <code>git bisect</code> binary searches commits to find the one that introduced a bug.</p>`,
    aiEra: `<p><b>What AI changes:</b> any assistant writes a classic binary search in a second. The value you add is no longer typing it — it is <b>knowing which template fits</b>, spotting the off-by-one, and proving it terminates.</p>
      <p><b>Use AI as a partner:</b> ask <code>Write a randomized test that compares my binarySearch against a linear scan on 10,000 random sorted arrays, including empty and size-1 arrays</code>. Property-based testing catches the exact bugs (empty window, edges, duplicates) that eyeballing misses. You can also ask it to <i>explain</i> the invariant of a search you wrote, then check whether its explanation matches your code.</p>
      <p><b>Where AI goes wrong:</b> mixing templates (<code>while (lo &lt; hi)</code> with <code>hi = mid - 1</code>), forgetting <code>lo + (hi - lo) / 2</code> in Java/C++, returning <code>mid</code> after the loop, or silently assuming the input is sorted. It also often "fixes" a bug by adding <code>+1</code>s until a single test passes.</p>
      <p><b>What you must still own:</b> stating the invariant out loud in an interview, choosing closed vs half-open windows, and arguing that the window shrinks every round. Bonus modern use: <code>git bisect run ./test.sh</code> lets an agent binary search hundreds of commits automatically — the same halving idea, applied to history.</p>`,
    problems: [{
      title: 'Binary Search',
      level: 'Easy',
      tags: ['binary search', 'template A'],
      statement: `<p>Given an array <code>nums</code> sorted in ascending order (all values distinct) and an integer <code>target</code>, return the index of <code>target</code>, or <code>-1</code> if it is not there. Your algorithm must run in <b>O(log n)</b>.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>4</sup>, -10<sup>4</sup> &lt; nums[i], target &lt; 10<sup>4</sup>, nums sorted, all distinct`,
      example: `${H.arr([-1, 0, 3, 5, 9, 12], { label: 'nums', hl: { 4: 'g' } })}
        <p>target = 9 → Output: ${H.c('p', '4')} because ${H.c('g', 'nums[4] = 9')}.</p>
        <p>target = 2 → Output: ${H.c('r', '-1')}: 2 would sit between 0 and 3, but it is not in the array.</p>`,
      brute: {
        why: `<p>Walk from left to right and compare every element with the target. That is up to N comparisons → O(N). The waste: the array is <b>sorted</b>, and we ignore that gift. Once we see 3 &lt; 9 we already know 9 is not at any index to the left of 3, yet we keep scanning.</p>`,
        code: `
          int linearSearch(int[] nums, int target) {
              for (int i = 0; i < nums.length; i++) {
                  if (nums[i] == target) return i;   // found
              }
              return -1;                             // checked all N items
          }`
      },
      mcq: {
        q: `Searching for 9 in <code>[-1, 0, 3, 5, 9, 12]</code>: mid = 2 and <code>nums[2] = 3</code>. What should you do?`,
        options: [`Set <code>hi = mid - 1</code>`, `Set <code>lo = mid + 1</code>`, `Set <code>lo = mid</code>`, `Scan right from mid one by one`],
        answer: 1,
        explain: `3 &lt; 9, so 9 can only be to the right of index 2. Index 2 itself is definitely not the answer, so skip it: lo = mid + 1. (lo = mid would also keep a useless index and can loop forever.)`
      },
      hints: [
        `<p><b>Aha:</b> in a sorted array, one comparison with the middle tells you about the whole half. If <code>nums[mid] &lt; target</code>, every index ≤ mid is also too small.</p>`,
        `<p>No extra data structure — just three integers <code>lo</code>, <code>hi</code>, <code>mid</code>. lo moves right past mid, or hi moves left past mid, so the window always shrinks.</p>`,
        `<p>Traps: use <code>while (lo &lt;= hi)</code> (a 1-element window must still be checked); <code>mid = lo + (hi - lo) / 2</code>; move to <code>mid ± 1</code>, never to <code>mid</code>, or you may loop forever. Recipe: lo = 0, hi = n-1; while lo ≤ hi: mid; equal → return mid; smaller → lo = mid+1; bigger → hi = mid-1. Return -1.</p>`
      ],
      solution: {
        approach: `<p>Template A on the closed window [lo, hi]; stop on a match or when the window is empty.</p>`,
        code: `
          class Solution {
              public int search(int[] nums, int target) {
                  int lo = 0, hi = nums.length - 1;       // the window we still trust
                  while (lo <= hi) {                       // window still has at least 1 item
                      int mid = lo + (hi - lo) / 2;        // middle, written so it can't overflow
                      if (nums[mid] == target) {
                          return mid;                      // lucky: found it
                      } else if (nums[mid] < target) {
                          lo = mid + 1;                    // mid and everything left of it are too small
                      } else {
                          hi = mid - 1;                    // mid and everything right of it are too big
                      }
                  }
                  return -1;                               // window empty: target not present
              }

              public static void main(String[] args) {
                  Solution s = new Solution();
                  System.out.println(s.search(new int[]{-1, 0, 3, 5, 9, 12}, 9)); // 4
                  System.out.println(s.search(new int[]{-1, 0, 3, 5, 9, 12}, 2)); // -1
              }
          }`,
        dry: {
          head: ['target', 'lo', 'hi', 'mid', 'nums[mid]', 'action'],
          rows: [
            ['9', '0', '5', '2', '3', '3 &lt; 9 → lo = 3'],
            ['9', '3', '5', '4', '9', '<span class="c-g">equal → return 4</span>'],
            ['2', '0', '5', '2', '3', '3 &gt; 2 → hi = 1'],
            ['2', '0', '1', '0', '-1', '-1 &lt; 2 → lo = 1'],
            ['2', '1', '1', '1', '0', '0 &lt; 2 → lo = 2'],
            ['2', '2', '1', '–', '–', '<span class="c-r">lo &gt; hi → return -1</span>']
          ]
        },
        complexity: `<p><b>Time O(log N)</b>: every round throws away half of the window, so after about log₂(10<sup>4</sup>) ≈ 14 rounds nothing is left. <b>Space O(1)</b>: only three integers.</p>`
      }
    }]
  });

  /* ================= TOPIC 2: First & Last Occurrence ================= */
  topics.push({
    title: 'First and Last Occurrence (Lower Bound / Upper Bound)',
    analogy: `<p>A school register is sorted by surname and has <b>five students called "Patel"</b> in a row. The teacher opens the middle and lands on <i>a</i> Patel. Great — but she needs the <b>first</b> Patel (to start roll call). So she does <b>not stop</b>: she writes down "found a Patel here" and <b>keeps searching to the left</b>, in case an earlier Patel exists. To find the <b>last</b> Patel she does the same thing but keeps searching to the right.</p>`,
    explain: `<p>With duplicates, plain binary search returns <i>some</i> matching index, not a particular one. Two tiny changes fix that.</p>
      <h4>Idea 1: "found it, but keep going"</h4>
      ${H.arr([1, 2, 2, 2, 2, 3, 5], { label: 'a', hl: { 1: 'g', 2: 'b', 3: 'b', 4: 'p' } })}
      <p>Looking for 2: when <code>a[mid] == 2</code>, save <code>ans = mid</code>, then</p>
      <ul>
        <li>for the ${H.c('g', 'first')} 2 → continue on the left: <code>hi = mid - 1</code></li>
        <li>for the ${H.c('p', 'last')} 2 → continue on the right: <code>lo = mid + 1</code></li>
      </ul>
      <p>The saved <code>ans</code> is always a real match, and every later save is "more left" (or "more right"), so the final <code>ans</code> is the edge.</p>
      <h4>Idea 2: lower bound and upper bound (the yes/no view)</h4>
      <p>Ask a yes/no question at every index. The answers look like <code>no no ... no yes yes ... yes</code> because the array is sorted. Binary search finds where "yes" begins.</p>
      ${H.table(['index', '0', '1', '2', '3', '4', '5', '6'], [
        ['a[i]', '1', '2', '2', '2', '2', '3', '5'],
        ['a[i] ≥ 2 ?', 'no', H.c('g', '<b>YES</b>'), 'yes', 'yes', 'yes', 'yes', 'yes'],
        ['a[i] &gt; 2 ?', 'no', 'no', 'no', 'no', 'no', H.c('p', '<b>YES</b>'), 'yes']
      ])}
      <ul>
        <li><b>lower bound(x)</b> = first index with <code>a[i] ≥ x</code> = ${H.c('g', '1')}. If <code>a[lb] == x</code>, it is the first occurrence.</li>
        <li><b>upper bound(x)</b> = first index with <code>a[i] &gt; x</code> = ${H.c('p', '5')}. The last occurrence is <code>ub - 1 = 4</code>.</li>
        <li><b>Count of x</b> = <code>ub - lb</code> = 5 - 1 = <b>4</b> copies of 2 — in O(log N), without walking over them.</li>
      </ul>
      <p>If x is absent, lower bound still tells you where x <b>would be inserted</b> to keep the array sorted (this is "search insert position").</p>`,
    clues: [
      '"Find the <b>first</b> / <b>last</b> position of target" or "starting and ending position" in a sorted array.',
      '"<b>Count occurrences</b> of x in a sorted array" → upper bound - lower bound.',
      '"Smallest element <b>≥ x</b>" (ceiling) or "largest element <b>≤ x</b>" (floor) → lower bound / upper bound - 1.',
      'Sorted array <b>with duplicates</b> + O(log n) required → plain search is not enough; you need the "keep going" version.',
      '"Insert position" / "where would x go" → lower bound.'
    ],
    code: `
      // Lower bound: first index i with a[i] >= x (returns n if none).
      static int lowerBound(int[] a, int x) {
          int lo = 0, hi = a.length;          // answer lies in [0, n]
          while (lo < hi) {
              int mid = lo + (hi - lo) / 2;
              if (a[mid] >= x) hi = mid;      // mid is a "yes": answer is mid or to its left
              else lo = mid + 1;              // mid is a "no": answer is to its right
          }
          return lo;
      }

      // Upper bound: first index i with a[i] > x (returns n if none).
      static int upperBound(int[] a, int x) {
          int lo = 0, hi = a.length;
          while (lo < hi) {
              int mid = lo + (hi - lo) / 2;
              if (a[mid] > x) hi = mid;       // only the comparison changed: > instead of >=
              else lo = mid + 1;
          }
          return lo;
      }

      // How many times does x appear? Two O(log n) searches.
      static int countOf(int[] a, int x) {
          return upperBound(a, x) - lowerBound(a, x);
      }`,
    codeTitle: 'lowerBound / upperBound / count',
    viz: {
      title: 'First or last occurrence: keep searching after a hit',
      input: '1 2 2 2 2 2 3 5 7 | 2 | first',
      inputLabel: 'sorted array | target | first or last',
      gen: function (input) {
        var p = m09split(input, 3, 'sorted numbers | target | first   e.g. 1 2 2 2 3 | 2 | last');
        var a = m09nums(p[0], 'the array'), t = Number(p[1].trim()), mode = p[2].trim().toLowerCase();
        if (!p[1].trim() || isNaN(t)) throw new Error('Put one target number between the two | signs.');
        if (mode !== 'first' && mode !== 'last') throw new Error('The last part must be the word first or last.');
        if (a.length > 16) throw new Error('Please use at most 16 numbers so the picture fits.');
        if (!m09sorted(a)) throw new Error('The array must be sorted (non-decreasing).');
        var n = a.length, lo = 0, hi = n - 1, ans = -1, frames = [];
        frames.push({ narr: 'Goal: the <b>' + mode + '</b> index holding ' + t + '. Plan: whenever we find ' + t + ', remember it in <b>ans</b> and keep searching to the ' + (mode === 'first' ? 'LEFT (an earlier copy may exist)' : 'RIGHT (a later copy may exist)') + '.',
          parts: [{ type: 'array', label: 'a', values: a.slice(), ptr: m09ptr({ lo: lo, hi: hi }, n), range: [lo, hi] },
            { type: 'vars', vals: { target: t, lo: lo, hi: hi, ans: ans } }] });
        while (lo <= hi) {
          var mid = lo + Math.floor((hi - lo) / 2);
          var hl = m09shade(n, lo, hi); hl[mid] = 'cur'; if (ans >= 0) hl[ans] = 'sel';
          frames.push({ narr: 'mid = ' + mid + ', a[mid] = <b>' + a[mid] + '</b>. Compare with ' + t + '.',
            parts: [{ type: 'array', label: 'a', values: a.slice(), hl: hl, ptr: m09ptr({ lo: lo, mid: mid, hi: hi }, n), range: [lo, hi] },
              { type: 'vars', vals: { target: t, lo: lo, mid: mid, hi: hi, ans: ans }, hl: { ans: 'sel' } }] });
          var why;
          if (a[mid] === t) {
            ans = mid;
            if (mode === 'first') { why = '<span class="c-g">Hit!</span> Save ans = ' + mid + '. But an earlier ' + t + ' could hide on the left, so keep looking left: hi = mid - 1 = ' + (mid - 1) + '.'; hi = mid - 1; }
            else { why = '<span class="c-g">Hit!</span> Save ans = ' + mid + '. A later ' + t + ' could hide on the right, so keep looking right: lo = mid + 1 = ' + (mid + 1) + '.'; lo = mid + 1; }
          } else if (a[mid] < t) { why = a[mid] + ' &lt; ' + t + ' → all copies of ' + t + ' are to the right: lo = mid + 1 = ' + (mid + 1) + '.'; lo = mid + 1; }
          else { why = a[mid] + ' &gt; ' + t + ' → all copies of ' + t + ' are to the left: hi = mid - 1 = ' + (mid - 1) + '.'; hi = mid - 1; }
          var h2 = m09shade(n, lo, hi); if (ans >= 0) h2[ans] = 'sel';
          frames.push({ narr: why,
            parts: [{ type: 'array', label: 'a', values: a.slice(), hl: h2, ptr: m09ptr({ lo: lo, hi: hi, ans: ans }, n), range: lo <= hi ? [lo, hi] : undefined },
              { type: 'vars', vals: { target: t, lo: lo, hi: hi, ans: ans }, hl: { ans: ans >= 0 ? 'sel' : '' } }] });
        }
        var hf = {}; if (ans >= 0) hf[ans] = 'sel';
        frames.push({ narr: 'lo &gt; hi, the window is empty. ' + (ans >= 0 ? '<span class="c-p">The ' + mode + ' occurrence of ' + t + ' is index ' + ans + '.</span> Every later save moved further ' + (mode === 'first' ? 'left' : 'right') + ', so this one is the edge.' : '<span class="c-r">ans was never set → ' + t + ' does not appear → -1.</span>'),
          parts: [{ type: 'array', label: 'a', values: a.slice(), hl: hf, ptr: m09ptr({ ans: ans }, n) },
            { type: 'vars', vals: { answer: ans }, hl: { answer: 'sel' } }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Counting copies without walking over them',
        html: `<p>How many 7s are in ${H.arr([1, 3, 7, 7, 7, 7, 9, 12], { label: 'a', hl: { 2: 'g', 3: 'g', 4: 'g', 5: 'g' }, ptr: { 2: 'lb', 6: 'ub' } })}</p>
          <p>lowerBound(7) = first index with a[i] ≥ 7 = ${H.c('g', '2')}. upperBound(7) = first index with a[i] &gt; 7 = ${H.c('p', '6')}. Count = 6 − 2 = <b>4</b>.</p>
          <p>If the array had a million 7s, a "find one then walk" approach would take a million steps; two bounds still take about 40.</p>`,
        code: `int[] a = {1, 3, 7, 7, 7, 7, 9, 12};
int lb = 0, hi = a.length;
while (lb < hi) { int mid = lb + (hi - lb) / 2; if (a[mid] >= 7) hi = mid; else lb = mid + 1; }
int ub = 0; hi = a.length;
while (ub < hi) { int mid = ub + (hi - ub) / 2; if (a[mid] > 7) hi = mid; else ub = mid + 1; }
System.out.println(ub - lb); // 4`
      },
      {
        title: 'Floor and ceiling of a missing value',
        html: `<p>Prices on a menu (sorted): ${H.arr([20, 35, 50, 80, 120], { label: 'price' })} You have ₹60. What is the most expensive thing you can afford (floor), and the cheapest thing that is ≥ ₹60 (ceiling)?</p>
          ${H.table(['Question', 'Formula', 'Index', 'Value'], [
            ['ceiling(60): smallest ≥ 60', 'lowerBound(60)', '3', H.c('g', '80')],
            ['floor(60): largest ≤ 60', 'upperBound(60) − 1', '3 − 1 = 2', H.c('g', '50')]
          ])}
          <p>If lowerBound returns n there is no ceiling; if upperBound − 1 is −1 there is no floor. Always check those two edges.</p>`
      },
      {
        title: 'Target bigger or smaller than everything',
        html: `<p>a = ${H.arr([4, 4, 6, 9], { label: 'a' })}</p>
          ${H.table(['target', 'lowerBound', 'upperBound', 'first / last', 'why'], [
            ['2', '0', '0', '-1 / -1', 'every element is already ≥ 2 and &gt; 2, both bounds sit at 0, count = 0'],
            ['4', '0', '2', '0 / 1', 'a[0] == 4 so it exists; last = 2 − 1'],
            ['10', '4 (= n)', '4', '-1 / -1', 'bounds run off the end: index n means "insert at the end"']
          ])}
          <p>Rule of thumb: target exists ⇔ <code>lb &lt; n &amp;&amp; a[lb] == target</code>.</p>`
      },
      {
        title: 'Searching by a key inside objects (timestamps)',
        html: `<p>A log of events sorted by time: <code>[09:00, 09:05, 09:05, 09:12, 09:30]</code>. "Show all events between 09:05 and 09:20" = indices <code>[lowerBound(09:05), upperBound(09:20))</code> = [1, 4) → three events. Every time-range query in a sorted log, database index or metrics store is just these two bounds.</p>`,
        code: `long[] times = {900, 905, 905, 912, 930};      // minutes written as hhmm for readability
int from = Arrays.binarySearch(times, 905);       // some index of 905 (not guaranteed first!)
System.out.println(from >= 0 ? "905 present" : "905 missing");`
      }
    ],
    deepDive: `<p><b>One template to rule them all: "first true".</b> Every boundary question is: given a predicate <code>P(i)</code> that is <code>false…false true…true</code>, find the first true. lower bound uses <code>P(i) = a[i] ≥ x</code>, upper bound uses <code>a[i] &gt; x</code>, "last index ≤ x" is <code>firstTrue(a[i] &gt; x) − 1</code>. Writing only <code>firstTrue</code> and swapping predicates removes most off-by-one risk.</p>
      <p><b>Library behaviour you must know:</b> Java <code>Arrays.binarySearch</code> / <code>Collections.binarySearch</code> make <b>no guarantee</b> which duplicate they return — never use them for "first occurrence". C++ has <code>lower_bound</code>, <code>upper_bound</code>, <code>equal_range</code>; Python has <code>bisect_left</code> (= lower bound) and <code>bisect_right</code> (= upper bound); Go has <code>sort.Search(n, pred)</code> which is literally "first true". For <b>changing</b> data, Java's <code>TreeMap</code>/<code>TreeSet</code> give <code>ceilingKey</code>, <code>floorKey</code>, <code>higherKey</code>, <code>lowerKey</code> in O(log n) on a red-black tree.</p>
      <p><b>Why the "save ans and keep going" version is also O(log n):</b> it never stops early, so it always does ~log₂ n rounds — duplicates do not slow it down. The "find one, then expand" version is O(log n + k) where k is the number of copies, which degrades to O(n).</p>
      <p><b>Production reality:</b> a database range scan on a B-tree index (<code>WHERE ts BETWEEN a AND b</code>) does a lower-bound seek to the first key ≥ a, then walks leaf pages until a key &gt; b. Time-series databases, Kafka's time index and sorted-string tables (SSTables) all use the same pair of bounds.</p>`,
    aiEra: `<p><b>What AI changes:</b> asking an assistant "first and last position of target" gives working code immediately — it's one of the most common LeetCode problems in its training data. The risk is the variants: "last element strictly smaller than x", "count in a range [L, R]", "closest value". These are where generated code silently returns one index too far.</p>
      <p><b>Use AI as a partner:</b> describe the predicate in words and ask it to map it to <code>firstTrue</code>: <code>Express 'largest index with a[i] &lt; x' using lower_bound or upper_bound and explain the -1</code>. Then ask for a table of 6 edge cases (empty array, all equal, x below min, x above max) and verify each by hand.</p>
      <p><b>Where AI goes wrong:</b> using <code>Arrays.binarySearch</code> for "first occurrence" (unspecified with duplicates), forgetting <code>hi = n</code> so "insert at the end" is impossible, or returning early on a match.</p>
      <p><b>What you must still own:</b> turning a word problem into a monotonic yes/no predicate and deciding whether you want the first true or the last false. That translation is the actual skill interviewers test.</p>`,
    problems: [{
      title: 'First and Last Position of Element in Sorted Array',
      level: 'Medium',
      tags: ['binary search', 'lower bound', 'upper bound'],
      statement: `<p>Given an array <code>nums</code> sorted in non-decreasing order (duplicates allowed), return <code>[first, last]</code>: the starting and ending index of <code>target</code>. If target is not found return <code>[-1, -1]</code>. Must run in <b>O(log n)</b>.</p>`,
      constraints: `0 ≤ n ≤ 10<sup>5</sup>, -10<sup>9</sup> ≤ nums[i], target ≤ 10<sup>9</sup>`,
      example: `${H.arr([5, 7, 7, 8, 8, 10], { label: 'nums', hl: { 3: 'g', 4: 'p' } })}
        <p>target = 8 → Output: ${H.c('p', '[3, 4]')}: the ${H.c('g', 'first 8 is at index 3')} and the ${H.c('p', 'last 8 is at index 4')}.</p>
        <p>target = 6 → Output: ${H.c('r', '[-1, -1]')} (6 never appears).</p>`,
      brute: {
        why: `<p>Scan left to right; the first match is "first", keep updating "last". That is O(N). Even "binary search to find one 8, then walk left and right" is O(N) in the worst case: if all 10<sup>5</sup> elements are 8, the walk visits all of them. The wasted work is stepping over equal values one by one.</p>`,
        code: `
          int[] brute(int[] nums, int target) {
              int first = -1, last = -1;
              for (int i = 0; i < nums.length; i++) {
                  if (nums[i] == target) {
                      if (first == -1) first = i;   // first time we see it
                      last = i;                     // keep moving the end
                  }
              }
              return new int[]{first, last};
          }`
      },
      mcq: {
        q: `While searching for the <b>first</b> 8 you land on <code>nums[mid] == 8</code>. What next?`,
        options: [`Return mid immediately`, `Save ans = mid, then hi = mid - 1`, `Save ans = mid, then lo = mid + 1`, `Walk left one step at a time`],
        answer: 1,
        explain: `mid is a valid answer, but there may be an earlier 8. Remember it, then search only the left side (hi = mid - 1). Searching right would find later 8s, which we don't want for "first".`
      },
      hints: [
        `<p><b>Aha:</b> "first index with value ≥ target" and "first index with value &gt; target" are both <b>no…no yes…yes</b> questions on a sorted array, so binary search finds each boundary. first = lower bound, last = upper bound − 1.</p>`,
        `<p>No extra structure. Run binary search twice with an <code>ans</code> variable. On a hit: for first, save and go left (<code>hi = mid - 1</code>); for last, save and go right (<code>lo = mid + 1</code>).</p>`,
        `<p>Traps: empty array (n = 0) must return [-1, -1] without touching <code>nums[0]</code>; target missing → ans stays -1; do not return early on a hit. Recipe: first = search(goLeft); if first == -1 return [-1,-1]; last = search(goRight); return [first, last].</p>`
      ],
      solution: {
        approach: `<p>Two binary searches that keep going after a hit: one leans left, one leans right.</p>`,
        code: `
          class Solution {
              public int[] searchRange(int[] nums, int target) {
                  int first = findEdge(nums, target, true);   // lean left
                  if (first == -1) return new int[]{-1, -1};   // not present at all
                  int last = findEdge(nums, target, false);   // lean right
                  return new int[]{first, last};
              }

              // leanLeft = true  -> first occurrence
              // leanLeft = false -> last occurrence
              private int findEdge(int[] nums, int target, boolean leanLeft) {
                  int lo = 0, hi = nums.length - 1, ans = -1;
                  while (lo <= hi) {
                      int mid = lo + (hi - lo) / 2;
                      if (nums[mid] == target) {
                          ans = mid;                       // a real match: remember it
                          if (leanLeft) hi = mid - 1;      // maybe an earlier copy exists
                          else lo = mid + 1;               // maybe a later copy exists
                      } else if (nums[mid] < target) {
                          lo = mid + 1;                    // all copies are to the right
                      } else {
                          hi = mid - 1;                    // all copies are to the left
                      }
                  }
                  return ans;
              }

              public static void main(String[] args) {
                  int[] r = new Solution().searchRange(new int[]{5, 7, 7, 8, 8, 10}, 8);
                  System.out.println(r[0] + " " + r[1]); // 3 4
              }
          }`,
        dry: {
          head: ['search', 'lo', 'hi', 'mid', 'nums[mid]', 'action', 'ans'],
          rows: [
            ['first', '0', '5', '2', '7', '7 &lt; 8 → lo = 3', '-1'],
            ['first', '3', '5', '4', '8', 'hit → save, hi = 3', '4'],
            ['first', '3', '3', '3', '8', 'hit → save, hi = 2', '<span class="c-g">3</span>'],
            ['first', '3', '2', '–', '–', 'lo &gt; hi → stop', '<b>3</b>'],
            ['last', '0', '5', '2', '7', '7 &lt; 8 → lo = 3', '-1'],
            ['last', '3', '5', '4', '8', 'hit → save, lo = 5', '4'],
            ['last', '5', '5', '5', '10', '10 &gt; 8 → hi = 4', '4'],
            ['last', '5', '4', '–', '–', 'lo &gt; hi → stop', '<span class="c-p"><b>4</b></span>']
          ]
        },
        complexity: `<p><b>Time O(log N)</b>: two binary searches, each halves the window every step (about 17 steps each for 10<sup>5</sup>), no matter how many duplicates there are. <b>Space O(1)</b>.</p>`
      }
    }]
  });

  /* ================= TOPIC 3: Search in Rotated Sorted Array ================= */
  topics.push({
    title: 'Search in a Rotated Sorted Array',
    analogy: `<p>Books on a shelf are in order <b>1 → 7</b>. A friend lifts the first few books off and puts them at the end: <b>4 5 6 7 1 2 3</b>. The shelf is no longer sorted as a whole... but wherever you put your finger in the middle, <b>at least one side of your finger is still perfectly in order</b>. Check that tidy side: "Is my book in this tidy range?" If yes, go there; if no, it must be on the messy side.</p>`,
    explain: `<p>A <b>rotated sorted array</b> is a sorted array cut at some point with the two pieces swapped. There is exactly one "drop" (where a big number is followed by a small one).</p>
      ${H.arr([4, 5, 6, 7, 0, 1, 2], { label: 'a', hl: { 0: 'b', 1: 'b', 2: 'b', 3: 'b', 4: 'p', 5: 'p', 6: 'p' }, ptr: { 3: 'mid' } })}
      <p><b>Key fact:</b> the drop is on only one side of <code>mid</code>, so the other side is sorted. How to tell which?</p>
      ${H.table(['Check', 'Meaning', 'Example (mid = 3)'], [
        ['<code>a[lo] ≤ a[mid]</code>', 'no drop between lo and mid → <b>left half sorted</b>', 'a[0] = 4 ≤ a[3] = 7 → left [4,5,6,7] is sorted'],
        ['otherwise', 'the drop is on the left → <b>right half sorted</b>', '–']
      ])}
      <p>Now ask the tidy half one easy question: <i>"Is target between your smallest and largest value?"</i></p>
      ${H.table(['Sorted half', 'Target inside it?', 'Move'], [
        ['left [lo..mid]', '<code>a[lo] ≤ target &lt; a[mid]</code> → yes', '<code>hi = mid - 1</code> (go into the tidy half)'],
        ['left [lo..mid]', 'no', '<code>lo = mid + 1</code> (must be in the messy right)'],
        ['right [mid..hi]', '<code>a[mid] &lt; target ≤ a[hi]</code> → yes', '<code>lo = mid + 1</code>'],
        ['right [mid..hi]', 'no', '<code>hi = mid - 1</code>']
      ])}
      <p>Each step still throws away half, so it stays <b>O(log N)</b>. We only need "is it in the sorted half's range?", which works because a sorted range is a simple interval <code>[smallest, largest]</code>.</p>
      <p>${H.c('y', 'Why ≤ in a[lo] ≤ a[mid]?')} When lo == mid (a 1- or 2-element window), the "left half" is the single item a[mid]; it is trivially sorted, so the test must say "yes".</p>`,
    clues: [
      '"Sorted array that was <b>rotated</b> at an unknown pivot" / "possibly shifted" → modified binary search.',
      '"Must be <b>O(log n)</b>" even though the array is not fully sorted → find the sorted half at each step.',
      '"Find the <b>minimum</b> / the rotation count / the pivot" in a rotated array → compare <code>a[mid]</code> with <code>a[hi]</code>.',
      'All values <b>distinct</b> → the "which half is sorted" test is always decisive. (With duplicates, <code>a[lo] == a[mid] == a[hi]</code> can happen; then shrink lo++ / hi-- and accept O(N) worst case.)'
    ],
    viz: {
      title: 'Rotated array: which half is sorted?',
      input: '15 18 22 29 35 3 6 9 11 | 9',
      inputLabel: 'rotated sorted array (distinct) | target',
      gen: function (input) {
        var p = m09split(input, 2, 'rotated sorted numbers | target   e.g. 4 5 6 7 0 1 2 | 0');
        var a = m09nums(p[0], 'the array'), t = Number(p[1].trim());
        if (!p[1].trim() || isNaN(t)) throw new Error('Put one target number after the | sign.');
        if (a.length > 16) throw new Error('Please use at most 16 numbers.');
        var drops = 0, i;
        for (i = 1; i < a.length; i++) { if (a[i] === a[i - 1]) throw new Error('Please use distinct numbers.'); if (a[i] < a[i - 1]) drops++; }
        if (drops > 1 || (drops === 1 && a[a.length - 1] > a[0])) throw new Error('This is not a rotated sorted array (it must be sorted, then cut once and swapped, like 4 5 6 7 0 1 2).');
        var n = a.length, lo = 0, hi = n - 1, frames = [];
        frames.push({ narr: 'Find ' + t + '. The array is sorted but rotated, so we cannot simply compare with mid. At each step we first find the <b>sorted half</b> (shown blue), then ask whether ' + t + ' fits inside it.',
          parts: [{ type: 'array', label: 'a', values: a.slice(), ptr: m09ptr({ lo: lo, hi: hi }, n), range: [lo, hi] },
            { type: 'vars', vals: { target: t, lo: lo, hi: hi } }] });
        while (lo <= hi) {
          var mid = lo + Math.floor((hi - lo) / 2);
          var hl = m09shade(n, lo, hi); hl[mid] = 'cur';
          if (a[mid] === t) {
            hl[mid] = 'sel';
            frames.push({ narr: 'mid = ' + mid + ', a[mid] = ' + a[mid] + ' <span class="c-g">equals the target → found at index ' + mid + '.</span>',
              parts: [{ type: 'array', label: 'a', values: a.slice(), hl: hl, ptr: m09ptr({ lo: lo, mid: mid, hi: hi }, n) },
                { type: 'vars', vals: { answer: mid }, hl: { answer: 'sel' } }] });
            frames.push({ narr: 'Done. Every step we threw away half, even though the array was rotated.',
              parts: [{ type: 'array', label: 'a', values: a.slice(), hl: (function () { var h = {}; h[mid] = 'sel'; return h; })(), ptr: m09ptr({ found: mid }, n) },
                { type: 'vars', vals: { answer: mid }, hl: { answer: 'sel' } }] });
            return frames;
          }
          var leftSorted = a[lo] <= a[mid], s0 = leftSorted ? lo : mid, s1 = leftSorted ? mid : hi;
          var hs = m09shade(n, lo, hi);
          for (i = s0; i <= s1; i++) hs[i] = 'win';
          hs[mid] = 'cur';
          frames.push({ narr: 'mid = ' + mid + ', a[mid] = ' + a[mid] + '. ' + (leftSorted ? 'a[lo] = ' + a[lo] + ' ≤ a[mid] = ' + a[mid] + ' → the <b>LEFT half [' + lo + '..' + mid + '] is sorted</b>, covering values ' + a[lo] + '..' + a[mid] + '.' : 'a[lo] = ' + a[lo] + ' &gt; a[mid] = ' + a[mid] + ' → the drop is on the left, so the <b>RIGHT half [' + mid + '..' + hi + '] is sorted</b>, covering values ' + a[mid] + '..' + a[hi] + '.'),
            parts: [{ type: 'array', label: 'a (blue = sorted half)', values: a.slice(), hl: hs, ptr: m09ptr({ lo: lo, mid: mid, hi: hi }, n) },
              { type: 'vars', vals: { target: t, lo: lo, mid: mid, hi: hi, 'sorted half': leftSorted ? 'left' : 'right' }, hl: { 'sorted half': 'win' } }] });
          var why;
          if (leftSorted) {
            if (a[lo] <= t && t < a[mid]) { why = a[lo] + ' ≤ ' + t + ' &lt; ' + a[mid] + ' → target is inside the sorted left half. Go left: hi = mid - 1 = ' + (mid - 1) + '.'; hi = mid - 1; }
            else { why = t + ' is NOT in ' + a[lo] + '..' + a[mid] + ' → it can only be in the other (right) half. lo = mid + 1 = ' + (mid + 1) + '.'; lo = mid + 1; }
          } else {
            if (a[mid] < t && t <= a[hi]) { why = a[mid] + ' &lt; ' + t + ' ≤ ' + a[hi] + ' → target is inside the sorted right half. Go right: lo = mid + 1 = ' + (mid + 1) + '.'; lo = mid + 1; }
            else { why = t + ' is NOT in ' + a[mid] + '..' + a[hi] + ' → it can only be in the left half. hi = mid - 1 = ' + (mid - 1) + '.'; hi = mid - 1; }
          }
          frames.push({ narr: why,
            parts: [{ type: 'array', label: 'a', values: a.slice(), hl: m09shade(n, lo, hi), ptr: m09ptr({ lo: lo, hi: hi }, n), range: lo <= hi ? [lo, hi] : undefined },
              { type: 'vars', vals: { target: t, lo: lo, hi: hi } }] });
        }
        frames.push({ narr: '<span class="c-r">Window empty → ' + t + ' is not in the array → -1.</span>',
          parts: [{ type: 'array', label: 'a', values: a.slice(), hl: m09shade(n, 1, 0) }, { type: 'vars', vals: { answer: -1 }, hl: { answer: 'bad' } }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Target hiding in the rotated-away piece',
        html: `<p>Find <b>2</b> in ${H.arr([6, 7, 9, 1, 2, 4], { label: 'a' })}</p>
          ${H.table(['lo', 'hi', 'mid', 'a[mid]', 'sorted half', 'is 2 inside?', 'move'], [
            ['0', '5', '2', '9', 'left 6..9 (6 ≤ 9)', 'no', 'lo = 3'],
            ['3', '5', '4', '2', '–', '–', H.c('g', 'found at 4')]
          ])}
          <p>Two looks, even though the array is "broken" in the middle.</p>`
      },
      {
        title: 'Array that is not rotated at all',
        html: `<p>${H.arr([1, 3, 5, 7, 9], { label: 'a' })} Rotating by n (or 0) gives back the sorted array. Then <code>a[lo] ≤ a[mid]</code> is <b>always</b> true, the left half is always "the sorted half", and the algorithm behaves exactly like classic binary search. A good solution needs no special case for this.</p>`
      },
      {
        title: 'Rotation count = index of the minimum',
        html: `<p>"How many times was this sorted array rotated right?" For ${H.arr([15, 18, 2, 3, 6, 12], { label: 'a', hl: { 2: 'p' } })} the smallest value 2 sits at index ${H.c('p', '2')}, so it was rotated 2 times. Find it with the "compare <code>a[mid]</code> with <code>a[hi]</code>" search:</p>
          ${H.table(['lo', 'hi', 'mid', 'a[mid] vs a[hi]', 'move'], [
            ['0', '5', '2', '2 ≤ 12', 'hi = 2 (mid could be the min)'],
            ['0', '2', '1', '18 &gt; 2', 'lo = 2'],
            ['2', '2', '–', '–', H.c('p', 'min at index 2 → rotated 2 times')]
          ])}`
      },
      {
        title: 'Why duplicates break the "which half is sorted" test',
        html: `<p>a = ${H.arr([1, 1, 1, 1, 0, 1, 1], { label: 'a', hl: { 0: 'y', 3: 'y', 6: 'y', 4: 'p' } })} with lo = 0, mid = 3, hi = 6. All three probes show <b>1</b>. The 0 could be on the left (like <code>[1,0,1,1,1,1,1]</code>) or on the right (this array) — the probes look identical. The only safe move is to shrink both ends by one (<code>lo++</code>, <code>hi--</code>), which makes the worst case <b>O(n)</b>. That is "Search in Rotated Sorted Array II".</p>`
      }
    ],
    deepDive: `<p><b>Why one side is always sorted.</b> A rotated sorted array of distinct values has at most one "drop" position d (where <code>a[d] &gt; a[d+1]</code>). The window [lo, hi] is split at mid into [lo, mid] and [mid, hi]; the single drop can be in at most one of them, so the other contains no drop and is sorted. <code>a[lo] ≤ a[mid]</code> is a correct test: if the drop were inside [lo, mid], every value after the drop is smaller than every value before it, so <code>a[mid] &lt; a[lo]</code>.</p>
      <p><b>Two-phase alternative.</b> First find the minimum's index p (the rotation point) in O(log n), then run a normal binary search on either [0, p−1] or [p, n−1] depending on how target compares with <code>a[n−1]</code>. Same complexity, easier to reason about for some people, and the "find p" step is reusable (rotation count, min, max = <code>a[p−1]</code>).</p>
      <p><b>Index trick:</b> once you know p, the sorted order is <code>a[(p + i) % n]</code> for i = 0..n−1. You can binary search the <i>virtual</i> sorted array directly using this mapping — the same idea a <b>ring buffer</b> uses to treat a circular array as a straight one.</p>
      <p><b>Duplicates lower bound.</b> With duplicates, no algorithm can beat O(n) in the worst case: an adversary can answer "1" to every probe until you have looked at almost every cell, hiding the single 0 in the last unprobed place. So "Rotated II" has average O(log n) but worst-case O(n) — say this explicitly in interviews.</p>`,
    aiEra: `<p><b>What AI changes:</b> the rotated-array search is a classic that assistants reproduce reliably for the distinct-values case. The interesting interview territory has moved to the edges: duplicates, the "two-phase" variant, and explaining <i>why</i> it works.</p>
      <p><b>Use AI as a partner:</b> ask it to generate every rotation of <code>[1..8]</code> and every target from 0 to 9, run your function and a linear scan, and diff the answers — 8 × 10 = 80 cases cover every branch. Ask <code>Give me an input where using a[lo] &lt; a[mid] (strict) instead of ≤ gives a wrong answer</code> to understand the 2-element window case.</p>
      <p><b>Where AI goes wrong:</b> using <code>&lt;</code> instead of <code>≤</code> in the sorted-half test, using <code>≤</code> at both ends of the range check (double-counting mid), or claiming O(log n) for the duplicates version.</p>
      <p><b>What you must still own:</b> the one-sentence argument "the drop is on one side, so the other side is sorted and gives an interval test". Being able to say that calmly is what separates a memorized answer from understanding.</p>`,
    problems: [{
      title: 'Search in Rotated Sorted Array',
      level: 'Medium',
      tags: ['binary search', 'rotated array'],
      statement: `<p>An ascending array of <b>distinct</b> integers was rotated at an unknown index (e.g. <code>[0,1,2,4,5,6,7]</code> → <code>[4,5,6,7,0,1,2]</code>). Given the rotated array <code>nums</code> and a <code>target</code>, return its index or <code>-1</code>. You must use <b>O(log n)</b> time.</p>`,
      constraints: `1 ≤ n ≤ 5000, -10<sup>4</sup> ≤ nums[i], target ≤ 10<sup>4</sup>, all values distinct`,
      example: `${H.arr([4, 5, 6, 7, 0, 1, 2], { label: 'nums', hl: { 0: 'b', 1: 'b', 2: 'b', 3: 'b', 4: 'g' } })}
        <p>target = 0 → Output: ${H.c('p', '4')}. The ${H.c('b', 'blue part')} is the piece that was moved to the front; 0 sits right after the drop, at ${H.c('g', 'index 4')}.</p>
        <p>target = 3 → Output: ${H.c('r', '-1')}.</p>`,
      brute: {
        why: `<p>A linear scan finds the target in O(N). It ignores that each of the two pieces is sorted. Another slow idea: first find the rotation point linearly, then binary search one piece — still O(N) because of the first step.</p>`,
        code: `
          int brute(int[] nums, int target) {
              for (int i = 0; i < nums.length; i++)
                  if (nums[i] == target) return i;   // check every element
              return -1;
          }`
      },
      mcq: {
        q: `<code>nums = [4,5,6,7,0,1,2]</code>, lo = 0, hi = 6, mid = 3 (value 7), target = 0. What do you conclude?`,
        options: [`Left half [4..7] is sorted and contains 0 → go left`, `Left half [4..7] is sorted and does NOT contain 0 → go right`, `Right half is sorted → go right`, `Cannot decide, scan linearly`],
        answer: 1,
        explain: `a[0] = 4 ≤ a[3] = 7, so the left half is sorted and holds only values 4..7. 0 is not in that range, so it must be in the right half: lo = mid + 1.`
      },
      hints: [
        `<p><b>Aha:</b> cut a rotated sorted array anywhere and at least one side is fully sorted. <code>a[lo] ≤ a[mid]</code> means the left side is the sorted one; otherwise the right side is.</p>`,
        `<p>Still just lo / mid / hi. For the sorted side you can test "is target inside?" with two comparisons against its ends. Inside → move into it; outside → move to the other side.</p>`,
        `<p>Traps: use <code>≤</code> in <code>a[lo] ≤ a[mid]</code> (when lo == mid); use strict <code>&lt;</code> against <code>a[mid]</code> in the range check because mid was already checked; a not-rotated array works too (left always sorted). Recipe: while lo ≤ hi: mid; if hit return; if left sorted: (a[lo] ≤ t &lt; a[mid]) ? hi = mid-1 : lo = mid+1; else: (a[mid] &lt; t ≤ a[hi]) ? lo = mid+1 : hi = mid-1. Return -1.</p>`
      ],
      solution: {
        approach: `<p>Binary search where each step first identifies the sorted half, then checks whether the target lies in its value range.</p>`,
        code: `
          class Solution {
              public int search(int[] nums, int target) {
                  int lo = 0, hi = nums.length - 1;
                  while (lo <= hi) {
                      int mid = lo + (hi - lo) / 2;
                      if (nums[mid] == target) return mid;          // found

                      if (nums[lo] <= nums[mid]) {
                          // LEFT half [lo..mid] is sorted (no drop inside it)
                          if (nums[lo] <= target && target < nums[mid]) {
                              hi = mid - 1;                         // target lies in the sorted left part
                          } else {
                              lo = mid + 1;                         // otherwise it can only be on the right
                          }
                      } else {
                          // RIGHT half [mid..hi] is sorted
                          if (nums[mid] < target && target <= nums[hi]) {
                              lo = mid + 1;                         // target lies in the sorted right part
                          } else {
                              hi = mid - 1;                         // otherwise it can only be on the left
                          }
                      }
                  }
                  return -1;                                        // not present
              }

              public static void main(String[] args) {
                  System.out.println(new Solution().search(new int[]{4, 5, 6, 7, 0, 1, 2}, 0)); // 4
              }
          }`,
        dry: {
          head: ['lo', 'hi', 'mid', 'nums[mid]', 'sorted half', 'target in it?', 'action'],
          rows: [
            ['0', '6', '3', '7', 'left (4 ≤ 7): values 4..7', 'no (0 &lt; 4)', 'lo = 4'],
            ['4', '6', '5', '1', 'left (0 ≤ 1): values 0..1', 'yes (0 ≤ 0 &lt; 1)', 'hi = 4'],
            ['4', '4', '4', '0', '–', '–', '<span class="c-g">nums[4] == 0 → return 4</span>']
          ]
        },
        complexity: `<p><b>Time O(log N)</b>: the extra "which half is sorted" check is just a couple of comparisons; we still discard half the window every round. <b>Space O(1)</b>.</p>`
      }
    }]
  });

  /* ================= TOPIC 4: Peak Element ================= */
  topics.push({
    title: 'Peak Element: Binary Search Without a Sorted Array',
    analogy: `<p>You are hiking in thick fog and can only see the ground one step ahead. You want to stand on <b>any hilltop</b>. Simple rule: <b>if the ground rises in front of you, walk that way</b>. Going uphill, you must eventually reach a top — either the slope turns down, or you reach the edge of the map (and the edge counts as a top, because beyond the map it is a deep valley).</p>`,
    explain: `<p>A <b>peak</b> is an element strictly bigger than its neighbours. Pretend there is <code>-∞</code> (a bottomless valley) just outside both ends, so the first and last elements can also be peaks.</p>
      ${H.arr([1, 2, 1, 3, 5, 6, 4], { label: 'a', hl: { 1: 'g', 5: 'g' } })}
      <p>Peaks here: ${H.c('g', 'index 1 (value 2)')} and ${H.c('g', 'index 5 (value 6)')}. Returning <b>either</b> is accepted.</p>
      <h4>The one comparison that decides the half</h4>
      <p>Look at <code>a[mid]</code> and its right neighbour <code>a[mid + 1]</code> (neighbours are always different in this problem):</p>
      ${H.table(['What you see', 'Picture', 'Why', 'Move'], [
        ['<code>a[mid] &lt; a[mid+1]</code>', 'uphill →', 'Keep walking right: the climb must end in a top, at the latest at the last index (beyond it is -∞).', '<code>lo = mid + 1</code>'],
        ['<code>a[mid] &gt; a[mid+1]</code>', '→ downhill', 'mid itself might be the top, or there is a top on the left (going left from mid is also "uphill").', '<code>hi = mid</code> (keep mid!)']
      ])}
      <p>The array is <b>not sorted</b>, yet binary search works. What we really need is not sorting but a rule that says "the answer is <b>surely</b> on this side". That is the deeper meaning of binary search: <b>discard the half that cannot contain (some) answer.</b></p>
      <p>We use Template B (<code>lo &lt; hi</code>), because we keep <code>mid</code> when going left. The loop stops when <code>lo == hi</code>: the window has one element left, and it is a peak. Note <code>mid + 1</code> is always valid since mid &lt; hi.</p>`,
    clues: [
      '"Find <b>a</b> peak element", "return <b>any</b> of them" → you don\'t need the global max, just a local one → binary search on slope.',
      '"<code>nums[i] ≠ nums[i + 1]</code>" and "imagine <code>nums[-1] = nums[n] = -∞</code>" → classic peak setup.',
      '"Must run in <b>O(log n)</b>" on an <b>unsorted</b> array → look for a slope / direction rule instead of sortedness.',
      '"Bitonic array" / "mountain array: increases then decreases" → same compare-with-neighbour trick finds the top.'
    ],
    viz: {
      title: 'Peak element: always walk uphill',
      input: '1 3 4 6 8 7 5 2 4 1',
      inputLabel: 'array (neighbours must differ)',
      gen: function (input) {
        var a = m09nums(input, 'the array');
        if (a.length > 16) throw new Error('Please use at most 16 numbers.');
        if (a.length < 2) throw new Error('Please enter at least 2 numbers.');
        for (var i = 1; i < a.length; i++) if (a[i] === a[i - 1]) throw new Error('Neighbouring numbers must be different (no flat ground).');
        var n = a.length, lo = 0, hi = n - 1, frames = [];
        frames.push({ narr: 'Find any peak. Imagine -∞ beyond both ends. Window = [0, ' + (n - 1) + ']. Promise: there is always a peak inside [lo, hi].',
          parts: [{ type: 'bars', label: 'heights', values: a.slice(), ptr: m09ptr({ lo: lo, hi: hi }, n) },
            { type: 'vars', vals: { lo: lo, hi: hi } }] });
        while (lo < hi) {
          var mid = lo + Math.floor((hi - lo) / 2);
          var hl = m09shade(n, lo, hi); hl[mid] = 'cur'; hl[mid + 1] = 'win';
          frames.push({ narr: 'mid = ' + mid + '. Compare a[mid] = <b>' + a[mid] + '</b> with its right neighbour a[mid+1] = <b>' + a[mid + 1] + '</b>.',
            parts: [{ type: 'bars', label: 'heights', values: a.slice(), hl: hl, ptr: m09ptr({ lo: lo, mid: mid, hi: hi }, n) },
              { type: 'vars', vals: { lo: lo, mid: mid, hi: hi, 'a[mid]': a[mid], 'a[mid+1]': a[mid + 1] }, hl: { 'a[mid]': 'cur', 'a[mid+1]': 'win' } }] });
          var why;
          if (a[mid] < a[mid + 1]) { why = a[mid] + ' &lt; ' + a[mid + 1] + ': the ground goes <b>uphill to the right</b>. Walking right must reach a top, so drop mid and everything left of it: lo = mid + 1 = ' + (mid + 1) + '.'; lo = mid + 1; }
          else { why = a[mid] + ' &gt; ' + a[mid + 1] + ': the ground goes <b>downhill to the right</b>. mid could itself be the top, or a top is on the left. Keep mid: hi = mid = ' + mid + '.'; hi = mid; }
          frames.push({ narr: why,
            parts: [{ type: 'bars', label: 'heights', values: a.slice(), hl: m09shade(n, lo, hi), ptr: m09ptr({ lo: lo, hi: hi }, n) },
              { type: 'vars', vals: { lo: lo, hi: hi } }] });
        }
        var hf = {}; hf[lo] = 'sel';
        frames.push({ narr: '<span class="c-p">lo == hi == ' + lo + ': only one candidate is left, and our promise says it is a peak.</span> a[' + lo + '] = ' + a[lo] + (lo > 0 ? ' &gt; left neighbour ' + a[lo - 1] : ' (left of it is -∞)') + (lo < n - 1 ? ' and &gt; right neighbour ' + a[lo + 1] : ' (right of it is -∞)') + '.',
          parts: [{ type: 'bars', label: 'heights', values: a.slice(), hl: hf, ptr: m09ptr({ peak: lo }, n) },
            { type: 'vars', vals: { answer: lo }, hl: { answer: 'sel' } }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Strictly increasing array: the last element is the peak',
        html: `<p>${H.arr([1, 2, 3, 4, 5], { label: 'a', hl: { 4: 'p' } })} Every comparison says "uphill to the right", so lo keeps moving right: lo = 3, then lo = 4 = hi. Answer ${H.c('p', 'index 4')} — it is a peak because beyond it is −∞. Mirror case: a strictly decreasing array returns index 0.</p>`
      },
      {
        title: 'Mountain array: find the summit',
        html: `<p>A <b>mountain array</b> strictly rises then strictly falls, e.g. ${H.arr([0, 2, 5, 9, 7, 3, 1], { label: 'a', hl: { 3: 'p' } })} It has exactly <b>one</b> peak, so the same code returns the unique summit (index ${H.c('p', '3')}). This is "Peak Index in a Mountain Array" and the first step of "Find in Mountain Array" (find the summit, then binary search the rising side ascending and the falling side descending).</p>`,
        code: `int[] a = {0, 2, 5, 9, 7, 3, 1};
int lo = 0, hi = a.length - 1;
while (lo < hi) {
    int mid = lo + (hi - lo) / 2;
    if (a[mid] < a[mid + 1]) lo = mid + 1; else hi = mid;
}
System.out.println(lo); // 3`
      },
      {
        title: 'Why flat ground (equal neighbours) breaks it',
        html: `<p>${H.arr([1, 1, 1, 1, 1, 5, 1], { label: 'a', hl: { 5: 'p' } })} At mid = 3 we see a[3] = a[4] = 1: neither uphill nor downhill. The only peak (index 5) could be on either side for all we know (compare with <code>[1,5,1,1,1,1,1]</code>). Without the rule <code>nums[i] ≠ nums[i+1]</code>, the worst case becomes O(n). That is why the problem statement includes it — it is a clue, not decoration.</p>`
      },
      {
        title: 'Local minimum: the upside-down twin',
        html: `<p>"Find any index smaller than its neighbours" in ${H.arr([9, 6, 3, 14, 5, 7, 4], { label: 'a', hl: { 2: 'g', 4: 'g', 6: 'g' } })} — flip every comparison: if <code>a[mid] &gt; a[mid+1]</code> the ground goes <b>down</b> to the right, so a valley exists there (lo = mid + 1); otherwise hi = mid. Valleys here: indices 2, 4 and 6.</p>`
      }
    ],
    deepDive: `<p><b>Invariant proof.</b> Keep the promise: <i>"a[lo − 1] &lt; a[lo] and a[hi] &gt; a[hi + 1]"</i> (with −∞ outside the array). It is true initially. If <code>a[mid] &lt; a[mid+1]</code>, setting lo = mid + 1 keeps "the element left of lo is smaller". If <code>a[mid] &gt; a[mid+1]</code>, setting hi = mid keeps "the element right of hi is smaller". When lo == hi, that single element is bigger than both neighbours — a peak. This "climb uphill" argument also shows why <b>a</b> peak must exist at all.</p>
      <p><b>Which peak do you get?</b> Not the highest one — any local maximum. Finding the <b>global</b> maximum of an arbitrary array needs Ω(n) because any unlooked-at cell might be the maximum.</p>
      <p><b>Ternary search vs slope search.</b> For a strictly <i>unimodal</i> function (one hump), ternary search compares two interior points and drops a third each round. Comparing <code>f(mid)</code> with <code>f(mid+1)</code> (binary search on the slope) drops half per round, so it is faster on integer domains. Ternary search is still the go-to on <b>real-valued</b> unimodal functions where "mid + 1" makes no sense.</p>
      <p><b>2D peak.</b> In an m × n grid with distinct neighbours, take the middle column, find its maximum, and compare with the left/right neighbours; move toward the bigger neighbour. Each step halves the columns → O(m log n). Same climbing idea, one dimension up ("Find a Peak Element II").</p>
      <p><b>Real use:</b> hill-climbing in optimization, finding the best batch size / thread count in performance tuning (when throughput is unimodal), and the summit search in "Find in Mountain Array" where every array access is an expensive API call.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants know "Find Peak Element" well, but they often present it as magic. Your edge is explaining <b>why an unsorted array can be binary searched</b>: the decision rule guarantees an answer on one side.</p>
      <p><b>Use AI as a partner:</b> ask <code>Generate 1,000 random arrays with distinct neighbours and check that my findPeak returns an index bigger than both neighbours (with -infinity outside)</code>. A checker that verifies the <i>property</i> is better than comparing to a specific expected answer, because many answers are valid.</p>
      <p><b>Where AI goes wrong:</b> writing <code>hi = mid - 1</code> on the downhill branch (can skip the peak), comparing with <code>mid - 1</code> and then indexing out of bounds at mid = 0, or "fixing" a test that expected a different (but also valid) peak.</p>
      <p><b>What you must still own:</b> noticing the <i>shape</i> clue ("any peak", "neighbours differ", "mountain") and choosing slope search over sorting. Sorting would destroy positions and cost O(n log n) anyway.</p>`,
    problems: [{
      title: 'Find Peak Element',
      level: 'Medium',
      tags: ['binary search', 'slope'],
      statement: `<p>A peak element is strictly greater than its neighbours. Given <code>nums</code> where <code>nums[i] ≠ nums[i + 1]</code>, return the index of <b>any</b> peak. Treat <code>nums[-1] = nums[n] = -∞</code>. Your algorithm must run in <b>O(log n)</b>.</p>`,
      constraints: `1 ≤ n ≤ 1000, -2<sup>31</sup> ≤ nums[i] ≤ 2<sup>31</sup> - 1, nums[i] ≠ nums[i + 1]`,
      example: `${H.arr([1, 2, 1, 3, 5, 6, 4], { label: 'nums', hl: { 1: 'g', 5: 'p' } })}
        <p>Output: ${H.c('p', '5')} (value 6 &gt; 5 and &gt; 4). ${H.c('g', 'Index 1')} (value 2) would also be accepted. Our binary search happens to land on 5.</p>
        ${H.arr([1, 2, 3], { label: 'nums', hl: { 2: 'p' } })}<p>Output: ${H.c('p', '2')}: the last element is a peak because beyond it is -∞.</p>`,
      brute: {
        why: `<p>Check every index: is it bigger than both neighbours? Or simply return the index of the maximum. Both are O(N). The waste: a single comparison <code>a[mid]</code> vs <code>a[mid+1]</code> already tells us a whole half is guaranteed to contain a peak, but the scan never uses that.</p>`,
        code: `
          int brute(int[] nums) {
              int best = 0;
              for (int i = 1; i < nums.length; i++)
                  if (nums[i] > nums[best]) best = i;   // the global max is always a peak
              return best;
          }`
      },
      mcq: {
        q: `<code>nums[mid] = 5</code> and <code>nums[mid + 1] = 6</code>. Where is a peak guaranteed?`,
        options: [`At mid`, `Somewhere in [lo, mid - 1]`, `Somewhere in [mid + 1, hi]`, `Nowhere — there may be no peak`],
        answer: 2,
        explain: `5 &lt; 6 means uphill to the right. Keep walking right: either the values go down somewhere (that turning point is a peak) or you reach the end, which is a peak because outside is -∞. So lo = mid + 1.`
      },
      hints: [
        `<p><b>Aha:</b> if <code>a[mid] &lt; a[mid+1]</code>, a peak exists to the right of mid; otherwise a peak exists in <code>[lo, mid]</code> (mid included). Sorting is not needed — only a guaranteed side.</p>`,
        `<p>Use the <code>while (lo &lt; hi)</code> template: <code>lo = mid + 1</code> when uphill, <code>hi = mid</code> when downhill. When lo == hi, that index is the peak.</p>`,
        `<p>Traps: with <code>lo &lt; hi</code>, mid is always &lt; hi, so <code>mid + 1</code> never goes out of bounds; never write <code>hi = mid - 1</code> on the downhill case (you might throw away the peak); n = 1 → return 0 (loop doesn't run). Values can be <code>Integer.MIN_VALUE</code> — that's fine since we never compute -∞ ourselves.</p>`
      ],
      solution: {
        approach: `<p>Binary search on the slope: always move toward the higher neighbour.</p>`,
        code: `
          class Solution {
              public int findPeakElement(int[] nums) {
                  int lo = 0, hi = nums.length - 1;
                  // Promise: there is always a peak inside [lo, hi].
                  while (lo < hi) {                          // at least 2 candidates left
                      int mid = lo + (hi - lo) / 2;           // mid < hi, so mid + 1 is safe
                      if (nums[mid] < nums[mid + 1]) {
                          lo = mid + 1;                       // uphill to the right: a peak is on the right
                      } else {
                          hi = mid;                           // downhill: mid or something left of it is a peak
                      }
                  }
                  return lo;                                  // lo == hi: the last candidate is a peak
              }

              public static void main(String[] args) {
                  System.out.println(new Solution().findPeakElement(new int[]{1, 2, 1, 3, 5, 6, 4})); // 5
              }
          }`,
        dry: {
          head: ['lo', 'hi', 'mid', 'nums[mid]', 'nums[mid+1]', 'action'],
          rows: [
            ['0', '6', '3', '3', '5', 'uphill → lo = 4'],
            ['4', '6', '5', '6', '4', 'downhill → hi = 5'],
            ['4', '5', '4', '5', '6', 'uphill → lo = 5'],
            ['5', '5', '–', '–', '–', '<span class="c-p">lo == hi → return 5</span>']
          ]
        },
        complexity: `<p><b>Time O(log N)</b>: each round removes about half the candidates and keeps the promise "a peak is inside". <b>Space O(1)</b>.</p>`
      }
    }]
  });

  /* ================= TOPIC 5: Search on a Monotonic Function / Square Root ================= */
  topics.push({
    title: 'Searching a Monotonic Function: Integer Square Root',
    analogy: `<p>You have <b>40 floor tiles</b> and want to build the <b>biggest square patio</b>. Try side 10: needs 100 tiles — too many. Try side 5: needs 25 — fits! Try 7: needs 49 — too many. Try 6: needs 36 — fits. So the answer is <b>6</b>. You never laid out a real list of numbers; you just kept guessing a side and asking <b>"does it fit?"</b>. Bigger side always needs more tiles, so the answers go <b>fits, fits, fits, too big, too big</b> — and binary search finds the switch.</p>`,
    explain: `<p>Binary search does not need an array at all. It needs a <b>range of candidate answers</b> and a question whose answer flips <b>only once</b>. A function that only goes up (or only goes down) is called <b>monotonic</b>.</p>
      <h4>Square root of 20, the picture</h4>
      ${H.table(['x', '0', '1', '2', '3', '4', '5', '6', '...', '20'], [
        ['x · x', '0', '1', '4', '9', '16', '25', '36', '...', '400'],
        ['x·x ≤ 20 ?', H.c('g', 'yes'), H.c('g', 'yes'), H.c('g', 'yes'), H.c('g', 'yes'), H.c('p', '<b>yes</b>'), H.c('r', 'no'), H.c('r', 'no'), H.c('r', 'no'), H.c('r', 'no')]
      ])}
      <p>The answer ⌊√20⌋ = ${H.c('p', '4')} is the <b>last "yes"</b>. Searching x in <code>[0, 20]</code> takes about log₂ 20 ≈ 5 guesses instead of trying 0, 1, 2, 3, 4, 5 one by one. For n = 2·10<sup>9</sup> it is ~31 guesses instead of ~44,000.</p>
      <h4>The general recipe ("last yes" / "first yes")</h4>
      <ol>
        <li><b>Range:</b> smallest and largest possible answer (<code>lo = 0, hi = n</code>).</li>
        <li><b>Question:</b> <code>ok(x)</code> = "is x·x ≤ n?" — must be monotonic: yes…yes no…no.</li>
        <li><b>Search with an ans variable:</b> if <code>ok(mid)</code> → it is a valid answer, save it, try bigger (<code>lo = mid + 1</code>); else try smaller (<code>hi = mid - 1</code>).</li>
      </ol>
      ${H.table(['Shape of ok(x)', 'You want', 'On ok(mid) == yes'], [
        ['yes yes yes <b>no</b> no', 'the <b>last yes</b> (biggest that works)', 'ans = mid; lo = mid + 1'],
        ['no no <b>yes</b> yes yes', 'the <b>first yes</b> (smallest that works)', 'ans = mid; hi = mid - 1']
      ])}
      <p>${H.c('r', 'Overflow trap:')} <code>mid * mid</code> with mid ≈ 10<sup>9</sup> is 10<sup>18</sup>, far beyond <code>int</code>. Compute it as <code>(long) mid * mid</code>, or compare <code>mid ≤ n / mid</code>.</p>
      <h4>Real numbers (precision search)</h4>
      <p>For a decimal answer like √2 or a cube root, there is no "mid + 1". Just repeat <code>mid = (lo + hi) / 2</code> a fixed number of times (e.g. 100): each round halves the gap, so after 100 rounds the error is smaller than anything a <code>double</code> can show.</p>`,
    clues: [
      '"Compute <b>⌊√x⌋</b> without using sqrt()" / "the largest k such that k² ≤ n" → binary search on k.',
      '"Find the <b>smallest x</b> such that f(x) ≥ target" where f only increases → first "yes".',
      'Answer range is <b>huge</b> (x up to 2<sup>31</sup> - 1 or 10<sup>18</sup>) but checking one guess is cheap → search the answer, not an array.',
      '"Return the answer with an error of at most 10<sup>-6</sup>" → real-valued binary search with a fixed number of iterations.',
      'A guessing game: "higher / lower" feedback → classic halving.'
    ],
    code: [`
      // Integer square root: largest x with x*x <= n.
      static int mySqrt(int n) {
          int lo = 0, hi = n, ans = 0;
          while (lo <= hi) {
              int mid = lo + (hi - lo) / 2;
              if ((long) mid * mid <= n) {   // long: mid*mid can be ~4*10^18
                  ans = mid;                 // mid fits: remember it
                  lo = mid + 1;              // try a bigger side
              } else {
                  hi = mid - 1;              // too big: try smaller
              }
          }
          return ans;
      }`, `
      // Real-valued search: cube root of a positive number, any precision.
      static double cubeRoot(double v) {
          double lo = 0, hi = Math.max(1.0, v);   // the answer lies in [0, max(1, v)]
          for (int it = 0; it < 100; it++) {      // 100 halvings: gap becomes tiny
              double mid = (lo + hi) / 2;
              if (mid * mid * mid < v) lo = mid;  // too small: answer is right of mid
              else hi = mid;                      // big enough: answer is mid or left
          }
          return lo;
      }`],
    codeTitle: ['Integer search on f(x) = x*x', 'Precision search on doubles'],
    viz: {
      title: 'Integer square root: guess, square, compare',
      input: '20',
      inputLabel: 'n (0 to 2147483647; the candidate strip is drawn when n ≤ 24)',
      gen: function (input) {
        var s = String(input === undefined ? '' : input).trim();
        if (!/^\d+$/.test(s)) throw new Error('Enter one whole number n ≥ 0, e.g. 40.');
        var n = Number(s);
        if (n > 2147483647) throw new Error('Keep n within int range (≤ 2147483647).');
        var lo = 0, hi = n, ans = 0, frames = [], tried = [], th = {};
        // For small n we also draw every candidate answer 0..n as an array with lo / mid / hi pointers.
        function candArr(l, m, h, best, lab) {
          if (n > 24) return { type: 'text', label: 'candidates', html: 'n is large, so the candidate strip is not drawn: we only track lo, mid and hi.' };
          var vals = [], hl = {}, pp = {};
          for (var v = 0; v <= n; v++) { vals.push(v); if (v < l || v > h) hl[v] = 'done'; }
          if (m !== null) hl[m] = 'cur';
          if (best !== null && best >= 0) hl[best] = 'sel';
          if (l <= h) { pp.lo = l; pp.hi = h; }
          if (m !== null) pp.mid = m;
          return { type: 'array', label: lab || 'candidate answers x (faded = thrown away)', values: vals, hl: hl, ptr: m09ptr(pp, n + 1) };
        }
        frames.push({ narr: 'We want the biggest x with x·x ≤ ' + n + '. Candidate answers are 0..' + n + '. Bigger x → bigger x·x, so "fits?" goes yes…yes then no…no. Binary search finds the last yes.',
          parts: [candArr(lo, null, hi, null), { type: 'vars', vals: { n: n, lo: lo, hi: hi, ans: ans } },
            { type: 'text', label: 'candidate range', html: '<b>[ ' + lo + ' ........ ' + hi + ' ]</b>' }] });
        while (lo <= hi) {
          var mid = lo + Math.floor((hi - lo) / 2), sq = mid * mid, ok = sq <= n, before = candArr(lo, mid, hi, null, 'candidates when we guess (amber = mid)');
          tried.push(mid + '²=' + sq); th[tried.length - 1] = ok ? 'ok' : 'bad';
          var why;
          if (ok) { ans = mid; why = '<span class="c-g">' + mid + '² = ' + sq + ' ≤ ' + n + ' → fits.</span> Save ans = ' + mid + ' and try bigger: lo = ' + (mid + 1) + '.'; lo = mid + 1; }
          else { why = '<span class="c-r">' + mid + '² = ' + sq + ' &gt; ' + n + ' → too big.</span> Every x ≥ ' + mid + ' is too big too, so hi = ' + (mid - 1) + '.'; hi = mid - 1; }
          var hl2 = {}; hl2[tried.length - 1] = th[tried.length - 1];
          for (var k in th) if (+k !== tried.length - 1) hl2[k] = 'done';
          frames.push({ narr: 'Guess mid = ' + mid + '. ' + why,
            parts: [before, candArr(lo, null, hi, ans, 'after the move (purple = best answer so far)'), { type: 'vars', vals: { n: n, mid: mid, 'mid·mid': sq, lo: lo, hi: hi, ans: ans }, hl: { 'mid·mid': ok ? 'ok' : 'bad', ans: 'sel' } },
              { type: 'array', label: 'guesses so far (green = fits, red = too big)', values: tried.slice(), hl: hl2, showIdx: false },
              { type: 'text', label: 'remaining range', html: lo <= hi ? '<b>[ ' + lo + ' ... ' + hi + ' ]</b>' : '<span class="c-m">empty</span>' }] });
        }
        frames.push({ narr: '<span class="c-p">Range is empty. The last "fits" we saved is ans = ' + ans + '</span>: ' + ans + '² = ' + ans * ans + ' ≤ ' + n + ' but ' + (ans + 1) + '² = ' + (ans + 1) * (ans + 1) + ' &gt; ' + n + '. It took ' + tried.length + ' guesses.',
          parts: [candArr(1, null, 0, ans), { type: 'vars', vals: { n: n, answer: ans, guesses: tried.length }, hl: { answer: 'sel' } },
            { type: 'array', label: 'all guesses', values: tried.slice(), hl: th, showIdx: false }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'The edge inputs 0, 1 and the int maximum',
        html: `${H.table(['x', 'search range', 'answer', 'note'], [
            ['0', '[0, 0]', '0', 'one round: 0·0 = 0 ≤ 0'],
            ['1', '[0, 1]', '1', 'mid = 0 fits, then mid = 1 fits'],
            ['2,147,483,647', '[0, 2,147,483,647]', '46,340', '46,340² = 2,147,395,600 ≤ x but 46,341² = 2,147,488,281 &gt; x']
          ])}
          <p>Always test 0, 1 and the biggest allowed input; those are where overflow and empty ranges show up.</p>`
      },
      {
        title: 'Overflow-free comparison with division',
        html: `<p>Instead of casting to long you can compare <code>mid ≤ x / mid</code> (for mid &gt; 0). Integer division rounds down, and for whole numbers <code>mid · mid ≤ x ⇔ mid ≤ ⌊x / mid⌋</code>, so the test is exact. Handy in languages or problems where even <code>long</code> could overflow (e.g. searching k with k³ ≤ 10<sup>18</sup>).</p>`,
        code: `int x = 2147483647, lo = 1, hi = x, ans = 0;
while (lo <= hi) {
    int mid = lo + (hi - lo) / 2;
    if (mid <= x / mid) { ans = mid; lo = mid + 1; }   // mid*mid <= x, no multiplication
    else hi = mid - 1;
}
System.out.println(ans); // 46340`
      },
      {
        title: 'Real-valued search: √2 to 6 decimal places',
        html: `<p>Range [1, 2], because 1² &lt; 2 &lt; 2². Each round halves the gap:</p>
          ${H.table(['round', 'lo', 'hi', 'mid', 'mid² vs 2'], [
            ['1', '1', '2', '1.5', '2.25 &gt; 2 → hi = 1.5'],
            ['2', '1', '1.5', '1.25', '1.5625 &lt; 2 → lo = 1.25'],
            ['3', '1.25', '1.5', '1.375', '1.890625 &lt; 2 → lo = 1.375'],
            ['4', '1.375', '1.5', '1.4375', '2.066 &gt; 2 → hi = 1.4375'],
            ['…', '…', '…', '…', 'after 20 rounds the gap is 2<sup>-20</sup> ≈ 10<sup>-6</sup>']
          ])}
          <p>Gap after k rounds = (hi − lo) / 2<sup>k</sup>. To get error 10<sup>-6</sup> on a gap of 1 you need k ≈ 20 rounds; 100 rounds is safely more than enough for a double.</p>`
      },
      {
        title: 'Guess the number (the API version)',
        html: `<p>"I'm thinking of a number in 1..n; <code>guess(x)</code> tells you higher / lower / correct." There is no array — the candidate answers 1..n <b>are</b> the search space and the feedback is the comparison. n = 100 → at most 7 guesses (2<sup>7</sup> = 128 ≥ 100). The same thinking solves "First Bad Version" (find the first true of <code>isBad(v)</code>).</p>`
      }
    ],
    deepDive: `<p><b>Bisection vs Newton.</b> Binary search gains <b>one correct bit</b> per round (linear convergence). Newton's method for √x, <code>r = (r + x / r) / 2</code>, roughly <b>doubles the number of correct digits</b> per round (quadratic convergence), so ~5–6 rounds suffice for a double. Integer Newton (<code>r = (r + x / r) / 2</code> until it stops decreasing) is what fast libraries use for big-integer square roots (Java's <code>BigInteger.sqrt()</code>, Python's <code>math.isqrt</code>). Binary search is simpler, always safe, and works for <i>any</i> monotonic function — Newton needs a derivative and a good start.</p>
      <p><b>Can't I just use Math.sqrt?</b> IEEE 754 requires <code>sqrt</code> to be correctly rounded, so <code>(int) Math.sqrt(x)</code> is right for every <code>int</code>. For <code>long</code> values above 2<sup>53</sup>, the double cannot represent x exactly and the result can be off by one — production code then corrects with <code>while (r*r &gt; x) r--; while ((r+1)*(r+1) ≤ x) r++;</code> (careful with overflow). Interviews ask for the binary search to test your monotonic-function thinking.</p>
      <p><b>Stopping rules for doubles.</b> <code>while (hi - lo &gt; 1e-9)</code> can loop forever when the numbers are large (e.g. 10<sup>12</sup>): neighbouring doubles there are farther apart than 10<sup>-9</sup>, so the gap never gets that small. A <b>fixed iteration count</b> (60–100) always terminates. Relative error <code>(hi - lo) &gt; 1e-9 * max(1, |lo|)</code> is the other safe option.</p>
      <p><b>Searching any monotonic f.</b> The same skeleton finds: the smallest n with n! &gt; 10<sup>18</sup>, the smallest radius covering all houses, the time when two moving objects meet, or the k-th smallest value in an implicit table (count how many values are ≤ mid). Requirement: f monotonic and cheap to evaluate.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant will happily answer "compute sqrt" with <code>Math.sqrt</code> or with Newton's method. In an interview, say why you choose binary search (simple, provably terminates, works on any monotonic predicate) and mention Newton as the faster alternative — that shows breadth.</p>
      <p><b>Use AI as a partner:</b> ask it to test your <code>mySqrt</code> against <code>(long) Math.floor(Math.sqrt(x))</code> for all x in [0, 10<sup>6</sup>] plus the 1,000 largest ints. Ask <code>What is the largest x for which my int version overflows if I remove the long cast?</code> to really understand the overflow.</p>
      <p><b>Where AI goes wrong:</b> <code>hi = x / 2</code> without handling x = 1 (answer 1 is outside [0, 0]), <code>mid * mid</code> in int, or a <code>while (hi - lo &gt; eps)</code> loop that never ends on large inputs.</p>
      <p><b>What you must still own:</b> recognizing that "no array, but a range of answers + a yes/no test that flips once" is still binary search. That shift — from searching <i>data</i> to searching <i>answers</i> — is the bridge to the next topics.</p>`,
    problems: [{
      title: 'Integer Square Root (Sqrt(x))',
      level: 'Easy',
      tags: ['binary search on answer', 'monotonic'],
      statement: `<p>Given a non-negative integer <code>x</code>, return <b>⌊√x⌋</b> — the square root rounded down. You may not use any built-in power or sqrt function.</p>`,
      constraints: `0 ≤ x ≤ 2<sup>31</sup> - 1`,
      example: `<p>x = 20 → Output ${H.c('p', '4')}:</p>
        ${H.table(['k', '3', '4', '5'], [['k²', '9', H.c('g', '16 ≤ 20'), H.c('r', '25 &gt; 20')]])}
        <p>4 is the biggest whole number whose square still fits. x = 8 → 2 (√8 ≈ 2.83, rounded down).</p>`,
      brute: {
        why: `<p>Try k = 0, 1, 2, ... while <code>(k+1)² ≤ x</code>. That is √x steps: for x = 2·10<sup>9</sup> about 44,700 steps — acceptable once, but too slow if asked for many queries, and it ignores that k² only grows. Binary search needs ~31 steps.</p>`,
        code: `
          int brute(int x) {
              long k = 0;
              while ((k + 1) * (k + 1) <= x) k++;   // walk up one by one
              return (int) k;
          }`
      },
      mcq: {
        q: `For x = 2147483647 the search tries mid = 1073741823. What goes wrong with <code>if (mid * mid &lt;= x)</code> in <code>int</code>?`,
        options: [`Nothing, it is fine`, `mid * mid overflows and becomes a garbage value, so the comparison lies`, `It throws an ArithmeticException`, `Binary search cannot handle large x`],
        answer: 1,
        explain: `1073741823² ≈ 1.15·10<sup>18</sup>, far above 2,147,483,647. Java int multiplication silently wraps around, giving a wrong (even negative) number. Cast to long first: <code>(long) mid * mid</code>.`
      },
      hints: [
        `<p><b>Aha:</b> "k² ≤ x?" is yes for small k and no for big k, switching only once. The answer is the last yes in the range <code>[0, x]</code>.</p>`,
        `<p>No data structure: lo, hi, mid and an <code>ans</code> variable. If mid fits, save it and move lo up; otherwise move hi down.</p>`,
        `<p>Traps: <code>(long) mid * mid</code> to avoid overflow; x = 0 and x = 1 must return themselves; don't use floating sqrt. Recipe: lo = 0, hi = x, ans = 0; while lo ≤ hi: mid; if mid² ≤ x → ans = mid, lo = mid+1; else hi = mid-1. Return ans.</p>`
      ],
      solution: {
        approach: `<p>Binary search over candidate answers 0..x for the last k with k² ≤ x.</p>`,
        code: `
          class Solution {
              public int mySqrt(int x) {
                  int lo = 0, hi = x, ans = 0;
                  while (lo <= hi) {
                      int mid = lo + (hi - lo) / 2;          // safe middle
                      long sq = (long) mid * mid;             // square in long: no overflow
                      if (sq <= x) {
                          ans = mid;                          // mid works: best so far
                          lo = mid + 1;                       // look for a bigger one
                      } else {
                          hi = mid - 1;                       // mid too big, so are all larger values
                      }
                  }
                  return ans;
              }

              public static void main(String[] args) {
                  Solution s = new Solution();
                  System.out.println(s.mySqrt(20));          // 4
                  System.out.println(s.mySqrt(8));           // 2
                  System.out.println(s.mySqrt(2147483647));  // 46340
              }
          }`,
        dry: {
          head: ['lo', 'hi', 'mid', 'mid²', '≤ 20?', 'action', 'ans'],
          rows: [
            ['0', '20', '10', '100', H.c('r', 'no'), 'hi = 9', '0'],
            ['0', '9', '4', '16', H.c('g', 'yes'), 'ans = 4, lo = 5', '4'],
            ['5', '9', '7', '49', H.c('r', 'no'), 'hi = 6', '4'],
            ['5', '6', '5', '25', H.c('r', 'no'), 'hi = 4', '4'],
            ['5', '4', '–', '–', '–', 'lo &gt; hi → stop', H.c('p', '<b>4</b>')]
          ]
        },
        complexity: `<p><b>Time O(log x)</b>: the candidate range 0..x halves each round, so at most ~31 rounds for any int. <b>Space O(1)</b>.</p>`
      }
    }]
  });

  /* ================= TOPIC 6: Binary Search on Answer Space: maximize the minimum ================= */
  topics.push({
    title: 'Binary Search on the Answer: Maximize the Minimum (Aggressive Cows)',
    analogy: `<p>A cinema has seats in one long row (some seats broken), and 3 friends who each caught a cold want to sit <b>as far apart as possible</b>. Directly computing "the best spacing" is hard. But a <b>yes/no</b> question is easy: <b>"Can we sit everyone at least 3 seats apart?"</b> Just walk left to right, sit the first friend in the first seat, and sit the next friend in the first seat that is ≥ 3 away. If 3 works, then 2 and 1 obviously work too; if 5 fails, 6 and 7 fail too. So guess the spacing, check it, and binary search the guesses.</p>`,
    explain: `<p>So far we searched for a position in an array. Now we search for the <b>answer itself</b>. This is called <b>binary search on answer space</b> and it is one of the most common interview patterns.</p>
      <h4>The 4-step recipe</h4>
      <ol>
        <li><b>Answer range:</b> what is the smallest and largest the answer could ever be? (e.g. distance from 1 to <code>max - min</code>).</li>
        <li><b>Feasibility check <code>can(x)</code>:</b> "Is answer x achievable?" — usually a simple <b>greedy</b> left-to-right pass, O(N).</li>
        <li><b>Monotonic?</b> Make sure the yes/no answers flip only once.</li>
        <li><b>Binary search</b> the range for the last yes (or first yes).</li>
      </ol>
      <h4>The two shapes</h4>
      ${H.table(['Problem says', 'Shape of can(x)', 'Why', 'Want'], [
        ['<b>"maximize the minimum"</b> (cows, seats, gaps)', H.c('g', 'yes yes yes') + ' ' + H.c('r', 'no no'), 'if friends can be 3 apart, they can be 2 apart (needs less)', 'the <b>last yes</b>'],
        ['<b>"minimize the maximum"</b> (painters, books, ship)', H.c('r', 'no no') + ' ' + H.c('g', 'yes yes yes'), 'if each worker can carry 60, they can carry 70 (allowed more)', 'the <b>first yes</b>']
      ])}
      <h4>Aggressive Cows, step by step</h4>
      <p>Stalls at ${H.arr([1, 2, 4, 8, 9], { label: 'stalls' })} and 3 cows. Answer range: <code>[1, 9 - 1 = 8]</code>.</p>
      ${H.table(['gap d', 'greedy placement', 'cows placed', 'can(d)?'], [
        ['1', '1, 2, 4 ...', '5', H.c('g', 'yes')],
        ['2', '1, 4, 8', '3', H.c('g', 'yes')],
        ['3', '1, 4, 8', '3', H.c('p', '<b>yes ← last</b>')],
        ['4', '1, 8 (next must be ≥ 12)', '2', H.c('r', 'no')],
        ['5 … 8', 'even fewer', '≤ 2', H.c('r', 'no')]
      ])}
      <p>Answer = ${H.c('p', '3')}. Binary search finds it with ~3 checks instead of 8.</p>
      <h4>Why is greedy placement correct?</h4>
      <p>Putting each cow in the <b>earliest</b> allowed stall leaves the most room for the cows after it. Choosing a later stall can never help place more cows.</p>
      <p><b>Cost:</b> each check is O(N), and we do log₂(range) checks → <b>O(N log(range))</b>, plus O(N log N) to sort. With range = 10<sup>9</sup>, that is only ~30 checks.</p>`,
    clues: [
      '"<b>Maximize the minimum</b> distance / gap / sweetness / magnetic force" → binary search on the answer, want the last yes.',
      '"Place K items (cows, routers, balls, friends) so the <b>closest pair is as far apart as possible</b>" → Aggressive Cows template.',
      'The answer range is <b>huge</b> (positions up to 10<sup>9</sup>) but N is moderate (10<sup>5</sup>) → O(N log(range)) is ~3·10<sup>6</sup> steps.',
      'Ask yourself: <b>"If x works, does every smaller x also work?"</b> If yes, the answer space is monotonic → binary search it.',
      'Hard to compute the best answer directly, but <b>easy to check a guessed answer</b> greedily → answer-space search.'
    ],
    viz: {
      title: 'Aggressive Cows: search the answer space',
      input: '1 2 4 8 9 12 | 3',
      inputLabel: 'stall positions | number of cows',
      gen: function (input) {
        var p = m09split(input, 2, 'stall positions | cows   e.g. 1 2 4 8 9 | 3');
        var st = m09nums(p[0], 'stall positions').slice().sort(function (x, y) { return x - y; });
        var k = Number(p[1].trim());
        if (!p[1].trim() || isNaN(k) || Math.floor(k) !== k || k < 2) throw new Error('Number of cows must be a whole number ≥ 2.');
        if (k > st.length) throw new Error('More cows than stalls: impossible.');
        if (st.length > 14) throw new Error('Please use at most 14 stalls.');
        for (var q = 1; q < st.length; q++) if (st[q] === st[q - 1]) throw new Error('Stall positions must be different.');
        var maxD = st[st.length - 1] - st[0];
        if (maxD > 24) throw new Error('Keep (largest - smallest position) ≤ 24 so every candidate distance fits on screen.');
        var cand = [], i;
        for (i = 1; i <= maxD; i++) cand.push(i);
        var known = {}, lo = 1, hi = maxD, ans = 0, frames = [];
        function candPart(mid) {
          var hl = {};
          for (var j = 0; j < cand.length; j++) {
            if (known[j + 1]) hl[j] = known[j + 1];
            else if (j + 1 >= lo && j + 1 <= hi) hl[j] = 'win';
          }
          if (mid) hl[mid - 1] = 'cur';
          var pp = {}; if (lo <= hi) { pp.lo = lo - 1; pp.hi = hi - 1; } if (mid) pp.mid = mid - 1;
          return { type: 'array', label: 'candidate answers d (green = feasible, red = not)', values: cand.slice(), hl: hl, ptr: m09ptr(pp, cand.length), showIdx: false };
        }
        frames.push({ narr: 'Sorted stalls: ' + st.join(', ') + '. ' + k + ' cows. The minimum gap d can be anything from 1 to ' + maxD + ' (last - first). Instead of searching an array, we search these <b>candidate answers</b>.',
          parts: [{ type: 'array', label: 'stalls', values: st.slice() }, candPart(0), { type: 'vars', vals: { cows: k, lo: lo, hi: hi, ans: '?' } }] });
        while (lo <= hi) {
          var mid = lo + Math.floor((hi - lo) / 2);
          var placed = [0], last = st[0];
          for (i = 1; i < st.length; i++) if (st[i] - last >= mid) { placed.push(i); last = st[i]; }
          var ok = placed.length >= k;
          var sh = {}, sp = {};
          for (i = 0; i < st.length; i++) sh[i] = 'done';
          placed.forEach(function (ix, c) { sh[ix] = c < k ? 'ok' : 'win'; sp[ix] = 'cow' + (c + 1); });
          frames.push({ narr: 'Try mid = <b>' + mid + '</b>: can ' + k + ' cows be at least ' + mid + ' apart? Greedy: cow 1 at ' + st[0] + ', then each next cow in the first stall ≥ ' + mid + ' away. We managed <b>' + placed.length + '</b> cow(s) at ' + placed.map(function (ix) { return st[ix]; }).join(', ') + '.',
            parts: [{ type: 'array', label: 'stalls (green = cow placed)', values: st.slice(), hl: sh, ptr: sp }, candPart(mid),
              { type: 'vars', vals: { cows: k, lo: lo, mid: mid, hi: hi, placed: placed.length, ans: ans || '?' }, hl: { placed: ok ? 'ok' : 'bad' } }] });
          var why;
          if (ok) {
            for (i = 1; i <= mid; i++) known[i] = 'ok';
            ans = mid; why = '<span class="c-g">' + placed.length + ' ≥ ' + k + ' → d = ' + mid + ' is feasible.</span> So every smaller d is feasible too (all green). Save ans = ' + mid + ' and try a bigger gap: lo = ' + (mid + 1) + '.'; lo = mid + 1;
          } else {
            for (i = mid; i <= maxD; i++) known[i] = 'bad';
            why = '<span class="c-r">Only ' + placed.length + ' &lt; ' + k + ' → d = ' + mid + ' is NOT feasible.</span> Any bigger gap is even harder (all red). Try smaller: hi = ' + (mid - 1) + '.'; hi = mid - 1;
          }
          frames.push({ narr: why,
            parts: [{ type: 'array', label: 'stalls', values: st.slice() }, candPart(0),
              { type: 'vars', vals: { cows: k, lo: lo, hi: hi, ans: ans || '?' }, hl: { ans: 'sel' } }] });
        }
        var fin = candPart(0); fin.hl[ans - 1] = 'sel';
        var ph = {}, pptr = {}, last2 = st[0], c2 = 1; ph[0] = 'sel'; pptr[0] = 'cow1';
        for (i = 1; i < st.length && c2 < k; i++) if (st[i] - last2 >= ans) { ph[i] = 'sel'; pptr[i] = 'cow' + (++c2); last2 = st[i]; }
        frames.push({ narr: '<span class="c-p">lo passed hi. The boundary between green and red is at d = ' + ans + '</span>: that is the largest possible minimum distance. Final placement shown above.',
          parts: [{ type: 'array', label: 'stalls (best placement)', values: st.slice(), hl: ph, ptr: pptr }, fin, { type: 'vars', vals: { answer: ans }, hl: { answer: 'sel' } }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Two cows: no search needed',
        html: `<p>Stalls ${H.arr([3, 9, 14, 20], { label: 'stalls', hl: { 0: 'g', 3: 'g' } })} with k = 2. Put one cow at each end: the gap is ${H.c('g', '20 − 3 = 17')}, and no placement can beat the full span. The binary search would also land on 17 (the very top of the range [1, 17]) — a handy sanity check for your code.</p>`
      },
      {
        title: 'Unsorted input — sort first!',
        html: `<p>Input ${H.arr([9, 1, 8, 2, 4], { label: 'given' })} k = 3. If you run the greedy on the raw order, "first stall ≥ d away from the previous cow" means nothing (9 then 1 is a <i>backwards</i> jump). After sorting → ${H.arr([1, 2, 4, 8, 9], { label: 'sorted' })} and the answer is 3 (cows at 1, 4, 8). Forgetting to sort is the most common bug in this problem.</p>`
      },
      {
        title: 'Same skeleton, different costume: Magnetic Force Between Two Balls',
        html: `<p>"Place m balls in baskets at <code>position[i]</code> to <b>maximize the minimum magnetic force</b> |x − y|." Positions [1, 2, 3, 4, 7], m = 3 → answer ${H.c('p', '3')} (balls at 1, 4, 7). It is Aggressive Cows word for word: sort, binary search d in [1, 6], greedy check.</p>`,
        code: `int[] pos = {1, 2, 3, 4, 7};
int m = 3, lo = 1, hi = pos[pos.length - 1] - pos[0], ans = 0;
while (lo <= hi) {
    int d = lo + (hi - lo) / 2, count = 1, last = pos[0];
    for (int i = 1; i < pos.length; i++) if (pos[i] - last >= d) { count++; last = pos[i]; }
    if (count >= m) { ans = d; lo = d + 1; } else hi = d - 1;
}
System.out.println(ans); // 3`
      },
      {
        title: 'Seeing the monotonic yes/no strip',
        html: `<p>Stalls [0, 3, 4, 7, 10, 9 → sorted 0 3 4 7 9 10], k = 4. Feasibility for each d:</p>
          ${H.table(['d', '1', '2', '3', '4', '5', '…', '10'], [
            ['can(d)?', H.c('g', 'yes'), H.c('g', 'yes'), H.c('p', '<b>yes</b>'), H.c('r', 'no'), H.c('r', 'no'), H.c('r', 'no'), H.c('r', 'no')]
          ])}
          <p>d = 3: cows at 0, 3, 7, 10 ✔. d = 4: 0, 4, 9 → only 3 cows ✘. Answer 3. Binary search touches only ~4 of these columns.</p>`
      }
    ],
    deepDive: `<p><b>Why greedy is optimal (exchange argument).</b> Take any valid placement for distance d, sorted by position. Compare it with greedy: greedy's first cow is at the first stall, which is ≤ the optimal first cow. Inductively, if greedy's i-th cow is at or left of the optimal i-th cow, then the optimal (i+1)-th cow is ≥ d away from the optimal i-th cow and therefore also ≥ d from greedy's i-th cow — so greedy can place its (i+1)-th cow there or even earlier. Greedy never falls behind, so it places at least as many cows.</p>
      <p><b>Why "feasible" is monotonic.</b> A placement that keeps every pair ≥ d apart also keeps them ≥ d − 1 apart. So can(d) ⇒ can(d − 1): the strip is yes…yes no…no. Always state this sentence in an interview — it is the license to binary search.</p>
      <p><b>Tighter range.</b> The answer is at most <code>(max − min) / (k − 1)</code> (k cows need k − 1 gaps summing to ≤ span). Using it as hi saves a couple of rounds — nice, but not required.</p>
      <p><b>Generic helper.</b> Write once, reuse everywhere:</p>
      <pre>long lastTrue(long lo, long hi, LongPredicate ok) {   // ok: true...true false...false
    long ans = lo - 1;
    while (lo &lt;= hi) { long mid = lo + (hi - lo) / 2;
        if (ok.test(mid)) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans;                                         // lo - 1 means "none is true"
}</pre>
      <p><b>Name you may hear:</b> this is called <i>parametric search</i>: turn an optimization problem ("maximize d") into a sequence of decision problems ("is d achievable?"). Cost = (cost of one decision) × log(range). It is used in scheduling, facility placement (spread out cell towers / warehouses), and geometric algorithms.</p>`,
    aiEra: `<p><b>What AI changes:</b> if you paste "Aggressive Cows" into an assistant you get the right code. But interviewers now prefer <b>disguised</b> versions (routers in houses, balls in baskets, minimum distance between gas stations) precisely so that pattern recall from a prompt is not enough.</p>
      <p><b>Use AI as a partner:</b> ask <code>Give me 5 problems that are 'maximize the minimum' in disguise, without telling me the solution</code>, then practice writing only the range + predicate for each. Also ask it to brute force tiny inputs (try every subset of stalls) to validate your greedy check.</p>
      <p><b>Where AI goes wrong:</b> starting lo at 0 (harmless but sloppy) or hi at max(position) instead of max − min, forgetting to sort, and occasionally flipping the shape (searching for the first true when the strip is yes…no).</p>
      <p><b>What you must still own:</b> the two sentences "feasibility is monotonic because…" and "greedy is optimal because…". Without them the solution is a guess that happened to pass.</p>`,
    problems: [{
      title: 'Aggressive Cows',
      level: 'Medium',
      tags: ['binary search on answer', 'greedy', 'maximize the minimum'],
      statement: `<p>There are <code>n</code> stalls at positions <code>stalls[i]</code> on a straight line and <code>k</code> cows. Place the cows in different stalls so that the <b>minimum distance between any two cows is as large as possible</b>. Return that largest minimum distance.</p>`,
      constraints: `2 ≤ k ≤ n ≤ 10<sup>5</sup>, 0 ≤ stalls[i] ≤ 10<sup>9</sup>, positions distinct`,
      example: `${H.arr([1, 2, 4, 8, 9], { label: 'stalls', hl: { 0: 'g', 2: 'g', 3: 'g' } })}
        <p>k = 3 → Output ${H.c('p', '3')}: cows at ${H.c('g', '1, 4, 8')}; gaps are 3 and 4, so the minimum gap is 3. No placement achieves a minimum of 4 (after 1 and 8 there is no stall ≥ 12).</p>`,
      brute: {
        why: `<p>Try every d from 1 up to <code>max - min</code> and run the greedy check for each; the last d that works is the answer. The range can be 10<sup>9</sup>, so that is 10<sup>9</sup> × N work → hopeless. The waste: once d = 3 works we already know 1 and 2 work, and once d = 4 fails we know 5, 6, ... fail; checking them one by one learns nothing new.</p>`,
        code: `
          int brute(int[] stalls, int k) {
              Arrays.sort(stalls);
              int best = 0;
              for (int d = 1; d <= stalls[stalls.length - 1] - stalls[0]; d++) {
                  int count = 1, last = stalls[0];
                  for (int i = 1; i < stalls.length; i++) {
                      if (stalls[i] - last >= d) { count++; last = stalls[i]; }
                  }
                  if (count >= k) best = d;   // d is achievable
                  else break;                 // bigger d can only be worse
              }
              return best;
          }`
      },
      mcq: {
        q: `You checked d = 5 and the greedy could place all k cows. What do you know?`,
        options: [`5 is the final answer`, `Every d ≤ 5 also works, so the answer is ≥ 5 → search right`, `Every d ≥ 5 also works → search left`, `Nothing; need to check d = 4`],
        answer: 1,
        explain: `If cows can be at least 5 apart, the same placement has them at least 4, 3, 2, 1 apart. So the answer is 5 or bigger: save ans = 5 and set lo = 6.`
      },
      hints: [
        `<p><b>Aha:</b> "Can we keep all cows at least d apart?" is monotonic in d: yes, yes, ..., yes, no, no. The answer is the last yes. The range of d is <code>[1, max - min]</code>.</p>`,
        `<p>Sort the stalls. The check is greedy: put cow 1 in the first stall, keep <code>last</code> = position of the latest cow, and place the next cow in the first stall with <code>pos - last ≥ d</code>. Count cows; feasible if count ≥ k.</p>`,
        `<p>Traps: forget to sort → greedy is wrong; <code>hi = max - min</code>, not max; positions up to 10<sup>9</sup> → <code>mid = lo + (hi - lo) / 2</code>; you can stop the greedy early once k cows are placed. Recipe: sort; lo = 1, hi = max-min; while lo ≤ hi: mid; if canPlace(mid) → ans = mid, lo = mid+1 else hi = mid-1.</p>`
      ],
      solution: {
        approach: `<p>Sort, then binary search the distance d with a greedy O(N) feasibility check.</p>`,
        code: `
          import java.util.*;

          class Solution {
              // Can we place k cows so that every two neighbouring cows are >= d apart?
              static boolean canPlace(int[] stalls, int k, int d) {
                  int count = 1;                  // first cow goes into the first stall
                  int last = stalls[0];           // position of the most recent cow
                  for (int i = 1; i < stalls.length; i++) {
                      if (stalls[i] - last >= d) { // far enough from the previous cow
                          count++;
                          last = stalls[i];
                          if (count >= k) return true; // all cows placed: early exit
                      }
                  }
                  return count >= k;
              }

              static int aggressiveCows(int[] stalls, int k) {
                  Arrays.sort(stalls);                                // greedy needs left-to-right order
                  int lo = 1, hi = stalls[stalls.length - 1] - stalls[0];
                  int ans = 0;
                  while (lo <= hi) {
                      int mid = lo + (hi - lo) / 2;                   // a guessed minimum distance
                      if (canPlace(stalls, k, mid)) {
                          ans = mid;                                  // feasible: remember it
                          lo = mid + 1;                               // try to spread cows further
                      } else {
                          hi = mid - 1;                               // too ambitious: shrink the gap
                      }
                  }
                  return ans;
              }

              public static void main(String[] args) {
                  System.out.println(aggressiveCows(new int[]{1, 2, 8, 4, 9}, 3)); // 3
              }
          }`,
        dry: {
          head: ['lo', 'hi', 'mid (d)', 'greedy cows at', 'count', 'feasible?', 'action', 'ans'],
          rows: [
            ['1', '8', '4', '1, 8', '2', H.c('r', 'no'), 'hi = 3', '0'],
            ['1', '3', '2', '1, 4, 8', '3', H.c('g', 'yes'), 'ans = 2, lo = 3', '2'],
            ['3', '3', '3', '1, 4, 8', '3', H.c('g', 'yes'), 'ans = 3, lo = 4', '3'],
            ['4', '3', '–', '–', '–', '–', 'lo &gt; hi → stop', H.c('p', '<b>3</b>')]
          ]
        },
        complexity: `<p><b>Time O(N log N + N log R)</b> where R = max - min: sorting once, then about log₂ R (≤ 30) feasibility checks, each one pass over the stalls. <b>Space O(1)</b> extra (besides sorting).</p>`
      }
    }]
  });

  /* ================= TOPIC 7: Minimize the Maximum: Painter's Partition & Allocate Books ================= */
  topics.push({
    title: 'Binary Search on the Answer: Minimize the Maximum (Painters, Books)',
    analogy: `<p>Four boxes of homework pages must be split among 2 friends. Each friend takes a <b>continuous run</b> of boxes (no cherry-picking), and everybody waits until the <b>busiest friend</b> finishes. You want that busiest load to be <b>as small as possible</b>. Hard to compute directly — so ask a yes/no question: <b>"If nobody is allowed more than 60 pages, are 2 friends enough?"</b> Hand boxes to friend 1 until the next box would push them over 60, then switch to friend 2, and so on. Count friends needed. A bigger limit can only need <b>fewer or equal</b> friends — monotonic!</p>`,
    explain: `<p>This is the mirror image of Aggressive Cows. Now we <b>minimize the maximum</b> load, and the yes/no answers look like <code>no no no yes yes yes</code>. We want the <b>first yes</b>.</p>
      <h4>Answer range</h4>
      <ul>
        <li><b>lo = max(a)</b>: someone has to take the biggest single item, so the limit can never be smaller.</li>
        <li><b>hi = sum(a)</b>: one worker takes everything — always possible.</li>
      </ul>
      <h4>Feasibility check: "how many workers for limit L?"</h4>
      <p>Walk left to right with a running load. If adding the next item would exceed L, start a new worker. Then <code>feasible = workersNeeded ≤ k</code>.</p>
      ${H.arr([10, 20, 30, 40], { label: 'boards', hl: { 0: 'b', 1: 'b', 2: 'b', 3: 'p' } })}
      ${H.table(['limit L', 'groups (greedy)', 'workers', '≤ 2?'], [
        ['40', '[10,20] [30] [40]', '3', H.c('r', 'no')],
        ['55', '[10,20] [30] [40]', '3', H.c('r', 'no')],
        ['60', H.c('b', '[10,20,30]') + ' ' + H.c('p', '[40]'), '2', H.c('p', '<b>yes ← first</b>')],
        ['70', '[10,20,30] [40]', '2', H.c('g', 'yes')],
        ['100', '[10,20,30,40]', '1', H.c('g', 'yes')]
      ])}
      <p>Answer: ${H.c('p', '60')}. Why is greedy right? Packing each worker as full as allowed never increases the number of workers needed — leaving space early can only push more items to later workers.</p>
      <h4>Same skeleton, many costumes</h4>
      ${H.table(['Problem', 'Items', 'Workers', 'Answer = min of'], [
        ['Painter\'s Partition', 'board lengths', 'painters', 'max time any painter works'],
        ['Allocate Books', 'pages per book', 'students', 'max pages any student reads'],
        ['Split Array Largest Sum', 'numbers', 'k subarrays', 'largest subarray sum'],
        ['Ship Packages in D Days', 'package weights', 'days', 'ship capacity']
      ])}
      <p><b>"Allocate Books" twist:</b> every student must get <b>at least one book</b>, so if <code>m &gt; n</code> the answer is <code>-1</code>. When m ≤ n, needing ≤ m groups is enough because a group can always be split further to give everyone a book.</p>
      <p><b>Cost:</b> O(N) per check × log₂(sum − max) checks → <b>O(N log(sum))</b>. Use <code>long</code> for sums when values are large (10<sup>5</sup> × 10<sup>9</sup> overflows int).</p>`,
    clues: [
      '"<b>Minimize the maximum</b>" (time, pages, sum, load, capacity) → binary search on the answer, want the first yes.',
      '"Split into <b>k contiguous</b> parts / each worker takes <b>consecutive</b> items" → greedy counting check.',
      'Answer lies between <b>max(a)</b> and <b>sum(a)</b>, which can be ~10<sup>14</sup> → only ~47 checks, but use <code>long</code>.',
      '"Smallest capacity / speed / time such that the job finishes within D" → same first-yes pattern.',
      '"Each student must get at least one book" → impossible (return -1) when there are more students than books.'
    ],
    viz: {
      title: 'Painter\'s Partition: smallest feasible time limit',
      input: '10 20 30 40 | 2',
      inputLabel: 'board lengths | number of painters',
      gen: function (input) {
        var p = m09split(input, 2, 'board lengths | painters   e.g. 10 20 30 40 | 2');
        var b = m09nums(p[0], 'board lengths'), k = Number(p[1].trim());
        if (!p[1].trim() || isNaN(k) || Math.floor(k) !== k || k < 1) throw new Error('Number of painters must be a whole number ≥ 1.');
        if (b.length > 12) throw new Error('Please use at most 12 boards.');
        if (b.some(function (x) { return x <= 0 || x > 1000; })) throw new Error('Board lengths must be between 1 and 1000.');
        var mx = Math.max.apply(null, b), sum = b.reduce(function (s, x) { return s + x; }, 0);
        var lo = mx, hi = sum, ans = sum, frames = [], tried = [], th = {}, i;
        function groups(L) {
          var g = [], cur = 0, gi = 0;
          for (var j = 0; j < b.length; j++) { if (cur + b[j] > L) { gi++; cur = 0; } cur += b[j]; g.push(gi); }
          return g;
        }
        frames.push({ narr: 'Each painter paints a continuous run of boards; time = total length painted. We want the smallest possible <b>maximum</b> time. The answer lies in [max = ' + mx + ', sum = ' + sum + ']. Bigger limit → fewer painters needed, so "feasible?" goes no…no yes…yes. Find the first yes.',
          parts: [{ type: 'array', label: 'boards', values: b.slice() },
            { type: 'vars', vals: { painters: k, lo: lo, hi: hi } },
            { type: 'text', label: 'answer range', html: '<b>[ ' + lo + ' ........ ' + hi + ' ]</b>' }] });
        while (lo <= hi) {
          var mid = lo + Math.floor((hi - lo) / 2), g = groups(mid), need = g[g.length - 1] + 1, ok = need <= k;
          var bh = {}, bp = {};
          for (i = 0; i < b.length; i++) { bh[i] = g[i] % 2 === 0 ? 'win' : 'sel'; if (i === 0 || g[i] !== g[i - 1]) bp[i] = 'P' + (g[i] + 1); }
          tried.push(mid); th[tried.length - 1] = ok ? 'ok' : 'bad';
          var cur = {}; for (var t2 in th) cur[t2] = +t2 === tried.length - 1 ? th[t2] : 'done';
          frames.push({ narr: 'Try limit mid = <b>' + mid + '</b>. Greedy: give boards to painter 1 until the next board would push past ' + mid + ', then switch. Colours show each painter\'s run: <b>' + need + '</b> painter(s) needed.',
            parts: [{ type: 'array', label: 'boards (P1, P2... mark where each painter starts)', values: b.slice(), hl: bh, ptr: bp },
              { type: 'array', label: 'limits tried (green = feasible, red = not)', values: tried.slice(), hl: cur, showIdx: false },
              { type: 'vars', vals: { painters: k, lo: lo, mid: mid, hi: hi, needed: need }, hl: { needed: ok ? 'ok' : 'bad' } }] });
          var why;
          if (ok) { ans = mid; why = '<span class="c-g">' + need + ' ≤ ' + k + ' → limit ' + mid + ' is feasible.</span> Any bigger limit works too, but we want the smallest: save ans = ' + mid + ', try smaller: hi = ' + (mid - 1) + '.'; hi = mid - 1; }
          else { why = '<span class="c-r">' + need + ' &gt; ' + k + ' painters → limit ' + mid + ' is too tight.</span> Smaller limits are even tighter: lo = ' + (mid + 1) + '.'; lo = mid + 1; }
          frames.push({ narr: why,
            parts: [{ type: 'array', label: 'limits tried', values: tried.slice(), hl: th, showIdx: false },
              { type: 'vars', vals: { painters: k, lo: lo, hi: hi, ans: ans }, hl: { ans: 'sel' } },
              { type: 'text', label: 'remaining range', html: lo <= hi ? '<b>[ ' + lo + ' ... ' + hi + ' ]</b>' : '<span class="c-m">empty</span>' }] });
        }
        var gf = groups(ans), fh = {}, fp = {};
        for (i = 0; i < b.length; i++) { fh[i] = gf[i] % 2 === 0 ? 'win' : 'sel'; if (i === 0 || gf[i] !== gf[i - 1]) fp[i] = 'P' + (gf[i] + 1); }
        frames.push({ narr: '<span class="c-p">Range empty. The smallest feasible limit is ' + ans + '</span> — the busiest painter works ' + ans + ' units and no split can do better.',
          parts: [{ type: 'array', label: 'best split', values: b.slice(), hl: fh, ptr: fp }, { type: 'vars', vals: { answer: ans }, hl: { answer: 'sel' } }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Split Array Largest Sum (same problem, new name)',
        html: `<p>nums = ${H.arr([7, 2, 5, 10, 8], { label: 'nums', hl: { 0: 'b', 1: 'b', 2: 'b', 3: 'p', 4: 'p' } })} k = 2. Range [10, 32].</p>
          ${H.table(['limit', 'greedy groups', 'parts', '≤ 2?'], [
            ['21', '[7,2,5] [10,8]', '2', H.c('g', 'yes')],
            ['15', '[7,2,5] [10] [8]', '3', H.c('r', 'no')],
            ['18', H.c('b', '[7,2,5]') + ' ' + H.c('p', '[10,8]'), '2', H.c('p', '<b>yes ← smallest</b>')],
            ['17', '[7,2,5] [10] [8]', '3', H.c('r', 'no')]
          ])}
          <p>Answer ${H.c('p', '18')}. Painters, books, subarrays — the code is identical.</p>`
      },
      {
        title: 'Capacity to ship packages within D days',
        html: `<p>Weights [1..10] (in this order), D = 5 days, packages must ship in order. Smallest ship capacity? Range [max = 10, sum = 55]. Capacity 15 → days: [1..5]=15, [6,7]=13, [8]=8, [9]=9, [10]=10 → 5 days ✔. Capacity 14 → [1..4]=10, [5,6]=11, [7]=7, [8]=8, [9]=9, [10]=10 → 6 days ✘. Answer <b>15</b>.</p>`,
        code: `int[] w = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
int days = 5, lo = 10, hi = 55, ans = hi;
while (lo <= hi) {
    int cap = lo + (hi - lo) / 2, need = 1, load = 0;
    for (int x : w) { if (load + x > cap) { need++; load = 0; } load += x; }
    if (need <= days) { ans = cap; hi = cap - 1; } else lo = cap + 1;
}
System.out.println(ans); // 15`
      },
      {
        title: 'More workers than items',
        html: `<p>boards = ${H.arr([5, 9, 3], { label: 'boards' })} k = 10 painters. Give each board its own painter: the answer is simply ${H.c('p', 'max = 9')}. The search agrees: lo = 9 is already feasible (3 painters ≤ 10), so every later check pushes hi down and the answer stays 9. In <b>Allocate Books</b> however, "every student must get at least one book" makes m &gt; n impossible → ${H.c('r', '-1')}. Read the statement for that rule.</p>`
      },
      {
        title: 'Why lo must be max(a), not 0',
        html: `<p>boards = [10, 50], k = 2. If you start lo = 0 and try limit 30, the greedy puts 10 on painter 1, then tries 50: 10 + 50 &gt; 30 → new painter, load = 0, then load = 50 — painter 2 now holds 50 &gt; 30 and nobody noticed. The check claims "2 painters suffice for limit 30", which is false. Starting at lo = max = 50 makes this impossible (or add an explicit <code>if (b &gt; limit) return false</code>).</p>`
      }
    ],
    deepDive: `<p><b>Greedy feasibility proof.</b> For a limit L, filling each worker as much as possible minimizes the number of workers. Exchange argument: in any valid split, move the first boundary to the right as far as L allows; the first group stays ≤ L, and the rest of the array only got shorter, so it needs no more workers than before. Repeat for each boundary → the greedy split.</p>
      <p><b>Monotonic.</b> workers(L) never increases when L grows (a split valid for L is valid for L + 1). So "workers(L) ≤ k" is no…no yes…yes and we want the first yes.</p>
      <p><b>The answer is achievable.</b> The final answer equals the sum of some contiguous block (the busiest group), because the first feasible L can't be "between" achievable maxima: if L works and no group sums to exactly L, then L − 1 also works.</p>
      <p><b>DP alternative.</b> <code>dp[i][j]</code> = best max for the first i items with j workers → O(k · n²) time. Fine for n = 1000, k = 50 (5·10<sup>7</sup>), hopeless for n = 10<sup>5</sup>. Binary search gives O(n log(sum)) ≈ 10<sup>5</sup> × 47. Mentioning the DP and then explaining why binary search wins is a strong interview move.</p>
      <p><b>Production reality:</b> splitting a sorted key range into k contiguous shards with balanced load (range partitioning in Bigtable/HBase/CockroachDB style systems), assigning consecutive video segments to transcoding workers, or splitting a long job pipeline into stages — all "minimize the maximum contiguous load".</p>`,
    aiEra: `<p><b>What AI changes:</b> these problems are famous, so the code is easy to obtain. Interviewers therefore twist the statement: "packages must be shipped within D days", "minimum speed to arrive on time", "the smallest maximum candy per child". Your job is to spot the <b>same skeleton</b> under a new story.</p>
      <p><b>Use AI as a partner:</b> ask it to write the O(k·n²) DP and use it as a test oracle against your binary search on 500 random small inputs. Ask <code>What changes if items may be taken in any order (not contiguous)?</code> — answer: it becomes multiway number partitioning, NP-hard, and binary search on a greedy check no longer applies. Knowing where a pattern <i>stops</i> is expert knowledge.</p>
      <p><b>Where AI goes wrong:</b> lo = 0 or 1 instead of max, int sums that overflow, returning <code>lo</code> from the wrong template, or missing the "m &gt; n → -1" rule in Allocate Books.</p>
      <p><b>What you must still own:</b> the 4-step recipe (range, check, monotonic, search) and the two proofs (greedy is optimal, feasibility is monotonic).</p>`,
    problems: [{
      title: 'Painter\'s Partition Problem',
      level: 'Hard',
      tags: ['binary search on answer', 'minimize the maximum', 'greedy'],
      statement: `<p>There are <code>n</code> boards with lengths <code>boards[i]</code> and <code>k</code> painters. Each painter takes 1 unit of time per unit of length and may only paint a <b>contiguous</b> run of boards. All painters work at the same time. Return the <b>minimum time</b> to paint all boards (i.e. minimize the largest total length given to any painter).</p>`,
      constraints: `1 ≤ n ≤ 10<sup>5</sup>, 1 ≤ k ≤ 10<sup>5</sup>, 1 ≤ boards[i] ≤ 10<sup>5</sup>`,
      example: `${H.arr([10, 20, 30, 40], { label: 'boards', hl: { 0: 'b', 1: 'b', 2: 'b', 3: 'p' } })}
        <p>k = 2 → Output ${H.c('p', '60')}: painter 1 takes ${H.c('b', '10 + 20 + 30 = 60')}, painter 2 takes ${H.c('p', '40')}. Max = 60. Other splits are worse, e.g. [10,20] [30,40] → max 70.</p>`,
      brute: {
        why: `<p>Try every way to cut the array into k contiguous groups (recursion over cut positions) — that is C(n-1, k-1) splits, exponential. A DP over (index, painters) is O(k·n²), still too slow for 10<sup>5</sup>. Or try every limit L from max to sum with the greedy check: up to 10<sup>10</sup> limits. The waste: if limit 60 works, 61, 62, ... obviously work too; we only need the boundary.</p>`,
        code: `
          // Try every limit from max to sum; the first feasible one is the answer.
          long brute(int[] boards, int k) {
              long max = 0, sum = 0;
              for (int b : boards) { max = Math.max(max, b); sum += b; }
              for (long L = max; L <= sum; L++) {
                  int painters = 1;
                  long load = 0;
                  for (int b : boards) {
                      if (load + b > L) { painters++; load = 0; }
                      load += b;
                  }
                  if (painters <= k) return L;     // first limit that works
              }
              return sum;
          }`
      },
      mcq: {
        q: `With limit L = 55 the greedy needs 3 painters but you have k = 2. What next?`,
        options: [`Answer is 55`, `Try bigger limits: lo = 56`, `Try smaller limits: hi = 54`, `Add a painter`],
        answer: 1,
        explain: `55 is too tight (needs 3 &gt; 2 painters). Any smaller limit is even tighter, so the answer must be bigger: lo = mid + 1.`
      },
      hints: [
        `<p><b>Aha:</b> "Can k painters finish if nobody paints more than L?" is no for small L and yes for large L — monotonic. The answer is the first yes in <code>[max(boards), sum(boards)]</code>.</p>`,
        `<p>Check with a greedy pass: running <code>load</code> and <code>painters = 1</code>. If <code>load + board &gt; L</code>, start a new painter (<code>painters++</code>, <code>load = 0</code>). Feasible if <code>painters ≤ k</code>.</p>`,
        `<p>Traps: lo must be <b>max</b> (not 0 or 1), otherwise a single board longer than L breaks the greedy; sum can reach 10<sup>10</sup> → use <code>long</code>; if k ≥ n the answer is just max. Recipe: lo = max, hi = sum; while lo ≤ hi: mid; if feasible(mid) → ans = mid, hi = mid-1 else lo = mid+1.</p>`
      ],
      solution: {
        approach: `<p>Binary search the time limit in [max, sum]; feasibility = greedy count of painters ≤ k.</p>`,
        code: `
          class Solution {
              // How many painters are needed if nobody may paint more than limit?
              static int paintersNeeded(int[] boards, long limit) {
                  int painters = 1;
                  long load = 0;                       // length given to the current painter
                  for (int b : boards) {
                      if (load + b > limit) {          // this board does not fit: next painter
                          painters++;
                          load = 0;
                      }
                      load += b;
                  }
                  return painters;
              }

              static long minTime(int[] boards, int k) {
                  long lo = 0, hi = 0;
                  for (int b : boards) {
                      lo = Math.max(lo, b);            // someone must paint the longest board
                      hi += b;                         // one painter does everything
                  }
                  long ans = hi;
                  while (lo <= hi) {
                      long mid = lo + (hi - lo) / 2;   // a guessed maximum time
                      if (paintersNeeded(boards, mid) <= k) {
                          ans = mid;                   // feasible: remember, then try smaller
                          hi = mid - 1;
                      } else {
                          lo = mid + 1;                // needs too many painters: allow more time
                      }
                  }
                  return ans;
              }

              public static void main(String[] args) {
                  System.out.println(minTime(new int[]{10, 20, 30, 40}, 2)); // 60
              }
          }`,
        dry: {
          head: ['lo', 'hi', 'mid', 'greedy groups', 'painters', '≤ 2?', 'action'],
          rows: [
            ['40', '100', '70', '[10,20,30] [40]', '2', H.c('g', 'yes'), 'ans = 70, hi = 69'],
            ['40', '69', '54', '[10,20] [30] [40]', '3', H.c('r', 'no'), 'lo = 55'],
            ['55', '69', '62', '[10,20,30] [40]', '2', H.c('g', 'yes'), 'ans = 62, hi = 61'],
            ['55', '61', '58', '[10,20] [30] [40]', '3', H.c('r', 'no'), 'lo = 59'],
            ['59', '61', '60', '[10,20,30] [40]', '2', H.c('g', 'yes'), 'ans = 60, hi = 59'],
            ['59', '59', '59', '[10,20] [30] [40]', '3', H.c('r', 'no'), 'lo = 60'],
            ['60', '59', '–', '–', '–', '–', H.c('p', 'stop → answer 60')]
          ]
        },
        complexity: `<p><b>Time O(N log(sum))</b>: each check walks the boards once (N), and the range [max, sum] halves each round (≤ ~34 rounds for sum ≤ 10<sup>10</sup>). <b>Space O(1)</b>.</p>`
      }
    }, {
      title: 'Allocate Minimum Number of Pages (Allocate Books)',
      level: 'Hard',
      tags: ['binary search on answer', 'minimize the maximum'],
      statement: `<p><code>n</code> books have <code>pages[i]</code> pages, in a fixed order. Allocate them to <code>m</code> students so that every student gets <b>at least one book</b>, each student gets a <b>contiguous</b> block of books, and every book goes to exactly one student. Minimize the <b>maximum</b> number of pages any student reads. Return -1 if it is impossible.</p>`,
      constraints: `1 ≤ n, m ≤ 10<sup>5</sup>, 1 ≤ pages[i] ≤ 10<sup>6</sup>`,
      example: `${H.arr([12, 34, 67, 90], { label: 'pages', hl: { 0: 'b', 1: 'b', 2: 'b', 3: 'p' } })}
        <p>m = 2 → Output ${H.c('p', '113')}:</p>
        ${H.table(['split', 'student 1', 'student 2', 'max'], [
          ['[12] | [34,67,90]', '12', '191', '191'],
          ['[12,34] | [67,90]', '46', '157', '157'],
          [H.c('p', '[12,34,67] | [90]'), '113', '90', H.c('p', '<b>113</b>')]
        ])}
        <p>m = 5 → ${H.c('r', '-1')} (only 4 books, someone would get none).</p>`,
      brute: {
        why: `<p>Try all ways to place m-1 cut points between n books: C(n-1, m-1) possibilities — astronomically many for n = 10<sup>5</sup>. Or try every limit from max to sum one by one: up to 10<sup>11</sup> limits. The waste: feasibility is monotonic, so we only need the boundary.</p>`,
        code: `
          // Recursively try every cut position; returns the best possible max load.
          long brute(int[] pages, int start, int students) {
              int n = pages.length;
              if (students == 1) {                       // last student takes everything left
                  long s = 0;
                  for (int i = start; i < n; i++) s += pages[i];
                  return s;
              }
              long best = Long.MAX_VALUE, first = 0;
              // first student takes books start..end, leaving >= students-1 books for the rest
              for (int end = start; end <= n - students; end++) {
                  first += pages[end];
                  long rest = brute(pages, end + 1, students - 1);
                  best = Math.min(best, Math.max(first, rest));
              }
              return best;
          }`
      },
      mcq: {
        q: `What is the correct search range for the answer?`,
        options: [`[0, sum]`, `[1, max]`, `[max(pages), sum(pages)]`, `[min(pages), max(pages)]`],
        answer: 2,
        explain: `Some student must read the thickest book, so the answer is at least max. One student could read everything, so it is at most sum. Below max the greedy would break (a single book would not fit anyone).`
      },
      hints: [
        `<p><b>Aha:</b> "Can m students manage if nobody reads more than L pages?" Larger L → fewer students needed → monotonic (no…no yes…yes). Want the first yes in <code>[max, sum]</code>.</p>`,
        `<p>Greedy count: give books in order to the current student while the total stays ≤ L; otherwise start a new student. Feasible if <code>students ≤ m</code> (with m ≤ n, extra students can always take a book off someone, so "≤ m" is enough).</p>`,
        `<p>Traps: return <b>-1 when m &gt; n</b> before searching; use <code>long</code> for sums (10<sup>5</sup> × 10<sup>6</sup> = 10<sup>11</sup>); lo = max(pages). Recipe: if m &gt; n → -1; lo = max, hi = sum; while lo ≤ hi: mid; count students for mid; if count ≤ m → ans = mid, hi = mid-1 else lo = mid+1.</p>`
      ],
      solution: {
        approach: `<p>Exactly the painter's skeleton plus the "m &gt; n → -1" rule.</p>`,
        code: `
          class Solution {
              // Number of students needed if nobody may read more than limit pages.
              static int studentsNeeded(int[] pages, long limit) {
                  int students = 1;
                  long reading = 0;                          // pages of the current student
                  for (int p : pages) {
                      if (reading + p > limit) {             // book doesn't fit: next student
                          students++;
                          reading = 0;
                      }
                      reading += p;
                  }
                  return students;
              }

              static long findPages(int[] pages, int m) {
                  int n = pages.length;
                  if (m > n) return -1;                      // someone would get no book
                  long lo = 0, hi = 0;
                  for (int p : pages) {
                      lo = Math.max(lo, p);                  // thickest book must fit
                      hi += p;                               // one student reads all
                  }
                  long ans = hi;
                  while (lo <= hi) {
                      long mid = lo + (hi - lo) / 2;
                      if (studentsNeeded(pages, mid) <= m) {
                          ans = mid;                         // feasible: try to lower the max
                          hi = mid - 1;
                      } else {
                          lo = mid + 1;                      // too many students needed: raise limit
                      }
                  }
                  return ans;
              }

              public static void main(String[] args) {
                  System.out.println(findPages(new int[]{12, 34, 67, 90}, 2)); // 113
                  System.out.println(findPages(new int[]{12, 34, 67, 90}, 5)); // -1
              }
          }`,
        dry: {
          head: ['lo', 'hi', 'mid', 'greedy groups', 'students', '≤ 2?', 'action'],
          rows: [
            ['90', '203', '146', '[12,34,67] [90]', '2', H.c('g', 'yes'), 'ans = 146, hi = 145'],
            ['90', '145', '117', '[12,34,67] [90]', '2', H.c('g', 'yes'), 'ans = 117, hi = 116'],
            ['90', '116', '103', '[12,34] [67] [90]', '3', H.c('r', 'no'), 'lo = 104'],
            ['104', '116', '110', '[12,34] [67] [90]', '3', H.c('r', 'no'), 'lo = 111'],
            ['111', '116', '113', '[12,34,67] [90]', '2', H.c('g', 'yes'), 'ans = 113, hi = 112'],
            ['111', '112', '111', '[12,34] [67] [90]', '3', H.c('r', 'no'), 'lo = 112'],
            ['112', '112', '112', '[12,34] [67] [90]', '3', H.c('r', 'no'), 'lo = 113'],
            ['113', '112', '–', '–', '–', '–', H.c('p', 'stop → answer 113')]
          ]
        },
        complexity: `<p><b>Time O(N log(sum))</b>: ~37 rounds for sum ≤ 10<sup>11</sup>, each an O(N) greedy pass. <b>Space O(1)</b>.</p>`
      }
    }]
  });

  /* ================= TOPIC 8: Koko + the monotonic feasibility recipe ================= */
  topics.push({
    title: 'Koko Eating Bananas & the Monotonic Feasibility Recipe',
    analogy: `<p>You must finish a stack of TV episodes before your friend arrives in 8 hours. You can pick a <b>playback speed</b>. At 1× you won't finish; at 4× you will, but it's annoying — you want the <b>slowest speed that still finishes in time</b>. You don't need a formula: guess 2×, check "do I finish?" (no), guess 6× (yes), guess 4× (yes), guess 3× (no) → <b>4×</b>. Faster speed never makes you finish <i>later</i>, so the answers line up as <b>no no no yes yes yes</b>. Like opening a dictionary in the middle, every guess throws away half of the speeds.</p>`,
    explain: `<p>Koko has piles of bananas, e.g. ${H.arr([3, 6, 7, 11], { label: 'piles' })} and <b>h = 8</b> hours. Each hour she picks one pile and eats up to <b>k</b> bananas from it (if the pile has fewer, she finishes it and waits for the next hour). Find the <b>minimum k</b> that lets her finish in time.</p>
      <h4>Step 1 — hours needed at speed k</h4>
      <p>A pile of p bananas takes <code>⌈p / k⌉</code> hours. In integer math: <code>(p + k - 1) / k</code>.</p>
      ${H.table(['speed k', 'pile 3', 'pile 6', 'pile 7', 'pile 11', 'total hours', '≤ 8?'], [
        ['1', '3', '6', '7', '11', '27', H.c('r', 'no')],
        ['3', '1', '2', '3', '4', '10', H.c('r', 'no')],
        ['4', '1', '2', '2', '3', '8', H.c('p', '<b>yes ← first</b>')],
        ['6', '1', '1', '2', '2', '6', H.c('g', 'yes')],
        ['11', '1', '1', '1', '1', '4', H.c('g', 'yes')]
      ])}
      <h4>Step 2 — the universal recipe (memorize this)</h4>
      <ol>
        <li><b>What am I guessing?</b> The answer itself: the speed k.</li>
        <li><b>Range:</b> smallest sensible = 1, largest needed = <code>max(piles)</code> (at that speed every pile takes 1 hour; faster never helps).</li>
        <li><b>Check <code>ok(k)</code>:</b> total hours ≤ h — an O(n) loop.</li>
        <li><b>Monotonic?</b> Bigger k → each ⌈p/k⌉ is the same or smaller → total hours never increases. So ok(k) is no…no yes…yes. ✔</li>
        <li><b>Search:</b> want the <b>first yes</b> → on yes save ans and go left (<code>hi = mid - 1</code>), on no go right.</li>
      </ol>
      <h4>The two universal templates</h4>
      ${H.table(['Shape', 'You want', 'Typical words', 'Examples'], [
        ['no no no <b>yes</b> yes', 'first yes (minimum that works)', '"minimum speed / capacity / days / time"', 'Koko, Ship Packages, Painter, Bouquets'],
        ['yes yes <b>yes</b> no no', 'last yes (maximum that works)', '"maximum minimum distance", "largest k such that"', 'Aggressive Cows, Magnetic Force, ⌊√x⌋']
      ])}
      <p>Total cost: <b>O(n · log(max))</b>. With n = 10<sup>4</sup> piles of up to 10<sup>9</sup> bananas that is 10<sup>4</sup> × 30 = 3·10<sup>5</sup> steps instead of trying a billion speeds.</p>`,
    clues: [
      '"Return the <b>minimum</b> integer k / speed / capacity / days <b>such that</b> the task finishes within H" → first yes on a monotonic check.',
      'The check for one guess is <b>easy and O(n)</b>, but there is no direct formula for the best value → binary search on the answer.',
      'Answer range like <b>1 … 10<sup>9</sup></b> with n ≤ 10<sup>4</sup>–10<sup>5</sup> → O(n log(range)) is fine, O(n · range) is not.',
      'Ceiling division appears ("each hour she eats at most k", "each day ships at most C") → <code>(p + k - 1) / k</code>, watch overflow → <code>long</code>.',
      'Ask the magic question: <b>"If k works, does k + 1 also work?"</b> Yes → monotonic → binary search. If not (non-monotonic), binary search is wrong.'
    ],
    code: [`
      // The universal "first yes" helper: ok(x) must be false...false true...true on [lo, hi].
      // Returns the smallest x with ok(x) == true, or hi + 1 if none is true.
      static long firstTrue(long lo, long hi, java.util.function.LongPredicate ok) {
          long ans = hi + 1;
          while (lo <= hi) {
              long mid = lo + (hi - lo) / 2;
              if (ok.test(mid)) { ans = mid; hi = mid - 1; }   // works: remember, look for smaller
              else lo = mid + 1;                                // fails: need a bigger value
          }
          return ans;
      }

      // Koko with the helper: minimum speed so that total hours <= h.
      static int minEatingSpeed(int[] piles, int h) {
          int max = 0;
          for (int p : piles) max = Math.max(max, p);
          return (int) firstTrue(1, max, k -> {
              long hours = 0;                                   // long: can reach 10^13 when k = 1
              for (int p : piles) hours += (p + k - 1) / k;     // ceil(p / k)
              return hours <= h;
          });
      }`, { lang: 'python', run: true, title: 'Same recipe in Python (runnable)', code: `def first_true(lo, hi, ok):
    """Smallest x in [lo, hi] with ok(x) True (ok must be F..F T..T). hi+1 if none."""
    ans = hi + 1
    while lo <= hi:
        mid = (lo + hi) // 2          # Python ints never overflow
        if ok(mid):
            ans, hi = mid, mid - 1    # works -> try smaller
        else:
            lo = mid + 1              # fails -> need bigger
    return ans

def min_eating_speed(piles, h):
    hours = lambda k: sum((p + k - 1) // k for p in piles)
    return first_true(1, max(piles), lambda k: hours(k) <= h)

print(min_eating_speed([3, 6, 7, 11], 8))        # 4
print(min_eating_speed([30, 11, 23, 4, 20], 5))  # 30
print(min_eating_speed([30, 11, 23, 4, 20], 6))  # 23` }],
    codeTitle: ['Generic firstTrue + Koko (Java)'],
    viz: {
      title: 'Koko: binary search over speeds',
      input: '3 6 7 11 | 8',
      inputLabel: 'piles | hours h',
      gen: function (input) {
        var p = m09split(input, 2, 'piles | hours   e.g. 3 6 7 11 | 8');
        var piles = m09nums(p[0], 'the piles'), h = Number(p[1].trim());
        if (!p[1].trim() || isNaN(h) || Math.floor(h) !== h) throw new Error('Hours h must be a whole number after the | sign.');
        if (piles.length > 10) throw new Error('Please use at most 10 piles.');
        if (piles.some(function (x) { return x < 1; })) throw new Error('Every pile needs at least 1 banana.');
        if (h < piles.length) throw new Error('h must be at least the number of piles (one pile per hour at best).');
        var mx = Math.max.apply(null, piles);
        if (mx > 24) throw new Error('Keep every pile ≤ 24 so all candidate speeds fit on screen.');
        var speeds = [], i;
        for (i = 1; i <= mx; i++) speeds.push(i);
        function hoursAt(k) { var s = 0; piles.forEach(function (x) { s += Math.ceil(x / k); }); return s; }
        function strip(lo, mid, hi, ans, lab) {
          var hl = {}, pp = {};
          for (var j = 0; j < speeds.length; j++) if (j + 1 < lo || j + 1 > hi) hl[j] = 'done';
          if (ans) hl[ans - 1] = 'sel';
          if (mid) hl[mid - 1] = 'cur';
          if (lo <= hi) { pp.lo = lo - 1; pp.hi = hi - 1; }
          if (mid) pp.mid = mid - 1;
          return { type: 'array', label: lab, values: speeds.slice(), hl: hl, ptr: m09ptr(pp, speeds.length), idxLabels: speeds.map(function (s) { return 'k=' + s; }) };
        }
        var lo = 1, hi = mx, ans = 0, frames = [], guesses = 0;
        frames.push({ narr: 'Koko must finish ' + piles.length + ' piles in ' + h + ' hours. Candidate speeds are 1..' + mx + ' (at speed ' + mx + ' every pile takes one hour, so faster never helps). Higher speed → fewer hours, so "finishes in time?" goes no…no yes…yes. We want the <b>first yes</b>.',
          parts: [{ type: 'array', label: 'piles', values: piles.slice() }, strip(lo, 0, hi, 0, 'candidate speeds (window = lo..hi)'), { type: 'vars', vals: { h: h, lo: lo, hi: hi, ans: '?' } }] });
        while (lo <= hi) {
          var mid = lo + Math.floor((hi - lo) / 2), hrs = hoursAt(mid), ok = hrs <= h;
          guesses++;
          var per = piles.map(function (x) { return Math.ceil(x / mid); });
          frames.push({ narr: 'Guess speed mid = <b>' + mid + '</b>. Hours per pile = ⌈pile / ' + mid + '⌉ = ' + per.join(' + ') + ' = <b>' + hrs + '</b> hours. ' + (ok ? '<span class="c-g">' + hrs + ' ≤ ' + h + ' → she finishes.</span>' : '<span class="c-r">' + hrs + ' &gt; ' + h + ' → too slow.</span>'),
            parts: [{ type: 'array', label: 'hours needed per pile at speed ' + mid, values: per, hl: per.reduce(function (o, v, j) { o[j] = ok ? 'ok' : 'bad'; return o; }, {}) },
              strip(lo, mid, hi, ans, 'candidate speeds (amber = mid)'),
              { type: 'vars', vals: { h: h, lo: lo, mid: mid, hi: hi, hours: hrs, ans: ans || '?' }, hl: { hours: ok ? 'ok' : 'bad' } }] });
          var why;
          if (ok) { ans = mid; why = 'Speed ' + mid + ' works, and so does every faster speed — but we want the slowest. Save ans = ' + mid + ' and throw away ' + mid + '..' + hi + ': hi = ' + (mid - 1) + '.'; hi = mid - 1; }
          else { why = 'Speed ' + mid + ' is too slow, and every slower speed is even slower. Throw away ' + lo + '..' + mid + ': lo = ' + (mid + 1) + '.'; lo = mid + 1; }
          frames.push({ narr: why,
            parts: [{ type: 'array', label: 'piles', values: piles.slice() }, strip(lo, 0, hi, ans, 'candidate speeds (faded = discarded half)'),
              { type: 'vars', vals: { h: h, lo: lo, hi: hi, ans: ans || '?' }, hl: { ans: 'sel' } }] });
        }
        frames.push({ narr: '<span class="c-p">lo passed hi. The minimum speed is ' + ans + '</span>: it needs ' + hoursAt(ans) + ' hour(s)' + (ans > 1 ? ', while speed ' + (ans - 1) + ' needs ' + hoursAt(ans - 1) + ' &gt; ' + h : '') + '. We tested only ' + guesses + ' speed(s) instead of all ' + mx + '.',
          parts: [strip(1, 0, 0, ans, 'answer'), { type: 'vars', vals: { answer: ans, hours: hoursAt(ans) }, hl: { answer: 'sel' } }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'h equals the number of piles',
        html: `<p>piles = ${H.arr([30, 11, 23, 4, 20], { label: 'piles' })} h = 5. With exactly one hour per pile she must finish the biggest pile in one hour → answer ${H.c('p', 'max = 30')}. Give her one more hour (h = 6) and the answer drops to ${H.c('g', '23')}: at speed 23 the 30-pile takes 2 hours and the rest 1 each = 6 hours; at 22 the 30-pile and the 23-pile both take 2 hours → 7 hours.</p>`
      },
      {
        title: 'Overflow in the hours sum',
        html: `<p>n = 10<sup>4</sup> piles of 10<sup>9</sup> bananas and speed k = 1: total hours = 10<sup>13</sup>, far above the <code>int</code> limit (~2.1·10<sup>9</sup>). An <code>int</code> sum wraps to a garbage (possibly small or negative) value, the check wrongly says "fits", and the answer is wrong. Use <code>long hours</code>. Also <code>p + k - 1</code> with p, k near 2<sup>31</sup> can overflow int — use <code>(p - 1) / k + 1</code> for p ≥ 1, or compute in long.</p>`,
        code: `int[] piles = {1_000_000_000, 1_000_000_000, 1_000_000_000};
int k = 1;
int badSum = 0; long goodSum = 0;
for (int p : piles) { badSum += (p - 1) / k + 1; goodSum += (p - 1) / k + 1; }
System.out.println(badSum + " vs " + goodSum);   // -1294967296 vs 3000000000`
      },
      {
        title: 'Minimum days to make m bouquets (same recipe, time as the answer)',
        html: `<p>Flowers bloom on days ${H.arr([1, 10, 3, 10, 2], { label: 'bloomDay' })} need m = 3 bouquets of k = 1 adjacent flower each. Guess day D: count bouquets from flowers with bloomDay ≤ D. D = 2 → flowers 0, 4 → 2 bouquets ✘; D = 3 → flowers 0, 2, 4 → 3 ✔. Answer ${H.c('p', '3')}. Range [min bloom, max bloom]; if <code>m · k &gt; n</code> it is impossible → −1.</p>`
      },
      {
        title: 'When the recipe does NOT apply',
        html: `<p>"Find the speed k where total hours is <b>exactly</b> h" — hours(k) is monotonic, but "exactly equal" might have no solution (hours can jump from 9 to 7). And "find k that minimizes |hours(k) − h| + k" mixes an increasing and a decreasing term → not monotonic → plain binary search can give wrong answers. Always phrase the question as a <b>≤ / ≥ threshold</b> before searching.</p>`
      }
    ],
    deepDive: `<p><b>Why ok(k) is monotonic, rigorously.</b> For fixed p, ⌈p/k⌉ is non-increasing in k (dividing by a bigger number cannot give a bigger result, and the ceiling preserves ≤). A sum of non-increasing functions is non-increasing. So hours(k) ≤ h, once true, stays true.</p>
      <p><b>Tighter bounds.</b> lo can start at <code>⌈sum / h⌉</code> (even with zero waste she must eat that fast) and hi at <code>max</code>. A smarter hi: <code>⌈sum / (h − n + 1)⌉</code>. These shave a few rounds; correctness is identical. Never make the range <i>too small</i> though — if the true answer is outside [lo, hi] the search silently returns a boundary.</p>
      <p><b>Choosing hi when there is no natural max.</b> Use <b>exponential (galloping) search</b>: try hi = 1, 2, 4, 8, … until ok(hi) is true, then binary search [hi/2, hi]. Total cost O(log answer) checks. It is also how you binary search an unbounded/infinite sorted stream.</p>
      <p><b>Complexity accounting.</b> O(n) per check × ⌈log₂(max)⌉ ≈ 30 checks → O(n log max). Sorting is not needed here (unlike Aggressive Cows) because pile order does not matter for the hours sum.</p>
      <p><b>The general principle — "binary search on a monotone predicate":</b> arrays are just one source of a monotone predicate (<code>a[i] ≥ x</code>). Answers, time, capacity, thresholds in ML (pick the smallest confidence threshold with precision ≥ 95%), rate limits (largest QPS where p99 latency ≤ 200 ms), and <code>git bisect</code> (first bad commit) are all the same algorithm.</p>`,
    aiEra: `<p><b>What AI changes:</b> "Koko Eating Bananas" is a top-50 interview problem, so any assistant solves it. What remains valuable is <b>pattern transfer</b>: recognizing that a capacity-planning question at work ("smallest number of pods so p99 stays under 200 ms") is the same first-true search, with an expensive load test as the check.</p>
      <p><b>Use AI as a partner:</b> describe a real situation and ask <code>Is this predicate monotonic in x? Give a counterexample if not</code>. Ask it to generate the brute-force oracle (try every k from 1 to max) and compare on random small inputs. For expensive checks (each one is a 10-minute load test or a model evaluation), ask it to estimate how many checks binary search needs: log₂(range) — e.g. 10 checks for 1,000 candidate values.</p>
      <p><b>Where AI goes wrong:</b> <code>int</code> hours sum, <code>Math.ceil(p / k)</code> on integers (integer division happens <i>before</i> ceil, so it rounds down — a classic Java bug), lo = 0 causing division by zero, or returning lo from a mismatched template.</p>
      <p><b>What you must still own:</b> the 5-step recipe — guess the answer, define the range, write the O(n) check, prove monotonicity, choose first/last true. Say those five steps out loud in the interview and you have answered the question before writing code.</p>`,
    problems: [{
      title: 'Koko Eating Bananas',
      level: 'Medium',
      tags: ['binary search on answer', 'first true', 'ceiling division'],
      companies: ['Amazon', 'Google', 'Meta', 'Airbnb'],
      statement: `<p>There are <code>n</code> piles of bananas, <code>piles[i]</code> bananas in pile i. The guards return in <code>h</code> hours. Each hour Koko chooses one pile and eats <code>k</code> bananas from it; if the pile has fewer than k, she eats all of it and does not eat more that hour. Return the <b>minimum integer k</b> such that she can eat all bananas within h hours.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>4</sup>, n ≤ h ≤ 10<sup>9</sup>, 1 ≤ piles[i] ≤ 10<sup>9</sup>`,
      example: `${H.arr([3, 6, 7, 11], { label: 'piles' })}
        <p>h = 8 → Output ${H.c('p', '4')}: at speed 4 the hours are 1 + 2 + 2 + 3 = ${H.c('g', '8 ≤ 8')}. At speed 3 they are 1 + 2 + 3 + 4 = ${H.c('r', '10 &gt; 8')}, so 4 is the minimum.</p>
        <p>piles = [30, 11, 23, 4, 20], h = 5 → ${H.c('p', '30')}; h = 6 → ${H.c('p', '23')}.</p>`,
      brute: {
        why: `<p>Try k = 1, 2, 3, … and return the first speed whose total hours ≤ h. Each try is O(n), and the answer can be up to 10<sup>9</sup> → 10<sup>4</sup> × 10<sup>9</sup> = 10<sup>13</sup> operations. The waste: when k = 3 fails, we already know 1 and 2 fail; when k = 6 works, 7, 8, … also work. Only the boundary matters.</p>`,
        code: `
          int bruteSpeed(int[] piles, int h) {
              for (int k = 1; ; k++) {                    // try every speed in order
                  long hours = 0;
                  for (int p : piles) hours += (p + (long) k - 1) / k;
                  if (hours <= h) return k;               // first speed that works
              }
          }`
      },
      mcq: {
        q: `Speed mid = 6 gives 6 hours with h = 8. What do you do?`,
        options: [`Return 6`, `Save ans = 6 and search slower speeds: hi = 5`, `Search faster speeds: lo = 7`, `Increase h`],
        answer: 1,
        explain: `6 works, but a slower speed might also work and we want the minimum. Remember 6 as the best so far and continue in [lo, 5]. (In this example the search ends at 4.)`
      },
      hints: [
        `<p><b>Aha:</b> you can't compute k directly, but for a given k you can count hours in O(n). And more speed never needs more hours → no…no yes…yes → find the first yes.</p>`,
        `<p>Range <code>[1, max(piles)]</code>. Check: <code>hours = Σ ⌈p / k⌉</code> using <code>(p + k - 1) / k</code> in <code>long</code>; feasible if hours ≤ h. On feasible: ans = mid, hi = mid - 1; else lo = mid + 1.</p>`,
        `<p>Traps: <code>Math.ceil(p / k)</code> with ints rounds down first (wrong); int overflow of the hours sum; lo must start at 1 (division by zero at 0). Recipe: max = max(piles); lo = 1, hi = max; while lo ≤ hi → mid → hours(mid) ≤ h ? (ans = mid, hi = mid - 1) : lo = mid + 1. Return ans.</p>`
      ],
      solution: {
        approach: `<p>Binary search the speed on [1, max]; the feasibility check sums ceiling divisions in long.</p>`,
        code: `
          class Solution {
              // Hours Koko needs at speed k. long: up to 10^4 piles * 10^9 hours.
              private long hoursNeeded(int[] piles, int k) {
                  long hours = 0;
                  for (int p : piles) {
                      hours += (p + (long) k - 1) / k;   // ceil(p / k) without floating point
                  }
                  return hours;
              }

              public int minEatingSpeed(int[] piles, int h) {
                  int lo = 1, hi = 0;
                  for (int p : piles) hi = Math.max(hi, p);  // speed max(piles) always works
                  int ans = hi;
                  while (lo <= hi) {
                      int mid = lo + (hi - lo) / 2;          // a guessed speed
                      if (hoursNeeded(piles, mid) <= h) {
                          ans = mid;                         // fast enough: remember it
                          hi = mid - 1;                      // try to go slower
                      } else {
                          lo = mid + 1;                      // too slow: must eat faster
                      }
                  }
                  return ans;
              }

              public static void main(String[] args) {
                  Solution s = new Solution();
                  System.out.println(s.minEatingSpeed(new int[]{3, 6, 7, 11}, 8));        // 4
                  System.out.println(s.minEatingSpeed(new int[]{30, 11, 23, 4, 20}, 6));  // 23
              }
          }`,
        alt: [{ lang: 'python', code: `def min_eating_speed(piles, h):
    lo, hi, ans = 1, max(piles), max(piles)
    while lo <= hi:
        mid = (lo + hi) // 2
        hours = sum((p + mid - 1) // mid for p in piles)   # ceil division
        if hours <= h:
            ans, hi = mid, mid - 1     # fast enough -> try slower
        else:
            lo = mid + 1               # too slow -> faster
    return ans

print(min_eating_speed([3, 6, 7, 11], 8))  # 4`, run: true }],
        dry: {
          head: ['lo', 'hi', 'mid', 'hours at mid', '≤ 8?', 'action', 'ans'],
          rows: [
            ['1', '11', '6', '1+1+2+2 = 6', H.c('g', 'yes'), 'hi = 5', '6'],
            ['1', '5', '3', '1+2+3+4 = 10', H.c('r', 'no'), 'lo = 4', '6'],
            ['4', '5', '4', '1+2+2+3 = 8', H.c('g', 'yes'), 'hi = 3', '4'],
            ['4', '3', '–', '–', '–', 'lo &gt; hi → stop', H.c('p', '<b>4</b>')]
          ]
        },
        complexity: `<p><b>Time O(n log max)</b>: ≤ 30 rounds for max ≤ 10<sup>9</sup>, each an O(n) pass → ~3·10<sup>5</sup> operations. <b>Space O(1)</b>.</p>`,
        followUps: ['What if Koko may eat from several piles in one hour? (Then hours = ⌈sum / k⌉ and there is a direct formula.)', 'How would you handle h up to 10<sup>18</sup> or piles up to 10<sup>18</sup>? (long everywhere, careful ceiling.)', 'Can you tighten lo to ⌈sum / h⌉? Why is it still correct?']
      }
    }]
  });

  /* ================= PRACTICE 1-4 ================= */
  practice.push({
    title: 'Search Insert Position',
    level: 'Easy',
    tags: ['lower bound'],
    statement: `<p>Given a sorted array of <b>distinct</b> integers <code>nums</code> and a <code>target</code>, return the index if target is found. If not, return the index where it <b>would be inserted</b> to keep the array sorted. Must be O(log n).</p>`,
    constraints: `1 ≤ n ≤ 10<sup>4</sup>, -10<sup>4</sup> ≤ nums[i], target ≤ 10<sup>4</sup>, nums sorted and distinct`,
    example: `${H.arr([1, 3, 5, 6], { label: 'nums', ptr: { 1: '2 goes here' }, hl: { 2: 'g' } })}
      <p>target = 5 → ${H.c('g', '2')} (found). target = 2 → ${H.c('p', '1')} (between 1 and 3). target = 7 → ${H.c('p', '4')} (after everything, index n).</p>`,
    brute: {
      why: `<p>Walk from the left and return the first index with <code>nums[i] ≥ target</code>, or n. O(N). It ignores sortedness — this "first index with value ≥ target" is exactly the lower bound, which binary search finds in O(log N).</p>`,
      code: `
        int brute(int[] nums, int target) {
            for (int i = 0; i < nums.length; i++)
                if (nums[i] >= target) return i;   // first slot that is not smaller
            return nums.length;                    // bigger than everything
        }`
    },
    mcq: {
      q: `Using <code>while (lo &lt;= hi)</code> classic search, target is missing and the loop ends. Which variable is the insert position?`,
      options: [`hi`, `lo`, `mid`, `hi + 2`],
      answer: 1,
      explain: `When the window becomes empty, lo has stopped exactly on the first element greater than target (everything before lo is smaller). So lo is the insert position; hi = lo - 1.`
    },
    hints: [
      `<p><b>Aha:</b> the answer is the first index whose value is ≥ target — a "no no yes yes" question → lower bound.</p>`,
      `<p>Use Template B with <code>hi = n</code> (so "insert at the end" is possible): if <code>nums[mid] ≥ target</code> → <code>hi = mid</code>, else <code>lo = mid + 1</code>.</p>`,
      `<p>Traps: hi must start at <b>n</b>, not n - 1, or target bigger than everything returns the wrong index. Recipe: lo = 0, hi = n; while lo &lt; hi: mid; nums[mid] ≥ target ? hi = mid : lo = mid+1. Return lo.</p>`
    ],
    solution: {
      approach: `<p>Lower bound: first index with value ≥ target.</p>`,
      code: `
        class Solution {
            public int searchInsert(int[] nums, int target) {
                int lo = 0, hi = nums.length;      // answer can be anything in [0, n]
                while (lo < hi) {
                    int mid = lo + (hi - lo) / 2;
                    if (nums[mid] >= target) {
                        hi = mid;                  // mid could be the slot: keep it
                    } else {
                        lo = mid + 1;              // mid is too small: slot is to the right
                    }
                }
                return lo;                         // first index with nums[i] >= target
            }
        }`,
      dry: {
        head: ['lo', 'hi', 'mid', 'nums[mid]', '≥ 2?', 'action'],
        rows: [
          ['0', '4', '2', '5', 'yes', 'hi = 2'],
          ['0', '2', '1', '3', 'yes', 'hi = 1'],
          ['0', '1', '0', '1', 'no', 'lo = 1'],
          ['1', '1', '–', '–', '–', H.c('p', 'return 1')]
        ]
      },
      complexity: `<p><b>Time O(log N)</b>, halving the range [0, n] each step. <b>Space O(1)</b>.</p>`
    }
  });

  practice.push({
    title: 'Kth Missing Positive Number',
    level: 'Easy',
    tags: ['binary search', 'counting'],
    statement: `<p>Given a strictly increasing array <code>arr</code> of positive integers and an integer <code>k</code>, return the <b>k-th positive integer missing</b> from the array. Try to do better than O(n).</p>`,
    constraints: `1 ≤ n ≤ 1000, 1 ≤ arr[i] ≤ 1000, 1 ≤ k ≤ 1000, arr strictly increasing`,
    example: `${H.arr([2, 3, 4, 7, 11], { label: 'arr' })}
      <p>Missing numbers: ${H.c('r', '1')}, ${H.c('r', '5')}, ${H.c('r', '6')}, ${H.c('r', '8')}, ${H.c('p', '9')}, 10, ... → k = 5 → Output ${H.c('p', '9')}.</p>
      ${H.table(['i', '0', '1', '2', '3', '4'], [['arr[i]', '2', '3', '4', '7', '11'], ['should be (i + 1)', '1', '2', '3', '4', '5'], ['missing so far = arr[i] - (i+1)', '1', '1', '1', '3', H.c('y', '6')]])}`,
    brute: {
      why: `<p>Count up 1, 2, 3, ... and skip numbers that are in the array until k numbers were skipped. O(n + k). It walks over every number one by one even though "how many are missing before index i" can be computed instantly as <code>arr[i] - (i + 1)</code>.</p>`,
      code: `
        int brute(int[] arr, int k) {
            int idx = 0, num = 1;
            while (true) {
                if (idx < arr.length && arr[idx] == num) idx++;   // present: not missing
                else if (--k == 0) return num;                    // missing: count it
                num++;
            }
        }`
    },
    mcq: {
      q: `In <code>[2, 3, 4, 7, 11]</code>, how many positives are missing before index 3 (value 7)?`,
      options: [`1`, `3`, `4`, `7`],
      answer: 1,
      explain: `If nothing were missing, index 3 would hold 4. It holds 7, so 7 - 4 = 3 numbers (1, 5, 6) are missing before it.`
    },
    hints: [
      `<p><b>Aha:</b> <code>missing(i) = arr[i] - (i + 1)</code> never decreases as i grows. Find the first index where <code>missing(i) ≥ k</code>.</p>`,
      `<p>Template B on [0, n]: if <code>missing(mid) &lt; k</code> → lo = mid + 1, else hi = mid. When it stops at index lo, exactly lo array numbers are below the answer.</p>`,
      `<p>Traps: if all elements are passed (lo = n), the answer is beyond the array — the formula still works. The answer is <code>lo + k</code>: k missing numbers plus lo present numbers come before or at it. Check: lo = 4, k = 5 → 9.</p>`
    ],
    solution: {
      approach: `<p>Binary search for the first index whose "missing so far" count reaches k; answer = index + k.</p>`,
      code: `
        class Solution {
            public int findKthPositive(int[] arr, int k) {
                int lo = 0, hi = arr.length;              // answer index in [0, n]
                while (lo < hi) {
                    int mid = lo + (hi - lo) / 2;
                    int missing = arr[mid] - (mid + 1);   // how many positives are absent before arr[mid]
                    if (missing < k) {
                        lo = mid + 1;                     // not enough missing yet: go right
                    } else {
                        hi = mid;                         // enough missing: answer is before arr[mid]
                    }
                }
                // lo array values are smaller than the answer, plus k missing ones
                return lo + k;
            }
        }`,
      dry: {
        head: ['lo', 'hi', 'mid', 'arr[mid]', 'missing', '&lt; 5?', 'action'],
        rows: [
          ['0', '5', '2', '4', '1', 'yes', 'lo = 3'],
          ['3', '5', '4', '11', '6', 'no', 'hi = 4'],
          ['3', '4', '3', '7', '3', 'yes', 'lo = 4'],
          ['4', '4', '–', '–', '–', '–', H.c('p', 'return 4 + 5 = 9')]
        ]
      },
      complexity: `<p><b>Time O(log n)</b> instead of O(n + k). <b>Space O(1)</b>.</p>`
    }
  });

  practice.push({
    title: 'Find Minimum in Rotated Sorted Array',
    level: 'Medium',
    tags: ['rotated array', 'template B'],
    statement: `<p>A sorted array of <b>distinct</b> integers was rotated between 1 and n times (e.g. <code>[0,1,2,4,5,6,7]</code> → <code>[4,5,6,7,0,1,2]</code>). Return the <b>minimum</b> element in O(log n).</p>`,
    constraints: `1 ≤ n ≤ 5000, -5000 ≤ nums[i] ≤ 5000, all distinct`,
    example: `${H.arr([3, 4, 5, 1, 2], { label: 'nums', hl: { 3: 'p' } })}
      <p>Output ${H.c('p', '1')} — the element right after the "drop" (5 → 1). For an un-rotated array like [11, 13, 15, 17] the answer is the first element, 11.</p>`,
    brute: {
      why: `<p>Scan for the smallest value: O(N). Or find the drop by walking. Both ignore that each comparison with the last element tells which side of the drop mid is on.</p>`,
      code: `
        int brute(int[] nums) {
            int best = nums[0];
            for (int x : nums) best = Math.min(best, x);   // look at everything
            return best;
        }`
    },
    mcq: {
      q: `<code>nums[mid] &gt; nums[hi]</code>. Where is the minimum?`,
      options: [`At mid`, `Strictly right of mid`, `Left of mid`, `At hi`],
      answer: 1,
      explain: `If mid is bigger than the last element, the drop lies between mid and hi, so the minimum is somewhere in (mid, hi] → lo = mid + 1.`
    },
    hints: [
      `<p><b>Aha:</b> compare <code>nums[mid]</code> with <code>nums[hi]</code>. Bigger → mid is in the left (high) piece, the minimum is to the right. Smaller → mid is in the right (low) piece, the minimum is mid or to its left.</p>`,
      `<p>Template B: <code>lo = mid + 1</code> or <code>hi = mid</code>, stop when lo == hi; that index holds the minimum.</p>`,
      `<p>Trap: comparing with <code>nums[lo]</code> instead of <code>nums[hi]</code> fails on a non-rotated array (left is always sorted, you can't tell where the min is). Never use hi = mid - 1: mid itself may be the minimum.</p>`
    ],
    solution: {
      approach: `<p>Shrink towards the drop by comparing mid with the right end.</p>`,
      code: `
        class Solution {
            public int findMin(int[] nums) {
                int lo = 0, hi = nums.length - 1;
                while (lo < hi) {
                    int mid = lo + (hi - lo) / 2;
                    if (nums[mid] > nums[hi]) {
                        lo = mid + 1;          // drop is right of mid: min is in (mid, hi]
                    } else {
                        hi = mid;              // mid..hi is sorted: min is mid or left of it
                    }
                }
                return nums[lo];               // lo == hi points at the minimum
            }
        }`,
      dry: {
        head: ['lo', 'hi', 'mid', 'nums[mid]', 'nums[hi]', 'action'],
        rows: [
          ['0', '4', '2', '5', '2', '5 &gt; 2 → lo = 3'],
          ['3', '4', '3', '1', '2', '1 ≤ 2 → hi = 3'],
          ['3', '3', '–', '–', '–', H.c('p', 'return nums[3] = 1')]
        ]
      },
      complexity: `<p><b>Time O(log N)</b>: one comparison per step, half the window gone each time. <b>Space O(1)</b>.</p>`
    }
  });

  practice.push({
    title: 'Single Element in a Sorted Array',
    level: 'Medium',
    tags: ['binary search', 'parity'],
    statement: `<p>A sorted array has every element appearing <b>exactly twice</b>, except one element that appears once. Return that single element in <b>O(log n)</b> time and O(1) space.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>5</sup> (n is odd), 0 ≤ nums[i] ≤ 10<sup>5</sup>`,
    example: `${H.arr([1, 1, 2, 3, 3, 4, 4, 8, 8], { label: 'nums', hl: { 0: 'g', 1: 'g', 2: 'p', 3: 'r', 4: 'r', 5: 'r', 6: 'r', 7: 'r', 8: 'r' } })}
      <p>Output ${H.c('p', '2')}. ${H.c('g', 'Before')} the single, pairs start at <b>even</b> indices (0,1). ${H.c('r', 'After')} it, pairs start at <b>odd</b> indices (3,4), (5,6), (7,8): the single element shifts everyone by one.</p>`,
    brute: {
      why: `<p>XOR all elements (pairs cancel) or walk in steps of 2 checking <code>nums[i] != nums[i+1]</code>. Both O(N). They miss the pattern "pair starts at even index ⇒ the single is further right", which lets us skip half.</p>`,
      code: `
        int brute(int[] nums) {
            int x = 0;
            for (int v : nums) x ^= v;   // equal pairs cancel out
            return x;
        }`
    },
    mcq: {
      q: `mid = 4 (even) and <code>nums[4] == nums[5]</code>. Where is the single element?`,
      options: [`Left of index 4`, `Right of index 5`, `At index 4`, `Can't tell`],
      answer: 1,
      explain: `A pair starting at an even index means everything up to here is still "in step" — no single element has appeared yet. So it must be to the right: lo = mid + 2.`
    },
    hints: [
      `<p><b>Aha:</b> left of the single element, each pair occupies (even, odd) indices; right of it, (odd, even). So checking one pair at an even index tells you which side you are on.</p>`,
      `<p>Make mid even (<code>if (mid % 2 == 1) mid--</code>). If <code>nums[mid] == nums[mid+1]</code> → single is right: <code>lo = mid + 2</code>. Else → single is at mid or left: <code>hi = mid</code>.</p>`,
      `<p>Traps: lo and hi stay even, so mid + 1 ≤ hi always exists; n = 1 → loop skipped, return nums[0]. Recipe: lo = 0, hi = n-1; while lo &lt; hi: even mid; compare with mid+1; move. Return nums[lo].</p>`
    ],
    solution: {
      approach: `<p>Binary search on even indices using the pair-alignment rule.</p>`,
      code: `
        class Solution {
            public int singleNonDuplicate(int[] nums) {
                int lo = 0, hi = nums.length - 1;   // both even (n is odd)
                while (lo < hi) {
                    int mid = lo + (hi - lo) / 2;
                    if (mid % 2 == 1) mid--;        // look at a pair that should start at an even index
                    if (nums[mid] == nums[mid + 1]) {
                        lo = mid + 2;               // pair is aligned: single is further right
                    } else {
                        hi = mid;                   // alignment broken: single is mid or left
                    }
                }
                return nums[lo];
            }
        }`,
      dry: {
        head: ['lo', 'hi', 'mid (even)', 'nums[mid], nums[mid+1]', 'action'],
        rows: [
          ['0', '8', '4', '3, 4', 'different → hi = 4'],
          ['0', '4', '2', '2, 3', 'different → hi = 2'],
          ['0', '2', '1 → 0', '1, 1', 'same → lo = 2'],
          ['2', '2', '–', '–', H.c('p', 'return nums[2] = 2')]
        ]
      },
      complexity: `<p><b>Time O(log N)</b>: half the pairs discarded each step. <b>Space O(1)</b>.</p>`
    }
  });

  /* ================= PRACTICE: more Easy / Medium ================= */
  practice.push({
    title: 'Guess Number Higher or Lower',
    level: 'Easy',
    tags: ['binary search', 'interactive API'],
    companies: ['Google', 'Microsoft'],
    statement: `<p>We pick a number between <code>1</code> and <code>n</code>. You call a pre-defined API <code>guess(num)</code> that returns <code>-1</code> if your guess is <b>higher</b> than the pick, <code>1</code> if it is <b>lower</b>, and <code>0</code> if it is correct. Return the picked number using as few calls as possible.</p>`,
    constraints: `1 ≤ pick ≤ n ≤ 2<sup>31</sup> - 1`,
    example: `<p>n = 10, pick = 6.</p>
      ${H.table(['guess', 'API says', 'meaning', 'new range'], [
        ['5', '1', 'pick is higher', '[6, 10]'],
        ['8', '-1', 'pick is lower', '[6, 7]'],
        ['6', H.c('g', '0'), 'correct', H.c('p', 'answer 6')]
      ])}`,
    brute: {
      why: `<p>Call guess(1), guess(2), … until it returns 0. Up to n calls — for n = 2<sup>31</sup> − 1 that is two billion API calls. The API's "higher / lower" answer is a free comparison that lets you discard half of the numbers each time; the linear approach ignores it.</p>`,
      code: `
        class GuessGame {
            private final int pick;
            GuessGame(int pick) { this.pick = pick; }
            int guess(int num) { return Integer.compare(pick, num); }   // the judge's API

            int bruteGuess(int n) {
                for (int x = 1; x <= n; x++) if (guess(x) == 0) return x;   // one by one
                return -1;
            }
        }`
    },
    mcq: {
      q: `n = 2<sup>31</sup> − 1 and the range is [2·10<sup>9</sup>, 2,147,483,647]. Which mid is safe?`,
      options: [`(lo + hi) / 2`, `lo + (hi - lo) / 2`, `(lo + hi + 1) / 2`, `hi / 2`],
      answer: 1,
      explain: `lo + hi ≈ 4.1·10<sup>9</sup> overflows int, so both "(lo + hi)" options break. lo + (hi − lo) / 2 never builds a number bigger than hi. hi / 2 is just wrong.`
    },
    hints: [
      `<p><b>Aha:</b> this is classic binary search where the "array" is the numbers 1..n and the comparison is done by the API.</p>`,
      `<p>Template A: lo = 1, hi = n. API returns 1 → pick is bigger → lo = mid + 1; returns −1 → hi = mid − 1; returns 0 → done.</p>`,
      `<p>Traps: overflow at n = 2<sup>31</sup> − 1 (use lo + (hi − lo) / 2); don't mix up the sign convention (−1 means <i>your guess</i> is too high). At most 31 calls.</p>`
    ],
    solution: {
      approach: `<p>Binary search over 1..n using the API's three-way answer.</p>`,
      code: `
        class Solution {
            private final int pick;
            Solution(int pick) { this.pick = pick; }
            // Stand-in for the judge's API: -1 = guess too high, 1 = guess too low, 0 = correct.
            int guess(int num) { return Integer.compare(pick, num); }

            public int guessNumber(int n) {
                int lo = 1, hi = n;
                while (lo <= hi) {
                    int mid = lo + (hi - lo) / 2;      // no overflow even near 2^31 - 1
                    int r = guess(mid);
                    if (r == 0) return mid;            // correct
                    if (r == 1) lo = mid + 1;          // pick is higher than mid
                    else hi = mid - 1;                 // pick is lower than mid
                }
                return -1;                             // unreachable for valid input
            }

            public static void main(String[] args) {
                System.out.println(new Solution(6).guessNumber(10));                    // 6
                System.out.println(new Solution(2147483647).guessNumber(2147483647));   // 2147483647
            }
        }`,
      dry: {
        head: ['lo', 'hi', 'mid', 'guess(mid)', 'action'],
        rows: [
          ['1', '10', '5', '1', 'lo = 6'],
          ['6', '10', '8', '-1', 'hi = 7'],
          ['6', '7', '6', '0', H.c('g', 'return 6')]
        ]
      },
      complexity: `<p><b>Time O(log n)</b> API calls (≤ 31). <b>Space O(1)</b>.</p>`
    }
  });

  practice.push({
    title: 'Valid Perfect Square',
    level: 'Easy',
    tags: ['binary search on answer', 'overflow'],
    companies: ['LinkedIn'],
    statement: `<p>Given a positive integer <code>num</code>, return <code>true</code> if it is a perfect square (some integer k has k · k = num), otherwise <code>false</code>. Do not use any built-in sqrt.</p>`,
    constraints: `1 ≤ num ≤ 2<sup>31</sup> - 1`,
    example: `<p>num = 16 → ${H.c('g', 'true')} (4 · 4). num = 14 → ${H.c('r', 'false')}: 3² = 9 &lt; 14 &lt; 16 = 4², no whole number squares to 14.</p>`,
    brute: {
      why: `<p>Try k = 1, 2, 3, … while k² ≤ num: about √num ≈ 46,000 steps for the largest input. Fine once, but it ignores that k² is increasing, so a binary search over k needs only ~31 steps.</p>`,
      code: `
        boolean brute(int num) {
            for (long k = 1; k * k <= num; k++) if (k * k == num) return true;
            return false;
        }`
    },
    mcq: {
      q: `Binary searching k in [1, num] for num = 14: mid = 7 gives 49. What next?`,
      options: [`lo = 8`, `hi = 6`, `return false`, `return true`],
      answer: 1,
      explain: `49 &gt; 14, so 7 and every larger k square to more than 14. Search smaller: hi = mid − 1 = 6.`
    },
    hints: [
      `<p><b>Aha:</b> k² is increasing in k, so "k² vs num" is a sorted comparison — classic exact-match binary search on k.</p>`,
      `<p>lo = 1, hi = num; compute <code>sq = (long) mid * mid</code>; equal → true; smaller → lo = mid + 1; bigger → hi = mid − 1.</p>`,
      `<p>Traps: the square overflows int for mid &gt; 46,340 — use long. If the loop ends, no k matched → false. num = 1 → true.</p>`
    ],
    solution: {
      approach: `<p>Exact-value binary search over k with a long square.</p>`,
      code: `
        class Solution {
            public boolean isPerfectSquare(int num) {
                long lo = 1, hi = num;
                while (lo <= hi) {
                    long mid = lo + (hi - lo) / 2;
                    long sq = mid * mid;                 // long: no overflow
                    if (sq == num) return true;          // found an exact root
                    if (sq < num) lo = mid + 1;          // root must be bigger
                    else hi = mid - 1;                   // root must be smaller
                }
                return false;                            // no integer squares to num
            }
        }`,
      dry: {
        head: ['lo', 'hi', 'mid', 'mid²', 'vs 14', 'action'],
        rows: [
          ['1', '14', '7', '49', '&gt;', 'hi = 6'],
          ['1', '6', '3', '9', '&lt;', 'lo = 4'],
          ['4', '6', '5', '25', '&gt;', 'hi = 4'],
          ['4', '4', '4', '16', '&gt;', 'hi = 3'],
          ['4', '3', '–', '–', '–', H.c('r', 'return false')]
        ]
      },
      complexity: `<p><b>Time O(log num)</b>, <b>Space O(1)</b>.</p>`
    }
  });

  practice.push({
    title: 'Search a 2D Matrix',
    level: 'Medium',
    tags: ['binary search', 'index mapping', 'matrix'],
    companies: ['Amazon', 'Microsoft', 'Bloomberg'],
    statement: `<p>An <code>m × n</code> matrix has each row sorted left to right, and the first value of every row is greater than the last value of the previous row. Return <code>true</code> if <code>target</code> is in the matrix. Must be <b>O(log(m · n))</b>.</p>`,
    constraints: `1 ≤ m, n ≤ 100, -10<sup>4</sup> ≤ matrix[i][j], target ≤ 10<sup>4</sup>`,
    example: `<p>matrix = [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], target = 16 → ${H.c('g', 'true')}.</p>
      ${H.arr([1, 3, 5, 7, 10, 11, 16, 20, 23, 30, 34, 60], { label: 'read row by row (virtual array)', hl: { 6: 'g' } })}
      <p>Reading row by row gives one sorted list of 12 numbers. Virtual index 6 → row 6 / 4 = 1, column 6 % 4 = 2 → matrix[1][2] = 16.</p>`,
    brute: {
      why: `<p>Check every cell: O(m · n) = 10<sup>4</sup> steps. Or binary search each row: O(m log n). Both ignore that the whole matrix is one sorted sequence in row-major order.</p>`,
      code: `
        boolean brute(int[][] matrix, int target) {
            for (int[] row : matrix)
                for (int v : row)
                    if (v == target) return true;
            return false;
        }`
    },
    mcq: {
      q: `For a 3 × 4 matrix, which cell is virtual index 9?`,
      options: [`row 3, col 0`, `row 2, col 1`, `row 1, col 2`, `row 2, col 2`],
      answer: 1,
      explain: `row = 9 / 4 = 2, col = 9 % 4 = 1. Divide by the number of <b>columns</b>, not rows.`
    },
    hints: [
      `<p><b>Aha:</b> because each row starts after the previous row ends, reading row by row gives one sorted array of length m·n.</p>`,
      `<p>Binary search indices 0..m·n − 1 and map index k → <code>matrix[k / n][k % n]</code> — no copying.</p>`,
      `<p>Traps: divide by n (columns); hi = m·n − 1. A different problem ("Search a 2D Matrix II", rows and columns sorted separately) needs the staircase walk from the top-right corner instead, O(m + n).</p>`
    ],
    solution: {
      approach: `<p>Classic binary search over a virtual 1D array with index mapping.</p>`,
      code: `
        class Solution {
            public boolean searchMatrix(int[][] matrix, int target) {
                int m = matrix.length, n = matrix[0].length;
                int lo = 0, hi = m * n - 1;              // virtual indices of the flattened matrix
                while (lo <= hi) {
                    int mid = lo + (hi - lo) / 2;
                    int v = matrix[mid / n][mid % n];    // map back to (row, col)
                    if (v == target) return true;
                    if (v < target) lo = mid + 1;
                    else hi = mid - 1;
                }
                return false;
            }
        }`,
      dry: {
        head: ['lo', 'hi', 'mid', '(row, col)', 'value', 'action'],
        rows: [
          ['0', '11', '5', '(1, 1)', '11', '11 &lt; 16 → lo = 6'],
          ['6', '11', '8', '(2, 0)', '23', '23 &gt; 16 → hi = 7'],
          ['6', '7', '6', '(1, 2)', '16', H.c('g', 'found → true')]
        ]
      },
      complexity: `<p><b>Time O(log(m·n))</b>, <b>Space O(1)</b>.</p>`
    }
  });

  practice.push({
    title: 'Search in Rotated Sorted Array II (with duplicates)',
    level: 'Medium',
    tags: ['rotated array', 'duplicates'],
    companies: ['Amazon', 'LinkedIn'],
    statement: `<p>A non-decreasing array (duplicates allowed) was rotated at an unknown pivot. Given <code>nums</code> and <code>target</code>, return <code>true</code> if target is in nums. Try to keep the average case logarithmic, and explain the worst case.</p>`,
    constraints: `1 ≤ n ≤ 5000, -10<sup>4</sup> ≤ nums[i], target ≤ 10<sup>4</sup>`,
    example: `${H.arr([2, 5, 6, 0, 0, 1, 2], { label: 'nums', hl: { 3: 'g', 4: 'g' } })}
      <p>target = 0 → ${H.c('g', 'true')}; target = 3 → ${H.c('r', 'false')}. With <code>[1, 0, 1, 1, 1]</code> and lo = 0, mid = 2, hi = 4, all three probes are 1 — you cannot tell which side is sorted.</p>`,
    brute: {
      why: `<p>A linear scan is O(n) — and, surprisingly, that is also the <b>worst case</b> of any algorithm here (all equal values except one). But the binary search version is O(log n) for most inputs, which is why interviews still want it.</p>`,
      code: `
        boolean brute(int[] nums, int target) {
            for (int v : nums) if (v == target) return true;
            return false;
        }`
    },
    mcq: {
      q: `nums[lo] == nums[mid] == nums[hi] and none equals target. What is the safe move?`,
      options: [`lo = mid + 1`, `hi = mid - 1`, `lo++ and hi--`, `return false`],
      answer: 2,
      explain: `The probes can't tell which half is sorted. But lo and hi are not the target (they equal nums[mid] ≠ target), so dropping just those two ends is always safe.`
    },
    hints: [
      `<p><b>Aha:</b> the distinct-values algorithm works whenever the sorted half can be identified. It only fails when <code>nums[lo] == nums[mid] == nums[hi]</code>.</p>`,
      `<p>In that ambiguous case, shrink both ends by one (they are not the target). Otherwise use the normal "which half is sorted + is target inside it" logic.</p>`,
      `<p>Traps: check <code>nums[mid] == target</code> first; worst case O(n) (e.g. [1,1,1,…,1,0,1,1]); return boolean, not index. If nums[lo] == nums[mid] but nums[hi] differs, the left half is provably sorted.</p>`
    ],
    solution: {
      approach: `<p>Rotated search with one extra rule for the fully ambiguous probe.</p>`,
      code: `
        class Solution {
            public boolean search(int[] nums, int target) {
                int lo = 0, hi = nums.length - 1;
                while (lo <= hi) {
                    int mid = lo + (hi - lo) / 2;
                    if (nums[mid] == target) return true;
                    if (nums[lo] == nums[mid] && nums[mid] == nums[hi]) {
                        lo++;                                   // ends equal nums[mid] != target:
                        hi--;                                   // safe to drop both
                    } else if (nums[lo] <= nums[mid]) {         // left half sorted
                        if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
                        else lo = mid + 1;
                    } else {                                    // right half sorted
                        if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
                        else hi = mid - 1;
                    }
                }
                return false;
            }
        }`,
      dry: {
        head: ['lo', 'hi', 'mid', 'nums[lo], nums[mid], nums[hi]', 'case (target = 3)', 'action'],
        rows: [
          ['0', '6', '3', '2, 0, 2', 'right sorted (0..2)', '3 in (0, 2]? no → hi = 2'],
          ['0', '2', '1', '2, 5, 6', 'left sorted (2..5)', '3 in [2, 5)? yes → hi = 0'],
          ['0', '0', '0', '2, 2, 2', 'all equal, not 3', 'lo = 1, hi = -1'],
          ['1', '-1', '–', '–', '–', H.c('r', 'window empty → false')]
        ]
      },
      complexity: `<p><b>Time</b>: O(log n) on typical inputs, <b>O(n) worst case</b> (adversarial duplicates — provably unavoidable). <b>Space O(1)</b>.</p>`,
      followUps: ['Why can no algorithm beat O(n) in the worst case here?', 'How does "Find Minimum in Rotated Sorted Array II" handle the same ambiguity?']
    }
  });

  practice.push({
    title: 'Capacity To Ship Packages Within D Days',
    level: 'Medium',
    tags: ['binary search on answer', 'minimize the maximum'],
    companies: ['Amazon', 'Google'],
    statement: `<p>Packages with weights <code>weights[i]</code> must be shipped <b>in the given order</b> within <code>days</code> days. Each day the ship is loaded with consecutive packages whose total weight does not exceed its capacity. Return the <b>least capacity</b> that ships everything within <code>days</code> days.</p>`,
    constraints: `1 ≤ days ≤ n ≤ 5·10<sup>4</sup>, 1 ≤ weights[i] ≤ 500`,
    example: `${H.arr([3, 2, 2, 4, 1, 4], { label: 'weights', hl: { 0: 'b', 1: 'b', 2: 'p', 3: 'p', 4: 'g', 5: 'g' } })}
      <p>days = 3 → ${H.c('p', '6')}: day 1 = ${H.c('b', '3 + 2')}, day 2 = ${H.c('p', '2 + 4')}, day 3 = ${H.c('g', '1 + 4')}. Capacity 5 would need 4 days.</p>`,
    brute: {
      why: `<p>Try every capacity from max(weights) upward, simulating the days each time: up to (sum − max) × n ≈ 2.5·10<sup>7</sup> × 5·10<sup>4</sup> work in the worst case. The days-needed count never increases as capacity grows, so we only need the boundary.</p>`,
      code: `
        int brute(int[] weights, int days) {
            int cap = 0;
            for (int w : weights) cap = Math.max(cap, w);   // smallest sensible capacity
            while (true) {
                int need = 1, load = 0;
                for (int w : weights) { if (load + w > cap) { need++; load = 0; } load += w; }
                if (need <= days) return cap;              // first capacity that works
                cap++;
            }
        }`
    },
    mcq: {
      q: `What is the right search range for the capacity?`,
      options: [`[1, sum]`, `[max(weights), sum(weights)]`, `[min(weights), max(weights)]`, `[0, days]`],
      answer: 1,
      explain: `The heaviest package must fit on some day, so capacity ≥ max. Capacity = sum ships everything in one day, so it always works.`
    },
    hints: [
      `<p><b>Aha:</b> Painter's Partition with "days" as workers: minimize the maximum daily load, contiguous groups.</p>`,
      `<p>Check(cap): greedy — keep adding packages to today; when the next one would overflow, start a new day. Feasible if days used ≤ days.</p>`,
      `<p>Traps: lo = max (otherwise a single package heavier than cap breaks the greedy); first yes → on feasible hi = mid − 1. Recipe: lo = max, hi = sum; while lo ≤ hi …</p>`
    ],
    solution: {
      approach: `<p>First-yes binary search on capacity with a greedy day counter.</p>`,
      code: `
        class Solution {
            private int daysNeeded(int[] weights, int cap) {
                int days = 1, load = 0;
                for (int w : weights) {
                    if (load + w > cap) { days++; load = 0; }   // ship is full: next day
                    load += w;
                }
                return days;
            }

            public int shipWithinDays(int[] weights, int days) {
                int lo = 0, hi = 0;
                for (int w : weights) { lo = Math.max(lo, w); hi += w; }
                int ans = hi;
                while (lo <= hi) {
                    int mid = lo + (hi - lo) / 2;
                    if (daysNeeded(weights, mid) <= days) { ans = mid; hi = mid - 1; }
                    else lo = mid + 1;
                }
                return ans;
            }
        }`,
      dry: {
        head: ['lo', 'hi', 'mid', 'days needed', '≤ 3?', 'action'],
        rows: [
          ['4', '16', '10', '2 ([3,2,2] [4,1,4])', H.c('g', 'yes'), 'ans = 10, hi = 9'],
          ['4', '9', '6', '3 ([3,2] [2,4] [1,4])', H.c('g', 'yes'), 'ans = 6, hi = 5'],
          ['4', '5', '4', '5', H.c('r', 'no'), 'lo = 5'],
          ['5', '5', '5', '4 ([3,2] [2] [4,1] [4])', H.c('r', 'no'), 'lo = 6'],
          ['6', '5', '–', '–', '–', H.c('p', 'answer 6')]
        ]
      },
      complexity: `<p><b>Time O(n log(sum))</b> ≈ 5·10<sup>4</sup> × 25. <b>Space O(1)</b>.</p>`
    }
  });

  practice.push({
    title: 'Minimum Number of Days to Make m Bouquets',
    level: 'Medium',
    tags: ['binary search on answer', 'first true', 'adjacent groups'],
    companies: ['Google', 'Amazon'],
    statement: `<p>Flower i blooms on day <code>bloomDay[i]</code> and can then be used in exactly one bouquet. A bouquet needs <code>k</code> <b>adjacent</b> bloomed flowers. Return the minimum number of days to make <code>m</code> bouquets, or <code>-1</code> if impossible.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>5</sup>, 1 ≤ bloomDay[i] ≤ 10<sup>9</sup>, 1 ≤ m ≤ 10<sup>6</sup>, 1 ≤ k ≤ n`,
    example: `${H.arr([7, 7, 7, 7, 12, 7, 7], { label: 'bloomDay' })}
      <p>m = 2, k = 3 → ${H.c('p', '12')}. On day 7: bloomed = ✔✔✔✔✘✔✔ → one group of 3 (+1 left over) and a run of 2 → only 1 bouquet. On day 12 everything has bloomed: ✔✔✔ ✔✔✔ ✔ → 2 bouquets.</p>`,
    brute: {
      why: `<p>Try every distinct bloom day in increasing order and count bouquets each time: O(n) days × O(n) per count = O(n²) = 10<sup>10</sup>. More bloomed flowers can never make fewer bouquets, so the "enough bouquets by day D?" answer is monotonic.</p>`,
      code: `
        int brute(int[] bloomDay, int m, int k) {
            if ((long) m * k > bloomDay.length) return -1;
            int[] days = bloomDay.clone();
            Arrays.sort(days);
            for (int d : days) {                         // candidate answers in order
                int made = 0, run = 0;
                for (int b : bloomDay) {
                    run = b <= d ? run + 1 : 0;
                    if (run == k) { made++; run = 0; }
                }
                if (made >= m) return d;
            }
            return -1;
        }`
    },
    mcq: {
      q: `Why check <code>(long) m * k &gt; n</code> first?`,
      options: [`It speeds up the search`, `If we need more flowers than exist, no day works → -1`, `To avoid sorting`, `It is not needed`],
      answer: 1,
      explain: `m bouquets need m·k distinct flowers. If that exceeds n, even after every flower blooms it's impossible. m·k can reach 10<sup>11</sup>, so multiply in long.`
    },
    hints: [
      `<p><b>Aha:</b> "Can I make m bouquets by day D?" is no…no yes…yes in D. The answer is the first yes in <code>[min(bloomDay), max(bloomDay)]</code>.</p>`,
      `<p>Check(D): walk left to right with a run counter of consecutive bloomed flowers (bloomDay ≤ D). When run reaches k, make a bouquet and reset run to 0; a non-bloomed flower also resets run.</p>`,
      `<p>Traps: impossible case m·k &gt; n (long!); greedy taking the leftmost k is optimal; early exit when bouquets ≥ m. Recipe: if impossible → −1; lo = min, hi = max; first-yes search.</p>`
    ],
    solution: {
      approach: `<p>First-yes binary search on the day; feasibility counts adjacent runs greedily.</p>`,
      code: `
        class Solution {
            private boolean canMake(int[] bloomDay, int m, int k, int day) {
                int made = 0, run = 0;
                for (int b : bloomDay) {
                    if (b <= day) {
                        run++;                         // one more bloomed neighbour
                        if (run == k) { made++; run = 0; if (made >= m) return true; }
                    } else {
                        run = 0;                       // gap breaks adjacency
                    }
                }
                return false;
            }

            public int minDays(int[] bloomDay, int m, int k) {
                if ((long) m * k > bloomDay.length) return -1;   // not enough flowers ever
                int lo = Integer.MAX_VALUE, hi = 0;
                for (int b : bloomDay) { lo = Math.min(lo, b); hi = Math.max(hi, b); }
                int ans = hi;
                while (lo <= hi) {
                    int mid = lo + (hi - lo) / 2;
                    if (canMake(bloomDay, m, k, mid)) { ans = mid; hi = mid - 1; }
                    else lo = mid + 1;
                }
                return ans;
            }
        }`,
      dry: {
        head: ['lo', 'hi', 'mid', 'bloomed', 'bouquets', '≥ 2?', 'action'],
        rows: [
          ['7', '12', '9', '✔✔✔✔✘✔✔', '1', H.c('r', 'no'), 'lo = 10'],
          ['10', '12', '11', '✔✔✔✔✘✔✔', '1', H.c('r', 'no'), 'lo = 12'],
          ['12', '12', '12', '✔✔✔✔✔✔✔', '2', H.c('g', 'yes'), 'ans = 12, hi = 11'],
          ['12', '11', '–', '–', '–', '–', H.c('p', 'answer 12')]
        ]
      },
      complexity: `<p><b>Time O(n log(max − min))</b> ≈ 10<sup>5</sup> × 30. <b>Space O(1)</b>.</p>`
    }
  });

  /* ================= PRACTICE: Hard ================= */
  practice.push({
    title: 'Split Array Largest Sum',
    level: 'Hard',
    tags: ['binary search on answer', 'minimize the maximum', 'greedy'],
    companies: ['Google', 'Amazon', 'Meta'],
    statement: `<p>Given an integer array <code>nums</code> and an integer <code>k</code>, split nums into <code>k</code> non-empty <b>contiguous</b> subarrays so that the <b>largest subarray sum</b> is as small as possible. Return that minimized largest sum.</p>`,
    constraints: `1 ≤ n ≤ 1000, 0 ≤ nums[i] ≤ 10<sup>6</sup>, 1 ≤ k ≤ min(50, n)`,
    example: `${H.arr([7, 2, 5, 10, 8], { label: 'nums', hl: { 0: 'b', 1: 'b', 2: 'b', 3: 'p', 4: 'p' } })}
      <p>k = 2 → ${H.c('p', '18')}: ${H.c('b', '[7, 2, 5]')} sums to 14 and ${H.c('p', '[10, 8]')} sums to 18. Any other cut makes one side bigger (e.g. [7,2,5,10] | [8] → 24).</p>`,
    brute: {
      why: `<p>Dynamic programming: <code>dp[j][i]</code> = best possible largest sum when the first i numbers are split into j parts — try every last cut p. That is O(k · n²) = 50 × 10<sup>6</sup>, which passes here but not for n = 10<sup>5</sup>. Binary search on the answer with a greedy check is O(n log(sum)) and far simpler to get right.</p>`,
      code: `
        int brute(int[] nums, int k) {
            int n = nums.length;
            long[] pre = new long[n + 1];
            for (int i = 0; i < n; i++) pre[i + 1] = pre[i] + nums[i];
            long[][] dp = new long[k + 1][n + 1];
            for (long[] row : dp) Arrays.fill(row, Long.MAX_VALUE);
            dp[0][0] = 0;
            for (int j = 1; j <= k; j++)
                for (int i = 1; i <= n; i++)
                    for (int p = j - 1; p < i; p++)            // last part is nums[p..i-1]
                        if (dp[j - 1][p] != Long.MAX_VALUE)
                            dp[j][i] = Math.min(dp[j][i], Math.max(dp[j - 1][p], pre[i] - pre[p]));
            return (int) dp[k][n];
        }`
    },
    mcq: {
      q: `The greedy check for limit 15 needs 3 parts and k = 2. Conclusion?`,
      options: [`15 is the answer`, `The answer is &gt; 15 → lo = 16`, `The answer is &lt; 15 → hi = 14`, `Use DP instead`],
      answer: 1,
      explain: `Needing more parts than allowed means the limit is too tight; smaller limits are tighter still. Move right.`
    },
    hints: [
      `<p><b>Aha:</b> this is Painter's Partition: "can I split into ≤ k parts with every part ≤ L?" is monotonic in L. Want the first yes in <code>[max, sum]</code>.</p>`,
      `<p>Greedy check: running sum; when adding the next number would exceed L, start a new part. Feasible if parts ≤ k ("≤" is fine: a feasible split into fewer parts can be cut further, since k ≤ n).</p>`,
      `<p>Traps: lo = max(nums) (zeros are allowed, so min could be 0 but the max element must fit); sums up to 10<sup>9</sup> fit in int but use long for safety. Recipe: lo = max, hi = sum, first-yes search.</p>`
    ],
    solution: {
      approach: `<p>First-yes binary search on the largest-sum limit with greedy part counting.</p>`,
      code: `
        class Solution {
            private int partsNeeded(int[] nums, long limit) {
                int parts = 1;
                long run = 0;
                for (int x : nums) {
                    if (run + x > limit) { parts++; run = 0; }   // start a new subarray
                    run += x;
                }
                return parts;
            }

            public int splitArray(int[] nums, int k) {
                long lo = 0, hi = 0;
                for (int x : nums) { lo = Math.max(lo, x); hi += x; }
                long ans = hi;
                while (lo <= hi) {
                    long mid = lo + (hi - lo) / 2;
                    if (partsNeeded(nums, mid) <= k) { ans = mid; hi = mid - 1; }
                    else lo = mid + 1;
                }
                return (int) ans;
            }
        }`,
      dry: {
        head: ['lo', 'hi', 'mid', 'greedy parts', 'count', '≤ 2?', 'action'],
        rows: [
          ['10', '32', '21', '[7,2,5] [10,8]', '2', H.c('g', 'yes'), 'ans = 21, hi = 20'],
          ['10', '20', '15', '[7,2,5] [10] [8]', '3', H.c('r', 'no'), 'lo = 16'],
          ['16', '20', '18', '[7,2,5] [10,8]', '2', H.c('g', 'yes'), 'ans = 18, hi = 17'],
          ['16', '17', '16', '[7,2,5] [10] [8]', '3', H.c('r', 'no'), 'lo = 17'],
          ['17', '17', '17', '[7,2,5] [10] [8]', '3', H.c('r', 'no'), 'lo = 18'],
          ['18', '17', '–', '–', '–', '–', H.c('p', 'answer 18')]
        ]
      },
      complexity: `<p><b>Time O(n log(sum))</b> ≈ 1000 × 30. <b>Space O(1)</b>. (DP alternative: O(k·n²) time, O(k·n) space.)</p>`
    }
  });

  practice.push({
    title: 'Median of Two Sorted Arrays',
    level: 'Hard',
    tags: ['binary search on partition', 'two arrays'],
    companies: ['Google', 'Amazon', 'Microsoft', 'Apple', 'Goldman Sachs'],
    statement: `<p>Given two sorted arrays <code>A</code> (size m) and <code>B</code> (size n), return the <b>median</b> of the combined sorted data. The overall run time must be <b>O(log(m + n))</b>.</p>`,
    constraints: `0 ≤ m, n ≤ 1000, 1 ≤ m + n ≤ 2000, -10<sup>6</sup> ≤ values ≤ 10<sup>6</sup>`,
    example: `${H.arr([1, 3, 8], { label: 'A', hl: { 0: 'b', 1: 'b', 2: 'b' } })}${H.arr([7, 9, 10, 11], { label: 'B', hl: { 0: 'b', 1: 'p', 2: 'p', 3: 'p' } })}
      <p>Merged: 1 3 7 ${H.c('p', '8')} 9 10 11 → median ${H.c('p', '8')}. The ${H.c('b', 'blue')} cells are the "left half" (4 smallest): all of A and the first element of B. Every blue value ≤ every purple value, and the median is the largest blue value.</p>`,
    brute: {
      why: `<p>Merge both arrays like in merge sort (O(m + n)) and read the middle. Simple and correct, but it reads every element although we only need to know <b>where the cut</b> between the smaller half and the bigger half falls. The cut position in A determines the cut in B, so we can binary search one number: how many elements A contributes to the left half.</p>`,
      code: `
        double brute(int[] A, int[] B) {
            int[] all = new int[A.length + B.length];
            int i = 0, j = 0, k = 0;
            while (i < A.length && j < B.length) all[k++] = A[i] <= B[j] ? A[i++] : B[j++];
            while (i < A.length) all[k++] = A[i++];
            while (j < B.length) all[k++] = B[j++];
            int t = all.length;
            return t % 2 == 1 ? all[t / 2] : (all[t / 2 - 1] + (long) all[t / 2]) / 2.0;
        }`
    },
    mcq: {
      q: `With the cut taking i elements from A and j from B, which condition means the cut is correct?`,
      options: [`A[i] ≤ B[j]`, `A[i−1] ≤ B[j] and B[j−1] ≤ A[i]`, `A[i−1] == B[j−1]`, `i == j`],
      answer: 1,
      explain: `The left half must be entirely ≤ the right half. Inside each array that's automatic (sorted), so only the two cross pairs need checking: A's last-left vs B's first-right and B's last-left vs A's first-right.`
    },
    hints: [
      `<p><b>Aha:</b> the left half always has <code>half = (m + n + 1) / 2</code> elements. If A contributes i of them, B contributes j = half − i. So the only unknown is i ∈ [0, m] — binary search it.</p>`,
      `<p>For a candidate i: if <code>A[i−1] &gt; B[j]</code>, A gave too many → hi = i − 1. If <code>B[j−1] &gt; A[i]</code>, A gave too few → lo = i + 1. Otherwise the cut is right. Use ±∞ for out-of-range neighbours.</p>`,
      `<p>Traps: binary search the <b>shorter</b> array (so j stays in range); odd total → median = max(left side); even → (max(left) + min(right)) / 2.0 in long/double. Empty A is fine (i = 0).</p>`
    ],
    solution: {
      approach: `<p>Binary search the partition index in the smaller array; check the two cross conditions.</p>`,
      code: `
        class Solution {
            public double findMedianSortedArrays(int[] A, int[] B) {
                if (A.length > B.length) return findMedianSortedArrays(B, A);  // search the shorter one
                int m = A.length, n = B.length;
                int half = (m + n + 1) / 2;                 // size of the left half
                int lo = 0, hi = m;                         // i = how many elements A gives
                while (lo <= hi) {
                    int i = lo + (hi - lo) / 2;
                    int j = half - i;                       // B gives the rest
                    int aLeft  = i == 0 ? Integer.MIN_VALUE : A[i - 1];
                    int aRight = i == m ? Integer.MAX_VALUE : A[i];
                    int bLeft  = j == 0 ? Integer.MIN_VALUE : B[j - 1];
                    int bRight = j == n ? Integer.MAX_VALUE : B[j];
                    if (aLeft <= bRight && bLeft <= aRight) {           // valid cut
                        if ((m + n) % 2 == 1) return Math.max(aLeft, bLeft);
                        return (Math.max(aLeft, bLeft) + (long) Math.min(aRight, bRight)) / 2.0;
                    } else if (aLeft > bRight) {
                        hi = i - 1;                         // A gave too many: move cut left
                    } else {
                        lo = i + 1;                         // A gave too few: move cut right
                    }
                }
                throw new IllegalArgumentException("inputs were not sorted");
            }

            public static void main(String[] args) {
                System.out.println(new Solution().findMedianSortedArrays(new int[]{1, 3, 8}, new int[]{7, 9, 10, 11})); // 8.0
                System.out.println(new Solution().findMedianSortedArrays(new int[]{1, 2}, new int[]{3, 4}));            // 2.5
            }
        }`,
      dry: {
        head: ['lo', 'hi', 'i', 'j', 'A[i−1] | A[i]', 'B[j−1] | B[j]', 'check', 'action'],
        rows: [
          ['0', '3', '1', '3', '1 | 3', '10 | 11', '10 &gt; 3', 'lo = 2'],
          ['2', '3', '2', '2', '3 | 8', '9 | 10', '9 &gt; 8', 'lo = 3'],
          ['3', '3', '3', '1', '8 | +∞', '7 | 9', '8 ≤ 9 and 7 ≤ +∞ ✔', H.c('p', 'odd → max(8, 7) = 8')]
        ]
      },
      complexity: `<p><b>Time O(log(min(m, n)))</b> — even better than required. <b>Space O(1)</b>.</p>`,
      followUps: ['Generalize to the k-th smallest element of two sorted arrays.', 'What if the arrays are huge files on two machines? (Same idea: exchange O(log n) probes.)']
    }
  });

  practice.push({
    title: 'Find Minimum in Rotated Sorted Array II (duplicates)',
    level: 'Hard',
    tags: ['rotated array', 'duplicates', 'template B'],
    companies: ['Amazon', 'Google'],
    statement: `<p>A non-decreasing array that may contain <b>duplicates</b> was rotated between 1 and n times. Return the minimum element. Decrease the number of operations as much as possible and explain the worst case.</p>`,
    constraints: `1 ≤ n ≤ 5000, -5000 ≤ nums[i] ≤ 5000`,
    example: `${H.arr([10, 1, 10, 10, 10], { label: 'nums', hl: { 1: 'p' } })}
      <p>Output ${H.c('p', '1')}. Compare with ${H.arr([10, 10, 10, 1, 10], { label: 'nums' })} — at lo = 0, mid = 2, hi = 4 both arrays show 10, 10, 10, yet the minimum is on different sides.</p>`,
    brute: {
      why: `<p>Scan for the minimum: O(n). For the duplicates version this is also the worst case of any algorithm, but binary search with "hi−−" on ties is O(log n) whenever duplicates do not block the decision.</p>`,
      code: `
        int brute(int[] nums) {
            int best = nums[0];
            for (int v : nums) best = Math.min(best, v);
            return best;
        }`
    },
    mcq: {
      q: `nums[mid] == nums[hi]. Why is <code>hi--</code> safe?`,
      options: [`Because hi is always the maximum`, `Because even if nums[hi] is a minimum, nums[mid] has the same value and stays in the window`, `Because duplicates never matter`, `It is not safe`],
      answer: 1,
      explain: `Dropping index hi can't lose the minimum value: an equal copy at mid (which is &lt; hi) remains in [lo, hi − 1].`
    },
    hints: [
      `<p><b>Aha:</b> compare <code>nums[mid]</code> with <code>nums[hi]</code> like the distinct version: bigger → min is right of mid; smaller → min is mid or left.</p>`,
      `<p>Only the tie <code>nums[mid] == nums[hi]</code> is new: you can't tell the side, but you can safely discard hi (its value survives at mid).</p>`,
      `<p>Traps: don't discard mid on a tie; worst case O(n) for arrays like [1,1,1,…,1]; return the value, not the index (the index of "the" minimum isn't unique). Recipe: while lo &lt; hi: mid; &gt; → lo = mid + 1; &lt; → hi = mid; == → hi−−.</p>`
    ],
    solution: {
      approach: `<p>Template B on the "drop", shrinking hi by one on ties.</p>`,
      code: `
        class Solution {
            public int findMin(int[] nums) {
                int lo = 0, hi = nums.length - 1;
                while (lo < hi) {
                    int mid = lo + (hi - lo) / 2;
                    if (nums[mid] > nums[hi]) {
                        lo = mid + 1;          // drop is right of mid
                    } else if (nums[mid] < nums[hi]) {
                        hi = mid;              // mid..hi sorted: min is mid or left
                    } else {
                        hi--;                  // tie: hi's value also lives at mid, drop hi
                    }
                }
                return nums[lo];
            }
        }`,
      dry: {
        head: ['lo', 'hi', 'mid', 'nums[mid] vs nums[hi]', 'action'],
        rows: [
          ['0', '4', '2', '10 == 10', 'hi = 3'],
          ['0', '3', '1', '1 &lt; 10', 'hi = 1'],
          ['0', '1', '0', '10 &gt; 1', 'lo = 1'],
          ['1', '1', '–', '–', H.c('p', 'return nums[1] = 1')]
        ]
      },
      complexity: `<p><b>Time</b>: O(log n) typical, <b>O(n) worst case</b> (all equal). <b>Space O(1)</b>.</p>`
    }
  });

  practice.push({
    title: 'Kth Smallest Number in Multiplication Table',
    level: 'Hard',
    tags: ['binary search on answer', 'counting', 'implicit matrix'],
    companies: ['Google'],
    statement: `<p>The <code>m × n</code> multiplication table has value <code>i · j</code> at row i, column j (1-indexed). Return the <b>k-th smallest</b> number in the table (counting duplicates).</p>`,
    constraints: `1 ≤ m, n ≤ 3·10<sup>4</sup>, 1 ≤ k ≤ m · n`,
    example: `<p>m = 3, n = 3, k = 5.</p>
      ${H.table(['×', '1', '2', '3'], [['1', '1', '2', '3'], ['2', '2', '4', '6'], ['3', '3', '6', '9']])}
      <p>Sorted: 1, 2, 2, 3, ${H.c('p', '3')}, 4, 6, 6, 9 → the 5th smallest is ${H.c('p', '3')}.</p>`,
    brute: {
      why: `<p>Write all m·n products into an array, sort, pick index k − 1. With m = n = 3·10<sup>4</sup> that is 9·10<sup>8</sup> numbers — too much memory and time. We never need the whole table: "how many values are ≤ x?" can be counted row by row in O(m) without building it.</p>`,
      code: `
        int brute(int m, int n, int k) {
            int[] all = new int[m * n];
            int idx = 0;
            for (int i = 1; i <= m; i++)
                for (int j = 1; j <= n; j++) all[idx++] = i * j;
            Arrays.sort(all);
            return all[k - 1];
        }`
    },
    mcq: {
      q: `How many values in row i (i, 2i, …, n·i) are ≤ x?`,
      options: [`x − i`, `min(x / i, n)`, `x / n`, `i · n`],
      answer: 1,
      explain: `Row i holds the multiples of i up to n·i. The multiples of i that are ≤ x are i, 2i, …, ⌊x/i⌋·i — but at most n of them exist.`
    },
    hints: [
      `<p><b>Aha:</b> count(x) = number of table values ≤ x is non-decreasing in x. The answer is the <b>smallest x with count(x) ≥ k</b> — a first-yes search on values 1..m·n.</p>`,
      `<p>count(x) = Σ<sub>i=1..m</sub> min(x / i, n), O(m) per check. Binary search x in [1, m·n].</p>`,
      `<p>Traps: the first x with count ≥ k is automatically a value that appears in the table (count only jumps at table values), so no extra check is needed; m·n can be 9·10<sup>8</sup> (fits int) but sums of counts fit easily too. Recipe: lo = 1, hi = m·n; mid; count(mid) ≥ k ? (ans = mid, hi = mid − 1) : lo = mid + 1.</p>`
    ],
    solution: {
      approach: `<p>Binary search on the value with a row-by-row counting check — the "k-th smallest via counting" pattern.</p>`,
      code: `
        class Solution {
            private long countAtMost(int m, int n, int x) {
                long c = 0;
                for (int i = 1; i <= m; i++) c += Math.min(x / i, n);   // multiples of i that are <= x
                return c;
            }

            public int findKthNumber(int m, int n, int k) {
                int lo = 1, hi = m * n, ans = hi;
                while (lo <= hi) {
                    int mid = lo + (hi - lo) / 2;
                    if (countAtMost(m, n, mid) >= k) { ans = mid; hi = mid - 1; }  // enough values <= mid
                    else lo = mid + 1;
                }
                return ans;
            }
        }`,
      dry: {
        head: ['lo', 'hi', 'mid', 'count(mid) = rows 1+2+3', '≥ 5?', 'action'],
        rows: [
          ['1', '9', '5', '3 + 2 + 1 = 6', H.c('g', 'yes'), 'ans = 5, hi = 4'],
          ['1', '4', '2', '2 + 1 + 0 = 3', H.c('r', 'no'), 'lo = 3'],
          ['3', '4', '3', '3 + 1 + 1 = 5', H.c('g', 'yes'), 'ans = 3, hi = 2'],
          ['3', '2', '–', '–', '–', H.c('p', 'answer 3')]
        ]
      },
      complexity: `<p><b>Time O(m · log(m·n))</b> ≈ 3·10<sup>4</sup> × 30. <b>Space O(1)</b>. Same trick: k-th smallest in a sorted matrix, k-th smallest pair distance, k-th smallest prime fraction.</p>`
    }
  });

  /* ================= QUIZ ================= */
  quiz.push(
    { q: 'Why is <code>mid = lo + (hi - lo) / 2</code> preferred over <code>(lo + hi) / 2</code> in Java?', options: ['It is faster', '<code>lo + hi</code> can overflow int when both are large', 'It rounds up instead of down', 'It works on unsorted arrays'], answer: 1, explain: 'With lo and hi near 2·10<sup>9</sup>, lo + hi exceeds 2<sup>31</sup> − 1 and wraps negative. hi − lo never overflows for valid indices.' },
    { q: 'At most how many comparisons does binary search need on 1,000,000 sorted items?', options: ['~10', '~20', '~1,000', '~500,000'], answer: 1, explain: '2<sup>20</sup> ≈ 1.05 million, so ⌊log₂ 10<sup>6</sup>⌋ + 1 = 20 looks are enough.' },
    { q: 'Template <code>while (lo &lt; hi)</code> with <code>lo = mid</code> on one branch. What must mid be to avoid an infinite loop?', options: ['<code>lo + (hi - lo) / 2</code> (lower middle)', '<code>lo + (hi - lo + 1) / 2</code> (upper middle)', '<code>hi - 1</code>', 'It never loops forever'], answer: 1, explain: 'With lo = 3, hi = 4 the lower middle is 3; lo = mid keeps lo = 3 forever. The upper middle (4) guarantees progress.' },
    { q: 'In <code>[1, 2, 2, 2, 5]</code>, lowerBound(2) and upperBound(2) are…', options: ['1 and 3', '1 and 4', '0 and 4', '2 and 3'], answer: 1, explain: 'First index with a[i] ≥ 2 is 1; first index with a[i] &gt; 2 is 4 (value 5). Count = 4 − 1 = 3.' },
    { q: 'Java <code>Arrays.binarySearch</code> on an array with duplicates returns…', options: ['The first occurrence', 'The last occurrence', 'Some matching index — no guarantee which', 'Always −1'], answer: 2, explain: 'The Javadoc says: if the array contains multiple equal elements, there is no guarantee which one will be found. Write your own lower bound for "first".' },
    { q: 'Rotated array (distinct): <code>a[lo] = 9, a[mid] = 3, a[hi] = 7</code>. Which half is sorted?', options: ['Left half [lo..mid]', 'Right half [mid..hi]', 'Both', 'Neither'], answer: 1, explain: 'a[lo] &gt; a[mid] means the drop lies between lo and mid, so the right half has no drop and is sorted (values 3..7).' },
    { q: 'Find Peak Element: <code>a[mid] &gt; a[mid+1]</code>. Correct move?', options: ['<code>lo = mid + 1</code>', '<code>hi = mid</code>', '<code>hi = mid - 1</code>', 'return mid'], answer: 1, explain: 'Downhill to the right: mid itself may be the peak or there is one to the left. Keep mid in the window.' },
    { q: 'Integer sqrt of 2,147,483,647 by binary search. What breaks if you compute <code>mid * mid</code> in int?', options: ['Nothing', 'Overflow gives wrong comparisons', 'Division by zero', 'Infinite recursion'], answer: 1, explain: 'mid ≈ 10<sup>9</sup> squared is 10<sup>18</sup>, far outside int. Use (long) mid * mid or compare mid ≤ x / mid.' },
    { q: '"Maximize the minimum distance" (Aggressive Cows) has a feasibility strip shaped like…', options: ['no no yes yes — want first yes', 'yes yes no no — want last yes', 'random — binary search does not apply', 'yes no yes no'], answer: 1, explain: 'If cows can be d apart they can be d − 1 apart, so feasibility is true for small d and false for large d. The answer is the last yes.' },
    { q: 'For Painter\'s Partition / Allocate Books, the correct search range is…', options: ['[0, sum]', '[1, max]', '[max(a), sum(a)]', '[min(a), max(a)]'], answer: 2, explain: 'Someone must take the largest item (≥ max) and one worker could take everything (≤ sum). Below max the greedy check is invalid.' },
    { q: 'Koko: what is wrong with <code>hours += Math.ceil(p / k)</code> when p and k are ints?', options: ['Nothing', '<code>p / k</code> is integer division, already rounded down before ceil', 'Math.ceil is too slow', 'It overflows at k = 1 only'], answer: 1, explain: 'p / k truncates first (7 / 2 = 3), so Math.ceil(3) = 3 instead of 4. Use (p + k − 1) / k or Math.ceil((double) p / k).' },
    { q: 'Which statement best describes when binary search on the answer is valid?', options: ['When the input array is sorted', 'When a yes/no check on a candidate answer is monotonic over the answer range', 'When N ≤ 1000', 'Only for minimization problems'], answer: 1, explain: 'The input need not be sorted (Koko, Painter\'s). What matters is a monotonic predicate: once true it stays true (or vice versa).' },
    { q: 'Search in Rotated Sorted Array II (duplicates): worst-case time?', options: ['O(log n)', 'O(n)', 'O(n log n)', 'O(1)'], answer: 1, explain: 'When a[lo] == a[mid] == a[hi] you can only shrink by one. Adversarial input like [1,1,…,0,…,1] forces O(n), and no algorithm can do better.' }
  );

  /* ================= INTERVIEW Q&A ================= */
  interview.push(
    { q: 'Explain binary search to a non-programmer, then state its time complexity.', level: 'B', a: `<p>It's how you find a word in a paper dictionary: open the middle, see whether your word comes before or after, and ignore the other half. Repeat on what's left. Each look halves the remaining pages, so for n items you need about log₂ n looks — <b>O(log n)</b> time, O(1) extra space (iterative). It requires sorted data (or more generally a yes/no question that flips once) and O(1) random access.</p>`, followUps: ['Why does it need random access?', 'What is the recursive version\'s space complexity? (O(log n) stack)'] },
    { q: 'What is the overflow bug in binary search and how do you fix it?', level: 'B', a: `<p><code>mid = (lo + hi) / 2</code> overflows when lo + hi &gt; 2<sup>31</sup> − 1 (arrays over ~10<sup>9</sup> elements or searches over large answer ranges); the sum wraps negative and you index out of bounds. Fix: <code>lo + (hi - lo) / 2</code>, or in Java <code>(lo + hi) &gt;&gt;&gt; 1</code> (unsigned shift treats the wrapped bits as a positive 32-bit number). This exact bug lived in the JDK's Arrays.binarySearch for years until Joshua Bloch reported it in 2006.</p>`, followUps: ['Does Python have this bug? (No — arbitrary-precision ints.)', 'Why does >>> 1 work but >> 1 not?'] },
    { q: 'What is a loop invariant? State the invariant for classic binary search and for lower bound.', level: 'I', a: `<p>An invariant is a statement true before every iteration; with termination it proves correctness. Classic (closed [lo, hi]): <i>"if target exists, its index is in [lo, hi]"</i>; when lo &gt; hi the window is empty → not present. Lower bound (half-open, hi = n): <i>"every index &lt; lo has a[i] &lt; x and every index ≥ hi has a[i] ≥ x"</i>; when lo == hi, lo is the first index with a[i] ≥ x. Every update must preserve the invariant and strictly shrink hi − lo.</p>`, followUps: ['How do you prove termination?', 'Which invariant breaks if you write hi = mid − 1 in lower bound?'] },
    { q: 'Compare the <code>lo ≤ hi</code> and <code>lo &lt; hi</code> templates. When do you use each?', level: 'I', a: `<p><b>lo ≤ hi</b>: closed window that may become empty; moves are mid ± 1; good for exact search and "save ans then keep going" (first/last occurrence, answer-space search). <b>lo &lt; hi</b>: window always holds ≥ 1 candidate; one branch keeps mid (hi = mid); ends with lo == hi as the answer; good for "first index where P is true", peak element, min in rotated array. Never mix parts: lo &lt; hi with hi = mid − 1 can skip the answer, and lo = mid with lower middle can loop forever.</p>`, followUps: ['Rewrite peak finding with the lo ≤ hi template.', 'What does hi = n (not n − 1) buy you?'] },
    { q: 'How do you find the first and last occurrence of a target in a sorted array in O(log n)?', level: 'I', a: `<p>Run binary search twice without stopping at the first hit. For the first occurrence, on a match save ans = mid and continue left (hi = mid − 1); for the last, save and continue right (lo = mid + 1). Equivalent: first = lowerBound(x) if a[lb] == x; last = upperBound(x) − 1. Count = upper − lower. "Find one then expand" is O(n) when all elements equal the target.</p>`, followUps: ['How do you count elements in a value range [L, R]?', 'Which Python/C++ library functions do this?'] },
    { q: 'Walk through Search in Rotated Sorted Array. What changes with duplicates?', level: 'I', a: `<p>At each step one half of [lo, hi] is sorted (the single drop is on one side). If a[lo] ≤ a[mid] the left half is sorted: target in [a[lo], a[mid]) → go left, else go right. Otherwise the right half is sorted: target in (a[mid], a[hi]] → go right, else left. O(log n). With duplicates, a[lo] == a[mid] == a[hi] gives no information; shrink lo++ and hi−− (both ≠ target). Worst case becomes O(n), which is optimal — an adversary can hide the answer.</p>`, followUps: ['Find the rotation count.', 'Solve it by first finding the pivot, then a normal search.'] },
    { q: 'Find Peak Element works on an unsorted array. Why is binary search valid there?', level: 'I', a: `<p>Binary search only needs a rule that guarantees an answer on one side. If a[mid] &lt; a[mid+1], walking right is uphill, and since the boundary is −∞ the climb must end at a peak in (mid, hi]. Otherwise a peak exists in [lo, mid]. The invariant "a[lo−1] &lt; a[lo] and a[hi] &gt; a[hi+1]" holds throughout, so when lo == hi that element is a peak. It needs neighbours to differ; plateaus break the argument.</p>`, followUps: ['How about finding a peak in a 2D grid?', 'Can you find the global maximum in O(log n)? (No — Ω(n).)'] },
    { q: 'What is "binary search on the answer"? Give the recipe and two examples.', level: 'A', a: `<p>Instead of searching positions in an array, search the space of possible answers with a feasibility check. Recipe: (1) define the range [lo, hi] of possible answers; (2) write ok(x), usually a greedy O(n) pass; (3) prove ok is monotonic; (4) binary search for the first true (minimize) or last true (maximize). Cost O(n log range). Examples: Koko's minimum eating speed (first true over speeds 1..max), Aggressive Cows (last true over distances 1..max−min), Painter's Partition / Ship Packages (first true over [max, sum]).</p>`, followUps: ['How do you choose hi when no natural upper bound exists? (Exponential search.)', 'What if ok() is expensive, e.g. a 10-minute load test?'] },
    { q: 'Prove the greedy check in Aggressive Cows is optimal.', level: 'A', a: `<p>Exchange argument. Sort stalls. Greedy places cow 1 at the first stall and each next cow at the first stall ≥ d from the previous cow. Compare with any valid placement O. By induction greedy's i-th cow is at or left of O's i-th cow: true for i = 1; if true for i, O's (i+1)-th cow is ≥ d from O's i-th cow, hence ≥ d from greedy's i-th cow (which is further left), so greedy's (i+1)-th cow is at or left of it. So greedy places at least as many cows as any valid placement — if any placement of k cows exists, greedy finds one.</p>`, followUps: ['Why must the stalls be sorted?', 'Prove monotonicity of feasibility in d.'] },
    { q: 'Painter\'s Partition: why is the range [max, sum] and why use long?', level: 'A', a: `<p>The answer is the maximum load of a worker. Someone must take the single largest board, so the answer ≥ max; one worker taking everything gives exactly sum, so the answer ≤ sum. Starting below max breaks the greedy (a single board larger than the limit would be "accepted" into a fresh group). Sum can be n × max = 10<sup>5</sup> × 10<sup>9</sup> = 10<sup>14</sup>, beyond int, so lo, hi, mid and running loads must be long. Total time O(n log(sum)) ≈ 10<sup>5</sup> × 47.</p>`, followUps: ['What if items need not be contiguous? (NP-hard partitioning.)', 'Compare with the O(k n²) DP.'] },
    { q: 'How does Median of Two Sorted Arrays reach O(log(min(m, n)))?', level: 'E', a: `<p>The median splits the combined data into a left half of size half = (m + n + 1) / 2 and a right half. If A contributes i elements, B contributes j = half − i, so only i ∈ [0, m] is unknown. A cut is valid when A[i−1] ≤ B[j] and B[j−1] ≤ A[i] (with ±∞ sentinels). If A[i−1] &gt; B[j], A gave too many → move left; else move right. Searching the shorter array keeps j in range and gives O(log(min(m, n))). The median is max(left) for odd totals, else the average of max(left) and min(right).</p>`, followUps: ['Generalize to the k-th smallest of two arrays.', 'Why must we binary search the shorter array?'] },
    { q: 'Where does binary search appear in real systems?', level: 'E', a: `<p>B-tree/B+tree pages in databases binary search keys within each node; LSM-tree stores binary search SSTable sparse indexes; Kafka binary searches its offset and time index files to locate a message; <code>git bisect</code> binary searches commits to find a regression; load testing binary searches the max sustainable QPS; ML picks a decision threshold meeting a precision target; network MTU discovery and rate limiters binary search thresholds. Performance-sensitive code uses branchless or cache-friendly (Eytzinger) layouts because cache misses, not comparisons, dominate.</p>`, followUps: ['Why can a linear scan beat binary search on 32 elements?', 'How would you binary search over data on disk with minimal I/O?'] },
    { q: 'How do you binary search over real numbers, and what goes wrong with an epsilon loop?', level: 'E', a: `<p>Keep lo, hi as doubles and set lo = mid or hi = mid depending on the check. A loop like <code>while (hi - lo &gt; 1e-9)</code> can run forever for large magnitudes (e.g. 10<sup>12</sup>), where adjacent doubles are farther apart than 10<sup>-9</sup>, so the gap stops shrinking. Safer: a fixed number of iterations (60–100 halvings exhaust double precision) or a relative tolerance. Each iteration gains one bit of precision; Newton's method converges faster when a derivative is available.</p>`, followUps: ['How many iterations for error 10<sup>-6</sup> on an initial gap of 10<sup>9</sup>? (~50.)', 'When would you choose ternary search?'] }
  );

  /* Practice must run Easy → Medium → Hard (stable sort keeps the authoring order inside a level). */
  var RANK = { Easy: 0, Medium: 1, Hard: 2 };
  practice.sort(function (a, b) { return RANK[a.level] - RANK[b.level]; });

  registerModule({
    id: 'dsa10',
    title: 'Binary Search',
    intro: `<p>Open a thick dictionary in the middle, see that your word comes later, and throw away the whole left half without reading it. Do it again and again: a 1,000-page book takes about <b>10 flips</b>. That one idea — <b>look at the middle, discard the half that cannot hold the answer</b> — is binary search, and it turns O(n) into <b>O(log n)</b>.</p>
      <p>This module starts with the classic search (overflow-safe <code>mid</code>, loop invariants, the two templates <code>lo ≤ hi</code> and <code>lo &lt; hi</code>), then bends the idea: first/last occurrence with lower and upper bound, rotated arrays, peak elements in <i>unsorted</i> arrays, and integer square root over a range of numbers. Finally comes the interview superpower: <b>binary search on the answer</b> — Aggressive Cows, Painter's Partition, Allocate Books and Koko Eating Bananas — driven by one principle: a <b>monotonic yes/no feasibility check</b>.</p>
      <p>Every topic has a visualizer showing <code>lo</code>, <code>mid</code>, <code>hi</code> and the discarded half fading away, worked examples, the exact words in a question that should make you think "binary search", and how to work alongside AI without inheriting its off-by-one bugs.</p>`,
    goals: [
      'Write a bug-free binary search from memory in both templates (<code>lo ≤ hi</code> and <code>lo &lt; hi</code>), with an overflow-safe mid, and explain its loop invariant',
      'Find first/last occurrence, count, floor and ceiling with lower bound / upper bound in O(log n)',
      'Search rotated sorted arrays and find peaks by identifying which half is guaranteed to contain the answer',
      'Turn "minimize the maximum" / "maximize the minimum" / "minimum speed or capacity" problems into binary search on the answer with a greedy feasibility check',
      'Prove monotonicity and greedy correctness out loud, and pick the right answer range and data types (long) under interview pressure'
    ],
    prereqs: `DSA 2 (Math Foundations & Complexity — logarithms as repeated halving), DSA 5 (Arrays & Prefix Sums) and DSA 7 (Sorting & Intervals). Comfortable with Java loops, arrays and integer overflow.`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
