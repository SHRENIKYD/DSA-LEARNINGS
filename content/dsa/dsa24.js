(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // =====================================================================
  // Shared helpers for the visualizers (plain ES5, deterministic, fast)
  // =====================================================================
  function readWord(input, fallback, maxLen, what) {
    var s = (input === undefined || input === null) ? fallback : String(input);
    s = s.replace(/\s+/g, '');
    if (!s.length) throw new Error('Please type ' + what + ' (letters a-z).');
    var What = what.charAt(0).toUpperCase() + what.slice(1);
    if (!/^[a-z]+$/.test(s)) throw new Error(What + ' must use only lowercase letters a-z (example: ' + fallback + ').');
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
    code: [{ lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `class Manacher:
    # P over t = "#s0#s1#...#s(n-1)#" (length 2n+1).
    # P[i] = radius of the palindrome centered at t[i]
    #      = LENGTH of the matching palindrome in the original s.
    @staticmethod
    def radii(s):
        t = '#' + '#'.join(s) + '#' if s else '#'
        m = len(t)
        p = [0] * m
        c, r = 0, -1                      # box = [c - p[c], r], r = furthest right end
        for i in range(m):
            # free start from the mirror (2c - i) if we are inside the box
            k = 0 if i > r else min(p[2 * c - i], r - i)
            # try to grow beyond what we already know
            while i - k - 1 >= 0 and i + k + 1 < m and t[i - k - 1] == t[i + k + 1]:
                k += 1
            p[i] = k
            if i + k > r:                 # box moved right
                c, r = i, i + k
        return p

    @staticmethod
    def longest_palindrome(s):
        p = Manacher.radii(s)
        center = max(range(len(p)), key=p.__getitem__)
        start = (center - p[center]) // 2   # map back to s
        return s[start:start + p[center]]

    @staticmethod
    def count_palindromes(s):
        return sum((v + 1) // 2 for v in Manacher.radii(s))   # palindromes sharing each center

    # O(1) palindrome query after O(n) preprocessing
    @staticmethod
    def is_pal(p, l, r):
        return p[l + r + 1] >= r - l + 1


print(Manacher.longest_palindrome("abacabad"))   # abacaba
print(Manacher.count_palindromes("aaa"))         # 6
p = Manacher.radii("abba")
print(Manacher.is_pal(p, 0, 3), Manacher.is_pal(p, 0, 2))   # True False` }, { lang: 'js', code: `class Manacher {
  // P over t = "#s0#s1#...#s(n-1)#" (length 2n+1).
  // P[i] = radius of the palindrome centered at t[i]
  //      = LENGTH of the matching palindrome in the original s.
  static radii(s) {
    const t = ['#'];
    for (const ch of s) t.push(ch, '#');
    const m = t.length, p = new Array(m).fill(0);
    let c = 0, r = -1;                       // box = [c - p[c], r], r = furthest right end
    for (let i = 0; i < m; i++) {
      // free start from the mirror (2c - i) if we are inside the box
      let k = i > r ? 0 : Math.min(p[2 * c - i], r - i);
      // try to grow beyond what we already know
      while (i - k - 1 >= 0 && i + k + 1 < m && t[i - k - 1] === t[i + k + 1]) k++;
      p[i] = k;
      if (i + k > r) { c = i; r = i + k; }   // box moved right
    }
    return p;
  }

  static longestPalindrome(s) {
    const p = Manacher.radii(s);
    let best = 0, center = 0;
    for (let i = 0; i < p.length; i++) if (p[i] > best) { best = p[i]; center = i; }
    const start = (center - best) >> 1;      // map back to s
    return s.substring(start, start + best);
  }

  static countPalindromes(s) {
    let total = 0;
    for (const v of Manacher.radii(s)) total += (v + 1) >> 1;   // palindromes sharing this center
    return total;
  }

  // O(1) palindrome query after O(n) preprocessing
  static isPal(p, l, r) { return p[l + r + 1] >= r - l + 1; }
}

console.log(Manacher.longestPalindrome("abacabad"));   // abacaba
console.log(Manacher.countPalindromes("aaa"));         // 6
const p = Manacher.radii("abba");
console.log(Manacher.isPal(p, 0, 3), Manacher.isPal(p, 0, 2));   // true false` }, { lang: 'cpp', code: `class Manacher {
public:
    // P over t = "#s0#s1#...#s(n-1)#" (length 2n+1).
    // P[i] = radius of the palindrome centered at t[i]
    //      = LENGTH of the matching palindrome in the original s.
    static vector<int> radii(const string& s) {
        string t = "#";
        for (char ch : s) { t += ch; t += '#'; }
        int m = t.size();
        vector<int> p(m, 0);
        int c = 0, r = -1;                       // box = [c - p[c], r], r = furthest right end
        for (int i = 0; i < m; i++) {
            // free start from the mirror (2c - i) if we are inside the box
            int k = (i > r) ? 0 : min(p[2 * c - i], r - i);
            // try to grow beyond what we already know
            while (i - k - 1 >= 0 && i + k + 1 < m && t[i - k - 1] == t[i + k + 1]) k++;
            p[i] = k;
            if (i + k > r) { c = i; r = i + k; }  // box moved right
        }
        return p;
    }

    static string longestPalindrome(const string& s) {
        vector<int> p = radii(s);
        int best = 0, center = 0;
        for (int i = 0; i < (int)p.size(); i++) if (p[i] > best) { best = p[i]; center = i; }
        int start = (center - best) / 2;         // map back to s
        return s.substr(start, best);
    }

    static long long countPalindromes(const string& s) {
        long long total = 0;
        for (int v : radii(s)) total += (v + 1) / 2;   // palindromes sharing this center
        return total;
    }

    // O(1) palindrome query after O(n) preprocessing
    static bool isPal(const vector<int>& p, int l, int r) { return p[l + r + 1] >= r - l + 1; }
};

int main() {
    cout << Manacher::longestPalindrome("abacabad") << "\\n";   // abacaba
    cout << Manacher::countPalindromes("aaa") << "\\n";         // 6
    vector<int> p = Manacher::radii("abba");
    cout << boolalpha << Manacher::isPal(p, 0, 3) << " " << Manacher::isPal(p, 0, 2) << "\\n";   // true false
}` }] }, { lang: 'python', run: true, title: 'Manacher in Python (runnable)', code: `
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
      <p><b>Production reality.</b> Real text is Unicode: Java and JavaScript index UTF-16 code units (an emoji is two <code>char</code>s and a naive palindrome check can split it), C++ <code>std::string</code> indexes bytes, and only Python indexes code points. Decode to code points (<code>codePoints()</code>, <code>Array.from</code>, a UTF-32 string) or normalised grapheme clusters if the input is user text. Memory: int[2N+1] for N = 10<sup>7</sup> is ~80 MB — use the d1/d2 variant or a byte/short array when radii are bounded.</p>`,
    aiEra: `<p><b>What AI changes:</b> any assistant can produce Manacher in seconds, so “can you type it” is no longer the signal. Interviewers now ask <i>why</i> it is linear, how the mirror rule works, and how to read prefix/suffix/count answers off the P array.</p>
      <p><b>Use AI as a partner:</b> ask <code>Write a stress test that compares my Manacher with an O(N^3) brute force on 10,000 random strings over {a,b}</code>. Small alphabets create many palindromes, which is exactly where off-by-one bugs hide. Ask it to explain one specific frame of the visualizer back to you — if its explanation disagrees with your trace, one of you is wrong, and finding out who is great practice.</p>
      <p><b>Where AI goes wrong:</b> mixing up the two conventions (radius in t vs length in s), so the substring start is off by one; forgetting that P on the padded string already equals the length in s and then doubling it; using <code>min(P[mirror], R − i + 1)</code> with an inclusive/exclusive mismatch. <b>What you must still own:</b> recognising “palindrome + big N” as a Manacher clue, choosing expand-around-center when N ≤ 3000 (simpler, fewer bugs), and proving the O(N) bound out loud.</p>`,
    problems: [{
      title: 'Palindromic Substrings (count them all)', level: 'Medium', tags: ['manacher', 'palindrome', 'string'], companies: ['Facebook', 'Amazon', 'LinkedIn'],
      statement: `<p>Given a string <code>s</code>, return the number of palindromic substrings in it. Substrings at different positions count separately even if they have the same letters.</p>`,
      constraints: `1 ≤ |s| ≤ 10<sup>6</sup> (the original LeetCode 647 has 1000 — we push it so O(N<sup>2</sup>) is not enough), lowercase letters`,
      example: `<p>s = <code>"aaa"</code> → <b>6</b>: ${H.c('g', 'a, a, a')} (length 1), ${H.c('b', 'aa, aa')} (length 2), ${H.c('p', 'aaa')} (length 3).</p><p>s = <code>"abc"</code> → <b>3</b>: only the single letters.</p>`,
      brute: { why: `<p>Check all N(N+1)/2 substrings, each in O(N) → O(N<sup>3</sup>). Even expand-around-center (O(N<sup>2</sup>)) does ~2.5·10<sup>11</sup> steps on <code>"aaa…a"</code> with N = 10<sup>6</sup>. The wasted work: re-discovering the same mirrored characters again and again.</p>`, code: { lang: 'java', code: `
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
        }`, alt: [{ lang: 'python', code: String.raw`
class Brute:
    def countSubstrings(self, s: str) -> int:
        n, count = len(s), 0
        for i in range(n):
            for j in range(i, n):
                l, r = i, j
                while l < r and s[l] == s[r]:
                    l += 1
                    r -= 1
                if l >= r:
                    count += 1                        # s[i..j] is a palindrome
        return count` }, { lang: 'js', code: String.raw`
function countSubstrings(s) {
  const n = s.length;
  let count = 0;
  for (let i = 0; i < n; i++)
    for (let j = i; j < n; j++) {
      let l = i, r = j;
      while (l < r && s[l] === s[r]) { l++; r--; }
      if (l >= r) count++;                            // s[i..j] is a palindrome
    }
  return count;
}` }, { lang: 'cpp', code: String.raw`
class Brute {
public:
    long long countSubstrings(const string& s) {
        int n = s.size();
        long long count = 0;
        for (int i = 0; i < n; i++)
            for (int j = i; j < n; j++) {
                int l = i, r = j;
                while (l < r && s[l] == s[r]) { l++; r--; }
                if (l >= r) count++;                  // s[i..j] is a palindrome
            }
        return count;
    }
};` }] } },
      mcq: { q: 'P over the padded string at some center is 5. How many palindromic substrings share this center?', options: ['5', '3 (lengths 5, 3, 1)', '2', '1'], answer: 1, explain: 'Peeling one character off each end keeps a palindrome: lengths 5, 3, 1 → (5 + 1)/2 = 3.' },
      hints: [`<p>Every palindrome has exactly one center in the <code>#</code>-padded string, and all palindromes with the same center are nested: if the longest has length P, the others have lengths P−2, P−4, …</p>`, `<p>So the answer is Σ ⌈P[i]/2⌉ = Σ (P[i] + 1) / 2 over all centers. You just need every P[i] — Manacher gives all of them in O(N).</p>`, `<p>Use a 64-bit integer (<code>long</code>, <code>long long</code>; Python ints are unbounded) for the total (N = 10<sup>6</sup> all-same letters gives ~5·10<sup>11</sup>). Recipe: build t, run Manacher, sum (p+1)/2.</p>`],
      tests: { sig: 'string -> long', fn: 'countSubstrings', names: { python: 'countSubstrings' }, cases: [
        [["aaa"],6],
        [["abc"],3],
        [["a"],1],
        [["abba"],6],
        [["abacaba"],12],
        [["aabaa"],9],
        [["zz"],3],
        [["abcba"],7],
        [["aabbaabbbabbbb"],34],
        [["aabbbbb"],18],
        [["aaaabaaabba"],26],
        [["abbabbb"],14],
        [["abcbcbaabcaa"],21],
        [[{"$rep":"a","n":1000000}],500000500000],
        [[{"$rep":"ab","n":500000}],250000500000]
      ] },
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
        return total` }, { lang: 'js', code: `
function countSubstrings(s) {
  const m = 2 * s.length + 1;
  const at = (i) => (i % 2 === 0 ? 35 : s.charCodeAt(i >> 1));   // "#a#b#..." without building it
  const p = new Int32Array(m);
  let c = 0, r = -1, total = 0;
  for (let i = 0; i < m; i++) {
    let k = i > r ? 0 : Math.min(p[2 * c - i], r - i);            // mirror gift
    while (i - k - 1 >= 0 && i + k + 1 < m && at(i - k - 1) === at(i + k + 1)) k++;
    p[i] = k;
    if (i + k > r) { c = i; r = i + k; }
    total += (k + 1) >> 1;                                         // nested palindromes at this center
  }
  return total;                                                    // up to 5e11: exact in a double
}` }, { lang: 'cpp', code: `
class Solution {
public:
    long long countSubstrings(const string& s) {
        string t = "#";
        for (char ch : s) { t += ch; t += '#'; }
        int m = t.size(), c = 0, r = -1;
        vector<int> p(m, 0);
        long long total = 0;
        for (int i = 0; i < m; i++) {
            int k = (i > r) ? 0 : min(p[2 * c - i], r - i);        // mirror gift
            while (i - k - 1 >= 0 && i + k + 1 < m && t[i - k - 1] == t[i + k + 1]) k++;
            p[i] = k;
            if (i + k > r) { c = i; r = i + k; }
            total += (k + 1) / 2;                                   // nested palindromes at this center
        }
        return total;
    }
};` }],
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
      <p>It is just <b>N integers</b> (4N bytes with 32-bit ints) — far lighter than a suffix tree (often 20N+ bytes) yet it answers most of the same questions.</p>
      <h4>2. Naive build and why it is too slow</h4>
      <p>Sort N strings with a comparison sort: N log N comparisons, but each comparison can cost O(N) characters → <b>O(N<sup>2</sup> log N)</b>. Fine for N = 1000, hopeless for 10<sup>5</sup> (think <code>aaaa…a</code>, where every comparison scans far).</p>
      <h4>3. Prefix doubling — sort by 1, 2, 4, 8 … characters</h4>
      <p>Key idea: if you already know the order of all suffixes by their first <b>k</b> characters (as small integer <i>ranks</i>), then the order by the first <b>2k</b> characters is just sorting <b>pairs</b> <code>(rank[i], rank[i + k])</code> — the first half and the second half. Comparing two integer pairs is O(1), not O(N).</p>
      ${H.table(['i', 'suffix', 'k = 1: rank', 'pair (r[i], r[i+1])', 'k = 2: rank', 'pair (r[i], r[i+2])', 'k = 4: rank'], [
        ['0', 'banana', '1', '(1, 0)', '2', '(2, 3)', '3'],
        ['1', 'anana', '0', '(0, 2)', '1', '(1, 1)', '2'],
        ['2', 'nana', '2', '(2, 0)', '3', '(3, 3)', '5'],
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
    code: [{ lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `class SuffixArray:
    # O(N log N) prefix doubling with counting sort on CYCLIC shifts.
    # We append a sentinel smaller than every real char so cyclic order == suffix order.
    @staticmethod
    def build(s):
        a = [ord(ch) + 1 for ch in s] + [0]          # shift: sentinel 0 is smallest
        n = len(a)
        alphabet = max(a) + 1
        cnt = [0] * max(alphabet, n)
        p = [0] * n
        # round 0: counting sort by the first character
        for x in a:
            cnt[x] += 1
        for i in range(1, alphabet):
            cnt[i] += cnt[i - 1]
        for i in range(n - 1, -1, -1):
            cnt[a[i]] -= 1
            p[cnt[a[i]]] = i
        c = [0] * n
        classes = 1
        for i in range(1, n):
            if a[p[i]] != a[p[i - 1]]:
                classes += 1
            c[p[i]] = classes - 1
        length = 1
        while length < n and classes < n:
            # shifting by -len makes the list already sorted by the SECOND half
            pn = [(x - length) % n for x in p]
            # stable counting sort by the FIRST half (class of pn[i])
            cnt = [0] * classes
            for x in pn:
                cnt[c[x]] += 1
            for i in range(1, classes):
                cnt[i] += cnt[i - 1]
            for i in range(n - 1, -1, -1):
                cnt[c[pn[i]]] -= 1
                p[cnt[c[pn[i]]]] = pn[i]
            # re-rank: new class when either half differs
            cn = [0] * n
            classes = 1
            for i in range(1, n):
                if c[p[i]] != c[p[i - 1]] or c[(p[i] + length) % n] != c[(p[i - 1] + length) % n]:
                    classes += 1
                cn[p[i]] = classes - 1
            c = cn
            length <<= 1
        return p[1:]                                  # drop the sentinel suffix (always first)

    # -1: suffix < p, 0: p is a prefix of the suffix, +1: suffix > p
    @staticmethod
    def cmp(s, start, p):
        for k, y in enumerate(p):
            if start + k >= len(s):
                return -1                             # suffix ran out first -> smaller
            x = s[start + k]
            if x != y:
                return -1 if x < y else 1
        return 0

    # occurrences of p are SA[lo .. hi-1]
    @staticmethod
    def occurrence_range(s, sa, p):
        lo, hi = 0, len(sa)
        while lo < hi:
            mid = (lo + hi) // 2
            if SuffixArray.cmp(s, sa[mid], p) < 0:
                lo = mid + 1
            else:
                hi = mid
        left = lo
        hi = len(sa)
        while lo < hi:
            mid = (lo + hi) // 2
            if SuffixArray.cmp(s, sa[mid], p) <= 0:
                lo = mid + 1
            else:
                hi = mid
        return left, lo


s = "banana"
sa = SuffixArray.build(s)
print(sa)                                             # [5, 3, 1, 0, 4, 2]
lo, hi = SuffixArray.occurrence_range(s, sa, "ana")
print("ana occurs", hi - lo, "times")                 # 2` }, { lang: 'js', code: `class SuffixArray {
  // O(N log N) prefix doubling with counting sort on CYCLIC shifts.
  // We append a sentinel smaller than every real char so cyclic order == suffix order.
  static build(str) {
    const n = str.length + 1;
    const a = new Array(n);
    for (let i = 0; i < n - 1; i++) a[i] = str.charCodeAt(i) + 1;   // shift: sentinel 0 is smallest
    a[n - 1] = 0;
    let alphabet = 0;
    for (const x of a) alphabet = Math.max(alphabet, x + 1);
    const p = new Array(n).fill(0);
    let c = new Array(n).fill(0), cn = new Array(n).fill(0), pn = new Array(n).fill(0);
    let cnt = new Array(Math.max(alphabet, n)).fill(0);
    // round 0: counting sort by the first character
    for (const x of a) cnt[x]++;
    for (let i = 1; i < alphabet; i++) cnt[i] += cnt[i - 1];
    for (let i = n - 1; i >= 0; i--) p[--cnt[a[i]]] = i;
    let classes = 1;
    c[p[0]] = 0;
    for (let i = 1; i < n; i++) { if (a[p[i]] !== a[p[i - 1]]) classes++; c[p[i]] = classes - 1; }
    for (let len = 1; len < n && classes < n; len <<= 1) {
      // shifting by -len makes the list already sorted by the SECOND half
      for (let i = 0; i < n; i++) { pn[i] = p[i] - len; if (pn[i] < 0) pn[i] += n; }
      // stable counting sort by the FIRST half (class of pn[i])
      cnt.fill(0, 0, classes);
      for (let i = 0; i < n; i++) cnt[c[pn[i]]]++;
      for (let i = 1; i < classes; i++) cnt[i] += cnt[i - 1];
      for (let i = n - 1; i >= 0; i--) p[--cnt[c[pn[i]]]] = pn[i];
      // re-rank: new class when either half differs
      cn[p[0]] = 0;
      classes = 1;
      for (let i = 1; i < n; i++) {
        const curB = c[(p[i] + len) % n], prevB = c[(p[i - 1] + len) % n];
        if (c[p[i]] !== c[p[i - 1]] || curB !== prevB) classes++;
        cn[p[i]] = classes - 1;
      }
      [c, cn] = [cn, c];
    }
    return p.slice(1);                       // drop the sentinel suffix (always first)
  }

  // -1: suffix < p, 0: p is a prefix of the suffix, +1: suffix > p
  static cmp(s, start, p) {
    for (let k = 0; k < p.length; k++) {
      if (start + k >= s.length) return -1;          // suffix ran out first -> smaller
      const x = s[start + k], y = p[k];
      if (x !== y) return x < y ? -1 : 1;
    }
    return 0;
  }

  // occurrences of p are SA[lo .. hi-1]
  static occurrenceRange(s, sa, p) {
    let lo = 0, hi = sa.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (SuffixArray.cmp(s, sa[mid], p) < 0) lo = mid + 1; else hi = mid; }
    const left = lo;
    hi = sa.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (SuffixArray.cmp(s, sa[mid], p) <= 0) lo = mid + 1; else hi = mid; }
    return [left, lo];
  }
}

const s = "banana";
const sa = SuffixArray.build(s);
console.log(JSON.stringify(sa));                     // [5,3,1,0,4,2]
const [lo, hi] = SuffixArray.occurrenceRange(s, sa, "ana");
console.log("ana occurs " + (hi - lo) + " times");   // 2` }, { lang: 'cpp', code: `class SuffixArray {
public:
    // O(N log N) prefix doubling with counting sort on CYCLIC shifts.
    // We append a sentinel smaller than every real char so cyclic order == suffix order.
    static vector<int> build(const string& str) {
        int n = str.size() + 1;
        vector<int> a(n);
        for (int i = 0; i < n - 1; i++) a[i] = (unsigned char)str[i] + 1;   // shift: sentinel 0 is smallest
        a[n - 1] = 0;
        int alphabet = *max_element(a.begin(), a.end()) + 1;
        vector<int> p(n), c(n), pn(n), cn(n), cnt(max(alphabet, n), 0);
        // round 0: counting sort by the first character
        for (int x : a) cnt[x]++;
        for (int i = 1; i < alphabet; i++) cnt[i] += cnt[i - 1];
        for (int i = n - 1; i >= 0; i--) p[--cnt[a[i]]] = i;
        int classes = 1;
        c[p[0]] = 0;
        for (int i = 1; i < n; i++) { if (a[p[i]] != a[p[i - 1]]) classes++; c[p[i]] = classes - 1; }
        for (int len = 1; len < n && classes < n; len <<= 1) {
            // shifting by -len makes the list already sorted by the SECOND half
            for (int i = 0; i < n; i++) { pn[i] = p[i] - len; if (pn[i] < 0) pn[i] += n; }
            // stable counting sort by the FIRST half (class of pn[i])
            fill(cnt.begin(), cnt.begin() + classes, 0);
            for (int i = 0; i < n; i++) cnt[c[pn[i]]]++;
            for (int i = 1; i < classes; i++) cnt[i] += cnt[i - 1];
            for (int i = n - 1; i >= 0; i--) p[--cnt[c[pn[i]]]] = pn[i];
            // re-rank: new class when either half differs
            cn[p[0]] = 0;
            classes = 1;
            for (int i = 1; i < n; i++) {
                int curB = c[(p[i] + len) % n], prevB = c[(p[i - 1] + len) % n];
                if (c[p[i]] != c[p[i - 1]] || curB != prevB) classes++;
                cn[p[i]] = classes - 1;
            }
            c.swap(cn);
        }
        return vector<int>(p.begin() + 1, p.end());   // drop the sentinel suffix (always first)
    }

    // -1: suffix < p, 0: p is a prefix of the suffix, +1: suffix > p
    static int cmp(const string& s, int start, const string& p) {
        for (int k = 0; k < (int)p.size(); k++) {
            if (start + k >= (int)s.size()) return -1;      // suffix ran out first -> smaller
            char x = s[start + k], y = p[k];
            if (x != y) return x < y ? -1 : 1;
        }
        return 0;
    }

    // occurrences of p are SA[lo .. hi-1]
    static pair<int, int> occurrenceRange(const string& s, const vector<int>& sa, const string& p) {
        int lo = 0, hi = sa.size();
        while (lo < hi) { int mid = (lo + hi) / 2; if (cmp(s, sa[mid], p) < 0) lo = mid + 1; else hi = mid; }
        int left = lo;
        hi = sa.size();
        while (lo < hi) { int mid = (lo + hi) / 2; if (cmp(s, sa[mid], p) <= 0) lo = mid + 1; else hi = mid; }
        return {left, lo};
    }
};

int main() {
    string s = "banana";
    vector<int> sa = SuffixArray::build(s);
    for (int x : sa) cout << x << " ";                  // 5 3 1 0 4 2
    cout << "\\n";
    auto [lo, hi] = SuffixArray::occurrenceRange(s, sa, "ana");
    cout << "ana occurs " << hi - lo << " times\\n";     // 2
}` }] }, { lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `class SuffixArraySimple:
    # O(N log^2 N): easiest to write under interview pressure.
    @staticmethod
    def build(s):
        n = len(s)
        if n == 0:
            return []
        sa = list(range(n))
        rank = [ord(ch) for ch in s]
        k = 1
        while True:
            # sort by (first half, second half); the second half is -1 past the end
            def key(i, r=rank, k=k):
                return (r[i], r[i + k] if i + k < n else -1)
            sa.sort(key=key)
            tmp = [0] * n
            for i in range(1, n):
                tmp[sa[i]] = tmp[sa[i - 1]] + (1 if key(sa[i - 1]) < key(sa[i]) else 0)
            rank = tmp
            if rank[sa[-1]] == n - 1:         # all ranks distinct -> fully sorted
                break
            k <<= 1
        return sa


print(SuffixArraySimple.build("mississippi"))   # [10, 7, 4, 1, 0, 9, 8, 6, 3, 5, 2]` }, { lang: 'js', code: `class SuffixArraySimple {
  // O(N log^2 N): easiest to write under interview pressure.
  static build(s) {
    const n = s.length;
    if (n === 0) return [];
    const sa = Array.from({ length: n }, (_, i) => i);
    let rank = Array.from(s, (ch) => ch.charCodeAt(0));
    for (let k = 1; ; k <<= 1) {
      const r = rank;
      const second = (i) => (i + k < n ? r[i + k] : -1);
      // sort by (first half, second half)
      const cmp = (x, y) => (r[x] !== r[y] ? r[x] - r[y] : second(x) - second(y));
      sa.sort(cmp);
      const tmp = new Array(n).fill(0);
      for (let i = 1; i < n; i++) tmp[sa[i]] = tmp[sa[i - 1]] + (cmp(sa[i - 1], sa[i]) < 0 ? 1 : 0);
      rank = tmp;
      if (rank[sa[n - 1]] === n - 1) break;   // all ranks distinct -> fully sorted
    }
    return sa;
  }
}

console.log(JSON.stringify(SuffixArraySimple.build("mississippi")));   // [10,7,4,1,0,9,8,6,3,5,2]` }, { lang: 'cpp', code: `class SuffixArraySimple {
public:
    // O(N log^2 N): easiest to write under interview pressure.
    static vector<int> build(const string& s) {
        int n = s.size();
        vector<int> sa(n), rank(n), tmp(n);
        iota(sa.begin(), sa.end(), 0);
        for (int i = 0; i < n; i++) rank[i] = (unsigned char)s[i];
        for (int k = 1; n > 0; k <<= 1) {
            // sort by (first half, second half); the second half is -1 past the end
            auto key = [&](int i) { return make_pair(rank[i], i + k < n ? rank[i + k] : -1); };
            sort(sa.begin(), sa.end(), [&](int x, int y) { return key(x) < key(y); });
            tmp[sa[0]] = 0;
            for (int i = 1; i < n; i++) tmp[sa[i]] = tmp[sa[i - 1]] + (key(sa[i - 1]) < key(sa[i]) ? 1 : 0);
            rank = tmp;
            if (rank[sa[n - 1]] == n - 1) break;     // all ranks distinct -> fully sorted
        }
        return sa;
    }
};

int main() {
    for (int x : SuffixArraySimple::build("mississippi")) cout << x << " ";   // 10 7 4 1 0 9 8 6 3 5 2
    cout << "\\n";
}` }] }, { lang: 'python', run: true, title: 'Prefix doubling in Python (runnable)', code: `
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
      <p><b>Production reality.</b> The Burrows–Wheeler Transform (used by bzip2) is literally “the character before each suffix, in SA order”; the <b>FM-index</b> built on it lets read aligners (BWA, Bowtie) search a 3-billion-letter human genome in a few GB of RAM. Pitfalls in code: slicing a string inside a comparator (Java <code>substring</code>, Python slices, C++ <code>substr</code>) copies O(N) per call (O(N<sup>2</sup>) memory traffic) — compare with indices instead; 32-bit overflow when N(N+1)/2 is computed for counting; recursion depth is not an issue (all iterative).</p>`,
    aiEra: `<p><b>What AI changes:</b> suffix arrays are suddenly <i>hot</i> outside competitive programming. Training-data deduplication for language models (Lee et al., 2021, “Deduplicating Training Data Makes Language Models Better”) built suffix arrays over hundreds of GB of text to find every repeated span of 50+ tokens, and <b>infini-gram</b> (2024) answers n-gram counts over trillions of tokens with a suffix array — the exact “count occurrences by two binary searches” idea from this topic, at internet scale.</p>
      <p><b>Use AI as a partner:</b> let it draft the O(N log N) build, then ask it to <code>add assertions that SA is a permutation and adjacent suffixes are strictly increasing, and fuzz against sorting all suffixes naively for N ≤ 12</code>. Ask it to explain why shifting p by −k gives the second-key order — if it cannot, write the explanation yourself.</p>
      <p><b>Where AI goes wrong:</b> mixing cyclic and non-cyclic versions (forgetting the sentinel, so <code>aa</code>’s suffixes tie forever), comparing with <code>substring()</code> in a comparator (silently quadratic), and off-by-one upper bounds in the pattern search. <b>What you must still own:</b> knowing when a hash map of substrings is enough versus when you truly need sorted-suffix structure (k-th substring, LCP-based counts), and estimating memory for N = 10<sup>8</sup>.</p>`,
    problems: [{
      title: 'Count Pattern Occurrences for Many Queries', level: 'Medium', tags: ['suffix array', 'binary search', 'string'], companies: ['Google', 'Amazon'],
      statement: `<p>You are given a fixed text <code>T</code> and <code>Q</code> query patterns. For each pattern <code>P</code>, return how many times it occurs in <code>T</code> (occurrences may overlap).</p>`,
      constraints: `1 ≤ |T| ≤ 2·10<sup>5</sup>, 1 ≤ Q ≤ 10<sup>5</sup>, Σ|P| ≤ 10<sup>6</sup>, lowercase letters`,
      example: `<p>T = <code>"banana"</code>, queries = [<code>"ana"</code>, <code>"na"</code>, <code>"x"</code>, <code>"banana"</code>] → <b>[2, 2, 0, 1]</b>.</p><p>${H.c('g', '"ana"')} starts at 1 and 3 (they overlap — still both count). ${H.c('r', '"x"')} never appears.</p>`,
      brute: { why: `<p>Scan T for every query: O(|T|·|P|) per query with naive matching, or O(|T| + |P|) with KMP — still O(Q·|T|) = 2·10<sup>10</sup>. The wasted work: re-reading the same text for every query. Build a reusable index once instead.</p>`, code: { lang: 'java', code: `
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
        }`, alt: [{ lang: 'python', code: String.raw`
def count_all(text, queries):
    ans = []
    for p in queries:
        frm, c = 0, 0
        while True:
            frm = text.find(p, frm)
            if frm == -1:
                break
            c += 1
            frm += 1                                  # overlapping
        ans.append(c)
    return ans` }, { lang: 'js', code: String.raw`
