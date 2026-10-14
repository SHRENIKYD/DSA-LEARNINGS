(function () {
  var topics = [], practice = [], quiz = [], interview = [];

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
registerModule({ id: 'py11', title: 'T', intro: `<p>xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</p>`, goals: ['aaaaaaaaaaaa','bbbbbbbbbbbbb','ccccccccccccc'], prereqs: `ppppppppppppppppppp`, hours: 10, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
