(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw; // R`...` keeps C++ backslashes such as '\n' exactly as written

  /* ---------------- shared helpers for the visualizers ---------------- */
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function intsOf(s, minN, maxN, hint) {
    s = String(s === undefined || s === null ? '' : s).trim();
    if (!s) throw new Error(hint);
    var a = s.split(/[\s,]+/).map(Number);
    if (a.length < minN || a.length > maxN || a.some(function (x) { return isNaN(x) || x !== Math.floor(x) || Math.abs(x) > 1e12; })) throw new Error(hint);
    return a;
  }
  function splitBar(input, hint) {
    var s = String(input === undefined || input === null ? '' : input);
    var k = s.indexOf('|');
    if (k < 0) throw new Error(hint);
    return [s.slice(0, k).trim(), s.slice(k + 1).trim()];
  }
  function copy(a) { return a.slice(); }

  /* ======================================================================
     TOPIC 1 — Iterators and iterator categories
     ====================================================================== */
  topics.push({
    title: 'Iterators: the Glue Between Containers and Algorithms',
    analogy: `<p>Think of a <b>tour guide with a flag</b> walking through a museum. The guide does not own the paintings, and does not care whether the museum is one long hall (a <code>vector</code>), a chain of rooms joined by doors (a <code>list</code>) or a tree-shaped building (a <code>set</code>). The guide only knows a few moves: <i>"show me the painting I am standing at"</i> (<code>*it</code>) and <i>"go to the next one"</i> (<code>++it</code>). Some guides can also <b>teleport</b> — "jump 5 rooms ahead" — but only in a museum that is one straight hall. An <b>iterator</b> is that guide. STL algorithms like <code>sort</code> or <code>find</code> never see the museum, they only talk to guides. That is why one <code>find</code> works on every container.</p>`,
    explain: `<p>An <b>iterator</b> is an object that <b>points at one element</b> of a container, a bit like a pointer. Every container hands you two of them:</p>
<ul><li><code>begin()</code> — points at the <b>first</b> element.</li>
<li><code>end()</code> — points <b>one step past the last</b> element. It is a "finish line", not a real element. Never write <code>*v.end()</code>.</li></ul>
${H.arr([10, 20, 30, 40, 50, '·'], { label: 'v', ptr: { 0: 'begin', 5: 'end' }, hl: { 5: 'm' } })}
<p>This is called a <b>half-open range</b> <code>[begin, end)</code>: the left side is included, the right side is not. It has three lovely properties: the size is simply <code>end - begin</code>, an empty range is <code>begin == end</code>, and a loop is always <code>for (it = begin; it != end; ++it)</code>.</p>
<h4>The everyday moves</h4>
${H.table(['write this', 'meaning', 'like a pointer?'], [['<code>*it</code>', 'the element it points at', 'yes'], ['<code>++it</code>', 'move to the next element', 'yes'], ['<code>--it</code>', 'move back one (not on forward-only iterators)', 'yes'], ['<code>it + 5</code>, <code>it2 - it1</code>', 'jump / measure distance in O(1) — random access only', 'yes'], ['<code>it-&gt;first</code>', 'member of the element (e.g. a pair in a map)', 'yes']])}
<h4>Iterator categories — what each "guide" can do</h4>
<p>Not every container can teleport. The STL sorts iterators into <b>categories</b>, from weakest to strongest. Each one can do everything the one above it can, plus a bit more:</p>
${H.table(['category', 'extra power', 'who gives you one'], [['Input', 'read once, move forward (single pass)', '<code>istream_iterator</code>'], ['Output', 'write once, move forward', '<code>back_inserter</code>, <code>ostream_iterator</code>'], ['Forward', 'read many times, forward only', '<code>forward_list</code>, <code>unordered_map</code>'], ['Bidirectional', '+ go backwards with <code>--</code>', '<code>list</code>, <code>set</code>, <code>map</code>'], ['Random access', '+ jump <code>it + k</code>, <code>it[k]</code>, <code>&lt;</code> in O(1)', '<code>deque</code>'], ['Contiguous (C++20)', '+ elements really sit side by side in memory', '<code>vector</code>, <code>array</code>, <code>string</code>, raw pointers']])}
<p><b>Why you care:</b> algorithms <b>demand</b> a category. <code>std::sort</code> needs random access, so <code>sort(myList.begin(), myList.end())</code> does not even compile — use <code>myList.sort()</code> instead. <code>std::lower_bound</code> <i>compiles</i> on a <code>set</code>, but because a set iterator cannot jump, it walks step by step and becomes <b>O(N)</b>. Use the member <code>s.lower_bound(x)</code> which is O(log N).</p>
<h4>Handy helpers</h4>
<p><code>distance(a, b)</code> (how many steps), <code>advance(it, k)</code> (move k steps), <code>next(it)</code> / <code>prev(it)</code> (a moved copy), <code>rbegin()/rend()</code> (walk backwards), <code>back_inserter(v)</code> (an output iterator that calls <code>push_back</code>). They work for every category, and are O(1) for random access but O(k) otherwise.</p>`,
    clues: ['"given a <code>std::set</code> / <code>multiset</code>, find the first element ≥ x" → use the member <code>s.lower_bound(x)</code>, not <code>std::lower_bound</code>',
      '"sort a linked list" in C++ → <code>list::sort()</code>, because <code>std::sort</code> needs random-access iterators',
      '"write a generic function that works on any container" → take a pair of iterators <code>[first, last)</code>',
      '"index of the element you found" → <code>it - v.begin()</code> (vector) or <code>distance(begin, it)</code> (any container)',
      '"process in reverse order" without copying → <code>rbegin()</code> / <code>rend()</code>',
      'Code review shows <code>*v.end()</code> or <code>--v.begin()</code> → undefined behaviour, the half-open range is being misunderstood'],
    code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> v = {10, 20, 30, 40, 50};

    // 1) Classic iterator loop: begin() = first element, end() = ONE PAST the last.
    for (vector<int>::iterator it = v.begin(); it != v.end(); ++it)
        cout << *it << ' ';                    // *it reads the element under the iterator
    cout << '\n';                              // 10 20 30 40 50

    // 2) Random-access powers (vector, deque, array, string, raw pointers)
    auto it = v.begin() + 3;                   // jump straight to index 3 in O(1)
    cout << *it << ' ' << (it - v.begin()) << '\n';   // 40 3

    // 3) Reverse iterators walk backwards
    for (auto r = v.rbegin(); r != v.rend(); ++r) cout << *r << ' ';
    cout << '\n';                              // 50 40 30 20 10

    // 4) Generic helpers work for ANY category (but cost O(k) when it cannot jump)
    list<int> L = {1, 2, 3, 4};
    auto p = L.begin();
    advance(p, 2);                             // list is bidirectional: walks 2 steps
    cout << *p << ' ' << distance(L.begin(), p) << '\n';   // 3 2

    // 5) Output iterator: back_inserter turns every write into push_back
    vector<int> picked;
    copy_if(v.begin(), v.end(), back_inserter(picked), [](int x) { return x % 20 == 0; });
    for (int x : picked) cout << x << ' ';     // 20 40
    cout << '\n';

    // 6) Set: use the MEMBER lower_bound (O(log N)), not std::lower_bound (O(N) here)
    set<int> s = {5, 1, 9, 3};
    auto f = s.lower_bound(4);                 // first element >= 4
    if (f != s.end()) cout << *f << '\n';      // 5
}`,
    codeTitle: 'Iterator basics you will use every day',
    viz: {
      title: 'Walking a vector with an iterator',
      input: '10 20 30 40 50',
      inputLabel: 'Vector values (space separated, up to 10)',
      gen: function (input) {
        var a = intsOf(input, 2, 10, 'Enter 2 to 10 integers separated by spaces');
        var n = a.length, frames = [];
        var cells = a.concat(['·']);
        var code = 'for (auto it = v.begin(); it != v.end(); ++it)\n    cout << *it << \' \';';
        frames.push({ narr: 'A vector of <b>' + n + '</b> numbers. <code>begin()</code> points at index 0. <code>end()</code> points at the grey cell <b>one past the last</b> element — it is a finish line, there is no real number there.', parts: [
          { type: 'array', label: 'v (grey cell = end, not a real element)', values: cells, ptr: (function () { var p = {}; p[0] = 'begin'; p[n] = 'end'; return p; })(), hl: one(n, 'done'), showIdx: true },
          { type: 'vars', label: 'Facts', vals: { 'v.size()': n, 'end() - begin()': n }, hl: {} }
        ] });
        var printed = [];
        for (var i = 0; i <= n; i++) {
          var p = {}; p[i] = 'it'; if (i !== n) p[n] = 'end';
          var hl = {}; for (var d = 0; d < i; d++) hl[d] = 'done'; hl[i] = i === n ? 'bad' : 'cur';
          if (i < n) {
            printed.push(a[i]);
            frames.push({ narr: '<code>it</code> is at index ' + i + '. Is <code>it != end()</code>? <b>Yes</b>, so the body runs: <code>*it</code> reads <b>' + a[i] + '</b>. Then <code>++it</code> moves one step right.', parts: [
              { type: 'array', label: 'v', values: cells, ptr: p, hl: hl, showIdx: true },
              { type: 'code', label: 'Running', lang: 'cpp', code: code, hl: { 1: 'ok', 2: 'cur' } },
              { type: 'text', label: 'Console output', html: '<code>' + printed.join(' ') + '</code>' }
            ] });
          } else {
            frames.push({ narr: '<code>it</code> has reached <code>end()</code>. The test <code>it != end()</code> is now <b>false</b>, so the loop stops <i>before</i> reading the grey cell. That is the whole point of the half-open range.', parts: [
              { type: 'array', label: 'v', values: cells, ptr: p, hl: hl, showIdx: true },
              { type: 'code', label: 'Running', lang: 'cpp', code: code, hl: { 1: 'bad' } },
              { type: 'text', label: 'Console output', html: '<code>' + printed.join(' ') + '</code>' }
            ] });
          }
        }
        var k = Math.min(3, n - 1);
        frames.push({ narr: '<b>Random access:</b> a vector iterator can <b>teleport</b>. <code>v.begin() + ' + k + '</code> lands on index ' + k + ' in O(1), and <code>it - v.begin()</code> gives back the index ' + k + '. A <code>list</code> or <code>set</code> iterator cannot do this — it would have to step ' + k + ' times.', parts: [
          { type: 'array', label: 'v', values: cells, ptr: (function () { var q = {}; q[0] = 'begin'; q[k] = 'begin+' + k; q[n] = 'end'; return q; })(), hl: one(k, 'sel'), showIdx: true },
          { type: 'vars', label: 'Random-access maths', vals: { '*(v.begin()+' + k + ')': a[k], '(it - v.begin())': k }, hl: { '*(v.begin()+' + k + ')': 'ok' } }
        ] });
        frames.push({ narr: '<b>Reverse iterators:</b> <code>rbegin()</code> sits on the <b>last</b> element and <code>rend()</code> is one step <b>before</b> the first. <code>++r</code> moves left. Same loop shape, opposite direction.', parts: [
          { type: 'array', label: 'v', values: a, ptr: (function () { var q = {}; q[n - 1] = 'rbegin'; return q; })(), hl: one(n - 1, 'cur'), showIdx: true },
          { type: 'text', label: 'Reverse walk prints', html: '<code>' + a.slice().reverse().join(' ') + '</code>' }
        ] });
        frames.push({ narr: '<b>Category check:</b> what each container\'s iterator can do decides which algorithms you may call and how fast they are.', parts: [
          { type: 'table', label: 'Iterator categories', columns: ['container', 'category', 'std::sort?', 'it + k'], rows: [['vector / array / string', 'contiguous', 'yes', 'O(1)'], ['deque', 'random access', 'yes', 'O(1)'], ['list / set / map', 'bidirectional', 'no (list::sort)', 'O(k) via advance'], ['forward_list / unordered_map', 'forward', 'no', 'O(k), no --']], hl: { 0: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Range-for is just iterators in disguise', html: `<p><code>for (int x : v)</code> is rewritten by the compiler into <code>for (auto it = v.begin(); it != v.end(); ++it) { int x = *it; }</code>. So anything with <code>begin()</code>/<code>end()</code> works in a range-for — including your own classes. Use <code>for (auto&amp; x : v)</code> to modify elements in place, <code>const auto&amp;</code> to avoid copying big strings.</p>`, code: R`vector<string> names = {"asha", "ben"};
for (auto& s : names) s[0] = toupper(s[0]);   // modifies the real elements
for (const auto& s : names) cout << s << ' ';   // Asha Ben` },
      { title: 'Sorting a std::list', html: `<p><code>sort(L.begin(), L.end())</code> fails to compile with a long template error mentioning <code>operator-</code>, because list iterators cannot subtract. The fix is the member function <code>L.sort()</code> — a merge sort that relinks nodes in O(N log N) without moving the values.</p>`, code: R`list<int> L = {4, 1, 3};
L.sort();                          // OK: member merge sort
L.sort(greater<int>());            // descending
// sort(L.begin(), L.end());       // would NOT compile: needs random-access iterators` },
      { title: 'Index of the max element', html: `<p><code>max_element</code> returns an <b>iterator</b>, not a value. Subtract <code>begin()</code> to get the index — a pattern you will write in almost every contest.</p>`, code: R`vector<int> a = {3, 9, 2, 9};
auto it = max_element(a.begin(), a.end());   // first 9
int idx = it - a.begin();                     // 1
cout << *it << " at " << idx << '\n';` },
      { title: 'Largest element ≤ x in a set', html: `<p>There is no "floor" function, so build it: <code>upper_bound(x)</code> gives the first element <b>&gt; x</b>; step back one with <code>prev</code> — but only if you are not already at <code>begin()</code>.</p>`, code: R`set<int> s = {2, 5, 9};
int x = 7;
auto it = s.upper_bound(x);          // points at 9
if (it != s.begin()) cout << *prev(it) << '\n';   // 5
else cout << "none\n";` }
    ],
    deepDive: `<p><b>How the library knows the category.</b> Every iterator type exposes <code>iterator_traits&lt;It&gt;::iterator_category</code>, which is one of the empty tag structs <code>input_iterator_tag</code> … <code>random_access_iterator_tag</code> (and <code>contiguous_iterator_tag</code> since C++20). Before C++20 the library used <b>tag dispatch</b>: <code>advance(it, n)</code> calls a different overload depending on the tag, so it compiles to <code>it += n</code> for vectors and a loop for lists. In C++20 the same idea is expressed with <b>concepts</b>: <code>std::random_access_iterator&lt;It&gt;</code>, <code>std::sortable&lt;It&gt;</code>, and the <code>std::ranges::</code> algorithms state their requirements directly, which is why <code>ranges::sort(myList)</code> gives a short "constraints not satisfied" error instead of 200 lines of template noise.</p>
<p><b>Sentinels.</b> C++20 ranges allow the "end" to be a different type from the iterator (a <i>sentinel</i>), e.g. "stop at the first zero" without first finding where that is. Classic STL insists both are the same type.</p>
<p><b>Invalidation.</b> An iterator is only a borrowed view; if the container reallocates (vector growth), erases, or rehashes (unordered_map), old iterators may dangle. Debug builds catch this: compile with <code>-D_GLIBCXX_DEBUG</code> (libstdc++) or use MSVC checked iterators and you get a clear abort instead of silent corruption. This is a great habit when a contest solution gives "wrong answer" for no visible reason.</p>
<p><b>Performance.</b> Vector iterators are thin wrappers over raw pointers; with optimisation on, an iterator loop compiles to exactly the same machine code as an index loop. Node-based iterators (<code>list</code>, <code>set</code>) chase pointers and miss the cache, which is a big reason the same O(N log N) algorithm is often 3–10× slower on a <code>set</code> than on a sorted <code>vector</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants write iterator loops and <code>auto</code> declarations instantly, so the boilerplate is no longer the skill. The skill is spotting the <b>category mistakes</b> that compile fine but hurt: <code>std::lower_bound(s.begin(), s.end(), x)</code> on a <code>set</code> (silently O(N)), <code>std::distance</code> inside a loop over a <code>list</code> (O(N²)), or holding an iterator across a <code>push_back</code>.</p>
<p><b>Use AI as a partner:</b> ask <code>"List every iterator-invalidation risk in this function and say which line causes it"</code> or <code>"Rewrite this with std::ranges and tell me which iterator concept each algorithm requires"</code>. Then verify with <code>-D_GLIBCXX_DEBUG</code>.</p>
<p><b>Where AI goes wrong:</b> it often dereferences <code>prev(it)</code> without checking <code>it != begin()</code>, and mixes up "one past the end" with "last element". <b>What you must still own:</b> the half-open range mental model and the cost of each iterator move — that is exactly what interviewers probe.</p>`
  });

  /* ======================================================================
     TOPIC 2 — sort, stable_sort and custom comparators
     ====================================================================== */
  var CMP = {
    asc: { f: function (a, b) { return a < b; }, src: '[](int a, int b) { return a < b; }', say: 'a &lt; b (ascending, the default)' },
    desc: { f: function (a, b) { return a > b; }, src: '[](int a, int b) { return a > b; }', say: 'a &gt; b (descending, same as greater&lt;int&gt;())' },
    abs: { f: function (a, b) { return Math.abs(a) < Math.abs(b); }, src: '[](int a, int b) { return abs(a) < abs(b); }', say: '|a| &lt; |b| (by absolute value)' },
    even: { f: function (a, b) { return Math.abs(a) % 2 === 0 && Math.abs(b) % 2 === 1; }, src: '[](int a, int b) { return a % 2 == 0 && b % 2 != 0; }', say: 'evens before odds' },
    bad: { f: function (a, b) { return a <= b; }, src: '[](int a, int b) { return a <= b; }   // BUG', say: 'a &lt;= b (BROKEN: not a strict weak ordering)' }
  };
  topics.push({
    title: 'sort, stable_sort & Custom Comparators (and Their Bugs)',
    analogy: `<p>Imagine a teacher lining up students for a photo. The teacher does not need to know any sorting algorithm — they only need <b>one rule</b> they can apply to any two kids: <i>"Should Asha stand <b>before</b> Ben?"</i> If the rule is "shorter first", everyone ends up by height. Change the rule to "older first" and the same lining-up procedure gives a totally different photo. A <b>comparator</b> is that rule. And the rule must be sane: if you ask "should Asha stand before Asha?" the answer must be <b>no</b> — a teacher whose rule says "yes" will keep shuffling forever.</p>`,
    explain: `<p><code>sort(v.begin(), v.end())</code> puts the elements in <b>ascending</b> order using <code>&lt;</code>. It runs in <b>O(N log N)</b> and is the most used algorithm in competitive programming.</p>
<h4>1. Your own order: the comparator</h4>
<p>Pass a third argument: a function that takes two elements <code>a</code>, <code>b</code> and returns <code>true</code> when <b><code>a</code> must come strictly before <code>b</code></b>.</p>
${H.table(['goal', 'comparator'], [['descending', '<code>greater&lt;int&gt;()</code> or <code>[](int a, int b){ return a &gt; b; }</code>'], ['by length of string', '<code>[](auto&amp; a, auto&amp; b){ return a.size() &lt; b.size(); }</code>'], ['marks high→low, then name A→Z', '<code>if (a.m != b.m) return a.m &gt; b.m; return a.name &lt; b.name;</code>'], ['pairs by second value', '<code>[](auto&amp; a, auto&amp; b){ return a.second &lt; b.second; }</code>']])}
<p>A neat multi-key trick: <code>return tie(a.x, a.y) &lt; tie(b.x, b.y);</code> compares field by field, like a dictionary. For "descending on one key" negate it or swap a and b for that key.</p>
<h4>2. The golden rule: strict weak ordering</h4>
<p>Your comparator must behave like <code>&lt;</code>, never like <code>&lt;=</code>:</p>
<ul><li><b>Irreflexive:</b> <code>comp(a, a)</code> is always <b>false</b>. (Nobody stands before themselves.)</li>
<li><b>Asymmetric:</b> if <code>comp(a, b)</code> then <code>!comp(b, a)</code>.</li>
<li><b>Transitive:</b> <code>comp(a,b)</code> and <code>comp(b,c)</code> ⇒ <code>comp(a,c)</code>.</li>
<li><b>Ties are transitive too:</b> if a ties b and b ties c, then a ties c.</li></ul>
<p>Break it (classic: <code>return a &lt;= b;</code>) and the result is <b>undefined behaviour</b>. With GCC's <code>std::sort</code> on many equal values it can read <b>past the end of the array</b> and crash with a segfault — a real bug that bites people in contests.</p>
${H.table(['comparator', 'comp(5,5)', 'verdict'], [['<code>a &lt; b</code>', H.c('g', 'false'), H.c('g', 'valid')], ['<code>a &lt;= b</code>', H.c('r', 'true'), H.c('r', 'UB — may crash')], ['<code>return a - b;</code>', 'false, but comp(3,5) and comp(5,3) are both true', H.c('r', 'UB — int converts to bool')]])}
<h4>3. sort vs stable_sort</h4>
<p><code>sort</code> may <b>reorder equal elements</b> (it is not stable). <code>stable_sort</code> promises that elements which tie keep their <b>original relative order</b>. Use it when you sort by one key after another ("sort by name, then stable-sort by city" gives city groups with names still alphabetical), or when the problem says "if equal, keep input order".</p>
${H.table(['', 'sort', 'stable_sort'], [['algorithm (libstdc++)', 'introsort: quicksort + heapsort fallback + insertion sort', 'merge sort'], ['time', 'O(N log N) worst case', 'O(N log N) with extra memory, O(N log² N) without'], ['extra memory', 'O(log N)', 'O(N) buffer'], ['keeps ties in order', H.c('r', 'no'), H.c('g', 'yes')]])}
<h4>4. Cousins worth knowing</h4>
<p><code>partial_sort(b, b+k, e)</code> — only the smallest k, sorted, O(N log k). <code>nth_element(b, b+k, e)</code> — puts the k-th smallest at position k with smaller ones left and bigger ones right, <b>O(N) average</b> (perfect for medians). <code>is_sorted</code> checks. <code>ranges::sort(v, greater{}, &amp;P::age)</code> (C++20) sorts by a member using a <b>projection</b>.</p>`,
    clues: ['"sort by X; if equal, by Y" → one comparator with an <code>if</code> on the first key, or <code>tie(...)</code>',
      '"if two items are equal keep their original order" → <code>stable_sort</code>',
      '"arrange numbers to form the largest number" → string comparator <code>a + b &gt; b + a</code>',
      '"k smallest / top-k" → <code>partial_sort</code> or <code>nth_element</code>, not a full sort',
      '"median in O(N)" → <code>nth_element</code>',
      'Segfault inside <code>std::sort</code> with lots of duplicates → comparator uses <code>&lt;=</code>',
      'N ≤ 2·10<sup>5</sup> and "order / rank / closest" in the statement → sort first, O(N log N) fits'],
    code: R`#include <bits/stdc++.h>
using namespace std;

struct Student {
    string name;
    int marks;
};

// Style 1: a free function. true = "a goes before b".
bool byMarksThenName(const Student& a, const Student& b) {
    if (a.marks != b.marks) return a.marks > b.marks;  // higher marks first
    return a.name < b.name;                            // tie -> alphabetical
}

// Style 2: a functor (struct with operator()) - can carry state, inlines well.
struct ByLength {
    bool operator()(const string& a, const string& b) const {
        return a.size() < b.size();
    }
};

int main() {
    vector<Student> st = {{"ben", 80}, {"asha", 92}, {"cara", 80}, {"dev", 92}};
    sort(st.begin(), st.end(), byMarksThenName);
    for (auto& s : st) cout << s.name << ' ' << s.marks << '\n';  // asha dev ben cara

    // Style 3: a lambda (most common in contests)
    vector<int> v = {5, -7, 2, -1, 9};
    sort(v.begin(), v.end(), [](int a, int b) { return abs(a) < abs(b); });  // -1 2 5 -7 9

    // Descending with the library functor
    sort(v.begin(), v.end(), greater<int>());                 // 9 5 2 -1 -7

    // Multi-key with tie(): ascending x, then descending y (negate y)
    vector<pair<int,int>> pts = {{1, 5}, {0, 2}, {1, 9}};
    sort(pts.begin(), pts.end(), [](const pair<int,int>& a, const pair<int,int>& b) {
        return make_tuple(a.first, -a.second) < make_tuple(b.first, -b.second);
    });                                                        // (0,2) (1,9) (1,5)

    // stable_sort keeps equal-length words in their input order
    vector<string> w = {"bb", "a", "cc", "d", "eee"};
    stable_sort(w.begin(), w.end(), ByLength());               // a d bb cc eee

    // nth_element: median in O(N) average
    vector<int> m = {7, 1, 9, 3, 5};
    nth_element(m.begin(), m.begin() + m.size() / 2, m.end());
    cout << "median " << m[m.size() / 2] << '\n';              // 5
}`,
    codeTitle: 'Three comparator styles, multi-key sorting, stable_sort, nth_element',
    viz: [{
      title: 'Insertion sort driven only by your comparator',
      input: 'desc | 5 2 8 2 9 1',
      inputLabel: 'mode | numbers   (modes: asc, desc, abs, even, bad)',
      gen: function (input) {
        var hint = 'Format: mode | numbers, e.g. "desc | 5 2 8 2 9 1". Modes: asc, desc, abs, even, bad (2 to 10 numbers)';
        var sp = splitBar(input, hint), mode = sp[0].toLowerCase();
        if (!CMP[mode]) throw new Error(hint);
        var vals = intsOf(sp[1], 2, 10, hint), cmp = CMP[mode];
        var cnt = {}, seen = {};
        vals.forEach(function (x) { cnt[x] = (cnt[x] || 0) + 1; });
        var items = vals.map(function (x) {
          seen[x] = (seen[x] || 0) + 1;
          return { v: x, lab: cnt[x] > 1 ? x + 'abcdefghij'.charAt(seen[x] - 1) : String(x) };
        });
        function labs(a) { return a.map(function (t) { return t.lab; }); }
        var frames = [], code = { type: 'code', label: 'Comparator (true = left argument goes first)', lang: 'cpp', code: 'auto comp = ' + cmp.src + ';\n// insertion sort: while comp(cur, left) swap them', hl: {} };
        frames.push({ narr: 'Rule in use: <b>' + cmp.say + '</b>. Repeated values get letters (2a, 2b) so you can see whether ties keep their order. The sort only ever asks one question: <code>comp(x, y)</code> — "must x come before y?"', parts: [
          { type: 'array', label: 'start', values: labs(items), showIdx: true }, code] });
        var a = items.slice(), calls = 0;
        for (var i = 1; i < a.length; i++) {
          var j = i;
          var sortedHl = {}; for (var s = 0; s < i; s++) sortedHl[s] = 'win';
          sortedHl[i] = 'cur';
          frames.push({ narr: 'Take <b>' + a[i].lab + '</b> (index ' + i + ') and slide it left into the blue sorted part.', parts: [
            { type: 'array', label: 'array', values: labs(a), hl: sortedHl, ptr: one(i, 'cur'), showIdx: true }, code] });
          while (j > 0) {
            calls++;
            var r = cmp.f(a[j].v, a[j - 1].v), hl = {};
            for (var q = 0; q <= i; q++) hl[q] = 'win';
            hl[j] = 'cur'; hl[j - 1] = r ? 'ok' : 'sel';
            var ptr = {}; ptr[j] = 'x'; ptr[j - 1] = 'y';
            frames.push({ narr: 'Call #' + calls + ': <code>comp(' + a[j].v + ', ' + a[j - 1].v + ')</code> → <b>' + r + '</b>. ' + (r ? 'So ' + a[j].lab + ' must go before ' + a[j - 1].lab + ': <span class="c-g">swap</span>.' : a[j].lab + ' does not need to go before ' + a[j - 1].lab + ': <span class="c-b">stop here</span>.') + (mode === 'bad' && a[j].v === a[j - 1].v ? ' <span class="c-r">Equal values swapped — <code>&lt;=</code> says "5 before 5" is true. That breaks stability here, and inside real std::sort it is undefined behaviour.</span>' : ''), parts: [
              { type: 'array', label: 'array', values: labs(a), hl: hl, ptr: ptr, showIdx: true },
              { type: 'vars', label: 'Comparator call', vals: { x: a[j].lab, y: a[j - 1].lab, 'comp(x, y)': String(r), 'calls so far': calls }, hl: { 'comp(x, y)': r ? 'ok' : 'bad' } }, code] });
            if (!r) break;
            var t = a[j]; a[j] = a[j - 1]; a[j - 1] = t; j--;
          }
        }
        var stable = true;
        for (var u = 0; u < a.length; u++) for (var w = u + 1; w < a.length; w++) {
          if (!cmp.f(a[u].v, a[w].v) && !cmp.f(a[w].v, a[u].v) && a[u].v === a[w].v && a[u].lab > a[w].lab) stable = false;
        }
        var allHl = {}; a.forEach(function (_, k) { allHl[k] = 'ok'; });
        frames.push({ narr: 'Done after <b>' + calls + '</b> comparator calls. ' + (stable ? 'Equal values kept their input order (2a before 2b): this insertion sort is <b>stable</b> with a correct comparator — that is what <code>stable_sort</code> guarantees.' : '<span class="c-r">Equal values came out in the wrong order</span> — the <code>&lt;=</code> comparator broke stability. In <code>std::sort</code> it can even read out of bounds and crash.'), parts: [
          { type: 'array', label: 'sorted', values: labs(a), hl: allHl, showIdx: true },
          { type: 'vars', label: 'Summary', vals: { comparator: mode, 'comparisons': calls, 'ties kept in order': stable ? 'yes' : 'NO' }, hl: { 'ties kept in order': stable ? 'ok' : 'bad' } }] });
        return frames;
      }
    }, {
      title: 'Comparator lie detector: is it a strict weak ordering?',
      input: '<= | 3 1 3',
      inputLabel: 'comparator | values   (comparators: <, <=, >, a-b)',
      gen: function (input) {
        var hint = 'Format: comparator | values, e.g. "<= | 3 1 3". Comparators: <, <=, >, a-b (2 to 6 values)';
        var sp = splitBar(input, hint), op = sp[0].replace(/\s+/g, '');
        var F = { '<': function (a, b) { return a < b; }, '<=': function (a, b) { return a <= b; }, '>': function (a, b) { return a > b; }, 'a-b': function (a, b) { return a - b !== 0; } };
        if (!F[op]) throw new Error(hint);
        var v = intsOf(sp[1], 2, 6, hint), n = v.length, f = F[op];
        var rows = [], frames = [], bad = [];
        for (var i = 0; i < n; i++) { var r = [v[i]]; for (var j = 0; j < n; j++) r.push('?'); rows.push(r); }
        var colHead = ['comp(row, col)'].concat(v.map(String));
        var srcs = { '<': 'return a < b;', '<=': 'return a <= b;', '>': 'return a > b;', 'a-b': 'return a - b;   // int silently converts to bool' };
        frames.push({ narr: 'We test the comparator <code>' + H.esc(srcs[op]) + '</code> on every pair. Rules: the diagonal <b>comp(x, x)</b> must be false, and comp(a, b) and comp(b, a) must never <b>both</b> be true.', parts: [
          { type: 'grid', label: 'comp(a, b) table', colHead: colHead, rowHead: [], rows: rows.map(copy) },
          { type: 'code', label: 'Comparator', lang: 'cpp', code: '[](int a, int b) {\n    ' + srcs[op] + '\n}', hl: { 2: 'cur' } }] });
        for (i = 0; i < n; i++) {
          var hl = {};
          for (j = 0; j < n; j++) {
            var res = f(v[i], v[j]);
            rows[i][j + 1] = res ? 'T' : 'F';
            if (i === j && res) { hl[i + ',' + (j + 1)] = 'bad'; bad.push('comp(' + v[i] + ', ' + v[i] + ') is true (irreflexivity broken)'); }
            else if (res && f(v[j], v[i])) { hl[i + ',' + (j + 1)] = 'bad'; bad.push('comp(' + v[i] + ', ' + v[j] + ') and comp(' + v[j] + ', ' + v[i] + ') both true (asymmetry broken)'); }
            else hl[i + ',' + (j + 1)] = res ? 'ok' : '';
          }
          frames.push({ narr: 'Row for a = <b>' + v[i] + '</b> filled. ' + (bad.length ? '<span class="c-r">Red cells are rule violations.</span>' : 'No violation so far.'), parts: [
            { type: 'grid', label: 'comp(a, b) table', colHead: colHead, rowHead: [], rows: rows.map(copy), hl: hl }] });
        }
        var uniq = bad.filter(function (x, k) { return bad.indexOf(x) === k; }).slice(0, 4);
        frames.push({ narr: uniq.length ? '<span class="c-r"><b>Verdict: NOT a strict weak ordering.</b></span> Passing this to <code>std::sort</code>, <code>set</code> or <code>map</code> is undefined behaviour (wrong order, lost elements in a set, or a crash).' : '<span class="c-g"><b>Verdict: valid strict weak ordering.</b></span> Safe for sort, stable_sort, set, map and binary search.', parts: [
          { type: 'grid', label: 'comp(a, b) table', colHead: colHead, rowHead: [], rows: rows.map(copy) },
          { type: 'text', label: 'Problems found', html: uniq.length ? uniq.map(function (x) { return '<span class="c-r">' + x + '</span>'; }).join('<br>') : '<span class="c-g">none</span>' }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Sort pairs by second value, ties by first descending', html: `<p>Ask one question: does <code>a</code> go first? Decide the first key; only when it ties, decide the second key. Write it as an <code>if</code> ladder — it is easy to read and hard to get wrong.</p>`, code: R`vector<pair<int,int>> p = {{1, 3}, {4, 1}, {2, 3}, {9, 1}};
sort(p.begin(), p.end(), [](const auto& a, const auto& b) {
    if (a.second != b.second) return a.second < b.second;   // smaller second first
    return a.first > b.first;                               // tie: bigger first first
});
// (9,1) (4,1) (2,3) (1,3)` },
      { title: 'stable_sort for a two-pass ordering', html: `<p>Want employees grouped by department, alphabetical inside each department? Sort by name first, then <b>stable</b>-sort by department. The second pass keeps the name order inside each department because names that share a department "tie" on the second key.</p>`, code: R`vector<pair<string,string>> e = {{"zoe", "ops"}, {"amy", "dev"}, {"bob", "ops"}, {"ann", "dev"}};
sort(e.begin(), e.end());                                   // by name (first)
stable_sort(e.begin(), e.end(), [](const auto& a, const auto& b) { return a.second < b.second; });
// (amy,dev) (ann,dev) (bob,ops) (zoe,ops): names still sorted inside each department` },
      { title: 'The "return a - b" bug from other languages', html: `<p>In Java or JavaScript a comparator returns a negative/zero/positive number. In C++ it returns <b>bool</b>. <code>return a - b;</code> compiles, but any non-zero becomes <code>true</code>, so <code>comp(3,5)</code> and <code>comp(5,3)</code> are both true. Result: undefined behaviour. Use the lie detector visualizer with <code>a-b</code> to see it.</p>`, code: R`vector<int> v = {3, 1, 2};
// WRONG: sort(v.begin(), v.end(), [](int a, int b) { return a - b; });
sort(v.begin(), v.end(), [](int a, int b) { return a < b; });   // RIGHT` },
      { title: 'Top-3 scores without sorting everything', html: `<p>With 10<sup>6</sup> scores and you only need the best 3, <code>partial_sort</code> does O(N log 3) work — basically linear.</p>`, code: R`vector<int> s = {40, 95, 12, 77, 88, 63};
partial_sort(s.begin(), s.begin() + 3, s.end(), greater<int>());
// s[0..2] = 95 88 77, the rest in unspecified order` }
    ],
    deepDive: `<p><b>Inside std::sort (libstdc++).</b> It is <i>introsort</i>: quicksort with median-of-three pivot; if the recursion depth exceeds about 2·log₂N it switches to heapsort (so the worst case is O(N log N), never O(N²)); partitions smaller than 16 elements are left alone and one final <b>insertion sort</b> pass finishes the job. That last pass is "unguarded": once the first 16 elements are sorted, the inner loop does <code>while (comp(val, *(next-1)))</code> <b>without checking the left boundary</b>, trusting that a smaller-or-equal element exists to the left. If your comparator says <code>comp(x, x) == true</code>, that trust is broken and the loop walks off the front of the array — the famous segfault with <code>&lt;=</code>. Since 2024 (GCC 14 / LLVM 17) libraries may add assertions under hardening modes, but you cannot rely on them.</p>
<p><b>Floating point.</b> <code>NaN &lt; x</code> and <code>x &lt; NaN</code> are both false, so NaN "ties" with every number, which breaks transitivity of ties. Filter NaNs first or use <code>std::strong_order</code>/<code>totalOrder</code>-style comparisons (C++20 <code>std::strong_order</code> on doubles).</p>
<p><b>Cost of the comparator.</b> sort calls it about N·log₂N times (≈ 3.6·10<sup>6</sup> for N = 2·10<sup>5</sup>). Take parameters by <code>const&amp;</code> — a comparator taking <code>string</code> by value copies two strings per call. Lambdas and functors inline; a function pointer usually does too at -O2, but <code>std::function</code> does not. For expensive keys, precompute them once ("decorate-sort-undecorate": sort a vector of <code>pair&lt;key, index&gt;</code>).</p>
<p><b>Stability in practice.</b> <code>std::sort</code> on <code>pair</code>s with a unique second field (the original index) gives you stability for free and is often faster than <code>stable_sort</code>. <b>C++20 projections</b>: <code>ranges::sort(people, {}, &amp;Person::age)</code> sorts by age with the default <code>less</code> — no lambda needed.</p>`,
    aiEra: `<p><b>What AI changes:</b> a model will write any comparator you describe in a second, including <code>tie</code> tricks and projections. What it cannot know is whether your description was <b>complete</b> — e.g. you forgot to say how ties break, and the judge expects a specific tie order.</p>
<p><b>Use AI as a partner:</b> <code>"Here is my comparator. Prove it is a strict weak ordering or give a counterexample triple (a, b, c)."</code> and <code>"Generate 20 random test cases with many duplicates and compare std::sort output against a brute force."</code> Models are good at producing the property-test harness; you run it.</p>
<p><b>Where AI goes wrong:</b> porting a Java comparator as <code>return a - b;</code>, writing <code>&lt;=</code> "to include equal elements", and using <code>sort</code> where the statement quietly demands input order for ties. <b>What you must still own:</b> the strict-weak-ordering rules, recognising a comparator bug from a crash inside <code>std::sort</code>, and the choice between sort, stable_sort, partial_sort and nth_element.</p>`,
    problems: [{
      title: 'Largest Number (custom string comparator)', level: 'Medium', tags: ['sorting', 'comparator', 'string'], companies: ['Amazon', 'Microsoft', 'Goldman Sachs'],
      statement: `<p>Given a list of non-negative integers <code>nums</code>, arrange them so that they form the <b>largest possible number</b> and return it as a string.</p>`,
      constraints: `1 ≤ N ≤ 100, 0 ≤ nums[i] ≤ 10<sup>9</sup>`,
      example: `<p>Input <code>[3, 30, 34, 5, 9]</code> → Output <b>${H.c('g', '"9534330"')}</b>.</p><p>Why not sort numerically descending (34, 30, 9, 5, 3)? Because "3" should go before "30": ${H.c('g', '"330"')} &gt; ${H.c('r', '"303"')}. The right question for any two pieces a, b is: is <code>a + b</code> bigger than <code>b + a</code> as strings?</p>`,
      brute: { why: `<p>Try every ordering with <code>next_permutation</code> and keep the largest concatenation. N! orderings × N work — fine for N = 8, hopeless for N = 100 (100! is astronomically large).</p>`, code: R`string largestBrute(vector<int> nums) {
    vector<string> s;
    for (int x : nums) s.push_back(to_string(x));
    sort(s.begin(), s.end());                 // start from the smallest permutation
    string best = "";
    do {
        string cur;
        for (auto& t : s) cur += t;
        if (cur.size() > best.size() || (cur.size() == best.size() && cur > best)) best = cur;
    } while (next_permutation(s.begin(), s.end()));
    if (best[0] == '0') return "0";
    return best;
}` },
      mcq: { q: 'Which comparator orders the strings correctly?', options: ['<code>a &gt; b</code> (plain string descending)', '<code>a + b &gt; b + a</code>', '<code>stoi(a) &gt; stoi(b)</code>', '<code>a.size() &lt; b.size()</code>'], answer: 1, explain: 'Plain descending puts "30" before "3" giving "303" instead of "330". Comparing the two possible concatenations is exactly the local decision we need, and it is transitive, so sorting with it gives the global optimum.' },
      hints: [`<p>Hint 1: For just two numbers a and b there are only two orders: "ab" or "ba". Pick the bigger string. Can a sort make that local choice for every pair?</p>`, `<p>Hint 2: Convert to strings and <code>sort</code> with the comparator <code>a + b &gt; b + a</code>. Both concatenations have the same length, so string comparison equals numeric comparison.</p>`, `<p>Hint 3: Edge case: all zeros gives "000" — return "0". Recipe: to_string each, sort with the concat comparator, join, fix leading zero.</p>`],
      solution: {
        approach: `<p>Turn numbers into strings. Sort with the rule "a goes first if <code>a + b &gt; b + a</code>". This relation is a strict weak ordering (it is equivalent to comparing a/(10<sup>|a|</sup>−1) as fractions, which is transitive), so the sorted order is globally best by an exchange argument: any adjacent pair in the wrong order could be swapped to make the number larger. Finally, if the first string is "0" every string is "0", so return "0".</p>`,
        code: R`class Solution {
public:
    string largestNumber(vector<int>& nums) {
        vector<string> s;
        for (int x : nums) s.push_back(to_string(x));
        sort(s.begin(), s.end(), [](const string& a, const string& b) {
            return a + b > b + a;          // a first if "ab" beats "ba"
        });
        if (s[0] == "0") return "0";       // all zeros -> "0", not "000"
        string ans;
        for (const string& t : s) ans += t;
        return ans;
    }
};`,
        dry: { head: ['compare', 'a + b', 'b + a', 'who goes first'], rows: [['"3" vs "30"', '"330"', '"303"', H.c('g', '"3"')], ['"34" vs "3"', '"343"', '"334"', H.c('g', '"34"')], ['"9" vs "5"', '"95"', '"59"', H.c('g', '"9"')], ['"5" vs "34"', '"534"', '"345"', H.c('g', '"5"')], ['final order', '9, 5, 34, 3, 30', '', H.c('g', '"9534330"')]] },
        complexity: `<p>O(N log N) comparisons, each building strings of length up to 20 → O(N log N · L). Space O(N · L).</p>`,
        followUps: ['Return the <b>smallest</b> number instead (flip the comparator) — careful with leading zeros.', 'Why is <code>a + b &gt; b + a</code> transitive? Sketch the proof.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — lower_bound, upper_bound, binary_search, equal_range
     ====================================================================== */
  function boundFrames(a, x, upper, frames) {
    var n = a.length, lo = 0, hi = n, step = 0;
    var cells = a.concat(['end']);
    var name = upper ? 'upper_bound' : 'lower_bound';
    var test = upper ? 'a[mid] <= x' : 'a[mid] < x';
    var code = 'lo = 0, hi = n;            // answer lives in [lo, hi]\nwhile (lo < hi) {\n    mid = (lo + hi) / 2;\n    if (' + test + ') lo = mid + 1;  // answer is right of mid\n    else hi = mid;                 // mid might be the answer\n}\nreturn lo;';
    function ptrs(m) {
      var p = {};
      function add(i, l) { if (p[i] === undefined) p[i] = l; else p[i] = [].concat(p[i], l); }
      add(lo, 'lo'); add(hi, 'hi'); if (m !== undefined) add(m, 'mid');
      return p;
    }
    function hls(m, cls) {
      var h = {};
      for (var i = 0; i <= n; i++) if (i < lo || i > hi) h[i] = 'done';
      if (m !== undefined) h[m] = cls;
      return h;
    }
    frames.push({ narr: '<b>' + name + '(' + x + ')</b> = first position whose value is ' + (upper ? '<b>greater than</b> ' + x : '<b>not less than</b> ' + x + ' (i.e. ≥ ' + x + ')') + '. Start with lo = 0 and hi = n = ' + n + ' (the "end" slot is a legal answer meaning "none").', parts: [
      { type: 'array', label: name + ' — searching for x = ' + x, values: cells, ptr: ptrs(), hl: hls(), range: [lo, hi], showIdx: true },
      { type: 'code', label: name + ' logic', lang: 'cpp', code: code, hl: { 1: 'cur' } },
      { type: 'vars', label: 'State', vals: { lo: lo, hi: hi, x: x }, hl: {} }] });
    while (lo < hi && step < 20) {
      step++;
      var mid = Math.floor((lo + hi) / 2);
      var goRight = upper ? a[mid] <= x : a[mid] < x;
      frames.push({ narr: 'Step ' + step + ': mid = (' + lo + ' + ' + hi + ') / 2 = <b>' + mid + '</b>, a[mid] = <b>' + a[mid] + '</b>. Is ' + a[mid] + (upper ? ' ≤ ' : ' &lt; ') + x + '? <b>' + (goRight ? 'Yes' : 'No') + '</b> → ' + (goRight ? 'mid and everything left of it are too small, so <code>lo = mid + 1 = ' + (mid + 1) + '</code>.' : 'mid could be the answer, keep it: <code>hi = mid = ' + mid + '</code>.'), parts: [
        { type: 'array', label: name + ' — searching for x = ' + x, values: cells, ptr: ptrs(mid), hl: hls(mid, goRight ? 'bad' : 'ok'), range: [lo, hi], showIdx: true },
        { type: 'code', label: name + ' logic', lang: 'cpp', code: code, hl: { 3: 'cur', 4: goRight ? 'ok' : '', 5: goRight ? '' : 'ok' } },
        { type: 'vars', label: 'State', vals: { lo: lo, hi: hi, mid: mid, 'a[mid]': a[mid] }, hl: { 'a[mid]': goRight ? 'bad' : 'ok' } }] });
      if (goRight) lo = mid + 1; else hi = mid;
    }
    var res = lo;
    frames.push({ narr: 'lo == hi == <b>' + res + '</b>, the search window is empty. ' + name + ' returns <code>v.begin() + ' + res + '</code>' + (res === n ? ' which is <b>end()</b>: every element is ' + (upper ? '≤ ' : '&lt; ') + x + '.' : ', pointing at value <b>' + a[res] + '</b>.'), parts: [
      { type: 'array', label: name + '(' + x + ') result', values: cells, ptr: one(res, name === 'lower_bound' ? 'lb' : 'ub'), hl: (function () { var h = {}; h[res] = 'sel'; return h; })(), showIdx: true },
      { type: 'code', label: name + ' logic', lang: 'cpp', code: code, hl: { 7: 'ok' } }] });
    return res;
  }
  topics.push({
    title: 'lower_bound, upper_bound & Friends: Binary Search Done Right',
    analogy: `<p>A <b>dictionary</b> is sorted. To find where "cat" would go, you never read every page: you open the middle, see "mango", know "cat" is in the left half, open the middle of that half, and so on. <code>lower_bound("cat")</code> is your finger on the <b>first</b> word that is "cat" or comes after it. <code>upper_bound("cat")</code> is your finger on the first word that comes <b>strictly after</b> all the "cat" entries. Everything between your two fingers is exactly the "cat" section — so its size is just "right finger minus left finger".</p>`,
    explain: `<p>Both functions do <b>binary search</b> on a <b>sorted</b> range in <b>O(log N)</b> and return an <b>iterator</b> (a position), never a bool.</p>
${H.arr([1, 3, 3, 3, 5, 8, 'end'], { label: 'v (search x = 3)', ptr: { 1: 'lower_bound', 4: 'upper_bound', 6: '' }, hl: { 1: 'g', 2: 'g', 3: 'g', 6: 'm' } })}
${H.table(['call', 'returns position of', 'x = 3 →', 'x = 4 →', 'x = 9 →'], [['<code>lower_bound(b, e, x)</code>', 'first element <b>≥ x</b>', 'index 1', 'index 4 (value 5)', 'end (index 6)'], ['<code>upper_bound(b, e, x)</code>', 'first element <b>&gt; x</b>', 'index 4', 'index 4', 'end'], ['<code>binary_search(b, e, x)</code>', 'just true/false', 'true', 'false', 'false'], ['<code>equal_range(b, e, x)</code>', 'pair {lower, upper}', '{1, 4}', '{4, 4} (empty)', '{6, 6}']])}
<h4>The recipes you will use again and again</h4>
${H.table(['question', 'code'], [['index of first ≥ x', '<code>lower_bound(all(v), x) - v.begin()</code>'], ['does x exist?', '<code>it != v.end() &amp;&amp; *it == x</code> (with it = lower_bound)'], ['how many copies of x?', '<code>upper_bound(x) - lower_bound(x)</code>'], ['how many elements &lt; x?', '<code>lower_bound(x) - v.begin()</code>'], ['how many elements ≤ x?', '<code>upper_bound(x) - v.begin()</code>'], ['count in [L, R]', '<code>upper_bound(R) - lower_bound(L)</code>'], ['largest element ≤ x (floor)', '<code>prev(upper_bound(x))</code> if it is not <code>begin()</code>'], ['largest element &lt; x', '<code>prev(lower_bound(x))</code> if it is not <code>begin()</code>']])}
<p><b>Always check for <code>end()</code></b> before you dereference — if every element is smaller than x, there is no answer and you get <code>end()</code>.</p>
<h4>With a comparator</h4>
<p>If the vector is sorted with a comparator, you <b>must pass the same comparator</b> to the search. For a vector sorted descending: <code>lower_bound(v.begin(), v.end(), x, greater&lt;int&gt;())</code> returns the first element <b>≤ x</b>. Search on a sorted <code>vector&lt;pair&lt;int,int&gt;&gt;</code> by a pair, e.g. <code>lower_bound(all(p), make_pair(x, INT_MIN))</code> finds the first pair whose first value is ≥ x.</p>
<h4>On set and map use the member version</h4>
<p><code>s.lower_bound(x)</code> walks the red-black tree: O(log N). <code>std::lower_bound(s.begin(), s.end(), x)</code> also compiles but set iterators cannot jump, so it is <b>O(N)</b>. This is one of the most common TLE causes in C++ contests.</p>`,
    clues: ['"sorted array" + "first position where / insert position" → <code>lower_bound</code>',
      '"count occurrences of x in a sorted array" → <code>upper_bound - lower_bound</code>',
      '"Q queries: how many values in [L, R]" with N, Q ≤ 2·10<sup>5</sup> → sort once, two bound calls per query',
      '"closest value / floor / ceiling" → lower_bound then look at it and <code>prev(it)</code>',
      '"longest increasing subsequence, N ≤ 10<sup>5</sup>" → patience sorting with <code>lower_bound</code>',
      '"minimum X such that condition holds" with a monotonic condition → binary search on the answer (<code>partition_point</code>)'],
    code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> v = {1, 3, 3, 3, 5, 8, 9};      // MUST be sorted for binary search

    auto lo = lower_bound(v.begin(), v.end(), 3);   // first >= 3
    auto hi = upper_bound(v.begin(), v.end(), 3);   // first >  3
    cout << "first 3 at index " << (lo - v.begin()) << '\n';   // 1
    cout << "count of 3 = " << (hi - lo) << '\n';               // 3

    // Does 4 exist? lower_bound + check (never dereference end()).
    auto it = lower_bound(v.begin(), v.end(), 4);
    bool has4 = (it != v.end() && *it == 4);                    // false, *it == 5

    // Floor: largest element <= 7
    auto up = upper_bound(v.begin(), v.end(), 7);               // points at 8
    if (up != v.begin()) cout << "floor(7) = " << *prev(up) << '\n';   // 5

    // equal_range gives both at once
    auto [a, b] = equal_range(v.begin(), v.end(), 3);
    cout << "range [" << (a - v.begin()) << ", " << (b - v.begin()) << ")\n";  // [1, 4)

    // Descending vector -> pass the SAME comparator you sorted with
    vector<int> d = {9, 8, 5, 3, 3, 1};
    auto g = lower_bound(d.begin(), d.end(), 4, greater<int>());   // first element <= 4
    cout << *g << '\n';                                         // 3

    // Search pairs by first value only
    vector<pair<int,int>> p = {{1, 7}, {4, 2}, {4, 9}, {6, 1}};
    auto q = lower_bound(p.begin(), p.end(), make_pair(4, INT_MIN));
    cout << q->first << ',' << q->second << '\n';               // 4,2
    (void)has4;
}`,
    codeTitle: 'Bounds, counts, floor, equal_range, comparators and pairs',
    viz: {
      title: 'lower_bound and upper_bound with lo / mid / hi',
      input: '1 3 3 3 5 8 9 | 3',
      inputLabel: 'sorted numbers | x',
      gen: function (input) {
        var hint = 'Format: sorted numbers | x, e.g. "1 3 3 3 5 8 9 | 3" (2 to 14 numbers)';
        var sp = splitBar(input, hint);
        var a = intsOf(sp[0], 2, 14, hint), xs = intsOf(sp[1], 1, 1, hint), x = xs[0];
        for (var i = 1; i < a.length; i++) if (a[i] < a[i - 1]) throw new Error('The numbers must be sorted ascending — binary search needs sorted input');
        var frames = [];
        var lb = boundFrames(a, x, false, frames);
        var ub = boundFrames(a, x, true, frames);
        var cells = a.concat(['end']), hl = {};
        for (var k = lb; k < ub; k++) hl[k] = 'ok';
        var p = {};
        p[lb] = 'lb'; p[ub] = lb === ub ? ['lb', 'ub'] : 'ub';
        frames.push({ narr: 'Put the two answers together: the copies of ' + x + ' live in the half-open range [' + lb + ', ' + ub + '). Count = ub − lb = <b>' + (ub - lb) + '</b>. ' + (ub === lb ? 'Empty range means ' + x + ' is not present, and ' + lb + ' is where it would be inserted to keep the vector sorted.' : 'That is exactly what <code>equal_range</code> returns in one call.'), parts: [
          { type: 'array', label: 'equal_range(' + x + ')', values: cells, ptr: p, hl: hl, showIdx: true },
          { type: 'vars', label: 'Answers', vals: { lower_bound: lb, upper_bound: ub, 'count(x)': ub - lb, 'elements < x': lb, 'elements <= x': ub, binary_search: String(ub > lb) }, hl: { 'count(x)': 'ok' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Insert position (LeetCode 35)', html: `<p>"Return the index where target is, or where it would be inserted." That sentence <b>is</b> the definition of lower_bound. One line.</p>`, code: R`int searchInsert(vector<int>& nums, int target) {
    return lower_bound(nums.begin(), nums.end(), target) - nums.begin();
}` },
      { title: 'Closest value to x in a sorted array', html: `<p>The closest value is either the first element ≥ x (<code>*it</code>) or the one just before it (<code>*prev(it)</code>). Check both, guarding <code>end()</code> and <code>begin()</code>. For v = [1, 4, 9], x = 6: it → 9, prev → 4; |6−4| = 2 &lt; |9−6| = 3, answer 4.</p>`, code: R`int closest(const vector<int>& v, int x) {
    auto it = lower_bound(v.begin(), v.end(), x);
    if (it == v.end()) return v.back();
    if (it == v.begin()) return *it;
    int after = *it, before = *prev(it);
    return (x - before <= after - x) ? before : after;
}` },
      { title: 'Binary search on the answer with partition_point', html: `<p>"Smallest k such that k·k ≥ n". The predicate "k·k &lt; n" is true for small k and false after some point, so <code>partition_point</code> finds the first false. The range does not even need to be a real container — <code>views::iota</code> is enough.</p>`, code: R`long long n = 50;
auto r = views::iota(0LL, 100LL);
auto it = ranges::partition_point(r, [&](long long k) { return k * k < n; });
cout << *it << '\n';   // 8, because 7*7 = 49 < 50 <= 64` },
      { title: 'Member lower_bound on a multiset', html: `<p>Maintain a multiset of prices; for each customer budget b, sell the most expensive item ≤ b (a classic CSES problem "Concert Tickets"). <code>upper_bound(b)</code> then step back.</p>`, code: R`multiset<int> tickets = {5, 3, 7, 8, 5};
int budget = 6;
auto it = tickets.upper_bound(budget);        // first price > 6 -> 7
if (it == tickets.begin()) cout << -1 << '\n';
else { --it; cout << *it << '\n'; tickets.erase(it); }   // sells a 5, erases ONE copy` }
    ],
    deepDive: `<p><b>What "sorted" really means.</b> The standard only requires the range to be <i>partitioned</i> with respect to the test: for lower_bound, all elements with <code>e &lt; x</code> must come before all elements with <code>!(e &lt; x)</code>. That is why binary search on the answer works on any monotonic predicate (<code>partition_point</code>).</p>
<p><b>Argument order of comparators.</b> lower_bound calls <code>comp(element, value)</code>; upper_bound calls <code>comp(value, element)</code>. With a heterogeneous comparator (e.g. searching a vector of structs by an int key) you must handle the right order: <code>lower_bound(all(v), 42, [](const Item&amp; it, int key){ return it.id &lt; key; })</code>. C++20 projections remove the pain: <code>ranges::lower_bound(v, 42, {}, &amp;Item::id)</code>.</p>
<p><b>Complexity details.</b> Exactly at most log₂(N) + O(1) comparisons. For non-random-access iterators the number of comparisons is still logarithmic but the <b>iterator moves</b> are O(N) — the comparisons are cheap, the walking is not. Hand-written binary search with <code>(lo + hi) / 2</code> on ints can overflow for huge indices; the library uses <code>distance/2</code> on iterators so it cannot.</p>
<p><b>Speed tricks in production.</b> Binary search jumps around memory and misses the cache. Branchless binary search (conditional moves) and the <b>Eytzinger layout</b> (store the sorted array in BFS order of an implicit tree) can be 2–4× faster for millions of lookups; databases use B-trees for the same reason. For a static set queried many times, a sorted <code>vector</code> + lower_bound usually beats <code>std::set</code> by a wide margin thanks to contiguous memory.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants know these recipes well and will happily produce <code>upper_bound - lower_bound</code>. They are much worse at <b>off-by-one intent</b>: "strictly less" vs "at most", and "first index" vs "last index".</p>
<p><b>Use AI as a partner:</b> ask <code>"Write a randomized test comparing my bound-based count against a linear scan for 1000 random arrays with duplicates and negative numbers"</code>. Ask it to explain which of lower/upper bound each sub-question needs — then check against the recipe table.</p>
<p><b>Where AI goes wrong:</b> using <code>std::lower_bound</code> on a <code>set</code> (O(N)), forgetting to pass <code>greater&lt;&gt;()</code> on a descending vector, dereferencing <code>end()</code>, and calling binary search on an unsorted vector after an edit. <b>What you must still own:</b> the invariant "answer is in [lo, hi]" and the meaning of each bound — interviewers love asking you to write lower_bound from scratch.</p>`,
    problems: [{
      title: 'Count Values in a Range for Many Queries', level: 'Easy', tags: ['binary search', 'lower_bound', 'upper_bound'], companies: ['Google', 'Codeforces'],
      statement: `<p>You are given N integers and Q queries. Each query is a pair (L, R). For each query print how many of the N integers lie in the closed range <b>[L, R]</b>.</p>`,
      constraints: `1 ≤ N, Q ≤ 2·10<sup>5</sup>, −10<sup>9</sup> ≤ values, L ≤ R ≤ 10<sup>9</sup>`,
      example: `<p>Values <code>[5, 1, 8, 3, 3, 10]</code>, queries <code>(3, 8)</code>, <code>(11, 20)</code> → output ${H.c('g', '4')} and ${H.c('g', '0')}.</p><p>Sorted: ${H.arr([1, 3, 3, 5, 8, 10], { hl: { 1: 'g', 2: 'g', 3: 'g', 4: 'g' } })} lower_bound(3) = index 1, upper_bound(8) = index 5, so 5 − 1 = <b>4</b> numbers (3, 3, 5, 8).</p>`,
      brute: { why: `<p>For every query scan all N numbers: O(N · Q) = 4·10<sup>10</sup> operations — far beyond the ~10<sup>8</sup>/second budget. The wasted work: every query re-reads numbers that never change.</p>`, code: R`vector<int> bruteAnswer(const vector<int>& a, const vector<pair<int,int>>& qs) {
    vector<int> out;
    for (auto [L, R] : qs) {
        int c = 0;
        for (int x : a) if (L <= x && x <= R) c++;
        out.push_back(c);
    }
    return out;
}` },
      mcq: { q: 'After sorting, which expression counts values in [L, R]?', options: ['<code>upper_bound(R) - lower_bound(L)</code>', '<code>lower_bound(R) - lower_bound(L)</code>', '<code>upper_bound(R) - upper_bound(L)</code>', '<code>lower_bound(R) - upper_bound(L)</code>'], answer: 0, explain: 'lower_bound(L) is the first value ≥ L (so L is included) and upper_bound(R) is the first value &gt; R (so R is included). Every other combination drops one of the endpoints.' },
      hints: [`<p>Hint 1: The numbers never change between queries. Do the expensive work (sorting) once, then answer each query fast.</p>`, `<p>Hint 2: In a sorted array, "values ≥ L" start at <code>lower_bound(L)</code> and "values ≤ R" end just before <code>upper_bound(R)</code>.</p>`, `<p>Hint 3: Use fast I/O and print with <code>'\\n'</code>. If L &gt; R the answer would be 0 automatically because the difference is never negative here (L ≤ R is guaranteed). Recipe: read, sort, per query print ub(R) − lb(L).</p>`],
      solution: {
        approach: `<p>Sort once in O(N log N). For each query, two binary searches give the first index with value ≥ L and the first index with value &gt; R; their difference is the count. Total O((N + Q) log N).</p>`,
        code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, q;
    cin >> n >> q;
    vector<int> a(n);
    for (auto& x : a) cin >> x;
    sort(a.begin(), a.end());                       // pay O(N log N) once
    while (q--) {
        int L, R;
        cin >> L >> R;
        auto lo = lower_bound(a.begin(), a.end(), L);   // first >= L
        auto hi = upper_bound(a.begin(), a.end(), R);   // first >  R
        cout << (hi - lo) << '\n';
    }
}`,
        dry: { head: ['query', 'lower_bound(L)', 'upper_bound(R)', 'answer'], rows: [['(3, 8)', 'index 1 (value 3)', 'index 5 (value 10)', H.c('g', '4')], ['(11, 20)', 'index 6 (end)', 'index 6 (end)', H.c('g', '0')], ['(4, 4)', 'index 3 (value 5)', 'index 3', H.c('g', '0')], ['(-5, 1)', 'index 0', 'index 1', H.c('g', '1')]] },
        complexity: `<p>Time O(N log N + Q log N), space O(N).</p>`,
        followUps: ['Values can be inserted between queries → use an order-statistics tree or a Fenwick tree over compressed coordinates.', 'Count pairs (i, j) with L ≤ a[i] + a[j] ≤ R — sort, then one bound pair per i.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — accumulate and the <numeric> toolbox
     ====================================================================== */
  function wrap32(x) { return Number(BigInt.asIntN(32, BigInt(x))); }
  topics.push({
    title: 'accumulate & the &lt;numeric&gt; Toolbox (and the init-type Trap)',
    analogy: `<p>A <b>shop cashier</b> starts the day with an empty till, then adds each sale. <code>accumulate</code> is that cashier: you hand it a starting amount and a list of sales, it adds them one by one and tells you the total. The catch: the cashier uses <b>the same kind of box as the starting amount</b>. Start with a tiny coin purse (<code>0</code>, an <code>int</code>) and big sales overflow it; start with a safe (<code>0LL</code>, a <code>long long</code>) and everything fits.</p>`,
    explain: `<p><code>accumulate(first, last, init)</code> from <code>&lt;numeric&gt;</code> returns <code>init + a[0] + a[1] + …</code>, adding left to right.</p>
<pre><code>long long total = accumulate(v.begin(), v.end(), 0LL);</code></pre>
<h4>The init-type trap (the #1 accumulate bug)</h4>
<p>The return type and the running total have the <b>type of <code>init</code></b>, not the type of the elements:</p>
${H.table(['call', 'running total type', 'result for {2e9, 2e9}'], [['<code>accumulate(b, e, 0)</code>', 'int', H.c('r', 'overflow → garbage (UB on signed int)')], ['<code>accumulate(b, e, 0LL)</code>', 'long long', H.c('g', '4000000000')], ['<code>accumulate(b, e, 0)</code> on <code>vector&lt;double&gt;</code>', 'int', H.c('r', '0.5 + 0.5 → each step truncates → 0')], ['<code>accumulate(b, e, 0.0)</code>', 'double', H.c('g', '1.0')]])}
<h4>Not just sums: pass an operation</h4>
<p>The 4th argument is any "combine" function <code>op(total, element)</code>:</p>
${H.table(['goal', 'call'], [['product', '<code>accumulate(b, e, 1LL, multiplies&lt;long long&gt;())</code>'], ['max', '<code>accumulate(b, e, LLONG_MIN, [](long long m, int x){ return max(m, (long long)x); })</code>'], ['join strings', '<code>accumulate(next(b), e, s[0], [](string acc, const string&amp; w){ return acc + "," + w; })</code>'], ['count with a condition', 'better: <code>count_if</code>']])}
<h4>The rest of the &lt;numeric&gt; toolbox</h4>
${H.table(['algorithm', 'what it does', 'example on {3, 1, 4, 1}'], [['<code>iota(b, e, start)</code>', 'fill with start, start+1, …', 'iota from 0 → {0, 1, 2, 3}'], ['<code>partial_sum(b, e, out)</code>', 'prefix sums', '{3, 4, 8, 9}'], ['<code>adjacent_difference(b, e, out)</code>', 'out[0]=a[0], out[i]=a[i]−a[i−1]', '{3, −2, 3, −3}'], ['<code>inner_product(b1, e1, b2, init)</code>', 'dot product ∑ a[i]·b[i]', 'with itself: 9+1+16+1 = 27'], ['<code>reduce(b, e, init)</code> (C++17)', 'like accumulate but may reorder (can run in parallel)', '9'], ['<code>gcd(a, b)</code>, <code>lcm(a, b)</code> (C++17)', 'greatest common divisor, least common multiple', 'gcd(12, 18) = 6']])}
<p>And from <code>&lt;algorithm&gt;</code> the everyday friends: <code>*max_element(b, e)</code>, <code>*min_element(b, e)</code>, <code>minmax_element</code>, <code>count(b, e, x)</code>, <code>find(b, e, x)</code>, <code>reverse</code>, <code>fill</code>, <code>rotate</code>. Each is one line instead of a hand-written loop, and the name tells the reader the intent.</p>`,
    clues: ['"sum of the array" + values up to 10<sup>9</sup> and N up to 10<sup>5</sup> → total up to 10<sup>14</sup>: <code>accumulate(…, 0LL)</code>',
      '"prefix sums / range sum queries" → <code>partial_sum</code> into a vector of long long',
      '"fill 0, 1, 2, … n−1" (indices to sort, DSU parents) → <code>iota</code>',
      '"gcd of all elements" → <code>accumulate(b, e, 0, [](int g, int x){ return gcd(g, x); })</code>',
      '"average" in the statement → watch the init type: <code>0.0</code> or divide a long long sum by N as double',
      '"product modulo 10<sup>9</sup>+7" → accumulate with a lambda that takes <code>% MOD</code> each step'],
    code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> v = {2000000000, 2000000000, 7};

    // WRONG: init 0 is an int, so the running total is an int and overflows.
    // int bad = accumulate(v.begin(), v.end(), 0);
    long long sum = accumulate(v.begin(), v.end(), 0LL);    // RIGHT: 4000000007
    cout << sum << '\n';

    // Product modulo M with a custom operation
    const long long MOD = 1'000'000'007;
    vector<int> w = {3, 1, 4, 1, 5};
    long long prod = accumulate(w.begin(), w.end(), 1LL,
        [&](long long acc, int x) { return acc * x % MOD; });   // 60

    // gcd of all elements (gcd(0, x) == x makes 0 the perfect start)
    vector<int> g = {12, 18, 30};
    int G = accumulate(g.begin(), g.end(), 0, [](int a, int b) { return gcd(a, b); });   // 6

    // iota + partial_sum + adjacent_difference
    vector<int> idx(5);
    iota(idx.begin(), idx.end(), 0);                         // 0 1 2 3 4
    vector<long long> pre(w.size());
    partial_sum(w.begin(), w.end(), pre.begin());            // 3 4 8 9 14
    vector<int> diff(w.size());
    adjacent_difference(w.begin(), w.end(), diff.begin());   // 3 -2 3 -3 4

    // dot product, min / max
    long long dot = inner_product(w.begin(), w.end(), w.begin(), 0LL);   // 52
    auto [mn, mx] = minmax_element(w.begin(), w.end());
    cout << prod << ' ' << G << ' ' << dot << ' ' << *mn << ' ' << *mx << '\n';

    // Joining words with accumulate (string init)
    vector<string> words = {"sort", "search", "permute"};
    string joined = accumulate(next(words.begin()), words.end(), words[0],
        [](string acc, const string& s) { return acc + ", " + s; });
    cout << joined << '\n';                                  // sort, search, permute
}`,
    codeTitle: 'accumulate with the right init, custom ops, and the numeric family',
    viz: [{
      title: 'accumulate step by step: int init vs long long init',
      input: '2000000000 2000000000 1500000000 7',
      inputLabel: 'Numbers (each within int range, up to 10)',
      gen: function (input) {
        var a = intsOf(input, 2, 10, 'Enter 2 to 10 integers separated by spaces');
        if (a.some(function (x) { return x > 2147483647 || x < -2147483648; })) throw new Error('Each number must fit in an int (between -2147483648 and 2147483647)');
        var frames = [], accI = 0, accL = 0, broke = false;
        var code = 'int       s1 = accumulate(v.begin(), v.end(), 0);     // int box\nlong long s2 = accumulate(v.begin(), v.end(), 0LL);   // big box';
        frames.push({ narr: 'Two cashiers add the same numbers. Cashier 1 starts with <code>0</code> (an <b>int</b>, max about 2.1·10<sup>9</sup>). Cashier 2 starts with <code>0LL</code> (a <b>long long</b>, max about 9.2·10<sup>18</sup>). The type of the starting value is the type of the running total.', parts: [
          { type: 'array', label: 'v', values: a, showIdx: true },
          { type: 'vars', label: 'Running totals', vals: { 'int total': 0, 'long long total': 0 }, hl: {} },
          { type: 'code', label: 'Two calls', lang: 'cpp', code: code, hl: {} }] });
        for (var i = 0; i < a.length; i++) {
          var trueNext = accL + a[i];
          var nextI = wrap32(accI + a[i]);
          var over = nextI !== accI + a[i];
          if (over) broke = true;
          accI = nextI; accL = trueNext;
          var hl = {}; for (var d = 0; d < i; d++) hl[d] = 'done'; hl[i] = 'cur';
          frames.push({ narr: 'Add <b>' + a[i] + '</b>. long long total = <b>' + accL + '</b>. ' + (over ? '<span class="c-r">The int total overflowed!</span> The true value does not fit in 32 bits, so the int box wrapped around to <b>' + accI + '</b> (in real C++ signed overflow is undefined behaviour — this wrap is just what typically happens).' : (broke ? 'The int total is still wrong because an earlier step overflowed: <b>' + accI + '</b>.' : 'Both boxes still agree: <b>' + accI + '</b>.')), parts: [
            { type: 'array', label: 'v', values: a, hl: hl, ptr: one(i, 'x'), showIdx: true },
            { type: 'vars', label: 'Running totals', vals: { 'int total': accI, 'long long total': accL }, hl: { 'int total': broke ? 'bad' : 'ok', 'long long total': 'ok' } },
            { type: 'code', label: 'Two calls', lang: 'cpp', code: code, hl: { 1: broke ? 'bad' : 'cur', 2: 'ok' } }] });
        }
        frames.push({ narr: broke ? '<b>Final:</b> int version returns <span class="c-r">' + accI + '</span>, long long version returns <span class="c-g">' + accL + '</span>. Same function, same numbers — only the starting value differed. Always write <code>0LL</code> when the sum can pass 2·10<sup>9</sup>.' : '<b>Final:</b> both give ' + accL + ' because the sum stayed below 2<sup>31</sup>. Try bigger numbers to see the trap.', parts: [
          { type: 'vars', label: 'Results', vals: { 'accumulate(…, 0)': accI, 'accumulate(…, 0LL)': accL }, hl: { 'accumulate(…, 0)': broke ? 'bad' : 'ok', 'accumulate(…, 0LL)': 'ok' } }] });
        return frames;
      }
    }, {
      title: 'partial_sum builds prefix sums, then answers range sums in O(1)',
      input: '3 1 4 1 5 9 2',
      inputLabel: 'Numbers (up to 12)',
      gen: function (input) {
        var a = intsOf(input, 2, 12, 'Enter 2 to 12 integers separated by spaces');
        var frames = [], pre = [];
        frames.push({ narr: '<code>partial_sum(a.begin(), a.end(), pre.begin())</code> writes pre[i] = a[0] + … + a[i]. It is accumulate that also <b>writes down every intermediate total</b>.', parts: [
          { type: 'array', label: 'a', values: a, showIdx: true }, { type: 'array', label: 'pre', values: a.map(function () { return '?'; }), showIdx: true }] });
        var run = 0;
        for (var i = 0; i < a.length; i++) {
          run += a[i]; pre.push(run);
          var shown = pre.concat(a.slice(i + 1).map(function () { return '?'; }));
          var h = {}; for (var k = 0; k <= i; k++) h[k] = 'win';
          frames.push({ narr: 'pre[' + i + '] = ' + (i ? 'pre[' + (i - 1) + '] + a[' + i + '] = ' + (run - a[i]) + ' + ' + a[i] : 'a[0]') + ' = <b>' + run + '</b>.', parts: [
            { type: 'array', label: 'a', values: a, hl: h, ptr: one(i, 'i'), showIdx: true },
            { type: 'array', label: 'pre', values: shown, hl: one(i, 'ok'), showIdx: true },
            { type: 'bars', label: 'prefix sums so far', values: pre.slice() }] });
        }
        var L = Math.min(1, a.length - 1), Rr = Math.min(a.length - 1, 3);
        var s = pre[Rr] - (L ? pre[L - 1] : 0);
        var rh = {}; for (var q = L; q <= Rr; q++) rh[q] = 'sel';
        frames.push({ narr: 'Range sum a[' + L + '..' + Rr + '] = pre[' + Rr + '] − pre[' + (L - 1) + '] = ' + pre[Rr] + ' − ' + (L ? pre[L - 1] : 0) + ' = <b>' + s + '</b>. One subtraction, no loop — that is why prefix sums turn O(N) queries into O(1).', parts: [
          { type: 'array', label: 'a', values: a, hl: rh, showIdx: true },
          { type: 'array', label: 'pre', values: pre, hl: (function () { var t = {}; t[Rr] = 'ok'; if (L) t[L - 1] = 'bad'; return t; })(), showIdx: true }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Average of marks without the integer-division bug', html: `<p><code>accumulate(b, e, 0) / v.size()</code> on {1, 2} gives <b>1</b> (int division; also mixes signed and unsigned). Use a double init or cast at the end.</p>`, code: R`vector<int> marks = {1, 2};
double avg = accumulate(marks.begin(), marks.end(), 0.0) / marks.size();   // 1.5` },
      { title: 'Sort indices by value with iota', html: `<p>To know <b>where</b> each sorted value came from, sort the indices, not the values. <code>iota</code> fills 0..n−1, the lambda compares by value. Stable, because ties keep index order if you use <code>stable_sort</code>.</p>`, code: R`vector<int> a = {30, 10, 20};
vector<int> id(a.size());
iota(id.begin(), id.end(), 0);                         // 0 1 2
stable_sort(id.begin(), id.end(), [&](int i, int j) { return a[i] < a[j]; });
// id = 1 2 0  -> a[1]=10, a[2]=20, a[0]=30` },
      { title: 'Count elements greater than the average', html: `<p>Combine two algorithms: accumulate for the total, count_if with a lambda for the condition. Compare <code>x * n &gt; total</code> in integers to avoid floating point entirely.</p>`, code: R`vector<long long> v = {4, 8, 1, 7};
long long total = accumulate(v.begin(), v.end(), 0LL);       // 20, avg 5
long long n = v.size();
auto c = count_if(v.begin(), v.end(), [&](long long x) { return x * n > total; });   // 2` },
      { title: 'reduce vs accumulate', html: `<p><code>reduce</code> may add in any order and group freely, so the operation must be associative and commutative. Fine for integer sums; for floating point the result may differ in the last bits. With an execution policy it can run on many cores.</p>`, code: R`vector<double> d(1000, 0.1);
double s1 = accumulate(d.begin(), d.end(), 0.0);   // strict left-to-right
double s2 = reduce(d.begin(), d.end(), 0.0);       // order not guaranteed` }
    ],
    deepDive: `<p><b>Why init decides the type.</b> The signature is <code>template&lt;class It, class T&gt; T accumulate(It first, It last, T init)</code>. <code>T</code> is deduced from <code>init</code> alone, and the loop body is <code>init = std::move(init) + *first;</code>. So <code>0</code> → <code>int</code>, <code>0LL</code> → <code>long long</code>, <code>0.0</code> → <code>double</code>, <code>string()</code> → <code>string</code>. Since C++20 the <code>std::move</code> makes string joining linear-ish instead of quadratic, but your lambda must take <code>acc</code> by value and return it to benefit.</p>
<p><b>Signed overflow is undefined behaviour.</b> The visualizer shows wraparound, but the compiler is allowed to assume it never happens, which can delete your overflow checks. Use <code>-fsanitize=undefined</code> while testing to catch it. Unsigned arithmetic wraps by definition (mod 2<sup>N</sup>).</p>
<p><b>accumulate vs reduce vs transform_reduce.</b> accumulate is strictly sequential (left fold). <code>reduce</code> (C++17) requires associativity/commutativity and allows <code>std::execution::par_unseq</code> for multi-core and SIMD. <code>transform_reduce</code> fuses a map step and a reduce step (e.g. sum of squares) in one pass. For floating-point sums of millions of values, consider <b>Kahan summation</b> or summing in sorted order to reduce rounding error. C++23 adds <code>ranges::fold_left</code>, the ranges-friendly accumulate.</p>
<p><b>partial_sum in place.</b> <code>partial_sum(a.begin(), a.end(), a.begin())</code> is allowed and turns <code>a</code> into its own prefix sums. Its running value has the <i>element type</i> of the input, so prefix sums of a <code>vector&lt;int&gt;</code> can overflow even when written into a <code>vector&lt;long long&gt;</code> — convert the input first or write the loop yourself when sums are big.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants reach for <code>accumulate</code> correctly most of the time, and they are good at turning a loop into a one-liner. The subtle failure is the <b>init literal</b>: generated code very often writes <code>accumulate(v.begin(), v.end(), 0)</code> on data that can exceed 2·10<sup>9</sup>.</p>
<p><b>Use AI as a partner:</b> <code>"Find every place in this file where an integer could overflow, given values up to 1e9 and N up to 2e5"</code>. Ask it to add <code>static_assert</code>s or a <code>-fsanitize=undefined</code> test run. Ask for <code>transform_reduce</code> rewrites when you want a parallel version.</p>
<p><b>Where AI goes wrong:</b> integer division in averages, <code>partial_sum</code> overflow (element type, not output type), and using <code>reduce</code> with a non-associative operation like subtraction. <b>What you must still own:</b> doing the "max possible value" arithmetic from the constraints before typing a single line — that one habit prevents most wrong answers in contests.</p>`,
    problems: [{
      title: 'Pivot Index (left sum equals right sum)', level: 'Easy', tags: ['prefix sum', 'accumulate'], companies: ['Amazon', 'Adobe'],
      statement: `<p>Return the leftmost index <code>i</code> such that the sum of elements strictly left of <code>i</code> equals the sum of elements strictly right of <code>i</code>. Return −1 if none exists.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>4</sup>, −1000 ≤ a[i] ≤ 1000`,
      example: `<p>${H.arr([1, 7, 3, 6, 5, 6], { hl: { 3: 'g' } })} → <b>${H.c('g', '3')}</b>, because left = 1 + 7 + 3 = 11 and right = 5 + 6 = 11.</p>`,
      brute: { why: `<p>For each i, add up the left part and the right part with two loops: O(N²) = 10<sup>8</sup> in the worst case. The waste: the same left and right sums are recomputed from scratch for every i.</p>`, code: R`int pivotBrute(const vector<int>& a) {
    int n = a.size();
    for (int i = 0; i < n; i++) {
        long long L = 0, R = 0;
        for (int j = 0; j < i; j++) L += a[j];
        for (int j = i + 1; j < n; j++) R += a[j];
        if (L == R) return i;
    }
    return -1;
}` },
      mcq: { q: 'You know total = sum of all elements and left = sum before i. What is the right sum?', options: ['total − left', 'total − left − a[i]', 'total − a[i]', 'left − a[i]'], answer: 1, explain: 'Everything except the left part and the pivot itself: total − left − a[i].' },
      hints: [`<p>Hint 1: If you know the total sum, the right sum is not a separate loop — it is what is left over after removing the left part and a[i].</p>`, `<p>Hint 2: Get the total with <code>accumulate(a.begin(), a.end(), 0LL)</code>, then sweep once keeping a running left sum.</p>`, `<p>Hint 3: Check the condition <b>before</b> adding a[i] to the left sum. Index 0 has left = 0; the last index has right = 0. Recipe: total; left = 0; for i: if left == total − left − a[i] return i; left += a[i].</p>`],
      solution: {
        approach: `<p>One accumulate for the total, then one pass. At index i, the right sum is <code>total − left − a[i]</code>. Return the first i where it equals left.</p>`,
        code: R`class Solution {
public:
    int pivotIndex(vector<int>& a) {
        long long total = accumulate(a.begin(), a.end(), 0LL);   // 0LL: long long running total
        long long left = 0;
        for (int i = 0; i < (int)a.size(); i++) {
            if (left == total - left - a[i]) return i;   // right sum computed in O(1)
            left += a[i];
        }
        return -1;
    }
};`,
        dry: { head: ['i', 'a[i]', 'left', 'right = 28 − left − a[i]', 'equal?'], rows: [['0', '1', '0', '27', 'no'], ['1', '7', '1', '20', 'no'], ['2', '3', '8', '17', 'no'], ['3', '6', '11', '11', H.c('g', 'yes → 3')]] },
        complexity: `<p>Time O(N) (two passes), space O(1).</p>`,
        followUps: ['Return all pivot indices.', 'Find the index minimising |left − right| (balance a seesaw).']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — next_permutation / prev_permutation
     ====================================================================== */
  topics.push({
    title: 'next_permutation: Walking Through Every Arrangement in Order',
    analogy: `<p>Think of a <b>car odometer</b>: 0 1 9 → 0 2 0. To get the next reading you look from the <b>right</b> for the first digit that can still go up, bump it by the smallest possible amount, and reset everything to its right to the smallest arrangement. <code>next_permutation</code> does the same with the <i>digits you already have</i> (no new digits allowed): it finds the next arrangement in <b>dictionary order</b>, like going from the word "ACB" to "BAC".</p>`,
    explain: `<p><code>next_permutation(b, e)</code> rearranges the range into the <b>next lexicographically greater</b> permutation and returns <code>true</code>. If the range is already the <b>largest</b> arrangement (sorted descending), it wraps around to the smallest (sorted ascending) and returns <code>false</code>.</p>
${H.table(['before', 'after', 'returns'], [['1 2 3', '1 3 2', 'true'], ['1 3 2', '2 1 3', 'true'], ['2 3 1', '3 1 2', 'true'], ['3 2 1', H.c('m', '1 2 3 (wrapped)'), H.c('r', 'false')]])}
<h4>The standard loop to try every arrangement</h4>
<pre><code>sort(v.begin(), v.end());          // start from the SMALLEST arrangement
do {
    check(v);                      // runs for every permutation exactly once
} while (next_permutation(v.begin(), v.end()));</code></pre>
<p>Use <code>do … while</code>, not <code>while</code>: the sorted arrangement itself must be checked first. And you <b>must sort first</b>; starting from the middle only visits the arrangements after it.</p>
<h4>How it works — 4 steps (interviewers ask you to code this)</h4>
<ol><li><b>Find the pivot:</b> scan from the right for the first index <code>i</code> with <code>a[i] &lt; a[i+1]</code>. Everything right of <code>i</code> is non-increasing — already the largest it can be.</li>
<li>If there is no such <code>i</code>, the whole thing is the last permutation: <b>reverse</b> it and return false.</li>
<li><b>Find the successor:</b> from the right, the first <code>j</code> with <code>a[j] &gt; a[i]</code> — the smallest digit bigger than the pivot in the suffix.</li>
<li><b>Swap</b> <code>a[i]</code> and <code>a[j]</code>, then <b>reverse</b> the suffix after <code>i</code> so it becomes the smallest possible tail.</li></ol>
${H.arr([1, 3, 5, 4, 2], { label: '1 3 5 4 2', ptr: { 1: 'pivot', 3: 'succ' }, hl: { 1: 'y', 3: 'g', 2: 'b', 4: 'b' } })}
<p>Example: pivot is 3 (because 3 &lt; 5), successor is 4, swap → <code>1 4 5 3 2</code>, reverse the tail → <b><code>1 4 2 3 5</code></b>.</p>
<h4>Duplicates are handled for you</h4>
<p>On <code>{1, 1, 2}</code> it visits only the <b>3 distinct</b> arrangements (112, 121, 211), not 3! = 6. In general the count is n! / (c₁! · c₂! · …).</p>
<h4>When is brute force over permutations OK?</h4>
${H.table(['n', 'n!', 'verdict (≈10<sup>8</sup> simple ops/s)'], [['8', '40,320', H.c('g', 'instant')], ['10', '3,628,800', H.c('g', 'fine if each check is O(n)')], ['11', '39,916,800', H.c('y', 'tight')], ['12', '479,001,600', H.c('r', 'too slow — use DP over subsets')]])}
<p><code>prev_permutation</code> is the mirror: previous arrangement, start from descending order.</p>`,
    clues: ['"try all orders / arrangements" with <b>n ≤ 8–10</b> → <code>sort</code> + <code>do { } while (next_permutation)</code>',
      '"next greater number with the same digits" → next_permutation on the digit string',
      '"k-th permutation" with small k → call next_permutation k−1 times; huge k → factorial number system',
      '"all distinct arrangements of a string with repeated letters" → next_permutation skips duplicates automatically',
      '"choose k of n items, enumerate all combinations" → next_permutation on a 0/1 selection mask',
      '"travelling salesman with n ≤ 9 cities" → permute the middle cities, fix the start'],
    code: R`#include <bits/stdc++.h>
using namespace std;

// Hand-written next_permutation: the 4-step algorithm interviewers ask for.
bool myNextPermutation(vector<int>& a) {
    int n = a.size();
    int i = n - 2;
    while (i >= 0 && a[i] >= a[i + 1]) i--;        // 1) pivot: first a[i] < a[i+1] from the right
    if (i < 0) {                                   // 2) none: last permutation
        reverse(a.begin(), a.end());               //    wrap to the first one
        return false;
    }
    int j = n - 1;
    while (a[j] <= a[i]) j--;                      // 3) successor: rightmost a[j] > a[i]
    swap(a[i], a[j]);                              // 4a) bump the pivot a little
    reverse(a.begin() + i + 1, a.end());           // 4b) smallest possible tail
    return true;
}

int main() {
    // Every arrangement of "abc" in dictionary order
    string s = "cab";
    sort(s.begin(), s.end());                      // start from the smallest
    do {
        cout << s << ' ';                          // abc acb bac bca cab cba
    } while (next_permutation(s.begin(), s.end()));
    cout << '\n';

    // Duplicates: only distinct arrangements are produced
    vector<int> d = {1, 1, 2};
    int count = 0;
    do { count++; } while (next_permutation(d.begin(), d.end()));
    cout << count << '\n';                         // 3, not 6

    // Combinations: choose 2 of 4 with a selection mask
    vector<int> items = {10, 20, 30, 40};
    vector<int> mask = {0, 0, 1, 1};               // sorted ascending -> first arrangement
    do {
        for (int k = 0; k < 4; k++) if (mask[k]) cout << items[k] << ' ';
        cout << "| ";
    } while (next_permutation(mask.begin(), mask.end()));   // 6 pairs
    cout << '\n';

    vector<int> t = {1, 3, 5, 4, 2};
    myNextPermutation(t);                          // 1 4 2 3 5
    for (int x : t) cout << x << ' ';
}`,
    codeTitle: 'Library loop, duplicates, combinations, and the hand-written algorithm',
    viz: {
      title: 'next_permutation step by step (pivot, successor, swap, reverse)',
      input: '1 2 3',
      inputLabel: 'Starting arrangement (2 to 6 numbers)',
      gen: function (input) {
        var a = intsOf(input, 2, 6, 'Enter 2 to 6 integers separated by spaces');
        var frames = [], list = [a.join(' ')], calls = 0;
        frames.push({ narr: 'Start: <b>' + a.join(' ') + '</b>. Each call to <code>next_permutation</code> makes the next arrangement in dictionary order. (Start from sorted order to visit all of them.)', parts: [
          { type: 'array', label: 'a', values: copy(a), showIdx: true },
          { type: 'set', label: 'Arrangements seen', items: list.slice() }] });
        while (calls < 8) {
          calls++;
          var n = a.length, i = n - 2;
          while (i >= 0 && a[i] >= a[i + 1]) i--;
          var tailHl = {}; for (var k = i + 1; k < n; k++) tailHl[k] = 'win';
          if (i < 0) {
            frames.push({ narr: 'Call #' + calls + ': scanning from the right, every neighbour pair goes down — the whole array is <b>non-increasing</b>. This is the <b>last</b> arrangement, so there is no pivot.', parts: [
              { type: 'array', label: 'a', values: copy(a), hl: tailHl, showIdx: true },
              { type: 'vars', label: 'Step 1', vals: { pivot: 'none' }, hl: { pivot: 'bad' } }] });
            a.reverse();
            frames.push({ narr: 'No pivot → reverse everything and <b>return false</b>. The array is back to the smallest arrangement <b>' + a.join(' ') + '</b>, which is why the <code>do … while</code> loop stops exactly here.', parts: [
              { type: 'array', label: 'a (wrapped around)', values: copy(a), hl: (function () { var h = {}; for (var z = 0; z < n; z++) h[z] = 'done'; return h; })(), showIdx: true },
              { type: 'vars', label: 'Result', vals: { returns: 'false', 'total arrangements': list.length }, hl: { returns: 'bad' } },
              { type: 'set', label: 'Arrangements seen', items: list.slice() }] });
            return frames;
          }
          var h1 = Object.assign({}, tailHl); h1[i] = 'cur';
          frames.push({ narr: 'Call #' + calls + ' — <b>Step 1, pivot:</b> from the right, the first place where a number is smaller than its right neighbour is index ' + i + ' (<b>' + a[i] + '</b> &lt; ' + a[i + 1] + '). The blue tail is non-increasing: it is already as big as it can get, so the change must happen at the pivot.', parts: [
            { type: 'array', label: 'a', values: copy(a), hl: h1, ptr: one(i, 'pivot'), showIdx: true },
            { type: 'vars', label: 'Step 1', vals: { i: i, 'a[i]': a[i] }, hl: { i: 'cur' } }] });
          var j = n - 1;
          while (a[j] <= a[i]) j--;
          var h2 = Object.assign({}, tailHl); h2[i] = 'cur'; h2[j] = 'ok';
          var p2 = {}; p2[i] = 'pivot'; p2[j] = 'succ';
          frames.push({ narr: '<b>Step 2, successor:</b> from the right, the first number bigger than ' + a[i] + ' is <b>' + a[j] + '</b> at index ' + j + '. It is the <b>smallest</b> number in the tail that is still bigger than the pivot, so swapping it in grows the arrangement by the least possible amount.', parts: [
            { type: 'array', label: 'a', values: copy(a), hl: h2, ptr: p2, showIdx: true },
            { type: 'vars', label: 'Step 2', vals: { i: i, j: j, 'a[j]': a[j] }, hl: { j: 'ok' } }] });
          var t = a[i]; a[i] = a[j]; a[j] = t;
          var h3 = Object.assign({}, tailHl); h3[i] = 'ok'; h3[j] = 'cur';
          frames.push({ narr: '<b>Step 3, swap:</b> now index ' + i + ' holds ' + a[i] + '. The tail after the pivot is still in non-increasing order (' + a.slice(i + 1).join(' ') + ').', parts: [
            { type: 'array', label: 'a', values: copy(a), hl: h3, ptr: p2, showIdx: true }] });
          var lo = i + 1, hi = n - 1;
          while (lo < hi) { var u = a[lo]; a[lo] = a[hi]; a[hi] = u; lo++; hi--; }
          list.push(a.join(' '));
          var h4 = {}; h4[i] = 'ok'; for (k = i + 1; k < n; k++) h4[k] = 'sel';
          var sh = {}; sh[a.join(' ')] = 'ok';
          frames.push({ narr: '<b>Step 4, reverse the tail:</b> a non-increasing tail reversed becomes non-decreasing — the <b>smallest</b> possible tail. Result: <b>' + a.join(' ') + '</b>, returns <code>true</code>.', parts: [
            { type: 'array', label: 'a', values: copy(a), hl: h4, showIdx: true },
            { type: 'vars', label: 'Result', vals: { returns: 'true', 'call #': calls }, hl: { returns: 'ok' } },
            { type: 'set', label: 'Arrangements seen', items: list.slice(), hl: sh }] });
        }
        frames.push({ narr: 'Stopping the demo after 8 calls to keep it short. The loop would keep going until the array is non-increasing and the call returns false.', parts: [
          { type: 'set', label: 'Arrangements seen', items: list.slice() }] });
        return frames;
      }
    },
    examples: [
      { title: 'Next arrangement of 1 3 5 4 2', html: `<p>Pivot: from the right, 4 &gt; 2, 5 &gt; 4, but 3 &lt; 5 → pivot is <b>3</b> (index 1). Successor: rightmost value &gt; 3 is <b>4</b>. Swap → 1 4 5 3 2. Reverse tail [5 3 2] → [2 3 5]. Answer <b>1 4 2 3 5</b>.</p>`, code: R`vector<int> v = {1, 3, 5, 4, 2};
next_permutation(v.begin(), v.end());   // v = 1 4 2 3 5` },
      { title: 'Brute-force TSP for tiny n', html: `<p>Fix city 0 as the start, permute the rest, add up the tour cost. (n−1)! tours: with n = 9 that is 40,320 tours — instant. This is the honest baseline before learning bitmask DP.</p>`, code: R`vector<vector<int>> d = {{0, 10, 15, 20}, {10, 0, 35, 25}, {15, 35, 0, 30}, {20, 25, 30, 0}};
int n = d.size();
vector<int> order;
for (int i = 1; i < n; i++) order.push_back(i);
long long best = LLONG_MAX;
do {
    long long cost = d[0][order[0]];
    for (int k = 0; k + 1 < (int)order.size(); k++) cost += d[order[k]][order[k + 1]];
    cost += d[order.back()][0];
    best = min(best, cost);
} while (next_permutation(order.begin(), order.end()));
cout << best << '\n';   // 80` },
      { title: 'Forgetting to sort first', html: `<p>Starting from <code>{2, 1, 3}</code> without sorting, the loop prints 213, 231, 312, 321 and stops — it <b>misses</b> 123 and 132. Always sort (or build the smallest arrangement) before the loop.</p>`, code: R`vector<int> v = {2, 1, 3};
int seen = 0;
do { seen++; } while (next_permutation(v.begin(), v.end()));
cout << seen << '\n';   // 4, not 6` },
      { title: 'prev_permutation for descending enumeration', html: `<p>Need the arrangements from largest to smallest (e.g. "largest valid number")? Sort descending and use <code>prev_permutation</code>. The first valid one you meet is the answer, so you can stop early.</p>`, code: R`string s = "321";
do { cout << s << ' '; } while (prev_permutation(s.begin(), s.end()));
// 321 312 231 213 132 123` }
    ],
    deepDive: `<p><b>Cost per call.</b> The worst case is O(n) (scan plus reverse), but averaged over all n! calls it is <b>O(1)</b>: the pivot is at the last pair half the time, the second-to-last pair a third of the time, and so on — the average work converges to a small constant (about e ≈ 2.7 element moves). So enumerating all permutations costs O(n!) for generation plus whatever your check costs.</p>
<p><b>Requirements.</b> Only <b>bidirectional</b> iterators are needed (scan from the back, reverse), so it works on <code>std::list</code> too. It uses <code>operator&lt;</code> or your comparator, and with a comparator the "sorted" starting order must be sorted with the <b>same</b> comparator. Since C++20 it is <code>constexpr</code>, and <code>ranges::next_permutation</code> returns a struct <code>{in, found}</code> rather than a bare bool.</p>
<p><b>Why duplicates work.</b> The pivot test uses strict <code>&lt;</code> and the successor test strict <code>&gt;</code>; equal values are never swapped with each other, so each multiset arrangement appears exactly once. Writing your own with <code>&lt;=</code> instead of <code>&lt;</code> creates an infinite loop or skips arrangements — a common interview mistake.</p>
<p><b>Skipping ahead.</b> To jump straight to the k-th permutation (k up to 10<sup>18</sup>), use the <b>factorial number system</b> (Lehmer code): the first element is the ⌊k / (n−1)!⌋-th smallest remaining value, and so on. The reverse — the <b>rank</b> of a permutation — is a Fenwick tree away (O(n log n)). Heap's algorithm generates all permutations with one swap each but <b>not</b> in lexicographic order; use it when order does not matter and every swap is expensive.</p>`,
    aiEra: `<p><b>What AI changes:</b> the 4-step algorithm is well known and assistants reproduce it reliably. Generating brute-force permutation checkers is now a 10-second job, which makes <b>stress testing</b> (brute vs optimised on random small inputs) the cheapest correctness tool you have.</p>
<p><b>Use AI as a partner:</b> <code>"Write a stress test: for random arrays of size ≤ 7 with repeated values, compare my next permutation function against std::next_permutation"</code>. Ask it to estimate n! against the time limit before you commit to a brute force.</p>
<p><b>Where AI goes wrong:</b> forgetting to sort before the loop, using <code>while</code> instead of <code>do … while</code> (skips the first arrangement), using <code>&lt;=</code> in the pivot test, and suggesting permutations when n is 15. <b>What you must still own:</b> the n! feasibility table in your head and a clean derivation of why the tail is reversed.</p>`,
    problems: [{
      title: 'Next Greater Number With the Same Digits', level: 'Medium', tags: ['next_permutation', 'math', 'string'], companies: ['Google', 'Bloomberg', 'Microsoft'],
      statement: `<p>Given a positive 32-bit integer <code>n</code>, return the smallest integer that has <b>exactly the same digits</b> and is <b>greater</b> than n. If no such number exists or it does not fit in a 32-bit signed integer, return −1.</p>`,
      constraints: `1 ≤ n ≤ 2<sup>31</sup> − 1`,
      example: `<p><code>n = 12443322</code> → ${H.c('g', '13222344')}. Pivot is the 2 at index 1 (2 &lt; 4); successor is the rightmost digit &gt; 2, which is a 3; swap → 13442322; reverse the tail → 13222344.</p><p><code>n = 21</code> → ${H.c('r', '−1')} (already the largest arrangement).</p>`,
      brute: { why: `<p>Count upward from n+1 and test whether each number has the same multiset of digits. The gap can be huge (e.g. 1999999999 → next is far away, or none at all), so this can take ~2·10<sup>9</sup> iterations.</p>`, code: R`int nextGreaterBrute(int n) {
    string key = to_string(n);
    sort(key.begin(), key.end());
    for (long long x = (long long)n + 1; x <= INT_MAX; x++) {
        string s = to_string(x);
        sort(s.begin(), s.end());
        if (s == key) return (int)x;
    }
    return -1;
}` },
      mcq: { q: 'next_permutation on the digit string returns false. What does that mean?', options: ['The digits were in non-increasing order, so no bigger arrangement exists → −1', 'The number overflowed', 'The answer is the same number', 'You must call it again'], answer: 0, explain: 'It returns false exactly when the input was the last (largest) arrangement; it then rewrites it to the smallest one, which is NOT the answer.' },
      hints: [`<p>Hint 1: "Same digits, smallest bigger" is the definition of the next permutation of the digit string.</p>`, `<p>Hint 2: <code>to_string</code>, call <code>next_permutation</code>; if it returns false answer −1.</p>`, `<p>Hint 3: The new number can exceed INT_MAX (e.g. 2147483486 → 2147483648). Parse with <code>stoll</code> and compare with <code>INT_MAX</code>.</p>`],
      solution: {
        approach: `<p>Convert to a digit string, call <code>next_permutation</code>. If it reports there is no next arrangement, return −1. Otherwise parse as <code>long long</code> and return −1 if it exceeds <code>INT_MAX</code>.</p>`,
        code: R`class Solution {
public:
    int nextGreaterElement(int n) {
        string s = to_string(n);
        if (!next_permutation(s.begin(), s.end())) return -1;   // already the largest
        long long v = stoll(s);                                  // may not fit in int
        return v > INT_MAX ? -1 : (int)v;
    }
};`,
        dry: { head: ['step', 'digits', 'note'], rows: [['start', '1 2 4 4 3 3 2 2', 'scan from right'], ['pivot', '1 [2] 4 4 3 3 2 2', '2 &lt; 4 at index 1'], ['successor', '1 2 4 4 3 [3] 2 2', 'rightmost digit &gt; 2'], ['swap', '1 3 4 4 3 2 2 2', ''], ['reverse tail', '1 3 2 2 2 3 4 4', H.c('g', '13222344 ≤ INT_MAX → answer')]] },
        complexity: `<p>Time O(d) where d ≤ 10 digits, space O(d).</p>`,
        followUps: ['Return the <b>previous</b> smaller number with the same digits (prev_permutation, no leading zero).', 'Do it without strings, using only arithmetic on the digits.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — remove / unique + erase idiom
     ====================================================================== */
  topics.push({
    title: 'The Erase–Remove and Unique–Erase Idioms',
    analogy: `<p>A <b>bookshelf</b> with some damaged books. A helper (the algorithm) is allowed to <b>slide books along the shelf</b>, but has no power to throw anything away or make the shelf shorter. So the helper slides all the good books to the left and says: <i>"Good books end <b>here</b>. Whatever is to the right of my finger is junk — you deal with it."</i> You, the owner of the shelf (the container), then actually throw the junk out with <code>erase</code>. <code>remove</code> and <code>unique</code> are the helper; <code>erase</code> is you.</p>`,
    explain: `<p>STL algorithms only get <b>iterators</b>, not the container. An iterator can read and write elements but cannot change the container's size. So "removing" algorithms cannot really remove. They:</p>
<ol><li>move the elements you want to <b>keep</b> to the front, in their original order;</li>
<li>return an iterator to the <b>new logical end</b>;</li>
<li>leave the tail after that iterator holding <b>leftover values</b> (valid but unspecified).</li></ol>
<p>Then you call the container's <code>erase</code> to chop the tail off. Hence the idioms:</p>
<pre><code>v.erase(remove(v.begin(), v.end(), x), v.end());                 // delete every x
v.erase(remove_if(v.begin(), v.end(), isBad), v.end());           // delete by condition
sort(v.begin(), v.end());
v.erase(unique(v.begin(), v.end()), v.end());                     // dedupe</code></pre>
<h4>unique only removes ADJACENT duplicates</h4>
${H.table(['input', 'after unique + erase', 'why'], [['1 1 2 2 2 3', H.c('g', '1 2 3'), 'all copies were neighbours'], ['1 2 1 2', H.c('r', '1 2 1 2'), 'no two equal values are adjacent'], ['sort first → 1 1 2 2', H.c('g', '1 2'), 'sorting makes equal values neighbours']])}
<p>So "remove all duplicates" = <b>sort, then unique, then erase</b>. If you must keep the original order, use a <code>set</code>/<code>unordered_set</code> of "seen" values instead.</p>
<h4>The classic puzzle</h4>
<pre><code>vector&lt;int&gt; v = {1, 2, 3, 2};
remove(v.begin(), v.end(), 2);      // forgot erase!
cout &lt;&lt; v.size();                   // still 4, v is typically {1, 3, 3, 2}</code></pre>
${H.arr([1, 3, 3, 2], { label: 'v after remove (no erase)', hl: { 0: 'g', 1: 'g', 2: 'r', 3: 'r' }, ptr: { 2: 'returned' } })}
<p>The green part is the real answer; the red tail is junk that is still inside the vector.</p>
<h4>C++20 makes it one call</h4>
<p><code>std::erase(v, x)</code> and <code>std::erase_if(v, pred)</code> do remove + erase for you and return how many were removed. They work on vector, deque, string, list, and (erase_if) on map, set, unordered_map… For <code>list</code>, the members <code>L.remove(x)</code>, <code>L.remove_if(p)</code> and <code>L.unique()</code> relink nodes instead of moving values. On a <code>set</code> or <code>map</code> you can <b>not</b> use <code>std::remove</code> at all (keys are const) — use <code>erase_if</code> or the erase-while-iterating loop.</p>`,
    clues: ['"remove all occurrences of val in place" → erase–remove idiom, or <code>std::erase(v, val)</code>',
      '"number of distinct values" / "dedupe" → <code>sort</code> + <code>unique</code> + <code>erase</code>, then <code>v.size()</code>',
      '"coordinate compression" → sort + unique + erase, then <code>lower_bound</code> for each value\'s rank',
      '"remove duplicates from sorted array, return k" → that is literally <code>unique</code>',
      'Code review: <code>remove(...)</code> on its own line with the result ignored → bug, size never changes (compilers warn: <code>[[nodiscard]]</code>)',
      '"delete while iterating" → <code>it = v.erase(it)</code> or better <code>erase_if</code>'],
    code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    // 1) Erase-remove: delete every 3
    vector<int> v = {3, 1, 3, 4, 3, 5};
    auto newEnd = remove(v.begin(), v.end(), 3);   // keeps 1 4 5 at the front
    cout << "logical size " << (newEnd - v.begin()) << ", real size " << v.size() << '\n';   // 3, 6
    v.erase(newEnd, v.end());                      // now v = 1 4 5, size 3

    // 2) remove_if with a lambda: drop negatives
    vector<int> w = {5, -2, 7, -9, 0};
    w.erase(remove_if(w.begin(), w.end(), [](int x) { return x < 0; }), w.end());   // 5 7 0

    // 3) Sort + unique + erase: distinct values
    vector<int> d = {4, 1, 4, 2, 1, 4};
    sort(d.begin(), d.end());                      // 1 1 2 4 4 4
    d.erase(unique(d.begin(), d.end()), d.end());  // 1 2 4
    cout << "distinct = " << d.size() << '\n';     // 3

    // 4) C++20 one-liners (return how many were erased)
    vector<int> e = {1, 2, 2, 3, 2};
    auto removed = std::erase(e, 2);               // e = 1 3, removed = 3
    string s = "a b  c";
    std::erase(s, ' ');                            // "abc"
    map<string, int> stock = {{"pen", 0}, {"cup", 4}, {"ink", 0}};
    std::erase_if(stock, [](const auto& kv) { return kv.second == 0; });   // only cup left

    // 5) Erasing while iterating (pre-C++20 style) - never ++it after erase
    vector<int> f = {1, 2, 3, 4, 5, 6};
    for (auto it = f.begin(); it != f.end(); ) {
        if (*it % 2 == 0) it = f.erase(it);       // erase returns the next valid iterator
        else ++it;
    }                                              // 1 3 5 (but O(N^2) worst case!)

    // 6) unique with a custom "equal" rule: collapse runs of spaces
    string t = "too   many    spaces";
    t.erase(unique(t.begin(), t.end(), [](char a, char b) { return a == ' ' && b == ' '; }), t.end());
    cout << t << ' ' << removed << '\n';           // "too many spaces 3"
}`,
    codeTitle: 'remove, remove_if, unique, std::erase / erase_if and the safe erase loop',
    viz: [{
      title: 'unique + erase, one step at a time',
      input: '1 1 2 2 2 3 1 1',
      inputLabel: 'Numbers (2 to 14)',
      gen: function (input) {
        var a = intsOf(input, 2, 14, 'Enter 2 to 14 integers separated by spaces');
        var n = a.length, frames = [], w = 0;
        var code = 'auto it = unique(v.begin(), v.end());\nv.erase(it, v.end());';
        frames.push({ narr: '<code>unique</code> uses two fingers: <b>w</b> marks the last value we decided to keep, <b>r</b> reads ahead. Index 0 is always kept.', parts: [
          { type: 'array', label: 'v', values: copy(a), hl: one(0, 'ok'), ptr: one(0, 'w'), showIdx: true },
          { type: 'code', label: 'Idiom', lang: 'cpp', code: code, hl: { 1: 'cur' } }] });
        for (var r = 1; r < n; r++) {
          var same = a[r] === a[w];
          var hl = {}; for (var k = 0; k <= w; k++) hl[k] = 'win';
          hl[r] = same ? 'bad' : 'ok';
          var p = {}; if (r === w) p[r] = ['w', 'r']; else { p[w] = 'w'; p[r] = 'r'; }
          if (!same) {
            w++;
            var before = a[w];
            a[w] = a[r];
            var hl2 = {}; for (k = 0; k < w; k++) hl2[k] = 'win'; hl2[w] = 'ok';
            if (r !== w) hl2[r] = 'cur';
            var p2 = {}; if (r === w) p2[r] = ['w', 'r']; else { p2[w] = 'w'; p2[r] = 'r'; }
            frames.push({ narr: 'r = ' + r + ': a[r] = <b>' + a[r] + '</b> differs from the last kept value <b>' + a[w - 1] + '</b> → keep it: <code>++w</code>, copy into a[' + w + ']' + (r !== w ? ' (overwriting the old ' + before + ')' : ' (already in place)') + '.', parts: [
              { type: 'array', label: 'v', values: copy(a), hl: hl2, ptr: p2, showIdx: true },
              { type: 'code', label: 'Idiom', lang: 'cpp', code: code, hl: { 1: 'cur' } }] });
          } else {
            frames.push({ narr: 'r = ' + r + ': a[r] = <b>' + a[r] + '</b> equals the last kept value → it is a <span class="c-r">neighbouring duplicate</span>, skip it.', parts: [
              { type: 'array', label: 'v', values: copy(a), hl: hl, ptr: p, showIdx: true },
              { type: 'code', label: 'Idiom', lang: 'cpp', code: code, hl: { 1: 'cur' } }] });
          }
        }
        var keep = w + 1, th = {};
        for (k = 0; k < n; k++) th[k] = k < keep ? 'ok' : 'bad';
        frames.push({ narr: '<code>unique</code> returns <code>v.begin() + ' + keep + '</code>. The vector <b>still has ' + n + ' elements</b>: green is the result, red is leftover junk. Forgetting the next line is the classic bug.', parts: [
          { type: 'array', label: 'v after unique (size still ' + n + ')', values: copy(a), hl: th, ptr: one(keep < n ? keep : n - 1, keep < n ? 'it' : 'it-1'), showIdx: true },
          { type: 'vars', label: 'Sizes', vals: { 'it - v.begin()': keep, 'v.size()': n }, hl: { 'v.size()': 'bad' } },
          { type: 'code', label: 'Idiom', lang: 'cpp', code: code, hl: { 1: 'ok', 2: 'cur' } }] });
        var res = a.slice(0, keep);
        frames.push({ narr: '<code>v.erase(it, v.end())</code> is the container itself cutting off the tail. Now size = <b>' + keep + '</b>.', parts: [
          { type: 'array', label: 'v after erase', values: res, hl: (function () { var h = {}; res.forEach(function (_, z) { h[z] = 'ok'; }); return h; })(), showIdx: true },
          { type: 'code', label: 'Idiom', lang: 'cpp', code: code, hl: { 2: 'ok' } }] });
        var dup = res.filter(function (x, z) { return res.indexOf(x) !== z; });
        if (dup.length) {
          var dh = {}; res.forEach(function (x, z) { if (dup.indexOf(x) >= 0) dh[z] = 'bad'; });
          var sorted = res.slice().sort(function (x, y) { return x - y; }).filter(function (x, z, arr) { return z === 0 || arr[z - 1] !== x; });
          frames.push({ narr: '<span class="c-r">Duplicates survived</span> (' + dup.join(', ') + ') because they were not <b>neighbours</b>. unique only compares each value with the previous kept one. Fix: <code>sort</code> first → result would be <b>' + sorted.join(' ') + '</b>.', parts: [
            { type: 'array', label: 'without sort', values: res, hl: dh, showIdx: true },
            { type: 'array', label: 'with sort + unique + erase', values: sorted, hl: (function () { var h = {}; sorted.forEach(function (_, z) { h[z] = 'ok'; }); return h; })(), showIdx: true }] });
        } else {
          frames.push({ narr: 'All copies were neighbours, so every duplicate is gone. With unsorted input that is luck — sort first when you want "distinct values".', parts: [
            { type: 'array', label: 'result', values: res, showIdx: true }] });
        }
        return frames;
      }
    }, {
      title: 'remove(v, x) slides keepers left and leaves a junk tail',
      input: '3 | 3 1 3 4 3 5',
      inputLabel: 'value to remove | numbers',
      gen: function (input) {
        var hint = 'Format: value | numbers, e.g. "3 | 3 1 3 4 3 5" (2 to 14 numbers)';
        var sp = splitBar(input, hint), x = intsOf(sp[0], 1, 1, hint)[0], a = intsOf(sp[1], 2, 14, hint);
        var n = a.length, w = 0, frames = [];
        var code = 'auto it = remove(v.begin(), v.end(), ' + x + ');\nv.erase(it, v.end());';
        frames.push({ narr: 'Remove every <b>' + x + '</b>. Finger <b>w</b> = where the next keeper goes, finger <b>r</b> = the element being read.', parts: [
          { type: 'array', label: 'v', values: copy(a), ptr: one(0, ['w', 'r']), showIdx: true },
          { type: 'code', label: 'Idiom', lang: 'cpp', code: code, hl: { 1: 'cur' } }] });
        for (var r = 0; r < n; r++) {
          var p = {}; if (r === w) p[r] = ['w', 'r']; else { p[w] = 'w'; p[r] = 'r'; }
          var hl = {}; for (var k = 0; k < w; k++) hl[k] = 'win';
          if (a[r] === x) {
            hl[r] = 'bad';
            frames.push({ narr: 'r = ' + r + ': value ' + x + ' → <span class="c-r">skip</span>. w stays at ' + w + '.', parts: [
              { type: 'array', label: 'v', values: copy(a), hl: hl, ptr: p, showIdx: true }] });
          } else {
            var old = a[w];
            a[w] = a[r];
            hl[w] = 'ok';
            frames.push({ narr: 'r = ' + r + ': ' + a[r] + ' is a keeper → move it to a[' + w + ']' + (w !== r ? ' (overwrites ' + old + ')' : ' (already there)') + ', then <code>++w</code>.', parts: [
              { type: 'array', label: 'v', values: copy(a), hl: hl, ptr: p, showIdx: true }] });
            w++;
          }
        }
        var th = {}; for (var z = 0; z < n; z++) th[z] = z < w ? 'ok' : 'bad';
        frames.push({ narr: '<code>remove</code> returns <code>begin() + ' + w + '</code>. Size is still ' + n + '; the red tail holds leftovers (in real C++ they may be moved-from values). Now erase it.', parts: [
          { type: 'array', label: 'after remove', values: copy(a), hl: th, ptr: one(Math.min(w, n - 1), w < n ? 'it' : 'it-1'), showIdx: true },
          { type: 'vars', label: 'Sizes', vals: { kept: w, 'v.size()': n }, hl: { 'v.size()': 'bad' } }] });
        frames.push({ narr: 'After <code>v.erase(it, v.end())</code>: <b>' + (a.slice(0, w).join(' ') || '(empty)') + '</b>. In C++20 the whole thing is just <code>std::erase(v, ' + x + ');</code>', parts: [
          { type: 'array', label: 'final v', values: a.slice(0, w).length ? a.slice(0, w) : ['∅'], showIdx: true },
          { type: 'code', label: 'Idiom', lang: 'cpp', code: code, hl: { 2: 'ok' } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Puzzle: what does this print?', html: `<p><code>v = {1, 2, 1, 2}</code>, then <code>v.erase(unique(v.begin(), v.end()), v.end());</code> and print <code>v.size()</code>. Answer: <b>4</b>. No two equal values are adjacent, so unique keeps everything. The intended "distinct count" of 2 needs a sort first.</p>`, code: R`vector<int> v = {1, 2, 1, 2};
v.erase(unique(v.begin(), v.end()), v.end());
cout << v.size() << '\n';             // 4
sort(v.begin(), v.end());
v.erase(unique(v.begin(), v.end()), v.end());
cout << v.size() << '\n';             // 2` },
      { title: 'Puzzle: the erase-in-a-loop crash', html: `<p><code>for (auto it = v.begin(); it != v.end(); ++it) if (*it == 0) v.erase(it);</code> is undefined behaviour: after <code>erase(it)</code>, <code>it</code> is invalid and <code>++it</code> uses it; also two zeros in a row means the second is skipped. Use <code>it = v.erase(it)</code> without <code>++</code>, or simply <code>std::erase(v, 0)</code> — which is also O(N) instead of O(N²).</p>`, code: R`vector<int> v = {0, 0, 5, 0, 7};
std::erase(v, 0);                     // v = 5 7, one linear pass` },
      { title: 'Distinct-preserving-order (no sort allowed)', html: `<p>"Remove duplicates but keep the first occurrence in original order": unique cannot help without sorting. Use remove_if with a lambda that remembers what it has seen. The lambda holds state by reference, which is safe here because remove_if visits each element exactly once, in order.</p>`, code: R`vector<int> v = {4, 1, 4, 2, 1};
unordered_set<int> seen;
v.erase(remove_if(v.begin(), v.end(), [&](int x) { return !seen.insert(x).second; }), v.end());
// v = 4 1 2` },
      { title: 'Count distinct with sort + unique (no erase needed)', html: `<p>If you only need the <b>count</b>, the iterator returned by unique already tells you: <code>unique(...) - v.begin()</code>. Erasing is only needed if you keep using the vector.</p>`, code: R`vector<int> a = {5, 3, 5, 1, 3};
sort(a.begin(), a.end());
int distinctCount = unique(a.begin(), a.end()) - a.begin();   // 3` }
    ],
    deepDive: `<p><b>Why algorithms cannot erase.</b> The STL separates <i>containers</i> (own memory) from <i>algorithms</i> (operate on iterator ranges). That separation is what lets one <code>remove</code> work on vectors, arrays, deques and raw C arrays — a raw array cannot shrink at all. The price is the two-step idiom.</p>
<p><b>Complexity.</b> remove / remove_if / unique are a single pass: exactly N predicate calls and at most N move-assignments, O(1) extra memory. The erase of the tail is O(tail) destructor calls for a vector. Compare with calling <code>v.erase(it)</code> once per bad element: each call shifts everything behind it, so k erasures cost O(k·N) — quadratic for "remove all zeros" on a big vector.</p>
<p><b>State of the tail.</b> Since C++11 the elements are <b>moved</b>, so for <code>vector&lt;string&gt;</code> the tail may contain empty strings (moved-from). Never read them. For ints the old values just stay, which is why puzzles "print" them.</p>
<p><b>[[nodiscard]].</b> In C++20 <code>remove</code>, <code>remove_if</code> and <code>unique</code> are marked <code>[[nodiscard]]</code> in libstdc++/libc++, so ignoring the result gives a warning — turn on <code>-Wall</code>. <b>Ranges version:</b> <code>ranges::unique(v)</code> returns a <i>subrange</i> of the junk tail: <code>auto [first, last] = ranges::unique(v); v.erase(first, last);</code>.</p>
<p><b>Stability.</b> remove, remove_if and unique keep the relative order of kept elements. If order does not matter, <code>partition</code> or "swap with last and pop_back" can be cheaper for big objects because each removal is one swap.</p>`,
    aiEra: `<p><b>What AI changes:</b> modern assistants usually produce <code>std::erase_if</code> or the full idiom correctly. Where they still slip is in <b>older or translated code</b> (from Python/Java), e.g. "<code>v.remove(x)</code>" thinking or deleting in a loop with <code>++it</code>.</p>
<p><b>Use AI as a partner:</b> <code>"Find every place in this file where elements are erased while iterating, and rewrite with erase_if; explain the complexity change"</code>. Ask it for adversarial inputs: all duplicates, no duplicates, alternating values, empty vector.</p>
<p><b>Where AI goes wrong:</b> dropping the <code>sort</code> before <code>unique</code>, calling <code>std::remove</code> on a <code>set</code>, and reading the moved-from tail. <b>What you must still own:</b> the "algorithms move, containers erase" mental model — it explains every one of these puzzles and is a favourite C++ interview question.</p>`,
    problems: [{
      title: 'Distinct Values in Sorted Order', level: 'Easy', tags: ['sort', 'unique', 'erase-remove'], companies: ['CSES', 'TCS', 'Infosys'],
      statement: `<p>Read N integers. Print how many <b>distinct</b> values there are on the first line, and the distinct values in increasing order on the second line.</p>`,
      constraints: `1 ≤ N ≤ 2·10<sup>5</sup>, 1 ≤ a[i] ≤ 10<sup>9</sup>`,
      example: `<p>Input <code>5 / 2 3 2 2 3</code> → output <code>2</code> then <code>2 3</code>.</p><p>After sorting: ${H.arr([2, 2, 2, 3, 3], { hl: { 0: 'g', 3: 'g' } })} — the green cells are the first of each run, exactly what unique keeps.</p>`,
      brute: { why: `<p>For every element, scan the result list to see if it is already there: O(N²) = 4·10<sup>10</sup> for N = 2·10<sup>5</sup>. The waste: comparing against values that are clearly different; sorting puts equal values side by side so one comparison with the neighbour is enough.</p>`, code: R`vector<int> distinctBrute(const vector<int>& a) {
    vector<int> res;
    for (int x : a) {
        bool found = false;
        for (int y : res) if (y == x) { found = true; break; }
        if (!found) res.push_back(x);
    }
    sort(res.begin(), res.end());
    return res;
}` },
      mcq: { q: 'You call unique (without erase) on the sorted vector {2, 2, 2, 3, 3}. What is v.size() afterwards?', options: ['5', '2', '3', 'It does not compile'], answer: 0, explain: 'unique never changes the size; it returns an iterator to the new logical end (begin + 2). Only erase shrinks the vector.' },
      hints: [`<p>Hint 1: Once the array is sorted, a value is "new" exactly when it differs from its left neighbour.</p>`, `<p>Hint 2: <code>sort</code>, then <code>v.erase(unique(v.begin(), v.end()), v.end())</code>. The size is the distinct count.</p>`, `<p>Hint 3: Use fast I/O for 2·10<sup>5</sup> numbers. Edge case: N = 1 → count 1. Recipe: read, sort, unique + erase, print size, print values.</p>`],
      solution: {
        approach: `<p>Sort so equal values are adjacent, collapse each run with <code>unique</code>, cut the junk tail with <code>erase</code>. The vector now holds exactly the distinct values in increasing order.</p>`,
        code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<int> a(n);
    for (auto& x : a) cin >> x;
    sort(a.begin(), a.end());                         // equal values become neighbours
    a.erase(unique(a.begin(), a.end()), a.end());     // keep the first of each run
    cout << a.size() << '\n';
    for (int i = 0; i < (int)a.size(); i++) cout << a[i] << (i + 1 < (int)a.size() ? ' ' : '\n');
}`,
        dry: { head: ['step', 'vector', 'size'], rows: [['read', '2 3 2 2 3', '5'], ['sort', '2 2 2 3 3', '5'], ['unique', H.c('g', '2 3') + ' ' + H.c('r', '2 3 3'), '5 (returns begin+2)'], ['erase', H.c('g', '2 3'), '2']] },
        complexity: `<p>O(N log N) for the sort, O(N) for unique + erase. Extra space O(1) beyond the input.</p>`,
        followUps: ['Values up to 10<sup>6</sup>: a counting array gives O(N + MAX).', 'Keep first occurrences in input order (use a seen-set with remove_if).']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — Lambdas in algorithms
     ====================================================================== */
  topics.push({
    title: 'Lambdas in Algorithms: count_if, find_if, transform & Captures',
    analogy: `<p>An STL algorithm is a <b>delivery driver</b> who knows the route (visit every house in order) but not the job. A <b>lambda</b> is the <b>sticky note</b> you hand them: <i>"At each house, ring only if the number is bigger than 3."</i> The <b>capture list</b> is what you clip to the note before they leave: a <b>photocopy</b> of a document (capture by value — later changes at home do not reach them) or <b>the key to your house</b> (capture by reference — they can read and change your real things, but the house must still exist when they use the key).</p>`,
    explain: `<p>A <b>lambda</b> is a small unnamed function you write right where you need it:</p>
<pre><code>[capture](parameters) { body }
[](int x) { return x % 2 == 0; }          // "is x even?"</code></pre>
<p>Algorithms that take a lambda (a <b>predicate</b> returns bool, an <b>operation</b> returns a value):</p>
${H.table(['algorithm', 'question it answers', 'returns'], [['<code>count_if(b, e, p)</code>', 'how many satisfy p?', 'a count'], ['<code>find_if(b, e, p)</code>', 'where is the first one satisfying p?', 'iterator (or end)'], ['<code>all_of / any_of / none_of</code>', 'do all / any / none satisfy p?', 'bool'], ['<code>transform(b, e, out, f)</code>', 'apply f to each, write results', 'output iterator'], ['<code>for_each(b, e, f)</code>', 'do something to each', 'the function object'], ['<code>remove_if</code>, <code>partition</code>, <code>sort</code>, <code>max_element</code>', 'remove / split / order / pick by your rule', 'iterator']])}
<h4>Captures: how a lambda sees outside variables</h4>
${H.table(['capture', 'meaning', 'use when'], [['<code>[]</code>', 'sees nothing outside', 'pure logic: <code>[](int x){ return x &gt; 0; }</code>'], ['<code>[k]</code>', 'copy of k, taken when the lambda is created', 'small read-only values'], ['<code>[&amp;cnt]</code>', 'reference to the real cnt', 'you must update an outside counter / read a big vector'], ['<code>[=]</code> / <code>[&amp;]</code>', 'copy / reference everything used', 'quick contest code (prefer explicit lists in production)'], ['<code>[this]</code>', 'use members of the current object', 'inside a class method'], ['<code>[sum = 0]</code>', 'init-capture: a new variable living inside the lambda', 'state, or moving in a unique_ptr']])}
<p>By default a by-value capture is <b>read-only</b> inside the lambda. Add <code>mutable</code> to change your private copy: <code>[c = 0]() mutable { return ++c; }</code>.</p>
<h4>Generic lambdas</h4>
<p><code>[](const auto&amp; a, const auto&amp; b) { return a.second &lt; b.second; }</code> — <code>auto</code> parameters make a lambda work for any type, very handy for pairs and tuples in comparators.</p>
<h4>The two classic capture bugs</h4>
<ul><li><b>Dangling reference:</b> returning or storing a lambda that captured a <b>local</b> variable by reference — the variable dies, the lambda keeps a broken key.</li>
<li><b>Stale copy:</b> capturing <code>[k]</code>, then changing <code>k</code>, and expecting the lambda to see the new value. It will not; the copy was made at creation time.</li></ul>`,
    clues: ['"count the elements that…" → <code>count_if</code> with a predicate lambda',
      '"first element such that…" → <code>find_if</code>; "is there any / are all" → <code>any_of</code> / <code>all_of</code>',
      '"sort by a rank given in another array / string" → comparator lambda that captures the rank table by reference',
      '"DFS inside main without a global graph" → recursive lambda: <code>auto dfs = [&amp;](auto&amp;&amp; self, int u) -&gt; void { … }</code>',
      '"apply f to every element" → <code>transform</code> (or <code>ranges::transform</code>)',
      'Bug report "lambda sees an old value" → captured by value; "crash after function returns" → captured a local by reference'],
    code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> v = {5, 1, 4, 3, 9, 8};
    int k = 3;

    // Predicate with a by-value capture
    auto bigger = [k](int x) { return x > k; };
    cout << count_if(v.begin(), v.end(), bigger) << '\n';      // 4 (5, 4, 9, 8)

    // find_if: first even number
    auto it = find_if(v.begin(), v.end(), [](int x) { return x % 2 == 0; });
    if (it != v.end()) cout << "first even " << *it << " at " << (it - v.begin()) << '\n';  // 4 at 2

    // all_of / any_of / none_of
    bool allPos = all_of(v.begin(), v.end(), [](int x) { return x > 0; });     // true
    bool any10 = any_of(v.begin(), v.end(), [](int x) { return x == 10; });  // false

    // transform: squares into a new vector
    vector<long long> sq(v.size());
    transform(v.begin(), v.end(), sq.begin(), [](int x) { return 1LL * x * x; });

    // Capture by reference to accumulate side results
    long long sumOdd = 0;
    for_each(v.begin(), v.end(), [&sumOdd](int x) { if (x % 2) sumOdd += x; });   // 18

    // Init-capture + mutable: a counter living inside the lambda
    auto nextId = [id = 100]() mutable { return id++; };
    cout << nextId() << ' ' << nextId() << '\n';               // 100 101

    // Generic lambda comparator for pairs
    vector<pair<string, int>> people = {{"ana", 31}, {"raj", 25}, {"li", 31}};
    sort(people.begin(), people.end(), [](const auto& a, const auto& b) {
        return a.second != b.second ? a.second > b.second : a.first < b.first;
    });                                                         // (ana,31) (li,31) (raj,25)

    // partition: evens to the front, returns the split point
    auto mid = partition(v.begin(), v.end(), [](int x) { return x % 2 == 0; });
    cout << "evens: " << (mid - v.begin()) << '\n';            // 2

    // Recursive lambda (C++14/17/20 style): pass itself as a parameter
    vector<vector<int>> g = {{1, 2}, {3}, {}, {}};
    vector<int> order;
    auto dfs = [&](auto&& self, int u) -> void {
        order.push_back(u);
        for (int w : g[u]) self(self, w);
    };
    dfs(dfs, 0);                                                // order = 0 1 3 2
    cout << allPos << any10 << ' ' << sumOdd << ' ' << sq[0] << ' ' << order.size() << '\n';
}`,
    codeTitle: 'Predicates, transform, captures, mutable, generic and recursive lambdas',
    viz: {
      title: 'count_if with a capture by value and a capture by reference',
      input: '3 | 5 1 4 3 9 8',
      inputLabel: 'k | numbers',
      gen: function (input) {
        var hint = 'Format: k | numbers, e.g. "3 | 5 1 4 3 9 8" (1 to 12 numbers)';
        var sp = splitBar(input, hint), k = intsOf(sp[0], 1, 1, hint)[0], a = intsOf(sp[1], 1, 12, hint);
        var code = 'int k = ' + k + ', calls = 0;\nauto big = [k, &calls](int x) {\n    calls++;            // writes the REAL calls\n    return x > k;       // reads the COPY of k\n};\nlong c = count_if(v.begin(), v.end(), big);\nk = 100;               // the lambda still has k = ' + k;
        var frames = [], calls = 0, cnt = 0;
        frames.push({ narr: 'Line 1: two normal variables live in <code>main</code>: k = ' + k + ' and calls = 0.', parts: [
          { type: 'code', label: 'Program', lang: 'cpp', code: code, hl: { 1: 'cur' } },
          { type: 'vars', label: 'main()', vals: { k: k, calls: 0 }, hl: {} }] });
        frames.push({ narr: 'Lines 2–5 create a <b>closure object</b>. It stores a <b>copy</b> of k (photocopy) and a <b>reference</b> to calls (a key to the real variable). Nothing runs yet.', parts: [
          { type: 'code', label: 'Program', lang: 'cpp', code: code, hl: { 2: 'cur', 3: 'cur', 4: 'cur', 5: 'cur' } },
          { type: 'vars', label: 'main()', vals: { k: k, calls: 0 }, hl: {} },
          { type: 'map', label: 'closure "big" (its own data)', entries: [['k (copy)', k], ['calls', 'by reference → main.calls']], hl: { 'k (copy)': 'sel' } }] });
        for (var i = 0; i < a.length; i++) {
          calls++;
          var r = a[i] > k;
          if (r) cnt++;
          var hl = {}; for (var d = 0; d < i; d++) hl[d] = 'done'; hl[i] = r ? 'ok' : 'bad';
          frames.push({ narr: 'count_if calls <code>big(' + a[i] + ')</code>: calls++ changes <b>main\'s</b> calls to ' + calls + '. ' + a[i] + ' &gt; ' + k + '? <b>' + r + '</b>' + (r ? ' → count becomes ' + cnt + '.' : ' → not counted.'), parts: [
            { type: 'array', label: 'v', values: a, hl: hl, ptr: one(i, 'x'), showIdx: true },
            { type: 'code', label: 'Program', lang: 'cpp', code: code, hl: { 3: 'cur', 4: r ? 'ok' : 'bad', 6: 'cur' } },
            { type: 'vars', label: 'main()', vals: { k: k, calls: calls, 'count so far': cnt }, hl: { calls: 'cur', 'count so far': r ? 'ok' : '' } }] });
        }
        frames.push({ narr: 'count_if returns <b>' + cnt + '</b>. Because calls was captured by <b>reference</b>, main can see the lambda ran <b>' + calls + '</b> times.', parts: [
          { type: 'code', label: 'Program', lang: 'cpp', code: code, hl: { 6: 'ok' } },
          { type: 'vars', label: 'main()', vals: { k: k, calls: calls, c: cnt }, hl: { c: 'ok', calls: 'ok' } }] });
        frames.push({ narr: 'Line 7 sets main\'s k = 100. The closure\'s <b>copy is untouched</b> — calling big again would still compare against ' + k + '. That is the "stale copy" surprise; capture <code>[&amp;k]</code> if you want live updates.', parts: [
          { type: 'code', label: 'Program', lang: 'cpp', code: code, hl: { 7: 'cur' } },
          { type: 'vars', label: 'main()', vals: { k: 100, calls: calls, c: cnt }, hl: { k: 'cur' } },
          { type: 'map', label: 'closure "big"', entries: [['k (copy)', k], ['calls', 'by reference → main.calls']], hl: { 'k (copy)': 'sel' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Sort by distance from a point', html: `<p>The comparator needs the point (px, py), which lives outside — capture it. Compare squared distances in <code>long long</code> to avoid both sqrt and overflow.</p>`, code: R`long long px = 1, py = 1;
vector<pair<long long,long long>> pts = {{5, 5}, {1, 2}, {-3, 1}};
sort(pts.begin(), pts.end(), [px, py](const auto& a, const auto& b) {
    long long da = (a.first - px) * (a.first - px) + (a.second - py) * (a.second - py);
    long long db = (b.first - px) * (b.first - px) + (b.second - py) * (b.second - py);
    return da < db;
});   // (1,2) (-3,1) (5,5)` },
      { title: 'Uppercase a string with transform', html: `<p><code>transform</code> can write back into the same range. Cast to <code>unsigned char</code> before <code>toupper</code> — passing a negative char is undefined behaviour.</p>`, code: R`string s = "hello stl";
transform(s.begin(), s.end(), s.begin(), [](unsigned char c) { return (char)toupper(c); });
// "HELLO STL"` },
      { title: 'The dangling-reference lambda', html: `<p><code>makeAdder</code> returns a lambda that captured the local <code>n</code> by reference. When the function returns, <code>n</code> is gone, and calling the lambda reads dead memory. Capture by value instead.</p>`, code: R`auto makeAdderBad = [](int n) {
    return [&n](int x) { return x + n; };   // BUG: n dies when makeAdderBad returns
};
auto makeAdderGood = [](int n) {
    return [n](int x) { return x + n; };    // copy lives inside the lambda
};
cout << makeAdderGood(5)(10) << '\n';        // 15` },
      { title: 'max_element with a lambda: longest word', html: `<p>Any "best by some rule" question is <code>max_element</code> / <code>min_element</code> with a comparator. It returns the <b>first</b> best when there are ties.</p>`, code: R`vector<string> w = {"map", "vector", "deque", "string"};
auto it = max_element(w.begin(), w.end(), [](const string& a, const string& b) { return a.size() < b.size(); });
cout << *it << '\n';   // vector (first of the 6-letter words)` }
    ],
    deepDive: `<p><b>What a lambda really is.</b> The compiler turns <code>[k, &amp;calls](int x){…}</code> into an unnamed class with members <code>int k; int&amp; calls;</code> and a <code>const</code> <code>operator()(int x)</code>. That is why by-value captures are read-only unless you write <code>mutable</code> (which drops the const), and why each lambda has its own unique type — you hold it in <code>auto</code>, or in <code>std::function</code> if you need to store different lambdas in one variable (at the price of type erasure, a possible heap allocation and no inlining).</p>
<p><b>Why lambdas make STL fast.</b> Because the type is unique and known at compile time, <code>sort(…, lambda)</code> instantiates a dedicated sort where the comparison is inlined — often faster than C's <code>qsort</code> with a function pointer by 2–3×. Passing <code>std::function</code> to sort throws that away.</p>
<p><b>Algorithms copy your function object.</b> <code>for_each</code>, <code>count_if</code> and friends take the predicate <b>by value</b> and may copy it internally. Stateful lambdas with a by-value counter therefore lose updates; keep state outside and capture by reference, or use the return value of <code>for_each</code>. Some algorithms (e.g. <code>remove_if</code> in some implementations, <code>sort</code>) may call the predicate on copies of elements or more than once — a predicate should be a <b>pure function</b>.</p>
<p><b>C++20/23 extras.</b> Lambdas can be <code>constexpr</code>, can have template parameter lists <code>[]&lt;typename T&gt;(T a)</code>, can be default-constructed when captureless (so they can be used as a <code>std::set</code> comparator type with <code>decltype</code>), and C++23 "deducing this" (<code>[](this auto&amp;&amp; self, int u)</code>) makes recursive lambdas clean. Capturing <code>[=]</code> inside a member function implicitly captured <code>this</code> — deprecated in C++20; write <code>[=, this]</code> or <code>[*this]</code> explicitly.</p>`,
    aiEra: `<p><b>What AI changes:</b> lambdas are where generated C++ looks most "modern" — models love <code>[&amp;]</code> everywhere. That is fine for contest code but dangerous when the lambda escapes (stored in a callback, a thread, an async task).</p>
<p><b>Use AI as a partner:</b> <code>"For each lambda in this file say whether it can outlive any variable it captures by reference"</code> and <code>"Replace this hand-written loop with the most specific STL algorithm and explain why it is clearer"</code>. Then read the suggestion: is it really clearer, or just shorter?</p>
<p><b>Where AI goes wrong:</b> <code>[&amp;]</code> captures in lambdas passed to <code>std::thread</code> or stored in member <code>std::function</code>s; using <code>std::function</code> for a recursive lambda inside a hot loop (slow); calling <code>toupper</code> on plain <code>char</code>. <b>What you must still own:</b> lifetime reasoning — who owns each captured variable and how long the lambda lives — which no autocomplete can do for you.</p>`,
    problems: [{
      title: 'Custom Sort String (order given by another string)', level: 'Medium', tags: ['sorting', 'lambda', 'comparator'], companies: ['Facebook', 'Amazon'],
      statement: `<p>String <code>order</code> has distinct letters and defines a custom alphabet. Permute string <code>s</code> so that its letters follow that alphabet: if x comes before y in <code>order</code>, every x must come before every y in the result. Letters not in <code>order</code> may go anywhere.</p>`,
      constraints: `1 ≤ |order| ≤ 26, 1 ≤ |s| ≤ 200, lowercase letters`,
      example: `<p><code>order = "cba"</code>, <code>s = "abcd"</code> → one valid answer ${H.c('g', '"cbad"')}.</p><p>Ranks: c → 0, b → 1, a → 2, and letters not in order (d) get rank 26 so they go last.</p>`,
      brute: { why: `<p>Try every permutation of s and return the first that respects the order: |s|! permutations — impossible for |s| = 200. The real problem is just sorting by a different alphabet.</p>`, code: R`string customSortBrute(string order, string s) {
    auto ok = [&](const string& t) {
        for (int i = 0; i + 1 < (int)t.size(); i++) {
            size_t a = order.find(t[i]), b = order.find(t[i + 1]);
            if (a != string::npos && b != string::npos && a > b) return false;
        }
        return true;
    };
    sort(s.begin(), s.end());
    do { if (ok(s)) return s; } while (next_permutation(s.begin(), s.end()));
    return s;
}` },
      mcq: { q: 'How should the comparator know each letter\'s rank?', options: ['Capture a rank[26] array by reference and compare rank[a] &lt; rank[b]', 'Call order.find inside the comparator', 'Use a global std::function', 'Sort order instead'], answer: 0, explain: 'Precompute ranks once (O(26)), then each comparison is O(1). Calling find in the comparator works but costs O(26) per comparison.' },
      hints: [`<p>Hint 1: It is ordinary sorting — only the alphabet is different. What number would you attach to each letter?</p>`, `<p>Hint 2: Build <code>rank[c]</code> = position in order (26 for missing letters) and sort with <code>[&amp;](char a, char b){ return rank[a - 'a'] &lt; rank[b - 'a']; }</code>.</p>`, `<p>Hint 3: Letters missing from order all share rank 26 and tie with each other; any order among them is allowed. Bonus: counting sort gives O(|s| + 26).</p>`],
      solution: {
        approach: `<p>Precompute a rank for every letter, then <code>sort</code> s with a lambda that captures the rank table by reference. The comparator is a valid strict weak ordering (comparing integers), ties allowed.</p>`,
        code: R`class Solution {
public:
    string customSortString(string order, string s) {
        array<int, 26> rank;
        rank.fill(26);                                   // unknown letters go last
        for (int i = 0; i < (int)order.size(); i++) rank[order[i] - 'a'] = i;
        sort(s.begin(), s.end(), [&rank](char a, char b) {
            return rank[a - 'a'] < rank[b - 'a'];        // compare by custom alphabet
        });
        return s;
    }
};`,
        alt: [{ lang: 'cpp', title: 'Counting version O(|s| + 26)', code: R`string customSortCount(string order, string s) {
    array<int, 26> cnt{};
    for (char c : s) cnt[c - 'a']++;
    string res;
    for (char c : order) { res.append(cnt[c - 'a'], c); cnt[c - 'a'] = 0; }
    for (int c = 0; c < 26; c++) res.append(cnt[c], char('a' + c));
    return res;
}` }],
        dry: { head: ['letter', 'rank', 'position after sort'], rows: [['a', '2', '2'], ['b', '1', '1'], ['c', '0', '0'], ['d', '26', H.c('g', '3 → "cbad"')]] },
        complexity: `<p>Sorting version O(|s| log |s|); counting version O(|s| + 26). Space O(26).</p>`,
        followUps: ['Check whether words are sorted in an alien language (LeetCode 953) — same rank trick.', 'Use <code>stable_sort</code> to keep unknown letters in their original order.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 8 — Competitive programming template
     ====================================================================== */
  var CP_TEMPLATE = R`#include <bits/stdc++.h>
using namespace std;

using ll = long long;                     // 64-bit: sums of 1e5 values up to 1e9 fit
using pii = pair<int, int>;
#define all(x) (x).begin(), (x).end()     // sort(all(v)) instead of sort(v.begin(), v.end())
#define sz(x) (int)(x).size()             // signed size, avoids unsigned-minus-one bugs

const ll INF = (ll)4e18;
const int MOD = 1'000'000'007;

#ifdef LOCAL                              // compile locally with -DLOCAL to see debug output
#define dbg(x) cerr << #x << " = " << (x) << '\n'
#else
#define dbg(x)                            // vanishes on the judge
#endif

mt19937_64 rng(chrono::steady_clock::now().time_since_epoch().count());   // seeded RNG

void solve() {
    int n;
    cin >> n;
    vector<ll> a(n);                      // LOCAL per test case: no stale data between tests
    for (auto& x : a) cin >> x;
    sort(all(a));
    ll sum = accumulate(all(a), 0LL);
    dbg(sum);
    cout << sum << ' ' << a.back() << '\n';   // '\n', never endl, in a loop
}

int main() {
    ios::sync_with_stdio(false);          // stop syncing C++ streams with C stdio
    cin.tie(nullptr);                     // do not flush cout before every cin
    int t = 1;
    cin >> t;                             // delete this line for single-test problems
    while (t--) solve();
    return 0;
}`;
  topics.push({
    title: 'The Competitive Programming Template & Fast I/O',
    analogy: `<p>A Formula 1 pit crew does not look for the wrench when the car arrives — every tool hangs in the <b>same spot</b> every race. A contest template is your pit wall: fast I/O, the right integer type, a few short macros and a <code>solve()</code> function, all in place <b>before</b> the clock starts, so the only thing you think about during the contest is the problem itself.</p>`,
    explain: `<p>Here is a clean, modern template and what every line buys you:</p>
${H.table(['line', 'why it is there'], [['<code>#include &lt;bits/stdc++.h&gt;</code>', 'GCC-only header that includes the whole standard library. Saves typing; fine for contests, not for production code.'], ['<code>ios::sync_with_stdio(false);</code>', 'By default <code>cin/cout</code> stay in sync with C\'s <code>scanf/printf</code>, which makes them slow. Turning it off makes cin roughly as fast as scanf. After this, <b>do not mix</b> cin with scanf or cout with printf.'], ['<code>cin.tie(nullptr);</code>', 'By default every <code>cin</code> first flushes <code>cout</code>. Untying stops that — big speed-up when reading and writing alternately.'], ['<code>\'\\n\'</code> instead of <code>endl</code>', '<code>endl</code> = newline + flush. Flushing 10<sup>5</sup> times can cause TLE on its own.'], ['<code>using ll = long long;</code>', 'Sums and products overflow <code>int</code> (max ≈ 2.1·10<sup>9</sup>) all the time.'], ['<code>#define all(x)</code>', '<code>sort(all(v))</code>, <code>lower_bound(all(v), x)</code> — shorter, fewer typos.'], ['<code>void solve()</code> + <code>while (t--)</code>', 'Most problems have T test cases. Local variables inside solve() are fresh each time — no forgotten resets.'], ['<code>#ifdef LOCAL dbg(x)</code>', 'Debug prints that only exist on your machine (compile with <code>-DLOCAL</code>), so you cannot forget to delete them.']])}
<h4>How fast is fast enough?</h4>
${H.table(['N (from constraints)', 'target complexity', 'typical tools'], [['≤ 10', 'O(N!)', 'next_permutation'], ['≤ 20', 'O(2<sup>N</sup>·N)', 'bitmasks'], ['≤ 5000', 'O(N²)', 'nested loops, DP'], ['≤ 2·10<sup>5</sup>', 'O(N log N)', 'sort, lower_bound, set, priority_queue'], ['≤ 10<sup>7</sup>', 'O(N)', 'prefix sums, two pointers, counting'], ['≤ 10<sup>18</sup>', 'O(log N) or O(1)', 'math, binary search on answer']])}
<p>Rule of thumb: about <b>10<sup>8</sup> simple operations per second</b> in C++ with -O2.</p>
<h4>Habits that save contests</h4>
<ul><li>Read the constraints <b>first</b>; pick the complexity from the table above; pick the integer type from the largest possible value.</li>
<li>Prefer <code>vector</code> sized per test over a global array that you must remember to clear. If you use global arrays (for speed), reset only the first <code>n</code> entries each test, not the whole array (resetting 10<sup>6</sup> entries × 10<sup>4</sup> tests is TLE).</li>
<li>Locally compile with warnings and sanitizers: <code>g++ -std=c++20 -O2 -Wall -Wextra -DLOCAL -fsanitize=address,undefined -D_GLIBCXX_DEBUG</code>.</li>
<li>Write a <b>brute force</b> and a <b>random generator</b> and compare outputs (stress testing) whenever you get Wrong Answer and cannot see why.</li></ul>`,
    clues: ['"The first line contains T, the number of test cases" → <code>solve()</code> + <code>while (t--)</code>, and sum-of-N constraints decide total complexity',
      'Input size ≥ 10<sup>5</sup> numbers → fast I/O lines are mandatory, and use <code>\'\\n\'</code>',
      '"It is guaranteed the sum of N over all test cases does not exceed 2·10<sup>5</sup>" → do not reset a global array of size MAX per test',
      '"Print the answer modulo 10<sup>9</sup>+7" → a <code>MOD</code> constant and <code>long long</code> for every product',
      '"Interactive problem" → you MUST flush after each query (<code>endl</code> or <code>cout.flush()</code>) — the one place endl is right',
      'Hacks / anti-hash tests on Codeforces → custom hash for <code>unordered_map</code> or use <code>map</code> / sorted vector'],
    code: [CP_TEMPLATE, { lang: 'cpp', title: 'Anti-hack hash for unordered_map (splitmix64)', code: R`#include <bits/stdc++.h>
using namespace std;

// Adversarial tests can make unordered_map O(N) per operation by forcing collisions.
// A randomised hash (splitmix64 + per-run random offset) defeats them.
struct SplitMix {
    static uint64_t splitmix64(uint64_t x) {
        x += 0x9e3779b97f4a7c15ULL;
        x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9ULL;
        x = (x ^ (x >> 27)) * 0x94d049bb133111ebULL;
        return x ^ (x >> 31);
    }
    size_t operator()(uint64_t x) const {
        static const uint64_t OFFSET = chrono::steady_clock::now().time_since_epoch().count();
        return splitmix64(x + OFFSET);
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    unordered_map<long long, int, SplitMix> freq;
    freq.reserve(1 << 18);                 // avoid rehashing during inserts
    long long x;
    while (cin >> x) freq[x]++;            // read until end of input
    int best = 0;
    for (auto& [k, c] : freq) best = max(best, c);
    cout << best << '\n';
}` }],
    codeTitle: ['The template (solve() + multi-test + fast I/O)', 'Anti-hack hash and reading until EOF'],
    viz: {
      title: 'Running the template on a multi-test input',
      input: '2  3 5 1 4  2 10 20',
      inputLabel: 'Input tokens: T, then for each test N and N numbers',
      gen: function (input) {
        var hint = 'Enter T, then for each test case N followed by N numbers, e.g. "2  3 5 1 4  2 10 20" (T ≤ 4, N ≤ 8)';
        var tok = intsOf(input, 2, 60, hint), pos = 0;
        function next() { if (pos >= tok.length) throw new Error(hint); return tok[pos++]; }
        var lines = CP_TEMPLATE.split('\n');
        function ln(sub) { for (var i = 0; i < lines.length; i++) if (lines[i].indexOf(sub) >= 0) return i + 1; return 1; }
        var L = { sync: ln('sync_with_stdio'), tie: ln('cin.tie'), readT: ln('cin >> t;'), loop: ln('while (t--)'), readN: ln('cin >> n;'), vec: ln('vector<ll> a(n)'), readA: ln('for (auto& x : a)'), sort: ln('sort(all(a))'), acc: ln('accumulate'), out: ln('cout << sum') };
        var frames = [], out = [];
        function q() { return tok.slice(pos).map(String); }
        function fr(narr, line, vals, extra) {
          var parts = [{ type: 'code', label: 'Template', lang: 'cpp', code: CP_TEMPLATE, hl: one(line, 'cur') },
            { type: 'queue', label: 'Input stream (front = next token cin reads)', items: q().slice(0, 16), hl: one(0, 'cur'), frontLabel: 'next', backLabel: 'last' },
            { type: 'vars', label: 'Variables', vals: vals || {}, hl: {} },
            { type: 'text', label: 'Output', html: out.length ? '<code>' + out.join('<br>') + '</code>' : '<span class="c-m">(nothing yet)</span>' }];
          (extra || []).forEach(function (p) { parts.push(p); });
          frames.push({ narr: narr, parts: parts });
        }
        fr('<code>main</code> starts. First the two fast-I/O lines: unsync from C stdio, untie cin from cout. From now on, cin and cout are fast — and we must not mix them with scanf/printf.', L.sync, {});
        var t = next();
        if (t < 1 || t > 4) throw new Error(hint);
        fr('<code>cin &gt;&gt; t</code> reads the number of test cases: <b>t = ' + t + '</b>.', L.readT, { t: t });
        for (var tc = 1; tc <= t; tc++) {
          fr('<code>while (t--)</code>: test case #' + tc + ' — call <code>solve()</code>. Everything declared inside solve() is brand new for this test.', L.loop, { t: t - tc + 1, 'test #': tc });
          var n = next();
          if (n < 1 || n > 8) throw new Error(hint);
          fr('Inside solve(): <code>cin &gt;&gt; n</code> → <b>n = ' + n + '</b>.', L.readN, { 'test #': tc, n: n });
          var a = [];
          for (var i = 0; i < n; i++) a.push(next());
          fr('Create a fresh <code>vector&lt;ll&gt; a(' + n + ')</code> and read ' + n + ' numbers into it with a range-for by reference.', L.readA, { 'test #': tc, n: n }, [{ type: 'array', label: 'a (as read)', values: a.slice(), showIdx: true }]);
          var s = a.slice().sort(function (x, y) { return x - y; });
          fr('<code>sort(all(a))</code> — the macro expands to <code>sort(a.begin(), a.end())</code>.', L.sort, { 'test #': tc, n: n }, [{ type: 'array', label: 'a (sorted)', values: s, hl: (function () { var h = {}; s.forEach(function (_, z) { h[z] = 'ok'; }); return h; })(), showIdx: true }]);
          var sum = s.reduce(function (x, y) { return x + y; }, 0);
          fr('<code>accumulate(all(a), 0LL)</code> = <b>' + sum + '</b> (0LL keeps the running total 64-bit).', L.acc, { 'test #': tc, n: n, sum: sum }, [{ type: 'array', label: 'a', values: s, showIdx: true }]);
          out.push(sum + ' ' + s[s.length - 1]);
          fr('Print <code>sum</code> and the max <code>a.back()</code> followed by <code>\'\\n\'</code> (no flush). solve() returns and its vector is destroyed.', L.out, { 'test #': tc, sum: sum, 'a.back()': s[s.length - 1] });
        }
        fr('t reached 0: loop ends, <code>main</code> returns, and the output buffer is flushed <b>once</b> at exit. ' + (pos < tok.length ? '<span class="c-y">Note: ' + (tok.length - pos) + ' input token(s) were never read.</span>' : 'Every input token was consumed.'), L.loop, { t: 0 });
        return frames;
      }
    },
    examples: [
      { title: 'Reading until end of input', html: `<p>Some problems do not tell you how many numbers there are. <code>while (cin &gt;&gt; x)</code> stops when reading fails at end of file. Locally, finish typed input with <kbd>Ctrl</kbd>+<kbd>D</kbd> (Linux/macOS) or <kbd>Ctrl</kbd>+<kbd>Z</kbd> Enter (Windows).</p>`, code: R`long long x, total = 0;
int count = 0;
while (cin >> x) { total += x; count++; }
cout << count << ' ' << total << '\n';` },
      { title: 'The stale-global bug in multi-test problems', html: `<p>A global <code>vector&lt;int&gt; adj[200005]</code> filled in test 1 still holds test 1's edges in test 2. Either declare data inside <code>solve()</code> or clear exactly the part you used: <code>for (int i = 0; i &lt; n; i++) adj[i].clear();</code>. Do <b>not</b> clear all 200005 entries per test when T can be 10<sup>4</sup>.</p>`, code: R`const int MAXN = 200005;
static vector<int> adj[MAXN];
int n = 5;
for (int i = 0; i < n; i++) adj[i].clear();   // reset only what this test uses` },
      { title: 'Interactive problems: the one time endl is right', html: `<p>The judge reads your query and answers it. If your output sits in a buffer, the judge waits forever → "Idleness limit exceeded". Flush after every query.</p>`, code: R`int lo = 1, hi = 1000000;               // secret is in [lo, hi]
while (lo < hi) {
    int mid = lo + (hi - lo + 1) / 2;    // upper middle, so lo = mid always makes progress
    cout << "? " << mid << endl;          // endl flushes: the judge sees the query now
    string resp;
    cin >> resp;                          // judge answers "<" (secret < mid) or ">="
    if (resp == "<") hi = mid - 1; else lo = mid;
}
cout << "! " << lo << endl;` },
      { title: '#define int long long — popular but sharp', html: `<p>Some competitors write <code>#define int long long</code> so every int is 64-bit. Then <code>int main</code> becomes <code>long long main</code>, which is illegal — so they write <code>signed main()</code>. It also doubles memory for big arrays and slows some code. Prefer an explicit <code>ll</code> alias where you need it.</p>`, code: R`#define int long long
signed main() {                 // 'int main' would become 'long long main' -> error
    int big = 1LL << 40;        // really long long now
    cout << big << '\n';
}` }
    ],
    deepDive: `<p><b>Why iostreams are slow by default.</b> With synchronisation on, every <code>cout</code> operation goes through C's <code>stdout</code> buffer so that mixing <code>printf</code> and <code>cout</code> keeps the right order; libstdc++ implements this with an unbuffered stdio-sync stream, roughly one function call per character. <code>sync_with_stdio(false)</code> gives iostreams their own buffer. <code>tie</code> exists for interactive console programs ("Enter your name:" must appear before the read); on a judge it is pure overhead. With both, reading 10<sup>6</sup> integers drops from ~0.4 s to well under 0.1 s. For extreme cases (10<sup>7</sup> numbers), a custom reader with <code>fread</code> into a big buffer and manual digit parsing is another 3–5× faster.</p>
<p><b>bits/stdc++.h and using namespace std.</b> The header is a libstdc++ implementation detail (not in MSVC); with precompiled headers it costs nothing, without them it adds ~1 s compile time. <code>using namespace std</code> pulls in thousands of names: a global variable called <code>y1</code>, <code>j0</code> or <code>index</code> can clash with C library functions, and naming your own function <code>count</code> or <code>distance</code> can lead to confusing overload errors. Both are fine for contests and banned in most production style guides.</p>
<p><b>Other judge realities.</b> Recursion depth: the default stack is often 8 MB (Linux) or 1 MB (Windows) — a DFS 10<sup>6</sup> deep may crash; use an explicit stack or check the judge's limit. <code>__int128</code> exists on GCC for 128-bit products (no cin/cout support, print by hand). <code>#pragma GCC optimize("O3,unroll-loops")</code> and <code>target("avx2")</code> can speed up tight loops but may produce "illegal instruction" if the judge CPU lacks AVX2 — treat them as a last resort. Random seeds from <code>chrono</code> (not <code>rand()</code>, which has a tiny range on Windows) keep randomised algorithms and hashes unhackable.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI can produce a polished template in seconds, and many contest platforms now have explicit rules about AI use (e.g. Codeforces restricts AI-generated solutions in rated rounds). Know your platform's policy; in interviews you will type everything yourself.</p>
<p><b>Use AI as a partner (where allowed):</b> after a contest, paste your accepted solution and ask <code>"What test would break this if the constraints were 10× bigger?"</code> or <code>"Write a random generator and a brute force so I can stress test this"</code>. That turns every problem into deliberate practice.</p>
<p><b>Where AI goes wrong:</b> templates full of macros you do not understand (<code>#define int long long</code> with <code>int main</code>, <code>rep</code> macros with off-by-one), <code>endl</code> in hot loops, and forgetting to flush in interactive problems. <b>What you must still own:</b> reading constraints → complexity → data types in under a minute, and knowing every single line of your template — in an interview, unexplained macros look bad; write plain, readable C++ there.</p>`,
    problems: [{
      title: 'Minimum Gap Between Any Two Numbers (multi-test)', level: 'Easy', tags: ['sorting', 'template', 'adjacent_difference'], companies: ['Codeforces', 'CodeChef'],
      statement: `<p>There are T test cases. In each, you get N integers. Print the <b>minimum absolute difference</b> between any two of them.</p>`,
      constraints: `1 ≤ T ≤ 10<sup>4</sup>, 2 ≤ N ≤ 2·10<sup>5</sup>, sum of N over all tests ≤ 2·10<sup>5</sup>, −10<sup>9</sup> ≤ a[i] ≤ 10<sup>9</sup>`,
      example: `<p>Test <code>[10, 3, 8, 15]</code> → ${H.c('g', '2')} (8 and 10). After sorting ${H.arr([3, 8, 10, 15], { hl: { 1: 'g', 2: 'g' } })} the closest pair is always <b>adjacent</b>, so only N − 1 gaps need checking.</p>`,
      brute: { why: `<p>Check every pair: O(N²) per test, 2·10<sup>10</sup> in the worst case. The waste: in sorted order, a non-adjacent pair can never be closer than the adjacent pairs between them.</p>`, code: R`long long minGapBrute(const vector<long long>& a) {
    long long best = LLONG_MAX;
    for (size_t i = 0; i < a.size(); i++)
        for (size_t j = i + 1; j < a.size(); j++)
            best = min(best, llabs(a[i] - a[j]));
    return best;
}` },
      mcq: { q: 'Values go from −10<sup>9</sup> to 10<sup>9</sup>. What type must the difference use?', options: ['long long — the difference can reach 2·10<sup>9</sup>, beyond int', 'int is enough', 'double', 'unsigned int'], answer: 0, explain: '10<sup>9</sup> − (−10<sup>9</sup>) = 2·10<sup>9</sup> &gt; 2,147,483,647. Classic silent overflow.' },
      hints: [`<p>Hint 1: After sorting, if x ≤ y ≤ z then y − x ≤ z − x, so the best partner of each number is a neighbour.</p>`, `<p>Hint 2: Template: solve() reads n and a vector of <code>long long</code>, sorts with <code>sort(all(a))</code>, and checks a[i+1] − a[i].</p>`, `<p>Hint 3: Use 64-bit differences and fast I/O. Since sum of N ≤ 2·10<sup>5</sup>, O(N log N) per test is fine overall. Recipe: sort; best = min over i of a[i+1] − a[i]; print.</p>`],
      solution: {
        approach: `<p>Sort each test's array, scan adjacent pairs, take the minimum gap. The template handles multi-test input and fast I/O; local vectors inside <code>solve()</code> avoid stale data.</p>`,
        code: R`#include <bits/stdc++.h>
using namespace std;
using ll = long long;
#define all(x) (x).begin(), (x).end()

void solve() {
    int n;
    cin >> n;
    vector<ll> a(n);
    for (auto& x : a) cin >> x;
    sort(all(a));
    ll best = LLONG_MAX;
    for (int i = 0; i + 1 < n; i++) best = min(best, a[i + 1] - a[i]);   // neighbours only
    cout << best << '\n';
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int t;
    cin >> t;
    while (t--) solve();
}`,
        alt: [{ lang: 'cpp', title: 'Same with adjacent_difference', code: R`using ll = long long;
ll minGap(vector<ll> a) {
    sort(a.begin(), a.end());
    vector<ll> d(a.size());
    adjacent_difference(a.begin(), a.end(), d.begin());    // d[0] = a[0], d[i] = a[i] - a[i-1]
    return *min_element(d.begin() + 1, d.end());            // skip d[0]
}` }],
        dry: { head: ['i', 'a[i]', 'a[i+1]', 'gap', 'best'], rows: [['0', '3', '8', '5', '5'], ['1', '8', '10', '2', H.c('g', '2')], ['2', '10', '15', '5', '2']] },
        complexity: `<p>O(N log N) per test, O(∑N log ∑N) overall; O(N) memory.</p>`,
        followUps: ['Also print how many pairs achieve the minimum gap.', 'Numbers arrive one by one; report the minimum gap after each (use a <code>set</code> and check neighbours of the inserted value).']
      }
    }]
  });

  registerModule({
    id: 'cpp08',
    title: 'STL Algorithms, Iterators & Competitive Setup',
    intro: `<p>Containers hold your data; <b>algorithms</b> do the work. This module is about the 20 or so STL algorithms that solve most interview and contest problems in one line each — and about the small rules that, when broken, turn those one-liners into crashes and wrong answers.</p>
<p>You will learn how <b>iterators</b> connect containers to algorithms (and why <code>std::lower_bound</code> on a <code>set</code> is secretly O(N)), how to write <b>comparators</b> that obey strict weak ordering (and why <code>&lt;=</code> can segfault <code>std::sort</code>), how to use <code>lower_bound</code>/<code>upper_bound</code> for counting and closest-value questions, why <code>accumulate(…, 0)</code> overflows, how <code>next_permutation</code> walks every arrangement, why <code>remove</code> and <code>unique</code> need <code>erase</code>, how lambdas and captures plug into all of it, and finally a clean <b>competitive programming template</b> with fast I/O.</p>
<p>Every topic has a step-by-step visualizer, worked examples, puzzles and contest-style problems with brute-force and optimal C++ solutions.</p>`,
    goals: [
      'Pick the right iterator-based algorithm for a task and know its iterator-category requirement and cost',
      'Write correct custom comparators (multi-key, descending, string concatenation) and spot strict-weak-ordering bugs like <code>&lt;=</code> and <code>return a - b</code>',
      'Answer counting, floor/ceiling and range queries with <code>lower_bound</code> / <code>upper_bound</code> / <code>equal_range</code> in O(log N)',
      'Use <code>accumulate</code>, <code>partial_sum</code>, <code>iota</code> and friends without overflow or truncation traps',
      'Enumerate permutations and combinations with <code>next_permutation</code> and code the 4-step algorithm by hand',
      'Apply the erase–remove and sort–unique–erase idioms (and C++20 <code>std::erase_if</code>) and explain why the tail must be erased',
      'Use lambdas with the right captures inside algorithms and avoid dangling or stale captures',
      'Set up a fast, safe competitive programming template and choose complexity from constraints'
    ],
    prereqs: `C++ 2 (functions, vectors, strings), C++ 3 (pointers — iterators behave like them) and C++ 7 (STL containers). Basic binary search and prefix sums from the DSA track help but are re-explained here.`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
