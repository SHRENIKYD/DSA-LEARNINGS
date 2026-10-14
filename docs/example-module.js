// REFERENCE EXAMPLE ONLY (not part of the build). Shows every schema field and every visualizer part type.
registerModule({
  id: 'm00',
  part: 'C',
  num: 0,
  title: 'Example Module',
  intro: `<p>One-paragraph friendly overview of the module: what you will learn and why it matters in interviews.</p>`,
  topics: [
    {
      title: 'Prefix Sum + HashSet: Does a Zero-Sum Subarray Exist?',
      analogy: `<p>Check your bank balance on <b>Monday</b> and again on <b>Friday</b>. If both show ₹500, then whatever you spent and earned in between cancelled out — your <b>net spending was zero</b>. You didn't need to look at each day's transactions; you only compared two running totals.</p>`,
      explain: `<p>A <b>prefix sum</b> <code>pf[i]</code> is the running total of the array up to index <code>i</code>. The sum of a subarray <code>i..j</code> equals <code>pf[j] - pf[i-1]</code>.</p>
        ${H.arr([2, -1, 3, -2], { label: 'arr', hl: { 1: 'g', 2: 'g', 3: 'g' } })}
        ${H.arr([2, 1, 4, 2], { label: 'pf', hl: { 0: 'y', 3: 'y' } })}
        <p>${H.c('y', 'pf[0] = 2')} and ${H.c('y', 'pf[3] = 2')} are equal, so the part in between (${H.c('g', 'indices 1..3')}) sums to zero: -1 + 3 - 2 = 0.</p>
        ${H.table(['i', 'arr[i]', 'pf[i]', 'seen before?'], [['0', '2', '2', 'no'], ['1', '-1', '1', 'no'], ['2', '3', '4', 'no'], ['3', '-2', '2', '<span class="c-g">YES → zero-sum exists</span>']])}`,
      clues: [
        '"Does any <b>contiguous subarray</b> sum to 0 / K?" → prefix sum + hashing.',
        'Array has <b>negative numbers</b>, so a sliding window cannot be used.',
        '<code>N ≤ 10<sup>5</sup></code> → O(N<sup>2</sup>) = 10<sup>10</sup> is too slow; need O(N) or O(N log N).'
      ],
      code: `
        boolean hasZeroSum(int[] a) {
            Set<Long> seen = new HashSet<>();
            seen.add(0L);              // empty prefix: handles subarrays starting at index 0
            long pf = 0;
            for (int x : a) {
                pf += x;
                if (!seen.add(pf)) return true;  // add() returns false if pf was already there
            }
            return false;
        }`,
      codeTitle: 'Core pattern',
      viz: {
        title: 'Prefix Sum + HashSet walk-through',
        input: '2 -1 3 -2 4',
        inputLabel: 'Array (space separated)',
        gen: function (input) {
          var a = String(input).trim().split(/[\s,]+/).map(Number);
          if (!a.length || a.some(isNaN)) throw new Error('Enter integers separated by spaces');
          var frames = [], seen = [0], pf = 0, pfs = [];
          frames.push({ narr: 'Start: put <b>0</b> in the set. It stands for "sum of nothing", so a subarray that starts at index 0 can be caught.', parts: [
            { type: 'array', label: 'arr', values: a },
            { type: 'set', label: 'HashSet of prefix sums seen', items: seen.slice(), hl: { '0': 'ok' } }
          ] });
          for (var i = 0; i < a.length; i++) {
            pf += a[i]; pfs.push(pf);
            var dup = seen.indexOf(pf) >= 0;
            var hl = {}; hl[String(pf)] = dup ? 'bad' : 'ok';
            if (!dup) seen.push(pf);
            var ptr = {}; ptr[i] = 'i';
            frames.push({
              narr: 'Add arr[' + i + '] = ' + a[i] + ' → running sum pf = <b>' + pf + '</b>. ' + (dup ? '<span class="c-r">pf was already in the set!</span> The numbers between the two moments cancelled out → a zero-sum subarray exists.' : 'Not seen before, so store it in the set.'),
              parts: [
                { type: 'array', label: 'arr', values: a, ptr: ptr, hl: (function () { var h = {}; h[i] = 'cur'; return h; })() },
                { type: 'bars', label: 'running prefix sums', values: pfs.slice(), hl: (function () { var h = {}; h[i] = dup ? 'bad' : 'cur'; return h; })() },
                { type: 'set', label: 'HashSet of prefix sums seen', items: seen.slice(), hl: hl },
                { type: 'vars', vals: { i: i, pf: pf } }
              ]
            });
            if (dup) return frames;
          }
          frames.push({ narr: 'Finished with no repeated prefix sum → <b>no</b> zero-sum subarray.', parts: [{ type: 'array', label: 'arr', values: a }, { type: 'set', items: seen.slice() }] });
          return frames;
        }
      },
      problems: [
        {
          title: 'Subarray with Sum 0',
          level: 'Easy',
          tags: ['prefix sum', 'hashset'],
          statement: `<p>Given an integer array <code>A</code> of size <code>N</code>, return <code>true</code> if some non-empty contiguous subarray sums to 0.</p>`,
          constraints: `1 ≤ N ≤ 10<sup>5</sup>, -10<sup>9</sup> ≤ A[i] ≤ 10<sup>9</sup>`,
          example: `${H.arr([4, 2, -3, 1, 6], { hl: { 1: 'g', 2: 'g', 3: 'g' } })}<p>Output: <b>true</b> because ${H.c('g', '2 + (-3) + 1 = 0')}.</p>`,
          brute: {
            why: `<p>Try every start <code>i</code> and every end <code>j</code>, keep a running sum. That is N·(N+1)/2 ≈ 5·10<sup>9</sup> pairs for N = 10<sup>5</sup> → TLE. The wasted work: we keep re-adding the same prefixes for every new start.</p>`,
            code: `
              boolean brute(int[] a) {
                  for (int i = 0; i < a.length; i++) {
                      long s = 0;
                      for (int j = i; j < a.length; j++) {
                          s += a[j];
                          if (s == 0) return true;
                      }
                  }
                  return false;
              }`
          },
          mcq: {
            q: 'If the running total is 7 after index 2 and again 7 after index 5, what do you know?',
            options: ['Indices 3..5 sum to 0', 'Indices 2..5 sum to 0', 'Nothing useful', 'The array is sorted'],
            answer: 0,
            explain: 'pf[5] - pf[2] = 0 means elements 3, 4, 5 cancel out.'
          },
          hints: [
            `<p><code>sum(i..j) = pf[j] - pf[i-1]</code>. Setting that to 0 gives <code>pf[j] == pf[i-1]</code>: you only need two equal prefix sums.</p>`,
            `<p>Keep a <code>HashSet&lt;Long&gt;</code> of prefix sums seen so far. Lookup is O(1) on average.</p>`,
            `<p>Traps: insert <code>0</code> before starting (subarray from index 0); use <code>long</code> (10<sup>5</sup> × 10<sup>9</sup> overflows int). Recipe: pf = 0, set = {0}; for each x: pf += x; if set has pf → true; else add pf. Return false.</p>`
          ],
          solution: {
            approach: `<p>One pass, running sum, HashSet of sums seen.</p>`,
            code: `
              import java.util.*;

              class Solution {
                  public boolean hasZeroSumSubarray(int[] a) {
                      Set<Long> seen = new HashSet<>();
                      seen.add(0L);                 // prefix of length 0
                      long pf = 0;                  // long: avoids overflow
                      for (int x : a) {
                          pf += x;                  // running sum up to here
                          if (seen.contains(pf)) {  // same total seen before → middle part is 0
                              return true;
                          }
                          seen.add(pf);
                      }
                      return false;
                  }
              }`,
            dry: {
              head: ['i', 'a[i]', 'pf', 'set before', 'action'],
              rows: [
                ['0', '4', '4', '{0}', 'add 4'],
                ['1', '2', '6', '{0,4}', 'add 6'],
                ['2', '-3', '3', '{0,4,6}', 'add 3'],
                ['3', '1', '4', '{0,4,6,3}', '<span class="c-g">4 found → true</span>']
              ]
            },
            complexity: `<p><b>Time O(N)</b>: one loop, each set operation O(1) on average. <b>Space O(N)</b>: up to N prefix sums stored.</p>`
          }
        }
      ]
    },
    {
      title: 'Every other visualizer part type',
      analogy: `<p>Analogy text...</p>`,
      explain: `<p>Explanation...</p>`,
      clues: ['clue one', 'clue two', 'clue three'],
      viz: {
        title: 'Kitchen sink (all part types)',
        gen: function () {
          return [
            { narr: 'Tree in level-order (null = missing child) + BFS queue.', parts: [
              { type: 'tree', label: 'Binary tree', arr: [1, 2, 3, null, 5, 6, 7], hl: { 0: 'done', 1: 'cur', 2: 'ok' }, tags: { 1: 'lvl 1' } },
              { type: 'queue', label: 'BFS Queue', items: [2, 3], hl: { 0: 'cur' } },
              { type: 'stack', label: 'DFS call stack', items: ['dfs(1)', 'dfs(2)'], hl: { 1: 'cur' } }
            ] },
            { narr: 'Graph: x in 0..100, y in 0..height (default 60). Weighted directed edges, highlighted node/edge, tags for distances.', parts: [
              { type: 'graph', directed: true, nodes: [{ id: 'A', x: 10, y: 30 }, { id: 'B', x: 45, y: 10 }, { id: 'C', x: 45, y: 50 }, { id: 'D', x: 85, y: 30 }],
                edges: [['A', 'B', 4], ['A', 'C', 1], ['C', 'B', 2], ['B', 'D', 5]], hl: { A: 'done', C: 'cur' }, ehl: { 'A-C': 'ok' }, tags: { A: 'd=0', C: 'd=1', B: 'd=4' } }
            ] },
            { narr: 'Bits: value 13 in 8 bits, bit 2 highlighted. Grid: DP table with headers.', parts: [
              { type: 'bits', label: 'n', value: 13, width: 8, hl: { 2: 'cur', 0: 'ok' } },
              { type: 'grid', label: 'dp', colHead: ['', 'a', 'b'], rowHead: ['', 'a', 'c'], rows: [[0, 0, 0], [0, 1, 1], [0, 1, 1]], hl: { '1,1': 'ok', '2,2': 'cur' } }
            ] },
            { narr: 'Linked list with slow/fast pointers; next[] lets you draw reversed links (-1 = null).', parts: [
              { type: 'list', values: [1, 2, 3, 4, 5], ptr: { 1: 'slow', 3: 'fast' }, hl: { 1: 'cur' } },
              { type: 'list', label: 'mid-reversal', values: [1, 2, 3, 4], next: [-1, 0, 3, -1], ptr: { 1: 'prev', 2: 'curr' } },
              { type: 'map', label: 'HashMap freq', entries: [['a', 2], ['b', 1]], hl: { a: 'ok' } },
              { type: 'text', html: '<b>Any extra HTML</b> note.' }
            ] }
          ];
        }
      }
    }
  ],
  practice: [
    /* same shape as a guided problem; solution.dry optional here */
  ]
});
