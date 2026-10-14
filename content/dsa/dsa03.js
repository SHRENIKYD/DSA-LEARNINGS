(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // ---------- small shared helpers for the visualizers ----------
  function nums(input, minCount, maxCount, fmt) {
    var parts = String(input === undefined ? '' : input).trim().split(/[\s,|]+/).filter(function (s) { return s.length; });
    var a = parts.map(Number);
    if (a.length < minCount || a.length > maxCount || a.some(function (x) { return !isFinite(x) || Math.floor(x) !== x; })) {
      throw new Error(fmt);
    }
    return a;
  }
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function padFrames(frames, narr, parts) {
    while (frames.length < 4) frames.push({ narr: narr, parts: parts });
    return frames;
  }

  // =====================================================================
  // TOPIC 1 — Factors in O(√N)
  // =====================================================================
  topics.push({
    title: 'Factors (Divisors) in O(√N)',
    analogy: `<p>You have <b>36 chairs</b> and want to arrange them in a perfect rectangle (same number of chairs in every row). You can do 1 row × 36, 2 × 18, 3 × 12, 4 × 9, 6 × 6 … and then 9 × 4, 12 × 3, 18 × 2, 36 × 1 — but those last ones are just the <b>same rectangles turned sideways</b>! Once the number of rows passes 6 (because 6 × 6 = 36), every new rectangle is a mirror of one you already made. So you only need to try row counts from 1 up to 6.</p>`,
    explain: `<p>A <b>factor</b> (or divisor) of N is a number that divides N with <b>no remainder</b>: <code>N % i == 0</code>. Factors always come in <b>pairs</b>: if <code>i</code> divides N, then so does its partner <code>N / i</code>.</p>
      ${H.table(['small partner i', 'big partner N / i', 'i × N/i'], [
        [H.c('g', '1'), H.c('b', '36'), '36'],
        [H.c('g', '2'), H.c('b', '18'), '36'],
        [H.c('g', '3'), H.c('b', '12'), '36'],
        [H.c('g', '4'), H.c('b', '9'), '36'],
        [H.c('p', '6'), H.c('p', '6'), '36 ← same number twice (perfect square!)'],
        [H.c('m', '9'), H.c('m', '4'), H.c('m', 'mirror of 4 × 9 — already found')]
      ])}
      <p><b>Key idea:</b> in every pair, the smaller partner is <b>at most √N</b>. Why? If both partners were bigger than √N, their product would be bigger than √N × √N = N. Impossible! So we loop <code>i</code> from 1 while <code>i * i ≤ N</code> and collect both partners at once.</p>
      ${H.arr([1, 2, 3, 4, 5, 6], { label: 'try i =', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g', 4: 'r', 5: 'p' } })}
      <p>${H.c('g', 'green')} = divides 36, ${H.c('r', 'red')} = 5 does not divide 36, ${H.c('p', 'purple')} = 6 pairs with itself, so count it <b>once</b>.</p>
      <p><b>Speed:</b> for N = 10<sup>12</sup> a loop to N would take 10<sup>12</sup> steps (hours). Looping to √N takes only 10<sup>6</sup> steps (a few milliseconds).</p>
      <p><b>Trap:</b> write the condition as <code>i * i &lt;= n</code> using <code>long</code>, not <code>i &lt;= Math.sqrt(n)</code> (floating-point rounding can be off by one for huge N).</p>`,
    clues: [
      '"Find / count / list all <b>divisors</b> (factors) of N" → loop i up to √N, take pairs (i, N/i).',
      'A <b>single</b> big number, <code>N ≤ 10<sup>12</sup></code> → √N = 10<sup>6</sup> steps is fine; O(N) is not.',
      '"Sum of divisors", "perfect number", "is the number of divisors odd?" → pair trick (odd count ⇔ perfect square).',
      '"Count pairs (a, b) with a × b = N" or "rectangle with area N" → factor pairs.',
      '"Smallest / largest factor other than 1 and N" → first i ≥ 2 that divides N, and its partner N / i.'
    ],
    code: `
      List<Long> allFactors(long n) {
          List<Long> small = new ArrayList<>();   // small partners: 1, 2, 3 ... (found in increasing order)
          List<Long> big = new ArrayList<>();     // big partners: n, n/2 ... (found in decreasing order)
          for (long i = 1; i * i <= n; i++) {     // stop once i passes the square root
              if (n % i == 0) {                   // i divides n, so (i, n / i) is a factor pair
                  small.add(i);
                  if (i != n / i) {               // perfect square: i and n/i are the SAME number
                      big.add(n / i);             // add the partner only if it is different
                  }
              }
          }
          Collections.reverse(big);               // big partners were collected largest-first
          small.addAll(big);                      // stitch both halves → fully sorted list
          return small;
      }`,
    codeTitle: 'List all factors in sorted order (O(√N))',
    examples: [
      {
        title: 'N = 100: why perfect squares have an ODD number of factors',
        html: `<p>Walk i = 1..10 (because 10 × 10 = 100):</p>
          ${H.table(['i', '100 % i', 'pair'], [
            ['1', '0', H.c('g', '(1, 100)')], ['2', '0', H.c('g', '(2, 50)')], ['3', '1', H.c('m', '—')], ['4', '0', H.c('g', '(4, 25)')],
            ['5', '0', H.c('g', '(5, 20)')], ['6, 7, 8, 9', 'not 0', H.c('m', '—')], ['10', '0', H.c('p', '(10, 10) — one number')]
          ])}
          <p>Four real pairs give 8 factors, plus the lonely 10 → <b>9 factors</b>. Every non-square number has an <b>even</b> count (everything pairs up); only perfect squares have a "partner with itself". That is the whole trick behind the famous <i>100 doors / bulb switcher</i> puzzle: door k is toggled once per factor of k, so only perfect-square doors end up open.</p>`
      },
      {
        title: 'Sum of proper divisors → is 28 a perfect number?',
        html: `<p>A <b>perfect number</b> equals the sum of its factors except itself. For 28: pairs (1, 28), (2, 14), (4, 7). Proper divisors: 1 + 2 + 4 + 7 + 14 = ${H.c('g', '28')} ✓. For 12: 1 + 2 + 3 + 4 + 6 = ${H.c('r', '16')} ✗. Same √N loop, but we <b>add</b> both partners instead of counting them, and skip N itself.</p>`,
        code: `
          long sumProperDivisors(long n) {
              if (n == 1) return 0;                 // 1 has no proper divisors
              long sum = 1;                          // 1 divides everything (and its partner n is excluded)
              for (long i = 2; i * i <= n; i++) {
                  if (n % i == 0) {
                      sum += i;                      // small partner
                      if (i != n / i) sum += n / i;  // big partner (only if different)
                  }
              }
              return sum;                            // 28 -> 28, 12 -> 16
          }`
      },
      {
        title: 'Prime factorization in O(√N): 360 = 2³ × 3² × 5',
        html: `<p>Divide out each small factor <b>as many times as possible</b> before moving on. Because we remove 2s completely, 4, 6, 8 … can never divide what is left — so every divisor we find this way is automatically prime.</p>
          ${H.table(['i', 'n before', 'divide while possible', 'n after'], [
            ['2', '360', '360 → 180 → 90 → 45 (three 2s)', '45'], ['3', '45', '45 → 15 → 5 (two 3s)', '5'], ['4', '5', '4 × 4 = 16 &gt; 5 → stop loop', '5'], ['leftover', '5', H.c('p', '5 &gt; 1, so 5 is itself a prime factor'), '1']
          ])}
          <p>Bonus formula: with N = p<sup>a</sup> × q<sup>b</sup> × r<sup>c</sup>, the number of divisors is <b>(a+1)(b+1)(c+1)</b>. For 360: (3+1)(2+1)(1+1) = ${H.c('g', '24')} divisors — each divisor chooses how many 2s (0..3), 3s (0..2) and 5s (0..1) to use.</p>`,
        code: `
          Map<Long, Integer> primeFactors(long n) {
              Map<Long, Integer> f = new TreeMap<>();     // prime -> exponent, sorted
              for (long i = 2; i <= n / i; i++) {         // i <= n / i is i * i <= n without overflow
                  while (n % i == 0) {                    // strip out every copy of i
                      f.merge(i, 1, Integer::sum);
                      n /= i;
                  }
              }
              if (n > 1) f.merge(n, 1, Integer::sum);     // whatever is left is one big prime
              return f;                                   // 360 -> {2=3, 3=2, 5=1}
          }`
      },
      {
        title: 'Count rectangles of area N (factor pairs as answers)',
        html: `<p>"How many different rectangles with whole-number sides have area 24 (a × b and b × a count once)?" Each rectangle is a factor pair with a ≤ b: (1, 24), (2, 12), (3, 8), (4, 6) → <b>4</b>. The loop i = 1..⌊√24⌋ = 4 lists exactly these. The interviewer's real question: <i>can you see that "rectangle", "grid of equal rows", "split into equal teams" are all just factor pairs?</i></p>`
      }
    ],
    deepDive: `<p><b>Why the √N bound is tight.</b> For a prime N, nothing below √N divides it, so any correct trial-division loop must look at every i ≤ √N. You cannot do better with plain division; faster factoring (Pollard's rho, roughly N<sup>1/4</sup> steps, used for 64-bit numbers in competitive programming) needs randomized number theory.</p>
      <p><b>Overflow-safe loop condition.</b> <code>i * i &lt;= n</code> overflows when n is close to <code>Long.MAX_VALUE</code> (i ≈ 3.04 × 10<sup>9</sup> squared wraps negative). The bullet-proof form is <code>i &lt;= n / i</code>. Avoid <code>i &lt;= Math.sqrt(n)</code>: a <code>double</code> has 53 bits of precision, so for n above 2<sup>53</sup> the square root can be rounded the wrong way and you miss or add one candidate.</p>
      <p><b>How many divisors can a number have?</b> Far fewer than people guess: at most <b>1344</b> for N ≤ 10<sup>9</sup> (735134400), <b>6720</b> for N ≤ 10<sup>12</sup> (963761198400) and <b>103680</b> for N ≤ 10<sup>18</sup>. This matters when a solution loops over "all divisors of x" — it is cheap. These record holders are called <i>highly composite numbers</i>.</p>
      <p><b>Divisors of every number up to N at once.</b> Flip the loop: for each d, walk its multiples d, 2d, 3d … and append d. Total work N/1 + N/2 + … + N/N ≈ <b>N ln N</b> (the harmonic series), so all divisor lists up to 10<sup>6</sup> cost about 1.4 × 10<sup>7</sup> steps. This "iterate over multiples" idea reappears in the Sieve and in GCD-counting problems.</p>
      <p><b>Production reality.</b> Factoring huge numbers (hundreds of digits) is believed to be hard for classical computers — RSA encryption relies on it. That is why "factor N" is easy in interviews (N ≤ 10<sup>12</sup>) and practically impossible for 2048-bit keys.</p>`,
    aiEra: `<p><b>What AI changes:</b> any assistant will produce the √N factor loop instantly. The value you add is spotting the traps it often leaves in: <code>i &lt;= Math.sqrt(n)</code> with doubles, <code>int i</code> when N is up to 10<sup>12</sup> (infinite loop / overflow), and double-counting the square root partner.</p>
      <p><b>Use AI as a partner:</b> ask <code>"Write a brute-force O(N) divisor counter and a random stress test comparing it to my O(√N) version for N ≤ 10^5, including all perfect squares"</code>. Stress testing against a slow-but-obviously-correct version is the single best habit for math code, and AI writes the harness in seconds.</p>
      <p><b>Where AI goes wrong:</b> it may claim "a number has at most 2√N divisors" as if that were tight, or suggest Pollard's rho for N ≤ 10<sup>12</sup> where a 10<sup>6</sup>-step loop is simpler and safer. <b>What you must still own:</b> the pairing argument (why √N), the constraint reading (√10<sup>12</sup> = 10<sup>6</sup> is fine), and explaining it out loud in an interview without notes.</p>`,
    viz: {
      title: 'Factor pairs up to √N',
      input: '36',
      inputLabel: 'N (1 to 5000)',
      gen: function (input) {
        var N = nums(input, 1, 1, 'Enter one whole number N between 1 and 5000')[0];
        if (N < 1 || N > 5000) throw new Error('Enter one whole number N between 1 and 5000');
        var s = Math.floor(Math.sqrt(N));
        while (s * s > N) s--;
        while ((s + 1) * (s + 1) <= N) s++;
        var cand = [];
        for (var k = 1; k <= s; k++) cand.push(k);
        var frames = [], small = [], big = [], status = {};
        frames.push({
          narr: 'We want every factor of <b>' + N + '</b>. Instead of testing 1..' + N + ', we only test i = 1..' + s + ' because ' + s + ' × ' + s + ' = ' + (s * s) + ' ≤ ' + N + ' but ' + (s + 1) + ' × ' + (s + 1) + ' = ' + ((s + 1) * (s + 1)) + ' &gt; ' + N + '. Every factor pair has its smaller partner in this short range.',
          parts: [
            { type: 'array', label: 'candidates i (1..⌊√N⌋)', values: cand.slice() },
            { type: 'vars', label: 'setup', vals: { N: N, '⌊√N⌋': s, 'loops saved': N - s } }
          ]
        });
        for (var i = 1; i <= s; i++) {
          var divides = N % i === 0;
          var narr;
          if (divides) {
            if (i === N / i) {
              small.push(i);
              narr = N + ' % ' + i + ' = 0 and ' + N + ' / ' + i + ' = ' + i + ' — the partner is <b>the same number</b> (perfect square), so we count it only <b>once</b>.';
            } else {
              small.push(i); big.unshift(N / i);
              narr = N + ' % ' + i + ' = 0 → <span class="c-g">' + i + ' is a factor</span>, and so is its partner ' + N + ' / ' + i + ' = <b>' + (N / i) + '</b>. Two factors found with one test!';
            }
            status[i - 1] = 'ok';
          } else {
            narr = N + ' % ' + i + ' = ' + (N % i) + ' (not zero) → <span class="c-r">' + i + ' is not a factor</span>. Move on.';
            status[i - 1] = 'done';
          }
          var hl = {}; for (var key in status) hl[key] = status[key];
          hl[i - 1] = divides ? 'cur' : 'bad';
          frames.push({
            narr: narr,
            parts: [
              { type: 'array', label: 'candidates i', values: cand.slice(), hl: hl, ptr: one(i - 1, 'i') },
              { type: 'array', label: 'small partners (i)', values: small.slice() },
              { type: 'array', label: 'big partners (N / i)', values: big.slice() },
              { type: 'vars', vals: { i: i, 'i × i': i * i, 'N % i': N % i } }
            ]
          });
        }
        frames.push({
          narr: 'Next i would be ' + (s + 1) + ', but ' + (s + 1) + ' × ' + (s + 1) + ' = ' + ((s + 1) * (s + 1)) + ' &gt; ' + N + '. Any factor bigger than ' + s + ' is already sitting in the "big partners" list, so we <b>stop</b>.',
          parts: [
            { type: 'array', label: 'small partners (i)', values: small.slice() },
            { type: 'array', label: 'big partners (N / i)', values: big.slice() }
          ]
        });
        var all = small.concat(big);
        var allHl = {}; for (var t = 0; t < all.length; t++) allHl[t] = 'sel';
        frames.push({
          narr: 'Glue the small list and the big list together → all <b>' + all.length + '</b> factors of ' + N + ' in sorted order, using only ' + s + ' tests instead of ' + N + '.',
          parts: [
            { type: 'array', label: 'all factors of ' + N, values: all, hl: allHl },
            { type: 'vars', vals: { 'factor count': all.length, 'tests done': s } }
          ]
        });
        return frames;
      }
    },
    problems: [
      {
        title: 'Count the Factors of N',
        level: 'Easy',
        tags: ['math', 'divisors', 'sqrt trick'],
        statement: `<p>Given a positive integer <code>N</code>, return how many positive integers divide <code>N</code> exactly (leave remainder 0).</p>`,
        constraints: `1 ≤ N ≤ 10<sup>12</sup>`,
        example: `<p>Input: <code>N = 36</code> → Output: <b>9</b></p>
          ${H.table(['pair', 'factors added', 'running count'], [
            ['1 × 36', H.c('g', '1, 36'), '2'],
            ['2 × 18', H.c('g', '2, 18'), '4'],
            ['3 × 12', H.c('g', '3, 12'), '6'],
            ['4 × 9', H.c('g', '4, 9'), '8'],
            ['6 × 6', H.c('p', '6 (only once!)'), '9']
          ])}
          <p>Why 9? The factors are 1, 2, 3, 4, 6, 9, 12, 18, 36. Six pairs would give 10, but ${H.c('p', '6 × 6')} uses the same number twice, so it counts once.</p>`,
        brute: {
          why: `<p>Test every i from 1 to N and count those with <code>N % i == 0</code>. For N = 10<sup>12</sup> that is 10<sup>12</sup> divisions — roughly 15+ minutes. The wasted work: every test above √N just rediscovers a partner we could have gotten for free from a small i.</p>`,
          code: `
            long countFactorsBrute(long n) {
                long count = 0;
                for (long i = 1; i <= n; i++) {   // try every possible divisor
                    if (n % i == 0) count++;
                }
                return count;
            }`
        },
        mcq: {
          q: `You are counting factors of N = 49. The loop reaches i = 7 and 49 % 7 == 0. How much should you add to the count?`,
          options: [`Add 2 (7 and 49/7)`, `Add 1, because 49 / 7 = 7 is the same number`, `Add 0, 7 is not a factor`, `Add 7`],
          answer: 1,
          explain: `49 / 7 = 7, so the "pair" is (7, 7) — one number, not two. Counting it twice would wrongly give 4 factors instead of 3 (1, 7, 49).`
        },
        hints: [
          `<p><b>Aha:</b> factors come in pairs <code>(i, N / i)</code>, and the smaller one of each pair is always ≤ √N. So you only need to look at i with <code>i * i ≤ N</code>.</p>`,
          `<p>No data structure needed — just a <code>long</code> counter. For each i that divides N, add 2 (for i and N / i) … unless they are equal.</p>`,
          `<p>Traps: use <code>long</code> for <code>i</code> and the condition <code>i * i &lt;= n</code> (N up to 10<sup>12</sup> doesn't fit in int). Perfect squares (36, 49, 1) need the "add 1" case. N = 1 → answer 1.<br>Recipe: count = 0; for i = 1 while i·i ≤ N: if N % i == 0 → count += (i == N/i ? 1 : 2). Return count.</p>`
        ],
        solution: {
          approach: `<p>Walk i from 1 to √N; every divisor i brings its partner N / i along.</p>`,
          code: `
            class Solution {
                // Returns how many positive integers divide n exactly.
                public long countFactors(long n) {
                    long count = 0;
                    for (long i = 1; i * i <= n; i++) {   // only walk up to the square root
                        if (n % i == 0) {                 // i divides n → its partner n / i does too
                            if (i == n / i) {
                                count += 1;               // perfect square: i and n/i are the same number
                            } else {
                                count += 2;               // two different factors: i and n / i
                            }
                        }
                    }
                    return count;
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().countFactors(36));  // 9
                    System.out.println(new Solution().countFactors(1));   // 1
                }
            }`,
          dry: {
            head: ['i', 'i × i ≤ 36?', '36 % i', 'partner 36 / i', 'count'],
            rows: [
              ['1', 'yes', '0', '36', '2'],
              ['2', 'yes', '0', '18', '4'],
              ['3', 'yes', '0', '12', '6'],
              ['4', 'yes', '0', '9', '8'],
              ['5', 'yes', '1', '—', '8'],
              ['6', 'yes', '0', H.c('p', '6 (same)'), '9'],
              ['7', H.c('r', '49 &gt; 36 → stop'), '—', '—', H.c('g', '9')]
            ]
          },
          complexity: `<p><b>Time O(√N)</b>: the loop runs about √N times (10<sup>6</sup> for N = 10<sup>12</sup>), each step is one division. <b>Space O(1)</b>: only a counter and the loop variable.</p>`
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 2 — Prime numbers (primality check)
  // =====================================================================
  topics.push({
    title: 'Prime Numbers & the Primality Check',
    analogy: `<p>A teacher has <b>7 kids</b> and wants to split them into equal teams. Teams of 2? One kid is left over. Teams of 3? Left over again. The only ways are "one team of 7" or "7 teams of 1". A number like 7 that <b>refuses to be split into equal groups</b> is a <b>prime</b>. With 12 kids you could make teams of 2, 3, 4 or 6 — 12 is not prime (it is <b>composite</b>).</p>`,
    explain: `<p><b>Prime</b> = a whole number greater than 1 whose only factors are 1 and itself (exactly <b>two</b> factors). Facts to remember:</p>
      <ul><li><b>1 is NOT prime</b> (it has only one factor).</li><li><b>2 is the only even prime</b>; every other even number is divisible by 2.</li><li>First primes: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29 …</li></ul>
      <p><b>How to check if N is prime:</b> try to divide N by i = 2, 3, 4 … but only while <code>i * i ≤ N</code>. If something divides it, N is composite. If nothing does, N is prime. Why stop at √N? If N = a × b with a ≤ b, then a ≤ √N — so if N had any split, we would already have found the small half.</p>
      ${H.table(['N', 'try i (only while i × i ≤ N)', 'result'], [
        ['91', '2 ✗, 3 ✗, 5 ✗, ' + H.c('r', '7 ✓ (91 = 7 × 13)'), H.c('r', 'composite')],
        ['97', '2 ✗, 3 ✗, 5 ✗, 7 ✗, 9 ✗ (10 × 10 = 100 &gt; 97 → stop)', H.c('g', 'prime')],
        ['1', 'nothing to try', H.c('r', 'not prime (special rule)')]
      ])}
      <p><b>Small speed-up:</b> check 2 once, then try only <b>odd</b> i (3, 5, 7, …). That halves the work. Total work is still O(√N): for N = 10<sup>12</sup>, about 500,000 divisions.</p>
      <p><b>When NOT to use this:</b> if you must test <b>many</b> numbers (say all numbers up to 10<sup>6</sup>), use the <b>Sieve</b> (next topic) instead.</p>`,
    clues: [
      '"Is N prime?" / "exactly two divisors" → trial division up to √N.',
      'One (or a few) numbers with <code>N ≤ 10<sup>12</sup></code> → √N ≈ 10<sup>6</sup> steps per number is fine.',
      '<b>Many</b> queries or "all primes up to N" with N ≤ 10<sup>7</sup> → switch to the Sieve of Eratosthenes.',
      '"Can these items be arranged in a rectangle with more than one row?" → is N composite?',
      'Edge words: "1 is neither prime nor composite", "N can be 0 or 1" → handle before the loop.'
    ],
    code: `
      boolean isPrime(long n) {
          if (n < 2) return false;            // 0 and 1 are not prime
          if (n < 4) return true;             // 2 and 3 are prime
          if (n % 2 == 0) return false;       // even numbers > 2 are composite
          for (long i = 3; i * i <= n; i += 2) {  // only odd divisors up to the square root
              if (n % i == 0) return false;   // found a split → composite
          }
          return true;                        // nothing divided n → prime
      }`,
    codeTitle: 'Trial division (odd numbers only)',
    examples: [
      {
        title: 'Is 1,000,000,007 prime? (the famous modulus)',
        html: `<p>√(10<sup>9</sup> + 7) ≈ 31623, so trial division tries 2 and then the odd numbers 3, 5, …, 31623 — about <b>15,811 divisions</b>. None divides it, so it is prime. That takes well under a millisecond, which is why "is N prime?" for a single N ≤ 10<sup>12</sup> (≈ 5 × 10<sup>5</sup> odd divisions) is always fine.</p>`
      },
      {
        title: 'The 6k ± 1 speed-up',
        html: `<p>Every prime above 3 has the form <b>6k − 1</b> or <b>6k + 1</b> (the others, 6k, 6k+2, 6k+3, 6k+4, are divisible by 2 or 3). So after checking 2 and 3 we only try i = 5, 7, 11, 13, 17, 19 … — <b>2 out of every 6</b> numbers instead of 3 out of 6 with "odd only". Same O(√N), about a third fewer divisions.</p>
          ${H.arr([5, 7, 11, 13, 17, 19, 23, 25], { label: 'candidates i, i+2', hl: { 7: 'y' } })}
          <p>${H.c('y', '25')} is tried even though it is not prime — harmless, just a wasted division.</p>`,
        code: `
          boolean isPrime6k(long n) {
              if (n < 2) return false;
              if (n < 4) return true;                       // 2, 3
              if (n % 2 == 0 || n % 3 == 0) return false;
              for (long i = 5; i <= n / i; i += 6) {        // i = 6k - 1, and i + 2 = 6k + 1
                  if (n % i == 0 || n % (i + 2) == 0) return false;
              }
              return true;
          }`
      },
      {
        title: 'Next prime ≥ N, and Goldbach for an even number',
        html: `<p>"Find the smallest prime ≥ 90": test 90 ✗, 91 ✗ (7 × 13), 92 ✗, 93 ✗ (3 × 31), 94 ✗, 95 ✗, 96 ✗, ${H.c('g', '97 ✓')}. Primes near N are on average about ln N apart (≈ 28 near 10<sup>12</sup>), so "walk up and test" is fast.</p>
          <p>"Write 28 as a sum of two primes": try p = 2, 3, 5 … and test 28 − p: 28 − 2 = 26 ✗, 28 − 3 = 25 ✗, ${H.c('g', '28 − 5 = 23 ✓')} → 5 + 23. (Goldbach's conjecture says every even number &gt; 2 works; it has been checked far beyond any interview limit.)</p>`,
        code: `
          long nextPrime(long n) {
              long x = Math.max(n, 2);
              while (!isPrime(x)) x++;      // gaps between primes are small on average (about ln n)
              return x;
          }

          boolean isPrime(long n) {
              if (n < 2) return false;
              for (long i = 2; i <= n / i; i++) if (n % i == 0) return false;
              return true;
          }`
      },
      {
        title: 'Counting the work: why "many queries" breaks trial division',
        html: `<p>Q = 10<sup>5</sup> queries, each x ≤ 10<sup>6</sup>: worst case 10<sup>5</sup> × 500 = 5 × 10<sup>7</sup> divisions — OK. But Q = 10<sup>6</sup> queries with x ≤ 10<sup>12</sup>: 10<sup>6</sup> × 5 × 10<sup>5</sup> = 5 × 10<sup>11</sup> → ${H.c('r', 'TLE')}. For many small values → Sieve (next topic). For many huge values → Miller–Rabin (deep dive).</p>`
      }
    ],
    deepDive: `<p><b>How many primes are there?</b> The <i>prime number theorem</i> says about N / ln N numbers up to N are prime: π(10<sup>6</sup>) = 78,498, π(10<sup>7</sup>) = 664,579, π(10<sup>9</sup>) = 50,847,534. So a random number near N is prime with probability ≈ 1 / ln N — the reason "next prime" searches end quickly.</p>
      <p><b>Miller–Rabin (when N is up to 10<sup>18</sup> and there are many queries).</b> Instead of searching for a divisor, it checks a property every prime must satisfy (based on Fermat's little theorem, a<sup>p−1</sup> ≡ 1 mod p, plus a square-root check). Each "witness" base costs one fast modular exponentiation, O(log N). Testing the bases 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37 is known to be <b>deterministic for all 64-bit numbers</b>. Java gives you <code>BigInteger.valueOf(n).isProbablePrime(30)</code>; the multiplication must not overflow, so 64-bit implementations use 128-bit products (<code>Math.multiplyHigh</code> or <code>__int128</code> in C++).</p>
      <p><b>Plain Fermat is not enough:</b> Carmichael numbers such as 561 = 3 × 11 × 17 satisfy a<sup>560</sup> ≡ 1 (mod 561) for every a coprime to 561, fooling a naive Fermat test. Miller–Rabin's extra square-root check catches them.</p>
      <p><b>Theory corner:</b> AKS (2002) proved primality is solvable in deterministic polynomial time, but it is far slower in practice than Miller–Rabin. Real systems (OpenSSL key generation) use probabilistic tests with many rounds; the chance of error is smaller than a hardware fault.</p>
      <p><b>Edge cases checklist:</b> 0, 1 (not prime), 2 (only even prime), negative inputs, perfect squares of primes (9, 25, 49, 121 — catch the <code>&lt;</code> vs <code>&lt;=</code> bug), and overflow of <code>i * i</code> near <code>Long.MAX_VALUE</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> nobody hand-writes Miller–Rabin at work any more — you call a library or ask an assistant. But in interviews you are expected to produce trial division from scratch and explain the √N argument in one sentence.</p>
      <p><b>Use AI as a partner:</b> <code>"Generate test cases for isPrime: 0, 1, 2, 3, 4, squares of primes, Carmichael numbers, 10^9+7, 10^12-11 and a random batch checked against a sieve"</code>. Then <i>you</i> read the failures.</p>
      <p><b>Where AI goes wrong:</b> it sometimes lists the wrong deterministic Miller–Rabin base set, writes <code>a * a % n</code> in 64-bit where the product overflows for n &gt; 3 × 10<sup>9</sup>, or loops with <code>i &lt; Math.sqrt(n)</code> and calls 49 prime. Always cross-check generated primality code against a sieve for every n ≤ 10<sup>6</sup> — it takes one line.</p>
      <p><b>What you must still own:</b> knowing <i>which</i> tool fits the constraints (one number → √N, many small → sieve, many huge → Miller–Rabin) and saying why.</p>`,
    viz: {
      title: 'Trial division: is N prime?',
      input: '97',
      inputLabel: 'N (0 to 10000)',
      gen: function (input) {
        var N = nums(input, 1, 1, 'Enter one whole number N between 0 and 10000')[0];
        if (N < 0 || N > 10000) throw new Error('Enter one whole number N between 0 and 10000');
        var frames = [];
        var cand = [];
        if (N >= 4) { cand.push(2); for (var c = 3; c * c <= N; c += 2) cand.push(c); }
        frames.push({
          narr: 'Is <b>' + N + '</b> prime? We try to split it into equal groups. We only need divisors i with i × i ≤ ' + N + ' — the small half of any split lives there.',
          parts: [
            { type: 'array', label: 'divisors to try (2, then odd numbers)', values: cand.length ? cand.slice() : ['none'] },
            { type: 'vars', vals: { N: N } }
          ]
        });
        if (N < 2) {
          frames.push({ narr: N + ' is less than 2. By definition a prime must be greater than 1, so <span class="c-r">' + N + ' is NOT prime</span>.', parts: [{ type: 'vars', vals: { N: N, prime: 'no' }, hl: { prime: 'bad' } }] });
          return padFrames(frames, 'Rule recap: 0 and 1 are never prime. The smallest prime is 2.', [{ type: 'vars', vals: { N: N, prime: 'no' } }]);
        }
        if (N < 4) {
          frames.push({ narr: N + ' is 2 or 3. There is no i ≥ 2 with i × i ≤ ' + N + ', so nothing can split it → <span class="c-g">prime</span>.', parts: [{ type: 'vars', vals: { N: N, prime: 'yes' }, hl: { prime: 'ok' } }] });
          return padFrames(frames, 'Rule recap: 2 is the only even prime; 3 is the smallest odd prime.', [{ type: 'vars', vals: { N: N, prime: 'yes' } }]);
        }
        var found = -1, hl = {};
        for (var k = 0; k < cand.length; k++) {
          var i = cand[k], r = N % i;
          var h2 = {}; for (var key in hl) h2[key] = hl[key];
          h2[k] = r === 0 ? 'bad' : 'cur';
          frames.push({
            narr: 'Try i = ' + i + ': ' + N + ' % ' + i + ' = ' + r + '. ' + (r === 0
              ? '<span class="c-r">Remainder 0!</span> ' + N + ' = ' + i + ' × ' + (N / i) + ', so it splits into equal groups → composite. We can stop right away.'
              : 'Not zero, so groups of ' + i + ' leave ' + r + ' left over. ' + (i === 2 ? 'Since ' + N + ' is odd, no even number can divide it — from now on we try only odd i.' : 'Keep going.')),
            parts: [
              { type: 'array', label: 'divisors to try', values: cand.slice(), hl: h2, ptr: one(k, 'i') },
              { type: 'vars', vals: { i: i, 'i × i': i * i, 'N % i': r }, hl: r === 0 ? { 'N % i': 'bad' } : {} }
            ]
          });
          hl[k] = 'done';
          if (r === 0) { found = i; break; }
        }
        if (found > 0) {
          frames.push({ narr: '<span class="c-r">' + N + ' is NOT prime</span>: ' + found + ' × ' + (N / found) + ' = ' + N + '.', parts: [{ type: 'vars', vals: { N: N, 'smallest factor': found, partner: N / found, prime: 'no' }, hl: { prime: 'bad' } }] });
        } else {
          var last = cand[cand.length - 1];
          var nx = last === 2 ? 3 : last + 2;
          frames.push({ narr: 'Next candidate would be ' + nx + ', but ' + nx + ' × ' + nx + ' = ' + (nx * nx) + ' &gt; ' + N + '. Nobody divided ' + N + ' → <span class="c-g">' + N + ' is PRIME</span>.', parts: [{ type: 'vars', vals: { N: N, 'tests done': cand.length, prime: 'yes' }, hl: { prime: 'ok' } }] });
        }
        return padFrames(frames, 'Done. Only ' + cand.length + ' divisions were needed instead of ' + (N - 2) + '.', [{ type: 'vars', vals: { N: N } }]);
      }
    },
    problems: [
      {
        title: 'Is It Prime?',
        level: 'Easy',
        tags: ['math', 'primes', 'sqrt trick'],
        statement: `<p>Given an integer <code>N</code>, return <code>true</code> if N is a prime number, otherwise <code>false</code>.</p>`,
        constraints: `0 ≤ N ≤ 10<sup>12</sup>`,
        example: `<p><code>N = 97</code> → ${H.c('g', 'true')} (tried 2, 3, 5, 7, 9 — none divide; 10 × 10 = 100 &gt; 97).<br><code>N = 91</code> → ${H.c('r', 'false')} because ${H.c('r', '91 = 7 × 13')}.<br><code>N = 1</code> → ${H.c('r', 'false')} (1 is not prime by definition).</p>`,
        brute: {
          why: `<p>Try every i from 2 to N − 1. For a prime near 10<sup>12</sup> that is 10<sup>12</sup> divisions — far too slow. All the tries above √N are wasted: if a big divisor existed, its small partner would have been found earlier.</p>`,
          code: `
            boolean isPrimeBrute(long n) {
                if (n < 2) return false;
                for (long i = 2; i < n; i++) {    // every possible divisor
                    if (n % i == 0) return false;
                }
                return true;
            }`
        },
        mcq: {
          q: `To check whether N = 121 is prime, what is the largest i you must try?`,
          options: [`10`, `11`, `60`, `120`],
          answer: 1,
          explain: `Loop while i × i ≤ 121. 11 × 11 = 121 ≤ 121, so 11 must be tried — and indeed 121 = 11 × 11 is composite. Stopping at 10 would wrongly call 121 prime.`
        },
        hints: [
          `<p><b>Aha:</b> if N = a × b with a ≤ b, then a × a ≤ a × b = N, so <b>a ≤ √N</b>. Any split must show up among i ≤ √N.</p>`,
          `<p>No data structure needed. Loop <code>i</code> while <code>i * i &lt;= n</code>; return false on the first divisor. Check 2 separately, then step by 2 to test only odd i.</p>`,
          `<p>Traps: N = 0 and N = 1 are not prime; N = 2 is prime (the loop never runs); use <code>long</code> for i so <code>i * i</code> does not overflow; use <code>&lt;=</code> not <code>&lt;</code> (perfect squares like 25, 121).<br>Recipe: if n &lt; 2 → false; if n &lt; 4 → true; if even → false; for i = 3, 5, 7 … while i·i ≤ n: if n % i == 0 → false. Return true.</p>`
        ],
        solution: {
          approach: `<p>Trial division up to √N, skipping even numbers after 2.</p>`,
          code: `
            class Solution {
                public boolean isPrime(long n) {
                    if (n < 2) return false;              // 0 and 1 are not prime
                    if (n < 4) return true;               // 2 and 3 are prime
                    if (n % 2 == 0) return false;         // even and bigger than 2 → composite
                    for (long i = 3; i * i <= n; i += 2) { // odd divisors up to the square root
                        if (n % i == 0) return false;     // split found → composite
                    }
                    return true;                          // no split exists → prime
                }

                public static void main(String[] args) {
                    Solution s = new Solution();
                    System.out.println(s.isPrime(97));    // true
                    System.out.println(s.isPrime(91));    // false (7 x 13)
                }
            }`,
          dry: {
            head: ['step', 'check', 'value', 'decision'],
            rows: [
              ['1', 'n &lt; 2 ?', '91 &lt; 2 → no', 'continue'],
              ['2', 'n &lt; 4 ?', 'no', 'continue'],
              ['3', 'n % 2', '1', 'odd → continue'],
              ['4', 'i = 3: 9 ≤ 91, 91 % 3', '1', 'continue'],
              ['5', 'i = 5: 25 ≤ 91, 91 % 5', '1', 'continue'],
              ['6', 'i = 7: 49 ≤ 91, 91 % 7', H.c('r', '0'), H.c('r', 'return false (91 = 7 × 13)')]
            ]
          },
          complexity: `<p><b>Time O(√N)</b>: at most √N / 2 odd divisions (≈ 5 × 10<sup>5</sup> for N = 10<sup>12</sup>). <b>Space O(1)</b>.</p>`
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 3 — Sieve of Eratosthenes
  // =====================================================================
  topics.push({
    title: 'Sieve of Eratosthenes (all primes up to N)',
    analogy: `<p>A class of kids numbered <b>2 to 30</b> all stand up. Kid <b>2</b> is still standing, so 2 is prime — and every kid whose number is a multiple of 2 (4, 6, 8 …) <b>sits down</b>. Next standing kid is <b>3</b>: prime, and the multiples of 3 sit down. Kid 4 is already sitting (it was knocked out by 2), so skip. Kid 5 is standing: prime, multiples sit … Whoever is <b>still standing at the end is prime</b>. Nobody ever had to do a division — we just "crossed out" multiples, like striking numbers off a lottery sheet.</p>`,
    explain: `<p>Instead of testing each number on its own (√N work each), we <b>cross out multiples</b> of every prime. A number that never gets crossed out has no smaller prime factor → it is prime.</p>
      <p><b>Two smart shortcuts:</b></p>
      <ul>
        <li><b>Start crossing at p × p</b>, not 2p. Example p = 5: 10, 15, 20 were already crossed by 2 and 3 (10 = 2·5, 15 = 3·5, 20 = 2·10). The first multiple not yet handled by a smaller prime is ${H.c('y', '25 = 5 × 5')}.</li>
        <li><b>Stop the outer loop when p × p &gt; N.</b> If p × p is already past N, p has nothing new to cross.</li>
      </ul>
      ${H.table(['prime p', 'cross out (starting at p × p)', 'new numbers knocked out (N = 30)'], [
        [H.c('g', '2'), '4, 6, 8, 10, …, 30', '14 numbers'],
        [H.c('g', '3'), '9, 12, 15, 18, 21, 24, 27, 30', H.c('r', '9, 15, 21, 27') + ' (others already out)'],
        [H.c('m', '4'), 'already crossed → skip', '—'],
        [H.c('g', '5'), '25, 30', H.c('r', '25')],
        [H.c('m', '6'), '6 × 6 = 36 &gt; 30 → stop', '—']
      ])}
      <p>Survivors: ${H.arr([2, 3, 5, 7, 11, 13, 17, 19, 23, 29], { label: 'primes ≤ 30', idx: false, hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g', 4: 'g', 5: 'g', 6: 'g', 7: 'g', 8: 'g', 9: 'g' } })}</p>
      <p><b>Speed:</b> the work is N/2 + N/3 + N/5 + N/7 + … ≈ <b>N · log log N</b>. log log of 10<sup>7</sup> is about 3, so it is almost linear — 10<sup>7</sup> numbers sieve in well under a second. <b>Memory:</b> one boolean per number (10<sup>7</sup> booleans ≈ 10 MB).</p>
      <p><b>Bonus — Smallest Prime Factor (SPF) sieve:</b> instead of a true/false mark, store for each number the <i>first prime that crossed it</i>. Then you can factorize any x ≤ N in O(log x) by repeatedly dividing by <code>spf[x]</code> (360 → 2 → 180 → 2 → 90 → 2 → 45 → 3 → 15 → 3 → 5 → 5 → 1).</p>`,
    clues: [
      '"Count primes less than / up to N" with <code>N ≤ 10<sup>6</sup></code> or <code>10<sup>7</sup></code> → sieve once.',
      '<b>Many queries</b> ("for each of Q numbers, is it prime?") with values ≤ 10<sup>7</sup> → precompute a sieve, answer in O(1).',
      '"Prime factorize many numbers quickly" → smallest-prime-factor (SPF) sieve.',
      '"All primes in a range [L, R]" with R up to 10<sup>12</sup> but R − L ≤ 10<sup>6</sup> → segmented sieve (see Practice).',
      'Time hint: O(N √N) is too slow for N = 10<sup>6</sup>; O(N log log N) fits easily.'
    ],
    code: [`
      boolean[] sieve(int n) {
          boolean[] isPrime = new boolean[n + 1];
          Arrays.fill(isPrime, true);               // everybody stands up
          isPrime[0] = false;
          if (n >= 1) isPrime[1] = false;           // 0 and 1 are not prime
          for (int p = 2; (long) p * p <= n; p++) { // only p up to the square root cross anything new
              if (!isPrime[p]) continue;            // p was knocked out → not prime, skip
              for (int m = p * p; m <= n; m += p) { // smaller multiples were already crossed
                  isPrime[m] = false;               // multiple of p → sit down
              }
          }
          return isPrime;
      }`, `
      int[] smallestPrimeFactor(int n) {
          int[] spf = new int[n + 1];               // spf[x] = smallest prime dividing x (0 = not set yet)
          for (int i = 2; i <= n; i++) {
              if (spf[i] == 0) {                    // nobody marked i → i is prime
                  for (int j = i; j <= n; j += i) {
                      if (spf[j] == 0) spf[j] = i;  // the first prime to reach j is its smallest factor
                  }
              }
          }
          return spf;
      }

      List<Integer> factorize(int x, int[] spf) {
          List<Integer> factors = new ArrayList<>();
          while (x > 1) {
              factors.add(spf[x]);                  // peel off the smallest prime
              x /= spf[x];
          }
          return factors;
      }`],
    codeTitle: ['Classic sieve', 'Smallest-prime-factor sieve + fast factorization'],
    examples: [
      {
        title: 'Prefix count of primes → answer "how many primes in [L, R]?" in O(1)',
        html: `<p>Sieve once up to 10<sup>6</sup>, then build <code>cnt[x]</code> = number of primes ≤ x. Each query is <code>cnt[R] − cnt[L − 1]</code>. For [10, 30]: cnt[30] = 10, cnt[9] = 4 (2, 3, 5, 7) → ${H.c('g', '6')} primes (11, 13, 17, 19, 23, 29). This is the Prefix-Sum idea from DSA 5 sitting on top of a sieve.</p>`,
        code: `
          int[] primePrefix(int n) {
              boolean[] composite = new boolean[n + 1];        // false = still "maybe prime"
              int[] cnt = new int[n + 1];
              for (int p = 2; (long) p * p <= n; p++)
                  if (!composite[p])
                      for (int m = p * p; m <= n; m += p) composite[m] = true;
              for (int x = 2; x <= n; x++)
                  cnt[x] = cnt[x - 1] + (composite[x] ? 0 : 1); // running count of primes
              return cnt;                                      // query [L, R]: cnt[R] - cnt[L - 1]
          }`
      },
      {
        title: 'SPF sieve: factorize 360 in 6 steps',
        html: `${H.table(['x', 'spf[x]', 'x / spf[x]'], [['360', '2', '180'], ['180', '2', '90'], ['90', '2', '45'], ['45', '3', '15'], ['15', '3', '5'], ['5', '5', H.c('g', '1 → done')]])}
          <p>Each step at least halves x, so factorizing any x ≤ N takes at most log₂ x ≈ 20 steps for x ≤ 10<sup>6</sup>. Perfect for "factorize 10<sup>5</sup> numbers" questions where √x per number would be slower.</p>`
      },
      {
        title: 'Segmented sieve idea: primes in [10¹², 10¹² + 100]',
        html: `<p>You cannot make a boolean array of size 10<sup>12</sup>. But any composite x ≤ 10<sup>12</sup> + 100 has a prime factor ≤ √x ≈ 10<sup>6</sup>. So: (1) sieve the small primes up to 10<sup>6</sup>; (2) make a window array of length R − L + 1 = 101; (3) for each small prime p, cross out its multiples inside [L, R], starting at <code>max(p·p, ⌈L/p⌉·p)</code>. Survivors in the window are prime. Memory O(√R + (R − L)). Full code in Practice ("Primes in a Huge Range").</p>`
      },
      {
        title: 'Divisor-count sieve (all d(x) for x ≤ N in N ln N)',
        html: `<p>Same "walk the multiples" loop, but for <b>every</b> d (not just primes): for d = 1..N, for m = d, 2d, … add 1 to <code>divs[m]</code>. Work = N/1 + N/2 + … ≈ N ln N ≈ 1.4 × 10<sup>7</sup> for N = 10<sup>6</sup>. Result: divs[12] = 6 (1, 2, 3, 4, 6, 12).</p>`,
        code: `
          int[] divisorCounts(int n) {
              int[] divs = new int[n + 1];
              for (int d = 1; d <= n; d++)
                  for (int m = d; m <= n; m += d)
                      divs[m]++;          // d divides m
              return divs;
          }`
      }
    ],
    deepDive: `<p><b>Why N log log N?</b> Prime p does about N/p crossings, so total ≈ N × (1/2 + 1/3 + 1/5 + 1/7 + …). The sum of reciprocals of primes up to N grows like ln ln N (Mertens' theorem), which is about 3 for N = 10<sup>9</sup>. In practice the sieve is limited by <b>memory traffic</b>, not arithmetic.</p>
      <p><b>Memory tricks.</b> A Java <code>boolean[]</code> uses 1 byte per entry → 10<sup>8</sup> entries = 100 MB (too much for most judges). <code>java.util.BitSet</code> uses 1 bit → 12.5 MB. Sieving <b>only odd numbers</b> halves it again. The <b>segmented sieve</b> processes blocks that fit the CPU cache (e.g. 32 KB), which is how fast libraries like <i>primesieve</i> enumerate primes up to 10<sup>10</sup> in seconds.</p>
      <p><b>Linear (Euler) sieve, O(N).</b> Keep a list of primes; for each i, cross out <code>i × p</code> for primes p ≤ spf[i]. Every composite is crossed exactly once — by its smallest prime factor — and you get spf[] for free. Asymptotically better, but in practice similar speed to the classic sieve; its real value is that it also computes multiplicative functions (φ, μ, divisor counts) in one pass.</p>
      <p><b>Classic bugs:</b> forgetting <code>isPrime[0] = isPrime[1] = false</code>; <code>p * p</code> overflowing int when n is near 2<sup>31</sup> (use <code>(long) p * p</code>); off-by-one between "less than N" (LeetCode 204) and "at most N"; allocating <code>new boolean[n]</code> then touching index n.</p>
      <p><b>Rule of thumb from constraints:</b> values ≤ 10<sup>7</sup> → sieve fits easily; values ≤ 10<sup>12</sup> but a window ≤ 10<sup>6</sup> → segmented sieve; single values ≤ 10<sup>18</sup> → Miller–Rabin.</p>`,
    aiEra: `<p><b>What AI changes:</b> a sieve is a five-line snippet any assistant writes correctly most of the time, and for production prime lists you would use a library or precomputed table. Interviewers therefore probe the <i>reasoning</i>: why start at p², why stop at √N, why N log log N, and when the sieve is the wrong tool.</p>
      <p><b>Use AI as a partner:</b> ask it to <code>"benchmark boolean[] vs BitSet vs odd-only sieve for N = 10^8 in Java and explain the memory numbers"</code> — then verify the numbers yourself with a quick run. Or ask for a segmented-sieve version and compare its output with the plain sieve for small ranges.</p>
      <p><b>Where AI goes wrong:</b> it mixes up "primes less than n" with "at most n", starts the inner loop at <code>2 * p</code> and calls it O(N log log N) anyway (still correct, just slower), or writes a segmented sieve that marks L itself as composite when L is a small prime (start must be <code>max(p*p, ...)</code>) or forgets that 1 is not prime when L = 1.</p>
      <p><b>What you must still own:</b> picking sieve vs trial division vs segmented sieve from the constraints, and a clean memory estimate.</p>`,
    viz: {
      title: 'Sieve grid: crossing out multiples',
      input: '50',
      inputLabel: 'N (2 to 120)',
      gen: function (input) {
        var N = nums(input, 1, 1, 'Enter one whole number N between 2 and 120')[0];
        if (N < 2 || N > 120) throw new Error('Enter one whole number N between 2 and 120');
        var COLS = 10, ROWS = Math.ceil(N / COLS);
        var state = {}; // number -> 'x' crossed, 'p' prime
        state[1] = 'x';
        function key(k) { return Math.floor((k - 1) / COLS) + ',' + ((k - 1) % COLS); }
        function grid() {
          var rows = [];
          for (var r = 0; r < ROWS; r++) {
            var row = [];
            for (var c = 0; c < COLS; c++) { var k = r * COLS + c + 1; row.push(k <= N ? k : ''); }
            rows.push(row);
          }
          return rows;
        }
        function baseHl() {
          var h = {};
          for (var k = 1; k <= N; k++) {
            if (state[k] === 'x') h[key(k)] = 'done';
            else if (state[k] === 'p') h[key(k)] = 'ok';
          }
          return h;
        }
        var primes = [];
        var frames = [{
          narr: 'All numbers 2..' + N + ' start "standing" (maybe prime). 1 is greyed out: it is not prime by definition. We will knock out multiples of each prime.',
          parts: [{ type: 'grid', label: 'numbers 1..' + N, rows: grid(), hl: baseHl() }, { type: 'vars', vals: { N: N, '√N ≈': Math.floor(Math.sqrt(N)) } }]
        }];
        for (var p = 2; p * p <= N; p++) {
          if (state[p] === 'x') {
            var hs = baseHl(); hs[key(p)] = 'cur';
            frames.push({ narr: p + ' is already crossed out (it is a multiple of a smaller prime), so it is <b>not prime</b> and its multiples are already handled. Skip it.', parts: [{ type: 'grid', label: 'numbers 1..' + N, rows: grid(), hl: hs }, { type: 'vars', vals: { p: p, 'p × p': p * p } }] });
            continue;
          }
          state[p] = 'p'; primes.push(p);
          var h1 = baseHl(); h1[key(p)] = 'sel'; h1[key(p * p)] = 'cur';
          frames.push({ narr: p + ' is still standing → <span class="c-g">' + p + ' is prime</span>. Its multiples below ' + (p * p) + ' were already knocked out by smaller primes, so we start crossing at <b>' + p + ' × ' + p + ' = ' + (p * p) + '</b>.', parts: [{ type: 'grid', label: 'numbers 1..' + N, rows: grid(), hl: h1 }, { type: 'vars', vals: { p: p, 'p × p': p * p }, hl: { p: 'sel' } }, { type: 'array', label: 'primes found', values: primes.slice() }] });
          var fresh = [], again = 0;
          var h2 = baseHl(); h2[key(p)] = 'sel';
          for (var m = p * p; m <= N; m += p) {
            if (state[m] === 'x') { again++; } else { fresh.push(m); h2[key(m)] = 'bad'; state[m] = 'x'; }
          }
          frames.push({ narr: 'Cross out ' + (p * p) + ', ' + (p * p + p) + ', ' + (p * p + 2 * p) + ' … (step ' + p + '). <span class="c-r">Newly knocked out: ' + (fresh.length ? fresh.join(', ') : 'none') + '</span>' + (again ? ' (' + again + ' were already crossed by a smaller prime).' : '.'), parts: [{ type: 'grid', label: 'numbers 1..' + N, rows: grid(), hl: h2 }, { type: 'vars', vals: { p: p, 'new crosses': fresh.length, 'already crossed': again } }, { type: 'array', label: 'primes found', values: primes.slice() }] });
        }
        var stopP = p;
        frames.push({ narr: 'Next p = ' + stopP + ' and ' + stopP + ' × ' + stopP + ' = ' + (stopP * stopP) + ' &gt; ' + N + ' → stop crossing. Every number still standing has no prime factor ≤ √' + N + ', so it is prime.', parts: [{ type: 'grid', label: 'numbers 1..' + N, rows: grid(), hl: baseHl() }, { type: 'vars', vals: { p: stopP, 'p × p': stopP * stopP } }] });
        for (var k = 2; k <= N; k++) if (state[k] !== 'x' && state[k] !== 'p') { state[k] = 'p'; primes.push(k); }
        var hf = baseHl();
        frames.push({ narr: 'All survivors are primes: <b>' + primes.length + '</b> primes ≤ ' + N + '. Green = prime, grey = crossed out.', parts: [{ type: 'grid', label: 'numbers 1..' + N, rows: grid(), hl: hf }, { type: 'array', label: 'primes ≤ ' + N, values: primes.slice(), idx: true }, { type: 'vars', vals: { 'prime count': primes.length }, hl: { 'prime count': 'sel' } }] });
        return padFrames(frames, 'Done: ' + primes.length + ' primes.', [{ type: 'vars', vals: { 'prime count': primes.length } }]);
      }
    },
    problems: [
      {
        title: 'Count Primes up to N',
        level: 'Medium',
        tags: ['sieve', 'primes'],
        statement: `<p>Given an integer <code>N</code>, return how many prime numbers are <b>less than or equal to</b> N.</p>`,
        constraints: `0 ≤ N ≤ 10<sup>7</sup>`,
        example: `<p><code>N = 30</code> → <b>10</b></p>${H.arr([2, 3, 5, 7, 11, 13, 17, 19, 23, 29], { label: 'primes ≤ 30', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g', 4: 'g', 5: 'g', 6: 'g', 7: 'g', 8: 'g', 9: 'g' } })}<p>Ten numbers survive the crossing-out, so the answer is 10. (<code>N = 1</code> → 0, <code>N = 2</code> → 1.)</p>`,
        brute: {
          why: `<p>Call <code>isPrime(i)</code> for every i ≤ N. Each test costs up to √i, so the total is about N√N ≈ 10<sup>7</sup> × 3·10<sup>3</sup> = 3·10<sup>10</sup> → TLE. Wasted work: we keep dividing by the same small numbers over and over, for every i separately.</p>`,
          code: `
            int countPrimesBrute(int n) {
                int count = 0;
                for (int x = 2; x <= n; x++) {
                    boolean prime = true;
                    for (int i = 2; (long) i * i <= x; i++) {   // trial division for each x
                        if (x % i == 0) { prime = false; break; }
                    }
                    if (prime) count++;
                }
                return count;
            }`
        },
        mcq: {
          q: `While sieving, p = 5 is found prime. Which number should the inner loop cross out <b>first</b>?`,
          options: [`5 (the prime itself)`, `10 (= 2 × 5)`, `15 (= 3 × 5)`, `25 (= 5 × 5)`],
          answer: 3,
          explain: `5 itself is prime (don't cross it). 10, 15, 20 have a smaller prime factor (2 or 3) and were already crossed. The first multiple that only 5 can knock out is 5 × 5 = 25.`
        },
        hints: [
          `<p><b>Aha:</b> a number is composite exactly when it is a multiple of some smaller prime. So instead of testing each number, let every prime <b>cross out its multiples</b>.</p>`,
          `<p>Use a <code>boolean[] isPrime</code> of size N + 1, filled with true. Outer pointer p goes 2, 3, 4 … while p·p ≤ N; if p is still true, inner pointer m walks p·p, p·p + p, … setting false.</p>`,
          `<p>Traps: N &lt; 2 → return 0 (avoid writing isPrime[1] when the array has size 1); mark 0 and 1 as not prime; compare <code>(long) p * p &lt;= n</code>; count only from index 2.<br>Recipe: fill true → set [0],[1] false → for p while p·p ≤ N: if isPrime[p], for m = p·p step p: isPrime[m] = false → count trues.</p>`
        ],
        solution: {
          approach: `<p>Sieve of Eratosthenes, then count the survivors.</p>`,
          code: `
            class Solution {
                public int countPrimes(int n) {
                    if (n < 2) return 0;                        // no primes below 2
                    boolean[] isPrime = new boolean[n + 1];
                    Arrays.fill(isPrime, true);                 // everybody starts as "maybe prime"
                    isPrime[0] = false;
                    isPrime[1] = false;                         // 0 and 1 are not prime
                    for (int p = 2; (long) p * p <= n; p++) {   // only primes up to the square root cross anything
                        if (!isPrime[p]) continue;              // p is composite → its multiples are already out
                        for (int m = p * p; m <= n; m += p) {   // start at p*p: smaller multiples already crossed
                            isPrime[m] = false;
                        }
                    }
                    int count = 0;
                    for (int i = 2; i <= n; i++) {
                        if (isPrime[i]) count++;                // survivors are primes
                    }
                    return count;
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().countPrimes(30));  // 10
                }
            }`,
          dry: {
            head: ['p', 'isPrime[p]?', 'inner loop visits', 'newly crossed'],
            rows: [
              ['2', H.c('g', 'true'), '4, 6, 8, …, 30', '14 numbers (all even 4..30)'],
              ['3', H.c('g', 'true'), '9, 12, 15, 18, 21, 24, 27, 30', H.c('r', '9, 15, 21, 27')],
              ['4', H.c('m', 'false'), 'skip', '—'],
              ['5', H.c('g', 'true'), '25, 30', H.c('r', '25')],
              ['6', '36 &gt; 30 → loop ends', '—', '—'],
              ['count', '—', 'survivors 2,3,5,7,11,13,17,19,23,29', H.c('p', '10')]
            ]
          },
          complexity: `<p><b>Time O(N log log N)</b>: prime p does about N/p crossings, and N/2 + N/3 + N/5 + … grows like N · log log N — practically linear. <b>Space O(N)</b>: one boolean per number.</p>`
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 4 — GCD & LCM (Euclid)
  // =====================================================================
  topics.push({
    title: 'GCD & LCM — Euclid\'s Algorithm (with a visual proof)',
    analogy: `<p><b>GCD:</b> You have two ribbons, <b>48 cm</b> and <b>18 cm</b>. You want to cut <b>both</b> into pieces of the same length, as long as possible, with nothing wasted. The answer (6 cm) is the <b>Greatest Common Divisor</b>. Same as tiling a 48 × 18 floor with the biggest square tiles that fit perfectly.</p>
      <p><b>LCM:</b> Bus A comes every <b>4</b> minutes, bus B every <b>6</b> minutes. Both are at the stop now. When will they <b>next arrive together</b>? At minute <b>12</b> — the <b>Least Common Multiple</b>.</p>`,
    explain: `<p><b>Step 1 — repeated subtraction.</b> Any length that measures both a and b also measures <b>a − b</b> (if 6 fits into 48 and into 18, it fits into 30 too). So <code>gcd(a, b) = gcd(a − b, b)</code>. Keep subtracting the smaller from the bigger:</p>
      ${H.table(['a', 'b', 'action'], [
        ['48', '18', '48 − 18 = 30'],
        ['30', '18', '30 − 18 = 12'],
        ['12', '18', 'now b is bigger: 18 − 12 = 6'],
        ['12', '6', '12 − 6 = 6'],
        ['6', '6', '6 − 6 = 0'],
        [H.c('p', '6'), '0', H.c('p', 'one side hit 0 → GCD = 6')]
      ])}
      <p><b>Step 2 — use % to subtract many times at once.</b> Subtracting 18 from 48 twice is just <code>48 % 18 = 12</code>. So <code>gcd(a, b) = gcd(b, a % b)</code>, and <code>gcd(a, 0) = a</code>.</p>
      ${H.table(['a', 'b', 'a % b', 'meaning'], [
        ['48', '18', H.c('y', '12'), '48 = 2 × 18 + 12'],
        ['18', '12', H.c('y', '6'), '18 = 1 × 12 + 6'],
        ['12', '6', H.c('y', '0'), '12 = 2 × 6 + 0'],
        [H.c('p', '6'), '0', '—', H.c('p', 'GCD = 6')]
      ])}
      <p><b>Visual proof (rectangle tiling):</b> draw a 48 × 18 rectangle. Cut off the biggest squares you can: two 18 × 18 squares, leaving 12 × 18. Cut one 12 × 12 square, leaving 12 × 6. Cut two 6 × 6 squares — nothing left! The last square (6 × 6) tiles every earlier square perfectly, so it tiles the whole rectangle: 6 is the GCD. Each "cut squares" round is exactly one <code>%</code> step. Try it in the second animation below.</p>
      <p><b>LCM:</b> <code>lcm(a, b) = a / gcd(a, b) × b</code>. For 4 and 6: 4 / 2 × 6 = 12. Why? a × b counts the shared part twice; dividing by the GCD removes the double count. <b>Divide first, then multiply</b> — <code>a * b</code> may overflow even when the LCM itself fits.</p>
      <p><b>Speed:</b> every two steps the bigger number at least halves, so Euclid takes <b>O(log min(a, b))</b> steps — about 90 steps even for numbers near 10<sup>18</sup>. For many numbers: <code>gcd(a, b, c) = gcd(gcd(a, b), c)</code>, same for LCM.</p>`,
    clues: [
      '"Largest size / length / group that divides both exactly", "equal pieces, nothing left over" → GCD.',
      '"When will they meet / coincide / happen together again", "smallest number divisible by all" → LCM.',
      '"Simplify the fraction a / b" → divide both by gcd(a, b).',
      '"GCD of the whole array" or "make all elements equal by repeated subtraction" → fold gcd over the array.',
      '"Can you measure exactly X litres with jugs of a and b?" → possible only if X % gcd(a, b) == 0.',
      'Numbers up to 10<sup>18</sup> → Euclid is still only ~90 steps; LCM may overflow → divide before multiplying.'
    ],
    code: [`
      long gcd(long a, long b) {
          while (b != 0) {          // when b becomes 0, a holds the answer
              long r = a % b;       // remainder = what is left after cutting b-sized squares from a
              a = b;                // the old small side becomes the big side
              b = r;                // the leftover becomes the small side
          }
          return a;
      }

      long gcdRecursive(long a, long b) {
          return b == 0 ? a : gcdRecursive(b, a % b);   // same rule, written in one line
      }

      long lcm(long a, long b) {
          return a / gcd(a, b) * b;  // divide FIRST to keep the intermediate value small
      }`],
    codeTitle: ['Euclid GCD (iterative + recursive) and LCM'],
    examples: [
      {
        title: 'Simplify the fraction 84 / 126',
        html: `<p>gcd(84, 126): 126 % 84 = 42 → gcd(84, 42): 84 % 42 = 0 → <b>42</b>. Divide both: 84 / 42 = 2, 126 / 42 = 3 → ${H.c('g', '2 / 3')}. Any time a question says "reduced fraction", "lowest terms" or "normalize the slope (dy, dx)" (e.g. Max Points on a Line), divide by the gcd.</p>`,
        code: `
          String simplify(long num, long den) {
              long g = gcd(Math.abs(num), Math.abs(den));   // gcd works on non-negative values
              num /= g; den /= g;
              if (den < 0) { num = -num; den = -den; }       // keep the sign on top: -2/3, not 2/-3
              return num + "/" + den;                        // simplify(84, 126) -> "2/3"
          }

          long gcd(long a, long b) { return b == 0 ? a : gcd(b, a % b); }`
      },
      {
        title: 'Bus timetable: lcm(4, 6, 10)',
        html: `<p>Buses every 4, 6 and 10 minutes all leave now. lcm(4, 6) = 4 / 2 × 6 = 12; lcm(12, 10) = 12 / gcd(12, 10) × 10 = 12 / 2 × 10 = ${H.c('g', '60')}. They meet again in <b>60 minutes</b>. Check: 60 is divisible by 4, 6 and 10, and no smaller positive number is.</p>
          ${H.arr([4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60], { label: 'bus A', idx: false, hl: { 14: 'g', 2: 'y', 5: 'y', 8: 'y', 11: 'y' } })}
          <p>${H.c('y', 'amber')} = A and B (every 12) together; ${H.c('g', 'green')} = all three.</p>`
      },
      {
        title: 'Water jugs: can you measure exactly 4 litres with 3 L and 5 L jugs?',
        html: `<p>Every amount you can measure is a combination 3x + 5y, and every such combination is a multiple of gcd(3, 5) = 1 (Bézout's identity: gcd(a, b) is the smallest positive value of ax + by). 4 is a multiple of 1 and 4 ≤ 3 + 5 → ${H.c('g', 'yes')}: fill 5, pour into 3 (2 left), empty 3, pour the 2 in, fill 5, top up the 3 (needs 1) → 4 left. With 6 L and 9 L jugs (gcd 3) you can never get 4 → ${H.c('r', 'no')}.</p>`
      },
      {
        title: 'Worst case for Euclid: consecutive Fibonacci numbers',
        html: `${H.table(['a', 'b', 'a % b'], [['89', '55', '34'], ['55', '34', '21'], ['34', '21', '13'], ['21', '13', '8'], ['13', '8', '5'], ['8', '5', '3'], ['5', '3', '2'], ['3', '2', '1'], ['2', '1', '0'], [H.c('p', '1'), '0', '—']])}
          <p>Each quotient is 1, so the numbers shrink as slowly as possible (by the golden ratio ≈ 1.618 per step). Even so: 9 steps for 89, and under 100 steps for any pair of 64-bit numbers (<b>Lamé's theorem</b>: steps ≤ 5 × number of decimal digits of the smaller number).</p>`
      }
    ],
    deepDive: `<p><b>Why it is correct (proof in one line).</b> If d divides a and b, it divides a − qb = a % b; if d divides b and a % b, it divides a = qb + (a % b). So the pairs (a, b) and (b, a % b) have exactly the <b>same set of common divisors</b>, hence the same greatest one. And gcd(a, 0) = a because every number divides 0.</p>
      <p><b>Why it is fast.</b> After two steps the larger number at least halves: if b ≤ a/2, then a % b &lt; b ≤ a/2; if b &gt; a/2, then a % b = a − b &lt; a/2. So steps ≤ 2 log₂(min) — O(log min(a, b)).</p>
      <p><b>Identities worth memorising:</b> gcd(a, b) × lcm(a, b) = a × b (for positive a, b); gcd(a, b) = gcd(a − b, b); gcd(ka, kb) = k·gcd(a, b); gcd is associative so you can fold it over an array, a segment tree or a sliding window. Prime-factor view: gcd takes the <i>minimum</i> exponent of each prime, lcm takes the <i>maximum</i> (12 = 2²·3, 18 = 2·3² → gcd = 2·3 = 6, lcm = 2²·3² = 36).</p>
      <p><b>Language reality (2026):</b> Java's <code>Math</code> has <b>no</b> gcd — write it or use <code>BigInteger.gcd</code>. Python has <code>math.gcd</code> and <code>math.lcm</code> (3.9+, both accept many arguments). C++17 has <code>std::gcd</code> / <code>std::lcm</code> in &lt;numeric&gt;. Negative inputs: Java's <code>%</code> keeps the sign of a, so take <code>Math.abs</code> first (beware <code>Math.abs(Long.MIN_VALUE)</code> is still negative).</p>
      <p><b>Binary GCD (Stein's algorithm)</b> replaces division by shifts and subtraction using gcd(2a, 2b) = 2·gcd(a, b) and gcd(2a, b) = gcd(a, b) for odd b. It is used in big-integer libraries where division is expensive. The <b>extended</b> Euclid algorithm (also returns x, y with ax + by = gcd) gives modular inverses for non-prime moduli — covered in DSA 25.</p>`,
    aiEra: `<p><b>What AI changes:</b> gcd/lcm are one-liners in most languages, so AI will just call the library. The interview value is in <i>recognising</i> that a story problem ("equal tiles", "buses meet", "jugs", "reduce the slope") is secretly a gcd/lcm problem.</p>
      <p><b>Use AI as a partner:</b> paste a word problem and ask <code>"Which number-theory quantity does this reduce to? Don't give code, give the reduction and a counterexample to the naive idea"</code>. Then implement yourself.</p>
      <p><b>Where AI goes wrong:</b> it writes <code>a * b / gcd(a, b)</code> (overflow before dividing), forgets that lcm of many numbers can blow past 64 bits (needs a cap or <code>BigInteger</code>), or returns a negative gcd for negative inputs in Java. It also sometimes "proves" Euclid's speed with a wrong argument (claiming the numbers halve every step — it's every <i>two</i> steps).</p>
      <p><b>What you must still own:</b> the invariant gcd(a, b) = gcd(b, a % b), the O(log) argument, and the divide-before-multiply habit.</p>`,
    viz: [
      {
        title: 'Euclid GCD steps (a, b, a % b)',
        input: '48 18',
        inputLabel: 'a b (positive, ≤ 10^9)',
        gen: function (input) {
          var v = nums(input, 2, 2, 'Enter two positive whole numbers like "48 18"');
          var a = v[0], b = v[1];
          if (a < 1 || b < 1 || a > 1e9 || b > 1e9) throw new Error('Enter two positive whole numbers up to 10^9, like "48 18"');
          var a0 = a, b0 = b, frames = [], hist = ['gcd(' + a + ', ' + b + ')'], step = 0;
          frames.push({ narr: 'We want gcd(' + a + ', ' + b + '). Rule: gcd(a, b) = gcd(b, a % b). Each step replaces the pair with a smaller pair that has the <b>same</b> GCD.', parts: [
            { type: 'bars', label: 'sizes', values: [a, b], texts: ['a', 'b'] },
            { type: 'vars', vals: { a: a, b: b } },
            { type: 'stack', label: 'calls so far', items: hist.slice(), hl: one(0, 'cur') }
          ] });
          while (b !== 0) {
            step++;
            var q = Math.floor(a / b), r = a % b;
            frames.push({ narr: 'Step ' + step + ': ' + a + ' = ' + q + ' × ' + b + ' + <b>' + r + '</b>. ' + (a < b ? 'a is smaller than b, so a % b = a — this step just <b>swaps</b> them.' : 'Taking away ' + b + ' as many times as possible (' + q + ' times) leaves remainder ' + r + '. Anything that divides a and b also divides this leftover.'), parts: [
              { type: 'bars', label: 'sizes', values: [a, b, r], texts: ['a', 'b', 'a % b'], hl: { 2: 'cur' } },
              { type: 'vars', vals: { a: a, b: b, 'a / b': q, 'a % b': r }, hl: { 'a % b': 'cur' } },
              { type: 'stack', label: 'calls so far', items: hist.slice(), hl: one(hist.length - 1, 'cur') }
            ] });
            a = b; b = r;
            hist.push('gcd(' + a + ', ' + b + ')');
            frames.push({ narr: 'Slide over: new pair is (' + a + ', ' + b + '). ' + (b === 0 ? 'b is <b>0</b> → we are done.' : 'b is not 0 yet, keep going.'), parts: [
              { type: 'bars', label: 'sizes', values: [a, b], texts: ['a', 'b'], hl: b === 0 ? { 0: 'sel' } : { 0: 'cur', 1: 'cur' } },
              { type: 'vars', vals: { a: a, b: b }, hl: b === 0 ? { a: 'sel' } : {} },
              { type: 'stack', label: 'calls so far', items: hist.slice(), hl: one(hist.length - 1, b === 0 ? 'ok' : 'cur') }
            ] });
          }
          var g = a, l = (a0 / g) * b0;
          frames.push({ narr: 'gcd(' + a0 + ', ' + b0 + ') = <b>' + g + '</b> in only ' + step + ' step(s). And lcm = ' + a0 + ' / ' + g + ' × ' + b0 + ' = <b>' + l + '</b> (divide first to avoid overflow).', parts: [
            { type: 'vars', vals: { gcd: g, lcm: l, steps: step }, hl: { gcd: 'sel', lcm: 'sel' } },
            { type: 'stack', label: 'all calls', items: hist.slice(), hl: one(hist.length - 1, 'ok') }
          ] });
          return frames;
        }
      },
      {
        title: 'Visual proof: cut squares out of an a × b rectangle',
        input: '16 6',
        inputLabel: 'width height (1 to 20, 1 to 12)',
        gen: function (input) {
          var v = nums(input, 2, 2, 'Enter "width height", e.g. "16 6" (width ≤ 20, height ≤ 12)');
          var W = v[0], Hh = v[1];
          if (W < 1 || Hh < 1 || W > 20 || Hh > 12) throw new Error('Enter "width height" with width 1..20 and height 1..12, e.g. "16 6"');
          var owner = [], r, c;
          for (r = 0; r < Hh; r++) { owner.push([]); for (c = 0; c < W; c++) owner[r].push(-1); }
          var squares = []; // {x,y,s}
          function render(curIdx, region) {
            var rows = [], hl = {};
            for (var rr = 0; rr < Hh; rr++) {
              var row = [];
              for (var cc = 0; cc < W; cc++) {
                var o = owner[rr][cc];
                row.push(o < 0 ? '·' : squares[o].s);
                if (o === curIdx && o >= 0) hl[rr + ',' + cc] = 'cur';
                else if (o >= 0) hl[rr + ',' + cc] = 'done';
                else if (region && cc >= region.x && cc < region.x + region.w && rr >= region.y && rr < region.y + region.h) hl[rr + ',' + cc] = 'win';
              }
              rows.push(row);
            }
            return { type: 'grid', label: W + ' × ' + Hh + ' rectangle (number = side of the square that covers the cell)', rows: rows, hl: hl };
          }
          var reg = { x: 0, y: 0, w: W, h: Hh };
          var frames = [{ narr: 'A ' + W + ' × ' + Hh + ' rectangle (blue). We repeatedly cut off the <b>biggest square</b> that fits — its side is the shorter side. This is exactly Euclid\'s subtraction.', parts: [render(-1, reg), { type: 'vars', vals: { width: reg.w, height: reg.h } }] }];
          while (reg.w > 0 && reg.h > 0) {
            var s = Math.min(reg.w, reg.h), idx = squares.length;
            squares.push({ x: reg.x, y: reg.y, s: s });
            for (r = reg.y; r < reg.y + s; r++) for (c = reg.x; c < reg.x + s; c++) owner[r][c] = idx;
            var before = reg.w + ' × ' + reg.h;
            if (reg.w >= reg.h) { reg.x += s; reg.w -= s; } else { reg.y += s; reg.h -= s; }
            var left = reg.w > 0 && reg.h > 0;
            frames.push({ narr: 'Leftover was ' + before + '. Cut a <span class="c-y">' + s + ' × ' + s + '</span> square (side = shorter side ' + s + '). ' + (left ? 'Remaining rectangle: ' + reg.w + ' × ' + reg.h + ' (blue). In Euclid terms: ' + before.replace(' × ', ', ') + ' → ' + reg.w + ', ' + reg.h + '.' : '<b>Nothing left!</b> The rectangle is completely covered by squares.'), parts: [render(idx, left ? reg : null), { type: 'vars', vals: { 'square side': s, 'squares cut': squares.length, 'left w': reg.w, 'left h': reg.h }, hl: { 'square side': 'cur' } }] });
          }
          var g = squares[squares.length - 1].s;
          frames.push({ narr: 'The <b>last</b> square has side <b>' + g + '</b>. It fits exactly into the square before it, which fits into the ones before that … so a ' + g + ' × ' + g + ' tile covers the whole rectangle. That is why gcd(' + W + ', ' + Hh + ') = ' + g + '.', parts: [render(squares.length - 1, null), { type: 'vars', vals: { gcd: g }, hl: { gcd: 'sel' } }] });
          var rows = [], hl = {};
          for (r = 0; r < Hh; r++) { var row = []; for (c = 0; c < W; c++) { row.push(g); hl[r + ',' + c] = ((Math.floor(r / g) + Math.floor(c / g)) % 2 === 0) ? 'ok' : 'sel'; } rows.push(row); }
          frames.push({ narr: 'Proof by picture: the whole ' + W + ' × ' + Hh + ' floor is tiled by ' + ((W / g) * (Hh / g)) + ' tiles of size ' + g + ' × ' + g + ' (checkerboard colours). No bigger square tile works, because ' + g + ' is the biggest number dividing both ' + W + ' and ' + Hh + '.', parts: [{ type: 'grid', label: 'tiled with ' + g + ' × ' + g + ' squares', rows: rows, hl: hl }, { type: 'vars', vals: { gcd: g, tiles: (W / g) * (Hh / g) }, hl: { gcd: 'sel' } }] });
          return frames;
        }
      }
    ],
    problems: [
      {
        title: 'GCD and LCM of an Array',
        level: 'Easy',
        tags: ['gcd', 'lcm', 'euclid'],
        statement: `<p>Given an array <code>A</code> of positive integers, return two numbers: the <b>GCD</b> of all elements and the <b>LCM</b> of all elements.</p>`,
        constraints: `1 ≤ N ≤ 10<sup>5</sup>, 1 ≤ A[i] ≤ 10<sup>9</sup>; the LCM is guaranteed to fit in a 64-bit <code>long</code>.`,
        example: `${H.arr([12, 18, 30], { label: 'A' })}
          ${H.table(['so far', 'next', 'gcd', 'lcm'], [
            ['12', '18', 'gcd(12, 18) = ' + H.c('y', '6'), '12 / 6 × 18 = ' + H.c('y', '36')],
            ['(6, 36)', '30', 'gcd(6, 30) = ' + H.c('p', '6'), '36 / gcd(36, 30) × 30 = 36 / 6 × 30 = ' + H.c('p', '180')]
          ])}
          <p>Output: <b>GCD = 6, LCM = 180</b>. 6 is the biggest number dividing 12, 18 and 30; 180 is the smallest number all three divide.</p>`,
        brute: {
          why: `<p>GCD brute: try d = min(A) down to 1 and check every element → O(min(A) · N) = 10<sup>9</sup> × 10<sup>5</sup>. LCM brute: try max(A), 2·max(A), 3·max(A) … until all divide it — the LCM can be astronomically far away. Wasted work: we search blindly instead of using the remainder trick.</p>`,
          code: `
            long gcdBrute(long[] a) {
                long mn = Long.MAX_VALUE;
                for (long x : a) mn = Math.min(mn, x);
                for (long d = mn; d >= 1; d--) {          // try every candidate from the top
                    boolean ok = true;
                    for (long x : a) if (x % d != 0) { ok = false; break; }
                    if (ok) return d;
                }
                return 1;
            }`
        },
        mcq: {
          q: `Running LCM so far is 10<sup>9</sup> and the next element is 10<sup>9</sup> − 1 (gcd 1). Which line is safe in Java <code>long</code>?`,
          options: [`<code>l * x / gcd(l, x)</code> — always safe`, `<code>l / gcd(l, x) * x</code> — divide first, product stays as small as possible`, `<code>(int) (l * x)</code>`, `Both orders are always identical`],
          answer: 1,
          explain: `Mathematically both equal the LCM, but <code>l * x</code> is computed first in option A and can overflow before the division happens. Dividing first keeps every intermediate value ≤ the final LCM, which we are told fits.`
        },
        hints: [
          `<p><b>Aha:</b> GCD and LCM can be folded one element at a time: <code>gcd(a, b, c) = gcd(gcd(a, b), c)</code> and <code>lcm(a, b, c) = lcm(lcm(a, b), c)</code>. And <code>gcd(a, b) = gcd(b, a % b)</code>.</p>`,
          `<p>Two running <code>long</code> variables: <code>g</code> and <code>l</code>, both starting at A[0]. For each next x: <code>g = gcd(g, x)</code>, <code>l = l / gcd(l, x) * x</code>.</p>`,
          `<p>Traps: LCM grows fast — use <code>long</code> and divide before multiplying; a single-element array returns (A[0], A[0]); <code>gcd(x, 0) = x</code> stops the loop.<br>Recipe: g = l = A[0]; for i = 1..N−1: g = gcd(g, A[i]); l = l / gcd(l, A[i]) × A[i]. Return {g, l}. (Bonus: once g hits 1 it can never grow again.)</p>`
        ],
        solution: {
          approach: `<p>Fold Euclid's gcd across the array; derive LCM step by step with "divide first".</p>`,
          code: `
            class Solution {
                // Euclid: gcd(a, b) = gcd(b, a % b), finished when b == 0
                static long gcd(long a, long b) {
                    while (b != 0) {
                        long r = a % b;   // leftover after removing as many b's as possible
                        a = b;
                        b = r;
                    }
                    return a;
                }

                // returns {gcd of all, lcm of all}
                public long[] gcdAndLcm(long[] arr) {
                    long g = arr[0];
                    long l = arr[0];
                    for (int i = 1; i < arr.length; i++) {
                        g = gcd(g, arr[i]);                 // common part of everything so far
                        l = l / gcd(l, arr[i]) * arr[i];    // divide FIRST so we never overflow needlessly
                    }
                    return new long[]{g, l};
                }

                public static void main(String[] args) {
                    long[] res = new Solution().gcdAndLcm(new long[]{12, 18, 30});
                    System.out.println(res[0] + " " + res[1]);   // 6 180
                }
            }`,
          dry: {
            head: ['i', 'arr[i]', 'g = gcd(g, arr[i])', 'gcd(l, arr[i])', 'l = l / that × arr[i]'],
            rows: [
              ['start', '12', '12', '—', '12'],
              ['1', '18', 'gcd(12, 18): 12,18 → 18,12 → 12,6 → 6,0 = ' + H.c('y', '6'), '6', '12 / 6 × 18 = ' + H.c('y', '36')],
              ['2', '30', 'gcd(6, 30) = ' + H.c('p', '6'), 'gcd(36, 30) = 6', '36 / 6 × 30 = ' + H.c('p', '180')]
            ]
          },
          complexity: `<p><b>Time O(N · log(max A))</b>: one Euclid run (≈ log steps) per element. <b>Space O(1)</b>: two running numbers.</p>`
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 5 — Modulo rules
  // =====================================================================
  topics.push({
    title: 'Modular Arithmetic: the Rules of "% m"',
    analogy: `<p>A wall <b>clock</b> only shows 12 numbers. It is 10 o'clock; 5 hours later it shows <b>3</b>, not 15 — the clock "forgets" every full lap of 12 and keeps only the <b>remainder</b>. A car's odometer that rolls over from 999999 to 000000 does the same. Working "mod m" means doing all your math on a clock with m positions, so numbers never get too big to write down.</p>`,
    explain: `<p><code>a % m</code> is the <b>remainder</b> when a is divided by m: always one of 0, 1, …, m − 1 (for non-negative a). Example: 15 % 12 = 3.</p>
      ${H.arr([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], { label: 'clock mod 12', hl: { 10: 'y', 11: 'b', 0: 'b', 1: 'b', 2: 'b', 3: 'g' } })}
      <p>Start at ${H.c('y', '10')}, walk 5 steps: 11, 0, 1, 2, ${H.c('g', '3')} → (10 + 5) % 12 = 3.</p>
      <p><b>The rules</b> (take % whenever you like — the final remainder stays the same):</p>
      ${H.table(['operation', 'safe formula', 'small check (m = 7)'], [
        ['add', '<code>(a % m + b % m) % m</code>', '(20 + 13) % 7 = 33 % 7 = 5; (6 + 6) % 7 = 12 % 7 = ' + H.c('g', '5')],
        ['subtract', '<code>(a % m − b % m + m) % m</code>', '(20 − 13) % 7 = 0; (6 − 6 + 7) % 7 = ' + H.c('g', '0')],
        ['multiply', '<code>(a % m) * (b % m) % m</code>', '(20 × 13) % 7 = 260 % 7 = 1; (6 × 6) % 7 = 36 % 7 = ' + H.c('g', '1')],
        ['divide', H.c('r', 'NOT (a % m) / (b % m)'), 'needs a modular inverse (see below)']
      ])}
      <p><b>Why "+ m" when subtracting?</b> In Java the sign of <code>%</code> follows the left number: <code>(3 − 7) % 5</code> is ${H.c('r', '-4')}, not 1. After reducing both numbers (so each is between 0 and m − 1) their difference is at least −(m − 1); adding m pushes it back to 0..2m − 1, and one more <code>% m</code> lands in 0..m − 1: <code>(3 − 7 + 5) % 5 = 1</code> ✓. For a raw value x that could be very negative, use <code>((x % m) + m) % m</code>.</p>
      <p><b>Why <code>long</code> when multiplying?</b> With m = 10<sup>9</sup> + 7, both factors can be about 10<sup>9</sup>; their product is about 10<sup>18</sup>. That overflows <code>int</code> (max ≈ 2.1 × 10<sup>9</sup>) but fits in <code>long</code> (max ≈ 9.2 × 10<sup>18</sup>). Reduce after <b>every</b> multiplication.</p>
      <p><b>Why division breaks:</b> (12 / 4) % 5 = 3, but (12 % 5) / (4 % 5) = 2 / 4 = ${H.c('r', '0')} ✗. Remainders don't "remember" divisibility. Instead we multiply by the <b>modular inverse</b>: a number x with <code>b · x % m = 1</code> (it plays the role of 1/b on the clock). Mod 5 the inverse of 4 is 4, since 4 × 4 = 16 = 3 × 5 + 1. Then 12 / 4 → (12 % 5) × 4 % 5 = 2 × 4 % 5 = 8 % 5 = ${H.c('g', '3')} ✓.</p>
      <p>When m is <b>prime</b> (like 10<sup>9</sup> + 7) and b is not a multiple of m, <b>Fermat's little theorem</b> gives the inverse: <code>inv(b) = b<sup>m−2</sup> % m</code>. Computing that power quickly is the next topic. An inverse exists only when gcd(b, m) = 1 (e.g. mod 6 the number 2 has no inverse).</p>
      <p><b>Why 10<sup>9</sup> + 7?</b> It is prime (so inverses exist), the sum of two remainders still fits in <code>int</code> (2 × 10<sup>9</sup> + 12 &lt; 2<sup>31</sup> − 1), and the product of two fits in <code>long</code>.</p>`,
    clues: [
      '"Return the answer <b>modulo 10<sup>9</sup> + 7</b>" / "the answer may be very large" → reduce after every + and ×.',
      '"Count the number of ways / paths / subsets" → counts explode, so modulo is almost always involved.',
      'You subtract under mod (e.g. prefix[r] − prefix[l − 1]) → add m before the final % to avoid negatives.',
      'You need to <b>divide</b> under a prime mod (averages, nCr = n! / (r!(n−r)!)) → multiply by the modular inverse.',
      '"Last digit(s) of …" → compute mod 10 / mod 100 / mod 10<sup>k</sup>.',
      '"Clock / circular / day of week after k days" → index = (start + k) % m.'
    ],
    code: `
      static final long MOD = 1_000_000_007L;

      long addMod(long a, long b) { return (a % MOD + b % MOD) % MOD; }

      long subMod(long a, long b) {
          return ((a % MOD - b % MOD) % MOD + MOD) % MOD;  // works even if a, b are negative
      }

      long mulMod(long a, long b) {
          return (a % MOD) * (b % MOD) % MOD;              // each factor < MOD → product < 10^18 fits in long
      }

      long powMod(long a, long e) {                        // fast power (next topic)
          long res = 1; a %= MOD;
          while (e > 0) {
              if ((e & 1) == 1) res = res * a % MOD;
              a = a * a % MOD;
              e >>= 1;
          }
          return res;
      }

      long divMod(long a, long b) {                        // a / b under a PRIME modulus, b not divisible by MOD
          long inverse = powMod(b, MOD - 2);               // Fermat: b^(MOD-2) is 1/b on the clock
          return mulMod(a, inverse);
      }`,
    codeTitle: 'Safe modular helpers',
    examples: [
      {
        title: 'A 20-digit number mod 7, one digit at a time',
        html: `<p>"N is given as a string of up to 10<sup>5</sup> digits; return N % 7." You can't store N, but you can read it left to right like a cashier adding up: r = (r × 10 + digit) % m. For "1234": r = 1 → 12 % 7 = 5 → (5·10 + 3) % 7 = 53 % 7 = 4 → (4·10 + 4) % 7 = 44 % 7 = ${H.c('g', '2')}. Check: 1234 = 7 × 176 + 2 ✓. The multiply rule lets us reduce after every digit.</p>`,
        code: `
          int bigMod(String digits, int m) {
              long r = 0;
              for (char ch : digits.toCharArray()) {
                  r = (r * 10 + (ch - '0')) % m;   // shift left one decimal place, add digit, reduce
              }
              return (int) r;                      // bigMod("1234", 7) -> 2
          }`
      },
      {
        title: 'Negative remainders: Java vs Python',
        html: `${H.table(['expression', 'Java / C++ / JS', 'Python', 'math answer'], [
            ['-7 % 3', H.c('r', '-1'), H.c('g', '2'), '2'],
            ['7 % -3', '1', '-2', 'depends on convention'],
            ['Math.floorMod(-7, 3)', H.c('g', '2'), '—', '2']
          ])}
          <p>Java truncates toward zero, so the remainder keeps the sign of the left number. Fixes: <code>((x % m) + m) % m</code> or <code>Math.floorMod(x, m)</code>. This bites in "subarray sums divisible by K" with negative numbers and in circular indexing <code>(i - 1) % n</code> when i = 0.</p>`
      },
      {
        title: 'Range sum under mod: prefix[r] − prefix[l − 1]',
        html: `<p>You store prefix sums mod 10<sup>9</sup>+7. prefix[l − 1] might be <b>bigger</b> than prefix[r] after reduction (e.g. 999999990 and 5). Raw difference = ${H.c('r', '−999999985')}. Correct: (5 − 999999990 + MOD) % MOD = ${H.c('g', '22')}. Always add MOD after a subtraction.</p>`
      },
      {
        title: 'Division by 2 under mod: the inverse 500000004',
        html: `<p>The number of pairs among n items is n(n − 1)/2. With n = 10<sup>9</sup>, n(n − 1) mod p loses divisibility info, so instead multiply by inv(2) = (p + 1)/2 = 500000004 (because 2 × 500000004 = 1000000008 ≡ 1 mod p). n mod p = 10<sup>9</sup>, (n − 1) = 999999999; product mod p = 56, × 500000004 mod p = ${H.c('g', '28')}. True value 499999999500000000 mod p is also 28 ✓.</p>`
      }
    ],
    deepDive: `<p><b>What "≡" really means.</b> a ≡ b (mod m) means m divides a − b. Write a = q₁m + r₁ and b = q₂m + r₂. Then a + b = (q₁ + q₂)m + (r₁ + r₂) and a·b = (…)m + r₁r₂ — the multiples of m never affect the remainder. That is the whole proof of the add/multiply rules. Division fails because "divide by b" is only meaningful if some x satisfies bx ≡ 1, which needs gcd(b, m) = 1.</p>
      <p><b>You cannot compare modded values.</b> If the problem says "return the maximum number of ways mod 10<sup>9</sup>+7", you must find the maximum on the <i>true</i> values (or on logarithms / BigInteger), then reduce. 10<sup>9</sup>+8 mod p = 1 looks smaller than 5. This is the #1 conceptual bug in DP-with-mod problems.</p>
      <p><b>Overflow budget.</b> With m ≈ 10<sup>9</sup>: a sum of two residues fits in int, a product of two fits in long (≈ 10<sup>18</sup> &lt; 9.22 × 10<sup>18</sup>), but a product of <b>three</b> does not — reduce after every multiplication. If m is up to 10<sup>18</sup>, even two residues overflow: use <code>Math.multiplyHigh</code> + careful reduction, <code>BigInteger</code>, C++ <code>__int128</code>, or "multiply by doubling" (add-and-double, the additive twin of fast power).</p>
      <p><b>Popular moduli.</b> 10<sup>9</sup>+7 and 10<sup>9</sup>+9 are primes with the nice overflow properties above. <b>998244353 = 119 × 2<sup>23</sup> + 1</b> is prime and has 2<sup>23</sup>-th roots of unity, so it is used for the Number Theoretic Transform (fast polynomial multiplication). Hash functions use moduli too — rolling hashes (DSA 9) are just polynomials evaluated mod a large prime.</p>
      <p><b>Performance.</b> The <code>%</code> instruction is one of the slowest integer operations (tens of cycles). Competitive libraries use Barrett or Montgomery reduction to replace it with multiplications; JIT compilers already do this automatically when m is a compile-time constant (<code>static final</code>), one reason to declare MOD that way.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants know the "mod 10<sup>9</sup>+7" boilerplate by heart, so writing the helpers is no longer the skill. The skill is <b>auditing</b> modded code: where can a value be negative, where can a product overflow, where did someone compare residues.</p>
      <p><b>Use AI as a partner:</b> paste your DP and ask <code>"List every line where an intermediate value can exceed 2^63 or go negative before the % — don't fix it, just point"</code>. Then fix it yourself and add a test with values near MOD − 1.</p>
      <p><b>Where AI goes wrong:</b> casting to <code>(int)</code> before the multiplication instead of after, writing <code>(a - b) % MOD</code> in Java, taking <code>Math.max</code> of modded counts, and "dividing" with <code>/</code> under a modulus. It also sometimes uses Fermat inverses with a non-prime modulus (e.g. 10<sup>9</sup>), which silently gives wrong answers.</p>
      <p><b>What you must still own:</b> the congruence reasoning (why the rules work and why division doesn't), and an instinct for overflow from the constraints.</p>`,
    viz: {
      title: 'Clock walk: (a + b) % m and (a − b + m) % m',
      input: '10 5 12',
      inputLabel: 'a b m (a ≤ 99, b ≤ 20, 2 ≤ m ≤ 16)',
      gen: function (input) {
        var v = nums(input, 3, 3, 'Enter "a b m", e.g. "10 5 12" (0 ≤ a ≤ 99, 0 ≤ b ≤ 20, 2 ≤ m ≤ 16)');
        var a = v[0], b = v[1], m = v[2];
        if (a < 0 || a > 99 || b < 0 || b > 20 || m < 2 || m > 16) throw new Error('Enter "a b m" with 0 ≤ a ≤ 99, 0 ≤ b ≤ 20, 2 ≤ m ≤ 16');
        var clock = []; for (var i = 0; i < m; i++) clock.push(i);
        var am = a % m, bm = b % m, frames = [];
        frames.push({ narr: 'A clock with ' + m + ' positions (0..' + (m - 1) + '). The number a = ' + a + ' sits at position ' + a + ' % ' + m + ' = <b>' + am + '</b> — full laps are forgotten.', parts: [
          { type: 'array', label: 'clock mod ' + m, values: clock, hl: one(am, 'cur'), ptr: one(am, 'a') },
          { type: 'vars', vals: { a: a, b: b, m: m, 'a % m': am } }
        ] });
        var pos = am, visited = {};
        for (var s = 1; s <= b; s++) {
          var wrap = pos === m - 1;
          visited[pos] = 'win';
          pos = (pos + 1) % m;
          var h = {}; for (var k in visited) h[k] = visited[k]; h[pos] = 'cur';
          frames.push({ narr: 'Add: step ' + s + ' of ' + b + ' forward → position ' + pos + '.' + (wrap ? ' <span class="c-y">We passed ' + (m - 1) + ' and rolled over to 0</span>, just like 11 o\'clock → 12/0.' : ''), parts: [
            { type: 'array', label: 'clock mod ' + m, values: clock, hl: h, ptr: one(pos, 'now') },
            { type: 'vars', vals: { 'steps taken': s, position: pos } }
          ] });
        }
        frames.push({ narr: '(a + b) % m = (' + a + ' + ' + b + ') % ' + m + ' = ' + (a + b) + ' % ' + m + ' = <b>' + ((a + b) % m) + '</b>. Same as (a % m + b % m) % m = (' + am + ' + ' + bm + ') % ' + m + ' = ' + ((am + bm) % m) + '. ✓', parts: [
          { type: 'array', label: 'clock mod ' + m, values: clock, hl: one(pos, 'sel'), ptr: one(pos, 'a+b') },
          { type: 'vars', vals: { '(a + b) % m': (a + b) % m }, hl: { '(a + b) % m': 'sel' } }
        ] });
        pos = am; visited = {};
        for (s = 1; s <= b; s++) {
          var wrapB = pos === 0;
          visited[pos] = 'win';
          pos = (pos - 1 + m) % m;
          var hb = {}; for (var kb in visited) hb[kb] = visited[kb]; hb[pos] = 'cur';
          frames.push({ narr: 'Subtract: step ' + s + ' of ' + b + ' backward → position ' + pos + '.' + (wrapB ? ' <span class="c-y">We went below 0 and wrapped to ' + (m - 1) + '</span> — this is why we add m.' : ''), parts: [
            { type: 'array', label: 'clock mod ' + m, values: clock, hl: hb, ptr: one(pos, 'now') },
            { type: 'vars', vals: { 'steps back': s, position: pos } }
          ] });
        }
        var javaRaw = (am - bm) % m; // JS % has the same sign rule as Java
        var good = (am - bm + m) % m;
        frames.push({ narr: 'Reduce first: a % m = ' + am + ', b % m = ' + bm + '. Raw Java <code>(' + am + ' − ' + bm + ') % ' + m + '</code> = ' + (javaRaw < 0 ? '<span class="c-r">' + javaRaw + ' (negative! not a clock position)</span>' : javaRaw) + '. Safe: (' + am + ' − ' + bm + ' + ' + m + ') % ' + m + ' = <b>' + good + '</b>, matching where the walk ended. ✓', parts: [
          { type: 'array', label: 'clock mod ' + m, values: clock, hl: one(pos, 'sel'), ptr: one(pos, 'a−b') },
          { type: 'vars', vals: { 'Java (a−b)%m': javaRaw, '(a−b+m)%m': good }, hl: { 'Java (a−b)%m': javaRaw < 0 ? 'bad' : 'ok', '(a−b+m)%m': 'sel' } }
        ] });
        frames.push({ narr: 'Multiply follows the same idea: (a × b) % m = (' + am + ' × ' + bm + ') % ' + m + ' = <b>' + ((am * bm) % m) + '</b> (check: ' + (a * b) + ' % ' + m + ' = ' + ((a * b) % m) + '). Division is the odd one out — it needs a modular inverse.', parts: [
          { type: 'vars', vals: { '(a+b)%m': (a + b) % m, '(a−b+m)%m': good, '(a×b)%m': (a * b) % m }, hl: { '(a×b)%m': 'sel' } }
        ] });
        return frames;
      }
    },
    problems: [
      {
        title: 'Sum of Products of All Pairs (mod 10⁹+7)',
        level: 'Medium',
        tags: ['modulo', 'prefix sum', 'overflow'],
        statement: `<p>Given an array <code>A</code> of N non-negative integers, return the sum of <code>A[i] × A[j]</code> over all pairs <code>i &lt; j</code>, modulo 10<sup>9</sup> + 7.</p>`,
        constraints: `1 ≤ N ≤ 10<sup>5</sup>, 0 ≤ A[i] ≤ 10<sup>9</sup>`,
        example: `${H.arr([1, 2, 3, 4], { label: 'A' })}
          <p>Pairs: 1·2 + 1·3 + 1·4 + 2·3 + 2·4 + 3·4 = 2 + 3 + 4 + 6 + 8 + 12 = <b>35</b>.</p>
          <p>Grouped by the <b>right</b> element: ${H.c('y', '2')}·(1) + ${H.c('y', '3')}·(1+2) + ${H.c('y', '4')}·(1+2+3) = 2 + 9 + 24 = ${H.c('p', '35')} — each element multiplies the ${H.c('b', 'sum of everything before it')}.</p>`,
        brute: {
          why: `<p>Two nested loops over all pairs: N(N−1)/2 ≈ 5 × 10<sup>9</sup> multiplications for N = 10<sup>5</sup> → TLE. The wasted work: for every j we re-add A[0] + … + A[j−1] one product at a time, although that sum only grew by one element since the last j.</p>`,
          code: `
            long sumPairsBrute(long[] a) {
                final long MOD = 1_000_000_007L;
                long ans = 0;
                for (int i = 0; i < a.length; i++) {
                    for (int j = i + 1; j < a.length; j++) {
                        ans = (ans + (a[i] % MOD) * (a[j] % MOD)) % MOD;   // every pair, one by one
                    }
                }
                return ans;
            }`
        },
        mcq: {
          q: `Both <code>A[j] % MOD</code> and <code>pre</code> are below 10<sup>9</sup> + 7. How big can their product get, and what type must hold it?`,
          options: [`About 2 × 10<sup>9</sup> — <code>int</code> is enough`, `About 10<sup>18</sup> — <code>long</code> is needed (it fits)`, `About 10<sup>27</sup> — needs <code>BigInteger</code>`, `It can never exceed MOD`],
          answer: 1,
          explain: `(10<sup>9</sup>)² = 10<sup>18</sup>, which is below the long limit of ≈ 9.2 × 10<sup>18</sup> but far above the int limit of ≈ 2.1 × 10<sup>9</sup>. So multiply as long, then take % MOD immediately.`
        },
        hints: [
          `<p><b>Aha:</b> Σ<sub>i&lt;j</sub> A[i]·A[j] = Σ<sub>j</sub> A[j] × (A[0] + … + A[j−1]). Each element pairs with the <b>running total</b> of everything before it.</p>`,
          `<p>Keep one running variable <code>pre</code> = (sum of earlier elements) % MOD. For each j: <code>ans = (ans + A[j] % MOD * pre) % MOD</code>, then <code>pre = (pre + A[j]) % MOD</code>. No array needed.</p>`,
          `<p>Traps: update <code>ans</code> <b>before</b> adding A[j] to pre (otherwise you pair A[j] with itself); multiply in <code>long</code>; reduce after every operation; N = 1 → answer 0.<br>Recipe: pre = 0, ans = 0; for each x: x %= MOD; ans = (ans + x·pre) % MOD; pre = (pre + x) % MOD. Return ans.</p>`
        ],
        solution: {
          approach: `<p>One pass with a running prefix sum, every step reduced mod 10<sup>9</sup> + 7.</p>`,
          code: `
            class Solution {
                static final long MOD = 1_000_000_007L;

                public long sumPairProducts(long[] a) {
                    long pre = 0;   // (a[0] + ... + a[j-1]) % MOD : everything to the left of j
                    long ans = 0;
                    for (int j = 0; j < a.length; j++) {
                        long x = a[j] % MOD;               // reduce first so x < MOD
                        ans = (ans + x * pre) % MOD;       // x pairs with every earlier element at once
                        pre = (pre + x) % MOD;             // now x becomes "earlier" for later elements
                    }
                    return ans;
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().sumPairProducts(new long[]{1, 2, 3, 4}));  // 35
                }
            }`,
          dry: {
            head: ['j', 'A[j]', 'pre before', 'x × pre', 'ans', 'pre after'],
            rows: [
              ['0', '1', '0', '0', '0', '1'],
              ['1', '2', '1', '2', '2', '3'],
              ['2', '3', '3', '9', '11', '6'],
              ['3', '4', '6', '24', H.c('p', '35'), '10']
            ]
          },
          complexity: `<p><b>Time O(N)</b>: one loop, constant work per element (versus 5 × 10<sup>9</sup> pair checks). <b>Space O(1)</b>: just <code>pre</code> and <code>ans</code>.</p>`
        }
      }
    ],
    after: `<p><b>Another way (needs division!):</b> (A[0] + … + A[N−1])² = Σ A[i]² + 2 × (our answer). So answer = (S² − Σ A[i]²) / 2. Under mod you cannot divide by 2 — you multiply by the inverse of 2, which is (MOD + 1) / 2 = 500000004, because 2 × 500000004 = 1000000008 ≡ 1. Same answer, and a perfect example of why modular inverses matter.</p>`
  });

  // =====================================================================
  // TOPIC 6 — Fast modular exponentiation
  // =====================================================================
  topics.push({
    title: 'Fast Modular Exponentiation (a^b mod m)',
    analogy: `<p>You must pay exactly <b>₹13</b> but you may only use special coins worth ₹1, ₹2, ₹4, ₹8 … (each coin is double the last). You pay with 8 + 4 + 1 — at most <b>one of each coin</b>. That is just 13 written in binary: <b>1101</b>. Fast power works the same way: build 3<sup>1</sup>, 3<sup>2</sup>, 3<sup>4</sup>, 3<sup>8</sup> by <b>squaring</b> (each "coin" is the previous one squared), then multiply only the coins whose bit is 1: 3<sup>13</sup> = 3<sup>8</sup> × 3<sup>4</sup> × 3<sup>1</sup>.</p>`,
    explain: `<p>Naive power multiplies by a, b times. For b = 10<sup>18</sup> that is impossible. <b>Binary exponentiation</b> needs only about log₂ b ≈ 60 steps.</p>
      ${H.bits(13, 4, { label: 'b = 13', hl: { 0: 'g', 2: 'g', 3: 'g', 1: 'm' } })}
      ${H.table(['bit k (from the right)', 'bit value', 'base = 3<sup>2<sup>k</sup></sup>', 'take it?', 'result'], [
        ['0', H.c('g', '1'), '3<sup>1</sup> = 3', H.c('g', 'yes'), '3'],
        ['1', H.c('m', '0'), '3<sup>2</sup> = 9', H.c('m', 'no'), '3'],
        ['2', H.c('g', '1'), '3<sup>4</sup> = 81', H.c('g', 'yes'), '3 × 81 = 243'],
        ['3', H.c('g', '1'), '3<sup>8</sup> = 6561', H.c('g', 'yes'), '243 × 6561 = ' + H.c('p', '1594323')]
      ])}
      <p><b>The loop in plain words:</b> while b &gt; 0: if the last bit of b is 1, multiply result by base; square the base (next coin); chop off the last bit (<code>b &gt;&gt;= 1</code>). Reduce mod m after every multiplication so numbers stay below m.</p>
      <p><b>Recursive view:</b> a<sup>b</sup> = (a<sup>b/2</sup>)² if b is even, and a × (a<sup>b/2</sup>)² if b is odd. Each call halves b → log₂ b calls.</p>
      <p><b>Big uses:</b> (1) answers like 2<sup>N</sup> mod 10<sup>9</sup>+7 (number of subsets); (2) the <b>modular inverse</b> <code>inv(x) = x<sup>m−2</sup> % m</code> for prime m (Fermat) — needed for division and nCr; (3) the same squaring idea powers <b>matrix exponentiation</b> (Fibonacci in O(log n)).</p>`,
    clues: [
      '"Compute a<sup>b</sup> mod m" with <code>b ≤ 10<sup>18</sup></code> → binary exponentiation, O(log b).',
      '"Number of subsets / binary strings of length N, modulo 10<sup>9</sup>+7" → 2<sup>N</sup> mod p.',
      '"Divide under a prime modulus", "modular inverse", nCr mod p → Fermat: x<sup>p−2</sup> mod p.',
      '"Apply the same step k times" with k huge (Fibonacci, linear recurrences) → squaring trick on matrices.',
      '"Last digit / last k digits of a<sup>b</sup>" → power mod 10<sup>k</sup>.'
    ],
    code: [`
      long power(long a, long b, long m) {
          long result = 1 % m;          // "1 % m" also handles m == 1 correctly
          long base = a % m;            // base = a^(2^k) for the current bit k
          while (b > 0) {
              if ((b & 1) == 1) {       // current lowest bit is ON → this coin is needed
                  result = result * base % m;
              }
              base = base * base % m;   // next coin: a^(2^(k+1)) = (a^(2^k))^2
              b >>= 1;                  // drop the bit we just handled
          }
          return result;
      }`, `
      long powerRec(long a, long b, long m) {
          if (b == 0) return 1 % m;               // a^0 = 1
          long half = powerRec(a, b / 2, m);      // solve the half-size problem once
          long sq = half * half % m;              // a^(2*(b/2))
          return (b % 2 == 0) ? sq : sq * (a % m) % m;  // odd b needs one extra a
      }

      long modInverse(long x, long p) {           // p must be prime and x % p != 0
          return powerRec(x, p - 2, p);           // Fermat's little theorem
      }`],
    codeTitle: ['Iterative binary exponentiation', 'Recursive version + modular inverse'],
    examples: [
      {
        title: 'Last two digits of 7²²²',
        html: `<p>"Last two digits" = mod 100. Notice 7<sup>4</sup> = 2401 ≡ ${H.c('y', '1')} (mod 100). 222 = 4 × 55 + 2, so 7<sup>222</sup> = (7<sup>4</sup>)<sup>55</sup> × 7<sup>2</sup> ≡ 1<sup>55</sup> × 49 = ${H.c('g', '49')}. Fast power gets the same answer mechanically in 8 rounds (222 = 11011110₂) without spotting the cycle.</p>`,
        code: { lang: 'python', run: true, title: 'Check in Python (pow has a built-in 3-argument form)', code: `print(pow(7, 222, 100))          # 49\nprint(pow(3, 13, 10**9 + 7))     # 1594323\nprint(pow(3, -1, 10**9 + 7))     # modular inverse of 3 (Python 3.8+): 333333336` }
      },
      {
        title: 'Modular inverse of 3 mod 10⁹+7',
        html: `<p>Fermat: inv(3) = 3<sup>p−2</sup> mod p = <b>333333336</b>. Check: 3 × 333333336 = 1000000008 = p + 1 ≡ ${H.c('g', '1')} ✓. So "divide by 3" under this modulus means "multiply by 333333336". Example: (12 / 3) mod p = 12 × 333333336 mod p = 4000000032 mod p = 4000000032 − 4 × 1000000007 = ${H.c('g', '4')} ✓.</p>`
      },
      {
        title: 'Count binary strings of length N (N up to 10¹⁸)',
        html: `<p>Each position is 0 or 1 → 2<sup>N</sup> strings. For N = 10<sup>18</sup> we need 2<sup>N</sup> mod p: about 60 squarings. Variant: "strings with no restriction on even positions (5 choices) and odd positions (4 choices)" → 5<sup>⌈N/2⌉</sup> × 4<sup>⌊N/2⌋</sup> — two fast powers multiplied (this is LeetCode 1922, in Practice).</p>`
      },
      {
        title: 'Fibonacci in O(log n) with the same squaring trick',
        html: `<p>[[1, 1], [1, 0]]<sup>n</sup> = [[F(n+1), F(n)], [F(n), F(n−1)]]. Replace "multiply numbers" with "multiply 2 × 2 matrices" in the fast-power loop and you get F(10<sup>18</sup>) mod p in about 60 matrix multiplications. Fast power works for <b>anything with an associative multiply</b>: matrices, permutations, function composition.</p>`,
        code: `
          long[][] mul(long[][] A, long[][] B, long m) {
              long[][] C = new long[2][2];
              for (int i = 0; i < 2; i++)
                  for (int j = 0; j < 2; j++)
                      for (int k = 0; k < 2; k++)
                          C[i][j] = (C[i][j] + A[i][k] * B[k][j]) % m;
              return C;
          }

          long fib(long n, long m) {                       // F(0)=0, F(1)=1
              long[][] result = {{1, 0}, {0, 1}};          // identity matrix = "1"
              long[][] base = {{1, 1}, {1, 0}};
              while (n > 0) {
                  if ((n & 1) == 1) result = mul(result, base, m);
                  base = mul(base, base, m);
                  n >>= 1;
              }
              return result[0][1];                          // fib(10, 1_000_000_007) -> 55
          }`
      }
    ],
    deepDive: `<p><b>Fermat's little theorem.</b> For prime p and a not divisible by p: a<sup>p−1</sup> ≡ 1 (mod p). Multiply both sides by a<sup>−1</sup>: a<sup>p−2</sup> ≡ a<sup>−1</sup>. That is why inverse = power. If a ≡ 0 (mod p) there is no inverse and the formula returns 0 — guard against it.</p>
      <p><b>Shrinking huge exponents.</b> Because a<sup>p−1</sup> ≡ 1, exponents can be reduced mod (p − 1) when gcd(a, p) = 1: a<sup>b<sup>c</sup></sup> mod p = a<sup>(b<sup>c</sup> mod (p−1))</sup> mod p. Example: "2<sup>(3<sup>100</sup>)</sup> mod 10<sup>9</sup>+7". Careful: when a is a multiple of p the answer is 0, not a<sup>0</sup> = 1. The general version for non-prime m is Euler's theorem with φ(m) (DSA 25).</p>
      <p><b>Overflow ceiling.</b> <code>base * base</code> must fit in a long, so plain fast power works for m up to about 3 × 10<sup>9</sup>. For m up to 10<sup>18</sup> you need a safe mulmod (128-bit product). Java's <code>BigInteger.modPow</code> handles any size; Python's built-in <code>pow(a, b, m)</code> does too, and <code>pow(a, -1, m)</code> (3.8+) returns the inverse for any coprime m.</p>
      <p><b>Security footnote.</b> RSA encryption and Diffie–Hellman are literally modular exponentiation with 2048-bit numbers. Textbook square-and-multiply leaks timing (a 1-bit costs an extra multiply), so crypto libraries use constant-time variants such as the Montgomery ladder. Interviewers occasionally ask "where is fast power used in real life?" — this is the answer.</p>
      <p><b>Recursion vs iteration.</b> Both are O(log b). The recursive version is easiest to explain (halve the problem); the iterative one uses O(1) memory and is what you should submit. Never write <code>pow(a, b/2) * pow(a, b/2)</code> — two recursive calls make it O(b) again.</p>`,
    aiEra: `<p><b>What AI changes:</b> fast power is standard library material (<code>pow(a, b, m)</code> in Python, <code>BigInteger.modPow</code> in Java), so in real work you rarely write it. In interviews it is a five-minute warm-up where they watch for clean bit handling and overflow sense.</p>
      <p><b>Use AI as a partner:</b> ask <code>"Give me 5 problems where the hidden step is a^b mod p or a modular inverse, increasing in difficulty"</code> to drill recognition, or ask it to explain the matrix form of a recurrence you found.</p>
      <p><b>Where AI goes wrong:</b> it computes <code>pow(a, b/2) * pow(a, b/2)</code> (exponential blow-up), forgets <code>a %= m</code> at the start (overflow when a ≈ 10<sup>18</sup>), uses Fermat's inverse with a composite modulus, or reduces the exponent mod p instead of mod (p − 1). Test with b = 0, a = 0, a = m and a ≡ 0 cases.</p>
      <p><b>What you must still own:</b> the binary-decomposition idea (it reappears in binary lifting, doubling and sparse tables) and knowing when exponent reduction is legal.</p>`,
    viz: {
      title: 'Fast power: bits of b and repeated squaring',
      input: '3 13 1000000',
      inputLabel: 'a b m (a ≤ 10^9, b ≤ 10^9, 2 ≤ m ≤ 10^7)',
      gen: function (input) {
        var v = nums(input, 3, 3, 'Enter "a b m", e.g. "3 13 1000000"');
        var a = v[0], b = v[1], m = v[2];
        if (a < 0 || a > 1e9 || b < 0 || b > 1e9 || m < 2 || m > 1e7) throw new Error('Enter "a b m" with 0 ≤ a ≤ 10^9, 0 ≤ b ≤ 10^9, 2 ≤ m ≤ 10^7');
        var width = Math.max(4, b.toString(2).length);
        var result = 1, base = a % m, bb = b, k = 0, taken = [], frames = [], done = {};
        frames.push({ narr: 'Compute ' + a + '<sup>' + b + '</sup> mod ' + m + '. Write b in binary: <b>' + b.toString(2) + '</b>. Each 1-bit at position k means "multiply in a<sup>2<sup>k</sup></sup>". Start with result = 1 and base = a % m = ' + base + '.', parts: [
          { type: 'bits', label: 'b = ' + b, value: b, width: width },
          { type: 'vars', vals: { result: result, base: base, 'b left': bb } }
        ] });
        while (bb > 0) {
          var bit = bb % 2;
          var hl = {}; for (var d in done) hl[d] = done[d]; hl[k] = bit ? 'ok' : 'cur';
          var oldRes = result;
          if (bit) { result = (result * base) % m; taken.push(a + '^' + Math.pow(2, k)); }
          frames.push({ narr: 'Bit ' + k + ' of b is <b>' + bit + '</b>. ' + (bit
            ? '<span class="c-g">ON → multiply it in:</span> result = ' + oldRes + ' × ' + base + ' mod ' + m + ' = <b>' + result + '</b>. (base currently equals ' + a + '<sup>' + Math.pow(2, k) + '</sup> mod m.)'
            : 'OFF → skip this coin, result stays ' + result + '.'), parts: [
            { type: 'bits', label: 'b = ' + b, value: b, width: width, hl: hl, ptr: one(k, 'k') },
            { type: 'vars', vals: { k: k, bit: bit, base: base, result: result }, hl: { result: bit ? 'ok' : 'done' } },
            { type: 'array', label: 'coins used', values: taken.length ? taken.slice() : ['(none yet)'] }
          ] });
          done[k] = 'done';
          var oldBase = base;
          base = (base * base) % m;
          bb = Math.floor(bb / 2);
          if (bb > 0) {
            frames.push({ narr: 'Square the base for the next bit: ' + oldBase + '² mod ' + m + ' = <b>' + base + '</b> (that is ' + a + '<sup>' + Math.pow(2, k + 1) + '</sup> mod m). Shift b right: ' + bb + ' left to process.', parts: [
              { type: 'bits', label: 'b = ' + b, value: b, width: width, hl: (function () { var h = {}; for (var x in done) h[x] = done[x]; return h; })() },
              { type: 'vars', vals: { 'old base': oldBase, 'new base': base, 'b left': bb }, hl: { 'new base': 'cur' } }
            ] });
          }
          k++;
        }
        frames.push({ narr: 'b is 0 — all bits handled. ' + a + '<sup>' + b + '</sup> mod ' + m + ' = <b>' + result + '</b> using only ' + k + ' loop rounds instead of ' + b + ' multiplications.', parts: [
          { type: 'vars', vals: { answer: result, rounds: k, 'naive multiplications': b }, hl: { answer: 'sel' } },
          { type: 'array', label: 'coins multiplied together', values: taken.length ? taken.slice() : ['a^0 = 1'] }
        ] });
        return padFrames(frames, 'b = 0 means a<sup>0</sup> = 1, so the loop never runs and the answer is 1.', [{ type: 'vars', vals: { answer: result } }]);
      }
    },
    problems: [
      {
        title: 'Power Mod 10⁹+7 (huge exponent)',
        level: 'Medium',
        tags: ['binary exponentiation', 'modulo'],
        statement: `<p>Given <code>a</code> and <code>b</code>, return <code>a<sup>b</sup> mod (10<sup>9</sup> + 7)</code>. Treat 0<sup>0</sup> as 1.</p>`,
        constraints: `0 ≤ a ≤ 10<sup>9</sup>, 0 ≤ b ≤ 10<sup>18</sup>`,
        example: `<p><code>a = 3, b = 13</code> → <b>1594323</b></p>${H.bits(13, 4, { label: 'b', hl: { 0: 'g', 2: 'g', 3: 'g' } })}<p>13 = ${H.c('g', '8 + 4 + 1')} so 3<sup>13</sup> = 3<sup>8</sup> × 3<sup>4</sup> × 3<sup>1</sup> = 6561 × 81 × 3 = ${H.c('p', '1594323')} (smaller than the modulus, so it stays as is).<br><code>a = 2, b = 10</code> → 1024.</p>`,
        brute: {
          why: `<p>Multiply result by a, b times. For b = 10<sup>18</sup> that is 10<sup>18</sup> multiplications — thousands of years. Wasted work: we recompute the same partial powers again and again instead of doubling what we already have.</p>`,
          code: `
            long powerBrute(long a, long b) {
                final long MOD = 1_000_000_007L;
                long res = 1;
                for (long i = 0; i < b; i++) {
                    res = res * (a % MOD) % MOD;   // one multiplication per unit of b
                }
                return res;
            }`
        },
        mcq: {
          q: `About how many loop rounds does binary exponentiation take for b = 10<sup>18</sup>?`,
          options: [`About 18`, `About 60`, `About 10<sup>9</sup>`, `About 10<sup>18</sup>`],
          answer: 1,
          explain: `One round per bit of b. 2<sup>60</sup> ≈ 1.15 × 10<sup>18</sup>, so 10<sup>18</sup> has 60 bits → about 60 rounds.`
        },
        hints: [
          `<p><b>Aha:</b> a<sup>b</sup> = product of a<sup>2<sup>k</sup></sup> over the bits k where b has a 1. And a<sup>2<sup>k+1</sup></sup> = (a<sup>2<sup>k</sup></sup>)², so each "coin" comes from squaring the previous one.</p>`,
          `<p>Two <code>long</code> variables: <code>result</code> (starts at 1) and <code>base</code> (starts at a % MOD). Read b's bits from the right with <code>b &amp; 1</code> and <code>b &gt;&gt;= 1</code>.</p>`,
          `<p>Traps: reduce a first (a can equal MOD-ish values); <code>result * base</code> and <code>base * base</code> need <code>long</code> and an immediate <code>% MOD</code>; b = 0 → 1; a = 0, b &gt; 0 → 0.<br>Recipe: res = 1; base = a % MOD; while b &gt; 0: if b odd → res = res·base % MOD; base = base·base % MOD; b = b / 2. Return res.</p>`
        ],
        solution: {
          approach: `<p>Iterative binary exponentiation, O(log b).</p>`,
          code: `
            class Solution {
                static final long MOD = 1_000_000_007L;

                public long power(long a, long b) {
                    long result = 1;                       // a^0 = 1
                    long base = a % MOD;                   // current coin: a^(2^k) mod MOD
                    while (b > 0) {
                        if ((b & 1) == 1) {                // this bit of b is 1 → use this coin
                            result = result * base % MOD;
                        }
                        base = base * base % MOD;          // next coin by squaring
                        b >>= 1;                           // move to the next bit
                    }
                    return result;
                }

                public static void main(String[] args) {
                    Solution s = new Solution();
                    System.out.println(s.power(3, 13));    // 1594323
                    System.out.println(s.power(2, 10));    // 1024
                }
            }`,
          dry: {
            head: ['round', 'b (binary)', 'b &amp; 1', 'result', 'base after squaring'],
            rows: [
              ['start', '1101', '—', '1', '3'],
              ['1', '1101', H.c('g', '1'), '1 × 3 = 3', '9'],
              ['2', '110', H.c('m', '0'), '3', '81'],
              ['3', '11', H.c('g', '1'), '3 × 81 = 243', '6561'],
              ['4', '1', H.c('g', '1'), '243 × 6561 = ' + H.c('p', '1594323'), '43046721 (unused)'],
              ['end', '0', '—', H.c('p', '1594323'), '—']
            ]
          },
          complexity: `<p><b>Time O(log b)</b>: each round removes one bit of b; 10<sup>18</sup> has 60 bits → 60 rounds. <b>Space O(1)</b> (the recursive version uses O(log b) stack).</p>`
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 7 — nCr and Pascal's Triangle
  // =====================================================================
  topics.push({
    title: 'Counting Choices: nCr, Factorials & Pascal\'s Triangle',
    analogy: `<p>A pizza shop offers <b>5 toppings</b> and the deal lets you pick <b>any 2</b>. How many different pizzas? Mushroom + olive is the same pizza as olive + mushroom — <b>order does not matter</b>, only <i>which</i> toppings are in the box. That count is "5 choose 2", written <b>C(5, 2)</b> or <b>⁵C₂</b>, and it equals 10.</p>
      <p>Pascal's Triangle is like a <b>pinball board</b>: a ball dropped at the top bounces left or right at every peg. The number of different routes to each slot is the sum of the routes to the two slots just above it.</p>`,
    explain: `<p><b>Step 1 — arrangements (order matters).</b> Lining up 5 people in a row: 5 choices for the first seat, 4 for the second … → 5 × 4 × 3 × 2 × 1 = <b>5! = 120</b> ("5 factorial"). By definition 0! = 1 (one way to arrange nothing).</p>
      <p><b>Step 2 — choosing (order does not matter).</b> Picking 2 toppings out of 5 <i>in order</i> gives 5 × 4 = 20 ordered picks, but each pizza was counted 2! = 2 times (AB and BA). So</p>
      <p style="text-align:center"><b>C(n, r) = n! / (r! × (n − r)!)</b> &nbsp; → &nbsp; C(5, 2) = 120 / (2 × 6) = ${H.c('g', '10')}</p>
      ${H.table(['picked', 'pizzas (A..E = toppings)'], [['AB AC AD AE', '4'], ['BC BD BE', '3'], ['CD CE', '2'], ['DE', '1'], [H.c('p', 'total'), H.c('p', '10')]])}
      <p><b>Symmetry:</b> C(n, r) = C(n, n − r). Choosing the 2 toppings you <i>want</i> is the same as choosing the 3 you <i>leave out</i>.</p>
      <p><b>Pascal's rule:</b> C(n, r) = C(n − 1, r − 1) + C(n − 1, r). Look at the last topping E: either E is <b>in</b> the pizza (choose the other r − 1 from the first n − 1) or E is <b>out</b> (choose all r from the first n − 1). Stacking these sums gives Pascal's Triangle:</p>
      ${H.table(['n', 'row of C(n, 0) … C(n, n)', 'row sum'], [
        ['0', '1', '1'], ['1', '1 1', '2'], ['2', '1 2 1', '4'], ['3', '1 3 3 1', '8'], ['4', '1 4 ' + H.c('y', '6') + ' 4 1', '16'], ['5', '1 5 ' + H.c('g', '10') + ' 10 5 1', '32']
      ])}
      <p>${H.c('g', '10')} = 4 + ${H.c('y', '6')} (the two numbers above it). Each row sums to 2<sup>n</sup> — the total number of subsets.</p>
      <p><b>Three ways to compute C(n, r) — pick from the constraints:</b></p>
      <ul>
        <li><b>Pascal table</b> (only additions): O(n × r) time, works for <b>any</b> modulus, even non-prime. Good for n ≤ ~5000.</li>
        <li><b>Multiplicative formula</b> exactly in <code>long</code>: result = result × (n − i) / (i + 1). Exact only while numbers fit (about n ≤ 60).</li>
        <li><b>Factorials + inverse factorials mod a prime p</b>: precompute in O(N), then every query is O(1): C(n, r) = fact[n] × invFact[r] × invFact[n − r] mod p. The standard for n up to 10<sup>6</sup>–10<sup>7</sup> and "answer mod 10<sup>9</sup>+7".</li>
      </ul>`,
    clues: [
      '"In how many ways can we <b>choose / select / pick</b> r items" with order not mattering → C(n, r).',
      '"Number of paths in a grid moving only right/down" → C(right + down, down).',
      '"Answer modulo 10<sup>9</sup>+7" with n up to 10<sup>6</sup> and <b>many queries</b> → precompute fact[] and invFact[].',
      '"Modulus is NOT prime" (e.g. 10<sup>9</sup>, or m given in input) and n ≤ a few thousand → Pascal table (additions only, no inverses).',
      '"Arrange letters of a word with repeats" → n! / (count₁! × count₂! × …) (multinomial).',
      '"Print row k of Pascal\'s triangle", "binomial coefficients", "coefficients of (x + y)<sup>n</sup>" → Pascal rule.'
    ],
    code: [`
      long[][] pascal(int n, long mod) {
          long[][] C = new long[n + 1][n + 1];
          for (int i = 0; i <= n; i++) {
              C[i][0] = 1 % mod;                         // one way to choose nothing
              for (int j = 1; j <= i; j++) {
                  // last item is either IN (choose j-1 from i-1) or OUT (choose j from i-1)
                  C[i][j] = (C[i - 1][j - 1] + C[i - 1][j]) % mod;
              }
          }
          return C;                                      // works for ANY modulus (no division)
      }`, `
      static final int MOD = 1_000_000_007;
      static long[] fact, invFact;

      static long power(long a, long e) {
          long r = 1; a %= MOD;
          while (e > 0) { if ((e & 1) == 1) r = r * a % MOD; a = a * a % MOD; e >>= 1; }
          return r;
      }

      static void precompute(int n) {
          fact = new long[n + 1];
          invFact = new long[n + 1];
          fact[0] = 1;
          for (int i = 1; i <= n; i++) fact[i] = fact[i - 1] * i % MOD;       // i! mod p
          invFact[n] = power(fact[n], MOD - 2);                                // one Fermat inverse
          for (int i = n; i > 0; i--) invFact[i - 1] = invFact[i] * i % MOD;  // 1/(i-1)! = i / i!
      }

      static long nCr(int n, int r) {
          if (r < 0 || r > n) return 0;                                        // impossible choice
          return fact[n] * invFact[r] % MOD * invFact[n - r] % MOD;
      }`, `
      long nCrExact(int n, int r) {           // exact value, safe for n <= 61
          r = Math.min(r, n - r);             // symmetry: fewer steps, smaller numbers
          long res = 1;
          for (int i = 0; i < r; i++) {
              res = res * (n - i) / (i + 1);  // after step i, res = C(n, i + 1): division is always exact
          }
          return res;
      }`],
    codeTitle: ['Pascal table (any modulus)', 'Factorials + inverse factorials (prime modulus, O(1) per query)', 'Exact multiplicative formula (small n)'],
    viz: [
      {
        title: 'Build Pascal\'s Triangle row by row',
        input: '6 2',
        inputLabel: 'n r (0 ≤ r ≤ n ≤ 12)',
        gen: function (input) {
          var v = nums(input, 2, 2, 'Enter "n r", e.g. "6 2" (0 ≤ r ≤ n ≤ 12)');
          var n = v[0], r = v[1];
          if (n < 0 || n > 12 || r < 0 || r > n) throw new Error('Enter "n r" with 0 ≤ r ≤ n ≤ 12, e.g. "6 2"');
          var C = [], frames = [], i, j;
          function grid(upto) {
            var rows = [];
            for (var a = 0; a <= n; a++) {
              var row = [];
              for (var b = 0; b <= n; b++) row.push(a <= upto && b <= a ? C[a][b] : '');
              rows.push(row);
            }
            return rows;
          }
          var colHead = [], rowHead = [];
          for (j = 0; j <= n; j++) colHead.push('r=' + j);
          for (i = 0; i <= n; i++) rowHead.push('n=' + i);
          for (i = 0; i <= n; i++) {
            C.push([]);
            for (j = 0; j <= i; j++) C[i].push(j === 0 || j === i ? 1 : C[i - 1][j - 1] + C[i - 1][j]);
            var hl = {}, focus = Math.min(r, i), narr;
            for (j = 0; j <= i; j++) hl[i + ',' + j] = 'ok';
            if (i === 0) {
              narr = 'Row 0 is just <b>1</b>: there is exactly one way to choose nothing from nothing.';
            } else if (focus === 0 || focus === i) {
              hl[i + ',' + focus] = 'cur';
              narr = 'Row ' + i + ': the edges are always 1 (choose none, or choose all). Inner cells add the two cells above. Row sum = ' + Math.pow(2, i) + ' = 2<sup>' + i + '</sup>.';
            } else {
              hl[i + ',' + focus] = 'cur'; hl[(i - 1) + ',' + (focus - 1)] = 'win'; hl[(i - 1) + ',' + focus] = 'win';
              narr = 'Row ' + i + ': C(' + i + ', ' + focus + ') = C(' + (i - 1) + ', ' + (focus - 1) + ') + C(' + (i - 1) + ', ' + focus + ') = ' + C[i - 1][focus - 1] + ' + ' + C[i - 1][focus] + ' = <b>' + C[i][focus] + '</b>. (Last item IN: ' + C[i - 1][focus - 1] + ' ways; OUT: ' + C[i - 1][focus] + ' ways.)';
            }
            frames.push({ narr: narr, parts: [
              { type: 'grid', label: 'Pascal\'s triangle: C(n, r)', rows: grid(i), rowHead: rowHead, colHead: colHead, hl: hl },
              { type: 'array', label: 'row ' + i, values: C[i].slice() }
            ] });
          }
          var fh = {}; fh[n + ',' + r] = 'sel'; fh[n + ',' + (n - r)] = 'sel';
          frames.push({ narr: 'Answer: C(' + n + ', ' + r + ') = <b>' + C[n][r] + '</b>. Notice the row is a mirror: C(' + n + ', ' + r + ') = C(' + n + ', ' + (n - r) + ') — choosing what to take equals choosing what to leave.', parts: [
            { type: 'grid', label: 'Pascal\'s triangle: C(n, r)', rows: grid(n), rowHead: rowHead, colHead: colHead, hl: fh },
            { type: 'vars', vals: { n: n, r: r, 'C(n, r)': C[n][r], 'C(n, n−r)': C[n][n - r] }, hl: { 'C(n, r)': 'sel' } }
          ] });
          return padFrames(frames, 'Only additions were used — that is why this table works for any modulus.', [{ type: 'vars', vals: { 'C(n, r)': C[n][r] } }]);
        }
      },
      {
        title: 'nCr mod a prime with fact[] and invFact[]',
        input: '6 2 13',
        inputLabel: 'n r p (p prime ≤ 97, 0 ≤ r ≤ n < p)',
        gen: function (input) {
          var v = nums(input, 3, 3, 'Enter "n r p", e.g. "6 2 13"');
          var n = v[0], r = v[1], p = v[2], i;
          var isP = p >= 2;
          for (i = 2; i * i <= p; i++) if (p % i === 0) isP = false;
          if (!isP || p > 97 || n < 0 || r < 0 || r > n || n >= p) throw new Error('Need p prime ≤ 97 and 0 ≤ r ≤ n < p, e.g. "6 2 13"');
          function pw(a, e) { var res = 1; a %= p; while (e > 0) { if (e & 1) res = res * a % p; a = a * a % p; e >>= 1; } return res; }
          var fact = [1], frames = [];
          frames.push({ narr: 'Goal: C(' + n + ', ' + r + ') mod ' + p + ' without ever dividing. Plan: fact[i] = i! mod p going up, then invFact going down, then multiply.', parts: [
            { type: 'array', label: 'fact', values: fact.slice() }, { type: 'vars', vals: { n: n, r: r, p: p } }
          ] });
          for (i = 1; i <= n; i++) {
            fact.push(fact[i - 1] * i % p);
            frames.push({ narr: 'fact[' + i + '] = fact[' + (i - 1) + '] × ' + i + ' mod ' + p + ' = ' + fact[i - 1] + ' × ' + i + ' mod ' + p + ' = <b>' + fact[i] + '</b>.', parts: [
              { type: 'array', label: 'fact (i! mod p)', values: fact.slice(), hl: one(i, 'ok') }
            ] });
          }
          var inv = []; for (i = 0; i <= n; i++) inv.push('?');
          inv[n] = pw(fact[n], p - 2);
          frames.push({ narr: 'ONE expensive step: invFact[' + n + '] = fact[' + n + ']<sup>p−2</sup> mod p = ' + fact[n] + '<sup>' + (p - 2) + '</sup> mod ' + p + ' = <b>' + inv[n] + '</b> (Fermat). Check: ' + fact[n] + ' × ' + inv[n] + ' mod ' + p + ' = ' + (fact[n] * inv[n] % p) + '.', parts: [
            { type: 'array', label: 'fact', values: fact.slice() },
            { type: 'array', label: 'invFact', values: inv.slice(), hl: one(n, 'cur') }
          ] });
          for (i = n; i > 0; i--) {
            inv[i - 1] = inv[i] * i % p;
            frames.push({ narr: 'invFact[' + (i - 1) + '] = invFact[' + i + '] × ' + i + ' mod ' + p + ' = <b>' + inv[i - 1] + '</b>. Why? 1/(' + (i - 1) + ')! = ' + i + ' / ' + i + '! — multiplying by i "cancels" the last factor. No more exponentiations needed.', parts: [
              { type: 'array', label: 'fact', values: fact.slice() },
              { type: 'array', label: 'invFact', values: inv.slice(), hl: one(i - 1, 'ok') }
            ] });
          }
          var ans = fact[n] * inv[r] % p * inv[n - r] % p;
          var exact = 1; for (i = 0; i < r; i++) exact = exact * (n - i) / (i + 1);
          var hf = {}; hf[r] = 'sel'; hf[n - r] = 'sel';
          frames.push({ narr: 'C(' + n + ', ' + r + ') = fact[' + n + '] × invFact[' + r + '] × invFact[' + (n - r) + '] mod ' + p + ' = ' + fact[n] + ' × ' + inv[r] + ' × ' + inv[n - r] + ' mod ' + p + ' = <b>' + ans + '</b>. Exact C(' + n + ', ' + r + ') = ' + exact + ', and ' + exact + ' mod ' + p + ' = ' + (exact % p) + ' ✓.', parts: [
            { type: 'array', label: 'fact', values: fact.slice(), hl: one(n, 'sel') },
            { type: 'array', label: 'invFact', values: inv.slice(), hl: hf },
            { type: 'vars', vals: { answer: ans, 'exact % p': exact % p }, hl: { answer: 'sel' } }
          ] });
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'Grid paths: 2 × 3 grid → C(5, 2) = 10',
        html: `<p>From the top-left to the bottom-right of a grid with 3 steps right (R) and 2 steps down (D), every route is a word of 5 letters with exactly 2 D's, like RRDRD. Choosing <b>where the D's go</b> among 5 positions: C(5, 2) = ${H.c('g', '10')}. In general: C(right + down, down). For a 100 × 100 board that is C(198, 99) — huge, so the question will say "mod 10<sup>9</sup>+7".</p>`
      },
      {
        title: 'Handshakes and pairs: C(n, 2) = n(n − 1)/2',
        html: `<p>10 people each shake hands once with everybody else: C(10, 2) = 10 × 9 / 2 = ${H.c('g', '45')}. The same formula counts pairs (i &lt; j) in an array — it is why "check all pairs" brute force is O(n²): 10<sup>5</sup> elements → ≈ 5 × 10<sup>9</sup> pairs.</p>`
      },
      {
        title: 'Anagram count of "BANANA" (multinomial)',
        html: `<p>6 letters: B ×1, A ×3, N ×2. If all letters were different there would be 6! = 720 orders, but swapping the three A's (3! = 6 ways) or the two N's (2! = 2) changes nothing. So 720 / (1! × 3! × 2!) = 720 / 12 = ${H.c('g', '60')}. Under a prime modulus: fact[6] × invFact[1] × invFact[3] × invFact[2].</p>`,
        code: `
          long anagrams(String w, long[] fact, long[] invFact, long mod) {
              int[] cnt = new int[26];
              for (char c : w.toCharArray()) cnt[c - 'A']++;
              long res = fact[w.length()];                 // all orders as if letters were distinct
              for (int k : cnt) res = res * invFact[k] % mod; // divide out swaps of identical letters
              return res;                                  // "BANANA" -> 60
          }`
      },
      {
        title: 'Row k of Pascal\'s triangle in O(k) without a table',
        html: `<p>C(k, j + 1) = C(k, j) × (k − j) / (j + 1). Row 5: 1 → 1×5/1 = 5 → 5×4/2 = 10 → 10×3/3 = 10 → 10×2/4 = 5 → 5×1/5 = 1. Each division is exact because the left side is a whole number. (Use <code>long</code>; fine for k ≤ 60.)</p>`,
        code: `
          List<Long> pascalRow(int k) {
              List<Long> row = new ArrayList<>();
              long c = 1;
              for (int j = 0; j <= k; j++) {
                  row.add(c);
                  c = c * (k - j) / (j + 1);    // next coefficient from the current one
              }
              return row;                        // pascalRow(5) -> [1, 5, 10, 10, 5, 1]
          }`
      }
    ],
    deepDive: `<p><b>Why the backward invFact loop works.</b> invFact[i − 1] = 1/(i − 1)! = i / i! = i × invFact[i]. So one Fermat exponentiation (O(log p)) plus N multiplications gives every inverse factorial — total O(N + log p), instead of N separate exponentiations.</p>
      <p><b>When n ≥ p</b> (e.g. n up to 10<sup>18</sup>, p = 10<sup>6</sup>+3), fact[n] mod p is 0 and the formula breaks. Then use <b>Lucas' theorem</b>: write n and r in base p and multiply the small C(nᵢ, rᵢ) digit by digit (DSA 25). When the modulus is <b>composite</b> (say 10<sup>9</sup> or 2<sup>32</sup>), inverses may not exist: use the Pascal table if n is small, factor the modulus and combine with CRT, or compute with <code>BigInteger</code> and reduce at the end.</p>
      <p><b>Size intuition.</b> C(n, n/2) ≈ 2<sup>n</sup> / √(πn/2). C(30, 15) ≈ 1.55 × 10<sup>8</sup> fits in int; C(66, 33) ≈ 7.2 × 10<sup>18</sup> is the largest central coefficient that fits in a signed 64-bit long; C(68, 34) does not. The multiplicative loop overflows a little earlier (intermediate value C × (i + 1)), so treat n ≤ 61 as the exact-long limit.</p>
      <p><b>Identities that show up in interviews:</b> row sum Σ C(n, r) = 2<sup>n</sup> (each item in or out); <b>hockey stick</b> C(r, r) + C(r+1, r) + … + C(n, r) = C(n+1, r+1); <b>Vandermonde</b> Σ C(m, k) C(n, r−k) = C(m+n, r); <b>binomial theorem</b> (x + y)<sup>n</sup> = Σ C(n, k) x<sup>k</sup> y<sup>n−k</sup>; <b>stars and bars</b>: ways to split n identical items into k groups (empty allowed) = C(n + k − 1, k − 1). Catalan numbers C(2n, n)/(n + 1) count balanced parentheses and BST shapes (DSA 25).</p>
      <p><b>Memory reality.</b> A full Pascal table for n = 5000 is 25 million longs = 200 MB — too big. Keep only the previous row (1-D DP, iterate j downward) when you need just C(n, ·) for one n, or a triangle of ints when the modulus fits in 32 bits.</p>`,
    aiEra: `<p><b>What AI changes:</b> the fact/invFact template is everywhere and AI reproduces it reliably. What it cannot do for you in an interview is the <b>modelling step</b>: realising "paths with R and D moves" or "distribute candies" is a binomial coefficient, and choosing the right computation method from the modulus and n.</p>
      <p><b>Use AI as a partner:</b> describe a counting problem and ask <code>"Give me the closed-form count and a brute-force enumerator for n ≤ 8 so I can verify the formula"</code>. Checking a formula against brute-force enumeration on tiny inputs catches almost every off-by-one in combinatorics.</p>
      <p><b>Where AI goes wrong:</b> using Fermat inverses when the modulus is not prime, forgetting the r &lt; 0 or r &gt; n guard, precomputing factorials only up to n when the formula needs n + k − 1, and double counting when order does or does not matter (permutation vs combination). It also confidently states wrong "closed forms" for twisted counting problems — always verify on small n.</p>
      <p><b>What you must still own:</b> the in/out argument behind Pascal's rule, the "order matters?" question, and the method choice table (Pascal vs exact long vs fact/invFact vs Lucas).</p>`,
    problems: [
      {
        title: 'nCr mod 10⁹+7 for Many Queries',
        level: 'Medium',
        tags: ['combinatorics', 'modular inverse', 'precomputation'],
        companies: ['Google', 'Codenation', 'Amazon'],
        statement: `<p>You are given Q queries; each query is a pair <code>(n, r)</code>. For each query return C(n, r) mod 10<sup>9</sup> + 7 (return 0 if r &gt; n).</p>`,
        constraints: `1 ≤ Q ≤ 10<sup>5</sup>, 0 ≤ r, n ≤ 10<sup>6</sup>`,
        example: `<p>Queries <code>[(5, 2), (10, 3), (4, 7)]</code> → <b>[10, 120, 0]</b></p>
          ${H.table(['query', 'formula', 'answer'], [['(5, 2)', '5! / (2! 3!) = 120 / 12', H.c('g', '10')], ['(10, 3)', '10 × 9 × 8 / 6', H.c('g', '120')], ['(4, 7)', 'cannot pick 7 of 4', H.c('r', '0')]])}`,
        brute: {
          why: `<p>For each query multiply the r factors (n − i) and divide by (i + 1) via a modular inverse each time: O(r log p) per query → 10<sup>5</sup> × 10<sup>6</sup> × 30 ≈ 3 × 10<sup>12</sup> operations. The wasted work: every query rebuilds the same factorials from scratch.</p>`,
          code: `
            class Brute {
                static final long MOD = 1_000_000_007L;
                static long power(long a, long e) {
                    long r = 1; a %= MOD;
                    while (e > 0) { if ((e & 1) == 1) r = r * a % MOD; a = a * a % MOD; e >>= 1; }
                    return r;
                }
                long nCr(int n, int r) {
                    if (r < 0 || r > n) return 0;
                    long res = 1;
                    for (int i = 0; i < r; i++) {
                        res = res * (n - i) % MOD;                 // multiply the next top factor
                        res = res * power(i + 1, MOD - 2) % MOD;   // "divide" by i + 1 (one inverse per step!)
                    }
                    return res;
                }
            }`
        },
        mcq: {
          q: `You have fact[] up to 10<sup>6</sup>. What is the cheapest way to get all invFact[] values?`,
          options: [`Call power(fact[i], MOD − 2) for every i`, `One power() for invFact[N], then invFact[i − 1] = invFact[i] × i going down`, `Divide 1 by fact[i] using doubles`, `Use the Pascal table instead`],
          answer: 1,
          explain: `1/(i−1)! = i × 1/i!, so after one exponentiation every other inverse costs a single multiplication: O(N + log p) total instead of O(N log p).`
        },
        hints: [
          `<p><b>Aha:</b> C(n, r) = n! × (r!)<sup>−1</sup> × ((n − r)!)<sup>−1</sup> mod p, and p = 10<sup>9</sup>+7 is prime, so every factorial below p has an inverse.</p>`,
          `<p>Precompute two arrays up to the largest n: <code>fact</code> (forward, ×i) and <code>invFact</code> (one Fermat power at the top, then ×i going down). Each query becomes three lookups and two multiplications.</p>`,
          `<p>Traps: r &gt; n or r &lt; 0 → 0; multiply in <code>long</code> and reduce after <b>each</b> multiplication (three factors would overflow); size arrays to max n + 1.<br>Recipe: fact[0] = 1; fact[i] = fact[i−1]·i; invFact[N] = fact[N]<sup>p−2</sup>; invFact[i−1] = invFact[i]·i; answer = fact[n]·invFact[r] % p · invFact[n−r] % p.</p>`
        ],
        solution: {
          approach: `<p>Precompute factorials and inverse factorials once in O(N + log p); answer each query in O(1).</p>`,
          code: `
            class Solution {
                static final long MOD = 1_000_000_007L;
                long[] fact, invFact;

                long power(long a, long e) {
                    long r = 1; a %= MOD;
                    while (e > 0) {
                        if ((e & 1) == 1) r = r * a % MOD;
                        a = a * a % MOD;
                        e >>= 1;
                    }
                    return r;
                }

                void precompute(int n) {
                    fact = new long[n + 1];
                    invFact = new long[n + 1];
                    fact[0] = 1;
                    for (int i = 1; i <= n; i++) fact[i] = fact[i - 1] * i % MOD;
                    invFact[n] = power(fact[n], MOD - 2);                   // Fermat, once
                    for (int i = n; i > 0; i--) invFact[i - 1] = invFact[i] * i % MOD;
                }

                long nCr(int n, int r) {
                    if (r < 0 || r > n) return 0;
                    return fact[n] * invFact[r] % MOD * invFact[n - r] % MOD; // reduce after each multiply
                }

                public long[] solve(int[][] queries) {
                    int maxN = 1;
                    for (int[] q : queries) maxN = Math.max(maxN, q[0]);
                    precompute(maxN);
                    long[] ans = new long[queries.length];
                    for (int i = 0; i < queries.length; i++) ans[i] = nCr(queries[i][0], queries[i][1]);
                    return ans;
                }

                public static void main(String[] args) {
                    long[] res = new Solution().solve(new int[][]{{5, 2}, {10, 3}, {4, 7}});
                    System.out.println(Arrays.toString(res));   // [10, 120, 0]
                }
            }`,
          dry: {
            head: ['i', 'fact[i]', 'invFact[i]', 'note'],
            rows: [
              ['0', '1', '1', '0! = 1'],
              ['1', '1', '1', ''],
              ['2', '2', '500000004', '2 × 500000004 ≡ 1'],
              ['3', '6', '166666668', '6 × 166666668 ≡ 1'],
              ['4', '24', '41666667', ''],
              ['5', '120', '808333339', 'computed first by Fermat, then the column fills upward'],
              ['query (5,2)', '120', '× 500000004 × 166666668', H.c('g', '120 → 60 → 10')]
            ]
          },
          complexity: `<p><b>Time O(N + log p + Q)</b>: one pass up, one exponentiation, one pass down, then O(1) per query. <b>Space O(N)</b> for the two arrays (2 × 10<sup>6</sup> longs ≈ 16 MB).</p>`,
          followUps: ['What if the modulus is 10<sup>9</sup> (not prime)? → Pascal table or prime-power decomposition', 'What if n ≤ 10<sup>18</sup> but p ≤ 10<sup>5</sup>? → Lucas\' theorem', 'Count paths in a grid with a few blocked cells → inclusion–exclusion over blocked cells sorted by position']
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 8 — Pigeonhole Principle
  // =====================================================================
  topics.push({
    title: 'The Pigeonhole Principle (proofs that something MUST exist)',
    analogy: `<p>Your sock drawer has only <b>black</b> and <b>white</b> socks and the light is off. How many socks must you grab to be <b>sure</b> of a matching pair? <b>Three.</b> The first two might be one black and one white, but the third has to match one of them — there are only 2 colours ("boxes") and now 3 socks ("pigeons"). You do not know <i>which</i> colour repeats, only that a repeat is guaranteed.</p>`,
    explain: `<p><b>The principle:</b> if you put <b>n + 1</b> pigeons into <b>n</b> boxes, at least one box gets <b>two or more</b> pigeons. Obvious — yet it is one of the most useful proof tools in algorithms, because it turns "search for something" into "it is <i>guaranteed</i> to exist, just find the collision".</p>
      <p><b>General version:</b> N pigeons in k boxes → some box holds at least <b>⌈N / k⌉</b> (N divided by k, rounded up). 13 people, 12 birth months → ⌈13/12⌉ = 2 share a month. 100 people, 12 months → ⌈100/12⌉ = 9 share a month.</p>
      ${H.table(['situation', 'pigeons', 'boxes', 'guarantee'], [
        ['socks, 2 colours', '3 socks', '2 colours', 'a matching pair'],
        ['array of n + 1 values from 1..n', 'n + 1 values', 'n possible values', H.c('g', 'some value repeats')],
        ['string longer than 26 (lowercase)', '27+ letters', '26 letters', 'a repeated letter'],
        ['more than 1440 clock times "HH:MM"', '1441+ times', '1440 minutes/day', 'two equal times → min difference 0'],
        ['prefix sums P₀..Pₙ mod n', 'n + 1 prefixes', 'n remainders', H.c('g', 'a subarray with sum divisible by n')]
      ])}
      <p><b>The star application — prefix sums + modulo:</b> take any n integers. There are n + 1 prefix sums P₀ = 0, P₁, …, Pₙ but only n possible remainders mod n. So two of them, P<sub>i</sub> and P<sub>j</sub> (i &lt; j), have the same remainder → P<sub>j</sub> − P<sub>i</sub> = a[i] + … + a[j − 1] is divisible by n. A subarray with sum divisible by n <b>always exists</b>, and we find it in O(n) by remembering the first index of each remainder.</p>
      ${H.arr([3, 1, 4, 1, 5], { label: 'a (n = 5)' })}
      ${H.table(['prefix', 'P', 'P mod 5'], [['P₀', '0', H.c('y', '0')], ['P₁', '3', '3'], ['P₂', '4', '4'], ['P₃', '8', H.c('r', '3 (seen at P₁!)')]])}
      <p>P₃ − P₁ = 8 − 3 = 5 → subarray a[1..2] = 1 + 4 = ${H.c('g', '5')} ✓ divisible by 5.</p>
      <p><b>How it shows up in interviews:</b> (1) as a <b>guarantee</b> that makes an algorithm terminate or a "return −1" case impossible; (2) as a <b>shortcut</b>: "if input size &gt; number of possible values, answer immediately"; (3) as the reason <b>cycles</b> must exist when you repeatedly apply a function on a finite set (linked-list cycles, happy numbers, Find the Duplicate Number).</p>`,
    clues: [
      '"<b>Prove</b> that there always exists …" / "it is <b>guaranteed</b> that an answer exists" → count pigeons vs boxes.',
      '"n + 1 integers, each in the range [1, n]" → a duplicate must exist (Find the Duplicate Number).',
      '"Subarray / subset whose sum is <b>divisible by n</b>" → n + 1 prefix sums, n remainders → collision.',
      'Input bigger than the number of possible distinct values (e.g. &gt; 1440 times, &gt; 26 letters, &gt; 2<sup>k</sup> masks) → answer is immediate.',
      '"Repeatedly apply f(x) on a finite set — does it loop?" (happy number, linked list, PRNG) → a repeat is guaranteed, detect it with a set or Floyd.',
      '"Minimum number to pick to be <b>sure</b> of …" (socks, cards of the same suit) → (boxes × (wanted − 1)) + 1.'
    ],
    code: `
      // Returns {l, r} (0-based, inclusive) of a non-empty subarray whose sum is divisible by n = a.length.
      // Pigeonhole guarantees it exists: n + 1 prefix sums but only n remainders.
      int[] divisibleSubarray(int[] a) {
          int n = a.length;
          int[] firstSeen = new int[n];            // firstSeen[rem] = prefix index where remainder rem first appeared
          Arrays.fill(firstSeen, -1);
          firstSeen[0] = 0;                        // P0 = 0 (the empty prefix) has remainder 0
          long prefix = 0;
          for (int j = 1; j <= n; j++) {
              prefix = (prefix + a[j - 1]) % n;    // P_j mod n (a[] holds non-negative values here)
              int rem = (int) prefix;
              if (firstSeen[rem] != -1) {          // second pigeon in this box!
                  return new int[]{firstSeen[rem], j - 1};   // a[firstSeen .. j-1] sums to a multiple of n
              }
              firstSeen[rem] = j;
          }
          throw new IllegalStateException("impossible by the pigeonhole principle");
      }`,
    codeTitle: 'Guaranteed subarray with sum divisible by n',
    viz: [
      {
        title: 'Prefix sums dropped into n remainder boxes',
        input: '3 1 4 1 5',
        inputLabel: 'array of non-negative integers (2 to 12 values)',
        gen: function (input) {
          var a = nums(input, 2, 12, 'Enter 2 to 12 non-negative whole numbers, e.g. "3 1 4 1 5"');
          if (a.some(function (x) { return x < 0 || x > 1000; })) throw new Error('Use whole numbers between 0 and 1000');
          var n = a.length, boxes = [], frames = [], i;
          for (i = 0; i < n; i++) boxes.push([]);
          function entries() { return boxes.map(function (b, k) { return ['rem ' + k, b.length ? b.join(', ') : '—']; }); }
          boxes[0].push('P0');
          frames.push({ narr: 'n = ' + n + ' numbers → there are ' + n + ' boxes (remainders 0..' + (n - 1) + ') but ' + (n + 1) + ' prefix sums P0..P' + n + '. Pigeonhole says two prefixes MUST share a box. P0 = 0 goes in box 0.', parts: [
            { type: 'array', label: 'a', values: a.slice() },
            { type: 'map', label: 'boxes: remainder → prefixes', entries: entries(), hl: { 'rem 0': 'ok' } },
            { type: 'vars', vals: { pigeons: n + 1, boxes: n } }
          ] });
          var P = 0;
          for (var j = 1; j <= n; j++) {
            P += a[j - 1];
            var rem = P % n, hlA = {}, k2;
            hlA[j - 1] = 'cur';
            if (boxes[rem].length) {
              var first = boxes[rem][0], fi = Number(first.slice(1));
              boxes[rem].push('P' + j);
              var hm = {}; hm['rem ' + rem] = 'bad';
              var sum = 0; for (k2 = fi; k2 < j; k2++) { sum += a[k2]; hlA[k2] = 'sel'; }
              frames.push({ narr: 'P' + j + ' = ' + P + ', ' + P + ' mod ' + n + ' = <b>' + rem + '</b> — box ' + rem + ' already holds ' + first + '! <span class="c-r">Collision.</span>', parts: [
                { type: 'array', label: 'a', values: a.slice(), hl: one(j - 1, 'cur'), ptr: one(j - 1, 'j') },
                { type: 'map', label: 'boxes: remainder → prefixes', entries: entries(), hl: hm },
                { type: 'vars', vals: { j: j, P: P, 'P mod n': rem }, hl: { 'P mod n': 'bad' } }
              ] });
              frames.push({ narr: 'Same remainder means P' + j + ' − ' + first + ' is a multiple of ' + n + '. That difference is the subarray a[' + fi + '..' + (j - 1) + '] with sum <b>' + sum + '</b> = ' + n + ' × ' + (sum / n) + ' ✓.', parts: [
                { type: 'array', label: 'a', values: a.slice(), hl: hlA, range: [fi, j - 1] },
                { type: 'vars', vals: { l: fi, r: j - 1, 'subarray sum': sum, 'sum % n': sum % n }, hl: { 'subarray sum': 'sel' } }
              ] });
              frames.push({ narr: 'This search can never fail: even if the first ' + n + ' prefixes all landed in different boxes, P' + n + ' would have nowhere new to go. Time O(n), memory O(n).', parts: [
                { type: 'map', label: 'boxes: remainder → prefixes', entries: entries(), hl: hm },
                { type: 'text', html: '<b>Pigeonhole:</b> ' + (n + 1) + ' prefix sums, ' + n + ' remainders → at least one shared box.' }
              ] });
              return frames;
            }
            boxes[rem].push('P' + j);
            var hm2 = {}; hm2['rem ' + rem] = 'ok';
            frames.push({ narr: 'P' + j + ' = ' + P + ' (added a[' + (j - 1) + '] = ' + a[j - 1] + '). ' + P + ' mod ' + n + ' = ' + rem + '. Box ' + rem + ' was empty → put P' + j + ' there.', parts: [
              { type: 'array', label: 'a', values: a.slice(), hl: hlA, ptr: one(j - 1, 'j') },
              { type: 'map', label: 'boxes: remainder → prefixes', entries: entries(), hl: hm2 },
              { type: 'vars', vals: { j: j, P: P, 'P mod n': rem } }
            ] });
          }
          return frames;
        }
      },
      {
        title: 'Worst case spreading: N pigeons into k boxes',
        input: '13 5',
        inputLabel: 'N k (1 ≤ N ≤ 40, 1 ≤ k ≤ 12)',
        gen: function (input) {
          var v = nums(input, 2, 2, 'Enter "N k", e.g. "13 5"');
          var N = v[0], k = v[1];
          if (N < 1 || N > 40 || k < 1 || k > 12) throw new Error('Enter "N k" with 1 ≤ N ≤ 40 and 1 ≤ k ≤ 12');
          var counts = [], frames = [], i, labels = [];
          for (i = 0; i < k; i++) { counts.push(0); labels.push('box ' + i); }
          frames.push({ narr: 'An adversary wants to keep every box as empty as possible, so it spreads ' + N + ' pigeons <b>evenly</b> (round-robin) over ' + k + ' boxes. Even this best spreading cannot avoid a box with ⌈' + N + '/' + k + '⌉ = ' + Math.ceil(N / k) + ' pigeons.', parts: [
            { type: 'bars', label: 'pigeons per box', values: counts.slice(), idxLabels: labels },
            { type: 'vars', vals: { N: N, k: k, 'promised max ≥': Math.ceil(N / k) } }
          ] });
          for (i = 0; i < N; i++) {
            var b = i % k;
            counts[b]++;
            var hl = {}; hl[b] = 'cur';
            var full = i + 1 === k;
            var narr = 'Pigeon ' + (i + 1) + ' → box ' + b + ' (now ' + counts[b] + ').';
            if (full) narr += ' Every box has exactly one pigeon — no sharing yet, but there is no free box left.';
            if (i === k) { narr += ' <span class="c-r">The (k + 1)-th pigeon is forced into an occupied box</span> — that is the basic pigeonhole principle.'; hl[b] = 'bad'; }
            if (N <= 16 || i === k - 1 || i === k || i === N - 1 || (i + 1) % k === 0) {
              frames.push({ narr: narr, parts: [
                { type: 'bars', label: 'pigeons per box', values: counts.slice(), hl: hl, idxLabels: labels },
                { type: 'vars', vals: { placed: i + 1, 'max in a box': Math.max.apply(null, counts) } }
              ] });
            }
          }
          var mx = Math.max.apply(null, counts), hf = {};
          for (i = 0; i < k; i++) if (counts[i] === mx) hf[i] = 'sel';
          frames.push({ narr: 'Final: the fullest box has <b>' + mx + '</b> = ⌈' + N + ' / ' + k + '⌉. Any other placement only makes some box fuller. Proof: if every box had ≤ ' + (mx - 1) + ', the total would be ≤ ' + k + ' × ' + (mx - 1) + ' = ' + (k * (mx - 1)) + ' &lt; ' + N + '.', parts: [
            { type: 'bars', label: 'pigeons per box', values: counts.slice(), hl: hf, idxLabels: labels },
            { type: 'vars', vals: { 'max in a box': mx, '⌈N/k⌉': Math.ceil(N / k) }, hl: { 'max in a box': 'sel' } }
          ] });
          return padFrames(frames, 'With one box everything shares it: ⌈N/1⌉ = N.', [{ type: 'vars', vals: { 'max in a box': mx } }]);
        }
      }
    ],
    examples: [
      {
        title: 'Cards: how many to draw to be sure of 3 of the same suit?',
        html: `<p>4 suits are the boxes. The unluckiest draw puts 2 cards in every suit: 4 × 2 = 8 cards and still no triple. The 9th card must make a triple. Formula: boxes × (wanted − 1) + 1 = 4 × 2 + 1 = ${H.c('g', '9')}. Interviewers use this "worst case first" reasoning in puzzle rounds.</p>`
      },
      {
        title: 'Minimum Time Difference: the 1441-times shortcut',
        html: `<p>LeetCode 539 gives a list of "HH:MM" times. There are only 24 × 60 = <b>1440</b> different minutes in a day. If the list has more than 1440 entries, two must be equal → answer ${H.c('g', '0')} immediately, without sorting. Otherwise use a boolean[1440] bucket array (O(1440)) instead of sorting strings.</p>`,
        code: `
          int findMinDifference(List<String> timePoints) {
              if (timePoints.size() > 1440) return 0;            // pigeonhole: a duplicate minute exists
              boolean[] seen = new boolean[1440];
              for (String t : timePoints) {
                  int m = Integer.parseInt(t.substring(0, 2)) * 60 + Integer.parseInt(t.substring(3));
                  if (seen[m]) return 0;                          // exact duplicate
                  seen[m] = true;
              }
              int first = -1, prev = -1, best = Integer.MAX_VALUE;
              for (int m = 0; m < 1440; m++) {
                  if (!seen[m]) continue;
                  if (first == -1) first = m; else best = Math.min(best, m - prev);
                  prev = m;
              }
              return Math.min(best, 1440 - prev + first);         // wrap around midnight
          }`
      },
      {
        title: 'Find the Duplicate Number (n + 1 values in 1..n)',
        html: `<p>Array [1, 3, 4, 2, 2] has 5 values in the range 1..4 → a duplicate is guaranteed. Read it as a linked list: index i points to a[i]. Because every "next pointer" stays inside a finite set of 5 nodes, walking it must eventually <b>revisit</b> a node — a cycle (pigeonhole again!). The cycle's entry is the duplicate, found with Floyd's tortoise and hare in O(n) time and O(1) memory (DSA 12).</p>
          ${H.arr([1, 3, 4, 2, 2], { label: 'a', hl: { 3: 'r', 4: 'r' } })}
          <p>Walk from index 0: 0 → 1 → 3 → 2 → 4 → 2 → 4 … the loop is entered at value ${H.c('r', '2')}.</p>`
      },
      {
        title: 'Longest substring without repeats is at most 26 long',
        html: `<p>For a lowercase string, any window of 27 characters must repeat a letter. So the answer to "longest substring without repeating characters" is ≤ 26, a fixed-size array <code>int[26]</code> is enough for the window state, and some solutions can cap their search length. The same argument says: in any 5 integers, two have the same remainder mod 4.</p>`
      }
    ],
    deepDive: `<p><b>Proof of the general form (by contradiction).</b> Suppose every one of the k boxes had at most ⌈N/k⌉ − 1 pigeons. Then the total is at most k(⌈N/k⌉ − 1) &lt; k × (N/k) = N — fewer than the N pigeons we placed. Contradiction. Notice the proof is <b>non-constructive</b>: it promises a crowded box without saying which one. Algorithms supply the "which one" with a hash map / remainder array (first-seen index) in O(n).</p>
      <p><b>Finite state ⇒ eventual cycle.</b> Any deterministic process x → f(x) on a finite set of S states must repeat a state within S + 1 steps. This explains: linked lists that never end must cycle; the "happy number" iteration must loop (all big numbers shrink below 243, then pigeonhole); pseudo-random generators have a finite <i>period</i>; and Floyd's cycle detection always terminates. The <b>functional graph</b> view (every node has exactly one outgoing edge) is the expert way to see these problems.</p>
      <p><b>Erdős–Szekeres theorem.</b> Every sequence of n² + 1 distinct numbers has an increasing or a decreasing subsequence of length n + 1. Proof: label each element with (length of longest increasing run ending there, longest decreasing run ending there); if both were ≤ n there are only n² labels for n² + 1 elements, but two elements can never share a label. A beautiful bridge to LIS (DSA 18).</p>
      <p><b>Collisions in computing.</b> Hash tables with more keys than buckets <i>must</i> collide (that is why chaining/probing exist). No lossless compressor can shrink <b>every</b> file: there are 2<sup>n</sup> files of n bits but fewer than 2<sup>n</sup> shorter files. The <b>birthday paradox</b> is the probabilistic cousin: collisions become likely after only about √(πm/2) random items in m boxes — 23 people for 365 days (&gt; 50%), and roughly 2<sup>32</sup> items for a 64-bit hash. That is why 32-bit hashes are unsafe as unique IDs and why rolling-hash solutions use 64-bit or double hashing.</p>
      <p><b>Mod-n subset variant.</b> Among any n integers, some non-empty <i>subset</i> (even a contiguous one) has sum divisible by n — our prefix argument. With 2n − 1 integers you can even pick exactly n of them summing to a multiple of n (Erdős–Ginzburg–Ziv) — a classic "expert" curiosity.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI is great at writing the collision-finding code (prefix remainders, Floyd), but the pigeonhole insight is about <b>proving existence</b> and spotting shortcuts — exactly the reasoning interviewers use to separate pattern-matchers from problem-solvers.</p>
      <p><b>Use AI as a partner:</b> ask <code>"Why is a solution guaranteed to exist in this problem? Answer in terms of pigeons and boxes"</code> — then check whether its pigeons/boxes count is actually right. Ask it to generate adversarial inputs that spread values as evenly as possible to test your early-exit logic.</p>
      <p><b>Where AI goes wrong:</b> it confuses the pigeonhole principle (a certainty) with the birthday paradox (a probability), forgets the empty prefix P₀ (so it counts only n pigeons and the guarantee disappears), mishandles negative numbers in the remainder (Java's <code>%</code>), or adds an unnecessary "return −1" branch that hides a bug.</p>
      <p><b>What you must still own:</b> counting pigeons and boxes correctly from the problem statement, explaining the guarantee in one sentence, and turning it into an O(n) first-seen array.</p>`,
    problems: [
      {
        title: 'Subarray Divisible by N (always exists)',
        level: 'Medium',
        tags: ['pigeonhole', 'prefix sum', 'modulo'],
        companies: ['Codechef', 'Google'],
        statement: `<p>Given an array <code>A</code> of N positive integers, return the 0-based indices <code>[l, r]</code> of <b>any</b> non-empty contiguous subarray whose sum is divisible by N. (One always exists — explain why.)</p>`,
        constraints: `1 ≤ N ≤ 10<sup>5</sup>, 1 ≤ A[i] ≤ 10<sup>9</sup>`,
        example: `${H.arr([3, 1, 4, 1, 5], { label: 'A (N = 5)', hl: { 1: 'g', 2: 'g' } })}
          <p>Output <b>[1, 2]</b>: ${H.c('g', '1 + 4 = 5')}, divisible by 5. Prefix sums 0, 3, 4, 8 → remainders 0, 3, 4, ${H.c('r', '3')} — the repeated remainder 3 (after A[0] and after A[2]) marks the subarray between them, A[1..2]. If several subarrays work, any one is accepted.</p>`,
        brute: {
          why: `<p>Try every (l, r) and keep a running sum: N(N+1)/2 ≈ 5 × 10<sup>9</sup> subarrays for N = 10<sup>5</sup> → TLE. The waste: we never use the fact that only the <b>remainder</b> of a prefix matters, and there are only N remainders.</p>`,
          code: `
            int[] bruteDivisible(int[] a) {
                int n = a.length;
                for (int l = 0; l < n; l++) {
                    long sum = 0;
                    for (int r = l; r < n; r++) {
                        sum += a[r];
                        if (sum % n == 0) return new int[]{l, r};   // found one
                    }
                }
                return new int[]{-1, -1};                           // never happens (pigeonhole)
            }`
        },
        mcq: {
          q: `For N = 6 numbers, how many prefix sums (including the empty prefix) are there, and how many possible remainders mod 6?`,
          options: [`6 prefixes, 6 remainders — no guarantee`, `7 prefixes, 6 remainders — a repeat is guaranteed`, `7 prefixes, 7 remainders`, `6 prefixes, 5 remainders`],
          answer: 1,
          explain: `P₀ = 0 plus P₁..P₆ gives 7 pigeons; remainders 0..5 give 6 boxes. Two prefixes share a remainder, and their difference is a subarray sum divisible by 6. Forgetting P₀ breaks the argument.`
        },
        hints: [
          `<p><b>Aha:</b> sum(a[i..j−1]) = P<sub>j</sub> − P<sub>i</sub>. It is divisible by N exactly when P<sub>i</sub> and P<sub>j</sub> have the <b>same remainder</b> mod N.</p>`,
          `<p>An <code>int[N]</code> "first index where this remainder appeared", initialised to −1, with remainder 0 pre-set to index 0 (the empty prefix). Scan once.</p>`,
          `<p>Traps: include P₀; keep the running sum reduced mod N (or use long); the subarray is from <code>firstSeen[rem]</code> to <code>j − 1</code> in 0-based array indices; N = 1 → [0, 0] (everything is divisible by 1).<br>Recipe: first[0] = 0; P = 0; for j = 1..N: P = (P + A[j−1]) % N; if first[P] ≠ −1 return [first[P], j−1]; first[P] = j.</p>`
        ],
        solution: {
          approach: `<p>Pigeonhole on prefix remainders: N + 1 prefixes, N remainders → the first repeat gives the answer in one pass.</p>`,
          code: `
            class Solution {
                public int[] divisibleSubarray(int[] a) {
                    int n = a.length;
                    int[] firstSeen = new int[n];         // remainder -> earliest prefix index
                    Arrays.fill(firstSeen, -1);
                    firstSeen[0] = 0;                     // empty prefix P0 = 0
                    long p = 0;
                    for (int j = 1; j <= n; j++) {
                        p = (p + a[j - 1]) % n;           // remainder of P_j
                        int rem = (int) p;
                        if (firstSeen[rem] != -1) {
                            return new int[]{firstSeen[rem], j - 1};  // P_j - P_first is a multiple of n
                        }
                        firstSeen[rem] = j;
                    }
                    return new int[]{-1, -1};             // unreachable: pigeonhole guarantees a repeat
                }

                public static void main(String[] args) {
                    int[] res = new Solution().divisibleSubarray(new int[]{3, 1, 4, 1, 5});
                    System.out.println(res[0] + " " + res[1]);   // 1 2
                }
            }`,
          dry: {
            head: ['j', 'A[j−1]', 'P mod 5', 'firstSeen[rem]', 'action'],
            rows: [
              ['0', '—', '0', '—', 'firstSeen[0] = 0'],
              ['1', '3', '3', '−1', 'firstSeen[3] = 1'],
              ['2', '1', '4', '−1', 'firstSeen[4] = 2'],
              ['3', '4', '3', H.c('r', '1'), H.c('g', 'return [1, 2] (1 + 4 = 5)')]
            ]
          },
          complexity: `<p><b>Time O(N)</b>: one pass with O(1) work per element. <b>Space O(N)</b> for the remainder array (no hashing needed because remainders are 0..N−1).</p>`,
          followUps: ['Count ALL subarrays with sum divisible by K (LeetCode 974) → count pairs of equal remainders', 'What changes with negative numbers? → normalise with ((p % n) + n) % n', 'Subset (not subarray) of size exactly N from 2N − 1 numbers → Erdős–Ginzburg–Ziv (research-level)']
        }
      }
    ]
  });

  registerModule({
    id: 'dsa03',
    title: 'Number Theory & Modular Arithmetic',
    intro: `<p>This module is the <b>math toolbox</b> every coding interview quietly assumes you own. You will find all <b>factors</b> of a number in √N steps, test and mass-produce <b>primes</b> (trial division and the Sieve of Eratosthenes), compute <b>GCD &amp; LCM</b> with Euclid's 2,300-year-old trick (and <i>see</i> why it works by cutting squares out of a rectangle), keep giant answers small with the <b>modulo rules</b>, raise numbers to huge powers in about 60 steps with <b>fast exponentiation</b>, count choices with <b>nCr and Pascal's Triangle</b>, and prove that answers <i>must</i> exist with the <b>Pigeonhole Principle</b>.</p>
      <p>Every topic starts with an everyday analogy, then small-number tables and step-by-step animations, worked examples, an expert deep dive and a section on working alongside AI. Watch for the <b>Clues in the Question</b>: phrases like "modulo 10<sup>9</sup>+7", "number of ways", "N ≤ 10<sup>12</sup>", "guaranteed to exist" tell you which tool to grab. These tools come back again and again later: hashing (DSA 8 and 9), DP counting (DSA 17 and 18), and the Expert math module (DSA 25).</p>`,
    goals: [
      'List, count and sum the divisors of any N ≤ 10<sup>12</sup> in O(√N), and prime-factorize it',
      'Pick between trial division, the Sieve of Eratosthenes (plus SPF and segmented variants) and Miller–Rabin by reading the constraints',
      'Compute GCD/LCM with Euclid in O(log N), prove why it works, and avoid LCM overflow by dividing first',
      'Apply (a+b)%m, (a−b+m)%m and (a·b)%m safely in Java, explain why division needs a modular inverse, and never compare modded values',
      'Write binary exponentiation from scratch and use Fermat\'s little theorem to get modular inverses and nCr mod p in O(1) per query',
      'Use the Pigeonhole Principle to prove existence and to find guaranteed collisions (divisible subarrays, duplicates, cycles) in O(N)'
    ],
    prereqs: `DSA 1 (Programming Foundations for DSA) and DSA 2 (Math Foundations &amp; Time/Space Complexity): loops, <code>int</code> vs <code>long</code> ranges, Big-O and the 10<sup>8</sup> operations-per-second rule. Prefix sums (DSA 5) help for a few problems but are explained where used.`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
