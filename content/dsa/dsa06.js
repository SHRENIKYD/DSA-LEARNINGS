(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // ---------- small shared helpers for the visualizers ----------
  // Turn "1 2 3" into [1,2,3]; friendly errors on bad input.
  function parseArr(s, max, minLen) {
    var t = String(s === undefined || s === null ? '' : s).trim();
    if (!t) throw new Error('Please type some whole numbers separated by spaces, for example: 1 2 4 7');
    var a = t.split(/[\s,]+/).map(Number);
    if (a.some(function (x) { return !isFinite(x) || Math.floor(x) !== x; })) {
      throw new Error('Only whole numbers please, separated by spaces (for example: 2 7 11 15).');
    }
    if (a.some(function (x) { return Math.abs(x) > 9999; })) throw new Error('Keep every number between -9999 and 9999 so it fits on screen.');
    if (a.length > max) throw new Error('Please use at most ' + max + ' numbers so the picture fits on screen.');
    if (a.length < (minLen || 1)) throw new Error('Please enter at least ' + (minLen || 1) + ' numbers.');
    return a;
  }
  // Turn "1 2 3 | 5" into {a:[1,2,3], k:5}.
  function parseArrK(s, max, kName, minLen) {
    var parts = String(s === undefined || s === null ? '' : s).split('|');
    if (parts.length !== 2) throw new Error('Format: numbers | ' + kName + '   (for example: 1 2 4 7 | 9)');
    var a = parseArr(parts[0], max, minLen);
    var kt = parts[1].trim();
    var k = Number(kt);
    if (kt === '' || !isFinite(k) || Math.floor(k) !== k) throw new Error('The ' + kName + ' after the | must be one whole number.');
    if (Math.abs(k) > 99999) throw new Error('Keep the ' + kName + ' between -99999 and 99999.');
    return { a: a, k: k };
  }
  // Build a highlight / pointer map. pairs = [[index, value], ...]; later pairs win for hl,
  // pointers on the same index are stacked into an array.
  function hlMap(pairs) {
    var h = {};
    pairs.forEach(function (p) { if (p[0] >= 0) h[p[0]] = p[1]; });
    return h;
  }
  function ptrMap(pairs) {
    var p = {};
    pairs.forEach(function (q) {
      var i = q[0], name = q[1];
      if (i < 0) return;
      if (p[i] === undefined) p[i] = name;
      else if (Array.isArray(p[i])) p[i].push(name);
      else p[i] = [p[i], name];
    });
    return p;
  }
  function sortNums(a) { return a.slice().sort(function (x, y) { return x - y; }); }
  function isSorted(a) { for (var i = 1; i < a.length; i++) if (a[i] < a[i - 1]) return false; return true; }
  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // =====================================================================
  // TOPIC 1 — Opposite-direction pointers: 2-Sum on a sorted array
  // =====================================================================
  topics.push({
    title: 'Opposite-Direction Pointers: 2-Sum on a Sorted Array',
    analogy: `<p>Imagine a bookshelf where the books are <b>lined up from cheapest to most expensive</b>. You have a gift card worth exactly <b>₹15</b> and you must buy <b>two</b> books that use it up exactly.</p>
      <p>You stand at the <b>cheap end</b> and your friend stands at the <b>expensive end</b>. You each pick up the book in front of you and add the prices:</p>
      <ul>
        <li><b>Too expensive?</b> Your friend puts the expensive book back and takes one step <b>left</b> (to a cheaper book).</li>
        <li><b>Too cheap?</b> You put your cheap book back and take one step <b>right</b> (to a pricier book).</li>
        <li><b>Exactly ₹15?</b> Done!</li>
      </ul>
      <p>You walk toward each other and meet in the middle. Nobody ever walks backwards, so the whole search takes just one walk along the shelf.</p>`,
    explain: `<p><b>Two pointers</b> just means: keep <b>two index variables</b> (two fingers) on the array and move them in a smart way, instead of trying every pair with two nested loops.</p>
      <p>In the <b>opposite-direction</b> style, one finger <code>L</code> starts at the <b>left end</b> and the other <code>R</code> at the <b>right end</b>. Each step we look at <code>a[L] + a[R]</code> and move <b>one</b> finger inward. They stop when they meet.</p>
      <p>Example: find two numbers adding to ${H.c('p', '15')}.</p>
      ${H.arr([1, 2, 4, 7, 11, 15], { label: 'a', ptr: { 0: 'L', 5: 'R' }, hl: { 0: 'y', 5: 'y' } })}
      ${H.table(['L', 'R', 'a[L] + a[R]', 'compare with 15', 'move'], [
        ['0', '5', '1 + 15 = 16', H.c('r', 'too big'), 'R-- (drop 15)'],
        ['0', '4', '1 + 11 = 12', H.c('b', 'too small'), 'L++ (drop 1)'],
        ['1', '4', '2 + 11 = 13', H.c('b', 'too small'), 'L++ (drop 2)'],
        ['2', '4', '4 + 11 = 15', H.c('g', 'equal!'), H.c('p', 'answer (2, 4)')]
      ])}
      <h4>Why is it safe to throw a number away?</h4>
      <p>Say the sum is <b>too big</b>. <code>a[L]</code> is the <b>smallest</b> number still in play. If even the smallest partner makes <code>a[R]</code> too big, then <b>every</b> other partner (all bigger) makes it even bigger. So <code>a[R]</code> can never be part of the answer → drop it with <code>R--</code>.</p>
      <p>Same logic the other way: if the sum is <b>too small</b>, <code>a[R]</code> is the <b>biggest</b> partner available. If even the biggest partner is not enough for <code>a[L]</code>, nothing will be → drop it with <code>L++</code>.</p>
      <p>Each step removes one number for good, so after at most <code>N - 1</code> steps we are done: ${H.c('g', 'O(N) time, O(1) extra space')}, compared with O(N<sup>2</sup>) for "try every pair".</p>
      <h4>The opposite-direction template</h4>
      <p>Start at both ends → look at both values → decide which side can be thrown away → move that pointer inward → repeat while <code>L &lt; R</code>. The same shape solves palindrome checks, reversing an array in place, 3-Sum, 4-Sum, Container With Most Water, squares of a sorted array, and more.</p>`,
    clues: [
      'The array is <b>sorted</b> (or you are allowed to sort it) → think two pointers before thinking HashMap.',
      '"Find a <b>pair</b> / two numbers whose sum equals target" → classic opposite-direction pointers.',
      '"Use <b>O(1) extra space</b>" or "do it in place" → rules out a HashSet, two pointers fit.',
      '<code>N ≤ 10<sup>5</sup></code> → O(N<sup>2</sup>) pair checking (10<sup>10</sup> steps) is too slow; need O(N) or O(N log N).',
      'Words like "<b>palindrome</b>", "<b>reverse</b>", "from both ends", "closest to target" → pointers walking toward each other.'
    ],
    code: `
      // Generic opposite-direction template (here: pair with sum == target in a sorted array)
      int[] pairWithSum(int[] a, int target) {
          int L = 0, R = a.length - 1;          // one finger at each end
          while (L < R) {                        // stop when the fingers meet
              long sum = (long) a[L] + a[R];     // long: two big ints can overflow
              if (sum == target) {
                  return new int[]{L, R};        // found the pair
              } else if (sum < target) {
                  L++;                           // need a bigger sum -> move the small side up
              } else {
                  R--;                           // need a smaller sum -> move the big side down
              }
          }
          return new int[]{-1, -1};              // no pair exists
      }`,
    codeTitle: 'Opposite-direction two-pointer template',
    viz: {
      title: '2-Sum on a sorted array (L and R walk toward each other)',
      input: '1 2 4 7 11 15 | 15',
      inputLabel: 'sorted array | target',
      gen: function (input) {
        var p = parseArrK(input, 16, 'target', 2);
        var a = p.a, t = p.k, frames = [];
        var note = '';
        if (!isSorted(a)) { a = sortNums(a); note = ' (Your array was not sorted, so I sorted it first: this trick <b>needs</b> sorted order.)'; }
        var L = 0, R = a.length - 1;
        frames.push({
          narr: 'Start: put <b>L</b> on the smallest number (index 0) and <b>R</b> on the biggest (index ' + R + '). We want two numbers that add up to <b>' + t + '</b>.' + note,
          parts: [
            { type: 'array', label: 'a (sorted)', values: a.slice(), ptr: ptrMap([[L, 'L'], [R, 'R']]), hl: hlMap([[L, 'cur'], [R, 'cur']]) },
            { type: 'vars', label: 'state', vals: { L: L, R: R, target: t } }
          ]
        });
        var dropped = {};
        while (L < R) {
          var s = a[L] + a[R];
          var hl = {};
          Object.keys(dropped).forEach(function (k) { hl[k] = 'done'; });
          if (s === t) {
            hl[L] = 'sel'; hl[R] = 'sel';
            frames.push({
              narr: 'a[' + L + '] + a[' + R + '] = ' + a[L] + ' + ' + a[R] + ' = <b>' + s + '</b>, exactly the target! <span class="c-g">Answer: indices (' + L + ', ' + R + ').</span>',
              parts: [
                { type: 'array', label: 'a (sorted)', values: a.slice(), ptr: ptrMap([[L, 'L'], [R, 'R']]), hl: hl },
                { type: 'vars', label: 'state', vals: { L: L, R: R, sum: s, target: t }, hl: { sum: 'ok' } }
              ]
            });
            return frames;
          }
          hl[L] = 'cur'; hl[R] = 'cur';
          var msg;
          if (s < t) {
            msg = 'Sum = ' + a[L] + ' + ' + a[R] + ' = <b>' + s + '</b> is <span class="c-b">too small</span> (need ' + t + '). Even the biggest partner a[R] could not lift a[L] = ' + a[L] + ' high enough, so a[L] is useless → <b>L++</b>.';
          } else {
            msg = 'Sum = ' + a[L] + ' + ' + a[R] + ' = <b>' + s + '</b> is <span class="c-r">too big</span> (need ' + t + '). Even the smallest partner a[L] makes a[R] = ' + a[R] + ' overshoot, so a[R] is useless → <b>R--</b>.';
          }
          frames.push({
            narr: msg,
            parts: [
              { type: 'array', label: 'a (sorted)', values: a.slice(), ptr: ptrMap([[L, 'L'], [R, 'R']]), hl: hl },
              { type: 'vars', label: 'state', vals: { L: L, R: R, sum: s, target: t }, hl: { sum: s < t ? 'win' : 'bad' } }
            ]
          });
          if (s < t) { dropped[L] = 1; L++; } else { dropped[R] = 1; R--; }
        }
        var hl2 = {};
        Object.keys(dropped).forEach(function (k) { hl2[k] = 'done'; });
        frames.push({
          narr: 'L and R met (L = R = ' + L + '). Every number was thrown away safely, so <span class="c-r">no pair adds up to ' + t + '</span>. Answer: (-1, -1).',
          parts: [
            { type: 'array', label: 'a (sorted)', values: a.slice(), ptr: ptrMap([[L, 'L'], [R, 'R']]), hl: hl2 },
            { type: 'vars', label: 'state', vals: { L: L, R: R, target: t } }
          ]
        });
        while (frames.length < 4) frames.push({ narr: 'Summary: each step threw away exactly one number, so at most N - 1 steps → O(N).', parts: [{ type: 'array', label: 'a (sorted)', values: a.slice() }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'No pair exists — the pointers meet and we stop',
        html: `<p>a = [1, 3, 5, 9], target = ${H.c('p', '11')}.</p>
          ${H.table(['L', 'R', 'sum', 'verdict', 'move'], [
            ['0', '3', '1 + 9 = 10', H.c('b', 'too small'), 'L++'],
            ['1', '3', '3 + 9 = 12', H.c('r', 'too big'), 'R--'],
            ['1', '2', '3 + 5 = 8', H.c('b', 'too small'), 'L++ → L = R, stop']
          ])}
          <p>Only 3 checks instead of 6 pairs, and we can be <b>sure</b> nothing was missed: every number we dropped was proven useless at the moment we dropped it. Answer ${H.c('r', '[-1, -1]')}.</p>`
      },
      {
        title: 'Two equal values make the target — the L-before-R rule keeps them as two different cells',
        html: `<p>a = [1, 3, 3, 4], target = ${H.c('p', '6')}.</p>
          ${H.arr([1, 3, 3, 4], { label: 'a', hl: { 1: 'p', 2: 'p' }, ptr: { 1: 'L', 2: 'R' } })}
          <p>1 + 4 = 5 small → L = 1. 3 + 4 = 7 big → R = 2. 3 + 3 = 6 ✔ → answer (1, 2). The loop condition <code>L &lt; R</code> guarantees we never pair a cell with <b>itself</b>: with a = [3] and target 6, the loop never even starts.</p>`
      },
      {
        title: 'Negative numbers work exactly the same',
        html: `<p>a = [-8, -3, 0, 2, 6], target = ${H.c('p', '-1')}.</p>
          ${H.table(['L', 'R', 'sum', 'move'], [
            ['0', '4', '-8 + 6 = -2', H.c('b', 'too small') + ' → L++'],
            ['1', '4', '-3 + 6 = 3', H.c('r', 'too big') + ' → R--'],
            ['1', '3', '-3 + 2 = -1', H.c('g', 'found (1, 3)')]
          ])}
          <p>The proof only needs <b>sorted order</b>, not positive numbers. "Too small" still means "even the biggest partner is not enough".</p>`
      },
      {
        title: 'Same shape, different rule: is this string a palindrome?',
        html: `<p>"racecar": compare the two ends, then walk inward. Any mismatch → not a palindrome. Here nothing is thrown away by a sum rule — <b>both</b> pointers move every step — but the skeleton (start at both ends, move inward, stop when they meet) is identical.</p>`,
        code: `
          boolean isPalindrome(String s) {
              int L = 0, R = s.length() - 1;
              while (L < R) {
                  if (s.charAt(L) != s.charAt(R)) return false;   // ends differ -> not a palindrome
                  L++;                                             // both ends matched,
                  R--;                                             // shrink from both sides
              }
              return true;                                         // met in the middle with no mismatch
          }`
      },
      {
        title: 'Counting variant: how many pairs have sum below target?',
        html: `<p>a = [1, 2, 3, 4, 5], target = 6. When <code>a[L] + a[R] &lt; target</code>, <b>every</b> partner between L+1 and R also works (they are all ≤ a[R]) → add <code>R - L</code> pairs at once, then L++.</p>
          ${H.table(['L', 'R', 'sum', 'action', 'count'], [
            ['0', '4', '1 + 5 = 6', 'not &lt; 6 → R--', '0'],
            ['0', '3', '1 + 4 = 5', H.c('g', '+3 pairs (1,2) (1,3) (1,4)') + ', L++', '3'],
            ['1', '3', '2 + 4 = 6', 'not &lt; 6 → R--', '3'],
            ['1', '2', '2 + 3 = 5', H.c('g', '+1 pair (2,3)') + ', L++ → stop', H.c('p', '4')]
          ])}`,
        code: {
          lang: 'python', run: true, title: 'Runnable: count pairs with sum < target',
          code: `def count_pairs_less(a, target):
    a = sorted(a)
    L, R, count = 0, len(a) - 1, 0
    while L < R:
        if a[L] + a[R] < target:
            count += R - L      # a[L] pairs with every index L+1..R
            L += 1
        else:
            R -= 1              # a[R] too big even with the smallest partner
    return count

print(count_pairs_less([1, 2, 3, 4, 5], 6))   # 4
print(count_pairs_less([5, 1, 3], 100))       # 3 (every pair)`
        }
      }
    ],
    deepDive: `<h4>The proof, stated like an invariant</h4>
      <p>Suppose a valid pair (i*, j*) exists. <b>Invariant:</b> at every step <code>L ≤ i*</code> and <code>R ≥ j*</code> — the answer is always still inside the window [L, R]. It holds at the start (L = 0, R = N-1). Could a step break it? We only do <code>R--</code> when <code>a[L] + a[R] &gt; target</code>. If R were equal to j*, then <code>a[L] + a[j*] &gt; target = a[i*] + a[j*]</code> means <code>a[L] &gt; a[i*]</code>, impossible because L ≤ i* and the array is sorted. Symmetric argument for <code>L++</code>. So we can never step past the answer, and since the gap shrinks every step, we must land on it.</p>
      <h4>Sorted vs unsorted input</h4>
      <ul>
        <li><b>Already sorted</b> (LeetCode 167): two pointers, O(N) time, O(1) space — the best possible.</li>
        <li><b>Unsorted and you need the original indices</b> (LeetCode 1): sorting destroys indices. Either sort <code>(value, index)</code> pairs — O(N log N) time, O(N) space — or use a HashMap "value → index" in one pass: O(N) time, O(N) space. In interviews the HashMap is usually expected here; mention the pointer version as the low-memory alternative.</li>
      </ul>
      <h4>Production details</h4>
      <ul>
        <li><b>Overflow:</b> <code>a[L] + a[R]</code> with values near 2·10<sup>9</sup> overflows a Java <code>int</code> silently and makes the loop move the wrong pointer. Compute in <code>long</code>.</li>
        <li><b>Cache friendliness:</b> both pointers read memory sequentially, which CPUs prefetch well; on large arrays this often beats a HashMap (random memory access, boxing of <code>Integer</code> keys) even though both are O(N).</li>
        <li><b>Data that does not fit in memory:</b> if two sorted files are streamed from disk, the same idea works by reading one file forwards and the other backwards — no index needed.</li>
        <li><b>Counting and "closest" variants</b> keep the same walk; only what you do at each step changes (add <code>R - L</code>, or track <code>|sum - target|</code>).</li>
      </ul>`,
    aiEra: `<p><b>What AI changes:</b> any coding assistant writes 2-Sum in a second, so the interview value moved from <i>typing</i> it to <b>explaining why dropping a number is safe</b> and choosing between the pointer and HashMap versions from the constraints.</p>
      <p><b>Use AI as a partner:</b> ask <code>Give me 6 tricky inputs for two-sum on a sorted array (duplicates, negatives, no answer, overflow) — don't solve it</code>, or <code>Write a brute-force checker and a random test loop comparing it with my two-pointer code</code>. That differential test catches off-by-one mistakes in seconds.</p>
      <p><b>Where AI goes wrong:</b> it often reaches for a HashMap even when the prompt says O(1) space; returns 1-based indices when 0-based are asked (or the reverse); writes <code>while (L &lt;= R)</code> which can pair a cell with itself; forgets <code>long</code> for the sum; and on unsorted input happily runs the pointer loop without sorting.</p>
      <p><b>What you must still own:</b> spotting "sorted + pair" in the wording, the invariant proof above, the overflow guard, and the trade-off sentence: "pointers are O(1) memory but need sorted data; hashing is O(N) memory but works on any order."</p>`,
    problems: [
      {
        title: '2-Sum on a Sorted Array',
        level: 'Easy',
        tags: ['two pointers', 'sorted array'],
        statement: `<p>You are given an integer array <code>a</code> sorted in <b>non-decreasing</b> order and an integer <code>target</code>. Find two <b>different positions</b> <code>i &lt; j</code> such that <code>a[i] + a[j] == target</code> and return <code>[i, j]</code> (0-based). If no such pair exists, return <code>[-1, -1]</code>. Use only <b>O(1) extra space</b>.</p>`,
        constraints: `2 ≤ N ≤ 10<sup>5</sup>, -10<sup>9</sup> ≤ a[i], target ≤ 10<sup>9</sup>, array is sorted`,
        example: `${H.arr([2, 7, 11, 15], { label: 'a', hl: { 0: 'p', 1: 'p' } })}<p>target = ${H.c('p', '9')} → Output: ${H.c('p', '[0, 1]')}</p><p><b>Why:</b> ${H.c('p', 'a[0] + a[1] = 2 + 7 = 9')}. No other pair works (2 + 11 = 13, 2 + 15 = 17, 7 + 11 = 18, ...).</p>`,
        brute: {
          why: `<p>Try every pair <code>(i, j)</code> with two nested loops. That is about N<sup>2</sup>/2 = 5·10<sup>9</sup> checks for N = 10<sup>5</sup> → far too slow. The wasted work: we never use the fact that the array is <b>sorted</b>. Once <code>a[i] + a[j]</code> is already too big, every later <code>j</code> is even bigger, yet the brute force still checks them.</p>`,
          code: `
            int[] brute(int[] a, int target) {
                for (int i = 0; i < a.length; i++) {
                    for (int j = i + 1; j < a.length; j++) {
                        if ((long) a[i] + a[j] == target) return new int[]{i, j};
                    }
                }
                return new int[]{-1, -1};
            }`
        },
        mcq: {
          q: `Sorted array, L points to 3 and R points to 17, target = 14. The sum is 20. What should you do?`,
          options: [`Move L right (L++)`, `Move R left (R--)`, `Move both pointers`, `Restart from the beginning`],
          answer: 1,
          explain: `20 is too big. 17 paired with the smallest available number (3) already overshoots, so 17 can never be in the answer → drop it with R--.`
        },
        hints: [
          `<p><b>Aha:</b> in a sorted array, <code>a[L]</code> is the smallest and <code>a[R]</code> the biggest number still "alive". If <code>a[L] + a[R] &gt; target</code>, then <code>a[R]</code> + (anything) is too big → <code>a[R]</code> is out. If the sum is <code>&lt; target</code>, <code>a[L]</code> + (anything) is too small → <code>a[L]</code> is out.</p>`,
          `<p>No extra data structure is needed — just two integer indices. <code>L</code> starts at 0 and only moves right; <code>R</code> starts at N-1 and only moves left. Every step moves exactly one of them.</p>`,
          `<p><b>Traps:</b> use <code>long</code> for the sum (10<sup>9</sup> + 10<sup>9</sup> overflows <code>int</code>); loop while <code>L &lt; R</code> (not <code>≤</code>, a number cannot pair with itself); remember to return <code>[-1, -1]</code> when the loop ends. <b>Recipe:</b> L = 0, R = n-1 → while L &lt; R: sum = a[L] + a[R]; equal → return; smaller → L++; bigger → R--. → return [-1, -1].</p>`
        ],
        solution: {
          approach: `<p>Opposite-direction two pointers. Each comparison safely throws away one number, so the pointers meet after at most N - 1 steps.</p>`,
          code: `
            class Solution {
                public int[] twoSumSorted(int[] a, int target) {
                    int L = 0;                    // smallest number still in play
                    int R = a.length - 1;         // biggest number still in play
                    while (L < R) {               // need two DIFFERENT positions
                        long sum = (long) a[L] + a[R];   // long avoids int overflow
                        if (sum == target) {
                            return new int[]{L, R};      // found it
                        } else if (sum < target) {
                            L++;                  // too small: a[L] can't reach target with anyone
                        } else {
                            R--;                  // too big: a[R] overshoots even with the smallest
                        }
                    }
                    return new int[]{-1, -1};     // pointers met, no pair exists
                }

                public static void main(String[] args) {
                    int[] ans = new Solution().twoSumSorted(new int[]{2, 7, 11, 15}, 9);
                    System.out.println(ans[0] + " " + ans[1]);   // prints 0 1
                }
            }`,
          dry: {
            head: ['step', 'L', 'R', 'a[L] + a[R]', 'vs target 9', 'action'],
            rows: [
              ['1', '0', '3', '2 + 15 = 17', H.c('r', 'too big'), 'R-- → R = 2'],
              ['2', '0', '2', '2 + 11 = 13', H.c('r', 'too big'), 'R-- → R = 1'],
              ['3', '0', '1', '2 + 7 = 9', H.c('g', 'equal'), H.c('p', 'return [0, 1]')]
            ]
          },
          complexity: `<p><b>Time O(N):</b> every loop step moves L right or R left by one, and they start N - 1 apart, so there are at most N - 1 steps. <b>Space O(1):</b> only two index variables and a sum.</p>`
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 2 — 3-Sum: fix one, two-pointer the rest
  // =====================================================================
  topics.push({
    title: '3-Sum: Fix One Number, Then Two Pointers',
    analogy: `<p>You must buy <b>three</b> gifts that cost exactly ₹1000 in total. Trying every possible trio in the shop is exhausting.</p>
      <p>Smarter: <b>pick the first gift yourself</b> — say it costs ₹300. Now the problem is just "find <b>two</b> gifts that cost ₹700" — and that is the bookshelf game from 2-Sum (one friend at the cheap end, one at the expensive end, walk toward each other). Then pick a different first gift and play the bookshelf game again.</p>
      <p>So 3-Sum = <b>"fix one" + 2-Sum</b>. And if two first gifts have the same price, you skip the second one — you would only find the same trios again.</p>`,
    explain: `<p><b>Goal:</b> find all <b>unique triplets</b> <code>a[i] + a[L] + a[R] = 0</code>.</p>
      <p><b>Step 1 — sort.</b> Sorting costs O(N log N), which is tiny next to the O(N<sup>2</sup>) we will spend anyway, and it gives us (a) the 2-Sum pointer trick and (b) duplicates sitting next to each other, so they are easy to skip.</p>
      <p><b>Step 2 — fix <code>i</code></b> from left to right. The two other numbers must add up to <code>-a[i]</code>.</p>
      <p><b>Step 3 — 2-Sum</b> on the part to the right of i: <code>L = i + 1</code>, <code>R = N - 1</code>, move them toward each other.</p>
      ${H.arr([-4, -1, -1, 0, 1, 2], { label: 'sorted', ptr: { 1: 'i', 2: 'L', 5: 'R' }, hl: { 1: 'y', 2: 'b', 3: 'b', 4: 'b', 5: 'b' } })}
      ${H.table(['fixed a[i]', 'need L + R =', 'pairs found by 2-Sum', 'triplets'], [
        ['-4 (i = 0)', '4', 'none (max is 1 + 2 = 3)', '—'],
        ['-1 (i = 1)', '1', '(-1, 2) and (0, 1)', H.c('p', '[-1, -1, 2], [-1, 0, 1]')],
        ['-1 (i = 2)', '1', H.c('r', 'skipped: same value as i = 1'), '—'],
        ['0 (i = 3)', '0', 'none (1 + 2 = 3)', '—']
      ])}
      <h4>Three ways duplicates are avoided</h4>
      <ul>
        <li><b>Skip a repeated fixed value:</b> if <code>a[i] == a[i-1]</code>, every triplet starting with it was already found → <code>continue</code>.</li>
        <li><b>After a hit, skip repeats on both sides:</b> move L past all copies of <code>a[L]</code> and R past all copies of <code>a[R]</code>, then step both inward.</li>
        <li><b>Early stop:</b> if <code>a[i] &gt; 0</code>, all three numbers are positive → the sum can never be 0 → <code>break</code>.</li>
      </ul>
      <p><b>Cost:</b> N choices of i × one O(N) pointer walk each = ${H.c('g', 'O(N<sup>2</sup>)')}. The brute force tries every trio: O(N<sup>3</sup>). For N = 3000 that is 9·10<sup>6</sup> vs 2.7·10<sup>10</sup> steps.</p>
      <p>The same idea scales: <b>k-Sum</b> = fix (k - 2) numbers with loops, then finish with one two-pointer walk → O(N<sup>k-1</sup>).</p>`,
    clues: [
      '"Find all <b>triplets</b> / three numbers that sum to 0 (or to target)" → sort + fix one + two pointers.',
      '"Return <b>unique</b> triplets / no duplicate triplets" → sorting puts copies side by side so you can skip them.',
      '<code>N ≤ 3000</code> → O(N<sup>2</sup>) ≈ 9·10<sup>6</sup> is fine, O(N<sup>3</sup>) ≈ 2.7·10<sup>10</sup> is not.',
      '"3-Sum closest", "3-Sum smaller", "count triangles", "4-Sum" → same skeleton: outer loop(s) + inner opposite pointers.',
      'Order of output does not matter and indices are not asked → you are free to <b>sort</b> the array.'
    ],
    viz: {
      title: '3-Sum: fix i, then L and R hunt for the other two',
      input: '-1 0 1 2 -1 -4',
      inputLabel: 'array (any order, at most 10 numbers)',
      gen: function (input) {
        var a = sortNums(parseArr(input, 10, 3));
        var n = a.length, frames = [], found = [];
        frames.push({
          narr: 'First <b>sort</b> the array: ' + a.join(', ') + '. Sorting lets us use the 2-Sum pointer walk and puts equal numbers next to each other so duplicates are easy to skip.',
          parts: [
            { type: 'array', label: 'sorted a', values: a.slice() },
            { type: 'set', label: 'triplets found', items: [] }
          ]
        });
        for (var i = 0; i < n - 2; i++) {
          if (a[i] > 0) {
            frames.push({
              narr: 'a[' + i + '] = ' + a[i] + ' is <b>positive</b>. Everything to its right is at least as big, so three positives can never sum to 0 → <b>stop early</b>.',
              parts: [
                { type: 'array', label: 'sorted a', values: a.slice(), ptr: ptrMap([[i, 'i']]), hl: hlMap([[i, 'bad']]) },
                { type: 'set', label: 'triplets found', items: found.slice() }
              ]
            });
            break;
          }
          if (i > 0 && a[i] === a[i - 1]) {
            frames.push({
              narr: 'a[' + i + '] = ' + a[i] + ' is the <span class="c-r">same as the previous fixed number</span>. All triplets starting with ' + a[i] + ' were already found → <b>skip</b> this i.',
              parts: [
                { type: 'array', label: 'sorted a', values: a.slice(), ptr: ptrMap([[i, 'i']]), hl: hlMap([[i - 1, 'done'], [i, 'bad']]) },
                { type: 'set', label: 'triplets found', items: found.slice() }
              ]
            });
            continue;
          }
          var L = i + 1, R = n - 1;
          frames.push({
            narr: '<b>Fix i = ' + i + '</b> (value ' + a[i] + '). Now we need two numbers to its right that add up to <b>' + (-a[i]) + '</b>. Put L just after i and R at the end.',
            parts: [
              { type: 'array', label: 'sorted a', values: a.slice(), ptr: ptrMap([[i, 'i'], [L, 'L'], [R, 'R']]), hl: hlMap([[i, 'sel']]), range: [L, R] },
              { type: 'vars', label: 'state', vals: { 'a[i]': a[i], need: -a[i] } },
              { type: 'set', label: 'triplets found', items: found.slice() }
            ]
          });
          while (L < R) {
            var s = a[i] + a[L] + a[R];
            var hl = hlMap([[i, 'sel'], [L, 'cur'], [R, 'cur']]);
            var narr;
            if (s === 0) {
              var trip = '[' + a[i] + ',' + a[L] + ',' + a[R] + ']';
              found.push(trip);
              hl[L] = 'ok'; hl[R] = 'ok';
              var sh = {}; sh[trip] = 'ok';
              var oldL = L, oldR = R;
              while (L < R && a[L] === a[L + 1]) L++;
              while (L < R && a[R] === a[R - 1]) R--;
              var skipped = (L - oldL) + (oldR - R);
              L++; R--;
              narr = a[i] + ' + ' + a[oldL] + ' + ' + a[oldR] + ' = <b>0</b> → <span class="c-g">triplet ' + trip + ' found!</span> ' + (skipped ? 'Skip ' + skipped + ' duplicate value(s) so we do not record it twice, then ' : 'Then ') + 'move <b>both</b> L and R inward (keeping just one would give a different sum).';
              frames.push({
                narr: narr,
                parts: [
                  { type: 'array', label: 'sorted a', values: a.slice(), ptr: ptrMap([[i, 'i'], [oldL, 'L'], [oldR, 'R']]), hl: hl, range: [oldL, oldR] },
                  { type: 'vars', label: 'state', vals: { 'a[i]': a[i], 'a[L]': a[oldL], 'a[R]': a[oldR], sum: s }, hl: { sum: 'ok' } },
                  { type: 'set', label: 'triplets found', items: found.slice(), hl: sh }
                ]
              });
            } else {
              narr = a[i] + ' + ' + a[L] + ' + ' + a[R] + ' = <b>' + s + '</b> ' + (s < 0 ? 'is <span class="c-b">below 0</span> → need bigger numbers → <b>L++</b>.' : 'is <span class="c-r">above 0</span> → need smaller numbers → <b>R--</b>.');
              frames.push({
                narr: narr,
                parts: [
                  { type: 'array', label: 'sorted a', values: a.slice(), ptr: ptrMap([[i, 'i'], [L, 'L'], [R, 'R']]), hl: hl, range: [L, R] },
                  { type: 'vars', label: 'state', vals: { 'a[i]': a[i], 'a[L]': a[L], 'a[R]': a[R], sum: s }, hl: { sum: s < 0 ? 'win' : 'bad' } },
                  { type: 'set', label: 'triplets found', items: found.slice() }
                ]
              });
              if (s < 0) L++; else R--;
            }
          }
        }
        frames.push({
          narr: 'Done. ' + (found.length ? 'Unique triplets that sum to 0: <b>' + found.join(' ') + '</b>.' : '<span class="c-r">No triplet sums to 0.</span>') + ' Each fixed i did one O(N) pointer walk → O(N<sup>2</sup>) overall.',
          parts: [
            { type: 'array', label: 'sorted a', values: a.slice() },
            { type: 'set', label: 'triplets found', items: found.slice() }
          ]
        });
        while (frames.length < 4) frames.push({ narr: 'Too few numbers to form many triplets; try a longer array.', parts: [{ type: 'array', label: 'sorted a', values: a.slice() }] });
        return frames;
      }
    },
    code: [`
      // Generic k-Sum: fix numbers one by one, finish with a 2-Sum pointer walk.
      // nums must be sorted. Returns all unique k-tuples (by value) summing to target.
      List<List<Integer>> kSum(int[] nums, long target, int start, int k) {
          List<List<Integer>> res = new ArrayList<>();
          int n = nums.length;
          if (start >= n || (long) nums[start] * k > target || (long) nums[n - 1] * k < target) {
              return res;                                  // pruning: even smallest/largest choices miss
          }
          if (k == 2) {                                    // base case: opposite pointers
              int L = start, R = n - 1;
              while (L < R) {
                  long sum = (long) nums[L] + nums[R];
                  if (sum < target || (L > start && nums[L] == nums[L - 1])) {
                      L++;                                 // too small, or a duplicate left value
                  } else if (sum > target || (R < n - 1 && nums[R] == nums[R + 1])) {
                      R--;                                 // too big, or a duplicate right value
                  } else {
                      res.add(new ArrayList<>(Arrays.asList(nums[L], nums[R])));
                      L++;
                      R--;
                  }
              }
              return res;
          }
          for (int i = start; i < n; i++) {
              if (i > start && nums[i] == nums[i - 1]) continue;   // same fixed value -> same tuples
              for (List<Integer> rest : kSum(nums, target - nums[i], i + 1, k - 1)) {
                  rest.add(0, nums[i]);                    // prepend the fixed number
                  res.add(rest);
              }
          }
          return res;
      }`, {
        lang: 'python', run: true, title: 'Runnable: 3-Sum in Python',
        code: `def three_sum(nums):
    nums = sorted(nums)
    res, n = [], len(nums)
    for i in range(n - 2):
        if nums[i] > 0:
            break                                  # three positives never make 0
        if i > 0 and nums[i] == nums[i - 1]:
            continue                               # skip a repeated fixed value
        L, R = i + 1, n - 1
        while L < R:
            s = nums[i] + nums[L] + nums[R]
            if s == 0:
                res.append([nums[i], nums[L], nums[R]])
                while L < R and nums[L] == nums[L + 1]:
                    L += 1
                while L < R and nums[R] == nums[R - 1]:
                    R -= 1
                L, R = L + 1, R - 1
            elif s < 0:
                L += 1
            else:
                R -= 1
    return res

print(three_sum([-1, 0, 1, 2, -1, -4]))   # [[-1, -1, 2], [-1, 0, 1]]
print(three_sum([0, 0, 0, 0]))            # [[0, 0, 0]]`
      }],
    codeTitle: ['k-Sum template (fix one, recurse, finish with 2 pointers)', '3-Sum (runnable Python)'],
    examples: [
      {
        title: 'Lots of duplicates: [0, 0, 0, 0]',
        html: `<p>Sorted it is still [0, 0, 0, 0]. i = 0: L = 1, R = 3 → 0 + 0 + 0 = 0 ✔ record [0, 0, 0]. Now skip copies: L walks over the equal zeros until it reaches R, then L++ and R-- cross and the loop ends. i = 1: ${H.c('r', 'same as a[0] → skip')}. Output: exactly ${H.c('g', 'one')} triplet [0, 0, 0] — without the skipping rules you would print it 4 times.</p>`
      },
      {
        title: '3-Sum Closest: same walk, track the nearest sum',
        html: `<p>nums = [-1, 2, 1, -4], target = 1 → sorted [-4, -1, 1, 2].</p>
          ${H.table(['i', 'L', 'R', 'sum', '|sum - 1|', 'best', 'move'], [
            ['0 (-4)', '1', '3', '-4 - 1 + 2 = -3', '4', '-3', 'sum &lt; 1 → L++'],
            ['0 (-4)', '2', '3', '-4 + 1 + 2 = -1', '2', '-1', 'L++ → stop'],
            ['1 (-1)', '2', '3', '-1 + 1 + 2 = 2', '1', H.c('p', '2'), 'sum &gt; 1 → R-- → stop']
          ])}
          <p>Answer ${H.c('p', '2')}. No dedupe needed (we return one number), and we can return immediately if a sum equals the target exactly.</p>`
      },
      {
        title: '3-Sum Smaller: count, do not list',
        html: `<p>nums = [-2, 0, 1, 3], target = 2. Fix i; when <code>a[i] + a[L] + a[R] &lt; target</code>, every R' between L+1 and R also works → add <code>R - L</code> at once.</p>
          <p>i = 0 (-2): L = 1, R = 3 → -2 + 0 + 3 = 1 &lt; 2 → ${H.c('g', '+2')} (triplets (-2,0,1) and (-2,0,3)), L = 2 → -2 + 1 + 3 = 2, not smaller → R-- → stop. i = 1 (0): 0 + 1 + 3 = 4 → R-- → stop. Answer ${H.c('p', '2')}. Here we count by <b>index</b>, so no duplicate skipping.</p>`
      },
      {
        title: 'Valid triangle count: fix the LARGEST side instead',
        html: `<p>Three sticks form a triangle when the two shorter ones add to more than the longest. Sort, fix the longest side <code>k</code> from the right, then pointers L = 0, R = k - 1: if <code>a[L] + a[R] &gt; a[k]</code>, every L' from L to R-1 also works → <code>count += R - L</code>, R--; otherwise L++.</p>
          <p>[2, 2, 3, 4]: k = 3 (4): 2 + 3 = 5 &gt; 4 → +2, R = 1: 2 + 2 = 4 not &gt; 4 → L++ stop. k = 2 (3): 2 + 2 = 4 &gt; 3 → +1. Total ${H.c('p', '3')}.</p>`,
        code: `
          int triangleNumber(int[] a) {
              Arrays.sort(a);
              int count = 0;
              for (int k = a.length - 1; k >= 2; k--) {        // a[k] = longest side
                  int L = 0, R = k - 1;
                  while (L < R) {
                      if (a[L] + a[R] > a[k]) {
                          count += R - L;      // a[L..R-1] each pair with a[R]
                          R--;
                      } else {
                          L++;                 // a[L] too short even with the biggest partner
                      }
                  }
              }
              return count;
          }`
      }
    ],
    deepDive: `<h4>Why the duplicate rules are correct (and complete)</h4>
      <p>A triplet is defined by its <b>values</b>, and after sorting we always produce it in non-decreasing order (a[i] ≤ a[L] ≤ a[R]). So two equal triplets can only be produced if we use the same value twice in the same role. Skipping a repeated <code>a[i]</code> blocks the first role; skipping repeated <code>a[L]</code>/<code>a[R]</code> after a hit blocks the other two. We never lose a triplet, because the <b>first</b> copy of every value is always tried — and it sees a superset of partners (everything to its right).</p>
      <h4>Can we beat O(N<sup>2</sup>)?</h4>
      <p>Not in any practical way. The "3SUM conjecture" in fine-grained complexity says no algorithm runs in O(N<sup>2 - ε</sup>); only tiny log-factor speed-ups are known, and many geometry problems are proven "3SUM-hard". If an interviewer asks for O(N log N), they are probing whether you know this. A hash-based version (fix i, 2-Sum with a HashSet) is also O(N<sup>2</sup>) but uses O(N) memory and makes dedupe uglier.</p>
      <h4>4-Sum and k-Sum in practice</h4>
      <ul>
        <li>k-Sum costs O(N<sup>k-1</sup>): k - 2 nested loops plus one linear walk.</li>
        <li><b>Pruning</b> (in the template above): if <code>nums[start] × k &gt; target</code> even the smallest choices overshoot → stop; if <code>nums[n-1] × k &lt; target</code> even the biggest fall short → skip. Huge real-world speed-ups.</li>
        <li><b>Overflow:</b> 4-Sum with values up to 10<sup>9</sup> sums to 4·10<sup>9</sup> — beyond <code>int</code>. Use <code>long</code> for target and sums (a classic hidden test case).</li>
        <li>4-Sum alternative: meet-in-the-middle with a HashMap of pair sums — O(N<sup>2</sup>) time but O(N<sup>2</sup>) memory and painful dedupe; fine for <b>counting</b> (4-Sum II with four arrays).</li>
      </ul>`,
    aiEra: `<p><b>What AI changes:</b> 3-Sum is one of the most memorised problems on the internet, so assistants produce it perfectly — which means interviewers now ask the <b>variant</b> (closest, smaller, count triangles, 4-Sum with overflow) and expect you to adapt the skeleton live.</p>
      <p><b>Use AI as a partner:</b> <code>List the 5 classic bugs in a 3-Sum implementation and give one input that triggers each</code> — then run them against your code. Or ask it to generate a brute-force O(N<sup>3</sup>) checker with a set of sorted tuples and fuzz both on random small arrays with many duplicates (values in -3..3).</p>
      <p><b>Where AI goes wrong:</b> it mixes up "skip duplicates" placement (skipping <i>before</i> recording loses [0,0,0]); uses <code>int</code> in 4-Sum; applies the <code>nums[i] &gt; 0 → break</code> shortcut to a version with a non-zero target where it is wrong; or dedupes with a <code>HashSet&lt;List&gt;</code> and calls it O(N<sup>2</sup>) while ignoring the hashing cost.</p>
      <p><b>What you must still own:</b> the reduction "fix one → 2-Sum", the dedupe proof, knowing O(N<sup>2</sup>) is essentially optimal, and spotting when an early-break shortcut is valid.</p>`,
    problems: [
      {
        title: '3-Sum (All Unique Triplets with Sum 0)',
        level: 'Medium',
        tags: ['sorting', 'two pointers'],
        statement: `<p>Given an integer array <code>nums</code>, return <b>all unique triplets</b> <code>[nums[i], nums[j], nums[k]]</code> with <code>i</code>, <code>j</code>, <code>k</code> all different and <code>nums[i] + nums[j] + nums[k] == 0</code>. The answer must not contain the same triplet twice (by values). Order of triplets does not matter.</p>`,
        constraints: `3 ≤ N ≤ 3000, -10<sup>5</sup> ≤ nums[i] ≤ 10<sup>5</sup>`,
        example: `${H.arr([-1, 0, 1, 2, -1, -4], { label: 'nums' })}${H.arr([-4, -1, -1, 0, 1, 2], { label: 'sorted', hl: { 1: 'p', 2: 'p', 3: 'g', 4: 'g', 5: 'p' } })}<p>Output: ${H.c('p', '[[-1, -1, 2], [-1, 0, 1]]')}</p><p><b>Why:</b> ${H.c('p', '-1 + -1 + 2 = 0')} and ${H.c('g', '-1 + 0 + 1 = 0')}. The second -1 would find <code>[-1, 0, 1]</code> again, so it is skipped — we return each triplet only once.</p>`,
        brute: {
          why: `<p>Three nested loops try every trio: N<sup>3</sup>/6 ≈ 4.5·10<sup>9</sup> for N = 3000 → TLE. On top of that, removing duplicate triplets needs a HashSet of sorted lists. The wasted work: for a fixed pair (i, j) we scan every k, although in a sorted array the right partner can be found by walking pointers.</p>`,
          code: `
            List<List<Integer>> brute(int[] nums) {
                Set<List<Integer>> seen = new HashSet<>();
                int n = nums.length;
                for (int i = 0; i < n; i++)
                    for (int j = i + 1; j < n; j++)
                        for (int k = j + 1; k < n; k++)
                            if (nums[i] + nums[j] + nums[k] == 0) {
                                List<Integer> t = Arrays.asList(nums[i], nums[j], nums[k]);
                                Collections.sort(t);          // same trio in any order looks the same
                                seen.add(t);
                            }
                return new ArrayList<>(seen);
            }`
        },
        mcq: {
          q: `After sorting, you fix <code>a[i] = -3</code>. What must the other two numbers (to the right of i) add up to?`,
          options: [`They must add up to -3`, `They must add up to 0`, `They must add up to 3`, `It depends on L and R`],
          answer: 2,
          explain: `-3 + x + y = 0 means x + y = 3. So it becomes a plain 2-Sum with target = -a[i] = 3 on the part to the right of i.`
        },
        hints: [
          `<p><b>Aha:</b> <code>a[i] + a[L] + a[R] = 0</code> ⇔ <code>a[L] + a[R] = -a[i]</code>. Fix one number and the rest is <b>2-Sum on a sorted array</b>.</p>`,
          `<p>Sort the array. Outer loop over <code>i</code>; inner opposite pointers <code>L = i + 1</code>, <code>R = n - 1</code>. Sum too small → L++, too big → R--, zero → record and move both.</p>`,
          `<p><b>Traps:</b> (1) skip <code>i</code> when <code>a[i] == a[i-1]</code>; (2) after a hit, skip equal values at L and R before moving; (3) <code>i</code> only goes to <code>n - 3</code>; (4) break when <code>a[i] &gt; 0</code>. <b>Recipe:</b> sort → for i: skip dup / break if positive → L, R walk → on zero: add, skip dups, L++, R--.</p>`
        ],
        solution: {
          approach: `<p>Sort, then for each distinct <code>a[i]</code> run a 2-Sum two-pointer walk for target <code>-a[i]</code>, skipping duplicate values at every level.</p>`,
          code: `
            import java.util.*;

            class Solution {
                public List<List<Integer>> threeSum(int[] nums) {
                    List<List<Integer>> res = new ArrayList<>();
                    Arrays.sort(nums);                          // sorted -> pointers work, dups are neighbours
                    int n = nums.length;
                    for (int i = 0; i < n - 2; i++) {
                        if (nums[i] > 0) break;                 // three positives can't make 0
                        if (i > 0 && nums[i] == nums[i - 1]) continue;   // same fixed value -> same triplets
                        int L = i + 1, R = n - 1;               // 2-Sum on the part right of i
                        while (L < R) {
                            int sum = nums[i] + nums[L] + nums[R];   // max 3*10^5, fits in int
                            if (sum == 0) {
                                res.add(Arrays.asList(nums[i], nums[L], nums[R]));
                                while (L < R && nums[L] == nums[L + 1]) L++;   // skip copies of a[L]
                                while (L < R && nums[R] == nums[R - 1]) R--;   // skip copies of a[R]
                                L++;                            // both must move: with a[i] fixed, a new L
                                R--;                            // value needs a new R value to make 0 again
                            } else if (sum < 0) {
                                L++;                            // need a bigger total
                            } else {
                                R--;                            // need a smaller total
                            }
                        }
                    }
                    return res;
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().threeSum(new int[]{-1, 0, 1, 2, -1, -4}));
                    // [[-1, -1, 2], [-1, 0, 1]]
                }
            }`,
          dry: {
            head: ['i (a[i])', 'L', 'R', 'a[i] + a[L] + a[R]', 'action'],
            rows: [
              ['0 (-4)', '1', '5', '-4 + -1 + 2 = -3', 'too small → L = 2'],
              ['0 (-4)', '2', '5', '-4 + -1 + 2 = -3', 'too small → L = 3'],
              ['0 (-4)', '3', '5', '-4 + 0 + 2 = -2', 'too small → L = 4'],
              ['0 (-4)', '4', '5', '-4 + 1 + 2 = -1', 'too small → L = 5, loop ends'],
              ['1 (-1)', '2', '5', '-1 + -1 + 2 = 0', H.c('g', 'add [-1,-1,2]') + ', no dups, L = 3, R = 4'],
              ['1 (-1)', '3', '4', '-1 + 0 + 1 = 0', H.c('g', 'add [-1,0,1]') + ', L = 4, R = 3, loop ends'],
              ['2 (-1)', '—', '—', '—', H.c('r', 'same as a[1] → skip')],
              ['3 (0)', '4', '5', '0 + 1 + 2 = 3', 'too big → R = 4, loop ends']
            ]
          },
          complexity: `<p><b>Time O(N<sup>2</sup>):</b> sorting is O(N log N); then for each of the N fixed values the L/R walk takes at most N steps. <b>Space O(1)</b> extra besides the output (Java's sort for <code>int[]</code> uses O(log N) stack).</p>`
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 3 — Container With Most Water
  // =====================================================================
  topics.push({
    title: 'Container With Most Water (Move the Shorter Wall)',
    analogy: `<p>Picture a row of wooden fence posts of different heights. You choose <b>two posts</b>, stretch a plastic sheet between them and pour in water. How much water stays?</p>
      <ul>
        <li>The water can only rise to the <b>shorter post</b> — any higher and it spills over that side (like a barrel that leaks at its shortest plank).</li>
        <li>The farther apart the posts, the <b>wider</b> the pool.</li>
      </ul>
      <p>So <b>water = shorter height × distance</b>. Start with the two <b>outermost</b> posts (widest pool). To find something better you must give up some width — and the only move that has any hope is to <b>replace the shorter post</b>, hoping to find a taller one. Replacing the taller post can never help, because the short post still caps the level while the width shrinks.</p>`,
    explain: `<p>Heights <code>h[0..N-1]</code>. Pick two lines <code>L &lt; R</code>; the area is</p>
      <p>Formula: <b>area = min(h[L], h[R]) × (R - L)</b></p>
      ${H.arr([1, 8, 6, 2, 5, 4, 8, 3, 7], { label: 'h', ptr: { 1: 'L', 8: 'R' }, hl: { 1: 'p', 8: 'p' } })}
      <p>Best answer here: ${H.c('p', 'L = 1 (height 8), R = 8 (height 7)')} → min(8, 7) × (8 - 1) = 7 × 7 = <b>49</b>.</p>
      <h4>Why moving the shorter wall is safe</h4>
      <p>Suppose <code>h[L] &lt; h[R]</code>. Think of <b>every</b> container that still uses the left wall L with some right wall <code>R' &lt; R</code>:</p>
      <ul>
        <li>its width <code>R' - L</code> is <b>smaller</b> than now,</li>
        <li>its height is <code>min(h[L], h[R'])</code> which is <b>at most h[L]</b> (L is still the cap).</li>
      </ul>
      <p>So all of them hold <b>less or equal</b> water than the current container, which we already measured. Wall L has nothing better to offer → throw it away with <code>L++</code>. (If the heights are equal, moving either one is fine.)</p>
      ${H.table(['L', 'R', 'heights', 'width', 'area', 'move'], [
        ['0', '8', '1, 7', '8', '1 × 8 = 8', 'h[L] shorter → L++'],
        ['1', '8', '8, 7', '7', H.c('p', '7 × 7 = 49'), 'h[R] shorter → R--'],
        ['1', '7', '8, 3', '6', '3 × 6 = 18', 'R--'],
        ['1', '6', '8, 8', '5', '8 × 5 = 40', 'equal → R--'],
        ['...', '', '', '', 'all smaller', 'until L meets R']
      ])}
      <p>One walk of the two pointers → ${H.c('g', 'O(N)')} instead of checking all N<sup>2</sup>/2 pairs.</p>`,
    clues: [
      '"Choose <b>two lines / two walls / two indices</b> to maximize <code>min(h[i], h[j]) × (j - i)</code>" → opposite pointers, move the shorter side.',
      '"Container", "most water", "maximum area between two bars" → this exact pattern.',
      'Area grows with <b>width</b> (distance between indices) → start with the widest pair (both ends) and shrink.',
      '<code>N ≤ 10<sup>5</sup></code> → all pairs (5·10<sup>9</sup>) is too slow; need a one-pass O(N) idea.',
      'Do not confuse with <b>Trapping Rain Water</b> (water on top of every bar) — that one sums water over all bars, this one picks just two walls.'
    ],
    viz: {
      title: 'Container With Most Water: L and R bars, move the shorter one',
      input: '1 8 6 2 5 4 8 3 7',
      inputLabel: 'heights (non-negative, at most 14)',
      gen: function (input) {
        var h = parseArr(input, 14, 2);
        if (h.some(function (x) { return x < 0; })) throw new Error('Heights must be 0 or more (a wall cannot have negative height).');
        var L = 0, R = h.length - 1, best = 0, bestL = -1, bestR = -1, frames = [];
        frames.push({
          narr: 'Each bar is a wall. Start with the two <b>outermost</b> walls: that is the <b>widest</b> container possible. Water level = the shorter wall; area = shorter height × width.',
          parts: [
            { type: 'bars', label: 'wall heights', values: h.slice(), ptr: ptrMap([[L, 'L'], [R, 'R']]), hl: hlMap([[L, 'cur'], [R, 'cur']]) },
            { type: 'vars', label: 'state', vals: { L: L, R: R, best: best } }
          ]
        });
        var gone = {};
        while (L < R) {
          var hh = Math.min(h[L], h[R]), w = R - L, area = hh * w;
          var improved = area > best;
          if (improved) { best = area; bestL = L; bestR = R; }
          var hl = {};
          Object.keys(gone).forEach(function (k) { hl[k] = 'done'; });
          for (var k = L + 1; k < R; k++) hl[k] = 'win';
          hl[L] = 'cur'; hl[R] = 'cur';
          var moveLeft = h[L] < h[R];
          var narr = 'Walls at ' + L + ' (height ' + h[L] + ') and ' + R + ' (height ' + h[R] + '). Water level = min = <b>' + hh + '</b>, width = ' + w + ', area = <b>' + area + '</b>' +
            (improved ? ' → <span class="c-g">new best!</span>' : ' (best stays ' + best + ')') + '. ';
          if (h[L] === h[R]) narr += 'Heights are equal, so either wall can go; we move <b>R--</b>.';
          else if (moveLeft) narr += 'Left wall is shorter: it caps the water, and any narrower container using it holds less. Throw it away → <b>L++</b>.';
          else narr += 'Right wall is shorter: it caps the water, and any narrower container using it holds less. Throw it away → <b>R--</b>.';
          frames.push({
            narr: narr,
            parts: [
              { type: 'bars', label: 'wall heights (blue = water width)', values: h.slice(), ptr: ptrMap([[L, 'L'], [R, 'R']]), hl: hl },
              { type: 'vars', label: 'state', vals: { L: L, R: R, height: hh, width: w, area: area, best: best }, hl: improved ? { best: 'ok', area: 'ok' } : { area: 'cur' } }
            ]
          });
          if (moveLeft) { gone[L] = 1; L++; } else { gone[R] = 1; R--; }
        }
        var fh = {};
        if (bestL >= 0) { fh[bestL] = 'sel'; fh[bestR] = 'sel'; }
        frames.push({
          narr: 'L and R met, so every wall has been ruled out. The best container uses walls <b>' + bestL + '</b> and <b>' + bestR + '</b> and holds <span class="c-p"><b>' + best + '</b></span> units of water. Only ' + (h.length - 1) + ' areas were computed instead of ' + (h.length * (h.length - 1) / 2) + '.',
          parts: [
            { type: 'bars', label: 'wall heights', values: h.slice(), hl: fh },
            { type: 'vars', label: 'answer', vals: { best: best, walls: bestL + ' & ' + bestR }, hl: { best: 'sel' } }
          ]
        });
        while (frames.length < 4) frames.push({ narr: 'With only two walls there is just one container to measure.', parts: [{ type: 'bars', label: 'wall heights', values: h.slice() }] });
        return frames;
      }
    },
    code: [`
      // Container With Most Water - with the "skip shorter-or-equal walls" speed-up.
      long maxArea(int[] h) {
          int L = 0, R = h.length - 1;
          long best = 0;
          while (L < R) {
              int level = Math.min(h[L], h[R]);            // water stops at the shorter wall
              best = Math.max(best, (long) level * (R - L));
              // Every wall not taller than 'level' cannot beat this container with a narrower width,
              // so jump over all of them at once (same answer, fewer area computations).
              while (L < R && h[L] <= level) L++;
              while (L < R && h[R] <= level) R--;
          }
          return best;
      }`, {
        lang: 'python', run: true, title: 'Runnable: compare with brute force on random inputs',
        code: `import random

def max_area(h):
    L, R, best = 0, len(h) - 1, 0
    while L < R:
        best = max(best, min(h[L], h[R]) * (R - L))
        if h[L] < h[R]:
            L += 1          # short left wall is finished
        else:
            R -= 1          # short (or equal) right wall is finished
    return best

def brute(h):
    return max(min(h[i], h[j]) * (j - i) for i in range(len(h)) for j in range(i + 1, len(h)))

random.seed(7)
for _ in range(500):
    h = [random.randint(0, 9) for _ in range(random.randint(2, 9))]
    assert max_area(h) == brute(h), h
print("500 random tests passed; example:", max_area([1, 8, 6, 2, 5, 4, 8, 3, 7]))`
      }],
    codeTitle: ['Two pointers with skip-ahead (Java)', 'Self-checking version (Python)'],
    examples: [
      {
        title: 'The two tallest walls are already at the ends',
        html: `<p>h = [5, 1, 1, 5]. First measurement: min(5, 5) × 3 = ${H.c('p', '15')}. Every later container is narrower and its level can never exceed 5, so 15 stays the answer. The algorithm still walks inward (it cannot "know" that), but no later area beats it.</p>`
      },
      {
        title: 'Rising staircase',
        html: `<p>h = [1, 2, 3, 4, 5].</p>
          ${H.table(['L', 'R', 'level × width', 'area', 'move'], [
            ['0', '4', '1 × 4', '4', 'L++ (1 &lt; 5)'],
            ['1', '4', '2 × 3', H.c('p', '6'), 'L++'],
            ['2', '4', '3 × 2', '6', 'L++'],
            ['3', '4', '4 × 1', '4', 'L++ → stop']
          ])}
          <p>Answer ${H.c('p', '6')}. Notice R never moved: the right wall was always the taller one, so it was never the one "capping" the water.</p>`
      },
      {
        title: 'Why moving the TALLER wall is a bug',
        html: `<p>h = [2, 9, 1, 9]. Start: min(2, 9) × 3 = 6. If you (wrongly) move the taller right wall, you get min(2, 1) × 2 = 2, then min(2, 9) × 1 = 2 — and you never see walls 1 and 3: ${H.c('r', 'min(9, 9) × 2 = 18')}. The correct move (drop the short wall 2) reaches L = 1, R = 3 immediately and finds ${H.c('g', '18')}.</p>`
      },
      {
        title: 'Not the same as Trapping Rain Water',
        html: `<p>h = [3, 0, 2, 0, 4].</p>
          ${H.table(['question', 'what it measures', 'answer'], [
            ['Container With Most Water', 'ONE pool between TWO chosen walls (other walls ignored)', 'min(3, 4) × 4 = ' + H.c('p', '12')],
            ['Trapping Rain Water', 'water sitting on top of EVERY bar after rain', '3 + 1 + 3 = ' + H.c('p', '7')]
          ])}
          <p>Both use opposite pointers that move the shorter side, but the bookkeeping is different (Trapping Rain Water is a Hard problem in the practice arena).</p>`
      }
    ],
    deepDive: `<h4>The "pair matrix" proof</h4>
      <p>Imagine an N × N table where cell (i, j) holds the area of walls i and j (only i &lt; j matters). Brute force reads the whole upper triangle. The two-pointer walk starts at the corner (0, N-1). If <code>h[L] &lt; h[R]</code>, every cell in row L to the left of column R is ≤ the current one (narrower, level capped by h[L]) — so the <b>whole rest of row L</b> is eliminated in one step. If <code>h[R] ≤ h[L]</code>, the rest of <b>column R</b> is eliminated. Each step deletes one row or one column, so after N - 1 steps the whole triangle is covered, and the maximum was measured at some point.</p>
      <h4>Ties and the skip-ahead speed-up</h4>
      <ul>
        <li>When <code>h[L] == h[R]</code>, <b>both</b> walls are finished (any narrower partner keeps the level ≤ h and shrinks the width), so moving both is also correct.</li>
        <li>After discarding a wall of height <i>x</i>, any next wall with height ≤ current level cannot help either — the Java template jumps over all of them before computing another area. Same O(N), fewer multiplications.</li>
      </ul>
      <h4>Edge cases that fail in real submissions</h4>
      <ul>
        <li>Heights up to 10<sup>9</sup> and N up to 10<sup>5</sup> → area up to 10<sup>14</sup>: use <code>long</code>.</li>
        <li>Zero-height walls are allowed; an all-zero array returns 0.</li>
        <li>N = 2 → exactly one container.</li>
      </ul>
      <p><b>Greedy connection:</b> this is a greedy algorithm with an exchange-style proof ("the discarded wall cannot be in any better answer"). You will see the same reasoning style again in the Greedy module.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants know this problem by name, so typing it is free. Interviewers compensate by asking <b>"prove that moving the shorter wall never skips the optimum"</b> or by disguising the problem (two antennas, two billboards, "maximise min(a, b) × distance").</p>
      <p><b>Use AI as a partner:</b> ask it to write the brute-force checker and a random test loop (like the runnable Python above); ask <code>give me an input where moving the taller pointer gives a wrong answer</code> to build intuition; ask it to explain the pair-matrix proof back to you and check whether its explanation is actually complete.</p>
      <p><b>Where AI goes wrong:</b> it sometimes confuses this with Trapping Rain Water and sums water over all bars; claims "moving either pointer on a tie is wrong" (it is fine); forgets <code>long</code> when constraints are raised; or adds a sort (which destroys the positions and the problem).</p>
      <p><b>What you must still own:</b> recognising "two walls, min × distance", the elimination proof in plain words, and the difference from Trapping Rain Water.</p>`,
    problems: [
      {
        title: 'Container With Most Water',
        level: 'Medium',
        tags: ['two pointers', 'greedy'],
        statement: `<p>You are given <code>N</code> vertical lines; line <code>i</code> stands at x = <code>i</code> and has height <code>height[i]</code>. Pick two lines that, together with the x-axis, form a container. Return the <b>maximum amount of water</b> the container can hold. (You may not tilt the container.)</p>`,
        constraints: `2 ≤ N ≤ 10<sup>5</sup>, 0 ≤ height[i] ≤ 10<sup>4</sup>`,
        example: `${H.arr([1, 8, 6, 2, 5, 4, 8, 3, 7], { label: 'height', hl: { 1: 'p', 8: 'p', 2: 'b', 3: 'b', 4: 'b', 5: 'b', 6: 'b', 7: 'b' } })}<p>Output: ${H.c('p', '49')}</p><p><b>Why:</b> walls at index ${H.c('p', '1 (height 8)')} and ${H.c('p', '8 (height 7)')}. The water can rise only to the shorter wall, 7, and the width is 8 - 1 = 7 → 7 × 7 = 49. Walls 1 and 6 (both 8) give only 8 × 5 = 40.</p>`,
        brute: {
          why: `<p>Compute the area for every pair <code>(i, j)</code>: N(N-1)/2 ≈ 5·10<sup>9</sup> pairs for N = 10<sup>5</sup> → TLE. The wasted work: once we know the shorter wall of a pair, every narrower pair that keeps that wall is guaranteed to be worse, but brute force still measures them all.</p>`,
          code: `
            int brute(int[] h) {
                int best = 0;
                for (int i = 0; i < h.length; i++)
                    for (int j = i + 1; j < h.length; j++)
                        best = Math.max(best, Math.min(h[i], h[j]) * (j - i));
                return best;
            }`
        },
        mcq: {
          q: `L has height 3, R has height 9, width 6. Which pointer should move and why?`,
          options: [`R, because 9 is the bigger number`, `L, because the short wall caps the water and every narrower container with it is worse`, `Both, to save time`, `Neither — this is already optimal`],
          answer: 1,
          explain: `With L kept, the height can never exceed 3 and the width only shrinks, so L has nothing better to offer. Moving R would keep the cap at 3 (or lower) while losing width — guaranteed no gain.`
        },
        hints: [
          `<p><b>Aha:</b> area = <code>min(h[L], h[R]) × (R - L)</code>. If <code>h[L] &lt; h[R]</code>, every container using L with a closer right wall has smaller width and height ≤ <code>h[L]</code> → can't beat the current one. So L is "finished".</p>`,
          `<p>Two indices only: <code>L = 0</code>, <code>R = N - 1</code>, plus a running <code>best</code>. Measure, update best, then move the pointer at the <b>shorter</b> wall inward.</p>`,
          `<p><b>Traps:</b> move only <b>one</b> pointer per step; on a tie move either (both is also correct but skip it to keep it simple); max area 10<sup>4</sup> × 10<sup>5</sup> = 10<sup>9</sup> fits in <code>int</code>. <b>Recipe:</b> L = 0, R = n-1, best = 0 → while L &lt; R: best = max(best, min(h[L], h[R]) × (R - L)); if h[L] &lt; h[R] then L++ else R-- → return best.</p>`
        ],
        solution: {
          approach: `<p>Start with the widest container and repeatedly discard the shorter wall, keeping the best area seen.</p>`,
          code: `
            class Solution {
                public int maxArea(int[] height) {
                    int L = 0, R = height.length - 1;   // widest container first
                    int best = 0;
                    while (L < R) {
                        int h = Math.min(height[L], height[R]);   // water level = shorter wall
                        int area = h * (R - L);                   // at most 10^4 * 10^5 = 10^9, fits int
                        best = Math.max(best, area);
                        if (height[L] < height[R]) {
                            L++;      // left wall caps the water; it can't do better with a narrower partner
                        } else {
                            R--;      // right wall is shorter (or equal); discard it
                        }
                    }
                    return best;
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().maxArea(new int[]{1, 8, 6, 2, 5, 4, 8, 3, 7}));   // 49
                }
            }`,
          dry: {
            head: ['L', 'R', 'h[L], h[R]', 'min × width', 'area', 'best', 'move'],
            rows: [
              ['0', '8', '1, 7', '1 × 8', '8', '8', 'L++'],
              ['1', '8', '8, 7', '7 × 7', H.c('g', '49'), H.c('p', '49'), 'R--'],
              ['1', '7', '8, 3', '3 × 6', '18', '49', 'R--'],
              ['1', '6', '8, 8', '8 × 5', '40', '49', 'tie → R--'],
              ['1', '5', '8, 4', '4 × 4', '16', '49', 'R--'],
              ['1', '4', '8, 5', '5 × 3', '15', '49', 'R--'],
              ['1', '3', '8, 2', '2 × 2', '4', '49', 'R--'],
              ['1', '2', '8, 6', '6 × 1', '6', '49', 'R-- → L = R, stop']
            ]
          },
          complexity: `<p><b>Time O(N):</b> the gap R - L shrinks by exactly 1 per step, so at most N - 1 steps. <b>Space O(1):</b> a few integers.</p>`
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 4 — Same-direction (slow / fast) pointers: remove duplicates, move zeroes
  // =====================================================================
  topics.push({
    title: 'Same-Direction Pointers (Slow & Fast): Remove Duplicates, Move Zeroes',
    analogy: `<p>Think of a <b>factory conveyor belt</b> with two workers walking the <b>same direction</b>:</p>
      <ul>
        <li>The <b>inspector</b> (<code>fast</code>) walks along the belt and looks at <b>every</b> item.</li>
        <li>The <b>packer</b> (<code>slow</code>) stands at the front of the "keep" box. Only when the inspector shouts "this one is good!" does the packer put it in the next free slot and step forward.</li>
      </ul>
      <p>The inspector never waits; the packer only moves for good items. When the inspector reaches the end, everything in front of the packer is the clean result — done <b>in place</b>, no second belt needed.</p>`,
    explain: `<p>In <b>same-direction</b> (also called "slow/fast" or "read/write") two pointers, both fingers start at the left and only move right:</p>
      <ul>
        <li><code>fast</code> = <b>reader</b>: visits every element once.</li>
        <li><code>slow</code> = <b>writer</b>: marks where the next element we want to <b>keep</b> goes. Everything before <code>slow</code> is the finished answer.</li>
      </ul>
      <h4>A) Remove duplicates from a sorted array (in place)</h4>
      <p>Sorted means copies sit next to each other. Keep a number only if it differs from the last kept number <code>a[slow]</code>.</p>
      ${H.arr([1, 1, 2, 3, 3], { label: 'before', ptr: { 0: 'slow', 1: 'fast' } })}
      ${H.table(['fast', 'a[fast]', 'last kept a[slow]', 'new?', 'array after', 'slow'], [
        ['1', '1', '1', H.c('r', 'no, skip'), '[1, 1, 2, 3, 3]', '0'],
        ['2', '2', '1', H.c('g', 'yes'), '[1, <b>2</b>, 2, 3, 3]', '1'],
        ['3', '3', '2', H.c('g', 'yes'), '[1, 2, <b>3</b>, 3, 3]', '2'],
        ['4', '3', '3', H.c('r', 'no, skip'), '[1, 2, 3, 3, 3]', '2']
      ])}
      <p>Answer: length <code>slow + 1 = 3</code>, first three cells ${H.c('g', '[1, 2, 3]')}. The leftovers after that do not matter.</p>
      <h4>B) Move zeroes to the end (keep the order of non-zeros)</h4>
      <p>Same idea, the rule is "keep if <b>non-zero</b>". We <b>swap</b> the good item into slot <code>slow</code>, which pushes zeros backwards automatically.</p>
      ${H.arr([0, 1, 0, 3, 12], { label: 'before', hl: { 0: 'r', 2: 'r' } })}
      ${H.arr([1, 3, 12, 0, 0], { label: 'after', hl: { 0: 'g', 1: 'g', 2: 'g' } })}
      <h4>The read/write template</h4>
      <p>"for every <code>fast</code>: if <code>a[fast]</code> should be kept → write it at <code>slow</code>, then <code>slow++</code>." Only the <b>keep rule</b> changes between problems: "different from last kept" (remove duplicates), "not zero" (move zeroes), "not equal to val" (remove element), "appears at most twice" (compare with <code>a[slow - 2]</code>).</p>
      <p>Each element is read once → ${H.c('g', 'O(N) time')}, and we reuse the same array → ${H.c('g', 'O(1) extra space')}.</p>`,
    clues: [
      '"Do it <b>in place</b>" / "<b>O(1) extra memory</b>" / "return the new length k" → slow (write) + fast (read) pointers.',
      '"Remove duplicates from a <b>sorted</b> array" → keep if <code>a[fast] != a[slow]</code>.',
      '"Move all zeroes / all X to the end while <b>keeping the relative order</b>" → swap good items forward with a write pointer.',
      '"Partition", "remove element", "compact the array", "keep at most two copies" → same read/write template, different keep rule.',
      'Linked-list cousins: "middle of list", "cycle detection" use slow/fast too (covered in the linked list module).'
    ],
    code: [`
      // Read/write template: keep only elements that pass the rule, in place.
      int compact(int[] a) {
          int slow = 0;                          // next free slot for a "kept" element
          for (int fast = 0; fast < a.length; fast++) {
              if (a[fast] % 2 == 0) {            // keep rule (example: keep even numbers)
                  a[slow] = a[fast];             // write it into the keep zone
                  slow++;                        // keep zone grows by one
              }
          }
          return slow;                           // a[0..slow-1] is the answer
      }`, `
      // Move zeroes: keep non-zeros in order, zeros drift to the end via swaps.
      void moveZeroes(int[] a) {
          int slow = 0;                          // where the next non-zero belongs
          for (int fast = 0; fast < a.length; fast++) {
              if (a[fast] != 0) {
                  int tmp = a[slow];             // swap a[slow] and a[fast]
                  a[slow] = a[fast];
                  a[fast] = tmp;
                  slow++;
              }
          }
      }`],
    codeTitle: ['Generic read/write (slow/fast) template', 'Move zeroes with swaps'],
    viz: [
      {
        title: 'Remove duplicates: slow writes, fast reads',
        input: '0 0 1 1 1 2 2 3 3 4',
        inputLabel: 'sorted array (at most 16)',
        gen: function (input) {
          var a = parseArr(input, 16, 1), note = '';
          if (!isSorted(a)) { a = sortNums(a); note = ' (I sorted your input: this method needs equal values next to each other.)'; }
          var frames = [], slow = 0;
          function keepHl(extra) {
            var h = {};
            for (var q = 0; q <= slow; q++) h[q] = 'ok';
            (extra || []).forEach(function (e) { h[e[0]] = e[1]; });
            return h;
          }
          frames.push({
            narr: 'The first number is always kept, so <b>slow = 0</b> (green = kept zone). <b>fast</b> will read every other number and compare it with the last kept one, a[slow].' + note,
            parts: [
              { type: 'array', label: 'a', values: a.slice(), ptr: ptrMap([[0, 'slow']]), hl: keepHl() },
              { type: 'vars', label: 'state', vals: { slow: 0, 'kept so far': 1 } }
            ]
          });
          for (var fast = 1; fast < a.length; fast++) {
            if (a[fast] !== a[slow]) {
              slow++;
              var old = a[slow];
              a[slow] = a[fast];
              frames.push({
                narr: 'a[fast] = ' + a[fast] + ' is <span class="c-g">different</span> from the last kept value ' + (a[slow - 1]) + '. Move slow to ' + slow + ' and write ' + a[fast] + ' there' + (old !== a[fast] ? ' (overwriting ' + old + ')' : '') + '.',
                parts: [
                  { type: 'array', label: 'a', values: a.slice(), ptr: ptrMap([[slow, 'slow'], [fast, 'fast']]), hl: keepHl([[fast, 'cur'], [slow, 'sel']]) },
                  { type: 'vars', label: 'state', vals: { slow: slow, fast: fast, 'kept so far': slow + 1 }, hl: { 'kept so far': 'ok' } }
                ]
              });
            } else {
              frames.push({
                narr: 'a[fast] = ' + a[fast] + ' <span class="c-r">equals</span> the last kept value a[slow] = ' + a[slow] + ' → it is a duplicate, skip it. slow stays put.',
                parts: [
                  { type: 'array', label: 'a', values: a.slice(), ptr: ptrMap([[slow, 'slow'], [fast, 'fast']]), hl: keepHl([[fast, 'bad']]) },
                  { type: 'vars', label: 'state', vals: { slow: slow, fast: fast, 'kept so far': slow + 1 } }
                ]
              });
            }
          }
          var fh = {};
          for (var q = 0; q < a.length; q++) fh[q] = q <= slow ? 'ok' : 'done';
          frames.push({
            narr: 'fast reached the end. The unique values are the first <b>' + (slow + 1) + '</b> cells: [' + a.slice(0, slow + 1).join(', ') + ']. Cells after that are leftovers we ignore. Return k = slow + 1 = ' + (slow + 1) + '.',
            parts: [
              { type: 'array', label: 'a', values: a.slice(), hl: fh, range: [0, slow] },
              { type: 'vars', label: 'answer', vals: { k: slow + 1 }, hl: { k: 'sel' } }
            ]
          });
          while (frames.length < 4) frames.push({ narr: 'Short input: try a longer array with repeats to see more steps.', parts: [{ type: 'array', label: 'a', values: a.slice() }] });
          return frames;
        }
      },
      {
        title: 'Move zeroes: swap non-zeros forward',
        input: '0 1 0 3 12',
        inputLabel: 'array (at most 16)',
        gen: function (input) {
          var a = parseArr(input, 16, 1), frames = [], slow = 0;
          frames.push({
            narr: '<b>slow = 0</b> is where the next non-zero belongs. <b>fast</b> will scan every cell. Red cells are zeros.',
            parts: [
              { type: 'array', label: 'a', values: a.slice(), ptr: ptrMap([[0, 'slow'], [0, 'fast']]), hl: (function () { var h = {}; a.forEach(function (v, i) { if (v === 0) h[i] = 'bad'; }); return h; })() },
              { type: 'vars', label: 'state', vals: { slow: 0 } }
            ]
          });
          for (var fast = 0; fast < a.length; fast++) {
            var narr, hl = {};
            if (a[fast] !== 0) {
              var moved = a[fast];
              var tmp = a[slow]; a[slow] = a[fast]; a[fast] = tmp;
              narr = 'a[' + fast + '] = ' + moved + ' is <span class="c-g">non-zero</span> → swap it into slot slow = ' + slow + (slow === fast ? ' (same cell, nothing really moves)' : ' (the zero there jumps back to index ' + fast + ')') + '. Then slow++.';
              slow++;
            } else {
              narr = 'a[' + fast + '] is <span class="c-r">0</span> → skip it. slow stays at ' + slow + ', waiting for the next non-zero.';
            }
            for (var q = 0; q < a.length; q++) {
              if (q < slow) hl[q] = 'ok';
              else if (a[q] === 0 && q <= fast) hl[q] = 'bad';
            }
            if (fast >= slow) hl[fast] = a[fast] === 0 ? 'bad' : 'cur';
            frames.push({
              narr: narr,
              parts: [
                { type: 'array', label: 'a (green = finished non-zero zone)', values: a.slice(), ptr: ptrMap([[slow < a.length ? slow : -1, 'slow'], [fast, 'fast']]), hl: hl },
                { type: 'vars', label: 'state', vals: { slow: slow, fast: fast } }
              ]
            });
          }
          frames.push({
            narr: 'Finished: all non-zeros are packed at the front in their <b>original order</b>, all zeros are at the back. Done in one pass with only swaps.',
            parts: [
              { type: 'array', label: 'a', values: a.slice(), hl: (function () { var h = {}; a.forEach(function (v, i) { h[i] = i < slow ? 'ok' : 'done'; }); return h; })() },
              { type: 'vars', label: 'answer', vals: { 'non-zeros': slow, zeros: a.length - slow } }
            ]
          });
          while (frames.length < 4) frames.push({ narr: 'Short input: try a longer array to see more steps.', parts: [{ type: 'array', label: 'a', values: a.slice() }] });
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'Remove every copy of a value (keep rule: not equal to val)',
        html: `<p>nums = [3, 2, 2, 3], val = 3.</p>
          ${H.table(['fast', 'a[fast]', 'keep?', 'write', 'slow after'], [
            ['0', '3', H.c('r', 'no'), '—', '0'],
            ['1', '2', H.c('g', 'yes'), 'a[0] = 2', '1'],
            ['2', '2', H.c('g', 'yes'), 'a[1] = 2', '2'],
            ['3', '3', H.c('r', 'no'), '—', '2']
          ])}
          <p>Return k = ${H.c('p', '2')}; the array starts with [2, 2]. Here <code>slow</code> means "next free slot" (it starts at 0), a slightly different but equally common way to write the template.</p>`
      },
      {
        title: 'Keep at most two copies of each value (look two cells back)',
        html: `<p>nums = [1, 1, 1, 2, 2, 3] (sorted). Keep <code>a[fast]</code> if fewer than 2 cells were written so far, or if it differs from <code>a[slow - 2]</code> — the value two places back in the <b>kept</b> zone. If they are equal, we would be writing a third copy.</p>
          ${H.arr([1, 1, 2, 2, 3, 3], { label: 'after (k = 5)', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g', 4: 'g', 5: 'm' } })}
          <p>The third 1 is rejected because a[slow - 2] = 1. Replace 2 by any k to keep at most k copies.</p>`,
        code: `
          int removeDuplicatesAtMostTwo(int[] a) {
              int slow = 0;                                   // next free slot
              for (int fast = 0; fast < a.length; fast++) {
                  if (slow < 2 || a[fast] != a[slow - 2]) {   // not a third copy
                      a[slow++] = a[fast];
                  }
              }
              return slow;                                    // [1,1,1,2,2,3] -> 5
          }`
      },
      {
        title: 'Squeeze repeated spaces in a char array',
        html: `<p>"go&nbsp;&nbsp;&nbsp;team&nbsp;&nbsp;now" → "go team now". Keep rule: keep a character unless it is a space <b>and</b> the last written character is also a space. Same template, applied to text — this is how many "normalize whitespace" routines work in C, where strings are just arrays.</p>`,
        code: `
          int squeezeSpaces(char[] s) {
              int slow = 0;
              for (int fast = 0; fast < s.length; fast++) {
                  boolean dupSpace = s[fast] == ' ' && slow > 0 && s[slow - 1] == ' ';
                  if (!dupSpace) s[slow++] = s[fast];   // keep it
              }
              return slow;                              // new logical length
          }`
      },
      {
        title: 'Move zeroes by writing instead of swapping',
        html: `<p>Alternative: copy every non-zero forward with <code>a[slow++] = a[fast]</code>, then fill <code>a[slow..N-1]</code> with zeros in a second short loop. Both versions are O(N). Writing does fewer memory writes when there are <b>few zeros near the end</b>; swapping is a single loop and handles the tail automatically. For [0, 1, 0, 3, 12]: after the copy loop the array is [1, 3, 12, 3, 12], then the fill gives ${H.c('g', '[1, 3, 12, 0, 0]')}.</p>`
      }
    ],
    deepDive: `<h4>The invariant that makes it correct</h4>
      <p>After processing <code>a[0..fast-1]</code>, the cells <code>a[0..slow-1]</code> hold exactly the kept elements of that prefix, <b>in their original order</b>. Two facts keep it true:</p>
      <ul>
        <li><code>slow ≤ fast</code> always, so a write at <code>slow</code> only overwrites a cell that was <b>already read</b> — we never destroy unread data.</li>
        <li>Kept items are written in the same order they are read, so the method is <b>stable</b> (relative order preserved). That is why "keep the relative order" in a question points straight at this template.</li>
      </ul>
      <h4>Where you meet it in real code</h4>
      <ul>
        <li>C++ <code>std::remove</code>, <code>std::remove_if</code> and <code>std::unique</code> implement exactly this read/write walk and return the new logical end — the famous <b>erase–remove idiom</b> then trims the tail.</li>
        <li>Java's <code>ArrayList.removeIf</code> compacts the survivors forward in one pass instead of calling <code>remove(i)</code> in a loop (which would shift the tail every time → O(N<sup>2</sup>)).</li>
        <li>Garbage collectors use "compaction" (sliding live objects to the front of a region) — the same idea at the memory-manager level.</li>
      </ul>
      <h4>Counting writes</h4>
      <p>Interviewers sometimes ask to "minimise writes" (flash memory wears out per write). The copy version writes every kept element even when <code>slow == fast</code>; guard with <code>if (slow != fast)</code>. The swap version for move-zeroes does at most one swap per non-zero. For "order does not matter" variants (remove element), an <b>opposite-direction</b> version that moves the last element into the hole does at most (number of removed) writes.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants instantly produce <code>list(filter(...))</code> or <code>stream().filter()</code> answers, which are correct but allocate a <b>new</b> array — exactly what "in place, O(1) extra memory" forbids. Recognising when the constraint matters is your job.</p>
      <p><b>Use AI as a partner:</b> ask <code>Rewrite this filter so it runs in place with a read and a write pointer, and explain the invariant</code>; ask for tests that check <b>stability</b> (equal-looking items with different ids must stay in order); ask it to translate the pattern to C++ using the erase–remove idiom to see the library version.</p>
      <p><b>Where AI goes wrong:</b> returns the index <code>slow</code> when the count <code>slow + 1</code> is needed (or the opposite, depending on which convention it started with); compares with <code>a[fast - 1]</code> instead of the last <b>kept</b> value (breaks "at most two copies"); swaps in a way that reorders the non-zeros.</p>
      <p><b>What you must still own:</b> choosing the convention (slow = last kept vs next free) and staying consistent, the "never overwrite unread data" argument, and spotting the in-place constraint in the wording.</p>`,
    problems: [
      {
        title: 'Remove Duplicates from Sorted Array',
        level: 'Easy',
        tags: ['two pointers', 'in-place'],
        statement: `<p>Given an integer array <code>nums</code> sorted in non-decreasing order, remove the duplicates <b>in place</b> so each unique value appears only once, keeping their order. Return <code>k</code>, the number of unique values; the first <code>k</code> cells of <code>nums</code> must hold them. What lies beyond index <code>k - 1</code> does not matter. Use O(1) extra memory.</p>`,
        constraints: `1 ≤ N ≤ 3·10<sup>4</sup>, -100 ≤ nums[i] ≤ 100, nums sorted`,
        example: `${H.arr([1, 1, 2, 3, 3], { label: 'nums', hl: { 1: 'r', 4: 'r' } })}<p>Output: ${H.c('p', 'k = 3')}, nums starts with ${H.c('g', '[1, 2, 3]')}</p><p><b>Why:</b> the values are 1, 2, 3; the ${H.c('r', 'red')} cells are repeats of the value right before them.</p>`,
        brute: {
          why: `<p>Copy unique values into a new list (or a <code>TreeSet</code>) and copy them back — easy but uses O(N) extra memory, which the problem forbids. Another naive idea, "shift everything left each time you see a duplicate", costs O(N) per removal → O(N<sup>2</sup>). The waste: we move the same elements again and again.</p>`,
          code: `
            int brute(int[] nums) {
                List<Integer> uniq = new ArrayList<>();
                for (int x : nums) {
                    if (uniq.isEmpty() || uniq.get(uniq.size() - 1) != x) uniq.add(x);   // extra O(N) memory
                }
                for (int i = 0; i < uniq.size(); i++) nums[i] = uniq.get(i);
                return uniq.size();
            }`
        },
        mcq: {
          q: `slow = 2 and a = [1, 2, 3, 3, 4]. fast = 4 reads the value 4. What happens?`,
          options: [`Skip it, it is a duplicate`, `slow becomes 3 and a[3] = 4`, `a[2] = 4 and slow stays 2`, `Swap a[0] and a[4]`],
          answer: 1,
          explain: `4 differs from the last kept value a[slow] = 3, so it is new: slow moves to 3 and we write 4 there → [1, 2, 3, 4, 4], k = 4.`
        },
        hints: [
          `<p><b>Aha:</b> because the array is sorted, a value is "new" exactly when it differs from the <b>last value we kept</b>. You never need to look further back than one cell.</p>`,
          `<p>Two indices in the same array: <code>slow</code> = index of the last kept value, <code>fast</code> = reader. When <code>a[fast] != a[slow]</code>: <code>slow++</code>, <code>a[slow] = a[fast]</code>.</p>`,
          `<p><b>Traps:</b> return <code>slow + 1</code> (a count, not an index); start <code>fast</code> at 1 because a[0] is always kept; an empty array would return 0 (guard it). <b>Recipe:</b> slow = 0 → for fast = 1..n-1: if a[fast] != a[slow] → slow++, a[slow] = a[fast] → return slow + 1.</p>`
        ],
        solution: {
          approach: `<p>Read/write pointers: keep a value only when it differs from the last kept value.</p>`,
          code: `
            class Solution {
                public int removeDuplicates(int[] nums) {
                    if (nums.length == 0) return 0;      // nothing to keep
                    int slow = 0;                        // index of the last kept (unique) value
                    for (int fast = 1; fast < nums.length; fast++) {
                        if (nums[fast] != nums[slow]) {  // a new value appears
                            slow++;                      // open the next slot in the keep zone
                            nums[slow] = nums[fast];     // write the new value there
                        }
                        // else: duplicate of nums[slow] -> just skip it
                    }
                    return slow + 1;                     // count of unique values
                }

                public static void main(String[] args) {
                    int[] a = {1, 1, 2, 3, 3};
                    int k = new Solution().removeDuplicates(a);
                    System.out.println(k + " " + Arrays.toString(Arrays.copyOf(a, k)));   // 3 [1, 2, 3]
                }
            }`,
          dry: {
            head: ['fast', 'a[fast]', 'a[slow] (last kept)', 'action', 'slow', 'array'],
            rows: [
              ['start', '—', '1', 'keep a[0]', '0', '[1, 1, 2, 3, 3]'],
              ['1', '1', '1', H.c('r', 'equal → skip'), '0', '[1, 1, 2, 3, 3]'],
              ['2', '2', '1', H.c('g', 'new → slow++, write'), '1', '[1, <b>2</b>, 2, 3, 3]'],
              ['3', '3', '2', H.c('g', 'new → slow++, write'), '2', '[1, 2, <b>3</b>, 3, 3]'],
              ['4', '3', '3', H.c('r', 'equal → skip'), '2', '[1, 2, 3, 3, 3]'],
              ['end', '', '', H.c('p', 'return 2 + 1 = 3'), '2', '[<b>1, 2, 3</b>, 3, 3]']
            ]
          },
          complexity: `<p><b>Time O(N):</b> <code>fast</code> visits each cell once; <code>slow</code> only moves forward too. <b>Space O(1):</b> we overwrite the input array instead of making a new one.</p>`
        }
      },
      {
        title: 'Move Zeroes',
        level: 'Easy',
        tags: ['two pointers', 'in-place'],
        statement: `<p>Given an integer array <code>nums</code>, move all <code>0</code>s to the end while keeping the <b>relative order</b> of the non-zero elements. Do it <b>in place</b> without making a copy of the array.</p>`,
        constraints: `1 ≤ N ≤ 10<sup>4</sup>, -2<sup>31</sup> ≤ nums[i] ≤ 2<sup>31</sup> - 1`,
        example: `${H.arr([0, 1, 0, 3, 12], { label: 'nums', hl: { 0: 'r', 2: 'r' } })}${H.arr([1, 3, 12, 0, 0], { label: 'output', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'm', 4: 'm' } })}<p><b>Why:</b> the non-zeros ${H.c('g', '1, 3, 12')} keep their order (1 before 3 before 12) and the two ${H.c('r', 'zeros')} end up at the back.</p>`,
        brute: {
          why: `<p>Each time you see a 0, bubble it to the end by swapping with its right neighbour step by step. A zero near the front walks N cells, and there can be N zeros → O(N<sup>2</sup>). Or copy non-zeros into a new array → O(N) extra memory (not allowed). The waste: zeros are moved many times instead of the non-zeros being placed once.</p>`,
          code: `
            void brute(int[] a) {
                int n = a.length;
                for (int pass = 0; pass < n; pass++) {          // repeat like bubble sort
                    for (int i = 0; i + 1 < n; i++) {
                        if (a[i] == 0 && a[i + 1] != 0) {       // push the zero one step right
                            int t = a[i]; a[i] = a[i + 1]; a[i + 1] = t;
                        }
                    }
                }
            }`
        },
        mcq: {
          q: `Why do we <b>swap</b> a[slow] and a[fast] instead of just writing a[slow] = a[fast]?`,
          options: [`Swapping is faster than assignment`, `So the zero sitting at slow gets pushed back to fast, leaving zeros at the end with no extra loop`, `To sort the array`, `Because writing would change the order of non-zeros`],
          answer: 1,
          explain: `Everything between slow and fast is zero. Swapping moves the non-zero forward and the zero backward in one go. (Writing also works if you fill the tail with zeros in a second loop.)`
        },
        hints: [
          `<p><b>Aha:</b> instead of moving the zeros, place the <b>non-zeros</b>: the k-th non-zero you meet belongs at index k - 1. Zeros then naturally end up at the back.</p>`,
          `<p>Read/write pointers. <code>slow</code> = next slot for a non-zero. For every <code>fast</code> with <code>a[fast] != 0</code>: swap <code>a[slow]</code> and <code>a[fast]</code>, then <code>slow++</code>.</p>`,
          `<p><b>Traps:</b> when <code>slow == fast</code> the swap is harmless (same cell); keep the order — never swap two non-zeros past each other; the array may have no zeros or be all zeros. <b>Recipe:</b> slow = 0 → for fast in 0..n-1: if a[fast] != 0 → swap(slow, fast), slow++.</p>`
        ],
        solution: {
          approach: `<p>One pass with a write pointer; each non-zero is swapped into the next free front slot.</p>`,
          code: `
            class Solution {
                public void moveZeroes(int[] nums) {
                    int slow = 0;                          // all of nums[0..slow-1] are non-zero, in order
                    for (int fast = 0; fast < nums.length; fast++) {
                        if (nums[fast] != 0) {             // found a value to keep
                            int tmp = nums[slow];          // nums[slow] is 0 (or fast itself)
                            nums[slow] = nums[fast];
                            nums[fast] = tmp;              // zero goes back to where fast is
                            slow++;
                        }
                    }
                }

                public static void main(String[] args) {
                    int[] a = {0, 1, 0, 3, 12};
                    new Solution().moveZeroes(a);
                    System.out.println(Arrays.toString(a));   // [1, 3, 12, 0, 0]
                }
            }`,
          dry: {
            head: ['fast', 'a[fast]', 'action', 'array after', 'slow after'],
            rows: [
              ['0', '0', H.c('r', 'zero → skip'), '[0, 1, 0, 3, 12]', '0'],
              ['1', '1', H.c('g', 'swap a[0], a[1]'), '[1, 0, 0, 3, 12]', '1'],
              ['2', '0', H.c('r', 'zero → skip'), '[1, 0, 0, 3, 12]', '1'],
              ['3', '3', H.c('g', 'swap a[1], a[3]'), '[1, 3, 0, 0, 12]', '2'],
              ['4', '12', H.c('g', 'swap a[2], a[4]'), H.c('p', '[1, 3, 12, 0, 0]'), '3']
            ]
          },
          complexity: `<p><b>Time O(N):</b> one pass, at most one swap per element. <b>Space O(1):</b> only two indices and a temp variable.</p>`
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 5 — Same-direction pointers: pairs with difference K
  // =====================================================================
  topics.push({
    title: 'Same-Direction Pointers: Pairs with Difference K',
    analogy: `<p>Two kids walk along a line of children <b>sorted by height</b>, looking for pairs whose heights differ by exactly <b>K = 2 cm</b>. Kid <b>i</b> stands behind, kid <b>j</b> walks ahead.</p>
      <ul>
        <li>Gap too <b>small</b>? Kid j walks forward to a taller child → the gap grows.</li>
        <li>Gap too <b>big</b>? Kid i walks forward to a taller child → the gap shrinks.</li>
        <li>Gap exactly 2? Write down the pair and move on.</li>
      </ul>
      <p>Both kids only ever walk <b>forward</b>, so together they walk the line at most twice.</p>`,
    explain: `<p>For a <b>sum</b> we started at both ends. For a <b>difference</b> that does not work: with L at the smallest and R at the biggest, <code>a[R] - a[L]</code> is already the <b>largest</b> gap, and moving <b>either</b> pointer inward makes it smaller — we would not know which one to move.</p>
      <p>Instead, put both pointers at the <b>start</b> (<code>i = 0</code>, <code>j = 1</code>) and look at <code>diff = a[j] - a[i]</code> in the sorted array:</p>
      <ul>
        <li><code>diff &lt; K</code> → need a bigger gap → <code>j++</code> (the only move that increases it).</li>
        <li><code>diff &gt; K</code> → need a smaller gap → <code>i++</code> (the only move that decreases it).</li>
        <li><code>diff == K</code> → found a pair.</li>
      </ul>
      ${H.arr([1, 1, 3, 4, 5], { label: 'sorted', ptr: { 0: 'i', 2: 'j' }, hl: { 0: 'y', 2: 'y' } })}
      ${H.table(['i', 'j', 'a[j] - a[i]', 'vs K = 2', 'move'], [
        ['0', '1', '1 - 1 = 0', H.c('b', 'too small'), 'j++'],
        ['0', '2', '3 - 1 = 2', H.c('g', 'match (1, 3)'), 'skip all 1s → i = 2, j = 3'],
        ['2', '3', '4 - 3 = 1', H.c('b', 'too small'), 'j++'],
        ['2', '4', '5 - 3 = 2', H.c('g', 'match (3, 5)'), 'i = 3; then 5 - 4 = 1 is too small → j = 5, end']
      ])}
      <p>Answer: <b>2</b> distinct pairs. ${H.c('m', 'Rule to keep i and j apart: whenever i catches up with j, push j to i + 1 (a pair needs two different positions).')}</p>
      <p><b>Why it is O(N):</b> i and j each move only forward and each stop at most N times → at most 2N steps after an O(N log N) sort.</p>
      <p><b>Other way:</b> a HashSet ("is <code>x + K</code> present?") also works in O(N), but uses O(N) memory. The pointer version is the go-to when the array is already sorted or memory is tight.</p>`,
    clues: [
      '"Count / find pairs with <b>difference</b> exactly K" or "<code>|a[i] - a[j]| = K</code>" → sort + two pointers moving the <b>same</b> direction.',
      '"<b>Distinct / unique</b> pairs" → skip equal values after counting, or count by value not by index.',
      'Difference questions: opposite pointers fail (both moves shrink the gap); same-direction pointers have one move to grow and one to shrink.',
      '"Pairs with difference ≤ K / at most K" → same walk, but count <code>j - i</code> pairs at a time (like a sliding window).',
      '<code>N ≤ 10<sup>4</sup>..10<sup>5</sup></code> and "use O(1) extra space" → sorting + pointers beats checking all N<sup>2</sup> pairs.'
    ],
    viz: {
      title: 'Pairs with difference K: i and j both walk forward',
      input: '3 1 4 1 5 | 2',
      inputLabel: 'array | K (K ≥ 0)',
      gen: function (input) {
        var p = parseArrK(input, 14, 'K', 2);
        if (p.k < 0) throw new Error('K must be 0 or more (a difference is never negative).');
        var a = sortNums(p.a), k = p.k, n = a.length, frames = [], pairs = [];
        var i = 0, j = 1;
        frames.push({
          narr: 'Sort first: ' + a.join(', ') + '. Put <b>i = 0</b> and <b>j = 1</b>. We want distinct pairs where a[j] - a[i] = <b>' + k + '</b>.',
          parts: [
            { type: 'array', label: 'sorted a', values: a.slice(), ptr: ptrMap([[0, 'i'], [1, 'j']]), hl: hlMap([[0, 'cur'], [1, 'cur']]) },
            { type: 'vars', label: 'state', vals: { i: 0, j: 1, K: k, count: 0 } },
            { type: 'set', label: 'pairs found', items: [] }
          ]
        });
        var guard = 0;
        while (j < n && guard++ < 200) {
          if (i === j) {
            frames.push({
              narr: 'i caught up with j (both at ' + i + '). A pair needs two different positions → <b>j++</b>.',
              parts: [
                { type: 'array', label: 'sorted a', values: a.slice(), ptr: ptrMap([[i, 'i'], [j, 'j']]), hl: hlMap([[i, 'cur']]) },
                { type: 'vars', label: 'state', vals: { i: i, j: j, K: k, count: pairs.length } },
                { type: 'set', label: 'pairs found', items: pairs.slice() }
              ]
            });
            j++;
            continue;
          }
          var d = a[j] - a[i];
          if (d < k) {
            frames.push({
              narr: 'a[j] - a[i] = ' + a[j] + ' - ' + a[i] + ' = <b>' + d + '</b> is <span class="c-b">smaller than ' + k + '</span>. To widen the gap, move the front walker → <b>j++</b>.',
              parts: [
                { type: 'array', label: 'sorted a', values: a.slice(), ptr: ptrMap([[i, 'i'], [j, 'j']]), hl: hlMap([[i, 'cur'], [j, 'cur']]), range: [i, j] },
                { type: 'vars', label: 'state', vals: { i: i, j: j, diff: d, K: k, count: pairs.length }, hl: { diff: 'win' } },
                { type: 'set', label: 'pairs found', items: pairs.slice() }
              ]
            });
            j++;
          } else if (d > k) {
            frames.push({
              narr: 'a[j] - a[i] = ' + a[j] + ' - ' + a[i] + ' = <b>' + d + '</b> is <span class="c-r">bigger than ' + k + '</span>. To shrink the gap, move the back walker → <b>i++</b>.',
              parts: [
                { type: 'array', label: 'sorted a', values: a.slice(), ptr: ptrMap([[i, 'i'], [j, 'j']]), hl: hlMap([[i, 'cur'], [j, 'cur']]), range: [i, j] },
                { type: 'vars', label: 'state', vals: { i: i, j: j, diff: d, K: k, count: pairs.length }, hl: { diff: 'bad' } },
                { type: 'set', label: 'pairs found', items: pairs.slice() }
              ]
            });
            i++;
          } else {
            var pr = '(' + a[i] + ',' + a[j] + ')';
            pairs.push(pr);
            var sh = {}; sh[pr] = 'ok';
            var v = a[i], oi = i;
            while (i < n && a[i] === v) i++;
            var nj = j <= i ? i + 1 : j;
            frames.push({
              narr: 'a[j] - a[i] = ' + a[j] + ' - ' + a[oi] + ' = <b>' + k + '</b> → <span class="c-g">pair ' + pr + ' found!</span> Move i past every copy of ' + v + ' (so this pair is not counted twice) → i = ' + i + (nj !== j ? ', and push j to i + 1 = ' + nj : '') + '.',
              parts: [
                { type: 'array', label: 'sorted a', values: a.slice(), ptr: ptrMap([[oi, 'i'], [j, 'j']]), hl: hlMap([[oi, 'ok'], [j, 'ok']]), range: [oi, j] },
                { type: 'vars', label: 'state', vals: { i: oi, j: j, diff: d, K: k, count: pairs.length }, hl: { diff: 'ok', count: 'ok' } },
                { type: 'set', label: 'pairs found', items: pairs.slice(), hl: sh }
              ]
            });
            j = nj;
          }
        }
        frames.push({
          narr: 'j ran off the end, so no more pairs are possible. Distinct pairs with difference ' + k + ': <b>' + pairs.length + '</b>' + (pairs.length ? ' → ' + pairs.join(' ') : '') + '.',
          parts: [
            { type: 'array', label: 'sorted a', values: a.slice() },
            { type: 'vars', label: 'answer', vals: { count: pairs.length }, hl: { count: 'sel' } },
            { type: 'set', label: 'pairs found', items: pairs.slice() }
          ]
        });
        while (frames.length < 4) frames.push({ narr: 'Short input: add more numbers to see more steps.', parts: [{ type: 'array', label: 'sorted a', values: a.slice() }] });
        return frames;
      }
    },
    code: [`
      // Count INDEX pairs (i < j) in a sorted array with a[j] - a[i] <= K.
      // For each j, slide i forward until the gap fits; then every i' in [i, j-1] pairs with j.
      long countPairsDiffAtMostK(int[] a, int K) {      // a must be sorted
          long count = 0;
          int i = 0;
          for (int j = 0; j < a.length; j++) {
              while ((long) a[j] - a[i] > K) i++;       // gap too big -> back walker steps up
              count += j - i;                           // pairs (i..j-1, j) all have gap <= K
          }
          return count;
      }`, `
      // Same question as the guided problem (distinct value pairs with difference k), with a HashMap.
      // O(N) time, O(N) memory, no sorting needed.
      int findPairsHash(int[] nums, int k) {
          Map<Integer, Integer> freq = new HashMap<>();
          for (int x : nums) freq.merge(x, 1, Integer::sum);
          int count = 0;
          for (Map.Entry<Integer, Integer> e : freq.entrySet()) {
              if (k == 0) {
                  if (e.getValue() >= 2) count++;              // needs two copies of the same value
              } else if (freq.containsKey(e.getKey() + k)) {
                  count++;                                     // x and x + k both present
              }
          }
          return count;
      }`],
    codeTitle: ['Counting pairs with difference ≤ K (two pointers)', 'Distinct pairs with difference k (HashMap alternative)'],
    examples: [
      {
        title: 'k = 0 means "values that appear at least twice"',
        html: `<p>nums = [1, 1, 1, 2, 2], k = 0 (already sorted).</p>
          ${H.table(['i', 'j', 'diff', 'action', 'count'], [
            ['0', '1', '0', H.c('g', 'match (1,1)') + ' → skip all 1s: i = 3; j ≤ i → j = 4', '1'],
            ['3', '4', '0', H.c('g', 'match (2,2)') + ' → skip all 2s: i = 5; j = 6', H.c('p', '2')]
          ])}
          <p>The rule "i must never equal j" is what stops a single 3 from pairing with itself when k = 0.</p>`
      },
      {
        title: 'Count pairs with difference AT MOST K (a window in disguise)',
        html: `<p>a = [1, 3, 4, 6, 9], K = 3. For each j, push i forward while the gap is too big; then all of i..j-1 pair with j.</p>
          ${H.table(['j', 'a[j]', 'i after sliding', 'pairs added (j - i)', 'total'], [
            ['0', '1', '0', '0', '0'],
            ['1', '3', '0', '1 → (1,3)', '1'],
            ['2', '4', '0', '2 → (1,4) (3,4)', '3'],
            ['3', '6', '1 (6 - 1 = 5 &gt; 3)', '2 → (3,6) (4,6)', '5'],
            ['4', '9', '3 (9 - 3 = 6, 9 - 4 = 5 too big)', '1 → (6,9)', H.c('p', '6')]
          ])}
          <p>This is the sliding-window "count" flavour: the window [i, j] holds every value within K of a[j].</p>`
      },
      {
        title: 'Merge two sorted arrays — same-direction pointers on TWO arrays',
        html: `<p>A = [1, 4, 7], B = [2, 3, 9]. One pointer per array; always take the smaller front value and advance only that pointer. Neither pointer ever moves back → O(|A| + |B|). This is the heart of merge sort (Sorting module) and of merging sorted log files.</p>
          ${H.arr([1, 2, 3, 4, 7, 9], { label: 'merged', hl: { 0: 'b', 1: 'g', 2: 'g', 3: 'b', 4: 'b', 5: 'g' } })}
          <p>${H.c('b', 'blue')} came from A, ${H.c('g', 'green')} from B.</p>`,
        code: `
          int[] merge(int[] A, int[] B) {
              int[] out = new int[A.length + B.length];
              int i = 0, j = 0, w = 0;
              while (i < A.length && j < B.length) {
                  out[w++] = (A[i] <= B[j]) ? A[i++] : B[j++];   // <= keeps it stable
              }
              while (i < A.length) out[w++] = A[i++];            // leftovers of A
              while (j < B.length) out[w++] = B[j++];            // leftovers of B
              return out;
          }`
      },
      {
        title: 'Absolute difference is the same question',
        html: `<p>"|a[i] - a[j]| = K" looks scarier, but after sorting every pair can be written as (smaller, bigger), so it becomes "bigger - smaller = K" — exactly the guided problem. Example [8, 12, 16, 4, 0, 20], K = 4 → sorted [0, 4, 8, 12, 16, 20] → pairs (0,4) (4,8) (8,12) (12,16) (16,20) = ${H.c('p', '5')}.</p>`
      }
    ],
    deepDive: `<h4>Why j never has to walk back: the "monotone partner" property</h4>
      <p>For a fixed <code>i</code>, let <code>p(i)</code> be the first index whose value is ≥ <code>a[i] + K</code>. Since the array is sorted, when <code>i</code> grows, <code>a[i] + K</code> grows, so <code>p(i)</code> can only move <b>right</b>. Any two-pointer algorithm where "the partner of the next element is never to the left of the partner of this element" runs in O(N) total — this single sentence is the real reason behind every same-direction two-pointer and sliding-window solution.</p>
      <h4>Three ways to solve "pairs with difference K"</h4>
      ${H.table(['method', 'time', 'extra memory', 'when to pick it'], [
        ['sort + two pointers', 'O(N log N)', 'O(1)', 'already sorted, or memory is tight'],
        ['sort + binary search for a[i] + K', 'O(N log N)', 'O(1)', 'easy to write; works for one-off lookups'],
        ['HashMap of counts', 'O(N) average', 'O(N)', 'unsorted, huge N, memory is fine']
      ])}
      <h4>Counting index pairs (not distinct values)</h4>
      <p>If the question counts <b>index</b> pairs (each copy counts), group equal values: for k &gt; 0 add <code>count(x) × count(x + k)</code>; for k = 0 add <code>c × (c - 1) / 2</code> per value. With pointers, measure the run length of equal values at i and at j and multiply. Results can reach N<sup>2</sup>/2 ≈ 5·10<sup>9</sup> → use <code>long</code>.</p>
      <p><b>Overflow corner:</b> <code>a[j] - a[i]</code> with values in ±2·10<sup>9</sup> overflows <code>int</code>; compute the difference in <code>long</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants usually answer this with the HashMap version. That is fine — but interviewers then ask "now do it in O(1) extra space" or "now count pairs with difference <b>at most</b> K", where the hash trick no longer fits and the sorted two-pointer walk is the clean answer.</p>
      <p><b>Use AI as a partner:</b> ask it to enumerate the ambiguous parts of the statement (distinct values or index pairs? can k be 0? negative k?) — great practice for clarifying questions. Ask for a brute-force checker over all pairs and fuzz with small values (0..4) so duplicates and k = 0 appear often.</p>
      <p><b>Where AI goes wrong:</b> counts the pair twice for k = 0 or lets an element pair with itself; uses opposite-direction pointers (which cannot decide which way to move); forgets to skip equal values and over-counts distinct pairs; overflows the difference.</p>
      <p><b>What you must still own:</b> the monotone-partner argument, choosing between pointers, binary search and hashing by constraints, and clarifying distinct vs index pairs before coding.</p>`,
    problems: [
      {
        title: 'Count Distinct Pairs with Difference K',
        level: 'Medium',
        tags: ['sorting', 'two pointers'],
        statement: `<p>Given an integer array <code>nums</code> and an integer <code>k ≥ 0</code>, return the number of <b>distinct</b> pairs of values <code>(x, y)</code> with <code>x ≤ y</code>, <code>y - x == k</code>, where <code>x</code> and <code>y</code> come from two <b>different positions</b> of the array. Pairs are counted by value: <code>(1, 3)</code> is counted once even if there are several 1s.</p>`,
        constraints: `1 ≤ N ≤ 10<sup>4</sup>, -10<sup>7</sup> ≤ nums[i] ≤ 10<sup>7</sup>, 0 ≤ k ≤ 10<sup>7</sup>`,
        example: `${H.arr([3, 1, 4, 1, 5], { label: 'nums' })}<p>k = 2 → Output: ${H.c('p', '2')}</p><p><b>Why:</b> the pairs are ${H.c('g', '(1, 3)')} and ${H.c('g', '(3, 5)')}. There are two 1s, but (1, 3) is the same pair of values, so it counts once. (4 has no partner 2 or 6.)</p>`,
        brute: {
          why: `<p>Check every pair <code>(i, j)</code> and put matching value-pairs into a HashSet to remove repeats: N<sup>2</sup>/2 = 5·10<sup>7</sup> checks for N = 10<sup>4</sup> — borderline, and hopeless at 10<sup>5</sup>. The waste: once the array is sorted, for a fixed <code>a[i]</code> the matching partner can only be further right, and later <code>i</code>s need partners even further right — so <code>j</code> never has to go back.</p>`,
          code: `
            int brute(int[] nums, int k) {
                Set<Long> seen = new HashSet<>();                 // encode pair (x, y) as one long
                for (int i = 0; i < nums.length; i++)
                    for (int j = 0; j < nums.length; j++)
                        if (i != j && (long) nums[j] - nums[i] == k)
                            seen.add((long) nums[i] * 100_000_000L + nums[j]);
                return seen.size();
            }`
        },
        mcq: {
          q: `Why not put L at the start and R at the end like in 2-Sum?`,
          options: [`Because the array is not sorted`, `Because a[R] - a[L] is the largest difference and moving either pointer only shrinks it, so you cannot choose a direction`, `Because it would be O(N log N)`, `It works the same way`],
          answer: 1,
          explain: `Two pointers need one move that increases the value and one that decreases it. For a difference, starting both at the left gives exactly that: j++ grows the gap, i++ shrinks it.`
        },
        hints: [
          `<p><b>Aha:</b> after sorting, <code>a[j] - a[i]</code> grows when <code>j</code> moves right and shrinks when <code>i</code> moves right. So there is always exactly one right move: gap too small → j++, too big → i++.</p>`,
          `<p>No extra structure: sort, then two indices <code>i = 0</code>, <code>j = 1</code> that only move forward, plus a counter. (Alternative: a HashMap of counts — for k = 0 count values seen ≥ 2 times; for k &gt; 0 count values x with x + k present.)</p>`,
          `<p><b>Traps:</b> (1) <code>i</code> must never equal <code>j</code> — if it catches up, push j forward; this is what makes <code>k = 0</code> work (the pair needs two copies). (2) After a match, skip <b>all</b> copies of a[i] so the same value-pair is not counted again. (3) Use <code>long</code> for the difference if values can be ±2·10<sup>9</sup>. <b>Recipe:</b> sort; while j &lt; n: if i == j → j++; else diff &lt; k → j++; diff &gt; k → i++; else count++, skip copies of a[i], if j ≤ i then j = i + 1.</p>`
        ],
        solution: {
          approach: `<p>Sort, then walk <code>i</code> (back) and <code>j</code> (front) forward, steering by the size of the gap.</p>`,
          code: `
            import java.util.*;

            class Solution {
                public int findPairs(int[] nums, int k) {
                    Arrays.sort(nums);                     // smallest to largest
                    int n = nums.length;
                    int i = 0, j = 1, count = 0;           // i = back walker, j = front walker
                    while (j < n) {
                        if (i == j) {                      // a pair needs two different positions
                            j++;
                            continue;
                        }
                        long diff = (long) nums[j] - nums[i];
                        if (diff < k) {
                            j++;                           // gap too small -> grow it
                        } else if (diff > k) {
                            i++;                           // gap too big -> shrink it
                        } else {
                            count++;                       // found pair (nums[i], nums[j])
                            int v = nums[i];
                            while (i < n && nums[i] == v) i++;   // skip copies of v: count pair once
                            if (j <= i) j = i + 1;         // keep j strictly ahead of i
                        }
                    }
                    return count;
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().findPairs(new int[]{3, 1, 4, 1, 5}, 2));        // 2
                    System.out.println(new Solution().findPairs(new int[]{1, 1, 1, 2, 2}, 0));        // 2
                }
            }`,
          dry: {
            head: ['i', 'j', 'a[i], a[j]', 'diff', 'vs k = 2', 'action', 'count'],
            rows: [
              ['0', '1', '1, 1', '0', H.c('b', 'small'), 'j = 2', '0'],
              ['0', '2', '1, 3', '2', H.c('g', 'equal'), 'skip both 1s → i = 2; j ≤ i → j = 3', '1'],
              ['2', '3', '3, 4', '1', H.c('b', 'small'), 'j = 4', '1'],
              ['2', '4', '3, 5', '2', H.c('g', 'equal'), 'i = 3 (j = 4 stays)', '2'],
              ['3', '4', '4, 5', '1', H.c('b', 'small'), 'j = 5 → loop ends', H.c('p', '2')]
            ]
          },
          complexity: `<p><b>Time O(N log N):</b> the sort dominates; the walk itself is O(N) because i and j each move forward at most N times. <b>Space O(1)</b> extra (apart from the sort's internal stack).</p>`
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 6 — Fixed-size sliding window
  // =====================================================================
  topics.push({
    title: 'Fixed-Size Sliding Window: Max Sum of a Subarray of Size K',
    analogy: `<p>You track your <b>steps for the last 7 days</b> on a fitness app. Each new morning you do <b>not</b> re-add all seven days from scratch. You just:</p>
      <ul>
        <li><b>add</b> today's steps (the new day entering the window), and</li>
        <li><b>subtract</b> the steps from 8 days ago (the old day falling out).</li>
      </ul>
      <p>Two quick operations per day, no matter how long the window is. Like looking out of a <b>train window</b> that always shows exactly K houses: one house slides in on the right, one slides out on the left.</p>`,
    explain: `<p>A <b>subarray</b> is a <b>contiguous</b> (side-by-side, no gaps) piece of the array. A <b>window of size K</b> is a subarray of exactly K elements. Question: which window of size K has the biggest sum?</p>
      <p><b>Slow way:</b> for each start, add up K numbers → about N × K additions. Notice the waste: neighbouring windows share K - 1 numbers, and we add them again every time.</p>
      <p><b>Sliding way:</b> compute the first window once, then slide one step at a time:</p>
      <p><b>new sum = old sum + (element entering on the right) - (element leaving on the left)</b></p>
      ${H.arr([2, 1, 5, 1, 3, 2], { label: 'a, K = 3', hl: { 2: 'b', 3: 'b', 4: 'b' }, ptr: { 2: 'start', 4: 'end' } })}
      ${H.table(['window (indices)', 'how we get its sum', 'sum', 'best'], [
        ['0..2 → [2, 1, 5]', 'first window: 2 + 1 + 5', '8', '8'],
        ['1..3 → [1, 5, 1]', '8 ' + H.c('g', '+ a[3]=1') + ' ' + H.c('r', '- a[0]=2'), '7', '8'],
        ['2..4 → [5, 1, 3]', '7 ' + H.c('g', '+ a[4]=3') + ' ' + H.c('r', '- a[1]=1'), H.c('p', '9'), H.c('p', '9')],
        ['3..5 → [1, 3, 2]', '9 ' + H.c('g', '+ a[5]=2') + ' ' + H.c('r', '- a[2]=5'), '6', '9']
      ])}
      <h4>The fixed-window template</h4>
      <p>When the right end is at index <code>i</code> (with <code>i ≥ K</code>), the element leaving is <code>a[i - K]</code>. Steps: (1) build the first window of K elements; (2) for <code>i = K .. N-1</code>: add <code>a[i]</code>, remove <code>a[i - K]</code>, update the answer.</p>
      <p>The same template answers "max <b>average</b> of K consecutive elements", "number of windows of size K with sum ≥ X", "first negative in every window of size K" (with a queue), and "max points from cards" (window of size N - K in the middle).</p>
      <p>Each element is added once and removed once → ${H.c('g', 'O(N)')} instead of O(N × K). Window size K is known in advance, so the window never needs to "decide" when to shrink.</p>`,
    clues: [
      '"<b>Subarray / substring of size K</b>", "<b>K consecutive</b> elements", "every window of length K" → fixed-size sliding window.',
      '"<b>Contiguous</b>" + a fixed length → never re-add the overlapping part; add the new one, drop the old one.',
      '"Maximum / minimum / average <b>sum of K consecutive</b> days / items" → keep a running window sum.',
      '<code>N ≤ 10<sup>5</sup></code>, <code>K</code> up to N → O(N·K) could be 10<sup>10</sup>; sliding makes it O(N).',
      'Hidden version: "take K items from the <b>two ends</b>" = leave a <b>middle</b> window of size N - K untouched.'
    ],
    code: `
      // Fixed-size window template: best sum among all windows of size k.
      long maxSumOfSizeK(int[] a, int k) {
          long window = 0;
          for (int i = 0; i < k; i++) window += a[i];   // first window a[0..k-1]
          long best = window;
          for (int i = k; i < a.length; i++) {
              window += a[i];          // element entering on the right
              window -= a[i - k];      // element leaving on the left
              best = Math.max(best, window);
          }
          return best;
      }`,
    codeTitle: 'Fixed-size sliding window template',
    viz: {
      title: 'Fixed window of size K: add the right, drop the left',
      input: '2 1 5 1 3 2 | 3',
      inputLabel: 'array | K',
      gen: function (input) {
        var p = parseArrK(input, 16, 'K', 1);
        var a = p.a, k = p.k, n = a.length, frames = [];
        if (k < 1 || k > n) throw new Error('K must be between 1 and the number of elements (' + n + ').');
        var win = 0, i;
        for (i = 0; i < k; i++) {
          win += a[i];
          frames.push({
            narr: 'Building the <b>first</b> window: add a[' + i + '] = ' + a[i] + ' → window sum = <b>' + win + '</b>' + (i === k - 1 ? '. The first window (indices 0..' + (k - 1) + ') is ready.' : ' (need ' + k + ' elements).'),
            parts: [
              { type: 'array', label: 'a', values: a.slice(), range: [0, i], ptr: ptrMap([[i, 'i']]), hl: hlMap([[i, 'ok']]) },
              { type: 'vars', label: 'state', vals: { K: k, 'window sum': win }, hl: { 'window sum': 'cur' } }
            ]
          });
        }
        var best = win, bestS = 0;
        frames.push({
          narr: 'First window sum is ' + win + ', so <b>best = ' + best + '</b> for now. From here on the window keeps its size: each step one element <span class="c-g">enters</span> and one <span class="c-r">leaves</span>.',
          parts: [
            { type: 'array', label: 'a', values: a.slice(), range: [0, k - 1], ptr: ptrMap([[0, 'start'], [k - 1, 'end']]) },
            { type: 'vars', label: 'state', vals: { K: k, 'window sum': win, best: best }, hl: { best: 'sel' } }
          ]
        });
        for (i = k; i < n; i++) {
          var add = a[i], drop = a[i - k];
          win += add - drop;
          var improved = win > best;
          if (improved) { best = win; bestS = i - k + 1; }
          frames.push({
            narr: 'Slide right: <span class="c-g">+ a[' + i + '] = ' + add + '</span> enters, <span class="c-r">- a[' + (i - k) + '] = ' + drop + '</span> leaves. Window ' + (i - k + 1) + '..' + i + ' sum = ' + (win - add + drop) + ' + ' + add + ' - ' + drop + ' = <b>' + win + '</b>' + (improved ? ' → <span class="c-g">new best!</span>' : ' (best stays ' + best + ')') + '. Only 2 operations, not ' + k + '.',
            parts: [
              { type: 'array', label: 'a', values: a.slice(), range: [i - k + 1, i], ptr: ptrMap([[i - k + 1, 'start'], [i, 'end']]), hl: hlMap([[i, 'ok'], [i - k, 'bad']]) },
              { type: 'vars', label: 'state', vals: { K: k, entering: add, leaving: drop, 'window sum': win, best: best }, hl: improved ? { best: 'ok' } : { 'window sum': 'cur' } }
            ]
          });
        }
        var fh = {};
        for (i = bestS; i < bestS + k; i++) fh[i] = 'sel';
        frames.push({
          narr: 'The window reached the end. Best window is indices <b>' + bestS + '..' + (bestS + k - 1) + '</b> = [' + a.slice(bestS, bestS + k).join(', ') + '] with sum <span class="c-p"><b>' + best + '</b></span>. Every element entered once and left once → O(N).',
          parts: [
            { type: 'array', label: 'a', values: a.slice(), hl: fh },
            { type: 'vars', label: 'answer', vals: { best: best }, hl: { best: 'sel' } }
          ]
        });
        while (frames.length < 4) frames.push({ narr: 'Only one window fits, so there was nothing to slide. Try a longer array or a smaller K.', parts: [{ type: 'array', label: 'a', values: a.slice() }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Maximum average of K consecutive numbers — compare sums, divide once',
        html: `<p>a = [1, 12, -5, -6, 50, 3], K = 4.</p>
          ${H.table(['window', 'sum', 'best sum'], [
            ['[1, 12, -5, -6]', '2', '2'],
            ['[12, -5, -6, 50]', '2 + 50 - 1 = 51', H.c('p', '51')],
            ['[-5, -6, 50, 3]', '51 + 3 - 12 = 42', '51']
          ])}
          <p>Answer 51 / 4 = ${H.c('p', '12.75')}. Since K is the same for every window, the biggest sum is also the biggest average — divide <b>once</b> at the end (fewer floating-point errors, faster).</p>`
      },
      {
        title: 'Count windows that pass a test',
        html: `<p>a = [2, 2, 2, 2, 5, 5, 5, 8], K = 3, "average ≥ 4" ⇔ "sum ≥ 12". Window sums slide as 6, 6, 9, 12, 15, 18 → ${H.c('p', '3')} windows pass. Turning an average condition into a sum condition (multiply both sides by K) keeps everything in integers.</p>`
      },
      {
        title: 'First negative number in every window (window + queue)',
        html: `<p>a = [-8, 2, 3, -6, 10], K = 2 → answers ${H.c('p', '-8, 0, -6, -6')} (0 = no negative). A sum is not enough here; we keep a <b>queue of indices of negatives</b> inside the window. New negative → add to the back; front index fell out of the window → remove it from the front. The answer for each window is the front of the queue.</p>`,
        code: `
          int[] firstNegative(int[] a, int k) {
              int n = a.length;
              int[] out = new int[n - k + 1];
              ArrayDeque<Integer> neg = new ArrayDeque<>();      // indices of negatives in the window
              for (int i = 0; i < n; i++) {
                  if (a[i] < 0) neg.addLast(i);                   // entering element
                  if (!neg.isEmpty() && neg.peekFirst() <= i - k) neg.pollFirst();   // left the window
                  if (i >= k - 1) out[i - k + 1] = neg.isEmpty() ? 0 : a[neg.peekFirst()];
              }
              return out;
          }`
      },
      {
        title: 'Fixed window on a string: most vowels in any K letters',
        html: `<p>s = "abciiidef", K = 3. Keep a running count of vowels: add 1 if the entering letter is a vowel, subtract 1 if the leaving letter is. Windows: abc 1, bci 1, cii 2, ${H.c('p', 'iii 3')}, iid 2, ide 2, def 1 → answer ${H.c('p', '3')}.</p>`,
        code: {
          lang: 'python', run: true, title: 'Runnable: max vowels in a window of size k',
          code: `def max_vowels(s, k):
    vowels = set("aeiou")
    count = sum(1 for c in s[:k] if c in vowels)   # first window
    best = count
    for i in range(k, len(s)):
        count += s[i] in vowels          # entering letter (True counts as 1)
        count -= s[i - k] in vowels      # leaving letter
        best = max(best, count)
    return best

print(max_vowels("abciiidef", 3))   # 3
print(max_vowels("leetcode", 3))    # 2`
        }
      }
    ],
    deepDive: `<h4>Which window values can be updated in O(1)?</h4>
      <p>The add-new / remove-old trick needs an operation you can <b>undo</b>: sum (subtract), count (decrement), XOR (XOR again), product of non-zero numbers (divide), a frequency array (decrement a slot). <b>Max and min cannot be undone</b> — when the current maximum leaves, you do not know the next one. For those you need a <b>monotonic deque</b> (Stacks &amp; Queues module, "sliding window maximum") or the two-stack queue trick, still O(N) overall.</p>
      <h4>Prefix sums vs sliding window</h4>
      <p>With a prefix array <code>pf</code>, any window sum is <code>pf[i+1] - pf[i+1-K]</code> — also O(N), but O(N) extra memory. The sliding sum uses O(1) memory and works on a <b>stream</b> where you cannot store everything. Prefix sums win when you must answer many different K values or arbitrary ranges.</p>
      <h4>Production reality: windows on streams</h4>
      <ul>
        <li>"Requests in the last 60 seconds", "7-day moving average", rate limiters and monitoring dashboards keep a <b>ring buffer</b> of K slots plus a running total — exactly this template, with the leaving value read from the slot about to be overwritten.</li>
        <li>Stream processors (Kafka Streams, Flink) distinguish <b>tumbling</b> windows (back-to-back, no overlap), <b>hopping</b> windows (overlap by a step) and <b>sliding</b> windows; overlapping windows are computed incrementally for the same reason as here.</li>
        <li>Floating-point running sums drift after millions of add/subtract steps; production code periodically recomputes the sum or uses integers (e.g. cents, milliseconds).</li>
      </ul>
      <p><b>Edge cases:</b> K = N (one window), K = 1 (the max element), all negative values (best must start from the first window, not 0), K &gt; N (invalid — clarify).</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants write the fixed window correctly almost every time. Interview value shifts to <b>recognising disguised fixed windows</b> ("take K cards from either end" = leave a middle window of N - K) and knowing when an aggregate cannot be undone (max/min) so a plain running variable is not enough.</p>
      <p><b>Use AI as a partner:</b> ask <code>Here is a problem statement — is the window size fixed, and what is the invertible aggregate?</code>; ask it to build a ring-buffer moving-average class and then review it for floating-point drift; generate random tests that compare your O(N) code with the O(N·K) brute force.</p>
      <p><b>Where AI goes wrong:</b> initialises <code>best = 0</code> (fails on all-negative arrays); uses an off-by-one leaving index (<code>a[i - k + 1]</code> instead of <code>a[i - k]</code>); divides by K inside the loop and compares doubles; tries to "subtract" a maximum when the window slides.</p>
      <p><b>What you must still own:</b> the invertible-aggregate test, the index arithmetic of the window (<code>[i-K+1, i]</code>), and spotting fixed windows hidden behind different wording.</p>`,
    problems: [
      {
        title: 'Maximum Sum Subarray of Size K',
        level: 'Easy',
        tags: ['sliding window', 'fixed size'],
        statement: `<p>Given an integer array <code>a</code> of size <code>N</code> and an integer <code>K</code>, return the <b>maximum sum</b> of any contiguous subarray of exactly <code>K</code> elements.</p>`,
        constraints: `1 ≤ K ≤ N ≤ 10<sup>5</sup>, -10<sup>4</sup> ≤ a[i] ≤ 10<sup>4</sup>`,
        example: `${H.arr([2, 1, 5, 1, 3, 2], { label: 'a', hl: { 2: 'p', 3: 'p', 4: 'p' } })}<p>K = 3 → Output: ${H.c('p', '9')}</p><p><b>Why:</b> the windows of size 3 are [2,1,5] = 8, [1,5,1] = 7, ${H.c('p', '[5,1,3] = 9')}, [1,3,2] = 6. The largest is 9.</p>`,
        brute: {
          why: `<p>For each of the N - K + 1 starting points, add up K numbers: O(N·K). With N = 10<sup>5</sup> and K = 5·10<sup>4</sup> that is 2.5·10<sup>9</sup> additions → TLE. The waste: windows that start one step apart share K - 1 numbers, and we keep adding those same numbers again.</p>`,
          code: `
            long brute(int[] a, int k) {
                long best = Long.MIN_VALUE;
                for (int s = 0; s + k <= a.length; s++) {
                    long sum = 0;
                    for (int j = s; j < s + k; j++) sum += a[j];   // re-adds the overlap every time
                    best = Math.max(best, sum);
                }
                return best;
            }`
        },
        mcq: {
          q: `The window [4, 7, 1] has sum 12. It slides one step right and 6 enters. What is the new sum?`,
          options: [`12 + 6 = 18`, `12 + 6 - 4 = 14`, `12 - 6 + 4 = 10`, `7 + 1 + 6 + 4 = 18`],
          answer: 1,
          explain: `6 enters on the right and 4 (the leftmost) leaves: 12 + 6 - 4 = 14, which is 7 + 1 + 6.`
        },
        hints: [
          `<p><b>Aha:</b> <code>sum(s+1 .. s+K) = sum(s .. s+K-1) + a[s+K] - a[s]</code>. One add and one subtract turn each window into the next.</p>`,
          `<p>Just one running variable <code>window</code> plus <code>best</code>. The right end <code>i</code> runs from K to N-1; the element leaving is <code>a[i - K]</code>.</p>`,
          `<p><b>Traps:</b> initialize <code>best</code> with the <b>first window's sum</b>, not 0 (all numbers may be negative); remember the first window must be built before sliding; use <code>long</code> if values can be large. <b>Recipe:</b> window = sum of a[0..K-1]; best = window; for i = K..N-1: window += a[i] - a[i-K]; best = max(best, window).</p>`
        ],
        solution: {
          approach: `<p>Build the first window, then slide: add the entering element, subtract the leaving one, track the maximum.</p>`,
          code: `
            class Solution {
                public long maxSumSubarrayOfSizeK(int[] a, int k) {
                    long window = 0;
                    for (int i = 0; i < k; i++) {
                        window += a[i];                 // first window: a[0..k-1]
                    }
                    long best = window;                 // NOT 0: all numbers could be negative
                    for (int i = k; i < a.length; i++) {
                        window += a[i];                 // a[i] enters on the right
                        window -= a[i - k];             // a[i-k] leaves on the left
                        best = Math.max(best, window);  // window now covers a[i-k+1 .. i]
                    }
                    return best;
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().maxSumSubarrayOfSizeK(new int[]{2, 1, 5, 1, 3, 2}, 3));   // 9
                }
            }`,
          dry: {
            head: ['i', 'enters a[i]', 'leaves a[i-K]', 'window covers', 'window sum', 'best'],
            rows: [
              ['0..2', '2, 1, 5', '—', '0..2', '8', '8'],
              ['3', H.c('g', '1'), H.c('r', 'a[0] = 2'), '1..3', '8 + 1 - 2 = 7', '8'],
              ['4', H.c('g', '3'), H.c('r', 'a[1] = 1'), '2..4', '7 + 3 - 1 = 9', H.c('p', '9')],
              ['5', H.c('g', '2'), H.c('r', 'a[2] = 5'), '3..5', '9 + 2 - 5 = 6', '9']
            ]
          },
          complexity: `<p><b>Time O(N):</b> K additions for the first window, then 2 operations for each of the remaining N - K steps → about N + N operations. <b>Space O(1):</b> two variables.</p>`
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 7 — Variable-size sliding window (grow / shrink)
  // =====================================================================
  topics.push({
    title: 'Variable-Size Sliding Window: Smallest Subarray with Sum ≥ K (Grow / Shrink Template)',
    analogy: `<p>Think of a <b>caterpillar</b> crawling along a branch of numbers.</p>
      <ul>
        <li>Its <b>head</b> (right end) stretches forward, eating one number at a time, until its belly holds <b>enough</b> (sum ≥ K).</li>
        <li>Then its <b>tail</b> (left end) pulls in, letting go of numbers from the back, <b>as long as it still has enough</b>. Each time it is "full enough", we measure how short it is.</li>
      </ul>
      <p>The head only goes forward, the tail only goes forward. Neither ever goes back, so the caterpillar crosses the branch in one trip. Same feeling as packing a shopping bag until it weighs ≥ 5 kg, then taking items out from the bottom while it is still ≥ 5 kg, to find the smallest bag that is heavy enough.</p>`,
    explain: `<p>Here the window size is <b>not given</b> — we are searching for it. The window is <code>a[L..R]</code>:</p>
      <ul>
        <li><b>Grow:</b> move <code>R</code> right and add <code>a[R]</code> to the sum.</li>
        <li><b>Shrink:</b> while the window is "good" (sum ≥ K), record its length, then remove <code>a[L]</code> and move <code>L</code> right.</li>
      </ul>
      <p>Example: smallest window with sum ≥ ${H.c('p', '7')} in</p>
      ${H.arr([2, 3, 1, 2, 4, 3], { label: 'a', hl: { 4: 'p', 5: 'p' } })}
      ${H.table(['R (grow)', 'window sum', 'shrinking while sum ≥ 7', 'best length'], [
        ['0', '2', '—', '∞'],
        ['1', '5', '—', '∞'],
        ['2', '6', '—', '∞'],
        ['3', '8', 'len 4 [2,3,1,2] → drop 2 → sum 6', '4'],
        ['4', '10', 'len 4 → drop 3 → 7; len 3 [1,2,4] → drop 1 → 6', '3'],
        ['5', '9', 'len 3 → drop 2 → 7; len 2 ' + H.c('p', '[4,3]') + ' → drop 4 → 3', H.c('p', '2')]
      ])}
      <h4>Why may we throw away the left element for good?</h4>
      <p>All numbers are <b>positive</b>. When <code>a[L..R]</code> already has sum ≥ K, any longer window that starts at L (ending further right) is <b>longer</b> — never a better "smallest" answer. So L is finished; drop it. And while the sum is &lt; K, shrinking would only make it smaller, so we must grow.</p>
      <p>${H.c('r', 'Warning:')} this needs <b>non-negative</b> numbers. With negatives, adding an element can <b>decrease</b> the sum and dropping one can <b>increase</b> it, so "grow until good, shrink while good" breaks. For negatives use prefix sums (+ a deque or a HashMap, see other modules).</p>
      <h4>The general grow/shrink template — two flavours</h4>
      ${H.table(['you want…', 'loop shape', 'where you record the answer'], [
        ['<b>shortest</b> good window (sum ≥ K, contains all...)', 'for R: add a[R]; <b>while (good)</b> { record; remove a[L]; L++ }', 'inside the while (window is good)'],
        ['<b>longest</b> good window (at most K zeros, sum ≤ K, ...)', 'for R: add a[R]; <b>while (bad)</b> { remove a[L]; L++ }; record', 'after the while (window is good again)'],
        ['<b>count</b> windows with property "at most K"', 'same as longest; then add <code>R - L + 1</code>', 'every R: all windows ending at R starting ≥ L are good']
      ])}
      <p>Cost: R moves N times, L moves at most N times in total (not per R!). Each element is added once and removed at most once → ${H.c('g', 'at most 2N steps = O(N)')}, even though there is a <code>while</code> inside a <code>for</code>.</p>`,
    clues: [
      '"<b>Smallest / shortest</b> subarray with sum ≥ K" or "<b>longest</b> subarray with sum ≤ K" → variable window (grow / shrink).',
      '"<b>Positive numbers only</b>" / "non-negative" → sums only grow when you extend and shrink when you cut → the window trick is valid.',
      '"<b>At most K</b>" (zeros, flips, distinct, product &lt; K) → longest-window flavour; "exactly K" = atMost(K) - atMost(K - 1).',
      '"<b>Contiguous</b> subarray" + "minimum length" / "maximum length" → never fix the size; let the window find it.',
      'Array has <b>negative</b> numbers → this template is NOT safe; switch to prefix sums.'
    ],
    code: [`
      // Flavour 1: SHORTEST window that is good (here: sum >= target, positive numbers)
      int shortestGood(int[] a, int target) {
          int L = 0, best = Integer.MAX_VALUE;
          long sum = 0;
          for (int R = 0; R < a.length; R++) {
              sum += a[R];                         // grow: take a[R] in
              while (sum >= target) {              // window is good -> try to make it shorter
                  best = Math.min(best, R - L + 1);
                  sum -= a[L];                     // shrink: let a[L] go
                  L++;
              }
          }
          return best == Integer.MAX_VALUE ? 0 : best;
      }`, `
      // Flavour 2: LONGEST window that is good (here: sum <= limit, non-negative numbers)
      int longestGood(int[] a, int limit) {
          int L = 0, best = 0;
          long sum = 0;
          for (int R = 0; R < a.length; R++) {
              sum += a[R];                         // grow
              while (sum > limit) {                // window is bad -> shrink until good again
                  sum -= a[L];
                  L++;
              }
              best = Math.max(best, R - L + 1);    // window a[L..R] is good here
          }
          return best;
      }`],
    codeTitle: ['Template: shortest good window (shrink WHILE good)', 'Template: longest good window (shrink WHILE bad)'],
    viz: [{
      title: 'Variable window: grow until sum ≥ K, then shrink while it still holds',
      input: '2 3 1 2 4 3 | 7',
      inputLabel: 'positive numbers | K',
      gen: function (input) {
        var p = parseArrK(input, 16, 'K', 1);
        var a = p.a, K = p.k, n = a.length, frames = [];
        if (a.some(function (x) { return x <= 0; })) throw new Error('Use positive numbers only: the grow/shrink trick relies on sums going up when you add and down when you remove.');
        if (K <= 0) throw new Error('K must be a positive number.');
        var L = 0, sum = 0, best = Infinity, bestL = -1, bestR = -1;
        frames.push({
          narr: 'Window is empty (L = 0, nothing taken). Goal: the <b>shortest</b> stretch with sum ≥ <b>' + K + '</b>. The right end R will grow the window; the left end L will shrink it.',
          parts: [
            { type: 'array', label: 'a', values: a.slice(), ptr: ptrMap([[0, 'L']]) },
            { type: 'vars', label: 'state', vals: { L: 0, sum: 0, K: K, best: '∞' } }
          ]
        });
        for (var R = 0; R < n; R++) {
          sum += a[R];
          frames.push({
            narr: '<b>Grow:</b> R = ' + R + ', take in a[' + R + '] = ' + a[R] + ' → sum = <b>' + sum + '</b>. ' + (sum >= K ? 'That is ≥ ' + K + ', the window is <span class="c-g">good</span> → now try shrinking.' : 'Still <span class="c-b">below ' + K + '</span> → keep growing.'),
            parts: [
              { type: 'array', label: 'a', values: a.slice(), range: [L, R], ptr: ptrMap([[L, 'L'], [R, 'R']]), hl: hlMap([[R, 'ok']]) },
              { type: 'vars', label: 'state', vals: { L: L, R: R, sum: sum, K: K, best: best === Infinity ? '∞' : best }, hl: { sum: sum >= K ? 'ok' : 'cur' } }
            ]
          });
          while (sum >= K) {
            var len = R - L + 1, improved = len < best;
            if (improved) { best = len; bestL = L; bestR = R; }
            var leaving = a[L];
            sum -= leaving;
            frames.push({
              narr: 'Window ' + L + '..' + R + ' has length <b>' + len + '</b> and is good' + (improved ? ' → <span class="c-g">new best = ' + len + '</span>' : ' (best stays ' + best + ')') + '. <b>Shrink:</b> let a[' + L + '] = ' + leaving + ' go → sum = <b>' + sum + '</b>' + (sum >= K ? ', still ≥ ' + K + ', keep shrinking.' : ', now below ' + K + ', so stop shrinking and grow again.'),
              parts: [
                { type: 'array', label: 'a', values: a.slice(), range: [L, R], ptr: ptrMap([[L, 'L'], [R, 'R']]), hl: hlMap([[L, 'bad']]) },
                { type: 'vars', label: 'state', vals: { L: L + 1, R: R, sum: sum, K: K, best: best }, hl: improved ? { best: 'ok' } : { sum: 'cur' } }
              ]
            });
            L++;
          }
        }
        var fh = {};
        if (bestL >= 0) for (var q = bestL; q <= bestR; q++) fh[q] = 'sel';
        frames.push({
          narr: R === n && bestL >= 0
            ? 'R reached the end. Shortest window with sum ≥ ' + K + ' is indices <b>' + bestL + '..' + bestR + '</b> = [' + a.slice(bestL, bestR + 1).join(', ') + '], length <span class="c-p"><b>' + best + '</b></span>. L and R each moved at most N times → O(N).'
            : 'R reached the end and the window was never good: even the whole array sums to less than ' + K + '. Answer: <span class="c-r">0</span> (no such subarray).',
          parts: [
            { type: 'array', label: 'a', values: a.slice(), hl: fh },
            { type: 'vars', label: 'answer', vals: { length: bestL >= 0 ? best : 0 }, hl: { length: 'sel' } }
          ]
        });
        while (frames.length < 4) frames.push({ narr: 'Short input: add more numbers to see the window grow and shrink.', parts: [{ type: 'array', label: 'a', values: a.slice() }] });
        return frames;
      }
    },
    {
      title: 'Longest flavour: longest stretch of 1s if you may flip at most K zeros',
      input: '1 1 1 0 0 0 1 1 1 1 0 | 2',
      inputLabel: '0/1 values | K (zeros you may flip)',
      gen: function (input) {
        var p = parseArrK(input, 20, 'K', 1);
        var a = p.a, K = p.k, n = a.length, frames = [];
        if (a.some(function (x) { return x !== 0 && x !== 1; })) throw new Error('Use only 0s and 1s, then | and K, for example: 1 0 1 1 0 | 1');
        if (K < 0) throw new Error('K must be 0 or more.');
        var L = 0, zeros = 0, best = 0, bestL = 0, bestR = -1;
        function zeroHl(lo, hi, extra) {
          var h = {};
          for (var q = lo; q <= hi; q++) if (a[q] === 0) h[q] = 'y';
          (extra || []).forEach(function (e) { h[e[0]] = e[1]; });
          return h;
        }
        frames.push({
          narr: 'Goal: the <b>longest</b> window that is <b>good</b> = contains at most <b>' + K + '</b> zero(s) (we may flip that many zeros into 1s). Here we shrink <b>while the window is bad</b> and record the length <b>after</b> shrinking.',
          parts: [
            { type: 'array', label: 'a', values: a.slice(), ptr: ptrMap([[0, 'L']]) },
            { type: 'vars', label: 'state', vals: { L: 0, zeros: 0, K: K, best: 0 } }
          ]
        });
        for (var R = 0; R < n; R++) {
          if (a[R] === 0) zeros++;
          var bad = zeros > K;
          frames.push({
            narr: '<b>Grow:</b> R = ' + R + ' takes in a ' + a[R] + (a[R] === 0 ? ' (zeros in window = ' + zeros + ')' : '') + '. ' + (bad ? 'Now ' + zeros + ' &gt; ' + K + ' zeros → window is <span class="c-r">bad</span>, shrink from the left.' : 'Window still <span class="c-g">good</span> (' + zeros + ' ≤ ' + K + ' zeros).'),
            parts: [
              { type: 'array', label: 'a (amber = zeros we would flip)', values: a.slice(), range: [L, R], ptr: ptrMap([[L, 'L'], [R, 'R']]), hl: zeroHl(L, R, [[R, bad ? 'bad' : 'ok']]) },
              { type: 'vars', label: 'state', vals: { L: L, R: R, zeros: zeros, K: K, best: best }, hl: { zeros: bad ? 'bad' : 'cur' } }
            ]
          });
          while (zeros > K) {
            var out = a[L];
            if (out === 0) zeros--;
            L++;
            frames.push({
              narr: '<b>Shrink:</b> drop a[' + (L - 1) + '] = ' + out + (out === 0 ? ' → zeros = ' + zeros + (zeros > K ? ', still too many, keep shrinking.' : ', window is good again.') : ' (a 1, zeros unchanged) → keep shrinking.'),
              parts: [
                { type: 'array', label: 'a', values: a.slice(), range: [L, R], ptr: ptrMap([[L, 'L'], [R, 'R']]), hl: zeroHl(L, R, [[L - 1, 'done']]) },
                { type: 'vars', label: 'state', vals: { L: L, R: R, zeros: zeros, K: K, best: best }, hl: { zeros: zeros > K ? 'bad' : 'ok' } }
              ]
            });
          }
          var len = R - L + 1;
          if (len > best) {
            best = len; bestL = L; bestR = R;
            frames.push({
              narr: 'Window ' + L + '..' + R + ' is good with length <b>' + len + '</b> → <span class="c-g">new best</span>.',
              parts: [
                { type: 'array', label: 'a', values: a.slice(), range: [L, R], ptr: ptrMap([[L, 'L'], [R, 'R']]), hl: zeroHl(L, R) },
                { type: 'vars', label: 'state', vals: { L: L, R: R, zeros: zeros, K: K, best: best }, hl: { best: 'ok' } }
              ]
            });
          }
        }
        var fh = {};
        for (var q = bestL; q <= bestR; q++) fh[q] = 'sel';
        frames.push({
          narr: best === 0 ? 'Done. Every window broke the rule (all zeros and K = 0), so the answer is <span class="c-r"><b>0</b></span>.' : 'Done. Longest good window: indices <b>' + bestL + '..' + bestR + '</b>, length <span class="c-p"><b>' + best + '</b></span>. Flipping its zeros gives the longest run of 1s. Again L and R each moved at most N times → O(N).',
          parts: [
            { type: 'array', label: 'a', values: a.slice(), hl: fh },
            { type: 'vars', label: 'answer', vals: { longest: best }, hl: { longest: 'sel' } }
          ]
        });
        while (frames.length < 4) frames.push({ narr: 'Short input: add more 0s and 1s to see the window move.', parts: [{ type: 'array', label: 'a', values: a.slice() }] });
        return frames;
      }
    }
    ],
    examples: [
      {
        title: 'No window is ever good',
        html: `<p>a = [1, 1, 1], K = 10. R grows to the end, the sum peaks at 3 &lt; 10, the shrink loop never runs, <code>best</code> stays "infinity" → return ${H.c('r', '0')}. Always decide up front what "not found" returns (0, -1, empty) — interviewers check it.</p>`
      },
      {
        title: 'Longest flavour: longest subarray with sum ≤ 8',
        html: `<p>a = [3, 1, 2, 7, 4, 2, 1, 1, 5], limit = 8. Shrink <b>while bad</b> (sum &gt; 8), record <b>after</b>.</p>
          ${H.table(['R', 'sum after grow', 'shrink while &gt; 8', 'window', 'len', 'best'], [
            ['0..2', '3, 4, 6', '—', '[3,1,2]', '3', '3'],
            ['3', '13', 'drop 3 → 10, drop 1 → 9, drop 2 → 7', '[7]', '1', '3'],
            ['4', '11', 'drop 7 → 4', '[4]', '1', '3'],
            ['5..7', '6, 7, 8', '—', H.c('p', '[4,2,1,1]'), '4', H.c('p', '4')],
            ['8', '13', 'drop 4 → 9, drop 2 → 7', '[1,1,5]', '3', '4']
          ])}`
      },
      {
        title: 'Count flavour: how many subarrays have sum ≤ S?',
        html: `<p>a = [1, 2, 3], S = 3. After shrinking, the window [L, R] is good, and so is every window that ends at R and starts anywhere in L..R (they are shorter, so their sum is smaller). That is <code>R - L + 1</code> new subarrays.</p>
          ${H.table(['R', 'window after shrink', 'added', 'total'], [
            ['0', '[1]', '1 → [1]', '1'],
            ['1', '[1, 2]', '2 → [2], [1,2]', '3'],
            ['2', '[3] (dropped 1 and 2)', '1 → [3]', H.c('p', '4')]
          ])}`,
        code: `
          long countSumAtMost(int[] a, long S) {       // positive numbers
              long count = 0, sum = 0;
              int L = 0;
              for (int R = 0; R < a.length; R++) {
                  sum += a[R];
                  while (sum > S) sum -= a[L++];       // shrink while bad
                  count += R - L + 1;                  // all good windows ending at R
              }
              return count;
          }`
      },
      {
        title: '"Exactly K" = atMost(K) − atMost(K − 1)',
        html: `<p>Binary array [1, 0, 1, 0, 1], count subarrays whose sum is <b>exactly</b> 2. A window cannot directly count "exactly" (shrinking or growing may jump over it), but it can count "at most": atMost(2) = 14 (all 15 subarrays except the whole array), atMost(1) = 10. Answer ${H.c('p', '14 − 10 = 4')}: [1,0,1], [1,0,1,0], [0,1,0,1], [1,0,1] (the last one starting at index 2).</p>`
      },
      {
        title: 'Why negatives break the caterpillar',
        html: `<p>a = [1, -1, 5], K = 5 (smallest window with sum ≥ 5). The window grows to the whole array (sum 5), records length 3, drops the 1 → sum 4 &lt; 5 and stops shrinking. It never discovers that ${H.c('g', '[5] alone has length 1')} — because dropping the <b>-1</b> would have <b>raised</b> the sum. ${H.c('r', 'Wrong answer 3.')} Fix: prefix sums + a monotonic deque (practice arena, Hard).</p>`
      }
    ],
    deepDive: `<h4>The real requirement: monotone "goodness"</h4>
      <p>The template is correct whenever goodness is <b>monotone</b> in window size:</p>
      <ul>
        <li><b>Shortest flavour:</b> if [L, R] is good, every bigger window containing it is good too (sum ≥ K with positives, "contains all required letters").</li>
        <li><b>Longest / count flavour:</b> if [L, R] is good, every smaller window inside it is good too (sum ≤ S with non-negatives, "at most K zeros", "at most K distinct", product &lt; K with positives).</li>
      </ul>
      <p>Negative numbers (sums) or zeros (products) break monotonicity, and the window gives wrong answers. Then use prefix sums: with a HashMap for "sum exactly K" (Hashing module) or with a monotonic deque for "shortest sum ≥ K" (LeetCode 862).</p>
      <h4>Amortised O(N) — counted honestly</h4>
      <p>Every index is added once (when R reaches it) and removed at most once (when L passes it). So the total work of all inner <code>while</code> loops together is ≤ N, giving ≤ 2N steps. This "charge each element at most twice" argument is called <b>amortised analysis</b>.</p>
      <h4>Expert tricks</h4>
      <ul>
        <li><b>Non-shrinking window</b> for "longest": replace the inner <code>while</code> by <code>if</code>. The window never shrinks; it just slides when bad and grows when good. Its final size <code>N - L</code> is the answer. Same O(N), simpler code, popular in competitive programming.</li>
        <li><b>Binary search on the length</b> (is there a good window of length m?) is an O(N log N) alternative that also works when you only have a fixed-window check — useful when the window cannot shrink cleanly.</li>
        <li>Store the answer's <b>position</b> (bestL, bestR), not only its length, if the question asks for the subarray itself.</li>
      </ul>`,
    aiEra: `<p><b>What AI changes:</b> assistants recognise "minimum size subarray sum" instantly, but they very often apply the same template to arrays with <b>negative numbers</b>, where it silently fails. Checking the monotonicity condition is the human skill that matters now.</p>
      <p><b>Use AI as a partner:</b> ask <code>Is goodness monotone for this condition? Give a counterexample if not</code>; ask it to write the brute-force O(N<sup>2</sup>) version and a random tester that <b>includes negative numbers</b> — watch the window version fail and understand why; ask it to convert your "exactly K" brute force into atMost(K) − atMost(K − 1).</p>
      <p><b>Where AI goes wrong:</b> records the answer in the wrong place (inside vs after the shrink loop), mixes the shortest and longest flavours, returns <code>Integer.MAX_VALUE</code> instead of 0 when nothing is found, uses <code>if</code> where <code>while</code> is needed for the shortest flavour, and calls the nested loops O(N<sup>2</sup>).</p>
      <p><b>What you must still own:</b> the two flavours and where to record, the monotone-goodness test, the amortised O(N) argument, and the fallback (prefix sums) when the test fails.</p>`,
    problems: [
      {
        title: 'Smallest Subarray with Sum ≥ K',
        level: 'Medium',
        tags: ['sliding window', 'variable size'],
        statement: `<p>Given an array of <b>positive</b> integers <code>a</code> and a positive integer <code>K</code>, return the <b>minimal length</b> of a contiguous subarray whose sum is <b>greater than or equal to</b> <code>K</code>. If there is no such subarray, return <code>0</code>.</p>`,
        constraints: `1 ≤ N ≤ 10<sup>5</sup>, 1 ≤ a[i] ≤ 10<sup>4</sup>, 1 ≤ K ≤ 10<sup>9</sup>`,
        example: `${H.arr([2, 3, 1, 2, 4, 3], { label: 'a', hl: { 4: 'p', 5: 'p' } })}<p>K = 7 → Output: ${H.c('p', '2')}</p><p><b>Why:</b> ${H.c('p', '[4, 3]')} sums to 7 ≥ 7 with only 2 elements. No single element reaches 7 (the biggest is 4), so length 1 is impossible.</p>`,
        brute: {
          why: `<p>For every start <code>i</code>, extend <code>j</code> until the sum reaches K and record <code>j - i + 1</code>. Worst case O(N<sup>2</sup>) = 10<sup>10</sup> for N = 10<sup>5</sup>. The waste: when we move to start <code>i + 1</code>, we throw away the sum we built and re-add almost the same elements; we also re-scan positions <code>j</code> we already know were not enough.</p>`,
          code: `
            int brute(int[] a, int k) {
                int best = Integer.MAX_VALUE;
                for (int i = 0; i < a.length; i++) {
                    long sum = 0;
                    for (int j = i; j < a.length; j++) {
                        sum += a[j];
                        if (sum >= k) {                       // first time it's enough for this start
                            best = Math.min(best, j - i + 1);
                            break;                            // longer windows from i are worse
                        }
                    }
                }
                return best == Integer.MAX_VALUE ? 0 : best;
            }`
        },
        mcq: {
          q: `Window a[L..R] already has sum ≥ K. Why is it safe to remove a[L] and never look at windows starting at L again?`,
          options: [`Because a[L] is the smallest element`, `Because any other good window starting at L must end further right, so it is longer — never a better "smallest" answer`, `Because the array is sorted`, `It is not safe; we may miss the answer`],
          answer: 1,
          explain: `We already recorded the length of the best window starting at L (it is this one: earlier R's were not enough). Every other window starting at L ends further right and is longer, so L is done.`
        },
        hints: [
          `<p><b>Aha:</b> with positive numbers, extending a window always <b>increases</b> its sum and cutting from the left always <b>decreases</b> it. So "grow until sum ≥ K, then shrink while sum ≥ K" sees every candidate shortest window.</p>`,
          `<p>Two indices <code>L</code> and <code>R</code> plus a running <code>sum</code>. Outer <code>for</code> moves R (grow); inner <code>while (sum ≥ K)</code> records <code>R - L + 1</code>, subtracts <code>a[L]</code>, moves L (shrink).</p>`,
          `<p><b>Traps:</b> start <code>best</code> at "infinity" (<code>Integer.MAX_VALUE</code>) and return 0 if it never changed; record the length <b>before</b> removing a[L]; use <code>long</code> for the sum if values are big; this only works for positive numbers. <b>Recipe:</b> L = 0, sum = 0, best = ∞ → for R: sum += a[R]; while sum ≥ K: best = min(best, R-L+1); sum -= a[L]; L++ → return best == ∞ ? 0 : best.</p>`
        ],
        solution: {
          approach: `<p>Caterpillar window: the right end grows the sum, the left end shrinks it while it stays ≥ K; record the length each time the window is good.</p>`,
          code: `
            class Solution {
                public int minSubArrayLen(int k, int[] a) {
                    int L = 0;                               // left end of the window
                    long sum = 0;                            // sum of a[L..R]
                    int best = Integer.MAX_VALUE;            // "infinity" = not found yet
                    for (int R = 0; R < a.length; R++) {
                        sum += a[R];                         // GROW: take a[R] in
                        while (sum >= k) {                   // window is good
                            best = Math.min(best, R - L + 1);   // record before shrinking
                            sum -= a[L];                     // SHRINK: let a[L] go
                            L++;
                        }
                    }
                    return best == Integer.MAX_VALUE ? 0 : best;   // 0 = no window was ever good
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().minSubArrayLen(7, new int[]{2, 3, 1, 2, 4, 3}));   // 2
                }
            }`,
          dry: {
            head: ['R', 'a[R]', 'sum after grow', 'shrink steps (while sum ≥ 7)', 'L after', 'best'],
            rows: [
              ['0', '2', '2', '—', '0', '∞'],
              ['1', '3', '5', '—', '0', '∞'],
              ['2', '1', '6', '—', '0', '∞'],
              ['3', '2', '8', 'len 4 → best 4; drop a[0]=2 → sum 6', '1', '4'],
              ['4', '4', '10', 'len 4 → best 4; drop a[1]=3 → 7; len 3 → best 3; drop a[2]=1 → 6', '3', '3'],
              ['5', '3', '9', 'len 3; drop a[3]=2 → 7; len 2 → best 2; drop a[4]=4 → 3', '5', H.c('p', '2')]
            ]
          },
          complexity: `<p><b>Time O(N):</b> R moves right N times; L also only moves right, at most N times in total. So the inner <code>while</code> runs at most N times over the <b>whole</b> run, not N times per R → about 2N steps. <b>Space O(1).</b></p>`
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 8 — Pattern picker
  // =====================================================================
  topics.push({
    title: 'Pattern Picker: Which Pointer Trick Fits?',
    analogy: `<p>A carpenter does not ask "hammer or screwdriver?" at random — the <b>screw head</b> tells them. In the same way, the <b>words in the question</b> tell you which pointer tool to grab: "sorted + pair" is a screw for the opposite-pointer screwdriver; "contiguous + size K" is a nail for the fixed-window hammer; "in place" is the packing tape of slow/fast pointers.</p>
      <p>A doctor works the same way: fever + rash → check a short list of causes in a fixed order. You will learn a short list of questions to ask a problem statement, always in the same order.</p>`,
    explain: `<p>All the patterns in this module share one secret: <b>pointers only move forward</b> (or only inward), so the total work is O(N). What differs is <b>where they start</b> and <b>what rule moves them</b>.</p>
      ${H.table(['pattern', 'start', 'move rule', 'typical problems'], [
        ['<b>Opposite pointers</b>', 'L = 0, R = N-1', 'compare a[L], a[R] → throw away the side that cannot be in the answer', '2-Sum sorted, 3-Sum, 4-Sum, container with most water, squares of sorted array, palindrome, boats'],
        ['<b>Same-direction (slow / fast)</b>', 'both at the left', 'fast reads every item; slow writes only "kept" items', 'remove duplicates, move zeroes, remove element, sort colors'],
        ['<b>Same-direction (gap)</b>', 'i = 0, j = 1', 'gap too small → j++, too big → i++', 'pairs with difference K, merge two sorted arrays'],
        ['<b>Fixed window</b>', 'first K elements', 'add a[i], drop a[i-K]', 'max sum / average of K consecutive, max points from cards'],
        ['<b>Variable window</b>', 'L = 0, R grows', 'grow R; shrink L while good (shortest) or while bad (longest)', 'smallest subarray sum ≥ K, max consecutive ones III, product &lt; K']
      ])}
      <h4>Quick decision steps (ask them in this order)</h4>
      <ol>
        <li>Is the answer about a <b>contiguous</b> piece (subarray / substring / consecutive days)? → <b>window</b>. Size given → fixed; size is what you are searching for → variable.</li>
        <li>Negative numbers + "subarray sum equals / at least K"? → the window is <b>not</b> safe; use prefix sums (+ HashMap or deque) instead.</li>
        <li>Must you rewrite the array <b>in place</b> (remove, move, compact)? → <b>slow / fast</b> read-write pointers.</li>
        <li>Is it about a <b>difference</b> between two values? → sort + same-direction gap pointers.</li>
        <li>Is it about <b>pairs / triplets</b> of values with a sum (not necessarily adjacent)? → sort if allowed, then <b>opposite pointers</b>.</li>
      </ol>
      <p>The visualizer below runs exactly this checklist on any statement you type, so you can test your instinct.</p>
      <p>${H.c('m', 'Sliding windows that need a HashMap of character counts (longest substring without repeats, minimum window substring) are taught fully in the Hashing module; the grow/shrink skeleton you learned here is exactly the same.')}</p>`,
    clues: [
      '"<b>sorted</b>" + "<b>pair / triplet</b> with sum" → opposite pointers.',
      '"<b>in place</b>" + "remove / move / keep order" → slow &amp; fast pointers.',
      '"<b>difference</b> K" → sort + same-direction pointers (i behind, j ahead).',
      '"<b>contiguous</b>" + "<b>size K</b>" → fixed window; "<b>shortest / longest</b>" + "<b>positive</b> numbers" or "<b>at most K</b>" → variable window.',
      '"<b>exactly K</b>" with a window → count atMost(K) - atMost(K - 1).',
      '"<b>return the indices</b>" on an <b>unsorted</b> array → sorting would lose them: think HashMap first.'
    ],
    viz: {
      title: 'Clue detector: run the checklist on a problem statement',
      input: 'Given an array of positive integers, return the length of the shortest contiguous subarray whose sum is at least K',
      inputLabel: 'Problem statement (plain English, any wording)',
      gen: function (input) {
        var raw = String(input === undefined || input === null ? '' : input).trim();
        if (raw.length < 10) throw new Error('Type a problem statement of at least a few words, e.g. "find a pair in a sorted array with sum equal to target".');
        if (raw.length > 400) throw new Error('Please keep the statement under 400 characters.');
        var s = raw.toLowerCase();
        function find(re) { var m = s.match(re); return m ? m[0] : null; }
        var noNeg = s.replace(/non[- ]?negative/g, ' ');
        var clue = {
          contiguous: find(/subarray|substring|contiguous|consecutive|window|stretch|streak/),
          sizeK: find(/(size|length)\s+(k|\d+)\b|\b(k|\d+)\s+consecutive|every window of/),
          negative: /negative/.test(noNeg) ? 'negative' : null,
          positive: find(/positive|non[- ]?negative/),
          inPlace: find(/in[- ]place|o\(1\) extra|remove|move (all )?(the )?zero|compact|rearrange/),
          diff: find(/difference|differ by|apart by/),
          pair: find(/pair|two numbers|two elements|triplet|three numbers|two lines|two walls|container|palindrome|add up|sum (to|equals|equal)/)
        };
        var found = [];
        Object.keys(clue).forEach(function (k) { if (clue[k]) found.push('"' + clue[k] + '"'); });
        var nodes = [
          { id: 'Q1', label: 'Contiguous?', x: 50, y: 6, shape: 'box' },
          { id: 'Q2', label: 'Size K given?', x: 24, y: 22, shape: 'box' },
          { id: 'Q4', label: 'In place?', x: 76, y: 22, shape: 'box' },
          { id: 'FIX', label: 'Fixed window', x: 10, y: 40, shape: 'box' },
          { id: 'Q3', label: 'Negatives?', x: 36, y: 40, shape: 'box' },
          { id: 'SF', label: 'Slow / fast', x: 61, y: 40, shape: 'box' },
          { id: 'Q5', label: 'Difference?', x: 86, y: 40, shape: 'box' },
          { id: 'VAR', label: 'Grow / shrink', x: 22, y: 58, shape: 'box' },
          { id: 'PRE', label: 'Prefix sums', x: 46, y: 58, shape: 'box' },
          { id: 'GAP', label: 'Gap pointers', x: 67, y: 58, shape: 'box' },
          { id: 'Q6', label: 'Pair/triple?', x: 88, y: 58, shape: 'box' },
          { id: 'OPP', label: 'Opposite ptrs', x: 70, y: 76, shape: 'box' },
          { id: 'OTH', label: 'Rethink', x: 90, y: 76, shape: 'box' }
        ];
        var edges = [['Q1', 'Q2', 'yes'], ['Q1', 'Q4', 'no'], ['Q2', 'FIX', 'yes'], ['Q2', 'Q3', 'no'], ['Q3', 'PRE', 'yes'], ['Q3', 'VAR', 'no'],
          ['Q4', 'SF', 'yes'], ['Q4', 'Q5', 'no'], ['Q5', 'GAP', 'yes'], ['Q5', 'Q6', 'no'], ['Q6', 'OPP', 'yes'], ['Q6', 'OTH', 'no']];
        var answers = {
          FIX: 'Fixed-size sliding window: build the first K, then add a[i] and drop a[i - K]. O(N), O(1) memory.',
          VAR: 'Variable window (grow / shrink): shortest → shrink while good; longest or count → shrink while bad. O(N).',
          PRE: 'Negatives break the window. Use prefix sums: + HashMap for "sum exactly K", + monotonic deque for "shortest sum ≥ K".',
          SF: 'Slow / fast read-write pointers: fast reads every item, slow writes the kept ones. O(N), O(1) memory, stable.',
          GAP: 'Sort, then same-direction gap pointers: gap too small → j++, too big → i++. O(N log N) for the sort, O(N) walk.',
          OPP: 'Opposite-direction pointers (sort first if allowed): too small → L++, too big → R--. Fix extra numbers in outer loops for 3-Sum / 4-Sum.',
          OTH: 'None of the pointer clues matched. Re-read the statement: maybe it needs hashing, binary search or another module — or the clue words are just phrased differently.'
        };
        var frames = [], path = [], usedEdges = {};
        function snap(cur, narr, isEnd) {
          var hl = {};
          path.forEach(function (id) { hl[id] = 'done'; });
          hl[cur] = isEnd ? 'sel' : 'cur';
          var ehl = {};
          Object.keys(usedEdges).forEach(function (k) { ehl[k] = 'ok'; });
          frames.push({
            narr: narr,
            parts: [
              { type: 'graph', label: 'Decision checklist', directed: true, height: 84, nodes: nodes, edges: edges, hl: hl, ehl: ehl },
              { type: 'set', label: 'clue words spotted', items: found.length ? found.slice() : ['(none)'] }
            ]
          });
        }
        frames.push({
          narr: 'Statement: <i>' + escHtml(raw) + '</i>. First, underline the clue words. Spotted: <b>' + (found.length ? escHtml(found.join(', ')) : 'none yet') + '</b>. Now ask the checklist questions in order.',
          parts: [
            { type: 'text', label: 'Statement', html: escHtml(raw) },
            { type: 'set', label: 'clue words spotted', items: found.length ? found.slice() : ['(none)'] }
          ]
        });
        function step(from, yes, to, why) {
          snap(from, why + (yes ? ' → <b>YES</b>.' : ' → <b>NO</b>.'));
          path.push(from);
          usedEdges[from + '-' + to] = 1;
        }
        var end;
        if (clue.contiguous) {
          step('Q1', true, 'Q2', 'Is the answer a contiguous piece? The word <b>"' + escHtml(clue.contiguous) + '"</b> says so');
          if (clue.sizeK) {
            step('Q2', true, 'FIX', 'Is the window size given? <b>"' + escHtml(clue.sizeK) + '"</b> fixes it');
            end = 'FIX';
          } else {
            step('Q2', false, 'Q3', 'Is the window size given? No fixed length is mentioned, so the size is what we are searching for');
            if (clue.negative && !clue.positive) {
              step('Q3', true, 'PRE', 'Can values be negative? The statement mentions <b>"negative"</b> numbers, so growing may shrink the sum');
              end = 'PRE';
            } else {
              step('Q3', false, 'VAR', 'Can values be negative? ' + (clue.positive ? 'It says <b>"' + escHtml(clue.positive) + '"</b>' : 'Nothing says so (ask the interviewer to confirm!)') + ', so sums grow when we extend and shrink when we cut');
              end = 'VAR';
            }
          }
        } else {
          step('Q1', false, 'Q4', 'Is the answer a contiguous piece? No word like subarray / substring / consecutive / window appears');
          if (clue.inPlace) {
            step('Q4', true, 'SF', 'Must we rewrite the array in place? <b>"' + escHtml(clue.inPlace) + '"</b> points that way');
            end = 'SF';
          } else {
            step('Q4', false, 'Q5', 'Must we rewrite the array in place? No in-place / remove / move wording');
            if (clue.diff) {
              step('Q5', true, 'GAP', 'Is it about a difference? <b>"' + escHtml(clue.diff) + '"</b>');
              end = 'GAP';
            } else {
              step('Q5', false, 'Q6', 'Is it about a difference? No');
              if (clue.pair) {
                step('Q6', true, 'OPP', 'Is it about a pair / triplet / two ends? <b>"' + escHtml(clue.pair) + '"</b>');
                end = 'OPP';
              } else {
                step('Q6', false, 'OTH', 'Is it about a pair / triplet / two ends? No such words');
                end = 'OTH';
              }
            }
          }
        }
        snap(end, '<b>Verdict:</b> ' + answers[end], true);
        frames.push({
          narr: 'Checklist done. Path taken: ' + path.concat([end]).join(' → ') + '. Edit the statement above (try "sorted array, find two numbers that add up to target" or "move all zeroes to the end in place") and watch the path change.',
          parts: [
            { type: 'text', label: 'Recommended technique', html: '<b>' + answers[end] + '</b>' },
            { type: 'set', label: 'clue words that decided it', items: found.length ? found.slice() : ['(none)'] }
          ]
        });
        return frames;
      }
    },
    examples: [
      {
        title: '"Given a sorted array, return two numbers that add up to target, using O(1) memory"',
        html: `<p>Contiguous? ${H.c('r', 'no')}. In place? ${H.c('r', 'no')} (O(1) memory is a limit, not a rewrite). Difference? ${H.c('r', 'no')}. Pair with a sum? ${H.c('g', 'yes')} → <b>opposite pointers</b>. The word "sorted" confirms it: no sorting cost, no HashMap needed.</p>`
      },
      {
        title: '"Find the maximum number of fruits you can collect in a row using at most 2 baskets (types)"',
        html: `<p>"in a row" = contiguous ${H.c('g', 'yes')}. Size given? ${H.c('r', 'no')} — we want the longest. "At most 2" is a monotone condition (a smaller window has at most as many types) → <b>variable window, longest flavour</b>, with a small count map of fruit types. (This is LeetCode "Fruit Into Baskets".)</p>`
      },
      {
        title: '"Count subarrays whose sum equals K; values can be negative"',
        html: `<p>Contiguous ${H.c('g', 'yes')}, size not given, ${H.c('r', 'negatives')} → a window cannot decide when to shrink. Use <b>prefix sums + HashMap</b> (count of earlier prefix sums equal to <code>pf - K</code>): O(N). Recognising "this is NOT a window problem" is as valuable as recognising one.</p>`
      },
      {
        title: '"Rearrange the array so all even numbers come before odd numbers, in place"',
        html: `<p>Contiguous? no. In place? ${H.c('g', 'yes')} → read/write pointers with keep rule "is even", swapping into slot <code>slow</code>. If relative order does not matter, opposite pointers also work (swap an odd from the left with an even from the right) and do fewer swaps.</p>`
      }
    ],
    deepDive: `<h4>The one idea behind every pattern here</h4>
      <p>Every technique in this module is a way to explore the N × N table of (i, j) pairs <b>without</b> visiting all of it. Each pointer move <b>deletes a whole row or column</b> of that table because of a <b>monotonic</b> fact: sorted order (opposite / gap pointers), "kept items keep their order" (slow/fast), or "goodness is monotone in window size" (variable window). When you cannot name the monotonic fact, the pointer solution is probably wrong.</p>
      <h4>When two clues fight</h4>
      ${H.table(['situation', 'better choice', 'why'], [
        ['unsorted + "return indices" + pair sum', 'HashMap', 'sorting loses indices; hashing is O(N)'],
        ['unsorted + "values only" + O(1) memory', 'sort + opposite pointers', 'O(N log N) time, no extra memory'],
        ['"subarray sum = K" with negatives', 'prefix sum + HashMap', 'window goodness is not monotone'],
        ['"subarray sum ≥ K", positives', 'variable window', 'O(N) and O(1) memory beats prefix + binary search'],
        ['"K-th smallest pair distance"', 'binary search on the answer + two-pointer counting', 'pointers count pairs ≤ d in O(N) for each guess']
      ])}
      <h4>Pointers beyond arrays</h4>
      <ul>
        <li><b>Linked lists:</b> slow/fast pointers find the middle and detect cycles (Floyd) — Linked Lists module.</li>
        <li><b>Strings:</b> palindromes (opposite), anagram windows (fixed), longest substring without repeats (variable + hashing).</li>
        <li><b>Two arrays / files:</b> merge, intersection of sorted lists, comparing two version strings.</li>
        <li><b>Databases:</b> a <b>merge join</b> of two sorted tables is a same-direction two-pointer walk; query engines pick it when both inputs are already sorted on the join key.</li>
      </ul>`,
    aiEra: `<p><b>What AI changes:</b> pattern recognition is exactly what assistants are good at on <i>famous</i> problems — paste LeetCode 209 and it says "sliding window". On a <b>new</b> or disguised problem, though, they often pattern-match on surface words (they see "subarray" and say "window" even when negatives make it wrong). Your checklist plus the monotonic-fact test is the safety net.</p>
      <p><b>Use AI as a partner:</b> ask <code>Rewrite this problem statement in 3 different disguises without changing the solution</code> and practise classifying them; ask <code>Which monotonic property would a two-pointer solution rely on here? Is it true?</code>; ask for a counterexample to your chosen pattern before you code it.</p>
      <p><b>Where AI goes wrong:</b> confident classification without checking the constraints (negatives, need for original indices, duplicates), suggesting sorting when the order of elements matters (windows!), and calling a nested-loop solution "two pointers".</p>
      <p><b>What you must still own:</b> reading constraints, saying the monotonic fact out loud, and choosing between pointers, hashing and prefix sums with a one-line trade-off. That reasoning is what interviewers score.</p>`
  });

  // =====================================================================
  // PRACTICE ARENA — Easy
  // =====================================================================
  practice.push({
    title: 'Valid Palindrome (ignore case and symbols)',
    level: 'Easy',
    tags: ['two pointers', 'opposite direction', 'string'],
    companies: ['Meta', 'Microsoft', 'Amazon'],
    statement: `<p>A phrase is a <b>palindrome</b> if, after turning all uppercase letters into lowercase and removing every character that is not a letter or digit, it reads the same forwards and backwards. Given a string <code>s</code>, return <code>true</code> if it is a palindrome. Use O(1) extra memory.</p>`,
    constraints: `1 ≤ s.length ≤ 2·10<sup>5</sup>, printable ASCII characters`,
    example: `<p>s = "${H.c('g', 'A')} man, a plan, a canal: Panam${H.c('g', 'a')}" → ${H.c('p', 'true')}</p><p><b>Why:</b> keeping only letters/digits and lowercasing gives "amanaplanacanalpanama", which mirrors itself. s = "race a car" → "raceacar" → ${H.c('r', 'false')} ('e' vs 'a' in the middle).</p>`,
    brute: {
      why: `<p>Build a cleaned copy with a <code>StringBuilder</code>, reverse it, compare. That is O(N) time but O(N) extra memory — two extra strings of up to 2·10<sup>5</sup> characters. The waste: we copy everything just to compare characters we could read in place.</p>`,
      code: `
        boolean brute(String s) {
            StringBuilder sb = new StringBuilder();
            for (char c : s.toCharArray())
                if (Character.isLetterOrDigit(c)) sb.append(Character.toLowerCase(c));
            String clean = sb.toString();
            return clean.equals(sb.reverse().toString());   // extra O(N) memory
        }`
    },
    mcq: {
      q: `L points to ',' and R points to 'a'. What should happen?`,
      options: [`Return false: ',' is not 'a'`, `Skip the ',' with L++ and compare again`, `Move both pointers`, `Lowercase the ','`],
      answer: 1,
      explain: `Non-alphanumeric characters are ignored, so the pointer sitting on one simply steps past it; only real letters/digits are compared.`
    },
    hints: [
      `<p><b>Aha:</b> you never need the cleaned string. Two pointers from both ends can <b>skip</b> junk characters on the fly and compare only the letters/digits they land on.</p>`,
      `<p>Opposite pointers L = 0 and R = n - 1. Inner loops: while L &lt; R and s[L] is not alphanumeric → L++; same for R. Then compare lowercase versions.</p>`,
      `<p><b>Traps:</b> keep the <code>L &lt; R</code> check inside the skip loops (a string of only symbols); digits count as characters ("0P" is false); compare <code>Character.toLowerCase</code> of both. <b>Recipe:</b> skip junk on both sides → compare → mismatch returns false → L++, R-- → true at the end.</p>`
    ],
    solution: {
      approach: `<p>Opposite pointers that skip non-alphanumeric characters and compare case-insensitively.</p>`,
      code: `
        class Solution {
            public boolean isPalindrome(String s) {
                int L = 0, R = s.length() - 1;
                while (L < R) {
                    while (L < R && !Character.isLetterOrDigit(s.charAt(L))) L++;   // skip junk on the left
                    while (L < R && !Character.isLetterOrDigit(s.charAt(R))) R--;   // skip junk on the right
                    if (Character.toLowerCase(s.charAt(L)) != Character.toLowerCase(s.charAt(R))) {
                        return false;                  // mirror characters differ
                    }
                    L++;
                    R--;
                }
                return true;
            }
        }`,
      alt: [{ lang: 'python', code: `class Solution:
    def isPalindrome(self, s: str) -> bool:
        L, R = 0, len(s) - 1
        while L < R:
            while L < R and not s[L].isalnum():
                L += 1
            while L < R and not s[R].isalnum():
                R -= 1
            if s[L].lower() != s[R].lower():
                return False
            L, R = L + 1, R - 1
        return True` }],
      dry: {
        head: ['L', 'R', 's[L] vs s[R]', 'action'],
        rows: [['0', '9', '"r" vs "r" (s = "race a car")', 'match → L=1, R=8'], ['1', '8', '"a" vs "a"', 'match'], ['2', '7', '"c" vs "c"', 'match'], ['3', '5', '"e" vs "a" (R skipped the space at 6)', H.c('r', 'mismatch → false')]]
      },
      complexity: `<p><b>Time O(N):</b> each character is passed by L or R at most once. <b>Space O(1).</b></p>`,
      followUps: ['Valid Palindrome II: you may delete at most one character (on a mismatch, try skipping L or skipping R).', 'What changes for Unicode text with combining accents?']
    }
  });

  practice.push({
    title: 'Squares of a Sorted Array',
    level: 'Easy',
    tags: ['two pointers', 'opposite direction'],
    companies: ['Amazon', 'Google', 'Uber'],
    statement: `<p>Given an integer array <code>nums</code> sorted in non-decreasing order (it may contain negatives), return an array of the <b>squares</b> of each number, also sorted in non-decreasing order. Aim for O(N).</p>`,
    constraints: `1 ≤ N ≤ 10<sup>4</sup>, -10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup>, nums is sorted`,
    example: `${H.arr([-4, -1, 0, 3, 10], { label: 'nums', hl: { 0: 'y', 4: 'y' } })}${H.arr([0, 1, 9, 16, 100], { label: 'output', hl: { 4: 'p' } })}<p><b>Why:</b> squaring makes -4 bigger than 3, so the order breaks. But the <b>biggest</b> square is always at one of the two <b>ends</b> (most negative or most positive) — here ${H.c('p', '10² = 100')}.</p>`,
    brute: {
      why: `<p>Square everything, then sort: O(N log N). Correct, but it ignores that the input is already sorted: the squares form a "valley" (decreasing, then increasing) and two sorted halves can be merged in O(N).</p>`,
      code: `
        int[] brute(int[] nums) {
            int[] out = new int[nums.length];
            for (int i = 0; i < nums.length; i++) out[i] = nums[i] * nums[i];
            Arrays.sort(out);                     // O(N log N)
            return out;
        }`
    },
    mcq: {
      q: `Where is the LARGEST square of a sorted array with negatives?`,
      options: [`Always at the last index`, `At one of the two ends`, `In the middle`, `Next to the zero`],
      answer: 1,
      explain: `The square depends on the absolute value; the largest absolute value is either the most negative (left end) or the most positive (right end).`
    },
    hints: [
      `<p><b>Aha:</b> the largest remaining square is always at L or R. So fill the output from the <b>back</b> (largest first), picking the bigger of the two ends each time.</p>`,
      `<p>Opposite pointers L = 0, R = n - 1, and a write index w = n - 1 that moves left. Compare <code>|nums[L]|</code> with <code>|nums[R]|</code>; write the bigger square at w; move that pointer inward.</p>`,
      `<p><b>Traps:</b> you need a new output array (writing in place would destroy unread values); loop while <code>L ≤ R</code> so the last element is placed; squares up to 10<sup>8</sup> fit in <code>int</code>. <b>Recipe:</b> for w from n-1 down to 0: if |a[L]| &gt; |a[R]| → out[w] = a[L]², L++ else out[w] = a[R]², R--.</p>`
    ],
    solution: {
      approach: `<p>Two pointers at the ends pick the larger absolute value; fill the result from the back.</p>`,
      code: `
        class Solution {
            public int[] sortedSquares(int[] nums) {
                int n = nums.length;
                int[] out = new int[n];
                int L = 0, R = n - 1;
                for (int w = n - 1; w >= 0; w--) {          // fill biggest squares first
                    if (Math.abs(nums[L]) > Math.abs(nums[R])) {
                        out[w] = nums[L] * nums[L];
                        L++;
                    } else {
                        out[w] = nums[R] * nums[R];
                        R--;
                    }
                }
                return out;
            }
        }`,
      dry: {
        head: ['w', 'L (val)', 'R (val)', 'bigger |x|', 'out[w]'],
        rows: [['4', '0 (-4)', '4 (10)', '10', '100'], ['3', '0 (-4)', '3 (3)', '-4', '16'], ['2', '1 (-1)', '3 (3)', '3', '9'], ['1', '1 (-1)', '2 (0)', '-1', '1'], ['0', '2 (0)', '2 (0)', '0', '0']]
      },
      complexity: `<p><b>Time O(N)</b>, <b>Space O(N)</b> for the output (O(1) extra besides it).</p>`,
      followUps: ['Return the squares in non-increasing order instead.', 'Sort a sorted array after applying f(x) = ax² + bx + c (LeetCode 360).']
    }
  });

  practice.push({
    title: 'Maximum Average Subarray I',
    level: 'Easy',
    tags: ['sliding window', 'fixed size'],
    companies: ['Google', 'Amazon'],
    statement: `<p>Given an integer array <code>nums</code> and an integer <code>k</code>, find the contiguous subarray of length exactly <code>k</code> that has the <b>maximum average</b> and return that average (as a double).</p>`,
    constraints: `1 ≤ k ≤ N ≤ 10<sup>5</sup>, -10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup>`,
    example: `${H.arr([1, 12, -5, -6, 50, 3], { label: 'nums', hl: { 1: 'p', 2: 'p', 3: 'p', 4: 'p' } })}<p>k = 4 → ${H.c('p', '12.75')}</p><p><b>Why:</b> window sums are 2, ${H.c('p', '51')}, 42; the best is 51 and 51 / 4 = 12.75.</p>`,
    brute: {
      why: `<p>For each of the N - k + 1 starts, add k numbers: O(N·k), up to 2.5·10<sup>9</sup> operations. Neighbouring windows share k - 1 numbers that get re-added every time.</p>`,
      code: `
        double brute(int[] nums, int k) {
            double best = -Double.MAX_VALUE;
            for (int s = 0; s + k <= nums.length; s++) {
                long sum = 0;
                for (int j = s; j < s + k; j++) sum += nums[j];
                best = Math.max(best, (double) sum / k);
            }
            return best;
        }`
    },
    mcq: {
      q: `Why compare window SUMS instead of averages inside the loop?`,
      options: [`Sums are always positive`, `All windows have the same size k, so the largest sum is the largest average — divide once at the end`, `Averages cannot be compared`, `It is required by Java`],
      answer: 1,
      explain: `Dividing every window by the same k does not change which one is largest; doing it once avoids floating-point work and rounding noise.`
    },
    hints: [
      `<p><b>Aha:</b> fixed window size → keep a running sum; moving one step = add the entering element, subtract the leaving one.</p>`,
      `<p>One <code>long sum</code> and one <code>long best</code>. Build the first window, then for i = k..n-1: sum += nums[i] - nums[i - k].</p>`,
      `<p><b>Traps:</b> start <code>best</code> at the first window's sum (all numbers may be negative); divide as <code>(double) best / k</code> to avoid integer division. <b>Recipe:</b> sum = first k → best = sum → slide → return best / k.</p>`
    ],
    solution: {
      approach: `<p>Fixed-size sliding window on the sum; convert the best sum to an average at the end.</p>`,
      code: `
        class Solution {
            public double findMaxAverage(int[] nums, int k) {
                long sum = 0;
                for (int i = 0; i < k; i++) sum += nums[i];   // first window
                long best = sum;
                for (int i = k; i < nums.length; i++) {
                    sum += nums[i] - nums[i - k];             // slide by one
                    best = Math.max(best, sum);
                }
                return (double) best / k;                     // divide once
            }
        }`,
      dry: {
        head: ['i', 'enters', 'leaves', 'sum', 'best'],
        rows: [['0..3', '1, 12, -5, -6', '—', '2', '2'], ['4', '50', '1', '51', '51'], ['5', '3', '12', '42', '51 → 12.75']]
      },
      complexity: `<p><b>Time O(N)</b>, <b>Space O(1)</b>.</p>`,
      followUps: ['Maximum Average Subarray II: length at least k (needs binary search on the answer + prefix sums).']
    }
  });

  practice.push({
    title: 'Merge Sorted Array (in place, from the back)',
    level: 'Easy',
    tags: ['two pointers', 'merge', 'in-place'],
    companies: ['Meta', 'Microsoft', 'Bloomberg'],
    statement: `<p>You are given two sorted arrays <code>nums1</code> (length <code>m + n</code>, where the last <code>n</code> cells are empty zeros) and <code>nums2</code> (length <code>n</code>). Merge <code>nums2</code> into <code>nums1</code> so that <code>nums1</code> becomes one sorted array of length <code>m + n</code>. Do it in place.</p>`,
    constraints: `0 ≤ m, n ≤ 200, 1 ≤ m + n, -10<sup>9</sup> ≤ values ≤ 10<sup>9</sup>`,
    example: `<p>nums1 = [1, 2, 3, ${H.c('m', '0, 0, 0')}], m = 3; nums2 = [2, 5, 6], n = 3 → ${H.c('p', '[1, 2, 2, 3, 5, 6]')}</p><p><b>Why fill from the back?</b> The empty cells are at the <b>end</b>. Placing the <b>largest</b> remaining value there never overwrites a value of nums1 we still need to read.</p>`,
    brute: {
      why: `<p>Copy nums2 into the empty tail and call <code>Arrays.sort</code>: O((m + n) log(m + n)). It works but ignores that both inputs are already sorted. Merging from the <b>front</b> in place would overwrite unread values of nums1 or force O(N) shifts per insert.</p>`,
      code: `
        void brute(int[] nums1, int m, int[] nums2, int n) {
            for (int i = 0; i < n; i++) nums1[m + i] = nums2[i];
            Arrays.sort(nums1);
        }`
    },
    mcq: {
      q: `Why does merging from the BACK not overwrite unread values?`,
      options: [`Because nums2 is smaller`, `The write index w = i + j + 1 is always ≥ i, so it only lands on empty cells or the cell we just read`, `Because the arrays are sorted descending`, `It does overwrite, but it does not matter`],
      answer: 1,
      explain: `w = (cells of nums1 left) + (cells of nums2 left) - 1 ≥ i; equality happens only when nums2 is exhausted, and then nums1's remaining values are already in place.`
    },
    hints: [
      `<p><b>Aha:</b> the free space is at the end of nums1, so produce the merged result from <b>largest to smallest</b> and write it from the back.</p>`,
      `<p>Three indices: <code>i = m - 1</code> (end of real nums1 values), <code>j = n - 1</code> (end of nums2), <code>w = m + n - 1</code> (write slot). Write the bigger of nums1[i] and nums2[j] at w.</p>`,
      `<p><b>Traps:</b> loop while <code>j ≥ 0</code> — once nums2 is used up, the rest of nums1 is already in place; if nums1 runs out first, keep copying nums2. <b>Recipe:</b> while j ≥ 0: if i ≥ 0 and nums1[i] &gt; nums2[j] → nums1[w--] = nums1[i--] else nums1[w--] = nums2[j--].</p>`
    ],
    solution: {
      approach: `<p>Backwards merge with three pointers; the largest remaining element goes to the last free slot.</p>`,
      code: `
        class Solution {
            public void merge(int[] nums1, int m, int[] nums2, int n) {
                int i = m - 1, j = n - 1, w = m + n - 1;
                while (j >= 0) {                                  // until nums2 is fully placed
                    if (i >= 0 && nums1[i] > nums2[j]) {
                        nums1[w--] = nums1[i--];                  // nums1's value is larger
                    } else {
                        nums1[w--] = nums2[j--];                  // nums2's value is larger (or nums1 empty)
                    }
                }
            }
        }`,
      dry: {
        head: ['i (val)', 'j (val)', 'w', 'write', 'nums1'],
        rows: [['2 (3)', '2 (6)', '5', '6', '[1,2,3,0,0,6]'], ['2 (3)', '1 (5)', '4', '5', '[1,2,3,0,5,6]'], ['2 (3)', '0 (2)', '3', '3', '[1,2,3,3,5,6]'], ['1 (2)', '0 (2)', '2', '2 (from nums2; tie)', '[1,2,2,3,5,6]'], ['1', '-1', '—', 'stop', H.c('p', '[1,2,2,3,5,6]')]]
      },
      complexity: `<p><b>Time O(m + n)</b>, <b>Space O(1)</b>.</p>`,
      followUps: ['Merge k sorted arrays (needs a heap — Heaps module).', 'Intersection of two sorted arrays with two pointers.']
    }
  });

  // =====================================================================
  // PRACTICE ARENA — Medium (part 1)
  // =====================================================================
  practice.push({
    title: '3-Sum Closest',
    level: 'Medium',
    tags: ['sorting', 'two pointers'],
    companies: ['Meta', 'Amazon', 'Bloomberg'],
    statement: `<p>Given an integer array <code>nums</code> and an integer <code>target</code>, choose three numbers at different positions whose sum is <b>closest</b> to <code>target</code> and return that sum. Assume exactly one closest sum exists.</p>`,
    constraints: `3 ≤ N ≤ 500, -1000 ≤ nums[i] ≤ 1000, -10<sup>4</sup> ≤ target ≤ 10<sup>4</sup>`,
    example: `<p>nums = [-1, 2, 1, -4], target = 1 → ${H.c('p', '2')}</p><p><b>Why:</b> ${H.c('p', '-1 + 2 + 1 = 2')} is 1 away from the target; every other triple is further (e.g. -4 + 1 + 2 = -1 is 2 away).</p>`,
    brute: {
      why: `<p>Three nested loops over all triples: N<sup>3</sup>/6 ≈ 2·10<sup>7</sup> for N = 500 — passes here but is the textbook "you missed the pattern" answer. The waste: for fixed i and L, scanning every R even though, in sorted order, the sum moves monotonically with R.</p>`,
      code: `
        int brute(int[] nums, int target) {
            int best = nums[0] + nums[1] + nums[2];
            for (int i = 0; i < nums.length; i++)
                for (int j = i + 1; j < nums.length; j++)
                    for (int k = j + 1; k < nums.length; k++) {
                        int s = nums[i] + nums[j] + nums[k];
                        if (Math.abs(s - target) < Math.abs(best - target)) best = s;
                    }
            return best;
        }`
    },
    mcq: {
      q: `Sorted, i fixed, current sum is 7 and target is 10. Which pointer moves?`,
      options: [`R--, to get closer`, `L++, because we need a bigger sum`, `Both`, `Stop: 7 is close enough`],
      answer: 1,
      explain: `Below the target → move L right to increase the sum. Moving R left could only make it smaller and further away.`
    },
    hints: [
      `<p><b>Aha:</b> it is 3-Sum with a different bookkeeping: instead of collecting sums equal to 0, remember the sum with the smallest <code>|sum - target|</code>.</p>`,
      `<p>Sort; fix i; L = i + 1, R = n - 1; compute sum; update best; sum &lt; target → L++, sum &gt; target → R--, equal → return target immediately.</p>`,
      `<p><b>Traps:</b> initialise best with a real triple (not 0 or MAX_VALUE, which can overflow in <code>best - target</code>); no duplicate skipping is needed for correctness (it only saves time). <b>Recipe:</b> sort → best = first three → for i: pointer walk updating best → return best.</p>`
    ],
    solution: {
      approach: `<p>Sort + fix one + opposite pointers, tracking the closest sum.</p>`,
      code: `
        class Solution {
            public int threeSumClosest(int[] nums, int target) {
                Arrays.sort(nums);
                int n = nums.length;
                int best = nums[0] + nums[1] + nums[2];           // a real triple to start
                for (int i = 0; i < n - 2; i++) {
                    if (i > 0 && nums[i] == nums[i - 1]) continue; // optional speed-up
                    int L = i + 1, R = n - 1;
                    while (L < R) {
                        int sum = nums[i] + nums[L] + nums[R];
                        if (Math.abs(sum - target) < Math.abs(best - target)) best = sum;
                        if (sum == target) return sum;            // cannot get closer than 0
                        if (sum < target) L++;
                        else R--;
                    }
                }
                return best;
            }
        }`,
      dry: {
        head: ['i (val)', 'L', 'R', 'sum', '|sum-1|', 'best'],
        rows: [['0 (-4)', '1', '3', '-3', '4', '-3 (start: -4-1+1=-4 → -3 better)'], ['0 (-4)', '2', '3', '-1', '2', '-1'], ['1 (-1)', '2', '3', '2', '1', H.c('p', '2')]]
      },
      complexity: `<p><b>Time O(N<sup>2</sup>)</b> after an O(N log N) sort. <b>Space O(1)</b> extra.</p>`,
      followUps: ['Return the triple itself, not just the sum.', '4-Sum closest: one more outer loop, O(N³).']
    }
  });

  practice.push({
    title: 'Sort Colors (Dutch National Flag)',
    level: 'Medium',
    tags: ['two pointers', 'three pointers', 'in-place', 'partition'],
    companies: ['Microsoft', 'Amazon', 'Adobe'],
    statement: `<p>An array <code>nums</code> contains only <code>0</code> (red), <code>1</code> (white) and <code>2</code> (blue). Sort it <b>in place</b> so that all 0s come first, then 1s, then 2s, in <b>one pass</b> and O(1) extra memory, without using a library sort.</p>`,
    constraints: `1 ≤ N ≤ 300, nums[i] ∈ {0, 1, 2}`,
    example: `${H.arr([2, 0, 2, 1, 1, 0], { label: 'nums' })}${H.arr([0, 0, 1, 1, 2, 2], { label: 'output', hl: { 0: 'r', 1: 'r', 4: 'b', 5: 'b' } })}<p><b>Why:</b> three zones grow: ${H.c('r', '0s')} at the front, ${H.c('b', '2s')} at the back, 1s naturally end in the middle.</p>`,
    brute: {
      why: `<p>Counting sort: count 0s, 1s and 2s, then overwrite — O(N) but <b>two passes</b>. A library sort is O(N log N). The one-pass version keeps three regions with three pointers.</p>`,
      code: `
        void brute(int[] nums) {
            int[] cnt = new int[3];
            for (int x : nums) cnt[x]++;                 // pass 1: count
            int w = 0;
            for (int c = 0; c < 3; c++)                  // pass 2: rewrite
                for (int t = 0; t < cnt[c]; t++) nums[w++] = c;
        }`
    },
    mcq: {
      q: `mid sees a 2 and swaps it with nums[high]. Why do we NOT move mid forward afterwards?`,
      options: [`Because mid must always stay behind low`, `Because the value that came from high has not been inspected yet`, `Because 2s must be checked twice`, `It is a bug; mid should move`],
      answer: 1,
      explain: `The cell at high was never looked at — it could be 0, 1 or 2 — so mid must examine it before moving on. (A swap with low brings back a 1 we already saw, so there mid can move.)`
    },
    hints: [
      `<p><b>Aha:</b> keep three regions: [0, low) are 0s, [low, mid) are 1s, (high, n-1] are 2s; [mid, high] is unknown. Shrink the unknown part by one each step.</p>`,
      `<p>Pointers <code>low = 0</code>, <code>mid = 0</code>, <code>high = n - 1</code>. nums[mid] == 0 → swap with low, low++, mid++. == 1 → mid++. == 2 → swap with high, high-- (mid stays).</p>`,
      `<p><b>Traps:</b> loop while <code>mid ≤ high</code> (not &lt;); do not advance mid after swapping with high. <b>Recipe:</b> classic Dutch National Flag partition by Dijkstra — the same three-way partition is used by quicksort when there are many equal keys.</p>`
    ],
    solution: {
      approach: `<p>Three-pointer partition: one pass, every step shrinks the unknown region.</p>`,
      code: `
        class Solution {
            public void sortColors(int[] nums) {
                int low = 0, mid = 0, high = nums.length - 1;
                while (mid <= high) {                     // [mid..high] still unknown
                    if (nums[mid] == 0) {
                        swap(nums, low++, mid++);         // 0 joins the front zone
                    } else if (nums[mid] == 1) {
                        mid++;                            // 1 is already in the middle zone
                    } else {
                        swap(nums, mid, high--);          // 2 goes to the back; re-check new nums[mid]
                    }
                }
            }

            private void swap(int[] a, int i, int j) {
                int t = a[i]; a[i] = a[j]; a[j] = t;
            }
        }`,
      dry: {
        head: ['low', 'mid', 'high', 'nums[mid]', 'action', 'array'],
        rows: [['0', '0', '5', '2', 'swap(0,5), high=4', '[0,0,2,1,1,2]'], ['0', '0', '4', '0', 'swap(0,0), low=1, mid=1', '[0,0,2,1,1,2]'], ['1', '1', '4', '0', 'swap(1,1), low=2, mid=2', '[0,0,2,1,1,2]'], ['2', '2', '4', '2', 'swap(2,4), high=3', '[0,0,1,1,2,2]'], ['2', '2', '3', '1', 'mid=3', '[0,0,1,1,2,2]'], ['2', '3', '3', '1', 'mid=4 &gt; high → stop', H.c('p', '[0,0,1,1,2,2]')]]
      },
      complexity: `<p><b>Time O(N)</b> — one pass; <b>Space O(1)</b>.</p>`,
      followUps: ['Sort an array of k colors with O(1) memory.', 'Three-way partition around a pivot for quicksort with many duplicates.']
    }
  });

  practice.push({
    title: 'Remove Duplicates from Sorted Array II (keep at most two)',
    level: 'Medium',
    tags: ['two pointers', 'in-place'],
    companies: ['Meta', 'Amazon'],
    statement: `<p>Given a sorted integer array <code>nums</code>, remove duplicates <b>in place</b> so that each value appears <b>at most twice</b>, keeping the relative order. Return <code>k</code>, the new length; the first <code>k</code> cells must hold the result. O(1) extra memory.</p>`,
    constraints: `1 ≤ N ≤ 3·10<sup>4</sup>, -10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup>, sorted`,
    example: `${H.arr([0, 0, 1, 1, 1, 1, 2, 3, 3], { label: 'nums', hl: { 4: 'r', 5: 'r' } })}<p>Output ${H.c('p', 'k = 7')}, nums starts with ${H.c('g', '[0, 0, 1, 1, 2, 3, 3]')}</p><p><b>Why:</b> the third and fourth 1 (${H.c('r', 'red')}) would exceed two copies.</p>`,
    brute: {
      why: `<p>Count copies with a running counter and, on a third copy, shift the whole tail left: O(N) per removal → O(N<sup>2</sup>). The waste: elements are moved many times instead of being written once to their final slot.</p>`,
      code: `
        int brute(int[] nums) {
            int n = nums.length, i = 2;
            while (i < n) {
                if (nums[i] == nums[i - 1] && nums[i] == nums[i - 2]) {
                    for (int j = i; j + 1 < n; j++) nums[j] = nums[j + 1];   // shift tail left
                    n--;
                } else {
                    i++;
                }
            }
            return Math.min(n, nums.length);
        }`
    },
    mcq: {
      q: `With slow = next free slot, which comparison decides whether nums[fast] is a third copy?`,
      options: [`nums[fast] == nums[fast - 1]`, `nums[fast] == nums[slow - 2]`, `nums[fast] == nums[slow]`, `nums[fast] == nums[fast - 2]`],
      answer: 1,
      explain: `Compare with the KEPT zone: if the value two slots back in the kept zone equals nums[fast], keeping it would make three copies. Comparing with fast - 2 reads cells that may already have been overwritten.`
    },
    hints: [
      `<p><b>Aha:</b> because the array is sorted, the kept zone is sorted too; a value is a third copy exactly when it equals the value <b>two slots back</b> in the kept zone.</p>`,
      `<p>Read/write pointers: <code>slow</code> = next free slot. For every fast: if <code>slow &lt; 2</code> or <code>nums[fast] != nums[slow - 2]</code> → <code>nums[slow++] = nums[fast]</code>.</p>`,
      `<p><b>Traps:</b> compare with <code>nums[slow - 2]</code>, not <code>nums[fast - 2]</code> (that cell may be overwritten); the first two elements are always kept. <b>Recipe:</b> generalises to "at most k copies" by replacing 2 with k.</p>`
    ],
    solution: {
      approach: `<p>Read/write template with keep rule "not equal to the value two places back in the kept zone".</p>`,
      code: `
        class Solution {
            public int removeDuplicates(int[] nums) {
                int slow = 0;                                     // next free slot
                for (int fast = 0; fast < nums.length; fast++) {
                    if (slow < 2 || nums[fast] != nums[slow - 2]) {
                        nums[slow++] = nums[fast];                // keep it (at most 2nd copy)
                    }
                }
                return slow;
            }
        }`,
      dry: {
        head: ['fast', 'val', 'nums[slow-2]', 'keep?', 'slow after'],
        rows: [['0,1', '0, 0', '—', 'yes (slow &lt; 2)', '2'], ['2,3', '1, 1', '0, 0', 'yes', '4'], ['4', '1', '1', H.c('r', 'no'), '4'], ['5', '1', '1', H.c('r', 'no'), '4'], ['6', '2', '1', 'yes', '5'], ['7,8', '3, 3', '1, 2', 'yes', H.c('p', '7')]]
      },
      complexity: `<p><b>Time O(N)</b>, <b>Space O(1)</b>.</p>`,
      followUps: ['Keep at most k copies.', 'Same problem on a sorted linked list.']
    }
  });

  practice.push({
    title: 'Max Consecutive Ones III (flip at most K zeros)',
    level: 'Medium',
    tags: ['sliding window', 'variable size', 'longest'],
    companies: ['Meta', 'Google', 'Amazon'],
    statement: `<p>Given a binary array <code>nums</code> and an integer <code>k</code>, return the maximum number of consecutive <code>1</code>s you can get if you may flip <b>at most</b> <code>k</code> zeros into ones.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, nums[i] ∈ {0, 1}, 0 ≤ k ≤ N`,
    example: `${H.arr([1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], { label: 'nums', hl: { 5: 'y', 6: 'p', 7: 'p', 8: 'p', 9: 'p', 10: 'y' } })}<p>k = 2 → ${H.c('p', '6')}</p><p><b>Why:</b> flip the zeros at index 5 and 10 → indices 5..10 are all ones (length 6). Rephrased: the longest window containing <b>at most 2 zeros</b>.</p>`,
    brute: {
      why: `<p>For every start, extend while the zero count ≤ k: O(N<sup>2</sup>) = 10<sup>10</sup> in the worst case. The waste: when the start moves by one, we re-scan almost the same window.</p>`,
      code: `
        int brute(int[] nums, int k) {
            int best = 0;
            for (int i = 0; i < nums.length; i++) {
                int zeros = 0;
                for (int j = i; j < nums.length; j++) {
                    if (nums[j] == 0) zeros++;
                    if (zeros > k) break;
                    best = Math.max(best, j - i + 1);
                }
            }
            return best;
        }`
    },
    mcq: {
      q: `Which template flavour fits "longest window with at most k zeros"?`,
      options: [`Shrink while good, record inside the loop`, `Shrink while bad (zeros &gt; k), record after the loop`, `Fixed window of size k`, `Opposite pointers`],
      answer: 1,
      explain: `"At most k" is monotone (any smaller window is also fine), so it is the longest flavour: fix the window when it breaks the rule, then record its length.`
    },
    hints: [
      `<p><b>Aha:</b> "flip at most k zeros" = "find the longest window that contains at most k zeros". The flipping never really happens.</p>`,
      `<p>Variable window with a zero counter: grow R (count zeros), while zeros &gt; k move L forward (uncount zeros), then best = max(best, R - L + 1).</p>`,
      `<p><b>Traps:</b> k = 0 means the longest run of real ones; k ≥ number of zeros means the whole array. Expert variant: use <code>if</code> instead of <code>while</code> — the window never shrinks and the answer is <code>n - L</code>.</p>`
    ],
    solution: {
      approach: `<p>Longest-flavour sliding window that keeps the zero count ≤ k.</p>`,
      code: `
        class Solution {
            public int longestOnes(int[] nums, int k) {
                int L = 0, zeros = 0, best = 0;
                for (int R = 0; R < nums.length; R++) {
                    if (nums[R] == 0) zeros++;                 // grow
                    while (zeros > k) {                        // bad -> shrink
                        if (nums[L] == 0) zeros--;
                        L++;
                    }
                    best = Math.max(best, R - L + 1);          // good again: record
                }
                return best;
            }
        }`,
      dry: {
        head: ['R', 'val', 'zeros', 'shrink', 'L', 'len', 'best'],
        rows: [['0..4', '1,1,1,0,0', '2', '—', '0', '5', '5'], ['5', '0', '3', 'drop 1,1,1,0 → zeros 2', '4', '2', '5'], ['6..9', '1,1,1,1', '2', '—', '4', '6', H.c('p', '6')], ['10', '0', '3', 'drop 0 → zeros 2', '5', '6', '6']]
      },
      complexity: `<p><b>Time O(N)</b> (amortised: L and R each move ≤ N times), <b>Space O(1)</b>.</p>`,
      followUps: ['Longest Repeating Character Replacement (letters instead of bits).', 'Return the indices to flip.']
    }
  });

  // =====================================================================
  // PRACTICE ARENA — Medium (part 2)
  // =====================================================================
  practice.push({
    title: 'Subarray Product Less Than K',
    level: 'Medium',
    tags: ['sliding window', 'counting'],
    companies: ['Amazon', 'Google', 'Yatra'],
    statement: `<p>Given an array of <b>positive</b> integers <code>nums</code> and an integer <code>k</code>, return the number of contiguous subarrays whose product is <b>strictly less</b> than <code>k</code>.</p>`,
    constraints: `1 ≤ N ≤ 3·10<sup>4</sup>, 1 ≤ nums[i] ≤ 1000, 0 ≤ k ≤ 10<sup>6</sup>`,
    example: `${H.arr([10, 5, 2, 6], { label: 'nums' })}<p>k = 100 → ${H.c('p', '8')}</p><p><b>Why:</b> [10], [5], [2], [6], [10,5], [5,2], [2,6], [5,2,6] all have product &lt; 100; ${H.c('r', '[10,5,2] = 100')} is not strictly less.</p>`,
    brute: {
      why: `<p>For each start, multiply forward until the product reaches k: O(N<sup>2</sup>) ≈ 9·10<sup>8</sup> for N = 3·10<sup>4</sup> in the worst case (all ones). The waste: products of overlapping windows are rebuilt from scratch.</p>`,
      code: `
        int brute(int[] nums, int k) {
            int count = 0;
            for (int i = 0; i < nums.length; i++) {
                long prod = 1;
                for (int j = i; j < nums.length; j++) {
                    prod *= nums[j];
                    if (prod >= k) break;      // positives: product only grows
                    count++;
                }
            }
            return count;
        }`
    },
    mcq: {
      q: `After shrinking, the window is nums[L..R] with product &lt; k. How many NEW valid subarrays end at R?`,
      options: [`1`, `R - L + 1`, `R + 1`, `(R - L + 1) × (R - L + 2) / 2`],
      answer: 1,
      explain: `Every subarray ending at R that starts anywhere in L..R is a piece of a valid window, so its product is also &lt; k (positives). That is R - L + 1 subarrays, each counted exactly once (by its right end).`
    },
    hints: [
      `<p><b>Aha:</b> with positive numbers, shrinking a window can only lower its product, so "product &lt; k" is monotone → count flavour of the variable window.</p>`,
      `<p>Keep a running product; grow with <code>prod *= nums[R]</code>; while <code>prod ≥ k</code> divide by <code>nums[L]</code> and move L; then add <code>R - L + 1</code>.</p>`,
      `<p><b>Traps:</b> if <code>k ≤ 1</code> return 0 immediately (no positive product is &lt; 1, and the shrink loop would run L past R); use <code>long</code> or keep the product below k so it never overflows. <b>Recipe:</b> L = 0, prod = 1 → for R: prod *= a[R]; while prod ≥ k: prod /= a[L++]; count += R - L + 1.</p>`
    ],
    solution: {
      approach: `<p>Count-flavour sliding window: each right end R contributes R - L + 1 subarrays once the window is valid.</p>`,
      code: `
        class Solution {
            public int numSubarrayProductLessThanK(int[] nums, int k) {
                if (k <= 1) return 0;                   // nothing positive is < 1
                long prod = 1;
                int L = 0, count = 0;
                for (int R = 0; R < nums.length; R++) {
                    prod *= nums[R];                    // grow
                    while (prod >= k) prod /= nums[L++];   // shrink while bad (exact division)
                    count += R - L + 1;                 // all valid subarrays ending at R
                }
                return count;
            }
        }`,
      dry: {
        head: ['R', 'val', 'prod after grow', 'shrink', 'L', 'added', 'count'],
        rows: [['0', '10', '10', '—', '0', '1', '1'], ['1', '5', '50', '—', '0', '2', '3'], ['2', '2', '100', '÷10 → 10', '1', '2', '5'], ['3', '6', '60', '—', '1', '3', H.c('p', '8')]]
      },
      complexity: `<p><b>Time O(N)</b>, <b>Space O(1)</b>.</p>`,
      followUps: ['What if zeros or negatives are allowed? (Monotonicity breaks — use logs/prefix ideas or case analysis.)', 'Count subarrays with sum &lt; k for positive numbers.']
    }
  });

  practice.push({
    title: 'Maximum Points You Can Obtain from Cards',
    level: 'Medium',
    tags: ['sliding window', 'fixed size', 'complement'],
    companies: ['Google', 'Amazon', 'Uber'],
    statement: `<p>Cards are in a row with points <code>cardPoints[i]</code>. In one move you take a card from the <b>beginning or the end</b> of the row. You must take exactly <code>k</code> cards. Return the maximum total points.</p>`,
    constraints: `1 ≤ k ≤ N ≤ 10<sup>5</sup>, 1 ≤ cardPoints[i] ≤ 10<sup>4</sup>`,
    example: `${H.arr([1, 2, 3, 4, 5, 6, 1], { label: 'cards', hl: { 0: 'm', 1: 'm', 2: 'm', 3: 'm', 4: 'g', 5: 'g', 6: 'g' } })}<p>k = 3 → ${H.c('p', '12')}</p><p><b>Why:</b> take ${H.c('g', '5, 6, 1')} from the right end. Equivalently, the cards you <b>leave</b> form one contiguous middle window of size N - k = 4; leaving the cheapest window ${H.c('m', '[1,2,3,4] = 10')} gives 22 - 10 = 12.</p>`,
    brute: {
      why: `<p>Recursion "take left or take right" explores 2<sup>k</sup> sequences — hopeless. Even the smarter "try every split: i from the left, k - i from the right, summing each time" is O(k<sup>2</sup>) without running sums. The insight: whichever cards you take, the rest is a contiguous window.</p>`,
      code: `
        int brute(int[] c, int k) {
            int n = c.length, best = 0;
            for (int left = 0; left <= k; left++) {          // take 'left' from front, k-left from back
                int sum = 0;
                for (int i = 0; i < left; i++) sum += c[i];
                for (int i = 0; i < k - left; i++) sum += c[n - 1 - i];
                best = Math.max(best, sum);
            }
            return best;
        }`
    },
    mcq: {
      q: `Taking k cards from the two ends is the same as…`,
      options: [`Taking the k largest cards`, `Leaving a contiguous middle window of N - k cards with the smallest sum`, `Sorting the cards first`, `A variable-size window`],
      answer: 1,
      explain: `The untouched cards are always one contiguous block in the middle. Maximising what you take = minimising that block, a fixed window of size N - k.`
    },
    hints: [
      `<p><b>Aha:</b> flip the view — the cards you do NOT take form one contiguous window of length <code>N - k</code>. Minimise its sum.</p>`,
      `<p>Fixed sliding window of size <code>w = N - k</code>: running sum, track the minimum; answer = total - minimum.</p>`,
      `<p><b>Traps:</b> when k == N the window has size 0 — the answer is the total (handle it so you do not slide an empty window); greedy "take the larger end each time" is WRONG: [1, 1000, 2, 3] with k = 2 → greedy takes 3 then 2 = 5, but 1 + 1000 = 1001. <b>Recipe:</b> total = sum; w = n - k; win = sum of first w; min = win; slide; return total - min.</p>`
    ],
    solution: {
      approach: `<p>Complement trick + fixed-size window of length N - k.</p>`,
      code: `
        class Solution {
            public int maxScore(int[] cardPoints, int k) {
                int n = cardPoints.length, w = n - k;     // size of the untouched middle window
                int total = 0;
                for (int x : cardPoints) total += x;
                if (w == 0) return total;                 // take everything
                int win = 0;
                for (int i = 0; i < w; i++) win += cardPoints[i];
                int minWin = win;
                for (int i = w; i < n; i++) {
                    win += cardPoints[i] - cardPoints[i - w];   // slide
                    minWin = Math.min(minWin, win);
                }
                return total - minWin;
            }
        }`,
      dry: {
        head: ['window', 'sum', 'min', 'total - min'],
        rows: [['[1,2,3,4]', '10', '10', '12'], ['[2,3,4,5]', '14', '10', '—'], ['[3,4,5,6]', '18', '10', '—'], ['[4,5,6,1]', '16', '10', H.c('p', '12')]]
      },
      complexity: `<p><b>Time O(N)</b>, <b>Space O(1)</b>. (A direct O(k) version slides a window "around the corner": start with the first k cards and swap one front card for one back card at a time.)</p>`,
      followUps: ['Write the O(k) wrap-around version.', 'What if you may take at most k cards?']
    }
  });

  practice.push({
    title: 'Boats to Save People',
    level: 'Medium',
    tags: ['two pointers', 'greedy', 'sorting'],
    companies: ['Amazon', 'Google'],
    statement: `<p><code>people[i]</code> is the weight of person i. Each boat carries <b>at most two people</b> with total weight ≤ <code>limit</code>. Every person weighs at most <code>limit</code>. Return the minimum number of boats needed.</p>`,
    constraints: `1 ≤ N ≤ 5·10<sup>4</sup>, 1 ≤ people[i] ≤ limit ≤ 3·10<sup>4</sup>`,
    example: `<p>people = [3, 2, 2, 1], limit = 3 → ${H.c('p', '3')}</p><p><b>Why:</b> sorted [1, 2, 2, 3]: ${H.c('g', '(1, 2)')} share a boat (3 ≤ 3), ${H.c('b', '(2)')} alone, ${H.c('b', '(3)')} alone. Nobody can pair with 3 (even 1 + 3 = 4 &gt; 3).</p>`,
    brute: {
      why: `<p>Try all ways to pair people (a matching problem): exponential. A simpler greedy "pair each person with the heaviest partner that fits" via repeated scanning is O(N<sup>2</sup>). Sorting + two pointers gives O(N log N).</p>`,
      code: `
        int brute(int[] people, int limit) {
            int n = people.length, boats = 0;
            boolean[] used = new boolean[n];
            Integer[] idx = new Integer[n];
            for (int i = 0; i < n; i++) idx[i] = i;
            Arrays.sort(idx, (a, b) -> people[b] - people[a]);      // heaviest first
            for (int a = 0; a < n; a++) {
                int i = idx[a];
                if (used[i]) continue;
                used[i] = true;
                int bestJ = -1;
                for (int b = a + 1; b < n; b++) {                   // heaviest partner that fits
                    int j = idx[b];
                    if (!used[j] && people[i] + people[j] <= limit) { bestJ = j; break; }
                }
                if (bestJ >= 0) used[bestJ] = true;
                boats++;
            }
            return boats;
        }`
    },
    mcq: {
      q: `The heaviest remaining person cannot share a boat with the lightest. What is the best move?`,
      options: [`Put the lightest alone`, `Put the heaviest alone (R--) — nobody else can pair with them either`, `Skip both`, `Sort again`],
      answer: 1,
      explain: `If even the lightest person is too heavy a partner, every other partner is heavier — the heaviest person needs a boat alone. That is the "too big → R--" rule of opposite pointers.`
    },
    hints: [
      `<p><b>Aha:</b> the heaviest person should try to share with the lightest. If even that fails, the heaviest rides alone.</p>`,
      `<p>Sort; L = 0 (lightest), R = n - 1 (heaviest). Each iteration launches one boat with person R; if <code>people[L] + people[R] ≤ limit</code>, L also boards.</p>`,
      `<p><b>Traps:</b> loop while <code>L ≤ R</code> (the last single person still needs a boat); at most two per boat, so do not try to add a third. <b>Proof idea:</b> exchange argument — if an optimal plan pairs the lightest with someone else, swapping partners never increases boats.</p>`
    ],
    solution: {
      approach: `<p>Greedy with opposite pointers after sorting: every boat takes the heaviest remaining person, plus the lightest if they fit.</p>`,
      code: `
        class Solution {
            public int numRescueBoats(int[] people, int limit) {
                Arrays.sort(people);
                int L = 0, R = people.length - 1, boats = 0;
                while (L <= R) {
                    if (people[L] + people[R] <= limit) L++;   // lightest joins the heaviest
                    R--;                                       // heaviest always leaves on this boat
                    boats++;
                }
                return boats;
            }
        }`,
      dry: {
        head: ['L (w)', 'R (w)', 'sum ≤ 3?', 'boat', 'boats'],
        rows: [['0 (1)', '3 (3)', '4 → no', '[3]', '1'], ['0 (1)', '2 (2)', '3 → yes', '[1, 2]', '2'], ['1 (2)', '1 (2)', 'same person', '[2]', H.c('p', '3')]]
      },
      complexity: `<p><b>Time O(N log N)</b> for sorting (counting sort on weights makes it O(N + limit)); <b>Space O(1)</b> extra.</p>`,
      followUps: ['Boats can carry any number of people (becomes bin packing — NP-hard).', 'Prove the greedy with an exchange argument.']
    }
  });

  practice.push({
    title: 'Count Number of Nice Subarrays (exactly K odd numbers)',
    level: 'Medium',
    tags: ['sliding window', 'exactly K', 'at most trick'],
    companies: ['Amazon', 'Microsoft'],
    statement: `<p>A subarray is <b>nice</b> if it contains <b>exactly</b> <code>k</code> odd numbers. Given an integer array <code>nums</code> and <code>k</code>, return the number of nice subarrays.</p>`,
    constraints: `1 ≤ N ≤ 5·10<sup>4</sup>, 1 ≤ nums[i] ≤ 10<sup>5</sup>, 1 ≤ k ≤ N`,
    example: `${H.arr([1, 1, 2, 1, 1], { label: 'nums', hl: { 0: 'y', 1: 'y', 3: 'y', 4: 'y' } })}<p>k = 3 → ${H.c('p', '2')}</p><p><b>Why:</b> ${H.c('g', '[1,1,2,1]')} and ${H.c('g', '[1,2,1,1]')} contain exactly three odd numbers. Via the trick: atMost(3) = 14, atMost(2) = 12, 14 − 12 = 2.</p>`,
    brute: {
      why: `<p>Check every subarray, counting odds as you extend: O(N<sup>2</sup>) ≈ 2.5·10<sup>9</sup> for N = 5·10<sup>4</sup>. A window cannot count "exactly k" directly because a valid window can be extended by even numbers on both sides in many ways.</p>`,
      code: `
        int brute(int[] nums, int k) {
            int count = 0;
            for (int i = 0; i < nums.length; i++) {
                int odd = 0;
                for (int j = i; j < nums.length; j++) {
                    odd += nums[j] & 1;
                    if (odd == k) count++;
                    else if (odd > k) break;
                }
            }
            return count;
        }`
    },
    mcq: {
      q: `Why compute atMost(k) − atMost(k − 1) instead of counting "exactly k" with one window?`,
      options: [`It is faster than O(N)`, `"At most k" is monotone (shrinking keeps it true), so the count flavour works; "exactly k" is not monotone`, `Because k can be 0`, `Because the array has negatives`],
      answer: 1,
      explain: `Windows with at most k odds can be counted with R - L + 1 per right end. Subtracting those with at most k - 1 leaves exactly the windows with k odds.`
    },
    hints: [
      `<p><b>Aha:</b> exactly(k) = atMost(k) − atMost(k − 1). Each "at most" count is an easy count-flavour window.</p>`,
      `<p>atMost(k): grow R, add 1 if nums[R] is odd; while odd &gt; k shrink L; count += R - L + 1. Call it twice.</p>`,
      `<p><b>Traps:</b> the answer can reach N<sup>2</sup>/2 ≈ 1.25·10<sup>9</sup> — still fits in <code>int</code> here but use <code>long</code> inside to be safe; atMost(-1) must return 0 (k ≥ 1 so k − 1 ≥ 0 here). <b>Alternative:</b> prefix count of odds + HashMap (same as "subarray sum equals k" on a 0/1 array).</p>`
    ],
    solution: {
      approach: `<p>Exactly-K via two at-most windows.</p>`,
      code: `
        class Solution {
            public int numberOfSubarrays(int[] nums, int k) {
                return (int) (atMost(nums, k) - atMost(nums, k - 1));
            }

            private long atMost(int[] nums, int k) {
                if (k < 0) return 0;
                long count = 0;
                int L = 0, odd = 0;
                for (int R = 0; R < nums.length; R++) {
                    odd += nums[R] & 1;                       // 1 if odd
                    while (odd > k) odd -= nums[L++] & 1;     // shrink while bad
                    count += R - L + 1;                       // windows ending at R with <= k odds
                }
                return count;
            }
        }`,
      dry: {
        head: ['R', 'odd (k=3)', 'L', '+ (at most 3)', 'odd (k=2)', 'L', '+ (at most 2)'],
        rows: [['0', '1', '0', '1', '1', '0', '1'], ['1', '2', '0', '2', '2', '0', '2'], ['2', '2', '0', '3', '2', '0', '3'], ['3', '3', '0', '4', '3→2', '1', '3'], ['4', '4→3', '1', '4', '3→2', '2', '3'], ['total', '', '', '14', '', '', '12 → answer ' + H.c('p', '14 − 12 = 2')]]
      },
      complexity: `<p><b>Time O(N)</b> (two linear passes), <b>Space O(1)</b>.</p>`,
      followUps: ['Binary Subarrays With Sum (LeetCode 930) — same trick.', 'Subarrays with K Different Integers (Hard, in this arena).']
    }
  });

  // =====================================================================
  // PRACTICE ARENA — Hard
  // =====================================================================
  practice.push({
    title: 'Trapping Rain Water (O(1) memory)',
    level: 'Hard',
    tags: ['two pointers', 'prefix max', 'opposite direction'],
    companies: ['Amazon', 'Google', 'Goldman Sachs', 'Meta'],
    statement: `<p>Given <code>n</code> non-negative integers representing an elevation map where each bar has width 1, compute how much water is trapped after it rains. Solve it with <b>O(1) extra memory</b>.</p>`,
    constraints: `1 ≤ n ≤ 2·10<sup>4</sup>, 0 ≤ height[i] ≤ 10<sup>5</sup>`,
    example: `${H.arr([4, 2, 0, 3, 2, 5], { label: 'height', hl: { 1: 'b', 2: 'b', 3: 'b', 4: 'b' } })}<p>Output ${H.c('p', '9')}</p><p><b>Why:</b> water above bar i = min(highest bar on its left, highest on its right) − height[i]. Bars 1..4 hold ${H.c('b', '2 + 4 + 1 + 2 = 9')} (the level is 4, capped by the left wall 4).</p>`,
    brute: {
      why: `<p>For every bar, scan left and right for the tallest bars: O(n<sup>2</sup>). The prefix-max / suffix-max arrays fix the time (O(n)) but cost O(n) memory. The waste in both: we compute full maxima on both sides, but only the <b>smaller</b> side matters.</p>`,
      code: `
        int brute(int[] h) {
            int n = h.length, water = 0;
            for (int i = 0; i < n; i++) {
                int lmax = 0, rmax = 0;
                for (int j = 0; j <= i; j++) lmax = Math.max(lmax, h[j]);
                for (int j = i; j < n; j++) rmax = Math.max(rmax, h[j]);
                water += Math.min(lmax, rmax) - h[i];
            }
            return water;
        }`
    },
    mcq: {
      q: `h[L] &lt; h[R]. Why can we settle the water at L using only leftMax?`,
      options: [`Because leftMax is always bigger`, `Because some bar on the right (h[R]) is already taller than h[L]'s side limit, so the right side will never be the cap — leftMax decides`, `Because water only flows left`, `It is a guess that usually works`],
      answer: 1,
      explain: `The level at L is min(leftMax, true right maximum). Every bar that built leftMax was moved only because it was lower than a bar that sits to the right of the current L, so the true right maximum is at least leftMax. The minimum is therefore leftMax — no need to know the exact right maximum.`
    },
    hints: [
      `<p><b>Aha:</b> water at i = min(maxLeft, maxRight) − h[i]. You only need the <b>smaller</b> of the two maxima — and whichever side has the lower current wall is guaranteed to be the smaller side.</p>`,
      `<p>Opposite pointers L, R with running <code>leftMax</code>, <code>rightMax</code>. If <code>h[L] &lt; h[R]</code>: update leftMax, add <code>leftMax − h[L]</code>, L++. Else do the same on the right.</p>`,
      `<p><b>Traps:</b> update the max <b>before</b> adding (so water is never negative); total can reach 2·10<sup>4</sup> × 10<sup>5</sup> = 2·10<sup>9</sup> → use <code>long</code> to be safe; n &lt; 3 traps nothing. <b>Recipe:</b> exactly like Container With Most Water — move the shorter side — but accumulate per bar.</p>`
    ],
    solution: {
      approach: `<p>Two pointers moving the lower side inward; that side's running max is the true water level.</p>`,
      code: `
        class Solution {
            public int trap(int[] height) {
                int L = 0, R = height.length - 1;
                int leftMax = 0, rightMax = 0;
                long water = 0;
                while (L < R) {
                    if (height[L] < height[R]) {
                        leftMax = Math.max(leftMax, height[L]);   // right side has a taller wall
                        water += leftMax - height[L];             // so leftMax caps the level here
                        L++;
                    } else {
                        rightMax = Math.max(rightMax, height[R]); // left side has a wall >= this one
                        water += rightMax - height[R];
                        R--;
                    }
                }
                return (int) water;
            }
        }`,
      alt: [{ lang: 'python', code: `class Solution:
    def trap(self, height):
        L, R = 0, len(height) - 1
        left_max = right_max = water = 0
        while L < R:
            if height[L] < height[R]:
                left_max = max(left_max, height[L])
                water += left_max - height[L]
                L += 1
            else:
                right_max = max(right_max, height[R])
                water += right_max - height[R]
                R -= 1
        return water` }],
      dry: {
        head: ['L (h)', 'R (h)', 'lower side', 'max', 'water added', 'total'],
        rows: [['0 (4)', '5 (5)', 'left', 'leftMax 4', '0', '0'], ['1 (2)', '5 (5)', 'left', '4', '2', '2'], ['2 (0)', '5 (5)', 'left', '4', '4', '6'], ['3 (3)', '5 (5)', 'left', '4', '1', '7'], ['4 (2)', '5 (5)', 'left', '4', '2', H.c('p', '9')]]
      },
      complexity: `<p><b>Time O(n)</b>, <b>Space O(1)</b>.</p>`,
      followUps: ['Solve it with a monotonic stack (computes water layer by layer).', 'Trapping Rain Water II on a 2D grid (needs a heap + BFS).']
    }
  });

  practice.push({
    title: 'Minimum Window Substring',
    level: 'Hard',
    tags: ['sliding window', 'variable size', 'shortest', 'counting'],
    companies: ['Meta', 'Amazon', 'LinkedIn', 'Uber'],
    statement: `<p>Given strings <code>s</code> and <code>t</code>, return the <b>shortest substring</b> of <code>s</code> that contains every character of <code>t</code> (including duplicates). If none exists return "". The answer is unique.</p>`,
    constraints: `1 ≤ |s|, |t| ≤ 10<sup>5</sup>, ASCII letters`,
    example: `<p>s = "ADOBECODE${H.c('p', 'BANC')}", t = "ABC" → ${H.c('p', '"BANC"')}</p><p><b>Why:</b> "ADOBEC" (length 6) also contains A, B and C, but "BANC" (length 4) is the shortest such window.</p>`,
    brute: {
      why: `<p>Check every substring (O(n<sup>2</sup>) of them) and test whether it covers t: O(n<sup>2</sup> · 52) — far too slow for 10<sup>5</sup>. The waste: windows that share almost all characters are re-counted from scratch.</p>`,
      code: `
        String brute(String s, String t) {
            String best = "";
            for (int i = 0; i < s.length(); i++) {
                int[] cnt = new int[128];
                for (char c : t.toCharArray()) cnt[c]++;
                int missing = t.length();
                for (int j = i; j < s.length(); j++) {
                    if (cnt[s.charAt(j)]-- > 0) missing--;
                    if (missing == 0) {
                        if (best.isEmpty() || j - i + 1 < best.length()) best = s.substring(i, j + 1);
                        break;                       // longer windows from i are worse
                    }
                }
            }
            return best;
        }`
    },
    mcq: {
      q: `Which template flavour is this?`,
      options: [`Longest: shrink while bad`, `Shortest: grow until the window covers t, then shrink while it still covers t, recording inside`, `Fixed window of size |t|`, `Opposite pointers`],
      answer: 1,
      explain: `"Covers t" is monotone upward (a bigger window still covers t), so it is the shortest flavour — exactly like smallest subarray with sum ≥ K, with a count array instead of a sum.`
    },
    hints: [
      `<p><b>Aha:</b> replace "sum ≥ K" by "window covers t". Keep <code>need[c]</code> = how many more copies of c the window needs, and <code>missing</code> = total characters still needed.</p>`,
      `<p>Grow R: if <code>need[s[R]] &gt; 0</code> then missing--; then need[s[R]]--. While missing == 0: record, then give back s[L]: need[s[L]]++; if it becomes &gt; 0, missing++; L++.</p>`,
      `<p><b>Traps:</b> duplicates in t ("AA" needs two A's) — the count array handles it; record the start and length, not the substring, inside the loop (substring copies cost O(n)); characters not in t go negative in need[], which is fine. Full HashMap-based treatment is in the Hashing module.</p>`
    ],
    solution: {
      approach: `<p>Shortest-flavour sliding window with a need[] count array and a missing counter.</p>`,
      code: `
        class Solution {
            public String minWindow(String s, String t) {
                int[] need = new int[128];
                for (char c : t.toCharArray()) need[c]++;
                int missing = t.length(), L = 0, bestL = 0, bestLen = Integer.MAX_VALUE;
                for (int R = 0; R < s.length(); R++) {
                    char c = s.charAt(R);
                    if (need[c] > 0) missing--;          // this char was still needed
                    need[c]--;                           // grow
                    while (missing == 0) {               // window covers t -> shrink
                        if (R - L + 1 < bestLen) { bestLen = R - L + 1; bestL = L; }
                        char d = s.charAt(L++);
                        need[d]++;                       // give d back
                        if (need[d] > 0) missing++;      // now we lack a needed char
                    }
                }
                return bestLen == Integer.MAX_VALUE ? "" : s.substring(bestL, bestL + bestLen);
            }
        }`,
      dry: {
        head: ['R (char)', 'missing', 'shrinking records', 'best'],
        rows: [['5 (C)', '0', '"ADOBEC" len 6; drop A → missing 1', '"ADOBEC"'], ['10 (A)', '0', '"DOBECODEBA" shrinks to "CODEBA" (len 6, not shorter); drop C → missing 1', '"ADOBEC"'], ['12 (C)', '0', '"ODEBANC" → "EBANC" len 5 → "BANC" len 4; drop B → missing 1', H.c('p', '"BANC"')]]
      },
      complexity: `<p><b>Time O(|s| + |t|)</b>, <b>Space O(1)</b> (a 128-slot array).</p>`,
      followUps: ['Return the count of minimal windows.', 'Minimum window subsequence (order matters) — needs DP or a two-pass scan.']
    }
  });

  practice.push({
    title: 'Subarrays with K Different Integers',
    level: 'Hard',
    tags: ['sliding window', 'exactly K', 'at most trick'],
    companies: ['Amazon', 'Google'],
    statement: `<p>Given an integer array <code>nums</code> and an integer <code>k</code>, return the number of <b>good</b> subarrays: contiguous subarrays with <b>exactly</b> <code>k</code> different integers.</p>`,
    constraints: `1 ≤ N ≤ 2·10<sup>4</sup>, 1 ≤ nums[i], k ≤ N`,
    example: `${H.arr([1, 2, 1, 2, 3], { label: 'nums' })}<p>k = 2 → ${H.c('p', '7')}</p><p><b>Why:</b> [1,2], [2,1], [1,2], [2,3], [1,2,1], [2,1,2], [1,2,1,2]. Via the trick: atMost(2) = 12, atMost(1) = 5 → 12 − 5 = 7.</p>`,
    brute: {
      why: `<p>For every start, extend and track distinct values with a set: O(N<sup>2</sup>) = 4·10<sup>8</sup> set operations — too slow. "Exactly k" is not monotone (adding an element can keep it at k or push it to k + 1), so a single window cannot count it.</p>`,
      code: `
        int brute(int[] nums, int k) {
            int count = 0;
            for (int i = 0; i < nums.length; i++) {
                Set<Integer> seen = new HashSet<>();
                for (int j = i; j < nums.length; j++) {
                    seen.add(nums[j]);
                    if (seen.size() == k) count++;
                    else if (seen.size() > k) break;
                }
            }
            return count;
        }`
    },
    mcq: {
      q: `atMost(k) counts 12 windows, atMost(k − 1) counts 5. What does 12 − 5 represent?`,
      options: [`Windows with fewer than k distinct values`, `Windows with exactly k distinct values`, `Windows with more than k distinct values`, `Nothing useful`],
      answer: 1,
      explain: `Windows with at most k distinct values minus those with at most k − 1 leaves precisely the ones with exactly k.`
    },
    hints: [
      `<p><b>Aha:</b> exactly(k) = atMost(k) − atMost(k − 1), and "at most k distinct" is monotone (a sub-window has no more distinct values).</p>`,
      `<p>atMost(k): a count array <code>cnt[value]</code> (values ≤ N, so an int[] works — no HashMap needed) and a <code>distinct</code> counter. Grow R; while distinct &gt; k shrink L; add R − L + 1.</p>`,
      `<p><b>Traps:</b> increment <code>distinct</code> only when a count goes 0 → 1, decrement only when it goes 1 → 0; reset the count array between the two calls; use <code>long</code> for counts. <b>Alternative:</b> one pass with two left pointers (the "three pointers" trick).</p>`
    ],
    solution: {
      approach: `<p>Two at-most windows with a counting array.</p>`,
      code: `
        class Solution {
            public int subarraysWithKDistinct(int[] nums, int k) {
                return (int) (atMost(nums, k) - atMost(nums, k - 1));
            }

            private long atMost(int[] nums, int k) {
                if (k <= 0) return 0;
                int[] cnt = new int[nums.length + 1];    // values are 1..N
                long total = 0;
                int L = 0, distinct = 0;
                for (int R = 0; R < nums.length; R++) {
                    if (cnt[nums[R]]++ == 0) distinct++;          // new value enters
                    while (distinct > k) {
                        if (--cnt[nums[L]] == 0) distinct--;       // a value fully leaves
                        L++;
                    }
                    total += R - L + 1;                           // windows ending at R
                }
                return total;
            }
        }`,
      dry: {
        head: ['R', 'val', 'atMost(2): L, +', 'running', 'atMost(1): L, +', 'running'],
        rows: [['0', '1', '0, +1', '1', '0, +1', '1'], ['1', '2', '0, +2', '3', '1, +1', '2'], ['2', '1', '0, +3', '6', '2, +1', '3'], ['3', '2', '0, +4', '10', '3, +1', '4'], ['4', '3', '3, +2', '12', '4, +1', '5 → answer ' + H.c('p', '7')]]
      },
      complexity: `<p><b>Time O(N)</b>, <b>Space O(N)</b> for the count array.</p>`,
      followUps: ['Longest substring with at most k distinct characters.', 'Do it in one pass with two left pointers.']
    }
  });

  practice.push({
    title: 'Shortest Subarray with Sum at Least K (negatives allowed)',
    level: 'Hard',
    tags: ['prefix sums', 'monotonic deque', 'when windows fail'],
    companies: ['Google', 'Amazon', 'Goldman Sachs'],
    statement: `<p>Given an integer array <code>nums</code> (values may be <b>negative</b>) and an integer <code>k</code>, return the length of the shortest non-empty contiguous subarray with sum <b>at least</b> <code>k</code>, or <code>-1</code> if none exists.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, -10<sup>5</sup> ≤ nums[i] ≤ 10<sup>5</sup>, 1 ≤ k ≤ 10<sup>9</sup>`,
    example: `<p>nums = [1, -1, 5], k = 5 → ${H.c('p', '1')} (just ${H.c('g', '[5]')}).</p><p><b>Why the plain window fails:</b> it grows to [1, -1, 5] (sum 5), drops the 1 → sum 4 &lt; 5 and stops; it never drops the -1, which would have <b>raised</b> the sum. It would answer ${H.c('r', '3')}.</p>`,
    brute: {
      why: `<p>All pairs (i, j) with prefix sums: O(N<sup>2</sup>) = 10<sup>10</sup>. The sliding window is O(N) but wrong with negatives (goodness is not monotone). We need prefix sums plus a smarter way to discard useless starting points.</p>`,
      code: `
        int brute(int[] nums, int k) {
            int n = nums.length, best = Integer.MAX_VALUE;
            long[] P = new long[n + 1];
            for (int i = 0; i < n; i++) P[i + 1] = P[i] + nums[i];
            for (int i = 0; i < n; i++)
                for (int j = i + 1; j <= n; j++)
                    if (P[j] - P[i] >= k) { best = Math.min(best, j - i); break; }
            return best == Integer.MAX_VALUE ? -1 : best;
        }`
    },
    mcq: {
      q: `Prefix sums P[2] = 7 and later P[5] = 4. Can start index 2 ever give a shorter valid subarray than start index 5?`,
      options: [`Yes, because 2 is earlier`, `No: start 5 has a smaller prefix (more room to reach k) AND is later (shorter), so start 2 is dominated`, `Only if k is negative`, `It depends on nums[3]`],
      answer: 1,
      explain: `For any end j, P[j] − P[5] ≥ P[j] − P[2] and j − 5 &lt; j − 2. Start 2 can be thrown away — this is why the deque keeps prefix sums increasing.`
    },
    hints: [
      `<p><b>Aha:</b> subarray (i, j] has sum <code>P[j] − P[i]</code>. For each end j we want the <b>latest</b> start i with <code>P[i] ≤ P[j] − k</code>.</p>`,
      `<p>Keep a deque of start indices with <b>increasing</b> P. For each j: while <code>P[j] − P[front] ≥ k</code> → record <code>j − front</code>, pop front (it can never do better with a later j). While <code>P[j] ≤ P[back]</code> → pop back (dominated). Push j.</p>`,
      `<p><b>Traps:</b> prefix sums need <code>long</code>; include P[0] = 0 as the first start; return -1 when nothing is found. This is the "fix" for the variable window when negatives appear — expect it as a follow-up after Minimum Size Subarray Sum.</p>`
    ],
    solution: {
      approach: `<p>Prefix sums + monotonic deque of candidate starts (increasing prefix values).</p>`,
      code: `
        class Solution {
            public int shortestSubarray(int[] nums, int k) {
                int n = nums.length;
                long[] P = new long[n + 1];
                for (int i = 0; i < n; i++) P[i + 1] = P[i] + nums[i];
                Deque<Integer> dq = new ArrayDeque<>();        // start indices, P increasing
                int best = Integer.MAX_VALUE;
                for (int j = 0; j <= n; j++) {
                    while (!dq.isEmpty() && P[j] - P[dq.peekFirst()] >= k) {
                        best = Math.min(best, j - dq.pollFirst());   // front start is used up
                    }
                    while (!dq.isEmpty() && P[j] <= P[dq.peekLast()]) {
                        dq.pollLast();                         // dominated: later and not larger
                    }
                    dq.addLast(j);
                }
                return best == Integer.MAX_VALUE ? -1 : best;
            }
        }`,
      dry: {
        head: ['j', 'P[j]', 'front checks', 'back pops', 'deque after', 'best'],
        rows: [['0', '0', '—', '—', '[0]', '∞'], ['1', '1', '1 − 0 &lt; 5', '—', '[0, 1]', '∞'], ['2', '0', '0 − 0 &lt; 5', 'pop 1 (P=1), pop 0 (P=0)', '[2]', '∞'], ['3', '5', '5 − P[2]=0 ≥ 5 → len 1', '—', '[3]', H.c('p', '1')]]
      },
      complexity: `<p><b>Time O(N)</b> — each index enters and leaves the deque once. <b>Space O(N)</b>.</p>`,
      followUps: ['Why can the front be popped after it is used?', 'Longest subarray with sum ≥ k (different structure: prefix minima + binary search).']
    }
  });

  // =====================================================================
  // QUIZ
  // =====================================================================
  quiz.push({
    q: `Sorted array, target 20, L points to 4 and R points to 19 (sum 23). Which move is correct?`,
    options: [`L++`, `R--`, `Move both`, `Return false`],
    answer: 1,
    explain: `23 is too big. 19 plus the smallest remaining number already overshoots, so 19 can never be in the answer: R--.`
  });
  quiz.push({
    q: `Why does opposite-direction 2-Sum need the array to be <b>sorted</b>?`,
    options: [`So that duplicates are removed`, `So that "too big → R--" and "too small → L++" are guaranteed to throw away only useless numbers`, `Because Java requires it`, `To make it O(1) memory`],
    answer: 1,
    explain: `The proof that a dropped number cannot be in any answer relies on a[L] being the smallest and a[R] the largest numbers still in play.`
  });
  quiz.push({
    q: `What is the time complexity of 3-Sum with sorting + two pointers?`,
    options: [`O(N)`, `O(N log N)`, `O(N<sup>2</sup>)`, `O(N<sup>3</sup>)`],
    answer: 2,
    explain: `N choices for the fixed number × an O(N) pointer walk each = O(N<sup>2</sup>); the O(N log N) sort is smaller.`
  });
  quiz.push({
    q: `Container With Most Water: heights at L and R are 6 and 6. What is safe?`,
    options: [`Only L++`, `Only R--`, `Either (or both) — with equal walls, neither can do better with a narrower partner`, `Stop immediately`],
    answer: 2,
    explain: `Any narrower container using either wall has level ≤ 6 and smaller width, so both walls are finished.`
  });
  quiz.push({
    q: `In the read/write (slow/fast) template, why is it safe to write at <code>slow</code>?`,
    options: [`Because slow is always 0`, `Because slow ≤ fast, so we only overwrite cells that were already read`, `Because the array is sorted`, `Because we copy the array first`],
    answer: 1,
    explain: `The writer never gets ahead of the reader, so no unread value is ever destroyed.`
  });
  quiz.push({
    q: `For "count pairs with difference exactly K" in a sorted array, which pointer setup works?`,
    options: [`L at the start, R at the end`, `Both near the start: i = 0, j = 1; gap too small → j++, too big → i++`, `Only one pointer and a stack`, `Three pointers from the end`],
    answer: 1,
    explain: `With both at the left, j++ grows the gap and i++ shrinks it — one move in each direction. From both ends, every move shrinks the difference.`
  });
  quiz.push({
    q: `Window of size 3 has sum 15 over [4, 5, 6]. It slides right and 2 enters. New sum?`,
    options: [`17`, `13`, `9`, `11`],
    answer: 1,
    explain: `15 + 2 − 4 = 13 (= 5 + 6 + 2).`
  });
  quiz.push({
    q: `Which of these aggregates can NOT be maintained in O(1) per slide with a simple running variable?`,
    options: [`Sum`, `Count of even numbers`, `XOR of the window`, `Maximum of the window`],
    answer: 3,
    explain: `When the maximum leaves the window you do not know the next maximum. You need a monotonic deque (Stacks &amp; Queues module).`
  });
  quiz.push({
    q: `Smallest subarray with sum ≥ K, positive numbers. Where do you record the answer?`,
    options: [`After the inner while loop`, `Inside the while (sum ≥ K) loop, before removing a[L]`, `Only at the very end`, `Before adding a[R]`],
    answer: 1,
    explain: `Shortest flavour: the window is good inside the loop; record its length before shrinking it.`
  });
  quiz.push({
    q: `Why is the variable-size window O(N) even though it has a while loop inside a for loop?`,
    options: [`The while loop runs at most once`, `L only moves forward, so across the whole run it moves at most N times in total`, `Because N is small`, `It is actually O(N<sup>2</sup>)`],
    answer: 1,
    explain: `Amortised analysis: each element is added once and removed at most once → at most 2N steps.`
  });
  quiz.push({
    q: `The array contains negative numbers and you need the shortest subarray with sum ≥ K. Best approach?`,
    options: [`The usual grow/shrink window`, `Prefix sums + monotonic deque`, `Sort the array first`, `Opposite pointers`],
    answer: 1,
    explain: `Negatives break monotonicity, so the window may stop shrinking too early. Prefix sums with a deque of increasing prefix values give O(N).`
  });
  quiz.push({
    q: `How do you count subarrays with <b>exactly</b> K distinct values using windows?`,
    options: [`One window that stops at exactly K`, `atMost(K) − atMost(K − 1)`, `atMost(K) + atMost(K − 1)`, `It cannot be done in O(N)`],
    answer: 1,
    explain: `"At most" is monotone and easy to count (R − L + 1 per right end); the difference leaves exactly K.`
  });
  quiz.push({
    q: `"Take exactly k cards from either end to maximise points" is secretly…`,
    options: [`A variable window`, `A fixed window of size N − k (the cards you leave) with the minimum sum`, `3-Sum`, `Greedy: always take the larger end`],
    answer: 1,
    explain: `The untouched cards are always one contiguous middle block of N − k cards. Minimise it; greedy by larger end fails on [1, 1000, 2, 3], k = 2.`
  });

  // =====================================================================
  // INTERVIEW Q&A
  // =====================================================================
  interview.push({
    level: 'B',
    q: `What is the two-pointer technique, and why is it faster than nested loops?`,
    a: `<p>Two pointers means keeping <b>two indices</b> into the data and moving them by a rule, instead of trying every pair with two nested loops. Each move <b>permanently rules out</b> a group of pairs (a whole row or column of the N × N pair table) because of some ordered property — usually that the array is sorted. Since each pointer only moves in one direction and can move at most N times, the total work is O(N) instead of O(N<sup>2</sup>). For N = 10<sup>5</sup> that is 10<sup>5</sup> steps instead of 5·10<sup>9</sup>.</p>`,
    followUps: ['Name three problems solved with opposite-direction pointers.', 'What property must the data have for the pointer moves to be safe?']
  });
  interview.push({
    level: 'B',
    q: `Prove that two-pointer 2-Sum on a sorted array never misses the answer.`,
    a: `<p>Invariant: if a valid pair (i*, j*) exists, then always <code>L ≤ i*</code> and <code>j* ≤ R</code>. Start: true. If the sum is too big we do <code>R--</code>: if R were j*, then <code>a[L] + a[j*] &gt; a[i*] + a[j*]</code> would mean <code>a[L] &gt; a[i*]</code>, impossible since L ≤ i* in a sorted array. So R ≠ j* and moving it is safe. The "too small" case is symmetric. The gap R − L shrinks each step, so we must reach L = i*, R = j* and report it.</p>`,
    followUps: ['Does the proof need the numbers to be positive?', 'How does it change for counting pairs with sum below target?']
  });
  interview.push({
    level: 'B',
    q: `2-Sum: when would you use a HashMap instead of two pointers?`,
    a: `<p>When the array is <b>unsorted</b> and the question asks for <b>original indices</b> (sorting would scramble them), or when you want O(N) time and memory is not a concern. HashMap: O(N) time, O(N) memory, works in one pass even on a stream. Sort + pointers: O(N log N) time, O(1) extra memory (or O(N) if you must keep index pairs). If the input is already sorted, pointers win on both time and memory and are more cache-friendly.</p>`,
    followUps: ['What about 2-Sum on a stream where numbers arrive one by one?', 'Design a class with add(x) and find(target).']
  });
  interview.push({
    level: 'I',
    q: `How do you avoid duplicate triplets in 3-Sum without using a HashSet?`,
    a: `<p>Sort first so equal values are adjacent and every triplet is produced in non-decreasing order. Then: (1) skip a fixed index i if <code>nums[i] == nums[i-1]</code>; (2) after recording a triplet, move L past all copies of <code>nums[L]</code> and R past all copies of <code>nums[R]</code>, then step both inward. Equal triplets could only appear if the same value were used twice in the same role, which these rules block. The first copy of each value is always tried and sees all partners to its right, so nothing is lost.</p>`,
    followUps: ['What breaks if you skip duplicates of L before recording?', 'How would you extend it to 4-Sum, and what overflow risk appears?']
  });
  interview.push({
    level: 'I',
    q: `Container With Most Water: why do we move the shorter wall?`,
    a: `<p>Area = <code>min(h[L], h[R]) × (R − L)</code>. Suppose <code>h[L] &lt; h[R]</code>. Any other container that keeps wall L uses a right wall closer than R, so its width is smaller, and its level is still at most <code>h[L]</code>. Therefore every remaining container with wall L is no better than the one we just measured — L is finished and can be discarded. Moving the taller wall instead could skip the optimum (e.g. [2, 9, 1, 9]). Each step discards one wall, so the scan is O(N).</p>`,
    followUps: ['How does this differ from Trapping Rain Water?', 'What happens on equal heights?']
  });
  interview.push({
    level: 'I',
    q: `Explain the slow/fast (read/write) pointer template and give its invariant.`,
    a: `<p><code>fast</code> reads every element once; <code>slow</code> marks where the next kept element is written. Invariant: after reading <code>a[0..fast-1]</code>, the cells <code>a[0..slow-1]</code> contain exactly the kept elements of that prefix, in original order. Because <code>slow ≤ fast</code>, we only overwrite already-read cells. Only the keep rule changes: "differs from last kept" (dedupe), "non-zero" (move zeroes), "≠ val" (remove element), "≠ a[slow−2]" (at most two copies). O(N) time, O(1) space, stable.</p>`,
    followUps: ['How would you minimise the number of writes?', 'Which standard-library functions implement this pattern?']
  });
  interview.push({
    level: 'I',
    q: `What is the difference between fixed-size and variable-size sliding windows?`,
    a: `<p>A <b>fixed</b> window has a known length K: build the first K elements, then each step adds <code>a[i]</code> and removes <code>a[i − K]</code> — the window never decides to shrink. A <b>variable</b> window searches for the length: R grows the window, and L shrinks it based on a condition — while the window is good (shortest flavour, record inside) or while it is bad (longest/count flavour, record after). Both are O(N). The variable version needs the condition to be monotone in window size.</p>`,
    followUps: ['Give a problem that looks variable but is really fixed.', 'Where do you record the answer in each flavour, and why?']
  });
  interview.push({
    level: 'I',
    q: `Why is the grow/shrink window O(N) when it has a while loop inside a for loop?`,
    a: `<p>Count work per element, not per loop. R visits each index once. L only moves forward and never past R, so across the entire run it moves at most N times — the inner while loops together run at most N iterations. Each element is added once and removed at most once, so total work ≤ 2N = O(N). This argument is called amortised analysis: an occasional long inner loop is "paid for" by many iterations where it did nothing.</p>`,
    followUps: ['Give a nested-loop pattern that really is O(N²).', 'Where else is amortised analysis used (dynamic arrays, union-find)?']
  });
  interview.push({
    level: 'A',
    q: `When does the sliding window technique fail? What do you use instead?`,
    a: `<p>It fails when "goodness" is not monotone in window size. Classic case: sums with <b>negative numbers</b> — extending can lower the sum and shrinking can raise it, so the window may stop shrinking too early (e.g. [1, −1, 5], K = 5 gives 3 instead of 1). Products with zeros or negatives have the same problem. Fixes: prefix sums + HashMap for "sum exactly K" (count earlier prefixes equal to pf − K), prefix sums + monotonic deque for "shortest sum ≥ K", or binary search on the answer when a fixed-size check exists.</p>`,
    followUps: ['Walk through the monotonic deque solution for LeetCode 862.', 'How would you detect at interview time that monotonicity fails?']
  });
  interview.push({
    level: 'A',
    q: `How do you count subarrays with EXACTLY K distinct values (or exactly K odd numbers)?`,
    a: `<p>A window cannot count "exactly K" directly, because a valid window can often be extended by elements that do not change the count, so neither "grow" nor "shrink" is clearly right. But "at most K" is monotone: compute <code>atMost(K)</code> with the count flavour (add <code>R − L + 1</code> per right end) and subtract <code>atMost(K − 1)</code>. Two O(N) passes. For bounded values use an int[] count array instead of a HashMap. An alternative one-pass version keeps two left pointers.</p>`,
    followUps: ['Why does R − L + 1 count each subarray exactly once?', 'Write atMost for "at most K zeros".']
  });
  interview.push({
    level: 'A',
    q: `Trapping Rain Water in O(1) space: explain the two-pointer idea.`,
    a: `<p>Water above bar i = min(maxLeft(i), maxRight(i)) − h[i]. Keep pointers L and R with running <code>leftMax</code> and <code>rightMax</code>. If <code>h[L] &lt; h[R]</code>, a bar to the right of L is taller than everything that built leftMax, so the true right maximum for L is at least leftMax; the minimum is leftMax and we can settle bar L: add <code>leftMax − h[L]</code>, L++. Otherwise settle R symmetrically. O(N) time, O(1) memory — it removes the two O(N) prefix/suffix max arrays.</p>`,
    followUps: ['Solve it with a monotonic stack instead.', 'What changes in 2D (Trapping Rain Water II)?']
  });
  interview.push({
    level: 'E',
    q: `Where do two-pointer and sliding-window ideas appear in real systems?`,
    a: `<p><b>Databases:</b> a merge join walks two inputs sorted on the join key with two same-direction pointers. <b>Libraries:</b> C++ <code>std::remove_if</code>/<code>std::unique</code> and Java <code>ArrayList.removeIf</code> compact in place with read/write pointers. <b>Streaming and monitoring:</b> moving averages, "requests in the last 60 s", and rate limiters keep a ring buffer plus running totals (fixed window); Kafka Streams/Flink offer tumbling, hopping and sliding windows. <b>Networking:</b> TCP's sliding window tracks which bytes are in flight. <b>Memory managers:</b> compacting GCs slide live objects forward.</p>`,
    followUps: ['How would you implement a sliding-window rate limiter for 1M users?', 'Why do floating-point running sums drift, and how do systems fix it?']
  });
  interview.push({
    level: 'E',
    q: `You are given an unseen array problem. How do you decide whether pointers or windows apply?`,
    a: `<p>I ask in order: (1) Is the answer a <b>contiguous</b> piece? Then window — fixed if the length is given, variable otherwise. (2) Is the window condition <b>monotone</b> (positives, "at most K")? If not, prefix sums + hashing/deque. (3) Do I rewrite <b>in place</b>? Read/write pointers. (4) Is it about pairs/triplets with a sum or difference? Sort (if indices are not needed) then opposite or gap pointers. Then I state the monotonic fact that makes each pointer move safe, the complexity, and a brute force I can test against. If I cannot name that fact, I do not trust the pointer solution.</p>`,
    followUps: ['Give a problem where sorting is not allowed even though it is about pairs.', 'How would you verify your solution quickly under time pressure?']
  });

  registerModule({
    id: 'dsa06',
    title: 'Two Pointers & Sliding Window',
    intro: `<p>Lots of array questions secretly ask you to look at <b>pairs</b> or <b>stretches</b> of elements. The lazy way is two nested loops — O(N<sup>2</sup>), too slow once N reaches 10<sup>5</sup>. This module teaches two small tricks that turn those questions into a <b>single walk</b> over the array:</p>
      <ul>
        <li><b>Two pointers</b> — keep two fingers on the array. Either they start at <b>both ends and walk toward each other</b> (2-Sum on a sorted array, 3-Sum, Container With Most Water), or they <b>both walk forward</b>, one fast and one slow (remove duplicates, move zeroes, pairs with difference K).</li>
        <li><b>Sliding window</b> — look at a <b>contiguous</b> piece of the array through a "window". Either the window has a <b>fixed size K</b> (add the new element on the right, drop the old one on the left), or it <b>grows and shrinks</b> like a caterpillar (smallest subarray with sum ≥ K) using one reusable grow/shrink template.</li>
      </ul>
      <p>Every topic starts with an everyday picture, shows tiny examples step by step, lists the <b>clues in the question</b> that should make you think of the trick, and lets you play with an animated visualizer. Expert deep dives cover the proofs (why a pointer move never skips the answer), when the tricks break (negative numbers!), and where the same ideas run in real systems. Then you solve guided problems with hints and finish with a 16-problem practice arena, a quiz and interview questions. It builds directly on DSA 5 (prefix sums), which is the fallback whenever a window is not safe.</p>`,
    goals: [
      'Solve 2-Sum (sorted), 3-Sum, 3-Sum Closest and Container With Most Water in O(N) / O(N<sup>2</sup>) and prove why each pointer move is safe',
      'Rewrite arrays in place with the slow/fast read-write template (remove duplicates, move zeroes, keep at most k copies, sort colors)',
      'Count or find pairs with difference K using same-direction pointers, and know when a HashMap is the better tool',
      'Apply the fixed-size window (max sum / average of K, cards from both ends) and the variable grow/shrink window in its shortest, longest and counting flavours',
      'Recognise when a window is NOT valid (negative numbers, non-monotone conditions) and switch to prefix sums, a deque or the atMost(K) − atMost(K − 1) trick',
      'Read a problem statement and pick the right pointer pattern from the clue words in under a minute'
    ],
    prereqs: `DSA 1 (Programming Foundations), DSA 2 (Complexity — the 10<sup>8</sup> operations rule) and DSA 5 (Arrays &amp; Prefix Sums). Comfortable with Java arrays, loops and <code>Arrays.sort</code>.`,
    hours: 10,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
