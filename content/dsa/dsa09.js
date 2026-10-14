(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // ---------- small shared helpers for the visualizers ----------
  function show(ch) { return ch === ' ' ? '␣' : ch; }              // make spaces visible in boxes
  function chars(s) { return s.split('').map(show); }
  function q(ch) { return '<code>' + H.esc(show(ch)) + '</code>'; }   // safe char for narration
  function oneHl(i, cls) { var h = {}; if (i !== undefined && i !== null && i >= 0) h[i] = cls; return h; }
  function readStr(input, fallback, maxLen, what) {
    var s = (input === undefined || input === null) ? fallback : String(input);
    s = s.replace(/^\s+|\s+$/g, '');
    if (!s.length) throw new Error('Please type ' + what + '.');
    if (s.length > maxLen) throw new Error('Please keep ' + what + ' at most ' + maxLen + ' characters so the picture fits.');
    return s;
  }
  function readPair(input, fallback, what) {
    var s = (input === undefined || input === null) ? fallback : String(input);
    var parts = s.split('|');
    if (parts.length !== 2) throw new Error('Use the format: ' + what + ' (two parts separated by a single | ).');
    var a = parts[0].replace(/\s+/g, ''), b = parts[1].replace(/\s+/g, '');
    if (!a.length || !b.length) throw new Error('Both sides of | must be non-empty. Format: ' + what + '.');
    return [a, b];
  }
  function lower(s, what) {
    if (!/^[a-z]+$/.test(s)) throw new Error(what + ' must use only lowercase letters a-z.');
    return s;
  }
  function lpsOf(p) {
    var l = [0], len = 0, i = 1;
    while (i < p.length) {
      if (p[i] === p[len]) { len++; l[i] = len; i++; }
      else if (len > 0) len = l[len - 1];
      else { l[i] = 0; i++; }
    }
    return l;
  }

  // =====================================================================
  // TOPIC 1 — Strings in Java basics
  // =====================================================================
  topics.push({
    title: 'Strings in Java: Immutability, char Arithmetic (c - \'a\') and the String Pool',
    analogy: `<p><b>A Java String is like a name engraved on a trophy.</b> Once the letters are engraved you cannot change one letter — if you want "Rahul" to become "Rahim", the shop makes a <b>brand-new trophy</b>. That is <b>immutability</b>.</p>
      <p><b>Letters are numbered seats in a cinema row.</b> Seat 97 is <code>'a'</code>, seat 98 is <code>'b'</code>, seat 99 is <code>'c'</code>... If you ask "how far is <code>'c'</code> from the start of the row?", you do 99 − 97 = <b>2</b>. That is all <code>c - 'a'</code> means.</p>
      <p><b>The String pool is the library's single copy of a popular book.</b> When ten people ask for "hello", the library hands them the <i>same</i> copy instead of printing ten new ones.</p>`,
    explain: `<h4>1. Immutability — a String never changes</h4>
      <p>Every "change" (like <code>toUpperCase()</code>, <code>replace()</code>, <code>+</code>) gives you a <b>new</b> String. The old one is untouched.</p>
      ${H.table(['Code', 'What really happens'], [
        ['<code>String s = "cat";</code>', 's points to the text "cat"'],
        ['<code>s.toUpperCase();</code>', 'creates "CAT" and <span class="c-r">throws it away</span> (you did not save it!) — s is still "cat"'],
        ['<code>s = s.toUpperCase();</code>', 'creates "CAT" and now s points to it. "cat" itself was <b>never</b> modified']
      ])}
      <p><b>Why should you care?</b> (1) Safe to share and use as HashMap keys. (2) Any "edit" costs a full copy → editing in a loop is slow (next topics: <code>char[]</code> and <code>StringBuilder</code>).</p>
      <h4>2. char arithmetic — letters are just small numbers</h4>
      <p>A <code>char</code> is stored as a number (its Unicode / ASCII code). Subtracting <code>'a'</code> turns a lowercase letter into a 0-based slot number — perfect for an <code>int[26]</code> counter array.</p>
      ${H.table(['char c', 'code', 'c - \'a\'', 'meaning'], [
        ['<code>\'a\'</code>', '97', '<span class="c-g">0</span>', 'slot 0'],
        ['<code>\'b\'</code>', '98', '<span class="c-g">1</span>', 'slot 1'],
        ['<code>\'z\'</code>', '122', '<span class="c-g">25</span>', 'last slot'],
        ['<code>\'7\'</code>', '55', '<code>\'7\' - \'0\'</code> = <span class="c-g">7</span>', 'digit char → its int value'],
        ['<code>(char)(\'a\' + 3)</code>', '100', '—', '<span class="c-p">\'d\'</span> (go the other way: number → letter)']
      ])}
      <p>Counting letters of <b>"banana"</b> with <code>cnt[c - 'a']++</code>:</p>
      ${H.arr([3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], { label: 'cnt', hl: { 0: 'g', 1: 'g', 13: 'g' } })}
      <p class="c-m">(slots shown 0..13: slot 0 = a → 3, slot 1 = b → 1, slot 13 = n → 2)</p>
      <h4>3. The String pool and <code>==</code> vs <code>equals</code></h4>
      ${H.table(['Code', 'Same object?', '<code>==</code>', '<code>equals</code>'], [
        ['<code>String a = "hi"; String b = "hi";</code>', 'yes — both literals come from the pool', 'true', 'true'],
        ['<code>String c = new String("hi");</code>', 'no — <code>new</code> forces a fresh object', '<span class="c-r">a == c is false</span>', '<span class="c-g">true</span>'],
        ['<code>c.intern()</code>', 'returns the pooled copy', 'a == c.intern() is true', 'true']
      ])}
      <p><b>Golden rule:</b> <code>==</code> asks "same box in memory?"; <code>equals</code> asks "same letters?". In interviews always compare text with <code>equals</code>. (Comparing two single <code>char</code> values with <code>==</code> is fine — they are plain numbers.)</p>
      <h4>4. Everyday String toolbox</h4>
      ${H.table(['Method', 'Cost', 'Note'], [
        ['<code>s.length()</code>, <code>s.charAt(i)</code>', 'O(1)', 'indices 0 .. n−1'],
        ['<code>s.substring(i, j)</code>', 'O(j − i)', 'end <b>j is excluded</b>; makes a copy'],
        ['<code>s.toCharArray()</code>', 'O(n)', 'a <b>mutable</b> copy you can edit freely'],
        ['<code>s.indexOf(t)</code>, <code>s.contains(t)</code>', 'up to O(n·m)', 'no linear guarantee → KMP / Z later'],
        ['<code>s.equals(t)</code>, <code>s.compareTo(t)</code>', 'O(n)', 'compareTo = dictionary order'],
        ['<code>Character.isLetterOrDigit(c)</code>, <code>Character.toLowerCase(c)</code>', 'O(1)', 'cleaning input'],
        ['<code>new String(charArray)</code>, <code>String.valueOf(x)</code>', 'O(n)', 'convert back to String']
      ])}`,
    clues: [
      '"String contains <b>only lowercase English letters</b>" → an <code>int[26]</code> array with <code>c - \'a\'</code> beats a HashMap.',
      '"<b>anagram</b>", "<b>frequency</b>", "same characters", "permutation of" → count letters with <code>cnt[c - \'a\']++</code>.',
      '"<b>modify / swap / reverse in place</b>" → Strings cannot change; convert with <code>toCharArray()</code> first.',
      '"Compare two strings" → use <code>equals</code>, never <code>==</code> (pool vs <code>new</code> trap).',
      '"Digits given as characters" (e.g. <code>"1234"</code>) → <code>c - \'0\'</code> gives the number.',
      '<code>|s| ≤ 10<sup>5</sup></code> → any per-character String copy inside a loop (substring, +) can blow up to O(N<sup>2</sup>).'
    ],
    code: [`
      class StringBasics {
          public static void main(String[] args) {
              // ---- 1. Immutability ----
              String s = "cat";
              s.toUpperCase();                 // result is thrown away, s is still "cat"
              System.out.println(s);           // cat
              s = s.toUpperCase();             // now s points to a NEW string "CAT"
              System.out.println(s);           // CAT

              // ---- 2. char arithmetic ----
              String word = "banana";
              int[] cnt = new int[26];         // one slot per lowercase letter
              for (char c : word.toCharArray()) {
                  cnt[c - 'a']++;              // 'a'->0, 'b'->1, ..., 'z'->25
              }
              System.out.println("a=" + cnt[0] + " b=" + cnt[1] + " n=" + cnt['n' - 'a']); // a=3 b=1 n=2
              char d = (char) ('a' + 3);       // number back to letter
              System.out.println(d);           // d
              int digit = '7' - '0';           // char digit -> int value
              System.out.println(digit + 1);   // 8

              // ---- 3. String pool: == vs equals ----
              String a = "hi";
              String b = "hi";                 // same pooled object as a
              String c = new String("hi");     // forced brand-new object
              System.out.println(a == b);      // true  (same object)
              System.out.println(a == c);      // false (different objects!)
              System.out.println(a.equals(c)); // true  (same letters) -> ALWAYS use equals
              System.out.println(a == c.intern()); // true (intern returns the pooled copy)

              // ---- 4. Editing safely: convert to char[] ----
              char[] arr = "hello".toCharArray();
              arr[0] = 'j';                    // arrays CAN be changed
              String edited = new String(arr);
              System.out.println(edited);      // jello
          }
      }`],
    codeTitle: ['Immutability, c - \'a\', String pool, char[] editing'],
    viz: [{
      title: 'Counting letters with cnt[c - \'a\']++',
      input: 'banana',
      inputLabel: 'lowercase word (max 16 letters)',
      gen: function (input) {
        var s = lower(readStr(input, 'banana', 16, 'a lowercase word'), 'The word');
        var letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
        var cnt = []; for (var k = 0; k < 26; k++) cnt.push(0);
        var frames = [];
        frames.push({ narr: 'We want to count each letter of <b>' + H.esc(s) + '</b>. Instead of a HashMap we use a plain array of <b>26 zeros</b> — one slot per letter a..z.', parts: [
          { type: 'array', label: 'word', values: s.split('') },
          { type: 'array', label: 'cnt[26] (slot label = letter)', values: cnt.slice(), idxLabels: letters }
        ] });
        frames.push({ narr: 'The trick: a char is a number. <code>\'a\'</code> is 97, <code>\'b\'</code> is 98 ... so <code>c - \'a\'</code> gives 0 for a, 1 for b, 25 for z — exactly the slot number we need.', parts: [
          { type: 'vars', label: 'char codes', vals: { "'a'": 97, "'b'": 98, "'n'": 110, "'n' - 'a'": 13 } },
          { type: 'array', label: 'cnt[26]', values: cnt.slice(), idxLabels: letters }
        ] });
        for (var i = 0; i < s.length; i++) {
          var c = s[i], slot = s.charCodeAt(i) - 97;
          cnt[slot]++;
          frames.push({
            narr: 'i = ' + i + ': c = ' + q(c) + ' (code ' + s.charCodeAt(i) + '). ' + s.charCodeAt(i) + ' − 97 = <b>' + slot + '</b>, so we bump slot ' + slot + ' → it now holds <b>' + cnt[slot] + '</b>. No searching, no hashing — just one array jump.',
            parts: [
              { type: 'array', label: 'word', values: s.split(''), ptr: oneHl(i, 'i'), hl: oneHl(i, 'cur') },
              { type: 'vars', vals: { c: c, 'code(c)': s.charCodeAt(i), "c - 'a'": slot } },
              { type: 'array', label: 'cnt[26]', values: cnt.slice(), idxLabels: letters, hl: oneHl(slot, 'ok') }
            ]
          });
        }
        var hl = {}, summary = [];
        for (var z = 0; z < 26; z++) if (cnt[z] > 0) { hl[z] = 'sel'; summary.push(letters[z] + '=' + cnt[z]); }
        frames.push({ narr: 'Done in one pass: ' + summary.join(', ') + '. Time O(N), space O(26) = O(1). This exact pattern solves anagram checks, "first unique character", ransom-note problems and more.', parts: [
          { type: 'array', label: 'cnt[26]', values: cnt.slice(), idxLabels: letters, hl: hl }
        ] });
        return frames;
      }
    }, {
      title: 'Where do String references point? (pool, new, immutability)',
      gen: function () {
        var nodes = [
          { id: 'a', label: 'a', x: 8, y: 8, shape: 'box', w: 10 },
          { id: 'b', label: 'b', x: 8, y: 26, shape: 'box', w: 10 },
          { id: 'c', label: 'c', x: 8, y: 44, shape: 'box', w: 10 },
          { id: 'P', label: '"hi"  (String pool)', x: 66, y: 14, shape: 'box', w: 34 },
          { id: 'N', label: '"hi"  (new object)', x: 66, y: 40, shape: 'box', w: 34 },
          { id: 'U', label: '"HI"  (new object)', x: 66, y: 56, shape: 'box', w: 34 }
        ];
        var code = 'String a = "hi";\nString b = "hi";\nString c = new String("hi");\nboolean same = (a == c);\nboolean eq = a.equals(c);\nString up = a.toUpperCase();\nc = c.intern();';
        function pick(ids) { return nodes.filter(function (n) { return ids.indexOf(n.id) >= 0; }); }
        function g(ids, edges, hl, ehl, tags) { return { type: 'graph', label: 'Stack variables (left) → heap objects (right)', directed: true, height: 64, nodes: pick(ids), edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        function cd(line, cls) { var h = {}; h[line] = cls || 'cur'; return { type: 'code', label: 'Line running', lang: 'java', code: code, hl: h }; }
        return [
          { narr: '<b>Line 1:</b> a string <i>literal</i> "hi" is stored once in the <b>String pool</b> (a shared table inside the heap). Variable <b>a</b> holds an <i>arrow</i> (reference) to it — not the letters themselves.', parts: [
            cd(1), g(['a', 'P'], [['a', 'P']], { P: 'ok' }, { 'a-P': 'ok' })
          ] },
          { narr: '<b>Line 2:</b> the same literal again. Java looks it up in the pool, finds it, and gives <b>b</b> an arrow to the <b>very same object</b>. No new memory. That is why <code>a == b</code> is true.', parts: [
            cd(2), g(['a', 'b', 'P'], [['a', 'P'], ['b', 'P']], { P: 'sel' }, { 'b-P': 'ok' }, { P: 'a == b' })
          ] },
          { narr: '<b>Line 3:</b> <code>new</code> <i>always</i> creates a fresh object on the heap, even though the letters are identical. <b>c</b> points somewhere else.', parts: [
            cd(3), g(['a', 'b', 'c', 'P', 'N'], [['a', 'P'], ['b', 'P'], ['c', 'N']], { N: 'ok' }, { 'c-N': 'ok' })
          ] },
          { narr: '<b>Line 4:</b> <code>==</code> compares the <b>arrows</b> (addresses). a points to the pool object, c to the new one → <span class="c-r">false</span>. This is the classic interview trap.', parts: [
            cd(4, 'bad'), g(['a', 'b', 'c', 'P', 'N'], [['a', 'P'], ['b', 'P'], ['c', 'N']], { P: 'bad', N: 'bad' }, { 'a-P': 'bad', 'c-N': 'bad' }, { P: 'different', N: 'boxes' }),
            { type: 'vars', vals: { 'a == c': 'false' }, hl: { 'a == c': 'bad' } }
          ] },
          { narr: '<b>Line 5:</b> <code>equals</code> walks both objects and compares the <b>letters</b>: h = h, i = i → <span class="c-g">true</span>. Always compare text with <code>equals</code>.', parts: [
            cd(5, 'ok'), g(['a', 'b', 'c', 'P', 'N'], [['a', 'P'], ['b', 'P'], ['c', 'N']], { P: 'ok', N: 'ok' }, {}, { P: 'h i', N: 'h i' }),
            { type: 'vars', vals: { 'a == c': 'false', 'a.equals(c)': 'true' }, hl: { 'a.equals(c)': 'ok' } }
          ] },
          { narr: '<b>Line 6:</b> immutability in action. <code>toUpperCase()</code> cannot change "hi" (other variables share it!), so it builds a <b>brand-new</b> object "HI". The pool object is untouched — a and b still read "hi".', parts: [
            cd(6), g(['a', 'b', 'c', 'P', 'N', 'U'], [['a', 'P'], ['b', 'P'], ['c', 'N'], ['a', 'U', 'toUpperCase']], { U: 'ok', P: 'sel' }, { 'a-U': 'ok' }, { P: 'unchanged' })
          ] },
          { narr: '<b>Line 7:</b> <code>intern()</code> asks the pool "do you already have these letters?" — yes, so it returns the pooled object and c now points there too. The old <code>new</code> object has no arrows left, so the garbage collector will reclaim it.', parts: [
            cd(7, 'ok'), g(['a', 'b', 'c', 'P', 'N'], [['a', 'P'], ['b', 'P'], ['c', 'P']], { P: 'sel', N: 'done' }, { 'c-P': 'ok' }, { N: 'garbage', P: 'a == c now' }),
            { type: 'text', html: '<b>Take-away:</b> variables hold arrows; <code>==</code> compares arrows; <code>equals</code> compares letters; every "edit" makes a new object.' }
          ] }
        ];
      }
    }],
    examples: [
      { title: 'The forgotten assignment bug (immutability)', html: `<p>A very common bug in interviews: calling a String method and <b>not saving the result</b>. Because Strings never change, the call builds a new String and it is thrown away.</p>
        ${H.table(['Code', 'Value of s afterwards'], [['<code>String s = "  hi  "; s.trim();</code>', '<span class="c-r">"  hi  "</span> (unchanged!)'], ['<code>s = s.trim();</code>', '<span class="c-g">"hi"</span>']])}
        <p>Same with <code>replace</code>, <code>toLowerCase</code>, <code>concat</code>, <code>strip</code>. Rule: <b>String methods return; they never modify.</b></p>`, code: `String s = "  hi  ";
s.trim();                       // result discarded
System.out.println("[" + s + "]"); // [  hi  ]
s = s.trim();                   // keep the new String
System.out.println("[" + s + "]"); // [hi]` },
      { title: 'Caesar cipher with char arithmetic (wrap-around with %)', html: `<p>Shift every lowercase letter forward by k, wrapping z → a. Turn the letter into a slot 0..25, add k, wrap with <code>% 26</code>, turn it back into a letter.</p>
        ${H.table(['c', "c − 'a'", '+ k (k = 3)', '% 26', "+ 'a'"], [['x', '23', '26', '0', '<b>a</b>'], ['y', '24', '27', '1', '<b>b</b>'], ['m', '12', '15', '15', '<b>p</b>']])}
        <p>So <code>"xym"</code> → <code>"abp"</code>. If k can be huge (10<sup>9</sup>), first do <code>k %= 26</code>; if k can be negative use <code>((x % 26) + 26) % 26</code>.</p>`, code: `static String caesar(String s, int k) {
    k = ((k % 26) + 26) % 26;                   // handle huge or negative k
    char[] a = s.toCharArray();                 // mutable copy
    for (int i = 0; i < a.length; i++) {
        if (a[i] >= 'a' && a[i] <= 'z') {
            a[i] = (char) ('a' + (a[i] - 'a' + k) % 26);
        }
    }
    return new String(a);                       // "xym", 3 -> "abp"
}` },
      { title: 'Compile-time constants vs runtime concatenation (== surprises)', html: `<p>Why does <code>==</code> sometimes "work" on Strings and fool beginners?</p>
        ${H.table(['Expression', '==', 'Why'], [
          ['<code>"hel" + "lo" == "hello"</code>', '<span class="c-g">true</span>', 'both parts are literals → the compiler joins them into one literal → pooled'],
          ['<code>x + "lo" == "hello"</code> (x = "hel" variable)', '<span class="c-r">false</span>', 'joined at runtime → a new heap object'],
          ['<code>(x + "lo").intern() == "hello"</code>', '<span class="c-g">true</span>', 'intern returns the pooled copy'],
          ['<code>(x + "lo").equals("hello")</code>', '<span class="c-g">true</span>', 'compares letters — always correct']
        ])}
        <p>Tests that pass "by luck" with literals fail on real input read from a file or network. Use <code>equals</code> (or <code>Objects.equals(a, b)</code> when either may be null).</p>` }
    ],
    deepDive: `<h4>How Java really stores a String (2026, JDK 21+)</h4>
      <ul>
        <li><b>Compact strings (Java 9+):</b> internally a <code>byte[]</code> plus a <code>coder</code> flag. If every char fits in Latin-1, each char takes <b>1 byte</b>; otherwise UTF-16 with 2 bytes per char. You never see this, but it halves memory for ASCII text.</li>
        <li><b>Hash caching:</b> <code>hashCode()</code> = s[0]·31<sup>n−1</sup> + s[1]·31<sup>n−2</sup> + … + s[n−1] (int overflow allowed). It is computed once and cached in the object — safe only <i>because</i> the String is immutable. That is why Strings are perfect HashMap keys. (Notice this is a polynomial hash with base 31 — the same idea as Rabin-Karp later in this module.)</li>
        <li><b>substring copies:</b> since Java 7u6 <code>substring</code> copies the characters (O(length)). Old Java shared the parent array, which caused memory leaks. So substring inside a loop is not free.</li>
        <li><b>The pool lives in the normal heap</b> (since Java 7) and is garbage-collected; <code>intern()</code> is a hash-table lookup — useful for deduplicating millions of repeated values, but rarely needed in interviews.</li>
      </ul>
      <h4>char is NOT always "a letter"</h4>
      <p>A Java <code>char</code> is a 16-bit UTF-16 <b>code unit</b>. Emoji such as 😀 need <b>two</b> chars (a surrogate pair), so <code>"😀".length()</code> is 2 and reversing char by char corrupts it. For real Unicode use <code>s.codePoints()</code>, <code>Character.isLetter(int)</code> and <code>Character.toChars</code>. The <code>c - 'a'</code> trick is valid <b>only</b> when the problem promises lowercase a–z; for "any ASCII" use <code>int[128]</code>, for "any character" use a <code>HashMap&lt;Character, Integer&gt;</code>.</p>
      <h4>Arithmetic gotchas</h4>
      <ul>
        <li><code>char + char</code> is an <b>int</b>: <code>'a' + 'b'</code> prints 195, and <code>"" + 'a' + 'b'</code> prints "ab". Cast back with <code>(char)</code>.</li>
        <li><code>Character.getNumericValue('7')</code> = 7, but <code>c - '0'</code> is faster and clearer for ASCII digits.</li>
        <li>Upper ↔ lower in ASCII differ by exactly 32 (one bit: <code>c ^ 32</code> toggles case for letters) — cute, but <code>Character.toLowerCase</code> is clearer.</li>
        <li><code>charAt(i)</code> does a bounds check each call; in very hot loops, <code>toCharArray()</code> once is slightly faster but costs an O(N) copy.</li>
      </ul>`,
    aiEra: `<p><b>What AI changes:</b> Copilot-style tools autocomplete String code instantly, so typing speed no longer matters. What matters is spotting the <b>subtle bugs AI loves to produce</b>: comparing Strings with <code>==</code>, forgetting to assign the result of <code>trim()</code>, using <code>c - 'a'</code> on input that contains uppercase or digits (ArrayIndexOutOfBounds), and reversing Strings char by char that contain emoji.</p>
      <p><b>Use AI as a partner:</b> ask <code>"List 8 tricky inputs for a Java anagram checker: empty, unicode, uppercase, different lengths..."</code> and run them against your own code. Ask it to explain compact strings or the hashCode formula, then verify against the JDK source.</p>
      <p><b>Fun connection:</b> LLMs read <i>tokens</i>, not characters — that is why chatbots historically miscounted letters in words like "strawberry". Character-level reasoning (exactly what <code>cnt[c - 'a']</code> does) is something you still need to own, and when you build AI features you will write this kind of counting/cleaning code around model inputs and outputs.</p>
      <p><b>What you must still own:</b> explaining <code>==</code> vs <code>equals</code>, why immutability makes hash caching safe, and the O(1)-space int[26] trick — interviewers ask these to see if you understand memory, not just syntax.</p>`,
    problems: [{
      title: 'Valid Anagram',
      level: 'Easy',
      tags: ['char arithmetic', 'counting', 'string'],
      companies: ['Amazon', 'Google', 'Bloomberg'],
      statement: `<p>Given two strings <code>s</code> and <code>t</code>, return <code>true</code> if <code>t</code> is an <b>anagram</b> of <code>s</code> — that is, it uses exactly the same letters the same number of times, just in a different order — otherwise return <code>false</code>.</p>`,
      constraints: `1 ≤ |s|, |t| ≤ 5·10<sup>4</sup>; s and t contain only lowercase English letters.`,
      example: `<p>s = <code>"anagram"</code>, t = <code>"nagaram"</code> → <b class="c-g">true</b>: both have a×3, n×1, g×1, r×1, m×1.</p>
        <p>s = <code>"rat"</code>, t = <code>"car"</code> → <b class="c-r">false</b>: s has a "t", t has a "c".</p>
        ${H.arr([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1], { label: 'cnt after +s ("rat")', hl: { 0: 'g', 17: 'g', 19: 'g' } })}
        <p class="c-m">Slots shown 0..19: a (0), r (17), t (19). Subtracting t = "car" makes slot 2 (c) go to −1 → not an anagram.</p>`,
      brute: {
        why: `<p>For each letter of s, search t for an unused equal letter and mark it used: O(N) search per letter → O(N<sup>2</sup>) ≈ 2.5·10<sup>9</sup> steps for N = 5·10<sup>4</sup>. Sorting both strings (O(N log N)) is acceptable but still does more work than needed. The wasted work: we only care <b>how many</b> of each letter, not where they are.</p>`,
        code: `
          boolean isAnagramBrute(String s, String t) {
              if (s.length() != t.length()) return false;
              boolean[] used = new boolean[t.length()];
              for (int i = 0; i < s.length(); i++) {
                  boolean found = false;
                  for (int j = 0; j < t.length(); j++) {          // linear search every time
                      if (!used[j] && t.charAt(j) == s.charAt(i)) { used[j] = true; found = true; break; }
                  }
                  if (!found) return false;
              }
              return true;
          }`
      },
      mcq: {
        q: 'The strings contain only lowercase letters. Which structure gives O(1) extra space and O(N) time?',
        options: ['A HashMap&lt;Character, Integer&gt;', 'An int[26] indexed by <code>c - \'a\'</code>', 'Sorting both strings', 'A HashSet&lt;Character&gt;'],
        answer: 1,
        explain: 'Only 26 possible letters → a fixed array of 26 counters is O(1) space and every update is a single array jump. A HashSet loses counts ("aab" vs "abb"), and sorting is O(N log N).'
      },
      hints: [
        `<p><b>Aha:</b> two strings are anagrams exactly when every letter appears the same number of times in both. Order is irrelevant — so count, don't compare positions.</p>`,
        `<p>Use one <code>int[26]</code>: add 1 for each letter of s (<code>cnt[c - 'a']++</code>), subtract 1 for each letter of t. Anagram ⇔ every slot ends at 0.</p>`,
        `<p><b>Traps:</b> different lengths → return false immediately; the follow-up "Unicode input" needs a HashMap instead of int[26]. <b>Recipe:</b> if lengths differ return false; for i: cnt[s[i]−'a']++, cnt[t[i]−'a']−−; return all slots == 0.</p>`
      ],
      solution: {
        approach: `<p>One counting array: +1 for letters of s, −1 for letters of t; anagram iff all zero.</p>`,
        code: `
          class Solution {
              public boolean isAnagram(String s, String t) {
                  if (s.length() != t.length()) return false;   // different sizes can never match
                  int[] cnt = new int[26];                      // one counter per letter a..z
                  for (int i = 0; i < s.length(); i++) {
                      cnt[s.charAt(i) - 'a']++;                 // letter from s: +1
                      cnt[t.charAt(i) - 'a']--;                 // letter from t: -1
                  }
                  for (int c : cnt) {
                      if (c != 0) return false;                 // some letter count differs
                  }
                  return true;
              }

              public static void main(String[] args) {
                  Solution sol = new Solution();
                  System.out.println(sol.isAnagram("anagram", "nagaram")); // true
                  System.out.println(sol.isAnagram("rat", "car"));         // false
              }
          }`,
        alt: [{ lang: 'python', code: `from collections import Counter

def is_anagram(s, t):
    # Counter builds a letter -> count map; equal maps means anagram
    return len(s) == len(t) and Counter(s) == Counter(t)

print(is_anagram("anagram", "nagaram"))  # True
print(is_anagram("rat", "car"))          # False`, run: true }],
        dry: {
          head: ['i', 's[i] → slot', 't[i] → slot', 'changed slots after step'],
          rows: [
            ['0', 'r → 17 (+1)', 'c → 2 (−1)', 'r=1, c=−1'],
            ['1', 'a → 0 (+1)', 'a → 0 (−1)', 'a=0 (cancelled), r=1, c=−1'],
            ['2', 't → 19 (+1)', 'r → 17 (−1)', 'r=0, t=1, c=−1'],
            ['end', '—', '—', '<span class="c-r">slot c = −1, slot t = 1 → false</span>']
          ]
        },
        complexity: `<p><b>Time O(N)</b> — one pass plus a 26-slot check. <b>Space O(1)</b> — the array has 26 slots no matter how long the strings are.</p>`,
        followUps: ['What if the inputs contain Unicode characters? (HashMap&lt;Integer, Integer&gt; over code points)', 'Group many words into anagram families (see Group Anagrams in practice).', 'Find all anagrams of p inside s (sliding window with two int[26]).']
      }
    }]
  });

  // =====================================================================
  // TOPIC 2 — Palindromes: two-pointer check
  // =====================================================================
  topics.push({
    title: 'Palindromes: Two-Pointer Check & Valid Palindrome (ignore non-alphanumerics)',
    analogy: `<p><b>Fold a paper strip in half.</b> Write a word on a strip of paper and fold it exactly in the middle. If every letter lands on top of the <i>same</i> letter, the word is a palindrome ("racecar", "level", "noon").</p>
      <p>Two friends do the same thing without paper: one starts at the <b>left end</b>, one at the <b>right end</b>, they read one letter each, compare, and both take one step toward the middle. The moment they read different letters — stop, it is not a palindrome. If they meet in the middle, it is.</p>`,
    explain: `<p>A <b>palindrome</b> reads the same forwards and backwards. Check it with two pointers:</p>
      <ul><li><code>l</code> starts at index 0, <code>r</code> starts at index n−1.</li>
      <li>While <code>l &lt; r</code>: if <code>s[l] ≠ s[r]</code> → <span class="c-r">not a palindrome</span>; else <code>l++</code>, <code>r--</code>.</li>
      <li>If the pointers meet or cross → <span class="c-g">palindrome</span>.</li></ul>
      ${H.arr('racecar'.split(''), { label: 'racecar', hl: { 0: 'g', 6: 'g', 1: 'b', 5: 'b', 2: 'y', 4: 'y', 3: 'p' }, ptr: { 0: 'l', 6: 'r' } })}
      ${H.table(['step', 'l', 'r', 's[l]', 's[r]', 'result'], [
        ['1', '0', '6', 'r', 'r', '<span class="c-g">same → move in</span>'],
        ['2', '1', '5', 'a', 'a', '<span class="c-g">same → move in</span>'],
        ['3', '2', '4', 'c', 'c', '<span class="c-g">same → move in</span>'],
        ['4', '3', '3', '—', '—', '<span class="c-p">l = r → middle reached → palindrome</span>']
      ])}
      <p><b>Odd vs even length:</b> "racecar" (odd) stops with both pointers on the middle letter <code>e</code> — a single middle letter matches itself. "noon" (even) stops when the pointers <i>cross</i> (l = 2, r = 1). The same loop handles both.</p>
      <h4>Valid Palindrome — ignore spaces, commas, case</h4>
      <p>Real sentences have junk: <code>"A man, a plan, a canal: Panama"</code>. Rule: <b>skip</b> anything that is not a letter or digit, and compare letters <b>ignoring case</b>. We do not build a cleaned copy — each pointer simply jumps over junk:</p>
      ${H.arr('Ab, bA'.split('').map(function (c) { return c === ' ' ? '␣' : c; }), { label: '"Ab, bA"', hl: { 2: 'm', 3: 'm', 0: 'g', 5: 'g', 1: 'y', 4: 'y' } })}
      <p>${H.c('m', 'Grey')} cells (comma, space) are skipped. ${H.c('g', 'A vs A')} then ${H.c('y', 'b vs b')} match → <b>true</b>. Time O(N), extra space O(1).</p>`,
    clues: [
      '"reads the <b>same forward and backward</b>" / "mirror" / "symmetric string" → two pointers from both ends.',
      '"<b>considering only alphanumeric characters and ignoring cases</b>" → skip with <code>Character.isLetterOrDigit</code>, compare with <code>Character.toLowerCase</code>.',
      '"<b>O(1) extra space</b>" → do not build a reversed copy; move <code>l</code> and <code>r</code> inside the original string.',
      '"<b>after deleting at most one character</b>" → same two pointers; on the first mismatch try skipping left OR right once.',
      '"palindrome" + "substring" → not this check alone; see Expand Around Center later in this module.'
    ],
    code: `
      class PalinCheck {
          // Plain palindrome check on s[l..r] (inclusive) with two pointers
          static boolean isPal(String s, int l, int r) {
              while (l < r) {
                  if (s.charAt(l) != s.charAt(r)) return false; // mismatch -> not a palindrome
                  l++;                                         // step inward from the left
                  r--;                                         // step inward from the right
              }
              return true;                                     // pointers met/crossed: all pairs matched
          }

          public static void main(String[] args) {
              System.out.println(isPal("racecar", 0, 6)); // true  (odd length)
              System.out.println(isPal("noon", 0, 3));    // true  (even length)
              System.out.println(isPal("ab", 0, 1));      // false
          }
      }`,
    codeTitle: 'Two-pointer palindrome check',
    viz: {
      title: 'Valid Palindrome: two pointers that skip junk',
      input: "No 'x' in Nixon",
      inputLabel: 'any sentence (max 30 chars)',
      gen: function (input) {
        var s = readStr(input, "No 'x' in Nixon", 30, 'a sentence');
        var a = chars(s), n = s.length, frames = [];
        function alnum(c) { return /[A-Za-z0-9]/.test(c); }
        var skipped = {};
        function hlNow(l, r, cl, cr) {
          var h = {}; for (var k in skipped) h[k] = 'done';
          if (l >= 0 && l < n) h[l] = cl; if (r >= 0 && r < n) h[r] = cr; return h;
        }
        var l = 0, r = n - 1;
        frames.push({ narr: 'Put <b>l</b> on the first character and <b>r</b> on the last. Rule of the game: letters and digits count, everything else (spaces, quotes, commas) is skipped, and upper/lower case are treated the same.', parts: [
          { type: 'array', label: 'text', values: a, ptr: (function () { var p = {}; p[0] = 'l'; if (n - 1 !== 0) p[n - 1] = 'r'; else p[0] = ['l', 'r']; return p; })() },
          { type: 'vars', vals: { l: l, r: r } }
        ] });
        var verdict = true;
        while (l < r) {
          while (l < r && !alnum(s[l])) {
            skipped[l] = 1;
            frames.push({ narr: 's[l] = ' + q(s[l]) + ' is not a letter or digit, so <b>l</b> hops over it (l++). We never build a cleaned copy — we just skip.', parts: [
              { type: 'array', label: 'text', values: a, ptr: (function () { var p = {}; p[l] = 'l'; p[r] = 'r'; return p; })(), hl: hlNow(l, r, 'bad', 'cur') },
              { type: 'vars', vals: { l: l, r: r } }
            ] });
            l++;
          }
          while (l < r && !alnum(s[r])) {
            skipped[r] = 1;
            frames.push({ narr: 's[r] = ' + q(s[r]) + ' is junk, so <b>r</b> hops over it (r--).', parts: [
              { type: 'array', label: 'text', values: a, ptr: (function () { var p = {}; p[l] = 'l'; p[r] = 'r'; return p; })(), hl: hlNow(l, r, 'cur', 'bad') },
              { type: 'vars', vals: { l: l, r: r } }
            ] });
            r--;
          }
          if (l >= r) break;
          var cl = s[l].toLowerCase(), cr = s[r].toLowerCase(), same = cl === cr;
          frames.push({
            narr: 'Compare ' + q(s[l]) + ' and ' + q(s[r]) + ' → lowercase ' + q(cl) + ' vs ' + q(cr) + ': ' + (same ? '<span class="c-g">same</span>. Both pointers step toward the middle.' : '<span class="c-r">different!</span> A mirror would fail here, so the answer is <b>false</b>. Stop immediately.'),
            parts: [
              { type: 'array', label: 'text', values: a, ptr: (function () { var p = {}; p[l] = 'l'; p[r] = 'r'; return p; })(), hl: hlNow(l, r, same ? 'ok' : 'bad', same ? 'ok' : 'bad') },
              { type: 'vars', vals: { l: l, r: r, 'lower(s[l])': cl, 'lower(s[r])': cr }, hl: { 'lower(s[l])': same ? 'ok' : 'bad', 'lower(s[r])': same ? 'ok' : 'bad' } }
            ]
          });
          if (!same) { verdict = false; break; }
          skipped[l] = 1; skipped[r] = 1;
          l++; r--;
        }
        frames.push({ narr: verdict ? 'Pointers met (or crossed) and every pair matched → <span class="c-g"><b>true</b>, it is a valid palindrome</span>.' : 'One mismatch is enough → <span class="c-r"><b>false</b></span>.', parts: [
          { type: 'array', label: 'text', values: a, hl: hlNow(-1, -1) },
          { type: 'vars', vals: { answer: verdict ? 'true' : 'false' }, hl: { answer: verdict ? 'ok' : 'bad' } }
        ] });
        frames.push({ narr: 'Cost: each pointer only moves inward, so together they visit each character at most once → <b>O(N) time</b>, and we used just two integers → <b>O(1) extra space</b>.', parts: [
          { type: 'text', html: '<b>Recipe:</b> skip junk on the left, skip junk on the right, compare lowercase, move both inward, repeat while l &lt; r.' }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Valid Palindrome II — allowed to delete at most one character', html: `<p><code>"abca"</code>: l = 0, r = 3 → a = a ✓. l = 1, r = 2 → ${H.c('r', 'b ≠ c')}. We may delete <b>one</b> of them, so try both: skip the left one → is <code>s[2..2] = "c"</code> a palindrome? yes → <b class="c-g">true</b>.</p>
        ${H.arr('abca'.split(''), { hl: { 0: 'g', 3: 'g', 1: 'r', 2: 'r' }, ptr: { 1: 'l', 2: 'r' } })}
        <p>Why only two tries? Everything outside l..r already matched, so the deleted character <i>must</i> be s[l] or s[r]. Each try is a plain O(N) check → total O(N).</p>`, code: `static boolean validPalindrome(String s) {
    int l = 0, r = s.length() - 1;
    while (l < r) {
        if (s.charAt(l) != s.charAt(r)) {
            // first mismatch: delete s[l] OR delete s[r], then the rest must be a plain palindrome
            return isPal(s, l + 1, r) || isPal(s, l, r - 1);
        }
        l++;
        r--;
    }
    return true;                       // already a palindrome, nothing to delete
}

static boolean isPal(String s, int l, int r) {
    while (l < r) if (s.charAt(l++) != s.charAt(r--)) return false;
    return true;
}` },
      { title: 'Palindrome permutation — can the letters be rearranged into a palindrome?', html: `<p>In a palindrome every letter has a mirror partner, except possibly <b>one</b> middle letter. So: count letters; at most one letter may have an <b>odd</b> count.</p>
        ${H.table(['word', 'counts', 'odd counts', 'answer'], [
          ['carerac', 'c2 a2 r2 e1', '1 (e)', '<span class="c-g">yes</span> ("racecar")'],
          ['aabb', 'a2 b2', '0', '<span class="c-g">yes</span> ("abba")'],
          ['abc', 'a1 b1 c1', '3', '<span class="c-r">no</span>']
        ])}
        <p>Here we never use two pointers — the clue "<i>rearrange</i>" means order does not matter, so counting (Topic 1) is the tool.</p>`, code: `static boolean canPermutePalindrome(String s) {
    int[] cnt = new int[26];
    for (char c : s.toCharArray()) cnt[c - 'a']++;
    int odd = 0;
    for (int x : cnt) if (x % 2 == 1) odd++;
    return odd <= 1;                  // at most one letter may sit alone in the middle
}` },
      { title: 'Palindrome number without converting to a String', html: `<p>Is 1221 a palindrome? Reverse only the <b>second half</b> of the digits using % 10 and / 10, then compare with the first half.</p>
        ${H.table(['x', 'rev', 'step'], [['1221', '0', 'start'], ['122', '1', 'take last digit 1'], ['12', '12', 'take 2 → rev = 1·10 + 2'], ['12', '12', 'stop: x ≤ rev; x == rev → <span class="c-g">true</span>']])}
        <p>Odd length (12321): stop with x = 12, rev = 123 → compare x == rev / 10. Negative numbers and numbers ending in 0 (except 0 itself) are never palindromes. Same two-ends idea, done with arithmetic.</p>`, code: `static boolean isPalindromeNumber(int x) {
    if (x < 0 || (x % 10 == 0 && x != 0)) return false;
    int rev = 0;
    while (x > rev) {                 // stop when we've reversed half the digits
        rev = rev * 10 + x % 10;
        x /= 10;
    }
    return x == rev || x == rev / 10; // even length || odd length (drop middle digit)
}` }
    ],
    deepDive: `<h4>Why the two-pointer check is correct (and minimal)</h4>
      <p>Definition: s is a palindrome ⇔ s[i] = s[n−1−i] for every i. The loop checks exactly the pairs (0, n−1), (1, n−2), … — ⌊n/2⌋ comparisons, each character read at most once. Any correct algorithm must read every character at least once (changing an unread one could break the palindrome), so O(N) is optimal.</p>
      <h4>Variations interviewers escalate to</h4>
      <ul>
        <li><b>Delete at most one (Valid Palindrome II):</b> greedy is safe because the pairs outside the first mismatch already match; the deleted char must be one of the two mismatched ones. Still O(N).</li>
        <li><b>Delete at most k:</b> greedy branching explodes (2<sup>k</sup>). Instead: minimum deletions = n − LPS, where LPS = longest palindromic <i>subsequence</i> (a DP problem, DSA DP I/II). Answer is yes iff n − LPS ≤ k.</li>
        <li><b>Palindrome linked list:</b> no random access → find the middle with slow/fast pointers, reverse the second half, compare, restore. O(N) time, O(1) space (Linked Lists module).</li>
        <li><b>Recursive check</b> <code>isPal(l, r) = s[l]==s[r] &amp;&amp; isPal(l+1, r−1)</code> is elegant but uses N/2 stack frames — 10<sup>5</sup> chars can throw <code>StackOverflowError</code>. Prefer the loop.</li>
      </ul>
      <h4>Production reality</h4>
      <p><code>Character.isLetterOrDigit</code> and <code>toLowerCase</code> are Unicode-aware: "É" counts as a letter, and some characters (like Turkish dotless ı or German ß) do not round-trip case cleanly. For human text you may need normalization (<code>java.text.Normalizer</code>, NFC/NFD) before comparing. Building a cleaned copy with <code>replaceAll("[^A-Za-z0-9]", "")</code> is readable and still O(N), but allocates extra memory and compiles a regex.</p>`,
    aiEra: `<p><b>What AI changes:</b> any assistant will instantly produce <code>new StringBuilder(s).reverse().toString().equals(s)</code>. It is correct, but uses O(N) extra memory and ignores the "only alphanumeric, ignore case" rule unless you ask. The interview value is in the <b>O(1)-space two-pointer version</b> and in the follow-ups (delete one, delete k, linked list).</p>
      <p><b>Use AI as a partner:</b> ask it to <i>generate adversarial inputs</i>: only punctuation (<code>",.!"</code>), a single character, "0P" (digits count!), mixed case, an emoji. Ask it to explain why Valid Palindrome II needs only two branches — then check the explanation against your own proof.</p>
      <p><b>Where AI goes wrong:</b> skipping loops without the <code>l &lt; r</code> guard (index out of bounds on all-junk input), returning after the first branch only in the "delete one" version, and recursive solutions that overflow the stack on long inputs.</p>
      <p><b>What you must still own:</b> recognising that "rearrange" means counting while "reads the same" means two pointers, and explaining why the greedy delete-one choice is safe.</p>`,
    problems: [{
      title: 'Valid Palindrome',
      level: 'Easy',
      tags: ['two pointers', 'string'],
      statement: `<p>A phrase is a palindrome if, after converting all uppercase letters to lowercase and <b>removing all non-alphanumeric characters</b>, it reads the same forward and backward. Given a string <code>s</code>, return <code>true</code> if it is a palindrome, otherwise <code>false</code>.</p>`,
      constraints: `1 ≤ |s| ≤ 2·10<sup>5</sup>; s consists of printable ASCII characters.`,
      example: `<p>Input: <code>"A man, a plan, a canal: Panama"</code> → cleaned: ${H.c('g', 'amanaplanacanalpanama')} → Output: <b class="c-g">true</b></p>
        <p>Input: <code>"race a car"</code> → cleaned: <code>raceacar</code>. Compare ends: r=r, a=a, c=c, ${H.c('r', 'e vs a')} → Output: <b class="c-r">false</b></p>
        ${H.arr('Race car'.split('').map(function (c) { return c === ' ' ? '␣' : c; }), { label: '"Race car"', hl: { 0: 'g', 7: 'g', 1: 'b', 6: 'b', 2: 'y', 5: 'y', 4: 'm', 3: 'p' } })}
        <p>Small example used in the dry run: <code>"Race car"</code> → R/r, a/a, c/c match, the space is skipped, middle <code>e</code> matches itself → <b>true</b>.</p>`,
      brute: {
        why: `<p>Build a cleaned string with <code>+=</code>, build its reverse with <code>+=</code>, then compare. It is correct, but each <code>+=</code> copies the whole string built so far, so building costs 1 + 2 + ... + N ≈ N²/2 character copies — for N = 2·10<sup>5</sup> that is 2·10<sup>10</sup> copies. Plus two extra strings of memory. The wasted work: copying the same characters again and again just to look at each one once.</p>`,
        code: `
          boolean isPalindromeBrute(String s) {
              String clean = "";
              for (int i = 0; i < s.length(); i++) {
                  char c = s.charAt(i);
                  if (Character.isLetterOrDigit(c)) clean += Character.toLowerCase(c); // O(len) copy each time
              }
              String rev = "";
              for (int i = clean.length() - 1; i >= 0; i--) rev += clean.charAt(i);  // O(len) copy each time
              return clean.equals(rev);
          }`
      },
      mcq: {
        q: 'Your left pointer is on <code>\',\'</code> and your right pointer is on <code>\'a\'</code>. What should you do?',
        options: ['Return false — they are different characters', 'Move only the left pointer forward (skip the comma), then compare again', 'Move both pointers inward', 'Restart from the beginning after deleting the comma'],
        answer: 1,
        explain: 'The comma does not count. Skip it by moving <b>only</b> l, keep r where it is, and compare the next real character with s[r].'
      },
      hints: [
        `<p><b>Aha:</b> a palindrome is just "pair i matches pair n−1−i" for every outer pair. You never need the reversed string — compare the two ends and walk inward.</p>`,
        `<p>Use two integer pointers <code>l = 0</code>, <code>r = n − 1</code>. Before comparing, move <code>l</code> right while <code>s[l]</code> is not a letter/digit, and move <code>r</code> left while <code>s[r]</code> is not a letter/digit (<code>Character.isLetterOrDigit</code>).</p>`,
        `<p><b>Traps:</b> keep <code>l &lt; r</code> inside the skipping loops (a string of only junk like <code>",.!"</code> must return true, not crash); compare with <code>Character.toLowerCase</code>; digits count ("0P" is false). <b>Recipe:</b> while l &lt; r: skip junk on both sides → if lower(s[l]) ≠ lower(s[r]) return false → l++, r-- . After the loop return true.</p>`
      ],
      solution: {
        approach: `<p>Two pointers from both ends, skipping non-alphanumerics, comparing lowercase characters.</p>`,
        code: `
          class Solution {
              public boolean isPalindrome(String s) {
                  int l = 0, r = s.length() - 1;
                  while (l < r) {
                      // 1) skip junk on the left (spaces, commas, colons...)
                      while (l < r && !Character.isLetterOrDigit(s.charAt(l))) l++;
                      // 2) skip junk on the right
                      while (l < r && !Character.isLetterOrDigit(s.charAt(r))) r--;
                      // 3) compare ignoring case
                      if (Character.toLowerCase(s.charAt(l)) != Character.toLowerCase(s.charAt(r))) {
                          return false;                  // mirror broken
                      }
                      l++;                               // 4) both step toward the middle
                      r--;
                  }
                  return true;                           // every real pair matched
              }

              public static void main(String[] args) {
                  Solution sol = new Solution();
                  System.out.println(sol.isPalindrome("A man, a plan, a canal: Panama")); // true
                  System.out.println(sol.isPalindrome("race a car"));                     // false
                  System.out.println(sol.isPalindrome("Race car"));                       // true
              }
          }`,
        dry: {
          head: ['l', 'r', 's[l]', 's[r]', 'action'],
          rows: [
            ['0', '7', 'R', 'r', '<span class="c-g">r = r</span> → l=1, r=6'],
            ['1', '6', 'a', 'a', '<span class="c-g">match</span> → l=2, r=5'],
            ['2', '5', 'c', 'c', '<span class="c-g">match</span> → l=3, r=4'],
            ['3', '4', 'e', '␣', 's[4] is a space → <span class="c-m">r-- → r = 3</span>; now l = r, skipping stops'],
            ['3', '3', 'e', 'e', 'compare e with itself → match → l=4, r=2'],
            ['4', '2', '—', '—', '<span class="c-p">loop ends (l &gt; r) → return true</span>']
          ]
        },
        complexity: `<p><b>Time O(N):</b> <code>l</code> only moves right and <code>r</code> only moves left, so together they take at most N steps. <b>Space O(1):</b> two integers, no cleaned or reversed copy.</p>`
      }
    }]
  });

  // =====================================================================
  // TOPIC 3 — StringBuilder efficiency
  // =====================================================================
  topics.push({
    title: 'StringBuilder Efficiency: Why s += c in a Loop Is O(N²)',
    analogy: `<p><b>The re-copied shopping list.</b> Imagine that every time you remember one more item, you take a <i>fresh sheet</i> and re-write the <b>whole</b> list plus the new item. Item 1: write 1 line. Item 2: write 2 lines. Item 100: write 100 lines. That is what <code>s += c</code> does, because a String can never change (immutability).</p>
      <p><b>The notepad with spare pages.</b> A <code>StringBuilder</code> is a notepad with empty lines at the bottom. Adding an item = write one line. Only when the notepad is full do you buy one about <b>twice as big</b> and copy once. Copies become rare, so adding is O(1) on average.</p>`,
    explain: `<h4>Why <code>+=</code> is quadratic</h4>
      <p><code>s += c</code> secretly means: make a new String of length <code>|s| + 1</code>, copy all old characters, put <code>c</code> at the end. Building a string of N characters this way costs:</p>
      ${H.table(['append #', 'new length', 'chars copied this step', 'total so far'], [
        ['1', '1', '1', '1'], ['2', '2', '2', '3'], ['3', '3', '3', '6'], ['4', '4', '4', '10'], ['5', '5', '5', '15'],
        ['N', 'N', 'N', '<span class="c-r">N(N+1)/2 ≈ N²/2</span>']
      ])}
      <p>For N = 10<sup>5</sup> that is about <span class="c-r">5·10<sup>9</sup> character copies</span> → Time Limit Exceeded.</p>
      <h4>Why StringBuilder is linear</h4>
      <p>StringBuilder keeps a hidden <code>char</code> array with <b>extra capacity</b>. <code>append</code> writes into the next free cell — O(1). When it is full, Java allocates a new array of size about <b>2 × old + 2</b> and copies once. The copy sizes grow like 1, 2, 4, 8, ... and that sum is less than 2N, so N appends cost <span class="c-g">O(N) total</span> ("amortized O(1)" per append).</p>
      ${H.table(['Operation', 'StringBuilder method', 'Cost'], [
        ['add at end', '<code>sb.append(x)</code> (char, int, String, part of a String)', 'amortized O(1) per char'],
        ['read / change one char', '<code>sb.charAt(i)</code>, <code>sb.setCharAt(i, c)</code>', 'O(1)'],
        ['remove last char', '<code>sb.deleteCharAt(sb.length() - 1)</code>', 'O(1) (backtracking!)'],
        ['reverse everything', '<code>sb.reverse()</code>', 'O(N)'],
        ['insert at front', '<code>sb.insert(0, x)</code>', '<span class="c-r">O(N)</span> — shifts everything; avoid in loops'],
        ['finish', '<code>sb.toString()</code>', 'O(N), do it once at the end']
      ])}
      <p><b>Note:</b> a one-line expression like <code>String t = a + "-" + b;</code> is fine — the compiler joins it in one go. The danger is <code>+=</code> <b>inside a loop</b>, where each round makes a new full copy.</p>`,
    clues: [
      '"<b>build / return a new string</b>" from many small pieces (encode, compress, join, reverse words) → <code>StringBuilder</code>.',
      '<code>|s| ≤ 10<sup>5</sup></code> or more and you see <code>result += ...</code> inside a loop → hidden O(N<sup>2</sup>); switch to StringBuilder.',
      '"<b>remove the last character</b>" while exploring (backtracking, generate parentheses) → <code>sb.deleteCharAt(sb.length() - 1)</code>.',
      '"<b>in-place</b>" / "modify characters" → <code>char[]</code> (fixed size) or StringBuilder <code>setCharAt</code>.',
      '"<b>prepend</b>" many times → append and <code>reverse()</code> once at the end instead of <code>insert(0, ...)</code>.'
    ],
    code: [`
      class BuildDemo {
          // SLOW: every += creates a brand-new String and copies all old chars -> O(N^2)
          static String slow(int n) {
              String s = "";
              for (int i = 0; i < n; i++) {
                  s += (char) ('a' + i % 26);
              }
              return s;
          }

          // FAST: StringBuilder writes into spare capacity -> O(N) total
          static String fast(int n) {
              StringBuilder sb = new StringBuilder();
              for (int i = 0; i < n; i++) {
                  sb.append((char) ('a' + i % 26));
              }
              return sb.toString();        // one final copy
          }

          public static void main(String[] args) {
              long t0 = System.nanoTime();
              fast(100000);
              long t1 = System.nanoTime();
              slow(100000);                // noticeably slower
              long t2 = System.nanoTime();
              System.out.println("fast ms = " + (t1 - t0) / 1000000 + ", slow ms = " + (t2 - t1) / 1000000);
          }
      }`, `
      class SbToolbox {
          public static void main(String[] args) {
              StringBuilder sb = new StringBuilder("abc");
              sb.append('d').append(12).append("xy");   // abcd12xy
              sb.setCharAt(0, 'A');                       // Abcd12xy
              sb.deleteCharAt(sb.length() - 1);           // Abcd12x  (undo last, used in backtracking)
              sb.reverse();                               // x21dcbA
              System.out.println(sb.toString() + " length=" + sb.length());
          }
      }`],
    codeTitle: ['Slow += vs fast StringBuilder', 'StringBuilder toolbox'],
    viz: {
      title: 'Work done: s += c versus StringBuilder.append',
      input: 'algorithms',
      inputLabel: 'word to build letter by letter (max 16)',
      gen: function (input) {
        var w = readStr(input, 'algorithms', 16, 'a word');
        var frames = [], plus = [], sbw = [], totP = 0, totS = 0, cap = 2, len = 0;
        frames.push({ narr: 'We will build <b>' + H.esc(w) + '</b> one letter at a time in two ways and count how many characters each way has to <b>write/copy</b>. (To see growth, pretend the builder starts with capacity 2; real Java starts at 16 and grows to old×2+2.)', parts: [
          { type: 'array', label: 'letters to add', values: chars(w) },
          { type: 'vars', vals: { 'String s': '""', 'sb capacity': cap } }
        ] });
        for (var k = 1; k <= w.length; k++) {
          var costP = k;                  // new String of length k: copy k-1 old + write 1
          var costS = 1, grew = false, oldCap = cap;
          len++;
          if (len > cap) { cap = cap * 2 + 2; costS += len - 1; grew = true; }
          totP += costP; totS += costS; plus.push(costP); sbw.push(costS);
          frames.push({
            narr: 'Add ' + q(w[k - 1]) + '. <b>s +=</b> makes a new String of length ' + k + ' → copies <span class="c-r">' + costP + '</span> chars. <b>StringBuilder</b> ' +
              (grew ? 'is full (capacity ' + oldCap + '), so it grows to ' + cap + ' and copies the ' + (len - 1) + ' old chars once, then writes 1 → <span class="c-y">' + costS + '</span>. This copy is rare.' : 'has spare room, so it writes just <span class="c-g">1</span> char.'),
            parts: [
              { type: 'array', label: 'built so far', values: chars(w.slice(0, k)), hl: oneHl(k - 1, 'ok') },
              { type: 'bars', label: 's += c : chars copied per step', values: plus.slice(), hl: oneHl(k - 1, 'bad') },
              { type: 'bars', label: 'sb.append : chars written per step', values: sbw.slice(), hl: oneHl(k - 1, grew ? 'cur' : 'ok') },
              { type: 'vars', vals: { 'total +=': totP, 'total sb': totS, 'sb capacity': cap }, hl: { 'total +=': 'bad', 'total sb': 'ok' } }
            ]
          });
        }
        var n = w.length;
        frames.push({ narr: 'Totals for N = ' + n + ': <b>+=</b> did ' + totP + ' = N(N+1)/2 copies; <b>StringBuilder</b> did only ' + totS + ' (always under 3N). For N = 100 000 that is about 5 000 000 000 versus about 300 000.', parts: [
          { type: 'vars', vals: { N: n, 'N(N+1)/2': n * (n + 1) / 2, 'sb work': totS }, hl: { 'N(N+1)/2': 'bad', 'sb work': 'ok' } },
          { type: 'text', html: 'Rule of thumb: <b>never</b> grow a String with += inside a loop. Use StringBuilder and call toString() once at the end.' }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Joining with commas — no trailing separator', html: `<p>Turn [3, 1, 4] into <code>"3,1,4"</code>. Beginners append <code>x + ","</code> and end with an extra comma. Three clean ways:</p>
        ${H.table(['Way', 'Idea'], [
          ['append separator <b>before</b> every item except the first', '<code>if (sb.length() &gt; 0) sb.append(\',\');</code>'],
          ['append then cut', '<code>sb.setLength(sb.length() - 1)</code> at the end (check non-empty!)'],
          ['library', '<code>String.join(",", list)</code>, <code>StringJoiner</code>, <code>Collectors.joining(",")</code> — all use a builder inside']
        ])}`, code: `static String joinNums(int[] a) {
    StringBuilder sb = new StringBuilder();
    for (int x : a) {
        if (sb.length() > 0) sb.append(',');   // separator only between items
        sb.append(x);
    }
    return sb.toString();                     // [3, 1, 4] -> "3,1,4"
}` },
      { title: 'Backtracking with one shared StringBuilder (append / deleteCharAt)', html: `<p>Generate all binary strings of length n. Instead of creating a new String at every step (<code>cur + "0"</code>), keep <b>one</b> builder: append a char, recurse, then <b>undo</b> by deleting the last char.</p>
        ${H.table(['call', 'sb before', 'action', 'sb after'], [['gen', '""', 'append 0', '"0"'], ['gen', '"0"', 'append 0 → print "00" → delete', '"0"'], ['gen', '"0"', 'append 1 → print "01" → delete', '"0"'], ['back', '"0"', 'delete → append 1', '"1"']])}
        <p>Each append/delete at the end is O(1), so the only real cost is printing the 2<sup>n</sup> answers.</p>`, code: `static void gen(int n, StringBuilder sb, List<String> out) {
    if (sb.length() == n) { out.add(sb.toString()); return; }
    for (char c = '0'; c <= '1'; c++) {
        sb.append(c);                    // choose
        gen(n, sb, out);                 // explore
        sb.deleteCharAt(sb.length() - 1);// un-choose (O(1) at the end)
    }
}` },
      { title: 'Prepending trap: integer to binary string', html: `<p>Converting 13 to binary produces digits <b>right to left</b> (13 % 2 = 1, 6 % 2 = 0, 3 % 2 = 1, 1 % 2 = 1). Using <code>sb.insert(0, d)</code> shifts the whole builder each time → O(N<sup>2</sup>). Append instead and reverse once:</p>
        ${H.table(['n', 'n % 2', 'sb (appended)'], [['13', '1', '1'], ['6', '0', '10'], ['3', '1', '101'], ['1', '1', '1011'], ['0', '—', 'reverse → <b class="c-g">1101</b>']])}`, code: `static String toBinary(int n) {
    if (n == 0) return "0";
    StringBuilder sb = new StringBuilder();
    while (n > 0) {
        sb.append(n % 2);                // least significant bit first
        n /= 2;
    }
    return sb.reverse().toString();      // 13 -> "1101"
}` }
    ],
    deepDive: `<h4>Inside StringBuilder</h4>
      <p>It extends <code>AbstractStringBuilder</code>: a <code>byte[] value</code> (Latin-1 or UTF-16, like String), an <code>int count</code> of used cells and a coder flag. Default capacity is 16. When an append would overflow, the new capacity is roughly <b>old × 2 + 2</b> (or exactly what is needed if that is bigger), and the old content is copied once with <code>Arrays.copyOf</code>.</p>
      <h4>Amortized O(1) — the proof in one line</h4>
      <p>Copies happen at sizes c, 2c, 4c, … ≤ N, and c + 2c + 4c + … &lt; 2N. Add the N single writes → under 3N work for N appends. If you know the final size, <code>new StringBuilder(n)</code> skips every resize.</p>
      <h4>What the compiler does with +</h4>
      <p>Since Java 9 (JEP 280), <code>a + b + c</code> in one expression compiles to an <code>invokedynamic</code> call that sizes the result once — efficient. But <code>s += x</code> <b>inside a loop</b> still creates a new String per iteration, so it remains O(N<sup>2</sup>). The JIT cannot remove that copy, because the old String might be referenced elsewhere.</p>
      <h4>Gotchas</h4>
      <ul>
        <li><code>StringBuffer</code> = old synchronized version — slower, almost never needed (one builder is rarely shared across threads).</li>
        <li><code>sb1.equals(sb2)</code> compares <b>identity</b>, not content! Use <code>sb1.compareTo(sb2) == 0</code> (Java 11+) or compare <code>toString()</code>.</li>
        <li><code>insert(0, …)</code> and <code>deleteCharAt(0)</code> are O(N) shifts; <code>reverse()</code> is O(N) but handles surrogate pairs correctly.</li>
        <li>Huge outputs (10<sup>6</sup> lines): one builder + one <code>System.out.print</code> (or a <code>PrintWriter</code>) is dramatically faster than 10<sup>6</sup> <code>println</code> calls.</li>
      </ul>`,
    aiEra: `<p><b>What AI changes:</b> generated Java code frequently uses <code>result += …</code> inside loops or <code>String.format</code> in hot paths because it "looks readable". It passes small tests and dies at N = 10<sup>5</sup>. Spotting this hidden O(N<sup>2</sup>) in AI-written code is now a core review skill.</p>
      <p><b>Use AI as a partner:</b> ask it to write a JMH micro-benchmark comparing <code>+=</code>, <code>StringBuilder</code> and <code>String.join</code> for N = 10<sup>3</sup>…10<sup>6</sup>, then run it yourself — numbers beat opinions. Ask it to review your code specifically for "allocation inside loops".</p>
      <p><b>Real AI-era use:</b> streaming LLM responses arrive as many small token chunks; accumulating them is exactly the append-many-small-pieces problem — use a builder (or a list + join), not repeated concatenation.</p>
      <p><b>What you must still own:</b> the amortized-doubling argument (it reappears in ArrayList, hash table resizing and dynamic arrays) and the habit of asking "how many times is each character copied?"</p>`,
    problems: [{
      title: 'String Compression (run-length encoding)',
      level: 'Easy',
      tags: ['stringbuilder', 'two pointers'],
      statement: `<p>Compress a string by replacing each run of the same character with the character followed by the run length. Example: <code>"aabcccccaaa"</code> → <code>"a2b1c5a3"</code>. If the compressed string is <b>not shorter</b> than the original, return the original string.</p>`,
      constraints: `1 ≤ |s| ≤ 10<sup>5</sup>; s has only letters a–z / A–Z.`,
      example: `${H.arr('aabcccccaaa'.split(''), { hl: { 0: 'b', 1: 'b', 2: 'y', 3: 'g', 4: 'g', 5: 'g', 6: 'g', 7: 'g', 8: 'p', 9: 'p', 10: 'p' } })}
        <p>Runs: ${H.c('b', 'aa')} ${H.c('y', 'b')} ${H.c('g', 'ccccc')} ${H.c('p', 'aaa')} → <b>a2 b1 c5 a3</b> → <code>"a2b1c5a3"</code> (8 chars &lt; 11, so return it).</p>
        <p><code>"abc"</code> → <code>"a1b1c1"</code> is longer (6 ≥ 3) → return <code>"abc"</code>.</p>`,
      brute: {
        why: `<p>Same run-scanning idea but gluing with <code>result += c + count</code>. Each <code>+=</code> copies the whole result built so far; with many short runs (e.g. "ababab...") the result grows by 2 chars per run, so total copying is about N<sup>2</sup> → 10<sup>10</sup> for N = 10<sup>5</sup>. The wasted work is re-copying the already-finished prefix every round.</p>`,
        code: `
          String compressBrute(String s) {
              String res = "";
              int i = 0;
              while (i < s.length()) {
                  char c = s.charAt(i);
                  int cnt = 0;
                  while (i < s.length() && s.charAt(i) == c) { i++; cnt++; }
                  res += c;            // full copy of res
                  res += cnt;          // another full copy
              }
              return res.length() < s.length() ? res : s;
          }`
      },
      mcq: {
        q: 'You are standing at the start of a run at index <code>i</code>. What is the cleanest way to get the run length?',
        options: ['Count all occurrences of s[i] in the whole string', 'Move a second pointer j forward while s[j] == s[i]; length = j − i', 'Use a HashMap of character → count', 'Sort the string first'],
        answer: 1,
        explain: 'Runs are <b>consecutive</b> equal characters. A second pointer j walks to the end of the run; j − i is its length and j is where the next run starts. A HashMap would merge the two separate "a" runs (giving a5 instead of a2 ... a3).'
      },
      hints: [
        `<p><b>Aha:</b> the string splits into <b>blocks of equal neighbours</b>. Each block becomes exactly "char + length". The end of one block is the start of the next, so one left-to-right walk is enough.</p>`,
        `<p>Use two pointers: <code>i</code> = start of the current run, <code>j</code> = runs ahead while <code>s[j] == s[i]</code>. Append <code>s[i]</code> and <code>j − i</code> to a <b>StringBuilder</b>, then jump <code>i = j</code>.</p>`,
        `<p><b>Traps:</b> counts can be more than 9 (e.g. "c12") — append the int, not a single digit char; return the original when the compressed one is <b>not shorter</b> (equal length → original); check <code>j &lt; n</code> before reading <code>s[j]</code>. <b>Recipe:</b> i = 0; while i &lt; n: j = i; while j &lt; n and s[j] == s[i]: j++; sb.append(s[i]).append(j − i); i = j. Return shorter of sb and s.</p>`
      ],
      solution: {
        approach: `<p>Scan runs with two pointers, append "char + count" to a StringBuilder, compare lengths at the end.</p>`,
        code: `
          class Solution {
              public String compress(String s) {
                  StringBuilder sb = new StringBuilder();
                  int n = s.length();
                  int i = 0;                                  // start of the current run
                  while (i < n) {
                      char c = s.charAt(i);
                      int j = i;
                      while (j < n && s.charAt(j) == c) j++;  // j stops at first different char
                      sb.append(c).append(j - i);             // e.g. 'c' then 5  -> "c5"
                      i = j;                                  // next run starts where this ended
                  }
                  // only use the compressed form if it really is shorter
                  return sb.length() < n ? sb.toString() : s;
              }

              public static void main(String[] args) {
                  Solution sol = new Solution();
                  System.out.println(sol.compress("aabcccccaaa")); // a2b1c5a3
                  System.out.println(sol.compress("abc"));         // abc
              }
          }`,
        dry: {
          head: ['i', 'c = s[i]', 'j (end)', 'run length j − i', 'sb after append'],
          rows: [
            ['0', 'a', '2', '2', '<code>a2</code>'],
            ['2', 'b', '3', '1', '<code>a2b1</code>'],
            ['3', 'c', '8', '5', '<code>a2b1c5</code>'],
            ['8', 'a', '11', '3', '<code>a2b1c5a3</code>'],
            ['11', '—', '—', '—', '<span class="c-p">8 &lt; 11 → return "a2b1c5a3"</span>']
          ]
        },
        complexity: `<p><b>Time O(N):</b> j only moves forward and i jumps to j, so every character is looked at once; each append is amortized O(1). <b>Space O(N)</b> for the builder (the output itself).</p>`
      }
    }, {
      title: 'Reverse Words in a String',
      level: 'Medium',
      tags: ['stringbuilder', 'two pointers', 'parsing'],
      statement: `<p>Given a string <code>s</code>, reverse the <b>order of the words</b>. A word is a run of non-space characters. The input may have leading/trailing spaces or several spaces between words; the output must have words separated by <b>exactly one space</b> and no extra spaces at the ends.</p>`,
      constraints: `1 ≤ |s| ≤ 10<sup>4</sup>; s has English letters, digits and spaces; at least one word.`,
      example: `${H.arr(' hello world  '.split('').map(function (c) { return c === ' ' ? '␣' : c; }), { hl: { 0: 'm', 6: 'm', 12: 'm', 13: 'm', 1: 'b', 2: 'b', 3: 'b', 4: 'b', 5: 'b', 7: 'g', 8: 'g', 9: 'g', 10: 'g', 11: 'g' } })}
        <p>Words: ${H.c('b', 'hello')} and ${H.c('g', 'world')}; ${H.c('m', 'spaces')} are dropped. Output: <code>"world hello"</code>.</p>
        <p><code>"the sky is blue"</code> → <code>"blue is sky the"</code>.</p>`,
      brute: {
        why: `<p>Split on spaces, then glue the words in reverse with <code>res += word + " "</code>. Each <code>+=</code> copies the entire result again — with many tiny words this is O(N<sup>2</sup>) character copies. Splitting also creates an array of all words first (extra memory). The repeated work is re-copying the growing answer for every word.</p>`,
        code: `
          String reverseWordsBrute(String s) {
              String[] w = s.trim().split(" +");       // regex: one or more spaces
              String res = "";
              for (int k = w.length - 1; k >= 0; k--) {
                  res += w[k];                          // full copy every time
                  if (k > 0) res += " ";
              }
              return res;
          }`
      },
      mcq: {
        q: 'If you scan the string from the <b>right end</b> to the left, in what order do you meet the words?',
        options: ['In the original order', 'In reversed order — exactly the order the answer needs', 'Random order', 'Alphabetical order'],
        answer: 1,
        explain: 'Walking from the right, you finish the last word first. So you can append each word to the StringBuilder as soon as you find it — no array of words and no reversing needed.'
      },
      hints: [
        `<p><b>Aha:</b> reading the string from the <b>end</b> gives you the words already in reversed order. Each word is a block between spaces: find its last character, then walk left to its first character.</p>`,
        `<p>Use an index <code>i</code> starting at <code>n − 1</code> and a <b>StringBuilder</b>. Skip spaces (i--), remember <code>end = i</code>, walk left while non-space, then the word is <code>s[i+1 .. end]</code>; append it with <code>sb.append(s, i + 1, end + 1)</code>.</p>`,
        `<p><b>Traps:</b> leading/trailing/multiple spaces (always skip them before reading a word); add a separating <code>' '</code> only if sb is not empty (no space before the first word); stop when i drops below 0 after skipping. <b>Recipe:</b> i = n−1; loop: skip spaces; if i &lt; 0 break; end = i; move i left over the word; if sb not empty append ' '; append s[i+1..end]. Return sb.</p>`
      ],
      solution: {
        approach: `<p>Scan right-to-left, cut out each word with two indices, append to a StringBuilder with single spaces.</p>`,
        code: `
          class Solution {
              public String reverseWords(String s) {
                  StringBuilder sb = new StringBuilder();
                  int i = s.length() - 1;
                  while (i >= 0) {
                      while (i >= 0 && s.charAt(i) == ' ') i--;   // skip spaces after/between words
                      if (i < 0) break;                           // only spaces were left
                      int end = i;                                // last char of this word
                      while (i >= 0 && s.charAt(i) != ' ') i--;   // walk to the space before the word
                      if (sb.length() > 0) sb.append(' ');        // exactly one space between words
                      sb.append(s, i + 1, end + 1);               // copy the word s[i+1..end]
                  }
                  return sb.toString();
              }

              public static void main(String[] args) {
                  Solution sol = new Solution();
                  System.out.println("[" + sol.reverseWords(" hello world  ") + "]");   // [world hello]
                  System.out.println("[" + sol.reverseWords("the sky is blue") + "]");  // [blue is sky the]
              }
          }`,
        dry: {
          head: ['i (start)', 'after skipping spaces', 'end', 'i after word', 'word s[i+1..end]', 'sb'],
          rows: [
            ['13', '11', '11', '6', 'world (7..11)', '<code>world</code>'],
            ['6', '5', '5', '0', 'hello (1..5)', '<code>world hello</code>'],
            ['0', '−1', '—', '—', '— (break)', '<span class="c-p">return "world hello"</span>']
          ]
        },
        complexity: `<p><b>Time O(N):</b> i only moves left, every character is visited once, each word is copied once into the builder. <b>Space O(N)</b> for the output builder (no words array).</p>`
      }
    }]
  });

  // =====================================================================
  // TOPIC 4 — Longest Palindromic Substring: expand around center
  // =====================================================================
  topics.push({
    title: 'Longest Palindromic Substring: Expand Around Center (odd & even centers)',
    analogy: `<p><b>Drop a pebble in a calm pond.</b> The ripples spread out <i>equally</i> to the left and right of where the pebble fell. A palindrome is the same: it is perfectly balanced around its <b>center</b>.</p>
      <p>So instead of checking every possible substring (thousands of them), stand at each possible center and let the "ripple" grow one step left and one step right <b>as long as the two new letters match</b>. The biggest ripple you ever see is the answer.</p>`,
    explain: `<p>Every palindrome has a center:</p>
      <ul><li><b>Odd length</b> ("aba", "racecar"): the center is <b>one letter</b>. Start with <code>l = r = c</code>.</li>
      <li><b>Even length</b> ("abba", "noon"): the center is the <b>gap between two letters</b>. Start with <code>l = c</code>, <code>r = c + 1</code>.</li></ul>
      <p>A string of length N has N letter-centers + (N−1) gap-centers = <b>2N − 1 centers</b>. From each, expand while <code>l ≥ 0</code>, <code>r &lt; n</code> and <code>s[l] == s[r]</code>. When the loop stops, the palindrome is <code>s[l+1 .. r−1]</code>, of length <code>r − l − 1</code>.</p>
      ${H.arr('babad'.split(''), { label: 'babad', hl: { 0: 'g', 1: 'y', 2: 'g' }, ptr: { 1: 'c' } })}
      ${H.table(['center', 'type', 'expansion steps', 'palindrome found', 'length'], [
        ['0 (b)', 'odd', 'b ✓ → out of bounds', 'b', '1'],
        ['1 (a)', 'odd', 'a ✓ → b=b ✓ → left edge', '<span class="c-g">bab</span>', '<b>3</b>'],
        ['2 (b)', 'odd', 'b ✓ → a=a ✓ → b≠d ✗', '<span class="c-g">aba</span>', '3'],
        ['gap 1|2', 'even', 'a≠b ✗ immediately', '(empty)', '0'],
        ['3 (a)', 'odd', 'a ✓ → b≠d ✗', 'a', '1']
      ])}
      <p>Even case example "cbbd": the gap between the two b's gives ${H.c('g', 'bb')} (length 2), which an odd-only search would miss — that is why we try <b>both</b> center types.</p>
      <p><b>Turning length back into a start index:</b> if the best length at center <code>c</code> is <code>len</code>, then <code>start = c − (len − 1) / 2</code> (integer division works for both odd and even).</p>
      ${H.table(['Approach', 'Time', 'Space'], [
        ['All substrings + check each', '<span class="c-r">O(N<sup>3</sup>)</span>', 'O(1)'],
        ['DP table isPal[i][j]', 'O(N<sup>2</sup>)', '<span class="c-r">O(N<sup>2</sup>)</span>'],
        ['<b>Expand around center</b>', 'O(N<sup>2</sup>)', '<span class="c-g">O(1)</span>'],
        ["Manacher's algorithm (advanced, just know the name)", 'O(N)', 'O(N)']
      ])}`,
    clues: [
      '"<b>longest palindromic substring</b>" (contiguous!) → expand around center.',
      '"<b>count palindromic substrings</b>" → same expansion, count every successful step instead of tracking the max.',
      '<code>|s| ≤ 1000</code> (or a few thousand) → O(N<sup>2</sup>) is the intended speed; O(N<sup>3</sup>) brute force is too slow.',
      '"<b>subsequence</b>" (letters may be skipped) is a different problem → DP, not this.',
      'Both "aba"-type and "abba"-type answers possible → remember <b>two</b> centers per position.'
    ],
    code: `
      class Expand {
          // grow outward from (l, r) while the ends match; return the palindrome length found
          static int expand(String s, int l, int r) {
              while (l >= 0 && r < s.length() && s.charAt(l) == s.charAt(r)) {
                  l--;   // one step left
                  r++;   // one step right
              }
              // loop stopped one step too far on both sides -> length is r - l - 1
              return r - l - 1;
          }

          public static void main(String[] args) {
              System.out.println(expand("babad", 1, 1)); // 3 ("bab", odd center)
              System.out.println(expand("cbbd", 1, 2));  // 2 ("bb", even center)
          }
      }`,
    codeTitle: 'The expand helper',
    viz: {
      title: 'Expand around every center (odd and even)',
      input: 'babadada',
      inputLabel: 'string (max 14 chars, no spaces)',
      gen: function (input) {
        var s = readStr(input, 'babadada', 14, 'a string').replace(/\s+/g, '');
        if (!s.length) throw new Error('Please type a string without spaces.');
        var n = s.length, a = s.split(''), frames = [], bestS = 0, bestL = 1;
        function snap(l, r, c, kind, cls, rng, narr) {
          var p = {}; var hl = {};
          if (l >= 0) p[l] = 'l'; if (r < n) p[r] = (p[r] ? [p[r], 'r'] : 'r');
          if (l >= 0 && cls) hl[l] = cls; if (r < n && cls) hl[r] = cls;
          var vals = { center: kind === 'odd' ? String(c) : c + '|' + (c + 1), type: kind, l: l, r: r, best: '"' + s.substr(bestS, bestL) + '"' };
          frames.push({ narr: narr, parts: [
            { type: 'array', label: 's', values: a, ptr: p, hl: hl, range: rng },
            { type: 'vars', vals: vals, hl: { best: 'sel' } }
          ] });
        }
        frames.push({ narr: 'There are ' + n + ' letter-centers (odd palindromes) and ' + (n - 1) + ' gap-centers (even palindromes). We try each and grow outward while the two ends match. Best so far: the first letter alone, length 1.', parts: [
          { type: 'array', label: 's', values: a },
          { type: 'vars', vals: { centers: 2 * n - 1, best: '"' + s[0] + '"' } }
        ] });
        for (var c = 0; c < n; c++) {
          for (var t = 0; t < 2; t++) {
            var kind = t === 0 ? 'odd' : 'even', l = c, r = c + t;
            if (r >= n) continue;
            var steps = 0;
            while (l >= 0 && r < n && s[l] === s[r]) {
              steps++;
              snap(l, r, c, kind, 'ok', [l, r], (steps === 1 ? (kind === 'odd' ? '<b>Odd center at index ' + c + '</b>: a single letter ' + q(s[c]) + ' is always a palindrome. ' : '<b>Even center between ' + c + ' and ' + (c + 1) + '</b>: ' + q(s[l]) + ' = ' + q(s[r]) + ', a 2-letter palindrome. ') : q(s[l]) + ' (left) = ' + q(s[r]) + ' (right) → the ripple grows. ') + 'Current palindrome: <b>"' + H.esc(s.slice(l, r + 1)) + '"</b>.');
              l--; r++;
            }
            var len = r - l - 1;
            var why = (l < 0 || r >= n) ? 'we fell off the edge of the string' : q(s[l]) + ' ≠ ' + q(s[r]);
            var improved = len > bestL;
            if (improved) { bestL = len; bestS = l + 1; }
            snap(l, r, c, kind, (l >= 0 && r < n) ? 'bad' : null, len > 0 ? [l + 1, r - 1] : undefined,
              'Stop: ' + why + '. Length = r − l − 1 = ' + r + ' − (' + l + ') − 1 = <b>' + len + '</b>. ' + (improved ? '<span class="c-p">New best!</span> "' + H.esc(s.substr(bestS, bestL)) + '".' : 'Not better than the best (' + bestL + ').'));
          }
        }
        frames.push({ narr: 'All 2N − 1 centers tried. Longest palindromic substring = <span class="c-p"><b>"' + H.esc(s.substr(bestS, bestL)) + '"</b></span> (start ' + bestS + ', length ' + bestL + '). Each center expands at most N/2 times → O(N²) time, O(1) space.', parts: [
          { type: 'array', label: 's', values: a, range: [bestS, bestS + bestL - 1], hl: (function () { var h = {}; for (var k = bestS; k < bestS + bestL; k++) h[k] = 'sel'; return h; })() },
          { type: 'vars', vals: { start: bestS, length: bestL, answer: s.substr(bestS, bestL) }, hl: { answer: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Count palindromic substrings ("aaa" → 6)', html: `<p>Same expansion, but instead of keeping the longest we <b>count every successful step</b> — each step is one more palindrome.</p>
        ${H.table(['center', 'palindromes found while expanding', 'count'], [
          ['0 (odd)', 'a', '1'], ['0|1 (even)', 'aa', '1'], ['1 (odd)', 'a, aaa', '2'], ['1|2 (even)', 'aa', '1'], ['2 (odd)', 'a', '1'], ['', '<b>total</b>', '<b class="c-g">6</b>']
        ])}
        <p>Positions count separately: "a" at 0, 1 and 2 are three different substrings.</p>`, code: `static int countSubstrings(String s) {
    int total = 0;
    for (int c = 0; c < s.length(); c++) {
        for (int r0 = c; r0 <= c + 1; r0++) {          // r0 = c (odd) and c + 1 (even)
            int l = c, r = r0;
            while (l >= 0 && r < s.length() && s.charAt(l) == s.charAt(r)) {
                total++;                               // s[l..r] is one more palindrome
                l--;
                r++;
            }
        }
    }
    return total;                                      // "aaa" -> 6, "abc" -> 3
}` },
      { title: 'An even palindrome hiding inside noise', html: `<p><code>"forgeeksskeegfor"</code>: odd centers only find single letters here, but the <b>gap between the two s's</b> (indices 7|8) grows: ss → kssk → eksske → eeksskee → geeksskeeg, then "r ≠ f" stops it.</p>
        ${H.arr('forgeeksskeegfor'.split(''), { hl: { 3: 'p', 4: 'p', 5: 'p', 6: 'p', 7: 'g', 8: 'g', 9: 'p', 10: 'p', 11: 'p', 12: 'p' } })}
        <p>Length 10, start = c − (len − 1) / 2 = 7 − 4 = <b>3</b> → <code>"geeksskeeg"</code>. Without the even center this answer is impossible to find.</p>` },
      { title: 'The DP-table alternative (and why expansion is usually better)', html: `<p><code>pal[i][j]</code> = true if s[i..j] is a palindrome: <code>pal[i][j] = s[i]==s[j] &amp;&amp; (j − i &lt; 2 || pal[i+1][j−1])</code>. Fill by increasing length. For "abba":</p>
        ${H.table(['i \\ j', 'a(0)', 'b(1)', 'b(2)', 'a(3)'], [['a(0)', 'T', 'F', 'F', '<b class="c-g">T</b>'], ['b(1)', '', 'T', '<b class="c-g">T</b>', 'F'], ['b(2)', '', '', 'T', 'F'], ['a(3)', '', '', '', 'T']])}
        <p>Same O(N<sup>2</sup>) time, but O(N<sup>2</sup>) memory (10<sup>6</sup> booleans for N = 1000). Use it when you need <b>many</b> "is s[i..j] a palindrome?" queries later (e.g. Palindrome Partitioning); otherwise expand around center.</p>`, code: `static String longestDp(String s) {
    int n = s.length(), bestL = 0, bestLen = 1;
    boolean[][] pal = new boolean[n][n];
    for (int len = 1; len <= n; len++) {
        for (int i = 0; i + len - 1 < n; i++) {
            int j = i + len - 1;
            pal[i][j] = s.charAt(i) == s.charAt(j) && (len <= 2 || pal[i + 1][j - 1]);
            if (pal[i][j] && len > bestLen) { bestLen = len; bestL = i; }
        }
    }
    return s.substring(bestL, bestL + bestLen);
}` }
    ],
    deepDive: `<h4>Worst case and a cheap speed-up</h4>
      <p>Expansion is O(N<sup>2</sup>) only on very repetitive strings like "aaaa…a" (every center grows to the edge). On random text most centers stop after one step, so it is close to O(N) in practice. A safe pruning: a center c can never produce more than 2·(n − c) − 1 characters, so once the best length is ≥ that bound, no center at c or later can beat it — stop early.</p>
      <h4>Manacher's algorithm — O(N) (know the idea)</h4>
      <ol>
        <li>Insert separators so every palindrome becomes odd: "abba" → "#a#b#b#a#". Now one center type suffices.</li>
        <li>Keep the rightmost palindrome found so far, centered at C with right edge R (the same "box" idea as the Z-algorithm in this module).</li>
        <li>For a new center i inside the box, its mirror is 2C − i; start with <code>P[i] = min(R − i, P[mirror])</code> for free, then expand only past R.</li>
        <li>R only moves right → linear time. Answer = max P[i] (its value is the original length).</li>
      </ol>
      <p>Interviewers rarely require Manacher, but mentioning it (and the mirror/box idea) signals depth. Other tools: hashing + binary search on length gives O(N log N); a <b>palindromic tree (eertree)</b> lists all distinct palindromes in O(N).</p>
      <h4>Substring vs subsequence</h4>
      <p>"Longest palindromic <b>subsequence</b>" (letters may be skipped) is a different problem: LCS(s, reverse(s)) or interval DP, O(N<sup>2</sup>). Mixing these up is the #1 mistake on this topic.</p>`,
    aiEra: `<p><b>What AI changes:</b> "Longest Palindromic Substring" is one of the most memorised problems on the internet; any model outputs a correct expand-around-center solution instantly. Interviewers know this, so they probe <b>understanding</b>: why 2N − 1 centers, why <code>r − l − 1</code>, why <code>c − (len − 1)/2</code>, how you would make it linear.</p>
      <p><b>Use AI as a partner:</b> ask for a step-by-step trace on "cbbd" and "aaaa", then check each step against the visualizer above. Ask it to compare Manacher, hashing + binary search and DP in a table — then verify one claim by coding it.</p>
      <p><b>Where AI goes wrong:</b> off-by-one in the start index for even lengths, forgetting the even center entirely, or confusing substring with subsequence (returning a DP-on-subsequence answer).</p>
      <p><b>What you must still own:</b> deriving the formulas on a whiteboard and recognising "palindromic substring(s)" + N ≤ few thousand → O(N<sup>2</sup>) expansion.</p>`,
    problems: [{
      title: 'Longest Palindromic Substring',
      level: 'Medium',
      tags: ['expand around center', 'two pointers'],
      statement: `<p>Given a string <code>s</code>, return the <b>longest substring</b> (contiguous block) of <code>s</code> that is a palindrome. If there are several of the same maximum length, return any one (our code returns the leftmost).</p>`,
      constraints: `1 ≤ |s| ≤ 1000; s has digits and English letters.`,
      example: `${H.arr('babad'.split(''), { hl: { 0: 'g', 1: 'g', 2: 'g' } })}
        <p>Output: ${H.c('g', '"bab"')} ("aba" is also correct). Why: no substring of length 4 or 5 reads the same backwards, and "bab" (centered on index 1) does.</p>
        ${H.arr('cbbd'.split(''), { hl: { 1: 'p', 2: 'p' } })}
        <p>Output: ${H.c('p', '"bb"')} — an <b>even</b> palindrome; its center is the gap between the two b's.</p>`,
      brute: {
        why: `<p>Try every pair (i, j) — about N<sup>2</sup>/2 substrings — and check each with two pointers (up to N steps): O(N<sup>3</sup>) ≈ 10<sup>9</sup>/6 for N = 1000, too slow. The wasted work: when checking "xabay" and then "abay", "aba" etc., we keep re-comparing the same inner pairs. Expanding from the center reuses them: the inner part is already known to match when we test the next outer pair.</p>`,
        code: `
          String longestBrute(String s) {
              String best = s.substring(0, 1);
              for (int i = 0; i < s.length(); i++) {
                  for (int j = i + best.length(); j < s.length(); j++) {   // only longer candidates
                      int l = i, r = j;
                      boolean ok = true;
                      while (l < r) { if (s.charAt(l++) != s.charAt(r--)) { ok = false; break; } }
                      if (ok) best = s.substring(i, j + 1);
                  }
              }
              return best;
          }`
      },
      mcq: {
        q: 'Why must we expand from <b>both</b> <code>(c, c)</code> and <code>(c, c+1)</code>?',
        options: ['To make the code run twice as fast', 'Because odd-length palindromes have a letter in the middle while even-length ones have a gap in the middle', 'Because Java indexes start at 0', 'It is not needed; (c, c) finds everything'],
        answer: 1,
        explain: 'Starting at (c, c) only ever builds odd lengths 1, 3, 5... An even palindrome like "abba" has no middle letter; it can only be found by starting from the gap (c, c+1).'
      },
      hints: [
        `<p><b>Aha:</b> a palindrome is symmetric around its middle. If <code>s[l+1..r−1]</code> is a palindrome and <code>s[l] == s[r]</code>, then <code>s[l..r]</code> is too — so you can grow from the middle outward and never re-check the inside.</p>`,
        `<p>No data structure needed — just two pointers <code>l</code> and <code>r</code> moving <b>outward</b>. Loop over centers c = 0..n−1, call <code>expand(c, c)</code> and <code>expand(c, c+1)</code>, keep <code>bestStart</code> and <code>bestLen</code>.</p>`,
        `<p><b>Traps:</b> after the while-loop, l and r have gone one step too far → length is <code>r − l − 1</code>; start index is <code>c − (len − 1) / 2</code>; the even center at the last index has r = n (returns 0, fine); a 1-character string is its own answer. <b>Recipe:</b> best = (0, 1); for c: len = max(expand(c,c), expand(c,c+1)); if len &gt; bestLen: bestLen = len, bestStart = c − (len−1)/2. Return substring(bestStart, bestStart + bestLen).</p>`
      ],
      solution: {
        approach: `<p>Try all 2N−1 centers, expand outward while ends match, remember the longest.</p>`,
        code: `
          class Solution {
              public String longestPalindrome(String s) {
                  if (s.length() < 2) return s;               // single char is a palindrome
                  int bestStart = 0, bestLen = 1;
                  for (int c = 0; c < s.length(); c++) {
                      int len1 = expand(s, c, c);             // odd: center is letter c
                      int len2 = expand(s, c, c + 1);         // even: center is gap c|c+1
                      int len = Math.max(len1, len2);
                      if (len > bestLen) {
                          bestLen = len;
                          bestStart = c - (len - 1) / 2;      // works for odd and even
                      }
                  }
                  return s.substring(bestStart, bestStart + bestLen);
              }

              private int expand(String s, int l, int r) {
                  while (l >= 0 && r < s.length() && s.charAt(l) == s.charAt(r)) {
                      l--;
                      r++;
                  }
                  return r - l - 1;                           // length of s[l+1 .. r-1]
              }

              public static void main(String[] args) {
                  Solution sol = new Solution();
                  System.out.println(sol.longestPalindrome("babad")); // bab
                  System.out.println(sol.longestPalindrome("cbbd"));  // bb
              }
          }`,
        dry: {
          head: ['c', 'odd expand(c,c)', 'even expand(c,c+1)', 'len', 'bestStart, bestLen'],
          rows: [
            ['0', '"b" → 1', 'b≠a → 0', '1', '0, 1 (not &gt; 1)'],
            ['1', '"a" → b=b → "bab" → 3', 'a≠b → 0', '3', '<span class="c-g">0, 3</span> (start = 1 − 1)'],
            ['2', '"b" → a=a → "aba", then b≠d → 3', 'b≠a → 0', '3', '0, 3 (3 is not &gt; 3)'],
            ['3', '"a", then b≠d → 1', 'a≠d → 0', '1', '0, 3'],
            ['4', '"d" → 1', 'r = 5 out → 0', '1', '<span class="c-p">0, 3 → "bab"</span>']
          ]
        },
        complexity: `<p><b>Time O(N<sup>2</sup>):</b> 2N − 1 centers, each expansion takes at most N/2 steps. For N = 1000 that is under a million steps. <b>Space O(1):</b> only a few integers (the final substring is the output).</p>`
      }
    }]
  });

  // =====================================================================
  // TOPIC 5 — Polynomial rolling hash (Rabin-Karp)
  // =====================================================================
  topics.push({
    title: 'Polynomial Rolling Hash (Rabin-Karp): formula, rolling update, mod, collisions',
    analogy: `<p><b>Weighing train wagons.</b> You must find 3 specific wagons (in order) in a 1000-wagon train. Inspecting every wagon of every 3-wagon window is slow. Instead you put a <b>3-wagon-long scale</b> on the track: it shows one number (the window's "weight"). Sliding forward by one wagon is cheap: <b>subtract the wagon that left, add the wagon that entered</b>. Only when the scale shows exactly the target weight do you walk over and inspect the wagons one by one — because two different groups <i>could</i> weigh the same (a <b>collision</b>).</p>`,
    explain: `<h4>1. Turn a string into a number (the hash)</h4>
      <p>Give each letter a value (<code>a=1, b=2, ..., z=26</code>; avoid 0 so "a" and "aa" differ) and read the string like digits of a number in base <b>B</b>:</p>
      <p style="text-align:center"><code>hash("abc") = 1·B<sup>2</sup> + 2·B<sup>1</sup> + 3·B<sup>0</sup></code></p>
      <p>With B = 10 this is literally the number <b>123</b>. With B = 31 it is 961 + 62 + 3 = <b>1026</b>. Order matters: "cba" = 3·961 + 2·31 + 1 = 2946.</p>
      <h4>2. Rolling update — slide the window in O(1)</h4>
      <p>Think decimal digits, window size 3, text "12345":</p>
      ${H.table(['window', 'old hash', 'remove left digit × B<sup>m−1</sup>', '× B', '+ new digit', 'new hash'], [
        ['123 → 234', '123', '123 − 1·100 = 23', '230', '+ 4', '<span class="c-g">234</span>'],
        ['234 → 345', '234', '234 − 2·100 = 34', '340', '+ 5', '<span class="c-g">345</span>']
      ])}
      <p>General formula: <code>newHash = (oldHash − out·B<sup>m−1</sup>) · B + in</code>. One subtraction, one multiplication, one addition — no matter how long the pattern is.</p>
      <h4>3. Mod — keep numbers small</h4>
      <p>B<sup>m</sup> explodes quickly, so do every step <b>modulo a big prime M</b> (e.g. 10<sup>9</sup>+7), using <code>long</code> so the product <code>hash · B</code> (up to ~3·10<sup>10</sup>) does not overflow. After subtracting, the value can go negative in Java, so fix it with <code>(x % M + M) % M</code>.</p>
      <h4>4. Collisions — always double-check</h4>
      <p>Squeezing infinitely many strings into M buckets means two different strings can share a hash. Example with a tiny M = 101, B = 31: hash("abc") = 16 and hash("eee") = 16 too! So when hashes match, <b>compare the characters</b> (Las Vegas style, always correct), or use <b>two different mods</b> (double hashing) when you need speed and can accept a near-zero risk.</p>
      <h4>5. Prefix hashes — the hash of ANY substring in O(1)</h4>
      <p>Precompute <code>pre[i+1] = pre[i]·B + val(s[i])</code> and powers <code>pw[k] = B<sup>k</sup></code>. Then</p>
      <p style="text-align:center"><code>hash(s[l..r]) = pre[r+1] − pre[l]·pw[r−l+1]</code> (mod M)</p>
      <p>Decimal check: s = "12345", pre = [0, 1, 12, 123, 1234, 12345]. hash("234") = pre[4] − pre[1]·10<sup>3</sup> = 1234 − 1000 = <b>234</b> ✓. This powers "count distinct substrings", "longest repeated substring" and more.</p>`,
    clues: [
      '"<b>find all occurrences of a pattern</b>" / "first index of needle in haystack" → rolling hash or KMP.',
      '"<b>compare many substrings quickly</b>", "are s[a..b] and s[c..d] equal?" → prefix hashes give O(1) comparisons.',
      '"<b>count distinct substrings</b>", "<b>longest repeated / duplicate substring</b>" → hash windows into a HashSet (often + binary search on length).',
      '"<b>multiple patterns of the same length</b>" → put pattern hashes in a set, slide one window over the text.',
      '<code>|s| ≤ 10<sup>5</sup></code> with substring comparisons → O(N·M) is too slow; hashing makes each compare O(1).',
      'You see "mod 10<sup>9</sup>+7" and "base 31 / 131" in editorial code → it is polynomial hashing.'
    ],
    code: `
      class PrefixHash {
          static final long B = 31, M = 1_000_000_007L;
          long[] pre, pw;

          PrefixHash(String s) {
              int n = s.length();
              pre = new long[n + 1];
              pw = new long[n + 1];
              pw[0] = 1;
              for (int i = 0; i < n; i++) {
                  pre[i + 1] = (pre[i] * B + (s.charAt(i) - 'a' + 1)) % M; // append one "digit"
                  pw[i + 1] = pw[i] * B % M;                                // B^(i+1)
              }
          }

          // hash of s[l..r] inclusive, in O(1)
          long get(int l, int r) {
              long x = (pre[r + 1] - pre[l] * pw[r - l + 1]) % M;
              return (x + M) % M;                                           // fix negative values
          }

          public static void main(String[] args) {
              PrefixHash h = new PrefixHash("abcabc");
              System.out.println(h.get(0, 2) == h.get(3, 5)); // true: "abc" == "abc"
              System.out.println(h.get(0, 1) == h.get(1, 2)); // false: "ab" vs "bc"
          }
      }`,
    codeTitle: 'Prefix hashes: O(1) hash of any substring',
    viz: {
      title: 'Rabin-Karp: sliding the hash window (tiny mod 101 to show a collision)',
      input: 'abceeedabc | abc',
      inputLabel: 'text | pattern (lowercase, text ≤ 16)',
      gen: function (input) {
        var pr = readPair(input, 'abceeedabc | abc', 'text | pattern');
        var t = lower(pr[0], 'Text'), p = lower(pr[1], 'Pattern');
        if (t.length > 16) throw new Error('Keep the text at most 16 letters.');
        if (p.length > t.length) throw new Error('The pattern must not be longer than the text.');
        var B = 31, M = 101, m = p.length, n = t.length, frames = [], found = [];
        function v(ch) { return ch.charCodeAt(0) - 96; }
        var ph = 0, pw = 1, k;
        for (k = 0; k < m; k++) ph = (ph * B + v(p[k])) % M;
        for (k = 0; k < m - 1; k++) pw = pw * B % M;
        frames.push({ narr: 'Letters become numbers a=1 … z=26. Base B = 31, and we use a <b>tiny</b> mod M = 101 so the numbers stay readable (real code uses 10<sup>9</sup>+7). Pattern hash = ' + p.split('').map(function (c, i) { return v(c) + '·31<sup>' + (m - 1 - i) + '</sup>'; }).join(' + ') + ' mod 101 = <b>' + ph + '</b>.', parts: [
          { type: 'array', label: 'pattern', values: p.split(''), idxLabels: p.split('').map(function (c) { return String(v(c)); }) },
          { type: 'vars', vals: { B: B, M: M, patHash: ph, 'B^(m-1) mod M': pw }, hl: { patHash: 'sel' } }
        ] });
        var h = 0;
        for (k = 0; k < m; k++) h = (h * B + v(t[k])) % M;
        for (var i = 0; i + m <= n; i++) {
          var rng = [i, i + m - 1], hl = {};
          var narr;
          if (i === 0) narr = 'Compute the first window <b>"' + t.substr(0, m) + '"</b> the slow way once (m steps): hash = <b>' + h + '</b>.';
          else {
            var out = t[i - 1], inn = t[i + m - 1];
            narr = 'Slide right: remove ' + q(out) + ' (' + v(out) + '·' + pw + '), multiply by 31, add ' + q(inn) + ' (' + v(inn) + ') → all mod 101 → window <b>"' + t.substr(i, m) + '"</b> hash = <b>' + h + '</b>. Only O(1) work.';
          }
          var eq = h === ph;
          narr += eq ? ' It equals the pattern hash ' + ph + ' → <span class="c-y">possible match, verify letters</span>.' : ' ≠ ' + ph + ' → <span class="c-m">definitely not a match, skip without reading letters</span>.';
          for (k = i; k < i + m; k++) hl[k] = eq ? 'cur' : 'win';
          if (i > 0) hl[i - 1] = 'done';
          frames.push({ narr: narr, parts: [
            { type: 'array', label: 'text', values: t.split(''), range: rng, hl: hl, ptr: oneHl(i, 'start') },
            { type: 'vars', vals: { windowHash: h, patHash: ph, found: '[' + found.join(', ') + ']' }, hl: { windowHash: eq ? 'cur' : 'win' } }
          ] });
          if (eq) {
            var real = t.substr(i, m) === p, h2 = {};
            for (k = i; k < i + m; k++) h2[k] = real ? 'ok' : (t[k] === p[k - i] ? 'ok' : 'bad');
            if (real) found.push(i);
            frames.push({ narr: real ? 'Letter-by-letter check: "' + t.substr(i, m) + '" = "' + p + '" ✓ → <span class="c-g">real match at index ' + i + '</span>.' : 'Letter-by-letter check: "' + t.substr(i, m) + '" ≠ "' + p + '" ✗ → <span class="c-r">COLLISION (spurious hit)</span>: different strings, same hash. This is exactly why we always verify!', parts: [
              { type: 'array', label: 'text', values: t.split(''), range: rng, hl: h2 },
              { type: 'array', label: 'pattern', values: p.split('') },
              { type: 'vars', vals: { windowHash: h, patHash: ph, found: '[' + found.join(', ') + ']' }, hl: { found: 'ok' } }
            ] });
          }
          if (i + m < n) {
            h = (h - v(t[i]) * pw % M + M) % M;
            h = (h * B + v(t[i + m])) % M;
          }
        }
        frames.push({ narr: 'Done. Matches at <b>[' + found.join(', ') + ']</b>. Each slide is O(1), so the whole scan is O(N + M) on average; letter checks only happen on hash hits. With M = 10<sup>9</sup>+7 collisions are extremely rare.', parts: [
          { type: 'array', label: 'text', values: t.split(''), hl: (function () { var x = {}; found.forEach(function (s0) { for (var z = s0; z < s0 + m; z++) x[z] = 'sel'; }); return x; })() },
          { type: 'vars', vals: { matches: '[' + found.join(', ') + ']' }, hl: { matches: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Hash by hand, then the prefix-hash table', html: `<p>s = <code>"abab"</code>, values a = 1, b = 2, base B = 10 (so you can read the numbers), no mod:</p>
        ${H.table(['i', 's[i]', 'pre[i+1] = pre[i]·10 + val', 'meaning'], [['0', 'a', '0·10 + 1 = 1', 'hash("a")'], ['1', 'b', '1·10 + 2 = 12', 'hash("ab")'], ['2', 'a', '12·10 + 1 = 121', 'hash("aba")'], ['3', 'b', '121·10 + 2 = 1212', 'hash("abab")']])}
        <p>hash(s[2..3]) = pre[4] − pre[2]·10<sup>2</sup> = 1212 − 1200 = <b>12</b> = hash("ab") = hash(s[0..1]) → the two "ab" pieces are equal, checked in O(1).</p>` },
      { title: 'Rolling the window by hand (B = 10, window 3)', html: `<p>Text digits "31415", window m = 3, B<sup>m−1</sup> = 100.</p>
        ${H.table(['window', 'computation', 'hash'], [['314', 'first window built directly', '314'], ['141', '(314 − 3·100)·10 + 1', '141'], ['415', '(141 − 1·100)·10 + 5', '415']])}
        <p>Each slide is 3 arithmetic operations, independent of m. With letters and a big prime mod, the arithmetic is identical — only the numbers are not human-readable.</p>` },
      { title: 'Double hashing — two independent fingerprints', html: `<p>One mod-10<sup>9</sup>+7 hash collides with probability about 10<sup>−9</sup> per comparison. Comparing ~10<sup>10</sup> pairs (e.g. all substrings of a 10<sup>5</sup> string) makes a collision likely (birthday effect). Pair two hashes with different mods (or bases): a false match now needs both to collide, ≈ 10<sup>−18</sup>.</p>
        ${H.table(['string', 'h1 (B=31, M=10<sup>9</sup>+7)', 'h2 (B=37, M=998244353)'], [['"abc"', '1026', '1446'], ['"acb"', '1056', '1482']])}
        <p>Store the pair as one <code>long</code> key: <code>h1 * M2 + h2</code> fits in 64 bits (≈ 10<sup>18</sup> &lt; 9.2·10<sup>18</sup>).</p>`, code: `static long[] twoHashes(String s) {
    final long B1 = 31, M1 = 1_000_000_007L, B2 = 37, M2 = 998_244_353L;
    long h1 = 0, h2 = 0;
    for (int i = 0; i < s.length(); i++) {
        int v = s.charAt(i) - 'a' + 1;
        h1 = (h1 * B1 + v) % M1;
        h2 = (h2 * B2 + v) % M2;
    }
    return new long[]{h1, h2};      // "abc" -> [1026, 1446]
}` }
    ],
    deepDive: `<h4>How likely is a collision?</h4>
      <p>For a prime M and a <b>random</b> base, two different strings of length L collide with probability at most about L / M. With M ≈ 10<sup>9</sup> that is tiny for one comparison, but the <b>birthday paradox</b> bites when you put K hashes in a set: collisions become likely once K ≈ √M ≈ 3·10<sup>4</sup>. Hence double hashing, or a 61-bit modulus.</p>
      <h4>Stronger choices used in practice</h4>
      <ul>
        <li><b>Mod 2<sup>61</sup> − 1</b> (a Mersenne prime) with a random base: multiply with <code>Math.multiplyHigh</code> (128-bit product) and reduce with shifts — fast and collision-resistant enough for N up to 10<sup>6</sup>.</li>
        <li><b>Natural overflow mod 2<sup>64</sup></b> (just let <code>long</code> wrap) is fast but <b>breakable</b>: Thue–Morse strings collide for any base, and competitive judges include such anti-hash tests.</li>
        <li><b>Random base at runtime</b> prevents attackers from precomputing collisions (the same reason Java HashMap treeifies buckets and other languages randomise string hashing).</li>
      </ul>
      <h4>Java details that bite</h4>
      <ul>
        <li><code>%</code> keeps the sign of the dividend: <code>(-5) % 7 = -5</code>. Use <code>(x % M + M) % M</code> or <code>Math.floorMod</code>.</li>
        <li>Values must start at 1, not 0: with a = 0, "a", "aa", "aaa" all hash to 0.</li>
        <li>Base larger than the alphabet (31 for letters, 131 or 257 for bytes) keeps small strings collision-free before the mod.</li>
        <li><code>hash * B</code> must not overflow before the mod: with M ≈ 10<sup>9</sup> and B ≤ 10<sup>9</sup> the product stays below 9.2·10<sup>18</sup>.</li>
      </ul>
      <h4>Where rolling hashes run in production</h4>
      <p>rsync and backup tools (content-defined chunking finds unchanged blocks), plagiarism detectors (MOSS "winnowing" over k-gram fingerprints), deduplication in storage systems and LLM training-data pipelines (MinHash/near-duplicate removal), and the classic Rabin fingerprint used in networking.</p>`,
    aiEra: `<p><b>What AI changes:</b> models happily write Rabin-Karp — and frequently get the subtle parts wrong: letter value 0, negative modulo, <code>int</code> overflow, forgetting to verify on a hash hit, or computing <code>B<sup>m</sup></code> instead of <code>B<sup>m−1</sup></code>. Your job is to review those five spots in seconds.</p>
      <p><b>Use AI as a partner:</b> have it brute-force compare your hash-based answer against a naive O(N·M) checker on 10 000 random small strings (a stress test). Ask it to generate an anti-hash test for mod 2<sup>64</sup> and see your naive version fail.</p>
      <p><b>AI-era connection:</b> near-duplicate detection with shingles + hashing is a standard step when cleaning datasets for training or RAG indexes, and prompt caches key on hashes of token prefixes — the "hash of a prefix, extended cheaply" idea is everywhere.</p>
      <p><b>What you must still own:</b> the rolling formula, the collision story (and how to make it negligible), and when to prefer KMP's deterministic guarantee over hashing's probabilistic one.</p>`,
    problems: [{
      title: 'Rabin-Karp Pattern Search (all occurrences)',
      level: 'Medium',
      tags: ['rolling hash', 'rabin-karp'],
      statement: `<p>Given a text <code>txt</code> and a pattern <code>pat</code> (lowercase letters), return a list of <b>all starting indices</b> where <code>pat</code> occurs in <code>txt</code> (0-based, overlaps allowed). Use a rolling hash.</p>`,
      constraints: `1 ≤ |pat| ≤ |txt| ≤ 10<sup>5</sup>; lowercase a–z.`,
      example: `${H.arr('abcbabc'.split(''), { hl: { 0: 'g', 1: 'g', 2: 'g', 4: 'g', 5: 'g', 6: 'g' } })}
        <p>pattern = <code>"abc"</code> → Output: ${H.c('g', '[0, 4]')}. With B = 31, hash("abc") = 1·961 + 2·31 + 3 = <b>1026</b>; the windows "abc" at 0 and 4 both hash to 1026, every other window hashes differently.</p>`,
      brute: {
        why: `<p>For each of the N − M + 1 starting positions compare up to M characters: O(N·M). With N = 10<sup>5</sup> and M = 5·10<sup>4</sup> that is ~2.5·10<sup>9</sup> comparisons. The wasted work: neighbouring windows share M − 1 characters, yet we re-read all of them from scratch every time.</p>`,
        code: `
          List<Integer> searchBrute(String txt, String pat) {
              List<Integer> res = new ArrayList<>();
              int n = txt.length(), m = pat.length();
              for (int i = 0; i + m <= n; i++) {
                  int k = 0;
                  while (k < m && txt.charAt(i + k) == pat.charAt(k)) k++;
                  if (k == m) res.add(i);
              }
              return res;
          }`
      },
      mcq: {
        q: 'Window hash for "bcb" is 2017 (B = 31, m = 3, B<sup>2</sup> = 961). The window slides to "cba". What is the update?',
        options: ['2017 + 1', '(2017 − 2·961) · 31 + 1', '(2017 − 1) · 31 + 2', 'Recompute 3·961 + 2·31 + 1 from scratch every time'],
        answer: 1,
        explain: 'Remove the leaving letter b (value 2) times its weight B<sup>2</sup>, shift everything one place (× B), then add the entering letter a (value 1): (2017 − 1922)·31 + 1 = 95·31 + 1 = 2946 = hash("cba").'
      },
      hints: [
        `<p><b>Aha:</b> read a string as a number in base B. Sliding the window is like moving from 123 to 234: drop the leading digit, shift left (× B), add the new last digit — O(1) instead of O(M).</p>`,
        `<p>Keep <code>long patHash</code>, <code>long winHash</code> and <code>long power = B<sup>m−1</sup> mod M</code>. Only when <code>winHash == patHash</code> compare characters (or use <code>txt.regionMatches(i, pat, 0, m)</code>) to rule out collisions.</p>`,
        `<p><b>Traps:</b> use <code>long</code> and take <code>% M</code> after every multiply; after subtracting add M before the final mod (Java's % can be negative); letter values from 1 (not 0); don't roll past the last window (check <code>i + m &lt; n</code>). <b>Recipe:</b> build patHash and first winHash; for i = 0..n−m: if equal and letters equal → add i; if i + m &lt; n: winHash = ((winHash − val(txt[i])·power) mod M + M) mod M; winHash = (winHash·B + val(txt[i+m])) mod M.</p>`
      ],
      solution: {
        approach: `<p>Polynomial hash of the pattern and of a sliding window; O(1) roll; verify on equal hashes.</p>`,
        code: `
          import java.util.*;

          class Solution {
              static final long B = 31;
              static final long M = 1_000_000_007L;

              public List<Integer> search(String txt, String pat) {
                  List<Integer> res = new ArrayList<>();
                  int n = txt.length(), m = pat.length();
                  if (m > n) return res;

                  long patHash = 0, winHash = 0, power = 1;      // power = B^(m-1) mod M
                  for (int k = 0; k < m; k++) {
                      patHash = (patHash * B + (pat.charAt(k) - 'a' + 1)) % M;
                      winHash = (winHash * B + (txt.charAt(k) - 'a' + 1)) % M;
                      if (k < m - 1) power = power * B % M;
                  }

                  for (int i = 0; i + m <= n; i++) {
                      // equal hash -> verify letters to rule out a collision
                      if (winHash == patHash && txt.regionMatches(i, pat, 0, m)) {
                          res.add(i);
                      }
                      if (i + m < n) {                           // roll: drop txt[i], add txt[i+m]
                          long out = (txt.charAt(i) - 'a' + 1) * power % M;
                          winHash = (winHash - out + M) % M;     // + M keeps it non-negative
                          winHash = (winHash * B + (txt.charAt(i + m) - 'a' + 1)) % M;
                      }
                  }
                  return res;
              }

              public static void main(String[] args) {
                  System.out.println(new Solution().search("abcbabc", "abc")); // [0, 4]
              }
          }`,
        dry: {
          head: ['i', 'window', 'winHash', '== 1026?', 'action / roll'],
          rows: [
            ['0', 'abc', '1026', '<span class="c-g">yes</span>', 'letters equal → <b>add 0</b>; roll: (1026 − 1·961)·31 + 2 = 2017'],
            ['1', 'bcb', '2017', 'no', 'roll: (2017 − 2·961)·31 + 1 = 2946'],
            ['2', 'cba', '2946', 'no', 'roll: (2946 − 3·961)·31 + 2 = 1955'],
            ['3', 'bab', '1955', 'no', 'roll: (1955 − 2·961)·31 + 3 = 1026'],
            ['4', 'abc', '1026', '<span class="c-g">yes</span>', 'letters equal → <b>add 4</b>; i + m = 7 = n → no roll'],
            ['end', '—', '—', '—', '<span class="c-p">return [0, 4]</span>']
          ]
        },
        complexity: `<p><b>Time O(N + M) expected:</b> building hashes is O(M), each of the N − M + 1 slides is O(1), and the O(M) letter check runs only on real matches (plus astronomically rare collisions). Worst case (many matches, like "aaaa…" / "aa") is O(N·M) because of the checks — KMP avoids even that. <b>Space O(1)</b> besides the output list.</p>`
      }
    }]
  });

  // =====================================================================
  // TOPIC 6 — KMP: LPS array + search
  // =====================================================================
  topics.push({
    title: 'KMP: the LPS (prefix = suffix) Array and Linear-Time Pattern Search',
    analogy: `<p><b>Singing along to find the chorus.</b> You are listening for the chorus "<b>la la land</b>". You hear "la la la land". After "la la" you expect "land" but hear "la" — mismatch! A beginner restarts from scratch at the next word. A smart listener thinks: "<i>the last 'la' I just heard is itself the beginning of the chorus</i>" and continues from there, never re-listening to the song.</p>
      <p>KMP pre-computes, for every spot in the pattern, <b>"if I fail here, how much of what I already matched can I keep?"</b>. That table is the <b>LPS array</b>.</p>`,
    explain: `<h4>1. LPS intuition: longest proper prefix that is also a suffix</h4>
      <p><code>lps[i]</code> = length of the longest string that is <b>both</b> a prefix and a suffix of <code>pat[0..i]</code>, but not the whole thing ("proper").</p>
      ${H.arr('ababaca'.split(''), { label: 'pat', hl: { 0: 'b', 1: 'b', 2: 'b', 3: 'g', 4: 'g' } })}
      ${H.table(['i', 'pat[0..i]', 'prefixes = suffixes (proper)', 'lps[i]'], [
        ['0', 'a', '(none — must be shorter than 1)', '0'],
        ['1', 'ab', 'none', '0'],
        ['2', 'aba', '"a"', '1'],
        ['3', 'abab', '"ab"', '2'],
        ['4', 'ababa', '"a", <span class="c-g">"aba"</span> (overlap is allowed)', '<b>3</b>'],
        ['5', 'ababac', 'none (nothing ends with c except the whole)', '0'],
        ['6', 'ababaca', '"a"', '1']
      ])}
      <p>So <code>lps = [0, 0, 1, 2, 3, 0, 1]</code>. Meaning of lps[4] = 3: after matching "ababa", its last 3 letters "aba" are already the first 3 letters of the pattern.</p>
      <h4>2. Building LPS with pointers <code>i</code> and <code>len</code></h4>
      <p><code>len</code> = length of the current prefix-suffix; <code>i</code> = position we are filling.</p>
      <ul><li><b>pat[i] == pat[len]</b> → the border grows: <code>len++</code>, <code>lps[i] = len</code>, <code>i++</code>.</li>
      <li><b>mismatch and len &gt; 0</b> → fall back to the next shorter border: <code>len = lps[len − 1]</code> (do <b>not</b> move i, try again).</li>
      <li><b>mismatch and len == 0</b> → nothing to keep: <code>lps[i] = 0</code>, <code>i++</code>.</li></ul>
      <h4>3. KMP search with text pointer <code>i</code> and pattern pointer <code>j</code></h4>
      <ul><li><b>txt[i] == pat[j]</b> → <code>i++</code>, <code>j++</code>. If <code>j == m</code>: found at <code>i − m</code>; continue with <code>j = lps[m − 1]</code> (allows overlaps).</li>
      <li><b>mismatch, j &gt; 0</b> → <code>j = lps[j − 1]</code> (slide the pattern, keep i).</li>
      <li><b>mismatch, j == 0</b> → <code>i++</code>.</li></ul>
      <p><b>Key promise:</b> <code>i</code> never moves backwards. Every step either moves i forward or shrinks j, and j can shrink only as much as it has grown → at most 2N steps. Total <b>O(N + M)</b> — guaranteed, no hashing luck needed.</p>`,
    clues: [
      '"<b>find the first / all occurrences</b> of a pattern" with a <b>guaranteed</b> linear time → KMP.',
      '"<b>longest prefix which is also a suffix</b>" / "longest happy prefix" → it is literally <code>lps[n − 1]</code>.',
      '"string is made by <b>repeating a substring</b>" → period = n − lps[n − 1].',
      '"<b>shortest palindrome</b> by adding characters in front" → LPS of <code>s + "#" + reverse(s)</code>.',
      '<code>|txt| ≤ 10<sup>6</sup></code> with worst-case inputs like "aaaa…ab" → naive O(N·M) dies; KMP stays O(N + M).',
      '"rotation of a string" → search for one string inside <code>s + s</code> with KMP.'
    ],
    code: [`
      class LpsBuilder {
          static int[] buildLps(String p) {
              int m = p.length();
              int[] lps = new int[m];       // lps[0] = 0 always
              int len = 0;                  // length of current prefix-suffix
              int i = 1;
              while (i < m) {
                  if (p.charAt(i) == p.charAt(len)) {
                      len++;                // border grows by one
                      lps[i] = len;
                      i++;
                  } else if (len > 0) {
                      len = lps[len - 1];   // fall back to a shorter border; i stays
                  } else {
                      lps[i] = 0;           // nothing reusable
                      i++;
                  }
              }
              return lps;
          }

          public static void main(String[] args) {
              System.out.println(Arrays.toString(buildLps("ababaca"))); // [0, 0, 1, 2, 3, 0, 1]
              System.out.println(Arrays.toString(buildLps("aabaaab"))); // [0, 1, 0, 1, 2, 2, 3]
          }
      }`],
    codeTitle: ['Building the LPS array'],
    viz: [{
      title: 'Building the LPS array (pointers i and len)',
      input: 'aabaaab',
      inputLabel: 'pattern (max 16 chars)',
      gen: function (input) {
        var p = readStr(input, 'aabaaab', 16, 'a pattern').replace(/\s+/g, '');
        if (!p.length) throw new Error('Please type a pattern without spaces.');
        var m = p.length, lps = [0], shown = ['0'], frames = [];
        for (var k = 1; k < m; k++) shown.push('·');
        function ptrs(i, len) { var x = {}; if (i < m) x[i] = 'i'; x[len] = x[len] ? [x[len], 'len'] : 'len'; return x; }
        frames.push({ narr: 'lps[0] is always 0 (a single letter has no proper prefix = suffix). Start with <b>len = 0</b> (no border yet) and <b>i = 1</b>.', parts: [
          { type: 'array', label: 'pattern', values: p.split(''), ptr: ptrs(1, 0) },
          { type: 'array', label: 'lps', values: shown.slice(), hl: { 0: 'ok' } },
          { type: 'vars', vals: { i: 1, len: 0 } }
        ] });
        var i = 1, len = 0, guard = 0;
        while (i < m && guard++ < 200) {
          var hl = {};
          if (p[i] === p[len]) {
            hl[i] = 'ok'; hl[len] = 'ok';
            len++; lps[i] = len; shown[i] = String(len);
            frames.push({ narr: 'pat[i=' + i + '] = ' + q(p[i]) + ' equals pat[len=' + (len - 1) + '] = ' + q(p[len - 1]) + ' → the border grows: <b>len = ' + len + '</b>, so <b>lps[' + i + '] = ' + len + '</b> ("' + H.esc(p.slice(0, len)) + '" is both a prefix and a suffix of "' + H.esc(p.slice(0, i + 1)) + '"). Move i forward.', parts: [
              { type: 'array', label: 'pattern', values: p.split(''), ptr: ptrs(i, len - 1), hl: hl, range: [0, len - 1] },
              { type: 'array', label: 'lps', values: shown.slice(), hl: oneHl(i, 'ok') },
              { type: 'vars', vals: { i: i, len: len }, hl: { len: 'ok' } }
            ] });
            i++;
          } else if (len > 0) {
            hl[i] = 'bad'; hl[len] = 'bad';
            var old = len; len = lps[len - 1];
            frames.push({ narr: 'pat[i=' + i + '] = ' + q(p[i]) + ' ≠ pat[len=' + old + '] = ' + q(p[old]) + '. The border "' + H.esc(p.slice(0, old)) + '" cannot grow. Fall back to the next shorter border: <b>len = lps[' + (old - 1) + '] = ' + len + '</b>. i stays put — we will retry this same letter.', parts: [
              { type: 'array', label: 'pattern', values: p.split(''), ptr: ptrs(i, old), hl: hl },
              { type: 'array', label: 'lps', values: shown.slice(), hl: oneHl(old - 1, 'cur') },
              { type: 'vars', vals: { i: i, len: len }, hl: { len: 'cur' } }
            ] });
          } else {
            hl[i] = 'bad'; hl[0] = 'bad';
            lps[i] = 0; shown[i] = '0';
            frames.push({ narr: 'pat[i=' + i + '] = ' + q(p[i]) + ' ≠ pat[0] = ' + q(p[0]) + ' and len is already 0 → nothing reusable: <b>lps[' + i + '] = 0</b>. Move i forward.', parts: [
              { type: 'array', label: 'pattern', values: p.split(''), ptr: ptrs(i, 0), hl: hl },
              { type: 'array', label: 'lps', values: shown.slice(), hl: oneHl(i, 'bad') },
              { type: 'vars', vals: { i: i, len: 0 } }
            ] });
            i++;
          }
        }
        frames.push({ narr: 'Finished: lps = [' + lps.join(', ') + ']. i moved forward m − 1 times and len can only fall back as much as it grew → O(M) total.', parts: [
          { type: 'array', label: 'pattern', values: p.split('') },
          { type: 'array', label: 'lps', values: lps.map(String), hl: (function () { var h = {}; h[m - 1] = 'sel'; return h; })() },
          { type: 'text', html: 'lps[m − 1] = <b>' + lps[m - 1] + '</b> = longest proper prefix of the whole pattern that is also its suffix.' }
        ] });
        return frames;
      }
    }, {
      title: 'KMP matching (text pointer i, pattern pointer j)',
      input: 'ababcabcabababd | ababd',
      inputLabel: 'text | pattern (text ≤ 20, pattern ≤ 8)',
      gen: function (input) {
        var pr = readPair(input, 'ababcabcabababd | ababd', 'text | pattern');
        var t = pr[0], p = pr[1];
        if (t.length > 20 || p.length > 8) throw new Error('Keep text ≤ 20 and pattern ≤ 8 characters.');
        var n = t.length, m = p.length, L = lpsOf(p), frames = [], found = [];
        function part(i, j, hlT, hlP, narr) {
          var off = i - j, ptT = {}, ptP = {};
          if (i < n) ptT[i] = 'i'; if (j < m) ptP[j] = 'j';
          frames.push({ narr: narr, parts: [
            { type: 'array', label: 'text', values: t.split(''), ptr: ptT, hl: hlT, range: (off >= 0 && off + m - 1 < n + m) ? [off, Math.min(n - 1, off + m - 1)] : undefined },
            { type: 'array', label: 'pattern (lined up under text index ' + off + ')', values: p.split(''), ptr: ptP, hl: hlP },
            { type: 'array', label: 'lps', values: L.slice() },
            { type: 'vars', vals: { i: i, j: j, found: '[' + found.join(', ') + ']' } }
          ] });
        }
        frames.push({ narr: 'First build lps of the pattern: [' + L.join(', ') + ']. Then walk the text with <b>i</b> and the pattern with <b>j</b>. Promise: <b>i never goes back</b>.', parts: [
          { type: 'array', label: 'text', values: t.split('') },
          { type: 'array', label: 'pattern', values: p.split('') },
          { type: 'array', label: 'lps', values: L.slice(), hl: (function () { var h = {}; L.forEach(function (x, k) { if (x > 0) h[k] = 'ok'; }); return h; })() }
        ] });
        var i = 0, j = 0, guard = 0;
        while (i < n && guard++ < 300) {
          var hT = {}, hP = {};
          for (var k = i - j; k < i; k++) hT[k] = 'ok';
          for (k = 0; k < j; k++) hP[k] = 'ok';
          if (t[i] === p[j]) {
            hT[i] = 'ok'; hP[j] = 'ok';
            part(i, j, hT, hP, 'txt[' + i + '] = ' + q(t[i]) + ' matches pat[' + j + '] = ' + q(p[j]) + ' → move both: i++, j++.');
            i++; j++;
            if (j === m) {
              found.push(i - m);
              var hT2 = {}; for (k = i - m; k < i; k++) hT2[k] = 'sel';
              var nj = L[m - 1];
              part(i, j, hT2, {}, '<span class="c-p">Whole pattern matched → found at index ' + (i - m) + '</span>. To catch overlapping matches keep the border: j = lps[' + (m - 1) + '] = ' + nj + '.');
              j = nj;
            }
          } else if (j > 0) {
            hT[i] = 'bad'; hP[j] = 'bad';
            var nj2 = L[j - 1];
            part(i, j, hT, hP, 'txt[' + i + '] = ' + q(t[i]) + ' ≠ pat[' + j + '] = ' + q(p[j]) + '. We matched "' + H.esc(p.slice(0, j)) + '"; its last ' + nj2 + ' letter(s) are also the pattern\'s first ' + nj2 + '. So <b>j = lps[' + (j - 1) + '] = ' + nj2 + '</b> (slide the pattern right) and keep i where it is — no re-reading.');
            j = nj2;
          } else {
            hT[i] = 'bad'; hP[0] = 'bad';
            part(i, j, hT, hP, 'txt[' + i + '] = ' + q(t[i]) + ' ≠ pat[0] = ' + q(p[0]) + ' and j = 0 → nothing to keep, just move on: i++.');
            i++;
          }
        }
        frames.push({ narr: 'Text finished. Matches at <b>[' + found.join(', ') + ']</b>. i only moved forward (N steps) and j fell back at most as often as it advanced → O(N + M) total.', parts: [
          { type: 'array', label: 'text', values: t.split(''), hl: (function () { var h = {}; found.forEach(function (s0) { for (var z = s0; z < s0 + m; z++) h[z] = 'sel'; }); return h; })() },
          { type: 'vars', vals: { matches: '[' + found.join(', ') + ']' }, hl: { matches: 'sel' } }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'LPS of extreme patterns', html: `${H.table(['pattern', 'lps', 'why'], [
          ['aaaa', '[0, 1, 2, 3]', 'every prefix "a…a" is also a suffix — borders keep growing'],
          ['abcd', '[0, 0, 0, 0]', 'all letters different → no border anywhere'],
          ['abab', '[0, 0, 1, 2]', 'period 2: the pattern repeats "ab"'],
          ['aabaaab', '[0, 1, 0, 1, 2, 2, 3]', 'at i = 5, extending the border "aa" fails (pat[5] = a ≠ pat[2] = b) → fall back to len = lps[1] = 1, then a = a grows it to 2']
        ])}
        <p>Reading lps quickly is a skill interviewers test: compute it by hand for a 6–8 letter pattern before writing any code.</p>` },
      { title: 'Repeated substring pattern via the period', html: `<p>Is <code>"abcabcabc"</code> built by repeating a smaller piece? lps[n − 1] = 6 (the border "abcabc"). The smallest period is <b>p = n − lps[n − 1] = 9 − 6 = 3</b>. Since 9 % 3 == 0 and lps[n − 1] &gt; 0 → yes, "abc" × 3.</p>
        ${H.table(['s', 'n', 'lps[n−1]', 'p = n − lps', 'n % p == 0?', 'answer'], [['abcabcabc', '9', '6', '3', 'yes', '<span class="c-g">true</span>'], ['abab', '4', '2', '2', 'yes', '<span class="c-g">true</span>'], ['abcab', '5', '2', '3', 'no', '<span class="c-r">false</span>'], ['aaaa', '4', '3', '1', 'yes', '<span class="c-g">true</span>']])}`, code: `static boolean repeated(String s) {
    int n = s.length();
    int[] lps = new int[n];
    for (int i = 1, len = 0; i < n; ) {          // standard LPS build
        if (s.charAt(i) == s.charAt(len)) lps[i++] = ++len;
        else if (len > 0) len = lps[len - 1];
        else lps[i++] = 0;
    }
    int border = lps[n - 1];
    return border > 0 && n % (n - border) == 0;  // period divides the length
}` },
      { title: 'Shortest palindrome by adding characters in front', html: `<p>s = <code>"aacecaaa"</code>. The longest palindromic <b>prefix</b> of s is what we can keep; everything after it must be mirrored in front. Build <code>t = s + "#" + reverse(s)</code> = "aacecaaa#aaacecaa". lps of t's last position = length of the longest prefix of s that equals a suffix of reverse(s) = the longest palindromic prefix = <b>7</b> ("aacecaa").</p>
        <p>Remaining suffix "a" → reversed "a" goes in front → <code>"aaacecaaa"</code>. The <code>#</code> stops the border from crossing between the two halves.</p>` }
    ],
    deepDive: `<h4>Why KMP is linear — the potential argument</h4>
      <p>In the search loop, each iteration either (a) moves i forward (at most N times) or (b) decreases j. j increases only together with i (at most N increments in total), so it can decrease at most N times. Total iterations ≤ 2N. The same argument on the LPS build gives ≤ 2M. Hence <b>O(N + M)</b> worst case, with no randomness.</p>
      <h4>Why the fallback <code>len = lps[len − 1]</code> is right</h4>
      <p>If "abab" is a border of the current prefix and it cannot be extended, the next candidate must be a border <i>of the border</i> (a shorter string that is both prefix and suffix). Borders of borders are exactly lps[len − 1], lps[lps[len − 1] − 1], … — so we try them from longest to shortest and never miss one.</p>
      <h4>Relatives and real-world use</h4>
      <ul>
        <li><b>KMP automaton:</b> precompute next-state for every (state, letter) → each text character costs exactly O(1) (used in DP problems like "count strings of length n that avoid pattern p").</li>
        <li><b>Aho–Corasick</b> = KMP on a trie: finds many patterns at once (spam filters, intrusion detection, profanity lists).</li>
        <li><b>Java's String.indexOf</b> is a naive search with SIMD intrinsics — O(N·M) worst case but very fast on normal text. <b>grep</b> uses Boyer–Moore-style skipping, which is sub-linear on typical inputs.</li>
        <li>KMP needs only the pattern's LPS and reads the text <b>once, left to right</b> — ideal for streams (network packets, logs) where you cannot go back.</li>
      </ul>
      <p>The LPS array is also called the <b>prefix function π</b> in many textbooks and editorials.</p>`,
    aiEra: `<p><b>What AI changes:</b> KMP used to be the "memorise it the night before" algorithm. Now any assistant can print it — so interviews shift towards <b>applying the LPS array</b> (period, shortest palindrome, longest happy prefix) and explaining the fallback.</p>
      <p><b>Use AI as a partner:</b> paste your LPS function and ask for inputs where a buggy version (using lps[len] instead of lps[len − 1], or incrementing i on fallback) differs from the correct one. Ask it to trace "aabaaab" step by step, then compare with the visualizer.</p>
      <p><b>Where AI goes wrong:</b> resetting j to 0 after a full match (misses overlaps), forgetting the separator in s + "#" + rev(s), and claiming Java's <code>indexOf</code> is KMP (it is not).</p>
      <p><b>What you must still own:</b> computing lps by hand, the amortized proof, and recognising "prefix that is also a suffix", "repeated pattern" and "add characters in front to make a palindrome" as LPS questions.</p>`,
    problems: [{
      title: 'KMP Pattern Search (using the LPS array)',
      level: 'Medium',
      tags: ['kmp', 'lps', 'string matching'],
      statement: `<p>Given a text <code>txt</code> and a pattern <code>pat</code>, return all starting indices (0-based) where <code>pat</code> occurs in <code>txt</code>, in increasing order. Overlapping occurrences count. Your solution must run in <b>O(|txt| + |pat|)</b> time in the worst case.</p>`,
      constraints: `1 ≤ |pat| ≤ |txt| ≤ 10<sup>6</sup>; any characters.`,
      example: `${H.arr('abxabcabcaby'.split(''), { hl: { 6: 'g', 7: 'g', 8: 'g', 9: 'g', 10: 'g', 11: 'g' } })}
        <p>pat = <code>"abcaby"</code>, lps = [0, 0, 0, 1, 2, 0] → Output: ${H.c('g', '[6]')}.</p>
        <p>Why KMP shines here: at text index 8 we have matched "abcab" and then see ${H.c('r', 'c ≠ y')}. lps[4] = 2 says the matched part ends with "ab" = pattern start, so we continue with j = 2 — the text pointer never goes back.</p>`,
      brute: {
        why: `<p>Try every start, compare up to M letters: O(N·M). Killer input: text = "aaaa…a" (10<sup>6</sup>), pattern = "aaa…ab" (5·10<sup>5</sup>) → ~2.5·10<sup>11</sup> comparisons. The wasted work: after a long partial match fails, we shift by just one and re-compare letters we already know.</p>`,
        code: `
          List<Integer> searchBrute(String txt, String pat) {
              List<Integer> res = new ArrayList<>();
              for (int i = 0; i + pat.length() <= txt.length(); i++) {
                  int k = 0;
                  while (k < pat.length() && txt.charAt(i + k) == pat.charAt(k)) k++;
                  if (k == pat.length()) res.add(i);
              }
              return res;
          }`
      },
      mcq: {
        q: 'Pattern <code>"abcaby"</code> (lps = [0,0,0,1,2,0]). You matched j = 5 letters "abcab" and then hit a mismatch. Where does j go?',
        options: ['j = 0 and move i back to the start of the attempt + 1', 'j = lps[4] = 2, i stays', 'j = lps[5] = 0, i stays', 'j = 4, i++'],
        answer: 1,
        explain: 'Use the lps of the last <b>matched</b> position (j − 1 = 4): lps[4] = 2 because "abcab" ends with "ab", which is also the start of the pattern. Those 2 letters are already matched, so continue comparing pat[2] with the same txt[i].'
      },
      hints: [
        `<p><b>Aha:</b> when a partial match "abcab" fails, the text you just read is <i>known</i>. The only useful question is: what is the longest beginning of the pattern that this known text ends with? That number is precomputed in <code>lps</code>.</p>`,
        `<p>Two arrays/pointers: build <code>int[] lps</code> (pointers i, len), then scan with <code>i</code> over the text and <code>j</code> over the pattern. Match → both move. Mismatch → <code>j = lps[j−1]</code> if j &gt; 0, else <code>i++</code>.</p>`,
        `<p><b>Traps:</b> on a full match record <code>i − m</code> (i has already moved past the match) and set <code>j = lps[m−1]</code> — not 0 — so overlaps like "aa" in "aaa" are found; use lps[j−1], never lps[j]; on mismatch with j &gt; 0 do <b>not</b> increment i. <b>Recipe:</b> lps = build(pat); i = j = 0; while i &lt; n: if txt[i]==pat[j]: i++, j++; if j==m: add i−m, j = lps[m−1]; else if j &gt; 0: j = lps[j−1]; else i++.</p>`
      ],
      solution: {
        approach: `<p>Precompute LPS in O(M), then one forward scan of the text in O(N).</p>`,
        code: `
          import java.util.*;

          class Solution {
              public List<Integer> kmpSearch(String txt, String pat) {
                  List<Integer> res = new ArrayList<>();
                  int n = txt.length(), m = pat.length();
                  int[] lps = buildLps(pat);
                  int i = 0, j = 0;                    // i -> text, j -> pattern
                  while (i < n) {
                      if (txt.charAt(i) == pat.charAt(j)) {
                          i++;
                          j++;
                          if (j == m) {                // whole pattern matched
                              res.add(i - m);          // it started m chars back
                              j = lps[m - 1];          // keep the border -> overlaps work
                          }
                      } else if (j > 0) {
                          j = lps[j - 1];              // slide pattern, i stays
                      } else {
                          i++;                         // nothing matched, move on
                      }
                  }
                  return res;
              }

              private int[] buildLps(String p) {
                  int m = p.length();
                  int[] lps = new int[m];
                  int len = 0, i = 1;
                  while (i < m) {
                      if (p.charAt(i) == p.charAt(len)) {
                          lps[i++] = ++len;            // border grows
                      } else if (len > 0) {
                          len = lps[len - 1];          // shorter border
                      } else {
                          lps[i++] = 0;                // no border
                      }
                  }
                  return lps;
              }

              public static void main(String[] args) {
                  System.out.println(new Solution().kmpSearch("abxabcabcaby", "abcaby")); // [6]
                  System.out.println(new Solution().kmpSearch("aaaa", "aa"));             // [0, 1, 2]
              }
          }`,
        dry: {
          head: ['i', 'j', 'txt[i]', 'pat[j]', 'action'],
          rows: [
            ['0', '0', 'a', 'a', '<span class="c-g">match</span> → i=1, j=1'],
            ['1', '1', 'b', 'b', '<span class="c-g">match</span> → i=2, j=2'],
            ['2', '2', 'x', 'c', '<span class="c-r">mismatch</span>, j &gt; 0 → j = lps[1] = 0'],
            ['2', '0', 'x', 'a', '<span class="c-r">mismatch</span>, j = 0 → i=3'],
            ['3..7', '0..4', 'a b c a b', 'a b c a b', '<span class="c-g">5 matches</span> → i=8, j=5'],
            ['8', '5', 'c', 'y', '<span class="c-r">mismatch</span> → j = lps[4] = <b>2</b> (keep "ab")'],
            ['8..11', '2..5', 'c a b y', 'c a b y', '<span class="c-g">4 matches</span> → i=12, j=6 = m'],
            ['12', '6', '—', '—', '<span class="c-p">found at 12 − 6 = 6</span>; j = lps[5] = 0; loop ends → [6]']
          ]
        },
        complexity: `<p><b>Time O(N + M):</b> building lps is O(M); in the search i moves forward N times, and each fallback of j undoes an earlier j++ — so fallbacks ≤ N too. <b>Space O(M)</b> for the lps array.</p>`
      }
    }]
  });

  // =====================================================================
  // TOPIC 7 — Z-Algorithm
  // =====================================================================
  topics.push({
    title: 'Z-Algorithm: Z-array, the [L, R] box, and the pattern + "$" + text trick',
    analogy: `<p><b>"How much of the opening line repeats here?"</b> Imagine a poem. For every position, you ask: starting here, how many letters copy the poem's <b>opening</b> exactly? That count is the Z-value.</p>
      <p><b>The photocopy window.</b> Once you have verified that a stretch <code>[L, R]</code> of the poem is an exact photocopy of the opening, then anything inside that stretch is <i>also</i> a copy of something near the opening — so you can <b>look up the answer you already computed</b> there instead of re-reading. You only read new letters beyond R.</p>`,
    explain: `<h4>1. What is the Z-array?</h4>
      <p><code>Z[i]</code> = length of the longest substring starting at <code>i</code> that matches a <b>prefix</b> of the string. By convention <code>Z[0] = 0</code> (the whole string trivially matches itself).</p>
      ${H.arr('aabxaab'.split(''), { label: 's', hl: { 4: 'g', 5: 'g', 6: 'g', 0: 'b', 1: 'b', 2: 'b' } })}
      ${H.arr([0, 1, 0, 0, 3, 1, 0], { label: 'Z', hl: { 4: 'p' } })}
      <p>Z[4] = 3 because s[4..6] = ${H.c('g', '"aab"')} equals the prefix ${H.c('b', '"aab"')}. Z[1] = 1 because s[1] = "a" matches the prefix "a" but then "b" ≠ "a".</p>
      <h4>2. The [L, R] box — reuse old answers</h4>
      <p>Keep the box <code>[L, R]</code> = the matching stretch (found so far) that reaches furthest right. It means <code>s[L..R] == s[0..R−L]</code>. For a new index i:</p>
      <ul><li><b>i inside the box (i ≤ R):</b> position i mirrors position <code>i − L</code> near the start. So <code>Z[i]</code> is at least <code>min(R − i + 1, Z[i − L])</code> — free information! (Capped at R − i + 1 because beyond R we have not verified anything.)</li>
      <li><b>i outside the box:</b> start from 0.</li>
      <li>Then try to extend by comparing <code>s[Z[i]]</code> with <code>s[i + Z[i]]</code> one by one.</li>
      <li>If the match reaches past R, move the box: <code>L = i</code>, <code>R = i + Z[i] − 1</code>.</li></ul>
      <p>R only ever moves right, and every successful extension pushes R → total work <b>O(N)</b>.</p>
      <h4>3. Pattern search trick: <code>pat + "$" + txt</code></h4>
      <p>Glue the pattern in front of the text with a separator that appears in neither. Now <code>Z[i] == m</code> means "the pattern starts here". The <code>$</code> guarantees no Z-value can exceed m.</p>
      ${H.arr('aba$ababa'.split(''), { label: 'aba$ababa', hl: { 0: 'b', 1: 'b', 2: 'b', 3: 'm', 4: 'g', 6: 'g' } })}
      ${H.arr([0, 0, 1, 0, 3, 0, 3, 0, 1], { label: 'Z', hl: { 4: 'p', 6: 'p' } })}
      <p>Z = 3 = m at indices 4 and 6 → in the text that is index <code>i − m − 1</code> = <b>0 and 2</b> (overlapping matches of "aba" in "ababa").</p>
      ${H.table(['Tool', 'Precompute', 'Best for'], [
        ['KMP', 'lps of the pattern (O(M) memory)', 'streaming text, borders, periods'],
        ['Z-algorithm', 'Z of pat$txt (O(N + M) memory)', 'simple to code, "matches the prefix" questions'],
        ['Rabin-Karp', 'hashes', 'many substring comparisons, multiple patterns']
      ])}`,
    clues: [
      '"<b>how long does the substring starting at i match the prefix</b>" → that is literally Z[i].',
      '"<b>count / find all occurrences</b>" of a pattern in linear time → Z on <code>pat + "$" + txt</code>, count Z[i] == m.',
      '"<b>sum of scores</b> of prefixes" / "longest common prefix of s with each suffix" → sum of the Z-array (+ n).',
      '"<b>smallest period</b>" / "string made of repeats" → smallest p with p + Z[p] == n and n % p == 0.',
      'You need guaranteed O(N + M) but find LPS fallbacks confusing → Z gives the same power with a simpler box picture.'
    ],
    code: `
      class ZAlgo {
          static int[] zArray(String s) {
              int n = s.length();
              int[] z = new int[n];          // z[0] stays 0 by convention
              int L = 0, R = 0;              // box [L, R]: s[L..R] == s[0..R-L]
              for (int i = 1; i < n; i++) {
                  if (i <= R) {
                      // inside the box: copy the mirrored answer, but never beyond R
                      z[i] = Math.min(R - i + 1, z[i - L]);
                  }
                  // try to extend by reading new characters
                  while (i + z[i] < n && s.charAt(z[i]) == s.charAt(i + z[i])) {
                      z[i]++;
                  }
                  // the match reaches further right than the old box -> move the box
                  if (i + z[i] - 1 > R) {
                      L = i;
                      R = i + z[i] - 1;
                  }
              }
              return z;
          }

          public static void main(String[] args) {
              System.out.println(Arrays.toString(zArray("aabxaab")));   // [0, 1, 0, 0, 3, 1, 0]
              System.out.println(Arrays.toString(zArray("aba$ababa"))); // [0, 0, 1, 0, 3, 0, 3, 0, 1]
          }
      }`,
    codeTitle: 'Z-array in O(N)',
    viz: {
      title: 'Z-array with the [L, R] box on pattern$text',
      input: 'aab | baabaab',
      inputLabel: 'pattern | text (total ≤ 20)',
      gen: function (input) {
        var pr = readPair(input, 'aab | baabaab', 'pattern | text');
        var p = pr[0], t = pr[1];
        if (p.indexOf('$') >= 0 || t.indexOf('$') >= 0) throw new Error('Please do not use $ — it is the separator.');
        var s = p + '$' + t, n = s.length, m = p.length;
        if (n > 20) throw new Error('Pattern + text together must be at most 19 characters.');
        var z = [], frames = [], L = 0, R = 0, found = [];
        for (var k = 0; k < n; k++) z.push(0);
        function zshow(upto) { return z.map(function (v, idx) { return idx === 0 ? '-' : (idx <= upto ? String(v) : '·'); }); }
        frames.push({ narr: 'Glue: <b>"' + H.esc(p) + '" + "$" + "' + H.esc(t) + '"</b>. Any Z[i] equal to m = ' + m + ' marks a match. The box [L, R] starts empty (R = 0).', parts: [
          { type: 'array', label: 's = pat$txt', values: s.split(''), hl: (function () { var h = {}; for (var x = 0; x < m; x++) h[x] = 'sel'; h[m] = 'done'; return h; })() },
          { type: 'array', label: 'Z', values: zshow(0) },
          { type: 'vars', vals: { L: 0, R: 0, m: m } }
        ] });
        for (var i = 1; i < n; i++) {
          var inside = i <= R, start = 0, narr1;
          if (inside) { start = Math.min(R - i + 1, z[i - L]); z[i] = start; }
          narr1 = inside ? '<b>i = ' + i + '</b> is inside the box [' + L + ', ' + R + ']. Its mirror near the start is i − L = ' + (i - L) + ' with Z = ' + z[i - L] + '. Free start: Z[i] = min(R − i + 1 = ' + (R - i + 1) + ', ' + z[i - L] + ') = <b>' + start + '</b>.'
                         : '<b>i = ' + i + '</b> is outside the box (i &gt; R = ' + R + '), so we know nothing yet: start Z[i] = 0.';
          var h1 = {}; h1[i] = 'cur'; if (inside) h1[i - L] = 'sel';
          frames.push({ narr: narr1, parts: [
            { type: 'array', label: 's', values: s.split(''), ptr: oneHl(i, 'i'), hl: h1, range: R > 0 ? [L, R] : undefined },
            { type: 'array', label: 'Z', values: zshow(i), hl: oneHl(i, 'cur') },
            { type: 'vars', vals: { i: i, L: L, R: R, 'Z[i] start': start } }
          ] });
          var ext = 0;
          while (i + z[i] < n && s[z[i]] === s[i + z[i]]) { z[i]++; ext++; }
          var stopWhy = (i + z[i] >= n) ? 'reached the end of the string' : 's[' + z[i] + '] = ' + q(s[z[i]]) + ' ≠ s[' + (i + z[i]) + '] = ' + q(s[i + z[i]]);
          var moved = i + z[i] - 1 > R;
          if (moved) { L = i; R = i + z[i] - 1; }
          var isMatch = z[i] === m;
          if (isMatch) found.push(i - m - 1);
          var h2 = {}; for (var a = i; a < i + z[i]; a++) h2[a] = 'ok'; for (a = 0; a < z[i]; a++) h2[a] = h2[a] || 'win';
          if (i + z[i] < n) h2[i + z[i]] = 'bad';
          var zh = {}; zh[i] = isMatch ? 'sel' : 'ok';
          frames.push({ narr: (ext > 0 ? 'Extended ' + ext + ' new character(s) by direct comparison; ' : 'No extension; ') + 'stop because ' + stopWhy + '. <b>Z[' + i + '] = ' + z[i] + '</b>. ' + (moved ? 'This match reaches further right → move the box to <b>[' + L + ', ' + R + ']</b>. ' : 'Box stays [' + L + ', ' + R + ']. ') + (isMatch ? '<span class="c-p">Z = m → pattern found at text index ' + i + ' − ' + m + ' − 1 = ' + (i - m - 1) + '!</span>' : ''), parts: [
            { type: 'array', label: 's', values: s.split(''), ptr: oneHl(i, 'i'), hl: h2, range: R > 0 ? [L, R] : undefined },
            { type: 'array', label: 'Z', values: zshow(i), hl: zh },
            { type: 'vars', vals: { i: i, L: L, R: R, 'Z[i]': z[i], found: '[' + found.join(', ') + ']' }, hl: { R: moved ? 'ok' : '', found: isMatch ? 'sel' : '' } }
          ] });
        }
        frames.push({ narr: 'Done. Z = [' + zshow(n).join(', ') + ']. Occurrences of "' + H.esc(p) + '" in the text start at <b>[' + found.join(', ') + ']</b> (count = ' + found.length + '). R moved only rightwards → O(N + M).', parts: [
          { type: 'array', label: 'Z', values: zshow(n), hl: (function () { var h = {}; z.forEach(function (v, idx) { if (idx > 0 && v === m) h[idx] = 'sel'; }); return h; })() },
          { type: 'vars', vals: { count: found.length, positions: '[' + found.join(', ') + ']' }, hl: { count: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Z-array of "aaaaa" — watch the box save work', html: `${H.table(['i', 'inside box?', 'free start', 'extra compares', 'Z[i]', 'box after'], [
          ['1', 'no', '0', 'a=a ×4, then end', '4', '[1, 4]'],
          ['2', 'yes', 'min(4 − 2 + 1, Z[1] = 4) = 3', 'none (hit the end)', '3', '[1, 4]'],
          ['3', 'yes', 'min(2, Z[2] = 3) = 2', 'none', '2', '[1, 4]'],
          ['4', 'yes', 'min(1, Z[3] = 2) = 1', 'none', '1', '[1, 4]']
        ])}
        <p>Z = [0, 4, 3, 2, 1]. Only 4 character comparisons in total — a naive "compare from scratch at every i" would do 4 + 3 + 2 + 1 = 10. On long strings this is the difference between O(N) and O(N<sup>2</sup>).</p>` },
      { title: 'Sum of scores: LCP of every suffix with the whole string', html: `<p>The "score" of suffix i is the length of the longest common prefix of s[i..] and s — that is exactly Z[i] (and the whole string scores n). For s = <code>"babab"</code>: Z = [0, 0, 3, 0, 1] → total = 5 + 0 + 3 + 0 + 1 = <b>9</b>.</p>
        ${H.arr('babab'.split(''), { label: 's', hl: { 2: 'g', 3: 'g', 4: 'g' } })}
        ${H.arr([5, 0, 3, 0, 1], { label: 'score (Z with Z[0] = n)', hl: { 2: 'p' } })}
        <p>One O(N) pass instead of N separate comparisons.</p>`, code: `static long sumScores(String s) {
    int n = s.length();
    int[] z = new int[n];
    long total = n;                                   // the full string matches itself
    for (int i = 1, L = 0, R = 0; i < n; i++) {
        if (i <= R) z[i] = Math.min(R - i + 1, z[i - L]);
        while (i + z[i] < n && s.charAt(z[i]) == s.charAt(i + z[i])) z[i]++;
        if (i + z[i] - 1 > R) { L = i; R = i + z[i] - 1; }
        total += z[i];
    }
    return total;                                     // "babab" -> 9
}` },
      { title: 'Smallest period with the Z-array', html: `<p>p is a period of s if s[i] = s[i + p] for all valid i — equivalently <b>p + Z[p] == n</b> (the suffix starting at p matches the prefix all the way to the end). For s = <code>"abcabcab"</code>: Z = [0, 0, 0, 5, 0, 0, 2, 0]. The smallest p with p + Z[p] = 8 is <b>p = 3</b> ("abc" repeated, last copy cut short).</p>
        <p>If the question needs <i>full</i> repetition ("abcabc" = "abc" × 2), also require n % p == 0 — same rule as the KMP version (p = n − lps[n − 1]).</p>` }
    ],
    deepDive: `<h4>Proof of O(N)</h4>
      <p>Every character comparison inside the while-loop is either a <b>failure</b> (at most one per i → ≤ N) or a <b>success</b>. A success at position i + Z[i] means that position was beyond R (inside the box the free start already covered it, and the free value is exact when it is strictly less than R − i + 1). Each success therefore pushes R right by one, and R ≤ n − 1 — so successes ≤ N. Total O(N).</p>
      <h4>Subtle cases</h4>
      <ul>
        <li>If <code>Z[i − L] &lt; R − i + 1</code>, the answer is exactly Z[i − L] and the while-loop stops immediately (the mismatch is mirrored). Only when it reaches the box edge can it grow further.</li>
        <li><b>No safe separator?</b> (e.g. the alphabet is all of Unicode, or the inputs are int arrays) — compute Z of the pattern alone, then run a second "matching" pass over the text that uses the pattern's Z values, or use KMP, which never needs a separator.</li>
        <li><b>Memory:</b> Z on pat$txt stores N + M ints; KMP stores only M. For a 1 GB log stream, KMP wins.</li>
      </ul>
      <h4>Z vs prefix function</h4>
      <p>Both encode the same information about how the string overlaps with itself; each can be converted into the other in O(N). Choose by question wording: "<i>matches the prefix starting at i</i>" → Z; "<i>longest prefix ending at i that is also a suffix</i>" → LPS. Z is also a building block for harder tasks (counting each prefix's occurrences, string compression problems, and the "Main–Lorentz" algorithm for finding repetitions).</p>`,
    aiEra: `<p><b>What AI changes:</b> Z-algorithm code is short and models write it well, but they often leave out the <code>R − i + 1</code> cap, use an exclusive vs inclusive box inconsistently, or forget that the separator must not appear in the input. Because the code "looks" right, these bugs survive casual review.</p>
      <p><b>Use AI as a partner:</b> ask it to produce a brute-force Z (compare from scratch at each i) and a 1 000-case random stress test against your O(N) version. Ask it to explain why each successful comparison moves R — if it cannot, the explanation is hand-waving.</p>
      <p><b>AI-era connection:</b> prefix-matching is the heart of <b>prompt/prefix caching</b> in LLM serving: the server checks how long the new request's token prefix matches a cached one and reuses that work — conceptually a Z/LCP question on token arrays.</p>
      <p><b>What you must still own:</b> the [L, R] box picture, the pat + "$" + txt trick, and the ability to pick Z, KMP or hashing from the wording of the question.</p>`,
    problems: [{
      title: 'Count Pattern Occurrences with the Z-Algorithm',
      level: 'Medium',
      tags: ['z-algorithm', 'string matching'],
      statement: `<p>Given a text <code>txt</code> and a pattern <code>pat</code> (lowercase letters), return <b>how many times</b> <code>pat</code> occurs in <code>txt</code>. Occurrences may overlap. Required time: O(|txt| + |pat|).</p>`,
      constraints: `1 ≤ |pat| ≤ |txt| ≤ 10<sup>6</sup>; lowercase a–z (so '$' is a safe separator).`,
      example: `${H.arr('ababa'.split(''), { label: 'txt', hl: { 0: 'g', 1: 'g', 2: 'p', 3: 'b', 4: 'b' } })}
        <p>pat = <code>"aba"</code> → Output: <b>2</b>. ${H.c('g', 'ab')}${H.c('p', 'a')} at index 0 and ${H.c('p', 'a')}${H.c('b', 'ba')} at index 2 — they <b>share</b> the middle "a" (overlap counts).</p>
        <p>Combined string <code>"aba$ababa"</code> has Z = [0, 0, 1, 0, <b>3</b>, 0, <b>3</b>, 0, 1] → two values equal to m = 3.</p>`,
      brute: {
        why: `<p>Check every starting index of the text against the whole pattern: O(N·M). With txt = "aaaa…" and pat = "aaa…a" (half as long) that is about 2.5·10<sup>11</sup> character compares. The wasted work: neighbouring attempts overlap heavily and re-read the same letters.</p>`,
        code: `
          int countBrute(String txt, String pat) {
              int cnt = 0;
              for (int i = 0; i + pat.length() <= txt.length(); i++) {
                  if (txt.startsWith(pat, i)) cnt++;   // O(M) compare each time
              }
              return cnt;
          }`
      },
      mcq: {
        q: 'Why do we put a separator like <code>$</code> between pattern and text?',
        options: ['To make the string longer', 'So that no Z-value can be larger than m — a match can never run past the pattern into the text', 'Because Java strings need a terminator', 'It speeds up the comparisons'],
        answer: 1,
        explain: '$ appears nowhere else, so any comparison reaching it fails. That caps every Z[i] at m and makes "Z[i] == m" an exact "pattern starts here" test. Without it, e.g. pat "aa" + txt "aaa" would give Z values bigger than 2 that mix pattern and text.'
      },
      hints: [
        `<p><b>Aha:</b> "pattern occurs at text index k" is the same as "the suffix of <code>pat$txt</code> starting at k + m + 1 begins with the whole prefix <code>pat</code>" — exactly <code>Z[k + m + 1] == m</code>.</p>`,
        `<p>Build <code>s = pat + "$" + txt</code>, compute the Z-array with the <code>[L, R]</code> box (start inside the box from <code>min(R − i + 1, Z[i − L])</code>, then extend), and count indices <code>i &gt; m</code> with <code>Z[i] == m</code>.</p>`,
        `<p><b>Traps:</b> the separator must not occur in either string; cap with <code>R − i + 1</code> (inclusive box) — forgetting the cap gives too-large values; check <code>i + z[i] &lt; n</code> before reading; overlaps are automatically counted. <b>Recipe:</b> s = pat+"$"+txt; z = zArray(s); count = number of i with z[i] == m; return count.</p>`
      ],
      solution: {
        approach: `<p>Z-array of pat$txt; every Z value equal to |pat| is one occurrence.</p>`,
        code: `
          class Solution {
              public int countOccurrences(String txt, String pat) {
                  String s = pat + "$" + txt;          // '$' never appears in pat or txt
                  int m = pat.length();
                  int[] z = zArray(s);
                  int count = 0;
                  for (int i = m + 1; i < s.length(); i++) {
                      if (z[i] == m) count++;          // pattern starts at text index i - m - 1
                  }
                  return count;
              }

              private int[] zArray(String s) {
                  int n = s.length();
                  int[] z = new int[n];
                  int L = 0, R = 0;                    // box [L, R], inclusive
                  for (int i = 1; i < n; i++) {
                      if (i <= R) z[i] = Math.min(R - i + 1, z[i - L]);   // reuse mirrored value
                      while (i + z[i] < n && s.charAt(z[i]) == s.charAt(i + z[i])) z[i]++; // extend
                      if (i + z[i] - 1 > R) {          // reached further -> move the box
                          L = i;
                          R = i + z[i] - 1;
                      }
                  }
                  return z;
              }

              public static void main(String[] args) {
                  System.out.println(new Solution().countOccurrences("ababa", "aba"));     // 2
                  System.out.println(new Solution().countOccurrences("baabaab", "aab"));   // 2
              }
          }`,
        dry: {
          head: ['i', 's[i]', 'inside box? start', 'Z[i] after extend', 'box [L, R]', 'count'],
          rows: [
            ['1', 'b', 'no → 0', '0 (a≠b)', '[0, 0]', '0'],
            ['2', 'a', 'no → 0', '1 (then b≠$)', '[2, 2]', '0'],
            ['3', '$', 'no → 0', '0', '[2, 2]', '0'],
            ['4', 'a', 'no → 0', '<span class="c-p">3</span> (aba, then $≠b)', '[4, 6]', '<span class="c-g">1</span>'],
            ['5', 'b', 'yes → min(2, Z[1]=0) = 0', '0', '[4, 6]', '1'],
            ['6', 'a', 'yes → min(1, Z[2]=1) = 1', '<span class="c-p">3</span> (reached end)', '[6, 8]', '<span class="c-g">2</span>'],
            ['7', 'b', 'yes → min(2, Z[1]=0) = 0', '0', '[6, 8]', '2'],
            ['8', 'a', 'yes → min(1, Z[2]=1) = 1', '1 (end)', '[6, 8]', '<span class="c-p">return 2</span>']
          ]
        },
        complexity: `<p><b>Time O(N + M):</b> each successful extension pushes R one step right, and R never exceeds the string length; everything else is O(1) per index. <b>Space O(N + M)</b> for the combined string and the Z-array.</p>`
      }
    }]
  });

  // =====================================================================
  // PRACTICE — Easy
  // =====================================================================
  practice.push({
    title: 'First Unique Character in a String',
    level: 'Easy',
    tags: ['char arithmetic', 'counting'],
    companies: ['Amazon', 'Bloomberg', 'Microsoft'],
    statement: `<p>Given a string <code>s</code>, find the <b>first</b> character that appears exactly once and return its index. If no such character exists, return <code>-1</code>.</p>`,
    constraints: `1 ≤ |s| ≤ 10<sup>5</sup>; s has only lowercase English letters.`,
    example: `${H.arr('loveleetcode'.split(''), { hl: { 2: 'g', 0: 'r', 1: 'r', 4: 'r', 3: 'r' } })}
      <p>Output <b class="c-g">2</b>: "l" and "o" appear twice, "${H.c('g', 'v')}" (index 2) is the first letter with count 1. <code>"aabb"</code> → <b>-1</b> (every letter repeats).</p>`,
    brute: {
      why: `<p>For each index i, scan the whole string to see whether s[i] appears anywhere else: O(N) per index → O(N<sup>2</sup>) = 10<sup>10</sup> for N = 10<sup>5</sup>. The wasted work: we recount the same letters over and over.</p>`,
      code: `
        int firstUniqBrute(String s) {
            for (int i = 0; i < s.length(); i++) {
                boolean repeated = false;
                for (int j = 0; j < s.length(); j++) {
                    if (i != j && s.charAt(i) == s.charAt(j)) { repeated = true; break; }
                }
                if (!repeated) return i;
            }
            return -1;
        }`
    },
    mcq: {
      q: 'Why do we need <b>two</b> passes over the string?',
      options: ['The first pass sorts it', 'The first pass counts every letter; only then can the second pass know which letter is unique', 'Two passes are needed to handle uppercase', 'One pass is enough with a HashSet'],
      answer: 1,
      explain: 'While scanning left to right you cannot know whether a letter will appear again later. Count everything first, then the first index whose count is 1 is the answer.'
    },
    hints: [
      `<p><b>Aha:</b> "appears exactly once" is a <b>count</b> question. Once you know every letter's total, the answer is just the first index whose letter has count 1.</p>`,
      `<p>Use <code>int[26]</code> with <code>cnt[c - 'a']++</code> in pass 1. In pass 2 walk the string in order and return the first i with <code>cnt[s.charAt(i) - 'a'] == 1</code>.</p>`,
      `<p><b>Traps:</b> walk the <b>string</b> in pass 2, not the alphabet (alphabet order would return the smallest letter, not the first position); return −1 if nothing is found. <b>Recipe:</b> count all; for i in 0..n−1: if cnt[s[i]] == 1 return i; return −1.</p>`
    ],
    solution: {
      approach: `<p>Count letters in an int[26], then return the first index whose letter count is 1.</p>`,
      code: `
        class Solution {
            public int firstUniqChar(String s) {
                int[] cnt = new int[26];
                for (int i = 0; i < s.length(); i++) cnt[s.charAt(i) - 'a']++;   // pass 1: count
                for (int i = 0; i < s.length(); i++) {
                    if (cnt[s.charAt(i) - 'a'] == 1) return i;                  // pass 2: first unique
                }
                return -1;
            }

            public static void main(String[] args) {
                Solution sol = new Solution();
                System.out.println(sol.firstUniqChar("leetcode"));      // 0
                System.out.println(sol.firstUniqChar("loveleetcode"));  // 2
                System.out.println(sol.firstUniqChar("aabb"));          // -1
            }
        }`,
      dry: {
        head: ['pass', 'i', 's[i]', 'cnt[s[i]]', 'action'],
        rows: [
          ['1', '0..11', 'all', 'l2 o2 v1 e4 t1 c1 d1', 'counts done'],
          ['2', '0', 'l', '2', 'skip'],
          ['2', '1', 'o', '2', 'skip'],
          ['2', '2', 'v', '1', '<span class="c-g">return 2</span>']
        ]
      },
      complexity: `<p><b>Time O(N)</b> (two passes). <b>Space O(1)</b> (26 counters).</p>`,
      followUps: ['Stream of characters: answer "first unique so far" after each new char (queue + counts, or LinkedHashMap).', 'Unicode input: HashMap&lt;Character, Integer&gt; or LinkedHashMap.']
    }
  });

  practice.push({
    title: 'Reverse Only Letters',
    level: 'Easy',
    tags: ['two pointers', 'char array'],
    companies: ['Amazon', 'Google'],
    statement: `<p>Given a string <code>s</code>, reverse only the English letters (upper or lower case). Every non-letter character must stay at its original index.</p>`,
    constraints: `1 ≤ |s| ≤ 100; s has printable ASCII characters (codes 33 to 122) and contains no double quote or backslash.`,
    example: `${H.arr('ab-cd'.split(''), { hl: { 2: 'm', 0: 'g', 4: 'g', 1: 'y', 3: 'y' } })}
      <p>"ab-cd" → <b>"dc-ba"</b>: ${H.c('g', 'a ↔ d')}, ${H.c('y', 'b ↔ c')}, the ${H.c('m', '"-"')} stays at index 2. "a-bC-dEf-ghIj" → "j-Ih-gfE-dCba".</p>`,
    brute: {
      why: `<p>Collect all letters into a list, reverse it, then rebuild the string with <code>+=</code>, filling letters back in. Correct, but uses an extra list, and <code>+=</code> in a loop is O(N<sup>2</sup>) copying. The wasted work: we copy everything twice when two pointers can swap in place.</p>`,
      code: `
        String reverseOnlyLettersBrute(String s) {
            List<Character> letters = new ArrayList<>();
            for (char c : s.toCharArray()) if (Character.isLetter(c)) letters.add(c);
            Collections.reverse(letters);
            String res = "";
            int k = 0;
            for (char c : s.toCharArray()) res += Character.isLetter(c) ? letters.get(k++) : c; // O(N) copy each time
            return res;
        }`
    },
    mcq: {
      q: 'Left pointer is on <code>\'-\'</code>, right pointer is on a letter. What happens?',
      options: ['Swap them anyway', 'Move only the left pointer (skip the non-letter)', 'Move both pointers', 'Stop: answer found'],
      answer: 1,
      explain: 'Non-letters never move. Skip it with l++ and keep r on its letter until l also lands on a letter — then swap.'
    },
    hints: [
      `<p><b>Aha:</b> this is the palindrome two-pointer walk, but instead of <i>comparing</i> s[l] and s[r] you <i>swap</i> them — and you skip non-letters exactly like Valid Palindrome skips junk.</p>`,
      `<p>Strings are immutable, so work on <code>char[] a = s.toCharArray()</code>. l = 0, r = n − 1; skip non-letters on each side with <code>Character.isLetter</code>; swap; move both inward.</p>`,
      `<p><b>Traps:</b> keep <code>l &lt; r</code> inside the skip loops; build the answer with <code>new String(a)</code>. <b>Recipe:</b> while l &lt; r: if !letter(a[l]) l++; else if !letter(a[r]) r−−; else swap(a[l], a[r]), l++, r−−.</p>`
    ],
    solution: {
      approach: `<p>Two pointers on a char array; skip non-letters; swap letters.</p>`,
      code: `
        class Solution {
            public String reverseOnlyLetters(String s) {
                char[] a = s.toCharArray();                 // mutable copy
                int l = 0, r = a.length - 1;
                while (l < r) {
                    if (!Character.isLetter(a[l])) l++;          // non-letter stays: skip
                    else if (!Character.isLetter(a[r])) r--;     // same on the right
                    else {
                        char tmp = a[l]; a[l] = a[r]; a[r] = tmp; // swap two letters
                        l++;
                        r--;
                    }
                }
                return new String(a);
            }

            public static void main(String[] args) {
                Solution sol = new Solution();
                System.out.println(sol.reverseOnlyLetters("ab-cd"));          // dc-ba
                System.out.println(sol.reverseOnlyLetters("a-bC-dEf-ghIj"));  // j-Ih-gfE-dCba
            }
        }`,
      dry: {
        head: ['l', 'r', 'a[l]', 'a[r]', 'action', 'array'],
        rows: [
          ['0', '4', 'a', 'd', 'swap', 'd b - c a'],
          ['1', '3', 'b', 'c', 'swap', 'd c - b a'],
          ['2', '2', '-', '-', 'l = r → stop', '<span class="c-g">"dc-ba"</span>']
        ]
      },
      complexity: `<p><b>Time O(N)</b> — each pointer crosses the string once. <b>Space O(N)</b> for the char array (the output itself).</p>`,
      followUps: ['Reverse only the vowels (LeetCode 345).', 'Reverse each word in place but keep word order.']
    }
  });

  practice.push({
    title: 'Longest Common Prefix',
    level: 'Easy',
    tags: ['string', 'vertical scan'],
    companies: ['Google', 'Amazon', 'Adobe'],
    statement: `<p>Given an array of strings <code>strs</code>, return the longest prefix shared by <b>all</b> of them. If there is none, return the empty string <code>""</code>.</p>`,
    constraints: `1 ≤ strs.length ≤ 200; 0 ≤ |strs[i]| ≤ 200; lowercase English letters.`,
    example: `${H.table(['col', '0', '1', '2'], [['flower', '<span class="c-g">f</span>', '<span class="c-g">l</span>', '<span class="c-r">o</span>'], ['flow', '<span class="c-g">f</span>', '<span class="c-g">l</span>', '<span class="c-r">o</span>'], ['flight', '<span class="c-g">f</span>', '<span class="c-g">l</span>', '<span class="c-r">i</span>']])}
      <p>Columns 0 and 1 agree everywhere; column 2 has o, o, ${H.c('r', 'i')} → stop. Output <b class="c-g">"fl"</b>. ["dog", "racecar", "car"] → "".</p>`,
    brute: {
      why: `<p>Try every prefix of strs[0] from longest to shortest and test it against all strings with <code>startsWith</code>: up to L prefixes × N strings × L chars = O(N·L<sup>2</sup>). The wasted work: each candidate re-checks the characters the previous candidate already verified.</p>`,
      code: `
        String lcpBrute(String[] strs) {
            for (int len = strs[0].length(); len > 0; len--) {
                String p = strs[0].substring(0, len);
                boolean ok = true;
                for (String s : strs) if (!s.startsWith(p)) { ok = false; break; }
                if (ok) return p;
            }
            return "";
        }`
    },
    mcq: {
      q: 'Scanning column by column, when must you stop?',
      options: ['When any string ends OR any string has a different char in this column', 'Only when the first string ends', 'After checking all columns of the longest string', 'When two strings are equal'],
      answer: 0,
      explain: 'The prefix can never be longer than the shortest string, and one disagreeing character ends it. Either condition stops the scan.'
    },
    hints: [
      `<p><b>Aha:</b> stack the strings vertically; the answer is the number of leading columns where every row has the same character.</p>`,
      `<p>For column i = 0, 1, …: let c = strs[0].charAt(i); for every other string, if it is too short or has a different char at i, return <code>strs[0].substring(0, i)</code>.</p>`,
      `<p><b>Traps:</b> check <code>i &lt; s.length()</code> before charAt; an empty string in the input makes the answer ""; a single string is its own prefix. <b>Recipe:</b> for i over strs[0]: for s in strs: if i == len(s) or s[i] ≠ strs[0][i]: return prefix of length i. Return strs[0].</p>`
    ],
    solution: {
      approach: `<p>Vertical scanning: compare column i across all strings, stop at the first disagreement or the first string that ends.</p>`,
      code: `
        class Solution {
            public String longestCommonPrefix(String[] strs) {
                String first = strs[0];
                for (int i = 0; i < first.length(); i++) {
                    char c = first.charAt(i);
                    for (int k = 1; k < strs.length; k++) {
                        // string too short or different char -> the prefix ends before column i
                        if (i == strs[k].length() || strs[k].charAt(i) != c) {
                            return first.substring(0, i);
                        }
                    }
                }
                return first;                                  // every column of strs[0] matched
            }

            public static void main(String[] args) {
                Solution sol = new Solution();
                System.out.println(sol.longestCommonPrefix(new String[]{"flower", "flow", "flight"})); // fl
                System.out.println("[" + sol.longestCommonPrefix(new String[]{"dog", "racecar", "car"}) + "]"); // []
            }
        }`,
      dry: {
        head: ['column i', 'c = strs[0][i]', 'flow[i]', 'flight[i]', 'result'],
        rows: [
          ['0', 'f', 'f', 'f', 'all match'],
          ['1', 'l', 'l', 'l', 'all match'],
          ['2', 'o', 'o', '<span class="c-r">i</span>', '<span class="c-g">return "fl"</span>']
        ]
      },
      complexity: `<p><b>Time O(S)</b> where S = total characters examined (≤ N × length of the shortest string). <b>Space O(1)</b> besides the output.</p>`,
      followUps: ['Many queries "LCP of strs[i] and strs[j]" → sort, or build a Trie (Heaps & Tries module).', 'Binary search on the prefix length + hashing for very long strings.']
    }
  });

  practice.push({
    title: 'Find the Index of the First Occurrence (strStr) — with KMP',
    level: 'Easy',
    tags: ['kmp', 'string matching'],
    companies: ['Microsoft', 'Meta', 'Apple'],
    statement: `<p>Given two strings <code>haystack</code> and <code>needle</code>, return the index of the first occurrence of <code>needle</code> in <code>haystack</code>, or <code>-1</code> if it is not part of it. Solve it in O(n + m) worst case (no <code>indexOf</code>).</p>`,
    constraints: `1 ≤ |haystack|, |needle| ≤ 10<sup>4</sup>; lowercase English letters.`,
    example: `${H.arr('sadbutsad'.split(''), { hl: { 0: 'g', 1: 'g', 2: 'g', 6: 'b', 7: 'b', 8: 'b' } })}
      <p>needle = "sad" occurs at ${H.c('g', '0')} and ${H.c('b', '6')}; the <b>first</b> is <b>0</b>. haystack = "leetcode", needle = "leeto" → <b>-1</b>.</p>`,
    brute: {
      why: `<p>Check every start i with an inner loop over the needle: O(n·m) = 10<sup>8</sup> in the worst case ("aaaa…a" vs "aaa…ab"). The wasted work: after a long partial match fails, the next attempt re-reads almost the same characters.</p>`,
      code: `
        int strStrBrute(String h, String nd) {
            for (int i = 0; i + nd.length() <= h.length(); i++) {
                int k = 0;
                while (k < nd.length() && h.charAt(i + k) == nd.charAt(k)) k++;
                if (k == nd.length()) return i;
            }
            return -1;
        }`
    },
    mcq: {
      q: 'In KMP, once <code>j == m</code> (full match) in this problem, what should you do?',
      options: ['Set j = lps[m − 1] and continue', 'Return i − m immediately', 'Return i', 'Restart with i = i − m + 1'],
      answer: 1,
      explain: 'We only need the <b>first</b> occurrence. When j reaches m, the text pointer i is one past the match, so the match started at i − m.'
    },
    hints: [
      `<p><b>Aha:</b> this is exactly KMP search with an early exit at the first full match.</p>`,
      `<p>Build lps for the needle (pointers i, len), then scan the haystack with i (text) and j (needle). Match → i++, j++; mismatch with j &gt; 0 → j = lps[j − 1]; else i++.</p>`,
      `<p><b>Traps:</b> the moment j == m return <code>i − m</code> (i has already advanced); needle longer than haystack → −1. <b>Recipe:</b> lps = build(needle); i = j = 0; while i &lt; n: if h[i]==nd[j]: i++, j++, if j==m return i−m; else if j &gt; 0: j = lps[j−1]; else i++. Return −1.</p>`
    ],
    solution: {
      approach: `<p>KMP: O(m) LPS build + O(n) single forward scan, stop at the first full match.</p>`,
      code: `
        class Solution {
            public int strStr(String haystack, String needle) {
                int n = haystack.length(), m = needle.length();
                int[] lps = new int[m];
                for (int i = 1, len = 0; i < m; ) {               // build LPS of the needle
                    if (needle.charAt(i) == needle.charAt(len)) lps[i++] = ++len;
                    else if (len > 0) len = lps[len - 1];
                    else lps[i++] = 0;
                }
                int i = 0, j = 0;                                  // i -> haystack, j -> needle
                while (i < n) {
                    if (haystack.charAt(i) == needle.charAt(j)) {
                        i++;
                        j++;
                        if (j == m) return i - m;                  // first full match
                    } else if (j > 0) {
                        j = lps[j - 1];                            // reuse matched border
                    } else {
                        i++;
                    }
                }
                return -1;
            }

            public static void main(String[] args) {
                Solution sol = new Solution();
                System.out.println(sol.strStr("sadbutsad", "sad"));  // 0
                System.out.println(sol.strStr("leetcode", "leeto")); // -1
                System.out.println(sol.strStr("aaaaab", "aab"));     // 3
            }
        }`,
      dry: {
        head: ['i', 'j', 'h[i]', 'nd[j]', 'action (needle "aab", lps [0,1,0])'],
        rows: [
          ['0', '0', 'a', 'a', 'match → i=1, j=1'],
          ['1', '1', 'a', 'a', 'match → i=2, j=2'],
          ['2', '2', 'a', 'b', 'mismatch → j = lps[1] = 1 (keep one "a")'],
          ['2', '1', 'a', 'a', 'match → i=3, j=2'],
          ['3', '2', 'a', 'b', 'mismatch → j = 1'],
          ['3', '1', 'a', 'a', 'match → i=4, j=2'],
          ['4', '2', 'a', 'b', 'mismatch → j = 1; then a = a → i=5, j=2'],
          ['5', '2', 'b', 'b', '<span class="c-g">match → j = 3 = m → return 6 − 3 = 3</span>']
        ]
      },
      complexity: `<p><b>Time O(n + m)</b> worst case. <b>Space O(m)</b> for lps.</p>`,
      followUps: ['Return all occurrences (keep going with j = lps[m − 1]).', 'Compare with Rabin-Karp and Z — which would you code under time pressure?']
    }
  });

  practice.push({
    title: 'Rotate String',
    level: 'Easy',
    tags: ['kmp', 'string matching', 'rotation'],
    companies: ['Amazon', 'Microsoft'],
    statement: `<p>Given strings <code>s</code> and <code>goal</code>, return <code>true</code> if <code>s</code> can become <code>goal</code> after some number of <b>shifts</b>. A shift moves the leftmost character to the right end ("abcde" → "bcdea").</p>`,
    constraints: `1 ≤ |s|, |goal| ≤ 10<sup>5</sup> (the original problem allows 100; we want a linear solution); lowercase letters.`,
    example: `${H.arr('abcdeabcde'.split(''), { label: 's + s', hl: { 2: 'g', 3: 'g', 4: 'g', 5: 'g', 6: 'g' } })}
      <p>s = "abcde", goal = "cdeab": every rotation of s is a window of length n inside <b>s + s</b>, and "cdeab" sits at index 2 → <b class="c-g">true</b>. goal = "abced" → not in s + s → <b class="c-r">false</b>.</p>`,
    brute: {
      why: `<p>Generate all n rotations (each a new O(n) String) and compare each with goal: O(n<sup>2</sup>) = 10<sup>10</sup> for n = 10<sup>5</sup>. The wasted work: building rotation strings that already exist as windows of s + s.</p>`,
      code: `
        boolean rotateBrute(String s, String goal) {
            if (s.length() != goal.length()) return false;
            for (int k = 0; k < s.length(); k++) {
                String rot = s.substring(k) + s.substring(0, k);   // O(n) new string
                if (rot.equals(goal)) return true;
            }
            return false;
        }`
    },
    mcq: {
      q: 'Why does searching for goal inside <code>s + s</code> work?',
      options: ['Because s + s is sorted', 'Because every rotation of s appears as a length-n window of s + s', 'Because it doubles the hash', 'It only works for palindromes'],
      answer: 1,
      explain: 'Rotation by k = s[k..] + s[..k), which is exactly (s + s)[k .. k + n). So "is goal a rotation?" becomes "does goal occur in s + s?" — a pattern-matching question.'
    },
    hints: [
      `<p><b>Aha:</b> write s twice: "abcdeabcde". Every rotation is sitting inside it as a window of length n.</p>`,
      `<p>Check lengths first, then run any linear matcher (KMP from this module) for goal inside s + s.</p>`,
      `<p><b>Traps:</b> different lengths → false (otherwise "ab" would match inside "abcabc"); use KMP for guaranteed O(n). <b>Recipe:</b> if |s| ≠ |goal| return false; return kmpFind(s + s, goal) ≥ 0.</p>`
    ],
    solution: {
      approach: `<p>Length check + KMP search of goal in s + s.</p>`,
      code: `
        class Solution {
            public boolean rotateString(String s, String goal) {
                if (s.length() != goal.length()) return false;
                return kmpFind(s + s, goal) >= 0;       // rotation <=> goal occurs in s+s
            }

            private int kmpFind(String t, String p) {
                int m = p.length();
                int[] lps = new int[m];
                for (int i = 1, len = 0; i < m; ) {
                    if (p.charAt(i) == p.charAt(len)) lps[i++] = ++len;
                    else if (len > 0) len = lps[len - 1];
                    else lps[i++] = 0;
                }
                for (int i = 0, j = 0; i < t.length(); ) {
                    if (t.charAt(i) == p.charAt(j)) {
                        i++;
                        j++;
                        if (j == m) return i - m;
                    } else if (j > 0) j = lps[j - 1];
                    else i++;
                }
                return -1;
            }

            public static void main(String[] args) {
                Solution sol = new Solution();
                System.out.println(sol.rotateString("abcde", "cdeab")); // true
                System.out.println(sol.rotateString("abcde", "abced")); // false
            }
        }`,
      dry: {
        head: ['step', 'value', 'note'],
        rows: [
          ['length check', '5 == 5', 'continue'],
          ['s + s', '"abcdeabcde"', 'all 5 rotations live inside'],
          ['KMP for "cdeab"', 'found at 2', '<span class="c-g">true</span>']
        ]
      },
      complexity: `<p><b>Time O(n)</b>, <b>Space O(n)</b> for s + s and lps.</p>`,
      followUps: ['Find the minimum number of shifts (the first match index).', 'Lexicographically smallest rotation (Booth\'s algorithm / Duval).']
    }
  });

  // =====================================================================
  // PRACTICE — Medium
  // =====================================================================
  practice.push({
    title: 'Find All Anagrams in a String',
    level: 'Medium',
    tags: ['sliding window', 'char counting'],
    companies: ['Amazon', 'Meta', 'Uber'],
    statement: `<p>Given strings <code>s</code> and <code>p</code>, return all start indices of substrings of <code>s</code> that are <b>anagrams</b> of <code>p</code> (same letters, same counts). Any order is fine.</p>`,
    constraints: `1 ≤ |s|, |p| ≤ 3·10<sup>4</sup>; lowercase English letters.`,
    example: `${H.arr('cbaebabacd'.split(''), { hl: { 0: 'g', 1: 'g', 2: 'g', 6: 'b', 7: 'b', 8: 'b' } })}
      <p>p = "abc" → <b>[0, 6]</b>: ${H.c('g', '"cba"')} at 0 and ${H.c('b', '"bac"')} at 6 both use one a, one b, one c.</p>`,
    brute: {
      why: `<p>For each of the n − m + 1 windows, sort it (or count it from scratch) and compare with p: O(n·m log m) or O(n·m). With n = m/2 … 3·10<sup>4</sup> that is up to ~10<sup>8</sup>–10<sup>9</sup>. The wasted work: neighbouring windows share m − 1 letters, yet we recount all of them.</p>`,
      code: `
        List<Integer> findAnagramsBrute(String s, String p) {
            List<Integer> res = new ArrayList<>();
            char[] target = p.toCharArray();
            Arrays.sort(target);
            for (int i = 0; i + p.length() <= s.length(); i++) {
                char[] w = s.substring(i, i + p.length()).toCharArray();
                Arrays.sort(w);                                  // O(m log m) per window
                if (Arrays.equals(w, target)) res.add(i);
            }
            return res;
        }`
    },
    mcq: {
      q: 'The window slides from s[i..i+m−1] to s[i+1..i+m]. How do you update the window counts?',
      options: ['Recount all m letters', 'cnt[s[i+m]]++ and cnt[s[i]]−− — one letter enters, one leaves', 'Sort the new window', 'Clear the counts every time'],
      answer: 1,
      explain: 'A fixed-size sliding window changes by exactly one letter on each side, so two O(1) updates keep the counts correct.'
    },
    hints: [
      `<p><b>Aha:</b> "anagram of p" = "same letter counts as p". A window of fixed length |p| sliding over s only changes by one letter in and one letter out.</p>`,
      `<p>Two <code>int[26]</code> arrays: need (counts of p) and win (counts of the current window). After each slide, compare with <code>Arrays.equals(need, win)</code> — 26 operations, constant.</p>`,
      `<p><b>Traps:</b> if |p| &gt; |s| return empty; record the start index i − m + 1 once the window is full. <b>Recipe:</b> count p; for i in 0..n−1: win[s[i]]++; if i ≥ m: win[s[i−m]]−−; if i ≥ m−1 and win == need: add i−m+1.</p>`
    ],
    solution: {
      approach: `<p>Fixed-size sliding window with two 26-slot count arrays.</p>`,
      code: `
        class Solution {
            public List<Integer> findAnagrams(String s, String p) {
                List<Integer> res = new ArrayList<>();
                int n = s.length(), m = p.length();
                if (m > n) return res;
                int[] need = new int[26], win = new int[26];
                for (int k = 0; k < m; k++) need[p.charAt(k) - 'a']++;
                for (int i = 0; i < n; i++) {
                    win[s.charAt(i) - 'a']++;                    // letter enters on the right
                    if (i >= m) win[s.charAt(i - m) - 'a']--;    // letter leaves on the left
                    if (i >= m - 1 && Arrays.equals(need, win)) {
                        res.add(i - m + 1);                      // window start
                    }
                }
                return res;
            }

            public static void main(String[] args) {
                System.out.println(new Solution().findAnagrams("cbaebabacd", "abc")); // [0, 6]
                System.out.println(new Solution().findAnagrams("abab", "ab"));        // [0, 1, 2]
            }
        }`,
      dry: {
        head: ['i', 'window', 'counts (a,b,c,…)', 'equal to need?', 'res'],
        rows: [
          ['2', 'cba', 'a1 b1 c1', '<span class="c-g">yes</span>', '[0]'],
          ['3', 'bae', 'a1 b1 e1', 'no', '[0]'],
          ['4', 'aeb', 'a1 b1 e1', 'no', '[0]'],
          ['5', 'eba', 'a1 b1 e1', 'no', '[0]'],
          ['6', 'bab', 'a1 b2', 'no', '[0]'],
          ['7', 'aba', 'a2 b1', 'no', '[0]'],
          ['8', 'bac', 'a1 b1 c1', '<span class="c-g">yes</span>', '[0, 6]'],
          ['9', 'acd', 'a1 c1 d1', 'no', '<span class="c-p">[0, 6]</span>']
        ]
      },
      complexity: `<p><b>Time O(26·n) = O(n)</b>. <b>Space O(1)</b> (two arrays of 26). Optimisation: keep a counter of how many of the 26 slots match to make each step O(1).</p>`,
      followUps: ['Permutation in String (LeetCode 567) — just return true at the first hit.', 'Minimum Window Substring — variable-size window with the same counting.']
    }
  });

  practice.push({
    title: 'Group Anagrams',
    level: 'Medium',
    tags: ['hashing', 'char counting', 'stringbuilder'],
    companies: ['Amazon', 'Google', 'Meta', 'Microsoft'],
    statement: `<p>Given an array of strings, group the anagrams together. Return the groups in any order.</p>`,
    constraints: `1 ≤ strs.length ≤ 10<sup>4</sup>; 0 ≤ |strs[i]| ≤ 100; lowercase English letters.`,
    example: `<p>["eat","tea","tan","ate","nat","bat"] → [${H.c('g', '["eat","tea","ate"]')}, ${H.c('b', '["tan","nat"]')}, ${H.c('p', '["bat"]')}]</p>
      ${H.kv([['a1e1t1', 'eat, tea, ate'], ['a1n1t1', 'tan, nat'], ['a1b1t1', 'bat']], { label: 'key → group', hl: { a1e1t1: 'g', a1n1t1: 'b', a1b1t1: 'p' } })}`,
    brute: {
      why: `<p>Compare every pair of words with an anagram check and union them: O(N<sup>2</sup>·L) ≈ 10<sup>8</sup>·100 = 10<sup>10</sup>. The wasted work: words in the same family are re-compared many times. A canonical <b>key</b> per word lets a HashMap group them in one pass.</p>`,
      code: `
        List<List<String>> groupBrute(String[] strs) {
            List<List<String>> res = new ArrayList<>();
            boolean[] used = new boolean[strs.length];
            for (int i = 0; i < strs.length; i++) {
                if (used[i]) continue;
                List<String> g = new ArrayList<>(List.of(strs[i]));
                used[i] = true;
                for (int j = i + 1; j < strs.length; j++) {
                    if (!used[j] && sameLetters(strs[i], strs[j])) { g.add(strs[j]); used[j] = true; }
                }
                res.add(g);
            }
            return res;
        }

        boolean sameLetters(String a, String b) {
            if (a.length() != b.length()) return false;
            int[] c = new int[26];
            for (int k = 0; k < a.length(); k++) { c[a.charAt(k) - 'a']++; c[b.charAt(k) - 'a']--; }
            for (int x : c) if (x != 0) return false;
            return true;
        }`
    },
    mcq: {
      q: 'Which is a correct HashMap key that is identical for all anagrams?',
      options: ['The word itself', 'The sorted letters, or the 26 counts written as a string like "a1e1t1"', 'The word length', 'The first letter'],
      answer: 1,
      explain: 'Anagrams have the same multiset of letters. Sorting them, or writing their 26 counts, produces the same canonical form for every member of the family and a different one for any other family.'
    },
    hints: [
      `<p><b>Aha:</b> give each word a "fingerprint" that ignores order — then all anagrams share it and a HashMap groups them automatically.</p>`,
      `<p>Fingerprint = counts of 26 letters. Build it with a <code>StringBuilder</code> (e.g. append each count followed by '#'), use it as the key of <code>HashMap&lt;String, List&lt;String&gt;&gt;</code>, and <code>computeIfAbsent</code> to add the word.</p>`,
      `<p><b>Traps:</b> separate counts with a delimiter ("1#11#" vs "11#1#" must differ); the empty string is a valid word with all-zero key. <b>Recipe:</b> for each word: cnt[26]; key = join counts with '#'; map[key].add(word). Return map values.</p>`
    ],
    solution: {
      approach: `<p>Canonical count key per word built with a StringBuilder; HashMap from key to group.</p>`,
      code: `
        class Solution {
            public List<List<String>> groupAnagrams(String[] strs) {
                Map<String, List<String>> groups = new HashMap<>();
                for (String w : strs) {
                    int[] cnt = new int[26];
                    for (int i = 0; i < w.length(); i++) cnt[w.charAt(i) - 'a']++;
                    StringBuilder key = new StringBuilder();
                    for (int c : cnt) key.append(c).append('#');   // e.g. "1#0#0#0#1#...": order-free fingerprint
                    groups.computeIfAbsent(key.toString(), k -> new ArrayList<>()).add(w);
                }
                return new ArrayList<>(groups.values());
            }

            public static void main(String[] args) {
                List<List<String>> g = new Solution().groupAnagrams(new String[]{"eat", "tea", "tan", "ate", "nat", "bat"});
                System.out.println(g.size() + " groups: " + g);   // 3 groups (order may vary)
            }
        }`,
      dry: {
        head: ['word', 'counts', 'key exists?', 'groups'],
        rows: [
          ['eat', 'a1 e1 t1', 'no → new', '{aet: [eat]}'],
          ['tea', 'a1 e1 t1', 'yes', '{aet: [eat, tea]}'],
          ['tan', 'a1 n1 t1', 'no → new', '{aet: [eat, tea], ant: [tan]}'],
          ['ate', 'a1 e1 t1', 'yes', 'aet: [eat, tea, ate]'],
          ['nat', 'a1 n1 t1', 'yes', 'ant: [tan, nat]'],
          ['bat', 'a1 b1 t1', 'no → new', '<span class="c-p">3 groups</span>']
        ]
      },
      complexity: `<p><b>Time O(N·L)</b> (count each word, key has 26 parts). Sorting keys would be O(N·L log L). <b>Space O(N·L)</b> for the map.</p>`,
      followUps: ['Unicode words → sort code points for the key.', 'Stream of words arriving one by one — same map, incremental.']
    }
  });

  practice.push({
    title: 'String to Integer (atoi)',
    level: 'Medium',
    tags: ['char arithmetic', 'parsing', 'overflow'],
    companies: ['Amazon', 'Microsoft', 'Bloomberg', 'Goldman Sachs'],
    statement: `<p>Implement <code>myAtoi(s)</code>: skip leading spaces; read an optional '+' or '-'; read digits until a non-digit or the end; convert them to a 32-bit signed integer; if the value is out of range, <b>clamp</b> to [−2<sup>31</sup>, 2<sup>31</sup> − 1]. If no digits are read the result is 0.</p>`,
    constraints: `0 ≤ |s| ≤ 200; s has English letters, digits, ' ', '+', '-' and '.'.`,
    example: `${H.table(['input', 'reading', 'output'], [['"   -42"', 'skip spaces, sign −, digits 4 2', '<b>-42</b>'], ['"4193 with words"', 'digits 4 1 9 3, stop at space', '<b>4193</b>'], ['"words 987"', 'first char is a letter → no digits', '<b>0</b>'], ['"-91283472332"', 'too small', '<b>-2147483648</b> (clamped)']])}`,
    brute: {
      why: `<p>Extract the digit substring and call <code>Long.parseLong</code>, then clamp. It breaks on long digit strings (more than 19 digits overflow even a long and throw NumberFormatException), and hides the overflow logic interviewers want to see. The wasted/risky part: building a substring and trusting a library for out-of-range input.</p>`,
      code: `
        int atoiBrute(String s) {
            s = s.trim();
            if (s.isEmpty()) return 0;
            int i = 0;
            String sign = "";
            if (s.charAt(0) == '-' || s.charAt(0) == '+') { sign = s.substring(0, 1); i = 1; }
            int j = i;
            while (j < s.length() && Character.isDigit(s.charAt(j))) j++;
            if (j == i) return 0;
            long v = Long.parseLong(sign + s.substring(i, j));   // throws for > 19 digits!
            return (int) Math.max(Integer.MIN_VALUE, Math.min(Integer.MAX_VALUE, v));
        }`
    },
    mcq: {
      q: 'Before doing <code>res = res * 10 + d</code> (res is an int, positive), which check prevents overflow?',
      options: ['res &lt; 0', 'res &gt; (Integer.MAX_VALUE − d) / 10', 'd &gt; 9', 'res * 10 &gt; Integer.MAX_VALUE'],
      answer: 1,
      explain: 'res·10 + d ≤ MAX ⇔ res ≤ (MAX − d)/10. Checking <code>res * 10 &gt; MAX</code> is useless because the multiplication itself already overflowed.'
    },
    hints: [
      `<p><b>Aha:</b> it is a tiny state machine — spaces → sign → digits → stop. Each digit is <code>c - '0'</code> and is added with <code>res = res * 10 + d</code>.</p>`,
      `<p>Keep <code>sign</code> (±1) and a non-negative <code>int res</code>. Before adding a digit, test <code>res &gt; (Integer.MAX_VALUE - d) / 10</code>; if true, return MAX or MIN depending on the sign.</p>`,
      `<p><b>Traps:</b> only one sign allowed ("+-12" → 0); stop at the first non-digit; "-2147483648" must return MIN exactly (the clamp handles it); empty or all-space input → 0. <b>Recipe:</b> i skips spaces; read sign; while digit: d = c − '0'; if overflow → clamp; res = res·10 + d. Return sign·res.</p>`
    ],
    solution: {
      approach: `<p>Linear scan with char arithmetic and an overflow test before every multiply.</p>`,
      code: `
        class Solution {
            public int myAtoi(String s) {
                int i = 0, n = s.length();
                while (i < n && s.charAt(i) == ' ') i++;              // 1) skip leading spaces
                int sign = 1;
                if (i < n && (s.charAt(i) == '+' || s.charAt(i) == '-')) {
                    sign = s.charAt(i) == '-' ? -1 : 1;               // 2) optional sign
                    i++;
                }
                int res = 0;
                while (i < n && Character.isDigit(s.charAt(i))) {     // 3) digits
                    int d = s.charAt(i) - '0';                        // char -> digit value
                    if (res > (Integer.MAX_VALUE - d) / 10) {         // res*10+d would overflow
                        return sign == 1 ? Integer.MAX_VALUE : Integer.MIN_VALUE;
                    }
                    res = res * 10 + d;
                    i++;
                }
                return sign * res;
            }

            public static void main(String[] args) {
                Solution sol = new Solution();
                System.out.println(sol.myAtoi("   -42"));           // -42
                System.out.println(sol.myAtoi("4193 with words"));  // 4193
                System.out.println(sol.myAtoi("words 987"));        // 0
                System.out.println(sol.myAtoi("-91283472332"));     // -2147483648
            }
        }`,
      dry: {
        head: ['char', 'state', 'd', 'res', 'note'],
        rows: [
          ['␣ ␣ ␣', 'spaces', '—', '0', 'skipped'],
          ['-', 'sign', '—', '0', 'sign = −1'],
          ['4', 'digits', '4', '4', '0·10 + 4'],
          ['2', 'digits', '2', '42', '4·10 + 2'],
          ['end', 'stop', '—', '42', '<span class="c-g">return −42</span>']
        ]
      },
      complexity: `<p><b>Time O(n)</b>, <b>Space O(1)</b>.</p>`,
      followUps: ['Parse a 64-bit long the same way.', 'Handle decimal points / exponents (a full number parser state machine).']
    }
  });

  practice.push({
    title: 'Multiply Strings',
    level: 'Medium',
    tags: ['char arithmetic', 'simulation', 'stringbuilder'],
    companies: ['Meta', 'Amazon', 'Microsoft', 'Twitter'],
    statement: `<p>Given two non-negative integers <code>num1</code> and <code>num2</code> as strings, return their product as a string. You may not convert the inputs to integers directly or use BigInteger.</p>`,
    constraints: `1 ≤ |num1|, |num2| ≤ 200; digits only; no leading zeros except the number 0 itself.`,
    example: `${H.table(['', '', '1', '2', '3'], [['', '×', '', '4', '5'], ['', '', '6', '1', '5'], ['', '4', '9', '2', ''], ['', '<b>5</b>', '<b>5</b>', '<b>3</b>', '<b>5</b>']])}
      <p>"123" × "45" = <b>"5535"</b>. Key fact: digit i of num1 times digit j of num2 lands in result position <b>i + j + 1</b> (with carry going to i + j).</p>`,
    brute: {
      why: `<p>Repeated addition (add num1 to itself num2 times) is O(value) — impossible for 200-digit numbers. Converting to <code>long</code> overflows beyond 19 digits. We need schoolbook multiplication on digit arrays: O(n·m).</p>`,
      code: `
        String multiplyBrute(String a, String b) {
            // only works while the product fits in a long (about 18 digits) -> wrong for big inputs
            long x = Long.parseLong(a), y = Long.parseLong(b);
            return String.valueOf(x * y);
        }`
    },
    mcq: {
      q: 'num1[i] × num2[j] (0-based from the left, lengths n and m) contributes to which slots of a result array of size n + m?',
      options: ['i and j', 'i + j (carry) and i + j + 1 (ones digit)', 'n − i and m − j', 'Only slot 0'],
      answer: 1,
      explain: 'The product has at most n + m digits. Position i + j + 1 receives the units of the partial product and position i + j receives the carry.'
    },
    hints: [
      `<p><b>Aha:</b> do grade-school multiplication, but store every partial product in an <code>int[n + m]</code> at the right place instead of writing shifted rows.</p>`,
      `<p>Loop i from n−1 down, j from m−1 down: <code>mul = (num1[i]−'0')·(num2[j]−'0')</code>; <code>sum = mul + pos[i+j+1]</code>; <code>pos[i+j+1] = sum % 10</code>; <code>pos[i+j] += sum / 10</code>.</p>`,
      `<p><b>Traps:</b> skip leading zeros when building the answer with a StringBuilder; if everything is zero return "0". <b>Recipe:</b> fill pos as above; sb = digits of pos skipping leading zeros; return sb empty ? "0" : sb.</p>`
    ],
    solution: {
      approach: `<p>Schoolbook multiplication into a position array, then build the string with a StringBuilder.</p>`,
      code: `
        class Solution {
            public String multiply(String num1, String num2) {
                int n = num1.length(), m = num2.length();
                int[] pos = new int[n + m];                         // product has at most n+m digits
                for (int i = n - 1; i >= 0; i--) {
                    for (int j = m - 1; j >= 0; j--) {
                        int mul = (num1.charAt(i) - '0') * (num2.charAt(j) - '0');
                        int sum = mul + pos[i + j + 1];             // add to what is already there
                        pos[i + j + 1] = sum % 10;                  // ones digit stays
                        pos[i + j] += sum / 10;                     // carry moves left
                    }
                }
                StringBuilder sb = new StringBuilder();
                for (int d : pos) {
                    if (sb.length() == 0 && d == 0) continue;       // skip leading zeros
                    sb.append(d);
                }
                return sb.length() == 0 ? "0" : sb.toString();
            }

            public static void main(String[] args) {
                Solution sol = new Solution();
                System.out.println(sol.multiply("123", "45"));  // 5535
                System.out.println(sol.multiply("0", "52"));    // 0
                System.out.println(sol.multiply("99", "99"));   // 9801
            }
        }`,
      dry: {
        head: ['i, j', 'digits', 'mul', 'pos after (index 0..4)'],
        rows: [
          ['2, 1', '3 × 5', '15', '[0, 0, 0, 1, 5]'],
          ['2, 0', '3 × 4', '12', '[0, 0, 1, 3, 5]'],
          ['1, 1', '2 × 5', '10', '[0, 0, 2, 3, 5]'],
          ['1, 0', '2 × 4', '8', '[0, 1, 0, 3, 5]'],
          ['0, 1', '1 × 5', '5', '[0, 1, 0, 3, 5] → pos[2] = 5, carry 0 → [0, 1, 5, 3, 5]'],
          ['0, 0', '1 × 4', '4', '[0, 5, 5, 3, 5] → <span class="c-g">"5535"</span>']
        ]
      },
      complexity: `<p><b>Time O(n·m)</b>, <b>Space O(n + m)</b>. (Karatsuba / FFT multiply faster for huge numbers — that is what BigInteger does for very large inputs.)</p>`,
      followUps: ['Add Strings / Add Binary (same carry idea, O(n)).', 'Divide a big number string by a small int.']
    }
  });

  practice.push({
    title: 'Count and Say',
    level: 'Medium',
    tags: ['stringbuilder', 'run-length encoding', 'simulation'],
    companies: ['Meta', 'Apple', 'Amazon'],
    statement: `<p>The count-and-say sequence starts with "1". Each next term <b>describes</b> the previous one by reading runs of equal digits: "1" → one 1 → "11" → two 1s → "21" → one 2, one 1 → "1211" … Given n, return the n-th term.</p>`,
    constraints: `1 ≤ n ≤ 30 (terms grow ~30% per step; term 30 has about 4 400 characters).`,
    example: `${H.table(['n', 'term', 'read aloud'], [['1', '1', '—'], ['2', '11', 'one 1'], ['3', '21', 'two 1s'], ['4', '<b class="c-g">1211</b>', 'one 2, one 1'], ['5', '111221', 'one 1, one 2, two 1s']])}`,
    brute: {
      why: `<p>Same simulation but building each term with <code>next += count + digit</code>. Terms reach thousands of characters and each += copies the whole term-so-far → quadratic per term. The wasted work is re-copying; with StringBuilder each term costs O(length).</p>`,
      code: `
        String countAndSayBrute(int n) {
            String cur = "1";
            for (int t = 1; t < n; t++) {
                String next = "";
                int i = 0;
                while (i < cur.length()) {
                    int j = i;
                    while (j < cur.length() && cur.charAt(j) == cur.charAt(i)) j++;
                    next += (j - i) + "" + cur.charAt(i);   // full copy each time
                    i = j;
                }
                cur = next;
            }
            return cur;
        }`
    },
    mcq: {
      q: 'Reading "111221": what are the runs?',
      options: ['1, 1, 1, 2, 2, 1', '"111", "22", "1" → three 1s, two 2s, one 1 → "312211"', '"11", "1221"', '"1112", "21"'],
      answer: 1,
      explain: 'A run is a maximal block of equal neighbours. "111" + "22" + "1" → "31" + "22" + "11" = "312211".'
    },
    hints: [
      `<p><b>Aha:</b> each step is run-length encoding (the String Compression problem in Topic 3) with the count written <b>before</b> the digit.</p>`,
      `<p>Loop n − 1 times; inside, two pointers i (run start) and j (run end) over the current term; append <code>(j − i)</code> then the digit to a StringBuilder.</p>`,
      `<p><b>Traps:</b> n = 1 → "1"; use a fresh StringBuilder per term; do not use +=. <b>Recipe:</b> cur = "1"; repeat n−1 times: sb = new; for each run [i, j): sb.append(j−i).append(cur[i]); cur = sb.toString().</p>`
    ],
    solution: {
      approach: `<p>Iterative run-length encoding with two pointers and a StringBuilder.</p>`,
      code: `
        class Solution {
            public String countAndSay(int n) {
                String cur = "1";
                for (int t = 1; t < n; t++) {
                    StringBuilder sb = new StringBuilder();
                    int i = 0;
                    while (i < cur.length()) {
                        int j = i;
                        while (j < cur.length() && cur.charAt(j) == cur.charAt(i)) j++;  // end of run
                        sb.append(j - i).append(cur.charAt(i));                          // count, then digit
                        i = j;
                    }
                    cur = sb.toString();
                }
                return cur;
            }

            public static void main(String[] args) {
                Solution sol = new Solution();
                System.out.println(sol.countAndSay(4));  // 1211
                System.out.println(sol.countAndSay(6));  // 312211
            }
        }`,
      dry: {
        head: ['t', 'cur', 'runs', 'next'],
        rows: [
          ['1', '1', '"1"', '11'],
          ['2', '11', '"11"', '21'],
          ['3', '21', '"2", "1"', '<span class="c-g">1211</span>']
        ]
      },
      complexity: `<p><b>Time O(total length of all terms)</b> — each term is scanned once. <b>Space O(length of the last term)</b>.</p>`,
      followUps: ['Why can no digit greater than 3 ever appear? (Conway\'s analysis of the look-and-say sequence.)', 'Decode a run-length encoded string.']
    }
  });

  practice.push({
    title: 'Repeated DNA Sequences',
    level: 'Medium',
    tags: ['rolling hash', 'bit manipulation', 'hashset'],
    companies: ['LinkedIn', 'Amazon', 'Google'],
    statement: `<p>A DNA string uses the letters A, C, G, T. Return all <b>10-letter-long</b> substrings that occur <b>more than once</b> (each reported once, any order).</p>`,
    constraints: `1 ≤ |s| ≤ 10<sup>5</sup>; s[i] ∈ {A, C, G, T}.`,
    example: `<p>s = "AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT" → <b>["AAAAACCCCC", "CCCCCAAAAA"]</b>.</p>
      ${H.table(['letter', 'A', 'C', 'G', 'T'], [['2-bit code', '00', '01', '10', '11']])}
      <p>10 letters × 2 bits = 20 bits → each window is a single int below 2<sup>20</sup>: a <b>perfect</b> rolling hash (no collisions possible).</p>`,
    brute: {
      why: `<p>Put every 10-letter <code>substring</code> into a HashSet&lt;String&gt;: creates N strings of 10 chars and hashes each (10 operations) — O(10·N), fine here, but memory-heavy. For a general window length L it is O(N·L). The rolling-hash version makes each window O(1) and stores ints.</p>`,
      code: `
        List<String> dnaBrute(String s) {
            Set<String> seen = new HashSet<>(), rep = new HashSet<>();
            for (int i = 0; i + 10 <= s.length(); i++) {
                String w = s.substring(i, i + 10);       // new 10-char String every step
                if (!seen.add(w)) rep.add(w);
            }
            return new ArrayList<>(rep);
        }`
    },
    mcq: {
      q: 'With 2 bits per letter and a 20-bit window, how do you roll from window i to i + 1?',
      options: ['Recompute 10 letters', 'h = ((h &lt;&lt; 2) | code(new)) &amp; ((1 &lt;&lt; 20) − 1)', 'h = h + code(new)', 'h = h ^ code(new)'],
      answer: 1,
      explain: 'Shift left by 2 (base 4 multiply), OR in the new letter, and mask to 20 bits, which drops the oldest letter. This is the rolling hash with B = 4 and "mod 2<sup>20</sup>" — but exact because 4<sup>10</sup> = 2<sup>20</sup>.'
    },
    hints: [
      `<p><b>Aha:</b> only 4 letters → 2 bits each → a 10-letter window fits in 20 bits. The window's number <b>is</b> the window, so equal numbers mean equal strings.</p>`,
      `<p>Roll: <code>h = ((h &lt;&lt; 2) | code) &amp; 0xFFFFF</code>. Use a <code>HashSet&lt;Integer&gt;</code> seen and another set for already-reported windows (or a byte array of size 2<sup>20</sup> as a counter).</p>`,
      `<p><b>Traps:</b> start checking only once i ≥ 9 (window full); report each repeat once; |s| &lt; 10 → empty. <b>Recipe:</b> for i: h = roll(h, s[i]); if i ≥ 9: if h in seen and h not in added: add substring(i−9, i+1); seen.add(h).</p>`
    ],
    solution: {
      approach: `<p>2-bit rolling encoding into a 20-bit int; sets of seen and reported codes.</p>`,
      code: `
        class Solution {
            public List<String> findRepeatedDnaSequences(String s) {
                List<String> res = new ArrayList<>();
                if (s.length() < 10) return res;
                int[] code = new int[128];
                code['A'] = 0; code['C'] = 1; code['G'] = 2; code['T'] = 3;
                Set<Integer> seen = new HashSet<>(), added = new HashSet<>();
                int h = 0, mask = (1 << 20) - 1;                    // keep only the last 10 letters
                for (int i = 0; i < s.length(); i++) {
                    h = ((h << 2) | code[s.charAt(i)]) & mask;      // roll in the new letter
                    if (i >= 9) {                                   // window s[i-9..i] is full
                        if (!seen.add(h) && added.add(h)) {
                            res.add(s.substring(i - 9, i + 1));     // second time seen -> report once
                        }
                    }
                }
                return res;
            }

            public static void main(String[] args) {
                System.out.println(new Solution().findRepeatedDnaSequences("AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT"));
                // [AAAAACCCCC, CCCCCAAAAA]
            }
        }`,
      dry: {
        head: ['i', 'window', 'code (binary groups)', 'seen before?', 'res'],
        rows: [
          ['9', 'AAAAACCCCC', '00×5 01×5', 'no', '[]'],
          ['10..18', '…', 'new codes', 'no', '[]'],
          ['19', 'AAAAACCCCC', 'same as i = 9', '<span class="c-g">yes</span>', '[AAAAACCCCC]'],
          ['20', 'AAAACCCCCC', 'new', 'no', '[AAAAACCCCC]'],
          ['25', 'CCCCCAAAAA', 'same as i = 14', '<span class="c-g">yes</span>', '<span class="c-p">[AAAAACCCCC, CCCCCAAAAA]</span>']
        ]
      },
      complexity: `<p><b>Time O(N)</b>, <b>Space O(N)</b> ints (at most 2<sup>20</sup> distinct codes).</p>`,
      followUps: ['General window length L and alphabet → polynomial rolling hash mod a large prime (+ verification).', 'Longest repeated substring → binary search on L (see Longest Duplicate Substring).']
    }
  });

  practice.push({
    title: 'Repeated String Match',
    level: 'Medium',
    tags: ['kmp', 'string matching'],
    companies: ['Google', 'Amazon'],
    statement: `<p>Given strings <code>a</code> and <code>b</code>, return the minimum number of times you must repeat <code>a</code> so that <code>b</code> becomes a substring of the repeated string, or <code>-1</code> if impossible.</p>`,
    constraints: `1 ≤ |a|, |b| ≤ 10<sup>4</sup>; lowercase English letters.`,
    example: `<p>a = "abcd", b = "cdabcdab". "abcd" × 3 = "ab<b class="c-g">cdabcdab</b>cd" contains b → <b>3</b>. (× 2 = "abcdabcd" is too short to contain it.)</p>
      <p>a = "a", b = "aa" → 2. a = "abc", b = "wxyz" → −1.</p>`,
    brute: {
      why: `<p>Keep appending a and calling <code>contains</code> until the string becomes "too long" — without a clear stopping rule this can loop forever, and each contains is O(n·m) worst case. The insight: b can start anywhere inside the first copy of a, so you only ever need q = ⌈|b| / |a|⌉ or q + 1 copies.</p>`,
      code: `
        int repeatedBrute(String a, String b) {
            StringBuilder sb = new StringBuilder(a);
            for (int k = 1; k <= b.length() / a.length() + 2; k++) {   // safe upper bound
                if (sb.toString().contains(b)) return k;              // O(n*m) worst each time
                sb.append(a);
            }
            return -1;
        }`
    },
    mcq: {
      q: 'Why is q + 1 copies (q = ⌈|b|/|a|⌉) always enough if any answer exists?',
      options: ['Because b is sorted', 'Because b must start somewhere inside one copy of a; one extra copy covers any starting offset', 'Because KMP needs it', 'It is not enough; you may need 2q copies'],
      answer: 1,
      explain: 'If b occurs in a repeated a, shift the occurrence so it starts within the first copy (offset &lt; |a|). It then ends before |a| + |b| ≤ (q + 1)·|a|.'
    },
    hints: [
      `<p><b>Aha:</b> the answer is either q = ⌈|b|/|a|⌉, q + 1, or impossible — no other values need testing.</p>`,
      `<p>Build t = a repeated q + 1 times with a StringBuilder, run KMP for b once, and look at <b>where</b> the first match ends: if it ends within q copies the answer is q, else q + 1.</p>`,
      `<p><b>Traps:</b> match end index = start + |b|; needed copies = ⌈end / |a|⌉. <b>Recipe:</b> q = ceil; t = a×(q+1); pos = kmp(t, b); if pos &lt; 0 return −1; return ceil((pos + |b|) / |a|).</p>`
    ],
    solution: {
      approach: `<p>Repeat a q + 1 times, one KMP search, compute how many copies the first match spans.</p>`,
      code: `
        class Solution {
            public int repeatedStringMatch(String a, String b) {
                int q = (b.length() + a.length() - 1) / a.length();   // ceil(|b| / |a|)
                StringBuilder sb = new StringBuilder();
                for (int k = 0; k <= q; k++) sb.append(a);            // q + 1 copies
                int pos = kmpFind(sb.toString(), b);
                if (pos < 0) return -1;
                int end = pos + b.length();                            // exclusive end of the match
                return (end + a.length() - 1) / a.length();           // copies needed to cover it
            }

            private int kmpFind(String t, String p) {
                int m = p.length();
                int[] lps = new int[m];
                for (int i = 1, len = 0; i < m; ) {
                    if (p.charAt(i) == p.charAt(len)) lps[i++] = ++len;
                    else if (len > 0) len = lps[len - 1];
                    else lps[i++] = 0;
                }
                for (int i = 0, j = 0; i < t.length(); ) {
                    if (t.charAt(i) == p.charAt(j)) {
                        i++;
                        j++;
                        if (j == m) return i - m;
                    } else if (j > 0) j = lps[j - 1];
                    else i++;
                }
                return -1;
            }

            public static void main(String[] args) {
                Solution sol = new Solution();
                System.out.println(sol.repeatedStringMatch("abcd", "cdabcdab")); // 3
                System.out.println(sol.repeatedStringMatch("a", "aa"));          // 2
                System.out.println(sol.repeatedStringMatch("abc", "wxyz"));      // -1
            }
        }`,
      dry: {
        head: ['step', 'value'],
        rows: [
          ['q = ⌈8 / 4⌉', '2'],
          ['t = a × 3', '"abcdabcdabcd"'],
          ['KMP first match of "cdabcdab"', 'pos = 2'],
          ['end = 2 + 8', '10'],
          ['copies = ⌈10 / 4⌉', '<span class="c-g">3</span>']
        ]
      },
      complexity: `<p><b>Time O(|a| + |b|)</b> (t has length ≤ |b| + 2|a|). <b>Space O(|a| + |b|)</b>.</p>`,
      followUps: ['Solve it with Rabin-Karp instead.', 'What if a can also be rotated before repeating?']
    }
  });

  // =====================================================================
  // PRACTICE — Hard
  // =====================================================================
  practice.push({
    title: 'Longest Happy Prefix',
    level: 'Hard',
    tags: ['kmp', 'lps', 'prefix function'],
    companies: ['Google', 'Amazon'],
    statement: `<p>A <b>happy prefix</b> is a non-empty prefix of <code>s</code> that is also a suffix of <code>s</code>, excluding <code>s</code> itself. Return the longest happy prefix, or <code>""</code> if none exists.</p>`,
    constraints: `1 ≤ |s| ≤ 10<sup>5</sup>; lowercase English letters.`,
    example: `${H.arr('ababab'.split(''), { hl: { 0: 'b', 1: 'b', 2: 'p', 3: 'p', 4: 'g', 5: 'g' } })}
      <p>"ababab" → <b>"abab"</b>: prefix ${H.c('b', 'ab')}${H.c('p', 'ab')} (indices 0–3) equals suffix ${H.c('p', 'ab')}${H.c('g', 'ab')} (indices 2–5) — they overlap, which is allowed. "level" → "l". "abc" → "".</p>`,
    brute: {
      why: `<p>Try every length L from n − 1 down to 1 and compare prefix and suffix (<code>startsWith</code> / <code>endsWith</code>): up to n lengths × n characters = O(n<sup>2</sup>) = 10<sup>10</sup> on "aaaa…ab". The wasted work: each length re-compares characters that previous lengths already examined.</p>`,
      code: `
        String happyBrute(String s) {
            int n = s.length();
            for (int len = n - 1; len > 0; len--) {
                if (s.regionMatches(0, s, n - len, len)) return s.substring(0, len); // O(len) compare
            }
            return "";
        }`
    },
    mcq: {
      q: 'Which single number from KMP answers this problem directly?',
      options: ['lps[0]', 'lps[n − 1] — the longest proper prefix of the whole string that is also its suffix', 'The number of matches', 'max(lps)'],
      answer: 1,
      explain: 'By definition lps[i] is the longest proper border of s[0..i]. For i = n − 1 that is exactly the longest happy prefix. max(lps) can come from a shorter prefix and is wrong.'
    },
    hints: [
      `<p><b>Aha:</b> "prefix that is also a suffix" is word-for-word the definition of the LPS array. Look at its last cell.</p>`,
      `<p>Build lps for s with the i / len pointers (fallback <code>len = lps[len − 1]</code>). Answer = <code>s.substring(0, lps[n − 1])</code>.</p>`,
      `<p><b>Traps:</b> use lps[n − 1], not the maximum over all lps; "proper" excludes the whole string (lps never equals i + 1, so this is automatic). Alternative: compare prefix and suffix hashes for every length (O(n) with rolling hashes, but probabilistic). <b>Recipe:</b> lps = build(s); return s[0 .. lps[n−1]).</p>`
    ],
    solution: {
      approach: `<p>Prefix function (LPS); answer is the prefix of length lps[n − 1].</p>`,
      code: `
        class Solution {
            public String longestPrefix(String s) {
                int n = s.length();
                int[] lps = new int[n];
                int len = 0, i = 1;
                while (i < n) {
                    if (s.charAt(i) == s.charAt(len)) {
                        lps[i++] = ++len;           // border grows
                    } else if (len > 0) {
                        len = lps[len - 1];         // try the next shorter border
                    } else {
                        lps[i++] = 0;
                    }
                }
                return s.substring(0, lps[n - 1]);  // longest proper border of the whole string
            }

            public static void main(String[] args) {
                Solution sol = new Solution();
                System.out.println(sol.longestPrefix("level"));   // l
                System.out.println(sol.longestPrefix("ababab"));  // abab
                System.out.println("[" + sol.longestPrefix("abc") + "]"); // []
            }
        }`,
      dry: {
        head: ['i', 's[i]', 'len before', 'compare', 'lps[i]'],
        rows: [
          ['1', 'b', '0', 'b ≠ a, len 0', '0'],
          ['2', 'a', '0', 'a = a', '1'],
          ['3', 'b', '1', 'b = b', '2'],
          ['4', 'a', '2', 'a = a', '3'],
          ['5', 'b', '3', 'b = b', '<span class="c-g">4 → "abab"</span>']
        ]
      },
      complexity: `<p><b>Time O(n)</b> (amortized LPS build). <b>Space O(n)</b>.</p>`,
      followUps: ['Return all borders (follow lps[n−1], lps[lps[n−1]−1], …).', 'Solve with the Z-array: largest i with i + Z[i] == n gives border length n − i.']
    }
  });

  practice.push({
    title: 'Shortest Palindrome',
    level: 'Hard',
    tags: ['kmp', 'palindrome', 'lps'],
    companies: ['Google', 'Amazon', 'Microsoft'],
    statement: `<p>You may add characters <b>only in front</b> of string <code>s</code>. Return the shortest palindrome you can make this way.</p>`,
    constraints: `0 ≤ |s| ≤ 5·10<sup>4</sup>; lowercase English letters.`,
    example: `<p>"aacecaaa" → <b>"aaacecaaa"</b>: the longest palindromic <b>prefix</b> is ${H.c('g', '"aacecaa"')}; the leftover ${H.c('r', '"a"')} is reversed and put in front.</p>
      <p>"abcd" → longest palindromic prefix is just "a"; leftover "bcd" reversed = "dcb" → <b>"dcbabcd"</b>.</p>`,
    brute: {
      why: `<p>Try prefix lengths k = n, n − 1, …, and check if s[0..k) is a palindrome (O(k) each): O(n<sup>2</sup>) = 2.5·10<sup>9</sup> for "aaaa…ab"-like inputs. The wasted work: re-checking overlapping prefixes from scratch.</p>`,
      code: `
        String shortestBrute(String s) {
            int k = s.length();
            while (k > 0) {
                int l = 0, r = k - 1;
                boolean ok = true;
                while (l < r) if (s.charAt(l++) != s.charAt(r--)) { ok = false; break; }
                if (ok) break;                      // s[0..k) is the longest palindromic prefix
                k--;
            }
            return new StringBuilder(s.substring(k)).reverse() + s;
        }`
    },
    mcq: {
      q: 'In t = s + "#" + reverse(s), what does lps[last] measure?',
      options: ['The number of palindromes in s', 'The longest prefix of s that equals a suffix of reverse(s) — i.e. the longest palindromic prefix of s', 'The length of s', 'The longest palindromic substring'],
      answer: 1,
      explain: 'A prefix P of s equals a suffix of reverse(s) exactly when reverse(P) = P, i.e. P is a palindrome. The "#" stops the border from growing past s into reverse(s).'
    },
    hints: [
      `<p><b>Aha:</b> whatever we add in front must mirror the part of s that is <b>not</b> already a palindrome at the start. So find the <b>longest palindromic prefix</b>.</p>`,
      `<p>Longest palindromic prefix = lps[last] of <code>s + "#" + reverse(s)</code> (KMP). Then answer = reverse(s.substring(k)) + s.</p>`,
      `<p><b>Traps:</b> without "#", lps could exceed |s| (e.g. s = "aaa"); empty s → ""; use StringBuilder.reverse. <b>Recipe:</b> rev = reverse(s); t = s + "#" + rev; k = lps(t)[last]; return rev.substring(0, n − k) + s.</p>`
    ],
    solution: {
      approach: `<p>KMP prefix function on s#reverse(s) gives the longest palindromic prefix in O(n).</p>`,
      code: `
        class Solution {
            public String shortestPalindrome(String s) {
                int n = s.length();
                String rev = new StringBuilder(s).reverse().toString();
                String t = s + "#" + rev;                       // '#' never appears in s
                int[] lps = new int[t.length()];
                for (int i = 1, len = 0; i < t.length(); ) {
                    if (t.charAt(i) == t.charAt(len)) lps[i++] = ++len;
                    else if (len > 0) len = lps[len - 1];
                    else lps[i++] = 0;
                }
                int k = lps[t.length() - 1];                     // longest palindromic prefix length
                return rev.substring(0, n - k) + s;             // mirror the leftover in front
            }

            public static void main(String[] args) {
                Solution sol = new Solution();
                System.out.println(sol.shortestPalindrome("aacecaaa")); // aaacecaaa
                System.out.println(sol.shortestPalindrome("abcd"));     // dcbabcd
            }
        }`,
      dry: {
        head: ['s', 't = s#rev', 'lps[last] = k', 'leftover s[k..]', 'answer'],
        rows: [
          ['aacecaaa', 'aacecaaa#aaacecaa', '7', '"a"', '<span class="c-g">a + aacecaaa</span>'],
          ['abcd', 'abcd#dcba', '1', '"bcd"', '<span class="c-g">dcb + abcd</span>']
        ]
      },
      complexity: `<p><b>Time O(n)</b>, <b>Space O(n)</b>. (A rolling-hash version compares forward and backward prefix hashes in one pass — also O(n), probabilistic.)</p>`,
      followUps: ['Characters may only be added at the end instead (mirror image of this problem).', 'Minimum insertions anywhere → n − LPS (longest palindromic subsequence), a DP problem.']
    }
  });

  practice.push({
    title: 'Sum of Scores of Built Strings',
    level: 'Hard',
    tags: ['z-algorithm', 'lcp'],
    companies: ['Google'],
    statement: `<p>A string s of length n is built by prepending characters one at a time; s<sub>i</sub> is the string after i characters, which equals the <b>suffix</b> of s of length i. The score of s<sub>i</sub> is the length of the longest common prefix of s<sub>i</sub> and s. Return the sum of all scores.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>5</sup>; lowercase English letters. The answer can exceed 2<sup>31</sup> — use long.`,
    example: `<p>s = "babab": suffixes b, ab, bab, abab, babab score 1, 0, 3, 0, 5 → <b>9</b>.</p>
      ${H.arr([0, 0, 3, 0, 1], { label: 'Z of "babab"', hl: { 2: 'p', 4: 'p' } })}
      <p>Score of the suffix starting at i is Z[i] (and n for i = 0). "azbazbzaz" → 9 + 3 + 2 = <b>14</b>.</p>`,
    brute: {
      why: `<p>For each suffix compare it with s character by character: O(n) per suffix → O(n<sup>2</sup>) = 10<sup>10</sup> on "aaaa…a". The wasted work: overlapping comparisons the Z-box reuses.</p>`,
      code: `
        long sumScoresBrute(String s) {
            int n = s.length();
            long total = 0;
            for (int i = 0; i < n; i++) {
                int k = 0;
                while (i + k < n && s.charAt(k) == s.charAt(i + k)) k++;   // LCP from scratch
                total += k;
            }
            return total;
        }`
    },
    mcq: {
      q: 'The score of the suffix starting at index i equals…',
      options: ['lps[i]', 'Z[i] (with the full string scoring n)', 'n − i', 'The number of distinct characters'],
      answer: 1,
      explain: 'Z[i] is the length of the longest substring starting at i that matches a prefix of s — exactly the LCP of suffix i with s.'
    },
    hints: [
      `<p><b>Aha:</b> "longest common prefix of each suffix with the whole string" is the definition of the Z-array.</p>`,
      `<p>Compute Z with the [L, R] box in O(n); answer = n + Σ Z[i] for i ≥ 1.</p>`,
      `<p><b>Traps:</b> sum in <code>long</code> (n = 10<sup>5</sup> of "a" gives ~5·10<sup>9</sup>); remember the full string's own score n (Z[0] is 0 by convention). <b>Recipe:</b> z = zArray(s); total = n + sum(z[1..]); return total.</p>`
    ],
    solution: {
      approach: `<p>Z-algorithm; sum of Z plus n.</p>`,
      code: `
        class Solution {
            public long sumScores(String s) {
                int n = s.length();
                int[] z = new int[n];
                long total = n;                                   // s_n = s scores n
                for (int i = 1, L = 0, R = 0; i < n; i++) {
                    if (i <= R) z[i] = Math.min(R - i + 1, z[i - L]);
                    while (i + z[i] < n && s.charAt(z[i]) == s.charAt(i + z[i])) z[i]++;
                    if (i + z[i] - 1 > R) {
                        L = i;
                        R = i + z[i] - 1;
                    }
                    total += z[i];
                }
                return total;
            }

            public static void main(String[] args) {
                Solution sol = new Solution();
                System.out.println(sol.sumScores("babab"));      // 9
                System.out.println(sol.sumScores("azbazbzaz"));  // 14
            }
        }`,
      dry: {
        head: ['i', 'free start', 'Z[i]', 'box', 'total'],
        rows: [
          ['—', '—', '—', '—', '5 (whole string)'],
          ['1', '0', '0 (a ≠ b)', '[0, 0]', '5'],
          ['2', '0', '3 (bab)', '[2, 4]', '8'],
          ['3', 'min(2, Z[1] = 0) = 0', '0', '[2, 4]', '8'],
          ['4', 'min(1, Z[2] = 3) = 1', '1 (end)', '[2, 4]', '<span class="c-g">9</span>']
        ]
      },
      complexity: `<p><b>Time O(n)</b>, <b>Space O(n)</b>.</p>`,
      followUps: ['Count how many times each prefix occurs in s (Z or prefix-function counting).', 'Answer LCP(i, j) for arbitrary suffix pairs → suffix array + LCP or hashing + binary search.']
    }
  });

  practice.push({
    title: 'Longest Duplicate Substring',
    level: 'Hard',
    tags: ['rolling hash', 'binary search', 'rabin-karp'],
    companies: ['Google', 'Meta', 'Amazon'],
    statement: `<p>Given a string <code>s</code>, return any longest substring that occurs <b>at least twice</b> (occurrences may overlap). If none exists, return <code>""</code>.</p>`,
    constraints: `2 ≤ |s| ≤ 3·10<sup>4</sup>; lowercase English letters.`,
    example: `${H.arr('banana'.split(''), { hl: { 1: 'g', 2: 'g', 3: 'p', 4: 'b', 5: 'b' } })}
      <p>"banana" → <b>"ana"</b>, found at 1 and 3 (they share the middle ${H.c('p', 'a')}). "abcd" → "" (no letter repeats).</p>`,
    brute: {
      why: `<p>For each length L (n of them), put all substrings of length L in a HashSet&lt;String&gt; — O(n·L) per length → O(n<sup>3</sup>) overall ≈ 2.7·10<sup>13</sup>. Two wastes: trying every L (the answer is monotonic, so binary search works) and hashing whole substrings (rolling hash makes each window O(1)).</p>`,
      code: `
        String dupBrute(String s) {
            for (int len = s.length() - 1; len > 0; len--) {
                Set<String> seen = new HashSet<>();
                for (int i = 0; i + len <= s.length(); i++) {
                    if (!seen.add(s.substring(i, i + len))) return s.substring(i, i + len);
                }
            }
            return "";
        }`
    },
    mcq: {
      q: 'Why can we binary search on the length L?',
      options: ['Because s is sorted', 'If some substring of length L repeats, its first L − 1 characters also repeat — so "a duplicate of length L exists" is monotonic', 'Because hashes are sorted', 'We cannot; it must be linear'],
      answer: 1,
      explain: 'Feasibility is true for all L up to the answer and false after it — the classic "binary search on the answer" shape (see the Binary Search module).'
    },
    hints: [
      `<p><b>Aha:</b> two ideas combine: (1) binary search the answer length L; (2) for a fixed L, find a repeated window in O(n) with a rolling hash.</p>`,
      `<p>Precompute prefix hashes and powers once; for a given L, hash every window with <code>(pre[i+L] − pre[i]·pw[L]) mod M</code> into a <code>HashMap&lt;Long, List&lt;Integer&gt;&gt;</code>; on an equal hash, confirm with <code>regionMatches</code> before declaring a duplicate.</p>`,
      `<p><b>Traps:</b> verify on hash hits (or use double hashing) — a false positive breaks the binary search; char values must be non-zero (use the char code itself with base 131); keep products below 2<sup>63</sup>. <b>Recipe:</b> lo = 1, hi = n − 1; while lo ≤ hi: mid; st = findDup(mid); if st ≥ 0: best = (st, mid), lo = mid + 1 else hi = mid − 1.</p>`
    ],
    solution: {
      approach: `<p>Binary search on length + Rabin-Karp window hashing (verified) — O(n log n) expected.</p>`,
      code: `
        class Solution {
            static final long B = 131, M = 1_000_000_007L;
            private long[] pre, pw;
            private String s;

            public String longestDupSubstring(String s) {
                this.s = s;
                int n = s.length();
                pre = new long[n + 1];
                pw = new long[n + 1];
                pw[0] = 1;
                for (int i = 0; i < n; i++) {
                    pre[i + 1] = (pre[i] * B + s.charAt(i)) % M;   // char code is never 0
                    pw[i + 1] = pw[i] * B % M;
                }
                int lo = 1, hi = n - 1, bestStart = -1, bestLen = 0;
                while (lo <= hi) {                                  // binary search on the length
                    int mid = (lo + hi) >>> 1;
                    int st = findDup(mid);
                    if (st >= 0) { bestStart = st; bestLen = mid; lo = mid + 1; }
                    else hi = mid - 1;
                }
                return bestStart < 0 ? "" : s.substring(bestStart, bestStart + bestLen);
            }

            private long hash(int l, int len) {                     // hash of s[l .. l+len-1]
                return ((pre[l + len] - pre[l] * pw[len]) % M + M) % M;
            }

            private int findDup(int len) {                          // start of a repeated window, or -1
                Map<Long, List<Integer>> seen = new HashMap<>();
                for (int i = 0; i + len <= s.length(); i++) {
                    List<Integer> starts = seen.computeIfAbsent(hash(i, len), k -> new ArrayList<>());
                    for (int j : starts) {
                        if (s.regionMatches(j, s, i, len)) return i;  // verified: not a collision
                    }
                    starts.add(i);
                }
                return -1;
            }

            public static void main(String[] args) {
                Solution sol = new Solution();
                System.out.println(sol.longestDupSubstring("banana"));          // ana
                System.out.println("[" + sol.longestDupSubstring("abcd") + "]"); // []
            }
        }`,
      dry: {
        head: ['lo', 'hi', 'mid', 'repeated window of length mid?', 'best'],
        rows: [
          ['1', '5', '3', '"ana" at 1 and 3 → <span class="c-g">yes</span>', 'ana'],
          ['4', '5', '4', 'bana, anan, nana — all distinct → no', 'ana'],
          ['4', '3', '—', 'lo &gt; hi → stop', '<span class="c-p">"ana"</span>']
        ]
      },
      complexity: `<p><b>Time O(n log n)</b> expected (log n lengths × O(n) windows). <b>Space O(n)</b>. A suffix array + LCP array solves it deterministically in O(n log n) too.</p>`,
      followUps: ['Count distinct substrings (hash all windows of every length, or suffix automaton).', 'Longest substring that appears at least k times.']
    }
  });

  // =====================================================================
  // QUIZ
  // =====================================================================
  quiz.push({ q: 'What does this print? <code>String s = "cat"; s.toUpperCase(); System.out.println(s);</code>', options: ['CAT', 'cat', 'Cat', 'Compile error'], answer: 1, explain: 'Strings are immutable. toUpperCase() returns a new String "CAT" that is thrown away because it is not assigned; s still points to "cat".' });
  quiz.push({ q: 'For a lowercase letter <code>c</code>, what is <code>c - \'a\'</code> when c = \'e\'?', options: ['5', '4', '101', '\'e\''], answer: 1, explain: '\'e\' is 101 and \'a\' is 97 in ASCII/Unicode, so the difference is 4 — the 0-based slot of e in an int[26].' });
  quiz.push({ q: '<code>String a = "hi"; String c = new String("hi");</code> — which is true?', options: ['a == c is true', 'a.equals(c) is true and a == c is false', 'Both are false', 'Both are true'], answer: 1, explain: 'new always creates a separate object, so the references differ (== false), while the letters are the same (equals true).' });
  quiz.push({ q: 'Building a string of N characters with <code>s += c</code> inside a loop costs…', options: ['O(N)', 'O(N log N)', 'O(N<sup>2</sup>) — each += copies the whole string so far', 'O(1)'], answer: 2, explain: 'Copies of length 1 + 2 + … + N = N(N+1)/2. A StringBuilder makes it O(N) amortized.' });
  quiz.push({ q: 'How many centers does expand-around-center try for a string of length N?', options: ['N', 'N − 1', '2N − 1 (N letters + N − 1 gaps)', 'N<sup>2</sup>'], answer: 2, explain: 'Odd palindromes are centered on a letter (N choices); even palindromes on the gap between two letters (N − 1 choices).' });
  quiz.push({ q: 'After <code>expand(l, r)</code> stops, the palindrome found has length…', options: ['r − l', 'r − l + 1', 'r − l − 1', 'r + l'], answer: 2, explain: 'The loop exits one step too far on both sides, so the palindrome is s[l+1 .. r−1], whose length is (r − 1) − (l + 1) + 1 = r − l − 1.' });
  quiz.push({ q: 'In Rabin-Karp, why do we compare characters when the window hash equals the pattern hash?', options: ['To make it faster', 'Because different strings can share a hash (collision)', 'Because Java requires it', 'We never need to'], answer: 1, explain: 'Hashing maps many strings to fewer values, so equal hashes only mean "possibly equal". Verifying (or double hashing) rules out spurious hits.' });
  quiz.push({ q: 'In Java, <code>(-5) % 7</code> evaluates to…', options: ['2', '-5', '5', '-2'], answer: 1, explain: 'Java\'s % keeps the sign of the dividend. That is why rolling-hash code writes (x % M + M) % M or Math.floorMod after subtracting.' });
  quiz.push({ q: 'What is the LPS array of <code>"ababaca"</code>?', options: ['[0,0,1,2,3,0,1]', '[0,1,2,3,4,5,6]', '[0,0,1,2,0,0,1]', '[1,0,1,0,1,0,1]'], answer: 0, explain: 'Borders: "a"(i=2) → 1, "ab" → 2, "aba" → 3, then "c" breaks everything → 0, final "a" → 1.' });
  quiz.push({ q: 'In KMP search, a mismatch happens with j &gt; 0. What do you do?', options: ['i = i − j + 1, j = 0', 'j = lps[j − 1] and keep i', 'j = lps[j] and i++', 'i++ and j++'], answer: 1, explain: 'The longest border of the matched part pat[0..j−1] is lps[j − 1]; those characters are already matched, so continue comparing pat[lps[j−1]] with the same text character. i never moves back.' });
  quiz.push({ q: 'Z-array of <code>"aabxaab"</code> (with Z[0] = 0) is…', options: ['[0,1,0,0,3,1,0]', '[0,1,0,0,2,1,0]', '[0,0,0,0,3,0,0]', '[7,1,0,0,3,1,0]'], answer: 0, explain: 'Z[1] = 1 ("a"), Z[4] = 3 ("aab" matches the prefix), Z[5] = 1 ("a"), others 0.' });
  quiz.push({ q: 'To find pattern p in text t with the Z-algorithm, why build <code>p + "$" + t</code>?', options: ['To sort the characters', 'The separator caps every Z value at |p|, so Z[i] == |p| exactly marks a match', 'To make the string a palindrome', 'Because Z needs even length'], answer: 1, explain: 'Without the separator a match could run past the pattern into the text and give Z values larger than |p| that mix the two strings.' });
  quiz.push({ q: 'The question says "the string is made by repeating a substring several times". Using KMP, the smallest repeating unit has length…', options: ['lps[n − 1]', 'n − lps[n − 1], valid if it divides n and lps[n − 1] &gt; 0', 'n / 2', 'max(lps)'], answer: 1, explain: 'The smallest period is n − lps[n − 1]. The string is a full repetition only if that period divides n (and is shorter than n).' });

  // =====================================================================
  // INTERVIEW Q&A
  // =====================================================================
  interview.push({ q: 'Why are Strings immutable in Java, and what does that buy us?', level: 'B', a: `<p>Once created, a String's characters can never change; every "modification" returns a new String. Benefits: (1) <b>safe sharing</b> — literals are pooled and many references can point to one object; (2) <b>thread safety</b> without locks; (3) <b>hash caching</b> — hashCode is computed once and stored, which makes Strings ideal HashMap keys; (4) <b>security</b> — file paths, class names and URLs cannot be altered after validation. The cost: editing in a loop creates garbage and can be O(N<sup>2</sup>), which is why we use StringBuilder or char[] for building.</p>`, followUps: ['What would break if a String used as a HashMap key could change?', 'How do you "edit" a String efficiently?'] });
  interview.push({ q: 'Explain == vs equals for Strings, and when == happens to return true.', level: 'B', a: `<p><code>==</code> compares references (are these the same object?); <code>equals</code> compares the character content. == returns true for two identical <b>literals</b> (both point to the pooled object), for compile-time constant expressions like <code>"he" + "llo"</code>, and after <code>intern()</code>. Strings built at runtime (concatenation with variables, input, substring) are new objects, so == fails even when the letters match. Rule: always use <code>equals</code> (or <code>Objects.equals</code> for null-safety).</p>`, followUps: ['What does intern() do and when is it useful?', 'Is comparing two char values with == okay?'] });
  interview.push({ q: 'How would you count character frequencies, and when is int[26] better than a HashMap?', level: 'B', a: `<p>If the problem guarantees lowercase a–z, use <code>int[26]</code> and <code>cnt[c - 'a']++</code>: no hashing, no boxing, contiguous memory, O(1) space, and comparing two count arrays costs 26 steps. For full ASCII use <code>int[128]</code>. For arbitrary Unicode or unknown alphabets use <code>HashMap&lt;Character, Integer&gt;</code> (or code points). The array version is typically several times faster and is what interviewers expect when they say "lowercase English letters".</p>`, followUps: ['How do you compare two frequency arrays quickly in a sliding window?', 'What breaks if the input contains uppercase letters?'] });
  interview.push({ q: 'Why is StringBuilder append amortized O(1)? Prove it.', level: 'I', a: `<p>StringBuilder keeps a backing array with spare capacity. An append writes into the next free cell (O(1)). When full, it allocates roughly double the capacity and copies once. Copy sizes are c, 2c, 4c, …, all ≤ N, and that geometric series sums to less than 2N. Adding the N single writes gives fewer than 3N operations for N appends, so the <b>average</b> cost per append is O(1) even though an individual append can cost O(N). Pre-sizing with <code>new StringBuilder(n)</code> removes the copies entirely.</p>`, followUps: ['What if capacity grew by +10 instead of ×2?', 'Which StringBuilder operations are O(N) and should be avoided in loops?'] });
  interview.push({ q: 'Walk me through finding the longest palindromic substring. What are the alternatives?', level: 'I', a: `<p>Every palindrome is symmetric around a center — a letter (odd length) or a gap (even length) — so there are 2N − 1 centers. From each, expand l−−, r++ while s[l] == s[r]; length = r − l − 1, start = c − (len − 1)/2. Time O(N<sup>2</sup>), space O(1). Alternatives: brute force O(N<sup>3</sup>); DP table pal[i][j] in O(N<sup>2</sup>) time and space (useful when many palindrome queries follow); hashing + binary search O(N log N); Manacher's algorithm O(N) using a mirror/box idea on "#a#b#…".</p>`, followUps: ['How would you count all palindromic substrings?', 'Explain the idea behind Manacher in two sentences.'] });
  interview.push({ q: 'Explain the polynomial rolling hash and how Rabin-Karp uses it.', level: 'I', a: `<p>Treat a string as a number in base B: hash = s[0]·B<sup>m−1</sup> + … + s[m−1], all mod a large prime M. Sliding the window right: subtract the outgoing char × B<sup>m−1</sup>, multiply by B, add the incoming char — O(1). Rabin-Karp hashes the pattern and each text window; only on equal hashes does it compare characters (to rule out collisions). Expected O(N + M); worst case O(N·M) if many verifications happen. With prefix hashes, any substring's hash is O(1): pre[r+1] − pre[l]·B<sup>len</sup>.</p>`, followUps: ['Why must letter values start at 1, not 0?', 'How do you handle negative values after the subtraction in Java?'] });
  interview.push({ q: 'How do you reduce hash collisions, and how likely are they?', level: 'A', a: `<p>For a prime modulus M and a random base, two different strings of length L collide with probability ≤ L/M. Across many comparisons the birthday effect matters: with K hashes in a set, collisions become likely around K ≈ √M. Mitigations: (1) verify characters on every hash hit (always correct); (2) <b>double hashing</b> with two independent (B, M) pairs — false positives ≈ 1/(M<sub>1</sub>M<sub>2</sub>); (3) a 61-bit Mersenne prime modulus with 128-bit multiplication; (4) choose the base randomly at runtime so adversaries cannot craft collisions. Avoid relying on overflow mod 2<sup>64</sup> — Thue–Morse strings break it.</p>`, followUps: ['Why is a fixed base dangerous on a public judge or a web service?', 'How would you pack two hashes into one HashMap key?'] });
  interview.push({ q: 'What is the LPS array and how do you build it in O(M)?', level: 'I', a: `<p>lps[i] = length of the longest <b>proper</b> prefix of pat[0..i] that is also a suffix of it. Build with two pointers: i scans the pattern, len is the current border length. If pat[i] == pat[len], len++ and lps[i] = len, i++. On mismatch with len &gt; 0, fall back to the next shorter border len = lps[len − 1] without moving i. On mismatch with len = 0, lps[i] = 0, i++. len increases at most M times and every fallback decreases it, so total work is O(M).</p>`, followUps: ['Compute the LPS of "aabaaab" by hand.', 'Why is the fallback lps[len − 1] and not lps[len]?'] });
  interview.push({ q: 'Prove that KMP search runs in O(N + M).', level: 'A', a: `<p>Each loop iteration either moves the text pointer i forward, or decreases the pattern pointer j via j = lps[j − 1]. i moves forward at most N times. j only increases together with i (at most N increments total), and it never goes below 0, so the total number of decreases is also at most N. Hence the search loop runs at most 2N times; the LPS build by the same argument runs at most 2M times. Total O(N + M), deterministic — unlike Rabin-Karp, no luck is involved.</p>`, followUps: ['Does the text pointer ever move backwards?', 'How would you handle finding overlapping matches?'] });
  interview.push({ q: 'Explain the Z-algorithm and the [L, R] box.', level: 'A', a: `<p>Z[i] is the length of the longest substring starting at i that equals a prefix of s. We keep the box [L, R] — the matching segment reaching furthest right, meaning s[L..R] = s[0..R−L]. For i inside the box, its mirror i − L near the start gives a free lower bound Z[i] ≥ min(R − i + 1, Z[i − L]). Then we extend by direct comparisons beyond R, and move the box if we pass R. Each successful comparison pushes R right, so total time is O(N). For pattern search, compute Z of pat + "$" + txt and report indices where Z == |pat|.</p>`, followUps: ['Why cap the free value at R − i + 1?', 'What do you do if no separator character is safe?'] });
  interview.push({ q: 'KMP vs Z vs Rabin-Karp — how do you choose?', level: 'A', a: `<p><b>KMP:</b> deterministic O(N + M), memory O(M), reads the text once left to right — ideal for streams, and its LPS array directly answers border/period/shortest-palindrome questions. <b>Z:</b> same guarantee, simpler mental model, but the concatenation needs O(N + M) memory and a safe separator; natural for "match the prefix at each position" questions (sum of scores). <b>Rabin-Karp:</b> probabilistic but flexible — O(1) comparison of <i>any</i> two substrings via prefix hashes, multiple patterns of equal length, 2D matching, binary search on length (longest duplicate substring). In interviews, pick the one you can code bug-free and state its guarantees.</p>`, followUps: ['Which would you use for many patterns at once? (Aho–Corasick)', 'Which one does Java\'s indexOf use?'] });
  interview.push({ q: 'How would you check if one string is a rotation of another in O(N)?', level: 'I', a: `<p>Check that the lengths are equal, then test whether goal occurs in s + s. Every rotation of s by k positions is (s + s)[k .. k + n), so rotations of s are exactly the length-n windows of s + s. Use KMP or Z for a guaranteed O(N) search (Java's contains is fast in practice but O(N·M) worst case). The length check matters: without it, "ab" would wrongly be accepted as a rotation of "abc" since it appears in "abcabc".</p>`, followUps: ['How do you find the lexicographically smallest rotation?', 'What if you also need the number of shifts?'] });
  interview.push({ q: 'Design: you need to detect near-duplicate documents across 100 million web pages. Where do string algorithms come in?', level: 'E', a: `<p>Exact matching per pair is impossible (10<sup>16</sup> pairs), so we fingerprint. Split each document into k-word shingles, hash each shingle with a <b>rolling hash</b> (Rabin fingerprints) so shingles are produced in O(length). Then compute a <b>MinHash</b> signature (the minimum hash under many hash functions) — similar documents share many minima — and use <b>locality-sensitive hashing</b> to bucket candidates so only likely pairs are compared. "Winnowing" (selecting minimum fingerprints in sliding windows) is the same idea used by MOSS for plagiarism detection. This pipeline is also standard for deduplicating LLM training data and RAG corpora.</p>`, followUps: ['How do you pick k for shingles?', 'Why is a rolling hash essential here rather than hashing each shingle from scratch?'] });
  interview.push({ q: 'An AI assistant wrote your string-matching code. How do you review it quickly for correctness and performance?', level: 'E', a: `<p>I check the known failure points: (1) <b>String concatenation in loops</b> (+= → O(N<sup>2</sup>)) and repeated substring copies; (2) <b>== on Strings</b>; (3) for hashing — letter values starting at 0, negative modulo, int overflow, missing verification on equal hashes; (4) for KMP — using lps[j] instead of lps[j − 1], resetting j to 0 after a match (misses overlaps), moving i on fallback; (5) for Z — missing the R − i + 1 cap or an unsafe separator; (6) Unicode assumptions like c − 'a'. Then I run a <b>stress test</b>: a brute-force O(N·M) reference against the fast version on thousands of random small inputs, plus adversarial cases ("aaaa…ab").</p>`, followUps: ['How would you write that stress test in 10 lines?', 'Which inputs make naive matching quadratic?'] });

  registerModule({
    id: 'dsa09',
    title: 'String Algorithms',
    intro: `<p>Strings are the most common input type in coding interviews — names, logs, DNA, URLs, chat messages. This module starts with how Java really stores text (immutability, <code>c - 'a'</code> arithmetic, the String pool, why <code>+=</code> in a loop is secretly O(N<sup>2</sup>)), then builds up to the classic algorithms every strong candidate knows: <b>two-pointer palindromes</b>, <b>expand around center</b> for the longest palindromic substring, the <b>polynomial rolling hash</b> behind Rabin-Karp, <b>KMP with its LPS array</b>, and the <b>Z-algorithm</b>.</p>
      <p>Every topic opens with an everyday analogy, then shows a step-by-step visualizer you can feed your own input, worked examples, an expert deep dive and an AI-era section. It builds directly on hashing (DSA 8) and the two-pointer / sliding-window ideas (DSA 6). By the end you will read a question like "find all occurrences in linear time" or "longest prefix that is also a suffix" and immediately know which tool to reach for.</p>`,
    goals: [
      'Explain String immutability, the String pool and == vs equals, and use <code>c - \'a\'</code> counting arrays instead of HashMaps when the alphabet is small',
      'Spot hidden O(N<sup>2</sup>) string building and replace it with StringBuilder or char[] (and prove why append is amortized O(1))',
      'Check palindromes with two pointers in O(1) space and find the longest palindromic substring with expand-around-center (odd and even centers)',
      'Implement a polynomial rolling hash (prefix hashes, O(1) substring hash, mod arithmetic, collision handling) and Rabin-Karp search',
      'Build the KMP LPS array by hand and in code, search in guaranteed O(N + M), and use LPS for periods, happy prefixes and shortest palindromes',
      'Compute the Z-array with the [L, R] box and solve pattern search and prefix-matching problems with pat + "$" + txt',
      'Choose between KMP, Z and hashing from the wording and constraints of a question'
    ],
    prereqs: `DSA 1 (Programming Foundations — Java strings and arrays), DSA 2 (Complexity), DSA 3 (Modular arithmetic: (a − b + m) % m and fast power), DSA 6 (Two Pointers &amp; Sliding Window) and DSA 8 (Hashing Masterclass).`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