function countAll(text, queries) {
  const ans = new Array(queries.length).fill(0);
  for (let q = 0; q < queries.length; q++) {
    let from = 0, c = 0;
    while ((from = text.indexOf(queries[q], from)) !== -1) { c++; from++; }   // overlapping
    ans[q] = c;
  }
  return ans;
}` }, { lang: 'cpp', code: String.raw`
class Brute {
public:
    vector<int> countAll(string text, vector<string> queries) {
        vector<int> ans(queries.size(), 0);
        for (int q = 0; q < (int)queries.size(); q++) {
            size_t from = 0;
            int c = 0;
            while ((from = text.find(queries[q], from)) != string::npos) { c++; from++; }   // overlapping
            ans[q] = c;
        }
        return ans;
    }
};` }] } },
      mcq: { q: 'In a suffix array, the suffixes that start with pattern P…', options: ['are scattered randomly', 'form one contiguous block', 'are always the first |P| entries', 'cannot be found without LCP'], answer: 1, explain: 'Sorted order groups all strings that share a prefix, exactly like a dictionary groups words starting with the same letters.' },
      hints: [`<p>An occurrence of P at index i means P is a <b>prefix</b> of suffix i. In sorted order, all suffixes with prefix P are neighbours.</p>`, `<p>Build the suffix array once (O(N log N)). For each query do a lower bound (first suffix ≥ P) and an upper bound (first suffix whose first |P| chars are &gt; P).</p>`, `<p>Compare a suffix and P only on the first |P| characters; if the suffix ends early it is <i>smaller</i>. Answer = upper − lower. Edge cases: P longer than T, P equal to T.</p>`],
      tests: { sig: 'string string[] -> int[]', fn: 'countAll', cases: [
        [["banana",["ana","na","x","banana"]],[2,2,0,1]],
        [["a",["a","aa","b"]],[1,0,0]],
        [["aaaa",["aa","aaa","aaaa","aaaaa","a"]],[3,2,1,0,4]],
        [["mississippi",["ssi","issi","i","pp","mississippi","sip","z"]],[2,2,4,1,1,1,0]],
        [["abababab",["ab","aba","bab","b","abababab","ba"]],[4,3,3,4,1,3]],
        [["abcabcabc",["abc","cab","bca","abcabcabcabc"]],[3,2,2,0]],
        [["abaaababaaabbbaabababbababbabbbabbbb",["bbba","aa","aaaa","aa","abbb","aab","b","baab"]],[2,5,0,5,3,3,20,1]],
        [["abbaababbbbbabbabbbab",["ba","aa","b","abb","bbb","b","aaba","b"]],[5,1,14,4,4,14,1,14]],
        [["bbbbabaabababbbabbaaabaaabababbbbaaaaa",["abb","b","abab","a","a","b","a","bb"]],[3,19,4,19,19,19,19,9]],
        [[{"$rep":"a","n":200000},{"$rep":"aaaaaaaaaa","n":100000}],{"$rep":199991,"n":100000}],
        [[{"$rep":"ab","n":25000},{"$concat":[{"$rep":"abab","n":40000},["b","ba","zz"]]}],{"$concat":[{"$rep":24999,"n":40000},[25000,24999,0]]}]
      ] },
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
def build_sa(s):
    # prefix doubling: sort by (rank[i], rank[i + k]) packed into one integer key
    n = len(s)
    rank = [ord(ch) for ch in s]
    sa = list(range(n))
    base = max(n, 128) + 2
    k = 1
    while True:
        key = [rank[i] * base + (rank[i + k] + 1 if i + k < n else 0) for i in range(n)]
        sa.sort(key=key.__getitem__)
        rank = [0] * n
        r = 0
        for j in range(1, n):
            if key[sa[j]] != key[sa[j - 1]]:
                r += 1
            rank[sa[j]] = r
        if r == n - 1:
            return sa
        k <<= 1


def count_all(text, queries):
    sa = build_sa(text)
    n = len(sa)

    def bound(p, strict):
        # strict False: first suffix >= p (on |p| chars); True: first suffix > p
        lo, hi, m = 0, n, len(p)
        while lo < hi:
            mid = (lo + hi) // 2
            piece = text[sa[mid]:sa[mid] + m]       # a short suffix compares as smaller
            if piece < p or (strict and piece == p):
                lo = mid + 1
            else:
                hi = mid
        return lo

    return [bound(p, True) - bound(p, False) for p in queries]` }, { lang: 'js', code: `
function buildSA(s) {
  // prefix doubling: sort by (rank[i], rank[i + k]) packed into one number
  const n = s.length;
  let rank = new Int32Array(n);
  for (let i = 0; i < n; i++) rank[i] = s.charCodeAt(i);
  const sa = Array.from({ length: n }, (_, i) => i);
  const key = new Float64Array(n);
  const base = Math.max(n, 128) + 2;
  for (let k = 1; ; k <<= 1) {
    for (let i = 0; i < n; i++) key[i] = rank[i] * base + (i + k < n ? rank[i + k] + 1 : 0);
    sa.sort((a, b) => key[a] - key[b]);
    const next = new Int32Array(n);
    for (let j = 1; j < n; j++) next[sa[j]] = next[sa[j - 1]] + (key[sa[j]] !== key[sa[j - 1]] ? 1 : 0);
    rank = next;
    if (rank[sa[n - 1]] === n - 1) return sa;
  }
}

function countAll(text, queries) {
  const sa = buildSA(text), n = sa.length;
  // strict false: first suffix >= p (on |p| chars); true: first suffix > p
  const bound = (p, strict) => {
    let lo = 0, hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const piece = text.substr(sa[mid], p.length);         // a short suffix compares as smaller
      if (piece < p || (strict && piece === p)) lo = mid + 1; else hi = mid;
    }
    return lo;
  };
  return queries.map((p) => bound(p, true) - bound(p, false));
}` }, { lang: 'cpp', code: `
class Solution {
    string t;
    vector<int> sa;

    void build() {                                   // prefix doubling, packed (rank, next rank) keys
        int n = t.size();
        sa.resize(n);
        iota(sa.begin(), sa.end(), 0);
        vector<int> rank(n), next(n);
        vector<long long> key(n);
        for (int i = 0; i < n; i++) rank[i] = t[i];
        long long base = max(n, 128) + 2;
        for (int k = 1;; k <<= 1) {
            for (int i = 0; i < n; i++) key[i] = rank[i] * base + (i + k < n ? rank[i + k] + 1 : 0);
            sort(sa.begin(), sa.end(), [&](int a, int b) { return key[a] < key[b]; });
            next[sa[0]] = 0;
            for (int j = 1; j < n; j++) next[sa[j]] = next[sa[j - 1]] + (key[sa[j]] != key[sa[j - 1]]);
            rank = next;
            if (rank[sa[n - 1]] == n - 1) break;
        }
    }

    // strict false: first suffix >= p (on |p| chars); true: first suffix > p
    int bound(const string& p, bool strict) const {
        int lo = 0, hi = sa.size();
        while (lo < hi) {
            int mid = (lo + hi) / 2;
            int c = t.compare(sa[mid], p.size(), p);  // a short suffix compares as smaller
            if (c < 0 || (strict && c == 0)) lo = mid + 1; else hi = mid;
        }
        return lo;
    }

public:
    vector<int> countAll(string text, vector<string> queries) {
        t = text;
        build();
        vector<int> ans;
        for (const string& p : queries) ans.push_back(bound(p, true) - bound(p, false));
        return ans;
    }
};` }],
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
    code: [{ lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `class LcpToolkit:
    @staticmethod
    def build_sa(s):                       # O(N log^2 N) prefix doubling
        n = len(s)
        sa = list(range(n))
        rank = [ord(ch) for ch in s]
        k = 1
        while n > 1:
            r, step = rank, k
            def key(i):
                return (r[i], r[i + step] if i + step < n else -1)
            sa.sort(key=key)
            tmp = [0] * n
            for i in range(1, n):
                tmp[sa[i]] = tmp[sa[i - 1]] + (1 if key(sa[i - 1]) < key(sa[i]) else 0)
            rank = tmp
            if rank[sa[-1]] == n - 1:
                break
            k <<= 1
        return sa

    # Kasai: lcp[r] = LCP(suffix SA[r-1], suffix SA[r]); lcp[0] = 0. O(N).
    @staticmethod
    def kasai(s, sa):
        n = len(s)
        rank = [0] * n
        for r, i in enumerate(sa):
            rank[i] = r
        lcp = [0] * n
        h = 0
        for i in range(n):                 # TEXT order, not sorted order
            if rank[i] == 0:               # no neighbour above
                h = 0
                continue
            j = sa[rank[i] - 1]            # sorted neighbour above suffix i
            while i + h < n and j + h < n and s[i + h] == s[j + h]:
                h += 1
            lcp[rank[i]] = h
            if h > 0:
                h -= 1                     # the "bookmark slips back one" step
        return lcp

    @staticmethod
    def longest_repeated(s):
        sa = LcpToolkit.build_sa(s)
        lcp = LcpToolkit.kasai(s, sa)
        best, at = 0, 0
        for r in range(1, len(s)):
            if lcp[r] > best:
                best, at = lcp[r], sa[r]
        return s[at:at + best]

    @staticmethod
    def longest_common(a, b):
        s = a + "#" + b                    # '#' must not appear in a or b
        sa = LcpToolkit.build_sa(s)
        lcp = LcpToolkit.kasai(s, sa)
        n1, best, at = len(a), 0, 0
        for r in range(1, len(s)):
            from_a, prev_from_a = sa[r] < n1, sa[r - 1] < n1
            if from_a != prev_from_a and lcp[r] > best:
                best, at = lcp[r], sa[r]
        return s[at:at + best]


s = "banana"
sa = LcpToolkit.build_sa(s)
print(LcpToolkit.kasai(s, sa))                          # [0, 1, 3, 0, 0, 2]
print(LcpToolkit.longest_repeated("banana"))            # ana
print(LcpToolkit.longest_common("xabcdey", "zzbcdq"))   # bcd` }, { lang: 'js', code: `class LcpToolkit {
  static buildSA(s) {                       // O(N log^2 N) prefix doubling
    const n = s.length;
    const sa = Array.from({ length: n }, (_, i) => i);
    let rank = Array.from(s, (ch) => ch.charCodeAt(0));
    for (let k = 1; n > 1; k <<= 1) {
      const r = rank;
      const cmp = (x, y) => (r[x] !== r[y] ? r[x] - r[y]
        : (x + k < n ? r[x + k] : -1) - (y + k < n ? r[y + k] : -1));
      sa.sort(cmp);
      const tmp = new Array(n).fill(0);
      for (let i = 1; i < n; i++) tmp[sa[i]] = tmp[sa[i - 1]] + (cmp(sa[i - 1], sa[i]) < 0 ? 1 : 0);
      rank = tmp;
      if (rank[sa[n - 1]] === n - 1) break;
    }
    return sa;
  }

  // Kasai: lcp[r] = LCP(suffix SA[r-1], suffix SA[r]); lcp[0] = 0. O(N).
  static kasai(s, sa) {
    const n = s.length;
    const rank = new Array(n).fill(0), lcp = new Array(n).fill(0);
    for (let r = 0; r < n; r++) rank[sa[r]] = r;
    let h = 0;
    for (let i = 0; i < n; i++) {                      // TEXT order, not sorted order
      if (rank[i] === 0) { h = 0; continue; }          // no neighbour above
      const j = sa[rank[i] - 1];                       // sorted neighbour above suffix i
      while (i + h < n && j + h < n && s[i + h] === s[j + h]) h++;
      lcp[rank[i]] = h;
      if (h > 0) h--;                                  // the "bookmark slips back one" step
    }
    return lcp;
  }

  static longestRepeated(s) {
    const sa = LcpToolkit.buildSA(s), lcp = LcpToolkit.kasai(s, sa);
    let best = 0, at = 0;
    for (let r = 1; r < s.length; r++) if (lcp[r] > best) { best = lcp[r]; at = sa[r]; }
    return s.substring(at, at + best);
  }

  static longestCommon(a, b) {
    const s = a + "#" + b;                             // '#' must not appear in a or b
    const sa = LcpToolkit.buildSA(s), lcp = LcpToolkit.kasai(s, sa);
    const n1 = a.length;
    let best = 0, at = 0;
    for (let r = 1; r < s.length; r++) {
      const fromA = sa[r] < n1, prevFromA = sa[r - 1] < n1;
      if (fromA !== prevFromA && lcp[r] > best) { best = lcp[r]; at = sa[r]; }
    }
    return s.substring(at, at + best);
  }
}

const s = "banana";
const sa = LcpToolkit.buildSA(s);
console.log(JSON.stringify(LcpToolkit.kasai(s, sa)));            // [0,1,3,0,0,2]
console.log(LcpToolkit.longestRepeated("banana"));               // ana
console.log(LcpToolkit.longestCommon("xabcdey", "zzbcdq"));      // bcd` }, { lang: 'cpp', code: `class LcpToolkit {
public:
    static vector<int> buildSA(const string& s) {          // O(N log^2 N) prefix doubling
        int n = s.size();
        vector<int> sa(n), rank(n), tmp(n);
        iota(sa.begin(), sa.end(), 0);
        for (int i = 0; i < n; i++) rank[i] = (unsigned char)s[i];
        for (int k = 1; n > 1; k <<= 1) {
            auto key = [&](int i) { return make_pair(rank[i], i + k < n ? rank[i + k] : -1); };
            sort(sa.begin(), sa.end(), [&](int x, int y) { return key(x) < key(y); });
            tmp[sa[0]] = 0;
            for (int i = 1; i < n; i++) tmp[sa[i]] = tmp[sa[i - 1]] + (key(sa[i - 1]) < key(sa[i]) ? 1 : 0);
            rank = tmp;
            if (rank[sa[n - 1]] == n - 1) break;
        }
        return sa;
    }

    // Kasai: lcp[r] = LCP(suffix SA[r-1], suffix SA[r]); lcp[0] = 0. O(N).
    static vector<int> kasai(const string& s, const vector<int>& sa) {
        int n = s.size();
        vector<int> rank(n), lcp(n, 0);
        for (int r = 0; r < n; r++) rank[sa[r]] = r;
        int h = 0;
        for (int i = 0; i < n; i++) {                      // TEXT order, not sorted order
            if (rank[i] == 0) { h = 0; continue; }         // no neighbour above
            int j = sa[rank[i] - 1];                       // sorted neighbour above suffix i
            while (i + h < n && j + h < n && s[i + h] == s[j + h]) h++;
            lcp[rank[i]] = h;
            if (h > 0) h--;                                // the "bookmark slips back one" step
        }
        return lcp;
    }

    static string longestRepeated(const string& s) {
        vector<int> sa = buildSA(s), lcp = kasai(s, sa);
        int best = 0, at = 0;
        for (int r = 1; r < (int)s.size(); r++) if (lcp[r] > best) { best = lcp[r]; at = sa[r]; }
        return s.substr(at, best);
    }

    static string longestCommon(const string& a, const string& b) {
        string s = a + "#" + b;                            // '#' must not appear in a or b
        vector<int> sa = buildSA(s), lcp = kasai(s, sa);
        int n1 = a.size(), best = 0, at = 0;
        for (int r = 1; r < (int)s.size(); r++) {
            bool fromA = sa[r] < n1, prevFromA = sa[r - 1] < n1;
            if (fromA != prevFromA && lcp[r] > best) { best = lcp[r]; at = sa[r]; }
        }
        return s.substr(at, best);
    }
};

int main() {
    string s = "banana";
    vector<int> sa = LcpToolkit::buildSA(s);
    for (int x : LcpToolkit::kasai(s, sa)) cout << x << " ";        // 0 1 3 0 0 2
    cout << "\\n" << LcpToolkit::longestRepeated("banana") << "\\n";   // ana
    cout << LcpToolkit::longestCommon("xabcdey", "zzbcdq") << "\\n";  // bcd
}` }] }, { lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `class LcpRmq:
    # O(1) LCP of any two suffixes with a sparse table over lcp[].
    def __init__(self, sa, lcp):
        n = len(sa)
        self.rank = [0] * n
        for r, i in enumerate(sa):
            self.rank[i] = r
        self.sp = [list(lcp)]
        k = 1
        while (1 << k) <= n:
            prev = self.sp[-1]
            half = 1 << (k - 1)
            self.sp.append([min(prev[i], prev[i + half]) for i in range(n - (1 << k) + 1)])
            k += 1

    # LCP of suffixes starting at positions i and j (i != j)
    def lcp(self, i, j):
        a = min(self.rank[i], self.rank[j]) + 1
        b = max(self.rank[i], self.rank[j])
        k = (b - a + 1).bit_length() - 1
        return min(self.sp[k][a], self.sp[k][b - (1 << k) + 1])


# banana: SA = [5,3,1,0,4,2], lcp = [0,1,3,0,0,2]
q = LcpRmq([5, 3, 1, 0, 4, 2], [0, 1, 3, 0, 0, 2])
print(q.lcp(1, 3))   # anana vs ana -> 3
print(q.lcp(5, 1))   # a vs anana   -> 1
print(q.lcp(0, 2))   # banana vs nana -> 0` }, { lang: 'js', code: `class LcpRmq {
  // O(1) LCP of any two suffixes with a sparse table over lcp[].
  constructor(sa, lcp) {
    const n = sa.length;
    this.rank = new Array(n).fill(0);
    for (let r = 0; r < n; r++) this.rank[sa[r]] = r;
    this.sp = [lcp.slice()];
    for (let k = 1; (1 << k) <= n; k++) {
      const prev = this.sp[k - 1], cur = new Array(n - (1 << k) + 1);
      for (let i = 0; i < cur.length; i++) cur[i] = Math.min(prev[i], prev[i + (1 << (k - 1))]);
      this.sp.push(cur);
    }
  }
  // LCP of suffixes starting at positions i and j (i != j)
  lcp(i, j) {
    const a = Math.min(this.rank[i], this.rank[j]) + 1, b = Math.max(this.rank[i], this.rank[j]);
    const k = 31 - Math.clz32(b - a + 1);       // floor(log2(length))
    return Math.min(this.sp[k][a], this.sp[k][b - (1 << k) + 1]);
  }
}

// banana: SA = [5,3,1,0,4,2], lcp = [0,1,3,0,0,2]
const q = new LcpRmq([5, 3, 1, 0, 4, 2], [0, 1, 3, 0, 0, 2]);
console.log(q.lcp(1, 3));   // anana vs ana -> 3
console.log(q.lcp(5, 1));   // a vs anana   -> 1
console.log(q.lcp(0, 2));   // banana vs nana -> 0` }, { lang: 'cpp', code: `class LcpRmq {
    // O(1) LCP of any two suffixes with a sparse table over lcp[].
    vector<vector<int>> sp;
    vector<int> rank;
public:
    LcpRmq(const vector<int>& sa, const vector<int>& lcp) {
        int n = sa.size();
        rank.assign(n, 0);
        for (int r = 0; r < n; r++) rank[sa[r]] = r;
        sp.push_back(lcp);
        for (int k = 1; (1 << k) <= n; k++) {
            vector<int> cur(n - (1 << k) + 1);
            for (int i = 0; i < (int)cur.size(); i++) cur[i] = min(sp[k - 1][i], sp[k - 1][i + (1 << (k - 1))]);
            sp.push_back(cur);
        }
    }
    // LCP of suffixes starting at positions i and j (i != j)
    int lcp(int i, int j) const {
        int a = min(rank[i], rank[j]) + 1, b = max(rank[i], rank[j]);
        int k = 31 - __builtin_clz(b - a + 1);       // floor(log2(length))
        return min(sp[k][a], sp[k][b - (1 << k) + 1]);
    }
};

int main() {
    // banana: SA = [5,3,1,0,4,2], lcp = [0,1,3,0,0,2]
    LcpRmq q({5, 3, 1, 0, 4, 2}, {0, 1, 3, 0, 0, 2});
    cout << q.lcp(1, 3) << "\\n";   // anana vs ana -> 3
    cout << q.lcp(5, 1) << "\\n";   // a vs anana   -> 1
    cout << q.lcp(0, 2) << "\\n";   // banana vs nana -> 0
}` }] }],
    codeTitle: ['Kasai + longest repeated + longest common substring (Java)', 'O(1) LCP of any two suffixes with a sparse table (Java)'],
    viz: {
      title: 'Kasai: the bookmark that only slips back one step',
      input: 'banana',
      inputLabel: 'Lowercase word (max 12 letters)',
      gen: function (input) {
        var s = readWord(input, 'banana', 12, 'the word');
        if (s.length < 2) throw new Error('Type at least 2 letters so there is a neighbour to compare (example: banana).');
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
      brute: { why: `<p>For every length L from long to short, put all substrings of length L in a hash set → O(N<sup>2</sup>) substrings, each costing O(N) to hash/copy → O(N<sup>3</sup>) ≈ 2.7·10<sup>13</sup>. The waste: re-hashing the same characters for every L and every start.</p>`, code: { lang: 'java', code: `
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
        }`, alt: [{ lang: 'python', code: String.raw`
class Brute:
    def longestDupSubstring(self, s: str) -> str:
        n = len(s)
        for length in range(n - 1, 0, -1):
            seen = set()
            for i in range(n - length + 1):
                sub = s[i:i + length]                 # O(len) copy each time
                if sub in seen:
                    return sub
                seen.add(sub)
        return ""` }, { lang: 'js', code: String.raw`
function longestDupSubstring(s) {
  const n = s.length;
  for (let len = n - 1; len >= 1; len--) {
    const seen = new Set();
    for (let i = 0; i + len <= n; i++) {
      const sub = s.substring(i, i + len);            // O(len) copy each time
      if (seen.has(sub)) return sub;
      seen.add(sub);
    }
  }
  return "";
}` }, { lang: 'cpp', code: String.raw`
class Brute {
public:
    string longestDupSubstring(string s) {
        int n = s.size();
        for (int len = n - 1; len >= 1; len--) {
            unordered_set<string> seen;
            for (int i = 0; i + len <= n; i++) {
                string sub = s.substr(i, len);        // O(len) copy each time
                if (!seen.insert(sub).second) return sub;
            }
        }
        return "";
    }
};` }] } },
      mcq: { q: 'After building SA and the LCP array, the longest duplicated substring has length…', options: ['the minimum LCP', 'the maximum LCP', 'Σ LCP', 'N − max LCP'], answer: 1, explain: 'A repeated substring is a common prefix of two suffixes; the longest such common prefix is attained by some sorted neighbours, i.e. max lcp.' },
      hints: [`<p>A substring occurs twice ⇔ it is a common prefix of two different suffixes. The longest common prefix of any two suffixes is achieved by two suffixes that are <b>neighbours</b> in sorted order.</p>`, `<p>Build the suffix array, then the LCP array with Kasai. Answer = max lcp[r], starting at SA[r]. (Alternative: binary search on length + Rabin–Karp with a strong hash.)</p>`, `<p>Edge cases: all lcp = 0 → return "". Use the O(N log<sup>2</sup> N) builder — N = 3·10<sup>4</sup> is small. Recipe: SA → rank → Kasai with carried h → track argmax → substring.</p>`],
      tests: { sig: 'string -> string', fn: 'longestDupSubstring', names: { python: 'longestDupSubstring' }, check: "(args, out, exp) => { const s = args[0]; if (typeof out !== 'string' || out.length !== exp.length) return false; return out === '' || s.indexOf(out) !== s.lastIndexOf(out); }", cases: [
        [["banana"],"ana"],
        [["abcd"],""],
        [["aa"],"a"],
        [["ab"],""],
        [["aaa"],"aa"],
        [["abcabc"],"abc"],
        [["aabaab"],"aab"],
        [["zxyzxy"],"zxy"],
        [["abababa"],"ababa"],
        [["aaabbababbbabbbbaaabaababbaabb"],"babbb"],
        [["abababbbaabbababbabbaabababaabba"],"bababb"],
        [["bbbababbbaabbbbbabababaaa"],"bbbabab"],
        [["acbbaaacbcaabbcbccbbcccccacaaaccccbaaabbbbcabcaaacaaabaccbbbacbaccbaabbbbbacccbabcaabbcabaacbcacabbcbcbababcbcacaccacbcbbbbbbcbcabcccacaccccacacabbbbbcabcbaacccacbcccabbbbcccbbbacacbcaacbcbcacbbcaaaabbaaabacccbaccbcccbbbcbaaccbacacabbabcbcbacaccbbbcbcbcaaacbcbcbacbcccbbaabaaaccbccbbcabcbabacaccbaaab"],"bbbbcabc"],
        [["hlrjpxzabypubwssijtgdyrxsetcedxrcerynnfkpjdbpwkpizxklqrbomoztcwhqangdivzylblsrpzlqnjfaoqtqlsmqteeraknnazdspuawtgqzjxrgwtqgoyieyeeojunftgezqtalukqvnqcwntnixrurcejxhdsdwbeoryhypbaskikxuzewinqdaavmugrsagjndtzadzvtyvuxblikdvyihckithdbxpzhywbxzmlstbnfxucrsgnksdsncfilrlwgnnxwmhktrbcshhhbjkybrhepwwylrnpmodwwlcvguztthrheurknhmzhqmveudsjdwhlghghwhgaqypzaedigzpggxqkbmxrvdifoqcxecbigbimyehsqrkdafjynsazywkpgapsippydacuwzziwvgdnwnlohntznpnenskpjnldylzsijpyjtxmayrvcfpkwudgpwllsfteskjjaumxrjrnylrshysfgguxjopxhikcvppaspcvqmabryoidlnmnqaxansaaegunrgqookxyzcvhbnumjddjpmyxmduoxztdaxfppioxbaevfjraabjyerggeosdblilcjteyhsptggwsejjsviwuvnkjkbemllytpcxfgnohwtdoxoffaqbvoeadvxuadkdyjdppbublroeryzsygwuwccadgfzyqfqduerbnsjduuybwqjltbjhnqfsukzbnhiuaxqwiflxhakipnrbgkshacdsfxoqzkyzeiikmuetehdzvgsxmbjbhcjgmtcimjtbjvbgcicsazuxkkkqikutlngviirfetjtsaliruydoqifjzrsfvuyfotazrzgduravhsfwohtzcgrqlxdrdidxowhtxkxuyjjgsqkwjwfksxunplivtfvnbnscpvowgtkjyjluluwjoockbbtnhilivymzahqchwiahxxryhxgdazabcvngvyhncpoizxokpsloarmksyerbiioxwzftjimbeaskzuinxbtdqmjpnlnpirgegysbhluufgglgxyxkbrcjdpeovfsuvnfaateluxxhcohlihufssoqwrifvmaolnmhuaizlzgngxdmwxrajlnhidyzcqxlmycwabtvoghoyzrfhsaufisrszsubuqloryxhzvghclfettucoakdllncvsyouocatpttclkfxfidppwgyiexnwrzcwovnapmjsrvbdsgakbdrsxxehhlysvmevndyfcqawyusjiuvfuxgqxgroxewarxqkujchgpkqigwmgxwqgxcnhgulwebzlcoheusrhuyhzpwjpaplsvpberhftmkfenmenyvnignptfosviwjewdrfdmnfesgcjwgjstezpwccxijhhvnzwmqddyffqnazhjxwxjkzbzvwjlkppdwdfztepylocbqmvgigzojyoiqhpfsohwohysqafvtyjtaufbjwzarqfftwehyrpdgxcccpkbobtouppaymteuqknzajuljcrfkcamafboawaaouhstebcmgplrcksmfbczekwgixejwniydqkcwrkpwruogogsizyjvqaxifdwwkpbtwrwexvjvmnszjywvvjurfokpzsucfrenzagacvnsopowgabnoftbaoxmrcpuglpcpqwglipsrvprrrqgtiozrcdnmxcreoxxicoqjxxsqgspgiiphrzqzkzlbxmfzfuxivgtumtedwpvaerblesdfwqbvcbyqvhqnlmdraucpveikkmtuwaqtzmooelohemmfazaaubyzlzselsyyuzfaslblulhtjhptxxjjqwktzzkrwhpwxjrrcdayrtdoedvlncdnjztnxlrrvlvqtnxxulhxwmreqkzaqwfhrecikakcwsjpjrgwhmpqgddqbpeuvfzwvwjefawdfrerwyyobfbvafvobemjfajktyukvxihlewfojvirqsxcjpmfrsigqgpfldgzvgzuawjrcmjziwmnvnxytdbayvizqyunvtrgbhbljbznrmcvrgihhsbrtqnepwwsxbjbuygntblvzaghjbntvprcuathwempgvsqlrodaymkcnnbfukszumyilmxppmduijazgdnzftxfcbycfyqrxwbetwvivtdxahyycaofrserrixukdsqscxxpckjhbzflfsdcprdfarcroqcvvonmqwsgmgxmymjbjfgtulyknuelrrtyzrydlnrhhtxayqzjfqoqclavtyfgtrvcyulkxmccnpowkmhzgdkmdjzqyfnjvprsjnkfxarnpcwmovhzvnitwtqpxhxiegthyilworkgivllelmlfkospsymuglocitvlqooylwidykxpfzpkiahkmokcmbxahukccppgtoybppcgznuipbevtlwwddxboehyrrhzxvnlmtihntmnsufthoawpbvictdsnbuamwoagxfffswynntyfdpxpihfvcvlhcniufrnd"],"sviw"],
        [[{"$rep":"a","n":30000}],{"$rep":"a","n":29999}],
        [[{"$rep":"ab","n":15000}],{"$rep":"ab","n":14999}],
        [[{"$rep":"abc","n":10000}],{"$rep":"abc","n":9999}]
      ] },
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
        return s[start:start + best] if best else ""` }, { lang: 'js', code: `
function buildSA(s) {
  const n = s.length;
  let rank = new Int32Array(n);
  for (let i = 0; i < n; i++) rank[i] = s.charCodeAt(i);
  const sa = Array.from({ length: n }, (_, i) => i);
  const key = new Float64Array(n);
  const base = Math.max(n, 128) + 2;
  for (let k = 1; ; k <<= 1) {
    for (let i = 0; i < n; i++) key[i] = rank[i] * base + (i + k < n ? rank[i + k] + 1 : 0);
    sa.sort((a, b) => key[a] - key[b]);
    const next = new Int32Array(n);
    for (let j = 1; j < n; j++) next[sa[j]] = next[sa[j - 1]] + (key[sa[j]] !== key[sa[j - 1]] ? 1 : 0);
    rank = next;
    if (rank[sa[n - 1]] === n - 1) return sa;
  }
}

function longestDupSubstring(s) {
  const n = s.length, sa = buildSA(s);
  const rank = new Int32Array(n);
  for (let r = 0; r < n; r++) rank[sa[r]] = r;
  let h = 0, best = 0, at = 0;
  for (let i = 0; i < n; i++) {                         // Kasai: h drops by at most 1 per step
    if (rank[i] === 0) { h = 0; continue; }
    const j = sa[rank[i] - 1];
    while (i + h < n && j + h < n && s[i + h] === s[j + h]) h++;
    if (h > best) { best = h; at = i; }
    if (h > 0) h--;
  }
  return s.substring(at, at + best);
}` }, { lang: 'cpp', code: `
class Solution {
    vector<int> buildSA(const string& s) {
        int n = s.size();
        vector<int> sa(n), rank(n), next(n);
        vector<long long> key(n);
        iota(sa.begin(), sa.end(), 0);
        for (int i = 0; i < n; i++) rank[i] = s[i];
        long long base = max(n, 128) + 2;
        for (int k = 1;; k <<= 1) {
            for (int i = 0; i < n; i++) key[i] = rank[i] * base + (i + k < n ? rank[i + k] + 1 : 0);
            sort(sa.begin(), sa.end(), [&](int a, int b) { return key[a] < key[b]; });
            next[sa[0]] = 0;
            for (int j = 1; j < n; j++) next[sa[j]] = next[sa[j - 1]] + (key[sa[j]] != key[sa[j - 1]]);
            rank = next;
            if (rank[sa[n - 1]] == n - 1) break;
        }
        return sa;
    }

public:
    string longestDupSubstring(string s) {
        int n = s.size();
        vector<int> sa = buildSA(s), rank(n);
        for (int r = 0; r < n; r++) rank[sa[r]] = r;
        int h = 0, best = 0, at = 0;
        for (int i = 0; i < n; i++) {                   // Kasai: h drops by at most 1 per step
            if (rank[i] == 0) { h = 0; continue; }
            int j = sa[rank[i] - 1];
            while (i + h < n && j + h < n && s[i + h] == s[j + h]) h++;
            if (h > best) { best = h; at = i; }
            if (h > 0) h--;
        }
        return s.substr(at, best);
    }
};` }],
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
    code: [{ lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `from collections import deque


class AhoCorasick:
    def __init__(self, patterns):
        self.go = [[-1] * 26]          # complete transition table (after build)
        self.fail = [0]                # failure link of each node
        self.dict_link = [-1]          # nearest node on the fail chain that ends a pattern (-1 if none)
        self.pat_at = [-1]             # pattern index ending at node, or -1 (assumes distinct patterns)
        self.pat_len = [len(p) for p in patterns]
        # 1) trie
        for k, pat in enumerate(patterns):
            v = 0
            for ch in pat:
                c = ord(ch) - 97
                if self.go[v][c] == -1:
                    self.go[v][c] = len(self.go)
                    self.go.append([-1] * 26)
                    self.fail.append(0)
                    self.dict_link.append(-1)
                    self.pat_at.append(-1)
                v = self.go[v][c]
            self.pat_at[v] = k
        # 2) BFS: failure links, dictionary links, complete transitions
        q = deque()
        for c in range(26):
            u = self.go[0][c]
            if u == -1:
                self.go[0][c] = 0                            # stay at root
            else:
                q.append(u)
        while q:
            v = q.popleft()
            for c in range(26):
                u = self.go[v][c]
                if u == -1:
                    self.go[v][c] = self.go[self.fail[v]][c]   # borrow plan B's edge
                    continue
                self.fail[u] = self.go[self.fail[v]][c]
                f = self.fail[u]
                self.dict_link[u] = f if self.pat_at[f] != -1 else self.dict_link[f]
                q.append(u)

    # every match as (patternIndex, startPosition)
    def find_all(self, text):
        res = []
        v = 0
        for i, ch in enumerate(text):
            v = self.go[v][ord(ch) - 97]                      # ONE lookup per character
            u = v if self.pat_at[v] != -1 else self.dict_link[v]
            while u != -1:
                res.append((self.pat_at[u], i - self.pat_len[self.pat_at[u]] + 1))
                u = self.dict_link[u]
        return res


pats = ["he", "she", "his", "hers"]
ac = AhoCorasick(pats)
for k, start in ac.find_all("ahishers"):
    print(pats[k], "at", start)       # his at 1, she at 3, he at 4, hers at 4` }, { lang: 'js', code: `class AhoCorasick {
  constructor(patterns) {
    this.go = [new Array(26).fill(-1)];   // complete transition table (after build)
    this.fail = [0];                      // failure link of each node
    this.dictLink = [-1];                 // nearest node on the fail chain that ends a pattern (-1 if none)
    this.patAt = [-1];                    // pattern index ending at node, or -1 (assumes distinct patterns)
    this.patLen = patterns.map((p) => p.length);
    // 1) trie
    patterns.forEach((pat, k) => {
      let v = 0;
      for (const ch of pat) {
        const c = ch.charCodeAt(0) - 97;
        if (this.go[v][c] === -1) {
          this.go[v][c] = this.go.length;
          this.go.push(new Array(26).fill(-1));
          this.fail.push(0); this.dictLink.push(-1); this.patAt.push(-1);
        }
        v = this.go[v][c];
      }
      this.patAt[v] = k;
    });
    // 2) BFS: failure links, dictionary links, complete transitions
    const queue = [];
    for (let c = 0; c < 26; c++) {
      const u = this.go[0][c];
      if (u === -1) this.go[0][c] = 0;                   // stay at root
      else queue.push(u);
    }
    for (let head = 0; head < queue.length; head++) {    // index instead of shift(): O(1) per pop
      const v = queue[head];
      for (let c = 0; c < 26; c++) {
        const u = this.go[v][c];
        if (u === -1) { this.go[v][c] = this.go[this.fail[v]][c]; continue; }   // borrow plan B's edge
        const f = this.go[this.fail[v]][c];
        this.fail[u] = f;
        this.dictLink[u] = this.patAt[f] !== -1 ? f : this.dictLink[f];
        queue.push(u);
      }
    }
  }

  // every match as [patternIndex, startPosition]
  findAll(text) {
    const res = [];
    let v = 0;
    for (let i = 0; i < text.length; i++) {
      v = this.go[v][text.charCodeAt(i) - 97];           // ONE lookup per character
      for (let u = this.patAt[v] !== -1 ? v : this.dictLink[v]; u !== -1; u = this.dictLink[u])
        res.push([this.patAt[u], i - this.patLen[this.patAt[u]] + 1]);
    }
    return res;
  }
}

const pats = ["he", "she", "his", "hers"];
const ac = new AhoCorasick(pats);
for (const [k, start] of ac.findAll("ahishers"))
  console.log(pats[k] + " at " + start);   // his at 1, she at 3, he at 4, hers at 4` }, { lang: 'cpp', code: `class AhoCorasick {
    vector<array<int, 26>> go;     // complete transition table (after build)
    vector<int> fail;              // failure link of each node
    vector<int> dictLink;          // nearest node on the fail chain that ends a pattern (-1 if none)
    vector<int> patAt;             // pattern index ending at node, or -1 (assumes distinct patterns)
    vector<int> patLen;

    int newNode() {
        array<int, 26> row;
        row.fill(-1);
        go.push_back(row);
        fail.push_back(0);
        dictLink.push_back(-1);
        patAt.push_back(-1);
        return go.size() - 1;
    }

public:
    AhoCorasick(const vector<string>& patterns) {
        newNode();
        // 1) trie
        for (int k = 0; k < (int)patterns.size(); k++) {
            int v = 0;
            for (char ch : patterns[k]) {
                int c = ch - 'a';
                if (go[v][c] == -1) { int u = newNode(); go[v][c] = u; }
                v = go[v][c];
            }
            patAt[v] = k;
            patLen.push_back(patterns[k].size());
        }
        // 2) BFS: failure links, dictionary links, complete transitions
        queue<int> q;
        for (int c = 0; c < 26; c++) {
            int u = go[0][c];
            if (u == -1) go[0][c] = 0;                      // stay at root
            else q.push(u);
        }
        while (!q.empty()) {
            int v = q.front(); q.pop();
            for (int c = 0; c < 26; c++) {
                int u = go[v][c];
                if (u == -1) { go[v][c] = go[fail[v]][c]; continue; }   // borrow plan B's edge
                fail[u] = go[fail[v]][c];
                dictLink[u] = patAt[fail[u]] != -1 ? fail[u] : dictLink[fail[u]];
                q.push(u);
            }
        }
    }

    // every match as {patternIndex, startPosition}
    vector<pair<int, int>> findAll(const string& text) const {
        vector<pair<int, int>> res;
        int v = 0;
        for (int i = 0; i < (int)text.size(); i++) {
            v = go[v][text[i] - 'a'];                        // ONE lookup per character
            for (int u = patAt[v] != -1 ? v : dictLink[v]; u != -1; u = dictLink[u])
                res.push_back({patAt[u], i - patLen[patAt[u]] + 1});
        }
        return res;
    }
};

