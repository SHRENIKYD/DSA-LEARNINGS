(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- small shared helpers for the visualizers ---------- */
  // Parse "1 2 3" (or "1,2,3") into whole numbers, with friendly errors.
  function parseNums(s, maxLen, what, minLen) {
    s = String(s === undefined || s === null ? '' : s).trim();
    what = what || 'array';
    if (!s) throw new Error('Please type the ' + what + ' as whole numbers separated by spaces, e.g. 3 -1 4');
    var a = s.split(/[\s,]+/).map(Number);
    if (a.some(function (x) { return !isFinite(x) || Math.floor(x) !== x; })) throw new Error('The ' + what + ' must contain only whole numbers separated by spaces, e.g. 3 -1 4');
    if (a.length > maxLen) throw new Error('Keep the ' + what + ' to at most ' + maxLen + ' numbers so every step fits on screen');
    if (minLen && a.length < minLen) throw new Error('Type at least ' + minLen + ' numbers for the ' + what);
    a.forEach(function (x) { if (Math.abs(x) > 9999) throw new Error('Keep each number between -9999 and 9999 so the pictures stay readable'); });
    return a;
  }
  // Split "left | right" style input into trimmed pieces.
  function splitBar(input, need, example) {
    var p = String(input === undefined || input === null ? '' : input).split('|');
    if (p.length !== need) throw new Error('Expected format: ' + example);
    return p.map(function (x) { return x.trim(); });
  }
  function parseInt1(s, what, lo, hi) {
    var v = Number(String(s).trim());
    if (String(s).trim() === '' || !isFinite(v) || Math.floor(v) !== v) throw new Error(what + ' must be a whole number');
    if (v < lo || v > hi) throw new Error(what + ' must be between ' + lo + ' and ' + hi);
    return v;
  }
  function parseWord(s, maxLen, what) {
    s = String(s === undefined || s === null ? '' : s).trim();
    if (!s) throw new Error('Please type the ' + what + ' (letters only), e.g. abcabcbb');
    if (!/^[A-Za-z]+$/.test(s)) throw new Error('The ' + what + ' must contain only letters a-z / A-Z (no spaces or symbols)');
    if (s.length > maxLen) throw new Error('Keep the ' + what + ' to at most ' + maxLen + ' letters');
    return s;
  }
  // one(3,'cur') -> {3:'cur'}
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  // merge several {k: cls} objects (later wins)
  function hlm() {
    var h = {};
    for (var a = 0; a < arguments.length; a++) {
      var o = arguments[a];
      for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) h[k] = o[k];
    }
    return h;
  }
  // snapshot of a JS Map as an entries array (copied; arrays shown as [a, b])
  function ents(m) {
    var out = [];
    m.forEach(function (v, k) { out.push([k, Array.isArray(v) ? '[' + v.join(', ') + ']' : v]); });
    return out;
  }
  // {lo..hi: cls}
  function rng(lo, hi, cls) { var h = {}; for (var i = lo; i <= hi; i++) h[i] = cls; return h; }
  // Java's String.hashCode() in JS (32-bit overflow like Java)
  function javaStrHash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return h; }
  // Java 8+ HashMap.hash(): spread the high bits into the low bits
  function spread(h) { return (h ^ (h >>> 16)) | 0; }

  /* =====================================================================
     TOPIC 1 — Internals
     ===================================================================== */
  topics.push({
    title: 'Inside HashSet & HashMap: Hash Function, hashCode/equals, Buckets, Chaining, Treeify, Load Factor & Rehash',
    analogy: `<p>Picture the <b>VIP guest list at a club door</b>. A lazy bouncer reads the whole list top to bottom for every guest — slow when the list has 10,000 names. A smart bouncer splits the list into <b>numbered pages</b> using a fixed rule, like "page = number of letters in the first name". When "Riya" arrives (4 letters) he opens <b>only page 4</b> and checks the few names written there.</p>
<ul>
<li>The rule that turns a name into a page number is the <b>hash function</b>.</li>
<li>The pages are <b>buckets</b>. Two guests landing on the same page is a <b>collision</b>; they simply share the page as a short list (<b>chaining</b>).</li>
<li>Checking "is this <i>exactly</i> the same person?" on that page is <b>equals()</b>.</li>
<li>When pages get crowded (on average more than ¾ full), the bouncer buys a book with <b>twice as many pages</b> and re-copies every name (<b>resize / rehash</b>).</li>
<li>If one page becomes absurdly long, he re-writes it as a sorted index card box so he can binary-search it (<b>treeify</b>).</li>
</ul>`,
    explain: `<p><b>The one-line promise:</b> a <code>HashSet</code> answers "have I seen this?" and a <code>HashMap</code> answers "what is stored for this key?" in <b>O(1) time on average</b> — no matter whether it holds 10 or 10 million items. This topic opens the box so you know <i>why</i> that is true and <i>when</i> it stops being true.</p>

<h4>Step 1 — turn the key into a number (hashCode)</h4>
<p>Every Java object has <code>hashCode()</code>, which returns an <code>int</code>. For an <code>Integer</code> it is the value itself. For a <code>String</code> it is a polynomial: <code>s[0]·31<sup>n−1</sup> + s[1]·31<sup>n−2</sup> + … + s[n−1]</code> (with int overflow).</p>
${H.table(['key', 'hashCode()', 'how'], [['42', '42', 'Integer → the value itself'], ['"ab"', '3105', '97·31 + 98'], ['"Aa"', H.c('r', '2112'), '65·31 + 97'], ['"BB"', H.c('r', '2112'), '66·31 + 66 → same as "Aa"!'], ['true', '1231', 'Boolean constant (false = 1237)']])}

<h4>Step 2 — turn the number into a bucket index</h4>
<p>The table is an array of <b>buckets</b> whose length is always a power of two (16 by default). Java mixes the high bits into the low bits and then keeps only the low bits:</p>
<pre>hash  = h ^ (h &gt;&gt;&gt; 16)        // "spread" the top 16 bits down
index = hash &amp; (capacity - 1)    // same as hash % capacity, but faster</pre>
<p>With capacity 16, <code>capacity − 1 = 15 = 1111</code> in binary, so <code>&amp; 15</code> keeps the last 4 bits:</p>
${H.table(['key', 'binary (last 8 bits)', '&amp; 15', 'bucket'], [['10', '0000 1010', '1010', '10'], ['26', '0001 1010', '1010', H.c('r', '10 (collision!)')], ['7', '0000 0111', '0111', '7'], ['42', '0010 1010', '1010', H.c('r', '10 (collision again)')]])}

<h4>Step 3 — collisions are normal: chaining</h4>
<p>Many keys share a bucket. Java keeps a small <b>linked list</b> (a "chain") in each bucket. To find a key: jump to its bucket in O(1), then walk the short chain comparing with <code>equals()</code>.</p>
${H.kv([['bucket 7', '7'], ['bucket 10', '10 → 26 → 42']], { label: 'buckets', hl: { 'bucket 10': 'r' } })}

<h4>Step 4 — the hashCode / equals contract</h4>
<ul>
<li>If <code>a.equals(b)</code> then <code>a.hashCode() == b.hashCode()</code> — <b>must</b> hold, or the map looks in the wrong bucket and "loses" your key.</li>
<li>Equal hashCodes do <b>not</b> mean equal objects (that is just a collision — "Aa" vs "BB").</li>
<li>Override <b>both</b> or <b>neither</b>. A Java <code>record</code> generates both for you.</li>
</ul>

<h4>Step 5 — load factor and resize (rehash)</h4>
<p><b>Load factor</b> = how full the table may get before growing; Java uses <b>0.75</b>. Threshold = capacity × 0.75 = 12 for capacity 16. When the 13th key arrives, the table <b>doubles</b> to 32 and every key is re-placed. Because the size doubles, each key either <b>stays at index i</b> or <b>moves to i + oldCapacity</b> — decided by one extra bit of its hash.</p>
${H.table(['capacity', 'threshold (×0.75)', 'grows when size becomes'], [['16', '12', '13'], ['32', '24', '25'], ['64', '48', '49']])}
<p>One resize is O(N), but it happens so rarely (after N/2 cheap inserts) that the <b>amortized</b> cost per insert is still O(1).</p>

<h4>Step 6 — treeify: Java 8's safety net</h4>
<p>If one bucket's chain grows past <b>8</b> nodes <i>and</i> the table has at least <b>64</b> buckets, Java converts that chain into a <b>red-black tree</b> (lookup O(log n) inside that bucket). If the table is smaller than 64 it resizes instead. When a tree shrinks to 6 or fewer nodes during a resize, it turns back into a list.</p>

<h4>The honest complexity table</h4>
${H.table(['operation', 'average', 'worst (all keys collide)'], [['add / put', 'O(1) amortized', 'O(N) list · O(log N) treeified'], ['contains / get', 'O(1)', 'O(N) list · O(log N) treeified'], ['remove', 'O(1)', 'O(N) list · O(log N) treeified'], ['iterate all', 'O(N + capacity)', 'O(N + capacity)']])}
<p><b>HashSet is just a HashMap in disguise:</b> <code>set.add(x)</code> is <code>map.put(x, PRESENT)</code> with a shared dummy value. Everything above applies to both.</p>`,
    clues: [
      '"in O(1) average time" / "constant-time lookup" → hashing',
      '"design a HashMap / HashSet without built-in libraries" (LeetCode 705/706) → array of buckets + chaining + resize',
      '"why is HashMap O(1)? when is it O(N)?" → hash function, collisions, load factor, treeify',
      '"custom object as a key" / "Map&lt;Point, …&gt;" → hashCode/equals contract, immutable keys',
      '"two different strings, same hashCode" → collisions are legal; equals() decides',
      '"millions of inserts, memory is tight" → pre-size the map, primitive arrays, boxing cost',
      '"attacker controls the keys" → hash flooding, treeify, randomized hashing'
    ],
    code: [`
// Correct and broken keys side by side — run it and watch the broken one "disappear".
import java.util.*;

public class HashBasics {
    // BROKEN: equals() is overridden but hashCode() is not.
    // Two equal BadPoints get different (identity) hashCodes -> different buckets.
    static class BadPoint {
        final int x, y;
        BadPoint(int x, int y) { this.x = x; this.y = y; }
        @Override public boolean equals(Object o) {
            if (!(o instanceof BadPoint)) return false;
            BadPoint p = (BadPoint) o;
            return x == p.x && y == p.y;
        }
        // hashCode() NOT overridden -> contract broken
    }

    // GOOD: a record generates equals(), hashCode() and toString() from its fields.
    record Point(int x, int y) {}

    public static void main(String[] args) {
        Set<BadPoint> bad = new HashSet<>();
        bad.add(new BadPoint(1, 2));
        // Almost always false: the lookup goes to a different bucket.
        System.out.println("BadPoint found? " + bad.contains(new BadPoint(1, 2)));

        Set<Point> good = new HashSet<>();
        good.add(new Point(1, 2));
        System.out.println("Point found?    " + good.contains(new Point(1, 2))); // true

        // Collisions are legal: different strings, same hashCode.
        System.out.println("Aa -> " + "Aa".hashCode() + ", BB -> " + "BB".hashCode()); // 2112, 2112

        // Bucket index the way HashMap computes it (capacity 16).
        for (int key : new int[]{10, 26, 7, 42}) {
            int h = Integer.valueOf(key).hashCode();
            int spread = h ^ (h >>> 16);
            System.out.println("key " + key + " -> bucket " + (spread & 15));
        }

        // Pre-size when you know the count: avoids several resizes (Java 19+ helper).
        Map<String, Integer> sized = HashMap.newHashMap(1_000);
        sized.put("ready", 1);
        System.out.println(sized);
    }
}`, {
      lang: 'python', run: true, title: 'Same ideas in Python (runnable): hash(), __eq__/__hash__, buckets',
      code: `class BadPoint:
    def __init__(self, x, y):
        self.x, self.y = x, y
    def __eq__(self, other):
        return isinstance(other, BadPoint) and (self.x, self.y) == (other.x, other.y)
    # Defining __eq__ without __hash__ makes the class UNHASHABLE in Python.

class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y
    def __eq__(self, other):
        return isinstance(other, Point) and (self.x, self.y) == (other.x, other.y)
    def __hash__(self):
        return hash((self.x, self.y))   # equal points -> equal hashes

try:
    {BadPoint(1, 2)}
except TypeError as e:
    print("BadPoint:", e)

good = {Point(1, 2)}
print("Point found?", Point(1, 2) in good)   # True

print("hash(42) =", hash(42))               # small ints hash to themselves
capacity = 16
for key in [10, 26, 7, 42]:
    print("key", key, "-> bucket", hash(key) & (capacity - 1))`
    }],
    codeTitle: ['hashCode/equals contract, collisions and bucket math (Java)', 'Python version (runnable)'],
    viz: [{
      title: 'Bucket array: put, get, remove, collisions and resize (mini HashSet, capacity starts at 4)',
      input: '5 9 13 ?9 8 12 -5 3 19 ?5 40 27',
      inputLabel: 'Operations: n = add n, ?n = contains n, -n = remove n (keys 0–999, at most 14 ops)',
      gen: function (input) {
        var toks = String(input === undefined || input === null ? '' : input).trim().split(/[\s,]+/).filter(Boolean);
        if (!toks.length) throw new Error('Type operations like: 5 9 13 ?9 -5  (number = add, ?n = contains, -n = remove)');
        if (toks.length > 14) throw new Error('Use at most 14 operations so the table stays readable');
        var ops = toks.map(function (t) {
          var mm = /^([?+-]?)(\d{1,3})$/.exec(t);
          if (!mm) throw new Error('Bad token "' + t + '". Use 7 (add), ?7 (contains) or -7 (remove); keys 0–999');
          return { op: mm[1] === '?' ? 'get' : (mm[1] === '-' ? 'remove' : 'put'), k: Number(mm[2]) };
        });
        var cap = 4, LF = 0.75, b = [[], [], [], []], size = 0, frames = [];
        function keysInOrder() { var out = []; b.forEach(function (ch) { ch.forEach(function (k) { out.push(k); }); }); return out; }
        function grid(rowCls, cellCls) {
          var rows = [], hl = {};
          for (var i = 0; i < cap; i++) rows.push([String(i), b[i].length ? b[i].join(' → ') : '·']);
          if (rowCls) for (var r in rowCls) { hl[r + ',0'] = rowCls[r]; hl[r + ',1'] = rowCls[r]; }
          return { type: 'grid', label: 'Bucket array (capacity ' + cap + ') — each row is one bucket, the chain is a linked list', colHead: ['index', 'chain'], rows: rows, hl: hlm(hl, cellCls || {}) };
        }
        function vars(extra, hl) {
          return { type: 'vars', label: 'State', vals: hlm({ size: size, capacity: cap, 'threshold (cap×0.75)': cap * LF }, extra || {}), hl: hl || {} };
        }
        frames.push({ narr: 'An empty HashSet with <b>' + cap + '</b> buckets (real Java starts with 16, we use 4 so resizes happen quickly). Load factor 0.75 → we grow when size goes above <b>' + cap * LF + '</b>.', parts: [vars(), grid(), { type: 'set', label: 'HashSet view (iteration order = bucket order)', items: [] }] });
        ops.forEach(function (o) {
          var idx = o.k & (cap - 1), chain = b[idx], pos = chain.indexOf(o.k);
          var calc = o.k + ' & ' + (cap - 1) + ' = ' + idx;
          frames.push({ narr: '<b>' + (o.op === 'put' ? 'add(' : o.op === 'get' ? 'contains(' : 'remove(') + o.k + ')</b>: hashCode(' + o.k + ') = ' + o.k + '. Index = hash &amp; (capacity − 1) = <b>' + calc + '</b>. Jump straight to bucket ' + idx + ' — no need to look at any other bucket.', parts: [vars({ op: o.op + '(' + o.k + ')', index: calc }, { index: 'cur' }), grid(one(idx, 'cur')), { type: 'set', label: 'HashSet view', items: keysInOrder() }] });
          if (o.op === 'put') {
            if (pos >= 0) {
              frames.push({ narr: 'Walk the chain of bucket ' + idx + ' comparing with equals(): <b>' + o.k + '</b> is already there → <span class="c-r">duplicate</span>, the set does not change. add() returns <b>false</b>.', parts: [vars({ op: 'add(' + o.k + ')', result: 'false (duplicate)' }, { result: 'bad' }), grid(one(idx, 'bad')), { type: 'set', label: 'HashSet view', items: keysInOrder(), hl: one(o.k, 'bad') }] });
            } else {
              var wasCollision = chain.length > 0;
              chain.push(o.k); size++;
              frames.push({ narr: (wasCollision ? 'Bucket ' + idx + ' already holds [' + chain.slice(0, -1).join(', ') + '] → a <b>collision</b>. That is normal: we compare with equals(), nothing matches, so we append <b>' + o.k + '</b> to the chain.' : 'Bucket ' + idx + ' is empty → place <b>' + o.k + '</b> there.') + ' <span class="c-g">Inserted</span>, size = ' + size + '.', parts: [vars({ op: 'add(' + o.k + ')', result: 'true (inserted)' }, { result: 'ok', size: 'ok' }), grid(one(idx, 'ok')), { type: 'set', label: 'HashSet view', items: keysInOrder(), hl: one(o.k, 'ok') }] });
              if (size > cap * LF) {
                var oldCap = cap, oldB = b, moved = {};
                cap *= 2; b = [];
                for (var i = 0; i < cap; i++) b.push([]);
                oldB.forEach(function (ch, oi) { ch.forEach(function (k) { var ni = k & (cap - 1); b[ni].push(k); if (ni !== oi) moved[k] = true; }); });
                var rowHl = {}, sHl = {};
                for (var r = 0; r < cap; r++) if (b[r].length) rowHl[r] = b[r].some(function (k) { return moved[k]; }) ? 'sel' : 'win';
                Object.keys(moved).forEach(function (k) { sHl[k] = 'sel'; });
                frames.push({ narr: '<b>Resize!</b> size ' + size + ' &gt; threshold ' + oldCap * LF + '. Double the capacity ' + oldCap + ' → ' + cap + ' and re-place every key with the new mask (&amp; ' + (cap - 1) + '). Each key either <b>stays</b> at index i (blue rows) or <b>moves</b> to i + ' + oldCap + ' (purple rows) — one extra bit of the hash decides. ' + (Object.keys(moved).length ? 'Moved: ' + Object.keys(moved).join(', ') + '.' : 'Nothing moved this time.') + ' Cost O(N) now, but it happens rarely, so inserts stay O(1) amortized.', parts: [vars({ op: 'resize', 'new threshold': cap * LF }, { capacity: 'sel', 'new threshold': 'sel' }), grid(rowHl), { type: 'set', label: 'HashSet view (order changed — never rely on HashSet order!)', items: keysInOrder(), hl: sHl }] });
              }
            }
          } else if (o.op === 'get') {
            if (pos >= 0) frames.push({ narr: 'Walk the chain of bucket ' + idx + ': ' + (pos > 0 ? 'skip ' + chain.slice(0, pos).join(', ') + ' (equals() says no), then ' : '') + '<b>' + o.k + '</b> matches → <span class="c-r">hit</span>, contains() returns <b>true</b>. We only touched ' + (pos + 1) + ' node(s).', parts: [vars({ op: 'contains(' + o.k + ')', result: 'true (hit)' }, { result: 'bad' }), grid(one(idx, 'bad')), { type: 'set', label: 'HashSet view', items: keysInOrder(), hl: one(o.k, 'bad') }] });
            else frames.push({ narr: 'Bucket ' + idx + (chain.length ? ' holds [' + chain.join(', ') + '] but equals() never matches ' : ' is empty ') + '→ <b>miss</b>, contains() returns <b>false</b>. Still O(1): we never looked at other buckets.', parts: [vars({ op: 'contains(' + o.k + ')', result: 'false (miss)' }, { result: 'cur' }), grid(one(idx, 'cur')), { type: 'set', label: 'HashSet view', items: keysInOrder() }] });
          } else {
            if (pos >= 0) {
              frames.push({ narr: 'Found <b>' + o.k + '</b> in bucket ' + idx + ' → <span class="c-r">remove it</span> by unlinking it from the chain (the node before it now points past it).', parts: [vars({ op: 'remove(' + o.k + ')', result: 'true' }, { result: 'bad' }), grid(one(idx, 'bad')), { type: 'set', label: 'HashSet view', items: keysInOrder(), hl: one(o.k, 'bad') }] });
              chain.splice(pos, 1); size--;
              frames.push({ narr: 'After removal: size = ' + size + '. Java never shrinks the bucket array on remove — capacity stays ' + cap + '.', parts: [vars({ op: 'remove(' + o.k + ')' }, { size: 'cur' }), grid(one(idx, 'done')), { type: 'set', label: 'HashSet view', items: keysInOrder() }] });
            } else frames.push({ narr: '<b>' + o.k + '</b> is not in bucket ' + idx + ' → nothing to remove, remove() returns false.', parts: [vars({ op: 'remove(' + o.k + ')', result: 'false' }, { result: 'cur' }), grid(one(idx, 'cur')), { type: 'set', label: 'HashSet view', items: keysInOrder() }] });
          }
        });
        frames.push({ narr: 'Done. Notice: every operation jumped to <b>one</b> bucket and walked a chain of length ≤ ' + Math.max.apply(null, b.map(function (c) { return c.length; }).concat([0])) + '. That is why hashing is O(1) on average — the load factor keeps chains short.', parts: [vars(), grid(), { type: 'set', label: 'Final HashSet', items: keysInOrder() }] });
        return frames;
      }
    }, {
      title: 'Real Java String keys: hashCode → spread → bucket (word tally, capacity 16)',
      input: 'cat act Aa BB cat dog Aa',
      inputLabel: 'Words separated by spaces (letters/digits, at most 10 words)',
      gen: function (input) {
        var words = String(input === undefined || input === null ? '' : input).trim().split(/\s+/).filter(Boolean);
        if (!words.length) throw new Error('Type some words separated by spaces, e.g. cat act Aa BB');
        if (words.length > 10) throw new Error('Use at most 10 words');
        words.forEach(function (w) { if (!/^[A-Za-z0-9]{1,10}$/.test(w)) throw new Error('Each word: 1–10 letters or digits ("' + w + '" is not)'); });
        var cap = 16, buckets = [], tally = new Map(), frames = [];
        for (var i = 0; i < cap; i++) buckets.push([]);
        function grid(hlRow, cls) {
          var rows = [], hl = {};
          for (var r = 0; r < cap; r++) rows.push([String(r), buckets[r].length ? buckets[r].map(function (w) { return w + '=' + tally.get(w); }).join(' → ') : '·']);
          if (hlRow !== undefined) { hl[hlRow + ',0'] = cls; hl[hlRow + ',1'] = cls; }
          return { type: 'grid', label: 'Buckets (16)', colHead: ['index', 'chain: key=value'], rows: rows, hl: hl };
        }
        frames.push({ narr: 'We will count words with <code>map.merge(word, 1, Integer::sum)</code>. Each word becomes a number with Java\'s String.hashCode(), then a bucket index.', parts: [grid(), { type: 'map', label: 'HashMap&lt;String,Integer&gt; (tally)', entries: [] }] });
        words.forEach(function (w) {
          var h = javaStrHash(w), sp = spread(h), idx = sp & (cap - 1);
          frames.push({ narr: '"' + w + '".hashCode() = <b>' + h + '</b> (s[0]·31<sup>n−1</sup> + … ). Spread: h ^ (h &gt;&gt;&gt; 16) = ' + sp + '. Index = ' + sp + ' &amp; 15 = <b>' + idx + '</b>.', parts: [{ type: 'vars', label: 'Hash math for "' + w + '"', vals: { hashCode: h, 'h ^ (h>>>16)': sp, 'index (& 15)': idx }, hl: { 'index (& 15)': 'cur' } }, grid(idx, 'cur'), { type: 'map', label: 'HashMap&lt;String,Integer&gt; (tally)', entries: ents(tally) }] });
          var chain = buckets[idx];
          if (tally.has(w)) {
            tally.set(w, tally.get(w) + 1);
            frames.push({ narr: 'Bucket ' + idx + ': equals("' + w + '") matches an existing key → <span class="c-r">hit</span>. Value goes up to <b>' + tally.get(w) + '</b>. No new node is created.', parts: [grid(idx, 'bad'), { type: 'map', label: 'HashMap&lt;String,Integer&gt; (tally)', entries: ents(tally), hl: one(w, 'bad') }] });
          } else {
            var others = chain.slice();
            chain.push(w); tally.set(w, 1);
            var sameHash = others.filter(function (o) { return javaStrHash(o) === h; });
            frames.push({ narr: (others.length ? 'Bucket ' + idx + ' already has [' + others.join(', ') + ']' + (sameHash.length ? ' — and "' + sameHash[0] + '" has the <b>very same hashCode ' + h + '</b>! Only equals() can tell them apart.' : ' (a collision of indexes, not of hashCodes).') + ' equals() finds no match, so append. ' : 'Empty bucket. ') + '<span class="c-g">Insert</span> "' + w + '" → 1.', parts: [grid(idx, 'ok'), { type: 'map', label: 'HashMap&lt;String,Integer&gt; (tally)', entries: ents(tally), hl: one(w, 'ok') }] });
          }
        });
        frames.push({ narr: 'Final tally. Lesson: a hashCode is only a <b>hint</b> for where to look; <b>equals()</b> makes the final decision. That is why both must agree.', parts: [grid(), { type: 'map', label: 'Final tally', entries: ents(tally) }] });
        return frames;
      }
    }, {
      title: 'Collision storm: every key returns hashCode 42 → resize, resize, treeify',
      input: '13',
      inputLabel: 'How many keys to insert (4–15), all with the same bad hashCode',
      gen: function (input) {
        var n = parseInt1(input, 'Number of keys', 4, 15), frames = [], cap = 16, treed = false, chain = [];
        function bal(keys) {
          var arr = [];
          function place(lo, hi, pos) { if (lo > hi) return; var mid = (lo + hi) >> 1; while (arr.length <= pos) arr.push(null); arr[pos] = keys[mid]; place(lo, mid - 1, 2 * pos + 1); place(mid + 1, hi, 2 * pos + 2); }
          place(0, keys.length - 1, 0);
          return arr;
        }
        frames.push({ narr: 'A badly written key class whose <code>hashCode()</code> always returns <b>42</b>. Every key lands in the same bucket (42 &amp; 15 = 10). Let us watch how Java 8+ defends itself. Keys are Comparable (k1, k2, … sort by number).', parts: [{ type: 'vars', vals: { capacity: cap, bucket: 42 & (cap - 1), 'chain length': 0, form: 'linked list' } }, { type: 'text', html: 'Rules: a chain becomes a red-black tree when it grows past <b>8</b> nodes <b>and</b> capacity ≥ <b>64</b>; if capacity is smaller, Java <b>resizes instead</b>.' }] });
        for (var k = 1; k <= n; k++) {
          chain.push(k);
          var note = '', cls = 'ok', capCls = '';
          if (!treed && chain.length > 8) {
            if (cap < 64) { cap *= 2; note = 'Chain is now ' + chain.length + ' long (&gt; 8) but capacity was below 64 → Java <b>resizes</b> to ' + cap + ' instead of treeifying. All keys still share one hash, so they all land together in bucket ' + (42 & (cap - 1)) + '. Resizing cannot fix a bad hashCode!'; cls = 'bad'; capCls = 'bad'; }
            else { treed = true; note = 'Chain length ' + chain.length + ' &gt; 8 and capacity ' + cap + ' ≥ 64 → <b>treeify</b>: the bucket becomes a red-black tree. Lookups in this bucket drop from O(n) to <b>O(log n)</b>.'; cls = 'sel'; }
          } else note = treed ? 'Insert k' + k + ' into the tree in O(log n) — compareTo() picks left/right.' : 'Insert k' + k + ' at the tail of the chain. Finding a key now means walking up to ' + chain.length + ' nodes — O(n) inside this bucket.';
          var parts = [{ type: 'vars', vals: { capacity: cap, bucket: 42 & (cap - 1), 'chain length': chain.length, form: treed ? 'red-black tree' : 'linked list' }, hl: { capacity: capCls, form: treed ? 'sel' : '' } }];
          if (treed) parts.push({ type: 'tree', label: 'Bucket ' + (42 & (cap - 1)) + ' as a tree (shape simplified to a balanced BST)', arr: bal(chain.map(function (x) { return 'k' + x; })), hl: {} });
          else parts.push({ type: 'list', label: 'Bucket ' + (42 & (cap - 1)) + ' chain', values: chain.map(function (x) { return 'k' + x; }), hl: one(chain.length - 1, cls) });
          frames.push({ narr: '<b>put(k' + k + ')</b>: hash 42 → bucket ' + (42 & (cap - 1)) + '. ' + note, parts: parts });
        }
        frames.push({ narr: treed ? 'Treeified: worst case per lookup is now O(log n) instead of O(n). But the real fix is a good hashCode() that spreads keys across buckets!' : 'With ' + n + ' keys the chain never needed a tree yet. Try 11 or more keys to see the treeify step (16 → 32 → 64 → tree).', parts: [{ type: 'vars', vals: { capacity: cap, 'chain length': chain.length, form: treed ? 'red-black tree' : 'linked list' }, hl: { form: 'sel' } }, { type: 'text', html: 'Fix: <code>return Objects.hash(field1, field2);</code> or use a <code>record</code>.' }] });
        return frames;
      }
    }],
    examples: [{
      title: 'Compute bucket indexes by hand (capacity 16, then 32)',
      html: `<p>Keys 5, 21, 37, 100. Capacity 16 → mask 15 (<code>1111</code>):</p>
${H.table(['key', 'binary', '&amp; 15 (cap 16)', '&amp; 31 (cap 32)', 'moved?'], [['5', '0000101', '5', '5', 'stays'], ['21', '0010101', H.c('r', '5'), '21', H.c('p', 'moves to 5 + 16')], ['37', '0100101', H.c('r', '5'), '5', 'stays'], ['100', '1100100', '4', '4', 'stays']])}
<p>At capacity 16, keys 5, 21 and 37 collide in bucket 5. After resizing to 32, only the <b>5th bit</b> (value 16) is newly looked at: 21 has it set, so it moves to 5 + 16 = 21; 5 and 37 do not, so they stay. That is the "stay at i or move to i + oldCap" rule.</p>`
    }, {
      title: '"Aa" and "BB" — a legal collision',
      html: `<p><code>"Aa".hashCode()</code> = 65·31 + 97 = <b>2112</b>. <code>"BB".hashCode()</code> = 66·31 + 66 = <b>2112</b>. Same bucket, different strings. A map with both keys stores two nodes in the same chain; <code>get("BB")</code> walks the chain and uses <code>equals()</code> to pick the right one.</p>
<p>Because "Aa" and "BB" collide, so do "AaAa", "AaBB", "BBAa", "BBBB" — 2<sup>k</sup> colliding strings of length 2k. Attackers used exactly this trick (hash flooding) against web servers in 2011.</p>`,
      code: `Map<String, Integer> m = new HashMap<>();
m.put("Aa", 1);
m.put("BB", 2);
System.out.println(m.get("Aa") + " " + m.get("BB")); // 1 2 — collision handled by equals()`
    }, {
      title: 'The mutable key trap',
      html: `<p>Put a key in a set, then change a field used by <code>hashCode()</code>. The object is still physically in the <b>old</b> bucket, but lookups now compute a <b>new</b> bucket — the element is "lost" (contains() says false, yet size() says 1).</p>
<p><b>Rule:</b> keys must be immutable (String, Integer, records with final fields). Never use a <code>List</code> you will later modify as a key.</p>`,
      code: `List<Integer> key = new ArrayList<>(List.of(1, 2));
Set<List<Integer>> set = new HashSet<>();
set.add(key);
key.add(3);                                  // hashCode of the list changes
System.out.println(set.contains(key));        // false — lost in the old bucket
System.out.println(set.size());               // 1`
    }, {
      title: 'Pre-sizing to avoid resizes',
      html: `<p>Inserting 1,000,000 keys into <code>new HashMap&lt;&gt;()</code> triggers resizes at 13, 25, 49, … — about 17 doublings, each re-placing everything already in the map. If you know the count, size it once:</p>
<ul><li>Java 19+: <code>HashMap.newHashMap(1_000_000)</code> (computes capacity for you).</li>
<li>Older Java: <code>new HashMap&lt;&gt;((int) (n / 0.75f) + 1)</code>. Note: <code>new HashMap&lt;&gt;(n)</code> is the <i>capacity</i>, not the expected size — a common mistake.</li></ul>`,
      code: `int n = 1_000_000;
Map<Integer, Integer> a = HashMap.newHashMap(n);           // Java 19+
Map<Integer, Integer> b = new HashMap<>((int) (n / 0.75f) + 1); // works on any version
for (int i = 0; i < n; i++) { a.put(i, i); b.put(i, i); }
System.out.println(a.size() + " " + b.size());`
    }, {
      title: 'Choosing the right map',
      html: `${H.table(['need', 'use', 'cost'], [['fast lookup, order does not matter', 'HashMap / HashSet', 'O(1) avg'], ['remember insertion order (or LRU)', 'LinkedHashMap / LinkedHashSet', 'O(1) avg, a bit more memory'], ['sorted keys, floor/ceiling, range queries', 'TreeMap / TreeSet', 'O(log N)'], ['many threads writing', 'ConcurrentHashMap', 'O(1) avg, no null keys/values'], ['keys are small ints 0..K', 'plain int[] / boolean[]', 'O(1) worst case, tiny memory']])}
<p>Interview tip: when keys are lowercase letters, <code>int[26]</code> beats a HashMap in speed and memory, and still counts as "hashing" (the index <i>is</i> a perfect hash).</p>`
    }],
    deepDive: `<p><b>Exact Java 8+ mechanics.</b> <code>HashMap</code> allocates its table lazily on the first <code>put</code>. <code>hash(key) = (h = key.hashCode()) ^ (h &gt;&gt;&gt; 16)</code>; the XOR folds high bits into low bits because the mask only looks at the low bits — without it, keys that differ only in high bits (e.g. multiples of 65,536) would all collide. <code>null</code> is allowed as a key and always goes to bucket 0. New nodes are appended at the <b>tail</b> (Java 7 inserted at the head, and a concurrent resize could create a cycle → infinite loop; that is one reason <code>HashMap</code> is never safe across threads).</p>
<p><b>Treeify details.</b> Constants: <code>TREEIFY_THRESHOLD = 8</code>, <code>UNTREEIFY_THRESHOLD = 6</code>, <code>MIN_TREEIFY_CAPACITY = 64</code>. Tree nodes are ordered by hash first, then by <code>compareTo</code> if the keys are <code>Comparable</code>, then by a tie-breaker. If keys collide completely <i>and</i> are not Comparable, a tree lookup can still degrade toward O(n). Under random hashing, the chance of a bucket even reaching 8 nodes at load 0.75 is about 0.00000006 (Poisson with λ ≈ 0.5), so treeify is a <i>defence</i>, not a normal path.</p>
<p><b>Why power-of-two capacity?</b> <code>&amp; (cap − 1)</code> is a single CPU instruction, versus a slow division for <code>%</code>. The price is that only low bits matter — hence the spreading step. C++ <code>std::unordered_map</code> (libstdc++) instead uses <b>prime</b> bucket counts and <code>%</code>.</p>
<p><b>Open addressing vs chaining.</b> Python's <code>dict</code> and <code>set</code> do not use chains; they probe other slots in the same array (open addressing with a "perturb" sequence) and resize at about 2/3 full. Since Python 3.7, <code>dict</code> keeps insertion order (a compact entries array + a sparse index array). Google's SwissTable (Abseil, Rust's <code>HashMap</code>) also uses open addressing with SIMD-scanned metadata bytes. Open addressing is cache-friendlier; deletions need "tombstones".</p>
<p><b>Memory reality.</b> A <code>HashMap&lt;Integer,Integer&gt;</code> entry costs a 32-byte node plus two boxed Integers (16 bytes each, except the cached −128..127) plus the table slot: roughly 60–80 bytes per entry versus 8 bytes in an <code>int[]</code>. At 10<sup>7</sup> entries that is the difference between ~700 MB and ~80 MB. Production code uses primitive maps (fastutil, Eclipse Collections, Agrona) or arrays when keys are dense.</p>
<p><b>Security.</b> If attackers choose keys, they can force collisions (hash flooding). Defences: treeify (Java), randomized seeded hashes (Python's SipHash for <code>str</code>/<code>bytes</code>, Rust's default SipHash-1-3), and limits on request parameter counts. On competitive-programming sites, "anti-hash" tests target <code>unordered_map</code>; a custom splitmix64 hash with a random seed fixes it.</p>`,
    aiEra: `<p><b>What AI changes:</b> nobody hand-writes a production hash table any more, and an assistant will happily generate <code>new HashMap&lt;&gt;()</code> in every function. What still matters is <i>judgement</i>: is a hash map even the right tool, is the key correct, and will it survive real data volume.</p>
<p><b>Use AI as a partner:</b> ask <code>Generate a Java class used as a HashMap key and show three ways its equals/hashCode could be wrong</code>, or <code>Write a JMH benchmark comparing HashMap&lt;Integer,Integer&gt; with int[] counting for 10^7 keys</code>. Let it produce adversarial inputs: <code>give me 20 strings that all share one Java hashCode</code> (it will usually build them from "Aa"/"BB" blocks — check them!).</p>
<p><b>Where AI goes wrong:</b> it overrides <code>equals</code> without <code>hashCode</code> in hand-written classes, uses mutable fields in keys, writes <code>new HashMap&lt;&gt;(n)</code> believing <code>n</code> is the expected size, claims "HashMap is always O(1)", or shares a plain <code>HashMap</code> across threads. It also confuses Java's tail insertion with Java 7 head insertion when explaining internals.</p>
<p><b>What you must still own:</b> explaining average vs worst case with the load factor, spotting a broken key class in code review, and choosing between HashMap, LinkedHashMap, TreeMap, ConcurrentHashMap and a plain array. Interviewers ask "how does it work inside?" precisely because AI-generated code hides it.</p>`,
    problems: [{
      title: 'Design HashMap (no built-in hash tables)',
      level: 'Medium', tags: ['design', 'hashing', 'chaining', 'resize'], companies: ['Amazon', 'Microsoft', 'Google', 'Adobe'],
      statement: `<p>Implement <code>MyHashMap</code> without using any built-in hash table library:</p>
<ul><li><code>put(key, value)</code> — insert the pair, or update the value if the key already exists.</li>
<li><code>get(key)</code> — return the value, or <b>−1</b> if the key is absent.</li>
<li><code>remove(key)</code> — delete the key if present.</li></ul>`,
      constraints: `0 ≤ key, value ≤ 10<sup>6</sup>; at most 10<sup>4</sup> calls in total.`,
      example: `<p>Calls: <code>put(1,1), put(2,2), put(17,5), get(1), get(3), put(2,1), get(2), remove(2), get(2)</code></p>
<p>Output: <code>${H.c('g', '1')}, ${H.c('r', '-1')}, ${H.c('g', '1')}, ${H.c('r', '-1')}</code></p>
<p><b>Why:</b> key 17 lands in the same bucket as 1 (17 &amp; 15 = 1), but equals() tells them apart so <code>get(1)</code> is still 1. Key 3 was never added → −1. <code>put(2,1)</code> overwrites 2 → value 1. After <code>remove(2)</code>, key 2 is gone → −1.</p>`,
      brute: {
        why: `<p>Keep every pair in one list and scan it on every call. Each operation is <b>O(N)</b> where N = number of stored keys; with 10<sup>4</sup> calls that is up to 10<sup>8</sup> comparisons in the worst case. The wasted work: we compare against keys that could never match. (A direct-address <code>int[1_000_001]</code> is O(1) but wastes ~4 MB and only works because keys are small — interviewers want the general design.)</p>`,
        code: `class MyHashMapBrute {
    // Every pair lives in one list: [key, value].
    private final List<int[]> pairs = new ArrayList<>();

    public void put(int key, int value) {
        for (int[] p : pairs) {
            if (p[0] == key) { p[1] = value; return; } // update existing
        }
        pairs.add(new int[]{key, value});               // brand-new key
    }

    public int get(int key) {
        for (int[] p : pairs) if (p[0] == key) return p[1];
        return -1;
    }

    public void remove(int key) {
        for (int i = 0; i < pairs.size(); i++) {
            if (pairs.get(i)[0] == key) { pairs.remove(i); return; }
        }
    }
}`
      },
      mcq: {
        q: 'You have an array of 16 buckets. Which pair of keys collide when index = key &amp; 15?',
        options: ['3 and 19', '3 and 4', '16 and 17', '8 and 24 and 3'],
        answer: 0,
        explain: '19 = 10011 in binary; its last 4 bits are 0011 = 3, the same as 3. So both go to bucket 3 and must share a chain.'
      },
      hints: [
        `<p><b>Hint 1:</b> You cannot afford to look at every key. Split keys into many small groups ("buckets") using a cheap rule like <code>key % capacity</code>, so each call only looks at one tiny group.</p>`,
        `<p><b>Hint 2:</b> Use an array of linked-list heads (<code>Node[] table</code>). Each node stores key, value and next. Two keys in the same bucket simply share the list — compare keys with <code>==</code> (or equals) while walking.</p>`,
        `<p><b>Hint 3 (recipe):</b> index = hash &amp; (cap − 1) with cap a power of two. put: walk the chain, update if found, else add a node and <code>size++</code>; if size &gt; 0.75·cap, double the table and re-insert everything. get: walk, return value or −1. remove: walk with a <code>prev</code> pointer and unlink. Edge cases: removing the head node, updating an existing key must not change size.</p>`
      ],
      solution: {
        approach: `<p><b>Separate chaining with resizing</b> — exactly what <code>java.util.HashMap</code> does (minus treeify). The bucket array starts at 16; each slot holds the head of a singly linked list. A key's bucket is <code>spread(hash) &amp; (capacity − 1)</code>. Because we double the table whenever <code>size &gt; 0.75 × capacity</code>, the average chain length stays below 1, so each call does O(1) expected work.</p>`,
        code: `class MyHashMap {
    // One entry in a bucket chain.
    private static class Node {
        final int key;
        int val;
        Node next;
        Node(int key, int val, Node next) { this.key = key; this.val = val; this.next = next; }
    }

    private static final double LOAD_FACTOR = 0.75;
    private Node[] table = new Node[16];   // capacity is always a power of two
    private int size = 0;

    // Same idea as java.util.HashMap.hash(): mix high bits into low bits, then mask.
    private static int indexFor(int key, int capacity) {
        int h = Integer.hashCode(key);
        h ^= (h >>> 16);
        return h & (capacity - 1);
    }

    public void put(int key, int value) {
        int i = indexFor(key, table.length);
        for (Node n = table[i]; n != null; n = n.next) {
            if (n.key == key) { n.val = value; return; }   // key exists: update only
        }
        table[i] = new Node(key, value, table[i]);         // new key: add at head of chain
        if (++size > table.length * LOAD_FACTOR) resize();
    }

    public int get(int key) {
        for (Node n = table[indexFor(key, table.length)]; n != null; n = n.next) {
            if (n.key == key) return n.val;
        }
        return -1;
    }

    public void remove(int key) {
        int i = indexFor(key, table.length);
        Node prev = null, cur = table[i];
        while (cur != null) {
            if (cur.key == key) {
                if (prev == null) table[i] = cur.next;   // removing the head
                else prev.next = cur.next;               // unlink from the middle/tail
                size--;
                return;
            }
            prev = cur;
            cur = cur.next;
        }
    }

    // Double the table and re-place every node with the new mask.
    private void resize() {
        Node[] old = table;
        table = new Node[old.length * 2];
        for (Node head : old) {
            for (Node n = head; n != null; ) {
                Node next = n.next;
                int i = indexFor(n.key, table.length);
                n.next = table[i];
                table[i] = n;
                n = next;
            }
        }
    }
}`,
        alt: [{
          lang: 'python', code: `class MyHashMap:
    def __init__(self):
        self.cap = 16
        self.size = 0
        self.buckets = [[] for _ in range(self.cap)]   # each bucket: list of [key, value]

    def _idx(self, key):
        return hash(key) & (self.cap - 1)

    def put(self, key: int, value: int) -> None:
        bucket = self.buckets[self._idx(key)]
        for pair in bucket:
            if pair[0] == key:
                pair[1] = value          # update existing key
                return
        bucket.append([key, value])
        self.size += 1
        if self.size > 0.75 * self.cap:
            self._resize()

    def get(self, key: int) -> int:
        for k, v in self.buckets[self._idx(key)]:
            if k == key:
                return v
        return -1

    def remove(self, key: int) -> None:
        bucket = self.buckets[self._idx(key)]
        for i, (k, _) in enumerate(bucket):
            if k == key:
                bucket.pop(i)
                self.size -= 1
                return

    def _resize(self):
        old = self.buckets
        self.cap *= 2
        self.buckets = [[] for _ in range(self.cap)]
        for bucket in old:
            for k, v in bucket:
                self.buckets[self._idx(k)].append([k, v])`
        }, {
          lang: 'cpp', code: `class MyHashMap {
    vector<list<pair<int,int>>> table;
    size_t sz = 0;
    size_t idx(int key) const { return (size_t)key & (table.size() - 1); }
    void grow() {
        vector<list<pair<int,int>>> old(table.size() * 2);
        swap(old, table);                       // table is now the bigger, empty one
        for (auto& bucket : old)
            for (auto& kv : bucket) table[idx(kv.first)].push_back(kv);
    }
public:
    MyHashMap() : table(16) {}
    void put(int key, int value) {
        for (auto& kv : table[idx(key)]) if (kv.first == key) { kv.second = value; return; }
        table[idx(key)].push_back({key, value});
        if (++sz * 4 > table.size() * 3) grow();   // load factor 0.75
    }
    int get(int key) {
        for (auto& kv : table[idx(key)]) if (kv.first == key) return kv.second;
        return -1;
    }
    void remove(int key) {
        auto& b = table[idx(key)];
        for (auto it = b.begin(); it != b.end(); ++it)
            if (it->first == key) { b.erase(it); --sz; return; }
    }
};`
        }],
        dry: {
          head: ['call', 'index (key &amp; 15)', 'chain of that bucket after the call', 'size', 'returns'],
          rows: [
            ['put(1,1)', '1', H.c('g', '[1=1]'), '1', '—'],
            ['put(2,2)', '2', H.c('g', '[2=2]'), '2', '—'],
            ['put(17,5)', '1 (collision with 1)', H.c('g', '[17=5 → 1=1]'), '3', '—'],
            ['get(1)', '1', 'walk 17 (no) → 1 (yes)', '3', H.c('g', '1')],
            ['get(3)', '3', 'empty bucket', '3', H.c('r', '-1')],
            ['put(2,1)', '2', 'key found → value overwritten: [2=1]', '3 (unchanged)', '—'],
            ['get(2)', '2', '[2=1]', '3', H.c('g', '1')],
            ['remove(2)', '2', H.c('r', 'head unlinked → []'), '2', '—'],
            ['get(2)', '2', 'empty bucket', '2', H.c('r', '-1')]
          ]
        },
        complexity: `<p><b>Time:</b> O(1) average per call (chains stay short thanks to the 0.75 load factor); a resize is O(N) but happens after N/2 cheap inserts, so it is O(1) amortized. Worst case O(N) per call if every key collides. <b>Space:</b> O(N + capacity).</p>`,
        followUps: [
          'Design HashSet (LeetCode 705): same structure, no values.',
          'Make it generic <code>MyHashMap&lt;K,V&gt;</code> using <code>key.hashCode()</code> and <code>equals()</code>.',
          'Replace chaining with open addressing (linear probing). How do you delete safely? (tombstones)',
          'Make it thread-safe: one lock vs lock striping vs ConcurrentHashMap\'s per-bin CAS approach.',
          'Add treeify for long chains — what extra requirement does that place on keys?'
        ]
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — Frequency map
     ===================================================================== */
  topics.push({
    title: 'Frequency Map: Count First, Answer Later (First Non-Repeating, Anagrams, Group Anagrams)',
    analogy: `<p>A <b>shopkeeper keeps a tally sheet</b>. Every time someone buys a "pen", he finds the row "pen" and adds a stroke; a brand-new item gets a new row with one stroke. He never re-counts the whole day's sales — at closing time he just <b>reads the sheet</b>:</p>
<ul>
<li>"Which item sold exactly once, earliest in the day?" → <b>first non-repeating</b>.</li>
<li>"Did Shop A and Shop B sell exactly the same items in the same amounts?" → compare two sheets → <b>anagram check</b>.</li>
<li>"Group customers whose shopping baskets had identical contents" → baskets with the same sheet go together → <b>group anagrams</b>.</li>
</ul>
<p>The tally sheet is a <b>HashMap&lt;item, count&gt;</b>. Writing a stroke is O(1); reading a row is O(1).</p>`,
    explain: `<p><b>The pattern in one sentence:</b> make one pass to <b>count</b> everything into a map, then make a second pass (over the input or over the map) to <b>answer</b> the question. Two O(N) passes = O(N), instead of re-counting for every element (O(N<sup>2</sup>)).</p>

<h4>The three ways to keep a tally in Java</h4>
${H.table(['when keys are…', 'use', 'one line'], [['anything (ints, strings, objects)', '<code>HashMap&lt;K,Integer&gt;</code>', '<code>cnt.merge(x, 1, Integer::sum);</code>'], ['lowercase letters a–z', '<code>int[26]</code>', '<code>cnt[c - \'a\']++;</code>'], ['ASCII characters', '<code>int[128]</code>', '<code>cnt[c]++;</code>'], ['small ints 0..K', '<code>int[K+1]</code>', '<code>cnt[x]++;</code>']])}
<p><code>merge(x, 1, Integer::sum)</code> means: "if x is missing, store 1; otherwise store old + 1". The older style is <code>cnt.put(x, cnt.getOrDefault(x, 0) + 1)</code>.</p>

<h4>Use 1 — first non-repeating element</h4>
${H.arr([9, 4, 9, 6, 7, 4], { label: 'arr', hl: { 3: 'g' } })}
${H.kv([['9', 2], ['4', 2], ['6', 1], ['7', 1]], { label: 'tally', hl: { '6': 'g', '7': 'g', '9': 'r', '4': 'r' } })}
<p>Pass 1 builds the tally. Pass 2 walks the <b>array</b> again (not the map — a HashMap has no reliable order!) and returns the first value whose count is 1 → <b>6</b>. Note 7 also has count 1, but 6 comes first in the array.</p>

<h4>Use 2 — anagram check (one map, +1 / −1)</h4>
<p>Two strings are anagrams if every letter appears the same number of times. Add +1 for each letter of <code>s</code> and −1 for each letter of <code>t</code>. If every count ends at 0, they match.</p>
${H.table(['letter', 'in "listen"', 'in "silent"', 'net'], [['l', '+1', '−1', '0'], ['i', '+1', '−1', '0'], ['s', '+1', '−1', '0'], ['t', '+1', '−1', '0'], ['e', '+1', '−1', '0'], ['n', '+1', '−1', H.c('g', '0 → anagram')]])}

<h4>Use 3 — group anagrams (the count becomes the KEY)</h4>
<p>Now the map is not "item → count" but "<b>signature → list of words</b>". All anagrams share the same signature: sort the letters (<code>"tea" → "aet"</code>) or write the 26 counts (<code>"1#0#0#0#1#…"</code>).</p>
${H.kv([['aet', '[eat, tea, ate]'], ['ant', '[tan, nat]'], ['abt', '[bat]']], { label: 'signature → group' })}

<h4>Recipe you can reuse</h4>
<ol><li>Decide the <b>key</b> (the element itself, a letter, a signature, a pair…).</li>
<li>Decide the <b>value</b> (count, first index, last index, list of items).</li>
<li>Pass 1: fill the map. Pass 2: answer from the map in the order the question demands.</li></ol>`,
    clues: [
      '"first non-repeating / first unique" → count pass + ordered second pass',
      '"anagram", "permutation of", "rearrange letters", "same characters" → equal frequency maps',
      '"group / bucket strings that are anagrams" → signature key → list',
      '"most frequent", "appears more than N/2 or N/3 times", "top K frequent" → frequency map (then heap/bucket sort)',
      '"only lowercase English letters" → int[26] instead of HashMap',
      '"can you build X from the letters of Y" (ransom note) → counts of Y ≥ counts of X',
      'N ≤ 10<sup>5</sup> and nested "count occurrences" loops look tempting → O(N) with a map'
    ],
    code: [`
import java.util.*;
import java.util.stream.*;

public class TallyIdioms {
    public static void main(String[] args) {
        int[] arr = {9, 4, 9, 6, 7, 4};

        // 1) HashMap tally with merge(): missing -> 1, present -> old + 1
        Map<Integer, Integer> cnt = new HashMap<>();
        for (int x : arr) cnt.merge(x, 1, Integer::sum);
        System.out.println("tally = " + cnt);

        // 2) Second pass over the ARRAY (keeps the original order) to find the first count == 1
        for (int x : arr) {
            if (cnt.get(x) == 1) { System.out.println("first non-repeating = " + x); break; }
        }

        // 3) int[26] tally for lowercase letters: index = c - 'a'
        int[] letters = new int[26];
        for (char c : "banana".toCharArray()) letters[c - 'a']++;
        System.out.println("a=" + letters[0] + " b=" + letters[1] + " n=" + letters['n' - 'a']);

        // 4) Streams version (nice for one-liners, slower in hot loops)
        Map<Character, Long> byChar = "mississippi".chars()
            .mapToObj(c -> (char) c)
            .collect(Collectors.groupingBy(c -> c, TreeMap::new, Collectors.counting()));
        System.out.println(byChar); // {i=4, m=1, p=2, s=4}
    }
}`, {
      lang: 'python', run: true, title: 'Python: Counter does the tally for you (runnable)',
      code: `from collections import Counter, defaultdict

arr = [9, 4, 9, 6, 7, 4]
cnt = Counter(arr)                       # {9: 2, 4: 2, 6: 1, 7: 1}
print("tally:", dict(cnt))
print("first non-repeating:", next((x for x in arr if cnt[x] == 1), None))

print("anagram?", Counter("listen") == Counter("silent"))

groups = defaultdict(list)
for w in ["eat", "tea", "tan", "ate", "nat", "bat"]:
    groups["".join(sorted(w))].append(w)   # signature -> words
print("groups:", list(groups.values()))
print("most common 2 in 'mississippi':", Counter("mississippi").most_common(2))`
    }],
    codeTitle: ['Tally idioms in Java', 'Python version (runnable)'],
    viz: [{
      title: 'Tally sheet → first non-repeating element',
      input: '9 4 9 6 7 4',
      inputLabel: 'Array (whole numbers, space separated, at most 14)',
      gen: function (input) {
        var a = parseNums(input, 14, 'array'), cnt = new Map(), frames = [];
        frames.push({ narr: 'Pass 1 will fill the tally sheet. Pass 2 will walk the array again and stop at the first value whose count is exactly 1.', parts: [{ type: 'array', label: 'arr', values: a.slice() }, { type: 'map', label: 'Tally sheet: value → count', entries: [] }] });
        for (var i = 0; i < a.length; i++) {
          var x = a[i], had = cnt.has(x);
          cnt.set(x, (cnt.get(x) || 0) + 1);
          frames.push({ narr: 'Pass 1, i = ' + i + ': read <b>' + x + '</b>. ' + (had ? '<span class="c-r">Already on the sheet</span> → add a stroke: count becomes ' + cnt.get(x) + '.' : '<span class="c-g">New item</span> → new row with count 1.'), parts: [{ type: 'array', label: 'arr', values: a.slice(), ptr: one(i, 'i'), hl: one(i, 'cur') }, { type: 'map', label: 'Tally sheet: value → count', entries: ents(cnt), hl: one(x, had ? 'bad' : 'ok') }] });
        }
        var hl = {};
        for (var j = 0; j < a.length; j++) {
          var c = cnt.get(a[j]);
          if (c === 1) {
            hl[j] = 'sel';
            frames.push({ narr: 'Pass 2, i = ' + j + ': ' + a[j] + ' has count <b>1</b> → this is the <b>first non-repeating element</b>. Answer = <b>' + a[j] + '</b>.', parts: [{ type: 'array', label: 'arr', values: a.slice(), ptr: one(j, 'i'), hl: hlm(hl) }, { type: 'map', label: 'Tally sheet', entries: ents(cnt), hl: one(a[j], 'sel') }] });
            return frames;
          }
          hl[j] = 'bad';
          frames.push({ narr: 'Pass 2, i = ' + j + ': ' + a[j] + ' has count ' + c + ' → it repeats, <span class="c-r">skip</span>.', parts: [{ type: 'array', label: 'arr', values: a.slice(), ptr: one(j, 'i'), hl: hlm(hl) }, { type: 'map', label: 'Tally sheet', entries: ents(cnt), hl: one(a[j], 'bad') }] });
        }
        frames.push({ narr: 'Every value repeats → no non-repeating element (return 0 / −1 as the problem says).', parts: [{ type: 'array', label: 'arr', values: a.slice(), hl: hl }, { type: 'map', label: 'Tally sheet', entries: ents(cnt) }] });
        return frames;
      }
    }, {
      title: 'Anagram check with ONE map: +1 for s, −1 for t, erase at 0',
      input: 'listen | silent',
      inputLabel: 'Two words: s | t (letters only, at most 12 each)',
      gen: function (input) {
        var p = splitBar(input, 2, 'listen | silent'), s = parseWord(p[0], 12, 'first word').toLowerCase(), t = parseWord(p[1], 12, 'second word').toLowerCase(), m = new Map(), frames = [];
        frames.push({ narr: 'Lengths: ' + s.length + ' vs ' + t.length + (s.length !== t.length ? ' → different lengths can never be anagrams, but let us still watch the counts.' : ' → equal, continue.') + ' We add +1 for each letter of s, −1 for each letter of t. A row that reaches 0 is erased.', parts: [{ type: 'array', label: 's', values: s.split('') }, { type: 'array', label: 't', values: t.split('') }, { type: 'map', label: 'letter → net count', entries: [] }] });
        for (var i = 0; i < s.length; i++) {
          var c = s[i], had = m.has(c);
          m.set(c, (m.get(c) || 0) + 1);
          var zero = m.get(c) === 0;
          frames.push({ narr: 's[' + i + '] = <b>' + c + '</b> → +1. ' + (zero ? 'Net count hit 0 → <span class="c-r">erase the row</span>.' : (had ? 'Row existed, now ' + m.get(c) + '.' : '<span class="c-g">New row</span>.')), parts: [{ type: 'array', label: 's', values: s.split(''), hl: one(i, 'cur'), ptr: one(i, 'i') }, { type: 'array', label: 't', values: t.split('') }, { type: 'map', label: 'letter → net count', entries: ents(m), hl: one(c, zero ? 'bad' : (had ? 'cur' : 'ok')) }] });
          if (zero) m.delete(c);
        }
        for (var j = 0; j < t.length; j++) {
          var d = t[j], had2 = m.has(d);
          m.set(d, (m.get(d) || 0) - 1);
          var z2 = m.get(d) === 0;
          frames.push({ narr: 't[' + j + '] = <b>' + d + '</b> → −1. ' + (z2 ? 'Net count hit 0 → <span class="c-r">erase the row</span> (this letter is balanced).' : (had2 ? 'Now ' + m.get(d) + '.' : 'Not in s at all → <span class="c-g">new row</span> with −1 (t has an extra ' + d + ').')), parts: [{ type: 'array', label: 's', values: s.split('') }, { type: 'array', label: 't', values: t.split(''), hl: one(j, 'cur'), ptr: one(j, 'j') }, { type: 'map', label: 'letter → net count', entries: ents(m), hl: one(d, z2 ? 'bad' : (had2 ? 'cur' : 'ok')) }] });
          if (z2) m.delete(d);
        }
        var ok = m.size === 0;
        frames.push({ narr: ok ? 'The map is <b>empty</b> → every letter balanced → <span class="c-g">anagrams: true</span>.' : 'Rows left over: ' + ents(m).map(function (e) { return e[0] + '=' + e[1]; }).join(', ') + ' → <span class="c-r">not anagrams: false</span>.', parts: [{ type: 'map', label: 'leftover rows', entries: ents(m) }, { type: 'vars', vals: { answer: ok }, hl: { answer: ok ? 'ok' : 'bad' } }] });
        return frames;
      }
    }, {
      title: 'Group anagrams: signature (sorted letters) → list of words',
      input: 'eat tea tan ate nat bat',
      inputLabel: 'Words separated by spaces (letters only, at most 10 words)',
      gen: function (input) {
        var ws = String(input === undefined || input === null ? '' : input).trim().split(/\s+/).filter(Boolean);
        if (!ws.length) throw new Error('Type words separated by spaces, e.g. eat tea tan ate nat bat');
        if (ws.length > 10) throw new Error('Use at most 10 words');
        ws = ws.map(function (w) { return parseWord(w, 10, 'word').toLowerCase(); });
        var g = new Map(), frames = [];
        frames.push({ narr: 'Every word gets a <b>signature</b>: its letters sorted. Anagrams share the same signature, so they fall into the same map row.', parts: [{ type: 'array', label: 'words', values: ws.slice() }, { type: 'map', label: 'signature → group', entries: [] }] });
        ws.forEach(function (w, i) {
          var key = w.split('').sort().join(''), had = g.has(key);
          if (!had) g.set(key, []);
          g.get(key).push(w);
          frames.push({ narr: '"' + w + '" → sort letters → <b>"' + key + '"</b>. ' + (had ? '<span class="c-r">Signature already exists</span> (hit) → append "' + w + '" to that group.' : '<span class="c-g">New signature</span> → start a new group.'), parts: [{ type: 'array', label: 'words', values: ws.slice(), ptr: one(i, 'w'), hl: one(i, 'cur') }, { type: 'map', label: 'signature → group', entries: ents(g), hl: one(key, had ? 'bad' : 'ok') }] });
        });
        frames.push({ narr: 'Answer = the map\'s values: <b>' + g.size + '</b> group(s). Order of groups does not matter.', parts: [{ type: 'map', label: 'final groups', entries: ents(g) }] });
        return frames;
      }
    }],
    examples: [{
      title: 'Letters of "banana" with int[26]',
      html: `<p>Index = <code>c − 'a'</code>: a → 0, b → 1, n → 13.</p>
${H.table(['char', 'index', 'count after'], [['b', '1', 'b=1'], ['a', '0', 'a=1'], ['n', '13', 'n=1'], ['a', '0', 'a=2'], ['n', '13', 'n=2'], ['a', '0', H.c('g', 'a=3')]])}
<p>Result: a=3, b=1, n=2. An array of 26 ints is a "perfect hash": no collisions, no boxing, fits in one or two cache lines.</p>`,
      code: `int[] cnt = new int[26];
for (char c : "banana".toCharArray()) cnt[c - 'a']++;
System.out.println(cnt[0] + " " + cnt[1] + " " + cnt['n' - 'a']); // 3 1 2`
    }, {
      title: 'First unique character in a string (LeetCode 387)',
      html: `<p>s = "loveleetcode". Tally: l=2, o=2, v=1, e=4, t=1, c=1, d=1. Second pass over s: l(2) o(2) <b>v(1)</b> → return index <b>2</b>.</p>
<p>Same two-pass pattern; with only lowercase letters use <code>int[26]</code>.</p>`,
      code: `int firstUniqChar(String s) {
    int[] cnt = new int[26];
    for (int i = 0; i < s.length(); i++) cnt[s.charAt(i) - 'a']++;
    for (int i = 0; i < s.length(); i++) if (cnt[s.charAt(i) - 'a'] == 1) return i;
    return -1;
}`
    }, {
      title: 'Majority element (appears more than N/2 times)',
      html: `<p>arr = [2, 2, 1, 1, 1, 2, 2]. Tally: 2 → 4, 1 → 3. N/2 = 3.5, and 4 &gt; 3.5 → answer <b>2</b>. The frequency map solves it in O(N) time and O(N) space; the Boyer–Moore voting algorithm then improves space to O(1) — a classic interview follow-up.</p>`,
      code: `int majority(int[] a) {
    Map<Integer, Integer> cnt = new HashMap<>();
    for (int x : a) {
        if (cnt.merge(x, 1, Integer::sum) > a.length / 2) return x; // merge returns the new count
    }
    return -1; // problem guarantees a majority exists
}`
    }, {
      title: 'Two arrays equal as multisets?',
      html: `<p>A = [1, 2, 2, 3], B = [2, 3, 1, 2]. One map: +1 for A, −1 for B. All zero → <b>true</b>. Sorting both (O(N log N)) also works, but the map is O(N). This is exactly the anagram check with numbers instead of letters.</p>`
    }],
    deepDive: `<p><b>Order matters — pick the right second pass.</b> A plain <code>HashMap</code> iterates in bucket order, which looks random and can change after a resize. For "first non-repeating", iterate the <b>original array</b> in the second pass, or keep a <code>LinkedHashMap</code> (insertion order) and scan its entries. For a <b>stream</b> of characters ("first non-repeating so far" after every new char), keep counts plus a queue of candidates and pop from the front while the front's count &gt; 1 — amortized O(1) per character.</p>
<p><b>Signature choices for anagram grouping.</b> Sorting each word costs O(k log k) for a word of length k; a 26-count signature costs O(k + 26). For long words the count key wins; for short words sorting is simpler and fast. Build the count key with a separator (<code>"1#0#2#…"</code>) — without one, counts like [1, 11] and [11, 1] could print the same digits. An alternative is a <b>product of primes</b> (a=2, b=3, c=5, …) — elegant, but it overflows quickly for long words, so it is a trivia answer, not a production one.</p>
<p><b>Unicode.</b> <code>int[26]</code> only works for 'a'–'z'. Real text needs a <code>HashMap&lt;Integer,Integer&gt;</code> over <code>s.codePoints()</code> (a Java <code>char</code> is a UTF-16 unit; emoji take two). "é" may be one code point or "e" + a combining accent — normalize with <code>java.text.Normalizer</code> before counting if that matters.</p>
<p><b>Performance.</b> <code>merge(x, 1, Integer::sum)</code> does one lookup; <code>put(x, getOrDefault(x, 0) + 1)</code> does two. Both box ints (values above 127 allocate new Integer objects). For hot loops with int keys, a counting array or a primitive map is several times faster. <code>Collectors.groupingBy(..., counting())</code> produces <code>Long</code> values and has stream overhead — fine for clarity, not for 10<sup>7</sup> items.</p>
<p><b>Correctness edge cases.</b> Empty input; all elements repeating (return the sentinel the problem asks for); negative numbers (fine for a map, break array indexing); strings of different lengths (return false immediately for anagrams); case sensitivity ("Listen" vs "silent").</p>`,
    aiEra: `<p><b>What AI changes:</b> "count things then answer" is the first pattern an assistant reaches for, and it usually writes it well — <code>Counter</code> in Python or <code>groupingBy</code> in Java. Your value is knowing <i>which</i> key and value to store, and spotting when an <code>int[26]</code> or a sort would be simpler or faster.</p>
<p><b>Use AI as a partner:</b> <code>Give me 8 tricky test cases for first non-repeating character (Unicode, all repeating, single char, uppercase)</code>; <code>Rewrite this groupingBy solution with an int[26] signature and explain the complexity difference</code>; <code>Review my anagram code — does it handle different lengths early?</code></p>
<p><b>Where AI goes wrong:</b> it iterates a <code>HashMap</code> to find the "first" element (wrong order), builds count signatures without separators, uses <code>Collectors.counting()</code> and then compares <code>Long</code> with <code>==</code> (boxed comparison bug above 127), or assumes ASCII on Unicode input.</p>
<p><b>What you must still own:</b> choosing key/value for a new problem, the two-pass reasoning, and explaining O(N) time / O(distinct) space. In interviews, say out loud: "I'll tally first, then do an ordered second pass."</p>`,
    problems: [{
      title: 'First Non-Repeating Element',
      level: 'Easy', tags: ['hashmap', 'frequency', 'two pass'], companies: ['Amazon', 'Flipkart', 'Paytm', 'Goldman Sachs'],
      statement: `<p>Given an integer array <code>arr</code>, return the <b>first</b> element (in array order) that occurs <b>exactly once</b>. If every element repeats, return <b>0</b>.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>5</sup>, −10<sup>9</sup> ≤ arr[i] ≤ 10<sup>9</sup>`,
      example: `${H.arr([-1, 2, -1, 3, 2], { label: 'arr', hl: { 0: 'r', 1: 'r', 2: 'r', 3: 'g', 4: 'r' } })}
<p>Output: <b>${H.c('g', '3')}</b>. −1 appears twice and 2 appears twice (red); 3 appears once and is the first such value (green).</p>`,
      brute: {
        why: `<p>For each index i, scan the whole array to count arr[i]; return the first with count 1. That is N scans of N elements = <b>O(N<sup>2</sup>)</b> = 10<sup>10</sup> steps for N = 10<sup>5</sup>. The waste: we re-count the same value every time it appears.</p>`,
        code: `int firstNonRepeatingBrute(int[] arr) {
    for (int i = 0; i < arr.length; i++) {
        int count = 0;
        for (int j = 0; j < arr.length; j++) {
            if (arr[j] == arr[i]) count++;
        }
        if (count == 1) return arr[i];   // first one in array order
    }
    return 0;
}`
      },
      mcq: {
        q: 'After building the count map, why must the second pass loop over the <b>array</b> rather than over the HashMap?',
        options: ['A HashMap does not keep insertion order, so its "first" entry may not be the earliest in the array', 'Looping over a HashMap is O(N<sup>2</sup>)', 'The HashMap might have lost some counts', 'Java does not allow iterating a HashMap'],
        answer: 0,
        explain: 'HashMap iterates in bucket order. The question asks for the first in ARRAY order, so walk the array (or use a LinkedHashMap).'
      },
      hints: [
        `<p><b>Hint 1:</b> The only thing you need to know about a value is "how many times does it appear in the whole array?" Can you compute that once for all values instead of again and again?</p>`,
        `<p><b>Hint 2:</b> Build a <code>HashMap&lt;Integer,Integer&gt;</code> tally in one pass with <code>merge(x, 1, Integer::sum)</code>. Values go up to 10<sup>9</sup> (and can be negative), so an array tally will not work.</p>`,
        `<p><b>Hint 3 (recipe):</b> pass 1: count everything. Pass 2: for x in arr (in order) if count[x] == 1 return x. After the loop return 0. Edge cases: single element → that element; everything repeated → 0.</p>`
      ],
      solution: {
        approach: `<p><b>Two passes with a tally sheet.</b> Pass 1 records how often each value appears. Pass 2 walks the array in its original order and returns the first value whose tally is 1. Each pass is O(N) and each map operation is O(1) on average.</p>`,
        code: `class Solution {
    public int firstNonRepeating(int[] arr) {
        // Pass 1: tally sheet value -> how many times it appears
        Map<Integer, Integer> count = new HashMap<>();
        for (int x : arr) count.merge(x, 1, Integer::sum);

        // Pass 2: walk in ORIGINAL order; the first count of 1 wins
        for (int x : arr) {
            if (count.get(x) == 1) return x;
        }
        return 0; // every element repeats
    }
}`,
        alt: [{
          lang: 'python', code: `from collections import Counter

def first_non_repeating(arr):
    count = Counter(arr)            # pass 1: tally
    for x in arr:                   # pass 2: original order
        if count[x] == 1:
            return x
    return 0`
        }, {
          lang: 'cpp', code: `int firstNonRepeating(vector<int>& arr) {
    unordered_map<int, int> cnt;
    for (int x : arr) cnt[x]++;          // pass 1
    for (int x : arr) if (cnt[x] == 1) return x;   // pass 2
    return 0;
}`
        }],
        dry: {
          head: ['pass', 'i', 'arr[i]', 'tally / lookup', 'action'],
          rows: [
            ['1', '0', '-1', H.c('g', '{-1:1}'), 'new value'],
            ['1', '1', '2', H.c('g', '{-1:1, 2:1}'), 'new value'],
            ['1', '2', '-1', H.c('r', '{-1:2, 2:1}'), 'repeat → count 2'],
            ['1', '3', '3', H.c('g', '{-1:2, 2:1, 3:1}'), 'new value'],
            ['1', '4', '2', H.c('r', '{-1:2, 2:2, 3:1}'), 'repeat → count 2'],
            ['2', '0', '-1', 'count = 2', 'skip'],
            ['2', '1', '2', 'count = 2', 'skip'],
            ['2', '2', '-1', 'count = 2', 'skip'],
            ['2', '3', '3', 'count = 1', H.c('g', 'return 3')]
          ]
        },
        complexity: `<p><b>Time:</b> O(N) — two linear passes with O(1) average map operations. <b>Space:</b> O(D) where D = number of distinct values (≤ N).</p>`,
        followUps: [
          'Return the first non-repeating <b>character</b> of a string (use int[26] or int[128]).',
          'Do it in ONE pass using a <code>LinkedHashMap</code>: after counting, scan entries in insertion order.',
          'Stream version: after each new character, print the first non-repeating character so far (queue + counts).',
          'Return the first element that repeats (first index whose count &gt; 1).'
        ]
      }
    }, {
      title: 'Valid Anagram',
      level: 'Easy', tags: ['frequency', 'int[26]', 'strings'], companies: ['Amazon', 'Bloomberg', 'Uber', 'Microsoft'],
      statement: `<p>Given two strings <code>s</code> and <code>t</code>, return <b>true</b> if <code>t</code> is an anagram of <code>s</code> — that is, it uses exactly the same letters the same number of times, just rearranged.</p>`,
      constraints: `1 ≤ s.length, t.length ≤ 5·10<sup>4</sup>; s and t consist of lowercase English letters.`,
      example: `<p>s = "anagram", t = "nagaram" → ${H.c('g', 'true')} (a×3, n, g, r, m in both).</p>
<p>s = "rat", t = "car" → ${H.c('r', 'false')} (s has a 't', t has a 'c').</p>`,
      brute: {
        why: `<p>For each letter of s, search t for an unused copy and mark it used. Each search is O(N), so the total is <b>O(N<sup>2</sup>)</b> — 2.5·10<sup>9</sup> steps at the limit. (Sorting both strings and comparing is a decent O(N log N) middle ground.)</p>`,
        code: `boolean isAnagramBrute(String s, String t) {
    if (s.length() != t.length()) return false;
    boolean[] used = new boolean[t.length()];
    for (int i = 0; i < s.length(); i++) {
        boolean found = false;
        for (int j = 0; j < t.length(); j++) {
            if (!used[j] && t.charAt(j) == s.charAt(i)) { used[j] = true; found = true; break; }
        }
        if (!found) return false;     // s has a letter t cannot match
    }
    return true;
}`
      },
      mcq: {
        q: 'You use one int[26] array: +1 for each letter of s and −1 for each letter of t (same length). When is it an anagram?',
        options: ['When every one of the 26 counts is 0', 'When the sum of all counts is 0', 'When at least one count is 0', 'When no count is negative at any moment'],
        answer: 0,
        explain: 'The SUM is always 0 when lengths are equal, so it proves nothing. Every individual letter must balance to 0.'
      },
      hints: [
        `<p><b>Hint 1:</b> Order of letters does not matter at all — only how many of each letter. So compare <b>counts</b>, not positions.</p>`,
        `<p><b>Hint 2:</b> Only lowercase letters → a single <code>int[26]</code> is enough. Add for s, subtract for t.</p>`,
        `<p><b>Hint 3 (recipe):</b> if lengths differ return false. For i in 0..n−1: cnt[s[i]−'a']++, cnt[t[i]−'a']−−. Finally return true only if all 26 counts are 0. Unicode follow-up → use a HashMap over code points.</p>`
      ],
      solution: {
        approach: `<p><b>One counting array, +1 / −1.</b> Different lengths → instantly false. Otherwise walk both strings together, incrementing for s and decrementing for t. Any letter that is not perfectly balanced leaves a non-zero count.</p>`,
        code: `class Solution {
    public boolean isAnagram(String s, String t) {
        if (s.length() != t.length()) return false;   // quick reject
        int[] cnt = new int[26];                      // perfect hash: 'a'->0 ... 'z'->25
        for (int i = 0; i < s.length(); i++) {
            cnt[s.charAt(i) - 'a']++;                 // s adds
            cnt[t.charAt(i) - 'a']--;                 // t removes
        }
        for (int c : cnt) if (c != 0) return false;   // some letter unbalanced
        return true;
    }
}`,
        alt: [{
          lang: 'python', code: `from collections import Counter

def is_anagram(s: str, t: str) -> bool:
    return len(s) == len(t) and Counter(s) == Counter(t)`
        }, {
          lang: 'java', title: 'Unicode-safe (any characters)', code: `boolean isAnagramUnicode(String s, String t) {
    Map<Integer, Integer> cnt = new HashMap<>();
    s.codePoints().forEach(cp -> cnt.merge(cp, 1, Integer::sum));
    for (int cp : t.codePoints().toArray()) {
        Integer left = cnt.merge(cp, -1, Integer::sum);
        if (left < 0) return false;                  // t uses a char more often than s
        if (left == 0) cnt.remove(cp);
    }
    return cnt.isEmpty();
}`
        }],
        dry: {
          head: ['i', 's[i] (+1)', 't[i] (−1)', 'non-zero counts after step'],
          rows: [
            ['0', 'a', 'n', '{a:1, n:−1}'],
            ['1', 'n', 'a', H.c('g', '{} (both back to 0)')],
            ['2', 'a', 'g', '{a:1, g:−1}'],
            ['3', 'g', 'a', H.c('g', '{}')],
            ['4', 'r', 'r', '{} (r: +1 −1)'],
            ['5', 'a', 'a', '{}'],
            ['6', 'm', 'm', '{}'],
            ['end', '—', '—', H.c('g', 'all 26 counts are 0 → true')]
          ]
        },
        complexity: `<p><b>Time:</b> O(N + 26) = O(N). <b>Space:</b> O(1) — the array is always 26 ints, regardless of N (O(D) for the Unicode map).</p>`,
        followUps: [
          'Find All Anagrams in a String (LeetCode 438): slide a window of length |p| and compare counts.',
          'Minimum number of character changes to make t an anagram of s (sum of positive differences).',
          'Check whether two strings are anagrams after ignoring spaces and case.'
        ]
      }
    }, {
      title: 'Group Anagrams',
      level: 'Medium', tags: ['hashmap', 'signature key', 'strings'], companies: ['Amazon', 'Meta', 'Google', 'Microsoft', 'Uber'],
      statement: `<p>Given an array of strings <code>strs</code>, group the anagrams together. Return the groups in any order (words inside a group in any order).</p>`,
      constraints: `1 ≤ strs.length ≤ 10<sup>4</sup>, 0 ≤ strs[i].length ≤ 100, lowercase English letters.`,
      example: `<p>strs = ["eat","tea","tan","ate","nat","bat"]</p>
<p>Output: ${H.c('g', '[["eat","tea","ate"], ["tan","nat"], ["bat"]]')}</p>
<p><b>Why:</b> "eat", "tea", "ate" all sort to <b>"aet"</b>; "tan", "nat" sort to <b>"ant"</b>; "bat" alone sorts to <b>"abt"</b>.</p>`,
      brute: {
        why: `<p>For each word not yet grouped, compare it with every later word using an anagram check, and pull matches into its group. That is O(N<sup>2</sup>) pairs × O(K) per check = <b>O(N<sup>2</sup>·K)</b> ≈ 10<sup>10</sup> for N = 10<sup>4</sup>, K = 100. The waste: we keep re-comparing words that could be labelled once.</p>`,
        code: `List<List<String>> groupAnagramsBrute(String[] strs) {
    List<List<String>> res = new ArrayList<>();
    boolean[] used = new boolean[strs.length];
    for (int i = 0; i < strs.length; i++) {
        if (used[i]) continue;
        List<String> group = new ArrayList<>(List.of(strs[i]));
        used[i] = true;
        for (int j = i + 1; j < strs.length; j++) {
            if (!used[j] && sameLetters(strs[i], strs[j])) { group.add(strs[j]); used[j] = true; }
        }
        res.add(group);
    }
    return res;
}

boolean sameLetters(String a, String b) {
    if (a.length() != b.length()) return false;
    int[] cnt = new int[26];
    for (int k = 0; k < a.length(); k++) { cnt[a.charAt(k) - 'a']++; cnt[b.charAt(k) - 'a']--; }
    for (int c : cnt) if (c != 0) return false;
    return true;
}`
      },
      mcq: {
        q: 'Which key correctly puts all anagrams of a word into the same HashMap bucket?',
        options: ['The word with its letters sorted, e.g. "tea" → "aet"', 'The word\'s length', 'The sum of the letter codes', 'The first and last letter'],
        answer: 0,
        explain: 'Length and letter sums collide for non-anagrams ("ad" and "bc" have the same sum). The sorted string (or a full 26-count signature) is identical exactly for anagrams.'
      },
      hints: [
        `<p><b>Hint 1:</b> Give every word a label that is the <b>same for all its anagrams</b> and different otherwise. Then grouping is just "put words with the same label together".</p>`,
        `<p><b>Hint 2:</b> Label = letters sorted, or the 26 counts joined with "#". Use <code>HashMap&lt;String, List&lt;String&gt;&gt;</code> with <code>computeIfAbsent(key, k -&gt; new ArrayList&lt;&gt;())</code>.</p>`,
        `<p><b>Hint 3 (recipe):</b> for each word: key = sort(word); map[key].add(word). Return new ArrayList&lt;&gt;(map.values()). Edge cases: empty string "" (key ""), single word, all words identical.</p>`
      ],
      solution: {
        approach: `<p><b>Signature → bucket.</b> Each word's sorted letters form a canonical signature. A HashMap from signature to list collects the groups in one pass. Sorting a word of length K costs O(K log K); the counting signature brings that to O(K).</p>`,
        code: `class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        Map<String, List<String>> groups = new HashMap<>();
        for (String w : strs) {
            char[] letters = w.toCharArray();
            Arrays.sort(letters);                      // "tea" -> "aet"
            String key = new String(letters);
            groups.computeIfAbsent(key, k -> new ArrayList<>()).add(w);
        }
        return new ArrayList<>(groups.values());
    }
}`,
        alt: [{
          lang: 'java', title: 'O(K) counting signature', code: `class Solution2 {
    public List<List<String>> groupAnagrams(String[] strs) {
        Map<String, List<String>> groups = new HashMap<>();
        for (String w : strs) {
            int[] cnt = new int[26];
            for (int i = 0; i < w.length(); i++) cnt[w.charAt(i) - 'a']++;
            StringBuilder sb = new StringBuilder();
            for (int c : cnt) sb.append(c).append('#');   // '#' separator avoids ambiguity
            groups.computeIfAbsent(sb.toString(), k -> new ArrayList<>()).add(w);
        }
        return new ArrayList<>(groups.values());
    }
}`
        }, {
          lang: 'python', code: `from collections import defaultdict

def group_anagrams(strs):
    groups = defaultdict(list)
    for w in strs:
        groups["".join(sorted(w))].append(w)
    return list(groups.values())`
        }],
        dry: {
          head: ['word', 'signature', 'map action', 'map after'],
          rows: [
            ['eat', 'aet', H.c('g', 'new key'), 'aet:[eat]'],
            ['tea', 'aet', H.c('r', 'hit → append'), 'aet:[eat,tea]'],
            ['tan', 'ant', H.c('g', 'new key'), 'aet:[eat,tea], ant:[tan]'],
            ['ate', 'aet', H.c('r', 'hit → append'), 'aet:[eat,tea,ate], ant:[tan]'],
            ['nat', 'ant', H.c('r', 'hit → append'), 'aet:[…3], ant:[tan,nat]'],
            ['bat', 'abt', H.c('g', 'new key'), 'aet:[…3], ant:[…2], abt:[bat]']
          ]
        },
        complexity: `<p><b>Time:</b> O(N · K log K) with sorting, O(N · K) with the count signature (N words, max length K). <b>Space:</b> O(N · K) for keys and groups.</p>`,
        followUps: [
          'Group strings that are <b>shifts</b> of each other ("abc", "bcd", "xyz"): key = differences between consecutive letters mod 26.',
          'Return only the largest group.',
          'Words are huge (K = 10<sup>5</sup>) but few: which signature do you choose and why?'
        ]
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — Lookup set / map: 2-Sum on an unsorted array
     ===================================================================== */
  topics.push({
    title: 'Lookup Set & Complement Map: 2-Sum on an Unsorted Array',
    analogy: `<p>The <b>VIP guest list at a club door</b>. The bouncer does not walk around the club asking "is anyone here called Riya?" — he checks the list in his hand, instantly. Now a twist: a dance contest needs <b>pairs whose ages add up to 40</b>. As each guest arrives (age 25), the bouncer asks one question: "is a <b>15</b>-year-old … sorry, a guest of age <b>40 − 25 = 15</b> already inside?" If yes — pair found. If not, he writes this guest on the list and waits for the next one.</p>
<p>That "the partner I need" number is the <b>complement</b>. The list is a <b>HashSet</b> (or a HashMap if you also need to remember <i>where</i> the partner is standing).</p>`,
    explain: `<p><b>The lookup pattern:</b> whenever your brute force has an inner loop that only <i>searches</i> for something ("is there a j with …?"), replace that loop with a HashSet/HashMap lookup. The inner O(N) becomes O(1), so O(N<sup>2</sup>) becomes O(N).</p>

<h4>2-Sum: the classic</h4>
<p>Find two different indices i, j with <code>nums[i] + nums[j] == target</code>. Rewrite the condition: <code>nums[j] == target − nums[i]</code>. So for every number, we know <b>exactly</b> which partner we need — we just have to ask "have I seen it?"</p>
${H.arr([11, 2, 15, 7], { label: 'nums (target 9)', hl: { 1: 'g', 3: 'g' } })}
${H.table(['i', 'x', 'need = 9 − x', 'seen so far (value → index)', 'result'], [['0', '11', '−2', '{}', 'miss, store 11→0'], ['1', '2', '7', '{11:0}', 'miss, store 2→1'], ['2', '15', '−6', '{11:0, 2:1}', 'miss, store 15→2'], ['3', '7', '2', '{11:0, 2:1, 15:2}', H.c('g', 'HIT → [1, 3]')]])}

<h4>Why "check first, then insert"?</h4>
<p>If you inserted <code>x</code> before checking, then for target 10 and x = 5 you would "find" 5 in the map — using the same element twice. Checking first means the map only contains elements from <b>earlier indices</b>, so i and j are always different. It also handles real duplicates: <code>[3, 3]</code>, target 6 → at index 1, the 3 from index 0 is already in the map → answer [0, 1].</p>

<h4>Set or map?</h4>
${H.table(['question asks for…', 'store', 'example'], [['yes / no — does a pair exist?', 'HashSet of values', 'pair with sum K exists?'], ['the indices', 'HashMap value → index', 'LeetCode 1 Two Sum'], ['how many pairs', 'HashMap value → count', 'count pairs with sum K'], ['duplicates / "seen before"', 'HashSet', 'Contains Duplicate']])}

<h4>The same trick in other shapes</h4>
<ul>
<li><b>Pair with difference K:</b> for x, look for <code>x − K</code> and <code>x + K</code>.</li>
<li><b>Contains duplicate:</b> <code>if (!set.add(x)) return true;</code> — <code>add</code> returns false when x was already there.</li>
<li><b>Contains duplicate within distance k:</b> map value → last index; check <code>i − last ≤ k</code>.</li>
<li><b>Count pairs:</b> before adding x, add <code>count[target − x]</code> to the answer.</li>
</ul>`,
    clues: [
      '"two numbers that add up to target" + array is <b>unsorted</b> / "return indices" → complement HashMap',
      '"does there exist a pair / element such that …" → HashSet lookup replaces the inner loop',
      '"contains duplicate", "seen before", "visited" → HashSet.add() returns false on repeat',
      '"count pairs with sum / difference K" → HashMap value → count, add before insert',
      'N ≤ 10<sup>5</sup> and the naive solution is a double loop → O(N) with a set',
      '"you may not use the same element twice" → check BEFORE inserting the current element',
      'Sorting would destroy the original indices you must return → hashing instead of two pointers'
    ],
    code: [`
import java.util.*;

public class LookupPatterns {
    // 2-Sum returning indices: value -> index of where we saw it
    static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int need = target - nums[i];
            Integer j = seen.get(need);
            if (j != null) return new int[]{j, i};   // partner seen earlier
            seen.put(nums[i], i);                    // insert AFTER checking
        }
        return new int[0];
    }

    // Contains Duplicate: add() returns false if the value was already present
    static boolean containsDuplicate(int[] nums) {
        Set<Integer> seen = new HashSet<>();
        for (int x : nums) if (!seen.add(x)) return true;
        return false;
    }

    // Count pairs (i < j) with nums[i] + nums[j] == k, duplicates allowed
    static long countPairs(int[] nums, int k) {
        Map<Integer, Integer> freq = new HashMap<>();
        long pairs = 0;
        for (int x : nums) {
            pairs += freq.getOrDefault(k - x, 0);    // every earlier partner makes a pair
            freq.merge(x, 1, Integer::sum);
        }
        return pairs;
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(twoSum(new int[]{11, 2, 15, 7}, 9))); // [1, 3]
        System.out.println(containsDuplicate(new int[]{1, 2, 3, 1}));            // true
        System.out.println(countPairs(new int[]{1, 5, 7, 1, 5}, 6));             // 4
    }
}`, {
      lang: 'python', run: true, title: 'Python (runnable)',
      code: `def two_sum(nums, target):
    seen = {}                       # value -> index
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
    return []

def count_pairs(nums, k):
    freq, pairs = {}, 0
    for x in nums:
        pairs += freq.get(k - x, 0)
        freq[x] = freq.get(x, 0) + 1
    return pairs

print(two_sum([11, 2, 15, 7], 9))      # [1, 3]
print(two_sum([3, 3], 6))              # [0, 1]
print(count_pairs([1, 5, 7, 1, 5], 6)) # 4`
    }],
    codeTitle: ['Lookup patterns in Java', 'Python version (runnable)'],
    viz: [{
      title: '2-Sum with a HashMap (value → index), check before insert',
      input: '11 2 15 7 | 9',
      inputLabel: 'nums | target  (at most 14 numbers)',
      gen: function (input) {
        var p = splitBar(input, 2, '11 2 15 7 | 9'), a = parseNums(p[0], 14, 'array', 2), t = parseInt1(p[1], 'target', -20000, 20000), m = new Map(), frames = [];
        frames.push({ narr: 'Target = <b>' + t + '</b>. For each x we compute the partner we need (<b>target − x</b>) and ask the map whether that partner already walked in.', parts: [{ type: 'array', label: 'nums', values: a.slice() }, { type: 'map', label: 'seen: value → index', entries: [] }] });
        for (var i = 0; i < a.length; i++) {
          var need = t - a[i];
          if (m.has(need)) {
            var hl = {}; hl[m.get(need)] = 'sel'; hl[i] = 'sel';
            frames.push({ narr: 'i = ' + i + ', x = ' + a[i] + ', need ' + t + ' − ' + a[i] + ' = <b>' + need + '</b>. It is in the map at index ' + m.get(need) + ' → <span class="c-r">hit!</span> Answer <b>[' + m.get(need) + ', ' + i + ']</b> because ' + need + ' + ' + a[i] + ' = ' + t + '.', parts: [{ type: 'array', label: 'nums', values: a.slice(), hl: hl, ptr: one(i, 'i') }, { type: 'vars', vals: { x: a[i], need: need }, hl: { need: 'bad' } }, { type: 'map', label: 'seen: value → index', entries: ents(m), hl: one(need, 'bad') }] });
            frames.push({ narr: 'Done in one pass. Each step was one O(1) lookup + one O(1) insert → O(N) overall.', parts: [{ type: 'array', label: 'nums', values: a.slice(), hl: hl }, { type: 'vars', vals: { answer: '[' + m.get(need) + ', ' + i + ']' }, hl: { answer: 'sel' } }] });
            return frames;
          }
          frames.push({ narr: 'i = ' + i + ', x = ' + a[i] + ', need <b>' + need + '</b> → not in the map (miss). Nobody earlier can pair with ' + a[i] + '.', parts: [{ type: 'array', label: 'nums', values: a.slice(), ptr: one(i, 'i'), hl: one(i, 'cur') }, { type: 'vars', vals: { x: a[i], need: need }, hl: { need: 'cur' } }, { type: 'map', label: 'seen: value → index', entries: ents(m) }] });
          var dup = m.has(a[i]);
          m.set(a[i], i);
          frames.push({ narr: dup ? 'Store ' + a[i] + ' → ' + i + ' (it was already there, so we <span class="c-r">overwrite</span> with the newer index — fine for 2-Sum).' : '<span class="c-g">Insert</span> ' + a[i] + ' → ' + i + ' so later numbers can find it as their partner.', parts: [{ type: 'array', label: 'nums', values: a.slice(), ptr: one(i, 'i'), hl: one(i, 'done') }, { type: 'map', label: 'seen: value → index', entries: ents(m), hl: one(a[i], dup ? 'bad' : 'ok') }] });
        }
        frames.push({ narr: 'No pair adds up to ' + t + ' → return an empty array.', parts: [{ type: 'array', label: 'nums', values: a.slice() }, { type: 'map', label: 'seen', entries: ents(m) }] });
        return frames;
      }
    }, {
      title: 'Contains Duplicate: the VIP list says "already inside!"',
      input: '4 1 7 3 1 9',
      inputLabel: 'Array (at most 14 numbers)',
      gen: function (input) {
        var a = parseNums(input, 14, 'array'), s = [], frames = [];
        frames.push({ narr: 'Walk the array. <code>set.add(x)</code> returns <b>true</b> for a new guest and <b>false</b> if x is already on the list.', parts: [{ type: 'array', label: 'arr', values: a.slice() }, { type: 'set', label: 'VIP list (HashSet)', items: [] }] });
        for (var i = 0; i < a.length; i++) {
          if (s.indexOf(a[i]) >= 0) {
            frames.push({ narr: 'i = ' + i + ': <b>' + a[i] + '</b> is already on the list → add() returns false → <span class="c-r">duplicate found</span>, return true.', parts: [{ type: 'array', label: 'arr', values: a.slice(), ptr: one(i, 'i'), hl: one(i, 'bad') }, { type: 'set', label: 'VIP list (HashSet)', items: s.slice(), hl: one(a[i], 'bad') }] });
            frames.push({ narr: 'We stopped early — no need to look at the rest. Worst case (all distinct) is still one pass: O(N) time, O(N) space.', parts: [{ type: 'vars', vals: { answer: true, 'checked elements': i + 1 }, hl: { answer: 'sel' } }] });
            return frames;
          }
          s.push(a[i]);
          frames.push({ narr: 'i = ' + i + ': ' + a[i] + ' is new → <span class="c-g">added</span>.', parts: [{ type: 'array', label: 'arr', values: a.slice(), ptr: one(i, 'i'), hl: one(i, 'ok') }, { type: 'set', label: 'VIP list (HashSet)', items: s.slice(), hl: one(a[i], 'ok') }] });
        }
        frames.push({ narr: 'Reached the end with no repeat → return <b>false</b>.', parts: [{ type: 'set', label: 'VIP list', items: s.slice() }, { type: 'vars', vals: { answer: false }, hl: { answer: 'sel' } }] });
        return frames;
      }
    }, {
      title: 'Count pairs with sum K (duplicates allowed): value → count',
      input: '1 5 7 1 5 | 6',
      inputLabel: 'nums | K  (at most 14 numbers)',
      gen: function (input) {
        var p = splitBar(input, 2, '1 5 7 1 5 | 6'), a = parseNums(p[0], 14, 'array', 2), k = parseInt1(p[1], 'K', -20000, 20000), f = new Map(), pairs = 0, frames = [];
        frames.push({ narr: 'For each x, every earlier copy of <b>K − x</b> forms a new pair with it. So we add <b>freq[K − x]</b> to the answer, then record x.', parts: [{ type: 'array', label: 'nums', values: a.slice() }, { type: 'map', label: 'freq: value → count', entries: [] }, { type: 'vars', vals: { pairs: 0 } }] });
        for (var i = 0; i < a.length; i++) {
          var need = k - a[i], c = f.get(need) || 0;
          pairs += c;
          frames.push({ narr: 'x = ' + a[i] + ', need ' + need + ': ' + (c ? '<span class="c-r">seen ' + c + ' time(s)</span> → ' + c + ' new pair(s).' : 'not seen → 0 new pairs.') + ' Total = <b>' + pairs + '</b>.', parts: [{ type: 'array', label: 'nums', values: a.slice(), ptr: one(i, 'i'), hl: one(i, 'cur') }, { type: 'map', label: 'freq: value → count', entries: ents(f), hl: c ? one(need, 'bad') : {} }, { type: 'vars', vals: { need: need, 'new pairs': c, pairs: pairs }, hl: { pairs: c ? 'ok' : '' } }] });
          var had = f.has(a[i]);
          f.set(a[i], (f.get(a[i]) || 0) + 1);
          frames.push({ narr: (had ? 'Bump' : '<span class="c-g">Insert</span>') + ' ' + a[i] + ' → count ' + f.get(a[i]) + '.', parts: [{ type: 'array', label: 'nums', values: a.slice(), ptr: one(i, 'i') }, { type: 'map', label: 'freq: value → count', entries: ents(f), hl: one(a[i], had ? 'cur' : 'ok') }, { type: 'vars', vals: { pairs: pairs } }] });
        }
        frames.push({ narr: 'Total pairs (i &lt; j) with sum ' + k + ' = <b>' + pairs + '</b>.', parts: [{ type: 'vars', vals: { answer: pairs }, hl: { answer: 'sel' } }] });
        return frames;
      }
    }],
    examples: [{
      title: 'Duplicates inside 2-Sum: [3, 3], target 6',
      html: `<p>i = 0: need 3, map empty → miss, store 3→0. i = 1: need 3 → <b>found at 0</b> → [0, 1]. Because we check before inserting, the element never pairs with itself, and the two real 3s are correctly paired.</p>
<p>Compare [3, 2, 4], target 6: at i = 0, need 3 — if we had inserted 3 first, we would wrongly answer [0, 0]. Correct answer: [1, 2].</p>`
    }, {
      title: 'Count pairs with sum 6 in [1, 5, 7, 1, 5]',
      html: `${H.table(['x', 'need', 'freq[need] before', 'pairs total', 'freq after'], [['1', '5', '0', '0', '{1:1}'], ['5', '1', H.c('r', '1'), '1', '{1:1, 5:1}'], ['7', '−1', '0', '1', '{1:1, 5:1, 7:1}'], ['1', '5', H.c('r', '1'), '2', '{1:2, 5:1, 7:1}'], ['5', '1', H.c('r', '2'), H.c('g', '4'), '{1:2, 5:2, 7:1}']])}
<p>Pairs: (0,1), (1,3), (0,4), (3,4) → <b>4</b>. Use <code>long</code> for the total: N = 10<sup>5</sup> equal values give ~5·10<sup>9</sup> pairs, which overflows int.</p>`
    }, {
      title: 'Pair with difference K',
      html: `<p>arr = [5, 20, 3, 2, 50, 80], K = 78. For each x, ask whether <b>x − 78</b> or <b>x + 78</b> was seen. At x = 80: 80 − 78 = 2 is in the set → pair (2, 80). Careful with K = 0: you then need the same value <b>twice</b>, so use a count map instead of a set.</p>`,
      code: `boolean pairWithDiff(int[] a, int k) {
    Set<Integer> seen = new HashSet<>();
    for (int x : a) {
        if (seen.contains(x - k) || seen.contains(x + k)) return true;
        seen.add(x);
    }
    return false;
}`
    }, {
      title: 'Sorted input? Then two pointers beat hashing on memory',
      html: `<p>If the array is already <b>sorted</b> (LeetCode 167), use two pointers L and R: sum too small → L++, too big → R−−. O(N) time, <b>O(1)</b> extra space. If it is unsorted and you must return original indices, sorting would scramble them (or cost O(N log N) plus index bookkeeping) — that is when the HashMap wins.</p>
${H.table(['input', 'best approach', 'time', 'space'], [['unsorted, return indices', 'HashMap complement', 'O(N)', 'O(N)'], ['sorted', 'two pointers', 'O(N)', 'O(1)'], ['unsorted, only yes/no, memory tight', 'sort + two pointers', 'O(N log N)', 'O(1)–O(log N)']])}`
    }],
    deepDive: `<p><b>Why it is correct.</b> Invariant: before processing index i, the map contains exactly the values at indices 0..i−1. If a valid pair (j, i) with j &lt; i exists, then when we reach i, <code>nums[j] = target − nums[i]</code> is already in the map, so we find it. We never miss a pair because every pair is discovered when its <i>later</i> element is processed.</p>
<p><b>Overwriting duplicates.</b> <code>seen.put(x, i)</code> overwrites older indices of the same value. For "return any pair" that is fine. If the problem wants the pair with the <b>smallest</b> j, use <code>putIfAbsent</code> to keep the first index.</p>
<p><b>Overflow.</b> <code>target − nums[i]</code> is safe for values up to 10<sup>9</sup> (|result| ≤ 2·10<sup>9</sup> &lt; 2<sup>31</sup> ≈ 2.147·10<sup>9</sup>), but with full-range ints it can overflow; use <code>long</code> when constraints allow ±2<sup>31</sup>.</p>
<p><b>Design variant (LeetCode 170, Two Sum III):</b> <code>add(x)</code> and <code>find(target)</code>. Option A: store counts, <code>add</code> O(1), <code>find</code> O(D). Option B: store all pairwise sums, <code>add</code> O(D), <code>find</code> O(1). Choose based on which operation is more frequent — a real-world read/write trade-off.</p>
<p><b>k-Sum.</b> 3-Sum with hashing is O(N<sup>2</sup>) (fix one element, run 2-Sum with a set), but sort + two pointers is also O(N<sup>2</sup>) and handles duplicate-triplet removal more cleanly, which is why it is preferred. 4-Sum II (four separate arrays) is the cleanest hashing win: store all A+B sums in a map, then look up −(C+D): O(N<sup>2</sup>) instead of O(N<sup>4</sup>).</p>
<p><b>Production echo.</b> A database <b>hash join</b> is 2-Sum at scale: build a hash table on the smaller table's join key, then probe it with each row of the larger table. When the "seen" set is too big for memory, systems use a <b>Bloom filter</b> (tiny bit array, no false negatives, a few false positives) as a pre-check.</p>`,
    aiEra: `<p><b>What AI changes:</b> Two Sum is the most-memorized problem on the internet; any assistant produces the HashMap answer instantly. Interviewers know this, so they probe the <b>variations</b>: duplicates, counting pairs, smallest index, sorted input, design-style add/find, overflow.</p>
<p><b>Use AI as a partner:</b> <code>List 6 variants of Two Sum and the one-line change each needs</code>; <code>Write a brute-force checker and a random test generator for my countPairs function</code> — then diff your answer against the brute force for 1,000 random arrays. That habit catches the "insert before check" bug instantly.</p>
<p><b>Where AI goes wrong:</b> inserting before checking (pairs an element with itself), using a HashSet when indices are required, counting pairs with an int that overflows, or sorting the array and then returning indices of the sorted copy.</p>
<p><b>What you must still own:</b> recognising that "search inside the inner loop" means "use a set", explaining the invariant (map holds only earlier elements), and picking two pointers when memory matters and the input is sorted.</p>`,
    problems: [{
      title: 'Two Sum (unsorted array, return indices)',
      level: 'Easy', tags: ['hashmap', 'complement', 'lookup'], companies: ['Amazon', 'Google', 'Meta', 'Microsoft', 'Apple', 'Adobe'],
      statement: `<p>Given an integer array <code>nums</code> and an integer <code>target</code>, return the indices of the two numbers that add up to <code>target</code>. Exactly one valid answer exists, and you may not use the same element twice. Return the indices in any order.</p>`,
      constraints: `2 ≤ N ≤ 10<sup>4</sup>, −10<sup>9</sup> ≤ nums[i], target ≤ 10<sup>9</sup>. Follow-up: better than O(N<sup>2</sup>).`,
      example: `${H.arr([11, 2, 15, 7], { label: 'nums', hl: { 1: 'g', 3: 'g' } })}<p>target = 9 → output ${H.c('g', '[1, 3]')} because nums[1] + nums[3] = 2 + 7 = 9.</p>`,
      brute: {
        why: `<p>Try every pair (i, j) with i &lt; j: N(N−1)/2 ≈ 5·10<sup>7</sup> checks for N = 10<sup>4</sup>. It passes here but is <b>O(N<sup>2</sup>)</b>. The wasted work: for each i, the inner loop <i>searches</i> for one specific value (target − nums[i]) by scanning — a perfect job for a hash lookup.</p>`,
        code: `int[] twoSumBrute(int[] nums, int target) {
    for (int i = 0; i < nums.length; i++) {
        for (int j = i + 1; j < nums.length; j++) {
            if (nums[i] + nums[j] == target) return new int[]{i, j};
        }
    }
    return new int[0];
}`
      },
      mcq: {
        q: 'nums = [3, 2, 4], target = 6. You insert nums[i] into the map BEFORE checking for its complement. What goes wrong?',
        options: ['At i = 0 you find 3 (itself) and return [0, 0]', 'Nothing — the order of insert and check never matters', 'You miss the answer [1, 2]', 'It throws a NullPointerException'],
        answer: 0,
        explain: '6 − 3 = 3 is found immediately because you just inserted it. Checking first guarantees the map only holds EARLIER indices, so the answer is [1, 2].'
      },
      hints: [
        `<p><b>Hint 1:</b> For a fixed nums[i], the partner is not a mystery — it must be exactly <code>target − nums[i]</code>. The only question is "have I already seen that value, and where?"</p>`,
        `<p><b>Hint 2:</b> Keep a <code>HashMap&lt;Integer,Integer&gt;</code> from value → index of everything to the left of i. One lookup per element.</p>`,
        `<p><b>Hint 3 (recipe):</b> for i in 0..N−1: need = target − nums[i]; if map has need → return [map[need], i]; else map[nums[i]] = i. Check BEFORE inserting so you never use the same element twice; duplicates like [3,3] work naturally.</p>`
      ],
      solution: {
        approach: `<p><b>One pass, complement lookup.</b> The map remembers every value seen so far and its index. For each new element we ask for the complement in O(1); the first hit is the answer. This turns the O(N) inner search of the brute force into a single hash lookup.</p>`,
        code: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();    // value -> index (only EARLIER indices)
        for (int i = 0; i < nums.length; i++) {
            int need = target - nums[i];                 // the partner we are looking for
            Integer j = seen.get(need);
            if (j != null) return new int[]{j, i};       // partner already walked in
            seen.put(nums[i], i);                        // now let later numbers find me
        }
        return new int[0];                               // problem guarantees we never get here
    }
}`,
        alt: [{
          lang: 'python', code: `def two_sum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:
            return [seen[need], i]
        seen[x] = i
    return []`
        }, {
          lang: 'cpp', code: `vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<long long, int> seen;            // value -> index
    for (int i = 0; i < (int)nums.size(); i++) {
        long long need = (long long)target - nums[i];
        auto it = seen.find(need);
        if (it != seen.end()) return {it->second, i};
        seen[nums[i]] = i;
    }
    return {};
}`
        }],
        dry: {
          head: ['i', 'nums[i]', 'need = 9 − nums[i]', 'map before', 'action'],
          rows: [
            ['0', '11', '−2', '{}', 'miss → store 11→0'],
            ['1', '2', '7', '{11:0}', 'miss → store 2→1'],
            ['2', '15', '−6', '{11:0, 2:1}', 'miss → store 15→2'],
            ['3', '7', '2', '{11:0, 2:1, 15:2}', H.c('g', 'hit at index 1 → return [1, 3]')]
          ]
        },
        complexity: `<p><b>Time:</b> O(N) average — one O(1) lookup and one insert per element. <b>Space:</b> O(N) for the map.</p>`,
        followUps: [
          'Return <b>all</b> pairs of indices (count with a value → list-of-indices map).',
          'Input is sorted → two pointers, O(1) space (LeetCode 167).',
          'Two Sum III: design add() and find() — which one should be O(1)?',
          '4Sum II: four arrays, count tuples summing to 0 in O(N<sup>2</sup>) with a map of A+B sums.'
        ]
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — Distinct elements in every window (window frequency map)
     ===================================================================== */
  topics.push({
    title: 'Window Frequency Map: Distinct Elements in Every Window of Size K',
    analogy: `<p>The <b>shopkeeper's tally sheet</b> again, but now the boss asks every evening: "How many <b>different</b> customers came in the <b>last 4 days</b>?" The shopkeeper does not re-read four days of receipts every evening. Each night he:</p>
<ol><li><b>adds</b> today's customer to the sheet (+1 stroke),</li>
<li><b>removes</b> the customer from 4 days ago (−1 stroke), and if that person's strokes drop to <b>0</b>, crosses out the whole row,</li>
<li>counts the <b>rows</b> on the sheet — that is the number of different customers.</li></ol>
<p>One add, one remove, one read per day: O(1) work per day instead of re-scanning K days.</p>`,
    explain: `<p><b>Problem:</b> for every contiguous window of size K, report how many <b>distinct</b> values it contains.</p>
${H.arr([1, 2, 1, 3, 4, 2, 3], { label: 'arr, K = 4' })}
${H.table(['window', 'values', 'distinct'], [['0..3', '1 2 1 3', '3'], ['1..4', '2 1 3 4', '4'], ['2..5', '1 3 4 2', '4'], ['3..6', '3 4 2 3', '3']])}
<p>Answer: <b>[3, 4, 4, 3]</b>.</p>

<h4>Why a plain HashSet is not enough</h4>
<p>When the window slides, we must remove the element that leaves. But what if another copy of it is still inside? In window 0..3 the value 1 appears twice. If we removed "1" from a set when index 0 leaves, the set would forget the 1 at index 2 — wrong. So we store <b>counts</b>: value → how many times it is inside the window right now.</p>

<h4>The three-step slide</h4>
<ol>
<li><b>Add</b> the entering element: <code>cnt[in]++</code>.</li>
<li><b>Remove</b> the leaving element: <code>cnt[out]−−</code>; if it becomes 0, <b>delete the key</b>.</li>
<li><b>Answer</b> = <code>cnt.size()</code> — the number of keys = number of distinct values.</li>
</ol>
${H.table(['step', 'in', 'out', 'map after', 'distinct'], [['build 0..3', '1, 2, 1, 3', '—', '{1:2, 2:1, 3:1}', '3'], ['slide to 1..4', '4', '1', '{1:1, 2:1, 3:1, 4:1}', '4'], ['slide to 2..5', '2', '2', '{1:1, 2:1, 3:1, 4:1}', '4'], ['slide to 3..6', '3', H.c('r', '1 → 0, delete'), '{2:1, 3:2, 4:1}', '3']])}

<h4>The neat Java idiom for "decrement and delete at zero"</h4>
<pre>cnt.computeIfPresent(out, (key, v) -&gt; v == 1 ? null : v - 1);</pre>
<p>Returning <code>null</code> from the function removes the key. One lookup, no leftover zero rows.</p>

<p><b>This is the foundation</b> of every "sliding window + hashing" problem later in the module (longest substring without repeats, minimum window substring, at most K distinct, find all anagrams): the window keeps a frequency map that is updated in O(1) per step.</p>`,
    clues: [
      '"for every window / subarray of size K" + "distinct / unique / different" → window frequency map',
      '"count of distinct elements in each window" (GfG classic) → add in, remove out, delete at 0, answer = map.size()',
      '"duplicate within distance k" (Contains Duplicate II) → set holding only the last k elements',
      '"fixed-size window" + any "how many of each" question → counts, not a plain set',
      'N up to 10<sup>5</sup>–10<sup>6</sup> and K large → O(N·K) recount is too slow, need O(N)',
      '"unique visitors in the last K minutes" (system design) → same idea; at huge scale use HyperLogLog'
    ],
    code: [`
import java.util.*;

public class WindowDistinct {
    // Distinct count of every window of size k. O(N) average.
    static List<Integer> distinctInWindows(int[] arr, int k) {
        Map<Integer, Integer> cnt = new HashMap<>();
        List<Integer> res = new ArrayList<>();
        for (int i = 0; i < arr.length; i++) {
            cnt.merge(arr[i], 1, Integer::sum);                      // 1) element enters
            if (i >= k) {
                int out = arr[i - k];                                // 2) element leaves
                cnt.computeIfPresent(out, (key, v) -> v == 1 ? null : v - 1); // null => key removed
            }
            if (i >= k - 1) res.add(cnt.size());                     // 3) window complete: answer
        }
        return res;
    }

    // Contains Duplicate II: is there i != j with a[i] == a[j] and |i - j| <= k ?
    static boolean containsNearbyDuplicate(int[] a, int k) {
        Set<Integer> window = new HashSet<>();                       // holds at most k latest values
        for (int i = 0; i < a.length; i++) {
            if (!window.add(a[i])) return true;                      // same value inside the window
            if (window.size() > k) window.remove(a[i - k]);          // keep only the last k
        }
        return false;
    }

    public static void main(String[] args) {
        System.out.println(distinctInWindows(new int[]{1, 2, 1, 3, 4, 2, 3}, 4)); // [3, 4, 4, 3]
        System.out.println(containsNearbyDuplicate(new int[]{1, 2, 3, 1}, 3));   // true
        System.out.println(containsNearbyDuplicate(new int[]{1, 2, 3, 1, 2, 3}, 2)); // false
    }
}`, {
      lang: 'python', run: true, title: 'Python (runnable)',
      code: `from collections import defaultdict

def distinct_in_windows(arr, k):
    cnt, res = defaultdict(int), []
    for i, x in enumerate(arr):
        cnt[x] += 1                       # enter
        if i >= k:
            out = arr[i - k]              # leave
            cnt[out] -= 1
            if cnt[out] == 0:
                del cnt[out]              # keep len(cnt) == distinct count
        if i >= k - 1:
            res.append(len(cnt))
    return res

print(distinct_in_windows([1, 2, 1, 3, 4, 2, 3], 4))   # [3, 4, 4, 3]
print(distinct_in_windows([1, 1, 1, 1], 2))            # [1, 1, 1]`
    }],
    codeTitle: ['Window frequency map in Java', 'Python version (runnable)'],
    viz: [{
      title: 'Slide the window: add (green), remove/erase (red), answer = number of keys',
      input: '1 2 1 3 4 2 3 | 4',
      inputLabel: 'arr | K  (at most 14 numbers)',
      gen: function (input) {
        var p = splitBar(input, 2, '1 2 1 3 4 2 3 | 4'), a = parseNums(p[0], 14, 'array'), k = parseInt1(p[1], 'K', 1, a.length), cnt = new Map(), res = [], frames = [];
        frames.push({ narr: 'K = ' + k + '. The map holds value → how many times it is inside the current window. Number of keys = number of distinct values.', parts: [{ type: 'array', label: 'arr', values: a.slice() }, { type: 'map', label: 'window counts', entries: [] }, { type: 'vars', vals: { answers: '[]' } }] });
        for (var i = 0; i < a.length; i++) {
          var lo = Math.max(0, i - k + 1), had = cnt.has(a[i]);
          cnt.set(a[i], (cnt.get(a[i]) || 0) + 1);
          frames.push({ narr: '<b>' + a[i] + '</b> enters (index ' + i + '). ' + (had ? '<span class="c-r">Already in window</span> → count ' + cnt.get(a[i]) + ' (no new distinct value).' : '<span class="c-g">New key</span> → count 1.'), parts: [{ type: 'array', label: 'arr', values: a.slice(), range: [Math.max(0, i - k), i], ptr: one(i, 'in'), hl: one(i, 'ok') }, { type: 'map', label: 'window counts', entries: ents(cnt), hl: one(a[i], had ? 'cur' : 'ok') }, { type: 'vars', vals: { answers: '[' + res.join(', ') + ']' } }] });
          if (i >= k) {
            var out = a[i - k], c = cnt.get(out) - 1, ptr = {};
            ptr[i - k] = 'out';
            if (c === 0) {
              frames.push({ narr: '<b>' + out + '</b> leaves (index ' + (i - k) + '). Its count drops to <b>0</b> → <span class="c-r">erase the row</span>, it is no longer in the window.', parts: [{ type: 'array', label: 'arr', values: a.slice(), range: [lo, i], ptr: ptr, hl: one(i - k, 'bad') }, { type: 'map', label: 'window counts', entries: ents(cnt).map(function (e) { return e[0] === out ? [e[0], 0] : e; }), hl: one(out, 'bad') }, { type: 'vars', vals: { answers: '[' + res.join(', ') + ']' } }] });
              cnt.delete(out);
            } else {
              cnt.set(out, c);
              frames.push({ narr: '<b>' + out + '</b> leaves (index ' + (i - k) + '). Count drops to ' + c + ' — another copy is still inside, so the key <b>stays</b>. (This is why we need counts, not a set.)', parts: [{ type: 'array', label: 'arr', values: a.slice(), range: [lo, i], ptr: ptr, hl: one(i - k, 'bad') }, { type: 'map', label: 'window counts', entries: ents(cnt), hl: one(out, 'bad') }, { type: 'vars', vals: { answers: '[' + res.join(', ') + ']' } }] });
            }
          }
          if (i >= k - 1) {
            res.push(cnt.size);
            frames.push({ narr: 'Window ' + lo + '..' + i + ' is complete → distinct = number of keys = <b>' + cnt.size + '</b>.', parts: [{ type: 'array', label: 'arr', values: a.slice(), range: [lo, i] }, { type: 'map', label: 'window counts', entries: ents(cnt) }, { type: 'vars', vals: { distinct: cnt.size, answers: '[' + res.join(', ') + ']' }, hl: { distinct: 'sel' } }] });
          }
        }
        frames.push({ narr: 'Final answer: <b>[' + res.join(', ') + ']</b>. Each element entered once and left once → O(N) total.', parts: [{ type: 'array', label: 'answers per window', values: res.slice(), hl: rng(0, res.length - 1, 'sel') }] });
        return frames;
      }
    }, {
      title: 'Contains Duplicate II: a set that only remembers the last k elements',
      input: '1 2 3 4 2 5 | 2',
      inputLabel: 'arr | k (max distance), at most 14 numbers',
      gen: function (input) {
        var p = splitBar(input, 2, '1 2 3 4 2 5 | 2'), a = parseNums(p[0], 14, 'array'), k = parseInt1(p[1], 'k', 0, 14), s = [], frames = [];
        frames.push({ narr: 'We need two equal values at most k = ' + k + ' positions apart. Keep a set of only the last k values; anything older is too far away to matter.', parts: [{ type: 'array', label: 'arr', values: a.slice() }, { type: 'set', label: 'last k values', items: [] }] });
        for (var i = 0; i < a.length; i++) {
          if (s.indexOf(a[i]) >= 0) {
            frames.push({ narr: 'i = ' + i + ': ' + a[i] + ' is already in the set of the last ' + k + ' values → <span class="c-r">nearby duplicate</span>, return true.', parts: [{ type: 'array', label: 'arr', values: a.slice(), range: [Math.max(0, i - k), i], hl: one(i, 'bad'), ptr: one(i, 'i') }, { type: 'set', label: 'last k values', items: s.slice(), hl: one(a[i], 'bad') }] });
            frames.push({ narr: 'Answer: <b>true</b>.', parts: [{ type: 'vars', vals: { answer: true }, hl: { answer: 'sel' } }] });
            return frames;
          }
          s.push(a[i]);
          frames.push({ narr: 'i = ' + i + ': ' + a[i] + ' is new in the window → <span class="c-g">add</span>.', parts: [{ type: 'array', label: 'arr', values: a.slice(), range: [Math.max(0, i - k), i], hl: one(i, 'ok'), ptr: one(i, 'i') }, { type: 'set', label: 'last k values', items: s.slice(), hl: one(a[i], 'ok') }] });
          if (s.length > k) {
            var old = a[i - k];
            frames.push({ narr: 'The set has ' + s.length + ' &gt; k values → <span class="c-r">remove</span> ' + old + ' (index ' + (i - k) + '): it is now too far behind to count.', parts: [{ type: 'array', label: 'arr', values: a.slice(), range: [i - k + 1, i], hl: one(i - k, 'bad') }, { type: 'set', label: 'last k values', items: s.slice(), hl: one(old, 'bad') }] });
            s.splice(s.indexOf(old), 1);
          }
        }
        frames.push({ narr: 'No equal pair within distance ' + k + ' → <b>false</b>.', parts: [{ type: 'set', label: 'last k values', items: s.slice() }, { type: 'vars', vals: { answer: false }, hl: { answer: 'sel' } }] });
        return frames;
      }
    }],
    examples: [{
      title: 'Edge cases K = 1 and K = N',
      html: `<p>arr = [4, 4, 7]. <b>K = 1:</b> every window holds one element → [1, 1, 1]. <b>K = N = 3:</b> one window → [2] (values 4 and 7). Your code should handle both without special cases: with K = 1, each step adds one and removes the previous one.</p>`
    }, {
      title: 'All equal values',
      html: `<p>arr = [1, 1, 1, 1], K = 2 → [1, 1, 1]. The key 1 is never erased because its count goes 2 → 1 → 2 → 1 as copies enter and leave. If you had used a plain set and removed "1" whenever a 1 left, you would print 0 — the classic bug.</p>`
    }, {
      title: 'Unique visitors in the last 3 days (strings work the same)',
      html: `<p>Visits by day: [asha, ben, asha, cara, ben, ben], K = 3.</p>
${H.table(['window', 'map', 'distinct'], [['asha ben asha', '{asha:2, ben:1}', '2'], ['ben asha cara', '{ben:1, asha:1, cara:1}', '3'], ['asha cara ben', '{asha:1, cara:1, ben:1}', '3'], ['cara ben ben', '{cara:1, ben:2}', '2']])}
<p>Answer [2, 3, 3, 2]. Keys can be any hashable type.</p>`
    }, {
      title: 'Small value range → int array instead of a map',
      html: `<p>If values are in 0..10<sup>5</sup>, use <code>int[] cnt</code> plus a variable <code>distinct</code>: when a count goes 0 → 1, <code>distinct++</code>; when it goes 1 → 0, <code>distinct−−</code>. No hashing, no boxing, and you do not even need <code>size()</code>.</p>`,
      code: `List<Integer> distinctSmallRange(int[] a, int k, int maxVal) {
    int[] cnt = new int[maxVal + 1];
    int distinct = 0;
    List<Integer> res = new ArrayList<>();
    for (int i = 0; i < a.length; i++) {
        if (cnt[a[i]]++ == 0) distinct++;              // 0 -> 1: a new distinct value
        if (i >= k && --cnt[a[i - k]] == 0) distinct--; // 1 -> 0: value fully left
        if (i >= k - 1) res.add(distinct);
    }
    return res;
}`
    }],
    deepDive: `<p><b>Invariant.</b> After processing index i (once i ≥ K − 1), the map contains exactly the multiset of arr[i−K+1..i], with no zero-count keys. Therefore <code>size()</code> equals the distinct count. Forgetting to delete zero-count keys breaks the invariant silently — <code>size()</code> keeps growing.</p>
<p><b>Cost.</b> Every element is added once and removed once: 2N map operations → O(N) average time, O(K) space (the map never holds more than K keys). The brute force recounts each window from scratch: O(N·K), which is 10<sup>10</sup> for N = 10<sup>5</sup>, K = 10<sup>5</sup>/2.</p>
<p><b>Order of add vs remove.</b> Adding first then removing (as above) or removing first then adding both work, as long as the answer is read after both. Reading <code>size()</code> between them gives a window of size K+1 or K−1 — an off-by-one bug interviewers love.</p>
<p><b>Arbitrary ranges, not sliding windows.</b> "How many distinct values in arr[l..r]?" for many random queries cannot be slid. Offline solutions: sort queries by r and use a Fenwick tree where only the <b>last occurrence</b> of each value is marked (O((N + Q) log N)), or Mo's algorithm (O((N + Q)√N)) which reuses this exact add/remove routine. Online: persistent segment trees.</p>
<p><b>Huge scale.</b> Counting unique users per window over billions of events does not fit in a HashMap. Production systems use <b>HyperLogLog</b> (Redis <code>PFADD</code>/<code>PFCOUNT</code>: about 12 KB per counter, ~0.81% standard error) and merge per-minute sketches into per-window estimates. The exact HashMap approach is what you implement first and then explain why it does not scale.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants write the window map quickly, but window off-by-ones and "forgot to delete at zero" are among their most frequent bugs, because both versions look plausible and pass the sample test.</p>
<p><b>Use AI as a partner:</b> <code>Generate 10 random arrays and K values and compare my sliding-window distinct count against a brute force that recounts each window</code>; <code>Explain why size() is wrong if I never remove zero-count keys</code>; <code>Convert this to an int[] version assuming values ≤ 10^5</code>.</p>
<p><b>Where AI goes wrong:</b> using a <code>HashSet</code> and removing the outgoing value even when another copy remains; reading the answer before the window reaches size K; using <code>getOrDefault(x,0) - 1</code> and leaving zero-count keys; mixing up "within distance k" (window of k+1 indices) in Contains Duplicate II.</p>
<p><b>What you must still own:</b> the invariant ("map = exact multiset of the window, no zeros"), the add/remove/answer order, and knowing when exact counting must give way to sketches like HyperLogLog in a design round.</p>`,
    problems: [{
      title: 'Count Distinct Elements in Every Window of Size K',
      level: 'Medium', tags: ['sliding window', 'hashmap', 'frequency'], companies: ['Amazon', 'Microsoft', 'Walmart', 'Samsung'],
      statement: `<p>Given an array <code>arr</code> of N integers and an integer K, return a list with the number of distinct elements in every contiguous window of size K, from left to right.</p>`,
      constraints: `1 ≤ K ≤ N ≤ 10<sup>5</sup>, 1 ≤ arr[i] ≤ 10<sup>5</sup>`,
      example: `${H.arr([1, 2, 1, 3, 4, 2, 3], { label: 'arr', hl: { 0: 'b', 1: 'b', 2: 'b', 3: 'b' } })}<p>K = 4 → output ${H.c('g', '[3, 4, 4, 3]')}. The first window [1, 2, 1, 3] has values {1, 2, 3} → 3; the last window [3, 4, 2, 3] has {2, 3, 4} → 3.</p>`,
      brute: {
        why: `<p>For each of the N − K + 1 windows, build a fresh HashSet of its K elements and record its size. That is <b>O(N·K)</b> — about 2.5·10<sup>9</sup> operations when K = N/2 = 5·10<sup>4</sup>. The waste: consecutive windows share K − 1 elements, yet we rebuild everything.</p>`,
        code: `List<Integer> countDistinctBrute(int[] arr, int k) {
    List<Integer> res = new ArrayList<>();
    for (int start = 0; start + k <= arr.length; start++) {
        Set<Integer> seen = new HashSet<>();
        for (int j = start; j < start + k; j++) seen.add(arr[j]);
        res.add(seen.size());
    }
    return res;
}`
      },
      mcq: {
        q: 'The window [1, 2, 1, 3] slides right; the 1 at index 0 leaves. What should happen to key 1 in the count map?',
        options: ['Its count goes from 2 to 1 and the key stays', 'The key is removed because 1 left the window', 'Nothing — we only add elements', 'The count is reset to 0'],
        answer: 0,
        explain: 'Another 1 (index 2) is still inside the window. Only when a count reaches 0 do we delete the key.'
      },
      hints: [
        `<p><b>Hint 1:</b> Neighbouring windows differ by exactly two elements: one enters on the right, one leaves on the left. Update, don't rebuild.</p>`,
        `<p><b>Hint 2:</b> A set cannot handle duplicates leaving; keep a <code>HashMap&lt;value, count&gt;</code> of the current window. Distinct count = number of keys.</p>`,
        `<p><b>Hint 3 (recipe):</b> for i in 0..N−1: cnt[arr[i]]++; if i ≥ K: decrement cnt[arr[i−K]] and delete it at 0; if i ≥ K−1: append cnt.size(). Edge cases: K = 1 (all ones), K = N (one answer), all equal values.</p>`
      ],
      solution: {
        approach: `<p><b>Sliding window with a frequency map.</b> Add the entering element, remove the leaving one (deleting the key when its count hits 0), and read the map's size. Each element causes O(1) map work twice, so the whole scan is linear.</p>`,
        code: `class Solution {
    public List<Integer> countDistinct(int[] arr, int k) {
        Map<Integer, Integer> cnt = new HashMap<>();       // value -> copies inside window
        List<Integer> res = new ArrayList<>();
        for (int i = 0; i < arr.length; i++) {
            cnt.merge(arr[i], 1, Integer::sum);             // enter
            if (i >= k) {
                int out = arr[i - k];                       // leave
                cnt.computeIfPresent(out, (key, v) -> v == 1 ? null : v - 1); // delete at 0
            }
            if (i >= k - 1) res.add(cnt.size());            // full window -> answer
        }
        return res;
    }
}`,
        alt: [{
          lang: 'python', code: `from collections import defaultdict

def count_distinct(arr, k):
    cnt, res = defaultdict(int), []
    for i, x in enumerate(arr):
        cnt[x] += 1
        if i >= k:
            out = arr[i - k]
            cnt[out] -= 1
            if cnt[out] == 0:
                del cnt[out]
        if i >= k - 1:
            res.append(len(cnt))
    return res`
        }, {
          lang: 'cpp', code: `vector<int> countDistinct(vector<int>& arr, int k) {
    unordered_map<int, int> cnt;
    vector<int> res;
    for (int i = 0; i < (int)arr.size(); i++) {
        cnt[arr[i]]++;
        if (i >= k && --cnt[arr[i - k]] == 0) cnt.erase(arr[i - k]);
        if (i >= k - 1) res.push_back((int)cnt.size());
    }
    return res;
}`
        }],
        dry: {
          head: ['i', 'enters', 'leaves', 'map after', 'answer so far'],
          rows: [
            ['0', '1', '—', H.c('g', '{1:1}'), '[]'],
            ['1', '2', '—', H.c('g', '{1:1, 2:1}'), '[]'],
            ['2', '1', '—', '{1:2, 2:1}', '[]'],
            ['3', '3', '—', H.c('g', '{1:2, 2:1, 3:1}'), '[3]'],
            ['4', '4', '1 (2→1)', '{1:1, 2:1, 3:1, 4:1}', '[3, 4]'],
            ['5', '2', '2 (2→1)', '{1:1, 2:1, 3:1, 4:1}', '[3, 4, 4]'],
            ['6', '3', H.c('r', '1 (1→0, delete)'), '{2:1, 3:2, 4:1}', H.c('g', '[3, 4, 4, 3]')]
          ]
        },
        complexity: `<p><b>Time:</b> O(N) average — each element is added once and removed once. <b>Space:</b> O(K) — the map never holds more than K keys.</p>`,
        followUps: [
          'Values are ≤ 10<sup>5</sup>: rewrite with <code>int[]</code> and a running distinct counter.',
          'Return the <b>maximum</b> distinct count over all windows.',
          'Answer distinct counts for arbitrary ranges [l, r] (offline Fenwick tree by last occurrence, or Mo\'s algorithm).',
          'Approximate distinct visitors per minute for 1B events/day (HyperLogLog).'
        ]
      }
    }]
  });


  registerModule({
    id: 'dsa08',
    title: 'Hashing Masterclass (HashSet & HashMap)',
    intro: `<p>Hashing is the single most useful trick in coding interviews. A <b>HashSet</b> answers "have I seen this before?" and a <b>HashMap</b> answers "how many / where / which partner?" — both in <b>O(1) time on average</b>. That one superpower turns dozens of O(N<sup>2</sup>) brute-force solutions into clean O(N) ones, and it is hiding inside caches, database joins, deduplication pipelines and compilers.</p>
<p>We start by <b>opening the box</b>: how Java turns a key into a bucket (hashCode, spreading, masking), why <code>equals()</code> and <code>hashCode()</code> must agree, how collisions are chained, when a chain becomes a red-black tree, and why the 0.75 load factor and doubling resize keep everything O(1) amortized — and when it all collapses to O(N).</p>
<p>Then we master the patterns that appear again and again, each with a real-life picture you will remember in the interview room:</p>
<ul>
<li><b>Frequency map</b> — the shopkeeper's tally sheet: first non-repeating element, valid anagram, group anagrams.</li>
<li><b>Lookup set / complement map</b> — the VIP guest list at the club door: 2-Sum on an unsorted array, duplicates, counting pairs.</li>
<li><b>Window frequency map</b> — distinct elements in every window of size K.</li>
<li><b>Prefix sum + hashing</b> — your bank balance on Monday vs Friday: zero-sum subarray, count subarrays with sum K, longest subarray with sum 0 or K, equal 0s and 1s.</li>
<li><b>Sliding window + hashing</b> — longest substring without repeating characters, minimum window substring.</li>
<li><b>Set chain-start trick</b> — longest consecutive sequence in O(N) without sorting.</li>
</ul>
<p>Every topic has an analogy, the exact "clues in the question" that should make you reach for it, step-by-step visualizers (green = inserted, red = hit / duplicate / removed), fully guided problems with dry runs, and an expert layer on internals, performance and production reality.</p>`,
    goals: [
      'Explain exactly how a Java HashMap stores and finds a key: hashCode → spread → bucket index → chain/tree walk with equals(), load factor 0.75, doubling resize, treeify at 8 (capacity ≥ 64).',
      'State and defend the complexity: O(1) average, O(1) amortized insert, O(N) worst case with a bad hash (O(log N) after treeify), and write correct hashCode/equals for custom keys.',
      'Pick the right tool from the wording: HashSet vs HashMap vs int[26] vs LinkedHashMap vs TreeMap, and value = count / first index / last index / list.',
      'Solve every prefix-sum + hashing problem (zero-sum exists, count sum K, longest sum 0/K, equal 0s and 1s, divisible by K) in O(N) with the correct seed ({0} or 0 → −1).',
      'Write the sliding-window-with-a-map template from memory and apply it to longest substring without repeats and minimum window substring.',
      'Solve longest consecutive sequence in O(N) using the "only start counting at a chain start" trick and prove the O(N) bound.'
    ],
    prereqs: `<p>DSA 1 (Java foundations: arrays, strings, <code>List</code>/<code>Map</code> basics), DSA 2 (Big-O and constraint reading), DSA 5 (<b>Prefix Sums</b> — essential for topics 5–7) and DSA 6 (<b>Two Pointers &amp; Sliding Window</b> — essential for topic 8). Bit basics from DSA 4 help with the <code>&amp; (capacity − 1)</code> bucket math.</p>`,
    hours: 16,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
