(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // =====================================================================
  // Shared helpers for the visualizers (plain ES5, deterministic, fast)
  // =====================================================================
  function readWord(input, fallback, maxLen, what) {
    var s = (input === undefined || input === null) ? fallback : String(input);
    s = s.replace(/\s+/g, '');
    if (!s.length) throw new Error('Please type ' + what + ' (letters a-z).');
    if (!/^[a-z]+$/.test(s)) throw new Error(what + ' must use only lowercase letters a-z (example: ' + fallback + ').');
    if (s.length > maxLen) throw new Error('Keep ' + what + ' at most ' + maxLen + ' letters so the picture fits.');
    return s;
  }
  function hlOne(i, cls) { var h = {}; if (i !== undefined && i !== null && i >= 0) h[i] = cls; return h; }
  function cp(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }

  // Manacher on "#a#b#a#" style string. Returns {t, p}
  function manacherJS(s) {
    var t = ['#'];
    for (var i = 0; i < s.length; i++) { t.push(s[i]); t.push('#'); }
    var m = t.length, p = [], c = 0, r = -1;
    for (var j = 0; j < m; j++) {
      var k = j > r ? 0 : Math.min(p[2 * c - j], r - j);
      while (j - k - 1 >= 0 && j + k + 1 < m && t[j - k - 1] === t[j + k + 1]) k++;
      p[j] = k;
      if (j + k > r) { c = j; r = j + k; }
    }
    return { t: t, p: p };
  }

  // Suffix array by simple sort (fine for tiny visualizer inputs)
  function saJS(s) {
    var idx = [];
    for (var i = 0; i < s.length; i++) idx.push(i);
    idx.sort(function (a, b) { var x = s.slice(a), y = s.slice(b); return x < y ? -1 : x > y ? 1 : 0; });
    return idx;
  }
  // Kasai: lcp[i] = LCP(suffix sa[i-1], suffix sa[i]), lcp[0] = 0
  function kasaiJS(s, sa) {
    var n = s.length, rank = [], lcp = [], h = 0, i;
    for (i = 0; i < n; i++) rank[sa[i]] = i;
    for (i = 0; i < n; i++) lcp.push(0);
    for (i = 0; i < n; i++) {
      if (rank[i] > 0) {
        var j = sa[rank[i] - 1];
        while (i + h < n && j + h < n && s[i + h] === s[j + h]) h++;
        lcp[rank[i]] = h;
        if (h > 0) h--;
      } else h = 0;
    }
    return lcp;
  }

  // =====================================================================
  // TOPIC 1 — Manacher's algorithm
  // =====================================================================
  topics.push({
    title: 'Manacher’s Algorithm: Every Palindrome in O(N)',
    analogy: `<p><b>Think of a mirror on a wall.</b> If you know the left half of a room is a perfect mirror image of the right half, then the moment you see a chair on the left you <i>already know</i> there is a matching chair on the right — you do not have to walk over and look.</p>
      <p>Manacher’s algorithm walks along a string and keeps the <b>biggest mirror (palindrome) it has found that reaches furthest right</b>. When it reaches a new position inside that mirror, it looks at the <b>reflected</b> position on the left side, which it has already measured, and gets a big part of the answer <b>for free</b>. It only does real work when it walks <b>past</b> the right edge of the mirror — and that edge only ever moves right. That single fact makes the whole thing linear.</p>`,
    explain: `<h4>1. The problem and the three speeds</h4>
      <p>A <b>palindrome</b> reads the same forwards and backwards (<code>racecar</code>, <code>abba</code>). Classic questions: <i>longest palindromic substring</i>, <i>count all palindromic substrings</i>, <i>is s[l..r] a palindrome?</i> for many queries.</p>
      ${H.table(['Approach', 'Idea', 'Time', 'When it breaks'], [
        ['Brute force', 'check every substring', 'O(N<sup>3</sup>)', 'N ≈ 500 already slow'],
        ['Expand around center', 'try 2N−1 centers, grow while ends match', 'O(N<sup>2</sup>)', H.c('r', '"aaaa…a" with N = 10<sup>6</sup>')],
        ['<b>Manacher</b>', 'expand around center but <b>reuse mirror info</b>', H.c('g', '<b>O(N)</b>'), 'never — linear always']
      ])}
      <h4>2. Trick #1 — insert <code>#</code> between letters</h4>
      <p>Odd palindromes (<code>aba</code>) have a letter in the middle; even ones (<code>abba</code>) have a <b>gap</b> in the middle. Put a <code>#</code> in every gap and at both ends, and <b>every</b> palindrome gets a real center cell:</p>
      ${H.arr(['#', 'a', '#', 'b', '#', 'b', '#', 'a', '#'], { label: 't for s = "abba"  (center of "abba" is the # at index 4)', hl: { 4: 'y' }, idx: true })}
      <p>Let <code>P[i]</code> = how many cells the palindrome centered at <code>t[i]</code> stretches on <b>each side</b>. The magic: <b><code>P[i]</code> is exactly the length of that palindrome in the original string</b>, and it starts at index <code>(i − P[i]) / 2</code> in <code>s</code>.</p>
      ${H.table(['i', '0', '1', '2', '3', '4', '5', '6', '7', '8'], [
        ['t[i]', '#', 'a', '#', 'b', '#', 'b', '#', 'a', '#'],
        ['P[i]', '0', '1', '0', '1', H.c('g', '<b>4</b>'), '1', '0', '1', '0']
      ])}
      <p>P[4] = 4 → palindrome of length 4 starting at (4 − 4)/2 = 0 → <code>"abba"</code>. ✔</p>
      <h4>3. Trick #2 — the mirror box</h4>
      <p>Keep the palindrome whose right end <code>R</code> is furthest right, with center <code>C</code>. For a new position <code>i ≤ R</code>, its <b>mirror</b> is <code>2C − i</code>. Because the box is a palindrome, whatever surrounds the mirror also surrounds <code>i</code> — at least up to the box edge:</p>
      ${H.table(['Case', 'What we know', 'Work needed'], [
        ['mirror’s palindrome fits <b>strictly inside</b> the box', 'P[i] = P[mirror] exactly', H.c('g', 'zero comparisons')],
        ['mirror’s palindrome <b>touches/crosses</b> the box’s left edge', 'P[i] ≥ R − i', 'expand <b>beyond R</b> only'],
        ['i is <b>outside</b> the box (i &gt; R)', 'nothing', 'expand from 0']
      ])}
      <p>In code all three collapse into one line: <code>k = (i &gt; R) ? 0 : min(P[2C − i], R − i)</code>, then <i>try to expand</i>.</p>
      <h4>4. Why it is linear</h4>
      <p>Every <b>successful</b> comparison during expansion pushes the right end of <code>i</code>’s palindrome past <code>R</code>, and then <code>R</code> moves there. <code>R</code> only moves right and is at most <code>2N</code>, so there are at most <code>2N</code> successful comparisons in total, plus at most one failed comparison per position. Total <b>O(N)</b>.</p>
      <h4>5. What you can read off <code>P</code></h4>
      ${H.table(['Question', 'Formula'], [
        ['Longest palindromic substring', 'max P[i]; start = (i − P[i]) / 2'],
        ['Number of palindromic substrings', 'Σ (P[i] + 1) / 2 (integer division)'],
        ['Is s[l..r] a palindrome? (O(1) per query)', 'P[l + r + 1] ≥ r − l + 1'],
        ['Longest palindromic <b>prefix</b>', 'largest i with i − P[i] == 0'],
        ['Longest palindromic <b>suffix</b>', 'smallest i with i + P[i] == 2N']
      ])}`,
    clues: [
      '"<b>longest palindromic substring</b>" with N up to 10<sup>5</sup>–10<sup>6</sup> → O(N<sup>2</sup>) expand-around-center is risky; Manacher is O(N).',
      '"<b>count</b> all palindromic substrings" → Σ (P[i] + 1) / 2 from one Manacher pass.',
      '"Q queries: is s[l..r] a palindrome?" → precompute P once, answer each query in O(1).',
      '"<b>shortest palindrome</b> by adding characters in front" → longest palindromic <b>prefix</b> (Manacher or KMP on s + "#" + reverse(s)).',
      'Adversarial hint: test data like <code>"aaaa…a"</code> is designed to kill O(N<sup>2</sup>) center expansion.',
      '"palindromic prefix / suffix of every length", "split into two palindromes", "max product of two non-overlapping palindromes" → per-position palindrome radii.'
    ],
    code: [`
      class Manacher {
          // Returns P over t = "#s0#s1#...#s(n-1)#" (length 2n+1).
          // P[i] = radius of the palindrome centered at t[i]
          //      = LENGTH of the matching palindrome in the original s.
          static int[] radii(String s) {
              int n = s.length();
              char[] t = new char[2 * n + 1];
              for (int i = 0; i < t.length; i++) t[i] = (i % 2 == 0) ? '#' : s.charAt(i / 2);
              int m = t.length;
              int[] p = new int[m];
              int c = 0, r = -1;                       // box = [c - p[c], r], r = furthest right end
              for (int i = 0; i < m; i++) {
                  // free start from the mirror (2c - i) if we are inside the box
                  int k = (i > r) ? 0 : Math.min(p[2 * c - i], r - i);
                  // try to grow beyond what we already know
                  while (i - k - 1 >= 0 && i + k + 1 < m && t[i - k - 1] == t[i + k + 1]) k++;
                  p[i] = k;
                  if (i + k > r) { c = i; r = i + k; }  // box moved right
              }
              return p;
          }

          static String longestPalindrome(String s) {
              int[] p = radii(s);
              int best = 0, center = 0;
              for (int i = 0; i < p.length; i++) if (p[i] > best) { best = p[i]; center = i; }
              int start = (center - best) / 2;          // map back to s
              return s.substring(start, start + best);
          }

          static long countPalindromes(String s) {
              long total = 0;
              for (int v : radii(s)) total += (v + 1) / 2;  // palindromes sharing this center
              return total;
          }

          // O(1) palindrome query after O(n) preprocessing
          static boolean isPal(int[] p, int l, int r) { return p[l + r + 1] >= r - l + 1; }

          public static void main(String[] args) {
              System.out.println(longestPalindrome("abacabad"));   // abacaba
              System.out.println(countPalindromes("aaa"));         // 6
              int[] p = radii("abba");
              System.out.println(isPal(p, 0, 3) + " " + isPal(p, 0, 2)); // true false
          }
      }`, { lang: 'python', run: true, title: 'Manacher in Python (runnable)', code: `
def manacher(s):
    t = '#' + '#'.join(s) + '#'          # "abba" -> "#a#b#b#a#"
    m = len(t)
    p = [0] * m
    c, r = 0, -1                         # center and right edge of the furthest-reaching palindrome
    for i in range(m):
        k = 0 if i > r else min(p[2 * c - i], r - i)   # free part from the mirror
        while i - k - 1 >= 0 and i + k + 1 < m and t[i - k - 1] == t[i + k + 1]:
            k += 1
        p[i] = k
        if i + k > r:
            c, r = i, i + k
    return p

for s in ["abba", "abacabad", "aaaa"]:
    p = manacher(s)
    best = max(range(len(p)), key=lambda i: p[i])
    start = (best - p[best]) // 2
    print(s, "-> P =", p)
    print("   longest:", s[start:start + p[best]], " count:", sum((v + 1) // 2 for v in p))
` }],
    codeTitle: ['Manacher — radii, longest, count, O(1) query (Java)', 'Same in Python (runnable)'],
    viz: {
      title: 'Manacher: the mirror box sliding right',
      input: 'abacabad',
      inputLabel: 'Lowercase word (max 12 letters)',
      gen: function (input) {
        var s = readWord(input, 'abacabad', 12, 'the word');
        var t = ['#'];
        for (var q = 0; q < s.length; q++) { t.push(s[q]); t.push('#'); }
        var m = t.length, p = [], c = 0, r = -1, comps = 0, frames = [];
        function addPtr(o, i, lab) { if (i < 0 || i >= m) return; if (o[i] === undefined) o[i] = lab; else o[i] = [].concat(o[i], lab); }
        frames.push({ narr: 'Original word <b>' + H.esc(s) + '</b>. We insert <code>#</code> in every gap so odd AND even palindromes both get a real center cell. New length = 2·' + s.length + '+1 = <b>' + m + '</b>.', parts: [
          { type: 'array', label: 's', values: s.split(''), showIdx: true },
          { type: 'array', label: 't (with # padding)', values: t.slice(), showIdx: true },
          { type: 'vars', label: 'state', vals: { C: 0, R: -1, 'comparisons so far': 0 } }
        ] });
        for (var i = 0; i < m; i++) {
          var inside = i <= r, mir = 2 * c - i;
          var k0 = inside ? Math.min(p[mir], r - i) : 0, k = k0, hl = {}, msg;
          var oldC = c, oldR = r;
          while (i - k - 1 >= 0 && i + k + 1 < m) {
            comps++;
            if (t[i - k - 1] === t[i + k + 1]) { hl[i - k - 1] = 'ok'; hl[i + k + 1] = 'ok'; k++; }
            else { hl[i - k - 1] = 'bad'; hl[i + k + 1] = 'bad'; break; }
          }
          p[i] = k;
          hl[i] = 'cur';
          if (inside && mir !== i) hl[mir] = 'sel';
          if (!inside) msg = 'i = ' + i + ' is <b>outside</b> the box (R = ' + oldR + '), so no free information: start at k = 0 and expand.';
          else if (p[mir] < oldR - i) msg = 'i = ' + i + ' is inside the box. Mirror = 2·' + oldC + '−' + i + ' = <b>' + mir + '</b> has P = ' + p[mir] + ', which fits strictly inside the box → <span class="c-g">copy it for free</span> (k starts at ' + k0 + ').';
          else msg = 'i = ' + i + ' is inside the box. Mirror ' + mir + ' has P = ' + p[mir] + ', which reaches the box edge, so we only trust min(P[mirror], R − i) = min(' + p[mir] + ', ' + (oldR - i) + ') = <b>' + k0 + '</b> and try to expand past R.';
          var grew = k - k0;
          msg += ' Expansion added <b>' + grew + '</b> → P[' + i + '] = <b>' + k + '</b>';
          if (k > 0) {
            var st = (i - k) / 2;
            msg += ' → palindrome <code>' + H.esc(s.substr(Math.floor(st), k)) + '</code> in s.';
          } else msg += '.';
          if (i + k > r) { c = i; r = i + k; msg += ' Its right end ' + (i + k) + ' beats R, so the <b>box moves</b>: C = ' + c + ', R = ' + r + '.'; }
          var ptr = {};
          addPtr(ptr, i, 'i'); addPtr(ptr, c, 'C'); addPtr(ptr, r, 'R');
          if (inside && mir !== i) addPtr(ptr, mir, 'mir');
          frames.push({ narr: msg, parts: [
            { type: 'array', label: 't', values: t.slice(), hl: hl, ptr: ptr, range: [c - p[c], r], showIdx: true },
            { type: 'bars', label: 'P[0..' + i + '] (palindrome length in s)', values: p.slice(), hl: hlOne(i, 'cur') },
            { type: 'vars', label: 'state', vals: { i: i, 'start k': k0, 'P[i]': k, C: c, R: r, 'comparisons so far': comps }, hl: grew > 0 ? { 'P[i]': 'ok' } : {} }
          ] });
        }
        var best = 0, bc = 0, total = 0;
        for (var j = 0; j < m; j++) { total += Math.floor((p[j] + 1) / 2); if (p[j] > best) { best = p[j]; bc = j; } }
        var start = (bc - best) / 2, hlS = {};
        for (var z = start; z < start + best; z++) hlS[z] = 'sel';
        frames.push({ narr: 'Done. Longest palindrome: P[' + bc + '] = ' + best + ' → starts at (' + bc + ' − ' + best + ')/2 = ' + start + ' → <b>' + H.esc(s.substr(start, best)) + '</b>. Total palindromic substrings = Σ(P+1)/2 = <b>' + total + '</b>. Only <b>' + comps + '</b> character comparisons for t of length ' + m + ' — linear, never quadratic.', parts: [
          { type: 'array', label: 's', values: s.split(''), hl: hlS, showIdx: true },
          { type: 'bars', label: 'final P', values: p.slice(), hl: hlOne(bc, 'sel') },
          { type: 'vars', vals: { longest: s.substr(start, best), count: total, comparisons: comps, '2·|t|': 2 * m }, hl: { longest: 'ok' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: '"abba" — the even palindrome gets a # center', html: `<p>t = <code>#a#b#b#a#</code>. At i = 4 (the <code>#</code> between the two b’s) expansion matches b/b, #/#, a/a, #/# → P[4] = 4. In s that is length 4 starting at (4 − 4)/2 = 0 → <code>abba</code>. Without the padding we would need two separate loops (odd centers + even centers).</p>
        ${H.table(['i', '0', '1', '2', '3', '4', '5', '6', '7', '8'], [['t', '#', 'a', '#', 'b', '#', 'b', '#', 'a', '#'], ['P', '0', '1', '0', '1', '<b>4</b>', '1', '0', '1', '0']])}` },
      { title: '"aaaaaaa" — where O(N²) dies and Manacher copies', html: `<p>Expand-around-center does 1 + 2 + 3 + … comparisons ≈ N<sup>2</sup>/4 on all-same strings. Manacher: after the center of the long palindrome, every new i is inside the box and its mirror already knows almost everything, so it starts with a large k and makes at most one failed comparison. For N = 10<sup>6</sup>: ~2.5·10<sup>11</sup> vs ~4·10<sup>6</sup> comparisons.</p>` },
      { title: 'Counting palindromes in "aaa"', html: `<p>P over <code>#a#a#a#</code> = [0, 1, 2, 3, 2, 1, 0]. Each center contributes (P+1)/2 palindromes (lengths P, P−2, P−4, … ≥ 1): 0 + 1 + 1 + 2 + 1 + 1 + 0 = <b>6</b> → a, a, a, aa, aa, aaa. ✔</p>` },
      { title: 'O(1) palindrome queries', html: `<p>s = <code>abacaba</code>. Is s[1..5] = <code>bacab</code> a palindrome? Center in t is l + r + 1 = 7, and P[7] = 7 (the whole word) ≥ 5 → <b>yes</b>. Is s[0..1] = <code>ab</code>? center = 2, P[2] = 0 &lt; 2 → <b>no</b>. A million queries cost a million array lookups.</p>` }
    ],
    deepDive: `<p><b>Proof sketch of the mirror rule.</b> Inside the box [L, R] centered at C, t[C − d] = t[C + d] for all d ≤ R − C. So the neighbourhood of i (up to R) is the reverse of the neighbourhood of its mirror j = 2C − i (down to L). If j’s palindrome ends strictly inside L, the character that stopped j’s growth has a mirrored copy that stops i at exactly the same radius → P[i] = P[j]. If j’s palindrome reaches L or beyond, we only know i’s palindrome reaches R; the characters past R are unknown, so we expand.</p>
      <p><b>Amortised count.</b> Inside the while loop each match increases i + k; when i + k exceeds R, R is updated to it. Matches that happen while i + k ≤ R are impossible (the start value already saturated that zone), so every match moves R by one. R ≤ 2N ⇒ ≤ 2N matches, ≤ 2N + 1 failures. This is the same “box” argument as the <b>Z-algorithm</b> (DSA 9) — Manacher is literally Z-function thinking applied to reflections.</p>
      <p><b>Variants you will meet.</b> (1) The <code>^#a#b#$</code> sentinel version removes bounds checks because <code>^ ≠ $</code>. (2) The <i>d1/d2</i> version keeps odd and even radii in two arrays over s itself (no padding, half the memory). (3) <b>Palindromic tree (eertree)</b> stores each <i>distinct</i> palindrome once (at most N+2 nodes) — use it for “count distinct palindromic substrings” or “palindromic occurrences per prefix”. (4) Hashing + binary search gives O(N log N) longest palindrome — slower, probabilistic, but generalises to 2D.</p>
      <p><b>Production reality.</b> Real text is Unicode: Java <code>charAt</code> works on UTF-16 code units, so an emoji is two chars and a naive palindrome check can split it. Work on <code>codePoints()</code> or normalised grapheme clusters if the input is user text. Memory: int[2N+1] for N = 10<sup>7</sup> is ~80 MB — use the d1/d2 variant or a byte/short array when radii are bounded.</p>`,
    aiEra: `<p><b>What AI changes:</b> any assistant can produce Manacher in seconds, so “can you type it” is no longer the signal. Interviewers now ask <i>why</i> it is linear, how the mirror rule works, and how to read prefix/suffix/count answers off the P array.</p>
      <p><b>Use AI as a partner:</b> ask <code>Write a stress test that compares my Manacher with an O(N^3) brute force on 10,000 random strings over {a,b}</code>. Small alphabets create many palindromes, which is exactly where off-by-one bugs hide. Ask it to explain one specific frame of the visualizer back to you — if its explanation disagrees with your trace, one of you is wrong, and finding out who is great practice.</p>
      <p><b>Where AI goes wrong:</b> mixing up the two conventions (radius in t vs length in s), so the substring start is off by one; forgetting that P on the padded string already equals the length in s and then doubling it; using <code>min(P[mirror], R − i + 1)</code> with an inclusive/exclusive mismatch. <b>What you must still own:</b> recognising “palindrome + big N” as a Manacher clue, choosing expand-around-center when N ≤ 3000 (simpler, fewer bugs), and proving the O(N) bound out loud.</p>`,
    problems: [{
      title: 'Palindromic Substrings (count them all)', level: 'Medium', tags: ['manacher', 'palindrome', 'string'], companies: ['Facebook', 'Amazon', 'LinkedIn'],
      statement: `<p>Given a string <code>s</code>, return the number of palindromic substrings in it. Substrings at different positions count separately even if they have the same letters.</p>`,
      constraints: `1 ≤ |s| ≤ 10<sup>6</sup> (the original LeetCode 647 has 1000 — we push it so O(N<sup>2</sup>) is not enough), lowercase letters`,
      example: `<p>s = <code>"aaa"</code> → <b>6</b>: ${H.c('g', 'a, a, a')} (length 1), ${H.c('b', 'aa, aa')} (length 2), ${H.c('p', 'aaa')} (length 3).</p><p>s = <code>"abc"</code> → <b>3</b>: only the single letters.</p>`,
      brute: { why: `<p>Check all N(N+1)/2 substrings, each in O(N) → O(N<sup>3</sup>). Even expand-around-center (O(N<sup>2</sup>)) does ~2.5·10<sup>11</sup> steps on <code>"aaa…a"</code> with N = 10<sup>6</sup>. The wasted work: re-discovering the same mirrored characters again and again.</p>`, code: `
        class Brute {
            int countSubstrings(String s) {
                int n = s.length(), count = 0;
                for (int i = 0; i < n; i++)
                    for (int j = i; j < n; j++) {
                        int l = i, r = j;
                        while (l < r && s.charAt(l) == s.charAt(r)) { l++; r--; }
                        if (l >= r) count++;          // s[i..j] is a palindrome
                    }
                return count;
            }
        }` },
      mcq: { q: 'P over the padded string at some center is 5. How many palindromic substrings share this center?', options: ['5', '3 (lengths 5, 3, 1)', '2', '1'], answer: 1, explain: 'Peeling one character off each end keeps a palindrome: lengths 5, 3, 1 → (5 + 1)/2 = 3.' },
      hints: [`<p>Every palindrome has exactly one center in the <code>#</code>-padded string, and all palindromes with the same center are nested: if the longest has length P, the others have lengths P−2, P−4, …</p>`, `<p>So the answer is Σ ⌈P[i]/2⌉ = Σ (P[i] + 1) / 2 over all centers. You just need every P[i] — Manacher gives all of them in O(N).</p>`, `<p>Use <code>long</code> for the total (N = 10<sup>6</sup> all-same letters gives ~5·10<sup>11</sup>). Recipe: build t, run Manacher, sum (p+1)/2.</p>`],
      solution: {
        approach: `<p>Run Manacher once. For each center the palindromes centered there have lengths P, P − 2, …, down to 1 or 2, i.e. (P + 1)/2 of them (the # centers with P = 0 contribute 0). Sum them.</p>`,
        code: `
          class Solution {
              public long countSubstrings(String s) {
                  int n = s.length(), m = 2 * n + 1;
                  char[] t = new char[m];
                  for (int i = 0; i < m; i++) t[i] = (i % 2 == 0) ? '#' : s.charAt(i / 2);
                  int[] p = new int[m];
                  int c = 0, r = -1;
                  long total = 0;
                  for (int i = 0; i < m; i++) {
                      int k = (i > r) ? 0 : Math.min(p[2 * c - i], r - i);   // mirror gift
                      while (i - k - 1 >= 0 && i + k + 1 < m && t[i - k - 1] == t[i + k + 1]) k++;
                      p[i] = k;
                      if (i + k > r) { c = i; r = i + k; }
                      total += (k + 1) / 2;                                   // nested palindromes at this center
                  }
                  return total;
              }
          }`,
        alt: [{ lang: 'python', code: `
class Solution:
    def countSubstrings(self, s: str) -> int:
        t = '#' + '#'.join(s) + '#'
        m, p, c, r, total = len(t), [0] * (2 * len(s) + 1), 0, -1, 0
        for i in range(m):
            k = 0 if i > r else min(p[2 * c - i], r - i)
            while i - k - 1 >= 0 and i + k + 1 < m and t[i - k - 1] == t[i + k + 1]:
                k += 1
            p[i] = k
            if i + k > r:
                c, r = i, i + k
            total += (k + 1) // 2
        return total` }],
        dry: { head: ['i', 't[i]', 'inside box?', 'start k', 'P[i]', '(P+1)/2', 'total'], rows: [
          ['0', '#', 'no', '0', '0', '0', '0'],
          ['1', 'a', 'no', '0', '1', '1', '1'],
          ['2', '#', 'yes (mirror 0)', '0', '2', '1', '2'],
          ['3', 'a', 'yes (mirror 1)', '1', '3', '2', '4'],
          ['4', '#', 'yes (mirror 2)', '2', '2', '1', '5'],
          ['5', 'a', 'yes (mirror 1)', '1', '1', '1', '6'],
          ['6', '#', 'yes (mirror 0)', '0', '0', '0', H.c('g', '<b>6</b>')]
        ] },
        complexity: `<p>Time <b>O(N)</b> (R only moves right), space O(N) for t and P.</p>`,
        followUps: ['Count only <b>distinct</b> palindromic substrings (palindromic tree / eertree, or Manacher + hashing).', 'Return the palindromic substring count for every prefix of s.', 'Answer Q queries “how many palindromes lie fully inside s[l..r]?” (offline, harder).']
      }
    }]
  });

  // =====================================================================
  // TOPIC 2 — Suffix Array
  // =====================================================================
  topics.push({
    title: 'Suffix Array: Sorting Every Ending (Prefix Doubling) + Pattern Search',
    analogy: `<p><b>Imagine cutting a sentence into all of its “tails”.</b> For <code>banana</code> you write six strips of paper: <i>banana, anana, nana, ana, na, a</i>. Now sort the strips like words in a dictionary and write down only the <b>starting position</b> of each strip. That list of positions is the <b>suffix array</b>.</p>
      <p>Why bother? Because <b>every substring is the beginning of some tail</b>. Once the tails are in dictionary order, all tails that begin with <code>ana</code> sit <b>next to each other</b> — exactly like all words starting with “ana” sit together in a dictionary. Finding them is a binary search, like flipping to the right page of a phone book.</p>`,
    explain: `<h4>1. Definition with a picture</h4>
      <p>A <b>suffix</b> is the string from some index to the end. The <b>suffix array</b> <code>SA</code> lists suffix start indices in sorted (lexicographic) order.</p>
      ${H.table(['rank (position in SA)', 'SA[rank]', 'suffix'], [
        ['0', '5', '<code>a</code>'], ['1', '3', '<code>ana</code>'], ['2', '1', '<code>anana</code>'],
        ['3', '0', '<code>banana</code>'], ['4', '4', '<code>na</code>'], ['5', '2', '<code>nana</code>']
      ])}
      ${H.arr([5, 3, 1, 0, 4, 2], { label: 'SA for "banana"', idx: true })}
      <p>It is just <b>N integers</b> (4N bytes in Java) — far lighter than a suffix tree (often 20N+ bytes) yet it answers most of the same questions.</p>
      <h4>2. Naive build and why it is too slow</h4>
      <p>Sort N strings with a comparison sort: N log N comparisons, but each comparison can cost O(N) characters → <b>O(N<sup>2</sup> log N)</b>. Fine for N = 1000, hopeless for 10<sup>5</sup> (think <code>aaaa…a</code>, where every comparison scans far).</p>
      <h4>3. Prefix doubling — sort by 1, 2, 4, 8 … characters</h4>
      <p>Key idea: if you already know the order of all suffixes by their first <b>k</b> characters (as small integer <i>ranks</i>), then the order by the first <b>2k</b> characters is just sorting <b>pairs</b> <code>(rank[i], rank[i + k])</code> — the first half and the second half. Comparing two integer pairs is O(1), not O(N).</p>
      ${H.table(['i', 'suffix', 'k = 1: rank', 'pair (r[i], r[i+1])', 'k = 2: rank', 'pair (r[i], r[i+2])', 'k = 4: rank'], [
        ['0', 'banana', '1', '(1, 0)', '2', '(2, 3)', '3'],
        ['1', 'anana', '0', '(0, 2)', '1', '(1, 1)', '2'],
        ['2', 'nana', '2', '(2, 0)', '3', '(3, 1)', '5'],
        ['3', 'ana', '0', '(0, 2)', '1', '(1, 0)', '1'],
        ['4', 'na', '2', '(2, 0)', '3', '(3, −1)', '4'],
        ['5', 'a', '0', '(0, −1)', '0', '(0, −1)', H.c('g', '0 → all distinct, stop')]
      ])}
      <p>(−1 means “the suffix already ended”, which sorts first — <code>a</code> &lt; <code>ana</code>.) After at most ⌈log₂ N⌉ rounds all ranks are different and the order is final.</p>
      ${H.table(['How you sort the pairs each round', 'Total time'], [
        ['<code>Arrays.sort</code> with a pair comparator', 'O(N log<sup>2</sup> N) — easiest to write in an interview'],
        ['Counting/radix sort on pairs (cyclic version with a sentinel)', H.c('g', 'O(N log N)') + ' — the competitive-programming standard'],
        ['SA-IS / DC3 (induced sorting)', 'O(N) — what libraries use; rarely asked to code']
      ])}
      <h4>4. Searching a pattern: two binary searches</h4>
      <p>Pattern P occurs at position i ⇔ P is a <b>prefix</b> of suffix i. All such suffixes form one contiguous block of SA. Find the block with <b>lower bound</b> (first suffix ≥ P) and <b>upper bound</b> (first suffix whose first |P| chars are &gt; P). Each comparison costs O(|P|) → <b>O(|P| log N)</b> per query, and the block size is the occurrence count.</p>
      ${H.arr(['a', 'ana', 'anana', 'banana', 'na', 'nana'], { label: 'suffixes in SA order — searching "ana"', hl: { 1: 'g', 2: 'g' } })}
      <p>Block = ranks [1, 3) → 2 occurrences, at positions SA[1] = 3 and SA[2] = 1.</p>`,
    clues: [
      '"<b>many queries</b>: does / how often does pattern P occur in a fixed big text T?" → build SA once, answer each query by binary search.',
      '"<b>k-th lexicographically smallest</b> substring / suffix", "sorted order of all substrings" → SA (+ LCP to skip duplicates).',
      '"<b>longest repeated</b>", "<b>number of distinct</b> substrings", "longest common substring" → SA + LCP (next topic).',
      '"lexicographically smallest <b>rotation</b>" → SA of s + s (or Booth’s algorithm).',
      'N ≤ 10<sup>5</sup>–10<sup>6</sup> with string comparisons inside a sort → naive O(N<sup>2</sup> log N) is out; prefix doubling O(N log N) is in.',
      'Bioinformatics / search-engine flavour: "index a genome", "full-text search without a hash", "Burrows–Wheeler", "FM-index".'
    ],
    code: [`
      class SuffixArray {
          // O(N log N) prefix doubling with counting sort on CYCLIC shifts.
          // We append a sentinel smaller than every real char so cyclic order == suffix order.
          static int[] build(String str) {
              int n = str.length() + 1;
              int[] a = new int[n];
              for (int i = 0; i < n - 1; i++) a[i] = str.charAt(i) + 1;   // shift: sentinel 0 is smallest
              a[n - 1] = 0;
              int alphabet = 0;
              for (int x : a) alphabet = Math.max(alphabet, x + 1);
              int[] p = new int[n], c = new int[n], cnt = new int[Math.max(alphabet, n)];
              // round 0: counting sort by the first character
              for (int x : a) cnt[x]++;
              for (int i = 1; i < alphabet; i++) cnt[i] += cnt[i - 1];
              for (int i = n - 1; i >= 0; i--) p[--cnt[a[i]]] = i;
              int classes = 1;
              c[p[0]] = 0;
              for (int i = 1; i < n; i++) { if (a[p[i]] != a[p[i - 1]]) classes++; c[p[i]] = classes - 1; }
              int[] pn = new int[n], cn = new int[n];
              for (int len = 1; len < n && classes < n; len <<= 1) {
                  // shifting by -len makes the list already sorted by the SECOND half
                  for (int i = 0; i < n; i++) { pn[i] = p[i] - len; if (pn[i] < 0) pn[i] += n; }
                  // stable counting sort by the FIRST half (class of pn[i])
                  Arrays.fill(cnt, 0, classes, 0);
                  for (int i = 0; i < n; i++) cnt[c[pn[i]]]++;
                  for (int i = 1; i < classes; i++) cnt[i] += cnt[i - 1];
                  for (int i = n - 1; i >= 0; i--) p[--cnt[c[pn[i]]]] = pn[i];
                  // re-rank: new class when either half differs
                  cn[p[0]] = 0;
                  classes = 1;
                  for (int i = 1; i < n; i++) {
                      int curA = c[p[i]], prevA = c[p[i - 1]];
                      int curB = c[(p[i] + len) % n], prevB = c[(p[i - 1] + len) % n];
                      if (curA != prevA || curB != prevB) classes++;
                      cn[p[i]] = classes - 1;
                  }
                  int[] tmp = c; c = cn; cn = tmp;
              }
              return Arrays.copyOfRange(p, 1, n);   // drop the sentinel suffix (always first)
          }

          // -1: suffix < p, 0: p is a prefix of the suffix, +1: suffix > p
          static int cmp(String s, int start, String p) {
              for (int k = 0; k < p.length(); k++) {
                  if (start + k >= s.length()) return -1;          // suffix ran out first → smaller
                  char x = s.charAt(start + k), y = p.charAt(k);
                  if (x != y) return x < y ? -1 : 1;
              }
              return 0;
          }

          // occurrences of p are SA[lo .. hi-1]
          static int[] occurrenceRange(String s, int[] sa, String p) {
              int lo = 0, hi = sa.length;
              while (lo < hi) { int mid = (lo + hi) >>> 1; if (cmp(s, sa[mid], p) < 0) lo = mid + 1; else hi = mid; }
              int left = lo;
              hi = sa.length;
              while (lo < hi) { int mid = (lo + hi) >>> 1; if (cmp(s, sa[mid], p) <= 0) lo = mid + 1; else hi = mid; }
              return new int[]{left, lo};
          }

          public static void main(String[] args) {
              String s = "banana";
              int[] sa = build(s);
              System.out.println(Arrays.toString(sa));              // [5, 3, 1, 0, 4, 2]
              int[] r = occurrenceRange(s, sa, "ana");
              System.out.println("ana occurs " + (r[1] - r[0]) + " times");   // 2
          }
      }`, `
      class SuffixArraySimple {
          // O(N log^2 N): easiest to write under interview pressure.
          static int[] build(String s) {
              int n = s.length();
              if (n == 0) return new int[0];
              Integer[] sa = new Integer[n];
              int[] rank = new int[n], tmp = new int[n];
              for (int i = 0; i < n; i++) { sa[i] = i; rank[i] = s.charAt(i); }
              for (int k = 1; ; k <<= 1) {
                  final int K = k;
                  final int[] r = rank;
                  Comparator<Integer> cmp = (x, y) -> {
                      if (r[x] != r[y]) return Integer.compare(r[x], r[y]);        // first half
                      int rx = x + K < n ? r[x + K] : -1, ry = y + K < n ? r[y + K] : -1;
                      return Integer.compare(rx, ry);                               // second half
                  };
                  Arrays.sort(sa, cmp);
                  tmp[sa[0]] = 0;
                  for (int i = 1; i < n; i++) tmp[sa[i]] = tmp[sa[i - 1]] + (cmp.compare(sa[i - 1], sa[i]) < 0 ? 1 : 0);
                  System.arraycopy(tmp, 0, rank, 0, n);
                  if (rank[sa[n - 1]] == n - 1) break;     // all ranks distinct → fully sorted
              }
              int[] res = new int[n];
              for (int i = 0; i < n; i++) res[i] = sa[i];
              return res;
          }
          public static void main(String[] args) {
              System.out.println(Arrays.toString(build("mississippi"))); // [10, 7, 4, 1, 0, 9, 8, 6, 3, 5, 2]
          }
      }`, { lang: 'python', run: true, title: 'Prefix doubling in Python (runnable)', code: `
def suffix_array(s):
    n = len(s)
    sa = list(range(n))
    rank = [ord(ch) for ch in s]
    k = 1
    while True:
        key = lambda i: (rank[i], rank[i + k] if i + k < n else -1)   # (first half, second half)
        sa.sort(key=key)
        new = [0] * n
        for j in range(1, n):
            new[sa[j]] = new[sa[j - 1]] + (key(sa[j]) != key(sa[j - 1]))
        rank = new
        if rank[sa[-1]] == n - 1:          # every suffix has its own rank
            return sa
        k *= 2

for word in ["banana", "mississippi", "aaaa"]:
    sa = suffix_array(word)
    print(word, sa, [word[i:] for i in sa])
` }],
    codeTitle: ['O(N log N) suffix array + pattern search (Java)', 'O(N log² N) comparator version (Java)', 'Python (runnable)'],
    viz: {
      title: 'Prefix doubling: ranks by 1, 2, 4 … characters',
      input: 'banana',
      inputLabel: 'Lowercase word (max 12 letters)',
      gen: function (input) {
        var s = readWord(input, 'banana', 12, 'the word');
        var n = s.length, frames = [], i;
        var rows0 = [];
        for (i = 0; i < n; i++) rows0.push([i, s.slice(i)]);
        frames.push({ narr: 'All ' + n + ' suffixes of <b>' + H.esc(s) + '</b> in their natural order (by start index). Goal: sort them like dictionary words — but without comparing whole strings.', parts: [
          { type: 'table', label: 'suffixes', columns: ['start i', 'suffix'], rows: rows0 }
        ] });
        var rank = [];
        for (i = 0; i < n; i++) rank.push(s.charCodeAt(i) - 97);
        // compress first ranks
        var uniq = rank.slice().sort(function (a, b) { return a - b; }).filter(function (v, j, arr) { return j === 0 || arr[j - 1] !== v; });
        rank = rank.map(function (v) { return uniq.indexOf(v); });
        var order = [];
        for (i = 0; i < n; i++) order.push(i);
        order.sort(function (a, b) { return rank[a] - rank[b] || a - b; });
        frames.push({ narr: 'Round 0: rank each suffix by its <b>first character only</b> (a → smallest). Ties (same first letter) are not resolved yet — they share a rank.', parts: [
          { type: 'table', label: 'ranked by 1 char', columns: ['start i', 'first char', 'rank'], rows: order.map(function (x) { return [x, s[x], rank[x]]; }) },
          { type: 'array', label: 'rank[i] by start index', values: rank.slice(), showIdx: true }
        ] });
        var k = 1, rounds = 0;
        while (rounds < 6) {
          var distinct = {};
          rank.forEach(function (v) { distinct[v] = 1; });
          if (Object.keys(distinct).length === n) break;
          var K = k, R = rank.slice();
          var pairOf = function (x) { return [R[x], x + K < n ? R[x + K] : -1]; };
          order.sort(function (a, b) { var pa = pairOf(a), pb = pairOf(b); return pa[0] - pb[0] || pa[1] - pb[1] || a - b; });
          var nr = [], rows = [], hl = {};
          nr[order[0]] = 0;
          for (i = 1; i < n; i++) {
            var p1 = pairOf(order[i - 1]), p2 = pairOf(order[i]);
            nr[order[i]] = nr[order[i - 1]] + ((p1[0] !== p2[0] || p1[1] !== p2[1]) ? 1 : 0);
          }
          var counts = {};
          for (i = 0; i < n; i++) counts[nr[order[i]]] = (counts[nr[order[i]]] || 0) + 1;
          for (i = 0; i < n; i++) {
            var x = order[i], pr = pairOf(x);
            rows.push([x, s.slice(x, x + 2 * K) + (x + 2 * K < n ? '…' : ''), '(' + pr[0] + ', ' + pr[1] + ')', nr[x]]);
            if (counts[nr[x]] > 1) hl[i] = 'bad';
          }
          frames.push({ narr: 'Round with k = ' + K + ': each suffix i gets the pair <b>(rank[i], rank[i+' + K + '])</b> = (first ' + K + ' chars, next ' + K + ' chars). −1 means the suffix already ended (sorts first). Sorting these integer pairs orders suffixes by their first <b>' + (2 * K) + '</b> characters. ' + (Object.keys(counts).length === n ? '<span class="c-g">All ranks now distinct!</span>' : '<span class="c-r">Red rows still tie</span> → another round.'), parts: [
            { type: 'table', label: 'sorted by first ' + (2 * K) + ' chars', columns: ['start i', 'first ' + (2 * K) + ' chars', 'pair', 'new rank'], rows: rows, hl: hl },
            { type: 'array', label: 'new rank[i] by start index', values: nr.slice(), showIdx: true }
          ] });
          rank = nr; k *= 2; rounds++;
        }
        var sa = order.slice();
        frames.push({ narr: 'Finished after ' + rounds + ' doubling round(s) (≤ ⌈log₂ ' + n + '⌉). Read the start indices top to bottom: that is the <b>suffix array</b>.', parts: [
          { type: 'array', label: 'SA', values: sa, showIdx: true, hl: (function () { var h = {}; for (var z = 0; z < n; z++) h[z] = 'sel'; return h; })() },
          { type: 'table', label: 'suffixes in sorted order', columns: ['rank', 'SA[rank]', 'suffix'], rows: sa.map(function (x, j) { return [j, x, s.slice(x)]; }) }
        ] });
        // bonus: search the most frequent 2-letter pattern
        var L2 = Math.min(2, n), freq = {}, pat = s.slice(0, L2);
        for (i = 0; i + L2 <= n; i++) { var sub = s.slice(i, i + L2); freq[sub] = (freq[sub] || 0) + 1; if (freq[sub] > freq[pat]) pat = sub; }
        var match = {}, cnt = 0;
        sa.forEach(function (x, j) { if (s.slice(x, x + pat.length) === pat) { match[j] = 'ok'; cnt++; } });
        frames.push({ narr: 'Why it is useful: every occurrence of a pattern is a <b>prefix of a suffix</b>, and those suffixes are adjacent in SA. Pattern <code>' + H.esc(pat) + '</code> → a contiguous green block of <b>' + cnt + '</b> row(s), found with two binary searches in O(|P| log N).', parts: [
          { type: 'table', label: 'search "' + H.esc(pat) + '"', columns: ['rank', 'SA[rank]', 'suffix'], rows: sa.map(function (x, j) { return [j, x, s.slice(x)]; }), hl: match }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'mississippi — the classic textbook SA', html: `<p>SA(<code>mississippi</code>) = [10, 7, 4, 1, 0, 9, 8, 6, 3, 5, 2]: <code>i, ippi, issippi, ississippi, mississippi, pi, ppi, sippi, sissippi, ssippi, ssissippi</code>. Searching <code>ssi</code> lands on the block [9, 11) → positions 5 and 2.</p>` },
      { title: 'Why doubling needs only log N rounds', html: `<p>After round r the ranks reflect the first 2<sup>r</sup> characters. Two different suffixes differ somewhere within their first N characters, so after ⌈log₂ N⌉ rounds every rank is unique. For N = 10<sup>6</sup> that is just 20 rounds of a linear counting sort ≈ 2·10<sup>7</sup> simple operations.</p>` },
      { title: 'The cyclic + sentinel trick', html: `<p>The O(N log N) code sorts <b>cyclic shifts</b> of <code>s + '$'</code> where <code>$</code> is smaller than every letter. Because <code>$</code> appears once, comparing two cyclic shifts stops at or before the <code>$</code> — so cyclic order equals suffix order, and the second half of a pair is simply the class at <code>(i + k) mod n</code>, no −1 special case.</p>
        ${H.table(['shift of "aba$"', 'sorted'], [['aba$', '$aba'], ['ba$a', 'a$ab'], ['a$ab', 'aba$'], ['$aba', 'ba$a']])}<p>Drop the first entry (the <code>$</code> shift) → SA(<code>aba</code>) = [2, 0, 1].</p>` },
      { title: 'Lexicographically smallest rotation', html: `<p>Every rotation of s is a length-|s| prefix of a suffix of <code>s + s</code>. Build SA of <code>s + s</code>, take the first suffix starting before |s| → that start is the best rotation. For <code>bca</code>: <code>bcabca</code> → smallest suffix starting in [0, 3) is <code>abca</code> (start 2) → rotation <b>abc</b>.</p>` }
    ],
    deepDive: `<p><b>Counting-sort round in detail.</b> Sorting pairs (c[i], c[i+k]) needs two stable passes in radix style — but the list sorted by the <i>second</i> key is free: take the previous order p and shift every entry left by k (<code>p[i] − k mod n</code>). Then one stable counting sort by the first key finishes the job. That is why each round is O(N) and the whole build O(N log N) with tiny constants.</p>
      <p><b>Linear-time builders.</b> <b>SA-IS</b> (Nong, Zhang &amp; Chan, 2009) classifies suffixes as S/L-type, sorts only the “LMS” suffixes recursively and induces the rest; it is what <code>libdivsufsort</code>/<code>sais</code> and many bioinformatics tools use. <b>DC3/skew</b> (Kärkkäinen–Sanders) sorts suffixes at positions i mod 3 ≠ 0 recursively and merges. In interviews you are expected to <i>know they exist</i>, not code them.</p>
      <p><b>Relationship to suffix trees.</b> The SA is the order of leaves in a DFS of the suffix tree (children sorted by edge letter); the LCP array gives the string depths of the LCAs of neighbouring leaves. With SA + LCP + RMQ you can simulate most suffix-tree algorithms with 4–5× less memory. Search can be sped up from O(|P| log N) to O(|P| + log N) using LCP information during binary search (Manber–Myers).</p>
      <p><b>Production reality.</b> The Burrows–Wheeler Transform (used by bzip2) is literally “the character before each suffix, in SA order”; the <b>FM-index</b> built on it lets read aligners (BWA, Bowtie) search a 3-billion-letter human genome in a few GB of RAM. Pitfalls in code: Java <code>substring</code> inside a comparator allocates O(N) per call (O(N<sup>2</sup>) memory traffic); <code>int</code> overflow when N(N+1)/2 is computed for counting; recursion depth is not an issue (all iterative).</p>`,
    aiEra: `<p><b>What AI changes:</b> suffix arrays are suddenly <i>hot</i> outside competitive programming. Training-data deduplication for language models (Lee et al., 2021, “Deduplicating Training Data Makes Language Models Better”) built suffix arrays over hundreds of GB of text to find every repeated span of 50+ tokens, and <b>infini-gram</b> (2024) answers n-gram counts over trillions of tokens with a suffix array — the exact “count occurrences by two binary searches” idea from this topic, at internet scale.</p>
      <p><b>Use AI as a partner:</b> let it draft the O(N log N) build, then ask it to <code>add assertions that SA is a permutation and adjacent suffixes are strictly increasing, and fuzz against sorting all suffixes naively for N ≤ 12</code>. Ask it to explain why shifting p by −k gives the second-key order — if it cannot, write the explanation yourself.</p>
      <p><b>Where AI goes wrong:</b> mixing cyclic and non-cyclic versions (forgetting the sentinel, so <code>aa</code>’s suffixes tie forever), comparing with <code>substring()</code> in a comparator (silently quadratic), and off-by-one upper bounds in the pattern search. <b>What you must still own:</b> knowing when a hash map of substrings is enough versus when you truly need sorted-suffix structure (k-th substring, LCP-based counts), and estimating memory for N = 10<sup>8</sup>.</p>`,
    problems: [{
      title: 'Count Pattern Occurrences for Many Queries', level: 'Medium', tags: ['suffix array', 'binary search', 'string'], companies: ['Google', 'Amazon'],
      statement: `<p>You are given a fixed text <code>T</code> and <code>Q</code> query patterns. For each pattern <code>P</code>, return how many times it occurs in <code>T</code> (occurrences may overlap).</p>`,
      constraints: `1 ≤ |T| ≤ 2·10<sup>5</sup>, 1 ≤ Q ≤ 10<sup>5</sup>, Σ|P| ≤ 10<sup>6</sup>, lowercase letters`,
      example: `<p>T = <code>"banana"</code>, queries = [<code>"ana"</code>, <code>"na"</code>, <code>"x"</code>, <code>"banana"</code>] → <b>[2, 2, 0, 1]</b>.</p><p>${H.c('g', '"ana"')} starts at 1 and 3 (they overlap — still both count). ${H.c('r', '"x"')} never appears.</p>`,
      brute: { why: `<p>Scan T for every query: O(|T|·|P|) per query with naive matching, or O(|T| + |P|) with KMP — still O(Q·|T|) = 2·10<sup>10</sup>. The wasted work: re-reading the same text for every query. Build a reusable index once instead.</p>`, code: `
        class Brute {
            int[] count(String t, String[] qs) {
                int[] ans = new int[qs.length];
                for (int q = 0; q < qs.length; q++) {
                    int from = 0, c = 0;
                    while ((from = t.indexOf(qs[q], from)) != -1) { c++; from++; }  // overlapping
                    ans[q] = c;
                }
                return ans;
            }
        }` },
      mcq: { q: 'In a suffix array, the suffixes that start with pattern P…', options: ['are scattered randomly', 'form one contiguous block', 'are always the first |P| entries', 'cannot be found without LCP'], answer: 1, explain: 'Sorted order groups all strings that share a prefix, exactly like a dictionary groups words starting with the same letters.' },
      hints: [`<p>An occurrence of P at index i means P is a <b>prefix</b> of suffix i. In sorted order, all suffixes with prefix P are neighbours.</p>`, `<p>Build the suffix array once (O(N log N)). For each query do a lower bound (first suffix ≥ P) and an upper bound (first suffix whose first |P| chars are &gt; P).</p>`, `<p>Compare a suffix and P only on the first |P| characters; if the suffix ends early it is <i>smaller</i>. Answer = upper − lower. Edge cases: P longer than T, P equal to T.</p>`],
      solution: {
        approach: `<p>Index once, query many times. The suffix array turns “find all occurrences” into “find a range in a sorted list”, which binary search does in O(|P| log |T|). Total O(|T| log |T| + Σ|P| · log |T|) ≈ 2·10<sup>7</sup> char comparisons.</p>`,
        code: `
          class Solution {
              private String t;
              private int[] sa;

              public int[] countAll(String text, String[] queries) {
                  t = text;
                  sa = buildSA(text);
                  int[] ans = new int[queries.length];
                  for (int q = 0; q < queries.length; q++) {
                      String p = queries[q];
                      int lo = bound(p, false), hi = bound(p, true);
                      ans[q] = hi - lo;
                  }
                  return ans;
              }

              // strict == false: first index with suffix >= p (prefix-wise)
              // strict == true : first index with suffix  > p (prefix-wise)
              private int bound(String p, boolean strict) {
                  int lo = 0, hi = sa.length;
                  while (lo < hi) {
                      int mid = (lo + hi) >>> 1, c = cmp(sa[mid], p);
                      if (c < 0 || (strict && c == 0)) lo = mid + 1; else hi = mid;
                  }
                  return lo;
              }

              private int cmp(int start, String p) {
                  for (int k = 0; k < p.length(); k++) {
                      if (start + k >= t.length()) return -1;
                      char x = t.charAt(start + k), y = p.charAt(k);
                      if (x != y) return x < y ? -1 : 1;
                  }
                  return 0;
              }

              // O(N log^2 N) prefix doubling (short and safe)
              private static int[] buildSA(String s) {
                  int n = s.length();
                  Integer[] sa = new Integer[n];
                  int[] rank = new int[n], tmp = new int[n];
                  for (int i = 0; i < n; i++) { sa[i] = i; rank[i] = s.charAt(i); }
                  for (int k = 1; n > 1; k <<= 1) {
                      final int K = k;
                      final int[] r = rank;
                      Comparator<Integer> cmp = (x, y) -> r[x] != r[y] ? Integer.compare(r[x], r[y])
                              : Integer.compare(x + K < n ? r[x + K] : -1, y + K < n ? r[y + K] : -1);
                      Arrays.sort(sa, cmp);
                      tmp[sa[0]] = 0;
                      for (int i = 1; i < n; i++) tmp[sa[i]] = tmp[sa[i - 1]] + (cmp.compare(sa[i - 1], sa[i]) < 0 ? 1 : 0);
                      System.arraycopy(tmp, 0, rank, 0, n);
                      if (rank[sa[n - 1]] == n - 1) break;
                  }
                  int[] res = new int[n];
                  for (int i = 0; i < n; i++) res[i] = sa[i];
                  return res;
              }
          }`,
        alt: [{ lang: 'python', code: `
from bisect import bisect_left, bisect_right

def count_all(text, queries):
    sa = sorted(range(len(text)), key=lambda i: text[i:])     # fine for small inputs; use doubling for big ones
    out = []
    for p in queries:
        keys = [text[i:i + len(p)] for i in sa]             # first |p| chars of each suffix, sorted
        out.append(bisect_right(keys, p) - bisect_left(keys, p))
    return out

print(count_all("banana", ["ana", "na", "x", "banana"]))   # [2, 2, 0, 1]` }],
        dry: { head: ['search', 'lo', 'hi', 'mid', 'suffix at SA[mid]', 'cmp with "ana"', 'move'], rows: [
          ['lower', '0', '6', '3', 'banana', '+1 (b &gt; a)', 'hi = 3'],
          ['lower', '0', '3', '1', 'ana', '0 (prefix)', 'hi = 1'],
          ['lower', '0', '1', '0', 'a', '−1 (ended early)', 'lo = 1 → <b>L = 1</b>'],
          ['upper', '1', '6', '3', 'banana', '+1', 'hi = 3'],
          ['upper', '1', '3', '2', 'anana', '0', 'lo = 3 → <b>U = 3</b>'],
          ['answer', '', '', '', 'SA[1..2] = {3, 1}', '', H.c('g', '<b>3 − 1 = 2</b>')]
        ] },
        complexity: `<p>Build O(N log<sup>2</sup> N) (or O(N log N) with counting sort). Each query O(|P| log N). Space O(N).</p>`,
        followUps: ['Also return the <b>smallest starting index</b> of each pattern (range-minimum over SA[lo..hi−1] with a sparse table).', 'Speed queries to O(|P| + log N) using LCP-aware binary search.', 'Text arrives in a stream — how does an online suffix automaton compare?']
      }
    }]
  });
registerModule({ id: 'dsa24', title: 'Advanced String Algorithms', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