int main() {
    vector<string> pats = {"he", "she", "his", "hers"};
    AhoCorasick ac(pats);
    for (auto [k, start] : ac.findAll("ahishers"))
        cout << pats[k] << " at " << start << "\\n";   // his at 1, she at 3, he at 4, hers at 4
}` }] }, { lang: 'python', run: true, title: 'Aho–Corasick in Python (runnable)', code: `
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
      constraints: `1 ≤ |text| ≤ 10<sup>6</sup>, 1 ≤ k ≤ 10<sup>5</sup>, Σ|words| ≤ 10<sup>5</sup>, lowercase letters. Answers need a 64-bit integer.`,
      example: `<p>text = <code>"ahishers"</code>, words = [he, she, his, hers] → <b>[1, 1, 1, 1]</b>.</p><p>text = <code>"aaaa"</code>, words = [a, aa, aaa] → <b>[4, 3, 2]</b> (${H.c('y', 'aa')} starts at 0, 1, 2).</p>`,
      brute: { why: `<p>For each word, scan the whole text: O(k · N) = 10<sup>11</sup>. Even listing all matches with plain Aho–Corasick can be O(N · k) on nested words like a, aa, aaa, …, because every position matches many words. The waste: walking the same fail chains again and again.</p>`, code: { lang: 'java', code: `
        class Brute {
            long[] count(String text, String[] words) {
                long[] ans = new long[words.length];
                for (int k = 0; k < words.length; k++) {
                    int from = 0;
                    while ((from = text.indexOf(words[k], from)) != -1) { ans[k]++; from++; }
                }
                return ans;
            }
        }`, alt: [{ lang: 'python', code: String.raw`
def count_occurrences(text, words):
    ans = [0] * len(words)
    for k, w in enumerate(words):
        frm = 0
        while True:
            frm = text.find(w, frm)
            if frm == -1:
                break
            ans[k] += 1
            frm += 1
    return ans` }, { lang: 'js', code: String.raw`
function countOccurrences(text, words) {
  const ans = new Array(words.length).fill(0);
  for (let k = 0; k < words.length; k++) {
    let from = 0;
    while ((from = text.indexOf(words[k], from)) !== -1) { ans[k]++; from++; }
  }
  return ans;
}` }, { lang: 'cpp', code: String.raw`
class Brute {
public:
    vector<long long> countOccurrences(string text, vector<string> words) {
        vector<long long> ans(words.size(), 0);
        for (int k = 0; k < (int)words.size(); k++) {
            size_t from = 0;
            while ((from = text.find(words[k], from)) != string::npos) { ans[k]++; from++; }
        }
        return ans;
    }
};` }] } },
      mcq: { q: 'You counted how many text positions ended in each automaton state. How do you get the count for word w?', options: ['Read the count of w’s node only', 'Sum the counts over w’s subtree in the fail tree', 'Sum counts along the path from root to w in the trie', 'Divide by |w|'], answer: 1, explain: 'A position ends an occurrence of w exactly when w is a suffix of the state’s string, i.e. w’s node is on that state’s fail chain — equivalently the state is in w’s fail-subtree.' },
      hints: [`<p>Scan the text through the automaton and just do <code>cnt[state]++</code> at each position. Don’t walk output chains.</p>`, `<p>w occurs ending at a position iff w’s node is an ancestor of that position’s state in the <b>fail tree</b>. So push counts upward: process nodes in <b>reverse BFS order</b> and do <code>cnt[fail[v]] += cnt[v]</code>.</p>`, `<p>Duplicate words share a node — remember each word’s end node and read <code>cnt[end[k]]</code>. Use 64-bit counts. Recipe: trie → BFS (fail + goto) saving BFS order → scan → reverse-BFS accumulation → read answers.</p>`],
      tests: { sig: 'string string[] -> long[]', fn: 'countOccurrences', cases: [
        [["ahishers",["he","she","his","hers"]],[1,1,1,1]],
        [["aaaa",["a","aa","aaa"]],[4,3,2]],
        [["abc",["d","abcd","abc","c"]],[0,0,1,1]],
        [["aaaa",["a","a","aa","a"]],[4,4,3,4]],
        [["abababa",["aba","bab","ababa","b","a"]],[3,2,2,3,4]],
        [["a",["a"]],[1]],
        [["xyz",["xyz","yz","z","x","y","xy"]],[1,1,1,1,1,1]],
        [["aacccacbaabbcaaabbaccaccbccbaccabbabccabac",["b","ab","ca","abca","cba","acc","babc","c","bbbc","bc"]],[11,5,5,0,2,4,1,16,0,3]],
        [["bcbcaaabbccabbbcccbacacabccaaccbaabbcccbacab",["aa","b","a","baab","caac","c","ba","a","b","cca"]],[4,14,13,1,1,17,3,13,14,2]],
        [["acbaccbbbbccccacacbcbaaccbcaccabcabcbccccbbb",["acc","c","b","acbc","c","bcaa","ccc","ba","b","bbcb"]],[3,21,14,1,21,0,4,2,14,0]],
        [[{"$rep":"a","n":1000000},["a","aa","aaa","aaaa","aaaaa","aaaaaa","aaaaaaa","aaaaaaaa","aaaaaaaaa","aaaaaaaaaa","aaaaaaaaaaa","aaaaaaaaaaaa","aaaaaaaaaaaaa","aaaaaaaaaaaaaa","aaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]],[1000000,999999,999998,999997,999996,999995,999994,999993,999992,999991,999990,999989,999988,999987,999986,999985,999984,999983,999982,999981,999980,999979,999978,999977,999976,999975,999974,999973,999972,999971,999970,999969,999968,999967,999966,999965,999964,999963,999962,999961,999960,999959,999958,999957,999956,999955,999954,999953,999952,999951,999950,999949,999948,999947,999946,999945,999944,999943,999942,999941,999940,999939,999938,999937,999936,999935,999934,999933,999932,999931,999930,999929,999928,999927,999926,999925,999924,999923,999922,999921,999920,999919,999918,999917,999916,999915,999914,999913,999912,999911,999910,999909,999908,999907,999906,999905,999904,999903,999902,999901]],
        [[{"$rep":"a","n":1000000},{"$rep":"a","n":100000}],{"$rep":1000000,"n":100000}],
        [[{"$rep":"abcabd","n":150000},["dabcabdabc","bcabda","bdabcab","abdabc","cabdabcab","cabd","cabdabca","dabcabda","abdabcab","bcabdabca","bdabcabda","bcabdabca","bcabda","abcabdabca","bdabcabdabc","bdabcabd","bdab","cabdabc","cabda","abdabcabdabc","abdabcabdabc","dab","abcabda","bdabc","cabda","abcabdabca","abcabdabcab","bdab","bcabdab","abd","abcabdabca","bdabcabdab","bda","abcabdabc","dabcabdabca","abca","dabcabdabc","abdabcabda","abdabcab","abca","abcabdabc","cabdabca","abdabca","abdabcabdabc","dabcabda","bdabcabdab","bdabcabda","bdabcabdab","cabd","abda","cabdab","bdabcabda","bcabd","bcab","abd","cabdabcab","bdabcabda","bcabdab","cabdab","abcab","bdabcabdabc","abcabd","dabc","abdabcabdabc","cabdabca","dabcab","dab","dabcab","abdabcabdab","dabcabdab","bdabcabd","dab","abdabcabd","cab","abcabdabca","bdabcabda","dab","dabca","cabdabcabda","cabda","bcab","dabcabdabc","dabcabd","bca","bdabcabda","bcabdab","dabc","bcab","bdabca","bcabdab","bcabdabca","bcabdabcabda","bcabd","abdabcabdab","cabdabcabdab","abdabcab","abd","cabdabca","bdabcabdab","abdabcab","abcab","bcabdabcab","cabdabca","abcabd","dabcabdab","cabd","dabcabd","abd","abdabc","dabc","bdabcabdab","cabdabcab","abcabda","bcabdab","bcabdabcab","bcabdabcabd","dabcabda","abdabcabdab","bdabcabdabca","abd","bdabcabda","bca","bca","abdabcabdabc","abdabcabdab","abdabcabd","abca","dabca","bdabcabda","cabdabcabd","cabda","bdabcabdabca","bcabda","bcabdabcabd","abdabca","abcabdab","dabcabdabcab","cabdabcabdab","bdabcabdabc","abd","bdabcabd","bdabcabdabca","cabd","cab","abcabd","bdabcabdab","cabdabcabd","bcab","dabcab","bcabdabc","abc","cabdabcabdab","dabcabdabca","bdabcabd","bdabca","abcabdabc","cabda","bdabc","abca","cabdabcabd","abc","abca","abdabc","abdabcabdabc","bcabda","cab","bdabcabdab","abcabd","abcabda","bcabdabcabda","bdabc","bdabcab","abcabd","abdabcabdabc","abdabcabd","bdabc","dabcabdabca","bda","bcabdabca","bdabcabdabc","abcab","cabdab","bcabdab","abca","bdabcabda","dab","bcabd","abcabdabca","bcabd","dabcabda","abdabcabd","abcab","dabcab","bdab","bcabda","abdabcabdab","dabcab","bcabdabcabd","bca","abdabcab","bdabcabdab","cab","abdabcabdabc","abdabcabda","cabd","dabcabdabc","abcabd","bdabcabdabca","bdabcabd","abdabc","dab","bdab","bdab","abdabcab","abdab","cabdabca","bdabcabda","dabca","dabc","cabdabcabdab","abdabcab","abdabcabd","bdabc","abcabdabca","bca","dabca","cab","cabd","cabdabcabd","bdabc","abcabdabcab","abdab","bcabdabcabd","abdabc","cabdabcab","abcabdab","bda","abcabdab","cabd","abdabcabda","dab","dabcabdab","cabdabc","bcabdabcabda","dabc","abca","cabdabca","bcabda","dabcabdabca","bcabd","abcabda","bcabdabcab","bcabdabcabda","abcabdabcab","bdabcabdabca","bcabdabcabda","abdabcabdab","abdabcab","abd","abdabcabdab","abcab","abcabd","dabcabdabca","abd","abdabcabd","bcabdabcab","bdabcabda","bcabdabca","abdab","cabd","dabcab","bda","cabdabcabdab","dabcabdabc","abdabca","dabcabdabc","dabcabdabca","bcabdabca","bcabdabca","abdab","abdabca","abdab","abdabcab","bdab","abca","cabdab","bcabdabc","dabcabdabca","bcabdabcabd","abcabdabc","abdabcabdab","dabca","cabdabcabdab","abca","dab","bdab","abc","bdabcabdabca","cabdabcabdab","abdabc","bddcbdbca","dbadbddbcad","adb","bbbabddc","baadcbd","dccadad","dcccdccb","cdbcdd","dbddabdbdc","cbb","bbcdcc","adacabaccdbb","ddadab","dbacaccbad","ccdcddbcb","daabbdbbb","addbdaacaab","babcb","bcccdbcdca","aaacd","dbabddcd","ddbad","abccaaa","bcccbcad","abddbacbcaa","aaddbcad","dddddcaa","adaadbccc","caaaa","abbdd","cdbacabcbac","cbacd","cdc","dabadb","bdccba","caabdbbcd","bdcabbbaa","daabacad","caada","dca","bddcccdb","bbccbbdda","dcbababd","bdabbbd","dbabbd","caddadbbdcda","dcbadbdacbda","cdd","abdbba","bbbb","ddad","cba","adc","cac","babaabcabcab","dad","adcdcb","aabbcadda","bccabcacbd","bdddb","accaaaa","cacdbbcdbd","ddbbcbacca","baacbccd","bdacaccdddc","dbcdaabcc","bcbba","bdbcdcdc","adacdab","bccabd","dacabaaccb","adcdacbdbc","bbccacbccad","daadcdac","bddac","aca","dddddd","addacbb","cdcdac","adaaacbbbbbc","cccbccbb","daababdbdd","daabcbccaba","cad","bad","ababbbaa","ddddcdcbc","dbbcabdc","dbbdddc","acdcacaa","daddd","bbdcbb","bbd","dabb","cacbcdaaaa","ccaacacd","aabdab","cacdba","cbaaadbdd","bbacbcbccaca","bdcbbbb","bddc","cbdabbbcb","ccddcbc","cdcbaadcca","dbbadc","ccccddcbb","bdaaacbcddcb","acadbcacc","caccaddabbbd","bac","dcbcc","bdabbbbcabcc","cacdbadc","babacbddbcc","addcddbdaa","aadbdbc","ccaddcbadbbb","aaddaddaad","bcbaddda","aaaa","addbcbcaa","bbdaabcd","ddabddda","dbccdbdcb","bcaaacdd","adbbdacb","acadddcbca","baddabbadd","aabdcdbad","cdbaa","adcbb","caababa","cadaccbbca","bcaba","dbbadcbaccb","babbbcaad","dddcdccb","bbdbc","daabcddbcb","dcbbaac","bddacabbbbd","bcbbadd","ccbac","daccbdb","cabcdabdab","adadcdccadc","dcacbbbcddc","acddda","daa","addacb","bddddcacbb","cbdabcad","dccc","baadc","ccccc","bbdcac","ccadbcadbaa","aabbb","cdcd","bab","dccdbabdbc","bacd","cccccdbd","bbdbba","cadadacaacd","dccabbaad","bbddbcbdadd","ccccdbbc","daaacbcdab","bdd","babdabb","cccbdadb","cbba","ddbc","acbdcbdda","dadbcad","ddddaacddba","bcb","bcccbbddccd","bbdda","ddacdbbbddda","bda","dcaac","cbbbbcccdd","acbcacc","bccddda","caac","bbcab","bcbdabddaa","dbabbdbbd","ccacacab","bdbdbddd","daab","dddadbcdc","cabcabd","baaabaabbbd","abdada","adba","cdabcddccb","cbaca","ddcdbaddbc","ddcbaadd","bbbabcbbddab","cdaacd","bbccddca","aaabdba","acbd","ddd","cdbb","ddcddbabbcaa","aac","cbccc","bbdabccdcbd","cccbba","bbc","aadacc","abbaacaccbaa","cdaadbcaadb","cdd","dddbabcdadcd","ddacacd","add","ccdbbcdbda","cdbadaddcaaa","dabdcdbcbc","daa","acdbab","dcaadd","bbb","ccbacacbdc","cbdab","bcbbdbbadc","bdcdabcbab","addbabdccda","cdcbac","dccd","bcdcddbaad","badadddddb","abccccccbc","acbdcccbd","dddddabdb","adcdabacd","abbbc","abbc","adbd","baabccd","dbbabbcddbdc","acbbdadacbb","accbbdadbcd","daacadaaccc","ddaaabdc","daacc","dbcaadccb","ddbbac","cadbbd","dbd","dabbbbccdab","baacbdbdb","dcda","baadbbcb","caaabddadbbb","acc","bdaacdabada","cdbcbbcdcb","bddcdacbb","babbb","dcdccca","ccacdcc","daabc","bdabdacacbc","ccacbdcbbbd","dbcc","bccda","dddbaa","abbadcbdbb","bdbac","aadcabbda","aacdcbcbdbc","bcbaabada","cddaaa","dca","daacbdcadca","cadadcac","acbbba","cacbdcabbad","bbbaab","acddb","bacabaaabb","ccddcaccaaa","adaccadaa","bbbb","dbdacaadd","dacadd","bbadadcc","adab","bacbc","cab","ddabbc","bbcc"]],[149998,149999,149999,149999,149999,150000,149999,149998,149999,149999,149998,149999,149999,149999,149998,149999,149999,149999,149999,149998,149998,149999,149999,149999,149999,149999,149999,149999,149999,150000,149999,149998,149999,149999,149998,150000,149998,149998,149999,150000,149999,149999,149999,149998,149998,149998,149998,149998,150000,149999,149999,149998,150000,150000,150000,149999,149998,149999,149999,150000,149998,150000,149999,149998,149999,149999,149999,149999,149998,149998,149999,149999,149999,150000,149999,149998,149999,149999,149998,149999,150000,149998,149999,150000,149998,149999,149999,150000,149999,149999,149999,149998,150000,149998,149998,149999,150000,149999,149998,149999,150000,149999,149999,150000,149998,150000,149999,150000,149999,149999,149998,149999,149999,149999,149999,149999,149998,149998,149998,150000,149998,150000,150000,149998,149998,149999,150000,149999,149998,149999,149999,149998,149999,149999,149999,149999,149998,149998,149998,150000,149999,149998,150000,150000,150000,149998,149999,150000,149999,149999,150000,149998,149998,149999,149999,149999,149999,149999,150000,149999,150000,150000,149999,149998,149999,150000,149998,150000,149999,149998,149999,149999,150000,149998,149999,149999,149998,149999,149999,149998,150000,149999,149999,150000,149998,149999,150000,149999,150000,149998,149999,150000,149999,149999,149999,149998,149999,149999,150000,149999,149998,150000,149998,149998,150000,149998,150000,149998,149999,149999,149999,149999,149999,149999,149999,149999,149998,149999,149999,149998,149999,149999,149999,149999,150000,149999,150000,150000,149999,149999,149999,149999,149999,149999,149999,149999,149999,149999,150000,149998,149999,149998,149999,149998,149999,150000,149999,149999,149998,150000,149999,149999,149998,149999,149998,149998,149998,149999,150000,149998,150000,150000,149998,150000,149999,149999,149998,149999,149999,150000,149999,149999,149998,149998,149999,149998,149998,149999,149999,149999,149999,149999,149999,149999,150000,149999,149999,149998,149999,149999,149998,149999,149998,150000,149999,149999,150000,149998,149998,149999,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,149999,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,150000,0,0]]
      ] },
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

print(count_occurrences("aaaa", ["a", "aa", "aaa"]))   # [4, 3, 2]` }, { lang: 'js', code: `
function countOccurrences(text, words) {
  let cap = 1;
  for (const w of words) cap += w.length;
  const go = new Int32Array(cap * 26).fill(-1);
  const fail = new Int32Array(cap);
  const end = [];
  let nodes = 1;
  for (const w of words) {                                   // 1) trie
    let v = 0;
    for (let i = 0; i < w.length; i++) {
      const c = w.charCodeAt(i) - 97;
      if (go[v * 26 + c] === -1) go[v * 26 + c] = nodes++;
      v = go[v * 26 + c];
    }
    end.push(v);                                             // duplicates share the node
  }
  const order = new Int32Array(nodes);                       // 2) BFS order, fail links, full goto table
  let head = 0, tail = 0;
  order[tail++] = 0;
  while (head < tail) {
    const v = order[head++];
    for (let c = 0; c < 26; c++) {
      const u = go[v * 26 + c];
      if (u === -1) go[v * 26 + c] = v === 0 ? 0 : go[fail[v] * 26 + c];
      else { fail[u] = v === 0 ? 0 : go[fail[v] * 26 + c]; order[tail++] = u; }
    }
  }
  const cnt = new Float64Array(nodes);                       // 3) one visit per text position
  let v = 0;
  for (let i = 0; i < text.length; i++) { v = go[v * 26 + text.charCodeAt(i) - 97]; cnt[v]++; }
  for (let i = tail - 1; i > 0; i--) cnt[fail[order[i]]] += cnt[order[i]];   // 4) push up the fail tree
  return end.map((e) => cnt[e]);
}` }, { lang: 'cpp', code: `
class Solution {
public:
    vector<long long> countOccurrences(string text, vector<string> words) {
        int cap = 1;
        for (const string& w : words) cap += w.size();
        vector<array<int, 26>> go(cap);
        for (auto& row : go) row.fill(-1);
        vector<int> fail(cap, 0), end;
        int nodes = 1;
        for (const string& w : words) {                       // 1) trie
            int v = 0;
            for (char ch : w) {
                int c = ch - 'a';
                if (go[v][c] == -1) go[v][c] = nodes++;
                v = go[v][c];
            }
            end.push_back(v);                                 // duplicates share the node
        }
        vector<int> order;                                    // 2) BFS order, fail links, full goto table
        order.push_back(0);
        for (size_t head = 0; head < order.size(); head++) {
            int v = order[head];
            for (int c = 0; c < 26; c++) {
                int u = go[v][c];
                if (u == -1) go[v][c] = (v == 0) ? 0 : go[fail[v]][c];
                else { fail[u] = (v == 0) ? 0 : go[fail[v]][c]; order.push_back(u); }
            }
        }
        vector<long long> cnt(nodes, 0);                      // 3) one visit per text position
        int v = 0;
        for (char ch : text) { v = go[v][ch - 'a']; cnt[v]++; }
        for (int i = (int)order.size() - 1; i > 0; i--) cnt[fail[order[i]]] += cnt[order[i]];   // 4) push up
        vector<long long> ans;
        for (int e : end) ans.push_back(cnt[e]);
        return ans;
    }
};` }],
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
      <p>Compute hashes with two independent (B<sub>1</sub>, M<sub>1</sub>) and (B<sub>2</sub>, M<sub>2</sub>) and compare the <b>pair</b> (or pack it into one 64-bit integer: <code>h1 · 2<sup>32</sup> + h2</code>). Collision chance multiplies: ≈ 1/(M<sub>1</sub>M<sub>2</sub>). Alternative: a single modulus <b>M = 2<sup>61</sup> − 1</b> with 128-bit multiplication (<code>Math.multiplyHigh</code> in Java, <code>unsigned __int128</code> in C++, <code>BigInt</code> in JavaScript, plain integers in Python) — one hash, ~10<sup>18</sup> range, and reduction is just shifts and adds.</p>
      <h4>4. Anti-hash tests — how hashes get broken on purpose</h4>
      ${H.table(['Weak choice', 'Attack', 'Fix'], [
        ['Modulus 2<sup>64</sup> (just let a 64-bit integer overflow)', H.c('r', 'Thue–Morse strings of length 2048 collide for <b>every</b> odd base'), 'use a prime modulus'],
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
    code: [{ lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `import random


class StringHasher:
    # Double polynomial hash with RANDOM bases (anti-hash safe for interview/contest use).
    M1, M2 = 1_000_000_007, 998_244_353

    def __init__(self, s):
        b1 = random.randrange(256, self.M1 - 256)     # random at run time -> unknown to an attacker
        b2 = random.randrange(256, self.M2 - 256)
        n = len(s)
        self.p1, self.p2 = [1] * (n + 1), [1] * (n + 1)
        self.h1, self.h2 = [0] * (n + 1), [0] * (n + 1)
        for i, ch in enumerate(s):
            v = ord(ch) + 1                           # never map a char to 0
            self.p1[i + 1] = self.p1[i] * b1 % self.M1
            self.p2[i + 1] = self.p2[i] * b2 % self.M2
            self.h1[i + 1] = (self.h1[i] * b1 + v) % self.M1
            self.h2[i + 1] = (self.h2[i] * b2 + v) % self.M2

    # hash of s[l:r] packed into one int: (h1 << 32) | h2
    def get(self, l, r):
        x = (self.h1[r] - self.h1[l] * self.p1[r - l]) % self.M1
        y = (self.h2[r] - self.h2[l] * self.p2[r - l]) % self.M2
        return (x << 32) | y

    def equal(self, a, b, length):
        return self.get(a, a + length) == self.get(b, b + length)


h = StringHasher("abcabcx")
print(h.equal(0, 3, 3))   # "abc" vs "abc" -> True
print(h.equal(0, 4, 3))   # "abc" vs "bcx" -> False` }, { lang: 'js', code: `class StringHasher {
  // Double polynomial hash with RANDOM bases (anti-hash safe for interview/contest use).
  // Products reach ~1e18, beyond 2^53, so the arithmetic uses BigInt.
  constructor(s) {
    const M1 = 1000000007n, M2 = 998244353n;
    const rnd = (m) => 256n + BigInt(Math.floor(Math.random() * Number(m - 512n)));
    const b1 = rnd(M1), b2 = rnd(M2);          // random at run time -> unknown to an attacker
    const n = s.length;
    this.M1 = M1; this.M2 = M2;
    this.p1 = [1n]; this.p2 = [1n]; this.h1 = [0n]; this.h2 = [0n];
    for (let i = 0; i < n; i++) {
      const v = BigInt(s.charCodeAt(i) + 1);   // never map a char to 0
      this.p1.push(this.p1[i] * b1 % M1);
      this.p2.push(this.p2[i] * b2 % M2);
      this.h1.push((this.h1[i] * b1 + v) % M1);
      this.h2.push((this.h2[i] * b2 + v) % M2);
    }
  }

  // hash of s[l, r) packed into one BigInt: (h1 << 32) | h2
  get(l, r) {
    const x = ((this.h1[r] - this.h1[l] * this.p1[r - l]) % this.M1 + this.M1) % this.M1;
    const y = ((this.h2[r] - this.h2[l] * this.p2[r - l]) % this.M2 + this.M2) % this.M2;
    return (x << 32n) | y;
  }

  equal(a, b, len) { return this.get(a, a + len) === this.get(b, b + len); }
}

const h = new StringHasher("abcabcx");
console.log(h.equal(0, 3, 3));   // "abc" vs "abc" -> true
console.log(h.equal(0, 4, 3));   // "abc" vs "bcx" -> false` }, { lang: 'cpp', code: `class StringHasher {
    // Double polynomial hash with RANDOM bases (anti-hash safe for interview/contest use).
    static constexpr long long M1 = 1'000'000'007LL, M2 = 998'244'353LL;
    vector<long long> p1, p2, h1, h2;

public:
    StringHasher(const string& s) {
        mt19937_64 rng(chrono::steady_clock::now().time_since_epoch().count());   // time-seeded -> unknown to an attacker
        long long b1 = 256 + rng() % (M1 - 512), b2 = 256 + rng() % (M2 - 512);
        int n = s.size();
        p1.assign(n + 1, 1); p2.assign(n + 1, 1); h1.assign(n + 1, 0); h2.assign(n + 1, 0);
        for (int i = 0; i < n; i++) {
            long long v = (unsigned char)s[i] + 1;              // never map a char to 0
            p1[i + 1] = p1[i] * b1 % M1;
            p2[i + 1] = p2[i] * b2 % M2;
            h1[i + 1] = (h1[i] * b1 + v) % M1;
            h2[i + 1] = (h2[i] * b2 + v) % M2;
        }
    }

    // hash of s[l, r) packed into one 64-bit value: (h1 << 32) | h2
    long long get(int l, int r) const {
        long long x = (h1[r] - h1[l] * p1[r - l] % M1 + M1) % M1;
        long long y = (h2[r] - h2[l] * p2[r - l] % M2 + M2) % M2;
        return (x << 32) | y;
    }

    bool equal(int a, int b, int len) const { return get(a, a + len) == get(b, b + len); }
};

int main() {
    StringHasher h("abcabcx");
    cout << boolalpha << h.equal(0, 3, 3) << "\\n";   // "abc" vs "abc" -> true
    cout << h.equal(0, 4, 3) << "\\n";                // "abc" vs "bcx" -> false
}` }] }, { lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `import random

MOD = (1 << 61) - 1


def mul_mod(a, b):                 # Python ints are unbounded, so no 128-bit trick is needed
    return a * b % MOD


base = 1_000_003 + random.randrange(1 << 30)   # random base at runtime
s = "hashing"
h = 0
for ch in s:
    h = (mul_mod(h, base) + ord(ch) + 1) % MOD
print("hash computed:", 0 <= h < MOD)` }, { lang: 'js', code: `// Single hash modulo 2^61 - 1. Number is exact only to 2^53, so use BigInt (arbitrary precision).
const MOD = (1n << 61n) - 1n;
const mulMod = (a, b) => (a * b) % MOD;           // a, b < 2^61

const base = 1000003n + BigInt(Math.floor(Math.random() * 2 ** 30));   // random base at runtime
const s = "hashing";
let h = 0n;
for (const ch of s) h = (mulMod(h, base) + BigInt(ch.charCodeAt(0)) + 1n) % MOD;
console.log("hash computed: " + (h >= 0n && h < MOD));` }, { lang: 'cpp', code: `class Mersenne61 {
public:
    // Single hash modulo 2^61 - 1 using a 128-bit product. ~2.3e18 possible values.
    static constexpr unsigned long long MOD = (1ULL << 61) - 1;

    static unsigned long long mulMod(unsigned long long a, unsigned long long b) {   // a, b < 2^61
        unsigned __int128 prod = (unsigned __int128)a * b;
        unsigned long long r = (unsigned long long)(prod & MOD) + (unsigned long long)(prod >> 61);   // 2^61 = 1 (mod MOD)
        r = (r & MOD) + (r >> 61);
        return r >= MOD ? r - MOD : r;
    }
};

int main() {
    mt19937_64 rng(chrono::steady_clock::now().time_since_epoch().count());
    unsigned long long base = 1'000'003ULL + rng() % (1ULL << 30);   // random base at runtime
    string s = "hashing";
    unsigned long long h = 0;
    for (char c : s) h = (Mersenne61::mulMod(h, base) + (unsigned char)c + 1) % Mersenne61::MOD;
    cout << "hash computed: " << boolalpha << (h < Mersenne61::MOD) << "\\n";
}` }] }, { lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `# Shows why "let the integer overflow" (mod 2^64) is NOT a hash: Thue-Morse strings collide for ANY odd base.
# Python ints never overflow, so the wrap-around is made explicit with a mask.
MASK = (1 << 64) - 1
n = 1 << 11                                         # 2048 characters
s = ''.join('b' if bin(i).count('1') % 2 else 'a' for i in range(n))     # Thue-Morse sequence
t = ''.join('a' if ch == 'b' else 'b' for ch in s)                       # its complement
for base in (31, 131, 1_000_003, 0x9E3779B97F4A7C15 | 1):
    hs = ht = 0
    for i in range(n):
        hs = (hs * base + ord(s[i])) & MASK
        ht = (ht * base + ord(t[i])) & MASK
    print("base", base, ": equal hash =", hs == ht, ", equal strings =", s == t)` }, { lang: 'js', code: `// Shows why "let the integer overflow" (mod 2^64) is NOT a hash: Thue-Morse strings collide for ANY odd base.
// BigInt.asUintN(64, x) reproduces the wrap-around of a 64-bit unsigned integer.
const bitCount = (x) => { let c = 0; for (; x; x &= x - 1) c++; return c; };
const n = 1 << 11;                                  // 2048 characters
let s = "", t = "";
for (let i = 0; i < n; i++) {
  const bit = bitCount(i) % 2 === 1;                // Thue-Morse sequence
  s += bit ? "b" : "a";
  t += bit ? "a" : "b";                             // its complement
}
for (const base of [31n, 131n, 1000003n, 0x9E3779B97F4A7C15n | 1n]) {
  let hs = 0n, ht = 0n;
  for (let i = 0; i < n; i++) {
    hs = BigInt.asUintN(64, hs * base + BigInt(s.charCodeAt(i)));
    ht = BigInt.asUintN(64, ht * base + BigInt(t.charCodeAt(i)));
  }
  console.log("base " + base + ": equal hash = " + (hs === ht) + ", equal strings = " + (s === t));
}` }, { lang: 'cpp', code: `int main() {
    // Shows why "let unsigned long long overflow" (mod 2^64) is NOT a hash: Thue-Morse strings collide for ANY odd base.
    int n = 1 << 11;                                         // 2048 characters
    string s, t;
    for (int i = 0; i < n; i++) {
        bool bit = __builtin_popcount(i) % 2 == 1;           // Thue-Morse sequence
        s += bit ? 'b' : 'a';
        t += bit ? 'a' : 'b';                                // its complement
    }
    for (unsigned long long base : {31ULL, 131ULL, 1'000'003ULL, 0x9E3779B97F4A7C15ULL | 1}) {
        unsigned long long hs = 0, ht = 0;                   // unsigned: wrap-around is defined (signed overflow is UB)
        for (int i = 0; i < n; i++) { hs = hs * base + s[i]; ht = ht * base + t[i]; }
        cout << "base " << base << ": equal hash = " << boolalpha << (hs == ht)
             << ", equal strings = " << (s == t) << "\\n";
    }
}` }] }, { lang: 'python', run: true, title: 'Anti-hash demo in Python (runnable)', code: `
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
      <p><b>Engineering.</b> Products of two values &lt; 2<sup>30</sup> fit in a signed 64-bit integer (Java <code>long</code>, C++ <code>long long</code>), but not in a JavaScript <code>Number</code> (exact only to 2<sup>53</sup>) — use <code>BigInt</code> there. For M ≈ 2<sup>61</sup> you need a 128-bit product: <code>Math.multiplyHigh</code> in Java, <code>unsigned __int128</code> in C++, <code>BigInt</code> in JavaScript; Python needs nothing special. Keep the prefix arrays as 64-bit arrays, precompute powers, and pack two 30-bit hashes into one 64-bit integer for hash-set keys (avoids allocating pair objects). Real-world cousins: rsync and content-defined chunking (Rabin fingerprints / Gear hash) in backup systems and dedup storage; Python, Rust and Ruby use <b>keyed SipHash</b> for strings so web requests cannot flood hash tables (Python since 3.4, with <code>PYTHONHASHSEED</code> randomised per process).</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants love writing Rabin–Karp that relies on 64-bit overflow or a single fixed <code>MOD = 1e9+7, BASE = 31</code>. That passes LeetCode tests and gets <b>hacked</b> in contests or exploited in production (hash flooding). Knowing the anti-hash story lets you review AI code in seconds: “prime modulus? random base? two hashes or verification? zero-free mapping?”.</p>
      <p><b>Use AI as a partner:</b> ask it to <code>generate an anti-hash test for this code</code> — it can produce Thue–Morse inputs or a birthday-search script that finds collisions for a fixed 32-bit modulus. Watching your own solution fail on it is the fastest way to internalise the rules. Also ask it to compute the birthday-paradox collision probability for your K and M before you choose single vs double hashing.</p>
      <p><b>Where AI goes wrong:</b> negative values after subtraction (forgetting <code>+ M</code>), multiplying two values near 2<sup>61</sup> in a plain 64-bit integer (silent overflow), mapping <code>'a'</code> to 0, and “double hashing” with two moduli but the <i>same</i> fixed base. <b>What you must still own:</b> the decision of when hashing is acceptable (randomised, small failure probability) versus when you must be deterministic (suffix array / KMP / Z), and explaining that trade-off to an interviewer.</p>`,
    problems: [{
      title: 'Distinct Echo Substrings', level: 'Hard', tags: ['rolling hash', 'double hashing', 'string'], companies: ['Google', 'Amazon'],
      statement: `<p>Return the number of <b>distinct</b> non-empty substrings of <code>text</code> that can be written as <code>a + a</code> (some string concatenated with itself).</p>`,
      constraints: `1 ≤ |text| ≤ 2000, lowercase letters (LeetCode 1316)`,
      example: `<p>text = <code>"abcabcabc"</code> → <b>3</b>: ${H.c('g', 'abcabc')}, ${H.c('b', 'bcabca')}, ${H.c('p', 'cabcab')} (the second <code>abcabc</code> at index 3 is not distinct).</p><p>text = <code>"leetcodeleetcode"</code> → <b>2</b>: <code>ee</code> and <code>leetcodeleetcode</code>.</p>`,
      brute: { why: `<p>For every start i and half-length L, compare the two halves character by character (O(L)) and store the substring in a HashSet&lt;String&gt; (O(L) to copy and hash) → O(N<sup>3</sup>) ≈ 8·10<sup>9</sup> in the worst case (<code>aaaa…</code>, where nearly everything is an echo). The waste: re-reading characters already hashed.</p>`, code: { lang: 'java', code: `
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
        }`, alt: [{ lang: 'python', code: String.raw`
class Brute:
    def distinctEchoSubstrings(self, text: str) -> int:
        n = len(text)
        seen = set()
        for i in range(n):
            length = 1
            while i + 2 * length <= n:
                if text[i:i + length] == text[i + length:i + 2 * length]:
                    seen.add(text[i:i + 2 * length])
                length += 1
        return len(seen)` }, { lang: 'js', code: String.raw`
