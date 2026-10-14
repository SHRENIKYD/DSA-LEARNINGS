(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // ---------- small shared helpers for the visualizers ----------
  function nums(input, minC, maxC, fmt) {
    var t = String(input === undefined || input === null ? '' : input).trim();
    var a = t ? t.split(/[\s,]+/).map(Number) : [];
    if (a.length < minC || a.length > maxC || a.some(function (x) { return !isFinite(x) || Math.floor(x) !== x; })) throw new Error(fmt);
    return a;
  }
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function cp(rows) { return rows.map(function (r) { return r.slice(); }); }
  function gcdJ(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
  function isPrimeJ(n) { if (n < 2) return false; for (var d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; }
  // modular multiply that stays exact in JS doubles for m up to ~1e9 (splits b into 16-bit halves)
  function mulModJ(a, b, m) {
    a %= m; b %= m;
    var hi = Math.floor(b / 65536), lo = b % 65536;
    return ((a * hi % m) * 65536 % m + a * lo % m) % m;
  }
  function powModJ(b, e, m) { var r = 1 % m; b %= m; while (e > 0) { if (e % 2 === 1) r = mulModJ(r, b, m); b = mulModJ(b, b, m); e = Math.floor(e / 2); } return r; }

  // =====================================================================
  // TOPIC 1 — Extended Euclid & Bezout (ax + by = gcd)
  // =====================================================================
  topics.push({
    title: 'Extended Euclid: Solving a·x + b·y = gcd(a, b)',
    analogy: `<p>You have only a <b>5-litre jug</b> and a <b>3-litre jug</b> and a tap. Can you measure exactly <b>1 litre</b>? Yes: fill the 3-litre jug twice and pour it into the 5-litre jug — the second time only 2 litres fit, so exactly <b>1 litre</b> is left in the small jug. In numbers: <code>2 × 3 − 1 × 5 = 1</code>.</p>
      <p>Plain Euclid only tells you <i>"yes, 1 litre is possible because gcd(5, 3) = 1"</i>. <b>Extended Euclid</b> also hands you the <b>recipe</b>: "pour the 3-litre jug in 2 times, empty the 5-litre jug 1 time". Those recipe numbers are the <code>x</code> and <code>y</code>.</p>`,
    explain: `<p><b>Quick recap.</b> The Euclidean algorithm finds <code>gcd(a, b)</code> by repeating <code>(a, b) → (b, a mod b)</code> until <code>b = 0</code>. Then <code>a</code> is the gcd. (DSA 3 covered this.)</p>
      <p><b>Bezout's identity</b> (a fact, not a trick): for any integers a and b there are integers <code>x</code> and <code>y</code> (one of them usually negative) with</p>
      <p style="text-align:center"><b>a·x + b·y = gcd(a, b)</b></p>
      <p><b>Extended Euclid</b> finds such x and y using the very same steps as plain Euclid, plus a little bookkeeping on the way back.</p>
      <h4>The one formula to remember</h4>
      <p>Suppose the recursive call already solved the smaller pair: <code>b·x₁ + (a mod b)·y₁ = g</code>. Since <code>a mod b = a − ⌊a/b⌋·b</code>, substitute and regroup:</p>
      <p style="text-align:center"><code>b·x₁ + (a − ⌊a/b⌋·b)·y₁ = a·<b>y₁</b> + b·<b>(x₁ − ⌊a/b⌋·y₁)</b></code></p>
      <p>So for the bigger pair: ${H.c('g', '<b>x = y₁</b>')} and ${H.c('b', '<b>y = x₁ − ⌊a/b⌋·y₁</b>')}. The base case is <code>b = 0</code>: <code>a·1 + 0·0 = a</code>, so <code>(x, y) = (1, 0)</code>.</p>
      <h4>Worked example: a = 240, b = 46</h4>
      ${H.table(['a', 'b', 'q = ⌊a/b⌋', 'a mod b', 'x', 'y', 'check a·x + b·y'], [
        ['240', '46', '5', '10', H.c('g', '−9'), H.c('b', '47'), '−2160 + 2162 = 2'],
        ['46', '10', '4', '6', '2', '−9', '92 − 90 = 2'],
        ['10', '6', '1', '4', '−1', '2', '−10 + 12 = 2'],
        ['6', '4', '1', '2', '1', '−1', '6 − 4 = 2'],
        ['4', '2', '2', '0', '0', '1', '0 + 2 = 2'],
        ['2', '0', '—', '—', H.c('p', '1'), H.c('p', '0'), 'base case: 2·1 = 2']
      ])}
      <p>Read the table <b>top-down</b> for the divisions (plain Euclid) and <b>bottom-up</b> for x and y. Every row satisfies its own check — that is the invariant that makes the method obviously correct.</p>
      <h4>From gcd to any right-hand side: a·x + b·y = c</h4>
      <ul>
        <li>It has integer solutions <b>only if g = gcd(a, b) divides c</b>. (Left side is always a multiple of g.)</li>
        <li>If it does, scale: <code>x₀ = x·(c/g)</code>, <code>y₀ = y·(c/g)</code>.</li>
        <li>All solutions: <code>x = x₀ + k·(b/g)</code>, <code>y = y₀ − k·(a/g)</code> for any integer k. Moving along k keeps the sum equal because <code>a·(b/g) − b·(a/g) = 0</code>.</li>
      </ul>
      <p><b>Speed:</b> same as Euclid, <b>O(log min(a, b))</b> steps — at most about 90 steps even for 64-bit numbers.</p>`,
    clues: [
      '"Find integers <b>x and y</b> such that a·x + b·y = c" or "does an integer solution exist?" → gcd must divide c; Extended Euclid gives one solution.',
      '"<b>Measure exactly</b> T litres with jugs of size a and b" / "reach position c using jumps of +a and −b" → Bezout: possible iff gcd(a, b) | c.',
      '"<b>Modular inverse</b>" where the modulus is <b>not prime</b> (e.g. 10<sup>6</sup>, 2<sup>32</sup>, any m) → Fermat fails, Extended Euclid works.',
      '"Combine two congruences" / "Chinese Remainder" with non-coprime moduli → the merge step is an Extended Euclid call.',
      '"Smallest non-negative x" or "count solutions with x, y in a range" → general solution x₀ + k·(b/g), then shift k.',
      'Values up to 10<sup>18</sup> and you need an inverse in O(log) → Extended Euclid (careful with overflow when scaling by c/g).'
    ],
    code: [`// Recursive Extended Euclid: returns {g, x, y} with a*x + b*y = g = gcd(a, b)
static long[] extGcd(long a, long b) {
    if (b == 0) return new long[]{a, 1, 0};        // a*1 + 0*0 = a
    long[] r = extGcd(b, a % b);                   // solves b*x1 + (a % b)*y1 = g
    long g = r[0], x1 = r[1], y1 = r[2];
    // substitute a % b = a - (a / b) * b and regroup by a and b
    return new long[]{g, y1, x1 - (a / b) * y1};
}

// Iterative version (no recursion, same answer). Keeps the invariant
//   oldR = a*oldS + b*oldT   and   r = a*s + b*t   at every step.
static long[] extGcdIter(long a, long b) {
    long oldR = a, r = b;
    long oldS = 1, s = 0;
    long oldT = 0, t = 1;
    while (r != 0) {
        long q = oldR / r;
        long tmp = oldR - q * r; oldR = r; r = tmp;   // plain Euclid step
        tmp = oldS - q * s;      oldS = s; s = tmp;   // same step on the x-coefficients
        tmp = oldT - q * t;      oldT = t; t = tmp;   // same step on the y-coefficients
    }
    return new long[]{oldR, oldS, oldT};
}`, { lang: 'python', run: true, title: 'Python (runnable): check Bezout on a few pairs', code: `def ext_gcd(a, b):
    """Return (g, x, y) with a*x + b*y == g == gcd(a, b)."""
    if b == 0:
        return a, 1, 0
    g, x1, y1 = ext_gcd(b, a % b)
    return g, y1, x1 - (a // b) * y1

for a, b in [(240, 46), (5, 3), (35, 15), (17, 0), (1000000007, 998244353)]:
    g, x, y = ext_gcd(a, b)
    assert a * x + b * y == g
    print(f"{a}*({x}) + {b}*({y}) = {g}")` }],
    codeTitle: ['Extended Euclid in Java (recursive + iterative)', 'Same idea in Python'],
    viz: {
      title: 'Extended Euclid: divide down, then build x and y back up',
      input: '240 46',
      inputLabel: 'a b (two non-negative integers, not both 0, each ≤ 10^9)',
      gen: function (input) {
        var v = nums(input, 2, 2, 'Enter two non-negative integers like "240 46"');
        var a = v[0], b = v[1];
        if (a < 0 || b < 0 || a > 1e9 || b > 1e9 || (a === 0 && b === 0)) throw new Error('Use 0 ≤ a, b ≤ 10^9 and not both zero, e.g. "240 46"');
        var cols = ['a', 'b', 'q = ⌊a/b⌋', 'a mod b', 'x', 'y'];
        var rows = [], frames = [], A = a, B = b;
        frames.push({ narr: 'Goal: find integers <b>x, y</b> with <b>' + a + '·x + ' + b + '·y = gcd(' + a + ', ' + b + ')</b>. Phase 1 is plain Euclid: keep replacing (a, b) by (b, a mod b) and write every step in the table.', parts: [
          { type: 'vars', label: 'start', vals: { a: a, b: b } },
          { type: 'table', label: 'Euclid table', columns: cols, rows: [] }
        ] });
        while (B !== 0) {
          var q = Math.floor(A / B), r = A % B;
          rows.push([A, B, q, r, '?', '?']);
          frames.push({ narr: A + ' = <b>' + q + '</b> × ' + B + ' + <b>' + r + '</b>. Remember q = ' + q + ' — we need it on the way back. Next pair: (' + B + ', ' + r + ').', parts: [
            { type: 'table', label: 'Phase 1: dividing down', columns: cols, rows: cp(rows), hl: one(rows.length - 1, 'cur') },
            { type: 'vars', vals: { a: A, b: B, q: q, 'a mod b': r }, hl: { q: 'cur' } }
          ] });
          A = B; B = r;
        }
        rows.push([A, 0, '—', '—', 1, 0]);
        var x = 1, y = 0;
        frames.push({ narr: 'b reached 0, so <b>gcd = ' + A + '</b>. Base case: ' + A + '·1 + 0·0 = ' + A + ', so (x, y) = (1, 0). Phase 2: climb back up the table.', parts: [
          { type: 'table', label: 'Base case', columns: cols, rows: cp(rows), hl: one(rows.length - 1, 'sel') },
          { type: 'vars', vals: { g: A, x: 1, y: 0 }, hl: { g: 'sel' } }
        ] });
        for (var i = rows.length - 2; i >= 0; i--) {
          var qq = rows[i][2], nx = y, ny = x - qq * y;
          rows[i][4] = nx; rows[i][5] = ny;
          frames.push({ narr: 'Row (' + rows[i][0] + ', ' + rows[i][1] + '): new x = old y = <b>' + nx + '</b>; new y = old x − q·old y = ' + x + ' − ' + qq + '·(' + y + ') = <b>' + ny + '</b>. Check: ' + rows[i][0] + '·(' + nx + ') + ' + rows[i][1] + '·(' + ny + ') = ' + (rows[i][0] * nx + rows[i][1] * ny) + ' ✓', parts: [
            { type: 'table', label: 'Phase 2: building x, y back up', columns: cols, rows: cp(rows), hl: one(i, 'ok') },
            { type: 'vars', vals: { q: qq, 'old x': x, 'old y': y, 'new x': nx, 'new y': ny }, hl: { 'new x': 'ok', 'new y': 'ok' } },
            { type: 'code', label: 'the only line that matters', lang: 'java', code: 'long[] r = extGcd(b, a % b);\nreturn new long[]{g, r[2], r[1] - (a / b) * r[2]};', hl: { 2: 'cur' } }
          ] });
          x = nx; y = ny;
        }
        frames.push({ narr: 'Done: <b>' + a + '·(' + x + ') + ' + b + '·(' + y + ') = ' + (a * x + b * y) + '</b> = gcd. Want a·x + b·y = c instead? Only possible if ' + A + ' divides c; then multiply x and y by c/' + A + '.', parts: [
          { type: 'vars', label: 'answer', vals: { gcd: A, x: x, y: y }, hl: { x: 'sel', y: 'sel' } },
          { type: 'text', html: '<b>All solutions:</b> x = ' + x + ' + k·' + (b / A) + ', y = ' + y + ' − k·' + (a / A) + ' for any integer k.' }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'The 240 / 46 table, read both ways', html: `<p>Going down: 240 = 5·46 + 10, 46 = 4·10 + 6, 10 = 1·6 + 4, 6 = 1·4 + 2, 4 = 2·2 + 0 → gcd = 2. Going up with <code>x = y₁, y = x₁ − q·y₁</code>: (1,0) → (0,1) → (1,−1) → (−1,2) → (2,−9) → <b>(−9, 47)</b>. Check: 240·(−9) + 46·47 = −2160 + 2162 = ${H.c('g', '2')} ✓.</p>`, code: { lang: 'python', run: true, code: `def ext_gcd(a, b):
    if b == 0:
        return a, 1, 0
    g, x1, y1 = ext_gcd(b, a % b)
    return g, y1, x1 - (a // b) * y1

print(ext_gcd(240, 46))   # (2, -9, 47)` } },
      { title: 'Jug puzzle: 5 L and 3 L, measure 4 L', html: `<p>gcd(5, 3) = 1 divides 4, so it is possible. Extended Euclid gives 5·(−1) + 3·2 = 1. Multiply by 4: 5·(−4) + 3·8 = 4. Another solution (k = 2, step b/g = 3 for x, a/g = 5 for y): <b>5·(2) + 3·(−2) = 4</b> → fill the 5 L jug twice, empty the 3 L jug twice. Fewer pours = pick the k that makes |x| + |y| small.</p>` },
      { title: '6x + 9y = 20 (impossible) vs 6x + 9y = 21 (possible)', html: `<p>gcd(6, 9) = 3. ${H.c('r', '3 does not divide 20')} → no integer solution, ever (left side is always a multiple of 3). ${H.c('g', '3 divides 21')}: Extended Euclid gives 6·(−1) + 9·1 = 3, scale by 7 → x₀ = −7, y₀ = 7. General: x = −7 + 3k, y = 7 − 2k. Smallest x ≥ 0 is k = 3 → <b>x = 2, y = 1</b>: 12 + 9 = 21 ✓.</p>` },
      { title: 'Lattice points on a segment (a classic Bezout cousin)', html: `<p>How many integer points lie on the segment from (0,0) to (12, 8)? The direction (12, 8) divided by g = gcd(12, 8) = 4 gives the smallest integer step (3, 2). So there are <b>g + 1 = 5</b> lattice points: (0,0), (3,2), (6,4), (9,6), (12,8). Same idea as the "step b/g" in the general solution.</p>` }
    ],
    deepDive: `<p><b>Why Bezout is true (proof idea).</b> Look at the set S of all positive values of a·x + b·y. Let d be the smallest. Divide a by d: a = q·d + r with 0 ≤ r &lt; d. Then r = a − q·(a·x + b·y) is also of the form a·x' + b·y'; since d was the smallest positive one, r must be 0. So d divides a, similarly b, so d ≤ g. But g divides every a·x + b·y, so g ≤ d. Hence d = g.</p>
      <p><b>Size of the coefficients.</b> The x and y returned by the standard algorithm satisfy |x| ≤ b/g and |y| ≤ a/g (when a, b &gt; 0). That is why they never overflow a long for 64-bit inputs — but <b>x·(c/g)</b> can! When c is large, reduce first: you usually only need <code>x mod (b/g)</code>, so compute <code>(x mod (b/g)) · ((c/g) mod (b/g)) mod (b/g)</code> with a safe multiply (BigInteger, <code>Math.multiplyHigh</code>, or <code>__int128</code> in C++).</p>
      <p><b>Worst case = Fibonacci.</b> Lamé's theorem: the number of division steps is largest when a and b are consecutive Fibonacci numbers, and it is about log<sub>φ</sub>(min(a,b)) ≈ 1.44·log₂. So recursion depth is ≤ ~92 for 64-bit numbers — recursion is safe, but the iterative version is preferred in hot loops and avoids allocating arrays per level.</p>
      <p><b>Negative inputs.</b> In Java/C++, <code>%</code> keeps the sign of the dividend (−7 % 3 = −1). The algorithm still produces a valid Bezout pair, but the "gcd" can come out negative. Normalise with <code>Math.abs</code> and fix signs, and always normalise a final residue with <code>Math.floorMod(x, m)</code> (or <code>((x % m) + m) % m</code>).</p>
      <p><b>More than two numbers.</b> gcd(a, b, c) = gcd(gcd(a, b), c), and the coefficients compose: if a·x + b·y = g₁ and g₁·u + c·v = g, then a·(x·u) + b·(y·u) + c·v = g.</p>
      <p><b>Production reality.</b> RSA key generation computes the private exponent d = e<sup>−1</sup> mod λ(n) with exactly this algorithm (λ is not prime, so Fermat is useless). Cryptographic libraries use <i>constant-time</i> variants (binary/"safegcd" algorithms) so the number of steps does not leak secret bits through timing.</p>`,
    aiEra: `<p><b>What AI changes:</b> any assistant will spit out a correct <code>extGcd</code> in two seconds, so nobody is impressed that you memorised it. The value moved to <i>knowing when it applies</i> (non-prime modulus, Diophantine wording, CRT merge) and to the fiddly glue around it.</p>
      <p><b>Use AI as a partner:</b> ask <code>"Write a brute-force checker that tries all |x|,|y| ≤ 50 for a*x+b*y=c and compare it with my extGcd-based solver on 10,000 random cases"</code>. Property tests like <code>a*x + b*y == g</code> catch sign bugs instantly.</p>
      <p><b>Where AI goes wrong:</b> it often returns the Bezout x without normalising (negative inverse), multiplies x·(c/g) and overflows for c ≈ 10<sup>18</sup>, forgets the "gcd must divide c" check, or mixes up which of x/y gets the <code>− q·y₁</code>. It also tends to recommend Fermat for a composite modulus.</p>
      <p><b>What you must still own:</b> deriving <code>x = y₁, y = x₁ − ⌊a/b⌋·y₁</code> on a whiteboard in one minute, explaining why a solution exists only when g | c, and producing the general solution to hit a requested range.</p>`,
    problems: [{
      title: 'Solve a·x + b·y = c (smallest non-negative x)',
      level: 'Medium', tags: ['extended euclid', 'diophantine', 'math'], companies: ['Google', 'Codeforces-style'],
      statement: `<p>Given positive integers <code>a</code>, <code>b</code> and a non-negative integer <code>c</code>, find integers <code>x</code>, <code>y</code> with <code>a·x + b·y = c</code> such that <code>x</code> is the <b>smallest non-negative</b> value possible (y may be negative). Return <code>[x, y]</code>, or <code>[-1, -1]</code> if no integer solution exists.</p>`,
      constraints: `1 ≤ a, b ≤ 10<sup>9</sup>, 0 ≤ c ≤ 10<sup>9</sup>`,
      example: `<p>a = 6, b = 9, c = 21 → ${H.c('g', '[2, 1]')} because 6·2 + 9·1 = 21 and x = 0 or 1 cannot work (21 and 15 are not multiples of 9).</p><p>a = 6, b = 9, c = 20 → ${H.c('r', '[-1, -1]')} because gcd 3 does not divide 20.</p>`,
      brute: { why: `<p>Try x = 0, 1, 2, … and check whether <code>(c − a·x)</code> is divisible by b. The answer x is always below b/g, but for b = 10<sup>9</sup> that is up to 10<sup>9</sup> tries per query — too slow when there are many queries, and it teaches nothing about <i>why</i> some c are impossible.</p>`, code: `static long[] brute(long a, long b, long c) {
    for (long x = 0; x < b; x++) {                 // x repeats its behaviour every b/g, so b tries suffice
        long rest = c - a * x;
        if (rest % b == 0) return new long[]{x, rest / b};
    }
    return new long[]{-1, -1};
}` },
      mcq: { q: 'You found one solution (x₀, y₀) of 6x + 9y = 21. Which step moves to the next solution while keeping the sum 21?', options: ['x + 3, y − 2', 'x + 9, y − 6 only', 'x + 1, y − 1', 'x + 6, y + 9'], answer: 0, explain: 'Step is b/g = 9/3 = 3 for x and a/g = 6/3 = 2 for y: 6·3 − 9·2 = 0, so the total is unchanged. (x + 9, y − 6) also works but skips solutions.' },
      hints: [`<p>Hint 1: The left side is always a multiple of g = gcd(a, b). So if g does not divide c, return [-1, -1] immediately.</p>`, `<p>Hint 2: Extended Euclid gives a·x + b·y = g. Multiply both by c/g to get one solution (x₀, y₀). All solutions are x₀ + k·(b/g), y₀ − k·(a/g).</p>`, `<p>Hint 3: The smallest non-negative x is <code>floorMod(x₀, b/g)</code>. Then y = (c − a·x) / b exactly. Recipe: g, x, y = extGcd(a, b) → check c % g → step = b/g → x = floorMod(x·(c/g), step) → y = (c − a·x)/b. Use long: |x·(c/g)| ≤ 10<sup>9</sup>·10<sup>9</sup> fits.</p>`],
      solution: {
        approach: `<p>Run Extended Euclid once to get <code>a·x + b·y = g</code>. If <code>c % g ≠ 0</code> there is no solution. Otherwise scale to <code>x₀ = x·(c/g)</code>. All valid x values form the arithmetic sequence x₀ + k·(b/g), so the smallest non-negative one is <code>floorMod(x₀, b/g)</code>. Recover y from the equation.</p>`,
        code: `class Solution {
    static long[] extGcd(long a, long b) {
        if (b == 0) return new long[]{a, 1, 0};
        long[] r = extGcd(b, a % b);
        return new long[]{r[0], r[2], r[1] - (a / b) * r[2]};
    }

    public long[] solve(long a, long b, long c) {
        long[] e = extGcd(a, b);
        long g = e[0], x = e[1];
        if (c % g != 0) return new long[]{-1, -1};      // left side is always a multiple of g
        long step = b / g;                              // x repeats with period b/g
        long x0 = x * (c / g);                          // |x| <= b/g and c/g <= 1e9: fits in long
        long bestX = Math.floorMod(x0, step);           // smallest non-negative member of x0 + k*step
        long y = (c - a * bestX) / b;                   // exact division by construction
        return new long[]{bestX, y};
    }
}`,
        alt: [{ lang: 'python', code: `def solve(a, b, c):
    def ext_gcd(p, q):
        if q == 0:
            return p, 1, 0
        g, x1, y1 = ext_gcd(q, p % q)
        return g, y1, x1 - (p // q) * y1
    g, x, _ = ext_gcd(a, b)
    if c % g:
        return [-1, -1]
    step = b // g
    x = (x * (c // g)) % step        # Python % is already non-negative
    return [x, (c - a * x) // b]

print(solve(6, 9, 21), solve(6, 9, 20))` }],
        dry: { head: ['call', 'q = a/b', 'returns (g, x, y)', 'check'], rows: [
          ['extGcd(3, 0)', '—', '(3, 1, 0)', '3·1 = 3'],
          ['extGcd(6, 3)', '2', '(3, 0, 1 − 2·0 = 1)', '6·0 + 3·1 = 3'],
          ['extGcd(9, 6)', '1', '(3, 1, 0 − 1·1 = −1)', '9 − 6 = 3'],
          ['extGcd(6, 9)', '0', '(3, −1, 1 − 0 = 1)', '−6 + 9 = 3'],
          ['scale ×7, step = 3', '—', 'x₀ = −7 → floorMod(−7, 3) = <b>2</b>', 'y = (21 − 12)/9 = <b>1</b> ✓']
        ] },
        complexity: `<p>Time O(log min(a, b)) for Extended Euclid; space O(log) for the recursion (O(1) with the iterative version).</p>`,
        followUps: ['Also require y ≥ 0 — how many (x, y) pairs with both non-negative exist?', 'What changes if a or b can be negative or zero?', 'c up to 10<sup>18</sup>: where exactly does overflow appear and how do you avoid it?']
      }
    }]
  });

  // =====================================================================
  // TOPIC 2 — Modular inverse (Fermat, Extended Euclid, linear table, inverse factorials)
  // =====================================================================
  topics.push({
    title: 'Modular Inverse: Dividing on a Clock (Fermat + Extended Euclid)',
    analogy: `<p>On a normal number line, "divide by 3" is the <b>undo button</b> for "multiply by 3": you multiply by 1/3. On a <b>7-hour clock</b> there is no 1/3 — only whole hours. But there is still an undo button: multiplying by <b>5</b>. Try it: 3 × 5 = 15 = two full laps + <b>1</b>. So on the 7-clock, "× 5" exactly cancels "× 3".</p>
      <p>That undo number (5) is called the <b>modular inverse</b> of 3 mod 7. Every "divide" inside a <code>mod 10<sup>9</sup>+7</code> problem secretly means "multiply by the undo number".</p>`,
    explain: `<p><b>Definition.</b> The inverse of <code>a</code> modulo <code>m</code> is a number <code>x</code> in [0, m) with <b>a·x ≡ 1 (mod m)</b>. We write it a<sup>−1</sup>. It exists <b>only when gcd(a, m) = 1</b>. (If a and m share a factor d &gt; 1, then a·x is always a multiple of d on the clock and can never land on 1.)</p>
      ${H.table(['a', '1', '2', '3', '4', '5', '6'], [['a<sup>−1</sup> mod 7', '1', '4', H.c('g', '5'), '2', '3', '6'], ['check a·a<sup>−1</sup>', '1', '8 ≡ 1', '15 ≡ 1', '8 ≡ 1', '15 ≡ 1', '36 ≡ 1']])}
      <p>Why do we need it? Addition, subtraction and multiplication are all safe to do "mod m" step by step. <b>Division is not</b>: (10 / 2) mod 7 = 5, but (10 mod 7) / (2 mod 7) = 3/2 is not even an integer. The fix: <code>a / b mod m = a · b<sup>−1</sup> mod m</code>.</p>
      <h4>Method 1 — Fermat's little theorem (modulus is PRIME)</h4>
      <p>If p is prime and p does not divide a, then <b>a<sup>p−1</sup> ≡ 1 (mod p)</b>. Split it: a · a<sup>p−2</sup> ≡ 1, so <b>a<sup>−1</sup> = a<sup>p−2</sup> mod p</b>. Compute it with fast power in O(log p). Example: 3<sup>−1</sup> mod 7 = 3<sup>5</sup> mod 7 = 243 mod 7 = ${H.c('g', '5')}.</p>
      <h4>Method 2 — Extended Euclid (ANY modulus, as long as gcd = 1)</h4>
      <p>Solve a·x + m·y = 1 (Topic 1). Look at it mod m: the m·y part disappears, leaving a·x ≡ 1. So x (made non-negative with floorMod) is the inverse. Works for m = 10<sup>6</sup>, 2<sup>32</sup>, anything.</p>
      <h4>Method 3 — Many inverses at once</h4>
      <ul>
        <li><b>Linear table</b> for all i in 1..n (p prime, n &lt; p): <code>inv[1] = 1</code>, <code>inv[i] = (p − p/i) · inv[p % i] % p</code>. O(n) total.</li>
        <li><b>Inverse factorials</b> (the workhorse for nCr): compute <code>fact[n]</code>, then <code>invFact[n] = fact[n]<sup>p−2</sup></code> once, then walk down: <code>invFact[i−1] = invFact[i] · i</code>. One exponentiation for the whole table.</li>
      </ul>
      ${H.table(['method', 'needs', 'cost', 'use when'], [
        ['Fermat a<sup>p−2</sup>', 'p prime', 'O(log p)', 'mod 10<sup>9</sup>+7, 998244353'],
        ['Extended Euclid', 'gcd(a, m) = 1', 'O(log m)', 'composite m, or you also need gcd'],
        ['Linear table', 'p prime', 'O(n) for all 1..n', 'need every inverse up to n'],
        ['invFact trick', 'p prime, n &lt; p', 'O(n) + one power', 'many nCr queries']
      ])}`,
    clues: [
      '"Print the answer <b>modulo 10<sup>9</sup>+7</b>" and your formula has a <b>division</b> (n!/(k!(n−k)!), average, probability P/Q) → multiply by a modular inverse.',
      '"Output the expected value as <b>P · Q<sup>−1</sup> mod 998244353</b>" → the problem literally asks for a Fermat inverse.',
      '"Answer many <b>nCr queries</b>" with n ≤ 10<sup>6</sup> → precompute fact and invFact once, O(1) per query.',
      'Modulus is <b>not prime</b> (10<sup>6</sup>, 2<sup>64</sup>, 1001) → Fermat is wrong; use Extended Euclid and first check gcd(a, m) = 1.',
      '"Solve a·x ≡ b (mod m)" → if gcd(a, m) = g divides b, divide everything by g and multiply by the inverse of a/g.',
      'You see <code>pow(a, MOD - 2)</code> in someone\'s code → that is Fermat\'s inverse; make sure MOD is prime and a % MOD ≠ 0.'
    ],
    code: [`static final long MOD = 1_000_000_007L;

// Fast power: base^exp mod m in O(log exp). Uses long; safe because m <= ~3e9 keeps products < 9.2e18.
static long power(long base, long exp, long m) {
    long result = 1 % m;
    base %= m;
    if (base < 0) base += m;
    while (exp > 0) {
        if ((exp & 1) == 1) result = result * base % m;   // this bit is set: multiply it in
        base = base * base % m;                           // square for the next bit
        exp >>= 1;
    }
    return result;
}

// Method 1: Fermat. Only valid when p is prime and a % p != 0.
static long invFermat(long a, long p) {
    return power(a, p - 2, p);
}

// Method 2: Extended Euclid. Valid for any m when gcd(a, m) == 1. Returns -1 if no inverse.
static long invExtGcd(long a, long m) {
    long oldR = Math.floorMod(a, m), r = m, oldS = 1, s = 0;
    while (r != 0) {
        long q = oldR / r;
        long t = oldR - q * r; oldR = r; r = t;
        t = oldS - q * s; oldS = s; s = t;
    }
    if (oldR != 1) return -1;              // gcd(a, m) != 1: no inverse exists
    return Math.floorMod(oldS, m);         // make it land in [0, m)
}

// Method 3: all inverses 1..n mod prime p in O(n). Needs n < p.
static long[] inverseTable(int n, long p) {
    long[] inv = new long[n + 1];
    inv[1] = 1;
    for (int i = 2; i <= n; i++) {
        // p = (p / i) * i + (p % i)  ->  0 = (p / i) * i + (p % i)  (mod p)  -> solve for 1/i
        inv[i] = (p - p / i) % p * inv[(int) (p % i)] % p;
    }
    return inv;
}`, `// nCr mod p with factorials + inverse factorials: O(N) precompute, O(1) per query
static final int MAXN = 1_000_000;
static final long P = 1_000_000_007L;
static long[] fact = new long[MAXN + 1], invFact = new long[MAXN + 1];

static long pw(long b, long e) {
    long r = 1; b %= P;
    while (e > 0) { if ((e & 1) == 1) r = r * b % P; b = b * b % P; e >>= 1; }
    return r;
}

static void precompute() {
    fact[0] = 1;
    for (int i = 1; i <= MAXN; i++) fact[i] = fact[i - 1] * i % P;
    invFact[MAXN] = pw(fact[MAXN], P - 2);                 // ONE Fermat inverse
    for (int i = MAXN; i > 0; i--) invFact[i - 1] = invFact[i] * i % P;   // 1/(i-1)! = i / i!
}

static long nCr(int n, int r) {
    if (r < 0 || r > n) return 0;
    return fact[n] * invFact[r] % P * invFact[n - r] % P;
}`],
    codeTitle: ['Three ways to get an inverse (Java)', 'Factorials + inverse factorials for nCr'],
    viz: {
      title: 'Fermat inverse: computing a^(p−2) mod p bit by bit',
      input: '3 7',
      inputLabel: 'a p (p prime, 3 ≤ p ≤ 1000003, a not a multiple of p)',
      gen: function (input) {
        var v = nums(input, 2, 2, 'Enter "a p", e.g. "3 7"');
        var a = v[0], p = v[1];
        if (p < 3 || p > 1000003 || !isPrimeJ(p)) throw new Error('p must be a prime between 3 and 1000003');
        a = ((a % p) + p) % p;
        if (a === 0) throw new Error('a must not be a multiple of p (0 has no inverse)');
        var e = p - 2, width = Math.max(4, e.toString(2).length), frames = [];
        frames.push({ narr: 'p = ' + p + ' is prime, so by Fermat a<sup>p−1</sup> ≡ 1 and the inverse is <b>a<sup>p−2</sup> = ' + a + '<sup>' + e + '</sup> mod ' + p + '</b>. Write the exponent ' + e + ' in binary — we will read it from the right.', parts: [
          { type: 'bits', label: 'exponent p − 2', value: e, width: width },
          { type: 'vars', vals: { a: a, p: p, result: 1, base: a } }
        ] });
        var res = 1, base = a, ex = e, bit = 0;
        while (ex > 0) {
          var set = ex % 2 === 1, before = res;
          if (set) res = mulModJ(res, base, p);
          frames.push({ narr: 'Bit ' + bit + ' is <b>' + (set ? '1' : '0') + '</b>. ' + (set ? 'Multiply it in: result = ' + before + ' × ' + base + ' mod ' + p + ' = <b>' + res + '</b>.' : 'Skip — this power of the base is not part of the exponent.') + ' Then square the base for the next bit.', parts: [
            { type: 'bits', label: 'exponent p − 2', value: e, width: width, hl: one(bit, set ? 'ok' : 'cur') },
            { type: 'vars', vals: { bit: bit, 'base (= a^(2^bit))': base, result: res }, hl: set ? { result: 'ok' } : { 'base (= a^(2^bit))': 'cur' } },
            { type: 'code', lang: 'java', code: 'if ((exp & 1) == 1) result = result * base % m;\nbase = base * base % m;\nexp >>= 1;', hl: set ? { 1: 'ok' } : { 2: 'cur' } }
          ] });
          base = mulModJ(base, base, p); ex = Math.floor(ex / 2); bit++;
        }
        frames.push({ narr: 'All bits used. <b>' + a + '<sup>−1</sup> ≡ ' + res + ' (mod ' + p + ')</b>. Check: ' + a + ' × ' + res + ' = ' + (a * res) + ' ≡ <b>' + mulModJ(a, res, p) + '</b> (mod ' + p + ') ✓', parts: [
          { type: 'vars', label: 'answer', vals: { a: a, inverse: res, 'a·inverse mod p': mulModJ(a, res, p) }, hl: { inverse: 'sel', 'a·inverse mod p': 'ok' } }
        ] });
        if (p <= 23) {
          var inv = [], labels = [];
          for (var i = 1; i < p; i++) { inv.push(powModJ(i, p - 2, p)); labels.push(String(i)); }
          var hh = {}; hh[a - 1] = 'sel';
          frames.push({ narr: 'Bonus: the inverse of every non-zero value mod ' + p + '. Notice each inverse appears exactly once — inverses form a perfect pairing (and 1 and p−1 are their own inverses).', parts: [
            { type: 'array', label: 'a⁻¹ mod ' + p + ' (index label = a)', values: inv, idxLabels: labels, hl: hh }
          ] });
        }
        return frames;
      }
    },
    examples: [
      { title: '3⁻¹ mod 7 three ways', html: `<p><b>Fermat:</b> 3<sup>5</sup> = 243 = 34·7 + 5 → 5. <b>Extended Euclid:</b> 3·(−2) + 7·1 = 1 → x = −2 → floorMod(−2, 7) = 5. <b>Table:</b> inv[3] = (7 − 7/3)·inv[7 % 3] = (7 − 2)·inv[1] = 5. All three agree: ${H.c('g', '3·5 = 15 ≡ 1')}.</p>` },
      { title: 'Expected die roll 7/2 printed mod 10⁹+7', html: `<p>The answer 7/2 is not an integer, so contests ask for 7 · 2<sup>−1</sup> mod p. 2<sup>−1</sup> mod 10<sup>9</sup>+7 = <b>500000004</b> (because 2·500000004 = 10<sup>9</sup>+8 ≡ 1). So the output is 7·500000004 mod p = <b>500000007</b>. Sanity check: 2·500000007 = 1000000014 ≡ 7 ✓.</p>`, code: { lang: 'python', run: true, code: `P = 10**9 + 7
inv2 = pow(2, P - 2, P)
print(inv2, 7 * inv2 % P)            # 500000004 500000007
print(pow(2, -1, P) == inv2)          # Python 3.8+ can do modular inverse directly` } },
      { title: 'Fermat silently fails for a composite modulus', html: `<p>Find 5<sup>−1</sup> mod 12. 12 is not prime. Fermat would say 5<sup>10</sup> mod 12 = (25)<sup>5</sup> mod 12 = 1<sup>5</sup> = ${H.c('r', '1 ✗')} (5·1 = 5, not 1). Extended Euclid: 5·5 + 12·(−2) = 1 → ${H.c('g', '5⁻¹ = 5')} (5·5 = 25 ≡ 1 ✓). And 4<sup>−1</sup> mod 12 does not exist at all because gcd(4, 12) = 4.</p>` },
      { title: 'C(5, 2) mod 10⁹+7 with the invFact table', html: `<p>fact[5] = 120, invFact[2] = 500000004, invFact[3] = 166666668. 120 · 500000004 mod p = 60, then 60 · 166666668 mod p = <b>10</b> = C(5,2) ✓. Every query is just two multiplications.</p>` }
    ],
    deepDive: `<p><b>Why Fermat's little theorem holds (necklace / permutation proof).</b> Multiply every non-zero residue 1, 2, …, p−1 by a. Because a has an inverse, no two products collide, so you get the same p−1 residues in a different order. Multiply them all: a<sup>p−1</sup>·(p−1)! ≡ (p−1)!. Cancel (p−1)! (it is invertible mod a prime) → a<sup>p−1</sup> ≡ 1.</p>
      <p><b>The linear-table formula, derived.</b> Write p = q·i + r with q = ⌊p/i⌋, r = p mod i. Mod p: q·i + r ≡ 0 → i ≡ −r/q → 1/i ≡ −q/r = −q·inv[r]. Because r &lt; i, inv[r] is already known. That is why it fills left to right in O(n).</p>
      <p><b>Overflow budget.</b> With p ≈ 10<sup>9</sup>, residues are &lt; 2<sup>30</sup>, so a product is &lt; 2<sup>60</sup> — safe in a Java <code>long</code>. With p up to 4·10<sup>18</sup> (64-bit moduli, e.g. Miller–Rabin) you need <code>Math.multiplyHigh</code>, <code>BigInteger</code>, Montgomery multiplication, or <code>__int128</code> in C++. A very common bug is <code>fact[n] * invFact[r] * invFact[n-r] % P</code> — the triple product overflows before the single <code>%</code>. Reduce after <i>every</i> multiplication.</p>
      <p><b>Batch inversion (Montgomery's trick).</b> To invert k arbitrary values a₁..a_k at once: build prefix products, invert only the total, then walk backwards: inv(a_i) = prefix[i−1] · invTotal, invTotal *= a_i. One exponentiation + 3k multiplications. This is what elliptic-curve and zero-knowledge proof libraries do in production.</p>
      <p><b>Edge cases.</b> a ≡ 0 has no inverse — Fermat would happily return 0<sup>p−2</sup> = 0, a wrong answer that does not crash. nCr with n ≥ p (small primes) breaks because n! ≡ 0 — that is exactly when you need Lucas (Topic 8). And remember Java's <code>%</code> can be negative: normalise before calling power.</p>`,
    aiEra: `<p><b>What AI changes:</b> modular inverse code is pure boilerplate now; AI will generate the factorial / inverse-factorial template instantly. Interviewers know this, so they probe <i>why</i> division needs an inverse and <i>when</i> Fermat is illegal.</p>
      <p><b>Use AI as a partner:</b> <code>"Generate random (a, m) pairs including composite m and gcd(a,m) &gt; 1; compare invFermat, invExtGcd and Python pow(a, -1, m)"</code>. Differential testing against Python's built-in <code>pow(a, -1, m)</code> is a 30-second safety net.</p>
      <p><b>Where AI goes wrong:</b> uses Fermat with a composite modulus; forgets that a may be negative or a multiple of p; writes <code>fact[n]*invFact[r]*invFact[n-r] % MOD</code> (overflow); sizes the factorial table to n instead of 2n for Catalan/stars-and-bars; or recomputes <code>pow(fact[r], MOD-2)</code> per query, turning O(1) queries into O(log p).</p>
      <p><b>What you must still own:</b> the one-line reason inverses exist only when gcd = 1, the Fermat derivation, and the habit of choosing the method from the modulus (prime vs composite) before writing code.</p>`,
    problems: [{
      title: 'Answer Q Binomial Queries mod 10⁹+7',
      level: 'Medium', tags: ['modular inverse', 'combinatorics', 'precomputation'], companies: ['Amazon', 'Codeforces-style'],
      statement: `<p>You are given Q queries, each a pair (n, r). For each, print <code>C(n, r) mod 1,000,000,007</code> (0 if r &gt; n).</p>`,
      constraints: `1 ≤ Q ≤ 10<sup>5</sup>, 0 ≤ r, n ≤ 10<sup>6</sup>`,
      example: `<p>Queries (5, 2), (10, 3), (4, 7) → ${H.c('g', '10, 120, 0')}. C(5,2) = 10 subsets of size 2 from 5; C(4,7) = 0 because you cannot pick 7 from 4.</p>`,
      brute: { why: `<p>Compute each answer by multiplying n·(n−1)·…·(n−r+1) and dividing by r!. The division is illegal mod p, and doing it with BigInteger costs O(r) big-number multiplications per query → up to 10<sup>5</sup> × 10<sup>6</sup> operations. A full Pascal triangle needs 10<sup>12</sup> cells. Both are hopeless.</p>`, code: `// Pascal's triangle: correct but O(N^2) time and memory - only fine for N <= ~5000
static long[][] pascal(int n, long mod) {
    long[][] c = new long[n + 1][n + 1];
    for (int i = 0; i <= n; i++) {
        c[i][0] = 1;
        for (int j = 1; j <= i; j++) c[i][j] = (c[i - 1][j - 1] + c[i - 1][j]) % mod;
    }
    return c;
}` },
      mcq: { q: 'Which is the cheapest correct way to fill invFact[0..N] mod a prime?', options: ['One Fermat inverse of fact[N], then invFact[i−1] = invFact[i]·i', 'A separate Fermat inverse for every fact[i]', 'invFact[i] = 1 / fact[i] using double', 'Extended Euclid on each i, then multiply them'], answer: 0, explain: 'One O(log p) exponentiation plus N multiplications. Option 2 is correct but N times slower; option 3 is wrong (floating point); option 4 also works but is slower and more code.' },
      hints: [`<p>Hint 1: C(n, r) = n! / (r!·(n−r)!). Division mod a prime = multiplication by an inverse.</p>`, `<p>Hint 2: Precompute fact[0..10<sup>6</sup>] and invFact[0..10<sup>6</sup>] once. Only fact[MAX] needs a real Fermat inverse; the rest come from invFact[i−1] = invFact[i]·i.</p>`, `<p>Hint 3: Handle r &lt; 0 or r &gt; n → 0. Reduce mod p after every single multiplication. Use fast output (StringBuilder) for 10<sup>5</sup> lines.</p>`],
      solution: {
        approach: `<p>Precompute factorials and inverse factorials up to the maximum n (O(N)), using one Fermat inverse. Each query is then <code>fact[n]·invFact[r]·invFact[n−r]</code> with a mod after each multiplication — O(1).</p>`,
        code: `class Solution {
    static final long P = 1_000_000_007L;
    long[] fact, invFact;

    long pw(long b, long e) {
        long r = 1; b %= P;
        while (e > 0) { if ((e & 1) == 1) r = r * b % P; b = b * b % P; e >>= 1; }
        return r;
    }

    void build(int max) {
        fact = new long[max + 1];
        invFact = new long[max + 1];
        fact[0] = 1;
        for (int i = 1; i <= max; i++) fact[i] = fact[i - 1] * i % P;
        invFact[max] = pw(fact[max], P - 2);
        for (int i = max; i > 0; i--) invFact[i - 1] = invFact[i] * i % P;
    }

    public long[] answer(int[][] queries) {
        int max = 1;
        for (int[] q : queries) max = Math.max(max, q[0]);
        build(max);
        long[] out = new long[queries.length];
        for (int i = 0; i < queries.length; i++) {
            int n = queries[i][0], r = queries[i][1];
            out[i] = (r < 0 || r > n) ? 0 : fact[n] * invFact[r] % P * invFact[n - r] % P;
        }
        return out;
    }
}`,
        dry: { head: ['step', 'value', 'why'], rows: [
          ['fact[5]', '120', '1·2·3·4·5'],
          ['invFact[2]', '500000004', '= 1/2 mod p'],
          ['invFact[3]', '166666668', '= 1/6 mod p (6·166666668 = 1000000008 ≡ 1)'],
          ['120 · 500000004 mod p', '60', '120 / 2'],
          ['60 · 166666668 mod p', '<b>10</b>', '60 / 6 = C(5, 2) ✓']
        ] },
        complexity: `<p>Precompute O(N + log P); each query O(1); memory O(N) (two long arrays of 10<sup>6</sup> ≈ 16 MB).</p>`,
        followUps: ['n up to 10<sup>18</sup> but p = 13 — what breaks and what replaces it? (Lucas)', 'Modulus 10<sup>9</sup> (not prime) — can you still use this table?', 'Count lattice paths from (0,0) to (a,b) avoiding one blocked cell.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 3 — Euler's totient
  // =====================================================================
  topics.push({
    title: "Euler's Totient φ(n) and Euler's Theorem",
    analogy: `<p>Picture a party with guests numbered 1 to 36. The host, <b>36</b>, has a strict bouncer: anyone who shares a prime factor with 36 (that is, anyone divisible by <b>2</b> or by <b>3</b>) is turned away. First the bouncer sends home every even number — half the guests leave. Of those still inside, he sends home the multiples of 3 — a third of the remaining leave. Whoever is left (1, 5, 7, 11, 13, …) shares <i>nothing</i> with the host. The size of that group is <b>φ(36) = 36 × ½ × ⅔ = 12</b>.</p>`,
    explain: `<p><b>Euler's totient φ(n)</b> counts the numbers from 1 to n that are <b>coprime</b> with n (gcd = 1). Those are exactly the numbers that have a modular inverse mod n (Topic 2), so φ(n) is "how many usable values live on an n-hour clock".</p>
      ${H.arr([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], { label: 'n = 12', hl: { 0: 'g', 4: 'g', 6: 'g', 10: 'g', 1: 'r', 2: 'r', 3: 'r', 5: 'r', 7: 'r', 8: 'r', 9: 'r', 11: 'r' } })}
      <p>Green ones are coprime with 12: 1, 5, 7, 11 → <b>φ(12) = 4</b>.</p>
      <h4>Three facts give you a formula</h4>
      <ul>
        <li><b>Prime:</b> φ(p) = p − 1 (everything below a prime is coprime with it).</li>
        <li><b>Prime power:</b> φ(p<sup>k</sup>) = p<sup>k</sup> − p<sup>k−1</sup> (remove the multiples of p).</li>
        <li><b>Multiplicative:</b> φ(a·b) = φ(a)·φ(b) when gcd(a, b) = 1.</li>
      </ul>
      <p>Together: <b>φ(n) = n · ∏ (1 − 1/p)</b> over the <i>distinct</i> primes p dividing n. Only which primes appear matters, not how many times.</p>
      ${H.table(['n', 'distinct primes', 'φ(n)'], [['12', '2, 3', '12·½·⅔ = 4'], ['36', '2, 3', '36·½·⅔ = 12'], ['97', '97', '96'], ['100', '2, 5', '100·½·⅘ = 40'], ['1', '—', '1 (by definition)']])}
      <p><b>Computing one φ(n)</b> in O(√n): trial-divide n; whenever you find a prime p, do <code>result -= result / p</code> (that is "multiply by (1 − 1/p)" in integers) and strip all p's out of n. A leftover n &gt; 1 is one last prime.</p>
      <p><b>Computing φ for all numbers up to N</b>: a sieve. Start with phi[i] = i. For each prime p (still phi[p] == p), visit its multiples and do <code>phi[j] -= phi[j] / p</code>. O(N log log N).</p>
      <h4>Euler's theorem — the reason we care</h4>
      <p>If gcd(a, n) = 1 then <b>a<sup>φ(n)</sup> ≡ 1 (mod n)</b>. Fermat (Topic 2) is the special case n = p prime, φ(p) = p − 1. Consequences:</p>
      <ul>
        <li><b>Shrink huge exponents:</b> a<sup>b</sup> ≡ a<sup>b mod φ(n)</sup> (mod n) when gcd(a, n) = 1. E.g. 7<sup>222</sup> mod 10: φ(10) = 4, 222 mod 4 = 2, so 7<sup>2</sup> = 49 → <b>9</b>.</li>
        <li><b>Inverse for any modulus:</b> a<sup>−1</sup> ≡ a<sup>φ(n)−1</sup> (mod n).</li>
        <li><b>Divisor identity:</b> ∑<sub>d | n</sub> φ(d) = n (e.g. for 12: 1+1+2+2+2+4 = 12).</li>
      </ul>`,
    clues: [
      '"Count numbers in [1, n] with <b>gcd(i, n) = 1</b>" / "how many fractions k/n are already in lowest terms" → φ(n) directly.',
      '"Count <b>reduced fractions</b> with denominator ≤ N" / "count coprime pairs (i, j) ≤ N" → prefix sums of a totient sieve.',
      '"Compute a<sup>b<sup>c</sup></sup> mod m" or exponent given as a <b>huge string / array</b> → reduce the exponent modulo φ(m) (careful when gcd(a, m) ≠ 1).',
      '"Sum of gcd(i, n) for i = 1..n" → group by the gcd value d: ∑ d·φ(n/d).',
      '"Period / cycle length of a<sup>k</sup> mod n" → it divides φ(n) (order of a divides φ(n)).',
      'n up to 10<sup>12</sup>, single query → O(√n) trial division; many queries up to 10<sup>7</sup> → sieve.'
    ],
    code: [`// phi(n) for a single n in O(sqrt n)
static long phi(long n) {
    long result = n;
    for (long p = 2; p * p <= n; p++) {
        if (n % p == 0) {                    // p is a prime factor (smaller factors already removed)
            while (n % p == 0) n /= p;       // strip every copy of p
            result -= result / p;            // result *= (1 - 1/p), exact in integers
        }
    }
    if (n > 1) result -= result / n;         // leftover n is a prime > sqrt(original n)
    return result;
}

// phi for every number 0..N with a sieve, O(N log log N)
static int[] phiSieve(int N) {
    int[] phi = new int[N + 1];
    for (int i = 0; i <= N; i++) phi[i] = i;
    for (int p = 2; p <= N; p++) {
        if (phi[p] == p) {                   // untouched so far => p is prime
            for (int j = p; j <= N; j += p) phi[j] -= phi[j] / p;
        }
    }
    return phi;
}`, { lang: 'python', run: true, title: 'Python (runnable): formula vs brute force', code: `from math import gcd

def phi(n):
    result, p = n, 2
    while p * p <= n:
        if n % p == 0:
            while n % p == 0:
                n //= p
            result -= result // p
        p += 1
    if n > 1:
        result -= result // n
    return result

for n in [1, 12, 36, 97, 100, 360]:
    brute = sum(1 for i in range(1, n + 1) if gcd(i, n) == 1)
    print(n, phi(n), brute)
print("7^222 mod 10 =", pow(7, 222 % phi(10), 10), "check", pow(7, 222, 10))` }],
    codeTitle: ['φ(n) single value + sieve (Java)', 'Check against brute force (Python)'],
    viz: {
      title: 'The bouncer: computing φ(n) prime by prime',
      input: '36',
      inputLabel: 'n (1 ≤ n ≤ 10^9; numbers drawn when n ≤ 40)',
      gen: function (input) {
        var v = nums(input, 1, 1, 'Enter one integer n, e.g. 36');
        var n = v[0];
        if (n < 1 || n > 1e9) throw new Error('n must be between 1 and 10^9');
        var draw = n <= 40, frames = [], vals = [], alive = [], i;
        for (i = 1; i <= Math.min(n, 40); i++) { vals.push(i); alive.push(true); }
        function hlAlive(kill) { var h = {}; for (var k = 0; k < vals.length; k++) { if (!alive[k]) h[k] = 'done'; else if (kill && kill(vals[k])) h[k] = 'bad'; else h[k] = 'ok'; } return h; }
        var result = n, m = n;
        frames.push({ narr: 'Start: all ' + n + ' guests are inside, so result = ' + n + '. We will find each <b>distinct prime factor</b> p of n and keep only the fraction (1 − 1/p) of guests.', parts: (draw ? [{ type: 'array', label: 'guests 1..' + n, values: vals.slice(), hl: hlAlive() }] : []).concat([{ type: 'vars', vals: { n: n, 'n left to factor': m, result: result } }]) });
        for (var p = 2; p * p <= m; p++) {
          if (m % p !== 0) continue;
          var cnt = 0; while (m % p === 0) { m /= p; cnt++; }
          var before = result; result -= result / p;
          var P = p;
          frames.push({ narr: 'Found prime <b>' + p + '</b> (it appears ' + cnt + ' time' + (cnt > 1 ? 's' : '') + ' in n — the count does not matter). The bouncer removes every guest divisible by ' + p + ': result = ' + before + ' − ' + before + '/' + p + ' = <b>' + result + '</b>.', parts: (draw ? [{ type: 'array', label: 'red = divisible by ' + p + ', leaving now', values: vals.slice(), hl: hlAlive(function (x) { return x % P === 0; }) }] : []).concat([{ type: 'vars', vals: { p: p, 'n left to factor': m, result: result }, hl: { result: 'ok', p: 'cur' } }, { type: 'code', lang: 'java', code: 'while (n % p == 0) n /= p;\nresult -= result / p;', hl: { 2: 'cur' } }]) });
          for (i = 0; i < vals.length; i++) if (vals[i] % p === 0) alive[i] = false;
        }
        if (m > 1) {
          var before2 = result, Q = m; result -= result / m;
          frames.push({ narr: 'Loop ended (p·p &gt; what is left). The leftover <b>' + m + '</b> &gt; 1 must itself be a prime factor. result = ' + before2 + ' − ' + before2 + '/' + m + ' = <b>' + result + '</b>.', parts: (draw ? [{ type: 'array', label: 'red = divisible by ' + Q, values: vals.slice(), hl: hlAlive(function (x) { return x % Q === 0; }) }] : []).concat([{ type: 'vars', vals: { 'leftover prime': m, result: result }, hl: { result: 'ok' } }]) });
          for (i = 0; i < vals.length; i++) if (vals[i] % Q === 0) alive[i] = false;
        } else {
          frames.push({ narr: 'Nothing left to factor (leftover is 1), so there is no big prime hiding.', parts: [{ type: 'vars', vals: { 'leftover': m, result: result } }] });
        }
        var cnt2 = alive.filter(function (x) { return x; }).length;
        frames.push({ narr: '<b>φ(' + n + ') = ' + result + '</b>.' + (draw ? ' Count the green guests: ' + cnt2 + ' — they are exactly the numbers with gcd(i, ' + n + ') = 1, i.e. the ones that have an inverse mod ' + n + '.' : ''), parts: (draw ? [{ type: 'array', label: 'coprime with ' + n, values: vals.slice(), hl: hlAlive() }] : []).concat([{ type: 'vars', label: 'answer', vals: { n: n, 'φ(n)': result }, hl: { 'φ(n)': 'sel' } }]) });
        return frames;
      }
    },
    examples: [
      { title: 'φ(36) by the formula and by counting', html: `<p>36 = 2<sup>2</sup>·3<sup>2</sup>. φ = 36·(1 − ½)·(1 − ⅓) = 36·½·⅔ = <b>12</b>. The coprime numbers: 1, 5, 7, 11, 13, 17, 19, 23, 25, 29, 31, 35 — twelve ✓. Using multiplicativity: φ(4)·φ(9) = 2·6 = 12 ✓.</p>` },
      { title: 'Last digit of 7²²² (Euler shrinks the exponent)', html: `<p>We want 7<sup>222</sup> mod 10. gcd(7, 10) = 1 and φ(10) = 4, so 7<sup>4</sup> ≡ 1. 222 = 4·55 + 2 → 7<sup>222</sup> ≡ 7<sup>2</sup> = 49 → ${H.c('g', '9')}. You can also watch the cycle: 7, 9, 3, 1, 7, 9, … has length 4 (which divides φ(10)).</p>` },
      { title: 'Divisor-sum identity for n = 12', html: `<p>Group the fractions 1/12, 2/12, …, 12/12 by their reduced denominator d: each d | 12 receives exactly φ(d) fractions. d = 1: {12/12} → 1; d = 2: {6/12} → 1; d = 3: {4/12, 8/12} → 2; d = 4: {3/12, 9/12} → 2; d = 6: {2/12, 10/12} → 2; d = 12: {1,5,7,11}/12 → 4. Total 1+1+2+2+2+4 = <b>12</b> ✓ — that is ∑<sub>d|n</sub> φ(d) = n.</p>` },
      { title: 'Sum of gcd(i, n) for i = 1..n', html: `<p>For n = 6: gcds are 1, 2, 3, 2, 1, 6 → total 15. Formula: ∑<sub>d|6</sub> d·φ(6/d) = 1·φ(6) + 2·φ(3) + 3·φ(2) + 6·φ(1) = 1·2 + 2·2 + 3·1 + 6·1 = <b>15</b> ✓. (How many i have gcd(i, n) = d? Exactly φ(n/d).)</p>` }
    ],
    deepDive: `<p><b>Why the sieve update is correct.</b> When prime p reaches j, phi[j] currently equals j·∏(1 − 1/q) over the smaller primes q | j. That value is still divisible by p (we have not divided out p yet, and the other factors (q−1)/q keep the p's in j), so <code>phi[j] / p</code> is exact. A linear (Euler) sieve can also compute φ in O(N) using φ(i·p) = φ(i)·p if p | i, else φ(i)·(p−1).</p>
      <p><b>Exponent reduction when gcd(a, m) ≠ 1 (generalised Euler).</b> The plain rule a<sup>b</sup> ≡ a<sup>b mod φ(m)</sup> can be false: 2<sup>4</sup> mod 8 = 0 but 2<sup>4 mod 4</sup> = 1. The safe version: if b ≥ log₂ m (in practice b ≥ φ(m)), then a<sup>b</sup> ≡ a<sup>(b mod φ(m)) + φ(m)</sup> (mod m) for <i>every</i> a. This is how power towers a<sub>1</sub><sup>a<sub>2</sub><sup>…</sup></sup> mod m are solved: recurse with m → φ(m) → φ(φ(m)) → … which hits 1 after O(log m) steps.</p>
      <p><b>Carmichael function λ(n).</b> The smallest exponent that works for every coprime a is λ(n), which divides φ(n) and can be much smaller (λ(8) = 2 while φ(8) = 4). RSA actually uses λ(pq) = lcm(p−1, q−1).</p>
      <p><b>Size facts.</b> φ(n) is even for n ≥ 3. φ(n) ≥ roughly n / (e<sup>γ</sup>·ln ln n), so it is never tiny. ∑<sub>k ≤ N</sub> φ(k) ≈ 3N²/π² — that is why ~60.8% of random pairs are coprime (probability 6/π²).</p>
      <p><b>Performance.</b> For a single n ≤ 10<sup>12</sup>, trial division to 10<sup>6</sup> is instant; for n ≤ 10<sup>18</sup> you need Pollard's rho to factor. Sieving φ up to 10<sup>7</sup> with an int array is ~40 MB and ~50 ms in Java.</p>`,
    aiEra: `<p><b>What AI changes:</b> asking an assistant for "phi sieve in Java" returns working code; nobody hand-derives it under time pressure anymore. What still separates candidates is spotting that "count reduced fractions" or "sum of gcds" <i>is</i> a totient problem, and knowing the gcd(a, m) = 1 condition on Euler's theorem.</p>
      <p><b>Use AI as a partner:</b> <code>"Give me the first 30 values of phi and of sum_{k&lt;=n} phi(k) so I can unit-test my sieve"</code>, or ask it to cross-check against OEIS A000010 / A002088. Let it brute-force small n while you write the fast version.</p>
      <p><b>Where AI goes wrong:</b> applies b mod φ(m) when a and m are not coprime (the 2<sup>4</sup> mod 8 trap); forgets the leftover prime after the √n loop; computes <code>result * (p-1) / p</code> in the wrong order and overflows or truncates; or uses int for ∑φ which overflows for N ≈ 10<sup>6</sup> (sum ≈ 3·10<sup>11</sup>).</p>
      <p><b>What you must still own:</b> the bouncer intuition behind n·∏(1 − 1/p), the statement and conditions of Euler's theorem, and the "group by gcd value" trick that turns gcd sums into φ sums.</p>`,
    problems: [{
      title: 'Count Reduced Proper Fractions',
      level: 'Medium', tags: ['euler totient', 'sieve', 'number theory'], companies: ['Project Euler', 'Codeforces-style'],
      statement: `<p>A reduced proper fraction is n/d with 1 ≤ n &lt; d and gcd(n, d) = 1. Given N, count all reduced proper fractions with denominator d ≤ N.</p>`,
      constraints: `2 ≤ N ≤ 10<sup>7</sup>. The answer can exceed 2<sup>31</sup> — use long.`,
      example: `<p>N = 8 → ${H.c('g', '21')}: 1/2; 1/3 2/3; 1/4 3/4; 1/5 … 4/5; 1/6 5/6; 1/7 … 6/7; 1/8 3/8 5/8 7/8 → 1 + 2 + 2 + 4 + 2 + 6 + 4 = 21.</p>`,
      brute: { why: `<p>Check every pair (n, d) with a gcd: about N²/2 pairs × O(log N) each. For N = 10<sup>7</sup> that is 5·10<sup>13</sup> gcd calls — days of CPU. The waste: we recompute coprimality from scratch for each pair instead of counting per denominator.</p>`, code: `static long brute(int N) {
    long count = 0;
    for (int d = 2; d <= N; d++)
        for (int n = 1; n < d; n++)
            if (gcd(n, d) == 1) count++;
    return count;
}
static int gcd(int a, int b) { return b == 0 ? a : gcd(b, a % b); }` },
      mcq: { q: 'For a fixed denominator d, how many reduced proper fractions n/d exist?', options: ['φ(d)', 'd − 1', 'number of divisors of d', 'd / 2'], answer: 0, explain: 'n ranges over 1..d−1 with gcd(n, d) = 1, which is exactly φ(d) for d ≥ 2.' },
      hints: [`<p>Hint 1: Fix the denominator d. The numerators that work are exactly the numbers below d that are coprime with d — that is φ(d).</p>`, `<p>Hint 2: So the answer is φ(2) + φ(3) + … + φ(N). Compute all φ values at once with a sieve.</p>`, `<p>Hint 3: phi[i] = i; for each prime p (phi[p] == p) and each multiple j: phi[j] -= phi[j]/p. Sum into a long. Use an int[] (10<sup>7</sup> ints = 40 MB), not long[].</p>`],
      solution: {
        approach: `<p>The count for denominator d is φ(d), so the answer is ∑<sub>d=2..N</sub> φ(d). A totient sieve computes all values in O(N log log N).</p>`,
        code: `class Solution {
    public long countFractions(int N) {
        int[] phi = new int[N + 1];
        for (int i = 0; i <= N; i++) phi[i] = i;
        for (int p = 2; p <= N; p++) {
            if (phi[p] == p) {                       // p is prime
                for (int j = p; j <= N; j += p) phi[j] -= phi[j] / p;
            }
        }
        long total = 0;
        for (int d = 2; d <= N; d++) total += phi[d];
        return total;
    }
}`,
        alt: [{ lang: 'python', code: `def count_fractions(N):
    phi = list(range(N + 1))
    for p in range(2, N + 1):
        if phi[p] == p:
            for j in range(p, N + 1, p):
                phi[j] -= phi[j] // p
    return sum(phi[2:])

print(count_fractions(8))   # 21` }],
        dry: { head: ['step', 'phi[2..8] after the step', 'note'], rows: [
          ['init', '2 3 4 5 6 7 8', 'phi[i] = i'],
          ['p = 2', '<b>1</b> 3 <b>2</b> 5 <b>3</b> 7 <b>4</b>', 'halve 2, 4, 6, 8'],
          ['p = 3', '1 <b>2</b> 2 5 <b>2</b> 7 4', '3 → 2, 6: 3 − 1 = 2'],
          ['p = 4, 6, 8', 'unchanged', 'phi[p] ≠ p → not prime, skip'],
          ['p = 5, 7', '1 2 2 <b>4</b> 2 <b>6</b> 4', 'primes → p − 1'],
          ['sum', '1+2+2+4+2+6+4 = <b>21</b>', 'answer ✓']
        ] },
        complexity: `<p>Time O(N log log N), memory O(N) ints.</p>`,
        followUps: ['Count fractions strictly between 1/3 and 1/2 with d ≤ N.', 'Count ordered pairs (i, j) in [1, N]<sup>2</sup> with gcd 1 — relate it to this answer.', 'Compute ∑ gcd(i, j) over all pairs (Practice: GCD Sum).']
      }
    }]
  });

  // =====================================================================
  // TOPIC 4 — Chinese Remainder Theorem
  // =====================================================================
  topics.push({
    title: 'Chinese Remainder Theorem: Rebuilding a Number from Its Remainders',
    analogy: `<p>A magician asks your secret age (under 105) — but only lets you say three things: the remainder when divided by <b>3</b>, by <b>5</b>, and by <b>7</b>. You say "2, 3, 2". She instantly answers <b>23</b>. No mind reading: since 3, 5 and 7 share no factors, every age from 0 to 104 produces a <i>different</i> triple of remainders, like a unique fingerprint. The <b>Chinese Remainder Theorem (CRT)</b> is the recipe to turn the fingerprint back into the number.</p>
      <p>It is the same puzzle as "a bus comes every 3 minutes, a train every 5 — when do they meet again?": cycles that line up.</p>`,
    explain: `<p><b>The problem.</b> Find x such that</p>
      ${H.table(['congruence', 'meaning'], [['x ≡ a₁ (mod m₁)', 'x leaves remainder a₁ when divided by m₁'], ['x ≡ a₂ (mod m₂)', '…'], ['…', '…'], ['x ≡ a_k (mod m_k)', '…']])}
      <p><b>The theorem.</b> If the moduli are <b>pairwise coprime</b>, there is exactly one solution in [0, M) where M = m₁·m₂·…·m_k, and every other solution differs by a multiple of M.</p>
      <h4>Way 1 — the "jump" idea (great for intuition and small numbers)</h4>
      <p>Start at x = a₁. Every number with the right remainder mod m₁ is x, x + m₁, x + 2m₁, … Keep jumping by m₁ until the second condition also holds. Now both hold, and you may only jump by lcm(m₁, m₂) to keep them. Repeat for each condition.</p>
      ${H.arr([2, 5, 8], { label: 'x ≡ 2 (mod 3): jump by 3', hl: { 0: 'r', 1: 'r', 2: 'g' } })}
      <p>8 mod 5 = 3 ✓ → now jump by 15: 8, 23 → 23 mod 7 = 2 ✓ → <b>x = 23</b>. Cost: up to m_i jumps per step — fine for small moduli, too slow for 10<sup>9</sup>.</p>
      <h4>Way 2 — the classic formula (coprime moduli)</h4>
      <p>Let M = ∏ m_i, M_i = M / m_i, and y_i = M_i<sup>−1</sup> mod m_i. Then <b>x = ∑ a_i · M_i · y_i (mod M)</b>. Each term is "switched on" only for its own modulus: M_i · y_i ≡ 1 mod m_i and ≡ 0 mod every other m_j.</p>
      <h4>Way 3 — merging two at a time with Extended Euclid (works even when moduli share factors)</h4>
      <ol>
        <li>Write x = a₁ + m₁·k. We need m₁·k ≡ a₂ − a₁ (mod m₂).</li>
        <li>Let g = gcd(m₁, m₂). If g does not divide (a₂ − a₁) → <b>no solution</b> (the two clocks can never agree).</li>
        <li>Otherwise k ≡ ((a₂ − a₁)/g) · (m₁/g)<sup>−1</sup> (mod m₂/g). Extended Euclid gives the inverse.</li>
        <li>New congruence: x ≡ a₁ + m₁·k (mod lcm(m₁, m₂)). Merge with the next one.</li>
      </ol>
      <p>This general merge is what you should code in interviews — it handles every case and reports conflicts.</p>`,
    clues: [
      '"x leaves remainder a when divided by m, remainder b when divided by n …" / "find the smallest such x" → CRT.',
      '"<b>Cycles / periods</b> line up": buses, planets, traffic lights, gears — "when do all of them show state s again?" → CRT (or lcm when all remainders are 0).',
      'The answer is needed modulo a <b>composite</b> m = p·q·r (e.g. 1001, 142857) → solve mod each prime (power) separately and recombine with CRT.',
      '"Huge result, compute it modulo several primes then reconstruct" (multi-modular arithmetic, three-prime NTT) → CRT / Garner\'s algorithm.',
      'Moduli are <b>not guaranteed coprime</b> or "output −1 if impossible" → use the pairwise Extended-Euclid merge with the g | (a₂ − a₁) check.',
      'Product of moduli up to 10<sup>18</sup> → intermediate products overflow 64 bits: use a safe mulmod.'
    ],
    code: [`// General CRT: merge x = a1 (mod m1) and x = a2 (mod m2), moduli may share factors.
// Returns {x, lcm} with 0 <= x < lcm, or null if the system has no solution.
static long[] extGcd(long a, long b) {
    long oldR = a, r = b, oldS = 1, s = 0;
    while (r != 0) {
        long q = oldR / r, t;
        t = oldR - q * r; oldR = r; r = t;
        t = oldS - q * s; oldS = s; s = t;
    }
    return new long[]{oldR, oldS};          // oldR = gcd, a*oldS = gcd (mod b)
}

static long mulMod(long a, long b, long m) {  // overflow-safe (a*b) mod m
    return BigInteger.valueOf(a).multiply(BigInteger.valueOf(b)).mod(BigInteger.valueOf(m)).longValue();
}

static long[] crtMerge(long a1, long m1, long a2, long m2) {
    a1 = Math.floorMod(a1, m1);
    a2 = Math.floorMod(a2, m2);
    long[] e = extGcd(m1, m2);
    long g = e[0], inv = e[1];              // m1 * inv = g (mod m2)
    long diff = a2 - a1;
    if (diff % g != 0) return null;          // the two clocks never agree
    long m2g = m2 / g;
    // k = (diff / g) * (m1 / g)^-1 mod (m2 / g); inv already plays the role of (m1/g)^-1
    long k = mulMod(Math.floorMod(diff / g, m2g), Math.floorMod(inv, m2g), m2g);
    long lcm = m1 / g * m2;                  // caller guarantees this fits in a long
    return new long[]{a1 + m1 * k, lcm};     // a1 + m1*k < m1 + m1*(m2/g - 1) <= lcm
}

static long crt(long[] a, long[] m) {
    long[] cur = {0, 1};                     // x = 0 (mod 1): no constraint yet
    for (int i = 0; i < a.length; i++) {
        cur = crtMerge(cur[0], cur[1], a[i], m[i]);
        if (cur == null) return -1;
    }
    return cur[0];
}`, { lang: 'python', run: true, title: 'Python (runnable): classic formula vs general merge', code: `from math import gcd

def crt_coprime(a, m):
    M = 1
    for mi in m:
        M *= mi
    x = 0
    for ai, mi in zip(a, m):
        Mi = M // mi
        x += ai * Mi * pow(Mi, -1, mi)     # Mi * inverse is 1 mod mi and 0 mod the others
    return x % M

def crt_merge(a1, m1, a2, m2):
    g = gcd(m1, m2)
    if (a2 - a1) % g:
        return None
    l = m1 // g * m2
    k = ((a2 - a1) // g) * pow(m1 // g, -1, m2 // g) % (m2 // g)
    return (a1 + m1 * k) % l, l

print(crt_coprime([2, 3, 2], [3, 5, 7]))        # 23
print(crt_merge(2, 4, 4, 6))                    # (10, 12)
print(crt_merge(1, 4, 2, 6))                    # None` }],
    codeTitle: ['General CRT merge (Java)', 'Formula and merge side by side (Python)'],
    viz: {
      title: 'CRT by jumping: keep every condition true, grow the step',
      input: '2 3; 3 5; 2 7',
      inputLabel: 'congruences "a m; a m; …" (2–5 of them, 2 ≤ m ≤ 30)',
      gen: function (input) {
        var groups = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (groups.length < 2 || groups.length > 5) throw new Error('Give 2 to 5 congruences like "2 3; 3 5; 2 7"');
        var A = [], M = [];
        groups.forEach(function (g) {
          var v = nums(g, 2, 2, 'Each congruence is "a m", e.g. "2 3; 3 5; 2 7"');
          if (v[1] < 2 || v[1] > 30) throw new Error('Each modulus m must be between 2 and 30');
          A.push(((v[0] % v[1]) + v[1]) % v[1]); M.push(v[1]);
        });
        var cols = ['#', 'x ≡ a', 'mod m', 'status'];
        function tbl(statusIdx, status) {
          return A.map(function (a, i) { return [i + 1, a, M[i], i < statusIdx ? '✓ satisfied' : (i === statusIdx ? status : 'waiting')]; });
        }
        var frames = [], x = A[0], step = M[0];
        frames.push({ narr: 'Condition 1 says x ≡ ' + A[0] + ' (mod ' + M[0] + '). Smallest such x is <b>' + x + '</b>, and we may move by <b>' + step + '</b> without breaking it.', parts: [
          { type: 'table', label: 'system', columns: cols, rows: tbl(0, '✓ satisfied'), hl: one(0, 'ok') },
          { type: 'vars', vals: { x: x, step: step } }
        ] });
        for (var i = 1; i < A.length; i++) {
          var tried = [], hl = {}, found = false, g = gcdJ(step, M[i]), limit = M[i] / g;
          for (var t = 0; t < limit; t++) {
            var cand = x + t * step;
            tried.push(cand);
            if (cand % M[i] === A[i]) { found = true; hl[t] = 'ok'; x = cand; break; }
            hl[t] = 'bad';
          }
          var labels = tried.map(function (c) { return 'mod ' + M[i] + '=' + (c % M[i]); });
          if (!found) {
            frames.push({ narr: 'Tried all ' + limit + ' candidates (after that they repeat, since lcm(' + step + ', ' + M[i] + ') = ' + (step / g * M[i]) + '). None gives remainder ' + A[i] + ' mod ' + M[i] + '. gcd(' + step + ', ' + M[i] + ') = ' + g + ' does not divide the difference → <b>no solution</b>.', parts: [
              { type: 'array', label: 'candidates x + t·' + step, values: tried, hl: hl, idxLabels: labels },
              { type: 'table', label: 'system', columns: cols, rows: tbl(i, '✗ conflict'), hl: one(i, 'bad') }
            ] });
            frames.push({ narr: 'The clocks can never agree. A real solver detects this in O(1) with the check <b>(a₂ − a₁) % gcd(m₁, m₂) ≠ 0</b> instead of trying candidates.', parts: [{ type: 'text', html: '<b>Answer:</b> no x satisfies all congruences (output −1).' }, { type: 'vars', vals: { gcd: g, verdict: 'impossible' }, hl: { verdict: 'bad' } }] });
            return frames;
          }
          frames.push({ narr: 'Condition ' + (i + 1) + ': need x ≡ ' + A[i] + ' (mod ' + M[i] + '). Jump x by ' + step + ' (so all earlier conditions stay true) until it fits: found <b>' + x + '</b> after ' + tried.length + ' tr' + (tried.length > 1 ? 'ies' : 'y') + '.', parts: [
            { type: 'array', label: 'candidates x + t·' + step, values: tried, hl: hl, idxLabels: labels },
            { type: 'table', label: 'system', columns: cols, rows: tbl(i, '✓ satisfied'), hl: one(i, 'ok') },
            { type: 'vars', vals: { x: x, step: step }, hl: { x: 'ok' } }
          ] });
          var oldStep = step;
          step = step / g * M[i];
          frames.push({ narr: 'Now ' + (i + 1) + ' conditions hold. To keep <i>all</i> of them we must move by a multiple of every modulus so far: step = lcm(' + oldStep + ', ' + M[i] + ') = <b>' + step + '</b>.', parts: [
            { type: 'vars', vals: { x: x, step: step }, hl: { step: 'cur' } },
            { type: 'text', html: 'Every solution so far looks like <b>' + x + ' + k·' + step + '</b>.' }
          ] });
        }
        frames.push({ narr: '<b>x = ' + x + '</b> is the smallest non-negative solution; all solutions are ' + x + ' + k·' + step + '.', parts: [
          { type: 'table', label: 'check every condition', columns: ['m', 'x mod m', 'wanted'], rows: A.map(function (a, i) { return [M[i], x % M[i], a]; }) },
          { type: 'vars', label: 'answer', vals: { x: x, 'period (lcm)': step }, hl: { x: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: "Sun Tzu's puzzle with the formula", html: `<p>x ≡ 2 (3), 3 (5), 2 (7). M = 105. M₁ = 35, 35 mod 3 = 2, inverse 2 → term 2·35·2 = 140. M₂ = 21, 21 mod 5 = 1, inverse 1 → 3·21·1 = 63. M₃ = 15, 15 mod 7 = 1, inverse 1 → 2·15·1 = 30. Sum 233 mod 105 = ${H.c('g', '23')}. Check: 23 = 7·3+2 = 4·5+3 = 3·7+2 ✓.</p>` },
      { title: 'Moduli that share a factor (still solvable)', html: `<p>x ≡ 2 (mod 4), x ≡ 4 (mod 6). g = gcd(4, 6) = 2, difference 4 − 2 = 2 is divisible by 2 ✓. Jumping by 4: 2 (mod 6 = 2 ✗), 6 (mod 6 = 0 ✗), 10 (mod 6 = 4 ✓). Answer <b>x ≡ 10 (mod 12)</b> — the new modulus is lcm = 12, not 24.</p>` },
      { title: 'A conflicting system', html: `<p>x ≡ 1 (mod 4) says x is <b>odd</b>; x ≡ 2 (mod 6) says x is <b>even</b>. g = 2 and the difference 1 is not divisible by 2 → ${H.c('r', 'no solution')}. The g | (a₂ − a₁) test catches exactly this kind of hidden contradiction.</p>` },
      { title: 'Why multi-modular arithmetic works', html: `<p>Need an exact answer below 10<sup>17</sup> but your fast routine (e.g. NTT) only works mod primes ≈ 10<sup>9</sup>? Run it mod p₁ = 998244353 and mod p₂ = 1004535809 (product ≈ 10<sup>18</sup>), then CRT the two residues: the unique value below p₁·p₂ is the true answer.</p>` }
    ],
    deepDive: `<p><b>Why the solution is unique (coprime case).</b> If x and x' both satisfy all congruences, then every m_i divides x − x'. Pairwise coprime → their product M divides x − x', so x ≡ x' (mod M). Counting gives existence for free: the map x ↦ (x mod m₁, …, x mod m_k) from [0, M) to the M possible tuples is one-to-one, hence onto. Abstractly: ℤ/Mℤ ≅ ℤ/m₁ℤ × … × ℤ/m_kℤ (a ring isomorphism) — which is also why φ is multiplicative.</p>
      <p><b>Overflow is the #1 real bug.</b> In the merge, <code>(diff/g) · inv</code> can be 10<sup>18</sup> × 10<sup>18</sup>. Reduce both factors mod m₂/g first and use a 128-bit-safe multiply (<code>BigInteger</code>, <code>Math.multiplyHigh</code> + correction, or <code>__int128</code>). And the final lcm itself must fit — problems usually promise "the answer fits in 64 bits".</p>
      <p><b>Garner's algorithm</b> represents x in mixed radix: x = c₁ + c₂·m₁ + c₃·m₁m₂ + … with each c_i &lt; m_i, computed using only arithmetic mod m_i. It never forms the big product, so you can compute x mod any other number (e.g. mod 10<sup>9</sup>+7) even when M has thousands of digits. This is what arbitrary-modulus NTT uses with three primes.</p>
      <p><b>Prime powers matter.</b> To work mod 2<sup>3</sup>·3<sup>2</sup>, you must split into 8 and 9 (coprime), not into 2 and 3. For nCr mod a composite, solve mod each p<sup>e</sup> (Lucas for e = 1, Granville's generalisation for e &gt; 1) and recombine with CRT.</p>
      <p><b>Real systems.</b> RSA decryption is ~4× faster with CRT: compute m mod p and m mod q with half-size exponents, then recombine (RSA-CRT). The famous Bellcore attack shows that a single fault in one half leaks the factorisation — production libraries verify the result before releasing it.</p>`,
    aiEra: `<p><b>What AI changes:</b> the classic coprime formula is the first thing an assistant writes — and it is the <i>wrong</i> default whenever moduli are not guaranteed coprime. Your job is to read the constraints and ask for (or write) the general merge.</p>
      <p><b>Use AI as a partner:</b> <code>"Write a brute force that scans x from 0 to lcm and compare with my crtMerge on random systems with moduli ≤ 50, including conflicting ones"</code>. Also ask it to construct overflow stress tests with moduli near 10<sup>9</sup> and 10<sup>18</sup>.</p>
      <p><b>Where AI goes wrong:</b> uses M = ∏ m_i instead of the lcm when moduli share factors; skips the g | (a₂ − a₁) check and returns garbage; multiplies three 10<sup>9</sup>-sized numbers in a long; forgets to normalise negative a_i; or uses Fermat to invert M_i modulo a non-prime m_i.</p>
      <p><b>What you must still own:</b> the fingerprint intuition (why remainders mod coprime numbers identify x uniquely), the two-congruence merge derivation, and the habit of checking "are the moduli coprime? does the product fit?" before coding.</p>`,
    problems: [{
      title: 'General Chinese Remainder (moduli may share factors)',
      level: 'Hard', tags: ['crt', 'extended euclid', 'number theory'], companies: ['Google', 'Jane Street', 'Codeforces-style'],
      statement: `<p>Given n congruences x ≡ a_i (mod m_i), find the smallest non-negative x satisfying all of them, or return −1 if none exists. The moduli are <b>not</b> necessarily pairwise coprime.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>5</sup>, 1 ≤ m_i ≤ 10<sup>12</sup>, 0 ≤ a_i &lt; m_i, the lcm of all m_i is guaranteed ≤ 10<sup>18</sup>`,
      example: `<p>(2 mod 3), (3 mod 5), (2 mod 7) → ${H.c('g', '23')}. (2 mod 4), (4 mod 6) → ${H.c('g', '10')}. (1 mod 4), (2 mod 6) → ${H.c('r', '−1')} (odd vs even).</p>`,
      brute: { why: `<p>Scan x = 0, 1, 2, … and test every congruence. The answer can be as large as the lcm ≈ 10<sup>18</sup>, so this may never finish. The wasted work: we test numbers that already violate the first congruence — the jump idea fixes that but still needs up to m_i jumps per step.</p>`, code: `static long brute(long[] a, long[] m, long limit) {
    for (long x = 0; x < limit; x++) {
        boolean ok = true;
        for (int i = 0; i < a.length && ok; i++) ok = (x % m[i] == a[i]);
        if (ok) return x;
    }
    return -1;
}` },
      mcq: { q: 'Merging x ≡ 3 (mod 8) with x ≡ 7 (mod 12). What happens?', options: ['Solvable: x ≡ 19 (mod 24)', 'No solution because gcd(8,12) = 4 does not divide 4', 'Solvable: x ≡ 19 (mod 96)', 'Need the moduli to be coprime, so CRT does not apply'], answer: 0, explain: 'g = 4 divides 7 − 3 = 4, so a solution exists. Jumping 3, 11, 19: 19 mod 12 = 7 ✓. New modulus is lcm(8, 12) = 24, not 96.' },
      hints: [`<p>Hint 1: Merge two congruences at a time into one: x ≡ a (mod L). After processing all of them you have the full answer.</p>`, `<p>Hint 2: x = a₁ + m₁k, so m₁k ≡ a₂ − a₁ (mod m₂). With g = gcd(m₁, m₂): no solution unless g | (a₂ − a₁); otherwise k ≡ ((a₂−a₁)/g)·(m₁/g)<sup>−1</sup> (mod m₂/g).</p>`, `<p>Hint 3: Start with (0 mod 1). Reduce factors before multiplying and use a safe mulmod (values reach 10<sup>18</sup>). The merged residue a₁ + m₁k is already in [0, lcm).</p>`],
      solution: {
        approach: `<p>Fold the congruences left to right, keeping one combined congruence (cur mod L). Each merge uses one Extended Euclid call on (L, m_i), checks divisibility of the difference by the gcd, computes k with an overflow-safe multiply, and updates to (cur + L·k mod lcm(L, m_i)).</p>`,
        code: `class Solution {
    static long[] extGcd(long a, long b) {
        long oldR = a, r = b, oldS = 1, s = 0;
        while (r != 0) {
            long q = oldR / r, t;
            t = oldR - q * r; oldR = r; r = t;
            t = oldS - q * s; oldS = s; s = t;
        }
        return new long[]{oldR, oldS};
    }

    static long mulMod(long a, long b, long m) {
        return BigInteger.valueOf(a).multiply(BigInteger.valueOf(b)).mod(BigInteger.valueOf(m)).longValue();
    }

    public long solve(long[] a, long[] m) {
        long cur = 0, L = 1;                          // x = 0 (mod 1)
        for (int i = 0; i < a.length; i++) {
            long[] e = extGcd(L, m[i]);
            long g = e[0], inv = e[1];                // L * inv = g (mod m[i])
            long diff = a[i] - cur;
            if (diff % g != 0) return -1;             // contradiction
            long mg = m[i] / g;
            long k = mulMod(Math.floorMod(diff / g, mg), Math.floorMod(inv, mg), mg);
            cur = cur + L * k;                        // < lcm, fits by the guarantee
            L = L / g * m[i];
        }
        return cur;
    }
}`,
        dry: { head: ['merge', 'extGcd → (g, inv)', 'diff', 'k', 'new (x mod L)'], rows: [
          ['start', '—', '—', '—', '(0 mod 1)'],
          ['+ (2 mod 3)', 'extGcd(1,3) = (1, 1)', '2', '2·1 mod 3 = 2', '(0 + 1·2 = 2 mod 3)'],
          ['+ (3 mod 5)', 'extGcd(3,5) = (1, 2)', '1', '1·2 mod 5 = 2', '(2 + 3·2 = 8 mod 15)'],
          ['+ (2 mod 7)', 'extGcd(15,7) = (1, 1)', '−6', 'floorMod(−6,7)·1 = 1', '(8 + 15 = <b>23</b> mod 105)']
        ] },
        complexity: `<p>O(n · log max m) arithmetic steps (each merge is one Extended Euclid); O(1) extra space.</p>`,
        followUps: ['Return the answer modulo 10<sup>9</sup>+7 when the lcm has thousands of digits (Garner).', 'Each congruence is a·x ≡ b (mod m) with a ≠ 1 — how do you normalise it first?', 'Count x in [L, R] satisfying the system.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 5 — Matrix exponentiation
  // =====================================================================
  topics.push({
    title: 'Matrix Exponentiation: Fibonacci in O(log N) and Any Linear Recurrence',
    analogy: `<p>Imagine a <b>recipe card</b> that turns today's state into tomorrow's: "tomorrow's number = today's + yesterday's". To know day 1,000,000,000,000 you could apply the card a trillion times… or notice that <b>"apply the card twice"</b> is itself a card, <b>"apply it 4 times"</b> is another card, then 8, 16, 32 times… Like folding paper: each fold <i>doubles</i> the thickness, so 40 folds already reach the Moon. With ~40 "doubled cards" you can jump straight to day 10<sup>12</sup>.</p>`,
    explain: `<p><b>Step 1 — write the recurrence as "state × matrix".</b> Fibonacci: F(n+1) = F(n) + F(n−1). Keep the last two values as a column state:</p>
      ${H.table(['', 'state now', '', 'state next'], [['[[1, 1],', '[F(n)', '→', '[F(n) + F(n−1)] = [F(n+1)]'], [' [1, 0]]', ' F(n−1)]', '', '[F(n)]          = [F(n)]']])}
      <p>So <code>state(n) = T · state(n−1)</code> with <b>T = [[1,1],[1,0]]</b>, and therefore <code>state(n) = T<sup>n</sup> · state(0)</code>. In fact T<sup>n</sup> = [[F(n+1), F(n)], [F(n), F(n−1)]], so F(n) is simply the top-right entry.</p>
      <p><b>Step 2 — compute T<sup>n</sup> fast</b>, exactly like fast power for numbers (Topic 2), but with matrix multiplication: look at the binary digits of n; square the base each step; multiply it into the result when the bit is 1.</p>
      ${H.bits(10, 4, { label: 'n = 10', hl: { 1: 'g', 3: 'g' } })}
      <p>T<sup>10</sup> = T<sup>8</sup> · T<sup>2</sup>: only 3 squarings + 2 multiplications instead of 9 multiplications. For n = 10<sup>18</sup> it is about 60 squarings.</p>
      <h4>Cost</h4>
      <p>One k×k matrix multiplication costs k³ operations, and we do about 2·log₂ n of them: <b>O(k³ log n)</b>. For Fibonacci k = 2: trivial. For a recurrence that looks back 50 steps: 50³ · 60 ≈ 7.5·10<sup>6</sup> — still instant.</p>
      <h4>Building the matrix for any linear recurrence</h4>
      <ul>
        <li><b>f(n) = c₁f(n−1) + … + c_k f(n−k)</b> → "companion matrix": first row is c₁ … c_k, below it an identity shifted by one (each row copies the previous value down).</li>
        <li><b>Plus a constant</b>, f(n) = 2f(n−1) + 3 → add a "1" to the state: [f, 1] with T = [[2, 3], [0, 1]].</li>
        <li><b>Several sequences that feed each other</b> (e.g. counting strings by last letter) → one state slot per sequence, T[i][j] = how state j feeds state i.</li>
        <li><b>Graphs</b>: if A is the adjacency matrix, (A<sup>k</sup>)[i][j] = number of walks of length exactly k from i to j.</li>
      </ul>`,
    clues: [
      '<b>n ≤ 10<sup>18</sup></b> and the answer is a simple recurrence (Fibonacci-like, "depends on the previous k values") → matrix power, O(k³ log n).',
      '"Number of ways to tile / climb / build a string of length n" where n is huge and the DP has only a few states per step → turn the DP transition into a matrix.',
      '"Number of <b>walks / paths of length exactly K</b> from u to v" in a small graph with K up to 10<sup>9</sup> → adjacency matrix to the K-th power.',
      'A DP whose transition is the <b>same at every step</b> (no dependence on n except through the state) → it is linear, so it is a matrix.',
      '"Mod 10<sup>9</sup>+7" + huge n + state size ≤ ~100 → matrix exponentiation; state size in the thousands → look for another method (Berlekamp–Massey / Kitamasa).'
    ],
    code: [`static final long MOD = 1_000_000_007L;

// C = A * B (mod MOD) for square matrices
static long[][] multiply(long[][] A, long[][] B) {
    int k = A.length;
    long[][] C = new long[k][k];
    for (int i = 0; i < k; i++)
        for (int t = 0; t < k; t++) {
            if (A[i][t] == 0) continue;               // small speed-up for sparse matrices
            long a = A[i][t];
            for (int j = 0; j < k; j++) C[i][j] = (C[i][j] + a * B[t][j]) % MOD;
        }
    return C;
}

// M^p by repeated squaring: O(k^3 log p)
static long[][] matPow(long[][] M, long p) {
    int k = M.length;
    long[][] result = new long[k][k];
    for (int i = 0; i < k; i++) result[i][i] = 1;    // identity matrix = "do nothing"
    while (p > 0) {
        if ((p & 1) == 1) result = multiply(result, M);
        M = multiply(M, M);
        p >>= 1;
    }
    return result;
}

// F(n) mod MOD for n up to 1e18
static long fib(long n) {
    if (n == 0) return 0;
    long[][] T = {{1, 1}, {1, 0}};
    return matPow(T, n)[0][1];                       // T^n = [[F(n+1), F(n)], [F(n), F(n-1)]]
}`, { lang: 'python', run: true, title: 'Python (runnable): Fibonacci and a 3-term recurrence', code: `MOD = 10**9 + 7

def mat_mul(A, B):
    k = len(A)
    return [[sum(A[i][t] * B[t][j] for t in range(k)) % MOD for j in range(k)] for i in range(k)]

def mat_pow(M, p):
    k = len(M)
    R = [[int(i == j) for j in range(k)] for i in range(k)]
    while p:
        if p & 1:
            R = mat_mul(R, M)
        M = mat_mul(M, M)
        p >>= 1
    return R

def fib(n):
    return mat_pow([[1, 1], [1, 0]], n)[0][1]

print([fib(i) for i in range(11)])          # 0 1 1 2 3 5 8 13 21 34 55
print(fib(10**18))                           # instant
# f(n) = 2 f(n-1) + 3, f(0) = 1  ->  state [f, 1], T = [[2, 3], [0, 1]]
T = mat_pow([[2, 3], [0, 1]], 5)
print((T[0][0] * 1 + T[0][1] * 1) % MOD)    # f(5) = 4*2^5 - 3 = 125` }],
    codeTitle: ['Matrix power + Fibonacci (Java)', 'Runnable Python version'],
    viz: {
      title: 'Fibonacci by squaring the matrix T = [[1,1],[1,0]]',
      input: '10',
      inputLabel: 'n (1 ≤ n ≤ 70, exact values, no modulus)',
      gen: function (input) {
        var v = nums(input, 1, 1, 'Enter one integer n between 1 and 70');
        var n = v[0];
        if (n < 1 || n > 70) throw new Error('n must be between 1 and 70 (so numbers stay exact)');
        function mul(A, B) { return [[A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]], [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]]]; }
        function g(lbl, Mx, hl) { return { type: 'grid', label: lbl, rows: [Mx[0].slice(), Mx[1].slice()], hl: hl || {} }; }
        var width = Math.max(4, n.toString(2).length);
        var R = [[1, 0], [0, 1]], B = [[1, 1], [1, 0]], frames = [], pw = 1, rp = 0, e = n, bit = 0;
        frames.push({ narr: 'We want F(' + n + '). Since T<sup>n</sup> = [[F(n+1), F(n)], [F(n), F(n−1)]], we compute T<sup>' + n + '</sup>. Binary of ' + n + ' tells us which powers T<sup>1</sup>, T<sup>2</sup>, T<sup>4</sup>, … to multiply together. result starts as the identity ("multiply by nothing").', parts: [
          { type: 'bits', label: 'n', value: n, width: width },
          g('result = T^0 (identity)', R), g('base = T^1', B)
        ] });
        while (e > 0) {
          var set = e % 2 === 1;
          if (set) { R = mul(R, B); rp += pw; }
          frames.push({ narr: 'Bit ' + bit + ' (worth ' + pw + ') is <b>' + (set ? '1' : '0') + '</b>. ' + (set ? 'Multiply base T<sup>' + pw + '</sup> into result → result is now <b>T<sup>' + rp + '</sup></b> (top-right = F(' + rp + ') = ' + R[0][1] + ').' : 'Not needed — result stays T<sup>' + rp + '</sup>.'), parts: [
            { type: 'bits', label: 'n', value: n, width: width, hl: one(bit, set ? 'ok' : 'cur') },
            g('result = T^' + rp, R, set ? { '0,1': 'ok', '1,0': 'ok' } : {}), g('base = T^' + pw, B, { '0,1': 'cur' })
          ] });
          e = Math.floor(e / 2);
          if (e > 0) {
            B = mul(B, B); pw *= 2;
            frames.push({ narr: 'Square the base: T<sup>' + (pw / 2) + '</sup> · T<sup>' + (pw / 2) + '</sup> = <b>T<sup>' + pw + '</sup></b>. Its top-right entry is F(' + pw + ') = ' + B[0][1] + ' — one squaring doubles how far we jump.', parts: [
              { type: 'bits', label: 'n', value: n, width: width, hl: one(bit + 1, 'cur') },
              g('result = T^' + rp, R), g('base = T^' + pw, B, { '0,1': 'win' })
            ] });
          }
          bit++;
        }
        frames.push({ narr: 'All bits processed: result = T<sup>' + n + '</sup>. The answer is the top-right entry: <b>F(' + n + ') = ' + R[0][1] + '</b>. We used about ' + (2 * width) + ' matrix multiplications instead of ' + (n - 1) + ' additions — the gap explodes for n = 10<sup>18</sup>.', parts: [
          g('T^' + n + ' = [[F(n+1), F(n)], [F(n), F(n−1)]]', R, { '0,1': 'sel', '1,0': 'sel' }),
          { type: 'vars', label: 'answer', vals: { n: n, 'F(n)': R[0][1], 'F(n+1)': R[0][0] }, hl: { 'F(n)': 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'F(10) = 55 with two multiplications', html: `<p>10 = 1010₂ = 8 + 2. Squarings give T<sup>2</sup> = [[2,1],[1,1]], T<sup>4</sup> = [[5,3],[3,2]], T<sup>8</sup> = [[34,21],[21,13]]. result = T<sup>2</sup> · T<sup>8</sup> = [[2·34+1·21, 2·21+1·13], …] = [[89, 55], [55, 34]] → <b>F(10) = 55</b> ✓ and F(11) = 89 for free.</p>` },
      { title: 'Tribonacci companion matrix', html: `<p>T(n) = T(n−1) + T(n−2) + T(n−3). State [T(n), T(n−1), T(n−2)]. Matrix:</p>${H.table(['', 'T(n−1)', 'T(n−2)', 'T(n−3)'], [['new T(n)', '1', '1', '1'], ['new T(n−1)', '1', '0', '0'], ['new T(n−2)', '0', '1', '0']])}<p>First row = the coefficients, the rest just shifts values down. Any "sum of the last k" recurrence follows this pattern.</p>` },
      { title: 'Walks of length k in a triangle graph', html: `<p>Triangle A–B–C, adjacency A = [[0,1,1],[1,0,1],[1,1,0]]. A<sup>2</sup> = [[2,1,1],[1,2,1],[1,1,2]]: there are 2 walks of length 2 from A back to A (A→B→A, A→C→A) ✓. A<sup>3</sup>[0][0] = 2 counts A→B→C→A and A→C→B→A. For k = 10<sup>9</sup> you just compute A<sup>k</sup> mod p.</p>` },
      { title: 'Recurrence with a constant: f(n) = 2f(n−1) + 3', html: `<p>Add a constant slot: state [f(n), 1], T = [[2, 3], [0, 1]] because f(n) = 2·f(n−1) + 3·1 and 1 = 0·f + 1·1. With f(0) = 1: f(5) = 125 (closed form 4·2<sup>n</sup> − 3 = 125 ✓). Polynomial terms like n or n² work the same way with slots [n², n, 1].</p>` }
    ],
    deepDive: `<p><b>Why it is correct.</b> Matrix multiplication is associative, so T<sup>a+b</sup> = T<sup>a</sup>·T<sup>b</sup>; binary exponentiation just picks the a, b's from the bits of n. It is <i>not</i> commutative in general — but powers of the same matrix commute with each other, so the order of multiplying into result does not matter here.</p>
      <p><b>Constant-factor tricks.</b> (1) Accumulate <code>a·b</code> into an unreduced long and reduce once per few terms: with MOD ≈ 10<sup>9</sup>, products are &lt; 2<sup>60</sup>, so you can add up to 8 of them before overflow. (2) Loop order i-t-j (as in the code) is cache-friendly. (3) Many queries with different n but the same matrix: precompute T<sup>2<sup>i</sup></sup> once, then multiply a <i>vector</i> by them — O(k² log n) per query instead of O(k³ log n).</p>
      <p><b>Fibonacci-specific shortcut: fast doubling.</b> F(2m) = F(m)·(2F(m+1) − F(m)) and F(2m+1) = F(m)² + F(m+1)². Same O(log n), fewer multiplications, no matrices. Also useful: the <b>Pisano period</b> — Fibonacci mod m repeats with period π(m) ≤ 6m (π(10) = 60), handy for "last digit of F(n)".</p>
      <p><b>When k is large.</b> For a k-term recurrence with k ≈ 10<sup>3</sup>–10<sup>5</sup>, k³ is too slow. <b>Kitamasa / polynomial method</b> computes x<sup>n</sup> mod the characteristic polynomial in O(k² log n) (or O(k log k log n) with NTT). If you only have the first terms of a sequence and suspect it is linear, <b>Berlekamp–Massey</b> finds the shortest recurrence from 2k terms — a favourite trick in competitive programming.</p>
      <p><b>Beyond (+, ×).</b> Replace (+, ×) by (min, +) and the same squaring gives shortest paths using exactly k edges (the "tropical semiring"); (max, +) gives best scores; (OR, AND) gives reachability in exactly k steps. Any associative "multiplication" that distributes over the "addition" works.</p>`,
    aiEra: `<p><b>What AI changes:</b> matrix-power code is a template; assistants write it flawlessly. The skill that remains valuable is <i>modelling</i>: turning "count strings where vowel X can only be followed by Y" or "tiling with these pieces" into the right state vector and transition matrix — and checking it against the slow DP.</p>
      <p><b>Use AI as a partner:</b> describe your state in words and ask <code>"Build the transition matrix for this DP and print both the O(n) DP and the matrix version for n = 1..20 so I can diff them"</code>. Matching the first 20 terms catches 95% of modelling bugs.</p>
      <p><b>Where AI goes wrong:</b> off-by-one in the exponent (T<sup>n</sup> vs T<sup>n−1</sup> depending on the initial vector), transposed matrices (rows vs columns of "who feeds whom"), forgetting <code>% MOD</code> inside the inner sum, or recommending matrix power when n is only 10<sup>5</sup> and a plain loop is simpler.</p>
      <p><b>What you must still own:</b> writing the recurrence, choosing the state, explaining the O(k³ log n) cost and recognising when n is small enough that a loop wins.</p>`,
    problems: [{
      title: 'N-th Tribonacci Number for n up to 10¹⁸',
      level: 'Medium', tags: ['matrix exponentiation', 'recurrence', 'math'], companies: ['Google', 'Microsoft'],
      statement: `<p>Tribonacci: T(0) = 0, T(1) = 1, T(2) = 1, and T(n) = T(n−1) + T(n−2) + T(n−3) for n ≥ 3. Given n, return T(n) mod 1,000,000,007.</p>`,
      constraints: `0 ≤ n ≤ 10<sup>18</sup>`,
      example: `<p>n = 4 → ${H.c('g', '4')} (sequence 0, 1, 1, 2, 4). n = 25 → 1389537.</p>`,
      brute: { why: `<p>A simple loop computes T(n) in O(n) — perfect for the LeetCode version (n ≤ 37), but n = 10<sup>18</sup> would take ~30 years at 10<sup>9</sup> steps per second. The waste: the transition is identical every step, so we are repeating the same "card" instead of squaring it.</p>`, code: `static long brute(long n) {
    final long MOD = 1_000_000_007L;
    if (n == 0) return 0;
    if (n <= 2) return 1;
    long a = 0, b = 1, c = 1;                  // T(i-3), T(i-2), T(i-1)
    for (long i = 3; i <= n; i++) {
        long d = (a + b + c) % MOD;
        a = b; b = c; c = d;
    }
    return c;
}` },
      mcq: { q: 'Which 3×3 matrix M makes [T(n+1), T(n), T(n−1)] = M · [T(n), T(n−1), T(n−2)]?', options: ['[[1,1,1],[1,0,0],[0,1,0]]', '[[1,1,1],[0,1,0],[0,0,1]]', '[[0,1,0],[0,0,1],[1,1,1]]', '[[1,0,0],[1,1,0],[1,1,1]]'], answer: 0, explain: 'Row 1 sums all three previous values; row 2 copies T(n) down; row 3 copies T(n−1) down. Option 3 also describes Tribonacci but for a state written in the opposite order [T(n−2), T(n−1), T(n)].' },
      hints: [`<p>Hint 1: The step from (T(n), T(n−1), T(n−2)) to (T(n+1), T(n), T(n−1)) is the same linear map every time → a 3×3 matrix.</p>`, `<p>Hint 2: With v = [T(2), T(1), T(0)] = [1, 1, 0], M<sup>n</sup>·v = [T(n+2), T(n+1), T(n)]. So T(n) is the last entry: M<sup>n</sup>[2][0]·1 + M<sup>n</sup>[2][1]·1.</p>`, `<p>Hint 3: Binary exponentiation of M, mod after every multiply. n = 0 must return 0 (identity matrix works automatically). Recipe: build M, P = M<sup>n</sup>, answer = (P[2][0] + P[2][1]) % MOD.</p>`],
      solution: {
        approach: `<p>Encode the recurrence as the companion matrix M = [[1,1,1],[1,0,0],[0,1,0]]. Raise it to the n-th power with repeated squaring (about 60 squarings of a 3×3 matrix) and read T(n) from the last row applied to the start vector [1, 1, 0].</p>`,
        code: `class Solution {
    static final long MOD = 1_000_000_007L;

    long[][] mul(long[][] A, long[][] B) {
        int k = A.length;
        long[][] C = new long[k][k];
        for (int i = 0; i < k; i++)
            for (int t = 0; t < k; t++)
                for (int j = 0; j < k; j++)
                    C[i][j] = (C[i][j] + A[i][t] * B[t][j]) % MOD;
        return C;
    }

    public long tribonacci(long n) {
        long[][] M = {{1, 1, 1}, {1, 0, 0}, {0, 1, 0}};
        long[][] P = {{1, 0, 0}, {0, 1, 0}, {0, 0, 1}};   // identity
        long e = n;
        while (e > 0) {
            if ((e & 1) == 1) P = mul(P, M);
            M = mul(M, M);
            e >>= 1;
        }
        // P * [T(2), T(1), T(0)] = P * [1, 1, 0]; last row gives T(n)
        return (P[2][0] + P[2][1]) % MOD;
    }
}`,
        dry: { head: ['k', 'M^k · [1, 1, 0]', 'last entry = T(k)'], rows: [
          ['0', '[1, 1, 0]', '0'],
          ['1', '[2, 1, 1]', '1'],
          ['2', '[4, 2, 1]', '1'],
          ['3', '[7, 4, 2]', '2'],
          ['4 (= bit 2 only: P = M⁴)', '[13, 7, 4]', '<b>4</b> ✓']
        ] },
        complexity: `<p>O(3³ · log n) ≈ 27 · 60 · 2 multiplications; O(1) memory.</p>`,
        followUps: ['Return the sum T(0) + … + T(n) — add one more state slot.', 'k-bonacci with k = 200: what is the cost and when would you switch to Kitamasa?', 'Answer 10<sup>5</sup> queries of different n quickly.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 6 — Inclusion–Exclusion
  // =====================================================================
  topics.push({
    title: 'Inclusion–Exclusion: Counting Without Double-Counting',
    analogy: `<p>A teacher asks: "Hands up if you play <b>cricket</b>" — 15 hands. "Hands up if you play <b>football</b>" — 12 hands. Are there 27 sporty kids? No! The 5 kids who play <b>both</b> raised their hand twice. So the real count is 15 + 12 − 5 = <b>22</b>.</p>
      <p>Add a third sport and the fix gets one more layer: after subtracting every "both" group, the kids who play <i>all three</i> were added 3 times and subtracted 3 times — they vanished, so add them back once. <b>Add singles, subtract pairs, add triples, subtract quadruples…</b> That alternating dance is inclusion–exclusion.</p>`,
    explain: `<p><b>The formula.</b> For sets A₁, …, A_k:</p>
      <p style="text-align:center">|A₁ ∪ … ∪ A_k| = ∑|A_i| − ∑|A_i ∩ A_j| + ∑|A_i ∩ A_j ∩ A_l| − … + (−1)<sup>k+1</sup>|A₁ ∩ … ∩ A_k|</p>
      <p>Rule of thumb: a group of <b>odd</b> size gets a <b>+</b>, a group of <b>even</b> size gets a <b>−</b>.</p>
      <h4>Why every element is counted exactly once</h4>
      <p>Take an element that lies in exactly t of the sets. It is counted C(t,1) − C(t,2) + C(t,3) − … times. Since (1 − 1)<sup>t</sup> = 0 = 1 − C(t,1) + C(t,2) − …, that alternating sum is exactly <b>1</b>. Neat!</p>
      <h4>The coding pattern: loop over subsets with a bitmask</h4>
      <p>With k sets, there are 2<sup>k</sup> − 1 non-empty groups. Use a mask from 1 to 2<sup>k</sup> − 1; the bits that are on tell you which sets are in the group; <code>Integer.bitCount(mask)</code> gives the sign.</p>
      <p><b>Classic: how many numbers in [1, N] are divisible by at least one of a₁ … a_k?</b> Numbers divisible by all of a group = numbers divisible by their <b>lcm</b>, and there are ⌊N / lcm⌋ of them.</p>
      ${H.table(['group', 'lcm', 'sign', '⌊30 / lcm⌋'], [['{2}', '2', '+', '15'], ['{3}', '3', '+', '10'], ['{5}', '5', '+', '6'], ['{2,3}', '6', '−', '5'], ['{2,5}', '10', '−', '3'], ['{3,5}', '15', '−', '2'], ['{2,3,5}', '30', '+', '1'], ['<b>total</b>', '', '', H.c('g', '<b>15+10+6−5−3−2+1 = 22</b>')]])}
      <h4>The complement trick</h4>
      <p>Often you want things that satisfy <b>none</b> of the bad properties: count = total − |union of bad sets|. Examples:</p>
      <ul>
        <li><b>Coprime count:</b> numbers ≤ N coprime with M = N − (numbers divisible by some prime of M). (With N = M this is φ(M).)</li>
        <li><b>Derangements</b> (nobody gets their own hat): D(n) = ∑<sub>i=0..n</sub> (−1)<sup>i</sup> C(n,i)(n−i)! = n!·(1 − 1/1! + 1/2! − … ). Also D(n) = (n−1)(D(n−1) + D(n−2)).</li>
        <li><b>Onto (surjective) functions</b> from n items to k boxes with no box empty: ∑<sub>i=0..k</sub> (−1)<sup>i</sup> C(k,i)(k−i)<sup>n</sup>.</li>
        <li><b>Bounded stars and bars:</b> solutions of x₁+…+x_k = S with 0 ≤ x_i ≤ c: subtract the cases where some x_i ≥ c+1.</li>
      </ul>`,
    clues: [
      '"Count numbers in [1, N] divisible by <b>at least one</b> of …" / "by none of …" → inclusion–exclusion over the given numbers using lcm.',
      '"<b>No one</b> gets their own …", "no element in its original position" → derangements.',
      '"Every box / colour / category must be used <b>at least once</b>" → onto-function inclusion–exclusion.',
      'k ≤ 20 "bad properties" and N up to 10<sup>18</sup> → 2<sup>k</sup> subsets, each counted by a formula (not by iterating N).',
      '"Count coprime pairs" / "count with gcd = 1" → inclusion–exclusion over prime factors (the Möbius function is its tidy form).',
      '"K-th smallest number divisible by a, b or c" → binary search on the answer + inclusion–exclusion count.'
    ],
    code: [`// How many integers in [1, N] are divisible by at least one of a[0..k-1]?  O(2^k * k * log)
static long countDivisibleByAny(long N, long[] a) {
    int k = a.length;
    long total = 0;
    for (int mask = 1; mask < (1 << k); mask++) {
        long l = 1;
        boolean tooBig = false;
        for (int i = 0; i < k && !tooBig; i++) {
            if ((mask >> i & 1) == 0) continue;
            long g = gcd(l, a[i]);
            // l / g * a[i] > N  <=>  l / g > N / a[i]   (avoids overflow)
            if (l / g > N / a[i]) tooBig = true;
            else l = l / g * a[i];
        }
        if (tooBig) continue;                       // floor(N / lcm) would be 0
        long term = N / l;
        if (Integer.bitCount(mask) % 2 == 1) total += term;   // odd group size: add
        else total -= term;                                    // even group size: subtract
    }
    return total;
}

static long gcd(long a, long b) { return b == 0 ? a : gcd(b, a % b); }

// Numbers in [1, N] coprime with M: complement of "divisible by some prime factor of M"
static long countCoprime(long N, long M) {
    List<Long> primes = new ArrayList<>();
    for (long p = 2; p * p <= M; p++)
        if (M % p == 0) { primes.add(p); while (M % p == 0) M /= p; }
    if (M > 1) primes.add(M);
    long[] arr = new long[primes.size()];
    for (int i = 0; i < arr.length; i++) arr[i] = primes.get(i);
    return N - countDivisibleByAny(N, arr);
}`, `// Derangements D(n) mod p with the recurrence D(n) = (n - 1) * (D(n-1) + D(n-2))
static long derangements(int n, long p) {
    if (n == 0) return 1;
    if (n == 1) return 0;
    long d2 = 1, d1 = 0;                 // D(0), D(1)
    for (int i = 2; i <= n; i++) {
        long d = (long) (i - 1) % p * ((d1 + d2) % p) % p;
        d2 = d1; d1 = d;
    }
    return d1;
}`],
    codeTitle: ['Divisible-by-any and coprime counting (Java)', 'Derangements (Java)'],
    viz: {
      title: 'Inclusion–exclusion over every subset (bitmask walk)',
      input: '30 | 2 3 5',
      inputLabel: 'N | numbers (1–5 numbers, each ≥ 1; N ≤ 10^9)',
      gen: function (input) {
        var parts = String(input || '').split('|');
        if (parts.length !== 2) throw new Error('Format: "N | a b c", e.g. "30 | 2 3 5"');
        var N = nums(parts[0], 1, 1, 'N must be one integer, e.g. "30 | 2 3 5"')[0];
        var a = nums(parts[1], 1, 5, 'Give 1 to 5 integers after "|", e.g. "30 | 2 3 5"');
        if (N < 1 || N > 1e9 || a.some(function (x) { return x < 1 || x > 1e9; })) throw new Error('Use 1 ≤ N ≤ 10^9 and 1 ≤ each number ≤ 10^9');
        var k = a.length, frames = [], total = 0, rows = [];
        frames.push({ narr: 'Count numbers in [1, ' + N + '] divisible by at least one of {' + a.join(', ') + '}. We visit all ' + ((1 << k) - 1) + ' non-empty groups. For each group: lcm → how many multiples ⌊N/lcm⌋ → add if the group has an odd size, subtract if even.', parts: [
          { type: 'array', label: 'numbers (bit i ↔ a[i])', values: a.slice() },
          { type: 'vars', vals: { N: N, total: 0 } }
        ] });
        for (var mask = 1; mask < (1 << k); mask++) {
          var l = 1, members = [], hl = {}, bh = {}, big = false;
          for (var i = 0; i < k; i++) if (mask >> i & 1) {
            members.push(a[i]); hl[i] = 'cur'; bh[i] = 'cur';
            if (!big) { var gg = gcdJ(l, a[i]); l = l / gg * a[i]; if (l > N) big = true; }
          }
          var size = members.length, sign = size % 2 === 1 ? '+' : '−', term = big ? 0 : Math.floor(N / l);
          total += size % 2 === 1 ? term : -term;
          rows.push(['{' + members.join(',') + '}', big ? '&gt; N' : l, sign, term, total]);
          frames.push({ narr: 'mask = ' + mask.toString(2) + ' → group {' + members.join(', ') + '} (size ' + size + ', so <b>' + (size % 2 === 1 ? 'add' : 'subtract') + '</b>). lcm = ' + (big ? 'bigger than N, so 0 multiples' : l + ', multiples ⌊' + N + '/' + l + '⌋ = ' + term) + '. Running total = <b>' + total + '</b>.', parts: [
            { type: 'bits', label: 'mask', value: mask, width: Math.max(k, 3), hl: bh },
            { type: 'array', label: 'chosen numbers', values: a.slice(), hl: hl },
            { type: 'table', label: 'terms so far', columns: ['group', 'lcm', 'sign', '⌊N/lcm⌋', 'running'], rows: rows.map(function (r) { return r.slice(); }), hl: one(rows.length - 1, size % 2 === 1 ? 'ok' : 'bad') }
          ] });
        }
        var brute = 0;
        if (N <= 2e5) { for (var x = 1; x <= N; x++) { for (var j = 0; j < k; j++) if (x % a[j] === 0) { brute++; break; } } }
        frames.push({ narr: '<b>Answer: ' + total + '</b> numbers in [1, ' + N + '] are divisible by at least one of them' + (N <= 2e5 ? ' (brute-force check: ' + brute + ' ✓)' : '') + '. Complement: ' + (N - total) + ' are divisible by none.', parts: [
          { type: 'vars', label: 'result', vals: { 'divisible by ≥ 1': total, 'divisible by none': N - total }, hl: { 'divisible by ≥ 1': 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Three sports, three layers', html: `<p>Cricket 15, football 12, hockey 9; cricket∩football 5, cricket∩hockey 4, football∩hockey 3; all three 2. Union = 15 + 12 + 9 − 5 − 4 − 3 + 2 = <b>26</b>. A kid in all three: counted +3 −3 +1 = 1 time ✓.</p>` },
      { title: 'Derangements of 4 letters', html: `<p>D(4) = 4!·(1 − 1 + 1/2 − 1/6 + 1/24) = 24 − 24 + 12 − 4 + 1 = <b>9</b>. Recurrence check: D(2) = 1, D(3) = 2·(1 + 0) = 2, D(4) = 3·(2 + 1) = 9 ✓. Fun fact: D(n)/n! → 1/e ≈ 0.3679, so about 37% of random shuffles leave nobody in place.</p>` },
      { title: 'Onto functions: 4 tasks to 3 people, everybody busy', html: `<p>All assignments 3<sup>4</sup> = 81. Subtract those missing a chosen person: C(3,1)·2<sup>4</sup> = 48. Add back those missing two people: C(3,2)·1<sup>4</sup> = 3. Total <b>81 − 48 + 3 = 36</b>. (Check: 36 = 3!·S(4,3) = 6·6, with Stirling number S(4,3) = 6.)</p>` },
      { title: 'Coprime with 12 among 1..30', html: `<p>Primes of 12: {2, 3}. Divisible by 2 or 3 in [1, 30]: 15 + 10 − 5 = 20. Coprime: 30 − 20 = <b>10</b> (1, 5, 7, 11, 13, 17, 19, 23, 25, 29) ✓.</p>`, code: { lang: 'python', run: true, code: `from math import gcd
print(sum(1 for x in range(1, 31) if gcd(x, 12) == 1))   # 10` } }
    ],
    deepDive: `<p><b>Pruning.</b> 2<sup>k</sup> subsets is fine up to k ≈ 20–25. Use DFS over subsets instead of a flat mask loop: once the lcm exceeds N, every superset also exceeds N, so the whole branch is cut. For "divisible by any of the first k primes" this pruning makes k ≈ 40 feasible for N ≈ 10<sup>12</sup>.</p>
      <p><b>Overflow in lcm.</b> lcm grows explosively; always test <code>l / g &gt; N / a</code> before multiplying. A classic wrong answer: computing lcm(a, b) = a·b/g and overflowing when a·b &gt; 9.2·10<sup>18</sup>.</p>
      <p><b>Möbius function — inclusion–exclusion in disguise.</b> μ(d) = 0 if d has a squared prime factor, else (−1)<sup>(number of prime factors)</sup>. Then the number of pairs (i, j) in [1,N]² with gcd 1 is ∑<sub>d</sub> μ(d)·⌊N/d⌋². Every "count with gcd = 1" problem is inclusion–exclusion where only square-free d survive. Combined with a sieve this handles N = 10<sup>7</sup> easily.</p>
      <p><b>Subset-sum (zeta/Möbius) transforms.</b> If you need inclusion–exclusion over masks for <i>every</i> mask (e.g. "for each subset S, how many items avoid S"), SOS DP computes all 2<sup>k</sup> sums in O(k·2<sup>k</sup>) instead of O(3<sup>k</sup>) (see DSA 23).</p>
      <p><b>Bonferroni inequalities.</b> Stopping the alternating sum early gives alternating upper/lower bounds — used in probability (union bound = first term) and in approximate counting when k is too large to enumerate.</p>
      <p><b>Where it hides in real code.</b> Ad-targeting reach ("users in segment A or B or C"), test coverage ("lines hit by at least one test"), and permission systems all compute unions of overlapping sets. When the sets are huge, systems use HyperLogLog sketches, which support union directly — and inclusion–exclusion on sketches is a known source of large estimation error for intersections.</p>`,
    aiEra: `<p><b>What AI changes:</b> the bitmask loop is boilerplate an assistant writes perfectly. What it cannot do for you is <i>see</i> that "no box empty" or "nobody in their own seat" is an inclusion–exclusion problem, or define the right "bad" properties.</p>
      <p><b>Use AI as a partner:</b> <code>"For N ≤ 1000 and random sets of up to 6 numbers, compare my inclusion-exclusion count with a brute loop; include duplicates, 1, and numbers larger than N"</code>. Edge cases like a repeated number or a 1 in the list break naive implementations.</p>
      <p><b>Where AI goes wrong:</b> uses the product instead of the lcm for non-coprime numbers (count of multiples of 4 and 6 together is ⌊N/12⌋, not ⌊N/24⌋); overflows the lcm; flips the sign convention (even size should be minus); or forgets the "total − union" complement when the question asks for "none".</p>
      <p><b>What you must still own:</b> the (1 − 1)<sup>t</sup> = 0 argument for why it works, translating words into "bad properties", and estimating whether 2<sup>k</sup> terms is affordable.</p>`,
    problems: [{
      title: 'Count Numbers Divisible by At Least One',
      level: 'Medium', tags: ['inclusion-exclusion', 'bitmask', 'lcm'], companies: ['Amazon', 'Adobe', 'Codeforces-style'],
      statement: `<p>Given N and an array a of k positive integers, count how many integers x in [1, N] are divisible by <b>at least one</b> a[i].</p>`,
      constraints: `1 ≤ N ≤ 10<sup>18</sup>, 1 ≤ k ≤ 15, 1 ≤ a[i] ≤ 10<sup>9</sup> (values may repeat and need not be coprime)`,
      example: `<p>N = 30, a = [2, 3, 5] → ${H.c('g', '22')} (only 1, 7, 11, 13, 17, 19, 23, 29 are divisible by none: 30 − 8 = 22). N = 12, a = [4, 6] → 3 + 2 − ⌊12/12⌋ = ${H.c('g', '4')} (4, 6, 8, 12).</p>`,
      brute: { why: `<p>Loop x from 1 to N and test each a[i]: O(N·k). With N = 10<sup>18</sup> this never ends. The waste is enumerating numbers one by one when ⌊N/d⌋ counts all multiples of d in one division.</p>`, code: `static long brute(long N, long[] a) {
    long count = 0;
    for (long x = 1; x <= N; x++) {
        for (long d : a) {
            if (x % d == 0) { count++; break; }
        }
    }
    return count;
}` },
      mcq: { q: 'N = 12, a = [4, 6]. What is the size of "divisible by both 4 and 6"?', options: ['1 (multiples of lcm 12)', '0 (multiples of 24)', '2', '5'], answer: 0, explain: 'Divisible by both 4 and 6 ⇔ divisible by lcm(4, 6) = 12. Using the product 24 is the classic bug when numbers are not coprime.' },
      hints: [`<p>Hint 1: Multiples of every number in a group = multiples of their lcm; there are ⌊N / lcm⌋ of them.</p>`, `<p>Hint 2: Loop mask over 1..2<sup>k</sup>−1, build the lcm of the chosen numbers, add ⌊N/lcm⌋ for odd group size, subtract for even.</p>`, `<p>Hint 3: Guard overflow: if l / gcd(l, a) &gt; N / a the lcm already exceeds N → term 0, skip. Duplicates in a are handled automatically (lcm(4,4) = 4 makes terms cancel correctly).</p>`],
      solution: {
        approach: `<p>Inclusion–exclusion over all 2<sup>k</sup> − 1 non-empty subsets. For each subset compute the lcm with an overflow guard; the number of multiples ≤ N is ⌊N/lcm⌋, added or subtracted by the parity of the subset size.</p>`,
        code: `class Solution {
    static long gcd(long a, long b) { return b == 0 ? a : gcd(b, a % b); }

    public long countAny(long N, long[] a) {
        int k = a.length;
        long total = 0;
        for (int mask = 1; mask < (1 << k); mask++) {
            long l = 1;
            boolean big = false;
            for (int i = 0; i < k; i++) {
                if ((mask >> i & 1) == 0) continue;
                long g = gcd(l, a[i]);
                if (l / g > N / a[i]) { big = true; break; }   // lcm would exceed N
                l = l / g * a[i];
            }
            if (big) continue;
            if (Integer.bitCount(mask) % 2 == 1) total += N / l;
            else total -= N / l;
        }
        return total;
    }
}`,
        dry: { head: ['mask', 'group', 'lcm', 'sign', 'term', 'running'], rows: [
          ['001', '{2}', '2', '+', '15', '15'], ['010', '{3}', '3', '+', '10', '25'], ['011', '{2,3}', '6', '−', '5', '20'], ['100', '{5}', '5', '+', '6', '26'], ['101', '{2,5}', '10', '−', '3', '23'], ['110', '{3,5}', '15', '−', '2', '21'], ['111', '{2,3,5}', '30', '+', '1', '<b>22</b>']
        ] },
        complexity: `<p>O(2<sup>k</sup> · k · log(max a)) ≈ 32768 · 15 · 30 operations; O(1) extra memory.</p>`,
        followUps: ['Count numbers divisible by <b>exactly one</b> of them.', 'Find the n-th smallest number divisible by any of them (binary search on x).', 'k = 40 primes: how does DFS pruning on lcm &gt; N save you?']
      }
    }]
  });

  // =====================================================================
  // TOPIC 7 — Catalan numbers
  // =====================================================================
  topics.push({
    title: 'Catalan Numbers: Brackets, Trees, Mountains and More',
    analogy: `<p>Draw a <b>mountain range</b> with n up-strokes (/) and n down-strokes (\\). Rules: start and finish at sea level, and never dig below sea level. For n = 3 you can draw exactly <b>5</b> different skylines. Now replace every "/" with "(" and every "\\" with ")": each skyline becomes a correctly matched bracket string, like <code>(()())</code>. "Never below sea level" is the same rule as "never close more brackets than you opened". The numbers 1, 1, 2, 5, 14, 42, 132, … that count these shapes are the <b>Catalan numbers</b> — and they show up in a surprising number of disguises.</p>`,
    explain: `<p><b>The sequence:</b> C₀ = 1, C₁ = 1, C₂ = 2, C₃ = 5, C₄ = 14, C₅ = 42, C₆ = 132, C₇ = 429, …</p>
      ${H.table(['n', 'C_n', 'the n = 3 objects (C₃ = 5)'], [['0', '1', ''], ['1', '1', '()'], ['2', '2', '(()) ()()'], ['3', H.c('g', '5'), '((())) (()()) (())() ()(()) ()()()']])}
      <h4>The recurrence (first-return split)</h4>
      <p>Every non-empty valid string looks like <b>( A ) B</b>, where the first "(" is matched by the ")" right after A. A has i pairs and B has n−1−i pairs, both valid on their own. So</p>
      <p style="text-align:center"><b>C₀ = 1,   C_n = ∑<sub>i=0..n−1</sub> C_i · C_{n−1−i}</b></p>
      <p>That is an O(n²) DP. Example: C₃ = C₀C₂ + C₁C₁ + C₂C₀ = 2 + 1 + 2 = 5.</p>
      <h4>The closed form</h4>
      <p style="text-align:center"><b>C_n = C(2n, n) / (n + 1) = C(2n, n) − C(2n, n+1)</b></p>
      <p>C₃ = 20 / 4 = 5 ✓. With factorials and inverse factorials mod p (Topic 2) this is O(1) after O(n) precomputation — good for n up to 10<sup>6</sup>–10<sup>7</sup>. Also C_{n+1} = C_n · 2(2n+1)/(n+2).</p>
      <h4>Same numbers, different costumes</h4>
      ${H.table(['C_n counts…', 'why it is the same split'], [
        ['balanced bracket strings with n pairs', '( A ) B'],
        ['structurally different BSTs with keys 1..n', 'pick root k: left has k−1 keys, right has n−k'],
        ['full binary trees with n+1 leaves / ways to fully parenthesise n+1 factors', 'last multiplication splits into left and right'],
        ['triangulations of a convex polygon with n+2 sides', 'the triangle on a fixed edge splits the rest into two polygons'],
        ['mountain ranges / Dyck paths', 'first return to sea level'],
        ['ways 2n people around a table shake hands without crossing arms', 'person 1\'s partner splits the table into two groups'],
        ['valid push/pop sequences of a stack with n pushes', 'push = "(", pop = ")"']
      ])}
      <p><b>Growth:</b> C_n ≈ 4<sup>n</sup> / (n<sup>3/2</sup>·√π). C₁₉ ≈ 1.77·10<sup>9</sup> (just over int), C₃₅ ≈ 3.1·10<sup>18</sup> is the last one that fits in a signed long.</p>`,
    clues: [
      '"Number of <b>structurally unique BSTs</b> / full binary trees with n nodes" → Catalan.',
      '"Count <b>valid parentheses</b> strings / valid stack push-pop orders / mountain ranges / Dyck paths" → Catalan.',
      '"Ways to <b>triangulate</b> a polygon" / "ways to fully parenthesise a product" / "<b>non-crossing</b> handshakes or chords" → Catalan.',
      'A count where the answer for n splits as "<b>left part × right part</b>" summed over a split point, with sizes adding to n−1 → Catalan recurrence.',
      'First values come out <b>1, 1, 2, 5, 14, 42</b> when you brute force small n → it is almost surely Catalan.',
      '"Paths in a grid that never cross the diagonal" → ballot / reflection principle, C(2n,n) − C(2n,n+1).'
    ],
    code: [`// O(n^2) DP straight from the recurrence (exact up to n = 35 in a long)
static long[] catalanDP(int n) {
    long[] c = new long[n + 1];
    c[0] = 1;
    for (int m = 1; m <= n; m++)
        for (int i = 0; i < m; i++)
            c[m] += c[i] * c[m - 1 - i];    // left part has i pairs, right part has m-1-i
    return c;
}

// O(n) closed form mod a prime: C(2n, n) / (n + 1)
static long catalanMod(int n, long p) {
    long[] fact = new long[2 * n + 2];
    fact[0] = 1;
    for (int i = 1; i < fact.length; i++) fact[i] = fact[i - 1] * i % p;
    long denom = fact[n + 1] * fact[n] % p;          // (n+1)! * n!  so  C_n = (2n)! / ((n+1)! n!)
    return fact[2 * n] * power(denom, p - 2, p) % p;
}

static long power(long b, long e, long m) {
    long r = 1; b %= m;
    while (e > 0) { if ((e & 1) == 1) r = r * b % m; b = b * b % m; e >>= 1; }
    return r;
}`, { lang: 'python', run: true, title: 'Python (runnable): three formulas agree with brute force', code: `from math import comb
from itertools import product

def brute(n):
    # count balanced strings by trying all 2^(2n) bracket strings
    cnt = 0
    for s in product("()", repeat=2 * n):
        bal = 0
        for ch in s:
            bal += 1 if ch == "(" else -1
            if bal < 0:
                break
        else:
            cnt += bal == 0
    return cnt

dp = [1]
for m in range(1, 11):
    dp.append(sum(dp[i] * dp[m - 1 - i] for i in range(m)))
print(dp)
print([comb(2 * n, n) // (n + 1) for n in range(11)])
print([comb(2 * n, n) - comb(2 * n, n + 1) for n in range(11)])
print([brute(n) for n in range(7)])` }],
    codeTitle: ['Catalan by DP and by formula (Java)', 'Cross-check in Python'],
    viz: {
      title: 'Building C_n from smaller Catalans: left × right',
      input: '6',
      inputLabel: 'n (1 ≤ n ≤ 15)',
      gen: function (input) {
        var v = nums(input, 1, 1, 'Enter one integer n between 1 and 15');
        var n = v[0];
        if (n < 1 || n > 15) throw new Error('n must be between 1 and 15');
        var c = [1], frames = [];
        frames.push({ narr: 'C₀ = 1: there is exactly one way to have zero pairs — the empty string. Every bigger answer is built from smaller ones using the split <b>( A ) B</b>.', parts: [
          { type: 'bars', label: 'C[0..]', values: [1], idxLabels: ['C0'] },
          { type: 'text', html: 'For n = 3: <code>((()))</code>, <code>(()())</code>, <code>(())()</code>, <code>()(())</code>, <code>()()()</code> — first "(" closes after A, then B follows.' }
        ] });
        for (var m = 1; m <= n; m++) {
          var rows = [], sum = 0;
          for (var i = 0; i < m; i++) { var t = c[i] * c[m - 1 - i]; sum += t; rows.push([i, m - 1 - i, c[i] + ' × ' + c[m - 1 - i], t, sum]); }
          c.push(sum);
          var hl = {}; hl[m] = 'ok';
          frames.push({ narr: 'C' + m + ': the inside part A takes i pairs, the part B after it takes ' + (m - 1) + ' − i. Add left × right over every i: <b>C' + m + ' = ' + sum + '</b>.', parts: [
            { type: 'table', label: 'C' + m + ' = Σ C[i]·C[' + (m - 1) + '−i]', columns: ['i (inside)', 'after', 'C[i] × C[after]', 'term', 'running sum'], rows: rows },
            { type: 'bars', label: 'Catalan numbers so far', values: c.slice(), hl: hl, idxLabels: c.map(function (_, j) { return 'C' + j; }) }
          ] });
        }
        frames.push({ narr: 'Done. Check with the closed form: C' + n + ' = C(' + (2 * n) + ', ' + n + ') / ' + (n + 1) + ' = <b>' + c[n] + '</b>. Notice the growth — roughly ×4 each step — which is why real problems ask for the answer mod 10<sup>9</sup>+7.', parts: [
          { type: 'array', label: 'C0 … C' + n, values: c.slice(), hl: one(n, 'sel') },
          { type: 'vars', label: 'answer', vals: { n: n, 'C_n': c[n], 'ratio C_n / C_(n-1)': Math.round(c[n] / c[n - 1] * 100) / 100 }, hl: { 'C_n': 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'BSTs with keys 1, 2, 3', html: `<p>Root 1 → right subtree holds {2,3}: C₂ = 2 shapes. Root 2 → left {1}, right {3}: 1·1 = 1. Root 3 → left {1,2}: 2. Total <b>5 = C₃</b>. The keys' actual values never matter — only how many go left vs right.</p>` },
      { title: 'Triangulating a hexagon', html: `<p>A convex polygon with n + 2 sides has C_n triangulations. Hexagon: 6 = 4 + 2 → <b>C₄ = 14</b>. Fix the bottom edge; the triangle on it uses some third vertex, which splits the remaining area into a left polygon and a right polygon — the same left × right recurrence.</p>` },
      { title: 'Reflection principle: why C(2n, n) − C(2n, n+1)', html: `<p>All up/down paths with n ups and n downs: C(2n, n). Bad paths dip to −1 somewhere. Reflect the part after the first dip: a bad path turns into a path with n+1 downs and n−1 ups — and this is a perfect one-to-one match, so there are C(2n, n+1) bad paths. For n = 3: 20 − 15 = <b>5</b> ✓.</p>` },
      { title: 'Valid stack sequences', html: `<p>Push 1, 2, 3 in order with pops in between. Possible pop orders: 123, 132, 213, 231, 321 — five. 312 is impossible (to pop 3 first you pushed 1 and 2, and 2 must come out before 1). Pushes and pops form a balanced bracket string → <b>C₃ = 5</b>.</p>` }
    ],
    deepDive: `<p><b>Generating function.</b> Let c(x) = ∑ C_n xⁿ. The recurrence says c(x) = 1 + x·c(x)², so c(x) = (1 − √(1 − 4x)) / (2x). Expanding the square root with the binomial series gives C(2n, n)/(n + 1). The singularity at x = 1/4 explains the 4ⁿ growth.</p>
      <p><b>Cycle lemma (another proof).</b> Take any sequence of n "(" and n+1 ")". Exactly one of its 2n+1 rotations is "good" (every proper prefix has more "(" than ")"). So good sequences = C(2n+1, n)/(2n+1) = C_n. This lemma generalises to k-ary trees: the number of full k-ary trees with n internal nodes is C(kn, n)/((k−1)n + 1) (Fuss–Catalan).</p>
      <p><b>Overflow and exactness.</b> The DP in long is exact up to n = 35; C₃₆ overflows. The formula with integer division must divide <i>after</i> computing C(2n, n), and C(2n, n) itself overflows already around n = 33 — compute with BigInteger or mod p. For mod p with 2n ≥ p (small p), factorials vanish and you need Lucas (Topic 8) for C(2n, n) and C(2n, n+1) separately — do not divide by (n+1) then, use the difference form.</p>
      <p><b>Related families.</b> Super-Catalan / Schröder numbers (paths that may also step flat), Motzkin numbers (non-crossing chords where points may stay unmatched: 1, 1, 2, 4, 9, 21…), ballot numbers (paths where one candidate is always ahead). If a brute force prints 1, 2, 4, 9, 21 you are looking at Motzkin, not Catalan.</p>
      <p><b>Real-world sightings.</b> Parsers count the possible parse trees of an ambiguous expression (a chain of n binary operators has C_n parenthesisations — which is why grammars need precedence rules). Query optimisers face C_{n−1}·n! possible join orders for n tables, which is why they use DP with pruning instead of enumeration.</p>`,
    aiEra: `<p><b>What AI changes:</b> "count unique BSTs" is so well known that an assistant answers instantly. The modern skill is the <i>reverse</i>: brute force the first few terms (AI can write that brute force in seconds), recognise 1, 2, 5, 14 (or look it up in OEIS), then <i>prove</i> it with the left × right split before trusting it.</p>
      <p><b>Use AI as a partner:</b> <code>"Write a brute force that enumerates all non-crossing handshakes for 2n ≤ 12 people and print the counts"</code>, then match the sequence. Ask it to explain the bijection between two Catalan families as a review exercise.</p>
      <p><b>Where AI goes wrong:</b> confuses n with n+1 (polygon sides vs C index, leaves vs internal nodes), divides by (n+1) using integer division on an already-reduced mod value, sizes the factorial table to n instead of 2n, or claims Catalan when the real sequence is Motzkin or Schröder because the first three terms match.</p>
      <p><b>What you must still own:</b> the first-return decomposition, mapping a new problem onto it, and handling large n with modular arithmetic.</p>`,
    problems: [{
      title: 'Unique Binary Search Trees',
      level: 'Medium', tags: ['catalan', 'dynamic programming', 'trees'], companies: ['Amazon', 'Microsoft', 'Bloomberg'],
      statement: `<p>Given n, return the number of structurally unique BSTs that store exactly the values 1 … n. (LeetCode 96.)</p>`,
      constraints: `1 ≤ n ≤ 19 (the answer fits in a 32-bit int)`,
      example: `<p>n = 3 → ${H.c('g', '5')}. n = 1 → 1. n = 4 → 14.</p>`,
      brute: { why: `<p>Recursively try every root and multiply the counts of the left and right subtrees — without memoisation the same sizes are recomputed over and over, giving roughly 3<sup>n</sup> calls. n = 19 is about 10<sup>9</sup> calls: too slow, though correct.</p>`, code: `static long countTrees(int n) {
    if (n <= 1) return 1;                        // empty tree or a single node
    long total = 0;
    for (int root = 1; root <= n; root++)
        total += countTrees(root - 1) * countTrees(n - root);   // recomputes the same sizes many times
    return total;
}` },
      mcq: { q: 'With n keys and root k, how many keys go into the left subtree?', options: ['k − 1', 'n − k', 'k', 'n / 2'], answer: 0, explain: 'Every key smaller than k must be on the left: 1 … k−1. The right side gets n − k keys.' },
      hints: [`<p>Hint 1: Only the <b>number</b> of keys matters, not which keys. Let G[m] = number of BSTs with m keys.</p>`, `<p>Hint 2: Choose the root k: left side has k−1 keys, right side n−k. So G[n] = ∑ G[k−1]·G[n−k]. That is the Catalan recurrence.</p>`, `<p>Hint 3: G[0] = G[1] = 1. Fill G[2..n] bottom-up in O(n²), or use C(2n, n)/(n+1) with a long and careful order of operations.</p>`],
      solution: {
        approach: `<p>Bottom-up DP on the number of keys: G[m] sums over every root position the product of the left and right counts. The answer is the n-th Catalan number.</p>`,
        code: `class Solution {
    public int numTrees(int n) {
        long[] G = new long[n + 1];
        G[0] = 1;                                   // empty subtree: exactly one way
        for (int m = 1; m <= n; m++)
            for (int root = 1; root <= m; root++)
                G[m] += G[root - 1] * G[m - root];   // left size x right size
        return (int) G[n];
    }
}`,
        alt: [{ lang: 'python', code: `def num_trees(n):
    # O(n) closed form: C_{k+1} = C_k * 2(2k+1)/(k+2), exact in integers
    c = 1
    for k in range(n):
        c = c * 2 * (2 * k + 1) // (k + 2)
    return c

print([num_trees(n) for n in range(1, 8)])   # 1 2 5 14 42 132 429` }],
        dry: { head: ['m', 'terms G[root−1]·G[m−root]', 'G[m]'], rows: [
          ['0', 'base case', '1'], ['1', 'G0·G0 = 1', '1'], ['2', 'G0·G1 + G1·G0 = 1 + 1', '2'], ['3', 'G0·G2 + G1·G1 + G2·G0 = 2 + 1 + 2', '<b>5</b>']
        ] },
        complexity: `<p>Time O(n²), space O(n). The closed form gives O(n) time, O(1) space.</p>`,
        followUps: ['Return all the trees themselves (LeetCode 95) — how big is the output?', 'n up to 10<sup>6</sup>, answer mod 10<sup>9</sup>+7.', 'Count BSTs of n keys with height exactly h.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 8 — Lucas theorem
  // =====================================================================
  topics.push({
    title: "Lucas' Theorem: nCr mod a Small Prime for Gigantic n",
    analogy: `<p>Think of a car's <b>odometer</b>, but each wheel counts from 0 to p−1 (base p). You want to choose r things out of n, and you only care about the answer "on a p-hour clock". Lucas discovered something magical: you can handle <b>each odometer wheel separately</b> — choose r's digit out of n's digit on wheel 1, on wheel 2, on wheel 3 — and simply multiply the small answers. A problem about 10<sup>18</sup> items shrinks to a handful of tiny choices like C(4, 2).</p>`,
    explain: `<p><b>The problem.</b> The factorial method (Topic 2) needs r! and (n−r)! to be invertible mod p. If p is small (say p = 13 or p = 10007) and n ≥ p, then n! contains the factor p, so n! ≡ 0 and the formula collapses into 0/0. Also you cannot build a factorial table of size 10<sup>18</sup>.</p>
      <h4>Lucas' theorem</h4>
      <p>Write n and r in base p: n = n_k…n₁n₀, r = r_k…r₁r₀. Then</p>
      <p style="text-align:center"><b>C(n, r) ≡ C(n_k, r_k) · … · C(n₁, r₁) · C(n₀, r₀)   (mod p)</b></p>
      <p>with the rule C(a, b) = 0 when b &gt; a. Every digit is &lt; p, so each small C(n_i, r_i) uses factorials below p — which <i>are</i> invertible. In code it is a tiny recursion: <code>lucas(n, r) = C(n % p, r % p) · lucas(n / p, r / p)</code>.</p>
      <h4>Worked example: C(12, 5) mod 5</h4>
      ${H.table(['', 'base-5 digits', 'digit pairs', 'small C'], [['n = 12', '2 2', '(2, 1)', 'C(2,1) = 2'], ['r = 5', '1 0', '(2, 0)', 'C(2,0) = 1'], ['product', '', '', H.c('g', '2 · 1 = 2')]])}
      <p>Check: C(12, 5) = 792 = 158·5 + 2 → 792 mod 5 = <b>2</b> ✓.</p>
      <h4>Zero detector</h4>
      <p>If any digit r_i &gt; n_i, the whole product is 0 — p divides C(n, r). Example: C(10, 3) mod 3: 10 = 101₃, 3 = 010₃, middle digits (0, 1) → C(0, 1) = 0 → answer 0 (indeed C(10,3) = 120 = 40·3).</p>
      <h4>The famous p = 2 case</h4>
      <p>In base 2 each digit pair is (0,0), (1,0), (1,1) → 1, or (0,1) → 0. So <b>C(n, r) is odd exactly when every 1-bit of r is also a 1-bit of n</b>, i.e. <code>(n &amp; r) == r</code>. Colour the odd entries of Pascal's triangle and you get the Sierpinski triangle.</p>
      ${H.bits(7, 4, { label: 'n = 7', hl: { 0: 'g', 1: 'g' } })}${H.bits(3, 4, { label: 'r = 3', hl: { 0: 'g', 1: 'g' } })}
      <p>3 &amp; 7 = 3 → C(7, 3) = 35 is odd ✓.</p>
      <p><b>Cost:</b> precompute factorials up to p−1 once (O(p)), then each query is O(log<sub>p</sub> n) small binomials.</p>`,
    clues: [
      '"Compute C(n, r) mod p" where <b>n is huge (10<sup>18</sup>) and p is a small prime</b> (≤ 10<sup>5</sup>–10<sup>6</sup>) → Lucas.',
      '"Is C(n, r) <b>odd or even</b>?" / "how many odd numbers in row n of Pascal\'s triangle?" → Lucas with p = 2: (n &amp; r) == r, count = 2<sup>popcount(n)</sup>.',
      'Modulus is a <b>small prime</b> like 2, 3, 7, 13, 10007 and n can exceed it → plain factorials give 0/0, use Lucas.',
      'Modulus is a <b>square-free composite</b> (1001 = 7·11·13, 2·3·5·7…) → Lucas mod each prime, then CRT (Topic 4).',
      '"Does p divide C(n, r)?" / "highest power of p dividing C(n, r)" → Lucas zero test / Kummer\'s carries.'
    ],
    code: [`// Lucas: C(n, r) mod p for a prime p (works for any n, r up to 1e18)
static long[] fact, invFact;
static long P;

static long pw(long b, long e, long m) {
    long r = 1; b %= m;
    while (e > 0) { if ((e & 1) == 1) r = r * b % m; b = b * b % m; e >>= 1; }
    return r;
}

static void init(int p) {                       // O(p) precomputation
    P = p;
    fact = new long[p];
    invFact = new long[p];
    fact[0] = 1;
    for (int i = 1; i < p; i++) fact[i] = fact[i - 1] * i % p;
    invFact[p - 1] = pw(fact[p - 1], p - 2, p);
    for (int i = p - 1; i > 0; i--) invFact[i - 1] = invFact[i] * i % p;
}

static long smallC(int a, int b) {              // a, b < p
    if (b < 0 || b > a) return 0;
    return fact[a] * invFact[b] % P * invFact[a - b] % P;
}

static long lucas(long n, long r) {
    long result = 1;
    while (n > 0 || r > 0) {
        int ni = (int) (n % P), ri = (int) (r % P);    // current base-p digits
        if (ri > ni) return 0;                         // a digit of r exceeds n's digit
        result = result * smallC(ni, ri) % P;
        n /= P;
        r /= P;
    }
    return result;
}`, { lang: 'python', run: true, title: 'Python (runnable): Lucas vs exact binomials', code: `from math import comb

def lucas(n, r, p):
    res = 1
    while n or r:
        ni, ri = n % p, r % p
        if ri > ni:
            return 0
        res = res * comb(ni, ri) % p     # digits are small, exact comb is fine
        n //= p
        r //= p
    return res

for n, r, p in [(12, 5, 5), (10, 3, 3), (1000, 300, 13), (7, 3, 2), (10**18, 10**9, 10007)]:
    exact = comb(n, r) % p if n < 5000 else "too big to check"
    print(n, r, p, "->", lucas(n, r, p), "| exact:", exact)

# odd entries of row n of Pascal's triangle = 2^popcount(n)
n = 10
print(sum(comb(n, r) % 2 for r in range(n + 1)), 2 ** bin(n).count("1"))` }],
    codeTitle: ['Lucas with precomputed factorials (Java)', 'Check against exact values (Python)'],
    viz: {
      title: "Lucas: split n and r into base-p digits, multiply small binomials",
      input: '1000 300 13',
      inputLabel: 'n r p (0 ≤ r, n ≤ 10^15, p prime ≤ 997)',
      gen: function (input) {
        var v = nums(input, 3, 3, 'Enter "n r p", e.g. "1000 300 13"');
        var n = v[0], r = v[1], p = v[2];
        if (n < 0 || r < 0 || n > 1e15 || r > 1e15) throw new Error('Use 0 ≤ n, r ≤ 10^15');
        if (p < 2 || p > 997 || !isPrimeJ(p)) throw new Error('p must be a prime ≤ 997');
        function smallC(a, b) { if (b > a) return 0; var res = 1; for (var i = 0; i < b; i++) { res = res * ((a - i) % p) % p; res = res * powModJ((i + 1) % p, p - 2, p) % p; } return res; }
        var nd = [], rd = [], N = n, R = r;
        while (N > 0 || R > 0) { nd.push(N % p); rd.push(R % p); N = Math.floor(N / p); R = Math.floor(R / p); }
        if (!nd.length) { nd.push(0); rd.push(0); }
        var L = nd.length, labels = [];
        for (var i = 0; i < L; i++) labels.push('p^' + i);
        var frames = [];
        frames.push({ narr: 'Write n = ' + n + ' and r = ' + r + ' in base ' + p + ' (rightmost wheel = p<sup>0</sup>). Each wheel shows a digit between 0 and ' + (p - 1) + '.', parts: [
          { type: 'array', label: 'n in base ' + p + ' (index = power)', values: nd.slice(), idxLabels: labels },
          { type: 'array', label: 'r in base ' + p, values: rd.slice(), idxLabels: labels }
        ].concat(p === 2 && n < 2147483648 ? [{ type: 'bits', label: 'n', value: n, width: Math.min(32, Math.max(4, L)) }, { type: 'bits', label: 'r', value: r, width: Math.min(32, Math.max(4, L)) }] : []) });
        var res = 1, rows = [];
        for (var j = 0; j < L; j++) {
          var c = smallC(nd[j], rd[j]);
          res = res * c % p;
          rows.push(['p^' + j, nd[j], rd[j], rd[j] > nd[j] ? '0 (r digit > n digit)' : c, res]);
          var bad = rd[j] > nd[j];
          frames.push({ narr: 'Wheel p<sup>' + j + '</sup>: C(' + nd[j] + ', ' + rd[j] + ') mod ' + p + ' = <b>' + c + '</b>.' + (bad ? ' <span class="c-r">r\'s digit is bigger than n\'s → the whole answer is 0: p divides C(n, r).</span>' : ' Running product = ' + res + '.'), parts: [
            { type: 'array', label: 'n digits', values: nd.slice(), idxLabels: labels, hl: one(j, bad ? 'bad' : 'cur') },
            { type: 'array', label: 'r digits', values: rd.slice(), idxLabels: labels, hl: one(j, bad ? 'bad' : 'cur') },
            { type: 'table', label: 'small binomials', columns: ['wheel', 'n digit', 'r digit', 'C mod p', 'product'], rows: rows.map(function (x) { return x.slice(); }), hl: one(rows.length - 1, bad ? 'bad' : 'ok') }
          ] });
          if (bad) break;
        }
        frames.push({ narr: '<b>C(' + n + ', ' + r + ') ≡ ' + res + ' (mod ' + p + ')</b> — computed with only ' + rows.length + ' tiny binomials, never touching the gigantic number itself.', parts: [
          { type: 'vars', label: 'answer', vals: { n: n, r: r, p: p, 'C(n,r) mod p': res }, hl: { 'C(n,r) mod p': 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'C(1000, 300) mod 13', html: `<p>1000 = 5·169 + 11·13 + 12 → digits (5, 11, 12)₁₃. 300 = 1·169 + 10·13 + 1 → (1, 10, 1)₁₃. Product C(5,1)·C(11,10)·C(12,1) = 5·11·12 = 660 ≡ <b>10</b> (mod 13). The real C(1000, 300) has 264 digits — we never needed it.</p>` },
      { title: 'Odd numbers in row 10 of Pascal', html: `<p>10 = 1010₂ has two 1-bits. An entry C(10, r) is odd iff r's bits are a subset of {8, 2}: r ∈ {0, 2, 8, 10}. So there are <b>2<sup>2</sup> = 4</b> odd entries: C(10,0)=1, C(10,2)=45, C(10,8)=45, C(10,10)=1 ✓ (all others like C(10,1)=10, C(10,5)=252 are even).</p>` },
      { title: 'Kummer: how many times does p divide C(n, r)?', html: `<p>The exponent of p in C(n, r) equals the number of <b>carries</b> when adding r and n − r in base p. C(12, 5) in base 5: 5 = 10₅, 7 = 12₅; 10₅ + 12₅ = 22₅ with no carry → 5 does not divide 792 ✓ (Lucas gave 2). C(10, 3) in base 3: 3 = 010₃, 7 = 021₃ → 0+1 in the last digit = 1, 1+2 = 3 = carry! → 3 divides 120 exactly once (120 = 3·40, 40 not divisible by 3) ✓.</p>` },
      { title: 'Square-free composite modulus via Lucas + CRT', html: `<p>Want C(n, r) mod 1001 = 7·11·13? Compute Lucas mod 7, mod 11 and mod 13 separately, then CRT the three residues back (Topic 4). This works for any <b>square-free</b> modulus. For 1001: C(10, 3) = 120 → residues 1, 10, 3 → CRT → 120 ✓.</p>` }
    ],
    deepDive: `<p><b>Why Lucas is true.</b> Mod p, (1 + x)<sup>p</sup> ≡ 1 + x<sup>p</sup> (the middle binomials C(p, k) are all divisible by p — the "freshman's dream"). So (1 + x)<sup>n</sup> = ∏ ((1 + x)<sup>p<sup>i</sup></sup>)<sup>n_i</sup> ≡ ∏ (1 + x<sup>p<sup>i</sup></sup>)<sup>n_i</sup>. The coefficient of x<sup>r</sup> on the right can only be formed one way — by picking x<sup>r_i·p<sup>i</sup></sup> from the i-th factor, because base-p representation is unique. That coefficient is ∏ C(n_i, r_i).</p>
      <p><b>Prime powers (p<sup>e</sup>) need more.</b> Lucas fails mod 4, 8, 9, 27… For those, Granville's theorem (or the "factorial without p-factors" method): write n! = p<sup>k</sup> · (n!)<sub>p</sub>, compute (n!)<sub>p</sub> mod p<sup>e</sup> recursively using the periodicity of the product of numbers coprime to p, and count the power k with Legendre's formula ∑⌊n/p<sup>i</sup>⌋. Then CRT across prime powers handles any modulus — this is the standard "exLucas" technique for problems like nCr mod 142857 (= 3³·11·13·37).</p>
      <p><b>Complexity details.</b> O(p) precompute and O(log<sub>p</sub> n) per query. If p is large (≈ 10<sup>9</sup>) but n &lt; p, Lucas degenerates into the ordinary factorial formula — and you cannot store factorials up to 10<sup>9</sup>; then compute the small C(n_i, r_i) by a direct product in O(r_i) or use a different approach.</p>
      <p><b>Sierpinski and bit tricks.</b> The p = 2 case gives "C(n, r) odd ⇔ r ⊆ n as bitmasks", which is the reason SOS-DP and subset enumeration (<code>for (s = mask; s &gt; 0; s = (s - 1) &amp; mask)</code>) relate to Pascal's triangle mod 2. Number of odd entries in rows 0 … 2<sup>k</sup>−1 is 3<sup>k</sup> — the fractal's self-similarity.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants know Lucas, but they routinely default to the factorial template even when the modulus is small, producing silent zeros. Knowing <i>which</i> binomial method matches the (n, p) sizes is your job.</p>
      <p><b>Use AI as a partner:</b> <code>"Compare lucas(n, r, p) with Python's exact math.comb(n, r) % p for all n ≤ 300, r ≤ n and p in {2, 3, 5, 7, 13}"</code>. Exhaustive small-range checks are cheap and decisive.</p>
      <p><b>Where AI goes wrong:</b> applies Lucas to a prime <i>power</i> or a non-square-free modulus; builds factorials up to n instead of p−1; loops <code>while (n &gt; 0)</code> and forgets r may still have digits (fine when r ≤ n, wrong when r &gt; n is allowed); or inverts with Fermat modulo a non-prime.</p>
      <p><b>What you must still own:</b> a crisp table of "which nCr method when": (n ≤ 5000 → Pascal), (n &lt; p, p large prime → factorials), (p small prime → Lucas), (composite → split + CRT).</p>`,
    problems: [{
      title: 'Binomial Coefficient Modulo a Small Prime',
      level: 'Hard', tags: ['lucas theorem', 'combinatorics', 'modular arithmetic'], companies: ['Codeforces-style', 'HackerRank'],
      statement: `<p>Answer T queries. Each query gives n, r and asks for C(n, r) mod p, where p is a fixed prime given once.</p>`,
      constraints: `p prime, 2 ≤ p ≤ 10<sup>6</sup>; 1 ≤ T ≤ 10<sup>5</sup>; 0 ≤ r, n ≤ 10<sup>18</sup> (C(n, r) = 0 when r &gt; n)`,
      example: `<p>p = 5: (12, 5) → ${H.c('g', '2')}; (10, 3) → 0 (120 mod 5 = 0); (10<sup>18</sup>, 2) → C(10<sup>18</sup>, 2) mod 5 → digits of r are (2, 0, 0, …), n's last digit is 0 &lt; 2 → ${H.c('r', '0')}.</p>`,
      brute: { why: `<p>Use the factorial formula mod p: fact[n]·inv(fact[r])·inv(fact[n−r]). Two problems: you cannot build fact[] up to 10<sup>18</sup>, and for n ≥ p, fact[n] ≡ 0 while fact[r] may also be 0 (no inverse) — the formula silently returns 0 for nonzero answers. The brute below is exact but only for tiny n.</p>`, code: `// Exact Pascal row by row: O(n * r) - only for very small n
static long brute(int n, int r, int p) {
    if (r > n) return 0;
    long[] row = new long[r + 1];
    row[0] = 1;
    for (int i = 1; i <= n; i++)
        for (int j = Math.min(i, r); j > 0; j--) row[j] = (row[j] + row[j - 1]) % p;
    return row[r];
}` },
      mcq: { q: 'p = 3. Which of these is 0 mod 3?', options: ['C(10, 3) because the middle base-3 digit of r exceeds n\'s', 'C(9, 0)', 'C(4, 1)', 'C(8, 4)'], answer: 0, explain: '10 = 101₃ and 3 = 010₃: digit (0,1) gives C(0,1) = 0. C(9,0) = 1; C(4,1) = 4 ≡ 1; C(8,4) = 70 ≡ 1 (8 = 22₃, 4 = 11₃ → C(2,1)² = 4 ≡ 1).' },
      hints: [`<p>Hint 1: Work digit by digit in base p. Each pair of digits (n_i, r_i) is below p, so a tiny binomial with invertible factorials.</p>`, `<p>Hint 2: Precompute fact[0..p−1] and invFact[0..p−1] once (O(p)). Each query: while n or r &gt; 0, multiply in C(n % p, r % p), then divide both by p.</p>`, `<p>Hint 3: If any r digit &gt; n digit, return 0 immediately. Handle r &gt; n (also 0 — the digit test catches it when you keep looping while r &gt; 0). Use long for n, r.</p>`],
      solution: {
        approach: `<p>Lucas' theorem: the answer is the product of C(n_i, r_i) over base-p digits. With factorial tables of size p, each digit costs O(1) and there are log<sub>p</sub>(10<sup>18</sup>) ≤ 60 digits.</p>`,
        code: `class Solution {
    long p;
    long[] fact, invFact;

    long pw(long b, long e) {
        long r = 1; b %= p;
        while (e > 0) { if ((e & 1) == 1) r = r * b % p; b = b * b % p; e >>= 1; }
        return r;
    }

    Solution(int prime) {
        p = prime;
        fact = new long[prime];
        invFact = new long[prime];
        fact[0] = 1;
        for (int i = 1; i < prime; i++) fact[i] = fact[i - 1] * i % p;
        invFact[prime - 1] = pw(fact[prime - 1], p - 2);
        for (int i = prime - 1; i > 0; i--) invFact[i - 1] = invFact[i] * i % p;
    }

    public long query(long n, long r) {
        long res = 1;
        while (n > 0 || r > 0) {
            int ni = (int) (n % p), ri = (int) (r % p);
            if (ri > ni) return 0;
            res = res * fact[ni] % p * invFact[ri] % p * invFact[ni - ri] % p;
            n /= p;
            r /= p;
        }
        return res;
    }
}`,
        dry: { head: ['loop', 'n', 'r', 'digits (n_i, r_i)', 'C(n_i, r_i) mod 5', 'res'], rows: [
          ['1', '12', '5', '(2, 0)', '1', '1'],
          ['2', '2', '1', '(2, 1)', '2', '2'],
          ['3', '0', '0', 'loop ends', '—', '<b>2</b> = 792 mod 5 ✓']
        ] },
        complexity: `<p>O(p) precomputation, O(log<sub>p</sub> n) per query; O(p) memory.</p>`,
        followUps: ['Modulus 1001 = 7·11·13: combine three Lucas answers with CRT.', 'Modulus 27: why does Lucas fail and what replaces it?', 'Count r in [0, n] with C(n, r) not divisible by p (answer: ∏(n_i + 1)).']
      }
    }]
  });

  // =====================================================================
  // TOPIC 9 — Probability basics & expected value
  // =====================================================================
  topics.push({
    title: 'Probability & Expected Value: Linearity, Geometric Waits and Expectation DP',
    analogy: `<p><b>Expected value</b> is the "long-run average". If a street game pays ₹10 with chance ½ and ₹0 otherwise, you will not win ₹5 in any single game — but play it 10,000 times and your average per game will be very close to ₹5.</p>
      <p><b>Linearity of expectation</b> is like a shopping bill: the expected total of your cart is just the sum of each item's expected price — even if the items are related ("if I buy pasta I probably buy sauce"). You never need to untangle how they depend on each other. That one fact solves a huge share of interview probability puzzles.</p>`,
    explain: `<h4>Probability in 5 rules</h4>
      ${H.table(['rule', 'formula', 'tiny example'], [
        ['equally likely outcomes', 'P(A) = favourable / total', 'two dice sum to 7: 6/36 = 1/6'],
        ['complement', 'P(not A) = 1 − P(A)', 'at least one 6 in 4 rolls: 1 − (5/6)<sup>4</sup> ≈ 0.518'],
        ['independent events', 'P(A and B) = P(A)·P(B)', 'two heads: ½ · ½ = ¼'],
        ['conditional', 'P(A | B) = P(A and B) / P(B)', 'sum is 8 given first die is 3: 1/6'],
        ['Bayes', 'P(A | B) = P(B | A)·P(A) / P(B)', 'flip "test positive" into "actually sick"']
      ])}
      <h4>Expected value</h4>
      <p>E[X] = ∑ (value × its probability). A fair die: (1+2+3+4+5+6)/6 = <b>3.5</b>.</p>
      <p><b>Linearity:</b> E[X + Y] = E[X] + E[Y], <i>always</i>, even when X and Y depend on each other. The power move is <b>indicator variables</b>: write a messy count as a sum of 0/1 variables ("did event i happen?"). E[indicator] = P(event i). Then E[count] = ∑ P(event i).</p>
      <h4>Waiting for a success (geometric)</h4>
      <p>If each try succeeds with probability p, the expected number of tries is <b>1/p</b>. Rolling until a 6: 6 rolls on average. Proof in one line: E = 1 + (1 − p)·E (you always spend one try; with probability 1−p you are back where you started) → E = 1/p.</p>
      <p><b>Coupon collector:</b> collecting all n coupons, the wait for the i-th new one has success chance (n − i)/n, so the total is n/n + n/(n−1) + … + n/1 = <b>n·H_n</b> ≈ n ln n. For a die (n = 6): 6·(1 + ½ + ⅓ + ¼ + ⅕ + ⅙) = <b>14.7</b> rolls to see every face.</p>
      <h4>Expected-value DP</h4>
      <p>Define <b>E[state] = expected remaining cost from this state</b>. Write one equation per state: E[s] = cost of this step + ∑ P(next) · E[next]. Solve from the end backwards (states that are already finished have E = 0). Example: expected number of die rolls until the running total reaches at least N:</p>
      <p style="text-align:center">E[s] = 1 + (E[s+1] + E[s+2] + … + E[s+6]) / 6,   E[s] = 0 for s ≥ N</p>
      <p>If a state can loop back to itself (e.g. "roll again on a 1"), move that term to the left side and divide: E = 1 + q·E + rest → E = (1 + rest)/(1 − q).</p>
      <h4>Exact answers mod a prime</h4>
      <p>Contests avoid floating point by asking for P·Q<sup>−1</sup> mod 998244353 — keep every probability as a residue and divide with a modular inverse (Topic 2). E.g. ½ becomes 499122177.</p>`,
    clues: [
      '"<b>Expected number</b> of …" with a count that is a sum of many small events → indicator variables + linearity, no need for the joint distribution.',
      '"Repeat <b>until</b> success" / "keep rolling until" → geometric: 1/p, or an expectation DP with a self-loop term.',
      '"Collect <b>all</b> n types" → coupon collector n·H_n.',
      '"Probability that the final score is ≤ n" / "probability the knight stays on the board" → probability DP over states, often with a sliding-window sum.',
      '"Output P·Q<sup>−1</sup> mod 998244353" → do every probability with modular inverses.',
      '"Answer within 10<sup>−6</sup>" → doubles are fine; watch for catastrophic cancellation and huge state spaces (cap with "after many steps the answer converges").'
    ],
    code: [`// Expected number of fair-die rolls until the running total reaches at least N
static double expectedRolls(int N) {
    double[] E = new double[N + 6];            // E[s] = 0 for s >= N (already done)
    for (int s = N - 1; s >= 0; s--) {
        double sum = 0;
        for (int face = 1; face <= 6; face++) sum += E[s + face];
        E[s] = 1 + sum / 6;                    // pay one roll, then average the 6 futures
    }
    return E[0];
}

// Coupon collector: expected draws to see all n types = n * (1 + 1/2 + ... + 1/n)
static double couponCollector(int n) {
    double total = 0;
    for (int i = 0; i < n; i++) total += (double) n / (n - i);   // wait for the (i+1)-th new type
    return total;
}

// The same die example, but exact modulo a prime: E = 7/2 -> 7 * inverse(2)
static long expectedDieMod(long mod) {
    long inv2 = pow(2, mod - 2, mod);
    return 7 * inv2 % mod;
}

static long pow(long b, long e, long m) {
    long r = 1; b %= m;
    while (e > 0) { if ((e & 1) == 1) r = r * b % m; b = b * b % m; e >>= 1; }
    return r;
}`, { lang: 'python', run: true, title: 'Python (runnable): simulation vs exact formula', code: `import random
random.seed(7)

def simulate_coupon(n, trials=20000):
    total = 0
    for _ in range(trials):
        seen, draws = set(), 0
        while len(seen) < n:
            seen.add(random.randrange(n))
            draws += 1
        total += draws
    return total / trials

exact = sum(6 / k for k in range(1, 7))
print("coupon collector n=6  exact %.3f  simulated %.3f" % (exact, simulate_coupon(6)))

# Linearity: expected fixed points of a random permutation is always 1
n, trials, fixed = 8, 20000, 0
for _ in range(trials):
    p = list(range(n))
    random.shuffle(p)
    fixed += sum(1 for i in range(n) if p[i] == i)
print("expected fixed points ~", round(fixed / trials, 3))
print("1 - (5/6)^4 =", round(1 - (5 / 6) ** 4, 4))` }],
    codeTitle: ['Expectation DP, coupon collector, modular expectation (Java)', 'Simulation sanity check (Python)'],
    viz: {
      title: 'Expectation DP: rolls needed to reach a target total',
      input: '10',
      inputLabel: 'target N (2 ≤ N ≤ 30)',
      gen: function (input) {
        var v = nums(input, 1, 1, 'Enter one integer N between 2 and 30');
        var N = v[0];
        if (N < 2 || N > 30) throw new Error('N must be between 2 and 30');
        var E = [], i, frames = [];
        for (i = 0; i < N + 6; i++) E.push(0);
        function r3(x) { return Math.round(x * 1000) / 1000; }
        function labels() { var l = []; for (var k = 0; k < N; k++) l.push('s=' + k); return l; }
        frames.push({ narr: 'State s = current total. Once s ≥ ' + N + ' we are done, so E[s] = 0 there. We fill E from the end backwards, because each state only looks at states with a <b>bigger</b> total.', parts: [
          { type: 'bars', label: 'E[s] (expected rolls still needed)', values: E.slice(0, N).map(r3), idxLabels: labels() },
          { type: 'text', html: 'E[s] = 1 + (E[s+1] + … + E[s+6]) / 6' }
        ] });
        for (var s = N - 1; s >= 0; s--) {
          var sum = 0, parts = [];
          for (var f = 1; f <= 6; f++) { sum += E[s + f]; parts.push(r3(E[s + f])); }
          E[s] = 1 + sum / 6;
          var hl = {}; hl[s] = 'ok';
          for (var t = s + 1; t <= Math.min(s + 6, N - 1); t++) hl[t] = 'win';
          if (s === N - 1 || s === 0 || s % Math.max(1, Math.floor(N / 8)) === 0) {
            frames.push({ narr: 'From total ' + s + ': pay <b>1</b> roll, then land on ' + (s + 1) + '…' + (s + 6) + ' with chance 1/6 each. E[' + s + '] = 1 + (' + parts.join(' + ') + ')/6 = <b>' + r3(E[s]) + '</b>.' + (s + 6 >= N ? ' Faces that reach ' + N + ' or more contribute 0 — the game is over.' : ''), parts: [
              { type: 'bars', label: 'E[s]  (blue = the six futures used)', values: E.slice(0, N).map(r3), idxLabels: labels(), hl: hl },
              { type: 'vars', vals: { s: s, 'sum of futures': r3(sum), 'E[s]': r3(E[s]) }, hl: { 'E[s]': 'ok' } }
            ] });
          }
        }
        frames.push({ narr: '<b>E[0] = ' + r3(E[0]) + '</b> rolls on average to reach ' + N + '. Sanity check: each roll adds 3.5 on average, so roughly ' + N + '/3.5 = ' + r3(N / 3.5) + ' rolls, plus a little for overshooting.', parts: [
          { type: 'bars', label: 'final E[s]', values: E.slice(0, N).map(r3), idxLabels: labels(), hl: one(0, 'sel') },
          { type: 'vars', label: 'answer', vals: { N: N, 'E[0]': r3(E[0]), 'N / 3.5': r3(N / 3.5) }, hl: { 'E[0]': 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Hat-check: expected fixed points is exactly 1', html: `<p>n people grab random hats. Let X_i = 1 if person i gets their own hat. P(X_i = 1) = 1/n. By linearity E[∑X_i] = n·(1/n) = <b>1</b> — for every n, even though the X_i are dependent. Computing the full distribution would need derangements (Topic 6); linearity skips all that.</p>` },
      { title: 'Coupon collector for a die: 14.7 rolls', html: `<p>Waits: first new face 6/6 → 1 roll; second 6/5 = 1.2; third 6/4 = 1.5; fourth 6/3 = 2; fifth 6/2 = 3; sixth 6/1 = 6. Total <b>14.7</b>. Notice the last face alone costs 6 rolls — the tail dominates, which is why ln n appears.</p>` },
      { title: "de Méré's bet: at least one six in 4 rolls", html: `<p>Direct counting is messy; the complement is easy: P(no six in 4 rolls) = (5/6)<sup>4</sup> = 625/1296 ≈ 0.482. So P(at least one six) ≈ <b>0.518</b> — a slightly favourable bet. Complement + independence is the go-to for "at least one".</p>` },
      { title: 'Expected number of inversions in a random permutation', html: `<p>For each pair i &lt; j, indicator "a[i] &gt; a[j]" has probability ½. There are C(n, 2) pairs, so E[inversions] = <b>n(n−1)/4</b>. For n = 4: 3. This is also why insertion sort averages ~n²/4 swaps.</p>` }
    ],
    deepDive: `<p><b>Linearity proof (one line).</b> E[X+Y] = ∑<sub>ω</sub> (X(ω)+Y(ω))·P(ω) = ∑ X(ω)P(ω) + ∑ Y(ω)P(ω). No independence was used anywhere. Products are different: E[XY] = E[X]E[Y] only when X and Y are independent (more precisely, uncorrelated).</p>
      <p><b>Cyclic expectation systems.</b> When states can move both forward and backward (random walks, "fall back to start"), the equations form a linear system. Small systems → Gaussian elimination O(S³). Chains with a special structure (only s → s±1) → solve with a two-pass "E[s] = a_s + b_s·E[s+1]" substitution in O(S). In modular arithmetic, use modular Gaussian elimination with inverses.</p>
      <p><b>Sliding-window probability DP.</b> Transitions like "add a uniform value in [1, W]" make dp[x] = (dp[x−1] + … + dp[x−W]) / W. Keep a running window sum to go from O(N·W) to O(N) — the key trick in New 21 Game (below) and in "probability of a dice sum" problems.</p>
      <p><b>Floating-point reality.</b> Doubles have ~15–16 significant digits. Summing many tiny probabilities is fine, but subtracting nearly equal numbers (1 − 0.9999999) loses precision; prefer computing the small complement directly. When N is huge but the answer converges (e.g. Soup Servings for n &gt; 4800 is ≈ 1), cap the state space and justify it.</p>
      <p><b>Randomised algorithms connection.</b> Expected running times (randomised quicksort's ~1.39·n log₂ n comparisons, hashing's O(1) expected probes, reservoir sampling's correctness) are all proven with indicator variables and linearity — the same toolkit, applied to algorithms instead of dice. Tail bounds (Markov, Chebyshev, Chernoff) then say how unlikely a bad run is.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLMs are good at reciting formulas but notoriously shaky at multi-step probability reasoning — conditioning on the wrong event, double counting, or assuming independence. A quick <b>Monte Carlo simulation</b> (which AI writes in seconds) is the perfect referee for any formula, yours or the model's.</p>
      <p><b>Use AI as a partner:</b> <code>"Simulate this game 10^6 times and print the empirical mean with a 95% confidence interval"</code> next to your exact DP. If they disagree beyond the interval, someone's model of the process is wrong — find out whose.</p>
      <p><b>Where AI goes wrong:</b> says "the events are independent, so multiply" when they are not; forgets that E[1/X] ≠ 1/E[X]; mixes "expected number of steps" with "probability of success"; uses floats when the problem asks for P·Q<sup>−1</sup> mod p; or writes the DP in the wrong direction (forward probabilities vs backward expectations).</p>
      <p><b>What you must still own:</b> defining the random variable precisely, choosing indicator variables, writing E[state] equations, and explaining <i>why</i> linearity needs no independence.</p>`,
    problems: [{
      title: 'New 21 Game (probability DP with a sliding window)',
      level: 'Medium', tags: ['probability', 'dynamic programming', 'sliding window'], companies: ['Google', 'Amazon'],
      statement: `<p>Alice starts with 0 points and draws numbers while she has <b>fewer than k</b> points. Each draw adds a uniform random integer from [1, maxPts]. She stops as soon as she has k or more points. Return the probability that she ends with <b>n or fewer</b> points. (LeetCode 837.)</p>`,
      constraints: `0 ≤ k ≤ n ≤ 10<sup>4</sup>, 1 ≤ maxPts ≤ 10<sup>4</sup>; answers within 10<sup>−5</sup> are accepted`,
      example: `<p>n = 3, k = 2, maxPts = 3 → ${H.c('g', '0.88889')} (= 8/9). Final totals can be 2, 3 or 4; only 4 is bad, and it happens only via 1 then 3: (1/3)·(1/3) = 1/9.</p><p>n = 6, k = 1, maxPts = 10 → 0.6 (one draw, 6 of 10 values are ≤ 6).</p>`,
      brute: { why: `<p>dp[x] = probability of ever standing at exactly x = ∑ dp[x−j]/W over j = 1..W with x−j &lt; k. Computing each dp[x] with an inner loop costs O(n·W) = 10<sup>8</sup> — borderline. The waste: consecutive windows share W−1 terms, so we keep re-adding the same numbers.</p>`, code: `static double brute(int n, int k, int W) {
    if (k == 0) return 1.0;
    double[] dp = new double[n + 1];
    dp[0] = 1.0;
    double ans = 0;
    for (int x = 1; x <= n; x++) {
        for (int j = 1; j <= W; j++) {
            int from = x - j;
            if (from >= 0 && from < k) dp[x] += dp[from] / W;   // only totals < k keep drawing
        }
        if (x >= k) ans += dp[x];                               // she stopped at x <= n
    }
    return ans;
}` },
      mcq: { q: 'Which states are allowed to "pass probability forward" into dp[x]?', options: ['Only totals below k (she keeps drawing there)', 'All totals below x', 'Only totals ≥ k', 'Only total 0'], answer: 0, explain: 'At a total ≥ k she stops, so that probability never flows further. That is why the window sum only includes indices < k.' },
      hints: [`<p>Hint 1: dp[x] = probability that her total is ever exactly x. dp[0] = 1. dp[x] = (1/W)·∑ dp[x−j] for j in 1..W, but only over x−j &lt; k.</p>`, `<p>Hint 2: Keep a running window sum of the last W dp values that are &lt; k. Add dp[x] when x &lt; k, subtract dp[x−W] when x−W ≥ 0 and x−W &lt; k.</p>`, `<p>Hint 3: Answer = ∑ dp[x] for k ≤ x ≤ n. Early exit: if k == 0 or n ≥ k − 1 + W, every possible end total is ≤ n → return 1.0.</p>`],
      solution: {
        approach: `<p>Forward probability DP with a sliding-window sum: each dp[x] is the window sum divided by W. Totals below k feed the window; totals in [k, n] are added to the answer. O(n) total.</p>`,
        code: `class Solution {
    public double new21Game(int n, int k, int maxPts) {
        if (k == 0 || n >= k - 1 + maxPts) return 1.0;   // every finishing total is <= n
        double[] dp = new double[n + 1];
        dp[0] = 1.0;
        double window = 1.0;                              // sum of dp[x-W..x-1] restricted to < k
        double ans = 0.0;
        for (int x = 1; x <= n; x++) {
            dp[x] = window / maxPts;
            if (x < k) window += dp[x];                   // still drawing: feeds future totals
            else ans += dp[x];                            // stopped here with x <= n
            int out = x - maxPts;
            if (out >= 0 && out < k) window -= dp[out];   // slide the window
        }
        return ans;
    }
}`,
        dry: { head: ['x', 'dp[x] = window / 3', 'x &lt; k ?', 'window after', 'ans'], rows: [
          ['0', '1 (start)', 'yes', '1', '0'],
          ['1', '1/3', 'yes → add', '4/3', '0'],
          ['2', '4/9', 'no → ans', '4/3', '4/9'],
          ['3', '4/9', 'no → ans; drop dp[0]', '1/3', '<b>8/9</b> ✓']
        ] },
        complexity: `<p>Time O(n), space O(n) (could be O(maxPts) with a circular buffer).</p>`,
        followUps: ['Return the expected final score instead of a probability.', 'Return the answer exactly as P·Q<sup>−1</sup> mod 998244353.', 'Draws are not uniform but follow given weights — what changes?']
      }
    }]
  });

  // =====================================================================
  // TOPIC 10 — Game theory: Nim & Sprague–Grundy
  // =====================================================================
  topics.push({
    title: 'Game Theory: Winning & Losing Positions, Nim and Sprague–Grundy',
    analogy: `<p>Think of a game of <b>hot potato</b>. A position is "losing" for the player about to move if <i>every</i> move they can make hands the opponent a winning position — whatever they do, the potato comes back hotter. A position is "winning" if there is <i>at least one</i> move that hands the opponent a losing position. Label the end of the game first, then walk backwards labelling every position — that is the whole of combinatorial game theory in one idea.</p>
      <p><b>Nim</b> adds a surprise: with several heaps of matches, the winner is decided by a single <b>XOR</b> of the heap sizes — a bit trick from DSA 4 deciding who wins a board game.</p>`,
    explain: `<p>We study <b>impartial games</b>: two players alternate, both have the same moves available (unlike chess), perfect information, no luck, the game always ends, and under <b>normal play</b> the player who <b>cannot move loses</b>.</p>
      <h4>P-positions and N-positions</h4>
      <ul>
        <li><b>P-position</b> (Previous player wins) = the player to move <b>loses</b> with perfect play. Every terminal position is P.</li>
        <li><b>N-position</b> (Next player wins) = there is a move to some P-position.</li>
        <li>A position is P exactly when <b>all</b> its moves lead to N-positions.</li>
      </ul>
      <p>Example — take 1, 2 or 3 stones from one pile (LeetCode 292 "Nim Game"):</p>
      ${H.arr(['P', 'N', 'N', 'N', 'P', 'N', 'N', 'N', 'P'], { label: 'stones 0..8', hl: { 0: 'r', 4: 'r', 8: 'r' } })}
      <p>Multiples of 4 are losing: whatever you take (1–3), the opponent takes the rest up to 4. So the first player wins iff <code>n % 4 != 0</code>.</p>
      <h4>Nim (many heaps, take any number from one heap)</h4>
      <p><b>Bouton's theorem:</b> the position is losing for the player to move iff <b>a₁ ⊕ a₂ ⊕ … ⊕ a_k = 0</b> (⊕ = XOR).</p>
      ${H.table(['heap', 'binary'], [['3', '011'], ['4', '100'], ['5', '101'], ['XOR', H.c('g', '010 = 2 ≠ 0 → first player wins')]])}
      <p><b>Winning move:</b> let X = total XOR. Find a heap with (heap ⊕ X) &lt; heap and reduce it to heap ⊕ X. Here 3 ⊕ 2 = 1 &lt; 3, so take 2 from the heap of 3 → heaps (1, 4, 5): 1 ⊕ 4 ⊕ 5 = 0 ✓.</p>
      <h4>Sprague–Grundy: every impartial game is secretly a Nim heap</h4>
      <p>The <b>Grundy number</b> of a position is <b>g(pos) = mex{ g(next) for every move }</b>, where <b>mex</b> = "minimum excluded" = the smallest non-negative integer missing from the set (mex{0, 1, 3} = 2, mex{1, 2} = 0).</p>
      <ul>
        <li>g = 0 ⇔ P-position (losing for the mover); g &gt; 0 ⇔ N-position.</li>
        <li><b>Sprague–Grundy theorem:</b> if a game is a <b>sum of independent games</b> (each turn you move in exactly one of them), its Grundy number is the <b>XOR</b> of the parts. So compute g for one pile, XOR across piles, and you know the winner.</li>
      </ul>
      <p>Example: subtraction game with moves {1, 3, 4}: g(0..7) = 0, 1, 0, 1, 2, 3, 2, 0 and then it repeats with period 7. Piles 5 and 6: g = 3 ⊕ 2 = 1 ≠ 0 → first player wins.</p>`,
    clues: [
      '"Two players play <b>optimally</b> / alternately; the player who cannot move <b>loses</b>; who wins?" → P/N positions, Grundy numbers.',
      '"Several <b>piles / heaps / independent boards</b>" and each move touches only one → Sprague–Grundy: XOR the Grundy numbers.',
      '"Remove any number of stones from one pile" → plain Nim: XOR of pile sizes.',
      '"Remove 1..k stones" → periodic pattern (n % (k+1)); "remove only values in a set S" → compute Grundy with mex, look for a period.',
      'n up to 10<sup>18</sup> in a game question → there must be a <b>pattern</b> (periodic Grundy or a closed form); brute force small n and look.',
      'Scores / taking coins from the ends (Predict the Winner, Stone Game) → that is a <b>partizan / scoring</b> game: minimax DP, not Grundy.'
    ],
    code: [`// Grundy numbers for a single pile in a subtraction game with move set S
static int[] grundy(int maxN, int[] moves) {
    int[] g = new int[maxN + 1];               // g[0] = 0: no moves -> losing
    for (int n = 1; n <= maxN; n++) {
        boolean[] seen = new boolean[moves.length + 2];   // mex is at most |moves|
        for (int m : moves)
            if (m <= n && g[n - m] < seen.length) seen[g[n - m]] = true;
        int mex = 0;
        while (seen[mex]) mex++;               // smallest value not reachable
        g[n] = mex;
    }
    return g;
}

// Nim: does the first player win, and what is a winning move?
static String nimMove(int[] heaps) {
    int x = 0;
    for (int h : heaps) x ^= h;
    if (x == 0) return "second player wins (XOR = 0)";
    for (int i = 0; i < heaps.length; i++) {
        int target = heaps[i] ^ x;
        if (target < heaps[i])                 // this heap has X's highest set bit
            return "first player wins: reduce heap " + i + " from " + heaps[i] + " to " + target;
    }
    throw new IllegalStateException("unreachable: some heap always has X's top bit");
}`, { lang: 'python', run: true, title: 'Python (runnable): brute-force game search confirms the XOR rule', code: `from functools import lru_cache
from itertools import product

@lru_cache(maxsize=None)
def wins(state):
    # state = sorted tuple of heaps; True if the player to move wins
    heaps = list(state)
    for i, h in enumerate(heaps):
        for take in range(1, h + 1):
            nxt = heaps[:]
            nxt[i] -= take
            if not wins(tuple(sorted(nxt))):
                return True          # found a move to a losing position
    return False                     # every move hands the opponent a win

mismatch = 0
for a, b, c in product(range(6), repeat=3):
    if wins(tuple(sorted((a, b, c)))) != ((a ^ b ^ c) != 0):
        mismatch += 1
print("positions checked:", 6 ** 3, "mismatches with XOR rule:", mismatch)

def grundy(n_max, moves):
    g = [0] * (n_max + 1)
    for n in range(1, n_max + 1):
        reach = {g[n - m] for m in moves if m <= n}
        mex = 0
        while mex in reach:
            mex += 1
        g[n] = mex
    return g

print("moves {1,3,4}:", grundy(20, (1, 3, 4)))` }],
    codeTitle: ['Grundy numbers and the Nim winning move (Java)', 'Brute-force proof check (Python)'],
    viz: [{
      title: 'Grundy numbers with mex (subtraction game)',
      input: '1 3 4 | 14',
      inputLabel: 'allowed moves | largest pile N (moves 1–9, at most 4 of them; N ≤ 25)',
      gen: function (input) {
        var parts = String(input || '').split('|');
        if (parts.length !== 2) throw new Error('Format: "1 3 4 | 14" (moves | N)');
        var mv = nums(parts[0], 1, 4, 'Moves: 1 to 4 integers between 1 and 9, e.g. "1 3 4 | 14"');
        var N = nums(parts[1], 1, 1, 'N must be one integer, e.g. "1 3 4 | 14"')[0];
        if (mv.some(function (m) { return m < 1 || m > 9; })) throw new Error('Each move must be between 1 and 9');
        if (N < 3 || N > 25) throw new Error('N must be between 3 and 25');
        var g = [0], frames = [];
        frames.push({ narr: 'Pile of 0 stones: no move is possible, so the player to move <b>loses</b>. g(0) = mex{} = <b>0</b>. Allowed moves: remove ' + mv.join(', ') + ' stones.', parts: [
          { type: 'array', label: 'g(n)', values: [0], hl: { 0: 'bad' } },
          { type: 'set', label: 'reachable Grundy values', items: [] }
        ] });
        for (var n = 1; n <= N; n++) {
          var reach = [], hl = {};
          mv.forEach(function (m) { if (m <= n) { hl[n - m] = 'win'; if (reach.indexOf(g[n - m]) < 0) reach.push(g[n - m]); } });
          reach.sort(function (a, b) { return a - b; });
          var mex = 0; while (reach.indexOf(mex) >= 0) mex++;
          g.push(mex);
          hl[n] = mex === 0 ? 'bad' : 'ok';
          var sh = {}; reach.forEach(function (r) { sh[String(r)] = 'win'; });
          frames.push({ narr: 'Pile ' + n + ': moves reach piles ' + mv.filter(function (m) { return m <= n; }).map(function (m) { return n - m; }).join(', ') + ' with Grundy values {' + reach.join(', ') + '}. Smallest missing value: <b>mex = ' + mex + '</b>. ' + (mex === 0 ? '<span class="c-r">g = 0 → losing for the player to move (every move gives the opponent a non-zero position).</span>' : '<span class="c-g">g ≠ 0 → winning: move to a position with g = 0.</span>'), parts: [
            { type: 'array', label: 'g(n)  (blue = positions reachable from ' + n + ')', values: g.slice(), hl: hl },
            { type: 'set', label: 'reachable Grundy values', items: reach.map(String), hl: sh },
            { type: 'vars', vals: { n: n, mex: mex }, hl: { mex: mex === 0 ? 'bad' : 'ok' } }
          ] });
        }
        var losing = []; g.forEach(function (x, i) { if (x === 0) losing.push(i); });
        frames.push({ narr: 'Losing piles (g = 0): <b>' + losing.join(', ') + '</b>. Look for a repeating pattern in g — subtraction games are always eventually periodic, so one table answers n up to 10<sup>18</sup>. For several piles, XOR their g values.', parts: [
          { type: 'array', label: 'final g(0..' + N + ')', values: g.slice(), hl: (function () { var h = {}; losing.forEach(function (i) { h[i] = 'bad'; }); return h; })() },
          { type: 'set', label: 'P-positions (mover loses)', items: losing.map(String) }
        ] });
        return frames;
      }
    }, {
      title: 'Nim: XOR the heaps, then find the winning move',
      input: '3 4 5',
      inputLabel: 'heap sizes (2–6 heaps, each 0–63)',
      gen: function (input) {
        var h = nums(input, 2, 6, 'Enter 2 to 6 heap sizes like "3 4 5"');
        if (h.some(function (x) { return x < 0 || x > 63; })) throw new Error('Heap sizes must be between 0 and 63');
        var frames = [], x = 0;
        frames.push({ narr: 'Heaps: ' + h.join(', ') + '. Bouton: the player to move loses exactly when the XOR of all heaps is 0. Let us XOR them one by one.', parts: [
          { type: 'array', label: 'heaps', values: h.slice() }, { type: 'bits', label: 'running XOR', value: 0, width: 6 }
        ] });
        for (var i = 0; i < h.length; i++) {
          var before = x; x ^= h[i];
          frames.push({ narr: 'XOR in heap ' + i + ' (' + h[i] + '): ' + before + ' ⊕ ' + h[i] + ' = <b>' + x + '</b>. Each bit column counts heaps with that bit set — XOR keeps only the columns with an odd count.', parts: [
            { type: 'array', label: 'heaps', values: h.slice(), hl: one(i, 'cur') },
            { type: 'bits', label: 'heap ' + i, value: h[i], width: 6 },
            { type: 'bits', label: 'running XOR', value: x, width: 6 }
          ] });
        }
        if (x === 0) {
          frames.push({ narr: 'Total XOR = 0 → <span class="c-r"><b>the first player loses</b></span> against perfect play. Any move changes exactly one heap, which flips some bit column to odd, so the opponent always receives XOR ≠ 0 and can restore 0.', parts: [
            { type: 'bits', label: 'total XOR', value: 0, width: 6 }, { type: 'vars', vals: { verdict: 'second player wins' }, hl: { verdict: 'bad' } }
          ] });
          return frames;
        }
        var top = 0; while ((1 << (top + 1)) <= x) top++;
        var pick = -1;
        for (var j = 0; j < h.length; j++) if ((h[j] ^ x) < h[j]) { pick = j; break; }
        var tgt = h[pick] ^ x, hb = {}; hb[top] = 'cur';
        frames.push({ narr: 'XOR = ' + x + ' ≠ 0 → <span class="c-g"><b>first player wins</b></span>. Its highest set bit is bit ' + top + '. Heap ' + pick + ' (' + h[pick] + ') has that bit, so ' + h[pick] + ' ⊕ ' + x + ' = ' + tgt + ' is smaller — a legal move.', parts: [
            { type: 'bits', label: 'total XOR', value: x, width: 6, hl: hb },
            { type: 'bits', label: 'heap ' + pick, value: h[pick], width: 6, hl: hb },
            { type: 'array', label: 'heaps', values: h.slice(), hl: one(pick, 'sel') }
        ] });
        var after = h.slice(); after[pick] = tgt;
        var chk = after.reduce(function (a, b) { return a ^ b; }, 0);
        frames.push({ narr: 'Take <b>' + (h[pick] - tgt) + '</b> from heap ' + pick + ' (' + h[pick] + ' → ' + tgt + '). New XOR = ' + chk + ': the opponent now faces a losing position, and we can repeat this every turn until we take the last stone.', parts: [
          { type: 'array', label: 'heaps after the winning move', values: after, hl: one(pick, 'ok') },
          { type: 'bits', label: 'new XOR', value: chk, width: 6 }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Nim Game (LeetCode 292): take 1–3 stones', html: `<p>Positions 0, 4, 8, 12, … are losing: from 4k every move (1, 2, 3) can be answered by taking 4 minus that. So the first player wins iff <b>n % 4 ≠ 0</b>. In Grundy terms g(n) = n mod 4 — a "take 1..k" game is just a Nim heap of size n mod (k+1).</p>` },
      { title: 'Sum of two subtraction games', html: `<p>Moves {1, 3, 4}, piles 5 and 6. From the table g(5) = 3, g(6) = 2. XOR = 1 ≠ 0 → first player wins. Winning move: make the XOR 0 by moving pile 5 to a position with g = 2 (since 2 ⊕ 2 = 0): from 5, removing 1 reaches 4 with g(4) = 2 ✓.</p>` },
      { title: 'Misère Nim (last mover LOSES)', html: `<p>Play exactly like normal Nim, <b>except</b> when your move would leave only heaps of size 1: then leave an <b>odd</b> number of them. Result: if all heaps are ≤ 1, the first player wins iff the number of 1-heaps is even; otherwise the normal rule (XOR ≠ 0 → win) still applies. Example (1, 1, 1): three 1-heaps (odd) → first player loses.</p>` },
      { title: "Staircase Nim", html: `<p>Coins on steps 1..n; a move pushes any number of coins from step i down to step i−1 (step 0 is the floor). Only <b>odd</b> steps matter: the game equals Nim on the odd-step piles, because a move from an even step can be "undone" by pushing the same coins one step further. Steps (3, 1, 4): odd steps 1 and 3 hold 3 and 4 → XOR = 7 ≠ 0 → first player wins.</p>` }
    ],
    deepDive: `<p><b>Why Nim's XOR rule works.</b> (1) From XOR = 0, any move changes one heap, so the XOR becomes non-zero. (2) From XOR = X ≠ 0, take X's highest set bit; some heap has that bit, and heap ⊕ X clears it, so it is smaller — a legal move to XOR 0. (3) The terminal position has XOR 0. So "XOR = 0" positions are exactly the P-positions.</p>
      <p><b>Why Sprague–Grundy works.</b> A position with Grundy value g behaves like a Nim heap of size g: you can move to any smaller value (mex guarantees every value below g is reachable), and moves to larger values can be immediately reversed by the opponent, so they never help. Replacing every component by its "Nim heap" turns the sum into Nim, hence XOR.</p>
      <p><b>Computing Grundy values efficiently.</b> mex of a set of size d is ≤ d, so use a small boolean array (or a timestamped array to avoid re-allocation). For games whose moves split one pile into two (Grundy's game, Kayles), a move's value is g(a) ⊕ g(b), and the cost is O(n²). Subtraction games with a finite move set are eventually periodic — compute until a period repeats (verify over a window of size max move), then answer n = 10<sup>18</sup> in O(1). Splitting games may <i>not</i> be periodic (Grundy's game is conjectured but unproven).</p>
      <p><b>When Grundy does not apply.</b> Partizan games (players have different moves, e.g. chess, Go) and scoring games (maximise your total: "Stone Game", "Predict the Winner") need minimax DP over states — typically dp[i][j] = best score difference on an interval. Games with cycles need retrograde analysis with "draw" states (e.g. Cat and Mouse): process positions backwards from known results using a queue and degree counters.</p>
      <p><b>Real-world relevance.</b> Game-solving engines for chess endgames (tablebases) use exactly this backward labelling of win/lose positions over billions of states. In ML, AlphaZero-style agents approximate the same P/N labels with a neural network when the state space is too large to enumerate.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant can instantly write a memoised win/lose search for small inputs — use that! The modern workflow is: brute force small states with AI-generated code, print the table, <i>spot the pattern</i> (period, XOR, parity), then prove it with the P/N rules.</p>
      <p><b>Use AI as a partner:</b> <code>"Write a memoised minimax for this game for all states up to size 30 and print which are losing"</code>, then <code>"Compare my O(1) formula with that table"</code>. This is exactly how researchers and competitive programmers discover game formulas.</p>
      <p><b>Where AI goes wrong:</b> applies XOR to scoring games (Stone Game) where it means nothing; confuses misère and normal play; claims a period from too few terms; forgets that Sprague–Grundy needs <i>independent</i> components (a move must touch exactly one pile); or treats "player who takes the last stone loses" with the normal-play rule.</p>
      <p><b>What you must still own:</b> classifying the game (impartial? normal play? independent sum?), the P/N definitions, mex, and the short proof of the Nim XOR rule.</p>`,
    problems: [{
      title: 'Multi-Pile Subtraction Game: Who Wins?',
      level: 'Hard', tags: ['game theory', 'sprague-grundy', 'xor'], companies: ['Codeforces-style', 'CodeChef', 'Google'],
      statement: `<p>There are n piles. A move: choose one pile and remove exactly s stones from it, where s must belong to a given set S (and the pile must have at least s stones). Players alternate; the player who cannot move loses. Return "First" if the first player wins with perfect play, otherwise "Second".</p>`,
      constraints: `1 ≤ n ≤ 10<sup>5</sup>, 0 ≤ pile ≤ 10<sup>5</sup>, 1 ≤ |S| ≤ 10, 1 ≤ s ≤ 10<sup>5</sup>`,
      example: `<p>S = {1, 3, 4}, piles [5, 6] → g(5) ⊕ g(6) = 3 ⊕ 2 = 1 → ${H.c('g', 'First')}. S = {1, 3, 4}, piles [2, 7] → 0 ⊕ 0 = 0 → ${H.c('r', 'Second')}.</p>`,
      brute: { why: `<p>Search the full game tree over the tuple of all pile sizes with memoisation. The number of states is the product of (pile + 1) over all piles — astronomically large for 10<sup>5</sup> piles. The waste: the piles are independent, but the brute force treats the whole tuple as one state.</p>`, code: `// Memoised win/lose over the whole tuple: only feasible for 2-3 tiny piles
static Map<String, Boolean> memo = new HashMap<>();
static boolean firstWins(int[] piles, int[] S) {
    String key = Arrays.toString(piles);
    if (memo.containsKey(key)) return memo.get(key);
    boolean win = false;
    for (int i = 0; i < piles.length && !win; i++)
        for (int s : S)
            if (piles[i] >= s) {
                piles[i] -= s;
                boolean oppWins = firstWins(piles, S);
                piles[i] += s;
                if (!oppWins) { win = true; break; }   // found a move to a losing position
            }
    memo.put(key, win);
    return win;
}` },
      mcq: { q: 'g values of three independent piles are 2, 3 and 1. What is the verdict?', options: ['Second player wins (2 ⊕ 3 ⊕ 1 = 0)', 'First player wins (sum 6 ≠ 0)', 'First player wins (max is 3)', 'Cannot tell without the full game tree'], answer: 0, explain: 'Sprague–Grundy: the combined Grundy number is the XOR, 2 ⊕ 3 ⊕ 1 = 0, so the player to move loses. Sum and max mean nothing here.' },
      hints: [`<p>Hint 1: Each pile is its own little game; a move touches exactly one pile. That is a sum of games → Sprague–Grundy.</p>`, `<p>Hint 2: Compute g(0..maxPile) once: g(x) = mex{ g(x − s) : s ∈ S, s ≤ x }. Then XOR g(pile) over all piles.</p>`, `<p>Hint 3: mex ≤ |S|, so a boolean array of size |S|+2 per x suffices → O(maxPile·|S|). XOR ≠ 0 → "First", else "Second". Pile 0 has g = 0 and does not change the XOR.</p>`],
      solution: {
        approach: `<p>Compute Grundy numbers for a single pile up to the largest pile with the mex rule, then XOR the Grundy numbers of all piles (Sprague–Grundy). Non-zero → first player wins.</p>`,
        code: `class Solution {
    public String winner(int[] piles, int[] S) {
        int max = 0;
        for (int p : piles) max = Math.max(max, p);
        int[] g = new int[max + 1];
        for (int x = 1; x <= max; x++) {
            boolean[] seen = new boolean[S.length + 2];
            for (int s : S)
                if (s <= x && g[x - s] < seen.length) seen[g[x - s]] = true;
            int mex = 0;
            while (seen[mex]) mex++;
            g[x] = mex;
        }
        int xor = 0;
        for (int p : piles) xor ^= g[p];
        return xor != 0 ? "First" : "Second";
    }
}`,
        dry: { head: ['x', 'reachable g', 'g(x) = mex'], rows: [
          ['0', '{}', '0'], ['1', '{g0} = {0}', '1'], ['2', '{g1} = {1}', '0'], ['3', '{g2, g0} = {0}', '1'], ['4', '{g3, g1, g0} = {1, 0}', '2'], ['5', '{g4, g2, g1} = {2, 0, 1}', '3'], ['6', '{g5, g3, g2} = {3, 1, 0}', '2'], ['piles [5, 6]', '3 ⊕ 2', '<b>1 → First</b>']
        ] },
        complexity: `<p>O(maxPile · |S|) to build the table plus O(n) for the XOR; O(maxPile) memory.</p>`,
        followUps: ['Piles up to 10<sup>18</sup>: detect the period of g and use x mod period.', 'Return the actual winning move (which pile, how many stones).', 'Misère version: the player who takes the last stone loses.']
      }
    }]
  });

  // =====================================================================
  // PRACTICE — Easy
  // =====================================================================
  practice.push({
    title: 'Nim Game (take 1–3 stones)',
    level: 'Easy', tags: ['game theory', 'math'], companies: ['Adobe', 'LeetCode 292'],
    statement: `<p>There is one heap of n stones. You and a friend alternate turns, <b>you first</b>. Each turn removes 1, 2 or 3 stones. Whoever removes the last stone wins. Both play optimally. Return true if you win.</p>`,
    constraints: `1 ≤ n ≤ 2<sup>31</sup> − 1`,
    example: `<p>n = 4 → ${H.c('r', 'false')}: whatever you take (1, 2 or 3), your friend takes the rest. n = 5 → ${H.c('g', 'true')}: take 1, leaving your friend the losing 4.</p>`,
    brute: { why: `<p>DP over all n: win[i] = !win[i−1] || !win[i−2] || !win[i−3]. Correct, but O(n) time and memory — 2·10<sup>9</sup> booleans is 2 GB. The table, if you print it, screams a pattern.</p>`, code: `static boolean brute(int n) {
    boolean[] win = new boolean[n + 1];        // win[0] = false: no stones, you already lost
    for (int i = 1; i <= n; i++)
        for (int take = 1; take <= 3 && take <= i; take++)
            if (!win[i - take]) { win[i] = true; break; }
    return win[n];
}` },
    mcq: { q: 'Which heap sizes are losing for the player to move?', options: ['Multiples of 4', 'Multiples of 3', 'Odd numbers', 'Powers of 2'], answer: 0, explain: 'From 4k every move leaves 4k−1, 4k−2 or 4k−3, and the opponent restores a multiple of 4.' },
    hints: [`<p>Hint 1: Label 0 as losing, then 1, 2, 3 as winning (take everything). What about 4?</p>`, `<p>Hint 2: Every move from 4 lands on 1, 2 or 3 — all winning for the opponent. The pattern repeats every 4.</p>`, `<p>Hint 3: Return n % 4 != 0. Strategy: always take n % 4 stones.</p>`],
    solution: {
      approach: `<p>P-positions are exactly the multiples of 4 (Grundy value n mod 4). You win iff n is not a multiple of 4.</p>`,
      code: `class Solution {
    public boolean canWinNim(int n) {
        return n % 4 != 0;      // multiples of 4 are the losing (P) positions
    }
}`,
      dry: { head: ['n', 'moves lead to', 'label'], rows: [['0', '—', 'P (lose)'], ['1, 2, 3', 'can reach 0', 'N (win)'], ['4', '3, 2, 1 (all N)', 'P'], ['5', 'can reach 4', 'N']] },
      complexity: `<p>O(1) time and space.</p>`,
      followUps: ['Allowed removals are 1..k.', 'Several heaps at once.']
    }
  });

  practice.push({
    title: 'Modular Inverse Modulo a Prime',
    level: 'Easy', tags: ['modular inverse', 'fast power'], companies: ['Codeforces-style'],
    statement: `<p>Given an integer a and a prime p, return x in [0, p) with a·x ≡ 1 (mod p), or −1 if it does not exist.</p>`,
    constraints: `−10<sup>18</sup> ≤ a ≤ 10<sup>18</sup>, 2 ≤ p ≤ 2·10<sup>9</sup>, p prime`,
    example: `<p>a = 3, p = 7 → ${H.c('g', '5')} (15 ≡ 1). a = 14, p = 7 → ${H.c('r', '−1')} (14 ≡ 0 has no inverse). a = −2, p = 7 → 3 (−2 ≡ 5, and 5·3 = 15 ≡ 1).</p>`,
    brute: { why: `<p>Try every x from 1 to p−1: O(p) = 2·10<sup>9</sup> multiplications. Fermat gives the answer directly in about 31 squarings.</p>`, code: `static long brute(long a, long p) {
    long r = Math.floorMod(a, p);
    for (long x = 1; x < p; x++) if (r * x % p == 1) return x;
    return -1;
}` },
    mcq: { q: 'Why must a be reduced with floorMod before calling power(a, p − 2, p)?', options: ['Java % can return a negative value, and a ≡ 0 must be detected', 'Fermat requires a &lt; 10', 'To make p prime', 'It is not necessary'], answer: 0, explain: 'A negative base breaks the "result in [0, p)" contract, and a ≡ 0 (mod p) must return −1 instead of 0.' },
    hints: [`<p>Hint 1: Fermat: a<sup>p−1</sup> ≡ 1 for p ∤ a, so a<sup>p−2</sup> is the inverse.</p>`, `<p>Hint 2: Reduce a first: r = floorMod(a, p). If r == 0, there is no inverse.</p>`, `<p>Hint 3: p up to 2·10<sup>9</sup> → products up to 4·10<sup>18</sup> still fit in a signed long (&lt; 9.2·10<sup>18</sup>). Fast power with % after each multiply.</p>`],
    solution: {
      approach: `<p>Normalise a into [0, p). Zero has no inverse. Otherwise return a<sup>p−2</sup> mod p by binary exponentiation.</p>`,
      code: `class Solution {
    long power(long b, long e, long m) {
        long r = 1 % m; b %= m;
        while (e > 0) {
            if ((e & 1) == 1) r = r * b % m;
            b = b * b % m;
            e >>= 1;
        }
        return r;
    }
    public long inverse(long a, long p) {
        long r = Math.floorMod(a, p);
        if (r == 0) return -1;
        return power(r, p - 2, p);
    }
}`,
      dry: { head: ['exp bit', 'base', 'result'], rows: [['p−2 = 5 = 101₂, bit0 = 1', '3', '3'], ['bit1 = 0', '9 ≡ 2', '3'], ['bit2 = 1', '4', '3·4 = 12 ≡ <b>5</b>']] },
      complexity: `<p>O(log p) time, O(1) space.</p>`,
      followUps: ['p is not prime — switch to Extended Euclid.', 'Invert 10<sup>6</sup> different values fast (batch inversion).']
    }
  });

  practice.push({
    title: 'Count Numbers Divisible by A or B',
    level: 'Easy', tags: ['inclusion-exclusion', 'lcm'], companies: ['Amazon', 'TCS'],
    statement: `<p>Given N, A and B, count the integers in [1, N] divisible by A or by B (or both).</p>`,
    constraints: `1 ≤ N ≤ 10<sup>18</sup>, 1 ≤ A, B ≤ 10<sup>9</sup>`,
    example: `<p>N = 20, A = 4, B = 6 → 5 + 3 − ⌊20/12⌋ = ${H.c('g', '7')} (4, 6, 8, 12, 16, 18, 20). Using 24 instead of lcm 12 would wrongly give 8.</p>`,
    brute: { why: `<p>Loop 1..N testing both divisibilities: O(N) — impossible for N = 10<sup>18</sup>.</p>`, code: `static long brute(long N, long A, long B) {
    long c = 0;
    for (long x = 1; x <= N; x++) if (x % A == 0 || x % B == 0) c++;
    return c;
}` },
    mcq: { q: 'How many numbers in [1, 20] are divisible by both 4 and 6?', options: ['1', '0', '2', '3'], answer: 0, explain: 'Divisible by both ⇔ divisible by lcm(4, 6) = 12 → only 12.' },
    hints: [`<p>Hint 1: Two overlapping groups: |A ∪ B| = |A| + |B| − |A ∩ B| (do not count the overlap twice).</p>`, `<p>Hint 2: Multiples of A in [1, N]: ⌊N/A⌋. Multiples of both: ⌊N/lcm(A, B)⌋.</p>`, `<p>Hint 3: lcm = A / gcd(A, B) · B (divide first). With A, B ≤ 10<sup>9</sup> the lcm ≤ 10<sup>18</sup> fits in a long.</p>`],
    solution: {
      approach: `<p>Two-set inclusion–exclusion with the lcm for the intersection.</p>`,
      code: `class Solution {
    long gcd(long a, long b) { return b == 0 ? a : gcd(b, a % b); }
    public long count(long N, long A, long B) {
        long lcm = A / gcd(A, B) * B;            // divide first to avoid overflow
        return N / A + N / B - N / lcm;
    }
}`,
      dry: { head: ['term', 'value'], rows: [['⌊20/4⌋', '5'], ['⌊20/6⌋', '3'], ['lcm(4,6) = 12 → ⌊20/12⌋', '1'], ['5 + 3 − 1', '<b>7</b>']] },
      complexity: `<p>O(log min(A, B)) for the gcd; O(1) space.</p>`,
      followUps: ['Three numbers A, B, C.', 'Count numbers divisible by exactly one of them.']
    }
  });

  practice.push({
    title: "Euler's Totient of a Single Number",
    level: 'Easy', tags: ['euler totient', 'factorization'], companies: ['Codeforces-style', 'SPOJ ETF'],
    statement: `<p>Given n, return φ(n): how many integers in [1, n] have gcd 1 with n.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>12</sup>`,
    example: `<p>n = 36 → ${H.c('g', '12')}. n = 1 → 1. n = 97 → 96 (prime). n = 10<sup>12</sup> = 2<sup>12</sup>·5<sup>12</sup> → 10<sup>12</sup>·½·⅘ = 4·10<sup>11</sup>.</p>`,
    brute: { why: `<p>Count gcd(i, n) == 1 for all i ≤ n: O(n log n) — 10<sup>12</sup> gcds is hours. The formula only needs the distinct prime factors, found by trial division up to √n = 10<sup>6</sup>.</p>`, code: `static long brute(long n) {
    long c = 0;
    for (long i = 1; i <= n; i++) if (gcd(i, n) == 1) c++;
    return c;
}
static long gcd(long a, long b) { return b == 0 ? a : gcd(b, a % b); }` },
    mcq: { q: 'After the loop "p·p ≤ n" ends, n is still 97. What does that mean?', options: ['97 is a prime factor of the original n and must be applied', 'n was prime from the start, so φ = n', 'Nothing, ignore it', 'There is a bug'], answer: 0, explain: 'Every prime ≤ √(remaining n) was stripped, so a leftover > 1 is a single prime factor. Apply result −= result / 97.' },
    hints: [`<p>Hint 1: φ(n) = n·∏(1 − 1/p) over distinct primes p | n.</p>`, `<p>Hint 2: Trial divide by p while p·p ≤ n; on a hit, strip all copies of p and do result −= result / p.</p>`, `<p>Hint 3: Do not forget the leftover prime when n &gt; 1 after the loop. Use long everywhere.</p>`],
    solution: {
      approach: `<p>Factor by trial division in O(√n) and apply the product formula in integer form.</p>`,
      code: `class Solution {
    public long phi(long n) {
        long result = n;
        for (long p = 2; p * p <= n; p++) {
            if (n % p == 0) {
                while (n % p == 0) n /= p;
                result -= result / p;
            }
        }
        if (n > 1) result -= result / n;     // one prime factor larger than sqrt remains
        return result;
    }
}`,
      dry: { head: ['p', 'n after strip', 'result'], rows: [['start', '36', '36'], ['2', '9', '36 − 18 = 18'], ['3', '1', '18 − 6 = <b>12</b>']] },
      complexity: `<p>O(√n) time, O(1) space.</p>`,
      followUps: ['φ for all numbers up to 10<sup>7</sup>.', 'n up to 10<sup>18</sup> (Pollard rho).']
    }
  });

  // =====================================================================
  // PRACTICE — Medium
  // =====================================================================
  practice.push({
    title: 'Water and Jug Problem',
    level: 'Medium', tags: ['bezout', 'gcd', 'math'], companies: ['Microsoft', 'LeetCode 365'],
    statement: `<p>You have two jugs with capacities x and y litres and unlimited water. Operations: fill a jug, empty a jug, pour one jug into the other until one is empty or the other is full. Can you end with exactly <code>target</code> litres in the two jugs together?</p>`,
    constraints: `1 ≤ x, y, target ≤ 10<sup>3</sup> (the math answer works up to 10<sup>18</sup>)`,
    example: `<p>x = 3, y = 5, target = 4 → ${H.c('g', 'true')} (5·2 − 3·2 = 4). x = 2, y = 6, target = 5 → ${H.c('r', 'false')} (everything stays even).</p>`,
    brute: { why: `<p>BFS over states (a, b) with 0 ≤ a ≤ x, 0 ≤ b ≤ y and 6 operations each: O(x·y) states = 10<sup>6</sup> — fine here, but useless for big capacities and it hides the elegant reason.</p>`, code: `static boolean brute(int x, int y, int target) {
    if (target > x + y) return false;
    boolean[][] seen = new boolean[x + 1][y + 1];
    Deque<int[]> q = new ArrayDeque<>();
    q.add(new int[]{0, 0}); seen[0][0] = true;
    while (!q.isEmpty()) {
        int[] s = q.poll();
        int a = s[0], b = s[1];
        if (a + b == target) return true;
        int pourAB = Math.min(a, y - b), pourBA = Math.min(b, x - a);
        int[][] next = {{x, b}, {a, y}, {0, b}, {a, 0}, {a - pourAB, b + pourAB}, {a + pourBA, b - pourBA}};
        for (int[] n : next)
            if (!seen[n[0]][n[1]]) { seen[n[0]][n[1]] = true; q.add(n); }
    }
    return false;
}` },
    mcq: { q: 'x = 6, y = 10. Which target is reachable?', options: ['8', '7', '17', '5'], answer: 0, explain: 'gcd(6, 10) = 2, so only even amounts ≤ 16 are possible: 8 yes; 7 and 5 are odd; 17 > 16.' },
    hints: [`<p>Hint 1: Every operation changes the total by ±x, ±y or 0. So the total is always a·x + b·y for integers a, b.</p>`, `<p>Hint 2: Bezout: a·x + b·y can be exactly the multiples of gcd(x, y).</p>`, `<p>Hint 3: Also the total can never exceed x + y. Answer: target ≤ x + y and target % gcd(x, y) == 0.</p>`],
    solution: {
      approach: `<p>Reachable totals are exactly the multiples of gcd(x, y) between 0 and x + y (Bezout + the pouring simulation that realises any such combination).</p>`,
      code: `class Solution {
    int gcd(int a, int b) { return b == 0 ? a : gcd(b, a % b); }
    public boolean canMeasureWater(int x, int y, int target) {
        if (target > x + y) return false;          // the jugs cannot hold more
        return target % gcd(x, y) == 0;            // Bezout: multiples of gcd only
    }
}`,
      dry: { head: ['step', '3 L jug', '5 L jug'], rows: [['fill 5', '0', '5'], ['pour 5→3', '3', '2'], ['empty 3', '0', '2'], ['pour 5→3', '2', '0'], ['fill 5', '2', '5'], ['pour 5→3', '3', '4'], ['empty 3', '0', '<b>4</b> (total 4 ✓)']] },
      complexity: `<p>O(log min(x, y)) time, O(1) space.</p>`,
      followUps: ['Return the minimum number of operations.', 'Three jugs.']
    }
  });

  practice.push({
    title: 'Ugly Number III (k-th number divisible by a, b or c)',
    level: 'Medium', tags: ['inclusion-exclusion', 'binary search', 'lcm'], companies: ['Amazon', 'Google', 'LeetCode 1201'],
    statement: `<p>An "ugly number" here is a positive integer divisible by a, b or c. Return the n-th ugly number.</p>`,
    constraints: `1 ≤ n, a, b, c ≤ 10<sup>9</sup>, 1 ≤ a·b·c ≤ 10<sup>18</sup>, the answer is in [1, 2·10<sup>9</sup>]`,
    example: `<p>n = 3, a = 2, b = 3, c = 5 → sequence 2, 3, 4, 5, 6, … → ${H.c('g', '4')}. n = 4, a = 2, b = 3, c = 4 → 2, 3, 4, 6 → ${H.c('g', '6')}.</p>`,
    brute: { why: `<p>Walk x = 1, 2, 3, … counting ugly numbers until the n-th: up to 2·10<sup>9</sup> steps. Better than nothing, but binary search + an O(1) count is ~31 steps.</p>`, code: `static long brute(int n, long a, long b, long c) {
    int found = 0;
    for (long x = 1; ; x++) {
        if (x % a == 0 || x % b == 0 || x % c == 0) found++;
        if (found == n) return x;
    }
}` },
    mcq: { q: 'Why can we binary search on the answer?', options: ['count(x) = how many ugly numbers ≤ x never decreases as x grows', 'The ugly numbers are evenly spaced', 'a, b, c are primes', 'Because n ≤ 10<sup>9</sup>'], answer: 0, explain: 'A monotone count lets us find the smallest x with count(x) ≥ n. That x is the n-th ugly number.' },
    hints: [`<p>Hint 1: count(x) = ⌊x/a⌋ + ⌊x/b⌋ + ⌊x/c⌋ − ⌊x/lcm(a,b)⌋ − ⌊x/lcm(a,c)⌋ − ⌊x/lcm(b,c)⌋ + ⌊x/lcm(a,b,c)⌋.</p>`, `<p>Hint 2: Binary search the smallest x in [1, 2·10<sup>9</sup>] with count(x) ≥ n.</p>`, `<p>Hint 3: lcms can reach 10<sup>18</sup>: compute with long and divide before multiplying.</p>`],
    solution: {
      approach: `<p>Lower-bound binary search on x with a three-set inclusion–exclusion count. The smallest x with count ≥ n is itself ugly.</p>`,
      code: `class Solution {
    long gcd(long a, long b) { return b == 0 ? a : gcd(b, a % b); }
    long lcm(long a, long b) { return a / gcd(a, b) * b; }

    public int nthUglyNumber(int n, int a, int b, int c) {
        long ab = lcm(a, b), ac = lcm(a, c), bc = lcm(b, c), abc = lcm(ab, c);
        long lo = 1, hi = 2_000_000_000L;
        while (lo < hi) {
            long mid = lo + (hi - lo) / 2;
            long cnt = mid / a + mid / b + mid / c - mid / ab - mid / ac - mid / bc + mid / abc;
            if (cnt >= n) hi = mid;        // mid might be the answer: keep it
            else lo = mid + 1;
        }
        return (int) lo;
    }
}`,
      dry: { head: ['mid (last few steps)', 'count (a,b,c = 2,3,5)', 'decision'], rows: [['5', '2+1+1−0−0−0+0 = 4', '≥ 3 → hi = 5'], ['3', '1+1+0 = 2', '&lt; 3 → lo = 4'], ['4', '2+1+0 = 3', '≥ 3 → hi = 4 → answer <b>4</b>']] },
      complexity: `<p>O(log(2·10<sup>9</sup>)) ≈ 31 iterations, O(1) space.</p>`,
      followUps: ['k numbers instead of 3 (bitmask inclusion–exclusion).', 'Magical Number (two numbers, answer mod 10<sup>9</sup>+7).']
    }
  });

  practice.push({
    title: 'Super Pow (a^b mod 1337 with a huge b)',
    level: 'Medium', tags: ['fast power', 'modular arithmetic', 'euler'], companies: ['Google', 'LeetCode 372'],
    statement: `<p>Compute a<sup>b</sup> mod 1337 where b is given as an array of decimal digits (most significant first).</p>`,
    constraints: `1 ≤ a ≤ 2<sup>31</sup> − 1, 1 ≤ b.length ≤ 2000, b has no leading zeros`,
    example: `<p>a = 2, b = [1, 0] → 2<sup>10</sup> mod 1337 = ${H.c('g', '1024')}. a = 2147483647, b = [2, 0, 0] → 1198.</p>`,
    brute: { why: `<p>Turn b into a number and multiply a by itself b times. b has up to 2000 digits — the loop would outlive the universe, and the number does not even fit in a long.</p>`, code: `static int brute(int a, int[] b) {
    // only valid when b fits in a long (a handful of digits)
    long e = 0;
    for (int d : b) e = e * 10 + d;
    long r = 1, base = a % 1337;
    for (long i = 0; i < e; i++) r = r * base % 1337;
    return (int) r;
}` },
    mcq: { q: 'If b = 10·q + d, then a<sup>b</sup> equals…', options: ['(a<sup>q</sup>)<sup>10</sup> · a<sup>d</sup>', 'a<sup>q</sup> · a<sup>10d</sup>', '(a<sup>10</sup>)<sup>d</sup> · a<sup>q</sup>', 'a<sup>q+d</sup>'], answer: 0, explain: 'a<sup>10q + d</sup> = (a<sup>q</sup>)<sup>10</sup>·a<sup>d</sup>. Process digits left to right: result = result<sup>10</sup>·a<sup>digit</sup>.' },
    hints: [`<p>Hint 1: Reading digits left to right, b goes q → 10q + d. So result goes r → r<sup>10</sup>·a<sup>d</sup> (Horner's rule for exponents).</p>`, `<p>Hint 2: Each step is two small fast powers mod 1337. Total 2000 steps.</p>`, `<p>Hint 3: Alternative: Euler. 1337 = 7·191, φ = 6·190 = 1140. But gcd(a, 1337) may be &gt; 1, so use the safe form b mod 1140 + 1140 when b ≥ 1140 — the digit method avoids this subtlety.</p>`],
    solution: {
      approach: `<p>Horner's rule on the exponent: process digits of b left to right, keeping r = a<sup>(prefix of b)</sup> mod 1337, updated by r = r<sup>10</sup> · a<sup>d</sup>.</p>`,
      code: `class Solution {
    static final int MOD = 1337;
    int pow(int base, int e) {
        int r = 1; base %= MOD;
        while (e > 0) {
            if ((e & 1) == 1) r = r * base % MOD;     // values < 1337, products < 2^21: int is safe
            base = base * base % MOD;
            e >>= 1;
        }
        return r;
    }
    public int superPow(int a, int[] b) {
        int r = 1;
        for (int d : b) r = pow(r, 10) * pow(a, d) % MOD;
        return r;
    }
}`,
      dry: { head: ['digit', 'r = r^10 · 2^d mod 1337'], rows: [['start', '1'], ['1', '1 · 2 = 2'], ['0', '2^10 · 1 = 1024 → <b>1024</b>']] },
      complexity: `<p>O(len(b) · log 10) multiplications, O(1) space.</p>`,
      followUps: ['Modulus is a large prime p: reduce b mod (p−1) digit by digit.', 'Power tower a<sup>b<sup>c</sup></sup> mod m (generalised Euler).']
    }
  });

  practice.push({
    title: 'Knight Probability in Chessboard',
    level: 'Medium', tags: ['probability', 'dynamic programming'], companies: ['Google', 'Goldman Sachs', 'LeetCode 688'],
    statement: `<p>A knight starts at (row, column) on an n×n board and makes exactly k moves, each chosen uniformly among its 8 knight moves (even ones that leave the board). Once it leaves, it stops. Return the probability that it is still on the board after k moves.</p>`,
    constraints: `1 ≤ n ≤ 25, 0 ≤ k ≤ 100, 0 ≤ row, column &lt; n`,
    example: `<p>n = 3, k = 2, start (0, 0) → ${H.c('g', '0.0625')}: 2 of 8 first moves stay on, and from each of those, 2 of 8 again: (2/8)·(2/8) = 1/16.</p>`,
    brute: { why: `<p>Enumerate all 8<sup>k</sup> move sequences and count the ones that stay on: for k = 100 that is 8<sup>100</sup>. The waste: many sequences reach the same (cell, steps left) state.</p>`, code: `static final int[][] D = {{1,2},{2,1},{-1,2},{-2,1},{1,-2},{2,-1},{-1,-2},{-2,-1}};
static double brute(int n, int k, int r, int c) {
    if (r < 0 || c < 0 || r >= n || c >= n) return 0;   // fell off
    if (k == 0) return 1;
    double p = 0;
    for (int[] d : D) p += brute(n, k - 1, r + d[0], c + d[1]) / 8.0;   // exponential
    return p;
}` },
    mcq: { q: 'What is the right DP state?', options: ['(steps done, row, col) → probability of being there', '(row, col) only', 'number of moves left only', 'the whole path'], answer: 0, explain: 'Probability mass on each cell after s steps is all we need; the next layer only depends on the current one.' },
    hints: [`<p>Hint 1: Let dp[r][c] = probability of standing on (r, c) after the current number of moves. Start with dp[row][col] = 1.</p>`, `<p>Hint 2: For each move, push dp[r][c]/8 to each on-board knight target. Mass that leaves the board just disappears.</p>`, `<p>Hint 3: After k layers, sum the board. Two n×n arrays suffice. O(k·n²·8).</p>`],
    solution: {
      approach: `<p>Forward probability DP layer by layer: each cell spreads 1/8 of its probability to every on-board target. The answer is the total mass remaining after k layers.</p>`,
      code: `class Solution {
    static final int[][] D = {{1,2},{2,1},{-1,2},{-2,1},{1,-2},{2,-1},{-1,-2},{-2,-1}};
    public double knightProbability(int n, int k, int row, int column) {
        double[][] dp = new double[n][n];
        dp[row][column] = 1.0;
        for (int step = 0; step < k; step++) {
            double[][] next = new double[n][n];
            for (int r = 0; r < n; r++)
                for (int c = 0; c < n; c++) {
                    if (dp[r][c] == 0) continue;
                    for (int[] d : D) {
                        int nr = r + d[0], nc = c + d[1];
                        if (nr >= 0 && nc >= 0 && nr < n && nc < n) next[nr][nc] += dp[r][c] / 8.0;
                    }
                }
            dp = next;
        }
        double total = 0;
        for (double[] rowArr : dp) for (double v : rowArr) total += v;
        return total;
    }
}`,
      dry: { head: ['step', 'cells with mass (3×3, start (0,0))', 'total'], rows: [['0', '(0,0): 1', '1'], ['1', '(1,2): 1/8, (2,1): 1/8', '0.25'], ['2', '(0,0): 2/64 (reached from both), (2,0): 1/64, (0,2): 1/64', '4/64 = <b>0.0625</b>']] },
      complexity: `<p>O(k·n²·8) ≈ 100·625·8 = 5·10<sup>5</sup>; O(n²) memory.</p>`,
      followUps: ['k up to 10<sup>9</sup>: matrix power of a 625×625 transition is too big — what else?', 'Expected number of moves before falling off.']
    }
  });

  practice.push({
    title: 'Find the Derangement of an Array',
    level: 'Medium', tags: ['inclusion-exclusion', 'combinatorics', 'dp'], companies: ['IXL', 'LeetCode 634'],
    statement: `<p>An array holds 1..n in order. A derangement is a permutation where no element stays in its original position. Return the number of derangements mod 10<sup>9</sup>+7.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>6</sup>`,
    example: `<p>n = 3 → ${H.c('g', '2')}: [2,3,1] and [3,1,2]. n = 4 → 9.</p>`,
    brute: { why: `<p>Generate all n! permutations and test each: 10! = 3.6·10<sup>6</sup> is already the limit; n = 10<sup>6</sup> is unthinkable.</p>`, code: `static int brute(int[] perm, int pos, boolean[] used) {
    int n = perm.length;
    if (pos == n) return 1;
    int count = 0;
    for (int v = 1; v <= n; v++) {
        if (used[v] || v == pos + 1) continue;     // value v may not sit at its home index
        used[v] = true; perm[pos] = v;
        count += brute(perm, pos + 1, used);
        used[v] = false;
    }
    return count;
}` },
    mcq: { q: 'In D(n) = (n−1)(D(n−1) + D(n−2)), what does the factor (n−1) count?', options: ['Where element 1 goes (any of the other n−1 positions)', 'The number of fixed points', 'The number of cycles', 'Nothing — it is a coincidence'], answer: 0, explain: 'Element 1 goes to some position k ≠ 1 (n−1 choices). Then either k goes to 1 (swap: D(n−2)) or k may not go to 1 (behaves like a derangement of n−1: D(n−1)).' },
    hints: [`<p>Hint 1: Inclusion–exclusion: D(n) = ∑ (−1)<sup>i</sup> C(n, i)(n − i)! — or the simpler recurrence.</p>`, `<p>Hint 2: Put element 1 at position k (n−1 ways). Case A: k goes to position 1 → D(n−2). Case B: it does not → D(n−1).</p>`, `<p>Hint 3: D(1) = 0, D(2) = 1. Iterate with two variables, mod after every multiply, use long.</p>`],
    solution: {
      approach: `<p>Iterate the derangement recurrence D(n) = (n−1)(D(n−1) + D(n−2)) mod p with O(1) memory.</p>`,
      code: `class Solution {
    public int findDerangement(int n) {
        final long MOD = 1_000_000_007L;
        if (n == 1) return 0;
        long prev2 = 0, prev1 = 1;                 // D(1), D(2)
        for (int i = 3; i <= n; i++) {
            long cur = (long) (i - 1) * ((prev1 + prev2) % MOD) % MOD;
            prev2 = prev1;
            prev1 = cur;
        }
        return (int) prev1;
    }
}`,
      dry: { head: ['i', 'D(i−1)', 'D(i−2)', 'D(i)'], rows: [['2', '—', '—', '1'], ['3', '1', '0', '2·1 = 2'], ['4', '2', '1', '3·3 = <b>9</b>']] },
      complexity: `<p>O(n) time, O(1) space.</p>`,
      followUps: ['Count permutations with exactly k fixed points: C(n, k)·D(n − k).', 'Probability a random permutation is a derangement as n → ∞ (1/e).']
    }
  });

  practice.push({
    title: 'Count Balanced Bracket Sequences mod 10⁹+7',
    level: 'Medium', tags: ['catalan', 'modular inverse', 'combinatorics'], companies: ['Codeforces-style', 'CSES'],
    statement: `<p>Given n, count the strings of length 2n made of "(" and ")" that are balanced (every prefix has at least as many "(" as ")", and the totals are equal). Return the count mod 10<sup>9</sup>+7.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>6</sup>`,
    example: `<p>n = 3 → ${H.c('g', '5')}. n = 10 → 16796.</p>`,
    brute: { why: `<p>The O(n²) Catalan DP needs 10<sup>12</sup> operations for n = 10<sup>6</sup>. Enumerating strings is 2<sup>2n</sup>. The closed form needs only factorials up to 2n.</p>`, code: `static long brute(int n) {
    final long MOD = 1_000_000_007L;
    long[] c = new long[n + 1];
    c[0] = 1;
    for (int m = 1; m <= n; m++)
        for (int i = 0; i < m; i++) c[m] = (c[m] + c[i] * c[m - 1 - i]) % MOD;   // O(n^2)
    return c[n];
}` },
    mcq: { q: 'C_n mod p = ?', options: ['(2n)! · inv(n!) · inv((n+1)!) mod p', '(2n)! / (n! · n!) using integer division', 'C(2n, n) mod p divided by (n+1) with /', '4<sup>n</sup> mod p'], answer: 0, explain: 'C_n = (2n)!/(n!(n+1)!). Under a modulus, every division must become a multiplication by an inverse; integer division on residues is wrong.' },
    hints: [`<p>Hint 1: The count is the Catalan number C_n = C(2n, n)/(n+1).</p>`, `<p>Hint 2: Precompute factorials up to 2n (not n!).</p>`, `<p>Hint 3: Answer = fact[2n]·inv(fact[n])·inv(fact[n+1]) mod p with Fermat inverses. Equivalent: C(2n, n) − C(2n, n+1).</p>`],
    solution: {
      approach: `<p>Closed form with modular inverses: C_n = (2n)! / (n!·(n+1)!) mod p.</p>`,
      code: `class Solution {
    static final long MOD = 1_000_000_007L;
    long pw(long b, long e) {
        long r = 1; b %= MOD;
        while (e > 0) { if ((e & 1) == 1) r = r * b % MOD; b = b * b % MOD; e >>= 1; }
        return r;
    }
    public long countBalanced(int n) {
        long[] fact = new long[2 * n + 1];
        fact[0] = 1;
        for (int i = 1; i <= 2 * n; i++) fact[i] = fact[i - 1] * i % MOD;
        long denom = fact[n] * (fact[n] * (n + 1) % MOD) % MOD;      // n! * (n+1)!
        return fact[2 * n] * pw(denom, MOD - 2) % MOD;
    }
}`,
      dry: { head: ['quantity (n = 3)', 'value'], rows: [['(2n)! = 6!', '720'], ['n! · (n+1)! = 6 · 24', '144'], ['720 / 144', '<b>5</b>']] },
      complexity: `<p>O(n + log p) time, O(n) memory.</p>`,
      followUps: ['Brackets of k types: multiply by k<sup>n</sup>.', 'Count balanced strings with a fixed prefix (reflection principle).']
    }
  });

  // =====================================================================
  // PRACTICE — Hard
  // =====================================================================
  practice.push({
    title: 'Count Vowel Strings for n up to 10¹⁸',
    level: 'Hard', tags: ['matrix exponentiation', 'dp', 'strings'], companies: ['Amazon', 'LeetCode 1220 (extended)'],
    statement: `<p>Count strings of length n over {a, e, i, o, u} where: 'a' may only be followed by 'e'; 'e' by 'a' or 'i'; 'i' by anything except 'i'; 'o' by 'i' or 'u'; 'u' by 'a'. Return the count mod 10<sup>9</sup>+7.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>18</sup>`,
    example: `<p>n = 1 → 5. n = 2 → ${H.c('g', '10')} (ae, ea, ei, ia, ie, io, iu, oi, ou, ua). n = 5 → 68.</p>`,
    brute: { why: `<p>The O(n) DP over "count ending in each vowel" is the LeetCode solution (n ≤ 2·10<sup>4</sup>). For n = 10<sup>18</sup> it never finishes. The transition is the same every step → matrix power.</p>`, code: `static long brute(long n) {
    final long MOD = 1_000_000_007L;
    long a = 1, e = 1, i = 1, o = 1, u = 1;          // strings of length 1 ending in each vowel
    for (long len = 2; len <= n; len++) {
        long na = (e + i + u) % MOD;                 // who may precede 'a': e, i, u
        long ne = (a + i) % MOD;
        long ni = (e + o) % MOD;
        long no = i % MOD;
        long nu = (i + o) % MOD;
        a = na; e = ne; i = ni; o = no; u = nu;
    }
    return (a + e + i + o + u) % MOD;
}` },
    mcq: { q: 'With M[x][y] = 1 if y may follow x, the number of length-n strings is…', options: ['the sum of all entries of M<sup>n−1</sup>', 'the trace of M<sup>n</sup>', 'M<sup>n</sup>[0][0]', 'the sum of all entries of M<sup>n</sup>'], answer: 0, explain: 'Entry (x, y) of M<sup>n−1</sup> counts strings of length n starting with x and ending with y (n − 1 transitions). Sum over all starts and ends.' },
    hints: [`<p>Hint 1: Build the 5×5 "may follow" matrix M. Walks of length n−1 in this graph = valid strings of length n.</p>`, `<p>Hint 2: Compute M<sup>n−1</sup> mod p by repeated squaring: O(5³·log n).</p>`, `<p>Hint 3: Answer = sum of all 25 entries of M<sup>n−1</sup>. n = 1 gives the identity → 5 ✓.</p>`],
    solution: {
      approach: `<p>Graph-walk counting with matrix exponentiation: raise the 5×5 adjacency matrix to n−1 and sum all entries.</p>`,
      code: `class Solution {
    static final long MOD = 1_000_000_007L;
    long[][] mul(long[][] A, long[][] B) {
        long[][] C = new long[5][5];
        for (int i = 0; i < 5; i++)
            for (int t = 0; t < 5; t++)
                for (int j = 0; j < 5; j++) C[i][j] = (C[i][j] + A[i][t] * B[t][j]) % MOD;
        return C;
    }
    public long countVowelStrings(long n) {
        // order a, e, i, o, u ; M[x][y] = 1 if y may follow x
        long[][] M = {
            {0, 1, 0, 0, 0},     // a -> e
            {1, 0, 1, 0, 0},     // e -> a, i
            {1, 1, 0, 1, 1},     // i -> a, e, o, u
            {0, 0, 1, 0, 1},     // o -> i, u
            {1, 0, 0, 0, 0}      // u -> a
        };
        long[][] R = new long[5][5];
        for (int i = 0; i < 5; i++) R[i][i] = 1;
        long e = n - 1;
        while (e > 0) {
            if ((e & 1) == 1) R = mul(R, M);
            M = mul(M, M);
            e >>= 1;
        }
        long total = 0;
        for (long[] row : R) for (long v : row) total = (total + v) % MOD;
        return total;
    }
}`,
      dry: { head: ['n', 'matrix', 'sum of entries'], rows: [['1', 'M⁰ = I', '5'], ['2', 'M¹', '1+2+4+2+1 = <b>10</b>'], ['5', 'M⁴', '68']] },
      complexity: `<p>O(125·log n) ≈ 125·60·2 multiplications; O(1) memory.</p>`,
      followUps: ['Count only strings that start with "a" — which row?', 'Forbid a specific 3-letter pattern: what is the new state?']
    }
  });

  practice.push({
    title: 'GCD Sum over All Pairs',
    level: 'Hard', tags: ['euler totient', 'sieve', 'number theory'], companies: ['UVa 11426', 'Codeforces-style'],
    statement: `<p>Given N, compute G(N) = ∑<sub>1 ≤ i &lt; j ≤ N</sub> gcd(i, j). Answer many test cases, each with its own N.</p>`,
    constraints: `2 ≤ N ≤ 4·10<sup>6</sup>, up to 100 test cases; the answer fits in a signed 64-bit integer`,
    example: `<p>N = 10 → ${H.c('g', '67')}. N = 100 → 13015.</p>`,
    brute: { why: `<p>Double loop with gcd: N²/2 · log N ≈ 10<sup>14</sup> operations for N = 4·10<sup>6</sup>. The waste: many pairs share the same gcd and we never group them.</p>`, code: `static long brute(int N) {
    long s = 0;
    for (int j = 2; j <= N; j++)
        for (int i = 1; i < j; i++) s += gcd(i, j);
    return s;
}
static int gcd(int a, int b) { return b == 0 ? a : gcd(b, a % b); }` },
    mcq: { q: 'For fixed j, how many i in [1, j] have gcd(i, j) = d (d | j)?', options: ['φ(j / d)', 'φ(d)', 'j / d', 'd'], answer: 0, explain: 'gcd(i, j) = d ⇔ i = d·t with gcd(t, j/d) = 1 and 1 ≤ t ≤ j/d → φ(j/d) choices.' },
    hints: [`<p>Hint 1: f(j) = ∑<sub>i&lt;j</sub> gcd(i, j) = ∑<sub>d | j, d &lt; j</sub> d·φ(j/d). Then G(N) = f(2) + … + f(N), a prefix sum.</p>`, `<p>Hint 2: Sieve φ up to N. Then for each d and each k ≥ 2 with d·k ≤ N, add d·φ(k) to f[d·k] — a harmonic loop, O(N log N).</p>`, `<p>Hint 3: Prefix-sum f once, answer every test case in O(1). Use long for f and the prefix (values reach ~10<sup>13</sup>).</p>`],
    solution: {
      approach: `<p>Group pairs by their gcd: a number j receives d·φ(j/d) from each proper divisor d. A totient sieve plus a harmonic double loop fills f for all j, and a prefix sum answers all queries.</p>`,
      code: `class Solution {
    long[] prefix;
    Solution(int maxN) {
        int[] phi = new int[maxN + 1];
        for (int i = 0; i <= maxN; i++) phi[i] = i;
        for (int p = 2; p <= maxN; p++)
            if (phi[p] == p)
                for (int j = p; j <= maxN; j += p) phi[j] -= phi[j] / p;
        long[] f = new long[maxN + 1];
        for (int d = 1; d <= maxN; d++)
            for (int k = 2; (long) d * k <= maxN; k++)
                f[d * k] += (long) d * phi[k];          // pairs (i, d*k) with gcd exactly d
        prefix = new long[maxN + 1];
        for (int j = 1; j <= maxN; j++) prefix[j] = prefix[j - 1] + f[j];
    }
    public long query(int N) { return prefix[N]; }
}`,
      dry: { head: ['j', 'proper divisors d → d·φ(j/d)', 'f(j)', 'G'], rows: [['2', '1·φ(2)=1', '1', '1'], ['3', '1·φ(3)=2', '2', '3'], ['4', '1·φ(4)=2, 2·φ(2)=2', '4', '7'], ['…', '…', '…', '…'], ['10', '1·4 + 2·4 + 5·1 = 17', '17', '<b>67</b>']] },
      complexity: `<p>Precompute O(N log N) time, O(N) memory; each query O(1).</p>`,
      followUps: ['∑ lcm(i, j) over pairs.', '∑ over i, j ≤ N of gcd(i, j) with N up to 10<sup>10</sup> (Dirichlet / sublinear sums).']
    }
  });

  practice.push({
    title: 'nCr mod 1001 for Huge n (Lucas + CRT)',
    level: 'Hard', tags: ['lucas theorem', 'crt', 'combinatorics'], companies: ['Codeforces-style', 'HackerRank'],
    statement: `<p>Answer T queries: C(n, r) mod 1001. Note 1001 = 7·11·13 is not prime.</p>`,
    constraints: `1 ≤ T ≤ 10<sup>5</sup>, 0 ≤ r ≤ n ≤ 10<sup>18</sup>`,
    example: `<p>(10, 3) → ${H.c('g', '120')}. (1000, 500) → 949. (100, 50) → 858.</p>`,
    brute: { why: `<p>Pascal's triangle mod 1001 is exact but needs O(n·r) work — impossible for n = 10<sup>18</sup>. Factorial + inverse fails because 1001 is composite (7! has no inverse mod 1001).</p>`, code: `static int brute(int n, int r) {
    int[] row = new int[r + 1];
    row[0] = 1;
    for (int i = 1; i <= n; i++)
        for (int j = Math.min(i, r); j > 0; j--) row[j] = (row[j] + row[j - 1]) % 1001;
    return row[r];
}` },
    mcq: { q: 'Why does Lucas + CRT work for 1001 but not for 1000?', options: ['1001 is square-free (7·11·13); 1000 = 2³·5³ has prime powers where Lucas fails', '1000 is even', 'CRT needs an odd modulus', 'Lucas only works below 1001'], answer: 0, explain: 'Lucas gives C mod p for primes p. Square-free means the modulus is a product of distinct primes, so CRT can rebuild the answer. Prime powers need Granville / exLucas.' },
    hints: [`<p>Hint 1: Compute C(n, r) mod 7, mod 11 and mod 13 separately with Lucas.</p>`, `<p>Hint 2: Combine the three residues with CRT (moduli are coprime). Since 1001 is tiny, you can precompute for each prime the "basis" e_p with e_p ≡ 1 (mod p) and ≡ 0 mod the others.</p>`, `<p>Hint 3: Factorial tables up to 12 suffice. answer = (r₇·e₇ + r₁₁·e₁₁ + r₁₃·e₁₃) mod 1001.</p>`],
    solution: {
      approach: `<p>Lucas' theorem modulo each prime factor, then the classic CRT formula with precomputed basis vectors. Each query costs O(log₇ n) small binomials per prime.</p>`,
      code: `class Solution {
    static final int[] PR = {7, 11, 13};
    static final int M = 1001;

    long smallC(int a, int b, int p) {
        if (b < 0 || b > a) return 0;
        long num = 1, den = 1;
        for (int i = 0; i < b; i++) { num = num * (a - i) % p; den = den * (i + 1) % p; }
        return num * pw(den, p - 2, p) % p;          // den is nonzero mod p since b < p
    }
    long pw(long b, long e, long m) {
        long r = 1; b %= m;
        while (e > 0) { if ((e & 1) == 1) r = r * b % m; b = b * b % m; e >>= 1; }
        return r;
    }
    long lucas(long n, long r, int p) {
        long res = 1;
        while (n > 0 || r > 0) {
            int ni = (int) (n % p), ri = (int) (r % p);
            if (ri > ni) return 0;
            res = res * smallC(ni, ri, p) % p;
            n /= p; r /= p;
        }
        return res;
    }
    public long nCrMod1001(long n, long r) {
        if (r < 0 || r > n) return 0;
        long ans = 0;
        for (int p : PR) {
            int Mi = M / p;                                   // product of the other primes
            long e = (long) Mi * pw(Mi % p, p - 2, p) % M;    // e = 1 (mod p), 0 (mod others)
            ans = (ans + lucas(n, r, p) * e) % M;
        }
        return ans;
    }
}`,
      dry: { head: ['prime p', 'C(10, 3) mod p (Lucas)', 'basis e_p', 'contribution'], rows: [['7', '120 mod 7 = 1', '143·inv(3) mod 7 = 143·5 = 715', '715'], ['11', '10', '91·inv(3) mod 11 = 91·4 = 364', '3640'], ['13', '3', '77·inv(12) mod 13 = 77·12 = 924', '2772'], ['sum mod 1001', '', '', '7127 mod 1001 = <b>120</b> ✓']] },
      complexity: `<p>O(∑<sub>p</sub> log<sub>p</sub> n · p) per query (tiny); O(1) memory.</p>`,
      followUps: ['Modulus 142857 = 3³·11·13·37 — what changes for the 27 part?', 'Precompute factorials per prime to make each digit O(1).']
    }
  });

  practice.push({
    title: 'Chalkboard XOR Game',
    level: 'Hard', tags: ['game theory', 'xor', 'proof'], companies: ['Google', 'LeetCode 810'],
    statement: `<p>Numbers nums are written on a chalkboard. Alice and Bob alternately erase exactly one number, Alice first. If a player's erasure makes the XOR of all remaining numbers equal 0, that player loses. Also, if the XOR is already 0 at the start of a player's turn, that player wins. Return true if Alice wins with optimal play.</p>`,
    constraints: `1 ≤ nums.length ≤ 1000, 0 ≤ nums[i] &lt; 2<sup>16</sup>`,
    example: `<p>[1, 1, 2] → ${H.c('r', 'false')}: XOR = 2 ≠ 0 and n = 3 is odd. If she erases a 1, the rest [1, 2] has XOR 3, Bob erases 1 or 2, and Alice is left with one number (XOR ≠ 0) that she must erase → XOR 0 → she loses. Erasing 2 leaves [1, 1] → XOR 0 → she loses immediately.</p>`,
    brute: { why: `<p>Minimax over subsets of erased numbers: 2<sup>n</sup> states, fine for n ≤ 20 but n = 1000 is hopeless. The O(1) answer comes from a parity argument.</p>`, code: `// Memoised minimax over the bitmask of erased numbers (n <= 20 only)
static Map<Integer, Boolean> memo = new HashMap<>();
static boolean wins(int[] a, int erased) {
    if (memo.containsKey(erased)) return memo.get(erased);
    int x = 0, left = 0;
    for (int i = 0; i < a.length; i++) if ((erased >> i & 1) == 0) { x ^= a[i]; left++; }
    boolean res;
    if (x == 0) res = true;                         // XOR already 0 on my turn: I win
    else {
        res = false;
        for (int i = 0; i < a.length && !res; i++)
            if ((erased >> i & 1) == 0 && (x ^ a[i]) != 0 && !wins(a, erased | (1 << i))) res = true;
    }
    memo.put(erased, res);
    return res;
}` },
    mcq: { q: 'n is even and XOR ≠ 0. Why can the player to move always erase safely?', options: ['If every number equalled the XOR X, the XOR of an even count of X\'s would be 0 — contradiction', 'Because n is even, all numbers are equal', 'Because XOR of an even count is always 0', 'They cannot; it depends on the numbers'], answer: 0, explain: 'A move is unsafe only for a number equal to X (removing it makes XOR 0). If all n numbers equal X with n even, their XOR is 0, contradicting X ≠ 0. So a safe move exists, and parity stays even for her turns.' },
    hints: [`<p>Hint 1: If the starting XOR is 0, Alice wins instantly.</p>`, `<p>Hint 2: Erasing number v is losing only if v equals the current XOR X. When the count is even and X ≠ 0, not all numbers can equal X (their XOR would be 0).</p>`, `<p>Hint 3: So with an even count Alice always has a safe move, and Bob always faces an odd count. Answer: xor == 0 || n % 2 == 0.</p>`],
    solution: {
      approach: `<p>Parity argument: with an even number of values and XOR ≠ 0 a safe move always exists, so the player who always moves on even counts (Alice when n is even) never loses. With n odd and XOR ≠ 0, Bob is in that position and wins.</p>`,
      code: `class Solution {
    public boolean xorGame(int[] nums) {
        int x = 0;
        for (int v : nums) x ^= v;
        return x == 0 || nums.length % 2 == 0;
    }
}`,
      dry: { head: ['nums', 'XOR', 'n even?', 'Alice wins?'], rows: [['[1, 1, 2]', '2', 'no', 'false'], ['[0, 1]', '1', 'yes', 'true'], ['[1, 2, 3]', '0', '—', 'true (instant)']] },
      complexity: `<p>O(n) time, O(1) space.</p>`,
      followUps: ['Prove Bob wins when n is odd and XOR ≠ 0.', 'What if the rule were "make XOR 0 and you WIN"?']
    }
  });

  practice.push({
    title: "Grundy's Game (split a pile into two unequal piles)",
    level: 'Hard', tags: ['sprague-grundy', 'game theory', 'mex'], companies: ['Codeforces-style', 'SPOJ'],
    statement: `<p>There are several piles. A move: choose one pile and split it into <b>two non-empty piles of different sizes</b>. Piles of size 1 or 2 can never be split. The player who cannot move loses. Return "First" or "Second".</p>`,
    constraints: `1 ≤ number of piles ≤ 10<sup>5</sup>, 1 ≤ pile ≤ 3000`,
    example: `<p>[3] → ${H.c('g', 'First')} (split into 1 + 2, opponent is stuck). [4] → ${H.c('r', 'Second')} (only 1 + 3, then the opponent splits 3). [5, 6] → g = 2 ⊕ 1 = 3 → First.</p>`,
    brute: { why: `<p>Searching the whole game tree over the multiset of all piles explodes combinatorially — every split creates more piles. Sprague–Grundy lets us analyse one pile at a time.</p>`, code: `// Plain recursion on a multiset of piles - exponential, only for tiny inputs
static boolean firstWins(List<Integer> piles) {
    for (int idx = 0; idx < piles.size(); idx++) {
        int p = piles.get(idx);
        for (int a = 1; 2 * a < p; a++) {            // a < p - a: unequal split
            List<Integer> next = new ArrayList<>(piles);
            next.remove(idx);
            next.add(a);
            next.add(p - a);
            if (!firstWins(next)) return true;       // move to a losing position
        }
    }
    return false;                                     // no move or all moves lose
}` },
    mcq: { q: 'A pile of size 7 is split into 3 and 4. What is the Grundy value of the resulting position?', options: ['g(3) ⊕ g(4)', 'g(3) + g(4)', 'max(g(3), g(4))', 'g(7) − 1'], answer: 0, explain: 'The two new piles are independent games, so their combined Grundy value is the XOR. g(7) is then the mex over all such XORs.' },
    hints: [`<p>Hint 1: g(1) = g(2) = 0 (no moves). A split of n into a and n − a yields the value g(a) ⊕ g(n − a).</p>`, `<p>Hint 2: g(n) = mex{ g(a) ⊕ g(n−a) : 1 ≤ a &lt; n − a }. Compute up to 3000 in O(n²/2) ≈ 4.5·10<sup>6</sup>.</p>`, `<p>Hint 3: XOR g over all piles: non-zero → First. Grundy values here stay small (well below 64), so a small boolean array works for mex.</p>`],
    solution: {
      approach: `<p>Splitting games are sums of the two pieces, so a move's value is the XOR of the two pieces' Grundy numbers. Compute g(n) by mex over all unequal splits, then XOR across all piles.</p>`,
      code: `class Solution {
    public String winner(int[] piles) {
        int max = 3;
        for (int p : piles) max = Math.max(max, p);
        int[] g = new int[max + 1];                  // g[0..2] = 0
        for (int n = 3; n <= max; n++) {
            boolean[] seen = new boolean[256];
            for (int a = 1; 2 * a < n; a++) seen[g[a] ^ g[n - a]] = true;
            int mex = 0;
            while (seen[mex]) mex++;
            g[n] = mex;
        }
        int x = 0;
        for (int p : piles) x ^= g[p];
        return x != 0 ? "First" : "Second";
    }
}`,
      dry: { head: ['n', 'splits → g(a) ⊕ g(n−a)', 'g(n)'], rows: [['3', '1+2 → 0⊕0 = 0', '1'], ['4', '1+3 → 0⊕1 = 1', '0'], ['5', '1+4 → 0, 2+3 → 1', '2'], ['6', '1+5 → 2, 2+4 → 0', '1'], ['[5, 6]', '2 ⊕ 1', '<b>3 → First</b>']] },
      complexity: `<p>O(max²/2) to build g, O(#piles) for the XOR; O(max) memory.</p>`,
      followUps: ['Allow equal splits too — how does g change?', 'Kayles: remove one or two adjacent pins from a row (also a splitting game).']
    }
  });

  // =====================================================================
  // QUIZ
  // =====================================================================
  quiz.push({ q: 'Extended Euclid on (a, b) returns g = gcd(a, b) and x, y. Which statement is always true?', options: ['a·x + b·y = g', 'a·x − b·y = 1', 'x and y are both positive', 'x·y = g'], answer: 0, explain: 'That is Bezout\'s identity, the exact thing the algorithm maintains. One of x, y is usually negative, and the sum is 1 only when a and b are coprime.' });
  quiz.push({ q: 'The equation 6x + 10y = 7 has…', options: ['no integer solutions', 'exactly one solution', 'infinitely many solutions', 'solutions only with x = 0'], answer: 0, explain: 'gcd(6, 10) = 2 divides every value of 6x + 10y, and 2 does not divide 7.' });
  quiz.push({ q: 'You need 4<sup>−1</sup> mod 9. Which approach is correct?', options: ['Extended Euclid (gives 7, since 4·7 = 28 ≡ 1)', 'Fermat: 4<sup>9−2</sup> mod 9', 'It does not exist because 9 is not prime', '1/4 = 0.25 rounded'], answer: 0, explain: 'gcd(4, 9) = 1 so an inverse exists; 9 is not prime so Fermat does not apply (Fermat would give 4<sup>7</sup> mod 9 = 4, and 4·4 = 16 ≡ 7 ≠ 1 — wrong. Euler\'s version a<sup>φ(m)−1</sup> = 4<sup>5</sup> mod 9 = 7 does work.)' });
  quiz.push({ q: 'φ(100) equals…', options: ['40', '50', '20', '99'], answer: 0, explain: '100 = 2²·5². φ = 100·(1 − ½)·(1 − ⅕) = 100·½·⅘ = 40.' });
  quiz.push({ q: 'What is 3<sup>1000</sup> mod 7?', options: ['4', '1', '3', '2'], answer: 0, explain: 'φ(7) = 6 and gcd(3, 7) = 1, so reduce the exponent: 1000 mod 6 = 4 → 3<sup>4</sup> = 81 = 11·7 + 4 → 4.' });
  quiz.push({ q: 'x ≡ 1 (mod 6) and x ≡ 4 (mod 9). What happens?', options: ['x ≡ 13 (mod 18)', 'No solution because 6 and 9 are not coprime', 'x ≡ 13 (mod 54)', 'No solution because 4 − 1 is odd'], answer: 0, explain: 'g = 3 divides 4 − 1 = 3, so it is solvable. Jump 1, 7, 13: 13 mod 9 = 4 ✓. The new modulus is lcm(6, 9) = 18, not 54. (Non-coprime moduli are fine as long as g divides the difference.)' });
  quiz.push({ q: 'Computing F(n) mod p for n = 10<sup>18</sup> with a 2×2 matrix power costs about…', options: ['60 squarings + up to 60 multiplications of 2×2 matrices', '10<sup>18</sup> additions', '√(10<sup>18</sup>) = 10<sup>9</sup> steps', '2<sup>60</sup> multiplications'], answer: 0, explain: 'Binary exponentiation touches each of the ~60 bits of n once: O(k³ log n) with k = 2.' });
  quiz.push({ q: 'How many integers in [1, 60] are divisible by 2, 3 or 5?', options: ['44', '46', '30', '16'], answer: 0, explain: '30 + 20 + 12 − 10 − 6 − 4 + 2 = 44. (The 16 numbers coprime to 30 in [1, 60] are the rest: 60 − 44 = 16.)' });
  quiz.push({ q: 'Which of these is NOT counted by Catalan numbers?', options: ['Binary strings of length 2n with n ones (no prefix rule)', 'Balanced bracket strings with n pairs', 'Structurally distinct BSTs with n keys', 'Triangulations of a convex (n+2)-gon'], answer: 0, explain: 'Without the "never below zero" prefix rule there are C(2n, n) such strings, not C(2n, n)/(n+1).' });
  quiz.push({ q: 'Using Lucas, C(20, 7) mod 3 is…', options: ['0', '1', '2', 'cannot be computed with Lucas'], answer: 0, explain: '20 = 202₃ and 7 = 021₃. Middle digits: C(0, 2) = 0 → the product is 0. Indeed C(20, 7) = 77520 is divisible by 3.' });
  quiz.push({ q: 'A random permutation of 10 elements. Expected number of fixed points?', options: ['1', '10', '1/10', '1/e'], answer: 0, explain: 'Linearity: 10 indicators, each with probability 1/10, sum to 1 — regardless of n.' });
  quiz.push({ q: 'Nim heaps (1, 5, 6). Who wins with perfect play?', options: ['Second player, whatever happens', 'Second player because the heaps are unequal', 'First player, by taking 2 from the heap of 6', 'First player, by taking 1 from the heap of 1'], answer: 2, explain: '1 ⊕ 5 ⊕ 6 = 2 ≠ 0, so the first player wins. The move: a heap h with h ⊕ 2 &lt; h — 6 ⊕ 2 = 4, so reduce 6 to 4 (take 2) → 1 ⊕ 5 ⊕ 4 = 0. Taking the single 1 leaves 5 ⊕ 6 = 3 ≠ 0, a mistake.' });
  quiz.push({ q: 'mex{0, 1, 2, 4, 5} = ?', options: ['3', '6', '0', '4'], answer: 0, explain: 'mex is the smallest non-negative integer NOT in the set: 0, 1, 2 are present, 3 is missing.' });

  // =====================================================================
  // INTERVIEW Q&A
  // =====================================================================
  interview.push({ level: 'I', q: 'Why can\'t you just divide when computing an answer "mod 10<sup>9</sup>+7"? What do you do instead?', a: `<p>Modular reduction commutes with +, − and ×, but not with division: (10/2) mod 7 = 5, while (10 mod 7)/(2 mod 7) = 3/2 is not even an integer. Instead, multiply by the <b>modular inverse</b>: a/b ≡ a·b<sup>−1</sup> (mod p). Because 10<sup>9</sup>+7 is prime, b<sup>−1</sup> = b<sup>p−2</sup> mod p by Fermat's little theorem, computed with fast power in O(log p). The inverse exists only when gcd(b, p) = 1, i.e. b is not a multiple of p.</p>`, followUps: ['What if the modulus is 10<sup>9</sup> (not prime)?', 'How do you get inverses of 1..10<sup>6</sup> in O(N)?'] });
  interview.push({ level: 'I', q: 'Explain Extended Euclid and derive its update rule.', a: `<p>It returns g = gcd(a, b) together with integers x, y such that a·x + b·y = g. Recursively solve (b, a mod b) to get b·x₁ + (a mod b)·y₁ = g. Substitute a mod b = a − ⌊a/b⌋·b and regroup: a·y₁ + b·(x₁ − ⌊a/b⌋·y₁) = g. So x = y₁ and y = x₁ − ⌊a/b⌋·y₁; the base case b = 0 gives (x, y) = (1, 0). It runs in O(log min(a, b)) like Euclid, and the coefficients stay bounded by b/g and a/g, so no overflow for 64-bit inputs.</p>`, followUps: ['Write the iterative version.', 'How do you get all solutions of a·x + b·y = c?'] });
  interview.push({ level: 'A', q: 'When is Fermat\'s little theorem the wrong tool for a modular inverse, and what happens if you use it anyway?', a: `<p>Fermat requires a <b>prime</b> modulus and a ≢ 0. With a composite modulus, a<sup>m−2</sup> is generally not the inverse — e.g. mod 12, 5<sup>10</sup> ≡ 1 but 5<sup>−1</sup> = 5. The code does not crash; it silently returns a wrong number, which makes this bug dangerous. Also for a ≡ 0 mod p it returns 0 instead of signalling "no inverse". For composite moduli use Extended Euclid (check gcd = 1), or a<sup>φ(m)−1</sup> if you already know φ(m).</p>`, followUps: ['How would you unit-test this?', 'Which crypto algorithm computes an inverse modulo a non-prime?'] });
  interview.push({ level: 'A', q: 'Define Euler\'s totient and show how to compute it for one n and for all n ≤ N.', a: `<p>φ(n) counts integers in [1, n] coprime with n. φ(n) = n·∏(1 − 1/p) over distinct primes p | n. For one n: trial-divide up to √n; for each prime found, strip all its copies and do result −= result/p; a leftover n &gt; 1 is a final prime — O(√n). For all n ≤ N: initialise phi[i] = i, then for each prime p (detected because phi[p] is still p) do phi[j] −= phi[j]/p for every multiple j — O(N log log N). A linear sieve variant gives O(N). Euler's theorem a<sup>φ(n)</sup> ≡ 1 (mod n) for gcd(a, n) = 1 is the reason φ matters.</p>`, followUps: ['When does a<sup>b</sup> ≡ a<sup>b mod φ(n)</sup> fail?', 'Count coprime pairs (i, j) ≤ N.'] });
  interview.push({ level: 'A', q: 'Walk me through solving x ≡ a₁ (mod m₁), x ≡ a₂ (mod m₂) when m₁ and m₂ are not coprime.', a: `<p>Write x = a₁ + m₁·k, so we need m₁·k ≡ a₂ − a₁ (mod m₂). Let g = gcd(m₁, m₂). If g does not divide a₂ − a₁ there is no solution (the two clocks never agree). Otherwise divide by g: (m₁/g)·k ≡ (a₂ − a₁)/g (mod m₂/g), and m₁/g is invertible mod m₂/g — Extended Euclid gives the inverse. Then x ≡ a₁ + m₁·k (mod lcm(m₁, m₂)). Fold this merge over all congruences. Watch overflow: the product of two 10<sup>12</sup>-sized numbers needs 128-bit arithmetic or BigInteger.</p>`, followUps: ['How would you return the answer mod 10<sup>9</sup>+7 when the lcm is enormous?', 'Where is CRT used in RSA?'] });
  interview.push({ level: 'I', q: 'How do you compute the n-th Fibonacci number for n = 10<sup>18</sup>?', a: `<p>Write the step as a matrix: [F(n+1), F(n)]ᵀ = [[1,1],[1,0]]·[F(n), F(n−1)]ᵀ, so T<sup>n</sup> = [[F(n+1), F(n)], [F(n), F(n−1)]]. Raise T to the n-th power with binary exponentiation (square the matrix, multiply into the result when the bit is 1), reducing mod p after every multiplication — about 60 squarings, O(k³ log n) with k = 2. Fast doubling (F(2m) = F(m)(2F(m+1) − F(m)), F(2m+1) = F(m)² + F(m+1)²) does the same with fewer operations.</p>`, followUps: ['Generalise to f(n) = 3f(n−1) + 2f(n−2) + 5.', 'Count walks of length k in a graph.'] });
  interview.push({ level: 'A', q: 'When would you <i>not</i> use matrix exponentiation for a linear recurrence?', a: `<p>(1) When n is small enough (≤ 10<sup>7</sup>) that a simple O(n·k) loop is faster and clearer. (2) When the state size k is large — k³ log n with k = 500 is already ~10<sup>10</sup>. Then use Kitamasa / polynomial exponentiation modulo the characteristic polynomial (O(k² log n), or O(k log k log n) with NTT). (3) When the transition changes with n (not a constant matrix), it is not a single matrix power. (4) When you only need many terms rather than one far term, plain DP is optimal. Berlekamp–Massey can even discover the recurrence from initial terms.</p>`, followUps: ['How does Kitamasa work at a high level?', 'What is the tropical (min, +) matrix product used for?'] });
  interview.push({ level: 'I', q: 'Explain inclusion–exclusion and why the signs alternate.', a: `<p>|A₁ ∪ … ∪ A_k| = ∑|A_i| − ∑|A_i ∩ A_j| + ∑|triples| − … . An element that belongs to exactly t of the sets is counted C(t,1) − C(t,2) + C(t,3) − … times, and since (1 − 1)<sup>t</sup> = 0, that alternating sum is exactly 1. In code you loop over masks 1..2<sup>k</sup>−1, compute the intersection size (e.g. ⌊N/lcm⌋ for divisibility), and add for odd popcount, subtract for even. Complement form ("none of the properties") gives derangements, onto functions and coprime counts.</p>`, followUps: ['How do you prune when k = 40?', 'How does the Möbius function relate?'] });
  interview.push({ level: 'I', q: 'Where do Catalan numbers show up and how do you prove a problem is Catalan?', a: `<p>Balanced parentheses, BSTs with n keys, full binary trees, polygon triangulations, Dyck paths, non-crossing handshakes, valid stack sequences. To prove it, find a <b>first-return decomposition</b>: every object of size n splits uniquely into an inner object of size i and an outer one of size n−1−i, giving C_n = ∑ C_i·C_{n−1−i} with C₀ = 1. Then C_n = C(2n, n)/(n+1), provable with the reflection principle. Practical: brute force small n, see 1, 2, 5, 14, then confirm with the split argument.</p>`, followUps: ['Compute C_n mod p for n = 10<sup>6</sup>.', 'How is Motzkin different?'] });
  interview.push({ level: 'E', q: 'You need C(n, r) mod m. Walk through how you choose the method for different n and m.', a: `<p>(1) n ≤ ~5000: Pascal's triangle — works for <i>any</i> m, no inverses needed. (2) m prime and n &lt; m (typical 10<sup>9</sup>+7 with n ≤ 10<sup>7</sup>): factorials + inverse factorials, O(1) per query. (3) m a small prime and n huge: Lucas — product of C(n_i, r_i) over base-m digits. (4) m square-free composite (e.g. 1001): Lucas per prime, then CRT. (5) m with prime powers (e.g. 2<sup>30</sup>, 142857 = 3³·11·13·37): Granville/"exLucas" per prime power (factorials with p-factors removed + Legendre's formula for the exponent), then CRT. (6) Only need parity: (n &amp; r) == r.</p>`, followUps: ['Why does n! ≡ 0 break the factorial method for small p?', 'State Kummer\'s theorem.'] });
  interview.push({ level: 'A', q: 'What is linearity of expectation and why is it so powerful in interview problems?', a: `<p>E[X + Y] = E[X] + E[Y] for <i>any</i> random variables, even dependent ones. Express a complicated count as a sum of indicator variables (1 if event i happens), then E[count] = ∑ P(event i). Examples: expected fixed points of a random permutation = n·(1/n) = 1; expected inversions = C(n,2)/2; expected number of distinct values after k draws from n = n·(1 − (1 − 1/n)<sup>k</sup>). You never need the joint distribution. It does not hold for products unless variables are independent.</p>`, followUps: ['Expected number of rolls to see all 6 faces?', 'Compute an expected value as P·Q<sup>−1</sup> mod p.'] });
  interview.push({ level: 'A', q: 'How do you set up and solve an expected-value DP, including states that can repeat?', a: `<p>Define E[s] = expected remaining cost from state s; terminal states have E = 0. For each state write E[s] = cost + ∑ P(s → t)·E[t]. If transitions only go "forward" (to states processed earlier), fill in reverse topological order. If a state can return to itself with probability q, move it to the left: E[s](1 − q) = cost + ∑<sub>t ≠ s</sub> P·E[t]. For general cycles, solve a linear system (Gaussian elimination, or a two-pass substitution for chains). Under a prime modulus every division becomes a modular inverse. Always sanity check with a quick simulation.</p>`, followUps: ['Expected rolls until two sixes in a row?', 'When do floating-point errors become a problem?'] });
  interview.push({ level: 'E', q: 'State the Sprague–Grundy theorem and use it on a multi-pile game.', a: `<p>Every position of an impartial normal-play game has a Grundy number g = mex of the Grundy numbers of its options; g = 0 exactly for losing positions. For a sum of independent games (each move is made in exactly one component), the Grundy number of the sum is the XOR of the components' numbers. So for k piles with move set S: compute g(x) = mex{g(x − s)} for one pile, XOR g(pile_i) across piles; non-zero ⇒ first player wins, and a winning move changes one component to make the XOR 0. Plain Nim is the special case g(x) = x.</p>`, followUps: ['Why does XOR (not sum) combine games?', 'Why does this not apply to Stone Game (taking from the ends)?'] });
  interview.push({ level: 'B', q: 'Prove that in Nim the first player loses exactly when the XOR of heap sizes is 0.', a: `<p>Three facts. (1) The terminal position (all zeros) has XOR 0. (2) From XOR 0, any move changes one heap, which changes at least one bit of the total, so the XOR becomes non-zero. (3) From XOR X ≠ 0, let b be X's highest set bit; some heap h has bit b set, and h ⊕ X clears it, so h ⊕ X &lt; h — reducing h to h ⊕ X is legal and makes the XOR 0. Therefore XOR-0 positions are exactly those where every move leads to a non-zero position, i.e. the losing positions.</p>`, followUps: ['What changes in misère Nim?', 'How do you find the winning move fast?'] });

  // Small inputs can finish in fewer than 4 steps: pad with a recap frame so every run has >= 4 frames.
  topics.forEach(function (t) {
    [].concat(t.viz).forEach(function (v) {
      var inner = v.gen;
      v.gen = function (input) {
        var f = inner(input);
        while (f.length < 4) f.push({ narr: 'That is the whole computation for this small input. Try a bigger input to watch more steps.', parts: f[f.length - 1].parts });
        return f;
      };
    });
  });

  registerModule({
    id: 'dsa25',
    title: 'Advanced Mathematics for Algorithms',
    intro: `<p>This module is the "maths toolbox" that turns impossible-looking problems into a few lines of code. You already know gcd, primes, modulo rules and fast power from DSA 3. Here we go further: <b>Extended Euclid</b> (the recipe behind gcd), <b>modular inverses</b> (how to divide on a clock), <b>Euler's totient</b>, the <b>Chinese Remainder Theorem</b>, <b>matrix exponentiation</b> (Fibonacci for n = 10<sup>18</sup>), <b>inclusion–exclusion</b>, <b>Catalan numbers</b>, <b>Lucas' theorem</b>, <b>probability and expected value</b>, and <b>game theory</b> (Nim and Sprague–Grundy).</p>
      <p>Every topic starts with an everyday analogy, then a plain-English explanation, an interactive visualizer you can feed your own numbers, worked examples, an expert deep dive and an AI-era section. Each also has a guided "solve it yourself" problem. These ideas show up in contest-style interview rounds (Google, quant firms, Codeforces-style OAs), and they also matter in real systems: cryptography (RSA uses inverses and CRT), hashing, randomised algorithms and game engines.</p>`,
    goals: [
      'Run Extended Euclid by hand, solve a·x + b·y = c, and compute modular inverses for both prime and composite moduli',
      'Compute φ(n) for one number or all numbers up to 10<sup>7</sup>, and use Euler\'s theorem to shrink huge exponents',
      'Solve any system of congruences with the general CRT merge, including non-coprime moduli and conflict detection',
      'Turn a linear recurrence or a small-state DP into a matrix and evaluate it for n up to 10<sup>18</sup> in O(k³ log n)',
      'Count with inclusion–exclusion (divisibility, derangements, onto functions) and recognise Catalan structures',
      'Pick the right nCr method (Pascal, factorial + inverse, Lucas, Lucas + CRT) from the sizes of n and the modulus',
      'Use linearity of expectation and expectation DP, and decide impartial games with Nim XOR and Grundy numbers'
    ],
    prereqs: `DSA 2 (Math Foundations & Complexity), DSA 3 (Number Theory & Modular Arithmetic: gcd, sieve, fast power, nCr basics), DSA 4 (Bit Manipulation: XOR, masks), DSA 17 (Dynamic Programming I). Comfortable with Java long arithmetic and overflow.`,
    hours: 18,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
