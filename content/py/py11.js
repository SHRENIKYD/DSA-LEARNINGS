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
      example: `<p>${H.table(['', 'c0', 'c1', 'c2', 'c3'], [['r0', H.c('g', '1'), H.c('g', '1'), '0', '0'], ['r1', H.c('g', '1'), '0', '0', H.c('b', '1')], ['r2', '0', '0', H.c('y', '1'), H.c('b', '1')]])}</p><p>Output <b>3</b>: green, blue and amber groups.</p>`,
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

print(num_islands_recursive([list("1100"), list("1001"), list("0011")]))  # 3
` },
      mcq: { q: 'Which change makes the island-sinking safe for a 300 × 300 all-land grid?', options: ['Replace recursion with an explicit stack (or a deque BFS)', 'Add <code>@cache</code> to <code>sink</code>', 'Iterate rows in reverse order', 'Use <code>try/except RecursionError</code> and return 0'], answer: 0, explain: 'The depth problem disappears when the pending cells live in a list/deque on the heap. Caching does nothing (each cell is visited once anyway), and catching the error gives a wrong answer.' },
      hints: [`<p>Hint 1: Every time you find an unvisited "1", you found a new island — then you must mark all of its land as visited.</p>`, `<p>Hint 2: Marking can use a <code>list</code> as a stack: push the start cell, pop a cell, push its land neighbours. No recursion → no depth limit.</p>`, `<p>Hint 3: Mark a cell as visited <b>when you push it</b> (not when you pop) so it is never pushed twice. Recipe: for each cell == "1": count += 1; grid[r][c] = "0"; stack = [(r, c)]; while stack: pop, check 4 neighbours, sink and push.</p>`],
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

print(num_islands([list("1100"), list("1001"), list("0011")]))   # 3
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
          ['(1,3)', '2', '(1,3) (2,3)'],
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
