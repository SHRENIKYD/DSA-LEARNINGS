(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw;

  /* ---------------- shared little helpers for the visualizers ---------------- */
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function esc(s) { return H.esc(s); }
  function intOf(input, lo, hi, hint) {
    var s = String(input === undefined || input === null ? '' : input).trim();
    if (!/^-?\d+$/.test(s)) throw new Error(hint);
    var n = Number(s);
    if (n < lo || n > hi) throw new Error(hint);
    return n;
  }
  function wordOf(input, minLen, maxLen, hint) {
    var s = String(input === undefined || input === null ? '' : input).trim();
    if (!/^[A-Za-z]+$/.test(s) || s.length < minLen || s.length > maxLen) throw new Error(hint);
    return s;
  }
  function out(text) {
    return { type: 'text', label: 'Console output', html: text ? '<code>' + esc(text).replace(/\n/g, '<br>') + '</code>' : '<span class="c-m">(nothing printed yet)</span>' };
  }
  function note(html, label) { return { type: 'text', label: label || 'What the compiler / JVM really does', html: html }; }
  /* Turns a list of steps into visualizer frames for a fixed code listing.
     step = { l: line | [lines], cls, v: {vars}, hv: {name: cls}, vl: 'vars label', out: 'console', extra: [parts], narr } */
  function codeFrames(code, steps, label) {
    return steps.map(function (s) {
      var hl = {};
      [].concat(s.l === undefined ? [] : s.l).forEach(function (n) { hl[n] = s.cls || 'cur'; });
      var parts = [{ type: 'code', label: label || 'Code (highlighted line = running now)', lang: 'java', code: code, hl: hl }];
      if (s.v) parts.push({ type: 'vars', label: s.vl || 'Variables (stack)', vals: s.v, hl: s.hv || {} });
      (s.extra || []).forEach(function (p) { parts.push(p); });
      if (s.out !== undefined) parts.push(out(s.out));
      return { narr: s.narr, parts: parts };
    });
  }
  /* 32-bit Java int arithmetic helpers */
  function i32(x) { return x | 0; }
  function strHash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return h; }
  function spread(h) { return (h ^ (h >>> 16)) | 0; }
  /* ======================================================================
     TOPIC 1 — String immutability
     ====================================================================== */
  topics.push({
    title: 'String Immutability: Why a String Can Never Change',
    analogy: `<p>Think of a <b>laminated name badge</b>. Once it is printed and laminated, nobody can rub out a letter. If you want a badge that says something else, the printer makes a <b>brand-new badge</b> and you clip that one on instead. Anyone still holding the <i>old</i> badge sees exactly what it always said. Because nothing can ever change it, a thousand people can safely share one badge without asking each other first. A Java <code>String</code> is that laminated badge: every "change" (upper-casing, trimming, replacing) prints a new badge; the variable just points to whichever badge you are wearing now.</p>`,
    explain: `<p><b>Immutable</b> means "cannot be changed after it is created". Once Java makes the String <code>"hello"</code>, those five letters are frozen forever. Every method that sounds like it changes a String — <code>toUpperCase()</code>, <code>trim()</code>, <code>replace()</code>, <code>concat()</code>, <code>substring()</code> — actually <b>builds and returns a new String</b> and leaves the original untouched.</p>
<h4>1. A variable is an arrow, not a box of letters</h4>
<p>When you write <code>String s = "hello";</code> the variable <code>s</code> holds a <b>reference</b> (an arrow) to a String object living on the heap. "Changing" <code>s</code> really means <b>pointing the arrow somewhere else</b>:</p>
<pre><code>String s = "hello";
String t = s;          // t points at the SAME object as s
s = s.concat(" world"); // a NEW object "hello world" is made; s's arrow moves to it
System.out.println(t);  // hello  (t still points at the old, unchanged object)</code></pre>
${H.table(['Line', 's points to', 't points to', 'Objects on the heap'], [
  ['String s = "hello";', '"hello"', '—', '"hello"'],
  ['String t = s;', '"hello"', '"hello" (same one)', '"hello"'],
  ['s = s.concat(" world");', H.c('g', '"hello world" (new)'), '"hello"', '"hello", "hello world"']
])}
<h4>2. The number-one beginner bug: ignoring the return value</h4>
<pre><code>String name = "  asha  ";
name.trim();                 // makes "asha" ... and throws it away!
System.out.println("[" + name + "]");   // [  asha  ]
name = name.trim();          // correct: catch the new String
System.out.println("[" + name + "]");   // [asha]</code></pre>
<p>Rule of thumb: <b>a String method call on its own line, with nothing on the left side, is almost always a bug.</b></p>
<h4>3. How Java makes String immutable</h4>
<ul>
<li>The class is declared <code>final</code> — nobody can subclass it and add a "setter".</li>
<li>Its characters live in a <code>private final byte[] value</code> field — private (no outside access) and final (the array reference can never be swapped).</li>
<li>No method ever writes into that array after construction, and methods that hand out the characters (like <code>toCharArray()</code>) return a <b>copy</b>.</li>
</ul>
<h4>4. Why the designers chose immutability (the 5 reasons interviewers want)</h4>
${H.table(['Reason', 'Plain-English meaning'], [
  ['<b>String pool / sharing</b>', 'Many variables can share one <code>"OK"</code> object. Safe only because nobody can change it under your feet.'],
  ['<b>Security</b>', 'A file path, URL, class name or SQL user name is checked and then used. If it could change between the check and the use, an attacker could swap it.'],
  ['<b>Thread safety</b>', 'Immutable objects can be shared between threads with no locks at all.'],
  ['<b>Hash code caching</b>', 'The hash is computed once and stored, which makes Strings fast, reliable <code>HashMap</code> keys.'],
  ['<b>Class loading</b>', 'The JVM finds classes by their String names; those must not change mid-flight.']
])}
<h4>5. final variable ≠ immutable object</h4>
<p><code>final</code> on a <b>variable</b> freezes the <b>arrow</b>. Immutability freezes the <b>object</b>. They are different things:</p>
${H.table(['Code', 'Can the arrow move?', 'Can the object change?'], [
  ['<code>String s = "a";</code>', H.c('g', 'yes'), H.c('r', 'no (String is immutable)')],
  ['<code>final String s = "a";</code>', H.c('r', 'no'), H.c('r', 'no')],
  ['<code>final StringBuilder sb = new StringBuilder();</code>', H.c('r', 'no'), H.c('g', 'yes — sb.append("x") works')]
])}
<h4>6. What a String really holds (Java 9+ "compact strings")</h4>
<p>Since Java 9 a String stores its text in a <code>byte[]</code> plus a one-byte <b>coder</b> flag. If every character fits in one byte (Latin-1: plain English, most European letters), it uses <b>1 byte per char</b> (coder LATIN1). If even one character needs more (Hindi, Chinese, π, emoji), the whole String switches to <b>2 bytes per char</b> (coder UTF16). <code>length()</code> always counts UTF-16 <b>chars</b>, so an emoji like 😀 has <code>length() == 2</code>.</p>`,
    clues: [
      '"Why is String immutable in Java?" → pool sharing, security, thread safety, hash caching, class loading',
      '"What does this print?" + a String method call whose result is <b>not assigned</b> (<code>s.toUpperCase();</code>) → the original is unchanged',
      '"Can you modify a String passed to a method?" → no; the method can only point its own copy of the reference elsewhere',
      '"final vs immutable" or "is a final StringBuilder immutable?" → final freezes the reference, not the object',
      '"Make my own class immutable" → final class, private final fields, no setters, defensive copies of mutable fields',
      '"Why are Strings good HashMap keys?" → immutable so the cached hash never goes stale',
      '"length() of an emoji / non-English text" → UTF-16 chars vs code points vs bytes'
    ],
    code: [R`
// Proving immutability: every "change" makes a new object
public class ImmutableDemo {
    public static void main(String[] args) {
        String s = "hello";
        String t = s;                       // two arrows, one object
        System.out.println(s == t);         // true  -> same object

        s.toUpperCase();                    // result thrown away; s is untouched
        System.out.println(s);              // hello

        s = s.toUpperCase();                // catch the NEW object
        System.out.println(s);              // HELLO
        System.out.println(t);              // hello -> t still sees the old object
        System.out.println(s == t);         // false -> different objects now

        // final freezes the ARROW, not the object
        final StringBuilder sb = new StringBuilder("ab");
        sb.append("c");                     // allowed: the object is mutable
        System.out.println(sb);             // abc
        // sb = new StringBuilder();        // would NOT compile: arrow is final

        // toCharArray returns a COPY, so editing it cannot touch the String
        char[] copy = t.toCharArray();
        copy[0] = 'J';
        System.out.println(t + " " + new String(copy)); // hello Jello
    }
}`, R`
// Writing your OWN immutable class, the way String does it
import java.util.List;

public final class Order {                          // 1. final: no subclass can add setters
    private final String id;                        // 2. private final fields
    private final List<String> items;

    public Order(String id, List<String> items) {
        this.id = id;
        this.items = List.copyOf(items);            // 3. defensive copy IN (caller keeps no handle)
    }

    public String id() { return id; }
    public List<String> items() { return items; }   // List.copyOf is already unmodifiable

    public Order withItem(String item) {            // 4. "modifier" returns a NEW object
        List<String> next = new java.util.ArrayList<>(items);
        next.add(item);
        return new Order(id, next);
    }

    public static void main(String[] args) {
        Order a = new Order("A1", List.of("pen"));
        Order b = a.withItem("book");
        System.out.println(a.items() + " " + b.items()); // [pen] [pen, book]
    }
}`],
    codeTitle: ['Every "change" makes a new String', 'Build your own immutable class (same recipe as String)'],
    viz: [{
      title: 'Arrows and objects: what really happens when a String "changes"',
      input: 'hello',
      inputLabel: 'a word (letters only, 1-10)',
      gen: function (input) {
        var w = wordOf(input, 1, 10, 'Type one word of 1-10 letters, e.g. hello');
        var W = w.toUpperCase(), wx = w + '!';
        var code = 'String s = "' + w + '";\nString t = s;\ns.toUpperCase();\ns = s.concat("!");\nString u = t.toUpperCase();\nSystem.out.println(s + " " + t + " " + u);';
        var objs = { A: { label: '"' + w + '"', x: 58, y: 10 }, B: { label: '"' + W + '"', x: 90, y: 6 }, C: { label: '"' + wx + '"', x: 58, y: 34 }, D: { label: '"' + W + '"', x: 90, y: 52 } };
        var vars = { s: { x: 10, y: 10 }, t: { x: 10, y: 30 }, u: { x: 10, y: 50 } };
        function g(st, hl, ehl, tags) {
          var nodes = [], edges = [];
          Object.keys(st.vars).forEach(function (v) { nodes.push({ id: v, label: 'var ' + v, x: vars[v].x, y: vars[v].y, shape: 'box' }); edges.push([v, st.vars[v], 'ref']); });
          st.objs.forEach(function (o) { nodes.push({ id: o, label: objs[o].label, x: objs[o].x, y: objs[o].y, shape: 'box' }); });
          return { type: 'graph', label: 'Stack (left) → Heap objects (right)', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
        }
        var f = [];
        function push(line, cls, st, hl, ehl, tags, o, narr, extra) {
          var parts = [{ type: 'code', label: 'Code', lang: 'java', code: code, hl: line ? one(line, cls || 'cur') : {} }, g(st, hl, ehl, tags)];
          (extra || []).forEach(function (p) { parts.push(p); });
          parts.push(out(o));
          f.push({ narr: narr, parts: parts });
        }
        push(0, '', { vars: {}, objs: [] }, {}, {}, {}, '', 'Before anything runs: the <b>stack</b> (local variables) is empty and there are no String objects yet. Watch the arrows — that is the whole story of immutability.');
        push(1, 'cur', { vars: { s: 'A' }, objs: ['A'] }, { A: 'ok', s: 'cur' }, { 's-A': 'ok' }, {}, '', 'Line 1 creates the object <code>"' + esc(w) + '"</code> on the heap and stores an <b>arrow</b> to it in <code>s</code>. The variable does not hold letters, only the address of the object.');
        push(2, 'cur', { vars: { s: 'A', t: 'A' }, objs: ['A'] }, { t: 'cur', A: 'sel' }, { 't-A': 'ok' }, { A: '2 refs' }, '', 'Line 2 copies the <b>arrow</b>, not the object. Now <code>s</code> and <code>t</code> point at the <b>same</b> object (<code>s == t</code> is true). Sharing is safe because nobody can edit it.');
        push(3, 'cur', { vars: { s: 'A', t: 'A' }, objs: ['A', 'B'] }, { B: 'bad' }, {}, { B: 'no arrow → garbage' }, '', 'Line 3 calls <code>toUpperCase()</code>. It builds a <b>new</b> object <code>"' + esc(W) + '"</code>… but the result is not stored anywhere, so no arrow points at it. <code>s</code> still says <code>"' + esc(w) + '"</code>. This is the classic "ignored return value" bug.', [note('<code>s.toUpperCase();</code> compiles fine. The new String becomes <b>garbage</b> immediately and the garbage collector will reclaim it later.')]);
        push(4, 'cur', { vars: { s: 'C', t: 'A' }, objs: ['A', 'C'] }, { C: 'ok', s: 'cur' }, { 's-C': 'ok' }, { A: '1 ref' }, '', 'Line 4: <code>concat("!")</code> builds a <b>third</b> object <code>"' + esc(wx) + '"</code> and this time we assign it, so the arrow in <code>s</code> <b>moves</b>. The old object was never touched — <code>t</code> still points at it.');
        push(5, 'cur', { vars: { s: 'C', t: 'A', u: 'D' }, objs: ['A', 'C', 'D'] }, { D: 'ok', u: 'cur' }, { 'u-D': 'ok' }, {}, '', 'Line 5: <code>t.toUpperCase()</code> makes yet another new object and <code>u</code> points to it. Notice: <b>no object ever changed</b>; we only created new ones and moved arrows.');
        push(6, 'ok', { vars: { s: 'C', t: 'A', u: 'D' }, objs: ['A', 'C', 'D'] }, { A: 'sel', C: 'sel', D: 'sel' }, {}, {}, wx + ' ' + w + ' ' + W, 'Line 6 prints each object the arrows point at: <b>' + esc(wx + ' ' + w + ' ' + W) + '</b>. <code>t</code> still shows the original word — proof that the String itself never changed.');
        f.push({ narr: 'Summary: <b>String methods never modify; they return new Strings</b>. If you want the change, assign it: <code>s = s.toUpperCase();</code>.', parts: [{ type: 'table', label: 'Who points where at the end', columns: ['variable', 'object', 'was it ever modified?'], rows: [['s', '"' + wx + '"', 'no (new object)'], ['t', '"' + w + '"', 'no (original)'], ['u', '"' + W + '"', 'no (new object)']], hl: { 1: 'sel' } }, out(wx + ' ' + w + ' ' + W)] });
        return f;
      }
    }, {
      title: 'Compact strings: the bytes inside a String (Java 9+)',
      input: 'Hi Java',
      inputLabel: 'any text (1-12 chars) — try: naïve, π=3.14, नमस्ते',
      gen: function (input) {
        var s = String(input === undefined || input === null ? '' : input);
        if (!s.length || s.length > 12) throw new Error('Type 1-12 characters, e.g. Hi Java or π=3.14');
        var units = [], latin = true, f = [];
        for (var i = 0; i < s.length; i++) units.push(s.charCodeAt(i));
        f.push({ narr: 'A String stores <b>UTF-16 chars</b>. Your text has <code>length() = ' + s.length + '</code> chars. Java 9+ first asks: <i>does every char fit in ONE byte (value ≤ 255)?</i>', parts: [{ type: 'array', label: 'chars (what charAt sees)', values: s.split(''), showIdx: true }, { type: 'vars', label: 'String fields', vals: { 'value (byte[])': '?', coder: '?', hash: 0 } }] });
        for (var j = 0; j < units.length; j++) {
          var fits = units[j] <= 255;
          if (!fits) latin = false;
          var hl = {}; hl[j] = fits ? 'ok' : 'bad';
          f.push({ narr: 'char <code>' + esc(s[j]) + '</code> has code <b>' + units[j] + '</b> (hex ' + units[j].toString(16).toUpperCase() + '). ' + (fits ? 'It fits in one byte (≤ 255).' : '<span class="c-r">It does NOT fit in one byte</span>, so the <b>whole</b> String must use 2 bytes per char.'), parts: [{ type: 'array', label: 'chars', values: s.split(''), hl: hl, ptr: one(j, 'i') }, { type: 'vars', label: 'scan so far', vals: { code: units[j], 'fits in 1 byte?': fits, 'all fit so far?': latin }, hl: { 'all fit so far?': latin ? 'ok' : 'bad' } }] });
          if (f.length > 14) break;
        }
        var bytes = [];
        units.forEach(function (u) { if (latin) bytes.push(u.toString(16).toUpperCase().padStart(2, '0')); else { bytes.push((u >> 8).toString(16).toUpperCase().padStart(2, '0')); bytes.push((u & 255).toString(16).toUpperCase().padStart(2, '0')); } });
        var arrBytes = 16 + Math.ceil(bytes.length / 8) * 8;
        f.push({ narr: latin ? 'Every char fit, so the coder is <b>LATIN1</b>: exactly <b>1 byte per char</b>. This halves memory for plain English text compared with Java 8.' : 'At least one char needed 2 bytes, so the coder is <b>UTF16</b>: <b>2 bytes per char for every char</b> (shown high byte first). One non-Latin char doubles the cost of the whole String.', parts: [{ type: 'array', label: 'value: byte[' + bytes.length + '] (hex)', values: bytes, showIdx: true }, { type: 'vars', label: 'String fields', vals: { coder: latin ? 'LATIN1 (0)' : 'UTF16 (1)', 'length()': s.length, 'byte[] length': bytes.length, hash: '0 (not computed yet)' }, hl: { coder: latin ? 'ok' : 'bad' } }] });
        f.push({ narr: 'Approximate memory on a 64-bit JVM with compressed pointers: String object ≈ <b>24 bytes</b> + byte[] ≈ 16-byte header + data rounded up to 8 → about <b>' + (24 + arrBytes) + ' bytes</b> for ' + s.length + ' chars. Small Strings are mostly overhead!', parts: [{ type: 'table', label: 'Memory estimate', columns: ['piece', 'bytes'], rows: [['String header + fields (value, coder, hash, hashIsZero)', '24'], ['byte[] header', '16'], ['byte[] data (' + bytes.length + ' bytes, padded to 8)', String(arrBytes - 16)], ['<b>total</b>', '<b>' + (24 + arrBytes) + '</b>']], hl: { 3: 'sel' } }] });
        f.push({ narr: 'The first time someone calls <code>hashCode()</code>, the result is computed and <b>cached</b> in the <code>hash</code> field. Safe only because the bytes can never change — a mutable String could not cache its hash.', parts: [{ type: 'vars', label: 'after s.hashCode()', vals: { coder: latin ? 'LATIN1' : 'UTF16', hash: strHash(s), hashIsZero: strHash(s) === 0 }, hl: { hash: 'ok' } }, note('Immutability → the hash is computed <b>once</b> and reused forever. That is why Strings are excellent HashMap keys.')] });
        return f;
      }
    }],
    examples: [
      { title: 'The ignored-result bug in a real method', html: `<p>A teammate writes a cleaner that "does nothing". Each line creates a new String and throws it away. The fix is to <b>assign every result</b> (or chain the calls).</p>`, code: R`
static String clean(String raw) {
    raw.trim();                 // BUG: result discarded
    raw.toLowerCase();          // BUG: result discarded
    return raw;                 // returns the ORIGINAL text
}
static String cleanFixed(String raw) {
    return raw.trim().toLowerCase();   // each call returns a new String, chained
}` },
      { title: 'A method cannot change the caller\'s String', html: `<p>Java passes the <b>reference by value</b>. Inside <code>shout</code>, <code>s = s + "!"</code> moves the method's <i>own copy</i> of the arrow; the caller's arrow is untouched. Output: <code>hi</code>.</p>`, code: R`
public class PassString {
    static void shout(String s) {
        s = s + "!";             // new object; only the LOCAL arrow moves
    }
    public static void main(String[] args) {
        String msg = "hi";
        shout(msg);
        System.out.println(msg); // hi
    }
}` },
      { title: 'Emoji and non-English text: length() is not "letters"', html: `<p><code>"€".length()</code> is 1 (fits in one UTF-16 char), but <code>"😀".length()</code> is <b>2</b> because the emoji needs a <b>surrogate pair</b>. To count what humans call characters, use <code>codePointCount</code>. Output: <code>1 2 1</code>.</p>`, code: R`
String euro = "€", smile = "😀";
System.out.println(euro.length() + " " + smile.length() + " "
        + smile.codePointCount(0, smile.length()));   // 1 2 1` },
      { title: 'substring() makes a new String (no hidden sharing since Java 7u6)', html: `<p>In very old Java, <code>substring</code> shared the parent's char array, so keeping a 3-letter substring of a 10 MB String kept all 10 MB alive (a famous memory leak). Since Java 7 update 6 it <b>copies</b> just the needed chars. Output: <code>log false</code>.</p>`, code: R`
String big = "catalog".repeat(1000);
String small = big.substring(4, 7);       // "log" — its own small byte[]
System.out.println(small + " " + (small == big));` }
    ],
    deepDive: `<p><b>Field layout (JDK 21):</b> <code>private final byte[] value; private final byte coder; private int hash; private boolean hashIsZero;</code>. <code>hashIsZero</code> (added in JDK 13) fixes an old corner case: a String whose real hash is 0 (e.g. <code>"f5a5a608"</code>) used to be re-hashed on every call because 0 meant "not computed".</p>
<p><b>Is it truly unbreakable?</b> Before Java 9 you could use reflection to grab <code>value</code> and poke bytes — and corrupt every shared literal in the JVM. Since the module system (Java 9, strongly encapsulated by default since Java 16/17) <code>java.lang</code> internals are closed; you would need <code>--add-opens java.base/java.lang=ALL-UNNAMED</code>. Interviewers like hearing that "immutable" is guaranteed by the language rules plus encapsulation, not by magic.</p>
<p><b>Cost of immutability:</b> every modification allocates. Doing <code>s = s + c</code> in a loop of N steps copies 1 + 2 + … + N characters = O(N²). That is why <code>StringBuilder</code> exists (next topics). Modern JVMs make short-lived garbage cheap (TLAB bump-pointer allocation, young-gen copying collectors), so for a handful of operations immutability is effectively free.</p>
<p><b>Compact strings (JEP 254)</b> can be turned off with <code>-XX:-CompactStrings</code> (rarely useful). <b>G1 String deduplication</b> (<code>-XX:+UseStringDeduplication</code>, also supported by other collectors since JDK 18) finds Strings with equal content and makes them <b>share one byte[]</b> — possible only because the arrays are never written. Note it dedups the <i>arrays</i>, not the String objects, so <code>==</code> results never change.</p>
<p><b>Security story (TOCTOU):</b> <code>SecurityManager</code>-era code checked a path String and then opened it. With a mutable String, another thread could change <code>"/tmp/ok"</code> to <code>"/etc/passwd"</code> between the check and the open — a time-of-check-to-time-of-use attack. Immutability closes that gap.</p>`,
    aiEra: `<p><b>What AI changes:</b> Copilot-style tools almost never forget to assign String results in fresh code, but they happily <b>copy</b> buggy patterns from your existing code base, and they often produce <code>result += piece</code> inside loops. In code review, scan AI output for String calls whose result is unused — static analysers (SpotBugs <code>RV_RETURN_VALUE_IGNORED</code>, IntelliJ "Result of method call ignored", Error Prone <code>ReturnValueIgnored</code>) catch this automatically, so wire them into CI.</p>
<p><b>Use AI as a partner:</b> ask <code>"Draw the stack/heap arrows for this snippet line by line, do not just give the output"</code>. Asking for the <i>picture</i> forces a reasoning trace you can check. Also ask it to "make this class immutable and list every defensive copy you added" — then verify each field yourself.</p>
<p><b>Where AI goes wrong:</b> it sometimes claims "<code>final</code> makes the object immutable", or that <code>substring</code> shares the parent array (true only before Java 7u6), or gives Java 8 memory numbers (2 bytes per char always). <b>What you must still own:</b> the arrow-vs-object mental model, the five reasons for immutability, and the judgement of when allocation cost actually matters in a hot loop.</p>`,
    problems: [{
      title: 'Normalize a Username (no lost updates)',
      level: 'Easy', tags: ['strings', 'immutability', 'StringBuilder'], companies: ['TCS', 'Infosys', 'Amazon'],
      statement: `<p>Write <code>String normalize(String s)</code> that turns a raw display name into a username: remove leading and trailing whitespace, convert every letter to lower case, and replace each <b>run</b> of internal whitespace (spaces, tabs, newlines — any length) with a single underscore <code>_</code>. If <code>s</code> is <code>null</code>, return the empty String. Remember: Strings never change in place, so every step must produce and keep a new value.</p>`,
      constraints: `0 ≤ s.length() ≤ 10<sup>5</sup>; any characters; must run in O(n)`,
      example: `<p>Input <code>"  Asha&nbsp;&nbsp;&nbsp;Rao "</code> → Output ${H.c('g', '<code>"asha_rao"</code>')}. The two outer spaces disappear, the three inner spaces become one <code>_</code>, letters are lower-cased.</p><p>Input <code>null</code> → <code>""</code>.</p>`,
      brute: {
        why: `<p>The tempting solution keeps calling <code>replace("  ", " ")</code> until no double spaces remain. Each pass scans and <b>copies the whole String</b> (immutability!), and a run of k spaces needs about log k passes — worse, a naive loop that removes one space per pass is O(n²). It also forgets tabs and newlines. And a common bug: calling <code>s.trim();</code> without assigning it.</p>`,
        code: R`
static String normalizeBrute(String s) {
    if (s == null) return "";
    s = s.trim().toLowerCase();                 // assign! (String is immutable)
    while (s.contains("  ")) {                  // every pass copies the whole String
        s = s.replace("  ", " ");
    }
    return s.replace(' ', '_');                 // misses tabs/newlines
}`
      },
      mcq: { q: 'Your teammate\'s version starts with <code>s.trim(); s.toLowerCase();</code> then loops. What does it return for <code>"  AB "</code>?', options: ['"ab"', '"  AB " processed as if never trimmed or lower-cased', 'It throws an exception', '"_ab_"'], answer: 1, explain: 'Both calls return new Strings that are thrown away. <code>s</code> still refers to the original text, so later steps work on the untouched input.' },
      hints: [
        `<p>Hint 1: You only need to look at each character <b>once</b>. A character is either whitespace or part of a word.</p>`,
        `<p>Hint 2: Use one <code>StringBuilder</code> and a boolean flag "I have seen a gap since the last word". Write the <code>_</code> lazily — only when the <b>next</b> word starts.</p>`,
        `<p>Hint 3: Recipe — if null return ""; for each char c: if <code>Character.isWhitespace(c)</code> set gap = (builder not empty); else { if gap append '_' and clear gap; append <code>Character.toLowerCase(c)</code> }. Leading gaps are ignored because the builder is empty, trailing gaps are never written.</p>`
      ],
      tests: { sig: 'string -> string', fn: 'normalize', cases: [
        [["  Asha   Rao "],"asha_rao"],
        [[null],""],
        [[""],""],
        [["   "],""],
        [["A"],"a"],
        [["\tJava\n Dev"],"java_dev"],
        [["ALLCAPS"],"allcaps"],
        [["a b c"],"a_b_c"],
        [["  x"],"x"],
        [["x  "],"x"],
        [["a\t\n b"],"a_b"],
        [["Already_Normal"],"already_normal"],
        [["MiXeD 123 CaSe"],"mixed_123_case"],
        [["\n\n\n"],""],
        [["a\r\nb"],"a_b"],
        [[{"$rep":"A  ","n":33333}],{"$concat":[{"$rep":"a_","n":33332},"a"]}],
        [[{"$rep":" ","n":100000}],""],
        [[{"$rep":"Z","n":100000}],{"$rep":"z","n":100000}],
        [[{"$concat":[" ",{"$rep":"ab \t","n":25000}]}],{"$concat":[{"$rep":"ab_","n":24999},"ab"]}]
      ] },
      solution: {
        approach: `<p>Single pass with a <code>StringBuilder</code> (a mutable character buffer) and a "pending gap" flag. Because we only emit the underscore when the next word begins, leading and trailing whitespace vanish for free and any run collapses to one underscore.</p>`,
        code: R`
class Solution {
    static String normalize(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder(s.length());   // pre-size: no regrowth
        boolean pendingGap = false;                          // whitespace seen after a word?
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (Character.isWhitespace(c)) {
                pendingGap = sb.length() > 0;                // ignore leading whitespace
            } else {
                if (pendingGap) {                            // a new word begins after a gap
                    sb.append('_');
                    pendingGap = false;
                }
                sb.append(Character.toLowerCase(c));
            }
        }
        return sb.toString();                                // ONE final String is created
    }

    public static void main(String[] args) {
        System.out.println(normalize("  Asha   Rao "));      // asha_rao
        System.out.println(normalize("\tJava\n Dev"));       // java_dev
        System.out.println("[" + normalize(null) + "]");     // []
    }
}`,
        alt: [{ lang: 'python', code: `def normalize(s):\n    if s is None:\n        return ""\n    return "_".join(s.split()).lower()   # split() with no args splits on any whitespace run\n\nprint(normalize("  Asha   Rao "))` }],
        dry: { head: ['i', 'char', 'whitespace?', 'pendingGap', 'sb'], rows: [
          ['0', "' '", 'yes', 'false (sb empty)', '""'], ['1', "' '", 'yes', 'false', '""'], ['2', "'A'", 'no', 'false', '"a"'],
          ['3..5', "'sha'", 'no', 'false', '"asha"'], ['6..8', "'   '", 'yes', H.c('y', 'true'), '"asha"'], ['9', "'R'", 'no', 'true → append _', H.c('g', '"asha_r"')],
          ['10..11', "'ao'", 'no', 'false', '"asha_rao"'], ['12', "' '", 'yes', 'true (never used)', H.c('g', '"asha_rao"')]
        ] },
        complexity: `<p>Time <b>O(n)</b> — each char handled once, amortised O(1) appends. Space <b>O(n)</b> for the builder and the one result String. The brute force can be O(n²) because every <code>replace</code> copies the whole String.</p>`,
        followUps: ['Keep only letters and digits, dropping punctuation', 'Limit the result to 20 characters without cutting a surrogate pair in half', 'Make it locale-safe: why can toLowerCase() without Locale.ROOT break in Turkish?']
      }
    }]
  });
  /* ======================================================================
     TOPIC 2 — String pool, ==, equals, intern
     ====================================================================== */
  topics.push({
    title: 'The String Pool, == vs equals(), and intern()',
    analogy: `<p>Picture an office <b>badge rack</b> at reception. When the code says <code>"java"</code> as a literal, the receptionist first looks on the rack: if a <code>"java"</code> badge is already there, you get <b>that same badge</b>; if not, one is printed and hung on the rack for the next person. <code>new String("java")</code> is different — it is like ordering a <b>custom copy</b> from the print shop: you always get a fresh badge, even though the text is identical. Now two questions: <code>==</code> asks "<i>are you two holding the very same physical badge?</i>"; <code>equals()</code> asks "<i>do your badges say the same thing?</i>". And <code>intern()</code> means "<i>swap my custom copy for the rack's official one</i>".</p>`,
    explain: `<p>Java programs use the same text over and over ("OK", "id", "GET"). To save memory, the JVM keeps a <b>String pool</b> (also called the <b>String constant pool</b> or <b>StringTable</b>): a lookup table of unique String objects. Since Java 7 the pool's objects live in the normal <b>heap</b>, so unused pooled Strings can be garbage-collected.</p>
<h4>1. Who goes into the pool?</h4>
<ul>
<li><b>Every String literal</b> in your source code (<code>"java"</code>). Two identical literals anywhere in the program — even in different classes — become the <b>same object</b>.</li>
<li><b>Compile-time constants</b>: <code>"ja" + "va"</code> is glued together <b>by the compiler</b> into <code>"java"</code>, so it is pooled too. Same for <code>final String h = "ja";</code> then <code>h + "va"</code> — a <code>final</code> local initialised with a constant is itself a constant.</li>
<li>Anything you explicitly <b>intern()</b>.</li>
</ul>
<p>Who does <b>not</b>: <code>new String(...)</code>, and any String built <b>at runtime</b> — concatenation with a non-final variable, <code>substring</code>, <code>toUpperCase</code>, <code>StringBuilder.toString()</code>, text read from a file, network or <code>Scanner</code>.</p>
<h4>2. == compares arrows, equals() compares letters</h4>
${H.table(['Expression', 'Result', 'Why'], [
  ['<code>"java" == "java"</code>', H.c('g', 'true'), 'both literals → the one pooled object'],
  ['<code>"java" == new String("java")</code>', H.c('r', 'false'), '<code>new</code> always makes a fresh heap object'],
  ['<code>"java".equals(new String("java"))</code>', H.c('g', 'true'), 'same characters'],
  ['<code>"java" == "ja" + "va"</code>', H.c('g', 'true'), 'folded at compile time'],
  ['<code>String h = "ja"; "java" == h + "va"</code>', H.c('r', 'false'), '<code>h</code> is not final → concatenation happens at runtime → new object'],
  ['<code>final String h = "ja"; "java" == h + "va"</code>', H.c('g', 'true'), '<code>h</code> is a constant → folded'],
  ['<code>"java" == new String("java").intern()</code>', H.c('g', 'true'), 'intern() returns the pooled object']
])}
<p><b>The rule for real code:</b> compare String <b>content</b> with <code>equals()</code> (or <code>equalsIgnoreCase()</code>). Use <code>==</code> only to check <code>null</code>. Code that "works" with <code>==</code> in a unit test (where everything is a literal) usually breaks in production, where the text comes from users, files or databases.</p>
<h4>3. Null-safe comparisons</h4>
<pre><code>input.equals("yes")          // NullPointerException if input is null
"yes".equals(input)          // safe: literal first ("Yoda condition")
Objects.equals(input, other) // safe for both sides, true if both null</code></pre>
<h4>4. intern()</h4>
<p><code>s.intern()</code> looks up <code>s</code>'s text in the pool. If it is there, it returns the pooled object; otherwise it adds <code>s</code> to the pool and returns it. After interning, <code>==</code> works between interned Strings. It is rarely needed in application code (see the deep dive), but it is a favourite interview question.</p>
<h4>5. How many objects does <code>new String("java")</code> create?</h4>
<p>The classic answer: <b>one or two</b>. The literal <code>"java"</code> is put in the pool when the class's constant is first resolved (if it was not already there) — that is one object. Then <code>new</code> creates a <b>second</b> object on the heap with the same content. If <code>"java"</code> was already pooled, only the <code>new</code> one is created.</p>`,
    clues: [
      '"What does <code>s1 == s2</code> print?" with literals, <code>new String</code>, concatenation or <code>final</code> → it is a String-pool question; trace which objects are pooled',
      '"How many objects are created by <code>new String("abc")</code>?" → one or two (pool literal + heap object)',
      '"Compare user input to a constant" / "avoid NullPointerException" → <code>"CONST".equals(input)</code> or <code>Objects.equals</code>',
      '"Works in tests but fails in production when comparing strings" → someone used <code>==</code> instead of <code>equals()</code>',
      '"Millions of duplicate strings in memory" (country codes, status values) → interning / deduplication / enums',
      '"Where is the String pool stored?" → heap since Java 7 (PermGen before), GC-able',
      '"Case-insensitive compare" → <code>equalsIgnoreCase</code>; ordering → <code>compareTo</code> / <code>compareToIgnoreCase</code>'
    ],
    code: [R`
// Every classic pool comparison in one program (outputs in comments)
public class PoolDemo {
    public static void main(String[] args) {
        String a = "java";                  // literal -> pooled
        String b = "java";                  // same literal -> SAME pooled object
        String c = new String("java");      // forced new heap object
        String d = c.intern();              // pooled object for "java"
        String e = "ja" + "va";             // compile-time constant -> pooled "java"
        String half = "ja";                 // NOT final
        String f = half + "va";             // built at runtime -> new heap object
        final String fixed = "ja";          // final + constant initialiser = constant
        String g = fixed + "va";            // folded by javac -> pooled "java"

        System.out.println(a == b);         // true
        System.out.println(a == c);         // false
        System.out.println(a.equals(c));    // true  (same letters)
        System.out.println(a == d);         // true
        System.out.println(a == e);         // true
        System.out.println(a == f);         // false
        System.out.println(a == f.intern());// true
        System.out.println(a == g);         // true
    }
}`, R`
// Safe comparison helpers you should actually use
import java.util.Objects;

public class SafeCompare {
    public static void main(String[] args) {
        String answer = null;                               // e.g. missing form field
        System.out.println("yes".equals(answer));           // false, no NPE
        System.out.println(Objects.equals(answer, null));   // true (both null)
        System.out.println("Yes".equalsIgnoreCase("YES"));  // true
        System.out.println("apple".compareTo("banana") < 0);// true: apple sorts first
        StringBuilder sb = new StringBuilder("java");
        System.out.println("java".contentEquals(sb));       // true: compares with any CharSequence
    }
}`],
    codeTitle: ['Pool comparisons with outputs', 'Null-safe and content comparisons'],
    viz: [{
      title: 'String pool vs heap: who points where?',
      input: 'java',
      inputLabel: 'a word (letters only, 2-8)',
      gen: function (input) {
        var w = wordOf(input, 2, 8, 'Type one word of 2-8 letters, e.g. java');
        var p1 = w.slice(0, Math.ceil(w.length / 2)), p2 = w.slice(Math.ceil(w.length / 2));
        var q = function (x) { return '"' + x + '"'; };
        var code = ['String a = ' + q(w) + ';', 'String b = ' + q(w) + ';', 'String c = new String(' + q(w) + ');', 'String d = c.intern();', 'String e = ' + q(p1) + ' + ' + q(p2) + ';', 'String half = ' + q(p1) + ';', 'String f = half + ' + q(p2) + ';',
          'System.out.println(a == b);', 'System.out.println(a == c);', 'System.out.println(a.equals(c));', 'System.out.println(a == d);', 'System.out.println(a == e);', 'System.out.println(a == f);', 'System.out.println(a == f.intern());'].join('\n');
        var vy = { a: 6, b: 17, c: 28, d: 39, e: 50, half: 61, f: 72 };
        var pool = [], heap = [], refs = {};
        function poolAdd(t) { if (pool.indexOf(t) < 0) pool.push(t); return 'P:' + t; }
        function graph(hl, ehl, tags) {
          var nodes = [], edges = [];
          Object.keys(refs).forEach(function (v) { nodes.push({ id: v, label: v, x: 6, y: vy[v], shape: 'box', w: 8 }); edges.push([v, refs[v]]); });
          pool.forEach(function (t, i) { nodes.push({ id: 'P:' + t, label: 'POOL ' + q(t), x: 48, y: 12 + i * 22, shape: 'box' }); });
          heap.forEach(function (h, i) { nodes.push({ id: h.id, label: 'HEAP ' + q(h.t), x: 88, y: 20 + i * 34, shape: 'box' }); });
          return { type: 'graph', label: 'stack vars │ String pool (middle) │ ordinary heap objects (right)', directed: true, height: 80, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
        }
        var f = [], printed = [];
        function push(line, cls, narr, hl, ehl, tags, extra) {
          var parts = [{ type: 'code', label: 'Code', lang: 'java', code: code, hl: line ? one(line, cls || 'cur') : {} }, graph(hl, ehl, tags)];
          (extra || []).forEach(function (p) { parts.push(p); });
          parts.push(out(printed.join('\n')));
          f.push({ narr: narr, parts: parts });
        }
        var PW = poolAdd(w); refs.a = PW;
        push(1, 'cur', 'Line 1: the literal ' + q(w) + ' is looked up in the <b>pool</b>. Not there yet, so one object is created <b>in the pool</b> and <code>a</code> points to it.', one(PW, 'ok'), one('a-' + PW, 'ok'));
        refs.b = PW;
        push(2, 'cur', 'Line 2: same literal again → the pool <b>already has it</b>, so <code>b</code> gets the <b>very same object</b>. No new object.', one(PW, 'sel'), one('b-' + PW, 'ok'), one(PW, 'a, b share'));
        heap.push({ id: 'H1', t: w }); refs.c = 'H1';
        push(3, 'cur', 'Line 3: <code>new String(...)</code> <b>always</b> creates a fresh String object in the ordinary heap (internally it may reuse the pooled one\'s byte array, but it is a separate object). <code>c</code> points to this new object — same letters, different object.', { H1: 'ok' }, { 'c-H1': 'ok' }, { H1: 'new object' });
        refs.d = PW;
        push(4, 'cur', 'Line 4: <code>c.intern()</code> asks the pool "do you have ' + q(w) + '?" — yes — and returns the <b>pooled</b> object. So <code>d</code> points to the same object as <code>a</code>. (<code>c</code> itself is unchanged.)', one(PW, 'sel'), one('d-' + PW, 'ok'));
        refs.e = PW;
        push(5, 'cur', 'Line 5: ' + q(p1) + ' + ' + q(p2) + ' is made only of literals, so <b>javac folds it at compile time</b> into ' + q(w) + '. The .class file literally contains ' + q(w) + ' here → pooled object.', one(PW, 'sel'), one('e-' + PW, 'ok'), {}, [note('The compiler rewrote the line to <code>String e = ' + esc(q(w)) + ';</code> — no concatenation happens at runtime.')]);
        var PH = poolAdd(p1); refs.half = PH;
        push(6, 'cur', 'Line 6: the literal ' + q(p1) + ' is pooled too (a separate pooled object). <code>half</code> is a normal, <b>non-final</b> variable.', one(PH, 'ok'), one('half-' + PH, 'ok'));
        poolAdd(p2);
        heap.push({ id: 'H2', t: w }); refs.f = 'H2';
        push(7, 'cur', 'Line 7: <code>half + ' + q(p2) + '</code> uses a variable, so the join happens <b>at runtime</b> and produces a <b>brand-new heap object</b> ' + q(w) + ' — not the pooled one. (The literal ' + q(p2) + ' is pooled as a side effect.)', { H2: 'ok' }, { 'f-H2': 'ok' }, { H2: 'runtime concat' });
        var checks = [[8, 'a == b', true, 'same pooled object'], [9, 'a == c', false, 'pooled vs. new heap object'], [10, 'a.equals(c)', true, 'equals compares the <b>letters</b>, which match'], [11, 'a == d', true, 'intern() returned the pooled object'], [12, 'a == e', true, 'compile-time constant was pooled'], [13, 'a == f', false, 'runtime concatenation made a new object'], [14, 'a == f.intern()', true, 'intern() maps f\'s text to the pooled object']];
        checks.forEach(function (ch) {
          printed.push(String(ch[2]));
          var hl = {};
          if (ch[1].indexOf('c') >= 0) { hl[PW] = 'sel'; hl.H1 = ch[2] ? 'sel' : 'bad'; }
          else if (ch[1] === 'a == f') { hl[PW] = 'sel'; hl.H2 = 'bad'; }
          else hl[PW] = 'sel';
          push(ch[0], ch[2] ? 'ok' : 'bad', '<code>' + ch[1] + '</code> → <b>' + ch[2] + '</b>: ' + ch[3] + '.', hl, {}, {});
        });
        f.push({ narr: 'Takeaway: <b>==</b> asks "same object?", <b>equals()</b> asks "same letters?". Only literals, compile-time constants and interned Strings share the pooled object. Always use <code>equals()</code> for content.', parts: [{ type: 'table', label: 'Scorecard', columns: ['expression', '==', 'equals()'], rows: [['a vs b', 'true', 'true'], ['a vs c', 'false', 'true'], ['a vs d', 'true', 'true'], ['a vs e', 'true', 'true'], ['a vs f', 'false', 'true']], hl: { 1: 'bad', 4: 'bad' } }, out(printed.join('\n'))] });
        return f;
      }
    }, {
      title: 'How String.equals() decides (step by step)',
      input: 'apple,apples',
      inputLabel: 'two words separated by a comma',
      gen: function (input) {
        var parts = String(input === undefined || input === null ? '' : input).split(',');
        if (parts.length !== 2) throw new Error('Type two words separated by a comma, e.g. apple,apples');
        var x = parts[0].trim(), y = parts[1].trim();
        if (!/^[A-Za-z]{1,10}$/.test(x) || !/^[A-Za-z]{1,10}$/.test(y)) throw new Error('Each word: 1-10 letters, e.g. java,jaVa');
        var code = 'public boolean equals(Object other) {\n    if (this == other) return true;\n    if (!(other instanceof String s)) return false;\n    if (coder != s.coder) return false;\n    if (value.length != s.value.length) return false;\n    for (int i = 0; i < value.length; i++)\n        if (value[i] != s.value[i]) return false;\n    return true;\n}';
        var f = [];
        function fr(line, cls, narr, hx, hy, vals) {
          f.push({ narr: narr, parts: [{ type: 'code', label: 'Simplified JDK 21 String.equals', lang: 'java', code: code, hl: one(line, cls) }, { type: 'array', label: 'this.value ("' + x + '")', values: x.split(''), hl: hx || {} }, { type: 'array', label: 'other.value ("' + y + '")', values: y.split(''), hl: hy || {} }, { type: 'vars', label: 'checks', vals: vals || {} }] });
        }
        fr(2, 'cur', 'Shortcut first: are they the <b>same object</b>? Here we assume two different objects (e.g. one came from user input), so we must look at the content.', {}, {}, { 'this == other': false });
        fr(3, 'ok', 'Is the other thing even a String? Yes. (Comparing a String to a StringBuilder or an Integer always returns false — no exception.)', {}, {}, { 'instanceof String': true });
        fr(4, 'ok', 'Same <b>coder</b>? Both are plain letters, so both are LATIN1 (1 byte per char). Different coders would mean different content, so Java can return false immediately.', {}, {}, { coder: 'LATIN1 = LATIN1' });
        if (x.length !== y.length) {
          fr(5, 'bad', 'Lengths differ (' + x.length + ' vs ' + y.length + '), so they cannot be equal → <b>false</b> without looking at a single letter. Cheap checks come first.', {}, {}, { 'this length': x.length, 'other length': y.length, result: false });
        } else {
          fr(5, 'ok', 'Same length (' + x.length + '). Now compare byte by byte.', {}, {}, { length: x.length });
          var res = true;
          for (var i = 0; i < x.length; i++) {
            var same = x[i] === y[i], hx = {}, hy = {};
            for (var k = 0; k < i; k++) { hx[k] = 'done'; hy[k] = 'done'; }
            hx[i] = same ? 'ok' : 'bad'; hy[i] = same ? 'ok' : 'bad';
            fr(same ? 6 : 7, same ? 'cur' : 'bad', 'i = ' + i + ': <code>' + x[i] + '</code> vs <code>' + y[i] + '</code> → ' + (same ? 'match, keep going.' : '<b>different</b> (case matters: \'a\' is 97, \'A\' is 65) → return <b>false</b>.'), hx, hy, { i: i, 'this[i]': x.charCodeAt(i), 'other[i]': y.charCodeAt(i) });
            if (!same) { res = false; break; }
          }
          if (res) fr(8, 'ok', 'Every byte matched → <b>true</b>. That is why <code>equals</code> costs O(n) in the worst case, while <code>==</code> is a single pointer comparison.', {}, {}, { result: true });
        }
        f.push({ narr: 'Compare with <code>==</code>: it only checks whether both arrows point to the same object. For "' + esc(x) + '" vs "' + esc(y) + '" built at runtime, <code>==</code> is <b>false</b> even if the letters match. <code>equalsIgnoreCase</code> would also treat upper/lower case as equal.', parts: [{ type: 'table', label: 'Results', columns: ['method', 'result'], rows: [['x.equals(y)', String(x === y)], ['x.equalsIgnoreCase(y)', String(x.toLowerCase() === y.toLowerCase())], ['x == y (runtime-built)', 'false']] }] });
        return f;
      }
    }],
    examples: [
      { title: 'Predict the output: final changes everything', html: `<p>Only the <code>final</code> local with a constant initialiser is a compile-time constant, so only that concatenation is folded and pooled. Output: <code>false true</code>.</p>`, code: R`
String s1 = "ab";
final String s2 = "a";
String s3 = "a";
System.out.println((s3 + "b") == s1);   // false: s3 not final -> runtime concat
System.out.println((s2 + "b") == s1);   // true : folded to "ab" by javac` },
      { title: 'Strings from input never match with ==', html: `<p>Text read at runtime is a new heap object. The <code>==</code> check fails even though the user typed exactly "quit"; <code>equals</code> works. This is the most common real-world pool bug.</p>`, code: R`
public class Quit {
    public static void main(String[] args) {
        String typed = new StringBuilder("tiuq").reverse().toString(); // simulates user input "quit"
        System.out.println(typed == "quit");        // false
        System.out.println("quit".equals(typed));   // true
    }
}` },
      { title: 'switch on a String uses equals(), not ==', html: `<p>A <code>switch</code> on a String compiles to <code>hashCode()</code> to pick a branch, then <code>equals()</code> to confirm, so runtime-built Strings work correctly. Watch out: a <b>null</b> String in an old-style switch throws <code>NullPointerException</code> (Java 21 pattern switches can add <code>case null</code>).</p>`, code: R`
static int httpCode(String method) {
    return switch (method) {          // hashCode + equals under the hood
        case "GET", "HEAD" -> 200;
        case "POST" -> 201;
        default -> 405;
    };
}` },
      { title: 'Deduplicating a big repeated column', html: `<p>Loading 1 million rows whose <code>country</code> column has only ~200 distinct values creates 1 million String objects. Interning (or a small <code>HashMap</code> cache, or better an <code>enum</code>) keeps just 200. A private map is usually preferred over the global pool.</p>`, code: R`
Map<String, String> canon = new HashMap<>();
String raw = new String("IN");                       // pretend: parsed from a CSV line
String country = canon.computeIfAbsent(raw, k -> k); // first copy becomes the canonical one
System.out.println(country == canon.get("IN"));      // true` }
    ],
    deepDive: `<p><b>Where literals come from:</b> each class file has a <b>constant pool</b> with <code>CONSTANT_String</code> entries. The <code>ldc</code> bytecode that loads a literal resolves the entry lazily on first execution by calling the equivalent of <code>intern()</code>, so the object lands in the JVM-wide <b>StringTable</b> (a concurrent hash table implemented in C++). Since JDK 11 it resizes itself; you can still pre-size it with <code>-XX:StringTableSize</code> and inspect it with <code>-XX:+PrintStringTableStatistics</code> or <code>jcmd &lt;pid&gt; VM.stringtable</code>.</p>
<p><b>History:</b> before Java 7 the pool lived in <b>PermGen</b>, a small fixed-size area — heavy <code>intern()</code> caused <code>OutOfMemoryError: PermGen space</code>. Java 7 moved it to the main heap, and Java 8 replaced PermGen with Metaspace (which holds class metadata, not Strings).</p>
<p><b>Runtime concatenation:</b> since Java 9 (JEP 280) <code>a + b</code> compiles to an <code>invokedynamic</code> call to <code>StringConcatFactory.makeConcatWithConstants</code>, which builds the exact-size result in one go. Folding rules come from JLS §15.29 "constant expressions": only literals, <code>final</code> variables of primitive/String type initialised with constant expressions, and operators on them. A <code>final</code> <b>field</b> initialised in a constructor is <i>not</i> a constant.</p>
<p><b>Should you intern?</b> <code>intern()</code> is a native call into a global table: much slower than a <code>HashMap</code> lookup, and you cannot clear it. Prefer a private <code>HashMap</code> cache, an <code>enum</code>, or <code>-XX:+UseStringDeduplication</code> (which shares byte arrays, not objects). Interned Strings <i>are</i> GC-collectable once unreachable.</p>
<p><b>equals performance:</b> HotSpot replaces the byte-comparison loop with a vectorised <b>intrinsic</b> (SIMD compares many bytes per instruction). <code>hashCode</code> for Strings is cached, and <code>HashMap</code> compares cached hashes before calling <code>equals</code>, which is why String keys are fast.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants rarely write <code>==</code> for String content in new code, but they will confidently "explain" pool puzzles wrong — especially the <code>final</code> folding case and the "how many objects" question — because many blog posts disagree. Treat any AI answer about object counts as a hypothesis and verify with a 10-line program or <code>javap -c</code> (look for <code>ldc</code> vs <code>invokedynamic makeConcatWithConstants</code>).</p>
<p><b>Use AI as a partner:</b> paste a snippet and ask <code>"Show me the javap bytecode you expect for each line and say which lines create objects"</code>, then run <code>javap -c</code> yourself and compare. Ask it to generate ten tricky <code>==</code> puzzles for practice — but compute the answers yourself first.</p>
<p><b>Where AI goes wrong:</b> claiming the pool is in PermGen (outdated), recommending <code>intern()</code> as a memory fix without measuring, or "fixing" an NPE by switching <code>input.equals("x")</code> to <code>input == "x"</code>. <b>What you must still own:</b> the identity-vs-equality distinction, the compile-time-constant rule, and the habit of writing <code>"CONST".equals(x)</code> or <code>Objects.equals</code>.</p>`,
    problems: [{
      title: 'Null-safe sameText() without calling equals()',
      level: 'Easy', tags: ['strings', 'equals', 'null-safety'], companies: ['Wipro', 'Accenture', 'Microsoft'],
      statement: `<p>Implement <code>static boolean sameText(String a, String b)</code> that returns <code>true</code> when both Strings contain exactly the same characters, <b>without</b> calling <code>equals</code>, <code>compareTo</code> or <code>Objects.equals</code>. Two <code>null</code>s count as the same text; a <code>null</code> and a non-null do not. It must work for Strings created at runtime (where <code>==</code> fails).</p>`,
      constraints: `0 ≤ length ≤ 10<sup>6</sup>; may be null; O(n) time, O(1) extra space`,
      example: `<p><code>sameText("java", new String("java"))</code> → ${H.c('g', 'true')} (different objects, same letters).<br><code>sameText("java", "Java")</code> → ${H.c('r', 'false')} ('j' ≠ 'J').<br><code>sameText(null, null)</code> → ${H.c('g', 'true')}; <code>sameText(null, "")</code> → ${H.c('r', 'false')}.</p>`,
      brute: {
        why: `<p>Two tempting shortcuts are both wrong. <code>a == b</code> compares <b>references</b>, so it fails for any runtime-built String. <code>a.equals(b)</code> is correct for content but throws <code>NullPointerException</code> when <code>a</code> is null (and is not allowed here).</p>`,
        code: R`
static boolean sameTextWrong(String a, String b) {
    return a == b;          // only true when both arrows point at the SAME object
}`
      },
      mcq: { q: 'What is the cheapest check to do <b>first</b> after the null checks?', options: ['Compare the first character', 'Compare <code>a == b</code> (same object → definitely equal)', 'Compute both hash codes', 'Sort both strings'], answer: 1, explain: 'If both references point to the same object the answer is instantly true. The real <code>String.equals</code> does exactly this, then compares lengths, then characters.' },
      hints: [
        `<p>Hint 1: Handle the reference cases first — same object (including both null) is true; exactly one null is false.</p>`,
        `<p>Hint 2: Different lengths can never be equal; that check is O(1).</p>`,
        `<p>Hint 3: Recipe — if (a == b) return true; if (a == null || b == null) return false; if lengths differ return false; loop i over 0..n-1 and return false at the first <code>charAt</code> mismatch; return true.</p>`
      ],
      tests: { sig: 'string string -> bool', fn: 'sameText', cases: [
        [["java","java"],true],
        [["java","Java"],false],
        [[null,null],true],
        [[null,""],false],
        [["",null],false],
        [["",""],true],
        [["a","ab"],false],
        [["ab","a"],false],
        [["abc","abd"],false],
        [["abc","xbc"],false],
        [["a b","a b"],true],
        [["a b","a  b"],false],
        [["x","x"],true],
        [["ab","ba"],false],
        [[{"$rep":"a","n":1000000},{"$rep":"a","n":1000000}],true],
        [[{"$rep":"a","n":1000000},{"$concat":[{"$rep":"a","n":999999},"b"]}],false],
        [[{"$concat":["b",{"$rep":"a","n":999999}]},{"$rep":"a","n":1000000}],false],
        [[{"$rep":"a","n":1000000},{"$rep":"a","n":999999}],false]
      ] },
      solution: {
        approach: `<p>Mirror what the JDK does: identity shortcut, null guard, length guard, then a left-to-right scan that exits at the first mismatch.</p>`,
        code: R`
class Solution {
    static boolean sameText(String a, String b) {
        if (a == b) return true;                       // same object, or both null
        if (a == null || b == null) return false;      // exactly one is null
        if (a.length() != b.length()) return false;    // O(1) early exit
        for (int i = 0; i < a.length(); i++) {
            if (a.charAt(i) != b.charAt(i)) return false;  // first mismatch decides
        }
        return true;
    }

    public static void main(String[] args) {
        System.out.println(sameText("java", new String("java"))); // true
        System.out.println(sameText("java", "Java"));             // false
        System.out.println(sameText(null, null));                 // true
        System.out.println(sameText(null, ""));                   // false
    }
}`,
        alt: [{ lang: 'python', code: `def same_text(a, b):\n    if a is b:\n        return True\n    if a is None or b is None:\n        return False\n    if len(a) != len(b):\n        return False\n    return all(x == y for x, y in zip(a, b))\n\nprint(same_text("java", "".join(["ja", "va"])))` }],
        dry: { head: ['step', 'a', 'b', 'check', 'result'], rows: [
          ['1', '"java" (pool)', '"java" (new)', 'a == b?', 'no, continue'], ['2', '', '', 'any null?', 'no'], ['3', '', '', 'length 4 == 4', 'continue'],
          ['4', '', '', "i=0 'j'=='j' … i=3 'a'=='a'", H.c('g', 'return true')], ['5 (2nd call)', '"java"', '"Java"', "i=0 'j'(106) vs 'J'(74)", H.c('r', 'return false')]
        ] },
        complexity: `<p>Time <b>O(n)</b> worst case (all characters equal), O(1) when lengths differ or references match. Extra space <b>O(1)</b>.</p>`,
        followUps: ['Add an ignore-case version (watch out for characters like the German ß)', 'Why does the JDK check the coder before the length?', 'Write sameText for any CharSequence (StringBuilder too)']
      }
    }]
  });
  /* ======================================================================
     TOPIC 3 — StringBuilder vs StringBuffer
     ====================================================================== */
  topics.push({
    title: 'StringBuilder vs StringBuffer (and why + in a loop is slow)',
    analogy: `<p>A String is a laminated badge; a <b>StringBuilder</b> is a <b>personal whiteboard</b>. You can write, erase, insert and rewrite as much as you like, and only when you are done do you "print the badge" with <code>toString()</code>. A <b>StringBuffer</b> is the same whiteboard bolted inside a <b>meeting room with a lock</b>: only one person may write at a time. That is great if many people share it, but if you are alone you still have to unlock and lock the door for every single word — pure wasted time.</p>`,
    explain: `<p>Because Strings are immutable, building text piece by piece with <code>+</code> creates a <b>new String every time</b>. Java gives you <b>mutable</b> text buffers for this job.</p>
<h4>1. The three text types side by side</h4>
${H.table(['', 'String', 'StringBuilder', 'StringBuffer'], [
  ['Mutable?', H.c('r', 'no'), H.c('g', 'yes'), H.c('g', 'yes')],
  ['Thread-safe?', 'yes (immutable)', H.c('r', 'no'), 'yes (every method <code>synchronized</code>)'],
  ['Speed for building text', 'slow in loops', H.c('g', 'fastest'), 'a bit slower (locking)'],
  ['Since', 'Java 1.0', 'Java 5', 'Java 1.0 (legacy)'],
  ['equals() compares content?', H.c('g', 'yes'), H.c('r', 'no — identity!'), H.c('r', 'no — identity!')],
  ['Use it for', 'values, keys, results', '99% of text building', 'almost never in new code']
])}
<h4>2. Why <code>+</code> in a loop is O(n²)</h4>
<pre><code>String s = "";
for (int i = 0; i &lt; n; i++) s += "x";   // copies 0+1+2+...+(n-1) chars</code></pre>
<p>Each <code>+=</code> makes a brand-new String and copies all the old characters into it. For n = 100 000 that is about <b>5 billion</b> character copies. With a <code>StringBuilder</code> each append just writes into spare room in an internal array, so the total work is O(n).</p>
<p>(A single expression like <code>"Hi " + name + "!"</code> is perfectly fine — the compiler builds it efficiently in one go. The problem is only <b>repeated</b> <code>+=</code> in a loop.)</p>
<h4>3. How StringBuilder works inside</h4>
<p>It keeps a <code>byte[]</code> with spare <b>capacity</b> (default <b>16</b> chars) and a <code>count</code> of chars used. When an append does not fit, it grows to <b>old × 2 + 2</b> (16 → 34 → 70 → 142 …), copying once. Doubling means copies are rare, so appends are <b>amortised O(1)</b>. If you know the final size, pass it: <code>new StringBuilder(1000)</code> avoids all regrowth.</p>
<h4>4. The everyday methods (all return <code>this</code>, so you can chain)</h4>
${H.table(['Method', 'Example on "Java"', 'Result'], [
  ['<code>append(x)</code>', 'append(21)', '"Java21"'],
  ['<code>insert(i, x)</code>', 'insert(0, "Hi ")', '"Hi Java"'],
  ['<code>delete(start, end)</code>', 'delete(1, 3)', '"Ja" (removes index 1..2)'],
  ['<code>deleteCharAt(i)</code>', 'deleteCharAt(0)', '"ava"'],
  ['<code>replace(start, end, s)</code>', 'replace(0, 1, "K")', '"Kava"'],
  ['<code>reverse()</code>', 'reverse()', '"avaJ"'],
  ['<code>setCharAt(i, c)</code>', "setCharAt(0, 'L')", '"Lava"'],
  ['<code>setLength(n)</code>', 'setLength(2)', '"Ja" (also used to clear: setLength(0))'],
  ['<code>toString()</code>', 'toString()', 'a new immutable String copy']
])}
<h4>5. Traps</h4>
<ul>
<li><code>sb1.equals(sb2)</code> is <b>identity</b> (inherited from <code>Object</code>). Compare with <code>sb1.toString().equals(sb2.toString())</code>, <code>sb1.compareTo(sb2) == 0</code> (Java 11+), or <code>"text".contentEquals(sb)</code>.</li>
<li><code>new StringBuilder('a')</code> does <b>not</b> contain "a": the char is widened to <code>int</code> 97 and treated as a <b>capacity</b>! The builder is empty.</li>
<li>Never use a StringBuilder as a <code>HashMap</code> key — it is mutable and has identity <code>hashCode</code>.</li>
<li>StringBuffer makes each <b>single</b> call thread-safe, but <code>if (buf.length() &lt; 10) buf.append(x)</code> is still a race: two calls, two separate locks.</li>
</ul>
<h4>6. Friendly alternatives</h4>
<p><code>String.join(", ", list)</code>, <code>new StringJoiner(", ", "[", "]")</code>, <code>stream.collect(Collectors.joining(","))</code>, <code>"ab".repeat(3)</code>, <code>String.format</code> / <code>"%d items".formatted(n)</code>, and text blocks (<code>"""</code>) for multi-line literals.</p>`,
    clues: [
      '"Build a string in a loop" / "concatenate N pieces" / N up to 10<sup>5</sup> → <code>StringBuilder</code>, never <code>+=</code>',
      '"Reverse a string" / "remove characters" / "insert at position" → <code>StringBuilder.reverse / deleteCharAt / insert</code>',
      '"StringBuilder vs StringBuffer?" → same API; Buffer is synchronized (legacy), Builder is faster and preferred',
      '"Is StringBuffer thread-safe?" follow-up "is check-then-append safe?" → single calls yes, compound actions no',
      '"Why does sb1.equals(sb2) print false?" → StringBuilder does not override equals',
      '"Time complexity of string concatenation in a loop" → O(n²) total copies vs amortised O(n)',
      '"Join with a separator / prefix / suffix" → <code>String.join</code>, <code>StringJoiner</code>, <code>Collectors.joining</code>'
    ],
    code: [R`
// StringBuilder tour: chaining, editing in place, capacity
public class BuilderTour {
    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder();      // capacity 16, length 0
        sb.append("Java").append(' ').append(21);    // chaining: each append returns this
        System.out.println(sb + " len=" + sb.length() + " cap=" + sb.capacity()); // Java 21 len=7 cap=16

        sb.insert(0, "Hello ");                      // Hello Java 21
        sb.replace(6, 10, "Duke");                   // Hello Duke 21
        sb.deleteCharAt(sb.length() - 1);            // Hello Duke 2
        sb.setCharAt(0, 'J');                        // Jello Duke 2
        System.out.println(sb);

        System.out.println(new StringBuilder("level").reverse()); // level (a palindrome)

        StringBuilder a = new StringBuilder("x"), b = new StringBuilder("x");
        System.out.println(a.equals(b));                      // false: identity!
        System.out.println(a.toString().equals(b.toString()));// true
        System.out.println(a.compareTo(b) == 0);              // true (Java 11+)

        StringBuilder trap = new StringBuilder('a');          // 'a' -> int 97 -> CAPACITY
        System.out.println("[" + trap + "] cap=" + trap.capacity()); // [] cap=97

        sb.setLength(0);                                       // fast way to clear and reuse
        System.out.println("cleared len=" + sb.length());     // cleared len=0
    }
}`, R`
// Same job three ways: += (slow), StringBuilder (fast), joining (clean)
import java.util.*;
import java.util.stream.*;

public class JoinThreeWays {
    public static void main(String[] args) {
        List<String> names = List.of("asha", "ben", "chen");

        String slow = "";
        for (String n : names) slow += n + ",";          // new String every iteration
        slow = slow.substring(0, slow.length() - 1);     // chop the last comma

        StringBuilder sb = new StringBuilder();
        for (String n : names) {
            if (sb.length() > 0) sb.append(',');          // separator only BETWEEN items
            sb.append(n);
        }

        String clean = String.join(",", names);
        String streamed = names.stream().map(String::toUpperCase).collect(Collectors.joining(",", "[", "]"));

        System.out.println(slow + " | " + sb + " | " + clean + " | " + streamed);
        // asha,ben,chen | asha,ben,chen | asha,ben,chen | [ASHA,BEN,CHEN]
    }
}`],
    codeTitle: ['StringBuilder methods and traps', 'Joining text: three approaches'],
    viz: [{
      title: 'Inside a StringBuilder: count, capacity and regrowth',
      input: 'Java is fun to learn',
      inputLabel: 'words to append (max 60 chars total)',
      gen: function (input) {
        var words = String(input === undefined || input === null ? '' : input).trim().split(/\s+/).filter(Boolean);
        if (!words.length) throw new Error('Type a few words, e.g. Java is fun to learn');
        var full = words.join(' ');
        if (full.length > 60 || words.length > 12) throw new Error('Keep it to 60 characters / 12 words');
        var cap = 16, buf = [], f = [], copies = 0;
        function view(hl) {
          var vals = [];
          for (var i = 0; i < cap; i++) vals.push(i < buf.length ? buf[i] : '·');
          return { type: 'array', label: 'internal byte[] (capacity ' + cap + ', · = spare room)', values: vals, hl: hl || {}, range: buf.length ? [0, buf.length - 1] : undefined };
        }
        f.push({ narr: '<code>new StringBuilder()</code> starts with an empty array of <b>capacity 16</b> and <code>count = 0</code>. Spare room is what makes appends cheap.', parts: [view(), { type: 'vars', label: 'fields', vals: { count: 0, capacity: cap, 'chars copied by regrowth': 0 } }, { type: 'code', label: 'Code', lang: 'java', code: 'StringBuilder sb = new StringBuilder();\nfor (String w : words) {\n    if (sb.length() > 0) sb.append(\' \');\n    sb.append(w);\n}\nString result = sb.toString();', hl: { 1: 'cur' } }] });
        words.forEach(function (w, wi) {
          var piece = (wi > 0 ? ' ' : '') + w;
          if (buf.length + piece.length > cap) {
            var old = cap;
            var need = buf.length + piece.length;
            cap = Math.max(old * 2 + 2, need);
            copies += buf.length;
            f.push({ narr: 'Appending "' + esc(piece) + '" needs ' + need + ' slots but capacity is only ' + old + '. The builder <b>grows to old × 2 + 2 = ' + cap + '</b> and copies the ' + buf.length + ' existing chars <b>once</b> into the bigger array.', parts: [view(), { type: 'vars', label: 'fields', vals: { count: buf.length, capacity: old + ' → ' + cap, 'chars copied by regrowth': copies }, hl: { capacity: 'bad' } }] });
          }
          var hl = {};
          for (var k = 0; k < piece.length; k++) { hl[buf.length] = 'ok'; buf.push(piece[k]); }
          f.push({ narr: 'Append "' + esc(piece) + '": the chars are written straight into spare slots — <b>no new object</b>, nothing old is copied. count is now ' + buf.length + '.', parts: [view(hl), { type: 'vars', label: 'fields', vals: { count: buf.length, capacity: cap, 'chars copied by regrowth': copies }, hl: { count: 'ok' } }] });
        });
        var n = buf.length, plus = 0, acc = 0;
        words.forEach(function (w, wi) { acc += (wi > 0 ? 1 : 0) + w.length; plus += acc; });
        f.push({ narr: '<code>toString()</code> copies the ' + n + ' used chars into one new immutable String. Total chars copied: ' + n + ' appended + ' + copies + ' regrowth + ' + n + ' final = <b>' + (2 * n + copies) + '</b>. The same job with <code>s += piece</code> would copy about <b>' + plus + '</b> chars.', parts: [{ type: 'bars', label: 'characters copied (lower is better)', values: [2 * n + copies, plus], idxLabels: ['StringBuilder', 'String +='], hl: { 0: 'ok', 1: 'bad' } }, out(full)] });
        f.push({ narr: 'Tip: if you know the final size, write <code>new StringBuilder(' + n + ')</code>. Then there is <b>no regrowth at all</b> — just the appends and one final copy. The builder can also be reused with <code>setLength(0)</code>.', parts: [{ type: 'code', label: 'Pre-sized builder', lang: 'java', code: 'StringBuilder sb = new StringBuilder(' + n + '); // capacity ' + n + ', zero regrowths\nfor (String w : words) {\n    if (sb.length() > 0) sb.append(\' \');\n    sb.append(w);\n}', hl: { 1: 'ok' } }, { type: 'vars', label: 'with pre-sizing', vals: { capacity: n, regrowths: 0, 'chars copied': 2 * n } }] });
        return f;
      }
    }, {
      title: 'Cost race: s += "x" versus sb.append("x")',
      input: '12',
      inputLabel: 'n = number of appends (1-30)',
      gen: function (input) {
        var n = intOf(input, 1, 30, 'Enter n between 1 and 30');
        var f = [], plus = 0, sb = 0, cap = 16, len = 0, grows = 0;
        f.push({ narr: 'We append one char, n = ' + n + ' times, two ways. We count <b>characters copied</b> — the real work the CPU does.', parts: [{ type: 'code', label: 'Two loops', lang: 'java', code: 'String s = "";\nfor (int i = 0; i < n; i++) s += "x";     // new String each time\n\nStringBuilder sb = new StringBuilder();\nfor (int i = 0; i < n; i++) sb.append("x"); // writes into spare room', hl: {} }, { type: 'bars', label: 'chars copied so far', values: [0, 0], idxLabels: ['String +=', 'StringBuilder'] }] });
        for (var i = 1; i <= n; i++) {
          plus += i;                          // new String of length i copies i chars
          var grew = false;
          if (len + 1 > cap) { sb += len; cap = cap * 2 + 2; grows++; grew = true; }
          sb += 1; len++;
          f.push({ narr: 'i = ' + i + ': <code>s += "x"</code> builds a <b>new</b> String of length ' + i + ' (copies ' + i + ' chars). <code>sb.append</code> writes 1 char' + (grew ? ' <span class="c-y">after one regrowth to capacity ' + cap + '</span>' : '') + '.', parts: [{ type: 'bars', label: 'chars copied so far', values: [plus, sb], idxLabels: ['String +=', 'StringBuilder'], hl: { 0: 'bad', 1: 'ok' } }, { type: 'vars', label: 'state', vals: { i: i, 'String objects created': i, 'sb capacity': cap, regrowths: grows } }] });
        }
        f.push({ narr: 'Final score for n = ' + n + ': <b>' + plus + '</b> copies (n(n+1)/2, quadratic) versus <b>' + sb + '</b> (linear). For n = 100 000 that is ~5 000 000 000 vs ~300 000.', parts: [{ type: 'table', label: 'Growth', columns: ['n', 'String += copies', 'StringBuilder copies (≈)'], rows: [[String(n), String(plus), String(sb)], ['1 000', '500 500', '≈ 3 000'], ['100 000', '≈ 5 000 000 000', '≈ 300 000']], hl: { 0: 'sel' } }] });
        f.push({ narr: 'Why the difference? <code>s += "x"</code> must build a <b>whole new String</b> each time (immutability), so the work grows like 1 + 2 + … + n. A StringBuilder writes into <b>spare room</b> and only copies when it doubles, so the work grows like n.', parts: [{ type: 'table', label: 'Rule', columns: ['pattern', 'total cost'], rows: [['one expression: "a" + b + "c"', 'fine (built once)'], ['s += x inside a loop', H.c('r', 'O(n²)')], ['sb.append(x) inside a loop', H.c('g', 'O(n) amortised')]], hl: { 2: 'ok' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Predict the output: StringBuilder chaining is the same object', html: `<p><code>append</code> returns <code>this</code>, so <code>a</code> and <code>b</code> are the <b>same</b> builder. Changing through <code>b</code> is visible through <code>a</code>. Output: <code>true HiHi</code>.</p>`, code: R`
StringBuilder a = new StringBuilder("Hi");
StringBuilder b = a.append("Hi");        // returns the same object
System.out.println((a == b) + " " + a);  // true HiHi` },
      { title: 'Check-then-act is not safe even with StringBuffer', html: `<p>Every StringBuffer method locks individually, but the <code>if</code> and the <code>append</code> are <b>two</b> separate locked steps. Another thread can slip in between, so the buffer can exceed the limit. Fix: wrap both in one <code>synchronized (buf) { ... }</code> block — or better, avoid shared mutable text entirely.</p>`, code: R`
static void addIfRoom(StringBuffer buf, String piece) {
    synchronized (buf) {                         // one lock around the whole decision
        if (buf.length() + piece.length() <= 100) {
            buf.append(piece);
        }
    }
}` },
      { title: 'Building a CSV line correctly', html: `<p>Pre-size the builder, add the separator only <b>between</b> items, and you never need to chop a trailing comma. Output: <code>1,4,9,16,25</code>.</p>`, code: R`
int[] nums = {1, 2, 3, 4, 5};
StringBuilder sb = new StringBuilder(nums.length * 4);   // rough size guess
for (int i = 0; i < nums.length; i++) {
    if (i > 0) sb.append(',');
    sb.append(nums[i] * nums[i]);
}
System.out.println(sb);` },
      { title: 'Reverse words using reverse() twice', html: `<p>A neat trick: reverse the whole builder, then reverse each word back. "I love Java" → "avaJ evol I" → "Java love I". All in place on one buffer.</p>`, code: R`
static String reverseWords(String s) {
    StringBuilder sb = new StringBuilder(s).reverse();
    int start = 0;
    for (int i = 0; i <= sb.length(); i++) {
        if (i == sb.length() || sb.charAt(i) == ' ') {
            for (int l = start, r = i - 1; l < r; l++, r--) {   // reverse one word in place
                char t = sb.charAt(l); sb.setCharAt(l, sb.charAt(r)); sb.setCharAt(r, t);
            }
            start = i + 1;
        }
    }
    return sb.toString();
}` }
    ],
    deepDive: `<p><b>Shared parent:</b> both classes extend the package-private <code>AbstractStringBuilder</code>, which holds <code>byte[] value</code>, <code>byte coder</code> and <code>int count</code> — compact strings apply here too (a builder starts LATIN1 and "inflates" to UTF16 the first time a wide char is appended). Growth is computed by <code>ArraysSupport.newLength(oldLength, minGrowth, oldLength + 2)</code>, i.e. roughly double plus two, or exactly what is needed if that is more.</p>
<p><b>Is StringBuffer really slower?</b> Uncontended locking is cheap on modern HotSpot (biased locking was disabled by default in JDK 15 and removed in JDK 18, so each call does a real lightweight CAS lock). In micro-benchmarks StringBuffer is often 10–30% slower for append-heavy code; the bigger reason to prefer StringBuilder is that "thread-safe per call" almost never matches what you need. If threads must build text together, give each its own builder and merge, or use a <code>ConcurrentLinkedQueue</code> of pieces.</p>
<p><b>What javac does with +:</b> Java 5–8 compiled <code>a + b + c</code> to <code>new StringBuilder().append(a).append(b).append(c).toString()</code>. Java 9+ uses <code>invokedynamic</code> + <code>StringConcatFactory</code>, which can pre-compute the exact length and avoid even that builder. Neither rescues a loop: each iteration is a separate expression that allocates a new result.</p>
<p><b>toString cost:</b> <code>toString()</code> always copies (the builder may keep changing, the String must not). Calling it inside a loop is a hidden O(n²). <code>StringBuilder</code> implements <code>CharSequence</code> and <code>Comparable&lt;StringBuilder&gt;</code> (Java 11), so many APIs (<code>Pattern.matcher</code>, <code>contentEquals</code>) can read it without copying.</p>
<p><b>Big text:</b> the max length is about <code>Integer.MAX_VALUE - 8</code> chars; exceeding it throws <code>OutOfMemoryError</code> ("Requested array size exceeds VM limit"). For huge outputs, stream to a <code>Writer</code> instead of building one giant String.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLMs generate clean <code>StringBuilder</code> code readily, but they still sometimes emit <code>result += ...</code> inside loops in "quick" answers, or recommend <code>StringBuffer</code> because older tutorials did. They also love <code>new StringBuilder(someChar)</code> — the capacity trap — when converting from Python-like code.</p>
<p><b>Use AI as a partner:</b> ask it to <code>"write a JMH benchmark comparing += , StringBuilder and String.join for 10, 1 000 and 100 000 items"</code>, then run it yourself; real numbers beat folklore. Ask for a review checklist: "flag += in loops, toString() in loops, StringBuffer in new code, StringBuilder as map key".</p>
<p><b>Where AI goes wrong:</b> claiming StringBuffer makes compound operations atomic, or that the compiler optimises <code>+=</code> in loops away (it does not). <b>What you must still own:</b> knowing <i>why</i> repeated concatenation is quadratic, picking the right joiner for readability, and reasoning about thread confinement instead of reaching for a synchronized class.</p>`,
    problems: [{
      title: 'String Compression (run-length encoding)',
      level: 'Easy', tags: ['StringBuilder', 'two pointers'], companies: ['Amazon', 'Goldman Sachs', 'Zoho'],
      statement: `<p>Given a String of letters, compress runs of the same character as <i>character + count</i>: <code>"aaabcc"</code> → <code>"a3b1c2"</code>. If the compressed String is <b>not shorter</b> than the original, return the original instead.</p>`,
      constraints: `0 ≤ s.length() ≤ 10<sup>5</sup>; letters a–z, A–Z; must be O(n)`,
      example: `<p><code>"aabcccccaaa"</code> → ${H.c('g', '<code>"a2b1c5a3"</code>')} (length 8 &lt; 11).<br><code>"abc"</code> → <code>"a1b1c1"</code> would be longer (6 &gt; 3), so return ${H.c('y', '<code>"abc"</code>')}.</p>`,
      brute: {
        why: `<p>Using <code>result += c + count</code> creates a new String for every run, copying everything built so far — O(n²) in the worst case (e.g. "abab…", where every run has length 1). For n = 10<sup>5</sup> that is billions of character copies.</p>`,
        code: R`
static String compressBrute(String s) {
    String result = "";
    int i = 0;
    while (i < s.length()) {
        char c = s.charAt(i);
        int j = i;
        while (j < s.length() && s.charAt(j) == c) j++;
        result += c + "" + (j - i);       // new String each run: O(n^2) copying
        i = j;
    }
    return result.length() < s.length() ? result : s;
}`
      },
      mcq: { q: 'Which detail makes the compressed text correct for counts ≥ 10, like 12 a\'s?', options: ['Append the count as a char with <code>(char) count</code>', 'Append the int count, which writes its decimal digits "12"', 'Counts above 9 are impossible', 'Use <code>Integer.toBinaryString</code>'], answer: 1, explain: '<code>sb.append(int)</code> writes the decimal digits. Casting to char would write the character with code 12 (an invisible control char).' },
      hints: [
        `<p>Hint 1: Walk with two indexes: <code>i</code> marks the start of a run, <code>j</code> moves forward while the character is the same.</p>`,
        `<p>Hint 2: Append <code>c</code> and <code>j - i</code> into one StringBuilder; then jump <code>i = j</code>.</p>`,
        `<p>Hint 3: Edge cases — empty String returns ""; compare lengths at the end (or bail out early once the builder reaches s.length()). Recipe: i=0; while i&lt;n { j=i; while j&lt;n and s[j]==s[i] j++; sb.append(s[i]).append(j-i); i=j } return shorter.</p>`
      ],
      tests: { sig: 'string -> string', fn: 'compress', cases: [
        [["aabcccccaaa"],"a2b1c5a3"],
        [["abc"],"abc"],
        [["aaaaaaaaaaaa"],"a12"],
        [[""],""],
        [["a"],"a"],
        [["aa"],"aa"],
        [["aaa"],"a3"],
        [["aabb"],"aabb"],
        [["aaabb"],"a3b2"],
        [["aAaA"],"aAaA"],
        [["aabbcc"],"aabbcc"],
        [["aaaabbbb"],"a4b4"],
        [["zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"],"z112"],
        [["abbbbbbbbbbbbbc"],"a1b13c1"],
        [[{"$rep":"a","n":100000}],"a100000"],
        [[{"$rep":"ab","n":50000}],{"$rep":"ab","n":50000}],
        [[{"$concat":[{"$rep":"a","n":50000},{"$rep":"B","n":50000}]}],"a50000B50000"],
        [[{"$rep":"aab","n":33333}],{"$rep":"aab","n":33333}],
        [[{"$concat":[{"$rep":"a","n":10},{"$rep":"b","n":10},{"$rep":"c","n":10},{"$rep":"a","n":10}]}],"a10b10c10a10"]
      ] },
      solution: {
        approach: `<p>Two-pointer run scan writing into a single <code>StringBuilder</code>. Each character is visited once by <code>j</code>, each append is amortised O(1), and an early exit stops as soon as the compressed form can no longer be shorter.</p>`,
        code: R`
class Solution {
    static String compress(String s) {
        int n = s.length();
        StringBuilder sb = new StringBuilder(n);
        int i = 0;
        while (i < n) {
            char c = s.charAt(i);
            int j = i;
            while (j < n && s.charAt(j) == c) j++;   // extend the run
            sb.append(c).append(j - i);               // int -> decimal digits
            if (sb.length() >= n) return s;           // early exit: cannot win anymore
            i = j;                                    // next run starts where this ended
        }
        return sb.toString();
    }

    public static void main(String[] args) {
        System.out.println(compress("aabcccccaaa"));   // a2b1c5a3
        System.out.println(compress("abc"));           // abc
        System.out.println(compress("aaaaaaaaaaaa"));  // a12
    }
}`,
        alt: [{ lang: 'python', code: `from itertools import groupby\n\ndef compress(s):\n    out = "".join(f"{ch}{len(list(g))}" for ch, g in groupby(s))\n    return out if len(out) < len(s) else s\n\nprint(compress("aabcccccaaa"))` }],
        dry: { head: ['i', 'char', 'j (run end)', 'appended', 'sb'], rows: [
          ['0', 'a', '2', 'a2', '"a2"'], ['2', 'b', '3', 'b1', '"a2b1"'], ['3', 'c', '8', 'c5', '"a2b1c5"'], ['8', 'a', '11', 'a3', H.c('g', '"a2b1c5a3"')], ['11', '—', '—', 'loop ends', '8 &lt; 11 → return it']
        ] },
        complexity: `<p>Time <b>O(n)</b>: <code>j</code> only moves forward. Space <b>O(n)</b> for the builder. The <code>+=</code> version is O(n²) in the worst case.</p>`,
        followUps: ['Decompress "a2b1c5a3" back (counts can have several digits)', 'Do it in place on a char[] (LeetCode 443)', 'Why pre-size the StringBuilder with n?']
      }
    }]
  });
  /* ======================================================================
     TOPIC 4 — Wrapper classes
     ====================================================================== */
  topics.push({
    title: 'Wrapper Classes: Integer, Double, Character, Boolean & Friends',
    analogy: `<p>A primitive <code>int</code> is a <b>loose toy</b>: light, quick to grab, but you cannot put it on a shop shelf that only accepts <b>boxes</b>, and you cannot show "no toy here". A wrapper like <code>Integer</code> is that toy inside a <b>labelled gift box</b>. The box can go on any shelf (collections, generics), the shelf slot can be <b>empty</b> (<code>null</code>), and the box has handy <b>instructions printed on the side</b> (methods like <code>parseInt</code>, <code>compare</code>, <code>MAX_VALUE</code>). The price: boxes take more space and you have to open them to play.</p>`,
    explain: `<p>Java has 8 <b>primitive</b> types that are stored directly as raw values. Each one has a matching <b>wrapper class</b> in <code>java.lang</code> that stores the value inside an object.</p>
${H.table(['Primitive', 'Wrapper', 'Size', 'Handy members'], [
  ['<code>byte</code>', '<code>Byte</code>', '8 bit', 'MIN_VALUE = -128, MAX_VALUE = 127'],
  ['<code>short</code>', '<code>Short</code>', '16 bit', 'MAX_VALUE = 32767'],
  ['<code>int</code>', H.c('b', '<code>Integer</code>'), '32 bit', 'parseInt, valueOf, compare, toBinaryString, bitCount, MAX_VALUE'],
  ['<code>long</code>', '<code>Long</code>', '64 bit', 'parseLong, MAX_VALUE ≈ 9.2 × 10<sup>18</sup>'],
  ['<code>float</code>', '<code>Float</code>', '32 bit', 'parseFloat, isNaN, NaN, POSITIVE_INFINITY'],
  ['<code>double</code>', '<code>Double</code>', '64 bit', 'parseDouble, compare, isNaN, isInfinite'],
  ['<code>char</code>', H.c('b', '<code>Character</code>'), '16 bit', 'isDigit, isLetter, isLetterOrDigit, isWhitespace, toUpperCase, getNumericValue'],
  ['<code>boolean</code>', '<code>Boolean</code>', '—', 'parseBoolean, TRUE, FALSE, logicalXor']
])}
<p>Only two names are not just the capitalised primitive: <b>Integer</b> (not "Int") and <b>Character</b> (not "Char").</p>
<h4>1. Why wrappers exist</h4>
<ul>
<li><b>Generics and collections need objects:</b> <code>List&lt;int&gt;</code> does not compile; <code>List&lt;Integer&gt;</code> does.</li>
<li><b>"No value" with null:</b> a database column <code>age</code> may be missing; <code>Integer age = null</code> can say so, <code>int</code> cannot.</li>
<li><b>Utility methods and constants:</b> parsing text, converting bases, comparing safely, min/max limits.</li>
</ul>
<h4>2. Creating wrappers — use valueOf, not new</h4>
<pre><code>Integer a = Integer.valueOf(42);   // preferred: may reuse a cached object
Integer b = 42;                    // autoboxing: compiler writes Integer.valueOf(42)
Integer c = new Integer(42);       // deprecated since Java 9, "for removal" since 16</code></pre>
<h4>3. Converting text ↔ numbers</h4>
${H.table(['Call', 'Returns', 'Example'], [
  ['<code>Integer.parseInt("42")</code>', 'primitive <code>int</code>', '42'],
  ['<code>Integer.valueOf("42")</code>', '<code>Integer</code> object', '42 (boxed)'],
  ['<code>Integer.parseInt("ff", 16)</code>', 'int in any radix 2–36', '255'],
  ['<code>Integer.toString(255, 2)</code>', 'String', '"11111111"'],
  ['<code>Integer.toBinaryString(-1)</code>', 'two\'s-complement bits', '32 ones'],
  ['<code>String.valueOf(42)</code> or <code>"" + 42</code>', 'String', '"42"'],
  ['<code>Integer.parseInt(" 42")</code>', H.c('r', 'NumberFormatException'), 'spaces are NOT allowed (trim first)'],
  ['<code>Integer.parseInt("+42")</code>', 'int', '42 (a leading + is fine)'],
  ['<code>Integer.parseInt("2147483648")</code>', H.c('r', 'NumberFormatException'), 'out of int range'],
  ['<code>Double.parseDouble(" 3.5 ")</code>', 'double', '3.5 (Double <i>does</i> trim whitespace!)'],
  ['<code>Boolean.parseBoolean("YES")</code>', 'false', 'only "true" (any case) is true; never throws']
])}
<h4>4. Wrappers are immutable and final</h4>
<p>Like String, an <code>Integer</code> object never changes. <code>Integer i = 5; i++;</code> does not modify the object: it unboxes, adds 1, and boxes a <b>new</b> Integer into <code>i</code>. All numeric wrappers extend <code>Number</code>, so any of them can give you <code>intValue()</code>, <code>longValue()</code>, <code>doubleValue()</code>.</p>
<h4>5. Safe helpers you should know</h4>
<ul>
<li><code>Integer.compare(a, b)</code> — returns negative/0/positive without overflow (use it in comparators).</li>
<li><code>Integer.MAX_VALUE + 1</code> wraps to <code>Integer.MIN_VALUE</code>; <code>Math.addExact</code> throws instead.</li>
<li><code>Character.isDigit(c)</code>, <code>Character.isLetterOrDigit(c)</code>, <code>c - '0'</code> to turn <code>'7'</code> into 7.</li>
<li><code>Integer.bitCount</code>, <code>Integer.highestOneBit</code>, <code>Integer.reverse</code>, <code>Long.numberOfTrailingZeros</code> — bit tricks for DSA.</li>
<li><code>Double.compare</code> / <code>Double.isNaN</code> — because <code>NaN == NaN</code> is false.</li>
</ul>`,
    clues: [
      '"Store numbers in a List / Map / Set" → wrappers (<code>List&lt;Integer&gt;</code>), and beware boxing cost for millions of items',
      '"The value may be missing / unknown" (nullable DB column, optional JSON field) → wrapper type or <code>Optional</code>/<code>OptionalInt</code>',
      '"Convert string to integer" / "parse input" → <code>Integer.parseInt</code> (primitive) vs <code>valueOf</code> (object); handle <code>NumberFormatException</code>',
      '"Convert to binary / hex / base k" → <code>Integer.toBinaryString</code>, <code>toHexString</code>, <code>toString(n, radix)</code>, <code>parseInt(s, radix)</code>',
      '"Is this char a digit / letter?" → <code>Character.isDigit / isLetter / isLetterOrDigit</code>',
      '"Difference between parseInt and valueOf?" or "why is new Integer deprecated?" → caching and identity',
      '"Largest / smallest possible int" → <code>Integer.MAX_VALUE</code>, <code>Integer.MIN_VALUE</code> (and overflow when adding 1)'
    ],
    code: [R`
// Wrapper toolbox: parsing, radix, limits, Character helpers
public class WrapperTour {
    public static void main(String[] args) {
        int p = Integer.parseInt("123");               // primitive
        Integer o = Integer.valueOf("123");            // object (may be cached)
        System.out.println(p + o);                     // 246 (o unboxed for +)

        System.out.println(Integer.parseInt("ff", 16));      // 255
        System.out.println(Integer.toString(10, 2));         // 1010
        System.out.println(Integer.toHexString(255));        // ff
        System.out.println(Integer.bitCount(255));           // 8
        System.out.println(Integer.MAX_VALUE + 1);           // -2147483648 (overflow wraps)
        System.out.println(Long.MAX_VALUE);                  // 9223372036854775807

        char c = '7';
        System.out.println(Character.isDigit(c) + " " + (c - '0'));   // true 7
        System.out.println(Character.isLetterOrDigit('_'));            // false
        System.out.println(Character.toUpperCase('q'));                // Q

        System.out.println(Boolean.parseBoolean("TRUE") + " " + Boolean.parseBoolean("yes")); // true false
        System.out.println(Double.isNaN(0.0 / 0.0));                   // true

        try {
            Integer.parseInt("12a");
        } catch (NumberFormatException e) {
            System.out.println("bad number: " + e.getMessage());       // bad number: For input string: "12a"
        }
    }
}`, R`
// Number is the common parent: write one method for all numeric wrappers
import java.util.List;

public class SumAny {
    static double sum(List<? extends Number> values) {
        double total = 0;
        for (Number n : values) total += n.doubleValue();   // works for Integer, Long, Double...
        return total;
    }
    public static void main(String[] args) {
        System.out.println(sum(List.of(1, 2, 3)));          // 6.0
        System.out.println(sum(List.of(1.5, 2L, 3)));       // 6.5 (Double, Long, Integer mixed)
    }
}`],
    codeTitle: ['Wrapper utility tour', 'Number: the shared parent class'],
    viz: [{
      title: 'int[] vs Integer[]: values in a row vs arrows to boxes',
      input: '7 42 300',
      inputLabel: 'up to 5 integers',
      gen: function (input) {
        var a = String(input === undefined || input === null ? '' : input).trim().split(/[\s,]+/).filter(Boolean).map(Number);
        if (!a.length || a.length > 5 || a.some(function (x) { return !Number.isInteger(x) || Math.abs(x) > 100000; })) throw new Error('Type 1-5 whole numbers (|x| ≤ 100000), e.g. 7 42 300');
        var f = [];
        f.push({ narr: '<code>int[] p = {' + a.join(', ') + '};</code> stores the <b>raw values side by side</b> in one array object: ' + a.length + ' × 4 bytes of data. Reading <code>p[i]</code> is one memory access.', parts: [{ type: 'array', label: 'int[] p (values live inside the array)', values: a, hl: (function () { var h = {}; a.forEach(function (_, i) { h[i] = 'ok'; }); return h; })() }, { type: 'vars', label: 'memory (approx.)', vals: { 'array header': 16, 'data bytes': a.length * 4, total: 16 + Math.ceil(a.length * 4 / 8) * 8 } }] });
        var nodes = [{ id: 'arr', label: 'Integer[] w', x: 10, y: 30, shape: 'box' }], edges = [];
        for (var i = 0; i < a.length; i++) {
          nodes.push({ id: 'o' + i, label: 'Integer(' + a[i] + ')', x: 70, y: 6 + i * 12, shape: 'box' });
          var cached = a[i] >= -128 && a[i] <= 127;
          edges.push(['arr', 'o' + i, '[' + i + ']']);
          var hl = {}; hl['o' + i] = 'ok';
          var tags = {}; tags['o' + i] = cached ? 'from cache' : 'new object';
          f.push({ narr: '<code>w[' + i + '] = ' + a[i] + ';</code> autoboxes: the compiler writes <code>Integer.valueOf(' + a[i] + ')</code>. The array slot holds only an <b>arrow</b> (4 bytes) to a separate Integer object (~16 bytes). ' + (cached ? 'Values -128..127 come from a shared cache, so no new object is made.' : 'Outside -128..127, a <b>new</b> object is allocated.'), parts: [{ type: 'graph', label: 'Integer[] holds references; each value lives in its own box', directed: true, height: 64, nodes: nodes.slice(), edges: edges.slice(), hl: hl, tags: tags }] });
        }
        var boxedNew = a.filter(function (x) { return x < -128 || x > 127; }).length;
        var intBytes = 16 + Math.ceil(a.length * 4 / 8) * 8, boxBytes = 16 + Math.ceil(a.length * 4 / 8) * 8 + boxedNew * 16;
        f.push({ narr: 'Reading <code>w[i]</code> means: load the arrow, jump to the box, read the value (unboxing). More memory <b>and</b> an extra jump, which hurts CPU caches for big arrays.', parts: [{ type: 'bars', label: 'approximate bytes (this input)', values: [intBytes, boxBytes], idxLabels: ['int[]', 'Integer[]'], hl: { 0: 'ok', 1: 'bad' } }, { type: 'text', label: 'Rule of thumb', html: 'For <b>1 million</b> numbers: <code>int[]</code> ≈ 4 MB; <code>ArrayList&lt;Integer&gt;</code> ≈ 4 MB of references + ~16 MB of Integer boxes ≈ <b>20 MB</b>.' }] });
        f.push({ narr: 'So: use <b>primitives</b> (<code>int[]</code>, <code>IntStream</code>) for heavy number crunching, and <b>wrappers</b> when you need collections, generics or <code>null</code>.', parts: [{ type: 'table', label: 'Choose', columns: ['need', 'use'], rows: [['fast math, big arrays', 'int / int[] / IntStream'], ['List, Map, Set, generics', 'Integer'], ['"value may be missing"', 'Integer (null) or OptionalInt']] }] });
        return f;
      }
    }, {
      title: 'How Integer.parseInt reads text, digit by digit',
      input: '-472',
      inputLabel: 'text to parse (try 2147483648 or 12a)',
      gen: function (input) {
        var s = String(input === undefined || input === null ? '' : input);
        if (s.length > 14) throw new Error('Keep the text to 14 characters or fewer');
        var code = 'int i = 0, sign = 1, result = 0;\nif (s.charAt(0) == \'-\' || s.charAt(0) == \'+\') { sign = ...; i++; }\nwhile (i < s.length()) {\n    int d = s.charAt(i) - \'0\';\n    if (d < 0 || d > 9) throw new NumberFormatException();\n    if (result > (MAX - d) / 10) throw new NumberFormatException(); // overflow\n    result = result * 10 + d;\n    i++;\n}\nreturn sign * result;';
        var f = [], i = 0, sign = 1, res = 0, MAX = 2147483647;
        function fr(line, cls, narr, vals, hv) {
          var hl = {}; if (i < s.length) hl[i] = 'cur';
          f.push({ narr: narr, parts: [{ type: 'code', label: 'Simplified parseInt logic', lang: 'java', code: code, hl: one(line, cls) }, { type: 'array', label: 'input chars', values: s.length ? s.split('') : ['(empty)'], hl: hl }, { type: 'vars', label: 'state', vals: vals, hl: hv || {} }] });
        }
        if (!s.length) { fr(1, 'bad', 'Empty text → <b>NumberFormatException</b> immediately.', { result: 'NFE' }, { result: 'bad' }); fr(1, 'bad', 'Lesson: always validate or catch <code>NumberFormatException</code> when parsing user input.', {}, {}); fr(1, 'bad', 'Try typing <code>-472</code>.', {}, {}); fr(1, 'bad', 'Or <code>2147483648</code> to see overflow detection.', {}, {}); return f; }
        fr(1, 'cur', 'Start with result = 0. parseInt does <b>not</b> trim spaces, so the very first char matters.', { i: 0, sign: 1, result: 0 });
        if (s[0] === '-' || s[0] === '+') { sign = s[0] === '-' ? -1 : 1; fr(2, 'ok', 'Leading <code>' + s[0] + '</code> sets sign = ' + sign + '. Skip it.', { i: 0, sign: sign, result: 0 }, { sign: 'ok' }); i = 1; if (s.length === 1) { fr(2, 'bad', 'A sign with no digits → <b>NumberFormatException</b>.', { result: 'NFE' }, { result: 'bad' }); fr(10, 'bad', 'Nothing returned.', {}, {}); return f; } }
        var lim = sign < 0 ? MAX + 1 : MAX;
        while (i < s.length) {
          var d = s.charCodeAt(i) - 48;
          if (d < 0 || d > 9) { fr(5, 'bad', 'Char <code>' + esc(s[i]) + '</code> is not a digit (code ' + s.charCodeAt(i) + ' − 48 = ' + d + ') → <b>NumberFormatException</b>: For input string: "' + esc(s) + '".', { i: i, d: d, result: res }, { d: 'bad' }); return f; }
          if (res > (lim - d) / 10) { fr(6, 'bad', 'result × 10 + ' + d + ' would exceed ' + (sign < 0 ? '2147483648 (|MIN_VALUE|)' : '2147483647 (MAX_VALUE)') + ' → <b>NumberFormatException</b>. parseInt never silently overflows.', { i: i, d: d, result: res, limit: lim }, { result: 'bad' }); return f; }
          var prev = res; res = res * 10 + d;
          fr(7, 'ok', 'Char <code>' + s[i] + '</code> → digit ' + d + ' (char code minus <code>\'0\'</code>). result = ' + prev + ' × 10 + ' + d + ' = <b>' + res + '</b>.', { i: i, d: d, result: res }, { result: 'ok' });
          i++;
        }
        fr(10, 'ok', 'All chars consumed → return sign × result = <b>' + (sign * res) + '</b>.', { sign: sign, result: res, returned: sign * res }, { returned: 'sel' });
        return f;
      }
    }],
    examples: [
      { title: 'parseInt vs valueOf in one picture', html: `<p><code>parseInt</code> gives a primitive, so <code>==</code> compares values. <code>valueOf</code> gives objects; for 1000 (outside the cache) two calls give <b>two different objects</b>. Output: <code>true false true</code>.</p>`, code: R`
int a = Integer.parseInt("1000"), b = Integer.parseInt("1000");
Integer c = Integer.valueOf("1000"), d = Integer.valueOf("1000");
System.out.println((a == b) + " " + (c == d) + " " + c.equals(d));` },
      { title: 'Summing digits of a number string with Character', html: `<p><code>Character.getNumericValue</code> or <code>c - '0'</code> turns a digit char into its number. Non-digits are skipped. Output: <code>15</code> for "a1b2c3d9".</p>`, code: R`
String s = "a1b2c3d9";
int sum = 0;
for (char c : s.toCharArray()) {
    if (Character.isDigit(c)) sum += c - '0';   // '9' (57) - '0' (48) = 9
}
System.out.println(sum);` },
      { title: 'Safe parsing that never throws', html: `<p>Wrap <code>parseInt</code> in a helper that returns a default (or <code>OptionalInt</code>) for bad input. Output: <code>42 -1 -1</code>.</p>`, code: R`
public class SafeParse {
    static int parseOr(String s, int fallback) {
        if (s == null) return fallback;
        try {
            return Integer.parseInt(s.strip());       // strip spaces first
        } catch (NumberFormatException e) {
            return fallback;
        }
    }
    public static void main(String[] args) {
        System.out.println(parseOr(" 42 ", -1) + " " + parseOr("4x2", -1) + " " + parseOr("99999999999", -1));
    }
}` },
      { title: 'NaN is not equal to itself', html: `<p>With primitives, <code>NaN == NaN</code> is <b>false</b> (IEEE 754 rule). But <code>Double.equals</code> compares bit patterns, so boxed NaN <i>equals</i> itself — needed so NaN can live in a HashSet. Output: <code>false true true</code>.</p>`, code: R`
double x = 0.0 / 0.0;
Double bx = x;
System.out.println((x == x) + " " + bx.equals(bx) + " " + Double.isNaN(x));` }
    ],
    deepDive: `<p><b>Object size:</b> on a 64-bit HotSpot JVM with compressed class pointers, an object header is 12 bytes; an <code>Integer</code> adds a 4-byte <code>int value</code> → 16 bytes total. A <code>Long</code> or <code>Double</code> is 12 + 8 = 20 → padded to 24 bytes. A reference in an array is 4 bytes (compressed oops, heaps under ~32 GB). So <code>Long[]</code> of 1 million is ~4 MB of refs + ~24 MB of boxes versus 8 MB for <code>long[]</code>.</p>
<p><b>Deprecation of constructors:</b> <code>new Integer(5)</code> was deprecated in Java 9 and marked <code>forRemoval</code> in Java 16 (JEP 390, "warnings for value-based classes"). Wrappers are <b>value-based classes</b>: you must not rely on their identity (no <code>==</code>, no <code>synchronized (anInteger)</code> — javac warns). This prepares for <b>Project Valhalla</b>, where value classes may have no identity at all and <code>List&lt;int&gt;</code>-like specialisation may become possible.</p>
<p><b>Parsing details:</b> <code>Integer.parseInt</code> accumulates <b>negatively</b> internally (because |MIN_VALUE| = MAX_VALUE + 1), which is how it can parse "-2147483648". It accepts Unicode digits too (<code>Character.digit</code>), so <code>"٤٢"</code> (Arabic-Indic digits) parses to 42 — surprising if you validate with a regex like <code>[0-9]+</code> only. <code>Integer.decode</code> handles <code>0x</code>, <code>#</code> and leading-zero octal.</p>
<p><b>Primitive-friendly APIs:</b> <code>IntStream</code>, <code>OptionalInt</code>, <code>Arrays.sort(int[])</code>, and libraries like Eclipse Collections or fastutil (<code>IntArrayList</code>, <code>Int2IntOpenHashMap</code>) avoid boxing entirely. Escape analysis in the JIT can sometimes eliminate boxing in hot loops, but do not count on it for data that lives in collections.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants know the wrapper API by heart, so you rarely need to memorise every <code>Character</code> method. But they often pick <code>List&lt;Integer&gt;</code> for performance-critical code where <code>int[]</code> is 5× smaller, and they sometimes forget that <code>parseInt</code> does not trim input.</p>
<p><b>Use AI as a partner:</b> ask <code>"List every input this parser could receive that would throw NumberFormatException, then write JUnit tests for them"</code>. Ask it to estimate memory for <code>Map&lt;Long, Double&gt;</code> with 10 million entries — then check with JOL (Java Object Layout) or a heap dump; the gap teaches you a lot.</p>
<p><b>Where AI goes wrong:</b> suggesting <code>new Integer(x)</code> from old training data, claiming <code>Double.parseDouble</code> and <code>Integer.parseInt</code> treat whitespace the same way, or mixing up <code>Integer.toString(n, 2)</code> (signed, "-1010") with <code>toBinaryString</code> (two's complement). <b>What you must still own:</b> choosing primitive vs wrapper deliberately, defensive parsing at system boundaries, and knowing the numeric limits by heart for overflow reasoning.</p>`,
    problems: [{
      title: 'Strict String to int (your own parseInt)',
      level: 'Medium', tags: ['parsing', 'overflow', 'wrapper classes'], companies: ['Google', 'Amazon', 'Uber'],
      statement: `<p>Implement <code>static int parseStrict(String s)</code> that behaves like <code>Integer.parseInt</code> for base 10: an optional leading <code>+</code> or <code>-</code>, then one or more ASCII digits, nothing else (no spaces). Throw <code>NumberFormatException</code> for null, empty, a lone sign, any other character, or a value outside the <code>int</code> range. Do not call any library parser.</p>`,
      constraints: `0 ≤ s.length() ≤ 100; result must equal Integer.parseInt(s) for every valid input, including "-2147483648"`,
      example: `<p><code>"-472"</code> → ${H.c('g', '-472')}; <code>"+7"</code> → ${H.c('g', '7')}; <code>"-2147483648"</code> → ${H.c('g', '-2147483648')} (MIN_VALUE fits!); <code>"2147483648"</code> → ${H.c('r', 'NumberFormatException')} (one more than MAX_VALUE); <code>"12a"</code> → ${H.c('r', 'NumberFormatException')}.</p>`,
      brute: {
        why: `<p>Parsing into a <code>long</code> and range-checking at the end looks easy, but a 25-digit input overflows even a <code>long</code> and silently wraps to a wrong value that may pass the range check. Calling <code>Long.parseLong</code> is not allowed, and catching exceptions is no substitute for understanding the overflow check.</p>`,
        code: R`
static int parseBrute(String s) {
    long r = 0; int i = 0; boolean neg = false;
    if (s.charAt(0) == '-' || s.charAt(0) == '+') { neg = s.charAt(0) == '-'; i = 1; }
    for (; i < s.length(); i++) r = r * 10 + (s.charAt(i) - '0');   // long can overflow too!
    r = neg ? -r : r;
    if (r > Integer.MAX_VALUE || r < Integer.MIN_VALUE) throw new NumberFormatException(s);
    return (int) r;
}`
      },
      mcq: { q: 'Why does the JDK accumulate the result as a <b>negative</b> number?', options: ['It is faster on x86', 'Because |Integer.MIN_VALUE| is one larger than MAX_VALUE, so only the negative side can hold -2147483648', 'To support hex', 'It does not — that is a myth'], answer: 1, explain: 'int ranges from -2147483648 to 2147483647. Building +2147483648 first would overflow; building it negatively never does.' },
      hints: [
        `<p>Hint 1: Before doing <code>result * 10 + d</code>, check whether it <b>would</b> overflow: <code>result &gt; (limit - d) / 10</code>.</p>`,
        `<p>Hint 2: Use a <code>long</code>-free approach by accumulating negatively (like the JDK), or use a limit of 2147483648 for negatives and 2147483647 for positives with a <code>long</code> accumulator that never exceeds 2.2 × 10<sup>9</sup> because you check first.</p>`,
        `<p>Hint 3: Validate: null/empty → throw; sign handling; at least one digit; every char in '0'..'9'. Recipe: neg = first=='-'; limit = neg ? -MIN : MAX (as long); for each digit check overflow then accumulate; return neg ? -r : r.</p>`
      ],
      tests: { sig: 'string -> string', fn: 'psCheck',
        harness: { java: `class Check { static String psCheck(String s) { try { return String.valueOf(Solution.parseStrict(s)); } catch (NumberFormatException e) { return "NFE"; } } }`, python: `def ps_check(s):
    try:
        return str(parse_strict(s))
    except ValueError:
        return "NFE"
` }, cases: [
        [["-472"],"-472"],
        [["+7"],"7"],
        [["-2147483648"],"-2147483648"],
        [["2147483648"],"NFE"],
        [["12a"],"NFE"],
        [["0"],"0"],
        [["+0"],"0"],
        [["-0"],"0"],
        [["007"],"7"],
        [["-"],"NFE"],
        [["+"],"NFE"],
        [[""],"NFE"],
        [[null],"NFE"],
        [[" 12"],"NFE"],
        [["12 "],"NFE"],
        [["1_000"],"NFE"],
        [["--1"],"NFE"],
        [["+-1"],"NFE"],
        [["2147483647"],"2147483647"],
        [["-2147483649"],"NFE"],
        [["99999999999"],"NFE"],
        [["1.5"],"NFE"],
        [["٣"],"NFE"],
        [[{"$concat":[{"$rep":"0","n":99},"5"]}],"5"],
        [[{"$concat":["-",{"$rep":"0","n":98},"1"]}],"-1"],
        [[{"$rep":"9","n":100}],"NFE"],
        [[{"$concat":["-",{"$rep":"0","n":90},"2147483648"]}],"-2147483648"],
        [["4294967296"],"NFE"],
        [["2147483650"],"NFE"],
        [["21474836470"],"NFE"]
      ] },
      solution: {
        approach: `<p>Validate the shape, then accumulate digit by digit in a <code>long</code> with a <b>pre-check</b> against the side-specific limit (2147483648 for negatives, 2147483647 for positives). Because we check before multiplying, the accumulator never exceeds the limit, so no overflow can hide.</p>`,
        code: R`
class Solution {
    static int parseStrict(String s) {
        if (s == null || s.isEmpty()) throw new NumberFormatException("empty");
        int i = 0;
        boolean neg = false;
        char first = s.charAt(0);
        if (first == '-' || first == '+') {
            neg = first == '-';
            i = 1;
            if (s.length() == 1) throw new NumberFormatException("lone sign: " + s);
        }
        long limit = neg ? 2147483648L : 2147483647L;      // |MIN_VALUE| vs MAX_VALUE
        long r = 0;
        for (; i < s.length(); i++) {
            int d = s.charAt(i) - '0';
            if (d < 0 || d > 9) throw new NumberFormatException("For input string: \"" + s + "\"");
            if (r > (limit - d) / 10) throw new NumberFormatException("out of range: " + s); // check BEFORE growing
            r = r * 10 + d;
        }
        return (int) (neg ? -r : r);                         // -2147483648L fits in int
    }

    public static void main(String[] args) {
        System.out.println(parseStrict("-472"));            // -472
        System.out.println(parseStrict("-2147483648"));     // -2147483648
        try { parseStrict("2147483648"); } catch (NumberFormatException e) { System.out.println("NFE " + e.getMessage()); }
    }
}`,
        alt: [{ lang: 'python', code: `def parse_strict(s):\n    if not s:\n        raise ValueError("empty")\n    neg = s[0] == "-"\n    body = s[1:] if s[0] in "+-" else s\n    if not body or not all("0" <= c <= "9" for c in body):\n        raise ValueError(s)\n    r = 0\n    limit = 2**31 if neg else 2**31 - 1\n    for c in body:\n        r = r * 10 + (ord(c) - 48)\n        if r > limit:\n            raise ValueError("out of range")\n    return -r if neg else r\n\nprint(parse_strict("-472"))` }],
        dry: { head: ['char', 'd', 'check r &gt; (limit−d)/10', 'r after'], rows: [
          ["'-'", '—', 'neg = true, limit = 2147483648', '0'], ["'4'", '4', '0 &gt; 214748364? no', '4'], ["'7'", '7', '4 &gt; 214748364? no', '47'], ["'2'", '2', '47 &gt; 214748364? no', '472'], ['end', '—', '—', H.c('g', 'return -472')]
        ] },
        complexity: `<p>Time <b>O(n)</b>, space <b>O(1)</b>. The overflow pre-check costs one division per digit (the JDK uses a precomputed <code>multmin</code> to avoid even that).</p>`,
        followUps: ['Add a radix parameter (2..36) using Character.digit', 'LeetCode 8 "String to Integer (atoi)": skip leading spaces and clamp instead of throwing', 'Return OptionalInt instead of throwing']
      }
    }]
  });
  /* ======================================================================
     TOPIC 5 — Autoboxing / unboxing pitfalls and the Integer cache
     ====================================================================== */
  topics.push({
    title: 'Autoboxing, Unboxing & the Integer Cache (-128 to 127)',
    analogy: `<p>Imagine a gift shop with an <b>automatic wrapping counter</b>: hand over a toy and it comes back boxed; hand over a box and it comes back unwrapped. You never see it happen — that is <b>autoboxing</b> and <b>unboxing</b>. To save time, the shop keeps a <b>shelf of pre-wrapped boxes</b> for the 256 most popular toys (numbers -128 to 127). Ask for "100" twice and you get <b>the very same box</b> from the shelf both times. Ask for "1000" twice and the counter wraps <b>two separate boxes</b> — same toy inside, different boxes. And if you hand the counter an <b>empty slot</b> (<code>null</code>) and ask it to unwrap… there is nothing inside, and it crashes (<code>NullPointerException</code>).</p>`,
    explain: `<p><b>Autoboxing</b> (Java 5+) means the compiler silently converts between primitives and wrappers:</p>
${H.table(['You write', 'Compiler actually writes', 'Name'], [
  ['<code>Integer x = 5;</code>', '<code>Integer x = Integer.valueOf(5);</code>', 'boxing'],
  ['<code>int y = x;</code>', '<code>int y = x.intValue();</code>', 'unboxing'],
  ['<code>x++;</code>', '<code>x = Integer.valueOf(x.intValue() + 1);</code>', 'unbox, add, re-box (new object!)'],
  ['<code>list.add(7);</code>', '<code>list.add(Integer.valueOf(7));</code>', 'boxing']
])}
<p>Convenient — but because it is invisible, it hides five classic bugs.</p>
<h4>Pitfall 1: <code>==</code> on two wrappers compares objects (Integer cache)</h4>
<p><code>Integer.valueOf</code> returns a <b>cached</b> object for values <b>-128 to 127</b>; outside that range it creates a new object each time.</p>
<pre><code>Integer a = 127, b = 127;
System.out.println(a == b);     // true  (same cached object)
Integer c = 128, d = 128;
System.out.println(c == d);     // false (two different objects)
System.out.println(c.equals(d)); // true  (same value)</code></pre>
${H.table(['Wrapper', 'Cached values'], [['Integer', '-128..127 (upper bound can be raised with <code>-XX:AutoBoxCacheMax</code>)'], ['Byte, Short, Long', '-128..127 (fixed)'], ['Character', '0..127'], ['Boolean', 'TRUE and FALSE (only two objects ever)'], ['Float, Double', H.c('r', 'no cache at all')]])}
<p><b>Rule:</b> compare wrapper values with <code>equals()</code> or unbox first (<code>a.intValue() == b</code>). If one side is a primitive, <code>==</code> unboxes the other and compares values: <code>Integer c = 1000; int e = 1000; c == e</code> is <b>true</b>.</p>
<h4>Pitfall 2: unboxing <code>null</code> → NullPointerException</h4>
<pre><code>Map&lt;String, Integer&gt; stock = new HashMap&lt;&gt;();
int n = stock.get("mango");     // get returns null → null.intValue() → NPE</code></pre>
<p>Fix: <code>stock.getOrDefault("mango", 0)</code>, or keep it as <code>Integer</code> and check for null.</p>
<h4>Pitfall 3: the ternary operator that unboxes</h4>
<pre><code>Integer cached = null;
Integer qty = useCache ? cached : 0;   // NPE when useCache is true!</code></pre>
<p>When one branch is <code>Integer</code> and the other is <code>int</code>, the whole <code>?:</code> has type <b>int</b>, so Java unboxes <code>cached</code> → NPE. Fix: make both branches <code>Integer</code> (<code>Integer.valueOf(0)</code>) or use an if/else.</p>
<h4>Pitfall 4: <code>List&lt;Integer&gt;.remove(int)</code> vs <code>remove(Object)</code></h4>
<pre><code>List&lt;Integer&gt; list = new ArrayList&lt;&gt;(List.of(10, 20, 30));
list.remove(1);                    // removes INDEX 1 → [10, 30]
list.remove(Integer.valueOf(10));  // removes VALUE 10 → [30]</code></pre>
<p>Overload resolution prefers the exact primitive match <code>remove(int index)</code> over boxing.</p>
<h4>Pitfall 5: hidden objects in loops and cross-type equals</h4>
<ul>
<li><code>Long sum = 0L; for (...) sum += i;</code> creates a new <code>Long</code> per iteration — use <code>long</code>.</li>
<li><code>Long.valueOf(5).equals(5)</code> is <b>false</b>: the <code>5</code> boxes to <code>Integer</code>, and <code>Long.equals</code> requires a <code>Long</code>. <code>map.get(5)</code> on a <code>Map&lt;Long, V&gt;</code> therefore returns <code>null</code>!</li>
</ul>`,
    clues: [
      '"What does <code>Integer a = 127, b = 127; a == b</code> print? And with 128?" → Integer cache (-128..127)',
      '"NullPointerException on a line with no method call" (e.g. <code>int x = map.get(k);</code>) → unboxing null',
      '"Ternary operator throws NPE" → mixed <code>Integer</code>/<code>int</code> branches force unboxing',
      '"list.remove(1) removed the wrong element" → <code>remove(int index)</code> vs <code>remove(Object)</code>',
      '"Min Stack / two stacks compare tops with ==" fails only for big values → comparing boxed Integers by reference',
      '"Map&lt;Long, ...&gt;.get(5) returns null" → boxed type mismatch (Integer vs Long)',
      '"Loop is surprisingly slow / lots of garbage" with <code>Long</code>/<code>Integer</code> accumulators → boxing churn'
    ],
    code: [R`
// The autoboxing hall of fame — every line's output in a comment
import java.util.*;

public class BoxingTraps {
    public static void main(String[] args) {
        Integer a = 127, b = 127;
        System.out.println(a == b);                 // true  (cached)
        Integer c = 128, d = 128;
        System.out.println(c == d);                 // false (new objects)
        System.out.println(c.equals(d));            // true
        int e = 128;
        System.out.println(c == e);                 // true  (c unboxed, numbers compared)

        Long big = 127L;
        System.out.println(big.equals(127));        // false (127 boxes to Integer)
        System.out.println(big.equals(127L));       // true

        List<Integer> list = new ArrayList<>(List.of(10, 20, 30));
        list.remove(1);                             // by INDEX
        System.out.println(list);                   // [10, 30]
        list.remove(Integer.valueOf(10));           // by VALUE
        System.out.println(list);                   // [30]

        Map<String, Integer> stock = new HashMap<>();
        System.out.println(stock.getOrDefault("mango", 0));   // 0, safe
        try {
            int n = stock.get("mango");             // unboxing null
            System.out.println(n);
        } catch (NullPointerException ex) {
            System.out.println("NPE from unboxing null");
        }

        Integer cached = null;
        boolean useCache = true;
        try {
            Integer qty = useCache ? cached : 0;    // type of ?: is int -> unbox null
            System.out.println(qty);
        } catch (NullPointerException ex) {
            System.out.println("NPE from ternary");
        }
    }
}`, R`
// Fixes for the same traps
import java.util.*;

public class BoxingFixes {
    public static void main(String[] args) {
        Integer c = 1000, d = 1000;
        System.out.println(c.equals(d));                       // true: compare VALUES
        System.out.println(Objects.equals(c, d));              // true, and null-safe
        System.out.println(c.intValue() == d.intValue());      // true: unbox explicitly

        Integer cached = null;
        boolean useCache = true;
        Integer qty = useCache ? cached : Integer.valueOf(0);  // both branches Integer: no unboxing
        System.out.println(qty);                               // null (no crash)

        long sum = 0;                                          // primitive accumulator
        for (int i = 0; i < 1_000; i++) sum += i;
        System.out.println(sum);                               // 499500

        Map<Long, String> users = new HashMap<>();
        users.put(5L, "asha");
        System.out.println(users.get(5) + " " + users.get(5L)); // null asha
    }
}`],
    codeTitle: ['Five boxing traps with outputs', 'The fixes'],
    viz: [{
      title: 'Integer cache: same box or a new box?',
      input: '127',
      inputLabel: 'a whole number (try 127, 128, -128, -129, 1000)',
      gen: function (input) {
        var n = intOf(input, -100000, 100000, 'Enter a whole number between -100000 and 100000');
        var cached = n >= -128 && n <= 127;
        var code = 'Integer a = ' + n + ';      // Integer.valueOf(' + n + ')\nInteger b = ' + n + ';      // Integer.valueOf(' + n + ')\nSystem.out.println(a == b);\nSystem.out.println(a.equals(b));\nint c = ' + n + ';\nSystem.out.println(a == c);';
        var vo = 'static Integer valueOf(int i) {\n    if (i >= -128 && i <= IntegerCache.high)\n        return IntegerCache.cache[i + 128];\n    return new Integer(i);\n}';
        var f = [], printed = [];
        function g(refs, hl, ehl, tags) {
          var nodes = [{ id: 'cache', label: 'IntegerCache[256]: -128 … 127', x: 55, y: 8, shape: 'box' }], edges = [];
          if (cached && refs.length) nodes.push({ id: 'cv', label: 'Integer(' + n + ') in cache', x: 55, y: 30, shape: 'box' });
          if (!cached && refs.indexOf('a') >= 0) nodes.push({ id: 'oa', label: 'Integer(' + n + ') #1', x: 88, y: 32, shape: 'box' });
          if (!cached && refs.indexOf('b') >= 0) nodes.push({ id: 'ob', label: 'Integer(' + n + ') #2', x: 88, y: 52, shape: 'box' });
          if (cached && refs.length) edges.push(['cache', 'cv', '[' + (n + 128) + ']']);
          refs.forEach(function (r, i) { nodes.push({ id: r, label: 'var ' + r, x: 8, y: 25 + i * 20, shape: 'box' }); edges.push([r, cached ? 'cv' : (r === 'a' ? 'oa' : 'ob')]); });
          return { type: 'graph', label: 'stack refs → heap objects', directed: true, height: 64, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
        }
        function fr(line, cls, narr, refs, hl, ehl, tags, extra) {
          var parts = [{ type: 'code', label: 'Your code', lang: 'java', code: code, hl: line ? one(line, cls || 'cur') : {} }, g(refs, hl, ehl, tags)];
          (extra || []).forEach(function (p) { parts.push(p); });
          parts.push(out(printed.join('\n')));
          f.push({ narr: narr, parts: parts });
        }
        fr(0, '', 'When the class <code>Integer</code> is initialised, it builds a <b>cache of 256 Integer objects</b> for -128..127. Your number is <b>' + n + '</b> — ' + (cached ? 'inside' : 'outside') + ' that range.', [], { cache: 'win' }, {}, {}, [{ type: 'code', label: 'Integer.valueOf (simplified JDK source)', lang: 'java', code: vo, hl: { 2: 'cur' } }]);
        fr(1, 'cur', 'Line 1: <code>Integer a = ' + n + ';</code> is <b>autoboxing</b> → <code>Integer.valueOf(' + n + ')</code>. ' + (cached ? 'In range, so it returns the <b>pre-built</b> object from <code>cache[' + (n + 128) + ']</code>.' : 'Out of range, so it allocates a <b>new</b> Integer object.'), ['a'], cached ? { cv: 'ok' } : { oa: 'ok' }, {}, {}, [{ type: 'code', label: 'Integer.valueOf (simplified JDK source)', lang: 'java', code: vo, hl: cached ? { 2: 'ok', 3: 'ok' } : { 2: 'bad', 4: 'ok' } }]);
        fr(2, 'cur', 'Line 2: <code>Integer b = ' + n + ';</code> → valueOf again. ' + (cached ? 'Same cache slot → <b>the very same object</b>.' : 'Another <b>new</b> object, separate from a\'s.'), ['a', 'b'], cached ? { cv: 'sel' } : { ob: 'ok' }, {}, cached ? { cv: 'a and b share' } : { oa: 'a', ob: 'b' });
        printed.push(String(cached));
        fr(3, cached ? 'ok' : 'bad', '<code>a == b</code> compares <b>references</b> (arrows), not numbers. ' + (cached ? 'Both arrows hit the same cached object → <b>true</b>.' : 'Two different objects → <b>false</b>, even though both hold ' + n + '. This is the bug that only shows up with "large" numbers.'), ['a', 'b'], cached ? { cv: 'sel' } : { oa: 'bad', ob: 'bad' });
        printed.push('true');
        fr(4, 'ok', '<code>a.equals(b)</code> compares the <b>int values inside</b> → <b>true</b> for any number. This is the correct way.', ['a', 'b'], cached ? { cv: 'ok' } : { oa: 'ok', ob: 'ok' });
        fr(5, 'cur', '<code>int c = ' + n + ';</code> is a plain primitive on the stack — no object, no arrow.', ['a', 'b'], {}, {}, {}, [{ type: 'vars', label: 'primitive', vals: { c: n }, hl: { c: 'ok' } }]);
        printed.push('true');
        fr(6, 'ok', '<code>a == c</code> mixes a wrapper and a primitive, so Java <b>unboxes</b> <code>a</code> (<code>a.intValue()</code>) and compares numbers: ' + n + ' == ' + n + ' → <b>true</b>. Mixed comparisons are by value.', ['a', 'b'], cached ? { cv: 'sel' } : { oa: 'sel' }, {}, {}, [{ type: 'vars', label: 'after unboxing', vals: { 'a.intValue()': n, c: n }, hl: { 'a.intValue()': 'ok', c: 'ok' } }]);
        f.push({ narr: 'Try other inputs: <b>127</b> → true, <b>128</b> → false, <b>-128</b> → true, <b>-129</b> → false. Never rely on this — use <code>equals()</code>.', parts: [{ type: 'table', label: 'a == b for boxed values', columns: ['value', 'a == b', 'a.equals(b)'], rows: [['-129', 'false', 'true'], ['-128', 'true', 'true'], ['127', 'true', 'true'], ['128', 'false', 'true'], [String(n), String(cached), 'true']], hl: { 4: cached ? 'ok' : 'bad' } }, out(printed.join('\n'))] });
        return f;
      }
    }, {
      title: 'Where the hidden unboxing NPE comes from',
      input: 'mango',
      inputLabel: 'fruit to look up (apple and kiwi exist)',
      gen: function (input) {
        var k = wordOf(input, 1, 10, 'Type a fruit name (letters only), e.g. mango or apple');
        var stock = { apple: 5, kiwi: 130 };
        var has = Object.prototype.hasOwnProperty.call(stock, k);
        var val = has ? stock[k] : null;
        var code = 'Map<String, Integer> stock = Map.of("apple", 5, "kiwi", 130);\nInteger boxed = stock.get("' + k + '");\nInteger safe = stock.getOrDefault("' + k + '", 0);\nboolean fromMap = true;\nInteger viaTernary = fromMap ? boxed : 0;\nint total = boxed + 1;';
        var f = [];
        function fr(line, cls, narr, vals, hv, extra) {
          var parts = [{ type: 'code', label: 'Code', lang: 'java', code: code, hl: one(line, cls) }, { type: 'map', label: 'stock (HashMap)', entries: [['apple', 5], ['kiwi', 130]], hl: has ? one(k, 'cur') : {} }, { type: 'vars', label: 'Variables', vals: vals, hl: hv || {} }];
          (extra || []).forEach(function (p) { parts.push(p); });
          f.push({ narr: narr, parts: parts });
        }
        fr(1, 'cur', 'The map stores <b>Integer objects</b> (boxes), never raw ints. kiwi\'s 130 is outside the cache, so it is a separately allocated object.', {});
        fr(2, has ? 'ok' : 'cur', '<code>stock.get("' + esc(k) + '")</code> ' + (has ? 'finds the key and returns the Integer box holding ' + val + '.' : 'finds no such key and returns <b>null</b> — an empty slot, not 0.'), { boxed: has ? val : 'null' }, { boxed: has ? 'ok' : 'bad' });
        fr(3, 'ok', '<code>getOrDefault</code> returns ' + (has ? val : 'the default 0') + '. This is the safe way when a missing key should count as zero.', { boxed: has ? val : 'null', safe: has ? val : 0 }, { safe: 'ok' });
        if (has) {
          fr(5, 'ok', 'Ternary: branches are <code>Integer</code> and <code>int</code>, so the result type is <b>int</b>: Java calls <code>boxed.intValue()</code> (fine, it holds ' + val + ') and re-boxes for <code>viaTernary</code>.', { boxed: val, safe: val, viaTernary: val }, { viaTernary: 'ok' }, [note('Compiled form: <code>Integer.valueOf(fromMap ? boxed.intValue() : 0)</code>')]);
          fr(6, 'ok', '<code>boxed + 1</code> unboxes, adds, and gives <b>' + (val + 1) + '</b>. No problem — because the key existed.', { boxed: val, total: val + 1 }, { total: 'ok' });
          f.push({ narr: 'Now try typing a fruit that is <b>not</b> in the map (e.g. mango) to watch the same code explode.', parts: [{ type: 'text', label: 'Experiment', html: 'Type <code>mango</code> in the input box.' }] });
        } else {
          fr(5, 'bad', 'Ternary: one branch <code>Integer</code>, the other <code>int</code> → the whole expression is <b>int</b>. Java calls <code>boxed.intValue()</code> on <b>null</b> → <span class="c-r">NullPointerException</span>. Nothing on this line <i>looks</i> like a method call!', { boxed: 'null', safe: 0, viaTernary: 'NPE!' }, { viaTernary: 'bad', boxed: 'bad' }, [note('Compiled form: <code>Integer.valueOf(fromMap ? boxed.intValue() : 0)</code> — the hidden <code>.intValue()</code> on null throws.')]);
          fr(6, 'bad', 'Even without the ternary, <code>boxed + 1</code> would also unbox null → NPE. Since Java 14, helpful NPE messages say: <i>Cannot invoke "java.lang.Integer.intValue()" because "boxed" is null</i>.', { boxed: 'null', total: 'NPE!' }, { total: 'bad' });
          f.push({ narr: 'Fixes: use <code>getOrDefault</code>; make both ternary branches <code>Integer</code> (<code>Integer.valueOf(0)</code>); or check <code>if (boxed != null)</code> before arithmetic.', parts: [{ type: 'code', label: 'Fixed', lang: 'java', code: 'int qty = stock.getOrDefault(key, 0);\nInteger viaTernary = fromMap ? boxed : Integer.valueOf(0); // stays Integer, may be null\nif (boxed != null) total = boxed + 1;', hl: { 1: 'ok', 2: 'ok', 3: 'ok' } }] });
        }
        return f;
      }
    }],
    examples: [
      { title: 'Predict the output: Short, Character and Double caches', html: `<p>Short and Character have caches too; Double never does. Output: <code>true true false false</code>.</p>`, code: R`
Short s1 = 100, s2 = 100;
Character c1 = 'A', c2 = 'A';         // 'A' is 65, inside 0..127
Double d1 = 1.0, d2 = 1.0;            // no cache for Double
Character c3 = 'é', c4 = 'é';         // 233, outside 0..127
System.out.println((s1 == s2) + " " + (c1 == c2) + " " + (d1 == d2) + " " + (c3 == c4));` },
      { title: 'The Min Stack bug that passes small tests', html: `<p>Comparing two stack tops with <code>==</code> works for values like 5 (cached) but fails for 500, so <code>minStack</code> is never popped and <code>getMin()</code> returns a stale value. Fix: <code>.equals()</code> or unbox with <code>int top = stack.pop();</code>.</p>`, code: R`
Deque<Integer> stack = new ArrayDeque<>(), minStack = new ArrayDeque<>();
stack.push(500); minStack.push(500);
if (stack.pop() == minStack.peek()) minStack.pop();       // BUG: compares objects -> false
System.out.println(minStack.size());                      // 1 (stale min left behind)
stack.push(500);
if (stack.pop().equals(minStack.peek())) minStack.pop();  // FIX
System.out.println(minStack.size());                      // 0` },
      { title: 'Overloading: widening beats boxing', html: `<p>When choosing an overload, Java tries (1) exact/widening primitives, (2) boxing/unboxing, (3) varargs — in that order. An <code>int</code> argument picks <code>m(long)</code> over <code>m(Integer)</code>. Output: <code>long</code>.</p>`, code: R`
public class Pick {
    static void m(long x)    { System.out.println("long"); }
    static void m(Integer x) { System.out.println("Integer"); }
    public static void main(String[] args) {
        m(5);    // int -> long (widening) wins over int -> Integer (boxing)
    }
}` },
      { title: 'Counting with a Map: merge avoids null unboxing', html: `<p><code>counts.put(w, counts.get(w) + 1)</code> crashes on the first occurrence (null + 1). <code>merge</code> handles absent keys for you. Output: <code>{a=2, b=1}</code>.</p>`, code: R`
Map<String, Integer> counts = new TreeMap<>();
for (String w : new String[]{"a", "b", "a"}) {
    counts.merge(w, 1, Integer::sum);     // absent -> 1, present -> old + 1
}
System.out.println(counts);` }
    ],
    deepDive: `<p><b>Where the cache lives:</b> <code>java.lang.Integer.IntegerCache</code> is a private static nested class holding <code>static final Integer[] cache</code>. Its upper bound comes from the system property <code>java.lang.Integer.IntegerCache.high</code>, set by <code>-XX:AutoBoxCacheMax=&lt;n&gt;</code> (the low end is always -128). In JDK 9+ the cache can even be archived in the CDS (class data sharing) archive so startup does not rebuild it. The JLS §5.1.7 only <b>requires</b> caching of -128..127 for int/short, 0..127 for char, and true/false; implementations may cache more.</p>
<p><b>Why only -128..127?</b> Small numbers dominate real programs (loop counters, flags, small IDs), and 256 objects cost almost nothing. Caching every value would need 4 billion objects.</p>
<p><b>Ternary typing rules (JLS §15.25):</b> if one operand is <code>Integer</code> and the other <code>int</code>, the result is <code>int</code> (unboxing). If the operands are <code>Integer</code> and <code>Double</code>, binary numeric promotion makes the result <b>double</b>: <code>true ? Integer.valueOf(1) : Double.valueOf(2)</code> evaluates to <b>1.0</b>, not 1 — a favourite "hard" puzzle. If one operand is a non-numeric reference (e.g. <code>String</code>), no unboxing happens and the result is a common supertype.</p>
<p><b>Performance:</b> HotSpot's escape analysis can eliminate boxes that never leave a method (scalar replacement), and <code>-XX:+EliminateAutoBox</code> helps for cached values. But boxes stored in collections always exist. Boxed arithmetic in a hot loop can be 3–10× slower and produce gigabytes of short-lived garbage under load. Profilers (JFR allocation events, async-profiler <code>-e alloc</code>) quickly show <code>Integer.valueOf</code> or <code>Long.valueOf</code> at the top.</p>
<p><b>Value-based classes:</b> since JDK 16, javac warns on <code>synchronized</code> on a wrapper, and the docs say identity-sensitive operations on wrappers are unsupported. Code relying on <code>==</code> between boxes is officially relying on unspecified behaviour.</p>`,
    aiEra: `<p><b>What AI changes:</b> boxing bugs are exactly the kind that slip past "it compiles and the small test passes" — and AI-generated tests love small numbers like 1, 2, 3. When an assistant writes tests for code with wrapper comparisons, ask it to include values like 128, 1000 and -129, and keys that are missing from maps.</p>
<p><b>Use AI as a partner:</b> ask <code>"Scan this class for implicit boxing/unboxing and list every place a null could be unboxed"</code>. Static analysers do this too — enable IntelliJ's "Number comparison using ==", SpotBugs <code>RC_REF_COMPARISON</code> and <code>NP_NULL_ON_SOME_PATH</code>, and Error Prone's <code>ReferenceEquality</code>. Combine the AI pass with the tools; neither alone is complete.</p>
<p><b>Where AI goes wrong:</b> claiming <code>Double</code> has a cache, saying the ternary result is <code>Integer</code> when mixed with <code>int</code>, or "fixing" an NPE with <code>Objects.requireNonNull</code> (which just moves the crash). <b>What you must still own:</b> the exact compiler rewrite (<code>valueOf</code>/<code>intValue</code>), the ternary typing rules, and the instinct to treat every wrapper as "maybe null".</p>`,
    problems: [{
      title: 'Min Stack without the boxing bug',
      level: 'Medium', tags: ['stack', 'autoboxing', 'design'], companies: ['Amazon', 'Bloomberg', 'Microsoft'],
      statement: `<p>Design a stack that supports <code>push(int x)</code>, <code>pop()</code>, <code>top()</code> and <code>getMin()</code>, all in O(1). Values span the full <code>int</code> range. A previous implementation used <code>Deque&lt;Integer&gt;</code> and compared tops with <code>==</code>; it passed tests with small numbers but returned wrong minimums in production. Write a correct version and explain the bug.</p>`,
      constraints: `-2<sup>31</sup> ≤ x ≤ 2<sup>31</sup>-1; up to 3 × 10<sup>4</sup> operations; pop/top/getMin are only called on a non-empty stack`,
      example: `<p><code>push(512), push(1000), push(512), pop(), getMin()</code> → ${H.c('g', '512')}. With the buggy <code>==</code> check, popping the second 512 compares two <b>different</b> Integer objects (512 is outside the cache), so the min-stack is not popped — harmless here but in other sequences the min-stack keeps stale entries and getMin() returns a value no longer in the stack.</p>`,
      brute: {
        why: `<p>The simple brute force scans the whole stack on every <code>getMin()</code> — O(n) per call, O(n²) overall. The "fast" buggy version uses a second stack but compares <code>Integer</code> objects with <code>==</code>, which is reference comparison outside -128..127.</p>`,
        code: R`
class MinStackBrute {
    private final Deque<Integer> st = new ArrayDeque<>();
    void push(int x) { st.push(x); }
    void pop() { st.pop(); }
    int top() { return st.peek(); }
    int getMin() {                       // O(n) every call
        int m = Integer.MAX_VALUE;
        for (int v : st) m = Math.min(m, v);
        return m;
    }
}`
      },
      mcq: { q: 'Which pop() line is correct for <code>Deque&lt;Integer&gt; st, mins</code>?', options: ['<code>if (st.pop() == mins.peek()) mins.pop();</code>', '<code>if (st.pop().equals(mins.peek())) mins.pop();</code>', '<code>if (st.pop() === mins.peek()) mins.pop();</code>', 'Either first or second, they are the same'], answer: 1, explain: '<code>==</code> between two <code>Integer</code> objects compares references and fails for values outside -128..127. <code>equals</code> compares values. (<code>===</code> is JavaScript, not Java.)' },
      hints: [
        `<p>Hint 1: Keep a second stack whose top is always the minimum of everything currently in the main stack.</p>`,
        `<p>Hint 2: Push onto the min-stack when <code>x &lt;= currentMin</code> (the <b>&lt;=</b> handles duplicates). On pop, pop the min-stack only if the popped value <b>equals</b> its top.</p>`,
        `<p>Hint 3: Avoid boxing entirely: unbox into an <code>int</code> local (<code>int v = st.pop();</code>) and compare ints, or store pairs <code>(value, minSoFar)</code> in an <code>int[]</code>-based stack.</p>`
      ],
      tests: { sig: 'int[] int[] -> string', fn: 'minStackCheck',
        harness: { java: `class Check { static String minStackCheck(int[] op, int[] val) { MinStack s = new MinStack(); List<String> r = new ArrayList<>(); long h = 0; int k = 0; for (int i = 0; i < op.length; i++) { switch (op[i]) { case 0: s.push(val[i]); break; case 1: s.pop(); break; case 2: { int v = s.top(); r.add("t" + v); h += (long) v * (k++ % 7 + 1); break; } default: { int v = s.getMin(); r.add("m" + v); h += (long) v * (k++ % 7 + 1); } } } return r.size() <= 20 ? String.join(" ", r) : "n=" + r.size() + " h=" + h; } }` }, cases: [
        [[[0,0,0,1,3],[512,1000,512,0,0]],"m512"],
        [[[0,0,0,1,1,3],[600,500,500,0,0,0]],"m600"],
        [[[0,2,3],[7,0,0]],"t7 m7"],
        [[[0,0,3,1,3],[2147483647,-2147483648,0,0,0]],"m-2147483648 m2147483647"],
        [[[0,0,0,3,1,3,1,3],[5,3,3,0,0,0,0,0]],"m3 m3 m5"],
        [[[0,0,0,2,3,1,2,3],[1,2,3,0,0,0,0,0]],"t3 m1 t2 m1"],
        [[[0,0,0,0,3,1,3,1,3,1,3],[4,3,2,1,0,0,0,0,0,0,0]],"m1 m2 m3 m4"],
        [[[0,0,0,0,3,1,3,1,3,1,3],[1,2,3,4,0,0,0,0,0,0,0]],"m1 m1 m1 m1"],
        [[{"$concat":[{"$rep":0,"n":20},[3,2,1,3,2]]},{"$concat":[{"$range":[20,0,-1]},{"$rep":0,"n":5}]}],"m1 t1 m2 t2"],
        [[[0,0,3,2],[-1,-1,0,0]],"m-1 t-1"],
        [[[0,3,0,3,1,3],[0,0,-5,0,0,0]],"m0 m-5 m0"],
        [[{"$concat":[{"$rep":0,"n":15000},[2,3],{"$rep":1,"n":14996},[2,3]]},{"$concat":[{"$range":[15000,0,-1]},{"$rep":0,"n":15000}]}],"t1 m1 t14997 m14997"],
        [[{"$concat":[{"$rep":0,"n":15000},[3],{"$rep":1,"n":14997},[3,2]]},{"$concat":[{"$range":[0,15000]},{"$rep":0,"n":15000}]}],"m0 m0 t2"],
        [[{"$concat":[{"$rep":0,"n":10000},[3],{"$rep":0,"n":10000},[3],{"$rep":0,"n":9998},[3,2]]},{"$concat":[{"$range":[5000,15000]},[0],{"$range":[0,10000,1]},[0],{"$range":[-10000,-2,1]},[0,0]]}],"m5000 m0 m-10000 t-3"]
      ] },
      solution: {
        approach: `<p>Store <code>(value, minSoFar)</code> pairs in two parallel primitive arrays that grow like an ArrayList. No boxing at all, so no reference comparisons and no cache surprises; every operation is O(1).</p>`,
        code: R`
class MinStack {
    private int[] vals = new int[16];
    private int[] mins = new int[16];       // mins[i] = minimum of vals[0..i]
    private int size = 0;

    public void push(int x) {
        if (size == vals.length) {          // grow both arrays (amortised O(1))
            vals = Arrays.copyOf(vals, size * 2);
            mins = Arrays.copyOf(mins, size * 2);
        }
        vals[size] = x;
        mins[size] = size == 0 ? x : Math.min(x, mins[size - 1]);
        size++;
    }
    public void pop()    { size--; }
    public int top()     { return vals[size - 1]; }
    public int getMin()  { return mins[size - 1]; }

    public static void main(String[] args) {
        MinStack s = new MinStack();
        s.push(512); s.push(1000); s.push(512); s.push(-1000);
        System.out.println(s.getMin());     // -1000
        s.pop();
        System.out.println(s.getMin());     // 512
        s.pop();
        System.out.println(s.getMin());     // 512
    }
}`,
        alt: [{ lang: 'java', code: R`
// Two Deque<Integer> version, written safely
class MinStack2 {
    private final Deque<Integer> st = new ArrayDeque<>(), mins = new ArrayDeque<>();
    public void push(int x) {
        st.push(x);
        if (mins.isEmpty() || x <= mins.peek()) mins.push(x);  // peek() unboxed for <=: fine
    }
    public void pop() {
        int v = st.pop();                    // unbox ONCE into a primitive
        if (v == mins.peek()) mins.pop();    // int == Integer -> value comparison
    }
    public int top() { return st.peek(); }
    public int getMin() { return mins.peek(); }
}` }],
        dry: { head: ['op', 'vals', 'mins', 'getMin'], rows: [
          ['push 512', '[512]', '[512]', '512'], ['push 1000', '[512, 1000]', '[512, 512]', '512'], ['push 512', '[512, 1000, 512]', '[512, 512, 512]', '512'],
          ['push -1000', '[…, -1000]', '[…, -1000]', H.c('g', '-1000')], ['pop', '[512, 1000, 512]', '[512, 512, 512]', H.c('g', '512')]
        ] },
        complexity: `<p>All operations <b>O(1)</b> (push amortised). Space <b>O(n)</b> ints — about 8 bytes per element versus ~40 for two boxed deques.</p>`,
        followUps: ['Achieve O(1) extra space by storing encoded differences (watch overflow — use long)', 'Max Stack with popMax() (LeetCode 716)', 'Why does <code>x &lt;= mins.peek()</code> work fine with boxing while == does not?']
      }
    }]
  });
  /* ======================================================================
     TOPIC 6 — equals & hashCode contract
     ====================================================================== */
  topics.push({
    title: 'The equals() & hashCode() Contract',
    analogy: `<p>Think of a huge <b>library</b>. <code>hashCode()</code> is the <b>shelf number</b> written on a book's spine; <code>equals()</code> is <b>reading the full title</b> to be sure it is the right book. When you ask for a book, the librarian walks to the shelf number first and then reads titles only on that shelf. If two copies of the <i>same</i> book were given <b>different</b> shelf numbers, the librarian would go to the wrong shelf and say "we don't have it" — that is a broken <code>hashCode</code>. Two <i>different</i> books sharing a shelf is fine; the librarian just reads a few more titles (a <b>collision</b>).</p>`,
    explain: `<p>Every Java object inherits <code>equals(Object)</code> and <code>hashCode()</code> from <code>Object</code>. The defaults use <b>identity</b>: an object is equal only to itself, and its hash is derived from the object itself. That is wrong for <b>value</b> classes like <code>Point(1, 2)</code>, <code>Money(10, "INR")</code> or <code>Email("a@b.com")</code>, where two separate objects with the same fields should count as "the same".</p>
<h4>1. The equals contract (5 rules)</h4>
${H.table(['Rule', 'Meaning', 'Example'], [
  ['Reflexive', '<code>x.equals(x)</code> is true', 'a point equals itself'],
  ['Symmetric', 'x.equals(y) ⇔ y.equals(x)', 'if p equals q then q equals p'],
  ['Transitive', 'x = y and y = z ⇒ x = z', 'no "almost equal" chains'],
  ['Consistent', 'same answer every call while fields do not change', 'no randomness, no clocks'],
  ['Non-null', '<code>x.equals(null)</code> is false (never throws)', 'guard with instanceof']
])}
<h4>2. The hashCode contract (3 rules)</h4>
<ul>
<li>If <code>a.equals(b)</code> then <code>a.hashCode() == b.hashCode()</code> — <b>mandatory</b>.</li>
<li>Calling <code>hashCode()</code> repeatedly on an unchanged object returns the same number.</li>
<li>Unequal objects <b>may</b> share a hash (collision) — allowed, just slower. A good hash spreads them out.</li>
</ul>
<p>⇒ <b>Override both or neither.</b> Overriding only <code>equals</code> breaks every <code>HashMap</code>/<code>HashSet</code>.</p>
<h4>3. How HashMap uses them</h4>
<ol>
<li>Call <code>key.hashCode()</code>, mix the bits (<code>h ^ (h &gt;&gt;&gt; 16)</code>), pick bucket <code>hash &amp; (capacity − 1)</code>.</li>
<li>Walk only that bucket. For each entry: same hash? then same reference (<code>==</code>) or <code>equals</code>? → found.</li>
</ol>
<p>So <code>hashCode</code> picks <b>where to look</b>, <code>equals</code> decides <b>which one it is</b>.</p>
<h4>4. Writing them correctly (the recipe)</h4>
<pre><code>@Override
public boolean equals(Object o) {
    if (this == o) return true;                       // 1. same object: fast path
    if (o == null || getClass() != o.getClass()) return false; // 2. null / different type
    Point p = (Point) o;                              // 3. cast
    return x == p.x &amp;&amp; y == p.y;                      // 4. compare SIGNIFICANT fields
}
@Override
public int hashCode() {
    return Objects.hash(x, y);                        // 5. use the SAME fields as equals
}</code></pre>
${H.table(['Field type', 'Compare in equals with', 'Hash with'], [
  ['int, long, char, boolean…', '<code>==</code>', '<code>Integer.hashCode(x)</code> / the value'],
  ['double, float', '<code>Double.compare(a, b) == 0</code> (handles NaN, -0.0)', '<code>Double.hashCode(d)</code>'],
  ['object (may be null)', '<code>Objects.equals(a, b)</code>', '<code>Objects.hashCode(a)</code>'],
  ['array', '<code>Arrays.equals(a, b)</code>', '<code>Arrays.hashCode(a)</code>']
])}
<h4>5. Or let Java write it: records</h4>
<p><code>record Point(int x, int y) {}</code> (Java 16+) automatically gets correct <code>equals</code>, <code>hashCode</code> and <code>toString</code> based on all components. For most value types in modern Java, a record is the right answer.</p>
<h4>6. Never mutate a key</h4>
<p>If you change a field used in <code>hashCode</code> <b>after</b> putting the object in a <code>HashSet</code>/<code>HashMap</code>, it now sits in the wrong bucket: <code>contains</code> returns false and <code>remove</code> fails, while the object is still inside. Keys should be <b>immutable</b> — another reason String and Integer make great keys.</p>`,
    clues: [
      '"Use a custom object as a HashMap key / in a HashSet" → you must override <b>both</b> equals and hashCode (or use a record)',
      '"HashSet contains duplicates of my objects" / "map.get returns null for a key I just put" → missing or inconsistent hashCode',
      '"What is the equals/hashCode contract?" → 5 equals rules + "equal ⇒ same hash", "same hash ⇏ equal"',
      '"instanceof vs getClass() in equals" → symmetry with subclasses (Liskov vs strict equality)',
      '"Object changed after adding to a set and now cannot be removed" → mutable key in a hash structure',
      '"Two different strings with the same hashCode" → collisions are allowed ("Aa" and "BB" both hash to 2112)',
      '"Override equals, compare arrays/doubles" → Arrays.equals, Double.compare'
    ],
    code: [R`
// A textbook-correct value class
import java.util.*;

final class Employee {
    private final String id;           // significant field
    private final String name;         // significant field
    private final double salary;       // significant field (double!)
    private final int[] badgeCodes;    // array field

    Employee(String id, String name, double salary, int[] badgeCodes) {
        this.id = id; this.name = name; this.salary = salary;
        this.badgeCodes = badgeCodes.clone();          // defensive copy keeps it immutable
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;                                 // reflexive fast path
        if (o == null || getClass() != o.getClass()) return false;  // non-null + same type
        Employee e = (Employee) o;
        return Double.compare(salary, e.salary) == 0                // safe double compare
                && Objects.equals(id, e.id)                         // null-safe objects
                && Objects.equals(name, e.name)
                && Arrays.equals(badgeCodes, e.badgeCodes);         // content of arrays
    }

    @Override
    public int hashCode() {
        int h = Objects.hash(id, name, salary);                     // same fields as equals
        return 31 * h + Arrays.hashCode(badgeCodes);
    }

    public static void main(String[] args) {
        Employee a = new Employee("E1", "Asha", 1000.0, new int[]{7, 9});
        Employee b = new Employee("E1", "Asha", 1000.0, new int[]{7, 9});
        Set<Employee> set = new HashSet<>(List.of(a));
        System.out.println(a.equals(b) + " " + (a.hashCode() == b.hashCode()) + " " + set.contains(b)); // true true true
    }
}`, R`
// What goes wrong: equals without hashCode, and a mutable key
import java.util.*;

class HalfPoint {                           // overrides equals ONLY (broken)
    int x, y;
    HalfPoint(int x, int y) { this.x = x; this.y = y; }
    @Override public boolean equals(Object o) {
        return o instanceof HalfPoint p && p.x == x && p.y == y;
    }
}

class MutablePoint {                        // correct equals/hashCode, but mutable
    int x, y;
    MutablePoint(int x, int y) { this.x = x; this.y = y; }
    @Override public boolean equals(Object o) {
        return o instanceof MutablePoint p && p.x == x && p.y == y;
    }
    @Override public int hashCode() { return Objects.hash(x, y); }
}

public class BrokenKeys {
    public static void main(String[] args) {
        Set<HalfPoint> s1 = new HashSet<>();
        s1.add(new HalfPoint(1, 2));
        System.out.println(s1.contains(new HalfPoint(1, 2)));  // false (almost always): different buckets

        Set<MutablePoint> s2 = new HashSet<>();
        MutablePoint p = new MutablePoint(1, 2);
        s2.add(p);
        p.x = 99;                                            // mutate AFTER inserting
        System.out.println(s2.contains(p));                  // false: looks in the wrong bucket
        System.out.println(s2.size());                       // 1: it is still in there, lost
        System.out.println(s2.iterator().next() == p);       // true
    }
}`, R`
// Records: equals, hashCode and toString generated for you
import java.util.*;

record Point(int x, int y) {}

public class RecordKeys {
    public static void main(String[] args) {
        Map<Point, String> places = new HashMap<>();
        places.put(new Point(1, 2), "home");
        System.out.println(places.get(new Point(1, 2)));    // home
        System.out.println(new Point(1, 2));                // Point[x=1, y=2]
        System.out.println(new Point(1, 2).equals(new Point(1, 2))); // true
    }
}`],
    codeTitle: ['A correct equals/hashCode (all field types)', 'Broken: equals-only, and a mutated key', 'Records do it for you'],
    viz: [{
      title: 'HashMap with Point keys: what equals/hashCode each do',
      input: 'both',
      inputLabel: 'which methods Point overrides: both | equals | hash | none',
      gen: function (input) {
        var mode = String(input === undefined || input === null ? '' : input).trim().toLowerCase();
        if (['both', 'equals', 'hash', 'none'].indexOf(mode) < 0) throw new Error('Type one of: both, equals, hash, none');
        var hasEq = mode === 'both' || mode === 'equals', hasHash = mode === 'both' || mode === 'hash';
        var CAP = 8, ids = [460141958, 1163157884, 1956725890, 356573597];
        function fieldHash(x, y) { return i32(Math.imul(31, i32(31 + x)) + y); }
        function hashOf(o) { return hasHash ? fieldHash(o.x, o.y) : ids[o.n]; }
        function bucket(h) { return spread(h) & (CAP - 1); }
        var table = []; for (var b = 0; b < CAP; b++) table.push([]);
        function tbl(hlRow, label) {
          var rows = table.map(function (es, i) { return [String(i), es.length ? es.map(function (e) { return 'P' + (e.k.n + 1) + '(' + e.k.x + ',' + e.k.y + ')→"' + e.v + '"'; }).join('  ⟶  ') : '·']; });
          var hl = {}; if (hlRow !== undefined) hl[hlRow] = label || 'cur';
          return { type: 'table', label: 'buckets (capacity 8 for the picture; real default is 16)', columns: ['bucket', 'entries (chained)'], rows: rows, hl: hl };
        }
        var methods = 'class Point {\n    int x, y;\n' + (hasEq ? '    public boolean equals(Object o) { /* compare x and y */ }\n' : '    // equals NOT overridden -> identity (==)\n') + (hasHash ? '    public int hashCode() { return Objects.hash(x, y); }\n' : '    // hashCode NOT overridden -> identity hash\n') + '}';
        var f = [];
        function fr(narr, hlRow, cls, vals, hv) { f.push({ narr: narr, parts: [{ type: 'code', label: 'Your Point class', lang: 'java', code: methods, hl: {} }, tbl(hlRow, cls), { type: 'vars', label: 'this step', vals: vals || {}, hl: hv || {} }] }); }
        fr('Mode <b>' + mode + '</b>: Point ' + (hasEq ? 'overrides' : 'does NOT override') + ' equals and ' + (hasHash ? 'overrides' : 'does NOT override') + ' hashCode. The map starts empty.', undefined, '', { size: 0 });
        function put(k, v, label) {
          var h = hashOf(k), bi = bucket(h), found = null;
          table[bi].forEach(function (e) { if (hashOf(e.k) === h && (e.k === k || (hasEq && e.k.x === k.x && e.k.y === k.y))) found = e; });
          if (found) { var old = found.v; found.v = v; fr(label + ': hash = ' + h + ' → bucket ' + bi + '. An entry with the same hash that <b>equals</b> this key exists, so the value is <b>replaced</b> ("' + old + '" → "' + v + '"). No duplicate.', bi, 'ok', { 'key.hashCode()': h, 'bucket = spread(h) & 7': bi, action: 'replace', size: size() }, { action: 'ok' }); }
          else { table[bi].push({ k: k, v: v }); fr(label + ': hash = ' + h + (hasHash ? ' (from fields x, y)' : ' (identity hash: unique per object)') + ' → bucket ' + bi + '. ' + (table[bi].length > 1 ? 'Bucket already has an entry that is <b>not equal</b> → chained as a collision.' : 'Empty slot, insert.'), bi, table[bi].length > 1 ? 'win' : 'ok', { 'key.hashCode()': h, 'bucket = spread(h) & 7': bi, action: 'insert', size: size() }, { action: 'ok' }); }
        }
        function size() { return table.reduce(function (a, es) { return a + es.length; }, 0); }
        var p1 = { n: 0, x: 1, y: 2 }, p2 = { n: 1, x: 3, y: 4 }, p3 = { n: 2, x: 1, y: 2 }, p4 = { n: 3, x: 1, y: 2 };
        put(p1, 'home', '<code>map.put(new Point(1,2), "home")</code>');
        put(p2, 'work', '<code>map.put(new Point(3,4), "work")</code>');
        var h3 = hashOf(p3), b3 = bucket(h3), res = null, scanned = [];
        table[b3].forEach(function (e) { var hm = hashOf(e.k) === h3, eq = e.k === p3 || (hasEq && e.k.x === p3.x && e.k.y === p3.y); scanned.push('P' + (e.k.n + 1) + ': hash ' + (hm ? 'same' : 'differs') + (hm ? ', equals ' + eq : '')); if (hm && eq && res === null) res = e.v; });
        fr('<code>map.get(new Point(1,2))</code> with a <b>brand-new</b> object: hash = ' + h3 + ' → look only in bucket ' + b3 + '. ' + (scanned.length ? 'Check each entry there: ' + scanned.join('; ') + '.' : 'That bucket is empty!') + ' Result: <b>' + (res === null ? 'null' : '"' + res + '"') + '</b>. ' + (res === null ? (hasHash ? 'Same bucket and same hash, but identity equals says "different object" → not found.' : 'Without hashCode the new object gets a different identity hash, so Java looks on the wrong shelf.') : 'hashCode found the shelf, equals confirmed the book.'), b3, res === null ? 'bad' : 'ok', { 'key.hashCode()': h3, bucket: b3, result: res === null ? 'null' : res }, { result: res === null ? 'bad' : 'ok' });
        put(p4, 'new home', '<code>map.put(new Point(1,2), "new home")</code>');
        var n = size();
        f.push({ narr: n === 2 ? 'Correct behaviour: <b>2</b> keys, (1,2) was updated in place. This only happens when <b>both</b> methods are overridden consistently.' : 'Broken behaviour: <b>' + n + '</b> entries — two "equal" points are stored separately and lookups with a new Point(1,2) fail. Fix: override <b>both</b> equals and hashCode (or use <code>record Point(int x, int y)</code>).', parts: [tbl(undefined), { type: 'table', label: 'Summary for this mode', columns: ['question', 'answer'], rows: [['map.size()', String(n)], ['get(new Point(1,2))', res === null ? 'null' : '"' + res + '"'], ['contract respected?', mode === 'both' ? 'yes' : 'NO']], hl: { 2: mode === 'both' ? 'ok' : 'bad' } }] });
        return f;
      }
    }, {
      title: 'String.hashCode(): the 31-polynomial, one char at a time',
      input: 'Aa',
      inputLabel: 'a word (letters, 1-10) — compare Aa with BB',
      gen: function (input) {
        var w = wordOf(input, 1, 10, 'Type a word of 1-10 letters, e.g. Aa or BB');
        var f = [], h = 0;
        var code = 'int h = 0;\nfor (int i = 0; i < s.length(); i++) {\n    h = 31 * h + s.charAt(i);   // int arithmetic: overflow wraps\n}\nreturn h;';
        f.push({ narr: 'String hashing: start at 0, and for each char do <code>h = 31 × h + char</code>. 31 is an odd prime and <code>31 × h</code> = <code>(h &lt;&lt; 5) − h</code>, cheap for the CPU.', parts: [{ type: 'code', label: 'String.hashCode (logic)', lang: 'java', code: code, hl: { 1: 'cur' } }, { type: 'array', label: 's', values: w.split('') }, { type: 'vars', label: 'state', vals: { h: 0 } }] });
        for (var i = 0; i < w.length; i++) {
          var prev = h; h = i32(Math.imul(31, h) + w.charCodeAt(i));
          var hl = {}; for (var k = 0; k < i; k++) hl[k] = 'done'; hl[i] = 'cur';
          f.push({ narr: 'i = ' + i + ', char <code>' + w[i] + '</code> = ' + w.charCodeAt(i) + ': h = 31 × ' + prev + ' + ' + w.charCodeAt(i) + ' = <b>' + h + '</b>' + (Math.abs(31 * prev + w.charCodeAt(i)) > 2147483647 ? ' <span class="c-y">(overflowed and wrapped — that is fine for hashing)</span>' : '') + '.', parts: [{ type: 'code', label: 'String.hashCode (logic)', lang: 'java', code: code, hl: { 3: 'cur' } }, { type: 'array', label: 's', values: w.split(''), hl: hl, ptr: one(i, 'i') }, { type: 'vars', label: 'state', vals: { i: i, char: w.charCodeAt(i), h: h }, hl: { h: 'ok' } }] });
        }
        var sp = spread(h), bk = sp & 15;
        f.push({ narr: '"' + esc(w) + '".hashCode() = <b>' + h + '</b>. HashMap then mixes the high bits in (<code>h ^ (h &gt;&gt;&gt; 16)</code> = ' + sp + ') and keeps the low bits: bucket <b>' + bk + '</b> in a 16-bucket table. The result is cached inside the String.', parts: [{ type: 'bits', label: 'hash (32-bit two\'s complement)', value: h >>> 0, width: 32, hl: { 0: 'sel', 1: 'sel', 2: 'sel', 3: 'sel' } }, { type: 'vars', label: 'in a HashMap', vals: { hashCode: h, spread: sp, 'bucket (& 15)': bk }, hl: { 'bucket (& 15)': 'sel' } }] });
        f.push({ narr: 'Collisions are allowed: <code>"Aa"</code> and <code>"BB"</code> both hash to <b>2112</b> (65×31+97 = 66×31+66). They land in the same bucket and <code>equals</code> tells them apart. Equal hash does <b>not</b> mean equal objects.', parts: [{ type: 'table', label: 'Famous collision', columns: ['string', 'hashCode', 'equals("Aa")?'], rows: [['"Aa"', String(strHash('Aa')), 'true'], ['"BB"', String(strHash('BB')), 'false'], ['"' + esc(w) + '"', String(h), String(w === 'Aa')]], hl: { 0: 'sel', 1: 'sel' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Symmetry broken by instanceof in a subclass', html: `<p><code>ColorPoint</code> adds a colour and compares it. <code>p.equals(cp)</code> is true (Point's instanceof accepts a ColorPoint) but <code>cp.equals(p)</code> is false — <b>symmetry violated</b>. Using <code>getClass()</code> in both, or composition instead of inheritance, fixes it. Output: <code>true false</code>.</p>`, code: R`
class P {
    final int x;
    P(int x) { this.x = x; }
    @Override public boolean equals(Object o) { return o instanceof P p && p.x == x; }
    @Override public int hashCode() { return x; }
}
class ColorP extends P {
    final String color;
    ColorP(int x, String c) { super(x); color = c; }
    @Override public boolean equals(Object o) { return o instanceof ColorP c && c.x == x && c.color.equals(color); }
}
public class Symmetry {
    public static void main(String[] args) {
        P p = new P(1);
        ColorP cp = new ColorP(1, "red");
        System.out.println(p.equals(cp) + " " + cp.equals(p));   // true false
    }
}` },
      { title: 'Overloading equals instead of overriding it', html: `<p><code>equals(Book b)</code> is a <b>new overload</b>, not an override of <code>equals(Object)</code>. Collections call <code>equals(Object)</code>, which is still identity, so <code>contains</code> fails. Always use <code>@Override</code> — the compiler would have rejected this. Output: <code>true false</code>.</p>`, code: R`
import java.util.*;

class Book {
    final String isbn;
    Book(String isbn) { this.isbn = isbn; }
    public boolean equals(Book b) { return b != null && isbn.equals(b.isbn); } // OVERLOAD (bug)
    @Override public int hashCode() { return isbn.hashCode(); }
}
public class OverloadTrap {
    public static void main(String[] args) {
        Book a = new Book("978-0"), b = new Book("978-0");
        System.out.println(a.equals(b));                          // true  (calls equals(Book))
        System.out.println(new HashSet<>(List.of(a)).contains(b)); // false (calls equals(Object))
    }
}` },
      { title: 'A constant hashCode is legal but terrible', html: `<p><code>return 42;</code> satisfies the contract (equal objects get equal hashes) but puts <b>every</b> key in one bucket, turning O(1) lookups into O(n) list scans — or O(log n) after Java 8 converts large buckets (≥ 8 entries, table ≥ 64) into red-black trees, which only helps if keys are <code>Comparable</code>.</p>`, code: R`
class Lazy {
    final int id;
    Lazy(int id) { this.id = id; }
    @Override public boolean equals(Object o) { return o instanceof Lazy l && l.id == id; }
    @Override public int hashCode() { return 42; }   // legal, but every key collides
}` },
      { title: 'BigDecimal: equal value, not equal objects', html: `<p><code>BigDecimal.equals</code> compares value <b>and scale</b>, so 1.0 and 1.00 are not equal (and have different hashes). <code>compareTo</code> says they are equal. A <code>HashSet</code> keeps both; a <code>TreeSet</code> keeps one. Output: <code>false 0 2 1</code>.</p>`, code: R`
BigDecimal a = new BigDecimal("1.0"), b = new BigDecimal("1.00");
System.out.println(a.equals(b) + " " + a.compareTo(b) + " "
        + new HashSet<>(List.of(a, b)).size() + " " + new TreeSet<>(List.of(a, b)).size());` }
    ],
    deepDive: `<p><b>HashMap internals (Java 8+):</b> table of <code>Node&lt;K,V&gt;[]</code>, capacity a power of two (default 16), load factor 0.75 → resize (double) when size &gt; 12. The bucket index is <code>(h ^ (h &gt;&gt;&gt; 16)) &amp; (n − 1)</code>; the XOR folds high bits down because the mask only keeps low bits. Lookup compares <b>cached hash first</b>, then <code>==</code>, then <code>equals</code> — cheap checks before the expensive one. A bucket "treeifies" into a red-black tree when it holds ≥ 8 nodes and the table has ≥ 64 slots, and untreeifies at ≤ 6. This was added to resist <b>hash-flooding</b> denial-of-service attacks using colliding String keys like "Aa"/"BB" combinations.</p>
<p><b>Identity hash:</b> <code>Object.hashCode()</code> on HotSpot is (by default) a thread-local xorshift random number generated on first call and stored in the object header (mark word). It is <b>not</b> the memory address (objects move during GC). <code>System.identityHashCode(o)</code> gives it even when <code>hashCode</code> is overridden.</p>
<p><b>instanceof vs getClass:</b> <code>getClass()</code> gives strict symmetry but breaks the Liskov principle (a harmless subclass, e.g. a Hibernate proxy, is never equal to its parent). <code>instanceof</code> works with proxies but only stays symmetric if subclasses do not add state to equality — make <code>equals</code> <code>final</code> or the class <code>final</code>. Effective Java's verdict: there is no way to extend an instantiable class and add a value component while preserving the contract; prefer composition.</p>
<p><b>JPA/Hibernate entities:</b> using a database-generated id in <code>hashCode</code> breaks sets because the id changes from null to a value on persist. Common fixes: business keys, or a constant hash with id-based equals. <b>Records</b> generate <code>equals</code> using component-wise comparison (floating components via <code>Double.compare</code> semantics) and <code>hashCode</code> via an unspecified but consistent combination.</p>`,
    aiEra: `<p><b>What AI changes:</b> nobody hand-writes <code>equals</code>/<code>hashCode</code> boilerplate anymore — IDEs, Lombok's <code>@EqualsAndHashCode</code>, records and AI assistants generate it instantly. The skill shifts from <i>typing</i> it to <b>reviewing</b> it: which fields are significant? Is the class mutable? Will it be used in a set before it gets its id?</p>
<p><b>Use AI as a partner:</b> ask <code>"Generate a property-based test (jqwik) that checks reflexive, symmetric, transitive and hashCode consistency for this class"</code>, or use <b>EqualsVerifier</b> (one line: <code>EqualsVerifier.forClass(Point.class).verify()</code>) which catches nearly every contract violation. Ask the assistant to explain each warning it raises.</p>
<p><b>Where AI goes wrong:</b> it happily generates equals/hashCode over <b>all</b> fields, including mutable caches, timestamps or lazy-loaded collections; uses <code>instanceof</code> in a non-final class with subclasses; or includes a JPA <code>@Id</code> that is null until saved. <b>What you must still own:</b> deciding what "the same" means for your domain object, keeping keys immutable, and spotting symmetry/transitivity problems in inheritance hierarchies.</p>`,
    problems: [{
      title: 'Count Distinct Points with a Proper Key',
      level: 'Easy', tags: ['hashing', 'equals/hashCode', 'records'], companies: ['Google', 'Flipkart', 'Atlassian'],
      statement: `<p>Given <code>int[][] pts</code> where each row is <code>{x, y}</code>, return how many <b>distinct</b> points there are. You must model a point as an object key (class or record) and use a <code>HashSet</code>. Explain why a class with default <code>equals</code>/<code>hashCode</code> gives the wrong answer.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>5</sup>; -10<sup>9</sup> ≤ x, y ≤ 10<sup>9</sup>; target O(n) expected time`,
      example: `<p><code>[[1,2],[3,4],[1,2],[1,2],[0,0]]</code> → ${H.c('g', '3')}: the distinct points are (1,2), (3,4), (0,0). With identity-based equals every <code>new Point</code> is "different", so the set size would wrongly be ${H.c('r', '5')}.</p>`,
      brute: {
        why: `<p>Keep a <code>List</code> of points seen and compare each new point against all previous ones field by field: O(n²) — 10<sup>10</sup> comparisons for n = 10<sup>5</sup>. (Using <code>list.contains</code> without overriding <code>equals</code> is even worse: it is still O(n²) <b>and</b> wrong.)</p>`,
        code: R`
static int countBrute(int[][] pts) {
    List<int[]> seen = new ArrayList<>();
    for (int[] p : pts) {
        boolean dup = false;
        for (int[] q : seen) if (q[0] == p[0] && q[1] == p[1]) { dup = true; break; }
        if (!dup) seen.add(p);
    }
    return seen.size();          // O(n^2)
}`
      },
      mcq: { q: 'Why can\'t you just put the <code>int[]</code> rows into a <code>HashSet&lt;int[]&gt;</code>?', options: ['Arrays are not objects', 'Arrays use identity equals/hashCode, so {1,2} and another {1,2} are different keys', 'HashSet cannot hold arrays', 'It works fine'], answer: 1, explain: 'Arrays inherit <code>Object.equals</code>/<code>hashCode</code>. You need a wrapper with value semantics — a record, a class with both methods overridden, or <code>List.of(x, y)</code>.' },
      hints: [
        `<p>Hint 1: A <code>HashSet</code> needs keys with <b>value</b> semantics: equal fields ⇒ equals true ⇒ same hashCode.</p>`,
        `<p>Hint 2: <code>record Pt(int x, int y) {}</code> gives you both methods for free. A hand-written class must override <b>both</b>, using the same fields.</p>`,
        `<p>Hint 3: Recipe — for each row add <code>new Pt(row[0], row[1])</code> to a HashSet; return its size. Alternative key without objects: pack into one long <code>((long) x &lt;&lt; 32) | (y &amp; 0xffffffffL)</code>.</p>`
      ],
      tests: { sig: 'int[] int[] -> int', fn: 'dpCheck',
        harness: { java: `class Check { static int dpCheck(int[] xs, int[] ys) { int[][] pts = new int[xs.length][]; for (int i = 0; i < xs.length; i++) pts[i] = new int[]{xs[i], ys[i]}; return Solution.countDistinct(pts); } }`, python: `def dp_check(xs, ys):
    return count_distinct([[x, y] for x, y in zip(xs, ys)])
` }, cases: [
        [[[1,3,1,1,0],[2,4,2,2,0]],3],
        [[[0],[0]],1],
        [[[1,2],[2,1]],2],
        [[[-5,-5],[-5,-5]],1],
        [[[1000000000,-1000000000,1000000000],[-1000000000,1000000000,-1000000000]],2],
        [[[0,1],[31,0]],2],
        [[[1,1,1],[1,2,3]],3],
        [[[7,7,7],[7,7,7]],1],
        [[[2147483647,-2147483648,2147483647],[-2147483648,2147483647,-2147483648]],2],
        [[{"$rep":1,"n":100000},{"$rep":1,"n":100000}],1],
        [[{"$range":[0,100000]},{"$rep":7,"n":100000}],100000],
        [[{"$concat":[{"$range":[0,50000]},{"$range":[0,50000]}]},{"$concat":[{"$rep":3,"n":50000},{"$rep":3,"n":50000}]}],50000],
        [[{"$range":[0,3000]},{"$range":[0,-93000,-31]}],3000],
        [[{"$range":[0,100000]},{"$range":[100000,0,-1]}],100000]
      ] },
      solution: {
        approach: `<p>Model the point as a value object with correct <code>equals</code>/<code>hashCode</code> and let <code>HashSet</code> drop duplicates. Each insert is expected O(1). Shown as a hand-written final class (so you can see the contract); a one-line record is equivalent.</p>`,
        code: R`
final class Pt {
    private final int x, y;
    Pt(int x, int y) { this.x = x; this.y = y; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Pt p)) return false;   // class is final, so instanceof is safe
        return x == p.x && y == p.y;
    }

    @Override
    public int hashCode() {
        return 31 * x + y;                        // same fields as equals
    }
}

class Solution {
    static int countDistinct(int[][] pts) {
        Set<Pt> set = new HashSet<>();
        for (int[] p : pts) set.add(new Pt(p[0], p[1]));   // duplicates rejected by equals
        return set.size();
    }

    public static void main(String[] args) {
        int[][] pts = {{1, 2}, {3, 4}, {1, 2}, {1, 2}, {0, 0}};
        System.out.println(countDistinct(pts));   // 3
    }
}`,
        alt: [{ lang: 'python', code: `def count_distinct(pts):\n    return len({(x, y) for x, y in pts})   # tuples already have value equality + hash\n\nprint(count_distinct([[1, 2], [3, 4], [1, 2], [1, 2], [0, 0]]))` }],
        dry: { head: ['row', 'new Pt', 'hashCode', 'already in set?', 'set size'], rows: [
          ['0', '(1,2)', '33', 'no', '1'], ['1', '(3,4)', '97', 'no', '2'], ['2', '(1,2)', '33', H.c('y', 'yes (equals true)'), '2'], ['3', '(1,2)', '33', H.c('y', 'yes'), '2'], ['4', '(0,0)', '0', 'no', H.c('g', '3')]
        ] },
        complexity: `<p>Expected time <b>O(n)</b>, space <b>O(n)</b>. Worst case degrades with many collisions, but Java 8+ treeified buckets cap it at O(log n) per operation for Comparable keys.</p>`,
        followUps: ['Max Points on a Line (LeetCode 149): key = reduced slope pair', 'Use a long-packed key to avoid allocating objects', 'What breaks if Pt had setters and you changed x after adding?']
      }
    }]
  });
  /* ======================================================================
     TOPIC 7 — Comparable vs Comparator
     ====================================================================== */
  topics.push({
    title: 'Comparable vs Comparator: Natural Order and Custom Orders',
    analogy: `<p>Words in a <b>dictionary</b> have a "natural" order built into them — A before B — and every dictionary uses it. That is <b>Comparable</b>: the object itself knows how to compare to another of its kind. Now imagine a talent show where the <b>judges</b> decide the order: one judge ranks by age, another by height, a third by name then age. The contestants do not change; you just <b>hire a different judge</b>. That is <b>Comparator</b>: a separate referee object you can swap, combine and reverse, without touching the class.</p>`,
    explain: `<p>Sorting, <code>TreeMap</code>, <code>TreeSet</code>, <code>PriorityQueue</code>, <code>Collections.max</code> and <code>stream.sorted()</code> all need one question answered: <b>"does a come before b?"</b> Java answers it with an <code>int</code>:</p>
${H.table(['Return value', 'Meaning'], [[H.c('b', 'negative'), 'a comes <b>before</b> b'], ['<b>0</b>', 'a and b are tied (same position)'], [H.c('p', 'positive'), 'a comes <b>after</b> b']])}
<p>Only the <b>sign</b> matters: -1, -7 and -1000 all mean "before".</p>
<h4>1. Comparable — the natural order (inside the class)</h4>
<pre><code>class Student implements Comparable&lt;Student&gt; {
    String name; int marks;
    public int compareTo(Student other) {
        return Integer.compare(this.marks, other.marks);   // ascending by marks
    }
}
Collections.sort(students);      // uses compareTo automatically</code></pre>
<p>String (alphabetical, by char codes), Integer, LocalDate, BigDecimal and enums are all <code>Comparable</code> already. A class can have <b>only one</b> natural order.</p>
<h4>2. Comparator — any number of external orders</h4>
<pre><code>Comparator&lt;Student&gt; byName = Comparator.comparing(Student::name);
Comparator&lt;Student&gt; best   = Comparator.comparingInt(Student::marks).reversed()
                                       .thenComparing(Student::name);
students.sort(best);             // highest marks first, ties by name</code></pre>
${H.table(['', 'Comparable&lt;T&gt;', 'Comparator&lt;T&gt;'], [
  ['Package', '<code>java.lang</code>', '<code>java.util</code>'],
  ['Method', '<code>int compareTo(T other)</code>', '<code>int compare(T a, T b)</code>'],
  ['Where it lives', 'inside the class itself', 'separate object / lambda'],
  ['How many orders', 'exactly one (natural)', 'as many as you like'],
  ['Need to edit the class?', 'yes', 'no — works on classes you do not own'],
  ['Used by default in', 'Collections.sort(list), TreeMap(), new TreeSet()', 'list.sort(cmp), new TreeMap(cmp), PriorityQueue(cmp)']
])}
<h4>3. The Comparator builder toolbox (Java 8+)</h4>
<ul>
<li><code>Comparator.comparing(keyFn)</code>, <code>comparingInt / comparingLong / comparingDouble</code> (no boxing)</li>
<li><code>.thenComparing(next)</code> — tie-breaker; chain as many as you like</li>
<li><code>.reversed()</code> — flips the <b>whole chain built so far</b></li>
<li><code>Comparator.naturalOrder()</code>, <code>Comparator.reverseOrder()</code>, <code>Collections.reverseOrder()</code></li>
<li><code>Comparator.nullsFirst(cmp)</code> / <code>nullsLast(cmp)</code> — handle null elements safely</li>
<li><code>Map.Entry.comparingByValue()</code> / <code>comparingByKey()</code> — sort map entries</li>
<li><code>String.CASE_INSENSITIVE_ORDER</code> — case-insensitive text order</li>
</ul>
<h4>4. The classic bug: <code>return a - b;</code></h4>
<p>Subtraction looks neat but <b>overflows</b>: with a = 2 000 000 000 and b = -2 000 000 000, <code>a - b</code> wraps to a <b>negative</b> number, claiming a &lt; b. Always use <code>Integer.compare(a, b)</code> (or <code>Long.compare</code>, <code>Double.compare</code>).</p>
<h4>5. The contract</h4>
<ul>
<li><b>Antisymmetric:</b> sign(compare(a, b)) = −sign(compare(b, a)).</li>
<li><b>Transitive:</b> a &gt; b and b &gt; c ⇒ a &gt; c. (Violating it can make TimSort throw <i>"Comparison method violates its general contract!"</i>.)</li>
<li><b>Consistent with equals (strongly recommended):</b> compare(a, b) == 0 exactly when a.equals(b). <code>TreeSet</code>/<code>TreeMap</code> use <b>compare</b>, not equals, to detect duplicates — so a comparator by length treats "cat" and "dog" as the <b>same</b> element!</li>
</ul>`,
    clues: [
      '"Sort objects by X, then by Y" / "ties broken by" → <code>Comparator.comparing(X).thenComparing(Y)</code>',
      '"Sort in descending order" → <code>.reversed()</code> or <code>Comparator.reverseOrder()</code> (watch what reversed() applies to)',
      '"Top K / k-th largest / always process the smallest next" → <code>PriorityQueue</code> with a comparator',
      '"Natural ordering" / "implement compareTo" / "make it usable as a TreeMap key" → <code>Comparable</code>',
      '"Sort a class you cannot modify" (third-party, JDK type) → <code>Comparator</code>',
      '"Comparison method violates its general contract!" or wrong order for huge values → non-transitive comparator or <code>a - b</code> overflow',
      '"TreeSet lost some of my elements" → comparator returns 0 for distinct objects (inconsistent with equals)',
      '"Largest number formed by concatenation" / custom string order → comparator on <code>(a + b).compareTo(b + a)</code>'
    ],
    code: [R`
// Comparable: one natural order built into the class
import java.util.*;

class Student implements Comparable<Student> {
    final String name;
    final int marks;
    Student(String name, int marks) { this.name = name; this.marks = marks; }

    @Override
    public int compareTo(Student other) {
        int byMarks = Integer.compare(this.marks, other.marks);   // never this.marks - other.marks
        if (byMarks != 0) return byMarks;
        return this.name.compareTo(other.name);                   // tie-break keeps it consistent with equals
    }

    @Override public boolean equals(Object o) {
        return o instanceof Student s && s.marks == marks && s.name.equals(name);
    }
    @Override public int hashCode() { return Objects.hash(name, marks); }
    @Override public String toString() { return name + ":" + marks; }
}

public class NaturalOrder {
    public static void main(String[] args) {
        List<Student> list = new ArrayList<>(List.of(new Student("Ravi", 82), new Student("Asha", 91), new Student("Ben", 82)));
        Collections.sort(list);                        // uses compareTo
        System.out.println(list);                      // [Ben:82, Ravi:82, Asha:91]
        TreeSet<Student> tree = new TreeSet<>(list);   // TreeSet also uses compareTo
        System.out.println(tree.first() + " " + tree.last()); // Ben:82 Asha:91
    }
}`, R`
// Comparator: many orders, built from small pieces
import java.util.*;

record Person(String name, int age, String city) {}

public class ManyOrders {
    public static void main(String[] args) {
        List<Person> people = new ArrayList<>(List.of(
            new Person("Asha", 30, "Pune"), new Person("Ben", 25, null),
            new Person("Cara", 30, "Delhi"), new Person("Dev", 22, "Pune")));

        people.sort(Comparator.comparingInt(Person::age));                       // youngest first
        System.out.println(people.get(0).name());                                 // Dev

        people.sort(Comparator.comparingInt(Person::age).reversed()
                              .thenComparing(Person::name));                       // oldest first, ties by name
        System.out.println(people.stream().map(Person::name).toList());           // [Asha, Cara, Ben, Dev]

        people.sort(Comparator.comparing(Person::city, Comparator.nullsLast(Comparator.naturalOrder())));
        System.out.println(people.get(people.size() - 1).name());                 // Ben (null city last)

        // Lambda pitfall: comparing(p -> p.age()).reversed() does not compile (p inferred as Object);
        // give the type explicitly or use a method reference:
        Comparator<Person> byAgeDesc = Comparator.comparing((Person p) -> p.age()).reversed();
        System.out.println(Collections.min(people, byAgeDesc).name());           // Cara (oldest; Collections.min keeps the first of tied elements in list order)

        Map<String, Integer> score = new HashMap<>(Map.of("x", 3, "y", 9, "z", 1));
        List<Map.Entry<String, Integer>> entries = new ArrayList<>(score.entrySet());
        entries.sort(Map.Entry.<String, Integer>comparingByValue().reversed());
        System.out.println(entries.get(0).getKey());                              // y
    }
}`, R`
// TreeSet uses compare(), not equals(): a length comparator merges different words
import java.util.*;

public class TreeSetTrap {
    public static void main(String[] args) {
        Set<String> byLength = new TreeSet<>(Comparator.comparingInt(String::length));
        byLength.addAll(List.of("cat", "dog", "horse", "ox"));
        System.out.println(byLength);                       // [ox, cat, horse]  ("dog" ties with "cat" -> dropped)

        Set<String> fixed = new TreeSet<>(Comparator.comparingInt(String::length)
                                                   .thenComparing(Comparator.naturalOrder()));
        fixed.addAll(List.of("cat", "dog", "horse", "ox"));
        System.out.println(fixed);                          // [ox, cat, dog, horse]
    }
}`],
    codeTitle: ['Comparable with a safe compareTo', 'Comparator builders: comparing, thenComparing, reversed, nullsLast', 'TreeSet duplicates are decided by compare()'],
    viz: [{
      title: 'Sorting people with a comparator chain (insertion sort, step by step)',
      input: 'age,name',
      inputLabel: 'keys, comma separated: age, -age, name, -name, len (e.g. -age,name)',
      gen: function (input) {
        var spec = String(input === undefined || input === null ? '' : input).trim().split(/\s*,\s*/).filter(Boolean);
        var allowed = ['age', '-age', 'name', '-name', 'len', '-len'];
        if (!spec.length || spec.length > 3 || spec.some(function (s) { return allowed.indexOf(s) < 0; })) throw new Error('Use 1-3 keys from: age, -age, name, -name, len, -len  (e.g. -age,name)');
        var people = [['Asha', 30], ['Ben', 25], ['Cara', 30], ['Dev', 22], ['Eli', 25], ['Abe', 22]];
        function key(p, k) { var b = k.replace('-', ''); return b === 'age' ? p[1] : b === 'len' ? p[0].length : p[0]; }
        function cmp(a, b) {
          for (var i = 0; i < spec.length; i++) {
            var k = spec[i], x = key(a, k), y = key(b, k), r = x < y ? -1 : x > y ? 1 : 0;
            if (k[0] === '-') r = -r;
            if (r !== 0) return { r: r, by: k };
          }
          return { r: 0, by: 'all tied' };
        }
        var codeLines = spec.map(function (k, i) { var b = k.replace('-', ''); var fn = b === 'age' ? 'comparingInt(Person::age)' : b === 'len' ? 'comparingInt(p -> p.name().length())' : 'comparing(Person::name)'; return (i === 0 ? 'Comparator<Person> cmp = Comparator.' + fn : '        .thenComparing(Comparator.' + fn) + (k[0] === '-' ? '.reversed()' : '') + (i === 0 ? '' : ')'); });
        var code = codeLines.join('\n') + ';\nlist.sort(cmp);   // TimSort; we animate the simpler insertion sort';
        var arr = people.map(function (p) { return p.slice(); }), f = [];
        function tab(hl) { return { type: 'table', label: 'list (top = first)', columns: ['#', 'name', 'age', 'len'], rows: arr.map(function (p, i) { return [String(i), p[0], String(p[1]), String(p[0].length)]; }), hl: hl || {} }; }
        f.push({ narr: 'Comparator chain: <b>' + spec.join(' → ') + '</b>. A minus means descending. Each later key is only consulted when all earlier keys <b>tie</b> (return 0).', parts: [{ type: 'code', label: 'Comparator', lang: 'java', code: code, hl: { 1: 'cur' } }, tab()] });
        for (var i = 1; i < arr.length; i++) {
          var j = i;
          while (j > 0) {
            var c = cmp(arr[j - 1], arr[j]), hl = {};
            hl[j - 1] = 'cur'; hl[j] = 'cur';
            if (c.r > 0) {
              f.push({ narr: 'compare(' + arr[j - 1][0] + ', ' + arr[j][0] + ') → <b>positive</b> (decided by <code>' + c.by + '</code>): ' + arr[j - 1][0] + ' must come <b>after</b> ' + arr[j][0] + ', so swap.', parts: [tab(hl), { type: 'vars', label: 'compare result', vals: { a: arr[j - 1][0], b: arr[j][0], 'decided by': c.by, result: '+' + c.r }, hl: { result: 'bad' } }] });
              var t = arr[j - 1]; arr[j - 1] = arr[j]; arr[j] = t; j--;
            } else {
              f.push({ narr: 'compare(' + arr[j - 1][0] + ', ' + arr[j][0] + ') → <b>' + (c.r < 0 ? 'negative' : 'zero') + '</b> (' + c.by + '): already in order' + (c.r === 0 ? ' — a tie keeps the original order (the sort is <b>stable</b>)' : '') + '. Stop.', parts: [tab(hl), { type: 'vars', label: 'compare result', vals: { a: arr[j - 1][0], b: arr[j][0], 'decided by': c.by, result: c.r }, hl: { result: 'ok' } }] });
              break;
            }
          }
        }
        var done = {}; arr.forEach(function (_, i) { done[i] = 'sel'; });
        f.push({ narr: 'Sorted by <b>' + spec.join(', then ') + '</b>: ' + arr.map(function (p) { return p[0]; }).join(', ') + '. Try <code>-age,name</code> or <code>len,-name</code> to see how tie-breakers change the result.', parts: [{ type: 'code', label: 'Comparator', lang: 'java', code: code, hl: {} }, tab(done)] });
        return f;
      }
    }, {
      title: 'Why "return a - b" is a broken comparator',
      input: '2000000000 -2000000000',
      inputLabel: 'two ints a b',
      gen: function (input) {
        var p = String(input === undefined || input === null ? '' : input).trim().split(/[\s,]+/);
        if (p.length !== 2 || p.some(function (x) { return !/^-?\d+$/.test(x); })) throw new Error('Type two integers, e.g. 2000000000 -2000000000');
        var a = Number(p[0]), b = Number(p[1]);
        if (a > 2147483647 || a < -2147483648 || b > 2147483647 || b < -2147483648) throw new Error('Both values must fit in an int (-2147483648..2147483647)');
        var real = a - b, wrapped = i32(a - b), ok = Math.sign(real) === Math.sign(wrapped);
        var correct = a < b ? -1 : a > b ? 1 : 0;
        var f = [];
        var code = 'Comparator<Integer> bad  = (x, y) -> x - y;             // overflow risk\nComparator<Integer> good = (x, y) -> Integer.compare(x, y);';
        f.push({ narr: 'We compare a = <b>' + a + '</b> and b = <b>' + b + '</b>. The true answer: a is ' + (correct < 0 ? 'smaller' : correct > 0 ? 'bigger' : 'equal') + ', so compare should be <b>' + (correct < 0 ? 'negative' : correct > 0 ? 'positive' : 'zero') + '</b>.', parts: [{ type: 'code', label: 'Two comparators', lang: 'java', code: code, hl: { 1: 'cur' } }, { type: 'vars', label: 'inputs', vals: { a: a, b: b } }] });
        f.push({ narr: 'In real maths a − b = <b>' + real + '</b>. ' + (Math.abs(real) > 2147483647 ? 'That is outside the int range (±2 147 483 647)!' : 'That fits in an int, so no overflow this time.'), parts: [{ type: 'vars', label: 'maths vs int', vals: { 'a - b (maths)': real, 'int range': '-2147483648 .. 2147483647' }, hl: { 'a - b (maths)': Math.abs(real) > 2147483647 ? 'bad' : 'ok' } }] });
        f.push({ narr: 'Java int arithmetic keeps only 32 bits, so the result wraps to <b>' + wrapped + '</b>. The top bit (bit 31) is the sign bit: ' + (wrapped < 0 ? '1 → negative' : '0 → non-negative') + '.', parts: [{ type: 'bits', label: 'a - b as a Java int', value: wrapped >>> 0, width: 32, hl: { 31: ok ? 'ok' : 'bad' } }, { type: 'vars', label: 'int result', vals: { 'x - y': wrapped }, hl: { 'x - y': ok ? 'ok' : 'bad' } }] });
        f.push({ narr: ok ? 'Here the sign is still right, so <code>x - y</code> happens to work. Try <code>2000000000 -2000000000</code> or <code>-2147483648 1</code> to break it.' : '<span class="c-r">Wrong sign!</span> The bad comparator says a is ' + (wrapped < 0 ? 'smaller' : 'bigger') + ' than b. A sort would put them in the wrong order, and TimSort may even throw "Comparison method violates its general contract!".', parts: [{ type: 'table', label: 'Verdict', columns: ['comparator', 'returns', 'correct?'], rows: [['x - y', String(wrapped), ok ? 'yes (lucky)' : 'NO'], ['Integer.compare(x, y)', String(correct), 'yes, always']], hl: { 0: ok ? 'ok' : 'bad', 1: 'ok' } }] });
        f.push({ narr: '<code>Integer.compare</code> is literally <code>(x &lt; y) ? -1 : ((x == y) ? 0 : 1)</code> — two comparisons, no arithmetic, no overflow. Same story for <code>Long.compare</code> and <code>Double.compare</code> (which also orders NaN and -0.0 consistently).', parts: [{ type: 'code', label: 'JDK source', lang: 'java', code: 'public static int compare(int x, int y) {\n    return (x < y) ? -1 : ((x == y) ? 0 : 1);\n}', hl: { 2: 'ok' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'reversed() flips everything before it', html: `<p><code>comparing(age).thenComparing(name).reversed()</code> reverses <b>both</b> keys (oldest first <i>and</i> names Z→A). To reverse only age, put <code>reversed()</code> right after the age comparator, or use <code>thenComparing(name)</code> after it. Output: <code>[Cara, Asha, Ben] [Asha, Cara, Ben]</code>.</p>`, code: R`
record P(String name, int age) {}
List<P> ps = new ArrayList<>(List.of(new P("Asha", 30), new P("Ben", 25), new P("Cara", 30)));
ps.sort(Comparator.comparingInt(P::age).thenComparing(P::name).reversed());
List<String> a = ps.stream().map(P::name).toList();
ps.sort(Comparator.comparingInt(P::age).reversed().thenComparing(P::name));
List<String> b = ps.stream().map(P::name).toList();
System.out.println(a + " " + b);` },
      { title: 'PriorityQueue as a max-heap with a comparator', html: `<p>A <code>PriorityQueue</code> is a <b>min</b>-heap by natural order. Pass <code>Comparator.reverseOrder()</code> to make it a max-heap — the standard trick for "top K" questions. Output: <code>9 7 5</code>.</p>`, code: R`
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());
for (int x : new int[]{5, 9, 1, 7}) maxHeap.add(x);
System.out.println(maxHeap.poll() + " " + maxHeap.poll() + " " + maxHeap.poll());` },
      { title: 'String natural order is by char codes', html: `<p><code>compareTo</code> compares char codes left to right; uppercase letters (65–90) come before lowercase (97–122), and a prefix comes before the longer string. Output: <code>[Banana, apple, cherry] [apple, Banana, cherry]</code>.</p>`, code: R`
List<String> w = new ArrayList<>(List.of("cherry", "apple", "Banana"));
Collections.sort(w);
List<String> natural = new ArrayList<>(w);
w.sort(String.CASE_INSENSITIVE_ORDER);
System.out.println(natural + " " + w);` },
      { title: 'Making an enum-like rank order with a Map', html: `<p>Need "HIGH before MEDIUM before LOW"? Alphabetical order is wrong (HIGH, LOW, MEDIUM). Use an enum (natural order = declaration order) or a rank lookup. Output: <code>[HIGH, MEDIUM, LOW]</code>.</p>`, code: R`
Map<String, Integer> rank = Map.of("HIGH", 0, "MEDIUM", 1, "LOW", 2);
List<String> tasks = new ArrayList<>(List.of("LOW", "HIGH", "MEDIUM"));
tasks.sort(Comparator.comparing(rank::get));
System.out.println(tasks);` }
    ],
    deepDive: `<p><b>What the sorts actually are:</b> <code>Arrays.sort(int[])</code> (primitives) uses <b>Dual-Pivot Quicksort</b> — fast, not stable (stability is meaningless for primitives). <code>Arrays.sort(Object[])</code>, <code>Collections.sort</code> and <code>List.sort</code> use <b>TimSort</b> — a stable, adaptive merge sort that is O(n) on already-sorted input and O(n log n) worst case. Stability is why "sort by name, then stable-sort by age" gives age-then-name order.</p>
<p><b>Contract violations are detected, not tolerated:</b> TimSort's galloping mode relies on transitivity; a comparator like <code>(a, b) -&gt; random</code> or one mixing <code>a - b</code> overflow with ties can trigger <code>IllegalArgumentException: Comparison method violates its general contract!</code> — but only on some inputs (typically ≥ 32 elements), which makes it a nasty production-only bug. The legacy flag <code>-Djava.util.Arrays.useLegacyMergeSort=true</code> hides it but is not a fix.</p>
<p><b>Consistent with equals:</b> <code>BigDecimal</code> is the famous inconsistent case (1.0 vs 1.00: compareTo 0, equals false). Sorted collections follow <code>compare</code>; hash collections follow <code>equals</code>. The docs of <code>SortedSet</code> warn that an inconsistent comparator makes the set "obey compare but violate the Set contract".</p>
<p><b>Boxing in comparators:</b> <code>Comparator.comparing(Person::age)</code> boxes every age to <code>Integer</code> for each comparison; <code>comparingInt</code> does not. For millions of elements the difference is measurable. <b>Performance tip:</b> compute expensive keys once (decorate-sort-undecorate or cache keys) instead of in every <code>compare</code> call — a sort makes ~n log n comparisons.</p>
<p><b>Generics detail:</b> the signature <code>&lt;T extends Comparable&lt;? super T&gt;&gt; void sort(List&lt;T&gt;)</code> lets a subclass sort with its parent's <code>compareTo</code>. Lambdas lose type information through chained calls, which is why <code>comparing(p -&gt; p.age()).reversed()</code> fails to compile: the target type of the lambda is not known when <code>reversed()</code> is called on it.</p>`,
    aiEra: `<p><b>What AI changes:</b> comparator chains are a perfect AI task — describe the order in English ("highest score first, then earliest submission, nulls last") and the assistant produces the <code>Comparator.comparing...</code> chain in seconds. Your job becomes <b>checking the semantics</b>: is <code>reversed()</code> in the right place? Are nulls handled? Is it consistent with equals if it feeds a <code>TreeSet</code>?</p>
<p><b>Use AI as a partner:</b> ask <code>"Write a property test that checks antisymmetry and transitivity of this comparator over random inputs including Integer.MIN_VALUE, MAX_VALUE, null and NaN"</code>. Ask it to explain in plain words what order a given chain produces for 5 sample rows — and compare with what you expected.</p>
<p><b>Where AI goes wrong:</b> it still sometimes writes <code>(a, b) -&gt; a - b</code> (copied from countless tutorials), puts <code>.reversed()</code> at the end of a chain when only one key should flip, or uses a lambda that does not compile with <code>.reversed()</code>. <b>What you must still own:</b> the sign convention, the contract, the stability guarantee of TimSort, and the TreeSet/compare duplicate semantics.</p>`,
    problems: [{
      title: 'Sort Array by Increasing Frequency',
      level: 'Medium', tags: ['comparator', 'hashmap', 'sorting', 'boxing'], companies: ['Amazon', 'eBay', 'Twilio'],
      statement: `<p>Given an <code>int[] nums</code>, sort it in <b>increasing order of frequency</b>. If several values have the same frequency, sort them in <b>decreasing</b> order of value. Return the sorted array. (LeetCode 1636)</p>`,
      constraints: `1 ≤ n ≤ 100; -100 ≤ nums[i] ≤ 100 (the technique must also scale to n = 10<sup>5</sup>)`,
      example: `<p><code>[1,1,2,2,2,3]</code> → ${H.c('g', '<code>[3,1,1,2,2,2]</code>')}: 3 appears once, 1 twice, 2 three times.<br><code>[2,3,1,3,2]</code> → ${H.c('g', '<code>[1,3,3,2,2]</code>')}: 2 and 3 both appear twice, so the bigger value (3) comes first.</p>`,
      brute: {
        why: `<p>Counting each element's frequency by scanning the whole array again costs O(n) per element — O(n²) just for counts — and then a hand-written bubble sort is another O(n²). It works for n = 100 but not for 10<sup>5</sup>.</p>`,
        code: R`
static int[] frequencySortBrute(int[] nums) {
    int n = nums.length;
    int[] a = nums.clone();
    for (int i = 0; i < n; i++)
        for (int j = 0; j + 1 < n - i; j++) {
            int fa = 0, fb = 0;
            for (int x : nums) { if (x == a[j]) fa++; if (x == a[j + 1]) fb++; }  // recount every time
            boolean swap = fa > fb || (fa == fb && a[j] < a[j + 1]);
            if (swap) { int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; }
        }
    return a;
}`
      },
      mcq: { q: 'Why do most Java solutions copy the <code>int[]</code> into an <code>Integer[]</code> first?', options: ['Integer is faster', '<code>Arrays.sort(int[], Comparator)</code> does not exist — comparators only work on object arrays', 'To avoid overflow', 'Because HashMap needs it'], answer: 1, explain: 'Comparators are generic (<code>Comparator&lt;T&gt;</code>) and generics need objects. Primitive arrays can only be sorted in natural order, so we box (or sort a list / stream of boxed values).' },
      hints: [
        `<p>Hint 1: Count frequencies once with a <code>HashMap&lt;Integer, Integer&gt;</code> (or an array of size 201 with an offset of 100).</p>`,
        `<p>Hint 2: Sort with a comparator: primary key = frequency ascending, tie-breaker = value <b>descending</b>.</p>`,
        `<p>Hint 3: Box into <code>Integer[]</code>, call <code>Arrays.sort(boxed, cmp)</code>, then copy back. Use <code>Integer.compare</code> (never subtraction) and remember map values are boxed — read them with <code>get</code>, which never returns null here because every value was counted.</p>`
      ],
      tests: { sig: 'int[] -> int[]', fn: 'frequencySort', cases: [
        [[[1,1,2,2,2,3]],[3,1,1,2,2,2]],
        [[[2,3,1,3,2]],[1,3,3,2,2]],
        [[[-1,1,-6,4,5,-6,1,4,1]],[5,-1,4,4,-6,-6,1,1,1]],
        [[[5]],[5]],
        [[[7,7,7]],[7,7,7]],
        [[[3,2,1]],[3,2,1]],
        [[[1,2,3]],[3,2,1]],
        [[[0,0,-100,100]],[100,-100,0,0]],
        [[[-100,-100,100,100,0]],[0,100,100,-100,-100]],
        [[[4,4,4,5,5,6]],[6,5,5,4,4,4]],
        [[{"$concat":[{"$rep":5,"n":50000},{"$rep":-100,"n":30000},{"$rep":100,"n":20000}]}],{"$concat":[{"$rep":100,"n":20000},{"$rep":-100,"n":30000},{"$rep":5,"n":50000}]}],
        [[{"$rep":0,"n":100000}],{"$rep":0,"n":100000}],
        [[{"$range":[-100,101]}],{"$range":[100,-101,-1]}],
        [[{"$concat":[{"$rep":1,"n":3},{"$rep":2,"n":3},{"$rep":3,"n":3}]}],{"$concat":[{"$rep":3,"n":3},{"$rep":2,"n":3},{"$rep":1,"n":3}]}]
      ] },
      solution: {
        approach: `<p>Count once, then sort boxed values with a two-level comparator: <code>comparingInt(freq::get)</code> then <code>reverseOrder</code> on the value. TimSort does O(n log n) comparisons, each O(1) thanks to the precomputed map.</p>`,
        code: R`
class Solution {
    static int[] frequencySort(int[] nums) {
        Map<Integer, Integer> freq = new HashMap<>();
        for (int x : nums) freq.merge(x, 1, Integer::sum);          // count each value once

        Integer[] boxed = new Integer[nums.length];
        for (int i = 0; i < nums.length; i++) boxed[i] = nums[i];   // comparators need objects

        Comparator<Integer> cmp = Comparator
                .comparingInt((Integer v) -> freq.get(v))           // 1st: rarer values first
                .thenComparing(Comparator.reverseOrder());          // 2nd: bigger value first on ties
        Arrays.sort(boxed, cmp);

        int[] out = new int[nums.length];
        for (int i = 0; i < out.length; i++) out[i] = boxed[i];     // unbox back
        return out;
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(frequencySort(new int[]{1, 1, 2, 2, 2, 3})));  // [3, 1, 1, 2, 2, 2]
        System.out.println(Arrays.toString(frequencySort(new int[]{2, 3, 1, 3, 2})));     // [1, 3, 3, 2, 2]
    }
}`,
        alt: [{ lang: 'python', code: `from collections import Counter\n\ndef frequency_sort(nums):\n    freq = Counter(nums)\n    return sorted(nums, key=lambda v: (freq[v], -v))\n\nprint(frequency_sort([2, 3, 1, 3, 2]))` }],
        dry: { head: ['pair compared', 'freq', 'decided by', 'result'], rows: [
          ['(3, 1)', '1 vs 2', 'frequency', '3 first'], ['(1, 2)', '2 vs 3', 'frequency', '1 first'], ['(3, 2) in [2,3,1,3,2]', '2 vs 2', H.c('y', 'tie → value desc'), '3 before 2'], ['(1, 3)', '1 vs 2', 'frequency', '1 first'], ['final', '—', '—', H.c('g', '[1, 3, 3, 2, 2]')]
        ] },
        complexity: `<p>Counting O(n), sorting <b>O(n log n)</b> comparisons; space O(n) for the map and the boxed copy.</p>`,
        followUps: ['Sort Characters By Frequency (LeetCode 451) — same idea with chars', 'Top K Frequent Elements in O(n) with bucket sort', 'Avoid boxing: encode (freq, -value) into one long key and sort a long[]']
      }
    }]
  });
  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Predict the Output: Pool, new and intern()',
    level: 'Easy', tags: ['predict-the-output', 'string pool', '=='], companies: ['TCS', 'Infosys', 'Capgemini', 'Cognizant'],
    statement: `<p>What does this program print? Work it out on paper first, line by line, drawing which variables point to the <b>pooled</b> object and which point to separate heap objects.</p><pre><code>String a = "cat";
String b = "c" + "at";
String c = new String("cat");
String d = c;
String e = c.intern();
String part = "c";
String f = part + "at";
System.out.println(a == b);
System.out.println(a == c);
System.out.println(c == d);
System.out.println(a == e);
System.out.println(a == f);
System.out.println(a.equals(f));</code></pre>`,
    constraints: `Java 21, default JVM flags. Six lines of output.`,
    example: `<p>Answer: ${H.c('g', 'true')}, ${H.c('r', 'false')}, ${H.c('g', 'true')}, ${H.c('g', 'true')}, ${H.c('r', 'false')}, ${H.c('g', 'true')} — one per line. <code>b</code> is folded at compile time, <code>c</code> is a new object, <code>d</code> copies c's arrow, <code>e</code> is the pooled object, <code>f</code> is built at runtime.</p>`,
    brute: {
      why: `<p>The beginner's mental model: "<code>==</code> checks whether the text is the same". That predicts <b>true</b> six times and gets two lines wrong. <code>==</code> on objects compares references; only literals, compile-time constants and interned Strings share the pooled object.</p>`,
      code: R`
// The WRONG mental model, written as code: treat == as if it were equals()
String a = "cat", c = new String("cat"), f = "c".concat("at");
System.out.println(a.equals(c));   // true  -> the beginner predicts a == c is true too (it is not)
System.out.println(a.equals(f));   // true  -> the beginner predicts a == f is true too (it is not)`
    },
    mcq: { q: 'Why is <code>a == b</code> true?', options: ['Because == compares text', 'Because "c" + "at" is a compile-time constant that javac folds into "cat", which is pooled', 'Because b is final', 'Because of the Integer cache'], answer: 1, explain: 'Only literals are involved, so the compiler writes the single constant "cat" into the class file; both a and b load the same pooled object.' },
    hints: [
      `<p>Hint 1: Mark each right-hand side as <b>literal/constant</b> (pooled), <b>new</b> (fresh heap object) or <b>runtime-built</b> (fresh heap object).</p>`,
      `<p>Hint 2: <code>d = c</code> copies a reference, so c and d are the same object. <code>intern()</code> always returns the pooled object for that text.</p>`,
      `<p>Hint 3: <code>part</code> is not final, so <code>part + "at"</code> runs at runtime through StringConcatFactory and produces a new object. equals() compares letters, so the last line is true.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: "", stdout: "true\nfalse\ntrue\ntrue\nfalse\ntrue" }
    ] },
    solution: {
      approach: `<p>Classify each variable: a, b, e → pooled "cat"; c, d → one heap object; f → another heap object. Then <code>==</code> is true only between variables in the same group, and <code>equals</code> is true for all of them.</p>`,
      code: R`
public class PoolPredict {
    public static void main(String[] args) {
        String a = "cat";               // pooled
        String b = "c" + "at";          // folded by javac -> same pooled object
        String c = new String("cat");   // new heap object #1
        String d = c;                   // same object as c
        String e = c.intern();          // pooled object
        String part = "c";
        String f = part + "at";         // runtime concat -> new heap object #2
        System.out.println(a == b);       // true
        System.out.println(a == c);       // false
        System.out.println(c == d);       // true
        System.out.println(a == e);       // true
        System.out.println(a == f);       // false
        System.out.println(a.equals(f));  // true
    }
}`,
      dry: { head: ['variable', 'points to'], rows: [['a, b, e', 'pooled "cat"'], ['c, d', 'heap object #1'], ['f', 'heap object #2'], ['output', 'true false true true false true']] },
      complexity: `<p>Constant time; the lesson is the object model. Total String objects created at runtime: the pooled "cat", "c" and "at" literals (pooled on first use), heap #1 and heap #2.</p>`,
      followUps: ['What changes if <code>part</code> is declared <code>final</code>?', 'How many objects does <code>new String("cat")</code> create if "cat" was never used before?']
    }
  });

  practice.push({
    title: 'Valid Palindrome (letters and digits only)',
    level: 'Easy', tags: ['strings', 'two pointers', 'Character'], companies: ['Meta', 'Microsoft', 'Amazon'],
    statement: `<p>A phrase is a palindrome if, after converting all upper-case letters to lower case and removing every character that is not a letter or digit, it reads the same forward and backward. Given <code>s</code>, return <code>true</code> if it is a palindrome. (LeetCode 125)</p>`,
    constraints: `1 ≤ s.length() ≤ 2 × 10<sup>5</sup>; printable ASCII`,
    example: `<p><code>"A man, a plan, a canal: Panama"</code> → ${H.c('g', 'true')} ("amanaplanacanalpanama").<br><code>"race a car"</code> → ${H.c('r', 'false')} ("raceacar" reversed is "racaecar").<br><code>" "</code> → ${H.c('g', 'true')} (empty after cleaning).</p>`,
    brute: {
      why: `<p>Build a cleaned String with <code>+=</code> (O(n²) copying because Strings are immutable), then create a reversed copy and compare. Even with a StringBuilder this uses O(n) extra memory for two copies, when two pointers need none.</p>`,
      code: R`
static boolean isPalindromeBrute(String s) {
    String clean = "";
    for (char c : s.toCharArray())
        if (Character.isLetterOrDigit(c)) clean += Character.toLowerCase(c);   // O(n^2) copying
    String rev = new StringBuilder(clean).reverse().toString();
    return clean.equals(rev);                                                 // not ==
}`
    },
    mcq: { q: 'Which Character method keeps exactly the characters the problem cares about?', options: ['<code>Character.isLetter</code>', '<code>Character.isLetterOrDigit</code>', '<code>Character.isAlphabetic</code>', '<code>Character.isWhitespace</code>'], answer: 1, explain: 'Digits count too ("0P" is not a palindrome because 0 ≠ p). isLetter alone would drop digits.' },
    hints: [
      `<p>Hint 1: You never need the cleaned String; compare characters directly from both ends.</p>`,
      `<p>Hint 2: Two pointers L and R: skip non-alphanumeric chars on each side, then compare lower-cased chars.</p>`,
      `<p>Hint 3: Recipe — while L &lt; R: advance L while not letterOrDigit; retreat R likewise; if <code>Character.toLowerCase</code> differs return false; L++, R--. Return true.</p>`
    ],
    tests: { sig: 'string -> bool', fn: 'isPalindrome', cases: [
      [["A man, a plan, a canal: Panama"],true],
      [["race a car"],false],
      [[" "],true],
      [["a"],true],
      [["ab"],false],
      [["0P"],false],
      [[".,"],true],
      [["aa"],true],
      [["Aa"],true],
      [["12321"],true],
      [["1231"],false],
      [["a.b,a"],true],
      [["ab_a"],true],
      [["Was it a car or a cat I saw?"],true],
      [["No x in Nixon"],true],
      [["!@#$%^&*()"],true],
      [["a1b2"],false],
      [[{"$rep":"a","n":200000}],true],
      [[{"$concat":[{"$rep":"a","n":100000},"b",{"$rep":"a","n":99999}]}],false],
      [[{"$rep":"ab, ","n":50000}],false],
      [[{"$concat":[{"$rep":".","n":100000},"ab",{"$rep":".","n":99998}]}],false],
      [[{"$concat":[{"$rep":"a","n":99999},". ",{"$rep":"a","n":99999}]}],true]
    ] },
    solution: {
      approach: `<p>Two pointers moving inward, skipping junk with <code>Character.isLetterOrDigit</code> and comparing with <code>Character.toLowerCase</code>. No new Strings are created.</p>`,
      code: R`
class Solution {
    static boolean isPalindrome(String s) {
        int l = 0, r = s.length() - 1;
        while (l < r) {
            while (l < r && !Character.isLetterOrDigit(s.charAt(l))) l++;   // skip junk on the left
            while (l < r && !Character.isLetterOrDigit(s.charAt(r))) r--;   // skip junk on the right
            if (Character.toLowerCase(s.charAt(l)) != Character.toLowerCase(s.charAt(r))) return false;
            l++;
            r--;
        }
        return true;
    }
    public static void main(String[] args) {
        System.out.println(isPalindrome("A man, a plan, a canal: Panama")); // true
        System.out.println(isPalindrome("race a car"));                     // false
    }
}`,
      alt: [{ lang: 'python', code: `def is_palindrome(s):\n    l, r = 0, len(s) - 1\n    while l < r:\n        while l < r and not s[l].isalnum():\n            l += 1\n        while l < r and not s[r].isalnum():\n            r -= 1\n        if s[l].lower() != s[r].lower():\n            return False\n        l, r = l + 1, r - 1\n    return True\n\nprint(is_palindrome("A man, a plan, a canal: Panama"))` }],
      dry: { head: ['l', 'r', 's[l]', 's[r]', 'action'], rows: [['0', '9', "'r'", "'r'", 'match'], ['1', '8', "'a'", "'a'", 'match'], ['2', '7', "'c'", "'c'", 'match'], ['3', '6', "'e'", "' ' → skip to 'a' (5)", H.c('r', "'e' ≠ 'a' → false")]] },
      complexity: `<p>Time <b>O(n)</b>, extra space <b>O(1)</b>.</p>`,
      followUps: ['Valid Palindrome II: allow deleting one character', 'Handle full Unicode with code points instead of chars']
    }
  });

  practice.push({
    title: 'Valid Anagram',
    level: 'Easy', tags: ['strings', 'counting', 'arrays'], companies: ['Amazon', 'Uber', 'Bloomberg'],
    statement: `<p>Given two Strings <code>s</code> and <code>t</code> of lower-case English letters, return <code>true</code> if <code>t</code> is an anagram of <code>s</code> — the same letters with the same counts, in any order. (LeetCode 242)</p>`,
    constraints: `1 ≤ s.length(), t.length() ≤ 5 × 10<sup>4</sup>; 'a'..'z' only`,
    example: `<p><code>s = "anagram", t = "nagaram"</code> → ${H.c('g', 'true')} (a×3, n, g, r, m on both sides).<br><code>s = "rat", t = "car"</code> → ${H.c('r', 'false')} ('t' vs 'c').</p>`,
    brute: {
      why: `<p>For each char of <code>s</code>, search for it in a mutable copy of <code>t</code> and delete it: <code>indexOf</code> + <code>deleteCharAt</code> are O(n) each, so the whole thing is O(n²). Sorting both char arrays is better (O(n log n)) but still does more work than counting.</p>`,
      code: R`
static boolean isAnagramBrute(String s, String t) {
    if (s.length() != t.length()) return false;
    StringBuilder rest = new StringBuilder(t);
    for (char c : s.toCharArray()) {
        int at = rest.indexOf(String.valueOf(c));   // O(n) search
        if (at < 0) return false;
        rest.deleteCharAt(at);                       // O(n) shift
    }
    return true;
}`
    },
    mcq: { q: 'What does <code>c - \'a\'</code> give for <code>c = \'d\'</code>?', options: ['"d"', '3', '100', 'a compile error'], answer: 1, explain: 'chars are numbers: \'d\' is 100 and \'a\' is 97, so the difference 3 is a perfect index into an int[26].' },
    hints: [
      `<p>Hint 1: Different lengths can never be anagrams — check that first.</p>`,
      `<p>Hint 2: Keep <code>int[26] count</code>; add 1 for every char of s and subtract 1 for every char of t (index <code>c - 'a'</code>).</p>`,
      `<p>Hint 3: At the end every count must be 0. No HashMap or boxing needed for a fixed alphabet; use a <code>HashMap&lt;Character, Integer&gt;</code> only for Unicode input.</p>`
    ],
    tests: { sig: 'string string -> bool', fn: 'isAnagram', cases: [
      [["anagram","nagaram"],true],
      [["rat","car"],false],
      [["a","a"],true],
      [["a","b"],false],
      [["ab","a"],false],
      [["a","ab"],false],
      [["aab","abb"],false],
      [["listen","silent"],true],
      [["aa","aa"],true],
      [["abc","cba"],true],
      [["zz","zy"],false],
      [["abcdefghijklmnopqrstuvwxyz","zyxwvutsrqponmlkjihgfedcba"],true],
      [[{"$rep":"ab","n":25000},{"$rep":"ba","n":25000}],true],
      [[{"$rep":"a","n":50000},{"$concat":[{"$rep":"a","n":49999},"b"]}],false],
      [[{"$rep":"z","n":50000},{"$rep":"z","n":50000}],true],
      [[{"$rep":"a","n":50000},{"$rep":"a","n":49999}],false]
    ] },
    solution: {
      approach: `<p>Count letters with a primitive <code>int[26]</code> — no wrapper objects, no sorting. One pass adds for s and subtracts for t; anagrams leave every slot at zero.</p>`,
      code: R`
class Solution {
    static boolean isAnagram(String s, String t) {
        if (s.length() != t.length()) return false;
        int[] count = new int[26];
        for (int i = 0; i < s.length(); i++) {
            count[s.charAt(i) - 'a']++;      // char arithmetic gives the index
            count[t.charAt(i) - 'a']--;
        }
        for (int c : count) if (c != 0) return false;
        return true;
    }
    public static void main(String[] args) {
        System.out.println(isAnagram("anagram", "nagaram"));  // true
        System.out.println(isAnagram("rat", "car"));          // false
    }
}`,
      dry: { head: ['i', 's[i]', 't[i]', 'changed counts'], rows: [['0', 'r', 'c', 'r:+1, c:-1'], ['1', 'a', 'a', 'a:+1-1 = 0'], ['2', 't', 'r', 't:+1, r:0'], ['end', '—', '—', H.c('r', 'c=-1, t=+1 → false')]] },
      complexity: `<p>Time <b>O(n)</b>, space <b>O(1)</b> (26 ints).</p>`,
      followUps: ['Unicode input: switch to HashMap&lt;Integer, Integer&gt; over code points', 'Find All Anagrams in a String (sliding window)']
    }
  });

  practice.push({
    title: 'Predict the Output: Integer Cache and Mixed Comparisons',
    level: 'Easy', tags: ['predict-the-output', 'autoboxing', 'Integer cache'], companies: ['Oracle', 'Infosys', 'Wipro', 'HCL'],
    statement: `<p>What does this print? For each line decide: is it comparing <b>references</b> (two wrappers with <code>==</code>), <b>values</b> (a primitive is involved, so unboxing happens), or calling <b>equals</b> (type and value must match)?</p><pre><code>Integer a = 100, b = 100;
Integer c = 200, d = 200;
Long e = 100L;
int f = 200;
System.out.println(a == b);
System.out.println(c == d);
System.out.println(c == f);
System.out.println(c.equals(d));
System.out.println(e.equals(100));
System.out.println(e == 100);</code></pre>`,
    constraints: `Default JVM (Integer cache -128..127).`,
    example: `<p>Answer: ${H.c('g', 'true')}, ${H.c('r', 'false')}, ${H.c('g', 'true')}, ${H.c('g', 'true')}, ${H.c('r', 'false')}, ${H.c('g', 'true')}.</p>`,
    brute: {
      why: `<p>"Numbers are numbers, so every line is true" — the naive model misses two traps: 200 is outside the cache (two different objects), and <code>Long.equals(Integer)</code> is false because the types differ.</p>`,
      code: R`
// Naive model: unbox everything first, then all comparisons look true
int a = 100, b = 100, c = 200, d = 200;
long e = 100L;
System.out.println((a == b) + " " + (c == d) + " " + (e == 100));   // true true true - but with wrappers two lines change`
    },
    mcq: { q: 'Why is <code>e.equals(100)</code> false?', options: ['100 is outside the cache', 'The literal 100 is boxed to an Integer, and Long.equals only accepts a Long', 'Long has no equals method', 'equals compares references'], answer: 1, explain: '<code>Long.equals(Object o)</code> returns <code>o instanceof Long &amp;&amp; value == ((Long) o).longValue()</code>. An Integer is not a Long.' },
    hints: [
      `<p>Hint 1: Two wrappers + <code>==</code> → reference comparison; only -128..127 share cached objects.</p>`,
      `<p>Hint 2: A wrapper + a primitive with <code>==</code> → unboxing, numeric comparison (with widening if needed: Long vs int compares as long).</p>`,
      `<p>Hint 3: <code>equals</code> on wrappers checks the <b>exact type</b> first, then the value. The argument 100 autoboxes to <code>Integer</code>.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: "", stdout: "true\nfalse\ntrue\ntrue\nfalse\ntrue" }
    ] },
    solution: {
      approach: `<p>Line by line: cached 100 → same object; 200 → two objects; mixed with int → value; equals with same type → value; Long vs Integer → false; Long == int literal → unboxed numeric comparison.</p>`,
      code: R`
public class CachePredict {
    public static void main(String[] args) {
        Integer a = 100, b = 100;
        Integer c = 200, d = 200;
        Long e = 100L;
        int f = 200;
        System.out.println(a == b);         // true  (cached object)
        System.out.println(c == d);         // false (two objects)
        System.out.println(c == f);         // true  (c unboxed)
        System.out.println(c.equals(d));    // true  (same type, same value)
        System.out.println(e.equals(100));  // false (Integer is not a Long)
        System.out.println(e == 100);       // true  (e unboxed, 100 widened to long)
    }
}`,
      dry: { head: ['line', 'kind of comparison', 'result'], rows: [['a == b', 'reference, cached', 'true'], ['c == d', 'reference, not cached', 'false'], ['c == f', 'value (unboxing)', 'true'], ['c.equals(d)', 'type + value', 'true'], ['e.equals(100)', 'Long vs Integer', 'false'], ['e == 100', 'value (unboxing + widening)', 'true']] },
      complexity: `<p>O(1). Key idea: count objects and look at the static types of both operands.</p>`,
      followUps: ['What does a == b print if run with -XX:AutoBoxCacheMax=1000 and values 200?', 'Why might a == b change when values come from Integer.valueOf vs new Integer?']
    }
  });
  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Reverse Words in a String',
    level: 'Medium', tags: ['strings', 'StringBuilder', 'two pointers'], companies: ['Microsoft', 'Apple', 'Walmart'],
    statement: `<p>Given a String <code>s</code>, reverse the order of the <b>words</b>. A word is a run of non-space characters. The result must have words separated by exactly one space, with no leading or trailing spaces, even if the input has extra spaces. (LeetCode 151)</p>`,
    constraints: `1 ≤ s.length() ≤ 10<sup>4</sup>; letters, digits and spaces; at least one word`,
    example: `<p><code>"the sky is blue"</code> → ${H.c('g', '"blue is sky the"')}.<br><code>"  hello world  "</code> → ${H.c('g', '"world hello"')} (outer spaces dropped).<br><code>"a good   example"</code> → ${H.c('g', '"example good a"')} (inner run collapsed).</p>`,
    brute: {
      why: `<p>Split with a regex, then prepend each word with <code>result = word + " " + result</code>. Prepending copies the whole result every time → O(n²) characters copied. It also needs a final <code>trim()</code> and allocates many temporary Strings.</p>`,
      code: R`
static String reverseWordsBrute(String s) {
    String[] words = s.trim().split("\\s+");
    String result = "";
    for (String w : words) result = w + " " + result;   // copies everything each time
    return result.trim();
}`
    },
    mcq: { q: 'What does <code>"  a b".split(" ")</code> return?', options: ['["a", "b"]', '["", "", "a", "b"] — leading separators create empty strings', '["  a", "b"]', 'It throws'], answer: 1, explain: 'split keeps leading empty strings (it only drops trailing ones). That is why solutions trim first and split on <code>"\\s+"</code>, or avoid split entirely.' },
    hints: [
      `<p>Hint 1: Walk from the <b>end</b> of the String toward the start; then the first word you find is the one that should come first in the output.</p>`,
      `<p>Hint 2: Skip spaces; when you hit a non-space at index j, move i left while it is non-space; the word is <code>s.substring(i + 1, j + 1)</code> (or append chars directly).</p>`,
      `<p>Hint 3: Append a single space <b>before</b> every word except the first (check <code>sb.length() &gt; 0</code>). This handles all extra spaces with no trim.</p>`
    ],
    tests: { sig: 'string -> string', fn: 'reverseWords', cases: [
      [["the sky is blue"],"blue is sky the"],
      [["  hello world  "],"world hello"],
      [["a good   example"],"example good a"],
      [["a"],"a"],
      [[" a"],"a"],
      [["a "],"a"],
      [["  a  "],"a"],
      [["a b"],"b a"],
      [["one"],"one"],
      [["x  y  z"],"z y x"],
      [["abc 123 def"],"def 123 abc"],
      [["    lots   of   space    "],"space of lots"],
      [[{"$rep":"ab ","n":3333}],"ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab ab"],
      [[{"$concat":[{"$rep":" ","n":5000},"x",{"$rep":" ","n":4999}]}],"x"],
      [[{"$concat":["first",{"$rep":" ","n":9990},"last"]}],"last first"],
      [[{"$rep":"a ","n":5000}],"a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a"]
    ] },
    solution: {
      approach: `<p>One backward scan with a <code>StringBuilder</code>: find each word's end, then its start, append it with a separator only between words. Every character is touched O(1) times.</p>`,
      code: R`
class Solution {
    static String reverseWords(String s) {
        StringBuilder sb = new StringBuilder(s.length());
        int i = s.length() - 1;
        while (i >= 0) {
            while (i >= 0 && s.charAt(i) == ' ') i--;           // skip spaces
            if (i < 0) break;
            int end = i;
            while (i >= 0 && s.charAt(i) != ' ') i--;           // find the start of the word
            if (sb.length() > 0) sb.append(' ');                 // separator only between words
            sb.append(s, i + 1, end + 1);                        // append(CharSequence, start, end): no substring object
        }
        return sb.toString();
    }
    public static void main(String[] args) {
        System.out.println("[" + reverseWords("  hello world  ") + "]");   // [world hello]
        System.out.println(reverseWords("a good   example"));               // example good a
    }
}`,
      alt: [{ lang: 'python', code: `def reverse_words(s):\n    return " ".join(reversed(s.split()))\n\nprint(reverse_words("  hello world  "))` }],
      dry: { head: ['i (word end)', 'word found', 'sb'], rows: [['12', '"world"', '"world"'], ['6', '"hello"', '"world hello"'], ['-1', 'done', H.c('g', '"world hello"')]] },
      complexity: `<p>Time <b>O(n)</b>, space <b>O(n)</b> for the output.</p>`,
      followUps: ['Do it in place on a char[] (reverse all, then reverse each word)', 'Reverse Words in a String III: reverse letters inside each word only']
    }
  });

  practice.push({
    title: 'Predict the Output: StringBuilder Identity, toString Snapshots and Pass-by-Value',
    level: 'Medium', tags: ['predict-the-output', 'StringBuilder', 'StringBuffer', 'immutability'], companies: ['Amazon', 'SAP', 'Morgan Stanley'],
    statement: `<p>What does this program print? Track which variables share the <b>same</b> builder object, when <code>toString()</code> takes a <b>snapshot</b>, and what a method can and cannot change.</p><pre><code>static void change(StringBuffer b) { b.append("y"); }
static void change(String s)       { s = s + "y"; }

StringBuilder sb1 = new StringBuilder("ab");
StringBuilder sb2 = new StringBuilder("ab");
System.out.println(sb1.equals(sb2));
System.out.println(sb1.toString().equals(sb2.toString()));
final StringBuilder sb3 = sb1;
sb3.append("c");
System.out.println(sb1);
String snap = sb1.toString();
sb1.append("d");
System.out.println(snap + " " + sb1);
StringBuffer buf = new StringBuffer("x");
change(buf);
System.out.println(buf);
String t = "x";
change(t);
System.out.println(t);
System.out.println(new StringBuilder('a').length());</code></pre>`,
    constraints: `Java 21. Seven lines of output.`,
    example: `<p>Answer: ${H.c('r', 'false')} / ${H.c('g', 'true')} / <code>abc</code> / <code>abc abcd</code> / <code>xy</code> / <code>x</code> / <code>0</code>.</p>`,
    brute: {
      why: `<p>Common wrong guesses: "two builders with the same text are equal" (true — wrong, equals is identity), "final means sb3 cannot change" (it can — final freezes the reference), "snap follows sb1" (it does not — toString copies), "change(t) appends y" (it cannot — the method moves its own copy of the reference), "<code>new StringBuilder('a')</code> holds 'a'" (it is a capacity of 97).</p>`,
      code: R`
// Wrong intuition, made explicit: comparing builders as if equals() compared content
StringBuilder x = new StringBuilder("ab"), y = new StringBuilder("ab");
boolean guess = x.toString().equals(y.toString());   // true  - what people EXPECT x.equals(y) to give
boolean real = x.equals(y);                           // false - identity comparison
System.out.println(guess + " vs " + real);`
    },
    mcq: { q: 'Why does <code>change(buf)</code> affect the caller but <code>change(t)</code> does not?', options: ['StringBuffer is passed by reference, String by value', 'Both pass a copy of the reference; append mutates the shared object, while s = s + "y" only re-points the local copy', 'Strings are pooled', 'final keyword'], answer: 1, explain: 'Java is always pass-by-value. The value passed is a reference. Mutating the object through it is visible to the caller; re-assigning the parameter is not.' },
    hints: [
      `<p>Hint 1: StringBuilder and StringBuffer inherit <code>equals</code> from Object — identity comparison.</p>`,
      `<p>Hint 2: <code>sb3 = sb1</code> copies the reference; <code>final</code> only stops <code>sb3</code> from being re-assigned. <code>toString()</code> returns a new String that never changes afterwards.</p>`,
      `<p>Hint 3: <code>new StringBuilder(char)</code> does not exist; the char widens to <code>int</code>, selecting <code>StringBuilder(int capacity)</code>.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: "", stdout: "false\ntrue\nabc\nabc abcd\nxy\nx\n0" }
    ] },
    solution: {
      approach: `<p>Draw objects: sb1/sb3 → builder #1, sb2 → builder #2. equals is identity → false; content equal → true; append through sb3 changes builder #1 → "abc"; snap is an immutable copy → "abc abcd"; buf mutated → "xy"; t re-pointed only locally → "x"; capacity constructor → length 0.</p>`,
      code: R`
public class BuilderPredict {
    static void change(StringBuffer b) { b.append("y"); }   // mutates the shared object
    static void change(String s)       { s = s + "y"; }     // moves the local reference only

    public static void main(String[] args) {
        StringBuilder sb1 = new StringBuilder("ab");
        StringBuilder sb2 = new StringBuilder("ab");
        System.out.println(sb1.equals(sb2));                         // false
        System.out.println(sb1.toString().equals(sb2.toString()));   // true
        final StringBuilder sb3 = sb1;
        sb3.append("c");
        System.out.println(sb1);                                     // abc
        String snap = sb1.toString();
        sb1.append("d");
        System.out.println(snap + " " + sb1);                        // abc abcd
        StringBuffer buf = new StringBuffer("x");
        change(buf);
        System.out.println(buf);                                     // xy
        String t = "x";
        change(t);
        System.out.println(t);                                       // x
        System.out.println(new StringBuilder('a').length());         // 0 (capacity 97)
    }
}`,
      dry: { head: ['line', 'objects involved', 'output'], rows: [['sb1.equals(sb2)', '#1 vs #2', 'false'], ['toString equals', '"ab" vs "ab"', 'true'], ['sb3.append', '#1 → "abc"', 'abc'], ['snap', 'copy "abc"; #1 → "abcd"', 'abc abcd'], ['change(buf)', 'buffer → "xy"', 'xy'], ['change(t)', 'local s → "xy", t still "x"', 'x'], ["new StringBuilder('a')", 'capacity 97, empty', '0']] },
      complexity: `<p>O(1). The skill is tracking references vs objects.</p>`,
      followUps: ['How would you compare two builders by content in Java 11+?', 'Is final StringBuilder thread-safe? Why not?']
    }
  });

  practice.push({
    title: 'Group Anagrams',
    level: 'Medium', tags: ['hashing', 'strings', 'equals/hashCode'], companies: ['Amazon', 'Meta', 'Goldman Sachs', 'Yahoo'],
    statement: `<p>Given an array of lower-case Strings, group the anagrams together. Return the groups in any order. (LeetCode 49)</p>`,
    constraints: `1 ≤ n ≤ 10<sup>4</sup>; 0 ≤ word length k ≤ 100; 'a'..'z'`,
    example: `<p><code>["eat","tea","tan","ate","nat","bat"]</code> → ${H.c('g', '[["eat","tea","ate"],["tan","nat"],["bat"]]')}. Words with the same sorted letters ("aet", "ant", "abt") share a group.</p>`,
    brute: {
      why: `<p>Compare every word with the first word of every existing group using an anagram check: O(n² · k). With 10<sup>4</sup> words that is ~10<sup>8</sup> · k operations. The trick is a <b>canonical key</b> so a HashMap does the grouping in one pass.</p>`,
      code: R`
static List<List<String>> groupBrute(String[] words) {
    List<List<String>> groups = new ArrayList<>();
    for (String w : words) {
        boolean placed = false;
        for (List<String> g : groups) {
            char[] a = g.get(0).toCharArray(), b = w.toCharArray();
            Arrays.sort(a); Arrays.sort(b);
            if (Arrays.equals(a, b)) { g.add(w); placed = true; break; }   // O(k log k) per pair
        }
        if (!placed) groups.add(new ArrayList<>(List.of(w)));
    }
    return groups;
}`
    },
    mcq: { q: 'Why can\'t you use the sorted <code>char[]</code> itself as the HashMap key?', options: ['char[] is too big', 'Arrays use identity equals/hashCode, so two equal arrays are different keys', 'HashMap keys must be Strings', 'char[] is mutable but that is fine'], answer: 1, explain: 'Convert to <code>new String(sortedChars)</code> — String has content-based equals/hashCode and is immutable, the perfect key.' },
    hints: [
      `<p>Hint 1: All anagrams share the same multiset of letters; find a representation that is identical for all of them.</p>`,
      `<p>Hint 2: Key = <code>new String(sorted chars)</code> (O(k log k)) or a count signature like "1#0#0#…" (O(k)).</p>`,
      `<p>Hint 3: <code>map.computeIfAbsent(key, x -&gt; new ArrayList&lt;&gt;()).add(word)</code>; return <code>new ArrayList&lt;&gt;(map.values())</code>.</p>`
    ],
    tests: { sig: 'string[] -> list<list<string>>', fn: 'groupAnagrams', cmp: 'sets', cases: [
      [[["eat","tea","tan","ate","nat","bat"]],[["eat","tea","ate"],["tan","nat"],["bat"]]],
      [[[""]],[[""]]],
      [[["a"]],[["a"]]],
      [[["",""]],[["",""]]],
      [[["ab","ba"]],[["ab","ba"]]],
      [[["ab","cd"]],[["ab"],["cd"]]],
      [[["a","a","a"]],[["a","a","a"]]],
      [[["abc","bca","cab","bac","abd"]],[["abc","bca","cab","bac"],["abd"]]],
      [[["","a",""]],[["",""],["a"]]],
      [[["listen","silent","enlist","google","gogole"]],[["listen","silent","enlist"],["google","gogole"]]],
      [[["aab","aba","baa","abb"]],[["aab","aba","baa"],["abb"]]],
      [[{"$rep":"abc","n":10000}],[{"$rep":"abc","n":10000}]],
      [[{"$concat":[{"$rep":"ab","n":5000},{"$rep":"ba","n":5000}]}],[{"$concat":[{"$rep":"ab","n":5000},{"$rep":"ba","n":5000}]}]],
      [[{"$rep":"abcdefghijklmnopqrstuvwxyz","n":100}],[{"$rep":"abcdefghijklmnopqrstuvwxyz","n":100}]]
    ] },
    solution: {
      approach: `<p>One pass: compute a canonical String key per word and bucket words in a <code>HashMap&lt;String, List&lt;String&gt;&gt;</code>. Works because String's equals/hashCode compare content and Strings are immutable keys.</p>`,
      code: R`
class Solution {
    static List<List<String>> groupAnagrams(String[] words) {
        Map<String, List<String>> groups = new HashMap<>();
        for (String w : words) {
            int[] cnt = new int[26];
            for (int i = 0; i < w.length(); i++) cnt[w.charAt(i) - 'a']++;
            StringBuilder key = new StringBuilder(52);
            for (int c : cnt) key.append(c).append('#');        // e.g. "1#0#0#0#1#...": O(k) key
            groups.computeIfAbsent(key.toString(), k -> new ArrayList<>()).add(w);
        }
        return new ArrayList<>(groups.values());
    }
    public static void main(String[] args) {
        System.out.println(groupAnagrams(new String[]{"eat", "tea", "tan", "ate", "nat", "bat"}));
    }
}`,
      alt: [{ lang: 'python', code: `from collections import defaultdict\n\ndef group_anagrams(words):\n    g = defaultdict(list)\n    for w in words:\n        g["".join(sorted(w))].append(w)\n    return list(g.values())\n\nprint(group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))` }],
      dry: { head: ['word', 'key (letters present)', 'group after insert'], rows: [['eat', 'a1 e1 t1', '[eat]'], ['tea', 'a1 e1 t1', '[eat, tea]'], ['tan', 'a1 n1 t1', '[tan]'], ['ate', 'a1 e1 t1', '[eat, tea, ate]'], ['nat', 'a1 n1 t1', '[tan, nat]'], ['bat', 'a1 b1 t1', '[bat]']] },
      complexity: `<p>Time <b>O(n · k)</b> with the count key (O(n · k log k) with sorting); space O(n · k).</p>`,
      followUps: ['Use a record of an int[] as key — why does that fail and how would List.of fix it?', 'Return groups sorted by size, largest first (Comparator)']
    }
  });

  practice.push({
    title: 'Largest Number',
    level: 'Medium', tags: ['comparator', 'strings', 'sorting'], companies: ['Amazon', 'Microsoft', 'Zoho', 'Apple'],
    statement: `<p>Given non-negative integers <code>nums</code>, arrange them so that, when concatenated, they form the <b>largest</b> number. Return it as a String (it may be too big for any numeric type). (LeetCode 179)</p>`,
    constraints: `1 ≤ n ≤ 100; 0 ≤ nums[i] ≤ 10<sup>9</sup>`,
    example: `<p><code>[3,30,34,5,9]</code> → ${H.c('g', '"9534330"')}. Note "3" must come before "30" because "330" &gt; "303".<br><code>[0,0]</code> → ${H.c('y', '"0"')}, not "00".</p>`,
    brute: {
      why: `<p>Try every permutation and keep the biggest concatenation: n! orders — 100! is astronomically large. Even sorting by plain numeric or plain string order is wrong ("30" &gt; "3" lexicographically but "3" should go first).</p>`,
      code: R`
static String best = "";
static String largestBrute(int[] nums) {
    best = "";
    permute(Arrays.stream(nums).mapToObj(String::valueOf).collect(Collectors.toList()), 0);
    return best.startsWith("0") ? "0" : best;
}
static void permute(List<String> a, int k) {
    if (k == a.size()) {
        String s = String.join("", a);
        if (s.compareTo(best) > 0) best = s;      // same length, so string order = numeric order
        return;
    }
    for (int i = k; i < a.size(); i++) {
        Collections.swap(a, k, i);
        permute(a, k + 1);
        Collections.swap(a, k, i);
    }
}`
    },
    mcq: { q: 'Which comparator orders x before y correctly?', options: ['<code>y.compareTo(x)</code>', '<code>(y + x).compareTo(x + y)</code>', '<code>Integer.compare(Integer.parseInt(y), Integer.parseInt(x))</code>', '<code>x.length() - y.length()</code>'], answer: 1, explain: 'Put x first if x+y is the bigger concatenation. Both concatenations have equal length, so String compareTo equals numeric comparison. This order is provably transitive.' },
    hints: [
      `<p>Hint 1: For any two pieces x and y, only two arrangements matter locally: xy and yx. Pick the bigger.</p>`,
      `<p>Hint 2: Convert to <code>String[]</code> and sort with <code>(a, b) -&gt; (b + a).compareTo(a + b)</code>.</p>`,
      `<p>Hint 3: Join with a StringBuilder; if the first piece is "0", every piece is 0, so return "0".</p>`
    ],
    tests: { sig: 'int[] -> string', fn: 'largestNumber', cases: [
      [[[3,30,34,5,9]],"9534330"],
      [[[0,0]],"0"],
      [[[0]],"0"],
      [[[10,2]],"210"],
      [[[1]],"1"],
      [[[1000000000,1000000000]],"10000000001000000000"],
      [[[0,0,1]],"100"],
      [[[34323,3432]],"343234323"],
      [[[121,12]],"12121"],
      [[[824,938,1399,5607,6973,5703,9609,4398,8247]],"9609938824824769735703560743981399"],
      [[[999999999,9,99]],"999999999999"],
      [[[432,43243]],"43243432"],
      [[[111311,1113]],"1113111311"],
      [[[20,1]],"201"],
      [[[8308,8308,830]],"83088308830"],
      [[{"$rep":0,"n":100}],"0"],
      [[{"$rep":1000000000,"n":100}],"1000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000"],
      [[{"$concat":[{"$rep":9,"n":50},{"$rep":0,"n":49},[1]]}],"9999999999999999999999999999999999999999999999999910000000000000000000000000000000000000000000000000"],
      [[{"$range":[0,100]}],"9999897969594939291908988887868584838281807978777767574737271706968676666564636261605958575655554535251504948474645444434241403938373635343333231302928272625242322221201918171615141312111100"]
    ] },
    solution: {
      approach: `<p>Custom comparator on Strings: x goes before y when x + y &gt; y + x. Sorting with it yields the global optimum (exchange argument). Join with a StringBuilder; special-case all zeros.</p>`,
      code: R`
class Solution {
    static String largestNumber(int[] nums) {
        String[] s = new String[nums.length];
        for (int i = 0; i < nums.length; i++) s[i] = String.valueOf(nums[i]);
        Arrays.sort(s, (a, b) -> (b + a).compareTo(a + b));   // bigger concatenation first
        if (s[0].equals("0")) return "0";                    // all zeros (equals, not ==)
        StringBuilder sb = new StringBuilder();
        for (String x : s) sb.append(x);
        return sb.toString();
    }
    public static void main(String[] args) {
        System.out.println(largestNumber(new int[]{3, 30, 34, 5, 9}));  // 9534330
        System.out.println(largestNumber(new int[]{0, 0}));             // 0
    }
}`,
      alt: [{ lang: 'python', code: `from functools import cmp_to_key\n\ndef largest_number(nums):\n    s = sorted(map(str, nums), key=cmp_to_key(lambda a, b: (b + a > a + b) - (b + a < a + b)))\n    return "0" if s[0] == "0" else "".join(s)\n\nprint(largest_number([3, 30, 34, 5, 9]))` }],
      dry: { head: ['pair', 'a+b', 'b+a', 'order'], rows: [['(3, 30)', '330', '303', '3 first'], ['(34, 3)', '343', '334', '34 first'], ['(9, 5)', '95', '59', '9 first'], ['sorted', '—', '—', H.c('g', '9, 5, 34, 3, 30')]] },
      complexity: `<p>O(n log n) comparisons, each O(k) for k-digit pieces (creates two temporary Strings); space O(n · k).</p>`,
      followUps: ['Prove transitivity of this comparator', 'Smallest number instead (reverse the comparator; beware leading zeros)']
    }
  });

  practice.push({
    title: 'Sort Characters By Frequency',
    level: 'Medium', tags: ['comparator', 'counting', 'StringBuilder', 'boxing'], companies: ['Amazon', 'Google', 'Yandex'],
    statement: `<p>Given a String <code>s</code>, sort its characters in <b>decreasing order of frequency</b>; characters with the same frequency may appear in any order, but all copies of a character must be together. (LeetCode 451)</p>`,
    constraints: `1 ≤ s.length() ≤ 5 × 10<sup>5</sup>; ASCII letters and digits`,
    example: `<p><code>"tree"</code> → ${H.c('g', '"eert"')} (or "eetr"): 'e' ×2, then 't' and 'r'.<br><code>"Aabb"</code> → ${H.c('g', '"bbAa"')} (or "bbaA"): 'A' and 'a' are different characters.</p>`,
    brute: {
      why: `<p>Repeatedly scan the remaining characters to find the most frequent one, append all its copies, remove them, and repeat: up to 62 distinct chars × O(n) rescans each, plus O(n) deletions from a String (copies, since Strings are immutable) — slow and allocation-heavy.</p>`,
      code: R`
static String frequencySortBrute(String s) {
    StringBuilder out = new StringBuilder();
    String rest = s;
    while (!rest.isEmpty()) {
        char best = rest.charAt(0); int bestCnt = 0;
        for (char c : rest.toCharArray()) {
            int cnt = rest.length() - rest.replace(String.valueOf(c), "").length();  // O(n) per char
            if (cnt > bestCnt) { best = c; bestCnt = cnt; }
        }
        out.append(String.valueOf(best).repeat(bestCnt));
        rest = rest.replace(String.valueOf(best), "");   // another full copy
    }
    return out.toString();
}`
    },
    mcq: { q: 'You sort a <code>List&lt;Character&gt;</code> of distinct chars with <code>(a, b) -&gt; cnt[b] - cnt[a]</code>. Is the subtraction safe here?', options: ['No, it always overflows', 'Yes here — counts are between 0 and 5 × 10<sup>5</sup>, so the difference cannot overflow; still, Integer.compare is the habit to keep', 'No, chars cannot index arrays', 'Yes, subtraction is always safe'], answer: 1, explain: 'Overflow needs differences beyond ±2.1 × 10<sup>9</sup>. Small non-negative counts are safe, but <code>Integer.compare(cnt[b], cnt[a])</code> is equally fast and never wrong.' },
    hints: [
      `<p>Hint 1: Count with <code>int[128]</code> indexed by the char itself — no HashMap, no boxing for the counts.</p>`,
      `<p>Hint 2: Collect the distinct chars into a <code>List&lt;Character&gt;</code> and sort with <code>Comparator.comparingInt((Character c) -&gt; cnt[c]).reversed()</code>.</p>`,
      `<p>Hint 3: Build the answer with one StringBuilder: for each char append it <code>cnt[c]</code> times. Bucket sort by frequency gives O(n) if you want to avoid the sort.</p>`
    ],
    tests: { sig: 'string -> string', fn: 'frequencySort',
      check: '(args, out) => { const s = args[0]; if (typeof out !== "string" || out.length !== s.length) return false; const cnt = {}; for (const c of s) cnt[c] = (cnt[c] || 0) + 1; let last = Infinity; const done = {}; for (let i = 0; i < out.length;) { const c = out[i]; if (done[c] || !cnt[c]) return false; for (let k = 0; k < cnt[c]; k++) { if (out[i + k] !== c) return false; } if (cnt[c] > last) return false; last = cnt[c]; done[c] = true; i += cnt[c]; } return true; }', cases: [
      [["tree"],"eert"],
      [["Aabb"],"bbAa"],
      [["a"],"a"],
      [["aaa"],"aaa"],
      [["abab"],"aabb"],
      [["cccaaa"],"aaaccc"],
      [["112233"],"112233"],
      [["AaAa"],"AAaa"],
      [["zzzyyx"],"zzzyyx"],
      [["xyyzzz"],"zzzyyx"],
      [["a1b2b2"],"22bb1a"],
      [["0123456789"],"0123456789"],
      [[{"$concat":[{"$rep":"a","n":100000},{"$rep":"b","n":200000},{"$rep":"c","n":200000}]}],{"$concat":[{"$rep":"b","n":200000},{"$rep":"c","n":200000},{"$rep":"a","n":100000}]}],
      [[{"$rep":"x","n":500000}],{"$rep":"x","n":500000}],
      [[{"$concat":[{"$rep":"A","n":250000},{"$rep":"a","n":250000}]}],{"$concat":[{"$rep":"A","n":250000},{"$rep":"a","n":250000}]}]
    ] },
    solution: {
      approach: `<p>Count into a primitive array, sort only the (at most 62) distinct characters by count with a comparator, then append runs into a single pre-sized StringBuilder.</p>`,
      code: R`
class Solution {
    static String frequencySort(String s) {
        int[] cnt = new int[128];
        for (int i = 0; i < s.length(); i++) cnt[s.charAt(i)]++;
        List<Character> chars = new ArrayList<>();
        for (char c = 0; c < 128; c++) if (cnt[c] > 0) chars.add(c);          // autoboxing to Character
        chars.sort(Comparator.comparingInt((Character c) -> cnt[c]).reversed()); // most frequent first
        StringBuilder sb = new StringBuilder(s.length());
        for (char c : chars) {                                                // auto-unboxing
            for (int k = 0; k < cnt[c]; k++) sb.append(c);
        }
        return sb.toString();
    }
    public static void main(String[] args) {
        System.out.println(frequencySort("tree"));    // eert  (t and r tie; stable sort keeps 'r' before 't')
        System.out.println(frequencySort("Aabb"));    // bbAa
    }
}`,
      dry: { head: ['step', 'state'], rows: [['count "tree"', 'e:2, r:1, t:1'], ['distinct (ASCII order)', '[e, r, t]'], ['sort by count desc (stable)', '[e, r, t]'], ['append runs', H.c('g', '"eert"')]] },
      complexity: `<p>Time <b>O(n + d log d)</b> with d ≤ 62 distinct chars; space O(n) for the output.</p>`,
      followUps: ['Bucket-sort version in O(n)', 'Unicode input: count code points with HashMap&lt;Integer, Integer&gt;']
    }
  });

  practice.push({
    title: 'Predict the Output: The HashSet That Forgets',
    level: 'Medium', tags: ['predict-the-output', 'equals/hashCode', 'mutable keys'], companies: ['Goldman Sachs', 'JP Morgan', 'Adobe'],
    statement: `<p><code>Key</code> has a correct-looking <code>equals</code>/<code>hashCode</code> based on a <b>mutable</b> field. Predict all five lines.</p><pre><code>class Key {
    int id;
    Key(int id) { this.id = id; }
    public boolean equals(Object o) { return o instanceof Key k &amp;&amp; k.id == id; }
    public int hashCode() { return id; }
}
Set&lt;Key&gt; set = new HashSet&lt;&gt;();
Key k = new Key(1);
set.add(k);
System.out.println(set.contains(new Key(1)));
k.id = 2;
System.out.println(set.contains(k));
System.out.println(set.contains(new Key(1)));
set.add(new Key(2));
System.out.println(set.size());
set.remove(k);
System.out.println(set.size() + " " + set.iterator().next().id);</code></pre>`,
    constraints: `Default HashSet (16 buckets). hashCode 1 → bucket 1, hashCode 2 → bucket 2.`,
    example: `<p>Answer: ${H.c('g', 'true')} / ${H.c('r', 'false')} / ${H.c('r', 'false')} / <code>2</code> / <code>1 2</code>.</p>`,
    brute: {
      why: `<p>The naive view treats a HashSet like a bag searched by equals: "k is in the set, so contains(k) is true; remove(k) removes k". Both are wrong because a HashSet searches <b>only the bucket chosen by the current hashCode</b>, and k moved its hash without moving buckets.</p>`,
      code: R`
// Naive "bag" model: linear search with equals ignores buckets entirely
List<Integer> bagIds = new ArrayList<>(List.of(1));   // pretend: the set holds k (id 1)
bagIds.set(0, 2);                                      // k.id = 2
System.out.println(bagIds.contains(2));                // true  - but HashSet says false`
    },
    mcq: { q: 'After <code>k.id = 2</code>, where is <code>k</code> physically stored?', options: ['Bucket 2', 'Still bucket 1 — it was placed using hash 1 and nothing moved it', 'It was removed', 'Both buckets'], answer: 1, explain: 'HashMap stores the hash with the node at insertion time. Mutating the key does not re-bucket it, so lookups with the new hash look in the wrong place.' },
    hints: [
      `<p>Hint 1: Write down the bucket of every element at insertion time. Lookups compute the bucket from the <b>current</b> hashCode.</p>`,
      `<p>Hint 2: contains(new Key(1)) goes to bucket 1, finds k, but k.id is now 2 → equals false.</p>`,
      `<p>Hint 3: remove(k) goes to bucket 2, which now holds the <b>new</b> Key(2); equals says they match (both id 2) → that new object is removed, not k.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: "", stdout: "true\nfalse\nfalse\n2\n1 2" }
    ] },
    solution: {
      approach: `<p>Track buckets: k in bucket 1 (stored hash 1). Mutation makes k's hash 2. contains(k) → bucket 2 empty → false. contains(new Key(1)) → bucket 1, k.id=2 ≠ 1 → false. add(new Key(2)) → bucket 2 empty → added, size 2 (two "id 2" keys!). remove(k) → bucket 2 → removes the new Key(2) → size 1 and the survivor is k with id 2.</p>`,
      code: R`
class Key {
    int id;
    Key(int id) { this.id = id; }
    @Override public boolean equals(Object o) { return o instanceof Key k && k.id == id; }
    @Override public int hashCode() { return id; }
}

public class ForgetfulSet {
    public static void main(String[] args) {
        Set<Key> set = new HashSet<>();
        Key k = new Key(1);
        set.add(k);                                       // stored in bucket 1
        System.out.println(set.contains(new Key(1)));     // true
        k.id = 2;                                         // hash changes, bucket does not
        System.out.println(set.contains(k));              // false (bucket 2 is empty)
        System.out.println(set.contains(new Key(1)));     // false (bucket 1 holds id 2 now)
        set.add(new Key(2));                              // bucket 2: no match -> added
        System.out.println(set.size());                   // 2
        set.remove(k);                                    // bucket 2: removes the NEW Key(2)
        System.out.println(set.size() + " " + set.iterator().next().id);  // 1 2
    }
}`,
      dry: { head: ['operation', 'bucket searched', 'found?', 'set contents'], rows: [['add(k:1)', '1', '—', 'b1: k'], ['contains(Key 1)', '1', 'yes', 'b1: k'], ['k.id = 2', '—', '—', 'b1: k(id 2)'], ['contains(k)', '2', 'no', 'b1: k(2)'], ['add(Key 2)', '2', 'no → add', 'b1: k(2), b2: new(2)'], ['remove(k)', '2', H.c('y', 'new(2) equals k'), 'b1: k(2)']] },
      complexity: `<p>O(1) operations, but the lesson is permanent: never mutate fields used by hashCode while the object is in a hash-based collection.</p>`,
      followUps: ['Make Key immutable (final field) or a record', 'Would a TreeSet with a comparator on id behave differently?']
    }
  });
  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Design an Immutable Money Value Class (equals, hashCode, compareTo all consistent)',
    level: 'Hard', tags: ['equals/hashCode', 'Comparable', 'immutability', 'BigDecimal'], companies: ['Stripe', 'PayPal', 'Razorpay', 'Goldman Sachs'],
    statement: `<p>Design <code>Money</code> with an amount and an ISO currency code. Requirements: (1) <b>immutable</b>; (2) <code>new Money("10.5", "inr")</code> must be <b>equal</b> to <code>new Money("10.50", "INR")</code>, and both must behave as one element in a <code>HashSet</code> <i>and</i> a <code>TreeSet</code>; (3) <code>plus</code> returns a new object and rejects mixed currencies; (4) <code>compareTo</code> orders amounts of the same currency and throws for different currencies; (5) no floating-point rounding errors.</p>`,
    constraints: `Amounts up to 10<sup>15</sup> with 2 decimal places; currency codes are 3 letters; must be safe as a HashMap key and a TreeMap key`,
    example: `<p><code>new Money("10.5","inr").equals(new Money("10.50","INR"))</code> → ${H.c('g', 'true')}; HashSet size ${H.c('g', '1')}; TreeSet size ${H.c('g', '1')}.<br><code>new Money("0.10","USD").plus(new Money("0.20","USD"))</code> → ${H.c('g', 'USD 0.30')} (a <code>double</code> would give 0.30000000000000004).<br>Comparing INR with USD → ${H.c('r', 'IllegalArgumentException')}.</p>`,
    brute: {
      why: `<p>The quick version uses <code>double</code> (0.1 + 0.2 ≠ 0.3), compares the currency with <code>==</code> (fails for runtime Strings), is mutable, and forgets <code>hashCode</code> — so it misbehaves in every hash collection. Simply switching to <code>BigDecimal</code> is not enough either: <code>BigDecimal.equals</code> treats 10.5 and 10.50 as <b>different</b> (scale differs) while <code>compareTo</code> says equal, so HashSet and TreeSet disagree.</p>`,
      code: R`
class MoneyBrute {
    double amount;            // binary floating point: 0.1 + 0.2 = 0.30000000000000004
    String currency;          // mutable fields, no defensive design
    MoneyBrute(double a, String c) { amount = a; currency = c; }
    @Override public boolean equals(Object o) {
        return o instanceof MoneyBrute m && m.amount == amount && m.currency == currency;  // == on String!
    }
    // hashCode NOT overridden: equal objects land in different HashSet buckets
}`
    },
    mcq: { q: 'Which normalisation makes BigDecimal-based equals and compareTo agree?', options: ['Use <code>doubleValue()</code> in equals', 'Normalise the scale in the constructor (e.g. <code>setScale(2, RoundingMode.HALF_EVEN)</code>) so equal amounts have identical unscaled value and scale', 'Use <code>==</code> on BigDecimal', 'Override only compareTo'], answer: 1, explain: 'After normalising, 10.5 and 10.50 are both 10.50 (scale 2), so BigDecimal.equals/hashCode and compareTo all agree. stripTrailingZeros() is an alternative normalisation.' },
    hints: [
      `<p>Hint 1: Make the class <code>final</code>, fields <code>private final</code>, and normalise inputs (scale, upper-case currency with <code>Locale.ROOT</code>) in the constructor.</p>`,
      `<p>Hint 2: Base equals and hashCode on the <b>normalised</b> amount and currency; then compareTo (for same currency) returns 0 exactly when equals is true.</p>`,
      `<p>Hint 3: Operations return new instances. Guard every binary operation with a <code>requireSameCurrency</code> helper that throws <code>IllegalArgumentException</code>.</p>`
    ],
    tests: { sig: 'string string string string string -> string', fn: 'moneyCheck',
      harness: { java: `class Check { static String moneyCheck(String a1, String c1, String a2, String c2, String op) { try { Money a = new Money(a1, c1), b = new Money(a2, c2); String r; switch (op) { case "equals": { boolean eq = a.equals(b); String ts; try { ts = String.valueOf(new TreeSet<>(List.of(a, b)).size()); } catch (IllegalArgumentException e) { ts = "IAE"; } r = eq + " " + (eq ? String.valueOf(a.hashCode() == b.hashCode()) : "-") + " " + new HashSet<>(List.of(a, b)).size() + " " + ts; break; } case "plus": r = a.plus(b).toString(); break; default: r = String.valueOf(Integer.signum(a.compareTo(b))); } return r + " | a=" + a + " b=" + b; } catch (IllegalArgumentException e) { return "IAE"; } } }` }, cases: [
      [["10.5","inr","10.50","INR","equals"],"true true 1 1 | a=INR 10.50 b=INR 10.50"],
      [["0.10","USD","0.20","USD","plus"],"USD 0.30 | a=USD 0.10 b=USD 0.20"],
      [["10.5","INR","1","USD","compare"],"IAE"],
      [["1","INR","2","INR","compare"],"-1 | a=INR 1.00 b=INR 2.00"],
      [["2","INR","1","INR","compare"],"1 | a=INR 2.00 b=INR 1.00"],
      [["3","INR","3.00","inr","compare"],"0 | a=INR 3.00 b=INR 3.00"],
      [["1","INR","1","USD","plus"],"IAE"],
      [["1","INR","1","USD","equals"],"false - 2 IAE | a=INR 1.00 b=USD 1.00"],
      [["1","INR","2","INR","equals"],"false - 2 2 | a=INR 1.00 b=INR 2.00"],
      [["-5.5","EUR","5.5","EUR","plus"],"EUR 0.00 | a=EUR -5.50 b=EUR 5.50"],
      [["-5.5","EUR","-5.5","eur","equals"],"true true 1 1 | a=EUR -5.50 b=EUR -5.50"],
      [["0","GBP","0.00","GBP","equals"],"true true 1 1 | a=GBP 0.00 b=GBP 0.00"],
      [["999999999999999.99","JPY","0.01","JPY","plus"],"JPY 1000000000000000.00 | a=JPY 999999999999999.99 b=JPY 0.01"],
      [["0.1","USD","0.2","USD","plus"],"USD 0.30 | a=USD 0.10 b=USD 0.20"],
      [["1000000000000000","USD","1000000000000000","USD","compare"],"0 | a=USD 1000000000000000.00 b=USD 1000000000000000.00"],
      [["0.05","usd","0.05","Usd","equals"],"true true 1 1 | a=USD 0.05 b=USD 0.05"]
    ] },
    solution: {
      approach: `<p>Immutable final class with a normalised <code>BigDecimal</code> (scale 2, banker's rounding) and an upper-cased currency. Because normal forms are unique, <code>BigDecimal.equals</code>/<code>hashCode</code> become value-based, and <code>compareTo</code> is consistent with equals, so HashSet and TreeSet agree.</p>`,
      code: R`
final class Money implements Comparable<Money> {
    private final BigDecimal amount;     // always scale 2 after construction
    private final String currency;       // always upper-case ISO code

    Money(String amount, String currency) {
        this(new BigDecimal(amount), currency);
    }
    Money(BigDecimal amount, String currency) {
        this.amount = Objects.requireNonNull(amount).setScale(2, RoundingMode.HALF_EVEN);  // normal form
        this.currency = Objects.requireNonNull(currency).toUpperCase(Locale.ROOT);
    }

    Money plus(Money other) {
        requireSameCurrency(other);
        return new Money(amount.add(other.amount), currency);   // new object; this is unchanged
    }

    private void requireSameCurrency(Money other) {
        if (!currency.equals(other.currency))
            throw new IllegalArgumentException("Currency mismatch: " + currency + " vs " + other.currency);
    }

    @Override public int compareTo(Money other) {
        requireSameCurrency(other);
        return amount.compareTo(other.amount);
    }
    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Money m)) return false;               // final class: instanceof is safe
        return amount.equals(m.amount) && currency.equals(m.currency);
    }
    @Override public int hashCode() { return 31 * amount.hashCode() + currency.hashCode(); }
    @Override public String toString() { return currency + " " + amount.toPlainString(); }

    public static void main(String[] args) {
        Money a = new Money("10.5", "inr"), b = new Money("10.50", "INR");
        System.out.println(a.equals(b) + " " + (a.hashCode() == b.hashCode()));      // true true
        System.out.println(new HashSet<>(List.of(a, b)).size() + " " + new TreeSet<>(List.of(a, b)).size()); // 1 1
        System.out.println(new Money("0.10", "USD").plus(new Money("0.20", "USD"))); // USD 0.30
        try {
            a.compareTo(new Money("1", "USD"));
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());                                       // Currency mismatch: INR vs USD
        }
    }
}`,
      dry: { head: ['input', 'normalised', 'equals 10.50 INR?', 'hash equal?'], rows: [['("10.5", "inr")', '10.50 INR', 'true', 'true'], ['("10.50", "INR")', '10.50 INR', 'true', 'true'], ['("10.499", "INR")', '10.50 INR (HALF_EVEN)', 'true', 'true'], ['("10.51", "INR")', '10.51 INR', H.c('r', 'false'), 'false']] },
      complexity: `<p>All operations are O(digits) BigDecimal arithmetic; effectively O(1) for money-sized values. Memory: one BigDecimal + one String reference per object.</p>`,
      followUps: ['Is a compareTo that throws for different currencies a total order? How would a TreeMap of mixed currencies behave?', 'Support currencies with 0 or 3 decimals (JPY, KWD) via java.util.Currency.getDefaultFractionDigits()', 'Make it a record with a compact constructor that normalises']
    }
  });

  practice.push({
    title: 'Text Justification',
    level: 'Hard', tags: ['StringBuilder', 'greedy', 'simulation'], companies: ['Google', 'LinkedIn', 'Airbnb', 'Coursera'],
    statement: `<p>Given an array of words and a width <code>maxWidth</code>, format the text so each line has exactly <code>maxWidth</code> characters and is fully justified. Pack as many words as fit per line (greedy). Distribute spaces as evenly as possible; when they do not divide evenly, the <b>left</b> gaps get more. The <b>last line</b> and any line with a single word are left-justified and padded with spaces on the right. (LeetCode 68)</p>`,
    constraints: `1 ≤ words.length ≤ 300; 1 ≤ word length ≤ maxWidth ≤ 100`,
    example: `<p>words = <code>["This","is","an","example","of","text","justification."]</code>, maxWidth = 16 →</p><pre><code>"This    is    an"
"example  of text"
"justification.  "</code></pre><p>Line 1 has 8 letters and 2 gaps → 8 spaces → 4 + 4. Line 2: 13 letters, 2 gaps, 3 spaces → 2 (left) + 1. Last line is left-justified.</p>`,
    brute: {
      why: `<p>Building each line with <code>line += word</code> and inserting spaces one at a time in a round-robin loop (each insert rebuilding the String) is correct but allocation-heavy: every space insertion copies the whole line. With StringBuilder plus arithmetic (<code>each = spaces / gaps</code>, <code>extra = spaces % gaps</code>) each line is built in one pass.</p>`,
      code: R`
static List<String> justifyBrute(String[] words, int maxWidth) {
    List<String> res = new ArrayList<>();
    int i = 0;
    while (i < words.length) {
        List<String> line = new ArrayList<>();
        int len = 0;
        while (i < words.length && len + words[i].length() + line.size() <= maxWidth) { len += words[i].length(); line.add(words[i++]); }
        boolean last = i == words.length || line.size() == 1;
        List<String> gaps = new ArrayList<>();
        for (int g = 0; g < line.size() - 1; g++) gaps.add(last ? " " : "");
        int used = len + (last ? gaps.size() : 0);
        for (int g = 0; !last && used < maxWidth; g = (g + 1) % gaps.size(), used++) gaps.set(g, gaps.get(g) + " "); // one space at a time
        String s = "";
        for (int w = 0; w < line.size(); w++) s += line.get(w) + (w < gaps.size() ? gaps.get(w) : "");   // String += copies
        while (s.length() < maxWidth) s += " ";
        res.add(s);
    }
    return res;
}`
    },
    mcq: { q: 'A line has 3 gaps and 8 spaces to distribute. What goes in each gap, left to right?', options: ['2, 3, 3', '3, 3, 2', '2, 2, 4', '4, 2, 2'], answer: 1, explain: 'each = 8 / 3 = 2, extra = 8 % 3 = 2 → the first 2 gaps get one extra: 3, 3, 2.' },
    hints: [
      `<p>Hint 1: Greedy packing — word j fits if <code>letters + words[j].length() + (number of words already on the line) ≤ maxWidth</code> (each existing word needs one space after it).</p>`,
      `<p>Hint 2: For a normal line: <code>spaces = maxWidth − letters</code>, <code>each = spaces / gaps</code>, <code>extra = spaces % gaps</code>; gap g gets <code>each + (g &lt; extra ? 1 : 0)</code>.</p>`,
      `<p>Hint 3: Special cases: last line or single word → single spaces between words, then pad right with <code>" ".repeat(maxWidth − sb.length())</code>.</p>`
    ],
    tests: { sig: 'string[] int -> list<string>', fn: 'fullJustify', cases: [
      [[["This","is","an","example","of","text","justification."],16],["This    is    an","example  of text","justification.  "]],
      [[["What","must","be","acknowledgment","shall","be"],16],["What   must   be","acknowledgment  ","shall be        "]],
      [[["Science","is","what","we","understand","well","enough","to","explain","to","a","computer.","Art","is","everything","else","we","do"],20],["Science  is  what we","understand      well","enough to explain to","a  computer.  Art is","everything  else  we","do                  "]],
      [[["a"],1],["a"]],
      [[["a","b"],1],["a","b"]],
      [[["hello"],10],["hello     "]],
      [[["a","b"],3],["a b"]],
      [[["a","b","c"],5],["a b c"]],
      [[["ab","cd","ef"],5],["ab cd","ef   "]],
      [[["aa","bb","cc","dd"],7],["aa   bb","cc dd  "]],
      [[["a","b","c","d"],3],["a b","c d"]],
      [[["x","yy","zzz","w"],6],["x   yy","zzz w "]],
      [[["abcdefghij"],10],["abcdefghij"]],
      [[{"$rep":"a","n":300},100],["a  a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a","a  a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a","a  a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a","a  a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a","a  a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a","a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a "]],
      [[{"$rep":"abcde","n":300},100],["abcde  abcde  abcde  abcde  abcde  abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde","abcde  abcde  abcde  abcde  abcde  abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde","abcde  abcde  abcde  abcde  abcde  abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde","abcde  abcde  abcde  abcde  abcde  abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde","abcde  abcde  abcde  abcde  abcde  abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde","abcde  abcde  abcde  abcde  abcde  abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde","abcde  abcde  abcde  abcde  abcde  abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde","abcde  abcde  abcde  abcde  abcde  abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde","abcde  abcde  abcde  abcde  abcde  abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde","abcde  abcde  abcde  abcde  abcde  abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde","abcde  abcde  abcde  abcde  abcde  abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde","abcde  abcde  abcde  abcde  abcde  abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde","abcde  abcde  abcde  abcde  abcde  abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde","abcde  abcde  abcde  abcde  abcde  abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde","abcde  abcde  abcde  abcde  abcde  abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde","abcde  abcde  abcde  abcde  abcde  abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde","abcde  abcde  abcde  abcde  abcde  abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde","abcde  abcde  abcde  abcde  abcde  abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde","abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde abcde                             "]],
      [[{"$concat":[{"$rep":"word","n":150},{"$rep":"x","n":150}]},100],["word  word word word word word word word word word word word word word word word word word word word","word  word word word word word word word word word word word word word word word word word word word","word  word word word word word word word word word word word word word word word word word word word","word  word word word word word word word word word word word word word word word word word word word","word  word word word word word word word word word word word word word word word word word word word","word  word word word word word word word word word word word word word word word word word word word","word  word word word word word word word word word word word word word word word word word word word","word  word word word word word word word word word x x x x x x x x x x x x x x x x x x x x x x x x x","x  x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x","x  x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x","x x x x x x x x x x x x x x x x x x x x x x x x x                                                   "]]
    ] },
    solution: {
      approach: `<p>Greedy line packing plus arithmetic space distribution; each line is built in a pre-sized <code>StringBuilder</code> with <code>String.repeat</code> for space runs, so the total work is linear in the output size.</p>`,
      code: R`
class Solution {
    static List<String> fullJustify(String[] words, int maxWidth) {
        List<String> res = new ArrayList<>();
        int i = 0, n = words.length;
        while (i < n) {
            int j = i, letters = 0;
            while (j < n && letters + words[j].length() + (j - i) <= maxWidth) {   // (j - i) = spaces needed
                letters += words[j].length();
                j++;
            }
            int gaps = j - i - 1;
            StringBuilder sb = new StringBuilder(maxWidth);
            if (j == n || gaps == 0) {                         // last line or a single word: left-justify
                for (int k = i; k < j; k++) {
                    sb.append(words[k]);
                    if (k < j - 1) sb.append(' ');
                }
                sb.append(" ".repeat(maxWidth - sb.length()));
            } else {
                int spaces = maxWidth - letters;
                int each = spaces / gaps, extra = spaces % gaps;
                for (int k = i; k < j; k++) {
                    sb.append(words[k]);
                    if (k < j - 1) sb.append(" ".repeat(each + (k - i < extra ? 1 : 0)));  // left gaps get more
                }
            }
            res.add(sb.toString());
            i = j;
        }
        return res;
    }
    public static void main(String[] args) {
        String[] w = {"This", "is", "an", "example", "of", "text", "justification."};
        for (String line : fullJustify(w, 16)) System.out.println("\"" + line + "\"");
    }
}`,
      dry: { head: ['line', 'words', 'letters', 'gaps', 'each / extra', 'result'], rows: [['1', 'This is an', '8', '2', '4 / 0', '"This    is    an"'], ['2', 'example of text', '13', '2', '1 / 1', '"example  of text"'], ['3 (last)', 'justification.', '14', '0', 'left-justify', '"justification.  "']] },
      complexity: `<p>Time <b>O(total characters + lines × maxWidth)</b>; space O(maxWidth) per line plus the output.</p>`,
      followUps: ['Minimise raggedness instead of greedy packing (DP, like TeX)', 'Support centre alignment']
    }
  });

  practice.push({
    title: 'Predict the Output: The Boxing & Concatenation Gauntlet',
    level: 'Hard', tags: ['predict-the-output', 'autoboxing', 'overloading', 'ternary', 'concatenation'], companies: ['Oracle', 'Amazon', 'Morgan Stanley', 'Deutsche Bank'],
    statement: `<p>The final boss of output prediction. Predict every line, then explain the rule behind each.</p><pre><code>static void m(long x)    { System.out.print("long "); }
static void m(Integer x) { System.out.print("Integer "); }
static void m(int... x)  { System.out.print("varargs "); }

m(1); m(Integer.valueOf(1)); m();
System.out.println();
Object o = true ? Integer.valueOf(1) : Double.valueOf(2);
System.out.println(o);
Integer x = 1000, y = 1000;
System.out.println(x &lt;= y &amp;&amp; x &gt;= y &amp;&amp; x != y);
System.out.println(1 + 2 + "3" + 4 + 5);
Character c = 'a';
System.out.println(c + 1);
Map&lt;String, Integer&gt; cache = new HashMap&lt;&gt;();
boolean hit = true;
try {
    Integer v = hit ? cache.get("k") : 0;
    System.out.println(v);
} catch (NullPointerException e) {
    System.out.println("NPE");
}</code></pre>`,
    constraints: `Java 21. Six lines of output.`,
    example: `<p>Answer:</p><pre><code>long Integer varargs
1.0
true
3345
98
NPE</code></pre>`,
    brute: {
      why: `<p>Guessing "Integer Integer varargs / 1 / false / 12345 / b / null" applies intuition instead of rules: overload phases (widening before boxing before varargs), numeric promotion in <code>?:</code>, relational operators unboxing while <code>!=</code> on two objects does not, left-to-right <code>+</code>, char arithmetic producing int, and ternary unboxing.</p>`,
      code: R`
// "Intuition" version: every line rewritten the way people mistakenly read it
System.out.println("Integer Integer varargs");   // wrong: m(1) picks m(long)
System.out.println(1);                             // wrong: ?: promotes to double -> 1.0
System.out.println("12345");                       // wrong: 1 + 2 happens before "3" -> "3345"`
    },
    mcq: { q: 'Why does <code>x &lt;= y &amp;&amp; x &gt;= y &amp;&amp; x != y</code> print true for 1000?', options: ['A JVM bug', '&lt;= and &gt;= unbox to compare values (both true), but != between two Integer objects compares references (different objects → true)', 'Because of the Integer cache', 'Because &amp;&amp; short-circuits'], answer: 1, explain: 'Relational operators &lt; &lt;= &gt; &gt;= always work on numbers, forcing unboxing. == and != on two references compare identity. 1000 is outside the cache, so x and y are distinct objects.' },
    hints: [
      `<p>Hint 1: Overload resolution has three phases: (1) no boxing, no varargs (widening allowed); (2) boxing/unboxing allowed; (3) varargs. The first phase that finds a match wins.</p>`,
      `<p>Hint 2: In <code>cond ? Integer : Double</code>, both are unboxable numeric types, so binary numeric promotion applies → double. In <code>cond ? Integer : int</code> the type is int → unboxing of null → NPE.</p>`,
      `<p>Hint 3: <code>+</code> is left-associative: 1 + 2 = 3 (int), then "3" + "3" → "33", then "334", "3345". <code>Character + int</code> unboxes and promotes to int: 'a' (97) + 1 = 98.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: "", stdout: "long Integer varargs\n1.0\ntrue\n3345\n98\nNPE" }
    ] },
    solution: {
      approach: `<p>Apply one rule per line: overload phases → "long Integer varargs"; ternary numeric promotion → 1.0; relational unboxing vs reference != → true; left-to-right + → "3345"; char promotion → 98; ternary with int branch unboxes null → NPE.</p>`,
      code: R`
public class Gauntlet {
    static void m(long x)    { System.out.print("long "); }
    static void m(Integer x) { System.out.print("Integer "); }
    static void m(int... x)  { System.out.print("varargs "); }

    public static void main(String[] args) {
        m(1);                       // phase 1: int -> long widening        => long
        m(Integer.valueOf(1));      // phase 1: exact Integer match          => Integer
        m();                        // only varargs fits                     => varargs
        System.out.println();

        Object o = true ? Integer.valueOf(1) : Double.valueOf(2);  // promoted to double
        System.out.println(o);                                     // 1.0

        Integer x = 1000, y = 1000;
        System.out.println(x <= y && x >= y && x != y);            // true

        System.out.println(1 + 2 + "3" + 4 + 5);                   // 3345

        Character c = 'a';
        System.out.println(c + 1);                                 // 98

        Map<String, Integer> cache = new HashMap<>();
        boolean hit = true;
        try {
            Integer v = hit ? cache.get("k") : 0;                  // type int -> null.intValue()
            System.out.println(v);
        } catch (NullPointerException e) {
            System.out.println("NPE");                             // NPE
        }
    }
}`,
      dry: { head: ['expression', 'rule', 'output'], rows: [['m(1) / m(Integer) / m()', 'phases: widening → boxing → varargs', 'long Integer varargs'], ['true ? Integer : Double', 'binary numeric promotion', '1.0'], ['x&lt;=y &amp;&amp; x&gt;=y &amp;&amp; x!=y', 'unbox for &lt;= &gt;=; identity for !=', 'true'], ['1 + 2 + "3" + 4 + 5', 'left-to-right', '3345'], ["Character 'a' + 1", 'unbox + promote to int', '98'], ['hit ? null Integer : 0', 'ternary type int → unbox null', 'NPE']] },
      complexity: `<p>O(1). These six rules cover most "tricky output" interview questions about wrappers.</p>`,
      followUps: ['What prints for <code>System.out.println((char) (c + 1));</code>?', 'Change <code>: 0</code> to <code>: Integer.valueOf(0)</code> — what prints now?']
    }
  });

  practice.push({
    title: 'Build a Thread-Safe String Interner (your own String pool)',
    level: 'Hard', tags: ['intern', 'concurrency', 'hashing', 'memory'], companies: ['Twitter/X', 'Elastic', 'Confluent', 'Netflix'],
    statement: `<p>A log-ingestion service parses 50 million records per hour; fields like <code>level</code>, <code>region</code> and <code>service</code> repeat a few thousand distinct values. Build an <code>Interner</code> with <code>String intern(String s)</code> that returns a <b>canonical</b> instance: equal Strings always map to the <b>same object</b> (so <code>==</code> works afterwards and duplicates can be garbage-collected). It must be safe to call from many threads at once, O(1) expected per call, and must not use <code>String.intern()</code>.</p>`,
    constraints: `Up to 10<sup>6</sup> calls/second across 16 threads; distinct values ≤ 10<sup>5</sup>; null input → NullPointerException`,
    example: `<p><code>a = new String("eu-west")</code>, <code>b = new String("eu-west")</code>: <code>a == b</code> is ${H.c('r', 'false')}, but <code>interner.intern(a) == interner.intern(b)</code> is ${H.c('g', 'true')} and both return <code>a</code> (the first one seen).</p>`,
    brute: {
      why: `<p>A <code>synchronized</code> method scanning an <code>ArrayList</code> with <code>equals</code> is correct but O(d) per call (d distinct values) and serialises all 16 threads on one lock. A plain <code>HashMap</code> without locking is fast but <b>not thread-safe</b>: concurrent puts can lose entries or corrupt the table, and two threads may each insert "their" copy, breaking the "same object" guarantee.</p>`,
      code: R`
class SlowInterner {
    private final List<String> pool = new ArrayList<>();
    synchronized String intern(String s) {          // one global lock
        for (String p : pool) if (p.equals(s)) return p;   // O(d) scan
        pool.add(s);
        return s;
    }
}`
    },
    mcq: { q: 'Why use <code>putIfAbsent</code> instead of <code>if (!map.containsKey(s)) map.put(s, s);</code> on a ConcurrentHashMap?', options: ['It is shorter', 'check-then-act is two separate operations; two threads can both see "absent" and insert different objects. putIfAbsent is a single atomic step', 'containsKey is O(n)', 'put is deprecated'], answer: 1, explain: 'Each ConcurrentHashMap call is atomic on its own, but a sequence of calls is not. putIfAbsent atomically returns the existing value or installs yours.' },
    hints: [
      `<p>Hint 1: Use a <code>ConcurrentHashMap&lt;String, String&gt;</code> mapping each value to its canonical instance. String's content-based equals/hashCode make lookups work for any copy.</p>`,
      `<p>Hint 2: <code>String prev = map.putIfAbsent(s, s); return prev == null ? s : prev;</code> — atomic, lock-striped, O(1) expected.</p>`,
      `<p>Hint 3: Memory: the map keeps canonical Strings alive forever. For unbounded inputs consider weak references (Guava <code>Interners.newWeakInterner()</code>) or a size cap; for small fixed sets an <code>enum</code> is even better.</p>`
    ],
    tests: { sig: 'string[] -> string', fn: 'internCheck',
      harness: { java: `class Check { static String internCheck(String[] strs) throws Exception { Interner in = new Interner(); List<String> canon = new ArrayList<>(); IdentityHashMap<String, Integer> ids = new IdentityHashMap<>(); StringBuilder sb = new StringBuilder(); int n = 0; try { for (String s : strs) { String c = in.intern(new String(s)); canon.add(c); if (!ids.containsKey(c)) ids.put(c, ids.size()); if (n++ < 20) sb.append(n > 1 ? "," : "").append(ids.get(c)); } } catch (NullPointerException e) { return "NPE"; } ExecutorService ex = Executors.newFixedThreadPool(16); List<Future<Boolean>> fs = new ArrayList<>(); for (int t = 0; t < 16; t++) fs.add(ex.submit(() -> { for (int i = 0; i < strs.length; i++) if (in.intern(new String(strs[i])) != canon.get(i)) return false; return true; })); boolean ok = true; for (Future<Boolean> f : fs) ok &= f.get(); ex.shutdown(); return "ids=" + (strs.length <= 20 ? sb.toString() : "n=" + strs.length) + " canon=" + ids.size() + " threads=" + ok; } }` }, cases: [
      [[["eu-west","eu-west"]],"ids=0,0 canon=1 threads=true"],
      [[["a","b","a","c","b"]],"ids=0,1,0,2,1 canon=3 threads=true"],
      [[[]],"ids= canon=0 threads=true"],
      [[[""]],"ids=0 canon=1 threads=true"],
      [[["x"]],"ids=0 canon=1 threads=true"],
      [[["a",null]],"NPE"],
      [[[null]],"NPE"],
      [[["a","A","a"]],"ids=0,1,0 canon=2 threads=true"],
      [[["",""," "]],"ids=0,0,1 canon=2 threads=true"],
      [[["svc-1","svc-2","svc-1","svc-3","svc-2","svc-1"]],"ids=0,1,0,2,1,0 canon=3 threads=true"],
      [[{"$rep":"level","n":100000}],"ids=n=100000 canon=1 threads=true"],
      [[{"$concat":[{"$rep":"a","n":30000},{"$rep":"b","n":30000},{"$rep":"a","n":30000}]}],"ids=n=90000 canon=2 threads=true"]
    ] },
    solution: {
      approach: `<p><code>ConcurrentHashMap.putIfAbsent</code> provides an atomic "get the canonical copy or become it" operation. The first thread to insert a value wins; every later caller gets that same reference. String's cached hashCode keeps lookups cheap.</p>`,
      code: R`
final class Interner {
    private final ConcurrentHashMap<String, String> pool = new ConcurrentHashMap<>();

    String intern(String s) {
        Objects.requireNonNull(s, "s");
        String prev = pool.putIfAbsent(s, s);    // atomic: install s, or get the existing canonical copy
        return prev == null ? s : prev;
    }

    int distinct() { return pool.size(); }

    public static void main(String[] args) {
        Interner in = new Interner();
        String a = new String("eu-west"), b = new String("eu-west");
        System.out.println((a == b) + " " + (in.intern(a) == in.intern(b)) + " " + (in.intern(b) == a)); // false true true

        // 100 000 calls from many threads, only 100 distinct values
        Set<String> identities = IntStream.range(0, 100_000).parallel()
                .mapToObj(i -> in.intern(new String("svc-" + (i % 100))))   // fresh copy every time
                .collect(Collectors.toCollection(() -> Collections.newSetFromMap(new IdentityHashMap<>())));
        System.out.println(identities.size() + " canonical objects, " + in.distinct() + " map entries"); // 100 canonical objects, 101 map entries ("eu-west" + 100)
    }
}`,
      dry: { head: ['call', 'thread', 'putIfAbsent result', 'returned'], rows: [['intern(a="eu-west")', 'T1', 'null (installed a)', 'a'], ['intern(b="eu-west")', 'T2', 'a (already there)', 'a'], ['intern(c="us-east")', 'T1', 'null (installed c)', 'c'], ['intern(d="eu-west")', 'T3', 'a', H.c('g', 'a — same object')]] },
      complexity: `<p>Expected <b>O(1)</b> per call (one hash + equals); ConcurrentHashMap lets threads proceed in parallel. Memory O(d) for d distinct values — the duplicates you no longer keep are where the savings come from.</p>`,
      followUps: ['Make it weak so unused canonical Strings can be collected (WeakHashMap is not thread-safe; how would you do it?)', 'Compare with -XX:+UseStringDeduplication: what does it share, and why does == not change?', 'When is an enum the better design?']
    }
  });
  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'What does <code>String s = "hi"; s.toUpperCase(); System.out.println(s);</code> print?', options: ['HI', 'hi', 'Hi', 'It does not compile'], answer: 1, explain: 'Strings are immutable. <code>toUpperCase()</code> returns a new String, which is thrown away because it is not assigned. <code>s</code> still points at "hi".' },
    { q: 'Which pair is <b>true</b> with <code>==</code>?', options: ['<code>"ab"</code> and <code>new String("ab")</code>', '<code>"ab"</code> and <code>"a" + "b"</code>', '<code>"ab"</code> and <code>x + "b"</code> where <code>String x = "a";</code>', '<code>"ab"</code> and <code>new StringBuilder("ab").toString()</code>'], answer: 1, explain: '"a" + "b" is a compile-time constant folded into the pooled literal "ab". The others create new heap objects at runtime.' },
    { q: 'Since Java 7, where does the String pool live?', options: ['PermGen', 'Metaspace', 'The main heap', 'The thread stack'], answer: 2, explain: 'Java 7 moved interned Strings from PermGen to the heap, so they can be garbage-collected and are limited only by heap size. Metaspace (Java 8+) holds class metadata, not Strings.' },
    { q: 'What is the main difference between StringBuilder and StringBuffer?', options: ['StringBuffer is immutable', 'StringBuffer\'s methods are synchronized; StringBuilder\'s are not, so StringBuilder is faster for single-threaded use', 'StringBuilder cannot reverse()', 'StringBuffer has a larger default capacity'], answer: 1, explain: 'Same API (both extend AbstractStringBuilder). StringBuffer (Java 1.0) synchronizes every method; StringBuilder (Java 5) does not and is the default choice.' },
    { q: 'What does <code>new StringBuilder("ab").equals(new StringBuilder("ab"))</code> return?', options: ['true', 'false', 'It throws', 'It depends on the JVM'], answer: 1, explain: 'StringBuilder does not override equals, so it uses Object\'s identity comparison. Compare content via toString().equals(...), compareTo (Java 11+), or contentEquals.' },
    { q: '<code>Integer a = 127, b = 127, c = 128, d = 128;</code> What are <code>a == b</code> and <code>c == d</code>?', options: ['true, true', 'true, false', 'false, false', 'false, true'], answer: 1, explain: 'Autoboxing uses Integer.valueOf, which returns cached objects for -128..127. 128 is outside, so c and d are separate objects.' },
    { q: 'Which line throws a NullPointerException?', options: ['<code>Integer x = null;</code>', '<code>Integer x = null; Object o = x;</code>', '<code>Integer x = null; int y = x;</code>', '<code>Integer x = null; System.out.println(x);</code>'], answer: 2, explain: 'Assigning to an int unboxes: the compiler inserts x.intValue(), which fails on null. Printing a null reference just prints "null".' },
    { q: 'For <code>List&lt;Integer&gt; list = new ArrayList&lt;&gt;(List.of(5, 6, 7)); list.remove(1);</code> what remains?', options: ['[6, 7]', '[5, 7]', '[5, 6, 7]', 'It throws'], answer: 1, explain: 'remove(int index) is chosen over remove(Object) because it needs no boxing. Index 1 (the value 6) is removed.' },
    { q: 'You override <code>equals</code> in <code>Point</code> but not <code>hashCode</code>. What happens with <code>set.add(new Point(1,2)); set.contains(new Point(1,2))</code> on a HashSet?', options: ['Always true', 'Almost always false, because the two objects have different identity hash codes and land in different buckets', 'Compile error', 'It throws'], answer: 1, explain: 'HashSet first picks a bucket by hashCode. Different identity hashes → wrong bucket → equals is never even called.' },
    { q: 'Which statement about the hashCode contract is <b>false</b>?', options: ['Equal objects must have equal hash codes', 'Unequal objects must have different hash codes', 'hashCode must be consistent while the object\'s fields do not change', 'Returning a constant is legal but slow'], answer: 1, explain: 'Collisions are allowed: "Aa" and "BB" are unequal but both hash to 2112. Only the direction "equal ⇒ same hash" is required.' },
    { q: 'Why is <code>(a, b) -&gt; a - b</code> a dangerous Comparator&lt;Integer&gt;?', options: ['It sorts descending', 'Subtraction can overflow for large magnitudes and return the wrong sign', 'It is not allowed in lambdas', 'It is slower than Integer.compare by 10×'], answer: 1, explain: 'e.g. 2 000 000 000 − (−2 000 000 000) overflows to a negative number. Integer.compare never overflows.' },
    { q: 'A <code>TreeSet&lt;String&gt;</code> built with <code>Comparator.comparingInt(String::length)</code> receives "cat", "dog", "ox". What is its size?', options: ['3', '2', '1', 'It throws'], answer: 1, explain: 'TreeSet treats compare(a, b) == 0 as "duplicate". "cat" and "dog" have equal length, so "dog" is not added: {ox, cat}.' },
    { q: 'What is printed by <code>Object o = true ? Integer.valueOf(1) : Double.valueOf(2); System.out.println(o);</code>?', options: ['1', '1.0', '2.0', 'It does not compile'], answer: 1, explain: 'Both branches are unboxable numeric types, so binary numeric promotion makes the conditional\'s type double: the result is 1.0, boxed to Double.' }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { q: 'Why is String immutable in Java?', level: 'B', a: `<p>Five reasons: (1) the <b>String pool</b> can share one object among many references only if nobody can change it; (2) <b>security</b> — file paths, URLs, class names and credentials are validated and then used, and must not change in between; (3) <b>thread safety</b> — immutable objects need no locks; (4) the <b>hash code is cached</b> on first use, making Strings fast and reliable HashMap keys; (5) <b>class loading</b> relies on String names. It is enforced by a <code>final</code> class with a <code>private final byte[]</code> and no mutating methods; every "modifying" method returns a new String.</p>`, followUps: ['How would you make your own class immutable?', 'Is a final StringBuilder immutable?', 'What is the cost of immutability and how does Java mitigate it?'] },
    { q: 'What is the difference between == and equals() for Strings?', level: 'B', a: `<p><code>==</code> compares <b>references</b> — whether both variables point to the same object. <code>equals()</code> compares <b>content</b> character by character (after quick checks for identity, type, coder and length). Two literals with the same text are the same pooled object, so <code>==</code> is true by coincidence; Strings built at runtime (concatenation with variables, substring, input) are new objects, so <code>==</code> is false even when the text matches. Always use <code>equals</code>, or <code>"CONST".equals(x)</code> / <code>Objects.equals(a, b)</code> for null safety.</p>`, followUps: ['When is using == on Strings acceptable?', 'What does equalsIgnoreCase do differently?', 'What is contentEquals for?'] },
    { q: 'What is the String pool and how does intern() work?', level: 'I', a: `<p>The pool (StringTable) is a JVM-wide hash table of canonical String objects, stored in the heap since Java 7. Literals and compile-time constants are added when the <code>ldc</code> instruction first resolves them. <code>s.intern()</code> returns the pooled instance with the same content, adding <code>s</code> if none exists. After interning, equal Strings are <code>==</code>. In application code prefer a private map, an enum or G1 String deduplication: <code>intern()</code> is a native global table, slower than a HashMap, and you cannot clear it.</p>`, followUps: ['How many objects does new String("abc") create?', 'Why did heavy interning cause PermGen OOM before Java 7?', 'How does -XX:+UseStringDeduplication differ from intern()?'] },
    { q: 'How many objects are created by String s = new String("hello");?', level: 'I', a: `<p><b>One or two.</b> The literal <code>"hello"</code> refers to a pooled String; if that literal has not been resolved before, the JVM creates it in the pool (object #1). Then <code>new</code> always creates a separate heap String (object #2) that copies the pooled one's content (in current JDKs that constructor simply reuses the original's internal <code>value</code> byte array, but the String object itself is new). So: two objects the first time, one if "hello" was already pooled. Strictly, the byte[] arrays are objects too, which interviewers sometimes ask about as a follow-up.</p>`, followUps: ['Does new String("hello") == "hello"?', 'What does new String("hello").intern() == "hello" give?'] },
    { q: 'StringBuilder vs StringBuffer vs String — when do you use which?', level: 'B', a: `<p><b>String</b> for values that do not change: keys, constants, results, method parameters. <b>StringBuilder</b> for building text step by step in one thread — loops, parsers, formatters; it is mutable with amortised O(1) appends (capacity 16, growth ≈ 2× + 2). <b>StringBuffer</b> has the same API but synchronizes every method; it is legacy (Java 1.0) and rarely right, because per-call locking does not make compound actions atomic. Concatenating with <code>+=</code> in a loop is O(n²) because each step copies the whole String.</p>`, followUps: ['Why is += in a loop slow even though javac uses StringBuilder/invokedynamic?', 'Does StringBuilder override equals?', 'How would you share text building across threads?'] },
    { q: 'What happens internally when you append to a StringBuilder beyond its capacity?', level: 'I', a: `<p>It keeps a <code>byte[] value</code> plus <code>count</code>. When an append needs more room, <code>ensureCapacityInternal</code> computes a new length of roughly <code>old × 2 + 2</code> (or exactly what is needed if larger), allocates a new array and copies the existing bytes once (<code>Arrays.copyOf</code>). Because capacity doubles, the total copying over n appends is O(n), so append is amortised O(1). It starts in LATIN1 (1 byte per char) and inflates to UTF16 when a wider char arrives. Pre-sizing with <code>new StringBuilder(expected)</code> avoids regrowth entirely.</p>`, followUps: ['What is the default capacity?', 'What does new StringBuilder(\'a\') do?', 'What does trimToSize do?'] },
    { q: 'What are wrapper classes and why do we need them?', level: 'B', a: `<p>Each primitive has an object counterpart: <code>Byte, Short, Integer, Long, Float, Double, Character, Boolean</code>. They are needed because <b>generics and collections only hold objects</b> (<code>List&lt;Integer&gt;</code>), because <b>null</b> can express "no value" (nullable DB columns, optional fields), and for <b>utility methods and constants</b> (<code>parseInt</code>, <code>compare</code>, <code>MAX_VALUE</code>, <code>Character.isDigit</code>). They are immutable and final; numeric ones extend <code>Number</code>. Costs: ~16–24 bytes per object vs 4–8 bytes for the primitive, plus pointer chasing.</p>`, followUps: ['parseInt vs valueOf?', 'Why were the wrapper constructors deprecated?', 'How much memory does a List&lt;Integer&gt; of a million elements use?'] },
    { q: 'Explain autoboxing and unboxing. What pitfalls have you seen?', level: 'I', a: `<p>Autoboxing is the compiler inserting <code>Integer.valueOf(x)</code> when a primitive is used where an object is expected; unboxing inserts <code>x.intValue()</code> the other way. Pitfalls: (1) <code>==</code> on two wrappers compares references — works for -128..127 thanks to the cache, fails above; (2) unboxing <code>null</code> throws NPE, e.g. <code>int n = map.get(k)</code>; (3) a ternary mixing <code>Integer</code> and <code>int</code> has type int and unboxes a null branch; (4) <code>list.remove(1)</code> removes an index, not the value; (5) <code>Long.equals(Integer)</code> is false, so <code>Map&lt;Long,V&gt;.get(5)</code> returns null; (6) boxed accumulators in loops create garbage.</p>`, followUps: ['What is the range of the Integer cache and can you change it?', 'Which wrappers have no cache?', 'Write a line with no visible method call that throws NPE.'] },
    { q: 'What is the Integer cache, and why does Integer a = 1000, b = 1000; a == b print false?', level: 'I', a: `<p><code>Integer.valueOf(int)</code> returns preallocated objects for -128..127 from <code>IntegerCache</code> (the JLS requires at least that range). Autoboxing calls valueOf, so <code>Integer a = 100, b = 100</code> share one object and <code>a == b</code> is true. 1000 is outside the range, so each boxing allocates a new object and <code>==</code> (reference comparison) is false, while <code>equals</code> is true. The upper bound can be raised with <code>-XX:AutoBoxCacheMax</code>; Byte/Short/Long cache -128..127, Character 0..127, Boolean has TRUE/FALSE, Float/Double have no cache.</p>`, followUps: ['Why only -128..127?', 'What happens with new Integer(100) == new Integer(100)?', 'Is relying on the cache ever acceptable?'] },
    { q: 'State the equals and hashCode contract and what breaks if you violate it.', level: 'I', a: `<p><b>equals</b> must be reflexive, symmetric, transitive, consistent, and return false for null. <b>hashCode</b> must be consistent while the object is unchanged, and <b>equal objects must have equal hash codes</b> (unequal objects may collide). If you override equals but not hashCode, HashMap/HashSet look in the wrong bucket: <code>contains</code> fails and duplicates appear. Asymmetric equals (subclass adds state with instanceof) makes collection behaviour depend on argument order. A mutable field in hashCode makes objects "disappear" from sets after mutation.</p>`, followUps: ['How does HashMap use hashCode and equals during get?', 'getClass() vs instanceof in equals?', 'How would you test the contract automatically?'] },
    { q: 'How does HashMap use hashCode() and equals() in get() and put()?', level: 'A', a: `<p>It computes <code>h = key.hashCode()</code>, spreads it with <code>h ^ (h &gt;&gt;&gt; 16)</code>, and indexes the table with <code>hash &amp; (n − 1)</code> (n is a power of two, default 16). In that bucket it walks the nodes, comparing the stored hash first, then reference equality, then <code>equals</code>. On put, a match replaces the value; otherwise a node is appended. Buckets with ≥ 8 nodes (table ≥ 64) become red-black trees, giving O(log n) worst case; the table doubles when size exceeds capacity × 0.75. Stored hashes are not recomputed, which is why mutating a key strands it.</p>`, followUps: ['Why is capacity a power of two?', 'Why spread the high bits?', 'What does treeification require of keys to help?'] },
    { q: 'Comparable vs Comparator — when do you use each?', level: 'B', a: `<p><b>Comparable</b> (<code>compareTo(T)</code>, java.lang) defines a class's single <b>natural order</b> inside the class — String alphabetical, Integer numeric, LocalDate chronological. Use it when one ordering is obviously "the" order. <b>Comparator</b> (<code>compare(T, T)</code>, java.util) is an external strategy: you can have many, build them with <code>comparing / thenComparing / reversed / nullsFirst</code>, and apply them to classes you cannot modify. Both return negative/zero/positive; use <code>Integer.compare</code>, never subtraction, and keep compare consistent with equals if the objects go into TreeSet/TreeMap.</p>`, followUps: ['What does TreeSet use to detect duplicates?', 'How do you sort descending by one key and ascending by another?', 'Why might comparing(p -> p.age()).reversed() not compile?'] },
    { q: 'What does "consistent with equals" mean for a Comparator, and what goes wrong otherwise?', level: 'A', a: `<p>It means <code>compare(a, b) == 0</code> exactly when <code>a.equals(b)</code>. Sorted collections (TreeSet, TreeMap) use compare, not equals, to detect duplicates, while hash collections use equals. If they disagree, the same objects behave differently by collection: <code>BigDecimal("1.0")</code> and <code>BigDecimal("1.00")</code> are one element in a TreeSet but two in a HashSet; a length comparator merges "cat" and "dog" in a TreeSet. Fix by adding tie-breakers (<code>thenComparing(naturalOrder())</code>) or normalising values (e.g. BigDecimal scale).</p>`, followUps: ['Is BigDecimal\'s natural ordering consistent with equals?', 'What exception can a non-transitive comparator cause in Collections.sort?'] },
    { q: 'Design question: you must use a custom class as a HashMap key used by many threads. What do you check?', level: 'E', a: `<p>(1) Make it <b>immutable</b>: final class, private final fields, defensive copies of mutable components — or a <b>record</b>. (2) equals/hashCode over exactly the fields that define identity, using <code>Objects.equals</code>, <code>Double.compare</code>, <code>Arrays.equals</code> as needed, consistent with any compareTo. (3) A well-distributed hash (avoid constants, beware hash-flooding if keys come from users; implement Comparable so treeified buckets stay O(log n)). (4) Consider caching the hash if computing it is expensive (immutability makes that safe, as String does). (5) Use ConcurrentHashMap for shared access and atomic methods (<code>computeIfAbsent</code>, <code>merge</code>). (6) Verify with EqualsVerifier and property tests.</p>`, followUps: ['Why do immutable keys matter even in single-threaded code?', 'How would you cache the hash code safely?', 'What would you do for JPA entities whose id is generated on save?'] }
  );

  /* ======================================================================
     MODULE
     ====================================================================== */
  registerModule({
    id: 'java05',
    title: 'Strings Deep Dive, Wrapper Classes, equals & hashCode',
    lang: 'java',
    intro: `<p>This module is about the two things you use in almost every line of Java: <b>text</b> and <b>boxed numbers</b>, plus the two methods that decide whether two objects are "the same". You will see why a <code>String</code> can never change and where it lives (the <b>String pool</b> vs the ordinary heap), why <code>==</code> and <code>equals()</code> give different answers, what <code>intern()</code> really does, and why <code>StringBuilder</code> beats <code>+=</code> in a loop (and when <code>StringBuffer</code> is still around).</p>
<p>Then we open the "gift boxes": <b>wrapper classes</b>, <b>autoboxing/unboxing</b> and the famous <b>Integer cache</b> (-128 to 127) behind dozens of trick questions, the hidden NullPointerExceptions they cause, the <b>equals/hashCode contract</b> that makes HashMap work, and finally <b>Comparable vs Comparator</b> for sorting anything any way you like. Every topic starts with an everyday analogy, has step-through visualizers (pool vs heap arrows, builder capacity, cache boxes, hash buckets, comparator sorts), worked examples, "predict the output" puzzles, a deep dive into JVM internals, and an AI-era section on working with coding assistants.</p>`,
    goals: [
      'Draw the stack/pool/heap picture for any String snippet and predict every <code>==</code>, <code>equals()</code> and <code>intern()</code> result, including compile-time constant folding',
      'Explain why String is immutable (5 reasons), how compact strings store text, and write your own immutable class',
      'Choose between String, StringBuilder and StringBuffer, explain capacity growth, and avoid O(n²) concatenation',
      'Use wrapper classes and parsing APIs correctly, and spot every autoboxing trap: Integer cache, null unboxing, ternary unboxing, remove(int) vs remove(Object), Long vs Integer equals',
      'Write correct equals/hashCode (or use records), explain how HashMap uses them, and recognise mutable-key and symmetry bugs',
      'Implement Comparable and build Comparator chains (comparing, thenComparing, reversed, nullsLast) without overflow or consistency bugs'
    ],
    prereqs: `Java 1–4 (JDK/JVM basics, control flow, methods and pass-by-value, classes/objects/constructors, OOP pillars and the Object class). Basic idea of a HashMap from DSA is helpful but not required.`,
    hours: 14,
    topics: topics,
    quiz: quiz,
    interview: interview,
    practice: practice
  });
})();