function distinctEchoSubstrings(text) {
  const n = text.length;
  const seen = new Set();
  for (let i = 0; i < n; i++)
    for (let len = 1; i + 2 * len <= n; len++)
      if (text.substring(i, i + len) === text.substring(i + len, i + 2 * len))
        seen.add(text.substring(i, i + 2 * len));
  return seen.size;
}` }, { lang: 'cpp', code: String.raw`
class Brute {
public:
    int distinctEchoSubstrings(string text) {
        int n = text.size();
        unordered_set<string> seen;
        for (int i = 0; i < n; i++)
            for (int len = 1; i + 2 * len <= n; len++)
                if (text.compare(i, len, text, i + len, len) == 0)
                    seen.insert(text.substr(i, 2 * len));
        return seen.size();
    }
};` }] } },
      mcq: { q: 'There are about N<sup>2</sup>/4 = 10<sup>6</sup> candidate (start, half) pairs. You store echo hashes in a set with ONE modulus ≈ 10<sup>9</sup>. What is the main risk?', options: ['Overflow', 'Birthday collisions merge different substrings and undercount', 'TLE', 'None'], answer: 1, explain: 'Up to 10<sup>6</sup> hashes in one set with M ≈ 10<sup>9</sup> gives ≈ 500 expected colliding pairs — the answer becomes wrong. Use a double hash (≈ 10<sup>18</sup>).' },
      hints: [`<p>An echo is fixed by (start i, half-length L). Check “left half == right half” in O(1) with prefix hashes instead of comparing letters.</p>`, `<p>To count <b>distinct</b> echoes, insert the hash of the whole substring text[i, i + 2L) into a hash set of 64-bit values. Only substrings of equal length can be equal, so you can also keep one set per length.</p>`, `<p>Use two moduli with random bases and pack them into one 64-bit integer. Recipe: prefix hashes → loop i, L → if get(i, i+L) == get(i+L, i+2L) add get(i, i+2L) → return set size.</p>`],
      tests: { sig: 'string -> int', fn: 'distinctEchoSubstrings', names: { python: 'distinctEchoSubstrings' }, cases: [
        [["abcabcabc"],3],
        [["leetcodeleetcode"],2],
        [["a"],0],
        [["aa"],1],
        [["ab"],0],
        [["aaaa"],2],
        [["abab"],1],
        [["abcd"],0],
        [["zzzzzz"],3],
        [["abcabcabcabcx"],4],
        [["aaababbbbaabaaaabbbb"],6],
        [["babbabaabbbabbbabaabaabbbbbabbb"],11],
        [["aabaabbabbbbbbabababbabbbababbbb"],10],
        [["acaacccccbbabacabcbcaaacccabbccbabccacabacaaabbbacbbacbcaabaabbbacaabbbbcbacbccabccaaaaaacccacaabacacabcaacbcbacbbaacacccaccababacbbbabbacccabbbcbbbcabaacccbbbaccabbacbcaaaccabcbbbaacacbcbcbbbbcbaccbabcacbabcbcbaccbacbbabccaabbbcbbbccababaacbccaabacabcabaaaacbbbcabbbbacaccccccaccaabbcaccbbacabbbaccacccccabbcbbcaabaabaacbabcacbacbcabccbcabbbbaacbabaaababccbcbbacccbbacacabccbbacaabacacaabbcaaaccaaaa"],29],
        [["aabaaaaababbaabaabaabbbbabababbaaabbaababababababaabaaaabababbabbbbaaabaaaababaabbbbbaaabbabaabaabaaaabaaababbaaabbbbababbababbaaaaaabaabbbbbaabbaabaaabbbaaabbaababaaabbaababbbbbbabaabaababbbabbaabbbbaaababaaabaabaaaabababbaabbabaaaaaabbbaaaabaaabbaabbbbbaaababbbbbabaababbababaaaaabababbabbbbaaabbbaaaaabbbabaabbbababbabbbaaaaababaaaabaabbbbaabbaaabbaaaaaaababbbbabababbaababaaaaabbaabbbabbbaabbaabbbabaabbbaaababbabbbbbbaabaabbaaabbbbabbbbabbaaabaabbbbbbbbabaabbbaaaabaabaaababaababbbabababbbbbbbbabaabaabbbaababbabbaabaaabbaaaabbababbaaaaababbbabbababbbbabbabbbaaaababababaaabaabbbabaabaabbabaabbbbbaabbbbbbbabbbababbbbbabbaabaababaaaabaaabbabaabbbbbbbaaaabbaaabaaabbbbabbaabbaabbaababbbabbbbabaababbaaababbbabbabbaabaabbbabbaaabbaaabbabaaabbbabaaabababaabaaababaaababaababbbaaabbbbbaaababbbaabbbbbabbbaaaaaabaabbaaaabbaaaaaabaaabbbabaaabbabaaaabbabbababaaaabbaabbbbabbabbaaabbbbbabbaaababbbbbaaaaabaaaababaabbbbbbabbbbaaababbbaaaabbbaababbabbabaaabbbbbbbbbabaaaaabbbbaaaaabbabababaabaaaabbbabababaaaabbbbbaabbabbbaabbaaaabbbbabbbbbbbbbabaabbaabbbaaabbbbbaabaabaabbaabaabbbbbbbaabbaabbaababbabbbbaaaaaabbaabaaaaaabbaaababbbaaababbbbbbbbbbabbbaaabbbbaabbabbbbbbbaabaababaaaaaababaababbabaaaabbabaaababbbbbaababbabbbaabbbbaabbbaaabbbbbbbbabaaabaabaabaabbbaabaabaaaaaababaabbaaaababbabaabaabbaaababbbabbbaabbbbaaaaabbabbbbaaabbabbababbaababbabbabababbbbbababbbbaabbbabaabbbaabbbbbbaaaaaabbabbabbbaaaabaaabaaaaaabbaabaabbabaabbbbaabaababbabaabbaabaaaaababbabbababbaabbbbbaaabaaabaaaababbbbaaaabaaaaaab"],89],
        [[{"$rep":"a","n":2000}],1000]
      ] },
      solution: {
        approach: `<p>Prefix double-hashes give O(1) substring hashes. Enumerate all O(N<sup>2</sup>) (start, half) pairs, test the halves by hash, and add the full substring’s hash to a set. Packing two independent hashes into one 64-bit integer keeps the collision probability around 10<sup>−6</sup> overall even with 10<sup>6</sup> insertions.</p>`,
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
        return len(seen)` }, { lang: 'js', code: `
function distinctEchoSubstrings(text) {
  const n = text.length;
  const M = (1n << 61n) - 1n;                                 // one big Mersenne prime
  const B = BigInt(256 + Math.floor(Math.random() * 1e9));    // random base
  const pre = [0n], pw = [1n];
  for (let i = 0; i < n; i++) {
    pre.push((pre[i] * B + BigInt(text.charCodeAt(i))) % M);
    pw.push(pw[i] * B % M);
  }
  const get = (l, r) => ((pre[r] - pre[l] * pw[r - l]) % M + M) % M;
  const seen = new Set();
  for (let len = 1; 2 * len <= n; len++)
    for (let i = 0; i + 2 * len <= n; i++)
      if (get(i, i + len) === get(i + len, i + 2 * len)) seen.add(get(i, i + 2 * len));
  return seen.size;
}` }, { lang: 'cpp', code: `
class Solution {
    typedef unsigned long long u64;
    static const u64 M = (1ULL << 61) - 1;                    // one big Mersenne prime
    static u64 mul(u64 a, u64 b) { return (u64)((unsigned __int128)a * b % M); }

public:
    int distinctEchoSubstrings(string text) {
        int n = text.size();
        mt19937_64 rng(chrono::steady_clock::now().time_since_epoch().count());
        u64 B = 256 + rng() % (M - 512);                      // random base
        vector<u64> pre(n + 1, 0), pw(n + 1, 1);
        for (int i = 0; i < n; i++) {
            pre[i + 1] = (mul(pre[i], B) + text[i]) % M;
            pw[i + 1] = mul(pw[i], B);
        }
        auto get = [&](int l, int r) { return (pre[r] + M - mul(pre[l], pw[r - l])) % M; };
        unordered_set<u64> seen;
        for (int len = 1; 2 * len <= n; len++)
            for (int i = 0; i + 2 * len <= n; i++)
                if (get(i, i + len) == get(i + len, i + 2 * len)) seen.insert(get(i, i + 2 * len));
        return seen.size();
    }
};` }],
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
    code: [{ lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `class SuffixAutomaton:
    def __init__(self, s):
        self.length = [0]                  # length of the longest string in each state
        self.link = [-1]
        self.next = [{}]                   # dict per state: sparse, so no 26-wide rows
        self.is_clone = [False]
        self.last = 0
        for ch in s:
            self._extend(ch)

    def _new_state(self, length, nxt, link, clone):
        self.length.append(length)
        self.link.append(link)
        self.next.append(nxt)
        self.is_clone.append(clone)
        return len(self.length) - 1

    def _extend(self, c):
        cur = self._new_state(self.length[self.last] + 1, {}, -1, False)
        p = self.last
        while p != -1 and c not in self.next[p]:       # new edges into cur
            self.next[p][c] = cur
            p = self.link[p]
        if p == -1:
            self.link[cur] = 0                         # case 1: fell off root
        else:
            q = self.next[p][c]
            if self.length[p] + 1 == self.length[q]:
                self.link[cur] = q                     # case 2: perfect fit
            else:                                      # case 3: clone q
                clone = self._new_state(self.length[p] + 1, dict(self.next[q]), self.link[q], True)
                while p != -1 and self.next[p].get(c) == q:
                    self.next[p][c] = clone
                    p = self.link[p]
                self.link[q] = clone
                self.link[cur] = clone
        self.last = cur

    def size(self):
        return len(self.length)

    def contains(self, w):
        v = 0
        for ch in w:
            v = self.next[v].get(ch, -1)
            if v == -1:
                return False
        return True

    def distinct_substrings(self):
        return sum(self.length[v] - self.length[self.link[v]] for v in range(1, self.size()))

    # occurrences of w = |endpos| of its state
    def occurrences(self, w):
        n = self.size()
        cnt = [0 if self.is_clone[v] or v == 0 else 1 for v in range(n)]   # each prefix end is one position
        for v in sorted(range(n), key=lambda x: -self.length[x]):         # longest first
            if self.link[v] >= 0:
                cnt[self.link[v]] += cnt[v]
        v = 0
        for ch in w:
            v = self.next[v].get(ch, -1)
            if v == -1:
                return 0
        return cnt[v]


sam = SuffixAutomaton("abcbc")
print("states =", sam.size())                                  # 8
print(sam.distinct_substrings())                               # 12
print(sam.contains("cbc"), sam.contains("ca"))                 # True False
print(sam.occurrences("bc"))                                   # 2` }, { lang: 'js', code: `class SuffixAutomaton {
  constructor(s) {
    this.len = [0];                    // length of the longest string in each state
    this.link = [-1];
    this.next = [new Map()];           // Map per state: sparse, so no 26-wide rows
    this.isClone = [false];
    this.last = 0;
    for (const ch of s) this.extend(ch);
  }

  newState(len, next, link, clone) {
    this.len.push(len); this.link.push(link); this.next.push(next); this.isClone.push(clone);
    return this.len.length - 1;
  }

  extend(c) {
    const cur = this.newState(this.len[this.last] + 1, new Map(), -1, false);
    let p = this.last;
    while (p !== -1 && !this.next[p].has(c)) { this.next[p].set(c, cur); p = this.link[p]; }   // new edges into cur
    if (p === -1) this.link[cur] = 0;                                    // case 1: fell off root
    else {
      const q = this.next[p].get(c);
      if (this.len[p] + 1 === this.len[q]) this.link[cur] = q;           // case 2: perfect fit
      else {                                                             // case 3: clone q
        const clone = this.newState(this.len[p] + 1, new Map(this.next[q]), this.link[q], true);
        while (p !== -1 && this.next[p].get(c) === q) { this.next[p].set(c, clone); p = this.link[p]; }
        this.link[q] = clone;
        this.link[cur] = clone;
      }
    }
    this.last = cur;
  }

  get size() { return this.len.length; }

  contains(w) {
    let v = 0;
    for (const ch of w) { v = this.next[v].has(ch) ? this.next[v].get(ch) : -1; if (v === -1) return false; }
    return true;
  }

  distinctSubstrings() {
    let total = 0;
    for (let v = 1; v < this.size; v++) total += this.len[v] - this.len[this.link[v]];
    return total;
  }

  // occurrences of w = |endpos| of its state
  occurrences(w) {
    const n = this.size;
    const cnt = new Array(n).fill(0);
    for (let v = 1; v < n; v++) if (!this.isClone[v]) cnt[v] = 1;       // each prefix end is one position
    const order = Array.from({ length: n }, (_, v) => v).sort((a, b) => this.len[b] - this.len[a]);   // longest first
    for (const v of order) if (this.link[v] >= 0) cnt[this.link[v]] += cnt[v];
    let v = 0;
    for (const ch of w) { v = this.next[v].has(ch) ? this.next[v].get(ch) : -1; if (v === -1) return 0; }
    return cnt[v];
  }
}

const sam = new SuffixAutomaton("abcbc");
console.log("states = " + sam.size);                                    // 8
console.log(sam.distinctSubstrings());                                  // 12
console.log(sam.contains("cbc") + " " + sam.contains("ca"));            // true false
console.log(sam.occurrences("bc"));                                     // 2` }, { lang: 'cpp', code: `class SuffixAutomaton {
    struct State {
        int len = 0, link = -1;
        bool isClone = false;
        array<int, 26> next;
        State() { next.fill(-1); }
    };
    vector<State> st;              // at most 2N - 1 states
    int last = 0;

    void extend(int c) {
        int cur = st.size();
        st.emplace_back();
        st[cur].len = st[last].len + 1;
        int p = last;
        while (p != -1 && st[p].next[c] == -1) { st[p].next[c] = cur; p = st[p].link; }   // new edges into cur
        if (p == -1) st[cur].link = 0;                                       // case 1: fell off root
        else {
            int q = st[p].next[c];
            if (st[p].len + 1 == st[q].len) st[cur].link = q;                // case 2: perfect fit
            else {                                                           // case 3: clone q
                int clone = st.size();
                st.push_back(st[q]);                                         // copies the transition row
                st[clone].len = st[p].len + 1;
                st[clone].isClone = true;
                while (p != -1 && st[p].next[c] == q) { st[p].next[c] = clone; p = st[p].link; }
                st[q].link = clone;
                st[cur].link = clone;
            }
        }
        last = cur;
    }

public:
    SuffixAutomaton(const string& s) {
        st.reserve(2 * max<size_t>(1, s.size()));
        st.emplace_back();
        for (char ch : s) extend(ch - 'a');
    }

    int size() const { return st.size(); }

    bool contains(const string& w) const {
        int v = 0;
        for (char ch : w) { v = st[v].next[ch - 'a']; if (v == -1) return false; }
        return true;
    }

    long long distinctSubstrings() const {
        long long total = 0;
        for (int v = 1; v < (int)st.size(); v++) total += st[v].len - st[st[v].link].len;
        return total;
    }

    // occurrences of w = |endpos| of its state
    long long occurrences(const string& w) const {
        int n = st.size();
        vector<long long> cnt(n, 0);
        for (int v = 1; v < n; v++) if (!st[v].isClone) cnt[v] = 1;          // each prefix end is one position
        vector<int> order(n);
        iota(order.begin(), order.end(), 0);
        sort(order.begin(), order.end(), [&](int a, int b) { return st[a].len > st[b].len; });   // longest first
        for (int v : order) if (st[v].link >= 0) cnt[st[v].link] += cnt[v];
        int v = 0;
        for (char ch : w) { v = st[v].next[ch - 'a']; if (v == -1) return 0; }
        return cnt[v];
    }
};

int main() {
    SuffixAutomaton sam("abcbc");
    cout << "states = " << sam.size() << "\\n";                              // 8
    cout << sam.distinctSubstrings() << "\\n";                               // 12
    cout << boolalpha << sam.contains("cbc") << " " << sam.contains("ca") << "\\n";   // true false
    cout << sam.occurrences("bc") << "\\n";                                  // 2
}` }] }, { lang: 'python', run: true, title: 'Suffix automaton in Python (runnable)', code: `
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
      <p><b>Relation to other structures.</b> The suffix-link tree of the SAM of s is the <b>suffix tree of reverse(s)</b>. Built over a set of strings with separators (or a “generalised SAM” built on a trie), it answers multi-string questions such as the longest substring common to all k strings. Compared with SA + LCP: SAM is online and O(N) but uses σ-wide transitions (26 ints per state → ~200 bytes per character for 26 letters with array rows, or hash maps for large alphabets); SA is offline and leaner (4–8 bytes per char).</p>
      <p><b>Pitfalls.</b> Allocate 2N states (not N); copy the clone’s transition row (not alias it — <code>next[clone] = next[q]</code> without <code>.clone()</code> is a classic bug); compute occurrence counts in decreasing len order (counting sort by len is O(N)); remember clones get cnt 0 initially. For huge N, prefer one flat array of size 26·2N over an array of per-state rows (a row object per state in Java, a list per state in Python or JavaScript); a C++ <code>vector&lt;array&lt;int, 26&gt;&gt;</code> is already flat.</p>`,
    aiEra: `<p><b>What AI changes:</b> the SAM is the archetype of “hard to derive, easy to copy”. An assistant can paste a correct template, and interviewers at the expert level know it — so they probe <i>understanding</i>: what a state represents (an endpos class), why cloning is needed, and how to adapt it (occurrence counts, first positions, k-th substring). That is the knowledge this topic builds.</p>
      <p><b>Use AI as a partner:</b> ask it to print the state table (len, link, strings in state) for small words and check it against the visualizer; ask for a brute-force “set of all substrings” checker for distinct counts and occurrence counts on random strings of length ≤ 12. Ask it to explain a clone step for <code>abbb</code> in its own words — then verify each claim.</p>
      <p><b>Where AI goes wrong:</b> aliasing the transition array when cloning, sizing arrays to N states, counting occurrences without the longest-first order, and claiming SAM works “in O(N) for any alphabet” (with hash maps it is O(N log σ) or expected O(N)). <b>What you must still own:</b> deciding whether SAM is worth its complexity in an interview (often SA + LCP or hashing is simpler to explain) and articulating the endpos intuition clearly.</p>`,
    problems: [{
      title: 'Longest Common Substring of Two Strings', level: 'Hard', tags: ['suffix automaton', 'string', 'two pointers on automaton'], companies: ['Google', 'Meta'],
      statement: `<p>Given two strings <code>s</code> and <code>t</code>, return the length of their longest common <b>substring</b> (contiguous).</p>`,
      constraints: `1 ≤ |s|, |t| ≤ 2.5·10<sup>5</sup>, lowercase letters (SPOJ LCS)`,
      example: `<p>s = <code>"abcbc"</code>, t = <code>"bcbcab"</code> → <b>4</b> (${H.c('g', 'bcbc')}).</p><p>s = <code>"xabcdey"</code>, t = <code>"zzbcdq"</code> → <b>3</b> (${H.c('g', 'bcd')}).</p>`,
      brute: { why: `<p>The textbook DP <code>dp[i][j] = dp[i−1][j−1] + 1</code> if s[i−1] == t[j−1] is O(|s|·|t|) = 6.25·10<sup>10</sup> steps — far too slow (and a 2D table would need 250 GB). The waste: every (i, j) pair is examined even though most cannot extend a match.</p>`, code: { lang: 'java', code: `
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
        }`, alt: [{ lang: 'python', code: String.raw`
def longest_common_substring(s, t):
    n, m, best = len(s), len(t), 0
    prev, cur = [0] * (m + 1), [0] * (m + 1)
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cur[j] = prev[j - 1] + 1 if s[i - 1] == t[j - 1] else 0
            best = max(best, cur[j])
        prev, cur = cur, prev
    return best` }, { lang: 'js', code: String.raw`
function longestCommonSubstring(s, t) {
  const n = s.length, m = t.length;
  let best = 0, prev = new Array(m + 1).fill(0), cur = new Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      cur[j] = s[i - 1] === t[j - 1] ? prev[j - 1] + 1 : 0;
      best = Math.max(best, cur[j]);
    }
    [prev, cur] = [cur, prev];
  }
  return best;
}` }, { lang: 'cpp', code: String.raw`
class Brute {
public:
    int longestCommonSubstring(string s, string t) {
        int n = s.size(), m = t.size(), best = 0;
        vector<int> prev(m + 1, 0), cur(m + 1, 0);
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j <= m; j++) {
                cur[j] = s[i - 1] == t[j - 1] ? prev[j - 1] + 1 : 0;
                best = max(best, cur[j]);
            }
            swap(prev, cur);
        }
        return best;
    }
};` }] } },
      mcq: { q: 'While walking t through the SAM of s, the next char has no edge from state v. What do you do?', options: ['Restart from the root with length 0', 'Follow suffix links (setting l = len(v)) until an edge exists or you reach the root', 'Skip the character and keep l', 'Rebuild the automaton'], answer: 1, explain: 'Like Aho–Corasick fail links: the suffix link is the longest shorter suffix with more occurrences; keep as much of the current match as possible.' },
      hints: [`<p>Keep (v, l): the SAM state and length of the longest suffix of t[0..j] that is a substring of s. Answer = max l over j.</p>`, `<p>On character c: while v ≠ root and v has no c-edge, set v = link(v), l = len(v). If an edge exists, take it and l++; otherwise stay at the root with l = 0.</p>`, `<p>Build the SAM of the shorter string to save memory. Each step increases l by ≤ 1 and each fallback decreases it, so the walk is O(|t|). Return best.</p>`],
      tests: { sig: 'string string -> int', fn: 'longestCommonSubstring', cases: [
        [["abcbc","bcbcab"],4],
        [["xabcdey","zzbcdq"],3],
        [["a","a"],1],
        [["a","b"],0],
        [["abc","abc"],3],
        [["abc","def"],0],
        [["abcdef","cde"],3],
        [["aaaa","aa"],2],
        [["banana","ananas"],5],
        [["bcbacccccabbcbaaaccbaacbbabcabaaac","abbcccccac"],6],
        [["baaccbbabbcacbcacccbaaccca","baacbacbacaaacbaccbacbccaccacacbb"],4],
        [["baacababbbabcaaaabccabcaaccabaaabb","bbabcaaaac"],9],
        [["bbabaabccbaabbaaacbcaacbabbabcbbaacbbaacbaa","acaabbbccbcbcbbcacabbccbcbcaaabbab"],5],
        [["babbabbbabaaaabaaaabbabaababbbbaaabaaabbaabbbaaabaaabbbbbbbbabbbbaaaabbaaaabaabbbaaabbabbaaaaabaabbbabababbbaaabbbaaaababbaabaabaaabbaabababaabababababaabbabbabbbbabbbaabbababbaaaaabbbabbbbaababaababbaaabbabaaabaababbbaaabbabbaabbbbbabbaaabbabaaabababaaabaaabbabaabbbaabaabaabbbaaaabbaaaabaaabaabababbbabaaaaababaaabbaabbabaaababaaaaaababbabbbbabaababbbbabbbaaaaaaabbabaabababaabbaabbbababaaaaaaaabab","bababbbabbbbaabbbbbbabaaaabbabaaaaaaabaabababaaaababaaababaaabbabbbaabbbaababaabbabababaaabbaaabbaabaabaaaaababbabaaaabbbbabababababaabbababbaabbbbbabbaaaababaaaabaabbbaabbabbbabbaaaabbabaaaaaabababbbaaabaaaabbbaaabbbbaabbbabababbbbabbaaabbabaaaababababbbabaaaabababaabbabbaabbbabbbaabaabaaaaabaaabbb"],17],
        [[{"$rep":"a","n":250000},{"$rep":"a","n":250000}],250000],
        [[{"$rep":"ab","n":125000},{"$rep":"ba","n":125000}],249999],
        [[{"$rep":"a","n":250000},{"$rep":"b","n":250000}],0],
        [[{"$concat":[{"$rep":"a","n":100000},"b",{"$rep":"a","n":100000}]},{"$concat":[{"$rep":"a","n":50000},"b",{"$rep":"a","n":150000}]}],150001]
      ] },
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
    return best` }, { lang: 'js', code: `
function longestCommonSubstring(s, t) {
  const cap = 2 * Math.max(1, s.length);
  const len = new Int32Array(cap), link = new Int32Array(cap);
  const next = new Int32Array(cap * 26).fill(-1);
  link[0] = -1;
  let size = 1, last = 0;
  for (let i = 0; i < s.length; i++) {                        // build the SAM of s
    const c = s.charCodeAt(i) - 97, cur = size++;
    len[cur] = len[last] + 1;
    let p = last;
    while (p !== -1 && next[p * 26 + c] === -1) { next[p * 26 + c] = cur; p = link[p]; }
    if (p === -1) link[cur] = 0;
    else {
      const q = next[p * 26 + c];
      if (len[p] + 1 === len[q]) link[cur] = q;
      else {
        const clone = size++;
        len[clone] = len[p] + 1;
        next.copyWithin(clone * 26, q * 26, q * 26 + 26);
        link[clone] = link[q];
        while (p !== -1 && next[p * 26 + c] === q) { next[p * 26 + c] = clone; p = link[p]; }
        link[q] = clone; link[cur] = clone;
      }
    }
    last = cur;
  }
  let v = 0, l = 0, best = 0;                                 // walk t through the automaton
  for (let j = 0; j < t.length; j++) {
    const c = t.charCodeAt(j) - 97;
    while (v !== 0 && next[v * 26 + c] === -1) { v = link[v]; l = len[v]; }
    if (next[v * 26 + c] !== -1) { v = next[v * 26 + c]; l++; }
    best = Math.max(best, l);
  }
  return best;
}` }, { lang: 'cpp', code: `
class Solution {
public:
    int longestCommonSubstring(string s, string t) {
        int cap = 2 * max<int>(1, s.size());
        vector<int> len(cap, 0), link(cap, -1);
        vector<array<int, 26>> next(cap);
        for (auto& row : next) row.fill(-1);
        int size = 1, last = 0;
        for (char ch : s) {                                   // build the SAM of s
            int c = ch - 'a', cur = size++;
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
                    next[clone] = next[q];
                    link[clone] = link[q];
                    while (p != -1 && next[p][c] == q) { next[p][c] = clone; p = link[p]; }
                    link[q] = link[cur] = clone;
                }
            }
            last = cur;
        }
        int v = 0, l = 0, best = 0;                           // walk t through the automaton
        for (char ch : t) {
            int c = ch - 'a';
            while (v != 0 && next[v][c] == -1) { v = link[v]; l = len[v]; }
            if (next[v][c] != -1) { v = next[v][c]; l++; }
            best = max(best, l);
        }
        return best;
    }
};` }],
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
    code: [{ lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `class SubstringStats:
    @staticmethod
    def build_sa(s):
        n = len(s)
        sa = list(range(n))
        rank = [ord(ch) for ch in s]
        k = 1
        while n > 1:
            r, step = rank, k
            def key(i):
                return (r[i], r[i + step] if i + step < n else -1)
            sa.sort(key=key)
            tmp = [0] * n
            for i in range(1, n):
                tmp[sa[i]] = tmp[sa[i - 1]] + (1 if key(sa[i - 1]) < key(sa[i]) else 0)
            rank = tmp
            if rank[sa[-1]] == n - 1:
                break
            k <<= 1
        return sa

    @staticmethod
    def kasai(s, sa):
        n, h = len(s), 0
        rank = [0] * n
        for r, i in enumerate(sa):
            rank[i] = r
        lcp = [0] * n
        for i in range(n):
            if rank[i] == 0:
                h = 0
                continue
            j = sa[rank[i] - 1]
            while i + h < n and j + h < n and s[i + h] == s[j + h]:
                h += 1
            lcp[rank[i]] = h
            if h > 0:
                h -= 1
        return lcp

    # distinct substrings of EVERY length L = 1..n in O(n) after SA + LCP
    @staticmethod
    def distinct_by_length(s):
        n = len(s)
        sa = SubstringStats.build_sa(s)
        lcp = SubstringStats.kasai(s, sa)
        diff = [0] * (n + 2)
        for r in range(n):                       # rank r adds lengths lcp[r]+1 .. n-sa[r]
            lo, hi = lcp[r] + 1, n - sa[r]
            if lo <= hi:
                diff[lo] += 1
                diff[hi + 1] -= 1
        res = [0] * (n + 1)
        run = 0
        for L in range(1, n + 1):
            run += diff[L]
            res[L] = run
        return res

    # longest substring that occurs at least twice WITHOUT overlapping (binary search on length)
    @staticmethod
    def longest_non_overlapping_repeat(s):
        n = len(s)
        sa = SubstringStats.build_sa(s)
        lcp = SubstringStats.kasai(s, sa)
        lo, hi = 0, n // 2
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if SubstringStats._ok(sa, lcp, mid):
                lo = mid
            else:
                hi = mid - 1
        return lo

    @staticmethod
    def _ok(sa, lcp, L):
        mn = mx = sa[0]
        for r in range(1, len(sa)):
            if lcp[r] >= L:
                mn, mx = min(mn, sa[r]), max(mx, sa[r])
                if mx - mn >= L:
                    return True
            else:
                mn = mx = sa[r]                  # start a new block
        return False


s = "banana"
sa = SubstringStats.build_sa(s)
lcp = SubstringStats.kasai(s, sa)
n = len(s)
print("distinct =", n * (n + 1) // 2 - sum(lcp))                       # 15
print(SubstringStats.distinct_by_length(s))                            # [0, 3, 3, 3, 3, 2, 1]
print(SubstringStats.longest_non_overlapping_repeat("banana"))         # 2 ("an" or "na")
print(SubstringStats.longest_non_overlapping_repeat("aaaa"))           # 2 ("aa" at 0 and 2)` }, { lang: 'js', code: `class SubstringStats {
  static buildSA(s) {
    const n = s.length;
    const sa = Array.from({ length: n }, (_, i) => i);
    let rank = Array.from(s, (ch) => ch.charCodeAt(0));
    for (let k = 1; n > 1; k <<= 1) {
      const r = rank;
      const cmp = (x, y) => (r[x] !== r[y] ? r[x] - r[y]
        : (x + k < n ? r[x + k] : -1) - (y + k < n ? r[y + k] : -1));
      sa.sort(cmp);
      const tmp = new Array(n).fill(0);
      for (let i = 1; i < n; i++) tmp[sa[i]] = tmp[sa[i - 1]] + (cmp(sa[i - 1], sa[i]) < 0 ? 1 : 0);
      rank = tmp;
      if (rank[sa[n - 1]] === n - 1) break;
    }
    return sa;
  }

  static kasai(s, sa) {
    const n = s.length;
    let h = 0;
    const rank = new Array(n).fill(0), lcp = new Array(n).fill(0);
    for (let r = 0; r < n; r++) rank[sa[r]] = r;
    for (let i = 0; i < n; i++) {
      if (rank[i] === 0) { h = 0; continue; }
      const j = sa[rank[i] - 1];
      while (i + h < n && j + h < n && s[i + h] === s[j + h]) h++;
      lcp[rank[i]] = h;
      if (h > 0) h--;
    }
    return lcp;
  }

  // distinct substrings of EVERY length L = 1..n in O(n) after SA + LCP
  static distinctByLength(s) {
    const n = s.length;
    const sa = SubstringStats.buildSA(s), lcp = SubstringStats.kasai(s, sa);
    const diff = new Array(n + 2).fill(0);
    for (let r = 0; r < n; r++) {          // rank r adds lengths lcp[r]+1 .. n-sa[r]
      const from = lcp[r] + 1, to = n - sa[r];
      if (from <= to) { diff[from]++; diff[to + 1]--; }
    }
    const res = new Array(n + 1).fill(0);
    let run = 0;
    for (let L = 1; L <= n; L++) { run += diff[L]; res[L] = run; }
    return res;
  }

  // longest substring that occurs at least twice WITHOUT overlapping (binary search on length)
  static longestNonOverlappingRepeat(s) {
    const n = s.length;
    const sa = SubstringStats.buildSA(s), lcp = SubstringStats.kasai(s, sa);
    let lo = 0, hi = n >> 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (SubstringStats.ok(sa, lcp, mid)) lo = mid; else hi = mid - 1;
    }
    return lo;
  }

  static ok(sa, lcp, L) {
    let mn = sa[0], mx = sa[0];
    for (let r = 1; r < sa.length; r++) {
      if (lcp[r] >= L) { mn = Math.min(mn, sa[r]); mx = Math.max(mx, sa[r]); if (mx - mn >= L) return true; }
      else { mn = mx = sa[r]; }                       // start a new block
    }
    return false;
  }
}

const s = "banana";
const sa = SubstringStats.buildSA(s), lcp = SubstringStats.kasai(s, sa);
const n = s.length;
console.log("distinct = " + (n * (n + 1) / 2 - lcp.reduce((a, b) => a + b, 0)));          // 15
console.log(JSON.stringify(SubstringStats.distinctByLength(s)));                           // [0,3,3,3,3,2,1]
console.log(SubstringStats.longestNonOverlappingRepeat("banana"));                         // 2 ("an" or "na")
console.log(SubstringStats.longestNonOverlappingRepeat("aaaa"));                           // 2 ("aa" at 0 and 2)` }, { lang: 'cpp', code: `class SubstringStats {
public:
    static vector<int> buildSA(const string& s) {
        int n = s.size();
        vector<int> sa(n), rank(n), tmp(n);
        iota(sa.begin(), sa.end(), 0);
        for (int i = 0; i < n; i++) rank[i] = (unsigned char)s[i];
        for (int k = 1; n > 1; k <<= 1) {
            auto key = [&](int i) { return make_pair(rank[i], i + k < n ? rank[i + k] : -1); };
            sort(sa.begin(), sa.end(), [&](int x, int y) { return key(x) < key(y); });
            tmp[sa[0]] = 0;
            for (int i = 1; i < n; i++) tmp[sa[i]] = tmp[sa[i - 1]] + (key(sa[i - 1]) < key(sa[i]) ? 1 : 0);
            rank = tmp;
            if (rank[sa[n - 1]] == n - 1) break;
        }
        return sa;
    }

    static vector<int> kasai(const string& s, const vector<int>& sa) {
        int n = s.size(), h = 0;
        vector<int> rank(n), lcp(n, 0);
        for (int r = 0; r < n; r++) rank[sa[r]] = r;
        for (int i = 0; i < n; i++) {
            if (rank[i] == 0) { h = 0; continue; }
            int j = sa[rank[i] - 1];
            while (i + h < n && j + h < n && s[i + h] == s[j + h]) h++;
            lcp[rank[i]] = h;
            if (h > 0) h--;
        }
        return lcp;
    }

    // distinct substrings of EVERY length L = 1..n in O(n) after SA + LCP
    static vector<long long> distinctByLength(const string& s) {
        int n = s.size();
        vector<int> sa = buildSA(s), lcp = kasai(s, sa);
        vector<long long> diff(n + 2, 0), res(n + 1, 0);
        for (int r = 0; r < n; r++) {          // rank r adds lengths lcp[r]+1 .. n-sa[r]
            int from = lcp[r] + 1, to = n - sa[r];
            if (from <= to) { diff[from]++; diff[to + 1]--; }
        }
        long long run = 0;
        for (int L = 1; L <= n; L++) { run += diff[L]; res[L] = run; }
        return res;
    }

    // longest substring that occurs at least twice WITHOUT overlapping (binary search on length)
    static int longestNonOverlappingRepeat(const string& s) {
        int n = s.size();
        vector<int> sa = buildSA(s), lcp = kasai(s, sa);
        int lo = 0, hi = n / 2;
        while (lo < hi) {
            int mid = (lo + hi + 1) / 2;
            if (ok(sa, lcp, mid)) lo = mid; else hi = mid - 1;
        }
        return lo;
    }

private:
    static bool ok(const vector<int>& sa, const vector<int>& lcp, int L) {
        int mn = sa[0], mx = sa[0];
        for (int r = 1; r < (int)sa.size(); r++) {
            if (lcp[r] >= L) { mn = min(mn, sa[r]); mx = max(mx, sa[r]); if (mx - mn >= L) return true; }
            else { mn = mx = sa[r]; }                       // start a new block
        }
        return false;
    }
};

int main() {
    string s = "banana";
    vector<int> sa = SubstringStats::buildSA(s), lcp = SubstringStats::kasai(s, sa);
    long long n = s.size(), sum = accumulate(lcp.begin(), lcp.end(), 0LL);
    cout << "distinct = " << n * (n + 1) / 2 - sum << "\\n";                          // 15
    for (long long x : SubstringStats::distinctByLength(s)) cout << x << " ";        // 0 3 3 3 3 2 1
    cout << "\\n" << SubstringStats::longestNonOverlappingRepeat("banana") << "\\n";   // 2 ("an" or "na")
    cout << SubstringStats::longestNonOverlappingRepeat("aaaa") << "\\n";             // 2 ("aa" at 0 and 2)
}` }] }, { lang: 'python', run: true, title: 'Three ways to count distinct substrings (Python, runnable)', code: `
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
      <p><b>Choosing under real constraints.</b> Memory: SA+LCP ≈ 8N bytes; SAM with 26-wide arrays ≈ 2N·26·4 = 208N bytes (≈ 200 MB for N = 10<sup>6</sup> with 32-bit ints!) — use a flat array or hash maps. Determinism: hashing can be wrong with tiny probability; acceptable in most interviews if you say so and use double hashing. Speed: an O(N log<sup>2</sup> N) SA built with a comparator or tuple-key sort (boxed <code>Integer[]</code> in Java, key tuples in Python) takes seconds for N = 10<sup>6</sup>; the counting-sort version is several times faster. Production systems that need these operations at scale (genomics, large corpus dedup) use SA-IS + compressed indexes (FM-index), not textbook code.</p>`,
    aiEra: `<p><b>What AI changes:</b> deduplication and memorisation checks are now everyday ML-engineering tasks. Researchers use suffix arrays to find exact repeated spans in training corpora and to check whether a model’s output appears verbatim in its training data; plagiarism and code-clone detectors (e.g. MOSS) use k-gram hashing with winnowing; near-duplicate detection uses MinHash. Knowing when you need <b>exact</b> structure (SA/SAM) versus <b>approximate</b> fingerprints (MinHash, embeddings) is a real design skill.</p>
      <p><b>Use AI as a partner:</b> give it the problem statement and ask <code>which of hashing, SA+LCP, SAM fits these constraints and why — list memory per character</code>, then check its numbers yourself. Ask for a three-way stress test like the Python snippet above whenever you implement any of these structures.</p>
      <p><b>Where AI goes wrong:</b> answering the overlap-allowed version when the statement forbids overlap, computing N(N+1)/2 in a 32-bit integer (overflows at N ≈ 65,536), and proposing embeddings for an exact-match problem. <b>What you must still own:</b> reading the fine print (distinct vs occurrences, overlap vs not), translating constraints into a tool choice, and explaining the trade-off in two sentences.</p>`,
    problems: [{
      title: 'Number of Distinct Substrings in a String', level: 'Medium', tags: ['suffix array', 'lcp', 'suffix automaton', 'hashing'], companies: ['Google', 'Intuit'],
      statement: `<p>Given a string <code>s</code>, return the number of <b>distinct</b> non-empty substrings of <code>s</code>. Follow-up: can you do it in O(N log N) or O(N)?</p>`,
      constraints: `1 ≤ |s| ≤ 500 for the original (LeetCode 1698); solve for |s| ≤ 10<sup>5</sup> in the follow-up. Lowercase letters.`,
      example: `<p>s = <code>"aabbaba"</code> → <b>21</b>. s = <code>"abcdefg"</code> → <b>28</b> (all 7·8/2 substrings are different).</p><p>s = <code>"banana"</code> → <b>15</b>: 21 pairs minus Σlcp = 6 repeats (${H.c('r', 'a ×2, an, ana, n, na')}).</p>`,
      brute: { why: `<p>Insert every substring into a HashSet&lt;String&gt;: O(N<sup>2</sup>) substrings × O(N) to copy and hash → O(N<sup>3</sup>) time and O(N<sup>3</sup>) memory in the worst case. N = 500 is fine (≈ 2·10<sup>7</sup>), N = 10<sup>5</sup> is impossible.</p>`, code: { lang: 'java', code: `
        class Brute {
            int countDistinct(String s) {
                Set<String> set = new HashSet<>();
                for (int i = 0; i < s.length(); i++)
                    for (int j = i + 1; j <= s.length(); j++)
                        set.add(s.substring(i, j));
                return set.size();
            }
        }`, alt: [{ lang: 'python', code: String.raw`
class Brute:
    def countDistinct(self, s: str) -> int:
        seen = set()
        for i in range(len(s)):
            for j in range(i + 1, len(s) + 1):
                seen.add(s[i:j])
        return len(seen)` }, { lang: 'js', code: String.raw`
