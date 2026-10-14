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

  // =====================================================================
  // TOPIC 3 — LCP array with Kasai
  // =====================================================================
  topics.push({
    title: 'LCP Array with Kasai’s Algorithm (and Range-Min Superpowers)',
    analogy: `<p><b>Open a dictionary and look at two neighbouring words</b>: <i>international</i> and <i>internet</i>. They share the first 6 letters <code>intern</code>. If you write, next to every word, “how many starting letters I share with the word right above me”, you get the <b>LCP array</b> (Longest Common Prefix).</p>
      <p>Kasai’s trick is like <b>a bookmark that can only slip back one page</b>. When you go from the suffix <code>anana</code> to the next one in the text, <code>nana</code>, you just chopped off one letter. Whatever overlap <code>anana</code> had with its dictionary neighbour, <code>nana</code> keeps at least that overlap minus one. So you never restart counting from zero — and the total work stays linear.</p>`,
    explain: `<h4>1. What LCP means</h4>
      <p>With the suffix array in hand, define <code>lcp[r]</code> = length of the longest common prefix of the suffixes at ranks <code>r − 1</code> and <code>r</code> (neighbours in sorted order). <code>lcp[0] = 0</code> by convention.</p>
      ${H.table(['rank r', 'SA[r]', 'suffix', 'lcp[r] (with the row above)'], [
        ['0', '5', '<code>a</code>', '0'],
        ['1', '3', '<code>ana</code>', '1 (<code>a</code>)'],
        ['2', '1', '<code>anana</code>', H.c('g', '<b>3</b> (<code>ana</code>)')],
        ['3', '0', '<code>banana</code>', '0'],
        ['4', '4', '<code>na</code>', '0'],
        ['5', '2', '<code>nana</code>', '2 (<code>na</code>)']
      ])}
      ${H.arr([0, 1, 3, 0, 0, 2], { label: 'lcp for "banana"', hl: { 2: 'g' }, idx: true })}
      <h4>2. Naive vs Kasai</h4>
      <p>Comparing each neighbour pair from scratch costs up to O(N) per pair → O(N<sup>2</sup>) on <code>aaaa…</code>. <b>Kasai (2001)</b> processes suffixes in <b>text order</b> (i = 0, 1, 2, …), not sorted order, and carries a counter <code>h</code>:</p>
      <ol>
        <li>Find the sorted neighbour above suffix i: <code>j = SA[rank[i] − 1]</code>.</li>
        <li>Extend <code>h</code> while <code>s[i + h] == s[j + h]</code>.</li>
        <li>Store <code>lcp[rank[i]] = h</code>, then do <code>h = max(h − 1, 0)</code> and move to i + 1.</li>
      </ol>
      <p><b>Why h may only drop by 1:</b> suffix i and j share h letters. Remove the first letter of both → suffixes i + 1 and j + 1 share h − 1 letters, and j + 1 sorts before i + 1. The true neighbour of i + 1 sits between them in sorted order, so it shares <b>at least</b> h − 1 letters too. h rises at most N times in total and falls at most N times → <b>O(N)</b>.</p>
      <h4>3. LCP of ANY two suffixes = a range minimum</h4>
      <p>For ranks a &lt; b, LCP(suffix SA[a], suffix SA[b]) = <b>min(lcp[a + 1 .. b])</b>. Shared prefixes can only shrink as you walk through the sorted list. With a sparse table (DSA 21) every such query is O(1) after O(N log N) prep. This lets you compare any two substrings of s in O(1).</p>
      <h4>4. The questions LCP answers instantly</h4>
      ${H.table(['Question', 'Recipe', 'Time'], [
        ['Longest repeated substring (occurs ≥ 2 times, may overlap)', 'max lcp[r]', 'O(N)'],
        ['Longest substring occurring ≥ k times', 'max over windows of k consecutive ranks of min(lcp inside window)', 'O(N) with a monotonic deque'],
        ['Number of distinct substrings', 'N(N+1)/2 − Σ lcp[r]', 'O(N)'],
        ['Longest common substring of A and B', 'SA of A + "#" + B; max lcp[r] where ranks r−1 and r come from different strings', 'O((|A|+|B|) log)'],
        ['LCP / comparison of any two substrings', 'rank lookup + range-min on lcp', 'O(1) per query']
      ])}`,
    clues: [
      '"<b>longest repeated / duplicate</b> substring" (possibly overlapping) → max of the LCP array.',
      '"substring that appears <b>at least k times</b>" → sliding window of size k over SA, window-min of LCP.',
      '"count <b>distinct</b> substrings" with N ≥ 10<sup>4</sup> → N(N+1)/2 − Σ lcp.',
      '"<b>longest common substring</b> of two (or k) strings" → concatenate with unique separators, SA + LCP.',
      '"compare two substrings lexicographically many times" → ranks + RMQ on LCP (O(1) per comparison).',
      'You already have a suffix array and the question mentions “shared prefix”, “overlap”, “repeat” → you need LCP.'
    ],
    code: [`
      class LcpToolkit {
          static int[] buildSA(String s) {                       // O(N log^2 N) prefix doubling
              int n = s.length();
              Integer[] sa = new Integer[n];
              int[] rank = new int[n], tmp = new int[n];
              for (int i = 0; i < n; i++) { sa[i] = i; rank[i] = s.charAt(i); }
              for (int k = 1; n > 1; k <<= 1) {
                  final int K = k;
                  final int[] r = rank;
                  Comparator<Integer> c = (x, y) -> r[x] != r[y] ? Integer.compare(r[x], r[y])
                          : Integer.compare(x + K < n ? r[x + K] : -1, y + K < n ? r[y + K] : -1);
                  Arrays.sort(sa, c);
                  tmp[sa[0]] = 0;
                  for (int i = 1; i < n; i++) tmp[sa[i]] = tmp[sa[i - 1]] + (c.compare(sa[i - 1], sa[i]) < 0 ? 1 : 0);
                  System.arraycopy(tmp, 0, rank, 0, n);
                  if (rank[sa[n - 1]] == n - 1) break;
              }
              int[] res = new int[n];
              for (int i = 0; i < n; i++) res[i] = sa[i];
              return res;
          }

          // Kasai: lcp[r] = LCP(suffix SA[r-1], suffix SA[r]); lcp[0] = 0. O(N).
          static int[] kasai(String s, int[] sa) {
              int n = s.length();
              int[] rank = new int[n], lcp = new int[n];
              for (int r = 0; r < n; r++) rank[sa[r]] = r;
              int h = 0;
              for (int i = 0; i < n; i++) {                      // TEXT order, not sorted order
                  if (rank[i] == 0) { h = 0; continue; }         // no neighbour above
                  int j = sa[rank[i] - 1];                       // sorted neighbour above suffix i
                  while (i + h < n && j + h < n && s.charAt(i + h) == s.charAt(j + h)) h++;
                  lcp[rank[i]] = h;
                  if (h > 0) h--;                                // the "bookmark slips back one" step
              }
              return lcp;
          }

          static String longestRepeated(String s) {
              int[] sa = buildSA(s), lcp = kasai(s, sa);
              int best = 0, at = 0;
              for (int r = 1; r < s.length(); r++) if (lcp[r] > best) { best = lcp[r]; at = sa[r]; }
              return s.substring(at, at + best);
          }

          static String longestCommon(String a, String b) {
              String s = a + "#" + b;                            // '#' must not appear in a or b
              int[] sa = buildSA(s), lcp = kasai(s, sa);
              int n1 = a.length(), best = 0, at = 0;
              for (int r = 1; r < s.length(); r++) {
                  boolean fromA = sa[r] < n1, prevFromA = sa[r - 1] < n1;
                  if (fromA != prevFromA && lcp[r] > best) { best = lcp[r]; at = sa[r]; }
              }
              return s.substring(at, at + best);
          }

          public static void main(String[] args) {
              String s = "banana";
              int[] sa = buildSA(s);
              System.out.println(Arrays.toString(kasai(s, sa)));         // [0, 1, 3, 0, 0, 2]
              System.out.println(longestRepeated("banana"));             // ana
              System.out.println(longestCommon("xabcdey", "zzbcdq"));    // bcd
          }
      }`, `
      class LcpRmq {
          // O(1) LCP of any two suffixes with a sparse table over lcp[].
          final int[][] sp;
          final int[] rank, log;
          LcpRmq(int[] sa, int[] lcp) {
              int n = sa.length;
              rank = new int[n];
              for (int r = 0; r < n; r++) rank[sa[r]] = r;
              log = new int[n + 1];
              for (int i = 2; i <= n; i++) log[i] = log[i / 2] + 1;
              sp = new int[log[Math.max(n, 1)] + 1][];
              sp[0] = lcp.clone();
              for (int k = 1; k < sp.length; k++) {
                  sp[k] = new int[n];
                  for (int i = 0; i + (1 << k) <= n; i++) sp[k][i] = Math.min(sp[k - 1][i], sp[k - 1][i + (1 << (k - 1))]);
              }
          }
          // LCP of suffixes starting at positions i and j (i != j)
          int lcp(int i, int j) {
              int a = Math.min(rank[i], rank[j]) + 1, b = Math.max(rank[i], rank[j]);
              int k = log[b - a + 1];
              return Math.min(sp[k][a], sp[k][b - (1 << k) + 1]);
          }
          public static void main(String[] args) {
              // banana: SA = [5,3,1,0,4,2], lcp = [0,1,3,0,0,2]
              LcpRmq q = new LcpRmq(new int[]{5, 3, 1, 0, 4, 2}, new int[]{0, 1, 3, 0, 0, 2});
              System.out.println(q.lcp(1, 3));   // anana vs ana -> 3
              System.out.println(q.lcp(5, 1));   // a vs anana   -> 1
              System.out.println(q.lcp(0, 2));   // banana vs nana -> 0
          }
      }`],
    codeTitle: ['Kasai + longest repeated + longest common substring (Java)', 'O(1) LCP of any two suffixes with a sparse table (Java)'],
    viz: {
      title: 'Kasai: the bookmark that only slips back one step',
      input: 'banana',
      inputLabel: 'Lowercase word (max 12 letters)',
      gen: function (input) {
        var s = readWord(input, 'banana', 12, 'the word');
        var n = s.length, sa = saJS(s), rank = [], lcp = [], frames = [], i, comps = 0;
        for (i = 0; i < n; i++) { rank[sa[i]] = i; lcp.push(0); }
        function rows() { return sa.map(function (x, r) { return [r, x, s.slice(x), r === 0 ? '—' : (lcp[r] === null ? '?' : lcp[r])]; }); }
        for (i = 1; i < n; i++) lcp[i] = null;
        frames.push({ narr: 'Start with the suffix array of <b>' + H.esc(s) + '</b>. We want lcp[r] for every row (overlap with the row above). Kasai visits suffixes in <b>text order</b> i = 0, 1, 2 … and carries a counter h between steps.', parts: [
          { type: 'table', label: 'sorted suffixes', columns: ['rank', 'SA', 'suffix', 'lcp'], rows: rows() },
          { type: 'array', label: 'rank[i] (where suffix i sits)', values: rank.slice(), showIdx: true }
        ] });
        var h = 0;
        for (i = 0; i < n; i++) {
          var hl = {};
          if (rank[i] === 0) {
            h = 0; hl[0] = 'cur';
            frames.push({ narr: 'i = ' + i + ' (<code>' + H.esc(s.slice(i)) + '</code>) is the smallest suffix (rank 0) — nobody above it. Reset h = 0.', parts: [
              { type: 'table', label: 'sorted suffixes', columns: ['rank', 'SA', 'suffix', 'lcp'], rows: rows(), hl: hl },
              { type: 'vars', vals: { i: i, h: h, 'char comparisons': comps } }
            ] });
            continue;
          }
          var j = sa[rank[i] - 1], h0 = h;
          while (i + h < n && j + h < n && s[i + h] === s[j + h]) { h++; comps++; }
          if (i + h < n && j + h < n) comps++;
          lcp[rank[i]] = h;
          hl[rank[i]] = 'cur'; hl[rank[i] - 1] = 'win';
          var shared = s.slice(i, i + h);
          frames.push({ narr: 'i = ' + i + ': suffix <code>' + H.esc(s.slice(i)) + '</code> sits at rank ' + rank[i] + '; the row above is <code>' + H.esc(s.slice(j)) + '</code>. We already know they share <b>h = ' + h0 + '</b> letters (carried over), so we only compare from position ' + h0 + ' on → extended by ' + (h - h0) + ' → lcp[' + rank[i] + '] = <b>' + h + '</b>' + (h ? ' (<code>' + H.esc(shared) + '</code>)' : '') + '. Then h drops by one to ' + Math.max(h - 1, 0) + ' for suffix i + 1.', parts: [
            { type: 'table', label: 'sorted suffixes', columns: ['rank', 'SA', 'suffix', 'lcp'], rows: rows(), hl: hl },
            { type: 'vars', vals: { i: i, j: j, 'h carried in': h0, 'h after extend': h, 'char comparisons': comps }, hl: { 'h after extend': 'ok' } }
          ] });
          if (h > 0) h--;
        }
        var best = 0, br = 0, sum = 0;
        for (i = 1; i < n; i++) { sum += lcp[i]; if (lcp[i] > best) { best = lcp[i]; br = i; } }
        var hl2 = {}; if (best > 0) { hl2[br] = 'sel'; hl2[br - 1] = 'sel'; }
        frames.push({ narr: 'Done with only <b>' + comps + '</b> character comparisons (≤ 2N). Max lcp = ' + best + (best ? ' → longest repeated substring <b>' + H.esc(s.substr(sa[br], best)) + '</b>' : ' → no letter repeats') + '. Distinct substrings = N(N+1)/2 − Σlcp = ' + (n * (n + 1) / 2) + ' − ' + sum + ' = <b>' + (n * (n + 1) / 2 - sum) + '</b>.', parts: [
          { type: 'table', label: 'final', columns: ['rank', 'SA', 'suffix', 'lcp'], rows: rows(), hl: hl2 },
          { type: 'bars', label: 'lcp array', values: lcp.map(function (v) { return v || 0; }), hl: hlOne(best ? br : -1, 'sel') }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Longest repeated substring of "banana"', html: `<p>lcp = [0, 1, 3, 0, 0, 2]. Max = 3 at rank 2 (<code>anana</code> vs <code>ana</code>) → <b>"ana"</b>. Note the two copies <i>overlap</i> (positions 1 and 3) — the LCP method allows overlap automatically. If the problem forbids overlap, you need extra checks (|SA[r] − SA[r−1]| ≥ length).</p>` },
      { title: 'At least k = 3 times in "aaaa"', html: `<p>SA = [3, 2, 1, 0] (<code>a, aa, aaa, aaaa</code>), lcp = [0, 1, 2, 3]. A substring appearing ≥ 3 times = prefix shared by 3 consecutive ranks = min of 2 consecutive lcp values. Windows: min(1, 2) = 1, min(2, 3) = 2 → answer <b>"aa"</b> (at 0, 1, 2). ✔</p>` },
      { title: 'Longest common substring via a separator', html: `<p>A = <code>xabcdey</code>, B = <code>zzbcdq</code>. Build SA of <code>xabcdey#zzbcdq</code>. The suffixes <code>bcdey#…</code> (from A) and <code>bcdq</code> (from B) become neighbours with lcp 3 → <b>"bcd"</b>. The unique <code>#</code> stops any common prefix from leaking across the boundary.</p>` },
      { title: 'O(1) substring comparison', html: `<p>Compare s[i..i+L) with s[j..j+L): let l = LCP(i, j) from the sparse table. If l ≥ L they are equal; otherwise compare the single characters s[i + l] and s[j + l]. This is how suffix-array solutions compare substrings in O(1) where hashing would be probabilistic.</p>` }
    ],
    deepDive: `<p><b>Formal lemma (Kasai et al., 2001).</b> Let rank[i] &gt; 0 and h = lcp[rank[i]] &gt; 0. Let j = SA[rank[i] − 1], so suffix j &lt; suffix i and they share h letters. Then suffix j+1 &lt; suffix i+1 and they share h − 1 letters. Every suffix ranked between j+1 and i+1 must share those h − 1 letters with i+1 (sorted order keeps common prefixes), in particular the immediate predecessor of i+1. Hence lcp[rank[i+1]] ≥ h − 1. Potential argument: h ≤ N always, decreases by ≤ 1 per step (≤ N total decrements), so total increments ≤ 2N.</p>
      <p><b>The LCP interval tree.</b> Ranges of SA where all lcp values are ≥ ℓ form intervals — exactly the internal nodes of the suffix tree at string depth ℓ. Many “suffix tree” algorithms (bottom-up traversal, maximal repeats, supermaximal repeats) can be run over SA + LCP with one stack in O(N) — the same monotonic-stack idea as “largest rectangle in histogram” (DSA 13). For example, “maximise length × occurrence count of a substring” is <b>largest rectangle in the LCP histogram</b>.</p>
      <p><b>Engineering notes.</b> Kasai needs s, SA, rank and lcp in memory: 13N bytes for ASCII + ints. Variants (Φ-algorithm by Kärkkäinen, Manzini &amp; Puglisi) reduce memory traffic and cache misses — Kasai’s random access <code>SA[rank[i] − 1]</code> jumps across memory. For k strings, use k distinct separators (or an array of ints where separators are negative unique values) so no LCP crosses a boundary, and track which string each suffix came from.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating Kasai is trivial for an assistant, but <b>the conventions</b> differ everywhere — some define lcp[r] with the row <i>below</i>, some store N−1 values, some use 1-based ranks. Mixing a generated SA (one convention) with a generated LCP (another) is the #1 source of silent bugs.</p>
      <p><b>Use AI as a partner:</b> ask <code>State the exact convention of your lcp array in a comment, and write a brute-force checker that computes lcp by direct comparison for every N ≤ 10 string over {a,b}</code>. Exhaustive tiny tests over a 2-letter alphabet catch nearly every off-by-one. For data work, AI tools can propose “find repeated boilerplate across 10k documents” pipelines — knowing SA + LCP lets you judge whether they will scale.</p>
      <p><b>Where AI goes wrong:</b> forgetting to reset h when rank[i] = 0 (works on most tests, fails on some), allowing LCP to cross a separator in the two-string version because the separator also appears in the input, and returning overlapping repeats when the problem demands non-overlapping ones. <b>What you must still own:</b> the h − 1 lemma (interviewers love asking “why is this linear?”) and the mapping from question words (“repeated”, “≥ k times”, “distinct”, “common”) to an LCP recipe.</p>`,
    problems: [{
      title: 'Longest Duplicate Substring', level: 'Hard', tags: ['suffix array', 'lcp', 'kasai', 'binary search', 'rolling hash'], companies: ['Google', 'Amazon', 'Bloomberg'],
      statement: `<p>Given a string <code>s</code>, return <b>any</b> duplicated substring (a substring that occurs at least twice; occurrences may overlap) that has the longest possible length. If there is none, return <code>""</code>.</p>`,
      constraints: `2 ≤ |s| ≤ 3·10<sup>4</sup>, lowercase English letters (LeetCode 1044)`,
      example: `<p>s = <code>"banana"</code> → <b>"ana"</b> (at ${H.c('g', 'index 1')} and ${H.c('b', 'index 3')}, overlapping). s = <code>"abcd"</code> → <b>""</b> (no letter repeats).</p>`,
      brute: { why: `<p>For every length L from long to short, put all substrings of length L in a HashSet → O(N<sup>2</sup>) substrings, each costing O(N) to hash/copy → O(N<sup>3</sup>) ≈ 2.7·10<sup>13</sup>. The waste: re-hashing the same characters for every L and every start.</p>`, code: `
        class Brute {
            String longestDupSubstring(String s) {
                int n = s.length();
                for (int len = n - 1; len >= 1; len--) {
                    Set<String> seen = new HashSet<>();
                    for (int i = 0; i + len <= n; i++) {
                        String sub = s.substring(i, i + len);   // O(len) copy each time
                        if (!seen.add(sub)) return sub;
                    }
                }
                return "";
            }
        }` },
      mcq: { q: 'After building SA and the LCP array, the longest duplicated substring has length…', options: ['the minimum LCP', 'the maximum LCP', 'Σ LCP', 'N − max LCP'], answer: 1, explain: 'A repeated substring is a common prefix of two suffixes; the longest such common prefix is attained by some sorted neighbours, i.e. max lcp.' },
      hints: [`<p>A substring occurs twice ⇔ it is a common prefix of two different suffixes. The longest common prefix of any two suffixes is achieved by two suffixes that are <b>neighbours</b> in sorted order.</p>`, `<p>Build the suffix array, then the LCP array with Kasai. Answer = max lcp[r], starting at SA[r]. (Alternative: binary search on length + Rabin–Karp with a strong hash.)</p>`, `<p>Edge cases: all lcp = 0 → return "". Use the O(N log<sup>2</sup> N) builder — N = 3·10<sup>4</sup> is small. Recipe: SA → rank → Kasai with carried h → track argmax → substring.</p>`],
      solution: {
        approach: `<p>Deterministic O(N log<sup>2</sup> N): suffix array + Kasai’s LCP. The answer is the largest lcp value; its suffix SA[r] begins with the duplicate. No hashing, so no collision risk — a nice talking point versus the usual Rabin–Karp + binary-search solution.</p>`,
        code: `
          class Solution {
              public String longestDupSubstring(String s) {
                  int n = s.length();
                  int[] sa = buildSA(s);
                  int[] rank = new int[n];
                  for (int r = 0; r < n; r++) rank[sa[r]] = r;
                  int h = 0, best = 0, at = 0;
                  for (int i = 0; i < n; i++) {
                      if (rank[i] == 0) { h = 0; continue; }
                      int j = sa[rank[i] - 1];
                      while (i + h < n && j + h < n && s.charAt(i + h) == s.charAt(j + h)) h++;
                      if (h > best) { best = h; at = i; }        // lcp[rank[i]] = h
                      if (h > 0) h--;
                  }
                  return s.substring(at, at + best);
              }

              private int[] buildSA(String s) {
                  int n = s.length();
                  Integer[] sa = new Integer[n];
                  int[] rank = new int[n], tmp = new int[n];
                  for (int i = 0; i < n; i++) { sa[i] = i; rank[i] = s.charAt(i); }
                  for (int k = 1; n > 1; k <<= 1) {
                      final int K = k;
                      final int[] r = rank;
                      Comparator<Integer> c = (x, y) -> r[x] != r[y] ? Integer.compare(r[x], r[y])
                              : Integer.compare(x + K < n ? r[x + K] : -1, y + K < n ? r[y + K] : -1);
                      Arrays.sort(sa, c);
                      tmp[sa[0]] = 0;
                      for (int i = 1; i < n; i++) tmp[sa[i]] = tmp[sa[i - 1]] + (c.compare(sa[i - 1], sa[i]) < 0 ? 1 : 0);
                      System.arraycopy(tmp, 0, rank, 0, n);
                      if (rank[sa[n - 1]] == n - 1) break;
                  }
                  int[] res = new int[n];
                  for (int i = 0; i < n; i++) res[i] = sa[i];
                  return res;
              }
          }`,
        alt: [{ lang: 'python', code: `
class Solution:
    def longestDupSubstring(self, s: str) -> str:
        # Binary search on length + Rabin-Karp with a 61-bit Mersenne modulus (probabilistic, verified).
        MOD, B = (1 << 61) - 1, 911382323
        n = len(s)
        pref, pw = [0] * (n + 1), [1] * (n + 1)
        for i, ch in enumerate(s):
            pref[i + 1] = (pref[i] * B + ord(ch)) % MOD
            pw[i + 1] = pw[i] * B % MOD

        def find(L):
            seen = {}
            for i in range(n - L + 1):
                h = (pref[i + L] - pref[i] * pw[L]) % MOD
                if h in seen and s[seen[h]:seen[h] + L] == s[i:i + L]:   # verify to rule out collisions
                    return i
                seen.setdefault(h, i)
            return -1

        lo, hi, start = 1, n - 1, -1
        best = 0
        while lo <= hi:
            mid = (lo + hi) // 2
            pos = find(mid)
            if pos != -1:
                best, start, lo = mid, pos, mid + 1
            else:
                hi = mid - 1
        return s[start:start + best] if best else ""` }],
        dry: { head: ['i (text order)', 'suffix i', 'neighbour above j', 'h carried', 'h after extend', 'best'], rows: [
          ['0', 'banana', '1 (anana)', '0', '0', '0'],
          ['1', 'anana', '3 (ana)', '0', '<b>3</b>', H.c('g', '3 at 1')],
          ['2', 'nana', '4 (na)', '2', '2', '3'],
          ['3', 'ana', '5 (a)', '1', '1', '3'],
          ['4', 'na', '0 (banana)', '0', '0', '3'],
          ['5', 'a', '— (rank 0)', 'reset', '0', H.c('g', '<b>"ana"</b>')]
        ] },
        complexity: `<p>SA O(N log<sup>2</sup> N), Kasai O(N), space O(N). Deterministic. The hash + binary search alternative is O(N log N) expected but needs collision handling.</p>`,
        followUps: ['Non-overlapping version: longest substring occurring twice <b>without overlap</b> (binary search on L + check max/min SA in each LCP ≥ L group).', 'Longest substring occurring at least <b>k</b> times.', 'Return the duplicate that is lexicographically smallest among the longest ones.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 4 — Aho-Corasick
  // =====================================================================
  function buildAhoJS(pats) {
    var nodes = [{ ch: '', str: '', parent: -1, depth: 0, kids: {}, fail: 0, pat: [] }];
    pats.forEach(function (p, k) {
      var v = 0;
      for (var i = 0; i < p.length; i++) {
        var c = p[i];
        if (nodes[v].kids[c] === undefined) {
          nodes.push({ ch: c, str: nodes[v].str + c, parent: v, depth: nodes[v].depth + 1, kids: {}, fail: 0, pat: [] });
          nodes[v].kids[c] = nodes.length - 1;
        }
        v = nodes[v].kids[c];
      }
      nodes[v].pat.push(k);
    });
    return nodes;
  }
  function layoutTrie(nodes) {
    var slot = 0, maxD = 1, H;
    nodes.forEach(function (nd) { if (nd.depth > maxD) maxD = nd.depth; });
    var ys = [];
    function dfs(v) {
      var ks = Object.keys(nodes[v].kids).sort();
      if (!ks.length) { ys[v] = slot++; return; }
      var sum = 0;
      ks.forEach(function (c) { dfs(nodes[v].kids[c]); sum += ys[nodes[v].kids[c]]; });
      ys[v] = sum / ks.length;
    }
    dfs(0);
    H = Math.max(36, (slot + 1) * 8);
    return { height: H, pos: nodes.map(function (nd, v) { return { x: 6 + nd.depth * (86 / maxD), y: (ys[v] + 1) * (H / (slot + 1)) }; }) };
  }

  topics.push({
    title: 'Aho–Corasick: Searching for Many Patterns in One Pass',
    analogy: `<p><b>Picture a librarian checking a long letter for 1,000 banned words.</b> Running 1,000 separate searches would mean reading the letter 1,000 times. Instead, she memorises all the words in one big “word tree” (a trie) and reads the letter <b>once</b>, following the tree letter by letter.</p>
      <p>When the next letter does not fit (she was reading <code>his</code> and now sees <code>h</code>), she does not start over. She asks: <i>“What is the longest ending of what I just read that is still the start of some banned word?”</i> — here <code>s</code>, because <code>she</code> starts with <code>s</code>. That “plan B” arrow is the <b>failure link</b>. It is KMP’s idea (DSA 9), stretched from one pattern to a whole dictionary.</p>`,
    explain: `<h4>1. The problem</h4>
      <p>Text of length <b>N</b>, k patterns of total length <b>M</b>. Report every (pattern, position) match, or count them. Running KMP k times costs O(k·N + M) — with k = 10<sup>4</sup> patterns and N = 10<sup>6</sup> that is 10<sup>10</sup>. Aho–Corasick (1975) costs <b>O(N + M·σ + Z)</b>, where σ = alphabet size and Z = number of matches reported.</p>
      <h4>2. Step 1 — put all patterns in a trie</h4>
      <p>Patterns <code>he, she, his, hers</code>: each node is a prefix of some pattern; nodes where a pattern ends are marked.</p>
      ${H.table(['node', 'string', 'pattern ends here?'], [
        ['0', '(root)', ''], ['1', 'h', ''], ['2', 'he', H.c('g', 'he')], ['3', 's', ''], ['4', 'sh', ''],
        ['5', 'she', H.c('g', 'she')], ['6', 'hi', ''], ['7', 'his', H.c('g', 'his')], ['8', 'her', ''], ['9', 'hers', H.c('g', 'hers')]
      ])}
      <h4>3. Step 2 — failure links by BFS</h4>
      <p><code>fail(v)</code> = the node for the <b>longest proper suffix</b> of v’s string that is also in the trie. Compute in BFS order (shallow first): for child u = v + c, <code>fail(u) = go(fail(v), c)</code>.</p>
      ${H.table(['node', 'fail →', 'why'], [
        ['h, s', 'root', 'depth-1 nodes always fail to the root'],
        ['sh', H.c('b', 'h'), 'longest suffix of “sh” in the trie is “h”'],
        ['she', H.c('b', 'he'), 'suffix “he” is a node — and a pattern! So reaching “she” also means “he” ended here'],
        ['his', H.c('b', 's'), 'suffix “s” is a node (start of “she”)'],
        ['hers', H.c('b', 's'), 'suffixes “ers”, “rs” are not nodes; “s” is']
      ])}
      <h4>4. Step 3 — outputs through the fail chain</h4>
      <p>A match can hide inside another: at “she” the pattern “he” also ends. So the matches at a state are: its own pattern(s) + those of fail(v), fail(fail(v)), … Store a <b>dictionary (output) link</b> = nearest node on the fail chain that ends a pattern, so you jump only to real matches. If you only need <b>counts</b>, add visit counts up the fail tree at the end (see the guided problem) — no chain walking at all.</p>
      <h4>5. Step 4 — scan the text once</h4>
      <p>Precompute the complete transition table <code>go[v][c]</code> (missing edges point to <code>go[fail(v)][c]</code>), and scanning becomes one array lookup per character:</p>
      ${H.table(['i', 'char', 'state after', 'matches ending here'], [
        ['0', 'a', 'root', ''], ['1', 'h', 'h', ''], ['2', 'i', 'hi', ''], ['3', 's', 'his', H.c('g', 'his')],
        ['4', 'h', 'sh (via fail his → s)', ''], ['5', 'e', 'she', H.c('g', 'she, he')], ['6', 'r', 'her (via fail she → he)', ''], ['7', 's', 'hers', H.c('g', 'hers')]
      ])}
      <p>Text <code>ahishers</code> → 4 matches in a single left-to-right pass.</p>`,
    clues: [
      '"given a <b>dictionary / list of words</b>, find all occurrences in a text" → one trie + failure links, not k separate searches.',
      '"<b>stream of characters</b>: after each new char, does some word end here?" → Aho–Corasick state machine (or a reversed trie for short words).',
      '"<b>banned words</b>", "virus signatures", "keyword filter", "block list", "intrusion detection" → multi-pattern matching.',
      '"text must <b>not contain</b> any forbidden pattern; count strings of length L" → DP over Aho–Corasick states (states × length).',
      '"<b>build the target</b> from given words with minimum cost" with Σ|words| up to 5·10<sup>4</sup> → Aho–Corasick to list which words end at each position, then DP.',
      'Constraints like Σ|patterns| ≤ 10<sup>5</sup> and |text| ≤ 10<sup>6</sup> together → linear-ish multi-pattern search.'
    ],
    code: [`
      class AhoCorasick {
          private final int[][] go;        // complete transition table (after build)
          private final int[] fail;        // failure link of each node
          private final int[] dictLink;    // nearest node on the fail chain that ends a pattern (-1 if none)
          private final int[] patAt;       // pattern index ending at node, or -1 (assumes distinct patterns)
          private final int[] patLen;
          private int nodes = 1;

          AhoCorasick(String[] patterns) {
              int cap = 1;
              for (String p : patterns) cap += p.length();
              go = new int[cap][26];
              for (int[] row : go) Arrays.fill(row, -1);
              fail = new int[cap];
              dictLink = new int[cap];
              patAt = new int[cap];
              Arrays.fill(patAt, -1);
              patLen = new int[patterns.length];
              // 1) trie
              for (int k = 0; k < patterns.length; k++) {
                  int v = 0;
                  for (char ch : patterns[k].toCharArray()) {
                      int c = ch - 'a';
                      if (go[v][c] == -1) go[v][c] = nodes++;
                      v = go[v][c];
                  }
                  patAt[v] = k;
                  patLen[k] = patterns[k].length();
              }
              // 2) BFS: failure links, dictionary links, complete transitions
              ArrayDeque<Integer> q = new ArrayDeque<>();
              dictLink[0] = -1;
              for (int c = 0; c < 26; c++) {
                  int u = go[0][c];
                  if (u == -1) go[0][c] = 0;                       // stay at root
                  else { fail[u] = 0; dictLink[u] = -1; q.add(u); }
              }
              while (!q.isEmpty()) {
                  int v = q.poll();
                  for (int c = 0; c < 26; c++) {
                      int u = go[v][c];
                      if (u == -1) { go[v][c] = go[fail[v]][c]; continue; }   // borrow plan B's edge
                      fail[u] = go[fail[v]][c];
                      dictLink[u] = patAt[fail[u]] != -1 ? fail[u] : dictLink[fail[u]];
                      q.add(u);
                  }
              }
          }

          // every match as {patternIndex, startPosition}
          List<int[]> findAll(String text) {
              List<int[]> res = new ArrayList<>();
              int v = 0;
              for (int i = 0; i < text.length(); i++) {
                  v = go[v][text.charAt(i) - 'a'];                     // ONE lookup per character
                  for (int u = patAt[v] != -1 ? v : dictLink[v]; u != -1; u = dictLink[u])
                      res.add(new int[]{patAt[u], i - patLen[patAt[u]] + 1});
              }
              return res;
          }

          public static void main(String[] args) {
              String[] pats = {"he", "she", "his", "hers"};
              AhoCorasick ac = new AhoCorasick(pats);
              for (int[] m : ac.findAll("ahishers"))
                  System.out.println(pats[m[0]] + " at " + m[1]);   // his at 1, she at 3, he at 4, hers at 4
          }
      }`, { lang: 'python', run: true, title: 'Aho–Corasick in Python (runnable)', code: `
from collections import deque

def aho_corasick(patterns, text):
    goto, fail, out = [{}], [0], [[]]          # node 0 = root
    for p in patterns:                          # 1) trie
        v = 0
        for ch in p:
            if ch not in goto[v]:
                goto.append({}); fail.append(0); out.append([])
                goto[v][ch] = len(goto) - 1
            v = goto[v][ch]
        out[v].append(p)
    q = deque(goto[0].values())                 # 2) BFS failure links
    while q:
        v = q.popleft()
        for ch, u in goto[v].items():
            f = fail[v]
            while f and ch not in goto[f]:
                f = fail[f]
            fail[u] = goto[f].get(ch, 0)          # longest proper suffix that is a trie node
            out[u] = out[u] + out[fail[u]]      # inherit matches hidden in the suffix
            q.append(u)
    v, found = 0, []                            # 3) one pass over the text
    for i, ch in enumerate(text):
        while v and ch not in goto[v]:
            v = fail[v]                         # plan B
        v = goto[v].get(ch, 0)
        for p in out[v]:
            found.append((p, i - len(p) + 1))
    return found

print(aho_corasick(["he", "she", "his", "hers"], "ahishers"))
print(aho_corasick(["a", "aa", "aaa"], "aaaa"))
` }],
    codeTitle: ['Aho–Corasick with complete goto table + dictionary links (Java)', 'Dictionary-based version (Python, runnable)'],
    viz: {
      title: 'Aho–Corasick: build the trie, add failure links, scan once',
      input: 'he she his hers | ahishers',
      inputLabel: 'patterns separated by spaces | text',
      gen: function (input) {
        var raw = String(input === undefined || input === null ? 'he she his hers | ahishers' : input);
        var parts = raw.split('|');
        if (parts.length !== 2) throw new Error('Format: patterns separated by spaces | text   (example: he she his hers | ahishers)');
        var pats = parts[0].trim().split(/\s+/).filter(function (x) { return x.length; });
        var text = parts[1].replace(/\s+/g, '');
        if (!pats.length || !text.length) throw new Error('Need at least one pattern and a non-empty text.');
        if (pats.length > 6) throw new Error('Use at most 6 patterns.');
        pats.forEach(function (p) { if (!/^[a-z]{1,5}$/.test(p)) throw new Error('Each pattern: 1-5 lowercase letters.'); });
        if (!/^[a-z]{1,14}$/.test(text)) throw new Error('Text: 1-14 lowercase letters.');
        var nodes = buildAhoJS(pats), L = layoutTrie(nodes), frames = [];
        function gnodes(upto) {
          var arr = [];
          for (var v = 0; v < nodes.length && v < upto; v++) arr.push({ id: 'n' + v, label: v === 0 ? 'root' : nodes[v].str, x: L.pos[v].x, y: L.pos[v].y });
          return arr;
        }
        function trieEdges(upto) {
          var e = [];
          for (var v = 1; v < nodes.length && v < upto; v++) e.push(['n' + nodes[v].parent, 'n' + v, nodes[v].ch]);
          return e;
        }
        function tagsFor(upto) {
          var t = {};
          for (var v = 1; v < nodes.length && v < upto; v++) if (nodes[v].pat.length) t['n' + v] = '✔ ' + nodes[v].pat.map(function (k) { return pats[k]; }).join(',');
          return t;
        }
        frames.push({ narr: 'Patterns: <b>' + pats.map(H.esc).join(', ') + '</b>. Text: <b>' + H.esc(text) + '</b>. Step 1 — insert every pattern into one trie (shared prefixes share nodes).', parts: [
          { type: 'graph', label: 'trie', directed: true, height: L.height, nodes: gnodes(1), edges: [], hl: { n0: 'cur' } }
        ] });
        // insertion frames: nodes are numbered in creation order, so "first v nodes" = trie after some patterns
        var created = 1;
        pats.forEach(function (p) {
          var v = 0, newOnes = {}, path = {};
          for (var i = 0; i < p.length; i++) { v = nodes[v].kids[p[i]]; if (v >= created) newOnes['n' + v] = 'ok'; else path['n' + v] = 'win'; }
          var before = created;
          created = Math.max(created, v + 1);
          for (var z = before; z < created; z++) newOnes['n' + z] = 'ok';
          var hl = cp(path); for (var key in newOnes) hl[key] = newOnes[key];
          frames.push({ narr: 'Insert <code>' + H.esc(p) + '</code>: ' + (Object.keys(path).length ? 'reuse existing prefix nodes (blue), ' : '') + 'create ' + (created - before) + ' new node(s) (green). Mark the last node as “pattern ends here”.', parts: [
            { type: 'graph', label: 'trie', directed: true, height: L.height, nodes: gnodes(created), edges: trieEdges(created), hl: hl, tags: tagsFor(created) }
          ] });
        });
        // BFS failure links
        var order = [], q = [], head = 0, failEdges = [], v, u;
        Object.keys(nodes[0].kids).sort().forEach(function (c) { q.push(nodes[0].kids[c]); nodes[nodes[0].kids[c]].fail = 0; });
        while (head < q.length) {
          v = q[head++]; order.push(v);
          Object.keys(nodes[v].kids).sort().forEach(function (c) {
            u = nodes[v].kids[c];
            var f = nodes[v].fail;
            while (f !== 0 && nodes[f].kids[c] === undefined) f = nodes[f].fail;
            nodes[u].fail = (nodes[f].kids[c] !== undefined && nodes[f].kids[c] !== u) ? nodes[f].kids[c] : 0;
            q.push(u);
          });
        }
        var shownFail = 0;
        order.forEach(function (w) {
          var f = nodes[w].fail;
          if (f !== 0) failEdges.push(['n' + w, 'n' + f, 'fail']);
          var inherit = [];
          for (var g = f; g !== 0; g = nodes[g].fail) nodes[g].pat.forEach(function (k) { inherit.push(pats[k]); });
          var hl = {}; hl['n' + w] = 'cur'; hl['n' + f] = 'sel';
          var ehl = {}; if (f !== 0) ehl['n' + w + '-n' + f] = 'cur';
          if (shownFail < 16) {
            frames.push({ narr: 'BFS visits <code>' + H.esc(nodes[w].str) + '</code>: the longest proper suffix that is also in the trie is <b>' + (f === 0 ? 'empty → root' : '<code>' + H.esc(nodes[f].str) + '</code>') + '</b>. ' + (inherit.length ? '<span class="c-g">Reaching here also means ' + inherit.map(H.esc).join(', ') + ' just ended</span> (inherited through the fail chain).' : '') + (f === 0 ? ' (Links to root are not drawn.)' : ''), parts: [
              { type: 'graph', label: 'trie + failure links', directed: true, height: L.height, nodes: gnodes(nodes.length), edges: trieEdges(nodes.length).concat(failEdges), hl: hl, ehl: ehl, tags: tagsFor(nodes.length) }
            ] });
            shownFail++;
          }
        });
        // scan text
        var state = 0, found = [], allEdges = trieEdges(nodes.length).concat(failEdges);
        for (var i = 0; i < text.length; i++) {
          var c = text[i], hops = [];
          if (state !== 0 && nodes[state].kids[c] === undefined) hops.push(nodes[state].str);
          while (state !== 0 && nodes[state].kids[c] === undefined) { state = nodes[state].fail; hops.push(state === 0 ? 'root' : nodes[state].str); }
          var nxt = nodes[state].kids[c];
          state = nxt === undefined ? 0 : nxt;
          var here = [];
          for (var g2 = state; g2 !== 0; g2 = nodes[g2].fail) nodes[g2].pat.forEach(function (k) { here.push(pats[k]); });
          here.forEach(function (p) { found.push(p + '@' + (i - p.length + 1)); });
          var hl2 = {}; hl2['n' + state] = here.length ? 'ok' : 'cur';
          var thl = {}; thl[i] = 'cur';
          frames.push({ narr: 'Read <code>' + c + '</code> (i = ' + i + '). ' + (hops.length ? 'No edge “' + c + '” from <code>' + H.esc(hops[0]) + '</code> → follow fail link(s) ' + hops.map(function (x) { return '<code>' + H.esc(x) + '</code>'; }).join(' → ') + (nxt === undefined ? ' (no edge there either) → ' : ', then take edge “' + c + '” → ') : '') + 'now at <b>' + (state === 0 ? 'root' : '<code>' + H.esc(nodes[state].str) + '</code>') + '</b>. ' + (here.length ? '<span class="c-g">Match: ' + here.map(H.esc).join(', ') + '</span>' : 'No pattern ends here.'), parts: [
            { type: 'array', label: 'text', values: text.split(''), hl: thl, ptr: hlOne(i, 'i'), showIdx: true },
            { type: 'graph', label: 'automaton', directed: true, height: L.height, nodes: gnodes(nodes.length), edges: allEdges, hl: hl2, tags: tagsFor(nodes.length) },
            { type: 'set', label: 'matches (pattern@start)', items: found.slice(), hl: (function () { var h = {}; here.forEach(function (p) { h[p + '@' + (i - p.length + 1)] = 'ok'; }); return h; })() }
          ] });
        }
        frames.push({ narr: 'One pass over ' + text.length + ' characters found <b>' + found.length + '</b> match(es) for ' + pats.length + ' patterns. Each character costs O(1) amortised (fail hops are paid for by earlier forward steps), plus O(1) per reported match.', parts: [
          { type: 'set', label: 'all matches', items: found.slice() },
          { type: 'vars', vals: { 'text length N': text.length, 'trie nodes': nodes.length, matches: found.length } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Nested patterns: a, aa, aaa in "aaaa"', html: `<p>States walk root → a → aa → aaa → aaa (via fail aaa → aa, then edge a). Outputs through the fail chain: after char 0: {a}; char 1: {aa, a}; char 2: {aaa, aa, a}; char 3: {aaa, aa, a}. Counts: a = 4, aa = 3, aaa = 2 → <b>Z = 9</b> matches. With k nested patterns Z can be Θ(N·k) — which is why counting via the fail tree (no listing) matters.</p>` },
      { title: 'Why BFS order?', html: `<p>fail(u) has a <b>shorter</b> string than u, so it lives at a smaller depth. BFS finishes all of depth d before depth d+1, so when we compute fail(u) = go(fail(v), c), the node fail(v) and its transitions are already final. DFS order would read half-built links.</p>` },
      { title: 'Forbidden-word DP on the automaton', html: `<p>“Count strings of length L over {a, b} that avoid <code>aba</code> and <code>bb</code>.” States = automaton nodes that are not (and do not inherit) a pattern end. dp[len][state] → for each letter, go[state][letter]; skip “bad” states. Answer = Σ dp[L][*]. Complexity O(L · nodes · σ) — the automaton turns “avoid many patterns” into a tiny graph walk.</p>` },
      { title: 'Stream of characters, reversed-trie alternative', html: `<p>LeetCode 1032: after each streamed letter, does a suffix of the stream equal a word? Option A: Aho–Corasick, keep one state, O(1) per letter + output check. Option B: trie of <b>reversed</b> words and walk the last ≤ maxLen letters backwards, O(maxLen) per letter. A is asymptotically better; B is shorter to write when words are ≤ 200 letters.</p>` }
    ],
    deepDive: `<p><b>Complexity accounting.</b> Without the complete goto table, each text step may follow several fail links, but each hop decreases the current depth and each character increases it by at most one, so total hops ≤ N (same potential argument as KMP). With the goto table, build costs O(M·σ) time and memory — 26 ints per node is fine for 10<sup>5</sup> nodes (10 MB) but not for Unicode alphabets; there you keep sparse maps and follow fail links on the fly, or compress the alphabet to the symbols actually present.</p>
      <p><b>The fail tree.</b> Fail links form a tree rooted at the root (each node points to a strictly shallower node). “Number of times pattern k occurs” = number of text positions whose state lies in the <b>subtree</b> of k’s node in the fail tree. So: count visits per state, then sum children into parents in reverse BFS order — or flatten the fail tree with an Euler tour and answer online queries with a Fenwick tree (DSA 21) when patterns or text change.</p>
      <p><b>Real systems.</b> GNU <code>grep -F</code> with many patterns, the Rust <code>aho-corasick</code> crate behind ripgrep, network intrusion detection systems (Snort/Suricata rule pre-filters), antivirus signature scanners and content-moderation block lists all use Aho–Corasick or SIMD-accelerated relatives (Intel Hyperscan, Teddy). Practical tweaks: leftmost-longest vs. overlapping match semantics, case folding, DFA vs NFA representation (complete table vs fail-following) trading memory for speed.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLM systems are full of multi-pattern matching: checking streamed output for any of several <b>stop sequences</b>, redacting secrets that match many key prefixes, guardrail block lists, and splitting special tokens out of text before tokenisation (Hugging Face <code>tokenizers</code>, for example, uses an Aho–Corasick automaton for added tokens). When the list has thousands of entries and text streams token by token, one automaton state per stream is the right design — not a loop of <code>contains()</code> calls.</p>
      <p><b>Use AI as a partner:</b> ask it to generate the automaton, then ask for a <code>randomised test: 50 random patterns over {a,b} of length ≤ 4, random text of length 200, compare with brute-force indexOf for every pattern</code>. Ask it to draw the fail links for your sample in ASCII and check against the visualizer.</p>
      <p><b>Where AI goes wrong:</b> computing fail links in DFS order, forgetting to inherit outputs (missing “he” inside “she”), setting fail(u) = u for depth-1 nodes in the dictionary version (infinite loops), and listing all matches when the question only needs counts (Θ(N·k) blow-up on <code>a, aa, aaa…</code>). <b>What you must still own:</b> spotting “many patterns, one text” in the wording, choosing counts-via-fail-tree versus listing, and estimating the memory of a 26-wide table.</p>`,
    problems: [{
      title: 'Count Occurrences of Every Dictionary Word', level: 'Hard', tags: ['aho-corasick', 'trie', 'bfs', 'fail tree'], companies: ['Google', 'Microsoft', 'Cloudflare'],
      statement: `<p>Given a text and a list of words, return an array where entry k is the number of (possibly overlapping) occurrences of <code>words[k]</code> in the text. Words may repeat in the list and may be prefixes/suffixes of each other.</p>`,
      constraints: `1 ≤ |text| ≤ 10<sup>6</sup>, 1 ≤ k ≤ 10<sup>5</sup>, Σ|words| ≤ 10<sup>5</sup>, lowercase letters. Answers fit in a long.`,
      example: `<p>text = <code>"ahishers"</code>, words = [he, she, his, hers] → <b>[1, 1, 1, 1]</b>.</p><p>text = <code>"aaaa"</code>, words = [a, aa, aaa] → <b>[4, 3, 2]</b> (${H.c('y', 'aa')} starts at 0, 1, 2).</p>`,
      brute: { why: `<p>For each word, scan the whole text: O(k · N) = 10<sup>11</sup>. Even listing all matches with plain Aho–Corasick can be O(N · k) on nested words like a, aa, aaa, …, because every position matches many words. The waste: walking the same fail chains again and again.</p>`, code: `
        class Brute {
            long[] count(String text, String[] words) {
                long[] ans = new long[words.length];
                for (int k = 0; k < words.length; k++) {
                    int from = 0;
                    while ((from = text.indexOf(words[k], from)) != -1) { ans[k]++; from++; }
                }
                return ans;
            }
        }` },
      mcq: { q: 'You counted how many text positions ended in each automaton state. How do you get the count for word w?', options: ['Read the count of w’s node only', 'Sum the counts over w’s subtree in the fail tree', 'Sum counts along the path from root to w in the trie', 'Divide by |w|'], answer: 1, explain: 'A position ends an occurrence of w exactly when w is a suffix of the state’s string, i.e. w’s node is on that state’s fail chain — equivalently the state is in w’s fail-subtree.' },
      hints: [`<p>Scan the text through the automaton and just do <code>cnt[state]++</code> at each position. Don’t walk output chains.</p>`, `<p>w occurs ending at a position iff w’s node is an ancestor of that position’s state in the <b>fail tree</b>. So push counts upward: process nodes in <b>reverse BFS order</b> and do <code>cnt[fail[v]] += cnt[v]</code>.</p>`, `<p>Duplicate words share a node — remember each word’s end node and read <code>cnt[end[k]]</code>. Use long counts. Recipe: trie → BFS (fail + goto) saving BFS order → scan → reverse-BFS accumulation → read answers.</p>`],
      solution: {
        approach: `<p>Build the automaton (trie + BFS failure links + complete goto table). Scan once, counting visits per state. Every visit to state s is an occurrence of every word on s’s fail chain, so accumulating counts from deep to shallow along fail links gives each node the number of positions where its string ends. Total O(N + M·σ), independent of how many matches there are.</p>`,
        code: `
          class Solution {
              public long[] countOccurrences(String text, String[] words) {
                  int cap = 1;
                  for (String w : words) cap += w.length();
                  int[][] go = new int[cap][26];
                  for (int[] row : go) Arrays.fill(row, -1);
                  int[] fail = new int[cap], end = new int[words.length];
                  int nodes = 1;
                  for (int k = 0; k < words.length; k++) {           // 1) trie
                      int v = 0;
                      for (char ch : words[k].toCharArray()) {
                          int c = ch - 'a';
                          if (go[v][c] == -1) go[v][c] = nodes++;
                          v = go[v][c];
                      }
                      end[k] = v;                                     // duplicates share the node
                  }
                  int[] order = new int[nodes];                       // 2) BFS, remember the order
                  int head = 0, tail = 0;
                  order[tail++] = 0;
                  while (head < tail) {
                      int v = order[head++];
                      for (int c = 0; c < 26; c++) {
                          int u = go[v][c];
                          if (u == -1) go[v][c] = (v == 0) ? 0 : go[fail[v]][c];
                          else { fail[u] = (v == 0) ? 0 : go[fail[v]][c]; order[tail++] = u; }
                      }
                  }
                  long[] cnt = new long[nodes];                       // 3) scan: one visit count per position
                  int v = 0;
                  for (int i = 0; i < text.length(); i++) { v = go[v][text.charAt(i) - 'a']; cnt[v]++; }
                  for (int i = tail - 1; i > 0; i--) cnt[fail[order[i]]] += cnt[order[i]];   // 4) push up the fail tree
                  long[] ans = new long[words.length];
                  for (int k = 0; k < words.length; k++) ans[k] = cnt[end[k]];
                  return ans;
              }
          }`,
        alt: [{ lang: 'python', code: `
from collections import deque

def count_occurrences(text, words):
    go, fail = [[-1] * 26], [0]
    end = []
    for w in words:
        v = 0
        for ch in w:
            c = ord(ch) - 97
            if go[v][c] == -1:
                go[v][c] = len(go); go.append([-1] * 26); fail.append(0)
            v = go[v][c]
        end.append(v)
    order, q = [], deque([0])
    while q:
        v = q.popleft(); order.append(v)
        for c in range(26):
            u = go[v][c]
            if u == -1:
                go[v][c] = 0 if v == 0 else go[fail[v]][c]
            else:
                fail[u] = 0 if v == 0 else go[fail[v]][c]
                q.append(u)
    cnt, v = [0] * len(go), 0
    for ch in text:
        v = go[v][ord(ch) - 97]
        cnt[v] += 1
    for v in reversed(order[1:]):
        cnt[fail[v]] += cnt[v]
    return [cnt[e] for e in end]

print(count_occurrences("aaaa", ["a", "aa", "aaa"]))   # [4, 3, 2]` }],
        dry: { head: ['i', 'char', 'state after', 'how', 'cnt[state]++'], rows: [
          ['0', 'a', 'root', 'no edge from root', 'root = 1'],
          ['1', 'h', 'h', 'trie edge', 'h = 1'],
          ['2', 'i', 'hi', 'trie edge', 'hi = 1'],
          ['3', 's', 'his', 'trie edge', 'his = 1'],
          ['4', 'h', 'sh', 'goto(his, h) = goto(s, h)', 'sh = 1'],
          ['5', 'e', 'she', 'trie edge', 'she = 1'],
          ['6', 'r', 'her', 'goto(she, r) = goto(he, r)', 'her = 1'],
          ['7', 's', 'hers', 'trie edge', 'hers = 1'],
          ['push-up', '', '', 'reverse BFS: hers→s, she→he, his→s, sh→h', H.c('g', 'he = 1, she = 1, his = 1, hers = 1')]
        ] },
        complexity: `<p>Build O(M·26), scan O(N), push-up O(M). Space O(M·26). No dependence on the number of matches Z.</p>`,
        followUps: ['Words are added online between texts — use the Euler tour of the fail tree + Fenwick tree.', 'Report the <b>first</b> position of each word instead of the count.', 'Alphabet is all of Unicode — replace the 26-wide table with hash maps and fail-following.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 5 — Polynomial hashing, double hashing, anti-hash tests
  // =====================================================================
  topics.push({
    title: 'Polynomial Hashing, Double Hashing & Anti-Hash Tests',
    analogy: `<p><b>A string hash is a fingerprint.</b> Comparing two 10,000-page books letter by letter is slow; comparing their fingerprints is instant. Fingerprints are <i>almost</i> always unique — but two different books can, rarely, share one. That is a <b>collision</b>.</p>
      <p><b>Double hashing</b> is checking <i>two</i> fingerprints from two different machines: a fake would have to fool both at once. <b>Anti-hash tests</b> are what a clever forger does when they know <i>exactly</i> which machine you use: they build a fake that fools it on purpose. Your defence is to pick the machine settings (the base) <b>at random when the program starts</b>, so the forger cannot prepare.</p>`,
    explain: `<h4>1. The polynomial hash</h4>
      <p>Treat the string as a number written in base <b>B</b>, then take it modulo a big prime <b>M</b>. Map letters to 1..26 (never 0 — otherwise <code>"a"</code> and <code>"aa"</code> both hash to 0):</p>
      <p><code>H(s) = (s₀·B<sup>n−1</sup> + s₁·B<sup>n−2</sup> + … + s<sub>n−1</sub>) mod M</code></p>
      <p><b>Prefix hashes</b> make every substring hash O(1): <code>pre[i+1] = (pre[i]·B + s<sub>i</sub>) mod M</code> and</p>
      <p><code>H(s[l..r]) = (pre[r+1] − pre[l]·B<sup>r−l+1</sup>) mod M</code> (add M if negative).</p>
      ${H.table(['step', 'value (B = 31, M = 101, a=1 b=2 c=3)'], [
        ['pre[0]', '0'], ['pre[1] = 0·31 + 1', '1'], ['pre[2] = 1·31 + 2', '33'], ['pre[3] = 33·31 + 3 = 1026', '1026 mod 101 = <b>16</b>'],
        ['H("bc") = pre[3] − pre[1]·31<sup>2</sup>', '16 − 961 mod 101 = 16 − 52 = −36 → <b>65</b>'],
        ['check directly: 2·31 + 3', H.c('g', '<b>65</b> ✔')]
      ])}
      <p><b>Rolling</b> a fixed window one step right: <code>h = ((h − s<sub>i</sub>·B<sup>m−1</sup>)·B + s<sub>i+m</sub>) mod M</code> — this is Rabin–Karp.</p>
      <h4>2. How likely is a collision?</h4>
      <p>For two fixed different strings of length n and a <b>random</b> base, the chance they collide is at most n/M (a degree-n polynomial has at most n roots mod a prime). But if you compare <b>many</b> hashes with each other (put K hashes in a set), the <b>birthday paradox</b> kicks in: expected collisions ≈ K<sup>2</sup>/(2M).</p>
      ${H.table(['K hashes in one set', 'M ≈ 10<sup>9</sup> (one mod)', 'M ≈ 10<sup>18</sup> (two mods or 2<sup>61</sup>−1)'], [
        ['10<sup>3</sup>', '≈ 0.0005', '≈ 5·10<sup>−13</sup>'],
        ['10<sup>5</sup>', H.c('r', '≈ 5 — expect collisions!'), '≈ 5·10<sup>−9</sup>'],
        ['10<sup>6</sup>', H.c('r', '≈ 500'), H.c('g', '≈ 5·10<sup>−7</sup>')]
      ])}
      <p>Rule of thumb: <b>one 32-bit-ish modulus is only safe for a handful of comparisons</b>. For “count distinct substrings” style problems use two moduli (a pair) or one 61-bit Mersenne prime.</p>
      <h4>3. Double hashing</h4>
      <p>Compute hashes with two independent (B<sub>1</sub>, M<sub>1</sub>) and (B<sub>2</sub>, M<sub>2</sub>) and compare the <b>pair</b> (or pack it into one <code>long</code>: <code>h1 · 2<sup>32</sup> + h2</code>). Collision chance multiplies: ≈ 1/(M<sub>1</sub>M<sub>2</sub>). Alternative: a single modulus <b>M = 2<sup>61</sup> − 1</b> with 128-bit multiplication (<code>Math.multiplyHigh</code> in Java) — one hash, ~10<sup>18</sup> range, and reduction is just shifts and adds.</p>
      <h4>4. Anti-hash tests — how hashes get broken on purpose</h4>
      ${H.table(['Weak choice', 'Attack', 'Fix'], [
        ['Modulus 2<sup>64</sup> (just let <code>long</code> overflow)', H.c('r', 'Thue–Morse strings of length 2048 collide for <b>every</b> odd base'), 'use a prime modulus'],
        ['Fixed, publicly known base and prime', 'attacker precomputes a collision (birthday search or lattice reduction)', H.c('g', 'random base chosen at runtime')],
        ['Single ~10<sup>9</sup> modulus with many comparisons', 'birthday paradox, no attacker needed', 'double hash or 2<sup>61</sup>−1'],
        ['Java <code>String.hashCode</code> (fixed base 31, mod 2<sup>32</sup>)', '<code>"Aa"</code> and <code>"BB"</code> both hash to 2112 → hash-flooding a HashMap', 'Java 8 treeifies buckets; Python/Rust use keyed SipHash']
      ])}
      <p><b>Golden rules:</b> prime modulus, random base in [256, M − 1], two hashes or 61 bits, letters mapped to non-zero values, and <b>verify</b> with a real comparison whenever a wrong “equal” would be a wrong answer.</p>`,
    clues: [
      '"compare substrings many times", "is s[a..b] equal to s[c..d]?" → prefix hashes, O(1) per comparison.',
      '"<b>longest</b> substring that … (repeats / is common / is a palindrome)" + monotonic yes/no → <b>binary search on length + hashing</b>.',
      '"count <b>distinct</b> substrings with property X" with N ≤ 2000–5000 → O(N<sup>2</sup>) substring hashes in a set (use a double hash!).',
      'Codeforces-style "hacks allowed" / "uphacks" → expect <b>anti-hash tests</b>: random base, prime modulus, no 2<sup>64</sup> overflow.',
      '"2D grid pattern" / "find a sub-matrix" → 2D rolling hash (hash rows, then hash the column of row-hashes).',
      'Fixed-length windows ("all substrings of length 10", DNA) → rolling hash or bit-packing in O(N).'
    ],
    code: [`
      class StringHasher {
          // Double polynomial hash with RANDOM bases (anti-hash safe for interview/contest use).
          static final long M1 = 1_000_000_007L, M2 = 998_244_353L;
          final long[] p1, p2, h1, h2;

          StringHasher(String s) {
              Random rnd = new Random();                           // seeded by time → bases unknown to an attacker
              long b1 = 256 + rnd.nextInt((int) (M1 - 512));
              long b2 = 256 + rnd.nextInt((int) (M2 - 512));
              int n = s.length();
              p1 = new long[n + 1]; p2 = new long[n + 1]; h1 = new long[n + 1]; h2 = new long[n + 1];
              p1[0] = p2[0] = 1;
              for (int i = 0; i < n; i++) {
                  int v = s.charAt(i) + 1;                         // never map a char to 0
                  p1[i + 1] = p1[i] * b1 % M1;
                  p2[i + 1] = p2[i] * b2 % M2;
                  h1[i + 1] = (h1[i] * b1 + v) % M1;
                  h2[i + 1] = (h2[i] * b2 + v) % M2;
              }
          }

          // hash of s[l, r) packed into one long: (h1 << 32) | h2
          long get(int l, int r) {
              long x = (h1[r] - h1[l] * p1[r - l] % M1 + M1) % M1;
              long y = (h2[r] - h2[l] * p2[r - l] % M2 + M2) % M2;
              return (x << 32) | y;
          }

          boolean equal(int a, int b, int len) { return get(a, a + len) == get(b, b + len); }

          public static void main(String[] args) {
              StringHasher h = new StringHasher("abcabcx");
              System.out.println(h.equal(0, 3, 3));   // "abc" vs "abc" -> true
              System.out.println(h.equal(0, 4, 3));   // "abc" vs "bcx" -> false
          }
      }`, `
      class Mersenne61 {
          // Single hash modulo 2^61 - 1 using a 128-bit product. ~2.3e18 possible values.
          static final long MOD = (1L << 61) - 1;

          static long mulMod(long a, long b) {                     // a, b < 2^61
              long hi = Math.multiplyHigh(a, b), lo = a * b;       // 128-bit product = hi:lo
              long low61 = lo & MOD;
              long rest = (lo >>> 61) | (hi << 3);                 // product >> 61
              long r = low61 + rest;                               // because 2^61 ≡ 1 (mod MOD)
              r = (r & MOD) + (r >>> 61);
              return r >= MOD ? r - MOD : r;
          }

          public static void main(String[] args) {
              long base = 1_000_003L + new Random().nextInt(1 << 30);   // random base at runtime
              String s = "hashing";
              long h = 0;
              for (char c : s.toCharArray()) h = (mulMod(h, base) + c + 1) % MOD;
              System.out.println("hash computed: " + (h >= 0 && h < MOD));
          }
      }`, `
      class ThueMorseAttack {
          // Shows why "let long overflow" (mod 2^64) is NOT a hash: Thue–Morse strings collide for ANY odd base.
          public static void main(String[] args) {
              int n = 1 << 11;                                      // 2048 characters
              StringBuilder s = new StringBuilder(), t = new StringBuilder();
              for (int i = 0; i < n; i++) {
                  boolean bit = Integer.bitCount(i) % 2 == 1;           // Thue–Morse sequence
                  s.append(bit ? 'b' : 'a');
                  t.append(bit ? 'a' : 'b');                            // its complement
              }
              for (long base : new long[]{31, 131, 1_000_003, 0x9E3779B97F4A7C15L | 1}) {
                  long hs = 0, ht = 0;
                  for (int i = 0; i < n; i++) { hs = hs * base + s.charAt(i); ht = ht * base + t.charAt(i); }
                  System.out.println("base " + base + ": equal hash = " + (hs == ht) + ", equal strings = " + s.toString().equals(t.toString()));
              }
          }
      }`, { lang: 'python', run: true, title: 'Anti-hash demo in Python (runnable)', code: `
# Thue-Morse attack on "natural overflow" hashing (mod 2**64)
n = 1 << 11
S = ''.join('b' if bin(i).count('1') % 2 else 'a' for i in range(n))
T = ''.join('a' if c == 'b' else 'b' for c in S)

def h(s, base, mod):
    x = 0
    for c in s:
        x = (x * base + ord(c)) % mod
    return x

for base in [31, 131, 1_000_003]:
    print("base", base, "mod 2^64 collide:", h(S, base, 2**64) == h(T, base, 2**64),
          "| mod 2^61-1 collide:", h(S, base, (1 << 61) - 1) == h(T, base, (1 << 61) - 1))

# Java's fixed String.hashCode: "Aa" and "BB" collide
java_hash = lambda s: h(s, 31, 2**32)
print("Aa ->", java_hash("Aa"), " BB ->", java_hash("BB"))
` }],
    codeTitle: ['Double hash with random bases (Java)', 'Mod 2⁶¹−1 with 128-bit multiply (Java)', 'Thue–Morse breaks mod 2⁶⁴ (Java)', 'Anti-hash demo (Python, runnable)'],
    viz: [{
      title: 'Rabin–Karp with two hashes: a tiny modulus collides, the second hash catches it',
      input: 'bananabandana|ana',
      inputLabel: 'text|pattern (lowercase, text ≤ 20, pattern ≤ 6)',
      gen: function (input) {
        var raw = String(input === undefined || input === null ? 'bananabandana|ana' : input).split('|');
        if (raw.length !== 2) throw new Error('Format: text|pattern   e.g. bananabandana|ana');
        var T = readWord(raw[0], 'bananabandana', 20, 'the text'), P = readWord(raw[1], 'ana', 6, 'the pattern');
        if (P.length > T.length) throw new Error('Pattern must not be longer than the text.');
        var B = 31, M1 = 13, M2 = 1009, m = P.length, frames = [], i;
        function val(c) { return c.charCodeAt(0) - 96; }
        function full(s, M) { var x = 0; for (var k = 0; k < s.length; k++) x = (x * B + val(s[k])) % M; return x; }
        var pw1 = 1, pw2 = 1;
        for (i = 1; i < m; i++) { pw1 = pw1 * B % M1; pw2 = pw2 * B % M2; }
        var hp1 = full(P, M1), hp2 = full(P, M2), w1 = full(T.slice(0, m), M1), w2 = full(T.slice(0, m), M2);
        frames.push({ narr: 'Pattern <b>' + H.esc(P) + '</b>: hash1 (mod <b>13</b>, deliberately tiny) = ' + hp1 + ', hash2 (mod 1009) = ' + hp2 + '. Base B = 31, letters a=1 … z=26. We slide a window of length ' + m + ' and update both hashes in O(1) per step.', parts: [
          { type: 'array', label: 'text', values: T.split(''), showIdx: true },
          { type: 'vars', label: 'pattern hashes', vals: { 'H1(P) mod 13': hp1, 'H2(P) mod 1009': hp2, 'B^(m-1) mod 13': pw1, 'B^(m-1) mod 1009': pw2 } }
        ] });
        var real = 0, fake = 0, found = [];
        for (i = 0; i + m <= T.length; i++) {
          if (i > 0) {
            w1 = ((w1 - val(T[i - 1]) * pw1 % M1 + M1) * B + val(T[i + m - 1])) % M1;
            w2 = ((w2 - val(T[i - 1]) * pw2 % M2 + M2) * B + val(T[i + m - 1])) % M2;
          }
          var win = T.slice(i, i + m), verdict, cls, hl = {};
          if (w1 === hp1 && w2 === hp2) { verdict = '<span class="c-g">both hashes match → verify letters → real match at ' + i + '</span>'; cls = 'ok'; real++; found.push(i); }
          else if (w1 === hp1) { verdict = '<span class="c-r">hash1 matches but the strings differ — a COLLISION!</span> hash2 (' + w2 + ' ≠ ' + hp2 + ') saves us.'; cls = 'bad'; fake++; }
          else { verdict = 'hash1 differs → skip instantly, no letter comparison needed.'; cls = 'win'; }
          for (var z = i; z < i + m; z++) hl[z] = cls;
          frames.push({ narr: 'Window [' + i + ', ' + (i + m - 1) + '] = <code>' + H.esc(win) + '</code>' + (i > 0 ? ' (rolled: remove <code>' + T[i - 1] + '</code>, add <code>' + T[i + m - 1] + '</code>)' : '') + ': H1 = ' + w1 + ', H2 = ' + w2 + '. ' + verdict, parts: [
            { type: 'array', label: 'text', values: T.split(''), hl: hl, range: [i, i + m - 1], showIdx: true },
            { type: 'vars', vals: { 'H1(window)': w1, 'H1(P)': hp1, 'H2(window)': w2, 'H2(P)': hp2, 'real matches': real, 'collisions caught': fake }, hl: { 'H1(window)': w1 === hp1 ? (cls === 'ok' ? 'ok' : 'bad') : '', 'H2(window)': cls === 'ok' ? 'ok' : '' } }
          ] });
        }
        frames.push({ narr: 'Done: <b>' + real + '</b> real match(es) at ' + (found.length ? found.join(', ') : '—') + ', and <b>' + fake + '</b> false alarm(s) from the tiny modulus 13. With a single ~10<sup>9</sup> modulus false alarms are rare; with a pair (~10<sup>18</sup>) they are practically impossible — but only if the bases are <b>random</b>.', parts: [
          { type: 'vars', vals: { windows: T.length - m + 1, 'real matches': real, 'false alarms (mod 13 only)': fake }, hl: { 'false alarms (mod 13 only)': fake ? 'bad' : 'ok' } },
          { type: 'text', html: 'Expected false alarms with one modulus M ≈ (windows) / M. Here ≈ ' + ((T.length - m + 1) / 13).toFixed(2) + ' for M = 13, but ≈ ' + ((T.length - m + 1) / 1e9).toExponential(1) + ' for M = 10<sup>9</sup>.' }
        ] });
        return frames;
      }
    }, {
      title: 'Anti-hash test: Thue–Morse vs. overflow hashing (mod 2⁶⁴)',
      input: '131',
      inputLabel: 'An odd base B (e.g. 31, 131, 1000003)',
      gen: function (input) {
        var b = parseInt(String(input === undefined || input === null ? '131' : input).trim(), 10);
        if (isNaN(b) || b < 3 || b > 1e12) throw new Error('Type an integer base between 3 and 10^12, e.g. 131.');
        var MOD = BigInt(1) << BigInt(64), B = BigInt(b), frames = [];
        var S = 'a', T = 'b';
        function hash(s) { var x = BigInt(0); for (var i = 0; i < s.length; i++) x = (x * B + BigInt(s.charCodeAt(i))) % MOD; return x; }
        function tz(x) { if (x === BigInt(0)) return 64; var c = 0; while ((x & BigInt(1)) === BigInt(0)) { x >>= BigInt(1); c++; } return c; }
        frames.push({ narr: 'Hash = Σ s<sub>i</sub>·B<sup>n−1−i</sup> computed with a 64-bit integer that simply overflows (i.e. mod 2<sup>64</sup>). Base B = <b>' + b + '</b>' + (b % 2 === 0 ? ' (even! then B<sup>64</sup> ≡ 0 and only the last 64 characters even matter — broken even faster)' : '') + '. Start: S<sub>0</sub> = <code>a</code>, T<sub>0</sub> = <code>b</code> (its complement).', parts: [
          { type: 'vars', vals: { S0: 'a', T0: 'b', 'H(S)−H(T) mod 2^64': ((hash(S) - hash(T)) % MOD + MOD) % MOD + '' } }
        ] });
        for (var k = 1; k <= 11; k++) {
          var ns = S + T, nt = T + S;
          S = ns; T = nt;
          var d = ((hash(S) - hash(T)) % MOD + MOD) % MOD, z = tz(d);
          var low32 = Number(d & BigInt(0xffffffff));
          var hl = {};
          for (var bit = 0; bit < Math.min(z, 32); bit++) hl[bit] = 'ok';
          frames.push({ narr: 'k = ' + k + ': S<sub>k</sub> = S<sub>k−1</sub> + T<sub>k−1</sub>, T<sub>k</sub> = T<sub>k−1</sub> + S<sub>k−1</sub> (length ' + S.length + '). The difference H(S) − H(T) gets multiplied by (B<sup>' + (S.length / 2) + '</sup> − 1), which adds at least ' + k + ' more factors of 2. Trailing zero bits now: <b>' + z + '</b> (theory: ≥ ' + (k * (k + 1) / 2) + ').' + (d === BigInt(0) ? ' <span class="c-r"><b>Difference is 0 mod 2<sup>64</sup> → the two different strings have the SAME hash.</b></span>' : ''), parts: [
            { type: 'bits', label: 'low 32 bits of H(S) − H(T)  (green = guaranteed zero bits)', value: low32 | 0, width: 32, hl: hl },
            { type: 'vars', vals: { k: k, length: S.length, 'trailing zero bits': z, 'S starts with': S.slice(0, 16) + (S.length > 16 ? '…' : ''), 'T starts with': T.slice(0, 16) + (T.length > 16 ? '…' : '') }, hl: { 'trailing zero bits': z >= 64 ? 'bad' : 'cur' } }
          ] });
        }
        frames.push({ narr: 'Length-2048 strings S ≠ T with identical overflow hashes — for <b>any</b> odd base. This is the classic anti-hash test. Fix: use a <b>prime</b> modulus (10<sup>9</sup>+7 pair, or 2<sup>61</sup>−1) and a <b>random</b> base.', parts: [
          { type: 'vars', vals: { 'H(S) mod 2^64': hash(S).toString(), 'H(T) mod 2^64': hash(T).toString(), 'S equals T?': 'false' }, hl: { 'H(S) mod 2^64': 'bad', 'H(T) mod 2^64': 'bad' } }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: '"Aa" vs "BB" in Java', html: `<p><code>String.hashCode</code> = Σ c·31<sup>n−1−i</sup> mod 2<sup>32</sup>. "Aa": 65·31 + 97 = <b>2112</b>. "BB": 66·31 + 66 = <b>2112</b>. Concatenations of these blocks (<code>AaAa, AaBB, BBAa, BBBB</code>, …) give 2<sup>k</sup> strings with one hash — a classic HashMap flooding attack. Java 8+ limits the damage by turning long buckets into red-black trees (O(log n) instead of O(n)).</p>` },
      { title: 'Binary search on length + hashing', html: `<p>“Longest substring occurring twice”: if some length-L substring repeats, a length-(L−1) one does too → the answer is monotonic. Binary search L; for each L hash all windows into a set (O(N)). Total O(N log N). With one 10<sup>9</sup> modulus and N = 3·10<sup>4</sup> windows per check, birthday collisions are ≈ 0.45 per check — real risk! Use a double hash or verify candidates.</p>` },
      { title: 'Palindrome check with forward + reverse hashes', html: `<p>Keep prefix hashes of s and of reverse(s). s[l..r] is a palindrome ⇔ H(s[l..r]) == H(rev[n−1−r .. n−1−l]). O(1) per query after O(N) prep — an alternative to Manacher when you also need equality checks between different substrings.</p>` },
      { title: 'Rolling hash in numbers', html: `<p>B = 10, M = 97, text digits <code>3 1 4 1 5</code>, window 3. H(314) = 314 mod 97 = 23. Roll: remove 3 → (23 − 3·100 mod 97) = 23 − 9 = 14; ×10 → 140; + 1 → 141 mod 97 = <b>44</b>. Check: 141 mod 97 = 44 ✔ (the window is 141).</p>` }
    ],
    deepDive: `<p><b>Why random bases give a guarantee.</b> If s ≠ t (same length n), H<sub>B</sub>(s) − H<sub>B</sub>(t) is a non-zero polynomial in B of degree ≤ n − 1 over the field Z<sub>M</sub>. It has at most n − 1 roots, so a uniformly random B collides with probability ≤ (n − 1)/M (Schwartz–Zippel). The guarantee is about <b>your random choice</b>, not about the input — that is why a fixed base can be attacked and a random one cannot (unless the program leaks it). For K strings compared all-pairs, apply a union bound: ≤ K<sup>2</sup>·n/(2M).</p>
      <p><b>Why 2<sup>64</sup> fails.</b> 2<sup>64</sup> is not prime, so Z<sub>2<sup>64</sup></sub> is not a field and the root-counting argument breaks. For Thue–Morse S<sub>k</sub>, T<sub>k</sub>: D<sub>k</sub> = D<sub>k−1</sub>·(B<sup>2<sup>k−1</sup></sup> − 1), and for odd B, B<sup>2<sup>j</sup></sup> − 1 is divisible by 2<sup>j+1</sup>. So D<sub>k</sub> has ≥ k(k+1)/2 factors of two: k = 11 gives 66 ≥ 64 → zero. Lattice-reduction attacks (LLL) can even find collisions for a <i>known</i> prime modulus and base pair, which is why randomness matters more than size.</p>
      <p><b>Engineering.</b> Java <code>long</code> products of two values &lt; 2<sup>30</sup> fit easily; for M ≈ 2<sup>61</sup> you need <code>Math.multiplyHigh</code> (or <code>unsigned __int128</code> in C++). Keep the prefix arrays as <code>long[]</code>, precompute powers, and pack two 30-bit hashes into one long for HashSet keys (avoids allocating pair objects). Real-world cousins: rsync and content-defined chunking (Rabin fingerprints / Gear hash) in backup systems and dedup storage; Python, Rust and Ruby use <b>keyed SipHash</b> for strings so web requests cannot flood hash tables (Python since 3.4, with <code>PYTHONHASHSEED</code> randomised per process).</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants love writing Rabin–Karp with <code>long</code> overflow or a single fixed <code>MOD = 1e9+7, BASE = 31</code>. That passes LeetCode tests and gets <b>hacked</b> in contests or exploited in production (hash flooding). Knowing the anti-hash story lets you review AI code in seconds: “prime modulus? random base? two hashes or verification? zero-free mapping?”.</p>
      <p><b>Use AI as a partner:</b> ask it to <code>generate an anti-hash test for this code</code> — it can produce Thue–Morse inputs or a birthday-search script that finds collisions for a fixed 32-bit modulus. Watching your own solution fail on it is the fastest way to internalise the rules. Also ask it to compute the birthday-paradox collision probability for your K and M before you choose single vs double hashing.</p>
      <p><b>Where AI goes wrong:</b> negative values after subtraction (forgetting <code>+ M</code>), multiplying two values near 2<sup>61</sup> in a plain <code>long</code> (silent overflow), mapping <code>'a'</code> to 0, and “double hashing” with two moduli but the <i>same</i> fixed base. <b>What you must still own:</b> the decision of when hashing is acceptable (randomised, small failure probability) versus when you must be deterministic (suffix array / KMP / Z), and explaining that trade-off to an interviewer.</p>`,
    problems: [{
      title: 'Distinct Echo Substrings', level: 'Hard', tags: ['rolling hash', 'double hashing', 'string'], companies: ['Google', 'Amazon'],
      statement: `<p>Return the number of <b>distinct</b> non-empty substrings of <code>text</code> that can be written as <code>a + a</code> (some string concatenated with itself).</p>`,
      constraints: `1 ≤ |text| ≤ 2000, lowercase letters (LeetCode 1316)`,
      example: `<p>text = <code>"abcabcabc"</code> → <b>3</b>: ${H.c('g', 'abcabc')}, ${H.c('b', 'bcabca')}, ${H.c('p', 'cabcab')} (the second <code>abcabc</code> at index 3 is not distinct).</p><p>text = <code>"leetcodeleetcode"</code> → <b>2</b>: <code>ee</code> and <code>leetcodeleetcode</code>.</p>`,
      brute: { why: `<p>For every start i and half-length L, compare the two halves character by character (O(L)) and store the substring in a HashSet&lt;String&gt; (O(L) to copy and hash) → O(N<sup>3</sup>) ≈ 8·10<sup>9</sup> in the worst case (<code>aaaa…</code>, where nearly everything is an echo). The waste: re-reading characters already hashed.</p>`, code: `
        class Brute {
            int distinctEchoSubstrings(String text) {
                int n = text.length();
                Set<String> seen = new HashSet<>();
                for (int i = 0; i < n; i++)
                    for (int len = 1; i + 2 * len <= n; len++)
                        if (text.substring(i, i + len).equals(text.substring(i + len, i + 2 * len)))
                            seen.add(text.substring(i, i + 2 * len));
                return seen.size();
            }
        }` },
      mcq: { q: 'There are about N<sup>2</sup>/4 = 10<sup>6</sup> candidate (start, half) pairs. You store echo hashes in a set with ONE modulus ≈ 10<sup>9</sup>. What is the main risk?', options: ['Overflow', 'Birthday collisions merge different substrings and undercount', 'TLE', 'None'], answer: 1, explain: 'Up to 10<sup>6</sup> hashes in one set with M ≈ 10<sup>9</sup> gives ≈ 500 expected colliding pairs — the answer becomes wrong. Use a double hash (≈ 10<sup>18</sup>).' },
      hints: [`<p>An echo is fixed by (start i, half-length L). Check “left half == right half” in O(1) with prefix hashes instead of comparing letters.</p>`, `<p>To count <b>distinct</b> echoes, insert the hash of the whole substring text[i, i + 2L) into a HashSet&lt;Long&gt;. Only substrings of equal length can be equal, so you can also keep one set per length.</p>`, `<p>Use two moduli with random bases and pack them into one long. Recipe: prefix hashes → loop i, L → if get(i, i+L) == get(i+L, i+2L) add get(i, i+2L) → return set size.</p>`],
      solution: {
        approach: `<p>Prefix double-hashes give O(1) substring hashes. Enumerate all O(N<sup>2</sup>) (start, half) pairs, test the halves by hash, and add the full substring’s hash to a set. Packing two independent hashes into a long keeps the collision probability around 10<sup>−6</sup> overall even with 10<sup>6</sup> insertions.</p>`,
        code: `
          class Solution {
              static final long M1 = 1_000_000_007L, M2 = 998_244_353L;
              long[] h1, h2, p1, p2;

              public int distinctEchoSubstrings(String text) {
                  int n = text.length();
                  Random rnd = new Random();
                  long b1 = 256 + rnd.nextInt(1_000_000), b2 = 256 + rnd.nextInt(1_000_000);   // random bases
                  h1 = new long[n + 1]; h2 = new long[n + 1]; p1 = new long[n + 1]; p2 = new long[n + 1];
                  p1[0] = p2[0] = 1;
                  for (int i = 0; i < n; i++) {
                      int v = text.charAt(i) - 'a' + 1;
                      h1[i + 1] = (h1[i] * b1 + v) % M1;  p1[i + 1] = p1[i] * b1 % M1;
                      h2[i + 1] = (h2[i] * b2 + v) % M2;  p2[i + 1] = p2[i] * b2 % M2;
                  }
                  Set<Long> seen = new HashSet<>();
                  for (int len = 1; 2 * len <= n; len++)
                      for (int i = 0; i + 2 * len <= n; i++)
                          if (get(i, i + len) == get(i + len, i + 2 * len))
                              seen.add(get(i, i + 2 * len));            // hash of the whole echo
                  return seen.size();
              }

              private long get(int l, int r) {
                  long x = ((h1[r] - h1[l] * p1[r - l]) % M1 + M1) % M1;
                  long y = ((h2[r] - h2[l] * p2[r - l]) % M2 + M2) % M2;
                  return (x << 32) | y;
              }
          }`,
        alt: [{ lang: 'python', code: `
import random

class Solution:
    def distinctEchoSubstrings(self, text: str) -> int:
        M = (1 << 61) - 1                       # one big Mersenne prime is enough in Python (big ints)
        B = random.randrange(256, M - 1)
        n = len(text)
        pre, pw = [0] * (n + 1), [1] * (n + 1)
        for i, ch in enumerate(text):
            pre[i + 1] = (pre[i] * B + ord(ch)) % M
            pw[i + 1] = pw[i] * B % M
        get = lambda l, r: (pre[r] - pre[l] * pw[r - l]) % M
        seen = set()
        for L in range(1, n // 2 + 1):
            for i in range(n - 2 * L + 1):
                if get(i, i + L) == get(i + L, i + 2 * L):
                    seen.add((L, get(i, i + 2 * L)))
        return len(seen)` }],
        dry: { head: ['half L', 'start i', 'left half', 'right half', 'equal?', 'set size'], rows: [
          ['1', '0..7', 'a,b,c,…', 'b,c,a,…', 'never', '0'],
          ['2', '0..5', 'ab, bc, …', 'ca, ab, …', 'never', '0'],
          ['3', '0', 'abc', 'abc', H.c('g', 'yes → add "abcabc"'), '1'],
          ['3', '1', 'bca', 'bca', H.c('g', 'yes → add "bcabca"'), '2'],
          ['3', '2', 'cab', 'cab', H.c('g', 'yes → add "cabcab"'), '3'],
          ['3', '3', 'abc', 'abc', 'yes → "abcabc" already in set', '3'],
          ['4', '0', 'abca', 'bcab', 'no', H.c('g', '<b>3</b>')]
        ] },
        complexity: `<p>O(N<sup>2</sup>) hash comparisons ≈ 10<sup>6</sup> for N = 2000, O(N<sup>2</sup>) set space in the worst case (<code>aaaa…</code> has only N/2 distinct echoes, but random texts are small too).</p>`,
        followUps: ['Count echo <b>occurrences</b> instead of distinct ones (no set needed).', 'N = 10<sup>5</sup>: Main–Lorentz / runs-based algorithms find all squares in O(N log N).', 'Make it deterministic: compare with the suffix-array LCP query instead of hashes.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 6 — Suffix automaton (intro)
  // =====================================================================
  topics.push({
    title: 'Suffix Automaton (Intro): A Tiny Machine That Knows Every Substring',
    analogy: `<p><b>Think of a maze whose doors are labelled with letters.</b> You enter at the start and spell a word by walking through doors. The suffix automaton is built so that <b>you can walk all the way</b> exactly when the word you spelled is a substring of s — and it uses at most <b>2N rooms</b>, even though s has about N<sup>2</sup>/2 substrings.</p>
      <p>How can so few rooms hold so many words? Rooms are shared by words that “end in exactly the same places” in s. In <code>abcbc</code>, the words <code>c</code> and <code>bc</code> both end at positions 2 and 4 — so they live in the <b>same room</b>. It is like a school grouping students by the exact set of buses they can take: students with identical bus sets share one homeroom.</p>`,
    explain: `<h4>1. What it is</h4>
      <p>The <b>suffix automaton (SAM)</b> of s is the smallest deterministic automaton that accepts every suffix of s; following edges from the start state, a word can be spelled ⇔ it is a <b>substring</b> of s. Facts: ≤ <b>2N − 1</b> states, ≤ <b>3N − 4</b> transitions, built <b>online</b> (one character at a time) in O(N) for a fixed alphabet.</p>
      <h4>2. endpos classes — the grouping rule</h4>
      <p>endpos(w) = set of positions where an occurrence of w <b>ends</b>. Substrings with the same endpos share a state. For s = <code>abcbc</code> (positions 0..4):</p>
      ${H.table(['state', 'len', 'link', 'substrings in this state', 'endpos'], [
        ['0', '0', '−', '(empty)', 'all'],
        ['1', '1', '0', 'a', '{0}'],
        ['5', '1', '0', 'b', '{1, 3}'],
        ['7', '2', '0', H.c('g', 'bc, c'), '{2, 4}'],
        ['2', '2', '5', 'ab', '{1}'],
        ['3', '3', '7', 'abc', '{2}'],
        ['4', '4', '5', 'abcb, bcb, cb', '{3}'],
        ['6', '5', '7', 'abcbc, bcbc, cbc', '{4}']
      ])}
      <p>Inside one state, the strings are suffixes of each other with consecutive lengths <b>(len(link), len]</b>. The <b>suffix link</b> points to the state of the next-shorter suffix that ends in <i>more</i> places. Suffix links form a tree (like Aho–Corasick’s fail tree).</p>
      <h4>3. Building it: extend(c) in plain words</h4>
      <ol>
        <li>Create state <b>cur</b> with len = len(last) + 1 (the whole new prefix).</li>
        <li>Walk suffix links from <b>last</b>; every state p with <b>no edge c</b> gets <code>p --c--&gt; cur</code>.</li>
        <li>If we walked past the root: <code>link(cur) = root</code>.</li>
        <li>Else p already has an edge c to q. If <code>len(p) + 1 == len(q)</code>, q is a perfect fit: <code>link(cur) = q</code>.</li>
        <li>Otherwise q holds strings that are “too long”: <b>clone</b> q into a state with len(p) + 1 (same edges, same link), redirect p’s chain of c-edges from q to the clone, and set <code>link(q) = link(cur) = clone</code>.</li>
      </ol>
      <h4>4. What you can answer with it</h4>
      ${H.table(['Question', 'How', 'Time'], [
        ['Is w a substring?', 'walk w from the root', 'O(|w|)'],
        ['Number of distinct substrings', 'Σ over states v ≠ 0 of len(v) − len(link(v))', 'O(N)'],
        ['Occurrences of each substring', 'cnt = 1 on non-clone states, then add cnt up the link tree (longest first)', 'O(N)'],
        ['Longest common substring of s and t', 'walk t; on a missing edge follow suffix links (like Aho–Corasick)', 'O(|s| + |t|)'],
        ['k-th lexicographic distinct substring', 'count paths from each state (DAG DP), then walk', 'O(N·σ)']
      ])}`,
    clues: [
      '"process the string <b>online</b>, one character at a time" + substring questions after each append → suffix automaton (SAM is built incrementally).',
      '"number of <b>distinct</b> substrings" (also after every prefix) → Σ len(v) − len(link(v)); the increment after adding char i is len(cur) − len(link(cur)).',
      '"<b>longest common substring</b> of two strings", |s|, |t| ≤ 10<sup>6</sup> → SAM of one, walk the other, O(|s| + |t|).',
      '"how many times does each substring occur", "substring occurring ≥ k times with max length·count" → SAM + endpos sizes via the link tree.',
      '"k-th smallest distinct substring", "count paths in the substring DAG" → SAM is a DAG; DP over it.',
      'Memory budget allows ~2N states × σ edges, and you want deterministic results (no hashing).'
    ],
    code: [`
      class SuffixAutomaton {
          final int[] len, link, firstPos;
          final int[][] next;
          final boolean[] isClone;
          int size, last;

          SuffixAutomaton(String s) {
              int cap = 2 * Math.max(1, s.length());            // at most 2N - 1 states
              len = new int[cap]; link = new int[cap]; firstPos = new int[cap];
              isClone = new boolean[cap];
              next = new int[cap][26];
              for (int[] row : next) Arrays.fill(row, -1);
              link[0] = -1; size = 1; last = 0;
              for (int i = 0; i < s.length(); i++) extend(s.charAt(i) - 'a', i);
          }

          private void extend(int c, int pos) {
              int cur = size++;
              len[cur] = len[last] + 1;
              firstPos[cur] = pos;
              int p = last;
              while (p != -1 && next[p][c] == -1) { next[p][c] = cur; p = link[p]; }   // new edges into cur
              if (p == -1) link[cur] = 0;                                              // case 1: fell off root
              else {
                  int q = next[p][c];
                  if (len[p] + 1 == len[q]) link[cur] = q;                             // case 2: perfect fit
                  else {                                                               // case 3: clone q
                      int clone = size++;
                      len[clone] = len[p] + 1;
                      next[clone] = next[q].clone();
                      link[clone] = link[q];
                      firstPos[clone] = firstPos[q];
                      isClone[clone] = true;
                      while (p != -1 && next[p][c] == q) { next[p][c] = clone; p = link[p]; }
                      link[q] = clone;
                      link[cur] = clone;
                  }
              }
              last = cur;
          }

          boolean contains(String w) {
              int v = 0;
              for (char ch : w.toCharArray()) { v = next[v][ch - 'a']; if (v == -1) return false; }
              return true;
          }

          long distinctSubstrings() {
              long total = 0;
              for (int v = 1; v < size; v++) total += len[v] - len[link[v]];
              return total;
          }

          // occurrences of w = |endpos| of its state
          long occurrences(String w) {
              int n = size;
              long[] cnt = new long[n];
              for (int v = 1; v < n; v++) if (!isClone[v]) cnt[v] = 1;          // each prefix end is one position
              Integer[] order = new Integer[n];
              for (int v = 0; v < n; v++) order[v] = v;
              Arrays.sort(order, (a, b) -> len[b] - len[a]);                    // longest first
              for (int v : order) if (link[v] >= 0) cnt[link[v]] += cnt[v];
              int v = 0;
              for (char ch : w.toCharArray()) { v = next[v][ch - 'a']; if (v == -1) return 0; }
              return cnt[v];
          }

          public static void main(String[] args) {
              SuffixAutomaton sam = new SuffixAutomaton("abcbc");
              System.out.println("states = " + sam.size);                       // 8
              System.out.println(sam.distinctSubstrings());                     // 12
              System.out.println(sam.contains("cbc") + " " + sam.contains("ca")); // true false
              System.out.println(sam.occurrences("bc"));                        // 2
          }
      }`, { lang: 'python', run: true, title: 'Suffix automaton in Python (runnable)', code: `
class SAM:
    def __init__(self, s):
        self.len, self.link, self.next = [0], [-1], [{}]
        self.last = 0
        for ch in s:
            self.extend(ch)

    def extend(self, c):
        cur = len(self.len)
        self.len.append(self.len[self.last] + 1); self.link.append(-1); self.next.append({})
        p = self.last
        while p != -1 and c not in self.next[p]:
            self.next[p][c] = cur
            p = self.link[p]
        if p == -1:
            self.link[cur] = 0
        else:
            q = self.next[p][c]
            if self.len[p] + 1 == self.len[q]:
                self.link[cur] = q
            else:
                clone = len(self.len)
                self.len.append(self.len[p] + 1); self.link.append(self.link[q]); self.next.append(dict(self.next[q]))
                while p != -1 and self.next[p].get(c) == q:
                    self.next[p][c] = clone
                    p = self.link[p]
                self.link[q] = self.link[cur] = clone
        self.last = cur

    def distinct(self):
        return sum(self.len[v] - self.len[self.link[v]] for v in range(1, len(self.len)))

def lcs(s, t):
    a = SAM(s)
    v = l = best = 0
    for c in t:
        while v and c not in a.next[v]:
            v = a.link[v]
            l = a.len[v]
        if c in a.next[v]:
            v = a.next[v][c]
            l += 1
        best = max(best, l)
    return best

print("states:", len(SAM("abcbc").len), " distinct:", SAM("abcbc").distinct())   # 8, 12
print("distinct('aaaa') =", SAM("aaaa").distinct())                              # 4
print("LCS =", lcs("abcbc", "bcbcab"))                                           # 4 (bcbc)
` }],
    codeTitle: ['Suffix automaton: build, contains, distinct, occurrences (Java)', 'Python version + longest common substring (runnable)'],
    viz: {
      title: 'Suffix automaton built one letter at a time',
      input: 'abcbc',
      inputLabel: 'Lowercase word (max 8 letters)',
      gen: function (input) {
        var s = readWord(input, 'abcbc', 8, 'the word');
        var n = s.length, st = [{ len: 0, link: -1, next: {}, fp: -1, clone: false }], last = 0, frames = [];
        function cls(v) {
          if (v === 0) return '(empty)';
          var lng = s.slice(st[v].fp - st[v].len + 1, st[v].fp + 1), out = [];
          for (var L = st[v].len; L > st[st[v].link].len; L--) out.push(lng.slice(lng.length - L));
          return out.join(', ');
        }
        function rows() {
          return st.map(function (v, i) {
            return [i + (v.clone ? ' (clone)' : ''), v.len, v.link < 0 ? '—' : v.link, Object.keys(v.next).sort().map(function (c) { return c + '→' + v.next[c]; }).join(' ') || '—', cls(i)];
          });
        }
        function graph(hl, ehl) {
          var lanes = {}, nodes = st.map(function (v, i) {
            var y;
            if (i === 0) y = 22;
            else if (!v.clone) y = v.len % 2 ? 36 : 12;
            else { lanes[v.len] = (lanes[v.len] || 0) + 1; y = 48 + 6 * (lanes[v.len] - 1); }
            return { id: 's' + i, label: String(i), x: 5 + v.len * (88 / Math.max(1, n)), y: y };
          });
          var edges = [];
          st.forEach(function (v, i) { Object.keys(v.next).sort().forEach(function (c) { edges.push(['s' + i, 's' + v.next[c], c]); }); });
          return { type: 'graph', label: 'automaton (x-position = len; clones on the bottom lane)', directed: true, height: 62, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {} };
        }
        frames.push({ narr: 'Start with just the root (state 0, the empty string). We will add the letters of <b>' + H.esc(s) + '</b> one by one; after each step the automaton recognises every substring of the prefix read so far.', parts: [
          graph({ s0: 'cur' }),
          { type: 'table', label: 'states', columns: ['state', 'len', 'link', 'edges', 'substrings in state'], rows: rows() }
        ] });
        for (var i = 0; i < n; i++) {
          var c = s[i], cur = st.length;
          st.push({ len: st[last].len + 1, link: -1, next: {}, fp: i, clone: false });
          var p = last, given = [], ehl = {};
          while (p !== -1 && st[p].next[c] === undefined) { st[p].next[c] = cur; given.push(p); ehl['s' + p + '-s' + cur] = 'ok'; p = st[p].link; }
          var hlA = {}; hlA['s' + cur] = 'ok';
          var rowHl = {}; rowHl[cur] = 'ok';
          var msg = 'Read <code>' + c + '</code> (prefix <b>' + H.esc(s.slice(0, i + 1)) + '</b>). Create state <b>' + cur + '</b> with len = ' + st[cur].len + '. Walk suffix links from last = ' + last + ': state(s) ' + given.join(', ') + ' had no “' + c + '” edge → add edges into ' + cur + '.';
          var how;
          if (p === -1) { st[cur].link = 0; how = 'We fell off past the root → no shorter suffix is already known: <b>link(' + cur + ') = 0</b>.'; }
          else {
            var q = st[p].next[c];
            if (st[p].len + 1 === st[q].len) { st[cur].link = q; how = 'Stopped at state ' + p + ', which already has “' + c + '” → ' + q + '. len(' + p + ') + 1 = ' + st[q].len + ' = len(' + q + ') → perfect fit: <b>link(' + cur + ') = ' + q + '</b>.'; hlA['s' + q] = 'sel'; }
            else {
              var clone = st.length, redirected = [];
              st.push({ len: st[p].len + 1, link: st[q].link, next: cp(st[q].next), fp: st[q].fp, clone: true });
              while (p !== -1 && st[p].next[c] === q) { st[p].next[c] = clone; redirected.push(p); p = st[p].link; }
              st[q].link = clone; st[cur].link = clone;
              how = 'Stopped at a state with “' + c + '” → ' + q + ', but len(' + q + ') = ' + st[q].len + ' is too long (state ' + q + ' mixes strings with different endpos). <span class="c-p"><b>Clone</b> ' + q + ' → new state ' + clone + '</span> with len ' + st[clone].len + ', copy its edges, redirect “' + c + '” edges of state(s) ' + redirected.join(', ') + ' to the clone, and set link(' + q + ') = link(' + cur + ') = ' + clone + '.';
              hlA['s' + clone] = 'sel'; hlA['s' + q] = 'bad'; rowHl[clone] = 'sel'; rowHl[q] = 'bad';
            }
          }
          frames.push({ narr: msg, parts: [graph(hlA, ehl), { type: 'table', label: 'states', columns: ['state', 'len', 'link', 'edges', 'substrings in state'], rows: rows(), hl: rowHl }] });
          frames.push({ narr: how + ' New distinct substrings created by this letter = len(cur) − len(link(cur)) = ' + st[cur].len + ' − ' + st[st[cur].link].len + ' = <b>' + (st[cur].len - st[st[cur].link].len) + '</b>.', parts: [
            graph(hlA),
            { type: 'table', label: 'states', columns: ['state', 'len', 'link', 'edges', 'substrings in state'], rows: rows(), hl: rowHl },
            { type: 'vars', vals: { last: cur, states: st.length, 'limit 2N−1': 2 * (i + 1) - 1 } }
          ] });
          last = cur;
        }
        var total = 0, contrib = [];
        st.forEach(function (v, i) { if (i) { total += v.len - st[v.link].len; contrib.push(v.len - st[v.link].len); } });
        frames.push({ narr: 'Finished: <b>' + st.length + '</b> states for a string of length ' + n + ' (≤ 2N − 1 = ' + (2 * n - 1) + '). Every substring is one path from the root. Distinct substrings = Σ (len − len(link)) = <b>' + total + '</b>.', parts: [
          graph({}),
          { type: 'bars', label: 'len(v) − len(link(v)) for states 1..' + (st.length - 1), values: contrib, idxLabels: contrib.map(function (_, j) { return 's' + (j + 1); }) },
          { type: 'vars', vals: { states: st.length, 'distinct substrings': total, 'all (i,j) pairs': n * (n + 1) / 2 }, hl: { 'distinct substrings': 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: '“abbb” needs clones', html: `<p>Adding the 3rd letter (<code>b</code> of <code>abb</code>): the walk stops at the root, which has “b” → state 2 (len 2, strings <code>ab, b</code>). But len(root) + 1 = 1 ≠ 2: <code>b</code> now ends at positions {1, 2} while <code>ab</code> ends only at {1}. So state 2 is split: a clone with len 1 takes <code>b</code>. Final SAM: 7 states, distinct substrings = 7 (a, b, ab, bb, abb, bbb, abbb).</p>` },
      { title: 'Counting occurrences of “bc” in “abcbc”', html: `<p>Non-clone states (one per prefix end) start with cnt = 1: states 1, 2, 3, 4, 6. Push counts up suffix links, longest first: 6 → 7, 4 → 5, 3 → 7, 2 → 5. State 7 (<code>bc, c</code>) gets 1 + 1 = <b>2</b> → “bc” occurs twice (positions 1 and 3). ✔</p>` },
      { title: 'Longest common substring walk', html: `<p>SAM of s = <code>abcbc</code>, walk t = <code>bcbcab</code>: b → (5, l=1), c → (7, 2), b → (4, 3), c → (6, <b>4</b>), a: no edge → link 7 (l = 2) → link 0 (l = 0) → edge a → (1, 1), b → (2, 2). Best = <b>4</b> = <code>bcbc</code>. Each fallback shortens l, each step adds 1 → O(|t|).</p>` },
      { title: 'Distinct substrings after every prefix', html: `<p>When the i-th letter arrives, exactly len(cur) − len(link(cur)) new distinct substrings appear (the new suffixes not seen before). For <code>abcbc</code> the increments are 1, 2, 3, 3, 3 → running totals 1, 3, 6, 9, <b>12</b>. A suffix array would have to be rebuilt; the SAM answers online.</p>` }
    ],
    deepDive: `<p><b>Why ≤ 2N − 1 states.</b> The endpos sets form a laminar family (two sets are either disjoint or nested), i.e. a tree whose leaves are at most N single positions; a tree with ≤ N leaves where every internal node has ≥ 2 children (or adds a new position) has ≤ 2N − 1 nodes. Transitions ≤ 3N − 4 by a spanning-tree argument. Construction is amortised O(N) for constant σ: the clone-redirect loop and the edge-adding loop are paid for by how the depth of <code>last</code> in the link tree changes.</p>
      <p><b>Relation to other structures.</b> The suffix-link tree of the SAM of s is the <b>suffix tree of reverse(s)</b>. Built over a set of strings with separators (or a “generalised SAM” built on a trie), it answers multi-string questions such as the longest substring common to all k strings. Compared with SA + LCP: SAM is online and O(N) but uses σ-wide transitions (26 ints per state → ~200 bytes per character for 26 letters with int[] rows, or hash maps for large alphabets); SA is offline and leaner (4–8 bytes per char).</p>
      <p><b>Pitfalls.</b> Allocate 2N states (not N); copy the clone’s transition row (not alias it — <code>next[clone] = next[q]</code> without <code>.clone()</code> is a classic bug); compute occurrence counts in decreasing len order (counting sort by len is O(N)); remember clones get cnt 0 initially. For huge N in Java, prefer flat <code>int[]</code> arrays of size 26·2N over <code>int[][]</code> to cut object overhead.</p>`,
    aiEra: `<p><b>What AI changes:</b> the SAM is the archetype of “hard to derive, easy to copy”. An assistant can paste a correct template, and interviewers at the expert level know it — so they probe <i>understanding</i>: what a state represents (an endpos class), why cloning is needed, and how to adapt it (occurrence counts, first positions, k-th substring). That is the knowledge this topic builds.</p>
      <p><b>Use AI as a partner:</b> ask it to print the state table (len, link, strings in state) for small words and check it against the visualizer; ask for a brute-force “set of all substrings” checker for distinct counts and occurrence counts on random strings of length ≤ 12. Ask it to explain a clone step for <code>abbb</code> in its own words — then verify each claim.</p>
      <p><b>Where AI goes wrong:</b> aliasing the transition array when cloning, sizing arrays to N states, counting occurrences without the longest-first order, and claiming SAM works “in O(N) for any alphabet” (with hash maps it is O(N log σ) or expected O(N)). <b>What you must still own:</b> deciding whether SAM is worth its complexity in an interview (often SA + LCP or hashing is simpler to explain) and articulating the endpos intuition clearly.</p>`,
    problems: [{
      title: 'Longest Common Substring of Two Strings', level: 'Hard', tags: ['suffix automaton', 'string', 'two pointers on automaton'], companies: ['Google', 'Meta'],
      statement: `<p>Given two strings <code>s</code> and <code>t</code>, return the length of their longest common <b>substring</b> (contiguous).</p>`,
      constraints: `1 ≤ |s|, |t| ≤ 2.5·10<sup>5</sup>, lowercase letters (SPOJ LCS)`,
      example: `<p>s = <code>"abcbc"</code>, t = <code>"bcbcab"</code> → <b>4</b> (${H.c('g', 'bcbc')}).</p><p>s = <code>"xabcdey"</code>, t = <code>"zzbcdq"</code> → <b>3</b> (${H.c('g', 'bcd')}).</p>`,
      brute: { why: `<p>The textbook DP <code>dp[i][j] = dp[i−1][j−1] + 1</code> if s[i−1] == t[j−1] is O(|s|·|t|) = 6.25·10<sup>10</sup> steps — far too slow (and a 2D table would need 250 GB). The waste: every (i, j) pair is examined even though most cannot extend a match.</p>`, code: `
        class Brute {
            int lcs(String s, String t) {
                int n = s.length(), m = t.length(), best = 0;
                int[] prev = new int[m + 1], cur = new int[m + 1];
                for (int i = 1; i <= n; i++) {
                    for (int j = 1; j <= m; j++) {
                        cur[j] = s.charAt(i - 1) == t.charAt(j - 1) ? prev[j - 1] + 1 : 0;
                        best = Math.max(best, cur[j]);
                    }
                    int[] tmp = prev; prev = cur; cur = tmp;
                }
                return best;
            }
        }` },
      mcq: { q: 'While walking t through the SAM of s, the next char has no edge from state v. What do you do?', options: ['Restart from the root with length 0', 'Follow suffix links (setting l = len(v)) until an edge exists or you reach the root', 'Skip the character and keep l', 'Rebuild the automaton'], answer: 1, explain: 'Like Aho–Corasick fail links: the suffix link is the longest shorter suffix with more occurrences; keep as much of the current match as possible.' },
      hints: [`<p>Keep (v, l): the SAM state and length of the longest suffix of t[0..j] that is a substring of s. Answer = max l over j.</p>`, `<p>On character c: while v ≠ root and v has no c-edge, set v = link(v), l = len(v). If an edge exists, take it and l++; otherwise stay at the root with l = 0.</p>`, `<p>Build the SAM of the shorter string to save memory. Each step increases l by ≤ 1 and each fallback decreases it, so the walk is O(|t|). Return best.</p>`],
      solution: {
        approach: `<p>Build the suffix automaton of s (O(|s|)). Scan t keeping the current state and current match length, falling back along suffix links on mismatches — exactly the Aho–Corasick / KMP pattern, but over all substrings of s at once.</p>`,
        code: `
          class Solution {
              public int longestCommonSubstring(String s, String t) {
                  int cap = 2 * Math.max(1, s.length());
                  int[] len = new int[cap], link = new int[cap];
                  int[][] next = new int[cap][26];
                  for (int[] row : next) Arrays.fill(row, -1);
                  link[0] = -1;
                  int size = 1, last = 0;
                  for (int i = 0; i < s.length(); i++) {                    // build SAM of s
                      int c = s.charAt(i) - 'a', cur = size++;
                      len[cur] = len[last] + 1;
                      int p = last;
                      while (p != -1 && next[p][c] == -1) { next[p][c] = cur; p = link[p]; }
                      if (p == -1) link[cur] = 0;
                      else {
                          int q = next[p][c];
                          if (len[p] + 1 == len[q]) link[cur] = q;
                          else {
                              int clone = size++;
                              len[clone] = len[p] + 1;
                              next[clone] = next[q].clone();
                              link[clone] = link[q];
                              while (p != -1 && next[p][c] == q) { next[p][c] = clone; p = link[p]; }
                              link[q] = clone; link[cur] = clone;
                          }
                      }
                      last = cur;
                  }
                  int v = 0, l = 0, best = 0;                                // walk t
                  for (int j = 0; j < t.length(); j++) {
                      int c = t.charAt(j) - 'a';
                      while (v != 0 && next[v][c] == -1) { v = link[v]; l = len[v]; }
                      if (next[v][c] != -1) { v = next[v][c]; l++; }
                      best = Math.max(best, l);
                  }
                  return best;
              }
          }`,
        alt: [{ lang: 'python', code: `
def longest_common_substring(s, t):
    length, link, nxt, last = [0], [-1], [{}], 0
    for ch in s:
        cur = len(length); length.append(length[last] + 1); link.append(-1); nxt.append({})
        p = last
        while p != -1 and ch not in nxt[p]:
            nxt[p][ch] = cur; p = link[p]
        if p == -1:
            link[cur] = 0
        else:
            q = nxt[p][ch]
            if length[p] + 1 == length[q]:
                link[cur] = q
            else:
                cl = len(length); length.append(length[p] + 1); link.append(link[q]); nxt.append(dict(nxt[q]))
                while p != -1 and nxt[p].get(ch) == q:
                    nxt[p][ch] = cl; p = link[p]
                link[q] = link[cur] = cl
        last = cur
    v = l = best = 0
    for ch in t:
        while v and ch not in nxt[v]:
            v = link[v]; l = length[v]
        if ch in nxt[v]:
            v = nxt[v][ch]; l += 1
        best = max(best, l)
    return best` }],
        dry: { head: ['t[j]', 'fallbacks (state:len)', 'edge taken', 'state v', 'l', 'best'], rows: [
          ['b', '—', '0 → 5', '5 (b)', '1', '1'],
          ['c', '—', '5 → 7', '7 (bc, c)', '2', '2'],
          ['b', '—', '7 → 4', '4 (…cb)', '3', '3'],
          ['c', '—', '4 → 6', '6 (…cbc)', '4', '<b>4</b>'],
          ['a', '6 → 7 (2) → 0 (0)', '0 → 1', '1 (a)', '1', '4'],
          ['b', '—', '1 → 2', '2 (ab)', '2', H.c('g', '<b>4</b>')]
        ] },
        complexity: `<p>Build O(|s|·σ) memory-wise (O(|s|) time for fixed σ), walk O(|t|). Space O(|s|·26).</p>`,
        followUps: ['Return the substring itself (remember the end index j where best was set).', 'Longest common substring of <b>k</b> strings: SAM of the first, walk each other string recording per-state best, take minima up the link tree.', 'Same problem via SA + LCP of s + "#" + t — compare memory and code length.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 7 — Applications & choosing the right tool
  // =====================================================================
  topics.push({
    title: 'Applications Playbook: Distinct Substrings, Longest Repeats & Picking the Right Tool',
    analogy: `<p><b>A carpenter’s toolbox.</b> A hammer, a screwdriver and a saw can all “attach two boards”, but each is best for one job. Advanced string tools are the same: <b>Manacher</b> is the palindrome specialist, <b>Aho–Corasick</b> the many-keywords scanner, <b>hashing</b> the quick multi-purpose screwdriver (fast, but it can slip), <b>suffix array + LCP</b> the precise measuring kit, and the <b>suffix automaton</b> the power tool that works while the string is still being built.</p>
      <p>Counting distinct substrings is like counting <b>distinct words in a dictionary built from all tails</b>: every new tail adds its length in new prefixes, minus the part it already shares with the tail right above it.</p>`,
    explain: `<h4>1. Counting distinct substrings — three ways</h4>
      <p>Every substring is a prefix of some suffix. In SA order, the suffix at rank r contributes its prefixes of length <b>lcp[r] + 1 … |suffix|</b> as brand-new substrings (shorter ones already appeared in the suffix above). So:</p>
      <p><b>distinct = Σ (n − SA[r] − lcp[r]) = N(N+1)/2 − Σ lcp</b></p>
      ${H.table(['rank', 'suffix', 'length', 'lcp', 'new = length − lcp', 'running'], [
        ['0', 'a', '1', '0', '1', '1'], ['1', 'ana', '3', '1', '2', '3'], ['2', 'anana', '5', '3', '2', '5'],
        ['3', 'banana', '6', '0', '6', '11'], ['4', 'na', '2', '0', '2', '13'], ['5', 'nana', '4', '2', '2', H.c('g', '<b>15</b>')]
      ])}
      ${H.table(['Method', 'Time', 'Notes'], [
        ['Set of all substrings (strings)', 'O(N<sup>3</sup>)', 'N ≤ 300'],
        ['Set of substring hashes, grouped by length', 'O(N<sup>2</sup>)', 'N ≤ 5000; needs double hashing'],
        ['SA + LCP', 'O(N log N)', 'deterministic, low memory'],
        ['Suffix automaton', 'O(N)', 'online: answer after every appended char']
      ])}
      <h4>2. Longest repeated substring — read the fine print</h4>
      ${H.table(['Variant', 'Recipe'], [
        ['Occurs ≥ 2 times, overlap allowed', 'max lcp (SA) · or max len(v) over SAM states with |endpos| ≥ 2'],
        ['Occurs ≥ 2 times, <b>no overlap</b>', 'binary search L: in each maximal block of ranks with lcp ≥ L, check max(SA) − min(SA) ≥ L'],
        ['Occurs ≥ k times', 'window of k consecutive ranks → min lcp inside; take the max'],
        ['Maximise length × count', 'largest rectangle in the LCP histogram (monotonic stack)']
      ])}
      <h4>3. Picking the right tool from the question</h4>
      ${H.table(['Question shape', 'Reach for', 'Cost'], [
        ['one pattern, one text', 'KMP / Z-function (DSA 9)', 'O(N + M)'],
        ['many patterns, one text (or a stream)', H.c('b', 'Aho–Corasick'), 'O(N + M·σ + matches)'],
        ['one big text, many pattern queries', H.c('b', 'suffix array'), 'build O(N log N), query O(|P| log N)'],
        ['palindromes (longest, count, queries)', H.c('b', 'Manacher'), 'O(N)'],
        ['distinct substrings, repeats, common substrings', H.c('b', 'SA + LCP or SAM'), 'O(N log N) / O(N)'],
        ['substring equality, quick to code, randomised OK', H.c('b', 'double hashing'), 'O(1) per comparison'],
        ['text grows one char at a time, ask after each', H.c('b', 'suffix automaton'), 'amortised O(1) per char']
      ])}
      <p><b>Interview strategy:</b> say the simple solution first (hashing / O(N<sup>2</sup>)), state its limits (collisions, N), then upgrade to the deterministic structure if constraints demand it. Interviewers reward the <i>reasoning about trade-offs</i> more than a memorised template.</p>`,
    clues: [
      '"number of <b>distinct</b> substrings" → N(N+1)/2 − Σlcp (SA) or Σ len − len(link) (SAM); N ≤ 500 → set of hashes is fine.',
      '"longest substring that appears <b>twice</b>" → check whether overlap is allowed — it changes the algorithm.',
      '"distinct substrings of length exactly k" / "for every length" → SA + LCP + difference array over lengths.',
      '"k-th lexicographically smallest substring" → walk SA ranks summing new-substring counts.',
      'Constraint words: "N ≤ 10<sup>5</sup>" + "distinct"/"repeated" → no O(N<sup>2</sup>); "queries after each appended char" → SAM.',
      '"deterministic answer required" / "hacks" → avoid single hashing; prefer SA/LCP or SAM.'
    ],
    code: [`
      class SubstringStats {
          static int[] buildSA(String s) {
              int n = s.length();
              Integer[] sa = new Integer[n];
              int[] rank = new int[n], tmp = new int[n];
              for (int i = 0; i < n; i++) { sa[i] = i; rank[i] = s.charAt(i); }
              for (int k = 1; n > 1; k <<= 1) {
                  final int K = k;
                  final int[] r = rank;
                  Comparator<Integer> c = (x, y) -> r[x] != r[y] ? Integer.compare(r[x], r[y])
                          : Integer.compare(x + K < n ? r[x + K] : -1, y + K < n ? r[y + K] : -1);
                  Arrays.sort(sa, c);
                  tmp[sa[0]] = 0;
                  for (int i = 1; i < n; i++) tmp[sa[i]] = tmp[sa[i - 1]] + (c.compare(sa[i - 1], sa[i]) < 0 ? 1 : 0);
                  System.arraycopy(tmp, 0, rank, 0, n);
                  if (rank[sa[n - 1]] == n - 1) break;
              }
              int[] res = new int[n];
              for (int i = 0; i < n; i++) res[i] = sa[i];
              return res;
          }

          static int[] kasai(String s, int[] sa) {
              int n = s.length(), h = 0;
              int[] rank = new int[n], lcp = new int[n];
              for (int r = 0; r < n; r++) rank[sa[r]] = r;
              for (int i = 0; i < n; i++) {
                  if (rank[i] == 0) { h = 0; continue; }
                  int j = sa[rank[i] - 1];
                  while (i + h < n && j + h < n && s.charAt(i + h) == s.charAt(j + h)) h++;
                  lcp[rank[i]] = h;
                  if (h > 0) h--;
              }
              return lcp;
          }

          // distinct substrings of EVERY length L = 1..n in O(n) after SA + LCP
          static long[] distinctByLength(String s) {
              int n = s.length();
              int[] sa = buildSA(s), lcp = kasai(s, sa);
              long[] diff = new long[n + 2];
              for (int r = 0; r < n; r++) {          // rank r adds lengths lcp[r]+1 .. n-sa[r]
                  int from = lcp[r] + 1, to = n - sa[r];
                  if (from <= to) { diff[from]++; diff[to + 1]--; }
              }
              long[] res = new long[n + 1];
              long run = 0;
              for (int L = 1; L <= n; L++) { run += diff[L]; res[L] = run; }
              return res;
          }

          // longest substring that occurs at least twice WITHOUT overlapping (binary search on length)
          static int longestNonOverlappingRepeat(String s) {
              int n = s.length();
              int[] sa = buildSA(s), lcp = kasai(s, sa);
              int lo = 0, hi = n / 2;
              while (lo < hi) {
                  int mid = (lo + hi + 1) / 2;
                  if (ok(sa, lcp, mid)) lo = mid; else hi = mid - 1;
              }
              return lo;
          }

          private static boolean ok(int[] sa, int[] lcp, int L) {
              int mn = sa[0], mx = sa[0];
              for (int r = 1; r < sa.length; r++) {
                  if (lcp[r] >= L) { mn = Math.min(mn, sa[r]); mx = Math.max(mx, sa[r]); if (mx - mn >= L) return true; }
                  else { mn = mx = sa[r]; }                       // start a new block
              }
              return false;
          }

          public static void main(String[] args) {
              String s = "banana";
              int[] sa = buildSA(s), lcp = kasai(s, sa);
              long n = s.length(), sum = 0;
              for (int v : lcp) sum += v;
              System.out.println("distinct = " + (n * (n + 1) / 2 - sum));          // 15
              System.out.println(Arrays.toString(distinctByLength(s)));            // [0, 3, 3, 3, 3, 2, 1]
              System.out.println(longestNonOverlappingRepeat("banana"));           // 2 ("an" or "na")
              System.out.println(longestNonOverlappingRepeat("aaaa"));             // 2 ("aa" at 0 and 2)
          }
      }`, { lang: 'python', run: true, title: 'Three ways to count distinct substrings (Python, runnable)', code: `
import random

def by_set(s):
    return len({s[i:j] for i in range(len(s)) for j in range(i + 1, len(s) + 1)})

def by_sa_lcp(s):
    n = len(s)
    sa = sorted(range(n), key=lambda i: s[i:])            # small inputs: plain sort is fine
    lcp = [0] * n
    for r in range(1, n):
        a, b, h = sa[r - 1], sa[r], 0
        while a + h < n and b + h < n and s[a + h] == s[b + h]:
            h += 1
        lcp[r] = h
    return n * (n + 1) // 2 - sum(lcp)

def by_sam(s):
    length, link, nxt, last = [0], [-1], [{}], 0
    for ch in s:
        cur = len(length); length.append(length[last] + 1); link.append(-1); nxt.append({})
        p = last
        while p != -1 and ch not in nxt[p]:
            nxt[p][ch] = cur; p = link[p]
        if p == -1:
            link[cur] = 0
        else:
            q = nxt[p][ch]
            if length[p] + 1 == length[q]:
                link[cur] = q
            else:
                cl = len(length); length.append(length[p] + 1); link.append(link[q]); nxt.append(dict(nxt[q]))
                while p != -1 and nxt[p].get(ch) == q:
                    nxt[p][ch] = cl; p = link[p]
                link[q] = link[cur] = cl
        last = cur
    return sum(length[v] - length[link[v]] for v in range(1, len(length)))

print("banana:", by_set("banana"), by_sa_lcp("banana"), by_sam("banana"))   # 15 15 15
random.seed(7)
for _ in range(300):                                                       # stress test all three agree
    w = ''.join(random.choice('ab') for _ in range(random.randint(1, 12)))
    assert by_set(w) == by_sa_lcp(w) == by_sam(w), w
print("300 random tests: all three methods agree")
` }],
    codeTitle: ['Distinct by length + non-overlapping repeat (Java)', 'Set vs SA+LCP vs SAM with a stress test (Python, runnable)'],
    viz: {
      title: 'Counting distinct substrings row by row (SA + LCP)',
      input: 'banana',
      inputLabel: 'Lowercase word (max 12 letters)',
      gen: function (input) {
        var s = readWord(input, 'banana', 12, 'the word');
        var n = s.length, sa = saJS(s), lcp = kasaiJS(s, sa), frames = [], run = 0, rows = [], r;
        frames.push({ narr: 'All N(N+1)/2 = <b>' + (n * (n + 1) / 2) + '</b> (start, end) pairs of <b>' + H.esc(s) + '</b> — but some substrings repeat. Idea: walk suffixes in sorted order; each one only adds the prefixes it does <b>not</b> share with the suffix above (that shared part is its lcp).', parts: [
          { type: 'table', label: 'suffix array + lcp', columns: ['rank', 'SA', 'suffix', 'lcp'], rows: sa.map(function (x, k) { return [k, x, s.slice(x), lcp[k]]; }) }
        ] });
        var bestL = 0, bestR = -1;
        for (r = 0; r < n; r++) {
          var len = n - sa[r], add = len - lcp[r];
          run += add;
          if (lcp[r] > bestL) { bestL = lcp[r]; bestR = r; }
          var newOnes = [];
          for (var L = lcp[r] + 1; L <= len && newOnes.length < 6; L++) newOnes.push(s.substr(sa[r], L));
          rows.push([r, s.slice(sa[r]), len, lcp[r], add, run]);
          var hl = {}; hl[r] = 'cur'; if (r > 0) hl[r - 1] = 'win';
          frames.push({ narr: 'Rank ' + r + ': suffix <code>' + H.esc(s.slice(sa[r])) + '</code> has ' + len + ' prefixes; the first ' + lcp[r] + ' were already counted' + (r > 0 ? ' by <code>' + H.esc(s.slice(sa[r - 1])) + '</code> above' : '') + '. New: ' + len + ' − ' + lcp[r] + ' = <b>' + add + '</b> (' + newOnes.map(function (x) { return '<code>' + H.esc(x) + '</code>'; }).join(', ') + (len - lcp[r] > 6 ? ', …' : '') + '). Running total ' + run + '.', parts: [
            { type: 'table', label: 'counting', columns: ['rank', 'suffix', 'length', 'lcp', 'new', 'running'], rows: rows.slice(), hl: hl },
            { type: 'bars', label: 'new substrings per rank', values: rows.map(function (x) { return x[4]; }), hl: hlOne(r, 'cur') }
          ] });
        }
        var diff = [], byLen = [], i;
        for (i = 0; i <= n + 1; i++) diff.push(0);
        for (r = 0; r < n; r++) { var from = lcp[r] + 1, to = n - sa[r]; if (from <= to) { diff[from]++; diff[to + 1]--; } }
        var acc = 0;
        for (i = 1; i <= n; i++) { acc += diff[i]; byLen.push(acc); }
        var hlRep = {}; if (bestR > 0) { hlRep[bestR] = 'sel'; hlRep[bestR - 1] = 'sel'; }
        frames.push({ narr: 'Total distinct substrings = <b>' + run + '</b> = ' + (n * (n + 1) / 2) + ' − Σlcp. Bonus from the same table: the largest lcp (' + bestL + ') gives the longest repeated substring <b>' + (bestL ? H.esc(s.substr(sa[bestR], bestL)) : '(none)') + '</b>, and a difference array over lengths gives the distinct count for every length.', parts: [
          { type: 'table', label: 'final', columns: ['rank', 'suffix', 'length', 'lcp', 'new', 'running'], rows: rows.slice(), hl: hlRep },
          { type: 'bars', label: 'distinct substrings of each length L = 1..' + n, values: byLen, idxLabels: byLen.map(function (_, j) { return 'L' + (j + 1); }) },
          { type: 'vars', vals: { distinct: run, 'longest repeat': bestL ? s.substr(sa[bestR], bestL) : '—', 'Σ lcp': n * (n + 1) / 2 - run }, hl: { distinct: 'sel' } }
        ] });
        frames.push({ narr: 'Which tool when? A quick decision table to say out loud in an interview.', parts: [
          { type: 'table', label: 'tool picker', columns: ['question', 'tool', 'time'], rows: [
            ['one pattern in a text', 'KMP / Z', 'O(N+M)'],
            ['many patterns in a text', 'Aho–Corasick', 'O(N+M·σ+Z)'],
            ['many queries on one text', 'suffix array', 'O(|P| log N) each'],
            ['palindromes', 'Manacher', 'O(N)'],
            ['distinct / repeated / common', 'SA+LCP or SAM', 'O(N log N) / O(N)'],
            ['fast substring equality', 'double hashing', 'O(1), randomised'],
            ['online appends', 'suffix automaton', 'O(1) amortised']
          ], hl: { 4: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: '"aaaa": only 4 distinct substrings', html: `<p>SA = [3, 2, 1, 0], lcp = [0, 1, 2, 3]. New per rank: 1 − 0, 2 − 1, 3 − 2, 4 − 3 = 1 each → <b>4</b> (a, aa, aaa, aaaa), while there are 10 (start, end) pairs. Highly repetitive strings are where counting by pairs goes most wrong.</p>` },
      { title: 'Non-overlapping repeat in "aaaa"', html: `<p>Overlap allowed: <code>aaa</code> (at 0 and 1). No overlap: binary search L. L = 2: block of ranks with lcp ≥ 2 = {SA 2, 1, 0} → max − min = 2 ≥ 2 ✔. L = 3 would need two starts ≥ 3 apart in a length-4 string — impossible. Answer <b>2</b> (<code>aa</code> at 0 and 2).</p>` },
      { title: 'k-th smallest distinct substring', html: `<p>“banana”, k = 4. Walk ranks: rank 0 adds {a} (1 total), rank 1 adds {an, ana} (3 total), rank 2 adds {anan, anana} → the 4th is <b>anan</b>: the (4 − 3) = 1st new prefix of <code>anana</code>, i.e. length lcp + 1 = 4.</p>` },
      { title: 'Distinct substrings of every length', html: `<p>For “banana” the per-length counts are L1: 3 (a, b, n), L2: 3 (an, ba, na), L3: 3, L4: 3, L5: 2, L6: 1 → total 15. Each rank r contributes a contiguous range of lengths [lcp[r]+1, n − SA[r]], so a difference array gives all counts in O(N).</p>` }
    ],
    deepDive: `<p><b>Proof of the distinct-count formula.</b> Map each distinct substring w to the <i>first</i> suffix (in SA order) that has w as a prefix. That suffix at rank r has w as a prefix but the suffix at rank r − 1 does not (otherwise r would not be first), so |w| &gt; lcp[r]; conversely any prefix of rank r longer than lcp[r] is new. Hence rank r owns exactly (n − SA[r]) − lcp[r] substrings and the sum counts each distinct substring once.</p>
      <p><b>Non-overlap needs extra care.</b> Max LCP ignores positions, so <code>aaaa</code> would report <code>aaa</code>. The monotone predicate “a non-overlapping repeat of length L exists” plus blocks of lcp ≥ L gives O(N log N). With a SAM you store firstpos and lastpos (max endpos via the link tree) per state; the best length in state v is min(len(v), lastpos − firstpos) if it exceeds len(link(v)).</p>
      <p><b>Choosing under real constraints.</b> Memory: SA+LCP ≈ 8N bytes; SAM with 26-wide arrays ≈ 2N·26·4 = 208N bytes (≈ 200 MB for N = 10<sup>6</sup> in Java!) — use a flat array or hash maps. Determinism: hashing can be wrong with tiny probability; acceptable in most interviews if you say so and use double hashing. Speed: O(N log<sup>2</sup> N) SA with <code>Integer[]</code> boxing is ~1 s for N = 10<sup>6</sup> in Java; the counting-sort version is several times faster. Production systems that need these operations at scale (genomics, large corpus dedup) use SA-IS + compressed indexes (FM-index), not textbook code.</p>`,
    aiEra: `<p><b>What AI changes:</b> deduplication and memorisation checks are now everyday ML-engineering tasks. Researchers use suffix arrays to find exact repeated spans in training corpora and to check whether a model’s output appears verbatim in its training data; plagiarism and code-clone detectors (e.g. MOSS) use k-gram hashing with winnowing; near-duplicate detection uses MinHash. Knowing when you need <b>exact</b> structure (SA/SAM) versus <b>approximate</b> fingerprints (MinHash, embeddings) is a real design skill.</p>
      <p><b>Use AI as a partner:</b> give it the problem statement and ask <code>which of hashing, SA+LCP, SAM fits these constraints and why — list memory per character</code>, then check its numbers yourself. Ask for a three-way stress test like the Python snippet above whenever you implement any of these structures.</p>
      <p><b>Where AI goes wrong:</b> answering the overlap-allowed version when the statement forbids overlap, using N(N+1)/2 in <code>int</code> (overflows at N ≈ 65,536), and proposing embeddings for an exact-match problem. <b>What you must still own:</b> reading the fine print (distinct vs occurrences, overlap vs not), translating constraints into a tool choice, and explaining the trade-off in two sentences.</p>`,
    problems: [{
      title: 'Number of Distinct Substrings in a String', level: 'Medium', tags: ['suffix array', 'lcp', 'suffix automaton', 'hashing'], companies: ['Google', 'Intuit'],
      statement: `<p>Given a string <code>s</code>, return the number of <b>distinct</b> non-empty substrings of <code>s</code>. Follow-up: can you do it in O(N log N) or O(N)?</p>`,
      constraints: `1 ≤ |s| ≤ 500 for the original (LeetCode 1698); solve for |s| ≤ 10<sup>5</sup> in the follow-up. Lowercase letters.`,
      example: `<p>s = <code>"aabbaba"</code> → <b>21</b>. s = <code>"abcdefg"</code> → <b>28</b> (all 7·8/2 substrings are different).</p><p>s = <code>"banana"</code> → <b>15</b>: 21 pairs minus Σlcp = 6 repeats (${H.c('r', 'a ×2, an, ana, n, na')}).</p>`,
      brute: { why: `<p>Insert every substring into a HashSet&lt;String&gt;: O(N<sup>2</sup>) substrings × O(N) to copy and hash → O(N<sup>3</sup>) time and O(N<sup>3</sup>) memory in the worst case. N = 500 is fine (≈ 2·10<sup>7</sup>), N = 10<sup>5</sup> is impossible.</p>`, code: `
        class Brute {
            int countDistinct(String s) {
                Set<String> set = new HashSet<>();
                for (int i = 0; i < s.length(); i++)
                    for (int j = i + 1; j <= s.length(); j++)
                        set.add(s.substring(i, j));
                return set.size();
            }
        }` },
      mcq: { q: 'With SA + LCP, how many NEW distinct substrings does the suffix at rank r contribute?', options: ['n − SA[r]', 'lcp[r]', '(n − SA[r]) − lcp[r]', '1'], answer: 2, explain: 'Its first lcp[r] prefixes were already counted by the suffix right above it; the remaining prefixes are new.' },
      hints: [`<p>Every substring is a prefix of a suffix. If suffixes are sorted, a prefix that repeats must be shared with the <b>neighbour above</b>.</p>`, `<p>Build SA, then LCP with Kasai. Answer = Σ over ranks of (suffix length − lcp[r]) = N(N+1)/2 − Σ lcp.</p>`, `<p>Use <code>long</code> (N = 10<sup>5</sup> gives ≈ 5·10<sup>9</sup>). Alternative O(N): suffix automaton, Σ len(v) − len(link(v)). Check: <code>aaaa</code> → 4.</p>`],
      solution: {
        approach: `<p>SA + Kasai LCP: each sorted suffix contributes its prefixes longer than its LCP with the previous suffix. O(N log<sup>2</sup> N) with the comparator SA (or O(N log N) with counting sort); deterministic, ~8N bytes extra.</p>`,
        code: `
          class Solution {
              public long countDistinct(String s) {
                  int n = s.length();
                  int[] sa = buildSA(s);
                  int[] rank = new int[n];
                  for (int r = 0; r < n; r++) rank[sa[r]] = r;
                  long total = (long) n * (n + 1) / 2;
                  int h = 0;
                  for (int i = 0; i < n; i++) {                 // Kasai, subtracting lcp on the fly
                      if (rank[i] == 0) { h = 0; continue; }
                      int j = sa[rank[i] - 1];
                      while (i + h < n && j + h < n && s.charAt(i + h) == s.charAt(j + h)) h++;
                      total -= h;
                      if (h > 0) h--;
                  }
                  return total;
              }

              private int[] buildSA(String s) {
                  int n = s.length();
                  Integer[] sa = new Integer[n];
                  int[] rank = new int[n], tmp = new int[n];
                  for (int i = 0; i < n; i++) { sa[i] = i; rank[i] = s.charAt(i); }
                  for (int k = 1; n > 1; k <<= 1) {
                      final int K = k;
                      final int[] r = rank;
                      Comparator<Integer> c = (x, y) -> r[x] != r[y] ? Integer.compare(r[x], r[y])
                              : Integer.compare(x + K < n ? r[x + K] : -1, y + K < n ? r[y + K] : -1);
                      Arrays.sort(sa, c);
                      tmp[sa[0]] = 0;
                      for (int i = 1; i < n; i++) tmp[sa[i]] = tmp[sa[i - 1]] + (c.compare(sa[i - 1], sa[i]) < 0 ? 1 : 0);
                      System.arraycopy(tmp, 0, rank, 0, n);
                      if (rank[sa[n - 1]] == n - 1) break;
                  }
                  int[] res = new int[n];
                  for (int i = 0; i < n; i++) res[i] = sa[i];
                  return res;
              }
          }`,
        alt: [{ lang: 'python', code: `
class Solution:
    def countDistinct(self, s: str) -> int:
        # O(N) suffix automaton: sum of len(v) - len(link(v))
        length, link, nxt, last = [0], [-1], [{}], 0
        for ch in s:
            cur = len(length); length.append(length[last] + 1); link.append(-1); nxt.append({})
            p = last
            while p != -1 and ch not in nxt[p]:
                nxt[p][ch] = cur; p = link[p]
            if p == -1:
                link[cur] = 0
            else:
                q = nxt[p][ch]
                if length[p] + 1 == length[q]:
                    link[cur] = q
                else:
                    cl = len(length); length.append(length[p] + 1); link.append(link[q]); nxt.append(dict(nxt[q]))
                    while p != -1 and nxt[p].get(ch) == q:
                        nxt[p][ch] = cl; p = link[p]
                    link[q] = link[cur] = cl
            last = cur
        return sum(length[v] - length[link[v]] for v in range(1, len(length)))` }],
        dry: { head: ['i (text order)', 'suffix', 'neighbour above', 'h (lcp)', 'total after subtracting'], rows: [
          ['start', '', '', '', '21 = 6·7/2'],
          ['0', 'banana', 'anana', '0', '21'],
          ['1', 'anana', 'ana', '3', '18'],
          ['2', 'nana', 'na', '2', '16'],
          ['3', 'ana', 'a', '1', '15'],
          ['4', 'na', 'banana', '0', '15'],
          ['5', 'a', '— (rank 0)', '—', H.c('g', '<b>15</b>')]
        ] },
        complexity: `<p>O(N log<sup>2</sup> N) time, O(N) space (SA route); O(N·σ) memory and O(N) time with the suffix automaton.</p>`,
        followUps: ['Count distinct substrings of length exactly k for all k (difference array).', 'Count distinct substrings that occur at least twice.', 'Answer the count after every appended character (SAM increments).']
      }
    }]
  });
registerModule({ id: 'dsa24', title: 'Advanced String Algorithms', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
