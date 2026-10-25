(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // ---------- small helpers shared by the visualizers ----------
  function parseNums(input, maxN, opts) {
    opts = opts || {};
    var s = String(input === undefined || input === null ? '' : input).trim();
    var example = opts.example || '5 1 4 2 8';
    if (!s) throw new Error('Type whole numbers separated by spaces, e.g. ' + example);
    var a = s.split(/[\s,]+/).map(Number);
    for (var k = 0; k < a.length; k++) {
      if (!isFinite(a[k]) || Math.floor(a[k]) !== a[k]) throw new Error('Use whole numbers only, separated by spaces, e.g. ' + example);
      if (opts.min !== undefined && a[k] < opts.min) throw new Error('Every number must be at least ' + opts.min + ' (e.g. ' + example + ')');
      if (opts.max !== undefined && a[k] > opts.max) throw new Error('Every number must be at most ' + opts.max + ' (e.g. ' + example + ')');
    }
    if (a.length < (opts.minN || 2)) throw new Error('Please enter at least ' + (opts.minN || 2) + ' numbers, e.g. ' + example);
    if (a.length > maxN) throw new Error('Please keep it to at most ' + maxN + ' numbers so the animation stays readable.');
    return a;
  }
  function one(i, cls) { var h = {}; h[i] = cls; return h; }
  function mix(a, b) { var r = {}, k; for (k in a) r[k] = a[k]; for (k in b) r[k] = b[k]; return r; }

  // =====================================================================
  // TOPIC 1: Bubble / Selection / Insertion
  // =====================================================================
  topics.push({
    title: 'The Three Simple Sorts: Bubble, Selection, Insertion',
    analogy: `<p>Think of three friends tidying a messy row of books by height on a shelf:</p>
      <ul>
        <li><b>Bubble friend</b> walks left to right and only ever looks at <b>two neighbours</b>. "Left one taller? Swap!" After one walk, the tallest book has "bubbled" to the far right end.</li>
        <li><b>Selection friend</b> scans the whole messy part, <b>selects the shortest book</b>, and puts it in the first empty spot. Repeat for the next spot.</li>
        <li><b>Insertion friend</b> sorts like you sort <b>playing cards in your hand</b>: pick up the next card, slide it left past every bigger card, and drop it into its place.</li>
      </ul>`,
    explain: `<p>All three are <b>O(N<sup>2</sup>)</b> in the worst case — for N = 10<sup>5</sup> that is 10<sup>10</sup> steps (way too slow). You still must know them because (1) interviewers ask "how does it work / is it stable?", (2) <b>insertion sort is the fastest sort for tiny or almost-sorted arrays</b> (the library sorts of Java, Python and C++ use it for small pieces), and (3) their ideas (neighbour swaps, picking the minimum, shifting) show up in many problems.</p>
      <h4>1. Bubble sort — "big ones float to the end"</h4>
      <p>Compare <code>a[j]</code> with <code>a[j+1]</code>; if the left one is bigger, swap. One full pass pushes the <b>largest</b> value to the last position. Next pass can stop one place earlier.</p>
      ${H.table(['pass', 'array after the pass', 'locked at the end'], [
        ['start', '5 1 4 2 8', '—'],
        ['1', '1 4 2 5 <span class="c-g">8</span>', '8'],
        ['2', '1 2 4 <span class="c-g">5 8</span>', '5 8'],
        ['3', '1 2 <span class="c-g">4 5 8</span> (no swaps happened!)', '→ stop early']
      ])}
      <p><b>Trick:</b> if a whole pass makes <b>zero swaps</b>, the array is already sorted → stop. So an already sorted array costs only one pass = O(N).</p>
      <h4>2. Selection sort — "pick the smallest, put it in front"</h4>
      ${H.table(['step i', 'smallest in a[i..]', 'swap', 'array'], [
        ['0', '1 (index 1)', 'a[0] ↔ a[1]', '<span class="c-g">1</span> 5 4 2 8'],
        ['1', '2 (index 3)', 'a[1] ↔ a[3]', '<span class="c-g">1 2</span> 4 5 8'],
        ['2', '4 (index 2)', 'none', '<span class="c-g">1 2 4</span> 5 8'],
        ['3', '5 (index 3)', 'none', '<span class="c-g">1 2 4 5</span> 8']
      ])}
      <p>It always does about N<sup>2</sup>/2 comparisons (even on a sorted array), but makes <b>at most N − 1 swaps</b>. Handy when writing/moving is expensive.</p>
      <h4>3. Insertion sort — "cards in your hand"</h4>
      <p>The left part <code>a[0..i-1]</code> is always sorted. Take <code>key = a[i]</code>, shift every bigger element one step right, then drop <code>key</code> into the gap.</p>
      ${H.arr([1, 4, 5, 2, 8], { label: 'sorted part 1 4 5, next card key = 2', hl: { 0: 'b', 1: 'b', 2: 'b', 3: 'y' } })}
      ${H.arr([1, '_', 4, 5, 8], { label: '4 and 5 are bigger → shift them right', hl: { 1: 'm', 2: 'y', 3: 'y' } })}
      ${H.arr([1, 2, 4, 5, 8], { label: '…drop 2 into the gap', hl: { 1: 'g' } })}
      <p>On an <b>almost sorted</b> array each key moves only a step or two → close to O(N). Worst case (reverse sorted) every key walks all the way left → O(N<sup>2</sup>).</p>
      ${H.table(['sort', 'best', 'worst', 'swaps / moves', 'stable?', 'extra space'], [
        ['Bubble', 'O(N) (sorted, early stop)', 'O(N<sup>2</sup>)', 'many', '<span class="c-g">yes</span>', 'O(1)'],
        ['Selection', 'O(N<sup>2</sup>)', 'O(N<sup>2</sup>)', '<b>≤ N − 1 swaps</b>', '<span class="c-r">no</span>', 'O(1)'],
        ['Insertion', 'O(N) (sorted)', 'O(N<sup>2</sup>)', 'shifts = number of inversions', '<span class="c-g">yes</span>', 'O(1)']
      ])}
      <p><small>"Stable" means equal values keep their original left-to-right order — see the Stable vs Unstable topic below.</small></p>`,
    clues: [
      '<b>N ≤ 10<sup>3</sup></b> or "small array" → an O(N<sup>2</sup>) simple sort is acceptable; N ≤ 10<sup>5</sup> → you need O(N log N).',
      '"Array is <b>nearly sorted</b> / each element is at most K places away" → insertion sort idea (or a heap), close to O(N).',
      '"<b>Minimum number of adjacent swaps</b> to sort" → that is exactly the number of <b>inversions</b> (what bubble/insertion sort do one by one).',
      '"Minimize the number of <b>writes/swaps</b>" → selection sort idea (at most N − 1 swaps) or cycle placement.',
      '"Explain the passes / show the array after k passes of bubble sort" → after pass k, the k largest are locked at the end.'
    ],
    code: [{ lang: 'java', code: `
      // Bubble sort with the "no swaps → stop early" trick.
      void bubbleSort(int[] a) {
          int n = a.length;
          for (int pass = 0; pass < n - 1; pass++) {
              boolean swapped = false;
              // the last 'pass' elements are already the biggest ones, locked in place
              for (int j = 0; j < n - 1 - pass; j++) {
                  if (a[j] > a[j + 1]) {          // neighbours in the wrong order
                      int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
                      swapped = true;
                  }
              }
              if (!swapped) break;                // a clean pass means already sorted
          }
      }`,
      alt: [
        { lang: 'python', code: `# Bubble sort with the "no swaps -> stop early" trick.
def bubble_sort(a):
    n = len(a)
    for p in range(n - 1):
        swapped = False
        for j in range(n - 1 - p):              # the last p items are locked in place
            if a[j] > a[j + 1]:                 # neighbours in the wrong order
                a[j], a[j + 1] = a[j + 1], a[j]
                swapped = True
        if not swapped:                         # a clean pass means already sorted
            break` },
        { lang: 'js', code: `// Bubble sort with the "no swaps -> stop early" trick.
function bubbleSort(a) {
  const n = a.length;
  for (let pass = 0; pass < n - 1; pass++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - pass; j++) {  // the last 'pass' items are locked in place
      if (a[j] > a[j + 1]) {                  // neighbours in the wrong order
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapped = true;
      }
    }
    if (!swapped) break;                      // a clean pass means already sorted
  }
}` },
        { lang: 'cpp', code: `// Bubble sort with the "no swaps -> stop early" trick.
void bubbleSort(vector<int>& a) {
    int n = a.size();
    for (int pass = 0; pass < n - 1; pass++) {
        bool swapped = false;
        for (int j = 0; j < n - 1 - pass; j++) {  // the last 'pass' items are locked in place
            if (a[j] > a[j + 1]) {                // neighbours in the wrong order
                swap(a[j], a[j + 1]);
                swapped = true;
            }
        }
        if (!swapped) break;                      // a clean pass means already sorted
    }
}` }, { lang: 'csharp', code: String.raw`
// Bubble sort with the "no swaps -> stop early" trick.
void BubbleSort(int[] a) {
    int n = a.Length;
    for (int pass = 0; pass < n - 1; pass++) {
        bool swapped = false;
        // the last 'pass' elements are already the biggest ones, locked in place
        for (int j = 0; j < n - 1 - pass; j++) {
            if (a[j] > a[j + 1]) {          // neighbours in the wrong order
                int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
                swapped = true;
            }
        }
        if (!swapped) break;                // a clean pass means already sorted
    }
}` }
      ] }, { lang: 'java', code: `
      // Selection sort: put the smallest remaining value at position i.
      void selectionSort(int[] a) {
          int n = a.length;
          for (int i = 0; i < n - 1; i++) {
              int minIdx = i;                     // best candidate so far
              for (int j = i + 1; j < n; j++) {
                  if (a[j] < a[minIdx]) minIdx = j;
              }
              if (minIdx != i) {                  // one swap per position at most
                  int t = a[i]; a[i] = a[minIdx]; a[minIdx] = t;
              }
          }
      }`,
      alt: [
        { lang: 'python', code: `# Selection sort: put the smallest remaining value at position i.
def selection_sort(a):
    n = len(a)
    for i in range(n - 1):
        m = min(range(i, n), key=a.__getitem__)  # index of the smallest in a[i:]
        if m != i:                               # one swap per position at most
            a[i], a[m] = a[m], a[i]` },
        { lang: 'js', code: `// Selection sort: put the smallest remaining value at position i.
function selectionSort(a) {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;                           // best candidate so far
    for (let j = i + 1; j < n; j++) if (a[j] < a[minIdx]) minIdx = j;
    if (minIdx !== i) [a[i], a[minIdx]] = [a[minIdx], a[i]];   // one swap per position at most
  }
}` },
        { lang: 'cpp', code: `// Selection sort: put the smallest remaining value at position i.
void selectionSort(vector<int>& a) {
    for (auto it = a.begin(); it != a.end(); ++it) {
        auto m = min_element(it, a.end());       // smallest remaining value
        if (m != it) iter_swap(it, m);           // one swap per position at most
    }
}` }, { lang: 'csharp', code: String.raw`
// Selection sort: put the smallest remaining value at position i.
void SelectionSort(int[] a) {
    int n = a.Length;
    for (int i = 0; i < n - 1; i++) {
        int minIdx = i;                     // best candidate so far
        for (int j = i + 1; j < n; j++) {
            if (a[j] < a[minIdx]) minIdx = j;
        }
        if (minIdx != i) {                  // one swap per position at most
            int t = a[i]; a[i] = a[minIdx]; a[minIdx] = t;
        }
    }
}` }
      ] }, { lang: 'java', code: `
      // Insertion sort: grow a sorted prefix like cards in your hand.
      void insertionSort(int[] a) {
          for (int i = 1; i < a.length; i++) {
              int key = a[i];                     // the new card we picked up
              int j = i - 1;
              // shift every bigger card one step to the right
              while (j >= 0 && a[j] > key) {      // strictly bigger → equal keys keep order (stable)
                  a[j + 1] = a[j];
                  j--;
              }
              a[j + 1] = key;                     // drop the card into the gap
          }
      }`,
      alt: [
        { lang: 'python', code: `# Insertion sort: grow a sorted prefix like cards in your hand.
def insertion_sort(a):
    for i in range(1, len(a)):
        key, j = a[i], i - 1                    # the new card we picked up
        while j >= 0 and a[j] > key:            # strictly bigger -> equal keys keep order (stable)
            a[j + 1] = a[j]                     # shift one step right
            j -= 1
        a[j + 1] = key                          # drop the card into the gap` },
        { lang: 'js', code: `// Insertion sort: grow a sorted prefix like cards in your hand.
function insertionSort(a) {
  for (let i = 1; i < a.length; i++) {
    const key = a[i];                         // the new card we picked up
    let j = i - 1;
    while (j >= 0 && a[j] > key) {            // strictly bigger -> stable
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = key;                           // drop the card into the gap
  }
}` },
        { lang: 'cpp', code: `// Insertion sort: grow a sorted prefix like cards in your hand.
void insertionSort(vector<int>& a) {
    for (int i = 1; i < (int)a.size(); i++) {
        int key = a[i], j = i - 1;              // the new card we picked up
        while (j >= 0 && a[j] > key) {          // strictly bigger -> stable
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = key;                         // drop the card into the gap
    }
}` }, { lang: 'csharp', code: String.raw`
// Insertion sort: grow a sorted prefix like cards in your hand.
void InsertionSort(int[] a) {
    for (int i = 1; i < a.Length; i++) {
        int key = a[i];                     // the new card we picked up
        int j = i - 1;
        // shift every bigger card one step to the right
        while (j >= 0 && a[j] > key) {      // strictly bigger -> equal keys keep order (stable)
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = key;                     // drop the card into the gap
    }
}` }
      ] }],
    codeTitle: ['Bubble sort (early exit)', 'Selection sort', 'Insertion sort'],
    viz: [
      {
        title: 'Bubble sort: neighbours swap, biggest floats right',
        input: '5 1 4 2 8 3',
        inputLabel: 'Array (space separated, up to 10 numbers)',
        gen: function (input) {
          var a = parseNums(input, 10, { example: '5 1 4 2 8 3' });
          var n = a.length, frames = [];
          function locked(p) { var h = {}; for (var q = n - p; q < n; q++) h[q] = 'done'; return h; }
          frames.push({ narr: 'Start. Bubble sort only ever compares <b>two neighbours</b>. If the left one is bigger, they swap. Watch the biggest value float to the right end in each pass.', parts: [
            { type: 'bars', label: 'array', values: a.slice() },
            { type: 'vars', vals: { pass: 0, swaps: 0 } }
          ] });
          var swaps = 0;
          for (var pass = 0; pass < n - 1; pass++) {
            var swapped = false;
            for (var j = 0; j < n - 1 - pass; j++) {
              var x = a[j], y = a[j + 1], h = locked(pass), p = {};
              p[j] = 'j'; p[j + 1] = 'j+1';
              var narr;
              if (x > y) {
                a[j] = y; a[j + 1] = x; swaps++; swapped = true;
                h[j] = 'bad'; h[j + 1] = 'bad';
                narr = 'Pass ' + (pass + 1) + ': compare ' + x + ' and ' + y + '. <span class="c-r">' + x + ' &gt; ' + y + ' → wrong order, swap them.</span> The bigger one keeps moving right.';
              } else {
                h[j] = 'ok'; h[j + 1] = 'ok';
                narr = 'Pass ' + (pass + 1) + ': compare ' + x + ' and ' + y + '. <span class="c-g">' + x + ' ≤ ' + y + ' → already in order, leave them.</span>';
              }
              frames.push({ narr: narr, parts: [
                { type: 'bars', label: 'array', values: a.slice(), hl: h, ptr: p },
                { type: 'vars', vals: { pass: pass + 1, j: j, swaps: swaps } }
              ] });
            }
            frames.push({ narr: 'End of pass ' + (pass + 1) + ': the biggest unsorted value (' + a[n - 1 - pass] + ') has bubbled to index ' + (n - 1 - pass) + '. It is now <b>locked</b> (faded) — the next pass stops one step earlier.' + (swapped ? '' : ' <span class="c-g">No swaps happened in this pass → the array is already sorted, stop early!</span>'), parts: [
              { type: 'bars', label: 'array', values: a.slice(), hl: locked(pass + 1) },
              { type: 'vars', vals: { pass: pass + 1, swaps: swaps, swappedThisPass: swapped ? 'yes' : 'no' }, hl: swapped ? {} : { swappedThisPass: 'ok' } }
            ] });
            if (!swapped) break;
          }
          var all = {}; for (var q = 0; q < n; q++) all[q] = 'ok';
          frames.push({ narr: 'Sorted! Total swaps = <b>' + swaps + '</b>. Fun fact: that number equals the number of <b>inversions</b> (pairs that were in the wrong order), because each neighbour swap fixes exactly one inversion.', parts: [
            { type: 'bars', label: 'sorted array', values: a.slice(), hl: all },
            { type: 'vars', vals: { swaps: swaps } }
          ] });
          return frames;
        }
      },
      {
        title: 'Selection sort: find the minimum, swap it to the front',
        input: '29 10 14 37 13 5',
        inputLabel: 'Array (space separated, up to 10 numbers)',
        gen: function (input) {
          var a = parseNums(input, 10, { example: '29 10 14 37 13 5' });
          var n = a.length, frames = [];
          function fixed(i) { var h = {}; for (var q = 0; q < i; q++) h[q] = 'done'; return h; }
          frames.push({ narr: 'Start. Selection sort fills positions 0, 1, 2… one by one. For each position it scans the unsorted part and <b>selects the smallest</b> value.', parts: [
            { type: 'array', label: 'array', values: a.slice(), showIdx: true }
          ] });
          for (var i = 0; i < n - 1; i++) {
            var minIdx = i;
            for (var j = i + 1; j < n; j++) {
              var better = a[j] < a[minIdx];
              if (better) minIdx = j;
              var h = fixed(i); h[minIdx] = 'sel'; h[j] = better ? 'ok' : 'cur';
              var p = {}; p[i] = 'i'; if (j === minIdx) p[j] = ['j', 'min']; else { p[j] = 'j'; p[minIdx] = 'min'; }
              frames.push({ narr: 'Filling position ' + i + '. Look at a[' + j + '] = ' + a[j] + '. ' + (better ? '<span class="c-g">Smaller than the best so far → new minimum is ' + a[j] + ' at index ' + j + '.</span>' : 'Not smaller than current minimum ' + a[minIdx] + ', keep looking.'), parts: [
                { type: 'array', label: 'array', values: a.slice(), hl: h, ptr: p, range: [i, n - 1], showIdx: true },
                { type: 'vars', vals: { i: i, j: j, minIdx: minIdx, min: a[minIdx] } }
              ] });
            }
            var t = a[i]; a[i] = a[minIdx]; a[minIdx] = t;
            var h2 = fixed(i); h2[i] = 'ok'; if (minIdx !== i) h2[minIdx] = 'bad';
            frames.push({ narr: minIdx !== i ? 'Scan done: smallest is ' + a[i] + '. <b>Swap</b> it with a[' + i + '] (which was ' + t + '). Position ' + i + ' is now final. Notice: this long-distance swap is why selection sort is <b>not stable</b>.' : 'Scan done: the smallest (' + a[i] + ') is already at position ' + i + '. No swap needed.', parts: [
              { type: 'array', label: 'array', values: a.slice(), hl: h2, showIdx: true },
              { type: 'vars', vals: { i: i, placed: a[i] } }
            ] });
          }
          var all = {}; for (var q = 0; q < n; q++) all[q] = 'ok';
          frames.push({ narr: 'The last element is automatically the biggest. Sorted! Selection sort made at most N − 1 = ' + (n - 1) + ' swaps but always ~N<sup>2</sup>/2 comparisons.', parts: [
            { type: 'array', label: 'sorted', values: a.slice(), hl: all, showIdx: true }
          ] });
          return frames;
        }
      },
      {
        title: 'Insertion sort: slide each new card into place',
        input: '7 3 5 1 6 2',
        inputLabel: 'Array (space separated, up to 10 numbers)',
        gen: function (input) {
          var a = parseNums(input, 10, { example: '7 3 5 1 6 2' });
          var n = a.length, frames = [];
          function sortedPart(i) { var h = {}; for (var q = 0; q < i; q++) h[q] = 'win'; return h; }
          frames.push({ narr: 'Start. Think of a[0] as one card in your hand — a single card is already "sorted". We will pick up the next cards one at a time.', parts: [
            { type: 'array', label: 'cards', values: a.slice(), hl: { 0: 'win' }, showIdx: true }
          ] });
          for (var i = 1; i < n; i++) {
            var key = a[i], j = i - 1;
            var show = a.slice(); show[i] = '_';
            var h = sortedPart(i); h[i] = 'cur';
            frames.push({ narr: 'Pick up card <b>key = ' + key + '</b> (index ' + i + '). The blue part a[0..' + (i - 1) + '] is already sorted. Now find where ' + key + ' belongs.', parts: [
              { type: 'array', label: 'cards (_ = gap)', values: show, hl: h, ptr: one(i, 'gap'), showIdx: true },
              { type: 'vars', vals: { i: i, key: key }, hl: { key: 'cur' } }
            ] });
            while (j >= 0 && a[j] > key) {
              a[j + 1] = a[j];
              show = a.slice(); show[j] = '_';
              var hs = sortedPart(i + 1); hs[j + 1] = 'bad'; hs[j] = 'cur';
              frames.push({ narr: a[j + 1] + ' &gt; ' + key + ', so <span class="c-r">shift ' + a[j + 1] + ' one step right</span>. The gap moves left to index ' + j + '.', parts: [
                { type: 'array', label: 'cards (_ = gap)', values: show, hl: hs, ptr: one(j, 'gap'), showIdx: true },
                { type: 'vars', vals: { i: i, key: key, j: j }, hl: { key: 'cur' } }
              ] });
              j--;
            }
            a[j + 1] = key;
            var hd = sortedPart(i + 1); hd[j + 1] = 'ok';
            frames.push({ narr: (j >= 0 ? a[j] + ' ≤ ' + key + ' (or nothing bigger left)' : 'Reached the left end') + ' → <span class="c-g">drop ' + key + ' into the gap at index ' + (j + 1) + '</span>. Now a[0..' + i + '] is sorted.', parts: [
              { type: 'array', label: 'cards', values: a.slice(), hl: hd, showIdx: true },
              { type: 'vars', vals: { i: i, key: key, placedAt: j + 1 }, hl: { placedAt: 'ok' } }
            ] });
          }
          var all = {}; for (var q = 0; q < n; q++) all[q] = 'ok';
          frames.push({ narr: 'All cards placed — sorted! Each shift fixed one inversion, so an almost-sorted array needs very few shifts (that is why insertion sort is great for nearly sorted data).', parts: [
            { type: 'array', label: 'sorted', values: a.slice(), hl: all, showIdx: true }
          ] });
          return frames;
        }
      }
    ]
  });

  // ---------- TOPIC 1 extras: examples, deep dive, AI era, guided problem ----------
  Object.assign(topics[topics.length - 1], {
    examples: [
      {
        title: 'Bubble sort on an already sorted array stops after ONE pass',
        html: `<p>Input ${H.arr([1, 2, 3, 4, 5], { label: 'a' })} Pass 1 compares (1,2), (2,3), (3,4), (4,5) — <b>4 comparisons, 0 swaps</b>. The <code>swapped</code> flag stays false, so we break. Total work: N − 1 comparisons = <b>O(N)</b>. Without the flag, the plain version would still do 4 + 3 + 2 + 1 = 10 comparisons for nothing.</p>
          <p>Lesson: the "early exit" flag turns bubble sort's <b>best case</b> from O(N<sup>2</sup>) into O(N).</p>`
      },
      {
        title: 'Insertion sort on a reverse-sorted array is its worst case',
        html: `<p>Input ${H.arr([4, 3, 2, 1], { label: 'a' })}</p>
          ${H.table(['i', 'key', 'shifts', 'array after'], [
            ['1', '3', '1 (4 moves right)', '3 4 2 1'],
            ['2', '2', '2 (4, 3 move right)', '2 3 4 1'],
            ['3', '1', '3 (4, 3, 2 move right)', '<span class="c-g">1 2 3 4</span>']
          ])}
          <p>Total shifts = 1 + 2 + 3 = <b>6 = N(N − 1)/2</b>. That is exactly the number of <b>inversions</b> (every pair is out of order). In general insertion sort does <b>(N − 1) + (number of inversions)</b> steps.</p>`
      },
      {
        title: 'Number of bubble-sort swaps = number of inversions',
        html: `<p>Input [3, 1, 2]. Inversions (pairs where the bigger number is on the left): ${H.c('r', '(3,1)')} and ${H.c('r', '(3,2)')} → 2.</p>
          <p>Bubble pass 1: 3 &gt; 1 swap → [1, 3, 2]; 3 &gt; 2 swap → [1, 2, 3]. Pass 2: no swaps → stop. Swaps = <b>2</b>. Each adjacent swap fixes <b>exactly one</b> inverted pair and breaks no other pair, so the counts always match. Interview phrase: "minimum adjacent swaps to sort" = inversion count.</p>`,
        code: { lang: 'java', code: `
          int bubbleSwaps(int[] a) {
              int swaps = 0;
              for (int pass = 0; pass < a.length - 1; pass++) {
                  boolean swapped = false;
                  for (int j = 0; j < a.length - 1 - pass; j++) {
                      if (a[j] > a[j + 1]) {
                          int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
                          swaps++;                 // every swap removes exactly one inversion
                          swapped = true;
                      }
                  }
                  if (!swapped) break;
              }
              return swaps;                        // bubbleSwaps(new int[]{3, 1, 2}) == 2
          }`,
          alt: [
            { lang: 'python', run: true, code: `def bubble_swaps(a):
    swaps = 0
    for p in range(len(a) - 1):
        swapped = False
        for j in range(len(a) - 1 - p):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swaps += 1               # every swap removes exactly one inversion
                swapped = True
        if not swapped:
            break
    return swaps

print(bubble_swaps([3, 1, 2]))  # 2` },
            { lang: 'js', run: true, code: `function bubbleSwaps(a) {
  let swaps = 0;
  for (let pass = 0; pass < a.length - 1; pass++) {
    let swapped = false;
    for (let j = 0; j < a.length - 1 - pass; j++) {
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swaps++;                         // every swap removes exactly one inversion
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return swaps;
}
console.log(bubbleSwaps([3, 1, 2]));     // 2` },
            { lang: 'cpp', code: `int bubbleSwaps(vector<int> a) {
    int swaps = 0;
    for (int pass = 0; pass + 1 < (int)a.size(); pass++) {
        bool swapped = false;
        for (int j = 0; j + 1 < (int)a.size() - pass; j++) {
            if (a[j] > a[j + 1]) {
                swap(a[j], a[j + 1]);
                swaps++;                 // every swap removes exactly one inversion
                swapped = true;
            }
        }
        if (!swapped) break;
    }
    return swaps;                        // bubbleSwaps({3, 1, 2}) == 2
}` }, { lang: 'csharp', code: String.raw`
int BubbleSwaps(int[] a) {
    int swaps = 0;
    for (int pass = 0; pass < a.Length - 1; pass++) {
        bool swapped = false;
        for (int j = 0; j < a.Length - 1 - pass; j++) {
            if (a[j] > a[j + 1]) {
                int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
                swaps++;                 // every swap removes exactly one inversion
                swapped = true;
            }
        }
        if (!swapped) break;
    }
    return swaps;                        // BubbleSwaps(new[] {3, 1, 2}) == 2
}` }
          ] }
      },
      {
        title: 'Selection sort does the fewest writes',
        html: `<p>Input [2, 3, 4, 5, 1]. Selection sort: i = 0 finds min 1 at index 4 → <b>one swap</b> → [1, 3, 4, 5, 2]; i = 1 finds 2 → swap → [1, 2, 4, 5, 3]; i = 2 → [1, 2, 3, 5, 4]; i = 3 → [1, 2, 3, 4, 5]. Only <b>4 swaps</b> (≤ N − 1) even though it did 10 comparisons.</p>
          <p>Insertion sort on the same input would shift 3, 4, 5 … many times (1 has to walk 4 steps left). When <b>writing</b> is expensive (flash memory cells wear out, moving heavy boxes) selection sort's "at most N − 1 swaps" is the selling point.</p>`
      }
    ],
    deepDive: `<p><b>Loop invariants — the expert way to explain any sort.</b> An invariant is a sentence that is true before every iteration. Bubble: "after pass p, the last p cells hold the p largest values in final order". Selection: "a[0..i−1] holds the i smallest values, sorted". Insertion: "a[0..i−1] is sorted (but holds the <i>original</i> first i values, not necessarily the smallest)". Say the invariant, show it holds at the start, is kept by one iteration, and gives sortedness at the end — that is a complete correctness proof.</p>
      <p><b>Exact costs.</b> Bubble and insertion both do exactly <b>I</b> swaps/shifts, where I = number of inversions (0 ≤ I ≤ N(N−1)/2). On a random array the expected I is N(N−1)/4, so the average case is still quadratic. Selection always does N(N−1)/2 comparisons. <b>Binary insertion sort</b> finds the slot with binary search (O(log i) comparisons) but still has to shift, so it is O(N log N) comparisons + O(N<sup>2</sup>) moves — worth it only when comparing is expensive (e.g. long strings).</p>
      <p><b>Production reality.</b> Real library sorts are hybrids: Java's TimSort (for objects) extends short natural runs to a minimum run length (a few dozen items) using <b>binary insertion sort</b>, and the dual-pivot quick sort for primitives switches to insertion sort for tiny sub-arrays, because for ~20–40 items the simple loop beats recursion overhead and is cache-friendly (it walks memory left to right). <b>Shell sort</b> runs insertion sort on items a "gap" apart, shrinking the gap — it moves far-away items quickly and is still used in some embedded code because it needs no recursion and no extra memory.</p>
      <p><b>Edge cases.</b> Empty or one-element arrays: all loops run zero times — check your bounds (<code>n - 1</code> with n = 0 is −1, the for-loop simply does not run). Using <code>&gt;=</code> instead of <code>&gt;</code> in bubble/insertion still sorts, but <b>breaks stability</b> and does pointless swaps of equal items.</p>`,
    aiEra: `<p><b>What AI changes:</b> nobody hand-writes bubble sort in production, and any assistant will produce all three in a second. Interviewers know this, so they ask what an AI cannot fake for you: "trace the array after pass 2", "how many swaps will this input take?", "which of these is stable and why?", "why does the library still use insertion sort inside?".</p>
      <p><b>Use AI as a partner:</b> ask <code>Give me 5 small arrays and ask me to predict the array after each bubble pass; check my answers</code> or <code>Generate a nearly-sorted array where insertion sort beats merge sort, and explain why</code>. Ask it to write a counter of comparisons and swaps so you can <b>measure</b> best/worst cases yourself.</p>
      <p><b>Where AI goes wrong:</b> off-by-one inner loops (<code>j &lt; n - pass</code> reading a[j+1] out of bounds), forgetting the early-exit flag but still claiming O(N) best case, calling selection sort stable, or using <code>&gt;=</code> in insertion sort. <b>What you must still own:</b> the invariant for each algorithm, the link "swaps = inversions", and recognising "nearly sorted" or "minimum writes" in a question.</p>`,
    problems: [
      {
        title: 'Sort a Nearly Sorted (K-Sorted) Array',
        level: 'Easy',
        tags: ['insertion sort', 'nearly sorted', 'inversions'],
        companies: ['Amazon', 'Microsoft', 'Flipkart'],
        statement: `<p>You are given an array where every element is <b>at most K positions away</b> from where it would be in the sorted array. Sort it in place, taking advantage of this fact (do better than a general O(N<sup>2</sup>) sort when K is small).</p>`,
        constraints: `1 ≤ N ≤ 10<sup>5</sup>, 0 ≤ K ≤ 10, |a[i]| ≤ 10<sup>9</sup>`,
        example: `${H.arr([6, 5, 3, 2, 8, 10, 9], { label: 'a, K = 3' })}
          ${H.arr([2, 3, 5, 6, 8, 9, 10], { label: 'output', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g', 4: 'g', 5: 'g', 6: 'g' } })}
          <p>Why it is "3-sorted": 2 sits at index 3 but belongs at index 0 → ${H.c('y', '3 places away')}; 9 sits at index 6 and belongs at 5 → 1 away. No element is more than 3 away, so each key in insertion sort shifts <b>at most 3</b> times.</p>`,
        brute: {
          why: `<p>Selection sort ignores the hint completely: it always scans the whole remaining array for the minimum → N<sup>2</sup>/2 ≈ 5·10<sup>9</sup> comparisons for N = 10<sup>5</sup> → TLE. The waste: the minimum of the rest is guaranteed to be within the next K + 1 cells, yet we scan all of them.</p>`,
          code: { lang: 'java', code: `
            void brute(int[] a) {
                for (int i = 0; i < a.length - 1; i++) {
                    int m = i;
                    for (int j = i + 1; j < a.length; j++) if (a[j] < a[m]) m = j;  // scans everything
                    int t = a[i]; a[i] = a[m]; a[m] = t;
                }
            }`, alt: [{ lang: 'python', code: String.raw`
def sort_k_sorted(a, k):
    for i in range(len(a) - 1):
        m = i
        for j in range(i + 1, len(a)):
            if a[j] < a[m]:
                m = j                      # scans everything
        a[i], a[m] = a[m], a[i]` }, { lang: 'js', code: String.raw`
function sortKSorted(a, k) {
  for (let i = 0; i < a.length - 1; i++) {
    let m = i;
    for (let j = i + 1; j < a.length; j++) if (a[j] < a[m]) m = j;  // scans everything
    const t = a[i]; a[i] = a[m]; a[m] = t;
  }
}` }, { lang: 'cpp', code: String.raw`
void sortKSorted(vector<int>& a, int k) {
    for (int i = 0; i < (int) a.size() - 1; i++) {
        int m = i;
        for (int j = i + 1; j < (int) a.size(); j++) if (a[j] < a[m]) m = j;  // scans everything
        swap(a[i], a[m]);
    }
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public void SortKSorted(int[] a, int k) {
        for (int i = 0; i < a.Length - 1; i++) {
            int m = i;
            for (int j = i + 1; j < a.Length; j++) if (a[j] < a[m]) m = j;  // scans everything
            int t = a[i]; a[i] = a[m]; a[m] = t;
        }
    }
}` }] }
        },
        mcq: {
          q: 'Every element is at most K places from its sorted position. How many times can one key shift left during insertion sort?',
          options: ['At most 1', 'At most K', 'At most N', 'Exactly K'],
          answer: 1,
          explain: 'An item can only be passed by elements that belong after it but sit before it. With the K-sorted promise there are at most K such elements, so each key shifts at most K times → O(N·K) total.'
        },
        hints: [
          `<p><b>Aha:</b> insertion sort's cost is "N + number of inversions". If nothing is far from home, there are few inversions, so insertion sort is almost linear here.</p>`,
          `<p>Plain insertion sort: <code>key = a[i]</code>, shift bigger items right while <code>j &gt;= 0 &amp;&amp; a[j] &gt; key</code>, drop key at <code>j + 1</code>. The while-loop runs at most K times per key.</p>`,
          `<p>Edge cases: K = 0 means already sorted (0 shifts); N = 1 nothing to do; use <code>&gt;</code> (not ≥) to keep equal values stable. Recipe: for i = 1..N−1: key = a[i]; j = i−1; while j ≥ 0 and a[j] &gt; key: a[j+1] = a[j], j−− ; a[j+1] = key. (For large K, a min-heap of size K + 1 gives O(N log K) — Heaps module.)</p>`
        ],
        tests: { sig: 'int[] int -> void', fn: 'sortKSorted', mutate: 0, cases: [
          [[[6, 5, 3, 2, 8, 10, 9], 3], [2, 3, 5, 6, 8, 9, 10]],
          [[[1], 0], [1]],
          [[[1, 2, 3], 0], [1, 2, 3]],
          [[[2, 1], 1], [1, 2]],
          [[[3, 3, 1, 1], 2], [1, 1, 3, 3]],
          [[[-5, -10, 0, 0, 7], 1], [-10, -5, 0, 0, 7]],
          [[[1000000000, -1000000000], 1], [-1000000000, 1000000000]],
          [[[4, 3, 2, 1], 3], [1, 2, 3, 4]]
        ] },
        solution: {
          approach: `<p>Insertion sort, whose inner loop is bounded by K thanks to the promise → O(N·K).</p>`,
          code: `
            class Solution {
                public void sortKSorted(int[] a, int k) {
                    for (int i = 1; i < a.length; i++) {
                        int key = a[i];                 // next card to place
                        int j = i - 1;
                        // at most k bigger items can be in front of key (K-sorted promise)
                        while (j >= 0 && a[j] > key) {
                            a[j + 1] = a[j];            // shift right
                            j--;
                        }
                        a[j + 1] = key;                 // drop into the gap
                    }
                }

                public static void main(String[] args) {
                    int[] a = {6, 5, 3, 2, 8, 10, 9};
                    new Solution().sortKSorted(a, 3);
                    System.out.println(Arrays.toString(a)); // [2, 3, 5, 6, 8, 9, 10]
                }
            }`,
          alt: [
            { lang: 'python', run: true, code: `def sort_k_sorted(a, k):
    for i in range(1, len(a)):
        key, j = a[i], i - 1
        while j >= 0 and a[j] > key:   # at most k shifts (K-sorted promise)
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = key                 # drop into the gap

nums = [6, 5, 3, 2, 8, 10, 9]
sort_k_sorted(nums, 3)
print(nums)  # [2, 3, 5, 6, 8, 9, 10]` },
            { lang: 'js', code: `function sortKSorted(a, k) {
  for (let i = 1; i < a.length; i++) {
    const key = a[i];                  // next card to place
    let j = i - 1;
    while (j >= 0 && a[j] > key) {     // at most k shifts (K-sorted promise)
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = key;                    // drop into the gap
  }
}` },
            { lang: 'cpp', code: `class Solution {
public:
    void sortKSorted(vector<int>& a, int k) {
        for (int i = 1; i < (int)a.size(); i++) {
            int key = a[i], j = i - 1;          // next card to place
            while (j >= 0 && a[j] > key) {      // at most k shifts (K-sorted promise)
                a[j + 1] = a[j];
                j--;
            }
            a[j + 1] = key;                     // drop into the gap
        }
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public void SortKSorted(int[] a, int k) {
        for (int i = 1; i < a.Length; i++) {
            int key = a[i];                 // next card to place
            int j = i - 1;
            // at most k bigger items can be in front of key (K-sorted promise)
            while (j >= 0 && a[j] > key) {
                a[j + 1] = a[j];            // shift right
                j--;
            }
            a[j + 1] = key;                 // drop into the gap
        }
    }
}` }
          ],
          dry: {
            head: ['i', 'key', 'items shifted right', 'shifts', 'array after'],
            rows: [
              ['1', '5', '6', '1', '5 6 3 2 8 10 9'],
              ['2', '3', '6, 5', '2', '3 5 6 2 8 10 9'],
              ['3', '2', '6, 5, 3', '<span class="c-y">3 = K</span>', '2 3 5 6 8 10 9'],
              ['4', '8', '—', '0', '2 3 5 6 8 10 9'],
              ['5', '10', '—', '0', '2 3 5 6 8 10 9'],
              ['6', '9', '10', '1', '<span class="c-p">2 3 5 6 8 9 10</span>']
            ]
          },
          complexity: `<p><b>Time O(N·K)</b>: each of the N keys shifts at most K times (here ≤ 10<sup>6</sup> steps). <b>Space O(1)</b>: in place. Stable.</p>`,
          followUps: ['K can be up to N/2 — use a min-heap of size K + 1 for O(N log K).', 'Count the total number of shifts without sorting (inversion count).', 'What if the array is a linked list?']
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 2: Count Sort & Radix Sort
  // =====================================================================
  topics.push({
    title: 'Count Sort & Radix Sort (sorting without comparing)',
    analogy: `<p><b>Count sort</b> is a teacher with 1,000 exam papers whose marks are only 0 to 10. She does not compare papers with each other. She makes <b>11 piles</b> (one per mark), drops each paper on its pile, and then picks up pile 0, pile 1, … pile 10. Done — in one sweep!</p>
      <p><b>Radix sort</b> is the post office sorting letters by PIN code: first sort all letters by the <b>last digit</b>, then (keeping that order) by the second-last digit, and so on. After the final (first) digit, everything is in full order.</p>`,
    explain: `<p>All the sorts that <b>compare two items</b> (bubble, merge, quick…) can never beat <b>O(N log N)</b> in general. But if the values are <b>small whole numbers</b>, we can cheat: use the value itself as an <b>index</b> into a counting array.</p>
      <h4>Count sort (values in 0..K)</h4>
      ${H.arr([2, 0, 3, 2, 1, 0], { label: 'input a' })}
      ${H.arr([2, 1, 2, 1], { label: 'count[v]', hl: { 0: 'b', 2: 'b' } })}
      <p>count[0] = 2 means "two zeros", count[2] = 2 means "two 2s". Now write each value <code>v</code> exactly <code>count[v]</code> times:</p>
      ${H.arr([0, 0, 1, 2, 2, 3], { label: 'output', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g', 4: 'g', 5: 'g' } })}
      <p><b>Time O(N + K)</b>: one pass to count, one pass over the K+1 piles. <b>Space O(K)</b> for the counts. Great when K is around N or smaller (marks, ages, letters 'a'..'z', digits). Terrible when K is huge (values up to 10<sup>9</sup> → an array of a billion counters!).</p>
      <h4>Stable count sort (needed for objects and for radix)</h4>
      <p>When you sort <b>records</b> (e.g. students by mark) you cannot just "write the value"; you must move the whole record and keep equal marks in their original order. Trick: turn counts into <b>prefix sums</b> = "how many items are ≤ v", which tells each value the <b>last slot</b> it may use. Walk the input <b>from right to left</b> and place each item at <code>--pos[v]</code>.</p>
      ${H.table(['v', '0', '1', '2', '3'], [
        ['count[v]', '2', '1', '2', '1'],
        ['prefix (items ≤ v)', '2', '3', '5', '6'],
        ['slots used by v', '0..1', '2', '3..4', '5']
      ])}
      <h4>Radix sort (LSD = least significant digit first)</h4>
      <p>Sort by the <b>ones</b> digit, then the <b>tens</b>, then the <b>hundreds</b>… each time with a <b>stable</b> count sort on that digit (only 10 piles). Because each pass is stable, ties on the current digit keep the order from earlier digits.</p>
      ${H.table(['pass', 'digit used', 'array after the pass'], [
        ['start', '—', '170 45 75 90 802 24 2 66'],
        ['1', 'ones', '17<b>0</b> 9<b>0</b> 80<b>2</b> <b>2</b> 2<b>4</b> 4<b>5</b> 7<b>5</b> 6<b>6</b>'],
        ['2', 'tens', '8<b>0</b>2 <b>0</b>2 <b>2</b>4 <b>4</b>5 <b>6</b>6 1<b>7</b>0 <b>7</b>5 <b>9</b>0'],
        ['3', 'hundreds', '<span class="c-g">2 24 45 66 75 90 170 802</span>']
      ])}
      <p><b>Time O(d · (N + 10))</b> where d = number of digits (≤ 10 for an int). For N = 10<sup>6</sup> numbers up to 10<sup>9</sup>: 10 passes × 10<sup>6</sup> — linear! <b>Negative numbers?</b> Add an offset (subtract the minimum) first, or sort negatives and positives separately.</p>`,
    clues: [
      '"Values are in the range <b>0..K</b>" with K ≤ 10<sup>6</sup> (marks, ages, colours 0/1/2, lowercase letters) → count sort, O(N + K).',
      '"Sort in <b>linear time</b> / O(N)" or "you cannot use a comparison sort" → count sort or radix sort.',
      '"Integers up to 10<sup>9</sup>, N up to 10<sup>6</sup>, need faster than N log N" → radix sort (by digits or by bytes).',
      '"Sort strings / words of equal length character by character" → radix sort on characters.',
      '"<b>Frequency</b> of each value" or "how many elements ≤ x" → a count array + prefix sums (the same machinery).',
      'Values can be up to 10<sup>9</sup> with no digit trick allowed → count sort is <span class="c-r">NOT</span> usable (the count array would be gigantic).'
    ],
    code: [{ lang: 'java', code: `
      // Stable counting sort: returns a new sorted array, values must be in 0..k.
      int[] stableCountSort(int[] a, int k) {
          int[] cnt = new int[k + 1];
          for (int x : a) cnt[x]++;                   // 1) count each value
          for (int v = 1; v <= k; v++) cnt[v] += cnt[v - 1]; // 2) prefix: how many items are <= v
          int[] out = new int[a.length];
          for (int i = a.length - 1; i >= 0; i--) {   // 3) right-to-left keeps equal items in order
              out[--cnt[a[i]]] = a[i];                // last free slot for this value
          }
          return out;
      }`,
      alt: [
        { lang: 'python', code: `# Stable counting sort: returns a new sorted list, values must be in 0..k.
from itertools import accumulate

def stable_count_sort(a, k):
    cnt = [0] * (k + 1)
    for x in a:
        cnt[x] += 1                             # 1) count each value
    pos = list(accumulate(cnt))                 # 2) prefix: how many items are <= v
    out = [0] * len(a)
    for x in reversed(a):                       # 3) right-to-left keeps equal items in order
        pos[x] -= 1
        out[pos[x]] = x                         # last free slot for this value
    return out` },
        { lang: 'js', code: `// Stable counting sort: returns a new sorted array, values must be in 0..k.
function stableCountSort(a, k) {
  const cnt = new Int32Array(k + 1);
  for (const x of a) cnt[x]++;                          // 1) count each value
  for (let v = 1; v <= k; v++) cnt[v] += cnt[v - 1];    // 2) prefix: how many items are <= v
  const out = new Array(a.length);
  for (let i = a.length - 1; i >= 0; i--) {             // 3) right-to-left keeps equal items in order
    out[--cnt[a[i]]] = a[i];                            // last free slot for this value
  }
  return out;
}` },
        { lang: 'cpp', code: `// Stable counting sort: returns a new sorted vector, values must be in 0..k.
vector<int> stableCountSort(const vector<int>& a, int k) {
    vector<int> cnt(k + 1, 0);
    for (int x : a) cnt[x]++;                              // 1) count each value
    partial_sum(cnt.begin(), cnt.end(), cnt.begin());      // 2) prefix: how many items are <= v
    vector<int> out(a.size());
    for (int i = (int)a.size() - 1; i >= 0; i--)           // 3) right-to-left keeps order
        out[--cnt[a[i]]] = a[i];                           // last free slot for this value
    return out;
}` }, { lang: 'csharp', code: String.raw`
// Stable counting sort: returns a new sorted array, values must be in 0..k.
int[] StableCountSort(int[] a, int k) {
    int[] cnt = new int[k + 1];
    foreach (int x in a) cnt[x]++;                     // 1) count each value
    for (int v = 1; v <= k; v++) cnt[v] += cnt[v - 1]; // 2) prefix: how many items are <= v
    int[] result = new int[a.Length];
    for (int i = a.Length - 1; i >= 0; i--) {          // 3) right-to-left keeps equal items in order
        result[--cnt[a[i]]] = a[i];                    // last free slot for this value
    }
    return result;
}` }
      ] }, { lang: 'java', code: `
      // LSD radix sort for non-negative ints, base 10.
      void radixSort(int[] a) {
          if (a.length == 0) return;
          int max = Arrays.stream(a).max().getAsInt();
          int[] out = new int[a.length];
          // exp = 1, 10, 100, ... picks the ones, tens, hundreds digit
          for (long exp = 1; max / exp > 0; exp *= 10) {
              int[] cnt = new int[10];
              for (int x : a) cnt[(int) (x / exp % 10)]++;          // count digits
              for (int d = 1; d < 10; d++) cnt[d] += cnt[d - 1];      // prefix sums
              for (int i = a.length - 1; i >= 0; i--) {              // stable placement
                  int d = (int) (a[i] / exp % 10);
                  out[--cnt[d]] = a[i];
              }
              System.arraycopy(out, 0, a, 0, a.length);              // copy back for the next digit
          }
      }`,
      alt: [
        { lang: 'python', code: `# LSD radix sort for non-negative ints, base 10.
def radix_sort(a):
    if not a:
        return a
    exp, mx = 1, max(a)
    while mx // exp > 0:                            # exp = 1, 10, 100, ... picks each digit
        buckets = [[] for _ in range(10)]
        for x in a:
            buckets[x // exp % 10].append(x)        # append keeps arrival order: stable
        a[:] = [x for b in buckets for x in b]      # collect buckets 0..9
        exp *= 10
    return a` },
        { lang: 'js', code: `// LSD radix sort for non-negative ints, base 10.
function radixSort(a) {
  if (a.length === 0) return;
  const max = Math.max(...a);
  const out = new Array(a.length);
  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {   // ones, tens, hundreds ...
    const cnt = new Int32Array(10);
    for (const x of a) cnt[Math.floor(x / exp) % 10]++;        // count digits
    for (let d = 1; d < 10; d++) cnt[d] += cnt[d - 1];         // prefix sums
    for (let i = a.length - 1; i >= 0; i--) {                  // stable placement
      out[--cnt[Math.floor(a[i] / exp) % 10]] = a[i];
    }
    for (let i = 0; i < a.length; i++) a[i] = out[i];          // copy back for the next digit
  }
}` },
        { lang: 'cpp', code: `// LSD radix sort for non-negative ints, base 10.
void radixSort(vector<int>& a) {
    if (a.empty()) return;
    int mx = *max_element(a.begin(), a.end());
    vector<int> out(a.size());
    for (long long exp = 1; mx / exp > 0; exp *= 10) {      // long long: exp may pass 2^31
        array<int, 10> cnt{};
        for (int x : a) cnt[x / exp % 10]++;                  // count digits
        for (int d = 1; d < 10; d++) cnt[d] += cnt[d - 1];    // prefix sums
        for (int i = (int)a.size() - 1; i >= 0; i--)          // stable placement
            out[--cnt[a[i] / exp % 10]] = a[i];
        a.swap(out);                                          // out becomes the input of the next pass
    }
}` }, { lang: 'csharp', code: String.raw`
// LSD radix sort for non-negative ints, base 10.
void RadixSort(int[] a) {
    if (a.Length == 0) return;
    int max = a.Max();
    int[] result = new int[a.Length];
    // exp = 1, 10, 100, ... picks the ones, tens, hundreds digit
    for (long exp = 1; max / exp > 0; exp *= 10) {
        int[] cnt = new int[10];
        foreach (int x in a) cnt[(int)(x / exp % 10)]++;          // count digits
        for (int d = 1; d < 10; d++) cnt[d] += cnt[d - 1];        // prefix sums
        for (int i = a.Length - 1; i >= 0; i--) {                 // stable placement
            int d = (int)(a[i] / exp % 10);
            result[--cnt[d]] = a[i];
        }
        Array.Copy(result, a, a.Length);                          // copy back for the next digit
    }
}` }
      ] }],
    codeTitle: ['Stable count sort (prefix-sum version)', 'Radix sort (LSD, base 10)'],
    viz: [
      {
        title: 'Count sort: tally the piles, then write them out',
        input: '2 0 3 2 1 0 3 1',
        inputLabel: 'Numbers 0..9 (space separated, up to 14)',
        gen: function (input) {
          var a = parseNums(input, 14, { min: 0, max: 9, example: '2 0 3 2 1 0 3 1' });
          var k = Math.max.apply(null, a), frames = [], cnt = [], idx = [];
          for (var v = 0; v <= k; v++) { cnt.push(0); idx.push('v=' + v); }
          frames.push({ narr: 'The biggest value is K = ' + k + ', so we make ' + (k + 1) + ' counters (piles) count[0..' + k + '], all zero. No comparisons will be done at all!', parts: [
            { type: 'array', label: 'input', values: a.slice(), showIdx: true },
            { type: 'array', label: 'count[v]', values: cnt.slice(), idxLabels: idx.slice() }
          ] });
          for (var i = 0; i < a.length; i++) {
            cnt[a[i]]++;
            frames.push({ narr: 'Read a[' + i + '] = ' + a[i] + ' → <span class="c-g">count[' + a[i] + ']++</span> (now ' + cnt[a[i]] + '). The value itself tells us which counter to bump.', parts: [
              { type: 'array', label: 'input', values: a.slice(), hl: one(i, 'cur'), ptr: one(i, 'i'), showIdx: true },
              { type: 'array', label: 'count[v]', values: cnt.slice(), idxLabels: idx.slice(), hl: one(a[i], 'ok') }
            ] });
          }
          var out = [];
          for (v = 0; v <= k; v++) {
            if (cnt[v] === 0) {
              frames.push({ narr: 'count[' + v + '] = 0 → value ' + v + ' never appeared, write nothing.', parts: [
                { type: 'array', label: 'count[v]', values: cnt.slice(), idxLabels: idx.slice(), hl: one(v, 'done') },
                { type: 'array', label: 'output', values: out.length ? out.slice() : ['(empty)'] }
              ] });
              continue;
            }
            var from = out.length;
            for (var c = 0; c < cnt[v]; c++) out.push(v);
            var h = {}; for (var q = from; q < out.length; q++) h[q] = 'ok';
            frames.push({ narr: 'count[' + v + '] = ' + cnt[v] + ' → <span class="c-g">write ' + v + ' exactly ' + cnt[v] + ' time' + (cnt[v] > 1 ? 's' : '') + '</span> at the end of the output.', parts: [
              { type: 'array', label: 'count[v]', values: cnt.slice(), idxLabels: idx.slice(), hl: one(v, 'cur') },
              { type: 'array', label: 'output', values: out.slice(), hl: h, showIdx: true }
            ] });
          }
          frames.push({ narr: 'Done: N = ' + a.length + ' reads + K + 1 = ' + (k + 1) + ' piles → O(N + K) total. That beats O(N log N) when K is small.', parts: [
            { type: 'array', label: 'sorted output', values: out.slice(), showIdx: true },
            { type: 'vars', vals: { N: a.length, K: k, steps: a.length + k + 1 } }
          ] });
          return frames;
        }
      },
      {
        title: 'Radix sort: one stable pass per digit',
        input: '170 45 75 90 802 24 2 66',
        inputLabel: 'Non-negative numbers ≤ 9999 (up to 10)',
        gen: function (input) {
          var a = parseNums(input, 10, { min: 0, max: 9999, example: '170 45 75 90 802 24 2 66' });
          var frames = [], max = Math.max.apply(null, a), names = ['ones', 'tens', 'hundreds', 'thousands'];
          function bucketParts(b, hlKey) {
            var e = [];
            for (var d = 0; d < 10; d++) e.push([String(d), b[d].length ? b[d].join(', ') : '—']);
            var h = {}; if (hlKey !== undefined) h[String(hlKey)] = 'ok';
            return { type: 'map', label: 'buckets by digit (each bucket is a queue: first in, first out)', entries: e, hl: h };
          }
          frames.push({ narr: 'Max is ' + max + ', so we need one pass per digit of ' + max + '. Each pass drops numbers into 10 buckets (digit 0..9) <b>in order</b>, then collects buckets 0→9.', parts: [
            { type: 'array', label: 'array', values: a.slice(), showIdx: true }
          ] });
          var pass = 0;
          for (var exp = 1; Math.floor(max / exp) > 0; exp *= 10, pass++) {
            var b = [[], [], [], [], [], [], [], [], [], []];
            for (var i = 0; i < a.length; i++) {
              var d = Math.floor(a[i] / exp) % 10;
              b[d].push(a[i]);
              frames.push({ narr: 'Pass ' + (pass + 1) + ' (' + names[pass] + ' digit): ' + a[i] + ' has ' + names[pass] + ' digit <b>' + d + '</b> → append to the end of bucket ' + d + '.', parts: [
                { type: 'array', label: 'array', values: a.slice(), hl: one(i, 'cur'), ptr: one(i, 'i'), showIdx: true },
                bucketParts(b, d)
              ] });
            }
            var na = [];
            for (d = 0; d < 10; d++) na = na.concat(b[d]);
            a = na;
            frames.push({ narr: 'Collect buckets 0, 1, 2 … 9 in order. Now the array is sorted by the last ' + (pass + 1) + ' digit' + (pass ? 's' : '') + '. Because buckets keep arrival order (stable), earlier passes are not undone.', parts: [
              bucketParts(b),
              { type: 'array', label: 'array after pass ' + (pass + 1), values: a.slice(), showIdx: true }
            ] });
          }
          var all = {}; for (var q = 0; q < a.length; q++) all[q] = 'ok';
          frames.push({ narr: 'All ' + pass + ' digit passes done → fully sorted with zero comparisons between numbers. Cost: (number of digits) × (N + 10).', parts: [
            { type: 'array', label: 'sorted', values: a.slice(), hl: all, showIdx: true }
          ] });
          return frames;
        }
      }
    ],
    problems: [
      {
        title: 'Count Sort: Sort an Array of Values 0..K',
        level: 'Easy',
        tags: ['counting sort', 'frequency array'],
        statement: `<p>You are given an array <code>a</code> of <code>N</code> integers, and every value lies between <code>0</code> and <code>K</code> (inclusive). Return the array sorted in non-decreasing order in <b>O(N + K)</b> time.</p>`,
        constraints: `1 ≤ N ≤ 10<sup>6</sup>, 0 ≤ K ≤ 10<sup>6</sup>, 0 ≤ a[i] ≤ K`,
        example: `${H.arr([2, 0, 3, 2, 1, 0], { label: 'a (K = 3)' })}
          <p>Counts: ${H.c('b', 'two 0s')}, ${H.c('b', 'one 1')}, ${H.c('b', 'two 2s')}, ${H.c('b', 'one 3')}.</p>
          ${H.arr([0, 0, 1, 2, 2, 3], { label: 'output', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g', 4: 'g', 5: 'g' } })}
          <p>Why: writing each value as many times as it was counted, from small to big, gives exactly the sorted order.</p>`,
        brute: {
          why: `<p>Any O(N<sup>2</sup>) sort (bubble/selection/insertion) does ~10<sup>12</sup> steps for N = 10<sup>6</sup> → far too slow. Even the library sort (<code>Arrays.sort</code> / <code>sorted</code> / <code>arr.sort</code> / <code>std::sort</code>, O(N log N) ≈ 2·10<sup>7</sup>) works, but it ignores the gift in the question: values are <b>tiny</b>. The wasted work is comparing items whose order we could read straight off their value.</p>`,
          code: { lang: 'java', code: `
            int[] brute(int[] a) {
                int[] b = a.clone();
                // selection sort: O(N^2) comparisons
                for (int i = 0; i < b.length; i++) {
                    int m = i;
                    for (int j = i + 1; j < b.length; j++) if (b[j] < b[m]) m = j;
                    int t = b[i]; b[i] = b[m]; b[m] = t;
                }
                return b;
            }`, alt: [{ lang: 'python', code: String.raw`
def count_sort(a, k):
    b = a[:]
    # selection sort: O(N^2) comparisons
    for i in range(len(b)):
        m = i
        for j in range(i + 1, len(b)):
            if b[j] < b[m]:
                m = j
        b[i], b[m] = b[m], b[i]
    return b` }, { lang: 'js', code: String.raw`
function countSort(a, k) {
  const b = a.slice();
  // selection sort: O(N^2) comparisons
  for (let i = 0; i < b.length; i++) {
    let m = i;
    for (let j = i + 1; j < b.length; j++) if (b[j] < b[m]) m = j;
    const t = b[i]; b[i] = b[m]; b[m] = t;
  }
  return b;
}` }, { lang: 'cpp', code: String.raw`
vector<int> countSort(const vector<int>& a, int k) {
    vector<int> b = a;
    // selection sort: O(N^2) comparisons
    for (int i = 0; i < (int) b.size(); i++) {
        int m = i;
        for (int j = i + 1; j < (int) b.size(); j++) if (b[j] < b[m]) m = j;
        swap(b[i], b[m]);
    }
    return b;
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int[] CountSort(int[] a, int k) {
        int[] b = (int[])a.Clone();
        // selection sort: O(N^2) comparisons
        for (int i = 0; i < b.Length; i++) {
            int m = i;
            for (int j = i + 1; j < b.Length; j++) if (b[j] < b[m]) m = j;
            int t = b[i]; b[i] = b[m]; b[m] = t;
        }
        return b;
    }
}` }] }
        },
        mcq: {
          q: 'You must sort 10<sup>6</sup> exam marks, each between 0 and 100. What is the smartest plan?',
          options: ['Bubble sort, it is simple', 'Count how many times each mark 0..100 appears, then write them out', 'Merge sort, because it is always the best', 'Put them in a HashSet and read it back'],
          answer: 1,
          explain: 'Only 101 possible values → a count array of size 101 sorts in O(N + 101). A HashSet would lose duplicates and has no order; merge sort works but is O(N log N) and does needless comparisons.'
        },
        hints: [
          `<p><b>Aha:</b> with values in 0..K you never need to compare two items. If you know <b>how many</b> 0s, 1s, 2s… there are, the sorted array is just "all the 0s, then all the 1s, then …".</p>`,
          `<p>Use a count array of size K + 1, all zeros (<code>new int[K + 1]</code> / <code>[0] * (K + 1)</code> / <code>new Int32Array(K + 1)</code> / <code>vector&lt;int&gt;(K + 1)</code>). Pass 1: <code>cnt[x]++</code> for each x. Pass 2: a write pointer <code>w</code>; for v from 0 to K, write v into <code>out[w++]</code> exactly <code>cnt[v]</code> times.</p>`,
          `<p>Traps: size must be <b>K + 1</b> (value K needs index K); if values can be negative, shift everything by <code>-min</code>; if K is huge (10<sup>9</sup>) this idea fails — use a normal sort. Recipe: cnt = zeros(K+1) → count → w = 0 → for v in 0..K: repeat cnt[v] times: out[w++] = v → return out.</p>`
        ],
        tests: { sig: 'int[] int -> int[]', fn: 'countSort', cases: [
          [[[2, 0, 3, 2, 1, 0], 3], [0, 0, 1, 2, 2, 3]],
          [[[0], 0], [0]],
          [[[5], 5], [5]],
          [[[1, 1, 1], 1], [1, 1, 1]],
          [[[3, 2, 1, 0], 3], [0, 1, 2, 3]],
          [[[0, 10, 5, 10, 0], 10], [0, 0, 5, 10, 10]],
          [[[7, 7, 0], 1000], [0, 7, 7]]
        ] },
        solution: {
          approach: `<p>Tally every value in a count array, then rebuild the array by walking the counts from 0 to K.</p>`,
          code: `
            class Solution {
                public int[] countSort(int[] a, int k) {
                    int[] cnt = new int[k + 1];       // cnt[v] = how many times v appears
                    for (int x : a) {
                        cnt[x]++;                      // the value itself is the index
                    }
                    int[] out = new int[a.length];
                    int w = 0;                         // next free position in out
                    for (int v = 0; v <= k; v++) {     // small values first
                        for (int c = 0; c < cnt[v]; c++) {
                            out[w++] = v;              // write v as many times as we saw it
                        }
                    }
                    return out;
                }

                public static void main(String[] args) {
                    int[] r = new Solution().countSort(new int[]{2, 0, 3, 2, 1, 0}, 3);
                    System.out.println(Arrays.toString(r)); // [0, 0, 1, 2, 2, 3]
                }
            }`,
          alt: [
            { lang: 'python', code: `def count_sort(a, k):
    cnt = [0] * (k + 1)              # cnt[v] = how many times v appears
    for x in a:
        cnt[x] += 1                  # the value itself is the index
    out = []
    for v, c in enumerate(cnt):      # small values first
        out.extend([v] * c)          # write v as many times as we saw it
    return out` },
            { lang: 'js', code: `function countSort(a, k) {
  const cnt = new Int32Array(k + 1);   // cnt[v] = how many times v appears
  for (const x of a) cnt[x]++;         // the value itself is the index
  const out = new Array(a.length);
  let w = 0;                           // next free position in out
  for (let v = 0; v <= k; v++) {
    for (let c = 0; c < cnt[v]; c++) out[w++] = v;
  }
  return out;
}` },
            { lang: 'cpp', code: `class Solution {
public:
    vector<int> countSort(const vector<int>& a, int k) {
        vector<int> cnt(k + 1, 0);           // cnt[v] = how many times v appears
        for (int x : a) cnt[x]++;            // the value itself is the index
        vector<int> out;
        out.reserve(a.size());
        for (int v = 0; v <= k; v++)
            out.insert(out.end(), cnt[v], v); // write v cnt[v] times
        return out;
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int[] CountSort(int[] a, int k) {
        int[] cnt = new int[k + 1];       // cnt[v] = how many times v appears
        foreach (int x in a) {
            cnt[x]++;                      // the value itself is the index
        }
        int[] result = new int[a.Length];
        int w = 0;                         // next free position in result
        for (int v = 0; v <= k; v++) {     // small values first
            for (int c = 0; c < cnt[v]; c++) {
                result[w++] = v;           // write v as many times as we saw it
            }
        }
        return result;
    }
}` }
          ],
          dry: {
            head: ['phase', 'step', 'value', 'cnt[0..3]', 'out so far'],
            rows: [
              ['count', 'i = 0', '2', '[0,0,<span class="c-g">1</span>,0]', '—'],
              ['count', 'i = 1', '0', '[<span class="c-g">1</span>,0,1,0]', '—'],
              ['count', 'i = 2', '3', '[1,0,1,<span class="c-g">1</span>]', '—'],
              ['count', 'i = 3', '2', '[1,0,<span class="c-g">2</span>,1]', '—'],
              ['count', 'i = 4', '1', '[1,<span class="c-g">1</span>,2,1]', '—'],
              ['count', 'i = 5', '0', '[<span class="c-g">2</span>,1,2,1]', '—'],
              ['write', 'v = 0', 'cnt = 2', '[2,1,2,1]', '0 0'],
              ['write', 'v = 1', 'cnt = 1', '[2,1,2,1]', '0 0 1'],
              ['write', 'v = 2', 'cnt = 2', '[2,1,2,1]', '0 0 1 2 2'],
              ['write', 'v = 3', 'cnt = 1', '[2,1,2,1]', '<span class="c-p">0 0 1 2 2 3</span>']
            ]
          },
          complexity: `<p><b>Time O(N + K)</b>: the counting loop touches each of the N items once; the writing loop visits each of the K + 1 counters once and writes N values in total. <b>Space O(N + K)</b>: the count array (K + 1) plus the output (N).</p>`
        }
      }
    ]
  });

  // ---------- TOPIC 2 extras ----------
  Object.assign(topics[topics.length - 1], {
    examples: [
      {
        title: 'Sort 0s, 1s and 2s by counting (two passes)',
        html: `<p>Input ${H.arr([2, 0, 2, 1, 1, 0], { label: 'colours' })} Count: ${H.kv([['0', 2], ['1', 2], ['2', 2]], { label: 'cnt' })} Rewrite: two 0s, two 1s, two 2s → ${H.arr([0, 0, 1, 1, 2, 2], { label: 'out', hl: { 0: 'b', 1: 'b', 2: 'y', 3: 'y', 4: 'r', 5: 'r' } })}</p>
          <p>K = 2 so the count array has just 3 cells: O(N + 3) = O(N). (The one-pass Dutch National Flag partition in the Quick Sort topic is the follow-up interviewers ask for.)</p>`
      },
      {
        title: 'Negative numbers: shift by the minimum',
        html: `<p>Input [−3, 1, −1, 0]. min = −3, so use index <code>v − min</code> = v + 3:</p>
          ${H.table(['value v', '−3', '−1', '0', '1'], [['index v + 3', '0', '2', '3', '4']])}
          <p>Count array size = max − min + 1 = 5. Write back value = index + min → [−3, −1, 0, 1]. Cost O(N + range), where range = max − min.</p>`,
        code: { lang: 'java', code: `
          int[] countSortWithNegatives(int[] a) {
              int min = Integer.MAX_VALUE, max = Integer.MIN_VALUE;
              for (int x : a) { min = Math.min(min, x); max = Math.max(max, x); }
              int[] cnt = new int[max - min + 1];       // assumes the range fits in memory
              for (int x : a) cnt[x - min]++;            // shift so the smallest value maps to 0
              int w = 0;
              for (int i = 0; i < cnt.length; i++)
                  while (cnt[i]-- > 0) a[w++] = i + min; // shift back
              return a;
          }`,
          alt: [
            { lang: 'python', run: true, code: `def count_sort_with_negatives(a):
    lo, hi = min(a), max(a)
    cnt = [0] * (hi - lo + 1)                # assumes the range fits in memory
    for x in a:
        cnt[x - lo] += 1                     # shift so the smallest value maps to 0
    return [i + lo for i, c in enumerate(cnt) for _ in range(c)]   # shift back

print(count_sort_with_negatives([-3, 1, -1, 0]))  # [-3, -1, 0, 1]` },
            { lang: 'js', run: true, code: `function countSortWithNegatives(a) {
  let min = Infinity, max = -Infinity;
  for (const x of a) { min = Math.min(min, x); max = Math.max(max, x); }
  const cnt = new Int32Array(max - min + 1);   // assumes the range fits in memory
  for (const x of a) cnt[x - min]++;           // shift so the smallest value maps to 0
  let w = 0;
  for (let i = 0; i < cnt.length; i++) {
    while (cnt[i]-- > 0) a[w++] = i + min;     // shift back
  }
  return a;
}
console.log(countSortWithNegatives([-3, 1, -1, 0]));   // [ -3, -1, 0, 1 ]` },
            { lang: 'cpp', code: `vector<int> countSortWithNegatives(vector<int> a) {
    auto [mnIt, mxIt] = minmax_element(a.begin(), a.end());
    int mn = *mnIt, mx = *mxIt;
    vector<int> cnt(mx - mn + 1, 0);          // assumes the range fits in memory
    for (int x : a) cnt[x - mn]++;            // shift so the smallest value maps to 0
    int w = 0;
    for (int i = 0; i < (int)cnt.size(); i++)
        while (cnt[i]-- > 0) a[w++] = i + mn; // shift back
    return a;
}` }, { lang: 'csharp', code: String.raw`
int[] CountSortWithNegatives(int[] a) {
    int min = int.MaxValue, max = int.MinValue;
    foreach (int x in a) { min = Math.Min(min, x); max = Math.Max(max, x); }
    int[] cnt = new int[max - min + 1];       // assumes the range fits in memory
    foreach (int x in a) cnt[x - min]++;      // shift so the smallest value maps to 0
    int w = 0;
    for (int i = 0; i < cnt.Length; i++)
        while (cnt[i]-- > 0) a[w++] = i + min; // shift back
    return a;
}` }
          ] }
      },
      {
        title: 'Stable count sort of records (students by mark)',
        html: `<p>Records (A,2) (B,0) (C,2) (D,1). Counts: mark0 = 1, mark1 = 1, mark2 = 2 → prefix "items ≤ v": [1, 2, 4]. Walk <b>right to left</b>, placing each record at <code>--pos[mark]</code>:</p>
          ${H.table(['record', 'pos before', 'placed at', 'out'], [
            ['(D,1)', 'pos[1] = 2', '1', '_ D _ _'],
            ['(C,2)', 'pos[2] = 4', '3', '_ D _ C'],
            ['(B,0)', 'pos[0] = 1', '0', 'B D _ C'],
            ['(A,2)', 'pos[2] = 3', '2', '<span class="c-g">B D A C</span>']
          ])}
          <p>A and C both have mark 2 and A came first in the input — and A is still before C. That is <b>stability</b>, and radix sort depends on it.</p>`
      },
      {
        title: 'Radix sort on equal-length words',
        html: `<p>Words cab, abc, bca, acb. Sort by the <b>last</b> letter, then the middle, then the first — each pass stable:</p>
          ${H.table(['pass', 'key letter', 'result'], [
            ['1', '3rd', 'bca cab acb abc'],
            ['2', '2nd', 'cab abc bca acb'],
            ['3', '1st', '<span class="c-g">abc acb bca cab</span>']
          ])}
          <p>Cost: L passes × (N + 26) for N words of length L — independent of how many comparisons a comparison sort would need.</p>`
      }
    ],
    deepDive: `<p><b>Why comparison sorts cannot beat N log N.</b> A comparison sort is a decision tree: each comparison is a yes/no branch, and each leaf is one possible output order. There are N! orders, so the tree needs at least N! leaves, hence height ≥ log₂(N!) ≈ N log₂N − 1.44N. Counting/radix sorts escape this bound because they never compare two items — they use the <b>value as an array index</b>, which is extra information a comparison cannot give.</p>
      <p><b>Choosing the radix (base).</b> Base 10 is for teaching. Real radix sorts use base 256 (one byte per pass): a 32-bit int needs 4 passes with 256 counters each; a 64-bit long needs 8. Base 2<sup>16</sup> halves the passes but the 65,536-entry count array no longer fits the fastest CPU cache, so it can be slower. <b>Signed ints:</b> flip the sign bit (<code>x ^ 0x80000000</code>) before extracting digits so negatives sort before positives. <b>MSD radix</b> (most significant digit first) recurses into buckets and is the basis of fast string sorts; <b>bucket sort</b> spreads uniformly distributed floats into N buckets for expected O(N).</p>
      <p><b>When it loses.</b> Count sort with a range of 10<sup>9</sup> needs 4 GB of counters. Radix sort on 10 numbers is slower than insertion sort (constant overhead). It also needs O(N) extra space for the output buffer and is awkward with custom comparators. <b>Production reality:</b> the JDK's <code>Arrays.sort</code> switches to counting sort for large <code>byte[]</code>, <code>char[]</code> and <code>short[]</code> arrays (tiny value ranges); databases and GPU libraries use radix sort for integer keys; suffix-array construction uses repeated radix passes.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant will happily answer "sort this" with the library sort (<code>Arrays.sort</code>, <code>sorted</code>, <code>std::sort</code>). Recognising that the <b>value range is tiny</b> (ages, marks, ASCII letters, colours) and switching to O(N + K) is still your job — it is a constraint-reading skill, not a typing skill.</p>
      <p><b>Use AI as a partner:</b> <code>Benchmark count sort vs the built-in sort for 10^7 ints in [0, 100] and [0, 10^9]; explain the difference</code> — then read the numbers yourself. Ask it to generate radix-sort traces for you to verify by hand, or to explain why the right-to-left loop makes count sort stable.</p>
      <p><b>Where AI goes wrong:</b> count array sized K instead of K + 1 (index out of bounds), forgetting negatives, a left-to-right placement loop with <code>--cnt</code> that silently breaks stability (and therefore radix sort), or using <code>x / exp % 10</code> with an <code>int exp</code> that overflows past 10<sup>9</sup>. <b>What you must still own:</b> the N log N lower-bound argument, knowing when O(N + K) is actually better, and why stability is the engine of radix sort.</p>`
  });

  // =====================================================================
  // TOPIC 3: Merge Sort + Inversion Count
  // =====================================================================
  topics.push({
    title: 'Merge Sort: Divide & Conquer (+ Inversion Count)',
    analogy: `<p>A teacher has to sort 64 exam papers by roll number. Too many to do at once, so she gives <b>half to each of two helpers</b>. They each split again… until every helper holds just <b>one paper</b> (one paper is always "sorted"). Now they walk back up: two helpers each hold a sorted pile, put both piles <b>face up side by side</b>, and repeatedly take the <b>smaller top paper</b> onto a new pile. That "compare the two tops" step is the <b>merge</b>.</p>`,
    explain: `<p><b>Divide &amp; Conquer</b> = (1) <b>divide</b> the problem into halves, (2) <b>conquer</b> each half recursively, (3) <b>combine</b> the answers. For merge sort the hard work is in step 3.</p>
      <h4>The merge step (two pointers)</h4>
      ${H.arr([2, 5, 8], { label: 'left', ptr: { 0: 'i' }, hl: { 0: 'y' } })}
      ${H.arr([1, 4, 9], { label: 'right', ptr: { 0: 'j' }, hl: { 0: 'y' } })}
      ${H.table(['compare', 'take', 'merged so far'], [
        ['2 vs 1', '1 (right)', '1'],
        ['2 vs 4', '2 (left)', '1 2'],
        ['5 vs 4', '4 (right)', '1 2 4'],
        ['5 vs 9', '5 (left)', '1 2 4 5'],
        ['8 vs 9', '8 (left)', '1 2 4 5 8'],
        ['left empty', 'copy rest: 9', '<span class="c-g">1 2 4 5 8 9</span>']
      ])}
      <p>Each comparison places one item, so merging two piles of total size N costs <b>O(N)</b>.</p>
      <h4>Why O(N log N)?</h4>
      ${H.table(['level', 'pieces', 'size of each', 'merge work on this level'], [
        ['0', '1', 'N', 'N'],
        ['1', '2', 'N/2', 'N'],
        ['2', '4', 'N/4', 'N'],
        ['…', '…', '…', '…'],
        ['log₂N', 'N', '1', 'N']
      ])}
      <p>We can halve N only about <b>log₂N</b> times (for N = 10<sup>5</sup>, about 17), and every level does N work in total → <b>N · log₂N ≈ 1.7·10<sup>6</sup></b> steps. Always — best, average and worst case. Costs <b>O(N) extra space</b> for the temporary array. It is <b>stable</b> if on a tie you take from the <b>left</b> pile (<code>&lt;=</code>).</p>
      <h4>Bonus superpower: counting inversions</h4>
      <p>An <b>inversion</b> is a pair <code>i &lt; j</code> with <code>a[i] &gt; a[j]</code> — "how unsorted is this array?". During a merge, the left and right piles are both sorted. When the <b>right</b> top <code>R[j]</code> is smaller than the left top <code>L[i]</code>, it is also smaller than <b>everything still waiting in the left pile</b> (they are even bigger). So in one shot we add <code>(number left in the left pile)</code> inversions.</p>
      ${H.arr([3, 6, 7], { label: 'left', ptr: { 0: 'i' }, hl: { 0: 'r', 1: 'r', 2: 'r' } })}
      ${H.arr([2, 8], { label: 'right', ptr: { 0: 'j' }, hl: { 0: 'y' } })}
      <p>2 &lt; 3, so 2 is smaller than ${H.c('r', '3, 6 and 7')} → <b>+3 inversions</b> at once, no need to check them one by one.</p>`,
    clues: [
      '"Sort in <b>guaranteed O(N log N)</b>" / "worst case must be N log N" / "must be <b>stable</b>" → merge sort.',
      '"Count pairs <b>i &lt; j</b> with a[i] &gt; a[j]" (inversions) → merge sort + count during merge.',
      '"Count pairs i &lt; j with a[i] &gt; 2·a[j]" (reverse pairs), "count of smaller numbers after self" → modified merge sort.',
      '"Sort a <b>linked list</b>" → merge sort (no random access needed, O(1) extra for lists).',
      '"Merge K sorted arrays/lists", "external sorting of a huge file" → the merge step.',
      'N ≤ 10<sup>5</sup> and the brute force checks all pairs (O(N<sup>2</sup>)) → think divide &amp; conquer to get N log N.'
    ],
    code: { lang: 'java', code: `
      // Merge sort: sorts a[lo..hi] using a shared temp array.
      void mergeSort(int[] a, int lo, int hi, int[] tmp) {
          if (lo >= hi) return;                    // 0 or 1 element: already sorted
          int mid = lo + (hi - lo) / 2;            // safe middle (no overflow)
          mergeSort(a, lo, mid, tmp);              // sort the left half
          mergeSort(a, mid + 1, hi, tmp);          // sort the right half
          int i = lo, j = mid + 1, k = lo;         // two pointers + write pointer
          while (i <= mid && j <= hi) {
              // "<=" takes the LEFT one on ties → keeps the sort stable
              if (a[i] <= a[j]) tmp[k++] = a[i++];
              else tmp[k++] = a[j++];
          }
          while (i <= mid) tmp[k++] = a[i++];       // leftovers from the left half
          while (j <= hi) tmp[k++] = a[j++];        // leftovers from the right half
          for (k = lo; k <= hi; k++) a[k] = tmp[k]; // copy the merged run back
      }`,
      alt: [
        { lang: 'python', code: `# Merge sort: sorts a[lo..hi] using a shared temp list.
def merge_sort(a, lo, hi, tmp):
    if lo >= hi:                             # 0 or 1 element: already sorted
        return
    mid = (lo + hi) // 2
    merge_sort(a, lo, mid, tmp)              # sort the left half
    merge_sort(a, mid + 1, hi, tmp)          # sort the right half
    i, j, k = lo, mid + 1, lo                # two pointers + write pointer
    while i <= mid and j <= hi:
        if a[i] <= a[j]:                     # "<=" takes the LEFT one on ties -> stable
            tmp[k] = a[i]; i += 1
        else:
            tmp[k] = a[j]; j += 1
        k += 1
    rest = a[i:mid + 1] + a[j:hi + 1]        # leftovers from whichever half remains
    tmp[k:hi + 1] = rest
    a[lo:hi + 1] = tmp[lo:hi + 1]            # copy the merged run back

# usage: a = [5, 2, 4]; merge_sort(a, 0, len(a) - 1, [0] * len(a))` },
        { lang: 'js', code: `// Merge sort: sorts a[lo..hi] using a shared temp array.
function mergeSort(a, lo, hi, tmp) {
  if (lo >= hi) return;                      // 0 or 1 element: already sorted
  const mid = lo + ((hi - lo) >> 1);
  mergeSort(a, lo, mid, tmp);                // sort the left half
  mergeSort(a, mid + 1, hi, tmp);            // sort the right half
  let i = lo, j = mid + 1, k = lo;           // two pointers + write pointer
  while (i <= mid && j <= hi) {
    tmp[k++] = a[i] <= a[j] ? a[i++] : a[j++];   // "<=" takes the LEFT one on ties -> stable
  }
  while (i <= mid) tmp[k++] = a[i++];        // leftovers from the left half
  while (j <= hi) tmp[k++] = a[j++];         // leftovers from the right half
  for (k = lo; k <= hi; k++) a[k] = tmp[k];  // copy the merged run back
}` },
        { lang: 'cpp', code: `// Merge sort: sorts a[lo..hi] using a shared temp vector.
void mergeSort(vector<int>& a, int lo, int hi, vector<int>& tmp) {
    if (lo >= hi) return;                      // 0 or 1 element: already sorted
    int mid = lo + (hi - lo) / 2;              // safe middle (no overflow)
    mergeSort(a, lo, mid, tmp);
    mergeSort(a, mid + 1, hi, tmp);
    int i = lo, j = mid + 1, k = lo;
    while (i <= mid && j <= hi)
        tmp[k++] = a[i] <= a[j] ? a[i++] : a[j++];   // ties take the left -> stable
    while (i <= mid) tmp[k++] = a[i++];
    while (j <= hi) tmp[k++] = a[j++];
    copy(tmp.begin() + lo, tmp.begin() + hi + 1, a.begin() + lo);
    // (the library does the merge step as std::inplace_merge, and the whole sort as std::stable_sort)
}` }, { lang: 'csharp', code: String.raw`
// Merge sort: sorts a[lo..hi] using a shared temp array.
void MergeSort(int[] a, int lo, int hi, int[] tmp) {
    if (lo >= hi) return;                    // 0 or 1 element: already sorted
    int mid = lo + (hi - lo) / 2;            // safe middle (no overflow)
    MergeSort(a, lo, mid, tmp);              // sort the left half
    MergeSort(a, mid + 1, hi, tmp);          // sort the right half
    int i = lo, j = mid + 1, k = lo;         // two pointers + write pointer
    while (i <= mid && j <= hi) {
        // "<=" takes the LEFT one on ties -> keeps the sort stable
        if (a[i] <= a[j]) tmp[k++] = a[i++];
        else tmp[k++] = a[j++];
    }
    while (i <= mid) tmp[k++] = a[i++];       // leftovers from the left half
    while (j <= hi) tmp[k++] = a[j++];        // leftovers from the right half
    for (k = lo; k <= hi; k++) a[k] = tmp[k]; // copy the merged run back
}` }
      ] },
    codeTitle: 'Merge sort (top-down)',
    viz: {
      title: 'Merge sort: split, then merge with two pointers (and count inversions)',
      input: '5 2 4 6 1 3',
      inputLabel: 'Array (space separated, up to 10 numbers)',
      gen: function (input) {
        var a = parseNums(input, 10, { example: '5 2 4 6 1 3' });
        var frames = [], stack = [], inv = 0;
        function rec(lo, hi) {
          stack.push('sort(' + lo + ',' + hi + ')');
          if (lo >= hi) { stack.pop(); return; }
          var mid = Math.floor((lo + hi) / 2);
          frames.push({ narr: 'sort(' + lo + ',' + hi + '): more than one item, so <b>split</b> at mid = ' + mid + ' into [' + lo + '..' + mid + '] and [' + (mid + 1) + '..' + hi + ']. Sort each half first (pieces of size 1 are already sorted).', parts: [
            { type: 'array', label: 'array (blue = current piece)', values: a.slice(), range: [lo, hi], ptr: one(mid, 'mid'), showIdx: true },
            { type: 'stack', label: 'recursion call stack', items: stack.slice(), hl: one(stack.length - 1, 'cur') },
            { type: 'vars', vals: { lo: lo, mid: mid, hi: hi, inversions: inv } }
          ] });
          rec(lo, mid);
          rec(mid + 1, hi);
          var L = a.slice(lo, mid + 1), R = a.slice(mid + 1, hi + 1), i = 0, j = 0, k = lo;
          frames.push({ narr: 'Both halves are sorted: left = [' + L.join(', ') + '], right = [' + R.join(', ') + ']. Now <b>merge</b>: i points at the left top, j at the right top, k is where the next smallest goes.', parts: [
            { type: 'array', label: 'left pile', values: L.slice(), ptr: one(0, 'i'), hl: one(0, 'cur') },
            { type: 'array', label: 'right pile', values: R.slice(), ptr: one(0, 'j'), hl: one(0, 'cur') },
            { type: 'array', label: 'array', values: a.slice(), range: [lo, hi], ptr: one(k, 'k'), showIdx: true },
            { type: 'stack', label: 'recursion call stack', items: stack.slice(), hl: one(stack.length - 1, 'cur') },
            { type: 'vars', vals: { inversions: inv } }
          ] });
          while (i < L.length || j < R.length) {
            var narr, takeLeft, added = 0;
            if (j >= R.length) { takeLeft = true; narr = 'Right pile is empty → copy the leftover ' + L[i] + ' from the left pile.'; }
            else if (i >= L.length) { takeLeft = false; narr = 'Left pile is empty → copy the leftover ' + R[j] + ' from the right pile.'; }
            else if (L[i] <= R[j]) { takeLeft = true; narr = 'Compare ' + L[i] + ' (left) vs ' + R[j] + ' (right): ' + L[i] + ' ≤ ' + R[j] + ' → <span class="c-g">take ' + L[i] + ' from the left</span> (ties go left → stable). No inversion here.'; }
            else {
              takeLeft = false; added = L.length - i; inv += added;
              narr = 'Compare ' + L[i] + ' (left) vs ' + R[j] + ' (right): ' + R[j] + ' is smaller → <span class="c-g">take ' + R[j] + ' from the right</span>. It jumps ahead of <span class="c-r">all ' + added + ' item' + (added > 1 ? 's' : '') + ' still in the left pile</span> (' + L.slice(i).join(', ') + '), so inversions += ' + added + '.';
            }
            var li = i, rj = j;
            if (takeLeft) a[k] = L[i++]; else a[k] = R[j++];
            var lh = {}, rh = {}, q;
            for (q = 0; q < i; q++) lh[q] = 'done';
            for (q = 0; q < j; q++) rh[q] = 'done';
            if (takeLeft) lh[li] = 'ok'; else { rh[rj] = 'ok'; if (added) for (q = i; q < L.length; q++) lh[q] = 'bad'; }
            var ah = {}; for (q = lo; q < k; q++) ah[q] = 'win'; ah[k] = 'ok';
            var lp = {}, rp = {}; if (i < L.length) lp[i] = 'i'; if (j < R.length) rp[j] = 'j';
            frames.push({ narr: narr, parts: [
              { type: 'array', label: 'left pile', values: L.slice(), ptr: lp, hl: lh },
              { type: 'array', label: 'right pile', values: R.slice(), ptr: rp, hl: rh },
              { type: 'array', label: 'array', values: a.slice(), range: [lo, hi], ptr: one(k, 'k'), hl: ah, showIdx: true },
              { type: 'vars', vals: { inversions: inv }, hl: added ? { inversions: 'bad' } : {} }
            ] });
            k++;
          }
          var dh = {}; for (var z = lo; z <= hi; z++) dh[z] = 'ok';
          frames.push({ narr: 'Merged: a[' + lo + '..' + hi + '] = [' + a.slice(lo, hi + 1).join(', ') + '] is now sorted. Return to the caller.', parts: [
            { type: 'array', label: 'array', values: a.slice(), hl: dh, showIdx: true },
            { type: 'stack', label: 'recursion call stack', items: stack.slice(), hl: one(stack.length - 1, 'done') },
            { type: 'vars', vals: { inversions: inv } }
          ] });
          stack.pop();
        }
        frames.push({ narr: 'Start merge sort on the whole array. We will keep splitting in half, then merge back up. The inversion counter shows how many "out of order" pairs we discover on the way.', parts: [
          { type: 'array', label: 'array', values: a.slice(), showIdx: true },
          { type: 'vars', vals: { inversions: 0 } }
        ] });
        rec(0, a.length - 1);
        frames.push({ narr: 'Done! Sorted in O(N log N). Total inversions in the original array = <b>' + inv + '</b> (pairs i &lt; j with a[i] &gt; a[j]).', parts: [
          { type: 'array', label: 'sorted', values: a.slice(), showIdx: true },
          { type: 'vars', vals: { inversions: inv }, hl: { inversions: 'sel' } }
        ] });
        return frames;
      }
    },
    problems: [
      {
        title: 'Merge Sort',
        level: 'Medium',
        tags: ['divide and conquer', 'recursion', 'two pointers'],
        statement: `<p>Sort an integer array in ascending order using <b>merge sort</b>. Your algorithm must run in <b>O(N log N)</b> time in the worst case (so bubble/insertion/plain quick sort are not allowed).</p>`,
        constraints: `1 ≤ N ≤ 10<sup>5</sup>, -10<sup>9</sup> ≤ a[i] ≤ 10<sup>9</sup>`,
        example: `${H.arr([5, 2, 4, 1], { label: 'input' })}
          ${H.arr([1, 2, 4, 5], { label: 'output', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g' } })}
          <p>Why: split into ${H.c('b', '[5, 2]')} and ${H.c('b', '[4, 1]')}, sort each → [2, 5] and [1, 4], then merge by always taking the smaller top → [1, 2, 4, 5].</p>`,
        brute: {
          why: `<p>Insertion sort is easy, but on a reverse-sorted array of 10<sup>5</sup> items every new item walks all the way left: about N<sup>2</sup>/2 = 5·10<sup>9</sup> shifts → TLE. The waste: each item is compared against many items one at a time, even though big sorted blocks could be combined in a single linear sweep.</p>`,
          code: { lang: 'java', code: `
            void brute(int[] a) {
                for (int i = 1; i < a.length; i++) {
                    int key = a[i], j = i - 1;
                    while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; j--; }
                    a[j + 1] = key;
                }
            }`, alt: [{ lang: 'python', code: String.raw`
def sort_array(a):
    for i in range(1, len(a)):
        key, j = a[i], i - 1
        while j >= 0 and a[j] > key:
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = key` }, { lang: 'js', code: String.raw`
function sortArray(a) {
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; j--; }
    a[j + 1] = key;
  }
}` }, { lang: 'cpp', code: String.raw`
void sortArray(vector<int>& a) {
    for (int i = 1; i < (int) a.size(); i++) {
        int key = a[i], j = i - 1;
        while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; j--; }
        a[j + 1] = key;
    }
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int[] SortArray(int[] a) {
        for (int i = 1; i < a.Length; i++) {
            int key = a[i], j = i - 1;
            while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; j--; }
            a[j + 1] = key;
        }
        return a;
    }
}` }] }
        },
        mcq: {
          q: 'Merge sort splits an array of N = 1024 items in half again and again. About how many "levels" of merging are there, and how much work is done per level?',
          options: ['1024 levels, 1 step each', '10 levels, about N steps each', '10 levels, about N<sup>2</sup> steps each', '512 levels, 2 steps each'],
          answer: 1,
          explain: '1024 can be halved 10 times (2<sup>10</sup> = 1024) → 10 levels. On every level all N items are merged once → N per level → N log N total.'
        },
        hints: [
          `<p><b>Aha:</b> merging two <b>already sorted</b> piles is easy and linear — just keep taking the smaller of the two tops. And a pile of 1 item is always sorted. So: split until size 1, then merge back up.</p>`,
          `<p>Recursive function <code>sort(lo, hi)</code>: <code>mid = lo + (hi - lo) / 2</code>, sort the left half, sort the right half, then merge with pointers <code>i = lo</code>, <code>j = mid + 1</code> into a <b>temp array</b>, and copy back.</p>`,
          `<p>Traps: base case <code>lo &gt;= hi</code> (not <code>lo &gt; hi</code> only — otherwise infinite recursion on size 1); do not forget the <b>leftover loops</b> after one pile runs out; allocate the temp array <b>once</b>, not inside every call. Recipe: if lo ≥ hi return → mid → sort left → sort right → merge with i, j, k → copy tmp[lo..hi] back.</p>`
        ],
        tests: { sig: 'int[] -> int[]', fn: 'sortArray', cases: [
          [[[5, 2, 4, 1]], [1, 2, 4, 5]],
          [[[1]], [1]],
          [[[2, 1]], [1, 2]],
          [[[-1000000000, 1000000000, 0, -1000000000]], [-1000000000, -1000000000, 0, 1000000000]],
          [[[5, 4, 3, 2, 1]], [1, 2, 3, 4, 5]],
          [[[1, 2, 3, 4]], [1, 2, 3, 4]],
          [[[3, 3, 3]], [3, 3, 3]],
          [[[9, -3, 5, -3, 0, 12, 7]], [-3, -3, 0, 5, 7, 9, 12]]
        ] },
        solution: {
          approach: `<p>Top-down divide &amp; conquer with one shared temp array for merging.</p>`,
          code: `
            class Solution {
                public int[] sortArray(int[] a) {
                    if (a.length > 1) {
                        int[] tmp = new int[a.length];   // allocated once, reused by every merge
                        sort(a, 0, a.length - 1, tmp);
                    }
                    return a;
                }

                private void sort(int[] a, int lo, int hi, int[] tmp) {
                    if (lo >= hi) return;                // size 0 or 1 → already sorted
                    int mid = lo + (hi - lo) / 2;
                    sort(a, lo, mid, tmp);               // conquer left half
                    sort(a, mid + 1, hi, tmp);           // conquer right half
                    merge(a, lo, mid, hi, tmp);          // combine
                }

                private void merge(int[] a, int lo, int mid, int hi, int[] tmp) {
                    int i = lo;          // top of the left pile  a[lo..mid]
                    int j = mid + 1;     // top of the right pile a[mid+1..hi]
                    int k = lo;          // next write position in tmp
                    while (i <= mid && j <= hi) {
                        if (a[i] <= a[j]) tmp[k++] = a[i++];   // tie → left first (stable)
                        else tmp[k++] = a[j++];
                    }
                    while (i <= mid) tmp[k++] = a[i++];        // left leftovers
                    while (j <= hi) tmp[k++] = a[j++];         // right leftovers
                    for (k = lo; k <= hi; k++) a[k] = tmp[k];  // copy merged run back
                }

                public static void main(String[] args) {
                    System.out.println(Arrays.toString(new Solution().sortArray(new int[]{5, 2, 4, 1})));
                }
            }`,
          alt: [
            { lang: 'python', code: `def sort_array(a):
    tmp = [0] * len(a)                       # allocated once, reused by every merge

    def sort(lo, hi):
        if lo >= hi:                         # size 0 or 1 -> already sorted
            return
        mid = (lo + hi) // 2
        sort(lo, mid)                        # conquer left half
        sort(mid + 1, hi)                    # conquer right half
        i, j, k = lo, mid + 1, lo
        while i <= mid and j <= hi:
            if a[i] <= a[j]:                 # tie -> left first (stable)
                tmp[k] = a[i]; i += 1
            else:
                tmp[k] = a[j]; j += 1
            k += 1
        tmp[k:hi + 1] = a[i:mid + 1] if i <= mid else a[j:hi + 1]   # leftovers
        a[lo:hi + 1] = tmp[lo:hi + 1]        # copy merged run back

    sort(0, len(a) - 1)
    return a` },
            { lang: 'js', code: `function sortArray(a) {
  const tmp = new Array(a.length);         // allocated once, reused by every merge
  const sort = (lo, hi) => {
    if (lo >= hi) return;                  // size 0 or 1 -> already sorted
    const mid = (lo + hi) >> 1;
    sort(lo, mid);
    sort(mid + 1, hi);
    let i = lo, j = mid + 1, k = lo;
    while (i <= mid && j <= hi) tmp[k++] = a[i] <= a[j] ? a[i++] : a[j++]; // tie -> left (stable)
    while (i <= mid) tmp[k++] = a[i++];    // left leftovers
    while (j <= hi) tmp[k++] = a[j++];     // right leftovers
    for (k = lo; k <= hi; k++) a[k] = tmp[k];
  };
  sort(0, a.length - 1);
  return a;
}` },
            { lang: 'cpp', code: `class Solution {
    vector<int> tmp;

    void sort(vector<int>& a, int lo, int hi) {
        if (lo >= hi) return;                         // size 0 or 1 -> already sorted
        int mid = lo + (hi - lo) / 2;
        sort(a, lo, mid);
        sort(a, mid + 1, hi);
        int i = lo, j = mid + 1, k = lo;
        while (i <= mid && j <= hi) tmp[k++] = a[i] <= a[j] ? a[i++] : a[j++]; // tie -> left
        while (i <= mid) tmp[k++] = a[i++];
        while (j <= hi) tmp[k++] = a[j++];
        copy(tmp.begin() + lo, tmp.begin() + hi + 1, a.begin() + lo);
    }

public:
    vector<int> sortArray(vector<int> a) {
        tmp.assign(a.size(), 0);                      // allocated once
        sort(a, 0, (int)a.size() - 1);
        return a;
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int[] SortArray(int[] a) {
        if (a.Length > 1) {
            int[] tmp = new int[a.Length];   // allocated once, reused by every merge
            Sort(a, 0, a.Length - 1, tmp);
        }
        return a;
    }

    private void Sort(int[] a, int lo, int hi, int[] tmp) {
        if (lo >= hi) return;                // size 0 or 1 -> already sorted
        int mid = lo + (hi - lo) / 2;
        Sort(a, lo, mid, tmp);               // conquer left half
        Sort(a, mid + 1, hi, tmp);           // conquer right half
        Merge(a, lo, mid, hi, tmp);          // combine
    }

    private void Merge(int[] a, int lo, int mid, int hi, int[] tmp) {
        int i = lo;          // top of the left pile  a[lo..mid]
        int j = mid + 1;     // top of the right pile a[mid+1..hi]
        int k = lo;          // next write position in tmp
        while (i <= mid && j <= hi) {
            if (a[i] <= a[j]) tmp[k++] = a[i++];   // tie -> left first (stable)
            else tmp[k++] = a[j++];
        }
        while (i <= mid) tmp[k++] = a[i++];        // left leftovers
        while (j <= hi) tmp[k++] = a[j++];         // right leftovers
        for (k = lo; k <= hi; k++) a[k] = tmp[k];  // copy merged run back
    }
}` }
          ],
          dry: {
            head: ['#', 'call / action', 'details', 'array after'],
            rows: [
              ['1', 'sort(0,3)', 'mid = 1 → sort(0,1) then sort(2,3)', '[5, 2, 4, 1]'],
              ['2', 'sort(0,1)', 'mid = 0 → sort(0,0), sort(1,1) are size 1 (return)', '[5, 2, 4, 1]'],
              ['3', 'merge(0,0,1)', '5 vs 2 → take 2; left over 5', '[<span class="c-g">2, 5</span>, 4, 1]'],
              ['4', 'sort(2,3)', 'mid = 2 → sort(2,2), sort(3,3) return', '[2, 5, 4, 1]'],
              ['5', 'merge(2,2,3)', '4 vs 1 → take 1; left over 4', '[2, 5, <span class="c-g">1, 4</span>]'],
              ['6', 'merge(0,1,3)', '2 vs 1 → 1; 2 vs 4 → 2; 5 vs 4 → 4; left over 5', '<span class="c-p">[1, 2, 4, 5]</span>']
            ]
          },
          complexity: `<p><b>Time O(N log N)</b> in every case: log₂N levels of splitting, and each level merges all N items once. <b>Space O(N)</b> for the temp array plus O(log N) recursion stack.</p>`
        }
      },
      {
        title: 'Inversion Count',
        level: 'Hard',
        tags: ['merge sort', 'divide and conquer', 'counting'],
        statement: `<p>Given an array <code>a</code> of N integers, count the number of <b>inversions</b>: pairs of indices <code>(i, j)</code> with <code>i &lt; j</code> and <code>a[i] &gt; a[j]</code>. (It measures how far the array is from sorted; it also equals the minimum number of <b>adjacent swaps</b> needed to sort it.)</p>`,
        constraints: `1 ≤ N ≤ 10<sup>5</sup>, 1 ≤ a[i] ≤ 10<sup>9</sup>. The answer can be up to N(N−1)/2 ≈ 5·10<sup>9</sup> → use <code>long</code>.`,
        example: `${H.arr([2, 4, 1, 3, 5], { label: 'a', hl: { 0: 'r', 1: 'r', 2: 'y', 3: 'y' } })}
          <p>Output: <b>3</b>. The inversions are ${H.c('r', '(2, 1)')}, ${H.c('r', '(4, 1)')} and ${H.c('r', '(4, 3)')} — in each pair the bigger number stands to the left of the smaller one. 5 is bigger than everything before it, so it adds nothing.</p>`,
        brute: {
          why: `<p>Check every pair i &lt; j: N(N−1)/2 ≈ 5·10<sup>9</sup> comparisons for N = 10<sup>5</sup> → TLE. The waste: when we already know a whole block is sorted, we still compare each of its items one by one, instead of counting "everything remaining is bigger" in one go.</p>`,
          code: { lang: 'java', code: `
            long brute(int[] a) {
                long cnt = 0;
                for (int i = 0; i < a.length; i++)
                    for (int j = i + 1; j < a.length; j++)
                        if (a[i] > a[j]) cnt++;
                return cnt;
            }`, alt: [{ lang: 'python', code: String.raw`
def count_inversions(arr):
    cnt = 0
    for i in range(len(arr)):
        for j in range(i + 1, len(arr)):
            if arr[i] > arr[j]:
                cnt += 1
    return cnt` }, { lang: 'js', code: String.raw`
function countInversions(arr) {
  let cnt = 0;
  for (let i = 0; i < arr.length; i++)
    for (let j = i + 1; j < arr.length; j++)
      if (arr[i] > arr[j]) cnt++;
  return cnt;
}` }, { lang: 'cpp', code: String.raw`
long long countInversions(const vector<int>& arr) {
    long long cnt = 0;
    for (int i = 0; i < (int) arr.size(); i++)
        for (int j = i + 1; j < (int) arr.size(); j++)
            if (arr[i] > arr[j]) cnt++;
    return cnt;
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public long CountInversions(int[] arr) {
        long cnt = 0;
        for (int i = 0; i < arr.Length; i++)
            for (int j = i + 1; j < arr.Length; j++)
                if (arr[i] > arr[j]) cnt++;
        return cnt;
    }
}` }] }
        },
        mcq: {
          q: 'While merging left = [3, 6, 7] and right = [2, 8], the pointer is at 3 (left) and 2 (right). We take 2. How many inversions does that reveal?',
          options: ['1 (just the pair 3, 2)', '3 (2 is smaller than 3, 6 and 7)', '0, inversions are only counted at the end', '2 (only 6 and 7)'],
          answer: 1,
          explain: 'The left pile is sorted, so everything still in it (3, 6, 7) is ≥ 3 &gt; 2, and all of them were originally to the left of 2 → 3 inversions at once.'
        },
        hints: [
          `<p><b>Aha:</b> inversions = (inversions inside the left half) + (inside the right half) + (pairs with one item in each half). The cross pairs are easy to count while <b>merging</b>, because both halves are sorted.</p>`,
          `<p>Do a normal merge sort. In the merge, when <code>a[j]</code> (right) is strictly smaller than <code>a[i]</code> (left), add <code>mid - i + 1</code> — the count of items still waiting in the left half — to a <code>long</code> counter.</p>`,
          `<p>Traps: use <code>long</code> (answer can be ~5·10<sup>9</sup>); on <b>equal</b> values take the left one first (<code>&lt;=</code>) — equal values are <b>not</b> an inversion; the array gets sorted as a side effect (clone it if the caller needs the original). Recipe: count(lo,hi): if lo ≥ hi return 0 → c = count(left) + count(right) → merge, adding mid − i + 1 whenever the right top is smaller → return c.</p>`
        ],
        tests: { sig: 'int[] -> long', fn: 'countInversions', cases: [
          [[[2, 4, 1, 3, 5]], 3],
          [[[1]], 0],
          [[[1, 2, 3]], 0],
          [[[3, 2, 1]], 3],
          [[[2, 2, 2]], 0],
          [[[8, 4, 2, 1]], 6],
          [[[1000000000, 1, 1000000000, 1]], 3],
          [[[5, 1, 5, 1, 5]], 3],
          [[{ $range: [70000, 0, -1] }], 2449965000],
          [[{ $range: [100000, 0, -1] }], 4999950000]
        ] },
        solution: {
          approach: `<p>Merge sort; every time a right-half item is placed before the remaining left-half items, those remaining items each form one inversion with it.</p>`,
          code: `
            class Solution {
                public long countInversions(int[] arr) {
                    int[] a = arr.clone();               // keep the caller's array untouched
                    int[] tmp = new int[a.length];
                    return count(a, 0, a.length - 1, tmp);
                }

                private long count(int[] a, int lo, int hi, int[] tmp) {
                    if (lo >= hi) return 0;              // one item: no pairs
                    int mid = lo + (hi - lo) / 2;
                    long c = count(a, lo, mid, tmp)      // inversions inside the left half
                           + count(a, mid + 1, hi, tmp); // inversions inside the right half
                    int i = lo, j = mid + 1, k = lo;
                    while (i <= mid && j <= hi) {
                        if (a[i] <= a[j]) {
                            tmp[k++] = a[i++];           // left item is fine, no inversion
                        } else {
                            // a[j] is smaller than a[i..mid] (all of them, the left half is sorted)
                            c += mid - i + 1;
                            tmp[k++] = a[j++];
                        }
                    }
                    while (i <= mid) tmp[k++] = a[i++];
                    while (j <= hi) tmp[k++] = a[j++];
                    for (k = lo; k <= hi; k++) a[k] = tmp[k];
                    return c;
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().countInversions(new int[]{2, 4, 1, 3, 5})); // 3
                }
            }`,
          alt: [
            { lang: 'python', code: `def count_inversions(arr):
    a = list(arr)                            # keep the caller's list untouched

    def count(lo, hi):                       # sorts a[lo..hi], returns its inversions
        if lo >= hi:
            return 0
        mid = (lo + hi) // 2
        c = count(lo, mid) + count(mid + 1, hi)
        merged, i, j = [], lo, mid + 1
        while i <= mid and j <= hi:
            if a[i] <= a[j]:
                merged.append(a[i]); i += 1  # left item is fine, no inversion
            else:
                c += mid - i + 1             # a[j] is smaller than all of a[i..mid]
                merged.append(a[j]); j += 1
        merged += a[i:mid + 1] + a[j:hi + 1]
        a[lo:hi + 1] = merged
        return c                             # Python ints never overflow

    return count(0, len(a) - 1)` },
            { lang: 'js', code: `function countInversions(arr) {
  const a = arr.slice();                     // keep the caller's array untouched
  const tmp = new Array(a.length);
  const count = (lo, hi) => {
    if (lo >= hi) return 0;
    const mid = (lo + hi) >> 1;
    let c = count(lo, mid) + count(mid + 1, hi);   // up to ~5e9: still exact in a Number
    let i = lo, j = mid + 1, k = lo;
    while (i <= mid && j <= hi) {
      if (a[i] <= a[j]) tmp[k++] = a[i++];
      else { c += mid - i + 1; tmp[k++] = a[j++]; } // a[j] beats all of a[i..mid]
    }
    while (i <= mid) tmp[k++] = a[i++];
    while (j <= hi) tmp[k++] = a[j++];
    for (k = lo; k <= hi; k++) a[k] = tmp[k];
    return c;
  };
  return count(0, a.length - 1);
}` },
            { lang: 'cpp', code: `class Solution {
    vector<int> tmp;

    long long count(vector<int>& a, int lo, int hi) {
        if (lo >= hi) return 0;
        int mid = lo + (hi - lo) / 2;
        long long c = count(a, lo, mid) + count(a, mid + 1, hi);
        int i = lo, j = mid + 1, k = lo;
        while (i <= mid && j <= hi) {
            if (a[i] <= a[j]) tmp[k++] = a[i++];
            else { c += mid - i + 1; tmp[k++] = a[j++]; }   // a[j] beats all of a[i..mid]
        }
        while (i <= mid) tmp[k++] = a[i++];
        while (j <= hi) tmp[k++] = a[j++];
        copy(tmp.begin() + lo, tmp.begin() + hi + 1, a.begin() + lo);
        return c;
    }

public:
    long long countInversions(vector<int> a) {        // by value: caller's copy untouched
        tmp.assign(a.size(), 0);
        return count(a, 0, (int)a.size() - 1);
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public long CountInversions(int[] arr) {
        int[] a = (int[])arr.Clone();        // keep the caller's array untouched
        int[] tmp = new int[a.Length];
        return Count(a, 0, a.Length - 1, tmp);
    }

    private long Count(int[] a, int lo, int hi, int[] tmp) {
        if (lo >= hi) return 0;              // one item: no pairs
        int mid = lo + (hi - lo) / 2;
        long c = Count(a, lo, mid, tmp)      // inversions inside the left half
               + Count(a, mid + 1, hi, tmp); // inversions inside the right half
        int i = lo, j = mid + 1, k = lo;
        while (i <= mid && j <= hi) {
            if (a[i] <= a[j]) {
                tmp[k++] = a[i++];           // left item is fine, no inversion
            } else {
                // a[j] is smaller than a[i..mid] (all of them, the left half is sorted)
                c += mid - i + 1;
                tmp[k++] = a[j++];
            }
        }
        while (i <= mid) tmp[k++] = a[i++];
        while (j <= hi) tmp[k++] = a[j++];
        for (k = lo; k <= hi; k++) a[k] = tmp[k];
        return c;
    }
}` }
          ],
          dry: {
            head: ['merge', 'left pile', 'right pile', 'what happens', 'added', 'total'],
            rows: [
              ['(0,0,1)', '[2]', '[4]', '2 ≤ 4 take 2; then 4', '0', '0'],
              ['(0,1,2)', '[2, 4]', '[1]', '1 &lt; 2 → take 1, <span class="c-r">2 and 4 both wait</span>; then 2, 4', '<span class="c-r">+2</span>', '2'],
              ['(3,3,4)', '[3]', '[5]', '3 ≤ 5 take 3; then 5', '0', '2'],
              ['(0,2,4)', '[1, 2, 4]', '[3, 5]', '1 ≤ 3, 2 ≤ 3; 3 &lt; 4 → take 3, <span class="c-r">4 waits</span>; 4 ≤ 5; 5', '<span class="c-r">+1</span>', '<span class="c-p">3</span>']
            ]
          },
          complexity: `<p><b>Time O(N log N)</b>: the same work as merge sort — counting adds only one subtraction per comparison. <b>Space O(N)</b> for the copy and temp array, O(log N) recursion depth.</p>`
        }
      }
    ]
  });

  // ---------- TOPIC 3 extras ----------
  Object.assign(topics[topics.length - 1], {
    examples: [
      {
        title: 'Merging two sorted piles step by step',
        html: `<p>left = [1, 4, 7], right = [2, 3, 9]</p>
          ${H.table(['i → L[i]', 'j → R[j]', 'take', 'merged'], [
            ['1', '2', '1 (L)', '1'],
            ['4', '2', '2 (R)', '1 2'],
            ['4', '3', '3 (R)', '1 2 3'],
            ['4', '9', '4 (L)', '1 2 3 4'],
            ['7', '9', '7 (L)', '1 2 3 4 7'],
            ['—', '9', 'copy 9', '<span class="c-g">1 2 3 4 7 9</span>']
          ])}
          <p>5 comparisons + 1 copy for 6 items: merging is <b>linear</b> — at most (size of both piles − 1) comparisons.</p>`
      },
      {
        title: 'Counting the work for N = 8',
        html: `<p>Splits: 8 → 4 + 4 → 2 + 2 + 2 + 2 → eight 1s. That is <b>log₂8 = 3</b> merge levels.</p>
          ${H.table(['level', 'merges', 'items moved'], [['size 1 → 2', '4 merges of 1+1', '8'], ['size 2 → 4', '2 merges of 2+2', '8'], ['size 4 → 8', '1 merge of 4+4', '8']])}
          <p>Total 3 × 8 = <b>24 item moves = N log₂N</b>. For N = 10<sup>6</sup>: about 20 × 10<sup>6</sup> = 2·10<sup>7</sup> moves — well under a second.</p>`
      },
      {
        title: 'A fully reversed array has the maximum number of inversions',
        html: `<p>[8, 4, 2, 1]: every pair is inverted → C(4, 2) = <b>6</b> = N(N−1)/2. Merge sort finds them as: inside [8,4] → 1, inside [2,1] → 1, then merging [4,8] with [1,2]: 1 jumps ahead of 2 items (+2), 2 jumps ahead of 2 items (+2) → 1 + 1 + 4 = <b>6</b>.</p>
          <p>An already sorted array has <b>0</b> inversions. So the inversion count is a "distance from sorted" score — used for comparing rankings (Kendall tau distance) in recommendation systems.</p>`
      },
      {
        title: 'Bottom-up (iterative) merge sort — no recursion at all',
        html: `<p>Instead of splitting top-down, merge runs of width 1, then 2, then 4, … until one run covers the array. Same O(N log N), but no recursion stack — handy when recursion depth is a concern, and it is how merge sort is written for linked lists and external files.</p>
          ${H.table(['width', 'runs after this round (input 5 2 4 6 1 3)'], [['1', '[2 5] [4 6] [1 3]'], ['2', '[2 4 5 6] [1 3]'], ['4', '<span class="c-g">[1 2 3 4 5 6]</span>']])}`,
        code: { lang: 'java', code: `
          class BottomUp {
              static void sort(int[] a) {
                  int n = a.length;
                  int[] tmp = new int[n];
                  for (int width = 1; width < n; width *= 2) {          // run size doubles each round
                      for (int lo = 0; lo < n - width; lo += 2 * width) {
                          int mid = lo + width - 1;                      // end of the left run
                          int hi = Math.min(lo + 2 * width - 1, n - 1);  // end of the right run (may be short)
                          merge(a, lo, mid, hi, tmp);
                      }
                  }
              }

              static void merge(int[] a, int lo, int mid, int hi, int[] tmp) {
                  if (a[mid] <= a[mid + 1]) return;                      // already in order: skip (TimSort-style)
                  int i = lo, j = mid + 1, k = lo;
                  while (i <= mid && j <= hi) tmp[k++] = a[i] <= a[j] ? a[i++] : a[j++];
                  while (i <= mid) tmp[k++] = a[i++];
                  while (j <= hi) tmp[k++] = a[j++];
                  for (k = lo; k <= hi; k++) a[k] = tmp[k];
              }

              public static void main(String[] args) {
                  int[] a = {5, 2, 4, 6, 1, 3};
                  sort(a);
                  System.out.println(Arrays.toString(a)); // [1, 2, 3, 4, 5, 6]
              }
          }`,
          alt: [
            { lang: 'python', run: true, code: `def bottom_up_sort(a):
    n, width = len(a), 1
    while width < n:                                  # run size doubles each round
        for lo in range(0, n - width, 2 * width):
            mid, hi = lo + width - 1, min(lo + 2 * width - 1, n - 1)
            if a[mid] <= a[mid + 1]:
                continue                              # already in order: skip
            left, right, out = a[lo:mid + 1], a[mid + 1:hi + 1], []
            i = j = 0
            while i < len(left) and j < len(right):
                if left[i] <= right[j]:
                    out.append(left[i]); i += 1
                else:
                    out.append(right[j]); j += 1
            a[lo:hi + 1] = out + left[i:] + right[j:]
        width *= 2

a = [5, 2, 4, 6, 1, 3]
bottom_up_sort(a)
print(a)  # [1, 2, 3, 4, 5, 6]` },
            { lang: 'js', run: true, code: `function bottomUpSort(a) {
  const n = a.length, tmp = new Array(n);
  for (let width = 1; width < n; width *= 2) {                 // run size doubles each round
    for (let lo = 0; lo < n - width; lo += 2 * width) {
      const mid = lo + width - 1, hi = Math.min(lo + 2 * width - 1, n - 1);
      if (a[mid] <= a[mid + 1]) continue;                      // already in order: skip
      let i = lo, j = mid + 1, k = lo;
      while (i <= mid && j <= hi) tmp[k++] = a[i] <= a[j] ? a[i++] : a[j++];
      while (i <= mid) tmp[k++] = a[i++];
      while (j <= hi) tmp[k++] = a[j++];
      for (k = lo; k <= hi; k++) a[k] = tmp[k];
    }
  }
}
const a = [5, 2, 4, 6, 1, 3];
bottomUpSort(a);
console.log(a);   // [1, 2, 3, 4, 5, 6]` },
            { lang: 'cpp', code: `int main() {
    vector<int> a = {5, 2, 4, 6, 1, 3};
    int n = a.size();
    for (int width = 1; width < n; width *= 2)                 // run size doubles each round
        for (int lo = 0; lo < n - width; lo += 2 * width) {
            int mid = lo + width, hi = min(lo + 2 * width, n);  // [lo, mid) and [mid, hi)
            inplace_merge(a.begin() + lo, a.begin() + mid, a.begin() + hi);   // library merge step
        }
    for (int x : a) cout << x << ' ';                          // 1 2 3 4 5 6
    cout << '\\n';
}` }, { lang: 'csharp', code: String.raw`
using System;

class BottomUp {
    static void Sort(int[] a) {
        int n = a.Length;
        int[] tmp = new int[n];
        for (int width = 1; width < n; width *= 2) {          // run size doubles each round
            for (int lo = 0; lo < n - width; lo += 2 * width) {
                int mid = lo + width - 1;                      // end of the left run
                int hi = Math.Min(lo + 2 * width - 1, n - 1);  // end of the right run (may be short)
                Merge(a, lo, mid, hi, tmp);
            }
        }
    }

    static void Merge(int[] a, int lo, int mid, int hi, int[] tmp) {
        if (a[mid] <= a[mid + 1]) return;                      // already in order: skip (TimSort-style)
        int i = lo, j = mid + 1, k = lo;
        while (i <= mid && j <= hi) tmp[k++] = a[i] <= a[j] ? a[i++] : a[j++];
        while (i <= mid) tmp[k++] = a[i++];
        while (j <= hi) tmp[k++] = a[j++];
        for (k = lo; k <= hi; k++) a[k] = tmp[k];
    }

    static void Main() {
        int[] a = { 5, 2, 4, 6, 1, 3 };
        Sort(a);
        Console.WriteLine("[" + string.Join(", ", a) + "]"); // [1, 2, 3, 4, 5, 6]
    }
}`, run: true }
          ] }
      }
    ],
    deepDive: `<p><b>The recurrence.</b> T(N) = 2·T(N/2) + c·N. Unroll it: level k has 2<sup>k</sup> pieces of size N/2<sup>k</sup>, total work c·N per level, log₂N levels → <b>Θ(N log N)</b> in best, average and worst case (the master theorem's "balanced" case). Merge sort makes at most N⌈log₂N⌉ − N + 1 comparisons, very close to the information-theoretic lower bound — that is why it is the default when comparisons are expensive (comparing objects, strings).</p>
      <p><b>Engineering upgrades.</b> (1) Skip the merge when <code>a[mid] ≤ a[mid+1]</code> → already-sorted input becomes O(N). (2) Use insertion sort for pieces under ~16–32 items. (3) Allocate the temp array once. (4) Ping-pong between the array and the buffer to avoid the copy-back. <b>TimSort</b> (Java object sorts; Python's <code>sorted</code>, which since 3.11 uses the closely related Powersort merge policy) finds natural ascending/descending runs, merges them with a stack-based policy, and uses "galloping" when one run keeps winning — it is O(N) on sorted or reverse-sorted data and stable.</p>
      <p><b>Where merge sort shines.</b> <b>Linked lists</b>: splitting with slow/fast pointers and merging by relinking needs O(1) extra space and no random access. <b>External sorting</b>: data bigger than RAM is cut into sorted chunks that fit in memory, then a K-way merge (min-heap of the chunk heads) streams the result — this is how databases sort huge tables and how MapReduce's shuffle works. <b>Parallelism</b>: the halves are independent (Java's <code>Arrays.parallelSort</code> uses a parallel merge-based sort).</p>
      <p><b>The inversion-count family.</b> Any "count pairs i &lt; j with condition(a[i], a[j])" where the condition is monotone can ride on the merge: <i>reverse pairs</i> (a[i] &gt; 2·a[j]) uses a separate two-pointer count <b>before</b> merging; <i>count of smaller numbers after self</i> sorts indices instead of values so each original position can collect its count. Use <code>long</code> for counts: the maximum is N(N−1)/2 ≈ 5·10<sup>9</sup> for N = 10<sup>5</sup>.</p>`,
    aiEra: `<p><b>What AI changes:</b> merge sort itself is commodity code. What interviews now probe is whether you can <b>modify</b> the merge: count something during it, sort indices instead of values, merge linked lists, or reason about external sorting for data that does not fit in memory — the parts that need understanding, not recall.</p>
      <p><b>Use AI as a partner:</b> write your inversion counter, then ask <code>Write a brute-force O(N^2) checker and a random test generator; run 1000 tests against my merge-sort version</code>. This "stress test against brute force" habit catches off-by-one bugs (<code>mid - i</code> vs <code>mid - i + 1</code>) that reading never will.</p>
      <p><b>Where AI goes wrong:</b> counting inversions with <code>&lt;</code> instead of <code>&lt;=</code> (counts equal values as inversions), returning <code>int</code> and overflowing, allocating a new array inside every recursive call (slow, GC-heavy), or claiming merge sort is in-place. <b>What you must still own:</b> the "remaining items in the left pile" insight, the N log N argument, and choosing merge sort for stability, linked lists and external data.</p>`
  });

  // =====================================================================
  // TOPIC 4: Quick Sort (Lomuto / Hoare / pivot / worst case)
  // =====================================================================
  topics.push({
    title: 'Quick Sort: Partitioning (Lomuto & Hoare), Pivot Choice, Worst Case',
    analogy: `<p>A PE teacher wants students lined up by height. She picks one student as the <b>pivot</b> — say Riya — and shouts: "Everyone <b>shorter than Riya</b>, go to her left. Everyone <b>taller</b>, go to her right!" Now Riya is standing in <b>exactly her final spot</b>. The teacher repeats the same trick with the left group and the right group separately. That shouting step is called <b>partitioning</b>.</p>`,
    explain: `<p>Quick sort = <b>partition</b> around a pivot, then <b>recurse</b> on the left part and the right part. Unlike merge sort, the hard work happens <b>before</b> recursing and no merge is needed. It sorts <b>in place</b> (no big temp array).</p>
      <h4>Lomuto partition (easy to write)</h4>
      <p>Pivot = last element. Pointer <code>j</code> scans left to right; pointer <code>i</code> marks "the next slot for a small item". Whenever <code>a[j] &lt; pivot</code>, swap it to slot <code>i</code> and move <code>i</code> forward. At the end swap the pivot into slot <code>i</code>.</p>
      ${H.table(['j', 'a[j]', '&lt; 5 ?', 'action', 'array', 'i'], [
        ['0', '4', 'yes', 'swap a[0]↔a[0], i++', '4 7 2 6 1 <b>5</b>', '1'],
        ['1', '7', 'no', 'skip', '4 7 2 6 1 <b>5</b>', '1'],
        ['2', '2', 'yes', 'swap a[1]↔a[2], i++', '4 2 7 6 1 <b>5</b>', '2'],
        ['3', '6', 'no', 'skip', '4 2 7 6 1 <b>5</b>', '2'],
        ['4', '1', 'yes', 'swap a[2]↔a[4], i++', '4 2 1 6 7 <b>5</b>', '3'],
        ['end', '', '', 'swap pivot a[5]↔a[3]', '<span class="c-b">4 2 1</span> <span class="c-p">5</span> <span class="c-y">7 6</span>', '3']
      ])}
      <p>Pivot 5 is now at index 3 forever; everything left is smaller, everything right is bigger or equal.</p>
      <h4>Hoare partition (faster in practice)</h4>
      <p>Two pointers start from <b>both ends</b>. <code>i</code> walks right until it finds something <code>≥ pivot</code> (a "big" item on the wrong side); <code>j</code> walks left until it finds something <code>≤ pivot</code>. Swap them, continue, stop when they cross. It does about 3× fewer swaps than Lomuto. Careful: the pivot does <b>not</b> necessarily end in its final spot, and you recurse on <code>[lo..j]</code> and <code>[j+1..hi]</code>.</p>
      ${H.table(['step', 'i stops at', 'j stops at', 'action', 'array (pivot = 5)'], [
        ['start', '', '', '', '3 8 2 5 1 4 7 6'],
        ['1', 'i=1 (8)', 'j=5 (4)', 'swap', '3 <span class="c-g">4</span> 2 5 1 <span class="c-g">8</span> 7 6'],
        ['2', 'i=3 (5)', 'j=4 (1)', 'swap', '3 4 2 <span class="c-g">1 5</span> 8 7 6'],
        ['3', 'i=4 (5)', 'j=3 (1)', 'crossed → return j = 3', '<span class="c-b">3 4 2 1</span> | <span class="c-y">5 8 7 6</span>']
      ])}
      <h4>Pivot choice and the worst case</h4>
      <p>If the pivot is always the <b>smallest or largest</b> item (e.g. "last element" on an <b>already sorted</b> array), one side is empty and the other has N − 1 items. Work = N + (N−1) + (N−2) + … ≈ N<sup>2</sup>/2 → <span class="c-r"><b>O(N<sup>2</sup>)</b></span>, and recursion depth N (stack overflow risk!).</p>
      ${H.table(['pivot rule', 'sorted input', 'typical'], [
        ['first / last element', '<span class="c-r">O(N<sup>2</sup>)</span>', 'O(N log N)'],
        ['middle element', 'O(N log N)', 'O(N log N) (can still be attacked)'],
        ['<b>random</b> index', 'O(N log N) expected', 'O(N log N) expected'],
        ['median of three (first, mid, last)', 'O(N log N)', 'O(N log N)']
      ])}
      <p><b>Many duplicates?</b> Lomuto with all-equal values also becomes O(N<sup>2</sup>). Fix: <b>3-way partition</b> (&lt; pivot | = pivot | &gt; pivot) — the Dutch National Flag idea. <b>Summary:</b> average O(N log N), worst O(N<sup>2</sup>), extra space O(log N) for recursion, <b>not stable</b>. Java's <code>Arrays.sort(int[])</code> is a tuned dual-pivot quick sort, and C++ <code>std::sort</code> is introsort (quick sort with a heap-sort fallback). Python and JavaScript use the merge-based TimSort instead.</p>`,
    clues: [
      '"Find the <b>Kth smallest / largest</b>" (no full sort needed) → quickselect, average O(N).',
      '"Sort <b>in place</b> with O(1)/O(log N) extra space" → quick sort (merge sort needs O(N) extra).',
      '"Rearrange so all elements <b>less than X come first</b>, then the rest" → that is exactly one partition step.',
      '"Three groups: 0s, 1s, 2s / less, equal, greater" → 3-way partition (Dutch National Flag).',
      '"Input may already be sorted" or "adversarial tests" → never use a fixed first/last pivot; pick a <b>random</b> pivot.',
      '"Top K items in any order" → partition around the Kth position, then take one side.'
    ],
    code: [{ lang: 'java', code: `
      // Quick sort with Lomuto partition and a RANDOM pivot (avoids the sorted-input worst case).
      static final Random RNG = new Random();

      void quickSort(int[] a, int lo, int hi) {
          if (lo >= hi) return;
          int p = lomuto(a, lo, hi);       // pivot is now at its final index p
          quickSort(a, lo, p - 1);         // everything smaller
          quickSort(a, p + 1, hi);         // everything bigger or equal
      }

      int lomuto(int[] a, int lo, int hi) {
          int r = lo + RNG.nextInt(hi - lo + 1);
          swap(a, r, hi);                  // move the random pivot to the end
          int pivot = a[hi];
          int i = lo;                      // next slot for an item smaller than pivot
          for (int j = lo; j < hi; j++) {
              if (a[j] < pivot) {
                  swap(a, i, j);
                  i++;
              }
          }
          swap(a, i, hi);                  // drop the pivot right after the small items
          return i;
      }

      void swap(int[] a, int x, int y) { int t = a[x]; a[x] = a[y]; a[y] = t; }`,
      alt: [
        { lang: 'python', code: `# Quick sort with Lomuto partition and a RANDOM pivot (avoids the sorted-input worst case).
import random

def quick_sort(a, lo, hi):
    if lo >= hi:
        return
    p = lomuto(a, lo, hi)              # pivot is now at its final index p
    quick_sort(a, lo, p - 1)           # everything smaller
    quick_sort(a, p + 1, hi)           # everything bigger or equal

def lomuto(a, lo, hi):
    r = random.randint(lo, hi)
    a[r], a[hi] = a[hi], a[r]          # move the random pivot to the end
    pivot, i = a[hi], lo               # i = next slot for an item smaller than pivot
    for j in range(lo, hi):
        if a[j] < pivot:
            a[i], a[j] = a[j], a[i]
            i += 1
    a[i], a[hi] = a[hi], a[i]          # drop the pivot right after the small items
    return i` },
        { lang: 'js', code: `// Quick sort with Lomuto partition and a RANDOM pivot (avoids the sorted-input worst case).
function quickSort(a, lo, hi) {
  if (lo >= hi) return;
  const p = lomuto(a, lo, hi);       // pivot is now at its final index p
  quickSort(a, lo, p - 1);           // everything smaller
  quickSort(a, p + 1, hi);           // everything bigger or equal
}

function lomuto(a, lo, hi) {
  const r = lo + Math.floor(Math.random() * (hi - lo + 1));
  [a[r], a[hi]] = [a[hi], a[r]];     // move the random pivot to the end
  const pivot = a[hi];
  let i = lo;                        // next slot for an item smaller than pivot
  for (let j = lo; j < hi; j++) {
    if (a[j] < pivot) { [a[i], a[j]] = [a[j], a[i]]; i++; }
  }
  [a[i], a[hi]] = [a[hi], a[i]];     // drop the pivot right after the small items
  return i;
}` },
        { lang: 'cpp', code: `// Quick sort with Lomuto partition and a RANDOM pivot (avoids the sorted-input worst case).
mt19937 rng(random_device{}());

int lomuto(vector<int>& a, int lo, int hi) {
    int r = uniform_int_distribution<int>(lo, hi)(rng);
    swap(a[r], a[hi]);                 // move the random pivot to the end
    int pivot = a[hi], i = lo;         // i = next slot for an item smaller than pivot
    for (int j = lo; j < hi; j++)
        if (a[j] < pivot) swap(a[i++], a[j]);
    swap(a[i], a[hi]);                 // drop the pivot right after the small items
    return i;
}

void quickSort(vector<int>& a, int lo, int hi) {
    if (lo >= hi) return;
    int p = lomuto(a, lo, hi);         // pivot is now at its final index p
    quickSort(a, lo, p - 1);
    quickSort(a, p + 1, hi);
}` }, { lang: 'csharp', code: String.raw`
// Quick sort with Lomuto partition and a RANDOM pivot (avoids the sorted-input worst case).
static readonly Random RNG = new Random();

void QuickSort(int[] a, int lo, int hi) {
    if (lo >= hi) return;
    int p = Lomuto(a, lo, hi);       // pivot is now at its final index p
    QuickSort(a, lo, p - 1);         // everything smaller
    QuickSort(a, p + 1, hi);         // everything bigger or equal
}

int Lomuto(int[] a, int lo, int hi) {
    int r = lo + RNG.Next(hi - lo + 1);
    Swap(a, r, hi);                  // move the random pivot to the end
    int pivot = a[hi];
    int i = lo;                      // next slot for an item smaller than pivot
    for (int j = lo; j < hi; j++) {
        if (a[j] < pivot) {
            Swap(a, i, j);
            i++;
        }
    }
    Swap(a, i, hi);                  // drop the pivot right after the small items
    return i;
}

void Swap(int[] a, int x, int y) { int t = a[x]; a[x] = a[y]; a[y] = t; }` }
      ] }, { lang: 'java', code: `
      // Quick sort with Hoare partition (two pointers from both ends).
      void quickSortHoare(int[] a, int lo, int hi) {
          if (lo >= hi) return;
          int p = hoare(a, lo, hi);
          quickSortHoare(a, lo, p);        // NOTE: p is included on the left side
          quickSortHoare(a, p + 1, hi);
      }

      int hoare(int[] a, int lo, int hi) {
          int pivot = a[lo + (hi - lo) / 2];   // middle value as pivot
          int i = lo - 1, j = hi + 1;
          while (true) {
              do { i++; } while (a[i] < pivot);   // find a big item on the left side
              do { j--; } while (a[j] > pivot);   // find a small item on the right side
              if (i >= j) return j;               // pointers crossed: split point found
              int t = a[i]; a[i] = a[j]; a[j] = t; // fix both wrong-side items at once
          }
      }`,
      alt: [
        { lang: 'python', code: `# Quick sort with Hoare partition (two pointers from both ends).
def quick_sort_hoare(a, lo, hi):
    if lo >= hi:
        return
    p = hoare(a, lo, hi)
    quick_sort_hoare(a, lo, p)         # NOTE: p is included on the left side
    quick_sort_hoare(a, p + 1, hi)

def hoare(a, lo, hi):
    pivot = a[(lo + hi) // 2]          # (lower) middle value as pivot
    i, j = lo - 1, hi + 1
    while True:
        i += 1
        while a[i] < pivot:            # find a big item on the left side
            i += 1
        j -= 1
        while a[j] > pivot:            # find a small item on the right side
            j -= 1
        if i >= j:
            return j                   # pointers crossed: split point found
        a[i], a[j] = a[j], a[i]        # fix both wrong-side items at once` },
        { lang: 'js', code: `// Quick sort with Hoare partition (two pointers from both ends).
function quickSortHoare(a, lo, hi) {
  if (lo >= hi) return;
  const p = hoare(a, lo, hi);
  quickSortHoare(a, lo, p);          // NOTE: p is included on the left side
  quickSortHoare(a, p + 1, hi);
}

function hoare(a, lo, hi) {
  const pivot = a[lo + ((hi - lo) >> 1)];   // (lower) middle value as pivot
  let i = lo - 1, j = hi + 1;
  while (true) {
    do { i++; } while (a[i] < pivot);       // find a big item on the left side
    do { j--; } while (a[j] > pivot);       // find a small item on the right side
    if (i >= j) return j;                   // pointers crossed: split point found
    [a[i], a[j]] = [a[j], a[i]];            // fix both wrong-side items at once
  }
}` },
        { lang: 'cpp', code: `// Quick sort with Hoare partition (two pointers from both ends).
int hoare(vector<int>& a, int lo, int hi) {
    int pivot = a[lo + (hi - lo) / 2];        // (lower) middle value as pivot
    int i = lo - 1, j = hi + 1;
    while (true) {
        do { i++; } while (a[i] < pivot);     // find a big item on the left side
        do { j--; } while (a[j] > pivot);     // find a small item on the right side
        if (i >= j) return j;                 // pointers crossed: split point found
        swap(a[i], a[j]);                     // fix both wrong-side items at once
    }
}

void quickSortHoare(vector<int>& a, int lo, int hi) {
    if (lo >= hi) return;
    int p = hoare(a, lo, hi);
    quickSortHoare(a, lo, p);                 // NOTE: p is included on the left side
    quickSortHoare(a, p + 1, hi);
}` }, { lang: 'csharp', code: String.raw`
// Quick sort with Hoare partition (two pointers from both ends).
void QuickSortHoare(int[] a, int lo, int hi) {
    if (lo >= hi) return;
    int p = Hoare(a, lo, hi);
    QuickSortHoare(a, lo, p);        // NOTE: p is included on the left side
    QuickSortHoare(a, p + 1, hi);
}

int Hoare(int[] a, int lo, int hi) {
    int pivot = a[lo + (hi - lo) / 2];   // middle value as pivot
    int i = lo - 1, j = hi + 1;
    while (true) {
        do { i++; } while (a[i] < pivot);   // find a big item on the left side
        do { j--; } while (a[j] > pivot);   // find a small item on the right side
        if (i >= j) return j;               // pointers crossed: split point found
        int t = a[i]; a[i] = a[j]; a[j] = t; // fix both wrong-side items at once
    }
}` }
      ] }],
    codeTitle: ['Lomuto partition + random pivot', 'Hoare partition'],
    viz: [
      {
        title: 'Quick sort with Lomuto partition (pivot = last)',
        input: '4 7 2 6 1 5',
        inputLabel: 'Array (space separated, up to 9 numbers)',
        gen: function (input) {
          var a = parseNums(input, 9, { example: '4 7 2 6 1 5' });
          var frames = [], fixedPos = {}, stack = [];
          function base() { var h = {}; for (var q in fixedPos) h[q] = 'done'; return h; }
          function qs(lo, hi) {
            if (lo > hi) return;
            stack.push('qs(' + lo + ',' + hi + ')');
            if (lo === hi) {
              fixedPos[lo] = true;
              frames.push({ narr: 'qs(' + lo + ',' + hi + '): a single item (' + a[lo] + ') is already in its final place.', parts: [
                { type: 'array', label: 'array', values: a.slice(), hl: mix(base(), one(lo, 'ok')), range: [lo, hi], showIdx: true },
                { type: 'stack', label: 'call stack', items: stack.slice(), hl: one(stack.length - 1, 'cur') }
              ] });
              stack.pop();
              return;
            }
            var pivot = a[hi], i = lo;
            frames.push({ narr: 'qs(' + lo + ',' + hi + '): pivot = last item = <b>' + pivot + '</b>. i = ' + lo + ' marks the next slot for something smaller than ' + pivot + '; j will scan ' + lo + '..' + (hi - 1) + '.', parts: [
              { type: 'array', label: 'array', values: a.slice(), hl: mix(base(), one(hi, 'sel')), range: [lo, hi], ptr: one(lo, 'i'), showIdx: true },
              { type: 'stack', label: 'call stack', items: stack.slice(), hl: one(stack.length - 1, 'cur') },
              { type: 'vars', vals: { lo: lo, hi: hi, pivot: pivot, i: i } }
            ] });
            for (var j = lo; j < hi; j++) {
              var small = a[j] < pivot, narr;
              if (small) {
                var t = a[i]; a[i] = a[j]; a[j] = t;
                narr = 'a[j] = ' + a[i] + ' &lt; ' + pivot + ' → <span class="c-g">small item: swap it into slot i = ' + i + '</span>, then i moves to ' + (i + 1) + '.';
                i++;
              } else {
                narr = 'a[j] = ' + a[j] + ' ≥ ' + pivot + ' → big item, leave it; only j moves on.';
              }
              var h = base(); for (var q = lo; q < i; q++) h[q] = 'win'; h[hi] = 'sel'; h[j] = small ? 'ok' : 'cur';
              var p = {}; if (i === j) p[j] = ['i', 'j']; else { p[j] = 'j'; p[i] = 'i'; }
              frames.push({ narr: narr, parts: [
                { type: 'array', label: 'array (blue = smaller than pivot)', values: a.slice(), hl: h, range: [lo, hi], ptr: p, showIdx: true },
                { type: 'vars', vals: { pivot: pivot, i: i, j: j } }
              ] });
            }
            var t2 = a[i]; a[i] = a[hi]; a[hi] = t2;
            fixedPos[i] = true;
            var hf = base(); for (var z = lo; z < i; z++) hf[z] = 'win'; hf[i] = 'sel';
            frames.push({ narr: 'Scan done. Swap the pivot into slot i = ' + i + '. Now <b>' + pivot + ' is in its final position</b>: everything on its left is smaller, everything on its right is bigger or equal. Recurse on both sides.', parts: [
              { type: 'array', label: 'array', values: a.slice(), hl: hf, ptr: one(i, 'pivot'), range: [lo, hi], showIdx: true },
              { type: 'stack', label: 'call stack', items: stack.slice(), hl: one(stack.length - 1, 'cur') }
            ] });
            qs(lo, i - 1);
            qs(i + 1, hi);
            stack.pop();
          }
          frames.push({ narr: 'Start quick sort on the whole array. Each partition fixes one pivot in its final place, then we sort the smaller-side and bigger-side separately.', parts: [
            { type: 'array', label: 'array', values: a.slice(), showIdx: true }
          ] });
          qs(0, a.length - 1);
          var all = {}; for (var q2 = 0; q2 < a.length; q2++) all[q2] = 'ok';
          frames.push({ narr: 'Sorted! Note: if the input had been already sorted, the last-element pivot would always be the maximum → lopsided splits → O(N<sup>2</sup>). That is why real code picks a random pivot.', parts: [
            { type: 'array', label: 'sorted', values: a.slice(), hl: all, showIdx: true }
          ] });
          return frames;
        }
      },
      {
        title: 'Hoare partition: two pointers walk toward each other',
        input: '3 8 2 5 1 4 7 6',
        inputLabel: 'Array (space separated, 3 to 12 numbers)',
        gen: function (input) {
          var a = parseNums(input, 12, { minN: 3, example: '3 8 2 5 1 4 7 6' });
          var frames = [], lo = 0, hi = a.length - 1, mid = Math.floor((lo + hi) / 2), pivot = a[mid];
          var i = lo - 1, j = hi + 1, round = 0;
          frames.push({ narr: 'Hoare partition. Pivot = middle value a[' + mid + '] = <b>' + pivot + '</b>. i starts just left of the array, j just right of it. Goal: items ≤ ' + pivot + ' on the left block, items ≥ ' + pivot + ' on the right block.', parts: [
            { type: 'array', label: 'array', values: a.slice(), hl: one(mid, 'sel'), showIdx: true },
            { type: 'vars', vals: { pivot: pivot, i: 'start', j: 'end' } }
          ] });
          while (true) {
            round++;
            do { i++; } while (a[i] < pivot);
            frames.push({ narr: 'i walks right, skipping items smaller than ' + pivot + ', and stops at index ' + i + ' (value ' + a[i] + ' ≥ ' + pivot + '): a big-or-equal item on the left side.', parts: [
              { type: 'array', label: 'array', values: a.slice(), hl: one(i, 'cur'), ptr: one(i, 'i'), showIdx: true },
              { type: 'vars', vals: { pivot: pivot, i: i, j: j > hi ? 'end' : j } }
            ] });
            do { j--; } while (a[j] > pivot);
            var p = {}; if (i === j) p[i] = ['i', 'j']; else { p[i] = 'i'; p[j] = 'j'; }
            frames.push({ narr: 'j walks left, skipping items bigger than ' + pivot + ', and stops at index ' + j + ' (value ' + a[j] + ' ≤ ' + pivot + '): a small-or-equal item on the right side.', parts: [
              { type: 'array', label: 'array', values: a.slice(), hl: mix(one(i, 'cur'), one(j, 'cur')), ptr: p, showIdx: true },
              { type: 'vars', vals: { pivot: pivot, i: i, j: j } }
            ] });
            if (i >= j) {
              var h = {}; for (var q = lo; q <= hi; q++) h[q] = q <= j ? 'win' : 'ok';
              frames.push({ narr: 'i (' + i + ') ≥ j (' + j + '): the pointers have <b>met or crossed</b>, so we stop and return <b>j = ' + j + '</b>. Left block a[0..' + j + '] has items ≤ ' + pivot + ', right block a[' + (j + 1) + '..' + hi + '] has items ≥ ' + pivot + '. Quick sort would now recurse on each block.', parts: [
                { type: 'array', label: 'partitioned (blue = left block, green = right block)', values: a.slice(), hl: h, ptr: one(j, 'split'), showIdx: true },
                { type: 'vars', vals: { returned: j, rounds: round }, hl: { returned: 'sel' } }
              ] });
              break;
            }
            var t = a[i]; a[i] = a[j]; a[j] = t;
            frames.push({ narr: 'Both items are on the wrong side, so <span class="c-g">swap a[' + i + '] and a[' + j + ']</span>. One swap fixes two misplaced items — that is why Hoare does fewer swaps than Lomuto.', parts: [
              { type: 'array', label: 'array', values: a.slice(), hl: mix(one(i, 'ok'), one(j, 'ok')), ptr: p, showIdx: true },
              { type: 'vars', vals: { pivot: pivot, i: i, j: j } }
            ] });
          }
          return frames;
        }
      }
    ],
    problems: [
      {
        title: 'Kth Smallest Element (Quickselect)',
        level: 'Medium',
        tags: ['quickselect', 'partition', 'quick sort'],
        statement: `<p>Given an unsorted array <code>a</code> of N integers and an integer <code>k</code> (1-based), return the <b>k-th smallest</b> element. (For "k-th largest", use the (N − k + 1)-th smallest.) Aim for <b>average O(N)</b> time.</p>`,
        constraints: `1 ≤ k ≤ N ≤ 10<sup>5</sup>, -10<sup>9</sup> ≤ a[i] ≤ 10<sup>9</sup>`,
        example: `${H.arr([7, 10, 4, 3, 20, 15], { label: 'a, k = 3' })}
          ${H.arr([3, 4, 7, 10, 15, 20], { label: 'if sorted', hl: { 2: 'p' } })}
          <p>Output: <b>7</b> — it would sit at index ${H.c('p', 'k − 1 = 2')} in sorted order. Quickselect finds it without sorting everything.</p>`,
        brute: {
          why: `<p>Sort the whole array, return <code>a[k-1]</code>: O(N log N). It works, but it is wasted effort — we put <b>every</b> item in its exact place when we only care about <b>one</b> position. Partition tells us which side the answer is on, so we can throw the other side away.</p>`,
          code: { lang: 'java', code: `
            int brute(int[] a, int k) {
                int[] b = a.clone();
                Arrays.sort(b);          // sorts everything: O(N log N)
                return b[k - 1];
            }`, alt: [{ lang: 'python', code: String.raw`
def kth_smallest(arr, k):
    b = sorted(arr)          # sorts everything: O(N log N)
    return b[k - 1]` }, { lang: 'js', code: String.raw`
function kthSmallest(arr, k) {
  const b = [...arr].sort((x, y) => x - y);   // sorts everything: O(N log N)
  return b[k - 1];
}` }, { lang: 'cpp', code: String.raw`
int kthSmallest(vector<int> a, int k) {
    sort(a.begin(), a.end());    // sorts everything: O(N log N)
    return a[k - 1];
}` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public int KthSmallest(int[] a, int k) {
        int[] b = (int[])a.Clone();
        Array.Sort(b);           // sorts everything: O(N log N)
        return b[k - 1];
    }
}` }] }
        },
        mcq: {
          q: 'After one partition the pivot lands at index 5, and you want the element at sorted index 2. What next?',
          options: ['Recurse on both sides', 'Recurse only on the left part a[lo..4]', 'Recurse only on the right part a[6..hi]', 'The answer is the pivot'],
          answer: 1,
          explain: 'The pivot is at its final index 5. Index 2 &lt; 5, so the answer lives among the smaller items on the left. The right side can be ignored completely — that is what makes quickselect O(N) on average instead of O(N log N).'
        },
        hints: [
          `<p><b>Aha:</b> after partitioning, the pivot sits at its <b>final sorted index p</b>. If p == k − 1 we are done; if p &lt; k − 1 the answer is to the right; else to the left. Only <b>one</b> side is ever explored.</p>`,
          `<p>Loop with <code>lo</code>, <code>hi</code> and <code>target = k - 1</code>. Use Lomuto partition (pointer <code>i</code> = next slot for small items, <code>j</code> scans). Move <code>lo = p + 1</code> or <code>hi = p - 1</code> after each partition.</p>`,
          `<p>Traps: k is 1-based (target = k − 1); with a fixed last-element pivot a sorted input becomes O(N<sup>2</sup>) — use the middle or a random index and swap it to the end first; work on a copy if the input must not change. Recipe: target = k−1 → while lo ≤ hi: p = partition(lo, hi) → if p == target return a[p] → else shrink lo or hi.</p>`
        ],
        tests: { sig: 'int[] int -> int', fn: 'kthSmallest', cases: [
          [[[7, 10, 4, 3, 20, 15], 3], 7],
          [[[1], 1], 1],
          [[[5, 5, 5], 2], 5],
          [[[-1, -5, 3], 1], -5],
          [[[1, 2, 3, 4, 5], 5], 5],
          [[[5, 4, 3, 2, 1], 1], 1],
          [[[1000000000, -1000000000, 0], 2], 0],
          [[[3, 1, 2, 3, 1], 4], 3]
        ] },
        solution: {
          approach: `<p>Quickselect: Lomuto partition with the middle element as pivot (swapped to the end), keep only the side that contains index k − 1. For adversarial inputs replace the middle index with a random one.</p>`,
          code: `
            class Solution {
                public int kthSmallest(int[] arr, int k) {
                    int[] a = arr.clone();             // do not disturb the caller's array
                    int lo = 0, hi = a.length - 1;
                    int target = k - 1;                // 0-based position we want
                    while (lo <= hi) {
                        int p = partition(a, lo, hi);  // pivot is now at final index p
                        if (p == target) return a[p];
                        if (p < target) lo = p + 1;    // answer is among the bigger items
                        else hi = p - 1;               // answer is among the smaller items
                    }
                    throw new IllegalArgumentException("k out of range");
                }

                // Lomuto partition around the middle element.
                private int partition(int[] a, int lo, int hi) {
                    int mid = lo + (hi - lo) / 2;
                    swap(a, mid, hi);                  // move pivot to the end
                    int pivot = a[hi];
                    int i = lo;                        // next slot for an item < pivot
                    for (int j = lo; j < hi; j++) {
                        if (a[j] < pivot) {
                            swap(a, i, j);
                            i++;
                        }
                    }
                    swap(a, i, hi);                    // pivot goes right after the small items
                    return i;
                }

                private void swap(int[] a, int x, int y) { int t = a[x]; a[x] = a[y]; a[y] = t; }

                public static void main(String[] args) {
                    System.out.println(new Solution().kthSmallest(new int[]{7, 10, 4, 3, 20, 15}, 3)); // 7
                }
            }`,
          alt: [
            { lang: 'python', code: `def kth_smallest(arr, k):
    a = list(arr)                            # do not disturb the caller's list
    lo, hi, target = 0, len(a) - 1, k - 1    # 0-based position we want
    while lo <= hi:
        mid = (lo + hi) // 2
        a[mid], a[hi] = a[hi], a[mid]        # move the middle pivot to the end
        pivot, i = a[hi], lo                 # i = next slot for an item < pivot
        for j in range(lo, hi):
            if a[j] < pivot:
                a[i], a[j] = a[j], a[i]
                i += 1
        a[i], a[hi] = a[hi], a[i]            # pivot lands at its final index i
        if i == target:
            return a[i]
        if i < target:
            lo = i + 1                       # answer is among the bigger items
        else:
            hi = i - 1                       # answer is among the smaller items
    raise ValueError("k out of range")` },
            { lang: 'js', code: `function kthSmallest(arr, k) {
  const a = arr.slice();                     // do not disturb the caller's array
  const swap = (x, y) => { const t = a[x]; a[x] = a[y]; a[y] = t; };
  let lo = 0, hi = a.length - 1;
  const target = k - 1;                      // 0-based position we want
  while (lo <= hi) {
    swap((lo + hi) >> 1, hi);                // move the middle pivot to the end
    const pivot = a[hi];
    let i = lo;                              // next slot for an item < pivot
    for (let j = lo; j < hi; j++) if (a[j] < pivot) swap(i++, j);
    swap(i, hi);                             // pivot lands at its final index i
    if (i === target) return a[i];
    if (i < target) lo = i + 1; else hi = i - 1;
  }
  throw new Error('k out of range');
}` },
            { lang: 'cpp', code: `class Solution {
public:
    // (the library one-liner is std::nth_element(a.begin(), a.begin() + k - 1, a.end()))
    int kthSmallest(vector<int> a, int k) {     // by value: caller's vector untouched
        int lo = 0, hi = (int)a.size() - 1, target = k - 1;
        while (lo <= hi) {
            swap(a[lo + (hi - lo) / 2], a[hi]);  // move the middle pivot to the end
            int pivot = a[hi], i = lo;           // i = next slot for an item < pivot
            for (int j = lo; j < hi; j++)
                if (a[j] < pivot) swap(a[i++], a[j]);
            swap(a[i], a[hi]);                   // pivot lands at its final index i
            if (i == target) return a[i];
            if (i < target) lo = i + 1; else hi = i - 1;
        }
        throw invalid_argument("k out of range");
    }
};` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public int KthSmallest(int[] arr, int k) {
        int[] a = (int[])arr.Clone();      // do not disturb the caller's array
        int lo = 0, hi = a.Length - 1;
        int target = k - 1;                // 0-based position we want
        while (lo <= hi) {
            int p = Partition(a, lo, hi);  // pivot is now at final index p
            if (p == target) return a[p];
            if (p < target) lo = p + 1;    // answer is among the bigger items
            else hi = p - 1;               // answer is among the smaller items
        }
        throw new ArgumentException("k out of range");
    }

    // Lomuto partition around the middle element.
    private int Partition(int[] a, int lo, int hi) {
        int mid = lo + (hi - lo) / 2;
        Swap(a, mid, hi);                  // move pivot to the end
        int pivot = a[hi];
        int i = lo;                        // next slot for an item < pivot
        for (int j = lo; j < hi; j++) {
            if (a[j] < pivot) {
                Swap(a, i, j);
                i++;
            }
        }
        Swap(a, i, hi);                    // pivot goes right after the small items
        return i;
    }

    private void Swap(int[] a, int x, int y) { int t = a[x]; a[x] = a[y]; a[y] = t; }
}` }
          ],
          dry: {
            head: ['round', 'lo..hi', 'pivot (middle)', 'scan result', 'array after partition', 'p', 'decision'],
            rows: [
              ['1', '0..5', 'a[2] = 4 → swapped to end', 'only 3 &lt; 4 → goes to slot 0', '[3, <span class="c-p">4</span>, 15, 7, 20, 10]', '1', '1 &lt; 2 → lo = 2'],
              ['2', '2..5', 'a[3] = 7 → swapped to end', '15, 10, 20 all ≥ 7 → none move', '[3, 4, <span class="c-p">7</span>, 10, 20, 15]', '2', '<span class="c-g">p == 2 → return 7</span>']
            ]
          },
          complexity: `<p><b>Average time O(N)</b>: each round scans the current range and (on average) throws away about half of it → N + N/2 + N/4 + … ≈ 2N. <b>Worst case O(N<sup>2</sup>)</b> if pivots are always extreme (random pivots make that astronomically unlikely). <b>Space O(N)</b> for the copy (O(1) extra if you may modify the input).</p>`
        }
      }
    ]
  });

  // ---------- TOPIC 4 extras ----------
  Object.assign(topics[topics.length - 1], {
    examples: [
      {
        title: 'The worst case in action: sorted input + last-element pivot',
        html: `<p>[1, 2, 3, 4, 5], pivot = last. Partition 1: pivot 5 is the maximum → left part [1..4] has 4 items, right part is empty. Then pivot 4 → 3 items left … </p>
          ${H.table(['call', 'range size', 'comparisons', 'split'], [['1', '5', '4', '4 | 0'], ['2', '4', '3', '3 | 0'], ['3', '3', '2', '2 | 0'], ['4', '2', '1', '1 | 0']])}
          <p>Total 4 + 3 + 2 + 1 = <b>10 = N(N−1)/2</b> comparisons and recursion depth N. For N = 10<sup>5</sup> that is 5·10<sup>9</sup> comparisons <b>and</b> a StackOverflowError. A random pivot makes this practically impossible.</p>`
      },
      {
        title: 'Dutch National Flag: 3-way partition (Sort Colors)',
        html: `<p>Three pointers split the array into <b>&lt; pivot | = pivot | unknown | &gt; pivot</b>. Pivot = 1 on [2, 0, 2, 1, 1, 0]:</p>
          ${H.table(['lt', 'i', 'gt', 'a[i]', 'action', 'array'], [
            ['0', '0', '5', '2', '&gt; 1: swap a[i]↔a[gt], gt−− (do not move i: the new a[i] is unchecked)', '0 0 2 1 1 2'],
            ['0', '0', '4', '0', '&lt; 1: swap a[lt]↔a[i], lt++, i++', '0 0 2 1 1 2'],
            ['1', '1', '4', '0', '&lt; 1: lt++, i++', '0 0 2 1 1 2'],
            ['2', '2', '4', '2', '&gt; 1: swap a[2]↔a[4], gt−−', '0 0 1 1 2 2'],
            ['2', '2', '3', '1', '= 1: i++', '0 0 1 1 2 2'],
            ['2', '3', '3', '1', '= 1: i++ → i &gt; gt, stop', '<span class="c-g">0 0 1 1 2 2</span>']
          ])}
          <p>One pass, O(1) space. In quick sort, the whole "= pivot" block is finished in one go, so an array of all-equal values costs O(N) instead of O(N<sup>2</sup>).</p>`,
        code: { lang: 'java', code: `
          // 3-way partition (Dijkstra's Dutch National Flag) — sorts 0/1/2 in one pass.
          void sortColors(int[] a) {
              int lt = 0, i = 0, gt = a.length - 1;   // a[0..lt-1] = 0, a[lt..i-1] = 1, a[gt+1..] = 2
              while (i <= gt) {
                  if (a[i] == 0) {
                      int t = a[lt]; a[lt] = a[i]; a[i] = t;
                      lt++; i++;
                  } else if (a[i] == 2) {
                      int t = a[gt]; a[gt] = a[i]; a[i] = t;
                      gt--;                            // the swapped-in value is not checked yet
                  } else {
                      i++;                             // a 1 is already in the middle zone
                  }
              }
          }`,
          alt: [
            { lang: 'python', run: true, code: `# 3-way partition (Dijkstra's Dutch National Flag): sorts 0/1/2 in one pass.
def sort_colors(a):
    lt, i, gt = 0, 0, len(a) - 1   # a[:lt] = 0, a[lt:i] = 1, a[gt+1:] = 2
    while i <= gt:
        if a[i] == 0:
            a[lt], a[i] = a[i], a[lt]
            lt += 1; i += 1
        elif a[i] == 2:
            a[gt], a[i] = a[i], a[gt]
            gt -= 1                # the swapped-in value is not checked yet
        else:
            i += 1                 # a 1 is already in the middle zone

colors = [2, 0, 2, 1, 1, 0]
sort_colors(colors)
print(colors)  # [0, 0, 1, 1, 2, 2]` },
            { lang: 'js', code: `// 3-way partition (Dijkstra's Dutch National Flag): sorts 0/1/2 in one pass.
function sortColors(a) {
  let lt = 0, i = 0, gt = a.length - 1;    // a[0..lt-1] = 0, a[lt..i-1] = 1, a[gt+1..] = 2
  while (i <= gt) {
    if (a[i] === 0) { [a[lt], a[i]] = [a[i], a[lt]]; lt++; i++; }
    else if (a[i] === 2) { [a[gt], a[i]] = [a[i], a[gt]]; gt--; }   // re-check the new a[i]
    else i++;                              // a 1 is already in the middle zone
  }
}` },
            { lang: 'cpp', code: `// 3-way partition (Dijkstra's Dutch National Flag): sorts 0/1/2 in one pass.
void sortColors(vector<int>& a) {
    int lt = 0, i = 0, gt = (int)a.size() - 1;   // a[0..lt-1] = 0, a[lt..i-1] = 1, a[gt+1..] = 2
    while (i <= gt) {
        if (a[i] == 0) swap(a[lt++], a[i++]);
        else if (a[i] == 2) swap(a[gt--], a[i]);   // re-check the new a[i]
        else i++;                                  // a 1 is already in the middle zone
    }
}` }, { lang: 'csharp', code: String.raw`
// 3-way partition (Dijkstra's Dutch National Flag): sorts 0/1/2 in one pass.
void SortColors(int[] a) {
    int lt = 0, i = 0, gt = a.Length - 1;   // a[0..lt-1] = 0, a[lt..i-1] = 1, a[gt+1..] = 2
    while (i <= gt) {
        if (a[i] == 0) {
            int t = a[lt]; a[lt] = a[i]; a[i] = t;
            lt++; i++;
        } else if (a[i] == 2) {
            int t = a[gt]; a[gt] = a[i]; a[i] = t;
            gt--;                            // the swapped-in value is not checked yet
        } else {
            i++;                             // a 1 is already in the middle zone
        }
    }
}` }
          ] }
      },
      {
        title: 'All-equal input breaks plain Lomuto',
        html: `<p>[7, 7, 7, 7, 7] with Lomuto: the test <code>a[j] &lt; pivot</code> is never true, so the pivot lands at index lo and the right side keeps N − 1 items every time → <b>O(N<sup>2</sup>)</b>. Hoare partition handles this better (both pointers stop on equal values and swap, splitting in the middle), and 3-way partition handles it best (one pass, done).</p>
          <p>Lesson: "many duplicates" in the constraints (e.g. values 0..10 but N = 10<sup>6</sup>) is a clue to use 3-way partitioning or just counting sort.</p>`
      },
      {
        title: 'K-th largest via quickselect',
        html: `<p>K-th largest in N items = the item at 0-based sorted index <b>N − K</b>. For [3, 2, 1, 5, 6, 4] and K = 2: N − K = 4 → sorted [1, 2, 3, 4, <b>5</b>, 6] → answer 5. Quickselect partitions, checks which side index 4 is on, and only continues there: expected N + N/2 + N/4 + … ≈ <b>2N</b> steps.</p>`,
        code: { lang: 'java', code: `
          int kthLargest(int[] nums, int k) {
              int target = nums.length - k;            // index in ascending order
              int lo = 0, hi = nums.length - 1;
              java.util.Random rnd = new java.util.Random(7);
              while (true) {
                  int r = lo + rnd.nextInt(hi - lo + 1); // random pivot → expected O(N)
                  int t = nums[r]; nums[r] = nums[hi]; nums[hi] = t;
                  int p = lo;
                  for (int j = lo; j < hi; j++)
                      if (nums[j] < nums[hi]) { t = nums[p]; nums[p] = nums[j]; nums[j] = t; p++; }
                  t = nums[p]; nums[p] = nums[hi]; nums[hi] = t;
                  if (p == target) return nums[p];
                  if (p < target) lo = p + 1; else hi = p - 1;
              }
          }`,
          alt: [
            { lang: 'python', run: true, code: `import random

def kth_largest(nums, k):
    target = len(nums) - k                     # index in ascending order
    lo, hi = 0, len(nums) - 1
    rnd = random.Random(7)
    while True:
        r = rnd.randint(lo, hi)                # random pivot -> expected O(N)
        nums[r], nums[hi] = nums[hi], nums[r]
        p = lo
        for j in range(lo, hi):
            if nums[j] < nums[hi]:
                nums[p], nums[j] = nums[j], nums[p]
                p += 1
        nums[p], nums[hi] = nums[hi], nums[p]
        if p == target:
            return nums[p]
        if p < target:
            lo = p + 1
        else:
            hi = p - 1

print(kth_largest([3, 2, 1, 5, 6, 4], 2))  # 5
# (library shortcut: heapq.nlargest(k, nums)[-1], O(N log k))` },
            { lang: 'js', code: `function kthLargest(nums, k) {
  const target = nums.length - k;            // index in ascending order
  let lo = 0, hi = nums.length - 1;
  while (true) {
    const r = lo + Math.floor(Math.random() * (hi - lo + 1));   // random pivot
    [nums[r], nums[hi]] = [nums[hi], nums[r]];
    let p = lo;
    for (let j = lo; j < hi; j++) {
      if (nums[j] < nums[hi]) { [nums[p], nums[j]] = [nums[j], nums[p]]; p++; }
    }
    [nums[p], nums[hi]] = [nums[hi], nums[p]];
    if (p === target) return nums[p];
    if (p < target) lo = p + 1; else hi = p - 1;
  }
}` },
            { lang: 'cpp', code: `int kthLargest(vector<int> nums, int k) {
    // std::nth_element is introselect: quickselect with a worst-case fallback
    nth_element(nums.begin(), nums.begin() + (nums.size() - k), nums.end());
    return nums[nums.size() - k];            // the item at ascending index N - k
}` }, { lang: 'csharp', code: String.raw`
int KthLargest(int[] nums, int k) {
    int target = nums.Length - k;            // index in ascending order
    int lo = 0, hi = nums.Length - 1;
    var rnd = new Random(7);
    while (true) {
        int r = lo + rnd.Next(hi - lo + 1);  // random pivot -> expected O(N)
        int t = nums[r]; nums[r] = nums[hi]; nums[hi] = t;
        int p = lo;
        for (int j = lo; j < hi; j++)
            if (nums[j] < nums[hi]) { t = nums[p]; nums[p] = nums[j]; nums[j] = t; p++; }
        t = nums[p]; nums[p] = nums[hi]; nums[hi] = t;
        if (p == target) return nums[p];
        if (p < target) lo = p + 1; else hi = p - 1;
    }
}` }
          ] }
      }
    ],
    deepDive: `<p><b>Average case, precisely.</b> With a random pivot, quick sort makes about <b>2N ln N ≈ 1.39 N log₂N</b> comparisons on average — ~39% more than merge sort — yet it is usually faster in practice: it works in place, scans memory sequentially (cache-friendly), and its inner loop is tiny. The O(N<sup>2</sup>) worst case needs consistently terrible pivots; with random pivots its probability is astronomically small, but with a <b>fixed</b> rule an attacker can craft "killer" inputs (McIlroy's anti-quicksort adversary), which matters for servers sorting user-supplied data.</p>
      <p><b>Stack depth.</b> Recurse into the <b>smaller</b> side and loop on the larger one: the recursion depth is then at most log₂N even in the worst case. <b>Introsort</b> (C++ <code>std::sort</code>) watches the depth and switches to heap sort past ~2 log₂N, guaranteeing O(N log N); recent JDK versions of the dual-pivot quick sort have a similar heap-sort fallback. Java's <code>Arrays.sort(int[])</code> uses <b>dual-pivot</b> quick sort (two pivots, three parts), which reduces memory traffic.</p>
      <p><b>Hoare gotchas.</b> With the <code>[lo..j], [j+1..hi]</code> split, the pivot must be chosen with the <b>lower</b> middle (or a[lo]); choosing a[hi] can return j = hi and recurse forever. The pivot is not necessarily at index j afterwards, so Hoare is not directly usable for "pivot lands at its final index" logic like quickselect without care.</p>
      <p><b>Selection theory.</b> Quickselect is expected O(N), worst O(N<sup>2</sup>). <b>Median of medians</b> (groups of 5) gives a guaranteed O(N) pivot, but its constant is large, so libraries prefer introselect (quickselect + fallback); C++ <code>std::nth_element</code> is exactly that. For a stream or "top K" with K ≪ N, a size-K heap (O(N log K), O(K) memory) is often the better engineering answer.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-generated quick sorts are everywhere — and a striking number use a <b>fixed last-element pivot</b> or plain Lomuto, which degrade to O(N<sup>2</sup>) on sorted or all-equal data. Reviewing such code and spotting that risk is now a more common real-world task than writing quick sort yourself.</p>
      <p><b>Use AI as a partner:</b> ask <code>Generate adversarial inputs for this quick sort: sorted, reverse, all equal, organ-pipe; measure comparisons</code>, or <code>Convert my Lomuto partition to a 3-way partition and explain each invariant</code>. Then verify the invariants (lt, i, gt zones) yourself on a 6-element trace.</p>
      <p><b>Where AI goes wrong:</b> mixing Hoare's return value with Lomuto's recursion bounds (<code>p - 1</code> vs <code>p</code>), advancing <code>i</code> after swapping with <code>gt</code> in Dutch flag, using <code>new Random()</code> inside a hot loop, or saying quickselect is "O(N) worst case". <b>What you must still own:</b> the partition invariant, why random pivots work, the 3-way fix for duplicates, and when to prefer quickselect vs a heap for top-K.</p>`
  });

  // =====================================================================
  // TOPIC 5: Custom Comparators in Java
  // =====================================================================
  topics.push({
    title: 'Custom Comparators (lambdas, key functions, multiple keys, overflow-safe compare)',
    analogy: `<p>A sorting machine at a post office does not know <b>your</b> rule. It only asks one question again and again: <b>"Here are two letters, A and B — which one goes first?"</b> You hand the machine a little <b>rule card</b> that answers that question: "the one with the smaller PIN first; if PINs are equal, the heavier one first". That rule card is a <b>Comparator</b>. The machine (your language's built-in sort) does all the rest.</p>`,
    explain: `<p>A <code>Comparator&lt;T&gt;</code> is a function <code>compare(a, b)</code> that returns:</p>
      ${H.table(['return value', 'meaning'], [
        ['<b>negative</b> (e.g. -1)', '<code>a</code> goes <b>before</b> <code>b</code>'],
        ['<b>0</b>', 'tie — order does not matter (a stable sort keeps original order)'],
        ['<b>positive</b> (e.g. 1)', '<code>a</code> goes <b>after</b> <code>b</code>']
      ])}
      <p>Memory trick: <code>compare(a, b)</code> works like <code>a − b</code>: "small a → negative → a first" gives <b>ascending</b>. Swap the roles (<code>compare(b, a)</code>) to get <b>descending</b>.</p>
      <h4>int[] vs Integer[] vs List</h4>
      ${H.table(['you have', 'call', 'comparator allowed?', 'algorithm inside', 'stable?'], [
        ['<code>int[]</code> (primitives)', '<code>Arrays.sort(a)</code>', '<span class="c-r">NO</span> — ascending only', 'dual-pivot quick sort', 'n/a (equal ints are identical)'],
        ['<code>Integer[]</code>, <code>String[]</code>, <code>int[][]</code>', '<code>Arrays.sort(a, cmp)</code>', '<span class="c-g">yes</span>', 'TimSort (merge-based)', '<span class="c-g">yes</span>'],
        ['<code>List&lt;T&gt;</code>', '<code>Collections.sort(list, cmp)</code> or <code>list.sort(cmp)</code>', '<span class="c-g">yes</span>', 'TimSort', '<span class="c-g">yes</span>']
      ])}
      <p>So to sort an <code>int[]</code> in <b>descending</b> order you either box it into <code>Integer[]</code> and pass <code>Collections.reverseOrder()</code>, or sort ascending and reverse the array yourself (faster, no boxing).</p>
      <h4>The same rule card in other languages</h4>
      ${H.table(['language', 'how you pass the rule', 'descending', 'stable?'], [
        ['Java', '<code>Comparator</code> returning negative / 0 / positive', '<code>Collections.reverseOrder()</code> (objects only)', 'objects: yes · <code>int[]</code>: n/a'],
        ['Python', '<code>key=</code> function (tuples give several keys); <code>functools.cmp_to_key</code> for a two-argument rule', '<code>reverse=True</code> or a negated key', 'yes, always'],
        ['JavaScript', '<code>(a, b) =&gt;</code> negative / 0 / positive. With <b>no</b> comparator, numbers are sorted <b>as strings</b>', 'swap a and b', 'yes (since ES2019)'],
        ['C++', 'a <code>bool</code> "less than" function: <code>(a, b)</code> returns true if a goes first. Use <code>&lt;</code>, never <code>&lt;=</code>', '<code>greater&lt;int&gt;()</code>', '<code>std::sort</code> no · <code>std::stable_sort</code> yes']
      ])}
      <p>The ideas below (multi-key rules, the overflow trap, the contract) apply in every language; only the spelling changes.</p>
      <h4>The overflow trap: never write <code>(a, b) -&gt; a - b</code></h4>
      ${H.table(['a', 'b', 'a − b in int', 'says', 'truth'], [
        ['-2,000,000,000', '1,000,000,000', '<span class="c-r">+1,294,967,296</span> (overflowed!)', 'a is bigger', 'a is smaller'],
        ['5', '3', '2', 'a is bigger', 'correct']
      ])}
      <p>The real difference −3·10<sup>9</sup> does not fit in an int, so it wraps around to a positive number and the sort silently breaks. <b>Always use</b> <code>Integer.compare(a, b)</code> / <code>Long.compare(a, b)</code> — they just compare, never subtract.</p>
      <h4>Comparing by multiple keys</h4>
      <p>"Sort students by marks <b>high to low</b>; if marks tie, by name <b>A to Z</b>":</p>
      ${H.table(['before', 'after'], [
        ['(Ravi, 80) (Anu, 92) (Zoe, 80) (Bob, 92)', '(<span class="c-g">Anu, 92</span>) (<span class="c-g">Bob, 92</span>) (<span class="c-y">Ravi, 80</span>) (<span class="c-y">Zoe, 80</span>)']
      ])}
      <p>Either chain helpers — <code>Comparator.comparingInt(...).reversed().thenComparing(...)</code> — or write one lambda: compare the first key; only if it is 0, compare the next key.</p>`,
    clues: [
      '"Sort by <b>X</b>, and if X ties, by <b>Y</b>" → multi-key comparator (<code>thenComparing</code> or an if-chain).',
      '"Arrange numbers/strings to form the <b>largest/smallest</b> number" → comparator on concatenation <code>(b+a).compareTo(a+b)</code>.',
      '"Sort intervals/pairs/points by start, end, distance…" → sort with a comparator or key on that field (Java <code>Arrays.sort(iv, (x, y) -&gt; Integer.compare(x[0], y[0]))</code>, Python <code>key=lambda x: x[0]</code>).',
      '"Sort in <b>descending</b> order" → Java <code>int[]</code>: box to <code>Integer[]</code> + <code>Collections.reverseOrder()</code>, or sort and reverse; Python <code>reverse=True</code>; JS <code>(a, b) =&gt; b - a</code>; C++ <code>greater&lt;int&gt;()</code>.',
      'Values up to ±10<sup>9</sup> or long values → compare, never subtract (<code>Integer.compare</code> / <code>Long.compare</code> in Java, <code>&lt;</code> in C++); Python ints never overflow.',
      '"Keep the original order for equal elements" → you need a <b>stable</b> sort: Java object sorts, Python <code>sorted</code>, JS <code>Array.prototype.sort</code> and C++ <code>std::stable_sort</code> are stable.'
    ],
    code: [{ lang: 'java', code: `
      // 1) Primitive int[]: ascending only, no comparator.
      int[] a = {5, 1, 4};
      Arrays.sort(a);                                        // [1, 4, 5]

      // 2) Descending: box into Integer[] and pass a comparator.
      Integer[] b = {5, 1, 4};
      Arrays.sort(b, Collections.reverseOrder());            // [5, 4, 1]
      Arrays.sort(b, (x, y) -> Integer.compare(y, x));       // same thing, written as a lambda

      // 3) Descending without boxing: sort, then reverse in place.
      int[] c = {5, 1, 4};
      Arrays.sort(c);
      for (int i = 0, j = c.length - 1; i < j; i++, j--) { int t = c[i]; c[i] = c[j]; c[j] = t; }

      // 4) 2D array (intervals) by start, then by end.
      int[][] iv = {{3, 5}, {1, 4}, {1, 2}};
      Arrays.sort(iv, (x, y) -> x[0] != y[0] ? Integer.compare(x[0], y[0])
                                              : Integer.compare(x[1], y[1]));   // {1,2} {1,4} {3,5}

      // 5) Lists: Collections.sort or list.sort.
      List<String> words = new ArrayList<>(List.of("pear", "fig", "apple"));
      Collections.sort(words);                                       // alphabetical
      words.sort(Comparator.comparingInt(String::length));            // by length (stable: ties keep order)
      words.sort((p, q) -> q.length() - p.length());                  // lengths are small → subtraction is safe here

      // 6) Overflow-safe compare for big values.
      long[] big = {-2_000_000_000L, 1_000_000_000L};
      Long[] boxed = {big[0], big[1]};
      Arrays.sort(boxed, (x, y) -> Long.compare(x, y));               // never (int)(x - y)`,
      alt: [
        { lang: 'python', run: true, code: `from functools import cmp_to_key

# 1) Ascending: sorted() returns a new list, .sort() sorts in place.
a = [5, 1, 4]
a.sort()                                          # [1, 4, 5]

# 2) Descending: no boxing issue in Python, just reverse=True.
b = sorted([5, 1, 4], reverse=True)               # [5, 4, 1]

# 3) Pairs / intervals: a key function returning a tuple = several keys at once.
iv = [[3, 5], [1, 4], [1, 2]]
iv.sort(key=lambda x: (x[0], x[1]))               # [[1, 2], [1, 4], [3, 5]]

# 4) Words by length (stable: ties keep their order).
words = ["pear", "fig", "apple"]
words.sort(key=len)                               # ['fig', 'pear', 'apple']

# 5) A real two-argument comparator, when a key is awkward.
nums = [-2_000_000_000, 1_000_000_000]
nums.sort(key=cmp_to_key(lambda x, y: (x > y) - (x < y)))   # ints never overflow in Python
print(a, b, iv, words, nums)` },
        { lang: 'js', run: true, code: `// 1) Numbers: ALWAYS pass a comparator. The default sort compares as strings.
const a = [5, 1, 10, 4];
console.log([...a].sort());                        // [1, 10, 4, 5]  <- string order!
a.sort((x, y) => x - y);                           // [1, 4, 5, 10]

// 2) Descending: swap the roles.
const b = [5, 1, 4].sort((x, y) => y - x);         // [5, 4, 1]

// 3) Typed arrays sort numerically by default and avoid object overhead.
const c = Int32Array.from([5, 1, 4]).sort();       // Int32Array [1, 4, 5]

// 4) Intervals by start, then by end.
const iv = [[3, 5], [1, 4], [1, 2]];
iv.sort((x, y) => x[0] - y[0] || x[1] - y[1]);     // [[1,2],[1,4],[3,5]]

// 5) Strings: compare with < / > (or localeCompare for human-language order).
const words = ['pear', 'fig', 'apple'];
words.sort((p, q) => p.length - q.length);         // stable: ['fig', 'pear', 'apple']

// 6) x - y is exact for Numbers up to 2^53; for BigInt use comparisons.
const big = [3n, -2n, 1n].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
console.log(a, b, c, iv, words, big);` },
        { lang: 'cpp', code: `// 1) Ascending.
vector<int> a = {5, 1, 4};
sort(a.begin(), a.end());                                  // 1 4 5

// 2) Descending: pass greater<int>() (or sort, then reverse).
vector<int> b = {5, 1, 4};
sort(b.begin(), b.end(), greater<int>());                  // 5 4 1

// 3) Intervals: vectors / pairs already compare start first, then end.
vector<vector<int>> iv = {{3, 5}, {1, 4}, {1, 2}};
sort(iv.begin(), iv.end());                                // {1,2} {1,4} {3,5}

// 4) Words by length; stable_sort keeps ties in input order (sort does not).
vector<string> words = {"pear", "fig", "apple"};
stable_sort(words.begin(), words.end(),
            [](const string& p, const string& q) { return p.size() < q.size(); });

// 5) A C++ comparator answers "does x go BEFORE y?" with a bool: use <, never <=,
//    and never subtract (signed overflow is undefined behaviour).
vector<long long> big = {-2000000000LL, 1000000000LL};
sort(big.begin(), big.end(), [](long long x, long long y) { return x < y; });` }, { lang: 'csharp', code: String.raw`
using System;
using System.Collections.Generic;
using System.Linq;

class Program {
    static void Main() {
        // 1) int[]: Array.Sort sorts ascending in place.
        int[] a = { 5, 1, 4 };
        Array.Sort(a);                                          // [1, 4, 5]

        // 2) Descending: pass a Comparison<int> (no boxing needed in C#).
        int[] b = { 5, 1, 4 };
        Array.Sort(b, (x, y) => y.CompareTo(x));                // [5, 4, 1]

        // 3) Descending without a comparator: sort, then reverse in place.
        int[] c = { 5, 1, 4 };
        Array.Sort(c);
        Array.Reverse(c);

        // 4) 2D jagged array (intervals) by start, then by end.
        int[][] iv = { new[] { 3, 5 }, new[] { 1, 4 }, new[] { 1, 2 } };
        Array.Sort(iv, (x, y) => x[0] != y[0] ? x[0].CompareTo(y[0]) : x[1].CompareTo(y[1]));   // {1,2} {1,4} {3,5}

        // 5) Lists: List.Sort is NOT stable; LINQ OrderBy is stable (ties keep input order).
        var words = new List<string> { "pear", "fig", "apple" };
        words.Sort(string.CompareOrdinal);                       // alphabetical
        words = words.OrderBy(w => w.Length).ToList();           // by length, stable
        words.Sort((p, q) => q.Length - p.Length);               // lengths are small -> subtraction is safe here

        // 6) Overflow-safe compare for big values.
        long[] big = { -2000000000L, 1000000000L };
        Array.Sort(big, (x, y) => x.CompareTo(y));               // never (int)(x - y)
        Console.WriteLine(string.Join(" ", a) + " | " + string.Join(" ", b) + " | " + string.Join(" ", c) + " | " + string.Join(" ", words) + " | " + string.Join(" ", big));
    }
}`, run: true }
      ] }, { lang: 'java', code: `
      // Multiple keys with a small record type.
      class Student {
          String name; int marks;
          Student(String n, int m) { name = n; marks = m; }
          public String toString() { return name + ":" + marks; }
      }

      class Demo {
          public static void main(String[] args) {
              List<Student> list = new ArrayList<>(List.of(
                  new Student("Ravi", 80), new Student("Anu", 92),
                  new Student("Zoe", 80), new Student("Bob", 92)));

              // Way 1: chain helper methods.
              list.sort(Comparator.comparingInt((Student s) -> s.marks).reversed()   // marks high → low
                                  .thenComparing(s -> s.name));                       // then name A → Z

              // Way 2: one hand-written lambda (same result).
              list.sort((x, y) -> {
                  if (x.marks != y.marks) return Integer.compare(y.marks, x.marks); // bigger marks first
                  return x.name.compareTo(y.name);                                   // tie → alphabetical
              });
              System.out.println(list); // [Anu:92, Bob:92, Ravi:80, Zoe:80]
          }
      }`,
      alt: [
        { lang: 'python', run: true, code: `from dataclasses import dataclass

@dataclass
class Student:
    name: str
    marks: int

students = [Student("Ravi", 80), Student("Anu", 92), Student("Zoe", 80), Student("Bob", 92)]

# Way 1: one key tuple. Negate the number to get "marks high -> low".
students.sort(key=lambda s: (-s.marks, s.name))

# Way 2: two stable passes, secondary key first.
students.sort(key=lambda s: s.name)
students.sort(key=lambda s: s.marks, reverse=True)   # reverse=True keeps ties stable too

print([f"{s.name}:{s.marks}" for s in students])     # ['Anu:92', 'Bob:92', 'Ravi:80', 'Zoe:80']` },
        { lang: 'js', run: true, code: `class Student {
  constructor(name, marks) { this.name = name; this.marks = marks; }
  toString() { return this.name + ':' + this.marks; }
}

const list = [new Student('Ravi', 80), new Student('Anu', 92),
              new Student('Zoe', 80), new Student('Bob', 92)];

list.sort((x, y) => {
  if (x.marks !== y.marks) return y.marks - x.marks;        // bigger marks first
  return x.name < y.name ? -1 : x.name > y.name ? 1 : 0;    // tie -> alphabetical
});
console.log(list.join(', '));   // Anu:92, Bob:92, Ravi:80, Zoe:80` },
        { lang: 'cpp', code: `struct Student {
    string name;
    int marks;
};

int main() {
    vector<Student> list = {{"Ravi", 80}, {"Anu", 92}, {"Zoe", 80}, {"Bob", 92}};

    // Way 1: compare tuples; the minus sign flips marks to high -> low.
    sort(list.begin(), list.end(), [](const Student& x, const Student& y) {
        return make_tuple(-x.marks, x.name) < make_tuple(-y.marks, y.name);
    });

    // Way 2: the if-chain (same result).
    sort(list.begin(), list.end(), [](const Student& x, const Student& y) {
        if (x.marks != y.marks) return x.marks > y.marks;   // bigger marks first
        return x.name < y.name;                             // tie -> alphabetical
    });

    for (const auto& s : list) cout << s.name << ':' << s.marks << ' ';   // Anu:92 Bob:92 Ravi:80 Zoe:80
}` }, { lang: 'csharp', code: String.raw`
using System;
using System.Collections.Generic;
using System.Linq;

// Multiple keys with a small record type.
class Student {
    public string Name; public int Marks;
    public Student(string n, int m) { Name = n; Marks = m; }
    public override string ToString() { return Name + ":" + Marks; }
}

class Demo {
    static void Main() {
        var list = new List<Student> {
            new Student("Ravi", 80), new Student("Anu", 92),
            new Student("Zoe", 80), new Student("Bob", 92) };

        // Way 1: chain LINQ key selectors.
        list = list.OrderByDescending(s => s.Marks)              // marks high -> low
                   .ThenBy(s => s.Name, StringComparer.Ordinal)   // then name A -> Z
                   .ToList();

        // Way 2: one hand-written comparison (same result).
        list.Sort((x, y) => {
            if (x.Marks != y.Marks) return y.Marks.CompareTo(x.Marks);   // bigger marks first
            return string.CompareOrdinal(x.Name, y.Name);                // tie -> alphabetical
        });
        Console.WriteLine("[" + string.Join(", ", list) + "]"); // [Anu:92, Bob:92, Ravi:80, Zoe:80]
    }
}`, run: true }
      ] }],
    codeTitle: ['Everyday sorting recipes', 'Sort by several keys'],
    problems: [
      {
        title: 'Largest Number (custom comparator)',
        level: 'Medium',
        tags: ['comparator', 'strings', 'greedy'],
        statement: `<p>Given a list of non-negative integers <code>nums</code>, arrange them so that, written one after another, they form the <b>largest possible number</b>. Return it as a string (it may be too big for any integer type).</p>`,
        constraints: `1 ≤ N ≤ 100, 0 ≤ nums[i] ≤ 10<sup>9</sup>`,
        example: `${H.arr([3, 30, 34, 5, 9], { label: 'nums' })}
          ${H.arr([9, 5, 34, 3, 30], { label: 'best order', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'y', 4: 'y' } })}
          <p>Output: <b>"9534330"</b>. Why is ${H.c('y', '3 before 30')}? Because "3"+"30" = <b>330</b> beats "30"+"3" = 303. Plain numeric sorting (30 &gt; 3) would get this wrong.</p>`,
        brute: {
          why: `<p>Try every ordering (permutation), glue the strings, keep the biggest. That is N! orderings — for N = 12 already 479 million, for N = 100 impossible. The waste: we re-check whole arrangements when the right choice can be decided <b>pair by pair</b>.</p>`,
          code: { lang: 'java', code: `
            class Brute {
                String best = "";

                String largest(int[] nums) {
                    String[] s = new String[nums.length];
                    for (int i = 0; i < nums.length; i++) s[i] = String.valueOf(nums[i]);
                    permute(s, 0);
                    return best;
                }

                void permute(String[] s, int k) {
                    if (k == s.length) {
                        String cand = String.join("", s);          // all candidates have the same length
                        if (cand.compareTo(best) > 0) best = cand;  // so string compare = numeric compare
                        return;
                    }
                    for (int i = k; i < s.length; i++) {
                        String t = s[k]; s[k] = s[i]; s[i] = t;
                        permute(s, k + 1);
                        t = s[k]; s[k] = s[i]; s[i] = t;            // undo the swap
                    }
                }
            }`, alt: [{ lang: 'python', code: String.raw`
def largest_number(nums):
    s = [str(x) for x in nums]
    best = ""

    def permute(k):
        nonlocal best
        if k == len(s):
            cand = "".join(s)            # all candidates have the same length
            if cand > best:              # so string compare = numeric compare
                best = cand
            return
        for i in range(k, len(s)):
            s[k], s[i] = s[i], s[k]
            permute(k + 1)
            s[k], s[i] = s[i], s[k]      # undo the swap

    permute(0)
    return best` }, { lang: 'js', code: String.raw`
function largestNumber(nums) {
  const s = nums.map(String);
  let best = '';

  function permute(k) {
    if (k === s.length) {
      const cand = s.join('');           // all candidates have the same length
      if (cand > best) best = cand;      // so string compare = numeric compare
      return;
    }
    for (let i = k; i < s.length; i++) {
      [s[k], s[i]] = [s[i], s[k]];
      permute(k + 1);
      [s[k], s[i]] = [s[i], s[k]];       // undo the swap
    }
  }

  permute(0);
  return best;
}` }, { lang: 'cpp', code: String.raw`
class Solution {
    string best = "";

    void permute(vector<string>& s, int k) {
        if (k == (int) s.size()) {
            string cand;
            for (const string& x : s) cand += x;     // all candidates have the same length
            if (cand > best) best = cand;            // so string compare = numeric compare
            return;
        }
        for (int i = k; i < (int) s.size(); i++) {
            swap(s[k], s[i]);
            permute(s, k + 1);
            swap(s[k], s[i]);                        // undo the swap
        }
    }

public:
    string largestNumber(const vector<int>& nums) {
        vector<string> s;
        for (int x : nums) s.push_back(to_string(x));
        permute(s, 0);
        return best;
    }
};` }, { lang: 'csharp', code: String.raw`
public class Brute {
    string best = "";

    public string Largest(int[] nums) {
        string[] s = new string[nums.Length];
        for (int i = 0; i < nums.Length; i++) s[i] = nums[i].ToString();
        Permute(s, 0);
        return best;
    }

    void Permute(string[] s, int k) {
        if (k == s.Length) {
            string cand = string.Join("", s);                      // all candidates have the same length
            if (string.CompareOrdinal(cand, best) > 0) best = cand; // so string compare = numeric compare
            return;
        }
        for (int i = k; i < s.Length; i++) {
            string t = s[k]; s[k] = s[i]; s[i] = t;
            Permute(s, k + 1);
            t = s[k]; s[k] = s[i]; s[i] = t;                        // undo the swap
        }
    }
}` }] }
        },
        mcq: {
          q: 'Which rule correctly decides whether string <code>a</code> should come before string <code>b</code>?',
          options: ['a comes first if the number a is bigger than b', 'a comes first if a is longer', 'a comes first if a + b (glued) is bigger than b + a', 'a comes first if a is alphabetically smaller'],
          answer: 2,
          explain: 'Only the glued result matters. 3 vs 30: "330" &gt; "303" so 3 goes first, even though 30 &gt; 3 as numbers. This pairwise rule is consistent (transitive), so sorting with it gives the global best.'
        },
        hints: [
          `<p><b>Aha:</b> for any two pieces a and b, only two local orders exist: <code>a+b</code> or <code>b+a</code>. Put first whichever makes the glued string bigger. Since both glued strings have equal length, comparing them as strings is the same as comparing them as numbers.</p>`,
          `<p>Convert the ints to strings, then sort them with the rule "a first if a+b &gt; b+a" (Java <code>Arrays.sort(s, (a, b) -&gt; (b + a).compareTo(a + b))</code> — note b+a first to get "bigger first"; Python <code>cmp_to_key</code>; C++ <code>[](a, b) { return a + b &gt; b + a; }</code>). Glue the pieces with a string builder or <code>join</code>.</p>`,
          `<p>Trap: input like [0, 0] gives "00" — the answer must be <b>"0"</b>; after sorting, if the first string is "0" then everything is 0. Recipe: to strings → sort with the glue rule → if s[0] is "0" return "0" → append all → return.</p>`
        ],
        tests: { sig: 'int[] -> string', fn: 'largestNumber', cases: [
          [[[3, 30, 34, 5, 9]], '9534330'],
          [[[10, 2]], '210'],
          [[[0, 0]], '0'],
          [[[0]], '0'],
          [[[1]], '1'],
          [[[1000000000, 9]], '91000000000'],
          [[[121, 12]], '12121'],
          [[[0, 1, 0]], '100'],
          [[[432, 43243]], '43243432']
        ] },
        solution: {
          approach: `<p>Sort the numbers as strings with the comparator "b+a vs a+b", then concatenate.</p>`,
          code: `
            class Solution {
                public String largestNumber(int[] nums) {
                    String[] s = new String[nums.length];
                    for (int i = 0; i < nums.length; i++) {
                        s[i] = String.valueOf(nums[i]);
                    }
                    // a goes first when a+b is bigger than b+a.
                    // compare(a, b) must be NEGATIVE for "a first", so compare (b+a) against (a+b).
                    Arrays.sort(s, (a, b) -> (b + a).compareTo(a + b));
                    if (s[0].equals("0")) {
                        return "0";                // all zeros: avoid "000"
                    }
                    StringBuilder sb = new StringBuilder();
                    for (String x : s) sb.append(x);
                    return sb.toString();
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().largestNumber(new int[]{3, 30, 34, 5, 9})); // 9534330
                }
            }`,
          alt: [
            { lang: 'python', code: `from functools import cmp_to_key

def largest_number(nums):
    s = [str(x) for x in nums]
    # a goes first when a+b > b+a; cmp must be negative for "a first"
    s.sort(key=cmp_to_key(lambda a, b: (b + a > a + b) - (b + a < a + b)))
    return "0" if s[0] == "0" else "".join(s)   # all zeros: avoid "000"` },
            { lang: 'js', code: `function largestNumber(nums) {
  const s = nums.map(String);
  // a goes first when a+b is bigger; equal-length digit strings compare like numbers
  s.sort((a, b) => {
    const ab = a + b, ba = b + a;
    return ab > ba ? -1 : ab < ba ? 1 : 0;     // plain string compare, no locale rules
  });
  return s[0] === '0' ? '0' : s.join('');      // all zeros: avoid "000"
}` },
            { lang: 'cpp', code: `class Solution {
public:
    string largestNumber(const vector<int>& nums) {
        vector<string> s;
        for (int x : nums) s.push_back(to_string(x));
        // strict weak ordering: a before b when a+b is bigger than b+a
        sort(s.begin(), s.end(), [](const string& a, const string& b) { return a + b > b + a; });
        if (s[0] == "0") return "0";                  // all zeros: avoid "000"
        string out;
        for (const string& x : s) out += x;
        return out;
    }
};` }, { lang: 'csharp', code: String.raw`
using System;
using System.Text;

public class Solution {
    public string LargestNumber(int[] nums) {
        string[] s = new string[nums.Length];
        for (int i = 0; i < nums.Length; i++) {
            s[i] = nums[i].ToString();
        }
        // a goes first when a+b is bigger than b+a.
        // Compare(a, b) must be NEGATIVE for "a first", so compare (b+a) against (a+b). Ordinal: plain char codes.
        Array.Sort(s, (a, b) => string.CompareOrdinal(b + a, a + b));
        if (s[0] == "0") {
            return "0";                // all zeros: avoid "000"
        }
        var sb = new StringBuilder();
        foreach (string x in s) sb.Append(x);
        return sb.ToString();
    }
}` }
          ],
          dry: {
            head: ['pair (a, b)', 'a + b', 'b + a', 'winner goes first'],
            rows: [
              ['("3", "30")', '330', '303', '<span class="c-g">3</span> before 30'],
              ['("3", "34")', '334', '343', '<span class="c-g">34</span> before 3'],
              ['("34", "5")', '345', '534', '<span class="c-g">5</span> before 34'],
              ['("5", "9")', '59', '95', '<span class="c-g">9</span> before 5'],
              ['sorted order', '9, 5, 34, 3, 30', 's[0] = "9" ≠ "0"', '<span class="c-p">"9534330"</span>']
            ]
          },
          complexity: `<p><b>Time O(N log N · L)</b>: the sort makes about N log N comparisons and each glues two strings of total length up to L ≈ 20 characters. <b>Space O(N · L)</b> for the strings and the answer.</p>`
        }
      }
    ]
  });


  // ---------- TOPIC 5 extras: visualizers, examples, deep dive, AI era ----------
  Object.assign(topics[topics.length - 1], {
    viz: [
      {
        title: 'Watch the sort ask your comparator "who goes first?"',
        input: 'Ravi:80 Anu:92 Zoe:80 Bob:92',
        inputLabel: 'name:marks pairs (2 to 7), sorted by marks high→low, then name A→Z',
        gen: function (input) {
          var s = String(input === undefined || input === null ? '' : input).trim();
          if (!s) throw new Error('Type pairs like Ravi:80 Anu:92 Zoe:80');
          var toks = s.split(/[\s,]+/), L = [];
          for (var t = 0; t < toks.length; t++) {
            var mm = /^([A-Za-z]{1,10}):(\d{1,3})$/.exec(toks[t]);
            if (!mm) throw new Error('Each item must look like Name:marks, e.g. Ravi:80 (letters, then a number up to 999)');
            L.push({ n: mm[1], m: +mm[2] });
          }
          if (L.length < 2 || L.length > 7) throw new Error('Please enter between 2 and 7 students.');
          var CODE = '(x, y) -> {\n  if (x.marks != y.marks)\n    return Integer.compare(y.marks, x.marks);\n  return x.name.compareTo(y.name);\n}';
          var PY = 'def compare(x, y):\n    if x.marks != y.marks:\n        return (y.marks > x.marks) - (y.marks < x.marks)\n    return (x.name > y.name) - (x.name < y.name)',
              JS = '(x, y) => {\n  if (x.marks !== y.marks)\n    return y.marks < x.marks ? -1 : 1;\n  return x.name < y.name ? -1 : x.name > y.name ? 1 : 0;\n}',
              CPP = '[](const Student& x, const Student& y) {\n  if (x.marks != y.marks)\n    return x.marks > y.marks;\n  return x.name < y.name;\n}';
          var ALT = { python: { code: PY }, js: { code: JS }, cpp: { code: CPP } };
          function rows() { return L.map(function (o) { return [o.n, o.m]; }); }
          function cmp(x, y) { if (x.m !== y.m) return y.m < x.m ? -1 : 1; return x.n < y.n ? -1 : (x.n > y.n ? 1 : 0); }
          var frames = [], calls = 0;
          frames.push({ narr: 'The sort algorithm (here: insertion sort, like TimSort uses for short runs) knows <b>nothing</b> about students. Every time it needs an order it calls <code>compare(x, y)</code>: negative → x first, positive → y first, 0 → tie. (Python <code>cmp_to_key</code> and JavaScript comparators follow this number rule; a C++ comparator instead returns <code>true</code> when x goes first.)', parts: [
            { type: 'table', label: 'list (input order)', columns: ['name', 'marks'], rows: rows() },
            { type: 'code', label: 'your comparator (the rule card)', lang: 'java', code: CODE, alt: ALT, hl: { 1: 'cur' } }
          ] });
          for (var i = 1; i < L.length; i++) {
            var j = i;
            while (j > 0) {
              var x = L[j - 1], y = L[j], r = cmp(x, y), line = x.m !== y.m ? 3 : 4;
              calls++;
              var hl = {}; hl[j - 1] = 'cur'; hl[j] = 'cur';
              var why = x.m !== y.m ? 'marks differ (' + x.m + ' vs ' + y.m + ') → compare(' + y.m + ', ' + x.m + ') = ' + r : 'marks tie at ' + x.m + ' → compare names "' + x.n + '" vs "' + y.n + '" = ' + r;
              frames.push({ narr: 'compare(' + x.n + ', ' + y.n + '): ' + why + '. ' + (r > 0 ? '<span class="c-r">Positive → ' + y.n + ' must go before ' + x.n + ', swap.</span>' : '<span class="c-g">' + (r < 0 ? 'Negative' : 'Zero') + ' → already in a valid order, stop shifting.</span>'), parts: [
                { type: 'table', label: 'list', columns: ['name', 'marks'], rows: rows(), hl: hl },
                { type: 'code', label: 'comparator line used', lang: 'java', code: CODE, alt: ALT, hl: (function () { var h = {}; h[line] = r > 0 ? 'bad' : 'ok'; return h; })() },
                { type: 'vars', vals: { x: x.n + ':' + x.m, y: y.n + ':' + y.m, 'compare(x,y)': r, calls: calls }, hl: { 'compare(x,y)': r > 0 ? 'bad' : 'ok' } }
              ] });
              if (r > 0) {
                L[j - 1] = y; L[j] = x;
                var h2 = {}; h2[j - 1] = 'ok';
                frames.push({ narr: 'Swapped: ' + y.n + ' moves up one place. Keep comparing it with the item above.', parts: [
                  { type: 'table', label: 'list', columns: ['name', 'marks'], rows: rows(), hl: h2 }
                ] });
                j--;
              } else break;
            }
          }
          var all = {}; for (var q = 0; q < L.length; q++) all[q] = 'sel';
          frames.push({ narr: 'Sorted with <b>' + calls + '</b> comparator calls: marks high → low, and ties broken by name A → Z. Change the rule card and the very same sort produces a different order.', parts: [
            { type: 'table', label: 'sorted list', columns: ['name', 'marks'], rows: rows(), hl: all }
          ] });
          return frames;
        }
      },
      {
        title: 'The a − b overflow trap, bit by bit',
        input: '-2000000000 1000000000',
        inputLabel: 'Two integers a b (each between -2147483648 and 2147483647)',
        gen: function (input) {
          var p = String(input === undefined || input === null ? '' : input).trim().split(/[\s,]+/).map(Number);
          if (p.length !== 2 || p.some(function (v) { return !isFinite(v) || Math.floor(v) !== v; })) throw new Error('Enter exactly two whole numbers, e.g. -2000000000 1000000000');
          if (p.some(function (v) { return v < -2147483648 || v > 2147483647; })) throw new Error('Both numbers must fit in a Java int (-2147483648 .. 2147483647).');
          var a = p[0], b = p[1], real = a - b, wrapped = (a - b) | 0;
          var truth = a < b ? -1 : (a > b ? 1 : 0);
          var lie = wrapped < 0 ? -1 : (wrapped > 0 ? 1 : 0);
          var frames = [];
          frames.push({ narr: 'A comparator written as <code>(a, b) -&gt; a - b</code> uses the <b>sign</b> of a − b. Let us see what Java actually computes for a = ' + a + ', b = ' + b + '.', parts: [
            { type: 'vars', vals: { a: a, b: b } },
            { type: 'bits', label: 'a (32-bit int)', value: a, width: 32 },
            { type: 'bits', label: 'b (32-bit int)', value: b, width: 32 }
          ] });
          frames.push({ narr: 'In real maths a − b = <b>' + real + '</b>. A Java int can only hold −2,147,483,648 … 2,147,483,647. ' + (real !== wrapped ? '<span class="c-r">The true answer does not fit!</span>' : '<span class="c-g">This one fits, so no problem here.</span>'), parts: [
            { type: 'vars', vals: { 'real a-b': real, 'int range': '[-2147483648, 2147483647]' }, hl: { 'real a-b': real !== wrapped ? 'bad' : 'ok' } }
          ] });
          frames.push({ narr: 'Java keeps only the lowest 32 bits, so the result <b>wraps around</b> to ' + wrapped + '. Look at the top bit (bit 31, the sign bit): it is ' + (wrapped < 0 ? '1 → negative' : '0 → non-negative') + '.', parts: [
            { type: 'bits', label: 'int result of a - b', value: wrapped, width: 32, hl: { 31: real !== wrapped ? 'bad' : 'ok' } },
            { type: 'vars', vals: { 'a - b (int)': wrapped }, hl: { 'a - b (int)': real !== wrapped ? 'bad' : 'ok' } }
          ] });
          frames.push({ narr: 'The subtraction comparator says sign = <b>' + lie + '</b>, the truth is <b>' + truth + '</b>. ' + (lie !== truth ? '<span class="c-r">They disagree → the sort silently puts these two in the wrong order (or TimSort throws "Comparison method violates its general contract!").</span>' : '<span class="c-g">They agree for these values — but bigger values would break it.</span>'), parts: [
            { type: 'table', label: 'who wins?', columns: ['method', 'result', 'meaning'], rows: [['a - b', wrapped, lie < 0 ? 'a first' : lie > 0 ? 'b first' : 'tie'], ['Integer.compare(a, b)', truth, truth < 0 ? 'a first' : truth > 0 ? 'b first' : 'tie']], hl: lie !== truth ? { 0: 'bad', 1: 'ok' } : { 0: 'ok', 1: 'ok' } }
          ] });
          frames.push({ narr: '<b>Fix:</b> <code>Integer.compare(a, b)</code> only compares (<code>a &lt; b ? -1 : a == b ? 0 : 1</code>) — it never subtracts, so it can never overflow. Same for <code>Long.compare</code> and <code>Double.compare</code>.', parts: [
            { type: 'code', label: 'safe comparator', lang: 'java', code: 'Arrays.sort(arr, (x, y) -> Integer.compare(x, y));\n// or simply\nArrays.sort(arr, Comparator.naturalOrder());', hl: { 1: 'ok' } }
          ] });
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'Strings by length, then alphabetically',
        html: `<p>Input ["bb", "a", "ccc", "ab"]. Rule: shorter first; same length → A to Z. Output ${H.arr(['a', 'ab', 'bb', 'ccc'], { hl: { 1: 'g', 2: 'g' } })} — "ab" and "bb" tie on length 2, so the second key decides.</p>`,
        code: { lang: 'java', code: `
          List<String> w = new ArrayList<>(List.of("bb", "a", "ccc", "ab"));
          w.sort(Comparator.comparingInt(String::length).thenComparing(Comparator.naturalOrder()));
          System.out.println(w); // [a, ab, bb, ccc]`,
          alt: [
            { lang: 'python', run: true, code: `w = ["bb", "a", "ccc", "ab"]
w.sort(key=lambda s: (len(s), s))    # length first, then alphabetical
print(w)  # ['a', 'ab', 'bb', 'ccc']` },
            { lang: 'js', run: true, code: `const w = ['bb', 'a', 'ccc', 'ab'];
w.sort((p, q) => p.length - q.length || (p < q ? -1 : p > q ? 1 : 0));
console.log(w);   // [ 'a', 'ab', 'bb', 'ccc' ]` },
            { lang: 'cpp', code: `vector<string> w = {"bb", "a", "ccc", "ab"};
sort(w.begin(), w.end(), [](const string& p, const string& q) {
    return make_pair(p.size(), p) < make_pair(q.size(), q);   // length, then alphabetical
});
// w = {"a", "ab", "bb", "ccc"}` }, { lang: 'csharp', code: String.raw`
using System;
using System.Collections.Generic;
using System.Linq;

class Program {
    static void Main() {
        var w = new List<string> { "bb", "a", "ccc", "ab" };
        w = w.OrderBy(s => s.Length).ThenBy(s => s, StringComparer.Ordinal).ToList();   // length, then alphabetical
        Console.WriteLine("[" + string.Join(", ", w) + "]"); // [a, ab, bb, ccc]
    }
}`, run: true }
          ] }
      },
      {
        title: 'Points by distance from the origin (overflow-safe)',
        html: `<p>Points (3,3), (−2,2), (5,−1). Compare squared distances (no square root needed): 18, 8, 26 → order (−2,2), (3,3), (5,−1). With coordinates up to 10<sup>5</sup>, x² + y² can reach 2·10<sup>10</sup> — more than an int — so compute in <b>long</b> and compare with <code>Long.compare</code>.</p>`,
        code: { lang: 'java', code: `
          int[][] pts = {{3, 3}, {-2, 2}, {5, -1}};
          Arrays.sort(pts, (p, q) -> Long.compare(
                  (long) p[0] * p[0] + (long) p[1] * p[1],
                  (long) q[0] * q[0] + (long) q[1] * q[1]));
          System.out.println(Arrays.deepToString(pts)); // [[-2, 2], [3, 3], [5, -1]]`,
          alt: [
            { lang: 'python', run: true, code: `pts = [[3, 3], [-2, 2], [5, -1]]
pts.sort(key=lambda p: p[0] * p[0] + p[1] * p[1])   # squared distance; no overflow in Python
print(pts)  # [[-2, 2], [3, 3], [5, -1]]` },
            { lang: 'js', run: true, code: `const pts = [[3, 3], [-2, 2], [5, -1]];
const d = (p) => p[0] * p[0] + p[1] * p[1];   // up to 2e10: still exact in a Number
pts.sort((p, q) => d(p) - d(q));
console.log(JSON.stringify(pts));             // [[-2,2],[3,3],[5,-1]]` },
            { lang: 'cpp', code: `vector<array<int, 2>> pts = {{3, 3}, {-2, 2}, {5, -1}};
auto d = [](const array<int, 2>& p) { return 1LL * p[0] * p[0] + 1LL * p[1] * p[1]; };  // long long
sort(pts.begin(), pts.end(), [&](const auto& p, const auto& q) { return d(p) < d(q); });
// pts = {{-2, 2}, {3, 3}, {5, -1}}` }, { lang: 'csharp', code: String.raw`
using System;
using System.Collections.Generic;

class Program {
    static void Main() {
        int[][] pts = { new[] { 3, 3 }, new[] { -2, 2 }, new[] { 5, -1 } };
        Array.Sort(pts, (p, q) => ((long)p[0] * p[0] + (long)p[1] * p[1]).CompareTo(
                                   (long)q[0] * q[0] + (long)q[1] * q[1]));   // long: no overflow
        var rows = new List<string>();
        foreach (int[] p in pts) rows.Add("[" + p[0] + ", " + p[1] + "]");
        Console.WriteLine("[" + string.Join(", ", rows) + "]"); // [[-2, 2], [3, 3], [5, -1]]
    }
}`, run: true }
          ] }
      },
      {
        title: 'Descending int[] without boxing',
        html: `<p><code>Arrays.sort(int[], comparator)</code> does not exist. Boxing 10<sup>6</sup> ints into <code>Integer[]</code> costs extra memory (an object per value) and time. Faster: sort ascending, then reverse with two pointers — O(N) extra work, zero allocations.</p>
          ${H.arr([5, 1, 4, 2], { label: 'input' })}${H.arr([1, 2, 4, 5], { label: 'after Arrays.sort' })}${H.arr([5, 4, 2, 1], { label: 'after reversing', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g' } })}
          <p>(The trick "negate, sort, negate" fails for <code>Integer.MIN_VALUE</code>, because −MIN_VALUE overflows back to MIN_VALUE.)</p>`
      },
      {
        title: 'A broken comparator can crash TimSort',
        html: `<p>A comparator must be <b>consistent</b>: if a &lt; b and b &lt; c then a &lt; c, and compare(a,b) must be the opposite sign of compare(b,a). A "random" comparator (often used to shuffle!) or the overflowing <code>a - b</code> breaks this. With enough elements, TimSort detects the inconsistency and throws <code>IllegalArgumentException: Comparison method violates its general contract!</code> — in production, on some inputs only. Shuffle with <code>Collections.shuffle</code>, never with a random comparator.</p>`
      }
    ],
    deepDive: `<p><b>The comparator contract</b> (from the Javadoc): (1) <b>antisymmetry</b> sgn(compare(x,y)) == −sgn(compare(y,x)); (2) <b>transitivity</b> x &gt; y and y &gt; z ⇒ x &gt; z; (3) <b>consistency</b> compare(x,y) == 0 ⇒ x and y compare the same against every z. Violations do not always throw — often they just give a wrong order. Floating point is a classic trap: <code>(a, b) -&gt; (int)(a - b)</code> truncates 0.5 to 0 ("equal"), and NaN breaks every rule; use <code>Double.compare</code>, which defines a total order (−0.0 &lt; 0.0, NaN largest).</p>
      <p><b>Consistent with equals.</b> <code>TreeSet</code>/<code>TreeMap</code> use the comparator <b>instead of</b> <code>equals</code>. If your comparator returns 0 for two different students with the same marks, the TreeSet keeps only one of them — a silent data loss bug. Always add a final unique tie-breaker (id, name, index) for sorted collections.</p>
      <p><b>Building comparators.</b> <code>Comparator.comparing(keyFn)</code> boxes primitive keys; prefer <code>comparingInt/Long/Double</code>. <code>reversed()</code> reverses <b>everything built so far</b> in the chain: <code>comparing(A).thenComparing(B).reversed()</code> reverses both keys — put <code>reversed()</code> right after the key you want flipped, or use <code>thenComparing(B, Comparator.reverseOrder())</code>. <code>Comparator.nullsFirst(...)</code> handles nulls. <code>Comparable</code> (natural order, inside the class) vs <code>Comparator</code> (external rule card, many per class).</p>
      <p><b>Performance.</b> A comparison sort calls the comparator ~N log₂N times (2·10<sup>6</sup> calls for N = 10<sup>5</sup>). If the key is expensive (parsing a date, computing a distance) compute it <b>once</b> per item first and sort by the cached key ("decorate–sort–undecorate"). For primitives, sorting a <code>long[]</code> of packed keys (e.g. <code>(long) marks &lt;&lt; 32 | index</code>) avoids objects entirely and is often several times faster than <code>Integer[]</code> + lambda.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants write comparators instantly, so the remaining value is in <b>reviewing</b> them: spotting <code>a - b</code> on large values, a <code>reversed()</code> in the wrong place in a chain, a comparator that is inconsistent with equals inside a TreeSet, or a missing tie-breaker that makes output non-deterministic (flaky tests!).</p>
      <p><b>Use AI as a partner:</b> describe the business rule in English ("VIPs first, then by signup date, newest first, then by id") and ask for both the chained form and the if-chain form; then ask it to <code>generate property-based tests checking antisymmetry and transitivity on random inputs</code>. Read both versions and make sure they agree.</p>
      <p><b>Where AI goes wrong:</b> it loves <code>(a, b) -&gt; b - a</code> for "descending", <code>Arrays.sort(intArray, Collections.reverseOrder())</code> (does not compile for int[]), and <code>comparing(...).reversed().thenComparing(...).reversed()</code> soups. <b>What you must still own:</b> the meaning of negative/zero/positive, the contract, overflow safety, and turning a multi-key English requirement into a correct rule card.</p>`
  });
  // =====================================================================
  // TOPIC 6: Stable vs Unstable sorting
  // =====================================================================
  topics.push({
    title: 'Stable vs Unstable Sorting',
    analogy: `<p>A cinema queue is already ordered by <b>arrival time</b>. The manager now says: "VIP ticket holders first, then normal tickets." A <b>stable</b> manager moves VIPs to the front but keeps people <b>within each group in their arrival order</b>. An <b>unstable</b> manager might shuffle two VIPs who came at different times — still "sorted by ticket type", but the earlier arrival lost their place. Nobody likes that manager.</p>`,
    explain: `<p>A sort is <b>stable</b> if items with <b>equal keys</b> stay in the <b>same relative order</b> as in the input. It only matters when equal-key items can be told apart (records, pairs, objects), never for plain ints.</p>
      <h4>Example: sort cards by number only</h4>
      ${H.arr(['5♥', '3♠', '5♠', '1♦'], { label: 'input' })}
      ${H.arr(['1♦', '3♠', '5♥', '5♠'], { label: 'stable', hl: { 2: 'g', 3: 'g' } })}
      ${H.arr(['1♦', '3♠', '5♠', '5♥'], { label: 'unstable (allowed)', hl: { 2: 'r', 3: 'r' } })}
      <p>Both outputs are sorted by number. Only the stable one promises that 5♥ (which came first) stays before 5♠.</p>
      <h4>How selection sort breaks stability</h4>
      ${H.table(['step', 'array', 'what happened'], [
        ['start', '5<sub>a</sub> 5<sub>b</sub> 2', 'two equal 5s, a before b'],
        ['i = 0', '2 5<sub>b</sub> <span class="c-r">5<sub>a</sub></span>', 'min is 2 → swap with a[0]: 5<sub>a</sub> jumps over 5<sub>b</sub>!'],
        ['i = 1', '2 <span class="c-r">5<sub>b</sub> 5<sub>a</sub></span>', 'sorted, but the two 5s have swapped order → unstable']
      ])}
      <p>Long-distance swaps are the usual culprit. Algorithms that only move an item past <b>strictly bigger</b> neighbours (insertion, bubble) or take the <b>left</b> one on ties (merge) are stable.</p>
      ${H.table(['algorithm', 'stable?', 'why'], [
        ['Bubble sort', '<span class="c-g">yes</span>', 'swaps only when a[j] &gt; a[j+1] (never equal ones)'],
        ['Insertion sort', '<span class="c-g">yes</span>', 'shifts only strictly bigger items'],
        ['Merge sort', '<span class="c-g">yes</span>', 'on a tie takes from the left half (<code>&lt;=</code>)'],
        ['Count sort (prefix version)', '<span class="c-g">yes</span>', 'places items right-to-left into their last free slot'],
        ['Radix sort', '<span class="c-g">yes</span>', 'needs a stable pass per digit — that is how it works at all'],
        ['Selection sort', '<span class="c-r">no</span>', 'long swap of the minimum'],
        ['Quick sort', '<span class="c-r">no</span>', 'partition swaps items across far distances'],
        ['Heap sort', '<span class="c-r">no</span>', 'heap moves items up/down the tree']
      ])}
      <p><b>In the libraries:</b> Java's <code>Arrays.sort(Object[])</code>, <code>Collections.sort</code> and <code>List.sort</code> use TimSort → <b>stable</b>; <code>Arrays.sort(int[])</code> is quick-sort based (not stable), but for primitives nobody can tell. Python's <code>sorted</code> / <code>list.sort</code> and JavaScript's <code>Array.prototype.sort</code> are stable. C++ <code>std::sort</code> is <b>not</b> stable; use <code>std::stable_sort</code>. <b>Making any sort stable:</b> add the original index as a final tie-breaker key.</p>
      <p><b>Why it matters — sorting by two keys in two passes:</b> sort by the <b>secondary</b> key first, then <b>stable-sort</b> by the primary key. Ties on the primary key keep the secondary order. (That is exactly how radix sort works digit by digit.)</p>`,
    clues: [
      '"If two items are equal, keep them in their <b>original order</b>" / "in the order they appear in input" → stable sort required.',
      '"Sort by key A; for ties, keep input order" → a stable library sort (Java object sort, Python <code>sorted</code>, JS <code>sort</code>, C++ <code>stable_sort</code>) or add the index as a tie-breaker.',
      '"Sort by multiple keys" done as several passes → each pass after the first must be <b>stable</b>.',
      '"Which of these sorts is stable?" theory question → bubble, insertion, merge, counting, radix: yes; selection, quick, heap: no.',
      'Radix sort or "sort by digits/characters from the right" → the inner sort must be stable.'
    ],
    code: { lang: 'java', code: `
      // Make ANY sort stable: break ties by the original index.
      class Item {
          int key; String tag; int idx;
          Item(int k, String t, int i) { key = k; tag = t; idx = i; }
      }

      class StableDemo {
          public static void main(String[] args) {
              String[] tags = {"5H", "3S", "5S", "1D"};
              int[] keys = {5, 3, 5, 1};
              Item[] items = new Item[keys.length];
              for (int i = 0; i < keys.length; i++) items[i] = new Item(keys[i], tags[i], i);

              // Primary: key ascending. Tie-breaker: original position.
              // (Arrays.sort on objects is already stable, but this trick also works
              //  for any unstable algorithm such as a hand-written quick sort.)
              Arrays.sort(items, (x, y) -> x.key != y.key ? Integer.compare(x.key, y.key)
                                                          : Integer.compare(x.idx, y.idx));
              for (Item it : items) System.out.print(it.tag + " "); // 1D 3S 5H 5S
          }
      }`,
      alt: [
        { lang: 'python', run: true, code: `# Make ANY sort stable: break ties by the original index.
tags = ["5H", "3S", "5S", "1D"]
keys = [5, 3, 5, 1]
items = [(k, i, t) for i, (k, t) in enumerate(zip(keys, tags))]   # (key, original index, tag)

# Python's sort is already stable; the index tie-breaker makes even an
# unstable algorithm (e.g. a hand-written quick sort) give the same order.
items.sort(key=lambda it: (it[0], it[1]))
print(" ".join(t for _, _, t in items))   # 1D 3S 5H 5S` },
        { lang: 'js', run: true, code: `// Make ANY sort stable: break ties by the original index.
const tags = ['5H', '3S', '5S', '1D'];
const keys = [5, 3, 5, 1];
const items = keys.map((key, idx) => ({ key, tag: tags[idx], idx }));

// Array.prototype.sort is stable since ES2019; the idx tie-breaker also works
// for any unstable algorithm such as a hand-written quick sort.
items.sort((x, y) => x.key - y.key || x.idx - y.idx);
console.log(items.map((it) => it.tag).join(' '));   // 1D 3S 5H 5S` },
        { lang: 'cpp', code: `// Make ANY sort stable: break ties by the original index.
struct Item { int key; string tag; int idx; };

int main() {
    vector<string> tags = {"5H", "3S", "5S", "1D"};
    vector<int> keys = {5, 3, 5, 1};
    vector<Item> items;
    for (int i = 0; i < (int)keys.size(); i++) items.push_back({keys[i], tags[i], i});

    // std::sort is NOT stable, but with the index as the last key no two items tie.
    // (std::stable_sort on the key alone gives the same result.)
    sort(items.begin(), items.end(), [](const Item& x, const Item& y) {
        return tie(x.key, x.idx) < tie(y.key, y.idx);
    });
    for (const auto& it : items) cout << it.tag << ' ';   // 1D 3S 5H 5S
}` }, { lang: 'csharp', code: String.raw`
using System;

// Make ANY sort stable: break ties by the original index.
class Item {
    public int Key; public string Tag; public int Idx;
    public Item(int k, string t, int i) { Key = k; Tag = t; Idx = i; }
}

class StableDemo {
    static void Main() {
        string[] tags = { "5H", "3S", "5S", "1D" };
        int[] keys = { 5, 3, 5, 1 };
        Item[] items = new Item[keys.Length];
        for (int i = 0; i < keys.Length; i++) items[i] = new Item(keys[i], tags[i], i);

        // Primary: key ascending. Tie-breaker: original position.
        // (Array.Sort is NOT stable in C#, so this trick matters; LINQ OrderBy is the stable alternative.)
        Array.Sort(items, (x, y) => x.Key != y.Key ? x.Key.CompareTo(y.Key) : x.Idx.CompareTo(y.Idx));
        foreach (Item it in items) Console.Write(it.Tag + " "); // 1D 3S 5H 5S
        Console.WriteLine();
    }
}`, run: true }
      ] },
    codeTitle: 'Stability by tie-breaking on the original index'
  });

  // ---------- TOPIC 6 extras ----------
  Object.assign(topics[topics.length - 1], {
    viz: {
      title: 'Stable vs unstable: selection sort vs insertion sort on cards',
      input: '5H 5S 3D 1C 3S',
      inputLabel: 'Cards as number+suit (H S D C), e.g. 5H 5S 3D 1C — 3 to 8 cards, numbers 1..9',
      gen: function (input) {
        var s = String(input === undefined || input === null ? '' : input).trim();
        if (!s) throw new Error('Type cards like 5H 5S 3D 1C');
        var SU = { H: '♥', S: '♠', D: '♦', C: '♣' };
        var toks = s.toUpperCase().split(/[\s,]+/), cards = [];
        for (var t = 0; t < toks.length; t++) {
          var mm = /^([1-9])([HSDC])$/.exec(toks[t]);
          if (!mm) throw new Error('Each card must be a digit 1-9 followed by H, S, D or C, e.g. 5H');
          cards.push({ k: +mm[1], s: SU[mm[2]], o: t });
        }
        if (cards.length < 3 || cards.length > 8) throw new Error('Please use between 3 and 8 cards.');
        function lab(c) { return c.k + c.s; }
        function view(arr) { return arr.map(lab); }
        function tieCheck(arr) {
          var rows = [], bad = false;
          for (var i = 0; i < arr.length; i++) for (var j = i + 1; j < arr.length; j++) {
            if (arr[i].k === arr[j].k) {
              var ok = arr[i].o < arr[j].o; if (!ok) bad = true;
              rows.push([lab(arr[i]) + ' before ' + lab(arr[j]), ok ? 'same as input' : 'FLIPPED']);
            }
          }
          return { rows: rows, bad: bad };
        }
        var frames = [];
        var orig = cards.slice();
        frames.push({ narr: 'We sort these cards by <b>number only</b> (suits are just labels). Small numbers under each card show the input order. Cards with the same number are the ones to watch.', parts: [
          { type: 'array', label: 'input', values: view(orig), idxLabels: orig.map(function (c) { return '#' + c.o; }) }
        ] });
        // --- selection sort (unstable) ---
        var A = cards.slice();
        for (var i = 0; i < A.length - 1; i++) {
          var m = i;
          for (var j = i + 1; j < A.length; j++) if (A[j].k < A[m].k) m = j;
          var jumped = [];
          for (var q = i + 1; q < m; q++) if (A[q].k === A[i].k) jumped.push(lab(A[q]));
          var before = A[i];
          if (m !== i) { var tmp = A[i]; A[i] = A[m]; A[m] = tmp; }
          var h = {}; for (var z = 0; z < i; z++) h[z] = 'done'; h[i] = 'ok'; if (m !== i) h[m] = jumped.length ? 'bad' : 'cur';
          frames.push({ narr: 'Selection sort, position ' + i + ': smallest number is ' + lab(A[i]) + '. ' + (m === i ? 'Already in place, no swap.' : 'Swap it with ' + lab(before) + ' (long-distance jump to index ' + m + ').') + (jumped.length ? ' <span class="c-r">' + lab(before) + ' just jumped over ' + jumped.join(', ') + ' which has the same number → their order flipped!</span>' : ''), parts: [
            { type: 'array', label: 'selection sort', values: view(A), hl: h, idxLabels: A.map(function (c) { return '#' + c.o; }) }
          ] });
        }
        var selCheck = tieCheck(A);
        frames.push({ narr: 'Selection sort finished. Check every pair of equal numbers: ' + (selCheck.bad ? '<span class="c-r">at least one pair is flipped compared to the input → this run was UNSTABLE.</span>' : 'all happen to be in input order this time — but selection sort gives <b>no guarantee</b> (try 5H 5S 3D 1C).'), parts: [
          { type: 'array', label: 'selection sort result', values: view(A), idxLabels: A.map(function (c) { return '#' + c.o; }) },
          { type: 'table', label: 'equal-number pairs', columns: ['pair', 'order'], rows: selCheck.rows.length ? selCheck.rows : [['(no equal numbers)', '—']], hl: (function () { var hh = {}; selCheck.rows.forEach(function (r, k) { hh[k] = r[1] === 'FLIPPED' ? 'bad' : 'ok'; }); return hh; })() }
        ] });
        // --- insertion sort (stable) ---
        var B = orig.slice();
        for (i = 1; i < B.length; i++) {
          var key = B[i]; j = i - 1;
          var stoppedOnEqual = false;
          while (j >= 0 && B[j].k > key.k) { B[j + 1] = B[j]; j--; }
          if (j >= 0 && B[j].k === key.k) stoppedOnEqual = true;
          B[j + 1] = key;
          var hb = {}; for (z = 0; z <= i; z++) hb[z] = 'win'; hb[j + 1] = 'ok';
          frames.push({ narr: 'Insertion sort: place ' + lab(key) + '. It slides left only past <b>strictly bigger</b> numbers' + (stoppedOnEqual ? ' and <span class="c-g">stops behind ' + lab(B[j]) + ' (same number, arrived earlier)</span> — that is what keeps it stable.' : '.'), parts: [
            { type: 'array', label: 'insertion sort', values: view(B), hl: hb, idxLabels: B.map(function (c) { return '#' + c.o; }) }
          ] });
        }
        var insCheck = tieCheck(B);
        frames.push({ narr: 'Insertion sort finished: every pair of equal numbers is still in input order — <span class="c-g">STABLE, guaranteed</span>. Both results are "sorted by number"; only stability decides which equal card comes first.', parts: [
          { type: 'array', label: 'selection (unstable)', values: view(A), idxLabels: A.map(function (c) { return '#' + c.o; }) },
          { type: 'array', label: 'insertion (stable)', values: view(B), idxLabels: B.map(function (c) { return '#' + c.o; }), hl: (function () { var hh = {}; for (var k = 0; k < B.length; k++) hh[k] = 'ok'; return hh; })() },
          { type: 'table', label: 'equal-number pairs (insertion)', columns: ['pair', 'order'], rows: insCheck.rows.length ? insCheck.rows : [['(no equal numbers)', '—']] }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Two keys in two passes (the stable-sort trick)',
        html: `<p>Employees (Ravi, HR) (Anu, IT) (Zoe, HR) (Bob, IT). Goal: by department, and inside a department by name.</p>
          ${H.table(['pass', 'sort by', 'result'], [
            ['1', 'name (secondary key)', 'Anu-IT, Bob-IT, Ravi-HR, Zoe-HR'],
            ['2', 'department, <b>stable</b>', '<span class="c-g">Ravi-HR, Zoe-HR, Anu-IT, Bob-IT</span>']
          ])}
          <p>Pass 2 sees Ravi and Zoe as equal (both HR) and, being stable, keeps them in pass-1 order (alphabetical). With an unstable pass 2, the names inside HR could come out in any order.</p>`
      },
      {
        title: 'Python and JavaScript sorts are stable too',
        html: `<p>Python's <code>sorted</code>/<code>list.sort</code> are guaranteed stable, and JavaScript's <code>Array.prototype.sort</code> has been required to be stable since ES2019. So "sort by department, keep the previous order inside each department" is a one-liner:</p>`,
        code: { lang: 'python', run: true, code: `records = [("asha", "IT"), ("ben", "HR"), ("cara", "IT"), ("dev", "HR")]
by_dept = sorted(records, key=lambda r: r[1])   # stable: asha stays before cara, ben before dev
print(by_dept)  # [('ben', 'HR'), ('dev', 'HR'), ('asha', 'IT'), ('cara', 'IT')]` }
      },
      {
        title: 'Making selection sort stable: shift instead of swap',
        html: `<p>The instability came from the long-distance <b>swap</b>. Instead, take the minimum out and <b>shift</b> the block a[i..m−1] one step right, then put the minimum at i. Nobody jumps over anybody → stable. Price: up to O(N) moves per step (still O(N<sup>2</sup>) overall, but more writes).</p>
          ${H.arr(['5♥', '5♠', '3♦', '1♣'], { label: 'before step 0' })}${H.arr(['1♣', '5♥', '5♠', '3♦'], { label: 'after step 0 (shifted)', hl: { 0: 'g', 1: 'b', 2: 'b' } })}`,
        code: { lang: 'java', code: `
          void stableSelectionSort(int[] key) {
              for (int i = 0; i < key.length - 1; i++) {
                  int m = i;
                  for (int j = i + 1; j < key.length; j++) if (key[j] < key[m]) m = j;
                  int min = key[m];
                  for (int j = m; j > i; j--) key[j] = key[j - 1];   // shift, do not swap
                  key[i] = min;
              }
          }`,
          alt: [
            { lang: 'python', code: `def stable_selection_sort(key):
    for i in range(len(key) - 1):
        m = min(range(i, len(key)), key=key.__getitem__)   # first smallest
        key.insert(i, key.pop(m))        # take it out and shift the block right: no jump-over` },
            { lang: 'js', code: `function stableSelectionSort(key) {
  for (let i = 0; i < key.length - 1; i++) {
    let m = i;
    for (let j = i + 1; j < key.length; j++) if (key[j] < key[m]) m = j;
    const min = key[m];
    for (let j = m; j > i; j--) key[j] = key[j - 1];   // shift, do not swap
    key[i] = min;
  }
}` },
            { lang: 'cpp', code: `void stableSelectionSort(vector<int>& key) {
    for (auto it = key.begin(); it != key.end(); ++it) {
        auto m = min_element(it, key.end());           // first smallest
        rotate(it, m, m + 1);                          // shift the block right, put min at it
    }
}` }, { lang: 'csharp', code: String.raw`
void StableSelectionSort(int[] key) {
    for (int i = 0; i < key.Length - 1; i++) {
        int m = i;
        for (int j = i + 1; j < key.Length; j++) if (key[j] < key[m]) m = j;
        int min = key[m];
        for (int j = m; j > i; j--) key[j] = key[j - 1];   // shift, do not swap
        key[i] = min;
    }
}` }
          ] }
      },
      {
        title: 'Which library calls are stable?',
        html: `${H.table(['call', 'stable?'], [
            ['<code>Arrays.sort(int[])</code>', 'not stable (dual-pivot quick sort) — invisible for primitives'],
            ['<code>Arrays.sort(T[], cmp)</code>, <code>List.sort</code>, <code>Collections.sort</code>', '<span class="c-g">guaranteed stable</span> (TimSort)'],
            ['<code>stream.sorted()</code> on an ordered stream', '<span class="c-g">stable</span>'],
            ['Python <code>sorted</code> / <code>list.sort</code>', '<span class="c-g">guaranteed stable</span>'],
            ['JavaScript <code>Array.prototype.sort</code>', '<span class="c-g">stable</span> (required since ES2019)'],
            ['C++ <code>std::sort</code> / <code>std::stable_sort</code>', 'no / yes']
          ])}
          <p>So sorting records by one key with Java's <code>list.sort</code>, Python's <code>sorted</code>, JavaScript's <code>sort</code> or C++ <code>std::stable_sort</code> is safe for "keep input order on ties". Plain C++ <code>std::sort</code> is not.</p>`
      }
    ],
    deepDive: `<p><b>Formal definition.</b> A sort is stable if for every i &lt; j with key(a[i]) == key(a[j]), a[i] appears before a[j] in the output. Equivalently: a stable sort by key k gives the same result as an unstable sort by the pair (k, original index). That is why "add the index as a final tie-breaker" turns any sort stable — at the cost of storing N indices.</p>
      <p><b>Why use unstable sorts at all?</b> Quick sort and heap sort are <b>in place</b>; merge sort, the classic stable O(N log N) algorithm, needs O(N) extra memory. Stable <b>and</b> in-place O(N log N) sorts exist (block merge sorts such as WikiSort/GrailSort) but they are complicated and have larger constants, so libraries choose: primitives → fast unstable in-place sort (stability is invisible), objects → TimSort (stable, extra memory). This is exactly Java's split.</p>
      <p><b>Production reality.</b> (1) <b>Pagination bugs:</b> <code>ORDER BY created_at</code> with many equal timestamps gives a non-deterministic order across queries, so rows appear on two pages or on none. Fix: add a unique tie-breaker (<code>ORDER BY created_at, id</code>). (2) <b>UI tables</b> where users click "sort by column A" then "column B" rely on stability to keep the A-order within equal B values. (3) <b>LSD radix sort</b> is literally "stable sort by digit, repeated" — without stability it is wrong. (4) Flaky tests often come from code that sorts by a non-unique key and asserts an exact order.</p>
      <p><b>Edge cases.</b> Stability is about equal <i>keys</i>, so it depends on the comparator: a comparator returning 0 for "same department" defines the ties. A comparator that never returns 0 (unique key) makes stability irrelevant.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-generated code frequently sorts by a non-unique key and assumes a fixed order (in SQL, in tests, in UIs). Recognising "this needs a stable sort or a tie-breaker" is a review skill that matters more now that more code is generated than hand-written.</p>
      <p><b>Use AI as a partner:</b> <code>List every place in this module where we sort, and tell me whether ties are possible and whether the result order matters</code>, or <code>Write a test that fails if this sort is not stable</code> (shuffle equal keys with distinct tags and assert their order). Ask it to explain why selection sort is unstable using a 3-element example, then check the example yourself.</p>
      <p><b>Where AI goes wrong:</b> claiming <code>Arrays.sort(int[])</code> "is stable" (meaningless for primitives) or that quick sort can be made stable "by using &lt;=" (it cannot — partition swaps across the array), and forgetting tie-breakers in <code>ORDER BY</code> for paginated APIs. <b>What you must still own:</b> the definition, the stable/unstable list with reasons, and the two-pass multi-key trick.</p>`,
    problems: [
      {
        title: 'Reorder Data in Log Files (stable custom sort)',
        level: 'Medium',
        tags: ['custom comparator', 'stable sort', 'strings'],
        companies: ['Amazon'],
        statement: `<p>Each log is a string: an <b>identifier</b>, a space, then words. In a <b>letter-log</b> the words are lowercase letters; in a <b>digit-log</b> they are digits. Reorder so that: (1) all letter-logs come before all digit-logs; (2) letter-logs are sorted by their content, and if contents tie, by identifier; (3) digit-logs <b>keep their original relative order</b>.</p>`,
        constraints: `1 ≤ logs.length ≤ 100, 3 ≤ logs[i].length ≤ 100, every log has at least one word after the identifier`,
        example: `<p>Input: ["dig1 8 1 5 1", "let1 art can", "dig2 3 6", "let2 own kit dig", "let3 art zero"]</p>
          <p>Output: [${H.c('g', '"let1 art can"')}, ${H.c('g', '"let3 art zero"')}, ${H.c('g', '"let2 own kit dig"')}, ${H.c('b', '"dig1 8 1 5 1"')}, ${H.c('b', '"dig2 3 6"')}]</p>
          <p>Why: letter-logs sorted by content ("art can" &lt; "art zero" &lt; "own kit dig"); digit-logs stay in input order (dig1 came before dig2) — that last rule is a <b>stability</b> requirement.</p>`,
        brute: {
          why: `<p>Split into two lists, bubble-sort the letter-logs with hand-written string comparisons, then append the digit-logs. Correct, but O(N<sup>2</sup>·L) and lots of fiddly code. The waste: every mainstream language already has a stable O(N log N) sort — we only need to describe the rule.</p>`,
          code: { lang: 'java', code: `
            String[] brute(String[] logs) {
                List<String> let = new ArrayList<>(), dig = new ArrayList<>();
                for (String s : logs) {
                    if (Character.isDigit(s.charAt(s.indexOf(' ') + 1))) dig.add(s); else let.add(s);
                }
                for (int i = 0; i < let.size(); i++)                       // bubble sort letter-logs
                    for (int j = 0; j + 1 < let.size() - i; j++) {
                        String a = let.get(j), b = let.get(j + 1);
                        String ca = a.substring(a.indexOf(' ') + 1), cb = b.substring(b.indexOf(' ') + 1);
                        int c = ca.compareTo(cb);
                        if (c == 0) c = a.substring(0, a.indexOf(' ')).compareTo(b.substring(0, b.indexOf(' ')));
                        if (c > 0) { let.set(j, b); let.set(j + 1, a); }
                    }
                let.addAll(dig);                                          // digit-logs in original order
                return let.toArray(new String[0]);
            }`, alt: [{ lang: 'python', code: String.raw`
def reorder_log_files(logs):
    let, dig = [], []
    for s in logs:
        if s[s.index(' ') + 1].isdigit():
            dig.append(s)
        else:
            let.append(s)
    for i in range(len(let)):                          # bubble sort letter-logs
        for j in range(len(let) - 1 - i):
            a, b = let[j], let[j + 1]
            ca, cb = a[a.index(' ') + 1:], b[b.index(' ') + 1:]
            if ca == cb:
                ca, cb = a[:a.index(' ')], b[:b.index(' ')]
            if ca > cb:
                let[j], let[j + 1] = b, a
    return let + dig                                   # digit-logs in original order` }, { lang: 'js', code: String.raw`
function reorderLogFiles(logs) {
  const let_ = [], dig = [];
  for (const s of logs) {
    if (/\d/.test(s[s.indexOf(' ') + 1])) dig.push(s); else let_.push(s);
  }
  for (let i = 0; i < let_.length; i++)                // bubble sort letter-logs
    for (let j = 0; j + 1 < let_.length - i; j++) {
      const a = let_[j], b = let_[j + 1];
      let ca = a.slice(a.indexOf(' ') + 1), cb = b.slice(b.indexOf(' ') + 1);
      if (ca === cb) { ca = a.slice(0, a.indexOf(' ')); cb = b.slice(0, b.indexOf(' ')); }
      if (ca > cb) { let_[j] = b; let_[j + 1] = a; }
    }
  return let_.concat(dig);                             // digit-logs in original order
}` }, { lang: 'cpp', code: String.raw`
vector<string> reorderLogFiles(vector<string> logs) {
    vector<string> let, dig;
    for (const string& s : logs) {
        if (isdigit((unsigned char) s[s.find(' ') + 1])) dig.push_back(s); else let.push_back(s);
    }
    for (int i = 0; i < (int) let.size(); i++)             // bubble sort letter-logs
        for (int j = 0; j + 1 < (int) let.size() - i; j++) {
            string a = let[j], b = let[j + 1];
            string ca = a.substr(a.find(' ') + 1), cb = b.substr(b.find(' ') + 1);
            if (ca == cb) { ca = a.substr(0, a.find(' ')); cb = b.substr(0, b.find(' ')); }
            if (ca > cb) { let[j] = b; let[j + 1] = a; }
        }
    let.insert(let.end(), dig.begin(), dig.end());         // digit-logs in original order
    return let;
}` }, { lang: 'csharp', code: String.raw`
using System.Collections.Generic;

public class Solution {
    public string[] ReorderLogFiles(string[] logs) {
        var let = new List<string>();
        var dig = new List<string>();
        foreach (string s in logs) {
            if (char.IsDigit(s[s.IndexOf(' ') + 1])) dig.Add(s); else let.Add(s);
        }
        for (int i = 0; i < let.Count; i++)                        // bubble sort letter-logs
            for (int j = 0; j + 1 < let.Count - i; j++) {
                string a = let[j], b = let[j + 1];
                string ca = a.Substring(a.IndexOf(' ') + 1), cb = b.Substring(b.IndexOf(' ') + 1);
                int c = string.CompareOrdinal(ca, cb);
                if (c == 0) c = string.CompareOrdinal(a.Substring(0, a.IndexOf(' ')), b.Substring(0, b.IndexOf(' ')));
                if (c > 0) { let[j] = b; let[j + 1] = a; }
            }
        let.AddRange(dig);                                         // digit-logs in original order
        return let.ToArray();
    }
}` }] }
        },
        mcq: {
          q: 'Your comparator returns 0 for any two digit-logs. Why does that keep them in their original order?',
          options: ['Because 0 means "sort by identifier"', 'Because the library sort is stable (Java object sort, Python sorted, JS sort, C++ stable_sort): ties keep input order', 'It does not — you must sort digit-logs by index explicitly', 'Because digit-logs are always already sorted'],
          answer: 1,
          explain: 'Java Arrays.sort(Object[], Comparator) uses TimSort, which is guaranteed stable, and so are Python sorted and JavaScript Array.prototype.sort. (C++ std::sort is not: use std::stable_sort.) A comparator result of 0 means "tie", and a stable sort never reorders ties.'
        },
        hints: [
          `<p><b>Aha:</b> rule 3 ("digit-logs keep their order") is just <b>stability</b>. If the comparator says "two digit-logs are equal", a stable sort leaves them alone.</p>`,
          `<p>Write one comparator: find the first space; look at the next character to decide letter vs digit. Letter vs letter → compare contents, then identifiers. Letter vs digit → letter first (−1). Digit vs letter → +1. Digit vs digit → 0. Use <code>Arrays.sort(logs, cmp)</code> (stable TimSort).</p>`,
          `<p>Traps: identifiers can contain digits ("let1") — only the first character <b>after the space</b> tells the type; tie on content must fall back to the identifier; do not use an unstable hand-written quick sort. Recipe: split at first space → classify → 4 cases → return.</p>`
        ],
        tests: { sig: 'string[] -> string[]', fn: 'reorderLogFiles', cases: [
          [[['dig1 8 1 5 1', 'let1 art can', 'dig2 3 6', 'let2 own kit dig', 'let3 art zero']], ['let1 art can', 'let3 art zero', 'let2 own kit dig', 'dig1 8 1 5 1', 'dig2 3 6']],
          [[['a1 9 2 3 1', 'g1 act car', 'zo4 4 7', 'ab1 off key dog', 'a8 act zoo']], ['g1 act car', 'a8 act zoo', 'ab1 off key dog', 'a1 9 2 3 1', 'zo4 4 7']],
          [[['x 1']], ['x 1']],
          [[['b art', 'a art', 'c 1']], ['a art', 'b art', 'c 1']],
          [[['d2 5', 'd1 3', 'd3 0']], ['d2 5', 'd1 3', 'd3 0']],
          [[['dig1 8', 'let1 abc']], ['let1 abc', 'dig1 8']],
          [[['let2 a', 'let10 a', 'x9 b a']], ['let10 a', 'let2 a', 'x9 b a']]
        ] },
        solution: {
          approach: `<p>One comparator encoding rules 1 and 2; rule 3 comes for free from the stability of the library sort (Java's TimSort, Python's <code>sorted</code>, JavaScript's <code>Array.prototype.sort</code>, C++ <code>std::stable_sort</code>).</p>`,
          code: `
            class Solution {
                public String[] reorderLogFiles(String[] logs) {
                    Arrays.sort(logs, (a, b) -> {
                        int sa = a.indexOf(' '), sb = b.indexOf(' ');
                        boolean da = Character.isDigit(a.charAt(sa + 1));   // is a a digit-log?
                        boolean db = Character.isDigit(b.charAt(sb + 1));
                        if (!da && !db) {                                     // both letter-logs
                            int c = a.substring(sa + 1).compareTo(b.substring(sb + 1)); // by content
                            if (c != 0) return c;
                            return a.substring(0, sa).compareTo(b.substring(0, sb));   // then identifier
                        }
                        if (!da) return -1;                                   // letter before digit
                        if (!db) return 1;                                    // digit after letter
                        return 0;                                             // both digit: tie → stable keeps input order
                    });
                    return logs;
                }

                public static void main(String[] args) {
                    String[] logs = {"dig1 8 1 5 1", "let1 art can", "dig2 3 6", "let2 own kit dig", "let3 art zero"};
                    System.out.println(Arrays.toString(new Solution().reorderLogFiles(logs)));
                    // [let1 art can, let3 art zero, let2 own kit dig, dig1 8 1 5 1, dig2 3 6]
                }
            }`,
          alt: [
            { lang: 'python', code: `def reorder_log_files(logs):
    def key(log):
        ident, rest = log.split(" ", 1)
        if rest[0].isdigit():
            return (1,)                  # all digit-logs tie -> stable sort keeps input order
        return (0, rest, ident)          # letter-logs: by content, then identifier
    return sorted(logs, key=key)` },
            { lang: 'js', code: `function reorderLogFiles(logs) {
  const split = (s) => { const i = s.indexOf(' '); return [s.slice(0, i), s.slice(i + 1)]; };
  const isDigit = (c) => c >= '0' && c <= '9';
  // Array.prototype.sort is stable (ES2019+), so tied digit-logs keep input order
  return logs.slice().sort((a, b) => {
    const [ia, ra] = split(a), [ib, rb] = split(b);
    const da = isDigit(ra[0]), db = isDigit(rb[0]);
    if (!da && !db) {
      if (ra !== rb) return ra < rb ? -1 : 1;       // by content
      return ia < ib ? -1 : ia > ib ? 1 : 0;        // then identifier
    }
    if (!da) return -1;                             // letter before digit
    if (!db) return 1;
    return 0;                                       // both digit: tie
  });
}` },
            { lang: 'cpp', code: `class Solution {
public:
    vector<string> reorderLogFiles(vector<string> logs) {
        // std::sort is NOT stable; stable_sort keeps tied digit-logs in input order
        stable_sort(logs.begin(), logs.end(), [](const string& a, const string& b) {
            size_t sa = a.find(' '), sb = b.find(' ');
            bool da = isdigit((unsigned char)a[sa + 1]), db = isdigit((unsigned char)b[sb + 1]);
            if (!da && !db) {
                int c = a.compare(sa + 1, string::npos, b, sb + 1, string::npos);   // by content
                if (c != 0) return c < 0;
                return a.substr(0, sa) < b.substr(0, sb);                         // then identifier
            }
            return !da && db;                    // letter before digit; digit vs digit is a tie
        });
        return logs;
    }
};` }, { lang: 'csharp', code: String.raw`
using System;
using System.Collections.Generic;
using System.Linq;

public class Solution {
    public string[] ReorderLogFiles(string[] logs) {
        // Array.Sort is NOT stable; LINQ OrderBy is, so tied digit-logs keep their input order.
        return logs.OrderBy(x => x, Comparer<string>.Create((a, b) => {
            int sa = a.IndexOf(' '), sb = b.IndexOf(' ');
            bool da = char.IsDigit(a[sa + 1]);                            // is a a digit-log?
            bool db = char.IsDigit(b[sb + 1]);
            if (!da && !db) {                                             // both letter-logs
                int c = string.CompareOrdinal(a.Substring(sa + 1), b.Substring(sb + 1)); // by content
                if (c != 0) return c;
                return string.CompareOrdinal(a.Substring(0, sa), b.Substring(0, sb));   // then identifier
            }
            if (!da) return -1;                                           // letter before digit
            if (!db) return 1;                                            // digit after letter
            return 0;                                                     // both digit: tie -> stable keeps input order
        })).ToArray();
    }
}` }
          ],
          dry: {
            head: ['compare(a, b)', 'types', 'rule used', 'result'],
            rows: [
              ['dig1 … vs let1 …', 'digit, letter', 'digit after letter', '+1 → let1 first'],
              ['let1 "art can" vs let3 "art zero"', 'letter, letter', 'content: "art can" &lt; "art zero"', '−1 → let1 first'],
              ['let3 "art zero" vs let2 "own kit dig"', 'letter, letter', 'content: "a" &lt; "o"', '−1 → let3 first'],
              ['dig1 vs dig2', 'digit, digit', 'tie', '0 → <span class="c-g">stable: dig1 stays first</span>'],
              ['final', '', '', '<span class="c-p">let1, let3, let2, dig1, dig2</span>']
            ]
          },
          complexity: `<p><b>Time O(N log N · L)</b>: about N log N comparisons, each may build/compare substrings of length up to L = 100. <b>Space O(N · L)</b> worst case for TimSort's buffer and the temporary substrings (precomputing the split per log reduces garbage).</p>`,
          followUps: ['Avoid substring allocations inside the comparator (compare with regionMatches or precompute keys).', 'What if digit-logs had to be sorted by their numbers instead?', 'Do it in Python with a key function returning a tuple.']
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 7: Merging Overlapping Intervals
  // =====================================================================
  topics.push({
    title: 'Merging Overlapping Intervals',
    analogy: `<p>Your calendar has meetings: 9–11, 10–12, 2–3, 2:30–4. You want to tell a friend <b>"when am I busy?"</b> First you lay the meetings out <b>in order of start time</b>. Then you walk through them: if the next meeting starts <b>before the current busy block ends</b>, it just stretches that block; otherwise a new busy block begins. Answer: busy 9–12 and 2–4.</p>`,
    explain: `<p>An interval <code>[s, e]</code> is a stretch from s to e. Two intervals <b>overlap</b> when the later one starts <b>no later than</b> the earlier one ends.</p>
      <h4>Step 1: sort by start</h4>
      <p>After sorting, any interval that could overlap the current block must come <b>right after it</b> — we never need to look back. This is the whole trick, and it is why sorting costs O(N log N) but the rest is a single O(N) sweep.</p>
      <h4>Step 2: sweep and extend</h4>
      ${H.table(['current', 'last merged block', 'start ≤ last end?', 'action', 'result'], [
        ['[1,3]', '—', '—', 'start a block', '[1,3]'],
        ['[2,6]', '[1,3]', '2 ≤ 3 <span class="c-g">yes</span>', 'end = max(3, 6) = 6', '[1,<span class="c-g">6</span>]'],
        ['[8,10]', '[1,6]', '8 ≤ 6 <span class="c-r">no</span>', 'start new block', '[1,6] [8,10]'],
        ['[9,12]', '[8,10]', '9 ≤ 10 <span class="c-g">yes</span>', 'end = max(10, 12) = 12', '[1,6] [8,<span class="c-g">12</span>]'],
        ['[15,18]', '[8,12]', '15 ≤ 12 <span class="c-r">no</span>', 'start new block', '[1,6] [8,12] [15,18]']
      ])}
      <h4>Watch out for "swallowed" intervals</h4>
      <p>[1,10] followed by [2,5]: the end must stay 10, not become 5. That is why we use <code>end = max(end, cur.end)</code>, not <code>end = cur.end</code>.</p>
      <h4>Touching intervals</h4>
      <p>Do [1,4] and [4,5] overlap? In most problems (LeetCode "Merge Intervals") <b>yes</b> → use <code>start ≤ end</code>. For meetings, a meeting ending at 4 and one starting at 4 do <b>not</b> clash → use <code>start &lt; end</code>. Read the statement carefully!</p>
      <h4>The family of interval problems</h4>
      ${H.table(['problem', 'sort by', 'idea'], [
        ['Merge intervals', 'start', 'extend the last block or start a new one'],
        ['Insert interval (list already sorted)', '—', 'copy the ones before, merge the overlapping ones, copy the rest'],
        ['Can attend all meetings?', 'start', 'any next.start &lt; prev.end → clash'],
        ['Minimum meeting rooms', 'start (+ min-heap of ends)', 'reuse a room whose meeting ended earliest'],
        ['Remove fewest intervals to make no overlap', 'end', 'greedy: keep the one that finishes first']
      ])}`,
    clues: [
      '"<b>Merge</b> all overlapping intervals" / "union of ranges" / "total covered length" → sort by start + sweep.',
      '"Meetings / bookings / time slots / ranges [start, end]" in the input → almost always sort the intervals first.',
      '"Can a person attend all meetings?" → sort by start, check neighbours.',
      '"Minimum number of rooms / platforms / CPUs at the same time" → sort by start + min-heap of end times (or sort starts and ends separately).',
      '"Insert a new interval into a sorted, non-overlapping list" → three phases: before, overlap, after (O(N), no sort needed).',
      'N ≤ 10<sup>5</sup> intervals → O(N log N) sort is fine; comparing every pair (O(N<sup>2</sup>)) is not.'
    ],
    viz: {
      title: 'Merge intervals: sort by start, then sweep',
      input: '8-10 1-3 15-18 2-6 9-12',
      inputLabel: 'Intervals as start-end (e.g. 1-3 2-6), ends ≤ 30, up to 8',
      gen: function (input) {
        var s = String(input === undefined || input === null ? '' : input).trim();
        if (!s) throw new Error('Type intervals like 1-3 2-6 8-10 (start-end, separated by spaces)');
        var toks = s.split(/[\s,]+/), iv = [];
        for (var t = 0; t < toks.length; t++) {
          var m = /^(\d+)-(\d+)$/.exec(toks[t]);
          if (!m) throw new Error('Each interval must look like start-end, e.g. 1-3 2-6 8-10');
          var st = +m[1], en = +m[2];
          if (st > en) throw new Error('In ' + toks[t] + ' the start is bigger than the end.');
          if (en > 30) throw new Error('Please keep the ends at 30 or less so the timeline fits.');
          iv.push([st, en]);
        }
        if (iv.length < 2) throw new Error('Enter at least 2 intervals, e.g. 1-3 2-6');
        if (iv.length > 8) throw new Error('Please use at most 8 intervals.');
        var maxE = 0; iv.forEach(function (x) { if (x[1] > maxE) maxE = x[1]; });
        var col = []; for (var c = 0; c <= maxE; c++) col.push(String(c));
        function label(x) { return '[' + x[0] + ',' + x[1] + ']'; }
        function timeline(list, rowNames, hlRow, cls, extra) {
          var rows = [], hl = {};
          list.forEach(function (x, r) {
            var row = [];
            for (var c2 = 0; c2 <= maxE; c2++) {
              var on = c2 >= x[0] && c2 <= x[1];
              row.push(on ? '■' : '');
              if (on) hl[r + ',' + c2] = r === hlRow ? cls : (extra && extra[r] ? extra[r] : 'win');
            }
            rows.push(row);
          });
          return { type: 'grid', label: 'timeline', rows: rows, rowHead: rowNames, colHead: col, hl: hl };
        }
        var frames = [];
        frames.push({ narr: 'Here are the intervals in the order given. They are jumbled, so an overlapping pair could be far apart in the list. First job: <b>sort by start</b>.', parts: [
          { type: 'array', label: 'input', values: iv.map(label) },
          timeline(iv, iv.map(label), -1, 'cur')
        ] });
        var sorted = iv.slice().sort(function (x, y) { return x[0] - y[0] || x[1] - y[1]; });
        frames.push({ narr: 'Sorted by start. Now any interval that overlaps the current block must come <b>right after it</b>, so one left-to-right sweep is enough.', parts: [
          { type: 'array', label: 'sorted by start', values: sorted.map(label) },
          timeline(sorted, sorted.map(label), -1, 'cur')
        ] });
        var res = [];
        for (var i = 0; i < sorted.length; i++) {
          var cur = sorted[i], narr, resHl = {};
          if (!res.length) {
            res.push(cur.slice()); resHl[0] = 'ok';
            narr = 'First interval ' + label(cur) + ' starts the first busy block.';
          } else {
            var last = res[res.length - 1];
            if (cur[0] <= last[1]) {
              var oldEnd = last[1];
              last[1] = Math.max(last[1], cur[1]);
              resHl[res.length - 1] = 'cur';
              narr = label(cur) + ' starts at ' + cur[0] + ' ≤ ' + oldEnd + ' (end of the last block) → <span class="c-y">overlap!</span> Extend the block: end = max(' + oldEnd + ', ' + cur[1] + ') = <b>' + last[1] + '</b>.' + (cur[1] <= oldEnd ? ' (It was completely swallowed — that is why we use max.)' : '');
            } else {
              res.push(cur.slice()); resHl[res.length - 1] = 'ok';
              narr = label(cur) + ' starts at ' + cur[0] + ' &gt; ' + last[1] + ' (end of the last block) → <span class="c-g">no overlap</span>. Close that block and start a new one.';
            }
          }
          var p = {}; p[i] = 'cur';
          var done = {}; for (var d = 0; d < i; d++) done[d] = 'done';
          frames.push({ narr: narr, parts: [
            { type: 'array', label: 'sorted intervals', values: sorted.map(label), ptr: p, hl: mix(done, one(i, 'cur')) },
            { type: 'array', label: 'merged result', values: res.map(label), hl: resHl },
            timeline(res, res.map(label), resHl[res.length - 1] ? res.length - 1 : -1, resHl[res.length - 1] === 'ok' ? 'ok' : 'cur')
          ] });
        }
        frames.push({ narr: 'Sweep finished: <b>' + sorted.length + '</b> intervals merged into <b>' + res.length + '</b> busy block' + (res.length > 1 ? 's' : '') + '. Cost: O(N log N) for sorting + O(N) for the sweep.', parts: [
          { type: 'array', label: 'answer', values: res.map(label), hl: (function () { var h = {}; for (var q = 0; q < res.length; q++) h[q] = 'sel'; return h; })() },
          timeline(res, res.map(label), -1, 'cur')
        ] });
        return frames;
      }
    },
    problems: [
      {
        title: 'Merge Intervals',
        level: 'Medium',
        tags: ['intervals', 'sorting', 'comparator'],
        statement: `<p>Given an array of intervals where <code>intervals[i] = [start<sub>i</sub>, end<sub>i</sub>]</code>, merge all overlapping intervals and return an array of the non-overlapping intervals that cover exactly the same points. Intervals that just touch (like [1,4] and [4,5]) count as overlapping.</p>`,
        constraints: `1 ≤ N ≤ 10<sup>4</sup>, 0 ≤ start<sub>i</sub> ≤ end<sub>i</sub> ≤ 10<sup>4</sup>`,
        example: `<p>Input: [8,10] [1,3] [15,18] [2,6] [9,12]</p>
          ${H.arr(['[1,3]', '[2,6]', '[8,10]', '[9,12]', '[15,18]'], { label: 'sorted', hl: { 0: 'b', 1: 'b', 2: 'y', 3: 'y', 4: 'g' } })}
          ${H.arr(['[1,6]', '[8,12]', '[15,18]'], { label: 'output', hl: { 0: 'b', 1: 'y', 2: 'g' } })}
          <p>Why: ${H.c('b', '[1,3] and [2,6]')} overlap (2 ≤ 3) → [1,6]; ${H.c('y', '[8,10] and [9,12]')} overlap (9 ≤ 10) → [8,12]; ${H.c('g', '[15,18]')} touches nobody.</p>`,
        brute: {
          why: `<p>Keep scanning all pairs; whenever two overlap, replace them by their union and start over. Each restart costs O(N<sup>2</sup>) pair checks and there can be N merges → O(N<sup>3</sup>). The waste: without sorting, an overlapping partner could be anywhere, so we keep re-checking pairs that were already fine.</p>`,
          code: { lang: 'java', code: `
            int[][] brute(int[][] intervals) {
                List<int[]> list = new ArrayList<>();
                for (int[] x : intervals) list.add(new int[]{x[0], x[1]});
                boolean changed = true;
                while (changed) {
                    changed = false;
                    outer:
                    for (int i = 0; i < list.size(); i++) {
                        for (int j = i + 1; j < list.size(); j++) {
                            int[] p = list.get(i), q = list.get(j);
                            if (p[0] <= q[1] && q[0] <= p[1]) {      // they overlap
                                p[0] = Math.min(p[0], q[0]);
                                p[1] = Math.max(p[1], q[1]);
                                list.remove(j);
                                changed = true;
                                break outer;                          // restart the scan
                            }
                        }
                    }
                }
                return list.toArray(new int[0][]);
            }`, alt: [{ lang: 'python', code: String.raw`
def merge(intervals):
    lst = [list(x) for x in intervals]
    changed = True
    while changed:
        changed = False
        for i in range(len(lst)):
            for j in range(i + 1, len(lst)):
                p, q = lst[i], lst[j]
                if p[0] <= q[1] and q[0] <= p[1]:        # they overlap
                    p[0] = min(p[0], q[0])
                    p[1] = max(p[1], q[1])
                    lst.pop(j)
                    changed = True
                    break
            if changed:
                break                                     # restart the scan
    return lst` }, { lang: 'js', code: String.raw`
function merge(intervals) {
  const list = intervals.map((x) => [x[0], x[1]]);
  let changed = true;
  while (changed) {
    changed = false;
    outer:
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const p = list[i], q = list[j];
        if (p[0] <= q[1] && q[0] <= p[1]) {              // they overlap
          p[0] = Math.min(p[0], q[0]);
          p[1] = Math.max(p[1], q[1]);
          list.splice(j, 1);
          changed = true;
          break outer;                                    // restart the scan
        }
      }
    }
  }
  return list;
}` }, { lang: 'cpp', code: String.raw`
vector<vector<int>> merge(vector<vector<int>> intervals) {
    vector<vector<int>> list = intervals;
    bool changed = true;
    while (changed) {
        changed = false;
        for (int i = 0; i < (int) list.size() && !changed; i++) {
            for (int j = i + 1; j < (int) list.size(); j++) {
                vector<int>& p = list[i];
                vector<int>& q = list[j];
                if (p[0] <= q[1] && q[0] <= p[1]) {      // they overlap
                    p[0] = min(p[0], q[0]);
                    p[1] = max(p[1], q[1]);
                    list.erase(list.begin() + j);
                    changed = true;                       // restart the scan
                    break;
                }
            }
        }
    }
    return list;
}` }, { lang: 'csharp', code: String.raw`
using System;
using System.Collections.Generic;

public class Solution {
    public int[][] Merge(int[][] intervals) {
        var list = new List<int[]>();
        foreach (int[] x in intervals) list.Add(new[] { x[0], x[1] });
        bool changed = true;
        while (changed) {
            changed = false;
            for (int i = 0; i < list.Count && !changed; i++) {
                for (int j = i + 1; j < list.Count; j++) {
                    int[] p = list[i], q = list[j];
                    if (p[0] <= q[1] && q[0] <= p[1]) {      // they overlap
                        p[0] = Math.Min(p[0], q[0]);
                        p[1] = Math.Max(p[1], q[1]);
                        list.RemoveAt(j);
                        changed = true;                       // restart the scan
                        break;
                    }
                }
            }
        }
        return list.ToArray();
    }
}` }] }
        },
        mcq: {
          q: 'The intervals are sorted by start. The last merged block is [2, 9] and the next interval is [3, 5]. What should happen?',
          options: ['Start a new block [3, 5]', 'Change the block to [2, 5]', 'Keep the block as [2, 9] (it swallows [3, 5])', 'Change the block to [3, 9]'],
          answer: 2,
          explain: '3 ≤ 9 so they overlap, and the new end is max(9, 5) = 9. Setting end = 5 would wrongly shrink the block.'
        },
        hints: [
          `<p><b>Aha:</b> once the intervals are sorted by start, an interval can only overlap the <b>most recent</b> merged block — overlap test is just <code>cur.start ≤ last.end</code>.</p>`,
          `<p>Sort by start (Java <code>Arrays.sort(intervals, (x, y) -&gt; Integer.compare(x[0], y[0]))</code>, Python <code>sorted(intervals)</code>, JS <code>(x, y) =&gt; x[0] - y[0]</code>, C++ <code>sort</code> on vectors). Keep a growable result list; look only at its last element.</p>`,
          `<p>Traps: use <code>max</code> for the new end (swallowed intervals); touching counts as overlap here (≤, not &lt;); copy the interval when adding so you do not modify the input by accident. Recipe: sort by start → for each cur: if result empty or cur.start &gt; last.end → add a copy; else last.end = max(last.end, cur.end) → convert the list to int[][].</p>`
        ],
        tests: { sig: 'int[][] -> int[][]', fn: 'merge', cases: [
          [[[[8, 10], [1, 3], [15, 18], [2, 6], [9, 12]]], [[1, 6], [8, 12], [15, 18]]],
          [[[[1, 4], [4, 5]]], [[1, 5]]],
          [[[[1, 4]]], [[1, 4]]],
          [[[[1, 10], [2, 5], [3, 4]]], [[1, 10]]],
          [[[[2, 3], [5, 6], [1, 10]]], [[1, 10]]],
          [[[[0, 0], [0, 0]]], [[0, 0]]],
          [[[[1, 2], [3, 4]]], [[1, 2], [3, 4]]],
          [[[[5, 6], [1, 2]]], [[1, 2], [5, 6]]]
        ] },
        solution: {
          approach: `<p>Sort by start; sweep once, either extending the last block or opening a new one.</p>`,
          code: `
            class Solution {
                public int[][] merge(int[][] intervals) {
                    // 1) sort by start (Integer.compare: no overflow tricks needed)
                    Arrays.sort(intervals, (x, y) -> Integer.compare(x[0], y[0]));
                    List<int[]> res = new ArrayList<>();
                    for (int[] cur : intervals) {
                        if (res.isEmpty() || cur[0] > res.get(res.size() - 1)[1]) {
                            // no overlap with the last block → open a new block
                            res.add(new int[]{cur[0], cur[1]});
                        } else {
                            // overlap → stretch the last block (max handles swallowed intervals)
                            int[] last = res.get(res.size() - 1);
                            last[1] = Math.max(last[1], cur[1]);
                        }
                    }
                    return res.toArray(new int[0][]);
                }

                public static void main(String[] args) {
                    int[][] in = {{8, 10}, {1, 3}, {15, 18}, {2, 6}, {9, 12}};
                    System.out.println(Arrays.deepToString(new Solution().merge(in))); // [[1, 6], [8, 12], [15, 18]]
                }
            }`,
          alt: [
            { lang: 'python', code: `def merge(intervals):
    res = []
    for s, e in sorted(intervals):           # 1) sort by start (tuples compare start first)
        if not res or s > res[-1][1]:
            res.append([s, e])               # no overlap -> open a new block
        else:
            res[-1][1] = max(res[-1][1], e)  # overlap -> stretch (max handles swallowed)
    return res` },
            { lang: 'js', code: `function merge(intervals) {
  const sorted = intervals.slice().sort((x, y) => x[0] - y[0]);   // numeric comparator!
  const res = [];
  for (const [s, e] of sorted) {
    const last = res[res.length - 1];
    if (!last || s > last[1]) res.push([s, e]);   // no overlap -> new block
    else last[1] = Math.max(last[1], e);          // overlap -> stretch
  }
  return res;
}` },
            { lang: 'cpp', code: `class Solution {
public:
    vector<vector<int>> merge(vector<vector<int>> intervals) {
        sort(intervals.begin(), intervals.end());          // vectors compare start first
        vector<vector<int>> res;
        for (const auto& cur : intervals) {
            if (res.empty() || cur[0] > res.back()[1]) res.push_back(cur);   // new block
            else res.back()[1] = max(res.back()[1], cur[1]);                 // stretch
        }
        return res;
    }
};` }, { lang: 'csharp', code: String.raw`
using System;
using System.Collections.Generic;

public class Solution {
    public int[][] Merge(int[][] intervals) {
        // 1) sort by start (CompareTo: no overflow tricks needed)
        Array.Sort(intervals, (x, y) => x[0].CompareTo(y[0]));
        var res = new List<int[]>();
        foreach (int[] cur in intervals) {
            if (res.Count == 0 || cur[0] > res[res.Count - 1][1]) {
                // no overlap with the last block -> open a new block
                res.Add(new[] { cur[0], cur[1] });
            } else {
                // overlap -> stretch the last block (max handles swallowed intervals)
                int[] last = res[res.Count - 1];
                last[1] = Math.Max(last[1], cur[1]);
            }
        }
        return res.ToArray();
    }
}` }
          ],
          dry: {
            head: ['cur', 'last block', 'cur.start ≤ last.end?', 'action', 'result'],
            rows: [
              ['(sort)', '—', '—', 'sorted: [1,3] [2,6] [8,10] [9,12] [15,18]', '[]'],
              ['[1,3]', '—', 'result empty', 'add', '[1,3]'],
              ['[2,6]', '[1,3]', '2 ≤ 3 <span class="c-g">yes</span>', 'end = max(3,6) = 6', '[1,6]'],
              ['[8,10]', '[1,6]', '8 ≤ 6 <span class="c-r">no</span>', 'add', '[1,6] [8,10]'],
              ['[9,12]', '[8,10]', '9 ≤ 10 <span class="c-g">yes</span>', 'end = max(10,12) = 12', '[1,6] [8,12]'],
              ['[15,18]', '[8,12]', '15 ≤ 12 <span class="c-r">no</span>', 'add', '<span class="c-p">[1,6] [8,12] [15,18]</span>']
            ]
          },
          complexity: `<p><b>Time O(N log N)</b>: sorting dominates; the sweep is a single O(N) pass with O(1) work per interval. <b>Space O(N)</b> for the result list (plus the sort's internal O(log N)–O(N)).</p>`
        }
      }
    ]
  });

  // ---------- TOPIC 7 extras ----------
  Object.assign(topics[topics.length - 1], {
    code: [{ lang: 'java', code: `
      // Merge overlapping intervals: sort by start, then one sweep.
      int[][] merge(int[][] intervals) {
          Arrays.sort(intervals, (x, y) -> Integer.compare(x[0], y[0]));
          List<int[]> res = new ArrayList<>();
          for (int[] cur : intervals) {
              if (res.isEmpty() || cur[0] > res.get(res.size() - 1)[1]) {
                  res.add(new int[]{cur[0], cur[1]});                  // gap → new block
              } else {
                  int[] last = res.get(res.size() - 1);
                  last[1] = Math.max(last[1], cur[1]);                  // overlap → stretch (max!)
              }
          }
          return res.toArray(new int[0][]);
      }`,
      alt: [
        { lang: 'python', code: `# Merge overlapping intervals: sort by start, then one sweep.
def merge(intervals):
    res = []
    for s, e in sorted(intervals, key=lambda x: x[0]):
        if not res or s > res[-1][1]:
            res.append([s, e])                    # gap -> new block
        else:
            res[-1][1] = max(res[-1][1], e)       # overlap -> stretch (max!)
    return res` },
        { lang: 'js', code: `// Merge overlapping intervals: sort by start, then one sweep.
function merge(intervals) {
  const res = [];
  for (const [s, e] of [...intervals].sort((x, y) => x[0] - y[0])) {
    const last = res[res.length - 1];
    if (!last || s > last[1]) res.push([s, e]);   // gap -> new block
    else last[1] = Math.max(last[1], e);          // overlap -> stretch (max!)
  }
  return res;
}` },
        { lang: 'cpp', code: `// Merge overlapping intervals: sort by start, then one sweep.
vector<vector<int>> merge(vector<vector<int>> intervals) {
    sort(intervals.begin(), intervals.end());
    vector<vector<int>> res;
    for (const auto& cur : intervals) {
        if (res.empty() || cur[0] > res.back()[1]) res.push_back(cur);   // gap -> new block
        else res.back()[1] = max(res.back()[1], cur[1]);                 // overlap -> stretch (max!)
    }
    return res;
}` }, { lang: 'csharp', code: String.raw`
// Merge overlapping intervals: sort by start, then one sweep.
int[][] Merge(int[][] intervals) {
    Array.Sort(intervals, (x, y) => x[0].CompareTo(y[0]));
    var res = new List<int[]>();
    foreach (int[] cur in intervals) {
        if (res.Count == 0 || cur[0] > res[res.Count - 1][1]) {
            res.Add(new[] { cur[0], cur[1] });                     // gap -> new block
        } else {
            int[] last = res[res.Count - 1];
            last[1] = Math.Max(last[1], cur[1]);                   // overlap -> stretch (max!)
        }
    }
    return res.ToArray();
}` }
      ] }, { lang: 'python', run: true, title: 'Same idea in Python (runnable)', code: `def merge(intervals):
    intervals.sort(key=lambda x: x[0])          # 1) sort by start
    res = []
    for s, e in intervals:
        if not res or s > res[-1][1]:           # gap → new block
            res.append([s, e])
        else:                                   # overlap → stretch the last block
            res[-1][1] = max(res[-1][1], e)
    return res

print(merge([[8, 10], [1, 3], [15, 18], [2, 6], [9, 12]]))  # [[1, 6], [8, 12], [15, 18]]` }],
    codeTitle: ['Merge intervals (sort + sweep)', 'Merge intervals (Python, runnable)'],
    examples: [
      {
        title: 'Swallowed intervals need max()',
        html: `<p>Sorted input [1,10] [2,5] [3,4]. Block [1,10]; [2,5]: 2 ≤ 10 → end = max(10, 5) = 10; [3,4]: 3 ≤ 10 → end = max(10, 4) = 10. Output <b>[1,10]</b>.</p>
          <p>With the buggy <code>last.end = cur.end</code> you would get [1,5] then [1,4] — the block <span class="c-r">shrinks</span> and points 5..10 vanish.</p>`
      },
      {
        title: 'Touching intervals: ≤ versus &lt;',
        html: `<p>[1,4] and [4,5]:</p>
          ${H.table(['problem says', 'test', 'result'], [
            ['"closed" ranges, points 1..4 and 4..5 share point 4', '<code>cur.start &lt;= last.end</code>', '[1,5] (merged)'],
            ['meetings: 4 o\'clock end, 4 o\'clock start, half-open [s, e)', '<code>cur.start &lt; last.end</code>', '[1,4] [4,5] (separate)']
          ])}
          <p>Always ask (or read): are the endpoints included? This single character is the most common interval bug.</p>`
      },
      {
        title: 'Total time covered = merge, then add lengths',
        html: `<p>Watch-history segments [1,3] [2,6] [8,10] (minutes). Merged: [1,6] [8,10]. Covered = (6 − 1) + (10 − 8) = <b>7 minutes</b>. Adding raw lengths would give 2 + 4 + 2 = 8 — double-counting the overlap 2..3.</p>`,
        code: { lang: 'java', code: `
          long coveredLength(int[][] iv) {
              Arrays.sort(iv, (x, y) -> Integer.compare(x[0], y[0]));
              long total = 0;
              int s = iv[0][0], e = iv[0][1];
              for (int[] cur : iv) {
                  if (cur[0] > e) { total += e - s; s = cur[0]; e = cur[1]; } // close block
                  else e = Math.max(e, cur[1]);                              // extend block
              }
              return total + (e - s);                                        // last block
          }`,
          alt: [
            { lang: 'python', run: true, code: `def covered_length(iv):
    iv = sorted(iv)
    total, (s, e) = 0, iv[0]
    for cs, ce in iv:
        if cs > e:                       # close block
            total += e - s
            s, e = cs, ce
        else:                            # extend block
            e = max(e, ce)
    return total + (e - s)               # last block

print(covered_length([[1, 3], [2, 6], [8, 10]]))  # 7` },
            { lang: 'js', run: true, code: `function coveredLength(iv) {
  const a = [...iv].sort((x, y) => x[0] - y[0]);
  let total = 0, [s, e] = a[0];
  for (const [cs, ce] of a) {
    if (cs > e) { total += e - s; s = cs; e = ce; }   // close block
    else e = Math.max(e, ce);                         // extend block
  }
  return total + (e - s);                             // last block
}
console.log(coveredLength([[1, 3], [2, 6], [8, 10]]));   // 7` },
            { lang: 'cpp', code: `long long coveredLength(vector<vector<int>> iv) {
    sort(iv.begin(), iv.end());
    long long total = 0;
    int s = iv[0][0], e = iv[0][1];
    for (const auto& cur : iv) {
        if (cur[0] > e) { total += e - s; s = cur[0]; e = cur[1]; }   // close block
        else e = max(e, cur[1]);                                       // extend block
    }
    return total + (e - s);                                            // last block
}` }, { lang: 'csharp', code: String.raw`
long CoveredLength(int[][] iv) {
    Array.Sort(iv, (x, y) => x[0].CompareTo(y[0]));
    long total = 0;
    int s = iv[0][0], e = iv[0][1];
    foreach (int[] cur in iv) {
        if (cur[0] > e) { total += e - s; s = cur[0]; e = cur[1]; } // close block
        else e = Math.Max(e, cur[1]);                              // extend block
    }
    return total + (e - s);                                        // last block
}` }
          ] }
      },
      {
        title: 'Unsorted input is where people slip',
        html: `<p>Input [2,3] [5,6] [1,10]. Sweeping <b>without</b> sorting: [2,3], then [5,6] (5 &gt; 3, new block), then [1,10]: 1 ≤ 6 so it only stretches the <b>last</b> block's end → [2,3] [5,10] — <span class="c-r">wrong</span> (start 1 is lost and [2,3] is not absorbed; the right answer is one block [1,10]). After sorting: [1,10] [2,3] [5,6] → one block [1,10]. The sort is what makes "only look at the last block" correct.</p>`
      }
    ],
    deepDive: `<p><b>Why the sweep is correct.</b> Invariant: after processing the first i sorted intervals, <code>res</code> is the merge of exactly those intervals, and its blocks are disjoint and increasing. When <code>cur.start &gt; last.end</code>, every <i>later</i> interval starts at ≥ cur.start &gt; last.end too (sorted!), so the last block can never grow again — it is final. That one-line argument is what interviewers want when they ask "why do you only compare with the last block?".</p>
      <p><b>Conventions.</b> Most production systems store <b>half-open</b> intervals [start, end): lengths are just end − start, adjacent slots [1,4) [4,5) do not overlap, and splitting is clean. Closed intervals [a, b] are common in puzzles. Mixing them is a classic off-by-one source (especially with integer days vs timestamps).</p>
      <p><b>Variants and scaling.</b> <i>Sweep line</i>: turn each interval into events (+1 at start, −1 at end), sort events, and track the running count — this answers "max overlap", "points covered by ≥ K intervals", and "free gaps" with the same O(N log N) shape. <i>Already sorted / streaming</i> input: the merge is O(N) time and O(1) extra memory (emit a block as soon as it closes). <i>Dynamic</i> data (insert ranges over time, query coverage): keep disjoint blocks in a <code>TreeMap&lt;start, end&gt;</code> — each insert merges neighbours in O(log N) amortised ("Range Module", "Data Stream as Disjoint Intervals"); for stabbing queries over overlapping intervals use an interval tree or segment tree (Range Query module).</p>
      <p><b>Memory.</b> Sorting <code>int[][]</code> with a lambda uses TimSort on references — fine for 10<sup>5</sup>. For 10<sup>7</sup> intervals, pack (start, end) into one <code>long</code> per interval (<code>(long) start &lt;&lt; 32 | end</code> for non-negative values) and sort a <code>long[]</code> — no objects, much less GC.</p>`,
    aiEra: `<p><b>What AI changes:</b> "merge intervals" is one of the most memorised interview problems, and every assistant can produce it. The interview has moved to the <b>variants</b>: half-open vs closed endpoints, streaming input, merging while answering queries, or turning a messy real requirement ("users' availability windows across time zones") into intervals in the first place.</p>
      <p><b>Use AI as a partner:</b> <code>Give me 10 tricky interval inputs: touching, nested, identical, single interval, unsorted, negative coordinates</code> and run them against your code; ask it to <code>convert this calendar-overlap SQL into an interval sweep and compare complexity</code>. Use it to brainstorm edge cases, not to skip the reasoning.</p>
      <p><b>Where AI goes wrong:</b> <code>last[1] = cur[1]</code> instead of max, comparing with <code>&lt;</code> when the statement says touching intervals merge (or vice versa), sorting with <code>(a, b) -&gt; a[0] - b[0]</code> on values near ±2·10<sup>9</sup>, and mutating the caller's input array without saying so. <b>What you must still own:</b> the "sort makes only the last block matter" proof, the endpoint convention, and recognising interval structure hiding in words like bookings, sessions, ranges, shifts.</p>`
  });

  // =====================================================================
  // helpers for the interval visualizers
  // =====================================================================
  function parseIv(input, minN, maxN, maxE, example) {
    var s = String(input === undefined || input === null ? '' : input).trim();
    if (!s) throw new Error('Type intervals like ' + example + ' (start-end, separated by spaces)');
    var toks = s.split(/[\s,]+/), iv = [];
    for (var t = 0; t < toks.length; t++) {
      var m = /^(\d+)-(\d+)$/.exec(toks[t]);
      if (!m) throw new Error('Each interval must look like start-end, e.g. ' + example);
      var st = +m[1], en = +m[2];
      if (st > en) throw new Error('In ' + toks[t] + ' the start is bigger than the end.');
      if (en > maxE) throw new Error('Please keep the ends at ' + maxE + ' or less so the timeline fits.');
      iv.push([st, en]);
    }
    if (iv.length < minN) throw new Error('Enter at least ' + minN + ' interval(s), e.g. ' + example);
    if (iv.length > maxN) throw new Error('Please use at most ' + maxN + ' intervals.');
    return iv;
  }
  function ivLabel(x) { return '[' + x[0] + ',' + x[1] + ']'; }
  function ivGrid(list, names, maxE, clsOf, label) {
    var rows = [], hl = {}, col = [];
    for (var c = 0; c <= maxE; c++) col.push(String(c));
    list.forEach(function (x, r) {
      var row = [];
      for (var c2 = 0; c2 <= maxE; c2++) {
        var on = c2 >= x[0] && c2 <= x[1];
        row.push(on ? '■' : '');
        if (on) hl[r + ',' + c2] = clsOf(r) || 'win';
      }
      rows.push(row);
    });
    return { type: 'grid', label: label || 'timeline', rows: rows, rowHead: names, colHead: col, hl: hl };
  }

  // =====================================================================
  // TOPIC 8: Insert Interval
  // =====================================================================
  topics.push({
    title: 'Insert Interval (into a sorted, non-overlapping list)',
    analogy: `<p>Your week planner already has neat, <b>non-overlapping</b> busy blocks written in time order. A new appointment comes in. You do not rewrite the whole planner: you <b>copy</b> every block that ends before the appointment starts, <b>fuse</b> the appointment with every block it touches into one bigger block, and then <b>copy</b> every block that starts after it ends. Three simple moves, one walk down the page.</p>`,
    explain: `<p>Input: a list of intervals that is <b>already sorted by start and has no overlaps</b>, plus one new interval. Output: the list with the new interval inserted, merging where needed. Because the list is already sorted, we do <b>not</b> need to sort again — one O(N) pass is enough.</p>
      <h4>Three phases</h4>
      ${H.table(['phase', 'condition (closed intervals)', 'action'], [
        ['1. before', '<code>iv.end &lt; new.start</code> (ends before new begins)', 'copy as is'],
        ['2. overlap', '<code>iv.start ≤ new.end</code> (and not phase 1)', 'new.start = min(new.start, iv.start), new.end = max(new.end, iv.end)'],
        ['3. after', 'everything left (<code>iv.start &gt; new.end</code>)', 'add the merged new interval once, then copy the rest']
      ])}
      <h4>Worked example</h4>
      <p>List [1,2] [3,5] [6,7] [8,10] [12,16], new = [4,8].</p>
      ${H.table(['interval', 'phase', 'new interval after', 'output so far'], [
        ['[1,2]', '2 &lt; 4 → before', '[4,8]', '[1,2]'],
        ['[3,5]', '3 ≤ 8 → overlap', '[<span class="c-y">3</span>,8]', '[1,2]'],
        ['[6,7]', '6 ≤ 8 → overlap', '[3,8]', '[1,2]'],
        ['[8,10]', '8 ≤ 8 → overlap (touching)', '[3,<span class="c-y">10</span>]', '[1,2]'],
        ['[12,16]', '12 &gt; 10 → after', 'add [3,10]', '<span class="c-g">[1,2] [3,10] [12,16]</span>']
      ])}
      ${H.arr(['[1,2]', '[3,10]', '[12,16]'], { label: 'answer', hl: { 1: 'g' } })}
      <p><b>Why not "append and run merge intervals"?</b> That works, but costs O(N log N) for the sort and ignores the gift that the list is already sorted. The three-phase walk is O(N) and is what interviewers expect. If you only need to <b>find</b> where the new interval goes, binary search finds the first overlapping block in O(log N) — but building the new list still copies O(N) items.</p>`,
    clues: [
      '"Given a <b>sorted, non-overlapping</b> list of intervals, insert a new one" → three-phase walk, O(N), no re-sort.',
      '"Add a booking / block and keep the calendar merged" → insert interval (or a TreeMap for many inserts).',
      '"Remove / subtract an interval from a set of ranges" → same three phases, but you split the overlapping blocks instead of fusing.',
      '"Many inserts and queries over time" (data stream of intervals) → TreeMap&lt;start, end&gt; with floor/ceiling lookups, O(log N) amortised each.',
      '"Find the free slots" / "first time a new meeting of length L fits" → walk the sorted busy list and look at the gaps between blocks.'
    ],
    code: { lang: 'java', code: `
      // Insert newIv into a sorted, non-overlapping list (closed intervals; touching ones merge).
      int[][] insert(int[][] intervals, int[] newIv) {
          List<int[]> res = new ArrayList<>();
          int i = 0, n = intervals.length;
          int s = newIv[0], e = newIv[1];
          // phase 1: blocks that end before the new interval starts
          while (i < n && intervals[i][1] < s) {
              res.add(intervals[i++]);
          }
          // phase 2: blocks that overlap the new interval → absorb them
          while (i < n && intervals[i][0] <= e) {
              s = Math.min(s, intervals[i][0]);
              e = Math.max(e, intervals[i][1]);
              i++;
          }
          res.add(new int[]{s, e});              // the fused block, added exactly once
          // phase 3: blocks that start after the new interval ends
          while (i < n) {
              res.add(intervals[i++]);
          }
          return res.toArray(new int[0][]);
      }`,
      alt: [
        { lang: 'python', code: `# Insert new_iv into a sorted, non-overlapping list (closed intervals; touching ones merge).
def insert(intervals, new_iv):
    res, i, n = [], 0, len(intervals)
    s, e = new_iv
    while i < n and intervals[i][1] < s:      # phase 1: blocks that end before the new one starts
        res.append(intervals[i]); i += 1
    while i < n and intervals[i][0] <= e:     # phase 2: blocks that overlap -> absorb them
        s, e = min(s, intervals[i][0]), max(e, intervals[i][1])
        i += 1
    res.append([s, e])                        # the fused block, added exactly once
    return res + intervals[i:]                # phase 3: blocks that start after it ends` },
        { lang: 'js', code: `// Insert newIv into a sorted, non-overlapping list (closed intervals; touching ones merge).
function insert(intervals, newIv) {
  const res = [], n = intervals.length;
  let [s, e] = newIv, i = 0;
  while (i < n && intervals[i][1] < s) res.push(intervals[i++]);   // phase 1: before
  while (i < n && intervals[i][0] <= e) {                           // phase 2: absorb
    s = Math.min(s, intervals[i][0]);
    e = Math.max(e, intervals[i][1]);
    i++;
  }
  res.push([s, e]);                                                 // fused block, once
  while (i < n) res.push(intervals[i++]);                           // phase 3: after
  return res;
}` },
        { lang: 'cpp', code: `// Insert newIv into a sorted, non-overlapping list (closed intervals; touching ones merge).
vector<vector<int>> insert(const vector<vector<int>>& intervals, vector<int> newIv) {
    vector<vector<int>> res;
    size_t i = 0, n = intervals.size();
    while (i < n && intervals[i][1] < newIv[0]) res.push_back(intervals[i++]);   // phase 1
    while (i < n && intervals[i][0] <= newIv[1]) {                               // phase 2
        newIv[0] = min(newIv[0], intervals[i][0]);
        newIv[1] = max(newIv[1], intervals[i][1]);
        i++;
    }
    res.push_back(newIv);                                                        // fused, once
    res.insert(res.end(), intervals.begin() + i, intervals.end());               // phase 3
    return res;
}` }, { lang: 'csharp', code: String.raw`
// Insert newIv into a sorted, non-overlapping list (closed intervals; touching ones merge).
int[][] Insert(int[][] intervals, int[] newIv) {
    var res = new List<int[]>();
    int i = 0, n = intervals.Length;
    int s = newIv[0], e = newIv[1];
    // phase 1: blocks that end before the new interval starts
    while (i < n && intervals[i][1] < s) {
        res.Add(intervals[i++]);
    }
    // phase 2: blocks that overlap the new interval -> absorb them
    while (i < n && intervals[i][0] <= e) {
        s = Math.Min(s, intervals[i][0]);
        e = Math.Max(e, intervals[i][1]);
        i++;
    }
    res.Add(new[] { s, e });               // the fused block, added exactly once
    // phase 3: blocks that start after the new interval ends
    while (i < n) {
        res.Add(intervals[i++]);
    }
    return res.ToArray();
}` }
      ] },
    codeTitle: 'Insert interval — three phases',
    viz: {
      title: 'Insert interval: copy before, fuse the overlap, copy after',
      input: '1-2 3-5 6-7 8-10 12-16 | 4-8',
      inputLabel: 'sorted non-overlapping intervals | new interval (ends ≤ 24, up to 7 intervals)',
      gen: function (input) {
        var raw = String(input === undefined || input === null ? '' : input);
        var halves = raw.split('|');
        if (halves.length !== 2) throw new Error('Use the format: 1-2 3-5 6-7 | 4-8  (list, a bar |, then the new interval)');
        var list = parseIv(halves[0], 1, 7, 24, '1-2 3-5 6-7');
        var nw = parseIv(halves[1], 1, 1, 24, '4-8')[0];
        for (var k = 1; k < list.length; k++) if (list[k][0] <= list[k - 1][1]) throw new Error('The list must be sorted and non-overlapping (each start must be after the previous end).');
        var maxE = nw[1]; list.forEach(function (x) { if (x[1] > maxE) maxE = x[1]; });
        var frames = [], res = [], s = nw[0], e = nw[1], i = 0, n = list.length;
        function listPart(cls) { return { type: 'array', label: 'sorted list', values: list.map(ivLabel), hl: cls, ptr: i < n ? one(i, 'i') : {} }; }
        function grid() {
          var rows = list.slice(), names = list.map(ivLabel);
          rows.push([s, e]); names.push('new ' + ivLabel([s, e]));
          return ivGrid(rows, names, maxE, function (r) { return r === rows.length - 1 ? 'cur' : (r < i ? 'done' : 'win'); });
        }
        frames.push({ narr: 'The list is already <b>sorted and non-overlapping</b>. New interval = ' + ivLabel(nw) + '. We walk the list once with pointer i, in three phases.', parts: [
          listPart({}), { type: 'array', label: 'output', values: ['(empty)'] }, grid()
        ] });
        while (i < n && list[i][1] < s) {
          res.push(list[i]);
          var h = {}; for (var q = 0; q < i; q++) h[q] = 'done'; h[i] = 'ok';
          frames.push({ narr: '<b>Phase 1 (before):</b> ' + ivLabel(list[i]) + ' ends at ' + list[i][1] + ' &lt; ' + s + ' (new start) → it finishes before the new interval begins. <span class="c-g">Copy it.</span>', parts: [
            listPart(h), { type: 'array', label: 'output', values: res.map(ivLabel), hl: one(res.length - 1, 'ok') }, grid()
          ] });
          i++;
        }
        var absorbed = 0;
        while (i < n && list[i][0] <= e) {
          var os = s, oe = e;
          s = Math.min(s, list[i][0]); e = Math.max(e, list[i][1]); absorbed++;
          var h2 = {}; for (var q2 = 0; q2 < i; q2++) h2[q2] = 'done'; h2[i] = 'cur';
          frames.push({ narr: '<b>Phase 2 (overlap):</b> ' + ivLabel(list[i]) + ' starts at ' + list[i][0] + ' ≤ ' + oe + ' (new end) → it overlaps. <span class="c-y">Absorb it:</span> new becomes [min(' + os + ',' + list[i][0] + '), max(' + oe + ',' + list[i][1] + ')] = <b>' + ivLabel([s, e]) + '</b>.', parts: [
            listPart(h2), { type: 'array', label: 'output', values: res.length ? res.map(ivLabel) : ['(empty)'] }, { type: 'vars', vals: { newStart: s, newEnd: e, absorbed: absorbed }, hl: { newStart: s !== os ? 'cur' : '', newEnd: e !== oe ? 'cur' : '' } }, grid()
          ] });
          i++;
        }
        res.push([s, e]);
        frames.push({ narr: (absorbed ? 'No more overlaps. ' : 'Nothing overlapped — the new interval fits in a gap. ') + '<span class="c-g">Add the fused interval ' + ivLabel([s, e]) + ' exactly once.</span>', parts: [
          listPart((function () { var hh = {}; for (var q3 = 0; q3 < i; q3++) hh[q3] = 'done'; return hh; })()), { type: 'array', label: 'output', values: res.map(ivLabel), hl: one(res.length - 1, 'sel') }, grid()
        ] });
        while (i < n) {
          res.push(list[i]);
          var h4 = {}; for (var q4 = 0; q4 < i; q4++) h4[q4] = 'done'; h4[i] = 'ok';
          frames.push({ narr: '<b>Phase 3 (after):</b> ' + ivLabel(list[i]) + ' starts at ' + list[i][0] + ' &gt; ' + e + ' → completely after the new block. <span class="c-g">Copy it.</span>', parts: [
            listPart(h4), { type: 'array', label: 'output', values: res.map(ivLabel), hl: one(res.length - 1, 'ok') }
          ] });
          i++;
        }
        frames.push({ narr: 'Done in one pass: <b>O(N)</b> time, no sorting needed. ' + n + ' intervals in, ' + res.length + ' out.', parts: [
          { type: 'array', label: 'answer', values: res.map(ivLabel), hl: (function () { var hh = {}; for (var q5 = 0; q5 < res.length; q5++) hh[q5] = 'sel'; return hh; })() },
          ivGrid(res, res.map(ivLabel), maxE, function () { return 'ok'; }, 'result timeline')
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'New interval fits in a gap',
        html: `<p>[[1,2], [5,6]] + [3,4]: phase 1 copies [1,2] (2 &lt; 3); phase 2 finds nothing (5 &gt; 4); add [3,4]; phase 3 copies [5,6]. Result ${H.arr(['[1,2]', '[3,4]', '[5,6]'], { hl: { 1: 'g' } })}</p>`
      },
      {
        title: 'New interval swallows everything',
        html: `<p>[[2,3], [4,5], [7,9]] + [1,10]: phase 1 copies nothing (3 ≥ 1); phase 2 absorbs all three (2 ≤ 10, 4 ≤ 10, 7 ≤ 10) → [1,10]; phase 3 nothing. Result <b>[[1,10]]</b>. The output can be shorter than the input.</p>`
      },
      {
        title: 'Edge cases: empty list, front, back, touching',
        html: `${H.table(['list', 'new', 'result', 'why'], [
            ['[]', '[5,7]', '[[5,7]]', 'phases 1 and 3 do nothing'],
            ['[[3,4]]', '[1,2]', '[[1,2],[3,4]]', '3 &gt; 2: no overlap, new goes first'],
            ['[[1,2]]', '[3,4]', '[[1,2],[3,4]]', '2 &lt; 3: phase 1 copies it'],
            ['[[1,5]]', '[5,7]', '[[1,7]]', 'closed intervals touching at 5 merge']
          ])}`
      },
      {
        title: 'Same idea in Python',
        html: `<p>Three while-loops translate one-to-one. Running it on the worked example prints the merged list.</p>`,
        code: { lang: 'python', run: true, code: `def insert(intervals, new):
    res, i, n = [], 0, len(intervals)
    s, e = new
    while i < n and intervals[i][1] < s:      # phase 1: before
        res.append(intervals[i]); i += 1
    while i < n and intervals[i][0] <= e:     # phase 2: overlap
        s = min(s, intervals[i][0]); e = max(e, intervals[i][1]); i += 1
    res.append([s, e])
    res.extend(intervals[i:])                 # phase 3: after
    return res

print(insert([[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 8]))  # [[1, 2], [3, 10], [12, 16]]` }
      }
    ],
    deepDive: `<p><b>Correctness.</b> Phase 1 stops at the first block with end ≥ s; because blocks are disjoint and sorted, their ends are increasing too, so every later block also ends at ≥ s. Phase 2 then absorbs blocks while start ≤ e; the first block with start &gt; e (and all after it) cannot touch the fused block, since e only grows during phase 2 and starts are increasing. Each block is visited once → O(N) time, O(N) output.</p>
      <p><b>Binary search version.</b> Because both starts and ends are sorted, you can find the first block with end ≥ s and the last block with start ≤ e by binary search in O(log N). That makes the <i>decision</i> logarithmic, but an array-based answer still copies O(N) items. With a <b>balanced tree</b> keyed by start (Java <code>TreeMap</code>), an insert is: <code>floorEntry(s)</code> to check the left neighbour, then repeatedly remove <code>ceilingEntry</code> blocks with start ≤ e. Each block is removed at most once over its lifetime, so a sequence of inserts costs O(log N) amortised each — the standard design for "Range Module" and "Data Stream as Disjoint Intervals".</p>
      <p><b>Removing an interval</b> (subtract [s, e]): same phases, but an overlapping block [a, b] is replaced by its left remainder [a, s) if a &lt; s and its right remainder (e, b] if b &gt; e. Calendars, IP-range allow-lists and memory allocators (free-list coalescing) all use exactly these insert/remove/merge moves.</p>
      <p><b>Endpoint care.</b> With half-open [s, e) intervals the tests become <code>end &lt;= s</code> (before) and <code>start &lt; e</code> (overlap); with closed integer ranges where [1,2] and [3,4] should also merge ("adjacent"), use <code>end + 1 &lt; s</code>. Decide the convention before writing the loops.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants usually answer "append + sort + merge" — correct, but O(N log N) and it misses the point of the "already sorted" hint. Spotting that a constraint lets you drop the sort is exactly the judgement interviews now test, along with the follow-up "what if there are a million inserts?" (TreeMap).</p>
      <p><b>Use AI as a partner:</b> <code>Write a randomized test: generate sorted disjoint lists and random new intervals, compare my O(N) insert with append+sort+merge</code>. Ask it for the TreeMap-based version and then trace one insert yourself to confirm the amortised argument.</p>
      <p><b>Where AI goes wrong:</b> adding the new interval inside the phase-2 loop (duplicates), forgetting to add it when nothing overlaps, using <code>&lt;=</code> in phase 1 (then a touching block is copied instead of merged), or mutating the input arrays it later returns. <b>What you must still own:</b> the three-phase invariant, endpoint conventions, and the scaling story from one insert (array) to many inserts (balanced tree).</p>`,
    problems: [
      {
        title: 'Insert Interval',
        level: 'Medium',
        tags: ['intervals', 'array', 'three phases'],
        companies: ['Google', 'Amazon', 'LinkedIn', 'Microsoft'],
        statement: `<p>You are given a list of non-overlapping intervals sorted by start, and a new interval. Insert the new interval so the list stays sorted and non-overlapping (merge if necessary). Return the new list. Touching intervals (like [1,5] and [5,7]) count as overlapping.</p>`,
        constraints: `0 ≤ N ≤ 10<sup>4</sup>, 0 ≤ start ≤ end ≤ 10<sup>5</sup>, input sorted by start and non-overlapping`,
        example: `<p>intervals = [[1,3], [6,9]], new = [2,5]</p>
          ${H.arr(['[1,3]', '[6,9]'], { label: 'list', hl: { 0: 'y' } })}
          ${H.arr(['[1,5]', '[6,9]'], { label: 'output', hl: { 0: 'g' } })}
          <p>Why: ${H.c('y', '[1,3]')} overlaps [2,5] (1 ≤ 5 and 3 ≥ 2) → fused to [1,5]; [6,9] starts at 6 &gt; 5, so it stays separate.</p>`,
        brute: {
          why: `<p>Append the new interval and run the full "sort by start + merge" algorithm: O(N log N). Correct, but it throws away the fact that the list is <b>already sorted</b> — the sort re-discovers an order we were given for free.</p>`,
          code: { lang: 'java', code: `
            int[][] brute(int[][] intervals, int[] newIv) {
                List<int[]> all = new ArrayList<>(Arrays.asList(intervals));
                all.add(newIv);
                all.sort((x, y) -> Integer.compare(x[0], y[0]));      // O(N log N) — unnecessary
                List<int[]> res = new ArrayList<>();
                for (int[] cur : all) {
                    if (res.isEmpty() || cur[0] > res.get(res.size() - 1)[1]) res.add(new int[]{cur[0], cur[1]});
                    else res.get(res.size() - 1)[1] = Math.max(res.get(res.size() - 1)[1], cur[1]);
                }
                return res.toArray(new int[0][]);
            }`, alt: [{ lang: 'python', code: String.raw`
def insert(intervals, new_interval):
    all_iv = [list(x) for x in intervals]
    all_iv.append(list(new_interval))
    all_iv.sort(key=lambda x: x[0])           # O(N log N) — unnecessary
    res = []
    for cur in all_iv:
        if not res or cur[0] > res[-1][1]:
            res.append([cur[0], cur[1]])
        else:
            res[-1][1] = max(res[-1][1], cur[1])
    return res` }, { lang: 'js', code: String.raw`
function insert(intervals, newInterval) {
  const all = intervals.map((x) => [x[0], x[1]]);
  all.push([newInterval[0], newInterval[1]]);
  all.sort((x, y) => x[0] - y[0]);            // O(N log N) — unnecessary
  const res = [];
  for (const cur of all) {
    if (res.length === 0 || cur[0] > res[res.length - 1][1]) res.push([cur[0], cur[1]]);
    else res[res.length - 1][1] = Math.max(res[res.length - 1][1], cur[1]);
  }
  return res;
}` }, { lang: 'cpp', code: String.raw`
vector<vector<int>> insert(const vector<vector<int>>& intervals, const vector<int>& newInterval) {
    vector<vector<int>> all = intervals;
    all.push_back(newInterval);
    sort(all.begin(), all.end(), [](const vector<int>& x, const vector<int>& y) { return x[0] < y[0]; });   // O(N log N) — unnecessary
    vector<vector<int>> res;
    for (const auto& cur : all) {
        if (res.empty() || cur[0] > res.back()[1]) res.push_back({cur[0], cur[1]});
        else res.back()[1] = max(res.back()[1], cur[1]);
    }
    return res;
}` }, { lang: 'csharp', code: String.raw`
using System;
using System.Collections.Generic;

public class Solution {
    public int[][] Insert(int[][] intervals, int[] newInterval) {
        var all = new List<int[]>(intervals);
        all.Add(newInterval);
        all.Sort((x, y) => x[0].CompareTo(y[0]));      // O(N log N) - unnecessary
        var res = new List<int[]>();
        foreach (int[] cur in all) {
            if (res.Count == 0 || cur[0] > res[res.Count - 1][1]) res.Add(new[] { cur[0], cur[1] });
            else res[res.Count - 1][1] = Math.Max(res[res.Count - 1][1], cur[1]);
        }
        return res.ToArray();
    }
}` }] }
        },
        mcq: {
          q: 'List [[1,2],[4,6],[8,9]], new = [3,8]. Which blocks get absorbed?',
          options: ['Only [4,6]', '[4,6] and [8,9]', '[1,2], [4,6] and [8,9]', 'None — it fits in a gap'],
          answer: 1,
          explain: '[1,2] ends at 2 &lt; 3 → before. [4,6]: 4 ≤ 8 → absorb. [8,9]: 8 ≤ 8 → touching, absorb (closed intervals). Result [[1,2],[3,9]].'
        },
        hints: [
          `<p><b>Aha:</b> the list is sorted and disjoint, so it splits into three consecutive groups: completely before the new interval, overlapping it, completely after it.</p>`,
          `<p>One index <code>i</code> and three while-loops. Loop 1: <code>end &lt; new.start</code> → copy. Loop 2: <code>start ≤ new.end</code> → widen the new interval with min/max. Then add it. Loop 3: copy the rest.</p>`,
          `<p>Edge cases: empty input (just return [new]); new interval before everything or after everything; new interval swallowing all; touching endpoints. Recipe: i = 0 → copy while ends &lt; s → absorb while starts ≤ e → add [s,e] → copy rest → toArray.</p>`
        ],
        tests: { sig: 'int[][] int[] -> int[][]', fn: 'insert', cases: [
          [[[[1, 3], [6, 9]], [2, 5]], [[1, 5], [6, 9]]],
          [[[[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 8]], [[1, 2], [3, 10], [12, 16]]],
          [[[], [5, 7]], [[5, 7]]],
          [[[[3, 4]], [1, 2]], [[1, 2], [3, 4]]],
          [[[[1, 2]], [3, 4]], [[1, 2], [3, 4]]],
          [[[[1, 5]], [5, 7]], [[1, 7]]],
          [[[[2, 3], [4, 5], [7, 9]], [1, 10]], [[1, 10]]],
          [[[[1, 2], [5, 6]], [3, 4]], [[1, 2], [3, 4], [5, 6]]]
        ] },
        solution: {
          approach: `<p>Three-phase linear walk; the new interval is widened while it overlaps and added exactly once.</p>`,
          code: `
            class Solution {
                public int[][] insert(int[][] intervals, int[] newInterval) {
                    List<int[]> res = new ArrayList<>();
                    int i = 0, n = intervals.length;
                    int s = newInterval[0], e = newInterval[1];
                    while (i < n && intervals[i][1] < s) {          // 1) completely before
                        res.add(intervals[i]);
                        i++;
                    }
                    while (i < n && intervals[i][0] <= e) {         // 2) overlapping → absorb
                        s = Math.min(s, intervals[i][0]);
                        e = Math.max(e, intervals[i][1]);
                        i++;
                    }
                    res.add(new int[]{s, e});                       // fused block, once
                    while (i < n) {                                 // 3) completely after
                        res.add(intervals[i]);
                        i++;
                    }
                    return res.toArray(new int[0][]);
                }

                public static void main(String[] args) {
                    int[][] r = new Solution().insert(new int[][]{{1, 2}, {3, 5}, {6, 7}, {8, 10}, {12, 16}}, new int[]{4, 8});
                    System.out.println(Arrays.deepToString(r)); // [[1, 2], [3, 10], [12, 16]]
                }
            }`,
          alt: [
            { lang: 'python', code: `def insert(intervals, new_interval):
    res, i, n = [], 0, len(intervals)
    s, e = new_interval
    while i < n and intervals[i][1] < s:         # 1) completely before
        res.append(intervals[i]); i += 1
    while i < n and intervals[i][0] <= e:        # 2) overlapping -> absorb
        s = min(s, intervals[i][0])
        e = max(e, intervals[i][1])
        i += 1
    res.append([s, e])                           # fused block, once
    res.extend(intervals[i:])                    # 3) completely after
    return res` },
            { lang: 'js', code: `function insert(intervals, newInterval) {
  const res = [], n = intervals.length;
  let [s, e] = newInterval, i = 0;
  while (i < n && intervals[i][1] < s) res.push(intervals[i++]);   // 1) before
  while (i < n && intervals[i][0] <= e) {                           // 2) overlap -> absorb
    s = Math.min(s, intervals[i][0]);
    e = Math.max(e, intervals[i][1]);
    i++;
  }
  res.push([s, e]);                                                 // fused block, once
  while (i < n) res.push(intervals[i++]);                           // 3) after
  return res;
}` },
            { lang: 'cpp', code: `class Solution {
public:
    vector<vector<int>> insert(const vector<vector<int>>& intervals, const vector<int>& newInterval) {
        vector<vector<int>> res;
        size_t i = 0, n = intervals.size();
        int s = newInterval[0], e = newInterval[1];
        while (i < n && intervals[i][1] < s) res.push_back(intervals[i++]);   // 1) before
        while (i < n && intervals[i][0] <= e) {                               // 2) absorb
            s = min(s, intervals[i][0]);
            e = max(e, intervals[i][1]);
            i++;
        }
        res.push_back({s, e});                                                // fused, once
        while (i < n) res.push_back(intervals[i++]);                          // 3) after
        return res;
    }
};` }, { lang: 'csharp', code: String.raw`
using System;
using System.Collections.Generic;

public class Solution {
    public int[][] Insert(int[][] intervals, int[] newInterval) {
        var res = new List<int[]>();
        int i = 0, n = intervals.Length;
        int s = newInterval[0], e = newInterval[1];
        while (i < n && intervals[i][1] < s) {          // 1) completely before
            res.Add(intervals[i]);
            i++;
        }
        while (i < n && intervals[i][0] <= e) {         // 2) overlapping -> absorb
            s = Math.Min(s, intervals[i][0]);
            e = Math.Max(e, intervals[i][1]);
            i++;
        }
        res.Add(new[] { s, e });                        // fused block, once
        while (i < n) {                                 // 3) completely after
            res.Add(intervals[i]);
            i++;
        }
        return res.ToArray();
    }
}` }
          ],
          dry: {
            head: ['i', 'interval', 'test', 'phase', '[s, e]', 'res'],
            rows: [
              ['0', '[1,2]', '2 &lt; 4', 'before → copy', '[4,8]', '[1,2]'],
              ['1', '[3,5]', '3 ≤ 8', 'overlap', '[3,8]', '[1,2]'],
              ['2', '[6,7]', '6 ≤ 8', 'overlap', '[3,8]', '[1,2]'],
              ['3', '[8,10]', '8 ≤ 8', 'overlap', '[3,10]', '[1,2]'],
              ['4', '[12,16]', '12 &gt; 10', 'add [3,10], then after → copy', '[3,10]', '<span class="c-p">[1,2] [3,10] [12,16]</span>']
            ]
          },
          complexity: `<p><b>Time O(N)</b>: every interval is looked at once. <b>Space O(N)</b> for the output list (O(1) extra besides it).</p>`,
          followUps: ['Many inserts arrive over time — design it with a TreeMap.', 'Remove an interval instead of inserting one.', 'Treat [1,2] and [3,4] as adjacent integer ranges that should also merge.']
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 9: Meeting Rooms I & II (+ minimum platforms)
  // =====================================================================
  topics.push({
    title: 'Meeting Rooms I & II, Minimum Platforms (sweep + min-heap)',
    analogy: `<p>You are the office receptionist with a stack of meeting requests for today. <b>Meeting Rooms I</b>: "Can <b>one</b> person attend all of these?" — put them in start-time order and check that nobody starts before the previous one ends. <b>Meeting Rooms II</b>: "How many rooms must I book?" — go through the requests in start-time order; for each new meeting, glance at the room that <b>frees up earliest</b>. If it is already free, reuse it; if not, open a new room. A railway station asks the same question about <b>platforms</b> for trains.</p>`,
    explain: `<p>Meetings are intervals <b>[start, end)</b>: a meeting ending at 10 and one starting at 10 do <b>not</b> clash (the room is free at 10). That is why the tests below use <code>&lt;</code> / <code>≤</code> carefully.</p>
      <h4>Meeting Rooms I — can one person attend everything?</h4>
      <p>Sort by start. Any clash must be between <b>neighbours</b> in this order, so check <code>a[i].start &lt; a[i−1].end</code> for every i. O(N log N).</p>
      ${H.table(['sorted', 'check', 'ok?'], [['[0,30]', '—', ''], ['[5,10]', '5 &lt; 30', '<span class="c-r">clash → false</span>']])}
      <h4>Meeting Rooms II — minimum number of rooms</h4>
      <p><b>Key fact:</b> rooms needed = the <b>maximum number of meetings happening at the same moment</b>. Two classic ways to compute it:</p>
      <p><b>(a) Sort by start + min-heap of end times.</b> The heap holds the end time of every busy room; its top is the room that frees up first.</p>
      ${H.table(['meeting', 'heap top (earliest end)', 'free?', 'action', 'heap after', 'rooms'], [
        ['[0,30]', '—', '—', 'open room', '{30}', '1'],
        ['[5,10]', '30', '30 &gt; 5 no', 'open room', '{10, 30}', '2'],
        ['[15,20]', '10', '10 ≤ 15 <span class="c-g">yes</span>', 'reuse: pop 10, push 20', '{20, 30}', '2']
      ])}
      <p>Answer = heap size at the end = the most rooms ever open at once = <b>2</b>.</p>
      <p><b>(b) Chronological ordering (two sorted arrays).</b> Sort all starts and all ends separately. Walk the starts; pointer j marks the earliest end not yet "used". If <code>start[i] ≥ end[j]</code> a room was freed → reuse it (j++); otherwise open a new room. Same answer, no heap.</p>
      ${H.arr([0, 5, 15], { label: 'starts' })}${H.arr([10, 20, 30], { label: 'ends', ptr: { 0: 'j' } })}
      <p><b>(c) Sweep line.</b> Make events (time, +1) for starts and (time, −1) for ends, sort by time with <b>ends before starts on ties</b>, and track the running sum's maximum. This version generalises to "how many intervals cover each point".</p>
      <h4>Minimum platforms</h4>
      <p>Trains with arrival and departure times are the same problem: platforms = maximum trains at the station at once. Watch the tie rule: many textbook versions say a train arriving at the exact minute another departs still needs its own platform → treat the interval as closed (use <code>arr[i] &lt;= dep[j]</code> → new platform).</p>`,
    clues: [
      '"Can a person attend all meetings?" / "any two bookings overlap?" → sort by start, compare neighbours.',
      '"<b>Minimum number of rooms / platforms / servers / CPUs / cars</b> needed" → maximum overlap → min-heap of ends or sweep line.',
      '"Maximum number of events happening at the same time" / "peak concurrent users" → sweep line (+1/−1 events).',
      '"Meeting ends at 10 and another starts at 10" → decide the tie rule: half-open (reuse) vs closed (clash).',
      '"Assign each meeting to a room and return which room hosts the most meetings" → heap of (end, roomId) + heap of free room ids (Meeting Rooms III).',
      'Times are small integers (≤ 10<sup>6</sup>) → a difference array + prefix sum gives max overlap in O(N + T) without sorting.'
    ],
    code: [{ lang: 'java', code: `
      // Meeting Rooms I: can one person attend all meetings? (half-open: [s, e))
      boolean canAttendAll(int[][] m) {
          Arrays.sort(m, (x, y) -> Integer.compare(x[0], y[0]));
          for (int i = 1; i < m.length; i++) {
              if (m[i][0] < m[i - 1][1]) return false;   // starts before the previous one ends
          }
          return true;
      }`,
      alt: [
        { lang: 'python', code: `# Meeting Rooms I: can one person attend all meetings? (half-open: [s, e))
def can_attend_all(m):
    m = sorted(m)
    return all(m[i][0] >= m[i - 1][1] for i in range(1, len(m)))` },
        { lang: 'js', code: `// Meeting Rooms I: can one person attend all meetings? (half-open: [s, e))
function canAttendAll(m) {
  const s = [...m].sort((x, y) => x[0] - y[0]);
  return s.every((cur, i) => i === 0 || cur[0] >= s[i - 1][1]);
}` },
        { lang: 'cpp', code: `// Meeting Rooms I: can one person attend all meetings? (half-open: [s, e))
bool canAttendAll(vector<vector<int>> m) {
    sort(m.begin(), m.end());
    for (size_t i = 1; i < m.size(); i++)
        if (m[i][0] < m[i - 1][1]) return false;   // starts before the previous one ends
    return true;
}` }, { lang: 'csharp', code: String.raw`
// Meeting Rooms I: can one person attend all meetings? (half-open: [s, e))
bool CanAttendAll(int[][] m) {
    Array.Sort(m, (x, y) => x[0].CompareTo(y[0]));
    for (int i = 1; i < m.Length; i++) {
        if (m[i][0] < m[i - 1][1]) return false;   // starts before the previous one ends
    }
    return true;
}` }
      ] }, { lang: 'java', code: `
      // Meeting Rooms II with a min-heap of end times.
      int minRooms(int[][] m) {
          Arrays.sort(m, (x, y) -> Integer.compare(x[0], y[0]));     // by start
          PriorityQueue<Integer> ends = new PriorityQueue<>();        // end times of busy rooms
          for (int[] mt : m) {
              if (!ends.isEmpty() && ends.peek() <= mt[0]) {
                  ends.poll();                                        // earliest room is free → reuse it
              }
              ends.offer(mt[1]);                                      // this meeting occupies a room until mt[1]
          }
          return ends.size();                                         // rooms ever needed at once
      }`,
      alt: [
        { lang: 'python', code: `# Meeting Rooms II with a min-heap of end times (heapq is a min-heap).
import heapq

def min_rooms(m):
    ends = []                                    # end times of busy rooms
    for s, e in sorted(m):                       # by start
        if ends and ends[0] <= s:
            heapq.heapreplace(ends, e)           # earliest room is free -> reuse it
        else:
            heapq.heappush(ends, e)              # open a new room
    return len(ends)                             # rooms ever needed at once` },
        { lang: 'js', code: `// Meeting Rooms II with a min-heap of end times.
// JS has no built-in heap: the module's small MinHeap class.
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp; }
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a; a.push(x);
    let i = a.length - 1;
    while (i > 0) {                                   // sift up
      const p = (i - 1) >> 1;
      if (this.cmp(a[i], a[p]) >= 0) break;
      [a[i], a[p]] = [a[p], a[i]]; i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      for (let i = 0; ;) {                            // sift down
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && this.cmp(a[l], a[m]) < 0) m = l;
        if (r < a.length && this.cmp(a[r], a[m]) < 0) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]]; i = m;
      }
    }
    return top;
  }
}

function minRooms(m) {
  const ends = new MinHeap();                         // end times of busy rooms
  for (const [s, e] of [...m].sort((x, y) => x[0] - y[0])) {
    if (ends.size() && ends.peek() <= s) ends.pop();  // earliest room is free -> reuse it
    ends.push(e);                                     // this meeting occupies a room until e
  }
  return ends.size();                                 // rooms ever needed at once
}` },
        { lang: 'cpp', code: `// Meeting Rooms II with a min-heap of end times.
int minRooms(vector<vector<int>> m) {
    sort(m.begin(), m.end());                                   // by start
    priority_queue<int, vector<int>, greater<int>> ends;        // greater<> -> MIN-heap
    for (const auto& mt : m) {
        if (!ends.empty() && ends.top() <= mt[0]) ends.pop();   // earliest room is free -> reuse it
        ends.push(mt[1]);
    }
    return (int)ends.size();                                    // rooms ever needed at once
}` }, { lang: 'csharp', code: String.raw`
// Meeting Rooms II with a min-heap of end times. (.NET Framework has no PriorityQueue: a SortedSet of
// (end, id) pairs plays the min-heap: Min is the earliest end, both ops are O(log N).)
int MinRooms(int[][] m) {
    Array.Sort(m, (x, y) => x[0].CompareTo(y[0]));              // by start
    var ends = new SortedSet<(int end, int id)>();              // end times of busy rooms
    int id = 0;
    foreach (int[] mt in m) {
        if (ends.Count > 0 && ends.Min.end <= mt[0]) {
            ends.Remove(ends.Min);                              // earliest room is free -> reuse it
        }
        ends.Add((mt[1], id++));                                // this meeting occupies a room until mt[1]
    }
    return ends.Count;                                          // rooms ever needed at once
}` }
      ] }, { lang: 'java', code: `
      // Meeting Rooms II with two sorted arrays (no heap).
      int minRoomsTwoPointers(int[][] m) {
          int n = m.length;
          int[] st = new int[n], en = new int[n];
          for (int i = 0; i < n; i++) { st[i] = m[i][0]; en[i] = m[i][1]; }
          Arrays.sort(st);
          Arrays.sort(en);
          int rooms = 0, j = 0;
          for (int i = 0; i < n; i++) {
              if (st[i] >= en[j]) j++;        // some meeting ended by now → reuse its room
              else rooms++;                   // everyone is still busy → need a new room
          }
          return rooms;
      }`,
      alt: [
        { lang: 'python', code: `# Meeting Rooms II with two sorted lists (no heap).
def min_rooms_two_pointers(m):
    st = sorted(s for s, _ in m)
    en = sorted(e for _, e in m)
    rooms = j = 0
    for s in st:
        if s >= en[j]:
            j += 1                    # some meeting ended by now -> reuse its room
        else:
            rooms += 1                # everyone is still busy -> need a new room
    return rooms` },
        { lang: 'js', code: `// Meeting Rooms II with two sorted arrays (no heap).
function minRoomsTwoPointers(m) {
  const st = Int32Array.from(m, (x) => x[0]).sort();   // typed arrays sort numerically
  const en = Int32Array.from(m, (x) => x[1]).sort();
  let rooms = 0, j = 0;
  for (const s of st) {
    if (s >= en[j]) j++;              // some meeting ended by now -> reuse its room
    else rooms++;                     // everyone is still busy -> need a new room
  }
  return rooms;
}` },
        { lang: 'cpp', code: `// Meeting Rooms II with two sorted arrays (no heap).
int minRoomsTwoPointers(const vector<vector<int>>& m) {
    vector<int> st, en;
    for (const auto& x : m) { st.push_back(x[0]); en.push_back(x[1]); }
    sort(st.begin(), st.end());
    sort(en.begin(), en.end());
    int rooms = 0;
    size_t j = 0;
    for (int s : st) {
        if (s >= en[j]) j++;          // some meeting ended by now -> reuse its room
        else rooms++;                 // everyone is still busy -> need a new room
    }
    return rooms;
}` }, { lang: 'csharp', code: String.raw`
// Meeting Rooms II with two sorted arrays (no heap).
int MinRoomsTwoPointers(int[][] m) {
    int n = m.Length;
    int[] st = new int[n], en = new int[n];
    for (int i = 0; i < n; i++) { st[i] = m[i][0]; en[i] = m[i][1]; }
    Array.Sort(st);
    Array.Sort(en);
    int rooms = 0, j = 0;
    for (int i = 0; i < n; i++) {
        if (st[i] >= en[j]) j++;        // some meeting ended by now -> reuse its room
        else rooms++;                   // everyone is still busy -> need a new room
    }
    return rooms;
}` }
      ] }],
    codeTitle: ['Meeting Rooms I', 'Meeting Rooms II — min-heap', 'Meeting Rooms II — two sorted arrays'],
    viz: {
      title: 'Meeting rooms: reuse the room that frees up first',
      input: '0-30 5-10 15-20 10-25 26-29',
      inputLabel: 'Meetings as start-end, half-open [s, e) (2 to 8 meetings, ends ≤ 30)',
      gen: function (input) {
        var iv = parseIv(input, 2, 8, 30, '0-30 5-10 15-20');
        iv.forEach(function (x) { if (x[0] === x[1]) throw new Error('A meeting must have its start smaller than its end (e.g. 5-10).'); });
        var names = 'ABCDEFGH';
        var ms = iv.map(function (x, k) { return { s: x[0], e: x[1], n: names[k] }; });
        var sorted = ms.slice().sort(function (a, b) { return a.s - b.s || a.e - b.e; });
        var maxE = 0; ms.forEach(function (m) { if (m.e > maxE) maxE = m.e; });
        var heap = [], rooms = [], frames = [];
        function heapView() { var h = heap.slice().sort(function (a, b) { return a.end - b.end || a.room - b.room; }); return h.length ? h.map(function (x) { return x.end + ' (R' + (x.room + 1) + ')'; }) : ['(empty)']; }
        function roomGrid(curRoom, cls) {
          var col = []; for (var c = 0; c < maxE; c++) col.push(String(c));
          var rows = [], hl = {}, rh = [];
          rooms.forEach(function (list, r) {
            var row = []; for (var c2 = 0; c2 < maxE; c2++) row.push('');
            list.forEach(function (m, idx) {
              for (var c3 = m.s; c3 < m.e; c3++) { row[c3] = m.n; hl[r + ',' + c3] = (r === curRoom && idx === list.length - 1) ? cls : 'win'; }
            });
            rows.push(row); rh.push('Room ' + (r + 1));
          });
          if (!rows.length) { var e = []; for (var c4 = 0; c4 < maxE; c4++) e.push(''); rows.push(e); rh.push('(no rooms)'); }
          return { type: 'grid', label: 'room schedule (letter = meeting)', rows: rows, rowHead: rh, colHead: col, hl: hl };
        }
        frames.push({ narr: 'Meetings ' + ms.map(function (m) { return m.n + '=[' + m.s + ',' + m.e + ')'; }).join(', ') + '. First, sort by <b>start time</b> — we will hand out rooms in the order meetings begin.', parts: [
          { type: 'array', label: 'sorted by start', values: sorted.map(function (m) { return m.n + ' [' + m.s + ',' + m.e + ')'; }) },
          { type: 'array', label: 'min-heap of end times', values: heapView() },
          { type: 'vars', vals: { rooms: 0 } }
        ] });
        for (var i = 0; i < sorted.length; i++) {
          var m = sorted[i], narr, cls, room;
          var top = heap.length ? heap.slice().sort(function (a, b) { return a.end - b.end || a.room - b.room; })[0] : null;
          if (top && top.end <= m.s) {
            heap.splice(heap.indexOf(top), 1);
            room = top.room; cls = 'ok';
            narr = 'Meeting ' + m.n + ' starts at ' + m.s + '. Earliest-free room is Room ' + (room + 1) + ' (free at ' + top.end + ' ≤ ' + m.s + '). <span class="c-g">Reuse it</span>: pop ' + top.end + ', push ' + m.e + '.';
          } else {
            room = rooms.length; rooms.push([]); cls = 'bad';
            narr = 'Meeting ' + m.n + ' starts at ' + m.s + '. ' + (top ? 'Even the earliest-free room is busy until ' + top.end + ' &gt; ' + m.s + '. ' : 'No rooms exist yet. ') + '<span class="c-r">Open a new room</span> (Room ' + (room + 1) + ').';
          }
          rooms[room].push(m);
          heap.push({ end: m.e, room: room });
          var p = {}; p[i] = 'now'; var hl = {}; for (var q = 0; q < i; q++) hl[q] = 'done'; hl[i] = 'cur';
          frames.push({ narr: narr, parts: [
            { type: 'array', label: 'sorted by start', values: sorted.map(function (mm) { return mm.n + ' [' + mm.s + ',' + mm.e + ')'; }), hl: hl, ptr: p },
            { type: 'array', label: 'min-heap of end times (earliest first)', values: heapView(), hl: one(0, 'sel') },
            roomGrid(room, cls),
            { type: 'vars', vals: { meeting: m.n, start: m.s, rooms: rooms.length }, hl: { rooms: cls === 'bad' ? 'bad' : 'ok' } }
          ] });
        }
        frames.push({ narr: 'All meetings placed with <b>' + rooms.length + '</b> room' + (rooms.length > 1 ? 's' : '') + '. That equals the largest number of meetings running at the same instant — no schedule can do better, and the greedy "reuse the earliest-free room" always achieves it.', parts: [
          roomGrid(-1, 'ok'),
          { type: 'vars', vals: { answer: rooms.length }, hl: { answer: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Back-to-back meetings share one room',
        html: `<p>[1,5) [5,10) [10,15): sorted; heap {5}; next starts at 5, top 5 ≤ 5 → reuse; then 10 ≤ 10 → reuse. Answer <b>1 room</b>. With a closed-interval rule (<code>&lt;</code> instead of <code>≤</code> in the free check) you would wrongly get 3. Always confirm the tie rule.</p>`
      },
      {
        title: 'Everything overlaps → N rooms',
        html: `<p>[1,10) [2,9) [3,8) [4,7): every new meeting finds all rooms busy (heap top is ≥ its start). Answer <b>4</b>. At time 4–7 all four are running at once, which proves 4 is the minimum.</p>
          ${H.table(['time', '1', '2', '3', '4..6', '7', '8', '9'], [['meetings running', '1', '2', '3', '<span class="c-r">4</span>', '3', '2', '1']])}`
      },
      {
        title: 'Minimum platforms at a railway station',
        html: `<p>arr = [900, 940, 950, 1100, 1500, 1800], dep = [910, 1200, 1120, 1130, 1900, 2000]. Sort both (dep → 910, 1120, 1130, 1200, 1900, 2000) and walk them like a merge:</p>
          ${H.table(['event', 'time', 'platforms in use', 'max'], [
            ['arrive', '900', '1', '1'], ['depart', '910', '0', '1'], ['arrive', '940', '1', '1'], ['arrive', '950', '2', '2'],
            ['arrive', '1100', '<span class="c-r">3</span>', '<span class="c-r">3</span>'], ['depart', '1120', '2', '3'], ['depart', '1130', '1', '3'], ['depart', '1200', '0', '3'],
            ['arrive', '1500', '1', '3'], ['arrive', '1800', '2', '3'], ['depart', '1900', '1', '3'], ['depart', '2000', '0', '3']
          ])}
          <p>Answer <b>3</b>.</p>`,
        code: { lang: 'java', code: `
          int minPlatforms(int[] arr, int[] dep) {
              int[] a = arr.clone(), d = dep.clone();
              Arrays.sort(a);
              Arrays.sort(d);
              int i = 0, j = 0, cur = 0, best = 0;
              while (i < a.length) {
                  if (a[i] <= d[j]) { cur++; i++; best = Math.max(best, cur); } // arrival first on ties: train needs a platform
                  else { cur--; j++; }                                           // a train has left
              }
              return best;
          }`,
          alt: [
            { lang: 'python', run: true, code: `def min_platforms(arr, dep):
    a, d = sorted(arr), sorted(dep)
    i = j = cur = best = 0
    while i < len(a):
        if a[i] <= d[j]:              # arrival first on ties: train needs a platform
            cur += 1; i += 1
            best = max(best, cur)
        else:                         # a train has left
            cur -= 1; j += 1
    return best

print(min_platforms([900, 940, 950, 1100, 1500, 1800], [910, 1200, 1120, 1130, 1900, 2000]))  # 3` },
            { lang: 'js', run: true, code: `function minPlatforms(arr, dep) {
  const a = Int32Array.from(arr).sort(), d = Int32Array.from(dep).sort();
  let i = 0, j = 0, cur = 0, best = 0;
  while (i < a.length) {
    if (a[i] <= d[j]) { cur++; i++; best = Math.max(best, cur); }   // arrival first on ties
    else { cur--; j++; }                                            // a train has left
  }
  return best;
}
console.log(minPlatforms([900, 940, 950, 1100, 1500, 1800], [910, 1200, 1120, 1130, 1900, 2000]));   // 3` },
            { lang: 'cpp', code: `int minPlatforms(vector<int> a, vector<int> d) {
    sort(a.begin(), a.end());
    sort(d.begin(), d.end());
    size_t i = 0, j = 0;
    int cur = 0, best = 0;
    while (i < a.size()) {
        if (a[i] <= d[j]) { cur++; i++; best = max(best, cur); }   // arrival first on ties
        else { cur--; j++; }                                        // a train has left
    }
    return best;
}` }, { lang: 'csharp', code: String.raw`
int MinPlatforms(int[] arr, int[] dep) {
    int[] a = (int[])arr.Clone(), d = (int[])dep.Clone();
    Array.Sort(a);
    Array.Sort(d);
    int i = 0, j = 0, cur = 0, best = 0;
    while (i < a.Length) {
        if (a[i] <= d[j]) { cur++; i++; best = Math.Max(best, cur); } // arrival first on ties: train needs a platform
        else { cur--; j++; }                                           // a train has left
    }
    return best;
}` }
          ] }
      },
      {
        title: 'Sweep line with +1 / −1 events',
        html: `<p>[0,30) [5,10) [15,20) → events (0,+1) (5,+1) (10,−1) (15,+1) (20,−1) (30,−1). Running sum: 1, 2, 1, 2, 1, 0 → max <b>2</b>. On equal times put −1 before +1 (half-open meetings). Same idea answers "peak concurrent users from login/logout logs".</p>`,
        code: { lang: 'python', run: true, code: `def min_rooms(meetings):
    events = []
    for s, e in meetings:
        events.append((s, 1))
        events.append((e, -1))
    events.sort()                 # (t, -1) sorts before (t, +1): ends free the room first
    cur = best = 0
    for _, d in events:
        cur += d
        best = max(best, cur)
    return best

print(min_rooms([[0, 30], [5, 10], [15, 20]]))   # 2
print(min_rooms([[1, 5], [5, 10], [10, 15]]))    # 1` }
      }
    ],
    deepDive: `<p><b>Why max overlap is the exact answer.</b> Lower bound: at the instant when k meetings run together, they need k different rooms. Upper bound: the greedy (process by start, reuse any free room) never opens room k+1 unless k rooms are busy at that start time — i.e. k+1 meetings overlap at that moment. So greedy = max overlap = optimal. In graph terms, intervals form an <b>interval graph</b>, whose chromatic number equals its maximum clique, and greedy colouring by start time is optimal.</p>
      <p><b>Three implementations, one complexity.</b> Heap: O(N log N) time, O(N) heap. Two sorted arrays: O(N log N) for the two sorts, then O(N), no heap — usually fastest in practice (plain integer arrays, no heap objects). Sweep events: O(N log N), naturally extends to weighted demands ("each meeting needs c chairs") and to "how many intervals cover point x". If times are small integers, a <b>difference array</b> (diff[s]++, diff[e]−−, prefix sum) gives O(N + T) with no sort at all.</p>
      <p><b>Harder follow-ups.</b> <i>Meeting Rooms III</i>: rooms are numbered, a meeting takes the lowest-numbered free room, and if none is free it is <b>delayed</b> until the earliest room frees (keeping its duration) — use two heaps: free room ids, and (end time, room id) for busy rooms; use <code>long</code> for delayed end times. <i>Online booking</i> ("My Calendar I/II/III"): keep a <code>TreeMap</code> of boundary deltas and recompute the running max, or a segment tree with lazy propagation for O(log T) per booking.</p>
      <p><b>Production reality.</b> Calendar systems store half-open UTC timestamps; recurring events are expanded into instances within a query window before sweeping; resource schedulers (Kubernetes bin-packing, cloud capacity planning, CPU scheduling) are multi-dimensional versions of "minimum rooms" and are usually NP-hard, so they use heuristics built on exactly these greedy ideas.</p>`,
    aiEra: `<p><b>What AI changes:</b> Meeting Rooms II is a famous problem, so assistants recall it well — and also recall the <b>wrong tie rule</b> for your variant. Real requirements are fuzzy ("buffer 5 minutes between meetings", "rooms have capacities", "some meetings can be moved"), and translating them into intervals, tie rules and the right greedy is your job.</p>
      <p><b>Use AI as a partner:</b> <code>Generate 1000 random meeting sets; compare heap, two-pointer and sweep-line answers; report any mismatch with the input</code> — mismatches usually reveal a tie-rule bug. Ask it to extend your solution to "return the room assignment" or to Meeting Rooms III, then check delays and long overflow yourself.</p>
      <p><b>Where AI goes wrong:</b> forgetting to sort by start before using the heap, comparing <code>peek() &lt; start</code> (back-to-back meetings then need extra rooms), sorting events without the "end before start" tie rule, or returning the number of heap pops instead of the heap size. <b>What you must still own:</b> the max-overlap = rooms proof, the endpoint convention, and choosing heap vs two arrays vs sweep for the follow-up being asked.</p>`,
    problems: [
      {
        title: 'Meeting Rooms II (minimum rooms)',
        level: 'Medium',
        tags: ['intervals', 'heap', 'sweep line', 'greedy'],
        companies: ['Google', 'Meta', 'Amazon', 'Uber', 'Bloomberg'],
        statement: `<p>Given an array of meeting time intervals <code>[start, end)</code>, return the <b>minimum number of conference rooms</b> required so that no two meetings in the same room overlap. A meeting that ends at time t and another that starts at time t can use the same room.</p>`,
        constraints: `1 ≤ N ≤ 10<sup>4</sup>, 0 ≤ start &lt; end ≤ 10<sup>6</sup>`,
        example: `<p>Input: [[0,30], [5,10], [15,20]]</p>
          ${H.table(['time', '0..4', '5..9', '10..14', '15..19', '20..29'], [['running', '1', '<span class="c-r">2</span>', '1', '<span class="c-r">2</span>', '1']])}
          <p>Output <b>2</b>. Why: [0,30) overlaps both others, but [5,10) and [15,20) never overlap each other, so they can share the second room. At most 2 meetings run at once.</p>`,
        brute: {
          why: `<p>For every meeting's start time, count how many meetings are running at that instant (O(N) each) and take the maximum: O(N<sup>2</sup>) = 10<sup>8</sup> for N = 10<sup>4</sup> — borderline, and hopeless for 10<sup>5</sup>. The waste: we recount from scratch at every start, although only one meeting begins or ends between neighbouring events.</p>`,
          code: { lang: 'java', code: `
            int brute(int[][] m) {
                int best = 0;
                for (int[] a : m) {                          // the peak happens at some start time
                    int running = 0;
                    for (int[] b : m) {
                        if (b[0] <= a[0] && a[0] < b[1]) running++;   // b is running at time a.start
                    }
                    best = Math.max(best, running);
                }
                return best;
            }`, alt: [{ lang: 'python', code: String.raw`
def min_meeting_rooms(intervals):
    best = 0
    for a in intervals:                      # the peak happens at some start time
        running = 0
        for b in intervals:
            if b[0] <= a[0] < b[1]:          # b is running at time a.start
                running += 1
        best = max(best, running)
    return best` }, { lang: 'js', code: String.raw`
function minMeetingRooms(intervals) {
  let best = 0;
  for (const a of intervals) {               // the peak happens at some start time
    let running = 0;
    for (const b of intervals) {
      if (b[0] <= a[0] && a[0] < b[1]) running++;   // b is running at time a.start
    }
    best = Math.max(best, running);
  }
  return best;
}` }, { lang: 'cpp', code: String.raw`
int minMeetingRooms(vector<vector<int>> intervals) {
    int best = 0;
    for (const auto& a : intervals) {        // the peak happens at some start time
        int running = 0;
        for (const auto& b : intervals) {
            if (b[0] <= a[0] && a[0] < b[1]) running++;   // b is running at time a.start
        }
        best = max(best, running);
    }
    return best;
}` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public int MinMeetingRooms(int[][] intervals) {
        int best = 0;
        foreach (int[] a in intervals) {                 // the peak happens at some start time
            int running = 0;
            foreach (int[] b in intervals) {
                if (b[0] <= a[0] && a[0] < b[1]) running++;   // b is running at time a.start
            }
            best = Math.Max(best, running);
        }
        return best;
    }
}` }] }
        },
        mcq: {
          q: 'Sorted by start, the heap of end times is {12, 20} and the next meeting is [12, 15). What happens?',
          options: ['Open a third room', 'Pop 12 and push 15 — reuse the room', 'Pop 20 and push 15', 'Nothing, skip the meeting'],
          answer: 1,
          explain: 'The earliest-free room ends at 12 and the meeting starts at 12. Half-open intervals do not clash at the boundary, so that room is free: pop 12, push 15. The heap stays size 2.'
        },
        hints: [
          `<p><b>Aha:</b> the number of rooms equals the maximum number of meetings that are running at the same moment.</p>`,
          `<p>Sort by start. Keep a min-heap of end times of rooms in use. For each meeting: if the smallest end ≤ this start, pop it (room freed); push this meeting's end. The heap size at the end is the answer. (Or: sort starts and ends separately and use two pointers.)</p>`,
          `<p>Edge cases: back-to-back meetings (use ≤ so the room is reused), a single meeting (1 room), identical meetings (each needs its own room). Recipe: sort by start → heap = [] → for each: if heap and heap.peek ≤ start: poll → offer end → return heap.size.</p>`
        ],
        tests: { sig: 'int[][] -> int', fn: 'minMeetingRooms', cases: [
          [[[[0, 30], [5, 10], [15, 20]]], 2],
          [[[[1, 5], [5, 10]]], 1],
          [[[[7, 10]]], 1],
          [[[[1, 10], [2, 9], [3, 8], [4, 7]]], 4],
          [[[[1, 5], [1, 5], [1, 5]]], 3],
          [[[[1, 5], [5, 10], [10, 15]]], 1],
          [[[[0, 1000000], [999999, 1000000]]], 2],
          [[[[9, 10], [4, 9], [4, 17]]], 2]
        ] },
        solution: {
          approach: `<p>Greedy by start time with a min-heap of end times: always reuse the room that frees earliest, open a new one only when none is free.</p>`,
          code: `
            class Solution {
                public int minMeetingRooms(int[][] intervals) {
                    Arrays.sort(intervals, (x, y) -> Integer.compare(x[0], y[0]));  // by start
                    PriorityQueue<Integer> ends = new PriorityQueue<>();             // busy rooms' end times
                    for (int[] m : intervals) {
                        if (!ends.isEmpty() && ends.peek() <= m[0]) {
                            ends.poll();              // earliest room is free at m[0] → reuse
                        }
                        ends.offer(m[1]);             // room busy until m[1]
                    }
                    return ends.size();
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().minMeetingRooms(new int[][]{{0, 30}, {5, 10}, {15, 20}})); // 2
                    System.out.println(new Solution().minMeetingRooms(new int[][]{{1, 5}, {5, 10}}));            // 1
                }
            }`,
          alt: [
            { lang: 'python', run: true, code: `import heapq

def min_meeting_rooms(intervals):
    ends = []                                   # min-heap of end times
    for s, e in sorted(intervals):              # by start
        if ends and ends[0] <= s:
            heapq.heapreplace(ends, e)          # reuse: pop earliest end, push this end
        else:
            heapq.heappush(ends, e)             # new room
    return len(ends)

print(min_meeting_rooms([[0, 30], [5, 10], [15, 20]]))  # 2` },
            { lang: 'js', code: `// JS has no built-in heap: a small binary min-heap (same class across this module).
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp; }
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a; a.push(x);
    let i = a.length - 1;
    while (i > 0) {                                   // sift up
      const p = (i - 1) >> 1;
      if (this.cmp(a[i], a[p]) >= 0) break;
      [a[i], a[p]] = [a[p], a[i]]; i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      for (let i = 0; ;) {                            // sift down
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && this.cmp(a[l], a[m]) < 0) m = l;
        if (r < a.length && this.cmp(a[r], a[m]) < 0) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]]; i = m;
      }
    }
    return top;
  }
}

function minMeetingRooms(intervals) {
  const sorted = intervals.slice().sort((x, y) => x[0] - y[0]);   // by start
  const ends = new MinHeap();                                    // busy rooms' end times
  for (const [s, e] of sorted) {
    if (ends.size() && ends.peek() <= s) ends.pop();             // earliest room is free -> reuse
    ends.push(e);                                                // room busy until e
  }
  return ends.size();
}` },
            { lang: 'cpp', code: `class Solution {
public:
    int minMeetingRooms(vector<vector<int>> intervals) {
        sort(intervals.begin(), intervals.end());                  // by start
        priority_queue<int, vector<int>, greater<int>> ends;       // MIN-heap (default is max)
        for (const auto& m : intervals) {
            if (!ends.empty() && ends.top() <= m[0]) ends.pop();   // reuse the earliest-free room
            ends.push(m[1]);
        }
        return (int)ends.size();
    }
};` }, { lang: 'csharp', code: String.raw`
using System;
using System.Collections.Generic;

public class Solution {
    public int MinMeetingRooms(int[][] intervals) {
        Array.Sort(intervals, (x, y) => x[0].CompareTo(y[0]));   // by start
        var ends = new MinHeap();                                // busy rooms' end times
        foreach (int[] m in intervals) {
            if (ends.Count > 0 && ends.Peek() <= m[0]) {
                ends.Pop();                   // earliest room is free at m[0] -> reuse
            }
            ends.Push(m[1]);                  // room busy until m[1]
        }
        return ends.Count;
    }

    // .NET Framework has no PriorityQueue: a small binary min-heap (same shape in every C# solution of this module).
    class MinHeap {
        private readonly List<int> h = new List<int>();
        public int Count { get { return h.Count; } }
        public int Peek() { return h[0]; }
        public void Push(int v) {
            h.Add(v);
            int i = h.Count - 1;
            while (i > 0 && h[(i - 1) / 2] > h[i]) { Swap(i, (i - 1) / 2); i = (i - 1) / 2; }
        }
        public int Pop() {
            int top = h[0];
            h[0] = h[h.Count - 1];
            h.RemoveAt(h.Count - 1);
            int i = 0;
            while (true) {
                int l = 2 * i + 1, r = l + 1, s = i;
                if (l < h.Count && h[l] < h[s]) s = l;
                if (r < h.Count && h[r] < h[s]) s = r;
                if (s == i) break;
                Swap(i, s); i = s;
            }
            return top;
        }
        private void Swap(int i, int j) { int t = h[i]; h[i] = h[j]; h[j] = t; }
    }
}` }
          ],
          dry: {
            head: ['meeting', 'heap before', 'peek ≤ start?', 'action', 'heap after', 'size'],
            rows: [
              ['[0,30)', '{}', '—', 'push 30', '{30}', '1'],
              ['[5,10)', '{30}', '30 ≤ 5? no', 'push 10', '{10, 30}', '2'],
              ['[15,20)', '{10, 30}', '10 ≤ 15? <span class="c-g">yes</span>', 'poll 10, push 20', '{20, 30}', '<span class="c-p">2</span>']
            ]
          },
          complexity: `<p><b>Time O(N log N)</b>: sorting plus N heap operations of O(log N). <b>Space O(N)</b> for the heap in the worst case (all meetings overlap).</p>`,
          followUps: ['Return which room each meeting gets.', 'Meeting Rooms III: delayed meetings and lowest-numbered free room.', 'Solve it without a heap using two sorted arrays.']
        }
      }
    ]
  });

  // =====================================================================
  // PRACTICE — Easy
  // =====================================================================
  practice.push({
    title: 'Meeting Rooms (can one person attend all?)',
    level: 'Easy',
    tags: ['intervals', 'sorting'],
    companies: ['Meta', 'Amazon', 'Google'],
    statement: `<p>Given meeting intervals <code>[start, end)</code>, return <code>true</code> if one person could attend <b>all</b> of them (no two overlap). A meeting ending at t and another starting at t do not overlap.</p>`,
    constraints: `0 ≤ N ≤ 10<sup>4</sup>, 0 ≤ start &lt; end ≤ 10<sup>6</sup>`,
    example: `<p>[[0,30],[5,10],[15,20]] → ${H.c('r', 'false')} (5 &lt; 30: the second meeting starts while the first is running).<br>[[7,10],[2,4]] → ${H.c('g', 'true')} (sorted: [2,4) then [7,10), and 7 ≥ 4).</p>`,
    brute: {
      why: `<p>Compare every pair of meetings for overlap: N(N−1)/2 ≈ 5·10<sup>7</sup> checks for N = 10<sup>4</sup>. It works but wastes effort — after sorting, only <b>neighbours</b> can clash first.</p>`,
      code: { lang: 'java', code: `
        boolean brute(int[][] m) {
            for (int i = 0; i < m.length; i++)
                for (int j = i + 1; j < m.length; j++)
                    if (m[i][0] < m[j][1] && m[j][0] < m[i][1]) return false;  // overlap test
            return true;
        }`, alt: [{ lang: 'python', code: String.raw`
def can_attend_meetings(m):
    for i in range(len(m)):
        for j in range(i + 1, len(m)):
            if m[i][0] < m[j][1] and m[j][0] < m[i][1]:
                return False                 # overlap test
    return True` }, { lang: 'js', code: String.raw`
function canAttendMeetings(m) {
  for (let i = 0; i < m.length; i++)
    for (let j = i + 1; j < m.length; j++)
      if (m[i][0] < m[j][1] && m[j][0] < m[i][1]) return false;   // overlap test
  return true;
}` }, { lang: 'cpp', code: String.raw`
bool canAttendMeetings(vector<vector<int>> m) {
    for (int i = 0; i < (int) m.size(); i++)
        for (int j = i + 1; j < (int) m.size(); j++)
            if (m[i][0] < m[j][1] && m[j][0] < m[i][1]) return false;   // overlap test
    return true;
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public bool CanAttendMeetings(int[][] m) {
        for (int i = 0; i < m.Length; i++)
            for (int j = i + 1; j < m.Length; j++)
                if (m[i][0] < m[j][1] && m[j][0] < m[i][1]) return false;  // overlap test
        return true;
    }
}` }] }
    },
    mcq: {
      q: 'After sorting by start, which check is enough?',
      options: ['Compare every pair again', 'm[i].start &lt; m[i−1].end for each i means a clash', 'm[i].end &lt; m[i−1].end means a clash', 'Check only the first and last meetings'],
      answer: 1,
      explain: 'If meeting i clashes with any earlier meeting, it also clashes with meeting i−1 or meeting i−1 clashes earlier — so the first clash always appears between neighbours in start order.'
    },
    hints: [
      `<p><b>Aha:</b> sort by start time; then a clash, if any, shows up between two <b>consecutive</b> meetings.</p>`,
      `<p>Sort by start (Java <code>Arrays.sort(m, (x, y) -&gt; Integer.compare(x[0], y[0]))</code>, Python <code>sorted(m)</code>), then one loop from i = 1 comparing <code>m[i][0]</code> with <code>m[i-1][1]</code>.</p>`,
      `<p>Edge cases: empty or single meeting → true; back-to-back [1,5) [5,8) → true (use strict &lt;). Recipe: sort → for i ≥ 1: if start[i] &lt; end[i−1] return false → return true.</p>`
    ],
    tests: { sig: 'int[][] -> bool', fn: 'canAttendMeetings', cases: [
      [[[[0, 30], [5, 10], [15, 20]]], false],
      [[[[7, 10], [2, 4]]], true],
      [[[]], true],
      [[[[1, 5]]], true],
      [[[[1, 5], [5, 8]]], true],
      [[[[1, 5], [4, 8]]], false],
      [[[[5, 8], [1, 5], [8, 9]]], true],
      [[[[1, 2], [1, 2]]], false]
    ] },
    solution: {
      approach: `<p>Sort by start; check neighbours.</p>`,
      code: `
        class Solution {
            public boolean canAttendMeetings(int[][] m) {
                Arrays.sort(m, (x, y) -> Integer.compare(x[0], y[0]));
                for (int i = 1; i < m.length; i++) {
                    if (m[i][0] < m[i - 1][1]) return false;   // starts before previous ends
                }
                return true;
            }

            public static void main(String[] args) {
                System.out.println(new Solution().canAttendMeetings(new int[][]{{0, 30}, {5, 10}, {15, 20}})); // false
                System.out.println(new Solution().canAttendMeetings(new int[][]{{7, 10}, {2, 4}}));            // true
            }
        }`,
      alt: [
        { lang: 'python', code: `def can_attend_meetings(m):
    m = sorted(m)                                     # by start
    return all(m[i][0] >= m[i - 1][1] for i in range(1, len(m)))   # nobody starts before the previous ends` },
        { lang: 'js', code: `function canAttendMeetings(m) {
  const s = m.slice().sort((x, y) => x[0] - y[0]);    // by start (numeric comparator)
  for (let i = 1; i < s.length; i++) {
    if (s[i][0] < s[i - 1][1]) return false;          // starts before previous ends
  }
  return true;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    bool canAttendMeetings(vector<vector<int>> m) {
        sort(m.begin(), m.end());                         // by start
        for (size_t i = 1; i < m.size(); i++)
            if (m[i][0] < m[i - 1][1]) return false;      // starts before previous ends
        return true;
    }
};` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public bool CanAttendMeetings(int[][] m) {
        Array.Sort(m, (x, y) => x[0].CompareTo(y[0]));
        for (int i = 1; i < m.Length; i++) {
            if (m[i][0] < m[i - 1][1]) return false;   // starts before previous ends
        }
        return true;
    }
}` }
      ],
      dry: { head: ['i', 'previous', 'current', 'start &lt; prev end?'], rows: [['1', '[2,4)', '[7,10)', '7 &lt; 4? no'], ['end', '', '', '<span class="c-g">true</span>']] },
      complexity: `<p><b>Time O(N log N)</b> for the sort, O(N) check. <b>Space O(log N)</b>–O(N) for the sort.</p>`
    }
  });

  practice.push({
    title: 'Height Checker (counting sort)',
    level: 'Easy',
    tags: ['counting sort', 'array'],
    companies: ['Amazon', 'Adobe'],
    statement: `<p>Students stand in a line with heights <code>heights[i]</code>. The expected line is the same heights in non-decreasing order. Return how many positions <code>i</code> have <code>heights[i] != expected[i]</code>.</p>`,
    constraints: `1 ≤ N ≤ 100, 1 ≤ heights[i] ≤ 100`,
    example: `${H.arr([1, 1, 4, 2, 1, 3], { label: 'heights', hl: { 2: 'r', 4: 'r', 5: 'r' } })}${H.arr([1, 1, 1, 2, 3, 4], { label: 'expected', hl: { 2: 'r', 4: 'r', 5: 'r' } })}<p>Output <b>3</b>: indices 2, 4, 5 differ.</p>`,
    brute: {
      why: `<p>Copy the array, bubble-sort the copy (O(N<sup>2</sup>)), then compare. Fine for N = 100, but it ignores that heights are only 1..100 — counting gives O(N + 100) and scales to millions of students.</p>`,
      code: { lang: 'java', code: `
        int brute(int[] h) {
            int[] e = h.clone();
            for (int i = 0; i < e.length; i++)
                for (int j = 0; j + 1 < e.length - i; j++)
                    if (e[j] > e[j + 1]) { int t = e[j]; e[j] = e[j + 1]; e[j + 1] = t; }
            int diff = 0;
            for (int i = 0; i < h.length; i++) if (h[i] != e[i]) diff++;
            return diff;
        }`, alt: [{ lang: 'python', code: String.raw`
def height_checker(heights):
    e = heights[:]
    for i in range(len(e)):
        for j in range(len(e) - 1 - i):
            if e[j] > e[j + 1]:
                e[j], e[j + 1] = e[j + 1], e[j]
    diff = 0
    for i in range(len(heights)):
        if heights[i] != e[i]:
            diff += 1
    return diff` }, { lang: 'js', code: String.raw`
function heightChecker(heights) {
  const e = heights.slice();
  for (let i = 0; i < e.length; i++)
    for (let j = 0; j + 1 < e.length - i; j++)
      if (e[j] > e[j + 1]) { const t = e[j]; e[j] = e[j + 1]; e[j + 1] = t; }
  let diff = 0;
  for (let i = 0; i < heights.length; i++) if (heights[i] !== e[i]) diff++;
  return diff;
}` }, { lang: 'cpp', code: String.raw`
int heightChecker(const vector<int>& heights) {
    vector<int> e = heights;
    for (int i = 0; i < (int) e.size(); i++)
        for (int j = 0; j + 1 < (int) e.size() - i; j++)
            if (e[j] > e[j + 1]) swap(e[j], e[j + 1]);
    int diff = 0;
    for (int i = 0; i < (int) heights.size(); i++) if (heights[i] != e[i]) diff++;
    return diff;
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int HeightChecker(int[] heights) {
        int[] e = (int[])heights.Clone();
        for (int i = 0; i < e.Length; i++)
            for (int j = 0; j + 1 < e.Length - i; j++)
                if (e[j] > e[j + 1]) { int t = e[j]; e[j] = e[j + 1]; e[j + 1] = t; }
        int diff = 0;
        for (int i = 0; i < heights.Length; i++) if (heights[i] != e[i]) diff++;
        return diff;
    }
}` }] }
    },
    mcq: {
      q: 'Heights are between 1 and 100. What is the fastest way to know the expected height at each position?',
      options: ['Sort with merge sort', 'Count each height, then walk heights 1..100 to generate the expected sequence', 'Use a HashSet', 'Binary search each height'],
      answer: 1,
      explain: 'With only 100 possible values, a count array produces the sorted sequence in O(N + 100) without comparing anything.'
    },
    hints: [
      `<p><b>Aha:</b> you never need the whole sorted array at once — just generate expected[i] on the fly from the counts while scanning heights.</p>`,
      `<p>A count array of size 101 (heights 0..100). Then a pointer <code>h</code> over heights 1..100: skip heights whose count is 0; compare with heights[i]; decrement cnt[h].</p>`,
      `<p>Edge cases: all equal → 0; strictly decreasing → nearly all differ. Recipe: count → h = 1 → for i: while cnt[h] == 0: h++ → if heights[i] != h: ans++ → cnt[h]−−.</p>`
    ],
    tests: { sig: 'int[] -> int', fn: 'heightChecker', cases: [
      [[[1, 1, 4, 2, 1, 3]], 3],
      [[[5, 1, 2, 3, 4]], 5],
      [[[1, 2, 3, 4, 5]], 0],
      [[[1]], 0],
      [[[2, 2, 2]], 0],
      [[[100, 1]], 2],
      [[[3, 1, 2]], 3]
    ] },
    solution: {
      approach: `<p>Counting sort generated lazily while comparing.</p>`,
      code: `
        class Solution {
            public int heightChecker(int[] heights) {
                int[] cnt = new int[101];
                for (int x : heights) cnt[x]++;
                int ans = 0, h = 1;
                for (int x : heights) {
                    while (cnt[h] == 0) h++;          // next height in sorted order
                    if (x != h) ans++;
                    cnt[h]--;
                }
                return ans;
            }

            public static void main(String[] args) {
                System.out.println(new Solution().heightChecker(new int[]{1, 1, 4, 2, 1, 3})); // 3
            }
        }`,
      alt: [
        { lang: 'python', code: `def height_checker(heights):
    cnt = [0] * 101
    for x in heights:
        cnt[x] += 1
    ans, h = 0, 1
    for x in heights:
        while cnt[h] == 0:          # next height in sorted order
            h += 1
        if x != h:
            ans += 1
        cnt[h] -= 1
    return ans` },
        { lang: 'js', code: `function heightChecker(heights) {
  const cnt = new Int32Array(101);
  for (const x of heights) cnt[x]++;
  let ans = 0, h = 1;
  for (const x of heights) {
    while (cnt[h] === 0) h++;       // next height in sorted order
    if (x !== h) ans++;
    cnt[h]--;
  }
  return ans;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int heightChecker(const vector<int>& heights) {
        array<int, 101> cnt{};
        for (int x : heights) cnt[x]++;
        int ans = 0, h = 1;
        for (int x : heights) {
            while (cnt[h] == 0) h++;    // next height in sorted order
            if (x != h) ans++;
            cnt[h]--;
        }
        return ans;
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int HeightChecker(int[] heights) {
        int[] cnt = new int[101];
        foreach (int x in heights) cnt[x]++;
        int ans = 0, h = 1;
        foreach (int x in heights) {
            while (cnt[h] == 0) h++;          // next height in sorted order
            if (x != h) ans++;
            cnt[h]--;
        }
        return ans;
    }
}` }
      ],
      complexity: `<p><b>Time O(N + 100)</b>, <b>space O(100)</b>.</p>`
    }
  });

  practice.push({
    title: 'Relative Sort Array',
    level: 'Easy',
    tags: ['counting sort', 'custom order'],
    companies: ['Amazon', 'DE Shaw'],
    statement: `<p>Given <code>arr1</code> and <code>arr2</code> (elements of arr2 are distinct and all appear in arr1), sort arr1 so that items appear in the <b>same relative order as in arr2</b>; items not in arr2 go at the end in ascending order.</p>`,
    constraints: `1 ≤ arr1.length, arr2.length ≤ 1000, 0 ≤ values ≤ 1000`,
    example: `<p>arr1 = [2,3,1,3,2,4,6,7,9,2,19], arr2 = [2,1,4,3,9,6]</p>${H.arr([2, 2, 2, 1, 4, 3, 3, 9, 6, 7, 19], { label: 'output', hl: { 9: 'y', 10: 'y' } })}<p>All 2s, then 1, 4, both 3s, 9, 6 (arr2's order), then the leftovers ${H.c('y', '7, 19')} ascending.</p>`,
    brute: {
      why: `<p>A comparator that looks up each value's position in arr2 with a linear scan: O(N log N · M). Works, but each comparison does an O(M) search. The waste disappears with a count array (values ≤ 1000).</p>`,
      code: { lang: 'java', code: `
        int[] brute(int[] arr1, int[] arr2) {
            List<Integer> arr2List = new ArrayList<>();
            for (int x : arr2) arr2List.add(x);
            Integer[] b = new Integer[arr1.length];
            for (int i = 0; i < arr1.length; i++) b[i] = arr1[i];
            Arrays.sort(b, (x, y) -> {
                int px = arr2List.indexOf(x), py = arr2List.indexOf(y);   // O(M) each!
                if (px >= 0 && py >= 0) return Integer.compare(px, py);
                if (px >= 0) return -1;
                if (py >= 0) return 1;
                return Integer.compare(x, y);
            });
            int[] out = new int[b.length];
            for (int i = 0; i < b.length; i++) out[i] = b[i];
            return out;
        }`, alt: [{ lang: 'python', code: String.raw`
from functools import cmp_to_key

def relative_sort_array(arr1, arr2):
    def pos(v):
        return arr2.index(v) if v in arr2 else -1     # O(M) each!

    def cmp(x, y):
        px, py = pos(x), pos(y)
        if px >= 0 and py >= 0:
            return (px > py) - (px < py)
        if px >= 0:
            return -1
        if py >= 0:
            return 1
        return (x > y) - (x < y)

    return sorted(arr1, key=cmp_to_key(cmp))` }, { lang: 'js', code: String.raw`
function relativeSortArray(arr1, arr2) {
  return [...arr1].sort((x, y) => {
    const px = arr2.indexOf(x), py = arr2.indexOf(y);   // O(M) each!
    if (px >= 0 && py >= 0) return px - py;
    if (px >= 0) return -1;
    if (py >= 0) return 1;
    return x - y;
  });
}` }, { lang: 'cpp', code: String.raw`
vector<int> relativeSortArray(const vector<int>& arr1, const vector<int>& arr2) {
    auto pos = [&](int v) {                              // O(M) each!
        auto it = find(arr2.begin(), arr2.end(), v);
        return it == arr2.end() ? -1 : (int) (it - arr2.begin());
    };
    vector<int> b = arr1;
    sort(b.begin(), b.end(), [&](int x, int y) {         // true when x must come first
        int px = pos(x), py = pos(y);
        if (px >= 0 && py >= 0) return px < py;
        if (px >= 0) return true;
        if (py >= 0) return false;
        return x < y;
    });
    return b;
}` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public int[] RelativeSortArray(int[] arr1, int[] arr2) {
        int[] b = (int[])arr1.Clone();
        Array.Sort(b, (x, y) => {
            int px = Array.IndexOf(arr2, x), py = Array.IndexOf(arr2, y);   // O(M) each!
            if (px >= 0 && py >= 0) return px.CompareTo(py);
            if (px >= 0) return -1;
            if (py >= 0) return 1;
            return x.CompareTo(y);
        });
        return b;
    }
}` }] }
    },
    mcq: {
      q: 'Values are ≤ 1000. Which plan is O(N + M + 1000)?',
      options: ['Comparator with indexOf', 'Count arr1 values; emit arr2 values by count; then emit leftovers by scanning 0..1000', 'Sort arr1 then binary search arr2', 'HashSet of arr2'],
      answer: 1,
      explain: 'The count array answers "how many copies of v" instantly; walking arr2 gives the custom order, and walking 0..1000 gives the ascending tail.'
    },
    hints: [
      `<p><b>Aha:</b> this is counting sort with a custom order for some values.</p>`,
      `<p><code>cnt[1001]</code>. For each v in arr2: write v cnt[v] times, set cnt[v] = 0. Then for v = 0..1000: write v cnt[v] times.</p>`,
      `<p>Edge cases: arr2 contains every value (no tail); duplicates in arr1. Recipe: count → arr2 pass → zero those counts → 0..1000 pass.</p>`
    ],
    tests: { sig: 'int[] int[] -> int[]', fn: 'relativeSortArray', cases: [
      [[[2, 3, 1, 3, 2, 4, 6, 7, 9, 2, 19], [2, 1, 4, 3, 9, 6]], [2, 2, 2, 1, 4, 3, 3, 9, 6, 7, 19]],
      [[[28, 6, 22, 8, 44, 17], [22, 28, 8, 6]], [22, 28, 8, 6, 17, 44]],
      [[[1], [1]], [1]],
      [[[5, 4, 3], [3]], [3, 4, 5]],
      [[[0, 1000, 0, 1000], [1000]], [1000, 1000, 0, 0]],
      [[[2, 1, 2], [2, 1]], [2, 2, 1]]
    ] },
    solution: {
      approach: `<p>Counting sort with two output phases.</p>`,
      code: `
        class Solution {
            public int[] relativeSortArray(int[] arr1, int[] arr2) {
                int[] cnt = new int[1001];
                for (int x : arr1) cnt[x]++;
                int[] out = new int[arr1.length];
                int w = 0;
                for (int v : arr2) {                 // custom order first
                    while (cnt[v]-- > 0) out[w++] = v;
                    cnt[v] = 0;                      // undo the final -1 from the loop test
                }
                for (int v = 0; v <= 1000; v++) {    // leftovers ascending
                    while (cnt[v] > 0) { out[w++] = v; cnt[v]--; }
                }
                return out;
            }

            public static void main(String[] args) {
                int[] r = new Solution().relativeSortArray(new int[]{2, 3, 1, 3, 2, 4, 6, 7, 9, 2, 19}, new int[]{2, 1, 4, 3, 9, 6});
                System.out.println(Arrays.toString(r)); // [2, 2, 2, 1, 4, 3, 3, 9, 6, 7, 19]
            }
        }`,
      alt: [
        { lang: 'python', code: `def relative_sort_array(arr1, arr2):
    cnt = [0] * 1001
    for x in arr1:
        cnt[x] += 1
    out = []
    for v in arr2:                   # custom order first
        out += [v] * cnt[v]
        cnt[v] = 0
    for v in range(1001):            # leftovers ascending
        out += [v] * cnt[v]
    return out` },
        { lang: 'js', code: `function relativeSortArray(arr1, arr2) {
  const cnt = new Int32Array(1001);
  for (const x of arr1) cnt[x]++;
  const out = [];
  for (const v of arr2) {                 // custom order first
    for (; cnt[v] > 0; cnt[v]--) out.push(v);
  }
  for (let v = 0; v <= 1000; v++) {       // leftovers ascending
    for (; cnt[v] > 0; cnt[v]--) out.push(v);
  }
  return out;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<int> relativeSortArray(const vector<int>& arr1, const vector<int>& arr2) {
        array<int, 1001> cnt{};
        for (int x : arr1) cnt[x]++;
        vector<int> out;
        for (int v : arr2) {                       // custom order first
            out.insert(out.end(), cnt[v], v);
            cnt[v] = 0;
        }
        for (int v = 0; v <= 1000; v++)            // leftovers ascending
            out.insert(out.end(), cnt[v], v);
        return out;
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int[] RelativeSortArray(int[] arr1, int[] arr2) {
        int[] cnt = new int[1001];
        foreach (int x in arr1) cnt[x]++;
        int[] result = new int[arr1.Length];
        int w = 0;
        foreach (int v in arr2) {                // custom order first
            while (cnt[v]-- > 0) result[w++] = v;
            cnt[v] = 0;                          // undo the final -1 from the loop test
        }
        for (int v = 0; v <= 1000; v++) {        // leftovers ascending
            while (cnt[v] > 0) { result[w++] = v; cnt[v]--; }
        }
        return result;
    }
}` }
      ],
      complexity: `<p><b>Time O(N + M + 1001)</b>, <b>space O(1001)</b> plus the output.</p>`
    }
  });

  practice.push({
    title: 'Merge Sorted Array (in place, from the back)',
    level: 'Easy',
    tags: ['merge step', 'two pointers'],
    companies: ['Meta', 'Microsoft', 'Amazon', 'Apple'],
    statement: `<p><code>nums1</code> has length m + n: its first m items are sorted and the last n are empty (0). <code>nums2</code> holds n sorted items. Merge nums2 into nums1 so nums1 becomes one sorted array, <b>in place</b>.</p>`,
    constraints: `0 ≤ m, n ≤ 200, 1 ≤ m + n, −10<sup>9</sup> ≤ values ≤ 10<sup>9</sup>`,
    example: `${H.arr([1, 2, 3, 0, 0, 0], { label: 'nums1 (m = 3)', hl: { 3: 'm', 4: 'm', 5: 'm' } })}${H.arr([2, 5, 6], { label: 'nums2 (n = 3)' })}${H.arr([1, 2, 2, 3, 5, 6], { label: 'result', hl: { 4: 'g', 5: 'g' } })}<p>Filling from the <b>back</b> means we never overwrite an unread nums1 value.</p>`,
    brute: {
      why: `<p>Copy nums2 into the empty tail and call the library sort: O((m+n) log(m+n)). It ignores that both parts are already sorted — a single merge is linear.</p>`,
      code: { lang: 'java', code: `
        void brute(int[] nums1, int m, int[] nums2, int n) {
            for (int i = 0; i < n; i++) nums1[m + i] = nums2[i];
            Arrays.sort(nums1);
        }`, alt: [{ lang: 'python', code: String.raw`
def merge(nums1, m, nums2, n):
    for i in range(n):
        nums1[m + i] = nums2[i]
    nums1.sort()` }, { lang: 'js', code: String.raw`
function merge(nums1, m, nums2, n) {
  for (let i = 0; i < n; i++) nums1[m + i] = nums2[i];
  nums1.sort((a, b) => a - b);
}` }, { lang: 'cpp', code: String.raw`
void merge(vector<int>& nums1, int m, const vector<int>& nums2, int n) {
    for (int i = 0; i < n; i++) nums1[m + i] = nums2[i];
    sort(nums1.begin(), nums1.end());
}` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public void Merge(int[] nums1, int m, int[] nums2, int n) {
        for (int i = 0; i < n; i++) nums1[m + i] = nums2[i];
        Array.Sort(nums1);
    }
}` }] }
    },
    mcq: {
      q: 'Why merge from the back instead of the front?',
      options: ['It is faster in Big-O', 'The back of nums1 is empty space, so writing there never destroys unread values', 'The language requires it', 'To keep the sort stable'],
      answer: 1,
      explain: 'Writing the largest items into the free tail first means the write pointer k is always ≥ the read pointer i, so no unread nums1 value is overwritten.'
    },
    hints: [
      `<p><b>Aha:</b> this is merge sort's merge step, run right-to-left: the biggest remaining item goes to the last free slot.</p>`,
      `<p>Pointers i = m − 1, j = n − 1, k = m + n − 1. While j ≥ 0: put the larger of nums1[i] (if i ≥ 0) and nums2[j] at k.</p>`,
      `<p>Edge cases: m = 0 (copy all of nums2); n = 0 (nothing to do); leftover nums1 items are already in place. Recipe: while j ≥ 0: if i ≥ 0 and nums1[i] &gt; nums2[j]: nums1[k−−] = nums1[i−−] else nums1[k−−] = nums2[j−−].</p>`
    ],
    tests: { sig: 'int[] int int[] int -> void', fn: 'merge', mutate: 0, cases: [
      [[[1, 2, 3, 0, 0, 0], 3, [2, 5, 6], 3], [1, 2, 2, 3, 5, 6]],
      [[[1], 1, [], 0], [1]],
      [[[0], 0, [1], 1], [1]],
      [[[4, 5, 6, 0, 0, 0], 3, [1, 2, 3], 3], [1, 2, 3, 4, 5, 6]],
      [[[1, 2, 3, 0, 0], 3, [4, 5], 2], [1, 2, 3, 4, 5]],
      [[[-1000000000, 0, 0], 1, [-1000000000, 1000000000], 2], [-1000000000, -1000000000, 1000000000]],
      [[[2, 2, 0, 0], 2, [2, 2], 2], [2, 2, 2, 2]]
    ] },
    solution: {
      approach: `<p>Backward merge with three pointers.</p>`,
      code: `
        class Solution {
            public void merge(int[] nums1, int m, int[] nums2, int n) {
                int i = m - 1, j = n - 1, k = m + n - 1;
                while (j >= 0) {                              // once nums2 is used up we are done
                    if (i >= 0 && nums1[i] > nums2[j]) nums1[k--] = nums1[i--];
                    else nums1[k--] = nums2[j--];
                }
            }

            public static void main(String[] args) {
                int[] a = {1, 2, 3, 0, 0, 0};
                new Solution().merge(a, 3, new int[]{2, 5, 6}, 3);
                System.out.println(Arrays.toString(a)); // [1, 2, 2, 3, 5, 6]
            }
        }`,
      alt: [
        { lang: 'python', code: `def merge(nums1, m, nums2, n):
    i, j, k = m - 1, n - 1, m + n - 1
    while j >= 0:                                # once nums2 is used up we are done
        if i >= 0 and nums1[i] > nums2[j]:
            nums1[k] = nums1[i]; i -= 1
        else:
            nums1[k] = nums2[j]; j -= 1
        k -= 1` },
        { lang: 'js', code: `function merge(nums1, m, nums2, n) {
  let i = m - 1, j = n - 1, k = m + n - 1;
  while (j >= 0) {                               // once nums2 is used up we are done
    nums1[k--] = i >= 0 && nums1[i] > nums2[j] ? nums1[i--] : nums2[j--];
  }
}` },
        { lang: 'cpp', code: `class Solution {
public:
    void merge(vector<int>& nums1, int m, const vector<int>& nums2, int n) {
        int i = m - 1, j = n - 1, k = m + n - 1;
        while (j >= 0)                           // once nums2 is used up we are done
            nums1[k--] = (i >= 0 && nums1[i] > nums2[j]) ? nums1[i--] : nums2[j--];
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public void Merge(int[] nums1, int m, int[] nums2, int n) {
        int i = m - 1, j = n - 1, k = m + n - 1;
        while (j >= 0) {                              // once nums2 is used up we are done
            if (i >= 0 && nums1[i] > nums2[j]) nums1[k--] = nums1[i--];
            else nums1[k--] = nums2[j--];
        }
    }
}` }
      ],
      dry: { head: ['i', 'j', 'k', 'compare', 'nums1'], rows: [['2', '2', '5', '3 vs 6 → 6', '1 2 3 0 0 6'], ['2', '1', '4', '3 vs 5 → 5', '1 2 3 0 5 6'], ['2', '0', '3', '3 vs 2 → 3', '1 2 3 3 5 6'], ['1', '0', '2', '2 vs 2 → 2 (nums2)', '<span class="c-g">1 2 2 3 5 6</span>']] },
      complexity: `<p><b>Time O(m + n)</b>, <b>space O(1)</b>.</p>`
    }
  });

  // =====================================================================
  // PRACTICE — Medium
  // =====================================================================
  practice.push({
    title: 'Sort Colors (Dutch National Flag)',
    level: 'Medium',
    tags: ['3-way partition', 'two pointers', 'counting sort'],
    companies: ['Microsoft', 'Amazon', 'Meta', 'Adobe'],
    statement: `<p>An array holds only 0s (red), 1s (white) and 2s (blue). Sort it in place so all 0s come first, then 1s, then 2s — in <b>one pass</b> with O(1) extra space, without calling a library sort.</p>`,
    constraints: `1 ≤ N ≤ 300 (follow-up: think N = 10<sup>7</sup>), nums[i] ∈ {0, 1, 2}`,
    example: `${H.arr([2, 0, 2, 1, 1, 0], { label: 'input' })}${H.arr([0, 0, 1, 1, 2, 2], { label: 'output', hl: { 0: 'r', 1: 'r', 4: 'b', 5: 'b' } })}<p>Three zones grow from the edges: 0s from the left, 2s from the right, 1s stay in the middle.</p>`,
    brute: {
      why: `<p>Bubble sort: O(N<sup>2</sup>) swaps. Counting sort is O(N) but needs <b>two</b> passes (count, then rewrite). The one-pass 3-way partition puts every element in its zone the first time it is looked at.</p>`,
      code: { lang: 'java', code: `
        void brute(int[] a) {
            for (int i = 0; i < a.length; i++)
                for (int j = 0; j + 1 < a.length - i; j++)
                    if (a[j] > a[j + 1]) { int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; }
        }`, alt: [{ lang: 'python', code: String.raw`
def sort_colors(a):
    for i in range(len(a)):
        for j in range(len(a) - 1 - i):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]` }, { lang: 'js', code: String.raw`
function sortColors(a) {
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j + 1 < a.length - i; j++)
      if (a[j] > a[j + 1]) { const t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; }
}` }, { lang: 'cpp', code: String.raw`
void sortColors(vector<int>& a) {
    for (int i = 0; i < (int) a.size(); i++)
        for (int j = 0; j + 1 < (int) a.size() - i; j++)
            if (a[j] > a[j + 1]) swap(a[j], a[j + 1]);
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public void SortColors(int[] a) {
        for (int i = 0; i < a.Length; i++)
            for (int j = 0; j + 1 < a.Length - i; j++)
                if (a[j] > a[j + 1]) { int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; }
    }
}` }] }
    },
    mcq: {
      q: 'In the Dutch-flag loop, after swapping a[i] with a[gt] (because a[i] == 2), why do we NOT advance i?',
      options: ['Because i is already at the end', 'The value just swapped in from gt has not been examined yet', 'To keep the sort stable', 'Because gt also does not move'],
      answer: 1,
      explain: 'a[gt] came from the unknown zone, so it could be 0, 1 or 2 and must be checked. Values swapped from lt are already known to be 1, so there we advance i.'
    },
    hints: [
      `<p><b>Aha:</b> keep four zones: [0, lt) = 0s, [lt, i) = 1s, [i, gt] = unknown, (gt, end] = 2s. Shrink the unknown zone by one element each step.</p>`,
      `<p>If a[i] == 0: swap with a[lt], lt++, i++. If a[i] == 2: swap with a[gt], gt−− (i stays). If 1: i++. Stop when i &gt; gt.</p>`,
      `<p>Edge cases: all one colour; length 1; already sorted. Recipe: lt = 0, i = 0, gt = n−1 → while i ≤ gt → 3 cases.</p>`
    ],
    tests: { sig: 'int[] -> void', fn: 'sortColors', mutate: 0, cases: [
      [[[2, 0, 2, 1, 1, 0]], [0, 0, 1, 1, 2, 2]],
      [[[2, 0, 1]], [0, 1, 2]],
      [[[0]], [0]],
      [[[1]], [1]],
      [[[2, 2, 2]], [2, 2, 2]],
      [[[0, 0, 1, 1]], [0, 0, 1, 1]],
      [[[1, 2, 0, 2, 1, 0, 0]], [0, 0, 0, 1, 1, 2, 2]]
    ] },
    solution: {
      approach: `<p>Dijkstra's 3-way partition with pivot value 1.</p>`,
      code: `
        class Solution {
            public void sortColors(int[] a) {
                int lt = 0, i = 0, gt = a.length - 1;
                while (i <= gt) {
                    if (a[i] == 0) { swap(a, lt, i); lt++; i++; }   // grow the 0-zone
                    else if (a[i] == 2) { swap(a, i, gt); gt--; }    // grow the 2-zone, re-check a[i]
                    else i++;                                         // 1 stays in the middle
                }
            }

            private void swap(int[] a, int x, int y) { int t = a[x]; a[x] = a[y]; a[y] = t; }

            public static void main(String[] args) {
                int[] a = {2, 0, 2, 1, 1, 0};
                new Solution().sortColors(a);
                System.out.println(Arrays.toString(a)); // [0, 0, 1, 1, 2, 2]
            }
        }`,
      alt: [
        { lang: 'python', code: `def sort_colors(a):
    lt, i, gt = 0, 0, len(a) - 1
    while i <= gt:
        if a[i] == 0:                            # grow the 0-zone
            a[lt], a[i] = a[i], a[lt]
            lt += 1; i += 1
        elif a[i] == 2:                          # grow the 2-zone, re-check a[i]
            a[i], a[gt] = a[gt], a[i]
            gt -= 1
        else:
            i += 1                               # 1 stays in the middle` },
        { lang: 'js', code: `function sortColors(a) {
  let lt = 0, i = 0, gt = a.length - 1;
  while (i <= gt) {
    if (a[i] === 0) { [a[lt], a[i]] = [a[i], a[lt]]; lt++; i++; }   // grow the 0-zone
    else if (a[i] === 2) { [a[i], a[gt]] = [a[gt], a[i]]; gt--; }    // grow the 2-zone, re-check a[i]
    else i++;                                                         // 1 stays in the middle
  }
}` },
        { lang: 'cpp', code: `class Solution {
public:
    void sortColors(vector<int>& a) {
        int lt = 0, i = 0, gt = (int)a.size() - 1;
        while (i <= gt) {
            if (a[i] == 0) swap(a[lt++], a[i++]);      // grow the 0-zone
            else if (a[i] == 2) swap(a[i], a[gt--]);   // grow the 2-zone, re-check a[i]
            else i++;                                  // 1 stays in the middle
        }
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public void SortColors(int[] a) {
        int lt = 0, i = 0, gt = a.Length - 1;
        while (i <= gt) {
            if (a[i] == 0) { Swap(a, lt, i); lt++; i++; }   // grow the 0-zone
            else if (a[i] == 2) { Swap(a, i, gt); gt--; }    // grow the 2-zone, re-check a[i]
            else i++;                                         // 1 stays in the middle
        }
    }

    private void Swap(int[] a, int x, int y) { int t = a[x]; a[x] = a[y]; a[y] = t; }
}` }
      ],
      dry: { head: ['lt', 'i', 'gt', 'a[i]', 'array after'], rows: [['0', '0', '5', '2', '0 0 2 1 1 2'], ['0', '0', '4', '0', '0 0 2 1 1 2'], ['1', '1', '4', '0', '0 0 2 1 1 2'], ['2', '2', '4', '2', '0 0 1 1 2 2'], ['2', '2', '3', '1', '…i = 4 &gt; gt → <span class="c-g">done</span>']] },
      complexity: `<p><b>Time O(N)</b> — each step either advances i or shrinks gt. <b>Space O(1)</b>.</p>`
    }
  });

  practice.push({
    title: 'Kth Largest Element in an Array',
    level: 'Medium',
    tags: ['quickselect', '3-way partition', 'randomized'],
    companies: ['Meta', 'Amazon', 'Google', 'LinkedIn', 'Spotify'],
    statement: `<p>Return the <b>k-th largest</b> element of an unsorted array (the k-th in sorted descending order, counting duplicates). Can you do it without sorting the whole array?</p>`,
    constraints: `1 ≤ k ≤ N ≤ 10<sup>5</sup>, −10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup> (many duplicates possible)`,
    example: `<p>[3,2,3,1,2,4,5,5,6], k = 4 → sorted descending 6, 5, 5, ${H.c('p', '4')}, 3, 3, 2, 2, 1 → output <b>4</b>.</p>`,
    brute: {
      why: `<p>Sort a copy with the library sort, then index N − k: O(N log N). It orders everything when only one position matters.</p>`,
      code: { lang: 'java', code: `
        int brute(int[] nums, int k) {
            int[] b = nums.clone();
            Arrays.sort(b);
            return b[b.length - k];
        }`, alt: [{ lang: 'python', code: String.raw`
def find_kth_largest(nums, k):
    b = sorted(nums)
    return b[len(b) - k]` }, { lang: 'js', code: String.raw`
function findKthLargest(nums, k) {
  const b = [...nums].sort((x, y) => x - y);
  return b[b.length - k];
}` }, { lang: 'cpp', code: String.raw`
int findKthLargest(vector<int> a, int k) {
    sort(a.begin(), a.end());
    return a[a.size() - k];
}` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public int FindKthLargest(int[] nums, int k) {
        int[] b = (int[])nums.Clone();
        Array.Sort(b);
        return b[b.Length - k];
    }
}` }] }
    },
    mcq: {
      q: 'The input has 10<sup>5</sup> copies of the same value. Which quickselect survives?',
      options: ['Lomuto with last-element pivot', 'Lomuto with random pivot', '3-way partition with a random pivot', 'All are O(N) here'],
      answer: 2,
      explain: 'With all-equal values a 2-way partition puts everything on one side every time → O(N<sup>2</sup>). The 3-way partition groups all copies of the pivot in one pass and finishes immediately.'
    },
    hints: [
      `<p><b>Aha:</b> k-th largest = index N − k in ascending order. Partition, then continue only on the side containing that index.</p>`,
      `<p>Use a <b>random</b> pivot and a <b>3-way</b> partition (&lt; | = | &gt;). If the target index falls inside the "= pivot" block, the pivot is the answer.</p>`,
      `<p>Edge cases: k = 1 (max), k = N (min), heavy duplicates, adversarial sorted input. Recipe: target = N − k → loop: random pivot → 3-way partition → move lo/hi or return.</p>`
    ],
    tests: { sig: 'int[] int -> int', fn: 'findKthLargest', cases: [
      [[[3, 2, 1, 5, 6, 4], 2], 5],
      [[[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], 4],
      [[[1], 1], 1],
      [[[7, 7, 7, 7], 3], 7],
      [[[-10000, 10000], 1], 10000],
      [[[-10000, 10000], 2], -10000],
      [[[2, 1], 2], 1],
      [[[5, 3, 5, 1], 2], 5]
    ] },
    solution: {
      approach: `<p>Iterative quickselect with random pivot and Dutch-flag partition: expected O(N) even with duplicates.</p>`,
      code: `
        class Solution {
            private final Random rnd = new Random();

            public int findKthLargest(int[] nums, int k) {
                int target = nums.length - k;              // index in ascending order
                int lo = 0, hi = nums.length - 1;
                while (true) {
                    int pivot = nums[lo + rnd.nextInt(hi - lo + 1)];
                    int lt = lo, i = lo, gt = hi;
                    while (i <= gt) {                      // 3-way partition of nums[lo..hi]
                        if (nums[i] < pivot) swap(nums, lt++, i++);
                        else if (nums[i] > pivot) swap(nums, i, gt--);
                        else i++;
                    }
                    // now: [lo..lt-1] < pivot, [lt..gt] == pivot, [gt+1..hi] > pivot
                    if (target < lt) hi = lt - 1;
                    else if (target > gt) lo = gt + 1;
                    else return pivot;
                }
            }

            private void swap(int[] a, int x, int y) { int t = a[x]; a[x] = a[y]; a[y] = t; }

            public static void main(String[] args) {
                System.out.println(new Solution().findKthLargest(new int[]{3, 2, 3, 1, 2, 4, 5, 5, 6}, 4)); // 4
            }
        }`,
      alt: [
        { lang: 'python', code: `import random

def find_kth_largest(nums, k):
    a = list(nums)
    target = len(a) - k                          # index in ascending order
    lo, hi = 0, len(a) - 1
    while True:
        pivot = a[random.randint(lo, hi)]
        lt, i, gt = lo, lo, hi
        while i <= gt:                           # 3-way partition of a[lo..hi]
            if a[i] < pivot:
                a[lt], a[i] = a[i], a[lt]; lt += 1; i += 1
            elif a[i] > pivot:
                a[i], a[gt] = a[gt], a[i]; gt -= 1
            else:
                i += 1
        if target < lt:                          # [lo..lt-1] < pivot
            hi = lt - 1
        elif target > gt:                        # [gt+1..hi] > pivot
            lo = gt + 1
        else:
            return pivot                         # target is inside the == pivot block` },
        { lang: 'js', code: `function findKthLargest(nums, k) {
  const a = nums.slice();
  const target = a.length - k;                   // index in ascending order
  let lo = 0, hi = a.length - 1;
  while (true) {
    const pivot = a[lo + Math.floor(Math.random() * (hi - lo + 1))];
    let lt = lo, i = lo, gt = hi;
    while (i <= gt) {                            // 3-way partition of a[lo..hi]
      if (a[i] < pivot) { [a[lt], a[i]] = [a[i], a[lt]]; lt++; i++; }
      else if (a[i] > pivot) { [a[i], a[gt]] = [a[gt], a[i]]; gt--; }
      else i++;
    }
    if (target < lt) hi = lt - 1;
    else if (target > gt) lo = gt + 1;
    else return pivot;
  }
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int findKthLargest(vector<int> a, int k) {
        static mt19937 rng(12345);
        int target = (int)a.size() - k;          // index in ascending order
        int lo = 0, hi = (int)a.size() - 1;
        while (true) {
            int pivot = a[uniform_int_distribution<int>(lo, hi)(rng)];
            int lt = lo, i = lo, gt = hi;
            while (i <= gt) {                    // 3-way partition of a[lo..hi]
                if (a[i] < pivot) swap(a[lt++], a[i++]);
                else if (a[i] > pivot) swap(a[i], a[gt--]);
                else i++;
            }
            if (target < lt) hi = lt - 1;
            else if (target > gt) lo = gt + 1;
            else return pivot;
        }
    }
};` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    private readonly Random rnd = new Random();

    public int FindKthLargest(int[] nums, int k) {
        int target = nums.Length - k;              // index in ascending order
        int lo = 0, hi = nums.Length - 1;
        while (true) {
            int pivot = nums[lo + rnd.Next(hi - lo + 1)];
            int lt = lo, i = lo, gt = hi;
            while (i <= gt) {                      // 3-way partition of nums[lo..hi]
                if (nums[i] < pivot) Swap(nums, lt++, i++);
                else if (nums[i] > pivot) Swap(nums, i, gt--);
                else i++;
            }
            // now: [lo..lt-1] < pivot, [lt..gt] == pivot, [gt+1..hi] > pivot
            if (target < lt) hi = lt - 1;
            else if (target > gt) lo = gt + 1;
            else return pivot;
        }
    }

    private void Swap(int[] a, int x, int y) { int t = a[x]; a[x] = a[y]; a[y] = t; }
}` }
      ],
      complexity: `<p><b>Expected time O(N)</b>, worst O(N<sup>2</sup>) with vanishing probability. <b>Space O(1)</b>. Alternative: a min-heap of size k gives O(N log k) and works on streams.</p>`
    }
  });

  practice.push({
    title: 'Sort List (merge sort on a linked list)',
    level: 'Medium',
    tags: ['merge sort', 'linked list', 'fast/slow pointers'],
    companies: ['Meta', 'Microsoft', 'Bloomberg'],
    statement: `<p>Given the head of a singly linked list, return the list sorted in ascending order. Aim for <b>O(N log N)</b> time and no extra array.</p>`,
    constraints: `0 ≤ N ≤ 5·10<sup>4</sup>, −10<sup>5</sup> ≤ val ≤ 10<sup>5</sup>`,
    example: `${H.arr([4, 2, 1, 3], { label: 'list 4→2→1→3' })}${H.arr([1, 2, 3, 4], { label: 'sorted 1→2→3→4', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g' } })}<p>Split 4→2 | 1→3, sort each (2→4, 1→3), merge by relinking nodes.</p>`,
    brute: {
      why: `<p>Insertion sort on the list: each node walks from the head to find its place → O(N<sup>2</sup>) = 2.5·10<sup>9</sup> steps for 5·10<sup>4</sup> reverse-sorted nodes. Quick sort is awkward without random access; merge sort needs only sequential access — perfect for lists.</p>`,
      code: { lang: 'java', code: `
        ListNode brute(ListNode head) {
            ListNode dummy = new ListNode(0);
            while (head != null) {
                ListNode next = head.next, p = dummy;
                while (p.next != null && p.next.val < head.val) p = p.next;   // find insert spot
                head.next = p.next;
                p.next = head;
                head = next;
            }
            return dummy.next;
        }`, alt: [{ lang: 'python', code: String.raw`
def sort_list(head):
    dummy = ListNode(0)
    while head is not None:
        nxt, p = head.next, dummy
        while p.next is not None and p.next.val < head.val:     # find insert spot
            p = p.next
        head.next = p.next
        p.next = head
        head = nxt
    return dummy.next` }, { lang: 'js', code: String.raw`
function sortList(head) {
  const dummy = new ListNode(0);
  while (head !== null) {
    const next = head.next;
    let p = dummy;
    while (p.next !== null && p.next.val < head.val) p = p.next;   // find insert spot
    head.next = p.next;
    p.next = head;
    head = next;
  }
  return dummy.next;
}` }, { lang: 'cpp', code: String.raw`
struct ListNode {
    int val; ListNode* next;
    ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {}
};

ListNode* sortList(ListNode* head) {
    ListNode dummy(0);                          // on the stack: nothing to free
    while (head != nullptr) {
        ListNode* next = head->next;
        ListNode* p = &dummy;
        while (p->next != nullptr && p->next->val < head->val) p = p->next;   // find insert spot
        head->next = p->next;
        p->next = head;
        head = next;
    }
    return dummy.next;
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public ListNode SortList(ListNode head) {
        ListNode dummy = new ListNode(0);
        while (head != null) {
            ListNode next = head.next, p = dummy;
            while (p.next != null && p.next.val < head.val) p = p.next;   // find insert spot
            head.next = p.next;
            p.next = head;
            head = next;
        }
        return dummy.next;
    }
}` }] }
    },
    mcq: {
      q: 'Why is merge sort the natural choice for linked lists?',
      options: ['Lists support random access', 'Merging only needs to walk two lists forward and relink nodes — no index jumps, no extra array', 'Quick sort is unstable', 'Heap sort needs recursion'],
      answer: 1,
      explain: 'Splitting (slow/fast pointers) and merging are both sequential walks. Relinking means the merge needs O(1) extra memory, unlike array merge sort.'
    },
    hints: [
      `<p><b>Aha:</b> merge sort without arrays: find the middle with slow/fast pointers, cut the list there, sort both halves, merge.</p>`,
      `<p>Start <code>fast = head.next</code> so that for 2 nodes the split is 1 + 1 (otherwise infinite recursion). Merge with a dummy head node.</p>`,
      `<p>Edge cases: empty or single node; duplicates. Recipe: if head or head.next null → return head; slow/fast → right = slow.next; slow.next = null → merge(sort(head), sort(right)).</p>`
    ],
    tests: { sig: 'ListNode -> ListNode', fn: 'sortList', cases: [
      [[[4, 2, 1, 3]], [1, 2, 3, 4]],
      [[[-1, 5, 3, 4, 0]], [-1, 0, 3, 4, 5]],
      [[[]], []],
      [[[1]], [1]],
      [[[2, 1]], [1, 2]],
      [[[3, 3, 1, 1]], [1, 1, 3, 3]],
      [[[-100000, 100000, 0]], [-100000, 0, 100000]]
    ] },
    solution: {
      approach: `<p>Top-down merge sort on nodes; O(log N) recursion stack.</p>`,
      code: `
        class Solution {
            public ListNode sortList(ListNode head) {
                if (head == null || head.next == null) return head;
                ListNode slow = head, fast = head.next;          // fast starts one ahead → even split
                while (fast != null && fast.next != null) {
                    slow = slow.next;
                    fast = fast.next.next;
                }
                ListNode right = slow.next;
                slow.next = null;                                 // cut into two lists
                return merge(sortList(head), sortList(right));
            }

            private ListNode merge(ListNode a, ListNode b) {
                ListNode dummy = new ListNode(0), tail = dummy;
                while (a != null && b != null) {
                    if (a.val <= b.val) { tail.next = a; a = a.next; }  // <= keeps it stable
                    else { tail.next = b; b = b.next; }
                    tail = tail.next;
                }
                tail.next = (a != null) ? a : b;                 // append the leftovers
                return dummy.next;
            }

            public static void main(String[] args) {
                ListNode h = new ListNode(4, new ListNode(2, new ListNode(1, new ListNode(3))));
                for (ListNode p = new Solution().sortList(h); p != null; p = p.next) System.out.print(p.val + " ");
            }
        }`,
      alt: [
        { lang: 'python', code: `def sort_list(head):
    if head is None or head.next is None:
        return head
    slow, fast = head, head.next             # fast starts one ahead -> even split
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
    right, slow.next = slow.next, None       # cut into two lists
    a, b = sort_list(head), sort_list(right)
    dummy = tail = ListNode(0)
    while a and b:
        if a.val <= b.val:                   # <= keeps it stable
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a or b                       # append the leftovers
    return dummy.next` },
        { lang: 'js', code: `function sortList(head) {
  if (!head || !head.next) return head;
  let slow = head, fast = head.next;         // fast starts one ahead -> even split
  while (fast && fast.next) { slow = slow.next; fast = fast.next.next; }
  const right = slow.next;
  slow.next = null;                          // cut into two lists
  let a = sortList(head), b = sortList(right);
  const dummy = new ListNode(0);
  let tail = dummy;
  while (a && b) {
    if (a.val <= b.val) { tail.next = a; a = a.next; }   // <= keeps it stable
    else { tail.next = b; b = b.next; }
    tail = tail.next;
  }
  tail.next = a || b;                        // append the leftovers
  return dummy.next;
}` },
        { lang: 'cpp', code: `// LeetCode provides this node type; it is spelled out so the snippet compiles on its own.
struct ListNode {
    int val; ListNode* next;
    ListNode(int x = 0, ListNode* n = nullptr) : val(x), next(n) {}
};

class Solution {
    ListNode* merge(ListNode* a, ListNode* b) {
        ListNode dummy(0);                       // on the stack: nothing to free
        ListNode* tail = &dummy;
        while (a && b) {
            if (a->val <= b->val) { tail->next = a; a = a->next; }   // <= keeps it stable
            else { tail->next = b; b = b->next; }
            tail = tail->next;
        }
        tail->next = a ? a : b;                  // append the leftovers
        return dummy.next;
    }

public:
    ListNode* sortList(ListNode* head) {
        if (!head || !head->next) return head;
        ListNode* slow = head;
        ListNode* fast = head->next;             // fast starts one ahead -> even split
        while (fast && fast->next) { slow = slow->next; fast = fast->next->next; }
        ListNode* right = slow->next;
        slow->next = nullptr;                    // cut into two lists
        return merge(sortList(head), sortList(right));
    }
};` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public ListNode SortList(ListNode head) {
        if (head == null || head.next == null) return head;
        ListNode slow = head, fast = head.next;          // fast starts one ahead -> even split
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        ListNode right = slow.next;
        slow.next = null;                                 // cut into two lists
        return Merge(SortList(head), SortList(right));
    }

    private ListNode Merge(ListNode a, ListNode b) {
        ListNode dummy = new ListNode(0), tail = dummy;
        while (a != null && b != null) {
            if (a.val <= b.val) { tail.next = a; a = a.next; }  // <= keeps it stable
            else { tail.next = b; b = b.next; }
            tail = tail.next;
        }
        tail.next = (a != null) ? a : b;                 // append the leftovers
        return dummy.next;
    }
}` }
      ],
      complexity: `<p><b>Time O(N log N)</b>. <b>Space O(log N)</b> recursion (a bottom-up version reaches O(1)).</p>`
    }
  });

  practice.push({
    title: 'Non-overlapping Intervals (fewest removals)',
    level: 'Medium',
    tags: ['intervals', 'greedy', 'sort by end'],
    companies: ['Amazon', 'Google', 'Meta'],
    statement: `<p>Given intervals, return the <b>minimum number to remove</b> so that the rest do not overlap. Intervals that only touch (like [1,2] and [2,3]) do not overlap.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, −5·10<sup>4</sup> ≤ start &lt; end ≤ 5·10<sup>4</sup>`,
    example: `<p>[[1,2],[2,3],[3,4],[1,3]] → <b>1</b>: remove ${H.c('r', '[1,3]')}; [1,2] [2,3] [3,4] only touch.</p>`,
    brute: {
      why: `<p>Sort by start and run an O(N<sup>2</sup>) DP: keep[i] = 1 + max keep[j] over j with end[j] ≤ start[i]. 10<sup>10</sup> steps for N = 10<sup>5</sup>. The greedy "always keep the interval that ends first" makes it O(N log N).</p>`,
      code: { lang: 'java', code: `
        int brute(int[][] iv) {
            Arrays.sort(iv, (x, y) -> Integer.compare(x[0], y[0]));
            int n = iv.length, best = 0;
            int[] keep = new int[n];
            for (int i = 0; i < n; i++) {
                keep[i] = 1;
                for (int j = 0; j < i; j++)
                    if (iv[j][1] <= iv[i][0]) keep[i] = Math.max(keep[i], keep[j] + 1);
                best = Math.max(best, keep[i]);
            }
            return n - best;
        }`, alt: [{ lang: 'python', code: String.raw`
def erase_overlap_intervals(iv):
    iv = sorted(iv, key=lambda x: x[0])
    n, best = len(iv), 0
    keep = [0] * n
    for i in range(n):
        keep[i] = 1
        for j in range(i):
            if iv[j][1] <= iv[i][0]:
                keep[i] = max(keep[i], keep[j] + 1)
        best = max(best, keep[i])
    return n - best` }, { lang: 'js', code: String.raw`
function eraseOverlapIntervals(iv) {
  iv = iv.slice().sort((x, y) => x[0] - y[0]);
  const n = iv.length;
  let best = 0;
  const keep = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    keep[i] = 1;
    for (let j = 0; j < i; j++)
      if (iv[j][1] <= iv[i][0]) keep[i] = Math.max(keep[i], keep[j] + 1);
    best = Math.max(best, keep[i]);
  }
  return n - best;
}` }, { lang: 'cpp', code: String.raw`
int eraseOverlapIntervals(vector<vector<int>> iv) {
    sort(iv.begin(), iv.end(), [](const vector<int>& x, const vector<int>& y) { return x[0] < y[0]; });
    int n = iv.size(), best = 0;
    vector<int> keep(n, 0);
    for (int i = 0; i < n; i++) {
        keep[i] = 1;
        for (int j = 0; j < i; j++)
            if (iv[j][1] <= iv[i][0]) keep[i] = max(keep[i], keep[j] + 1);
        best = max(best, keep[i]);
    }
    return n - best;
}` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public int EraseOverlapIntervals(int[][] iv) {
        Array.Sort(iv, (x, y) => x[0].CompareTo(y[0]));
        int n = iv.Length, best = 0;
        int[] keep = new int[n];
        for (int i = 0; i < n; i++) {
            keep[i] = 1;
            for (int j = 0; j < i; j++)
                if (iv[j][1] <= iv[i][0]) keep[i] = Math.Max(keep[i], keep[j] + 1);
            best = Math.Max(best, keep[i]);
        }
        return n - best;
    }
}` }] }
    },
    mcq: {
      q: 'Why sort by END time for this greedy?',
      options: ['Ends are smaller numbers', 'Keeping the interval that finishes earliest leaves the most room for the rest (exchange argument)', 'Sorting by start would be O(N<sup>2</sup>)', 'It makes the sort stable'],
      answer: 1,
      explain: 'Any optimal solution can swap its first interval for the earliest-ending one without creating overlaps — so picking the earliest end is always safe. This is activity selection.'
    },
    hints: [
      `<p><b>Aha:</b> "remove the fewest" = "keep the most non-overlapping intervals" = activity selection.</p>`,
      `<p>Sort by end. Track <code>lastEnd</code>. If <code>start ≥ lastEnd</code> keep it (lastEnd = end), else it must be removed.</p>`,
      `<p>Edge cases: touching is fine (≥), identical intervals (keep one), negative coordinates (compare, do not subtract, in Java and C++). Recipe: sort by end → kept = 0, lastEnd = −∞ → loop → return N − kept.</p>`
    ],
    tests: { sig: 'int[][] -> int', fn: 'eraseOverlapIntervals', cases: [
      [[[[1, 2], [2, 3], [3, 4], [1, 3]]], 1],
      [[[[1, 2], [1, 2], [1, 2]]], 2],
      [[[[1, 2], [2, 3]]], 0],
      [[[[1, 100], [11, 22], [1, 11], [2, 12]]], 2],
      [[[[0, 1]]], 0],
      [[[[-50000, 50000], [-3, -1], [-1, 0]]], 1],
      [[[[1, 5], [2, 3], [3, 4], [4, 6]]], 1]
    ] },
    solution: {
      approach: `<p>Greedy activity selection by earliest finish time.</p>`,
      code: `
        class Solution {
            public int eraseOverlapIntervals(int[][] iv) {
                Arrays.sort(iv, (x, y) -> Integer.compare(x[1], y[1]));   // by end
                int kept = 0;
                long lastEnd = Long.MIN_VALUE;
                for (int[] cur : iv) {
                    if (cur[0] >= lastEnd) {        // fits after the last kept interval
                        kept++;
                        lastEnd = cur[1];
                    }                               // else: overlaps → remove it
                }
                return iv.length - kept;
            }

            public static void main(String[] args) {
                System.out.println(new Solution().eraseOverlapIntervals(new int[][]{{1, 2}, {2, 3}, {3, 4}, {1, 3}})); // 1
            }
        }`,
      alt: [
        { lang: 'python', code: `def erase_overlap_intervals(iv):
    kept, last_end = 0, float("-inf")
    for s, e in sorted(iv, key=lambda x: x[1]):   # by end
        if s >= last_end:                          # fits after the last kept interval
            kept += 1
            last_end = e
    return len(iv) - kept` },
        { lang: 'js', code: `function eraseOverlapIntervals(iv) {
  const sorted = iv.slice().sort((x, y) => x[1] - y[1]);   // by end
  let kept = 0, lastEnd = -Infinity;
  for (const [s, e] of sorted) {
    if (s >= lastEnd) { kept++; lastEnd = e; }             // fits after the last kept one
  }
  return iv.length - kept;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int eraseOverlapIntervals(vector<vector<int>> iv) {
        sort(iv.begin(), iv.end(), [](const vector<int>& x, const vector<int>& y) { return x[1] < y[1]; });
        int kept = 0;
        long long lastEnd = LLONG_MIN;
        for (const auto& cur : iv) {
            if (cur[0] >= lastEnd) { kept++; lastEnd = cur[1]; }   // fits after the last kept one
        }
        return (int)iv.size() - kept;
    }
};` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public int EraseOverlapIntervals(int[][] iv) {
        Array.Sort(iv, (x, y) => x[1].CompareTo(y[1]));   // by end
        int kept = 0;
        long lastEnd = long.MinValue;
        foreach (int[] cur in iv) {
            if (cur[0] >= lastEnd) {        // fits after the last kept interval
                kept++;
                lastEnd = cur[1];
            }                               // else: overlaps -> remove it
        }
        return iv.Length - kept;
    }
}` }
      ],
      dry: { head: ['sorted by end', 'start ≥ lastEnd?', 'kept', 'lastEnd'], rows: [['[1,2]', 'yes', '1', '2'], ['[2,3]', '2 ≥ 2 yes', '2', '3'], ['[1,3]', '1 ≥ 3 <span class="c-r">no</span> → remove', '2', '3'], ['[3,4]', '3 ≥ 3 yes', '3', '4']] },
      complexity: `<p><b>Time O(N log N)</b>, <b>space O(log N)</b>–O(N) for the sort.</p>`
    }
  });

  practice.push({
    title: 'Minimum Number of Arrows to Burst Balloons',
    level: 'Medium',
    tags: ['intervals', 'greedy', 'comparator overflow'],
    companies: ['Amazon', 'Meta', 'Microsoft'],
    statement: `<p>Balloons are horizontal ranges <code>[xstart, xend]</code> (inclusive). An arrow shot straight up at x bursts every balloon with xstart ≤ x ≤ xend. Return the minimum number of arrows to burst all balloons.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, −2<sup>31</sup> ≤ xstart ≤ xend ≤ 2<sup>31</sup> − 1`,
    example: `<p>[[10,16],[2,8],[1,6],[7,12]] → <b>2</b>: sorted by end [1,6] [2,8] [7,12] [10,16]; arrow at ${H.c('g', 'x = 6')} bursts [1,6], [2,8]; arrow at ${H.c('g', 'x = 12')} bursts [7,12], [10,16].</p>`,
    brute: {
      why: `<p>Repeatedly shoot at the smallest end among the remaining balloons and delete everything it hits: up to N rounds × N scans = O(N<sup>2</sup>). Sorting by end lets one pass do the same work.</p>`,
      code: { lang: 'java', code: `
        int brute(int[][] p) {
            List<int[]> left = new ArrayList<>(Arrays.asList(p));
            int arrows = 0;
            while (!left.isEmpty()) {
                int x = Integer.MAX_VALUE;
                for (int[] b : left) x = Math.min(x, b[1]);      // smallest end
                final int shot = x;
                left.removeIf(b -> b[0] <= shot && shot <= b[1]); // burst everything at x
                arrows++;
            }
            return arrows;
        }`, alt: [{ lang: 'python', code: String.raw`
def find_min_arrow_shots(points):
    left = [list(p) for p in points]
    arrows = 0
    while left:
        shot = min(b[1] for b in left)                         # smallest end
        left = [b for b in left if not (b[0] <= shot <= b[1])]   # burst everything at x
        arrows += 1
    return arrows` }, { lang: 'js', code: String.raw`
function findMinArrowShots(points) {
  let left = points.map((p) => [p[0], p[1]]);
  let arrows = 0;
  while (left.length > 0) {
    let shot = Infinity;
    for (const b of left) shot = Math.min(shot, b[1]);         // smallest end
    left = left.filter((b) => !(b[0] <= shot && shot <= b[1]));   // burst everything at x
    arrows++;
  }
  return arrows;
}` }, { lang: 'cpp', code: String.raw`
int findMinArrowShots(vector<vector<int>> points) {
    vector<vector<int>> left = points;
    int arrows = 0;
    while (!left.empty()) {
        long long shot = LLONG_MAX;
        for (const auto& b : left) shot = min(shot, (long long) b[1]);     // smallest end
        vector<vector<int>> rest;
        for (const auto& b : left)
            if (!(b[0] <= shot && shot <= b[1])) rest.push_back(b);        // burst everything at x
        left = rest;
        arrows++;
    }
    return arrows;
}` }, { lang: 'csharp', code: String.raw`
using System;
using System.Collections.Generic;

public class Solution {
    public int FindMinArrowShots(int[][] points) {
        var left = new List<int[]>(points);
        int arrows = 0;
        while (left.Count > 0) {
            int x = int.MaxValue;
            foreach (int[] b in left) x = Math.Min(x, b[1]);      // smallest end
            int shot = x;
            left.RemoveAll(b => b[0] <= shot && shot <= b[1]);    // burst everything at x
            arrows++;
        }
        return arrows;
    }
}` }] }
    },
    mcq: {
      q: 'Someone sorts with <code>(a, b) -&gt; a[1] - b[1]</code>. What happens on [[-2147483646, -2147483645], [2147483646, 2147483647]]?',
      options: ['Works fine', 'The subtraction overflows, the comparator lies, the sort order (and answer) can be wrong', 'Compile error', 'It throws ArithmeticException'],
      answer: 1,
      explain: '−2147483645 − 2147483647 overflows int and wraps to a positive number, so the comparator claims the first end is bigger. Use Integer.compare(a[1], b[1]).'
    },
    hints: [
      `<p><b>Aha:</b> shoot each arrow as far right as possible while still hitting the balloon that ends first — at its end.</p>`,
      `<p>Sort by end (compare, never subtract: Java <code>Integer.compare</code>, C++ <code>&lt;</code>). arrows = 1, pos = first end. For each balloon: if start &gt; pos → new arrow at its end.</p>`,
      `<p>Edge cases: touching balloons ([1,2], [2,3]) share an arrow (inclusive); extreme int values. Recipe: sort by end → pos = p[0][1] → count starts &gt; pos.</p>`
    ],
    tests: { sig: 'int[][] -> int', fn: 'findMinArrowShots', cases: [
      [[[[10, 16], [2, 8], [1, 6], [7, 12]]], 2],
      [[[[1, 2], [3, 4], [5, 6], [7, 8]]], 4],
      [[[[1, 2], [2, 3], [3, 4], [4, 5]]], 2],
      [[[[1, 2]]], 1],
      [[[[-2147483646, -2147483645], [2147483646, 2147483647]]], 2],
      [[[[-2147483648, 2147483647], [0, 0]]], 1],
      [[[[3, 9], [7, 12], [3, 8], [6, 8], [9, 10], [2, 9], [0, 9], [3, 9], [0, 6], [2, 8]]], 2]
    ] },
    solution: {
      approach: `<p>Greedy by earliest end; same shape as activity selection but with inclusive ends.</p>`,
      code: `
        class Solution {
            public int findMinArrowShots(int[][] points) {
                Arrays.sort(points, (a, b) -> Integer.compare(a[1], b[1]));  // never a[1] - b[1]
                int arrows = 1;
                int pos = points[0][1];                  // first arrow at the earliest end
                for (int[] b : points) {
                    if (b[0] > pos) {                    // this balloon starts after the arrow → missed
                        arrows++;
                        pos = b[1];
                    }
                }
                return arrows;
            }

            public static void main(String[] args) {
                System.out.println(new Solution().findMinArrowShots(new int[][]{{10, 16}, {2, 8}, {1, 6}, {7, 12}})); // 2
            }
        }`,
      alt: [
        { lang: 'python', code: `def find_min_arrow_shots(points):
    points = sorted(points, key=lambda p: p[1])   # by end (no overflow in Python)
    arrows, pos = 1, points[0][1]                 # first arrow at the earliest end
    for s, e in points:
        if s > pos:                               # this balloon starts after the arrow
            arrows += 1
            pos = e
    return arrows` },
        { lang: 'js', code: `function findMinArrowShots(points) {
  // x - y is exact for 32-bit values in a JS Number (no int overflow), but compare anyway
  const p = points.slice().sort((x, y) => (x[1] < y[1] ? -1 : x[1] > y[1] ? 1 : 0));
  let arrows = 1, pos = p[0][1];                  // first arrow at the earliest end
  for (const [s, e] of p) {
    if (s > pos) { arrows++; pos = e; }           // missed -> new arrow at its end
  }
  return arrows;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int findMinArrowShots(vector<vector<int>> points) {
        // compare with <, never a[1] - b[1] (signed overflow is undefined behaviour)
        sort(points.begin(), points.end(), [](const vector<int>& a, const vector<int>& b) { return a[1] < b[1]; });
        int arrows = 1, pos = points[0][1];       // first arrow at the earliest end
        for (const auto& b : points) {
            if (b[0] > pos) { arrows++; pos = b[1]; }   // missed -> new arrow
        }
        return arrows;
    }
};` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public int FindMinArrowShots(int[][] points) {
        Array.Sort(points, (a, b) => a[1].CompareTo(b[1]));  // never a[1] - b[1]
        int arrows = 1;
        int pos = points[0][1];                  // first arrow at the earliest end
        foreach (int[] b in points) {
            if (b[0] > pos) {                    // this balloon starts after the arrow -> missed
                arrows++;
                pos = b[1];
            }
        }
        return arrows;
    }
}` }
      ],
      complexity: `<p><b>Time O(N log N)</b>, <b>space O(log N)</b>–O(N) for the sort.</p>`
    }
  });

  practice.push({
    title: 'Interval List Intersections',
    level: 'Medium',
    tags: ['intervals', 'two pointers', 'merge step'],
    companies: ['Meta', 'Uber', 'Google'],
    statement: `<p>Two lists of closed intervals, each sorted and pairwise disjoint. Return their intersection (all ranges covered by both lists), sorted.</p>`,
    constraints: `0 ≤ N, M ≤ 1000, 0 ≤ start ≤ end ≤ 10<sup>9</sup>`,
    example: `<p>A = [[0,2],[5,10],[13,23],[24,25]], B = [[1,5],[8,12],[15,24],[25,26]] → [[1,2],[5,5],[8,10],[15,23],[24,24],[25,25]].</p><p>e.g. [5,10] ∩ [1,5] = ${H.c('g', '[max(5,1), min(10,5)] = [5,5]')}.</p>`,
    brute: {
      why: `<p>Intersect every pair (N·M = 10<sup>6</sup>, then sort the results). Fine here, but it ignores that both lists are sorted — like merge sort's merge, two pointers find every intersection in O(N + M).</p>`,
      code: { lang: 'java', code: `
        int[][] brute(int[][] a, int[][] b) {
            List<int[]> res = new ArrayList<>();
            for (int[] x : a)
                for (int[] y : b) {
                    int lo = Math.max(x[0], y[0]), hi = Math.min(x[1], y[1]);
                    if (lo <= hi) res.add(new int[]{lo, hi});
                }
            res.sort((p, q) -> Integer.compare(p[0], q[0]));
            return res.toArray(new int[0][]);
        }`, alt: [{ lang: 'python', code: String.raw`
def interval_intersection(a, b):
    res = []
    for x in a:
        for y in b:
            lo, hi = max(x[0], y[0]), min(x[1], y[1])
            if lo <= hi:
                res.append([lo, hi])
    res.sort(key=lambda p: p[0])
    return res` }, { lang: 'js', code: String.raw`
function intervalIntersection(a, b) {
  const res = [];
  for (const x of a)
    for (const y of b) {
      const lo = Math.max(x[0], y[0]), hi = Math.min(x[1], y[1]);
      if (lo <= hi) res.push([lo, hi]);
    }
  res.sort((p, q) => p[0] - q[0]);
  return res;
}` }, { lang: 'cpp', code: String.raw`
vector<vector<int>> intervalIntersection(const vector<vector<int>>& a, const vector<vector<int>>& b) {
    vector<vector<int>> res;
    for (const auto& x : a)
        for (const auto& y : b) {
            int lo = max(x[0], y[0]), hi = min(x[1], y[1]);
            if (lo <= hi) res.push_back({lo, hi});
        }
    sort(res.begin(), res.end(), [](const vector<int>& p, const vector<int>& q) { return p[0] < q[0]; });
    return res;
}` }, { lang: 'csharp', code: String.raw`
using System;
using System.Collections.Generic;

public class Solution {
    public int[][] IntervalIntersection(int[][] a, int[][] b) {
        var res = new List<int[]>();
        foreach (int[] x in a)
            foreach (int[] y in b) {
                int lo = Math.Max(x[0], y[0]), hi = Math.Min(x[1], y[1]);
                if (lo <= hi) res.Add(new[] { lo, hi });
            }
        res.Sort((p, q) => p[0].CompareTo(q[0]));
        return res.ToArray();
    }
}` }] }
    },
    mcq: {
      q: 'After intersecting A[i] and B[j], which pointer moves?',
      options: ['Both', 'The one whose interval ends first', 'The one whose interval starts first', 'Always i'],
      answer: 1,
      explain: 'The interval that ends first cannot intersect anything later in the other list (they start even later), so it is finished. The other may still overlap the next one.'
    },
    hints: [
      `<p><b>Aha:</b> the overlap of [a1,a2] and [b1,b2] is [max(a1,b1), min(a2,b2)] if that range is non-empty.</p>`,
      `<p>Two pointers i, j. Add the overlap if lo ≤ hi. Then advance whichever interval has the smaller end.</p>`,
      `<p>Edge cases: one list empty; single-point overlaps ([5,5]); identical ends (advance either — or both). Recipe: while i &lt; N and j &lt; M: lo, hi → add → advance smaller end.</p>`
    ],
    tests: { sig: 'int[][] int[][] -> int[][]', fn: 'intervalIntersection', cases: [
      [[[[0, 2], [5, 10], [13, 23], [24, 25]], [[1, 5], [8, 12], [15, 24], [25, 26]]], [[1, 2], [5, 5], [8, 10], [15, 23], [24, 24], [25, 25]]],
      [[[], [[1, 2]]], []],
      [[[[1, 3], [5, 9]], []], []],
      [[[[1, 7]], [[3, 10]]], [[3, 7]]],
      [[[[0, 5]], [[5, 10]]], [[5, 5]]],
      [[[[1, 2]], [[3, 4]]], []],
      [[[[0, 1000000000]], [[0, 1000000000]]], [[0, 1000000000]]],
      [[[[1, 5], [8, 12]], [[2, 3], [4, 9], [11, 15]]], [[2, 3], [4, 5], [8, 9], [11, 12]]]
    ] },
    solution: {
      approach: `<p>Merge-style two-pointer sweep.</p>`,
      code: `
        class Solution {
            public int[][] intervalIntersection(int[][] a, int[][] b) {
                List<int[]> res = new ArrayList<>();
                int i = 0, j = 0;
                while (i < a.length && j < b.length) {
                    int lo = Math.max(a[i][0], b[j][0]);
                    int hi = Math.min(a[i][1], b[j][1]);
                    if (lo <= hi) res.add(new int[]{lo, hi});    // they overlap
                    if (a[i][1] < b[j][1]) i++; else j++;        // drop the one that ends first
                }
                return res.toArray(new int[0][]);
            }

            public static void main(String[] args) {
                int[][] r = new Solution().intervalIntersection(
                    new int[][]{{0, 2}, {5, 10}, {13, 23}, {24, 25}},
                    new int[][]{{1, 5}, {8, 12}, {15, 24}, {25, 26}});
                System.out.println(Arrays.deepToString(r));
            }
        }`,
      alt: [
        { lang: 'python', code: `def interval_intersection(a, b):
    res, i, j = [], 0, 0
    while i < len(a) and j < len(b):
        lo = max(a[i][0], b[j][0])
        hi = min(a[i][1], b[j][1])
        if lo <= hi:
            res.append([lo, hi])             # they overlap
        if a[i][1] < b[j][1]:                # drop the one that ends first
            i += 1
        else:
            j += 1
    return res` },
        { lang: 'js', code: `function intervalIntersection(a, b) {
  const res = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    const lo = Math.max(a[i][0], b[j][0]), hi = Math.min(a[i][1], b[j][1]);
    if (lo <= hi) res.push([lo, hi]);        // they overlap
    if (a[i][1] < b[j][1]) i++; else j++;    // drop the one that ends first
  }
  return res;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<vector<int>> intervalIntersection(const vector<vector<int>>& a, const vector<vector<int>>& b) {
        vector<vector<int>> res;
        size_t i = 0, j = 0;
        while (i < a.size() && j < b.size()) {
            int lo = max(a[i][0], b[j][0]), hi = min(a[i][1], b[j][1]);
            if (lo <= hi) res.push_back({lo, hi});   // they overlap
            if (a[i][1] < b[j][1]) i++; else j++;    // drop the one that ends first
        }
        return res;
    }
};` }, { lang: 'csharp', code: String.raw`
using System;
using System.Collections.Generic;

public class Solution {
    public int[][] IntervalIntersection(int[][] a, int[][] b) {
        var res = new List<int[]>();
        int i = 0, j = 0;
        while (i < a.Length && j < b.Length) {
            int lo = Math.Max(a[i][0], b[j][0]);
            int hi = Math.Min(a[i][1], b[j][1]);
            if (lo <= hi) res.Add(new[] { lo, hi });     // they overlap
            if (a[i][1] < b[j][1]) i++; else j++;        // drop the one that ends first
        }
        return res.ToArray();
    }
}` }
      ],
      complexity: `<p><b>Time O(N + M)</b>, <b>space O(1)</b> besides the output.</p>`
    }
  });

  // =====================================================================
  // PRACTICE — Hard
  // =====================================================================
  practice.push({
    title: 'Count of Smaller Numbers After Self',
    level: 'Hard',
    tags: ['merge sort', 'index sorting', 'inversions'],
    companies: ['Google', 'Amazon', 'Apple'],
    statement: `<p>For each index i, count how many elements to the <b>right</b> of i are <b>strictly smaller</b> than nums[i]. Return the counts as a list.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, −10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup>`,
    example: `${H.arr([5, 2, 6, 1], { label: 'nums' })}${H.arr([2, 1, 1, 0], { label: 'counts', hl: { 0: 'p' } })}<p>5 has ${H.c('p', '2 and 1')} to its right that are smaller → 2; 2 has 1 → 1; 6 has 1 → 1; 1 has nothing → 0. (These are per-element inversion counts.)</p>`,
    brute: {
      why: `<p>For every i scan all j &gt; i: N(N−1)/2 ≈ 5·10<sup>9</sup> comparisons → TLE. Merge sort already discovers each inversion during merging; we just need to credit it to the right <b>original index</b>.</p>`,
      code: { lang: 'java', code: `
        List<Integer> brute(int[] nums) {
            List<Integer> res = new ArrayList<>();
            for (int i = 0; i < nums.length; i++) {
                int c = 0;
                for (int j = i + 1; j < nums.length; j++) if (nums[j] < nums[i]) c++;
                res.add(c);
            }
            return res;
        }`, alt: [{ lang: 'python', code: String.raw`
def count_smaller(nums):
    res = []
    for i in range(len(nums)):
        c = 0
        for j in range(i + 1, len(nums)):
            if nums[j] < nums[i]:
                c += 1
        res.append(c)
    return res` }, { lang: 'js', code: String.raw`
function countSmaller(nums) {
  const res = [];
  for (let i = 0; i < nums.length; i++) {
    let c = 0;
    for (let j = i + 1; j < nums.length; j++) if (nums[j] < nums[i]) c++;
    res.push(c);
  }
  return res;
}` }, { lang: 'cpp', code: String.raw`
vector<int> countSmaller(const vector<int>& nums) {
    vector<int> res;
    for (int i = 0; i < (int) nums.size(); i++) {
        int c = 0;
        for (int j = i + 1; j < (int) nums.size(); j++) if (nums[j] < nums[i]) c++;
        res.push_back(c);
    }
    return res;
}` }, { lang: 'csharp', code: String.raw`
using System.Collections.Generic;

public class Solution {
    public IList<int> CountSmaller(int[] nums) {
        var res = new List<int>();
        for (int i = 0; i < nums.Length; i++) {
            int c = 0;
            for (int j = i + 1; j < nums.Length; j++) if (nums[j] < nums[i]) c++;
            res.Add(c);
        }
        return res;
    }
}` }] }
    },
    mcq: {
      q: 'While merging (by value) left and right halves, a left element is placed after j − (mid+1) right elements have already been placed. What does that number mean for it?',
      options: ['Nothing', 'Exactly how many smaller elements from the right half come after it in the original array', 'Its final index', 'The number of equal elements'],
      answer: 1,
      explain: 'The right-half elements placed before it are smaller (ties take left first) and originally sat to its right. Adding this at every level counts all smaller elements to its right.'
    },
    hints: [
      `<p><b>Aha:</b> it is the inversion count, but per element. Sort an array of <b>indices</b> by value with merge sort so you always know whose count to increase.</p>`,
      `<p>In the merge, when you take a left index i, add <code>(j − (mid + 1))</code> = number of right elements already taken (all smaller) to <code>count[idx[i]]</code>. Ties: take left first.</p>`,
      `<p>Edge cases: duplicates (strictly smaller → ties are not counted), N = 1, all equal. Recipe: idx = 0..N−1 → mergeSort(idx by nums) with the credit rule → return counts.</p>`
    ],
    tests: { sig: 'int[] -> list<int>', fn: 'countSmaller', cases: [
      [[[5, 2, 6, 1]], [2, 1, 1, 0]],
      [[[-1]], [0]],
      [[[-1, -1]], [0, 0]],
      [[[1, 2, 3]], [0, 0, 0]],
      [[[3, 2, 1]], [2, 1, 0]],
      [[[2, 0, 1]], [2, 0, 0]],
      [[[-10000, 10000, 0, 0]], [0, 2, 0, 0]]
    ] },
    solution: {
      approach: `<p>Merge sort over indices; credit each left element with the right elements that jumped ahead of it.</p>`,
      code: `
        class Solution {
            private int[] cnt, idx, tmp, a;

            public List<Integer> countSmaller(int[] nums) {
                int n = nums.length;
                a = nums; cnt = new int[n]; idx = new int[n]; tmp = new int[n];
                for (int i = 0; i < n; i++) idx[i] = i;
                sort(0, n - 1);
                List<Integer> res = new ArrayList<>();
                for (int c : cnt) res.add(c);
                return res;
            }

            private void sort(int lo, int hi) {
                if (lo >= hi) return;
                int mid = (lo + hi) >>> 1;
                sort(lo, mid);
                sort(mid + 1, hi);
                int i = lo, j = mid + 1, k = lo;
                while (i <= mid && j <= hi) {
                    if (a[idx[j]] < a[idx[i]]) {
                        tmp[k++] = idx[j++];                    // right is smaller → goes first
                    } else {
                        cnt[idx[i]] += j - (mid + 1);           // right items already taken are smaller
                        tmp[k++] = idx[i++];
                    }
                }
                while (i <= mid) { cnt[idx[i]] += j - (mid + 1); tmp[k++] = idx[i++]; }
                while (j <= hi) tmp[k++] = idx[j++];
                System.arraycopy(tmp, lo, idx, lo, hi - lo + 1);
            }

            public static void main(String[] args) {
                System.out.println(new Solution().countSmaller(new int[]{5, 2, 6, 1})); // [2, 1, 1, 0]
            }
        }`,
      alt: [
        { lang: 'python', code: `def count_smaller(nums):
    n = len(nums)
    cnt = [0] * n
    idx = list(range(n))                     # merge sort indices, ordered by value

    def sort(lo, hi):
        if lo >= hi:
            return
        mid = (lo + hi) // 2
        sort(lo, mid)
        sort(mid + 1, hi)
        merged, i, j = [], lo, mid + 1
        while i <= mid:
            if j <= hi and nums[idx[j]] < nums[idx[i]]:
                merged.append(idx[j]); j += 1          # right is smaller -> goes first
            else:
                cnt[idx[i]] += j - (mid + 1)           # right items already taken are smaller
                merged.append(idx[i]); i += 1
        merged += idx[j:hi + 1]
        idx[lo:hi + 1] = merged

    sort(0, n - 1)
    return cnt` },
        { lang: 'js', code: `function countSmaller(nums) {
  const n = nums.length;
  const cnt = new Array(n).fill(0), tmp = new Array(n);
  const idx = Array.from({ length: n }, (_, i) => i);   // merge sort indices by value
  const sort = (lo, hi) => {
    if (lo >= hi) return;
    const mid = (lo + hi) >> 1;
    sort(lo, mid);
    sort(mid + 1, hi);
    let i = lo, j = mid + 1, k = lo;
    while (i <= mid) {
      if (j <= hi && nums[idx[j]] < nums[idx[i]]) tmp[k++] = idx[j++];   // right is smaller
      else { cnt[idx[i]] += j - (mid + 1); tmp[k++] = idx[i++]; }        // credit the left item
    }
    while (j <= hi) tmp[k++] = idx[j++];
    for (k = lo; k <= hi; k++) idx[k] = tmp[k];
  };
  sort(0, n - 1);
  return cnt;
}` },
        { lang: 'cpp', code: `class Solution {
    vector<int> cnt, idx, tmp;

    void sort(const vector<int>& a, int lo, int hi) {
        if (lo >= hi) return;
        int mid = lo + (hi - lo) / 2;
        sort(a, lo, mid);
        sort(a, mid + 1, hi);
        int i = lo, j = mid + 1, k = lo;
        while (i <= mid) {
            if (j <= hi && a[idx[j]] < a[idx[i]]) tmp[k++] = idx[j++];      // right is smaller
            else { cnt[idx[i]] += j - (mid + 1); tmp[k++] = idx[i++]; }     // credit the left item
        }
        while (j <= hi) tmp[k++] = idx[j++];
        copy(tmp.begin() + lo, tmp.begin() + hi + 1, idx.begin() + lo);
    }

public:
    vector<int> countSmaller(const vector<int>& nums) {
        int n = nums.size();
        cnt.assign(n, 0); tmp.assign(n, 0); idx.resize(n);
        iota(idx.begin(), idx.end(), 0);         // merge sort indices by value
        sort(nums, 0, n - 1);
        return cnt;
    }
};` }, { lang: 'csharp', code: String.raw`
using System;
using System.Collections.Generic;

public class Solution {
    private int[] cnt, idx, tmp, a;

    public IList<int> CountSmaller(int[] nums) {
        int n = nums.Length;
        a = nums; cnt = new int[n]; idx = new int[n]; tmp = new int[n];
        for (int i = 0; i < n; i++) idx[i] = i;
        Sort(0, n - 1);
        return new List<int>(cnt);
    }

    private void Sort(int lo, int hi) {
        if (lo >= hi) return;
        int mid = lo + (hi - lo) / 2;
        Sort(lo, mid);
        Sort(mid + 1, hi);
        int i = lo, j = mid + 1, k = lo;
        while (i <= mid && j <= hi) {
            if (a[idx[j]] < a[idx[i]]) {
                tmp[k++] = idx[j++];                    // right is smaller -> goes first
            } else {
                cnt[idx[i]] += j - (mid + 1);           // right items already taken are smaller
                tmp[k++] = idx[i++];
            }
        }
        while (i <= mid) { cnt[idx[i]] += j - (mid + 1); tmp[k++] = idx[i++]; }
        while (j <= hi) tmp[k++] = idx[j++];
        Array.Copy(tmp, lo, idx, lo, hi - lo + 1);
    }
}` }
      ],
      dry: { head: ['merge', 'left (values)', 'right (values)', 'credits'], rows: [['(0,0,1)', '[5]', '[2]', '2 goes first; 5 gets +1'], ['(2,2,3)', '[6]', '[1]', '1 goes first; 6 gets +1'], ['(0,1,3)', '[2,5]', '[1,6]', '1 first; 2 gets +1, 5 gets +1; 6 last'], ['totals', '', '', '<span class="c-p">5:2, 2:1, 6:1, 1:0</span>']] },
      complexity: `<p><b>Time O(N log N)</b>, <b>space O(N)</b>. (A Fenwick tree over compressed values is the other classic solution — Range Query module.)</p>`
    }
  });

  practice.push({
    title: 'Reverse Pairs (nums[i] > 2·nums[j])',
    level: 'Hard',
    tags: ['merge sort', 'two pointers', 'overflow'],
    companies: ['Google', 'Amazon'],
    statement: `<p>Count pairs <code>(i, j)</code> with <code>i &lt; j</code> and <code>nums[i] &gt; 2 · nums[j]</code>.</p>`,
    constraints: `1 ≤ N ≤ 5·10<sup>4</sup>, −2<sup>31</sup> ≤ nums[i] ≤ 2<sup>31</sup> − 1`,
    example: `<p>[2,4,3,5,1] → <b>3</b>: ${H.c('r', '(4,1)')}, ${H.c('r', '(3,1)')}, ${H.c('r', '(5,1)')} — each left value is more than twice 1. [1,3,2,3,1] → 2: (3,1) twice.</p>`,
    brute: {
      why: `<p>All pairs: ~1.25·10<sup>9</sup> checks for N = 5·10<sup>4</sup> → TLE. Also 2·nums[j] overflows a 32-bit int for big values in Java and C++ — compute in 64 bits (<code>long</code> / <code>long long</code>); Python integers and JavaScript doubles do not overflow here.</p>`,
      code: { lang: 'java', code: `
        int brute(int[] nums) {
            int c = 0;
            for (int i = 0; i < nums.length; i++)
                for (int j = i + 1; j < nums.length; j++)
                    if ((long) nums[i] > 2L * nums[j]) c++;
            return c;
        }`, alt: [{ lang: 'python', code: String.raw`
def reverse_pairs(nums):
    c = 0
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] > 2 * nums[j]:
                c += 1
    return c` }, { lang: 'js', code: String.raw`
function reversePairs(nums) {
  let c = 0;
  for (let i = 0; i < nums.length; i++)
    for (let j = i + 1; j < nums.length; j++)
      if (nums[i] > 2 * nums[j]) c++;      // 2 * nums[j] stays exact in a double
  return c;
}` }, { lang: 'cpp', code: String.raw`
int reversePairs(const vector<int>& nums) {
    int c = 0;
    for (int i = 0; i < (int) nums.size(); i++)
        for (int j = i + 1; j < (int) nums.size(); j++)
            if ((long long) nums[i] > 2LL * nums[j]) c++;   // 2 * nums[j] would overflow an int
    return c;
}` }, { lang: 'csharp', code: String.raw`
public class Solution {
    public int ReversePairs(int[] nums) {
        int c = 0;
        for (int i = 0; i < nums.Length; i++)
            for (int j = i + 1; j < nums.Length; j++)
                if ((long)nums[i] > 2L * nums[j]) c++;   // 2 * nums[j] would overflow an int
        return c;
    }
}` }] }
    },
    mcq: {
      q: 'Why can\'t we count reverse pairs inside the normal merge loop like plain inversions?',
      options: ['We can, it is identical', 'The merge decision uses a[i] vs a[j], but the count needs a[i] vs 2·a[j] — a different condition, so count with a separate two-pointer pass first', 'Because the halves are not sorted', 'Because of stability'],
      answer: 1,
      explain: 'The merge order compares values directly; the pair condition compares with a doubled value. Both halves are sorted, so a separate linear two-pointer scan counts pairs, then a normal merge follows.'
    },
    hints: [
      `<p><b>Aha:</b> same skeleton as inversion count: pairs inside left + inside right + cross pairs; cross pairs are countable in linear time because both halves are sorted.</p>`,
      `<p>Before merging: for each i in the left half, move pointer j (monotonic!) through the right half while <code>a[i] &gt; 2L * a[j]</code>; add <code>j − (mid + 1)</code>.</p>`,
      `<p>Edge cases: negatives (still fine: sorted halves keep the pointer monotonic), overflow (use 2L), result fits int for N ≤ 5·10<sup>4</sup> but use long to be safe. Recipe: count left + right → two-pointer count → merge.</p>`
    ],
    tests: { sig: 'int[] -> int', fn: 'reversePairs', cases: [
      [[[1, 3, 2, 3, 1]], 2],
      [[[2, 4, 3, 5, 1]], 3],
      [[[1]], 0],
      [[[2147483647, 2147483647, 2147483647, 2147483647, 2147483647, 2147483647]], 0],
      [[[-5, -5]], 1],
      [[[5, 4, 3, 2, 1]], 4],
      [[[-2147483648, -1]], 0],
      [[[2147483647, 1073741823]], 1],
      [[[2147483647, 1073741824]], 0]
    ] },
    solution: {
      approach: `<p>Merge sort with a separate linear counting pass before each merge.</p>`,
      code: `
        class Solution {
            public int reversePairs(int[] nums) {
                return (int) sort(nums, 0, nums.length - 1, new int[nums.length]);
            }

            private long sort(int[] a, int lo, int hi, int[] tmp) {
                if (lo >= hi) return 0;
                int mid = (lo + hi) >>> 1;
                long c = sort(a, lo, mid, tmp) + sort(a, mid + 1, hi, tmp);
                int j = mid + 1;
                for (int i = lo; i <= mid; i++) {                  // both halves sorted → j only moves right
                    while (j <= hi && (long) a[i] > 2L * a[j]) j++;
                    c += j - (mid + 1);
                }
                int i = lo, k = lo; j = mid + 1;                    // ordinary merge
                while (i <= mid && j <= hi) tmp[k++] = a[i] <= a[j] ? a[i++] : a[j++];
                while (i <= mid) tmp[k++] = a[i++];
                while (j <= hi) tmp[k++] = a[j++];
                System.arraycopy(tmp, lo, a, lo, hi - lo + 1);
                return c;
            }

            public static void main(String[] args) {
                System.out.println(new Solution().reversePairs(new int[]{2, 4, 3, 5, 1})); // 3
            }
        }`,
      alt: [
        { lang: 'python', code: `def reverse_pairs(nums):
    a = list(nums)

    def sort(lo, hi):
        if lo >= hi:
            return 0
        mid = (lo + hi) // 2
        c = sort(lo, mid) + sort(mid + 1, hi)
        j = mid + 1
        for i in range(lo, mid + 1):             # both halves sorted -> j only moves right
            while j <= hi and a[i] > 2 * a[j]:   # Python ints: 2 * a[j] cannot overflow
                j += 1
            c += j - (mid + 1)
        a[lo:hi + 1] = sorted(a[lo:hi + 1])      # merge (Timsort merges the two runs in linear time)
        return c

    return sort(0, len(a) - 1)` },
        { lang: 'js', code: `function reversePairs(nums) {
  const a = nums.slice(), tmp = new Array(a.length);
  const sort = (lo, hi) => {
    if (lo >= hi) return 0;
    const mid = (lo + hi) >> 1;
    let c = sort(lo, mid) + sort(mid + 1, hi);
    let j = mid + 1;
    for (let i = lo; i <= mid; i++) {          // both halves sorted -> j only moves right
      while (j <= hi && a[i] > 2 * a[j]) j++;  // 2 * a[j] is exact in a Number
      c += j - (mid + 1);
    }
    let i = lo, k = lo; j = mid + 1;           // ordinary merge
    while (i <= mid && j <= hi) tmp[k++] = a[i] <= a[j] ? a[i++] : a[j++];
    while (i <= mid) tmp[k++] = a[i++];
    while (j <= hi) tmp[k++] = a[j++];
    for (k = lo; k <= hi; k++) a[k] = tmp[k];
    return c;
  };
  return sort(0, a.length - 1);
}` },
        { lang: 'cpp', code: `class Solution {
    long long sort(vector<int>& a, int lo, int hi) {
        if (lo >= hi) return 0;
        int mid = lo + (hi - lo) / 2;
        long long c = sort(a, lo, mid) + sort(a, mid + 1, hi);
        int j = mid + 1;
        for (int i = lo; i <= mid; i++) {                   // j only moves right
            while (j <= hi && (long long)a[i] > 2LL * a[j]) j++;   // long long: no overflow
            c += j - (mid + 1);
        }
        inplace_merge(a.begin() + lo, a.begin() + mid + 1, a.begin() + hi + 1);   // ordinary merge
        return c;
    }

public:
    int reversePairs(vector<int> nums) {
        return (int)sort(nums, 0, (int)nums.size() - 1);
    }
};` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public int ReversePairs(int[] nums) {
        return (int)Sort(nums, 0, nums.Length - 1, new int[nums.Length]);
    }

    private long Sort(int[] a, int lo, int hi, int[] tmp) {
        if (lo >= hi) return 0;
        int mid = lo + (hi - lo) / 2;
        long c = Sort(a, lo, mid, tmp) + Sort(a, mid + 1, hi, tmp);
        int j = mid + 1;
        for (int i = lo; i <= mid; i++) {                  // both halves sorted -> j only moves right
            while (j <= hi && (long)a[i] > 2L * a[j]) j++;
            c += j - (mid + 1);
        }
        int i2 = lo, k = lo; j = mid + 1;                   // ordinary merge
        while (i2 <= mid && j <= hi) tmp[k++] = a[i2] <= a[j] ? a[i2++] : a[j++];
        while (i2 <= mid) tmp[k++] = a[i2++];
        while (j <= hi) tmp[k++] = a[j++];
        Array.Copy(tmp, lo, a, lo, hi - lo + 1);
        return c;
    }
}` }
      ],
      complexity: `<p><b>Time O(N log N)</b> — the counting pass is linear per level. <b>Space O(N)</b>.</p>`
    }
  });

  practice.push({
    title: 'Maximum Gap (linear time via radix sort)',
    level: 'Hard',
    tags: ['radix sort', 'counting sort', 'linear time'],
    companies: ['Amazon', 'Google'],
    statement: `<p>Given an unsorted array of non-negative integers, return the <b>maximum difference between two successive elements in its sorted form</b> (0 if fewer than 2 elements). You must run in <b>linear time</b> and linear extra space.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, 0 ≤ nums[i] ≤ 10<sup>9</sup>`,
    example: `<p>[3, 6, 9, 1] → sorted 1, 3, 6, 9 → gaps 2, ${H.c('g', '3')}, ${H.c('g', '3')} → <b>3</b>.</p>`,
    brute: {
      why: `<p>A library sort + one scan is O(N log N) — correct and simple, but the problem explicitly demands linear time. Values fit in 32 bits, so a 4-pass base-256 radix sort is linear.</p>`,
      code: { lang: 'java', code: `
        int brute(int[] nums) {
            if (nums.length < 2) return 0;
            int[] b = nums.clone();
            Arrays.sort(b);
            int best = 0;
            for (int i = 1; i < b.length; i++) best = Math.max(best, b[i] - b[i - 1]);
            return best;
        }`, alt: [{ lang: 'python', code: String.raw`
def maximum_gap(nums):
    if len(nums) < 2:
        return 0
    b = sorted(nums)
    best = 0
    for i in range(1, len(b)):
        best = max(best, b[i] - b[i - 1])
    return best` }, { lang: 'js', code: String.raw`
function maximumGap(nums) {
  if (nums.length < 2) return 0;
  const b = [...nums].sort((x, y) => x - y);
  let best = 0;
  for (let i = 1; i < b.length; i++) best = Math.max(best, b[i] - b[i - 1]);
  return best;
}` }, { lang: 'cpp', code: String.raw`
int maximumGap(const vector<int>& nums) {
    if (nums.size() < 2) return 0;
    vector<int> b = nums;
    sort(b.begin(), b.end());
    int best = 0;
    for (int i = 1; i < (int) b.size(); i++) best = max(best, b[i] - b[i - 1]);
    return best;
}` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public int MaximumGap(int[] nums) {
        if (nums.Length < 2) return 0;
        int[] b = (int[])nums.Clone();
        Array.Sort(b);
        int best = 0;
        for (int i = 1; i < b.Length; i++) best = Math.Max(best, b[i] - b[i - 1]);
        return best;
    }
}` }] }
    },
    mcq: {
      q: 'Base-256 LSD radix sort on 32-bit non-negative ints needs how many passes?',
      options: ['32', '10', '4', '1'],
      answer: 2,
      explain: '32 bits ÷ 8 bits per byte = 4 passes, each a stable counting sort over 256 buckets → O(4·(N + 256)) = O(N).'
    },
    hints: [
      `<p><b>Aha:</b> "linear time" + bounded integers → radix sort (or the pigeonhole bucket trick).</p>`,
      `<p>For shift = 0, 8, 16, 24: stable counting sort on <code>(x &gt;&gt;&gt; shift) &amp; 255</code> using prefix sums and a right-to-left placement into a buffer; swap buffers.</p>`,
      `<p>Edge cases: N &lt; 2 → 0; all equal → 0. Recipe: radix sort → scan adjacent differences → max. (Bucket alternative: N−1 buckets of width ⌈(max−min)/(N−1)⌉; the answer is between buckets, never inside one.)</p>`
    ],
    tests: { sig: 'int[] -> int', fn: 'maximumGap', cases: [
      [[[3, 6, 9, 1]], 3],
      [[[10]], 0],
      [[[1, 1, 1]], 0],
      [[[1, 1000000000]], 999999999],
      [[[0, 0, 5]], 5],
      [[[100, 3, 2, 1]], 97],
      [[[1, 10000000, 0]], 9999999],
      [[[256, 65536, 16777216, 0]], 16711680]
    ] },
    solution: {
      approach: `<p>LSD radix sort with 8-bit digits, then a linear scan.</p>`,
      code: `
        class Solution {
            public int maximumGap(int[] nums) {
                int n = nums.length;
                if (n < 2) return 0;
                int[] a = nums.clone(), buf = new int[n];
                for (int shift = 0; shift < 32; shift += 8) {
                    int[] cnt = new int[257];
                    for (int x : a) cnt[((x >>> shift) & 255) + 1]++;     // count digits (shifted by 1)
                    for (int d = 0; d < 256; d++) cnt[d + 1] += cnt[d];  // cnt[d] = first slot for digit d
                    for (int x : a) buf[cnt[(x >>> shift) & 255]++] = x; // left-to-right with start slots: stable
                    int[] t = a; a = buf; buf = t;                        // swap roles
                }
                int best = 0;
                for (int i = 1; i < n; i++) best = Math.max(best, a[i] - a[i - 1]);
                return best;
            }

            public static void main(String[] args) {
                System.out.println(new Solution().maximumGap(new int[]{3, 6, 9, 1})); // 3
            }
        }`,
      alt: [
        { lang: 'python', code: `def maximum_gap(nums):
    if len(nums) < 2:
        return 0
    a = list(nums)
    for shift in (0, 8, 16, 24):             # LSD radix sort, one byte per pass
        buckets = [[] for _ in range(256)]
        for x in a:
            buckets[(x >> shift) & 255].append(x)   # appending keeps each pass stable
        a = [x for b in buckets for x in b]
    return max(a[i] - a[i - 1] for i in range(1, len(a)))` },
        { lang: 'js', code: `function maximumGap(nums) {
  const n = nums.length;
  if (n < 2) return 0;
  let a = Int32Array.from(nums), buf = new Int32Array(n);
  for (let shift = 0; shift < 32; shift += 8) {
    const cnt = new Int32Array(257);
    for (const x of a) cnt[((x >>> shift) & 255) + 1]++;     // count digits (shifted by 1)
    for (let d = 0; d < 256; d++) cnt[d + 1] += cnt[d];      // cnt[d] = first slot for digit d
    for (const x of a) buf[cnt[(x >>> shift) & 255]++] = x;  // left to right: stable
    [a, buf] = [buf, a];                                      // swap roles
  }
  let best = 0;
  for (let i = 1; i < n; i++) best = Math.max(best, a[i] - a[i - 1]);
  return best;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int maximumGap(const vector<int>& nums) {
        int n = nums.size();
        if (n < 2) return 0;
        vector<unsigned> a(nums.begin(), nums.end()), buf(n);
        for (int shift = 0; shift < 32; shift += 8) {
            array<int, 257> cnt{};
            for (unsigned x : a) cnt[((x >> shift) & 255) + 1]++;    // count digits (shifted by 1)
            for (int d = 0; d < 256; d++) cnt[d + 1] += cnt[d];      // first slot for digit d
            for (unsigned x : a) buf[cnt[(x >> shift) & 255]++] = x; // left to right: stable
            a.swap(buf);
        }
        unsigned best = 0;
        for (int i = 1; i < n; i++) best = max(best, a[i] - a[i - 1]);
        return (int)best;
    }
};` }, { lang: 'csharp', code: String.raw`
using System;

public class Solution {
    public int MaximumGap(int[] nums) {
        int n = nums.Length;
        if (n < 2) return 0;
        uint[] a = new uint[n], buf = new uint[n];             // unsigned: >> always fills with 0
        for (int i = 0; i < n; i++) a[i] = (uint)nums[i];
        for (int shift = 0; shift < 32; shift += 8) {
            int[] cnt = new int[257];
            foreach (uint x in a) cnt[((x >> shift) & 255) + 1]++;     // count digits (shifted by 1)
            for (int d = 0; d < 256; d++) cnt[d + 1] += cnt[d];       // cnt[d] = first slot for digit d
            foreach (uint x in a) buf[cnt[(x >> shift) & 255]++] = x; // left-to-right with start slots: stable
            uint[] t = a; a = buf; buf = t;                           // swap roles
        }
        uint best = 0;
        for (int i = 1; i < n; i++) best = Math.Max(best, a[i] - a[i - 1]);
        return (int)best;
    }
}` }
      ],
      complexity: `<p><b>Time O(4·(N + 256)) = O(N)</b>, <b>space O(N)</b>. (Stable here because each slot pointer starts at the digit's <b>first</b> position and items are placed left to right — the mirror image of the right-to-left version.)</p>`
    }
  });

  practice.push({
    title: 'Employee Free Time',
    level: 'Hard',
    tags: ['intervals', 'merge intervals', 'sweep'],
    companies: ['Google', 'Airbnb', 'Uber'],
    statement: `<p>Each employee has a sorted list of non-overlapping working intervals. Return the list of <b>finite intervals of positive length</b> when <b>all</b> employees are free, sorted.</p>`,
    constraints: `1 ≤ employees ≤ 50, total intervals ≤ 10<sup>4</sup>, 0 ≤ start &lt; end ≤ 10<sup>8</sup>`,
    example: `<p>schedule = [[[1,2],[5,6]], [[1,3]], [[4,10]]] → <b>[[3,4]]</b>. Merge all busy time: [1,3] and [4,10] → the only gap is ${H.c('g', '[3,4]')}. (−∞..1 and 10..∞ are not finite, so they do not count.)</p>`,
    brute: {
      why: `<p>Mark every time unit in a boolean timeline up to 10<sup>8</sup> and read off the gaps: O(T) memory and time — 100 MB and far too slow. Only interval <b>endpoints</b> matter, so sort-and-merge works in O(N log N).</p>`,
      code: { lang: 'java', code: `
        List<int[]> brute(List<List<int[]>> schedule) {
            int maxT = 0;
            for (List<int[]> emp : schedule) for (int[] iv : emp) maxT = Math.max(maxT, iv[1]);
            boolean[] busy = new boolean[maxT + 1];               // one cell per time unit [t, t+1)
            int minT = Integer.MAX_VALUE;
            for (List<int[]> emp : schedule)
                for (int[] iv : emp) {
                    minT = Math.min(minT, iv[0]);
                    for (int t = iv[0]; t < iv[1]; t++) busy[t] = true;
                }
            List<int[]> res = new ArrayList<>();
            for (int t = minT; t < maxT; t++) {
                if (!busy[t]) {
                    int s = t;
                    while (t < maxT && !busy[t]) t++;
                    res.add(new int[]{s, t});
                }
            }
            return res;
        }`, alt: [{ lang: 'python', code: String.raw`
def employee_free_time(schedule):
    max_t = 0
    for emp in schedule:
        for iv in emp:
            max_t = max(max_t, iv[1])
    busy = [False] * (max_t + 1)                      # one cell per time unit [t, t+1)
    min_t = float('inf')
    for emp in schedule:
        for iv in emp:
            min_t = min(min_t, iv[0])
            for t in range(iv[0], iv[1]):
                busy[t] = True
    res = []
    t = min_t
    while t < max_t:
        if not busy[t]:
            s = t
            while t < max_t and not busy[t]:
                t += 1
            res.append([s, t])
        t += 1
    return res` }, { lang: 'js', code: String.raw`
function employeeFreeTime(schedule) {
  let maxT = 0;
  for (const emp of schedule) for (const iv of emp) maxT = Math.max(maxT, iv[1]);
  const busy = new Array(maxT + 1).fill(false);         // one cell per time unit [t, t+1)
  let minT = Infinity;
  for (const emp of schedule)
    for (const iv of emp) {
      minT = Math.min(minT, iv[0]);
      for (let t = iv[0]; t < iv[1]; t++) busy[t] = true;
    }
  const res = [];
  for (let t = minT; t < maxT; t++) {
    if (!busy[t]) {
      const s = t;
      while (t < maxT && !busy[t]) t++;
      res.push([s, t]);
    }
  }
  return res;
}` }, { lang: 'cpp', code: String.raw`
vector<vector<int>> employeeFreeTime(const vector<vector<vector<int>>>& schedule) {
    int maxT = 0;
    for (const auto& emp : schedule) for (const auto& iv : emp) maxT = max(maxT, iv[1]);
    vector<bool> busy(maxT + 1, false);                 // one cell per time unit [t, t+1)
    int minT = INT_MAX;
    for (const auto& emp : schedule)
        for (const auto& iv : emp) {
            minT = min(minT, iv[0]);
            for (int t = iv[0]; t < iv[1]; t++) busy[t] = true;
        }
    vector<vector<int>> res;
    for (int t = minT; t < maxT; t++) {
        if (!busy[t]) {
            int s = t;
            while (t < maxT && !busy[t]) t++;
            res.push_back({s, t});
        }
    }
    return res;
}` }, { lang: 'csharp', code: String.raw`
using System;
using System.Collections.Generic;

public class Solution {
    public IList<int[]> EmployeeFreeTime(IList<IList<int[]>> schedule) {
        int maxT = 0;
        foreach (var emp in schedule) foreach (int[] iv in emp) maxT = Math.Max(maxT, iv[1]);
        bool[] busy = new bool[maxT + 1];                     // one cell per time unit [t, t+1)
        int minT = int.MaxValue;
        foreach (var emp in schedule)
            foreach (int[] iv in emp) {
                minT = Math.Min(minT, iv[0]);
                for (int t = iv[0]; t < iv[1]; t++) busy[t] = true;
            }
        var res = new List<int[]>();
        for (int t = minT; t < maxT; t++) {
            if (!busy[t]) {
                int s = t;
                while (t < maxT && !busy[t]) t++;
                res.Add(new[] { s, t });
            }
        }
        return res;
    }
}` }] }
    },
    mcq: {
      q: 'After merging all employees\' intervals into blocks [1,3], [4,10], [12,15], what is the answer?',
      options: ['[[3,4],[10,12]]', '[[0,1],[3,4],[10,12],[15,∞]]', '[[1,15]]', '[]'],
      answer: 0,
      explain: 'Common free time is exactly the gaps between consecutive merged busy blocks; the unbounded ends are excluded.'
    },
    hints: [
      `<p><b>Aha:</b> "everyone is free" = "nobody is busy" = gaps in the <b>union</b> of all busy intervals — merge intervals!</p>`,
      `<p>Flatten all intervals, sort by start, sweep keeping the current block end; whenever a start is greater than the current end, the range [end, start] is free.</p>`,
      `<p>Edge cases: touching blocks ([1,3] and [3,5]) leave no gap (use &gt;, not ≥); one employee; nested intervals (use max for the end). Recipe: flatten → sort → end = first end → for each: if start &gt; end add [end, start]; end = max(end, cur end).</p>`
    ],
    tests: { sig: 'list<list<int[]>> -> list<int[]>', fn: 'employeeFreeTime', cases: [
      [[[[[1, 2], [5, 6]], [[1, 3]], [[4, 10]]]], [[3, 4]]],
      [[[[[1, 3], [6, 7]], [[2, 4]], [[2, 5], [9, 12]]]], [[5, 6], [7, 9]]],
      [[[[[1, 2]]]], []],
      [[[[[1, 3]], [[3, 5]]]], []],
      [[[[[1, 2], [4, 5], [9, 10]]]], [[2, 4], [5, 9]]],
      [[[[[0, 100000000]], [[5, 6]]]], []],
      [[[[[1, 10]], [[2, 3], [12, 13]]]], [[10, 12]]]
    ] },
    solution: {
      approach: `<p>Merge all busy intervals and report the gaps. (A K-way merge with a heap avoids the global sort, giving O(N log K).)</p>`,
      code: `
        class Solution {
            public List<int[]> employeeFreeTime(List<List<int[]>> schedule) {
                List<int[]> all = new ArrayList<>();
                for (List<int[]> emp : schedule) all.addAll(emp);
                all.sort((x, y) -> Integer.compare(x[0], y[0]));      // by start
                List<int[]> free = new ArrayList<>();
                int end = all.get(0)[1];
                for (int[] cur : all) {
                    if (cur[0] > end) free.add(new int[]{end, cur[0]});  // a gap nobody covers
                    end = Math.max(end, cur[1]);                          // extend the busy block
                }
                return free;
            }

            public static void main(String[] args) {
                List<List<int[]>> s = List.of(
                    List.of(new int[]{1, 2}, new int[]{5, 6}),
                    List.of(new int[]{1, 3}),
                    List.of(new int[]{4, 10}));
                for (int[] f : new Solution().employeeFreeTime(s)) System.out.println(Arrays.toString(f)); // [3, 4]
            }
        }`,
      alt: [
        { lang: 'python', code: `def employee_free_time(schedule):
    busy = sorted(iv for emp in schedule for iv in emp)   # flatten, sort by start
    free, end = [], busy[0][1]
    for s, e in busy:
        if s > end:
            free.append([end, s])            # a gap nobody covers
        end = max(end, e)                    # extend the busy block
    return free` },
        { lang: 'js', code: `function employeeFreeTime(schedule) {
  const busy = schedule.flat().sort((x, y) => x[0] - y[0]);   // flatten, sort by start
  const free = [];
  let end = busy[0][1];
  for (const [s, e] of busy) {
    if (s > end) free.push([end, s]);        // a gap nobody covers
    end = Math.max(end, e);                  // extend the busy block
  }
  return free;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<vector<int>> employeeFreeTime(const vector<vector<vector<int>>>& schedule) {
        vector<vector<int>> busy;
        for (const auto& emp : schedule) busy.insert(busy.end(), emp.begin(), emp.end());
        sort(busy.begin(), busy.end());                       // by start
        vector<vector<int>> free;
        int end = busy[0][1];
        for (const auto& cur : busy) {
            if (cur[0] > end) free.push_back({end, cur[0]});  // a gap nobody covers
            end = max(end, cur[1]);                           // extend the busy block
        }
        return free;
    }
};` }, { lang: 'csharp', code: String.raw`
using System;
using System.Collections.Generic;

public class Solution {
    public IList<int[]> EmployeeFreeTime(IList<IList<int[]>> schedule) {
        var all = new List<int[]>();
        foreach (var emp in schedule) all.AddRange(emp);
        all.Sort((x, y) => x[0].CompareTo(y[0]));              // by start
        var free = new List<int[]>();
        int end = all[0][1];
        foreach (int[] cur in all) {
            if (cur[0] > end) free.Add(new[] { end, cur[0] });   // a gap nobody covers
            end = Math.Max(end, cur[1]);                          // extend the busy block
        }
        return free;
    }
}` }
      ],
      complexity: `<p><b>Time O(N log N)</b> for N total intervals (O(N log K) with a K-way heap merge). <b>Space O(N)</b>.</p>`
    }
  });

  // =====================================================================
  // QUIZ
  // =====================================================================
  quiz.push(
    { q: 'Which simple sort is the best choice for an array that is already <b>almost sorted</b>?', options: ['Selection sort', 'Insertion sort', 'Bubble sort without the early-exit flag', 'Quick sort with last-element pivot'], answer: 1, explain: 'Insertion sort costs (N − 1) + (number of inversions); an almost-sorted array has few inversions, so it runs in nearly O(N). Quick sort with a last pivot is at its worst on sorted data.' },
    { q: 'The minimum number of <b>adjacent swaps</b> needed to sort [3, 1, 2] is…', options: ['1', '2', '3', '0'], answer: 1, explain: 'Inversions are (3,1) and (3,2) → 2. Each adjacent swap fixes exactly one inversion.' },
    { q: 'You must sort 10<sup>7</sup> ages (0..120). Best approach?', options: ['Merge sort', 'Quick sort', 'Counting sort with 121 counters', 'Insertion sort'], answer: 2, explain: 'The value range is tiny, so counting sort runs in O(N + 121) and beats any O(N log N) comparison sort.' },
    { q: 'Why must each pass of LSD radix sort be <b>stable</b>?', options: ['To save memory', 'So ties on the current digit keep the order produced by earlier (less significant) digits', 'Stability makes it O(N)', 'It does not need to be'], answer: 1, explain: 'After sorting by the tens digit, numbers with the same tens digit must stay ordered by their ones digit — only a stable pass guarantees that.' },
    { q: 'Merge sort time complexity in the <b>worst</b> case and its extra space for arrays?', options: ['O(N<sup>2</sup>), O(1)', 'O(N log N), O(N)', 'O(N log N), O(1)', 'O(N), O(N)'], answer: 1, explain: 'log₂N levels × N work per level in every case; merging arrays needs an O(N) temporary buffer.' },
    { q: 'During the merge, left = [4, 7, 9] and right = [5]. Taking 5 adds how many inversions?', options: ['0', '1', '2', '3'], answer: 2, explain: 'First 4 (≤ 5) is taken from the left with no inversion. Then 5 is taken while 7 and 9 are still waiting in the left pile; both were originally before 5 and are bigger → +2.' },
    { q: 'Lomuto partition with pivot = last element on an <b>already sorted</b> array of N items gives…', options: ['Balanced halves, O(N log N)', 'One empty side every time, O(N<sup>2</sup>) and recursion depth N', 'O(N)', 'An exception'], answer: 1, explain: 'The pivot is always the maximum, so each partition only removes one item: N + (N−1) + … ≈ N<sup>2</sup>/2.' },
    { q: 'Expected time of quickselect with a random pivot for the k-th smallest?', options: ['O(log N)', 'O(N)', 'O(N log N)', 'O(N<sup>2</sup>)'], answer: 1, explain: 'Only one side is explored and it shrinks by a constant factor on average: N + N/2 + N/4 + … ≈ 2N.' },
    { q: 'Which Java comparator is <b>correct</b> for sorting <code>Integer[]</code> descending when values can be near ±2·10<sup>9</sup>?', options: ['(a, b) -&gt; b - a', '(a, b) -&gt; Integer.compare(b, a)', '(a, b) -&gt; a - b', '(a, b) -&gt; (b &gt; a) ? 1 : 0'], answer: 1, explain: 'Subtraction overflows; returning only 1/0 breaks the contract (never negative). Integer.compare(b, a) is safe and correct.' },
    { q: 'Which list contains <b>only stable</b> algorithms?', options: ['Quick, merge, insertion', 'Merge, insertion, counting (prefix version)', 'Selection, bubble, merge', 'Heap, radix, merge'], answer: 1, explain: 'Quick, selection and heap sort make long-distance swaps and are unstable; merge (ties go left), insertion (strict &gt;) and prefix-sum counting sort are stable.' },
    { q: 'In merge intervals, after sorting by start, the last block is [2, 9] and the current interval is [4, 6]. New last block?', options: ['[2, 6]', '[4, 9]', '[2, 9]', '[2, 9] and [4, 6] separately'], answer: 2, explain: '4 ≤ 9 overlaps; new end = max(9, 6) = 9 — the interval is swallowed.' },
    { q: 'Insert interval into a sorted, non-overlapping list of N intervals. Best time complexity?', options: ['O(N log N) — append and re-sort', 'O(N) — copy before, fuse overlaps, copy after', 'O(log N) for the whole output', 'O(N<sup>2</sup>)'], answer: 1, explain: 'The list is already sorted, so a single three-phase walk suffices. Binary search can locate the spot in O(log N), but producing the output still takes O(N).' },
    { q: 'Meetings [1,5), [5,8), [2,6). Minimum rooms?', options: ['1', '2', '3', '4'], answer: 1, explain: 'At time 2–5, [1,5) and [2,6) overlap (2 rooms). [5,8) can reuse the room freed at 5 because intervals are half-open. Maximum overlap = 2.' },
    { q: 'For "remove the fewest intervals so none overlap", you should sort by…', options: ['Start ascending', 'End ascending, then keep greedily', 'Length descending', 'Random order'], answer: 1, explain: 'Keeping the interval that ends earliest leaves the most room for the rest (activity selection, proven by an exchange argument).' }
  );

  // =====================================================================
  // INTERVIEW Q&A
  // =====================================================================
  interview.push(
    {
      q: 'Compare bubble, selection and insertion sort. When would you actually use one of them?', level: 'B',
      a: `<p>All three are O(N<sup>2</sup>) in the worst case and O(1) extra space. <b>Bubble</b> swaps neighbours; with an early-exit flag it is O(N) on sorted input; stable. <b>Selection</b> always does ~N<sup>2</sup>/2 comparisons but at most N − 1 swaps; unstable. <b>Insertion</b> does (N − 1) + inversions work, so it is near-linear on nearly sorted data; stable, online (can sort items as they arrive). In practice I would use <b>insertion sort</b> for tiny or almost-sorted inputs — which is exactly why TimSort and dual-pivot quick sort use it for small runs — and selection sort only when writes are very expensive.</p>`,
      followUps: ['Why is insertion sort called "online"?', 'How many swaps does bubble sort make in terms of inversions?', 'What is Shell sort and how does it improve insertion sort?']
    },
    {
      q: 'Can any sort beat O(N log N)? Explain counting and radix sort.', level: 'I',
      a: `<p>Comparison sorts cannot: a decision tree must distinguish N! orders, so its height is at least log₂(N!) ≈ N log₂N. Non-comparison sorts escape this by using the <b>value as an index</b>. <b>Counting sort</b> is O(N + K) for values in 0..K (great for ages, marks, letters; terrible for K = 10<sup>9</sup>). The prefix-sum version, placing items right-to-left, is <b>stable</b>. <b>LSD radix sort</b> runs a stable counting sort per digit, least significant first: O(d·(N + base)); with base 256, a 32-bit int needs 4 passes, so it is linear for fixed-width keys.</p>`,
      followUps: ['How do you handle negative numbers in radix sort?', 'Why does radix sort need each pass to be stable?', 'When is radix sort slower than quick sort in practice?']
    },
    {
      q: 'Walk me through merge sort and prove its complexity.', level: 'B',
      a: `<p>Split the array in half, sort each half recursively, then <b>merge</b> the two sorted halves with two pointers, always taking the smaller head (ties from the left for stability). Recurrence: T(N) = 2T(N/2) + O(N). There are log₂N levels and each level merges N elements in total, so <b>O(N log N) in every case</b>. Space is O(N) for the temp buffer plus O(log N) stack. It is stable, predictable, works great on linked lists (O(1) extra) and on data larger than memory (external merge sort).</p>`,
      followUps: ['How would you make merge sort O(N) on already sorted input?', 'Write bottom-up merge sort.', 'How does external sorting of a 1 TB file work?']
    },
    {
      q: 'How do you count inversions in O(N log N)?', level: 'I',
      a: `<p>Inversions = (inside left half) + (inside right half) + (cross pairs). Use merge sort: while merging two sorted halves, when the right head <code>a[j]</code> is strictly smaller than the left head <code>a[i]</code>, it is also smaller than every remaining left element, so add <code>mid − i + 1</code> at once. Equal values are not inversions, so on ties take the left element first. Use <code>long</code> — the count can reach N(N−1)/2 ≈ 5·10<sup>9</sup> for N = 10<sup>5</sup>. The same idea extends to "reverse pairs" (separate two-pointer counting before the merge) and "count smaller after self" (sort indices).</p>`,
      followUps: ['What does the inversion count tell you about bubble sort?', 'Solve it with a Fenwick tree instead.', 'Count pairs with a[i] &gt; 2·a[j].']
    },
    {
      q: 'Explain Lomuto vs Hoare partitioning.', level: 'I',
      a: `<p><b>Lomuto</b>: pivot = last element; pointer i marks the end of the "&lt; pivot" zone; j scans and swaps small items into the zone; finally the pivot is swapped to index i, its <b>final position</b>. Simple, but more swaps and it degrades on many duplicates. <b>Hoare</b>: pointers start at both ends, i stops on an item ≥ pivot, j on an item ≤ pivot, swap, repeat until they cross; return j and recurse on [lo..j] and [j+1..hi]. About 3× fewer swaps and better with duplicates, but the pivot is not necessarily at j, and choosing a[hi] as pivot can cause infinite recursion — use the lower middle.</p>`,
      followUps: ['Which one would you use for quickselect and why?', 'What is a 3-way partition?', 'Trace Hoare partition on [3, 8, 2, 5, 1, 4, 7, 6].']
    },
    {
      q: 'What is quick sort\'s worst case, and how do real libraries avoid it?', level: 'A',
      a: `<p>Worst case O(N<sup>2</sup>) time and O(N) stack, when pivots are repeatedly the min/max — e.g. last-element pivot on sorted input, or Lomuto on all-equal values. Defences: <b>random pivots</b> (expected O(N log N) for any input), <b>median-of-three</b>, <b>3-way partitioning</b> for duplicates, recursing on the smaller side to cap the stack at O(log N), and <b>introsort</b>: switch to heap sort when depth exceeds ~2 log₂N (C++ <code>std::sort</code>), guaranteeing O(N log N). Java's <code>Arrays.sort(int[])</code> uses a tuned dual-pivot quick sort with insertion sort for tiny ranges.</p>`,
      followUps: ['Why is quick sort usually faster than merge sort despite more comparisons?', 'What is an anti-quicksort (killer) input?', 'Why is quick sort not stable?']
    },
    {
      q: 'Find the k-th largest element. Compare sorting, heap and quickselect.', level: 'I',
      a: `<p><b>Sort</b>: O(N log N), simplest. <b>Min-heap of size k</b>: O(N log k) time, O(k) memory, works on streams and is deterministic. <b>Quickselect</b>: partition, keep only the side containing index N − k: expected O(N), worst O(N<sup>2</sup>), in place. With heavy duplicates use a 3-way partition, and pick random pivots against adversarial input. Median-of-medians makes it worst-case O(N) but with a large constant. In an interview I'd code quickselect, mention the heap for streams/top-k, and state the trade-offs.</p>`,
      followUps: ['How would you find the top k elements, not just the k-th?', 'What changes if the data is a stream of 10<sup>9</sup> numbers?', 'Prove the expected O(N) bound informally.']
    },
    {
      q: 'How do custom comparators work (Java first, then other languages), and what are the common bugs?', level: 'B',
      a: `<p><code>compare(a, b)</code> returns negative if a goes first, positive if b goes first, 0 for a tie. Primitive arrays (<code>int[]</code>) cannot take a comparator — box to <code>Integer[]</code> or sort and reverse. Multi-key: compare the first key; only if equal, compare the next (or <code>comparingInt(...).thenComparing(...)</code>). Bugs: <b>subtraction overflow</b> (<code>a - b</code> with large values — use <code>Integer.compare</code>), comparators that violate the contract (random results → "Comparison method violates its general contract!"), <code>reversed()</code> applying to the whole chain, and comparators inconsistent with equals inside a TreeSet, which silently drops "equal" elements. Elsewhere: Python prefers a <code>key=</code> function (a tuple for several keys, <code>cmp_to_key</code> for a two-argument rule); JavaScript's default sort compares numbers as strings, so always pass a comparator; a C++ comparator is a strict "less than" that returns a <code>bool</code> (<code>&lt;=</code> breaks it).</p>`,
      followUps: ['How would you sort strings to form the largest number?', 'Comparable vs Comparator?', 'How do you sort a 2D array by column 1 descending, then column 0 ascending?']
    },
    {
      q: 'What is a stable sort and why does it matter?', level: 'B',
      a: `<p>A stable sort keeps items with equal keys in their original relative order. It matters for records (not plain ints): multi-key sorting in passes (sort by the secondary key, then stable-sort by the primary), LSD radix sort, UI tables that sort by one column after another, and deterministic output. Stable: bubble, insertion, merge, counting (prefix version), radix, TimSort. Unstable: selection, quick, heap. In Java, object sorts (<code>Arrays.sort(T[])</code>, <code>List.sort</code>) are guaranteed stable; any sort becomes stable if you add the original index as the final tie-breaker.</p>`,
      followUps: ['Show why selection sort is unstable with 3 elements.', 'How do you get deterministic pagination in SQL?', 'Is there a stable in-place O(N log N) sort?']
    },
    {
      q: 'Merge overlapping intervals — algorithm, proof and pitfalls.', level: 'B',
      a: `<p>Sort by start (O(N log N)), then sweep: if the current start ≤ the last block's end, extend the end with <code>max</code>; otherwise start a new block. Proof: after sorting, once an interval starts after the last block's end, all later intervals do too, so that block is final — we only ever compare with the last block. Pitfalls: forgetting <code>max</code> (nested intervals shrink the block), the touching rule (≤ for closed ranges, &lt; for half-open meetings), comparator overflow with subtraction, and mutating the input arrays unintentionally.</p>`,
      followUps: ['How would you merge intervals arriving as a stream?', 'Compute total covered length.', 'Merge intervals stored in a TreeMap as they are inserted.']
    },
    {
      q: 'Insert an interval into a sorted, non-overlapping list. Then: what if there are millions of inserts?', level: 'I',
      a: `<p>Single insert: one O(N) walk in three phases — copy intervals that end before the new start, absorb every interval whose start ≤ new end (widening with min/max), add the fused interval once, copy the rest. No sort needed because the input is already sorted. For <b>many inserts</b>, keep the disjoint blocks in a balanced BST (Java <code>TreeMap&lt;start, end&gt;</code>, C++ <code>std::map</code>, Python <code>sortedcontainers</code>): check <code>floorEntry</code> for a left neighbour, then remove overlapping <code>ceilingEntry</code> blocks while their start ≤ new end. Each block is removed at most once, so inserts are O(log N) amortised.</p>`,
      followUps: ['How do you remove an interval from the set?', 'How do you answer "is point x covered?" quickly?', 'What changes for half-open intervals?']
    },
    {
      q: 'Minimum meeting rooms: explain two approaches and why the answer is correct.', level: 'I',
      a: `<p>The answer equals the <b>maximum number of overlapping meetings</b> at any instant. Approach 1: sort by start, keep a min-heap of end times; for each meeting, if the earliest end ≤ its start, pop (reuse that room); push its end; the final heap size is the answer — O(N log N). Approach 2: sort starts and ends separately; walk starts with a pointer into ends: if start ≥ ends[j], a room was freed (j++), else open a new room. Correctness: at the peak, k meetings overlap so k rooms are necessary; the greedy only opens a new room when all current rooms are busy, so it never exceeds the peak.</p>`,
      followUps: ['How do ties (end == start) change the answer?', 'Return the room assigned to each meeting.', 'Solve Meeting Rooms III with delays.']
    },
    {
      q: 'Which sorting algorithm does Java use internally, and why different ones?', level: 'A',
      a: `<p><code>Arrays.sort</code> on <b>primitives</b> uses a dual-pivot quick sort (with insertion sort for tiny ranges, and special handling such as counting sort for large byte/short/char arrays): fast, in place, and stability is irrelevant because equal primitives are indistinguishable. On <b>objects</b> (<code>Arrays.sort(T[])</code>, <code>Collections.sort</code>, <code>List.sort</code>) it uses <b>TimSort</b>: stable (required for objects), O(N) on already sorted or reverse-sorted input, O(N log N) worst case, but needs up to N/2 extra references. <code>Arrays.parallelSort</code> uses a parallel merge-based approach for large arrays. For comparison: Python uses TimSort (Powersort merge policy since 3.11) for everything; V8 (Node, Chrome) uses TimSort for <code>Array.prototype.sort</code>; C++ <code>std::sort</code> is introsort (quick sort + heap sort fallback + insertion sort, not stable) and <code>std::stable_sort</code> is a merge sort.</p>`,
      followUps: ['What is a "run" in TimSort?', 'Why can a comparator bug crash TimSort but not quick sort on int[]?', 'How does Python sort?']
    },
    {
      q: 'How do you approach an unseen problem that "looks like" sorting or intervals?', level: 'E',
      a: `<p>Read the clues: "pairs i &lt; j with a condition" → think merge sort counting; "k-th / top k" → quickselect or heap; "small value range" → counting sort; "ranges, bookings, sessions, [start, end]" → sort by start (merging, rooms) or by end (maximising kept intervals, arrows); "keep original order on ties" → stable sort. Then state the brute force and its cost, identify the wasted work (re-comparing, re-sorting known order), pick the structure that removes it, decide endpoint conventions and overflow types, dry-run on a tiny example, and test edge cases: empty, one element, all equal, sorted, reverse sorted, touching intervals.</p>`,
      followUps: ['Give an example where sorting by start is wrong and by end is right.', 'How do you test a sorting-based solution quickly?', 'When is sorting not allowed or too slow?']
    }
  );

  // =====================================================================
  // REGISTER
  // =====================================================================
  registerModule({
    id: 'dsa07',
    title: 'Sorting Algorithms & Intervals',
    intro: `<p>Sorting is the quiet superpower behind a huge number of interview problems: once data is in order, duplicates sit next to each other, overlaps become neighbours, and binary search and two pointers start working. In this module you will build every classic sort <b>by hand</b> — bubble, selection and insertion for intuition, counting and radix sort that beat N log N, merge sort (plus its famous inversion-count trick) and quick sort with Lomuto and Hoare partitioning and quickselect.</p>
      <p>Then you will learn to bend your language's built-in sorts to your will with <b>custom comparators</b>, understand <b>stability</b> and why it matters for real records, and finish with the most common sorting application in interviews: <b>intervals</b> — merging, inserting, and the meeting rooms family. Every topic has an analogy, a step-by-step visualizer you can feed your own input, worked examples, clues that tell you which idea a question wants, and a look at how AI tools change the game.</p>`,
    goals: [
      'Trace bubble, selection, insertion, merge and quick sort by hand and state each one\'s best/worst complexity, space and stability',
      'Use counting sort and radix sort when the value range is small, and explain why comparison sorts cannot beat O(N log N)',
      'Count inversions (and reverse pairs / smaller-after-self) by modifying merge sort in O(N log N)',
      'Partition with Lomuto, Hoare and 3-way (Dutch flag) and find the k-th smallest/largest with quickselect in expected O(N)',
      'Write correct, overflow-safe, multi-key comparators (or key functions) in your language and know which built-in sorts are stable',
      'Solve merge intervals, insert interval, meeting rooms I/II and minimum platforms, with the right endpoint convention'
    ],
    prereqs: `DSA 2 (Math Foundations &amp; Time/Space Complexity) for N log N reasoning, DSA 5 (Arrays &amp; Prefix Sums) for count/prefix arrays, and DSA 6 (Two Pointers) for the merge and partition steps. Basic Java recursion helps for merge and quick sort.`,
    hours: 14,
    langNotes: {
      java: `<p><b>Java:</b> <code>Arrays.sort(int[])</code> is an unstable dual-pivot quick sort and takes no comparator; object sorts (<code>Arrays.sort(T[], cmp)</code>, <code>List.sort</code>, <code>Collections.sort</code>) are a stable TimSort. To sort an <code>int[]</code> descending, sort and reverse, or box to <code>Integer[]</code>. <code>int</code> overflow wraps silently: write comparators with <code>Integer.compare</code> / <code>Long.compare</code> (never <code>a - b</code>) and count inversions in a <code>long</code>. <code>PriorityQueue</code> is a min-heap (pass <code>Comparator.reverseOrder()</code> for a max-heap). Recursion is fine to about 10k frames: merge sort is only log₂N deep, but quick sort with a bad pivot can be N deep, so use random pivots.</p>`,
      python: `<p><b>Python:</b> <code>sorted()</code> (new list) and <code>list.sort()</code> (in place) are a stable TimSort; pass a <code>key=</code> function (a tuple such as <code>(-marks, name)</code> gives several keys at once) and use <code>functools.cmp_to_key</code> only for a true two-argument rule like "Largest Number". Integers never overflow, so <code>a - b</code> and inversion counts are safe. <code>heapq</code> is a min-heap only: negate values for a max-heap. Recursion stops at about 1000 frames by default: merge sort is only log₂N deep, but a worst-case quick sort is N deep, so prefer random pivots or loops (or <code>sys.setrecursionlimit</code> with <code>threading.stack_size</code>). <code>list.pop(0)</code> and <code>list.insert(0, x)</code> are O(N); slicing makes copies.</p>`,
      js: `<p><b>JavaScript:</b> <code>arr.sort()</code> with no comparator compares <b>as strings</b> (<code>[10, 9, 1].sort()</code> gives <code>[1, 10, 9]</code>), so always pass <code>(a, b) =&gt; a - b</code>, or use a typed array (<code>Int32Array</code>), which sorts numerically. The sort is stable (ES2019+) and in place, so copy first (<code>[...a]</code>) when the caller's order matters. <code>Number</code> is exact to 2<sup>53</sup>: <code>a - b</code> is safe for 32-bit values and inversion counts up to ~5·10<sup>9</sup>, but use <code>BigInt</code> beyond that; <code>|0</code> truncates to 32 bits. There is <b>no built-in heap</b>: this module's heap solutions include a small <code>MinHeap</code> class (<code>push</code>, <code>pop</code>, <code>peek</code>, <code>size</code>, with a comparator). <code>array.shift()</code> is O(N). Recursion is fine to about 10k frames.</p>`,
      cpp: `<p><b>C++:</b> <code>std::sort</code> is an unstable introsort; use <code>std::stable_sort</code> when ties must keep their order (log files, multi-pass sorts). A comparator is a strict "less than" returning <code>bool</code>: use <code>&lt;</code>, never <code>&lt;=</code> (that breaks the strict weak ordering and can crash), and never subtract, since signed overflow is undefined behaviour; use <code>long long</code> for counts and squared distances. <code>vector</code>s and <code>pair</code>s already compare lexicographically, so <code>sort</code> on intervals sorts by start, then end. <code>priority_queue</code> is a <b>max</b>-heap: use <code>priority_queue&lt;int, vector&lt;int&gt;, greater&lt;int&gt;&gt;</code> for the min-heap of end times. Handy library pieces: <code>nth_element</code> (quickselect), <code>inplace_merge</code> (the merge step), <code>partial_sum</code> (prefix counts). The default stack is about 8 MB.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