function countDistinct(s) {
  const set = new Set();
  for (let i = 0; i < s.length; i++)
    for (let j = i + 1; j <= s.length; j++)
      set.add(s.substring(i, j));
  return set.size;
}` }, { lang: 'cpp', code: String.raw`
class Brute {
public:
    long long countDistinct(string s) {
        unordered_set<string> set;
        for (int i = 0; i < (int)s.size(); i++)
            for (int j = i + 1; j <= (int)s.size(); j++)
                set.insert(s.substr(i, j - i));
        return set.size();
    }
};` }] } },
      mcq: { q: 'With SA + LCP, how many NEW distinct substrings does the suffix at rank r contribute?', options: ['n − SA[r]', 'lcp[r]', '(n − SA[r]) − lcp[r]', '1'], answer: 2, explain: 'Its first lcp[r] prefixes were already counted by the suffix right above it; the remaining prefixes are new.' },
      hints: [`<p>Every substring is a prefix of a suffix. If suffixes are sorted, a prefix that repeats must be shared with the <b>neighbour above</b>.</p>`, `<p>Build SA, then LCP with Kasai. Answer = Σ over ranks of (suffix length − lcp[r]) = N(N+1)/2 − Σ lcp.</p>`, `<p>Use a 64-bit integer (N = 10<sup>5</sup> gives ≈ 5·10<sup>9</sup>). Alternative O(N): suffix automaton, Σ len(v) − len(link(v)). Check: <code>aaaa</code> → 4.</p>`],
      tests: { sig: 'string -> long', fn: 'countDistinct', names: { python: 'countDistinct' }, cases: [
        [["aabbaba"],21],
        [["abcdefg"],28],
        [["banana"],15],
        [["a"],1],
        [["aaaa"],4],
        [["ab"],3],
        [["abab"],7],
        [["mississippi"],53],
        [["aabaabaaabbbab"],77],
        [["bbaaababbbbbaaabaaaabbbbaabaaba"],393],
        [["baabbaaabbabbaabbaabbabaab"],257],
        [["aababaababccabbabccbcbcaccccccaccccaccbcccabbaaabcaaccbccaccacaabbbcaaacbbbcaaaaabcccbccbbcbcccacbbbbcbbacbcccbcabbaacaaaaabcabccbccaccccbaaabcaacbacabcaabbbababbbbaabaacacabacbccbaaccbabbbbbbaacbbbbccbbcbcbaabccbcbccacccbbcbcabbbcaaacbaaacabcabcbaabccacccbbabcbcccbacaababcabbacaaabccbbabacbacacabac"],43822],
        [[{"$rep":"a","n":100000}],100000],
        [[{"$rep":"ab","n":50000}],199999],
        [[{"$concat":[{"$rep":"a","n":50000},{"$rep":"b","n":50000}]}],2500100000]
      ] },
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
        return sum(length[v] - length[link[v]] for v in range(1, len(length)))` }, { lang: 'js', code: `
function countDistinct(s) {
  // suffix automaton: every state adds len(v) - len(link(v)) new substrings
  const cap = 2 * Math.max(1, s.length);
  const len = new Int32Array(cap), link = new Int32Array(cap);
  const next = new Int32Array(cap * 26).fill(-1);
  link[0] = -1;
  let size = 1, last = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i) - 97, cur = size++;
    len[cur] = len[last] + 1;
    let p = last;
    while (p !== -1 && next[p * 26 + c] === -1) { next[p * 26 + c] = cur; p = link[p]; }
    if (p === -1) link[cur] = 0;
    else {
      const q = next[p * 26 + c];
      if (len[p] + 1 === len[q]) link[cur] = q;
      else {
        const clone = size++;
        len[clone] = len[p] + 1;
        next.copyWithin(clone * 26, q * 26, q * 26 + 26);
        link[clone] = link[q];
        while (p !== -1 && next[p * 26 + c] === q) { next[p * 26 + c] = clone; p = link[p]; }
        link[q] = clone; link[cur] = clone;
      }
    }
    last = cur;
  }
  let total = 0;                                               // up to ~5e9: exact in a double
  for (let v = 1; v < size; v++) total += len[v] - len[link[v]];
  return total;
}` }, { lang: 'cpp', code: `
class Solution {
public:
    long long countDistinct(string s) {
        // suffix automaton: every state adds len(v) - len(link(v)) new substrings
        int cap = 2 * max<int>(1, s.size());
        vector<int> len(cap, 0), link(cap, -1);
        vector<array<int, 26>> next(cap);
        for (auto& row : next) row.fill(-1);
        int size = 1, last = 0;
        for (char ch : s) {
            int c = ch - 'a', cur = size++;
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
                    next[clone] = next[q];
                    link[clone] = link[q];
                    while (p != -1 && next[p][c] == q) { next[p][c] = clone; p = link[p]; }
                    link[q] = link[cur] = clone;
                }
            }
            last = cur;
        }
        long long total = 0;
        for (int v = 1; v < size; v++) total += len[v] - len[link[v]];
        return total;
    }
};` }],
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

  // =====================================================================
  // PRACTICE — Easy & Medium
  // =====================================================================
  practice.push({
    title: 'Find the Index of the First Occurrence (Rabin–Karp, done safely)', level: 'Easy', tags: ['rolling hash', 'rabin-karp', 'string'], companies: ['Microsoft', 'Apple', 'Facebook'],
    statement: `<p>Given strings <code>haystack</code> and <code>needle</code>, return the index of the first occurrence of <code>needle</code> in <code>haystack</code>, or −1. Solve it with a rolling hash in O(N + M) expected time — and make it impossible to fool.</p>`,
    constraints: `1 ≤ |haystack|, |needle| ≤ 10<sup>4</sup> (LeetCode 28); think about 10<sup>6</sup>.`,
    example: `<p>haystack = <code>"sadbutsad"</code>, needle = <code>"sad"</code> → <b>0</b> (${H.c('g', 'sad')} at 0 and 6; first wins). needle = <code>"leeto"</code> in <code>"leetcode"</code> → <b>−1</b>.</p>`,
    brute: { why: `<p>Try every start and compare up to M characters: O(N·M) = 10<sup>8</sup> for 10<sup>4</sup> × 10<sup>4</sup>, and worse on inputs like <code>aaaa…ab</code>. The waste: when the window slides by one we throw away everything we learned about the previous window.</p>`, code: { lang: 'java', code: `
      class Brute {
          int strStr(String h, String nd) {
              for (int i = 0; i + nd.length() <= h.length(); i++) {
                  int k = 0;
                  while (k < nd.length() && h.charAt(i + k) == nd.charAt(k)) k++;
                  if (k == nd.length()) return i;
              }
              return -1;
          }
      }`, alt: [{ lang: 'python', code: String.raw`
class Brute:
    def strStr(self, haystack: str, needle: str) -> int:
        for i in range(len(haystack) - len(needle) + 1):
            k = 0
            while k < len(needle) and haystack[i + k] == needle[k]:
                k += 1
            if k == len(needle):
                return i
        return -1` }, { lang: 'js', code: String.raw`
function strStr(haystack, needle) {
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    let k = 0;
    while (k < needle.length && haystack[i + k] === needle[k]) k++;
    if (k === needle.length) return i;
  }
  return -1;
}` }, { lang: 'cpp', code: String.raw`
class Brute {
public:
    int strStr(string haystack, string needle) {
        for (int i = 0; i + (int)needle.size() <= (int)haystack.size(); i++) {
            int k = 0;
            while (k < (int)needle.size() && haystack[i + k] == needle[k]) k++;
            if (k == (int)needle.size()) return i;
        }
        return -1;
    }
};` }] } },
    mcq: { q: 'Both window hashes equal the needle’s hashes. What should a robust solution do before returning i?', options: ['Return immediately — two hashes never collide', 'Verify with a direct substring comparison', 'Recompute with a third modulus', 'Nothing; collisions only happen with mod 2^64'], answer: 1, explain: 'A direct comparison costs O(M) and runs only when the hashes agree, so the expected total stays O(N + M) while the answer becomes always correct.' },
    hints: [`<p>Hash the needle once. Hash the first window, then roll: remove the left char’s contribution (·B<sup>M−1</sup>), multiply by B, add the new right char.</p>`, `<p>Use two prime moduli with <b>random</b> bases so nobody can craft collisions, and add M before taking mod after subtraction.</p>`, `<p>On a hash match, confirm with a direct comparison of the two substrings (<code>regionMatches</code>, slice equality, <code>compare</code>). Edge: needle longer than haystack → −1. Recipe: precompute B<sup>M−1</sup>, loop i from 0, check, then roll if i + M &lt; N.</p>`],
    tests: { sig: 'string string -> int', fn: 'strStr', names: { python: 'strStr' }, cases: [
        [["sadbutsad","sad"],0],
        [["leetcode","leeto"],-1],
        [["a","a"],0],
        [["a","b"],-1],
        [["abc","abcd"],-1],
        [["abc","c"],2],
        [["mississippi","issip"],4],
        [["aaaaab","aab"],3],
        [["hello","ll"],2],
        [["abcabcabd","abcabd"],3],
        [["baababbabb","aa"],1],
        [["bbbbabbabbaababbbbbaaaaaaabbaa","babba"],3],
        [["baaabaaaabbbbbbbbaaabaaaababbaaabaababab","ab"],3],
        [[{"$concat":[{"$rep":"a","n":999999},"b"]},{"$concat":[{"$rep":"a","n":500},"b"]}],999499],
        [[{"$rep":"ab","n":500000},"ababc"],-1],
        [[{"$concat":[{"$rep":"a","n":99999},"b"]},{"$concat":[{"$rep":"a","n":99999},"b"]}],0]
      ] },
    solution: {
      approach: `<p>Rabin–Karp with a double hash and verification: O(N + M) expected, always correct (Las Vegas style — randomness affects only speed, not the answer).</p>`,
      code: `
        class Solution {
            public int strStr(String haystack, String needle) {
                int n = haystack.length(), m = needle.length();
                if (m == 0) return 0;
                if (m > n) return -1;
                final long M1 = 1_000_000_007L, M2 = 998_244_353L;
                Random rnd = new Random();
                long b1 = 256 + rnd.nextInt(1_000_000), b2 = 256 + rnd.nextInt(1_000_000);
                long p1 = 1, p2 = 1;                                     // B^(m-1)
                for (int i = 1; i < m; i++) { p1 = p1 * b1 % M1; p2 = p2 * b2 % M2; }
                long n1 = 0, n2 = 0, w1 = 0, w2 = 0;
                for (int i = 0; i < m; i++) {
                    n1 = (n1 * b1 + needle.charAt(i)) % M1;   n2 = (n2 * b2 + needle.charAt(i)) % M2;
                    w1 = (w1 * b1 + haystack.charAt(i)) % M1; w2 = (w2 * b2 + haystack.charAt(i)) % M2;
                }
                for (int i = 0; ; i++) {
                    if (w1 == n1 && w2 == n2 && haystack.regionMatches(i, needle, 0, m)) return i;   // verify
                    if (i + m >= n) return -1;
                    w1 = ((w1 - haystack.charAt(i) * p1 % M1 + M1) * b1 + haystack.charAt(i + m)) % M1;
                    w2 = ((w2 - haystack.charAt(i) * p2 % M2 + M2) * b2 + haystack.charAt(i + m)) % M2;
                }
            }
        }`,
      alt: [{ lang: 'python', code: `
import random

class Solution:
    def strStr(self, haystack: str, needle: str) -> int:
        n, m = len(haystack), len(needle)
        if m > n:
            return -1
        MOD = (1 << 61) - 1
        B = random.randrange(256, MOD - 1)
        top = pow(B, m - 1, MOD)
        hn = hw = 0
        for i in range(m):
            hn = (hn * B + ord(needle[i])) % MOD
            hw = (hw * B + ord(haystack[i])) % MOD
        for i in range(n - m + 1):
            if hw == hn and haystack[i:i + m] == needle:
                return i
            if i + m < n:
                hw = ((hw - ord(haystack[i]) * top) * B + ord(haystack[i + m])) % MOD
        return -1` }, { lang: 'js', code: `
function strStr(haystack, needle) {
  const n = haystack.length, m = needle.length;
  if (m > n) return -1;
  const M = 1000000007, B = 256 + Math.floor(Math.random() * 1000000);   // random base
  // a * b mod M without leaving 2^53: split b into 15-bit halves
  const mul = (a, b) => ((a * (b >>> 15)) % M * 32768 + a * (b & 32767)) % M;
  let top = 1;                                                // B^(m-1)
  for (let i = 1; i < m; i++) top = mul(top, B);
  let hn = 0, hw = 0;
  for (let i = 0; i < m; i++) {
    hn = (mul(hn, B) + needle.charCodeAt(i)) % M;
    hw = (mul(hw, B) + haystack.charCodeAt(i)) % M;
  }
  for (let i = 0; ; i++) {
    if (hw === hn && haystack.startsWith(needle, i)) return i;   // verify: a match is always real
    if (i + m >= n) return -1;
    const drop = mul(haystack.charCodeAt(i), top);
    hw = (mul((hw - drop + M) % M, B) + haystack.charCodeAt(i + m)) % M;
  }
}` }, { lang: 'cpp', code: `
class Solution {
    typedef unsigned long long u64;
    static const u64 M = (1ULL << 61) - 1;
    static u64 mul(u64 a, u64 b) { return (u64)((unsigned __int128)a * b % M); }

public:
    int strStr(string haystack, string needle) {
        int n = haystack.size(), m = needle.size();
        if (m > n) return -1;
        mt19937_64 rng(chrono::steady_clock::now().time_since_epoch().count());
        u64 B = 256 + rng() % (M - 512);                      // random base
        u64 top = 1;                                          // B^(m-1)
        for (int i = 1; i < m; i++) top = mul(top, B);
        u64 hn = 0, hw = 0;
        for (int i = 0; i < m; i++) {
            hn = (mul(hn, B) + needle[i]) % M;
            hw = (mul(hw, B) + haystack[i]) % M;
        }
        for (int i = 0;; i++) {
            if (hw == hn && haystack.compare(i, m, needle) == 0) return i;   // verify: a match is always real
            if (i + m >= n) return -1;
            hw = (mul((hw + M - mul(haystack[i], top)) % M, B) + haystack[i + m]) % M;
        }
    }
};` }],
      dry: { head: ['i', 'window', 'hash match?', 'verify', 'result'], rows: [['0', 'sad', 'yes', 'equal', H.c('g', 'return 0')], ['—', '(stop)', '', '', '']] },
      complexity: `<p>O(N + M) expected time, O(1) extra space.</p>`,
      followUps: ['Return <b>all</b> occurrences.', 'Deterministic O(N + M): KMP or Z-function (DSA 9).', 'Search a 2D pattern in a 2D grid with a 2D rolling hash.']
    }
  });

  practice.push({
    title: 'Rotate String', level: 'Easy', tags: ['string matching', 'kmp', 'rotation'], companies: ['Amazon', 'Google'],
    statement: `<p>Given strings <code>s</code> and <code>goal</code>, return <code>true</code> if <code>s</code> can become <code>goal</code> after some number of left rotations (moving the first character to the end).</p>`,
    constraints: `1 ≤ |s|, |goal| ≤ 100 (LeetCode 796); make it O(N) for 10<sup>6</sup>.`,
    example: `<p>s = <code>"abcde"</code>, goal = <code>"cdeab"</code> → <b>true</b>: ${H.c('b', 'ab')}${H.c('g', 'cde')} → ${H.c('g', 'cde')}${H.c('b', 'ab')}. goal = <code>"abced"</code> → <b>false</b>.</p>`,
    brute: { why: `<p>Build all N rotations and compare each with goal: O(N<sup>2</sup>). The waste: every rotation is already sitting inside <code>s + s</code>.</p>`, code: { lang: 'java', code: `
      class Brute {
          boolean rotateString(String s, String goal) {
              if (s.length() != goal.length()) return false;
              for (int k = 0; k < Math.max(1, s.length()); k++)
                  if ((s.substring(k) + s.substring(0, k)).equals(goal)) return true;
              return false;
          }
      }`, alt: [{ lang: 'python', code: String.raw`
class Brute:
    def rotateString(self, s: str, goal: str) -> bool:
        if len(s) != len(goal):
            return False
        for k in range(max(1, len(s))):
            if s[k:] + s[:k] == goal:
                return True
        return False` }, { lang: 'js', code: String.raw`
function rotateString(s, goal) {
  if (s.length !== goal.length) return false;
  for (let k = 0; k < Math.max(1, s.length); k++)
    if (s.substring(k) + s.substring(0, k) === goal) return true;
  return false;
}` }, { lang: 'cpp', code: String.raw`
class Brute {
public:
    bool rotateString(string s, string goal) {
        if (s.size() != goal.size()) return false;
        for (int k = 0; k < max(1, (int)s.size()); k++)
            if (s.substr(k) + s.substr(0, k) == goal) return true;
        return false;
    }
};` }] } },
    mcq: { q: 'Every rotation of s appears as a substring of…', options: ['reverse(s)', 's + s', 's + reverse(s)', 'only s itself'], answer: 1, explain: 'Rotation by k = s[k..] + s[..k], which is s+s starting at index k.' },
    hints: [`<p>Lengths must match. Then goal is a rotation of s ⇔ goal occurs in <code>s + s</code>.</p>`, `<p>Use a linear matcher: prefix function (KMP) on <code>goal + "#" + s + s</code>; a value equal to |goal| means a match.</p>`, `<p>The separator must not occur in the strings. Edge: both empty → true.</p>`],
    tests: { sig: 'string string -> bool', fn: 'rotateString', names: { python: 'rotateString' }, cases: [
        [["abcde","cdeab"],true],
        [["abcde","abced"],false],
        [["a","a"],true],
        [["a","b"],false],
        [["aa","a"],false],
        [["abc","abc"],true],
        [["abab","baba"],true],
        [["abab","abba"],false],
        [["ab","ba"],true],
        [["abc","cab"],true],
        [["abc","bca"],true],
        [["abc","acb"],false],
        [["aaaa","aaaa"],true],
        [["abaab","abaab"],true],
        [["bba","bab"],true],
        [["bbbaab","bbbaab"],true],
        [[{"$concat":[{"$rep":"a","n":499999},"b"]},{"$concat":["b",{"$rep":"a","n":499999}]}],true],
        [[{"$rep":"a","n":1000000},{"$concat":[{"$rep":"a","n":999999},"b"]}],false],
        [[{"$concat":[{"$rep":"a","n":500000},"b",{"$rep":"a","n":499999}]},{"$concat":[{"$rep":"a","n":499999},"b",{"$rep":"a","n":500000}]}],true]
      ] },
    solution: {
      approach: `<p>Reduce to substring search in the doubled string and solve with KMP’s prefix function in O(N). (A double-hash Rabin–Karp works too.)</p>`,
      code: `
        class Solution {
            public boolean rotateString(String s, String goal) {
                if (s.length() != goal.length()) return false;
                if (s.isEmpty()) return true;
                String t = goal + "#" + s + s;
                int[] pi = new int[t.length()];
                for (int i = 1; i < t.length(); i++) {
                    int k = pi[i - 1];
                    while (k > 0 && t.charAt(i) != t.charAt(k)) k = pi[k - 1];
                    if (t.charAt(i) == t.charAt(k)) k++;
                    pi[i] = k;
                    if (k == goal.length()) return true;          // goal found inside s + s
                }
                return false;
            }
        }`,
      alt: [{ lang: 'python', code: `
class Solution:
    def rotateString(self, s: str, goal: str) -> bool:
        return len(s) == len(goal) and goal in s + s` }, { lang: 'js', code: `
function rotateString(s, goal) {
  if (s.length !== goal.length) return false;
  if (s.length === 0) return true;
  const t = goal + '#' + s + s;                                // KMP prefix function over goal # s+s
  const pi = new Int32Array(t.length);
  for (let i = 1; i < t.length; i++) {
    let k = pi[i - 1];
    while (k > 0 && t[i] !== t[k]) k = pi[k - 1];
    if (t[i] === t[k]) k++;
    pi[i] = k;
    if (k === goal.length) return true;                        // goal found inside s + s
  }
  return false;
}` }, { lang: 'cpp', code: `
class Solution {
public:
    bool rotateString(string s, string goal) {
        if (s.size() != goal.size()) return false;
        if (s.empty()) return true;
        string t = goal + "#" + s + s;                         // KMP prefix function over goal # s+s
        vector<int> pi(t.size(), 0);
        for (size_t i = 1; i < t.size(); i++) {
            int k = pi[i - 1];
            while (k > 0 && t[i] != t[k]) k = pi[k - 1];
            if (t[i] == t[k]) k++;
            pi[i] = k;
            if (k == (int)goal.size()) return true;            // goal found inside s + s
        }
        return false;
    }
};` }],
      dry: { head: ['step', 'value'], rows: [['s + s', 'abcdeabcde'], ['search "cdeab"', 'found at index 2 → <b>true</b>']] },
      complexity: `<p>O(N) time and space.</p>`,
      followUps: ['Return the minimum number of rotations needed.', 'Count how many rotations of s equal goal (all matches in s + s minus the last).']
    }
  });

  practice.push({
    title: 'Repeated Substring Pattern', level: 'Easy', tags: ['prefix function', 'period', 'hashing'], companies: ['Amazon', 'Google'],
    statement: `<p>Return <code>true</code> if <code>s</code> can be built by repeating one of its proper substrings two or more times.</p>`,
    constraints: `1 ≤ |s| ≤ 10<sup>4</sup> (LeetCode 459)`,
    example: `<p><code>"abab"</code> → <b>true</b> (${H.c('g', 'ab')} × 2). <code>"aba"</code> → <b>false</b>. <code>"abcabcabcabc"</code> → <b>true</b> (${H.c('g', 'abc')} × 4).</p>`,
    brute: { why: `<p>For every divisor d of N, rebuild <code>s[0..d) × (N/d)</code> and compare: O(N · number of divisors), fine here, but the string-building wastes memory. A period test does it in one pass.</p>`, code: { lang: 'java', code: `
      class Brute {
          boolean repeatedSubstringPattern(String s) {
              int n = s.length();
              for (int d = 1; d <= n / 2; d++) {
                  if (n % d != 0) continue;
                  if (s.substring(0, d).repeat(n / d).equals(s)) return true;
              }
              return false;
          }
      }`, alt: [{ lang: 'python', code: String.raw`
class Brute:
    def repeatedSubstringPattern(self, s: str) -> bool:
        n = len(s)
        for d in range(1, n // 2 + 1):
            if n % d != 0:
                continue
            if s[:d] * (n // d) == s:
                return True
        return False` }, { lang: 'js', code: String.raw`
function repeatedSubstringPattern(s) {
  const n = s.length;
  for (let d = 1; d <= Math.floor(n / 2); d++) {
    if (n % d !== 0) continue;
    if (s.substring(0, d).repeat(n / d) === s) return true;
  }
  return false;
}` }, { lang: 'cpp', code: String.raw`
class Brute {
public:
    bool repeatedSubstringPattern(const string& s) {
        int n = s.size();
        for (int d = 1; d <= n / 2; d++) {
            if (n % d != 0) continue;
            string built;
            for (int r = 0; r < n / d; r++) built += s.substr(0, d);
            if (built == s) return true;
        }
        return false;
    }
};` }] } },
    mcq: { q: 'The longest proper border (prefix = suffix) of s has length b. The smallest period is…', options: ['b', 'n − b', 'n / b', 'n + b'], answer: 1, explain: 'If s[0..b) = s[n−b..n), shifting s by n − b lines it up with itself, so n − b is a period, and the longest border gives the smallest period.' },
    hints: [`<p>s is a repetition ⇔ its smallest period p divides n and p &lt; n.</p>`, `<p>Prefix function: b = π[n−1] is the longest border; smallest period p = n − b.</p>`, `<p>Return b &gt; 0 && n % (n − b) == 0. Check: <code>"abcab"</code> has b = 2, p = 3, 5 % 3 ≠ 0 → false.</p>`],
    tests: { sig: 'string -> bool', fn: 'repeatedSubstringPattern', names: { python: 'repeatedSubstringPattern' }, cases: [
        [["abab"],true],
        [["aba"],false],
        [["abcabcabcabc"],true],
        [["a"],false],
        [["aa"],true],
        [["ab"],false],
        [["abcab"],false],
        [["aabaab"],true],
        [["aabaaba"],false],
        [["abaababaab"],true],
        [["zzzz"],true],
        [["abcabd"],false],
        [["babbaba"],false],
        [["bbbabbbaab"],false],
        [["baaba"],false],
        [[{"$rep":"a","n":10000}],true],
        [[{"$concat":[{"$rep":"a","n":9999},"b"]}],false],
        [[{"$rep":"abcde","n":2000}],true]
      ] },
    solution: {
      approach: `<p>Compute the prefix function; the smallest period is n − π[n−1]. s is a power of a shorter string iff that period divides n (and the border is non-empty).</p>`,
      code: `
        class Solution {
            public boolean repeatedSubstringPattern(String s) {
                int n = s.length();
                int[] pi = new int[n];
                for (int i = 1; i < n; i++) {
                    int k = pi[i - 1];
                    while (k > 0 && s.charAt(i) != s.charAt(k)) k = pi[k - 1];
                    if (s.charAt(i) == s.charAt(k)) k++;
                    pi[i] = k;
                }
                int border = pi[n - 1], period = n - border;
                return border > 0 && n % period == 0;
            }
        }`,
      alt: [{ lang: 'python', code: `
class Solution:
    def repeatedSubstringPattern(self, s: str) -> bool:
        # s is periodic iff s appears in (s+s) with the first and last char removed
        return s in (s + s)[1:-1]` }, { lang: 'js', code: `
function repeatedSubstringPattern(s) {
  const n = s.length;
  const pi = new Int32Array(n);                                // KMP prefix function
  for (let i = 1; i < n; i++) {
    let k = pi[i - 1];
    while (k > 0 && s[i] !== s[k]) k = pi[k - 1];
    if (s[i] === s[k]) k++;
    pi[i] = k;
  }
  const border = pi[n - 1], period = n - border;
  return border > 0 && n % period === 0;
}` }, { lang: 'cpp', code: `
class Solution {
public:
    bool repeatedSubstringPattern(const string& s) {
        int n = s.size();
        vector<int> pi(n, 0);                                  // KMP prefix function
        for (int i = 1; i < n; i++) {
            int k = pi[i - 1];
            while (k > 0 && s[i] != s[k]) k = pi[k - 1];
            if (s[i] == s[k]) k++;
            pi[i] = k;
        }
        int border = pi[n - 1], period = n - border;
        return border > 0 && n % period == 0;
    }
};` }],
      dry: { head: ['s', 'π[n−1]', 'period', 'n % period', 'answer'], rows: [['abab', '2', '2', '0', H.c('g', 'true')], ['aba', '1', '2', '1', H.c('r', 'false')], ['abcabcabcabc', '9', '3', '0', H.c('g', 'true')]] },
      complexity: `<p>O(N) time and space.</p>`,
      followUps: ['Return the shortest repeating unit.', 'Answer the question for every prefix of s.']
    }
  });

  practice.push({
    title: 'Longest Palindromic Substring (in O(N))', level: 'Medium', tags: ['manacher', 'palindrome'], companies: ['Amazon', 'Microsoft', 'Adobe', 'Google'],
    statement: `<p>Return the longest palindromic substring of <code>s</code> (any one if several).</p>`,
    constraints: `1 ≤ |s| ≤ 1000 on LeetCode 5; your solution should handle 10<sup>6</sup>.`,
    example: `<p><code>"babad"</code> → <b>"bab"</b> (or "aba"). <code>"cbbd"</code> → <b>"bb"</b> (even length, centered on a gap).</p>`,
    brute: { why: `<p>Check all O(N<sup>2</sup>) substrings in O(N) each → O(N<sup>3</sup>). Expand-around-center is O(N<sup>2</sup>) — accepted at N = 1000 but 10<sup>12</sup> steps at 10<sup>6</sup> on <code>"aaa…a"</code>.</p>`, code: { lang: 'java', code: `
      class Brute {
          String longestPalindrome(String s) {
              String best = "";
              for (int i = 0; i < s.length(); i++)
                  for (int j = i; j < s.length(); j++) {
                      int l = i, r = j;
                      while (l < r && s.charAt(l) == s.charAt(r)) { l++; r--; }
                      if (l >= r && j - i + 1 > best.length()) best = s.substring(i, j + 1);
                  }
              return best;
          }
      }`, alt: [{ lang: 'python', code: String.raw`
class Brute:
    def longestPalindrome(self, s: str) -> str:
        best = ""
        for i in range(len(s)):
            for j in range(i, len(s)):
                l, r = i, j
                while l < r and s[l] == s[r]:
                    l += 1
                    r -= 1
                if l >= r and j - i + 1 > len(best):
                    best = s[i:j + 1]
        return best` }, { lang: 'js', code: String.raw`
function longestPalindrome(s) {
  let best = "";
  for (let i = 0; i < s.length; i++)
    for (let j = i; j < s.length; j++) {
      let l = i, r = j;
      while (l < r && s[l] === s[r]) { l++; r--; }
      if (l >= r && j - i + 1 > best.length) best = s.substring(i, j + 1);
    }
  return best;
}` }, { lang: 'cpp', code: String.raw`
class Brute {
public:
    string longestPalindrome(const string& s) {
        string best = "";
        for (int i = 0; i < (int)s.size(); i++)
            for (int j = i; j < (int)s.size(); j++) {
                int l = i, r = j;
                while (l < r && s[l] == s[r]) { l++; r--; }
                if (l >= r && j - i + 1 > (int)best.size()) best = s.substr(i, j - i + 1);
            }
        return best;
    }
};` }] } },
    mcq: { q: 'In the #-padded string, P[i] = 4 at i = 6. The palindrome in s is…', options: ['s[1..4]', 's[3..6]', 's[1..5]', 's[6..10]'], answer: 0, explain: 'Start = (i − P[i]) / 2 = (6 − 4)/2 = 1, length 4 → s[1..4].' },
    hints: [`<p>Pad with <code>#</code> so every palindrome has a center cell; P[i] then equals the palindrome’s length in s.</p>`, `<p>Manacher: keep the rightmost palindrome [C − P[C], R]; inside it start from min(P[2C − i], R − i), then expand.</p>`, `<p>Track the argmax of P; start = (i − P[i]) / 2, length = P[i]. Single character strings return themselves.</p>`],
    tests: { sig: 'string -> string', fn: 'longestPalindrome', names: { python: 'longestPalindrome' }, check: "(args, out, exp) => { const s = args[0]; if (typeof out !== 'string' || out.length !== exp.length) return false; if (s.indexOf(out) < 0) return false; for (let i = 0, j = out.length - 1; i < j; i++, j--) if (out[i] !== out[j]) return false; return true; }", cases: [
        [["babad"],"bab"],
        [["cbbd"],"bb"],
        [["a"],"a"],
        [["ac"],"a"],
        [["aaaa"],"aaaa"],
        [["forgeeksskeegfor"],"geeksskeeg"],
        [["abacdfgdcaba"],"aba"],
        [["bb"],"bb"],
        [["abcda"],"a"],
        [["xabax"],"xabax"],
        [["bbbbbaaaaabaa"],"baaaaab"],
        [["abbbbbaabaaabbbbaaabbabbbbbbabbba"],"baaabbbbaaab"],
        [["bbabababaaaababaaaaabb"],"ababaaaababa"],
        [["ccbcbaabaacbaacccacacbccbcaacbbcacacccaacccacccbcaabacaacacb"],"cacccaacccac"],
        [[{"$rep":"a","n":1000000}],{"$rep":"a","n":1000000}],
        [[{"$rep":"ab","n":500000}],{"$concat":[{"$rep":"ab","n":499999},"a"]}],
        [[{"$concat":[{"$rep":"a","n":400000},"b",{"$rep":"a","n":500000}]}],{"$concat":[{"$rep":"a","n":400000},"b",{"$rep":"a","n":400000}]}]
      ] },
    solution: {
      approach: `<p>Manacher’s algorithm: one left-to-right pass over the padded string, reusing mirror radii inside the current rightmost palindrome. O(N).</p>`,
      code: `
        class Solution {
            public String longestPalindrome(String s) {
                int n = s.length(), m = 2 * n + 1;
                char[] t = new char[m];
                for (int i = 0; i < m; i++) t[i] = (i % 2 == 0) ? '#' : s.charAt(i / 2);
                int[] p = new int[m];
                int c = 0, r = -1, best = 0, center = 0;
                for (int i = 0; i < m; i++) {
                    int k = (i > r) ? 0 : Math.min(p[2 * c - i], r - i);
                    while (i - k - 1 >= 0 && i + k + 1 < m && t[i - k - 1] == t[i + k + 1]) k++;
                    p[i] = k;
                    if (i + k > r) { c = i; r = i + k; }
                    if (k > best) { best = k; center = i; }
                }
                int start = (center - best) / 2;
                return s.substring(start, start + best);
            }
        }`,
      alt: [{ lang: 'python', code: `
class Solution:
    def longestPalindrome(self, s: str) -> str:
        t = '#' + '#'.join(s) + '#'
        m, p, c, r = len(t), [0] * len(t), 0, -1
        for i in range(m):
            k = 0 if i > r else min(p[2 * c - i], r - i)
            while i - k - 1 >= 0 and i + k + 1 < m and t[i - k - 1] == t[i + k + 1]:
                k += 1
            p[i] = k
            if i + k > r:
                c, r = i, i + k
        i = max(range(m), key=p.__getitem__)
        start = (i - p[i]) // 2
        return s[start:start + p[i]]` }, { lang: 'js', code: `
function longestPalindrome(s) {
  const m = 2 * s.length + 1;
  const at = (i) => (i % 2 === 0 ? 35 : s.charCodeAt(i >> 1));   // "#a#b#..." without building it
  const p = new Int32Array(m);
  let c = 0, r = -1, best = 0, center = 0;
  for (let i = 0; i < m; i++) {
    let k = i > r ? 0 : Math.min(p[2 * c - i], r - i);
    while (i - k - 1 >= 0 && i + k + 1 < m && at(i - k - 1) === at(i + k + 1)) k++;
    p[i] = k;
    if (i + k > r) { c = i; r = i + k; }
    if (k > best) { best = k; center = i; }
  }
  const start = (center - best) >> 1;
  return s.substring(start, start + best);
}` }, { lang: 'cpp', code: `
class Solution {
public:
    string longestPalindrome(const string& s) {
        string t = "#";
        for (char ch : s) { t += ch; t += '#'; }
        int m = t.size(), c = 0, r = -1, best = 0, center = 0;
        vector<int> p(m, 0);
        for (int i = 0; i < m; i++) {
            int k = (i > r) ? 0 : min(p[2 * c - i], r - i);
            while (i - k - 1 >= 0 && i + k + 1 < m && t[i - k - 1] == t[i + k + 1]) k++;
            p[i] = k;
            if (i + k > r) { c = i; r = i + k; }
            if (k > best) { best = k; center = i; }
        }
        return s.substr((center - best) / 2, best);
    }
};` }],
      dry: { head: ['i', 't[i]', 'P[i]', 'best'], rows: [['1', 'c', '1', '1'], ['3', 'b', '1', '1'], ['4', '#', '2', H.c('g', '2 → "bb"')], ['5', 'b', '1', '2']] },
      complexity: `<p>O(N) time, O(N) space.</p>`,
      followUps: ['Return the longest palindromic substring of every prefix.', 'Longest palindromic <b>subsequence</b> — that is DP, not Manacher (DSA 17).']
    }
  });

  practice.push({
    title: 'Repeated DNA Sequences (perfect rolling hash)', level: 'Medium', tags: ['rolling hash', 'bit manipulation', 'hashset'], companies: ['LinkedIn', 'Amazon', 'Google'],
    statement: `<p>DNA is a string over <code>A, C, G, T</code>. Return all 10-letter-long sequences that occur more than once (any order).</p>`,
    constraints: `1 ≤ |s| ≤ 10<sup>5</sup> (LeetCode 187)`,
    example: `<p><code>"AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT"</code> → <b>["AAAAACCCCC", "CCCCCAAAAA"]</b>. <code>"AAAAAAAAAAAAA"</code> → <b>["AAAAAAAAAA"]</b> (reported once even though it appears 4 times).</p>`,
    brute: { why: `<p>Put every 10-letter <code>substring</code> into a hash map of substring to count: correct, but creates 10<sup>5</sup> string objects and hashes 10 chars each time. Works, yet wastes memory and time; the alphabet has only 4 letters, so 10 letters fit in <b>20 bits</b>.</p>`, code: { lang: 'java', code: `
      class Brute {
          List<String> findRepeatedDnaSequences(String s) {
              Map<String, Integer> cnt = new HashMap<>();
              List<String> res = new ArrayList<>();
              for (int i = 0; i + 10 <= s.length(); i++) {
                  String sub = s.substring(i, i + 10);
                  if (cnt.merge(sub, 1, Integer::sum) == 2) res.add(sub);
              }
              return res;
          }
      }`, alt: [{ lang: 'python', code: String.raw`
class Brute:
    def findRepeatedDnaSequences(self, s: str):
        cnt = {}
        res = []
        for i in range(len(s) - 9):
            sub = s[i:i + 10]
            cnt[sub] = cnt.get(sub, 0) + 1
            if cnt[sub] == 2:
                res.append(sub)
        return res` }, { lang: 'js', code: String.raw`
function findRepeatedDnaSequences(s) {
  const cnt = new Map(), res = [];
  for (let i = 0; i + 10 <= s.length; i++) {
    const sub = s.substring(i, i + 10);
    const c = (cnt.get(sub) || 0) + 1;
    cnt.set(sub, c);
    if (c === 2) res.push(sub);
  }
  return res;
}` }, { lang: 'cpp', code: String.raw`
class Brute {
public:
    vector<string> findRepeatedDnaSequences(const string& s) {
        unordered_map<string, int> cnt;
        vector<string> res;
        for (int i = 0; i + 10 <= (int)s.size(); i++) {
            string sub = s.substr(i, 10);
            if (++cnt[sub] == 2) res.push_back(sub);
        }
        return res;
    }
};` }] } },
    mcq: { q: 'Why can this rolling hash never collide?', options: ['Because the modulus is prime', 'Because 2 bits per letter × 10 letters = 20 bits encode the window exactly (injective)', 'Because DNA is random', 'It can collide'], answer: 1, explain: 'With base 4 and no modulus overflow (4<sup>10</sup> = 2<sup>20</sup> fits in an int), the hash is just the window written in base 4 — a perfect encoding.' },
    hints: [`<p>Map A, C, G, T to 0..3. A window of 10 letters is a 20-bit number.</p>`, `<p>Roll with <code>mask = ((mask &lt;&lt; 2) | code) &amp; ((1 &lt;&lt; 20) − 1)</code>. Keep a seen-set and an added-set of ints.</p>`, `<p>Report a window when it is seen for the second time only. Strings shorter than 10 → empty list.</p>`],
    tests: { sig: 'string -> list<string>', fn: 'findRepeatedDnaSequences', cmp: 'set', names: { python: 'findRepeatedDnaSequences' }, cases: [
        [["AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT"],["AAAAACCCCC","CCCCCAAAAA"]],
        [["AAAAAAAAAAAAA"],["AAAAAAAAAA"]],
        [["ACGT"],[]],
        [["AAAAAAAAAA"],[]],
        [["ACGTACGTAC"],[]],
        [["AAAAAAAAAAA"],["AAAAAAAAAA"]],
        [["ACGTACGTACGT"],[]],
        [["GGGGGGGGGGGGGGGGGGGG"],["GGGGGGGGGG"]],
        [["ACGTTGCAACACGTTGCAAC"],["ACGTTGCAAC"]],
        [["ACCCCCAAACCAAACACACCCCCCAACCCAAAAAAAAACACCACAAAAAAACCCCAAAACCACAACAACCAACACACCAACCACCAACAAAACCCCCACAACAACCCCCCACAACCCACAAACCCACACACAAAACACCAAACAAAAAAACAACACCCACAACAACACCACCCACCAACCCAACCCCAACACCAAAAACC"],["ACAAAAAAAC","CCACAACAAC","CACAACAACC","CCCCCACAAC","CCCACAACAA"]],
        [["CAAGAATACAACCCATCGGGGCGGCGAAGTCCTTGTCGTGACCTCCACTGACGGCATCCCCGCTACCCTTAACGCGCAATTAATTGTGCCAGGATAAATTAACGCCCCAGAGTAGCATCTACCTCCTAAGCGGACTTGGTACACTATTATCCGATCGGCACAGCTAAGCGGTCGGAAATCATGCGCGCCTAAATGTGTTCATAGACCGACGACGAGCAACGTGAGCTAATCCAGCCTAGCCATGTACGATTCCAAACCATTACGTACAGGATGCTGGTCGCGAACGAGGATGGCATCCGCGGTCGCTGCCCGAGTGAGAGTGTTAGTCAGTGGCCCCCGATTCGGAGCCCCGCAGTGCAGAATTATATTCAAACCCGCAACACAAATCAGACCTGAGGAGTAAACCTTCTTATCAACCGGACACCCGGTGTTCGGGACCCTAAGCGTCGTATATGAGACTTAACACAAAGGTCGGAGCTTCAAGTCCTTCCGACTACGAA"],[]],
        [[{"$rep":"ACGTTGCAAC","n":10000}],["ACGTTGCAAC","CGTTGCAACA","GTTGCAACAC","TTGCAACACG","TGCAACACGT","GCAACACGTT","CAACACGTTG","AACACGTTGC","ACACGTTGCA","CACGTTGCAA"]],
        [[{"$rep":"A","n":100000}],["AAAAAAAAAA"]],
        [[{"$concat":[{"$rep":"AACCGGTTAC","n":5000},{"$rep":"ACGTTGCAAC","n":5000}]}],["AACCGGTTAC","ACCGGTTACA","CCGGTTACAA","CGGTTACAAC","GGTTACAACC","GTTACAACCG","TTACAACCGG","TACAACCGGT","ACAACCGGTT","CAACCGGTTA","ACACGTTGCA","CACGTTGCAA","ACGTTGCAAC","CGTTGCAACA","GTTGCAACAC","TTGCAACACG","TGCAACACGT","GCAACACGTT","CAACACGTTG","AACACGTTGC"]]
      ] },
    solution: {
      approach: `<p>Base-4 rolling hash with no modulus = exact encoding. One pass, O(1) per step, ints instead of Strings.</p>`,
      code: `
        class Solution {
            public List<String> findRepeatedDnaSequences(String s) {
                List<String> res = new ArrayList<>();
                int n = s.length();
                if (n < 10) return res;
                int[] code = new int[128];
                code['C'] = 1; code['G'] = 2; code['T'] = 3;           // 'A' stays 0
                Set<Integer> seen = new HashSet<>(), added = new HashSet<>();
                int mask = 0, full = (1 << 20) - 1;
                for (int i = 0; i < n; i++) {
                    mask = ((mask << 2) | code[s.charAt(i)]) & full;   // slide: drop 2 old bits, add 2 new
                    if (i >= 9 && !seen.add(mask) && added.add(mask)) res.add(s.substring(i - 9, i + 1));
                }
                return res;
            }
        }`,
      alt: [{ lang: 'python', code: `
class Solution:
    def findRepeatedDnaSequences(self, s: str):
        code = {'A': 0, 'C': 1, 'G': 2, 'T': 3}
        seen, out, mask = set(), set(), 0
        for i, ch in enumerate(s):
            mask = ((mask << 2) | code[ch]) & ((1 << 20) - 1)
            if i >= 9:
                if mask in seen:
                    out.add(s[i - 9:i + 1])
                seen.add(mask)
        return list(out)` }, { lang: 'js', code: `
function findRepeatedDnaSequences(s) {
  const n = s.length, res = [];
  if (n < 10) return res;
  const code = { A: 0, C: 1, G: 2, T: 3 };
  const seen = new Set(), added = new Set();
  const full = (1 << 20) - 1;
  let mask = 0;
  for (let i = 0; i < n; i++) {
    mask = ((mask << 2) | code[s[i]]) & full;                   // slide: drop 2 old bits, add 2 new
    if (i >= 9) {
      if (seen.has(mask) && !added.has(mask)) { added.add(mask); res.push(s.substring(i - 9, i + 1)); }
      seen.add(mask);
    }
  }
  return res;
}` }, { lang: 'cpp', code: `
class Solution {
public:
    vector<string> findRepeatedDnaSequences(const string& s) {
        vector<string> res;
        int n = s.size();
        if (n < 10) return res;
        auto code = [](char ch) { return ch == 'A' ? 0 : ch == 'C' ? 1 : ch == 'G' ? 2 : 3; };
        vector<char> state(1 << 20, 0);                         // 0 = unseen, 1 = seen once, 2 = reported
        int mask = 0, full = (1 << 20) - 1;
        for (int i = 0; i < n; i++) {
            mask = ((mask << 2) | code(s[i])) & full;            // slide: drop 2 old bits, add 2 new
            if (i >= 9) {
                if (state[mask] == 1) { state[mask] = 2; res.push_back(s.substr(i - 9, 10)); }
                else if (state[mask] == 0) state[mask] = 1;
            }
        }
        return res;
    }
};` }],
      dry: { head: ['i', 'window', 'mask seen before?', 'action'], rows: [['9', 'AAAAACCCCC', 'no', 'add to seen'], ['14', 'CCCCCAAAAA', 'no', 'add to seen'], ['19', 'AAAAACCCCC', H.c('g', 'yes'), 'report'], ['25', 'CCCCCAAAAA', H.c('g', 'yes'), 'report']] },
      complexity: `<p>O(N) time, O(N) space (ints).</p>`,
      followUps: ['Window length k = 32 → 64-bit masks; k = 40 → need a real modular hash or two longs.', 'Return each sequence with its count.']
    }
  });

  practice.push({
    title: 'Longest Happy Prefix', level: 'Medium', tags: ['double hashing', 'prefix function', 'border'], companies: ['Google', 'Amazon'],
    statement: `<p>A <b>happy prefix</b> is a non-empty prefix that is also a suffix (excluding the whole string). Return the longest happy prefix of <code>s</code>, or <code>""</code>.</p>`,
    constraints: `1 ≤ |s| ≤ 10<sup>5</sup> (LeetCode 1392)`,
    example: `<p><code>"level"</code> → <b>"l"</b>. <code>"ababab"</code> → <b>"abab"</b> (prefix ${H.c('g', 'abab')}ab, suffix ab${H.c('g', 'abab')} — they overlap, that is allowed).</p>`,
    brute: { why: `<p>For each length L from N−1 down, compare prefix and suffix of length L: O(N<sup>2</sup>) = 10<sup>10</sup> on <code>"aaaa…ab"</code>. The waste: re-comparing the same characters for every L.</p>`, code: { lang: 'java', code: `
      class Brute {
          String longestPrefix(String s) {
              int n = s.length();
              for (int len = n - 1; len > 0; len--)
                  if (s.regionMatches(0, s, n - len, len)) return s.substring(0, len);
              return "";
          }
      }`, alt: [{ lang: 'python', code: String.raw`
class Brute:
    def longestPrefix(self, s: str) -> str:
        n = len(s)
        for length in range(n - 1, 0, -1):
            if s[:length] == s[n - length:]:
                return s[:length]
        return ""` }, { lang: 'js', code: String.raw`
function longestPrefix(s) {
  const n = s.length;
  for (let len = n - 1; len > 0; len--)
    if (s.substring(0, len) === s.substring(n - len)) return s.substring(0, len);
  return "";
}` }, { lang: 'cpp', code: String.raw`
class Brute {
public:
    string longestPrefix(const string& s) {
        int n = s.size();
        for (int len = n - 1; len > 0; len--)
            if (s.compare(0, len, s, n - len, len) == 0) return s.substr(0, len);
        return "";
    }
};` }] } },
    mcq: { q: 'How do you extend the SUFFIX hash from length L−1 to L (new char z = s[n−L] is added on the LEFT)?', options: ['suf = suf·B + z', 'suf = z·B<sup>L−1</sup> + suf', 'suf = suf + z', 'suf = (suf − z)/B'], answer: 1, explain: 'The new leftmost char is the most significant digit of the length-L suffix, so it is multiplied by B<sup>L−1</sup>.' },
    hints: [`<p>Grow the prefix hash on the right (×B + c) and the suffix hash on the left (c·B<sup>L−1</sup> + old) at the same time.</p>`, `<p>Whenever both hashes agree (two moduli, random bases), remember L. The last such L is the answer.</p>`, `<p>Deterministic alternative: π[n−1] from the prefix function is exactly the answer length.</p>`],
    tests: { sig: 'string -> string', fn: 'longestPrefix', names: { python: 'longestPrefix' }, cases: [
        [["level"],"l"],
        [["ababab"],"abab"],
        [["a"],""],
        [["ab"],""],
        [["aaaa"],"aaa"],
        [["abcabc"],"abc"],
        [["leetcodeleet"],"leet"],
        [["aabaaab"],"aab"],
        [["abcdef"],""],
        [["aa"],"a"],
        [["bababbbbabaabbabaaaabaabaaaaab"],"b"],
        [["abbbbbbbb"],""],
        [["aabaaaababbbaaabaabaabbb"],""],
        [[{"$rep":"a","n":100000}],{"$rep":"a","n":99999}],
        [[{"$rep":"ab","n":50000}],{"$rep":"ab","n":49999}],
        [[{"$concat":[{"$rep":"a","n":99999},"b"]}],""],
        [[{"$concat":["b",{"$rep":"a","n":99998},"b"]}],"b"]
      ] },
    solution: {
      approach: `<p>Simultaneous prefix/suffix double hashing in one pass; O(N). The prefix function gives the same answer deterministically and is worth mentioning.</p>`,
      code: `
        class Solution {
            public String longestPrefix(String s) {
                int n = s.length();
                final long M1 = 1_000_000_007L, M2 = 998_244_353L;
                Random rnd = new Random();
                long b1 = 131 + rnd.nextInt(1_000_000), b2 = 131 + rnd.nextInt(1_000_000);
                long pre1 = 0, pre2 = 0, suf1 = 0, suf2 = 0, pw1 = 1, pw2 = 1;
                int best = 0;
                for (int len = 1; len < n; len++) {
                    int a = s.charAt(len - 1), z = s.charAt(n - len);
                    pre1 = (pre1 * b1 + a) % M1;      pre2 = (pre2 * b2 + a) % M2;      // append right
                    suf1 = (z * pw1 + suf1) % M1;     suf2 = (z * pw2 + suf2) % M2;     // prepend left
                    pw1 = pw1 * b1 % M1;              pw2 = pw2 * b2 % M2;
                    if (pre1 == suf1 && pre2 == suf2) best = len;
                }
                return s.substring(0, best);
            }
        }`,
      alt: [{ lang: 'python', code: `
class Solution:
    def longestPrefix(self, s: str) -> str:
        pi = [0] * len(s)                       # deterministic: prefix function
        for i in range(1, len(s)):
            k = pi[i - 1]
            while k and s[i] != s[k]:
                k = pi[k - 1]
            if s[i] == s[k]:
                k += 1
            pi[i] = k
        return s[:pi[-1]]` }, { lang: 'js', code: `
function longestPrefix(s) {
  const n = s.length;
  const pi = new Int32Array(n);                                // KMP prefix function: pi[n-1] = longest border
  for (let i = 1; i < n; i++) {
    let k = pi[i - 1];
    while (k > 0 && s[i] !== s[k]) k = pi[k - 1];
    if (s[i] === s[k]) k++;
    pi[i] = k;
  }
  return s.substring(0, pi[n - 1]);
}` }, { lang: 'cpp', code: `
class Solution {
public:
    string longestPrefix(const string& s) {
        int n = s.size();
        vector<int> pi(n, 0);                                  // KMP prefix function: pi[n-1] = longest border
        for (int i = 1; i < n; i++) {
            int k = pi[i - 1];
            while (k > 0 && s[i] != s[k]) k = pi[k - 1];
            if (s[i] == s[k]) k++;
            pi[i] = k;
        }
        return s.substr(0, pi[n - 1]);
    }
};` }],
      dry: { head: ['L', 'prefix', 'suffix', 'equal?', 'best'], rows: [['1', 'a', 'b', 'no', '0'], ['2', 'ab', 'ab', 'yes', '2'], ['3', 'aba', 'bab', 'no', '2'], ['4', 'abab', 'abab', 'yes', H.c('g', '4')], ['5', 'ababa', 'babab', 'no', '4']] },
      complexity: `<p>O(N) time, O(1) extra space.</p>`,
      followUps: ['Count all happy prefixes (all borders) — follow the π chain.', 'Longest prefix that is also a suffix of a <b>different</b> string t.']
    }
  });

  practice.push({
    title: 'Palindrome Range Queries', level: 'Medium', tags: ['manacher', 'queries', 'palindrome'], companies: ['Google', 'Uber'],
    statement: `<p>Given a string <code>s</code> and Q queries <code>[l, r]</code> (0-based, inclusive), answer for each query whether <code>s[l..r]</code> is a palindrome.</p>`,
    constraints: `1 ≤ |s| ≤ 10<sup>6</sup>, 1 ≤ Q ≤ 10<sup>6</sup>`,
    example: `<p>s = <code>"abacaba"</code>, queries [[0,6], [1,5], [0,1], [2,4]] → <b>[true, true, false, true]</b> (${H.c('g', 'abacaba')}, ${H.c('g', 'bacab')}, ${H.c('r', 'ab')}, ${H.c('g', 'aca')}).</p>`,
    brute: { why: `<p>Two pointers per query: O(r − l) each → up to 10<sup>12</sup> total. The waste: the same palindromes are re-verified across overlapping queries.</p>`, code: { lang: 'java', code: `
      class Brute {
          boolean[] answer(String s, int[][] qs) {
              boolean[] res = new boolean[qs.length];
              for (int k = 0; k < qs.length; k++) {
                  int l = qs[k][0], r = qs[k][1];
                  while (l < r && s.charAt(l) == s.charAt(r)) { l++; r--; }
                  res[k] = l >= r;
              }
              return res;
          }
      }`, alt: [{ lang: 'python', code: String.raw`
def answer(s, queries):
    res = []
    for l, r in queries:
        while l < r and s[l] == s[r]:
            l += 1
            r -= 1
        res.append(l >= r)
    return res` }, { lang: 'js', code: String.raw`
function answer(s, queries) {
  const res = new Array(queries.length);
  for (let k = 0; k < queries.length; k++) {
    let [l, r] = queries[k];
    while (l < r && s[l] === s[r]) { l++; r--; }
    res[k] = l >= r;
  }
  return res;
}` }, { lang: 'cpp', code: String.raw`
class Brute {
public:
    vector<bool> answer(const string& s, const vector<vector<int>>& queries) {
        vector<bool> res(queries.size());
        for (int k = 0; k < (int)queries.size(); k++) {
            int l = queries[k][0], r = queries[k][1];
            while (l < r && s[l] == s[r]) { l++; r--; }
            res[k] = l >= r;
        }
        return res;
    }
};` }] } },
    mcq: { q: 'Which index of the #-padded P array decides query [l, r]?', options: ['l + r', 'l + r + 1', '2l + 1', '(l + r) / 2'], answer: 1, explain: 's[k] sits at t[2k + 1], so the center of s[l..r] in t is (2l + 1 + 2r + 1)/2 = l + r + 1.' },
    hints: [`<p>Run Manacher once. Every query is about a fixed center in the padded string.</p>`, `<p>s[l..r] is a palindrome ⇔ the maximal palindrome at its center is at least as long: P[l + r + 1] ≥ r − l + 1.</p>`, `<p>Use fast I/O for 10<sup>6</sup> queries. Single-character queries are always true (P ≥ 1 at letter cells).</p>`],
    tests: { sig: 'string int[][] -> bool[]', fn: 'answer', cases: [
        [["abacaba",[[0,6],[1,5],[0,1],[2,4]]],[true,true,false,true]],
        [["a",[[0,0]]],[true]],
        [["ab",[[0,0],[1,1],[0,1]]],[true,true,false]],
        [["aaaa",[[0,3],[1,2],[0,2],[3,3]]],[true,true,true,true]],
        [["abcd",[[0,3],[1,2],[2,2]]],[false,false,true]],
        [["abba",[[0,3],[1,2],[0,2],[1,3]]],[true,true,false,false]],
        [["aaabaaaabaaabababaabbabbababb",[[1,1],[6,20],[9,24],[18,24],[7,17],[16,24],[13,22],[11,17],[28,28],[10,25],[27,28],[0,22],[1,7],[21,28],[20,25],[20,22],[27,27],[15,25],[19,24],[11,25]]],[true,false,false,true,false,false,false,true,true,false,true,false,false,false,true,true,true,false,false,false]],
        [["ababbaaabaabaaaaaababbabbaa",[[2,9],[9,19],[26,26],[25,26],[12,14],[25,26],[4,11],[8,16],[2,8],[22,26],[13,16],[23,26],[13,26],[13,23],[5,13],[13,22],[12,14],[16,23],[7,16],[25,26]]],[false,false,true,true,true,true,false,false,false,false,true,false,false,false,false,false,true,false,false,true]],
        [["abbaaaabbabbbbbab",[[5,8],[4,13],[9,13],[10,12],[5,10],[12,16],[9,13],[4,13],[9,13],[4,5],[14,15],[3,8],[11,11],[3,16],[10,10],[9,9],[5,8],[0,0],[4,13],[14,16]]],[false,false,false,true,false,false,false,false,false,true,false,false,true,false,true,true,false,true,false,true]],
        [[{"$rep":"a","n":1000000},{"$rep":[0,999999],"n":1000000}],{"$rep":true,"n":1000000}],
        [[{"$rep":"ab","n":500000},[[0,999998],[1,999999],[0,999999],[4,4],[3,6],[2,998]]],[true,true,false,true,false,true]]
      ] },
    solution: {
      approach: `<p>Precompute all radii with Manacher in O(N); answer each query with one comparison.</p>`,
      code: `
        class Solution {
            public boolean[] answer(String s, int[][] queries) {
                int n = s.length(), m = 2 * n + 1;
                char[] t = new char[m];
                for (int i = 0; i < m; i++) t[i] = (i % 2 == 0) ? '#' : s.charAt(i / 2);
                int[] p = new int[m];
                for (int i = 0, c = 0, r = -1; i < m; i++) {
                    int k = (i > r) ? 0 : Math.min(p[2 * c - i], r - i);
                    while (i - k - 1 >= 0 && i + k + 1 < m && t[i - k - 1] == t[i + k + 1]) k++;
                    p[i] = k;
                    if (i + k > r) { c = i; r = i + k; }
                }
                boolean[] res = new boolean[queries.length];
                for (int q = 0; q < queries.length; q++) {
                    int l = queries[q][0], r = queries[q][1];
                    res[q] = p[l + r + 1] >= r - l + 1;           // O(1) per query
                }
                return res;
            }
        }`,
      alt: [{ lang: 'python', code: `
def answer(s, queries):
    t = '#' + '#'.join(s) + '#'
    m = len(t)
    p = [0] * m
    c, r = 0, -1                                  # center and right edge of the furthest palindrome
    for i in range(m):
        k = 0 if i > r else min(p[2 * c - i], r - i)
        while i - k - 1 >= 0 and i + k + 1 < m and t[i - k - 1] == t[i + k + 1]:
            k += 1
        p[i] = k
        if i + k > r:
            c, r = i, i + k
    return [p[l + r + 1] >= r - l + 1 for l, r in queries]   # O(1) per query` }, { lang: 'js', code: `
function answer(s, queries) {
  const m = 2 * s.length + 1;
  const at = (i) => (i % 2 === 0 ? 35 : s.charCodeAt(i >> 1));   // "#a#b#..." without building it
  const p = new Int32Array(m);
  for (let i = 0, c = 0, r = -1; i < m; i++) {
    let k = i > r ? 0 : Math.min(p[2 * c - i], r - i);
    while (i - k - 1 >= 0 && i + k + 1 < m && at(i - k - 1) === at(i + k + 1)) k++;
    p[i] = k;
    if (i + k > r) { c = i; r = i + k; }
  }
  return queries.map(([l, r]) => p[l + r + 1] >= r - l + 1);     // O(1) per query
}` }, { lang: 'cpp', code: `
class Solution {
public:
    vector<bool> answer(const string& s, const vector<vector<int>>& queries) {
        string t = "#";
        for (char ch : s) { t += ch; t += '#'; }
        int m = t.size();
        vector<int> p(m, 0);
        for (int i = 0, c = 0, r = -1; i < m; i++) {
            int k = (i > r) ? 0 : min(p[2 * c - i], r - i);
            while (i - k - 1 >= 0 && i + k + 1 < m && t[i - k - 1] == t[i + k + 1]) k++;
            p[i] = k;
            if (i + k > r) { c = i; r = i + k; }
        }
        vector<bool> res;
        res.reserve(queries.size());
        for (const auto& q : queries) res.push_back(p[q[0] + q[1] + 1] >= q[1] - q[0] + 1);   // O(1) per query
        return res;
    }
};` }],
      dry: { head: ['query', 'center l+r+1', 'P[center]', 'needed', 'answer'], rows: [['[0,6]', '7', '7', '7', H.c('g', 'true')], ['[1,5]', '7', '7', '5', H.c('g', 'true')], ['[0,1]', '2', '0', '2', H.c('r', 'false')], ['[2,4]', '7', '7', '3', H.c('g', 'true')]] },
      complexity: `<p>O(N + Q) time, O(N) space.</p>`,
      followUps: ['Count palindromic substrings inside s[l..r] (offline, much harder).', 'Updates to s between queries → segment tree of forward/backward hashes.']
    }
  });

  practice.push({
    title: 'Lexicographically Minimal Rotation', level: 'Medium', tags: ['rotation', 'two pointers', 'suffix array', 'booth'], companies: ['Google', 'Codeforces classic'],
    statement: `<p>Return the lexicographically smallest string among all rotations of <code>s</code> (canonical form of a necklace — used to compare cyclic strings).</p>`,
    constraints: `1 ≤ |s| ≤ 10<sup>6</sup>, lowercase letters`,
    example: `<p><code>"bca"</code> → <b>"abc"</b>. <code>"baabaa"</code> → <b>"aabaab"</b> (starts at index 1; index 4 gives the same string).</p>`,
    brute: { why: `<p>Build all N rotations and keep the minimum: N comparisons of length N → O(N<sup>2</sup>) = 10<sup>12</sup>. The waste: when two candidate starts agree on k letters and then differ, we learn that k + 1 starts are hopeless — brute force ignores this.</p>`, code: { lang: 'java', code: `
      class Brute {
          String minRotation(String s) {
              String best = s;
              for (int k = 1; k < s.length(); k++) {
                  String r = s.substring(k) + s.substring(0, k);
                  if (r.compareTo(best) < 0) best = r;
              }
              return best;
          }
      }`, alt: [{ lang: 'python', code: String.raw`
class Brute:
    def minRotation(self, s: str) -> str:
        best = s
        for k in range(1, len(s)):
            r = s[k:] + s[:k]
            if r < best:
                best = r
        return best` }, { lang: 'js', code: String.raw`
function minRotation(s) {
  let best = s;
  for (let k = 1; k < s.length; k++) {
    const r = s.substring(k) + s.substring(0, k);
    if (r < best) best = r;
  }
  return best;
}` }, { lang: 'cpp', code: String.raw`
class Brute {
public:
    string minRotation(const string& s) {
        string best = s;
        for (int k = 1; k < (int)s.size(); k++) {
            string r = s.substr(k) + s.substr(0, k);
            if (r < best) best = r;
        }
        return best;
    }
};` }] } },
    mcq: { q: 'Candidates i and j agree on k letters and then s[i+k] &gt; s[j+k]. Which starts can you discard?', options: ['only i', 'i, i+1, …, i+k', 'j..j+k', 'none'], answer: 1, explain: 'For any d ≤ k, rotation i+d is beaten by rotation j+d (they share the same next letters until the bigger letter). So i jumps to i + k + 1.' },
    hints: [`<p>SA view: the answer is the smallest suffix of <code>s + s</code> that starts before |s|. But there is a simpler O(N) two-pointer trick.</p>`, `<p>Keep two candidates i &lt; j and a match length k. Compare s[(i+k) mod n] and s[(j+k) mod n]; on a mismatch, the loser jumps past the compared block.</p>`, `<p>If i == j after a jump, move j forward. Stop when any of i, j, k reaches n; answer starts at min(i, j).</p>`],
    tests: { sig: 'string -> string', fn: 'minRotation', names: { python: 'minRotation' }, cases: [
        [["bca"],"abc"],
        [["baabaa"],"aabaab"],
        [["a"],"a"],
        [["aaaa"],"aaaa"],
        [["ba"],"ab"],
        [["abab"],"abab"],
        [["cba"],"acb"],
        [["abc"],"abc"],
        [["zzzy"],"yzzz"],
        [["bbaabbaa"],"aabbaabb"],
        [["cabcab"],"abcabc"],
        [["bbaabaaab"],"aaabbbaab"],
        [["aaaababb"],"aaaababb"],
        [["baababa"],"aababab"],
        [["abcbacbabcccccacaacbacbaacabbaacaacbcbaa"],"aaabcbacbabcccccacaacbacbaacabbaacaacbcb"],
        [[{"$concat":[{"$rep":"a","n":999999},"b"]}],{"$concat":[{"$rep":"a","n":999999},"b"]}],
        [[{"$concat":["b",{"$rep":"a","n":999999}]}],{"$concat":[{"$rep":"a","n":999999},"b"]}],
        [[{"$rep":"ba","n":500000}],{"$rep":"ab","n":500000}],
        [[{"$rep":"a","n":1000000}],{"$rep":"a","n":1000000}]
      ] },
    solution: {
      approach: `<p>The “minimum expression” two-pointer algorithm: each mismatch discards k + 1 starting positions, so i + j + k only grows and the total work is O(N). (Booth’s algorithm and SA of s + s also work.)</p>`,
      code: `
        class Solution {
            public String minRotation(String s) {
                int n = s.length(), i = 0, j = 1, k = 0;
                while (i < n && j < n && k < n) {
                    char a = s.charAt((i + k) % n), b = s.charAt((j + k) % n);
                    if (a == b) { k++; continue; }
                    if (a > b) i = i + k + 1;      // starts i..i+k all lose
                    else j = j + k + 1;            // starts j..j+k all lose
                    if (i == j) j++;
                    k = 0;
                }
                int start = Math.min(i, j);
                return s.substring(start) + s.substring(0, start);
            }
        }`,
      alt: [{ lang: 'python', code: `
class Solution:
    def minRotation(self, s: str) -> str:
        n, i, j, k = len(s), 0, 1, 0
        while i < n and j < n and k < n:
            a, b = s[(i + k) % n], s[(j + k) % n]
            if a == b:
                k += 1
                continue
            if a > b:
                i += k + 1
            else:
                j += k + 1
            if i == j:
                j += 1
            k = 0
        st = min(i, j)
        return s[st:] + s[:st]` }, { lang: 'js', code: `
function minRotation(s) {
  const n = s.length;
  let i = 0, j = 1, k = 0;
  while (i < n && j < n && k < n) {
    const a = s.charCodeAt((i + k) % n), b = s.charCodeAt((j + k) % n);
    if (a === b) { k++; continue; }
    if (a > b) i += k + 1;                                     // starts i..i+k all lose
    else j += k + 1;                                           // starts j..j+k all lose
    if (i === j) j++;
    k = 0;
  }
  const start = Math.min(i, j);
  return s.substring(start) + s.substring(0, start);
}` }, { lang: 'cpp', code: `
class Solution {
public:
    string minRotation(const string& s) {
        int n = s.size(), i = 0, j = 1, k = 0;
        while (i < n && j < n && k < n) {
            char a = s[(i + k) % n], b = s[(j + k) % n];
            if (a == b) { k++; continue; }
            if (a > b) i += k + 1;                             // starts i..i+k all lose
            else j += k + 1;                                   // starts j..j+k all lose
            if (i == j) j++;
            k = 0;
        }
        int start = min(i, j);
        return s.substr(start) + s.substr(0, start);
    }
};` }],
      dry: { head: ['i', 'j', 'k', 'compare', 'action'], rows: [['0', '1', '0', 'b vs c', 'j = 2'], ['0', '2', '0', 'b vs a', 'i = 1'], ['1', '2', '0', 'c vs a', 'i = 2 → i == j → j = 3 = n'], ['stop', '', '', 'start = min(2, 3) = 2', H.c('g', '"abc"')]] },
      complexity: `<p>O(N) time, O(1) extra space (besides the output).</p>`,
      followUps: ['Group strings that are rotations of each other (canonical form as the map key).', 'Minimal rotation of a <b>circular array of ints</b> — same algorithm.']
    }
  });

  // =====================================================================
  // PRACTICE — Hard
  // =====================================================================
  practice.push({
    title: 'Shortest Palindrome (add characters in front)', level: 'Hard', tags: ['manacher', 'palindrome', 'prefix function'], companies: ['Google', 'Amazon', 'Pocket Gems'],
    statement: `<p>You may add characters only <b>in front of</b> <code>s</code>. Return the shortest palindrome you can make.</p>`,
    constraints: `0 ≤ |s| ≤ 5·10<sup>4</sup> (LeetCode 214); aim for O(N).`,
    example: `<p><code>"aacecaaa"</code> → <b>"aaacecaaa"</b>: the longest palindromic prefix is ${H.c('g', 'aacecaa')}; reverse the leftover ${H.c('r', 'a')} and put it in front.</p><p><code>"abcd"</code> → <b>"dcbabcd"</b> (longest palindromic prefix is just <code>a</code>).</p>`,
    brute: { why: `<p>For each prefix length from N down, test whether it is a palindrome: O(N) tests × O(N) each = O(N<sup>2</sup>) = 2.5·10<sup>9</sup> on <code>"aaa…ab"</code>-like inputs. The waste: palindrome checks restart from scratch every time.</p>`, code: { lang: 'java', code: `
      class Brute {
          String shortestPalindrome(String s) {
              int n = s.length();
              for (int len = n; len >= 0; len--) {
                  int l = 0, r = len - 1;
                  while (l < r && s.charAt(l) == s.charAt(r)) { l++; r--; }
                  if (l >= r) return new StringBuilder(s.substring(len)).reverse() + s;
              }
              return s;
          }
      }`, alt: [{ lang: 'python', code: String.raw`
class Brute:
    def shortestPalindrome(self, s: str) -> str:
        n = len(s)
        for length in range(n, -1, -1):
            l, r = 0, length - 1
            while l < r and s[l] == s[r]:
                l += 1
                r -= 1
            if l >= r:
                return s[length:][::-1] + s
        return s` }, { lang: 'js', code: String.raw`
function shortestPalindrome(s) {
  const n = s.length;
  for (let len = n; len >= 0; len--) {
    let l = 0, r = len - 1;
    while (l < r && s[l] === s[r]) { l++; r--; }
    if (l >= r) return s.substring(len).split("").reverse().join("") + s;
  }
  return s;
}` }, { lang: 'cpp', code: String.raw`
class Brute {
public:
    string shortestPalindrome(const string& s) {
        int n = s.size();
        for (int len = n; len >= 0; len--) {
            int l = 0, r = len - 1;
            while (l < r && s[l] == s[r]) { l++; r--; }
            if (l >= r) return string(s.rbegin(), s.rend() - len) + s;
        }
        return s;
    }
};` }] } },
    mcq: { q: 'In the padded Manacher array, a palindrome centered at i is a PREFIX of s when…', options: ['i + P[i] == 2n', 'i − P[i] == 0', 'P[i] == n', 'i is even'], answer: 1, explain: 'The palindrome spans t[i − P[i] .. i + P[i]]; it starts at the very beginning when i − P[i] = 0.' },
    hints: [`<p>The answer is reverse(s[L..]) + s where L is the length of the <b>longest palindromic prefix</b>.</p>`, `<p>Manacher gives every center’s radius. A center i yields a palindromic prefix of length P[i] exactly when i − P[i] == 0.</p>`, `<p>Take the maximum such P[i] (at least 1 when s is non-empty). Alternative: prefix function of s + "#" + reverse(s). Empty s → "".</p>`],
    tests: { sig: 'string -> string', fn: 'shortestPalindrome', names: { python: 'shortestPalindrome' }, cases: [
        [["aacecaaa"],"aaacecaaa"],
        [["abcd"],"dcbabcd"],
        [[""],""],
        [["a"],"a"],
        [["aa"],"aa"],
        [["ab"],"bab"],
        [["abb"],"bbabb"],
        [["abcba"],"abcba"],
        [["aabba"],"abbaabba"],
        [["baab"],"baab"],
        [["aabbabbaa"],"aabbabbaa"],
        [["aabbbaaaaa"],"aaaaabbbaaaaa"],
        [["aaaaaaaaaa"],"aaaaaaaaaa"],
        [[{"$rep":"a","n":50000}],{"$rep":"a","n":50000}],
        [[{"$concat":[{"$rep":"a","n":49999},"b"]}],{"$concat":["b",{"$rep":"a","n":49999},"b"]}],
        [[{"$rep":"ab","n":25000}],{"$concat":["b",{"$rep":"ab","n":25000}]}]
      ] },
    solution: {
      approach: `<p>Find the longest palindromic prefix with Manacher (O(N)), then prepend the reverse of the remaining suffix.</p>`,
      code: `
        class Solution {
            public String shortestPalindrome(String s) {
                int n = s.length();
                if (n == 0) return s;
                int m = 2 * n + 1;
                char[] t = new char[m];
                for (int i = 0; i < m; i++) t[i] = (i % 2 == 0) ? '#' : s.charAt(i / 2);
                int[] p = new int[m];
                int c = 0, r = -1, bestPrefix = 0;
                for (int i = 0; i < m; i++) {
                    int k = (i > r) ? 0 : Math.min(p[2 * c - i], r - i);
                    while (i - k - 1 >= 0 && i + k + 1 < m && t[i - k - 1] == t[i + k + 1]) k++;
                    p[i] = k;
                    if (i + k > r) { c = i; r = i + k; }
                    if (i - k == 0) bestPrefix = Math.max(bestPrefix, k);   // palindrome touches the start
                }
                return new StringBuilder(s.substring(bestPrefix)).reverse() + s;
            }
        }`,
      alt: [{ lang: 'python', code: `
class Solution:
    def shortestPalindrome(self, s: str) -> str:
        t = s + '#' + s[::-1]                  # prefix function: longest prefix of s that is a suffix of rev(s)
        pi = [0] * len(t)
        for i in range(1, len(t)):
            k = pi[i - 1]
            while k and t[i] != t[k]:
                k = pi[k - 1]
            if t[i] == t[k]:
                k += 1
            pi[i] = k
        L = pi[-1] if s else 0
        return s[L:][::-1] + s` }, { lang: 'js', code: `
function shortestPalindrome(s) {
  // prefix function of s + '#' + reverse(s): its last value = longest palindromic prefix of s
  const t = s + '#' + [...s].reverse().join('');
  const pi = new Int32Array(t.length);
  for (let i = 1; i < t.length; i++) {
    let k = pi[i - 1];
    while (k > 0 && t[i] !== t[k]) k = pi[k - 1];
    if (t[i] === t[k]) k++;
    pi[i] = k;
  }
  const keep = s.length ? pi[t.length - 1] : 0;
  return [...s.substring(keep)].reverse().join('') + s;
}` }, { lang: 'cpp', code: `
class Solution {
public:
    string shortestPalindrome(const string& s) {
        // prefix function of s + '#' + reverse(s): its last value = longest palindromic prefix of s
        string t = s + "#" + string(s.rbegin(), s.rend());
        vector<int> pi(t.size(), 0);
        for (size_t i = 1; i < t.size(); i++) {
            int k = pi[i - 1];
            while (k > 0 && t[i] != t[k]) k = pi[k - 1];
            if (t[i] == t[k]) k++;
            pi[i] = k;
        }
        int keep = s.empty() ? 0 : pi.back();
        string rest = s.substr(keep);
        reverse(rest.begin(), rest.end());
        return rest + s;
    }
};` }],
      dry: { head: ['center i', 'P[i]', 'i − P[i]', 'prefix palindrome?', 'best'], rows: [['1', '1', '0', 'yes "a"', '1'], ['2', '2', '0', 'yes "aa"', '2'], ['7', '7', '0', 'yes "aacecaa"', H.c('g', '7')], ['others', '…', '&gt; 0', 'no', '7']] },
      complexity: `<p>O(N) time and space.</p>`,
      followUps: ['Characters may be added at the <b>end</b> instead (longest palindromic suffix).', 'Minimum insertions anywhere → DP (DSA 17), not Manacher.']
    }
  });

  practice.push({
    title: 'Stream of Characters', level: 'Hard', tags: ['aho-corasick', 'trie', 'design', 'stream'], companies: ['Google', 'Amazon'],
    statement: `<p>Design <code>StreamChecker(String[] words)</code> with <code>boolean query(char letter)</code>: letters arrive one by one; after each, return <code>true</code> if some suffix of the stream so far equals one of the words.</p>`,
    constraints: `1 ≤ words.length ≤ 2000, 1 ≤ |word| ≤ 200, up to 4·10<sup>4</sup> queries (LeetCode 1032); think about 10<sup>5</sup> words.`,
    example: `<p>words = [<code>"cd"</code>, <code>"f"</code>, <code>"kl"</code>]; stream a, b, c, ${H.c('g', 'd')}, e, ${H.c('g', 'f')}, g, h, i, j, k, ${H.c('g', 'l')} → true exactly at d (“cd”), f, and l (“kl”).</p>`,
    brute: { why: `<p>Keep the whole stream; after each letter test <code>endsWith(word)</code> for every word: O(k · |word|) per query = 2000 · 200 = 4·10<sup>5</sup> per letter → 1.6·10<sup>10</sup> total. The waste: forgetting what the previous letters already matched.</p>`, code: { lang: 'java', code: `
      class BruteStreamChecker {
          private final String[] words;
          private final StringBuilder stream = new StringBuilder();
          BruteStreamChecker(String[] words) { this.words = words; }
          boolean query(char letter) {
              stream.append(letter);
              String cur = stream.toString();
              for (String w : words) if (cur.endsWith(w)) return true;
              return false;
          }
      }`, alt: [{ lang: 'python', code: String.raw`
class BruteStreamChecker:
    def __init__(self, words):
        self.words = words
        self.stream = []

    def query(self, letter):
        self.stream.append(letter)
        cur = "".join(self.stream)
        return any(cur.endswith(w) for w in self.words)` }, { lang: 'js', code: String.raw`
class BruteStreamChecker {
  constructor(words) {
    this.words = words;
    this.stream = "";
  }

  query(letter) {
    this.stream += letter;
    return this.words.some((w) => this.stream.endsWith(w));
  }
}` }, { lang: 'cpp', code: String.raw`
class BruteStreamChecker {
    vector<string> words;
    string stream;

public:
    BruteStreamChecker(vector<string> words) : words(words) {}

    bool query(char letter) {
        stream.push_back(letter);
        for (auto& w : words)
            if (stream.size() >= w.size() && stream.compare(stream.size() - w.size(), w.size(), w) == 0) return true;
        return false;
    }
};` }] } },
    mcq: { q: 'After building the Aho–Corasick automaton, what is the extra work per query?', options: ['O(number of words)', 'O(max word length)', 'O(1): one transition + one boolean lookup', 'O(log N)'], answer: 2, explain: 'With the complete goto table and “ends a word somewhere on my fail chain” precomputed as a boolean, each letter is one table lookup.' },
    hints: [`<p>The question “does a suffix of the stream equal a word?” is exactly what an Aho–Corasick state answers: the state is the longest suffix of the stream that is a trie prefix.</p>`, `<p>Precompute <code>term[v] = isWordEnd[v] || term[fail[v]]</code> in BFS order, so you never walk the fail chain at query time.</p>`, `<p>Alternative (shorter to code): a trie of <b>reversed</b> words and walk the last ≤ 200 letters backwards each query — O(maxLen) per query.</p>`],
    tests: { sig: 'string[] string -> long[]', fn: 'runStream', names: { python: 'runStream' }, harness: {
        java: `class Check {
    // returns [how many queries were true, sum of their positions, first ten true positions]
    static long[] runStream(String[] words, String stream) {
        StreamChecker sc = new StreamChecker(words);
        long count = 0, sum = 0;
        List<Long> first = new ArrayList<>();
        for (int i = 0; i < stream.length(); i++)
            if (sc.query(stream.charAt(i))) { count++; sum += i; if (first.size() < 10) first.add((long) i); }
        long[] out = new long[2 + first.size()];
        out[0] = count; out[1] = sum;
        for (int i = 0; i < first.size(); i++) out[2 + i] = first.get(i);
        return out;
    }
}`,
        python: `# returns [how many queries were true, sum of their positions, first ten true positions]
def runStream(words, stream):
    sc = StreamChecker(words)
    pos = [i for i, ch in enumerate(stream) if sc.query(ch)]
    return [len(pos), sum(pos)] + pos[:10]`,
        js: `// returns [how many queries were true, sum of their positions, first ten true positions]
function runStream(words, stream) {
  const sc = new StreamChecker(words);
  const pos = [];
  for (let i = 0; i < stream.length; i++) if (sc.query(stream[i])) pos.push(i);
  return [pos.length, pos.reduce((a, b) => a + b, 0), ...pos.slice(0, 10)];
}`,
        cpp: `// returns [how many queries were true, sum of their positions, first ten true positions]
vector<long long> runStream(vector<string> words, string stream) {
    StreamChecker sc(words);
    long long count = 0, sum = 0;
    vector<long long> first;
    for (int i = 0; i < (int)stream.size(); i++)
        if (sc.query(stream[i])) { count++; sum += i; if (first.size() < 10) first.push_back(i); }
    vector<long long> out = {count, sum};
    out.insert(out.end(), first.begin(), first.end());
    return out;
}` }, cases: [
        [[["cd","f","kl"],"abcdefghijkl"],[3,19,3,5,11]],
        [[["a"],"aaaa"],[4,6,0,1,2,3]],
        [[["ab","b"],"abab"],[2,4,1,3]],
        [[["abc","bc","c"],"xabcx"],[1,3,3]],
        [[["aaa"],"aaaaa"],[3,9,2,3,4]],
        [[["z"],"abc"],[0,0]],
        [[["he","she","his","hers"],"ahishers"],[3,15,3,5,7]],
        [[["ab","ab","ba"],"ababab"],[5,15,1,2,3,4,5]],
        [[["bbab","ba","aa","abaa","aa"],"aabbaababbababbaabbabaaababbbb"],[15,211,1,4,5,7,10,11,12,15,16,19]],
        [[["a","aab","aab","bab","ab"],"ababbabbababaabbbaabaaaaabbbab"],[24,340,0,1,2,3,5,6,8,9,10,11]],
        [[["aab","b","b","b","baab"],"ababbbbbbabaabaaaaabbbbaabbabb"],[17,247,1,3,4,5,6,7,8,10,13,19]],
        [[["ababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaa","baababaababa","aababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaabab","babaababaababaababaa","ababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaaba","baababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaab","abaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaabab","aababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaa","baababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaabab","aababaababaababaababaababaababaababaababaababaababaababaababaababaab","abaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababa","ababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaab","abaababaababaababaababaababaababaababaababaababaababaababaa","baababaababaababaababaababaabab","baababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaabab","abaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababa","baababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaab","babaababaababaababaababaababaababaababaababaababaababaaba","abaababaababaababaababaababaab","baababaababaababaababaababaab","aababaababaababaababaababaababaababaa","baababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaa","babaababaababaababaababaababaababaababaaba","aababaababaababaa","abaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababa","babaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababa","babaababaababaababaababaababaababaababaababaababaababaababaababaabab","abaababaababaabab","babaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababa","baababaababaababa","baababaababaababaababaababaababaababaababaababaababaababaaba","babaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaaba","babaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaaba","aababaababaababaababaababaababaababaababaababaababaababaaba","aababaababaababaababaababaababaababaababaababaababaababaababaa","ababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaa","aababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaab","aababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaa","abaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaabab","baababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaa","babaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaabab","baababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaa","ababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababa","ababaababaababaababaababaababaababaababaababaababaababaababaababaab","babaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaab","abaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababa","babaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaabab","babaababaababaababaababaababaababaababaababaababaababaababaababaababaababa","aababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaaba","abaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababa","baababaababaababaababaababaababaababaababaababaababaababaab","baababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababa","babaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaabab","babaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababa","baababaababaababaababaababaababaababaababaababaababaababaababaababaababaaba","babaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaab","ababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaa","baababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaaba","aababaababaababaab","ababaababaababaababaababaababaababaababa","abaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaabab","baababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaaba","aababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababa","aababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababa","abaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaaba","aababaababaababaababaababaababaababaababaababaababaababaababaababaab","baababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababa","abaababaababaababaababaababaababaababaababaababaababaababaa","baababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaaba","ababa","abaababaababaababaababaababaababaababaababaababaababaababaabab","abaababaababaababaababaababaababaababaababaababaababaababaababaaba","baababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaabab","abaababaababaababaababaababaababaababaababaababaababaababaababaababaaba","abaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaaba","aababaababaababaababaababaaba","babaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaabab","baababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaaba","abaababaababaababaababaababaababaababaababaababaababaababaa","ababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaabab","aababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaabab","aababaababaababaababaababaababaababaababaababaaba","baababaababaababaababaababaababaabab","ababaababaaba","baababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaa","aababaababaababaababaababaababaababaababaababa","aababaababaababaababaaba","baa","ababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababa","abaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaabab","ababaababaababaababaababaababaababaababaababaababaababaababaababaa","ababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaab","aababaababaaba","baababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababa","abaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaaba","babaababaababaababaababaababaababaababaababaababaababaababaababaababaaba","abaababaababaababaababaababaababaa","aababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababa","aababaababaababaababaababaababaababaababaababaababaababaabab","ababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababaababa","bbbaabbbabaabbaabababbbaabbbaabbabaaaabaabbabababaababaababbabaabaabbbaabababbabaababababaaabbabaaaaaaaaaaabaaba","ab","aaabbbabbabaaaabababbabbaaabbaababaabbbbbbbaabaaabbbbabbbbabaabaaaabbababaaaaabbbbbaababbaabbbbbaaabababababbababbaabaabbaabaabaaaabbaabbab","aba","aabbaaabaabaabbbabbaababababbaaaaaaababbbaaaaaaabaabbaababbbbbaaabaabbabababaabaabbbbabbbbabbbaabaabbaabbaaaabbaabbbabbbbbabbbbbbabbaaaaabbababbababbbaabaabba","bbaabbbaabbaabaabaaaaababbbbbbbbbaaaaabbaaaabaabbbbaabababbbbaaabbabbaaabbabaaababaabababbabaaaaaabaaaabbabababbbbbaab","bbaabbabbaaababaabababbbaaaabaaababaaaabbabbbbbbbabbbbbbabababbaabaabbbaaaabaaaabaababa","aaabbaaabbaabababbabaaabbabaabaaabbbaaaaaaabbaabababbabbabaaabaaabbbbabaabbabbaaabbbbbbabaabaaaaaababbb","abaaabaabbababaabbbbb","babababaabaabbabaaababaaabbaabaaabbbabbababbabbbaaaababaaaabbbbaabbaabaaababbaababbbbabbabbbbabbababbabaabbbbabbabbbaaaaabbbbababbabaabaabbbaabaababbbabaaabaabaaaaababababababaab","ababaabbaabbaabaabaaababaabaaaabaabaaabbaaabaaabbbbabaabbbbabaaabaabbaaaaabbaaababbaaaaaabaaaaaaba","babbaabbabaaaababaabababbabbbbaabbaaabbabaaabaaaababbabbbbbbabbabababaa","abbbabababbbaaabbaaabbbabbbabaaabaabbabaaabaabbbbabaaababbbaababaabbababbaaabbaaba","bbabbbaaaabbbaabaaababbbbbabbbbbaabbbaaabababaaaabbbba","aaaaababbaaaabaabaaaaaaaabbbbaabb","babbabbabaabaaabbbabaabbabababbbababbaaaaabababbabaaaaabbbaaabbaabababbbbaaaabbabababbbbbaabaaabaaabbaabbbababababbaabbbaabababaaabaaababaabbabaabbabaaa","bbabbbaaaabbaabbbaabaabbbbaabb","aaabbabbabbbabbabaabbabbbabababaaababbabaaaabaaaabbbbaababaaaabbbabaababbbababbbbaabaaaaaaabaabaabababbaabbaaaababa","babbaaaaaabbaaaabaaababbaaabaaabbababbbbaababbaaaaaabbbaabbbaabbbbabbbbbabbaababaabaabaababbabbaabbbbaabbababbabbbaaaaabaaabbaab","babaabbababbbbbbaabaaaabaaaaaaabaaaaabbbbbbabbabaaabaabbabbbabbbbaaabaaabaaaababaaabbaabaabaabbbbabaabbbabaaababaaabbababbbbaaaabbababaaaaaaabbabbbbaaabaabaaaaaaababababbbbabaabaaabbaabbab","baaaaabbabbababbbbababbbbaaabaababbbbababaabbbbbbaababbbbabbabaabaababbaabbababbaaaabaaabaabbaabbaabbbabbbbabaaaaabbbbbbabbbbaab","babbaabbaabbbbaabaaaabbbaabbbaaaabbbbbaaaaabbaaaaabbaabbabaabbaaaaaaabbbaaaabaabaabaaaaabbbabbabbaababbbbabaaaabaabbaababaaababbbbbaaba","abbaaaabbbbbbaabbabaabaaaaaaabbbbbaabbbaababaaabbabaaaaaabbabaaaabaabbbaabbaabbaaabbaabbaabbbaabbbbbbbbabbbbabbabbbbaaabbabbaaabbaabbbbaabbaabbbbabbbaab","bbaabbaaabbaaabaaabbbbbbabbbabaaabbaabbbbb","abaaababaabaab","bbaaaababaabbbaaaabaababbaabbbaabaabaabbbbabbbbbabbbaaaababbababaaabaaabbbbabbaaaabaaababba","ababaabaabbbaabbababaabaaabbabbbbaaabaaabbbabbabaaabbabbaabbbbaaabaabbaabbaaabbbbabbabbbbbabbabbbabbaababababbaaabbbabbaaabaaabbaaabbbaaaabbabaabaabaaaaaaa","abbbbbabbaaabbbbbababbabbbaabbbabbbbaaabaaabababbbbbbbabaaaabbaaabbabbbabbbabaabaaaabbbaaabbbbabaaaaaaaaaabaabaabbbbaababaaabaaabbaabbaaaaabaabbaabbabbbbbbabbaaabababbabbbaaaaaabb","baabababbabbabbabaaaabaaaababaabbaaaaabbbabbbaababbaaaabbbbaaaaabbabbbababaabbaaabbbabbaaaababaabaaaababaaababbaaabbabab","abaabaaaabbaaabaabbbabbaabaaabbabaabaaababbabbaabbbabaabbbabbabaabaabaaabaabaabbbbaaabbabbabbaaaabbabbbbababbabaaaaaabaaabaabaabaabbbababaaaa","babbbaabbabababaababbabaabbaabaaabbaabaaaaaaabbbbabbaaaaabaababaabababababbabababbabababaabaabababaabaaaaaabaaaabbbbabaabaaababbabbaaabbabaabaababaabba","bbaabaaaabaaababbabaabbbbababbbbbabaaababaabbabaaaababbabaababbbbabbabbabbaabbbbabaaabbabbbbabbabbbabbabbabbabbababbababbaaabbabbaabaabbbbaaabababaababbab","abababbbaaabbbaaaabbbbbaabbbabbbbaaabbbbaaaaabbbbbbaababbbbbabababbababbbbabaaaabaaaabaaabbabbaabababbbabbabaaababaaabaa","abbabaaaabaabaaababababbbabbbbbabaabbaababbabaaabbabaabbaababbaabbbabaabaaaabbababbbabababbabbbabbbbbbbbabaababbbbaaabbaabbbbbaabbbababbaabbbabaabbabbbbabaababababaabbaabaaba","baababa","aabaaaaaaaabbaaaaaaabbbbabaaaabbbbaabbbabaabaaaabbbbbbaababbaabbbbbaabbabbaabbbbbabbbbaabbbbbbabbaaaaababbbbbbbbabbbabbaababbbaabbbabaabbaaaaaaaabaaabbaaabbaabaaabbbaabbba","bababababbbabaabbbabbaabbbaababaababaaababaabbbabaaaaabababaaabbaaaabbbbbbbbbbabaabbbbabaaaabbbbabbbbaaaabbbbbbaaaabaaaaabababbbabababbbababaa","bbbbabbbabaabbbaaabaaabaaaabbabbbaaaa","bbbaabbbbaabababbbaabaabbbaaabbabaaabaaaabbbbaaabaaabaaabbabbbaabbbaaabbbbbbaaabababbbabbaaaababbbbbbabbbaaaaabaaaabbbbbbabbababaabbbaabbabbbbbabbbabbbababaabaaaaaabbbbaababbabaabbaaaabbab","aabaabbaaaabbabbabaabaaaaaabbaabbbbbabaababbbaaaaabbbaabbbbbbbbabbbabbabaaaaabababaaabbaabababaaababbaababbaaabbbaaabab","bbbaabbbbabababbaabbaabaaaabbbbaababbaabbbbaaabaabaaababbbbabbbbbbabbbbabbaabbbaabbabbaabbaabaaabbababbbababbaabbabbbaabaabaabbbbbbaabbbaabbabbbaaaaababbbbaabbaabaaaaaaaaaaba","abababaaaaaaababbaaaabababbbbabaaaaaaaabaababbabaaabbaaaabaaaababababbaaababbaaaaaabbaaaabaaabbbaabaabbbbbaabbbababbabbbaabbaaabaabaababbabbabababbbaabbbaabbaabbbababbbbaaabaaaaaabaabaaa","aaaaaaaaabaababbbabbbbbbbbaaaaaaababbabbbabbaabbbbaabbababbaabbaababbababaabbaabbbaabbbaaababbbabbabbbaabbbabb","bbbabbabbbabaabbbbabaaaabbaaaabbbaaaabaaaabaaaabaababbababbabababbabbbbaaaaaaabbbaabbabababbbbaabaaabaabaabbbaaabbabababbbabababababbaabbbabbbbaabababbbabaaaaabaaaabaaabababbaababaa","bbababbbbaabbbabbaabbabaaaabbbabababbaaaaababaabaaababaaaaababbbbbaabaababaabbababbbbabbbaaabaaaabababaabaaababbaaabaaaba","abbbaaababbbbaaabaaaababbababaaabaaaaaaabbabbabbaabbbbbbaababbbaabaabbbabababbaababbabbbbbaaaabbababab","bbaabbbbbaabbabbabababaaabbbbbbaaaabab","bbaababbbbababbabbabbabaaaabbbbbaaaaaaaaaabaaabaaabbaaabbaaabbaababbaaabb","aaababbababaaaaabababbabaababbbbbabaaabbababbaabbaaaabaabaabaabbaababaa","babbbaaabbabaababaababbbbbbaaaaaabbaabbabbbbbaaabaaaaababbabbabbabbbababbaaaababbababbaaababbbaababaabaabaabbbaabbaaababbbbabba"],{"$rep":"abaab","n":8000}],[39999,799980000,1,2,3,4,5,6,7,8,9,10]],
        [[["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],{"$rep":"a","n":40000}],[39820,799963890,180,181,182,183,184,185,186,187,188,189]]
      ] },
    solution: {
      approach: `<p>Aho–Corasick with a complete transition table. Keep one current state across queries. O(Σ|words|·26) build, O(1) per query.</p>`,
      code: `
        class StreamChecker {
            private final int[][] go;
            private final boolean[] term;      // some word ends at this state or on its fail chain
            private int state = 0;

            public StreamChecker(String[] words) {
                int cap = 1;
                for (String w : words) cap += w.length();
                go = new int[cap][26];
                for (int[] row : go) Arrays.fill(row, -1);
                term = new boolean[cap];
                int[] fail = new int[cap];
                int nodes = 1;
                for (String w : words) {
                    int v = 0;
                    for (char ch : w.toCharArray()) {
                        int c = ch - 'a';
                        if (go[v][c] == -1) go[v][c] = nodes++;
                        v = go[v][c];
                    }
                    term[v] = true;
                }
                ArrayDeque<Integer> q = new ArrayDeque<>();
                for (int c = 0; c < 26; c++) {
                    int u = go[0][c];
                    if (u == -1) go[0][c] = 0; else { fail[u] = 0; q.add(u); }
                }
                while (!q.isEmpty()) {
                    int v = q.poll();
                    term[v] |= term[fail[v]];                      // fail[v] is shallower → already final
                    for (int c = 0; c < 26; c++) {
                        int u = go[v][c];
                        if (u == -1) go[v][c] = go[fail[v]][c];
                        else { fail[u] = go[fail[v]][c]; q.add(u); }
                    }
                }
            }

            public boolean query(char letter) {
                state = go[state][letter - 'a'];
                return term[state];
            }
        }`,
      alt: [{ lang: 'python', code: `
class StreamChecker:
    # reversed-trie version: simple, O(max word length) per query
    def __init__(self, words):
        self.root = {}
        self.maxlen = max(map(len, words))
        self.stream = []
        for w in words:
            node = self.root
            for ch in reversed(w):
                node = node.setdefault(ch, {})
            node['$'] = True

    def query(self, letter):
        self.stream.append(letter)
        node = self.root
        for ch in reversed(self.stream[-self.maxlen:]):
            if ch not in node:
                return False
            node = node[ch]
            if '$' in node:
                return True
        return False` }, { lang: 'js', code: `
class StreamChecker {
  // Aho-Corasick: one automaton state, one table lookup per letter
  constructor(words) {
    let cap = 1;
    for (const w of words) cap += w.length;
    this.go = new Int32Array(cap * 26).fill(-1);
    this.term = new Uint8Array(cap);          // some word ends here or on the fail chain
    const fail = new Int32Array(cap);
    let nodes = 1;
    for (const w of words) {
      let v = 0;
      for (let i = 0; i < w.length; i++) {
        const c = w.charCodeAt(i) - 97;
        if (this.go[v * 26 + c] === -1) this.go[v * 26 + c] = nodes++;
        v = this.go[v * 26 + c];
      }
      this.term[v] = 1;
    }
    const queue = [];
    for (let c = 0; c < 26; c++) {
      const u = this.go[c];
      if (u === -1) this.go[c] = 0; else { fail[u] = 0; queue.push(u); }
    }
    for (let head = 0; head < queue.length; head++) {
      const v = queue[head];
      this.term[v] |= this.term[fail[v]];     // fail[v] is shallower, so already final
      for (let c = 0; c < 26; c++) {
        const u = this.go[v * 26 + c];
        if (u === -1) this.go[v * 26 + c] = this.go[fail[v] * 26 + c];
        else { fail[u] = this.go[fail[v] * 26 + c]; queue.push(u); }
      }
    }
    this.state = 0;
  }

  query(letter) {
    this.state = this.go[this.state * 26 + letter.charCodeAt(0) - 97];
    return this.term[this.state] === 1;
  }
}` }, { lang: 'cpp', code: `
class StreamChecker {
    // Aho-Corasick: one automaton state, one table lookup per letter
    vector<array<int, 26>> go;
    vector<bool> term;                              // some word ends here or on the fail chain
    int state = 0;

public:
    StreamChecker(vector<string> words) {
        go.emplace_back();
        go[0].fill(-1);
        term.push_back(false);
        for (const string& w : words) {
            int v = 0;
            for (char ch : w) {
                int c = ch - 'a';
                if (go[v][c] == -1) {
                    go[v][c] = go.size();
                    go.emplace_back();
                    go.back().fill(-1);
                    term.push_back(false);
                }
                v = go[v][c];
            }
            term[v] = true;
        }
        vector<int> fail(go.size(), 0), queue;
        for (int c = 0; c < 26; c++) {
            int u = go[0][c];
            if (u == -1) go[0][c] = 0; else queue.push_back(u);
        }
        for (size_t head = 0; head < queue.size(); head++) {
            int v = queue[head];
            if (term[fail[v]]) term[v] = true;       // fail[v] is shallower, so already final
            for (int c = 0; c < 26; c++) {
                int u = go[v][c];
                if (u == -1) go[v][c] = go[fail[v]][c];
                else { fail[u] = go[fail[v]][c]; queue.push_back(u); }
            }
        }
    }

    bool query(char letter) {
        state = go[state][letter - 'a'];
        return term[state];
    }
};` }],
      dry: { head: ['letter', 'state', 'term?', 'answer'], rows: [['a', 'root', 'no', 'false'], ['c', 'c', 'no', 'false'], ['d', 'cd', 'yes', H.c('g', 'true')], ['f', 'f', 'yes', H.c('g', 'true')], ['k', 'k', 'no', 'false'], ['l', 'kl', 'yes', H.c('g', 'true')]] },
      complexity: `<p>Build O(M·26) time/memory (M = Σ|words| ≤ 4·10<sup>5</sup>); query O(1).</p>`,
      followUps: ['Return <b>which</b> words matched (dictionary links).', 'Words can be added between queries — rebuild lazily or use a reversed trie.']
    }
  });

  practice.push({
    title: 'Construct String with Minimum Cost', level: 'Hard', tags: ['aho-corasick', 'dynamic programming', 'dictionary links'], companies: ['Google', 'LeetCode contest'],
    statement: `<p>Start with an empty string. In one operation you may append <code>words[i]</code> for <code>costs[i]</code>. Return the minimum total cost to build exactly <code>target</code>, or −1 if impossible.</p>`,
    constraints: `1 ≤ |target| ≤ 5·10<sup>4</sup>, 1 ≤ words.length ≤ 5·10<sup>4</sup>, Σ|words[i]| ≤ 5·10<sup>4</sup>, 1 ≤ costs[i] ≤ 10<sup>4</sup> (LeetCode 3213)`,
    example: `<p>target = <code>"abcdef"</code>, words = [abdef, abc, d, def, ef], costs = [100, 1, 1, 10, 5] → <b>7</b>: ${H.c('g', 'abc')} (1) + ${H.c('b', 'd')} (1) + ${H.c('p', 'ef')} (5).</p><p>target = <code>"aaaa"</code>, words = [z, zz, zzz] → <b>−1</b>.</p>`,
    brute: { why: `<p>dp[i] = min cost to build target[0..i). For each i try every word with <code>startsWith</code>: O(|target| · Σ|words|) = 2.5·10<sup>9</sup> character checks. The waste: re-matching the same words from scratch at every position.</p>`, code: { lang: 'java', code: `
      class Brute {
          int minimumCost(String target, String[] words, int[] costs) {
              int n = target.length();
              long INF = Long.MAX_VALUE / 4;
              long[] dp = new long[n + 1];
              Arrays.fill(dp, INF);
              dp[0] = 0;
              for (int i = 0; i < n; i++) {
                  if (dp[i] == INF) continue;
                  for (int k = 0; k < words.length; k++)
                      if (target.startsWith(words[k], i))
                          dp[i + words[k].length()] = Math.min(dp[i + words[k].length()], dp[i] + costs[k]);
              }
              return dp[n] >= INF ? -1 : (int) dp[n];
          }
      }`, alt: [{ lang: 'python', code: String.raw`
def minimum_cost(target, words, costs):
    n = len(target)
    INF = float("inf")
    dp = [INF] * (n + 1)
    dp[0] = 0
    for i in range(n):
        if dp[i] == INF:
            continue
        for k, w in enumerate(words):
            if target.startswith(w, i):
                dp[i + len(w)] = min(dp[i + len(w)], dp[i] + costs[k])
    return -1 if dp[n] == INF else dp[n]` }, { lang: 'js', code: String.raw`
function minimumCost(target, words, costs) {
  const n = target.length;
  const dp = new Array(n + 1).fill(Infinity);
  dp[0] = 0;
  for (let i = 0; i < n; i++) {
    if (dp[i] === Infinity) continue;
    for (let k = 0; k < words.length; k++)
      if (target.startsWith(words[k], i))
        dp[i + words[k].length] = Math.min(dp[i + words[k].length], dp[i] + costs[k]);
  }
  return dp[n] === Infinity ? -1 : dp[n];
}` }, { lang: 'cpp', code: String.raw`
class Brute {
public:
    int minimumCost(string target, vector<string> words, vector<int> costs) {
        int n = target.size();
        const long long INF = LLONG_MAX / 4;
        vector<long long> dp(n + 1, INF);
        dp[0] = 0;
        for (int i = 0; i < n; i++) {
            if (dp[i] == INF) continue;
            for (int k = 0; k < (int)words.size(); k++)
                if (target.compare(i, words[k].size(), words[k]) == 0)
                    dp[i + words[k].size()] = min(dp[i + words[k].size()], dp[i] + costs[k]);
        }
        return dp[n] >= INF ? -1 : (int)dp[n];
    }
};` }] } },
    mcq: { q: 'At one target position, how many different words can END there (following dictionary links)?', options: ['Up to the number of words (5·10<sup>4</sup>)', 'At most the number of DISTINCT word lengths, which is O(√Σ|words|) ≈ 316', 'Always 1', 'O(log n)'], answer: 1, explain: 'Words ending at the same position are suffixes of each other, so they have distinct lengths; distinct lengths ℓ<sub>1</sub> &lt; ℓ<sub>2</sub> &lt; … need Σ ≥ 1 + 2 + … ⇒ at most ~√(2·5·10<sup>4</sup>).' },
    hints: [`<p>dp[i] = min over words w that END at position i of dp[i − |w|] + cost(w). Aho–Corasick lists exactly the words ending at each position.</p>`, `<p>Duplicate words: keep the minimum cost at the trie node. Use dictionary links (nearest word-ending node on the fail chain) to enumerate matches without walking empty nodes.</p>`, `<p>Each enumerated node has a distinct depth, so ≤ ~316 per position → ~1.6·10<sup>7</sup> steps. Use 64-bit integers for dp, return −1 if dp[n] is infinite.</p>`],
    tests: { sig: 'string string[] int[] -> int', fn: 'minimumCost', cases: [
        [["abcdef",["abdef","abc","d","def","ef"],[100,1,1,10,5]],7],
        [["aaaa",["z","zz","zzz"],[1,10,5]],-1],
        [["a",["a"],[7]],7],
        [["a",["b"],[7]],-1],
        [["ab",["a","b","ab"],[3,3,5]],5],
        [["ab",["ab","ab"],[9,4]],4],
        [["aaa",["a","aa","aaa"],[5,6,20]],11],
        [["abab",["ab","aba","b","bab"],[4,1,1,1]],2],
        [["abc",["abcd"],[1]],-1],
        [["abaabaaaaabaa",["bbba","bbb","aa","a","babb","ba"],[6,8,2,2,7,16]],58],
        [["aaaaaaba",["a","bb","a","ba","a","aba"],[8,7,15,7,5,7]],32],
        [["bbaaaaabbbaaa",["bbb","ba","aab","baa","aaba","aaab"],[13,10,7,11,5,5]],-1],
        [["abbabaaaa",["bba","b","ba","b","aaba","aaab"],[13,2,16,14,18,9]],-1],
        [[{"$rep":"a","n":50000},["a","aa","aaa","aaaa","aaaaa","aaaaaa","aaaaaaa","aaaaaaaa","aaaaaaaaa","aaaaaaaaaa","aaaaaaaaaaa","aaaaaaaaaaaa","aaaaaaaaaaaaa","aaaaaaaaaaaaaa","aaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],[10000,9970,9940,9910,9880,9850,9820,9790,9760,9730,9700,9670,9640,9610,9580,9550,9520,9490,9460,9430,9400,9370,9340,9310,9280,9250,9220,9190,9160,9130,9100,9070,9040,9010,8980,8950,8920,8890,8860,8830,8800,8770,8740,8710,8680,8650,8620,8590,8560,8530,8500,8470,8440,8410,8380,8350,8320,8290,8260,8230,8200,8170,8140,8110,8080,8050,8020,7990,7960,7930,7900,7870,7840,7810,7780,7750,7720,7690,7660,7630,7600,7570,7540,7510,7480,7450,7420,7390,7360,7330,7300,7270,7240,7210,7180,7150,7120,7090,7060,7030]],3515000],
        [[{"$rep":"a","n":50000},{"$rep":"a","n":50000},{"$concat":[{"$rep":10000,"n":49999},[3]]}],150000],
        [[{"$rep":"ab","n":25000},["ab","a","b"],[10000,10000,10000]],250000000]
      ] },
    solution: {
      approach: `<p>Build Aho–Corasick over the words (min cost per end node, depth = word length, dictionary links). Scan target; at each position walk the dictionary chain and relax dp. O(|target|·√M + M·26).</p>`,
      code: `
        class Solution {
            public int minimumCost(String target, String[] words, int[] costs) {
                int cap = 1;
                for (String w : words) cap += w.length();
                int[][] go = new int[cap][26];
                for (int[] row : go) Arrays.fill(row, -1);
                int[] fail = new int[cap], best = new int[cap], depth = new int[cap], dict = new int[cap];
                Arrays.fill(best, Integer.MAX_VALUE);
                int nodes = 1;
                for (int k = 0; k < words.length; k++) {                  // trie, min cost per word
                    int v = 0;
                    for (char ch : words[k].toCharArray()) {
                        int c = ch - 'a';
                        if (go[v][c] == -1) { go[v][c] = nodes; depth[nodes] = depth[v] + 1; nodes++; }
                        v = go[v][c];
                    }
                    best[v] = Math.min(best[v], costs[k]);
                }
                ArrayDeque<Integer> q = new ArrayDeque<>();
                dict[0] = -1;
                for (int c = 0; c < 26; c++) {
                    int u = go[0][c];
                    if (u == -1) go[0][c] = 0; else { fail[u] = 0; dict[u] = -1; q.add(u); }
                }
                while (!q.isEmpty()) {
                    int v = q.poll();
                    for (int c = 0; c < 26; c++) {
                        int u = go[v][c];
                        if (u == -1) { go[v][c] = go[fail[v]][c]; continue; }
                        fail[u] = go[fail[v]][c];
                        dict[u] = best[fail[u]] != Integer.MAX_VALUE ? fail[u] : dict[fail[u]];
                        q.add(u);
                    }
                }
                int n = target.length();
                long INF = Long.MAX_VALUE / 4;
                long[] dp = new long[n + 1];
                Arrays.fill(dp, INF);
                dp[0] = 0;
                int v = 0;
                for (int i = 1; i <= n; i++) {
                    v = go[v][target.charAt(i - 1) - 'a'];
                    for (int u = best[v] != Integer.MAX_VALUE ? v : dict[v]; u != -1; u = dict[u]) {
                        long prev = dp[i - depth[u]];                       // word u ends at i
                        if (prev != INF) dp[i] = Math.min(dp[i], prev + best[u]);
                    }
                }
                return dp[n] >= INF ? -1 : (int) dp[n];
            }
        }`,
      alt: [{ lang: 'python', code: `
from collections import deque


def minimum_cost(target, words, costs):
    INF = float('inf')
    go, fail, best, depth, dic = [[-1] * 26], [0], [INF], [0], [-1]
    for w, cost in zip(words, costs):                 # trie, cheapest cost per word
        v = 0
        for ch in w:
            c = ord(ch) - 97
            if go[v][c] == -1:
                go[v][c] = len(go)
                go.append([-1] * 26)
                fail.append(0)
                best.append(INF)
                depth.append(depth[v] + 1)
                dic.append(-1)
            v = go[v][c]
        best[v] = min(best[v], cost)
    queue = deque()
    for c in range(26):
        u = go[0][c]
        if u == -1:
            go[0][c] = 0
        else:
            queue.append(u)
    while queue:                                      # BFS: fail links and dictionary links
        v = queue.popleft()
        for c in range(26):
            u = go[v][c]
            if u == -1:
                go[v][c] = go[fail[v]][c]
            else:
                f = go[fail[v]][c]
                fail[u] = f
                dic[u] = f if best[f] < INF else dic[f]   # nearest word end on the fail chain
                queue.append(u)
    n = len(target)
    dp = [INF] * (n + 1)
    dp[0] = 0
    v = 0
    for i in range(1, n + 1):
        v = go[v][ord(target[i - 1]) - 97]
        u = v if best[v] < INF else dic[v]
        while u != -1:                                # every word ending at position i
            if dp[i - depth[u]] + best[u] < dp[i]:
                dp[i] = dp[i - depth[u]] + best[u]
            u = dic[u]
    return -1 if dp[n] == INF else dp[n]` }, { lang: 'js', code: `
function minimumCost(target, words, costs) {
  let cap = 1;
  for (const w of words) cap += w.length;
  const NONE = 1 << 30;
  const go = new Int32Array(cap * 26).fill(-1);
  const fail = new Int32Array(cap), depth = new Int32Array(cap), dict = new Int32Array(cap).fill(-1);
  const best = new Int32Array(cap).fill(NONE);
  let nodes = 1;
  words.forEach((w, k) => {                                   // trie, cheapest cost per word
    let v = 0;
    for (let i = 0; i < w.length; i++) {
      const c = w.charCodeAt(i) - 97;
      if (go[v * 26 + c] === -1) { go[v * 26 + c] = nodes; depth[nodes] = depth[v] + 1; nodes++; }
      v = go[v * 26 + c];
    }
    best[v] = Math.min(best[v], costs[k]);
  });
  const queue = [];
  for (let c = 0; c < 26; c++) {
    const u = go[c];
    if (u === -1) go[c] = 0; else queue.push(u);
  }
  for (let head = 0; head < queue.length; head++) {          // BFS: fail links and dictionary links
    const v = queue[head];
    for (let c = 0; c < 26; c++) {
      const u = go[v * 26 + c];
      if (u === -1) { go[v * 26 + c] = go[fail[v] * 26 + c]; continue; }
      const f = go[fail[v] * 26 + c];
      fail[u] = f;
      dict[u] = best[f] !== NONE ? f : dict[f];               // nearest word end on the fail chain
      queue.push(u);
    }
  }
  const n = target.length, INF = Infinity;
  const dp = new Array(n + 1).fill(INF);
  dp[0] = 0;
  let v = 0;
  for (let i = 1; i <= n; i++) {
    v = go[v * 26 + target.charCodeAt(i - 1) - 97];
    for (let u = best[v] !== NONE ? v : dict[v]; u !== -1; u = dict[u]) {   // every word ending at i
      const cand = dp[i - depth[u]] + best[u];
      if (cand < dp[i]) dp[i] = cand;
    }
  }
  return dp[n] === INF ? -1 : dp[n];
}` }, { lang: 'cpp', code: `
class Solution {
public:
    int minimumCost(string target, vector<string> words, vector<int> costs) {
        const int NONE = INT_MAX;
        const long long INF = LLONG_MAX / 4;
        vector<array<int, 26>> go(1);
        go[0].fill(-1);
        vector<int> fail(1, 0), best(1, NONE), depth(1, 0), dict(1, -1);
        for (size_t k = 0; k < words.size(); k++) {            // trie, cheapest cost per word
            int v = 0;
            for (char ch : words[k]) {
                int c = ch - 'a';
                if (go[v][c] == -1) {
                    go[v][c] = go.size();
                    int d = depth[v] + 1;
                    go.emplace_back();
                    go.back().fill(-1);
                    fail.push_back(0); best.push_back(NONE); depth.push_back(d); dict.push_back(-1);
                }
                v = go[v][c];
            }
            best[v] = min(best[v], costs[k]);
        }
        vector<int> queue;
        for (int c = 0; c < 26; c++) {
            int u = go[0][c];
            if (u == -1) go[0][c] = 0; else queue.push_back(u);
        }
        for (size_t head = 0; head < queue.size(); head++) {   // BFS: fail links and dictionary links
            int v = queue[head];
            for (int c = 0; c < 26; c++) {
                int u = go[v][c];
                if (u == -1) { go[v][c] = go[fail[v]][c]; continue; }
                int f = go[fail[v]][c];
                fail[u] = f;
                dict[u] = best[f] != NONE ? f : dict[f];       // nearest word end on the fail chain
                queue.push_back(u);
            }
        }
        int n = target.size();
        vector<long long> dp(n + 1, INF);
        dp[0] = 0;
        int v = 0;
        for (int i = 1; i <= n; i++) {
            v = go[v][target[i - 1] - 'a'];
            for (int u = best[v] != NONE ? v : dict[v]; u != -1; u = dict[u]) {   // every word ending at i
                long long prev = dp[i - depth[u]];
                if (prev != INF) dp[i] = min(dp[i], prev + best[u]);
            }
        }
        return dp[n] >= INF ? -1 : (int)dp[n];
    }
};` }],
      dry: { head: ['i', 'char', 'words ending here', 'dp[i]'], rows: [['0', '', '', '0'], ['3', 'c', 'abc (1)', '0 + 1 = 1'], ['4', 'd', 'd (1)', '1 + 1 = 2'], ['5', 'e', 'none (state “de”)', '∞'], ['6', 'f', 'def (10), ef (5)', 'min(1 + 10, 2 + 5) = <b>7</b>']] },
      complexity: `<p>Build O(M·26), scan O(|target|·√M) ≈ 1.6·10<sup>7</sup>, space O(M·26 + |target|).</p>`,
      followUps: ['Return the actual sequence of words (store argmin).', 'Words may be used at most once each — becomes much harder (set cover flavour).']
    }
  });

  practice.push({
    title: 'Longest Substring Occurring at Least K Times', level: 'Hard', tags: ['suffix array', 'lcp', 'monotonic deque', 'sliding window'], companies: ['Google', 'Bloomberg'],
    statement: `<p>Given <code>s</code> and an integer <code>k</code>, return the length of the longest substring that occurs at least <code>k</code> times in <code>s</code> (occurrences may overlap). Return 0 if none.</p>`,
    constraints: `1 ≤ |s| ≤ 10<sup>5</sup>, 1 ≤ k ≤ |s|, lowercase letters`,
    example: `<p>s = <code>"banana"</code>: k = 2 → <b>3</b> (${H.c('g', 'ana')}); k = 3 → <b>1</b> (${H.c('g', 'a')}). s = <code>"aaaa"</code>, k = 3 → <b>2</b> (aa at 0, 1, 2).</p>`,
    brute: { why: `<p>For each length L (from long to short), count all substrings of length L in a hash map (<code>HashMap</code> / <code>dict</code> / <code>Map</code> / <code>unordered_map</code>): O(N) lengths × O(N) substrings × O(N) hashing = O(N<sup>3</sup>). Binary search on L + rolling hash makes it O(N log N) expected — but SA gives a clean deterministic O(N log N).</p>`, code: { lang: 'java', code: `
      class Brute {
          int longestKRepeat(String s, int k) {
              int n = s.length();
              for (int len = n; len >= 1; len--) {
                  Map<String, Integer> cnt = new HashMap<>();
                  for (int i = 0; i + len <= n; i++)
                      if (cnt.merge(s.substring(i, i + len), 1, Integer::sum) >= k) return len;
              }
              return 0;
          }
      }`, alt: [{ lang: 'python', code: String.raw`
def longest_k_repeat(s, k):
    n = len(s)
    for length in range(n, 0, -1):
        cnt = {}
        for i in range(n - length + 1):
            sub = s[i:i + length]
            cnt[sub] = cnt.get(sub, 0) + 1
            if cnt[sub] >= k:
                return length
    return 0` }, { lang: 'js', code: String.raw`
function longestKRepeat(s, k) {
  const n = s.length;
  for (let len = n; len >= 1; len--) {
    const cnt = new Map();
    for (let i = 0; i + len <= n; i++) {
      const sub = s.substring(i, i + len);
      const c = (cnt.get(sub) || 0) + 1;
      cnt.set(sub, c);
      if (c >= k) return len;
    }
  }
  return 0;
}` }, { lang: 'cpp', code: String.raw`
class Brute {
public:
    int longestKRepeat(string s, int k) {
        int n = s.size();
        for (int len = n; len >= 1; len--) {
            unordered_map<string, int> cnt;
            for (int i = 0; i + len <= n; i++)
                if (++cnt[s.substr(i, len)] >= k) return len;
        }
        return 0;
    }
};` }] } },
    mcq: { q: 'A substring w occurs ≥ k times ⇔ in SA order there are k consecutive suffixes that…', options: ['all have length ≥ |w|', 'pairwise share a prefix of length ≥ |w| (min of the k−1 lcp values ≥ |w|)', 'have increasing SA values', 'are all distinct'], answer: 1, explain: 'All suffixes starting with w form one contiguous SA block; the common prefix of a block equals the minimum lcp inside it.' },
    hints: [`<p>Suffixes sharing a prefix w sit together in SA. A block of k consecutive ranks shares exactly min(lcp[r+1..r+k−1]) letters.</p>`, `<p>Slide a window of k − 1 consecutive lcp values; answer = max over windows of the window minimum. A monotonic deque gives each minimum in amortised O(1) (DSA 13).</p>`, `<p>k = 1 → whole string (length N). k &gt; N → 0. Recipe: SA → Kasai → sliding-window minimum over lcp[1..N−1] with width k − 1 → max.</p>`],
    tests: { sig: 'string int -> int', fn: 'longestKRepeat', cases: [
        [["banana",2],3],
        [["banana",3],1],
        [["aaaa",3],2],
        [["banana",1],6],
        [["abcd",2],0],
        [["a",1],1],
        [["aa",2],1],
        [["abab",2],2],
        [["mississippi",2],4],
        [["mississippi",4],1],
        [["aaaaa",5],1],
        [["abbaababaaaabaaaaababbbabb",4],3],
        [["bbaababaaababaaaaabaabbbb",5],3],
        [["aabbbbbbbbb",2],8],
        [["baababbbaabba",5],1],
        [[{"$rep":"a","n":100000},2],99999],
        [[{"$rep":"a","n":100000},50000],50001],
        [[{"$rep":"a","n":100000},100000],1],
        [[{"$rep":"ab","n":50000},3],99996],
        [[{"$rep":"ab","n":50000},40000],20002]
      ] },
    solution: {
      approach: `<p>SA + LCP + sliding-window minimum. The window minimum is the longest prefix shared by k consecutive suffixes, i.e. the longest substring with ≥ k occurrences inside that block.</p>`,
      code: `
        class Solution {
            public int longestKRepeat(String s, int k) {
                int n = s.length();
                if (k <= 1) return n;
                if (k > n) return 0;
                int[] sa = buildSA(s), lcp = kasai(s, sa);
                int w = k - 1, best = 0;                        // window of k-1 lcp values
                ArrayDeque<Integer> dq = new ArrayDeque<>();   // indices with increasing lcp
                for (int i = 1; i < n; i++) {
                    while (!dq.isEmpty() && lcp[dq.peekLast()] >= lcp[i]) dq.pollLast();
                    dq.addLast(i);
                    if (dq.peekFirst() <= i - w) dq.pollFirst();
                    if (i >= w) best = Math.max(best, lcp[dq.peekFirst()]);
                }
                return best;
            }

            private int[] kasai(String s, int[] sa) {
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
from collections import deque


def build_sa(s):
    # prefix doubling: sort by (rank[i], rank[i + k]) packed into one integer key
    n = len(s)
    rank = [ord(ch) for ch in s]
    sa = list(range(n))
    base = max(n, 128) + 2
    k = 1
    while True:
        key = [rank[i] * base + (rank[i + k] + 1 if i + k < n else 0) for i in range(n)]
        sa.sort(key=key.__getitem__)
        rank = [0] * n
        r = 0
        for j in range(1, n):
            if key[sa[j]] != key[sa[j - 1]]:
                r += 1
            rank[sa[j]] = r
        if r == n - 1:
            return sa
        k <<= 1


def kasai(s, sa):
    # lcp[r] = common prefix of the suffixes at ranks r - 1 and r; h drops by at most 1 per step
    n = len(s)
    rank = [0] * n
    for r, i in enumerate(sa):
        rank[i] = r
    lcp = [0] * n
    h = 0
    for i in range(n):
        if rank[i] == 0:
            h = 0
            continue
        j = sa[rank[i] - 1]
        while i + h < n and j + h < n and s[i + h] == s[j + h]:
            h += 1
        lcp[rank[i]] = h
        if h > 0:
            h -= 1
    return lcp


def longest_k_repeat(s, k):
    n = len(s)
    if k <= 1:
        return n
    if k > n:
        return 0
    lcp = kasai(s, build_sa(s))
    w, best = k - 1, 0                       # window of k - 1 consecutive lcp values
    dq = deque()                             # indices with increasing lcp
    for i in range(1, n):
        while dq and lcp[dq[-1]] >= lcp[i]:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - w:
            dq.popleft()
        if i >= w:
            best = max(best, lcp[dq[0]])
    return best` }, { lang: 'js', code: `
function buildSA(s) {
  // prefix doubling: sort by (rank[i], rank[i + k]) packed into one number
  const n = s.length;
  let rank = new Int32Array(n);
  for (let i = 0; i < n; i++) rank[i] = s.charCodeAt(i);
  const sa = Array.from({ length: n }, (_, i) => i);
  const key = new Float64Array(n);
  const base = Math.max(n, 128) + 2;
  for (let k = 1; ; k <<= 1) {
    for (let i = 0; i < n; i++) key[i] = rank[i] * base + (i + k < n ? rank[i + k] + 1 : 0);
    sa.sort((a, b) => key[a] - key[b]);
    const next = new Int32Array(n);
    for (let j = 1; j < n; j++) next[sa[j]] = next[sa[j - 1]] + (key[sa[j]] !== key[sa[j - 1]] ? 1 : 0);
    rank = next;
    if (rank[sa[n - 1]] === n - 1) return sa;
  }
}

function kasai(s, sa) {
  // lcp[r] = common prefix of the suffixes at ranks r - 1 and r; h drops by at most 1 per step
  const n = s.length, rank = new Int32Array(n), lcp = new Int32Array(n);
  for (let r = 0; r < n; r++) rank[sa[r]] = r;
  let h = 0;
  for (let i = 0; i < n; i++) {
    if (rank[i] === 0) { h = 0; continue; }
    const j = sa[rank[i] - 1];
    while (i + h < n && j + h < n && s[i + h] === s[j + h]) h++;
    lcp[rank[i]] = h;
    if (h > 0) h--;
  }
  return lcp;
}

function longestKRepeat(s, k) {
  const n = s.length;
  if (k <= 1) return n;
  if (k > n) return 0;
  const lcp = kasai(s, buildSA(s));
  const w = k - 1;
  let best = 0, head = 0;
  const dq = [];                                // indices with increasing lcp; head = front
  for (let i = 1; i < n; i++) {                 // window of k - 1 consecutive lcp values
    while (dq.length > head && lcp[dq[dq.length - 1]] >= lcp[i]) dq.pop();
    dq.push(i);
    if (dq[head] <= i - w) head++;
    if (i >= w) best = Math.max(best, lcp[dq[head]]);
  }
  return best;
}` }, { lang: 'cpp', code: `
class Solution {
    vector<int> buildSA(const string& s) {
        int n = s.size();
        vector<int> sa(n), rank(n), next(n);
        vector<long long> key(n);
        iota(sa.begin(), sa.end(), 0);
        for (int i = 0; i < n; i++) rank[i] = s[i];
        long long base = max(n, 128) + 2;
        for (int k = 1;; k <<= 1) {                     // prefix doubling with packed keys
            for (int i = 0; i < n; i++) key[i] = rank[i] * base + (i + k < n ? rank[i + k] + 1 : 0);
            sort(sa.begin(), sa.end(), [&](int a, int b) { return key[a] < key[b]; });
            next[sa[0]] = 0;
            for (int j = 1; j < n; j++) next[sa[j]] = next[sa[j - 1]] + (key[sa[j]] != key[sa[j - 1]]);
            rank = next;
            if (rank[sa[n - 1]] == n - 1) break;
        }
        return sa;
    }

    vector<int> kasai(const string& s, const vector<int>& sa) {
        // lcp[r] = common prefix of the suffixes at ranks r - 1 and r; h drops by at most 1 per step
        int n = s.size(), h = 0;
        vector<int> rank(n), lcp(n, 0);
        for (int r = 0; r < n; r++) rank[sa[r]] = r;
        for (int i = 0; i < n; i++) {
            if (rank[i] == 0) { h = 0; continue; }
            int j = sa[rank[i] - 1];
            while (i + h < n && j + h < n && s[i + h] == s[j + h]) h++;
            lcp[rank[i]] = h;
            if (h > 0) h--;
        }
        return lcp;
    }

public:
    int longestKRepeat(string s, int k) {
        int n = s.size();
        if (k <= 1) return n;
        if (k > n) return 0;
        vector<int> lcp = kasai(s, buildSA(s));
        int w = k - 1, best = 0;                        // window of k - 1 consecutive lcp values
        deque<int> dq;                                  // indices with increasing lcp
        for (int i = 1; i < n; i++) {
            while (!dq.empty() && lcp[dq.back()] >= lcp[i]) dq.pop_back();
            dq.push_back(i);
            if (dq.front() <= i - w) dq.pop_front();
            if (i >= w) best = max(best, lcp[dq.front()]);
        }
        return best;
    }
};` }],
      dry: { head: ['window (ranks)', 'suffixes', 'lcp values inside', 'min', 'best'], rows: [['0–1', 'a, ana', '1', '1', '1'], ['1–2', 'ana, anana', '3', '3', '3'], ['2–3', 'anana, banana', '0', '0', '3'], ['3–4', 'banana, na', '0', '0', '3'], ['4–5', 'na, nana', '2', '2', H.c('g', '<b>3</b> (k = 2)')]] },
      complexity: `<p>O(N log<sup>2</sup> N) for the SA, O(N) for Kasai and the deque.</p>`,
      followUps: ['Return the substring (remember SA[r] of the best window).', 'Require the k occurrences to be pairwise non-overlapping.', 'Maximise length × occurrences (largest rectangle in the LCP histogram).']
    }
  });

  practice.push({
    title: 'K-th Lexicographically Smallest Distinct Substring', level: 'Hard', tags: ['suffix array', 'lcp', 'counting'], companies: ['Google', 'SPOJ SUBLEX'],
    statement: `<p>List all <b>distinct</b> non-empty substrings of <code>s</code> in lexicographic order. Return the k-th one (1-based), or <code>""</code> if there are fewer than k.</p>`,
    constraints: `1 ≤ |s| ≤ 10<sup>5</sup>, 1 ≤ k ≤ 10<sup>10</sup> (needs a 64-bit integer)`,
    example: `<p>s = <code>"banana"</code>: sorted distinct substrings are a, an, ana, anan, anana, b, ba, ban, … → k = 4 → <b>"anan"</b>; k = 6 → <b>"b"</b>; k = 16 → <b>""</b> (only 15 exist).</p>`,
    brute: { why: `<p>Put all substrings into a TreeSet&lt;String&gt; and walk to the k-th: O(N<sup>2</sup>) strings of length up to N → O(N<sup>3</sup>) memory and time. The waste: we materialise ~5·10<sup>9</sup> strings just to count them.</p>`, code: { lang: 'java', code: `
      class Brute {
          String kth(String s, long k) {
              TreeSet<String> set = new TreeSet<>();
              for (int i = 0; i < s.length(); i++)
                  for (int j = i + 1; j <= s.length(); j++) set.add(s.substring(i, j));
              for (String t : set) if (--k == 0) return t;
              return "";
          }
      }`, alt: [{ lang: 'python', code: String.raw`
def kth(s, k):
    subs = set()
    for i in range(len(s)):
        for j in range(i + 1, len(s) + 1):
            subs.add(s[i:j])
    for t in sorted(subs):
        k -= 1
        if k == 0:
            return t
    return ""` }, { lang: 'js', code: String.raw`
function kth(s, k) {
  const set = new Set();
  for (let i = 0; i < s.length; i++)
    for (let j = i + 1; j <= s.length; j++) set.add(s.substring(i, j));
  for (const t of [...set].sort()) if (--k === 0) return t;
  return "";
}` }, { lang: 'cpp', code: String.raw`
class Brute {
public:
    string kth(string s, long long k) {
        set<string> subs;
        for (int i = 0; i < (int)s.size(); i++)
            for (int j = i + 1; j <= (int)s.size(); j++) subs.insert(s.substr(i, j - i));
        for (auto& t : subs) if (--k == 0) return t;
        return "";
    }
};` }] } },
    mcq: { q: 'Walking ranks in SA order, the new substrings of rank r are its prefixes of lengths lcp[r]+1 … |suffix|. In which order do they appear in the global sorted list?', options: ['Reverse order', 'Exactly in increasing length, right after everything from earlier ranks', 'Random', 'Interleaved with later ranks'], answer: 1, explain: 'A shorter prefix is smaller than a longer one with the same start, and all of rank r’s new prefixes are larger than earlier ranks’ substrings and smaller than later ranks’ new ones.' },
    hints: [`<p>Group the sorted distinct substrings by the first SA rank that owns them (topic 7): rank r owns (n − SA[r]) − lcp[r] consecutive entries.</p>`, `<p>Skip whole ranks while k is larger than their count (subtract). Inside the right rank, the answer is the prefix of length lcp[r] + k.</p>`, `<p>Use a 64-bit integer for k. If k survives all ranks, return "". Multiple queries: prefix sums over rank counts + binary search.</p>`],
    tests: { sig: 'string long -> string', fn: 'kth', cases: [
        [["banana",4],"anan"],
        [["banana",6],"b"],
        [["banana",16],""],
        [["banana",1],"a"],
        [["banana",15],"nana"],
        [["a",1],"a"],
        [["a",2],""],
        [["aaaa",4],"aaaa"],
        [["aaaa",5],""],
        [["abab",3],"aba"],
        [["abcabc",10],"bcab"],
        [["aaabbbb",4],"aaab"],
        [["babaaaaabbbaa",8],"aaaaabbb"],
        [["abaabaabba",18],"abaabaabb"],
        [["baaaabbbba",1],"a"],
        [["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",1],"a"],
        [["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",30],"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
        [["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",31],"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaab"],
        [["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",500],"aaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbbbb"],
        [["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",930],"abbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"],
        [["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",931],"b"],
        [["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",960],"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"],
        [[{"$rep":"a","n":100000},100000],{"$rep":"a","n":100000}],
        [[{"$rep":"a","n":100000},100001],""],
        [[{"$rep":"ab","n":50000},100000],{"$rep":"ab","n":50000}],
        [[{"$rep":"ab","n":50000},100001],"b"],
        [[{"$rep":"ab","n":50000},199999],{"$concat":[{"$rep":"ba","n":49999},"b"]}],
        [[{"$rep":"ab","n":50000},200000],""],
        [[{"$concat":[{"$rep":"a","n":50000},{"$rep":"b","n":50000}]},2500100000],{"$rep":"b","n":50000}],
        [[{"$concat":[{"$rep":"a","n":50000},{"$rep":"b","n":50000}]},2500100001],""],
        [[{"$concat":[{"$rep":"a","n":50000},{"$rep":"b","n":50000}]},1],"a"]
      ] },
    solution: {
      approach: `<p>SA + LCP. Ranks contribute contiguous, already-sorted blocks of new substrings; skip blocks by count, then index inside the right block. O(N log<sup>2</sup> N) build, O(N) per query (O(log N) with prefix sums).</p>`,
      code: `
        class Solution {
            public String kth(String s, long k) {
                int n = s.length();
                int[] sa = buildSA(s), lcp = kasai(s, sa);
                for (int r = 0; r < n; r++) {
                    long fresh = (n - sa[r]) - lcp[r];                 // new substrings owned by rank r
                    if (k <= fresh) return s.substring(sa[r], sa[r] + lcp[r] + (int) k);
                    k -= fresh;
                }
                return "";
            }

            private int[] kasai(String s, int[] sa) {
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
def build_sa(s):
    # prefix doubling: sort by (rank[i], rank[i + k]) packed into one integer key
    n = len(s)
    rank = [ord(ch) for ch in s]
    sa = list(range(n))
    base = max(n, 128) + 2
    k = 1
    while True:
        key = [rank[i] * base + (rank[i + k] + 1 if i + k < n else 0) for i in range(n)]
        sa.sort(key=key.__getitem__)
        rank = [0] * n
        r = 0
        for j in range(1, n):
            if key[sa[j]] != key[sa[j - 1]]:
                r += 1
            rank[sa[j]] = r
        if r == n - 1:
            return sa
        k <<= 1


def kasai(s, sa):
    # lcp[r] = common prefix of the suffixes at ranks r - 1 and r; h drops by at most 1 per step
    n = len(s)
    rank = [0] * n
    for r, i in enumerate(sa):
        rank[i] = r
    lcp = [0] * n
    h = 0
    for i in range(n):
        if rank[i] == 0:
            h = 0
            continue
        j = sa[rank[i] - 1]
        while i + h < n and j + h < n and s[i + h] == s[j + h]:
            h += 1
        lcp[rank[i]] = h
        if h > 0:
            h -= 1
    return lcp


def kth(s, k):
    n = len(s)
    sa = build_sa(s)
    lcp = kasai(s, sa)
    for r in range(n):
        fresh = (n - sa[r]) - lcp[r]         # new substrings owned by rank r
        if k <= fresh:
            return s[sa[r]:sa[r] + lcp[r] + k]
        k -= fresh
    return ""` }, { lang: 'js', code: `
function buildSA(s) {
  // prefix doubling: sort by (rank[i], rank[i + k]) packed into one number
  const n = s.length;
  let rank = new Int32Array(n);
  for (let i = 0; i < n; i++) rank[i] = s.charCodeAt(i);
  const sa = Array.from({ length: n }, (_, i) => i);
  const key = new Float64Array(n);
  const base = Math.max(n, 128) + 2;
  for (let k = 1; ; k <<= 1) {
    for (let i = 0; i < n; i++) key[i] = rank[i] * base + (i + k < n ? rank[i + k] + 1 : 0);
    sa.sort((a, b) => key[a] - key[b]);
    const next = new Int32Array(n);
    for (let j = 1; j < n; j++) next[sa[j]] = next[sa[j - 1]] + (key[sa[j]] !== key[sa[j - 1]] ? 1 : 0);
    rank = next;
    if (rank[sa[n - 1]] === n - 1) return sa;
  }
}

function kasai(s, sa) {
  // lcp[r] = common prefix of the suffixes at ranks r - 1 and r; h drops by at most 1 per step
  const n = s.length, rank = new Int32Array(n), lcp = new Int32Array(n);
  for (let r = 0; r < n; r++) rank[sa[r]] = r;
  let h = 0;
  for (let i = 0; i < n; i++) {
    if (rank[i] === 0) { h = 0; continue; }
    const j = sa[rank[i] - 1];
    while (i + h < n && j + h < n && s[i + h] === s[j + h]) h++;
    lcp[rank[i]] = h;
    if (h > 0) h--;
  }
  return lcp;
}

function kth(s, k) {
  const n = s.length, sa = buildSA(s), lcp = kasai(s, sa);
  for (let r = 0; r < n; r++) {
    const fresh = (n - sa[r]) - lcp[r];         // new substrings owned by rank r
    if (k <= fresh) return s.substring(sa[r], sa[r] + lcp[r] + k);
    k -= fresh;
  }
  return '';
}` }, { lang: 'cpp', code: `
class Solution {
    vector<int> buildSA(const string& s) {
        int n = s.size();
        vector<int> sa(n), rank(n), next(n);
        vector<long long> key(n);
        iota(sa.begin(), sa.end(), 0);
        for (int i = 0; i < n; i++) rank[i] = s[i];
        long long base = max(n, 128) + 2;
        for (int k = 1;; k <<= 1) {                     // prefix doubling with packed keys
            for (int i = 0; i < n; i++) key[i] = rank[i] * base + (i + k < n ? rank[i + k] + 1 : 0);
            sort(sa.begin(), sa.end(), [&](int a, int b) { return key[a] < key[b]; });
            next[sa[0]] = 0;
            for (int j = 1; j < n; j++) next[sa[j]] = next[sa[j - 1]] + (key[sa[j]] != key[sa[j - 1]]);
            rank = next;
            if (rank[sa[n - 1]] == n - 1) break;
        }
        return sa;
    }

    vector<int> kasai(const string& s, const vector<int>& sa) {
        // lcp[r] = common prefix of the suffixes at ranks r - 1 and r; h drops by at most 1 per step
        int n = s.size(), h = 0;
        vector<int> rank(n), lcp(n, 0);
        for (int r = 0; r < n; r++) rank[sa[r]] = r;
        for (int i = 0; i < n; i++) {
            if (rank[i] == 0) { h = 0; continue; }
            int j = sa[rank[i] - 1];
            while (i + h < n && j + h < n && s[i + h] == s[j + h]) h++;
            lcp[rank[i]] = h;
            if (h > 0) h--;
        }
        return lcp;
    }

public:
    string kth(string s, long long k) {
        int n = s.size();
        vector<int> sa = buildSA(s), lcp = kasai(s, sa);
        for (int r = 0; r < n; r++) {
            long long fresh = (n - sa[r]) - lcp[r];     // new substrings owned by rank r
            if (k <= fresh) return s.substr(sa[r], lcp[r] + (int)k);
            k -= fresh;
        }
        return "";
    }
};` }],
      dry: { head: ['rank', 'suffix', 'lcp', 'owns', 'k before → after'], rows: [['0', 'a', '0', '1 (a)', '4 → 3'], ['1', 'ana', '1', '2 (an, ana)', '3 → 1'], ['2', 'anana', '3', '2 (anan, anana)', H.c('g', 'k = 1 ≤ 2 → prefix of length 3 + 1 = "anan"')]] },
      complexity: `<p>O(N log<sup>2</sup> N) preprocessing, O(N) per query (or O(log N) with prefix sums).</p>`,
      followUps: ['Count <b>all</b> substrings (with repeats) instead of distinct ones — then SAM path counting with occurrence weights is easier.', 'Q queries with different k — prefix sums of “owns” + binary search.']
    }
  });

  // =====================================================================
  // QUIZ
  // =====================================================================
  quiz.push(
    { q: 'Why is Manacher’s algorithm O(N) even though it has a while loop inside a for loop?', options: ['The while loop runs at most once per position', 'Every successful expansion pushes the right edge R further right, and R only moves right (≤ 2N)', 'It uses hashing to skip comparisons', 'It is actually O(N log N)'], answer: 1, explain: 'Matches inside the box are free (copied from the mirror); every real match extends past R and R never moves back, so total matches ≤ 2N plus ≤ one failure per position.' },
    { q: 'After padding s with # (t = "#a#b#…#"), what does P[i] (radius in t) equal?', options: ['Twice the palindrome length in s', 'The palindrome length in s', 'Half the palindrome length', 'The start index in s'], answer: 1, explain: 'A radius-P palindrome in t covers P real letters of s (the # cells and letters alternate), so P[i] is exactly the length in s; the start is (i − P[i]) / 2.' },
    { q: 'In Kasai’s algorithm, when moving from suffix i to suffix i + 1 (text order), the carried value h…', options: ['resets to 0', 'can drop by at most 1', 'always increases', 'is halved'], answer: 1, explain: 'Removing the first letter from two suffixes that share h letters leaves suffixes that share h − 1, and the true sorted neighbour of i + 1 shares at least that much.' },
    { q: 'For s of length N with suffix array SA and LCP array lcp, the number of distinct non-empty substrings is…', options: ['N(N+1)/2', 'N(N+1)/2 − Σ lcp', 'Σ lcp', 'N − max lcp'], answer: 1, explain: 'The suffix at rank r contributes (N − SA[r]) − lcp[r] new prefixes; summing gives N(N+1)/2 − Σ lcp.' },
    { q: 'In Aho–Corasick, the failure link of node v points to…', options: ['v’s parent', 'the root always', 'the node for the longest proper suffix of v’s string that is also in the trie', 'the node for the longest prefix of v’s string'], answer: 2, explain: 'Just like KMP’s prefix function, but over the whole trie: the best “plan B” that keeps as much of what we read as possible.' },
    { q: 'Why are Aho–Corasick failure links computed in BFS order?', options: ['BFS uses less memory', 'fail(u) is shallower than u, so its links/transitions are final before u needs them', 'DFS would visit nodes twice', 'It does not matter'], answer: 1, explain: 'fail(child) = go(fail(v), c) reads data of a shallower node; BFS guarantees all shallower nodes are finished.' },
    { q: 'Which hashing setup is broken by Thue–Morse strings for EVERY odd base?', options: ['Two primes ~10<sup>9</sup> with random bases', 'Mod 2<sup>61</sup> − 1 with a random base', 'Letting a 64-bit integer overflow (mod 2<sup>64</sup>)', 'SipHash with a random key'], answer: 2, explain: '2<sup>64</sup> is not prime; the hash difference of Thue–Morse S<sub>k</sub>, T<sub>k</sub> gains ≥ k(k+1)/2 factors of 2, so at length 2048 it is 0 mod 2<sup>64</sup>.' },
    { q: 'You insert 10<sup>5</sup> substring hashes into one set using a single modulus M ≈ 10<sup>9</sup>. Roughly how many colliding pairs should you expect?', options: ['≈ 0.0001', '≈ 0.05', '≈ 5', '≈ 10<sup>5</sup>'], answer: 2, explain: 'Birthday paradox: K<sup>2</sup>/(2M) = 10<sup>10</sup>/(2·10<sup>9</sup>) = 5. Use a double hash (M ≈ 10<sup>18</sup>).' },
    { q: 'The suffix automaton of a string of length N ≥ 2 has at most how many states?', options: ['N', '2N − 1', 'N<sup>2</sup>', 'N log N'], answer: 1, explain: 'endpos classes form a tree with at most N leaves; the bound 2N − 1 is reached by strings like abbb…b.' },
    { q: 'With a suffix array (no LCP tricks), how long does counting the occurrences of pattern P take?', options: ['O(|P|)', 'O(|P| log N)', 'O(N)', 'O(N log N)'], answer: 1, explain: 'Two binary searches (lower and upper bound), each doing O(log N) comparisons of up to |P| characters.' },
    { q: 'Characters are appended to a text one at a time and after each append you must report the number of distinct substrings. Best tool?', options: ['Rebuild a suffix array each time', 'Suffix automaton (add len(cur) − len(link(cur)) each step)', 'Manacher', 'Aho–Corasick'], answer: 1, explain: 'The SAM is built online in amortised O(1) per character and the increment of distinct substrings is exactly len(cur) − len(link(cur)).' },
    { q: 'For ranks a &lt; b in the suffix array, LCP(suffix SA[a], suffix SA[b]) equals…', options: ['lcp[b]', 'max(lcp[a+1..b])', 'min(lcp[a+1..b])', 'lcp[a] + lcp[b]'], answer: 2, explain: 'Shared prefixes can only shrink while walking through sorted order, so the LCP of two far-apart suffixes is the minimum along the way — a range-minimum query.' },
    { q: 'In a polynomial hash with letters mapped as a → 0, b → 1, …, which pair always collides?', options: ['"ab" and "ba"', '"a" and "aa"', '"abc" and "cba"', 'none'], answer: 1, explain: 'With a = 0 every string of a’s hashes to 0 regardless of length. Map letters to 1..26 (or use the char code + 1).' }
  );

  // =====================================================================
  // INTERVIEW Q&A
  // =====================================================================
  interview.push(
    { q: 'Explain Manacher’s algorithm and why it runs in linear time.', level: 'A', a: `<p>Pad the string with <code>#</code> between letters (and at both ends) so odd and even palindromes both have a center cell. Keep the palindrome whose right end R is furthest right, with center C. For a new position i ≤ R, its mirror j = 2C − i was already processed, and because the box [2C − R, R] is a palindrome, i’s palindrome has radius at least min(P[j], R − i). Start from there and expand. If the expansion passes R, move the box.</p><p>Linear time: every successful comparison during expansion moves R one step right; R never moves left and is bounded by 2N, so there are ≤ 2N successful comparisons plus at most one failed comparison per i. P[i] on the padded string equals the palindrome length in s, start = (i − P[i])/2, and the number of palindromes is Σ(P[i] + 1)/2.</p>`, followUps: ['How is this related to the Z-algorithm?', 'How would you count distinct palindromic substrings (eertree)?', 'When would you just use expand-around-center instead?'] },
    { q: 'What is a suffix array and how do you build it in O(N log N)?', level: 'A', a: `<p>The suffix array lists the starting indices of all suffixes in lexicographic order — N integers that act as a sorted index of every substring (each substring is a prefix of a suffix). Prefix doubling: rank suffixes by their first character; then repeatedly sort by the pair (rank[i], rank[i + k]) which represents the first 2k characters, re-rank, and double k. After ⌈log₂ N⌉ rounds all ranks are distinct.</p><p>With a comparator sort each round is O(N log N) → O(N log<sup>2</sup> N). Using radix/counting sort on cyclic shifts of s + sentinel, each round is O(N): the order by the second key is the previous order shifted by −k, then one stable counting sort by the first key. Linear-time builders (SA-IS, DC3) exist and are what libraries use.</p>`, followUps: ['Why do we append a sentinel smaller than every character?', 'How do you search a pattern with the SA?', 'What is the memory difference versus a suffix tree?'] },
    { q: 'Walk me through Kasai’s LCP algorithm and its key lemma.', level: 'E', a: `<p>Given SA, compute rank[SA[r]] = r. Process suffixes in text order i = 0..N−1, keeping h. For each i with rank[i] &gt; 0, let j = SA[rank[i] − 1] (its predecessor in sorted order); extend h while s[i + h] == s[j + h]; store lcp[rank[i]] = h; then decrement h by one (not below 0).</p><p>Lemma: if suffix i shares h &gt; 0 letters with its predecessor j, then suffix i + 1 shares at least h − 1 letters with its own predecessor, because j + 1 sorts before i + 1 with h − 1 common letters and the true predecessor lies between them. Since h decreases at most N times and never exceeds N, total increments are ≤ 2N → O(N).</p>`, followUps: ['What happens if you forget to reset h at rank 0?', 'How do you get the LCP of two arbitrary suffixes?', 'Why does processing in sorted order instead break the bound?'] },
    { q: 'How do you find the longest repeated substring? What changes if occurrences must not overlap?', level: 'A', a: `<p>Overlap allowed: build SA + LCP; the answer is the maximum lcp value, starting at SA[r] (any repeated substring is a common prefix of two suffixes and the best pair is adjacent in sorted order). Alternatively binary search on length with a rolling hash: O(N log N) expected.</p><p>No overlap: the predicate “a non-overlapping repeat of length L exists” is monotone, so binary search on L. For a fixed L, split SA into maximal blocks where consecutive lcp ≥ L; a block works if max(SA) − min(SA) ≥ L inside it. That is O(N log N) after the SA. With a suffix automaton you can instead track the first and last end positions per state.</p>`, followUps: ['How about “occurs at least k times”?', 'Can you do it deterministically without a suffix array?', 'What is the answer for "aaaa" in both variants?'] },
    { q: 'Compare Aho–Corasick with running KMP once per pattern.', level: 'A', a: `<p>KMP per pattern costs O(N + m<sub>i</sub>) each, so O(k·N + M) for k patterns of total length M — the text is re-read k times. Aho–Corasick builds one trie of all patterns plus failure links (longest proper suffix that is also a trie node) and dictionary links, then reads the text once: O(M·σ) build with a complete goto table, O(N) scanning, plus O(Z) to report Z matches.</p><p>If you only need per-pattern counts, avoid enumerating matches (Z can be Θ(N·k) with nested patterns): count visits per state and push counts up the fail tree in reverse BFS order. Trade-offs: the complete table uses σ ints per node — compress or use maps for large alphabets.</p>`, followUps: ['Why BFS order for failure links?', 'How would you support adding patterns dynamically?', 'How does a DP over automaton states count strings avoiding all patterns?'] },
    { q: 'Design a profanity/keyword filter for a chat service with 50,000 banned phrases and messages streamed token by token.', level: 'E', a: `<p>Normalise text first (case folding, Unicode NFKC, optional leetspeak mapping), then compile the 50k phrases into an Aho–Corasick automaton once per deploy (or per list update) and ship it to every chat server as an immutable, versioned artefact. Each conversation keeps one integer state; each incoming character costs one table lookup, and a precomputed “ends a phrase on the fail chain” flag (or dictionary link) reports matches immediately — perfect for streaming.</p><p>Engineering: use a compact DFA (alphabet compression, byte-level transitions), hot-reload new automata atomically, measure p99 latency, and log matched phrase IDs rather than message text for privacy. For fuzzy evasion (spaces, look-alike characters) add normalisation rules or a second-stage ML classifier; Aho–Corasick handles the exact high-volume part cheaply.</p>`, followUps: ['How do you handle word boundaries (“class” contains “ass”)?', 'How big is the automaton in memory?', 'How would you A/B test a list change?'] },
    { q: 'How likely is a collision with polynomial hashing, and when do you need double hashing?', level: 'A', a: `<p>For two fixed different strings of length n and a uniformly random base modulo a prime M, the difference is a non-zero polynomial of degree &lt; n, so the collision probability is ≤ (n − 1)/M. When you compare many hashes against each other (put K hashes in a set), the birthday bound applies: about K<sup>2</sup>/(2M) colliding pairs.</p><p>With M ≈ 10<sup>9</sup> and K = 10<sup>5</sup> that is ~5 collisions — too many. Two independent moduli (≈ 10<sup>18</sup>) or a single 2<sup>61</sup> − 1 modulus brings it to ~10<sup>−8</sup>. Always use random bases, map characters to non-zero values, and verify candidates when a false positive would give a wrong answer.</p>`, followUps: ['Why must the modulus be prime for this argument?', 'How do you multiply mod 2^61 − 1 in Java, C++ and JavaScript?', 'When is a single modulus enough?'] },
    { q: 'What is an anti-hash test and how do you defend against it?', level: 'E', a: `<p>An anti-hash test is input crafted to make a specific hash function collide. Classic examples: Thue–Morse strings, which collide for any odd base when hashing mod 2<sup>64</sup> (unsigned overflow), because the hash difference accumulates k(k+1)/2 factors of two; birthday or lattice-reduction (LLL) searches that find collisions for a fixed, known base and prime; and hash-flooding attacks on Java’s fixed <code>String.hashCode</code> (“Aa” and “BB” both hash to 2112).</p><p>Defences: prime modulus (not 2<sup>64</sup>), base chosen randomly at runtime and never exposed, large total range (two moduli or 2<sup>61</sup> − 1), verification of matches when correctness matters. Production hash tables use keyed hashes like SipHash with a per-process random key; Java mitigates flooding by turning long buckets into balanced trees.</p>`, followUps: ['Why does a random base defeat precomputed collisions?', 'Can an attacker learn your base from timing?', 'How does Java 8 HashMap limit the damage?'] },
    { q: 'What does a state in a suffix automaton represent, and why do we need clones?', level: 'E', a: `<p>A state is an equivalence class of substrings with the same endpos set (the set of positions where they end). Within a state, the strings are suffixes of each other with lengths in (len(link), len]; the suffix link points to the class of the longest shorter suffix, which ends in strictly more places. Following transitions from the root spells exactly the substrings of s.</p><p>When appending c, we walk suffix links from the last state adding c-edges until a state p already has a c-edge to q. If len(p) + 1 == len(q), q is exactly the class of the new suffix. Otherwise q contains longer strings whose endpos did not gain the new position, so the class must split: clone q with len(p) + 1, copy its edges and link, redirect p’s chain of c-edges to the clone, and link q and cur to it. Cloning keeps the total ≤ 2N − 1 states.</p>`, followUps: ['How do you count occurrences of each substring with a SAM?', 'How is the SAM’s link tree related to the suffix tree of the reversed string?', 'What is the memory cost per character?'] },
    { q: 'Suffix array vs suffix tree vs suffix automaton: when would you pick each?', level: 'E', a: `<p><b>Suffix array (+ LCP):</b> offline, compact (≈ 8N bytes with LCP), simple to build in O(N log N) or O(N); great for pattern counting by binary search, distinct/repeated/common substrings, k-th substring; the default in contests and in large-scale text indexing (with BWT/FM-index for compression).</p><p><b>Suffix tree:</b> explicit tree of all suffixes; elegant algorithms (LCA-based queries) but heavy memory (often 20N+ bytes) and Ukkonen’s construction is tricky — rarely implemented by hand today. <b>Suffix automaton:</b> online, O(N) states, very convenient for “after each appended character” questions, longest common substring with another string, occurrence counts; costs σ transitions per state (heavier for big alphabets). In an interview, SA + LCP is usually the easiest to explain; mention SAM when the input is streamed.</p>`, followUps: ['How can SA + LCP simulate a suffix-tree traversal?', 'Which would you use for a 3-billion-letter genome?', 'What is an FM-index?'] },
    { q: 'Give four ways to count distinct substrings and their complexities.', level: 'A', a: `<p>(1) Brute force: insert all O(N<sup>2</sup>) substrings into a set — O(N<sup>3</sup>) time/memory; fine for N ≤ 300. (2) Hashing: O(N<sup>2</sup>) substring hashes (double hash, grouped by length) in a set — O(N<sup>2</sup>) expected, probabilistic; N ≤ 5000.</p><p>(3) Suffix array + LCP: N(N+1)/2 − Σlcp in O(N log N), deterministic. (4) Suffix automaton: Σ over states of len(v) − len(link(v)) in O(N), and it can report the count after every prefix online. The SA proof: each suffix in sorted order owns exactly its prefixes longer than its LCP with the previous suffix, so each distinct substring is counted once.</p>`, followUps: ['Count distinct substrings of each length.', 'Count distinct substrings that occur at least twice.', 'What changes for a 10^6-character string in memory (Java, Python, C++)?'] },
    { q: 'Find the longest common substring of two strings of length 10<sup>6</sup> each.', level: 'E', a: `<p>The O(nm) DP is 10<sup>12</sup> — impossible. Option 1: suffix automaton of s (O(|s|)), then walk t keeping (state, current length); on a missing edge follow suffix links and set length = len(state); track the max. O(|s| + |t|) time, ~σ·2|s| ints of memory.</p><p>Option 2: suffix array of s + '#' + t with a separator absent from both; build LCP; the answer is the maximum lcp[r] where ranks r − 1 and r come from different strings — O(N log N) and leaner memory. Option 3: binary search on length + double hashing of all windows of s into a set, then probe t’s windows — O(N log N) expected but probabilistic. I would pick SA + LCP for memory or SAM for simplicity of the walk.</p>`, followUps: ['Extend to k strings.', 'Return the substring, not just the length.', 'What if the alphabet is all of Unicode?'] },
    { q: 'How are suffix arrays and string algorithms used in modern LLM / data pipelines?', level: 'E', a: `<p>Exact-substring deduplication of training corpora builds suffix arrays over huge token sequences (Lee et al., 2021) to find every span repeated beyond a length threshold, then removes duplicates — reducing memorisation and improving model quality. The same index answers “does this model output appear verbatim in the training data?” by counting occurrences with two binary searches; infini-gram (2024) uses suffix arrays to compute n-gram statistics over trillions of tokens.</p><p>Elsewhere: Aho–Corasick for stop-sequence detection, special-token splitting and block lists; rolling hashes / content-defined chunking for dataset sharding and dedup at file level; MinHash for near-duplicates where exact matching is too strict. The skill is choosing exact (SA, AC) versus approximate (MinHash, embeddings) tools based on the requirement.</p>`, followUps: ['Why tokens instead of characters for these suffix arrays?', 'How would you shard a suffix array that does not fit in RAM?', 'Exact vs near-duplicate: which matters more for code data?'] },
    { q: 'An interviewer gives you “count occurrences of each of 10<sup>5</sup> dictionary words in a 10<sup>6</sup>-character text”. Talk through your options.', level: 'I', a: `<p>Naive indexOf per word is O(k·N) = 10<sup>11</sup>. Hashing per distinct word length: for each distinct length L, roll a hash over the text and look up a hash map of words of that length — O(N · #distinct lengths) with #lengths ≤ √(2·Σ|words|), randomised.</p><p>Aho–Corasick: build the automaton over all words (O(M·26)), scan the text once counting visits per state, then propagate counts up the fail tree in reverse BFS order; each word’s count is the value at its end node. That is O(N + M·26), deterministic, independent of the number of matches. A suffix array of the text would also work (two binary searches per word, O(Σ|w| log N)) and is better if the dictionary changes often but the text is fixed.</p>`, followUps: ['Which option if the text changes every request but the dictionary is fixed?', 'How do duplicates in the dictionary affect each method?', 'What is the memory for the AC automaton?'] }
  );

  registerModule({
    id: 'dsa24',
    title: 'Advanced String Algorithms',
    intro: `<p>In DSA 9 you learned to find <b>one</b> pattern in <b>one</b> text with KMP, Z and Rabin–Karp. This expert module is about the questions those tools cannot answer fast: <i>every</i> palindrome at once, <i>thousands</i> of patterns in one pass, <i>all</i> substrings sorted, counted or compared — and hashing that cannot be broken on purpose.</p>
      <p>You will build each structure by hand with tiny examples and step-through visualizers: <b>Manacher</b> (mirror boxes for palindromes), <b>suffix arrays</b> (sorting every ending by doubling), <b>LCP with Kasai</b> (the bookmark that only slips back one step), <b>Aho–Corasick</b> (a trie with “plan B” arrows), <b>double hashing and anti-hash tests</b> (why 64-bit integer overflow is not a hash), and an intro to the <b>suffix automaton</b> (a tiny machine that knows every substring). The last topic turns all of it into a playbook — distinct substrings, longest repeats, and how to pick the right tool from the wording of a question.</p>
      <p>These are also the algorithms behind real systems in the AI era: exact deduplication of LLM training data, verbatim-memorisation checks, stop-sequence and block-list matching, genome indexes and code search.</p>`,
    goals: [
      'Run <b>Manacher</b> by hand and use its radius array to answer longest / count / “is s[l..r] a palindrome?” questions in O(N) and O(1)',
      'Build a <b>suffix array</b> with prefix doubling, compute <b>LCP with Kasai</b>, and prove why both are fast',
      'Solve distinct-substring, longest-repeat (with and without overlap), ≥ k occurrences, k-th substring and longest-common-substring problems with SA + LCP',
      'Build an <b>Aho–Corasick</b> automaton, explain failure/dictionary links, and count matches via the fail tree',
      'Write collision-resistant <b>double / 2<sup>61</sup>−1 hashing</b> with random bases and explain birthday bounds and anti-hash tests (Thue–Morse)',
      'Explain the <b>suffix automaton</b> (endpos classes, suffix links, cloning) and use it for online distinct counts and longest common substring',
      'Pick the right string tool from the clues in a problem statement and defend the trade-offs in an interview'
    ],
    prereqs: `DSA 9 (String Algorithms: KMP prefix function, Z-algorithm, Rabin–Karp), DSA 10 (Binary Search), DSA 13 (Stacks &amp; Queues — monotonic deque), DSA 15 (Heaps &amp; Tries), and DSA 21 (Range Query Data Structures — sparse table for LCP queries). Comfort with modular arithmetic from DSA 3 helps for hashing.`,
    hours: 18,
    langNotes: {
      java: `<p><b>Java:</b> counts such as N(N+1)/2 for N = 10<sup>6</sup> reach 5·10<sup>11</sup>, so use <code>long</code>; an <code>int</code> overflows silently at N ≈ 65,536. Sorting with a comparator needs boxed <code>Integer[]</code>, which is the slow part of a sort-based suffix array; the counting-sort version works on <code>int[]</code> and is several times faster. Never build strings with <code>+=</code> in a loop (use <code>StringBuilder</code>), and avoid <code>substring</code> inside comparators or hash loops because it copies. <code>String.hashCode</code> is fixed, so an attacker can flood a <code>HashMap</code>: for substring hashes use your own double hash with a <code>Random</code> base, and <code>Math.multiplyHigh</code> for the 2<sup>61</sup> − 1 modulus. Every algorithm in this module is iterative, so the default stack (about 10k frames) is never an issue.</p>`,
      python: `<p><b>Python:</b> integers never overflow, so counts and the 2<sup>61</sup> − 1 modulus need no tricks, but a 64-bit wrap-around hash must be simulated with <code>&amp; ((1 &lt;&lt; 64) - 1)</code>. Speed is the real limit: a prefix-doubling sort with tuple keys is O(N log<sup>2</sup> N) and takes seconds near N = 10<sup>6</sup>, and per-state dicts or 26-element lists make an automaton memory-hungry; keep inputs near the stated limits and prefer flat lists. Slices (<code>s[i:j]</code>) copy, so compare with indices or compare hashes. Use <code>collections.deque</code> for BFS queues (<code>list.pop(0)</code> is O(n)). The default recursion limit is 1000 frames, which is why these solutions are iterative; do not write a recursive trie walk for long words without raising it.</p>`,
      js: `<p><b>JavaScript:</b> <code>Number</code> is exact only up to 2<sup>53</sup>, so a product of two values near 10<sup>9</sup> (double hashing) or 2<sup>61</sup> needs <code>BigInt</code> (slower, but correct), and 64-bit wrap-around is <code>BigInt.asUintN(64, x)</code>; <code>|0</code> and <code>Math.imul</code> only give 32 bits. Counts like 5·10<sup>11</sup> are still exact in a <code>Number</code>. <code>Array.prototype.sort()</code> without a comparator sorts as strings, so always pass <code>(a, b) =&gt; a - b</code> or a key comparator. <code>queue.shift()</code> is O(n): walk the array with a head index in BFS. Strings index UTF-16 code units, and <code>charCodeAt</code> is faster than building one-character strings. The default stack is about 10k frames; all solutions here are iterative.</p>`,
      cpp: `<p><b>C++:</b> signed overflow is undefined behaviour: use <code>long long</code> for counts and <code>unsigned long long</code> when you rely on wrap-around (a hash mod 2<sup>64</sup> is exactly what the Thue–Morse test breaks). <code>unsigned __int128</code> gives the 2<sup>61</sup> − 1 product in one line (GCC and Clang). <code>char</code> may be signed, so cast with <code>(unsigned char)</code> before turning a character into an index or rank. A <code>std::sort</code> with a lambda over indices handles the log<sup>2</sup> suffix array comfortably for N around 10<sup>5</sup>; near 10<sup>6</sup> use the counting-sort version and compile with optimisation. <code>substr</code> copies, so pass <code>const string&amp;</code> and compare by index. <code>std::map</code> is O(log n) while <code>unordered_map</code> is O(1) on average but can be flooded with crafted keys. Automaton tables as <code>vector&lt;array&lt;int, 26&gt;&gt;</code> are contiguous and cache-friendly; the 8 MB stack is never at risk because nothing here recurses deeply.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
