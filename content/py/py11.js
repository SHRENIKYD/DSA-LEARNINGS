(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  // Shared test harness: runs each case as python lines in a fresh namespace; returns repr of every non-None expression, or !ExceptionName.
  var PYT = String.raw`
def run_lines(lines):
    g = dict(globals())
    out = []
    for ln in lines:
        try:
            try:
                code = compile(ln, '<t>', 'eval')
            except SyntaxError:
                code = None
            if code is None:
                exec(compile(ln, '<t>', 'exec'), g)
            else:
                v = eval(code, g)
                if v is not None:
                    out.append(repr(v))
        except Exception as e:
            out.append('!' + type(e).__name__)
    return out
`;

  /* ---------- shared visualizer helpers (py11) ---------- */
  function fr(narr, parts) { return { narr: narr, parts: parts }; }
  function tx(html, label) { return { type: 'text', label: label, html: html }; }
  // code part; hl = {line: cls}
  function cp(code, hl, label) { return { type: 'code', label: label || 'Python (current line highlighted)', lang: 'python', code: code, hl: hl || {} }; }
  // vars part; obj values are stringified, hlKeys = 'a,b'
  function vp(obj, hlKeys, cls, label) {
    var vals = {}, hl = {};
    Object.keys(obj).forEach(function (k) { vals[k] = String(obj[k]); });
    if (hlKeys) String(hlKeys).split(',').forEach(function (k) { hl[k] = cls || 'ok'; });
    return { type: 'vars', label: label || 'Variables', vals: vals, hl: hl };
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function words(s) { return String(s === undefined ? '' : s).trim().split(/[\s,]+/).filter(function (x) { return x.length; }); }
  function nums(s, max, hint) {
    var a = words(s).map(Number);
    if (!a.length || a.some(function (x) { return isNaN(x); })) throw new Error(hint || 'Enter numbers separated by spaces, e.g. 5 3 8 1');
    if (a.length > (max || 12)) throw new Error('Use at most ' + (max || 12) + ' numbers');
    return a;
  }
  function q(v) { return typeof v === 'string' ? "'" + v + "'" : String(v); }
  function pyList(a) { return '[' + a.map(q).join(', ') + ']'; }
  function one(i, cls) { var o = {}; o[i] = cls; return o; }

  /* ================= TOPIC 1: Counter & defaultdict ================= */
  topics.push({
    title: 'Counter & defaultdict: Hash Maps with Superpowers',
    analogy: `<p>Imagine a <b>tally sheet at a school election</b>. Every time a vote comes in, you find the candidate's name and add a stroke. If a new name shows up, you don't panic — you just write the name and start at one. That tally sheet is <code>Counter</code>.</p>
<p>Now imagine a <b>wall of labelled mailboxes</b> in an apartment block. When a letter arrives for a flat that has no box yet, the caretaker <i>automatically nails up an empty box</i> and drops the letter in. That self-creating mailbox wall is <code>defaultdict</code>.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Half of all interview questions secretly say "count things" or "group things". A plain <code>dict</code> can do both, but you keep writing the same boring guard code: <code>if key not in d: d[key] = 0</code>. The <code>collections</code> module gives you two dict subclasses that remove that noise.</p>
${H.table(['You want to…', 'Plain dict (old school)', 'Pythonic', 'Why it is nicer'], [
  ['Count letters', '<code>d[ch] = d.get(ch, 0) + 1</code>', '<code>Counter(s)</code>', 'one call, runs a C loop'],
  ['Group words by key', '<code>d.setdefault(k, []).append(w)</code>', '<code>g = defaultdict(list)</code><br><code>g[k].append(w)</code>', 'no guard, reads like English'],
  ['Top k frequent', 'sort items by value', '<code>c.most_common(k)</code>', 'uses a heap when k is small'],
  ['"Can A be built from B?"', 'loop and compare counts', '<code>not (Counter(A) - Counter(B))</code>', 'multiset subtraction']
])}
<p>🔵 <b>Counter in 6 facts.</b></p>
<ol>
<li><code>Counter(iterable)</code> counts every item; <code>Counter(a=2, b=1)</code> or <code>Counter({'a': 2})</code> also work.</li>
<li>A missing key reads as <b>0</b> (no <code>KeyError</code>) and is <b>not</b> inserted: <code>c['zzz']</code> → 0.</li>
<li><code>c.most_common(k)</code> → list of <code>(item, count)</code>, biggest first; ties keep first-seen order.</li>
<li>Multiset maths: <code>c1 + c2</code> (add), <code>c1 - c2</code> (subtract, drops counts ≤ 0), <code>c1 &amp; c2</code> (min of each), <code>c1 | c2</code> (max of each).</li>
<li><code>c.update(more)</code> adds counts, <code>c.subtract(more)</code> subtracts and <b>keeps</b> zero/negative counts, <code>c.total()</code> (3.10+) sums all counts, <code>c.elements()</code> repeats each item count times.</li>
<li>It is still a dict: <code>len(c)</code> = number of distinct items, <code>del c[k]</code> removes one, iteration is in first-seen order.</li>
</ol>
<p>🔵 <b>defaultdict in 4 facts.</b></p>
<ol>
<li><code>defaultdict(factory)</code>: when <code>d[k]</code> is read and <code>k</code> is missing, it calls <code>factory()</code>, <b>stores</b> the result under <code>k</code>, and returns it.</li>
<li>Common factories: <code>list</code> (grouping, adjacency lists), <code>int</code> (counting, starts at 0), <code>set</code> (unique neighbours), <code>lambda: float('inf')</code> (distances).</li>
<li>Only <code>d[k]</code> triggers the factory. <code>d.get(k)</code> and <code>k in d</code> do <b>not</b> create keys.</li>
<li>Gotcha: just <i>looking</i> with <code>d[k]</code> inserts an empty value — so <code>if d[k]:</code> inside a loop quietly grows the dict.</li>
</ol>
${H.kv([['Counter("banana")', "{'a': 3, 'n': 2, 'b': 1}"], ["c['z']", '0 (not inserted)'], ['most_common(1)', "[('a', 3)]"]], { label: 'Counter cheat sheet', hl: { 'most_common(1)': 'g' } })}
<p><b>Which one?</b> If the value is a <b>number you add to</b>, reach for <code>Counter</code> (it also gives you <code>most_common</code> and maths). If the value is a <b>container you append to</b> (list/set), use <code>defaultdict</code>.</p>`,
    clues: [
      '"anagram", "permutation of", "same characters" → compare <code>Counter(a) == Counter(b)</code>',
      '"most frequent", "top k frequent", "majority element", "mode" → <code>Counter(...).most_common(k)</code>',
      '"group by", "bucket", "categorize", "cluster words that…" → <code>defaultdict(list)</code> keyed by a canonical form',
      '"can you build X from the letters of Y", "ransom note" → multiset subtraction <code>Counter(X) - Counter(Y)</code> is empty',
      '"build a graph from an edge list" → <code>adj = defaultdict(list)</code>; <code>adj[u].append(v)</code>',
      '"number of subarrays with sum K" → prefix sums in <code>defaultdict(int)</code> seeded with <code>{0: 1}</code>',
      'Counts per key with N ≤ 10<sup>5</sup> → O(N) hash counting, never nested loops'
    ],
    code: [{ lang: 'python', run: true, title: 'Counter & defaultdict tour (runnable)', code: `
from collections import Counter, defaultdict

# ---------- Counter: a dict that counts ----------
c = Counter("mississippi")
print(c)                      # Counter({'i': 4, 's': 4, 'p': 2, 'm': 1})
print(c["s"], c["z"])         # 4 0  -> missing key reads as 0, no KeyError
print("z" in c)               # False -> reading c["z"] did NOT insert it
print(c.most_common(2))       # [('i', 4), ('s', 4)] ties keep first-seen order

# multiset maths
a, b = Counter("aabbc"), Counter("abd")
print(a + b)                  # add counts
print(a - b)                  # subtract, drop counts <= 0
print(a & b)                  # min of each count (intersection)
print(a | b)                  # max of each count (union)

a.subtract("aaaa")            # subtract() KEEPS zero/negative counts
print(a)                      # 'a' is now -2
print(+a)                     # unary + strips non-positive counts
print(Counter("abca").total())  # 4 (Python 3.10+)

# ---------- defaultdict: auto-creating values ----------
groups = defaultdict(list)
for word in ["eat", "tea", "tan", "ate", "nat", "bat"]:
    groups["".join(sorted(word))].append(word)   # no "if key not in" guard
print(dict(groups))

freq = defaultdict(int)       # int() == 0, so this counts
for ch in "hello":
    freq[ch] += 1
print(dict(freq))

seen = defaultdict(set)
seen["x"]                     # just LOOKING inserts an empty set!
print(len(seen), seen.get("y"), "y" in seen)   # 1 None False
` }],
    codeTitle: ['Counter & defaultdict tour (runnable)'],
    viz: [{
      title: 'Counter: tallying characters, then most_common',
      input: 'mississippi',
      inputLabel: 'A short word (≤ 14 letters)',
      gen: function (input) {
        var s = String(input === undefined ? '' : input).replace(/\s+/g, '');
        if (!s.length) throw new Error('Type a short word, e.g. mississippi');
        if (s.length > 14) throw new Error('Use at most 14 characters');
        var chars = s.split(''), order = [], cnt = {}, frames = [];
        var CODE = 'c = Counter()\nfor ch in s:\n    c[ch] += 1      # missing key reads as 0\nprint(c.most_common(2))';
        function entries() { return order.map(function (k) { return [k, cnt[k]]; }); }
        frames.push(fr('We start with an empty <b>Counter</b> — think of a blank tally sheet. <code>Counter(s)</code> does exactly this loop for us (in fast C code).', [
          { type: 'array', label: 's', values: chars.slice(), showIdx: true },
          { type: 'map', label: 'Counter c', entries: [] },
          cp(CODE, { 1: 'cur' })
        ]));
        for (var i = 0; i < chars.length; i++) {
          var ch = chars[i], isNew = !Object.prototype.hasOwnProperty.call(cnt, ch);
          if (isNew) { order.push(ch); cnt[ch] = 0; }
          cnt[ch]++;
          var hl = {}; hl[ch] = isNew ? 'ok' : 'cur';
          var ah = {}; for (var j = 0; j < i; j++) ah[j] = 'done'; ah[i] = 'cur';
          frames.push(fr('Read <b>' + esc(ch) + '</b>. ' + (isNew ? 'Not on the sheet yet → <code>c[\'' + esc(ch) + '\']</code> reads as <b>0</b> (no KeyError), we add 1 → <span class="c-g">new key with count 1</span>.' : 'Already on the sheet → add one stroke: count becomes <b>' + cnt[ch] + '</b>.'), [
            { type: 'array', label: 's', values: chars.slice(), hl: ah, ptr: one(i, 'ch'), showIdx: true },
            { type: 'map', label: 'Counter c (first-seen order)', entries: entries(), hl: hl },
            cp(CODE, { 3: isNew ? 'ok' : 'cur' })
          ]));
        }
        var sorted = order.slice().sort(function (x, y) { return cnt[y] - cnt[x] || order.indexOf(x) - order.indexOf(y); });
        var top = sorted.slice(0, 2), thl = {};
        top.forEach(function (k) { thl[k] = 'sel'; });
        frames.push(fr('<code>most_common()</code> orders items by count, biggest first. Ties keep <b>first-seen</b> order (it is a stable sort).', [
          { type: 'table', label: 'c.most_common()', columns: ['rank', 'item', 'count'], rows: sorted.map(function (k, r) { return [r + 1, "'" + k + "'", cnt[k]]; }), hl: { 0: 'sel', 1: 'sel' } },
          cp(CODE, { 4: 'cur' })
        ]));
        frames.push(fr('<code>most_common(2)</code> → <b>' + esc(top.map(function (k) { return "('" + k + "', " + cnt[k] + ')'; }).join(', ')) + '</b>. With a k argument CPython uses <code>heapq.nlargest</code>, so it costs O(n log k) instead of a full sort.', [
          { type: 'map', label: 'Counter c', entries: entries(), hl: thl },
          vp({ 'len(c)': order.length, 'c.total()': chars.length, "c['?'] (missing)": 0 }, 'c.total()', 'ok'),
          cp(CODE, { 4: 'ok' })
        ]));
        return frames;
      }
    }, {
      title: 'defaultdict(list): grouping anagrams into self-creating buckets',
      input: 'eat tea tan ate nat bat',
      inputLabel: 'Words (space separated, ≤ 10)',
      gen: function (input) {
        var ws = words(input);
        if (!ws.length) throw new Error('Type some words, e.g. eat tea tan ate nat bat');
        if (ws.length > 10) throw new Error('Use at most 10 words');
        var CODE = 'groups = defaultdict(list)\nfor w in words:\n    key = "".join(sorted(w))\n    groups[key].append(w)\nreturn list(groups.values())';
        var order = [], g = {}, frames = [];
        function entries() { return order.map(function (k) { return [k, '[' + g[k].join(', ') + ']']; }); }
        frames.push(fr('Empty <code>defaultdict(list)</code>. Its <b>factory</b> is <code>list</code>: whenever we touch a missing key it will call <code>list()</code> and store <code>[]</code> for us.', [
          { type: 'array', label: 'words', values: ws.slice() },
          { type: 'map', label: 'groups', entries: [] },
          cp(CODE, { 1: 'cur' })
        ]));
        for (var i = 0; i < ws.length; i++) {
          var w = ws[i], key = w.split('').sort().join(''), isNew = !Object.prototype.hasOwnProperty.call(g, key);
          var ah = {}; for (var j = 0; j < i; j++) ah[j] = 'done'; ah[i] = 'cur';
          frames.push(fr('Word <b>' + esc(w) + '</b> → sort its letters → key <b>' + esc(key) + '</b>. Every anagram produces the <i>same</i> sorted key — that is the canonical form.', [
            { type: 'array', label: 'words', values: ws.slice(), hl: ah, ptr: one(i, 'w') },
            vp({ w: w, key: key }, 'key', 'cur'),
            { type: 'map', label: 'groups', entries: entries() },
            cp(CODE, { 3: 'cur' })
          ]));
          if (isNew) { order.push(key); g[key] = []; }
          g[key].push(w);
          var hl = {}; hl[key] = isNew ? 'ok' : 'cur';
          frames.push(fr(isNew ? '<span class="c-g">Key <b>' + esc(key) + '</b> is missing</span> → factory runs, <code>[]</code> is stored, then we append. No <code>if key not in groups</code> needed.' : 'Key <b>' + esc(key) + '</b> exists → just append. Bucket is now <b>[' + esc(g[key].join(', ')) + ']</b>.', [
            { type: 'array', label: 'words', values: ws.slice(), hl: ah, ptr: one(i, 'w') },
            { type: 'map', label: 'groups', entries: entries(), hl: hl },
            cp(CODE, { 4: isNew ? 'ok' : 'cur' })
          ]));
        }
        frames.push(fr('Done: <b>' + order.length + '</b> groups. <code>groups.values()</code> keeps insertion order, so groups come out in the order their first word appeared.', [
          { type: 'table', label: 'list(groups.values())', columns: ['key', 'group'], rows: order.map(function (k) { return [k, g[k].join(', ')]; }) },
          cp(CODE, { 5: 'ok' })
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'Valid anagram in one line', html: `<p>Two strings are anagrams exactly when their letter counts match. <code>Counter</code> equality compares the multisets (since 3.10, a missing key counts as 0 in comparisons).</p>${H.table(['s', 't', 'Counter(s) == Counter(t)'], [['listen', 'silent', H.c('g', 'True')], ['rat', 'car', H.c('r', 'False')]])}<p>Cost: O(n) time, O(alphabet) space. Sorting both strings is O(n log n) — fine, but slower for long strings.</p>`, code: { lang: 'python', run: true, code: `
from collections import Counter

def is_anagram(s: str, t: str) -> bool:
    return Counter(s) == Counter(t)

print(is_anagram("listen", "silent"))  # True
print(is_anagram("rat", "car"))        # False
` } },
      { title: 'Majority element and "top k" with most_common', html: `<p>"Return the element that appears more than ⌊n/2⌋ times" → the most common element. "Top k frequent words" → <code>most_common(k)</code>. Note the tie rule: ties keep <b>first-seen</b> order, which is <i>not</i> the alphabetical tie-break many problems ask for — then you must sort with a key like <code>(-count, word)</code>.</p>`, code: { lang: 'python', run: true, code: `
from collections import Counter

nums = [2, 2, 1, 1, 1, 2, 2]
print(Counter(nums).most_common(1)[0][0])          # 2

words = ["i", "love", "leetcode", "i", "love", "coding"]
c = Counter(words)
# LeetCode 692 wants ties broken alphabetically -> custom sort key
print(sorted(c, key=lambda w: (-c[w], w))[:2])      # ['i', 'love']
` } },
      { title: 'Ransom note: multiset subtraction', html: `<p>Can <code>note</code> be written using letters cut from <code>magazine</code> (each letter used once)? Subtracting Counters leaves only the letters you are <b>short</b> of. An empty Counter is falsy.</p>${H.kv([["Counter('aab') - Counter('baa')", '{} → can build'], ["Counter('aa') - Counter('ab')", "{'a': 1} → short one 'a'"]])}`, code: { lang: 'python', run: true, code: `
from collections import Counter

def can_construct(note: str, magazine: str) -> bool:
    return not (Counter(note) - Counter(magazine))

print(can_construct("aab", "baa"))  # True
print(can_construct("aa", "ab"))    # False
` } },
      { title: 'Subarray sum equals K with defaultdict(int)', html: `<p>Prefix-sum counting: how many earlier prefixes equal <code>running - k</code>? Seed <code>{0: 1}</code> for subarrays starting at index 0. Works with negative numbers, where sliding window fails.</p>${H.arr([1, 1, 1], { label: 'nums, k = 2' })}<p>Prefixes 1, 2, 3 → at 2 we find prefix 0 once, at 3 we find prefix 1 once → answer <b>2</b>.</p>`, code: { lang: 'python', run: true, code: `
from collections import defaultdict

def subarray_sum(nums, k):
    seen = defaultdict(int)
    seen[0] = 1                 # empty prefix
    running = count = 0
    for x in nums:
        running += x
        count += seen[running - k]   # reading may insert a 0 -- harmless here
        seen[running] += 1
    return count

print(subarray_sum([1, 1, 1], 2))        # 2
print(subarray_sum([3, 4, 7, 2, -3, 1, 4, 2], 7))  # 4
` } }
    ],
    deepDive: `<p>🟣 <b>How they are built.</b> <code>defaultdict</code> is written in C. A normal <code>dict.__getitem__</code> that misses a key calls the hook <code>__missing__(key)</code> if the class defines one. <code>defaultdict.__missing__</code> calls <code>default_factory()</code> with <b>no arguments</b>, stores the value, and returns it. That is why <code>.get()</code>, <code>in</code> and <code>.pop()</code> never trigger it — they don't go through <code>__getitem__</code>.</p>
<p><code>Counter</code> is a pure-Python dict subclass, but its hot loop (<code>_count_elements</code>) is a C helper, so <code>Counter(big_list)</code> is roughly as fast as a hand loop in C. <code>Counter.__missing__</code> returns 0 <b>without inserting</b>. <code>most_common(k)</code> uses <code>heapq.nlargest</code> → O(n log k); <code>most_common()</code> with no k does a full <code>sorted</code> → O(n log n).</p>
<p><b>Edge cases that bite in interviews:</b></p>
<ul>
<li><code>c1 - c2</code> drops non-positive counts but <code>c1.subtract(c2)</code> keeps negatives. Equality before Python 3.10 treated <code>Counter(a=0)</code> ≠ <code>Counter()</code>; since 3.10 missing = 0 in comparisons, and <code>&lt;=</code> means "is a sub-multiset".</li>
<li>Reading <code>d[k]</code> on a <code>defaultdict</code> during iteration over <code>d</code> can insert a key → <code>RuntimeError: dictionary changed size during iteration</code>.</li>
<li>A <code>defaultdict(lambda: ...)</code> cannot be pickled (lambdas are not picklable) — matters for <code>multiprocessing</code>. Use a named function or <code>dict</code> before sending.</li>
<li>For a fixed small alphabet (26 lowercase letters), a list <code>[0] * 26</code> indexed by <code>ord(ch) - 97</code> uses less memory and gives a hashable <code>tuple</code> key — handy for group-anagrams in O(n·k) instead of O(n·k log k).</li>
<li>Recursive auto-vivification: <code>tree = lambda: defaultdict(tree)</code> gives infinitely nested dicts — a one-line trie (<code>node = node[ch]</code>).</li>
</ul>
<p><b>Production reality:</b> both are dicts, so they serialise with <code>json.dumps</code>, but a <code>Counter</code> loses its type on round-trip. For streaming "top k" over huge data, an exact Counter may not fit in memory — that is when Count-Min Sketch or Misra–Gries (heavy hitters) appear in system design.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants write <code>Counter</code>/<code>defaultdict</code> code instantly, so interviewers care less about syntax and more about <b>why</b> you chose a canonical key, how ties are broken, and the complexity.</p>
<p><b>Use AI as a partner:</b> ask <code>"Give me 5 tricky inputs for group-anagrams: empty string, duplicates, unicode, very long words — don't solve it"</code>, or <code>"Rewrite this dict-counting loop with Counter and explain any behaviour difference"</code>.</p>
<p><b>Where AI goes wrong:</b> it often uses <code>most_common(k)</code> when the problem demands an alphabetical tie-break; it uses <code>c1.subtract(c2)</code> and then checks truthiness (negatives keep the Counter truthy); it reads <code>d[k]</code> on a defaultdict inside a loop over <code>d</code>; it claims Counter equality behaves the same on old Python versions.</p>
<p><b>What you must still own:</b> spotting "count/group" in the wording, choosing the canonical form (sorted string vs 26-count tuple), stating O(n·k log k) vs O(n·k), and explaining the <code>__missing__</code> mechanism if asked "how does defaultdict work?".</p>`,
    problems: [{
      title: 'Group Anagrams', level: 'Medium', tags: ['hash map', 'defaultdict', 'string'], companies: ['Amazon', 'Meta', 'Google', 'Microsoft'],
      statement: `<p>Given a list of strings <code>strs</code>, group the anagrams together. Words are anagrams if they use exactly the same letters the same number of times. Return the groups in any order.</p>`,
      constraints: `1 ≤ len(strs) ≤ 10<sup>4</sup>, 0 ≤ len(strs[i]) ≤ 100, lowercase English letters only`,
      example: `<p>Input: ${H.arr(['eat', 'tea', 'tan', 'ate', 'nat', 'bat'])}</p><p>Output: <b>${H.c('g', '[["eat","tea","ate"], ["tan","nat"], ["bat"]]')}</b> — "eat", "tea", "ate" all sort to <code>aet</code>; "tan", "nat" sort to <code>ant</code>; "bat" is alone.</p>`,
      brute: { why: `<p>For every word, scan all existing groups and test "is it an anagram of the group's first word?" by sorting both. With n words that is O(n²·k log k) — 10<sup>8</sup>+ comparisons at n = 10<sup>4</sup>. The waste: we keep re-deciding the same "which group?" question instead of computing a <b>key</b> once and letting a hash map find the group in O(1).</p>`, code: `
def group_anagrams_brute(strs):
    groups = []                         # list of lists
    for w in strs:
        for g in groups:                # scan every group: O(n)
            if sorted(g[0]) == sorted(w):
                g.append(w)
                break
        else:                           # no group matched
            groups.append([w])
    return groups

print(group_anagrams_brute(["eat", "tea", "tan", "ate", "nat", "bat"]))
` },
      mcq: { q: 'You need a dictionary key that is identical for all anagrams of a word. Which works?', options: ['<code>"".join(sorted(w))</code>', '<code>set(w)</code>', '<code>len(w)</code>', '<code>sorted(w)</code> (a list)'], answer: 0, explain: 'The sorted string is identical for all anagrams and is hashable. <code>set(w)</code> loses duplicate counts ("aab" vs "abb") and is unhashable; <code>len</code> is too coarse; a list is unhashable.' },
      hints: [`<p>Hint 1: Two words are anagrams if and only if their <b>sorted letters</b> are equal. So every word has a "fingerprint".</p>`, `<p>Hint 2: Use the fingerprint as a key in <code>defaultdict(list)</code> and append each word to its bucket — one pass.</p>`, `<p>Hint 3: Empty string is a valid word (key <code>""</code>). Recipe: <code>for w in strs: g["".join(sorted(w))].append(w)</code>; return <code>list(g.values())</code>. For long words use a 26-count tuple key to avoid sorting.</p>`],
      tests: { sig: 'string[] -> string[][]', fn: 'group_anagrams', cmp: 'sets', cases: [
        [[['eat', 'tea', 'tan', 'ate', 'nat', 'bat']], [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]],
        [[['']], [['']]],
        [[['a']], [['a']]],
        [[['ab', 'ba', 'abc', 'cab', 'bca', 'c']], [['ab', 'ba'], ['abc', 'cab', 'bca'], ['c']]],
        [[['a', 'a']], [['a', 'a']]],
        [[['', '', '']], [['', '', '']]],
        [[['abc', 'abd', 'abe']], [['abc'], ['abd'], ['abe']]],
        [[{ $rep: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', n: 10000 }], [{ $rep: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', n: 10000 }]],
      ] },
      solution: {
        approach: `<p>Map each word to a canonical key (its sorted letters) and group with <code>defaultdict(list)</code>. All anagrams land in the same bucket. Alternative key: a tuple of 26 letter counts, which makes key-building O(k) instead of O(k log k).</p>`,
        code: { lang: 'python', run: true, code: `
from collections import defaultdict
from typing import List

def group_anagrams(strs: List[str]) -> List[List[str]]:
    groups = defaultdict(list)              # key -> list of words
    for w in strs:
        key = "".join(sorted(w))            # canonical form, O(k log k)
        groups[key].append(w)               # bucket auto-created when missing
    return list(groups.values())            # insertion order of first word

print(group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))
print(group_anagrams([""]))                 # [['']]
` },
        alt: [{ lang: 'python', title: 'O(n·k) count-tuple key', run: true, code: `
from collections import defaultdict

def group_anagrams_counts(strs):
    groups = defaultdict(list)
    for w in strs:
        counts = [0] * 26
        for ch in w:
            counts[ord(ch) - ord("a")] += 1
        groups[tuple(counts)].append(w)     # tuples are hashable, lists are not
    return list(groups.values())

print(group_anagrams_counts(["eat", "tea", "tan", "ate", "nat", "bat"]))
` }],
        dry: { head: ['w', 'key', 'new bucket?', 'groups after'], rows: [
          ['eat', 'aet', H.c('g', 'yes'), '{aet:[eat]}'],
          ['tea', 'aet', 'no', '{aet:[eat,tea]}'],
          ['tan', 'ant', H.c('g', 'yes'), '{aet:[eat,tea], ant:[tan]}'],
          ['ate', 'aet', 'no', '{aet:[eat,tea,ate], ant:[tan]}'],
          ['nat', 'ant', 'no', '{…, ant:[tan,nat]}'],
          ['bat', 'abt', H.c('g', 'yes'), '{…, abt:[bat]}']
        ] },
        complexity: `<p>Time O(n · k log k) with sorted keys (n words, max length k), or O(n · k) with count tuples. Space O(n · k) for the stored words and keys.</p>`,
        followUps: ['What if the input is a stream of billions of words? (shard by key hash)', 'Unicode letters — does the 26-count trick still work? (no, fall back to sorted or Counter frozen as <code>frozenset(c.items())</code>)', 'Return groups sorted by size, largest first']
      }
    }]
  });

  /* ================= TOPIC 2: deque & OrderedDict ================= */
  topics.push({
    title: 'deque & OrderedDict: Fast Ends and Ordered Keys',
    analogy: `<p>A <b>deque</b> ("deck") is a <b>bus with doors at both ends</b>: people can get on or off at the front or the back instantly. A Python <code>list</code> is a bus with <b>one</b> door at the back — if someone at the front wants off, everyone shuffles forward one seat.</p>
<p>An <b>OrderedDict</b> is a <b>coat-check counter with a queue of hooks</b>: each coat has a ticket (key), and the attendant can instantly move any coat to the "most recent" end or throw out the oldest one. That is exactly an LRU cache.</p>`,
    explain: `<p>🟢 <b>Why not just use a list as a queue?</b> <code>list.append</code> and <code>list.pop()</code> are O(1) at the <b>end</b>, but <code>list.pop(0)</code> and <code>list.insert(0, x)</code> must shift every other element → <b>O(n)</b>. A BFS over 10<sup>5</sup> nodes using <code>pop(0)</code> can silently become 10<sup>10</sup> work.</p>
${H.table(['Operation', 'list', 'collections.deque'], [
  ['append right / pop right', 'O(1)', 'O(1)'],
  ['append left / pop left', H.c('r', 'O(n)'), H.c('g', 'O(1)')],
  ['index <code>d[i]</code> in the middle', H.c('g', 'O(1)'), H.c('y', 'O(n) (fast near the ends)')],
  ['slicing <code>d[1:3]</code>', 'yes', H.c('r', 'not supported')],
  ['bounded size', 'no', '<code>deque(maxlen=N)</code> drops the oldest automatically']
])}
<p>🔵 <b>deque API you will actually use:</b> <code>append</code>, <code>appendleft</code>, <code>pop</code>, <code>popleft</code>, <code>extend</code>, <code>extendleft</code> (note: reverses the order!), <code>rotate(k)</code> (right by k; negative = left), <code>d[0]</code> / <code>d[-1]</code> to peek, <code>maxlen</code>.</p>
<p>Three interview shapes:</p>
<ul>
<li><b>Queue (FIFO)</b> — BFS, level order traversal, "process in arrival order": <code>append</code> + <code>popleft</code>.</li>
<li><b>Monotonic deque</b> — "max/min of every window of size k": keep indices whose values are decreasing; pop smaller ones from the back, pop expired ones from the front. Each index enters and leaves once → O(n).</li>
<li><b>0-1 BFS</b> — edges cost 0 or 1: cost-0 neighbours go to the <b>front</b> (<code>appendleft</code>), cost-1 to the back.</li>
</ul>
<p>🔵 <b>OrderedDict vs dict.</b> Since Python 3.7 a plain <code>dict</code> keeps insertion order too. <code>OrderedDict</code> still matters because it has O(1) <b>re-ordering</b> tools a dict lacks:</p>
${H.table(['Need', 'OrderedDict', 'plain dict'], [
  ['move key to newest end', '<code>od.move_to_end(k)</code> O(1)', 'pop + re-insert (works, but clumsy)'],
  ['move key to oldest end', '<code>od.move_to_end(k, last=False)</code>', H.c('r', 'not possible cheaply')],
  ['remove oldest', '<code>od.popitem(last=False)</code>', '<code>del d[next(iter(d))]</code>'],
  ['order-sensitive ==', 'yes', 'no (order ignored)']
])}
<p>So the classic <b>LRU cache</b> is 10 lines: on <code>get</code>, <code>move_to_end(key)</code>; on <code>put</code>, insert and if over capacity <code>popitem(last=False)</code>.</p>`,
    clues: [
      '"shortest path in an unweighted graph/grid", "minimum number of moves/steps" → BFS with <code>deque</code>',
      '"maximum/minimum of every sliding window of size k" → monotonic <code>deque</code> of indices, O(n)',
      '"least recently used", "evict the oldest", "cache with capacity" → <code>OrderedDict</code> + <code>move_to_end</code> / <code>popitem(last=False)</code>',
      '"keep only the last N items / recent N requests", "moving average of last N" → <code>deque(maxlen=N)</code>',
      '"edges of weight 0 or 1" → 0-1 BFS with <code>appendleft</code>',
      '"rotate the array/queue by k" → <code>deque.rotate(k)</code>',
      'You see <code>queue.pop(0)</code> in a loop → red flag, O(n²); switch to <code>popleft()</code>'
    ],
    code: [{ lang: 'python', run: true, title: 'deque & OrderedDict tour (runnable)', code: `
from collections import deque, OrderedDict

d = deque([1, 2, 3])
d.append(4)          # right end  -> deque([1, 2, 3, 4])
d.appendleft(0)      # left end   -> deque([0, 1, 2, 3, 4])
print(d.popleft(), d.pop(), d)   # 0 4 deque([1, 2, 3])
d.rotate(1)          # right by 1 -> deque([3, 1, 2])
print(d, d[0], d[-1])

d.extendleft([7, 8]) # careful: items go in one by one -> 8, 7 at the front
print(d)             # deque([8, 7, 3, 1, 2])

last3 = deque(maxlen=3)          # bounded buffer
for x in range(6):
    last3.append(x)              # oldest falls off the left automatically
print(last3)                     # deque([3, 4, 5], maxlen=3)

# ---------- OrderedDict as an LRU order book ----------
od = OrderedDict.fromkeys("abcd")
od.move_to_end("b")              # b becomes the newest
print(list(od))                  # ['a', 'c', 'd', 'b']
od.move_to_end("d", last=False)  # d becomes the oldest
print(list(od))                  # ['d', 'a', 'c', 'b']
print(od.popitem(last=False))    # ('d', None) -> evict oldest
print(OrderedDict(a=1, b=2) == OrderedDict(b=2, a=1))  # False: order matters
print(dict(a=1, b=2) == dict(b=2, a=1))                # True
` }, { lang: 'python', run: true, title: 'Sliding window maximum with a monotonic deque', code: `
from collections import deque

def max_sliding_window(nums, k):
    dq = deque()          # holds INDICES; their values are strictly decreasing
    out = []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:   # smaller values can never be a max again
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:                # front index slid out of the window
            dq.popleft()
        if i >= k - 1:                    # window is full -> record its max
            out.append(nums[dq[0]])
    return out

print(max_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 3))  # [3, 3, 5, 5, 6, 7]
` }],
    codeTitle: ['deque & OrderedDict tour (runnable)', 'Sliding window maximum (monotonic deque)'],
    viz: [{
      title: 'Monotonic deque: sliding window maximum',
      input: '1 3 -1 -3 5 3 6 7 | 3',
      inputLabel: 'numbers | k   (≤ 12 numbers)',
      gen: function (input) {
        var parts = String(input === undefined ? '' : input).split('|');
        var a = nums(parts[0], 12, 'Format: 1 3 -1 -3 5 | 3');
        var k = parseInt(parts[1], 10);
        if (isNaN(k) || k < 1 || k > a.length) throw new Error('After | give k between 1 and the array length, e.g. 1 3 -1 | 2');
        var CODE = 'for i, x in enumerate(nums):\n    while dq and nums[dq[-1]] <= x:\n        dq.pop()\n    dq.append(i)\n    if dq[0] <= i - k:\n        dq.popleft()\n    if i >= k - 1:\n        out.append(nums[dq[0]])';
        var dq = [], out = [], frames = [];
        function qItems() { return dq.map(function (j) { return j + ':' + a[j]; }); }
        frames.push(fr('The deque stores <b>indices</b> (shown as <code>index:value</code>) whose values go <b>down</b> from front to back. The front is always the max of the current window.', [
          { type: 'array', label: 'nums', values: a.slice(), showIdx: true },
          { type: 'queue', label: 'dq', items: [], frontLabel: 'front (max)', backLabel: 'back' },
          { type: 'array', label: 'out', values: [] },
          cp(CODE, { 1: 'cur' })
        ]));
        for (var i = 0; i < a.length; i++) {
          var lo = Math.max(0, i - k + 1);
          var popped = [];
          while (dq.length && a[dq[dq.length - 1]] <= a[i]) popped.push(dq.pop());
          if (popped.length) {
            frames.push(fr('New value <b>' + a[i] + '</b> at i=' + i + '. Values ' + popped.map(function (j) { return a[j]; }).join(', ') + ' at the back are ≤ ' + a[i] + ': they are older <i>and</i> not bigger, so they can <b>never</b> be a window max again → <span class="c-r">pop from the back</span>.', [
              { type: 'array', label: 'nums', values: a.slice(), showIdx: true, range: [lo, i], ptr: one(i, 'i'), hl: one(i, 'cur') },
              { type: 'queue', label: 'dq (after pops)', items: qItems(), frontLabel: 'front (max)', backLabel: 'back' },
              { type: 'set', label: 'popped (discarded)', items: popped.map(function (j) { return j + ':' + a[j]; }), hl: (function () { var h = {}; popped.forEach(function (j) { h[j + ':' + a[j]] = 'bad'; }); return h; })() },
              cp(CODE, { 2: 'bad', 3: 'bad' })
            ]));
          }
          dq.push(i);
          var expired = null;
          if (dq[0] <= i - k) expired = dq.shift();
          frames.push(fr('Append index ' + i + ' at the back.' + (expired !== null ? ' Front index ' + expired + ' is outside the window [' + lo + '..' + i + '] → <span class="c-r">popleft()</span>.' : ' Front index ' + dq[0] + ' is still inside the window [' + lo + '..' + i + '].'), [
            { type: 'array', label: 'nums', values: a.slice(), showIdx: true, range: [lo, i], ptr: one(i, 'i'), hl: one(i, 'cur') },
            { type: 'queue', label: 'dq', items: qItems(), hl: one(dq.length - 1, 'ok'), frontLabel: 'front (max)', backLabel: 'back' },
            { type: 'array', label: 'out', values: out.slice() },
            cp(CODE, expired !== null ? { 4: 'ok', 6: 'bad' } : { 4: 'ok' })
          ]));
          if (i >= k - 1) {
            out.push(a[dq[0]]);
            frames.push(fr('Window [' + lo + '..' + i + '] is full → its max is the <b>front</b>: nums[' + dq[0] + '] = <b>' + a[dq[0]] + '</b>.', [
              { type: 'array', label: 'nums', values: a.slice(), showIdx: true, range: [lo, i], hl: one(dq[0], 'sel') },
              { type: 'queue', label: 'dq', items: qItems(), hl: { 0: 'sel' }, frontLabel: 'front (max)', backLabel: 'back' },
              { type: 'array', label: 'out', values: out.slice(), hl: one(out.length - 1, 'ok') },
              cp(CODE, { 8: 'ok' })
            ]));
          }
        }
        frames.push(fr('Done: out = <b>[' + out.join(', ') + ']</b>. Every index was appended once and popped at most once → <b>O(n)</b> total, not O(n·k).', [
          { type: 'array', label: 'out', values: out.slice(), hl: (function () { var h = {}; out.forEach(function (_, j) { h[j] = 'sel'; }); return h; })() }
        ]));
        return frames;
      }
    }, {
      title: 'OrderedDict as an LRU cache',
      input: '2 | put 1 1, put 2 2, get 1, put 3 3, get 2, put 4 4, get 1, get 3, get 4',
      inputLabel: 'capacity | operations (put k v / get k), comma separated',
      gen: function (input) {
        var parts = String(input === undefined ? '' : input).split('|');
        var cap = parseInt(parts[0], 10);
        if (isNaN(cap) || cap < 1 || cap > 6) throw new Error('Start with a capacity 1-6, e.g. 2 | put 1 1, get 1');
        var ops = String(parts[1] || '').split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s; });
        if (!ops.length || ops.length > 14) throw new Error('Give 1-14 operations like put 1 1, get 1');
        var CODE = 'def get(self, key):\n    if key not in self.od: return -1\n    self.od.move_to_end(key)      # now most recent\n    return self.od[key]\n\ndef put(self, key, value):\n    if key in self.od: self.od.move_to_end(key)\n    self.od[key] = value\n    if len(self.od) > self.cap:\n        self.od.popitem(last=False)   # evict LRU';
        var od = [], frames = [], results = [];
        function ent() { return od.map(function (p) { return [p[0], p[1]]; }); }
        function find(k) { for (var j = 0; j < od.length; j++) if (od[j][0] === k) return j; return -1; }
        frames.push(fr('Empty cache with capacity <b>' + cap + '</b>. Order inside the OrderedDict = recency: <b>left = least recently used</b>, right = most recent.', [
          { type: 'map', label: 'OrderedDict (oldest → newest)', entries: [] },
          cp(CODE, {})
        ]));
        ops.forEach(function (op) {
          var t = op.split(/\s+/);
          if (t[0] === 'get' && t.length === 2) {
            var j = find(t[1]);
            if (j < 0) {
              results.push(-1);
              frames.push(fr('<code>get(' + esc(t[1]) + ')</code> → key not present → <span class="c-r">-1</span> (a miss).', [
                { type: 'map', label: 'OrderedDict (oldest → newest)', entries: ent() },
                vp({ result: -1 }, 'result', 'bad'),
                cp(CODE, { 2: 'bad' })
              ]));
            } else {
              var p = od.splice(j, 1)[0]; od.push(p); results.push(p[1]);
              var h = {}; h[p[0]] = 'ok';
              frames.push(fr('<code>get(' + esc(t[1]) + ')</code> → hit! <code>move_to_end</code> makes it the <b>most recent</b> (O(1): CPython relinks a node in its internal doubly linked list). Returns <b>' + esc(p[1]) + '</b>.', [
                { type: 'map', label: 'OrderedDict (oldest → newest)', entries: ent(), hl: h },
                vp({ result: p[1] }, 'result', 'ok'),
                cp(CODE, { 3: 'ok', 4: 'ok' })
              ]));
            }
          } else if (t[0] === 'put' && t.length === 3) {
            var j2 = find(t[1]);
            if (j2 >= 0) { od.splice(j2, 1); }
            od.push([t[1], t[2]]);
            var h2 = {}; h2[t[1]] = 'ok';
            var evicted = null;
            if (od.length > cap) evicted = od.shift();
            frames.push(fr('<code>put(' + esc(t[1]) + ', ' + esc(t[2]) + ')</code> → ' + (j2 >= 0 ? 'key existed: moved to end and value updated.' : 'inserted at the newest end.') + (evicted ? ' Size ' + (cap + 1) + ' &gt; capacity → <code>popitem(last=False)</code> <span class="c-r">evicts key ' + esc(evicted[0]) + '</span> (least recently used).' : ''), [
              { type: 'map', label: 'OrderedDict (oldest → newest)', entries: ent(), hl: h2 },
              evicted ? { type: 'set', label: 'evicted', items: [evicted[0] + '→' + evicted[1]], hl: (function () { var e = {}; e[evicted[0] + '→' + evicted[1]] = 'bad'; return e; })() } : vp({ size: od.length, capacity: cap }, 'size', 'ok'),
              cp(CODE, evicted ? { 8: 'ok', 10: 'bad' } : { 8: 'ok' })
            ]));
          } else {
            throw new Error('Bad operation "' + op + '" — use put k v or get k');
          }
        });
        frames.push(fr('All operations done. get results in order: <b>[' + results.join(', ') + ']</b>. Every operation was O(1).', [
          { type: 'map', label: 'final OrderedDict', entries: ent() },
          { type: 'array', label: 'get() results', values: results.slice() }
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'BFS shortest path on a grid', html: `<p>Minimum steps from top-left to bottom-right through open cells (0 = open, 1 = wall). BFS explores in rings of equal distance, so the first time we reach the target is the shortest. The deque gives O(1) <code>popleft</code>.</p>${H.table(['', 'c0', 'c1', 'c2'], [['r0', '0', '0', '0'], ['r1', '1', '1', '0'], ['r2', '0', '0', '0']])}<p>Path: right, right, down, down → <b>4</b> steps.</p>`, code: { lang: 'python', run: true, code: `
from collections import deque

def shortest(grid):
    R, C = len(grid), len(grid[0])
    if grid[0][0] or grid[R - 1][C - 1]:
        return -1
    dist = {(0, 0): 0}
    q = deque([(0, 0)])
    while q:
        r, c = q.popleft()
        if (r, c) == (R - 1, C - 1):
            return dist[(r, c)]
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < R and 0 <= nc < C and not grid[nr][nc] and (nr, nc) not in dist:
                dist[(nr, nc)] = dist[(r, c)] + 1
                q.append((nr, nc))
    return -1

print(shortest([[0, 0, 0], [1, 1, 0], [0, 0, 0]]))  # 4
` } },
      { title: 'Recent-calls counter with a deque', html: `<p>LeetCode 933 "Number of Recent Calls": count pings in the last 3000 ms. Times only increase, so old pings expire from the <b>front</b> — a perfect queue. Each ping is added once and removed once → amortised O(1).</p>${H.arr([1, 100, 3001, 3002], { label: 'ping times' })}<p>At t = 3002 the window is [2, 3002] → ping 1 expires → answer 3.</p>`, code: { lang: 'python', run: true, code: `
from collections import deque

class RecentCounter:
    def __init__(self):
        self.q = deque()

    def ping(self, t: int) -> int:
        self.q.append(t)
        while self.q[0] < t - 3000:    # drop pings older than the window
            self.q.popleft()
        return len(self.q)

rc = RecentCounter()
print([rc.ping(t) for t in (1, 100, 3001, 3002)])  # [1, 2, 3, 3]
` } },
      { title: '0-1 BFS: weights are only 0 or 1', html: `<p>Dijkstra works but costs O(E log V). With 0/1 weights a deque does it in O(V + E): push a 0-cost neighbour to the <b>front</b> (same distance), a 1-cost neighbour to the <b>back</b> (distance + 1). The deque stays sorted by distance — a "two-level priority queue".</p>`, code: { lang: 'python', run: true, code: `
from collections import deque

def zero_one_bfs(n, edges, src):
    adj = [[] for _ in range(n)]
    for u, v, w in edges:
        adj[u].append((v, w))
    dist = [float("inf")] * n
    dist[src] = 0
    dq = deque([src])
    while dq:
        u = dq.popleft()
        for v, w in adj[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                if w == 0:
                    dq.appendleft(v)   # same level -> front
                else:
                    dq.append(v)       # next level -> back
    return dist

print(zero_one_bfs(4, [(0, 1, 1), (0, 2, 0), (2, 1, 0), (1, 3, 1)], 0))  # [0, 0, 0, 1]
` } },
      { title: 'list.pop(0) vs deque.popleft() — measure it', html: `<p>Draining 50 000 items from the front: the list version shifts every remaining element on each pop (≈ 1.25 billion element moves in theory, though <code>memmove</code> is fast), the deque version is constant work per pop. On real machines the gap is easily 10–100×.</p>`, code: { lang: 'python', run: true, code: `
from collections import deque
import timeit

def drain_list(n=50_000):
    a = list(range(n))
    while a:
        a.pop(0)          # O(n) shift every time

def drain_deque(n=50_000):
    d = deque(range(n))
    while d:
        d.popleft()       # O(1)

print("list :", round(timeit.timeit(drain_list, number=1), 4), "s")
print("deque:", round(timeit.timeit(drain_deque, number=1), 4), "s")
` } }
    ],
    deepDive: `<p>🟣 <b>deque internals.</b> CPython's deque is a <b>doubly linked list of fixed-size blocks</b> (64 slots each), with left/right indexes into the end blocks. Appending at either end writes into the end block or links a new block — O(1) and no big copy ever happens. Random access <code>d[i]</code> walks blocks from the nearer end → O(n) in the middle. <code>append</code>/<code>popleft</code> are atomic under the GIL, which is why <code>queue.Queue</code> uses a deque internally (plus locks for blocking behaviour).</p>
<p><b>Monotonic deque proof sketch:</b> invariant "values at indices in dq strictly decrease and all indices are inside the window". When x arrives, any back element ≤ x is dominated forever (x is newer and at least as big), so popping it never loses an answer. Each index is pushed once and popped at most once → 2n deque operations → O(n).</p>
<p>🟣 <b>OrderedDict internals.</b> Since 3.5 it is implemented in C: a regular dict plus a <b>doubly linked list of keys</b>, so <code>move_to_end</code> and <code>popitem(last=False)</code> are O(1). It uses more memory than a dict (≈ 2× for small dicts) and is a bit slower, which is why the plain dict became ordered in 3.7 without this machinery (the dict keeps a compact entries array; deleting the first key leaves a "hole", so "pop oldest" on a dict is amortised but can degrade).</p>
<p><b>Edge cases:</b> <code>extendleft([1,2,3])</code> yields <code>3,2,1</code> at the front; mutating a deque while iterating raises <code>RuntimeError</code>; <code>deque(maxlen=0)</code> silently discards everything; <code>functools.lru_cache</code> is the production LRU for <i>functions</i> — OrderedDict is for caches you control yourself (TTL, size by bytes, per-key invalidation).</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> an assistant will produce the OrderedDict LRU in seconds, so interviewers increasingly say "now do it <b>without</b> OrderedDict" — they want the hash map + doubly linked list you understand, and the reasoning about O(1) eviction.</p>
<p><b>Use AI as a partner:</b> <code>"Generate an operation sequence that evicts a key right after it was updated by put — I want to test my LRU"</code>; <code>"Explain why this BFS is slow"</code> (it will usually spot <code>pop(0)</code>).</p>
<p><b>Where AI goes wrong:</b> forgets to <code>move_to_end</code> on a <code>put</code> that only updates; uses <code>popitem()</code> (which pops the <b>newest</b> by default) instead of <code>popitem(last=False)</code>; writes the monotonic deque with <code>&lt;</code> vs <code>&lt;=</code> inconsistently and stores values instead of indices, which breaks expiry with duplicates.</p>
<p><b>What you must still own:</b> recognising "window max" → monotonic deque, proving the amortised O(n), and choosing between list, deque, heap and OrderedDict from the operations the problem needs.</p>`,
    problems: [{
      title: 'LRU Cache', level: 'Medium', tags: ['design', 'hash map', 'OrderedDict', 'linked list'], companies: ['Amazon', 'Microsoft', 'Meta', 'Google', 'Bloomberg'],
      statement: `<p>Design a data structure <code>LRUCache(capacity)</code> with <code>get(key)</code> → value or -1, and <code>put(key, value)</code> which inserts or updates; if the number of keys exceeds capacity, evict the <b>least recently used</b> key. Both operations must run in <b>O(1)</b> average time.</p>`,
      constraints: `1 ≤ capacity ≤ 3000, 0 ≤ key ≤ 10<sup>4</sup>, up to 2·10<sup>5</sup> calls`,
      example: `<p>capacity 2: <code>put(1,1) put(2,2) get(1)</code> → ${H.c('g', '1')} (1 is now most recent), <code>put(3,3)</code> → evicts ${H.c('r', '2')}, <code>get(2)</code> → ${H.c('r', '-1')}, <code>put(4,4)</code> evicts 1, <code>get(1)</code> → -1, <code>get(3)</code> → 3, <code>get(4)</code> → 4.</p>`,
      brute: { why: `<p>Keep a list of <code>[key, value]</code> pairs ordered by recency. Every get/put scans the list to find the key (O(n)) and removes it from the middle (O(n)). With 2·10<sup>5</sup> calls and capacity 3000 that is ~6·10<sup>8</sup> steps. The waste: <b>finding</b> needs a hash map, and <b>reordering</b> needs a linked structure.</p>`, code: `
class LRUCacheBrute:
    def __init__(self, capacity):
        self.cap = capacity
        self.items = []                      # [key, value], oldest first

    def get(self, key):
        for i, (k, v) in enumerate(self.items):  # O(n) search
            if k == key:
                self.items.append(self.items.pop(i))  # O(n) move
                return v
        return -1

    def put(self, key, value):
        for i, (k, _) in enumerate(self.items):
            if k == key:
                self.items.pop(i)
                break
        self.items.append([key, value])
        if len(self.items) > self.cap:
            self.items.pop(0)                # O(n) evict

c = LRUCacheBrute(2)
c.put(1, 1); c.put(2, 2); print(c.get(1)); c.put(3, 3); print(c.get(2))
` },
      mcq: { q: 'In an OrderedDict-based LRU, which call evicts the least recently used entry?', options: ['<code>od.popitem(last=False)</code>', '<code>od.popitem()</code>', '<code>od.pop(0)</code>', '<code>del od[-1]</code>'], answer: 0, explain: '<code>popitem()</code> defaults to <code>last=True</code> (newest). Keys are not positions, so <code>pop(0)</code>/<code>del od[-1]</code> look up keys 0 / -1.' },
      hints: [`<p>Hint 1: You need two things at once: find a key in O(1) (hash map) and know the recency order with O(1) reordering (linked list).</p>`, `<p>Hint 2: <code>OrderedDict</code> is exactly "dict + doubly linked list". <code>move_to_end(k)</code> marks k as most recent; <code>popitem(last=False)</code> removes the oldest.</p>`, `<p>Hint 3: On <code>put</code> of an existing key you must <b>also</b> refresh recency. Recipe: get → if missing -1 else move_to_end + return; put → if present move_to_end; assign; if len &gt; cap popitem(last=False).</p>`],
      tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
        [[['c = LRUCache(2)',
           'c.put(1, 1)',
           'c.put(2, 2)',
           'c.get(1)',
           'c.put(3, 3)',
           'c.get(2)',
           'c.put(4, 4)',
           'c.get(1)',
           'c.get(3)',
           'c.get(4)']],
         ['1',
          '-1',
          '-1',
          '3',
          '4']],
        [[['c = LRUCache(1)',
           'c.put(1, 1)',
           'c.put(2, 2)',
           'c.get(1)',
           'c.get(2)',
           'c.put(2, 20)',
           'c.get(2)']],
         ['-1',
          '2',
          '20']],
        [[['c = LRUCache(2)',
           'c.put(1, 1)',
           'c.put(2, 2)',
           'c.put(1, 10)',
           'c.put(3, 3)',
           'c.get(2)',
           'c.get(1)',
           'c.get(3)']],
         ['-1',
          '10',
          '3']],
        [[['c = LRUCache(2)',
           'c.get(5)',
           'c.put(5, 0)',
           'c.get(5)',
           'c.get(6)']],
         ['-1',
          '0',
          '-1']],
        [[['c = LRUCache(3)',
           'c.put(1, 1)',
           'c.put(2, 2)',
           'c.put(3, 3)',
           'c.get(1)',
           'c.put(4, 4)',
           'c.get(2)',
           'c.get(3)',
           'c.get(1)',
           'c.get(4)',
           'c.put(5, 5)',
           'c.get(3)',
           'c.get(1)',
           'c.get(4)',
           'c.get(5)']],
         ['1',
          '-1',
          '3',
          '1',
          '4',
          '-1',
          '1',
          '4',
          '5']],
        [[['c = LRUCache(2)',
           'c.put(0, 0)',
           'c.get(0)',
           'c.put(1, -7)',
           'c.get(1)',
           'c.put(2, 2)',
           'c.get(0)',
           'c.get(1)',
           'c.get(2)']],
         ['0',
          '-7',
          '-1',
          '-7',
          '2']],
        [[['c = LRUCache(3000)',
           'for i in range(200000): c.put(i % 10001, i)',
           'c.get(6981)',
           'c.get(9980)',
           'c.get(6980)',
           'c.get(9981)',
           'c.get(0)']],
         ['197000',
          '199999',
          '-1',
          '-1',
          '-1']],
      ] },
      solution: {
        approach: `<p>Store entries in an <code>OrderedDict</code> where order = recency (left oldest, right newest). Every touch moves the key to the right end; overflow evicts from the left. If the interviewer bans OrderedDict, implement the same with a dict of key → node and a doubly linked list with sentinel head/tail (see alt).</p>`,
        code: { lang: 'python', run: true, code: `
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.od = OrderedDict()          # oldest ... newest

    def get(self, key: int) -> int:
        if key not in self.od:
            return -1
        self.od.move_to_end(key)         # mark as most recently used
        return self.od[key]

    def put(self, key: int, value: int) -> None:
        if key in self.od:
            self.od.move_to_end(key)     # update counts as a "use"
        self.od[key] = value
        if len(self.od) > self.cap:
            self.od.popitem(last=False)  # evict least recently used

c = LRUCache(2)
c.put(1, 1); c.put(2, 2)
print(c.get(1))      # 1
c.put(3, 3)          # evicts key 2
print(c.get(2))      # -1
c.put(4, 4)          # evicts key 1
print(c.get(1), c.get(3), c.get(4))   # -1 3 4
` },
        alt: [{ lang: 'python', title: 'Without OrderedDict: dict + doubly linked list', run: true, code: `
class Node:
    __slots__ = ("key", "val", "prev", "next")
    def __init__(self, key=0, val=0):
        self.key, self.val = key, val
        self.prev = self.next = None

class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.map = {}
        self.head, self.tail = Node(), Node()      # sentinels: head=oldest side
        self.head.next, self.tail.prev = self.tail, self.head

    def _unlink(self, n):
        n.prev.next, n.next.prev = n.next, n.prev

    def _push_newest(self, n):
        n.prev, n.next = self.tail.prev, self.tail
        self.tail.prev.next = n
        self.tail.prev = n

    def get(self, key):
        n = self.map.get(key)
        if n is None:
            return -1
        self._unlink(n)
        self._push_newest(n)
        return n.val

    def put(self, key, value):
        n = self.map.get(key)
        if n:
            n.val = value
            self._unlink(n)
        else:
            n = Node(key, value)
            self.map[key] = n
        self._push_newest(n)
        if len(self.map) > self.cap:
            old = self.head.next                   # least recently used
            self._unlink(old)
            del self.map[old.key]

c = LRUCache(2)
c.put(1, 1); c.put(2, 2); print(c.get(1)); c.put(3, 3); print(c.get(2))  # 1 -1
` }],
        dry: { head: ['op', 'OrderedDict after (old → new)', 'returns'], rows: [
          ['put(1,1)', '{1:1}', '—'],
          ['put(2,2)', '{1:1, 2:2}', '—'],
          ['get(1)', '{2:2, 1:1}', H.c('g', '1')],
          ['put(3,3)', '{1:1, 3:3} ' + H.c('r', '(evict 2)'), '—'],
          ['get(2)', '{1:1, 3:3}', H.c('r', '-1')],
          ['put(4,4)', '{3:3, 4:4} ' + H.c('r', '(evict 1)'), '—'],
          ['get(3)', '{4:4, 3:3}', H.c('g', '3')]
        ] },
        complexity: `<p>Time O(1) average per get/put (hash lookup + constant pointer relinks). Space O(capacity).</p>`,
        followUps: ['Make it thread-safe (a <code>threading.Lock</code> around get/put)', 'Add a TTL per key', 'LFU instead of LRU (see practice: LFU Cache)', 'How does <code>functools.lru_cache</code> implement the same idea in C?']
      }
    }]
  });

  /* ================= TOPIC 3: heapq ================= */
  topics.push({
    title: 'heapq: Priority Queues on a Plain List',
    analogy: `<p>Think of a <b>hospital emergency room</b>. Patients don't get seen in arrival order — the <b>most urgent</b> one always goes next. The triage nurse doesn't keep the whole waiting room perfectly sorted (too much work); she only makes sure the most urgent person is at the front, and when that person leaves she quickly figures out who is next. That "only the top is guaranteed" idea is a <b>heap</b>.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A heap answers one question fast: <i>"what is the smallest item right now?"</i> — even while you keep adding and removing items. Python's <code>heapq</code> module turns a <b>normal list</b> into a <b>min-heap</b>: <code>heap[0]</code> is always the smallest.</p>
${H.table(['Function', 'What it does', 'Cost'], [
  ['<code>heapq.heapify(a)</code>', 'rearrange list a into a heap, in place', 'O(n)'],
  ['<code>heapq.heappush(h, x)</code>', 'add x', 'O(log n)'],
  ['<code>heapq.heappop(h)</code>', 'remove and return the smallest', 'O(log n)'],
  ['<code>h[0]</code>', 'peek at the smallest', 'O(1)'],
  ['<code>heapq.heappushpop(h, x)</code>', 'push then pop (faster than both)', 'O(log n)'],
  ['<code>heapq.heapreplace(h, x)</code>', 'pop then push (heap must be non-empty)', 'O(log n)'],
  ['<code>heapq.nlargest(k, it, key=)</code> / <code>nsmallest</code>', 'top k without sorting everything', 'O(n log k)'],
  ['<code>heapq.merge(*sorted_iters)</code>', 'lazily merge already-sorted inputs', 'O(N log k)']
])}
<p>🔵 <b>How a list can be a tree.</b> The heap is a complete binary tree stored level by level. For index <code>i</code>: children at <code>2i+1</code> and <code>2i+2</code>, parent at <code>(i-1)//2</code>. The rule ("heap property"): every parent ≤ its children. The list is <b>not</b> sorted — only the root is guaranteed smallest.</p>
${H.arr([1, 3, 2, 5, 9, 8], { label: 'a valid min-heap (list form)', hl: { 0: 'g' } })}
<p>🔵 <b>Push</b> = put the new item at the end, then <b>sift up</b> (swap with parent while smaller). <b>Pop</b> = take the root, move the last item to the root, then <b>sift down</b> (swap with the smaller child while bigger). Both walk one root-to-leaf path → O(log n).</p>
<p>🔵 <b>Three Python-specific tricks you must know:</b></p>
<ol>
<li><b>Max-heap:</b> push <code>-x</code>, pop and negate. (Python 3.14 added <code>heapq.heappush_max</code>, <code>heappop_max</code>, <code>heapify_max</code> — but many judges still run older versions, so negation is the portable habit.)</li>
<li><b>Priorities with data:</b> push tuples <code>(priority, item)</code>. Tuples compare element by element.</li>
<li><b>Tie-breaker:</b> if two priorities are equal Python compares the next element — if that is a dict/object you get <code>TypeError</code>. Insert a counter: <code>(priority, next(counter), item)</code>.</li>
</ol>
<p><b>The "top k" pattern:</b> to keep the k <b>largest</b> items of a stream, keep a <b>min</b>-heap of size k. Its root is the smallest of the big ones — the k-th largest — and anything smaller than the root is rejected in O(1).</p>`,
    clues: [
      '"k-th largest / k-th smallest", "top k", "k closest", "k most frequent" → heap of size k (O(n log k)) or <code>nlargest</code>',
      '"merge k sorted lists/arrays/files" → heap of the k current heads, or <code>heapq.merge</code>',
      '"median of a data stream", "running median" → two heaps (max-heap low half via negation, min-heap high half)',
      '"shortest path with non-negative weights", "minimum cost to reach" → Dijkstra with <code>heapq</code>',
      '"always take the smallest/largest next", "schedule by priority", "meeting rooms needed" → greedy + heap',
      '"repeatedly combine the two smallest" (rope cost, Huffman, last stone weight) → heap',
      'k ≪ n and n up to 10<sup>6</sup> → heap beats full sort'
    ],
    code: [{ lang: 'python', run: true, title: 'heapq tour (runnable)', code: `
import heapq
import itertools

h = []
for x in [5, 3, 8, 1, 9, 2]:
    heapq.heappush(h, x)
print(h, "smallest:", h[0])         # list is a heap, NOT sorted
print([heapq.heappop(h) for _ in range(len(h))])   # pops come out sorted

a = [9, 4, 7, 1, 8]
heapq.heapify(a)                    # O(n), in place
print(a)

# max-heap via negation
mx = []
for x in [5, 3, 8]:
    heapq.heappush(mx, -x)
print("max:", -mx[0])

# top-k without sorting everything
nums = [7, 2, 9, 4, 1, 8, 6]
print(heapq.nlargest(3, nums), heapq.nsmallest(2, nums))
words = ["kiwi", "fig", "banana", "apple"]
print(heapq.nlargest(2, words, key=len))     # longest two

# tie-breaker: dicts are not comparable, so add a counter
counter = itertools.count()
tasks = []
heapq.heappush(tasks, (2, next(counter), {"name": "email"}))
heapq.heappush(tasks, (1, next(counter), {"name": "deploy"}))
heapq.heappush(tasks, (2, next(counter), {"name": "lunch"}))   # same priority, no TypeError
while tasks:
    pri, _, task = heapq.heappop(tasks)
    print(pri, task["name"])

# lazy merge of sorted inputs
print(list(heapq.merge([1, 4, 9], [2, 3, 10], [0, 5])))
` }],
    codeTitle: ['heapq tour (runnable)'],
    viz: {
      title: 'heappush (sift up) and heappop (sift down) on the list-backed tree',
      input: '5 3 8 1 9 2 | 2',
      inputLabel: 'numbers to push | how many pops   (≤ 12 numbers)',
      gen: function (input) {
        var parts = String(input === undefined ? '' : input).split('|');
        var xs = nums(parts[0], 12, 'Format: 5 3 8 1 | 2');
        var pops = parts.length > 1 ? parseInt(parts[1], 10) : 2;
        if (isNaN(pops) || pops < 0 || pops > xs.length) throw new Error('After | give the number of pops (0..count of numbers)');
        var h = [], frames = [];
        var PUSH = 'heappush(h, x):\n    h.append(x)                 # new leaf\n    i = len(h) - 1\n    while i > 0 and h[i] < h[(i-1)//2]:\n        swap(h, i, (i-1)//2)    # sift up\n        i = (i-1)//2';
        var POP = 'heappop(h):\n    last = h.pop()\n    if not h: return last\n    top, h[0] = h[0], last      # last leaf to root\n    sift_down(h, 0)             # swap with smaller child\n    return top';
        function snap(narr, hl, code, codeHl, extra) {
          var th = {}, ah = {};
          Object.keys(hl || {}).forEach(function (k) { th[k] = hl[k]; ah[k] = hl[k]; });
          var ps = [
            { type: 'tree', label: 'heap as a tree (parent ≤ children)', arr: h.slice(), hl: th },
            { type: 'array', label: 'the actual Python list h', values: h.slice(), hl: ah, showIdx: true }
          ];
          if (extra) ps.push(extra);
          ps.push(cp(code, codeHl));
          frames.push(fr(narr, ps));
        }
        snap('Start with an empty list <code>h = []</code>. Index math: children of i are <b>2i+1</b> and <b>2i+2</b>, parent is <b>(i-1)//2</b>.', {}, PUSH, {});
        xs.forEach(function (x) {
          h.push(x);
          var i = h.length - 1;
          snap('<code>heappush(h, ' + x + ')</code>: append <b>' + x + '</b> as the new last leaf (index ' + i + ').', one(i, 'ok'), PUSH, { 2: 'ok' });
          while (i > 0) {
            var p = Math.floor((i - 1) / 2);
            if (h[i] < h[p]) {
              var hl = {}; hl[i] = 'cur'; hl[p] = 'cur';
              snap(h[i] + ' &lt; parent ' + h[p] + ' (index ' + p + ') → heap rule broken → <b>swap</b> (sift up).', hl, PUSH, { 4: 'cur', 5: 'cur' });
              var t = h[i]; h[i] = h[p]; h[p] = t; i = p;
            } else {
              var hl2 = {}; hl2[i] = 'ok'; hl2[p] = 'done';
              snap(h[i] + ' ≥ parent ' + h[p] + ' → heap rule holds, stop. Only one path was touched → O(log n).', hl2, PUSH, { 4: 'ok' });
              break;
            }
          }
          if (i === 0 && h.length > 1) snap('<b>' + h[0] + '</b> climbed all the way to the root: it is the new minimum, <code>h[0]</code>.', one(0, 'sel'), PUSH, { 6: 'ok' });
        });
        var popped = [];
        for (var r = 0; r < pops; r++) {
          var top = h[0], last = h.pop();
          if (h.length) {
            h[0] = last;
            snap('<code>heappop(h)</code> takes the root <b>' + top + '</b>. The last leaf <b>' + last + '</b> is moved to the root so the tree stays complete.', one(0, 'cur'), POP, { 2: 'cur', 4: 'cur' }, { type: 'array', label: 'popped so far', values: popped.concat([top]), hl: one(popped.length, 'sel') });
            var i2 = 0;
            while (true) {
              var l = 2 * i2 + 1, rr = 2 * i2 + 2, m = i2;
              if (l < h.length && h[l] < h[m]) m = l;
              if (rr < h.length && h[rr] < h[m]) m = rr;
              if (m === i2) {
                snap('No child is smaller than ' + h[i2] + ' → sift down stops. Heap restored.', one(i2, 'ok'), POP, { 5: 'ok', 6: 'ok' }, { type: 'array', label: 'popped so far', values: popped.concat([top]) });
                break;
              }
              var hl3 = {}; hl3[i2] = 'cur'; hl3[m] = 'cur';
              snap(h[i2] + ' is bigger than its smaller child ' + h[m] + ' → swap them (sift down).', hl3, POP, { 5: 'cur' }, { type: 'array', label: 'popped so far', values: popped.concat([top]) });
              var t2 = h[i2]; h[i2] = h[m]; h[m] = t2; i2 = m;
            }
          } else {
            snap('<code>heappop(h)</code> returns <b>' + top + '</b>; the heap is now empty.', {}, POP, { 3: 'ok' }, { type: 'array', label: 'popped so far', values: popped.concat([top]) });
          }
          popped.push(top);
        }
        frames.push(fr('Pops came out in sorted order: <b>[' + popped.join(', ') + ']</b>. Popping everything is heapsort, O(n log n). Notice the list itself was never fully sorted — only <code>h[0]</code> is guaranteed.', [
          { type: 'tree', label: 'final heap', arr: h.slice(), hl: h.length ? { 0: 'sel' } : {} },
          { type: 'array', label: 'popped (ascending)', values: popped.slice() }
        ]));
        return frames;
      }
    },
    examples: [
      { title: 'K-th largest element with a size-k min-heap', html: `<p>Keep only the k biggest seen so far in a <b>min</b>-heap. When it grows past k, pop the smallest. At the end the root is the k-th largest. Cost O(n log k) time, O(k) memory — great for streams.</p>${H.arr([3, 2, 1, 5, 6, 4], { label: 'nums, k = 2' })}${H.table(['x', 'heap after', 'note'], [['3', '[3]', ''], ['2', '[2,3]', ''], ['1', '[2,3]', 'pushed 1, popped 1'], ['5', '[3,5]', 'popped 2'], ['6', '[5,6]', 'popped 3'], ['4', '[5,6]', 'popped 4 → answer ' + H.c('g', '5')]])}`, code: { lang: 'python', run: true, code: `
import heapq

def kth_largest(nums, k):
    h = []
    for x in nums:
        heapq.heappush(h, x)
        if len(h) > k:
            heapq.heappop(h)      # throw away the smallest of the k+1
    return h[0]

def kth_largest_fast(nums, k):
    h = nums[:k]
    heapq.heapify(h)
    for x in nums[k:]:
        if x > h[0]:
            heapq.heapreplace(h, x)   # pop + push in one sift
    return h[0]

print(kth_largest([3, 2, 1, 5, 6, 4], 2), kth_largest_fast([3, 2, 3, 1, 2, 4, 5, 5, 6], 4))  # 5 4
` } },
      { title: 'Merge k sorted lists with (value, index) tuples', html: `<p>Push the head of each list as <code>(value, list_id, position)</code>. Pop the smallest, push the next element from the same list. The <code>list_id</code> acts as a tie-breaker so equal values never compare further. O(N log k).</p>`, code: { lang: 'python', run: true, code: `
import heapq

def merge_k(lists):
    h = [(lst[0], i, 0) for i, lst in enumerate(lists) if lst]
    heapq.heapify(h)
    out = []
    while h:
        val, i, j = heapq.heappop(h)
        out.append(val)
        if j + 1 < len(lists[i]):
            heapq.heappush(h, (lists[i][j + 1], i, j + 1))
    return out

print(merge_k([[1, 4, 5], [1, 3, 4], [2, 6]]))       # [1, 1, 2, 3, 4, 4, 5, 6]
print(list(heapq.merge([1, 4, 5], [1, 3, 4], [2, 6])))  # built-in lazy version
` } },
      { title: 'Last stone weight: max-heap by negation', html: `<p>Repeatedly smash the two heaviest stones; if they differ, the difference goes back. "Two largest, repeatedly" → max-heap. Python's heap is min-only, so store negatives.</p>${H.arr([2, 7, 4, 1, 8, 1], { label: 'stones' })}<p>8 &amp; 7 → 1; 4 &amp; 2 → 2; 2 &amp; 1 → 1; 1 &amp; 1 → 0; left: <b>1</b>.</p>`, code: { lang: 'python', run: true, code: `
import heapq

def last_stone_weight(stones):
    h = [-s for s in stones]
    heapq.heapify(h)
    while len(h) > 1:
        a = -heapq.heappop(h)      # heaviest
        b = -heapq.heappop(h)      # second heaviest
        if a != b:
            heapq.heappush(h, -(a - b))
    return -h[0] if h else 0

print(last_stone_weight([2, 7, 4, 1, 8, 1]))  # 1
` } },
      { title: 'Meeting rooms II: heap of end times', html: `<p>Sort meetings by start. Keep a min-heap of end times of rooms in use. If the earliest-ending room is free (end ≤ start), reuse it (<code>heapreplace</code>), else open a new room. The heap size at the end is the answer.</p>${H.table(['meeting', 'heap of ends', 'rooms'], [['[0,30]', '[30]', '1'], ['[5,10]', '[10,30]', '2'], ['[15,20]', '[20,30] (reused room ending 10)', H.c('g', '2')]])}`, code: { lang: 'python', run: true, code: `
import heapq

def min_meeting_rooms(intervals):
    ends = []
    for start, end in sorted(intervals):
        if ends and ends[0] <= start:
            heapq.heapreplace(ends, end)   # reuse the room that frees first
        else:
            heapq.heappush(ends, end)      # need a new room
    return len(ends)

print(min_meeting_rooms([[0, 30], [5, 10], [15, 20]]))  # 2
` } }
    ],
    deepDive: `<p>🟣 <b>Why heapify is O(n), not O(n log n).</b> <code>heapify</code> sifts down every non-leaf from the bottom up. Half the nodes are leaves (0 work), a quarter sift at most 1 level, an eighth at most 2… Sum = n·∑ h/2<sup>h+1</sup> ≤ n. So building a heap from 10<sup>6</sup> items is ~10<sup>6</sup> steps, cheaper than pushing them one by one (~2·10<sup>7</sup>).</p>
<p><b>CPython's pop is "bottom-up".</b> <code>heappop</code> moves the last item to the root, then (in <code>_siftup</code>) pushes the smaller child up all the way to a leaf <i>without comparing against the moving item</i>, and finally sifts the item back up a little. This saves comparisons because the moved leaf usually belongs near the bottom. The C accelerator <code>_heapq</code> replaces the Python code at import time.</p>
<p><b>Stability &amp; comparisons:</b> heaps are not stable. Equal priorities compare the next tuple field; use <code>(priority, seq, item)</code> with <code>itertools.count()</code> for FIFO among equals (that is what the official docs recommend for a priority queue). <code>dataclass(order=True)</code> with <code>field(compare=False)</code> on the payload is another clean option.</p>
<p><b>Deleting / updating priorities:</b> heapq has no decrease-key. Production pattern = <b>lazy deletion</b>: push the new entry, mark the old one invalid (dict or "removed" flag), and skip invalid entries when popped. Dijkstra in Python does exactly this: <code>if d &gt; dist[u]: continue</code>.</p>
<p><b>When not to use heapq:</b> thread-safe producer/consumer → <code>queue.PriorityQueue</code> (locks, blocking get); need sorted iteration + deletes by value → <code>sortedcontainers.SortedList</code> (not in stdlib); k close to n → just <code>sorted()</code>, which runs in C with a smaller constant. <code>nlargest</code> itself switches to <code>sorted</code> when k ≥ n and to <code>max</code> when k == 1.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> boilerplate like Dijkstra or merge-k is generated instantly. The interview signal moved to <b>choosing</b> the heap (vs sort, vs bucket sort, vs quickselect), the size-k argument, and correctness details.</p>
<p><b>Use AI as a partner:</b> <code>"Compare heap vs quickselect vs bucket sort for top-k frequent with n = 10^6 distinct values — give the trade-offs, not code"</code>; <code>"Find the bug: my heap tuples sometimes raise TypeError"</code>.</p>
<p><b>Where AI goes wrong:</b> uses a <b>max</b>-heap of all n items for "k largest" (O(n log n) and O(n) memory) instead of a min-heap of size k; forgets negation when reading back (<code>-h[0]</code>); pushes <code>(dist, node)</code> where node is a custom object without <code>__lt__</code>; assumes the heap list is sorted and indexes <code>h[1]</code> as the second smallest (wrong — it's only one of the two candidates).</p>
<p><b>What you must still own:</b> the sift-up/sift-down mechanics, the O(n) heapify argument, and the instinct "k-th / top-k / merge / always-the-smallest → heap".</p>`,
    problems: [{
      title: 'Top K Frequent Elements', level: 'Medium', tags: ['heap', 'Counter', 'bucket sort'], companies: ['Amazon', 'Meta', 'Google', 'Apple', 'Uber'],
      statement: `<p>Given an integer array <code>nums</code> and an integer <code>k</code>, return the <code>k</code> most frequent elements, in any order. The answer is guaranteed to be unique. Your algorithm must be better than O(n log n).</p>`,
      constraints: `1 ≤ n ≤ 10<sup>5</sup>, -10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup>, 1 ≤ k ≤ number of distinct values`,
      example: `<p>nums = ${H.arr([1, 1, 1, 2, 2, 3])}, k = 2 → ${H.c('g', '[1, 2]')}. Counts are {1: 3, 2: 2, 3: 1}; the two biggest counts belong to 1 and 2.</p>`,
      brute: { why: `<p>Count, then sort all distinct values by count: O(n + d log d). For each element you could also recount with <code>nums.count(x)</code>, which is O(n²) — 10<sup>10</sup> steps at n = 10<sup>5</sup>. Even the sort version does more than needed: we only care about the top k, not the full order.</p>`, code: `
def top_k_brute(nums, k):
    freq = {x: nums.count(x) for x in set(nums)}      # O(n * d) recounting
    return sorted(freq, key=lambda x: freq[x], reverse=True)[:k]

print(top_k_brute([1, 1, 1, 2, 2, 3], 2))
` },
      mcq: { q: 'You keep a heap while scanning (value, count) pairs to find the k most frequent. Which heap and size?', options: ['A <b>min</b>-heap keyed by count, size k', 'A max-heap keyed by count, all d items', 'A min-heap keyed by value, size k', 'A max-heap keyed by value, size k'], answer: 0, explain: 'The min-heap of size k keeps the k biggest counts; its root is the weakest member and is evicted when something more frequent arrives: O(d log k). A max-heap of everything works but costs O(d log d) build-and-pop and O(d) memory.' },
      hints: [`<p>Hint 1: First turn the array into counts — that is a <code>Counter</code>. Now the problem is "top k of d (value, count) pairs".</p>`, `<p>Hint 2: Top k of something = min-heap of size k, or simply <code>heapq.nlargest(k, counts, key=counts.get)</code>. For strict O(n) use <b>bucket sort</b>: index = count (max n).</p>`, `<p>Hint 3: k may equal the number of distinct values (answer = all of them). Recipe: <code>c = Counter(nums)</code>; return <code>heapq.nlargest(k, c, key=c.get)</code>.</p>`],
      tests: { sig: 'int[] int -> int[]', fn: 'top_k_frequent', cmp: 'set', cases: [
        [[[1, 1, 1, 2, 2, 3], 2], [1, 2]],
        [[[1], 1], [1]],
        [[[4, 4, 5, 5, 5, 6], 2], [5, 4]],
        [[[-1, -1, 0, 0, 0, -2], 2], [0, -1]],
        [[[3, 1, 2], 3], [1, 2, 3]],
        [[[10000, -10000, 10000, -10000, 10000], 1], [10000]],
        [[{ $concat: [{ $rep: 7, n: 50000 }, { $rep: -3, n: 30000 }, { $range: [100, 1100] }] }, 2], [7, -3]],
      ] },
      solution: {
        approach: `<p>Count with <code>Counter</code> (O(n)), then pick the k keys with the largest counts using <code>heapq.nlargest</code>, which internally maintains a size-k min-heap → O(n + d log k). The bucket-sort alternative places each value in <code>buckets[count]</code> and scans from high counts down → O(n).</p>`,
        code: { lang: 'python', run: true, code: `
import heapq
from collections import Counter
from typing import List

def top_k_frequent(nums: List[int], k: int) -> List[int]:
    counts = Counter(nums)                          # value -> frequency
    return heapq.nlargest(k, counts, key=counts.get)   # size-k heap inside

def top_k_manual_heap(nums, k):
    counts = Counter(nums)
    h = []                                          # (count, value), min-heap
    for val, cnt in counts.items():
        heapq.heappush(h, (cnt, val))
        if len(h) > k:
            heapq.heappop(h)                        # drop the least frequent
    return [val for cnt, val in h]

print(top_k_frequent([1, 1, 1, 2, 2, 3], 2))        # [1, 2]
print(sorted(top_k_manual_heap([4, 4, 5, 5, 5, 6], 2)))  # [4, 5]
` },
        alt: [{ lang: 'python', title: 'O(n) bucket sort', run: true, code: `
from collections import Counter

def top_k_bucket(nums, k):
    counts = Counter(nums)
    buckets = [[] for _ in range(len(nums) + 1)]   # index = frequency
    for val, cnt in counts.items():
        buckets[cnt].append(val)
    out = []
    for cnt in range(len(buckets) - 1, 0, -1):     # highest frequency first
        for val in buckets[cnt]:
            out.append(val)
            if len(out) == k:
                return out
    return out

print(top_k_bucket([1, 1, 1, 2, 2, 3], 2))   # [1, 2]
` }],
        dry: { head: ['(value, count)', 'heap after push', 'size &gt; k?', 'heap after'], rows: [
          ['(1, 3)', '[(3,1)]', 'no', '[(3,1)]'],
          ['(2, 2)', '[(2,2), (3,1)]', 'no', '[(2,2), (3,1)]'],
          ['(3, 1)', '[(1,3), (3,1), (2,2)]', H.c('r', 'yes → pop (1,3)'), '[(2,2), (3,1)]'],
          ['end', '—', '—', H.c('g', 'answer [2, 1]')]
        ] },
        complexity: `<p>Counting O(n). Heap: O(d log k) time, O(d + k) space (d = distinct values). Bucket sort: O(n) time, O(n) space.</p>`,
        followUps: ['Return them sorted by frequency, ties by value', 'The array is a stream that never ends — keep the top k so far (heap + counts, or Count-Min Sketch for memory)', 'Top K Frequent Words with alphabetical tie-break: key <code>(-count, word)</code>']
      }
    }]
  });

  /* ================= TOPIC 4: bisect ================= */
  topics.push({
    title: 'bisect: Binary Search Without Off-by-One Bugs',
    analogy: `<p>You are putting a new book on a <b>shelf sorted by title</b>. You don't check every book — you open in the middle, see if your title comes before or after, and halve the shelf again. In a few glances you find the exact <b>gap</b> where the book belongs. <code>bisect</code> finds that gap (the <b>insertion point</b>); <code>insort</code> also slides the book in.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Hand-written binary search is famous for off-by-one bugs (<code>lo &lt;= hi</code> or <code>lo &lt; hi</code>? <code>mid + 1</code> or <code>mid</code>?). Python's <code>bisect</code> module gives you a tested, C-speed binary search that answers one precise question: <b>"at which index would x go so the list stays sorted?"</b></p>
${H.table(['Function', 'Returns', 'If x already exists…'], [
  ['<code>bisect_left(a, x)</code>', 'first index i with <code>a[i] &gt;= x</code>', 'points <b>before</b> the equal run'],
  ['<code>bisect_right(a, x)</code> (= <code>bisect</code>)', 'first index i with <code>a[i] &gt; x</code>', 'points <b>after</b> the equal run'],
  ['<code>insort_left / insort_right(a, x)</code>', 'inserts x at that point', 'O(log n) search + O(n) shift']
])}
${H.arr([1, 3, 3, 3, 5, 8], { label: 'a', idx: true, ptr: { 1: 'left(3)', 4: 'right(3)' }, hl: { 1: 'g', 2: 'g', 3: 'g' } })}
<p>For <code>x = 3</code>: <code>bisect_left</code> → <b>1</b>, <code>bisect_right</code> → <b>4</b>. So <b>count of 3s = 4 − 1 = 3</b>. For <code>x = 4</code> (missing) both return 4 — the gap between 3 and 5.</p>
<p>🔵 <b>Recipes that turn into one-liners:</b></p>
${H.table(['Question', 'Code'], [
  ['Is x present?', '<code>i = bisect_left(a, x); i &lt; len(a) and a[i] == x</code>'],
  ['How many elements &lt; x?', '<code>bisect_left(a, x)</code>'],
  ['How many elements ≤ x?', '<code>bisect_right(a, x)</code>'],
  ['Count in range [L, R]', '<code>bisect_right(a, R) - bisect_left(a, L)</code>'],
  ['First element ≥ x (ceiling)', '<code>a[bisect_left(a, x)]</code> if index &lt; len'],
  ['Last element ≤ x (floor)', '<code>a[bisect_right(a, x) - 1]</code> if index ≥ 1'],
  ['Search only a[lo:hi]', '<code>bisect_left(a, x, lo, hi)</code> — no slicing copy']
])}
<p>🔵 <b>The <code>key=</code> argument (Python 3.10+).</b> <code>bisect_left(a, x, key=f)</code> compares <code>f(a[i])</code> with <code>x</code>. Important: <code>x</code> is <b>not</b> passed through <code>f</code> — you give the already-transformed value. That enables a neat <b>binary search on the answer</b>: <code>bisect_left(range(lo, hi), True, key=feasible)</code> returns the first value where a monotone condition becomes True.</p>
<p><b>Precondition:</b> the list (or the key values) must be sorted ascending. On unsorted data bisect returns a meaningless index without any error.</p>`,
    clues: [
      '"sorted array" + "find position / first ≥ / last ≤ / insert position" → <code>bisect_left</code> / <code>bisect_right</code>',
      '"count occurrences of x in a sorted array", "how many values in [L, R]" → <code>bisect_right - bisect_left</code>',
      '"timestamps are strictly increasing; get the value at time t" → store sorted times, <code>bisect_right(times, t) - 1</code>',
      '"longest increasing subsequence", "Russian doll envelopes", N up to 10<sup>5</sup> → patience sorting with <code>bisect_left</code>, O(N log N)',
      '"minimum speed/capacity/days such that…" (monotone yes/no) → binary search on the answer, e.g. <code>bisect_left(range(...), True, key=ok)</code>',
      '"grade/tax bracket/price tier lookup by breakpoints" → <code>bisect_right(breakpoints, score)</code>',
      'O(log N) per query with many queries on a static sorted list → bisect'
    ],
    code: [{ lang: 'python', run: true, title: 'bisect tour (runnable)', code: `
from bisect import bisect_left, bisect_right, insort

a = [1, 3, 3, 3, 5, 8]
print(bisect_left(a, 3), bisect_right(a, 3))   # 1 4
print("count of 3:", bisect_right(a, 3) - bisect_left(a, 3))   # 3
print(bisect_left(a, 4), bisect_right(a, 4))   # 4 4  (missing -> same gap)
print("values in [2, 6]:", bisect_right(a, 6) - bisect_left(a, 2))   # 4

def contains(a, x):
    i = bisect_left(a, x)
    return i < len(a) and a[i] == x
print(contains(a, 5), contains(a, 4))          # True False

# floor / ceiling
x = 6
i = bisect_right(a, x)
print("floor:", a[i - 1] if i else None)       # 5
j = bisect_left(a, x)
print("ceil:", a[j] if j < len(a) else None)   # 8

# breakpoints lookup (example from the Python docs)
def grade(score, breakpoints=(60, 70, 80, 90), grades="FDCBA"):
    return grades[bisect_right(breakpoints, score)]
print([grade(s) for s in (33, 99, 77, 70, 89, 90, 100)])

# keep a list sorted while inserting
b = []
for v in [5, 1, 4, 1, 3]:
    insort(b, v)                                # O(log n) search + O(n) shift
print(b)

# key= (Python 3.10+): search records by a field; x is ALREADY a key value
people = [("ann", 19), ("bob", 25), ("cat", 31)]    # sorted by age
print(bisect_left(people, 25, key=lambda p: p[1]))  # 1

# binary search on the answer: smallest s with s*s >= 50
print(bisect_left(range(0, 100), True, key=lambda s: s * s >= 50))   # 8
` }],
    codeTitle: ['bisect tour (runnable)'],
    viz: [{
      title: 'bisect_left vs bisect_right: watching lo and hi close in',
      input: '1 3 3 3 5 8 9 | 3',
      inputLabel: 'sorted numbers | x   (≤ 14 numbers)',
      gen: function (input) {
        var parts = String(input === undefined ? '' : input).split('|');
        var a = nums(parts[0], 14, 'Format: 1 3 3 5 8 | 3');
        for (var t = 1; t < a.length; t++) if (a[t] < a[t - 1]) throw new Error('The list must be sorted ascending for bisect to work');
        var x = Number(parts[1]);
        if (parts.length < 2 || isNaN(x)) throw new Error('After | give the value x to search for');
        var frames = [];
        var CODE = 'def bisect_left(a, x, lo=0, hi=len(a)):\n    while lo < hi:\n        mid = (lo + hi) // 2\n        if a[mid] < x:        # right: a[mid] <= x\n            lo = mid + 1\n        else:\n            hi = mid\n    return lo';
        [['left', 'bisect_left', '&lt;'], ['right', 'bisect_right', '≤']].forEach(function (mode) {
          var lo = 0, hi = a.length;
          frames.push(fr('<b>' + mode[1] + '(a, ' + x + ')</b>: search window is <code>[lo, hi)</code> = [0, ' + hi + '). Invariant: everything left of lo is ' + mode[2] + ' x; everything from hi on is not.', [
            { type: 'array', label: 'a', values: a.slice(), showIdx: true, range: [lo, hi - 1], ptr: (function () { var p = {}; p[lo] = 'lo'; if (hi < a.length) p[hi] = 'hi'; return p; })() },
            vp({ lo: lo, hi: hi, x: x }, 'lo,hi', 'cur'),
            cp(CODE, { 1: 'cur' }, mode[0] === 'left' ? 'bisect_left (CPython logic)' : 'bisect_right = same, but the test is a[mid] <= x')
          ]));
          var guard = 0;
          while (lo < hi && guard++ < 20) {
            var mid = Math.floor((lo + hi) / 2);
            var goRight = mode[0] === 'left' ? a[mid] < x : a[mid] <= x;
            var ptr = {}; ptr[lo] = ptr[lo] ? ptr[lo] : 'lo'; ptr[mid] = mid === lo ? ['lo', 'mid'] : 'mid'; if (hi < a.length) ptr[hi] = 'hi';
            frames.push(fr('mid = (' + lo + ' + ' + hi + ') // 2 = <b>' + mid + '</b>, a[mid] = ' + a[mid] + '. ' + (goRight ? a[mid] + ' ' + mode[2] + ' ' + x + ' → the gap is to the <b>right</b>: lo = mid + 1 = ' + (mid + 1) + '.' : a[mid] + ' is not ' + mode[2] + ' ' + x + ' → mid could be the answer, keep it: hi = mid = ' + mid + '.'), [
              { type: 'array', label: 'a', values: a.slice(), showIdx: true, range: [lo, hi - 1], ptr: ptr, hl: one(mid, goRight ? 'done' : 'cur') },
              vp({ lo: lo, hi: hi, mid: mid, 'a[mid]': a[mid] }, 'mid', 'cur'),
              cp(CODE, goRight ? { 3: 'cur', 4: 'cur', 5: 'ok' } : { 3: 'cur', 6: 'cur', 7: 'ok' })
            ]));
            if (goRight) lo = mid + 1; else hi = mid;
          }
          var p2 = {}; if (lo < a.length) p2[lo] = mode[0] === 'left' ? 'left' : 'right';
          frames.push(fr('lo == hi = <b>' + lo + '</b> → ' + mode[1] + ' returns <b>' + lo + '</b>. ' + (mode[0] === 'left' ? 'That is the first index whose value is ≥ ' + x + '.' : 'That is the first index whose value is &gt; ' + x + '.') + ' Each step halved the window → O(log n).', [
            { type: 'array', label: 'a (insertion point marked)', values: a.slice(), showIdx: true, ptr: p2, hl: lo < a.length ? one(lo, 'sel') : {} },
            vp({ result: lo }, 'result', 'ok'),
            cp(CODE, { 8: 'ok' })
          ]));
        });
        var L = 0; while (L < a.length && a[L] < x) L++;
        var R = 0; while (R < a.length && a[R] <= x) R++;
        var hl = {}; for (var k = L; k < R; k++) hl[k] = 'ok';
        frames.push(fr('Together: bisect_left = ' + L + ', bisect_right = ' + R + ' → the run of <b>' + x + '</b>s is a[' + L + ':' + R + '], count = <b>' + (R - L) + '</b>. If x is missing, both point at the same gap.', [
          { type: 'array', label: 'a', values: a.slice(), showIdx: true, hl: hl, ptr: (function () { var p = {}; if (L < a.length) p[L] = 'L'; if (R < a.length) p[R] = p[R] ? [p[R], 'R'] : 'R'; return p; })() },
          vp({ bisect_left: L, bisect_right: R, count: R - L }, 'count', 'sel')
        ]));
        return frames;
      }
    }, {
      title: 'LIS in O(n log n): the "tails" array and bisect_left',
      input: '10 9 2 5 3 7 101 18',
      inputLabel: 'Numbers (≤ 14)',
      gen: function (input) {
        var a = nums(input, 14, 'Enter numbers, e.g. 10 9 2 5 3 7 101 18');
        var tails = [], frames = [];
        var CODE = 'tails = []\nfor x in nums:\n    i = bisect_left(tails, x)\n    if i == len(tails):\n        tails.append(x)     # extends the longest pile\n    else:\n        tails[i] = x        # better (smaller) tail\nreturn len(tails)';
        frames.push(fr('<code>tails[L]</code> = the <b>smallest possible last value</b> of an increasing subsequence of length L+1 seen so far. It is always sorted, so we can bisect it.', [
          { type: 'array', label: 'nums', values: a.slice(), showIdx: true },
          { type: 'array', label: 'tails', values: [] },
          cp(CODE, { 1: 'cur' })
        ]));
        a.forEach(function (x, idx) {
          var lo = 0, hi = tails.length;
          while (lo < hi) { var m = (lo + hi) >> 1; if (tails[m] < x) lo = m + 1; else hi = m; }
          var i = lo, before = tails.slice();
          var app = i === tails.length;
          if (app) tails.push(x); else tails[i] = x;
          frames.push(fr('x = <b>' + x + '</b>: <code>bisect_left(tails, ' + x + ')</code> = <b>' + i + '</b>. ' + (app ? x + ' is bigger than every tail → <span class="c-g">append</span>: we found an increasing subsequence of length ' + tails.length + '.' : 'Replace tails[' + i + '] = ' + before[i] + ' with the smaller <b>' + x + '</b> — a length-' + (i + 1) + ' subsequence can now end lower, leaving more room to grow.'), [
            { type: 'array', label: 'nums', values: a.slice(), showIdx: true, ptr: one(idx, 'x'), hl: one(idx, 'cur') },
            { type: 'array', label: 'tails (sorted)', values: tails.slice(), hl: one(i, app ? 'ok' : 'cur'), ptr: one(i, 'i') },
            cp(CODE, app ? { 3: 'cur', 5: 'ok' } : { 3: 'cur', 7: 'cur' })
          ]));
        });
        frames.push(fr('LIS length = len(tails) = <b>' + tails.length + '</b>. Careful: tails itself is <i>not</i> necessarily a real subsequence — only its length is the answer.', [
          { type: 'array', label: 'tails', values: tails.slice(), hl: (function () { var h = {}; tails.forEach(function (_, j) { h[j] = 'sel'; }); return h; })() },
          vp({ 'LIS length': tails.length }, 'LIS length', 'sel')
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'Count values in a range for many queries', html: `<p>Sort once (O(n log n)), then every query "how many scores in [L, R]?" is two bisects (O(log n)). With 10<sup>5</sup> queries that is ~3.4 million steps instead of 10<sup>10</sup>.</p>${H.arr([2, 4, 4, 7, 9, 12], { label: 'sorted scores' })}<p>[4, 9] → <code>bisect_right(a, 9) - bisect_left(a, 4)</code> = 5 − 1 = <b>4</b>.</p>`, code: { lang: 'python', run: true, code: `
from bisect import bisect_left, bisect_right

scores = sorted([9, 4, 12, 2, 7, 4])
queries = [(4, 9), (0, 3), (10, 20), (5, 6)]
print([bisect_right(scores, R) - bisect_left(scores, L) for L, R in queries])  # [4, 1, 1, 0]
` } },
      { title: 'Search insert position (LeetCode 35)', html: `<p>"Return the index if found, otherwise where it would be inserted" is literally the definition of <code>bisect_left</code>. Interviewers may then ask you to write it by hand — know the loop from the visualizer.</p>${H.arr([1, 3, 5, 6], { label: 'nums' })}<p>target 5 → 2, target 2 → 1, target 7 → 4.</p>`, code: { lang: 'python', run: true, code: `
from bisect import bisect_left

def search_insert(nums, target):
    return bisect_left(nums, target)

def search_insert_by_hand(nums, target):
    lo, hi = 0, len(nums)            # half-open window [lo, hi)
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo

print([search_insert([1, 3, 5, 6], t) for t in (5, 2, 7, 0)])          # [2, 1, 4, 0]
print([search_insert_by_hand([1, 3, 5, 6], t) for t in (5, 2, 7, 0)])  # same
` } },
      { title: 'Binary search on the answer with key= (Koko eating bananas)', html: `<p>"Find the minimum speed k so Koko finishes all piles within h hours." Hours needed only <b>decreases</b> as speed grows, so <code>can_finish(k)</code> is False…False, True…True. <code>bisect_left</code> on a <code>range</code> with <code>key=can_finish</code> finds the first True without building a list (ranges support indexing in O(1)).</p>${H.table(['speed', '1', '2', '3', '4', '5'], [['hours for [3,6,7,11]', '27', '15', '10', H.c('g', '8'), '8'], ['≤ h = 8?', 'F', 'F', 'F', H.c('g', 'T'), 'T']])}`, code: { lang: 'python', run: true, code: `
from bisect import bisect_left

def min_eating_speed(piles, h):
    def can_finish(k):
        return sum((p + k - 1) // k for p in piles) <= h   # ceil division
    speeds = range(1, max(piles) + 1)
    return speeds[bisect_left(speeds, True, key=can_finish)]   # Python 3.10+

print(min_eating_speed([3, 6, 7, 11], 8))          # 4
print(min_eating_speed([30, 11, 23, 4, 20], 5))    # 30
` } },
      { title: 'Sliding window median with insort', html: `<p>Keep the current window as a sorted list: <code>insort</code> the new element, remove the outgoing one with <code>bisect_left</code> + <code>pop</code>. Each step is O(k) because of shifting, but the shift is a fast C <code>memmove</code>, so for k ≤ 10<sup>4</sup> this is a practical interview answer (the two-heap version is O(log k)).</p>`, code: { lang: 'python', run: true, code: `
from bisect import insort, bisect_left

def median_sliding_window(nums, k):
    window = sorted(nums[:k])
    out = []
    for i in range(k, len(nums) + 1):
        mid = k // 2
        out.append(float(window[mid]) if k % 2 else (window[mid - 1] + window[mid]) / 2)
        if i == len(nums):
            break
        window.pop(bisect_left(window, nums[i - k]))   # remove outgoing
        insort(window, nums[i])                         # add incoming
    return out

print(median_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 3))  # [1.0, -1.0, -1.0, 3.0, 5.0, 6.0]
` } }
    ],
    deepDive: `<p>🟣 <b>Under the hood.</b> <code>bisect</code> has a C implementation (<code>_bisect</code>) — the loop is exactly the half-open <code>[lo, hi)</code> search from the visualizer, using only <code>&lt;</code> comparisons (<code>a[mid] &lt; x</code> for left, <code>x &lt; a[mid]</code> for right). Because it only uses <code>__lt__</code>, it works on any sorted sequence: tuples, strings, objects with <code>__lt__</code>, even a <code>range</code> or a custom class with <code>__getitem__</code> and <code>__len__</code> (a "virtual" array).</p>
<p><b>Why half-open?</b> With <code>[lo, hi)</code> the empty window is <code>lo == hi</code>, the answer can be <code>len(a)</code> (insert at the end) without special cases, and <code>mid = (lo + hi) // 2</code> never overflows in Python (unbounded ints; in Java/C++ you'd write <code>lo + (hi - lo) / 2</code>).</p>
<p><b>insort cost reality:</b> search O(log n) but insertion shifts the tail → O(n). n insertions → O(n²) worst case, yet the constant is tiny (memmove of pointers). For 10<sup>5</sup> inserts it's usually fine; for 10<sup>6</sup>+ with deletes use <code>sortedcontainers.SortedList</code> (a list of sorted sub-lists, ~O(log n) amortised; available on LeetCode but not in the stdlib) or a Fenwick tree over compressed values.</p>
<p><b>key= gotchas (3.10+):</b> the key is applied to elements, <b>not</b> to x; the key must be monotone non-decreasing over the sequence; <code>insort(a, x, key=f)</code> <i>does</i> apply f to x (it needs the key of the item being inserted) — an asymmetry that surprises people.</p>
<p><b>LIS correctness:</b> tails stays sorted because replacing tails[i] with x keeps tails[i-1] &lt; x ≤ old tails[i]. Using <code>bisect_left</code> gives <b>strictly</b> increasing LIS; <code>bisect_right</code> gives the longest <b>non-decreasing</b> subsequence. To reconstruct the actual sequence, store for each x the index of its predecessor (the tail at position i−1 when it was placed).</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI writes binary search loops quickly but is famously inconsistent about boundaries. Knowing <code>bisect</code> lets you replace a fragile 10-line loop with one auditable call — and lets you <b>review</b> AI-generated loops against the precise left/right definitions.</p>
<p><b>Use AI as a partner:</b> <code>"Generate a brute-force checker and 1000 random tests comparing my binary search with bisect_left"</code> — property-based testing (e.g. with Hypothesis) catches off-by-ones in seconds.</p>
<p><b>Where AI goes wrong:</b> mixes up <code>bisect_left</code>/<code>bisect_right</code> for "count ≤ x"; passes <code>key=</code> and also transforms x (double-transform); calls bisect on unsorted data; claims <code>insort</code> is O(log n); uses <code>key=</code> on Python 3.8/3.9 judges where it doesn't exist.</p>
<p><b>What you must still own:</b> the invariant ("left of lo is &lt; x, from hi on is ≥ x"), recognising monotone predicates for "binary search on the answer", and explaining why LIS tails gives the right length.</p>`,
    problems: [{
      title: 'Longest Increasing Subsequence', level: 'Medium', tags: ['binary search', 'bisect', 'DP', 'patience sorting'], companies: ['Google', 'Amazon', 'Microsoft', 'Meta'],
      statement: `<p>Given an integer array <code>nums</code>, return the length of the longest <b>strictly increasing</b> subsequence. A subsequence keeps the original order but may skip elements.</p>`,
      constraints: `1 ≤ n ≤ 2500 (LeetCode) — follow-up: solve for n ≤ 10<sup>5</sup> in O(n log n). -10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup>`,
      example: `<p>nums = ${H.arr([10, 9, 2, 5, 3, 7, 101, 18], { hl: { 2: 'g', 4: 'g', 5: 'g', 6: 'g' } })} → <b>${H.c('g', '4')}</b>, e.g. 2, 3, 7, 101 (or 2, 5, 7, 18).</p>`,
      brute: { why: `<p>Classic DP: <code>dp[i]</code> = LIS ending at i = 1 + max(dp[j]) over j &lt; i with nums[j] &lt; nums[i]. That is O(n²): 6 million steps at n = 2500 (fine), but 10<sup>10</sup> at n = 10<sup>5</sup>. The waste: for each i we rescan all j, though we only need "the best length whose last value is &lt; x" — a sorted structure can answer that in O(log n).</p>`, code: `
def lis_quadratic(nums):
    dp = [1] * len(nums)                 # dp[i] = LIS ending exactly at i
    for i in range(len(nums)):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)

print(lis_quadratic([10, 9, 2, 5, 3, 7, 101, 18]))  # 4
` },
      mcq: { q: 'tails = [2, 5, 7] and the next number is 3. What happens?', options: ['tails becomes [2, 3, 7]', 'tails becomes [2, 5, 7, 3]', 'tails becomes [3, 5, 7]', 'nothing changes'], answer: 0, explain: '<code>bisect_left([2,5,7], 3)</code> = 1, so 3 replaces 5: a length-2 subsequence can now end with 3 instead of 5, which is better for future growth.' },
      hints: [`<p>Hint 1: For each length L, only the <b>smallest possible ending value</b> matters — a smaller tail can be extended by more future numbers.</p>`, `<p>Hint 2: Those smallest tails form a sorted list. For each x, find the first tail ≥ x with <code>bisect_left</code>: replace it, or append if x is bigger than all.</p>`, `<p>Hint 3: Strictly increasing → <code>bisect_left</code> (equal values replace, they don't extend). Recipe: tails = []; for x: i = bisect_left(tails, x); append or tails[i] = x; return len(tails).</p>`],
      tests: { sig: 'int[] -> int', fn: 'length_of_lis', cases: [
        [[[10, 9, 2, 5, 3, 7, 101, 18]], 4],
        [[[0, 1, 0, 3, 2, 3]], 4],
        [[[7, 7, 7, 7]], 1],
        [[[1]], 1],
        [[[5, 4, 3, 2, 1]], 1],
        [[[1, 2, 2, 3, 3, 4]], 4],
        [[[-5, -3, -4, -1, -2]], 3],
        [[[-10000, 10000, -10000, 10000]], 2],
        [[{ $range: [0, 100000] }], 100000],
        [[{ $concat: [{ $range: [50000, 0, -1] }, { $range: [0, 50000] }] }], 50000],
        [[{ $rep: 5, n: 100000 }], 1],
      ] },
      solution: {
        approach: `<p>Patience sorting: maintain <code>tails</code>, where <code>tails[L]</code> is the smallest tail of any increasing subsequence of length L+1. It is sorted, so each number is placed with one <code>bisect_left</code>. The final length of tails is the LIS length.</p>`,
        code: { lang: 'python', run: true, code: `
from bisect import bisect_left
from typing import List

def length_of_lis(nums: List[int]) -> int:
    tails = []                        # tails[L] = min tail of an inc. subseq of length L+1
    for x in nums:
        i = bisect_left(tails, x)     # first tail >= x
        if i == len(tails):
            tails.append(x)           # x extends the longest subsequence
        else:
            tails[i] = x              # x is a smaller tail for length i+1
    return len(tails)

print(length_of_lis([10, 9, 2, 5, 3, 7, 101, 18]))  # 4
print(length_of_lis([0, 1, 0, 3, 2, 3]))            # 4
print(length_of_lis([7, 7, 7, 7]))                  # 1 (strict)
` },
        alt: [{ lang: 'python', title: 'Reconstruct one actual LIS', run: true, code: `
from bisect import bisect_left

def lis_sequence(nums):
    tails, tails_idx = [], []         # values and their indices in nums
    parent = [-1] * len(nums)
    for i, x in enumerate(nums):
        pos = bisect_left(tails, x)
        if pos > 0:
            parent[i] = tails_idx[pos - 1]   # predecessor = tail of length pos
        if pos == len(tails):
            tails.append(x); tails_idx.append(i)
        else:
            tails[pos] = x; tails_idx[pos] = i
    out, k = [], tails_idx[-1] if tails_idx else -1
    while k != -1:
        out.append(nums[k])
        k = parent[k]
    return out[::-1]

print(lis_sequence([10, 9, 2, 5, 3, 7, 101, 18]))   # [2, 3, 7, 18]
` }],
        dry: { head: ['x', 'bisect_left(tails, x)', 'action', 'tails'], rows: [
          ['10', '0', 'append', '[10]'], ['9', '0', 'replace', '[9]'], ['2', '0', 'replace', '[2]'],
          ['5', '1', 'append', '[2, 5]'], ['3', '1', 'replace', '[2, 3]'], ['7', '2', 'append', '[2, 3, 7]'],
          ['101', '3', 'append', '[2, 3, 7, 101]'], ['18', '3', 'replace', H.c('g', '[2, 3, 7, 18] → 4')]
        ] },
        complexity: `<p>Time O(n log n): one O(log n) bisect per element. Space O(n) for tails (O(n) extra for reconstruction).</p>`,
        followUps: ['Longest non-decreasing subsequence → <code>bisect_right</code>', 'Count the number of LIS (LeetCode 673) — needs O(n²) DP or a Fenwick tree', 'Russian Doll Envelopes: sort by (w asc, h desc) then LIS on h']
      }
    }]
  });

  /* ================= TOPIC 5: itertools ================= */
  topics.push({
    title: 'itertools: Combinatorics and Pipelines in One Line',
    analogy: `<p>itertools is a <b>kitchen of gadgets</b>. Instead of chopping every vegetable by hand with nested loops, you grab the right tool: the <b>grater</b> (<code>accumulate</code>) turns a list into running totals, the <b>combination lock</b> (<code>product</code>) spins through every code, the <b>card dealer</b> (<code>combinations</code>/<code>permutations</code>) deals every hand, and the <b>label maker</b> (<code>groupby</code>) bundles items that sit next to each other. And every gadget works <b>lazily</b> — it only makes the next item when you ask, like a chef who cooks to order.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> <code>itertools</code> is a set of fast, C-implemented building blocks that produce <b>iterators</b> — values come one at a time, so even "all 10! orderings" never sits in memory at once. In interviews it replaces nested loops and recursion for brute force, prefix sums, flattening and run-length grouping.</p>
${H.table(['Tool', 'Example', 'Output', 'Count'], [
  ['<code>product(A, B)</code>', "<code>product('ab', 'xy')</code>", 'ax ay bx by', '|A|·|B|'],
  ['<code>product(A, repeat=n)</code>', "<code>product('01', repeat=3)</code>", '000 001 … 111', '|A|<sup>n</sup>'],
  ['<code>permutations(A, r)</code>', "<code>permutations('abc', 2)</code>", 'ab ac ba bc ca cb', 'n!/(n−r)!'],
  ['<code>combinations(A, r)</code>', "<code>combinations('abc', 2)</code>", 'ab ac bc', 'C(n, r)'],
  ['<code>combinations_with_replacement</code>', "<code>cwr('ab', 2)</code>", 'aa ab bb', 'C(n+r−1, r)'],
  ['<code>accumulate(xs, f, initial=)</code>', '<code>accumulate([1,2,3])</code>', '1 3 6', 'n (+1)'],
  ['<code>groupby(xs, key)</code>', "<code>groupby('aabccc')</code>", "('a',aa) ('b',b) ('c',ccc)", 'runs'],
  ['<code>chain.from_iterable(xss)</code>', '<code>[[1,2],[3]]</code>', '1 2 3', 'flatten one level'],
  ['<code>pairwise(xs)</code> (3.10+)', '<code>pairwise([1,4,9])</code>', '(1,4) (4,9)', 'n−1'],
  ['<code>batched(xs, n)</code> (3.12+)', '<code>batched(range(5), 2)</code>', '(0,1) (2,3) (4,)', '⌈n/k⌉']
])}
<p>Also handy: <code>count(start, step)</code> (infinite counter), <code>cycle(xs)</code>, <code>repeat(x, n)</code>, <code>islice(it, start, stop)</code> (slice any iterator), <code>zip_longest(a, b, fillvalue=)</code>, <code>takewhile</code>/<code>dropwhile</code>, <code>starmap(f, pairs)</code>, <code>compress(data, mask)</code>, <code>tee(it, n)</code>.</p>
<p>🔵 <b>Two rules that cause most bugs:</b></p>
<ol>
<li><b>Iterators are single-use.</b> <code>p = permutations(xs)</code>; after one loop over <code>p</code> it is empty. Wrap in <code>list()</code> if you need it twice.</li>
<li><b><code>groupby</code> only groups <i>consecutive</i> equal keys</b> — like Unix <code>uniq</code>. <code>groupby('abab')</code> gives four groups. Sort by the same key first if you want SQL-style GROUP BY (or just use <code>defaultdict(list)</code>).</li>
</ol>
<p>🔵 <b>Mind the explosion.</b> Combinatorial tools are perfect when the input is tiny and the problem says "all possible". Know the numbers: 10! ≈ 3.6 million (OK), 12! ≈ 479 million (too slow in Python), 2<sup>20</sup> ≈ 10<sup>6</sup> subsets (OK), C(30, 15) ≈ 1.5·10<sup>8</sup> (too slow). <code>math.comb(n, k)</code>, <code>math.perm(n, k)</code> and <code>math.factorial(n)</code> count them without generating.</p>`,
    clues: [
      '"all possible combinations / every pair / choose k of n" with n ≤ 20 → <code>combinations</code> (or bitmask)',
      '"all arrangements / orderings" with n ≤ 8–9 → <code>permutations</code>',
      '"every string of length n over an alphabet", "all digit combinations", "letter combinations of a phone number" → <code>product(..., repeat=n)</code> / <code>product(*lists)</code>',
      '"running sum / prefix sums / running max" → <code>accumulate</code> (with <code>initial=0</code> for the leading zero)',
      '"compress consecutive characters", "count runs", "longest streak" → <code>groupby</code>',
      '"adjacent pairs / differences / is it sorted?" → <code>pairwise</code> (3.10+) or <code>zip(xs, xs[1:])</code>',
      '"flatten a list of lists (one level)" → <code>chain.from_iterable</code>',
      '"first N items of an infinite/huge sequence" → <code>islice</code>'
    ],
    code: [{ lang: 'python', run: true, title: 'itertools tour (runnable)', code: `
from itertools import (product, permutations, combinations, combinations_with_replacement,
                       accumulate, groupby, chain, islice, count, pairwise, zip_longest)
import operator
import math

print(["".join(p) for p in product("ab", "xy")])         # ['ax', 'ay', 'bx', 'by']
print(["".join(p) for p in product("01", repeat=3)])     # 8 binary strings
print(list(permutations([1, 2, 3], 2)))                  # 6 ordered pairs
print(list(combinations([1, 2, 3, 4], 2)))               # 6 unordered pairs
print(list(combinations_with_replacement("ab", 2)))      # aa ab bb
print(math.comb(30, 15), math.perm(5, 2), math.factorial(10))

nums = [3, 1, 4, 1, 5]
print(list(accumulate(nums)))                     # prefix sums [3, 4, 8, 9, 14]
print(list(accumulate(nums, initial=0)))          # [0, 3, 4, 8, 9, 14]
print(list(accumulate(nums, max)))                # running max
print(list(accumulate(nums, operator.mul)))       # running product

s = "aaabccdddd"
print([(ch, len(list(g))) for ch, g in groupby(s)])   # run-length encoding
print([k for k, _ in groupby("abab")])           # ['a', 'b', 'a', 'b'] consecutive only!

print(list(chain.from_iterable([[1, 2], [3], [], [4, 5]])))   # flatten one level
print(list(islice(count(10, 5), 4)))             # [10, 15, 20, 25] from an infinite iterator
print([b - a for a, b in pairwise([1, 4, 9, 16])])   # differences [3, 5, 7]
print(list(zip_longest("abc", "x", fillvalue="-")))

p = permutations("ab")
print(list(p), list(p))                          # second list is EMPTY: iterator used up
` }],
    codeTitle: ['itertools tour (runnable)'],
    viz: [{
      title: 'groupby: bundling consecutive runs (run-length encoding)',
      input: 'aaabccdddd',
      inputLabel: 'A string (≤ 14 chars)',
      gen: function (input) {
        var s = String(input === undefined ? '' : input).replace(/\s+/g, '');
        if (!s.length) throw new Error('Type a string, e.g. aaabccdddd');
        if (s.length > 14) throw new Error('Use at most 14 characters');
        var a = s.split(''), out = [], frames = [];
        var CODE = 'out = []\nfor ch, group in groupby(s):\n    n = len(list(group))     # consume the run\n    out.append(ch + str(n))\nreturn "".join(out)';
        frames.push(fr('<code>groupby</code> walks the string once and starts a <b>new group every time the key changes</b>. It never looks back, so it is O(n) and lazy.', [
          { type: 'array', label: 's', values: a.slice(), showIdx: true },
          { type: 'array', label: 'out', values: [] },
          cp(CODE, { 1: 'cur' })
        ]));
        var i = 0;
        while (i < a.length) {
          var j = i;
          while (j + 1 < a.length && a[j + 1] === a[i]) j++;
          var hl = {}; for (var t = 0; t < i; t++) hl[t] = 'done'; for (t = i; t <= j; t++) hl[t] = 'cur';
          frames.push(fr('New key <b>' + esc(a[i]) + '</b> starts at index ' + i + '. groupby keeps yielding items while the next char is still <b>' + esc(a[i]) + '</b>' + (j + 1 < a.length ? ', and stops at index ' + (j + 1) + ' because <b>' + esc(a[j + 1]) + '</b> ≠ ' + esc(a[i]) + '.' : ' until the string ends.'), [
            { type: 'array', label: 's', values: a.slice(), showIdx: true, range: [i, j], hl: hl },
            vp({ ch: a[i], 'run': '[' + a.slice(i, j + 1).map(function (c) { return "'" + c + "'"; }).join(', ') + ']' }, 'ch', 'cur'),
            { type: 'array', label: 'out', values: out.slice() },
            cp(CODE, { 2: 'cur', 3: 'cur' })
          ]));
          out.push(a[i] + (j - i + 1));
          frames.push(fr('Run length = <b>' + (j - i + 1) + '</b> → append <b>' + esc(a[i] + (j - i + 1)) + '</b>.', [
            { type: 'array', label: 's', values: a.slice(), showIdx: true, range: [i, j], hl: hl },
            { type: 'array', label: 'out', values: out.slice(), hl: one(out.length - 1, 'ok') },
            cp(CODE, { 4: 'ok' })
          ]));
          i = j + 1;
        }
        var seen = {}, rep = [];
        a.forEach(function (c) { seen[c] = (seen[c] || 0) + 1; });
        out.forEach(function (o) { var c = o.charAt(0); if (rep.indexOf(c) < 0) rep.push(c); });
        frames.push(fr('Result <b>' + esc(out.join('')) + '</b>. ' + (rep.length < out.length ? '<span class="c-y">Notice a key appeared in more than one group</span> — groupby groups only <i>consecutive</i> items. Sort first (or use a Counter) for a real GROUP BY.' : 'Each key appeared in exactly one run here; on input like "abab" you would get repeated keys, because groupby groups only consecutive items.'), [
          { type: 'array', label: 'out', values: out.slice(), hl: (function () { var h = {}; out.forEach(function (_, k) { h[k] = 'sel'; }); return h; })() },
          { type: 'map', label: 'compare: Counter(s) (non-consecutive)', entries: Object.keys(seen).map(function (k) { return [k, seen[k]]; }) },
          cp(CODE, { 5: 'ok' })
        ]));
        return frames;
      }
    }, {
      title: 'product(*lists): the odometer behind "all combinations"',
      input: '23',
      inputLabel: 'Phone digits 2-9 (≤ 3 digits)',
      gen: function (input) {
        var MAP = { 2: 'abc', 3: 'def', 4: 'ghi', 5: 'jkl', 6: 'mno', 7: 'pqrs', 8: 'tuv', 9: 'wxyz' };
        var d = String(input === undefined ? '' : input).replace(/\s+/g, '');
        if (!/^[2-9]{1,3}$/.test(d)) throw new Error('Type 1-3 digits from 2 to 9, e.g. 23');
        var lists = d.split('').map(function (c) { return MAP[c].split(''); });
        var idx = lists.map(function () { return 0; }), frames = [], res = [];
        var total = lists.reduce(function (p, l) { return p * l.length; }, 1);
        var CODE = 'pools = [MAP[c] for c in digits]\nfor combo in product(*pools):\n    out.append("".join(combo))';
        frames.push(fr('<code>product</code> works like a car <b>odometer</b>: the <b>rightmost</b> wheel spins fastest; when it wraps around, the wheel to its left ticks once. Total = ' + lists.map(function (l) { return l.length; }).join(' × ') + ' = <b>' + total + '</b> combos.', [
          { type: 'table', label: 'pools (one wheel per digit)', columns: ['digit', 'letters'], rows: d.split('').map(function (c) { return [c, MAP[c]]; }) },
          cp(CODE, { 1: 'cur' })
        ]));
        var guard = 0;
        while (guard++ < 80) {
          var combo = idx.map(function (k, w) { return lists[w][k]; }).join('');
          res.push(combo);
          var grid = lists.map(function (l) { return l; });
          var hl = {};
          idx.forEach(function (k, w) { hl[w + ',' + k] = 'cur'; });
          var rows = grid.map(function (l) { var r = l.slice(); while (r.length < 4) r.push(''); return r; });
          if (res.length <= 6 || res.length === total) {
            frames.push(fr('Wheel positions ' + JSON.stringify(idx) + ' → combo <b>' + esc(combo) + '</b> (#' + res.length + ' of ' + total + ').', [
              { type: 'grid', label: 'wheels (rows) and current letter', rowHead: d.split(''), colHead: ['0', '1', '2', '3'], rows: rows, hl: hl },
              { type: 'array', label: 'out', values: res.slice(-8), hl: one(Math.min(res.length, 8) - 1, 'ok') },
              cp(CODE, { 2: 'cur', 3: 'ok' })
            ]));
          }
          var w = idx.length - 1;
          while (w >= 0) { idx[w]++; if (idx[w] < lists[w].length) break; idx[w] = 0; w--; }
          if (w < 0) break;
        }
        frames.push(fr('The leftmost wheel wrapped → done. <b>' + res.length + '</b> combinations, produced lazily one at a time. Cost O(total × digits).', [
          { type: 'array', label: 'all combos', values: res.slice(0, 16) },
          vp({ count: res.length, formula: lists.map(function (l) { return l.length; }).join('×') }, 'count', 'sel')
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'All subsets with combinations (power set)', html: `<p>The power set = combinations of every size r from 0 to n. That is 2<sup>n</sup> subsets — fine for n ≤ 20. <code>chain.from_iterable</code> stitches the r-sized groups together.</p>${H.table(['r', 'combinations([1,2,3], r)'], [['0', '()'], ['1', '(1) (2) (3)'], ['2', '(1,2) (1,3) (2,3)'], ['3', '(1,2,3)']])}`, code: { lang: 'python', run: true, code: `
from itertools import chain, combinations

def power_set(xs):
    return list(chain.from_iterable(combinations(xs, r) for r in range(len(xs) + 1)))

print(power_set([1, 2, 3]))
# Subset-sum brute force: does any subset of [3, 34, 4, 12, 5, 2] sum to 9?
print(any(sum(c) == 9 for c in power_set([3, 34, 4, 12, 5, 2])))   # True (4+5)
` } },
      { title: 'Largest time from 4 digits with permutations', html: `<p>LeetCode 949: only 4! = 24 orderings, so try them all. <code>permutations</code> of a sorted input come out in lexicographic order, but here we just keep the max valid one.</p>${H.arr([1, 2, 3, 4], { label: 'digits' })}<p>Valid times: 12:34, 12:43, 13:24 … the largest valid is <b>23:41</b>.</p>`, code: { lang: 'python', run: true, code: `
from itertools import permutations

def largest_time(digits):
    best = ""
    for h1, h2, m1, m2 in permutations(digits):
        hh, mm = h1 * 10 + h2, m1 * 10 + m2
        if hh < 24 and mm < 60:
            best = max(best, f"{hh:02d}:{mm:02d}")   # zero-padded strings compare correctly
    return best

print(largest_time([1, 2, 3, 4]))  # 23:41
print(largest_time([5, 5, 5, 5]))  # '' (no valid time)
` } },
      { title: 'Best time to buy and sell stock with accumulate', html: `<p>Profit if we sell on day i = price[i] − (minimum price so far). <code>accumulate(prices, min)</code> gives the running minimum in one line.</p>${H.table(['day', '0', '1', '2', '3', '4', '5'], [['price', '7', '1', '5', '3', '6', '4'], ['running min', '7', '1', '1', '1', '1', '1'], ['profit', '0', '0', '4', '2', H.c('g', '5'), '3']])}`, code: { lang: 'python', run: true, code: `
from itertools import accumulate

def max_profit(prices):
    return max(p - lo for p, lo in zip(prices, accumulate(prices, min)))

print(max_profit([7, 1, 5, 3, 6, 4]))  # 5
print(max_profit([7, 6, 4, 3, 1]))     # 0
` } },
      { title: 'Longest streak and string compression with groupby', html: `<p>"Max consecutive ones" and "string compression" are both run problems: <code>groupby</code> hands you each run with its key. Use <code>sum(1 for _ in g)</code> to count a run without building a list.</p>${H.arr([1, 1, 0, 1, 1, 1], { label: 'nums', hl: { 3: 'g', 4: 'g', 5: 'g' } })}`, code: { lang: 'python', run: true, code: `
from itertools import groupby

def max_consecutive_ones(nums):
    return max((sum(1 for _ in g) for k, g in groupby(nums) if k == 1), default=0)

def compress(s):
    return "".join(ch + (str(n) if n > 1 else "") for ch, n in
                   ((k, sum(1 for _ in g)) for k, g in groupby(s)))

print(max_consecutive_ones([1, 1, 0, 1, 1, 1]))  # 3
print(compress("aabcccccaaa"))                    # a2bc5a3
` } }
    ],
    deepDive: `<p>🟣 <b>Laziness and memory.</b> Every itertools function returns an iterator implemented in C. <code>combinations(range(30), 15)</code> is created instantly and uses O(r) memory; only <code>list()</code> would try to materialise 155 million tuples. CPython even <b>reuses the result tuple</b> when you don't keep a reference to it, which makes tight loops over <code>product</code>/<code>combinations</code> surprisingly fast.</p>
<p><b>Ordering guarantees:</b> <code>combinations</code> and <code>permutations</code> emit in <b>lexicographic order of input positions</b>, so sorted input → sorted output. They treat elements by <b>position, not value</b>: <code>permutations([1,1,2])</code> yields 6 tuples with duplicates. For unique permutations use <code>set(...)</code> (fine for small n) or a backtracking solution with a Counter, which avoids generating duplicates at all.</p>
<p><b>groupby internals:</b> the group sub-iterators share the parent iterator. Advancing the outer loop invalidates the previous group — so <code>list(groupby(s))</code> gives groups that look empty. Always consume <code>g</code> inside the loop (e.g. <code>len(list(g))</code>).</p>
<p><b>tee</b> buffers values the slowest copy hasn't read — if one copy runs far ahead, memory grows to O(n); then just use a list. <b>accumulate</b> takes any binary function (<code>max</code>, <code>operator.mul</code>, <code>lambda a, b: …</code>) and <code>initial=</code> (3.8+). <b>pairwise</b> (3.10) and <b>batched</b> (3.12; <code>strict=True</code> in 3.13) are newer — on older judges use <code>zip(xs, xs[1:])</code> and <code>zip(*[iter(xs)] * n)</code>.</p>
<p><b>Production:</b> itertools pipelines (generator expressions + <code>islice</code>/<code>chain</code>) stream files and DB cursors with constant memory. The "recipes" section of the docs (and the <code>more-itertools</code> package) contains sliding windows, <code>chunked</code>, <code>unique_everseen</code>, etc.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI is great at turning a nested-loop brute force into a one-line itertools pipeline — and equally good at producing a pipeline that is accidentally exponential. Your job shifts to <b>estimating the count</b> (n!, 2<sup>n</sup>, C(n,k)) before running anything.</p>
<p><b>Use AI as a partner:</b> <code>"Here is my O(n!) permutations brute force — write a property test that compares it against my optimised solution for n ≤ 7"</code>. Brute force with itertools is the perfect <b>oracle</b> for testing clever code.</p>
<p><b>Where AI goes wrong:</b> uses <code>groupby</code> on unsorted data expecting SQL semantics; iterates the same iterator twice; calls <code>pairwise</code>/<code>batched</code> on Python versions that lack them; materialises <code>list(permutations(range(12)))</code> and runs out of memory; confuses <code>combinations</code> (order irrelevant) with <code>permutations</code>.</p>
<p><b>What you must still own:</b> mapping the wording ("choose", "arrange", "every string") to the right generator and its count, and knowing when the interviewer expects you to write the backtracking yourself instead.</p>`,
    problems: [{
      title: 'Letter Combinations of a Phone Number', level: 'Medium', tags: ['itertools.product', 'backtracking', 'string'], companies: ['Amazon', 'Google', 'Meta', 'Uber'],
      statement: `<p>Given a string of digits 2–9, return all letter combinations the number could represent on a classic phone keypad (2 = abc, 3 = def, …, 7 = pqrs, 9 = wxyz). Return an empty list for an empty input.</p>`,
      constraints: `0 ≤ len(digits) ≤ 4, digits[i] in '2'..'9'`,
      example: `<p>digits = "23" → ${H.c('g', '["ad","ae","af","bd","be","bf","cd","ce","cf"]')} — 3 letters × 3 letters = 9 combinations.</p>`,
      brute: { why: `<p>Hard-coding nested loops works only for a fixed length (two digits = two loops). For variable length people write string concatenation inside recursion, creating many temporary strings. The real issue is not speed (output is at most 4<sup>4</sup> = 256) but <b>generality</b>: we need a cartesian product of a variable number of lists.</p>`, code: `
def letter_combos_two_digits(digits):
    # Only works when len(digits) == 2 -- not general!
    m = {"2": "abc", "3": "def", "4": "ghi", "5": "jkl",
         "6": "mno", "7": "pqrs", "8": "tuv", "9": "wxyz"}
    out = []
    for a in m[digits[0]]:
        for b in m[digits[1]]:
            out.append(a + b)
    return out

print(letter_combos_two_digits("23"))
` },
      mcq: { q: 'Which call produces all combos for digits "23" given <code>pools = ["abc", "def"]</code>?', options: ['<code>product(*pools)</code>', '<code>product(pools)</code>', '<code>combinations("abcdef", 2)</code>', '<code>permutations(pools)</code>'], answer: 0, explain: '<code>product(*pools)</code> unpacks the two strings as separate iterables → cartesian product. <code>product(pools)</code> treats the list as ONE iterable and yields 1-tuples of whole strings.' },
      hints: [`<p>Hint 1: Each digit contributes exactly one letter, and every choice is independent → this is a <b>cartesian product</b> of the letter lists.</p>`, `<p>Hint 2: Build <code>pools = [MAP[d] for d in digits]</code> and call <code>itertools.product(*pools)</code>; join each tuple.</p>`, `<p>Hint 3: Edge case: empty digits must return <code>[]</code>, but <code>product()</code> with no pools yields ONE empty tuple → guard it. Recipe: if not digits: return []; return ["".join(t) for t in product(*pools)].</p>`],
      tests: { sig: 'string -> string[]', fn: 'letter_combinations', cmp: 'set', cases: [
        [['23'], ['ad', 'ae', 'af', 'bd', 'be', 'bf', 'cd', 'ce', 'cf']],
        [[''], []],
        [['2'], ['a', 'b', 'c']],
        [['7'], ['p', 'q', 'r', 's']],
        [['79'], ['pw', 'px', 'py', 'pz', 'qw', 'qx', 'qy', 'qz', 'rw', 'rx', 'ry', 'rz', 'sw', 'sx', 'sy', 'sz']],
        [['9'], ['w', 'x', 'y', 'z']],
        [['2345'], ['adgj', 'adgk', 'adgl', 'adhj', 'adhk', 'adhl', 'adij', 'adik', 'adil', 'aegj', 'aegk', 'aegl', 'aehj', 'aehk', 'aehl', 'aeij', 'aeik', 'aeil', 'afgj', 'afgk', 'afgl', 'afhj', 'afhk', 'afhl', 'afij', 'afik', 'afil', 'bdgj', 'bdgk', 'bdgl', 'bdhj', 'bdhk', 'bdhl', 'bdij', 'bdik', 'bdil', 'begj', 'begk', 'begl', 'behj', 'behk', 'behl', 'beij', 'beik', 'beil', 'bfgj', 'bfgk', 'bfgl', 'bfhj', 'bfhk', 'bfhl', 'bfij', 'bfik', 'bfil', 'cdgj', 'cdgk', 'cdgl', 'cdhj', 'cdhk', 'cdhl', 'cdij', 'cdik', 'cdil', 'cegj', 'cegk', 'cegl', 'cehj', 'cehk', 'cehl', 'ceij', 'ceik', 'ceil', 'cfgj', 'cfgk', 'cfgl', 'cfhj', 'cfhk', 'cfhl', 'cfij', 'cfik', 'cfil']],
        [['7979'], ['pwpw', 'pwpx', 'pwpy', 'pwpz', 'pwqw', 'pwqx', 'pwqy', 'pwqz', 'pwrw', 'pwrx', 'pwry', 'pwrz', 'pwsw', 'pwsx', 'pwsy', 'pwsz', 'pxpw', 'pxpx', 'pxpy', 'pxpz', 'pxqw', 'pxqx', 'pxqy', 'pxqz', 'pxrw', 'pxrx', 'pxry', 'pxrz', 'pxsw', 'pxsx', 'pxsy', 'pxsz', 'pypw', 'pypx', 'pypy', 'pypz', 'pyqw', 'pyqx', 'pyqy', 'pyqz', 'pyrw', 'pyrx', 'pyry', 'pyrz', 'pysw', 'pysx', 'pysy', 'pysz', 'pzpw', 'pzpx', 'pzpy', 'pzpz', 'pzqw', 'pzqx', 'pzqy', 'pzqz', 'pzrw', 'pzrx', 'pzry', 'pzrz', 'pzsw', 'pzsx', 'pzsy', 'pzsz', 'qwpw', 'qwpx', 'qwpy', 'qwpz', 'qwqw', 'qwqx', 'qwqy', 'qwqz', 'qwrw', 'qwrx', 'qwry', 'qwrz', 'qwsw', 'qwsx', 'qwsy', 'qwsz', 'qxpw', 'qxpx', 'qxpy', 'qxpz', 'qxqw', 'qxqx', 'qxqy', 'qxqz', 'qxrw', 'qxrx', 'qxry', 'qxrz', 'qxsw', 'qxsx', 'qxsy', 'qxsz', 'qypw', 'qypx', 'qypy', 'qypz', 'qyqw', 'qyqx', 'qyqy', 'qyqz', 'qyrw', 'qyrx', 'qyry', 'qyrz', 'qysw', 'qysx', 'qysy', 'qysz', 'qzpw', 'qzpx', 'qzpy', 'qzpz', 'qzqw', 'qzqx', 'qzqy', 'qzqz', 'qzrw', 'qzrx', 'qzry', 'qzrz', 'qzsw', 'qzsx', 'qzsy', 'qzsz', 'rwpw', 'rwpx', 'rwpy', 'rwpz', 'rwqw', 'rwqx', 'rwqy', 'rwqz', 'rwrw', 'rwrx', 'rwry', 'rwrz', 'rwsw', 'rwsx', 'rwsy', 'rwsz', 'rxpw', 'rxpx', 'rxpy', 'rxpz', 'rxqw', 'rxqx', 'rxqy', 'rxqz', 'rxrw', 'rxrx', 'rxry', 'rxrz', 'rxsw', 'rxsx', 'rxsy', 'rxsz', 'rypw', 'rypx', 'rypy', 'rypz', 'ryqw', 'ryqx', 'ryqy', 'ryqz', 'ryrw', 'ryrx', 'ryry', 'ryrz', 'rysw', 'rysx', 'rysy', 'rysz', 'rzpw', 'rzpx', 'rzpy', 'rzpz', 'rzqw', 'rzqx', 'rzqy', 'rzqz', 'rzrw', 'rzrx', 'rzry', 'rzrz', 'rzsw', 'rzsx', 'rzsy', 'rzsz', 'swpw', 'swpx', 'swpy', 'swpz', 'swqw', 'swqx', 'swqy', 'swqz', 'swrw', 'swrx', 'swry', 'swrz', 'swsw', 'swsx', 'swsy', 'swsz', 'sxpw', 'sxpx', 'sxpy', 'sxpz', 'sxqw', 'sxqx', 'sxqy', 'sxqz', 'sxrw', 'sxrx', 'sxry', 'sxrz', 'sxsw', 'sxsx', 'sxsy', 'sxsz', 'sypw', 'sypx', 'sypy', 'sypz', 'syqw', 'syqx', 'syqy', 'syqz', 'syrw', 'syrx', 'syry', 'syrz', 'sysw', 'sysx', 'sysy', 'sysz', 'szpw', 'szpx', 'szpy', 'szpz', 'szqw', 'szqx', 'szqy', 'szqz', 'szrw', 'szrx', 'szry', 'szrz', 'szsw', 'szsx', 'szsy', 'szsz']],
      ] },
      solution: {
        approach: `<p>Map each digit to its letters and take the cartesian product with <code>itertools.product(*pools)</code>, which is exactly an odometer over the wheels. Interviewers often follow up with "write it without itertools" → backtracking (alt).</p>`,
        code: { lang: 'python', run: true, code: `
from itertools import product
from typing import List

KEYPAD = {"2": "abc", "3": "def", "4": "ghi", "5": "jkl",
          "6": "mno", "7": "pqrs", "8": "tuv", "9": "wxyz"}

def letter_combinations(digits: str) -> List[str]:
    if not digits:
        return []                                   # product() would yield [()]
    pools = [KEYPAD[d] for d in digits]
    return ["".join(combo) for combo in product(*pools)]

print(letter_combinations("23"))
print(letter_combinations(""))
print(len(letter_combinations("7999")))             # 4*4*4*4 = 256
` },
        alt: [{ lang: 'python', title: 'Backtracking without itertools', run: true, code: `
KEYPAD = {"2": "abc", "3": "def", "4": "ghi", "5": "jkl",
          "6": "mno", "7": "pqrs", "8": "tuv", "9": "wxyz"}

def letter_combinations(digits):
    if not digits:
        return []
    out, path = [], []
    def backtrack(i):
        if i == len(digits):
            out.append("".join(path))
            return
        for ch in KEYPAD[digits[i]]:
            path.append(ch)        # choose
            backtrack(i + 1)       # explore
            path.pop()             # un-choose
    backtrack(0)
    return out

print(letter_combinations("23"))
` }],
        dry: { head: ['wheel positions', 'combo', 'note'], rows: [
          ['(0, 0)', 'ad', 'start'], ['(0, 1)', 'ae', 'right wheel ticks'], ['(0, 2)', 'af', ''],
          ['(1, 0)', 'bd', 'right wheel wraps → left ticks'], ['…', '…', ''], ['(2, 2)', 'cf', H.c('g', '9th and last')]
        ] },
        complexity: `<p>Time O(4<sup>n</sup> · n) (up to 4 letters per digit, each string has length n). Space O(4<sup>n</sup> · n) for the output; the generator itself uses O(n).</p>`,
        followUps: ['Return them lazily (yield) instead of a list', 'Only return combos that are real dictionary words — prune with a trie during backtracking', 'Count the combinations without generating (multiply pool sizes)']
      }
    }]
  });

  /* ================= TOPIC 6: functools.lru_cache / cache ================= */
  topics.push({
    title: 'functools.lru_cache & cache: Memoization in One Line',
    analogy: `<p>A student doing homework writes every answer she works out on a <b>sticky note</b> on her desk. When the same question appears again, she reads the sticky note instead of solving it again. If her desk only fits 128 notes, she throws away the note she hasn't looked at for the longest time. That desk is <code>@lru_cache(maxsize=128)</code>; a desk with unlimited space is <code>@cache</code>.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Many recursive solutions (Fibonacci, climbing stairs, word break, grid paths, knapsack) solve the <b>same sub-problem again and again</b>. <b>Memoization</b> = remember the answer for each set of arguments. In Python you get it by adding one decorator line on top of the recursive function — this is "top-down DP".</p>
${H.table(['Decorator', 'Meaning', 'When'], [
  ['<code>@functools.cache</code> (3.9+)', 'unbounded memo = <code>lru_cache(maxsize=None)</code>', 'interview DP — fastest, simplest'],
  ['<code>@functools.lru_cache(maxsize=128)</code>', 'keep only the 128 most recently used results', 'long-running services with bounded memory'],
  ['<code>@lru_cache(maxsize=None)</code>', 'same as <code>@cache</code>', 'works on Python 3.2–3.8 too'],
  ['<code>typed=True</code>', '<code>f(3)</code> and <code>f(3.0)</code> cached separately', 'rarely needed']
])}
<p>🔵 <b>See the effect.</b> Plain recursive <code>fib(30)</code> makes about <b>2.7 million</b> calls (O(φ<sup>n</sup>)). With <code>@cache</code> it makes <b>31</b> misses and ~28 hits → O(n).</p>
${H.table(['fib(n)', 'calls without cache', 'calls with @cache'], [['10', '177', '19'], ['20', '21 891', '39'], ['30', '2 692 537', '59']])}
<p>🔵 <b>Inspecting and resetting:</b> <code>f.cache_info()</code> → <code>CacheInfo(hits, misses, maxsize, currsize)</code>; <code>f.cache_clear()</code> empties it; <code>f.__wrapped__</code> is the original function.</p>
<p>🔵 <b>Three rules:</b></p>
<ol>
<li><b>Arguments must be hashable</b> — they become a dict key. Lists/dicts/sets raise <code>TypeError: unhashable type</code>. Pass a tuple, a frozenset, or (better) an index into an outer list.</li>
<li><b>The function must be pure</b> for the arguments it receives: same args → same result, no dependence on changing outer state (or the cache returns stale answers).</li>
<li><b>Scope the cache to one input.</b> On LeetCode, define the cached helper <b>inside</b> the method so each test case gets a fresh cache; a module-level cached function remembers answers across test cases (wrong results if it reads outer data, plus memory growth).</li>
</ol>
<p><b>Top-down vs bottom-up:</b> the memoized recursion is usually the fastest way to a <i>correct</i> DP. Converting it to a bottom-up table (loops) removes recursion-depth limits and function-call overhead — mention this trade-off in interviews.</p>`,
    clues: [
      '"number of ways", "minimum cost/steps", "can you reach / can you form" with overlapping choices → top-down DP with <code>@cache</code>',
      'You wrote a recursion and the same arguments appear in several branches of the call tree → memoize',
      'State fits in a few ints/strings (index, remaining capacity, mask) → hashable → <code>@cache</code> works directly',
      '"expensive pure function called repeatedly" (config parsing, permission lookups) in production → <code>@lru_cache(maxsize=N)</code>',
      'N up to ~10<sup>4</sup> recursion depth or more → memoized recursion may hit RecursionError → bottom-up instead',
      'Arguments are lists/grids → pass indices, or convert to tuple, before caching'
    ],
    code: [{ lang: 'python', run: true, title: 'lru_cache / cache tour (runnable)', code: `
from functools import cache, lru_cache

calls = 0
def fib_plain(n):
    global calls
    calls += 1
    return n if n < 2 else fib_plain(n - 1) + fib_plain(n - 2)

fib_plain(20)
print("plain calls:", calls)            # 21891

@cache
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print(fib(20), fib.cache_info())        # misses=21, hits=18
print(fib(90))                          # instant, exact big int

@lru_cache(maxsize=2)                   # tiny cache to watch eviction
def square(x):
    print("  computing", x)
    return x * x

square(1); square(2); square(1)         # 1 is a hit
square(3)                               # evicts 2 (least recently used)
square(2)                               # recomputed
print(square.cache_info())              # hits=1 misses=4 maxsize=2 currsize=2
square.cache_clear()
print(square.cache_info())

try:
    @cache
    def total(xs):
        return sum(xs)
    total([1, 2, 3])
except TypeError as e:
    print("TypeError:", e)              # unhashable type: 'list'
print(total((1, 2, 3)))                 # tuples are fine
` }],
    codeTitle: ['lru_cache / cache tour (runnable)'],
    viz: {
      title: '@cache on fib(n): call stack, hits and misses',
      input: '6',
      inputLabel: 'n (1–12)',
      gen: function (input) {
        var n = parseInt(input, 10);
        if (isNaN(n) || n < 1 || n > 12) throw new Error('Enter n between 1 and 12');
        var CODE = '@cache\ndef fib(n):\n    if n < 2:\n        return n\n    return fib(n - 1) + fib(n - 2)';
        var memo = {}, order = [], stack = [], frames = [], hits = 0, misses = 0, plain = 0;
        (function cnt(k) { plain++; if (k >= 2) { cnt(k - 1); cnt(k - 2); } })(n);
        function snap(narr, hlKey, cls, codeHl) {
          var h = {}; if (hlKey !== null && hlKey !== undefined) h[String(hlKey)] = cls;
          frames.push(fr(narr, [
            { type: 'stack', label: 'call stack (top = running)', items: stack.slice(), hl: stack.length ? one(stack.length - 1, 'cur') : {} },
            { type: 'map', label: 'cache {n: fib(n)}', entries: order.map(function (k) { return ['fib(' + k + ')', memo[k]]; }), hl: hlKey !== null && hlKey !== undefined ? (function () { var o = {}; o['fib(' + hlKey + ')'] = cls; return o; })() : {} },
            vp({ hits: hits, misses: misses }, cls === 'ok' ? 'hits' : (cls === 'cur' ? 'misses' : ''), cls === 'ok' ? 'ok' : 'cur', 'cache_info()'),
            cp(CODE, codeHl || {})
          ]));
        }
        function f(k) {
          if (Object.prototype.hasOwnProperty.call(memo, k)) {
            hits++;
            snap('Call <b>fib(' + k + ')</b> → found in the cache → <span class="c-g">HIT</span>, return ' + memo[k] + ' immediately. The whole sub-tree under it is skipped.', k, 'ok', { 1: 'ok' });
            return memo[k];
          }
          misses++;
          stack.push('fib(' + k + ')');
          snap('Call <b>fib(' + k + ')</b> → not in the cache → <span class="c-y">MISS</span>, actually run the body.', null, 'cur', { 2: 'cur' });
          var r;
          if (k < 2) { r = k; }
          else { var a = f(k - 1); var b = f(k - 2); r = a + b; }
          memo[k] = r; order.push(k);
          snap('fib(' + k + ') = <b>' + r + '</b> → store it in the cache, then return to the caller (pop the stack).', k, 'sel', { 4: k < 2 ? 'ok' : '', 5: k < 2 ? '' : 'ok' });
          stack.pop();
          return r;
        }
        var res = f(n);
        frames.push(fr('Done: fib(' + n + ') = <b>' + res + '</b> with <b>' + misses + '</b> misses and <b>' + hits + '</b> hits = ' + (hits + misses) + ' calls. Without the cache: <b>' + plain + '</b> calls. Linear instead of exponential.', [
          { type: 'bars', label: 'calls: with cache vs without', values: [hits + misses, plain], idxLabels: ['@cache', 'plain'], texts: [String(hits + misses), String(plain)] },
          { type: 'map', label: 'final cache', entries: order.map(function (k) { return ['fib(' + k + ')', memo[k]]; }) },
          vp({ hits: hits, misses: misses, currsize: order.length }, 'hits', 'ok', 'cache_info()')
        ]));
        return frames;
      }
    },
    examples: [
      { title: 'Unique paths in a grid with obstacles — state = (r, c)', html: `<p>Ways to reach (r, c) = ways from above + ways from the left. Two ints are a perfect cache key. The grid itself is <b>not</b> an argument (unhashable) — it's read from the enclosing scope, which is fine because it doesn't change during the call.</p>${H.table(['', 'c0', 'c1', 'c2'], [['r0', '1', '1', '1'], ['r1', '1', H.c('r', '#'), '1'], ['r2', '1', '1', H.c('g', '2')]])}`, code: { lang: 'python', run: true, code: `
from functools import cache

def unique_paths_with_obstacles(grid):
    R, C = len(grid), len(grid[0])

    @cache                                  # fresh cache per call of the outer function
    def ways(r, c):
        if r < 0 or c < 0 or grid[r][c] == 1:
            return 0
        if r == 0 and c == 0:
            return 1
        return ways(r - 1, c) + ways(r, c - 1)

    return ways(R - 1, C - 1)

print(unique_paths_with_obstacles([[0, 0, 0], [0, 1, 0], [0, 0, 0]]))  # 2
` } },
      { title: '0/1 knapsack top-down: state = (index, capacity left)', html: `<p>Each item: skip it, or take it if it fits. The state <code>(i, cap)</code> has at most n × W combinations, so memoization makes it O(n·W). Without the cache it would be O(2<sup>n</sup>).</p>${H.table(['item', 'weight', 'value'], [['0', '1', '1'], ['1', '3', '4'], ['2', '4', '5'], ['3', '5', '7']])}<p>Capacity 7 → take items 1 and 2 (weight 7, value <b>9</b>).</p>`, code: { lang: 'python', run: true, code: `
from functools import cache

def knapsack(weights, values, W):
    n = len(weights)

    @cache
    def best(i, cap):
        if i == n:
            return 0
        skip = best(i + 1, cap)
        if weights[i] <= cap:
            return max(skip, values[i] + best(i + 1, cap - weights[i]))
        return skip

    ans = best(0, W)
    print("states computed:", best.cache_info().currsize)
    return ans

print(knapsack([1, 3, 4, 5], [1, 4, 5, 7], 7))  # 9
` } },
      { title: 'The hidden-state bug: caching something that is not pure', html: `<p>If the cached function reads a <b>mutable outer variable</b>, the cache returns answers computed for the <i>old</i> value. This is the classic bug when a module-level <code>@cache</code> helper is reused across LeetCode test cases.</p>${H.table(['call', 'outer data', 'returned', 'correct?'], [['count_ge(5)', '[1, 6, 9]', '2', H.c('g', 'yes')], ['count_ge(5)', '[7, 8, 9, 10]', '2 (stale!)', H.c('r', 'no — should be 4')]])}`, code: { lang: 'python', run: true, code: `
from functools import cache

data = [1, 6, 9]

@cache
def count_ge(x):
    return sum(1 for v in data if v >= x)    # depends on OUTER mutable state!

print(count_ge(5))       # 2
data = [7, 8, 9, 10]
print(count_ge(5))       # still 2 -> stale cached answer
count_ge.cache_clear()
print(count_ge(5))       # 4 after clearing
` } },
      { title: 'Memoizing methods without leaking memory', html: `<p><code>@lru_cache</code> on a method includes <code>self</code> in the key and keeps every instance alive as long as the cache lives (a memory leak in long-running services). For a per-instance computed value use <code>functools.cached_property</code>; for per-call DP put the cached helper inside the method.</p>`, code: { lang: 'python', run: true, code: `
from functools import cached_property, cache

class Report:
    def __init__(self, rows):
        self.rows = rows

    @cached_property                 # computed once per instance, stored on it
    def total(self):
        print("  summing...")
        return sum(self.rows)

    def ways_to_climb(self, n):
        @cache                       # helper cache lives only during this call
        def ways(k):
            return 1 if k <= 1 else ways(k - 1) + ways(k - 2)
        return ways(n)

r = Report([3, 4, 5])
print(r.total, r.total)          # 'summing...' printed once
print(r.ways_to_climb(10))       # 89
` } }
    ],
    deepDive: `<p>🟣 <b>How lru_cache is built.</b> CPython's <code>lru_cache</code> is implemented in C (<code>_functools._lru_cache_wrapper</code>). It builds a key from the arguments (<code>_make_key</code>: positional args, then a marker, then keyword items; a single int/str argument is used directly as the key for speed), looks it up in a dict, and — for bounded caches — keeps entries on a <b>circular doubly linked list</b> so it can move hits to the front and evict the oldest in O(1) (the same design as the LRU Cache problem). With <code>maxsize=None</code> there is no linked list at all — just a dict — which is why <code>@cache</code> is slightly faster.</p>
<p><b>Keyword order matters:</b> <code>f(a=1, b=2)</code> and <code>f(b=2, a=1)</code> may be cached as two separate entries, and <code>f(1)</code> vs <code>f(a=1)</code> too. Always call memoized helpers the same way.</p>
<p><b>Recursion depth:</b> memoized recursion still recurses — <code>fib(5000)</code> on an empty cache needs ~5000 nested frames and raises <code>RecursionError</code> with the default limit of 1000. Fixes: warm the cache bottom-up (<code>for i in range(n): fib(i)</code>), raise the limit carefully, or write the DP iteratively. Each memoized call also costs a hash + dict lookup — a bottom-up list-based DP is often 2–5× faster in CPython.</p>
<p><b>Thread safety:</b> the cache's internal structure is protected, but the wrapped function may run more than once for the same key if two threads miss simultaneously — fine for pure functions, a problem if the function has side effects.</p>
<p><b>Production uses:</b> caching config/feature-flag parsing, regex compilation (<code>re</code> already caches internally), DNS-like lookups. For TTL-based or distributed caching use Redis or <code>cachetools.TTLCache</code>; <code>lru_cache</code> has no expiry.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> "add <code>@cache</code> to the recursion" is the first thing an assistant suggests for any DP — and often it's right. The interview now probes whether you can name the <b>state</b>, count the states (that's your complexity), and convert to bottom-up when depth or speed matters.</p>
<p><b>Use AI as a partner:</b> <code>"Here is my memoized recursion — convert it to a bottom-up table and explain the iteration order"</code>; <code>"What is the number of distinct states for this cache key?"</code>.</p>
<p><b>Where AI goes wrong:</b> passes lists into cached functions (TypeError), caches functions that read mutable globals (stale answers), puts <code>@cache</code> on a module-level helper reused across test cases, forgets RecursionError for n ≈ 10<sup>5</sup>, and claims the complexity is O(n) when the state space is really O(n·W).</p>
<p><b>What you must still own:</b> defining the recurrence and base cases, proving overlapping sub-problems exist, computing time = (#states) × (work per state), and explaining the LRU eviction mechanism if asked.</p>`,
    problems: [{
      title: 'Word Break', level: 'Medium', tags: ['DP', 'memoization', 'lru_cache', 'string'], companies: ['Amazon', 'Google', 'Meta', 'Bloomberg'],
      statement: `<p>Given a string <code>s</code> and a list of dictionary words <code>wordDict</code>, return <code>True</code> if <code>s</code> can be split into a sequence of one or more dictionary words (words may be reused).</p>`,
      constraints: `1 ≤ len(s) ≤ 300, 1 ≤ len(wordDict) ≤ 1000, 1 ≤ len(word) ≤ 20, all lowercase, words unique`,
      example: `<p>s = "leetcode", words = ["leet", "code"] → ${H.c('g', 'True')} ("leet" + "code"). s = "catsandog", words = ["cats","dog","sand","and","cat"] → ${H.c('r', 'False')}: every split leaves "og" or similar unmatched.</p>`,
      brute: { why: `<p>Try every prefix that is a word and recurse on the rest. For an input like "aaaa…ab" with words ["a", "aa", "aaa"], the same suffix is re-solved through exponentially many paths: O(2<sup>n</sup>). The wasted work: <code>can(i)</code> ("can the suffix starting at i be split?") depends only on i, yet we recompute it every time we reach i.</p>`, code: `
def word_break_brute(s, word_dict):
    words = set(word_dict)
    def can(i):                                  # no memo -> exponential
        if i == len(s):
            return True
        return any(s[i:j] in words and can(j) for j in range(i + 1, len(s) + 1))
    return can(0)

print(word_break_brute("leetcode", ["leet", "code"]))  # True
` },
      mcq: { q: 'What is the right cache key for the memoized helper?', options: ['The start index i of the remaining suffix', 'The remaining suffix string <code>s[i:]</code>', 'The list of words used so far', 'Nothing — Word Break has no overlapping sub-problems'], answer: 0, explain: 'The answer for a suffix depends only on where it starts. An int key is cheap; the suffix string would also work but costs O(n) to slice and hash; the list of used words is unhashable and wrong (it makes states distinct that are really the same).' },
      hints: [`<p>Hint 1: Define <code>can(i)</code> = "can s[i:] be segmented?". Then <code>can(i)</code> is True if some word matches at i and <code>can(i + len(word))</code> is True.</p>`, `<p>Hint 2: <code>can(i)</code> only depends on i → only n+1 states. Put <code>@cache</code> on it. Use a <code>set</code> for O(1) word lookups, and only try lengths up to the longest word.</p>`, `<p>Hint 3: Base case <code>can(len(s)) = True</code>. Recipe: for L in 1..maxlen: if s[i:i+L] in words and can(i+L): return True; return False. Bottom-up: dp[i] over i from n down to 0.</p>`],
      tests: { sig: 'string string[] -> bool', fn: 'word_break', cases: [
        [['leetcode', ['leet', 'code']], true],
        [['applepenapple', ['apple', 'pen']], true],
        [['catsandog', ['cats', 'dog', 'sand', 'and', 'cat']], false],
        [['a', ['a']], true],
        [['a', ['b']], false],
        [['aaaaaaa', ['aaaa', 'aaa']], true],
        [['cars', ['car', 'ca', 'rs']], true],
        [['abcd', ['a', 'abc', 'b', 'cd']], true],
        [['aaaaaaa', ['aaaa', 'aa']], false],
        [[{ $concat: [{ $rep: 'a', n: 200 }, 'b'] }, ['a', 'aa', 'aaa']], false],
        [[{ $rep: 'a', n: 300 }, ['aa', 'aaa']], true],
        [[{ $rep: 'a', n: 299 }, ['aaaa', 'aaaaaa']], false],
        [[{ $rep: 'a', n: 300 }, ['aaaa', 'aaaaaa']], true],
      ] },
      solution: {
        approach: `<p>Top-down DP: <code>can(i)</code> tries every dictionary word length at position i and recurses. With <code>@cache</code> each i is solved once. Limiting lengths to the longest word keeps work per state ≤ 20 slices. The bottom-up alt fills <code>dp</code> from the end and avoids recursion entirely.</p>`,
        code: { lang: 'python', run: true, code: `
from functools import cache
from typing import List

def word_break(s: str, word_dict: List[str]) -> bool:
    words = set(word_dict)
    max_len = max(map(len, words))

    @cache
    def can(i: int) -> bool:          # can s[i:] be split into words?
        if i == len(s):
            return True
        for j in range(i + 1, min(len(s), i + max_len) + 1):
            if s[i:j] in words and can(j):
                return True
        return False

    return can(0)

print(word_break("leetcode", ["leet", "code"]))                          # True
print(word_break("applepenapple", ["apple", "pen"]))                     # True
print(word_break("catsandog", ["cats", "dog", "sand", "and", "cat"]))    # False
print(word_break("a" * 200 + "b", ["a", "aa", "aaa"]))                   # False, instantly
` },
        alt: [{ lang: 'python', title: 'Bottom-up (no recursion)', run: true, code: `
def word_break(s, word_dict):
    words = set(word_dict)
    max_len = max(map(len, words))
    n = len(s)
    dp = [False] * (n + 1)          # dp[i] = s[i:] can be segmented
    dp[n] = True
    for i in range(n - 1, -1, -1):
        for j in range(i + 1, min(n, i + max_len) + 1):
            if dp[j] and s[i:j] in words:
                dp[i] = True
                break
    return dp[0]

print(word_break("leetcode", ["leet", "code"]))   # True
` }],
        dry: { head: ['call', 'tries', 'result', 'cache'], rows: [
          ['can(0)', '"l","le","lee","leet"✓ → can(4)', '…', 'miss'],
          ['can(4)', '"c","co","cod","code"✓ → can(8)', '…', 'miss'],
          ['can(8)', 'i == len(s)', H.c('g', 'True'), 'miss → stored'],
          ['can(4)', '—', H.c('g', 'True'), 'stored'],
          ['can(0)', '—', H.c('g', 'True'), 'stored']
        ] },
        complexity: `<p>States: n + 1. Work per state: up to L slices of length ≤ L (L = longest word) → O(n · L²) time, O(n) cache + recursion depth.</p>`,
        followUps: ['Word Break II — return all sentences (memoize lists of sentences per i)', 'Huge dictionary — use a trie to stop early when no word has the prefix', 'Recursion depth for len(s) = 10<sup>5</sup>? Switch to bottom-up']
      }
    }]
  });

  /* ================= TOPIC 7: Sorting with keys ================= */
  topics.push({
    title: 'Sorting with Keys: Tuples, Stability & cmp_to_key',
    analogy: `<p>A teacher sorts exam papers. She doesn't compare whole papers — she looks at <b>one label</b> on each (the score) and sorts by that. If two papers have the same score, she leaves them in the order they were in the pile (that's <b>stability</b>). Want "highest score first, then alphabetical by name"? She writes a <b>two-part label</b> on each paper: (−score, name). That label is the <code>key</code>.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Python sorts with <code>sorted(iterable)</code> (returns a new list) or <code>lst.sort()</code> (in place, returns <code>None</code>). Instead of writing a comparison function, you give a <b>key function</b> that turns each item into a value Python already knows how to compare — a number, a string, or a <b>tuple</b>.</p>
${H.table(['Goal', 'Code'], [
  ['by length', '<code>sorted(words, key=len)</code>'],
  ['case-insensitive', '<code>sorted(names, key=str.lower)</code>'],
  ['by 2nd field', '<code>sorted(pairs, key=lambda p: p[1])</code> or <code>key=itemgetter(1)</code>'],
  ['by attribute', '<code>sorted(people, key=attrgetter("age"))</code>'],
  ['descending', '<code>sorted(xs, reverse=True)</code>'],
  ['score desc, then name asc', '<code>sorted(rows, key=lambda r: (-r.score, r.name))</code>'],
  ['dict by value', '<code>sorted(d.items(), key=lambda kv: kv[1])</code>'],
  ['pairwise rule ("a before b if…")', '<code>sorted(xs, key=cmp_to_key(cmp))</code>']
])}
<p>🔵 <b>Tuples compare left to right</b>, like words in a dictionary: <code>(1, 'b') &lt; (2, 'a')</code> because 1 &lt; 2; only on a tie does the second item matter. So a tuple key = "sort by this, then by that".</p>
<p>🔵 <b>Mixed directions.</b> For numbers, negate: <code>(-score, name)</code>. You can't negate a string, so either use <b>two stable passes</b> (sort by the secondary key first, then by the primary key) or <code>cmp_to_key</code>.</p>
<p>🔵 <b>Stability</b> — Python's sort (Timsort, with the Powersort merge policy since 3.11) is <b>guaranteed stable</b>: items with equal keys keep their original relative order. That's what makes the two-pass trick correct:</p>
<pre>rows.sort(key=lambda r: r.name)                 # secondary first
rows.sort(key=lambda r: r.score, reverse=True)  # primary last</pre>
<p>(<code>reverse=True</code> also preserves stability — equal items are <i>not</i> reversed.)</p>
<p>🔵 <b>cmp_to_key</b> wraps an old-style comparator <code>cmp(a, b)</code> returning negative / 0 / positive. Use it when the order is defined by a relation between two items, e.g. "put a before b if a+b &gt; b+a" (Largest Number).</p>
<p>Also: <code>min</code>, <code>max</code>, <code>heapq.nlargest</code> and <code>itertools.groupby</code> take the same <code>key=</code>. Sorting costs <b>O(n log n)</b>, but Timsort is O(n) on already-sorted or reverse-sorted data and fast on data with long sorted runs.</p>`,
    clues: [
      '"sort by X, then by Y" / "ties broken by" → tuple key <code>(x, y)</code>',
      '"descending by count, ascending by name" → <code>key=lambda w: (-count[w], w)</code>',
      '"arrange numbers to form the largest number", "custom order defined by pairs" → <code>cmp_to_key</code>',
      '"merge intervals", "meeting rooms", "minimum arrows" → sort by start (or end) first: <code>intervals.sort(key=lambda x: x[0])</code>',
      '"relative order must be preserved" / "stable" → Python sort is stable; multi-pass works',
      '"sort characters by frequency", "custom alphabet order" → key from a Counter or a rank dict',
      'N ≤ 10<sup>5</sup>–10<sup>6</sup> → one O(N log N) sort then a linear sweep is usually the intended solution'
    ],
    code: [{ lang: 'python', run: true, title: 'Sorting with keys (runnable)', code: `
from functools import cmp_to_key
from operator import itemgetter, attrgetter
from collections import namedtuple

words = ["banana", "Apple", "fig", "cherry", "date"]
print(sorted(words))                         # uppercase first (ASCII order)
print(sorted(words, key=str.lower))          # case-insensitive
print(sorted(words, key=len))                # stable: equal lengths keep order
print(sorted(words, key=lambda w: (len(w), w.lower())))

Student = namedtuple("Student", "name score")
rows = [Student("ann", 90), Student("bob", 85), Student("cat", 90), Student("dan", 85)]
print([s.name for s in sorted(rows, key=lambda s: (-s.score, s.name))])  # score desc, name asc
print([s.name for s in sorted(rows, key=attrgetter("score"))])          # stable ties

# two stable passes: name DESC (secondary) then score ASC (primary)
tmp = sorted(rows, key=attrgetter("name"), reverse=True)
print([s.name for s in sorted(tmp, key=attrgetter("score"))])

pairs = [(1, "b"), (3, "a"), (2, "c")]
print(sorted(pairs, key=itemgetter(1)))
d = {"x": 3, "y": 1, "z": 2}
print(sorted(d, key=d.get), max(d, key=d.get))

def cmp(a, b):                              # negative -> a first
    return -1 if a + b > b + a else (1 if a + b < b + a else 0)
print("".join(sorted(["3", "30", "34", "5", "9"], key=cmp_to_key(cmp))))  # 9534330

xs = [3, 1, 2]
print(xs.sort())                            # None! sort() works in place
print(xs)
` }],
    codeTitle: ['Sorting with keys (runnable)'],
    viz: {
      title: 'Stable sort in slow motion: key = score (ties keep their order)',
      input: 'ann:90 bob:85 cat:90 dan:70 eve:85',
      inputLabel: 'name:score pairs (≤ 8)',
      gen: function (input) {
        var toks = words(input);
        if (!toks.length || toks.length > 8) throw new Error('Give 1-8 pairs like ann:90 bob:85');
        var items = toks.map(function (t, i) {
          var p = t.split(':');
          if (p.length !== 2 || isNaN(Number(p[1]))) throw new Error('Each pair must look like name:score, e.g. ann:90');
          return { name: p[0], score: Number(p[1]), orig: i };
        });
        var CODE = 'rows.sort(key=lambda r: r.score)\n# Timsort sorts short runs with binary insertion sort:\nfor i in range(1, n):\n    x = rows[i]\n    j = i - 1\n    while j >= 0 and key(rows[j]) > key(x):   # strictly greater!\n        rows[j + 1] = rows[j]; j -= 1\n    rows[j + 1] = x';
        var frames = [];
        function lab(a) { return a.map(function (o) { return o.name + ':' + o.score; }); }
        function tags(a) { return a.map(function (o) { return '#' + o.orig; }); }
        frames.push(fr('Step 1 — Python calls the key function <b>once per item</b> (decorate). Here key = score. The original position (#) is shown so we can check stability.', [
          { type: 'table', label: 'decorated items', columns: ['item', 'key', 'original #'], rows: items.map(function (o) { return [o.name, o.score, o.orig]; }) },
          cp(CODE, { 1: 'cur' })
        ]));
        var a = items.slice();
        for (var i = 1; i < a.length; i++) {
          var x = a[i], j = i - 1, moved = 0;
          while (j >= 0 && a[j].score > x.score) { a[j + 1] = a[j]; j--; moved++; }
          a[j + 1] = x;
          var hl = {}; for (var t = 0; t <= i; t++) hl[t] = 'win'; hl[j + 1] = 'cur';
          var tie = j >= 0 && a[j].score === x.score;
          frames.push(fr('Insert <b>' + esc(x.name) + ':' + x.score + '</b>. ' + (moved ? 'It moves left past ' + moved + ' item(s) with a <b>bigger</b> key.' : 'Nothing to its left has a bigger key, so it stays.') + (tie ? ' <span class="c-g">It stops behind ' + esc(a[j].name) + ' (equal key)</span> — we only move past <i>strictly</i> greater keys, which is exactly why the sort is <b>stable</b>.' : ''), [
            { type: 'array', label: 'rows (sorted prefix in blue)', values: lab(a), hl: hl, idxLabels: tags(a) },
            cp(CODE, { 6: moved ? 'cur' : 'ok', 8: 'ok' })
          ]));
        }
        var hl2 = {};
        for (var k = 1; k < a.length; k++) if (a[k].score === a[k - 1].score) { hl2[k] = 'sel'; hl2[k - 1] = 'sel'; }
        frames.push(fr('Sorted by score ascending. Equal scores (purple) appear in their <b>original</b> order (check the # labels). Real Timsort uses binary insertion for small runs and merges larger runs — always stable.', [
          { type: 'array', label: 'sorted rows', values: lab(a), hl: hl2, idxLabels: tags(a) }
        ]));
        var b = items.slice().sort(function (p, q) { return (q.score - p.score) || (p.name < q.name ? -1 : p.name > q.name ? 1 : 0); });
        frames.push(fr('Multi-key: <code>key=lambda r: (-r.score, r.name)</code> → tuples compare left to right: higher score first (negated), ties alphabetical.', [
          { type: 'table', label: 'tuple keys', columns: ['item', 'key tuple'], rows: b.map(function (o) { return [o.name, '(' + (-o.score) + ", '" + o.name + "')"]; }) },
          { type: 'array', label: 'sorted by (-score, name)', values: lab(b), hl: { 0: 'ok' } }
        ]));
        return frames;
      }
    },
    examples: [
      { title: 'Merge intervals: sort by start, then sweep', html: `<p>After sorting by start, overlapping intervals are neighbours. Extend the last merged interval when the next one starts before it ends.</p>${H.table(['interval', 'merged list'], [['[1,3]', '[[1,3]]'], ['[2,6]', '[[1,6]] (overlap)'], ['[8,10]', '[[1,6],[8,10]]'], ['[15,18]', '[[1,6],[8,10],[15,18]]']])}`, code: { lang: 'python', run: true, code: `
def merge(intervals):
    intervals.sort(key=lambda iv: iv[0])     # by start
    merged = []
    for start, end in intervals:
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)   # overlap -> extend
        else:
            merged.append([start, end])
    return merged

print(merge([[8, 10], [1, 3], [15, 18], [2, 6]]))  # [[1, 6], [8, 10], [15, 18]]
` } },
      { title: 'Sort characters by frequency, ties alphabetical', html: `<p>Key = <code>(-count, char)</code>: most frequent first, ties broken by letter. Multiply each char by its count to build the answer.</p>${H.kv([['t', '1'], ['r', '1'], ['e', '2']], { label: 'Counter("tree")' })}<p>→ "eert" (e twice, then r before t).</p>`, code: { lang: 'python', run: true, code: `
from collections import Counter

def frequency_sort(s):
    c = Counter(s)
    return "".join(ch * c[ch] for ch in sorted(c, key=lambda ch: (-c[ch], ch)))

print(frequency_sort("tree"))     # eert
print(frequency_sort("Aabb"))     # bbAa  ('A' < 'a' in ASCII)
` } },
      { title: 'Custom alphabet: is the alien dictionary sorted?', html: `<p>Build a rank dict from the alien order and map each word to a tuple of ranks. Then "sorted?" is just comparing neighbouring keys (or <code>words == sorted(words, key=rank_key)</code>).</p>${H.table(['word', 'key (ranks)'], [['hello', '(0, …)'], ['leetcode', '(1, …)']])}`, code: { lang: 'python', run: true, code: `
from itertools import pairwise   # Python 3.10+

def is_alien_sorted(words, order):
    rank = {ch: i for i, ch in enumerate(order)}
    keys = [tuple(rank[ch] for ch in w) for w in words]
    return all(a <= b for a, b in pairwise(keys))

print(is_alien_sorted(["hello", "leetcode"], "hlabcdefgijkmnopqrstuvwxyz"))  # True
print(is_alien_sorted(["apple", "app"], "abcdefghijklmnopqrstuvwxyz"))      # False
` } },
      { title: 'Sorting objects that are not comparable', html: `<p>Sorting a list of dicts or custom objects without a key raises <code>TypeError: '&lt;' not supported</code>. Fix: give a key, or define <code>__lt__</code> (e.g. <code>@dataclass(order=True)</code>). <code>None</code> mixed with numbers also fails — key it as <code>(x is None, x)</code> to push Nones to the end.</p>`, code: { lang: 'python', run: true, code: `
from dataclasses import dataclass, field

tasks = [{"name": "b", "pri": 2}, {"name": "a", "pri": 1}]
print(sorted(tasks, key=lambda t: t["pri"]))

@dataclass(order=True)
class Job:
    pri: int
    name: str = field(compare=False)     # excluded from ordering

print(sorted([Job(3, "x"), Job(1, "y")]))

vals = [3, None, 1, None, 2]
print(sorted(vals, key=lambda v: (v is None, v if v is not None else 0)))  # Nones last
` } }
    ],
    deepDive: `<p>🟣 <b>Timsort internals.</b> CPython's <code>list.sort</code> scans for natural <b>runs</b> (already ascending, or strictly descending which it reverses in place), extends short runs to <code>minrun</code> (32–64) with <b>binary insertion sort</b>, and merges runs using a stack whose policy since 3.11 is <b>Powersort</b> (near-optimal merge order). Merging uses <b>galloping</b> (exponential search) when one run keeps "winning", so data with structure sorts in close to O(n). Worst case O(n log n), extra memory up to n/2 pointers.</p>
<p><b>Key functions are called exactly once per element</b> (decorate-sort-undecorate is built in), so an expensive key is fine. <code>cmp_to_key</code> instead calls your comparator O(n log n) times through a Python wrapper object — noticeably slower; prefer a key whenever one exists.</p>
<p><b>Stability guarantees</b> are part of the language spec (since 2.2), not an implementation accident — you can rely on multi-pass sorts. <code>reverse=True</code> keeps equal items in original order (it is not "sort then reverse").</p>
<p><b>Comparator contract:</b> a cmp function must be consistent (antisymmetric and transitive). The Largest Number comparator <code>a+b vs b+a</code> is provably transitive; random or inconsistent comparators produce arbitrary orders (Python won't crash, Java may throw "Comparison method violates its general contract").</p>
<p><b>Performance tips:</b> <code>operator.itemgetter</code>/<code>attrgetter</code> are a bit faster than lambdas; sorting a list of tuples by default compares full tuples (may hit incomparable fields — use a key); <code>list.sort()</code> avoids a copy; for top-k use <code>heapq.nsmallest</code>. During a sort the list is temporarily empty — mutating it from a key function raises <code>ValueError: list modified during sort</code>.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> generating sort calls is trivial; the value you add is getting the <b>tie-breaking and direction</b> exactly right and choosing whether sorting is even needed (heap? counting sort? bucket?).</p>
<p><b>Use AI as a partner:</b> <code>"List 6 tie cases for this ranking rule and expected outputs"</code>; <code>"Is my cmp function transitive? Try to find a counterexample"</code>.</p>
<p><b>Where AI goes wrong:</b> writes <code>sorted(..., reverse=True)</code> when only the primary key should be descending; negates a string (<code>-name</code> → TypeError); uses <code>xs = xs.sort()</code> (now None); forgets that uppercase sorts before lowercase in ASCII; uses <code>cmp_to_key</code> where a key works (slower).</p>
<p><b>What you must still own:</b> stating the order precisely ("by end time ascending because…" for greedy interval problems), knowing sort is stable and O(n log n), and justifying custom comparators.</p>`,
    problems: [{
      title: 'Largest Number', level: 'Medium', tags: ['sorting', 'cmp_to_key', 'greedy', 'string'], companies: ['Amazon', 'Microsoft', 'Google', 'Goldman Sachs'],
      statement: `<p>Given a list of non-negative integers <code>nums</code>, arrange them so they form the <b>largest</b> possible number and return it as a string (it can be too large for an int in other languages).</p>`,
      constraints: `1 ≤ len(nums) ≤ 100, 0 ≤ nums[i] ≤ 10<sup>9</sup>`,
      example: `<p>nums = ${H.arr([3, 30, 34, 5, 9])} → ${H.c('g', '"9534330"')}. Note "3" must come before "30" because "330" &gt; "303".</p>`,
      brute: { why: `<p>Try all n! orderings and keep the largest concatenation. n = 10 is already 3.6 million permutations; n = 100 is impossible. Sorting the numbers descending numerically is wrong (gives 34 30 9 5 3 → "34309..."), and sorting strings descending is wrong too ("30" before "3" → "...303"). We need a <b>pairwise</b> rule.</p>`, code: `
from itertools import permutations

def largest_number_brute(nums):
    best = max("".join(p) for p in permutations(map(str, nums)))   # O(n! * n)
    return "0" if best[0] == "0" else best

print(largest_number_brute([3, 30, 34, 5, 9]))   # 9534330 (only feasible for tiny n)
` },
      mcq: { q: 'For strings a and b, when should a come before b?', options: ['When <code>a + b &gt; b + a</code>', 'When <code>int(a) &gt; int(b)</code>', 'When <code>a &gt; b</code> as strings', 'When <code>len(a) &lt; len(b)</code>'], answer: 0, explain: 'Compare the two possible concatenations directly. "3"+"30" = "330" &gt; "303" so 3 goes first even though 30 &gt; 3 numerically and "30" &gt; "3" as strings.' },
      hints: [`<p>Hint 1: Look at just two numbers: which order makes the bigger string? Compare <code>a+b</code> with <code>b+a</code>.</p>`, `<p>Hint 2: That pairwise rule is a valid (transitive) ordering, so sort with <code>key=cmp_to_key(cmp)</code> where cmp returns −1 if a+b &gt; b+a.</p>`, `<p>Hint 3: Edge case: all zeros → "0", not "000". Recipe: strs = map(str, nums); sort with the comparator; join; if result starts with "0" return "0".</p>`],
      tests: { sig: 'int[] -> string', fn: 'largest_number', cases: [
        [[[10, 2]], '210'],
        [[[3, 30, 34, 5, 9]], '9534330'],
        [[[0, 0]], '0'],
        [[[1]], '1'],
        [[[0]], '0'],
        [[[0, 0, 0]], '0'],
        [[[10, 0]], '100'],
        [[[20, 1]], '201'],
        [[[121, 12]], '12121'],
        [[[432, 43243]], '43243432'],
        [[[8308, 8308, 830]], '83088308830'],
        [[[999999999, 1000000000]], '9999999991000000000'],
        [[[34323, 3432]], '343234323'],
        [[{ $rep: 1000000000, n: 100 }], '1000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000100000000010000000001000000000'],
      ] },
      solution: {
        approach: `<p>Convert to strings and sort with a comparator: a before b iff a+b &gt; b+a. Join the result and fix the all-zeros case. The ordering is transitive (it equals comparing a/(10<sup>|a|</sup>−1) style infinite repetitions), so a comparison sort gives the global optimum.</p>`,
        code: { lang: 'python', run: true, code: `
from functools import cmp_to_key
from typing import List

def largest_number(nums: List[int]) -> str:
    strs = list(map(str, nums))

    def cmp(a: str, b: str) -> int:
        if a + b > b + a:
            return -1        # a should come first
        if a + b < b + a:
            return 1         # b should come first
        return 0

    strs.sort(key=cmp_to_key(cmp))
    result = "".join(strs)
    return "0" if result[0] == "0" else result   # [0, 0] -> "0"

print(largest_number([10, 2]))              # 210
print(largest_number([3, 30, 34, 5, 9]))    # 9534330
print(largest_number([0, 0]))               # 0
` },
        alt: [{ lang: 'python', title: 'Key-only trick (repeat string)', run: true, code: `
def largest_number(nums):
    strs = list(map(str, nums))
    # Repeating each string to a common length mimics the a+b vs b+a rule
    # (since nums[i] <= 10**9 has at most 10 digits, x*10 is long enough).
    strs.sort(key=lambda s: s * 10, reverse=True)
    result = "".join(strs)
    return "0" if result[0] == "0" else result

print(largest_number([3, 30, 34, 5, 9]))    # 9534330
` }],
        dry: { head: ['compare', 'a+b', 'b+a', 'order'], rows: [
          ['3 vs 30', '330', '303', '3 first'], ['34 vs 3', '343', '334', '34 first'], ['9 vs 5', '95', '59', '9 first'],
          ['result', '—', '—', H.c('g', '9 5 34 3 30 → 9534330')]
        ] },
        complexity: `<p>O(n log n) comparisons, each O(L) for string concatenation (L ≤ 10 digits) → O(n · L · log n). Space O(n · L).</p>`,
        followUps: ['Smallest number instead (reverse the comparator, handle leading zeros)', 'Prove the comparator is transitive', 'Why is the key-only trick s*10 valid here but not for arbitrary lengths?']
      }
    }]
  });

  /* ================= TOPIC 8: Recursion limits ================= */
  topics.push({
    title: 'Recursion Limits & Turning Recursion into Loops',
    analogy: `<p>Recursion is like <b>stacking plates</b>: every function call puts a plate (a <b>frame</b>) on the pile, and it comes off only when that call returns. Python's kitchen has a <b>safety rule</b>: about 1000 plates max. Stack more and the manager stops you (<code>RecursionError</code>) before the pile crashes onto the floor (a real crash of the interpreter). The fix isn't a taller pile — it's keeping your own <b>to-do list on paper</b> (an explicit stack) instead of a tower of plates.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Each call to a Python function creates a frame object holding its local variables. Python counts how deep the calls go and stops at the <b>recursion limit</b>:</p>
<pre>import sys
sys.getrecursionlimit()      # 1000 by default</pre>
<p>Go past it and you get <code>RecursionError: maximum recursion depth exceeded</code>. Python also has <b>no tail-call optimisation</b>: even <code>return f(n - 1)</code> as the last line keeps a frame for every level (Guido chose clear tracebacks over TCO).</p>
${H.table(['Situation', 'Depth', 'Safe with default limit?'], [
  ['DFS on a balanced tree of 10<sup>6</sup> nodes', '≈ 20', H.c('g', 'yes')],
  ['DFS on a skewed tree / linked list of 10<sup>5</sup> nodes', '10<sup>5</sup>', H.c('r', 'no')],
  ['Flood fill / islands on a 300 × 300 all-land grid', 'up to 90 000', H.c('r', 'no')],
  ['Memoized DP <code>f(n)</code> calling <code>f(n-1)</code>, n = 10<sup>4</sup>', '10<sup>4</sup>', H.c('r', 'no')],
  ['Backtracking over 9 × 9 Sudoku cells', '≤ 81', H.c('g', 'yes')]
])}
<p>🔵 <b>Three ways out, best first:</b></p>
<ol>
<li><b>Iterate with an explicit stack</b> (a list): push work items, pop and process. Depth is limited only by memory. Order: push children in reverse if you need left-to-right.</li>
<li><b>Use BFS</b> with a <code>deque</code> when visiting order doesn't matter (islands, flood fill, connected components) — no depth issue at all.</li>
<li><b>Raise the limit</b>: <code>sys.setrecursionlimit(10**6)</code>. Quick in contests, but the limit only protects you — it doesn't give you more memory. Deep recursion is slow (frame creation), uses ~0.5 KB+ per frame, and on older versions or with C-level recursion it can still crash the process (segfault). Some people also run the solver in a <code>threading.Thread</code> after <code>threading.stack_size(2**27)</code> to get a bigger C stack.</li>
</ol>
<p>🔵 <b>Recursion → iteration recipe:</b></p>
${H.table(['Recursive', 'Iterative'], [
  ['call <code>dfs(child)</code>', '<code>stack.append(child)</code>'],
  ['function arguments', 'tuple pushed on the stack, e.g. <code>(node, depth)</code>'],
  ['code after the recursive call (post-order)', 'push <code>(node, True)</code> as a "come back later" marker'],
  ['return value combined by the parent', 'store results in a dict / list, or process in reverse order']
])}`,
    clues: [
      '"the tree can be skewed" / "the linked list has up to 10<sup>5</sup> nodes" → recursion depth O(n): iterate or raise the limit',
      '"grid up to 1000 × 1000", "flood fill", "number of islands" → BFS with deque or iterative DFS, not plain recursion',
      '"RecursionError: maximum recursion depth exceeded" in your output → depth problem, not logic',
      '"do it without recursion" / "iteratively" → explicit stack; for in-order use the go-left-then-pop pattern',
      'Memoized DP where n ≥ ~10<sup>4</sup> → bottom-up table, or warm the cache in increasing order',
      '"follow-up: O(1) extra space traversal" → Morris traversal (threads the tree temporarily)'
    ],
    code: [{ lang: 'python', run: true, title: 'Hitting and avoiding the limit (runnable)', code: `
import sys

print("limit:", sys.getrecursionlimit())          # 1000

def depth_sum(n):                                  # recursion depth = n
    return 0 if n == 0 else n + depth_sum(n - 1)

print(depth_sum(500))                              # fine
try:
    depth_sum(5000)
except RecursionError as e:
    print("RecursionError:", e)

def depth_sum_iter(n):                             # same answer, no frames
    total = 0
    while n:
        total += n
        n -= 1
    return total
print(depth_sum_iter(5000))

sys.setrecursionlimit(20_000)                      # the quick contest fix
print(depth_sum(5000))                             # works now (12502500)
sys.setrecursionlimit(1000)                        # restore

# Explicit-stack DFS on a long "linked list" graph of 100_000 nodes
n = 100_000
nxt = {i: i + 1 for i in range(n - 1)}
stack, seen = [0], set()
while stack:
    u = stack.pop()
    if u in seen:
        continue
    seen.add(u)
    if u in nxt:
        stack.append(nxt[u])
print("visited:", len(seen))                       # 100000, no recursion at all
` }],
    codeTitle: ['Hitting and avoiding the limit (runnable)'],
    viz: [{
      title: 'Call stack growing into the recursion limit',
      input: '7 5',
      inputLabel: 'n and a (tiny) recursion limit, e.g. 7 5',
      gen: function (input) {
        var v = nums(input, 2, 'Give two numbers: n and limit, e.g. 7 5');
        var n = v[0], lim = v[1];
        if (v.length !== 2 || n < 1 || n > 12 || lim < 2 || lim > 12) throw new Error('n 1-12 and limit 2-12, e.g. 7 5');
        var CODE = 'def total(n):\n    if n == 0:\n        return 0\n    return n + total(n - 1)   # one new frame per level';
        var frames = [], st = [];
        frames.push(fr('We call <code>total(' + n + ')</code> with a pretend limit of <b>' + lim + '</b> frames (real Python: 1000). Watch the pile of plates.', [
          { type: 'stack', label: 'call stack', items: [] },
          { type: 'bars', label: 'depth vs limit', values: [0, lim], idxLabels: ['depth', 'limit'] },
          cp(CODE, { 1: 'cur' })
        ]));
        var crashed = false;
        for (var k = n; k >= 0; k--) {
          if (st.length >= lim) { crashed = true; break; }
          st.push('total(' + k + ')');
          frames.push(fr('Call <b>total(' + k + ')</b> → push a frame (depth ' + st.length + '). ' + (k > 0 ? 'It cannot finish until total(' + (k - 1) + ') returns, so its frame stays on the stack.' : 'Base case reached!'), [
            { type: 'stack', label: 'call stack', items: st.slice(), hl: one(st.length - 1, 'cur') },
            { type: 'bars', label: 'depth vs limit', values: [st.length, lim], idxLabels: ['depth', 'limit'], hl: st.length === lim ? { 0: 'bad' } : { 0: 'cur' } },
            cp(CODE, k > 0 ? { 4: 'cur' } : { 2: 'ok', 3: 'ok' })
          ]));
        }
        if (crashed) {
          frames.push(fr('<span class="c-r">Depth would exceed the limit → RecursionError!</span> Python refuses to push another frame. Nothing was wrong with the logic — the input was just too deep.', [
            { type: 'stack', label: 'call stack', items: st.slice(), hl: (function () { var h = {}; st.forEach(function (_, j) { h[j] = 'bad'; }); return h; })() },
            { type: 'text', html: '<b>RecursionError</b>: maximum recursion depth exceeded', label: 'error' }
          ]));
        } else {
          var acc = 0;
          while (st.length) {
            var fname = st.pop(); var kk = parseInt(fname.replace(/\D/g, ''), 10); acc += kk;
            frames.push(fr('<b>' + fname + '</b> returns ' + acc + ' → pop its frame.', [
              { type: 'stack', label: 'call stack', items: st.slice(), hl: st.length ? one(st.length - 1, 'cur') : {} },
              vp({ returned: acc }, 'returned', 'ok'),
              cp(CODE, { 4: 'ok' })
            ]));
          }
        }
        var tot = n * (n + 1) / 2;
        frames.push(fr('The loop version keeps <b>one</b> frame no matter how big n is: <code>total = 0; while n: total += n; n -= 1</code> → ' + tot + '. Same answer, depth 1.', [
          { type: 'stack', label: 'call stack (iterative)', items: ['total_iter(' + n + ')'], hl: { 0: 'ok' } },
          { type: 'bars', label: 'depth vs limit', values: [1, lim], idxLabels: ['depth', 'limit'], hl: { 0: 'ok' } },
          vp({ answer: tot }, 'answer', 'sel')
        ]));
        return frames;
      }
    }, {
      title: 'Iterative in-order traversal with an explicit stack',
      input: '4 2 6 1 3 5 7',
      inputLabel: 'Tree in level order (use null for gaps, ≤ 15 values)',
      gen: function (input) {
        var toks = words(input);
        if (!toks.length || toks.length > 15) throw new Error('Give 1-15 level-order values, e.g. 4 2 6 1 3 null 7');
        var arr = toks.map(function (t) { return (t === 'null' || t === '#' || t === 'None') ? null : t; });
        if (arr[0] === null) throw new Error('The root cannot be null');
        var CODE = 'stack, out, node = [], [], root\nwhile stack or node:\n    while node:              # go as far left as possible\n        stack.append(node)\n        node = node.left\n    node = stack.pop()       # leftmost unvisited\n    out.append(node.val)\n    node = node.right        # then its right subtree';
        function ok(i) { return i < arr.length && arr[i] !== null && arr[i] !== undefined; }
        var st = [], out = [], node = 0, frames = [], visited = {};
        function snap(narr, curIdx, codeHl) {
          var hl = {};
          Object.keys(visited).forEach(function (k) { hl[k] = 'done'; });
          st.forEach(function (k) { hl[k] = 'win'; });
          if (curIdx !== null && ok(curIdx)) hl[curIdx] = 'cur';
          frames.push(fr(narr, [
            { type: 'tree', label: 'tree (blue = on stack, faded = output)', arr: arr.slice(), hl: hl },
            { type: 'stack', label: 'explicit stack', items: st.map(function (k) { return arr[k]; }) },
            { type: 'array', label: 'out', values: out.slice(), hl: out.length ? one(out.length - 1, 'ok') : {} },
            cp(CODE, codeHl)
          ]));
        }
        snap('Start at the root. The explicit stack replaces the call stack: it remembers the nodes whose <b>left</b> side we are still exploring.', 0, { 1: 'cur' });
        var guard = 0;
        while ((st.length || ok(node)) && guard++ < 60) {
          while (ok(node)) {
            st.push(node);
            snap('Push <b>' + arr[node] + '</b> and step to its left child.', node, { 4: 'cur', 5: 'cur' });
            node = 2 * node + 1;
          }
          var u = st.pop();
          out.push(arr[u]); visited[u] = true;
          snap('No more left children → pop <b>' + arr[u] + '</b> and output it (left subtree done, now the node itself).', u, { 6: 'ok', 7: 'ok' });
          node = 2 * u + 2;
          if (ok(node)) snap('Move to the right child <b>' + arr[node] + '</b> of ' + arr[u] + ' and repeat.', node, { 8: 'cur' });
        }
        snap('Stack empty and no current node → done. In-order = <b>' + out.join(', ') + '</b>' + (out.every(function (x, i) { return i === 0 || Number(out[i - 1]) <= Number(x); }) ? ' (sorted, so this is a valid BST).' : '.') + ' Max stack size = tree height, never the Python recursion limit.', null, { 2: 'ok' });
        return frames;
      }
    }],
    examples: [
      { title: 'Iterative pre-order and post-order', html: `<p>Pre-order: pop, output, push <b>right then left</b> (so left is processed first). Post-order trick: do "root, right, left" and reverse the output — or push a <code>(node, visited)</code> flag to emit after children.</p>${H.table(['traversal', 'tree 1-(2,3)'], [['pre', '1 2 3'], ['in', '2 1 3'], ['post', '2 3 1']])}`, code: { lang: 'python', run: true, code: `
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def preorder(root):
    out, stack = [], [root] if root else []
    while stack:
        node = stack.pop()
        out.append(node.val)
        if node.right: stack.append(node.right)   # right first...
        if node.left: stack.append(node.left)     # ...so left pops first
    return out

def postorder(root):
    out, stack = [], [(root, False)] if root else []
    while stack:
        node, done = stack.pop()
        if done:
            out.append(node.val)                  # children already emitted
            continue
        stack.append((node, True))                # come back after children
        if node.right: stack.append((node.right, False))
        if node.left: stack.append((node.left, False))
    return out

root = TreeNode(1, TreeNode(2, TreeNode(4)), TreeNode(3))
print(preorder(root), postorder(root))   # [1, 2, 4, 3] [4, 2, 3, 1]
` } },
      { title: 'Max depth of a 100 000-node skewed tree', html: `<p>A recursive <code>max_depth</code> crashes on a degenerate tree (every node only has a left child). BFS level counting never recurses.</p>${H.arr(['1', '2', '3', '…', '100000'], { label: 'skewed tree as a chain' })}`, code: { lang: 'python', run: true, code: `
from collections import deque

class TreeNode:
    __slots__ = ("val", "left", "right")
    def __init__(self, val):
        self.val, self.left, self.right = val, None, None

root = cur = TreeNode(0)
for i in range(1, 100_000):            # build a left-skewed chain
    cur.left = TreeNode(i)
    cur = cur.left

def max_depth_bfs(root):
    if not root:
        return 0
    q, depth = deque([root]), 0
    while q:
        depth += 1
        for _ in range(len(q)):        # one whole level per iteration
            node = q.popleft()
            if node.left: q.append(node.left)
            if node.right: q.append(node.right)
    return depth

print(max_depth_bfs(root))             # 100000, no RecursionError
` } },
      { title: 'Memoized DP: warm the cache to stay shallow', html: `<p><code>@cache</code> recursion on n = 10<sup>5</sup> would nest 10<sup>5</sup> frames on the first call. Calling it in increasing order first means every call finds its sub-answers already cached, so the depth stays tiny. Bottom-up is still cleaner.</p>${H.table(['strategy', 'max depth for n = 10⁵'], [['direct <code>ways(100000)</code>', H.c('r', '100 000 → RecursionError')], ['warm <code>for i in range(n): ways(i)</code>', H.c('g', '≈ 2')]])}`, code: { lang: 'python', run: true, code: `
from functools import cache

@cache
def ways(n):                       # climbing stairs, mod to keep numbers small
    return 1 if n <= 1 else (ways(n - 1) + ways(n - 2)) % 1_000_000_007

for i in range(100_000):           # warm up in increasing order
    ways(i)
print(ways(100_000))

def ways_bottom_up(n):
    a, b = 1, 1
    for _ in range(n - 1):
        a, b = b, (a + b) % 1_000_000_007
    return b
print(ways_bottom_up(100_000))     # same value, O(1) memory
` } }
    ],
    deepDive: `<p>🟣 <b>What actually limits depth.</b> Two stacks are involved: Python <b>frame objects</b> (heap memory, counted against <code>sys.getrecursionlimit()</code>) and the <b>C stack</b> of the interpreter thread. Since CPython 3.11, a Python-to-Python call no longer recurses in C (the eval loop "inlines" it), so pure Python recursion mostly consumes heap, not C stack. Since 3.12 the recursion limit applies only to Python code, while C code (e.g. <code>repr</code> of a deeply nested list, <code>json</code>, <code>pickle</code>) has a separate C-stack guard. Raising the limit to 10<sup>6</sup> is therefore safer on modern Pythons than on 3.8–3.10, where it could segfault — but older judges still run those versions.</p>
<p><b>Cost:</b> a Python call costs roughly 50–100 ns and a frame several hundred bytes, so recursion depth 10<sup>6</sup> means hundreds of MB and noticeable time. The explicit-stack version stores only what you push (often one int or tuple).</p>
<p><b>Threading trick:</b> <code>threading.stack_size(2**26)</code> before starting a thread gives that thread a larger C stack; competitive programmers run <code>main()</code> in such a thread together with a high recursion limit. It doesn't help memory usage and is platform dependent.</p>
<p><b>Advanced alternatives:</b> <b>Morris traversal</b> (O(1) extra space in-order by temporarily threading right pointers); <b>trampolines</b> / generator-based recursion where each "call" yields a sub-generator and a driver loop keeps a list of generators — a known way to keep recursive code shape without Python recursion.</p>
<p><b>Gotcha list:</b> <code>RecursionError</code> inside <code>__repr__</code> of self-referencing objects; <code>copy.deepcopy</code> and <code>pickle</code> of deep linked lists recurse too; <code>@lru_cache</code> wrappers don't add a Python frame in CPython (C wrapper) but debugging decorators written in Python do — doubling depth.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI-generated tree/graph code is usually recursive because it reads well. You need the reflex to ask "what's the worst-case depth?" and to request or write the iterative version when depth can be O(n).</p>
<p><b>Use AI as a partner:</b> <code>"Convert this recursive post-order DFS into an explicit-stack version that preserves the exact output order"</code>, then test both on random trees — a great use of AI because the conversion is mechanical but fiddly.</p>
<p><b>Where AI goes wrong:</b> blindly adds <code>sys.setrecursionlimit(10**9)</code> (crashes or wastes memory); pushes children in the wrong order so pre-order turns into a mirrored traversal; forgets the "visited" flag for post-order; claims Python has tail-call optimisation.</p>
<p><b>What you must still own:</b> estimating recursion depth from constraints, translating recursion into a stack of states, and explaining why BFS sidesteps the problem.</p>`,
    problems: [{
      title: 'Number of Islands (recursion-safe)', level: 'Medium', tags: ['DFS', 'BFS', 'explicit stack', 'grid'], companies: ['Amazon', 'Google', 'Meta', 'Microsoft', 'Bloomberg'],
      statement: `<p>Given an m × n grid of <code>"1"</code> (land) and <code>"0"</code> (water), count the islands. An island is land connected horizontally or vertically. Your solution must not crash on a grid that is entirely land.</p>`,
      constraints: `1 ≤ m, n ≤ 300 → up to 90 000 cells in one island`,
      example: `<p>${H.table(['', 'c0', 'c1', 'c2', 'c3'], [['r0', H.c('g', '1'), H.c('g', '1'), '0', '0'], ['r1', H.c('g', '1'), '0', '0', H.c('b', '1')], ['r2', '0', '0', H.c('y', '1'), '0']])}</p><p>Output <b>3</b>: green, blue and amber groups.</p>`,
      brute: { why: `<p>The textbook recursive DFS is correct, but on a 300 × 300 all-land grid the recursion goes up to 90 000 frames deep → <code>RecursionError</code> with Python's default limit of 1000 (and a crash risk if you just raise the limit on older versions). The algorithm is fine — the <b>call stack</b> is the problem.</p>`, code: `
def num_islands_recursive(grid):
    R, C = len(grid), len(grid[0])
    def sink(r, c):                      # depth can reach R*C
        if r < 0 or c < 0 or r >= R or c >= C or grid[r][c] != "1":
            return
        grid[r][c] = "0"
        sink(r + 1, c); sink(r - 1, c); sink(r, c + 1); sink(r, c - 1)
    count = 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] == "1":
                count += 1
                sink(r, c)
    return count

print(num_islands_recursive([list("1100"), list("1001"), list("0010")]))  # 3
` },
      mcq: { q: 'Which change makes the island-sinking safe for a 300 × 300 all-land grid?', options: ['Replace recursion with an explicit stack (or a deque BFS)', 'Add <code>@cache</code> to <code>sink</code>', 'Iterate rows in reverse order', 'Use <code>try/except RecursionError</code> and return 0'], answer: 0, explain: 'The depth problem disappears when the pending cells live in a list/deque on the heap. Caching does nothing (each cell is visited once anyway), and catching the error gives a wrong answer.' },
      hints: [`<p>Hint 1: Every time you find an unvisited "1", you found a new island — then you must mark all of its land as visited.</p>`, `<p>Hint 2: Marking can use a <code>list</code> as a stack: push the start cell, pop a cell, push its land neighbours. No recursion → no depth limit.</p>`, `<p>Hint 3: Mark a cell as visited <b>when you push it</b> (not when you pop) so it is never pushed twice. Recipe: for each cell == "1": count += 1; grid[r][c] = "0"; stack = [(r, c)]; while stack: pop, check 4 neighbours, sink and push.</p>`],
      tests: { sig: 'char[][] -> int', fn: 'num_islands', cases: [
        [[[['1', '1', '0', '0'], ['1', '0', '0', '1'], ['0', '0', '1', '0']]], 3],
        [[[['1']]], 1],
        [[[['0']]], 0],
        [[[['1', '0'], ['0', '1']]], 2],
        [[[['1', '0', '1', '0'], ['0', '1', '0', '1'], ['1', '0', '1', '0'], ['0', '1', '0', '1']]], 8],
        [[[['1', '1', '1', '1', '0'], ['1', '1', '0', '1', '0'], ['1', '1', '0', '0', '0'], ['0', '0', '0', '0', '0']]], 1],
        [[[['1', '1', '0', '0', '0'], ['1', '1', '0', '0', '0'], ['0', '0', '1', '0', '0'], ['0', '0', '0', '1', '1']]], 3],
        [[[['1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0']]], 150],
        [[{ $rep: ['1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0', '1', '0'], n: 300 }], 150],
        [[{ $rep: ['1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1'], n: 300 }], 1],
        [[{ $rep: ['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0'], n: 300 }], 0],
      ] },
      solution: {
        approach: `<p>Scan the grid; on each unvisited land cell increment the count and flood-fill its island with an <b>explicit stack</b>, sinking cells (set to "0") as they are pushed. Every cell is pushed at most once, and the stack lives on the heap, so the all-land grid works. A <code>deque</code> BFS works identically.</p>`,
        code: { lang: 'python', run: true, code: `
from typing import List

def num_islands(grid: List[List[str]]) -> int:
    R, C = len(grid), len(grid[0])
    count = 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] != "1":
                continue
            count += 1                       # new island found
            grid[r][c] = "0"                 # mark on push
            stack = [(r, c)]
            while stack:
                cr, cc = stack.pop()
                for nr, nc in ((cr + 1, cc), (cr - 1, cc), (cr, cc + 1), (cr, cc - 1)):
                    if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == "1":
                        grid[nr][nc] = "0"
                        stack.append((nr, nc))
    return count

print(num_islands([list("1100"), list("1001"), list("0010")]))   # 3
big = [["1"] * 300 for _ in range(300)]                           # one huge island
print(num_islands(big))                                           # 1, no RecursionError
` },
        alt: [{ lang: 'python', title: 'BFS with deque', run: true, code: `
from collections import deque

def num_islands_bfs(grid):
    R, C = len(grid), len(grid[0])
    count = 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] == "1":
                count += 1
                grid[r][c] = "0"
                q = deque([(r, c)])
                while q:
                    cr, cc = q.popleft()
                    for nr, nc in ((cr + 1, cc), (cr - 1, cc), (cr, cc + 1), (cr, cc - 1)):
                        if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == "1":
                            grid[nr][nc] = "0"
                            q.append((nr, nc))
    return count

print(num_islands_bfs([list("11000"), list("11000"), list("00100"), list("00011")]))  # 3
` }],
        dry: { head: ['found at', 'count', 'cells sunk by the stack'], rows: [
          ['(0,0)', '1', '(0,0) (1,0) (0,1)'],
          ['(1,3)', '2', '(1,3) — its neighbours are water'],
          ['(2,2)', '3', '(2,2)'],
          ['end', H.c('g', '3'), '—']
        ] },
        complexity: `<p>Time O(m·n): each cell is pushed and popped at most once. Space O(m·n) worst case for the stack (all land), but on the heap — no recursion depth issue.</p>`,
        followUps: ['Do not modify the input grid (use a visited set or a copy)', 'Count distinct island shapes (normalise each island\'s relative coordinates into a frozenset)', 'Islands added one at a time (Number of Islands II) → Union-Find']
      }
    }]
  });

  /* ================= TOPIC 9: Pythonic DSA templates ================= */
  topics.push({
    title: 'Pythonic DSA Templates: Graphs, Union-Find, Tries & Gotchas',
    analogy: `<p>A good chef has <b>mise en place</b>: knives sharpened, sauces pre-made, ingredients chopped in little bowls. When the order comes in, she <i>assembles</i> rather than invents. Your interview mise en place is a set of tiny, memorised Python templates — adjacency list, BFS, Dijkstra, Union-Find, Trie — plus a list of Python traps you never fall into. Then 45 minutes is spent on the <b>problem</b>, not on syntax.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Python lets you write classic algorithms in a fraction of the lines — if you know the idioms. Here is the cheat sheet interviewers expect from a "strong Python" candidate.</p>
${H.table(['Need', 'Idiom'], [
  ['swap / rotate values', '<code>a, b = b, a</code>; <code>a, b = b, a + b</code>'],
  ['index + value', '<code>for i, x in enumerate(xs)</code>'],
  ['walk two lists together', '<code>for a, b in zip(xs, ys)</code> (<code>strict=True</code> in 3.10+ to catch length bugs)'],
  ['infinity', '<code>float("inf")</code> or <code>math.inf</code>'],
  ['2-D grid', '<code>[[0] * C for _ in range(R)]</code> ✅ — never <code>[[0] * C] * R</code> ❌ (rows alias!)'],
  ['4 directions', '<code>for dr, dc in ((1,0),(-1,0),(0,1),(0,-1))</code>'],
  ['graph from edges', '<code>adj = defaultdict(list)</code>; <code>adj[u].append(v)</code>'],
  ['visited', '<code>seen = set()</code> of ints or <code>(r, c)</code> tuples'],
  ['build a string', '<code>"".join(parts)</code> — not <code>s += ch</code> in a loop'],
  ['reverse / palindrome', '<code>s[::-1]</code>, <code>s == s[::-1]</code>'],
  ['quotient &amp; remainder', '<code>q, r = divmod(a, b)</code>'],
  ['any / all', '<code>any(x &lt; 0 for x in xs)</code> (short-circuits)'],
  ['count set bits', '<code>x.bit_count()</code> (3.10+) or <code>bin(x).count("1")</code>']
])}
<p>🔵 <b>Integer traps Java/C++ people hit:</b> <code>//</code> is <b>floor</b> division: <code>-7 // 2 == -4</code> (C truncates to −3); use <code>int(a / b)</code> or <code>-(-a // b)</code> patterns carefully. <code>%</code> takes the sign of the divisor: <code>-7 % 3 == 2</code>. Ints never overflow (good) but huge ints get slow — apply <code>% MOD</code> as you go.</p>
<p>🔵 <b>Copy traps:</b> <code>b = a</code> doesn't copy; <code>a[:]</code> / <code>list(a)</code> is a <b>shallow</b> copy (inner lists shared); in backtracking append <code>path[:]</code>, not <code>path</code>. Default arguments are evaluated once: never write <code>def f(x, memo={})</code> or <code>def f(path=[])</code>.</p>
<p>🔵 <b>Four templates to know by heart</b> (all in the code below): <b>BFS</b> with <code>deque</code>, <b>Dijkstra</b> with <code>heapq</code> + lazy deletion, <b>Union-Find</b> with path compression + union by size, <b>Trie</b> with nested dicts. Each is 10–15 lines in Python.</p>
<p>🔵 <b>Fast I/O</b> (contests / HackerRank): <code>input = sys.stdin.readline</code> and print once with <code>"\\n".join(...)</code> — <code>input()</code> and many <code>print</code> calls are slow for 10<sup>5</sup>+ lines.</p>`,
    clues: [
      '"shortest path", "minimum time for signal", "cheapest route" with non-negative weights → Dijkstra template (<code>heapq</code> + <code>dist</code> dict)',
      '"connected components", "are x and y connected", "redundant connection", "accounts merge" → Union-Find',
      '"prefix", "starts with", "autocomplete", "word search with many words" → Trie of nested dicts',
      '"grid", "minimum steps", "spread / rot / infect" → multi-source BFS with <code>deque</code>',
      '"Python solution is TLE but the algorithm is right" → check list-as-queue, string <code>+=</code>, slow input, recomputing <code>len</code>/slices in loops',
      '"result is wrong only for negative numbers" → floor division / modulo semantics',
      '"all rows of my grid changed together" → <code>[[0]*C]*R</code> aliasing'
    ],
    code: [{ lang: 'python', run: true, title: 'Template pack: BFS, Dijkstra, Union-Find, Trie (runnable)', code: `
import heapq
from collections import defaultdict, deque

# ---------- BFS (unweighted shortest path) ----------
def bfs(adj, src):
    dist = {src: 0}
    q = deque([src])
    while q:
        u = q.popleft()
        for v in adj[u]:
            if v not in dist:              # mark when pushing
                dist[v] = dist[u] + 1
                q.append(v)
    return dist

# ---------- Dijkstra (non-negative weights) ----------
def dijkstra(adj, src):
    dist = {src: 0}
    pq = [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist.get(u, float("inf")):  # stale entry (lazy deletion)
            continue
        for v, w in adj[u]:
            nd = d + w
            if nd < dist.get(v, float("inf")):
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
    return dist

# ---------- Union-Find (DSU) ----------
class DSU:
    def __init__(self, n):
        self.parent = list(range(n))
        self.size = [1] * n
    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]   # path halving
            x = self.parent[x]
        return x
    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        if self.size[ra] < self.size[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra                               # union by size
        self.size[ra] += self.size[rb]
        return True

# ---------- Trie with nested dicts ----------
class Trie:
    END = "$"
    def __init__(self):
        self.root = {}
    def insert(self, word):
        node = self.root
        for ch in word:
            node = node.setdefault(ch, {})
        node[Trie.END] = True
    def starts_with(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node:
                return False
            node = node[ch]
        return True

g = defaultdict(list)
for u, v in [(0, 1), (0, 2), (1, 3), (2, 3), (3, 4)]:
    g[u].append(v); g[v].append(u)
print("BFS:", bfs(g, 0))

wg = defaultdict(list)
for u, v, w in [("A", "B", 4), ("A", "C", 1), ("C", "B", 2), ("B", "D", 1), ("C", "D", 5)]:
    wg[u].append((v, w))
print("Dijkstra:", dijkstra(wg, "A"))      # {'A': 0, 'B': 3, 'C': 1, 'D': 4}

dsu = DSU(5)
dsu.union(0, 1); dsu.union(3, 4)
print("components:", len({dsu.find(i) for i in range(5)}))   # 3

t = Trie()
for w in ["apple", "app", "bat"]:
    t.insert(w)
print(t.starts_with("ap"), t.starts_with("ba"), t.starts_with("c"))
` }, { lang: 'python', run: true, title: 'Gotchas you must never fall into (runnable)', code: `
bad = [[0] * 3] * 2          # two references to the SAME row
bad[0][0] = 9
print(bad)                   # [[9, 0, 0], [9, 0, 0]]  <- surprise
good = [[0] * 3 for _ in range(2)]
good[0][0] = 9
print(good)                  # [[9, 0, 0], [0, 0, 0]]

print(-7 // 2, int(-7 / 2), -7 % 3)   # -4 -3 2  (floor vs truncate)

def collect(path=[]):        # default list created ONCE
    path.append(1)
    return path
print(collect(), collect())  # [1, 1] [1, 1]  shared!

res, path = [], []
for x in [1, 2]:
    path.append(x)
    res.append(path)         # appends the same list object twice
print(res)                   # [[1, 2], [1, 2]]
res2, path = [], []
for x in [1, 2]:
    path.append(x)
    res2.append(path[:])     # snapshot copy
print(res2)                  # [[1], [1, 2]]

print((10**30 + 1) % 1_000_000_007, (13).bit_count())   # big ints are exact
` }],
    codeTitle: ['Template pack (runnable)', 'Gotchas (runnable)'],
    viz: {
      title: 'Dijkstra with heapq: pop the closest, relax, skip stale entries',
      input: 'A B 4, A C 1, C B 2, B D 1, C D 5, D E 3 | A',
      inputLabel: 'directed edges "u v w" comma separated | source (≤ 7 nodes)',
      gen: function (input) {
        var parts = String(input === undefined ? '' : input).split('|');
        var src = String(parts[1] || '').trim();
        var edges = String(parts[0] || '').split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s; }).map(function (s) {
          var t = s.split(/\s+/);
          if (t.length !== 3 || isNaN(Number(t[2])) || Number(t[2]) < 0) throw new Error('Each edge must be "u v w" with w ≥ 0, e.g. A B 4');
          return [t[0], t[1], Number(t[2])];
        });
        if (!edges.length || edges.length > 14) throw new Error('Give 1-14 edges');
        var ids = [];
        edges.forEach(function (e) { if (ids.indexOf(e[0]) < 0) ids.push(e[0]); if (ids.indexOf(e[1]) < 0) ids.push(e[1]); });
        if (ids.length > 7) throw new Error('Use at most 7 nodes');
        if (ids.indexOf(src) < 0) throw new Error('After | give a source node that appears in the edges');
        var nodes = ids.map(function (id, i) {
          var ang = Math.PI + 2 * Math.PI * i / ids.length;
          return { id: id, label: id, x: Math.round(50 + 38 * Math.cos(ang)), y: Math.round(32 + 24 * Math.sin(ang)) };
        });
        var adj = {}; ids.forEach(function (id) { adj[id] = []; });
        edges.forEach(function (e) { adj[e[0]].push([e[1], e[2]]); });
        var dist = {}, pq = [], done = {}, frames = [];
        var CODE = 'dist = {src: 0}; pq = [(0, src)]\nwhile pq:\n    d, u = heappop(pq)\n    if d > dist[u]: continue      # stale\n    for v, w in adj[u]:\n        if d + w < dist.get(v, inf):\n            dist[v] = d + w\n            heappush(pq, (d + w, v))';
        function push(d, v) { pq.push([d, v]); pq.sort(function (a, b) { return a[0] - b[0] || (a[1] < b[1] ? -1 : 1); }); }
        function gpart(hl, ehl) {
          var tags = {}; ids.forEach(function (id) { tags[id] = dist.hasOwnProperty(id) ? 'd=' + dist[id] : '∞'; });
          return { type: 'graph', label: 'graph (tags = best known distance)', directed: true, height: 64, nodes: nodes, edges: edges.map(function (e) { return [e[0], e[1], e[2]]; }), hl: hl, ehl: ehl || {}, tags: tags };
        }
        function pqPart(hlIdx, cls) { var h = {}; if (hlIdx !== null) h[hlIdx] = cls; return { type: 'array', label: 'heap pq as (dist, node), smallest first', values: pq.map(function (p) { return '(' + p[0] + ',' + p[1] + ')'; }), hl: h }; }
        dist[src] = 0; push(0, src);
        var h0 = {}; h0[src] = 'cur';
        frames.push(fr('Start: dist[' + esc(src) + '] = 0, heap = [(0, ' + esc(src) + ')]. Every other node is ∞ (not in the dict yet).', [gpart(h0), pqPart(0, 'cur'), cp(CODE, { 1: 'cur' })]));
        var guard = 0;
        while (pq.length && guard++ < 40) {
          var top = pq.shift(), d = top[0], u = top[1];
          if (d > dist[u]) {
            var hs = {}; hs[u] = 'bad';
            frames.push(fr('Pop (' + d + ', ' + esc(u) + ') but dist[' + esc(u) + '] is already ' + dist[u] + ' &lt; ' + d + ' → <span class="c-r">stale entry, skip</span>. This "lazy deletion" replaces the decrease-key operation heapq doesn\'t have.', [gpart(hs), pqPart(null), cp(CODE, { 3: 'cur', 4: 'bad' })]));
            continue;
          }
          done[u] = true;
          var hl = {}; Object.keys(done).forEach(function (k) { hl[k] = 'done'; }); hl[u] = 'sel';
          frames.push(fr('Pop the closest node <b>' + esc(u) + '</b> (d = ' + d + '). With non-negative weights nothing can later reach it cheaper → its distance is <b>final</b>.', [gpart(hl), pqPart(null), cp(CODE, { 3: 'ok' })]));
          adj[u].forEach(function (vw) {
            var v = vw[0], w = vw[1], nd = d + w, old = dist.hasOwnProperty(v) ? dist[v] : Infinity;
            var eh = {}; eh[u + '-' + v] = nd < old ? 'ok' : 'bad';
            var hl2 = {}; Object.keys(done).forEach(function (k) { hl2[k] = 'done'; }); hl2[u] = 'sel'; hl2[v] = nd < old ? 'ok' : 'cur';
            if (nd < old) { dist[v] = nd; push(nd, v); }
            frames.push(fr('Edge ' + esc(u) + '→' + esc(v) + ' (w=' + w + '): ' + d + ' + ' + w + ' = ' + nd + (nd < old ? ' &lt; ' + (old === Infinity ? '∞' : old) + ' → <span class="c-g">relax</span>: dist[' + esc(v) + '] = ' + nd + ', push (' + nd + ', ' + esc(v) + ').' : ' ≥ ' + old + ' → no improvement.'), [gpart(hl2, eh), pqPart(null), cp(CODE, nd < old ? { 6: 'ok', 7: 'ok', 8: 'ok' } : { 6: 'bad' })]));
          });
        }
        var fh = {}; ids.forEach(function (id) { fh[id] = dist.hasOwnProperty(id) ? 'ok' : 'bad'; });
        frames.push(fr('Heap empty → done. Final distances: ' + ids.map(function (id) { return esc(id) + '=' + (dist.hasOwnProperty(id) ? dist[id] : '∞'); }).join(', ') + '. Time O((V + E) log V).', [gpart(fh), { type: 'map', label: 'dist', entries: ids.map(function (id) { return [id, dist.hasOwnProperty(id) ? dist[id] : 'inf']; }) }]));
        return frames;
      }
    },
    examples: [
      { title: 'Multi-source BFS: rotting oranges in minutes', html: `<p>Start BFS from <b>all</b> rotten oranges at once (put them all in the deque at minute 0). Each BFS level = one minute. If fresh oranges remain, return −1.</p>${H.table(['', 'c0', 'c1', 'c2'], [['r0', H.c('r', '2'), '1', '1'], ['r1', '1', '1', '0'], ['r2', '0', '1', '1']])}<p>Answer: <b>4</b> minutes.</p>`, code: { lang: 'python', run: true, code: `
from collections import deque

def oranges_rotting(grid):
    R, C = len(grid), len(grid[0])
    q = deque((r, c) for r in range(R) for c in range(C) if grid[r][c] == 2)
    fresh = sum(row.count(1) for row in grid)
    minutes = 0
    while q and fresh:
        for _ in range(len(q)):                  # one level = one minute
            r, c = q.popleft()
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == 1:
                    grid[nr][nc] = 2
                    fresh -= 1
                    q.append((nr, nc))
        minutes += 1
    return -1 if fresh else minutes

print(oranges_rotting([[2, 1, 1], [1, 1, 0], [0, 1, 1]]))  # 4
print(oranges_rotting([[2, 1, 1], [0, 1, 1], [1, 0, 1]]))  # -1
` } },
      { title: 'Union-Find: redundant connection', html: `<p>Add edges one by one; the first edge whose endpoints are <b>already connected</b> closes a cycle — that's the redundant one. <code>union</code> returning False signals it.</p>${H.table(['edge', 'union result', 'note'], [['1-2', 'True', ''], ['1-3', 'True', ''], ['2-3', H.c('r', 'False'), 'cycle → answer [2, 3]']])}`, code: { lang: 'python', run: true, code: `
def find_redundant_connection(edges):
    parent = list(range(len(edges) + 1))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    for a, b in edges:
        ra, rb = find(a), find(b)
        if ra == rb:
            return [a, b]
        parent[ra] = rb
    return []

print(find_redundant_connection([[1, 2], [1, 3], [2, 3]]))                  # [2, 3]
print(find_redundant_connection([[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]]))  # [1, 4]
` } },
      { title: 'Trie: longest common prefix and word search prefix pruning', html: `<p>Insert all words into a dict-of-dicts trie, then walk down while the node has exactly one child and isn't the end of a word.</p>${H.chips(['flower', 'flow', 'flight'], { label: 'words' })}<p>Walk: f → l → (branches o / i) → stop. Answer <b>"fl"</b>.</p>`, code: { lang: 'python', run: true, code: `
def longest_common_prefix(words):
    root = {}
    for w in words:
        node = root
        for ch in w:
            node = node.setdefault(ch, {})
        node["$"] = True                       # end-of-word marker
    prefix, node = [], root
    while len(node) == 1 and "$" not in node:
        ch = next(iter(node))
        prefix.append(ch)
        node = node[ch]
    return "".join(prefix)

print(longest_common_prefix(["flower", "flow", "flight"]))  # fl
print(longest_common_prefix(["dog", "racecar", "car"]))     # ''
` } },
      { title: 'Two pointers, the Pythonic way', html: `<p>Container With Most Water: pointers at both ends, move the shorter wall inward. Tuple assignment and <code>max</code> keep it to a few lines.</p>${H.arr([1, 8, 6, 2, 5, 4, 8, 3, 7], { label: 'height', ptr: { 1: 'L', 8: 'R' }, hl: { 1: 'g', 8: 'g' } })}<p>Best: walls at 1 and 8 → min(8, 7) × 7 = <b>49</b>.</p>`, code: { lang: 'python', run: true, code: `
def max_area(height):
    lo, hi, best = 0, len(height) - 1, 0
    while lo < hi:
        best = max(best, (hi - lo) * min(height[lo], height[hi]))
        if height[lo] < height[hi]:
            lo += 1
        else:
            hi -= 1
    return best

print(max_area([1, 8, 6, 2, 5, 4, 8, 3, 7]))  # 49
` } }
    ],
    deepDive: `<p>🟣 <b>Why these templates are shaped this way.</b></p>
<ul>
<li><b>BFS marks on push</b>, not on pop — otherwise a node can enter the queue many times (O(E) duplicates, and wrong distances in some variants).</li>
<li><b>Dijkstra uses lazy deletion</b> because <code>heapq</code> has no decrease-key; the heap may hold up to E entries, so time is O(E log E) = O(E log V). The <code>if d &gt; dist[u]: continue</code> line is what keeps it from re-expanding nodes. Negative edges break it — use Bellman-Ford; 0/1 weights → 0-1 BFS.</li>
<li><b>Union-Find</b> with path compression (or halving) + union by size/rank gives O(α(n)) amortised per operation — effectively constant. An iterative <code>find</code> avoids recursion-depth issues on long chains before compression kicks in.</li>
<li><b>Trie of dicts</b> is simple and fast enough in Python; a class with <code>__slots__ = ("children", "end")</code> saves memory. For 10<sup>5</sup>+ words consider storing the word at the end node (handy for Word Search II) and deleting exhausted branches.</li>
</ul>
<p><b>Constant-factor tuning in CPython</b> (when the algorithm is right but you TLE): bind hot methods to locals (<code>push = heapq.heappush</code>), avoid attribute lookups in tight loops, use lists indexed by int instead of dicts when node ids are 0..n−1, prefer comprehensions and built-ins (<code>sum</code>, <code>min</code>, <code>sorted</code>) which run in C, use 1-D arrays (<code>r * C + c</code>) for big grids, and read input in bulk with <code>sys.stdin.buffer.read().split()</code>.</p>
<p><b>Semantics worth stating in interviews:</b> Python ints are arbitrary precision (no overflow, but O(digits) arithmetic); <code>//</code> floors toward −∞; strings are immutable (slicing is O(k) and copies); <code>in</code> on a list is O(n) but on a set/dict is O(1) average; tuples are hashable only if their contents are.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> templates are exactly what AI autocompletes best. The differentiator is <b>adapting</b> them: multi-source BFS, Dijkstra with a state <code>(node, stops)</code>, DSU with extra data (component sums), tries that store counts. Interviewers now ask follow-ups that force the adaptation.</p>
<p><b>Use AI as a partner:</b> <code>"Here is my Dijkstra. Generate a graph where a stale heap entry is popped, and show the trace"</code>; <code>"Profile this TLE solution and point at Python-specific slowness only"</code>.</p>
<p><b>Where AI goes wrong:</b> marks BFS nodes on pop; forgets the stale check in Dijkstra; writes recursive <code>find</code> without compression (O(n) chains); creates <code>[[0]*C]*R</code>; uses <code>list.pop(0)</code>; mixes up <code>//</code> semantics when porting C++ solutions; uses mutable default arguments for memo dicts.</p>
<p><b>What you must still own:</b> the invariants (why Dijkstra's popped node is final, why BFS levels are distances), the complexity of each template, and the instinct to pick the right one from the wording.</p>`,
    problems: [{
      title: 'Network Delay Time', level: 'Medium', tags: ['Dijkstra', 'heapq', 'graph', 'defaultdict'], companies: ['Google', 'Amazon', 'Meta', 'Uber'],
      statement: `<p>There are <code>n</code> nodes labelled 1..n and a list of directed travel times <code>times[i] = (u, v, w)</code>. A signal is sent from node <code>k</code>. Return the minimum time for <b>all</b> nodes to receive it, or −1 if some node can never receive it.</p>`,
      constraints: `1 ≤ k ≤ n ≤ 100, 1 ≤ len(times) ≤ 6000, 0 ≤ w ≤ 100, no duplicate edges`,
      example: `<p>times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2 → ${H.c('g', '2')}. Node 2 reaches 1 and 3 at time 1, and 4 at time 2; the answer is the <b>largest</b> shortest distance.</p>`,
      brute: { why: `<p>Bellman-Ford relaxes every edge n − 1 times: O(n · E) = 100 · 6000 = 6·10<sup>5</sup> — actually fine here, but it doesn't scale (10<sup>5</sup> nodes → 10<sup>10</sup>). Exploring every path with DFS is exponential. With non-negative weights, Dijkstra finalises each node once in O(E log V).</p>`, code: `
def network_delay_bellman_ford(times, n, k):
    dist = [float("inf")] * (n + 1)
    dist[k] = 0
    for _ in range(n - 1):                 # relax all edges n-1 times
        for u, v, w in times:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
    ans = max(dist[1:])
    return -1 if ans == float("inf") else ans

print(network_delay_bellman_ford([[2, 1, 1], [2, 3, 1], [3, 4, 1]], 4, 2))  # 2
` },
      mcq: { q: 'After Dijkstra finishes, how do you get the answer?', options: ['<code>max(dist.values())</code> if all n nodes are in dist, else −1', '<code>sum(dist.values())</code>', '<code>min(dist.values())</code>', 'The distance of the last node popped, always'], answer: 0, explain: 'All nodes receive the signal once the farthest (in shortest-path terms) receives it → the maximum. Unreached nodes are missing from the dict → −1. (The last finalised node also has the max distance, but you still must check that all nodes were reached.)' },
      hints: [`<p>Hint 1: "Time for every node to receive a signal" = the largest of the shortest-path distances from k.</p>`, `<p>Hint 2: Non-negative weights → Dijkstra: <code>adj = defaultdict(list)</code>, heap of <code>(dist, node)</code>, pop the closest, relax neighbours.</p>`, `<p>Hint 3: Skip stale heap entries (or skip nodes already in a "finalised" dict). Recipe: dist = {}; pq = [(0, k)]; while pq: d, u = pop; if u in dist: continue; dist[u] = d; push neighbours. Answer: max(dist.values()) if len(dist) == n else −1.</p>`],
      tests: { sig: 'int[][] int int -> int', fn: 'network_delay_time', cases: [
        [[[[2, 1, 1], [2, 3, 1], [3, 4, 1]], 4, 2], 2],
        [[[[1, 2, 1]], 2, 2], -1],
        [[[[1, 2, 1]], 2, 1], 1],
        [[[[1, 1, 5]], 1, 1], 0],
        [[[[1, 2, 10], [1, 3, 1], [3, 2, 1]], 3, 1], 2],
        [[[[1, 2, 0], [2, 3, 0]], 3, 1], 0],
        [[[[1, 2, 1], [3, 4, 1]], 4, 1], -1],
        [[[[1, 2, 1], [2, 3, 2], [1, 3, 4]], 3, 1], 3],
        [[[[1, 2, 100], [2, 3, 100], [3, 4, 100], [4, 5, 100], [5, 6, 100], [6, 7, 100], [7, 8, 100], [8, 9, 100], [9, 10, 100], [10, 11, 100], [11, 12, 100], [12, 13, 100], [13, 14, 100], [14, 15, 100], [15, 16, 100], [16, 17, 100], [17, 18, 100], [18, 19, 100], [19, 20, 100], [20, 21, 100], [21, 22, 100], [22, 23, 100], [23, 24, 100], [24, 25, 100], [25, 26, 100], [26, 27, 100], [27, 28, 100], [28, 29, 100], [29, 30, 100], [30, 31, 100], [31, 32, 100], [32, 33, 100], [33, 34, 100], [34, 35, 100], [35, 36, 100], [36, 37, 100], [37, 38, 100], [38, 39, 100], [39, 40, 100], [40, 41, 100], [41, 42, 100], [42, 43, 100], [43, 44, 100], [44, 45, 100], [45, 46, 100], [46, 47, 100], [47, 48, 100], [48, 49, 100], [49, 50, 100], [50, 51, 100], [51, 52, 100], [52, 53, 100], [53, 54, 100], [54, 55, 100], [55, 56, 100], [56, 57, 100], [57, 58, 100], [58, 59, 100], [59, 60, 100], [60, 61, 100], [61, 62, 100], [62, 63, 100], [63, 64, 100], [64, 65, 100], [65, 66, 100], [66, 67, 100], [67, 68, 100], [68, 69, 100], [69, 70, 100], [70, 71, 100], [71, 72, 100], [72, 73, 100], [73, 74, 100], [74, 75, 100], [75, 76, 100], [76, 77, 100], [77, 78, 100], [78, 79, 100], [79, 80, 100], [80, 81, 100], [81, 82, 100], [82, 83, 100], [83, 84, 100], [84, 85, 100], [85, 86, 100], [86, 87, 100], [87, 88, 100], [88, 89, 100], [89, 90, 100], [90, 91, 100], [91, 92, 100], [92, 93, 100], [93, 94, 100], [94, 95, 100], [95, 96, 100], [96, 97, 100], [97, 98, 100], [98, 99, 100], [99, 100, 100]], 100, 1], 9900],
        [[[[1, 2, 100], [2, 3, 100], [3, 4, 100], [4, 5, 100], [5, 6, 100], [6, 7, 100], [7, 8, 100], [8, 9, 100], [9, 10, 100], [10, 11, 100], [11, 12, 100], [12, 13, 100], [13, 14, 100], [14, 15, 100], [15, 16, 100], [16, 17, 100], [17, 18, 100], [18, 19, 100], [19, 20, 100], [20, 21, 100], [21, 22, 100], [22, 23, 100], [23, 24, 100], [24, 25, 100], [25, 26, 100], [26, 27, 100], [27, 28, 100], [28, 29, 100], [29, 30, 100], [30, 31, 100], [31, 32, 100], [32, 33, 100], [33, 34, 100], [34, 35, 100], [35, 36, 100], [36, 37, 100], [37, 38, 100], [38, 39, 100], [39, 40, 100], [40, 41, 100], [41, 42, 100], [42, 43, 100], [43, 44, 100], [44, 45, 100], [45, 46, 100], [46, 47, 100], [47, 48, 100], [48, 49, 100], [49, 50, 100], [50, 51, 100], [51, 52, 100], [52, 53, 100], [53, 54, 100], [54, 55, 100], [55, 56, 100], [56, 57, 100], [57, 58, 100], [58, 59, 100], [59, 60, 100], [60, 61, 100], [61, 62, 100], [62, 63, 100], [63, 64, 100], [64, 65, 100], [65, 66, 100], [66, 67, 100], [67, 68, 100], [68, 69, 100], [69, 70, 100], [70, 71, 100], [71, 72, 100], [72, 73, 100], [73, 74, 100], [74, 75, 100], [75, 76, 100], [76, 77, 100], [77, 78, 100], [78, 79, 100], [79, 80, 100], [80, 81, 100], [81, 82, 100], [82, 83, 100], [83, 84, 100], [84, 85, 100], [85, 86, 100], [86, 87, 100], [87, 88, 100], [88, 89, 100], [89, 90, 100], [90, 91, 100], [91, 92, 100], [92, 93, 100], [93, 94, 100], [94, 95, 100], [95, 96, 100], [96, 97, 100], [97, 98, 100], [98, 99, 100], [99, 100, 100]], 100, 2], -1],
        [[[[2, 1, 1], [2, 3, 1], [3, 4, 1]], 4, 3], -1],
      ] },
      solution: {
        approach: `<p>Build an adjacency list with <code>defaultdict(list)</code>. Run Dijkstra from k, using the "finalise on first pop" variant: the first time a node is popped, its distance is final. Then return the maximum distance if every node was reached.</p>`,
        code: { lang: 'python', run: true, code: `
import heapq
from collections import defaultdict
from typing import List

def network_delay_time(times: List[List[int]], n: int, k: int) -> int:
    adj = defaultdict(list)
    for u, v, w in times:
        adj[u].append((v, w))

    dist = {}                         # node -> final shortest time
    pq = [(0, k)]
    while pq:
        d, u = heapq.heappop(pq)
        if u in dist:                 # already finalised -> stale entry
            continue
        dist[u] = d
        for v, w in adj[u]:
            if v not in dist:
                heapq.heappush(pq, (d + w, v))

    return max(dist.values()) if len(dist) == n else -1

print(network_delay_time([[2, 1, 1], [2, 3, 1], [3, 4, 1]], 4, 2))  # 2
print(network_delay_time([[1, 2, 1]], 2, 2))                         # -1
` },
        dry: { head: ['pop (d, u)', 'finalised?', 'pushes', 'dist'], rows: [
          ['(0, 2)', 'new', '(1,1) (1,3)', '{2:0}'],
          ['(1, 1)', 'new', '—', '{2:0, 1:1}'],
          ['(1, 3)', 'new', '(2,4)', '{2:0, 1:1, 3:1}'],
          ['(2, 4)', 'new', '—', '{…, 4:2} → max = ' + H.c('g', '2')]
        ] },
        complexity: `<p>O(E log E) time (each edge can push one heap entry), O(V + E) space.</p>`,
        followUps: ['Cheapest flights within K stops — state becomes (cost, node, stops)', 'Negative weights? → Bellman-Ford / SPFA', 'Return the actual path → store parent pointers when relaxing']
      }
    }]
  });

  /* ================= PRACTICE: Easy ================= */
  practice.push({
    title: 'Valid Anagram', level: 'Easy', tags: ['Counter', 'hash map', 'string'], companies: ['Amazon', 'Bloomberg', 'Microsoft'],
    statement: `<p>Given two strings <code>s</code> and <code>t</code>, return <code>True</code> if <code>t</code> is an anagram of <code>s</code> (same letters, same counts, any order).</p>`,
    constraints: `1 ≤ len(s), len(t) ≤ 5·10<sup>4</sup>; lowercase letters (follow-up: Unicode)`,
    example: `<p>s = "anagram", t = "nagaram" → ${H.c('g', 'True')} (both have a×3, n, g, r, m). s = "rat", t = "car" → ${H.c('r', 'False')} (t has c, s has t).</p>`,
    brute: { why: `<p>For each character of s, search t for a matching unused character and remove it: O(n²) because each removal from a string/list is O(n). With n = 5·10<sup>4</sup> that is over a billion operations.</p>`, code: `
def is_anagram_brute(s, t):
    if len(s) != len(t):
        return False
    rest = list(t)
    for ch in s:
        if ch not in rest:        # O(n) search
            return False
        rest.remove(ch)           # O(n) removal
    return True

print(is_anagram_brute("anagram", "nagaram"), is_anagram_brute("rat", "car"))
` },
    mcq: { q: 'Which is the cleanest O(n) Python check?', options: ['<code>Counter(s) == Counter(t)</code>', '<code>set(s) == set(t)</code>', '<code>sorted(s) is sorted(t)</code>', '<code>len(s) == len(t)</code>'], answer: 0, explain: 'Counter compares multiplicities. <code>set</code> ignores counts ("aab" vs "abb"), <code>is</code> compares identity (always False for two new lists), and length alone proves nothing.' },
    hints: [`<p>Hint 1: Anagrams have exactly the same <b>multiset</b> of characters — order doesn't matter, counts do.</p>`, `<p>Hint 2: Counting with a hash map is O(n). <code>collections.Counter</code> does it in one call and supports <code>==</code>.</p>`, `<p>Hint 3: Quick reject: different lengths → False. Recipe: <code>return len(s) == len(t) and Counter(s) == Counter(t)</code>. Sorting both (O(n log n)) also works.</p>`],
    tests: { sig: 'string string -> bool', fn: 'is_anagram', cases: [
      [['anagram', 'nagaram'], true],
      [['rat', 'car'], false],
      [['a', 'a'], true],
      [['a', 'b'], false],
      [['ab', 'a'], false],
      [['listen', 'silent'], true],
      [['aacc', 'ccac'], false],
      [[{ $rep: 'a', n: 50000 }, { $rep: 'a', n: 50000 }], true],
      [[{ $concat: [{ $rep: 'a', n: 25000 }, { $rep: 'b', n: 25000 }] }, { $concat: [{ $rep: 'b', n: 25000 }, { $rep: 'a', n: 25000 }] }], true],
      [[{ $concat: [{ $rep: 'a', n: 49999 }, 'b'] }, { $rep: 'a', n: 50000 }], false],
    ] },
    solution: {
      approach: `<p>Count both strings with <code>Counter</code> and compare. Works for Unicode too, since Counter keys can be any hashable character. A fixed-size <code>[0]*26</code> array is the "no library" alternative.</p>`,
      code: { lang: 'python', run: true, code: `
from collections import Counter

def is_anagram(s: str, t: str) -> bool:
    return len(s) == len(t) and Counter(s) == Counter(t)

def is_anagram_array(s: str, t: str) -> bool:
    if len(s) != len(t):
        return False
    counts = [0] * 26
    for a, b in zip(s, t):
        counts[ord(a) - 97] += 1
        counts[ord(b) - 97] -= 1
    return not any(counts)

print(is_anagram("anagram", "nagaram"), is_anagram("rat", "car"))            # True False
print(is_anagram_array("anagram", "nagaram"), is_anagram_array("rat", "car"))
` },
      dry: { head: ['step', 'Counter(s)', 'Counter(t)', 'equal?'], rows: [['"rat"/"car"', "{r:1,a:1,t:1}", "{c:1,a:1,r:1}", H.c('r', 'no (t vs c)')], ['"anagram"/"nagaram"', '{a:3,n:1,g:1,r:1,m:1}', 'same', H.c('g', 'yes')]] },
      complexity: `<p>O(n) time, O(k) space where k = alphabet size (26 for lowercase).</p>`,
      followUps: ['Unicode input — any change needed with Counter? (No; with the 26-array, yes)', 'Find all anagram start indices of p in s (sliding window + Counter)']
    }
  });

  practice.push({
    title: 'First Unique Character in a String', level: 'Easy', tags: ['Counter', 'hash map'], companies: ['Amazon', 'Goldman Sachs', 'Bloomberg'],
    statement: `<p>Given a string <code>s</code>, return the index of the first character that appears exactly once. If there is none, return −1.</p>`,
    constraints: `1 ≤ len(s) ≤ 10<sup>5</sup>, lowercase letters`,
    example: `<p>s = "leetcode" → ${H.c('g', '0')} ('l' appears once). s = "loveleetcode" → ${H.c('g', '2')} ('v'). s = "aabb" → ${H.c('r', '-1')}.</p>`,
    brute: { why: `<p>For each index, count that character in the whole string with <code>s.count(ch)</code>: O(n) per index → O(n²) = 10<sup>10</sup> for n = 10<sup>5</sup>. We keep recounting the same letters.</p>`, code: `
def first_uniq_brute(s):
    for i, ch in enumerate(s):
        if s.count(ch) == 1:      # O(n) each time
            return i
    return -1

print(first_uniq_brute("loveleetcode"))   # 2
` },
    mcq: { q: 'How many passes over the string does the Counter solution need?', options: ['Two: one to count, one to find the first count-1 character', 'One pass is impossible in any way', 'n passes', 'log n passes'], answer: 0, explain: 'Count everything first (Counter), then scan in order and return the first index whose count is 1. (A one-pass variant exists using an ordered dict of candidates, but two passes is the clean answer.)' },
    hints: [`<p>Hint 1: "Appears exactly once" needs the <b>total</b> count of each character — you can't know it until you've seen the whole string.</p>`, `<p>Hint 2: Build <code>Counter(s)</code> once, then walk the string with <code>enumerate</code>.</p>`, `<p>Hint 3: Return −1 if the loop finishes. Recipe: c = Counter(s); for i, ch in enumerate(s): if c[ch] == 1: return i; return −1.</p>`],
    tests: { sig: 'string -> int', fn: 'first_uniq_char', cases: [
      [['leetcode'], 0],
      [['loveleetcode'], 2],
      [['aabb'], -1],
      [['z'], 0],
      [['aabbc'], 4],
      [['abcabc'], -1],
      [['aab'], 2],
      [[{ $concat: [{ $rep: 'a', n: 50000 }, 'b', { $rep: 'a', n: 49999 }] }], 50000],
      [[{ $rep: 'q', n: 100000 }], -1],
    ] },
    solution: {
      approach: `<p>Two passes: count with <code>Counter</code>, then return the first index whose character count is 1. A generator with <code>next(..., -1)</code> makes it a one-liner.</p>`,
      code: { lang: 'python', run: true, code: `
from collections import Counter

def first_uniq_char(s: str) -> int:
    counts = Counter(s)
    return next((i for i, ch in enumerate(s) if counts[ch] == 1), -1)

print(first_uniq_char("leetcode"), first_uniq_char("loveleetcode"), first_uniq_char("aabb"))  # 0 2 -1
` },
      complexity: `<p>O(n) time, O(1) extra space (at most 26 keys).</p>`,
      followUps: ['Stream of characters: return the first unique so far after each char (OrderedDict / deque of candidates)', 'Return the character instead of the index']
    }
  });

  practice.push({
    title: 'Ransom Note', level: 'Easy', tags: ['Counter', 'multiset'], companies: ['Microsoft', 'Apple'],
    statement: `<p>Return <code>True</code> if <code>ransomNote</code> can be constructed using the letters of <code>magazine</code>, where each letter of the magazine can be used at most once.</p>`,
    constraints: `1 ≤ len(ransomNote), len(magazine) ≤ 10<sup>5</sup>, lowercase letters`,
    example: `<p>note = "aa", magazine = "aab" → ${H.c('g', 'True')}. note = "aa", magazine = "ab" → ${H.c('r', 'False')} (only one 'a' available).</p>`,
    brute: { why: `<p>For each note letter, find and delete it from a list copy of the magazine — O(n·m) because of linear search and deletion.</p>`, code: `
def can_construct_brute(note, magazine):
    mag = list(magazine)
    for ch in note:
        if ch in mag:
            mag.remove(ch)        # O(m)
        else:
            return False
    return True

print(can_construct_brute("aa", "aab"), can_construct_brute("aa", "ab"))
` },
    mcq: { q: '<code>Counter("aa") - Counter("ab")</code> equals…', options: ["<code>Counter({'a': 1})</code>", '<code>Counter()</code>', "<code>Counter({'a': 1, 'b': -1})</code>", 'TypeError'], answer: 0, explain: 'Subtraction drops non-positive counts: a: 2−1 = 1 stays, b: 0−1 = −1 is dropped. A non-empty result means letters are missing.' },
    hints: [`<p>Hint 1: You need, for every letter, count in note ≤ count in magazine.</p>`, `<p>Hint 2: Counter subtraction keeps only positive leftovers — exactly the letters you are <b>short</b> of.</p>`, `<p>Hint 3: Since 3.10 you can also write <code>Counter(note) &lt;= Counter(magazine)</code> (sub-multiset test). Recipe: return not (Counter(note) − Counter(magazine)).</p>`],
    tests: { sig: 'string string -> bool', fn: 'can_construct', cases: [
      [['a', 'b'], false],
      [['aa', 'ab'], false],
      [['aa', 'aab'], true],
      [['a', 'a'], true],
      [['abc', 'cba'], true],
      [['abcd', 'abc'], false],
      [['aab', 'baa'], true],
      [[{ $rep: 'a', n: 100000 }, { $rep: 'a', n: 100000 }], true],
      [[{ $rep: 'a', n: 100000 }, { $concat: [{ $rep: 'a', n: 99999 }, 'b'] }], false],
    ] },
    solution: {
      approach: `<p>Multiset subtraction: if anything remains after removing the magazine's letters from the note's letters, the note can't be built.</p>`,
      code: { lang: 'python', run: true, code: `
from collections import Counter

def can_construct(ransom_note: str, magazine: str) -> bool:
    return not (Counter(ransom_note) - Counter(magazine))

def can_construct_310(ransom_note, magazine):
    return Counter(ransom_note) <= Counter(magazine)     # Python 3.10+

print(can_construct("a", "b"), can_construct("aa", "ab"), can_construct("aa", "aab"))   # False False True
print(can_construct_310("aa", "aab"))
` },
      complexity: `<p>O(n + m) time, O(1) space for a fixed alphabet.</p>`,
      followUps: ['Early exit: count the magazine once and decrement while scanning the note', 'What if letters can be reused? (set containment)']
    }
  });

  practice.push({
    title: 'Kth Largest Element in a Stream', level: 'Easy', tags: ['heapq', 'design', 'top-k'], companies: ['Amazon', 'Meta', 'Adobe'],
    statement: `<p>Design <code>KthLargest(k, nums)</code> whose method <code>add(val)</code> adds a number to the stream and returns the current k-th largest element.</p>`,
    constraints: `1 ≤ k ≤ 10<sup>4</sup>, up to 10<sup>4</sup> calls to add; at least k elements exist when you query`,
    example: `<p>k = 3, nums = [4, 5, 8, 2]: add(3) → ${H.c('g', '4')}, add(5) → 5, add(10) → 5, add(9) → 8, add(4) → 8.</p>`,
    brute: { why: `<p>Append and sort the whole list on every add: O(n log n) per call, and the list grows forever. We only ever need the top k.</p>`, code: `
class KthLargestBrute:
    def __init__(self, k, nums):
        self.k, self.nums = k, list(nums)
    def add(self, val):
        self.nums.append(val)
        self.nums.sort(reverse=True)          # O(n log n) every call
        return self.nums[self.k - 1]

kb = KthLargestBrute(3, [4, 5, 8, 2])
print([kb.add(x) for x in (3, 5, 10, 9, 4)])
` },
    mcq: { q: 'Which structure gives O(log k) per add?', options: ['A min-heap holding only the k largest values', 'A max-heap of all values', 'A sorted list with insort', 'A deque'], answer: 0, explain: 'The min-heap root is the k-th largest. New values smaller than the root are irrelevant; bigger ones replace the root with <code>heappushpop</code>/<code>heapreplace</code>.' },
    hints: [`<p>Hint 1: Values smaller than the current k-th largest can never matter again — throw them away.</p>`, `<p>Hint 2: Keep a <b>min</b>-heap of size k. The root (<code>h[0]</code>) is the answer.</p>`, `<p>Hint 3: Initial nums may have more or fewer than k items: heapify, then pop while len &gt; k. In add: push, and pop if size exceeds k (or use <code>heappushpop</code>).</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[['kl = KthLargest(3, [4, 5, 8, 2])',
         '[kl.add(x) for x in (3, 5, 10, 9, 4)]']],
       ['[4, 5, 5, 8, 8]']],
      [[['kl = KthLargest(1, [])',
         '[kl.add(x) for x in (-3, -2, -4, 0, 4)]']],
       ['[-3, -2, -2, 0, 4]']],
      [[['kl = KthLargest(2, [0])',
         '[kl.add(x) for x in (-1, 1, -2, -4, 3)]']],
       ['[-1, 0, 0, 0, 1]']],
      [[['kl = KthLargest(2, [5, 5])',
         '[kl.add(x) for x in (5, 4, 6, 6)]']],
       ['[5, 5, 5, 6]']],
      [[['kl = KthLargest(4, [1, 2, 3, 4, 5, 6])',
         '[kl.add(x) for x in (0, 10, 3, 7)]']],
       ['[3, 4, 4, 5]']],
      [[['kl = KthLargest(3, [9, 8, 7, 6, 5, 4])',
         '[kl.add(x) for x in (1, 7, 8, 8, 100)]']],
       ['[7, 7, 8, 8, 8]']],
      [[['kl = KthLargest(10000, [])',
         'r = [kl.add(i) for i in range(20000)]',
         'r[9999]',
         'r[10000]',
         'r[15000]',
         'r[19999]',
         'kl2 = KthLargest(1, [])',
         'r2 = [kl2.add(-i) for i in range(10000)]',
         'set(r2) == {0}',
         'kl3 = KthLargest(10000, list(range(10000)))',
         'kl3.add(-5)',
         'kl3.add(20000)']],
       ['0',
        '1',
        '5001',
        '10000',
        'True',
        '0',
        '1']],
    ] },
    solution: {
      approach: `<p>Maintain a size-k min-heap of the largest values seen. Each add is a push plus (if needed) a pop — O(log k). The answer is always <code>heap[0]</code>.</p>`,
      code: { lang: 'python', run: true, code: `
import heapq
from typing import List

class KthLargest:
    def __init__(self, k: int, nums: List[int]):
        self.k = k
        self.h = nums[:]
        heapq.heapify(self.h)                 # O(n)
        while len(self.h) > k:
            heapq.heappop(self.h)

    def add(self, val: int) -> int:
        if len(self.h) < self.k:
            heapq.heappush(self.h, val)
        elif val > self.h[0]:
            heapq.heapreplace(self.h, val)    # pop root + push in one sift
        return self.h[0]

kl = KthLargest(3, [4, 5, 8, 2])
print([kl.add(x) for x in (3, 5, 10, 9, 4)])   # [4, 5, 5, 8, 8]
` },
      dry: { head: ['add', 'heap (size 3)', 'answer h[0]'], rows: [['init', '[4, 5, 8]', '—'], ['3', '[4, 5, 8] (3 &lt; 4 ignored)', '4'], ['5', '[5, 5, 8]', '5'], ['10', '[5, 8, 10]', '5'], ['9', '[8, 9, 10]', H.c('g', '8')]] },
      complexity: `<p>Constructor O(n), add O(log k), space O(k).</p>`,
      followUps: ['Support remove(val) too (lazy deletion or SortedList)', 'k changes over time']
    }
  });

  /* ================= PRACTICE: Medium ================= */
  practice.push({
    title: 'K Closest Points to Origin', level: 'Medium', tags: ['heapq', 'nsmallest', 'sorting key'], companies: ['Meta', 'Amazon', 'LinkedIn'],
    statement: `<p>Given an array of points <code>[x, y]</code> and an integer <code>k</code>, return the <code>k</code> points closest to the origin (Euclidean distance). Any order is accepted.</p>`,
    constraints: `1 ≤ k ≤ n ≤ 10<sup>4</sup>, -10<sup>4</sup> ≤ x, y ≤ 10<sup>4</sup>`,
    example: `<p>points = [[3,3],[5,-1],[-2,4]], k = 2 → ${H.c('g', '[[3,3],[-2,4]]')}: squared distances 18, 26, 20 → the two smallest are 18 and 20.</p>`,
    brute: { why: `<p>Sort all points by distance and slice: O(n log n). Correct and often accepted — but when n is huge (or a stream) and k is small, we waste effort ordering points we'll never return.</p>`, code: `
def k_closest_sort(points, k):
    return sorted(points, key=lambda p: p[0] ** 2 + p[1] ** 2)[:k]

print(k_closest_sort([[3, 3], [5, -1], [-2, 4]], 2))
` },
    mcq: { q: 'Why compare <code>x*x + y*y</code> instead of <code>math.sqrt(x*x + y*y)</code>?', options: ['sqrt is monotonic, so squared distance gives the same order and avoids float work', 'sqrt gives wrong answers for negatives', 'Python has no sqrt', 'Heaps cannot store floats'], answer: 0, explain: 'For non-negative values, a &lt; b ⇔ √a &lt; √b. Squared integers are exact and faster.' },
    hints: [`<p>Hint 1: Only the order of distances matters, so use squared distance as the key.</p>`, `<p>Hint 2: "k smallest" → <code>heapq.nsmallest(k, points, key=...)</code>, or a max-heap of size k using negated distances.</p>`, `<p>Hint 3: For the manual heap push <code>(-dist, x, y)</code>; if size &gt; k pop (removes the farthest). Ties: any order is fine.</p>`],
    tests: { sig: 'int[][] int -> int[][]', fn: 'k_closest', check: '(args, out, exp) => { const key = (a) => a.map((p) => p.join(",")).sort().join(";"); return key(out) === key(exp); }', cases: [
      [[[[3, 3], [5, -1], [-2, 4]], 2], [[3, 3], [-2, 4]]],
      [[[[1, 3], [-2, 2]], 1], [[-2, 2]]],
      [[[[0, 0]], 1], [[0, 0]]],
      [[[[1, 0], [0, 2], [-3, 0]], 3], [[1, 0], [0, 2], [-3, 0]]],
      [[[[10000, 10000], [-10000, -10000], [0, 1]], 1], [[0, 1]]],
      [[[[2, -3], [-3, 2], [1, 1], [4, 4]], 3], [[1, 1], [2, -3], [-3, 2]]],
      [[[[492, -320], [152, 552], [215, 9], [-164, 744], [959, -186], [396, -618], [-165, 720], [-617, 254], [36, -980], [198, 509], [-633, -382], [82, 1], [484, 443], [685, -741], [287, -347], [-699, 990], [-20, -572], [521, -621], [-801, 24], [589, -10], [-392, 888], [-703, -110], [300, -441], [-433, -277], [-791, -557], [294, -515], [-567, 863], [-679, 664], [692, -853], [427, -935], [-238, 880], [163, -415], [-192, -463], [988, -310], [649, 982], [-323, -510], [-379, 557], [-369, 661], [113, 193], [-301, -480], [834, -709], [291, -61], [540, -746], [241, 63], [445, 203], [555, -389], [-227, 174], [-331, -342], [-748, -519], [-678, 801], [-169, -678], [-292, 478], [982, 471], [-987, -616], [-559, -994], [-859, -974], [-966, 789], [596, 707], [-455, 772], [-549, 432], [521, -732], [890, 474], [918, 978], [346, 210], [-494, -317], [275, -31], [-409, 606], [185, 56], [279, 594], [-502, 949], [-893, -127], [-439, 99], [464, -999], [-157, -530], [149, 2], [-111, -842], [-313, -11], [789, -666], [-951, 597], [-118, -56], [573, -772], [72, 447], [678, -546], [398, 646], [402, 320], [874, 64], [-209, -87], [-351, -951], [-355, 845], [225, -171], [918, 550], [25, 916], [772, -317], [-763, 941], [412, -125], [975, 753], [644, -222], [423, -56], [-588, 803], [410, -158], [918, 577], [616, 120], [-271, 961], [122, -46], [-303, 299], [-570, 467], [166, 411], [197, 616], [471, -408], [-686, -609], [81, -434], [818, 116], [-146, -577], [172, -681], [521, 807], [-233, -961], [-210, 707], [-47, -171], [865, -885], [-396, 310], [-247, 972], [-598, -79], [247, 717], [-783, 454], [-799, 99], [-947, -494], [-200, 66], [330, -200], [20, 627], [-92, 118], [581, -176], [384, 623], [-897, -607], [-304, -637], [863, 733], [558, -835], [-753, -532], [-759, 823], [707, 33], [-928, 270], [-658, 449], [197, -509], [-751, -64], [-401, 852], [-773, 125], [-279, 956], [897, -867], [-914, -361], [431, 657], [574, -894], [-325, -435], [45, -194], [574, -587], [-60, -829], [886, -431], [490, 24], [-592, -751], [977, 974], [988, 827], [-108, 173], [-999, -929], [-6, -198], [-483, 50], [-617, 719], [-628, -537], [237, 279], [-235, -583], [953, -328], [-304, -460], [-138, -298], [-657, -494], [725, 997], [-813, 155], [-153, -732], [-262, -896], [321, -554], [483, 938], [-951, 613], [918, 536], [-888, 629], [-583, -51], [854, -102], [-473, 704], [-369, 276], [-327, 177], [34, -385], [104, -988], [-152, -106], [-645, 317], [315, 0], [-561, 537], [-601, -557], [-902, 644], [555, -124], [55, 57], [-153, 74], [687, 327], [-910, 856], [-733, -952], [-650, 936], [599, 956], [514, -574], [-474, -836], [-110, 0], [-770, 980], [-790, -258], [-253, -634], [-312, -415], [-751, -607], [-427, -94], [-833, 487], [676, 346], [817, 735], [889, 775], [-35, 25], [-749, 404], [983, 956], [-817, -263], [754, -263], [-554, -150], [972, -804], [-178, -789], [-324, -492], [326, -574], [-295, -846], [107, 460], [-424, -835], [614, -647], [-124, -552], [262, 665], [358, -343], [-38, -723], [425, 347], [-656, -585], [-338, 867], [654, -551], [978, 679], [40, 172], [-98, 518], [-938, -585], [-642, 25], [-598, 151], [719, 904], [-141, 978], [979, 592], [779, 16], [-786, 841], [-297, -213], [-76, -711], [493, 466], [297, -420], [884, -338], [662, -201], [279, -424], [-602, 358], [316, -646], [-593, -816], [358, -371], [-899, 325], [-545, -866], [0, -691], [-803, 914], [326, -813], [-449, -553], [525, 663], [699, 530], [-500, 16], [-815, 736], [635, 305], [461, -467], [459, 419], [-99, -768], [-590, 617], [245, -633], [728, 760], [180, 302], [-415, -339], [799, 701], [-66, 875], [-839, -629], [657, -124], [-949, 783], [823, -170], [482, -552], [-45, -210], [667, -877], [-837, -545], [-692, 957], [-959, -567], [-520, -1000], [-795, -755], [789, 509], [-110, -309], [888, 682], [584, -895], [-321, 439], [-687, 835], [-430, -965], [68, 395], [21, -929]], 17], [[-35, 25], [55, 57], [82, 1], [-110, 0], [122, -46], [-118, -56], [149, 2], [-92, 118], [-153, 74], [40, 172], [-47, -171], [-152, -106], [185, 56], [-6, -198], [45, -194], [-108, 173], [-200, 66]]],
      [[[[492, -320], [152, 552], [215, 9], [-164, 744], [959, -186], [396, -618], [-165, 720], [-617, 254], [36, -980], [198, 509], [-633, -382], [82, 1], [484, 443], [685, -741], [287, -347], [-699, 990], [-20, -572], [521, -621], [-801, 24], [589, -10], [-392, 888], [-703, -110], [300, -441], [-433, -277], [-791, -557], [294, -515], [-567, 863], [-679, 664], [692, -853], [427, -935], [-238, 880], [163, -415], [-192, -463], [988, -310], [649, 982], [-323, -510], [-379, 557], [-369, 661], [113, 193], [-301, -480], [834, -709], [291, -61], [540, -746], [241, 63], [445, 203], [555, -389], [-227, 174], [-331, -342], [-748, -519], [-678, 801], [-169, -678], [-292, 478], [982, 471], [-987, -616], [-559, -994], [-859, -974], [-966, 789], [596, 707], [-455, 772], [-549, 432], [521, -732], [890, 474], [918, 978], [346, 210], [-494, -317], [275, -31], [-409, 606], [185, 56], [279, 594], [-502, 949], [-893, -127], [-439, 99], [464, -999], [-157, -530], [149, 2], [-111, -842], [-313, -11], [789, -666], [-951, 597], [-118, -56], [573, -772], [72, 447], [678, -546], [398, 646], [402, 320], [874, 64], [-209, -87], [-351, -951], [-355, 845], [225, -171], [918, 550], [25, 916], [772, -317], [-763, 941], [412, -125], [975, 753], [644, -222], [423, -56], [-588, 803], [410, -158], [918, 577], [616, 120], [-271, 961], [122, -46], [-303, 299], [-570, 467], [166, 411], [197, 616], [471, -408], [-686, -609], [81, -434], [818, 116], [-146, -577], [172, -681], [521, 807], [-233, -961], [-210, 707], [-47, -171], [865, -885], [-396, 310], [-247, 972], [-598, -79], [247, 717], [-783, 454], [-799, 99], [-947, -494], [-200, 66], [330, -200], [20, 627], [-92, 118], [581, -176], [384, 623], [-897, -607], [-304, -637], [863, 733], [558, -835], [-753, -532], [-759, 823], [707, 33], [-928, 270], [-658, 449], [197, -509], [-751, -64], [-401, 852], [-773, 125], [-279, 956], [897, -867], [-914, -361], [431, 657], [574, -894], [-325, -435], [45, -194], [574, -587], [-60, -829], [886, -431], [490, 24], [-592, -751], [977, 974], [988, 827], [-108, 173], [-999, -929], [-6, -198], [-483, 50], [-617, 719], [-628, -537], [237, 279], [-235, -583], [953, -328], [-304, -460], [-138, -298], [-657, -494], [725, 997], [-813, 155], [-153, -732], [-262, -896], [321, -554], [483, 938], [-951, 613], [918, 536], [-888, 629], [-583, -51], [854, -102], [-473, 704], [-369, 276], [-327, 177], [34, -385], [104, -988], [-152, -106], [-645, 317], [315, 0], [-561, 537], [-601, -557], [-902, 644], [555, -124], [55, 57], [-153, 74], [687, 327], [-910, 856], [-733, -952], [-650, 936], [599, 956], [514, -574], [-474, -836], [-110, 0], [-770, 980], [-790, -258], [-253, -634], [-312, -415], [-751, -607], [-427, -94], [-833, 487], [676, 346], [817, 735], [889, 775], [-35, 25], [-749, 404], [983, 956], [-817, -263], [754, -263], [-554, -150], [972, -804], [-178, -789], [-324, -492], [326, -574], [-295, -846], [107, 460], [-424, -835], [614, -647], [-124, -552], [262, 665], [358, -343], [-38, -723], [425, 347], [-656, -585], [-338, 867], [654, -551], [978, 679], [40, 172], [-98, 518], [-938, -585], [-642, 25], [-598, 151], [719, 904], [-141, 978], [979, 592], [779, 16], [-786, 841], [-297, -213], [-76, -711], [493, 466], [297, -420], [884, -338], [662, -201], [279, -424], [-602, 358], [316, -646], [-593, -816], [358, -371], [-899, 325], [-545, -866], [0, -691], [-803, 914], [326, -813], [-449, -553], [525, 663], [699, 530], [-500, 16], [-815, 736], [635, 305], [461, -467], [459, 419], [-99, -768], [-590, 617], [245, -633], [728, 760], [180, 302], [-415, -339], [799, 701], [-66, 875], [-839, -629], [657, -124], [-949, 783], [823, -170], [482, -552], [-45, -210], [667, -877], [-837, -545], [-692, 957], [-959, -567], [-520, -1000], [-795, -755], [789, 509], [-110, -309], [888, 682], [584, -895], [-321, 439], [-687, 835], [-430, -965], [68, 395], [21, -929]], 300], [[492, -320], [152, 552], [215, 9], [-164, 744], [959, -186], [396, -618], [-165, 720], [-617, 254], [36, -980], [198, 509], [-633, -382], [82, 1], [484, 443], [685, -741], [287, -347], [-699, 990], [-20, -572], [521, -621], [-801, 24], [589, -10], [-392, 888], [-703, -110], [300, -441], [-433, -277], [-791, -557], [294, -515], [-567, 863], [-679, 664], [692, -853], [427, -935], [-238, 880], [163, -415], [-192, -463], [988, -310], [649, 982], [-323, -510], [-379, 557], [-369, 661], [113, 193], [-301, -480], [834, -709], [291, -61], [540, -746], [241, 63], [445, 203], [555, -389], [-227, 174], [-331, -342], [-748, -519], [-678, 801], [-169, -678], [-292, 478], [982, 471], [-987, -616], [-559, -994], [-859, -974], [-966, 789], [596, 707], [-455, 772], [-549, 432], [521, -732], [890, 474], [918, 978], [346, 210], [-494, -317], [275, -31], [-409, 606], [185, 56], [279, 594], [-502, 949], [-893, -127], [-439, 99], [464, -999], [-157, -530], [149, 2], [-111, -842], [-313, -11], [789, -666], [-951, 597], [-118, -56], [573, -772], [72, 447], [678, -546], [398, 646], [402, 320], [874, 64], [-209, -87], [-351, -951], [-355, 845], [225, -171], [918, 550], [25, 916], [772, -317], [-763, 941], [412, -125], [975, 753], [644, -222], [423, -56], [-588, 803], [410, -158], [918, 577], [616, 120], [-271, 961], [122, -46], [-303, 299], [-570, 467], [166, 411], [197, 616], [471, -408], [-686, -609], [81, -434], [818, 116], [-146, -577], [172, -681], [521, 807], [-233, -961], [-210, 707], [-47, -171], [865, -885], [-396, 310], [-247, 972], [-598, -79], [247, 717], [-783, 454], [-799, 99], [-947, -494], [-200, 66], [330, -200], [20, 627], [-92, 118], [581, -176], [384, 623], [-897, -607], [-304, -637], [863, 733], [558, -835], [-753, -532], [-759, 823], [707, 33], [-928, 270], [-658, 449], [197, -509], [-751, -64], [-401, 852], [-773, 125], [-279, 956], [897, -867], [-914, -361], [431, 657], [574, -894], [-325, -435], [45, -194], [574, -587], [-60, -829], [886, -431], [490, 24], [-592, -751], [977, 974], [988, 827], [-108, 173], [-999, -929], [-6, -198], [-483, 50], [-617, 719], [-628, -537], [237, 279], [-235, -583], [953, -328], [-304, -460], [-138, -298], [-657, -494], [725, 997], [-813, 155], [-153, -732], [-262, -896], [321, -554], [483, 938], [-951, 613], [918, 536], [-888, 629], [-583, -51], [854, -102], [-473, 704], [-369, 276], [-327, 177], [34, -385], [104, -988], [-152, -106], [-645, 317], [315, 0], [-561, 537], [-601, -557], [-902, 644], [555, -124], [55, 57], [-153, 74], [687, 327], [-910, 856], [-733, -952], [-650, 936], [599, 956], [514, -574], [-474, -836], [-110, 0], [-770, 980], [-790, -258], [-253, -634], [-312, -415], [-751, -607], [-427, -94], [-833, 487], [676, 346], [817, 735], [889, 775], [-35, 25], [-749, 404], [983, 956], [-817, -263], [754, -263], [-554, -150], [972, -804], [-178, -789], [-324, -492], [326, -574], [-295, -846], [107, 460], [-424, -835], [614, -647], [-124, -552], [262, 665], [358, -343], [-38, -723], [425, 347], [-656, -585], [-338, 867], [654, -551], [978, 679], [40, 172], [-98, 518], [-938, -585], [-642, 25], [-598, 151], [719, 904], [-141, 978], [979, 592], [779, 16], [-786, 841], [-297, -213], [-76, -711], [493, 466], [297, -420], [884, -338], [662, -201], [279, -424], [-602, 358], [316, -646], [-593, -816], [358, -371], [-899, 325], [-545, -866], [0, -691], [-803, 914], [326, -813], [-449, -553], [525, 663], [699, 530], [-500, 16], [-815, 736], [635, 305], [461, -467], [459, 419], [-99, -768], [-590, 617], [245, -633], [728, 760], [180, 302], [-415, -339], [799, 701], [-66, 875], [-839, -629], [657, -124], [-949, 783], [823, -170], [482, -552], [-45, -210], [667, -877], [-837, -545], [-692, 957], [-959, -567], [-520, -1000], [-795, -755], [789, 509], [-110, -309], [888, 682], [584, -895], [-321, 439], [-687, 835], [-430, -965], [68, 395], [21, -929]]],
    ] },
    solution: {
      approach: `<p><code>heapq.nsmallest</code> keeps a bounded heap internally: O(n log k). The manual version keeps a max-heap (negated distances) of size k so the farthest of the current k is on top and gets evicted. Quickselect gives O(n) average if asked.</p>`,
      code: { lang: 'python', run: true, code: `
import heapq
from typing import List

def k_closest(points: List[List[int]], k: int) -> List[List[int]]:
    return heapq.nsmallest(k, points, key=lambda p: p[0] * p[0] + p[1] * p[1])

def k_closest_manual(points, k):
    h = []                                       # max-heap via negation
    for x, y in points:
        heapq.heappush(h, (-(x * x + y * y), x, y))
        if len(h) > k:
            heapq.heappop(h)                     # drop the farthest
    return [[x, y] for _, x, y in h]

print(k_closest([[3, 3], [5, -1], [-2, 4]], 2))          # [[3, 3], [-2, 4]]
print(sorted(k_closest_manual([[1, 3], [-2, 2]], 1)))   # [[-2, 2]]
` },
      complexity: `<p>O(n log k) time, O(k) extra space.</p>`,
      followUps: ['Points arrive as a stream', 'O(n) average with quickselect — trade-offs vs heap']
    }
  });

  practice.push({
    title: 'Task Scheduler', level: 'Medium', tags: ['Counter', 'greedy', 'math', 'heap'], companies: ['Meta', 'Amazon', 'Microsoft'],
    statement: `<p>Given CPU tasks (letters) and a cooldown <code>n</code>, identical tasks must be at least <code>n</code> intervals apart. Each interval runs one task or idles. Return the minimum number of intervals to finish all tasks.</p>`,
    constraints: `1 ≤ len(tasks) ≤ 10<sup>4</sup>, tasks are uppercase letters, 0 ≤ n ≤ 100`,
    example: `<p>tasks = [A,A,A,B,B,B], n = 2 → ${H.c('g', '8')}: A B idle A B idle A B.</p>`,
    brute: { why: `<p>Simulate every interval: at each tick scan all 26 letters to find the available task with the most remaining copies. Correct, but the number of ticks can be ~(n+1)·max_count and the logic is fiddly. The counting formula skips the simulation entirely.</p>`, code: `
from collections import Counter

def least_interval_sim(tasks, n):
    remaining = Counter(tasks)
    next_ok = {}                         # task -> earliest time it may run again
    time = 0
    while remaining:
        ready = [t for t in remaining if next_ok.get(t, 0) <= time]
        if ready:
            t = max(ready, key=lambda x: remaining[x])   # greedy: most remaining
            remaining[t] -= 1
            if remaining[t] == 0:
                del remaining[t]
            next_ok[t] = time + n + 1
        time += 1                        # run a task or idle
    return time

print(least_interval_sim(list("AAABBB"), 2))   # 8
` },
    mcq: { q: 'With max frequency f = 3 and 2 tasks having that frequency, n = 2, the frame formula gives…', options: ['(3 − 1) × (2 + 1) + 2 = 8', '3 × 3 = 9', '(3 − 1) × 2 + 2 = 6', '3 + 2 = 5'], answer: 0, explain: 'Build f − 1 full blocks of size n + 1 starting with the most frequent tasks, then a last partial block containing every task that has frequency f. Then take the max with len(tasks).' },
    hints: [`<p>Hint 1: The most frequent task decides the skeleton: A _ _ A _ _ A needs (f − 1)·(n + 1) + 1 slots.</p>`, `<p>Hint 2: Every other task with the same max frequency adds one slot at the end; other tasks fill idle gaps. Use <code>Counter</code> to get f and how many tasks hit f.</p>`, `<p>Hint 3: If there are more tasks than gaps, there's no idling at all → answer is len(tasks). Recipe: max((f − 1) * (n + 1) + count_of_f, len(tasks)).</p>`],
    tests: { sig: 'char[] int -> int', fn: 'least_interval', cases: [
      [[['A', 'A', 'A', 'B', 'B', 'B'], 2], 8],
      [[['A', 'C', 'A', 'B', 'D', 'B'], 1], 6],
      [[['A', 'A', 'A', 'B', 'B', 'B'], 0], 6],
      [[['A'], 100], 1],
      [[['A', 'A', 'A', 'A', 'A', 'A'], 2], 16],
      [[['A', 'A', 'A', 'B', 'B', 'B', 'C', 'C'], 2], 8],
      [[['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'], 1], 10],
      [[['A', 'A', 'A', 'B', 'B', 'B', 'C', 'C', 'C', 'D', 'D', 'D'], 1], 12],
      [[['A', 'A', 'A', 'A', 'B', 'B', 'B', 'C', 'C'], 3], 13],
      [[{ $concat: [{ $rep: 'A', n: 5000 }, { $rep: 'B', n: 5000 }] }, 100], 504901],
      [[{ $rep: 'A', n: 10000 }, 100], 1009900],
    ] },
    solution: {
      approach: `<p>Count with <code>Counter</code>. Let f = highest frequency and m = number of tasks with frequency f. The schedule needs at least <code>(f − 1)(n + 1) + m</code> intervals; if tasks overflow the idle slots, the answer is just <code>len(tasks)</code>.</p>`,
      code: { lang: 'python', run: true, code: `
from collections import Counter
from typing import List

def least_interval(tasks: List[str], n: int) -> int:
    counts = Counter(tasks)
    f = max(counts.values())                          # highest frequency
    m = sum(1 for c in counts.values() if c == f)     # how many tasks share it
    return max((f - 1) * (n + 1) + m, len(tasks))

print(least_interval(list("AAABBB"), 2))              # 8
print(least_interval(list("ACABDB"), 1))              # 6
print(least_interval(list("AAABBB"), 0))              # 6
` },
      dry: { head: ['tasks', 'f', 'm', '(f−1)(n+1)+m', 'answer'], rows: [['AAABBB, n=2', '3', '2', '8', H.c('g', '8')], ['AAABBB, n=0', '3', '2', '6', '6'], ['AAAAABCDEFG, n=1', '5', '1', '9', H.c('g', '11 (len wins)')]] },
      complexity: `<p>O(T) time to count, O(1) extra space (26 letters).</p>`,
      followUps: ['Return an actual schedule (heap of (-count, task) + cooldown queue)', 'Tasks must keep their given order (Task Scheduler II — hash map of next allowed day)']
    }
  });

  practice.push({
    title: 'Time Based Key-Value Store', level: 'Medium', tags: ['bisect', 'binary search', 'design', 'defaultdict'], companies: ['Google', 'Netflix', 'Uber'],
    statement: `<p>Design <code>TimeMap</code> with <code>set(key, value, timestamp)</code> and <code>get(key, timestamp)</code>, which returns the value set for key with the <b>largest timestamp ≤ the given timestamp</b>, or "" if none. Timestamps for set are strictly increasing.</p>`,
    constraints: `1 ≤ timestamp ≤ 10<sup>7</sup>, up to 2·10<sup>5</sup> calls`,
    example: `<p>set("foo","bar",1); get("foo",1) → ${H.c('g', '"bar"')}; get("foo",3) → "bar" (latest ≤ 3 is t=1); set("foo","bar2",4); get("foo",4) → "bar2"; get("foo",5) → "bar2"; get("foo",0) → ${H.c('r', '""')}.</p>`,
    brute: { why: `<p>Store a list of (timestamp, value) per key and scan it backwards on every get: O(n) per query → up to 4·10<sup>10</sup> steps in the worst case. The list is already sorted by timestamp, so a binary search is free speed.</p>`, code: `
from collections import defaultdict

class TimeMapBrute:
    def __init__(self):
        self.data = defaultdict(list)
    def set(self, key, value, timestamp):
        self.data[key].append((timestamp, value))
    def get(self, key, timestamp):
        for t, v in reversed(self.data[key]):     # O(n) scan
            if t <= timestamp:
                return v
        return ""

tm = TimeMapBrute(); tm.set("foo", "bar", 1); print(tm.get("foo", 3))
` },
    mcq: { q: 'times = [1, 4, 9]. Which expression gives the index of the latest time ≤ 5?', options: ['<code>bisect_right(times, 5) - 1</code>', '<code>bisect_left(times, 5)</code>', '<code>bisect_right(times, 5)</code>', '<code>bisect_left(times, 5) + 1</code>'], answer: 0, explain: '<code>bisect_right</code> returns the count of times ≤ 5 (here 2); subtract 1 for the last such index (1 → time 4). If the result is −1, no time qualifies. It also handles an exact match correctly (t = 4 → index 1).' },
    hints: [`<p>Hint 1: Because set timestamps only increase, each key's history is already a <b>sorted list</b> — append keeps it sorted.</p>`, `<p>Hint 2: Store two parallel lists per key (times, values) in a <code>defaultdict</code>. "Largest ≤ t" is <code>bisect_right(times, t) − 1</code>.</p>`, `<p>Hint 3: Use <code>.get()</code> or <code>in</code> for unknown keys so a get doesn't create entries; index −1 means "no value" → return "".</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[['tm = TimeMap()',
         'tm.set("foo", "bar", 1)',
         'tm.get("foo", 1)',
         'tm.get("foo", 3)',
         'tm.set("foo", "bar2", 4)',
         'tm.get("foo", 4)',
         'tm.get("foo", 5)',
         'tm.get("foo", 0)']],
       ['\'bar\'',
        '\'bar\'',
        '\'bar2\'',
        '\'bar2\'',
        '\'\'']],
      [[['tm = TimeMap()',
         'tm.get("none", 5)',
         'tm.get("none", 5)',
         'tm.set("none", "v", 5)',
         'tm.get("none", 4)',
         'tm.get("none", 5)',
         'tm.get("none", 10**7)']],
       ['\'\'',
        '\'\'',
        '\'\'',
        '\'v\'',
        '\'v\'']],
      [[['tm = TimeMap()',
         'tm.set("k", "a", 10)',
         'tm.set("k", "b", 20)',
         'tm.set("k", "c", 30)',
         '[tm.get("k", t) for t in (9, 10, 19, 20, 29, 30, 31)]']],
       ['[\'\', \'a\', \'a\', \'b\', \'b\', \'c\', \'c\']']],
      [[['tm = TimeMap()',
         'tm.set("x", "1", 1)',
         'tm.set("y", "2", 2)',
         'tm.set("x", "3", 3)',
         '(tm.get("x", 2), tm.get("y", 1), tm.get("y", 2), tm.get("x", 3), tm.get("y", 3))']],
       ['(\'1\', \'\', \'2\', \'3\', \'2\')']],
      [[['tm = TimeMap()',
         'tm.set("a", "", 1)',
         'tm.get("a", 1)',
         'tm.set("a", "z", 2)',
         'tm.get("a", 1)',
         'tm.get("a", 2)']],
       ['\'\'',
        '\'\'',
        '\'z\'']],
      [[['tm = TimeMap()',
         'tm.set("e", "old", 1)',
         'tm.set("e", "new", 10**7)',
         'tm.get("e", 10**7 - 1)',
         'tm.get("e", 10**7)',
         'tm.get("e", 10**9)']],
       ['\'old\'',
        '\'new\'',
        '\'new\'']],
      [[['tm = TimeMap()',
         'for t in range(1, 100001): tm.set("k", str(t), t)',
         'tm.get("k", 50000)',
         'tm.get("k", 10**7)',
         'tm.get("k", 0)',
         'tm.get("k", 1)',
         'all(tm.get("k", t) == str(t) for t in range(1, 100001, 97))',
         'for t in range(100001, 200001): tm.set("j%d" % (t % 1000), "v", t)',
         'tm.get("j7", 10**7)',
         'tm.get("j7", 100000)']],
       ['\'50000\'',
        '\'100000\'',
        '\'\'',
        '\'1\'',
        'True',
        '\'v\'',
        '\'\'']],
    ] },
    solution: {
      approach: `<p>Per key keep sorted <code>times</code> and matching <code>values</code>. <code>set</code> appends (O(1)); <code>get</code> does one <code>bisect_right</code> (O(log n)).</p>`,
      code: { lang: 'python', run: true, code: `
from bisect import bisect_right
from collections import defaultdict

class TimeMap:
    def __init__(self):
        self.times = defaultdict(list)    # key -> sorted timestamps
        self.values = defaultdict(list)   # key -> values aligned with times

    def set(self, key: str, value: str, timestamp: int) -> None:
        self.times[key].append(timestamp)     # strictly increasing -> stays sorted
        self.values[key].append(value)

    def get(self, key: str, timestamp: int) -> str:
        if key not in self.times:             # avoid creating empty entries
            return ""
        i = bisect_right(self.times[key], timestamp) - 1
        return self.values[key][i] if i >= 0 else ""

tm = TimeMap()
tm.set("foo", "bar", 1)
print(tm.get("foo", 1), tm.get("foo", 3))     # bar bar
tm.set("foo", "bar2", 4)
print(tm.get("foo", 4), tm.get("foo", 5), repr(tm.get("foo", 0)), repr(tm.get("x", 9)))
` },
      dry: { head: ['call', 'times["foo"]', 'bisect_right − 1', 'result'], rows: [['get(foo, 3)', '[1]', '1 − 1 = 0', 'bar'], ['get(foo, 4)', '[1, 4]', '2 − 1 = 1', 'bar2'], ['get(foo, 0)', '[1, 4]', '0 − 1 = −1', H.c('r', '""')]] },
      complexity: `<p>set O(1), get O(log n) per key history; space O(total sets).</p>`,
      followUps: ['Timestamps not increasing → insort (O(n)) or SortedList', 'Delete or range queries over [t1, t2]']
    }
  });

  practice.push({
    title: 'Coin Change', level: 'Medium', tags: ['DP', 'lru_cache', 'bottom-up', 'recursion limit'], companies: ['Amazon', 'Google', 'Microsoft', 'Bloomberg'],
    statement: `<p>Given coin denominations <code>coins</code> (unlimited supply) and an <code>amount</code>, return the fewest coins that make up that amount, or −1 if it's impossible.</p>`,
    constraints: `1 ≤ len(coins) ≤ 12, 1 ≤ coins[i] ≤ 2<sup>31</sup>−1, 0 ≤ amount ≤ 10<sup>4</sup>`,
    example: `<p>coins = [1, 2, 5], amount = 11 → ${H.c('g', '3')} (5 + 5 + 1). coins = [2], amount = 3 → ${H.c('r', '-1')}.</p>`,
    brute: { why: `<p>Plain recursion tries every coin at every step: <code>best(a) = 1 + min(best(a − c))</code>. The same remaining amounts are recomputed through countless paths → exponential. Memoizing fixes speed, but a top-down solution for amount = 10<sup>4</sup> with coin 1 recurses 10<sup>4</sup> deep → <code>RecursionError</code> at the default limit.</p>`, code: `
def coin_change_brute(coins, amount):
    def best(a):                         # exponential without memo
        if a == 0:
            return 0
        if a < 0:
            return float("inf")
        return 1 + min(best(a - c) for c in coins)
    r = best(amount)
    return -1 if r == float("inf") else r

print(coin_change_brute([1, 2, 5], 11))  # 3 (slow for bigger amounts)
` },
    mcq: { q: 'Top-down <code>@cache</code> solution, coins = [1], amount = 10 000. What happens with default settings?', options: ['RecursionError — depth reaches ~10 000', 'It runs fine in O(amount)', 'TypeError: unhashable', 'It returns −1'], answer: 0, explain: 'Each call best(a) calls best(a − 1) before anything is cached, so the stack grows to ~10 000 frames &gt; 1000. Use bottom-up, warm the cache, or raise the limit.' },
    hints: [`<p>Hint 1: State = remaining amount. best(a) = 1 + min over coins c ≤ a of best(a − c); best(0) = 0.</p>`, `<p>Hint 2: Only amount + 1 states. Memoize with <code>@cache</code> — or fill <code>dp[0..amount]</code> from small to large, which never recurses.</p>`, `<p>Hint 3: Use <code>inf</code> for impossible states and convert to −1 at the end. Recipe: dp = [0] + [inf]*amount; for a in 1..amount: for c in coins: if c ≤ a: dp[a] = min(dp[a], dp[a−c] + 1).</p>`],
    tests: { sig: 'int[] int -> int', fn: 'coin_change', cases: [
      [[[1, 2, 5], 11], 3],
      [[[2], 3], -1],
      [[[1], 0], 0],
      [[[2], 0], 0],
      [[[1], 10000], 10000],
      [[[186, 419, 83, 408], 6249], 20],
      [[[3, 7, 405, 436], 8839], 25],
      [[[5, 7], 23], -1],
      [[[2, 5, 10, 1], 27], 4],
      [[[2147483647], 1], -1],
      [[[1, 2147483647], 2], 2],
      [[[2, 4, 6, 8], 9999], -1],
      [[[7, 13, 29], 10000], 348],
    ] },
    solution: {
      approach: `<p>Bottom-up DP over amounts 0..amount: each amount takes the best of (one coin + optimal smaller amount). No recursion, so no depth issues; it's also faster than memoized recursion in CPython. The memoized version is shown as an alt with a note on depth.</p>`,
      code: { lang: 'python', run: true, code: `
from typing import List

def coin_change(coins: List[int], amount: int) -> int:
    INF = float("inf")
    dp = [0] + [INF] * amount            # dp[a] = fewest coins for amount a
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1
    return dp[amount] if dp[amount] != INF else -1

print(coin_change([1, 2, 5], 11))     # 3
print(coin_change([2], 3))            # -1
print(coin_change([1], 10_000))       # 10000 -- no recursion involved
` },
      alt: [{ lang: 'python', title: 'Top-down with @cache (fine for small amounts)', run: true, code: `
from functools import cache

def coin_change_memo(coins, amount):
    @cache
    def best(a):
        if a == 0:
            return 0
        res = min((best(a - c) for c in coins if c <= a), default=float("inf"))
        return res + 1
    r = best(amount)
    return -1 if r == float("inf") else r

print(coin_change_memo([1, 2, 5], 11), coin_change_memo([2], 3))   # 3 -1
` }],
      dry: { head: ['a', '0', '1', '2', '3', '4', '5', '…', '11'], rows: [['dp[a]', '0', '1', '1', '2', '2', '1', '…', H.c('g', '3')], ['via coin', '—', '1', '2', '1 (2+1)', '2 (2+2)', '5', '…', '1 (5+5+1)']] },
      complexity: `<p>O(amount × len(coins)) time = 1.2·10<sup>5</sup> steps max, O(amount) space.</p>`,
      followUps: ['Count the number of ways instead (Coin Change II — loop coins outside)', 'Return the actual coins used (store the choice per amount)']
    }
  });

  practice.push({
    title: 'Reorganize String', level: 'Medium', tags: ['Counter', 'heapq', 'greedy'], companies: ['Amazon', 'Google', 'Meta'],
    statement: `<p>Rearrange the characters of <code>s</code> so that no two adjacent characters are the same. Return any valid result, or "" if impossible.</p>`,
    constraints: `1 ≤ len(s) ≤ 500, lowercase letters`,
    example: `<p>s = "aab" → ${H.c('g', '"aba"')}. s = "aaab" → ${H.c('r', '""')} (three a's need at least two separators).</p>`,
    brute: { why: `<p>Try permutations until one has no equal neighbours: up to n! orderings (n = 500 → impossible). The greedy insight: always place the most frequent remaining letter that isn't the one just placed.</p>`, code: `
from itertools import permutations

def reorganize_brute(s):
    for p in permutations(s):            # factorial blow-up, tiny inputs only
        if all(a != b for a, b in zip(p, p[1:])):
            return "".join(p)
    return ""

print(reorganize_brute("aab"), repr(reorganize_brute("aaab")))
` },
    mcq: { q: 'When is reorganizing impossible?', options: ['When the max count &gt; (n + 1) // 2', 'When there are more than 2 distinct letters', 'When n is even', 'When the string is already sorted'], answer: 0, explain: 'The most frequent letter needs a different letter between each pair: it can occupy at most every other slot, i.e. ⌈n/2⌉ = (n + 1) // 2 positions.' },
    hints: [`<p>Hint 1: Greedy: at each position place the most frequent letter that differs from the previous one.</p>`, `<p>Hint 2: Max-heap of (−count, ch). Pop the top; hold it back for one round (so it can't be used twice in a row), then push it back if it still has copies.</p>`, `<p>Hint 3: Early exit if max count &gt; (n + 1) // 2. Recipe: prev = None; while heap: pop cur, append, push prev back if it has count, set prev = cur with count − 1.</p>`],
    tests: { sig: 'string -> string', fn: 'reorganize_string', check: '(args, out, exp) => { const s = args[0]; if (exp === "") return out === ""; return out.length === s.length && [...out].sort().join("") === [...s].sort().join("") && ![...out].some((c, i) => i > 0 && c === out[i - 1]); }', cases: [
      [['aab'], 'aba'],
      [['aaab'], ''],
      [['a'], 'a'],
      [['aa'], ''],
      [['ab'], 'ab'],
      [['aabb'], 'abab'],
      [['aaabbbccc'], 'abcabcabc'],
      [['vvvlo'], 'vlvov'],
      [['aaabbc'], 'ababac'],
      [[{ $concat: [{ $rep: 'a', n: 250 }, { $rep: 'b', n: 250 }] }], 'x'],
      [[{ $concat: [{ $rep: 'a', n: 251 }, { $rep: 'b', n: 249 }] }], ''],
      [[{ $concat: [{ $rep: 'a', n: 250 }, { $rep: 'b', n: 249 }] }], 'x'],
    ] },
    solution: {
      approach: `<p>Count letters; use a max-heap (negated counts). Pop the most frequent letter, append it, and push back the <i>previously</i> used letter (delaying reuse by one step). If the heap empties while a letter is still waiting, it's impossible — prevented upfront by the (n + 1) // 2 check.</p>`,
      code: { lang: 'python', run: true, code: `
import heapq
from collections import Counter

def reorganize_string(s: str) -> str:
    counts = Counter(s)
    if max(counts.values()) > (len(s) + 1) // 2:
        return ""
    heap = [(-c, ch) for ch, c in counts.items()]
    heapq.heapify(heap)
    out, prev = [], None                 # prev = (neg_count, ch) waiting one turn
    while heap:
        c, ch = heapq.heappop(heap)
        out.append(ch)
        if prev and prev[0] < 0:
            heapq.heappush(heap, prev)   # previous letter may be used again now
        prev = (c + 1, ch)               # one fewer copy left (counts are negative)
    return "".join(out)

print(reorganize_string("aab"), repr(reorganize_string("aaab")), reorganize_string("aaabbc"))
` },
      complexity: `<p>O(n log k) time with k ≤ 26 distinct letters (effectively O(n)), O(k) space.</p>`,
      followUps: ['Rearrange String k Distance Apart (deque as a cooldown queue)', 'Do it in O(n) by filling even indices first with the most frequent letter']
    }
  });

  practice.push({
    title: 'Car Fleet', level: 'Medium', tags: ['sorting key', 'stack', 'greedy'], companies: ['Google', 'Amazon', 'Uber'],
    statement: `<p><code>n</code> cars drive toward <code>target</code>. Car i starts at <code>position[i]</code> with <code>speed[i]</code>. A faster car that catches a slower one ahead joins it and they move together as a <b>fleet</b>. How many fleets arrive at the target?</p>`,
    constraints: `1 ≤ n ≤ 10<sup>5</sup>, 0 &lt; target ≤ 10<sup>6</sup>, positions distinct, 0 &lt; speed ≤ 10<sup>6</sup>`,
    example: `<p>target = 12, position = [10,8,0,5,3], speed = [2,4,1,1,3] → ${H.c('g', '3')}. Arrival times: car@10 → 1, car@8 → 1 (joins it), car@5 → 7, car@3 → 3 (catches the car at 5), car@0 → 12.</p>`,
    brute: { why: `<p>Simulate the cars step by step until all arrive, merging when positions meet: time-steps can be huge (10<sup>6</sup>) and catches can happen at fractional times. The insight: sort by starting position and compare <b>arrival times</b> only.</p>`, code: `
def car_fleet_brute(target, position, speed):
    # For each car, check whether ANY car ahead arrives no earlier -> it gets blocked.
    # O(n^2) pairwise reasoning; correct but slow for n = 1e5.
    cars = sorted(zip(position, speed), reverse=True)
    times = [(target - p) / s for p, s in cars]
    fleets = 0
    for i, t in enumerate(times):
        if all(times[j] < t for j in range(i)):   # nobody ahead is slower
            fleets += 1
    return fleets

print(car_fleet_brute(12, [10, 8, 0, 5, 3], [2, 4, 1, 1, 3]))  # 3
` },
    mcq: { q: 'Cars sorted from closest-to-target to farthest have arrival times [1, 1, 7, 3, 12]. How many fleets?', options: ['3', '5', '2', '4'], answer: 0, explain: 'Scan keeping the slowest time ahead: 1 (new fleet), 1 (≤ 1, joins), 7 (new), 3 (≤ 7, joins), 12 (new) → 3.' },
    hints: [`<p>Hint 1: A car can never pass the car ahead; if it would arrive earlier, it gets stuck behind it and takes its arrival time.</p>`, `<p>Hint 2: Sort cars by position <b>descending</b> (closest to target first): <code>sorted(zip(position, speed), reverse=True)</code>, then compute <code>(target − p) / s</code>.</p>`, `<p>Hint 3: Keep the current fleet's arrival time; a car with a strictly larger time starts a new fleet. Recipe: fleets = 0; slowest = 0; for t in times: if t &gt; slowest: fleets += 1; slowest = t.</p>`],
    tests: { sig: 'int int[] int[] -> int', fn: 'car_fleet', cases: [
      [[12, [10, 8, 0, 5, 3], [2, 4, 1, 1, 3]], 3],
      [[10, [3], [3]], 1],
      [[100, [0, 2, 4], [4, 2, 1]], 1],
      [[10, [0, 2], [2, 1]], 1],
      [[10, [0, 5], [2, 1]], 1],
      [[10, [8, 3], [1, 1]], 2],
      [[10, [6, 8], [3, 2]], 2],
      [[20, [1, 3, 5, 7], [1, 1, 1, 1]], 4],
      [[1000000, { $range: [0, 100000] }, { $rep: 1, n: 100000 }], 100000],
      [[1000000, { $range: [0, 1000] }, { $range: [1000, 0, -1] }], 1],
      [[1000000, { $range: [99999, -1, -1] }, { $rep: 1, n: 100000 }], 100000],
    ] },
    solution: {
      approach: `<p>Sort by position descending (tuple sort on <code>zip</code>), convert to arrival times, and count how many times a new maximum arrival time appears — each new maximum is a car that nobody ahead slows down, i.e. a new fleet leader.</p>`,
      code: { lang: 'python', run: true, code: `
from typing import List

def car_fleet(target: int, position: List[int], speed: List[int]) -> int:
    fleets, slowest = 0, 0.0
    for p, s in sorted(zip(position, speed), reverse=True):   # closest first
        t = (target - p) / s                                  # arrival time alone
        if t > slowest:                                       # can't catch the fleet ahead
            fleets += 1
            slowest = t
    return fleets

print(car_fleet(12, [10, 8, 0, 5, 3], [2, 4, 1, 1, 3]))   # 3
print(car_fleet(10, [3], [3]))                             # 1
print(car_fleet(100, [0, 2, 4], [4, 2, 1]))                # 1
` },
      dry: { head: ['car (p, s)', 'time', 'slowest before', 'new fleet?'], rows: [['(10, 2)', '1', '0', H.c('g', 'yes')], ['(8, 4)', '1', '1', 'no'], ['(5, 1)', '7', '1', H.c('g', 'yes')], ['(3, 3)', '3', '7', 'no'], ['(0, 1)', '12', '7', H.c('g', 'yes → 3')]] },
      complexity: `<p>O(n log n) for the sort, O(1) extra beyond it.</p>`,
      followUps: ['Use fractions.Fraction to avoid float precision issues', 'Car Fleet II: when does each car collide? (monotonic stack)']
    }
  });

  /* ================= PRACTICE: Hard ================= */
  practice.push({
    title: 'Shortest Subarray with Sum at Least K', level: 'Hard', tags: ['deque', 'monotonic queue', 'prefix sum'], companies: ['Google', 'Amazon', 'Goldman Sachs'],
    statement: `<p>Given an integer array <code>nums</code> (negatives allowed) and an integer <code>k</code>, return the length of the shortest non-empty contiguous subarray with sum ≥ k, or −1 if none exists.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>5</sup>, -10<sup>5</sup> ≤ nums[i] ≤ 10<sup>5</sup>, 1 ≤ k ≤ 10<sup>9</sup>`,
    example: `<p>nums = [2, -1, 2], k = 3 → ${H.c('g', '3')} (whole array). nums = [1, 2], k = 4 → ${H.c('r', '-1')}. Sliding window fails here because a negative number can make a longer window better.</p>`,
    brute: { why: `<p>Check every (i, j) with prefix sums: O(n²) = 10<sup>10</sup> for n = 10<sup>5</sup>. The two-pointer window trick needs all-positive numbers, so it gives wrong answers with negatives.</p>`, code: `
from itertools import accumulate

def shortest_brute(nums, k):
    P = list(accumulate(nums, initial=0))
    best = float("inf")
    for i in range(len(nums)):
        for j in range(i + 1, len(nums) + 1):
            if P[j] - P[i] >= k:
                best = min(best, j - i)
                break                       # longer j can't be shorter
    return best if best != float("inf") else -1

print(shortest_brute([2, -1, 2], 3), shortest_brute([1, 2], 4))   # 3 -1
` },
    mcq: { q: 'Prefix sums P[i1] ≥ P[i2] with i1 &lt; i2. Why can i1 be dropped as a future start?', options: ['Starting at i2 gives a larger-or-equal sum AND a shorter subarray for every future end', 'Because i1 is older than the window', 'Because negative numbers are not allowed', 'It cannot be dropped'], answer: 0, explain: 'For any end j: P[j] − P[i2] ≥ P[j] − P[i1] and j − i2 &lt; j − i1. So i2 dominates i1 — keep the deque of starts with increasing prefix sums.' },
    hints: [`<p>Hint 1: Use prefix sums P; we want the closest i &lt; j with P[j] − P[i] ≥ k.</p>`, `<p>Hint 2: Keep a deque of candidate start indices with <b>increasing</b> P. From the front, pop while P[j] − P[front] ≥ k (record length — that start is used up). From the back, pop while P[back] ≥ P[j] (dominated).</p>`, `<p>Hint 3: Every index enters and leaves once → O(n). Remember P has n + 1 entries starting with 0 (<code>accumulate(nums, initial=0)</code>).</p>`],
    tests: { sig: 'int[] int -> int', fn: 'shortest_subarray', cases: [
      [[[2, -1, 2], 3], 3],
      [[[1, 2], 4], -1],
      [[[84, -37, 32, 40, 95], 167], 3],
      [[[1], 1], 1],
      [[[1], 2], -1],
      [[[-1, -2, -3], 1], -1],
      [[[5, -10, 6], 6], 1],
      [[[2, -1, 2], 2], 1],
      [[[-28, 81, -20, 28, -29], 89], 3],
      [[[-9, 2, 10, -1, 3, -9, -7, 0, 10, -1, 2, 0, -9, 4, -10, 4, -1, 5, -7, -1, -2, 8, -6, -3, -7, 7, 4, -5, 6, 2, -6, -8, -6, -7, -9, -7, -4, -3, 9, 1, -3, 8, -9, -3, -8, -8, -4, -4, -8, 1, -3, 8, 10, -2, -10, -8, 3, 9, -7, -3], 25], -1],
      [[[-9, 2, 10, -1, 3, -9, -7, 0, 10, -1, 2, 0, -9, 4, -10, 4, -1, 5, -7, -1, -2, 8, -6, -3, -7, 7, 4, -5, 6, 2, -6, -8, -6, -7, -9, -7, -4, -3, 9, 1, -3, 8, -9, -3, -8, -8, -4, -4, -8, 1, -3, 8, 10, -2, -10, -8, 3, 9, -7, -3], 1000], -1],
      [[{ $rep: 1, n: 100000 }, 100000], 100000],
      [[{ $rep: 1, n: 100000 }, 50000], 50000],
      [[{ $concat: [{ $rep: -1, n: 50000 }, { $rep: 1, n: 50000 }] }, 1], 1],
      [[{ $concat: [{ $rep: -100000, n: 50000 }, { $rep: 100000, n: 50000 }] }, 1000000000], 10000],
      [[{ $concat: [{ $rep: -100000, n: 50000 }, { $rep: 100000, n: 50000 }] }, 1000000001], 10001],
    ] },
    solution: {
      approach: `<p>Monotonic deque over prefix sums: front pops produce answers (and can't produce shorter ones later), back pops remove dominated starts. Each index is pushed and popped at most once.</p>`,
      code: { lang: 'python', run: true, code: `
from collections import deque
from itertools import accumulate
from typing import List

def shortest_subarray(nums: List[int], k: int) -> int:
    P = list(accumulate(nums, initial=0))   # P[i] = sum of nums[:i]
    best = len(nums) + 1
    dq = deque()                            # start indices, P increasing
    for j, pj in enumerate(P):
        while dq and pj - P[dq[0]] >= k:    # valid subarray -> record, start is done
            best = min(best, j - dq.popleft())
        while dq and P[dq[-1]] >= pj:       # dominated start
            dq.pop()
        dq.append(j)
    return best if best <= len(nums) else -1

print(shortest_subarray([2, -1, 2], 3))          # 3
print(shortest_subarray([1, 2], 4))              # -1
print(shortest_subarray([84, -37, 32, 40, 95], 167))   # 3
` },
      dry: { head: ['j', 'P[j]', 'front pops (answers)', 'deque after'], rows: [['0', '0', '—', '[0]'], ['1', '2', '—', '[0, 1]'], ['2', '1', '—', '[0, 2] (1 dominated)'], ['3', '3', '3 − P[0] = 3 ≥ 3 → len 3', H.c('g', '[2, 3] → best 3')]] },
      complexity: `<p>O(n) time, O(n) space for prefix sums and the deque.</p>`,
      followUps: ['All numbers positive — simpler sliding window', 'Longest instead of shortest subarray with sum ≥ k']
    }
  });

  practice.push({
    title: 'Find Median from Data Stream', level: 'Hard', tags: ['heapq', 'two heaps', 'design'], companies: ['Amazon', 'Google', 'Microsoft', 'Uber'],
    statement: `<p>Design <code>MedianFinder</code> with <code>addNum(num)</code> and <code>findMedian()</code>, which returns the median of all numbers added so far (mean of the two middle values when the count is even).</p>`,
    constraints: `-10<sup>5</sup> ≤ num ≤ 10<sup>5</sup>, up to 5·10<sup>4</sup> calls, findMedian only after at least one add`,
    example: `<p>addNum(1), addNum(2) → findMedian() = ${H.c('g', '1.5')}; addNum(3) → findMedian() = ${H.c('g', '2.0')}.</p>`,
    brute: { why: `<p>Keep a list, sort on every query: O(n log n) per findMedian. <code>insort</code> improves it to O(n) per add (shifting) — OK for 5·10<sup>4</sup> but not for millions. Two heaps make both operations O(log n) / O(1).</p>`, code: `
from bisect import insort

class MedianFinderInsort:
    def __init__(self):
        self.a = []
    def addNum(self, num):
        insort(self.a, num)                  # O(n) shift
    def findMedian(self):
        n, a = len(self.a), self.a
        return float(a[n // 2]) if n % 2 else (a[n // 2 - 1] + a[n // 2]) / 2

m = MedianFinderInsort(); m.addNum(1); m.addNum(2); print(m.findMedian())
` },
    mcq: { q: 'In the two-heap design, what does the <code>lo</code> heap hold and how is it stored in Python?', options: ['The smaller half as a max-heap, stored as negated values', 'The larger half as a max-heap', 'All numbers as a min-heap', 'The smaller half as a min-heap of positives'], answer: 0, explain: 'lo needs quick access to its <b>largest</b> element (the middle), so it is a max-heap — implemented with heapq by pushing −x. hi is a normal min-heap of the larger half.' },
    hints: [`<p>Hint 1: The median sits at the boundary between the smaller half and the larger half. You only need the largest of the small half and the smallest of the large half.</p>`, `<p>Hint 2: lo = max-heap (negate), hi = min-heap. Keep len(lo) == len(hi) or len(lo) == len(hi) + 1.</p>`, `<p>Hint 3: Add: push −num into lo, then move lo's max to hi (keeps order), then if hi is bigger move hi's min back to lo. Median: −lo[0] if odd count, else (−lo[0] + hi[0]) / 2.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[['mf = MedianFinder()',
         'mf.addNum(1)',
         'mf.addNum(2)',
         'mf.findMedian()',
         'mf.addNum(3)',
         'mf.findMedian()',
         'for x in (10, -5, 4): mf.addNum(x)',
         'mf.findMedian()']],
       ['1.5',
        '2.0',
        '2.5']],
      [[['mf = MedianFinder()',
         'mf.addNum(5)',
         'mf.findMedian()',
         'type(mf.findMedian()).__name__']],
       ['5.0',
        '\'float\'']],
      [[['mf = MedianFinder()',
         'for x in (7, 7, 7, 7): mf.addNum(x)',
         'mf.findMedian()',
         'mf.addNum(7)',
         'mf.findMedian()']],
       ['7.0',
        '7.0']],
      [[['mf = MedianFinder()',
         'out = []',
         String.raw`for x in (-1, -2, -3, -4, -5):
    mf.addNum(x)
    out.append(mf.findMedian())`,
         'out']],
       ['[-1.0, -1.5, -2.0, -2.5, -3.0]']],
      [[['import statistics, random',
         'random.seed(7)',
         'mf = MedianFinder()',
         'seen = []',
         'ok = True',
         String.raw`for _ in range(500):
    x = random.randint(-100, 100)
    mf.addNum(x)
    seen.append(x)
    ok = ok and mf.findMedian() == statistics.median(seen)`,
         'ok']],
       ['True']],
      [[['mf = MedianFinder()',
         'mf.addNum(-100000)',
         'mf.addNum(100000)',
         'mf.findMedian()',
         'mf.addNum(0)',
         'mf.findMedian()',
         'mf.addNum(100000)',
         'mf.findMedian()']],
       ['0.0',
        '0.0',
        '50000.0']],
      [[['mf = MedianFinder()',
         'for i in range(50000): mf.addNum(i)',
         'mf.findMedian()',
         'mf2 = MedianFinder()',
         'for i in range(49999, -1, -1): mf2.addNum(i)',
         'mf2.findMedian()',
         'mf3 = MedianFinder()',
         'for i in range(50000): mf3.addNum(i * 7919 % 50000)',
         'mf3.findMedian()',
         'mf3.addNum(0)',
         'mf3.findMedian()']],
       ['24999.5',
        '24999.5',
        '24999.5',
        '24999.0']],
    ] },
    solution: {
      approach: `<p>Two heaps split the data into halves. The "push through" trick (push into lo, pop its max into hi, rebalance) guarantees every element of lo ≤ every element of hi without extra comparisons.</p>`,
      code: { lang: 'python', run: true, code: `
import heapq

class MedianFinder:
    def __init__(self):
        self.lo = []        # max-heap of the smaller half (negated)
        self.hi = []        # min-heap of the larger half

    def addNum(self, num: int) -> None:
        heapq.heappush(self.lo, -num)
        heapq.heappush(self.hi, -heapq.heappop(self.lo))    # move lo's max to hi
        if len(self.hi) > len(self.lo):                     # keep lo the same size or 1 bigger
            heapq.heappush(self.lo, -heapq.heappop(self.hi))

    def findMedian(self) -> float:
        if len(self.lo) > len(self.hi):
            return float(-self.lo[0])
        return (-self.lo[0] + self.hi[0]) / 2

mf = MedianFinder()
for x in (1, 2):
    mf.addNum(x)
print(mf.findMedian())        # 1.5
mf.addNum(3)
print(mf.findMedian())        # 2.0
for x in (10, -5, 4):
    mf.addNum(x)
print(mf.findMedian())        # median of [-5, 1, 2, 3, 4, 10] = 2.5
` },
      dry: { head: ['add', 'lo (as values)', 'hi', 'median'], rows: [['1', '[1]', '[]', '1.0'], ['2', '[1]', '[2]', '1.5'], ['3', '[2, 1]', '[3]', H.c('g', '2.0')]] },
      complexity: `<p>addNum O(log n), findMedian O(1), space O(n).</p>`,
      followUps: ['All numbers in [0, 100] — counting array, O(1) add and O(100) median', 'Sliding window median — needs deletions (lazy deletion with two heaps or SortedList)']
    }
  });

  practice.push({
    title: 'Russian Doll Envelopes', level: 'Hard', tags: ['sorting key', 'bisect', 'LIS'], companies: ['Google', 'Amazon', 'Microsoft'],
    statement: `<p>Envelopes are given as <code>[w, h]</code>. One envelope fits into another only if <b>both</b> width and height are strictly smaller. Return the maximum number of envelopes you can nest (Russian-doll style).</p>`,
    constraints: `1 ≤ n ≤ 10<sup>5</sup>, 1 ≤ w, h ≤ 10<sup>5</sup>`,
    example: `<p>[[5,4],[6,4],[6,7],[2,3]] → ${H.c('g', '3')}: [2,3] → [5,4] → [6,7].</p>`,
    brute: { why: `<p>Sort by width and run the O(n²) LIS DP comparing both dimensions: 10<sup>10</sup> steps at n = 10<sup>5</sup> → TLE. The trick is a <b>sort key</b> that reduces the 2-D problem to a 1-D LIS solvable with bisect.</p>`, code: `
def max_envelopes_quadratic(env):
    env = sorted(env)
    dp = [1] * len(env)
    for i in range(len(env)):
        for j in range(i):
            if env[j][0] < env[i][0] and env[j][1] < env[i][1]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)

print(max_envelopes_quadratic([[5, 4], [6, 4], [6, 7], [2, 3]]))  # 3
` },
    mcq: { q: 'Why sort by <code>(w, -h)</code> (width ascending, height DESCENDING)?', options: ['So two envelopes of equal width can never both appear in an increasing run of heights', 'To make the sort stable', 'Because heights must be processed largest first overall', 'It makes no difference'], answer: 0, explain: 'Equal widths can\'t nest. With heights descending inside the same width, a strictly increasing subsequence of heights can take at most one envelope per width.' },
    hints: [`<p>Hint 1: If widths were all distinct, sorting by width would reduce the problem to LIS on heights.</p>`, `<p>Hint 2: Equal widths break this — fix it with the key <code>(w, -h)</code> so equal-width envelopes appear with decreasing heights.</p>`, `<p>Hint 3: Then run the O(n log n) <code>bisect_left</code> tails LIS on the heights (strict). Recipe: env.sort(key=lambda e: (e[0], -e[1])); LIS of [h for _, h in env].</p>`],
    tests: { sig: 'int[][] -> int', fn: 'max_envelopes', cases: [
      [[[[5, 4], [6, 4], [6, 7], [2, 3]]], 3],
      [[[[1, 1], [1, 1], [1, 1]]], 1],
      [[[[4, 5], [4, 6], [6, 7], [2, 3], [1, 1]]], 4],
      [[[[1, 1]]], 1],
      [[[[1, 1], [1, 2], [1, 3]]], 1],
      [[[[1, 5], [2, 4], [3, 3], [4, 2]]], 1],
      [[[[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9], [10, 10], [11, 11], [12, 12], [13, 13], [14, 14], [15, 15], [16, 16], [17, 17], [18, 18], [19, 19], [20, 20], [21, 21], [22, 22], [23, 23], [24, 24], [25, 25], [26, 26], [27, 27], [28, 28], [29, 29], [30, 30], [31, 31], [32, 32], [33, 33], [34, 34], [35, 35], [36, 36], [37, 37], [38, 38], [39, 39], [40, 40], [41, 41], [42, 42], [43, 43], [44, 44], [45, 45], [46, 46], [47, 47], [48, 48], [49, 49], [50, 50], [51, 51], [52, 52], [53, 53], [54, 54], [55, 55], [56, 56], [57, 57], [58, 58], [59, 59], [60, 60], [61, 61], [62, 62], [63, 63], [64, 64], [65, 65], [66, 66], [67, 67], [68, 68], [69, 69], [70, 70], [71, 71], [72, 72], [73, 73], [74, 74], [75, 75], [76, 76], [77, 77], [78, 78], [79, 79], [80, 80], [81, 81], [82, 82], [83, 83], [84, 84], [85, 85], [86, 86], [87, 87], [88, 88], [89, 89], [90, 90], [91, 91], [92, 92], [93, 93], [94, 94], [95, 95], [96, 96], [97, 97], [98, 98], [99, 99], [100, 100]]], 100],
      [[[[100, 100], [99, 99], [98, 98], [97, 97], [96, 96], [95, 95], [94, 94], [93, 93], [92, 92], [91, 91], [90, 90], [89, 89], [88, 88], [87, 87], [86, 86], [85, 85], [84, 84], [83, 83], [82, 82], [81, 81], [80, 80], [79, 79], [78, 78], [77, 77], [76, 76], [75, 75], [74, 74], [73, 73], [72, 72], [71, 71], [70, 70], [69, 69], [68, 68], [67, 67], [66, 66], [65, 65], [64, 64], [63, 63], [62, 62], [61, 61], [60, 60], [59, 59], [58, 58], [57, 57], [56, 56], [55, 55], [54, 54], [53, 53], [52, 52], [51, 51], [50, 50], [49, 49], [48, 48], [47, 47], [46, 46], [45, 45], [44, 44], [43, 43], [42, 42], [41, 41], [40, 40], [39, 39], [38, 38], [37, 37], [36, 36], [35, 35], [34, 34], [33, 33], [32, 32], [31, 31], [30, 30], [29, 29], [28, 28], [27, 27], [26, 26], [25, 25], [24, 24], [23, 23], [22, 22], [21, 21], [20, 20], [19, 19], [18, 18], [17, 17], [16, 16], [15, 15], [14, 14], [13, 13], [12, 12], [11, 11], [10, 10], [9, 9], [8, 8], [7, 7], [6, 6], [5, 5], [4, 4], [3, 3], [2, 2], [1, 1]]], 100],
      [[[[2, 100], [3, 200], [4, 300], [5, 500], [5, 400], [5, 250], [6, 370], [6, 360], [7, 380]]], 5],
      [[[[865, 577], [337, 177], [1873, 1473], [785, 1969], [657, 1281], [1281, 481], [1233, 1073], [449, 577], [1489, 1185], [625, 1889], [33, 1729], [209, 273], [1057, 1281], [857, 1441], [49, 961], [641, 113], [337, 257], [1809, 577], [273, 1393], [497, 1441], [1625, 690], [1121, 321], [609, 465], [433, 1345], [1041, 1057], [1441, 1345], [1201, 1073], [1553, 1809], [1057, 377], [369, 1937], [769, 609], [1505, 1713], [833, 1617], [1249, 1153], [1809, 1697], [865, 1169], [753, 145], [1601, 417], [1153, 1361], [1041, 689], [17, 1665], [1345, 801], [1281, 1649], [353, 1769], [1281, 1233], [177, 1505], [1825, 1425], [785, 321], [1249, 609], [1233, 377], [65, 1777], [145, 1393], [1409, 401], [833, 641], [1713, 81], [1137, 385], [241, 1185], [1633, 737], [1361, 369], [433, 89], [1793, 929], [1409, 1345], [1402, 1533], [1521, 1777], [1857, 81], [673, 1169], [1185, 1905], [1233, 1185], [625, 1569], [1489, 849], [33, 1073], [561, 1025], [1945, 1873], [721, 1121], [849, 1617], [1281, 1713], [993, 881], [1393, 737], [161, 1089], [673, 897], [1505, 401], [129, 449], [929, 1761], [833, 1265], [289, 833], [1921, 17], [321, 737], [1713, 1937], [1777, 417], [369, 241], [49, 337], [1057, 977], [961, 1857], [513, 1505], [769, 1009], [1185, 193], [1121, 881], [529, 241], [489, 929], [577, 769], [705, 961], [1985, 545], [833, 1329], [1601, 1441], [673, 1985], [449, 1889], [449, 1449], [625, 1665], [753, 161], [17, 1697], [1841, 49], [465, 1041], [1057, 1665], [625, 833], [1873, 401], [961, 801], [33, 873], [417, 225], [1153, 1281], [785, 721], [1473, 1409], [657, 177], [1793, 241], [305, 897], [1649, 673], [961, 209], [241, 1217], [1969, 1793], [353, 1617], [1441, 1297], [113, 1665], [913, 801], [769, 913], [689, 65], [1857, 545], [865, 1201], [225, 49], [1857, 1905], [1377, 1073], [1569, 1153], [1105, 993], [881, 753], [929, 1793], [1249, 625], [17, 1361], [1105, 1649], [1, 1921], [1281, 1505], [1473, 1041], [337, 625], [1889, 225], [833, 529], [497, 673], [1761, 433], [193, 913], [369, 993], [417, 545], [225, 713], [81, 697], [289, 513], [1905, 561], [1169, 1073], [961, 625], [705, 321], [465, 1457], [913, 1073], [1393, 1489], [1377, 1265], [1169, 433], [1137, 497], [1121, 1185], [145, 609], [1137, 289], [305, 1713], [1857, 1873], [449, 897], [321, 897], [1009, 1521], [1921, 1905], [1233, 993], [282, 289], [1601, 841], [1265, 1313], [961, 865], [1345, 1], [193, 1921], [1633, 1025], [593, 1953], [1169, 1217], [1569, 1185], [1425, 1825], [1873, 1633], [1153, 289], [337, 833], [1633, 1873], [1985, 538], [49, 513], [1937, 273], [1729, 849], [545, 97], [641, 273], [225, 1633], [1473, 1809], [1137, 993], [465, 113], [353, 1361], [1777, 1649], [1233, 81], [1681, 1121], [1233, 1537], [1009, 305], [113, 1505], [1825, 321], [1169, 625], [705, 721], [993, 49], [1809, 49], [1249, 33], [657, 705], [145, 737], [1617, 1169], [881, 1473], [1937, 497], [1441, 1729], [1585, 961], [1921, 1633], [1905, 289], [1953, 897], [241, 1137], [145, 689], [1761, 337], [385, 1985], [113, 1249], [593, 1969], [1793, 1265], [1777, 1249], [1569, 81], [1825, 529], [145, 1793], [801, 1393], [1761, 1809], [529, 1113], [513, 1537], [401, 81], [1649, 849], [641, 193], [945, 273], [1857, 449], [209, 705], [881, 1225], [161, 1393], [241, 1841], [1081, 145], [1601, 993], [1649, 1313], [353, 1601], [1505, 689], [1969, 257], [97, 1633], [817, 833], [1409, 673], [1585, 17], [257, 1089], [1745, 1105], [1025, 801], [1745, 913], [794, 273], [1265, 993], [441, 1041], [1089, 1297], [1681, 1985], [1265, 1985], [1377, 1809], [1809, 1777], [1905, 1425], [33, 577], [65, 1233], [1345, 385], [1217, 209], [1057, 529], [993, 1505], [1281, 577], [289, 1905], [1633, 657], [913, 401], [145, 1537], [1697, 449], [641, 1713], [1505, 1777], [1169, 913], [593, 1921], [761, 1617], [1761, 721], [785, 97], [897, 1665], [113, 1297], [889, 273], [1225, 369], [1697, 545], [1729, 1873], [305, 513], [897, 561], [1377, 1617], [1441, 753], [881, 433], [753, 457], [1265, 1473], [1457, 1937], [385, 529], [1137, 1009], [913, 609], [1697, 1585], [1665, 17], [1329, 705], [1345, 497], [1665, 113], [625, 161], [1985, 1377], [1713, 1137], [81, 577], [1905, 481], [545, 1873], [433, 1441], [1025, 1489], [1825, 1217], [1809, 561], [1089, 657], [1473, 1297], [1697, 881], [1153, 545], [1041, 161], [1153, 705], [641, 1825], [497, 833], [1505, 97], [1681, 753], [1681, 1521], [1041, 481], [1665, 1617], [81, 897], [1425, 1169], [289, 1137], [1073, 225], [1841, 1857], [1041, 1857], [529, 977], [1985, 385], [1489, 641], [1265, 673], [1249, 1297], [1073, 849], [1969, 481], [289, 961], [769, 1953], [401, 129], [810, 1649], [1281, 1841], [1873, 1457], [1137, 1665], [1665, 81], [1617, 1137], [801, 1905], [193, 593], [1297, 513], [489, 465], [769, 97], [1857, 449], [673, 1505], [1905, 1009], [273, 817], [1601, 1377], [177, 1297], [1009, 737], [1601, 1201], [993, 977], [913, 209], [1457, 1089], [73, 1329], [161, 721], [721, 577], [833, 1569], [1409, 353], [1617, 1361], [1633, 905], [465, 609], [577, 1937], [1281, 1713], [305, 1649], [849, 1985], [1889, 17], [433, 673], [1649, 881], [1121, 1361], [881, 1985], [657, 1281], [417, 1697], [1457, 1777], [1697, 257], [497, 1937], [305, 1505], [1457, 929], [961, 1489], [1857, 785], [1265, 33], [1361, 929], [1281, 969], [641, 1329], [1521, 1873], [1233, 113], [1377, 1985], [1745, 1825], [1921, 1585], [881, 1281], [1361, 1681], [641, 865], [1841, 913], [73, 513], [1777, 1489], [641, 1777], [1041, 1457], [945, 945], [1137, 1473], [449, 81], [1505, 209], [1905, 1281], [689, 1601], [129, 465], [1153, 1617], [1697, 113], [113, 1745], [1633, 1521], [833, 1761], [954, 369], [609, 1873], [1473, 1169], [673, 1889], [833, 1153], [1953, 1377], [1553, 849], [961, 1473], [945, 177], [1969, 1281], [1265, 97], [1089, 673], [1825, 145], [513, 81], [1185, 1537], [1441, 1377], [1281, 1969], [1633, 1665], [1153, 1489], [1073, 1009], [1057, 1505], [65, 609], [425, 1025], [593, 1361], [1425, 129], [113, 1441], [97, 257], [497, 1649], [881, 1649], [193, 1073], [1745, 1809], [553, 1617], [1953, 1121], [49, 33], [193, 577], [401, 817], [209, 577], [593, 1281], [1233, 1121], [337, 1761], [433, 833], [1521, 593], [529, 913], [1537, 465], [1569, 545], [481, 1281], [1793, 1809], [529, 1953], [1833, 785], [1489, 385], [721, 1937], [689, 1265], [785, 449], [465, 1857], [1009, 177], [1841, 1329], [1169, 193], [1985, 865], [49, 385], [465, 961], [1057, 881], [1201, 625], [593, 1249], [1297, 1265], [1665, 1489], [497, 1313], [913, 785], [1721, 481], [513, 1841], [433, 1265], [1466, 1729], [225, 1681], [121, 353], [353, 113], [1729, 1433], [49, 1585], [1873, 305], [1953, 1201], [1425, 689], [1073, 1713], [1505, 241], [321, 1201], [1777, 1745], [977, 241], [1873, 465], [145, 1921], [625, 1249], [321, 1265], [1761, 321], [321, 1953], [49, 353], [417, 593], [1489, 1457], [241, 1873], [929, 241], [529, 753], [1025, 1857], [1953, 1249], [1185, 801], [817, 497], [1217, 1633], [177, 369], [1297, 209], [1737, 929], [1345, 1169], [1169, 1041], [1601, 81], [1681, 1729], [865, 641], [1745, 1473], [385, 1393], [1361, 1937], [1553, 1521], [873, 401], [1441, 1985], [369, 81], [545, 433], [817, 1681], [1697, 1105], [1009, 1985], [593, 1345], [1713, 1185], [529, 1], [801, 641], [1633, 545], [193, 1601], [1185, 1729], [241, 1049], [1057, 1233], [657, 1065], [1697, 1825], [849, 689], [1505, 369], [145, 257], [801, 321], [481, 1665], [1953, 1073], [49, 1841], [401, 1985], [721, 209], [161, 793], [1041, 33], [785, 1697], [785, 609], [433, 1537], [753, 1713], [1985, 1553], [1617, 801], [721, 289], [17, 433], [1233, 593], [1969, 1345], [33, 673], [1361, 97], [865, 673], [1121, 1233], [177, 1393], [1889, 705], [1121, 1425], [1105, 177], [1505, 1265], [1649, 1345], [737, 49], [1809, 177], [385, 321], [625, 705], [1009, 1313], [433, 1745], [961, 41], [1921, 17], [1201, 1841], [497, 1233], [1553, 1953], [1457, 705], [577, 1777], [17, 1865], [113, 833], [561, 1825], [1097, 1777], [593, 1905], [1825, 561], [545, 81], [833, 1281], [1409, 737], [961, 97], [801, 209], [1137, 1537], [1521, 961], [673, 609], [1553, 1153], [1345, 641], [1345, 833], [465, 657], [289, 913], [385, 81], [1233, 1089], [1457, 1537], [1857, 1441], [1633, 1505], [785, 761], [1025, 561], [257, 1217], [1425, 753], [497, 113], [801, 769], [1441, 721], [1313, 1777], [1441, 977], [1873, 1201], [529, 1681], [257, 1137], [177, 681], [321, 1633], [529, 1345], [193, 257], [977, 1041], [929, 1521], [321, 1553], [1329, 1073], [1921, 378], [385, 1793], [1201, 1745], [513, 193], [1953, 737], [1969, 225], [225, 1825], [657, 641], [1697, 1233], [1905, 337], [1841, 353], [1361, 497], [1489, 1313], [1185, 1873], [385, 1305], [881, 353], [977, 401], [1697, 1313], [1009, 1825], [1329, 449], [1505, 1217], [577, 241], [145, 1057], [177, 721], [1745, 1777], [1633, 353], [785, 1345], [1361, 193], [65, 929], [849, 1089], [1201, 1121], [1713, 1377], [497, 1409], [721, 49], [1953, 1953], [1505, 1185], [1409, 1857], [1409, 81], [1441, 1473], [593, 1329], [1025, 369], [161, 1345], [1873, 1601], [1297, 1697], [633, 689], [769, 769], [1009, 145], [833, 849], [225, 1121], [1761, 321], [497, 833], [817, 449], [545, 849], [1409, 1153], [1025, 1953], [305, 1409], [1633, 129], [1217, 1473], [1137, 1889], [1521, 881], [1561, 1185], [1985, 337], [145, 1505], [1185, 225], [1489, 314], [1601, 1441], [833, 1345], [225, 433], [1889, 1377], [97, 1761], [1857, 1937], [1953, 769], [769, 465], [1265, 433], [897, 1873], [305, 305], [1473, 1889], [1185, 1953], [1313, 1889], [161, 785], [193, 1889], [305, 1569], [906, 1025], [1521, 1761], [657, 1489], [1105, 17], [657, 673], [1569, 1105], [273, 1649], [1529, 1329], [865, 497], [929, 657], [1105, 513], [1041, 1361], [225, 81], [689, 1610], [641, 241], [1217, 1073], [1793, 1249], [161, 1], [737, 689], [465, 305], [449, 49], [865, 577], [145, 961], [657, 241], [1985, 49], [1009, 273], [769, 1921], [1233, 1793], [129, 961], [1761, 1201], [353, 673], [1889, 513], [561, 1889], [177, 1569], [1521, 193], [1825, 1617], [1073, 1393], [1937, 1169], [1505, 81], [209, 833], [1297, 1641], [1985, 337], [177, 1537], [1745, 1233], [497, 1233], [1425, 721], [929, 705], [81, 33], [193, 1905], [385, 1713], [1729, 961], [1169, 785], [929, 1089], [65, 1409], [1345, 1249], [1937, 1089], [577, 1889], [465, 1793], [1601, 1329], [1473, 945], [1745, 801], [641, 337], [49, 161], [897, 561], [481, 1969], [33, 241], [337, 865], [465, 1073], [137, 209], [433, 1409], [913, 1297], [1409, 273], [609, 1393], [1185, 193], [1409, 1041], [1553, 177], [721, 1345], [1281, 1985], [369, 17], [1313, 705], [81, 1089], [241, 1329], [545, 561], [737, 1697], [1361, 705], [1633, 1281], [1313, 1889], [1393, 689], [609, 1185], [481, 577], [1745, 1617], [1873, 1409], [1105, 241], [1681, 1009], [1665, 1889], [1041, 1585], [753, 1121], [257, 1], [769, 561], [1649, 993], [1665, 433], [377, 433], [241, 561], [1697, 833], [1073, 1585], [833, 129], [369, 129], [1841, 601], [1681, 705], [273, 1329], [1681, 1457], [465, 545], [849, 1409], [1137, 1665], [33, 1185], [1457, 657], [753, 209], [1745, 513], [1057, 369], [1425, 81], [1105, 929], [1089, 1377], [177, 449], [369, 1553], [369, 1057], [785, 753], [1089, 49], [737, 1233], [673, 481], [673, 1809], [1729, 369], [353, 369], [801, 1265], [1553, 465], [1281, 529], [497, 1217], [1633, 529], [1665, 1409], [1729, 721], [545, 737], [1169, 1969], [1265, 1857], [737, 1857], [897, 1489], [1649, 145], [385, 1345], [1521, 241], [1073, 1137], [305, 1569], [449, 65], [1505, 865], [1489, 1713], [1057, 449], [426, 705], [1009, 497], [1009, 1713], [785, 177], [481, 1233], [1, 1857], [993, 1025], [721, 1921], [433, 529], [353, 961], [1169, 1281], [961, 897], [1105, 1321], [289, 817], [1649, 801], [1089, 673], [1041, 209], [1313, 705], [1681, 753], [1217, 1201], [305, 833], [1185, 753], [1121, 113], [1585, 369], [1121, 1105], [929, 497], [433, 401], [49, 737], [1809, 401], [1025, 129], [897, 17], [785, 929], [737, 769], [1009, 1137], [321, 721], [1921, 513], [1105, 209], [1009, 1377], [1937, 1377], [1793, 1457], [401, 1841], [577, 1921], [417, 1633], [1105, 1153], [977, 785], [1345, 785], [1137, 1569], [1169, 161], [1233, 273], [49, 641], [1969, 1009], [1521, 97], [1201, 1761], [417, 1361], [401, 801], [1633, 561], [129, 1601], [1953, 1633], [577, 193], [929, 1057], [81, 977], [1825, 81], [849, 401], [961, 273], [817, 801], [1169, 353], [1873, 817], [705, 849], [721, 1777], [657, 689], [753, 1201], [1073, 65], [1329, 801], [449, 849], [545, 1985], [1697, 657], [1441, 1937], [705, 705], [881, 401], [1153, 1633], [1569, 241], [593, 241], [33, 1457], [913, 1889], [465, 1073], [1601, 1393], [929, 1073], [1073, 1985], [145, 193], [497, 769], [1937, 1137], [1041, 1153], [1449, 385], [705, 993], [1041, 513], [785, 1393], [929, 1809], [1761, 1313], [1345, 593], [1089, 353], [961, 1521], [1137, 1313], [1233, 449], [865, 1289], [1377, 1985], [65, 65], [657, 1569], [1921, 753], [497, 593], [1, 1649], [33, 1425], [481, 1073], [1425, 881], [1297, 1761], [209, 1201], [449, 1089], [449, 1425], [1185, 1153], [1585, 849], [673, 1057], [1761, 673], [337, 849], [353, 593], [1889, 1937], [1905, 521], [897, 1825], [609, 577], [1889, 801], [785, 993], [1, 1553], [625, 1489], [737, 225], [433, 1905], [561, 33], [1345, 1585], [1713, 1009], [1689, 1361], [225, 1873], [1537, 697], [1249, 65], [353, 625], [481, 1937], [337, 1409], [673, 561], [225, 849], [721, 1681], [129, 993], [769, 1473], [1937, 1617], [961, 1201], [1729, 1017], [1057, 945], [137, 1953], [1025, 625], [561, 1745], [225, 625], [145, 33], [1553, 1553], [1729, 689], [49, 1473], [561, 689], [1569, 1617], [385, 1425], [417, 1489], [1073, 257], [1297, 369], [913, 753], [497, 1809], [1393, 993], [1937, 689], [1505, 161], [1585, 1505], [1601, 449], [1745, 97], [401, 545], [1409, 577], [1377, 65], [833, 1681], [945, 593], [1505, 1505], [33, 1745], [1777, 1985], [625, 897], [1361, 1649], [1297, 129], [1425, 1169], [513, 1441], [1889, 1521], [241, 17], [1681, 993], [1393, 353], [65, 1], [97, 209], [1169, 641], [1521, 401], [385, 817], [1217, 921], [1089, 1457], [1633, 1185], [1153, 49], [1921, 1929], [1665, 17], [145, 1265], [1497, 1473], [993, 1969], [1297, 1665], [425, 65], [1297, 1921], [817, 49], [1777, 641], [1561, 433], [529, 1121], [705, 1809], [1873, 913], [785, 1393], [225, 1233], [1233, 817], [1569, 241], [266, 1809], [81, 1729], [1057, 161], [689, 1073], [1553, 161], [529, 1217], [1617, 1969], [1841, 209], [545, 81], [849, 1969], [1441, 817], [577, 1937], [529, 1009], [497, 17], [1057, 1345], [241, 849], [1793, 1825], [977, 1057], [817, 321], [49, 305], [1361, 1713], [1185, 321], [289, 1], [769, 1713], [161, 913], [737, 1761], [1729, 1905], [929, 865], [97, 609], [817, 1569], [1777, 1617], [1185, 1265], [433, 497], [273, 833], [1681, 1057], [1585, 145], [385, 1057], [1185, 1057], [1281, 497], [1137, 1985], [65, 305], [369, 897], [1425, 1233], [1473, 145], [1217, 961], [1225, 289], [1873, 145], [145, 1489], [1425, 353], [1761, 1633], [1081, 1937], [1025, 1569], [1793, 961], [113, 1697], [1313, 1649], [129, 593], [1921, 849], [97, 1073], [1153, 1665], [625, 1089], [657, 1105], [369, 1265], [1953, 1377], [1977, 977], [273, 1969], [465, 1281], [369, 1105], [33, 1649], [497, 689], [1697, 1329], [961, 1], [1969, 1537], [241, 1809], [97, 977], [1457, 1249], [1121, 1657], [1489, 1473], [1809, 49], [273, 657], [1361, 1313], [129, 113], [849, 705], [433, 17], [1409, 545], [1409, 449], [945, 993], [1809, 129], [289, 810], [673, 1945], [129, 369], [705, 1921], [1377, 833], [401, 225], [1297, 1633], [833, 1793], [833, 1985], [993, 737], [97, 1889], [1889, 753], [881, 385], [561, 1665], [633, 1761], [641, 897], [865, 833], [1505, 705], [849, 129], [113, 209], [1953, 609], [1361, 1681], [785, 545], [1297, 1633], [257, 881], [1105, 305], [1729, 913], [1681, 593], [193, 401], [609, 161], [897, 801], [1889, 481], [913, 1217], [961, 1665], [561, 929], [369, 1233], [33, 97], [1729, 1265], [1777, 177], [625, 1985], [1681, 257], [1441, 769], [241, 17], [1777, 577], [1217, 785], [177, 97], [385, 1361], [1377, 625], [161, 1745], [145, 1969], [1249, 1969], [497, 1601], [721, 929], [1713, 1265], [241, 689], [545, 1441], [1201, 1761], [865, 273], [113, 641], [1617, 433], [673, 1409], [737, 1041], [193, 1457], [673, 1041], [465, 881], [641, 1425], [49, 145], [1537, 945], [1889, 257], [753, 609], [913, 849], [1313, 625], [49, 545], [393, 609], [753, 721], [49, 193], [449, 1649], [1585, 1057], [1137, 1905], [1105, 1921], [1041, 609], [1809, 1473], [49, 945], [1697, 113], [17, 369], [1169, 65], [1, 1777], [49, 1473], [1153, 705], [1777, 913], [657, 433], [1105, 769], [1825, 561], [209, 945], [145, 913], [1521, 785], [1569, 97], [1313, 513], [1409, 1169], [1153, 1793], [577, 161], [1089, 1873], [513, 401], [513, 1153], [65, 1985], [1441, 1633], [161, 1265], [209, 1281], [1025, 481], [1633, 177], [1553, 513], [1905, 1665], [993, 913], [1193, 1201], [257, 641], [1073, 1633], [561, 1681], [305, 1025], [1633, 161], [273, 289], [1233, 257], [881, 1921], [593, 529], [1233, 1137], [161, 1393], [1905, 1761], [1121, 705], [513, 593], [1041, 1153], [945, 1882], [1105, 17], [673, 177], [1233, 1409], [1377, 1537], [209, 1569], [449, 433], [657, 321], [785, 1681], [897, 369], [945, 1889], [561, 577], [561, 417], [1025, 993], [1729, 673], [529, 1681], [1649, 1185], [433, 1697], [1745, 561], [1841, 913], [801, 1121], [657, 1233], [481, 1601], [545, 1953], [161, 289], [497, 1041], [1665, 1393], [449, 977], [225, 225], [913, 1185], [545, 161], [1713, 753], [193, 1937], [689, 913], [785, 1841], [33, 145], [513, 1777], [721, 241], [1249, 913], [1041, 145], [129, 1457], [1361, 1], [689, 177], [1217, 545], [385, 1681], [401, 1297], [545, 1153], [497, 1169], [1649, 81], [1393, 1089], [113, 1073], [1249, 401], [193, 1889], [1457, 113], [1713, 1121], [737, 1089], [1761, 193], [1281, 913], [657, 113], [1681, 113], [81, 1953], [1969, 129], [577, 1585], [609, 785], [241, 1169], [401, 849], [1873, 1729], [385, 1665], [49, 1610], [1185, 913], [753, 1809], [1169, 1289], [1841, 65], [33, 449], [1681, 401], [1841, 1873], [993, 353], [1361, 401], [257, 321], [1825, 1985], [65, 1905], [433, 609], [1857, 1553], [257, 289], [281, 1857], [1217, 129], [1633, 241], [1057, 33], [1905, 913], [801, 993], [1841, 689], [305, 449], [17, 161], [593, 1793], [1249, 1857], [1681, 497], [1825, 1473], [1713, 65], [273, 1393], [737, 1793], [721, 1233], [1441, 385], [17, 529], [1825, 1953], [641, 1249], [433, 1713], [721, 609], [1585, 1825], [209, 593], [145, 1793], [1169, 1649], [1521, 465], [1217, 225], [1969, 353], [1665, 641], [65, 305], [161, 1009], [801, 433], [145, 257], [641, 1185], [1681, 1809], [1473, 1761], [401, 1873], [225, 625], [913, 1137], [1777, 1185], [1377, 65], [1761, 1825], [1425, 1665], [577, 721], [977, 673], [1569, 433], [1105, 593], [1753, 1169], [209, 161], [369, 673], [145, 1729], [1921, 145], [865, 817], [721, 609], [65, 1185], [17, 849], [1873, 913], [1873, 1889], [465, 1489], [1985, 193], [593, 737], [833, 1601], [1137, 1777], [737, 897], [1297, 1505], [321, 673], [1137, 657], [1985, 1569], [185, 1985], [897, 113], [1185, 1745], [1073, 1281], [1553, 1297], [753, 1761], [273, 1377], [1745, 1457], [1153, 1121], [657, 1489], [881, 1089], [593, 1665], [257, 209], [1985, 1473], [849, 489], [1521, 1361], [929, 465], [1841, 1169], [209, 1009], [1713, 369], [641, 257], [305, 785], [353, 1585], [1137, 1089], [289, 113], [1217, 1905]]], 56],
    ] },
    solution: {
      approach: `<p>Sort with key <code>(w, -h)</code>, then compute the strictly increasing LIS of heights with the patience-sorting tails array and <code>bisect_left</code>. The sort guarantees widths strictly increase along any increasing height run.</p>`,
      code: { lang: 'python', run: true, code: `
from bisect import bisect_left
from typing import List

def max_envelopes(envelopes: List[List[int]]) -> int:
    envelopes.sort(key=lambda e: (e[0], -e[1]))   # width asc, height desc on ties
    tails = []
    for _, h in envelopes:
        i = bisect_left(tails, h)                  # strict LIS on heights
        if i == len(tails):
            tails.append(h)
        else:
            tails[i] = h
    return len(tails)

print(max_envelopes([[5, 4], [6, 4], [6, 7], [2, 3]]))   # 3
print(max_envelopes([[1, 1], [1, 1], [1, 1]]))           # 1
print(max_envelopes([[4, 5], [4, 6], [6, 7], [2, 3], [1, 1]]))   # 4
` },
      dry: { head: ['sorted envelope', 'h', 'tails'], rows: [['[2, 3]', '3', '[3]'], ['[5, 4]', '4', '[3, 4]'], ['[6, 7]', '7', '[3, 4, 7]'], ['[6, 4]', '4', H.c('g', '[3, 4, 7] → 3')]] },
      complexity: `<p>O(n log n) for the sort plus O(n log n) for the LIS; O(n) space.</p>`,
      followUps: ['3-D boxes (Box Stacking) — rotations + DP', 'Return the actual chain of envelopes']
    }
  });

  practice.push({
    title: 'LFU Cache', level: 'Hard', tags: ['design', 'OrderedDict', 'defaultdict', 'hash map'], companies: ['Amazon', 'Google', 'Microsoft'],
    statement: `<p>Design <code>LFUCache(capacity)</code> with O(1) <code>get(key)</code> and <code>put(key, value)</code>. When full, evict the key with the <b>lowest use count</b>; among ties, evict the <b>least recently used</b>. A get or put on a key counts as a use; a newly inserted key has count 1.</p>`,
    constraints: `1 ≤ capacity ≤ 10<sup>4</sup>, 0 ≤ key ≤ 10<sup>5</sup>, up to 2·10<sup>5</sup> calls`,
    example: `<p>cap 2: put(1,1) put(2,2) get(1)=1 put(3,3) ${H.c('r', '(evicts 2: count 1)')} get(2)=-1 get(3)=3 put(4,4) ${H.c('r', '(evicts 1: counts tie at 2, 1 is older)')} get(1)=-1 get(3)=3 get(4)=4.</p>`,
    brute: { why: `<p>Store (key → value, count, last_used_time) and on eviction scan all keys for the minimum (count, time): O(capacity) per eviction → 10<sup>4</sup> × 2·10<sup>5</sup> = 2·10<sup>9</sup>. We need the min-frequency group and its oldest key in O(1).</p>`, code: `
class LFUBrute:
    def __init__(self, cap):
        self.cap, self.t, self.d = cap, 0, {}    # key -> [value, count, last_time]
    def get(self, key):
        if key not in self.d:
            return -1
        self.t += 1
        e = self.d[key]; e[1] += 1; e[2] = self.t
        return e[0]
    def put(self, key, value):
        self.t += 1
        if key in self.d:
            e = self.d[key]; e[0] = value; e[1] += 1; e[2] = self.t
            return
        if len(self.d) >= self.cap:
            victim = min(self.d, key=lambda k: (self.d[k][1], self.d[k][2]))   # O(n) scan
            del self.d[victim]
        self.d[key] = [value, 1, self.t]

c = LFUBrute(2); c.put(1, 1); c.put(2, 2); print(c.get(1)); c.put(3, 3); print(c.get(2))
` },
    mcq: { q: 'Which structure gives O(1) "oldest key among those with frequency f"?', options: ['<code>defaultdict(OrderedDict)</code>: freq → keys in recency order, plus a <code>min_freq</code> variable', 'A heap of (freq, time, key)', 'A single OrderedDict sorted by frequency', 'A Counter plus most_common()'], answer: 0, explain: 'Each frequency bucket is an OrderedDict, so <code>popitem(last=False)</code> removes its LRU key in O(1). min_freq is either unchanged, +1 after a touch empties its bucket, or reset to 1 on insert. A heap would be O(log n) with lazy deletion.' },
    hints: [`<p>Hint 1: Group keys by use count. Within a group, order by recency — that's an LRU per frequency.</p>`, `<p>Hint 2: <code>key_val</code>, <code>key_freq</code> dicts plus <code>freq_keys = defaultdict(OrderedDict)</code>. Track <code>min_freq</code>.</p>`, `<p>Hint 3: Touch(key): move it from bucket f to f + 1; if bucket f became empty and f == min_freq, min_freq += 1. Insert: evict <code>freq_keys[min_freq].popitem(last=False)</code> if full, then add with freq 1 and set min_freq = 1. Capacity 0 edge case.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[['c = LFUCache(2)',
         'c.put(1, 1)',
         'c.put(2, 2)',
         'c.get(1)',
         'c.put(3, 3)',
         'c.get(2)',
         'c.get(3)',
         'c.put(4, 4)',
         'c.get(1)',
         'c.get(3)',
         'c.get(4)']],
       ['1',
        '-1',
        '3',
        '-1',
        '3',
        '4']],
      [[['c = LFUCache(1)',
         'c.put(1, 1)',
         'c.put(2, 2)',
         'c.get(1)',
         'c.get(2)',
         'c.put(2, 5)',
         'c.get(2)']],
       ['-1',
        '2',
        '5']],
      [[['c = LFUCache(2)',
         'c.put(1, 1)',
         'c.put(2, 2)',
         'c.put(1, 10)',
         'c.put(3, 3)',
         'c.get(2)',
         'c.get(1)',
         'c.get(3)']],
       ['-1',
        '10',
        '3']],
      [[['c = LFUCache(3)',
         'c.put(1, 1)',
         'c.put(2, 2)',
         'c.put(3, 3)',
         'c.get(1)',
         'c.get(1)',
         'c.get(2)',
         'c.put(4, 4)',
         'c.get(3)',
         'c.get(4)',
         'c.put(5, 5)',
         'c.get(2)',
         'c.get(1)',
         'c.get(4)',
         'c.get(5)']],
       ['1',
        '1',
        '2',
        '-1',
        '4',
        '-1',
        '1',
        '4',
        '5']],
      [[['c = LFUCache(2)',
         'c.put(1, 1)',
         'c.put(2, 2)',
         'c.put(3, 3)',
         'c.get(1)',
         'c.get(2)',
         'c.get(3)']],
       ['-1',
        '2',
        '3']],
      [[['c = LFUCache(2)',
         'c.get(1)',
         'c.put(0, 0)',
         'c.get(0)',
         'c.get(0)',
         'c.put(1, 1)',
         'c.put(2, 2)',
         'c.get(0)',
         'c.get(1)',
         'c.get(2)']],
       ['-1',
        '0',
        '0',
        '0',
        '-1',
        '2']],
      [[['c = LFUCache(1000)',
         'for k in range(5000): c.put(k, k * 2)',
         'c.get(4000)',
         'c.get(3999)',
         'c.get(4999)']],
       ['8000',
        '-1',
        '9998']],
    ] },
    solution: {
      approach: `<p>Three maps: key → value, key → freq, freq → OrderedDict of keys (LRU order). <code>min_freq</code> always points to the bucket to evict from. Every operation touches a constant number of dict/OrderedDict entries → O(1).</p>`,
      code: { lang: 'python', run: true, code: `
from collections import defaultdict, OrderedDict

class LFUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.key_val = {}
        self.key_freq = {}
        self.freq_keys = defaultdict(OrderedDict)   # freq -> keys, oldest first
        self.min_freq = 0

    def _touch(self, key):
        f = self.key_freq[key]
        del self.freq_keys[f][key]
        if not self.freq_keys[f]:
            del self.freq_keys[f]
            if self.min_freq == f:
                self.min_freq = f + 1
        self.key_freq[key] = f + 1
        self.freq_keys[f + 1][key] = None           # newest in its new bucket

    def get(self, key: int) -> int:
        if key not in self.key_val:
            return -1
        self._touch(key)
        return self.key_val[key]

    def put(self, key: int, value: int) -> None:
        if self.cap <= 0:
            return
        if key in self.key_val:
            self.key_val[key] = value
            self._touch(key)
            return
        if len(self.key_val) >= self.cap:
            bucket = self.freq_keys[self.min_freq]
            old, _ = bucket.popitem(last=False)     # LRU among least frequent
            if not bucket:
                del self.freq_keys[self.min_freq]
            del self.key_val[old], self.key_freq[old]
        self.key_val[key] = value
        self.key_freq[key] = 1
        self.freq_keys[1][key] = None
        self.min_freq = 1

c = LFUCache(2)
c.put(1, 1); c.put(2, 2)
print(c.get(1))                 # 1
c.put(3, 3)                     # evicts 2
print(c.get(2), c.get(3))       # -1 3
c.put(4, 4)                     # evicts 1 (tie on freq 2, 1 is older)
print(c.get(1), c.get(3), c.get(4))   # -1 3 4
` },
      dry: { head: ['op', 'freq buckets (old → new)', 'min_freq'], rows: [['put 1, put 2', '{1: [1, 2]}', '1'], ['get 1', '{1: [2], 2: [1]}', '1'], ['put 3', 'evict 2 → {1: [3], 2: [1]}', '1'], ['get 3', '{2: [1, 3]}', '2'], ['put 4', 'evict 1 → {1: [4], 2: [3]}', H.c('g', '1')]] },
      complexity: `<p>O(1) average per operation; O(capacity) space.</p>`,
      followUps: ['Why does min_freq only ever need +1 or reset to 1?', 'Thread safety and TTL', 'Compare with LRU: which workloads favour LFU?']
    }
  });

  practice.push({
    title: 'Merge k Sorted Lists', level: 'Hard', tags: ['heapq', 'linked list', 'divide and conquer'], companies: ['Amazon', 'Meta', 'Google', 'Microsoft'],
    statement: `<p>You are given an array of <code>k</code> sorted linked lists. Merge them into one sorted linked list and return its head.</p>`,
    constraints: `0 ≤ k ≤ 10<sup>4</sup>, total nodes N ≤ 10<sup>4</sup>, -10<sup>4</sup> ≤ val ≤ 10<sup>4</sup>`,
    example: `<p>[1→4→5, 1→3→4, 2→6] → ${H.c('g', '1→1→2→3→4→4→5→6')}.</p>`,
    brute: { why: `<p>Collect every value, sort, and rebuild: O(N log N) — fine, but ignores that inputs are already sorted and needs O(N) extra values. Merging lists one by one is O(k·N) because early nodes are re-walked k times. A heap of the k current heads gives O(N log k).</p>`, code: `
class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def merge_k_brute(lists):
    vals = []
    for node in lists:
        while node:
            vals.append(node.val)
            node = node.next
    dummy = tail = ListNode()
    for v in sorted(vals):                  # O(N log N)
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next

def build(xs):
    head = None
    for x in reversed(xs):
        head = ListNode(x, head)
    return head

res, out = merge_k_brute([build([1, 4, 5]), build([1, 3, 4]), build([2, 6])]), []
while res:
    out.append(res.val); res = res.next
print(out)
` },
    mcq: { q: 'Why push <code>(node.val, i, node)</code> rather than <code>(node.val, node)</code>?', options: ['On equal values Python would compare ListNode objects, which raises TypeError; i breaks ties', 'To sort lists by index', 'heapq requires 3-tuples', 'To make the heap a max-heap'], answer: 0, explain: 'Tuples compare element by element. Two equal vals force comparing nodes → <code>TypeError: \'&lt;\' not supported</code>. A unique integer tie-breaker (list index or a counter) avoids it.' },
    hints: [`<p>Hint 1: The next node of the result is always the smallest among the k current heads.</p>`, `<p>Hint 2: Keep those k heads in a min-heap keyed by value; pop the smallest, append it, push its successor.</p>`, `<p>Hint 3: Use a unique tie-breaker in the tuple and a dummy head node. Skip empty lists when building the heap. Recipe: heap = [(n.val, i, n) for i, n in enumerate(lists) if n].</p>`],
    tests: { sig: 'ListNode[] -> ListNode', fn: 'merge_k_lists', cases: [
      [[[[1, 4, 5], [1, 3, 4], [2, 6]]], [1, 1, 2, 3, 4, 4, 5, 6]],
      [[[]], []],
      [[[[]]], []],
      [[[[], []]], []],
      [[[[1]]], [1]],
      [[[[-3, -1], [], [-2, 0, 5], []]], [-3, -2, -1, 0, 5]],
      [[[[2, 2, 2], [2, 2]]], [2, 2, 2, 2, 2]],
      [[[[5], [4], [3], [2], [1]]], [1, 2, 3, 4, 5]],
      [[[[-4896], [2795], [4275], [-5388], [-8396], [-5011], [904], [-1911], [4223], [7316], [9111], [-7672], [-2450], [4836], [8507], [1495], [3126], [-6485], [6812], [-6357], [-1524], [-8917], [-5555], [-4505], [-4082], [-4813], [5619], [-7302], [1856], [-5682], [5427], [-1344], [-3624], [-5227], [9238], [5607], [-6425], [1448], [6426], [4027], [-9476], [-7791], [-2228], [-9553], [7419], [-6706], [8199], [-3711], [-8195], [-4725], [-9492], [7407], [1690], [8055], [-8666], [-5613], [-7906], [-1740], [-8958], [-2352], [7011], [8194], [7785], [8714], [7200], [-7914], [-2072], [8292], [-4462], [189], [7730], [-1018], [-1146], [-1238], [-1554], [-4699], [-6432], [6288], [-5078], [612], [-3712], [-2138], [5408], [8962], [9079], [-403], [-8005], [9619], [-6104], [9772], [3596], [6346], [-3804], [-4542], [3088], [-8542], [-4908], [9636], [7188], [-9736], [5492], [-4021], [8807], [8942], [3796], [-2658], [8978], [-739], [-2367], [-2295], [-9916], [-8666], [-1830], [-8050], [-7033], [-5027], [-7144], [-1149], [-1138], [8832], [6409], [-5453], [7219], [5209], [6233], [9253], [6121], [1794], [8078], [-1598], [1583], [7509], [-9472], [7839], [-1093], [2434], [-9935], [4576], [4499], [1966], [8277], [4868], [-6615], [1013], [-8006], [-9948], [4659], [-8130], [7094], [-2018], [5141], [-4706], [7780], [-4175], [-9984], [4681], [7658], [4735], [-6750], [4531], [-2790], [6566], [262], [2846], [3022], [4353], [6516], [9582], [-3182], [2542], [-7759], [-859], [8733], [-3275], [-3317], [-9128], [831], [-3385], [-2403], [-7508], [-8682], [-9254], [2156], [2532], [-6853], [-9950], [-1155], [6690], [-690], [4845], [4475], [-1594], [6136], [-9424], [3597], [-5391], [-2470], [7583], [-2270], [-6005], [-4102], [-6343], [3532], [9656], [3088], [9878], [488], [-7846], [4153], [128], [-6032], [3381], [-8330], [-3906], [-3499], [-9387], [-1189], [-4698], [7970], [-3552], [7441], [-1502], [-2688], [1639], [8081], [-9131], [2598], [9158], [5949], [-9952], [5733], [-3983], [-3338], [9557], [1995], [-5547], [-9065], [1509], [2124], [5158], [-7006], [8896], [-3105], [1296], [-5897], [578], [6274], [-2622], [4637], [2041], [-6587], [5965], [2973], [-612], [-7310], [-2367], [5627], [-9086], [6916], [-1959], [5136], [-2534], [-4966], [-5874], [3999], [8045], [-3915], [-2314], [4289], [8097], [-5732], [4412], [954], [9981], [-3240], [-1846], [85], [-2810], [-7816], [-4091], [6060], [1220], [6102], [5826], [9050], [5698], [651], [4606], [7861], [-9616], [7006], [4615], [-8150], [-7688], [2125], [2396], [-3395], [1332], [-8908], [3282], [-1401], [2968], [3935], [-1270], [4632], [1811], [1590], [-5372], [8396], [-2140], [8037], [-884], [3730], [6014], [-481], [-7874], [3965], [8001], [-2844], [-8636], [-5191], [9401], [-2993], [8760], [-8632], [6641], [-5445], [-5469], [5084], [7691], [1404], [-5360], [-9132], [-5987], [-9931], [929], [8196], [-3618], [-8483], [-4020], [-458], [-1309], [1494], [-6058], [4002], [-16], [-5473], [5028], [-7024], [-3373], [680], [-9133], [464], [9072], [-3830], [-5262], [-6347], [-4078], [-249], [6686], [4226], [-7455], [-4808], [6706], [-5653], [-517], [5087], [-1879], [4590], [1537], [9415], [-9524], [8307], [-8938], [358], [-2899], [3562], [9116], [8515], [781], [-9490], [412], [6363], [-3746], [-1714], [5837], [2088], [7064], [-4941], [-942], [-3294], [-7076], [-1970], [-9356], [2414], [-2445], [-8453], [-7850], [4564], [-6104], [8844], [-67], [-3524], [-8225], [-2747], [8773], [4562], [-3711], [-6293], [-6366], [3833], [3729], [9235], [-1951], [-8538], [4380], [1525], [-139], [7996], [-8576], [831], [4533], [3790], [3689], [-6625], [737], [7298], [2211], [-6493], [-2853], [-5501], [6175], [3651], [1901], [-3624], [-6242], [-7188], [-3805], [3850], [-4679], [7587], [5778], [7355], [554], [-3027], [4918], [6555], [2466], [-2361], [-8305], [-4023], [-5329], [9073], [9404], [-5532], [-7645], [-5647], [-3719], [9137], [5659], [-3074], [3456], [2298], [-6257], [3433], [1710], [5265], [3634], [-982], [-2265], [9490], [-5610], [-6737], [-728], [8854], [-8117], [-1719], [-4690], [-1570], [1723], [433], [-9311], [1241], [6166], [-6666], [-4929], [3782], [9124], [6164], [-7564], [704], [-4313], [9352], [7395], [-3129], [6391], [5454], [2924], [9714], [3004], [3057], [2166], [4305], [-4227], [155], [-4399], [4954], [3274], [1630], [-7268], [9445], [1388], [-8792], [598], [9955], [-9882], [8788], [-891], [-4104], [-415], [8647], [-4092], [8071], [-7934], [1177], [-8607], [784], [7664], [-4679], [1505], [-4635], [-7971], [7891], [5323], [-2389], [-1182], [-6709], [-6209], [-9107], [-6720], [718], [-536], [6183], [1874], [-6087], [2868], [6638], [4484], [4024], [-6978], [-6046], [-6319], [-817], [6843], [-488], [-6753], [-9777], [-9695], [-8500], [4857], [-6691], [-1460], [-1067], [-2022], [5207], [3523], [1701], [9272], [255], [7408], [2648], [2689], [2916], [3795], [6671], [6623], [-9089], [1651], [-4788], [651], [-7985], [-2268], [-1936], [-5971], [-7255], [3849], [-6239], [-6804], [6985], [-4280], [4726], [-4781], [-7990], [7869], [4457], [-5170], [8679], [2981], [-6938], [-4037], [3340], [7319], [2751], [333], [-5373], [-2567], [-2641], [7140], [7633], [-5248], [-6201], [-4528], [970], [2492], [5868], [-1891], [5206], [-485], [-3360], [-820], [4810], [-5026], [-2221], [1525], [6373], [-3652], [-8986], [4998], [-4932], [-8500], [7914], [146], [1874], [-2122], [-9093], [2567], [2657], [5169], [8244], [-6275], [-6491], [-2061], [-2228], [4595], [5129], [7805], [-6467], [3508], [-8907], [-8707], [-2635], [-1459], [-943], [9658], [5937], [7008], [4358], [-8381], [8144], [9731], [-8959], [-9078], [7797], [-1662], [4028], [8528], [2317], [3002], [3662], [1423], [8145], [5594], [-4055], [-334], [5293], [-7501], [-283], [6634], [6157], [-1356], [1019], [527], [4073], [8979], [-1736], [-4510], [8369], [-5425], [-3104], [2887], [-6445], [3954], [2877], [1619], [6897], [9292], [8773], [-2772], [4326], [5727], [-8407], [-6466], [8678], [5645], [4883], [-2850], [-1131], [-6207], [6670], [628], [1084], [6182], [5243], [-6572], [-5393], [6375], [5082], [8194], [3588], [9269], [824], [6501], [6119], [-8111], [-8489], [-6259], [4370], [3296], [2390], [8204], [1025], [6538], [7022], [-1174], [-4332], [-7492], [-966], [7656], [-5769], [6331], [684], [5176], [-5686], [-2634], [1958], [-6969], [6333], [-6163], [730], [2953], [4441], [-545], [-4547], [8025], [-627], [8219], [-6880], [-2522], [-9234], [3314], [8666], [-6140], [6503], [280], [-3148], [-658], [-7666], [8172], [9846], [1155], [-4656], [-4039], [-9544], [-5008], [9855], [-9082], [3421], [-3137], [5532], [-734], [-8899], [-4332], [-2105], [-4121], [-7803], [-8531], [7445], [1830], [-9527], [-6013], [839], [-5009], [-9326], [-4740], [1221], [5580], [-173], [6454], [-7153], [-7616], [-1857], [-9691], [5880], [3158], [9343], [-9711], [411], [1098], [6837], [8715], [2377], [7819], [-8300], [269], [-9874], [-5646], [-3862], [-3552], [-6779], [1867], [3794], [4108], [5767], [-746], [-3133], [-7433], [-4620], [5766], [6182], [252], [-3917], [-7345], [-1937], [8696], [9407], [-1640], [-3225], [-3500], [-8604], [3142], [7514], [-6209], [-769], [-6427], [-4861], [-8780], [2481], [6395], [-3199], [6904], [8045], [-7638], [-5886], [-498], [6379], [2388], [1773], [-6591], [2358], [-136], [2366], [1230], [7294], [7137], [1647], [9471], [-1255], [-1712], [7607], [-625], [-5562], [-1816], [-2518], [7136], [-4798], [-628], [8222], [1261], [-5625], [-5532], [-7493], [-6801], [2317], [-4050], [-7746], [9911], [5448], [6891], [8833], [-2531], [-263], [6613], [7389], [9226], [1755], [3760], [6179], [-7168], [-8147], [2533], [-4608], [-1366], [-8122], [-7644], [1740], [1920], [5555], [-908], [9407], [3236], [-1561], [-5050], [-1794], [-8818], [-8195], [-6409], [4553], [-1628], [-2204], [-2036], [1606], [-7504], [5011], [7107], [-4172], [-397], [-5432], [-5342], [4532], [5644], [6197], [-3333], [-2431], [-2358], [1919], [4640], [2935], [4543], [-9668], [-6709], [6917], [1079], [-7509], [4270], [102], [-5321], [-9252], [8827], [509], [3660], [-4173], [-7476], [4236], [-7487], [-8670], [5095], [-1919], [7603], [-9927], [5870], [-4656], [676], [-5002], [-8497], [-2394], [1064], [7498], [-6113], [1269], [-2383], [-750], [5335], [-2241], [2201], [-6283], [4885], [8062], [-6670], [-8943], [7981], [-4901], [5969], [9394], [-6320], [-9815], [-2802], [-4346], [-37], [-4241], [-4391], [-6288], [-3861], [2730], [6467], [8773], [-3097], [-7817], [-6073], [-928], [-3068], [1305], [8241], [-530], [6896], [-5730], [9565], [6402], [4175], [5928], [7278], [-7269], [-8129], [-4916], [4167], [-1552], [-7568], [9332], [8897], [-4783], [5476], [482], [80], [-736], [8615], [-8977], [-9296], [-7968], [-7318], [1766], [-3513], [2908], [-8524], [7079], [8952], [-6127], [-9076], [-9447], [-7477], [-8474], [-2704], [8715], [9041], [-4919], [936], [517], [394], [5894], [2042], [4376], [6522], [-7876], [-7544], [-9340], [-4734], [4174], [-591], [-7446], [-3129], [-2724], [-5156], [-387], [2186], [-5941], [3635], [2928], [4410], [-8842], [-6281], [4087], [1983], [-97], [7206], [3292], [-2769], [-8194], [-8077], [1850], [-5496], [8572], [3915], [9233], [7202], [-2107], [-3844], [-6822], [4253], [-4718], [-2789], [6697], [-1106], [6473], [-9007], [-3864], [9778], [-8477], [-8710], [-9378], [-6298], [-1403], [3535], [-2830], [2811], [-1708], [243], [3714], [3270], [1304], [-4519], [-4898], [-5399], [-6257], [-6333], [1639], [-5412], [1608], [-7392], [-2285], [-4844], [-4705], [-3707], [4359], [-1709], [403], [74], [-525], [-4739], [1855], [-6122], [-7074], [-216], [5541], [-1029], [-3732], [2299], [7960], [-2528], [-4367], [-2517], [832], [4918], [3515], [5476], [3127], [2188], [1080], [3392], [5035], [5598], [-6796], [9642], [-5241], [8005], [2049], [3159], [-6608], [9146], [-7446], [-7208], [-7309], [-3641], [-5309], [-1496], [-8228], [8573], [8885], [-3740], [-1339], [4758], [-687], [4963], [3594], [1749], [9437], [9605], [-5361], [-3690], [1750], [-7842], [-3805], [-8509], [-7814], [-4121], [-953], [-1335], [-9299], [-6360], [-630], [5553], [4648], [2289], [7287], [-4233], [5355], [1140], [2312], [-4112], [7469], [-2885], [1346], [-4612], [-2021], [-9533], [4912], [-1783], [5769], [2352], [8564], [-8307], [-568], [2266], [-9550], [5238], [-4646], [3630], [-9872], [1025], [-2100], [-9366], [-8061], [1624], [-1802], [6654], [7274], [-6169], [1678], [9704], [-8238], [-6617], [8404], [-8948], [543], [8531], [8615], [8209], [640], [-248], [-4129], [-1560], [9625], [4208], [8088], [5227], [-8259], [-2546], [2756], [635], [9775], [9184], [7171], [6677], [9124], [6763], [-867], [-9123], [9109], [8964], [1486], [-7458], [5847], [-1006], [2581], [6338], [5098], [-3325], [2228], [726], [-5539], [5121], [-9100], [-8203], [-1055], [-7286], [8998], [-9066], [8535], [-9859], [-1340], [9747], [-5255], [-6586], [-849], [-7652], [7321], [4610], [7690], [730], [228], [-6506], [-6836], [-7510], [7250], [-7321], [-9538], [-4716], [-6379], [7584], [8525], [7515], [6573], [7358], [-6873], [-4862], [-7516], [-7161], [61], [8423], [6051], [9563], [1396], [4417], [-4881], [1302], [-7356], [-8549], [253], [-321], [-4239], [7481], [-7550], [-8167], [9317], [5501], [-3329], [8536], [4366], [-2932], [8306], [2779], [2996], [-2121], [1096], [-1348], [-7262], [-6642], [7833], [-7677], [-5967], [8630], [-4064], [-3476], [779], [7885], [-3589], [685], [5615], [7370], [6842], [-8660], [1051], [-3983], [1597], [-8795], [-1479], [-2101], [-197], [5160], [3225], [-6401], [130], [-764], [-9371], [-7004], [-2944], [5030], [6552], [-2587], [-3884], [-5274], [5935], [9966], [-1384], [-5097], [-2758], [-9999], [2121], [552], [-3708], [2113], [-8983], [-8528], [-4508], [9779], [-5957], [9821], [4494], [-3773], [-9210], [7974], [3352], [2250], [3929], [7765], [3051], [-6300], [-9837], [2770], [8083], [7233], [9092], [-5906], [2283], [-3439], [8277], [-4661], [3187], [6034], [2812], [722], [9496], [-8496], [1855], [5136], [-4887], [-23], [6492], [-9462], [-941], [-209], [849], [1420], [7453], [2525], [-5378], [6245], [-5797], [9282], [-844], [-6603], [3012], [9745], [-3127], [1441], [9942], [-7993], [-2504], [-7401], [2135], [2334], [2651], [7435], [7887], [2581], [6694], [8637], [-3840], [-4213], [-1551], [-1443], [-5754], [3078], [1533], [420], [1490], [-6000], [5833], [1548], [-8762], [-1644], [-3467], [5702], [7324], [-3708], [2147], [8320], [-4208], [2903], [-9730], [-1244], [-1604], [-6853], [6243], [-3694], [-5311], [-7394], [3225], [-7275], [3551], [-660], [-2924], [-6764], [-1015], [5052], [-9150], [7856], [6021], [8227], [-4738], [9459], [45], [-789], [-2904], [927], [-7835], [8006], [258], [9420], [-1668], [-4513], [-4324], [-8510], [5825], [7104], [7397], [4632], [-2588], [-2195], [9057], [-3147], [777], [-4674], [-603], [-5497], [9985], [-9837], [-52], [-2313], [-7475], [-7543], [-6132], [-9366], [9577], [-3649], [-3685], [5363], [1674], [-6877], [-2686], [3210], [-9657], [9981], [-7375], [-8247], [-3799], [6123], [7732], [-3694], [-1655], [-6667], [-9862], [-9236], [-7297], [-4190], [3024], [6148], [2765], [-5815], [-4679], [-5564], [-7027], [-9389], [8652], [1225], [453], [-6769], [573], [-856], [-7007], [7760], [7907], [6893], [9456], [1634], [1136], [-6344], [4371], [1795], [8227], [-7172], [-9215], [-5706], [4593], [2431], [544], [-8877], [2282], [-4963], [-4857], [2444], [-236], [-4748], [-2937], [4496], [3734], [-675], [-1313], [-9925], [-4385], [9833], [-3468], [-4364], [-1446], [-6446], [9], [210], [6999], [-9600], [6998], [-2123], [-8351], [1952], [1483], [6255], [-9081], [7316], [-2179], [6945], [9753], [-742], [6620], [-5951], [8729], [8315], [-7915], [-7569], [1604], [2717], [-3059], [-9277], [-9287], [-7921], [-9543], [3261], [-1530], [3311], [7207], [-6664], [-3599], [-712], [6961], [6785], [-1783], [-9022], [-2711], [8330], [-3624], [2914], [7677], [2994], [-8800], [-2396], [7928], [-7168], [2386], [-9164], [8815], [1766], [8130], [-462], [2760], [2901], [-4809], [4132], [-2117], [9499], [7895], [7210], [9718], [7265], [-990], [-6470], [1772], [3863], [-8490], [6507], [-2423], [9129], [8440], [-7013], [-9959], [-4323], [4588], [5123], [1009], [7684], [8670], [3808], [8331], [1220], [5238], [2300], [-8552], [3274], [-2912], [1883], [5647], [8512], [-5681], [9258], [-5010], [-166], [-9732], [-5815], [3360], [342], [5885], [-25], [9661], [7405], [-1570], [-6084], [5869], [894], [6302], [6342], [-6247], [8449], [-6305], [-1974], [-8999], [-1688], [-57], [-6526], [6645], [-7742], [-9533], [2418], [-9619], [6684], [9897], [7229], [6311], [8434], [-8785], [-241], [-9246], [-4768], [-5445], [-1319], [3952], [-1596], [-8849], [-7038], [-8252], [3765], [4136], [8342], [7270], [7483], [-3425], [9398], [-8245], [-953], [4329], [-2017], [-9944], [-8985], [8673], [-1081], [-7230], [7853], [-3697], [4562], [1038], [-728], [-5479], [7002], [5441], [177], [-9160], [528], [6196], [8809], [-2388], [8486], [7637], [-7327], [9572], [4813], [-4908], [-3102], [4868], [9674], [-4560], [9516], [-9117], [-3119], [-7519], [3325], [-1129], [-3264], [-9054], [-298], [6031], [3566], [-9357], [7871], [-8351], [6052], [-5079], [7482], [-5215], [-9997], [-6776], [9074], [-4722], [179], [4502], [-7469], [-6732], [-8220], [4569], [-7038], [4520], [7044], [-1949], [8072], [-9637], [2674], [-3178], [995], [5000], [9926], [9231], [-5260], [7014], [6136], [-6561], [-4855], [3481], [3582], [-8007], [2552], [2531], [1095], [170], [4198], [540], [5268], [7552], [-4911], [-9948], [867], [-2469], [2890], [-8549], [-1864], [-7053], [9253], [-2694], [3814], [-9533], [1638], [6004], [2576], [3349], [5026], [-5200], [4188], [-4910], [-6184], [1363], [6838], [-1276], [9331], [5286], [-1175], [4670], [-5521], [-8685], [-8006], [7189], [-5516], [-1831], [-1296], [4162], [-4081], [9415], [6736], [-7850], [-6976], [1249], [1102], [4621], [9214], [9542], [6576], [5870], [-5361], [6670], [6322], [4897], [-5153], [2731], [5855], [-2736], [4692], [-5908], [-8359], [536], [1204], [2600], [-8350], [2877], [7920], [-3582], [1113], [477], [6319], [3936], [3903], [-5495], [1687], [2792], [-3764], [-5839], [-9111], [9662], [-4822], [-8215], [-5472], [3600], [4420], [-827], [-2379], [3058], [-2949], [-7078], [7906], [-9713], [-3537], [6465], [-2950], [-5514], [7181], [1161], [-8123], [3182], [6782], [-9005], [2340], [-6667], [-7273], [-8880], [-3357], [-7700], [6799], [-9880], [7593], [-8633], [-5760], [6651], [675], [6963], [9954], [-5931], [7736], [7460], [-157], [11], [-2807], [-7301], [-2871], [7017], [8593], [3379], [-4861], [1805], [-9735], [377], [4597], [939], [-926], [4658], [-4868], [6411], [1066], [6350], [9750], [-7474], [5732], [-1520], [-952], [-3807], [7141], [941], [-3142], [5116], [-8650], [5050], [629], [-2293], [-8817], [-5120], [-8764], [6620], [7661], [7756], [7256], [-6498], [-8051], [7788], [1868], [6491], [7888], [6816], [2498], [-806], [9786], [987], [1883]]], [-9999, -9997, -9984, -9959, -9952, -9950, -9948, -9948, -9944, -9935, -9931, -9927, -9925, -9916, -9882, -9880, -9874, -9872, -9862, -9859, -9837, -9837, -9815, -9777, -9736, -9735, -9732, -9730, -9713, -9711, -9695, -9691, -9668, -9657, -9637, -9619, -9616, -9600, -9553, -9550, -9544, -9543, -9538, -9533, -9533, -9533, -9527, -9524, -9492, -9490, -9476, -9472, -9462, -9447, -9424, -9389, -9387, -9378, -9371, -9366, -9366, -9357, -9356, -9340, -9326, -9311, -9299, -9296, -9287, -9277, -9254, -9252, -9246, -9236, -9234, -9215, -9210, -9164, -9160, -9150, -9133, -9132, -9131, -9128, -9123, -9117, -9111, -9107, -9100, -9093, -9089, -9086, -9082, -9081, -9078, -9076, -9066, -9065, -9054, -9022, -9007, -9005, -8999, -8986, -8985, -8983, -8977, -8959, -8958, -8948, -8943, -8938, -8917, -8908, -8907, -8899, -8880, -8877, -8849, -8842, -8818, -8817, -8800, -8795, -8792, -8785, -8780, -8764, -8762, -8710, -8707, -8685, -8682, -8670, -8666, -8666, -8660, -8650, -8636, -8633, -8632, -8607, -8604, -8576, -8552, -8549, -8549, -8542, -8538, -8531, -8528, -8524, -8510, -8509, -8500, -8500, -8497, -8496, -8490, -8489, -8483, -8477, -8474, -8453, -8407, -8396, -8381, -8359, -8351, -8351, -8350, -8330, -8307, -8305, -8300, -8259, -8252, -8247, -8245, -8238, -8228, -8225, -8220, -8215, -8203, -8195, -8195, -8194, -8167, -8150, -8147, -8130, -8129, -8123, -8122, -8117, -8111, -8077, -8061, -8051, -8050, -8007, -8006, -8006, -8005, -7993, -7990, -7985, -7971, -7968, -7934, -7921, -7915, -7914, -7906, -7876, -7874, -7850, -7850, -7846, -7842, -7835, -7817, -7816, -7814, -7803, -7791, -7759, -7746, -7742, -7700, -7688, -7677, -7672, -7666, -7652, -7645, -7644, -7638, -7616, -7569, -7568, -7564, -7550, -7544, -7543, -7519, -7516, -7510, -7509, -7508, -7504, -7501, -7493, -7492, -7487, -7477, -7476, -7475, -7474, -7469, -7458, -7455, -7446, -7446, -7433, -7401, -7394, -7392, -7375, -7356, -7345, -7327, -7321, -7318, -7310, -7309, -7302, -7301, -7297, -7286, -7275, -7273, -7269, -7268, -7262, -7255, -7230, -7208, -7188, -7172, -7168, -7168, -7161, -7153, -7144, -7078, -7076, -7074, -7053, -7038, -7038, -7033, -7027, -7024, -7013, -7007, -7006, -7004, -6978, -6976, -6969, -6938, -6880, -6877, -6873, -6853, -6853, -6836, -6822, -6804, -6801, -6796, -6779, -6776, -6769, -6764, -6753, -6750, -6737, -6732, -6720, -6709, -6709, -6706, -6691, -6670, -6667, -6667, -6666, -6664, -6642, -6625, -6617, -6615, -6608, -6603, -6591, -6587, -6586, -6572, -6561, -6526, -6506, -6498, -6493, -6491, -6485, -6470, -6467, -6466, -6446, -6445, -6432, -6427, -6425, -6409, -6401, -6379, -6366, -6360, -6357, -6347, -6344, -6343, -6333, -6320, -6319, -6305, -6300, -6298, -6293, -6288, -6283, -6281, -6275, -6259, -6257, -6257, -6247, -6242, -6239, -6209, -6209, -6207, -6201, -6184, -6169, -6163, -6140, -6132, -6127, -6122, -6113, -6104, -6104, -6087, -6084, -6073, -6058, -6046, -6032, -6013, -6005, -6000, -5987, -5971, -5967, -5957, -5951, -5941, -5931, -5908, -5906, -5897, -5886, -5874, -5839, -5815, -5815, -5797, -5769, -5760, -5754, -5732, -5730, -5706, -5686, -5682, -5681, -5653, -5647, -5646, -5625, -5613, -5610, -5564, -5562, -5555, -5547, -5539, -5532, -5532, -5521, -5516, -5514, -5501, -5497, -5496, -5495, -5479, -5473, -5472, -5469, -5453, -5445, -5445, -5432, -5425, -5412, -5399, -5393, -5391, -5388, -5378, -5373, -5372, -5361, -5361, -5360, -5342, -5329, -5321, -5311, -5309, -5274, -5262, -5260, -5255, -5248, -5241, -5227, -5215, -5200, -5191, -5170, -5156, -5153, -5120, -5097, -5079, -5078, -5050, -5027, -5026, -5011, -5010, -5009, -5008, -5002, -4966, -4963, -4941, -4932, -4929, -4919, -4916, -4911, -4910, -4908, -4908, -4901, -4898, -4896, -4887, -4881, -4868, -4862, -4861, -4861, -4857, -4855, -4844, -4822, -4813, -4809, -4808, -4798, -4788, -4783, -4781, -4768, -4748, -4740, -4739, -4738, -4734, -4725, -4722, -4718, -4716, -4706, -4705, -4699, -4698, -4690, -4679, -4679, -4679, -4674, -4661, -4656, -4656, -4646, -4635, -4620, -4612, -4608, -4560, -4547, -4542, -4528, -4519, -4513, -4510, -4508, -4505, -4462, -4399, -4391, -4385, -4367, -4364, -4346, -4332, -4332, -4324, -4323, -4313, -4280, -4241, -4239, -4233, -4227, -4213, -4208, -4190, -4175, -4173, -4172, -4129, -4121, -4121, -4112, -4104, -4102, -4092, -4091, -4082, -4081, -4078, -4064, -4055, -4050, -4039, -4037, -4023, -4021, -4020, -3983, -3983, -3917, -3915, -3906, -3884, -3864, -3862, -3861, -3844, -3840, -3830, -3807, -3805, -3805, -3804, -3799, -3773, -3764, -3746, -3740, -3732, -3719, -3712, -3711, -3711, -3708, -3708, -3707, -3697, -3694, -3694, -3690, -3685, -3652, -3649, -3641, -3624, -3624, -3624, -3618, -3599, -3589, -3582, -3552, -3552, -3537, -3524, -3513, -3500, -3499, -3476, -3468, -3467, -3439, -3425, -3395, -3385, -3373, -3360, -3357, -3338, -3333, -3329, -3325, -3317, -3294, -3275, -3264, -3240, -3225, -3199, -3182, -3178, -3148, -3147, -3142, -3137, -3133, -3129, -3129, -3127, -3119, -3105, -3104, -3102, -3097, -3074, -3068, -3059, -3027, -2993, -2950, -2949, -2944, -2937, -2932, -2924, -2912, -2904, -2899, -2885, -2871, -2853, -2850, -2844, -2830, -2810, -2807, -2802, -2790, -2789, -2772, -2769, -2758, -2747, -2736, -2724, -2711, -2704, -2694, -2688, -2686, -2658, -2641, -2635, -2634, -2622, -2588, -2587, -2567, -2546, -2534, -2531, -2528, -2522, -2518, -2517, -2504, -2470, -2469, -2450, -2445, -2431, -2423, -2403, -2396, -2394, -2389, -2388, -2383, -2379, -2367, -2367, -2361, -2358, -2352, -2314, -2313, -2295, -2293, -2285, -2270, -2268, -2265, -2241, -2228, -2228, -2221, -2204, -2195, -2179, -2140, -2138, -2123, -2122, -2121, -2117, -2107, -2105, -2101, -2100, -2072, -2061, -2036, -2022, -2021, -2018, -2017, -1974, -1970, -1959, -1951, -1949, -1937, -1936, -1919, -1911, -1891, -1879, -1864, -1857, -1846, -1831, -1830, -1816, -1802, -1794, -1783, -1783, -1740, -1736, -1719, -1714, -1712, -1709, -1708, -1688, -1668, -1662, -1655, -1644, -1640, -1628, -1604, -1598, -1596, -1594, -1570, -1570, -1561, -1560, -1554, -1552, -1551, -1530, -1524, -1520, -1502, -1496, -1479, -1460, -1459, -1446, -1443, -1403, -1401, -1384, -1366, -1356, -1348, -1344, -1340, -1339, -1335, -1319, -1313, -1309, -1296, -1276, -1270, -1255, -1244, -1238, -1189, -1182, -1175, -1174, -1155, -1149, -1146, -1138, -1131, -1129, -1106, -1093, -1081, -1067, -1055, -1029, -1018, -1015, -1006, -990, -982, -966, -953, -953, -952, -943, -942, -941, -928, -926, -908, -891, -884, -867, -859, -856, -849, -844, -827, -820, -817, -806, -789, -769, -764, -750, -746, -742, -739, -736, -734, -728, -728, -712, -690, -687, -675, -660, -658, -630, -628, -627, -625, -612, -603, -591, -568, -545, -536, -530, -525, -517, -498, -488, -485, -481, -462, -458, -415, -403, -397, -387, -334, -321, -298, -283, -263, -249, -248, -241, -236, -216, -209, -197, -173, -166, -157, -139, -136, -97, -67, -57, -52, -37, -25, -23, -16, 9, 11, 45, 61, 74, 80, 85, 102, 128, 130, 146, 155, 170, 177, 179, 189, 210, 228, 243, 252, 253, 255, 258, 262, 269, 280, 333, 342, 358, 377, 394, 403, 411, 412, 420, 433, 453, 464, 477, 482, 488, 509, 517, 527, 528, 536, 540, 543, 544, 552, 554, 573, 578, 598, 612, 628, 629, 635, 640, 651, 651, 675, 676, 680, 684, 685, 704, 718, 722, 726, 730, 730, 737, 777, 779, 781, 784, 824, 831, 831, 832, 839, 849, 867, 894, 904, 927, 929, 936, 939, 941, 954, 970, 987, 995, 1009, 1013, 1019, 1025, 1025, 1038, 1051, 1064, 1066, 1079, 1080, 1084, 1095, 1096, 1098, 1102, 1113, 1136, 1140, 1155, 1161, 1177, 1204, 1220, 1220, 1221, 1225, 1230, 1241, 1249, 1261, 1269, 1296, 1302, 1304, 1305, 1332, 1346, 1363, 1388, 1396, 1404, 1420, 1423, 1441, 1448, 1483, 1486, 1490, 1494, 1495, 1505, 1509, 1525, 1525, 1533, 1537, 1548, 1583, 1590, 1597, 1604, 1606, 1608, 1619, 1624, 1630, 1634, 1638, 1639, 1639, 1647, 1651, 1674, 1678, 1687, 1690, 1701, 1710, 1723, 1740, 1749, 1750, 1755, 1766, 1766, 1772, 1773, 1794, 1795, 1805, 1811, 1830, 1850, 1855, 1855, 1856, 1867, 1868, 1874, 1874, 1883, 1883, 1901, 1919, 1920, 1952, 1958, 1966, 1983, 1995, 2041, 2042, 2049, 2088, 2113, 2121, 2124, 2125, 2135, 2147, 2156, 2166, 2186, 2188, 2201, 2211, 2228, 2250, 2266, 2282, 2283, 2289, 2298, 2299, 2300, 2312, 2317, 2317, 2334, 2340, 2352, 2358, 2366, 2377, 2386, 2388, 2390, 2396, 2414, 2418, 2431, 2434, 2444, 2466, 2481, 2492, 2498, 2525, 2531, 2532, 2533, 2542, 2552, 2567, 2576, 2581, 2581, 2598, 2600, 2648, 2651, 2657, 2674, 2689, 2717, 2730, 2731, 2751, 2756, 2760, 2765, 2770, 2779, 2792, 2795, 2811, 2812, 2846, 2868, 2877, 2877, 2887, 2890, 2901, 2903, 2908, 2914, 2916, 2924, 2928, 2935, 2953, 2968, 2973, 2981, 2994, 2996, 3002, 3004, 3012, 3022, 3024, 3051, 3057, 3058, 3078, 3088, 3088, 3126, 3127, 3142, 3158, 3159, 3182, 3187, 3210, 3225, 3225, 3236, 3261, 3270, 3274, 3274, 3282, 3292, 3296, 3311, 3314, 3325, 3340, 3349, 3352, 3360, 3379, 3381, 3392, 3421, 3433, 3456, 3481, 3508, 3515, 3523, 3532, 3535, 3551, 3562, 3566, 3582, 3588, 3594, 3596, 3597, 3600, 3630, 3634, 3635, 3651, 3660, 3662, 3689, 3714, 3729, 3730, 3734, 3760, 3765, 3782, 3790, 3794, 3795, 3796, 3808, 3814, 3833, 3849, 3850, 3863, 3903, 3915, 3929, 3935, 3936, 3952, 3954, 3965, 3999, 4002, 4024, 4027, 4028, 4073, 4087, 4108, 4132, 4136, 4153, 4162, 4167, 4174, 4175, 4188, 4198, 4208, 4223, 4226, 4236, 4253, 4270, 4275, 4289, 4305, 4326, 4329, 4353, 4358, 4359, 4366, 4370, 4371, 4376, 4380, 4410, 4412, 4417, 4420, 4441, 4457, 4475, 4484, 4494, 4496, 4499, 4502, 4520, 4531, 4532, 4533, 4543, 4553, 4562, 4562, 4564, 4569, 4576, 4588, 4590, 4593, 4595, 4597, 4606, 4610, 4615, 4621, 4632, 4632, 4637, 4640, 4648, 4658, 4659, 4670, 4681, 4692, 4726, 4735, 4758, 4810, 4813, 4836, 4845, 4857, 4868, 4868, 4883, 4885, 4897, 4912, 4918, 4918, 4954, 4963, 4998, 5000, 5011, 5026, 5028, 5030, 5035, 5050, 5052, 5082, 5084, 5087, 5095, 5098, 5116, 5121, 5123, 5129, 5136, 5136, 5141, 5158, 5160, 5169, 5176, 5206, 5207, 5209, 5227, 5238, 5238, 5243, 5265, 5268, 5286, 5293, 5323, 5335, 5355, 5363, 5408, 5427, 5441, 5448, 5454, 5476, 5476, 5492, 5501, 5532, 5541, 5553, 5555, 5580, 5594, 5598, 5607, 5615, 5619, 5627, 5644, 5645, 5647, 5659, 5698, 5702, 5727, 5732, 5733, 5766, 5767, 5769, 5778, 5825, 5826, 5833, 5837, 5847, 5855, 5868, 5869, 5870, 5870, 5880, 5885, 5894, 5928, 5935, 5937, 5949, 5965, 5969, 6004, 6014, 6021, 6031, 6034, 6051, 6052, 6060, 6102, 6119, 6121, 6123, 6136, 6136, 6148, 6157, 6164, 6166, 6175, 6179, 6182, 6182, 6183, 6196, 6197, 6233, 6243, 6245, 6255, 6274, 6288, 6302, 6311, 6319, 6322, 6331, 6333, 6338, 6342, 6346, 6350, 6363, 6373, 6375, 6379, 6391, 6395, 6402, 6409, 6411, 6426, 6454, 6465, 6467, 6473, 6491, 6492, 6501, 6503, 6507, 6516, 6522, 6538, 6552, 6555, 6566, 6573, 6576, 6613, 6620, 6620, 6623, 6634, 6638, 6641, 6645, 6651, 6654, 6670, 6670, 6671, 6677, 6684, 6686, 6690, 6694, 6697, 6706, 6736, 6763, 6782, 6785, 6799, 6812, 6816, 6837, 6838, 6842, 6843, 6891, 6893, 6896, 6897, 6904, 6916, 6917, 6945, 6961, 6963, 6985, 6998, 6999, 7002, 7006, 7008, 7011, 7014, 7017, 7022, 7044, 7064, 7079, 7094, 7104, 7107, 7136, 7137, 7140, 7141, 7171, 7181, 7188, 7189, 7200, 7202, 7206, 7207, 7210, 7219, 7229, 7233, 7250, 7256, 7265, 7270, 7274, 7278, 7287, 7294, 7298, 7316, 7316, 7319, 7321, 7324, 7355, 7358, 7370, 7389, 7395, 7397, 7405, 7407, 7408, 7419, 7435, 7441, 7445, 7453, 7460, 7469, 7481, 7482, 7483, 7498, 7509, 7514, 7515, 7552, 7583, 7584, 7587, 7593, 7603, 7607, 7633, 7637, 7656, 7658, 7661, 7664, 7677, 7684, 7690, 7691, 7730, 7732, 7736, 7756, 7760, 7765, 7780, 7785, 7788, 7797, 7805, 7819, 7833, 7839, 7853, 7856, 7861, 7869, 7871, 7885, 7887, 7888, 7891, 7895, 7906, 7907, 7914, 7920, 7928, 7960, 7970, 7974, 7981, 7996, 8001, 8005, 8006, 8025, 8037, 8045, 8045, 8055, 8062, 8071, 8072, 8078, 8081, 8083, 8088, 8097, 8130, 8144, 8145, 8172, 8194, 8194, 8196, 8199, 8204, 8209, 8219, 8222, 8227, 8227, 8241, 8244, 8277, 8277, 8292, 8306, 8307, 8315, 8320, 8330, 8331, 8342, 8369, 8396, 8404, 8423, 8434, 8440, 8449, 8486, 8507, 8512, 8515, 8525, 8528, 8531, 8535, 8536, 8564, 8572, 8573, 8593, 8615, 8615, 8630, 8637, 8647, 8652, 8666, 8670, 8673, 8678, 8679, 8696, 8714, 8715, 8715, 8729, 8733, 8760, 8773, 8773, 8773, 8788, 8807, 8809, 8815, 8827, 8832, 8833, 8844, 8854, 8885, 8896, 8897, 8942, 8952, 8962, 8964, 8978, 8979, 8998, 9041, 9050, 9057, 9072, 9073, 9074, 9079, 9092, 9109, 9111, 9116, 9124, 9124, 9129, 9137, 9146, 9158, 9184, 9214, 9226, 9231, 9233, 9235, 9238, 9253, 9253, 9258, 9269, 9272, 9282, 9292, 9317, 9331, 9332, 9343, 9352, 9394, 9398, 9401, 9404, 9407, 9407, 9415, 9415, 9420, 9437, 9445, 9456, 9459, 9471, 9490, 9496, 9499, 9516, 9542, 9557, 9563, 9565, 9572, 9577, 9582, 9605, 9619, 9625, 9636, 9642, 9656, 9658, 9661, 9662, 9674, 9704, 9714, 9718, 9731, 9745, 9747, 9750, 9753, 9772, 9775, 9778, 9779, 9786, 9821, 9833, 9846, 9855, 9878, 9897, 9911, 9926, 9942, 9954, 9955, 9966, 9981, 9981, 9985]],
      [[[{ $range: [0, 5000] }, { $range: [0, 5000] }]], [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29, 29, 30, 30, 31, 31, 32, 32, 33, 33, 34, 34, 35, 35, 36, 36, 37, 37, 38, 38, 39, 39, 40, 40, 41, 41, 42, 42, 43, 43, 44, 44, 45, 45, 46, 46, 47, 47, 48, 48, 49, 49, 50, 50, 51, 51, 52, 52, 53, 53, 54, 54, 55, 55, 56, 56, 57, 57, 58, 58, 59, 59, 60, 60, 61, 61, 62, 62, 63, 63, 64, 64, 65, 65, 66, 66, 67, 67, 68, 68, 69, 69, 70, 70, 71, 71, 72, 72, 73, 73, 74, 74, 75, 75, 76, 76, 77, 77, 78, 78, 79, 79, 80, 80, 81, 81, 82, 82, 83, 83, 84, 84, 85, 85, 86, 86, 87, 87, 88, 88, 89, 89, 90, 90, 91, 91, 92, 92, 93, 93, 94, 94, 95, 95, 96, 96, 97, 97, 98, 98, 99, 99, 100, 100, 101, 101, 102, 102, 103, 103, 104, 104, 105, 105, 106, 106, 107, 107, 108, 108, 109, 109, 110, 110, 111, 111, 112, 112, 113, 113, 114, 114, 115, 115, 116, 116, 117, 117, 118, 118, 119, 119, 120, 120, 121, 121, 122, 122, 123, 123, 124, 124, 125, 125, 126, 126, 127, 127, 128, 128, 129, 129, 130, 130, 131, 131, 132, 132, 133, 133, 134, 134, 135, 135, 136, 136, 137, 137, 138, 138, 139, 139, 140, 140, 141, 141, 142, 142, 143, 143, 144, 144, 145, 145, 146, 146, 147, 147, 148, 148, 149, 149, 150, 150, 151, 151, 152, 152, 153, 153, 154, 154, 155, 155, 156, 156, 157, 157, 158, 158, 159, 159, 160, 160, 161, 161, 162, 162, 163, 163, 164, 164, 165, 165, 166, 166, 167, 167, 168, 168, 169, 169, 170, 170, 171, 171, 172, 172, 173, 173, 174, 174, 175, 175, 176, 176, 177, 177, 178, 178, 179, 179, 180, 180, 181, 181, 182, 182, 183, 183, 184, 184, 185, 185, 186, 186, 187, 187, 188, 188, 189, 189, 190, 190, 191, 191, 192, 192, 193, 193, 194, 194, 195, 195, 196, 196, 197, 197, 198, 198, 199, 199, 200, 200, 201, 201, 202, 202, 203, 203, 204, 204, 205, 205, 206, 206, 207, 207, 208, 208, 209, 209, 210, 210, 211, 211, 212, 212, 213, 213, 214, 214, 215, 215, 216, 216, 217, 217, 218, 218, 219, 219, 220, 220, 221, 221, 222, 222, 223, 223, 224, 224, 225, 225, 226, 226, 227, 227, 228, 228, 229, 229, 230, 230, 231, 231, 232, 232, 233, 233, 234, 234, 235, 235, 236, 236, 237, 237, 238, 238, 239, 239, 240, 240, 241, 241, 242, 242, 243, 243, 244, 244, 245, 245, 246, 246, 247, 247, 248, 248, 249, 249, 250, 250, 251, 251, 252, 252, 253, 253, 254, 254, 255, 255, 256, 256, 257, 257, 258, 258, 259, 259, 260, 260, 261, 261, 262, 262, 263, 263, 264, 264, 265, 265, 266, 266, 267, 267, 268, 268, 269, 269, 270, 270, 271, 271, 272, 272, 273, 273, 274, 274, 275, 275, 276, 276, 277, 277, 278, 278, 279, 279, 280, 280, 281, 281, 282, 282, 283, 283, 284, 284, 285, 285, 286, 286, 287, 287, 288, 288, 289, 289, 290, 290, 291, 291, 292, 292, 293, 293, 294, 294, 295, 295, 296, 296, 297, 297, 298, 298, 299, 299, 300, 300, 301, 301, 302, 302, 303, 303, 304, 304, 305, 305, 306, 306, 307, 307, 308, 308, 309, 309, 310, 310, 311, 311, 312, 312, 313, 313, 314, 314, 315, 315, 316, 316, 317, 317, 318, 318, 319, 319, 320, 320, 321, 321, 322, 322, 323, 323, 324, 324, 325, 325, 326, 326, 327, 327, 328, 328, 329, 329, 330, 330, 331, 331, 332, 332, 333, 333, 334, 334, 335, 335, 336, 336, 337, 337, 338, 338, 339, 339, 340, 340, 341, 341, 342, 342, 343, 343, 344, 344, 345, 345, 346, 346, 347, 347, 348, 348, 349, 349, 350, 350, 351, 351, 352, 352, 353, 353, 354, 354, 355, 355, 356, 356, 357, 357, 358, 358, 359, 359, 360, 360, 361, 361, 362, 362, 363, 363, 364, 364, 365, 365, 366, 366, 367, 367, 368, 368, 369, 369, 370, 370, 371, 371, 372, 372, 373, 373, 374, 374, 375, 375, 376, 376, 377, 377, 378, 378, 379, 379, 380, 380, 381, 381, 382, 382, 383, 383, 384, 384, 385, 385, 386, 386, 387, 387, 388, 388, 389, 389, 390, 390, 391, 391, 392, 392, 393, 393, 394, 394, 395, 395, 396, 396, 397, 397, 398, 398, 399, 399, 400, 400, 401, 401, 402, 402, 403, 403, 404, 404, 405, 405, 406, 406, 407, 407, 408, 408, 409, 409, 410, 410, 411, 411, 412, 412, 413, 413, 414, 414, 415, 415, 416, 416, 417, 417, 418, 418, 419, 419, 420, 420, 421, 421, 422, 422, 423, 423, 424, 424, 425, 425, 426, 426, 427, 427, 428, 428, 429, 429, 430, 430, 431, 431, 432, 432, 433, 433, 434, 434, 435, 435, 436, 436, 437, 437, 438, 438, 439, 439, 440, 440, 441, 441, 442, 442, 443, 443, 444, 444, 445, 445, 446, 446, 447, 447, 448, 448, 449, 449, 450, 450, 451, 451, 452, 452, 453, 453, 454, 454, 455, 455, 456, 456, 457, 457, 458, 458, 459, 459, 460, 460, 461, 461, 462, 462, 463, 463, 464, 464, 465, 465, 466, 466, 467, 467, 468, 468, 469, 469, 470, 470, 471, 471, 472, 472, 473, 473, 474, 474, 475, 475, 476, 476, 477, 477, 478, 478, 479, 479, 480, 480, 481, 481, 482, 482, 483, 483, 484, 484, 485, 485, 486, 486, 487, 487, 488, 488, 489, 489, 490, 490, 491, 491, 492, 492, 493, 493, 494, 494, 495, 495, 496, 496, 497, 497, 498, 498, 499, 499, 500, 500, 501, 501, 502, 502, 503, 503, 504, 504, 505, 505, 506, 506, 507, 507, 508, 508, 509, 509, 510, 510, 511, 511, 512, 512, 513, 513, 514, 514, 515, 515, 516, 516, 517, 517, 518, 518, 519, 519, 520, 520, 521, 521, 522, 522, 523, 523, 524, 524, 525, 525, 526, 526, 527, 527, 528, 528, 529, 529, 530, 530, 531, 531, 532, 532, 533, 533, 534, 534, 535, 535, 536, 536, 537, 537, 538, 538, 539, 539, 540, 540, 541, 541, 542, 542, 543, 543, 544, 544, 545, 545, 546, 546, 547, 547, 548, 548, 549, 549, 550, 550, 551, 551, 552, 552, 553, 553, 554, 554, 555, 555, 556, 556, 557, 557, 558, 558, 559, 559, 560, 560, 561, 561, 562, 562, 563, 563, 564, 564, 565, 565, 566, 566, 567, 567, 568, 568, 569, 569, 570, 570, 571, 571, 572, 572, 573, 573, 574, 574, 575, 575, 576, 576, 577, 577, 578, 578, 579, 579, 580, 580, 581, 581, 582, 582, 583, 583, 584, 584, 585, 585, 586, 586, 587, 587, 588, 588, 589, 589, 590, 590, 591, 591, 592, 592, 593, 593, 594, 594, 595, 595, 596, 596, 597, 597, 598, 598, 599, 599, 600, 600, 601, 601, 602, 602, 603, 603, 604, 604, 605, 605, 606, 606, 607, 607, 608, 608, 609, 609, 610, 610, 611, 611, 612, 612, 613, 613, 614, 614, 615, 615, 616, 616, 617, 617, 618, 618, 619, 619, 620, 620, 621, 621, 622, 622, 623, 623, 624, 624, 625, 625, 626, 626, 627, 627, 628, 628, 629, 629, 630, 630, 631, 631, 632, 632, 633, 633, 634, 634, 635, 635, 636, 636, 637, 637, 638, 638, 639, 639, 640, 640, 641, 641, 642, 642, 643, 643, 644, 644, 645, 645, 646, 646, 647, 647, 648, 648, 649, 649, 650, 650, 651, 651, 652, 652, 653, 653, 654, 654, 655, 655, 656, 656, 657, 657, 658, 658, 659, 659, 660, 660, 661, 661, 662, 662, 663, 663, 664, 664, 665, 665, 666, 666, 667, 667, 668, 668, 669, 669, 670, 670, 671, 671, 672, 672, 673, 673, 674, 674, 675, 675, 676, 676, 677, 677, 678, 678, 679, 679, 680, 680, 681, 681, 682, 682, 683, 683, 684, 684, 685, 685, 686, 686, 687, 687, 688, 688, 689, 689, 690, 690, 691, 691, 692, 692, 693, 693, 694, 694, 695, 695, 696, 696, 697, 697, 698, 698, 699, 699, 700, 700, 701, 701, 702, 702, 703, 703, 704, 704, 705, 705, 706, 706, 707, 707, 708, 708, 709, 709, 710, 710, 711, 711, 712, 712, 713, 713, 714, 714, 715, 715, 716, 716, 717, 717, 718, 718, 719, 719, 720, 720, 721, 721, 722, 722, 723, 723, 724, 724, 725, 725, 726, 726, 727, 727, 728, 728, 729, 729, 730, 730, 731, 731, 732, 732, 733, 733, 734, 734, 735, 735, 736, 736, 737, 737, 738, 738, 739, 739, 740, 740, 741, 741, 742, 742, 743, 743, 744, 744, 745, 745, 746, 746, 747, 747, 748, 748, 749, 749, 750, 750, 751, 751, 752, 752, 753, 753, 754, 754, 755, 755, 756, 756, 757, 757, 758, 758, 759, 759, 760, 760, 761, 761, 762, 762, 763, 763, 764, 764, 765, 765, 766, 766, 767, 767, 768, 768, 769, 769, 770, 770, 771, 771, 772, 772, 773, 773, 774, 774, 775, 775, 776, 776, 777, 777, 778, 778, 779, 779, 780, 780, 781, 781, 782, 782, 783, 783, 784, 784, 785, 785, 786, 786, 787, 787, 788, 788, 789, 789, 790, 790, 791, 791, 792, 792, 793, 793, 794, 794, 795, 795, 796, 796, 797, 797, 798, 798, 799, 799, 800, 800, 801, 801, 802, 802, 803, 803, 804, 804, 805, 805, 806, 806, 807, 807, 808, 808, 809, 809, 810, 810, 811, 811, 812, 812, 813, 813, 814, 814, 815, 815, 816, 816, 817, 817, 818, 818, 819, 819, 820, 820, 821, 821, 822, 822, 823, 823, 824, 824, 825, 825, 826, 826, 827, 827, 828, 828, 829, 829, 830, 830, 831, 831, 832, 832, 833, 833, 834, 834, 835, 835, 836, 836, 837, 837, 838, 838, 839, 839, 840, 840, 841, 841, 842, 842, 843, 843, 844, 844, 845, 845, 846, 846, 847, 847, 848, 848, 849, 849, 850, 850, 851, 851, 852, 852, 853, 853, 854, 854, 855, 855, 856, 856, 857, 857, 858, 858, 859, 859, 860, 860, 861, 861, 862, 862, 863, 863, 864, 864, 865, 865, 866, 866, 867, 867, 868, 868, 869, 869, 870, 870, 871, 871, 872, 872, 873, 873, 874, 874, 875, 875, 876, 876, 877, 877, 878, 878, 879, 879, 880, 880, 881, 881, 882, 882, 883, 883, 884, 884, 885, 885, 886, 886, 887, 887, 888, 888, 889, 889, 890, 890, 891, 891, 892, 892, 893, 893, 894, 894, 895, 895, 896, 896, 897, 897, 898, 898, 899, 899, 900, 900, 901, 901, 902, 902, 903, 903, 904, 904, 905, 905, 906, 906, 907, 907, 908, 908, 909, 909, 910, 910, 911, 911, 912, 912, 913, 913, 914, 914, 915, 915, 916, 916, 917, 917, 918, 918, 919, 919, 920, 920, 921, 921, 922, 922, 923, 923, 924, 924, 925, 925, 926, 926, 927, 927, 928, 928, 929, 929, 930, 930, 931, 931, 932, 932, 933, 933, 934, 934, 935, 935, 936, 936, 937, 937, 938, 938, 939, 939, 940, 940, 941, 941, 942, 942, 943, 943, 944, 944, 945, 945, 946, 946, 947, 947, 948, 948, 949, 949, 950, 950, 951, 951, 952, 952, 953, 953, 954, 954, 955, 955, 956, 956, 957, 957, 958, 958, 959, 959, 960, 960, 961, 961, 962, 962, 963, 963, 964, 964, 965, 965, 966, 966, 967, 967, 968, 968, 969, 969, 970, 970, 971, 971, 972, 972, 973, 973, 974, 974, 975, 975, 976, 976, 977, 977, 978, 978, 979, 979, 980, 980, 981, 981, 982, 982, 983, 983, 984, 984, 985, 985, 986, 986, 987, 987, 988, 988, 989, 989, 990, 990, 991, 991, 992, 992, 993, 993, 994, 994, 995, 995, 996, 996, 997, 997, 998, 998, 999, 999, 1000, 1000, 1001, 1001, 1002, 1002, 1003, 1003, 1004, 1004, 1005, 1005, 1006, 1006, 1007, 1007, 1008, 1008, 1009, 1009, 1010, 1010, 1011, 1011, 1012, 1012, 1013, 1013, 1014, 1014, 1015, 1015, 1016, 1016, 1017, 1017, 1018, 1018, 1019, 1019, 1020, 1020, 1021, 1021, 1022, 1022, 1023, 1023, 1024, 1024, 1025, 1025, 1026, 1026, 1027, 1027, 1028, 1028, 1029, 1029, 1030, 1030, 1031, 1031, 1032, 1032, 1033, 1033, 1034, 1034, 1035, 1035, 1036, 1036, 1037, 1037, 1038, 1038, 1039, 1039, 1040, 1040, 1041, 1041, 1042, 1042, 1043, 1043, 1044, 1044, 1045, 1045, 1046, 1046, 1047, 1047, 1048, 1048, 1049, 1049, 1050, 1050, 1051, 1051, 1052, 1052, 1053, 1053, 1054, 1054, 1055, 1055, 1056, 1056, 1057, 1057, 1058, 1058, 1059, 1059, 1060, 1060, 1061, 1061, 1062, 1062, 1063, 1063, 1064, 1064, 1065, 1065, 1066, 1066, 1067, 1067, 1068, 1068, 1069, 1069, 1070, 1070, 1071, 1071, 1072, 1072, 1073, 1073, 1074, 1074, 1075, 1075, 1076, 1076, 1077, 1077, 1078, 1078, 1079, 1079, 1080, 1080, 1081, 1081, 1082, 1082, 1083, 1083, 1084, 1084, 1085, 1085, 1086, 1086, 1087, 1087, 1088, 1088, 1089, 1089, 1090, 1090, 1091, 1091, 1092, 1092, 1093, 1093, 1094, 1094, 1095, 1095, 1096, 1096, 1097, 1097, 1098, 1098, 1099, 1099, 1100, 1100, 1101, 1101, 1102, 1102, 1103, 1103, 1104, 1104, 1105, 1105, 1106, 1106, 1107, 1107, 1108, 1108, 1109, 1109, 1110, 1110, 1111, 1111, 1112, 1112, 1113, 1113, 1114, 1114, 1115, 1115, 1116, 1116, 1117, 1117, 1118, 1118, 1119, 1119, 1120, 1120, 1121, 1121, 1122, 1122, 1123, 1123, 1124, 1124, 1125, 1125, 1126, 1126, 1127, 1127, 1128, 1128, 1129, 1129, 1130, 1130, 1131, 1131, 1132, 1132, 1133, 1133, 1134, 1134, 1135, 1135, 1136, 1136, 1137, 1137, 1138, 1138, 1139, 1139, 1140, 1140, 1141, 1141, 1142, 1142, 1143, 1143, 1144, 1144, 1145, 1145, 1146, 1146, 1147, 1147, 1148, 1148, 1149, 1149, 1150, 1150, 1151, 1151, 1152, 1152, 1153, 1153, 1154, 1154, 1155, 1155, 1156, 1156, 1157, 1157, 1158, 1158, 1159, 1159, 1160, 1160, 1161, 1161, 1162, 1162, 1163, 1163, 1164, 1164, 1165, 1165, 1166, 1166, 1167, 1167, 1168, 1168, 1169, 1169, 1170, 1170, 1171, 1171, 1172, 1172, 1173, 1173, 1174, 1174, 1175, 1175, 1176, 1176, 1177, 1177, 1178, 1178, 1179, 1179, 1180, 1180, 1181, 1181, 1182, 1182, 1183, 1183, 1184, 1184, 1185, 1185, 1186, 1186, 1187, 1187, 1188, 1188, 1189, 1189, 1190, 1190, 1191, 1191, 1192, 1192, 1193, 1193, 1194, 1194, 1195, 1195, 1196, 1196, 1197, 1197, 1198, 1198, 1199, 1199, 1200, 1200, 1201, 1201, 1202, 1202, 1203, 1203, 1204, 1204, 1205, 1205, 1206, 1206, 1207, 1207, 1208, 1208, 1209, 1209, 1210, 1210, 1211, 1211, 1212, 1212, 1213, 1213, 1214, 1214, 1215, 1215, 1216, 1216, 1217, 1217, 1218, 1218, 1219, 1219, 1220, 1220, 1221, 1221, 1222, 1222, 1223, 1223, 1224, 1224, 1225, 1225, 1226, 1226, 1227, 1227, 1228, 1228, 1229, 1229, 1230, 1230, 1231, 1231, 1232, 1232, 1233, 1233, 1234, 1234, 1235, 1235, 1236, 1236, 1237, 1237, 1238, 1238, 1239, 1239, 1240, 1240, 1241, 1241, 1242, 1242, 1243, 1243, 1244, 1244, 1245, 1245, 1246, 1246, 1247, 1247, 1248, 1248, 1249, 1249, 1250, 1250, 1251, 1251, 1252, 1252, 1253, 1253, 1254, 1254, 1255, 1255, 1256, 1256, 1257, 1257, 1258, 1258, 1259, 1259, 1260, 1260, 1261, 1261, 1262, 1262, 1263, 1263, 1264, 1264, 1265, 1265, 1266, 1266, 1267, 1267, 1268, 1268, 1269, 1269, 1270, 1270, 1271, 1271, 1272, 1272, 1273, 1273, 1274, 1274, 1275, 1275, 1276, 1276, 1277, 1277, 1278, 1278, 1279, 1279, 1280, 1280, 1281, 1281, 1282, 1282, 1283, 1283, 1284, 1284, 1285, 1285, 1286, 1286, 1287, 1287, 1288, 1288, 1289, 1289, 1290, 1290, 1291, 1291, 1292, 1292, 1293, 1293, 1294, 1294, 1295, 1295, 1296, 1296, 1297, 1297, 1298, 1298, 1299, 1299, 1300, 1300, 1301, 1301, 1302, 1302, 1303, 1303, 1304, 1304, 1305, 1305, 1306, 1306, 1307, 1307, 1308, 1308, 1309, 1309, 1310, 1310, 1311, 1311, 1312, 1312, 1313, 1313, 1314, 1314, 1315, 1315, 1316, 1316, 1317, 1317, 1318, 1318, 1319, 1319, 1320, 1320, 1321, 1321, 1322, 1322, 1323, 1323, 1324, 1324, 1325, 1325, 1326, 1326, 1327, 1327, 1328, 1328, 1329, 1329, 1330, 1330, 1331, 1331, 1332, 1332, 1333, 1333, 1334, 1334, 1335, 1335, 1336, 1336, 1337, 1337, 1338, 1338, 1339, 1339, 1340, 1340, 1341, 1341, 1342, 1342, 1343, 1343, 1344, 1344, 1345, 1345, 1346, 1346, 1347, 1347, 1348, 1348, 1349, 1349, 1350, 1350, 1351, 1351, 1352, 1352, 1353, 1353, 1354, 1354, 1355, 1355, 1356, 1356, 1357, 1357, 1358, 1358, 1359, 1359, 1360, 1360, 1361, 1361, 1362, 1362, 1363, 1363, 1364, 1364, 1365, 1365, 1366, 1366, 1367, 1367, 1368, 1368, 1369, 1369, 1370, 1370, 1371, 1371, 1372, 1372, 1373, 1373, 1374, 1374, 1375, 1375, 1376, 1376, 1377, 1377, 1378, 1378, 1379, 1379, 1380, 1380, 1381, 1381, 1382, 1382, 1383, 1383, 1384, 1384, 1385, 1385, 1386, 1386, 1387, 1387, 1388, 1388, 1389, 1389, 1390, 1390, 1391, 1391, 1392, 1392, 1393, 1393, 1394, 1394, 1395, 1395, 1396, 1396, 1397, 1397, 1398, 1398, 1399, 1399, 1400, 1400, 1401, 1401, 1402, 1402, 1403, 1403, 1404, 1404, 1405, 1405, 1406, 1406, 1407, 1407, 1408, 1408, 1409, 1409, 1410, 1410, 1411, 1411, 1412, 1412, 1413, 1413, 1414, 1414, 1415, 1415, 1416, 1416, 1417, 1417, 1418, 1418, 1419, 1419, 1420, 1420, 1421, 1421, 1422, 1422, 1423, 1423, 1424, 1424, 1425, 1425, 1426, 1426, 1427, 1427, 1428, 1428, 1429, 1429, 1430, 1430, 1431, 1431, 1432, 1432, 1433, 1433, 1434, 1434, 1435, 1435, 1436, 1436, 1437, 1437, 1438, 1438, 1439, 1439, 1440, 1440, 1441, 1441, 1442, 1442, 1443, 1443, 1444, 1444, 1445, 1445, 1446, 1446, 1447, 1447, 1448, 1448, 1449, 1449, 1450, 1450, 1451, 1451, 1452, 1452, 1453, 1453, 1454, 1454, 1455, 1455, 1456, 1456, 1457, 1457, 1458, 1458, 1459, 1459, 1460, 1460, 1461, 1461, 1462, 1462, 1463, 1463, 1464, 1464, 1465, 1465, 1466, 1466, 1467, 1467, 1468, 1468, 1469, 1469, 1470, 1470, 1471, 1471, 1472, 1472, 1473, 1473, 1474, 1474, 1475, 1475, 1476, 1476, 1477, 1477, 1478, 1478, 1479, 1479, 1480, 1480, 1481, 1481, 1482, 1482, 1483, 1483, 1484, 1484, 1485, 1485, 1486, 1486, 1487, 1487, 1488, 1488, 1489, 1489, 1490, 1490, 1491, 1491, 1492, 1492, 1493, 1493, 1494, 1494, 1495, 1495, 1496, 1496, 1497, 1497, 1498, 1498, 1499, 1499, 1500, 1500, 1501, 1501, 1502, 1502, 1503, 1503, 1504, 1504, 1505, 1505, 1506, 1506, 1507, 1507, 1508, 1508, 1509, 1509, 1510, 1510, 1511, 1511, 1512, 1512, 1513, 1513, 1514, 1514, 1515, 1515, 1516, 1516, 1517, 1517, 1518, 1518, 1519, 1519, 1520, 1520, 1521, 1521, 1522, 1522, 1523, 1523, 1524, 1524, 1525, 1525, 1526, 1526, 1527, 1527, 1528, 1528, 1529, 1529, 1530, 1530, 1531, 1531, 1532, 1532, 1533, 1533, 1534, 1534, 1535, 1535, 1536, 1536, 1537, 1537, 1538, 1538, 1539, 1539, 1540, 1540, 1541, 1541, 1542, 1542, 1543, 1543, 1544, 1544, 1545, 1545, 1546, 1546, 1547, 1547, 1548, 1548, 1549, 1549, 1550, 1550, 1551, 1551, 1552, 1552, 1553, 1553, 1554, 1554, 1555, 1555, 1556, 1556, 1557, 1557, 1558, 1558, 1559, 1559, 1560, 1560, 1561, 1561, 1562, 1562, 1563, 1563, 1564, 1564, 1565, 1565, 1566, 1566, 1567, 1567, 1568, 1568, 1569, 1569, 1570, 1570, 1571, 1571, 1572, 1572, 1573, 1573, 1574, 1574, 1575, 1575, 1576, 1576, 1577, 1577, 1578, 1578, 1579, 1579, 1580, 1580, 1581, 1581, 1582, 1582, 1583, 1583, 1584, 1584, 1585, 1585, 1586, 1586, 1587, 1587, 1588, 1588, 1589, 1589, 1590, 1590, 1591, 1591, 1592, 1592, 1593, 1593, 1594, 1594, 1595, 1595, 1596, 1596, 1597, 1597, 1598, 1598, 1599, 1599, 1600, 1600, 1601, 1601, 1602, 1602, 1603, 1603, 1604, 1604, 1605, 1605, 1606, 1606, 1607, 1607, 1608, 1608, 1609, 1609, 1610, 1610, 1611, 1611, 1612, 1612, 1613, 1613, 1614, 1614, 1615, 1615, 1616, 1616, 1617, 1617, 1618, 1618, 1619, 1619, 1620, 1620, 1621, 1621, 1622, 1622, 1623, 1623, 1624, 1624, 1625, 1625, 1626, 1626, 1627, 1627, 1628, 1628, 1629, 1629, 1630, 1630, 1631, 1631, 1632, 1632, 1633, 1633, 1634, 1634, 1635, 1635, 1636, 1636, 1637, 1637, 1638, 1638, 1639, 1639, 1640, 1640, 1641, 1641, 1642, 1642, 1643, 1643, 1644, 1644, 1645, 1645, 1646, 1646, 1647, 1647, 1648, 1648, 1649, 1649, 1650, 1650, 1651, 1651, 1652, 1652, 1653, 1653, 1654, 1654, 1655, 1655, 1656, 1656, 1657, 1657, 1658, 1658, 1659, 1659, 1660, 1660, 1661, 1661, 1662, 1662, 1663, 1663, 1664, 1664, 1665, 1665, 1666, 1666, 1667, 1667, 1668, 1668, 1669, 1669, 1670, 1670, 1671, 1671, 1672, 1672, 1673, 1673, 1674, 1674, 1675, 1675, 1676, 1676, 1677, 1677, 1678, 1678, 1679, 1679, 1680, 1680, 1681, 1681, 1682, 1682, 1683, 1683, 1684, 1684, 1685, 1685, 1686, 1686, 1687, 1687, 1688, 1688, 1689, 1689, 1690, 1690, 1691, 1691, 1692, 1692, 1693, 1693, 1694, 1694, 1695, 1695, 1696, 1696, 1697, 1697, 1698, 1698, 1699, 1699, 1700, 1700, 1701, 1701, 1702, 1702, 1703, 1703, 1704, 1704, 1705, 1705, 1706, 1706, 1707, 1707, 1708, 1708, 1709, 1709, 1710, 1710, 1711, 1711, 1712, 1712, 1713, 1713, 1714, 1714, 1715, 1715, 1716, 1716, 1717, 1717, 1718, 1718, 1719, 1719, 1720, 1720, 1721, 1721, 1722, 1722, 1723, 1723, 1724, 1724, 1725, 1725, 1726, 1726, 1727, 1727, 1728, 1728, 1729, 1729, 1730, 1730, 1731, 1731, 1732, 1732, 1733, 1733, 1734, 1734, 1735, 1735, 1736, 1736, 1737, 1737, 1738, 1738, 1739, 1739, 1740, 1740, 1741, 1741, 1742, 1742, 1743, 1743, 1744, 1744, 1745, 1745, 1746, 1746, 1747, 1747, 1748, 1748, 1749, 1749, 1750, 1750, 1751, 1751, 1752, 1752, 1753, 1753, 1754, 1754, 1755, 1755, 1756, 1756, 1757, 1757, 1758, 1758, 1759, 1759, 1760, 1760, 1761, 1761, 1762, 1762, 1763, 1763, 1764, 1764, 1765, 1765, 1766, 1766, 1767, 1767, 1768, 1768, 1769, 1769, 1770, 1770, 1771, 1771, 1772, 1772, 1773, 1773, 1774, 1774, 1775, 1775, 1776, 1776, 1777, 1777, 1778, 1778, 1779, 1779, 1780, 1780, 1781, 1781, 1782, 1782, 1783, 1783, 1784, 1784, 1785, 1785, 1786, 1786, 1787, 1787, 1788, 1788, 1789, 1789, 1790, 1790, 1791, 1791, 1792, 1792, 1793, 1793, 1794, 1794, 1795, 1795, 1796, 1796, 1797, 1797, 1798, 1798, 1799, 1799, 1800, 1800, 1801, 1801, 1802, 1802, 1803, 1803, 1804, 1804, 1805, 1805, 1806, 1806, 1807, 1807, 1808, 1808, 1809, 1809, 1810, 1810, 1811, 1811, 1812, 1812, 1813, 1813, 1814, 1814, 1815, 1815, 1816, 1816, 1817, 1817, 1818, 1818, 1819, 1819, 1820, 1820, 1821, 1821, 1822, 1822, 1823, 1823, 1824, 1824, 1825, 1825, 1826, 1826, 1827, 1827, 1828, 1828, 1829, 1829, 1830, 1830, 1831, 1831, 1832, 1832, 1833, 1833, 1834, 1834, 1835, 1835, 1836, 1836, 1837, 1837, 1838, 1838, 1839, 1839, 1840, 1840, 1841, 1841, 1842, 1842, 1843, 1843, 1844, 1844, 1845, 1845, 1846, 1846, 1847, 1847, 1848, 1848, 1849, 1849, 1850, 1850, 1851, 1851, 1852, 1852, 1853, 1853, 1854, 1854, 1855, 1855, 1856, 1856, 1857, 1857, 1858, 1858, 1859, 1859, 1860, 1860, 1861, 1861, 1862, 1862, 1863, 1863, 1864, 1864, 1865, 1865, 1866, 1866, 1867, 1867, 1868, 1868, 1869, 1869, 1870, 1870, 1871, 1871, 1872, 1872, 1873, 1873, 1874, 1874, 1875, 1875, 1876, 1876, 1877, 1877, 1878, 1878, 1879, 1879, 1880, 1880, 1881, 1881, 1882, 1882, 1883, 1883, 1884, 1884, 1885, 1885, 1886, 1886, 1887, 1887, 1888, 1888, 1889, 1889, 1890, 1890, 1891, 1891, 1892, 1892, 1893, 1893, 1894, 1894, 1895, 1895, 1896, 1896, 1897, 1897, 1898, 1898, 1899, 1899, 1900, 1900, 1901, 1901, 1902, 1902, 1903, 1903, 1904, 1904, 1905, 1905, 1906, 1906, 1907, 1907, 1908, 1908, 1909, 1909, 1910, 1910, 1911, 1911, 1912, 1912, 1913, 1913, 1914, 1914, 1915, 1915, 1916, 1916, 1917, 1917, 1918, 1918, 1919, 1919, 1920, 1920, 1921, 1921, 1922, 1922, 1923, 1923, 1924, 1924, 1925, 1925, 1926, 1926, 1927, 1927, 1928, 1928, 1929, 1929, 1930, 1930, 1931, 1931, 1932, 1932, 1933, 1933, 1934, 1934, 1935, 1935, 1936, 1936, 1937, 1937, 1938, 1938, 1939, 1939, 1940, 1940, 1941, 1941, 1942, 1942, 1943, 1943, 1944, 1944, 1945, 1945, 1946, 1946, 1947, 1947, 1948, 1948, 1949, 1949, 1950, 1950, 1951, 1951, 1952, 1952, 1953, 1953, 1954, 1954, 1955, 1955, 1956, 1956, 1957, 1957, 1958, 1958, 1959, 1959, 1960, 1960, 1961, 1961, 1962, 1962, 1963, 1963, 1964, 1964, 1965, 1965, 1966, 1966, 1967, 1967, 1968, 1968, 1969, 1969, 1970, 1970, 1971, 1971, 1972, 1972, 1973, 1973, 1974, 1974, 1975, 1975, 1976, 1976, 1977, 1977, 1978, 1978, 1979, 1979, 1980, 1980, 1981, 1981, 1982, 1982, 1983, 1983, 1984, 1984, 1985, 1985, 1986, 1986, 1987, 1987, 1988, 1988, 1989, 1989, 1990, 1990, 1991, 1991, 1992, 1992, 1993, 1993, 1994, 1994, 1995, 1995, 1996, 1996, 1997, 1997, 1998, 1998, 1999, 1999, 2000, 2000, 2001, 2001, 2002, 2002, 2003, 2003, 2004, 2004, 2005, 2005, 2006, 2006, 2007, 2007, 2008, 2008, 2009, 2009, 2010, 2010, 2011, 2011, 2012, 2012, 2013, 2013, 2014, 2014, 2015, 2015, 2016, 2016, 2017, 2017, 2018, 2018, 2019, 2019, 2020, 2020, 2021, 2021, 2022, 2022, 2023, 2023, 2024, 2024, 2025, 2025, 2026, 2026, 2027, 2027, 2028, 2028, 2029, 2029, 2030, 2030, 2031, 2031, 2032, 2032, 2033, 2033, 2034, 2034, 2035, 2035, 2036, 2036, 2037, 2037, 2038, 2038, 2039, 2039, 2040, 2040, 2041, 2041, 2042, 2042, 2043, 2043, 2044, 2044, 2045, 2045, 2046, 2046, 2047, 2047, 2048, 2048, 2049, 2049, 2050, 2050, 2051, 2051, 2052, 2052, 2053, 2053, 2054, 2054, 2055, 2055, 2056, 2056, 2057, 2057, 2058, 2058, 2059, 2059, 2060, 2060, 2061, 2061, 2062, 2062, 2063, 2063, 2064, 2064, 2065, 2065, 2066, 2066, 2067, 2067, 2068, 2068, 2069, 2069, 2070, 2070, 2071, 2071, 2072, 2072, 2073, 2073, 2074, 2074, 2075, 2075, 2076, 2076, 2077, 2077, 2078, 2078, 2079, 2079, 2080, 2080, 2081, 2081, 2082, 2082, 2083, 2083, 2084, 2084, 2085, 2085, 2086, 2086, 2087, 2087, 2088, 2088, 2089, 2089, 2090, 2090, 2091, 2091, 2092, 2092, 2093, 2093, 2094, 2094, 2095, 2095, 2096, 2096, 2097, 2097, 2098, 2098, 2099, 2099, 2100, 2100, 2101, 2101, 2102, 2102, 2103, 2103, 2104, 2104, 2105, 2105, 2106, 2106, 2107, 2107, 2108, 2108, 2109, 2109, 2110, 2110, 2111, 2111, 2112, 2112, 2113, 2113, 2114, 2114, 2115, 2115, 2116, 2116, 2117, 2117, 2118, 2118, 2119, 2119, 2120, 2120, 2121, 2121, 2122, 2122, 2123, 2123, 2124, 2124, 2125, 2125, 2126, 2126, 2127, 2127, 2128, 2128, 2129, 2129, 2130, 2130, 2131, 2131, 2132, 2132, 2133, 2133, 2134, 2134, 2135, 2135, 2136, 2136, 2137, 2137, 2138, 2138, 2139, 2139, 2140, 2140, 2141, 2141, 2142, 2142, 2143, 2143, 2144, 2144, 2145, 2145, 2146, 2146, 2147, 2147, 2148, 2148, 2149, 2149, 2150, 2150, 2151, 2151, 2152, 2152, 2153, 2153, 2154, 2154, 2155, 2155, 2156, 2156, 2157, 2157, 2158, 2158, 2159, 2159, 2160, 2160, 2161, 2161, 2162, 2162, 2163, 2163, 2164, 2164, 2165, 2165, 2166, 2166, 2167, 2167, 2168, 2168, 2169, 2169, 2170, 2170, 2171, 2171, 2172, 2172, 2173, 2173, 2174, 2174, 2175, 2175, 2176, 2176, 2177, 2177, 2178, 2178, 2179, 2179, 2180, 2180, 2181, 2181, 2182, 2182, 2183, 2183, 2184, 2184, 2185, 2185, 2186, 2186, 2187, 2187, 2188, 2188, 2189, 2189, 2190, 2190, 2191, 2191, 2192, 2192, 2193, 2193, 2194, 2194, 2195, 2195, 2196, 2196, 2197, 2197, 2198, 2198, 2199, 2199, 2200, 2200, 2201, 2201, 2202, 2202, 2203, 2203, 2204, 2204, 2205, 2205, 2206, 2206, 2207, 2207, 2208, 2208, 2209, 2209, 2210, 2210, 2211, 2211, 2212, 2212, 2213, 2213, 2214, 2214, 2215, 2215, 2216, 2216, 2217, 2217, 2218, 2218, 2219, 2219, 2220, 2220, 2221, 2221, 2222, 2222, 2223, 2223, 2224, 2224, 2225, 2225, 2226, 2226, 2227, 2227, 2228, 2228, 2229, 2229, 2230, 2230, 2231, 2231, 2232, 2232, 2233, 2233, 2234, 2234, 2235, 2235, 2236, 2236, 2237, 2237, 2238, 2238, 2239, 2239, 2240, 2240, 2241, 2241, 2242, 2242, 2243, 2243, 2244, 2244, 2245, 2245, 2246, 2246, 2247, 2247, 2248, 2248, 2249, 2249, 2250, 2250, 2251, 2251, 2252, 2252, 2253, 2253, 2254, 2254, 2255, 2255, 2256, 2256, 2257, 2257, 2258, 2258, 2259, 2259, 2260, 2260, 2261, 2261, 2262, 2262, 2263, 2263, 2264, 2264, 2265, 2265, 2266, 2266, 2267, 2267, 2268, 2268, 2269, 2269, 2270, 2270, 2271, 2271, 2272, 2272, 2273, 2273, 2274, 2274, 2275, 2275, 2276, 2276, 2277, 2277, 2278, 2278, 2279, 2279, 2280, 2280, 2281, 2281, 2282, 2282, 2283, 2283, 2284, 2284, 2285, 2285, 2286, 2286, 2287, 2287, 2288, 2288, 2289, 2289, 2290, 2290, 2291, 2291, 2292, 2292, 2293, 2293, 2294, 2294, 2295, 2295, 2296, 2296, 2297, 2297, 2298, 2298, 2299, 2299, 2300, 2300, 2301, 2301, 2302, 2302, 2303, 2303, 2304, 2304, 2305, 2305, 2306, 2306, 2307, 2307, 2308, 2308, 2309, 2309, 2310, 2310, 2311, 2311, 2312, 2312, 2313, 2313, 2314, 2314, 2315, 2315, 2316, 2316, 2317, 2317, 2318, 2318, 2319, 2319, 2320, 2320, 2321, 2321, 2322, 2322, 2323, 2323, 2324, 2324, 2325, 2325, 2326, 2326, 2327, 2327, 2328, 2328, 2329, 2329, 2330, 2330, 2331, 2331, 2332, 2332, 2333, 2333, 2334, 2334, 2335, 2335, 2336, 2336, 2337, 2337, 2338, 2338, 2339, 2339, 2340, 2340, 2341, 2341, 2342, 2342, 2343, 2343, 2344, 2344, 2345, 2345, 2346, 2346, 2347, 2347, 2348, 2348, 2349, 2349, 2350, 2350, 2351, 2351, 2352, 2352, 2353, 2353, 2354, 2354, 2355, 2355, 2356, 2356, 2357, 2357, 2358, 2358, 2359, 2359, 2360, 2360, 2361, 2361, 2362, 2362, 2363, 2363, 2364, 2364, 2365, 2365, 2366, 2366, 2367, 2367, 2368, 2368, 2369, 2369, 2370, 2370, 2371, 2371, 2372, 2372, 2373, 2373, 2374, 2374, 2375, 2375, 2376, 2376, 2377, 2377, 2378, 2378, 2379, 2379, 2380, 2380, 2381, 2381, 2382, 2382, 2383, 2383, 2384, 2384, 2385, 2385, 2386, 2386, 2387, 2387, 2388, 2388, 2389, 2389, 2390, 2390, 2391, 2391, 2392, 2392, 2393, 2393, 2394, 2394, 2395, 2395, 2396, 2396, 2397, 2397, 2398, 2398, 2399, 2399, 2400, 2400, 2401, 2401, 2402, 2402, 2403, 2403, 2404, 2404, 2405, 2405, 2406, 2406, 2407, 2407, 2408, 2408, 2409, 2409, 2410, 2410, 2411, 2411, 2412, 2412, 2413, 2413, 2414, 2414, 2415, 2415, 2416, 2416, 2417, 2417, 2418, 2418, 2419, 2419, 2420, 2420, 2421, 2421, 2422, 2422, 2423, 2423, 2424, 2424, 2425, 2425, 2426, 2426, 2427, 2427, 2428, 2428, 2429, 2429, 2430, 2430, 2431, 2431, 2432, 2432, 2433, 2433, 2434, 2434, 2435, 2435, 2436, 2436, 2437, 2437, 2438, 2438, 2439, 2439, 2440, 2440, 2441, 2441, 2442, 2442, 2443, 2443, 2444, 2444, 2445, 2445, 2446, 2446, 2447, 2447, 2448, 2448, 2449, 2449, 2450, 2450, 2451, 2451, 2452, 2452, 2453, 2453, 2454, 2454, 2455, 2455, 2456, 2456, 2457, 2457, 2458, 2458, 2459, 2459, 2460, 2460, 2461, 2461, 2462, 2462, 2463, 2463, 2464, 2464, 2465, 2465, 2466, 2466, 2467, 2467, 2468, 2468, 2469, 2469, 2470, 2470, 2471, 2471, 2472, 2472, 2473, 2473, 2474, 2474, 2475, 2475, 2476, 2476, 2477, 2477, 2478, 2478, 2479, 2479, 2480, 2480, 2481, 2481, 2482, 2482, 2483, 2483, 2484, 2484, 2485, 2485, 2486, 2486, 2487, 2487, 2488, 2488, 2489, 2489, 2490, 2490, 2491, 2491, 2492, 2492, 2493, 2493, 2494, 2494, 2495, 2495, 2496, 2496, 2497, 2497, 2498, 2498, 2499, 2499, 2500, 2500, 2501, 2501, 2502, 2502, 2503, 2503, 2504, 2504, 2505, 2505, 2506, 2506, 2507, 2507, 2508, 2508, 2509, 2509, 2510, 2510, 2511, 2511, 2512, 2512, 2513, 2513, 2514, 2514, 2515, 2515, 2516, 2516, 2517, 2517, 2518, 2518, 2519, 2519, 2520, 2520, 2521, 2521, 2522, 2522, 2523, 2523, 2524, 2524, 2525, 2525, 2526, 2526, 2527, 2527, 2528, 2528, 2529, 2529, 2530, 2530, 2531, 2531, 2532, 2532, 2533, 2533, 2534, 2534, 2535, 2535, 2536, 2536, 2537, 2537, 2538, 2538, 2539, 2539, 2540, 2540, 2541, 2541, 2542, 2542, 2543, 2543, 2544, 2544, 2545, 2545, 2546, 2546, 2547, 2547, 2548, 2548, 2549, 2549, 2550, 2550, 2551, 2551, 2552, 2552, 2553, 2553, 2554, 2554, 2555, 2555, 2556, 2556, 2557, 2557, 2558, 2558, 2559, 2559, 2560, 2560, 2561, 2561, 2562, 2562, 2563, 2563, 2564, 2564, 2565, 2565, 2566, 2566, 2567, 2567, 2568, 2568, 2569, 2569, 2570, 2570, 2571, 2571, 2572, 2572, 2573, 2573, 2574, 2574, 2575, 2575, 2576, 2576, 2577, 2577, 2578, 2578, 2579, 2579, 2580, 2580, 2581, 2581, 2582, 2582, 2583, 2583, 2584, 2584, 2585, 2585, 2586, 2586, 2587, 2587, 2588, 2588, 2589, 2589, 2590, 2590, 2591, 2591, 2592, 2592, 2593, 2593, 2594, 2594, 2595, 2595, 2596, 2596, 2597, 2597, 2598, 2598, 2599, 2599, 2600, 2600, 2601, 2601, 2602, 2602, 2603, 2603, 2604, 2604, 2605, 2605, 2606, 2606, 2607, 2607, 2608, 2608, 2609, 2609, 2610, 2610, 2611, 2611, 2612, 2612, 2613, 2613, 2614, 2614, 2615, 2615, 2616, 2616, 2617, 2617, 2618, 2618, 2619, 2619, 2620, 2620, 2621, 2621, 2622, 2622, 2623, 2623, 2624, 2624, 2625, 2625, 2626, 2626, 2627, 2627, 2628, 2628, 2629, 2629, 2630, 2630, 2631, 2631, 2632, 2632, 2633, 2633, 2634, 2634, 2635, 2635, 2636, 2636, 2637, 2637, 2638, 2638, 2639, 2639, 2640, 2640, 2641, 2641, 2642, 2642, 2643, 2643, 2644, 2644, 2645, 2645, 2646, 2646, 2647, 2647, 2648, 2648, 2649, 2649, 2650, 2650, 2651, 2651, 2652, 2652, 2653, 2653, 2654, 2654, 2655, 2655, 2656, 2656, 2657, 2657, 2658, 2658, 2659, 2659, 2660, 2660, 2661, 2661, 2662, 2662, 2663, 2663, 2664, 2664, 2665, 2665, 2666, 2666, 2667, 2667, 2668, 2668, 2669, 2669, 2670, 2670, 2671, 2671, 2672, 2672, 2673, 2673, 2674, 2674, 2675, 2675, 2676, 2676, 2677, 2677, 2678, 2678, 2679, 2679, 2680, 2680, 2681, 2681, 2682, 2682, 2683, 2683, 2684, 2684, 2685, 2685, 2686, 2686, 2687, 2687, 2688, 2688, 2689, 2689, 2690, 2690, 2691, 2691, 2692, 2692, 2693, 2693, 2694, 2694, 2695, 2695, 2696, 2696, 2697, 2697, 2698, 2698, 2699, 2699, 2700, 2700, 2701, 2701, 2702, 2702, 2703, 2703, 2704, 2704, 2705, 2705, 2706, 2706, 2707, 2707, 2708, 2708, 2709, 2709, 2710, 2710, 2711, 2711, 2712, 2712, 2713, 2713, 2714, 2714, 2715, 2715, 2716, 2716, 2717, 2717, 2718, 2718, 2719, 2719, 2720, 2720, 2721, 2721, 2722, 2722, 2723, 2723, 2724, 2724, 2725, 2725, 2726, 2726, 2727, 2727, 2728, 2728, 2729, 2729, 2730, 2730, 2731, 2731, 2732, 2732, 2733, 2733, 2734, 2734, 2735, 2735, 2736, 2736, 2737, 2737, 2738, 2738, 2739, 2739, 2740, 2740, 2741, 2741, 2742, 2742, 2743, 2743, 2744, 2744, 2745, 2745, 2746, 2746, 2747, 2747, 2748, 2748, 2749, 2749, 2750, 2750, 2751, 2751, 2752, 2752, 2753, 2753, 2754, 2754, 2755, 2755, 2756, 2756, 2757, 2757, 2758, 2758, 2759, 2759, 2760, 2760, 2761, 2761, 2762, 2762, 2763, 2763, 2764, 2764, 2765, 2765, 2766, 2766, 2767, 2767, 2768, 2768, 2769, 2769, 2770, 2770, 2771, 2771, 2772, 2772, 2773, 2773, 2774, 2774, 2775, 2775, 2776, 2776, 2777, 2777, 2778, 2778, 2779, 2779, 2780, 2780, 2781, 2781, 2782, 2782, 2783, 2783, 2784, 2784, 2785, 2785, 2786, 2786, 2787, 2787, 2788, 2788, 2789, 2789, 2790, 2790, 2791, 2791, 2792, 2792, 2793, 2793, 2794, 2794, 2795, 2795, 2796, 2796, 2797, 2797, 2798, 2798, 2799, 2799, 2800, 2800, 2801, 2801, 2802, 2802, 2803, 2803, 2804, 2804, 2805, 2805, 2806, 2806, 2807, 2807, 2808, 2808, 2809, 2809, 2810, 2810, 2811, 2811, 2812, 2812, 2813, 2813, 2814, 2814, 2815, 2815, 2816, 2816, 2817, 2817, 2818, 2818, 2819, 2819, 2820, 2820, 2821, 2821, 2822, 2822, 2823, 2823, 2824, 2824, 2825, 2825, 2826, 2826, 2827, 2827, 2828, 2828, 2829, 2829, 2830, 2830, 2831, 2831, 2832, 2832, 2833, 2833, 2834, 2834, 2835, 2835, 2836, 2836, 2837, 2837, 2838, 2838, 2839, 2839, 2840, 2840, 2841, 2841, 2842, 2842, 2843, 2843, 2844, 2844, 2845, 2845, 2846, 2846, 2847, 2847, 2848, 2848, 2849, 2849, 2850, 2850, 2851, 2851, 2852, 2852, 2853, 2853, 2854, 2854, 2855, 2855, 2856, 2856, 2857, 2857, 2858, 2858, 2859, 2859, 2860, 2860, 2861, 2861, 2862, 2862, 2863, 2863, 2864, 2864, 2865, 2865, 2866, 2866, 2867, 2867, 2868, 2868, 2869, 2869, 2870, 2870, 2871, 2871, 2872, 2872, 2873, 2873, 2874, 2874, 2875, 2875, 2876, 2876, 2877, 2877, 2878, 2878, 2879, 2879, 2880, 2880, 2881, 2881, 2882, 2882, 2883, 2883, 2884, 2884, 2885, 2885, 2886, 2886, 2887, 2887, 2888, 2888, 2889, 2889, 2890, 2890, 2891, 2891, 2892, 2892, 2893, 2893, 2894, 2894, 2895, 2895, 2896, 2896, 2897, 2897, 2898, 2898, 2899, 2899, 2900, 2900, 2901, 2901, 2902, 2902, 2903, 2903, 2904, 2904, 2905, 2905, 2906, 2906, 2907, 2907, 2908, 2908, 2909, 2909, 2910, 2910, 2911, 2911, 2912, 2912, 2913, 2913, 2914, 2914, 2915, 2915, 2916, 2916, 2917, 2917, 2918, 2918, 2919, 2919, 2920, 2920, 2921, 2921, 2922, 2922, 2923, 2923, 2924, 2924, 2925, 2925, 2926, 2926, 2927, 2927, 2928, 2928, 2929, 2929, 2930, 2930, 2931, 2931, 2932, 2932, 2933, 2933, 2934, 2934, 2935, 2935, 2936, 2936, 2937, 2937, 2938, 2938, 2939, 2939, 2940, 2940, 2941, 2941, 2942, 2942, 2943, 2943, 2944, 2944, 2945, 2945, 2946, 2946, 2947, 2947, 2948, 2948, 2949, 2949, 2950, 2950, 2951, 2951, 2952, 2952, 2953, 2953, 2954, 2954, 2955, 2955, 2956, 2956, 2957, 2957, 2958, 2958, 2959, 2959, 2960, 2960, 2961, 2961, 2962, 2962, 2963, 2963, 2964, 2964, 2965, 2965, 2966, 2966, 2967, 2967, 2968, 2968, 2969, 2969, 2970, 2970, 2971, 2971, 2972, 2972, 2973, 2973, 2974, 2974, 2975, 2975, 2976, 2976, 2977, 2977, 2978, 2978, 2979, 2979, 2980, 2980, 2981, 2981, 2982, 2982, 2983, 2983, 2984, 2984, 2985, 2985, 2986, 2986, 2987, 2987, 2988, 2988, 2989, 2989, 2990, 2990, 2991, 2991, 2992, 2992, 2993, 2993, 2994, 2994, 2995, 2995, 2996, 2996, 2997, 2997, 2998, 2998, 2999, 2999, 3000, 3000, 3001, 3001, 3002, 3002, 3003, 3003, 3004, 3004, 3005, 3005, 3006, 3006, 3007, 3007, 3008, 3008, 3009, 3009, 3010, 3010, 3011, 3011, 3012, 3012, 3013, 3013, 3014, 3014, 3015, 3015, 3016, 3016, 3017, 3017, 3018, 3018, 3019, 3019, 3020, 3020, 3021, 3021, 3022, 3022, 3023, 3023, 3024, 3024, 3025, 3025, 3026, 3026, 3027, 3027, 3028, 3028, 3029, 3029, 3030, 3030, 3031, 3031, 3032, 3032, 3033, 3033, 3034, 3034, 3035, 3035, 3036, 3036, 3037, 3037, 3038, 3038, 3039, 3039, 3040, 3040, 3041, 3041, 3042, 3042, 3043, 3043, 3044, 3044, 3045, 3045, 3046, 3046, 3047, 3047, 3048, 3048, 3049, 3049, 3050, 3050, 3051, 3051, 3052, 3052, 3053, 3053, 3054, 3054, 3055, 3055, 3056, 3056, 3057, 3057, 3058, 3058, 3059, 3059, 3060, 3060, 3061, 3061, 3062, 3062, 3063, 3063, 3064, 3064, 3065, 3065, 3066, 3066, 3067, 3067, 3068, 3068, 3069, 3069, 3070, 3070, 3071, 3071, 3072, 3072, 3073, 3073, 3074, 3074, 3075, 3075, 3076, 3076, 3077, 3077, 3078, 3078, 3079, 3079, 3080, 3080, 3081, 3081, 3082, 3082, 3083, 3083, 3084, 3084, 3085, 3085, 3086, 3086, 3087, 3087, 3088, 3088, 3089, 3089, 3090, 3090, 3091, 3091, 3092, 3092, 3093, 3093, 3094, 3094, 3095, 3095, 3096, 3096, 3097, 3097, 3098, 3098, 3099, 3099, 3100, 3100, 3101, 3101, 3102, 3102, 3103, 3103, 3104, 3104, 3105, 3105, 3106, 3106, 3107, 3107, 3108, 3108, 3109, 3109, 3110, 3110, 3111, 3111, 3112, 3112, 3113, 3113, 3114, 3114, 3115, 3115, 3116, 3116, 3117, 3117, 3118, 3118, 3119, 3119, 3120, 3120, 3121, 3121, 3122, 3122, 3123, 3123, 3124, 3124, 3125, 3125, 3126, 3126, 3127, 3127, 3128, 3128, 3129, 3129, 3130, 3130, 3131, 3131, 3132, 3132, 3133, 3133, 3134, 3134, 3135, 3135, 3136, 3136, 3137, 3137, 3138, 3138, 3139, 3139, 3140, 3140, 3141, 3141, 3142, 3142, 3143, 3143, 3144, 3144, 3145, 3145, 3146, 3146, 3147, 3147, 3148, 3148, 3149, 3149, 3150, 3150, 3151, 3151, 3152, 3152, 3153, 3153, 3154, 3154, 3155, 3155, 3156, 3156, 3157, 3157, 3158, 3158, 3159, 3159, 3160, 3160, 3161, 3161, 3162, 3162, 3163, 3163, 3164, 3164, 3165, 3165, 3166, 3166, 3167, 3167, 3168, 3168, 3169, 3169, 3170, 3170, 3171, 3171, 3172, 3172, 3173, 3173, 3174, 3174, 3175, 3175, 3176, 3176, 3177, 3177, 3178, 3178, 3179, 3179, 3180, 3180, 3181, 3181, 3182, 3182, 3183, 3183, 3184, 3184, 3185, 3185, 3186, 3186, 3187, 3187, 3188, 3188, 3189, 3189, 3190, 3190, 3191, 3191, 3192, 3192, 3193, 3193, 3194, 3194, 3195, 3195, 3196, 3196, 3197, 3197, 3198, 3198, 3199, 3199, 3200, 3200, 3201, 3201, 3202, 3202, 3203, 3203, 3204, 3204, 3205, 3205, 3206, 3206, 3207, 3207, 3208, 3208, 3209, 3209, 3210, 3210, 3211, 3211, 3212, 3212, 3213, 3213, 3214, 3214, 3215, 3215, 3216, 3216, 3217, 3217, 3218, 3218, 3219, 3219, 3220, 3220, 3221, 3221, 3222, 3222, 3223, 3223, 3224, 3224, 3225, 3225, 3226, 3226, 3227, 3227, 3228, 3228, 3229, 3229, 3230, 3230, 3231, 3231, 3232, 3232, 3233, 3233, 3234, 3234, 3235, 3235, 3236, 3236, 3237, 3237, 3238, 3238, 3239, 3239, 3240, 3240, 3241, 3241, 3242, 3242, 3243, 3243, 3244, 3244, 3245, 3245, 3246, 3246, 3247, 3247, 3248, 3248, 3249, 3249, 3250, 3250, 3251, 3251, 3252, 3252, 3253, 3253, 3254, 3254, 3255, 3255, 3256, 3256, 3257, 3257, 3258, 3258, 3259, 3259, 3260, 3260, 3261, 3261, 3262, 3262, 3263, 3263, 3264, 3264, 3265, 3265, 3266, 3266, 3267, 3267, 3268, 3268, 3269, 3269, 3270, 3270, 3271, 3271, 3272, 3272, 3273, 3273, 3274, 3274, 3275, 3275, 3276, 3276, 3277, 3277, 3278, 3278, 3279, 3279, 3280, 3280, 3281, 3281, 3282, 3282, 3283, 3283, 3284, 3284, 3285, 3285, 3286, 3286, 3287, 3287, 3288, 3288, 3289, 3289, 3290, 3290, 3291, 3291, 3292, 3292, 3293, 3293, 3294, 3294, 3295, 3295, 3296, 3296, 3297, 3297, 3298, 3298, 3299, 3299, 3300, 3300, 3301, 3301, 3302, 3302, 3303, 3303, 3304, 3304, 3305, 3305, 3306, 3306, 3307, 3307, 3308, 3308, 3309, 3309, 3310, 3310, 3311, 3311, 3312, 3312, 3313, 3313, 3314, 3314, 3315, 3315, 3316, 3316, 3317, 3317, 3318, 3318, 3319, 3319, 3320, 3320, 3321, 3321, 3322, 3322, 3323, 3323, 3324, 3324, 3325, 3325, 3326, 3326, 3327, 3327, 3328, 3328, 3329, 3329, 3330, 3330, 3331, 3331, 3332, 3332, 3333, 3333, 3334, 3334, 3335, 3335, 3336, 3336, 3337, 3337, 3338, 3338, 3339, 3339, 3340, 3340, 3341, 3341, 3342, 3342, 3343, 3343, 3344, 3344, 3345, 3345, 3346, 3346, 3347, 3347, 3348, 3348, 3349, 3349, 3350, 3350, 3351, 3351, 3352, 3352, 3353, 3353, 3354, 3354, 3355, 3355, 3356, 3356, 3357, 3357, 3358, 3358, 3359, 3359, 3360, 3360, 3361, 3361, 3362, 3362, 3363, 3363, 3364, 3364, 3365, 3365, 3366, 3366, 3367, 3367, 3368, 3368, 3369, 3369, 3370, 3370, 3371, 3371, 3372, 3372, 3373, 3373, 3374, 3374, 3375, 3375, 3376, 3376, 3377, 3377, 3378, 3378, 3379, 3379, 3380, 3380, 3381, 3381, 3382, 3382, 3383, 3383, 3384, 3384, 3385, 3385, 3386, 3386, 3387, 3387, 3388, 3388, 3389, 3389, 3390, 3390, 3391, 3391, 3392, 3392, 3393, 3393, 3394, 3394, 3395, 3395, 3396, 3396, 3397, 3397, 3398, 3398, 3399, 3399, 3400, 3400, 3401, 3401, 3402, 3402, 3403, 3403, 3404, 3404, 3405, 3405, 3406, 3406, 3407, 3407, 3408, 3408, 3409, 3409, 3410, 3410, 3411, 3411, 3412, 3412, 3413, 3413, 3414, 3414, 3415, 3415, 3416, 3416, 3417, 3417, 3418, 3418, 3419, 3419, 3420, 3420, 3421, 3421, 3422, 3422, 3423, 3423, 3424, 3424, 3425, 3425, 3426, 3426, 3427, 3427, 3428, 3428, 3429, 3429, 3430, 3430, 3431, 3431, 3432, 3432, 3433, 3433, 3434, 3434, 3435, 3435, 3436, 3436, 3437, 3437, 3438, 3438, 3439, 3439, 3440, 3440, 3441, 3441, 3442, 3442, 3443, 3443, 3444, 3444, 3445, 3445, 3446, 3446, 3447, 3447, 3448, 3448, 3449, 3449, 3450, 3450, 3451, 3451, 3452, 3452, 3453, 3453, 3454, 3454, 3455, 3455, 3456, 3456, 3457, 3457, 3458, 3458, 3459, 3459, 3460, 3460, 3461, 3461, 3462, 3462, 3463, 3463, 3464, 3464, 3465, 3465, 3466, 3466, 3467, 3467, 3468, 3468, 3469, 3469, 3470, 3470, 3471, 3471, 3472, 3472, 3473, 3473, 3474, 3474, 3475, 3475, 3476, 3476, 3477, 3477, 3478, 3478, 3479, 3479, 3480, 3480, 3481, 3481, 3482, 3482, 3483, 3483, 3484, 3484, 3485, 3485, 3486, 3486, 3487, 3487, 3488, 3488, 3489, 3489, 3490, 3490, 3491, 3491, 3492, 3492, 3493, 3493, 3494, 3494, 3495, 3495, 3496, 3496, 3497, 3497, 3498, 3498, 3499, 3499, 3500, 3500, 3501, 3501, 3502, 3502, 3503, 3503, 3504, 3504, 3505, 3505, 3506, 3506, 3507, 3507, 3508, 3508, 3509, 3509, 3510, 3510, 3511, 3511, 3512, 3512, 3513, 3513, 3514, 3514, 3515, 3515, 3516, 3516, 3517, 3517, 3518, 3518, 3519, 3519, 3520, 3520, 3521, 3521, 3522, 3522, 3523, 3523, 3524, 3524, 3525, 3525, 3526, 3526, 3527, 3527, 3528, 3528, 3529, 3529, 3530, 3530, 3531, 3531, 3532, 3532, 3533, 3533, 3534, 3534, 3535, 3535, 3536, 3536, 3537, 3537, 3538, 3538, 3539, 3539, 3540, 3540, 3541, 3541, 3542, 3542, 3543, 3543, 3544, 3544, 3545, 3545, 3546, 3546, 3547, 3547, 3548, 3548, 3549, 3549, 3550, 3550, 3551, 3551, 3552, 3552, 3553, 3553, 3554, 3554, 3555, 3555, 3556, 3556, 3557, 3557, 3558, 3558, 3559, 3559, 3560, 3560, 3561, 3561, 3562, 3562, 3563, 3563, 3564, 3564, 3565, 3565, 3566, 3566, 3567, 3567, 3568, 3568, 3569, 3569, 3570, 3570, 3571, 3571, 3572, 3572, 3573, 3573, 3574, 3574, 3575, 3575, 3576, 3576, 3577, 3577, 3578, 3578, 3579, 3579, 3580, 3580, 3581, 3581, 3582, 3582, 3583, 3583, 3584, 3584, 3585, 3585, 3586, 3586, 3587, 3587, 3588, 3588, 3589, 3589, 3590, 3590, 3591, 3591, 3592, 3592, 3593, 3593, 3594, 3594, 3595, 3595, 3596, 3596, 3597, 3597, 3598, 3598, 3599, 3599, 3600, 3600, 3601, 3601, 3602, 3602, 3603, 3603, 3604, 3604, 3605, 3605, 3606, 3606, 3607, 3607, 3608, 3608, 3609, 3609, 3610, 3610, 3611, 3611, 3612, 3612, 3613, 3613, 3614, 3614, 3615, 3615, 3616, 3616, 3617, 3617, 3618, 3618, 3619, 3619, 3620, 3620, 3621, 3621, 3622, 3622, 3623, 3623, 3624, 3624, 3625, 3625, 3626, 3626, 3627, 3627, 3628, 3628, 3629, 3629, 3630, 3630, 3631, 3631, 3632, 3632, 3633, 3633, 3634, 3634, 3635, 3635, 3636, 3636, 3637, 3637, 3638, 3638, 3639, 3639, 3640, 3640, 3641, 3641, 3642, 3642, 3643, 3643, 3644, 3644, 3645, 3645, 3646, 3646, 3647, 3647, 3648, 3648, 3649, 3649, 3650, 3650, 3651, 3651, 3652, 3652, 3653, 3653, 3654, 3654, 3655, 3655, 3656, 3656, 3657, 3657, 3658, 3658, 3659, 3659, 3660, 3660, 3661, 3661, 3662, 3662, 3663, 3663, 3664, 3664, 3665, 3665, 3666, 3666, 3667, 3667, 3668, 3668, 3669, 3669, 3670, 3670, 3671, 3671, 3672, 3672, 3673, 3673, 3674, 3674, 3675, 3675, 3676, 3676, 3677, 3677, 3678, 3678, 3679, 3679, 3680, 3680, 3681, 3681, 3682, 3682, 3683, 3683, 3684, 3684, 3685, 3685, 3686, 3686, 3687, 3687, 3688, 3688, 3689, 3689, 3690, 3690, 3691, 3691, 3692, 3692, 3693, 3693, 3694, 3694, 3695, 3695, 3696, 3696, 3697, 3697, 3698, 3698, 3699, 3699, 3700, 3700, 3701, 3701, 3702, 3702, 3703, 3703, 3704, 3704, 3705, 3705, 3706, 3706, 3707, 3707, 3708, 3708, 3709, 3709, 3710, 3710, 3711, 3711, 3712, 3712, 3713, 3713, 3714, 3714, 3715, 3715, 3716, 3716, 3717, 3717, 3718, 3718, 3719, 3719, 3720, 3720, 3721, 3721, 3722, 3722, 3723, 3723, 3724, 3724, 3725, 3725, 3726, 3726, 3727, 3727, 3728, 3728, 3729, 3729, 3730, 3730, 3731, 3731, 3732, 3732, 3733, 3733, 3734, 3734, 3735, 3735, 3736, 3736, 3737, 3737, 3738, 3738, 3739, 3739, 3740, 3740, 3741, 3741, 3742, 3742, 3743, 3743, 3744, 3744, 3745, 3745, 3746, 3746, 3747, 3747, 3748, 3748, 3749, 3749, 3750, 3750, 3751, 3751, 3752, 3752, 3753, 3753, 3754, 3754, 3755, 3755, 3756, 3756, 3757, 3757, 3758, 3758, 3759, 3759, 3760, 3760, 3761, 3761, 3762, 3762, 3763, 3763, 3764, 3764, 3765, 3765, 3766, 3766, 3767, 3767, 3768, 3768, 3769, 3769, 3770, 3770, 3771, 3771, 3772, 3772, 3773, 3773, 3774, 3774, 3775, 3775, 3776, 3776, 3777, 3777, 3778, 3778, 3779, 3779, 3780, 3780, 3781, 3781, 3782, 3782, 3783, 3783, 3784, 3784, 3785, 3785, 3786, 3786, 3787, 3787, 3788, 3788, 3789, 3789, 3790, 3790, 3791, 3791, 3792, 3792, 3793, 3793, 3794, 3794, 3795, 3795, 3796, 3796, 3797, 3797, 3798, 3798, 3799, 3799, 3800, 3800, 3801, 3801, 3802, 3802, 3803, 3803, 3804, 3804, 3805, 3805, 3806, 3806, 3807, 3807, 3808, 3808, 3809, 3809, 3810, 3810, 3811, 3811, 3812, 3812, 3813, 3813, 3814, 3814, 3815, 3815, 3816, 3816, 3817, 3817, 3818, 3818, 3819, 3819, 3820, 3820, 3821, 3821, 3822, 3822, 3823, 3823, 3824, 3824, 3825, 3825, 3826, 3826, 3827, 3827, 3828, 3828, 3829, 3829, 3830, 3830, 3831, 3831, 3832, 3832, 3833, 3833, 3834, 3834, 3835, 3835, 3836, 3836, 3837, 3837, 3838, 3838, 3839, 3839, 3840, 3840, 3841, 3841, 3842, 3842, 3843, 3843, 3844, 3844, 3845, 3845, 3846, 3846, 3847, 3847, 3848, 3848, 3849, 3849, 3850, 3850, 3851, 3851, 3852, 3852, 3853, 3853, 3854, 3854, 3855, 3855, 3856, 3856, 3857, 3857, 3858, 3858, 3859, 3859, 3860, 3860, 3861, 3861, 3862, 3862, 3863, 3863, 3864, 3864, 3865, 3865, 3866, 3866, 3867, 3867, 3868, 3868, 3869, 3869, 3870, 3870, 3871, 3871, 3872, 3872, 3873, 3873, 3874, 3874, 3875, 3875, 3876, 3876, 3877, 3877, 3878, 3878, 3879, 3879, 3880, 3880, 3881, 3881, 3882, 3882, 3883, 3883, 3884, 3884, 3885, 3885, 3886, 3886, 3887, 3887, 3888, 3888, 3889, 3889, 3890, 3890, 3891, 3891, 3892, 3892, 3893, 3893, 3894, 3894, 3895, 3895, 3896, 3896, 3897, 3897, 3898, 3898, 3899, 3899, 3900, 3900, 3901, 3901, 3902, 3902, 3903, 3903, 3904, 3904, 3905, 3905, 3906, 3906, 3907, 3907, 3908, 3908, 3909, 3909, 3910, 3910, 3911, 3911, 3912, 3912, 3913, 3913, 3914, 3914, 3915, 3915, 3916, 3916, 3917, 3917, 3918, 3918, 3919, 3919, 3920, 3920, 3921, 3921, 3922, 3922, 3923, 3923, 3924, 3924, 3925, 3925, 3926, 3926, 3927, 3927, 3928, 3928, 3929, 3929, 3930, 3930, 3931, 3931, 3932, 3932, 3933, 3933, 3934, 3934, 3935, 3935, 3936, 3936, 3937, 3937, 3938, 3938, 3939, 3939, 3940, 3940, 3941, 3941, 3942, 3942, 3943, 3943, 3944, 3944, 3945, 3945, 3946, 3946, 3947, 3947, 3948, 3948, 3949, 3949, 3950, 3950, 3951, 3951, 3952, 3952, 3953, 3953, 3954, 3954, 3955, 3955, 3956, 3956, 3957, 3957, 3958, 3958, 3959, 3959, 3960, 3960, 3961, 3961, 3962, 3962, 3963, 3963, 3964, 3964, 3965, 3965, 3966, 3966, 3967, 3967, 3968, 3968, 3969, 3969, 3970, 3970, 3971, 3971, 3972, 3972, 3973, 3973, 3974, 3974, 3975, 3975, 3976, 3976, 3977, 3977, 3978, 3978, 3979, 3979, 3980, 3980, 3981, 3981, 3982, 3982, 3983, 3983, 3984, 3984, 3985, 3985, 3986, 3986, 3987, 3987, 3988, 3988, 3989, 3989, 3990, 3990, 3991, 3991, 3992, 3992, 3993, 3993, 3994, 3994, 3995, 3995, 3996, 3996, 3997, 3997, 3998, 3998, 3999, 3999, 4000, 4000, 4001, 4001, 4002, 4002, 4003, 4003, 4004, 4004, 4005, 4005, 4006, 4006, 4007, 4007, 4008, 4008, 4009, 4009, 4010, 4010, 4011, 4011, 4012, 4012, 4013, 4013, 4014, 4014, 4015, 4015, 4016, 4016, 4017, 4017, 4018, 4018, 4019, 4019, 4020, 4020, 4021, 4021, 4022, 4022, 4023, 4023, 4024, 4024, 4025, 4025, 4026, 4026, 4027, 4027, 4028, 4028, 4029, 4029, 4030, 4030, 4031, 4031, 4032, 4032, 4033, 4033, 4034, 4034, 4035, 4035, 4036, 4036, 4037, 4037, 4038, 4038, 4039, 4039, 4040, 4040, 4041, 4041, 4042, 4042, 4043, 4043, 4044, 4044, 4045, 4045, 4046, 4046, 4047, 4047, 4048, 4048, 4049, 4049, 4050, 4050, 4051, 4051, 4052, 4052, 4053, 4053, 4054, 4054, 4055, 4055, 4056, 4056, 4057, 4057, 4058, 4058, 4059, 4059, 4060, 4060, 4061, 4061, 4062, 4062, 4063, 4063, 4064, 4064, 4065, 4065, 4066, 4066, 4067, 4067, 4068, 4068, 4069, 4069, 4070, 4070, 4071, 4071, 4072, 4072, 4073, 4073, 4074, 4074, 4075, 4075, 4076, 4076, 4077, 4077, 4078, 4078, 4079, 4079, 4080, 4080, 4081, 4081, 4082, 4082, 4083, 4083, 4084, 4084, 4085, 4085, 4086, 4086, 4087, 4087, 4088, 4088, 4089, 4089, 4090, 4090, 4091, 4091, 4092, 4092, 4093, 4093, 4094, 4094, 4095, 4095, 4096, 4096, 4097, 4097, 4098, 4098, 4099, 4099, 4100, 4100, 4101, 4101, 4102, 4102, 4103, 4103, 4104, 4104, 4105, 4105, 4106, 4106, 4107, 4107, 4108, 4108, 4109, 4109, 4110, 4110, 4111, 4111, 4112, 4112, 4113, 4113, 4114, 4114, 4115, 4115, 4116, 4116, 4117, 4117, 4118, 4118, 4119, 4119, 4120, 4120, 4121, 4121, 4122, 4122, 4123, 4123, 4124, 4124, 4125, 4125, 4126, 4126, 4127, 4127, 4128, 4128, 4129, 4129, 4130, 4130, 4131, 4131, 4132, 4132, 4133, 4133, 4134, 4134, 4135, 4135, 4136, 4136, 4137, 4137, 4138, 4138, 4139, 4139, 4140, 4140, 4141, 4141, 4142, 4142, 4143, 4143, 4144, 4144, 4145, 4145, 4146, 4146, 4147, 4147, 4148, 4148, 4149, 4149, 4150, 4150, 4151, 4151, 4152, 4152, 4153, 4153, 4154, 4154, 4155, 4155, 4156, 4156, 4157, 4157, 4158, 4158, 4159, 4159, 4160, 4160, 4161, 4161, 4162, 4162, 4163, 4163, 4164, 4164, 4165, 4165, 4166, 4166, 4167, 4167, 4168, 4168, 4169, 4169, 4170, 4170, 4171, 4171, 4172, 4172, 4173, 4173, 4174, 4174, 4175, 4175, 4176, 4176, 4177, 4177, 4178, 4178, 4179, 4179, 4180, 4180, 4181, 4181, 4182, 4182, 4183, 4183, 4184, 4184, 4185, 4185, 4186, 4186, 4187, 4187, 4188, 4188, 4189, 4189, 4190, 4190, 4191, 4191, 4192, 4192, 4193, 4193, 4194, 4194, 4195, 4195, 4196, 4196, 4197, 4197, 4198, 4198, 4199, 4199, 4200, 4200, 4201, 4201, 4202, 4202, 4203, 4203, 4204, 4204, 4205, 4205, 4206, 4206, 4207, 4207, 4208, 4208, 4209, 4209, 4210, 4210, 4211, 4211, 4212, 4212, 4213, 4213, 4214, 4214, 4215, 4215, 4216, 4216, 4217, 4217, 4218, 4218, 4219, 4219, 4220, 4220, 4221, 4221, 4222, 4222, 4223, 4223, 4224, 4224, 4225, 4225, 4226, 4226, 4227, 4227, 4228, 4228, 4229, 4229, 4230, 4230, 4231, 4231, 4232, 4232, 4233, 4233, 4234, 4234, 4235, 4235, 4236, 4236, 4237, 4237, 4238, 4238, 4239, 4239, 4240, 4240, 4241, 4241, 4242, 4242, 4243, 4243, 4244, 4244, 4245, 4245, 4246, 4246, 4247, 4247, 4248, 4248, 4249, 4249, 4250, 4250, 4251, 4251, 4252, 4252, 4253, 4253, 4254, 4254, 4255, 4255, 4256, 4256, 4257, 4257, 4258, 4258, 4259, 4259, 4260, 4260, 4261, 4261, 4262, 4262, 4263, 4263, 4264, 4264, 4265, 4265, 4266, 4266, 4267, 4267, 4268, 4268, 4269, 4269, 4270, 4270, 4271, 4271, 4272, 4272, 4273, 4273, 4274, 4274, 4275, 4275, 4276, 4276, 4277, 4277, 4278, 4278, 4279, 4279, 4280, 4280, 4281, 4281, 4282, 4282, 4283, 4283, 4284, 4284, 4285, 4285, 4286, 4286, 4287, 4287, 4288, 4288, 4289, 4289, 4290, 4290, 4291, 4291, 4292, 4292, 4293, 4293, 4294, 4294, 4295, 4295, 4296, 4296, 4297, 4297, 4298, 4298, 4299, 4299, 4300, 4300, 4301, 4301, 4302, 4302, 4303, 4303, 4304, 4304, 4305, 4305, 4306, 4306, 4307, 4307, 4308, 4308, 4309, 4309, 4310, 4310, 4311, 4311, 4312, 4312, 4313, 4313, 4314, 4314, 4315, 4315, 4316, 4316, 4317, 4317, 4318, 4318, 4319, 4319, 4320, 4320, 4321, 4321, 4322, 4322, 4323, 4323, 4324, 4324, 4325, 4325, 4326, 4326, 4327, 4327, 4328, 4328, 4329, 4329, 4330, 4330, 4331, 4331, 4332, 4332, 4333, 4333, 4334, 4334, 4335, 4335, 4336, 4336, 4337, 4337, 4338, 4338, 4339, 4339, 4340, 4340, 4341, 4341, 4342, 4342, 4343, 4343, 4344, 4344, 4345, 4345, 4346, 4346, 4347, 4347, 4348, 4348, 4349, 4349, 4350, 4350, 4351, 4351, 4352, 4352, 4353, 4353, 4354, 4354, 4355, 4355, 4356, 4356, 4357, 4357, 4358, 4358, 4359, 4359, 4360, 4360, 4361, 4361, 4362, 4362, 4363, 4363, 4364, 4364, 4365, 4365, 4366, 4366, 4367, 4367, 4368, 4368, 4369, 4369, 4370, 4370, 4371, 4371, 4372, 4372, 4373, 4373, 4374, 4374, 4375, 4375, 4376, 4376, 4377, 4377, 4378, 4378, 4379, 4379, 4380, 4380, 4381, 4381, 4382, 4382, 4383, 4383, 4384, 4384, 4385, 4385, 4386, 4386, 4387, 4387, 4388, 4388, 4389, 4389, 4390, 4390, 4391, 4391, 4392, 4392, 4393, 4393, 4394, 4394, 4395, 4395, 4396, 4396, 4397, 4397, 4398, 4398, 4399, 4399, 4400, 4400, 4401, 4401, 4402, 4402, 4403, 4403, 4404, 4404, 4405, 4405, 4406, 4406, 4407, 4407, 4408, 4408, 4409, 4409, 4410, 4410, 4411, 4411, 4412, 4412, 4413, 4413, 4414, 4414, 4415, 4415, 4416, 4416, 4417, 4417, 4418, 4418, 4419, 4419, 4420, 4420, 4421, 4421, 4422, 4422, 4423, 4423, 4424, 4424, 4425, 4425, 4426, 4426, 4427, 4427, 4428, 4428, 4429, 4429, 4430, 4430, 4431, 4431, 4432, 4432, 4433, 4433, 4434, 4434, 4435, 4435, 4436, 4436, 4437, 4437, 4438, 4438, 4439, 4439, 4440, 4440, 4441, 4441, 4442, 4442, 4443, 4443, 4444, 4444, 4445, 4445, 4446, 4446, 4447, 4447, 4448, 4448, 4449, 4449, 4450, 4450, 4451, 4451, 4452, 4452, 4453, 4453, 4454, 4454, 4455, 4455, 4456, 4456, 4457, 4457, 4458, 4458, 4459, 4459, 4460, 4460, 4461, 4461, 4462, 4462, 4463, 4463, 4464, 4464, 4465, 4465, 4466, 4466, 4467, 4467, 4468, 4468, 4469, 4469, 4470, 4470, 4471, 4471, 4472, 4472, 4473, 4473, 4474, 4474, 4475, 4475, 4476, 4476, 4477, 4477, 4478, 4478, 4479, 4479, 4480, 4480, 4481, 4481, 4482, 4482, 4483, 4483, 4484, 4484, 4485, 4485, 4486, 4486, 4487, 4487, 4488, 4488, 4489, 4489, 4490, 4490, 4491, 4491, 4492, 4492, 4493, 4493, 4494, 4494, 4495, 4495, 4496, 4496, 4497, 4497, 4498, 4498, 4499, 4499, 4500, 4500, 4501, 4501, 4502, 4502, 4503, 4503, 4504, 4504, 4505, 4505, 4506, 4506, 4507, 4507, 4508, 4508, 4509, 4509, 4510, 4510, 4511, 4511, 4512, 4512, 4513, 4513, 4514, 4514, 4515, 4515, 4516, 4516, 4517, 4517, 4518, 4518, 4519, 4519, 4520, 4520, 4521, 4521, 4522, 4522, 4523, 4523, 4524, 4524, 4525, 4525, 4526, 4526, 4527, 4527, 4528, 4528, 4529, 4529, 4530, 4530, 4531, 4531, 4532, 4532, 4533, 4533, 4534, 4534, 4535, 4535, 4536, 4536, 4537, 4537, 4538, 4538, 4539, 4539, 4540, 4540, 4541, 4541, 4542, 4542, 4543, 4543, 4544, 4544, 4545, 4545, 4546, 4546, 4547, 4547, 4548, 4548, 4549, 4549, 4550, 4550, 4551, 4551, 4552, 4552, 4553, 4553, 4554, 4554, 4555, 4555, 4556, 4556, 4557, 4557, 4558, 4558, 4559, 4559, 4560, 4560, 4561, 4561, 4562, 4562, 4563, 4563, 4564, 4564, 4565, 4565, 4566, 4566, 4567, 4567, 4568, 4568, 4569, 4569, 4570, 4570, 4571, 4571, 4572, 4572, 4573, 4573, 4574, 4574, 4575, 4575, 4576, 4576, 4577, 4577, 4578, 4578, 4579, 4579, 4580, 4580, 4581, 4581, 4582, 4582, 4583, 4583, 4584, 4584, 4585, 4585, 4586, 4586, 4587, 4587, 4588, 4588, 4589, 4589, 4590, 4590, 4591, 4591, 4592, 4592, 4593, 4593, 4594, 4594, 4595, 4595, 4596, 4596, 4597, 4597, 4598, 4598, 4599, 4599, 4600, 4600, 4601, 4601, 4602, 4602, 4603, 4603, 4604, 4604, 4605, 4605, 4606, 4606, 4607, 4607, 4608, 4608, 4609, 4609, 4610, 4610, 4611, 4611, 4612, 4612, 4613, 4613, 4614, 4614, 4615, 4615, 4616, 4616, 4617, 4617, 4618, 4618, 4619, 4619, 4620, 4620, 4621, 4621, 4622, 4622, 4623, 4623, 4624, 4624, 4625, 4625, 4626, 4626, 4627, 4627, 4628, 4628, 4629, 4629, 4630, 4630, 4631, 4631, 4632, 4632, 4633, 4633, 4634, 4634, 4635, 4635, 4636, 4636, 4637, 4637, 4638, 4638, 4639, 4639, 4640, 4640, 4641, 4641, 4642, 4642, 4643, 4643, 4644, 4644, 4645, 4645, 4646, 4646, 4647, 4647, 4648, 4648, 4649, 4649, 4650, 4650, 4651, 4651, 4652, 4652, 4653, 4653, 4654, 4654, 4655, 4655, 4656, 4656, 4657, 4657, 4658, 4658, 4659, 4659, 4660, 4660, 4661, 4661, 4662, 4662, 4663, 4663, 4664, 4664, 4665, 4665, 4666, 4666, 4667, 4667, 4668, 4668, 4669, 4669, 4670, 4670, 4671, 4671, 4672, 4672, 4673, 4673, 4674, 4674, 4675, 4675, 4676, 4676, 4677, 4677, 4678, 4678, 4679, 4679, 4680, 4680, 4681, 4681, 4682, 4682, 4683, 4683, 4684, 4684, 4685, 4685, 4686, 4686, 4687, 4687, 4688, 4688, 4689, 4689, 4690, 4690, 4691, 4691, 4692, 4692, 4693, 4693, 4694, 4694, 4695, 4695, 4696, 4696, 4697, 4697, 4698, 4698, 4699, 4699, 4700, 4700, 4701, 4701, 4702, 4702, 4703, 4703, 4704, 4704, 4705, 4705, 4706, 4706, 4707, 4707, 4708, 4708, 4709, 4709, 4710, 4710, 4711, 4711, 4712, 4712, 4713, 4713, 4714, 4714, 4715, 4715, 4716, 4716, 4717, 4717, 4718, 4718, 4719, 4719, 4720, 4720, 4721, 4721, 4722, 4722, 4723, 4723, 4724, 4724, 4725, 4725, 4726, 4726, 4727, 4727, 4728, 4728, 4729, 4729, 4730, 4730, 4731, 4731, 4732, 4732, 4733, 4733, 4734, 4734, 4735, 4735, 4736, 4736, 4737, 4737, 4738, 4738, 4739, 4739, 4740, 4740, 4741, 4741, 4742, 4742, 4743, 4743, 4744, 4744, 4745, 4745, 4746, 4746, 4747, 4747, 4748, 4748, 4749, 4749, 4750, 4750, 4751, 4751, 4752, 4752, 4753, 4753, 4754, 4754, 4755, 4755, 4756, 4756, 4757, 4757, 4758, 4758, 4759, 4759, 4760, 4760, 4761, 4761, 4762, 4762, 4763, 4763, 4764, 4764, 4765, 4765, 4766, 4766, 4767, 4767, 4768, 4768, 4769, 4769, 4770, 4770, 4771, 4771, 4772, 4772, 4773, 4773, 4774, 4774, 4775, 4775, 4776, 4776, 4777, 4777, 4778, 4778, 4779, 4779, 4780, 4780, 4781, 4781, 4782, 4782, 4783, 4783, 4784, 4784, 4785, 4785, 4786, 4786, 4787, 4787, 4788, 4788, 4789, 4789, 4790, 4790, 4791, 4791, 4792, 4792, 4793, 4793, 4794, 4794, 4795, 4795, 4796, 4796, 4797, 4797, 4798, 4798, 4799, 4799, 4800, 4800, 4801, 4801, 4802, 4802, 4803, 4803, 4804, 4804, 4805, 4805, 4806, 4806, 4807, 4807, 4808, 4808, 4809, 4809, 4810, 4810, 4811, 4811, 4812, 4812, 4813, 4813, 4814, 4814, 4815, 4815, 4816, 4816, 4817, 4817, 4818, 4818, 4819, 4819, 4820, 4820, 4821, 4821, 4822, 4822, 4823, 4823, 4824, 4824, 4825, 4825, 4826, 4826, 4827, 4827, 4828, 4828, 4829, 4829, 4830, 4830, 4831, 4831, 4832, 4832, 4833, 4833, 4834, 4834, 4835, 4835, 4836, 4836, 4837, 4837, 4838, 4838, 4839, 4839, 4840, 4840, 4841, 4841, 4842, 4842, 4843, 4843, 4844, 4844, 4845, 4845, 4846, 4846, 4847, 4847, 4848, 4848, 4849, 4849, 4850, 4850, 4851, 4851, 4852, 4852, 4853, 4853, 4854, 4854, 4855, 4855, 4856, 4856, 4857, 4857, 4858, 4858, 4859, 4859, 4860, 4860, 4861, 4861, 4862, 4862, 4863, 4863, 4864, 4864, 4865, 4865, 4866, 4866, 4867, 4867, 4868, 4868, 4869, 4869, 4870, 4870, 4871, 4871, 4872, 4872, 4873, 4873, 4874, 4874, 4875, 4875, 4876, 4876, 4877, 4877, 4878, 4878, 4879, 4879, 4880, 4880, 4881, 4881, 4882, 4882, 4883, 4883, 4884, 4884, 4885, 4885, 4886, 4886, 4887, 4887, 4888, 4888, 4889, 4889, 4890, 4890, 4891, 4891, 4892, 4892, 4893, 4893, 4894, 4894, 4895, 4895, 4896, 4896, 4897, 4897, 4898, 4898, 4899, 4899, 4900, 4900, 4901, 4901, 4902, 4902, 4903, 4903, 4904, 4904, 4905, 4905, 4906, 4906, 4907, 4907, 4908, 4908, 4909, 4909, 4910, 4910, 4911, 4911, 4912, 4912, 4913, 4913, 4914, 4914, 4915, 4915, 4916, 4916, 4917, 4917, 4918, 4918, 4919, 4919, 4920, 4920, 4921, 4921, 4922, 4922, 4923, 4923, 4924, 4924, 4925, 4925, 4926, 4926, 4927, 4927, 4928, 4928, 4929, 4929, 4930, 4930, 4931, 4931, 4932, 4932, 4933, 4933, 4934, 4934, 4935, 4935, 4936, 4936, 4937, 4937, 4938, 4938, 4939, 4939, 4940, 4940, 4941, 4941, 4942, 4942, 4943, 4943, 4944, 4944, 4945, 4945, 4946, 4946, 4947, 4947, 4948, 4948, 4949, 4949, 4950, 4950, 4951, 4951, 4952, 4952, 4953, 4953, 4954, 4954, 4955, 4955, 4956, 4956, 4957, 4957, 4958, 4958, 4959, 4959, 4960, 4960, 4961, 4961, 4962, 4962, 4963, 4963, 4964, 4964, 4965, 4965, 4966, 4966, 4967, 4967, 4968, 4968, 4969, 4969, 4970, 4970, 4971, 4971, 4972, 4972, 4973, 4973, 4974, 4974, 4975, 4975, 4976, 4976, 4977, 4977, 4978, 4978, 4979, 4979, 4980, 4980, 4981, 4981, 4982, 4982, 4983, 4983, 4984, 4984, 4985, 4985, 4986, 4986, 4987, 4987, 4988, 4988, 4989, 4989, 4990, 4990, 4991, 4991, 4992, 4992, 4993, 4993, 4994, 4994, 4995, 4995, 4996, 4996, 4997, 4997, 4998, 4998, 4999, 4999]],
    ] },
    solution: {
      approach: `<p>Min-heap of the current head of each list, tagged with a unique index. Pop the smallest, link it to the result, push its next node. Each of the N nodes is pushed and popped once → O(N log k).</p>`,
      code: { lang: 'python', run: true, code: `
import heapq
from typing import List, Optional

class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def merge_k_lists(lists: List[Optional[ListNode]]) -> Optional[ListNode]:
    heap = [(node.val, i, node) for i, node in enumerate(lists) if node]
    heapq.heapify(heap)
    dummy = tail = ListNode()
    while heap:
        val, i, node = heapq.heappop(heap)
        tail.next = node                     # reuse nodes, no copies
        tail = node
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next

def build(xs):
    head = None
    for x in reversed(xs):
        head = ListNode(x, head)
    return head

def to_list(node):
    out = []
    while node:
        out.append(node.val)
        node = node.next
    return out

print(to_list(merge_k_lists([build([1, 4, 5]), build([1, 3, 4]), build([2, 6])])))  # [1, 1, 2, 3, 4, 4, 5, 6]
print(to_list(merge_k_lists([])), to_list(merge_k_lists([None])))                   # [] []
` },
      dry: { head: ['pop', 'push', 'result so far'], rows: [['(1, 0)', '(4, 0)', '1'], ['(1, 1)', '(3, 1)', '1 1'], ['(2, 2)', '(6, 2)', '1 1 2'], ['(3, 1)', '(4, 1)', '1 1 2 3'], ['…', '…', H.c('g', '1 1 2 3 4 4 5 6')]] },
      complexity: `<p>O(N log k) time, O(k) heap space (output reuses the input nodes).</p>`,
      followUps: ['Divide and conquer pairwise merging — also O(N log k), no heap', 'Inputs are huge files on disk (external merge sort with heapq.merge)']
    }
  });

  /* ================= QUIZ ================= */
  quiz.push(
    { q: `What does <code>Counter("abca")["z"]</code> return, and does it change the Counter?`, options: ['0, and "z" is NOT inserted', '0, and "z" is inserted with count 0', 'KeyError', 'None'], answer: 0, explain: '<code>Counter.__missing__</code> returns 0 without storing anything, unlike <code>defaultdict(int)</code>, which inserts the key.' },
    { q: `<code>d = defaultdict(list)</code>. Which expression adds key <code>"k"</code> to d?`, options: ['<code>d["k"]</code>', '<code>d.get("k")</code>', '<code>"k" in d</code>', '<code>d.pop("k", None)</code>'], answer: 0, explain: 'Only <code>__getitem__</code> (square brackets) triggers <code>__missing__</code>, which calls the factory and stores the result.' },
    { q: `What is printed? <pre>from collections import Counter
a = Counter("aab"); a.subtract("aaab")
print(bool(a), +a)</pre>`, options: ['<code>True Counter()</code>', '<code>False Counter()</code>', "<code>True Counter({'a': -1})</code>", 'TypeError'], answer: 0, explain: 'subtract keeps the −1 for "a" (and 0 for "b"), so the Counter is non-empty → True. Unary <code>+</code> drops non-positive counts → empty Counter.' },
    { q: `Why is <code>list.pop(0)</code> a bad choice for a BFS queue?`, options: ['It is O(n) because every remaining element shifts left', 'It raises an error on empty lists while deque does not', 'It returns the last element', 'Lists are not thread-safe'], answer: 0, explain: 'Removing from the front of a dynamic array moves all other pointers. <code>deque.popleft()</code> is O(1). (Both raise IndexError when empty.)' },
    { q: `<code>od = OrderedDict.fromkeys("abc")</code>; <code>od.move_to_end("a")</code>; <code>od.popitem(last=False)</code> returns…`, options: ["<code>('b', None)</code>", "<code>('a', None)</code>", "<code>('c', None)</code>", 'KeyError'], answer: 0, explain: 'After moving "a" to the end the order is b, c, a. <code>popitem(last=False)</code> removes the oldest/front item: "b".' },
    { q: `After <code>h = [5, 3, 8, 1]; heapq.heapify(h)</code>, which statement is guaranteed?`, options: ['<code>h[0] == 1</code>', '<code>h == [1, 3, 5, 8]</code>', '<code>h[1]</code> is the second smallest', '<code>h[-1] == 8</code>'], answer: 0, explain: 'Only the root is guaranteed to be the minimum. The rest only satisfies parent ≤ children; the second smallest is h[1] or h[2].' },
    { q: `You push <code>(2, {"name": "a"})</code> and <code>(2, {"name": "b"})</code> onto a heap. What happens?`, options: ['TypeError — dicts cannot be compared with &lt; when priorities tie', 'The first pushed is popped first', 'Python compares dicts by length', 'heapq ignores the second element'], answer: 0, explain: 'Equal priorities make Python compare the dicts. Add a unique tie-breaker: <code>(priority, next(counter), item)</code>.' },
    { q: `<code>a = [1, 2, 2, 2, 5]</code>. What are <code>bisect_left(a, 2)</code> and <code>bisect_right(a, 2)</code>?`, options: ['1 and 4', '1 and 3', '2 and 4', '0 and 5'], answer: 0, explain: 'Left = first index with value ≥ 2 → 1. Right = first index with value &gt; 2 → 4. Count of 2s = 4 − 1 = 3.' },
    { q: `What does <code>[k for k, g in groupby("aabbaa")]</code> produce?`, options: ["<code>['a', 'b', 'a']</code>", "<code>['a', 'b']</code>", "<code>['a', 'a', 'b', 'b', 'a', 'a']</code>", "<code>['b', 'a']</code>"], answer: 0, explain: 'groupby groups only <b>consecutive</b> equal items, so "a" appears twice as a key.' },
    { q: `How many tuples does <code>combinations(range(6), 3)</code> yield?`, options: ['20', '120', '216', '18'], answer: 0, explain: 'C(6, 3) = 6! / (3! · 3!) = 20. (permutations would be 6·5·4 = 120; product with repeat=3 would be 216.)' },
    { q: `A function decorated with <code>@cache</code> is called as <code>f([1, 2, 3])</code>. Result?`, options: ['TypeError: unhashable type: \'list\'', 'It works but never caches', 'It caches by list identity', 'It converts the list to a tuple automatically'], answer: 0, explain: 'Arguments become dictionary keys, so they must be hashable. Pass a tuple, or pass indices into an outer list.' },
    { q: `Which sort puts higher scores first and breaks ties alphabetically by name?`, options: ['<code>sorted(rows, key=lambda r: (-r.score, r.name))</code>', '<code>sorted(rows, key=lambda r: (r.score, r.name), reverse=True)</code>', '<code>sorted(rows, key=lambda r: (r.score, -r.name))</code>', '<code>sorted(rows, key=lambda r: r.name).reverse()</code>'], answer: 0, explain: 'Negating the numeric key flips only that field. reverse=True would also reverse names; you can\'t negate a string; and <code>list.reverse()</code> returns None.' },
    { q: `What does <code>sys.getrecursionlimit()</code> return by default in CPython, and what happens when exceeded?`, options: ['1000; RecursionError is raised', '10 000; the process segfaults', 'Unlimited; Python uses tail-call optimisation', '100; StackOverflowError is raised'], answer: 0, explain: 'The default is 1000 and exceeding it raises <code>RecursionError</code> (a RuntimeError subclass). Python has no tail-call optimisation.' },
    { q: `What is <code>-7 // 2</code> in Python?`, options: ['-4', '-3', '-3.5', '3'], answer: 0, explain: '<code>//</code> is floor division: ⌊−3.5⌋ = −4. C/Java truncate toward zero (−3); in Python use <code>int(-7 / 2)</code> for that.' },
    { q: `<code>grid = [[0] * 3] * 2; grid[0][0] = 1</code>. What is grid?`, options: ['<code>[[1, 0, 0], [1, 0, 0]]</code>', '<code>[[1, 0, 0], [0, 0, 0]]</code>', '<code>[[1, 1, 1], [0, 0, 0]]</code>', 'TypeError'], answer: 0, explain: 'The outer <code>* 2</code> repeats the <b>same</b> inner list object twice. Use <code>[[0] * 3 for _ in range(2)]</code>.' }
  );

  /* ================= INTERVIEW Q&A ================= */
  interview.push(
    { q: `What is the difference between <code>Counter</code>, <code>defaultdict(int)</code> and a plain <code>dict</code> for counting?`, level: 'B', a: `<p>All three are hash maps with O(1) average updates. A plain dict needs a guard (<code>d.get(k, 0) + 1</code>). <code>defaultdict(int)</code> auto-creates 0 on <code>d[k]</code> — but also on mere reads, which can silently grow the dict. <code>Counter</code> reads missing keys as 0 <b>without inserting</b>, counts a whole iterable in one C-accelerated call, and adds <code>most_common</code>, <code>total</code>, <code>elements</code> and multiset operators (<code>+ - &amp; |</code>). I use Counter when the values are counts I want to query or compare, defaultdict when values are containers (lists/sets) I append to.</p>`, followUps: ['How does defaultdict work internally? (<code>__missing__</code>)', 'What does <code>Counter.most_common(k)</code> cost?', 'How do Counter comparisons treat missing keys since 3.10?'] },
    { q: `Why is <code>collections.deque</code> O(1) at both ends while <code>list</code> is not?`, level: 'I', a: `<p>A list is a single contiguous array of pointers: appending at the end is amortised O(1), but inserting or removing at index 0 shifts every element → O(n). CPython's deque is a <b>doubly linked list of fixed-size blocks</b> (64 slots). Adding/removing at either end touches only an end block (allocating or freeing a block occasionally), so it's O(1) without ever moving existing items. The trade-off: indexing in the middle is O(n) and slicing isn't supported. That's why BFS, sliding-window and producer/consumer queues use deque.</p>`, followUps: ['What does <code>maxlen</code> do?', 'Is deque thread-safe?', 'Why does <code>extendleft</code> reverse the input?'] },
    { q: `Implement an LRU cache in Python. What changes if OrderedDict is not allowed?`, level: 'I', a: `<p>With <code>OrderedDict</code>: <code>get</code> returns −1 if missing, otherwise <code>move_to_end(key)</code> and returns the value; <code>put</code> moves an existing key to the end, assigns, and if <code>len &gt; capacity</code> calls <code>popitem(last=False)</code>. All O(1) because OrderedDict is a dict plus a doubly linked list. Without it, I build exactly that: a dict from key to node, and a doubly linked list with <b>sentinel head and tail</b> nodes; helpers <code>_unlink(node)</code> and <code>_push_newest(node)</code> keep every operation to a few pointer updates. I'd use <code>__slots__</code> on the node class to cut memory.</p>`, followUps: ['How would you add TTL expiry?', 'Make it thread-safe', 'How does <code>functools.lru_cache</code> implement eviction?'] },
    { q: `How do you implement a max-heap and a priority queue with ties in Python?`, level: 'I', a: `<p><code>heapq</code> is min-only, so push <code>-x</code> and negate on pop (Python 3.14 adds <code>heappush_max</code>/<code>heappop_max</code>, but negation works everywhere). For priorities with payloads I push tuples <code>(priority, seq, item)</code> where <code>seq = next(itertools.count())</code>: tuples compare element-wise, so <code>seq</code> breaks ties in FIFO order and Python never compares the payloads (which may not be comparable). For "update priority" there's no decrease-key — I push a new entry and lazily skip stale ones when popped. For thread-safe blocking use <code>queue.PriorityQueue</code>.</p>`, followUps: ['Why is heapify O(n)?', 'How would you delete an arbitrary element?', 'heapq vs sorted list vs SortedList?'] },
    { q: `Explain the difference between <code>bisect_left</code> and <code>bisect_right</code> and give three uses.`, level: 'I', a: `<p>On a sorted list, <code>bisect_left(a, x)</code> returns the first index whose value is ≥ x, <code>bisect_right(a, x)</code> the first index whose value is &gt; x — they differ only when x is present (left points before the run of equal values, right after it). Uses: (1) count of x = right − left; (2) number of values in [L, R] = <code>bisect_right(a, R) − bisect_left(a, L)</code>; (3) "latest value at or before time t" = <code>bisect_right(times, t) − 1</code>. Also LIS in O(n log n) with bisect_left on the tails array, and binary search on the answer via <code>key=</code> (3.10+).</p>`, followUps: ['What is the cost of <code>insort</code>?', 'How does <code>key=</code> treat x?', 'Write bisect_left by hand'] },
    { q: `When would you use <code>itertools</code> in an interview, and what are the traps?`, level: 'I', a: `<p>For brute force over small search spaces (<code>product</code> for "every string/code", <code>combinations</code> for "choose k", <code>permutations</code> for "every ordering"), for prefix sums and running max (<code>accumulate</code>), for runs (<code>groupby</code>), flattening (<code>chain.from_iterable</code>), and adjacent pairs (<code>pairwise</code>). Traps: they return <b>one-shot iterators</b> (a second loop sees nothing); <code>groupby</code> only groups consecutive items; permutations/combinations treat elements by position, so duplicates produce duplicate outputs; and combinatorial counts explode — I estimate n!, 2<sup>n</sup> or C(n,k) before using them.</p>`, followUps: ['How many tuples does product("abc", repeat=4) produce?', 'How would you generate unique permutations of [1,1,2]?', 'Why is itertools memory-efficient?'] },
    { q: `How does <code>functools.lru_cache</code> work and what can go wrong with it?`, level: 'A', a: `<p>It wraps the function in a C-implemented object that builds a hashable key from the arguments, looks it up in a dict, and on a miss calls the function and stores the result. With a bounded <code>maxsize</code> it keeps entries on a circular doubly linked list to evict the least recently used in O(1); <code>@cache</code> (maxsize=None) is just a dict. Pitfalls: arguments must be hashable; the function must be pure (or results go stale); module-level caches persist across test cases and grow memory; caching methods keeps <code>self</code> alive; <code>f(1)</code> and <code>f(a=1)</code> may be separate entries; and memoized recursion still hits the recursion limit for deep states.</p>`, followUps: ['What does <code>cache_info()</code> show?', 'When is bottom-up DP better?', 'cached_property vs lru_cache on methods?'] },
    { q: `Is Python's sort stable, and how do you sort by multiple keys with mixed directions?`, level: 'B', a: `<p>Yes — Timsort is guaranteed stable by the language spec: equal keys keep their input order. For multiple keys use a tuple key: <code>key=lambda r: (-r.score, r.name)</code> sorts score descending and name ascending (negation works for numbers). When a field can't be negated (strings, dates), use stability: sort by the secondary key first, then by the primary key (with <code>reverse=True</code> if needed — reverse keeps equal items in original order). For relations between pairs (e.g. Largest Number), use <code>functools.cmp_to_key</code>.</p>`, followUps: ['What is the complexity of Timsort on already-sorted data?', 'Why is cmp_to_key slower than a key function?', 'What does <code>list.sort()</code> return?'] },
    { q: `Your recursive DFS raises <code>RecursionError</code> on a large input. What are your options?`, level: 'A', a: `<p>First, confirm the depth: skewed trees, long chains or big grids can recurse O(n) deep, beyond the default limit of 1000. Options: (1) rewrite with an <b>explicit stack</b> (a list of states, pushing children in reverse to keep order; a <code>(node, visited)</code> flag for post-order); (2) use <b>BFS</b> with a deque when order doesn't matter; (3) for memoized DP, go <b>bottom-up</b> or warm the cache in increasing order; (4) as a quick fix, <code>sys.setrecursionlimit</code> — acceptable in contests, but it costs memory, is slow, and on older Python versions deep C recursion could still segfault (sometimes paired with <code>threading.stack_size</code>). Python has no tail-call optimisation, so rewriting as tail recursion doesn't help.</p>`, followUps: ['Convert recursive post-order to iterative', 'What changed in 3.11/3.12 about recursion?', 'What is Morris traversal?'] },
    { q: `Write Dijkstra in Python. Why the <code>if d &gt; dist[u]: continue</code> line?`, level: 'A', a: `<p>Adjacency list via <code>defaultdict(list)</code>, <code>dist = {src: 0}</code>, heap <code>[(0, src)]</code>. Loop: pop <code>(d, u)</code>; if <code>d &gt; dist[u]</code> skip; else for each <code>(v, w)</code> if <code>d + w &lt; dist.get(v, inf)</code> update and push. heapq has no decrease-key, so when a node's distance improves we push a duplicate entry; the old, larger entry stays in the heap. The check discards those <b>stale</b> entries so each node is expanded once with its final distance — without it, correctness survives but time can blow up. Complexity O(E log E) = O(E log V). Requires non-negative weights.</p>`, followUps: ['What breaks with negative edges?', 'How would you return the path?', 'K stops constraint (Cheapest Flights)?'] },
    { q: `What are the most common Python-specific bugs in DSA interviews?`, level: 'B', a: `<p>(1) <code>[[0]*m]*n</code> creates n references to one row. (2) Mutable default arguments (<code>def f(memo={})</code>) persist across calls. (3) Appending <code>path</code> instead of <code>path[:]</code> in backtracking. (4) <code>//</code> and <code>%</code> floor toward −∞, unlike C/Java. (5) <code>list.pop(0)</code> / <code>insert(0, x)</code> are O(n). (6) String <code>+=</code> in loops can be O(n²); use <code>"".join</code>. (7) Iterators (<code>map</code>, <code>zip</code>, generators) are single-use. (8) Modifying a dict/list while iterating over it. (9) Comparing floats with <code>==</code>. I mention these proactively when relevant — it signals real Python fluency.</p>`, followUps: ['How do you deep copy a nested list?', 'Why does <code>a = a + [x]</code> differ from <code>a += [x]</code> for aliasing?', 'How would you speed up input reading?'] },
    { q: `Top K Frequent Elements: compare the heap, bucket sort and quickselect approaches.`, level: 'A', a: `<p>All start with <code>Counter</code> (O(n)). <b>Heap</b>: size-k min-heap over d distinct values → O(d log k), O(k) extra; simple via <code>heapq.nlargest(k, c, key=c.get)</code>; great for streams. <b>Bucket sort</b>: buckets indexed by frequency (max n) → O(n) time, O(n) space; only works because frequencies are bounded by n. <b>Quickselect</b>: partition distinct values by frequency → O(d) average, O(d²) worst, in place, but more code and not stable. In Python I'd present the heap/nlargest first, mention bucket sort for the O(n) follow-up, and note <code>most_common(k)</code> already uses nlargest internally.</p>`, followUps: ['What if k is close to d?', 'Ties must be broken alphabetically', 'Data does not fit in memory'] },
    { q: `Design an LFU cache with O(1) operations.`, level: 'E', a: `<p>Keep <code>key → value</code>, <code>key → freq</code>, and <code>freq → OrderedDict of keys</code> (each bucket in LRU order), plus <code>min_freq</code>. On a touch (get or update), move the key from bucket f to f+1; if bucket f becomes empty and f was min_freq, increment min_freq. On insert into a full cache, evict <code>freq_keys[min_freq].popitem(last=False)</code> — the least recently used among the least frequently used — then insert the new key with freq 1 and reset min_freq to 1. Every step is a constant number of hash/linked-list operations. A heap-based design would be O(log n) and need lazy deletion.</p>`, followUps: ['Why can min_freq only increase by 1 on a touch?', 'Handle capacity 0', 'How would you add frequency decay (aging)?'] },
    { q: `How do you binary search "on the answer" in Python, and how does <code>bisect</code>'s <code>key=</code> help?`, level: 'E', a: `<p>When a yes/no predicate is monotone in the answer (e.g. "can we ship within D days with capacity c?" is False…False, True…True as c grows), the smallest feasible value is the first True. By hand: <code>lo, hi = min_possible, max_possible</code>; while <code>lo &lt; hi</code>: <code>mid = (lo + hi) // 2</code>; if feasible(mid): <code>hi = mid</code> else <code>lo = mid + 1</code>. With Python 3.10+: <code>r = range(lo, hi + 1); r[bisect_left(r, True, key=feasible)]</code> — ranges support O(1) indexing so no list is built, and the key is applied to each probed element (not to the target <code>True</code>). Cost: O(log(range) × cost of feasible).</p>`, followUps: ['Koko Eating Bananas / Ship Packages within D Days', 'Real-valued answers — how many iterations?', 'Why must the predicate be monotone?'] }
  );

  registerModule({
    id: 'py11',
    title: 'Python Interview Toolkit & Pythonic DSA',
    intro: `<p>You already know Python and you know your data structures. This module fuses the two: the <b>standard-library power tools</b> that let you write an interview solution in 10 clean lines instead of 40 — <code>Counter</code>, <code>defaultdict</code>, <code>deque</code>, <code>OrderedDict</code>, <code>heapq</code>, <code>bisect</code>, <code>itertools</code>, <code>functools.lru_cache</code>, sorting with keys — plus the Python-specific realities that trip people up: recursion limits, aliasing, floor division and slow queues.</p>
<p>Every topic starts with an everyday analogy, then shows the mechanics in an interactive visualizer (a heap sifting as a tree <i>and</i> a list, bisect's <code>lo</code>/<code>hi</code> closing in, a Counter filling up, a monotonic deque, an LRU cache evicting, a memo cache scoring hits), then classic interview problems solved idiomatically. By the end, the wording of a question — "top k", "sliding window max", "least recently used", "sorted, find position", "number of ways" — will tell you which tool to reach for.</p>`,
    goals: [
      'Pick the right <code>collections</code> type (Counter, defaultdict, deque, OrderedDict) from the operations a problem needs, and explain its internals and costs',
      'Use <code>heapq</code> fluently: min/max heaps, tuple priorities with tie-breakers, size-k top-k, two heaps, merge-k and Dijkstra with lazy deletion',
      'Answer "position in a sorted list" questions with <code>bisect_left</code>/<code>bisect_right</code> without off-by-one bugs, including LIS in O(n log n) and binary search on the answer',
      'Write brute-force and combinatorial solutions with <code>itertools</code> while estimating their size before running them',
      'Turn a recursive solution into memoized DP with <code>@cache</code>, and into an iterative/bottom-up version when the recursion limit or speed demands it',
      'Sort by complex rules with tuple keys, stability and <code>cmp_to_key</code>, and avoid the classic Python gotchas in interview code'
    ],
    prereqs: `<p>Python 5 (Data Structure Internals &amp; Comprehensions), Python 6 (Closures, Decorators &amp; functools) and Python 7 (Iterators &amp; Generators). Basic DSA: hashing, stacks/queues, binary search, heaps, BFS/DFS and simple DP.</p>`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
