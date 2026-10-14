// REFERENCE EXAMPLE (shape only — real modules need the full counts listed in docs/AUTHORING.md).
// Shows every field and every visualizer part type. File location for a real module: content/<track>/<id>.js
registerModule({
  id: 'dsa08',
  title: 'Hashing Masterclass (HashSet & HashMap)',
  intro: `<p>Friendly overview: what you will learn, why it matters in interviews, how it connects to earlier modules.</p>`,
  goals: ['Explain how a HashMap finds a key in O(1) on average', 'Solve any "subarray sum = K" question in O(N)', 'Pick between HashSet and HashMap from the wording of a question'],
  prereqs: `Module 5 (Prefix Sums) and Module 6 (Sliding Window).`,
  hours: 10,
  databases: { shop: `CREATE TABLE orders(id INTEGER PRIMARY KEY, customer TEXT, amount INTEGER);
INSERT INTO orders VALUES (1,'asha',120),(2,'ben',80),(3,'asha',40);` },
  topics: [
    {
      title: 'Prefix Sum + HashSet: Does a Zero-Sum Subarray Exist?',
      analogy: `<p>Check your bank balance on <b>Monday</b> and again on <b>Friday</b>. If both show ₹500, everything in between cancelled out — net spending was zero.</p>`,
      explain: `<p>Plain-English explanation with visuals ...</p>
        ${H.arr([2, -1, 3, -2], { label: 'arr', hl: { 1: 'g', 2: 'g', 3: 'g' } })}
        ${H.table(['i', 'arr[i]', 'pf[i]', 'seen before?'], [['0', '2', '2', 'no'], ['3', '-2', '2', '<span class="c-g">YES</span>']])}`,
      clues: ['"contiguous subarray" + "sum = 0 / K"', 'negative numbers allowed → sliding window fails', 'N ≤ 10<sup>5</sup> → need O(N)'],
      code: [`
        boolean hasZeroSum(int[] a) {
            Set<Long> seen = new HashSet<>();
            seen.add(0L);
            long pf = 0;
            for (int x : a) { pf += x; if (!seen.add(pf)) return true; }
            return false;
        }`, { lang: 'python', code: `def has_zero_sum(a):\n    seen, pf = {0}, 0\n    for x in a:\n        pf += x\n        if pf in seen:\n            return True\n        seen.add(pf)\n    return False\n\nprint(has_zero_sum([4, 2, -3, 1, 6]))`, run: true, title: 'Same idea in Python (runnable)' }],
      codeTitle: ['Core pattern (Java)'],
      viz: {
        title: 'Prefix Sum + HashSet walk-through',
        input: '2 -1 3 -2 4',
        inputLabel: 'Array (space separated)',
        gen: function (input) {
          var a = String(input).trim().split(/[\s,]+/).map(Number);
          if (!a.length || a.some(isNaN)) throw new Error('Enter integers separated by spaces');
          if (a.length > 16) throw new Error('Use at most 16 numbers');
          var frames = [], seen = [0], pf = 0, pfs = [];
          frames.push({ narr: 'Start: put <b>0</b> in the set ("sum of nothing").', parts: [{ type: 'array', label: 'arr', values: a }, { type: 'set', items: seen.slice(), hl: { '0': 'ok' } }] });
          for (var i = 0; i < a.length; i++) {
            pf += a[i]; pfs.push(pf);
            var dup = seen.indexOf(pf) >= 0, hl = {}, ptr = {}, ch = {};
            hl[String(pf)] = dup ? 'bad' : 'ok'; ptr[i] = 'i'; ch[i] = 'cur';
            if (!dup) seen.push(pf);
            frames.push({ narr: 'pf = <b>' + pf + '</b>. ' + (dup ? '<span class="c-r">Seen before → zero-sum subarray!</span>' : 'New, store it.'), parts: [
              { type: 'array', label: 'arr', values: a, ptr: ptr, hl: ch },
              { type: 'bars', label: 'running prefix sums', values: pfs.slice() },
              { type: 'set', label: 'HashSet of prefix sums', items: seen.slice(), hl: hl },
              { type: 'code', label: 'Code line running', lang: 'java', code: 'pf += x;\nif (!seen.add(pf)) return true;', hl: { 1: 'cur', 2: dup ? 'bad' : '' } }
            ] });
            if (dup) return frames;
          }
          frames.push({ narr: 'No repeat → no zero-sum subarray.', parts: [{ type: 'set', items: seen.slice() }] });
          return frames;
        }
      },
      examples: [
        { title: 'All positives — answer is always false', html: `<p>Prefix sums strictly increase, so none can repeat ...</p>` },
        { title: 'A zero inside the array', html: `<p>arr = [3, 0, 5]: pf goes 3, 3 → repeat immediately; the subarray is just [0].</p>` },
        { title: 'Whole array sums to zero', html: `<p>arr = [1, -1]: pf = 1, 0 → 0 was pre-inserted, so the subarray starts at index 0.</p>`, code: `System.out.println(hasZeroSum(new int[]{1, -1})); // true` }
      ],
      deepDive: `<p>Expert layer: why the 0-seed is a sentinel for the empty prefix; worst-case O(N) per lookup under adversarial hashing and Java 8 treeification (O(log N)); Long boxing cost and primitive-map alternatives; streaming variant with bounded memory ...</p>`,
      aiEra: `<p><b>What AI changes:</b> ... <b>Use AI as a partner:</b> <code>Give me 5 edge-case arrays for zero-sum subarray, don't solve it</code> ... <b>Where AI goes wrong:</b> forgets the 0 seed, uses int and overflows ... <b>What you must still own:</b> recognising the pattern from the wording, proving correctness, explaining trade-offs.</p>`,
      problems: [/* guided problems — same shape as practice problems below, solution.dry required in DSA/language tracks */]
    },
    {
      title: 'Every other visualizer part type',
      analogy: `<p>...</p>`, explain: `<p>...</p>`, clues: ['...', '...', '...'], examples: [], deepDive: `<p>...</p>`, aiEra: `<p>...</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT customer, SUM(amount) AS total FROM orders GROUP BY customer ORDER BY total DESC;`, title: 'Runnable SQL (uses databases.shop)' },
      viz: {
        title: 'Kitchen sink (all part types)',
        gen: function () {
          return [
            { narr: 'Tree (level-order with null) + BFS queue + call stack.', parts: [
              { type: 'tree', label: 'Binary tree', arr: [1, 2, 3, null, 5, 6, 7], hl: { 0: 'done', 1: 'cur', 2: 'ok' }, tags: { 1: 'lvl 1' } },
              { type: 'queue', label: 'BFS Queue', items: [2, 3], hl: { 0: 'cur' } },
              { type: 'stack', label: 'Call stack', items: ['dfs(1)', 'dfs(2)'], hl: { 1: 'cur' } }
            ] },
            { narr: 'Graph with circles (algorithms) and boxes (architecture diagrams).', parts: [
              { type: 'graph', directed: true, height: 50, nodes: [{ id: 'C', label: 'Client', x: 10, y: 25, shape: 'box' }, { id: 'LB', label: 'Load Balancer', x: 40, y: 25, shape: 'box' }, { id: 'S1', label: 'App Server 1', x: 78, y: 10, shape: 'box' }, { id: 'S2', label: 'App Server 2', x: 78, y: 40, shape: 'box' }],
                edges: [['C', 'LB', 'HTTPS'], ['LB', 'S1'], ['LB', 'S2']], hl: { LB: 'cur' }, ehl: { 'C-LB': 'ok' }, tags: { S1: 'healthy' } }
            ] },
            { narr: 'Bits, DP grid, result table (SQL), variables.', parts: [
              { type: 'bits', label: 'n', value: 13, width: 8, hl: { 2: 'cur' } },
              { type: 'grid', label: 'dp', colHead: ['', 'a', 'b'], rowHead: ['', 'a'], rows: [[0, 0, 0], [0, 1, 1]], hl: { '1,1': 'ok' } },
              { type: 'table', label: 'Result set', columns: ['customer', 'total'], rows: [['asha', 160], ['ben', 80]], hl: { 0: 'sel' } },
              { type: 'vars', vals: { i: 2, best: 7 }, hl: { best: 'ok' } }
            ] },
            { narr: 'Linked lists (next[] for reversal), map, free HTML.', parts: [
              { type: 'list', values: [1, 2, 3, 4, 5], ptr: { 1: 'slow', 3: 'fast' } },
              { type: 'list', label: 'mid-reversal', values: [1, 2, 3, 4], next: [-1, 0, 3, -1], ptr: { 1: 'prev', 2: 'curr' } },
              { type: 'map', label: 'HashMap', entries: [['a', 2], ['b', 1]], hl: { a: 'ok' } },
              { type: 'text', html: '<b>Any extra HTML</b> note.' }
            ] }
          ];
        }
      }
    }
  ],
  quiz: [
    { q: 'Why insert 0 into the set before the loop?', options: ['To catch subarrays that start at index 0', 'To avoid null pointers', 'It is optional', 'To sort the set'], answer: 0, explain: 'pf[j] - 0 = pf[j]; if pf[j] == 0 the subarray 0..j sums to zero.' }
  ],
  interview: [
    { q: 'How does HashMap handle collisions in Java 8+?', level: 'I', a: `<p>Each bucket holds a linked list; when a bucket exceeds 8 entries (and table ≥ 64) it becomes a red-black tree ...</p>`, followUps: ['What happens on resize?', 'Why must equal objects have equal hashCodes?'] }
  ],
  practice: [
    {
      title: 'Subarray with Sum 0', level: 'Easy', tags: ['prefix sum', 'hashset'], companies: ['Amazon', 'Microsoft'],
      statement: `<p>Given an integer array A, return true if some non-empty contiguous subarray sums to 0.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>5</sup>, |A[i]| ≤ 10<sup>9</sup>`,
      example: `${H.arr([4, 2, -3, 1, 6], { hl: { 1: 'g', 2: 'g', 3: 'g' } })}<p>Output <b>true</b>: ${H.c('g', '2 + (-3) + 1 = 0')}.</p>`,
      brute: { why: `<p>Every (i, j) pair: ~5·10<sup>9</sup> steps → TLE.</p>`, code: `boolean brute(int[] a){for(int i=0;i<a.length;i++){long s=0;for(int j=i;j<a.length;j++){s+=a[j];if(s==0)return true;}}return false;}` },
      mcq: { q: 'Running total 7 after index 2 and again after index 5 means…', options: ['3..5 sums to 0', '2..5 sums to 0', 'nothing'], answer: 0, explain: 'pf[5] − pf[2] = 0.' },
      hints: [`<p>pf[j] − pf[i−1] = 0 ⇒ pf[j] == pf[i−1].</p>`, `<p>HashSet&lt;Long&gt; of prefix sums seen so far.</p>`, `<p>Seed 0; use long. Recipe: ...</p>`],
      solution: {
        approach: `<p>One pass, running sum, set of seen sums.</p>`,
        code: `class Solution { boolean zero(int[] a){ Set<Long> s=new HashSet<>(); s.add(0L); long pf=0; for(int x:a){ pf+=x; if(!s.add(pf)) return true; } return false; } }`,
        alt: [{ lang: 'python', code: `def zero(a):\n    s, pf = {0}, 0\n    for x in a:\n        pf += x\n        if pf in s: return True\n        s.add(pf)\n    return False` }],
        dry: { head: ['i', 'a[i]', 'pf', 'action'], rows: [['0', '4', '4', 'add'], ['3', '1', '4', '<span class="c-g">found → true</span>']] },
        complexity: `<p>Time O(N), space O(N).</p>`,
        followUps: ['Return the subarray itself', 'Count all such subarrays']
      }
    }
  ]
});
