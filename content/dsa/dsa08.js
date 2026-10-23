(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- code panes for the zero-sum visualizer: Java is the main version, hl uses its line numbers ---------- */
  var ZS_CODE = 'seen.add(0L); long pf = 0;\nfor (int x : a) {\n  pf += x;\n  if (!seen.add(pf)) return true;\n}\nreturn false;';
  var ZS_PY = 'seen = {0}; pf = 0\nfor x in a:\n    pf += x\n    if pf in seen: return True\n    seen.add(pf)\nreturn False';
  var ZS_JS = 'const seen = new Set([0]); let pf = 0;\nfor (const x of a) {\n  pf += x;\n  if (seen.has(pf)) return true; seen.add(pf);\n}\nreturn false;';
  var ZS_CPP = 'unordered_set<long long> seen = {0}; long long pf = 0;\nfor (int x : a) {\n  pf += x;\n  if (!seen.insert(pf).second) return true;\n}\nreturn false;';
  var ZS_ALT = { python: { code: ZS_PY, map: {} }, js: { code: ZS_JS, map: {} }, cpp: { code: ZS_CPP, map: {} } };

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
    code: [{ lang: 'java', code: `
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
}`, alt: [{
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
    }, { lang: 'js', run: true, code: `// JS Map and Set compare OBJECT keys by identity, not by their fields.
class Point {
  constructor(x, y) { this.x = x; this.y = y; }
}
const bad = new Set([new Point(1, 2)]);
console.log('object key found?', bad.has(new Point(1, 2)));     // false: a different object

// Fix: build a value key (string or number) from the fields.
const key = (p) => p.x + ',' + p.y;
const good = new Set([key(new Point(1, 2))]);
console.log('string key found?', good.has(key(new Point(1, 2)))); // true

// Java's String.hashCode is h = 31*h + c in 32 bits: "Aa" and "BB" collide.
function javaHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
console.log('Aa ->', javaHash('Aa') + ', BB ->', javaHash('BB'));  // 2112, 2112

// Bucket index the way a HashMap computes it (capacity 16).
for (const k of [10, 26, 7, 42]) {
  const spread = k ^ (k >>> 16);
  console.log('key', k, '-> bucket', spread & 15);
}` }, { lang: 'cpp', code: `#include <bits/stdc++.h>
using namespace std;

// unordered_set needs a hash AND operator==. Forget the hash and the code
// does not compile, so C++ catches the broken contract at build time.
struct Point {
    int x, y;
    bool operator==(const Point& o) const { return x == o.x && y == o.y; }
};
struct PointHash {
    size_t operator()(const Point& p) const {          // equal points -> equal hashes
        return hash<long long>()(((long long)p.x << 32) ^ (unsigned)p.y);
    }
};

int javaHash(const string& s) {                         // h = 31*h + c, 32-bit wrap
    unsigned h = 0;
    for (unsigned char c : s) h = 31 * h + c;
    return (int)h;
}

int main() {
    unordered_set<Point, PointHash> good;
    good.insert({1, 2});
    cout << boolalpha << "Point found? " << (good.count({1, 2}) > 0) << "\\n";   // true

    // Collisions are legal: different strings, same hash.
    cout << "Aa -> " << javaHash("Aa") << ", BB -> " << javaHash("BB") << "\\n"; // 2112, 2112

    // Bucket index the way Java's HashMap computes it (capacity 16).
    for (unsigned key : {10u, 26u, 7u, 42u}) {
        unsigned spread = key ^ (key >> 16);
        cout << "key " << key << " -> bucket " << (spread & 15) << "\\n";
    }

    // Pre-size when you know the count: reserve() avoids rehashing.
    unordered_map<string, int> sized;
    sized.reserve(1000);
    sized["ready"] = 1;
    cout << "buckets: " << sized.bucket_count() << "\\n";
}` }] }],
    codeTitle: 'Key equality/hash contract, collisions and bucket math',
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
      code: { lang: 'java', code: `Map<String, Integer> m = new HashMap<>();
m.put("Aa", 1);
m.put("BB", 2);
System.out.println(m.get("Aa") + " " + m.get("BB")); // 1 2 — collision handled by equals()`, alt: [{ lang: 'python', code: `m = {"Aa": 1, "BB": 2}
print(m["Aa"], m["BB"])   # 1 2 — if two keys ever share a bucket, == tells them apart` }, { lang: 'js', code: `const m = new Map([['Aa', 1], ['BB', 2]]);
console.log(m.get('Aa'), m.get('BB')); // 1 2 — equal hashes are fine, keys are compared too` }, { lang: 'cpp', code: `unordered_map<string, int> m{{"Aa", 1}, {"BB", 2}};
cout << m["Aa"] << " " << m["BB"] << "\\n"; // 1 2 — same bucket is fine, == tells them apart` }] }
    }, {
      title: 'The mutable key trap',
      html: `<p>Put a key in a set, then change a field used by <code>hashCode()</code>. The object is still physically in the <b>old</b> bucket, but lookups now compute a <b>new</b> bucket — the element is "lost" (contains() says false, yet size() says 1).</p>
<p><b>Rule:</b> keys must be immutable (String, Integer, records with final fields). Never use a <code>List</code> you will later modify as a key.</p>`,
      code: { lang: 'java', code: `List<Integer> key = new ArrayList<>(List.of(1, 2));
Set<List<Integer>> set = new HashSet<>();
set.add(key);
key.add(3);                                  // hashCode of the list changes
System.out.println(set.contains(key));        // false — lost in the old bucket
System.out.println(set.size());               // 1`, alt: [{ lang: 'python', code: `key = [1, 2]
s = set()
try:
    s.add(key)                 # lists are mutable, so Python refuses to hash them
except TypeError as e:
    print("TypeError:", e)
s.add(tuple(key))              # store an immutable snapshot instead
key.append(3)                  # changing the list does not touch the stored tuple
print(tuple(key) in s)         # False — (1, 2, 3) was never added
print(len(s))                  # 1` }, { lang: 'js', code: `const key = [1, 2];
const set = new Set([key]);
key.push(3);                     // Set keys are object identities, not contents
console.log(set.has(key));       // true  — same object
console.log(set.has([1, 2, 3])); // false — equal contents, different object` }, { lang: 'cpp', code: `vector<int> key{1, 2};
set<vector<int>> s;
s.insert(key);                   // the set stores a COPY of the key
key.push_back(3);                // changes only our copy
cout << s.count(key) << "\\n";    // 0 — {1, 2, 3} is not in the set
cout << s.size() << "\\n";        // 1` }] }
    }, {
      title: 'Pre-sizing to avoid resizes',
      html: `<p>Inserting 1,000,000 keys into <code>new HashMap&lt;&gt;()</code> triggers resizes at 13, 25, 49, … — about 17 doublings, each re-placing everything already in the map. If you know the count, size it once:</p>
<ul><li>Java 19+: <code>HashMap.newHashMap(1_000_000)</code> (computes capacity for you).</li>
<li>Older Java: <code>new HashMap&lt;&gt;((int) (n / 0.75f) + 1)</code>. Note: <code>new HashMap&lt;&gt;(n)</code> is the <i>capacity</i>, not the expected size — a common mistake.</li></ul>`,
      code: { lang: 'java', code: `int n = 1_000_000;
Map<Integer, Integer> a = HashMap.newHashMap(n);           // Java 19+
Map<Integer, Integer> b = new HashMap<>((int) (n / 0.75f) + 1); // works on any version
for (int i = 0; i < n; i++) { a.put(i, i); b.put(i, i); }
System.out.println(a.size() + " " + b.size());`, alt: [{ lang: 'python', code: `n = 1_000_000
a = {i: i for i in range(n)}   # dict has no size hint; a comprehension builds it in one go
print(len(a))` }, { lang: 'js', code: `const n = 1000000;
const a = new Map();                       // Map has no capacity option; it grows itself
for (let i = 0; i < n; i++) a.set(i, i);
console.log(a.size);` }, { lang: 'cpp', code: `int n = 1000000;
unordered_map<int, int> a;
a.reserve(n);                              // room for n keys: no rehash while filling
for (int i = 0; i < n; i++) a[i] = i;
cout << a.size() << "\\n";` }] }
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
        code: {
          lang: 'java',
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
}`,
          alt: [
            { lang: 'python', code: `class MyHashMap:
    # Every pair lives in one list: [key, value].
    def __init__(self):
        self.pairs = []

    def put(self, key, value):
        for p in self.pairs:
            if p[0] == key:
                p[1] = value               # update existing
                return
        self.pairs.append([key, value])    # brand-new key

    def get(self, key):
        for p in self.pairs:
            if p[0] == key:
                return p[1]
        return -1

    def remove(self, key):
        for i in range(len(self.pairs)):
            if self.pairs[i][0] == key:
                del self.pairs[i]
                return` },
            { lang: 'js', code: `class MyHashMap {
  // Every pair lives in one array: [key, value].
  constructor() { this.pairs = []; }

  put(key, value) {
    for (const p of this.pairs) {
      if (p[0] === key) { p[1] = value; return; } // update existing
    }
    this.pairs.push([key, value]);                // brand-new key
  }

  get(key) {
    for (const p of this.pairs) if (p[0] === key) return p[1];
    return -1;
  }

  remove(key) {
    for (let i = 0; i < this.pairs.length; i++) {
      if (this.pairs[i][0] === key) { this.pairs.splice(i, 1); return; }
    }
  }
}` },
            { lang: 'cpp', code: `class MyHashMap {
    // Every pair lives in one vector: {key, value}.
    vector<pair<int, int>> pairs;

public:
    void put(int key, int value) {
        for (auto& p : pairs) {
            if (p.first == key) { p.second = value; return; } // update existing
        }
        pairs.push_back({key, value});                        // brand-new key
    }

    int get(int key) {
        for (auto& p : pairs) if (p.first == key) return p.second;
        return -1;
    }

    void remove(int key) {
        for (size_t i = 0; i < pairs.size(); i++) {
            if (pairs[i].first == key) { pairs.erase(pairs.begin() + i); return; }
        }
    }
};` }
          ]
        }
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
      tests: { cls: 'MyHashMap', sigs: { MyHashMap: '', put: 'int int -> void', get: 'int -> int', remove: 'int -> void' }, cases: [
  {"ops": ["MyHashMap", "put", "put", "put", "get", "get", "put", "get", "remove", "get"], "args": [[], [1, 1], [2, 2], [17, 5], [1], [3], [2, 1], [2], [2], [2]], "out": [null, null, null, null, 1, -1, null, 1, null, -1]},
  {"ops": ["MyHashMap", "get", "remove", "get"], "args": [[], [0], [0], [0]], "out": [null, -1, null, -1]},
  {"ops": ["MyHashMap", "put", "put", "get", "get", "get"], "args": [[], [0, 7], [1000000, 1000000], [0], [1000000], [999999]], "out": [null, null, null, 7, 1000000, -1]},
  {"ops": ["MyHashMap", "put", "put", "remove", "get"], "args": [[], [5, 1], [5, 2], [5], [5]], "out": [null, null, null, null, -1]},
  {"ops": ["MyHashMap", "put", "put", "put", "remove", "get", "get", "get", "put", "get"], "args": [[], [1, 10], [17, 20], [33, 30], [17], [1], [17], [33], [17, 40], [17]], "out": [null, null, null, null, null, 10, -1, 30, null, 40]},
  {"ops": ["MyHashMap", "remove", "put", "get"], "args": [[], [3], [3, 0], [3]], "out": [null, null, null, 0]},
  {"ops": ["MyHashMap", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "put", "remove", "remove", "remove", "remove", "remove", "remove", "remove", "remove", "remove", "remove", "remove", "remove", "remove", "remove", "remove", "remove", "remove", "remove", "remove", "remove", "get", "get", "get", "get", "get", "get", "get", "get", "get", "get", "get", "get", "get", "get", "get", "get", "get", "get", "get", "get", "get", "get", "get", "get", "get", "get", "get", "get", "get", "get"], "args": [[], [1, 388404], [19, 132467], [33, 739054], [48, 89323], [65, 259460], [81, 420175], [96, 481436], [115, 475143], [131, 519026], [145, 940928], [163, 93916], [179, 245558], [192, 735221], [210, 545445], [227, 497363], [243, 761268], [256, 695166], [274, 101887], [288, 405137], [307, 112961], [320, 354878], [337, 724881], [352, 521751], [369, 609785], [385, 636188], [400, 565933], [416, 512404], [433, 155407], [451, 764350], [467, 299529], [482, 896573], [499, 141532], [513, 801421], [528, 557641], [546, 736252], [562, 996146], [579, 528085], [593, 323791], [609, 373019], [626, 534554], [672], [73], [519], [558], [225], [352], [249], [12], [302], [351], [225], [273], [34], [433], [260], [385], [305], [426], [179], [673], [405], [679], [164], [385], [579], [131], [451], [427], [295], [96], [513], [152], [194], [348], [352], [1], [215], [593], [433], [123], [227], [145], [96], [131], [81], [400], [466], [48], [114], [4]], "out": [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, -1, -1, -1, -1, 528085, 519026, 764350, -1, -1, 481436, 801421, -1, -1, -1, -1, 388404, -1, 323791, -1, -1, 497363, 940928, 481436, 519026, 420175, 565933, -1, 89323, -1, -1]}
] },
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
        alt: [{ lang: 'js', code: `class MyHashMap {
  constructor() {
    this.table = new Array(16).fill(null);   // heads of bucket chains
    this.size = 0;
  }
  idx(key) {
    let h = key | 0;
    h ^= h >>> 16;                           // mix high bits into low bits
    return h & (this.table.length - 1);
  }
  put(key, value) {
    const i = this.idx(key);
    for (let n = this.table[i]; n; n = n.next) {
      if (n.key === key) { n.val = value; return; }   // update only
    }
    this.table[i] = { key, val: value, next: this.table[i] };
    if (++this.size > this.table.length * 0.75) this.resize();
  }
  get(key) {
    for (let n = this.table[this.idx(key)]; n; n = n.next) if (n.key === key) return n.val;
    return -1;
  }
  remove(key) {
    const i = this.idx(key);
    let prev = null, cur = this.table[i];
    while (cur) {
      if (cur.key === key) {
        if (prev) prev.next = cur.next; else this.table[i] = cur.next;
        this.size--;
        return;
      }
      prev = cur;
      cur = cur.next;
    }
  }
  resize() {
    const old = this.table;
    this.table = new Array(old.length * 2).fill(null);
    for (let head of old) {
      while (head) {
        const next = head.next, i = this.idx(head.key);
        head.next = this.table[i];
        this.table[i] = head;
        head = next;
      }
    }
  }
}` }, {
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

<h4>The ways to keep a tally (Java syntax in the table)</h4>
${H.table(['when keys are…', 'use', 'one line'], [['anything (ints, strings, objects)', '<code>HashMap&lt;K,Integer&gt;</code>', '<code>cnt.merge(x, 1, Integer::sum);</code>'], ['lowercase letters a–z', '<code>int[26]</code>', '<code>cnt[c - \'a\']++;</code>'], ['ASCII characters', '<code>int[128]</code>', '<code>cnt[c]++;</code>'], ['small ints 0..K', '<code>int[K+1]</code>', '<code>cnt[x]++;</code>']])}
<p>In Java, <code>merge(x, 1, Integer::sum)</code> means: "if x is missing, store 1; otherwise store old + 1". The older style is <code>cnt.put(x, cnt.getOrDefault(x, 0) + 1)</code>.</p>
<p>The same tally in other languages: Python <code>Counter(arr)</code>, or <code>cnt[x] += 1</code> on a <code>defaultdict(int)</code>; JavaScript <code>cnt.set(x, (cnt.get(x) || 0) + 1)</code> on a <code>Map</code>; C++ <code>cnt[x]++</code> on an <code>unordered_map</code> (a missing key starts at 0). A letter array is <code>[0] * 26</code> in Python, <code>new Array(26).fill(0)</code> in JavaScript and <code>array&lt;int, 26&gt;{}</code> in C++.</p>

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
    code: [{ lang: 'java', code: `
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
}`, alt: [{
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
    }, { lang: 'js', run: true, code: `const arr = [9, 4, 9, 6, 7, 4];

// 1) Map tally: missing -> 1, present -> old + 1
const cnt = new Map();
for (const x of arr) cnt.set(x, (cnt.get(x) || 0) + 1);
console.log('tally =', Object.fromEntries(cnt));

// 2) Second pass over the ARRAY (keeps the original order)
console.log('first non-repeating =', arr.find((x) => cnt.get(x) === 1));

// 3) Array of 26 counts for lowercase letters: index = code - 97 ('a')
const letters = new Array(26).fill(0);
for (const c of 'banana') letters[c.charCodeAt(0) - 97]++;
console.log('a=' + letters[0] + ' b=' + letters[1] + ' n=' + letters['n'.charCodeAt(0) - 97]);

// 4) reduce() one-liner, then sort the keys for printing
const byChar = [...'mississippi'].reduce((m, c) => m.set(c, (m.get(c) || 0) + 1), new Map());
console.log(Object.fromEntries([...byChar].sort())); // { i: 4, m: 1, p: 2, s: 4 }` }, { lang: 'cpp', code: `#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> arr = {9, 4, 9, 6, 7, 4};

    // 1) unordered_map tally: operator[] creates a missing key with 0
    unordered_map<int, int> cnt;
    for (int x : arr) cnt[x]++;
    cout << "count of 9 = " << cnt[9] << "\\n";

    // 2) Second pass over the ARRAY (keeps the original order)
    for (int x : arr)
        if (cnt[x] == 1) { cout << "first non-repeating = " << x << "\\n"; break; }

    // 3) array<int, 26> tally for lowercase letters: index = c - 'a'
    array<int, 26> letters{};
    for (char c : string("banana")) letters[c - 'a']++;
    cout << "a=" << letters[0] << " b=" << letters[1] << " n=" << letters['n' - 'a'] << "\\n";

    // 4) std::map keeps keys sorted (O(log N) per step)
    map<char, int> byChar;
    for (char c : string("mississippi")) byChar[c]++;
    for (auto& [c, n] : byChar) cout << c << "=" << n << " ";   // i=4 m=1 p=2 s=4
    cout << "\\n";
}` }] }],
    codeTitle: 'Tally idioms',
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
      code: { lang: 'java', code: `int[] cnt = new int[26];
for (char c : "banana".toCharArray()) cnt[c - 'a']++;
System.out.println(cnt[0] + " " + cnt[1] + " " + cnt['n' - 'a']); // 3 1 2`, alt: [{ lang: 'python', code: `cnt = [0] * 26
for c in "banana":
    cnt[ord(c) - ord("a")] += 1
print(cnt[0], cnt[1], cnt[ord("n") - ord("a")])   # 3 1 2` }, { lang: 'js', code: `const cnt = new Array(26).fill(0);
for (const c of 'banana') cnt[c.charCodeAt(0) - 97]++;
console.log(cnt[0], cnt[1], cnt['n'.charCodeAt(0) - 97]); // 3 1 2` }, { lang: 'cpp', code: `array<int, 26> cnt{};
for (char c : string("banana")) cnt[c - 'a']++;
cout << cnt[0] << " " << cnt[1] << " " << cnt['n' - 'a'] << "\\n"; // 3 1 2` }] }
    }, {
      title: 'First unique character in a string (LeetCode 387)',
      html: `<p>s = "loveleetcode". Tally: l=2, o=2, v=1, e=4, t=1, c=1, d=1. Second pass over s: l(2) o(2) <b>v(1)</b> → return index <b>2</b>.</p>
<p>Same two-pass pattern; with only lowercase letters use <code>int[26]</code>.</p>`,
      code: { lang: 'java', code: `int firstUniqChar(String s) {
    int[] cnt = new int[26];
    for (int i = 0; i < s.length(); i++) cnt[s.charAt(i) - 'a']++;
    for (int i = 0; i < s.length(); i++) if (cnt[s.charAt(i) - 'a'] == 1) return i;
    return -1;
}`, alt: [{ lang: 'python', code: `from collections import Counter

def first_uniq_char(s):
    cnt = Counter(s)
    return next((i for i, c in enumerate(s) if cnt[c] == 1), -1)` }, { lang: 'js', code: `function firstUniqChar(s) {
  const cnt = new Array(26).fill(0);
  for (let i = 0; i < s.length; i++) cnt[s.charCodeAt(i) - 97]++;
  for (let i = 0; i < s.length; i++) if (cnt[s.charCodeAt(i) - 97] === 1) return i;
  return -1;
}` }, { lang: 'cpp', code: `int firstUniqChar(const string& s) {
    array<int, 26> cnt{};
    for (char c : s) cnt[c - 'a']++;
    for (int i = 0; i < (int)s.size(); i++) if (cnt[s[i] - 'a'] == 1) return i;
    return -1;
}` }] }
    }, {
      title: 'Majority element (appears more than N/2 times)',
      html: `<p>arr = [2, 2, 1, 1, 1, 2, 2]. Tally: 2 → 4, 1 → 3. N/2 = 3.5, and 4 &gt; 3.5 → answer <b>2</b>. The frequency map solves it in O(N) time and O(N) space; the Boyer–Moore voting algorithm then improves space to O(1) — a classic interview follow-up.</p>`,
      code: { lang: 'java', code: `int majority(int[] a) {
    Map<Integer, Integer> cnt = new HashMap<>();
    for (int x : a) {
        if (cnt.merge(x, 1, Integer::sum) > a.length / 2) return x; // merge returns the new count
    }
    return -1; // problem guarantees a majority exists
}`, alt: [{ lang: 'python', code: `from collections import defaultdict

def majority(a):
    cnt = defaultdict(int)
    for x in a:
        cnt[x] += 1
        if cnt[x] > len(a) // 2:
            return x
    return -1   # problem guarantees a majority exists` }, { lang: 'js', code: `function majority(a) {
  const cnt = new Map();
  for (const x of a) {
    const c = (cnt.get(x) || 0) + 1;
    cnt.set(x, c);
    if (c > Math.floor(a.length / 2)) return x;
  }
  return -1; // problem guarantees a majority exists
}` }, { lang: 'cpp', code: `int majority(const vector<int>& a) {
    unordered_map<int, int> cnt;
    for (int x : a)
        if (++cnt[x] > (int)a.size() / 2) return x;   // ++ returns the new count
    return -1; // problem guarantees a majority exists
}` }] }
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
        code: {
          lang: 'java',
          code: `int firstNonRepeatingBrute(int[] arr) {
    for (int i = 0; i < arr.length; i++) {
        int count = 0;
        for (int j = 0; j < arr.length; j++) {
            if (arr[j] == arr[i]) count++;
        }
        if (count == 1) return arr[i];   // first one in array order
    }
    return 0;
}`,
          alt: [
            { lang: 'python', code: `def first_non_repeating(arr):
    for i in range(len(arr)):
        count = 0
        for j in range(len(arr)):
            if arr[j] == arr[i]:
                count += 1
        if count == 1:
            return arr[i]    # first one in array order
    return 0` },
            { lang: 'js', code: `function firstNonRepeating(arr) {
  for (let i = 0; i < arr.length; i++) {
    let count = 0;
    for (let j = 0; j < arr.length; j++) {
      if (arr[j] === arr[i]) count++;
    }
    if (count === 1) return arr[i];   // first one in array order
  }
  return 0;
}` },
            { lang: 'cpp', code: `int firstNonRepeating(vector<int>& arr) {
    for (size_t i = 0; i < arr.size(); i++) {
        int count = 0;
        for (size_t j = 0; j < arr.size(); j++) {
            if (arr[j] == arr[i]) count++;
        }
        if (count == 1) return arr[i];   // first one in array order
    }
    return 0;
}` }
          ]
        }
      },
      mcq: {
        q: 'After building the count map, why must the second pass loop over the <b>array</b> rather than over the HashMap?',
        options: ['A HashMap does not keep insertion order, so its "first" entry may not be the earliest in the array', 'Looping over a HashMap is O(N<sup>2</sup>)', 'The HashMap might have lost some counts', 'Hash maps cannot be iterated'],
        answer: 0,
        explain: 'HashMap iterates in bucket order. The question asks for the first in ARRAY order, so walk the array (or use a LinkedHashMap).'
      },
      hints: [
        `<p><b>Hint 1:</b> The only thing you need to know about a value is "how many times does it appear in the whole array?" Can you compute that once for all values instead of again and again?</p>`,
        `<p><b>Hint 2:</b> Build a hash-map tally (value → count) in one pass: <code>merge(x, 1, Integer::sum)</code> in Java, <code>Counter</code> in Python, a <code>Map</code> in JavaScript, <code>unordered_map</code> in C++. Values go up to 10<sup>9</sup> (and can be negative), so an array tally will not work.</p>`,
        `<p><b>Hint 3 (recipe):</b> pass 1: count everything. Pass 2: for x in arr (in order) if count[x] == 1 return x. After the loop return 0. Edge cases: single element → that element; everything repeated → 0.</p>`
      ],
      tests: { sig: 'int[] -> int', fn: 'firstNonRepeating', cases: [
  [[[-1, 2, -1, 3, 2]], 3],
  [[[5]], 5],
  [[[1, 1, 2, 2]], 0],
  [[[7, 7, 7, 8]], 8],
  [[[1000000000, -1000000000, 1000000000]], -1000000000],
  [[[0, 0, 4, 5, 4]], 5],
  [[[2, 3, 4]], 2],
  [[[9, 4, 9, 6, 7, 4]], 6]
] },
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
        alt: [{ lang: 'js', code: `function firstNonRepeating(arr) {
  const count = new Map();                       // pass 1: value -> how many times
  for (const x of arr) count.set(x, (count.get(x) || 0) + 1);
  for (const x of arr) if (count.get(x) === 1) return x;   // pass 2: original order
  return 0;
}` }, {
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
        code: {
          lang: 'java',
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
}`,
          alt: [
            { lang: 'python', code: `def is_anagram(s, t):
    if len(s) != len(t):
        return False
    used = [False] * len(t)
    for i in range(len(s)):
        found = False
        for j in range(len(t)):
            if not used[j] and t[j] == s[i]:
                used[j] = True
                found = True
                break
        if not found:
            return False    # s has a letter t cannot match
    return True` },
            { lang: 'js', code: `function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const used = new Array(t.length).fill(false);
  for (let i = 0; i < s.length; i++) {
    let found = false;
    for (let j = 0; j < t.length; j++) {
      if (!used[j] && t[j] === s[i]) { used[j] = true; found = true; break; }
    }
    if (!found) return false;     // s has a letter t cannot match
  }
  return true;
}` },
            { lang: 'cpp', code: `bool isAnagram(string s, string t) {
    if (s.size() != t.size()) return false;
    vector<bool> used(t.size(), false);
    for (size_t i = 0; i < s.size(); i++) {
        bool found = false;
        for (size_t j = 0; j < t.size(); j++) {
            if (!used[j] && t[j] == s[i]) { used[j] = true; found = true; break; }
        }
        if (!found) return false;     // s has a letter t cannot match
    }
    return true;
}` }
          ]
        }
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
      tests: { sig: 'string string -> bool', fn: 'isAnagram', also: { java: ['isAnagramUnicode'] }, cases: [
  [['anagram', 'nagaram'], true],
  [['rat', 'car'], false],
  [['a', 'a'], true],
  [['a', 'ab'], false],
  [['ab', 'ba'], true],
  [['aacc', 'ccac'], false],
  [['zzzz', 'zzzz'], true],
  [['listen', 'silent'], true]
] },
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
        alt: [{ lang: 'js', code: `function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const cnt = new Array(26).fill(0);              // 'a' -> 0 ... 'z' -> 25
  for (let i = 0; i < s.length; i++) {
    cnt[s.charCodeAt(i) - 97]++;                  // s adds
    cnt[t.charCodeAt(i) - 97]--;                  // t removes
  }
  return cnt.every((c) => c === 0);
}` }, { lang: 'cpp', code: `bool isAnagram(string s, string t) {
    if (s.size() != t.size()) return false;
    array<int, 26> cnt{};                          // 'a' -> 0 ... 'z' -> 25
    for (size_t i = 0; i < s.size(); i++) {
        cnt[s[i] - 'a']++;                         // s adds
        cnt[t[i] - 'a']--;                         // t removes
    }
    for (int c : cnt) if (c != 0) return false;
    return true;
}` }, {
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
        code: {
          lang: 'java',
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
}`,
          alt: [
            { lang: 'python', code: `def group_anagrams(strs):
    res = []
    used = [False] * len(strs)
    for i in range(len(strs)):
        if used[i]:
            continue
        group = [strs[i]]
        used[i] = True
        for j in range(i + 1, len(strs)):
            if not used[j] and same_letters(strs[i], strs[j]):
                group.append(strs[j])
                used[j] = True
        res.append(group)
    return res


def same_letters(a, b):
    if len(a) != len(b):
        return False
    cnt = [0] * 26
    for k in range(len(a)):
        cnt[ord(a[k]) - ord('a')] += 1
        cnt[ord(b[k]) - ord('a')] -= 1
    return all(c == 0 for c in cnt)` },
            { lang: 'js', code: `function groupAnagrams(strs) {
  const res = [];
  const used = new Array(strs.length).fill(false);
  for (let i = 0; i < strs.length; i++) {
    if (used[i]) continue;
    const group = [strs[i]];
    used[i] = true;
    for (let j = i + 1; j < strs.length; j++) {
      if (!used[j] && sameLetters(strs[i], strs[j])) { group.push(strs[j]); used[j] = true; }
    }
    res.push(group);
  }
  return res;
}

function sameLetters(a, b) {
  if (a.length !== b.length) return false;
  const cnt = new Array(26).fill(0);
  for (let k = 0; k < a.length; k++) {
    cnt[a.charCodeAt(k) - 97]++;
    cnt[b.charCodeAt(k) - 97]--;
  }
  return cnt.every((c) => c === 0);
}` },
            { lang: 'cpp', code: `bool sameLetters(const string& a, const string& b) {
    if (a.size() != b.size()) return false;
    int cnt[26] = {0};
    for (size_t k = 0; k < a.size(); k++) { cnt[a[k] - 'a']++; cnt[b[k] - 'a']--; }
    for (int c : cnt) if (c != 0) return false;
    return true;
}

vector<vector<string>> groupAnagrams(vector<string>& strs) {
    vector<vector<string>> res;
    vector<bool> used(strs.size(), false);
    for (size_t i = 0; i < strs.size(); i++) {
        if (used[i]) continue;
        vector<string> group = {strs[i]};
        used[i] = true;
        for (size_t j = i + 1; j < strs.size(); j++) {
            if (!used[j] && sameLetters(strs[i], strs[j])) { group.push_back(strs[j]); used[j] = true; }
        }
        res.push_back(group);
    }
    return res;
}` }
          ]
        }
      },
      mcq: {
        q: 'Which key correctly puts all anagrams of a word into the same HashMap bucket?',
        options: ['The word with its letters sorted, e.g. "tea" → "aet"', 'The word\'s length', 'The sum of the letter codes', 'The first and last letter'],
        answer: 0,
        explain: 'Length and letter sums collide for non-anagrams ("ad" and "bc" have the same sum). The sorted string (or a full 26-count signature) is identical exactly for anagrams.'
      },
      hints: [
        `<p><b>Hint 1:</b> Give every word a label that is the <b>same for all its anagrams</b> and different otherwise. Then grouping is just "put words with the same label together".</p>`,
        `<p><b>Hint 2:</b> Label = letters sorted, or the 26 counts joined with "#". Use a map from label to a list of words: <code>computeIfAbsent(key, k -&gt; new ArrayList&lt;&gt;())</code> in Java, <code>defaultdict(list)</code> in Python, a <code>Map</code> of arrays in JavaScript, <code>unordered_map&lt;string, vector&lt;string&gt;&gt;</code> in C++.</p>`,
        `<p><b>Hint 3 (recipe):</b> for each word: key = sort(word); map[key].add(word). Return new ArrayList&lt;&gt;(map.values()). Edge cases: empty string "" (key ""), single word, all words identical.</p>`
      ],
      tests: { sig: 'string[] -> list<list<string>>', fn: 'groupAnagrams', cmp: 'sets', cases: [
  [[['eat', 'tea', 'tan', 'ate', 'nat', 'bat']], [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]],
  [[['']], [['']]],
  [[['a']], [['a']]],
  [[['abc', 'bca', 'cab', 'xyz']], [['abc', 'bca', 'cab'], ['xyz']]],
  [[['ab', 'ba', 'ab']], [['ab', 'ba', 'ab']]],
  [[['', '', 'b', '']], [['', '', ''], ['b']]],
  [[['ddddddddddg', 'dgggggggggg']], [['ddddddddddg'], ['dgggggggggg']]],
  [[['abc', 'def', 'ghi']], [['abc'], ['def'], ['ghi']]]
] },
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
        alt: [{ lang: 'js', code: `function groupAnagrams(strs) {
  const groups = new Map();                       // sorted letters -> words
  for (const w of strs) {
    const key = [...w].sort().join('');           // "tea" -> "aet"
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(w);
  }
  return [...groups.values()];
}` }, { lang: 'cpp', code: `vector<vector<string>> groupAnagrams(vector<string>& strs) {
    unordered_map<string, vector<string>> groups;   // sorted letters -> words
    for (const string& w : strs) {
        string key = w;
        sort(key.begin(), key.end());               // "tea" -> "aet"
        groups[key].push_back(w);
    }
    vector<vector<string>> res;
    for (auto& [key, words] : groups) res.push_back(move(words));
    return res;
}` }, {
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
    code: [{ lang: 'java', code: `
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
}`, alt: [{
      lang: 'python', run: true, title: 'Python (runnable)',
      code: `def two_sum(nums, target):
    seen = {}                       # value -> index
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i                 # insert AFTER checking
    return []

def contains_duplicate(nums):
    seen = set()
    for x in nums:
        if x in seen:
            return True
        seen.add(x)
    return False

def count_pairs(nums, k):
    freq, pairs = {}, 0
    for x in nums:
        pairs += freq.get(k - x, 0)  # every earlier partner makes a pair
        freq[x] = freq.get(x, 0) + 1
    return pairs

print(two_sum([11, 2, 15, 7], 9))         # [1, 3]
print(two_sum([3, 3], 6))                 # [0, 1]
print(contains_duplicate([1, 2, 3, 1]))   # True
print(count_pairs([1, 5, 7, 1, 5], 6))    # 4`
    }, { lang: 'js', run: true, code: `// 2-Sum returning indices: value -> index of where we saw it
function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];   // partner seen earlier
    seen.set(nums[i], i);                             // insert AFTER checking
  }
  return [];
}

// Contains Duplicate: a Set remembers every value seen so far
function containsDuplicate(nums) {
  const seen = new Set();
  for (const x of nums) {
    if (seen.has(x)) return true;
    seen.add(x);
  }
  return false;
}

// Count pairs (i < j) with nums[i] + nums[j] == k, duplicates allowed
function countPairs(nums, k) {
  const freq = new Map();
  let pairs = 0;
  for (const x of nums) {
    pairs += freq.get(k - x) || 0;                    // every earlier partner makes a pair
    freq.set(x, (freq.get(x) || 0) + 1);
  }
  return pairs;
}

console.log(twoSum([11, 2, 15, 7], 9));          // [ 1, 3 ]
console.log(containsDuplicate([1, 2, 3, 1]));    // true
console.log(countPairs([1, 5, 7, 1, 5], 6));     // 4` }, { lang: 'cpp', code: `#include <bits/stdc++.h>
using namespace std;

// 2-Sum returning indices: value -> index of where we saw it
vector<int> twoSum(const vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    for (int i = 0; i < (int)nums.size(); i++) {
        auto it = seen.find(target - nums[i]);
        if (it != seen.end()) return {it->second, i};   // partner seen earlier
        seen[nums[i]] = i;                              // insert AFTER checking
    }
    return {};
}

// Contains Duplicate: insert().second is false if the value was already present
bool containsDuplicate(const vector<int>& nums) {
    unordered_set<int> seen;
    for (int x : nums) if (!seen.insert(x).second) return true;
    return false;
}

// Count pairs (i < j) with nums[i] + nums[j] == k, duplicates allowed
long long countPairs(const vector<int>& nums, int k) {
    unordered_map<int, int> freq;
    long long pairs = 0;
    for (int x : nums) {
        auto it = freq.find(k - x);
        if (it != freq.end()) pairs += it->second;     // every earlier partner makes a pair
        freq[x]++;
    }
    return pairs;
}

int main() {
    auto r = twoSum({11, 2, 15, 7}, 9);
    cout << "[" << r[0] << ", " << r[1] << "]\\n";                       // [1, 3]
    cout << boolalpha << containsDuplicate({1, 2, 3, 1}) << "\\n";       // true
    cout << countPairs({1, 5, 7, 1, 5}, 6) << "\\n";                     // 4
}` }] }],
    codeTitle: 'Lookup patterns',
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
      code: { lang: 'java', code: `boolean pairWithDiff(int[] a, int k) {
    Set<Integer> seen = new HashSet<>();
    for (int x : a) {
        if (seen.contains(x - k) || seen.contains(x + k)) return true;
        seen.add(x);
    }
    return false;
}`, alt: [{ lang: 'python', code: `def pair_with_diff(a, k):
    seen = set()
    for x in a:
        if x - k in seen or x + k in seen:
            return True
        seen.add(x)
    return False` }, { lang: 'js', code: `function pairWithDiff(a, k) {
  const seen = new Set();
  for (const x of a) {
    if (seen.has(x - k) || seen.has(x + k)) return true;
    seen.add(x);
  }
  return false;
}` }, { lang: 'cpp', code: `bool pairWithDiff(const vector<int>& a, int k) {
    unordered_set<int> seen;
    for (int x : a) {
        if (seen.count(x - k) || seen.count(x + k)) return true;
        seen.insert(x);
    }
    return false;
}` }] }
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
        code: {
          lang: 'java',
          code: `int[] twoSumBrute(int[] nums, int target) {
    for (int i = 0; i < nums.length; i++) {
        for (int j = i + 1; j < nums.length; j++) {
            if (nums[i] + nums[j] == target) return new int[]{i, j};
        }
    }
    return new int[0];
}`,
          alt: [
            { lang: 'python', code: `def two_sum(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []` },
            { lang: 'js', code: `function twoSum(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) return [i, j];
    }
  }
  return [];
}` },
            { lang: 'cpp', code: `vector<int> twoSum(vector<int>& nums, int target) {
    for (size_t i = 0; i < nums.size(); i++) {
        for (size_t j = i + 1; j < nums.size(); j++) {
            if (nums[i] + nums[j] == target) return {(int)i, (int)j};
        }
    }
    return {};
}` }
          ]
        }
      },
      mcq: {
        q: 'nums = [3, 2, 4], target = 6. You insert nums[i] into the map BEFORE checking for its complement. What goes wrong?',
        options: ['At i = 0 you find 3 (itself) and return [0, 0]', 'Nothing — the order of insert and check never matters', 'You miss the answer [1, 2]', 'It throws a NullPointerException'],
        answer: 0,
        explain: '6 − 3 = 3 is found immediately because you just inserted it. Checking first guarantees the map only holds EARLIER indices, so the answer is [1, 2].'
      },
      hints: [
        `<p><b>Hint 1:</b> For a fixed nums[i], the partner is not a mystery — it must be exactly <code>target − nums[i]</code>. The only question is "have I already seen that value, and where?"</p>`,
        `<p><b>Hint 2:</b> Keep a hash map (<code>HashMap</code> / <code>dict</code> / <code>Map</code> / <code>unordered_map</code>) from value → index of everything to the left of i. One lookup per element.</p>`,
        `<p><b>Hint 3 (recipe):</b> for i in 0..N−1: need = target − nums[i]; if map has need → return [map[need], i]; else map[nums[i]] = i. Check BEFORE inserting so you never use the same element twice; duplicates like [3,3] work naturally.</p>`
      ],
      tests: { sig: 'int[] int -> int[]', fn: 'twoSum', cmp: 'set', cases: [
  [[[2, 7, 11, 15], 9], [0, 1]],
  [[[11, 2, 15, 7], 9], [1, 3]],
  [[[3, 3], 6], [0, 1]],
  [[[3, 2, 4], 6], [1, 2]],
  [[[-1, -2, -3, -4, -5], -8], [2, 4]],
  [[[0, 4, 3, 0], 0], [0, 3]],
  [[[1000000000, -1000000000, 5], 0], [0, 1]],
  [[[1000000000, -1000000000, 7, -7, 2], -999999998], [1, 4]]
] },
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
        alt: [{ lang: 'js', code: `function twoSum(nums, target) {
  const seen = new Map();                 // value -> index (earlier indices only)
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}` }, {
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

<h4>"Decrement and delete at zero" in each language</h4>
<pre>cnt.computeIfPresent(out, (key, v) -&gt; v == 1 ? null : v - 1);</pre>
<p>In Java, returning <code>null</code> from the function removes the key. One lookup, no leftover zero rows. Python: <code>cnt[out] -= 1</code>, then <code>del cnt[out]</code> when it reaches 0. JavaScript: <code>cnt.delete(out)</code> when the count would reach 0, else <code>cnt.set(out, c - 1)</code>. C++: <code>if (--cnt[out] == 0) cnt.erase(out);</code>.</p>

<p><b>This is the foundation</b> of every "sliding window + hashing" problem later in the module (longest substring without repeats, minimum window substring, at most K distinct, find all anagrams): the window keeps a frequency map that is updated in O(1) per step.</p>`,
    clues: [
      '"for every window / subarray of size K" + "distinct / unique / different" → window frequency map',
      '"count of distinct elements in each window" (GfG classic) → add in, remove out, delete at 0, answer = map.size()',
      '"duplicate within distance k" (Contains Duplicate II) → set holding only the last k elements',
      '"fixed-size window" + any "how many of each" question → counts, not a plain set',
      'N up to 10<sup>5</sup>–10<sup>6</sup> and K large → O(N·K) recount is too slow, need O(N)',
      '"unique visitors in the last K minutes" (system design) → same idea; at huge scale use HyperLogLog'
    ],
    code: [{ lang: 'java', code: `
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
}`, alt: [{
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

def contains_nearby_duplicate(a, k):
    window = set()                        # holds at most k latest values
    for i, x in enumerate(a):
        if x in window:
            return True                   # same value inside the window
        window.add(x)
        if len(window) > k:
            window.remove(a[i - k])       # keep only the last k
    return False

print(distinct_in_windows([1, 2, 1, 3, 4, 2, 3], 4))       # [3, 4, 4, 3]
print(distinct_in_windows([1, 1, 1, 1], 2))                # [1, 1, 1]
print(contains_nearby_duplicate([1, 2, 3, 1], 3))          # True
print(contains_nearby_duplicate([1, 2, 3, 1, 2, 3], 2))    # False`
    }, { lang: 'js', run: true, code: `// Distinct count of every window of size k. O(N) average.
function distinctInWindows(arr, k) {
  const cnt = new Map();
  const res = [];
  for (let i = 0; i < arr.length; i++) {
    cnt.set(arr[i], (cnt.get(arr[i]) || 0) + 1);       // 1) element enters
    if (i >= k) {
      const out = arr[i - k];                          // 2) element leaves
      const c = cnt.get(out) - 1;
      if (c === 0) cnt.delete(out); else cnt.set(out, c);   // delete at 0
    }
    if (i >= k - 1) res.push(cnt.size);                // 3) window complete: answer
  }
  return res;
}

// Contains Duplicate II: is there i != j with a[i] == a[j] and |i - j| <= k ?
function containsNearbyDuplicate(a, k) {
  const window = new Set();                            // holds at most k latest values
  for (let i = 0; i < a.length; i++) {
    if (window.has(a[i])) return true;
    window.add(a[i]);
    if (window.size > k) window.delete(a[i - k]);      // keep only the last k
  }
  return false;
}

console.log(distinctInWindows([1, 2, 1, 3, 4, 2, 3], 4));      // [ 3, 4, 4, 3 ]
console.log(containsNearbyDuplicate([1, 2, 3, 1], 3));         // true
console.log(containsNearbyDuplicate([1, 2, 3, 1, 2, 3], 2));   // false` }, { lang: 'cpp', code: `#include <bits/stdc++.h>
using namespace std;

// Distinct count of every window of size k. O(N) average.
vector<int> distinctInWindows(const vector<int>& arr, int k) {
    unordered_map<int, int> cnt;
    vector<int> res;
    for (int i = 0; i < (int)arr.size(); i++) {
        cnt[arr[i]]++;                                          // 1) element enters
        if (i >= k && --cnt[arr[i - k]] == 0) cnt.erase(arr[i - k]);   // 2) leaves; erase at 0
        if (i >= k - 1) res.push_back(cnt.size());              // 3) window complete: answer
    }
    return res;
}

// Contains Duplicate II: is there i != j with a[i] == a[j] and |i - j| <= k ?
bool containsNearbyDuplicate(const vector<int>& a, int k) {
    unordered_set<int> window;                                  // at most k latest values
    for (int i = 0; i < (int)a.size(); i++) {
        if (!window.insert(a[i]).second) return true;
        if ((int)window.size() > k) window.erase(a[i - k]);     // keep only the last k
    }
    return false;
}

int main() {
    for (int d : distinctInWindows({1, 2, 1, 3, 4, 2, 3}, 4)) cout << d << " ";   // 3 4 4 3
    cout << "\\n" << boolalpha;
    cout << containsNearbyDuplicate({1, 2, 3, 1}, 3) << "\\n";         // true
    cout << containsNearbyDuplicate({1, 2, 3, 1, 2, 3}, 2) << "\\n";   // false
}` }] }],
    codeTitle: 'Window frequency map',
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
      code: { lang: 'java', code: `List<Integer> distinctSmallRange(int[] a, int k, int maxVal) {
    int[] cnt = new int[maxVal + 1];
    int distinct = 0;
    List<Integer> res = new ArrayList<>();
    for (int i = 0; i < a.length; i++) {
        if (cnt[a[i]]++ == 0) distinct++;              // 0 -> 1: a new distinct value
        if (i >= k && --cnt[a[i - k]] == 0) distinct--; // 1 -> 0: value fully left
        if (i >= k - 1) res.add(distinct);
    }
    return res;
}`, alt: [{ lang: 'python', code: `def distinct_small_range(a, k, max_val):
    cnt, distinct, res = [0] * (max_val + 1), 0, []
    for i, x in enumerate(a):
        if cnt[x] == 0:
            distinct += 1                  # 0 -> 1: a new distinct value
        cnt[x] += 1
        if i >= k:
            cnt[a[i - k]] -= 1
            if cnt[a[i - k]] == 0:
                distinct -= 1              # 1 -> 0: value fully left
        if i >= k - 1:
            res.append(distinct)
    return res` }, { lang: 'js', code: `function distinctSmallRange(a, k, maxVal) {
  const cnt = new Int32Array(maxVal + 1);
  let distinct = 0;
  const res = [];
  for (let i = 0; i < a.length; i++) {
    if (cnt[a[i]]++ === 0) distinct++;                 // 0 -> 1: a new distinct value
    if (i >= k && --cnt[a[i - k]] === 0) distinct--;   // 1 -> 0: value fully left
    if (i >= k - 1) res.push(distinct);
  }
  return res;
}` }, { lang: 'cpp', code: `vector<int> distinctSmallRange(const vector<int>& a, int k, int maxVal) {
    vector<int> cnt(maxVal + 1, 0), res;
    int distinct = 0;
    for (int i = 0; i < (int)a.size(); i++) {
        if (cnt[a[i]]++ == 0) distinct++;              // 0 -> 1: a new distinct value
        if (i >= k && --cnt[a[i - k]] == 0) distinct--; // 1 -> 0: value fully left
        if (i >= k - 1) res.push_back(distinct);
    }
    return res;
}` }] }
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
        code: {
          lang: 'java',
          code: `List<Integer> countDistinctBrute(int[] arr, int k) {
    List<Integer> res = new ArrayList<>();
    for (int start = 0; start + k <= arr.length; start++) {
        Set<Integer> seen = new HashSet<>();
        for (int j = start; j < start + k; j++) seen.add(arr[j]);
        res.add(seen.size());
    }
    return res;
}`,
          alt: [
            { lang: 'python', code: `def count_distinct(arr, k):
    res = []
    for start in range(len(arr) - k + 1):
        seen = set()
        for j in range(start, start + k):
            seen.add(arr[j])
        res.append(len(seen))
    return res` },
            { lang: 'js', code: `function countDistinct(arr, k) {
  const res = [];
  for (let start = 0; start + k <= arr.length; start++) {
    const seen = new Set();
    for (let j = start; j < start + k; j++) seen.add(arr[j]);
    res.push(seen.size);
  }
  return res;
}` },
            { lang: 'cpp', code: `vector<int> countDistinct(vector<int>& arr, int k) {
    vector<int> res;
    for (int start = 0; start + k <= (int)arr.size(); start++) {
        unordered_set<int> seen;
        for (int j = start; j < start + k; j++) seen.insert(arr[j]);
        res.push_back((int)seen.size());
    }
    return res;
}` }
          ]
        }
      },
      mcq: {
        q: 'The window [1, 2, 1, 3] slides right; the 1 at index 0 leaves. What should happen to key 1 in the count map?',
        options: ['Its count goes from 2 to 1 and the key stays', 'The key is removed because 1 left the window', 'Nothing — we only add elements', 'The count is reset to 0'],
        answer: 0,
        explain: 'Another 1 (index 2) is still inside the window. Only when a count reaches 0 do we delete the key.'
      },
      hints: [
        `<p><b>Hint 1:</b> Neighbouring windows differ by exactly two elements: one enters on the right, one leaves on the left. Update, don't rebuild.</p>`,
        `<p><b>Hint 2:</b> A set cannot handle duplicates leaving; keep a hash map value → count of the current window. Distinct count = number of keys.</p>`,
        `<p><b>Hint 3 (recipe):</b> for i in 0..N−1: cnt[arr[i]]++; if i ≥ K: decrement cnt[arr[i−K]] and delete it at 0; if i ≥ K−1: append cnt.size(). Edge cases: K = 1 (all ones), K = N (one answer), all equal values.</p>`
      ],
      tests: { sig: 'int[] int -> list<int>', fn: 'countDistinct', cases: [
  [[[1, 2, 1, 3, 4, 2, 3], 4], [3, 4, 4, 3]],
  [[[5], 1], [1]],
  [[[1, 2, 3], 3], [3]],
  [[[4, 4, 4, 4], 2], [1, 1, 1]],
  [[[1, 2, 3, 4], 1], [1, 1, 1, 1]],
  [[[1, 2, 1, 2, 1], 3], [2, 2, 2]],
  [[[1, 1, 2, 2, 3, 3], 2], [1, 2, 1, 2, 1]],
  [[[100000, 1, 100000, 1], 2], [2, 2, 2]]
] },
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
        alt: [{ lang: 'js', code: `function countDistinct(arr, k) {
  const cnt = new Map();                  // value -> copies inside the window
  const res = [];
  for (let i = 0; i < arr.length; i++) {
    cnt.set(arr[i], (cnt.get(arr[i]) || 0) + 1);     // enter
    if (i >= k) {
      const out = arr[i - k];                        // leave
      const c = cnt.get(out) - 1;
      if (c === 0) cnt.delete(out); else cnt.set(out, c);
    }
    if (i >= k - 1) res.push(cnt.size);
  }
  return res;
}` }, {
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

  /* =====================================================================
     TOPIC 5 — Prefix sum + HashSet: zero-sum subarray exists?
     ===================================================================== */
  topics.push({
    title: 'Prefix Sum + HashSet: Does a Zero-Sum Subarray Exist?',
    analogy: `<p>Check your <b>bank balance on Monday</b>: ₹500. Money comes in and goes out all week. On <b>Friday</b> you check again: ₹500. You do not need the statement to know one thing for sure: <b>everything between Monday and Friday cancelled out</b> — the net change was exactly zero.</p>
<p>A running balance is a <b>prefix sum</b>. "Have I seen this exact balance before?" is a <b>HashSet</b> question. The moment a balance repeats, the transactions in between form a <b>zero-sum subarray</b>.</p>`,
    explain: `<p><b>Problem:</b> does some non-empty contiguous subarray sum to 0? The array can contain <b>negative</b> numbers, which is exactly why the sliding-window trick from DSA 6 fails (adding an element can make the sum go up <i>or</i> down, so "shrink when too big" makes no sense).</p>

<h4>Step 1 — running balance (prefix sum)</h4>
<p><code>pf[i] = arr[0] + arr[1] + … + arr[i]</code>. The sum of any subarray <code>l..r</code> is <code>pf[r] − pf[l−1]</code> (the balance at the end minus the balance just before the start).</p>
${H.arr([4, 2, -3, 1, 6], { label: 'arr', hl: { 1: 'g', 2: 'g', 3: 'g' } })}
${H.arr([4, 6, 3, 4, 10], { label: 'pf', hl: { 0: 'r', 3: 'r' } })}

<h4>Step 2 — zero sum means a repeated balance</h4>
<p><code>pf[r] − pf[l−1] = 0</code> ⇔ <code>pf[r] == pf[l−1]</code>. Above, pf[0] = 4 and pf[3] = 4, so the subarray <b>1..3</b> = [2, −3, 1] sums to 0. We only need to ask, at each step, "<b>is this balance already in my set?</b>"</p>

<h4>Step 3 — the seed {0}</h4>
<p>What about a subarray that starts at index 0, like [1, −1]? Its sum is <code>pf[r] − pf[−1]</code>, where <code>pf[−1]</code> is the balance <b>before any transaction = 0</b>. So we put <b>0 in the set before the loop</b>. Then pf = 0 at any point also counts as a repeat.</p>
${H.table(['i', 'arr[i]', 'pf', 'set before', 'in set?'], [['—', '—', '0 (seed)', '{}', 'insert'], ['0', '4', '4', '{0}', H.c('g', 'no → insert')], ['1', '2', '6', '{0, 4}', H.c('g', 'no → insert')], ['2', '−3', '3', '{0, 4, 6}', H.c('g', 'no → insert')], ['3', '1', '4', '{0, 4, 6, 3}', H.c('r', 'YES → zero-sum found')]])}

<h4>Step 4 — the code is five lines</h4>
<pre>Set&lt;Long&gt; seen = new HashSet&lt;&gt;(); seen.add(0L);
long pf = 0;
for (int x : a) { pf += x; if (!seen.add(pf)) return true; }
return false;</pre>
<p>In Java, <code>seen.add(pf)</code> returns <b>false</b> when pf was already present — the repeat check and the insert in one call. C++ has the same trick: <code>seen.insert(pf).second</code> is false on a repeat. In Python and JavaScript, check <code>pf in seen</code> / <code>seen.has(pf)</code> first, then add. Use a 64-bit integer (<code>long</code> in Java, <code>long long</code> in C++): 10<sup>5</sup> values of 10<sup>9</sup> sum to 10<sup>14</sup>, far beyond a 32-bit int. Python integers never overflow, and a JavaScript <code>Number</code> is exact up to 2<sup>53</sup>, which is enough here.</p>

<h4>The family this unlocks</h4>
${H.table(['question', 'store in the hash', 'topic'], [['zero-sum subarray exists?', 'HashSet of prefix sums, seed {0}', 'this one'], ['how many subarrays sum to K?', 'HashMap prefix → count, seed {0:1}', 'next topic'], ['longest subarray with sum 0 / K?', 'HashMap prefix → first index, seed {0:−1}', 'topic 7'], ['equal 0s and 1s', 'turn 0 into −1, then "longest sum 0"', 'topic 7']])}`,
    clues: [
      '"contiguous subarray" + "sum = 0" / "sum = K" → prefix sum + hashing',
      '"array contains negative numbers" → sliding window will not work, use prefix sums',
      '"does there exist" → HashSet; "how many" → map of counts; "longest" → map of first index',
      '"net change zero", "balanced", "returns to the same level", "same balance twice" → repeated prefix sum',
      'N ≤ 10<sup>5</sup>, |a[i]| ≤ 10<sup>9</sup> → O(N) and use long for the running sum',
      '"subarray sum divisible by K" → repeated prefix sum <b>mod K</b> (same idea)'
    ],
    code: [{ lang: 'java', code: `
import java.util.*;

public class ZeroSum {
    // true if some non-empty contiguous subarray sums to 0
    static boolean hasZeroSum(int[] a) {
        Set<Long> seen = new HashSet<>();
        seen.add(0L);                       // balance before any element (empty prefix)
        long pf = 0;
        for (int x : a) {
            pf += x;                        // running balance
            if (!seen.add(pf)) return true; // add() == false -> this balance appeared before
        }
        return false;
    }

    // Variant: return the [l, r] of one zero-sum subarray (or null)
    static int[] findZeroSum(int[] a) {
        Map<Long, Integer> firstAt = new HashMap<>();
        firstAt.put(0L, -1);                // pf = 0 "happened" before index 0
        long pf = 0;
        for (int i = 0; i < a.length; i++) {
            pf += a[i];
            Integer prev = firstAt.get(pf);
            if (prev != null) return new int[]{prev + 1, i};  // a[prev+1..i] sums to 0
            firstAt.put(pf, i);
        }
        return null;
    }

    public static void main(String[] args) {
        System.out.println(hasZeroSum(new int[]{4, 2, -3, 1, 6}));                  // true
        System.out.println(hasZeroSum(new int[]{1, 2, 3}));                         // false
        System.out.println(Arrays.toString(findZeroSum(new int[]{4, 2, -3, 1, 6}))); // [1, 3]
        System.out.println(Arrays.toString(findZeroSum(new int[]{1, -1})));         // [0, 1]
    }
}`, alt: [{
      lang: 'python', run: true, title: 'Python (runnable)',
      code: `def has_zero_sum(a):
    seen, pf = {0}, 0           # seed: the empty prefix has sum 0
    for x in a:
        pf += x
        if pf in seen:
            return True
        seen.add(pf)
    return False

def find_zero_sum(a):
    first_at, pf = {0: -1}, 0   # pf = 0 "happened" before index 0
    for i, x in enumerate(a):
        pf += x
        if pf in first_at:
            return [first_at[pf] + 1, i]   # a[prev+1..i] sums to 0
        first_at[pf] = i
    return None

for arr in ([4, 2, -3, 1, 6], [1, 2, 3], [1, -1], [3, 0, 5], [-3, 2, 3, 1, 6]):
    print(arr, "->", has_zero_sum(arr))
print(find_zero_sum([4, 2, -3, 1, 6]))   # [1, 3]
print(find_zero_sum([1, -1]))            # [0, 1]`
    }, { lang: 'js', run: true, code: `// true if some non-empty contiguous subarray sums to 0
function hasZeroSum(a) {
  const seen = new Set([0]);         // balance before any element (empty prefix)
  let pf = 0;
  for (const x of a) {
    pf += x;                         // running balance
    if (seen.has(pf)) return true;   // this balance appeared before
    seen.add(pf);
  }
  return false;
}

// Variant: return [l, r] of one zero-sum subarray (or null)
function findZeroSum(a) {
  const firstAt = new Map([[0, -1]]); // pf = 0 "happened" before index 0
  let pf = 0;
  for (let i = 0; i < a.length; i++) {
    pf += a[i];
    if (firstAt.has(pf)) return [firstAt.get(pf) + 1, i];   // a[prev+1..i] sums to 0
    firstAt.set(pf, i);
  }
  return null;
}

console.log(hasZeroSum([4, 2, -3, 1, 6]));    // true
console.log(hasZeroSum([1, 2, 3]));           // false
console.log(findZeroSum([4, 2, -3, 1, 6]));   // [ 1, 3 ]
console.log(findZeroSum([1, -1]));            // [ 0, 1 ]` }, { lang: 'cpp', code: `#include <bits/stdc++.h>
using namespace std;

// true if some non-empty contiguous subarray sums to 0
bool hasZeroSum(const vector<int>& a) {
    unordered_set<long long> seen{0};   // balance before any element (empty prefix)
    long long pf = 0;
    for (int x : a) {
        pf += x;                                     // running balance
        if (!seen.insert(pf).second) return true;    // this balance appeared before
    }
    return false;
}

// Variant: return {l, r} of one zero-sum subarray, or nullopt
optional<pair<int, int>> findZeroSum(const vector<int>& a) {
    unordered_map<long long, int> firstAt{{0, -1}};  // pf = 0 "happened" before index 0
    long long pf = 0;
    for (int i = 0; i < (int)a.size(); i++) {
        pf += a[i];
        auto it = firstAt.find(pf);
        if (it != firstAt.end()) return make_pair(it->second + 1, i);   // a[prev+1..i] sums to 0
        firstAt[pf] = i;
    }
    return nullopt;
}

int main() {
    cout << boolalpha << hasZeroSum({4, 2, -3, 1, 6}) << "\\n";   // true
    cout << hasZeroSum({1, 2, 3}) << "\\n";                       // false
    auto r = findZeroSum({4, 2, -3, 1, 6});
    if (r) cout << "[" << r->first << ", " << r->second << "]\\n"; // [1, 3]
}` }] }],
    codeTitle: 'Zero-sum subarray (exists + find)',
    viz: [{
      title: 'Running balance as bars + HashSet: spot the repeated balance',
      input: '4 2 -3 1 6',
      inputLabel: 'Array (whole numbers incl. negatives, at most 14)',
      gen: function (input) {
        var a = parseNums(input, 14, 'array'), seen = [0], pf = 0, pfs = [], frames = [];
        frames.push({ narr: 'Seed the set with <b>0</b>: the balance before any transaction. This lets us catch zero-sum subarrays that start at index 0.', parts: [{ type: 'array', label: 'arr', values: a.slice() }, { type: 'set', label: 'balances seen (HashSet)', items: seen.slice(), hl: { '0': 'ok' } }, { type: 'code', label: 'code', lang: 'java', code: ZS_CODE, hl: { 1: 'cur' }, alt: ZS_ALT }] });
        for (var i = 0; i < a.length; i++) {
          pf += a[i]; pfs.push(pf);
          var dup = seen.indexOf(pf) >= 0;
          var bhl = {}; bhl[i] = dup ? 'bad' : 'ok';
          if (dup) {
            var j = -1;
            for (var q = 0; q < i; q++) if (pfs[q] === pf) { j = q; break; }
            var start = j + 1;                      // j = -1 means the match was the seed 0
            if (j >= 0) bhl[j] = 'bad';
            frames.push({ narr: 'i = ' + i + ': balance = ' + (pf - a[i]) + ' + (' + a[i] + ') = <b>' + pf + '</b>. <span class="c-r">Already in the set!</span> The same balance appeared ' + (j < 0 ? 'before index 0 (the seed 0)' : 'after index ' + j) + ', so arr[' + start + '..' + i + '] sums to <b>0</b>.', parts: [{ type: 'array', label: 'arr', values: a.slice(), range: [start, i], ptr: one(i, 'i') }, { type: 'bars', label: 'running balance pf[i]', values: pfs.slice(), hl: bhl }, { type: 'set', label: 'balances seen (HashSet)', items: seen.slice(), hl: one(pf, 'bad') }, { type: 'code', label: 'code', lang: 'java', code: ZS_CODE, hl: { 4: 'bad' }, alt: ZS_ALT }] });
            frames.push({ narr: 'Answer: <b>true</b>. The highlighted window [' + a.slice(start, i + 1).join(', ') + '] has sum 0 — Monday\'s balance equals Friday\'s.', parts: [{ type: 'array', label: 'arr', values: a.slice(), hl: rng(start, i, 'sel') }, { type: 'vars', vals: { answer: true, subarray: start + '..' + i }, hl: { answer: 'sel' } }] });
            return frames;
          }
          seen.push(pf);
          frames.push({ narr: 'i = ' + i + ': balance = <b>' + pf + '</b>. New balance → <span class="c-g">insert</span> into the set.', parts: [{ type: 'array', label: 'arr', values: a.slice(), ptr: one(i, 'i'), hl: one(i, 'cur') }, { type: 'bars', label: 'running balance pf[i]', values: pfs.slice(), hl: bhl }, { type: 'set', label: 'balances seen (HashSet)', items: seen.slice(), hl: one(pf, 'ok') }, { type: 'code', label: 'code', lang: 'java', code: ZS_CODE, hl: { 3: 'cur', 4: 'ok' }, alt: ZS_ALT }] });
        }
        frames.push({ narr: 'No balance ever repeated → <b>false</b>: no zero-sum subarray.', parts: [{ type: 'bars', label: 'running balance', values: pfs.slice() }, { type: 'set', label: 'balances seen', items: seen.slice() }, { type: 'vars', vals: { answer: false }, hl: { answer: 'sel' } }] });
        return frames;
      }
    }, {
      title: 'List EVERY zero-sum subarray: map balance → all indices where it occurred',
      input: '6 -1 -3 4 -2 2 4 6 -12 -7',
      inputLabel: 'Array (at most 12 numbers)',
      gen: function (input) {
        var a = parseNums(input, 12, 'array'), m = new Map(), pf = 0, found = [], frames = [];
        m.set(0, [-1]);
        frames.push({ narr: 'To list all zero-sum subarrays, remember <b>every</b> index where each balance occurred (seed: balance 0 at index −1). Each earlier occurrence of the current balance gives one subarray.', parts: [{ type: 'array', label: 'arr', values: a.slice() }, { type: 'map', label: 'balance → indices', entries: ents(m), hl: { '0': 'ok' } }] });
        for (var i = 0; i < a.length; i++) {
          pf += a[i];
          var prev = m.get(pf), newOnes = [];
          if (prev) prev.forEach(function (p) { newOnes.push((p + 1) + '..' + i); found.push((p + 1) + '..' + i); });
          if (prev) {
            frames.push({ narr: 'i = ' + i + ', balance <b>' + pf + '</b> seen before at index(es) ' + prev.join(', ') + ' → <span class="c-r">' + prev.length + ' zero-sum subarray(s)</span>: ' + newOnes.join(', ') + '.', parts: [{ type: 'array', label: 'arr', values: a.slice(), range: [prev[prev.length - 1] + 1, i], ptr: one(i, 'i') }, { type: 'map', label: 'balance → indices', entries: ents(m), hl: one(pf, 'bad') }, { type: 'vars', vals: { pf: pf, 'found so far': found.length } }] });
            prev.push(i);
          } else {
            m.set(pf, [i]);
            frames.push({ narr: 'i = ' + i + ', balance <b>' + pf + '</b> is new → <span class="c-g">insert</span> ' + pf + ' → [' + i + '].', parts: [{ type: 'array', label: 'arr', values: a.slice(), ptr: one(i, 'i'), hl: one(i, 'cur') }, { type: 'map', label: 'balance → indices', entries: ents(m), hl: one(pf, 'ok') }, { type: 'vars', vals: { pf: pf, 'found so far': found.length } }] });
          }
        }
        frames.push({ narr: 'All zero-sum subarrays: <b>' + (found.length ? found.join(', ') : 'none') + '</b> (' + found.length + ' total). Counting them only needs counts, not index lists — that is the next topic.', parts: [{ type: 'map', label: 'final balance → indices', entries: ents(m) }, { type: 'vars', vals: { total: found.length }, hl: { total: 'sel' } }] });
        return frames;
      }
    }],
    examples: [{
      title: 'All positive numbers → always false',
      html: `<p>arr = [3, 1, 4, 1, 5]: balances 3, 4, 8, 9, 14 — strictly increasing, so no value can repeat, and none equals the seed 0. Positives-only arrays never have a zero-sum subarray (and you could even use sliding window there).</p>`
    }, {
      title: 'A single zero is a zero-sum subarray',
      html: `<p>arr = [3, 0, 5]: balances 3, <b>3</b>, 8. The balance repeats immediately at index 1 → subarray [1..1] = [0]. The algorithm needs no special case for zeros.</p>`
    }, {
      title: 'Starts at index 0 — why the seed matters',
      html: `<p>arr = [−3, 2, 1, 6]: balances −3, −1, <b>0</b>, 6. Without the seed {0}, no balance repeats and you would wrongly answer false. With the seed, pf = 0 at index 2 matches the "before the start" balance → subarray [0..2] = [−3, 2, 1].</p>`,
      code: { lang: 'java', code: `boolean hasZeroSum(int[] a) {
    Set<Long> seen = new HashSet<>();
    seen.add(0L);                       // remove this line and the answer below becomes false
    long pf = 0;
    for (int x : a) { pf += x; if (!seen.add(pf)) return true; }
    return false;
}

void demo() {
    System.out.println(hasZeroSum(new int[]{-3, 2, 1, 6})); // true only because of seen.add(0L)
}`, alt: [{ lang: 'python', code: `def has_zero_sum(a):
    seen = {0}                       # remove the 0 and the answer below becomes False
    pf = 0
    for x in a:
        pf += x
        if pf in seen:
            return True
        seen.add(pf)
    return False

print(has_zero_sum([-3, 2, 1, 6]))   # True only because of the seed 0` }, { lang: 'js', code: `function hasZeroSum(a) {
  const seen = new Set([0]);          // remove the 0 and the answer below becomes false
  let pf = 0;
  for (const x of a) { pf += x; if (seen.has(pf)) return true; seen.add(pf); }
  return false;
}

console.log(hasZeroSum([-3, 2, 1, 6])); // true only because of the seed 0` }, { lang: 'cpp', code: `bool hasZeroSum(const vector<int>& a) {
    unordered_set<long long> seen{0};    // remove the 0 and the answer below becomes false
    long long pf = 0;
    for (int x : a) { pf += x; if (!seen.insert(pf).second) return true; }
    return false;
}

void demo() {
    cout << boolalpha << hasZeroSum({-3, 2, 1, 6}) << "\\n"; // true only because of the seed 0
}` }] }
    }, {
      title: 'Bank statement in real life',
      html: `${H.table(['day', 'transaction', 'balance'], [['start', '—', '₹1000'], ['Mon', '+500', '₹1500'], ['Tue', '−200', '₹1300'], ['Wed', '−300', H.c('r', '₹1000')], ['Thu', '+100', '₹1100']])}
<p>The balance after Wednesday equals the opening balance → Monday..Wednesday netted to 0 (500 − 200 − 300). The starting balance plays the role of the seed.</p>`
    }],
    deepDive: `<p><b>Proof.</b> Let P<sub>−1</sub> = 0 and P<sub>i</sub> = a<sub>0</sub> + … + a<sub>i</sub>. A non-empty subarray l..r has sum P<sub>r</sub> − P<sub>l−1</sub>, with −1 ≤ l−1 &lt; r. So a zero-sum subarray exists ⇔ two of the N+1 values P<sub>−1</sub>..P<sub>N−1</sub> are equal. The algorithm inserts them in order and reports the first duplicate — exactly that condition.</p>
<p><b>No-hash alternative.</b> Sort the N+1 prefix sums and check neighbours: O(N log N) time, no hashing, works when the input is huge and adversarial. Hashing wins on average speed; sorting wins on predictable worst case.</p>
<p><b>Pigeonhole connection (DSA 3).</b> For "is there a non-empty subarray whose sum is divisible by N?" the answer is <b>always yes</b>: there are N+1 prefix sums mod N but only N possible remainders, so two must collide. The same hashing code finds it — just store <code>pf mod N</code>.</p>
<p><b>Overflow and boxing.</b> Use <code>long</code> for pf. A <code>HashSet&lt;Long&gt;</code> boxes every value (≈16 bytes per Long + ≈32-byte node). For N = 10<sup>6</sup> that is still fine; for 10<sup>8</sup> streaming values use a primitive long hash set or sort-based detection. Beware: <code>seen.add(0)</code> on a <code>Set&lt;Long&gt;</code> does not compile in Java (int autoboxes to Integer) — write <code>0L</code>. With <code>Set&lt;Object&gt;</code> it would compile and silently store an Integer that never equals any Long.</p>
<p><b>Streaming / early exit.</b> The algorithm is online: it can answer "has a zero-sum window appeared yet?" as values arrive and stops at the first hit. In finance and telemetry this is how "back to the same level" events are detected in real time.</p>
<p><b>Adversarial inputs.</b> Long.hashCode is <code>(int)(v ^ (v &gt;&gt;&gt; 32))</code>; an attacker can craft prefix sums that collide. Java's treeify keeps that at O(log N) per operation since Long is Comparable.</p>`,
    aiEra: `<p><b>What AI changes:</b> "subarray sum equals zero/K" is a top-10 pattern and assistants recall it well. The bugs they introduce are subtle: a missing seed, int overflow, or a HashSet where a map was needed. Your job is to spot those in seconds.</p>
<p><b>Use AI as a partner:</b> <code>Give me 6 arrays where a zero-sum subarray starts at index 0, one where the only zero-sum subarray is a single 0, and one with only positives</code>; <code>Explain prefix sum + hashing using a bank balance analogy for a 12-year-old</code>; <code>Write a property-based test (jqwik / Hypothesis) comparing hasZeroSum with the O(N^2) brute force</code>.</p>
<p><b>Where AI goes wrong:</b> forgetting <code>seen.add(0)</code>; using <code>Set&lt;Integer&gt;</code> with a <code>long</code> running sum (compile error) or an int running sum (overflow); proposing sliding window even though negatives are allowed.</p>
<p><b>What you must still own:</b> deriving <code>sum(l..r) = pf[r] − pf[l−1]</code> on the whiteboard, explaining the seed as "the empty prefix", and knowing which variant of value (none / count / first index) each question needs.</p>`,
    problems: [{
      title: 'Subarray with Sum 0 (does one exist?)',
      level: 'Easy', tags: ['prefix sum', 'hashset'], companies: ['Amazon', 'Microsoft', 'Paytm', 'Zoho'],
      statement: `<p>Given an integer array <code>arr</code> (negative values allowed), return <b>true</b> if there is a non-empty contiguous subarray whose sum is 0, otherwise <b>false</b>.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>5</sup>, −10<sup>9</sup> ≤ arr[i] ≤ 10<sup>9</sup>`,
      example: `${H.arr([4, 2, -3, 1, 6], { label: 'arr', hl: { 1: 'g', 2: 'g', 3: 'g' } })}<p>Output <b>${H.c('g', 'true')}</b>: ${H.c('g', '2 + (−3) + 1 = 0')}. Balances are 4, 6, 3, <b>4</b> — the 4 repeats.</p>
<p>arr = [4, 2, 0, 1, 6] → <b>true</b> (the single 0). arr = [1, 2, 3] → <b>false</b>.</p>`,
      brute: {
        why: `<p>Try every start l and extend r, keeping a running sum: N(N+1)/2 ≈ 5·10<sup>9</sup> additions for N = 10<sup>5</sup> → <b>TLE</b>. The waste: for each start we recompute sums we could have compared against remembered balances.</p>`,
        code: {
          lang: 'java',
          code: `boolean hasZeroSumBrute(int[] a) {
    for (int l = 0; l < a.length; l++) {
        long sum = 0;
        for (int r = l; r < a.length; r++) {
            sum += a[r];
            if (sum == 0) return true;
        }
    }
    return false;
}`,
          alt: [
            { lang: 'python', code: `def find_sum(arr):
    for l in range(len(arr)):
        total = 0
        for r in range(l, len(arr)):
            total += arr[r]
            if total == 0:
                return True
    return False` },
            { lang: 'js', code: `function findsum(arr) {
  for (let l = 0; l < arr.length; l++) {
    let sum = 0;
    for (let r = l; r < arr.length; r++) {
      sum += arr[r];
      if (sum === 0) return true;
    }
  }
  return false;
}` },
            { lang: 'cpp', code: `bool findsum(vector<int>& arr) {
    for (size_t l = 0; l < arr.size(); l++) {
        long long sum = 0;
        for (size_t r = l; r < arr.size(); r++) {
            sum += arr[r];
            if (sum == 0) return true;
        }
    }
    return false;
}` }
          ]
        }
      },
      mcq: {
        q: 'The running balance is 7 after index 2 and again 7 after index 5. Which subarray sums to 0?',
        options: ['indices 3..5', 'indices 2..5', 'indices 2..4', 'none — balances must be 0 to mean anything'],
        answer: 0,
        explain: 'pf[5] − pf[2] = 0 is the sum of arr[3] + arr[4] + arr[5]. The subarray starts right AFTER the earlier balance.'
      },
      hints: [
        `<p><b>Hint 1:</b> Sum of l..r = pf[r] − pf[l−1]. When is that 0? Exactly when two running balances are equal.</p>`,
        `<p><b>Hint 2:</b> Keep a hash set of balances seen so far (64-bit values: <code>long</code> in Java, <code>long long</code> in C++). At each index, if the new balance is already in it, you are done.</p>`,
        `<p><b>Hint 3 (recipe):</b> seen = {0}; pf = 0; for x in arr: pf += x; if pf in seen → true; add pf. Return false. Edge cases: subarray starting at 0 (seed), a single 0 element, long overflow.</p>`
      ],
      tests: { sig: 'int[] -> bool', fn: 'findsum', names: { python: 'find_sum' }, cases: [
  [[[4, 2, -3, 1, 6]], true],
  [[[4, 2, 0, 1, 6]], true],
  [[[1, 2, 3]], false],
  [[[0]], true],
  [[[5]], false],
  [[[-3, 3]], true],
  [[[1000000000, 1000000000, 1000000000, 1000000000, 1000000000]], false],
  [[[2, -1, 2]], false],
  [[[1000000000, 1000000000, -1000000000, -1000000000]], true]
] },
      solution: {
        approach: `<p><b>Repeated running balance.</b> Walk once, maintaining the prefix sum. A HashSet remembers every balance so far (seeded with 0 for the empty prefix). The first repeat proves that the elements between the two occurrences cancel out.</p>`,
        code: `class Solution {
    public boolean findsum(int[] arr) {
        Set<Long> seen = new HashSet<>();
        seen.add(0L);                       // empty prefix: catches subarrays starting at index 0
        long pf = 0;                        // long: up to 1e5 * 1e9 = 1e14
        for (int x : arr) {
            pf += x;
            if (!seen.add(pf)) return true; // balance repeated -> zero-sum subarray in between
        }
        return false;
    }
}`,
        alt: [{ lang: 'js', code: `function findsum(arr) {
  const seen = new Set([0]);              // empty prefix
  let pf = 0;                             // stays below 2^53 here (1e14 max)
  for (const x of arr) {
    pf += x;
    if (seen.has(pf)) return true;        // balance repeated -> zero-sum stretch
    seen.add(pf);
  }
  return false;
}` }, {
          lang: 'python', code: `def find_sum(arr):
    seen, pf = {0}, 0
    for x in arr:
        pf += x
        if pf in seen:
            return True
        seen.add(pf)
    return False`
        }, {
          lang: 'cpp', code: `bool findsum(vector<int>& arr) {
    unordered_set<long long> seen{0};
    long long pf = 0;
    for (int x : arr) {
        pf += x;
        if (!seen.insert(pf).second) return true;   // insert failed -> already present
    }
    return false;
}`
        }],
        dry: {
          head: ['i', 'arr[i]', 'pf', 'set before', 'action'],
          rows: [
            ['—', '—', '0', '{}', 'seed → {0}'],
            ['0', '4', '4', '{0}', H.c('g', 'new → insert')],
            ['1', '2', '6', '{0, 4}', H.c('g', 'new → insert')],
            ['2', '−3', '3', '{0, 4, 6}', H.c('g', 'new → insert')],
            ['3', '1', '4', '{0, 4, 6, 3}', H.c('r', '4 seen → subarray 1..3 → return true')]
          ]
        },
        complexity: `<p><b>Time:</b> O(N) average (one set operation per element). <b>Space:</b> O(N) for the set.</p>`,
        followUps: [
          'Return the start and end indices (map balance → first index).',
          'Count all zero-sum subarrays (map balance → count) — next topic.',
          'Longest zero-sum subarray (map balance → first index) — topic 7.',
          'Is there a subarray whose sum is divisible by K? (store pf mod K).'
        ]
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — Prefix sum + HashMap (counts): count subarrays with sum K
     ===================================================================== */
  topics.push({
    title: 'Prefix Sum + HashMap of Counts: Count Subarrays with Sum = K',
    analogy: `<p>Back to the <b>bank balance</b>, now with a goal: "In how many stretches of days did I spend exactly <b>₹K</b>?" Today your balance is ₹900 and K = 300. Any earlier day whose closing balance was <b>₹600</b> starts a stretch that ends today with exactly ₹300 net. If ₹600 appeared on <b>three</b> different earlier days, that is <b>three</b> different stretches.</p>
<p>So you keep a <b>tally sheet of balances</b> (the shopkeeper again!): balance → how many days ended with it. Each day: look up <code>today − K</code> in the tally, add that count to the answer, then put a stroke next to today's balance.</p>`,
    explain: `<p><b>Problem:</b> count the subarrays whose sum equals K (negatives allowed). Different start/end positions count separately even if the values look the same.</p>

<h4>From "exists" to "how many"</h4>
<p>Sum of l..r = <code>pf[r] − pf[l−1]</code> = K ⇔ <code>pf[l−1] = pf[r] − K</code>. For a fixed end r, the number of valid starts equals <b>how many earlier balances equal pf[r] − K</b>. A HashSet can only say yes/no, so we upgrade to a <b>HashMap balance → count</b>.</p>

<h4>The loop (query first, then record)</h4>
<pre>cnt = {0: 1}            // the empty prefix, seen once
pf = 0, total = 0
for x in arr:
    pf += x
    total += cnt.get(pf - K, 0)   // all stretches ending here
    cnt[pf] += 1                  // record today's balance</pre>

<h4>Worked example: arr = [3, 4, 7, 2, −3, 1, 4, 2], K = 7</h4>
${H.table(['i', 'x', 'pf', 'need pf − 7', 'cnt[need]', 'total', 'subarray(s) found'], [['0', '3', '3', '−4', '0', '0', '—'], ['1', '4', '7', '0', H.c('r', '1'), '1', '[3, 4]'], ['2', '7', '14', '7', H.c('r', '1'), '2', '[7]'], ['3', '2', '16', '9', '0', '2', '—'], ['4', '−3', '13', '6', '0', '2', '—'], ['5', '1', '14', '7', H.c('r', '1'), '3', '[7, 2, −3, 1]'], ['6', '4', '18', '11', '0', '3', '—'], ['7', '2', '20', '13', H.c('r', '1'), H.c('g', '4'), '[1, 4, 2]']])}

<h4>Why the seed is {0: 1} (not {0})</h4>
<p>It is the empty prefix, which happened <b>once</b>. When pf itself equals K (like at i = 1 above), <code>pf − K = 0</code> and we must count the subarray starting at index 0 — exactly one of them.</p>

<h4>Why query BEFORE recording</h4>
<p>If you record pf first and K = 0, then <code>pf − 0 = pf</code> finds today's own stroke and counts an <b>empty</b> subarray. Query first = only earlier balances count.</p>

<h4>Why not sliding window?</h4>
<p>With negatives, a bigger window can have a smaller sum, so "shrink when the sum is too big" breaks. Sliding window only works for all-non-negative arrays; prefix sum + map works for everything.</p>`,
    clues: [
      '"count / number of subarrays with sum equal to K" → prefix sum + map of counts',
      '"total number of continuous subarrays" + negatives allowed → not sliding window',
      '"subarrays with sum divisible by K" → map of (pf mod K) counts, normalize negatives',
      '"number of subarrays with XOR equal to K" → same pattern with ^ instead of +',
      '"count subarrays with equal number of 0s and 1s / odd and even" → map ±1 to 0 and count sum 0',
      '"number of submatrices that sum to target" → fix row pair, then this pattern on column sums'
    ],
    code: [{ lang: 'java', code: `
import java.util.*;

public class CountSumK {
    static long countSubarrays(int[] a, int k) {
        Map<Long, Integer> cnt = new HashMap<>();
        cnt.put(0L, 1);                                   // the empty prefix, seen once
        long pf = 0, total = 0;
        for (int x : a) {
            pf += x;
            total += cnt.getOrDefault(pf - k, 0);         // every earlier balance pf-k starts a valid subarray
            cnt.merge(pf, 1, Integer::sum);               // record this balance AFTER querying
        }
        return total;
    }

    // Same pattern, XOR version: number of subarrays whose XOR equals k
    static long countXorK(int[] a, int k) {
        Map<Integer, Integer> cnt = new HashMap<>();
        cnt.put(0, 1);
        int px = 0;
        long total = 0;
        for (int x : a) {
            px ^= x;                                      // prefix XOR
            total += cnt.getOrDefault(px ^ k, 0);         // px ^ earlier == k  <=>  earlier == px ^ k
            cnt.merge(px, 1, Integer::sum);
        }
        return total;
    }

    public static void main(String[] args) {
        System.out.println(countSubarrays(new int[]{3, 4, 7, 2, -3, 1, 4, 2}, 7)); // 4
        System.out.println(countSubarrays(new int[]{1, 1, 1}, 2));                 // 2
        System.out.println(countSubarrays(new int[]{0, 0, 0}, 0));                 // 6
        System.out.println(countXorK(new int[]{4, 2, 2, 6, 4}, 6));                // 4
    }
}`, alt: [{
      lang: 'python', run: true, title: 'Python (runnable)',
      code: `from collections import defaultdict

def count_subarrays(a, k):
    cnt = defaultdict(int)
    cnt[0] = 1                  # empty prefix
    pf = total = 0
    for x in a:
        pf += x
        total += cnt[pf - k]    # query first
        cnt[pf] += 1            # then record
    return total

def count_xor_k(a, k):
    cnt = defaultdict(int)
    cnt[0] = 1
    px = total = 0
    for x in a:
        px ^= x                 # prefix XOR
        total += cnt[px ^ k]    # px ^ earlier == k  <=>  earlier == px ^ k
        cnt[px] += 1
    return total

print(count_subarrays([3, 4, 7, 2, -3, 1, 4, 2], 7))  # 4
print(count_subarrays([1, -1, 0], 0))                 # 3
print(count_subarrays([0, 0, 0], 0))                  # 6
print(count_xor_k([4, 2, 2, 6, 4], 6))                # 4`
    }, { lang: 'js', run: true, code: `function countSubarrays(a, k) {
  const cnt = new Map([[0, 1]]);            // the empty prefix, seen once
  let pf = 0, total = 0;
  for (const x of a) {
    pf += x;
    total += cnt.get(pf - k) || 0;          // every earlier balance pf-k starts a valid subarray
    cnt.set(pf, (cnt.get(pf) || 0) + 1);    // record this balance AFTER querying
  }
  return total;
}

// Same pattern, XOR version: number of subarrays whose XOR equals k
function countXorK(a, k) {
  const cnt = new Map([[0, 1]]);
  let px = 0, total = 0;
  for (const x of a) {
    px ^= x;                                // prefix XOR
    total += cnt.get(px ^ k) || 0;          // px ^ earlier == k  <=>  earlier == px ^ k
    cnt.set(px, (cnt.get(px) || 0) + 1);
  }
  return total;
}

console.log(countSubarrays([3, 4, 7, 2, -3, 1, 4, 2], 7)); // 4
console.log(countSubarrays([1, 1, 1], 2));                 // 2
console.log(countSubarrays([0, 0, 0], 0));                 // 6
console.log(countXorK([4, 2, 2, 6, 4], 6));                // 4` }, { lang: 'cpp', code: `#include <bits/stdc++.h>
using namespace std;

long long countSubarrays(const vector<int>& a, int k) {
    unordered_map<long long, int> cnt{{0, 1}};   // the empty prefix, seen once
    long long pf = 0, total = 0;
    for (int x : a) {
        pf += x;
        auto it = cnt.find(pf - k);
        if (it != cnt.end()) total += it->second; // every earlier balance pf-k starts a valid subarray
        cnt[pf]++;                                // record this balance AFTER querying
    }
    return total;
}

// Same pattern, XOR version: number of subarrays whose XOR equals k
long long countXorK(const vector<int>& a, int k) {
    unordered_map<int, int> cnt{{0, 1}};
    int px = 0;
    long long total = 0;
    for (int x : a) {
        px ^= x;                                  // prefix XOR
        auto it = cnt.find(px ^ k);               // px ^ earlier == k  <=>  earlier == px ^ k
        if (it != cnt.end()) total += it->second;
        cnt[px]++;
    }
    return total;
}

int main() {
    cout << countSubarrays({3, 4, 7, 2, -3, 1, 4, 2}, 7) << "\\n";   // 4
    cout << countSubarrays({1, 1, 1}, 2) << "\\n";                   // 2
    cout << countSubarrays({0, 0, 0}, 0) << "\\n";                   // 6
    cout << countXorK({4, 2, 2, 6, 4}, 6) << "\\n";                  // 4
}` }] }],
    codeTitle: 'Count subarrays with sum K (and XOR K)',
    viz: [{
      title: 'Count subarrays with sum K: balance → count tally',
      input: '3 4 7 2 -3 1 4 2 | 7',
      inputLabel: 'arr | K  (at most 14 numbers)',
      gen: function (input) {
        var p = splitBar(input, 2, '3 4 7 2 -3 1 4 2 | 7'), a = parseNums(p[0], 14, 'array'), k = parseInt1(p[1], 'K', -50000, 50000);
        var cnt = new Map(), firsts = new Map(), pf = 0, total = 0, pfs = [], frames = [];
        cnt.set(0, 1); firsts.set(0, [-1]);
        frames.push({ narr: 'Seed: balance <b>0</b> has been seen <b>1</b> time (the empty prefix, "before day 0"). K = ' + k + '.', parts: [{ type: 'array', label: 'arr', values: a.slice() }, { type: 'map', label: 'balance → how many times seen', entries: ents(cnt), hl: { '0': 'ok' } }, { type: 'vars', vals: { pf: 0, total: 0 } }] });
        for (var i = 0; i < a.length; i++) {
          pf += a[i]; pfs.push(pf);
          var need = pf - k, c = cnt.get(need) || 0;
          total += c;
          var starts = (firsts.get(need) || []).map(function (s) { return (s + 1) + '..' + i; });
          var bh = one(i, 'cur');
          frames.push({ narr: 'i = ' + i + ': pf = <b>' + pf + '</b>, need an earlier balance of pf − K = <b>' + need + '</b>. ' + (c ? '<span class="c-r">Found ' + c + ' time(s)</span> → ' + c + ' subarray(s) ending here: ' + starts.join(', ') + '.' : 'Not in the tally → 0 subarrays end here.') + ' Total = <b>' + total + '</b>.', parts: [{ type: 'array', label: 'arr', values: a.slice(), ptr: one(i, 'i'), range: c ? [firsts.get(need)[0] + 1, i] : undefined }, { type: 'bars', label: 'running balance pf', values: pfs.slice(), hl: bh }, { type: 'map', label: 'balance → how many times seen', entries: ents(cnt), hl: c ? one(need, 'bad') : {} }, { type: 'vars', vals: { pf: pf, need: need, 'added now': c, total: total }, hl: { total: c ? 'ok' : '', need: 'cur' } }] });
          var had = cnt.has(pf);
          cnt.set(pf, (cnt.get(pf) || 0) + 1);
          if (!firsts.has(pf)) firsts.set(pf, []);
          firsts.get(pf).push(i);
          frames.push({ narr: 'Now record today\'s balance ' + pf + ': ' + (had ? 'already in the tally → count becomes ' + cnt.get(pf) + '.' : '<span class="c-g">new row</span> ' + pf + ' → 1.') + ' (Recording AFTER the query keeps empty subarrays out.)', parts: [{ type: 'array', label: 'arr', values: a.slice(), ptr: one(i, 'i') }, { type: 'bars', label: 'running balance pf', values: pfs.slice() }, { type: 'map', label: 'balance → how many times seen', entries: ents(cnt), hl: one(pf, had ? 'cur' : 'ok') }, { type: 'vars', vals: { pf: pf, total: total } }] });
        }
        frames.push({ narr: 'Answer: <b>' + total + '</b> subarray(s) with sum ' + k + '. One pass, one lookup and one update per element → O(N).', parts: [{ type: 'map', label: 'final tally', entries: ents(cnt) }, { type: 'vars', vals: { answer: total }, hl: { answer: 'sel' } }] });
        return frames;
      }
    }, {
      title: 'Variant: count subarrays with sum divisible by K (tally of remainders)',
      input: '4 5 0 -2 -3 1 | 5',
      inputLabel: 'arr | K (K from 1 to 50, at most 14 numbers)',
      gen: function (input) {
        var p = splitBar(input, 2, '4 5 0 -2 -3 1 | 5'), a = parseNums(p[0], 14, 'array'), k = parseInt1(p[1], 'K', 1, 50);
        var cnt = new Map(), pf = 0, total = 0, frames = [];
        cnt.set(0, 1);
        frames.push({ narr: 'Sum of l..r divisible by K ⇔ pf[r] and pf[l−1] leave the <b>same remainder</b> mod K. So tally remainders (seed remainder 0 → 1). Negative sums need ((pf % K) + K) % K.', parts: [{ type: 'array', label: 'arr', values: a.slice() }, { type: 'map', label: 'remainder → count', entries: ents(cnt), hl: { '0': 'ok' } }, { type: 'vars', vals: { total: 0 } }] });
        for (var i = 0; i < a.length; i++) {
          pf += a[i];
          var r = ((pf % k) + k) % k, c = cnt.get(r) || 0;
          total += c;
          frames.push({ narr: 'i = ' + i + ': pf = ' + pf + ', remainder = ((' + pf + ' % ' + k + ') + ' + k + ') % ' + k + ' = <b>' + r + '</b>. ' + (c ? '<span class="c-r">Seen ' + c + ' time(s)</span> → +' + c + '.' : 'New remainder → +0.') + ' Total = <b>' + total + '</b>.', parts: [{ type: 'array', label: 'arr', values: a.slice(), ptr: one(i, 'i'), hl: one(i, 'cur') }, { type: 'map', label: 'remainder → count', entries: ents(cnt), hl: one(r, c ? 'bad' : 'cur') }, { type: 'vars', vals: { pf: pf, remainder: r, total: total }, hl: { remainder: 'cur' } }] });
          var had = cnt.has(r);
          cnt.set(r, c + 1);
          frames.push({ narr: (had ? 'Bump remainder ' + r + ' → ' + cnt.get(r) + '.' : '<span class="c-g">Insert</span> remainder ' + r + ' → 1.'), parts: [{ type: 'array', label: 'arr', values: a.slice(), ptr: one(i, 'i') }, { type: 'map', label: 'remainder → count', entries: ents(cnt), hl: one(r, had ? 'cur' : 'ok') }, { type: 'vars', vals: { total: total } }] });
        }
        frames.push({ narr: 'Answer: <b>' + total + '</b> subarrays have a sum divisible by ' + k + '. (Equivalently, for each remainder with count c, add c·(c−1)/2.)', parts: [{ type: 'map', label: 'final remainder tally', entries: ents(cnt) }, { type: 'vars', vals: { answer: total }, hl: { answer: 'sel' } }] });
        return frames;
      }
    }],
    examples: [{
      title: '[1, 1, 1], K = 2 → 2',
      html: `${H.table(['i', 'pf', 'need pf − 2', 'cnt[need]', 'total', 'cnt after'], [['0', '1', '−1', '0', '0', '{0:1, 1:1}'], ['1', '2', '0', H.c('r', '1'), '1', '{0:1, 1:1, 2:1}'], ['2', '3', '1', H.c('r', '1'), H.c('g', '2'), '{0:1, 1:1, 2:1, 3:1}']])}
<p>The two subarrays are [0..1] and [1..2].</p>`
    }, {
      title: '[0, 0, 0], K = 0 → 6 (why counts, not a set)',
      html: `<p>pf stays 0 forever. Tally of 0 grows 1 → 2 → 3 → 4, and at each step we add the current tally: 1 + 2 + 3 = <b>6</b>. Those are [0], [1], [2], [0..1], [1..2], [0..2]. A HashSet would have counted at most 1 per step (3) — wrong. And if we recorded before querying, we would get 2 + 3 + 4 = 9 — also wrong (empty subarrays).</p>`
    }, {
      title: 'Count subarrays with XOR = K (same skeleton)',
      html: `<p>XOR has its own "prefix" and its own "undo": <code>xor(l..r) = px[r] ^ px[l−1]</code>, so we need earlier <code>px[l−1] = px[r] ^ K</code>. arr = [4, 2, 2, 6, 4], K = 6 → prefix XORs 4, 6, 4, 2, 6 → answer <b>4</b> ([4,2], [4,2,2,6,4], [2,2,6], [6]).</p>`
    }, {
      title: 'All non-negative? A cheaper alternative exists',
      html: `<p>If every element is ≥ 0 (e.g. "binary subarrays with sum", LeetCode 930), you can also count with sliding windows: <code>atMost(K) − atMost(K − 1)</code>, using O(1) extra space. With negatives allowed, only the prefix-sum map is correct.</p>`
    }],
    deepDive: `<p><b>Correctness.</b> For each end index r, the valid starts l are exactly those with P<sub>l−1</sub> = P<sub>r</sub> − K and −1 ≤ l−1 &lt; r. When we process r, the map contains P<sub>−1</sub>..P<sub>r−1</sub> with multiplicities (query-before-insert), so <code>cnt[P<sub>r</sub> − K]</code> is exactly the number of subarrays ending at r. Summing over r counts each subarray once.</p>
<p><b>Overflow.</b> The answer can reach N(N+1)/2 ≈ 5·10<sup>9</sup> for N = 10<sup>5</sup> (e.g. all zeros, K = 0) → use <code>long total</code>. The prefix sums themselves need <code>long</code> when |a[i]| ≤ 10<sup>9</sup>. LeetCode 560 has N ≤ 2·10<sup>4</sup> and |a[i]| ≤ 1000, so int happens to work there — do not rely on that in a different problem.</p>
<p><b>Mod variant pitfalls.</b> In Java, JavaScript and C++, <code>-7 % 5 == -2</code>, not 3 (Python's <code>%</code> already gives 3). Normalize with <code>((pf % k) + k) % k</code>, or track the remainder incrementally. For "continuous subarray sum multiple of K with length ≥ 2" (LeetCode 523) store the <b>first index</b> of each remainder instead of a count and check <code>i − first ≥ 2</code>.</p>
<p><b>2D extension.</b> "Number of submatrices that sum to target" (LeetCode 1074): fix a pair of rows (top, bottom) — O(R<sup>2</sup>) pairs — compress the columns between them into a 1D array of column sums, and run this exact algorithm on it in O(C). Total O(R<sup>2</sup>·C). Always loop over the smaller dimension squared.</p>
<p><b>Performance.</b> <code>HashMap&lt;Long,Integer&gt;</code> boxes everything. In tight loops with up to 10<sup>6</sup> elements this is fine (tens of ms). For 10<sup>7</sup>+ consider sorting the prefix sums with their indices and counting equal pairs with a "seen-so-far" sweep (O(N log N), cache-friendly), or a primitive long→int open-addressing map.</p>`,
    aiEra: `<p><b>What AI changes:</b> LeetCode 560 is a famous problem, so generated code is usually right for the base case. The skill that matters now is <b>adapting</b>: divisible-by-K with negative numbers, XOR instead of sum, 2D matrices, "at least length 2" — the places where copy-pasted solutions quietly fail.</p>
<p><b>Use AI as a partner:</b> <code>Here is my count-subarrays-sum-K code; generate inputs where K = 0, all zeros, all negatives, and compare against brute force</code>; <code>Show me how the same skeleton solves XOR = K and divisible by K — list exactly which lines change</code>.</p>
<p><b>Where AI goes wrong:</b> seeding with <code>{0}</code> in a set instead of <code>{0: 1}</code> in a map, inserting before querying (overcounts when K = 0), Java's negative modulo, and suggesting sliding window for arrays with negative numbers.</p>
<p><b>What you must still own:</b> the derivation <code>pf[l−1] = pf[r] − K</code>, why the seed is a count of 1, the query-then-record order, and the 2D reduction. Interviewers often ask you to <i>prove</i> the count is exact — practise saying it in two sentences.</p>`,
    problems: [{
      title: 'Subarray Sum Equals K (count them)',
      level: 'Medium', tags: ['prefix sum', 'hashmap', 'counting'], companies: ['Meta', 'Amazon', 'Google', 'Microsoft', 'Goldman Sachs'],
      statement: `<p>Given an integer array <code>nums</code> (negatives allowed) and an integer <code>k</code>, return the <b>total number</b> of contiguous non-empty subarrays whose sum equals <code>k</code>.</p>`,
      constraints: `1 ≤ N ≤ 2·10<sup>4</sup>, −1000 ≤ nums[i] ≤ 1000, −10<sup>7</sup> ≤ k ≤ 10<sup>7</sup>`,
      example: `${H.arr([3, 4, 7, 2, -3, 1, 4, 2], { label: 'nums' })}<p>k = 7 → output ${H.c('g', '4')}: [3, 4], [7], [7, 2, −3, 1], [1, 4, 2].</p>
<p>nums = [1, 1, 1], k = 2 → 2.</p>`,
      brute: {
        why: `<p>For every start l, extend r and keep a running sum; count when it equals k. That is N(N+1)/2 ≈ 2·10<sup>8</sup> steps for N = 2·10<sup>4</sup> — borderline, and hopeless for N = 10<sup>5</sup>. You cannot break early (negatives can bring the sum back to k later). The waste: for a fixed r we re-derive sums that a tally of earlier balances answers in O(1).</p>`,
        code: {
          lang: 'java',
          code: `int subarraySumBrute(int[] nums, int k) {
    int count = 0;
    for (int l = 0; l < nums.length; l++) {
        int sum = 0;
        for (int r = l; r < nums.length; r++) {
            sum += nums[r];
            if (sum == k) count++;   // no early break: negatives may hit k again
        }
    }
    return count;
}`,
          alt: [
            { lang: 'python', code: `def subarray_sum(nums, k):
    count = 0
    for l in range(len(nums)):
        total = 0
        for r in range(l, len(nums)):
            total += nums[r]
            if total == k:
                count += 1    # no early break: negatives may hit k again
    return count` },
            { lang: 'js', code: `function subarraySum(nums, k) {
  let count = 0;
  for (let l = 0; l < nums.length; l++) {
    let sum = 0;
    for (let r = l; r < nums.length; r++) {
      sum += nums[r];
      if (sum === k) count++;   // no early break: negatives may hit k again
    }
  }
  return count;
}` },
            { lang: 'cpp', code: `int subarraySum(vector<int>& nums, int k) {
    int count = 0;
    for (size_t l = 0; l < nums.size(); l++) {
        int sum = 0;
        for (size_t r = l; r < nums.size(); r++) {
            sum += nums[r];
            if (sum == k) count++;   // no early break: negatives may hit k again
        }
    }
    return count;
}` }
          ]
        }
      },
      mcq: {
        q: 'Why must the map start as {0: 1} rather than empty?',
        options: ['To count subarrays that start at index 0 (pf itself equals k)', 'To avoid a NullPointerException in getOrDefault', 'Because 0 is always a valid answer', 'It is only needed when k = 0'],
        answer: 0,
        explain: 'sum(0..r) = pf[r] − 0. The "0" is the balance of the empty prefix, which occurred exactly once. Without it, prefixes equal to k are missed.'
      },
      hints: [
        `<p><b>Hint 1:</b> For a fixed right end r, the subarray l..r sums to k exactly when pf[l−1] = pf[r] − k. So the question becomes "how many earlier balances equal pf[r] − k?"</p>`,
        `<p><b>Hint 2:</b> Keep a hash map balance → count of all balances seen so far. Seed it with {0: 1}.</p>`,
        `<p><b>Hint 3 (recipe):</b> pf = 0, total = 0, cnt = {0:1}. For x: pf += x; total += cnt.get(pf − k, 0); cnt[pf]++. Query <b>before</b> you record. Edge cases: k = 0, all zeros, negatives, answers bigger than int (use long in general).</p>`
      ],
      tests: { sig: 'int[] int -> int', fn: 'subarraySum', cases: [
  [[[3, 4, 7, 2, -3, 1, 4, 2], 7], 4],
  [[[1, 1, 1], 2], 2],
  [[[1], 1], 1],
  [[[1], 0], 0],
  [[[0, 0, 0], 0], 6],
  [[[1, -1, 0], 0], 3],
  [[[-1, -1, 1], 0], 1],
  [[[1, 2, 3], 3], 2],
  [[new Array(1000).fill(0), 0], 500500]
] },
      solution: {
        approach: `<p><b>Tally of balances.</b> Every subarray ending at r corresponds to one earlier balance equal to pf[r] − k. The map counts how many times each balance has appeared, so a single lookup tells us how many subarrays end at r. Summing over all r gives the answer in one pass.</p>`,
        code: `class Solution {
    public int subarraySum(int[] nums, int k) {
        Map<Integer, Integer> cnt = new HashMap<>();
        cnt.put(0, 1);                                  // empty prefix seen once
        int pf = 0, total = 0;                          // safe as int under these constraints
        for (int x : nums) {
            pf += x;
            total += cnt.getOrDefault(pf - k, 0);       // stretches ending here with sum k
            cnt.merge(pf, 1, Integer::sum);             // record AFTER querying
        }
        return total;
    }
}`,
        alt: [{ lang: 'js', code: `function subarraySum(nums, k) {
  const cnt = new Map([[0, 1]]);          // empty prefix seen once
  let pf = 0, total = 0;
  for (const x of nums) {
    pf += x;
    total += cnt.get(pf - k) || 0;        // stretches ending here with sum k
    cnt.set(pf, (cnt.get(pf) || 0) + 1);  // record after querying
  }
  return total;
}` }, {
          lang: 'python', code: `from collections import defaultdict

def subarray_sum(nums, k):
    cnt = defaultdict(int)
    cnt[0] = 1
    pf = total = 0
    for x in nums:
        pf += x
        total += cnt[pf - k]
        cnt[pf] += 1
    return total`
        }, {
          lang: 'cpp', code: `int subarraySum(vector<int>& nums, int k) {
    unordered_map<long long, int> cnt{{0, 1}};
    long long pf = 0;
    int total = 0;
    for (int x : nums) {
        pf += x;
        auto it = cnt.find(pf - k);
        if (it != cnt.end()) total += it->second;
        cnt[pf]++;
    }
    return total;
}`
        }],
        dry: {
          head: ['i', 'x', 'pf', 'need pf − 7', 'cnt[need]', 'total', 'cnt after recording pf'],
          rows: [
            ['—', '—', '0', '—', '—', '0', '{0:1}'],
            ['0', '3', '3', '−4', '0', '0', H.c('g', '{0:1, 3:1}')],
            ['1', '4', '7', '0', H.c('r', '1'), '1', H.c('g', '+7:1')],
            ['2', '7', '14', '7', H.c('r', '1'), '2', H.c('g', '+14:1')],
            ['3', '2', '16', '9', '0', '2', H.c('g', '+16:1')],
            ['4', '−3', '13', '6', '0', '2', H.c('g', '+13:1')],
            ['5', '1', '14', '7', H.c('r', '1'), '3', '14:2'],
            ['6', '4', '18', '11', '0', '3', H.c('g', '+18:1')],
            ['7', '2', '20', '13', H.c('r', '1'), H.c('g', '4'), H.c('g', '+20:1')]
          ]
        },
        complexity: `<p><b>Time:</b> O(N) average. <b>Space:</b> O(N) for the map (at most N+1 distinct balances).</p>`,
        followUps: [
          'Subarray Sums Divisible by K (LeetCode 974): tally remainders, normalize negatives.',
          'Count subarrays with XOR = K: prefix XOR, look up px ^ K.',
          'Number of Submatrices That Sum to Target (LeetCode 1074): fix two rows, run this on column sums.',
          'Return the longest such subarray instead of the count → store first index (next topic).'
        ]
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 — Prefix sum + HashMap (first index): longest sum 0 / K, equal 0s and 1s
     ===================================================================== */
  topics.push({
    title: 'Prefix Sum + First-Index Map: Longest Subarray with Sum 0 / K and Equal 0s & 1s',
    analogy: `<p>The <b>bank balance</b> one last time. Now the question is: "What is the <b>longest</b> stretch of days in which my net change was exactly ₹K?" A stretch ending today starts the day after some earlier day with balance <code>today − K</code>. To make the stretch <b>as long as possible</b>, you want the <b>earliest</b> such day. So your notebook stores, for each balance, only the <b>first date</b> you ever saw it — later repeats are never better, so you do not overwrite.</p>
<p>For "equal 0s and 1s", imagine each 1 is a deposit of ₹1 and each 0 is a withdrawal of ₹1. A stretch with equal deposits and withdrawals has net change <b>0</b> — the same question with K = 0.</p>`,
    explain: `<p><b>Map choice:</b> exists → set; how many → counts; <b>longest → first index</b>. Seed <code>{0: −1}</code>: balance 0 was "seen" just before index 0, so a subarray from index 0 to i has length <code>i − (−1) = i + 1</code>.</p>

<h4>Longest subarray with sum 0</h4>
${H.arr([15, -2, 2, -8, 1, 7, 10, 23], { label: 'arr', hl: { 1: 'g', 2: 'g', 3: 'g', 4: 'g', 5: 'g' } })}
${H.table(['i', 'x', 'pf', 'first index of pf?', 'length', 'best'], [['—', '—', '0', 'seed 0 → −1', '—', '0'], ['0', '15', '15', H.c('g', 'new → 0'), '—', '0'], ['1', '−2', '13', H.c('g', 'new → 1'), '—', '0'], ['2', '2', '15', H.c('r', 'seen at 0'), '2 − 0 = 2', '2'], ['3', '−8', '7', H.c('g', 'new → 3'), '—', '2'], ['4', '1', '8', H.c('g', 'new → 4'), '—', '2'], ['5', '7', '15', H.c('r', 'seen at 0'), '5 − 0 = 5', H.c('g', '5')], ['6', '10', '25', H.c('g', 'new'), '—', '5'], ['7', '23', '48', H.c('g', 'new'), '—', '5']])}
<p>Answer 5: indices 1..5 = [−2, 2, −8, 1, 7]. Note at i = 5 we compare with the <b>first</b> 15 (index 0), not the one at index 2 — that is why we never overwrite.</p>

<h4>Longest subarray with sum K</h4>
<p>Same loop, but look up <code>pf − K</code>:</p>
<pre>first = {0: −1}; pf = 0; best = 0
for i, x in arr:
    pf += x
    if pf − K in first: best = max(best, i − first[pf − K])
    if pf not in first: first[pf] = i      // keep the EARLIEST index only</pre>

<h4>Equal number of 0s and 1s (Contiguous Array)</h4>
<p>Replace every 0 by <b>−1</b>. A subarray has equal 0s and 1s ⇔ its ±1 sum is 0 ⇔ "longest subarray with sum 0".</p>
${H.arr([0, 1, 1, 0, 1, 1, 1, 0], { label: 'nums', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g' } })}
${H.arr([-1, 1, 1, -1, 1, 1, 1, -1], { label: '±1', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g' } })}
${H.arr([-1, 0, 1, 0, 1, 2, 3, 2], { label: 'balance', hl: { 3: 'r' } })}
<p>Balance 0 appears at index 3 and in the seed (index −1) → length 3 − (−1) = <b>4</b>: [0, 1, 1, 0].</p>

<h4>Cheat sheet: same skeleton, different value</h4>
${H.table(['question', 'map value', 'seed', 'update rule'], [['exists?', '(set)', '{0}', 'add every pf'], ['how many?', 'count', '{0: 1}', 'cnt[pf]++ after query'], ['longest?', 'first index', '{0: −1}', 'store pf → i only if pf is new'], ['shortest?', 'last index', '{0: −1}', 'put(pf, i) — overwrite']])}`,
    clues: [
      '"longest / maximum length subarray with sum K (or 0)" → prefix sum + map of FIRST index',
      '"equal number of 0s and 1s" / "balanced" / "same count of X and Y" → map one side to −1, find longest sum 0',
      '"array may contain negatives" with "longest" → not sliding window, use first-index map',
      '"largest subarray with 0 sum" (GfG) → the exact pattern with K = 0',
      '"longest well-performing interval" (hours &gt; 8 vs ≤ 8) → ±1 transform + first-index map',
      '"shortest subarray with sum K" (no negatives involved in the trick) → keep the LAST index instead'
    ],
    code: [{ lang: 'java', code: `
import java.util.*;

public class LongestSumK {
    // Longest subarray with sum exactly k (negatives allowed). Works for k = 0 too.
    static int longestSumK(int[] a, long k) {
        Map<Long, Integer> first = new HashMap<>();
        first.put(0L, -1);                         // empty prefix "ends" at index -1
        long pf = 0;
        int best = 0;
        for (int i = 0; i < a.length; i++) {
            pf += a[i];
            Integer j = first.get(pf - k);
            if (j != null) best = Math.max(best, i - j);   // a[j+1..i] sums to k
            first.putIfAbsent(pf, i);              // keep the EARLIEST index -> longest answers
        }
        return best;
    }

    // Contiguous Array: longest subarray with equal 0s and 1s
    static int findMaxLength(int[] nums) {
        Map<Integer, Integer> first = new HashMap<>();
        first.put(0, -1);
        int bal = 0, best = 0;
        for (int i = 0; i < nums.length; i++) {
            bal += nums[i] == 1 ? 1 : -1;          // 1 -> +1, 0 -> -1
            Integer j = first.get(bal);
            if (j != null) best = Math.max(best, i - j);
            else first.put(bal, i);
        }
        return best;
    }

    public static void main(String[] args) {
        System.out.println(longestSumK(new int[]{15, -2, 2, -8, 1, 7, 10, 23}, 0)); // 5
        System.out.println(longestSumK(new int[]{10, 5, 2, 7, 1, -10}, 15));        // 6
        System.out.println(findMaxLength(new int[]{0, 1, 1, 0, 1, 1, 1, 0}));       // 4
    }
}`, alt: [{
      lang: 'python', run: true, title: 'Python (runnable)',
      code: `def longest_sum_k(a, k):
    first, pf, best = {0: -1}, 0, 0
    for i, x in enumerate(a):
        pf += x
        if pf - k in first:
            best = max(best, i - first[pf - k])
        first.setdefault(pf, i)          # keep earliest index only
    return best

def find_max_length(nums):
    return longest_sum_k([1 if x == 1 else -1 for x in nums], 0)

print(longest_sum_k([15, -2, 2, -8, 1, 7, 10, 23], 0))  # 5
print(longest_sum_k([10, 5, 2, 7, 1, -10], 15))         # 6
print(find_max_length([0, 1, 1, 0, 1, 1, 1, 0]))        # 4`
    }, { lang: 'js', run: true, code: `// Longest subarray with sum exactly k (negatives allowed). Works for k = 0 too.
function longestSumK(a, k) {
  const first = new Map([[0, -1]]);          // empty prefix "ends" at index -1
  let pf = 0, best = 0;
  for (let i = 0; i < a.length; i++) {
    pf += a[i];
    if (first.has(pf - k)) best = Math.max(best, i - first.get(pf - k));   // a[j+1..i] sums to k
    if (!first.has(pf)) first.set(pf, i);    // keep the EARLIEST index -> longest answers
  }
  return best;
}

// Contiguous Array: longest subarray with equal 0s and 1s
function findMaxLength(nums) {
  const first = new Map([[0, -1]]);
  let bal = 0, best = 0;
  for (let i = 0; i < nums.length; i++) {
    bal += nums[i] === 1 ? 1 : -1;           // 1 -> +1, 0 -> -1
    if (first.has(bal)) best = Math.max(best, i - first.get(bal));
    else first.set(bal, i);
  }
  return best;
}

console.log(longestSumK([15, -2, 2, -8, 1, 7, 10, 23], 0)); // 5
console.log(longestSumK([10, 5, 2, 7, 1, -10], 15));        // 6
console.log(findMaxLength([0, 1, 1, 0, 1, 1, 1, 0]));       // 4` }, { lang: 'cpp', code: `#include <bits/stdc++.h>
using namespace std;

// Longest subarray with sum exactly k (negatives allowed). Works for k = 0 too.
int longestSumK(const vector<int>& a, long long k) {
    unordered_map<long long, int> first{{0, -1}};   // empty prefix "ends" at index -1
    long long pf = 0;
    int best = 0;
    for (int i = 0; i < (int)a.size(); i++) {
        pf += a[i];
        auto it = first.find(pf - k);
        if (it != first.end()) best = max(best, i - it->second);   // a[j+1..i] sums to k
        first.emplace(pf, i);                         // no-op if present: keeps the EARLIEST
    }
    return best;
}

// Contiguous Array: longest subarray with equal 0s and 1s
int findMaxLength(const vector<int>& nums) {
    unordered_map<int, int> first{{0, -1}};
    int bal = 0, best = 0;
    for (int i = 0; i < (int)nums.size(); i++) {
        bal += nums[i] == 1 ? 1 : -1;                // 1 -> +1, 0 -> -1
        auto [it, inserted] = first.try_emplace(bal, i);
        if (!inserted) best = max(best, i - it->second);
    }
    return best;
}

int main() {
    cout << longestSumK({15, -2, 2, -8, 1, 7, 10, 23}, 0) << "\\n";   // 5
    cout << longestSumK({10, 5, 2, 7, 1, -10}, 15) << "\\n";          // 6
    cout << findMaxLength({0, 1, 1, 0, 1, 1, 1, 0}) << "\\n";         // 4
}` }] }],
    codeTitle: 'Longest sum K and equal 0s/1s',
    viz: [{
      title: 'Longest subarray with sum K: map balance → FIRST index',
      input: '10 5 2 7 1 -10 | 15',
      inputLabel: 'arr | K  (use K = 0 for "largest zero-sum subarray"; at most 14 numbers)',
      gen: function (input) {
        var p = splitBar(input, 2, '10 5 2 7 1 -10 | 15'), a = parseNums(p[0], 14, 'array'), k = parseInt1(p[1], 'K', -50000, 50000);
        var first = new Map(), pf = 0, best = 0, bestL = -1, bestR = -1, frames = [];
        first.set(0, -1);
        frames.push({ narr: 'Seed: balance 0 first seen at index <b>−1</b> (before the array). K = ' + k + '. We want the earliest earlier balance equal to pf − K.', parts: [{ type: 'array', label: 'arr', values: a.slice() }, { type: 'map', label: 'balance → first index', entries: ents(first), hl: { '0': 'ok' } }, { type: 'vars', vals: { pf: 0, best: 0 } }] });
        for (var i = 0; i < a.length; i++) {
          pf += a[i];
          var need = pf - k, j = first.has(need) ? first.get(need) : null, msg;
          if (j !== null) {
            var len = i - j, improved = len > best;
            if (improved) { best = len; bestL = j + 1; bestR = i; }
            msg = 'i = ' + i + ': pf = <b>' + pf + '</b>, need ' + need + ' → <span class="c-r">first seen at ' + j + '</span>. Subarray ' + (j + 1) + '..' + i + ' has sum ' + k + ', length ' + len + '. ' + (improved ? '<b>New best = ' + best + '</b>.' : 'Not longer than best ' + best + '.');
            frames.push({ narr: msg, parts: [{ type: 'array', label: 'arr', values: a.slice(), range: [j + 1, i], ptr: one(i, 'i') }, { type: 'map', label: 'balance → first index', entries: ents(first), hl: one(need, 'bad') }, { type: 'vars', vals: { pf: pf, need: need, length: len, best: best }, hl: { best: improved ? 'ok' : '' } }] });
          } else {
            frames.push({ narr: 'i = ' + i + ': pf = <b>' + pf + '</b>, need ' + need + ' → not seen, no subarray with sum ' + k + ' ends here.', parts: [{ type: 'array', label: 'arr', values: a.slice(), ptr: one(i, 'i'), hl: one(i, 'cur') }, { type: 'map', label: 'balance → first index', entries: ents(first) }, { type: 'vars', vals: { pf: pf, need: need, best: best }, hl: { need: 'cur' } }] });
          }
          if (first.has(pf)) {
            frames.push({ narr: 'Balance ' + pf + ' already has first index ' + first.get(pf) + ' → <b>keep it</b> (do not overwrite with ' + i + '). An earlier start always gives a longer subarray later.', parts: [{ type: 'array', label: 'arr', values: a.slice(), ptr: one(i, 'i') }, { type: 'map', label: 'balance → first index', entries: ents(first), hl: one(pf, 'cur') }, { type: 'vars', vals: { pf: pf, best: best } }] });
          } else {
            first.set(pf, i);
            frames.push({ narr: '<span class="c-g">Insert</span> balance ' + pf + ' → first index ' + i + '.', parts: [{ type: 'array', label: 'arr', values: a.slice(), ptr: one(i, 'i') }, { type: 'map', label: 'balance → first index', entries: ents(first), hl: one(pf, 'ok') }, { type: 'vars', vals: { pf: pf, best: best } }] });
          }
        }
        frames.push({ narr: best ? 'Longest subarray with sum ' + k + ': indices <b>' + bestL + '..' + bestR + '</b>, length <b>' + best + '</b>.' : 'No subarray sums to ' + k + ' → answer 0.', parts: [{ type: 'array', label: 'arr', values: a.slice(), hl: best ? rng(bestL, bestR, 'sel') : {} }, { type: 'vars', vals: { answer: best }, hl: { answer: 'sel' } }] });
        return frames;
      }
    }, {
      title: 'Equal 0s and 1s: deposit +1 for 1, withdraw −1 for 0, find the longest zero net change',
      input: '0 1 1 0 1 1 1 0',
      inputLabel: 'Binary array (0s and 1s, at most 16)',
      gen: function (input) {
        var a = parseNums(input, 16, 'binary array');
        if (a.some(function (x) { return x !== 0 && x !== 1; })) throw new Error('Use only 0 and 1, e.g. 0 1 1 0 1');
        var first = new Map(), bal = 0, best = 0, bl = -1, br = -1, bals = [], frames = [];
        first.set(0, -1);
        frames.push({ narr: 'Turn each 0 into −1 and each 1 into +1. Equal counts ⇔ net balance change 0. Seed: balance 0 at index −1.', parts: [{ type: 'array', label: 'nums', values: a.slice() }, { type: 'array', label: 'as ±1', values: a.map(function (x) { return x ? '+1' : '-1'; }) }, { type: 'map', label: 'balance → first index', entries: ents(first), hl: { '0': 'ok' } }] });
        for (var i = 0; i < a.length; i++) {
          bal += a[i] ? 1 : -1; bals.push(bal);
          if (first.has(bal)) {
            var j = first.get(bal), len = i - j, imp = len > best;
            if (imp) { best = len; bl = j + 1; br = i; }
            frames.push({ narr: 'i = ' + i + ' (' + a[i] + '): balance <b>' + bal + '</b> was first seen at ' + j + ' → <span class="c-r">hit</span>: nums[' + (j + 1) + '..' + i + '] has as many 0s as 1s, length ' + len + '. ' + (imp ? '<b>New best ' + best + '</b>.' : 'Best stays ' + best + '.'), parts: [{ type: 'array', label: 'nums', values: a.slice(), range: [j + 1, i], ptr: one(i, 'i') }, { type: 'bars', label: 'balance after each index', values: bals.slice(), hl: one(i, 'bad') }, { type: 'map', label: 'balance → first index', entries: ents(first), hl: one(bal, 'bad') }, { type: 'vars', vals: { balance: bal, best: best }, hl: { best: imp ? 'ok' : '' } }] });
          } else {
            first.set(bal, i);
            frames.push({ narr: 'i = ' + i + ' (' + a[i] + '): balance <b>' + bal + '</b> is new → <span class="c-g">insert</span> ' + bal + ' → ' + i + '.', parts: [{ type: 'array', label: 'nums', values: a.slice(), ptr: one(i, 'i'), hl: one(i, 'cur') }, { type: 'bars', label: 'balance after each index', values: bals.slice(), hl: one(i, 'ok') }, { type: 'map', label: 'balance → first index', entries: ents(first), hl: one(bal, 'ok') }, { type: 'vars', vals: { balance: bal, best: best } }] });
          }
        }
        frames.push({ narr: best ? 'Answer: <b>' + best + '</b> (indices ' + bl + '..' + br + ').' : 'No balanced subarray → 0.', parts: [{ type: 'array', label: 'nums', values: a.slice(), hl: best ? rng(bl, br, 'sel') : {} }, { type: 'vars', vals: { answer: best }, hl: { answer: 'sel' } }] });
        return frames;
      }
    }],
    examples: [{
      title: 'Why NOT overwrite the first index',
      html: `<p>arr = [1, −1, 1, −1], K = 0. Balances: 1, 0, 1, 0. With first-index map: at i = 3, balance 0 → first at −1 → length <b>4</b> (whole array). If you overwrote 0 → 1 at i = 1, you would get length 2 at i = 3 — wrong.</p>`
    }, {
      title: 'Longest sum K: [10, 5, 2, 7, 1, −10], K = 15 → 6',
      html: `${H.table(['i', 'pf', 'need pf − 15', 'first[need]', 'length', 'best'], [['0', '10', '−5', '—', '—', '0'], ['1', '15', '0', '−1', '2', '2'], ['2', '17', '2', '—', '—', '2'], ['3', '24', '9', '—', '—', '2'], ['4', '25', '10', '0', '4', '4'], ['5', '15', '0', '−1', H.c('g', '6'), H.c('g', '6')]])}
<p>At i = 5 the balance 15 repeats (first at 1); we keep 15 → 1 and the answer is the whole array.</p>`
    }, {
      title: 'All positives? Two pointers is enough (and O(1) space)',
      html: `<p>If every element is <b>positive</b>, prefix sums strictly increase, so a sliding window works: grow right, shrink left while sum &gt; K, record when sum == K. O(N) time, O(1) space. As soon as zeros or negatives are allowed, use the map.</p>`,
      code: { lang: 'java', code: `int longestSumKPositive(int[] a, long k) {   // only valid if all a[i] > 0
    int best = 0, l = 0;
    long sum = 0;
    for (int r = 0; r < a.length; r++) {
        sum += a[r];
        while (sum > k && l <= r) sum -= a[l++];
        if (sum == k) best = Math.max(best, r - l + 1);
    }
    return best;
}`, alt: [{ lang: 'python', code: `def longest_sum_k_positive(a, k):   # only valid if all a[i] > 0
    best = l = total = 0
    for r, x in enumerate(a):
        total += x
        while total > k and l <= r:
            total -= a[l]
            l += 1
        if total == k:
            best = max(best, r - l + 1)
    return best` }, { lang: 'js', code: `function longestSumKPositive(a, k) {   // only valid if all a[i] > 0
  let best = 0, l = 0, sum = 0;
  for (let r = 0; r < a.length; r++) {
    sum += a[r];
    while (sum > k && l <= r) sum -= a[l++];
    if (sum === k) best = Math.max(best, r - l + 1);
  }
  return best;
}` }, { lang: 'cpp', code: `int longestSumKPositive(const vector<int>& a, long long k) {   // only valid if all a[i] > 0
    int best = 0, l = 0;
    long long sum = 0;
    for (int r = 0; r < (int)a.size(); r++) {
        sum += a[r];
        while (sum > k && l <= r) sum -= a[l++];
        if (sum == k) best = max(best, r - l + 1);
    }
    return best;
}` }] }
    }, {
      title: 'Longest Well-Performing Interval (a ±1 cousin)',
      html: `<p>hours = [9, 9, 6, 0, 6, 6, 9]: a day is "tiring" if hours &gt; 8 (+1) else −1. Want the longest interval with <b>positive</b> sum. Trick: if balance &gt; 0, the whole prefix works (i + 1); otherwise look up the first index of <b>balance − 1</b>. Answer 3 ([9, 9, 6]). Same first-index map, a slightly different lookup.</p>`
    }],
    deepDive: `<p><b>Why first index is optimal.</b> For a fixed end i, every j with P<sub>j</sub> = P<sub>i</sub> − K gives a valid subarray j+1..i of length i − j, which is largest for the smallest j. Storing only the first occurrence keeps exactly that j. Each index is inserted at most once, so the map has at most N + 1 entries.</p>
<p><b>putIfAbsent vs the else branch.</b> For K ≠ 0 you must <b>query first and then putIfAbsent</b> — the lookup key (pf − K) differs from the insert key (pf). For K = 0 they are the same key, so "if present → measure, else → insert" is a valid shortcut (as in Contiguous Array). Mixing these up is a classic bug when adapting code.</p>
<p><b>Shortest instead of longest.</b> Store the <b>last</b> index (overwrite every time). Note: "shortest subarray with sum ≥ K" with negatives (LeetCode 862) is a different beast — it needs a monotonic deque over prefix sums, not a hash map, because "≥" is not an exact-match lookup. Hash maps only answer <b>exact</b> equality questions.</p>
<p><b>Generalizing ±1.</b> Any "equal count of A and B" (vowels vs consonants, X vs O, even vs odd) maps to ±1 and sum 0. For three categories ("equal 0s, 1s and 2s"), the key becomes a <b>pair</b> of differences (c1 − c0, c2 − c1) — hash a <code>long</code> combining both, or a record key. That generalization is a favourite follow-up.</p>
<p><b>Array instead of map.</b> For the ±1 balance the values lie in [−N, N], so a plain <code>int[2N + 1]</code> filled with a sentinel replaces the HashMap: index = bal + N. No hashing, no boxing, guaranteed O(N) worst case — a nice optimization to mention.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants know Contiguous Array and Largest Zero-Sum Subarray well. They are much weaker at the <i>adaptation</i>: switching from count to first index, from K = 0 to general K, from two categories to three. That adaptation is now the real interview signal.</p>
<p><b>Use AI as a partner:</b> <code>Generate tests where overwriting the first index gives a wrong answer for longest subarray sum K</code>; <code>Convert my HashMap solution for equal 0s/1s into an int[] version and explain the offset</code>; <code>Give me the three-category version and its key design</code>.</p>
<p><b>Where AI goes wrong:</b> overwriting with <code>put</code> (gives shortest-ish, not longest), forgetting the seed −1 (misses subarrays starting at 0), using the "else insert" shortcut for K ≠ 0 (a balance equal to pf − K at the same step is wrongly skipped), and proposing sliding window when the array has negatives.</p>
<p><b>What you must still own:</b> choosing first vs last index from "longest" vs "shortest", the ±1 modelling step, and explaining why hash maps cannot do "≥ K" questions.</p>`,
    problems: [{
      title: 'Largest Subarray with 0 Sum',
      level: 'Medium', tags: ['prefix sum', 'hashmap', 'first index'], companies: ['Amazon', 'Microsoft', 'Flipkart', 'MakeMyTrip'],
      statement: `<p>Given an integer array <code>arr</code> (negatives allowed), return the <b>length of the longest</b> contiguous subarray whose sum is 0. Return 0 if none exists.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>5</sup>, −1000 ≤ arr[i] ≤ 1000`,
      example: `${H.arr([15, -2, 2, -8, 1, 7, 10, 23], { label: 'arr', hl: { 1: 'g', 2: 'g', 3: 'g', 4: 'g', 5: 'g' } })}<p>Output ${H.c('g', '5')}: [−2, 2, −8, 1, 7] sums to 0. The shorter [−2, 2] also sums to 0 but is not the longest.</p>`,
      brute: {
        why: `<p>Check every (l, r) pair with a running sum and track the longest with sum 0: <b>O(N<sup>2</sup>)</b> = 5·10<sup>9</sup> steps at N = 10<sup>5</sup>. The waste: for each end r we only need the earliest start whose balance matches — information a map can remember.</p>`,
        code: {
          lang: 'java',
          code: `int maxLenBrute(int[] arr) {
    int best = 0;
    for (int l = 0; l < arr.length; l++) {
        int sum = 0;
        for (int r = l; r < arr.length; r++) {
            sum += arr[r];
            if (sum == 0) best = Math.max(best, r - l + 1);
        }
    }
    return best;
}`,
          alt: [
            { lang: 'python', code: `def max_len(arr):
    best = 0
    for l in range(len(arr)):
        total = 0
        for r in range(l, len(arr)):
            total += arr[r]
            if total == 0:
                best = max(best, r - l + 1)
    return best` },
            { lang: 'js', code: `function maxLen(arr) {
  let best = 0;
  for (let l = 0; l < arr.length; l++) {
    let sum = 0;
    for (let r = l; r < arr.length; r++) {
      sum += arr[r];
      if (sum === 0) best = Math.max(best, r - l + 1);
    }
  }
  return best;
}` },
            { lang: 'cpp', code: `int maxLen(vector<int>& arr) {
    int best = 0;
    for (int l = 0; l < (int)arr.size(); l++) {
        int sum = 0;
        for (int r = l; r < (int)arr.size(); r++) {
            sum += arr[r];
            if (sum == 0) best = max(best, r - l + 1);
        }
    }
    return best;
}` }
          ]
        }
      },
      mcq: {
        q: 'Balance 15 appears at indices 0, 2 and 5. When you reach index 5, which earlier index gives the longest zero-sum subarray ending at 5?',
        options: ['Index 0 → subarray 1..5 (length 5)', 'Index 2 → subarray 3..5 (length 3)', 'Index 5 itself', 'All of them equally'],
        answer: 0,
        explain: 'The earliest matching balance gives the longest stretch. That is why the map stores only the FIRST index of each balance.'
      },
      hints: [
        `<p><b>Hint 1:</b> A zero-sum subarray j+1..i means balance[j] == balance[i]. To make it longest, you want the smallest such j.</p>`,
        `<p><b>Hint 2:</b> HashMap from balance → first index where it occurred. Seed balance 0 → index −1.</p>`,
        `<p><b>Hint 3 (recipe):</b> for i: pf += a[i]; if pf in map → best = max(best, i − map[pf]); else map[pf] = i. Never overwrite. Edge cases: whole array sums to 0 (seed gives length N), no zero-sum (0), single 0 element (length 1).</p>`
      ],
      tests: { sig: 'int[] -> int', fn: 'maxLen', cases: [
  [[[15, -2, 2, -8, 1, 7, 10, 23]], 5],
  [[[1, 2, 3]], 0],
  [[[0]], 1],
  [[[5]], 0],
  [[[-1, 1, -1, 1]], 4],
  [[[3, 0, 0, -3]], 4],
  [[[1, 0, -1, 0, 2]], 4],
  [[[1000, -1000, 1000]], 2]
] },
      solution: {
        approach: `<p><b>First-occurrence map of running balances.</b> When the current balance has been seen before, the elements after its first occurrence up to here sum to 0. Measuring against the first occurrence always gives the longest such stretch ending here; the overall answer is the max over all ends.</p>`,
        code: `class Solution {
    int maxLen(int[] arr) {
        Map<Integer, Integer> first = new HashMap<>();
        first.put(0, -1);                        // balance 0 before the array starts
        int pf = 0, best = 0;                    // |pf| <= 1e5 * 1000 = 1e8 fits in int
        for (int i = 0; i < arr.length; i++) {
            pf += arr[i];
            Integer j = first.get(pf);
            if (j != null) best = Math.max(best, i - j);   // arr[j+1..i] sums to 0
            else first.put(pf, i);                         // only the FIRST time
        }
        return best;
    }
}`,
        alt: [{ lang: 'js', code: `function maxLen(arr) {
  const first = new Map([[0, -1]]);       // balance 0 before the array starts
  let pf = 0, best = 0;
  arr.forEach((x, i) => {
    pf += x;
    if (first.has(pf)) best = Math.max(best, i - first.get(pf));   // arr[j+1..i] sums to 0
    else first.set(pf, i);                                          // only the first time
  });
  return best;
}` }, { lang: 'cpp', code: `int maxLen(vector<int>& arr) {
    unordered_map<long long, int> first{{0, -1}};   // balance 0 before the array starts
    long long pf = 0;
    int best = 0;
    for (int i = 0; i < (int)arr.size(); i++) {
        pf += arr[i];
        auto [it, inserted] = first.try_emplace(pf, i);   // keeps the first index only
        if (!inserted) best = max(best, i - it->second);  // arr[j+1..i] sums to 0
    }
    return best;
}` }, {
          lang: 'python', code: `def max_len(arr):
    first, pf, best = {0: -1}, 0, 0
    for i, x in enumerate(arr):
        pf += x
        if pf in first:
            best = max(best, i - first[pf])
        else:
            first[pf] = i
    return best`
        }],
        dry: {
          head: ['i', 'arr[i]', 'pf', 'map lookup', 'length', 'best'],
          rows: [
            ['—', '—', '0', 'seed {0:−1}', '—', '0'],
            ['0', '15', '15', H.c('g', 'new → 15:0'), '—', '0'],
            ['1', '−2', '13', H.c('g', 'new → 13:1'), '—', '0'],
            ['2', '2', '15', H.c('r', 'first at 0'), '2', '2'],
            ['3', '−8', '7', H.c('g', 'new → 7:3'), '—', '2'],
            ['4', '1', '8', H.c('g', 'new → 8:4'), '—', '2'],
            ['5', '7', '15', H.c('r', 'first at 0'), '5', H.c('g', '5')],
            ['6', '10', '25', H.c('g', 'new'), '—', '5'],
            ['7', '23', '48', H.c('g', 'new'), '—', '5']
          ]
        },
        complexity: `<p><b>Time:</b> O(N) average. <b>Space:</b> O(N) for the map.</p>`,
        followUps: [
          'Return the start and end indices, not just the length.',
          'Longest subarray with sum exactly K (next problem).',
          'Values are small: replace the map by an offset array of size 2·maxSum + 1.'
        ]
      }
    }, {
      title: 'Longest Subarray with Sum K (negatives allowed)',
      level: 'Medium', tags: ['prefix sum', 'hashmap', 'first index'], companies: ['Amazon', 'Google', 'Samsung', 'Flipkart'],
      statement: `<p>Given an integer array <code>arr</code> that may contain negative numbers and zeros, and an integer <code>k</code>, return the length of the <b>longest</b> contiguous subarray whose sum equals <code>k</code>, or 0 if none exists.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>5</sup>, −10<sup>5</sup> ≤ arr[i], k ≤ 10<sup>5</sup>`,
      example: `${H.arr([10, 5, 2, 7, 1, -10], { label: 'arr', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g', 4: 'g', 5: 'g' } })}<p>k = 15 → output ${H.c('g', '6')}: the whole array sums to 15. Shorter answers exist ([10, 5], [5, 2, 7, 1]) but 6 is the longest.</p>`,
      brute: {
        why: `<p>All (l, r) pairs with a running sum: <b>O(N<sup>2</sup>)</b>. Sliding window is <b>not</b> a valid speed-up because negatives break the "shrink when too big" rule: here the window would shrink away the 10 and never reach the full-array answer.</p>`,
        code: {
          lang: 'java',
          code: `int longestSubarrayBrute(int[] arr, int k) {
    int best = 0;
    for (int l = 0; l < arr.length; l++) {
        long sum = 0;
        for (int r = l; r < arr.length; r++) {
            sum += arr[r];
            if (sum == k) best = Math.max(best, r - l + 1);
        }
    }
    return best;
}`,
          alt: [
            { lang: 'python', code: `def longest_subarray(arr, k):
    best = 0
    for l in range(len(arr)):
        total = 0
        for r in range(l, len(arr)):
            total += arr[r]
            if total == k:
                best = max(best, r - l + 1)
    return best` },
            { lang: 'js', code: `function longestSubarray(arr, k) {
  let best = 0;
  for (let l = 0; l < arr.length; l++) {
    let sum = 0;
    for (let r = l; r < arr.length; r++) {
      sum += arr[r];
      if (sum === k) best = Math.max(best, r - l + 1);
    }
  }
  return best;
}` },
            { lang: 'cpp', code: `int longestSubarray(vector<int>& arr, int k) {
    int best = 0;
    for (int l = 0; l < (int)arr.size(); l++) {
        long long sum = 0;
        for (int r = l; r < (int)arr.size(); r++) {
            sum += arr[r];
            if (sum == k) best = max(best, r - l + 1);
        }
    }
    return best;
}` }
          ]
        }
      },
      mcq: {
        q: 'You adapt the zero-sum code "if (found) measure; <b>else</b> insert" to K = 5 by looking up pf − 5. On arr = [5, 1, 4], what happens?',
        options: ['At i = 0, pf − 5 = 0 is found so pf = 5 is never stored; at i = 2 (pf = 10) the subarray [1, 4] is missed → answer 1 instead of 2', 'It works perfectly — the else-branch shortcut is always fine', 'It counts an empty subarray and returns 3', 'It throws a NullPointerException'],
        answer: 0,
        explain: 'For K ≠ 0 the lookup key (pf − k) and the insert key (pf) are different, so you must ALWAYS store pf → i when pf is new (putIfAbsent in Java, setdefault in Python, emplace in C++), not only when the lookup fails.'
      },
      hints: [
        `<p><b>Hint 1:</b> Sum of j+1..i = pf[i] − pf[j] = k ⇔ pf[j] = pf[i] − k. The longest one ending at i uses the earliest such j.</p>`,
        `<p><b>Hint 2:</b> Map balance → first index, seeded with {0: −1}. Use <code>long</code> for the running sum to be safe.</p>`,
        `<p><b>Hint 3 (recipe):</b> for i: pf += a[i]; if map has pf − k → best = max(best, i − map[pf − k]); store pf → i only if pf is not in the map yet. Edge cases: whole array (seed), k = 0, negatives and zeros (balances repeat → never overwrite).</p>`
      ],
      tests: { sig: 'int[] int -> int', fn: 'longestSubarray', cases: [
  [[[10, 5, 2, 7, 1, -10], 15], 6],
  [[[-5, 8, -14, 2, 4, 12], -5], 5],
  [[[1, 2, 3], 10], 0],
  [[[5], 5], 1],
  [[[0, 0, 0], 0], 3],
  [[[-100000, 100000, -100000], -100000], 3],
  [[[1, -1, 5, -2, 3], 3], 4],
  [[[2, 0, 0, 3], 3], 3]
] },
      solution: {
        approach: `<p><b>First-index map with a shifted lookup.</b> Same skeleton as the zero-sum version, but the partner balance is pf − k. The map holds the first index of each balance so every measured length is the longest possible for that end.</p>`,
        code: `class Solution {
    public int longestSubarray(int[] arr, int k) {
        Map<Long, Integer> first = new HashMap<>();
        first.put(0L, -1);
        long pf = 0;
        int best = 0;
        for (int i = 0; i < arr.length; i++) {
            pf += arr[i];
            Integer j = first.get(pf - k);
            if (j != null) best = Math.max(best, i - j);   // arr[j+1..i] sums to k
            first.putIfAbsent(pf, i);                      // keep earliest occurrence
        }
        return best;
    }
}`,
        alt: [{ lang: 'js', code: `function longestSubarray(arr, k) {
  const first = new Map([[0, -1]]);       // balance -> earliest index
  let pf = 0, best = 0;
  arr.forEach((x, i) => {
    pf += x;
    if (first.has(pf - k)) best = Math.max(best, i - first.get(pf - k));   // arr[j+1..i] sums to k
    if (!first.has(pf)) first.set(pf, i);                                  // keep the earliest
  });
  return best;
}` }, {
          lang: 'python', code: `def longest_subarray(arr, k):
    first, pf, best = {0: -1}, 0, 0
    for i, x in enumerate(arr):
        pf += x
        if pf - k in first:
            best = max(best, i - first[pf - k])
        first.setdefault(pf, i)
    return best`
        }, {
          lang: 'cpp', code: `int longestSubarray(vector<int>& arr, int k) {
    unordered_map<long long, int> first{{0, -1}};
    long long pf = 0;
    int best = 0;
    for (int i = 0; i < (int)arr.size(); i++) {
        pf += arr[i];
        auto it = first.find(pf - k);
        if (it != first.end()) best = max(best, i - it->second);
        first.emplace(pf, i);              // emplace does nothing if the key exists
    }
    return best;
}`
        }],
        dry: {
          head: ['i', 'arr[i]', 'pf', 'need pf − 15', 'first[need]', 'length', 'best', 'map update'],
          rows: [
            ['0', '10', '10', '−5', '—', '—', '0', H.c('g', '10:0')],
            ['1', '5', '15', '0', H.c('r', '−1'), '2', '2', H.c('g', '15:1')],
            ['2', '2', '17', '2', '—', '—', '2', H.c('g', '17:2')],
            ['3', '7', '24', '9', '—', '—', '2', H.c('g', '24:3')],
            ['4', '1', '25', '10', H.c('r', '0'), '4', '4', H.c('g', '25:4')],
            ['5', '−10', '15', '0', H.c('r', '−1'), '6', H.c('g', '6'), '15 exists → keep 15:1']
          ]
        },
        complexity: `<p><b>Time:</b> O(N) average. <b>Space:</b> O(N).</p>`,
        followUps: [
          'All elements positive → sliding window, O(1) space.',
          'Shortest subarray with sum exactly K → store the LAST index.',
          'Count (not longest) subarrays with sum K → map of counts (previous topic).'
        ]
      }
    }, {
      title: 'Contiguous Array (equal number of 0s and 1s)',
      level: 'Medium', tags: ['prefix sum', 'hashmap', '±1 trick'], companies: ['Meta', 'Amazon', 'Microsoft', 'Uber'],
      statement: `<p>Given a binary array <code>nums</code>, return the maximum length of a contiguous subarray with an <b>equal number of 0s and 1s</b>.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>5</sup>, nums[i] is 0 or 1`,
      example: `${H.arr([0, 1, 1, 0, 1, 1, 1, 0], { label: 'nums', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g' } })}<p>Output ${H.c('g', '4')}: [0, 1, 1, 0] has two 0s and two 1s. No longer balanced stretch exists.</p>`,
      brute: {
        why: `<p>For every start, extend and count zeros and ones; record when equal: <b>O(N<sup>2</sup>)</b> = 10<sup>10</sup> at N = 10<sup>5</sup>. The waste: "ones − zeros" is just a running balance, and equal balances can be matched with a map.</p>`,
        code: {
          lang: 'java',
          code: `int findMaxLengthBrute(int[] nums) {
    int best = 0;
    for (int l = 0; l < nums.length; l++) {
        int zeros = 0, ones = 0;
        for (int r = l; r < nums.length; r++) {
            if (nums[r] == 0) zeros++; else ones++;
            if (zeros == ones) best = Math.max(best, r - l + 1);
        }
    }
    return best;
}`,
          alt: [
            { lang: 'python', code: `def find_max_length(nums):
    best = 0
    for l in range(len(nums)):
        zeros = ones = 0
        for r in range(l, len(nums)):
            if nums[r] == 0:
                zeros += 1
            else:
                ones += 1
            if zeros == ones:
                best = max(best, r - l + 1)
    return best` },
            { lang: 'js', code: `function findMaxLength(nums) {
  let best = 0;
  for (let l = 0; l < nums.length; l++) {
    let zeros = 0, ones = 0;
    for (let r = l; r < nums.length; r++) {
      if (nums[r] === 0) zeros++; else ones++;
      if (zeros === ones) best = Math.max(best, r - l + 1);
    }
  }
  return best;
}` },
            { lang: 'cpp', code: `int findMaxLength(vector<int>& nums) {
    int best = 0;
    for (int l = 0; l < (int)nums.size(); l++) {
        int zeros = 0, ones = 0;
        for (int r = l; r < (int)nums.size(); r++) {
            if (nums[r] == 0) zeros++; else ones++;
            if (zeros == ones) best = max(best, r - l + 1);
        }
    }
    return best;
}` }
          ]
        }
      },
      mcq: {
        q: 'Why turn every 0 into −1?',
        options: ['Then "equal 0s and 1s" becomes "subarray sum is 0", which prefix sums + a map solve', 'To make all values negative so sliding window works', 'Because zeros cannot be added to a sum', 'To sort the array faster'],
        answer: 0,
        explain: 'With ±1, each 1 cancels one 0. Equal counts ⇔ net sum 0 ⇔ two equal running balances.'
      },
      hints: [
        `<p><b>Hint 1:</b> Track one number: (number of 1s) − (number of 0s) so far. A stretch is balanced when this number is the same at both ends.</p>`,
        `<p><b>Hint 2:</b> That is "longest subarray with sum 0" after mapping 0 → −1. Map balance → first index, seed {0: −1}.</p>`,
        `<p><b>Hint 3 (recipe):</b> bal = 0; for i: bal += (nums[i] == 1 ? 1 : −1); if bal in map → best = max(best, i − map[bal]) else map[bal] = i. Bonus: bal is in [−N, N], so an int array of size 2N+1 works instead of a map.</p>`
      ],
      tests: { sig: 'int[] -> int', fn: 'findMaxLength', cases: [
  [[[0, 1, 1, 0, 1, 1, 1, 0]], 4],
  [[[0, 1]], 2],
  [[[0, 1, 0]], 2],
  [[[0]], 0],
  [[[1, 1, 1]], 0],
  [[[0, 0, 1, 0, 0, 0, 1, 1]], 6],
  [[[1, 0, 1, 0, 1, 0]], 6],
  [[[1, 1, 0, 0, 0, 1]], 6]
] },
      solution: {
        approach: `<p><b>±1 balance + first-index map.</b> Map each 1 to +1 and each 0 to −1. A balanced subarray has net 0, i.e. equal balances at its two ends. Keep the first index of each balance; the longest gap between equal balances is the answer.</p>`,
        code: `class Solution {
    public int findMaxLength(int[] nums) {
        Map<Integer, Integer> first = new HashMap<>();
        first.put(0, -1);                          // balance 0 before index 0
        int bal = 0, best = 0;
        for (int i = 0; i < nums.length; i++) {
            bal += (nums[i] == 1) ? 1 : -1;        // deposit for 1, withdraw for 0
            Integer j = first.get(bal);
            if (j != null) best = Math.max(best, i - j);
            else first.put(bal, i);                // first time we see this balance
        }
        return best;
    }
}`,
        alt: [{ lang: 'js', code: `function findMaxLength(nums) {
  const n = nums.length;
  const first = new Int32Array(2 * n + 1).fill(-2);   // index = balance + n; -2 = not seen
  first[n] = -1;                                       // balance 0 before index 0
  let bal = 0, best = 0;
  for (let i = 0; i < n; i++) {
    bal += nums[i] === 1 ? 1 : -1;                     // +1 for a 1, -1 for a 0
    if (first[bal + n] !== -2) best = Math.max(best, i - first[bal + n]);
    else first[bal + n] = i;
  }
  return best;
}` }, { lang: 'cpp', code: `int findMaxLength(vector<int>& nums) {
    int n = nums.size();
    vector<int> first(2 * n + 1, INT_MIN);   // index = balance + n; INT_MIN = not seen
    first[n] = -1;                           // balance 0 before index 0
    int bal = 0, best = 0;
    for (int i = 0; i < n; i++) {
        bal += nums[i] == 1 ? 1 : -1;        // +1 for a 1, -1 for a 0
        int& f = first[bal + n];
        if (f != INT_MIN) best = max(best, i - f);
        else f = i;
    }
    return best;
}` }, {
          lang: 'java', title: 'Array instead of HashMap (balance offset by N)', code: `class SolutionArray {
    public int findMaxLength(int[] nums) {
        int n = nums.length;
        int[] first = new int[2 * n + 1];          // index = balance + n
        Arrays.fill(first, Integer.MIN_VALUE);     // "not seen yet"
        first[n] = -1;                              // balance 0 at index -1
        int bal = 0, best = 0;
        for (int i = 0; i < n; i++) {
            bal += (nums[i] == 1) ? 1 : -1;
            if (first[bal + n] != Integer.MIN_VALUE) best = Math.max(best, i - first[bal + n]);
            else first[bal + n] = i;
        }
        return best;
    }
}`
        }, {
          lang: 'python', code: `def find_max_length(nums):
    first, bal, best = {0: -1}, 0, 0
    for i, x in enumerate(nums):
        bal += 1 if x == 1 else -1
        if bal in first:
            best = max(best, i - first[bal])
        else:
            first[bal] = i
    return best`
        }],
        dry: {
          head: ['i', 'nums[i]', '±1', 'balance', 'map lookup', 'length', 'best'],
          rows: [
            ['0', '0', '−1', '−1', H.c('g', 'new → −1:0'), '—', '0'],
            ['1', '1', '+1', '0', H.c('r', 'first at −1'), '2', '2'],
            ['2', '1', '+1', '1', H.c('g', 'new → 1:2'), '—', '2'],
            ['3', '0', '−1', '0', H.c('r', 'first at −1'), '4', H.c('g', '4')],
            ['4', '1', '+1', '1', H.c('r', 'first at 2'), '2', '4'],
            ['5', '1', '+1', '2', H.c('g', 'new → 2:5'), '—', '4'],
            ['6', '1', '+1', '3', H.c('g', 'new → 3:6'), '—', '4'],
            ['7', '0', '−1', '2', H.c('r', 'first at 5'), '2', '4']
          ]
        },
        complexity: `<p><b>Time:</b> O(N). <b>Space:</b> O(N) (map or 2N+1 array).</p>`,
        followUps: [
          '<b>Count</b> subarrays with equal 0s and 1s → map of counts with seed {0: 1}.',
          'Equal 0s, 1s and 2s → key = pair (c1 − c0, c2 − c1).',
          'Longest substring with equal vowels and consonants (same ±1 trick on characters).'
        ]
      }
    }]
  });

  /* =====================================================================
     TOPIC 8 — Sliding window + hashing
     ===================================================================== */
  topics.push({
    title: 'Sliding Window + Hashing: Longest Substring Without Repeats & Minimum Window Substring',
    analogy: `<p>A <b>VIP lounge with a strict "no twins" rule</b>. Guests enter from the right door one by one; the bouncer keeps the <b>guest list</b> (a HashSet) of who is inside. If a newcomer's name is <b>already on the list</b>, people must leave through the left door — oldest first — until the earlier person with that name is gone. The bouncer's question every night: "what was the <b>biggest crowd</b> we ever had with no repeated names?" → <b>longest substring without repeating characters</b>.</p>
<p>Now flip it: a <b>shopping list</b> (the shopkeeper's tally of what you need: A×1, B×1, C×1). You walk down the aisle picking items into your basket (expand right). As soon as the basket covers the whole list, you try handing back items from the <b>front</b> of the basket (shrink left) while it still covers the list — looking for the <b>shortest stretch of aisle</b> that has everything → <b>minimum window substring</b>.</p>`,
    explain: `<p>Both problems use the <b>variable-size sliding window</b> from DSA 6, with a hash structure that describes what is <b>inside the window</b>. Two pointers, <code>left</code> and <code>right</code>, only ever move forward, so the total work is O(N).</p>

<h4>The universal template</h4>
<pre>left = 0
for right in 0..n-1:
    add s[right] to the window map        // expand
    while (window is INVALID / or can be improved):
        remove s[left] from the map; left++   // shrink
    update the answer using [left..right]</pre>
<p>What changes between problems is only: <b>what the map stores</b> and <b>what "valid" means</b>.</p>

<h4>Problem A — longest substring without repeating characters</h4>
<p>Window is valid when every character inside is unique. Use a <b>HashSet</b> of the window's characters. When <code>s[right]</code> is already in the set, shrink from the left (removing characters) until it is not.</p>
${H.table(['right', 'char', 'action', 'window', 'best'], [['0', 'a', H.c('g', 'add a'), 'a', '1'], ['1', 'b', H.c('g', 'add b'), 'ab', '2'], ['2', 'c', H.c('g', 'add c'), 'abc', '3'], ['3', 'a', H.c('r', 'a inside! remove a') + ', add a', 'bca', '3'], ['4', 'b', H.c('r', 'remove b') + ', add b', 'cab', '3'], ['5', 'c', H.c('r', 'remove c') + ', add c', 'abc', '3'], ['6', 'b', H.c('r', 'remove a, b') + ', add b', 'cb', '3'], ['7', 'b', H.c('r', 'remove c, b') + ', add b', 'b', '3']])}
<p><b>Faster jump:</b> store <code>char → last index</code> in a map. When you meet a repeat, jump <code>left = max(left, last[c] + 1)</code> in one step instead of removing one by one. The <code>max</code> matters: an old last index that is already outside the window must not pull <code>left</code> backwards ("abba").</p>

<h4>Problem B — minimum window substring</h4>
<p>Window is valid when it contains every character of <code>t</code> with at least the required multiplicity. Keep a <b>need map</b> (tally from t) and a counter <code>missing</code> = how many required characters are still missing.</p>
<ul>
<li>Expand: if <code>need[c] &gt; 0</code>, this character was actually needed → <code>missing−−</code>. Then <code>need[c]−−</code> (extra copies go negative = surplus).</li>
<li>While <code>missing == 0</code> (valid): record the window if shorter, then remove <code>s[left]</code>: <code>need[d]++</code>; if it becomes &gt; 0 we just gave away a required character → <code>missing++</code>.</li>
</ul>
${H.table(['event', 'window', 'length', 'best'], [['first valid at right = 5', 'ADOBEC', '6', 'ADOBEC'], ['valid again at right = 10, shrink', 'CODEBA', '6', 'ADOBEC'], ['valid again at right = 12, shrink', H.c('g', 'BANC'), '4', H.c('g', 'BANC')]])}
<p>For s = "ADOBECODEBANC", t = "ABC" the answer is <b>"BANC"</b>.</p>

<h4>Why it is O(N)</h4>
<p><code>right</code> moves N times; <code>left</code> also moves at most N times in total (it never goes back). Each move does O(1) hash work. So even though there is a <code>while</code> inside a <code>for</code>, the total is O(N) — <b>amortized</b> analysis.</p>`,
    clues: [
      '"longest / shortest substring or subarray" + a condition on its contents → sliding window + map/set',
      '"without repeating characters", "all unique", "no duplicates" → HashSet window or last-index map',
      '"contains all characters of t", "covers", "minimum window" → need-map + missing counter, shrink while valid',
      '"at most K distinct", "exactly K distinct" → window frequency map; exactly(K) = atMost(K) − atMost(K−1)',
      '"find all anagrams / permutation in string" → fixed-size window with counts',
      'N up to 10<sup>5</sup> and O(N<sup>2</sup>) substrings would TLE → two pointers that only move forward',
      '"characters can be any ASCII" → int[128] (or a HashMap for Unicode)'
    ],
    code: [{ lang: 'java', code: `
import java.util.*;

public class WindowHashing {
    // Longest substring without repeating characters — HashSet + shrink
    static int lengthOfLongestSubstringSet(String s) {
        Set<Character> window = new HashSet<>();
        int left = 0, best = 0;
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            while (window.contains(c)) {          // duplicate inside: shrink from the left
                window.remove(s.charAt(left++));
            }
            window.add(c);
            best = Math.max(best, right - left + 1);
        }
        return best;
    }

    // Longest substring with at most k distinct characters — the general template
    static int longestAtMostKDistinct(String s, int k) {
        Map<Character, Integer> cnt = new HashMap<>();
        int left = 0, best = 0;
        for (int right = 0; right < s.length(); right++) {
            cnt.merge(s.charAt(right), 1, Integer::sum);           // expand
            while (cnt.size() > k) {                                // invalid: too many distinct
                char d = s.charAt(left++);
                cnt.computeIfPresent(d, (key, v) -> v == 1 ? null : v - 1);
            }
            best = Math.max(best, right - left + 1);                // valid window
        }
        return best;
    }

    public static void main(String[] args) {
        System.out.println(lengthOfLongestSubstringSet("abcabcbb")); // 3
        System.out.println(lengthOfLongestSubstringSet("pwwkew"));   // 3
        System.out.println(longestAtMostKDistinct("eceba", 2));      // 3 ("ece")
    }
}`, alt: [{
      lang: 'python', run: true, title: 'Python (runnable): both problems',
      code: `from collections import Counter, defaultdict

def length_of_longest_substring_set(s):
    window, left, best = set(), 0, 0
    for right, c in enumerate(s):
        while c in window:              # duplicate inside: shrink from the left
            window.remove(s[left])
            left += 1
        window.add(c)
        best = max(best, right - left + 1)
    return best

def longest_at_most_k_distinct(s, k):
    cnt, left, best = defaultdict(int), 0, 0
    for right, c in enumerate(s):
        cnt[c] += 1                     # expand
        while len(cnt) > k:             # invalid: too many distinct
            d = s[left]
            cnt[d] -= 1
            if cnt[d] == 0:
                del cnt[d]
            left += 1
        best = max(best, right - left + 1)   # valid window
    return best

def min_window(s, t):
    need, missing = Counter(t), len(t)
    left, best = 0, (float("inf"), 0, 0)
    for right, c in enumerate(s):
        if need[c] > 0:
            missing -= 1
        need[c] -= 1
        while missing == 0:
            if right - left + 1 < best[0]:
                best = (right - left + 1, left, right + 1)
            need[s[left]] += 1
            if need[s[left]] > 0:
                missing += 1
            left += 1
    return "" if best[0] == float("inf") else s[best[1]:best[2]]

print(length_of_longest_substring_set("abcabcbb"))   # 3
print(length_of_longest_substring_set("pwwkew"))     # 3
print(longest_at_most_k_distinct("eceba", 2))        # 3 ("ece")
print(min_window("ADOBECODEBANC", "ABC"))            # BANC
print(repr(min_window("a", "aa")))                   # ''`
    }, { lang: 'js', run: true, code: `// Longest substring without repeating characters — Set + shrink
function lengthOfLongestSubstringSet(s) {
  const window = new Set();
  let left = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    while (window.has(c)) window.delete(s[left++]);   // duplicate inside: shrink from the left
    window.add(c);
    best = Math.max(best, right - left + 1);
  }
  return best;
}

// Longest substring with at most k distinct characters — the general template
function longestAtMostKDistinct(s, k) {
  const cnt = new Map();
  let left = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    cnt.set(s[right], (cnt.get(s[right]) || 0) + 1);  // expand
    while (cnt.size > k) {                            // invalid: too many distinct
      const d = s[left++];
      const c = cnt.get(d) - 1;
      if (c === 0) cnt.delete(d); else cnt.set(d, c);
    }
    best = Math.max(best, right - left + 1);          // valid window
  }
  return best;
}

console.log(lengthOfLongestSubstringSet('abcabcbb')); // 3
console.log(lengthOfLongestSubstringSet('pwwkew'));   // 3
console.log(longestAtMostKDistinct('eceba', 2));      // 3 ("ece")` }, { lang: 'cpp', code: `#include <bits/stdc++.h>
using namespace std;

// Longest substring without repeating characters — unordered_set + shrink
int lengthOfLongestSubstringSet(const string& s) {
    unordered_set<char> window;
    int left = 0, best = 0;
    for (int right = 0; right < (int)s.size(); right++) {
        char c = s[right];
        while (window.count(c)) window.erase(s[left++]);   // duplicate inside: shrink from the left
        window.insert(c);
        best = max(best, right - left + 1);
    }
    return best;
}

// Longest substring with at most k distinct characters — the general template
int longestAtMostKDistinct(const string& s, int k) {
    unordered_map<char, int> cnt;
    int left = 0, best = 0;
    for (int right = 0; right < (int)s.size(); right++) {
        cnt[s[right]]++;                                   // expand
        while ((int)cnt.size() > k) {                      // invalid: too many distinct
            char d = s[left++];
            if (--cnt[d] == 0) cnt.erase(d);
        }
        best = max(best, right - left + 1);                // valid window
    }
    return best;
}

int main() {
    cout << lengthOfLongestSubstringSet("abcabcbb") << "\\n";   // 3
    cout << lengthOfLongestSubstringSet("pwwkew") << "\\n";     // 3
    cout << longestAtMostKDistinct("eceba", 2) << "\\n";        // 3 ("ece")
}` }] }],
    codeTitle: 'Set-based window and the general at-most-K template',
    viz: [{
      title: 'Longest substring without repeats: HashSet window (add = green, removal = red)',
      input: 'abcabcbb',
      inputLabel: 'String (letters only, at most 16)',
      gen: function (input) {
        var s = parseWord(input, 16, 'string'), ch = s.split(''), set = [], left = 0, best = 0, bl = 0, br = -1, frames = [];
        frames.push({ narr: 'Window [left..right] must contain only unique characters. The HashSet holds exactly the characters inside the window.', parts: [{ type: 'array', label: 's', values: ch.slice() }, { type: 'set', label: 'window characters', items: [] }, { type: 'vars', vals: { left: 0, best: 0 } }] });
        for (var r = 0; r < ch.length; r++) {
          var c = ch[r];
          if (set.indexOf(c) >= 0) {
            frames.push({ narr: 'right = ' + r + ': <b>' + c + '</b> is <span class="c-r">already in the window</span> → we must shrink from the left until the old "' + c + '" is gone.', parts: [{ type: 'array', label: 's', values: ch.slice(), range: [left, r - 1], ptr: hlm(one(left, 'L'), one(r, 'R')), hl: one(r, 'bad') }, { type: 'set', label: 'window characters', items: set.slice(), hl: one(c, 'bad') }, { type: 'vars', vals: { left: left, right: r, best: best } }] });
          }
          while (set.indexOf(c) >= 0) {
            var d = ch[left];
            frames.push({ narr: 'Remove <b>' + d + '</b> (index ' + left + ') from the window, left → ' + (left + 1) + '.' + (d === c ? ' That was the old copy of "' + c + '" — the duplicate is gone.' : ''), parts: [{ type: 'array', label: 's', values: ch.slice(), range: [left + 1, r - 1], ptr: hlm(one(left + 1, 'L'), one(r, 'R')), hl: one(left, 'bad') }, { type: 'set', label: 'window characters', items: set.slice(), hl: one(d, 'bad') }, { type: 'vars', vals: { left: left + 1, right: r, best: best } }] });
            set.splice(set.indexOf(d), 1); left++;
          }
          set.push(c);
          var len = r - left + 1, imp = len > best;
          if (imp) { best = len; bl = left; br = r; }
          frames.push({ narr: '<span class="c-g">Add</span> <b>' + c + '</b>. Window "' + s.slice(left, r + 1) + '" has length ' + len + '. ' + (imp ? '<b>New best = ' + best + '</b>.' : 'Best stays ' + best + '.'), parts: [{ type: 'array', label: 's', values: ch.slice(), range: [left, r], ptr: hlm(one(left, 'L'), one(r, 'R')), hl: one(r, 'ok') }, { type: 'set', label: 'window characters', items: set.slice(), hl: one(c, 'ok') }, { type: 'vars', vals: { left: left, right: r, length: len, best: best }, hl: { best: imp ? 'ok' : '' } }] });
        }
        frames.push({ narr: 'Answer: <b>' + best + '</b> ("' + s.slice(bl, br + 1) + '"). Each character was added once and removed at most once → O(N).', parts: [{ type: 'array', label: 's', values: ch.slice(), hl: rng(bl, br, 'sel') }, { type: 'vars', vals: { answer: best }, hl: { answer: 'sel' } }] });
        return frames;
      }
    }, {
      title: 'Same problem, faster jump: map char → last index, left = max(left, last + 1)',
      input: 'abba',
      inputLabel: 'String (letters only, at most 16)',
      gen: function (input) {
        var s = parseWord(input, 16, 'string'), ch = s.split(''), last = new Map(), left = 0, best = 0, frames = [];
        frames.push({ narr: 'Instead of removing characters one by one, remember where each character was <b>last</b> seen. On a repeat, jump left past it. Watch "abba": the max() protects us from jumping backwards.', parts: [{ type: 'array', label: 's', values: ch.slice() }, { type: 'map', label: 'char → last index', entries: [] }, { type: 'vars', vals: { left: 0, best: 0 } }] });
        for (var r = 0; r < ch.length; r++) {
          var c = ch[r], had = last.has(c), note;
          if (had && last.get(c) >= left) {
            note = '<b>' + c + '</b> was last seen at ' + last.get(c) + ', which is <span class="c-r">inside</span> the window → jump left to ' + (last.get(c) + 1) + '.';
            left = last.get(c) + 1;
          } else if (had) {
            note = '<b>' + c + '</b> was last seen at ' + last.get(c) + ', but that is <b>before</b> left = ' + left + ' (already outside the window) → left stays. Without max() we would wrongly move left back to ' + (last.get(c) + 1) + '!';
          } else note = '<b>' + c + '</b> never seen → <span class="c-g">new key</span>, left stays ' + left + '.';
          last.set(c, r);
          var len = r - left + 1, imp = len > best;
          if (imp) best = len;
          frames.push({ narr: 'right = ' + r + ': ' + note + ' Window length ' + len + (imp ? ', <b>new best ' + best + '</b>.' : '.'), parts: [{ type: 'array', label: 's', values: ch.slice(), range: [left, r], ptr: hlm(one(left, 'L'), one(r, 'R')), hl: one(r, had ? 'bad' : 'ok') }, { type: 'map', label: 'char → last index', entries: ents(last), hl: one(c, had ? 'bad' : 'ok') }, { type: 'vars', vals: { left: left, right: r, best: best }, hl: { best: imp ? 'ok' : '' } }] });
        }
        frames.push({ narr: 'Answer: <b>' + best + '</b>. One pass, O(1) work per character, no inner loop at all.', parts: [{ type: 'map', label: 'char → last index', entries: ents(last) }, { type: 'vars', vals: { answer: best }, hl: { answer: 'sel' } }] });
        return frames;
      }
    }, {
      title: 'Minimum window substring: need-map + missing counter, expand then shrink',
      input: 'ADOBECODEBANC | ABC',
      inputLabel: 's | t  (letters only; s at most 16, t at most 6)',
      gen: function (input) {
        var p = splitBar(input, 2, 'ADOBECODEBANC | ABC'), s = parseWord(p[0], 16, 's'), t = parseWord(p[1], 6, 't'), ch = s.split('');
        var need = new Map(), missing = t.length, left = 0, bestLen = Infinity, bestL = 0, frames = [];
        t.split('').forEach(function (c) { need.set(c, (need.get(c) || 0) + 1); });
        function needView() { var out = []; need.forEach(function (v, k) { if (t.indexOf(k) >= 0) out.push([k, v]); }); return out; }
        frames.push({ narr: 'Tally of t: what we still need. <b>missing</b> = ' + missing + ' characters. Positive need = still required; 0 = exactly satisfied; negative = surplus in the window.', parts: [{ type: 'array', label: 's', values: ch.slice() }, { type: 'map', label: 'need (chars of t)', entries: needView() }, { type: 'vars', vals: { missing: missing, best: '—' } }] });
        for (var r = 0; r < ch.length; r++) {
          var c = ch[r], useful = (need.get(c) || 0) > 0;
          if (useful) missing--;
          need.set(c, (need.get(c) || 0) - 1);
          frames.push({ narr: 'right = ' + r + ': take <b>' + c + '</b>. ' + (useful ? '<span class="c-g">It was needed</span> → missing = ' + missing + '.' : (t.indexOf(c) >= 0 ? 'Already have enough ' + c + ' → surplus (need ' + need.get(c) + ').' : 'Not in t → irrelevant.')), parts: [{ type: 'array', label: 's', values: ch.slice(), range: [left, r], ptr: hlm(one(left, 'L'), one(r, 'R')), hl: one(r, useful ? 'ok' : 'cur') }, { type: 'map', label: 'need (chars of t)', entries: needView(), hl: useful ? one(c, 'ok') : {} }, { type: 'vars', vals: { missing: missing, best: bestLen === Infinity ? '—' : s.substr(bestL, bestLen) }, hl: { missing: useful ? 'ok' : '' } }] });
          while (missing === 0) {
            var len = r - left + 1, imp = len < bestLen;
            if (imp) { bestLen = len; bestL = left; }
            var d = ch[left];
            need.set(d, need.get(d) + 1);
            var lost = need.get(d) > 0;
            if (lost) missing++;
            frames.push({ narr: 'Window "' + s.slice(left, r + 1) + '" (length ' + len + ') covers t. ' + (imp ? '<b>New best!</b> ' : '') + 'Try to shrink: <span class="c-r">remove ' + d + '</span>. ' + (lost ? 'That was a required copy → missing = ' + missing + ', window no longer valid, stop shrinking.' : 'Still valid (it was surplus or irrelevant) → keep shrinking.'), parts: [{ type: 'array', label: 's', values: ch.slice(), range: [left + 1, r], ptr: hlm(one(left + 1, 'L'), one(r, 'R')), hl: hlm(one(left, 'bad')) }, { type: 'map', label: 'need (chars of t)', entries: needView(), hl: t.indexOf(d) >= 0 ? one(d, 'bad') : {} }, { type: 'vars', vals: { missing: missing, best: s.substr(bestL, bestLen) }, hl: { best: imp ? 'sel' : '', missing: lost ? 'bad' : '' } }] });
            left++;
          }
        }
        frames.push({ narr: bestLen === Infinity ? 'No window covers t → return "".' : 'Answer: <b>"' + s.substr(bestL, bestLen) + '"</b> (length ' + bestLen + '). Both pointers moved at most N times → O(|s| + |t|).', parts: [{ type: 'array', label: 's', values: ch.slice(), hl: bestLen === Infinity ? {} : rng(bestL, bestL + bestLen - 1, 'sel') }, { type: 'vars', vals: { answer: bestLen === Infinity ? '""' : s.substr(bestL, bestLen) }, hl: { answer: 'sel' } }] });
        return frames;
      }
    }],
    examples: [{
      title: '"abba" — the max() in the jump version',
      html: `${H.table(['right', 'char', 'last[char]', 'left', 'window', 'best'], [['0', 'a', '—', '0', 'a', '1'], ['1', 'b', '—', '0', 'ab', '2'], ['2', 'b', '1 (inside)', H.c('r', '2'), 'b', '2'], ['3', 'a', '0 (outside!)', H.c('g', 'max(2, 1) = 2'), 'ba', '2']])}
<p>Without <code>max</code>, at right = 3 left would jump <b>back</b> to 1 and the window "bba" (length 3) would be wrongly accepted.</p>`
    }, {
      title: '"pwwkew" → 3, and substring ≠ subsequence',
      html: `<p>The answer is "wke" (length 3). "pwke" is <b>not</b> valid — it skips a character, so it is a subsequence, not a substring. Windows are always contiguous.</p>
${H.arr(['p', 'w', 'w', 'k', 'e', 'w'], { label: 's', hl: { 2: 'g', 3: 'g', 4: 'g' } })}`
    }, {
      title: 'Longest substring with at most 2 distinct characters',
      html: `<p>s = "eceba", K = 2. Window map grows: e, c, e → {e:2, c:1} (size 2, length 3). Adding b makes size 3 → shrink: remove e (e:1), remove c (c:0 → delete) → size 2 window "eb". Best = 3 ("ece"). The only change from Problem A: "valid" means <code>map.size() ≤ K</code>.</p>`
    }, {
      title: 'Find all anagrams of p in s (fixed-size window)',
      html: `<p>s = "cbaebabacd", p = "abc". Slide a window of length 3 with a count map; whenever it equals p's counts, record the start. Answer [0, 6] ("cba", "bac"). A neat trick: keep a <code>matches</code> counter of letters whose counts agree, so each slide is O(1) instead of comparing 26 counts.</p>`,
      code: { lang: 'java', code: `List<Integer> findAnagrams(String s, String p) {
    List<Integer> res = new ArrayList<>();
    if (p.length() > s.length()) return res;
    int[] need = new int[26], win = new int[26];
    for (char c : p.toCharArray()) need[c - 'a']++;
    for (int i = 0; i < s.length(); i++) {
        win[s.charAt(i) - 'a']++;                              // enter
        if (i >= p.length()) win[s.charAt(i - p.length()) - 'a']--; // leave
        if (i >= p.length() - 1 && Arrays.equals(win, need)) res.add(i - p.length() + 1);
    }
    return res;
}`, alt: [{ lang: 'python', code: `def find_anagrams(s, p):
    res, m = [], len(p)
    if m > len(s):
        return res
    need, win = [0] * 26, [0] * 26
    for c in p:
        need[ord(c) - 97] += 1
    for i, c in enumerate(s):
        win[ord(c) - 97] += 1                    # enter
        if i >= m:
            win[ord(s[i - m]) - 97] -= 1         # leave
        if i >= m - 1 and win == need:           # list == compares element by element
            res.append(i - m + 1)
    return res` }, { lang: 'js', code: `function findAnagrams(s, p) {
  const res = [], m = p.length;
  if (m > s.length) return res;
  const need = new Array(26).fill(0), win = new Array(26).fill(0);
  for (const c of p) need[c.charCodeAt(0) - 97]++;
  for (let i = 0; i < s.length; i++) {
    win[s.charCodeAt(i) - 97]++;                             // enter
    if (i >= m) win[s.charCodeAt(i - m) - 97]--;             // leave
    if (i >= m - 1 && win.every((v, j) => v === need[j])) res.push(i - m + 1);
  }
  return res;
}` }, { lang: 'cpp', code: `vector<int> findAnagrams(const string& s, const string& p) {
    vector<int> res;
    int m = p.size();
    if (m > (int)s.size()) return res;
    array<int, 26> need{}, win{};
    for (char c : p) need[c - 'a']++;
    for (int i = 0; i < (int)s.size(); i++) {
        win[s[i] - 'a']++;                                   // enter
        if (i >= m) win[s[i - m] - 'a']--;                   // leave
        if (i >= m - 1 && win == need) res.push_back(i - m + 1);   // array == compares all 26
    }
    return res;
}` }] }
    }],
    deepDive: `<p><b>Amortized proof.</b> In both algorithms each index enters the window once (when <code>right</code> passes it) and leaves at most once (when <code>left</code> passes it). Hash operations are O(1) average, so total time is O(N) (plus O(|t|) to build the need map). Space is O(Σ) — the alphabet size — not O(N).</p>
<p><b>Set version vs jump version.</b> The set version may touch a character twice (add + remove); the jump version touches each once but needs the <code>max(left, last + 1)</code> guard because it never deletes stale entries. With a fixed alphabet use <code>int[128]</code> filled with −1 for "last index" — fastest in practice. For Unicode, iterate code points and use a <code>HashMap&lt;Integer,Integer&gt;</code>.</p>
<p><b>Minimum window details.</b> The <code>missing</code> counter turns "does the window cover t?" from an O(Σ) comparison into an O(1) check. Equivalent formulation: <code>required = distinct chars of t</code>, <code>formed</code> = how many distinct chars currently meet their quota. With duplicates in t ("AABC"), multiplicities matter: "ABC" does not cover "AABC". An optimization for very long s with short t: first filter s to positions whose character is in t, then slide over that shorter list.</p>
<p><b>When sliding window breaks.</b> The window technique needs <b>monotonicity</b>: if a window is valid, every bigger window (for "minimum") or every smaller window (for "longest") must also be valid. Unique characters and "covers t" both have it. "Subarray sum = K with negatives" does not — that is why topics 5–7 use prefix sums + hashing instead.</p>
<p><b>Exactly K distinct.</b> "Number of subarrays with exactly K distinct integers" is not directly monotone, but <code>exactly(K) = atMost(K) − atMost(K − 1)</code>, and each atMost is a monotone window count (add <code>right − left + 1</code> per step). That identity is a top-tier interview trick (LeetCode 992).</p>`,
    aiEra: `<p><b>What AI changes:</b> both problems are famous and AI produces them reliably. The template is what you should internalize, because interviews now remix it: "at most K distinct", "with at most one replacement", "covering all items with quantities", "streaming log of user IDs".</p>
<p><b>Use AI as a partner:</b> <code>Give me the generic sliding-window-with-map template and 6 problems that are instances of it, with the one line that changes</code>; <code>Generate inputs for min window substring with duplicate letters in t, t longer than s, uppercase vs lowercase</code>; <code>Explain the amortized O(N) proof in two sentences</code>.</p>
<p><b>Where AI goes wrong:</b> missing the <code>max()</code> in the jump version ("abba"), comparing <code>Integer</code> counts with <code>==</code> in Java (works below 128 thanks to the cache, silently breaks above), ignoring multiplicities of t, returning <code>s.substring(l, r)</code> with an off-by-one, and applying sliding window to sums with negatives.</p>
<p><b>What you must still own:</b> defining what "valid" means, proving monotonicity before choosing the window, and explaining why nested <code>while</code> inside <code>for</code> is still O(N).</p>`,
    problems: [{
      title: 'Longest Substring Without Repeating Characters',
      level: 'Medium', tags: ['sliding window', 'hashset', 'hashmap'], companies: ['Amazon', 'Google', 'Meta', 'Microsoft', 'Bloomberg', 'Adobe'],
      statement: `<p>Given a string <code>s</code>, return the length of the longest <b>substring</b> (contiguous) that contains no repeated characters.</p>`,
      constraints: `0 ≤ s.length ≤ 5·10<sup>4</sup>; s consists of English letters, digits, symbols and spaces.`,
      example: `${H.arr(['a', 'b', 'c', 'a', 'b', 'c', 'b', 'b'], { label: 's', hl: { 0: 'g', 1: 'g', 2: 'g' } })}<p>Output ${H.c('g', '3')} — "abc". For "bbbbb" → 1, for "pwwkew" → 3 ("wke"), for "" → 0.</p>`,
      brute: {
        why: `<p>For every start i, extend j while characters stay unique (using a set), and record the longest. That is <b>O(N<sup>2</sup>)</b> in the worst case (≈ 10<sup>9</sup> for N = 5·10<sup>4</sup> with a large alphabet). The waste: after a duplicate at j, starting over from i + 1 re-scans characters we already know are unique.</p>`,
        code: {
          lang: 'java',
          code: `int lengthOfLongestSubstringBrute(String s) {
    int best = 0;
    for (int i = 0; i < s.length(); i++) {
        Set<Character> seen = new HashSet<>();
        for (int j = i; j < s.length(); j++) {
            if (!seen.add(s.charAt(j))) break;      // repeat: this start can go no further
            best = Math.max(best, j - i + 1);
        }
    }
    return best;
}`,
          alt: [
            { lang: 'python', code: `def length_of_longest_substring(s):
    best = 0
    for i in range(len(s)):
        seen = set()
        for j in range(i, len(s)):
            if s[j] in seen:
                break              # repeat: this start can go no further
            seen.add(s[j])
            best = max(best, j - i + 1)
    return best` },
            { lang: 'js', code: `function lengthOfLongestSubstring(s) {
  let best = 0;
  for (let i = 0; i < s.length; i++) {
    const seen = new Set();
    for (let j = i; j < s.length; j++) {
      if (seen.has(s[j])) break;      // repeat: this start can go no further
      seen.add(s[j]);
      best = Math.max(best, j - i + 1);
    }
  }
  return best;
}` },
            { lang: 'cpp', code: `int lengthOfLongestSubstring(string s) {
    int best = 0;
    for (int i = 0; i < (int)s.size(); i++) {
        unordered_set<char> seen;
        for (int j = i; j < (int)s.size(); j++) {
            if (!seen.insert(s[j]).second) break;      // repeat: this start can go no further
            best = max(best, j - i + 1);
        }
    }
    return best;
}` }
          ]
        }
      },
      mcq: {
        q: 'Jump version: s = "abba". At right = 3 (char a), last[a] = 0 and left = 2. What should left become?',
        options: ['2 — max(left, last[a] + 1) = max(2, 1)', '1 — always last[a] + 1', '0 — restart from the beginning', '3 — start fresh at right'],
        answer: 0,
        explain: 'The old "a" at index 0 is already outside the window [2..2]. Moving left back to 1 would re-admit the duplicate "b". max() keeps left monotone.'
      },
      hints: [
        `<p><b>Hint 1:</b> If s[i..j] has no repeats, so does every substring inside it. So when you hit a repeat, you do not need to restart — just move the left edge forward past the earlier copy.</p>`,
        `<p><b>Hint 2:</b> Keep the window's characters in a HashSet (shrink one by one) or a map char → last index (jump directly).</p>`,
        `<p><b>Hint 3 (recipe):</b> left = 0; for right: c = s[right]; if c in last and last[c] ≥ left → left = last[c] + 1; last[c] = right; best = max(best, right − left + 1). Edge cases: empty string, all same char, spaces/symbols (use a map or int[128]).</p>`
      ],
      tests: { sig: 'string -> int', fn: 'lengthOfLongestSubstring', cases: [
  [['abcabcbb'], 3],
  [['bbbbb'], 1],
  [['pwwkew'], 3],
  [[''], 0],
  [[' '], 1],
  [['abba'], 2],
  [['dvdf'], 3],
  [['a1!a 1'], 4],
  [['tmmzuxt'], 5]
] },
      solution: {
        approach: `<p><b>Sliding window with a last-index map.</b> The window [left..right] always holds unique characters. On a repeat whose previous index is inside the window, jump left just past it. Each character is processed once, so the scan is linear.</p>`,
        code: `class Solution {
    public int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> last = new HashMap<>();   // char -> last index seen
        int left = 0, best = 0;
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            Integer prev = last.get(c);
            if (prev != null && prev >= left) left = prev + 1;   // duplicate inside window: jump
            last.put(c, right);
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}`,
        alt: [{ lang: 'js', code: `function lengthOfLongestSubstring(s) {
  const last = new Map();                 // char -> last index seen
  let left = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    if (last.has(c) && last.get(c) >= left) left = last.get(c) + 1;   // duplicate inside: jump
    last.set(c, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}` }, {
          lang: 'java', title: 'int[128] instead of a HashMap (fastest)', code: `class SolutionArray {
    public int lengthOfLongestSubstring(String s) {
        int[] last = new int[128];
        Arrays.fill(last, -1);
        int left = 0, best = 0;
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            left = Math.max(left, last[c] + 1);   // max() handles stale indexes like in "abba"
            last[c] = right;
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}`
        }, {
          lang: 'python', code: `def length_of_longest_substring(s):
    last, left, best = {}, 0, 0
    for right, c in enumerate(s):
        if c in last and last[c] >= left:
            left = last[c] + 1
        last[c] = right
        best = max(best, right - left + 1)
    return best`
        }, {
          lang: 'cpp', code: `int lengthOfLongestSubstring(string s) {
    vector<int> last(256, -1);
    int left = 0, best = 0;
    for (int right = 0; right < (int)s.size(); right++) {
        unsigned char c = s[right];
        left = max(left, last[c] + 1);
        last[c] = right;
        best = max(best, right - left + 1);
    }
    return best;
}`
        }],
        dry: {
          head: ['right', 's[right]', 'last[c] before', 'left after', 'window', 'best'],
          rows: [
            ['0', 'a', '—', '0', 'a', '1'],
            ['1', 'b', '—', '0', 'ab', '2'],
            ['2', 'c', '—', '0', 'abc', H.c('g', '3')],
            ['3', 'a', H.c('r', '0 (inside)'), '1', 'bca', '3'],
            ['4', 'b', H.c('r', '1 (inside)'), '2', 'cab', '3'],
            ['5', 'c', H.c('r', '2 (inside)'), '3', 'abc', '3'],
            ['6', 'b', H.c('r', '4 (inside)'), '5', 'cb', '3'],
            ['7', 'b', H.c('r', '6 (inside)'), '7', 'b', '3']
          ]
        },
        complexity: `<p><b>Time:</b> O(N) — one pass, O(1) map work per character. <b>Space:</b> O(min(N, Σ)) where Σ is the alphabet size (128 for ASCII).</p>`,
        followUps: [
          'Return the substring itself (track bestLeft).',
          'Longest substring with at most K distinct characters (map of counts, shrink while size &gt; K).',
          'Longest substring where each character appears at most twice.',
          'Longest Repeating Character Replacement (window valid if length − maxFreq ≤ k).'
        ]
      }
    }, {
      title: 'Minimum Window Substring',
      level: 'Hard', tags: ['sliding window', 'hashmap', 'two pointers'], companies: ['Meta', 'Amazon', 'Google', 'Microsoft', 'LinkedIn', 'Airbnb'],
      statement: `<p>Given strings <code>s</code> and <code>t</code>, return the <b>shortest substring of s</b> that contains every character of <code>t</code> <b>including duplicates</b>. If no such substring exists, return "". The answer is unique when it exists.</p>`,
      constraints: `1 ≤ |s|, |t| ≤ 10<sup>5</sup>; s and t consist of uppercase and lowercase English letters. Target O(|s| + |t|).`,
      example: `<p>s = "ADOBECODEBANC", t = "ABC" → ${H.c('g', '"BANC"')}.</p>
${H.arr('ADOBECODEBANC'.split(''), { label: 's', hl: { 9: 'g', 10: 'g', 11: 'g', 12: 'g' } })}
<p>s = "a", t = "aa" → ${H.c('r', '""')} (s has only one 'a', t needs two).</p>`,
      brute: {
        why: `<p>For every start l, extend r and maintain counts; as soon as the window covers t (check 52 letter counts), record it and stop extending. That is <b>O(|s|<sup>2</sup> · Σ)</b> ≈ 5·10<sup>11</sup> at the limits. The waste: after finding a valid window at (l, r), the next start l + 1 re-extends over the same characters instead of reusing the counts.</p>`,
        code: {
          lang: 'java',
          code: `String minWindowBrute(String s, String t) {
    int[] need = new int[128];
    for (char c : t.toCharArray()) need[c]++;
    String best = "";
    for (int l = 0; l < s.length(); l++) {
        int[] have = new int[128];
        for (int r = l; r < s.length(); r++) {
            have[s.charAt(r)]++;
            if (covers(have, need)) {
                if (best.isEmpty() || r - l + 1 < best.length()) best = s.substring(l, r + 1);
                break;                         // longer windows from this l cannot be shorter
            }
        }
    }
    return best;
}

boolean covers(int[] have, int[] need) {
    for (int c = 0; c < 128; c++) if (have[c] < need[c]) return false;
    return true;
}`,
          alt: [
            { lang: 'python', code: `def min_window(s, t):
    need = [0] * 128
    for c in t:
        need[ord(c)] += 1
    best = ""
    for l in range(len(s)):
        have = [0] * 128
        for r in range(l, len(s)):
            have[ord(s[r])] += 1
            if covers(have, need):
                if best == "" or r - l + 1 < len(best):
                    best = s[l:r + 1]
                break              # longer windows from this l cannot be shorter
    return best


def covers(have, need):
    return all(have[c] >= need[c] for c in range(128))` },
            { lang: 'js', code: `function minWindow(s, t) {
  const need = new Array(128).fill(0);
  for (const c of t) need[c.charCodeAt(0)]++;
  let best = "";
  for (let l = 0; l < s.length; l++) {
    const have = new Array(128).fill(0);
    for (let r = l; r < s.length; r++) {
      have[s.charCodeAt(r)]++;
      if (covers(have, need)) {
        if (best === "" || r - l + 1 < best.length) best = s.slice(l, r + 1);
        break;                         // longer windows from this l cannot be shorter
      }
    }
  }
  return best;
}

function covers(have, need) {
  for (let c = 0; c < 128; c++) if (have[c] < need[c]) return false;
  return true;
}` },
            { lang: 'cpp', code: `bool covers(const vector<int>& have, const vector<int>& need) {
    for (int c = 0; c < 128; c++) if (have[c] < need[c]) return false;
    return true;
}

string minWindow(string s, string t) {
    vector<int> need(128, 0);
    for (char c : t) need[c]++;
    string best = "";
    for (size_t l = 0; l < s.size(); l++) {
        vector<int> have(128, 0);
        for (size_t r = l; r < s.size(); r++) {
            have[s[r]]++;
            if (covers(have, need)) {
                if (best.empty() || r - l + 1 < best.size()) best = s.substr(l, r - l + 1);
                break;                 // longer windows from this l cannot be shorter
            }
        }
    }
    return best;
}` }
          ]
        }
      },
      mcq: {
        q: 'While shrinking a valid window, you remove s[left] = \'D\' (not in t) and then \'B\' where need[B] goes from 0 to 1. What do you do?',
        options: ['After removing D keep shrinking; after B the window is invalid (missing++), so stop and expand right again', 'Stop at D because the window changed', 'Keep shrinking after B too — validity is only checked at the end', 'Reset the window to start at right'],
        answer: 0,
        explain: 'Removing irrelevant or surplus characters keeps the window valid, so keep shrinking. When a count of a required char becomes positive, a requirement is unmet: missing++ and the shrink loop ends.'
      },
      hints: [
        `<p><b>Hint 1:</b> If window [l..r] covers t, then any bigger window also does (monotonic). So: grow right until it covers t, then shrink left as much as possible while it still covers t. Record each such tight window.</p>`,
        `<p><b>Hint 2:</b> Keep a <b>need</b> tally from t and a single integer <b>missing</b> = number of required characters not yet in the window. That makes "is it valid?" an O(1) check.</p>`,
        `<p><b>Hint 3 (recipe):</b> for right: if need[c] &gt; 0 → missing−−; need[c]−−. while missing == 0: record [left..right]; need[s[left]]++; if need[s[left]] &gt; 0 → missing++; left++. Return the best or "". Edge cases: |t| &gt; |s|, duplicates in t, case sensitivity.</p>`
      ],
      tests: { sig: 'string string -> string', fn: 'minWindow', cases: [
  [['ADOBECODEBANC', 'ABC'], 'BANC'],
  [['a', 'a'], 'a'],
  [['a', 'aa'], ''],
  [['aa', 'aa'], 'aa'],
  [['ab', 'b'], 'b'],
  [['bba', 'ab'], 'ba'],
  [['aAbB', 'AB'], 'AbB'],
  [['cabwefgewcwaefgcf', 'cae'], 'cwae'],
  [['abc', 'd'], '']
] },
      solution: {
        approach: `<p><b>Expand–shrink window with a need map.</b> The need map starts as t's tally. Taking a character decrements it; a positive value before decrementing means it fulfilled a requirement (missing−−). When missing hits 0, the window covers t: record it, then give characters back from the left until a requirement breaks. Both pointers only move forward → O(|s| + |t|).</p>`,
        code: `class Solution {
    public String minWindow(String s, String t) {
        if (t.length() > s.length()) return "";
        Map<Character, Integer> need = new HashMap<>();      // char -> how many more we need (negative = surplus)
        for (char c : t.toCharArray()) need.merge(c, 1, Integer::sum);
        int missing = t.length();                            // required chars not yet in the window
        int left = 0, bestLeft = 0, bestLen = Integer.MAX_VALUE;

        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            if (need.getOrDefault(c, 0) > 0) missing--;      // this char fills a requirement
            need.merge(c, -1, Integer::sum);                 // take it into the window

            while (missing == 0) {                           // window covers t: try to shrink
                if (right - left + 1 < bestLen) { bestLen = right - left + 1; bestLeft = left; }
                char d = s.charAt(left++);
                int after = need.merge(d, 1, Integer::sum);  // give d back
                if (after > 0) missing++;                    // we just lost a required copy
            }
        }
        return bestLen == Integer.MAX_VALUE ? "" : s.substring(bestLeft, bestLeft + bestLen);
    }
}`,
        alt: [{ lang: 'js', code: `function minWindow(s, t) {
  const need = new Map();                 // char -> how many more we need (negative = surplus)
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);
  let missing = t.length, left = 0, bestLeft = 0, bestLen = Infinity;
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    if ((need.get(c) || 0) > 0) missing--;          // fills a requirement
    need.set(c, (need.get(c) || 0) - 1);
    while (missing === 0) {                         // window covers t: shrink
      if (right - left + 1 < bestLen) { bestLen = right - left + 1; bestLeft = left; }
      const d = s[left++];
      need.set(d, need.get(d) + 1);                 // give d back
      if (need.get(d) > 0) missing++;               // lost a required copy
    }
  }
  return bestLen === Infinity ? '' : s.slice(bestLeft, bestLeft + bestLen);
}` }, { lang: 'cpp', code: `string minWindow(string s, string t) {
    array<int, 128> need{};                 // char -> how many more we need (negative = surplus)
    for (char c : t) need[c]++;
    int missing = t.size(), left = 0, bestLeft = 0, bestLen = INT_MAX;
    for (int right = 0; right < (int)s.size(); right++) {
        if (need[s[right]]-- > 0) missing--;          // fills a requirement
        while (missing == 0) {                        // window covers t: shrink
            if (right - left + 1 < bestLen) { bestLen = right - left + 1; bestLeft = left; }
            if (++need[s[left++]] > 0) missing++;     // lost a required copy
        }
    }
    return bestLen == INT_MAX ? "" : s.substr(bestLeft, bestLen);
}` }, {
          lang: 'java', title: 'int[128] version (same logic, faster)', code: `class SolutionArray {
    public String minWindow(String s, String t) {
        int[] need = new int[128];
        for (char c : t.toCharArray()) need[c]++;
        int missing = t.length(), left = 0, bestLeft = 0, bestLen = Integer.MAX_VALUE;
        for (int right = 0; right < s.length(); right++) {
            if (need[s.charAt(right)]-- > 0) missing--;
            while (missing == 0) {
                if (right - left + 1 < bestLen) { bestLen = right - left + 1; bestLeft = left; }
                if (++need[s.charAt(left++)] > 0) missing++;
            }
        }
        return bestLen == Integer.MAX_VALUE ? "" : s.substring(bestLeft, bestLeft + bestLen);
    }
}`
        }, {
          lang: 'python', code: `from collections import Counter

def min_window(s, t):
    need, missing = Counter(t), len(t)
    left, best_l, best_len = 0, 0, float("inf")
    for right, c in enumerate(s):
        if need[c] > 0:
            missing -= 1
        need[c] -= 1
        while missing == 0:
            if right - left + 1 < best_len:
                best_l, best_len = left, right - left + 1
            need[s[left]] += 1
            if need[s[left]] > 0:
                missing += 1
            left += 1
    return "" if best_len == float("inf") else s[best_l:best_l + best_len]`
        }],
        dry: {
          head: ['right', 's[right]', 'missing after', 'shrink phase (left moves)', 'best'],
          rows: [
            ['0', 'A', H.c('g', '2'), '—', '—'],
            ['1–2', 'D, O', '2', 'not in t → surplus', '—'],
            ['3', 'B', H.c('g', '1'), '—', '—'],
            ['4', 'E', '1', '—', '—'],
            ['5', 'C', H.c('g', '0'), 'record "ADOBEC" (6); remove A → ' + H.c('r', 'missing 1') + ', left = 1', 'ADOBEC'],
            ['6–9', 'O, D, E, B', '1', 'B is surplus (need B = −1)', 'ADOBEC'],
            ['10', 'A', H.c('g', '0'), 'record 1..10 (10); remove D, O, B, E (still valid), record "CODEBA" (6, not shorter); remove C → ' + H.c('r', 'missing 1') + ', left = 6', 'ADOBEC'],
            ['11', 'N', '1', '—', 'ADOBEC'],
            ['12', 'C', H.c('g', '0'), 'remove O, D, E (valid) → record "EBANC" (5), then "BANC" (4); remove B → ' + H.c('r', 'missing 1') + ', left = 10', H.c('g', 'BANC')]
          ]
        },
        complexity: `<p><b>Time:</b> O(|s| + |t|) — each pointer moves at most |s| times. <b>Space:</b> O(Σ) for the need map (52 letters).</p>`,
        followUps: [
          'Return the number of minimal windows, or all start indices.',
          'Minimum window <b>subsequence</b> (LeetCode 727) — order matters, needs DP / two-pass scan instead.',
          'Smallest subarray containing all distinct values of the array (t = set of all values).',
          'Stream version: s arrives character by character; report the current best window.'
        ]
      }
    }]
  });

  /* =====================================================================
     TOPIC 9 — Longest consecutive sequence (set chain-start trick)
     ===================================================================== */
  topics.push({
    title: 'HashSet Chain-Start Trick: Longest Consecutive Sequence in O(N)',
    analogy: `<p>At the club door, every guest wears a <b>numbered wristband</b>: 100, 4, 200, 1, 3, 2. The manager asks: "What is the longest run of <b>consecutive</b> wristband numbers inside?" The smart bouncer puts all numbers on his <b>VIP list (a HashSet)</b>. Then for each guest he asks one cheap question: "Is the guest <b>right before you</b> (number − 1) inside?"</p>
<ul><li>If <b>yes</b>, you are in the middle of somebody else's line — <b>skip</b> you; that line will be counted from its front.</li>
<li>If <b>no</b>, you are the <b>front of a line</b>: count forward (you+1, you+2, …) by checking the list until a number is missing.</li></ul>
<p>Every line is walked exactly once, from its front. No sorting needed.</p>`,
    explain: `<p><b>Problem:</b> given an unsorted array, find the length of the longest sequence of consecutive integers (they can be anywhere in the array, in any order). Required: <b>O(N)</b>.</p>

<h4>Idea 1 (obvious): sort</h4>
<p>Sort, then scan runs, skipping duplicates. O(N log N) — good, but the problem asks for O(N).</p>

<h4>Idea 2 (naive hashing): count up from every number</h4>
<p>Put everything in a HashSet; for each x, count x+1, x+2, … while present. Correct, but a long run of length L is re-walked from <b>each</b> of its L members: 1+2+…+L = O(N<sup>2</sup>) for one long run.</p>

<h4>Idea 3 (the trick): only count from chain starts</h4>
<p>x is a <b>chain start</b> if <code>x − 1</code> is <b>not</b> in the set. Only chain starts walk forward. Every number is walked over by at most one chain → O(N) total.</p>
${H.chips([100, 4, 200, 1, 3, 2], { label: 'set', hl: { 1: 'g', 100: 'g', 200: 'g', 2: 'r', 3: 'r', 4: 'r' } })}
${H.table(['x', 'x − 1 in set?', 'role', 'walk', 'length'], [['100', '99: no', H.c('g', 'start'), '100 → (101 missing)', '1'], ['4', '3: ' + H.c('r', 'yes'), 'skip', '—', '—'], ['200', '199: no', H.c('g', 'start'), '200', '1'], ['1', '0: no', H.c('g', 'start'), '1 → 2 → 3 → 4 → (5 missing)', H.c('g', '4')], ['3', '2: ' + H.c('r', 'yes'), 'skip', '—', '—'], ['2', '1: ' + H.c('r', 'yes'), 'skip', '—', '—']])}
<p>Answer: <b>4</b> (the run 1, 2, 3, 4).</p>

<h4>The code</h4>
<pre>Set&lt;Integer&gt; set = all numbers;
for (int x : set)                       // iterate the SET (duplicates gone)
    if (!set.contains(x - 1)) {         // x starts a chain
        int len = 1;
        while (set.contains(x + len)) len++;
        best = max(best, len);
    }</pre>

<h4>Why "iterate the set, not the array"?</h4>
<p>If the array has the chain start 1 repeated 50,000 times, iterating the array would walk the same long chain 50,000 times → O(N<sup>2</sup>) again. The set has each value once, so each chain is walked once.</p>`,
    clues: [
      '"longest consecutive elements sequence" + "unsorted" + "O(n) time" → HashSet + chain-start check',
      '"elements can appear in any order" and sorting is forbidden or too slow → hashing',
      '"is x − 1 present?" / "is this the beginning of a run?" → start-of-chain test',
      '"numbers arrive one by one, keep the longest run" → boundary HashMap (x → run length at the ends) or DSU',
      'N ≤ 10<sup>5</sup> with values up to ±10<sup>9</sup> → cannot use a boolean array, need a set',
      '"merge adjacent ranges" / "connected numbers" → union-find is an alternative'
    ],
    code: [{ lang: 'java', code: `
import java.util.*;

public class LongestConsecutive {
    static int longestConsecutive(int[] nums) {
        Set<Integer> set = new HashSet<>();
        for (int x : nums) set.add(x);                  // O(N), duplicates collapse
        int best = 0;
        for (int x : set) {                             // iterate the SET, not nums
            if (set.contains(x - 1)) continue;          // not a chain start: someone before x exists
            int len = 1;
            while (set.contains(x + len)) len++;        // walk the chain forward
            best = Math.max(best, len);
        }
        return best;
    }

    // Streaming version: numbers arrive one by one; keep the longest run so far.
    // map holds, for the ENDPOINTS of each run, the length of that run.
    static int[] streamingLongest(int[] stream) {
        Map<Integer, Integer> runLen = new HashMap<>();
        int best = 0;
        int[] after = new int[stream.length];
        for (int i = 0; i < stream.length; i++) {
            int x = stream[i];
            if (!runLen.containsKey(x)) {
                int left = runLen.getOrDefault(x - 1, 0);   // run ending at x-1
                int right = runLen.getOrDefault(x + 1, 0);  // run starting at x+1
                int len = left + 1 + right;
                runLen.put(x, len);                         // mark x as seen
                runLen.put(x - left, len);                  // new left endpoint
                runLen.put(x + right, len);                 // new right endpoint
                best = Math.max(best, len);
            }
            after[i] = best;
        }
        return after;
    }

    public static void main(String[] args) {
        System.out.println(longestConsecutive(new int[]{100, 4, 200, 1, 3, 2}));        // 4
        System.out.println(longestConsecutive(new int[]{0, 3, 7, 2, 5, 8, 4, 6, 0, 1})); // 9
        System.out.println(Arrays.toString(streamingLongest(new int[]{5, 1, 3, 2, 4}))); // [1, 1, 1, 3, 5]
    }
}`, alt: [{
      lang: 'python', run: true, title: 'Python (runnable)',
      code: `def longest_consecutive(nums):
    s = set(nums)                   # duplicates collapse
    best = 0
    for x in s:                     # iterate the SET, not nums
        if x - 1 not in s:          # chain start
            length = 1
            while x + length in s:
                length += 1
            best = max(best, length)
    return best

def streaming_longest(stream):
    run_len, best, after = {}, 0, []   # endpoints of each run -> run length
    for x in stream:
        if x not in run_len:
            left = run_len.get(x - 1, 0)    # run ending at x-1
            right = run_len.get(x + 1, 0)   # run starting at x+1
            length = left + 1 + right
            run_len[x] = length             # mark x as seen
            run_len[x - left] = length      # new left endpoint
            run_len[x + right] = length     # new right endpoint
            best = max(best, length)
        after.append(best)
    return after

print(longest_consecutive([100, 4, 200, 1, 3, 2]))         # 4
print(longest_consecutive([0, 3, 7, 2, 5, 8, 4, 6, 0, 1])) # 9
print(longest_consecutive([]))                             # 0
print(streaming_longest([5, 1, 3, 2, 4]))                  # [1, 1, 1, 3, 5]`
    }, { lang: 'js', run: true, code: `function longestConsecutive(nums) {
  const set = new Set(nums);                 // duplicates collapse
  let best = 0;
  for (const x of set) {                     // iterate the SET, not nums
    if (set.has(x - 1)) continue;            // not a chain start
    let len = 1;
    while (set.has(x + len)) len++;          // walk the chain forward
    best = Math.max(best, len);
  }
  return best;
}

// Streaming version: the map holds, for the ENDPOINTS of each run, its length.
function streamingLongest(stream) {
  const runLen = new Map();
  let best = 0;
  const after = [];
  for (const x of stream) {
    if (!runLen.has(x)) {
      const left = runLen.get(x - 1) || 0;   // run ending at x-1
      const right = runLen.get(x + 1) || 0;  // run starting at x+1
      const len = left + 1 + right;
      runLen.set(x, len);                    // mark x as seen
      runLen.set(x - left, len);             // new left endpoint
      runLen.set(x + right, len);            // new right endpoint
      best = Math.max(best, len);
    }
    after.push(best);
  }
  return after;
}

console.log(longestConsecutive([100, 4, 200, 1, 3, 2]));         // 4
console.log(longestConsecutive([0, 3, 7, 2, 5, 8, 4, 6, 0, 1])); // 9
console.log(streamingLongest([5, 1, 3, 2, 4]));                  // [ 1, 1, 1, 3, 5 ]` }, { lang: 'cpp', code: `#include <bits/stdc++.h>
using namespace std;

int longestConsecutive(const vector<int>& nums) {
    unordered_set<int> s(nums.begin(), nums.end());   // duplicates collapse
    int best = 0;
    for (int x : s) {                                 // iterate the SET, not nums
        if (s.count(x - 1)) continue;                 // not a chain start
        int len = 1;
        while (s.count(x + len)) len++;               // walk the chain forward
        best = max(best, len);
    }
    return best;
}

// Streaming version: the map holds, for the ENDPOINTS of each run, its length.
vector<int> streamingLongest(const vector<int>& stream) {
    unordered_map<int, int> runLen;
    int best = 0;
    vector<int> after;
    for (int x : stream) {
        if (!runLen.count(x)) {
            int left = runLen.count(x - 1) ? runLen[x - 1] : 0;    // run ending at x-1
            int right = runLen.count(x + 1) ? runLen[x + 1] : 0;   // run starting at x+1
            int len = left + 1 + right;
            runLen[x] = len;                          // mark x as seen
            runLen[x - left] = len;                   // new left endpoint
            runLen[x + right] = len;                  // new right endpoint
            best = max(best, len);
        }
        after.push_back(best);
    }
    return after;
}

int main() {
    cout << longestConsecutive({100, 4, 200, 1, 3, 2}) << "\\n";          // 4
    cout << longestConsecutive({0, 3, 7, 2, 5, 8, 4, 6, 0, 1}) << "\\n";  // 9
    for (int b : streamingLongest({5, 1, 3, 2, 4})) cout << b << " ";    // 1 1 1 3 5
    cout << "\\n";
}` }] }],
    codeTitle: 'Chain-start trick and the streaming boundary map',
    viz: [{
      title: 'Build the VIP set, then count only from chain starts',
      input: '100 4 200 1 3 2',
      inputLabel: 'Array (whole numbers, at most 14)',
      gen: function (input) {
        var a = parseNums(input, 14, 'array'), set = [], frames = [];
        frames.push({ narr: 'Phase 1: put every number on the VIP list (HashSet). Duplicates are rejected.', parts: [{ type: 'array', label: 'nums', values: a.slice() }, { type: 'set', label: 'VIP set', items: [] }] });
        for (var i = 0; i < a.length; i++) {
          var dup = set.indexOf(a[i]) >= 0;
          if (!dup) set.push(a[i]);
          frames.push({ narr: 'Add <b>' + a[i] + '</b>: ' + (dup ? '<span class="c-r">already on the list</span> (duplicate ignored — this is why we later iterate the set, not the array).' : '<span class="c-g">inserted</span>.'), parts: [{ type: 'array', label: 'nums', values: a.slice(), ptr: one(i, 'i'), hl: one(i, dup ? 'bad' : 'ok') }, { type: 'set', label: 'VIP set', items: set.slice(), hl: one(a[i], dup ? 'bad' : 'ok') }] });
        }
        var best = 0, bestStart = null, walks = 0;
        set.forEach(function (x) {
          if (set.indexOf(x - 1) >= 0) {
            var h = one(x, 'cur'); h[x - 1] = 'bad';
            frames.push({ narr: 'x = <b>' + x + '</b>: is ' + (x - 1) + ' on the list? <span class="c-r">Yes (hit)</span> → ' + x + ' is in the middle of a line. <b>Skip</b> — the line will be counted from its front.', parts: [{ type: 'set', label: 'VIP set', items: set.slice(), hl: h }, { type: 'vars', vals: { x: x, 'x - 1 present': true, best: best, 'total steps walked': walks } }] });
            return;
          }
          var len = 1, chainHl = one(x, 'sel');
          frames.push({ narr: 'x = <b>' + x + '</b>: ' + (x - 1) + ' is <b>not</b> on the list → ' + x + ' is the <b>front of a line</b>. Walk forward.', parts: [{ type: 'set', label: 'VIP set', items: set.slice(), hl: chainHl }, { type: 'vars', vals: { x: x, 'x - 1 present': false, length: 1, best: best, 'total steps walked': walks } }] });
          while (set.indexOf(x + len) >= 0) {
            chainHl[x + len] = 'sel'; walks++;
            frames.push({ narr: 'Is ' + (x + len) + ' present? <span class="c-r">Yes (hit)</span> → length ' + (len + 1) + '.', parts: [{ type: 'set', label: 'VIP set', items: set.slice(), hl: hlm(chainHl, one(x + len, 'bad')) }, { type: 'vars', vals: { x: x, length: len + 1, best: best, 'total steps walked': walks } }] });
            len++;
          }
          var imp = len > best;
          if (imp) { best = len; bestStart = x; }
          frames.push({ narr: (x + len) + ' is missing → the line ' + x + (len > 1 ? '..' + (x + len - 1) : '') + ' has length <b>' + len + '</b>. ' + (imp ? '<b>New best = ' + best + '</b>.' : 'Best stays ' + best + '.'), parts: [{ type: 'set', label: 'VIP set', items: set.slice(), hl: chainHl }, { type: 'vars', vals: { x: x, length: len, best: best, 'total steps walked': walks }, hl: { best: imp ? 'ok' : '' } }] });
        });
        var fin = {};
        if (bestStart !== null) for (var q = 0; q < best; q++) fin[bestStart + q] = 'sel';
        frames.push({ narr: 'Answer: <b>' + best + '</b>' + (bestStart !== null ? ' (' + bestStart + '..' + (bestStart + best - 1) + ')' : '') + '. Forward steps walked in total: ' + walks + ' ≤ N — each number was walked over by at most one line. That is the O(N) proof in action.', parts: [{ type: 'set', label: 'VIP set', items: set.slice(), hl: fin }, { type: 'vars', vals: { answer: best }, hl: { answer: 'sel' } }] });
        return frames;
      }
    }, {
      title: 'Streaming version: boundary map (x → length of its run, kept correct at run endpoints)',
      input: '5 1 3 2 4 10',
      inputLabel: 'Numbers arriving one by one (at most 12)',
      gen: function (input) {
        var a = parseNums(input, 12, 'stream'), m = new Map(), best = 0, frames = [];
        frames.push({ narr: 'Numbers arrive one at a time. For a new x, look at the run ending at x − 1 and the run starting at x + 1; joining them through x gives one bigger run. Only the two <b>endpoints</b> of a run need the correct length.', parts: [{ type: 'array', label: 'stream', values: a.slice() }, { type: 'map', label: 'x → run length (exact at endpoints)', entries: [] }, { type: 'vars', vals: { best: 0 } }] });
        for (var i = 0; i < a.length; i++) {
          var x = a[i];
          if (m.has(x)) {
            frames.push({ narr: '<b>' + x + '</b> already seen → <span class="c-r">duplicate</span>, ignore.', parts: [{ type: 'array', label: 'stream', values: a.slice(), ptr: one(i, 'new'), hl: one(i, 'bad') }, { type: 'map', label: 'x → run length', entries: ents(m), hl: one(x, 'bad') }, { type: 'vars', vals: { best: best } }] });
            continue;
          }
          var L = m.get(x - 1) || 0, R = m.get(x + 1) || 0, len = L + 1 + R;
          m.set(x, len); m.set(x - L, len); m.set(x + R, len);
          var imp = len > best; if (imp) best = len;
          var h = one(x, 'ok'); h[x - L] = 'ok'; h[x + R] = 'ok';
          frames.push({ narr: 'New <b>' + x + '</b>: run on the left has length ' + L + (L ? ' (ends at ' + (x - 1) + ')' : '') + ', run on the right has length ' + R + (R ? ' (starts at ' + (x + 1) + ')' : '') + '. Joined run = ' + L + ' + 1 + ' + R + ' = <b>' + len + '</b>, spanning ' + (x - L) + '..' + (x + R) + '. <span class="c-g">Update x and both endpoints</span>.' + (imp ? ' New best ' + best + '.' : ''), parts: [{ type: 'array', label: 'stream', values: a.slice(), ptr: one(i, 'new'), hl: one(i, 'ok') }, { type: 'map', label: 'x → run length (exact at endpoints)', entries: ents(m), hl: h }, { type: 'vars', vals: { left: L, right: R, joined: len, best: best }, hl: { best: imp ? 'sel' : '' } }] });
        }
        frames.push({ narr: 'Longest run after the whole stream: <b>' + best + '</b>. Each arrival did O(1) map work — handy when you cannot wait for all the data.', parts: [{ type: 'map', label: 'final map', entries: ents(m) }, { type: 'vars', vals: { answer: best }, hl: { answer: 'sel' } }] });
        return frames;
      }
    }],
    examples: [{
      title: 'Duplicates: [1, 2, 0, 1] → 3',
      html: `<p>Set = {0, 1, 2}. Chain start 0 (−1 missing): 0 → 1 → 2 → (3 missing) → length 3. Duplicates never extend a run; consecutive means <b>distinct</b> values in a row.</p>`
    }, {
      title: 'Negatives and a big gap: [−1, −2, 0, 5, 9, 6] → 3',
      html: `${H.table(['chain start', 'run', 'length'], [['−2', '−2, −1, 0', H.c('g', '3')], ['5', '5, 6', '2'], ['9', '9', '1']])}
<p>−1, 0 and 6 are skipped because their predecessor is present. Values can be any ints — that is why a boolean array indexed by value does not work here.</p>`
    }, {
      title: 'Return the actual sequence, not just its length',
      html: `<p>Remember the start of the best chain; the sequence is <code>start, start + 1, …, start + best − 1</code>. For [100, 4, 200, 1, 3, 2] → start 1 → [1, 2, 3, 4].</p>`,
      code: { lang: 'java', code: `List<Integer> longestRun(int[] nums) {
    Set<Integer> set = new HashSet<>();
    for (int x : nums) set.add(x);
    int best = 0, bestStart = 0;
    for (int x : set) {
        if (set.contains(x - 1)) continue;
        int len = 1;
        while (set.contains(x + len)) len++;
        if (len > best) { best = len; bestStart = x; }
    }
    List<Integer> run = new ArrayList<>();
    for (int i = 0; i < best; i++) run.add(bestStart + i);
    return run;
}`, alt: [{ lang: 'python', code: `def longest_run(nums):
    s = set(nums)
    best, best_start = 0, 0
    for x in s:
        if x - 1 in s:
            continue
        length = 1
        while x + length in s:
            length += 1
        if length > best:
            best, best_start = length, x
    return list(range(best_start, best_start + best))` }, { lang: 'js', code: `function longestRun(nums) {
  const set = new Set(nums);
  let best = 0, bestStart = 0;
  for (const x of set) {
    if (set.has(x - 1)) continue;
    let len = 1;
    while (set.has(x + len)) len++;
    if (len > best) { best = len; bestStart = x; }
  }
  return Array.from({ length: best }, (_, i) => bestStart + i);
}` }, { lang: 'cpp', code: `vector<int> longestRun(const vector<int>& nums) {
    unordered_set<int> s(nums.begin(), nums.end());
    int best = 0, bestStart = 0;
    for (int x : s) {
        if (s.count(x - 1)) continue;
        int len = 1;
        while (s.count(x + len)) len++;
        if (len > best) { best = len; bestStart = x; }
    }
    vector<int> run(best);
    iota(run.begin(), run.end(), bestStart);
    return run;
}` }] }
    }, {
      title: 'Sorting alternative (O(N log N), often fine in practice)',
      html: `<p>Sort [100, 4, 200, 1, 3, 2] → [1, 2, 3, 4, 100, 200]. Scan: equal neighbours → skip; neighbour + 1 → extend; otherwise reset. Longest = 4. Sorting uses no extra hash memory and, for N = 10<sup>5</sup>, is often just as fast as hashing — but it does not meet a strict O(N) requirement.</p>
${H.arr([1, 2, 3, 4, 100, 200], { label: 'sorted', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g' } })}`
    }],
    deepDive: `<p><b>O(N) proof.</b> Building the set is O(N). In the scan, the <code>contains(x − 1)</code> check costs O(1) per distinct value. The inner <code>while</code> runs only for chain starts and walks over the members of that chain; chains are disjoint, so the total number of inner steps over the whole algorithm is at most the number of distinct values. Total O(N) average.</p>
<p><b>Overflow trap.</b> <code>x + len</code> with x near <code>Integer.MAX_VALUE</code> wraps to a large negative number; if that negative number happens to be in the set, you would extend a chain incorrectly. Likewise <code>x − 1</code> for <code>Integer.MIN_VALUE</code> wraps to MAX_VALUE. LeetCode's limits (±10<sup>9</sup>) avoid it; in production code use <code>long</code> arithmetic or explicit bounds checks.</p>
<p><b>Constant factors.</b> A <code>HashSet&lt;Integer&gt;</code> of 10<sup>5</sup> elements costs roughly 5–6 MB and many cache misses; <code>Arrays.sort</code> on an <code>int[]</code> (dual-pivot quicksort) is tight and cache-friendly. In benchmarks the sort-based version is frequently competitive at this size. Interviews still expect the O(N) idea and the ability to discuss that trade-off.</p>
<p><b>Alternatives.</b> (1) <b>Union-Find</b>: union x with x+1 when both are present; the largest component is the answer — O(N α(N)), more code. (2) <b>Boundary map</b> (shown above): supports streaming inserts in O(1) each; only endpoints of a run hold correct lengths, which is enough because new numbers can only attach at endpoints. (3) If values lie in a small range [0, M], a <code>boolean[M + 1]</code> plus one linear scan is O(N + M) with no hashing.</p>
<p><b>Variants.</b> Longest consecutive path in a binary tree (DFS, not hashing); longest arithmetic subsequence with difference d (map value → best length ending at value, a DP with a hash map); "can the array be split into consecutive groups of size k" (count map + start from smallest, LeetCode 846).</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant will produce the chain-start solution on request, but it often iterates over <code>nums</code> instead of the set — the version that times out on adversarial duplicate-heavy tests. Recognizing why that matters is now your job.</p>
<p><b>Use AI as a partner:</b> <code>Generate a worst-case input that makes iterating over nums (instead of the set) quadratic</code>; <code>Benchmark HashSet vs sort for N = 10^5 and 10^7 and explain the result</code>; <code>Write the union-find version and compare code size</code>.</p>
<p><b>Where AI goes wrong:</b> claiming the double loop is O(N<sup>2</sup>) and "optimizing" it away (it is O(N) amortized); skipping the <code>x − 1</code> check (true O(N<sup>2</sup>)); sorting and calling it O(N); ignoring overflow at the int boundaries.</p>
<p><b>What you must still own:</b> the amortized argument ("each value is walked over by at most one chain"), choosing set-iteration over array-iteration, and discussing when sorting is the pragmatic choice despite the extra log factor.</p>`,
    problems: [{
      title: 'Longest Consecutive Sequence',
      level: 'Medium', tags: ['hashset', 'amortized analysis'], companies: ['Google', 'Amazon', 'Meta', 'Microsoft', 'Uber', 'Spotify'],
      statement: `<p>Given an unsorted integer array <code>nums</code>, return the length of the longest sequence of <b>consecutive integers</b> that all appear in the array (in any positions). Your algorithm must run in <b>O(N)</b> time.</p>`,
      constraints: `0 ≤ N ≤ 10<sup>5</sup>, −10<sup>9</sup> ≤ nums[i] ≤ 10<sup>9</sup>`,
      example: `${H.arr([100, 4, 200, 1, 3, 2], { label: 'nums', hl: { 1: 'g', 3: 'g', 4: 'g', 5: 'g' } })}<p>Output ${H.c('g', '4')}: the values 1, 2, 3, 4 are all present. [0, 3, 7, 2, 5, 8, 4, 6, 0, 1] → 9 (0..8).</p>`,
      brute: {
        why: `<p>For every x, repeatedly scan the whole array to see if x+1, x+2, … exist. A run of length L costs O(N·L) per starting value → up to <b>O(N<sup>3</sup>)</b>. Sorting first gives O(N log N), still above the required O(N). The waste: repeated linear searches (fix: a set) and re-walking runs from their middle (fix: only start at chain fronts).</p>`,
        code: {
          lang: 'java',
          code: `int longestConsecutiveBrute(int[] nums) {
    int best = 0;
    for (int x : nums) {
        int len = 1;
        while (containsLinear(nums, x + len)) len++;   // O(N) search each time
        best = Math.max(best, len);
    }
    return best;
}

boolean containsLinear(int[] a, int target) {
    for (int v : a) if (v == target) return true;
    return false;
}`,
          alt: [
            { lang: 'python', code: `def longest_consecutive(nums):
    best = 0
    for x in nums:
        length = 1
        while contains_linear(nums, x + length):   # O(N) search each time
            length += 1
        best = max(best, length)
    return best


def contains_linear(a, target):
    for v in a:
        if v == target:
            return True
    return False` },
            { lang: 'js', code: `function longestConsecutive(nums) {
  let best = 0;
  for (const x of nums) {
    let len = 1;
    while (containsLinear(nums, x + len)) len++;   // O(N) search each time
    best = Math.max(best, len);
  }
  return best;
}

function containsLinear(a, target) {
  for (const v of a) if (v === target) return true;
  return false;
}` },
            { lang: 'cpp', code: `bool containsLinear(const vector<int>& a, int target) {
    for (int v : a) if (v == target) return true;
    return false;
}

int longestConsecutive(vector<int>& nums) {
    int best = 0;
    for (int x : nums) {
        int len = 1;
        while (containsLinear(nums, x + len)) len++;   // O(N) search each time
        best = max(best, len);
    }
    return best;
}` }
          ]
        }
      },
      mcq: {
        q: 'In the O(N) solution, why do we skip x when x − 1 is in the set?',
        options: ['x is inside a chain that will be fully counted from its smaller start, so walking from x would repeat work', 'Because x − 1 is a duplicate of x', 'To avoid integer overflow', 'Because negative numbers cannot start a chain'],
        answer: 0,
        explain: 'Only chain fronts walk forward. Every element is walked over by exactly one chain, which keeps the total inner-loop work O(N).'
      },
      hints: [
        `<p><b>Hint 1:</b> "Is x+1 present?" must be O(1) → put all numbers in a HashSet first.</p>`,
        `<p><b>Hint 2:</b> Counting forward from every number repeats work. Only start counting from numbers that have <b>no predecessor</b> (x − 1 absent).</p>`,
        `<p><b>Hint 3 (recipe):</b> set = all nums; for x in set: if x−1 not in set: len = 1; while x+len in set: len++; best = max(best, len). Iterate the set (not nums) so duplicates do not trigger repeated walks. Edge cases: empty array → 0, all duplicates → 1.</p>`
      ],
      tests: { sig: 'int[] -> int', fn: 'longestConsecutive', cases: [
  [[[100, 4, 200, 1, 3, 2]], 4],
  [[[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]], 9],
  [[[]], 0],
  [[[5]], 1],
  [[[1, 2, 0, 1]], 3],
  [[[-1000000000, 1000000000]], 1],
  [[[-3, -2, -1, 0, 1]], 5],
  [[[9, 1, 4, 7, 3, -1, 0, 5, 8, -1, 6]], 7]
] },
      solution: {
        approach: `<p><b>HashSet + chain-start check.</b> Load all values into a set. A value whose predecessor is absent starts a chain; walk forward from it while successors are present. Each chain is walked once from its front, so total work is linear.</p>`,
        code: `class Solution {
    public int longestConsecutive(int[] nums) {
        Set<Integer> set = new HashSet<>();
        for (int x : nums) set.add(x);
        int best = 0;
        for (int x : set) {                        // each distinct value once
            if (set.contains(x - 1)) continue;     // not the front of a chain
            int len = 1;
            while (set.contains(x + len)) len++;   // walk this chain once
            best = Math.max(best, len);
        }
        return best;
    }
}`,
        alt: [{ lang: 'js', code: `function longestConsecutive(nums) {
  const set = new Set(nums);
  let best = 0;
  for (const x of set) {
    if (set.has(x - 1)) continue;         // not the front of a chain
    let len = 1;
    while (set.has(x + len)) len++;       // walk this chain once
    best = Math.max(best, len);
  }
  return best;
}` }, {
          lang: 'python', code: `def longest_consecutive(nums):
    s = set(nums)
    best = 0
    for x in s:
        if x - 1 not in s:
            length = 1
            while x + length in s:
                length += 1
            best = max(best, length)
    return best`
        }, {
          lang: 'cpp', code: `int longestConsecutive(vector<int>& nums) {
    unordered_set<int> s(nums.begin(), nums.end());
    int best = 0;
    for (int x : s) {
        if (s.count(x - 1)) continue;
        int len = 1;
        while (s.count(x + len)) len++;
        best = max(best, len);
    }
    return best;
}`
        }],
        dry: {
          head: ['x (from set)', 'x − 1 in set?', 'role', 'walk forward', 'length', 'best'],
          rows: [
            ['100', 'no', H.c('g', 'start'), '101 ✗', '1', '1'],
            ['4', H.c('r', 'yes (3)'), 'skip', '—', '—', '1'],
            ['200', 'no', H.c('g', 'start'), '201 ✗', '1', '1'],
            ['1', 'no', H.c('g', 'start'), '2 ✓ 3 ✓ 4 ✓ 5 ✗', '4', H.c('g', '4')],
            ['3', H.c('r', 'yes (2)'), 'skip', '—', '—', '4'],
            ['2', H.c('r', 'yes (1)'), 'skip', '—', '—', '4']
          ]
        },
        complexity: `<p><b>Time:</b> O(N) average — set build O(N), scan O(N), inner walks O(N) in total. <b>Space:</b> O(N) for the set.</p>`,
        followUps: [
          'Numbers arrive as a stream — maintain the answer after each insert (boundary map or DSU).',
          'Return the sequence itself.',
          'Longest consecutive sequence in a binary tree (parent → child path).',
          'Can the array be divided into groups of k consecutive numbers? (LeetCode 846, count map + smallest first)'
        ]
      }
    }]
  });

  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'Ransom Note',
    level: 'Easy', tags: ['frequency', 'int[26]'], companies: ['Amazon', 'Microsoft', 'Apple'],
    statement: `<p>Given two strings <code>ransomNote</code> and <code>magazine</code>, return <b>true</b> if the note can be built from letters cut out of the magazine. Each magazine letter can be used <b>only once</b>.</p>`,
    constraints: `1 ≤ ransomNote.length, magazine.length ≤ 10<sup>5</sup>; lowercase English letters.`,
    example: `<p>note = "aa", magazine = "aab" → ${H.c('g', 'true')} (two a's available). note = "aa", magazine = "ab" → ${H.c('r', 'false')} (only one a).</p>`,
    brute: {
      why: `<p>For each note letter, search the magazine for an unused copy and mark it: <b>O(n·m)</b> = 10<sup>10</sup> at the limits. The waste: we only care <i>how many</i> of each letter the magazine has, not where.</p>`,
      code: {
          lang: 'java',
          code: `boolean canConstructBrute(String note, String magazine) {
    StringBuilder mag = new StringBuilder(magazine);
    for (char c : note.toCharArray()) {
        int pos = mag.indexOf(String.valueOf(c));   // O(m) search
        if (pos < 0) return false;
        mag.deleteCharAt(pos);                      // use it up
    }
    return true;
}`,
          alt: [
            { lang: 'python', code: `def can_construct(note, magazine):
    mag = list(magazine)
    for c in note:
        if c not in mag:      # O(m) search
            return False
        mag.remove(c)         # use it up
    return True` },
            { lang: 'js', code: `function canConstruct(ransomNote, magazine) {
  let mag = magazine;
  for (const c of ransomNote) {
    const pos = mag.indexOf(c);                     // O(m) search
    if (pos < 0) return false;
    mag = mag.slice(0, pos) + mag.slice(pos + 1);   // use it up
  }
  return true;
}` },
            { lang: 'cpp', code: `bool canConstruct(string ransomNote, string magazine) {
    string mag = magazine;
    for (char c : ransomNote) {
        size_t pos = mag.find(c);                   // O(m) search
        if (pos == string::npos) return false;
        mag.erase(pos, 1);                          // use it up
    }
    return true;
}` }
          ]
        }
    },
    mcq: { q: 'Which single data structure answers this in O(n + m)?', options: ['A tally of magazine letters (int[26]) decremented by the note', 'A HashSet of magazine letters', 'Sorting the note only', 'A stack of magazine letters'], answer: 0, explain: 'A set loses multiplicity ("aa" needs two a\'s). Counts keep it.' },
    hints: [
      `<p><b>Hint 1:</b> Order does not matter, only counts — this is the shopkeeper's tally sheet.</p>`,
      `<p><b>Hint 2:</b> Count magazine letters in <code>int[26]</code>, then spend them for each note letter.</p>`,
      `<p><b>Hint 3:</b> If any count goes below zero, the magazine ran out → false. Quick reject: note longer than magazine.</p>`
    ],
    tests: { sig: 'string string -> bool', fn: 'canConstruct', cases: [
  [['aa', 'aab'], true],
  [['aa', 'ab'], false],
  [['a', 'b'], false],
  [['abc', 'cba'], true],
  [['zz', 'z'], false],
  [['aab', 'baa'], true],
  [['abcd', 'dcbaxyz'], true],
  [['a', 'a'], true]
] },
    solution: {
      approach: `<p>Tally the magazine, then walk the note decrementing. A negative count means the note needs a letter the magazine cannot supply.</p>`,
      code: `class Solution {
    public boolean canConstruct(String ransomNote, String magazine) {
        if (ransomNote.length() > magazine.length()) return false;
        int[] cnt = new int[26];
        for (int i = 0; i < magazine.length(); i++) cnt[magazine.charAt(i) - 'a']++;
        for (int i = 0; i < ransomNote.length(); i++) {
            if (--cnt[ransomNote.charAt(i) - 'a'] < 0) return false;   // ran out of this letter
        }
        return true;
    }
}`,
      alt: [{ lang: 'js', code: `function canConstruct(ransomNote, magazine) {
  if (ransomNote.length > magazine.length) return false;
  const cnt = new Array(26).fill(0);
  for (const ch of magazine) cnt[ch.charCodeAt(0) - 97]++;
  for (const ch of ransomNote) {
    if (--cnt[ch.charCodeAt(0) - 97] < 0) return false;   // ran out of this letter
  }
  return true;
}` }, { lang: 'cpp', code: `bool canConstruct(string ransomNote, string magazine) {
    if (ransomNote.size() > magazine.size()) return false;
    array<int, 26> cnt{};
    for (char c : magazine) cnt[c - 'a']++;
    for (char c : ransomNote)
        if (--cnt[c - 'a'] < 0) return false;   // ran out of this letter
    return true;
}` }, { lang: 'python', code: `from collections import Counter

def can_construct(note, magazine):
    return not (Counter(note) - Counter(magazine))   # leftover need -> impossible` }],
      dry: { head: ['step', 'char', 'count after', 'ok?'], rows: [['tally "aab"', '—', 'a=2, b=1', '—'], ['note[0]', 'a', 'a=1', H.c('g', 'yes')], ['note[1]', 'a', 'a=0', H.c('g', 'yes → true')]] },
      complexity: `<p><b>Time:</b> O(n + m). <b>Space:</b> O(1) (26 counters).</p>`,
      followUps: ['Unicode letters → HashMap over code points.', 'Return the minimum number of extra letters needed.']
    }
  });

  practice.push({
    title: 'Intersection of Two Arrays II',
    level: 'Easy', tags: ['hashmap', 'frequency'], companies: ['Meta', 'Amazon', 'Google'],
    statement: `<p>Given two integer arrays, return their intersection where each element appears <b>as many times as it shows in both</b> (the minimum of the two counts). Any order.</p>`,
    constraints: `1 ≤ n, m ≤ 1000, 0 ≤ values ≤ 1000`,
    example: `<p>nums1 = [1, 2, 2, 1], nums2 = [2, 2] → ${H.c('g', '[2, 2]')}. nums1 = [4, 9, 5], nums2 = [9, 4, 9, 8, 4] → ${H.c('g', '[4, 9]')}.</p>`,
    brute: {
      why: `<p>For each element of nums1, scan nums2 for an unused equal element and mark it: <b>O(n·m)</b>. The waste: rescanning nums2 when a count map of nums1 answers "how many are left?" in O(1).</p>`,
      code: {
          lang: 'java',
          code: `int[] intersectBrute(int[] a, int[] b) {
    boolean[] used = new boolean[b.length];
    List<Integer> res = new ArrayList<>();
    for (int x : a) {
        for (int j = 0; j < b.length; j++) {
            if (!used[j] && b[j] == x) { used[j] = true; res.add(x); break; }
        }
    }
    return res.stream().mapToInt(Integer::intValue).toArray();
}`,
          alt: [
            { lang: 'python', code: `def intersect(nums1, nums2):
    used = [False] * len(nums2)
    res = []
    for x in nums1:
        for j in range(len(nums2)):
            if not used[j] and nums2[j] == x:
                used[j] = True
                res.append(x)
                break
    return res` },
            { lang: 'js', code: `function intersect(nums1, nums2) {
  const used = new Array(nums2.length).fill(false);
  const res = [];
  for (const x of nums1) {
    for (let j = 0; j < nums2.length; j++) {
      if (!used[j] && nums2[j] === x) { used[j] = true; res.push(x); break; }
    }
  }
  return res;
}` },
            { lang: 'cpp', code: `vector<int> intersect(vector<int>& nums1, vector<int>& nums2) {
    vector<bool> used(nums2.size(), false);
    vector<int> res;
    for (int x : nums1) {
        for (size_t j = 0; j < nums2.size(); j++) {
            if (!used[j] && nums2[j] == x) { used[j] = true; res.push_back(x); break; }
        }
    }
    return res;
}` }
          ]
        }
    },
    mcq: { q: 'Why is a HashSet not enough here?', options: ['It forgets how many times a value appears, but the output must repeat values (min of counts)', 'HashSet cannot store integers', 'HashSet is slower than a list', 'It is enough'], answer: 0, explain: 'Intersection I (unique values) uses sets; Intersection II needs counts.' },
    hints: [
      `<p><b>Hint 1:</b> The answer contains value v exactly min(count1[v], count2[v]) times.</p>`,
      `<p><b>Hint 2:</b> Tally the smaller array into a map, then walk the other array and "spend" counts.</p>`,
      `<p><b>Hint 3:</b> For x in nums2: if cnt[x] &gt; 0 → output x, cnt[x]−−. Follow-up: sorted inputs → two pointers, O(1) extra space.</p>`
    ],
    tests: { sig: 'int[] int[] -> int[]', fn: 'intersect', cmp: 'set', cases: [
  [[[1, 2, 2, 1], [2, 2]], [2, 2]],
  [[[4, 9, 5], [9, 4, 9, 8, 4]], [4, 9]],
  [[[1], [2]], []],
  [[[0], [0]], [0]],
  [[[1, 1, 1], [1, 1]], [1, 1]],
  [[[1000, 0, 1000], [1000, 1000, 1000, 0]], [0, 1000, 1000]],
  [[[3, 1, 2], [1, 1]], [1]]
] },
    solution: {
      approach: `<p>Count the first array, then spend counts while scanning the second. Each output value is emitted at most as many times as both arrays allow.</p>`,
      code: `class Solution {
    public int[] intersect(int[] nums1, int[] nums2) {
        if (nums1.length > nums2.length) return intersect(nums2, nums1);  // tally the smaller one
        Map<Integer, Integer> cnt = new HashMap<>();
        for (int x : nums1) cnt.merge(x, 1, Integer::sum);
        List<Integer> res = new ArrayList<>();
        for (int x : nums2) {
            Integer c = cnt.get(x);
            if (c != null && c > 0) { res.add(x); cnt.put(x, c - 1); }   // spend one copy
        }
        int[] out = new int[res.size()];
        for (int i = 0; i < out.length; i++) out[i] = res.get(i);
        return out;
    }
}`,
      alt: [{ lang: 'js', code: `function intersect(nums1, nums2) {
  if (nums1.length > nums2.length) return intersect(nums2, nums1);   // tally the smaller one
  const cnt = new Map();
  for (const x of nums1) cnt.set(x, (cnt.get(x) || 0) + 1);
  const res = [];
  for (const x of nums2) {
    const c = cnt.get(x) || 0;
    if (c > 0) { res.push(x); cnt.set(x, c - 1); }                    // spend one copy
  }
  return res;
}` }, { lang: 'cpp', code: `vector<int> intersect(vector<int>& nums1, vector<int>& nums2) {
    if (nums1.size() > nums2.size()) return intersect(nums2, nums1);   // tally the smaller one
    unordered_map<int, int> cnt;
    for (int x : nums1) cnt[x]++;
    vector<int> res;
    for (int x : nums2) {
        auto it = cnt.find(x);
        if (it != cnt.end() && it->second > 0) { res.push_back(x); it->second--; }   // spend one copy
    }
    return res;
}` }, { lang: 'python', code: `from collections import Counter

def intersect(nums1, nums2):
    return list((Counter(nums1) & Counter(nums2)).elements())   # & = min of counts` }],
      complexity: `<p><b>Time:</b> O(n + m). <b>Space:</b> O(min(n, m)).</p>`,
      followUps: ['Both arrays sorted → two pointers.', 'nums2 is on disk and too big for memory → stream it in chunks against the map of nums1.']
    }
  });

  practice.push({
    title: 'Isomorphic Strings',
    level: 'Easy', tags: ['hashmap', 'bijection'], companies: ['LinkedIn', 'Amazon', 'Google'],
    statement: `<p>Two strings s and t are <b>isomorphic</b> if the characters of s can be replaced to get t, where every occurrence of a character maps to the same character, and <b>no two different characters map to the same character</b> (a one-to-one mapping). Return true if s and t are isomorphic.</p>`,
    constraints: `1 ≤ s.length == t.length ≤ 5·10<sup>4</sup>; any valid ASCII characters.`,
    example: `<p>"egg", "add" → ${H.c('g', 'true')} (e→a, g→d). "foo", "bar" → ${H.c('r', 'false')} (o would need to map to both a and r). "badc", "baba" → ${H.c('r', 'false')} (b→b and d→b: two letters map to the same one).</p>`,
    brute: {
      why: `<p>Check every pair (i, j): s[i] == s[j] must hold exactly when t[i] == t[j]. That is <b>O(n<sup>2</sup>)</b> = 2.5·10<sup>9</sup> comparisons. The waste: a mapping table answers "what did s[i] map to before?" in O(1).</p>`,
      code: {
          lang: 'java',
          code: `boolean isIsomorphicBrute(String s, String t) {
    for (int i = 0; i < s.length(); i++) {
        for (int j = i + 1; j < s.length(); j++) {
            boolean sameS = s.charAt(i) == s.charAt(j);
            boolean sameT = t.charAt(i) == t.charAt(j);
            if (sameS != sameT) return false;
        }
    }
    return true;
}`,
          alt: [
            { lang: 'python', code: `def is_isomorphic(s, t):
    for i in range(len(s)):
        for j in range(i + 1, len(s)):
            same_s = s[i] == s[j]
            same_t = t[i] == t[j]
            if same_s != same_t:
                return False
    return True` },
            { lang: 'js', code: `function isIsomorphic(s, t) {
  for (let i = 0; i < s.length; i++) {
    for (let j = i + 1; j < s.length; j++) {
      const sameS = s[i] === s[j];
      const sameT = t[i] === t[j];
      if (sameS !== sameT) return false;
    }
  }
  return true;
}` },
            { lang: 'cpp', code: `bool isIsomorphic(string s, string t) {
    for (size_t i = 0; i < s.size(); i++) {
        for (size_t j = i + 1; j < s.size(); j++) {
            bool sameS = s[i] == s[j];
            bool sameT = t[i] == t[j];
            if (sameS != sameT) return false;
        }
    }
    return true;
}` }
          ]
        }
    },
    mcq: { q: 'Why does "badc" vs "baba" need a SECOND map (t → s)?', options: ['One map s→t accepts b→b and d→b; only the reverse map notices that b in t is claimed twice', 'Because the strings have different lengths', 'To handle uppercase letters', 'It does not — one map is always enough'], answer: 0, explain: 'Isomorphism is a bijection: check both directions (or map both to "first index seen").' },
    hints: [
      `<p><b>Hint 1:</b> Record what each character of s maps to; a conflict means false.</p>`,
      `<p><b>Hint 2:</b> One direction is not enough — also record which s-character already owns each t-character.</p>`,
      `<p><b>Hint 3:</b> Neat trick: map both strings to "index of first occurrence" patterns and compare, e.g. "egg" → [0,1,1], "add" → [0,1,1].</p>`
    ],
    tests: { sig: 'string string -> bool', fn: 'isIsomorphic', cases: [
  [['egg', 'add'], true],
  [['foo', 'bar'], false],
  [['badc', 'baba'], false],
  [['paper', 'title'], true],
  [['a', 'a'], true],
  [['ab', 'aa'], false],
  [['aa', 'ab'], false],
  [['13', '42'], true],
  [['a b', 'c d'], true]
] },
    solution: {
      approach: `<p>Two maps enforce a one-to-one mapping: <code>s→t</code> catches one letter mapping to two, <code>t→s</code> catches two letters mapping to one.</p>`,
      code: `class Solution {
    public boolean isIsomorphic(String s, String t) {
        Map<Character, Character> st = new HashMap<>(), ts = new HashMap<>();
        for (int i = 0; i < s.length(); i++) {
            char a = s.charAt(i), b = t.charAt(i);
            Character prevB = st.putIfAbsent(a, b);     // returns existing mapping, or null if new
            Character prevA = ts.putIfAbsent(b, a);
            if ((prevB != null && prevB != b) || (prevA != null && prevA != a)) return false;
        }
        return true;
    }
}`,
      alt: [{ lang: 'js', code: `function isIsomorphic(s, t) {
  const st = new Map(), ts = new Map();   // s-char -> t-char and back
  for (let i = 0; i < s.length; i++) {
    const a = s[i], b = t[i];
    if (st.has(a) && st.get(a) !== b) return false;   // a already maps elsewhere
    if (ts.has(b) && ts.get(b) !== a) return false;   // b already owned by another char
    st.set(a, b);
    ts.set(b, a);
  }
  return true;
}` }, { lang: 'cpp', code: `bool isIsomorphic(string s, string t) {
    array<int, 256> st, ts;                 // char -> mapped char, -1 = none yet
    st.fill(-1);
    ts.fill(-1);
    for (size_t i = 0; i < s.size(); i++) {
        unsigned char a = s[i], b = t[i];
        if (st[a] == -1 && ts[b] == -1) { st[a] = b; ts[b] = a; }   // new pair
        else if (st[a] != b || ts[b] != a) return false;            // clashes with a pair
    }
    return true;
}` }, { lang: 'python', code: `def is_isomorphic(s, t):
    st, ts = {}, {}
    for a, b in zip(s, t):
        if st.setdefault(a, b) != b or ts.setdefault(b, a) != a:
            return False          # a already maps elsewhere, or b is already owned
    return True` }],
      dry: { head: ['i', 's[i] → t[i]', 's→t map', 't→s map', 'ok?'], rows: [['0', 'b → b', '{b:b}', '{b:b}', 'yes'], ['1', 'a → a', '{b:b, a:a}', '{b:b, a:a}', 'yes'], ['2', 'd → b', '{…, d:b}', H.c('r', 'b already owned by b'), H.c('r', 'false')]] },
      complexity: `<p><b>Time:</b> O(n). <b>Space:</b> O(Σ) for the alphabet.</p>`,
      followUps: ['Word Pattern (LeetCode 290): same bijection between letters and words.', 'Group strings by isomorphism pattern (key = first-occurrence index list).']
    }
  });

  practice.push({
    title: 'Happy Number',
    level: 'Easy', tags: ['hashset', 'cycle detection'], companies: ['Uber', 'Airbnb', 'Adobe'],
    statement: `<p>Start with a positive integer n. Repeatedly replace it by the <b>sum of the squares of its digits</b>. If this process reaches <b>1</b>, n is happy (return true). If it loops forever without reaching 1, return false.</p>`,
    constraints: `1 ≤ n ≤ 2<sup>31</sup> − 1`,
    example: `<p>n = 19: 1²+9² = <b>82</b> → 8²+2² = <b>68</b> → 6²+8² = <b>100</b> → 1²+0²+0² = ${H.c('g', '1 → true')}.</p><p>n = 2: 4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → ${H.c('r', '4 (seen before!) → false')}.</p>`,
    brute: {
      why: `<p>Keep the history in a list and search it linearly each step: O(k<sup>2</sup>) for k steps. Or "run 1000 steps and hope" — not a proof. The waste: "have I seen this number before?" is exactly a HashSet question.</p>`,
      code: {
          lang: 'java',
          code: `boolean isHappyBrute(int n) {
    List<Integer> history = new ArrayList<>();
    while (n != 1 && !history.contains(n)) {   // contains() is O(k) on a list
        history.add(n);
        n = digitSquareSum(n);
    }
    return n == 1;
}

int digitSquareSum(int n) {
    int s = 0;
    while (n > 0) { int d = n % 10; s += d * d; n /= 10; }
    return s;
}`,
          alt: [
            { lang: 'python', code: `def is_happy(n):
    history = []
    while n != 1 and n not in history:    # "in" is O(k) on a list
        history.append(n)
        n = digit_square_sum(n)
    return n == 1


def digit_square_sum(n):
    s = 0
    while n > 0:
        d = n % 10
        s += d * d
        n //= 10
    return s` },
            { lang: 'js', code: `function isHappy(n) {
  const history = [];
  while (n !== 1 && !history.includes(n)) {   // includes() is O(k) on an array
    history.push(n);
    n = digitSquareSum(n);
  }
  return n === 1;
}

function digitSquareSum(n) {
  let s = 0;
  while (n > 0) { const d = n % 10; s += d * d; n = Math.floor(n / 10); }
  return s;
}` },
            { lang: 'cpp', code: `int digitSquareSum(int n) {
    int s = 0;
    while (n > 0) { int d = n % 10; s += d * d; n /= 10; }
    return s;
}

bool isHappy(int n) {
    vector<int> history;
    while (n != 1 && find(history.begin(), history.end(), n) == history.end()) {   // find() is O(k) on a vector
        history.push_back(n);
        n = digitSquareSum(n);
    }
    return n == 1;
}` }
          ]
        }
    },
    mcq: { q: 'Why is the process guaranteed to either reach 1 or repeat a number?', options: ['After one step any int becomes ≤ 9²·10 = 810, so only finitely many values are possible — eventually one repeats', 'Because every number is happy', 'Because the sequence always decreases', 'It is not guaranteed; you must cap the steps'], answer: 0, explain: 'Finite state space + deterministic step ⇒ the sequence must eventually cycle (pigeonhole). A set detects the first repeat.' },
    hints: [
      `<p><b>Hint 1:</b> An infinite loop means you visit some number twice.</p>`,
      `<p><b>Hint 2:</b> Store visited numbers in a HashSet; stop at 1 or at a repeat.</p>`,
      `<p><b>Hint 3:</b> Follow-up with O(1) memory: Floyd's slow/fast pointers on the sequence (DSA 12).</p>`
    ],
    tests: { sig: 'int -> bool', fn: 'isHappy', cases: [
  [[19], true],
  [[2], false],
  [[1], true],
  [[7], true],
  [[2147483647], false],
  [[4], false],
  [[100], true],
  [[10], true],
  [[1111111], true]
] },
    solution: {
      approach: `<p>Walk the sequence while remembering every value in a HashSet. Reaching 1 → happy; meeting a remembered value → cycle → not happy.</p>`,
      code: `class Solution {
    public boolean isHappy(int n) {
        Set<Integer> seen = new HashSet<>();
        while (n != 1 && seen.add(n)) {   // add() is false when n repeats -> cycle
            n = next(n);
        }
        return n == 1;
    }

    private int next(int n) {
        int s = 0;
        while (n > 0) { int d = n % 10; s += d * d; n /= 10; }
        return s;
    }
}`,
      alt: [{ lang: 'js', code: `function isHappy(n) {
  const next = (x) => {
    let s = 0;
    for (; x > 0; x = Math.floor(x / 10)) s += (x % 10) ** 2;
    return s;
  };
  const seen = new Set();
  while (n !== 1 && !seen.has(n)) {       // a repeat means a cycle
    seen.add(n);
    n = next(n);
  }
  return n === 1;
}` }, { lang: 'cpp', code: `bool isHappy(int n) {
    auto next = [](int x) {
        int s = 0;
        for (; x > 0; x /= 10) s += (x % 10) * (x % 10);
        return s;
    };
    unordered_set<int> seen;
    while (n != 1 && seen.insert(n).second) n = next(n);   // insert fails on a repeat -> cycle
    return n == 1;
}` }, { lang: 'python', code: `def is_happy(n):
    seen = set()
    while n != 1 and n not in seen:
        seen.add(n)
        n = sum(int(d) ** 2 for d in str(n))
    return n == 1` }],
      dry: { head: ['n', 'in set?', 'next'], rows: [['19', H.c('g', 'no → add'), '82'], ['82', H.c('g', 'no → add'), '68'], ['68', H.c('g', 'no → add'), '100'], ['100', H.c('g', 'no → add'), '1'], ['1', '—', H.c('g', 'stop: true')]] },
      complexity: `<p><b>Time:</b> O(log n) per step and a bounded number of steps (values quickly drop below 1000). <b>Space:</b> O(number of steps), small.</p>`,
      followUps: ['Solve with O(1) extra space using Floyd cycle detection.', 'Count how many numbers ≤ N are happy (memoize results in a map).']
    }
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Top K Frequent Elements',
    level: 'Medium', tags: ['frequency', 'bucket sort', 'heap'], companies: ['Amazon', 'Meta', 'Google', 'Microsoft', 'Oracle'],
    statement: `<p>Given an integer array <code>nums</code> and an integer k, return the <b>k most frequent</b> elements (any order). The answer is guaranteed to be unique. Aim for better than O(N log N).</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, 1 ≤ k ≤ number of distinct values`,
    example: `<p>nums = [1, 1, 1, 2, 2, 3], k = 2 → ${H.c('g', '[1, 2]')} (1 appears 3 times, 2 twice, 3 once).</p>`,
    brute: {
      why: `<p>Tally, then sort all distinct values by count: O(N + D log D). Fine in practice, but the follow-up asks for better. A naive brute that recounts each value by scanning is O(N·D).</p>`,
      code: {
          lang: 'java',
          code: `int[] topKFrequentSort(int[] nums, int k) {
    Map<Integer, Integer> cnt = new HashMap<>();
    for (int x : nums) cnt.merge(x, 1, Integer::sum);
    List<Integer> keys = new ArrayList<>(cnt.keySet());
    keys.sort((a, b) -> cnt.get(b) - cnt.get(a));     // most frequent first: O(D log D)
    int[] res = new int[k];
    for (int i = 0; i < k; i++) res[i] = keys.get(i);
    return res;
}`,
          alt: [
            { lang: 'python', code: `def top_k_frequent(nums, k):
    cnt = {}
    for x in nums:
        cnt[x] = cnt.get(x, 0) + 1
    keys = list(cnt)
    keys.sort(key=lambda v: -cnt[v])     # most frequent first: O(D log D)
    return keys[:k]` },
            { lang: 'js', code: `function topKFrequent(nums, k) {
  const cnt = new Map();
  for (const x of nums) cnt.set(x, (cnt.get(x) || 0) + 1);
  const keys = [...cnt.keys()];
  keys.sort((a, b) => cnt.get(b) - cnt.get(a));     // most frequent first: O(D log D)
  return keys.slice(0, k);
}` },
            { lang: 'cpp', code: `vector<int> topKFrequent(vector<int>& nums, int k) {
    unordered_map<int, int> cnt;
    for (int x : nums) cnt[x]++;
    vector<int> keys;
    for (auto& kv : cnt) keys.push_back(kv.first);
    sort(keys.begin(), keys.end(), [&](int a, int b) { return cnt[a] > cnt[b]; });   // most frequent first: O(D log D)
    return vector<int>(keys.begin(), keys.begin() + k);
}` }
          ]
        }
    },
    mcq: { q: 'Bucket sort works here because…', options: ['every frequency is between 1 and N, so we can index buckets by frequency', 'the values are small', 'k is always 1', 'HashMaps are sorted by value'], answer: 0, explain: 'Frequencies are bounded by N, so an array of N+1 buckets indexed by count replaces sorting.' },
    hints: [
      `<p><b>Hint 1:</b> First build the tally sheet value → count.</p>`,
      `<p><b>Hint 2:</b> Instead of sorting by count, drop each value into bucket[count] (counts are 1..N).</p>`,
      `<p><b>Hint 3:</b> Walk buckets from N down to 1, collecting values until you have k. Alternative: a min-heap of size k (O(N log k)).</p>`
    ],
    tests: { sig: 'int[] int -> int[]', fn: 'topKFrequent', cmp: 'set', cases: [
  [[[1, 1, 1, 2, 2, 3], 2], [1, 2]],
  [[[1], 1], [1]],
  [[[4, 4, -1, -1, -1, 7], 1], [-1]],
  [[[5, 6, 7], 3], [5, 6, 7]],
  [[[3, 0, 1, 0], 1], [0]],
  [[[2, 2, 3, 3, 3, 1, 1, 1, 1], 2], [1, 3]],
  [[[-5, -5, -5, 0, 0, 9], 2], [-5, 0]]
] },
    solution: {
      approach: `<p><b>Tally + bucket sort by frequency.</b> Bucket i holds the values that occur exactly i times. Reading buckets from high to low yields the most frequent values first in O(N) total.</p>`,
      code: `class Solution {
    @SuppressWarnings("unchecked")
    public int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> cnt = new HashMap<>();
        for (int x : nums) cnt.merge(x, 1, Integer::sum);

        List<Integer>[] bucket = new List[nums.length + 1];       // bucket[f] = values with frequency f
        for (Map.Entry<Integer, Integer> e : cnt.entrySet()) {
            int f = e.getValue();
            if (bucket[f] == null) bucket[f] = new ArrayList<>();
            bucket[f].add(e.getKey());
        }

        int[] res = new int[k];
        int idx = 0;
        for (int f = nums.length; f >= 1 && idx < k; f--) {
            if (bucket[f] == null) continue;
            for (int v : bucket[f]) {
                if (idx == k) break;
                res[idx++] = v;
            }
        }
        return res;
    }
}`,
      alt: [{ lang: 'js', code: `function topKFrequent(nums, k) {
  const cnt = new Map();
  for (const x of nums) cnt.set(x, (cnt.get(x) || 0) + 1);
  const bucket = Array.from({ length: nums.length + 1 }, () => []);   // bucket[f] = values with frequency f
  for (const [v, f] of cnt) bucket[f].push(v);
  const res = [];
  for (let f = nums.length; f >= 1 && res.length < k; f--) {
    for (const v of bucket[f]) {
      if (res.length === k) break;
      res.push(v);
    }
  }
  return res;
}` }, { lang: 'cpp', code: `vector<int> topKFrequent(vector<int>& nums, int k) {
    unordered_map<int, int> cnt;
    for (int x : nums) cnt[x]++;
    vector<vector<int>> bucket(nums.size() + 1);   // bucket[f] = values with frequency f
    for (auto& [v, f] : cnt) bucket[f].push_back(v);
    vector<int> res;
    for (int f = nums.size(); f >= 1 && (int)res.size() < k; f--)
        for (int v : bucket[f]) {
            if ((int)res.size() == k) break;
            res.push_back(v);
        }
    return res;
}` }, { lang: 'python', code: `from collections import Counter

def top_k_frequent(nums, k):
    return [v for v, _ in Counter(nums).most_common(k)]   # heap-based, O(N log k)` }],
      complexity: `<p><b>Time:</b> O(N). <b>Space:</b> O(N). Heap version: O(N log k) time, O(D + k) space.</p>`,
      followUps: ['Top K frequent words with ties broken alphabetically (heap with a custom comparator).', 'Streaming top-K over billions of events (Count-Min Sketch + heap, "heavy hitters").']
    }
  });

  practice.push({
    title: 'Subarray Sums Divisible by K',
    level: 'Medium', tags: ['prefix sum', 'hashmap', 'modulo'], companies: ['Amazon', 'Twilio', 'Meta'],
    statement: `<p>Given an integer array <code>nums</code> (negatives allowed) and an integer k, return the number of non-empty contiguous subarrays whose sum is <b>divisible by k</b>.</p>`,
    constraints: `1 ≤ N ≤ 3·10<sup>4</sup>, −10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup>, 2 ≤ k ≤ 10<sup>4</sup>`,
    example: `<p>nums = [4, 5, 0, −2, −3, 1], k = 5 → ${H.c('g', '7')}: [4, 5, 0, −2, −3, 1], [5], [5, 0], [5, 0, −2, −3], [0], [0, −2, −3], [−2, −3].</p>`,
    brute: {
      why: `<p>All (l, r) pairs with a running sum and a modulo check: <b>O(N<sup>2</sup>)</b> ≈ 4.5·10<sup>8</sup>. The waste: divisibility depends only on the <b>remainders</b> of two prefix sums, which a tally can match in O(1).</p>`,
      code: {
          lang: 'java',
          code: `int subarraysDivByKBrute(int[] nums, int k) {
    int count = 0;
    for (int l = 0; l < nums.length; l++) {
        int sum = 0;
        for (int r = l; r < nums.length; r++) {
            sum += nums[r];
            if (sum % k == 0) count++;        // works for negatives too: -5 % 5 == 0
        }
    }
    return count;
}`,
          alt: [
            { lang: 'python', code: `def subarrays_div_by_k(nums, k):
    count = 0
    for l in range(len(nums)):
        total = 0
        for r in range(l, len(nums)):
            total += nums[r]
            if total % k == 0:
                count += 1        # works for negatives too: -5 % 5 == 0
    return count` },
            { lang: 'js', code: `function subarraysDivByK(nums, k) {
  let count = 0;
  for (let l = 0; l < nums.length; l++) {
    let sum = 0;
    for (let r = l; r < nums.length; r++) {
      sum += nums[r];
      if (sum % k === 0) count++;        // works for negatives too: -5 % 5 is -0, and -0 === 0
    }
  }
  return count;
}` },
            { lang: 'cpp', code: `int subarraysDivByK(vector<int>& nums, int k) {
    int count = 0;
    for (size_t l = 0; l < nums.size(); l++) {
        int sum = 0;
        for (size_t r = l; r < nums.size(); r++) {
            sum += nums[r];
            if (sum % k == 0) count++;   // works for negatives too: -5 % 5 == 0
        }
    }
    return count;
}` }
          ]
        }
    },
    mcq: { q: 'pf = −7 and k = 5. Which remainder must you store so it matches pf = 3?', options: ['3, using ((pf % k) + k) % k', '−2, the raw −7 % 5 of Java, JS or C++', '7', '2'], answer: 0, explain: '−7 and 3 differ by 10, a multiple of 5, so they must land in the same bucket. Java, JS and C++ give −7 % 5 = −2 (Python gives 3), so normalize to 3.' },
    hints: [
      `<p><b>Hint 1:</b> sum(l..r) divisible by k ⇔ pf[r] ≡ pf[l−1] (mod k).</p>`,
      `<p><b>Hint 2:</b> Tally remainders (an <code>int[k]</code> is enough) seeded with remainder 0 → 1.</p>`,
      `<p><b>Hint 3:</b> For each prefix: r = ((pf % k) + k) % k; answer += cnt[r]; cnt[r]++. Normalize negatives!</p>`
    ],
    tests: { sig: 'int[] int -> int', fn: 'subarraysDivByK', cases: [
  [[[4, 5, 0, -2, -3, 1], 5], 7],
  [[[5], 9], 0],
  [[[5], 5], 1],
  [[[0, 0], 2], 3],
  [[[-1, 2, 9], 2], 2],
  [[[-10000, 10000], 10000], 3],
  [[[2, -2, 2, -4], 6], 2],
  [[[1, 2, 3, 4, 5], 3], 7]
] },
    solution: {
      approach: `<p><b>Prefix-remainder tally.</b> Two prefixes with equal remainders bound a subarray whose sum is a multiple of k. Counting earlier equal remainders at each step counts every such subarray once.</p>`,
      code: `class Solution {
    public int subarraysDivByK(int[] nums, int k) {
        int[] cnt = new int[k];          // remainder -> how many prefixes had it
        cnt[0] = 1;                      // empty prefix
        int pf = 0, total = 0;
        for (int x : nums) {
            pf = ((pf + x) % k + k) % k; // keep pf as a normalized remainder (no overflow)
            total += cnt[pf];
            cnt[pf]++;
        }
        return total;
    }
}`,
      alt: [{ lang: 'js', code: `function subarraysDivByK(nums, k) {
  const cnt = new Array(k).fill(0);       // remainder -> how many prefixes had it
  cnt[0] = 1;                             // empty prefix
  let pf = 0, total = 0;
  for (const x of nums) {
    pf = (((pf + x) % k) + k) % k;        // JS % keeps the sign: normalise to 0..k-1
    total += cnt[pf];
    cnt[pf]++;
  }
  return total;
}` }, { lang: 'cpp', code: `int subarraysDivByK(vector<int>& nums, int k) {
    vector<int> cnt(k, 0);                // remainder -> how many prefixes had it
    cnt[0] = 1;                           // empty prefix
    int pf = 0, total = 0;
    for (int x : nums) {
        pf = ((pf + x) % k + k) % k;      // C++ % keeps the sign: normalise to 0..k-1
        total += cnt[pf]++;
    }
    return total;
}` }, { lang: 'python', code: `def subarrays_div_by_k(nums, k):
    cnt = [0] * k
    cnt[0] = 1
    pf = total = 0
    for x in nums:
        pf = (pf + x) % k        # Python % is already non-negative for k > 0
        total += cnt[pf]
        cnt[pf] += 1
    return total` }],
      dry: { head: ['x', 'remainder', 'cnt[rem] before', 'total'], rows: [['4', '4', '0', '0'], ['5', '4', H.c('r', '1'), '1'], ['0', '4', H.c('r', '2'), '3'], ['−2', '2', '0', '3'], ['−3', '4', H.c('r', '3'), '6'], ['1', '0', H.c('r', '1'), H.c('g', '7')]] },
      complexity: `<p><b>Time:</b> O(N + k). <b>Space:</b> O(k).</p>`,
      followUps: ['Continuous Subarray Sum (length ≥ 2, store first index of each remainder).', 'Make Sum Divisible by P (LeetCode 1590): remove the shortest subarray — store last index of each remainder.']
    }
  });

  practice.push({
    title: 'Continuous Subarray Sum (multiple of k, length ≥ 2)',
    level: 'Medium', tags: ['prefix sum', 'hashmap', 'first index', 'modulo'], companies: ['Meta', 'Amazon', 'Microsoft'],
    statement: `<p>Given a non-negative integer array <code>nums</code> and an integer k, return <b>true</b> if there is a contiguous subarray of <b>length at least 2</b> whose sum is a multiple of k (0 counts as a multiple).</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, 0 ≤ nums[i] ≤ 10<sup>9</sup>, 1 ≤ k ≤ 2<sup>31</sup> − 1`,
    example: `<p>nums = [23, 2, 4, 6, 7], k = 6 → ${H.c('g', 'true')} ([2, 4] sums to 6). nums = [23, 2, 6, 4, 7], k = 13 → ${H.c('r', 'false')}. nums = [5, 0, 0], k = 3 → ${H.c('g', 'true')} ([0, 0] sums to 0).</p>`,
    brute: {
      why: `<p>Every subarray of length ≥ 2 with a running sum: <b>O(N<sup>2</sup>)</b> = 10<sup>10</sup>. The waste: only remainders matter, and the earliest index of each remainder is all we need to test the length condition.</p>`,
      code: {
          lang: 'java',
          code: `boolean checkSubarraySumBrute(int[] nums, int k) {
    for (int l = 0; l < nums.length; l++) {
        long sum = nums[l];
        for (int r = l + 1; r < nums.length; r++) {
            sum += nums[r];
            if (sum % k == 0) return true;   // length r - l + 1 >= 2
        }
    }
    return false;
}`,
          alt: [
            { lang: 'python', code: `def check_subarray_sum(nums, k):
    for l in range(len(nums)):
        total = nums[l]
        for r in range(l + 1, len(nums)):
            total += nums[r]
            if total % k == 0:
                return True       # length r - l + 1 >= 2
    return False` },
            { lang: 'js', code: `function checkSubarraySum(nums, k) {
  for (let l = 0; l < nums.length; l++) {
    let sum = nums[l];
    for (let r = l + 1; r < nums.length; r++) {
      sum += nums[r];
      if (sum % k === 0) return true;   // length r - l + 1 >= 2
    }
  }
  return false;
}` },
            { lang: 'cpp', code: `bool checkSubarraySum(vector<int>& nums, int k) {
    for (size_t l = 0; l < nums.size(); l++) {
        long long sum = nums[l];
        for (size_t r = l + 1; r < nums.size(); r++) {
            sum += nums[r];
            if (sum % k == 0) return true;   // length r - l + 1 >= 2
        }
    }
    return false;
}` }
          ]
        }
    },
    mcq: { q: 'Why store the FIRST index of each remainder (and never overwrite)?', options: ['The earliest match gives the longest subarray, which is the most likely to satisfy length ≥ 2', 'To save memory', 'Because later indices are always invalid', 'Overwriting would be equally correct'], answer: 0, explain: 'With [0] and k = 1 style cases, overwriting with i would make every later match too short. The earliest index maximizes length.' },
    hints: [
      `<p><b>Hint 1:</b> Same remainder at prefix j and prefix i ⇒ sum(j+1..i) is a multiple of k.</p>`,
      `<p><b>Hint 2:</b> Map remainder → FIRST index, seeded with {0: −1}.</p>`,
      `<p><b>Hint 3:</b> At i: rem = pf % k; if rem in map and i − map[rem] ≥ 2 → true; else if rem not in map → map[rem] = i. Keep pf as a remainder to avoid overflow.</p>`
    ],
    tests: { sig: 'int[] int -> bool', fn: 'checkSubarraySum', cases: [
  [[[23, 2, 4, 6, 7], 6], true],
  [[[23, 2, 6, 4, 7], 13], false],
  [[[5, 0, 0], 3], true],
  [[[0], 1], false],
  [[[1, 0], 2], false],
  [[[0, 0], 7], true],
  [[[1, 2, 12], 6], false],
  [[[1000000000, 1000000000], 2147483647], false],
  [[[1000000000, 1000000000], 2000000000], true],
  [[[1, 1], 2], true],
  [[[6], 6], false]
] },
    solution: {
      approach: `<p>Track prefix remainders with their earliest index. A repeated remainder at distance ≥ 2 proves a valid subarray.</p>`,
      code: `class Solution {
    public boolean checkSubarraySum(int[] nums, int k) {
        Map<Integer, Integer> first = new HashMap<>();
        first.put(0, -1);                          // empty prefix has remainder 0
        int rem = 0;
        for (int i = 0; i < nums.length; i++) {
            rem = (int) (((long) rem + nums[i]) % k);   // long avoids overflow before %
            Integer j = first.get(rem);
            if (j != null) {
                if (i - j >= 2) return true;       // subarray j+1..i has length >= 2
            } else {
                first.put(rem, i);                 // keep the earliest index only
            }
        }
        return false;
    }
}`,
      alt: [{ lang: 'js', code: `function checkSubarraySum(nums, k) {
  const first = new Map([[0, -1]]);       // remainder -> earliest prefix index
  let rem = 0;
  for (let i = 0; i < nums.length; i++) {
    rem = (rem + nums[i]) % k;            // below 2^53, so Number is exact
    if (first.has(rem)) {
      if (i - first.get(rem) >= 2) return true;   // length at least 2
    } else {
      first.set(rem, i);
    }
  }
  return false;
}` }, { lang: 'cpp', code: `bool checkSubarraySum(vector<int>& nums, int k) {
    unordered_map<long long, int> first{{0, -1}};   // remainder -> earliest prefix index
    long long rem = 0;
    for (int i = 0; i < (int)nums.size(); i++) {
        rem = (rem + nums[i]) % k;                  // long long avoids overflow before %
        auto [it, inserted] = first.try_emplace(rem, i);
        if (!inserted && i - it->second >= 2) return true;   // length at least 2
    }
    return false;
}` }, { lang: 'python', code: `def check_subarray_sum(nums, k):
    first, rem = {0: -1}, 0
    for i, x in enumerate(nums):
        rem = (rem + x) % k
        if rem in first:
            if i - first[rem] >= 2:
                return True
        else:
            first[rem] = i
    return False` }],
      dry: { head: ['i', 'x', 'rem (mod 6)', 'first[rem]', 'decision'], rows: [['0', '23', '5', '—', H.c('g', 'store 5:0')], ['1', '2', '1', '—', H.c('g', 'store 1:1')], ['2', '4', '5', H.c('r', '0'), H.c('g', '2 − 0 = 2 ≥ 2 → true')]] },
      complexity: `<p><b>Time:</b> O(N). <b>Space:</b> O(min(N, k)).</p>`,
      followUps: ['Return the subarray boundaries.', 'Allow negative numbers (normalize remainders).']
    }
  });

  practice.push({
    title: 'Count Number of Nice Subarrays (exactly k odd numbers)',
    level: 'Medium', tags: ['prefix sum', 'hashmap', 'counting'], companies: ['Amazon', 'Roblox', 'Meta'],
    statement: `<p>A subarray is <b>nice</b> if it contains exactly <code>k</code> odd numbers. Given <code>nums</code> and k, return the number of nice subarrays.</p>`,
    constraints: `1 ≤ N ≤ 5·10<sup>4</sup>, 1 ≤ nums[i] ≤ 10<sup>5</sup>, 1 ≤ k ≤ N`,
    example: `<p>nums = [1, 1, 2, 1, 1], k = 3 → ${H.c('g', '2')}: [1, 1, 2, 1] and [1, 2, 1, 1]. nums = [2, 2, 2, 1, 2, 2, 1, 2, 2, 2], k = 2 → ${H.c('g', '16')}.</p>`,
    brute: {
      why: `<p>Every (l, r) with a running odd counter: <b>O(N<sup>2</sup>)</b> = 2.5·10<sup>9</sup>. The waste: "number of odds in l..r" is a prefix-count difference, so this is "count subarrays with sum k" in disguise.</p>`,
      code: {
          lang: 'java',
          code: `int numberOfSubarraysBrute(int[] nums, int k) {
    int count = 0;
    for (int l = 0; l < nums.length; l++) {
        int odd = 0;
        for (int r = l; r < nums.length; r++) {
            odd += nums[r] & 1;
            if (odd == k) count++;
            else if (odd > k) break;          // more odds can only grow
        }
    }
    return count;
}`,
          alt: [
            { lang: 'python', code: `def number_of_subarrays(nums, k):
    count = 0
    for l in range(len(nums)):
        odd = 0
        for r in range(l, len(nums)):
            odd += nums[r] & 1
            if odd == k:
                count += 1
            elif odd > k:
                break             # more odds can only grow
    return count` },
            { lang: 'js', code: `function numberOfSubarrays(nums, k) {
  let count = 0;
  for (let l = 0; l < nums.length; l++) {
    let odd = 0;
    for (let r = l; r < nums.length; r++) {
      odd += nums[r] & 1;
      if (odd === k) count++;
      else if (odd > k) break;          // more odds can only grow
    }
  }
  return count;
}` },
            { lang: 'cpp', code: `int numberOfSubarrays(vector<int>& nums, int k) {
    int count = 0;
    for (size_t l = 0; l < nums.size(); l++) {
        int odd = 0;
        for (size_t r = l; r < nums.size(); r++) {
            odd += nums[r] & 1;
            if (odd == k) count++;
            else if (odd > k) break;      // more odds can only grow
        }
    }
    return count;
}` }
          ]
        }
    },
    mcq: { q: 'Turn each element into (nums[i] % 2). The problem then becomes…', options: ['Count subarrays with sum exactly k', 'Longest subarray with sum k', 'Does a zero-sum subarray exist?', 'Count distinct elements per window'], answer: 0, explain: 'Odd → 1, even → 0: the number of odds in a subarray is its sum. Then use the prefix-count map from topic 6.' },
    hints: [
      `<p><b>Hint 1:</b> Replace each number by 1 if odd, 0 if even.</p>`,
      `<p><b>Hint 2:</b> Now count subarrays with sum exactly k: prefix count of odds + tally {0: 1}.</p>`,
      `<p><b>Hint 3:</b> Prefix odd-counts lie in 0..N, so an <code>int[N + 1]</code> replaces the map. Alternative: atMost(k) − atMost(k − 1) with a sliding window.</p>`
    ],
    tests: { sig: 'int[] int -> int', fn: 'numberOfSubarrays', cases: [
  [[[1, 1, 2, 1, 1], 3], 2],
  [[[2, 4, 6], 1], 0],
  [[[2, 2, 2, 1, 2, 2, 1, 2, 2, 2], 2], 16],
  [[[1], 1], 1],
  [[[2], 1], 0],
  [[[1, 3, 5], 2], 2],
  [[[1, 1, 1, 1], 1], 4],
  [[[7, 2, 9, 4, 6, 5], 3], 1]
] },
    solution: {
      approach: `<p><b>Odd-count prefix + tally.</b> Let odd = number of odd values so far. Each earlier prefix with odd − k odds starts a nice subarray ending here.</p>`,
      code: `class Solution {
    public int numberOfSubarrays(int[] nums, int k) {
        int[] cnt = new int[nums.length + 1];   // prefix odd count -> how many prefixes
        cnt[0] = 1;
        int odd = 0, total = 0;
        for (int x : nums) {
            odd += x & 1;                        // 1 if odd
            if (odd >= k) total += cnt[odd - k]; // earlier prefixes with odd - k odds
            cnt[odd]++;
        }
        return total;
    }
}`,
      alt: [{ lang: 'js', code: `function numberOfSubarrays(nums, k) {
  const cnt = new Array(nums.length + 1).fill(0);   // prefix odd count -> how many prefixes
  cnt[0] = 1;
  let odd = 0, total = 0;
  for (const x of nums) {
    odd += x & 1;                                    // 1 if odd
    if (odd >= k) total += cnt[odd - k];
    cnt[odd]++;
  }
  return total;
}` }, { lang: 'cpp', code: `int numberOfSubarrays(vector<int>& nums, int k) {
    vector<int> cnt(nums.size() + 1, 0);   // prefix odd count -> how many prefixes
    cnt[0] = 1;
    int odd = 0, total = 0;
    for (int x : nums) {
        odd += x & 1;                       // 1 if odd
        if (odd >= k) total += cnt[odd - k];
        cnt[odd]++;
    }
    return total;
}` }, { lang: 'python', code: `def number_of_subarrays(nums, k):
    cnt = [0] * (len(nums) + 1)
    cnt[0] = 1
    odd = total = 0
    for x in nums:
        odd += x & 1
        if odd >= k:
            total += cnt[odd - k]
        cnt[odd] += 1
    return total` }],
      complexity: `<p><b>Time:</b> O(N). <b>Space:</b> O(N).</p>`,
      followUps: ['Binary Subarrays With Sum (LeetCode 930) — identical with 0/1 input.', 'Count subarrays with exactly k distinct values (LeetCode 992, Hard).']
    }
  });

  practice.push({
    title: 'Longest Substring with At Most K Distinct Characters',
    level: 'Medium', tags: ['sliding window', 'hashmap'], companies: ['Google', 'Meta', 'Amazon', 'Coupang'],
    statement: `<p>Given a string s and an integer k, return the length of the longest substring that contains <b>at most k distinct</b> characters.</p>`,
    constraints: `1 ≤ s.length ≤ 5·10<sup>4</sup>, 0 ≤ k ≤ 50`,
    example: `<p>s = "eceba", k = 2 → ${H.c('g', '3')} ("ece"). s = "aa", k = 1 → ${H.c('g', '2')}.</p>`,
    brute: {
      why: `<p>For every start, extend while the distinct count (a set) stays ≤ k: <b>O(N<sup>2</sup>)</b>. The waste: when the window becomes invalid we restart instead of shrinking from the left.</p>`,
      code: {
          lang: 'java',
          code: `int lengthOfLongestSubstringKDistinctBrute(String s, int k) {
    int best = 0;
    for (int i = 0; i < s.length(); i++) {
        Set<Character> seen = new HashSet<>();
        for (int j = i; j < s.length(); j++) {
            seen.add(s.charAt(j));
            if (seen.size() > k) break;
            best = Math.max(best, j - i + 1);
        }
    }
    return best;
}`,
          alt: [
            { lang: 'python', code: `def length_of_longest_substring_k_distinct(s, k):
    best = 0
    for i in range(len(s)):
        seen = set()
        for j in range(i, len(s)):
            seen.add(s[j])
            if len(seen) > k:
                break
            best = max(best, j - i + 1)
    return best` },
            { lang: 'js', code: `function lengthOfLongestSubstringKDistinct(s, k) {
  let best = 0;
  for (let i = 0; i < s.length; i++) {
    const seen = new Set();
    for (let j = i; j < s.length; j++) {
      seen.add(s[j]);
      if (seen.size > k) break;
      best = Math.max(best, j - i + 1);
    }
  }
  return best;
}` },
            { lang: 'cpp', code: `int lengthOfLongestSubstringKDistinct(string s, int k) {
    int best = 0;
    for (int i = 0; i < (int)s.size(); i++) {
        unordered_set<char> seen;
        for (int j = i; j < (int)s.size(); j++) {
            seen.insert(s[j]);
            if ((int)seen.size() > k) break;
            best = max(best, j - i + 1);
        }
    }
    return best;
}` }
          ]
        }
    },
    mcq: { q: 'While shrinking, when may you remove a character from the window map entirely?', options: ['Only when its count drops to 0', 'As soon as it is at s[left]', 'Never — just decrement', 'When the map size equals k'], answer: 0, explain: 'map.size() must equal the number of distinct characters in the window, so delete keys exactly when their count reaches 0.' },
    hints: [
      `<p><b>Hint 1:</b> If a window has ≤ k distinct characters, so does every window inside it → sliding window.</p>`,
      `<p><b>Hint 2:</b> Keep a count map of the window; valid ⇔ map.size() ≤ k.</p>`,
      `<p><b>Hint 3:</b> Expand right; while size &gt; k, decrement s[left] (delete at 0) and left++; update best. k = 0 → answer 0.</p>`
    ],
    tests: { sig: 'string int -> int', fn: 'lengthOfLongestSubstringKDistinct', cases: [
  [['eceba', 2], 3],
  [['aa', 1], 2],
  [['a', 0], 0],
  [['abc', 0], 0],
  [['abaccc', 2], 4],
  [['abcabc', 3], 6],
  [['abcdef', 1], 1],
  [['aabbccdd', 2], 4],
  [['x', 50], 1]
] },
    solution: {
      approach: `<p>The general window-with-map template: the map's size is the number of distinct characters inside, shrink while it exceeds k.</p>`,
      code: `class Solution {
    public int lengthOfLongestSubstringKDistinct(String s, int k) {
        Map<Character, Integer> cnt = new HashMap<>();
        int left = 0, best = 0;
        for (int right = 0; right < s.length(); right++) {
            cnt.merge(s.charAt(right), 1, Integer::sum);
            while (cnt.size() > k) {
                char d = s.charAt(left++);
                cnt.computeIfPresent(d, (key, v) -> v == 1 ? null : v - 1);   // delete at 0
            }
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}`,
      alt: [{ lang: 'js', code: `function lengthOfLongestSubstringKDistinct(s, k) {
  const cnt = new Map();                  // char -> copies in the window
  let left = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    cnt.set(s[right], (cnt.get(s[right]) || 0) + 1);
    while (cnt.size > k) {                // too many distinct: shrink
      const d = s[left++];
      const c = cnt.get(d) - 1;
      if (c === 0) cnt.delete(d); else cnt.set(d, c);
    }
    best = Math.max(best, right - left + 1);
  }
  return best;
}` }, { lang: 'cpp', code: `int lengthOfLongestSubstringKDistinct(string s, int k) {
    unordered_map<char, int> cnt;           // char -> copies in the window
    int left = 0, best = 0;
    for (int right = 0; right < (int)s.size(); right++) {
        cnt[s[right]]++;
        while ((int)cnt.size() > k) {       // too many distinct: shrink
            char d = s[left++];
            if (--cnt[d] == 0) cnt.erase(d);
        }
        best = max(best, right - left + 1);
    }
    return best;
}` }, { lang: 'python', code: `from collections import defaultdict

def length_of_longest_substring_k_distinct(s, k):
    cnt, left, best = defaultdict(int), 0, 0
    for right, c in enumerate(s):
        cnt[c] += 1
        while len(cnt) > k:
            d = s[left]
            cnt[d] -= 1
            if cnt[d] == 0:
                del cnt[d]
            left += 1
        best = max(best, right - left + 1)
    return best` }],
      dry: { head: ['right', 'char', 'map after', 'shrink?', 'best'], rows: [['0', 'e', '{e:1}', 'no', '1'], ['1', 'c', '{e:1, c:1}', 'no', '2'], ['2', 'e', '{e:2, c:1}', 'no', H.c('g', '3')], ['3', 'b', '{e:2, c:1, b:1}', H.c('r', 'yes: drop e, c(→0 delete)') + ' → {e:1, b:1}', '3'], ['4', 'a', '{e:1, b:1, a:1}', H.c('r', 'yes: drop e(→0)') + ' → {b:1, a:1}', '3']] },
      complexity: `<p><b>Time:</b> O(N). <b>Space:</b> O(k).</p>`,
      followUps: ['Fruit Into Baskets (k = 2).', 'Stream of characters: keep last index per character in a LinkedHashMap to evict the leftmost in O(1).']
    }
  });

  practice.push({
    title: '4Sum II (count tuples from four arrays)',
    level: 'Medium', tags: ['hashmap', 'meet in the middle'], companies: ['Amazon', 'Google', 'Adobe'],
    statement: `<p>Given four integer arrays A, B, C, D, each of length n, return the number of tuples (i, j, k, l) with <code>A[i] + B[j] + C[k] + D[l] == 0</code>.</p>`,
    constraints: `1 ≤ n ≤ 200, −2<sup>28</sup> ≤ values ≤ 2<sup>28</sup>`,
    example: `<p>A = [1, 2], B = [−2, −1], C = [−1, 2], D = [0, 2] → ${H.c('g', '2')}: (0,0,0,1): 1 − 2 − 1 + 2 = 0 and (1,1,0,0): 2 − 1 − 1 + 0 = 0.</p>`,
    brute: {
      why: `<p>Four nested loops: n<sup>4</sup> = 1.6·10<sup>9</sup> for n = 200. The waste: for each (C, D) pair we search for a matching (A, B) sum by enumeration instead of lookup.</p>`,
      code: {
          lang: 'java',
          code: `int fourSumCountBrute(int[] A, int[] B, int[] C, int[] D) {
    int count = 0;
    for (int a : A) for (int b : B) for (int c : C) for (int d : D)
        if (a + b + c + d == 0) count++;
    return count;
}`,
          alt: [
            { lang: 'python', code: `def four_sum_count(A, B, C, D):
    count = 0
    for a in A:
        for b in B:
            for c in C:
                for d in D:
                    if a + b + c + d == 0:
                        count += 1
    return count` },
            { lang: 'js', code: `function fourSumCount(A, B, C, D) {
  let count = 0;
  for (const a of A) for (const b of B) for (const c of C) for (const d of D)
    if (a + b + c + d === 0) count++;
  return count;
}` },
            { lang: 'cpp', code: `int fourSumCount(vector<int>& A, vector<int>& B, vector<int>& C, vector<int>& D) {
    int count = 0;
    for (int a : A) for (int b : B) for (int c : C) for (int d : D)
        if (a + b + c + d == 0) count++;
    return count;
}` }
          ]
        }
    },
    mcq: { q: 'What do you store in the HashMap?', options: ['Every sum A[i] + B[j] → how many pairs produce it', 'Every element of A', 'Every quadruple sum', 'Only the distinct values of C'], answer: 0, explain: 'Then each (C[k], D[l]) pair looks up −(C[k] + D[l]) in O(1): n² + n² work instead of n⁴ ("meet in the middle").' },
    hints: [
      `<p><b>Hint 1:</b> Split the four arrays into two halves: (A, B) and (C, D).</p>`,
      `<p><b>Hint 2:</b> Tally all n<sup>2</sup> sums of A and B in a map sum → count.</p>`,
      `<p><b>Hint 3:</b> For every c + d, add count[−(c + d)]. That is 2-Sum where each "number" is a pair sum.</p>`
    ],
    tests: { sig: 'int[] int[] int[] int[] -> int', fn: 'fourSumCount', cases: [
  [[[1, 2], [-2, -1], [-1, 2], [0, 2]], 2],
  [[[0], [0], [0], [0]], 1],
  [[[1], [1], [1], [1]], 0],
  [[[0, 0], [0, 0], [0, 0], [0, 0]], 16],
  [[[268435456], [268435456], [-268435456], [-268435456]], 1],
  [[[-1, -1], [-1, 1], [-1, 1], [1, -1]], 6],
  [[[1, -1, 0], [0, 1, -1], [2, -2, 0], [0, 0, 1]], 14]
] },
    solution: {
      approach: `<p><b>Meet in the middle with a counting map.</b> n<sup>2</sup> sums from the first half go into a tally; n<sup>2</sup> lookups from the second half count matching tuples.</p>`,
      code: `class Solution {
    public int fourSumCount(int[] A, int[] B, int[] C, int[] D) {
        Map<Integer, Integer> ab = new HashMap<>();
        for (int a : A) for (int b : B) ab.merge(a + b, 1, Integer::sum);   // values ≤ 2^29: no overflow
        int count = 0;
        for (int c : C) for (int d : D) count += ab.getOrDefault(-(c + d), 0);
        return count;
    }
}`,
      alt: [{ lang: 'js', code: `function fourSumCount(A, B, C, D) {
  const ab = new Map();                   // a + b -> how many pairs
  for (const a of A) for (const b of B) ab.set(a + b, (ab.get(a + b) || 0) + 1);
  let count = 0;
  for (const c of C) for (const d of D) count += ab.get(-(c + d)) || 0;
  return count;
}` }, { lang: 'cpp', code: `int fourSumCount(vector<int>& A, vector<int>& B, vector<int>& C, vector<int>& D) {
    unordered_map<int, int> ab;             // a + b -> how many pairs (|a + b| <= 2^29)
    for (int a : A) for (int b : B) ab[a + b]++;
    int count = 0;
    for (int c : C) for (int d : D) {
        auto it = ab.find(-(c + d));
        if (it != ab.end()) count += it->second;
    }
    return count;
}` }, { lang: 'python', code: `from collections import Counter

def four_sum_count(A, B, C, D):
    ab = Counter(a + b for a in A for b in B)
    return sum(ab[-(c + d)] for c in C for d in D)` }],
      complexity: `<p><b>Time:</b> O(n<sup>2</sup>). <b>Space:</b> O(n<sup>2</sup>).</p>`,
      followUps: ['k arrays: split into two halves of k/2 arrays → O(n<sup>k/2</sup>).', 'Return the tuples themselves (map sum → list of pairs; output size may be huge).']
    }
  });

  practice.push({
    title: 'Brick Wall',
    level: 'Medium', tags: ['hashmap', 'prefix sum', 'frequency'], companies: ['Meta', 'Google', 'Amazon'],
    statement: `<p>A wall has several rows of bricks of equal total width (row = list of brick widths). Draw one vertical line from top to bottom that crosses the <b>fewest bricks</b>; a line through an edge between two bricks does not cross them. You may not draw along the two outer edges. Return the minimum number of crossed bricks.</p>`,
    constraints: `1 ≤ rows ≤ 10<sup>4</sup>, total bricks ≤ 2·10<sup>4</sup>, row width ≤ 2<sup>31</sup> − 1`,
    example: `<p>wall = [[1,2,2,1],[3,1,2],[1,3,2],[2,4],[3,1,2],[1,3,1,1]] → ${H.c('g', '2')}. Edge position 4 (from the left) appears in 4 of the 6 rows, so a line at x = 4 crosses only 6 − 4 = 2 bricks.</p>`,
    brute: {
      why: `<p>Try every x from 1 to width − 1 and count crossed bricks per row: O(width · bricks). Width can be 2<sup>31</sup> → impossible. The waste: only positions where some edge exists can be optimal, and we can count them directly.</p>`,
      code: {
          lang: 'java',
          code: `int leastBricksBrute(List<List<Integer>> wall) {
    int width = 0;
    for (int w : wall.get(0)) width += w;
    int best = wall.size();
    for (int x = 1; x < width; x++) {            // hopeless when width is huge
        int crossed = 0;
        for (List<Integer> row : wall) {
            int pos = 0;
            boolean onEdge = false;
            for (int w : row) { pos += w; if (pos == x) { onEdge = true; break; } if (pos > x) break; }
            if (!onEdge) crossed++;
        }
        best = Math.min(best, crossed);
    }
    return best;
}`,
          alt: [
            { lang: 'python', code: `def least_bricks(wall):
    width = sum(wall[0])
    best = len(wall)
    for x in range(1, width):            # hopeless when width is huge
        crossed = 0
        for row in wall:
            pos = 0
            on_edge = False
            for w in row:
                pos += w
                if pos == x:
                    on_edge = True
                    break
                if pos > x:
                    break
            if not on_edge:
                crossed += 1
        best = min(best, crossed)
    return best` },
            { lang: 'js', code: `function leastBricks(wall) {
  let width = 0;
  for (const w of wall[0]) width += w;
  let best = wall.length;
  for (let x = 1; x < width; x++) {            // hopeless when width is huge
    let crossed = 0;
    for (const row of wall) {
      let pos = 0;
      let onEdge = false;
      for (const w of row) { pos += w; if (pos === x) { onEdge = true; break; } if (pos > x) break; }
      if (!onEdge) crossed++;
    }
    best = Math.min(best, crossed);
  }
  return best;
}` },
            { lang: 'cpp', code: `int leastBricks(vector<vector<int>>& wall) {
    int width = 0;
    for (int w : wall[0]) width += w;
    int best = wall.size();
    for (int x = 1; x < width; x++) {            // hopeless when width is huge
        int crossed = 0;
        for (auto& row : wall) {
            int pos = 0;
            bool onEdge = false;
            for (int w : row) { pos += w; if (pos == x) { onEdge = true; break; } if (pos > x) break; }
            if (!onEdge) crossed++;
        }
        best = min(best, crossed);
    }
    return best;
}` }
          ]
        }
    },
    mcq: { q: 'Which positions should you count in the map?', options: ['Running sums of brick widths in each row, excluding the row\'s final total', 'Each brick width', 'Only the first brick of each row', 'The total width'], answer: 0, explain: 'Inner edges sit at prefix sums of widths. The final prefix equals the wall\'s outer edge, which is not allowed.' },
    hints: [
      `<p><b>Hint 1:</b> Crossing the fewest bricks = passing through the most edges.</p>`,
      `<p><b>Hint 2:</b> Edge positions in a row are prefix sums of its widths (skip the last one).</p>`,
      `<p><b>Hint 3:</b> Tally every edge position across rows; answer = rows − (largest tally). No edges at all → rows.</p>`
    ],
    tests: { sig: 'list<list<int>> -> int', fn: 'leastBricks', cases: [
  [[[[1, 2, 2, 1], [3, 1, 2], [1, 3, 2], [2, 4], [3, 1, 2], [1, 3, 1, 1]]], 2],
  [[[[1], [1], [1]]], 3],
  [[[[3]]], 1],
  [[[[1, 1], [2], [1, 1]]], 1],
  [[[[2, 1], [1, 2]]], 1],
  [[[[1, 1, 1], [1, 1, 1]]], 0],
  [[[[5, 5], [5, 5], [10]]], 1],
  [[[[2147483646, 1], [1, 2147483646]]], 1]
] },
    solution: {
      approach: `<p><b>Tally edge positions.</b> The best line goes through the most common inner edge position. Prefix sums give each row's edges; a HashMap counts them.</p>`,
      code: `class Solution {
    public int leastBricks(List<List<Integer>> wall) {
        Map<Integer, Integer> edges = new HashMap<>();   // position -> rows with an edge there
        int most = 0;
        for (List<Integer> row : wall) {
            int pos = 0;
            for (int i = 0; i < row.size() - 1; i++) {   // skip the last brick: outer edge
                pos += row.get(i);
                most = Math.max(most, edges.merge(pos, 1, Integer::sum));
            }
        }
        return wall.size() - most;
    }
}`,
      alt: [{ lang: 'js', code: `function leastBricks(wall) {
  const edges = new Map();                // position -> rows with an edge there
  let most = 0;
  for (const row of wall) {
    let pos = 0;
    for (let i = 0; i < row.length - 1; i++) {   // skip the last brick: outer edge
      pos += row[i];
      const c = (edges.get(pos) || 0) + 1;
      edges.set(pos, c);
      most = Math.max(most, c);
    }
  }
  return wall.length - most;
}` }, { lang: 'cpp', code: `int leastBricks(vector<vector<int>>& wall) {
    unordered_map<long long, int> edges;    // position -> rows with an edge there
    int most = 0;
    for (auto& row : wall) {
        long long pos = 0;
        for (size_t i = 0; i + 1 < row.size(); i++) {   // skip the last brick: outer edge
            pos += row[i];
            most = max(most, ++edges[pos]);
        }
    }
    return (int)wall.size() - most;
}` }, { lang: 'python', code: `from collections import Counter
from itertools import accumulate

def least_bricks(wall):
    edges = Counter(p for row in wall for p in list(accumulate(row))[:-1])
    return len(wall) - max(edges.values(), default=0)` }],
      complexity: `<p><b>Time:</b> O(total bricks). <b>Space:</b> O(distinct edge positions).</p>`,
      followUps: ['Return the best x position too.', 'Rows arrive as a stream (keep the running max).']
    }
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'Subarrays with K Different Integers',
    level: 'Hard', tags: ['sliding window', 'hashmap', 'atMost trick'], companies: ['Amazon', 'Google', 'Uber'],
    statement: `<p>Given an integer array <code>nums</code> and an integer k, return the number of <b>good</b> subarrays — contiguous subarrays with <b>exactly k</b> different integers.</p>`,
    constraints: `1 ≤ N ≤ 2·10<sup>4</sup>, 1 ≤ nums[i], k ≤ N`,
    example: `<p>nums = [1, 2, 1, 2, 3], k = 2 → ${H.c('g', '7')}: [1,2], [2,1], [1,2], [2,3], [1,2,1], [2,1,2], [1,2,1,2]. nums = [1, 2, 1, 3, 4], k = 3 → ${H.c('g', '3')}.</p>`,
    brute: {
      why: `<p>For each start, extend with a set and count windows whose distinct count is exactly k (stop once it exceeds k): <b>O(N<sup>2</sup>)</b> = 4·10<sup>8</sup>. Why a plain sliding window is not enough: for a fixed right end, the valid starts form a whole <i>range</i> of positions (shrinking a little keeps exactly k distinct values, shrinking more drops to k − 1), so "shrink until valid, then add 1" undercounts.</p>`,
      code: {
          lang: 'java',
          code: `int subarraysWithKDistinctBrute(int[] nums, int k) {
    int count = 0;
    for (int l = 0; l < nums.length; l++) {
        Set<Integer> seen = new HashSet<>();
        for (int r = l; r < nums.length; r++) {
            seen.add(nums[r]);
            if (seen.size() == k) count++;
            else if (seen.size() > k) break;
        }
    }
    return count;
}`,
          alt: [
            { lang: 'python', code: `def subarrays_with_k_distinct(nums, k):
    count = 0
    for l in range(len(nums)):
        seen = set()
        for r in range(l, len(nums)):
            seen.add(nums[r])
            if len(seen) == k:
                count += 1
            elif len(seen) > k:
                break
    return count` },
            { lang: 'js', code: `function subarraysWithKDistinct(nums, k) {
  let count = 0;
  for (let l = 0; l < nums.length; l++) {
    const seen = new Set();
    for (let r = l; r < nums.length; r++) {
      seen.add(nums[r]);
      if (seen.size === k) count++;
      else if (seen.size > k) break;
    }
  }
  return count;
}` },
            { lang: 'cpp', code: `int subarraysWithKDistinct(vector<int>& nums, int k) {
    int count = 0;
    for (size_t l = 0; l < nums.size(); l++) {
        unordered_set<int> seen;
        for (size_t r = l; r < nums.size(); r++) {
            seen.insert(nums[r]);
            if ((int)seen.size() == k) count++;
            else if ((int)seen.size() > k) break;
        }
    }
    return count;
}` }
          ]
        }
    },
    mcq: { q: 'Why does exactly(k) = atMost(k) − atMost(k − 1) help?', options: ['"At most k distinct" is monotone, so each atMost is a simple sliding window that adds (right − left + 1) per step', 'Because exactly(k) is always 0', 'It turns the problem into sorting', 'It removes the need for a HashMap'], answer: 0, explain: 'Windows with ≤ k distinct shrink nicely. Subtracting the ≤ k−1 ones leaves exactly k.' },
    hints: [
      `<p><b>Hint 1:</b> Counting "exactly" is awkward; counting "at most" is easy with a sliding window.</p>`,
      `<p><b>Hint 2:</b> In atMost(k), after shrinking so the window [left..right] has ≤ k distinct, every subarray ending at right and starting in [left..right] is valid: add right − left + 1.</p>`,
      `<p><b>Hint 3:</b> Answer = atMost(k) − atMost(k − 1). Use a count map, delete keys at 0. atMost(0) returns 0.</p>`
    ],
    tests: { sig: 'int[] int -> int', fn: 'subarraysWithKDistinct', cases: [
  [[[1, 2, 1, 2, 3], 2], 7],
  [[[1, 2, 1, 3, 4], 3], 3],
  [[[1], 1], 1],
  [[[1, 1, 1], 1], 6],
  [[[1, 2, 3], 3], 1],
  [[[1, 2], 1], 2],
  [[[2, 1, 2, 1, 2], 2], 10],
  [[[1, 2, 1, 2, 1], 1], 5]
] },
    solution: {
      approach: `<p><b>atMost difference.</b> Two runs of the window-with-map template. Each run is O(N), and the subtraction isolates the windows with exactly k distinct integers.</p>`,
      code: `class Solution {
    public int subarraysWithKDistinct(int[] nums, int k) {
        return atMost(nums, k) - atMost(nums, k - 1);
    }

    // number of subarrays with at most k distinct values
    private int atMost(int[] a, int k) {
        Map<Integer, Integer> cnt = new HashMap<>();
        int left = 0, res = 0;
        for (int right = 0; right < a.length; right++) {
            cnt.merge(a[right], 1, Integer::sum);
            while (cnt.size() > k) {
                cnt.computeIfPresent(a[left++], (key, v) -> v == 1 ? null : v - 1);
            }
            res += right - left + 1;      // all subarrays ending at right that start in [left..right]
        }
        return res;
    }
}`,
      alt: [{ lang: 'js', code: `function subarraysWithKDistinct(nums, k) {
  // number of subarrays with at most m distinct values
  const atMost = (m) => {
    const cnt = new Map();
    let left = 0, res = 0;
    for (let right = 0; right < nums.length; right++) {
      cnt.set(nums[right], (cnt.get(nums[right]) || 0) + 1);
      while (cnt.size > m) {
        const y = nums[left++];
        const c = cnt.get(y) - 1;
        if (c === 0) cnt.delete(y); else cnt.set(y, c);
      }
      res += right - left + 1;            // subarrays ending at right
    }
    return res;
  };
  return atMost(k) - atMost(k - 1);
}` }, { lang: 'cpp', code: `class Solution {
    // number of subarrays with at most m distinct values (values are 1..N)
    int atMost(const vector<int>& a, int m) {
        vector<int> cnt(a.size() + 1, 0);
        int left = 0, distinct = 0, res = 0;
        for (int right = 0; right < (int)a.size(); right++) {
            if (cnt[a[right]]++ == 0) distinct++;
            while (distinct > m)
                if (--cnt[a[left++]] == 0) distinct--;
            res += right - left + 1;          // subarrays ending at right
        }
        return res;
    }
public:
    int subarraysWithKDistinct(vector<int>& nums, int k) {
        return atMost(nums, k) - atMost(nums, k - 1);
    }
};` }, { lang: 'python', code: `from collections import defaultdict

def subarrays_with_k_distinct(nums, k):
    def at_most(k):
        cnt, left, res = defaultdict(int), 0, 0
        for right, x in enumerate(nums):
            cnt[x] += 1
            while len(cnt) > k:
                y = nums[left]
                cnt[y] -= 1
                if cnt[y] == 0:
                    del cnt[y]
                left += 1
            res += right - left + 1
        return res
    return at_most(k) - at_most(k - 1)` }],
      dry: { head: ['right', 'x', 'atMost(2): left', '+ count', 'atMost(1): left', '+ count'], rows: [['0', '1', '0', '1', '0', '1'], ['1', '2', '0', '2', '1', '1'], ['2', '1', '0', '3', '2', '1'], ['3', '2', '0', '4', '3', '1'], ['4', '3', '3', '2', '4', '1'], ['total', '—', '—', '12', '—', '5 → ' + H.c('g', '12 − 5 = 7')]] },
      complexity: `<p><b>Time:</b> O(N) (two linear passes). <b>Space:</b> O(k).</p>`,
      followUps: ['Count subarrays with at most k distinct and length ≥ L.', 'Same identity for "exactly k odd numbers" or "binary subarrays with sum k".']
    }
  });

  practice.push({
    title: 'Number of Submatrices That Sum to Target',
    level: 'Hard', tags: ['prefix sum', 'hashmap', '2D'], companies: ['Google', 'Amazon', 'Meta'],
    statement: `<p>Given an R × C integer matrix and an integer target, return the number of non-empty <b>submatrices</b> (axis-aligned rectangles) whose elements sum to target.</p>`,
    constraints: `1 ≤ R, C ≤ 100, −1000 ≤ matrix[i][j] ≤ 1000, −10<sup>8</sup> ≤ target ≤ 10<sup>8</sup>`,
    example: `<p>matrix = [[0,1,0],[1,1,1],[0,1,0]], target = 0 → ${H.c('g', '4')} (the four single 0 cells). matrix = [[1,−1],[−1,1]], target = 0 → ${H.c('g', '5')} (two 1×2 rows, two 2×1 columns, and the whole 2×2).</p>`,
    brute: {
      why: `<p>Enumerate all rectangles (R<sup>2</sup>·C<sup>2</sup> ≈ 10<sup>8</sup> for 100×100) and get each sum in O(1) from a 2D prefix table. Borderline-slow; and the naive version that sums each rectangle cell by cell is O(R<sup>3</sup>C<sup>3</sup>). The waste: for a fixed pair of rows, the inner two column loops are just "count subarrays with sum = target" — an O(C) hashing job.</p>`,
      code: {
          lang: 'java',
          code: `int numSubmatrixSumTargetBrute(int[][] m, int target) {
    int R = m.length, C = m[0].length, count = 0;
    int[][] P = new int[R + 1][C + 1];                       // 2D prefix sums
    for (int i = 0; i < R; i++)
        for (int j = 0; j < C; j++)
            P[i + 1][j + 1] = m[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
    for (int r1 = 0; r1 < R; r1++)
        for (int r2 = r1; r2 < R; r2++)
            for (int c1 = 0; c1 < C; c1++)
                for (int c2 = c1; c2 < C; c2++) {
                    int sum = P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
                    if (sum == target) count++;
                }
    return count;
}`,
          alt: [
            { lang: 'python', code: `def num_submatrix_sum_target(matrix, target):
    R, C, count = len(matrix), len(matrix[0]), 0
    P = [[0] * (C + 1) for _ in range(R + 1)]            # 2D prefix sums
    for i in range(R):
        for j in range(C):
            P[i + 1][j + 1] = matrix[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j]
    for r1 in range(R):
        for r2 in range(r1, R):
            for c1 in range(C):
                for c2 in range(c1, C):
                    total = P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]
                    if total == target:
                        count += 1
    return count` },
            { lang: 'js', code: `function numSubmatrixSumTarget(matrix, target) {
  const R = matrix.length, C = matrix[0].length;
  let count = 0;
  const P = Array.from({ length: R + 1 }, () => new Array(C + 1).fill(0));   // 2D prefix sums
  for (let i = 0; i < R; i++)
    for (let j = 0; j < C; j++)
      P[i + 1][j + 1] = matrix[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
  for (let r1 = 0; r1 < R; r1++)
    for (let r2 = r1; r2 < R; r2++)
      for (let c1 = 0; c1 < C; c1++)
        for (let c2 = c1; c2 < C; c2++) {
          const sum = P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
          if (sum === target) count++;
        }
  return count;
}` },
            { lang: 'cpp', code: `int numSubmatrixSumTarget(vector<vector<int>>& matrix, int target) {
    int R = matrix.size(), C = matrix[0].size(), count = 0;
    vector<vector<int>> P(R + 1, vector<int>(C + 1, 0));     // 2D prefix sums
    for (int i = 0; i < R; i++)
        for (int j = 0; j < C; j++)
            P[i + 1][j + 1] = matrix[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
    for (int r1 = 0; r1 < R; r1++)
        for (int r2 = r1; r2 < R; r2++)
            for (int c1 = 0; c1 < C; c1++)
                for (int c2 = c1; c2 < C; c2++) {
                    int sum = P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
                    if (sum == target) count++;
                }
    return count;
}` }
          ]
        }
    },
    mcq: { q: 'After fixing the top and bottom rows, what 1D problem remains?', options: ['Count subarrays with sum = target over the column sums between those rows', 'Longest consecutive sequence of columns', 'Two Sum on the first row', 'Distinct elements in every window'], answer: 0, explain: 'Collapsing rows top..bottom into one array of column sums turns every rectangle into a contiguous subarray of that array.' },
    hints: [
      `<p><b>Hint 1:</b> A rectangle = (pair of rows) × (contiguous range of columns).</p>`,
      `<p><b>Hint 2:</b> For each top row, extend bottom row by row, keeping col[c] = sum of matrix[top..bottom][c].</p>`,
      `<p><b>Hint 3:</b> On col[], run the topic-6 algorithm: prefix sums + tally {0: 1}, add cnt[pf − target]. Total O(R<sup>2</sup>·C); loop over the smaller dimension squared.</p>`
    ],
    tests: { sig: 'int[][] int -> int', fn: 'numSubmatrixSumTarget', cases: [
  [[[[0, 1, 0], [1, 1, 1], [0, 1, 0]], 0], 4],
  [[[[1, -1], [-1, 1]], 0], 5],
  [[[[904]], 0], 0],
  [[[[5]], 5], 1],
  [[[[0, 0], [0, 0]], 0], 9],
  [[[[1, 2, 3]], 3], 2],
  [[[[1], [2], [3]], 3], 2],
  [[[[1000, 1000], [1000, 1000]], 4000], 1],
  [[[[-1, -1], [-1, -1]], -2], 4]
] },
    solution: {
      approach: `<p><b>Row-pair compression + prefix-sum tally.</b> O(R<sup>2</sup>) row pairs; for each, the column-sum array is updated in O(C) and scanned with a counting map in O(C).</p>`,
      code: `class Solution {
    public int numSubmatrixSumTarget(int[][] matrix, int target) {
        int R = matrix.length, C = matrix[0].length, count = 0;
        for (int top = 0; top < R; top++) {
            int[] col = new int[C];                         // column sums of rows top..bottom
            for (int bottom = top; bottom < R; bottom++) {
                for (int c = 0; c < C; c++) col[c] += matrix[bottom][c];
                Map<Integer, Integer> cnt = new HashMap<>();
                cnt.put(0, 1);
                int pf = 0;
                for (int c = 0; c < C; c++) {               // 1D: count subarrays with sum = target
                    pf += col[c];
                    count += cnt.getOrDefault(pf - target, 0);
                    cnt.merge(pf, 1, Integer::sum);
                }
            }
        }
        return count;
    }
}`,
      alt: [{ lang: 'js', code: `function numSubmatrixSumTarget(matrix, target) {
  const R = matrix.length, C = matrix[0].length;
  let count = 0;
  for (let top = 0; top < R; top++) {
    const col = new Array(C).fill(0);     // column sums of rows top..bottom
    for (let bottom = top; bottom < R; bottom++) {
      for (let c = 0; c < C; c++) col[c] += matrix[bottom][c];
      const cnt = new Map([[0, 1]]);      // 1D: count subarrays with sum = target
      let pf = 0;
      for (const v of col) {
        pf += v;
        count += cnt.get(pf - target) || 0;
        cnt.set(pf, (cnt.get(pf) || 0) + 1);
      }
    }
  }
  return count;
}` }, { lang: 'cpp', code: `int numSubmatrixSumTarget(vector<vector<int>>& matrix, int target) {
    int R = matrix.size(), C = matrix[0].size(), count = 0;
    for (int top = 0; top < R; top++) {
        vector<int> col(C, 0);                  // column sums of rows top..bottom
        for (int bottom = top; bottom < R; bottom++) {
            for (int c = 0; c < C; c++) col[c] += matrix[bottom][c];
            unordered_map<int, int> cnt{{0, 1}}; // 1D: count subarrays with sum = target
            int pf = 0;
            for (int v : col) {
                pf += v;
                auto it = cnt.find(pf - target);
                if (it != cnt.end()) count += it->second;
                cnt[pf]++;
            }
        }
    }
    return count;
}` }, { lang: 'python', code: `from collections import defaultdict

def num_submatrix_sum_target(matrix, target):
    R, C, count = len(matrix), len(matrix[0]), 0
    for top in range(R):
        col = [0] * C
        for bottom in range(top, R):
            for c in range(C):
                col[c] += matrix[bottom][c]
            cnt, pf = defaultdict(int), 0
            cnt[0] = 1
            for v in col:
                pf += v
                count += cnt[pf - target]
                cnt[pf] += 1
    return count` }],
      complexity: `<p><b>Time:</b> O(R<sup>2</sup>·C) — 10<sup>6</sup> for 100×100. <b>Space:</b> O(C).</p>`,
      followUps: ['Max sum rectangle no larger than k (LeetCode 363): same compression, but needs a TreeSet (ceiling) — hashing cannot answer "≤".', 'Count submatrices with all ones (stack-based histogram).']
    }
  });

  practice.push({
    title: 'Substring with Concatenation of All Words',
    level: 'Hard', tags: ['sliding window', 'hashmap', 'strings'], companies: ['Amazon', 'Apple', 'Microsoft'],
    statement: `<p>Given a string s and an array <code>words</code> of strings that all have the <b>same length</b>, return all start indices of substrings of s that are a concatenation of <b>every word exactly once</b>, in any order, without gaps.</p>`,
    constraints: `1 ≤ |s| ≤ 10<sup>4</sup>, 1 ≤ words.length ≤ 5000, 1 ≤ words[i].length ≤ 30`,
    example: `<p>s = "barfoothefoobarman", words = ["foo","bar"] → ${H.c('g', '[0, 9]')} ("barfoo" at 0, "foobar" at 9).</p>
<p>s = "wordgoodgoodgoodbestword", words = ["word","good","best","word"] → ${H.c('r', '[]')} (needs "word" twice).</p>`,
    brute: {
      why: `<p>For every start i, cut the next W words of length L and compare their tally with the words' tally: O(|s| · W · L). With |s| = 10<sup>4</sup>, W = 5000, L = 30 that is far too slow. The waste: windows starting at i and i + L share all but one word.</p>`,
      code: {
          lang: 'java',
          code: `List<Integer> findSubstringBrute(String s, String[] words) {
    List<Integer> res = new ArrayList<>();
    int L = words[0].length(), W = words.length, total = L * W;
    Map<String, Integer> need = new HashMap<>();
    for (String w : words) need.merge(w, 1, Integer::sum);
    for (int i = 0; i + total <= s.length(); i++) {
        Map<String, Integer> seen = new HashMap<>();
        int j = 0;
        for (; j < W; j++) {
            String w = s.substring(i + j * L, i + (j + 1) * L);
            if (seen.merge(w, 1, Integer::sum) > need.getOrDefault(w, 0)) break;  // too many / unknown word
        }
        if (j == W) res.add(i);
    }
    return res;
}`,
          alt: [
            { lang: 'python', code: `def find_substring(s, words):
    res = []
    L, W = len(words[0]), len(words)
    total = L * W
    need = {}
    for w in words:
        need[w] = need.get(w, 0) + 1
    for i in range(len(s) - total + 1):
        seen = {}
        j = 0
        while j < W:
            w = s[i + j * L : i + (j + 1) * L]
            seen[w] = seen.get(w, 0) + 1
            if seen[w] > need.get(w, 0):
                break                  # too many / unknown word
            j += 1
        if j == W:
            res.append(i)
    return res` },
            { lang: 'js', code: `function findSubstring(s, words) {
  const res = [];
  const L = words[0].length, W = words.length, total = L * W;
  const need = new Map();
  for (const w of words) need.set(w, (need.get(w) || 0) + 1);
  for (let i = 0; i + total <= s.length; i++) {
    const seen = new Map();
    let j = 0;
    for (; j < W; j++) {
      const w = s.slice(i + j * L, i + (j + 1) * L);
      seen.set(w, (seen.get(w) || 0) + 1);
      if (seen.get(w) > (need.get(w) || 0)) break;   // too many / unknown word
    }
    if (j === W) res.push(i);
  }
  return res;
}` },
            { lang: 'cpp', code: `vector<int> findSubstring(string s, vector<string>& words) {
    vector<int> res;
    int L = words[0].size(), W = words.size(), total = L * W;
    unordered_map<string, int> need;
    for (auto& w : words) need[w]++;
    for (int i = 0; i + total <= (int)s.size(); i++) {
        unordered_map<string, int> seen;
        int j = 0;
        for (; j < W; j++) {
            string w = s.substr(i + j * L, L);
            if (++seen[w] > need[w]) break;          // too many / unknown word
        }
        if (j == W) res.push_back(i);
    }
    return res;
}` }
          ]
        }
    },
    mcq: { q: 'Why run the sliding window L separate times (offsets 0..L−1)?', options: ['Words are aligned to multiples of L from the start; each offset gives one word grid that can be slid word by word', 'To handle uppercase letters', 'Because words may have different lengths', 'To sort the words'], answer: 0, explain: 'From offset o, s splits into chunks o, o+L, o+2L… A valid concatenation lies on exactly one of these L grids.' },
    hints: [
      `<p><b>Hint 1:</b> All words have length L, so split s into L-length chunks — but the split can start at any of L offsets.</p>`,
      `<p><b>Hint 2:</b> For each offset, slide a window over chunks with a count map (like minimum window, but the "characters" are words).</p>`,
      `<p><b>Hint 3:</b> Unknown chunk → reset the window. A chunk whose count exceeds its need → shrink from the left until it fits. Window holds W words → record left, then drop the leftmost word.</p>`
    ],
    tests: { sig: 'string string[] -> list<int>', fn: 'findSubstring', cmp: 'set', cases: [
  [['barfoothefoobarman', ['foo', 'bar']], [0, 9]],
  [['wordgoodgoodgoodbestword', ['word', 'good', 'best', 'word']], []],
  [['barfoofoobarthefoobarman', ['bar', 'foo', 'the']], [6, 9, 12]],
  [['a', ['a']], [0]],
  [['a', ['b']], []],
  [['aaaa', ['aa', 'aa']], [0]],
  [['ab', ['abc']], []],
  [['aaa', ['a', 'a']], [0, 1]],
  [['lingmindraboofooowingdingbarrwingmonkeypoundcake', ['fooo', 'barr', 'wing', 'ding', 'wing']], [13]]
] },
    solution: {
      approach: `<p><b>L interleaved word-level sliding windows.</b> Each offset processes every chunk once as it enters and at most once as it leaves, with O(1) map work per chunk plus O(L) to cut the substring.</p>`,
      code: `class Solution {
    public List<Integer> findSubstring(String s, String[] words) {
        List<Integer> res = new ArrayList<>();
        int L = words[0].length(), W = words.length;
        if (s.length() < L * W) return res;
        Map<String, Integer> need = new HashMap<>();
        for (String w : words) need.merge(w, 1, Integer::sum);

        for (int off = 0; off < L; off++) {
            Map<String, Integer> win = new HashMap<>();
            int left = off, used = 0;                       // used = words currently in the window
            for (int right = off; right + L <= s.length(); right += L) {
                String w = s.substring(right, right + L);
                if (!need.containsKey(w)) {                 // not a word: nothing can span this chunk
                    win.clear(); used = 0; left = right + L;
                    continue;
                }
                win.merge(w, 1, Integer::sum);
                used++;
                while (win.get(w) > need.get(w)) {          // too many copies of w: shrink
                    win.merge(s.substring(left, left + L), -1, Integer::sum);
                    used--; left += L;
                }
                if (used == W) {                            // exact concatenation found
                    res.add(left);
                    win.merge(s.substring(left, left + L), -1, Integer::sum);
                    used--; left += L;                      // slide by one word
                }
            }
        }
        return res;
    }
}`,
      alt: [{ lang: 'js', code: `function findSubstring(s, words) {
  const L = words[0].length, W = words.length, res = [];
  if (s.length < L * W) return res;
  const need = new Map();
  for (const w of words) need.set(w, (need.get(w) || 0) + 1);
  for (let off = 0; off < L; off++) {
    const win = new Map();
    let left = off, used = 0;                       // used = words in the window
    const drop = () => {                            // remove the leftmost word
      const x = s.slice(left, left + L);
      win.set(x, win.get(x) - 1);
      used--;
      left += L;
    };
    for (let right = off; right + L <= s.length; right += L) {
      const w = s.slice(right, right + L);
      if (!need.has(w)) { win.clear(); used = 0; left = right + L; continue; }
      win.set(w, (win.get(w) || 0) + 1);
      used++;
      while (win.get(w) > need.get(w)) drop();      // too many copies of w
      if (used === W) { res.push(left); drop(); }   // exact match: slide by one word
    }
  }
  return res;
}` }, { lang: 'cpp', code: `vector<int> findSubstring(string s, vector<string>& words) {
    vector<int> res;
    int L = words[0].size(), W = words.size(), n = s.size();
    if (n < L * W) return res;
    unordered_map<string, int> need;
    for (auto& w : words) need[w]++;
    for (int off = 0; off < L; off++) {
        unordered_map<string, int> win;
        int left = off, used = 0;                       // used = words in the window
        auto drop = [&]() { win[s.substr(left, L)]--; used--; left += L; };
        for (int right = off; right + L <= n; right += L) {
            string w = s.substr(right, L);
            auto it = need.find(w);
            if (it == need.end()) { win.clear(); used = 0; left = right + L; continue; }
            win[w]++;
            used++;
            while (win[w] > it->second) drop();         // too many copies of w
            if (used == W) { res.push_back(left); drop(); }   // exact match: slide by one word
        }
    }
    return res;
}` }, { lang: 'python', code: `from collections import Counter, defaultdict

def find_substring(s, words):
    L, W = len(words[0]), len(words)
    need, res = Counter(words), []
    for off in range(L):
        win, left, used = defaultdict(int), off, 0
        for right in range(off, len(s) - L + 1, L):
            w = s[right:right + L]
            if w not in need:
                win.clear(); used = 0; left = right + L
                continue
            win[w] += 1; used += 1
            while win[w] > need[w]:
                win[s[left:left + L]] -= 1; used -= 1; left += L
            if used == W:
                res.append(left)
                win[s[left:left + L]] -= 1; used -= 1; left += L
    return res` }],
      complexity: `<p><b>Time:</b> O(L · (|s| / L) · L) = O(|s| · L) for substring cutting. <b>Space:</b> O(W · L) for the maps.</p>`,
      followUps: ['Words of different lengths (much harder: backtracking / trie).', 'Use rolling hashes to avoid creating substrings (DSA 9).']
    }
  });

  practice.push({
    title: 'Max Points on a Line',
    level: 'Hard', tags: ['hashmap', 'geometry', 'gcd'], companies: ['LinkedIn', 'Apple', 'Google', 'Twitter'],
    statement: `<p>Given an array of <b>distinct</b> points on the plane, return the maximum number of points that lie on the same straight line.</p>`,
    constraints: `1 ≤ N ≤ 300, −10<sup>4</sup> ≤ x, y ≤ 10<sup>4</sup>, all points unique`,
    example: `<p>[[1,1],[2,2],[3,3]] → ${H.c('g', '3')}. [[1,1],[3,2],[5,3],[4,1],[2,3],[1,4]] → ${H.c('g', '4')} ((3,2), (4,1), (2,3), (1,4) lie on x + y = 5).</p>`,
    brute: {
      why: `<p>For every pair of points (defining a line), count all points on it with a cross-product test: <b>O(N<sup>3</sup>)</b> = 2.7·10<sup>7</sup> — fine for N = 300, too slow for N = 3000. The waste: for a fixed anchor point, the lines through it are identified by <b>slope</b>; a map can group all other points by slope in one pass.</p>`,
      code: {
          lang: 'java',
          code: `int maxPointsBrute(int[][] p) {
    int n = p.length;
    if (n <= 2) return n;
    int best = 2;
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++) {
            int cnt = 0;
            for (int k = 0; k < n; k++) {
                long cross = (long) (p[j][0] - p[i][0]) * (p[k][1] - p[i][1])
                           - (long) (p[j][1] - p[i][1]) * (p[k][0] - p[i][0]);
                if (cross == 0) cnt++;                 // k is on line (i, j)
            }
            best = Math.max(best, cnt);
        }
    return best;
}`,
          alt: [
            { lang: 'python', code: `def max_points(points):
    n = len(points)
    if n <= 2:
        return n
    best = 2
    for i in range(n):
        for j in range(i + 1, n):
            cnt = 0
            for k in range(n):
                cross = ((points[j][0] - points[i][0]) * (points[k][1] - points[i][1])
                         - (points[j][1] - points[i][1]) * (points[k][0] - points[i][0]))
                if cross == 0:
                    cnt += 1                 # k is on line (i, j)
            best = max(best, cnt)
    return best` },
            { lang: 'js', code: `function maxPoints(points) {
  const n = points.length;
  if (n <= 2) return n;
  let best = 2;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      let cnt = 0;
      for (let k = 0; k < n; k++) {
        const cross = (points[j][0] - points[i][0]) * (points[k][1] - points[i][1])
                    - (points[j][1] - points[i][1]) * (points[k][0] - points[i][0]);
        if (cross === 0) cnt++;                 // k is on line (i, j)
      }
      best = Math.max(best, cnt);
    }
  return best;
}` },
            { lang: 'cpp', code: `int maxPoints(vector<vector<int>>& points) {
    int n = points.size();
    if (n <= 2) return n;
    int best = 2;
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++) {
            int cnt = 0;
            for (int k = 0; k < n; k++) {
                long long cross = (long long)(points[j][0] - points[i][0]) * (points[k][1] - points[i][1])
                                - (long long)(points[j][1] - points[i][1]) * (points[k][0] - points[i][0]);
                if (cross == 0) cnt++;                 // k is on line (i, j)
            }
            best = max(best, cnt);
        }
    return best;
}` }
          ]
        }
    },
    mcq: { q: 'Why store slopes as a reduced (dy, dx) pair instead of the double dy / dx?', options: ['Floating-point rounding can make equal slopes differ (or different slopes collide), and vertical lines divide by zero', 'Floating-point numbers can never be hash-map keys', 'Pairs are faster to compute than division', 'To sort the slopes'], answer: 0, explain: 'Reduce by gcd and normalize the sign; then equal slopes give identical integer keys. Also beware −0.0 vs 0.0 with doubles.' },
    hints: [
      `<p><b>Hint 1:</b> Fix an anchor point; every other point defines a line through the anchor, identified by its slope.</p>`,
      `<p><b>Hint 2:</b> Group by slope with a HashMap; the biggest group + 1 (the anchor) is the best line through that anchor.</p>`,
      `<p><b>Hint 3:</b> Key = (dy/g, dx/g) with g = gcd(|dy|, |dx|), sign normalized so dx &gt; 0 (or dx = 0 and dy &gt; 0). Pack into one long. Answer = max over anchors.</p>`
    ],
    tests: { sig: 'int[][] -> int', fn: 'maxPoints', cases: [
  [[[[1, 1], [2, 2], [3, 3]]], 3],
  [[[[1, 1], [3, 2], [5, 3], [4, 1], [2, 3], [1, 4]]], 4],
  [[[[0, 0]]], 1],
  [[[[0, 0], [5, 7]]], 2],
  [[[[0, 0], [0, 1], [0, 2], [1, 5]]], 3],
  [[[[0, 0], [1, 0], [2, 0], [3, 1]]], 3],
  [[[[-10000, -10000], [10000, 10000], [0, 0], [1, 2]]], 3],
  [[[[1, 2], [2, 4], [3, 1], [-1, -2], [5, 0]]], 3]
] },
    solution: {
      approach: `<p><b>Anchor + slope tally.</b> For each anchor i, normalize the direction to every later point j and count equal directions. Exact integer keys avoid floating-point errors; O(N<sup>2</sup>) pairs overall.</p>`,
      code: `class Solution {
    public int maxPoints(int[][] points) {
        int n = points.length;
        if (n <= 2) return n;
        int best = 0;
        for (int i = 0; i < n; i++) {
            Map<Long, Integer> slopes = new HashMap<>();   // normalized direction -> count
            int local = 0;
            for (int j = i + 1; j < n; j++) {
                int dx = points[j][0] - points[i][0];
                int dy = points[j][1] - points[i][1];
                int g = gcd(Math.abs(dx), Math.abs(dy));  // points are distinct, so g > 0
                dx /= g; dy /= g;
                if (dx < 0 || (dx == 0 && dy < 0)) { dx = -dx; dy = -dy; }  // one sign per direction
                long key = ((long) dx << 32) | (dy & 0xffffffffL);         // pack (dx, dy) into a long
                local = Math.max(local, slopes.merge(key, 1, Integer::sum));
            }
            best = Math.max(best, local + 1);              // + the anchor itself
        }
        return best;
    }

    private int gcd(int a, int b) { return b == 0 ? a : gcd(b, a % b); }
}`,
      alt: [{ lang: 'js', code: `function maxPoints(points) {
  const n = points.length;
  if (n <= 2) return n;
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  let best = 0;
  for (let i = 0; i < n; i++) {
    const slopes = new Map();             // "dx,dy" -> count
    let local = 0;
    for (let j = i + 1; j < n; j++) {
      let dx = points[j][0] - points[i][0], dy = points[j][1] - points[i][1];
      const g = gcd(Math.abs(dx), Math.abs(dy));   // distinct points, so g > 0
      dx /= g; dy /= g;
      if (dx < 0 || (dx === 0 && dy < 0)) { dx = -dx; dy = -dy; }   // one sign per direction
      const key = dx + ',' + dy;
      const c = (slopes.get(key) || 0) + 1;
      slopes.set(key, c);
      local = Math.max(local, c);
    }
    best = Math.max(best, local + 1);     // + the anchor itself
  }
  return best;
}` }, { lang: 'cpp', code: `int maxPoints(vector<vector<int>>& points) {
    int n = points.size();
    if (n <= 2) return n;
    int best = 0;
    for (int i = 0; i < n; i++) {
        map<pair<int, int>, int> slopes;   // normalised direction -> count
        int local = 0;
        for (int j = i + 1; j < n; j++) {
            int dx = points[j][0] - points[i][0], dy = points[j][1] - points[i][1];
            int g = gcd(abs(dx), abs(dy));  // distinct points, so g > 0
            dx /= g; dy /= g;
            if (dx < 0 || (dx == 0 && dy < 0)) { dx = -dx; dy = -dy; }   // one sign per direction
            local = max(local, ++slopes[{dx, dy}]);
        }
        best = max(best, local + 1);        // + the anchor itself
    }
    return best;
}` }, { lang: 'python', code: `from math import gcd
from collections import defaultdict

def max_points(points):
    n = len(points)
    if n <= 2:
        return n
    best = 0
    for i in range(n):
        slopes = defaultdict(int)
        for j in range(i + 1, n):
            dx = points[j][0] - points[i][0]
            dy = points[j][1] - points[i][1]
            g = gcd(dx, dy)
            dx, dy = dx // g, dy // g
            if dx < 0 or (dx == 0 and dy < 0):
                dx, dy = -dx, -dy
            slopes[(dx, dy)] += 1
        best = max(best, max(slopes.values(), default=0) + 1)
    return best` }],
      complexity: `<p><b>Time:</b> O(N<sup>2</sup> · log V) (gcd). <b>Space:</b> O(N).</p>`,
      followUps: ['Duplicate points allowed: count duplicates of the anchor separately and add them to every line.', 'Return the line itself (anchor + direction).']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({ q: 'A Java HashMap has capacity 16. Into which bucket does key <code>Integer 37</code> go?', options: ['5', '37', '2', '7'], answer: 0, explain: 'hash(37) = 37 ^ (37 &gt;&gt;&gt; 16) = 37; 37 &amp; 15 = 0b100101 &amp; 0b1111 = 0b0101 = 5.' });
  quiz.push({ q: 'You override <code>equals()</code> in a key class but not <code>hashCode()</code>. What usually happens with <code>set.contains(new Key(same fields))</code>?', options: ['Returns false: the two equal objects have different identity hashCodes and land in different buckets', 'Returns true: equals() is all that matters', 'Throws an exception', 'It does not compile'], answer: 0, explain: 'The lookup computes a different bucket, so equals() is never even called on the stored object. Override both (or use a record).' });
  quiz.push({ q: 'With default settings (capacity 16, load factor 0.75), the first resize happens when inserting the…', options: ['13th distinct key', '16th distinct key', '12th distinct key', '17th distinct key'], answer: 0, explain: 'Threshold = 16 × 0.75 = 12. Java resizes when size becomes greater than 12, i.e. after inserting the 13th key.' });
  quiz.push({ q: 'When does a Java 8+ HashMap bucket turn into a red-black tree?', options: ['When its chain grows past 8 nodes AND the table has at least 64 buckets (otherwise it resizes)', 'Whenever two keys collide', 'When the map holds more than 64 keys', 'Never — only TreeMap uses trees'], answer: 0, explain: 'TREEIFY_THRESHOLD = 8 and MIN_TREEIFY_CAPACITY = 64. Small tables are resized instead, which usually spreads the chain out.' });
  quiz.push({ q: '"Aa" and "BB" have the same <code>hashCode()</code> (2112). Putting both in a HashSet results in…', options: ['Both stored in the same bucket; equals() tells them apart; size() = 2', 'The second one overwrites the first', 'An exception: duplicate hash', 'Only one stored, size() = 1'], answer: 0, explain: 'Equal hashCodes only mean the same bucket. Equality is decided by equals(), so both strings are kept.' });
  quiz.push({ q: 'Why do prefix-sum + hashing solutions use a 64-bit integer (<code>long</code> in Java, <code>long long</code> in C++) for the running sum when N ≤ 10<sup>5</sup> and |a[i]| ≤ 10<sup>9</sup>?', options: ['The running sum can reach 10<sup>14</sup>, far beyond int\'s ~2.1·10<sup>9</sup>', 'A hash map does not accept 32-bit integer keys', '64-bit lookups are faster', 'To allow negative numbers'], answer: 0, explain: '10<sup>5</sup> × 10<sup>9</sup> = 10<sup>14</sup>. An int overflows silently and produces wrong matches.' });
  quiz.push({ q: 'Count subarrays with sum K: what must the map contain before the loop starts?', options: ['{0: 1}', '{0: −1}', '{} (empty)', '{K: 1}'], answer: 0, explain: 'The empty prefix (sum 0) has occurred once, so subarrays starting at index 0 are counted. {0: −1} is the seed for "longest" problems that store indices.' });
  quiz.push({ q: 'Longest subarray with sum K: a balance that is already in the map shows up again. You should…', options: ['Keep the existing (earliest) index — never overwrite', 'Overwrite it with the current index', 'Delete it', 'Store both indices in a list'], answer: 0, explain: 'The earliest index gives the longest future subarray. Overwriting would make answers shorter (that is the "shortest" variant).' });
  quiz.push({ q: 'Why can\'t you solve "count subarrays with sum K" using a sliding window when the array contains negatives?', options: ['Adding an element can decrease the sum, so "shrink when the sum is too big" is no longer correct (no monotonicity)', 'Sliding windows cannot count', 'Negative numbers cannot be stored in a hash map', 'It works fine with negatives'], answer: 0, explain: 'Sliding window needs monotone sums (all non-negative values). Prefix sum + hashing works for any integers.' });
  quiz.push({ q: 'Distinct elements in every window of size K: what goes wrong if you use a plain set (<code>HashSet</code> / <code>set</code> / <code>Set</code> / <code>unordered_set</code>) and remove the outgoing element?', options: ['If another copy of that value is still inside the window, the set wrongly forgets it', 'Nothing — it works', 'The set grows without bound', 'It becomes O(N<sup>2</sup>)'], answer: 0, explain: 'Window [1, 2, 1] sliding out the first 1 would remove 1 although the second 1 remains. Use counts and delete at 0.' });
  quiz.push({ q: 'In "longest substring without repeating characters" with a last-index map, why <code>left = max(left, last[c] + 1)</code>?', options: ['A stale last index (already left of the window) must not move left backwards — e.g. "abba"', 'To avoid integer overflow', 'Because last[c] can be negative', 'It is only needed for uppercase letters'], answer: 0, explain: 'In "abba", at the final a, last[a] = 0 but left is already 2. Without max, left would jump back to 1 and re-admit the duplicate b.' });
  quiz.push({ q: 'Longest consecutive sequence: why iterate over the set (<code>HashSet</code> / <code>set</code> / <code>Set</code> / <code>unordered_set</code>) rather than the original array?', options: ['Duplicates of a chain start in the array would re-walk the same chain many times, breaking O(N)', 'Sets iterate in sorted order', 'Arrays cannot be iterated', 'It makes no difference at all'], answer: 0, explain: 'With the set, each distinct chain start walks its chain exactly once, so total work is O(N).' });
  quiz.push({ q: 'Two Sum: you check for the complement <i>before</i> inserting the current element because…', options: ['Otherwise an element can pair with itself (e.g. target 6, x = 3 at one index)', 'Inserting first is slower', 'Inserting a duplicate value into a hash map fails', 'The order never matters'], answer: 0, explain: 'Check-then-insert keeps the invariant "map contains only earlier indices", so i ≠ j automatically and real duplicates like [3, 3] still work.' });
  quiz.push({ q: 'Which structure gives sorted iteration and floor/ceiling queries, at O(log N) per operation?', options: ['A balanced-tree ordered map (Java <code>TreeMap</code>, C++ <code>std::map</code>)', 'A hash map (<code>HashMap</code> / <code>dict</code> / <code>Map</code> / <code>unordered_map</code>)', 'An insertion-ordered hash map (Java <code>LinkedHashMap</code>, a Python <code>dict</code>)', 'A hash set'], answer: 0, explain: 'An ordered map such as Java TreeMap or C++ std::map is a balanced tree ordered by key (Python and JavaScript have no built-in one). A hash map has no key order; an insertion-ordered map only remembers when keys arrived.' });
  quiz.push({ q: 'Minimum window substring keeps a counter <code>missing</code>. When you remove s[left] and need[s[left]] becomes 1, you…', options: ['Increase missing — the window no longer covers t — and stop shrinking', 'Decrease missing', 'Record a new best window', 'Reset the whole map'], answer: 0, explain: 'A positive need means a required character is now missing. The window is invalid, so you go back to expanding right.' });
  quiz.push({ q: 'Subarray sums divisible by 5: in Java, JS or C++, prefix sum −7 and prefix sum 3 should…', options: ['Share remainder 3 after normalizing ((−7 % 5) + 5) % 5', 'Have different remainders (−2 and 3)', 'Both be ignored', 'Cause an exception'], answer: 0, explain: '−7 − 3 = −10 is a multiple of 5, so they must match. In Java, JS and C++ −7 % 5 is −2 (Python gives 3), which must be normalized.' });

  /* =====================================================================
     INTERVIEW Q&A
     ===================================================================== */
  interview.push({
    q: 'How does a Java HashMap find the value for a key? Walk me through <code>get(key)</code>.', level: 'B',
    a: `<p>1) Compute <code>key.hashCode()</code>. 2) Spread it: <code>h ^ (h &gt;&gt;&gt; 16)</code>, so high bits influence the low bits. 3) Bucket index = <code>hash &amp; (capacity − 1)</code> — capacity is a power of two, so this equals <code>hash % capacity</code> but is a single AND instruction. 4) In that bucket, walk the chain (a linked list, or a red-black tree if the bucket was treeified) comparing the stored hash first and then <code>equals()</code>. 5) Return the value on a match, or <code>null</code>. Average cost O(1) because the load factor keeps chains very short; worst case O(N) for a list bucket or O(log N) for a tree bucket.</p>`,
    followUps: ['Why compare the stored hash before calling equals()?', 'What happens for a null key?', 'Why is capacity always a power of two?']
  });
  interview.push({
    q: 'What is the contract between <code>equals()</code> and <code>hashCode()</code>, and what breaks if you violate it?', level: 'B',
    a: `<p>If <code>a.equals(b)</code> is true, then <code>a.hashCode() == b.hashCode()</code> must be true. The reverse is not required — equal hashes can belong to unequal objects (collisions). hashCode must also be consistent while the fields used by equals do not change. If you override equals without hashCode, two "equal" objects usually get different identity hashes, land in different buckets, and <code>contains</code>/<code>get</code> silently fail; you can also end up with "duplicates" in a HashSet. Fix: override both using the same fields (<code>Objects.hash(...)</code>), or use a <b>record</b>, and keep key fields immutable.</p>`,
    followUps: ['Why are mutable keys dangerous even with a correct hashCode?', 'Is it legal for hashCode() to always return 42? What is the cost?']
  });
  interview.push({
    q: 'A hash map (<code>HashMap</code> / <code>dict</code> / <code>Map</code> / <code>unordered_map</code>) is "O(1)". When is it not? Give average, amortized and worst-case costs.', level: 'I',
    a: `<p><b>Average:</b> O(1) for get/put/remove, assuming the hash spreads keys evenly; at load factor ≤ 0.75 the expected chain length is below 1. <b>Amortized:</b> put is O(1) amortized because a resize (O(N)) happens only after the number of keys doubles, so its cost is spread over many cheap inserts. <b>Worst case:</b> if all keys collide (bad hashCode or an attack), one bucket holds everything: O(N) per operation with a list, O(log N) after Java 8 treeifies (keys should be Comparable to get the full benefit). Iteration is O(N + capacity), which matters after many removals because the table never shrinks.</p>`,
    followUps: ['How would an attacker force collisions on a web server?', 'Why does iterating a huge, mostly-empty map stay slow?']
  });
  interview.push({
    q: 'Explain load factor and rehashing. Why 0.75? What happens to keys during a resize?', level: 'I',
    a: `<p>Load factor = size / capacity at which the table grows. 0.75 is a trade-off: lower wastes memory with empty buckets, higher makes chains longer and lookups slower (with chaining, expected probes grow roughly like 1 + α/2). When <code>size &gt; capacity × 0.75</code>, Java allocates a table twice as large and moves every node. Because capacity doubles, the new index of a key depends on just one more bit of its hash: each node either <b>stays at index i</b> or <b>moves to i + oldCapacity</b>. Java 8 splits each chain into a "lo" and "hi" list preserving order, so no hash recomputation is needed. If you know the size up front, pre-size with <code>HashMap.newHashMap(n)</code> (Java 19+) to avoid repeated resizes.</p>`,
    followUps: ['What does new HashMap&lt;&gt;(100) actually mean?', 'Does HashMap ever shrink?']
  });
  interview.push({
    q: 'Chaining vs open addressing — compare them and name real implementations of each.', level: 'A',
    a: `<p><b>Chaining</b> stores colliding entries in a per-bucket list/tree (Java HashMap, C++ std::unordered_map in libstdc++). Pros: simple deletes, graceful under high load, supports treeify. Cons: pointer chasing, extra node objects, poor cache locality. <b>Open addressing</b> stores everything in the array itself and probes other slots on collision (linear, quadratic or a perturbation sequence): Python dict/set, Google SwissTable (Abseil flat_hash_map), Rust's HashMap (hashbrown). Pros: compact and cache-friendly, SIMD can scan metadata bytes. Cons: must keep load lower, deletions need tombstones, clustering under bad hashes. Most modern high-performance tables use open addressing.</p>`,
    followUps: ['How does deletion work with linear probing?', 'Why does Python keep dict load below about 2/3?']
  });
  interview.push({
    q: 'You need to count subarrays with sum K in an array with negatives. Walk me through your approach and its correctness.', level: 'I',
    a: `<p>Sliding window fails because negatives break monotonicity. Use prefix sums: sum(l..r) = P[r] − P[l−1]. For each end r, the number of valid starts equals the number of earlier prefixes equal to P[r] − K. Keep a hash map prefix → count, seeded with {0: 1} for the empty prefix. In one pass: add x to P, add <code>cnt[P − K]</code> to the answer, then increment <code>cnt[P]</code> — querying before inserting ensures we never count an empty subarray (important when K = 0). Every subarray is counted exactly once, at its right end. O(N) time, O(N) space; use a 64-bit integer (Java <code>long</code>, C++ <code>long long</code>) for the prefix and the answer when values or N are large; Python integers never overflow.</p>`,
    followUps: ['How does it change for "divisible by K"?', 'Extend it to count submatrices with sum K.', 'What changes if you want the longest such subarray?']
  });
  interview.push({
    q: 'Why does the zero-sum-subarray check seed the set with 0? Why do "longest" problems seed with {0: −1}?', level: 'B',
    a: `<p>A subarray starting at index 0 has sum P[r] − P[−1], where P[−1] = 0 is the balance before any element. Without that seed, a prefix that itself sums to 0 (or to K) has nothing to match against, and the answer starting at index 0 is missed. In "longest" problems we store indices, so the empty prefix is recorded at index −1: a match at index i then yields length i − (−1) = i + 1, exactly the length of arr[0..i]. In counting problems the seed is a count of 1 because the empty prefix occurred once.</p>`,
    followUps: ['Give an input that fails without the seed.', 'What is the seed for the shortest-subarray variant?']
  });
  interview.push({
    q: 'Design a data structure with insert, delete and getRandom, all in average O(1).', level: 'A',
    a: `<p>Combine an <b>ArrayList</b> of values (for O(1) random access) with a <b>HashMap value → index in the list</b>. Insert: if absent, append to the list and record its index. getRandom: pick a random index in the list. Delete: look up the index of the value, move the <b>last</b> element into that slot (update its index in the map), remove the last element and the map entry — no shifting, so O(1). With duplicates allowed (LeetCode 381) the map becomes value → set of indices. This is a classic "hash map + array" pairing; LRU cache is the "hash map + doubly linked list" pairing.</p>`,
    followUps: ['How do you support duplicates?', 'How would you make getRandom weighted by frequency?']
  });
  interview.push({
    q: 'Your service uses a HashMap&lt;String, User&gt; shared by many threads and occasionally hangs or loses entries. What is going on and how do you fix it?', level: 'A',
    a: `<p>HashMap is not thread-safe. Concurrent puts can lose updates, corrupt the table during a resize, or (in Java 7 with head insertion) create a cycle in a bucket that makes get() loop forever. Fixes: use <b>ConcurrentHashMap</b> (lock-free reads, CAS on empty bins, per-bin locking on writes, cooperative resizing; no null keys or values), and use its atomic methods — <code>computeIfAbsent</code>, <code>merge</code> — instead of check-then-act sequences like <code>if (!map.containsKey(k)) map.put(k, v)</code>, which race even on a concurrent map. <code>Collections.synchronizedMap</code> works but serializes all access.</p>`,
    followUps: ['Why does ConcurrentHashMap forbid null values?', 'How would you count events per key from many threads? (merge or LongAdder)']
  });
  interview.push({
    q: 'Longest consecutive sequence in O(N): explain why the nested loop is not O(N²).', level: 'I',
    a: `<p>Put all numbers in a hash set (<code>HashSet</code> / <code>set</code> / <code>Set</code> / <code>unordered_set</code>). For each x in the set, only start counting if x − 1 is absent (x is the front of a chain); then walk x + 1, x + 2, … while present. The outer loop does O(1) work per distinct value. The inner while loop only runs from chain fronts, and the chains are disjoint, so across the whole run the inner loop advances at most once per distinct value. Total inner steps ≤ N, total work O(N). Iterating the set (not the raw array) matters: duplicates of a chain front in the array would otherwise rewalk the same chain repeatedly.</p>`,
    followUps: ['Solve it for a stream of numbers.', 'When would sorting be the better engineering choice?']
  });
  interview.push({
    q: 'When would you NOT use a hash map (<code>HashMap</code> / <code>dict</code> / <code>Map</code> / <code>unordered_map</code>), even though it would work?', level: 'I',
    a: `<p>(1) Keys are small dense integers or characters → a plain array of 26 or 128 counters, or a boolean array of size N, is faster, smaller and has an O(1) <i>worst</i> case. (2) You need order, ranges, floor/ceiling or "≤ K" queries → an ordered map (Java <code>TreeMap</code>, C++ <code>std::map</code>) or sorting + binary search; hashing only answers exact matches. (3) Memory is tight with millions of primitives → in Java, boxing costs ~60–80 bytes per entry (a Python dict entry is similar), so use primitive collections, flat arrays or sorting. (4) Input is sorted already → two pointers with O(1) space. (5) Adversarial input with a weak hash → sorting gives a guaranteed O(N log N). (6) Approximate answers are acceptable at huge scale → Bloom filters, HyperLogLog, Count-Min Sketch.</p>`,
    followUps: ['How much memory does HashMap&lt;Integer,Integer&gt; use per entry?', 'What is a Bloom filter\'s false-positive trade-off?']
  });
  interview.push({
    q: 'Minimum window substring: explain the algorithm and prove it runs in O(|s| + |t|).', level: 'A',
    a: `<p>Build need = tally of t and missing = |t|. Move right across s: if need[c] &gt; 0 the character fulfils a requirement, so missing−−; then need[c]−− (surplus goes negative). Whenever missing == 0 the window covers t: record it if shorter, then remove s[left] (need[d]++; if it becomes positive, missing++) and advance left; repeat while still valid. Correctness: for every right end we shrink to the smallest valid window ending there, and the optimum ends at some right. Complexity: right moves |s| times, left moves at most |s| times in total, and each move is O(1) → O(|s| + |t|), with O(Σ) space.</p>`,
    followUps: ['How do you handle duplicate characters in t?', 'How would you adapt it to words instead of characters?']
  });
  interview.push({
    q: 'Group anagrams: which key do you use and what is the complexity? Any pitfalls?', level: 'B',
    a: `<p>Key = the word's letters sorted ("tea" → "aet"), giving O(N · K log K) for N words of max length K. Faster: a 26-count signature such as "1#0#0#…#1", O(N · K). Pitfalls: building a count key without separators ("1" + "11" vs "11" + "1" collide), using the sum of character codes or a product of primes (sums collide; products overflow), forgetting empty strings, and Unicode text where a 26-slot counter array does not apply. Collect the groups in one pass with a map of lists: Java <code>computeIfAbsent(key, k -&gt; new ArrayList&lt;&gt;())</code>, Python <code>defaultdict(list)</code>, JavaScript get-or-create on a <code>Map</code>, C++ <code>m[key].push_back(w)</code>.</p>`,
    followUps: ['Group strings that are shifts of each other.', 'What if each word is 10<sup>5</sup> characters long but there are only 10 words?']
  });
  interview.push({
    q: 'What makes a good hash function for a custom key? How would you hash a Point(x, y) key (Java <code>hashCode</code>, Python <code>__hash__</code>, C++ hash functor)?', level: 'I',
    a: `<p>A good hash is deterministic, consistent with equals, cheap, and spreads typical keys across all bits (small changes in input should change many output bits). For Point(x, y): <code>31 * x + y</code> or <code>Objects.hash(x, y)</code> (which does the same with boxing), or simply declare <code>record Point(int x, int y)</code>. In Python use <code>hash((x, y))</code> or a frozen dataclass, in C++ write a hash functor that combines both fields, and in JavaScript build a string key such as <code>x + ',' + y</code>. Avoid <code>x + y</code> or <code>x ^ y</code> — (1, 2) and (2, 1) collide, and x ^ y is 0 for every diagonal point. For competitive programming or untrusted input, mix bits with a randomized function (e.g. splitmix64 with a random seed) to resist anti-hash tests. Java additionally spreads hashes internally, but it cannot fix a hash that maps many keys to the same int.</p>`,
    followUps: ['Why multiply by 31?', 'How would you pack two ints into one long key instead?']
  });
  interview.push({
    q: 'Design "unique visitors in the last 5 minutes" for a site with 50M users. Start from the hashing solution.', level: 'E',
    a: `<p>Exact baseline: keep, per minute bucket, a set of user IDs, plus a sliding window map userId → count across the last 5 buckets (add on enter, decrement and delete at 0 on expiry); answer = map size. That is the "distinct elements in every window" pattern, O(1) per event. At 50M users the exact map costs gigabytes and cannot be sharded and merged cheaply. Production approach: one <b>HyperLogLog</b> sketch per minute (≈12 KB, ~0.81% error), keep the last 5 and merge them for the answer (HLL merges by taking register maxima), e.g. Redis <code>PFADD</code>/<code>PFMERGE</code>/<code>PFCOUNT</code>. Shard events by time, not by user, and expire old sketches with TTLs.</p>`,
    followUps: ['Why can HyperLogLog sketches be merged but exact counts cannot simply be added?', 'How do you get exact numbers for billing at the end of the day?']
  });


  registerModule({
    id: 'dsa08',
    title: 'Hashing Masterclass (HashSet & HashMap)',
    intro: `<p>Hashing is the single most useful trick in coding interviews. A <b>HashSet</b> answers "have I seen this before?" and a <b>HashMap</b> answers "how many / where / which partner?" — both in <b>O(1) time on average</b>. That one superpower turns dozens of O(N<sup>2</sup>) brute-force solutions into clean O(N) ones, and it is hiding inside caches, database joins, deduplication pipelines and compilers.</p>
<p>We start by <b>opening the box</b>: how a hash table turns a key into a bucket (hashCode, spreading, masking), with Java's <code>HashMap</code> as the worked example (Python's <code>dict</code>, JavaScript's <code>Map</code> and C++'s <code>unordered_map</code> use the same ideas), why equality and the hash must agree (<code>equals()</code>/<code>hashCode()</code> in Java, <code>__eq__</code>/<code>__hash__</code> in Python, <code>operator==</code> plus a hash functor in C++), how collisions are chained, when a chain becomes a red-black tree, and why the 0.75 load factor and doubling resize keep everything O(1) amortized — and when it all collapses to O(N).</p>
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
      'Pick the right tool from the wording: hash set vs hash map vs a plain count array (int[26]) vs an insertion-ordered map (LinkedHashMap, Python dict, JS Map) vs a sorted map (TreeMap, std::map), and value = count / first index / last index / list.',
      'Solve every prefix-sum + hashing problem (zero-sum exists, count sum K, longest sum 0/K, equal 0s and 1s, divisible by K) in O(N) with the correct seed ({0} or 0 → −1).',
      'Write the sliding-window-with-a-map template from memory and apply it to longest substring without repeats and minimum window substring.',
      'Solve longest consecutive sequence in O(N) using the "only start counting at a chain start" trick and prove the O(N) bound.'
    ],
    prereqs: `<p>DSA 1 (Java foundations: arrays, strings, <code>List</code>/<code>Map</code> basics), DSA 2 (Big-O and constraint reading), DSA 5 (<b>Prefix Sums</b> — essential for topics 5–7) and DSA 6 (<b>Two Pointers &amp; Sliding Window</b> — essential for topic 8). Bit basics from DSA 4 help with the <code>&amp; (capacity − 1)</code> bucket math.</p>`,
    hours: 16,
    langNotes: {
      java: `<p><b>Java:</b> <code>HashMap</code>/<code>HashSet</code> give O(1) average lookups; <code>TreeMap</code> keeps keys sorted at O(log N), and <code>LinkedHashMap</code> keeps insertion order. Keys and values are boxed (<code>Integer</code>, <code>Long</code>), so compare counts with <code>.equals()</code> or unbox them: <code>==</code> on two <code>Integer</code> objects only works below 128. A custom key needs both <code>equals()</code> and <code>hashCode()</code> (a <code>record</code> writes them for you), and must not change while it sits in a map. <code>int</code> overflow wraps silently, so build prefix sums in <code>long</code> and use <code>Set&lt;Long&gt;</code> / <code>Map&lt;Long, Integer&gt;</code> (seed with <code>0L</code>). <code>-7 % 5</code> is <code>-2</code>: normalise with <code>((x % k) + k) % k</code>. <code>merge</code>, <code>getOrDefault</code>, <code>computeIfAbsent</code> and <code>putIfAbsent</code> are the tally helpers. Recursion is fine to about 10k frames, but every solution here is iterative.</p>`,
      python: `<p><b>Python:</b> <code>dict</code> and <code>set</code> are hash tables with O(1) average operations, and a <code>dict</code> keeps insertion order. <code>collections.Counter</code> tallies in one call (<code>Counter(s) == Counter(t)</code> checks an anagram, <code>most_common(k)</code> gives the top k) and <code>defaultdict(int)</code> / <code>defaultdict(list)</code> skip the "missing key" check. Keys must be hashable: use a <code>tuple</code> or <code>frozenset</code>, not a <code>list</code>; a class that defines <code>__eq__</code> must also define <code>__hash__</code>. Integers never overflow, and <code>%</code> with a positive k is never negative (<code>-7 % 5 == 3</code>), so no normalising is needed. <code>str</code> hashes are randomised per process. There is no built-in sorted map: use <code>sorted()</code>, <code>bisect</code> or a third-party <code>SortedList</code>. Recursion stops at about 1000 frames; the loops in this module are iterative.</p>`,
      js: `<p><b>JavaScript:</b> use <code>Map</code> and <code>Set</code>, not plain objects: a <code>Map</code> keeps number keys as numbers, has <code>size</code>, keeps insertion order and has no inherited keys. Object and array keys are compared by <b>identity</b>, so <code>new Set([[1, 2]]).has([1, 2])</code> is false; build a string key such as <code>x + ',' + y</code> instead. A tally is <code>m.set(x, (m.get(x) || 0) + 1)</code>; delete keys whose count reaches 0 so <code>size</code> stays the distinct count. <code>Number</code> is exact only up to 2<sup>53</sup> (prefix sums here stay far below that; use <code>BigInt</code> beyond it). <code>%</code> keeps the sign of the dividend (<code>-7 % 5 === -2</code>), so normalise with <code>((x % k) + k) % k</code>. <code>sort()</code> compares as strings unless you pass <code>(a, b) =&gt; a - b</code>. There is no built-in sorted map or heap. Recursion depth is about 10k frames.</p>`,
      cpp: `<p><b>C++:</b> <code>unordered_map</code>/<code>unordered_set</code> are O(1) on average; <code>map</code>/<code>set</code> are sorted trees at O(log N). <code>m[x]</code> inserts a missing key with value 0, which is perfect for tallies (<code>cnt[x]++</code>) but adds junk keys if you only meant to look: use <code>find</code> or <code>count</code> for read-only checks. <code>insert(x).second</code> is false when x was already there. A custom key needs <code>operator==</code> and a hash functor; <code>pair</code> has no default hash, so pack it into a <code>long long</code> or use a <code>map</code>. Signed overflow is undefined behaviour, so keep prefix sums in <code>long long</code>; <code>%</code> keeps the sign of the dividend. <code>reserve(n)</code> avoids rehashing. On judges with anti-hash tests, add a random-seeded hash (splitmix64). Stack depth is about 8 MB.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
