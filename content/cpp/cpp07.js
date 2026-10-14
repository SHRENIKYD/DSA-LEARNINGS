(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared little helpers for the visualizers ---------------- */
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function clean(input) { return String(input === undefined || input === null ? '' : input).trim(); }
  function intsOf(input, minN, maxN, lo, hi, hint) {
    var s = clean(input);
    if (!s) throw new Error(hint);
    var a = s.split(/[\s,]+/).filter(function (x) { return x.length; }).map(Number);
    if (a.length < minN || a.length > maxN || a.some(function (x) { return isNaN(x) || x !== Math.floor(x) || x < lo || x > hi; })) throw new Error(hint);
    return a;
  }
  function note(html, label) { return { type: 'text', label: label || 'Why', html: html }; }
  function codePart(code, hl, label) {
    return { type: 'code', label: label || 'C++ (highlighted line = running now)', lang: 'cpp', code: code, hl: hl || {} };
  }
  function hlRange(lo, hi, cls) { var h = {}; for (var i = lo; i <= hi; i++) h[i] = cls; return h; }

  /* ======================================================================
     TOPIC 1 — std::vector: size, capacity, reallocation
     ====================================================================== */
  topics.push({
    title: 'std::vector — Size, Capacity, Growth & Reallocation',
    analogy: `<p>Think of a <b>row of reserved seats at a cinema</b> for your friends. You booked 4 seats side by side. Friends 1–4 sit down easily. When friend 5 arrives there is no free seat next to the group, so <b>everybody stands up, walks to a new, longer row of 8 seats, and sits down again</b>. Anyone who wrote down "Asha is in seat F3" now has a wrong note — Asha moved.</p>
<p>That is exactly a <code>std::vector</code>: <b>size</b> = friends seated, <b>capacity</b> = seats booked, <b>reallocation</b> = the whole group moving to a bigger row, and the stale notes are <b>invalidated pointers, references and iterators</b>.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> A <code>vector&lt;T&gt;</code> is a growable array. All elements sit <b>next to each other</b> in one heap block, so <code>v[i]</code> is a single address calculation (start + i × sizeof(T)) — instant, O(1). It keeps three numbers (really three pointers inside):</p>
<ul>
<li><b>size()</b> — how many elements you actually stored.</li>
<li><b>capacity()</b> — how many elements fit in the current block before it must grow.</li>
<li><b>data()</b> — where the block starts.</li>
</ul>
${H.arr([7, 3, 9, '·', '·', '·', '·', '·'], { label: 'size 3, capacity 8', hl: { 0: 'g', 1: 'g', 2: 'g' } })}
<p><b>What happens on <code>push_back</code>?</b> If <code>size &lt; capacity</code>, the new value goes into the next free slot. Cheap. If <code>size == capacity</code>, the vector must <b>reallocate</b>:</p>
<ol>
<li>Ask for a new, bigger block (GCC/libstdc++ and Clang/libc++ <b>double</b> it; MSVC grows by <b>1.5×</b>).</li>
<li>Move (or copy) every old element into the new block.</li>
<li>Destroy the old elements and free the old block.</li>
<li>Put the new element in.</li>
</ol>
${H.table(['push #', 'size after', 'capacity (GCC, ×2)', 'capacity (MSVC, ×1.5)', 'reallocated?'], [['1', '1', '1', '1', H.c('r', 'yes')], ['2', '2', '2', '2', H.c('r', 'yes')], ['3', '3', '4', '3', H.c('r', 'yes')], ['4', '4', '4', '4', 'GCC no / MSVC yes'], ['5', '5', '8', '6', H.c('r', 'yes')], ['6..8', '8', '8', '9 (at push 7)', 'GCC no']])}
<p><b>Why double instead of +1?</b> Growing by one slot means copying 1 + 2 + 3 + … + n ≈ n²/2 elements. Growing geometrically means the total copying is 1 + 2 + 4 + … + n &lt; 2n. Spread over n pushes that is a <b>constant</b> amount of work per push → <b>amortized O(1)</b>.</p>
<p><b>The tools you control:</b></p>
${H.table(['call', 'changes size?', 'changes capacity?', 'use it when'], [['<code>reserve(n)</code>', 'no', 'grows to ≥ n (never shrinks)', 'you know roughly how many elements are coming'], ['<code>resize(n)</code>', 'yes (adds default values or chops)', 'grows if needed', 'you want n real elements to index into'], ['<code>clear()</code>', 'yes → 0', 'no (keeps the block)', 'reuse the buffer in a loop'], ['<code>shrink_to_fit()</code>', 'no', 'maybe shrinks (non-binding request)', 'after a big vector shrank for good'], ['<code>emplace_back(args…)</code>', '+1', 'maybe (like push_back)', 'build the element in place from constructor args']])}
<p><b>The big warning:</b> a reallocation moves every element to new addresses. Any <code>T*</code>, <code>T&amp;</code> or iterator you saved before it now points into freed memory. Using it is <b>undefined behaviour</b> — it may "work", print garbage, or crash only in production.</p>`,
    clues: [
      '"append many items, then index randomly" → <code>vector</code> is the default answer',
      '"you know N up front" → call <code>reserve(N)</code> (or construct with size N) to avoid log₂N reallocations',
      '"amortized O(1)" / "why is push_back fast on average?" → geometric growth explanation',
      '"pointer to an element became garbage after adding more" → reallocation invalidated it',
      '"N ≤ 10<sup>6</sup> push_backs, tight time limit" → reserve, avoid <code>vector&lt;vector&lt;…&gt;&gt;</code> churn',
      '"need contiguous memory to pass to a C API / GPU / file write" → <code>vector::data()</code>'
    ],
    code: [`#include <vector>
#include <iostream>

int main() {
    std::vector<int> v;                     // size 0, capacity 0, no heap block yet
    std::size_t lastCap = v.capacity();
    for (int i = 0; i < 20; ++i) {
        v.push_back(i);
        if (v.capacity() != lastCap) {      // capacity changed => a reallocation just happened
            std::cout << "size " << v.size() << " -> capacity " << v.capacity() << "\\n";
            lastCap = v.capacity();
        }
    }
    // GCC/Clang print capacities 1 2 4 8 16 32. MSVC prints 1 2 3 4 6 9 13 19 28.

    std::vector<int> w;
    w.reserve(1000);                        // ONE allocation up front
    for (int i = 0; i < 1000; ++i) w.push_back(i);   // zero reallocations
    std::cout << w.size() << " / " << w.capacity() << "\\n";   // 1000 / 1000

    w.clear();                              // size 0 but capacity still 1000
    w.shrink_to_fit();                      // politely ask to give memory back
    std::cout << w.size() << " / " << w.capacity() << "\\n";   // usually 0 / 0
}`, `#include <vector>
#include <string>
#include <iostream>

struct Person {
    std::string name;
    int age;
    Person(std::string n, int a) : name(std::move(n)), age(a) {}
};

int main() {
    std::vector<Person> people;
    people.reserve(3);
    people.push_back(Person("Asha", 30));  // builds a temporary, then MOVES it in
    people.emplace_back("Ben", 25);         // builds directly inside the vector's slot
    Person& last = people.emplace_back("Chen", 41);   // C++17: returns a reference
    last.age += 1;
    for (const auto& p : people) std::cout << p.name << ' ' << p.age << "\\n";
}`],
    codeTitle: ['Watching capacity grow (and reserve/clear/shrink_to_fit)', 'push_back vs emplace_back'],
    viz: [{
      title: 'push_back: watch the buffer fill up, then move house',
      input: '5 8 1 9 3 7 2 6 4 | 2',
      inputLabel: 'Values to push_back, then | growth factor (2 = GCC/Clang, 1.5 = MSVC)',
      gen: function (input) {
        var hint = 'Format: values to push_back, then | growth factor 2 or 1.5. Example: 5 8 1 9 3 | 2';
        var s = clean(input) || '5 8 1 9 3 7 2 6 4 | 2';
        var sp = s.split('|');
        var vals = intsOf(sp[0], 1, 16, -999, 999, hint);
        var f = sp.length > 1 && sp[1].trim() ? Number(sp[1].trim()) : 2;
        if (f !== 2 && f !== 1.5) throw new Error('Growth factor must be 2 (GCC/Clang) or 1.5 (MSVC)');
        var data = [], cap = 0, buf = 0, moves = 0, capHist = [], labels = [], frames = [];
        function slots(c, n) { var a = []; for (var i = 0; i < c; i++) a.push(i < n ? data[i] : '·'); return a; }
        function vars(extra) {
          var o = { 'size()': data.length, 'capacity()': cap, 'buffer': cap ? 'block #' + buf : 'none', 'element moves so far': moves };
          if (extra) for (var k in extra) o[k] = extra[k];
          return { type: 'vars', label: 'Inside the vector', vals: o };
        }
        function capBars() {
          return { type: 'bars', label: 'capacity after each push_back (size shown on top)', values: capHist.length ? capHist.slice() : [0], texts: capHist.length ? labels.slice() : ['0/0'], idxLabels: capHist.length ? capHist.map(function (_, i) { return '#' + (i + 1); }) : ['start'] };
        }
        frames.push({ narr: 'An empty <code>std::vector&lt;int&gt;</code>: size 0, capacity 0. It has not even asked the heap for memory yet — the first <code>push_back</code> will.', parts: [{ type: 'array', label: 'no buffer yet', values: ['∅'] }, vars(), capBars()] });
        for (var i = 0; i < vals.length; i++) {
          var x = vals[i];
          if (data.length === cap) {
            var newCap = f === 2 ? data.length + Math.max(data.length, 1) : Math.max(cap + Math.floor(cap / 2), data.length + 1);
            var oldBuf = buf, oldCap = cap;
            if (cap > 0) {
              frames.push({ narr: 'push_back(<b>' + x + '</b>): size == capacity == ' + cap + '. <span class="c-r">No free slot!</span> The vector must allocate a bigger block of <b>' + newCap + '</b> slots (' + (f === 2 ? 'double' : '1.5×') + ').', parts: [
                { type: 'array', label: 'old block #' + oldBuf + ' (capacity ' + oldCap + ') — FULL', values: slots(oldCap, data.length), hl: hlRange(0, oldCap - 1, 'cur') },
                { type: 'array', label: 'new block #' + (buf + 1) + ' (capacity ' + newCap + ') — empty', values: slots(newCap, 0) },
                vars(), capBars()] });
            }
            buf++; moves += data.length; cap = newCap;
            frames.push({ narr: (oldCap ? 'Move all <b>' + data.length + '</b> old elements into block #' + buf + ', destroy them in the old block, free block #' + oldBuf + '. <span class="c-r">Every pointer, reference and iterator into block #' + oldBuf + ' is now dangling.</span> ' : 'First push: allocate block #1 with capacity ' + newCap + '. ') + 'Then construct <b>' + x + '</b> in slot ' + data.length + '.', parts: [
              { type: 'array', label: 'block #' + buf + ' (capacity ' + cap + ')', values: (function () { data.push(x); return slots(cap, data.length); })(), hl: (function () { var h = hlRange(0, data.length - 2, 'ok'); h[data.length - 1] = 'sel'; return h; })() },
              oldCap ? { type: 'array', label: 'block #' + oldBuf + ' — FREED (do not touch!)', values: slots(oldCap, 0).map(function () { return '✗'; }), hl: hlRange(0, oldCap - 1, 'bad') } : note('Capacity jumps from 0 to ' + cap + '.', 'Note'),
              (function () { capHist.push(cap); labels.push(data.length + '/' + cap); return vars({ 'reallocation?': 'YES' }); })(), capBars()] });
          } else {
            data.push(x); capHist.push(cap); labels.push(data.length + '/' + cap);
            frames.push({ narr: 'push_back(<b>' + x + '</b>): size ' + (data.length - 1) + ' &lt; capacity ' + cap + ', so it simply goes into the next free slot. <span class="c-g">No allocation, no moves — this is the cheap common case.</span>', parts: [
              { type: 'array', label: 'block #' + buf + ' (capacity ' + cap + ')', values: slots(cap, data.length), hl: one(data.length - 1, 'ok') },
              vars({ 'reallocation?': 'no' }), capBars()] });
          }
        }
        frames.push({ narr: 'Done. <b>' + vals.length + '</b> pushes cost <b>' + moves + '</b> element moves in total — about <b>' + (moves / vals.length).toFixed(2) + '</b> per push. With geometric growth this ratio stays below a small constant forever: that is <b>amortized O(1)</b>. Had we called <code>reserve(' + vals.length + ')</code> first, moves would be 0.', parts: [
          { type: 'array', label: 'final block #' + buf, values: slots(cap, data.length), hl: hlRange(0, data.length - 1, 'done') }, vars(), capBars()] });
        return frames;
      }
    }, {
      title: 'insert / erase in the middle: everybody after the gap shifts',
      input: '10 20 30 40 50 60 | erase 1',
      inputLabel: 'Values | erase i   or   values | insert i value',
      gen: function (input) {
        var hint = 'Format: 10 20 30 40 | erase 1   or   10 20 30 40 | insert 2 99';
        var s = clean(input) || '10 20 30 40 50 60 | erase 1';
        var sp = s.split('|');
        if (sp.length !== 2) throw new Error(hint);
        var a = intsOf(sp[0], 1, 12, -999, 999, hint);
        var op = sp[1].trim().split(/\s+/);
        var frames = [], i, k;
        if (op[0] === 'erase' && op.length === 2) {
          k = Number(op[1]);
          if (isNaN(k) || k < 0 || k >= a.length || k !== Math.floor(k)) throw new Error('erase index must be 0..' + (a.length - 1));
          frames.push({ narr: '<code>v.erase(v.begin() + ' + k + ')</code> removes <b>' + a[k] + '</b>. A vector cannot leave a hole, so every element after it must slide one step left.', parts: [{ type: 'array', values: a.slice(), hl: one(k, 'bad'), ptr: one(k, 'it') }, { type: 'vars', vals: { size: a.length, 'elements to shift': a.length - 1 - k } }] });
          for (i = k; i < a.length - 1; i++) {
            a[i] = a[i + 1];
            var h = hlRange(0, k - 1, 'done'); h[i] = 'ok'; h[i + 1] = 'cur';
            frames.push({ narr: 'Move-assign <b>v[' + (i + 1) + '] → v[' + i + ']</b>. (Each shift is one move; this loop is why erase is O(n − k).)', parts: [{ type: 'array', values: a.slice(), hl: h }] });
          }
          var gone = a.pop();
          frames.push({ narr: 'Destroy the last (now duplicate) slot. size shrinks by 1, <b>capacity stays the same</b>. Iterators at or after position ' + k + ' (including <code>end()</code>) are now invalid; <code>erase</code> returns a fresh iterator to position ' + k + '.', parts: [{ type: 'array', values: a.concat(['·']), hl: one(a.length, 'bad'), ptr: k < a.length ? one(k, 'returned it') : {} }, { type: 'vars', vals: { size: a.length, 'shifted': a.length - k, 'last value moved': gone } }] });
          frames.push({ narr: 'Lesson: erasing near the <b>end</b> is cheap, near the <b>front</b> costs O(n). If order does not matter, the "swap with back then pop_back" trick makes erase O(1).', parts: [{ type: 'array', values: a.slice(), hl: hlRange(0, a.length - 1, 'done') }, note('<code>std::swap(v[k], v.back()); v.pop_back();</code> → O(1) unordered erase.', 'Trick')] });
        } else if (op[0] === 'insert' && op.length === 3) {
          k = Number(op[1]); var val = Number(op[2]);
          if (isNaN(k) || isNaN(val) || k < 0 || k > a.length || k !== Math.floor(k)) throw new Error('insert index must be 0..' + a.length);
          frames.push({ narr: '<code>v.insert(v.begin() + ' + k + ', ' + val + ')</code>. First make room: the last element is moved into a new slot at the end (this may even reallocate if size == capacity).', parts: [{ type: 'array', values: a.concat(['·']), ptr: one(k, 'pos'), hl: one(a.length, 'cur') }] });
          a.push(a[a.length - 1]);
          for (i = a.length - 2; i > k; i--) {
            a[i] = a[i - 1];
            var h2 = {}; h2[i] = 'ok'; h2[i - 1] = 'cur';
            frames.push({ narr: 'Shift right: <b>v[' + (i - 1) + '] → v[' + i + ']</b>, walking backwards so nothing gets overwritten.', parts: [{ type: 'array', values: a.slice(), hl: h2 }] });
          }
          a[k] = val;
          frames.push({ narr: 'Write <b>' + val + '</b> into the gap at position ' + k + '. Cost: ' + (a.length - 1 - k) + ' moves. Inserting at the front of a big vector is O(n) every time — that is when a <code>deque</code> (front inserts) or a different design wins.', parts: [{ type: 'array', values: a.slice(), hl: one(k, 'sel'), ptr: one(k, 'returned it') }] });
          frames.push({ narr: 'If no reallocation happened, iterators <b>before</b> position ' + k + ' are still valid; those at/after it are invalid. If it did reallocate, <b>all</b> are invalid.', parts: [{ type: 'array', values: a.slice(), hl: (function () { var h3 = hlRange(0, k - 1, 'ok'); for (var j = k; j < a.length; j++) h3[j] = 'bad'; return h3; })() }, note('green = still-valid iterators, red = invalidated', 'Legend')] });
        } else throw new Error(hint);
        return frames;
      }
    }],
    examples: [
      { title: 'Counting reallocations for 1,000,000 push_backs', html: `<p>With doubling, capacity goes 1, 2, 4, …, 2<sup>20</sup> = 1,048,576. That is only <b>21 reallocations</b>. Total elements moved = 1 + 2 + 4 + … + 524,288 ≈ <b>1,048,575</b> — about one move per push. With <code>reserve(1'000'000)</code> it becomes <b>1 allocation, 0 moves</b>. On a 1-second limit this can be the difference between 0.03 s and 0.01 s, and it removes allocator noise entirely.</p>`, code: `std::vector<int> v;
v.reserve(1'000'000);            // digit separators are legal since C++14
for (int i = 0; i < 1'000'000; ++i) v.push_back(i);` },
      { title: 'resize vs reserve — the classic off-by-everything bug', html: `<p>Someone writes <code>v.reserve(5); v[0] = 42;</code>. Capacity is 5 but <b>size is 0</b>, so <code>v[0]</code> touches an element that does not exist: undefined behaviour (and <code>v.at(0)</code> would throw <code>std::out_of_range</code>). Use <code>resize(5)</code> (creates 5 zeros you may index) or <code>reserve</code> + <code>push_back</code>.</p>
${H.table(['after', 'size', 'capacity', 'v[0] = 42 legal?'], [['<code>reserve(5)</code>', '0', '5', H.c('r', 'NO (UB)')], ['<code>resize(5)</code>', '5', '≥ 5', H.c('g', 'yes')], ['<code>vector&lt;int&gt; v(5)</code>', '5', '5', H.c('g', 'yes')]])}`, code: `std::vector<int> a; a.reserve(5);   // a.size() == 0
std::vector<int> b; b.resize(5);    // b == {0,0,0,0,0}
std::vector<int> c(5, -1);          // c == {-1,-1,-1,-1,-1}
b[0] = 42;                          // fine
a.push_back(42);                    // the right way to fill a reserved vector` },
      { title: 'Why vector<T> moves (not copies) on growth — only if the move is noexcept', html: `<p>During reallocation the vector uses <code>std::move_if_noexcept</code>. If <code>T</code>'s move constructor is <code>noexcept</code> it moves (cheap: a <code>std::string</code> move just steals a pointer). If the move might throw and a copy constructor exists, it <b>copies</b> instead, so that a failure halfway leaves the old vector untouched (the strong exception guarantee). Forgetting <code>noexcept</code> on a hand-written move constructor silently turns every growth into a deep copy.</p>`, code: `struct Big {
    std::vector<int> data;
    Big() = default;
    Big(const Big&) = default;
    Big(Big&& other) noexcept : data(std::move(other.data)) {}   // noexcept => vector moves on growth
    Big& operator=(const Big&) = default;
    Big& operator=(Big&&) noexcept = default;
};
static_assert(std::is_nothrow_move_constructible_v<Big>);` },
      { title: 'Erase-by-swap: O(1) removal when order does not matter', html: `<p>Removing index 1 from <code>[4, 9, 2, 7]</code> with <code>erase</code> shifts 2 elements. If order is irrelevant (a bag of particles, a pool of tasks), swap the victim with the last element and <code>pop_back</code>: ${H.arr([4, 7, 2], { hl: { 1: 'g' } })} One move, O(1).</p>`, code: `void unorderedErase(std::vector<int>& v, std::size_t i) {
    v[i] = std::move(v.back());   // overwrite victim with the last element
    v.pop_back();                 // drop the (now moved-from) last slot
}` }
    ],
    deepDive: `<p><b>🟣 Inside the three pointers.</b> libstdc++'s vector is literally <code>_M_start</code>, <code>_M_finish</code>, <code>_M_end_of_storage</code>: <code>size = finish − start</code>, <code>capacity = end_of_storage − start</code>. <code>sizeof(std::vector&lt;int&gt;)</code> is 24 bytes on 64-bit platforms.</p>
<p><b>Growth factor maths.</b> With factor <i>g</i>, total copies over n pushes ≤ n·(1/(g−1)) + n, so ×2 gives ≤ 2n and ×1.5 gives ≤ 3n. Why does MSVC (and Facebook's <code>folly::fbvector</code>) prefer 1.5? With ×2, the sum of all previously freed blocks (1+2+…+2<sup>k−1</sup> = 2<sup>k</sup> − 1) is always smaller than the next request 2<sup>k+1</sup>, so a simple allocator can <b>never reuse</b> the freed space for this vector. Any factor below the golden ratio (≈1.618) eventually allows reuse. Trade-off: 1.5 does more reallocations; 2 wastes up to 50% capacity.</p>
<p><b>Exception guarantees.</b> <code>push_back</code> gives the strong guarantee: if it throws, the vector is unchanged. That is why reallocation uses <code>move_if_noexcept</code>. <code>insert</code> in the middle only gives the basic guarantee unless T's moves are noexcept.</p>
<p><b>Iterator invalidation recap (vector).</b> Reallocation → all iterators, pointers and references invalid. No reallocation → insert/erase invalidate everything at or after the position, and <code>end()</code> always. <code>reserve(n)</code> with n &gt; capacity reallocates → invalidates all.</p>
<p><b><code>vector&lt;bool&gt;</code> is weird.</b> It is a space-optimised specialization storing 1 bit per element. <code>v[i]</code> returns a proxy object, not a <code>bool&amp;</code>, so <code>bool&amp; r = v[0];</code> does not compile, <code>auto x = v[0];</code> is a proxy that tracks the vector, and you cannot share elements across threads safely even at different indices. Prefer <code>vector&lt;char&gt;</code>, <code>std::bitset&lt;N&gt;</code> (fixed N) or <code>vector&lt;uint8_t&gt;</code> when you need real references or speed.</p>
<p><b>Production reality.</b> (1) Profile allocation counts with heaptrack or a custom allocator before micro-tuning. (2) <code>shrink_to_fit</code> is a <i>request</i>; the idiom <code>std::vector&lt;T&gt;(v).swap(v)</code> forces it pre-C++11. (3) Huge vectors: growth temporarily needs old + new block (3× the data at peak with ×2) — a 6 GB vector can OOM while "only" holding 2 GB. (4) <code>std::array&lt;T, N&gt;</code> for compile-time sizes (no heap), C++20 <code>std::span</code> for passing views, and C++26 adds <code>std::inplace_vector&lt;T, N&gt;</code> (fixed-capacity, no heap, vector interface).</p>`,
    aiEra: `<p><b>🤖 What AI changes:</b> Copilots write <code>vector</code> code instantly and usually correctly for the happy path. What they routinely miss is <b>lifetime across growth</b>: they will happily keep <code>auto&amp; first = v[0];</code> and then <code>push_back</code> in a loop, or store <code>&amp;nodes.back()</code> in a graph builder. Code review of generated C++ should always ask: <i>"can this vector grow while someone holds a pointer into it?"</i></p>
<p><b>Use AI as a partner:</b> ask it <code>"List every pointer/reference/iterator into a std::vector in this function and say whether a later push_back/insert/reserve can invalidate it"</code>. Ask it to add <code>reserve</code> where the final size is computable, and to explain the growth factor of your standard library. Ask for an AddressSanitizer build command (<code>-fsanitize=address -g</code>) to catch use-after-free from stale pointers.</p>
<p><b>Where AI goes wrong:</b> claims like "vector growth is always ×2" (MSVC is ×1.5), "<code>shrink_to_fit</code> always frees memory" (non-binding), "<code>reserve</code> sets the size" (it does not), and recommending <code>std::list</code> for "fast insertions" without considering cache misses.</p>
<p><b>What you must still own:</b> the amortized analysis on a whiteboard, the invalidation rules, and the judgement of when reallocation latency spikes matter (games, trading, audio threads) and must be removed with <code>reserve</code> or a fixed-capacity container.</p>`,
    problems: [{
      title: 'Build Your Own Growable Array (MyVector)',
      level: 'Medium', tags: ['vector internals', 'amortized analysis', 'design'], companies: ['Google', 'Bloomberg', 'Microsoft'],
      statement: `<p>Implement a class <code>IntVec</code> that behaves like a tiny <code>std::vector&lt;int&gt;</code>: <code>push_back(x)</code>, <code>pop_back()</code>, <code>operator[](i)</code>, <code>size()</code>, <code>capacity()</code>, <code>reserve(n)</code>, and <code>begin()/end()</code> so a range-for works. <code>push_back</code> must be <b>amortized O(1)</b>. You may not use <code>std::vector</code> inside. Memory must never leak.</p>`,
      constraints: `Up to 10<sup>6</sup> calls to <code>push_back</code>; values fit in <code>int</code>; <code>pop_back</code> on an empty IntVec must throw <code>std::out_of_range</code>.`,
      example: `<p>push_back(4), push_back(9), push_back(1) → contents ${H.arr([4, 9, 1, '·'], { hl: { 0: 'g', 1: 'g', 2: 'g' } })} size = <b>3</b>, capacity = <b>4</b>. Why 4? Capacities went 0 → 1 → 2 → 4: the third push found the block full (size 2 = capacity 2) and doubled it.</p>`,
      brute: {
        why: `<p>The naive idea: every <code>push_back</code> allocates a block exactly one bigger and copies everything. Push number k copies k−1 elements, so 10<sup>6</sup> pushes copy ≈ 5·10<sup>11</sup> ints — minutes of work instead of milliseconds. The wasted work is re-copying the same early elements again and again.</p>`,
        code: `class SlowVec {
    int* data_ = nullptr;
    std::size_t n_ = 0;
public:
    ~SlowVec() { delete[] data_; }
    void push_back(int x) {
        int* fresh = new int[n_ + 1];               // grow by exactly ONE slot
        for (std::size_t i = 0; i < n_; ++i) fresh[i] = data_[i];   // O(n) copy every time
        fresh[n_++] = x;
        delete[] data_;
        data_ = fresh;
    }
    int& operator[](std::size_t i) { return data_[i]; }
    std::size_t size() const { return n_; }
};`
      },
      mcq: { q: 'Your array is full with capacity 8 and you push one more element. What growth policy keeps push_back amortized O(1)?', options: ['Grow to 9 (exactly what is needed)', 'Grow to 8 + 100 (fixed chunk)', 'Grow to 16 (multiply by a constant > 1)', 'Grow to 64 (square it)'], answer: 2, explain: 'Any constant growth FACTOR (×1.5, ×2) makes total copying a geometric series bounded by c·n. A fixed +k chunk still gives O(n²/k) total copies; squaring wastes enormous memory.' },
      hints: [
        `<p>Hint 1: Keep two counters — <code>size_</code> (used) and <code>cap_</code> (allocated). Only allocate when they are equal.</p>`,
        `<p>Hint 2: When full, allocate <code>max(1, 2 * cap_)</code> slots, copy the old elements across, release the old block. A <code>std::unique_ptr&lt;int[]&gt;</code> releases it for you automatically and makes the class leak-proof.</p>`,
        `<p>Hint 3: Edge cases — first push (cap 0 → 1), <code>reserve(n)</code> with n ≤ cap does nothing, <code>pop_back</code> on empty throws, <code>begin()</code>/<code>end()</code> can just be raw pointers. Recipe: <i>if full → grow(2×); write at data[size++]</i>.</p>`
      ],
      solution: {
        approach: `<p>Store a heap block owned by <code>std::unique_ptr&lt;int[]&gt;</code>, plus size and capacity. <code>push_back</code> doubles the block when full, so total copying over n pushes is 1 + 2 + 4 + … &lt; 2n → amortized O(1). <code>unique_ptr</code> gives automatic cleanup (RAII) and makes the class move-only, which avoids accidental shallow copies (Rule of Zero).</p>`,
        code: `#include <memory>
#include <stdexcept>
#include <cstddef>
#include <iostream>

class IntVec {
    std::unique_ptr<int[]> buf_;   // owns the heap block, freed automatically
    std::size_t size_ = 0;         // slots in use
    std::size_t cap_ = 0;          // slots allocated

    void grow(std::size_t newCap) {
        std::unique_ptr<int[]> fresh(new int[newCap]);  // 1. bigger block
        for (std::size_t i = 0; i < size_; ++i)         // 2. carry the old values over
            fresh[i] = buf_[i];
        buf_ = std::move(fresh);                        // 3. old block released here
        cap_ = newCap;
    }

public:
    void push_back(int x) {
        if (size_ == cap_) grow(cap_ == 0 ? 1 : cap_ * 2);   // geometric growth
        buf_[size_++] = x;
    }
    void pop_back() {
        if (size_ == 0) throw std::out_of_range("pop_back on empty IntVec");
        --size_;                                   // capacity is kept, like std::vector
    }
    void reserve(std::size_t n) { if (n > cap_) grow(n); }
    int& operator[](std::size_t i) { return buf_[i]; }
    const int& operator[](std::size_t i) const { return buf_[i]; }
    std::size_t size() const { return size_; }
    std::size_t capacity() const { return cap_; }
    int* begin() { return buf_.get(); }
    int* end() { return buf_.get() + size_; }
};

int main() {
    IntVec v;
    for (int i = 0; i < 10; ++i) v.push_back(i * i);
    for (int x : v) std::cout << x << ' ';
    std::cout << "\\nsize " << v.size() << " capacity " << v.capacity() << "\\n";   // size 10 capacity 16
}`,
        dry: { head: ['call', 'size before', 'cap before', 'grow?', 'copies', 'cap after'], rows: [['push_back(4)', '0', '0', H.c('r', 'yes → 1'), '0', '1'], ['push_back(9)', '1', '1', H.c('r', 'yes → 2'), '1', '2'], ['push_back(1)', '2', '2', H.c('r', 'yes → 4'), '2', '4'], ['push_back(7)', '3', '4', H.c('g', 'no'), '0', '4'], ['push_back(5)', '4', '4', H.c('r', 'yes → 8'), '4', '8'], ['total', '', '', '4 grows', '7 copies for 5 pushes', '']] },
        complexity: `<p><code>push_back</code>: amortized O(1), worst case O(n) on the push that grows. <code>operator[]</code>: O(1). Memory: at most 2× the elements (×2 policy).</p>`,
        followUps: ['Make it a template <code>Vec&lt;T&gt;</code> that uses placement new and moves elements with <code>std::move_if_noexcept</code>.', 'Add a copy constructor (deep copy) and explain the Rule of Five.', 'Why might a real implementation choose 1.5× instead of 2×?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Iterator invalidation across containers
     ====================================================================== */
  var BUGGY_LOOP = 'for (auto it = v.begin(); it != v.end(); ++it)\n    if (*it % 2 == 0)\n        v.erase(it);          // BUG: it is now invalid\n';
  var FIXED_LOOP = 'for (auto it = v.begin(); it != v.end(); ) {\n    if (*it % 2 == 0)\n        it = v.erase(it);     // erase returns the next valid iterator\n    else\n        ++it;\n}';
  topics.push({
    title: 'Iterator Invalidation — The Bug Hunt Rules for Every Container',
    analogy: `<p>An iterator is like a <b>sticky note saying "the 3rd book on shelf B"</b>. If someone removes a book in front of it, your note now points at a <i>different</i> book. If the library moves the whole shelf to another room (reallocation), your note points at an <b>empty wall</b>. A linked list is different: each book is in its own box with a label, so removing other boxes never changes which box your note refers to.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> An <b>iterator</b> is a "bookmark" into a container (for a vector it is basically a pointer). An iterator becomes <b>invalid</b> when the thing it points to has moved or died. Using an invalid iterator, pointer or reference is <b>undefined behaviour (UB)</b>: the program may seem to work, skip elements, print garbage, loop forever or crash — and it can change between compilers and builds.</p>
<p><b>The one-line rule per container family:</b></p>
${H.table(['container', 'insert', 'erase', 'mental model'], [
  ['<code>vector</code>, <code>string</code>', 'reallocation → <b>all</b> invalid; otherwise everything at/after the insert point', 'everything at/after the erased element (and <code>end()</code>)', 'one contiguous block that shifts and moves'],
  ['<code>deque</code>', 'at either end: all <b>iterators</b> invalid but <b>references stay valid</b>; in the middle: everything invalid', 'at the front/back: only the erased (+ <code>end()</code> for back); middle: everything', 'blocks that never move + a map of pointers that may'],
  ['<code>list</code>, <code>forward_list</code>', '<b>nothing</b> invalidated', 'only the erased element', 'independent nodes'],
  ['<code>set</code>, <code>map</code>, multi-*', '<b>nothing</b> invalidated', 'only the erased element', 'tree nodes that never move'],
  ['<code>unordered_*</code>', 'if it <b>rehashes</b>: all iterators invalid, <b>references/pointers stay valid</b>; otherwise none', 'only the erased element', 'nodes that never move, bucket array that can be rebuilt'],
  ['<code>stack/queue/priority_queue</code>', '—', '—', 'adapters: no iterators at all']])}
<p><b>The #1 interview bug — erasing inside a range loop:</b></p>
<pre>for (auto it = v.begin(); it != v.end(); ++it)
    if (*it % 2 == 0) v.erase(it);   // it is dead; ++it is UB</pre>
<p>After <code>erase(it)</code>, <code>it</code> is invalid. In practice (on a vector) it now "sees" the next element, and then <code>++it</code> <b>skips</b> it — and if the erased element was last, <code>++it</code> runs past <code>end()</code> forever. The fix uses the iterator that <code>erase</code> <b>returns</b>:</p>
<pre>for (auto it = v.begin(); it != v.end(); )
    if (*it % 2 == 0) it = v.erase(it); else ++it;</pre>
<p>…or better, let the library do it in one O(n) pass: <code>std::erase_if(v, pred);</code> (C++20) or the classic <b>erase–remove idiom</b> <code>v.erase(std::remove_if(v.begin(), v.end(), pred), v.end());</code>.</p>
<p><b>Other classic traps:</b> holding <code>auto&amp; x = v[0]</code> and then <code>push_back</code>; range-for over a vector while pushing into it; storing <code>&amp;v.back()</code> as a "stable" pointer; <code>map.erase(it)</code> and then <code>++it</code>.</p>`,
    clues: [
      '"the loop skips elements" / "works on my machine, crashes in CI" → erase or insert inside an iterator loop',
      '"remove all elements that satisfy X" → <code>std::erase_if</code> or erase–remove, never erase in a for loop with <code>++it</code>',
      '"store pointers to elements, then keep adding" → vector reallocation; switch to indices, <code>deque</code> (push at ends), <code>list</code>, or reserve',
      '"modify a map while iterating it" → <code>it = m.erase(it)</code>; inserting is safe for map but may rehash unordered_map',
      '"AddressSanitizer: heap-use-after-free" in a container loop → invalidated iterator/reference',
      '"segfault only with large inputs" → reallocation/rehash only happens past a size threshold'
    ],
    code: [`#include <vector>
#include <map>
#include <algorithm>
#include <iostream>

int main() {
    // 1) vector: three correct ways to delete all even numbers
    std::vector<int> v = {2, 4, 5, 6, 7, 8};
    for (auto it = v.begin(); it != v.end(); ) {
        if (*it % 2 == 0) it = v.erase(it);   // use the returned iterator
        else ++it;
    }                                           // O(n^2) worst case: each erase shifts

    std::vector<int> w = {2, 4, 5, 6, 7, 8};
    w.erase(std::remove_if(w.begin(), w.end(), [](int x) { return x % 2 == 0; }), w.end());   // O(n)

    std::vector<int> u = {2, 4, 5, 6, 7, 8};
    std::size_t removed = std::erase_if(u, [](int x) { return x % 2 == 0; });                 // C++20, O(n)

    // 2) map: erase while iterating (only the erased node dies)
    std::map<std::string, int> stock = {{"apple", 0}, {"kiwi", 5}, {"plum", 0}};
    for (auto it = stock.begin(); it != stock.end(); ) {
        if (it->second == 0) it = stock.erase(it);
        else ++it;
    }
    std::erase_if(stock, [](const auto& kv) { return kv.second == 0; });   // C++20 also works on maps

    std::cout << v.size() << ' ' << w.size() << ' ' << u.size() << ' ' << removed << ' ' << stock.size() << "\\n";   // 2 2 2 4 1
}`, `#include <vector>
#include <iostream>

int main() {
    std::vector<int> v = {1, 2, 3};
    int& first = v[0];             // reference into the current block
    int* p = &v[1];                // pointer into the current block
    auto it = v.begin();           // iterator into the current block
    v.push_back(4);                // capacity was 3 -> REALLOCATION -> all three are dangling
    // std::cout << first << *p << *it;   // undefined behaviour: reads freed memory

    // Safe alternatives:
    std::size_t idx = 0;           // indices survive reallocation
    v.push_back(5);
    std::cout << v[idx] << "\\n";   // always fine
    v.reserve(100);                // or reserve BEFORE taking references, and never exceed it
    int& stable = v[0];
    for (int i = 0; i < 50; ++i) v.push_back(i);   // 55 <= 100: no reallocation, stable stays valid
    std::cout << stable << "\\n";
}`],
    codeTitle: ['Erasing while iterating — correct patterns', 'Dangling after push_back — and the safe alternatives'],
    viz: [{
      title: 'Bug hunt: erase inside a for loop (buggy run, then fixed run)',
      input: '2 4 5 6 7 9',
      inputLabel: 'Vector values (remove the even ones)',
      gen: function (input) {
        var a0 = intsOf(clean(input) || '2 4 5 6 7 9', 2, 10, -99, 99, 'Enter 2–10 integers separated by spaces, e.g. 2 4 5 6 7 9');
        var frames = [], a = a0.slice(), i = 0, steps = 0, skipped = [];
        frames.push({ narr: '<b>Buggy version.</b> Goal: delete every even number from [' + a0.join(', ') + ']. Watch what <code>++it</code> does right after an <code>erase</code>.', parts: [codePart(BUGGY_LOOP, { 1: 'cur' }, 'Buggy loop'), { type: 'array', label: 'v', values: a.slice(), ptr: one(0, 'it') }] });
        while (steps < 30) {
          steps++;
          if (i >= a.length) {
            if (i === a.length) { frames.push({ narr: '<code>it == v.end()</code> — the loop stops this time, but only by luck.', parts: [codePart(BUGGY_LOOP, { 1: 'ok' }, 'Buggy loop'), { type: 'array', label: 'v', values: a.concat(['end']), ptr: one(i, 'it'), hl: one(i, 'win') }] }); }
            else { frames.push({ narr: '<span class="c-r"><b>it walked PAST end()</b></span>. The last element was erased, <code>it</code> then sat on <code>end()</code>, and <code>++it</code> jumped beyond it. <code>it != v.end()</code> is now true forever → the loop reads random memory: <b>undefined behaviour / crash</b>.', parts: [codePart(BUGGY_LOOP, { 1: 'bad' }, 'Buggy loop'), { type: 'array', label: 'v (+ garbage beyond end)', values: a.concat(['end', '??']), ptr: one(i, 'it'), hl: (function () { var h = {}; h[a.length] = 'win'; h[a.length + 1] = 'bad'; return h; })() }] }); }
            break;
          }
          var x = a[i];
          if (x % 2 === 0) {
            var before = a.slice();
            a.splice(i, 1);
            frames.push({ narr: '*it = <b>' + x + '</b> is even → <code>v.erase(it)</code>. Everything after it shifts left by one. The old <code>it</code> is formally <b>invalid</b>; in practice it now points at <b>' + (i < a.length ? a[i] : 'end()') + '</b> — an element we have NOT checked yet.', parts: [codePart(BUGGY_LOOP, { 3: 'bad' }, 'Buggy loop'), { type: 'array', label: 'before erase', values: before, hl: one(i, 'bad') }, { type: 'array', label: 'after erase (shifted)', values: a.slice(), ptr: i < a.length ? one(i, 'it (stale)') : {}, hl: i < a.length ? one(i, 'cur') : {} }] });
            if (i < a.length) skipped.push(a[i]);
            frames.push({ narr: '<code>++it</code> moves on <span class="c-r">and skips ' + (i < a.length ? '<b>' + a[i] + '</b> without ever testing it' : 'past the end') + '</span>.', parts: [codePart(BUGGY_LOOP, { 1: 'bad' }, 'Buggy loop'), { type: 'array', label: 'v', values: i + 1 <= a.length ? a.concat(i + 1 === a.length ? ['end'] : []) : a.concat(['end', '??']), ptr: one(i + 1, 'it'), hl: i < a.length ? one(i, 'bad') : {} }] });
            i++;
          } else {
            frames.push({ narr: '*it = <b>' + x + '</b> is odd → keep it, <code>++it</code>.', parts: [codePart(BUGGY_LOOP, { 2: 'cur' }, 'Buggy loop'), { type: 'array', label: 'v', values: a.slice(), ptr: one(i, 'it'), hl: one(i, 'ok') }] });
            i++;
          }
        }
        frames.push({ narr: 'Buggy result: [' + a.join(', ') + ']. ' + (skipped.length ? 'Skipped without checking: <b>' + skipped.join(', ') + '</b>' + (skipped.some(function (z) { return z % 2 === 0; }) ? ' — some evens survived!' : '.') : 'Nothing skipped this time, but it was still UB.') + ' Now the <b>fixed</b> loop.', parts: [{ type: 'array', label: 'buggy result', values: a.length ? a.slice() : ['(empty)'], hl: (function () { var h = {}; a.forEach(function (z, k) { if (z % 2 === 0) h[k] = 'bad'; }); return h; })() }, note('Iterator invalidation bugs often "almost work", which is why they reach production.', 'Lesson')] });
        a = a0.slice(); i = 0;
        frames.push({ narr: '<b>Fixed version:</b> <code>it = v.erase(it)</code> returns a valid iterator to the element that slid into the gap; we only <code>++it</code> when we did <b>not</b> erase.', parts: [codePart(FIXED_LOOP, { 1: 'cur' }, 'Fixed loop'), { type: 'array', label: 'v', values: a.slice(), ptr: one(0, 'it') }] });
        while (i < a.length) {
          if (a[i] % 2 === 0) {
            var y = a[i]; a.splice(i, 1);
            frames.push({ narr: '<b>' + y + '</b> is even → <code>it = v.erase(it)</code>. The returned iterator points at <b>' + (i < a.length ? a[i] : 'end()') + '</b>, which will be checked next — nothing skipped.', parts: [codePart(FIXED_LOOP, { 3: 'ok' }, 'Fixed loop'), { type: 'array', label: 'v', values: a.concat(i === a.length ? ['end'] : []), ptr: one(i, 'it'), hl: one(i, 'cur') }] });
          } else {
            frames.push({ narr: '<b>' + a[i] + '</b> is odd → <code>++it</code>.', parts: [codePart(FIXED_LOOP, { 5: 'cur' }, 'Fixed loop'), { type: 'array', label: 'v', values: a.slice(), ptr: one(i, 'it'), hl: one(i, 'ok') }] });
            i++;
          }
        }
        frames.push({ narr: 'Correct result: [' + a.join(', ') + ']. Even better: <code>std::erase_if(v, isEven)</code> does it in <b>one O(n) pass</b> (each kept element moves at most once) instead of O(n²) repeated shifting.', parts: [{ type: 'array', label: 'fixed result', values: a.length ? a.slice() : ['(empty)'], hl: hlRange(0, a.length - 1, 'ok') }, codePart('std::erase_if(v, [](int x) { return x % 2 == 0; });', { 1: 'ok' }, 'Best (C++20)')] });
        return frames;
      }
    }, {
      title: 'Invalidation rules matrix — what survives each operation?',
      gen: function () {
        var cols = ['push_back / insert', 'insert (middle)', 'erase (middle)', 'rehash / realloc'];
        var rowsH = ['vector', 'deque', 'list', 'map / set', 'unordered_map'];
        var rows = [
          ['all if realloc, else at/after pos', 'at/after pos (all if realloc)', 'at/after pos', 'ALL'],
          ['iterators: all · refs: OK', 'ALL', 'ALL', 'n/a (no realloc of blocks)'],
          ['none', 'none', 'only erased', 'n/a'],
          ['none', 'none', 'only erased', 'n/a'],
          ['iterators if rehash · refs: OK', 'iterators if rehash · refs: OK', 'only erased', 'iterators: ALL · refs: OK']];
        var why = [
          'vector: one contiguous block. Growth copies everything to a new block → every pointer/iterator/reference dies. Without growth, elements after the insert/erase point shift → those die.',
          'deque: elements live in fixed blocks that never move, so <b>references</b> survive push_front/push_back. But the iterator also refers to the block <i>map</i>, which may be reallocated → iterators die. Middle insert/erase shuffles elements → everything dies.',
          'list: every element is its own heap node. Inserting or erasing other nodes just rewires prev/next pointers; only the erased node itself dies. splice() even keeps iterators valid while moving nodes to another list.',
          'map/set: red-black tree nodes. Rotations rewire pointers but never move a node in memory, so only erased nodes die. That is why the "erase while iterating" pattern with it = m.erase(it) is safe.',
          'unordered_map: nodes never move (references and pointers stay valid), but a rehash rebuilds the bucket array and the iteration order, so iterators die. reserve(n) up front prevents rehash during inserts.'];
        var frames = [{ narr: 'The whole rulebook on one grid. Rows = containers, columns = operations. Let us walk it row by row.', parts: [{ type: 'grid', label: 'What gets invalidated', rowHead: rowsH, colHead: cols, rows: rows }] }];
        rowsH.forEach(function (r, ri) {
          var h = {};
          for (var c = 0; c < cols.length; c++) {
            var cell = rows[ri][c];
            h[ri + ',' + c] = /none|n\/a/.test(cell) ? 'ok' : /ALL/.test(cell) && !/refs: OK/.test(cell) ? 'bad' : 'cur';
          }
          frames.push({ narr: '<b>' + r + '</b> — ' + why[ri], parts: [{ type: 'grid', label: 'green = safe, amber = partly, red = everything dies', rowHead: rowsH, colHead: cols, rows: rows, hl: h }] });
        });
        frames.push({ narr: 'Memory trick: <b>contiguous</b> containers (vector, string) invalidate the most, <b>node-based</b> containers (list, map, set, unordered_*) invalidate only what you erase — at the price of one heap allocation per element and poorer cache locality.', parts: [{ type: 'grid', label: 'What gets invalidated', rowHead: rowsH, colHead: cols, rows: rows, hl: { '2,0': 'ok', '2,1': 'ok', '3,0': 'ok', '3,1': 'ok', '0,3': 'bad' } }, note('Adapters (stack, queue, priority_queue) expose no iterators, so there is nothing to invalidate.', 'Bonus')] });
        return frames;
      }
    }],
    examples: [
      { title: 'Range-for while pushing into the same vector', html: `<p><code>for (int x : v) if (x &gt; 0) v.push_back(-x);</code> — a range-for caches <code>begin()</code> and <code>end()</code> once. The first reallocation frees the block those cached iterators point into. Result: UB (often an infinite loop or garbage). Fix: loop by index over the <b>original</b> size.</p>`, code: `std::vector<int> v = {1, -2, 3};
const std::size_t n = v.size();          // snapshot the size first
for (std::size_t i = 0; i < n; ++i)
    if (v[i] > 0) v.push_back(-v[i]);    // indexing survives reallocation` },
      { title: 'Graph builder storing pointers to vector elements', html: `<p>A builder does <code>nodes.push_back(Node{...}); Node* p = &amp;nodes.back(); edges.push_back(p);</code>. After a few pushes the vector reallocates and every stored <code>Node*</code> dangles. Three fixes: store <b>indices</b> (best: smaller, serialisable), use <code>std::deque&lt;Node&gt;</code> and only <code>push_back</code> (references stay valid), or <code>vector&lt;unique_ptr&lt;Node&gt;&gt;</code> (nodes never move, the pointers to them are what get moved).</p>`, code: `struct Node { int id; std::vector<int> adj; };   // adj holds INDICES, not Node*
std::vector<Node> nodes;
int addNode(int id) { nodes.push_back({id, {}}); return (int)nodes.size() - 1; }
void addEdge(int a, int b) { nodes[a].adj.push_back(b); }` },
      { title: 'multiset: erase(value) vs erase(iterator)', html: `<p><code>std::multiset&lt;int&gt; s = {5, 5, 5};</code> → <code>s.erase(5)</code> removes <b>all three</b> and returns 3. To remove one copy: <code>s.erase(s.find(5))</code> (check <code>find != end()</code> first — erasing <code>end()</code> is UB). This shows up constantly in sliding-window-median solutions.</p>`, code: `std::multiset<int> s = {5, 5, 5};
if (auto it = s.find(5); it != s.end()) s.erase(it);   // removes exactly one 5
std::cout << s.size() << "\\n";                          // 2` },
      { title: 'unordered_map: references survive rehash, iterators do not', html: `<p>Holding <code>int&amp; r = m["a"];</code> and then inserting 10,000 keys is <b>safe</b>: nodes never move, so <code>r</code> still refers to the same value. Holding <code>auto it = m.find("a");</code> across those inserts and then doing <code>++it</code> is <b>not</b> safe, because the rehash rebuilt the bucket links that iterators walk. Use <code>m.reserve(n)</code> before the loop if you must keep iterators.</p>` }
    ],
    deepDive: `<p><b>🟣 Why the rules are what they are.</b> The standard lists invalidation per member function (e.g. [vector.modifiers], [deque.modifiers], [unord.req]). They fall straight out of memory layout: contiguous storage must shift or move; node-based storage just rewires pointers. Memorise the layout, not the table.</p>
<p><b>deque's split personality.</b> A deque iterator holds four pointers: current element, first and last of its block, and a pointer into the <i>map</i> of blocks. <code>push_back</code> may reallocate the map (invalidating the map pointer inside every iterator) but never moves blocks, so element references stay valid. That is why "<code>deque</code> + only push at the ends" is a legitimate way to get a growable sequence with stable references.</p>
<p><b>Debug modes catch it.</b> Build with <code>-D_GLIBCXX_DEBUG</code> (libstdc++), <code>-D_LIBCPP_ENABLE_ASSERTIONS</code>/hardening modes (libc++), or MSVC's <code>_ITERATOR_DEBUG_LEVEL=2</code>: every iterator remembers its container and a version count, and using a stale one aborts with a clear message instead of silently corrupting memory. AddressSanitizer catches use-after-free when the old block was freed; it may <i>not</i> catch the "shifted but same block" case — debug iterators do.</p>
<p><b>Complexity trap.</b> The "correct" <code>it = v.erase(it)</code> loop is O(n²) when many elements are removed (each erase shifts the tail). <code>remove_if</code> is a single forward pass that compacts kept elements to the front (stable, O(n)), then one <code>erase</code> chops the tail. For <code>list</code>, use the member <code>remove_if</code> (O(n), no shifting). C++20's <code>std::erase</code>/<code>std::erase_if</code> pick the right strategy per container and return how many were removed.</p>
<p><b>Ranges and views.</b> A <code>std::views::filter</code> over a vector caches its first <code>begin()</code>; mutating the vector afterwards invalidates the view's cache too. Views are references to data, so all the same lifetime rules apply — plus "don't return a view of a local container".</p>`,
    aiEra: `<p><b>🤖 What AI changes:</b> Generated code often contains the classic <code>erase</code>-in-a-<code>for</code> bug, especially when translated from Python or Java (where removing during iteration throws <code>ConcurrentModificationException</code> instead of silently corrupting). AI is also fond of returning <code>std::string_view</code> or spans into temporaries.</p>
<p><b>Use AI as a partner:</b> paste a function and ask: <code>"For each container in this code, list every iterator, pointer and reference that is alive across a mutating call, and the invalidation rule that applies."</code> Ask it to rewrite manual erase loops as <code>std::erase_if</code>. Ask for a CI job with <code>-fsanitize=address,undefined</code> and <code>-D_GLIBCXX_DEBUG</code>.</p>
<p><b>Where AI goes wrong:</b> it may say deque <code>push_back</code> "invalidates all references" (it does not), or that unordered_map insertion "never invalidates anything" (rehash kills iterators). It sometimes "fixes" a skip bug by adding <code>--it</code>, which is UB at <code>begin()</code>.</p>
<p><b>What you must still own:</b> reading a loop and instantly seeing the invalidation, knowing which sanitizer or debug mode proves it, and choosing a data layout (indices, stable containers, reserve) that makes the bug impossible by design.</p>`,
    problems: [{
      title: 'Bug Hunt: Remove All Occurrences In Place',
      level: 'Easy', tags: ['vector', 'iterator invalidation', 'erase-remove'], companies: ['Amazon', 'Adobe', 'Qualcomm'],
      statement: `<p>A teammate wrote this to delete every occurrence of <code>val</code> from a <code>std::vector&lt;int&gt;</code>:</p>
<pre>void removeAll(std::vector&lt;int&gt;&amp; v, int val) {
    for (auto it = v.begin(); it != v.end(); ++it)
        if (*it == val) v.erase(it);
}</pre>
<p>It passes some tests and fails or crashes on others. Explain the bug, then write a correct version that runs in <b>O(n)</b> and returns how many elements were removed. Relative order of the kept elements must be preserved.</p>`,
      constraints: `0 ≤ n ≤ 10<sup>6</sup>; values fit in <code>int</code>.`,
      example: `<p>v = ${H.arr([3, 2, 2, 3, 4, 3], { hl: { 0: 'r', 3: 'r', 5: 'r' } })}, val = 3 → v becomes ${H.arr([2, 2, 4], { hl: { 0: 'g', 1: 'g', 2: 'g' } })}, return <b>3</b>. The buggy loop on <code>[3, 3, 1]</code> erases the first 3, then <code>++it</code> skips the second 3 — leaving <code>[3, 1]</code>. On <code>[1, 3]</code> it erases the last element and then increments past <code>end()</code>: UB.</p>`,
      brute: {
        why: `<p>Fixing the iterator bug with <code>it = v.erase(it)</code> makes the loop <b>correct</b> but still slow: each erase shifts the whole tail left. Removing k elements costs O(n·k), which is O(n²) when most elements match (10<sup>12</sup> moves for n = 10<sup>6</sup>).</p>`,
        code: `int removeAllSlow(std::vector<int>& v, int val) {
    int removed = 0;
    for (auto it = v.begin(); it != v.end(); ) {
        if (*it == val) { it = v.erase(it); ++removed; }   // correct, but O(n) shift per erase
        else ++it;
    }
    return removed;
}`
      },
      mcq: { q: 'Right after <code>v.erase(it)</code> on a vector, what is true about <code>it</code>?', options: ['It still points at the erased value', 'It is invalid; you must use the iterator returned by erase', 'It automatically points at the previous element', 'It equals v.end()'], answer: 1, explain: 'erase invalidates iterators at and after the erased position. The only valid continuation is the iterator erase returns (pointing at the element that followed the erased one).' },
      hints: [
        `<p>Hint 1: Instead of deleting one at a time, think "keep" — copy every element you want to keep to the front, in order, with a write pointer.</p>`,
        `<p>Hint 2: That is exactly <code>std::remove(first, last, val)</code>: it returns the new logical end; the elements after it are leftovers. Then one <code>erase(newEnd, v.end())</code> chops them. In C++20 <code>std::erase(v, val)</code> does both and returns the count.</p>`,
        `<p>Hint 3: Edge cases: empty vector, nothing matches (remove returns <code>end()</code>, erase of an empty range is fine), everything matches. Recipe: <i>w = 0; for r in 0..n-1: if v[r] != val: v[w++] = v[r]; resize(w)</i>.</p>`
      ],
      solution: {
        approach: `<p>Two-pointer compaction: a read index scans every element, a write index marks where the next kept element goes. Each element moves at most once → O(n). <code>std::remove</code> implements exactly this; <code>erase</code> then shrinks the size. The C++20 one-liner <code>std::erase(v, val)</code> returns the number removed.</p>`,
        code: `#include <vector>
#include <algorithm>
#include <iostream>

// C++20 one-liner
std::size_t removeAll20(std::vector<int>& v, int val) {
    return std::erase(v, val);
}

// Classic erase-remove idiom (C++98 .. C++17)
std::size_t removeAllClassic(std::vector<int>& v, int val) {
    auto newEnd = std::remove(v.begin(), v.end(), val);   // compacts kept elements to the front
    std::size_t removed = static_cast<std::size_t>(v.end() - newEnd);
    v.erase(newEnd, v.end());                             // one erase of the leftover tail
    return removed;
}

// What std::remove does inside: read/write pointers
std::size_t removeAllManual(std::vector<int>& v, int val) {
    std::size_t w = 0;
    for (std::size_t r = 0; r < v.size(); ++r)
        if (v[r] != val) v[w++] = v[r];
    std::size_t removed = v.size() - w;
    v.resize(w);
    return removed;
}

int main() {
    std::vector<int> v = {3, 2, 2, 3, 4, 3};
    std::cout << removeAllClassic(v, 3) << "\\n";   // 3
    for (int x : v) std::cout << x << ' ';          // 2 2 4
}`,
        dry: { head: ['r', 'v[r]', 'keep?', 'w after', 'front of v'], rows: [['0', '3', H.c('r', 'no'), '0', '[ ]'], ['1', '2', H.c('g', 'yes'), '1', '[2]'], ['2', '2', H.c('g', 'yes'), '2', '[2,2]'], ['3', '3', H.c('r', 'no'), '2', '[2,2]'], ['4', '4', H.c('g', 'yes'), '3', '[2,2,4]'], ['5', '3', H.c('r', 'no'), '3', '[2,2,4] → resize(3)']] },
        complexity: `<p>Time O(n): each element is read once and moved at most once. Extra space O(1). Capacity is unchanged (call <code>shrink_to_fit</code> if memory matters).</p>`,
        followUps: ['Do the same for a <code>std::list</code> — which member function avoids shifting entirely?', 'What if order does not matter? (swap-with-back, still O(n) but fewer moves)', 'Remove duplicates from a sorted vector with <code>std::unique</code> + erase.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — std::deque: blocks + a map of pointers
     ====================================================================== */
  topics.push({
    title: 'std::deque — Fast at Both Ends with Fixed Blocks',
    analogy: `<p>Picture a <b>train of fixed-size carriages</b> plus a <b>conductor's clipboard</b> listing the carriages in order. Passengers board at the very front or very back. When the front carriage is full, a new carriage is <b>coupled on the front</b> — nobody already seated has to move. When the clipboard runs out of lines, the conductor copies the list onto a <b>longer clipboard</b>; the carriages themselves stay exactly where they are.</p>
<p>Carriages = <b>blocks</b>, clipboard = the deque's <b>map</b> (an array of block pointers), seated passengers = elements whose <b>references stay valid</b>.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> <code>std::deque&lt;T&gt;</code> ("double-ended queue", say "deck") gives you <b>O(1) push and pop at both ends</b> <i>and</i> <b>O(1) random access</b> with <code>d[i]</code>. A vector only gives cheap operations at the back; inserting at the front of a vector shifts everything.</p>
<p><b>How it pulls that off:</b> elements are <b>not</b> in one big block. They live in many small fixed-size blocks (libstdc++: 512 bytes each → 128 ints; libc++: 4096 bytes; MSVC: just 16 bytes!). A small array called the <b>map</b> holds pointers to the blocks in order.</p>
${H.table(['map slot', 'points to', 'contents'], [['0', '(unused)', ''], ['1', 'block A', '<code>· · 7 8</code> ← front lives here'], ['2', 'block B', '<code>9 4 1 6</code>'], ['3', 'block C', '<code>2 5 · ·</code> ← back lives here'], ['4', '(unused)', '']])}
<ul>
<li><b>push_front</b>: write into the free slot before the first element; if block A is full on the left, allocate a new block and put its pointer in map slot 0.</li>
<li><b>push_back</b>: symmetrical, to the right.</li>
<li><b>d[i]</b>: offset = (position of the first element in its block) + i → block number = offset / B, slot = offset % B. Two memory hops instead of one, so slower than vector but still O(1).</li>
<li>When the map itself runs out of slots, a <b>new, bigger map</b> is allocated and the <b>pointers</b> are copied — blocks (and therefore your elements) never move.</li>
</ul>
<p><b>What you give up versus vector:</b> no <code>reserve()</code>, no <code>data()</code> (memory is not contiguous, you cannot pass it to a C API), slower iteration (block jumps), insert/erase in the <b>middle</b> is still O(n), and each deque carries some fixed overhead (an empty libstdc++ deque already allocates a map and one block).</p>
<p><b>Where deque shines:</b> sliding-window problems (monotonic deque), BFS queues, 0-1 BFS (push weight-0 edges to the front), "undo history with a maximum length", work-stealing schedulers, and as the default container under <code>std::stack</code> and <code>std::queue</code>.</p>`,
    clues: [
      '"add/remove at both ends" or "front and back" → <code>deque</code>',
      '"maximum/minimum of every window of size k" → monotonic <code>deque</code> of indices, O(n)',
      '"0-1 BFS" / "edges of weight 0 or 1" → <code>deque</code>: weight 0 → push_front, weight 1 → push_back',
      '"need random access AND fast push_front" → deque, not vector',
      '"keep references to elements stable while appending" → deque with only push_back/push_front',
      '"sliding window / last k events" with eviction from the front → deque or queue'
    ],
    code: [`#include <deque>
#include <iostream>

int main() {
    std::deque<int> d = {3, 4};
    d.push_front(2);        // [2, 3, 4]   O(1)
    d.push_front(1);        // [1, 2, 3, 4]
    d.push_back(5);         // [1, 2, 3, 4, 5]
    d.emplace_front(0);     // [0, 1, 2, 3, 4, 5]
    std::cout << d[3] << ' ' << d.front() << ' ' << d.back() << "\\n";   // 3 0 5
    d.pop_front();          // [1, 2, 3, 4, 5]
    d.pop_back();           // [1, 2, 3, 4]

    int& ref = d[1];        // reference to the element 2
    for (int i = 0; i < 1000; ++i) d.push_back(i);   // many new blocks, maybe a new map...
    std::cout << ref << "\\n";                        // still 2: references survive end-insertions
    // ...but any iterator taken before the loop is now invalid.
}`, `#include <deque>
#include <vector>
#include <utility>
#include <climits>

// 0-1 BFS on a grid: moving onto '.' costs 0, breaking a wall '#' costs 1.
int minWallsToBreak(const std::vector<std::string>& g) {
    int R = g.size(), C = g[0].size();
    std::vector<std::vector<int>> dist(R, std::vector<int>(C, INT_MAX));
    std::deque<std::pair<int, int>> dq;
    dist[0][0] = 0;
    dq.push_back({0, 0});
    const int dr[] = {1, -1, 0, 0}, dc[] = {0, 0, 1, -1};
    while (!dq.empty()) {
        auto [r, c] = dq.front();
        dq.pop_front();
        for (int k = 0; k < 4; ++k) {
            int nr = r + dr[k], nc = c + dc[k];
            if (nr < 0 || nc < 0 || nr >= R || nc >= C) continue;
            int w = g[nr][nc] == '#' ? 1 : 0;
            if (dist[r][c] + w < dist[nr][nc]) {
                dist[nr][nc] = dist[r][c] + w;
                if (w == 0) dq.push_front({nr, nc});   // cheaper: process first
                else        dq.push_back({nr, nc});
            }
        }
    }
    return dist[R - 1][C - 1];
}`],
    codeTitle: ['deque basics and reference stability', '0-1 BFS: the textbook deque algorithm'],
    viz: [{
      title: 'Inside a deque: blocks (rows) + the map of block pointers',
      input: 'b1 b2 b3 b4 b5 f0 f-1 f-2 f-3 f-4 b6 F B',
      inputLabel: 'Ops: bX = push_back(X), fX = push_front(X), B = pop_back, F = pop_front (block size 4)',
      gen: function (input) {
        var hint = 'Use tokens like b5 (push_back 5), f3 (push_front 3), B (pop_back), F (pop_front). Max 24 ops.';
        var toks = (clean(input) || 'b1 b2 b3 b4 b5 f0 f-1 f-2 f-3 f-4 b6 F B').split(/[\s,]+/);
        if (toks.length > 24) throw new Error(hint);
        var ops = toks.map(function (t) {
          if (t === 'B' || t === 'F') return { k: t };
          var m = /^([bf])(-?\d{1,3})$/.exec(t);
          if (!m) throw new Error(hint);
          return { k: m[1], v: Number(m[2]) };
        });
        var BS = 4, M = 4, map = [], ids = [], nextId = 0, frames = [];
        for (var q = 0; q < M; q++) { map.push(null); ids.push(null); }
        var mid = Math.floor((M - 1) / 2);
        map[mid] = [null, null, null, null]; ids[mid] = 'A'; nextId = 1;
        var sb = mid, ss = 0, fb = mid, fs = 0, size = 0;
        function letter() { return String.fromCharCode(65 + (nextId++ % 26)); }
        function gridPart(hl, lbl) {
          var rows = [], rh = [];
          for (var i = 0; i < M; i++) {
            rh.push('map[' + i + '] → ' + (map[i] ? 'block ' + ids[i] : '(unused)'));
            var r = [];
            for (var j = 0; j < BS; j++) r.push(map[i] ? (map[i][j] === null ? '·' : map[i][j]) : '—');
            rows.push(r);
          }
          return { type: 'grid', label: lbl || 'blocks of 4 (rows) in map order', rowHead: rh, colHead: ['slot 0', 'slot 1', 'slot 2', 'slot 3'], rows: rows, hl: hl || {} };
        }
        function logical() {
          var out = [], b = sb, s = ss;
          for (var k = 0; k < size; k++) { if (s === BS) { s = 0; b++; } out.push(map[b][s]); s++; }
          return { type: 'array', label: 'what you see: d[0..' + (size - 1) + ']', values: out.length ? out : ['(empty)'] };
        }
        function vars() { return { type: 'vars', label: 'deque bookkeeping', vals: { size: size, 'map size': M, 'front at': 'map[' + sb + '] slot ' + ss, 'back end at': 'map[' + fb + '] slot ' + fs, 'blocks allocated': map.filter(function (x) { return x; }).length } }; }
        function growMap(needFront) {
          var used = fb - sb + 1;
          var newM = M * 2, need = used + 1;
          var newStart = Math.floor((newM - need) / 2) + (needFront ? 1 : 0);
          var nm = [], ni = [];
          for (var i = 0; i < newM; i++) { nm.push(null); ni.push(null); }
          for (var b = sb; b <= Math.min(fb, M - 1); b++) { nm[newStart + b - sb] = map[b]; ni[newStart + b - sb] = ids[b]; }
          var shift = newStart - sb;
          sb += shift; fb += shift; map = nm; ids = ni; M = newM;
          frames.push({ narr: '<span class="c-y">The map is out of slots on the ' + (needFront ? 'left' : 'right') + '.</span> Allocate a new map of <b>' + newM + '</b> pointers and copy the block pointers into its middle. <b>No element moved</b> — every <code>T&amp;</code> is still valid — but every iterator (which remembers its map slot) is now invalid.', parts: [gridPart({}, 'after map reallocation (blocks untouched)'), logical(), vars()] });
        }
        frames.push({ narr: 'A fresh deque: a map with ' + M + ' pointer slots and one empty block (A) in the middle, so it can grow in <b>both</b> directions. (Real libstdc++: map of 8, blocks of 512 bytes.)', parts: [gridPart(), logical(), vars()] });
        ops.forEach(function (op) {
          var h = {};
          if (op.k === 'b') {
            var newBlock = false;
            if (fs === BS) {
              if (fb + 1 >= M) growMap(false);
              fb++; fs = 0; map[fb] = [null, null, null, null]; ids[fb] = letter(); newBlock = true;
            }
            map[fb][fs] = op.v; h[fb + ',' + fs] = 'ok'; fs++; size++;
            frames.push({ narr: 'push_back(<b>' + op.v + '</b>)' + (newBlock ? ': the last block was full → allocate <b>block ' + ids[fb] + '</b> and hook it into map[' + fb + ']. Older elements did not move.' : ': there is room in the back block, just write it. O(1).'), parts: [gridPart(h), logical(), vars()] });
          } else if (op.k === 'f') {
            var nb = false;
            if (ss === 0 && size > 0) {
              if (sb - 1 < 0) growMap(true);
              sb--; ss = BS; map[sb] = [null, null, null, null]; ids[sb] = letter(); nb = true;
            } else if (size === 0) { ss = 0; fs = 0; fb = sb; }
            if (size > 0) ss--; else fs = 1;
            map[sb][ss] = op.v; h[sb + ',' + ss] = 'ok'; size++;
            frames.push({ narr: 'push_front(<b>' + op.v + '</b>)' + (nb ? ': no room to the left of the first element → allocate <b>block ' + ids[sb] + '</b>, put it in map[' + sb + '] and fill it from its <b>right</b> end. Nothing shifted — this is why deque push_front is O(1) while vector insert(begin) is O(n).' : ': there is a free slot just before the current front, write it there.'), parts: [gridPart(h), logical(), vars()] });
          } else if (op.k === 'B') {
            if (!size) { frames.push({ narr: 'pop_back() on an <b>empty</b> deque is undefined behaviour — always check <code>empty()</code> first. Skipped.', parts: [gridPart(), logical(), vars()] }); return; }
            fs--; var gone = map[fb][fs]; map[fb][fs] = null; size--; h[fb + ',' + fs] = 'bad';
            var freed = '';
            if (fs === 0 && fb > sb) { freed = ' Block ' + ids[fb] + ' is now empty → freed.'; map[fb] = null; ids[fb] = null; fb--; fs = BS; }
            frames.push({ narr: 'pop_back() removes <b>' + gone + '</b>.' + freed + ' Only iterators/references to the removed element (and <code>end()</code>) are invalidated.', parts: [gridPart(h), logical(), vars()] });
          } else {
            if (size && ss === BS && sb < fb) { map[sb] = null; ids[sb] = null; sb++; ss = 0; }
            if (!size) { frames.push({ narr: 'pop_front() on an <b>empty</b> deque is undefined behaviour. Skipped.', parts: [gridPart(), logical(), vars()] }); return; }
            var g2 = map[sb][ss]; map[sb][ss] = null; h[sb + ',' + ss] = 'bad'; ss++; size--;
            var fr = '';
            if (ss === BS && sb < fb) { fr = ' Block ' + ids[sb] + ' is now empty → freed.'; map[sb] = null; ids[sb] = null; sb++; ss = 0; }
            frames.push({ narr: 'pop_front() removes <b>' + g2 + '</b>. O(1), nothing shifts.' + fr, parts: [gridPart(h), logical(), vars()] });
          }
        });
        if (size > 0) {
          var i = Math.floor(size / 2), off = ss + i, bb = sb + Math.floor(off / BS), sl = off % BS, hh = {};
          hh[bb + ',' + sl] = 'sel';
          frames.push({ narr: 'Random access <code>d[' + i + ']</code>: offset = front slot ' + ss + ' + ' + i + ' = ' + off + ' → block = map[' + sb + ' + ' + off + ' / 4] = map[' + bb + '], slot = ' + off + ' % 4 = ' + sl + ' → <b>' + map[bb][sl] + '</b>. Two hops (map, then block) — O(1), but a little slower than vector\'s single hop.', parts: [gridPart(hh, 'd[' + i + '] lookup'), logical(), vars()] });
        }
        return frames;
      }
    }],
    examples: [
      { title: 'vector vs deque for 100,000 push_fronts', html: `<p><code>v.insert(v.begin(), x)</code> 100,000 times shifts 0 + 1 + … + 99,999 ≈ <b>5·10<sup>9</sup></b> elements — seconds. <code>d.push_front(x)</code> does it in ~100,000 writes plus ~800 block allocations (128 ints per block) — about a millisecond. If you only need to build in reverse, a third option is <code>push_back</code> then <code>std::reverse</code> once.</p>`, code: `std::deque<int> d;
for (int i = 0; i < 100000; ++i) d.push_front(i);     // O(1) each
std::vector<int> v;
for (int i = 0; i < 100000; ++i) v.push_back(i);
std::reverse(v.begin(), v.end());                     // same order, O(n) once` },
      { title: 'Keep only the last k log lines', html: `<p>A rolling buffer: push each new line to the back; when <code>size() &gt; k</code>, <code>pop_front()</code>. Both O(1). With a vector you would erase from the front (O(k) shift every time).</p>`, code: `std::deque<std::string> lastK;
void addLine(std::string line, std::size_t k) {
    lastK.push_back(std::move(line));
    if (lastK.size() > k) lastK.pop_front();
}` },
      { title: 'Palindrome check from both ends', html: `<p>Load characters into a deque and compare <code>front()</code> with <code>back()</code>, popping both, until fewer than two remain. "racecar" → r/r, a/a, c/c, 'e' left → palindrome. (With a string you would just use two indices — the deque version shows the API.)</p>`, code: `bool isPal(const std::string& s) {
    std::deque<char> d(s.begin(), s.end());
    while (d.size() > 1) {
        if (d.front() != d.back()) return false;
        d.pop_front();
        d.pop_back();
    }
    return true;
}` },
      { title: 'Why deque cannot be passed to a C API', html: `<p><code>fwrite(v.data(), sizeof(int), v.size(), f)</code> works for a vector because its elements are contiguous. A deque has no <code>data()</code>: element 127 and element 128 may be in different blocks far apart in memory. Copy into a vector first (<code>std::vector&lt;int&gt; tmp(d.begin(), d.end());</code>) or write block by block.</p>` }
    ],
    deepDive: `<p><b>🟣 libstdc++ internals.</b> <code>_Deque_impl</code> stores <code>_M_map</code> (T**), <code>_M_map_size</code>, and two iterators <code>_M_start</code>/<code>_M_finish</code>. Each iterator is four pointers: <code>_M_cur</code>, <code>_M_first</code>, <code>_M_last</code> (bounds of the current block) and <code>_M_node</code> (its slot in the map). So <code>sizeof(std::deque&lt;int&gt;)</code> is 80 bytes and <code>++it</code> has a branch "did I reach the end of the block?". Block size is <code>__deque_buf_size(sizeof(T))</code> = 512 / sizeof(T) if sizeof(T) &lt; 512, else 1 element per block.</p>
<p><b>Complexity fine print.</b> The standard requires push/pop at the ends to be constant time in terms of <i>element</i> operations. Reallocating the map copies block pointers (O(n / B)), which is amortized away because the map doubles. Insert/erase in the middle moves the shorter side (towards the nearer end) — up to n/2 moves.</p>
<p><b>MSVC's deque is famously tiny-blocked</b>: 16 bytes per block (so 4 ints, or 1 element for anything larger than 8 bytes). A <code>std::deque&lt;std::string&gt;</code> on MSVC is effectively one heap allocation per element — worse than a list for locality. Portable high-performance code sometimes avoids deque for this reason, or uses a ring buffer instead.</p>
<p><b>Ring buffer alternative.</b> A circular buffer over a vector (head index + size, wrap with modulo) gives contiguous storage, O(1) both ends, and no per-block allocations — but either a fixed capacity or occasional O(n) regrowth. Boost has <code>boost::circular_buffer</code>; many trading/audio systems write their own.</p>
<p><b>Memory release.</b> Popping elements frees empty blocks, but the map never shrinks unless you call <code>shrink_to_fit()</code>. An empty deque still owns a map and one block (libstdc++ allocates them even for a default-constructed deque — about 576 bytes for <code>deque&lt;int&gt;</code>). A <code>vector&lt;deque&lt;int&gt;&gt;</code> with a million mostly-empty deques is surprisingly expensive.</p>`,
    aiEra: `<p><b>🤖 What AI changes:</b> AI assistants reach for deque correctly in sliding-window and BFS code, but often describe it as "a doubly linked list" (wrong — it is blocks + map, with O(1) indexing) or claim "deque iterators are never invalidated by push_back" (references are safe, iterators are not).</p>
<p><b>Use AI as a partner:</b> <code>"Here is my sliding-window maximum with a deque — prove each index is pushed and popped at most once"</code>, or <code>"Rewrite this deque-based queue as a fixed-capacity ring buffer and benchmark both with Google Benchmark"</code>. Ask it which standard library your team ships (libstdc++ / libc++ / MSVC STL) and what the block size means for your element type.</p>
<p><b>Where AI goes wrong:</b> suggesting <code>d.reserve(n)</code> (does not exist), passing <code>&amp;d[0]</code> to a C API expecting contiguous memory, or using <code>std::deque&lt;bool&gt;</code> as if it were bit-packed like <code>vector&lt;bool&gt;</code> (it is not specialised).</p>
<p><b>What you must still own:</b> knowing the block-and-map layout well enough to predict which iterators/references survive, recognising "both ends" and "window" wording in a problem, and deciding when a ring buffer beats deque in latency-sensitive code.</p>`,
    problems: [{
      title: 'Sliding Window Maximum',
      level: 'Hard', tags: ['deque', 'monotonic queue', 'sliding window'], companies: ['Amazon', 'Google', 'Microsoft', 'Uber'],
      statement: `<p>Given an integer array <code>nums</code> and a window size <code>k</code>, a window of size k slides from the left to the right, one step at a time. Return the maximum of each window position.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>5</sup>, 1 ≤ k ≤ n, −10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup>.`,
      example: `<p>nums = ${H.arr([1, 3, -1, -3, 5, 3, 6, 7])}, k = 3 → output ${H.arr([3, 3, 5, 5, 6, 7], { hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g', 4: 'g', 5: 'g' } })}. Window [1,3,−1] max 3; [3,−1,−3] max 3; [−1,−3,5] max 5; [−3,5,3] max 5; [5,3,6] max 6; [3,6,7] max 7.</p>`,
      brute: {
        why: `<p>Scan every window: (n − k + 1) windows × k elements each. With n = 10<sup>5</sup> and k = 5·10<sup>4</sup> that is 2.5·10<sup>9</sup> comparisons → TLE. The waste: consecutive windows share k−1 elements, yet we re-scan them all.</p>`,
        code: `std::vector<int> maxSlidingWindowBrute(const std::vector<int>& nums, int k) {
    std::vector<int> res;
    for (int i = 0; i + k <= (int)nums.size(); ++i)
        res.push_back(*std::max_element(nums.begin() + i, nums.begin() + i + k));   // O(k) per window
    return res;
}`
      },
      mcq: { q: 'You see 5 enter the window while 3 and −1 are still inside. Can 3 or −1 ever be a window maximum again?', options: ['Yes, after 5 leaves', 'No — 5 is newer AND bigger, so it outlives them and dominates them', 'Only −1 can', 'It depends on k'], answer: 1, explain: 'An element that is smaller AND older than a newer element can never be a maximum again: the newer one stays in every future window the older one is in. So we can throw it away — that is the monotonic deque.' },
      hints: [
        `<p>Hint 1: When a bigger number arrives, every smaller number already in the window is useless forever (it leaves earlier and is smaller).</p>`,
        `<p>Hint 2: Keep a <code>std::deque&lt;int&gt;</code> of <b>indices</b> whose values are strictly decreasing from front to back. The front is always the current maximum. Pop from the back while the new value is ≥ back's value; pop from the front when the front index has slid out of the window.</p>`,
        `<p>Hint 3: Store indices, not values, so you can tell when the front expired (<code>dq.front() &lt;= i - k</code>). Record the answer only once <code>i &gt;= k - 1</code>. Each index is pushed once and popped at most once → O(n).</p>`
      ],
      solution: {
        approach: `<p><b>Monotonic deque.</b> For each index i: (1) drop the front if it is outside the window; (2) pop the back while its value ≤ nums[i] (they can never win again); (3) push i at the back; (4) once the first full window is formed, nums[dq.front()] is the answer. A deque is required because we remove from <b>both</b> ends.</p>`,
        code: `#include <vector>
#include <deque>

std::vector<int> maxSlidingWindow(const std::vector<int>& nums, int k) {
    std::deque<int> dq;              // indices; their values decrease from front to back
    std::vector<int> res;
    res.reserve(nums.size() - k + 1);
    for (int i = 0; i < (int)nums.size(); ++i) {
        if (!dq.empty() && dq.front() <= i - k) dq.pop_front();             // expired
        while (!dq.empty() && nums[dq.back()] <= nums[i]) dq.pop_back();    // dominated
        dq.push_back(i);
        if (i >= k - 1) res.push_back(nums[dq.front()]);                    // window complete
    }
    return res;
}`,
        dry: { head: ['i', 'nums[i]', 'pops', 'deque (idx:val)', 'output'], rows: [['0', '1', '—', '[0:1]', ''], ['1', '3', 'back 0:1', '[1:3]', ''], ['2', '-1', '—', '[1:3, 2:-1]', '3'], ['3', '-3', '—', '[1:3, 2:-1, 3:-3]', '3'], ['4', '5', 'front 1 (expired), back 3, 2', '[4:5]', '5'], ['5', '3', '—', '[4:5, 5:3]', '5'], ['6', '6', 'back 5, 4', '[6:6]', '6'], ['7', '7', 'back 6', '[7:7]', '7']] },
        complexity: `<p>Time O(n): every index enters and leaves the deque at most once. Space O(k) for the deque (plus the output).</p>`,
        followUps: ['Sliding window minimum — what single comparison flips?', 'Longest subarray where max − min ≤ limit (two deques).', 'Shortest subarray with sum ≥ K when numbers can be negative (deque over prefix sums).']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — std::list and std::forward_list
     ====================================================================== */
  topics.push({
    title: 'std::list & std::forward_list — Nodes, splice and Stable Iterators',
    analogy: `<p>A linked list is a <b>treasure hunt</b>: each clue (node) is hidden somewhere random in the park and tells you where the next clue is. Adding a new clue between two others is easy — rewrite two notes. Moving a whole run of clues to another hunt is easy — rewrite a few notes. But finding "clue number 500" means <b>walking through 499 clues</b>, and the walking is slow because they are scattered all over the park (cache misses).</p>`,
    explain: `<p><b>🟢 The plain idea.</b> <code>std::list&lt;T&gt;</code> is a <b>doubly linked list</b>: every element lives in its own heap-allocated node with a <code>prev</code> and a <code>next</code> pointer. <code>std::forward_list&lt;T&gt;</code> is <b>singly linked</b> (only <code>next</code>), smaller but one-directional.</p>
${H.table(['operation', 'list', 'vector'], [['insert/erase at a known iterator', H.c('g', 'O(1)'), 'O(n) shift'], ['push_front', H.c('g', 'O(1)'), 'O(n)'], ['access the i-th element', H.c('r', 'O(i) walk'), H.c('g', 'O(1)')], ['iterate all elements', 'O(n) but cache-unfriendly', 'O(n), very cache-friendly'], ['move nodes to another list (<code>splice</code>)', H.c('g', 'O(1), no copy'), 'copy + erase'], ['iterator invalidation', H.c('g', 'only erased node'), 'shifts / realloc'], ['memory per int (64-bit)', '~24 bytes + allocator overhead', '4 bytes']])}
<p><b>The killer features:</b></p>
<ul>
<li><b>Stable iterators and references.</b> Inserting or erasing other elements never invalidates an iterator to a node. You can store <code>list&lt;T&gt;::iterator</code> in a hash map and use it later — this is the heart of the <b>LRU cache</b>.</li>
<li><b><code>splice</code></b> moves nodes from one position (or list) to another by rewiring pointers: O(1) for one node or a whole list, no allocation, no copy, iterators stay valid (they now belong to the destination list).</li>
<li><b>Member algorithms</b> that work on nodes: <code>sort()</code> (stable merge sort, O(n log n) — <code>std::sort</code> needs random-access iterators so it does not compile on a list), <code>merge</code>, <code>remove</code>/<code>remove_if</code>, <code>unique</code>, <code>reverse</code>.</li>
</ul>
<p><b>forward_list</b> has no <code>size()</code> (to stay as small as a hand-written C list), no <code>push_back</code>, and its operations are "after": <code>insert_after</code>, <code>erase_after</code>, <code>splice_after</code>, starting from <code>before_begin()</code>.</p>
<p><b>The honest truth:</b> for most workloads, a <code>vector</code> beats a <code>list</code> even for middle inserts up to surprisingly large sizes, because walking to the insertion point through scattered nodes costs more than shifting a contiguous block. Use a list when you <b>already hold the iterator</b> (no search), need <b>stable addresses</b>, or need <b>splice</b>.</p>`,
    clues: [
      '"LRU cache" / "move to front on access" → <code>list</code> + <code>unordered_map&lt;key, list::iterator&gt;</code> + <code>splice</code>',
      '"O(1) insert/delete given a pointer/handle" → doubly linked list',
      '"elements must not move in memory / stable iterators" → <code>list</code> (or map/set)',
      '"merge two sorted sequences without allocating" / "move a chunk to another list" → <code>splice</code>, <code>merge</code>',
      '"LFU cache" / "all O(1) data structure" → list of buckets, each bucket a list',
      '"index the k-th element" or "binary search" → NOT a list (O(n) access)'
    ],
    code: [`#include <list>
#include <forward_list>
#include <iostream>

int main() {
    std::list<int> a = {1, 2, 3};
    std::list<int> b = {10, 20, 30};

    auto it2 = std::next(a.begin());      // iterator to the node holding 2
    a.insert(it2, 99);                    // [1, 99, 2, 3]; it2 still points at 2
    a.splice(a.end(), b, b.begin());      // move node 10 from b to the end of a: O(1)
    // a = [1, 99, 2, 3, 10], b = [20, 30]
    a.splice(a.begin(), a, it2);          // move node 2 to the front of a (same list)
    // a = [2, 1, 99, 3, 10]; it2 still valid and still points at 2
    a.sort();                             // member sort (stable merge sort): [1, 2, 3, 10, 99]
    a.remove_if([](int x) { return x > 50; });   // [1, 2, 3, 10]

    for (int x : a) std::cout << x << ' ';
    std::cout << "| " << *it2 << "\\n";   // 1 2 3 10 | 2

    std::forward_list<int> f = {3, 4};
    f.push_front(2);
    f.insert_after(f.before_begin(), 1);  // [1, 2, 3, 4]
    f.erase_after(f.begin());             // removes 2 -> [1, 3, 4]
    for (int x : f) std::cout << x << ' ';
}`],
    codeTitle: ['list: insert, splice, member sort, remove_if; forward_list: *_after'],
    viz: [{
      title: 'LRU cache = list (recency order) + map (key → node)',
      input: '3 | 1 2 3 1 4 2 5 1',
      inputLabel: 'capacity | sequence of accessed keys',
      gen: function (input) {
        var hint = 'Format: capacity | keys, e.g. 3 | 1 2 3 1 4 2';
        var s = clean(input) || '3 | 1 2 3 1 4 2 5 1';
        var sp = s.split('|');
        if (sp.length !== 2) throw new Error(hint);
        var cap = Number(sp[0].trim());
        if (!(cap >= 1 && cap <= 6) || cap !== Math.floor(cap)) throw new Error('Capacity must be 1..6');
        var keys = intsOf(sp[1], 1, 16, 0, 99, hint);
        var lst = [], frames = [], hits = 0, misses = 0;
        function mapPart(hl) { return { type: 'map', label: 'unordered_map&lt;int, list::iterator&gt;', entries: lst.slice().sort(function (a, b) { return a - b; }).map(function (k) { return [k, '→ node ' + k]; }), hl: hl || {} }; }
        function listPart(hl, ptr, lbl) { return { type: 'list', label: lbl || 'std::list (front = most recent, back = least recent)', values: lst.length ? lst.slice() : ['(empty)'], hl: hl || {}, ptr: ptr || {} }; }
        function stats() { return { type: 'vars', label: 'stats', vals: { capacity: cap, size: lst.length, hits: hits, misses: misses } }; }
        frames.push({ narr: 'Empty cache with capacity ' + cap + '. The <b>list</b> keeps keys in recency order; the <b>hash map</b> jumps straight to a key\'s node so we never walk the list.', parts: [listPart(), mapPart(), stats()] });
        keys.forEach(function (k) {
          var at = lst.indexOf(k);
          if (at >= 0) {
            hits++;
            frames.push({ narr: 'Access <b>' + k + '</b>: the map has it → O(1) jump to its node (position ' + at + ' in the list). <span class="c-g">Hit!</span>', parts: [listPart(one(at, 'cur'), one(at, 'it')), mapPart(one(k, 'cur')), stats()] });
            lst.splice(at, 1); lst.unshift(k);
            frames.push({ narr: '<code>lru.splice(lru.begin(), lru, it)</code> moves that node to the front by rewiring 4–6 pointers. No allocation, no copy, and the iterator stored in the map is <b>still valid</b>.', parts: [listPart(one(0, 'ok'), one(0, 'it')), mapPart(one(k, 'ok')), stats()] });
          } else {
            misses++;
            lst.unshift(k);
            frames.push({ narr: 'Access <b>' + k + '</b>: not in the map → <span class="c-y">miss</span>. <code>push_front</code> a new node and store <code>map[' + k + '] = lru.begin()</code>.', parts: [listPart(one(0, 'ok'), one(0, 'new')), mapPart(one(k, 'ok')), stats()] });
            if (lst.length > cap) {
              var victim = lst[lst.length - 1];
              frames.push({ narr: 'Size ' + lst.length + ' &gt; capacity ' + cap + ' → evict the <b>least recently used</b> key, which is always at the <b>back</b>: <b>' + victim + '</b>. Erase it from the map first (we read its key from the node), then <code>pop_back()</code>.', parts: [listPart(one(lst.length - 1, 'bad'), one(lst.length - 1, 'LRU')), mapPart(one(victim, 'bad')), stats()] });
              lst.pop();
              frames.push({ narr: 'Evicted ' + victim + '. Every other iterator in the map is untouched — erasing one list node invalidates only that node.', parts: [listPart(), mapPart(), stats()] });
            }
          }
        });
        frames.push({ narr: 'Done: <b>' + hits + '</b> hits, <b>' + misses + '</b> misses. Every operation was O(1): hash lookup + pointer rewiring. A vector would need O(n) to move an element to the front.', parts: [listPart(hlRange(0, lst.length - 1, 'done')), mapPart(), stats()] });
        return frames;
      }
    }],
    examples: [
      { title: 'splice to merge two playlists without copying', html: `<p>You have two <code>std::list&lt;Song&gt;</code>, each Song holding a big cover image. <code>main.splice(main.end(), extra);</code> moves <b>all</b> of <code>extra</code>'s nodes in O(1) — zero copies, zero allocations — and <code>extra</code> becomes empty. Iterators to songs in <code>extra</code> remain valid and now walk inside <code>main</code>.</p>`, code: `std::list<std::string> mainList = {"a", "b"}, extra = {"c", "d"};
auto itC = extra.begin();
mainList.splice(mainList.end(), extra);   // mainList = a b c d, extra = {}
std::cout << *itC << "\\n";                // "c" — iterator still valid` },
      { title: 'Why std::sort(list) does not compile', html: `<p><code>std::sort</code> requires <b>random-access iterators</b> (it jumps to the middle, computes distances). List iterators are only <b>bidirectional</b>. Use <code>myList.sort()</code> (merge sort on nodes, stable, O(n log n), no extra element copies) or copy into a vector, sort, and copy back if you need speed.</p>`, code: `std::list<int> l = {5, 1, 4};
// std::sort(l.begin(), l.end());   // error: no operator- for list iterators
l.sort();                           // OK: 1 4 5
l.sort(std::greater<>());           // OK: 5 4 1` },
      { title: 'Erasing during iteration on a list', html: `<p>Same pattern as vector — <code>it = l.erase(it)</code> — but now each erase is O(1) and <b>other</b> iterators stay valid. For "remove everything matching" prefer the member <code>l.remove_if(pred)</code>, which unlinks nodes in one pass with no shifting.</p>`, code: `std::list<int> l = {1, 2, 3, 4, 5, 6};
for (auto it = l.begin(); it != l.end(); )
    it = (*it % 3 == 0) ? l.erase(it) : std::next(it);
// l = 1 2 4 5` },
      { title: 'Measuring the cache penalty', html: `<p>Summing 10 million ints: a vector streams through contiguous memory (hardware prefetcher happy) — roughly a few milliseconds. A list of the same ints chases 10 million pointers to nodes scattered across the heap — commonly 10–50× slower, plus ~240 MB of node memory instead of 40 MB. Numbers vary by machine; the <b>ratio</b> is what interviewers want you to know.</p>` }
    ],
    deepDive: `<p><b>🟣 Node layout.</b> libstdc++'s <code>_List_node&lt;T&gt;</code> is <code>{ _List_node_base* next; _List_node_base* prev; T value; }</code>. The list object itself holds a <b>sentinel</b> node (the "header") whose next is the first element and whose prev is the last; <code>end()</code> is the sentinel, so the list is circular internally and there are no null checks in insert/erase. Since C++11 the list also stores its <code>size</code> (that is why <code>size()</code> is O(1) — and why range-<code>splice</code> between <b>different</b> lists is O(k): it must count the moved nodes).</p>
<p><b>Allocation is the real cost.</b> Every insert is a <code>new</code> (malloc ≈ 20–100 ns), every erase a <code>delete</code>. Mitigations: <code>std::pmr::list</code> with a <code>monotonic_buffer_resource</code> or pool resource (C++17), so nodes come from one arena and are close in memory; or replace the list with an <b>intrusive list</b> (Boost.Intrusive, Linux kernel <code>list_head</code>), where the links live inside your objects and there is no extra allocation at all.</p>
<p><b>Node handles across containers.</b> C++17 added <code>extract</code>/<code>insert(node_handle)</code> for map/set/unordered containers — the associative equivalent of splice (move a node between containers, even change a map key, without reallocation). Lists have had splice since C++98.</p>
<p><b>Thread-safety note.</b> Stable iterators do <b>not</b> mean thread-safe: two threads modifying the same list (even different nodes) race on neighbouring pointers and the size counter. Guard with a mutex or use a lock-free design.</p>
<p><b>When list actually wins:</b> very large elements that are expensive or impossible to move, long-lived iterators that must survive arbitrary inserts/erases (schedulers, LRU/LFU, undo stacks with handles), frequent splicing of sub-ranges, and real-time code where a vector's occasional O(n) reallocation spike is unacceptable (with a pool allocator).</p>`,
    aiEra: `<p><b>🤖 What AI changes:</b> Ask an assistant for "a data structure with fast inserts" and it will often suggest <code>std::list</code> because textbooks say O(1). Modern hardware says otherwise in most cases. AI-generated LRU caches, on the other hand, are usually right — they are memorised — but frequently copy the value into the list and the map (double storage) or erase the map entry <i>after</i> popping the node (reading a dead node).</p>
<p><b>Use AI as a partner:</b> <code>"Benchmark list vs vector for inserting 10^5 random positions, using Google Benchmark, and explain the result"</code> — then actually run it. Ask it to convert an LRU to use <code>splice</code> instead of erase + push_front (saves an allocation per hit).</p>
<p><b>Where AI goes wrong:</b> claiming <code>std::list::size()</code> is O(n) (true only pre-C++11 on libstdc++), calling <code>std::sort</code> on a list, or using <code>std::advance(it, k)</code> inside a loop and silently creating O(n²).</p>
<p><b>What you must still own:</b> the judgement "do I already have the iterator?" (if not, list's O(1) is a lie), cache-locality reasoning, and the exact invalidation guarantees that make LRU correct.</p>`,
    problems: [{
      title: 'LRU Cache',
      level: 'Medium', tags: ['list', 'unordered_map', 'splice', 'design'], companies: ['Amazon', 'Microsoft', 'Meta', 'Bloomberg', 'Apple'],
      statement: `<p>Design a Least-Recently-Used cache with a fixed <code>capacity</code>. <code>get(key)</code> returns the value or −1, and marks the key as most recently used. <code>put(key, value)</code> inserts or updates the key (also marking it most recent); if the cache then holds more than <code>capacity</code> keys, evict the least recently used one. Both operations must be <b>O(1)</b> on average.</p>`,
      constraints: `1 ≤ capacity ≤ 3000; 0 ≤ key ≤ 10<sup>4</sup>; up to 2·10<sup>5</sup> calls.`,
      example: `<p>capacity 2: put(1,1), put(2,2), get(1) → <b>1</b> (order now 1,2), put(3,3) → evicts <b>2</b> (least recent), get(2) → <b>−1</b>, put(4,4) → evicts <b>1</b>, get(1) → −1, get(3) → <b>3</b>, get(4) → <b>4</b>.</p>`,
      brute: {
        why: `<p>Keep a <code>vector&lt;pair&lt;int,int&gt;&gt;</code> ordered by recency. Every get/put linearly searches for the key (O(n)) and erases + reinserts it at the front (O(n) shifting). With 2·10<sup>5</sup> calls and capacity 3000 that is ~10<sup>9</sup> steps. The wasted work: searching for a key we could hash, and shifting elements we could relink.</p>`,
        code: `class LRUSlow {
    int cap;
    std::vector<std::pair<int, int>> v;   // front = most recent
public:
    explicit LRUSlow(int c) : cap(c) {}
    int get(int key) {
        for (std::size_t i = 0; i < v.size(); ++i)
            if (v[i].first == key) {
                auto kv = v[i];
                v.erase(v.begin() + i);          // O(n) shift
                v.insert(v.begin(), kv);         // O(n) shift
                return kv.second;
            }
        return -1;
    }
    void put(int key, int value) {
        if (get(key) != -1) { v.front().second = value; return; }
        v.insert(v.begin(), {key, value});
        if ((int)v.size() > cap) v.pop_back();
    }
};`
      },
      mcq: { q: 'In the O(1) LRU design, what does the hash map store as its value?', options: ['The value only', 'The position index in a vector', 'An iterator to the node inside a std::list', 'A timestamp'], answer: 2, explain: 'A list iterator lets you jump straight to the node and splice it to the front in O(1). It stays valid while other nodes are inserted/erased. A vector index would shift; a timestamp would need a heap or scan to find the minimum.' },
      hints: [
        `<p>Hint 1: You need two things at once: find a key fast (hashing) and keep an order you can reshuffle fast (linked list).</p>`,
        `<p>Hint 2: <code>std::list&lt;std::pair&lt;int,int&gt;&gt;</code> holds (key, value) with the most recent at the front; <code>std::unordered_map&lt;int, std::list&lt;std::pair&lt;int,int&gt;&gt;::iterator&gt;</code> maps key → node. On access, <code>splice</code> the node to the front.</p>`,
        `<p>Hint 3: Store the <b>key</b> inside the node so that, when evicting the back node, you know which map entry to erase. Erase the map entry before (or while) popping. Recipe: <i>get → find; splice to front; return value. put → if exists: update + splice; else emplace_front + map; if size &gt; cap: erase map[back.key]; pop_back.</i></p>`
      ],
      solution: {
        approach: `<p>List for recency order (front = most recent), hash map from key to list iterator. <code>splice(begin, list, it)</code> moves a node to the front in O(1) without invalidating any iterator. Eviction removes the back node and its map entry. All operations are O(1) average.</p>`,
        code: `#include <list>
#include <unordered_map>
#include <utility>

class LRUCache {
    using Node = std::pair<int, int>;                         // (key, value)
    int cap_;
    std::list<Node> order_;                                   // front = most recently used
    std::unordered_map<int, std::list<Node>::iterator> where_;

public:
    explicit LRUCache(int capacity) : cap_(capacity) { where_.reserve(capacity * 2); }

    int get(int key) {
        auto f = where_.find(key);
        if (f == where_.end()) return -1;
        order_.splice(order_.begin(), order_, f->second);    // move node to front, O(1)
        return f->second->second;                            // iterator still valid after splice
    }

    void put(int key, int value) {
        auto f = where_.find(key);
        if (f != where_.end()) {
            f->second->second = value;
            order_.splice(order_.begin(), order_, f->second);
            return;
        }
        order_.emplace_front(key, value);
        where_[key] = order_.begin();
        if ((int)order_.size() > cap_) {
            where_.erase(order_.back().first);               // read the key BEFORE destroying the node
            order_.pop_back();
        }
    }
};`,
        dry: { head: ['call', 'list after (front→back)', 'map keys', 'returns / evicts'], rows: [['put(1,1)', '[1]', '{1}', ''], ['put(2,2)', '[2, 1]', '{1,2}', ''], ['get(1)', '[1, 2]', '{1,2}', 'returns 1 (splice 1 to front)'], ['put(3,3)', '[3, 1]', '{1,3}', H.c('r', 'evicts 2')], ['get(2)', '[3, 1]', '{1,3}', 'returns −1'], ['put(4,4)', '[4, 3]', '{3,4}', H.c('r', 'evicts 1')], ['get(3)', '[3, 4]', '{3,4}', 'returns 3']] },
        complexity: `<p>get and put: O(1) average (hash lookup + constant pointer rewiring). Space: O(capacity) nodes plus map entries.</p>`,
        followUps: ['Make it thread-safe — where does the lock go, and why is a shared_mutex not enough for get()?', 'LFU cache (evict least frequently used, ties by recency).', 'Avoid the per-node allocation with a pre-allocated pool or an intrusive list.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — set / map / multiset / multimap (red-black trees)
     ====================================================================== */
  function rbBuild(keys, onStep) {
    var root = null;
    function snap() { return root; }
    function rotL(x) {
      var y = x.r; x.r = y.l; if (y.l) y.l.p = x; y.p = x.p;
      if (!x.p) root = y; else if (x === x.p.l) x.p.l = y; else x.p.r = y;
      y.l = x; x.p = y;
    }
    function rotR(x) {
      var y = x.l; x.l = y.r; if (y.r) y.r.p = x; y.p = x.p;
      if (!x.p) root = y; else if (x === x.p.r) x.p.r = y; else x.p.l = y;
      y.r = x; x.p = y;
    }
    keys.forEach(function (k) {
      var y = null, x = root, path = [];
      while (x) { y = x; path.push(x.k); if (k === x.k) break; x = k < x.k ? x.l : x.r; }
      if (x && x.k === k) { onStep(snap(), 'dup', { k: k, path: path }); return; }
      var z = { k: k, c: 'R', l: null, r: null, p: y };
      if (!y) root = z; else if (k < y.k) y.l = z; else y.r = z;
      onStep(snap(), 'insert', { k: k, path: path });
      while (z.p && z.p.c === 'R') {
        var g = z.p.p, left = z.p === g.l, u = left ? g.r : g.l;
        if (u && u.c === 'R') {
          z.p.c = 'B'; u.c = 'B'; g.c = 'R';
          onStep(snap(), 'recolor', { k: z.k, parent: z.p.k, uncle: u.k, grand: g.k });
          z = g;
        } else {
          if (left && z === z.p.r) { z = z.p; rotL(z); onStep(snap(), 'rotate1', { dir: 'left', at: z.k, k: z.p.k }); }
          else if (!left && z === z.p.l) { z = z.p; rotR(z); onStep(snap(), 'rotate1', { dir: 'right', at: z.k, k: z.p.k }); }
          z.p.c = 'B'; g.c = 'R';
          if (left) rotR(g); else rotL(g);
          onStep(snap(), 'rotate2', { dir: left ? 'right' : 'left', at: g.k, top: z.p.k });
        }
      }
      if (root.c === 'R') { root.c = 'B'; onStep(snap(), 'root', { k: root.k }); }
    });
    return root;
  }
  function rbArr(root) {
    var arr = [], col = {}, keyAt = {};
    function walk(n, i) {
      if (!n) return;
      if (i > 30) throw new Error('The tree got deeper than 5 levels to draw — use fewer keys (≤ 10 works for most orders).');
      while (arr.length <= i) arr.push(null);
      arr[i] = n.k; col[i] = n.c; keyAt[n.k] = i;
      walk(n.l, 2 * i + 1); walk(n.r, 2 * i + 2);
    }
    walk(root, 0);
    return { arr: arr, col: col, keyAt: keyAt };
  }
  function rbInorder(n, out) { if (n) { rbInorder(n.l, out); out.push(n.k); rbInorder(n.r, out); } return out; }
  function rbBlackHeight(n) { var h = 0; while (n) { if (n.c === 'B') h++; n = n.l; } return h; }

  topics.push({
    title: 'std::set & std::map — Ordered Containers on Red-Black Trees',
    analogy: `<p>A <b>library card catalogue</b> kept in alphabetical order. Looking up a title is quick — you jump to the right drawer and halve the search each time. You can also ask "what is the <b>first title at or after</b> 'M'?" or "list everything from 'C' to 'F'", which a random pile could never answer. The price: every new card must be filed in exactly the right spot, and the drawers must be <b>rebalanced</b> so no drawer chain gets too long.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> <code>std::set&lt;K&gt;</code> stores <b>unique keys in sorted order</b>. <code>std::map&lt;K, V&gt;</code> stores <b>key → value pairs sorted by key</b>. <code>multiset</code>/<code>multimap</code> allow duplicate keys. All four are <b>balanced binary search trees</b> — in every major standard library, a <b>red-black tree</b> — so find, insert and erase are <b>O(log n)</b> guaranteed (never a bad worst case).</p>
<p><b>What a red-black tree promises:</b> every node is red or black, the root is black, a red node never has a red child, and every path from a node down to a missing child passes the same number of black nodes. Together these force the height to be at most <b>2·log₂(n+1)</b> — about 40 levels for a million keys. Inserting may recolour a few nodes and do <b>at most 2 rotations</b>; erasing at most 3.</p>
<p><b>The superpower is order.</b> Things a hash map cannot do:</p>
${H.table(['call', 'meaning', 'example on {10, 20, 30}'], [['<code>lower_bound(x)</code>', 'first key <b>≥</b> x', 'lower_bound(15) → 20, lower_bound(20) → 20'], ['<code>upper_bound(x)</code>', 'first key <b>&gt;</b> x', 'upper_bound(20) → 30'], ['<code>prev(lower_bound(x))</code>', 'largest key <b>&lt;</b> x (check ≠ begin)', 'x = 25 → 20'], ['<code>begin()</code> / <code>prev(end())</code>', 'smallest / largest', '10 / 30'], ['<code>equal_range(x)</code>', '[lower, upper) — all copies of x in a multiset', '—']])}
<p><b>map gotchas everyone hits:</b></p>
<ul>
<li><code>m[key]</code> <b>inserts</b> a default value if the key is missing. So <code>if (m[k] == 0)</code> silently grows the map, and <code>operator[]</code> cannot be used on a <code>const map</code>. Use <code>find</code>, <code>contains</code> (C++20), <code>count</code> or <code>at</code> (throws <code>std::out_of_range</code>).</li>
<li><code>m.insert({k, v})</code> does <b>not</b> overwrite an existing key; <code>m[k] = v</code> and <code>m.insert_or_assign(k, v)</code> do. <code>try_emplace</code> constructs only if the key is absent.</li>
<li>The element type is <code>std::pair&lt;const K, V&gt;</code> — keys are read-only. To change a key, erase and reinsert (or C++17 <code>extract</code> the node, change <code>node.key()</code>, insert it back — no reallocation).</li>
<li><code>multiset::erase(value)</code> removes <b>all</b> copies; <code>erase(find(value))</code> removes one.</li>
</ul>
<p><b>Custom order:</b> pass a comparator type: <code>std::set&lt;int, std::greater&lt;&gt;&gt;</code> for descending, or your own struct/lambda. It must be a <b>strict weak ordering</b> ("less than", never "less than or equal").</p>`,
    clues: [
      '"sorted order while inserting/deleting" / "dynamic sorted list" → <code>set</code> / <code>map</code>',
      '"smallest element ≥ x", "closest value", "floor/ceiling", "predecessor/successor" → <code>lower_bound</code>/<code>upper_bound</code>',
      '"overlapping intervals / bookings / calendar" → <code>map&lt;start, end&gt;</code> + lower_bound',
      '"sliding window median / k-th smallest while elements leave" → <code>multiset</code> (two multisets or one + iterator)',
      '"guaranteed O(log n), no worst-case blowups, deterministic iteration order" → tree over hash',
      '"range query: all keys between L and R" → <code>lower_bound(L)</code> … <code>upper_bound(R)</code>'
    ],
    code: [`#include <map>
#include <set>
#include <string>
#include <iostream>

int main() {
    std::map<std::string, int> price = {{"banana", 12}, {"apple", 30}};
    price["cherry"] = 50;                    // insert (or overwrite)
    price.insert({"apple", 999});            // NO effect: apple already exists
    price.insert_or_assign("apple", 35);     // overwrites
    price.try_emplace("date", 70);           // constructs only if absent

    if (auto it = price.find("kiwi"); it == price.end()) std::cout << "no kiwi\\n";
    std::cout << price.contains("apple") << "\\n";   // C++20: 1
    // int k = price["kiwi"];  // would INSERT kiwi -> 0. Use find/at/contains for lookups.

    for (const auto& [name, cost] : price)   // always sorted by key
        std::cout << name << '=' << cost << ' ';   // apple=35 banana=12 cherry=50 date=70
    std::cout << "\\n";

    std::set<int> s = {10, 20, 30, 40};
    auto lb = s.lower_bound(25);             // first >= 25 -> 30
    auto ub = s.upper_bound(30);             // first >  30 -> 40
    std::cout << *lb << ' ' << *ub << ' ' << *std::prev(lb) << "\\n";   // 30 40 20

    for (auto it = s.lower_bound(15); it != s.end() && *it <= 35; ++it)   // range [15, 35]
        std::cout << *it << ' ';             // 20 30

    std::multiset<int> ms = {5, 1, 5, 3, 5};
    ms.erase(ms.find(5));                    // removes ONE 5
    std::cout << "\\n" << ms.count(5) << "\\n";   // 2
}`, `#include <set>
#include <map>
#include <string>

struct Task {
    int priority;
    std::string name;
};

// Strict weak ordering: higher priority first, then by name. Uses < (never <=).
struct ByPriority {
    bool operator()(const Task& a, const Task& b) const {
        if (a.priority != b.priority) return a.priority > b.priority;
        return a.name < b.name;
    }
};

int main() {
    std::set<Task, ByPriority> tasks;
    tasks.insert({2, "write tests"});
    tasks.insert({5, "fix prod bug"});
    tasks.insert({2, "code review"});
    // iteration: {5,"fix prod bug"}, {2,"code review"}, {2,"write tests"}

    auto cmp = [](int a, int b) { return a > b; };
    std::set<int, decltype(cmp)> desc(cmp);   // lambda comparator (C++20 also allows desc{} for captureless)
    desc.insert({3, 1, 2});                   // iterates 3 2 1

    std::map<std::string, int, std::less<>> m;   // transparent comparator:
    m["alpha"] = 1;
    std::string_view key = "alpha";
    auto it = m.find(key);                       // heterogeneous lookup, no temporary std::string
    (void)it;

    // C++17 node handle: change a key without reallocating the node
    std::map<int, std::string> ids = {{1, "one"}, {2, "two"}};
    auto node = ids.extract(1);
    node.key() = 100;
    ids.insert(std::move(node));                 // ids = {2:"two", 100:"one"}
}`],
    codeTitle: ['map/set essentials: insert vs operator[], lower_bound/upper_bound, multiset', 'Custom comparators, transparent lookup, node handles'],
    viz: [{
      title: 'Red-black tree insertion (what std::set does on every insert)',
      input: '10 20 30 15 25 5 1 | 18',
      inputLabel: 'Keys to insert (≤ 10, 0–99) | lower_bound target',
      gen: function (input) {
        var hint = 'Format: keys to insert | lower_bound target, e.g. 10 20 30 15 25 5 1 | 18';
        var s = clean(input) || '10 20 30 15 25 5 1 | 18';
        var sp = s.split('|');
        var keys = intsOf(sp[0], 1, 10, 0, 99, hint);
        var target = sp.length > 1 && sp[1].trim() ? Number(sp[1].trim()) : keys[0];
        if (isNaN(target)) throw new Error(hint);
        var frames = [];
        function treePart(root, extraHl, label) {
          var R = rbArr(root), hl = {}, tags = {};
          Object.keys(R.col).forEach(function (i) { tags[i] = R.col[i] === 'R' ? 'red' : 'black'; hl[i] = R.col[i] === 'R' ? 'bad' : 'done'; });
          Object.keys(extraHl || {}).forEach(function (k) { if (R.keyAt[k] !== undefined) hl[R.keyAt[k]] = extraHl[k]; });
          return { type: 'tree', label: label || 'red-black tree (tag under each node = colour)', arr: R.arr, hl: hl, tags: tags };
        }
        function inorder(root, hlKey) { var v = rbInorder(root, []); var h = {}; if (hlKey !== undefined) { var at = v.indexOf(hlKey); if (at >= 0) h[at] = 'ok'; } return { type: 'array', label: 'iteration order (in-order walk = sorted)', values: v, hl: h }; }
        frames.push({ narr: 'We will insert <b>' + keys.join(', ') + '</b> into a <code>std::set&lt;int&gt;</code>. Each new key goes down the tree like a binary search, lands as a <b>red</b> leaf, then the tree fixes any red-red violation by <b>recolouring</b> or <b>rotating</b>. (Node fill: red = red node, faded = black node.)', parts: [{ type: 'text', label: 'Rules', html: '1) root is black · 2) a red node has no red child · 3) every root→null path has the same number of black nodes. ⇒ height ≤ 2·log₂(n+1).' }] });
        var root = rbBuild(keys, function (r, kind, d) {
          var ex = {};
          if (kind === 'dup') { d.path.forEach(function (k) { ex[k] = 'win'; }); ex[d.k] = 'sel'; frames.push({ narr: '<b>' + d.k + '</b> is already in the set. <code>insert</code> returns <code>{iterator to existing, false}</code> and changes nothing (a <code>multiset</code> would add a second copy).', parts: [treePart(r, ex), inorder(r, d.k)] }); return; }
          if (kind === 'insert') { d.path.forEach(function (k) { ex[k] = 'win'; }); ex[d.k] = 'cur'; frames.push({ narr: 'Insert <b>' + d.k + '</b>: walk ' + (d.path.length ? d.path.join(' → ') : '(empty tree)') + ' comparing with &lt;, and attach it as a <b>red</b> leaf. Red keeps black-heights equal; the only possible problem is a red parent.', parts: [treePart(r, ex), inorder(r, d.k)] }); return; }
          if (kind === 'recolor') { ex[d.k] = 'cur'; ex[d.grand] = 'sel'; frames.push({ narr: 'Red-red between <b>' + d.k + '</b> and parent <b>' + d.parent + '</b>, and the uncle <b>' + d.uncle + '</b> is also red → <b>recolour</b>: parent and uncle become black, grandparent <b>' + d.grand + '</b> becomes red. No rotation; the problem may move two levels up.', parts: [treePart(r, ex), inorder(r)] }); return; }
          if (kind === 'rotate1') { ex[d.at] = 'cur'; frames.push({ narr: 'Uncle is black and we are an "inner" grandchild (zig-zag) → first a <b>' + d.dir + ' rotation</b> at <b>' + d.at + '</b> to make it a straight line.', parts: [treePart(r, ex), inorder(r)] }); return; }
          if (kind === 'rotate2') { ex[d.top] = 'sel'; ex[d.at] = 'cur'; frames.push({ narr: 'Uncle is black, straight line → recolour and do a <b>' + d.dir + ' rotation</b> at the old grandparent <b>' + d.at + '</b>. <b>' + d.top + '</b> moves up and becomes black. Fixed — at most 2 rotations per insert. Nodes were re-linked, never moved in memory, so <b>no iterator was invalidated</b>.', parts: [treePart(r, ex), inorder(r)] }); return; }
          if (kind === 'root') { ex[d.k] = 'sel'; frames.push({ narr: 'The root ended up red → simply paint it black (rule 1). This adds one to every path\'s black count equally, so rule 3 still holds.', parts: [treePart(r, ex), inorder(r)] }); }
        });
        var R = rbArr(root), h = 0;
        R.arr.forEach(function (v, i) { if (v !== null) h = Math.max(h, Math.floor(Math.log2(i + 1)) + 1); });
        frames.push({ narr: 'Final tree: ' + rbInorder(root, []).length + ' keys, height <b>' + h + '</b> levels, black-height ' + rbBlackHeight(root) + '. An unbalanced BST fed the same keys in sorted order would degrade into a linked list; the red-black rules prevent that.', parts: [treePart(root), inorder(root), { type: 'vars', vals: { size: rbInorder(root, []).length, height: h, 'max allowed ≈ 2·log₂(n+1)': (2 * Math.log2(rbInorder(root, []).length + 1)).toFixed(1) } }] });
        var cur = root, cand = null, path = {};
        while (cur) {
          path[cur.k] = 'win';
          if (cur.k >= target) { cand = cur; frames.push({ narr: '<code>lower_bound(' + target + ')</code>: at <b>' + cur.k + '</b> ≥ ' + target + ' → it is a candidate answer; go <b>left</b> to look for something smaller that still qualifies.', parts: [treePart(root, (function () { var e = {}; for (var k in path) e[k] = 'win'; e[cur.k] = 'cur'; if (cand) e[cand.k] = 'ok'; return e; })(), 'searching lower_bound(' + target + ')'), inorder(root)] }); cur = cur.l; }
          else { frames.push({ narr: '<code>lower_bound(' + target + ')</code>: at <b>' + cur.k + '</b> &lt; ' + target + ' → too small, go <b>right</b>.', parts: [treePart(root, (function () { var e = {}; for (var k in path) e[k] = 'win'; e[cur.k] = 'cur'; if (cand) e[cand.k] = 'ok'; return e; })(), 'searching lower_bound(' + target + ')'), inorder(root)] }); cur = cur.r; }
        }
        frames.push({ narr: cand ? 'Result: <code>*lower_bound(' + target + ')</code> = <b>' + cand.k + '</b> — the smallest key ≥ ' + target + '. One root-to-leaf walk: O(log n). ' + (cand.k === rbInorder(root, [])[0] ? 'It is <code>begin()</code>, so there is no key &lt; ' + target + '.' : 'Its predecessor (<code>std::prev</code>) is the largest key &lt; ' + target + '.') : 'Result: every key is &lt; ' + target + ', so lower_bound returns <code>end()</code>. Always compare with <code>end()</code> before dereferencing!', parts: [treePart(root, cand ? one(cand.k, 'sel') : {}), inorder(root, cand ? cand.k : undefined)] });
        return frames;
      }
    }],
    examples: [
      { title: 'Closest value to x in a dynamic set', html: `<p>Set {3, 8, 15, 20}, query x = 12. <code>lower_bound(12)</code> → 15. Its predecessor → 8. Distances 3 and 4 → answer <b>15</b>. Edge cases: lower_bound returns <code>end()</code> (only check the predecessor) or <code>begin()</code> (no predecessor). This pattern solves "Contains Duplicate III", "closest room", and many sweep-line problems.</p>`, code: `int closest(const std::set<int>& s, int x) {          // s must be non-empty
    auto it = s.lower_bound(x);
    if (it == s.end()) return *std::prev(it);
    if (it == s.begin()) return *it;
    auto before = std::prev(it);
    return (x - *before <= *it - x) ? *before : *it;   // ties -> smaller value
}` },
      { title: 'Word frequency, printed alphabetically', html: `<p><code>std::map&lt;std::string, int&gt; freq; for (auto&amp; w : words) ++freq[w];</code> — here <code>operator[]</code> inserting 0 is exactly what we want. Iterating the map prints words in sorted order for free. With <code>unordered_map</code> you would need to copy and sort afterwards.</p>`, code: `std::map<std::string, int> freq;
for (const std::string& w : {"to", "be", "or", "not", "to", "be"}) ++freq[w];
for (const auto& [w, c] : freq) std::cout << w << ':' << c << ' ';   // be:2 not:1 or:1 to:2` },
      { title: 'The <= comparator bug', html: `<p>A teammate writes <code>struct Cmp { bool operator()(int a, int b) const { return a &lt;= b; } };</code>. Now <code>Cmp(x, x)</code> is true, so the set can never decide two equal keys are "equivalent" (equivalence means <code>!cmp(a,b) &amp;&amp; !cmp(b,a)</code>). Result: duplicates in a set, <code>find</code> failing to find keys that are there, and in some libraries an assertion or crash. Comparators must be <b>irreflexive</b>: use <code>&lt;</code>.</p>` },
      { title: 'Order statistics: k-th smallest in O(log n)', html: `<p><code>std::set</code> cannot answer "what is the 5th smallest?" faster than walking (<code>std::next(s.begin(), 4)</code> is O(k)), and <code>std::distance</code> on set iterators is O(n). In competitive programming, GCC's policy-based <code>__gnu_pbds::tree</code> with <code>tree_order_statistics_node_update</code> adds <code>find_by_order(k)</code> and <code>order_of_key(x)</code> in O(log n). In production, use a Fenwick tree over compressed values or a B-tree with counts.</p>`, code: `#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace __gnu_pbds;
using ordered_set = tree<int, null_type, std::less<int>, rb_tree_tag, tree_order_statistics_node_update>;

int demo() {
    ordered_set os;
    for (int x : {50, 10, 40, 20, 30}) os.insert(x);
    int third = *os.find_by_order(2);       // 0-based: 30
    int below35 = (int)os.order_of_key(35); // keys < 35: 3
    return third + below35;
}` }
    ],
    deepDive: `<p><b>🟣 libstdc++ <code>_Rb_tree</code>.</b> Each node is <code>{ color, parent, left, right }</code> (32 bytes on 64-bit) followed by the value — so a <code>std::set&lt;int&gt;</code> spends ~40 bytes plus malloc overhead per 4-byte int. A header node stores root, leftmost and rightmost, making <code>begin()</code> and <code>rbegin()</code> O(1). <code>++it</code> is amortized O(1) (worst case O(log n) climbing up), so full iteration is O(n).</p>
<p><b>Why red-black and not AVL?</b> AVL trees are more strictly balanced (height ≤ 1.44 log n), so lookups touch slightly fewer nodes, but inserts/erases can need O(log n) rotations. Red-black trees cap rotations at 2 (insert) / 3 (erase) and do the rest with cheap recolouring, which suits a general-purpose container with heavy mutation. The standard does not mandate red-black — only the complexity and iterator guarantees — but every major implementation uses one.</p>
<p><b>Hints and bulk building.</b> <code>insert(hint, value)</code> is amortized O(1) if the value goes right before <code>hint</code> — inserting already-sorted data with <code>s.insert(s.end(), x)</code> is linear overall. Constructing from a sorted range is also linear in practice. C++17 <code>merge(other)</code> moves nodes between sets without allocation.</p>
<p><b>Strict weak ordering, formally:</b> irreflexive (!(a&lt;a)), transitive, and "incomparability" is transitive. Floating-point keys with NaN break it (NaN is incomparable with everything, but not transitively) — never use raw <code>double</code> with possible NaN as set keys.</p>
<p><b>Alternatives in 2026:</b> C++23 <code>std::flat_map</code>/<code>flat_set</code> keep keys in sorted vectors: much faster lookup and iteration (contiguous, cache-friendly, binary search), but O(n) insert/erase and iterator invalidation like a vector — great for build-once/read-many data. B-tree maps (Abseil <code>absl::btree_map</code>) store many keys per node, cutting memory overhead and cache misses; they trade away iterator stability on insert.</p>`,
    aiEra: `<p><b>🤖 What AI changes:</b> AI writes map code fluently, but the two bugs it introduces most are the <code>operator[]</code>-as-lookup bug (silently inserting zeros, or failing to compile on a const map) and <code>&lt;=</code> comparators in custom structs. It also often uses <code>std::lower_bound(s.begin(), s.end(), x)</code> on a set — which compiles but is <b>O(n)</b> because set iterators are not random access. Always use the member <code>s.lower_bound(x)</code>.</p>
<p><b>Use AI as a partner:</b> <code>"Check every comparator in this file for strict weak ordering and give a counterexample if one fails"</code>; <code>"Replace map lookups with find/contains where operator[] would insert"</code>; <code>"Would flat_map or absl::btree_map be faster for this read-mostly table? Write a benchmark."</code></p>
<p><b>Where AI goes wrong:</b> claiming map lookup is O(1), saying <code>std::set</code> has <code>find_by_order</code>, forgetting <code>end()</code> checks after <code>lower_bound</code>, or using <code>multiset::erase(value)</code> when only one copy should go.</p>
<p><b>What you must still own:</b> recognising "ordered + dynamic" in a problem statement, the lower/upper bound semantics cold, red-black invariants at a whiteboard level, and the trade-off between trees, hashes and sorted vectors.</p>`,
    problems: [{
      title: 'My Calendar I (No Double Booking)',
      level: 'Medium', tags: ['map', 'lower_bound', 'intervals'], companies: ['Google', 'Uber', 'Amazon'],
      statement: `<p>Implement <code>book(start, end)</code> for a calendar of half-open intervals <code>[start, end)</code>. A booking succeeds (return <code>true</code> and store it) only if it does not overlap any existing booking; otherwise return <code>false</code> and store nothing.</p>`,
      constraints: `0 ≤ start &lt; end ≤ 10<sup>9</sup>; up to 10<sup>5</sup> calls to <code>book</code>.`,
      example: `<p>book(10, 20) → <b>true</b>. book(15, 25) → <b>false</b> (15 is inside [10, 20)). book(20, 30) → <b>true</b> (touching at 20 is fine because intervals are half-open). Stored: ${H.kv([[10, 20], [20, 30]], { label: 'start → end' })}</p>`,
      brute: {
        why: `<p>Store all bookings in a vector and check each new one against every stored interval: O(n) per call, O(n²) = 10<sup>10</sup> for 10<sup>5</sup> calls. The waste: only the two neighbours in sorted order (the booking just before and just after the new start) can possibly overlap.</p>`,
        code: `class MyCalendarSlow {
    std::vector<std::pair<int, int>> booked;
public:
    bool book(int start, int end) {
        for (auto [s, e] : booked)
            if (start < e && s < end) return false;   // overlap test for half-open intervals
        booked.push_back({start, end});
        return true;
    }
};`
      },
      mcq: { q: 'Bookings are kept in a map sorted by start. For a new [s, e), which existing bookings must you check?', options: ['All of them', 'Only the one with the smallest start', 'The first booking with start ≥ s, and the one just before it', 'Only bookings with the same start'], answer: 2, explain: 'Non-overlapping bookings sorted by start are also sorted by end. The next booking (lower_bound(s)) overlaps iff its start < e; the previous one overlaps iff its end > s. Nothing else can overlap.' },
      hints: [
        `<p>Hint 1: Accepted bookings never overlap, so sorted by start they are also sorted by end. A new interval can only collide with its <b>immediate neighbours</b> in that order.</p>`,
        `<p>Hint 2: Keep <code>std::map&lt;int,int&gt; start → end</code>. <code>auto next = cal.lower_bound(start)</code> is the first booking starting at or after <code>start</code>.</p>`,
        `<p>Hint 3: Conflict if <code>next != end() &amp;&amp; next-&gt;first &lt; end</code>, or if <code>next != begin()</code> and <code>prev(next)-&gt;second &gt; start</code>. Half-open intervals mean touching endpoints are allowed (strict &lt; and &gt;).</p>`
      ],
      solution: {
        approach: `<p>A <code>std::map</code> keyed by start keeps bookings sorted. For each request, <code>lower_bound(start)</code> finds the successor; its predecessor is one <code>std::prev</code> away. Check both for overlap; if clear, insert. Each call is O(log n).</p>`,
        code: `#include <map>
#include <iterator>

class MyCalendar {
    std::map<int, int> cal;   // start -> end, never overlapping
public:
    bool book(int start, int end) {
        auto next = cal.lower_bound(start);                       // first booking with start >= our start
        if (next != cal.end() && next->first < end) return false; // it begins before we finish
        if (next != cal.begin() && std::prev(next)->second > start) return false;   // previous still running
        cal.emplace(start, end);
        return true;
    }
};`,
        dry: { head: ['call', 'lower_bound(start)', 'prev', 'conflict?', 'map after'], rows: [['book(10,20)', 'end()', '—', 'no', '{10:20}'], ['book(15,25)', 'end()', '10:20 (20 &gt; 15)', H.c('r', 'yes → false'), '{10:20}'], ['book(20,30)', 'end()', '10:20 (20 &gt; 20? no)', H.c('g', 'no → true'), '{10:20, 20:30}'], ['book(5,10)', '10:20 (10 &lt; 10? no)', '—', H.c('g', 'no → true'), '{5:10, 10:20, 20:30}'], ['book(25,27)', 'end()', '20:30 (30 &gt; 25)', H.c('r', 'yes → false'), 'unchanged']] },
        complexity: `<p>O(log n) per <code>book</code>; O(n) memory for n accepted bookings.</p>`,
        followUps: ['My Calendar II: allow double but not triple bookings (difference map / sweep line).', 'My Calendar III: return the maximum overlap so far.', 'Also support <code>cancel(start)</code> — what stays O(log n)?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — unordered_set / unordered_map (hash tables)
     ====================================================================== */
  function isPrime(n) { if (n < 2) return false; for (var d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; }
  function nextPrime(n) { while (!isPrime(n)) n++; return n; }
  function fmix32(k) {
    var h = (k ^ 0x9e3779b9) >>> 0;
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return h >>> 0;
  }
  topics.push({
    title: 'std::unordered_set & std::unordered_map — Hashing, Buckets, Load Factor',
    analogy: `<p>A <b>coat check with numbered hooks</b>. The attendant looks at your ticket's number, does a quick calculation ("number mod hooks") and walks straight to that hook — no searching through the whole room. Sometimes two coats land on the same hook (a <b>collision</b>) and get hung one behind the other. When the room gets too crowded, the club moves to a <b>bigger room with more hooks</b> and re-hangs every coat (a <b>rehash</b>).</p>`,
    explain: `<p><b>🟢 The plain idea.</b> <code>unordered_set&lt;K&gt;</code> / <code>unordered_map&lt;K,V&gt;</code> are <b>hash tables</b>: average <b>O(1)</b> insert, find and erase, but <b>no order</b> — iteration order is unspecified and can change after a rehash.</p>
<p><b>How a lookup works:</b></p>
<ol>
<li>Compute <code>h = std::hash&lt;K&gt;{}(key)</code> — a <code>size_t</code>. (On GCC/Clang, <code>std::hash&lt;int&gt;</code> is just the number itself!)</li>
<li>Pick the bucket: <code>b = h % bucket_count()</code> (libstdc++ uses <b>prime</b> bucket counts).</li>
<li>Walk that bucket's short chain of nodes, comparing keys with <code>==</code>.</li>
</ol>
${H.table(['key', 'hash (int → itself)', 'bucket = hash % 7'], [['10', '10', '3'], ['24', '24', '3 ← collision with 10'], ['5', '5', '5'], ['14', '14', '0']])}
<p><b>Load factor</b> = <code>size() / bucket_count()</code> = average chain length. The default <code>max_load_factor()</code> is <b>1.0</b>: as soon as an insert would push the average above 1, the table <b>rehashes</b> — allocates roughly twice as many buckets and relinks every node into its new bucket. That single insert costs O(n), but it happens rarely, so inserts are <b>amortized O(1)</b>.</p>
<p><b>Your controls:</b> <code>reserve(n)</code> (make room for n elements without rehashing — do this when you know n), <code>rehash(buckets)</code>, <code>max_load_factor(f)</code>, and for debugging <code>bucket_count()</code>, <code>bucket(key)</code>, <code>bucket_size(b)</code>, <code>load_factor()</code>.</p>
<p><b>Keys need two things:</b> a hash function and <code>==</code>. The standard provides <code>std::hash</code> for integers, pointers, <code>std::string</code>, <code>string_view</code>, enums and a few more — but <b>not</b> for <code>std::pair</code>, <code>std::tuple</code>, <code>std::vector</code> or your structs. For those you write a hasher (or encode the key, e.g. <code>(long long)r * C + c</code> for a grid cell).</p>
${H.table(['', '<code>map</code> (tree)', '<code>unordered_map</code> (hash)'], [['find / insert', 'O(log n) guaranteed', 'O(1) average, O(n) worst'], ['ordered iteration, lower_bound', H.c('g', 'yes'), H.c('r', 'no')], ['key requirement', '<code>operator&lt;</code>', '<code>std::hash</code> + <code>==</code>'], ['memory per element', '~48 B + value', '~16–24 B + bucket array + value'], ['iterator invalidation on insert', 'never', 'on rehash (refs stay valid)']])}`,
    clues: [
      '"have we seen this before?" / "count occurrences" / "group by key" with no ordering needed → <code>unordered_set</code>/<code>unordered_map</code>',
      '"O(n) expected time" + "lookups" (two-sum, longest consecutive, subarray sum = k) → hash container',
      '"N ≤ 10<sup>5</sup>–10<sup>6</sup> inserts, tight TL" → <code>reserve(n)</code> to avoid rehash churn',
      '"key is a pair/coordinate/vector" → custom hash (or encode to a 64-bit integer)',
      '"Codeforces hacks / adversarial input / TLE on unordered_map" → randomized hash (splitmix64) or switch to <code>map</code>',
      '"need sorted output / nearest key / range" → NOT unordered; use <code>map</code>/<code>set</code>'
    ],
    code: [`#include <unordered_map>
#include <unordered_set>
#include <string>
#include <iostream>

int main() {
    std::unordered_map<std::string, int> count;
    count.reserve(1000);                          // room for 1000 keys: no rehash below that
    for (std::string w : {"red", "blue", "red", "green", "red"}) ++count[w];
    std::cout << count["red"] << "\\n";            // 3

    if (auto it = count.find("pink"); it == count.end()) std::cout << "no pink\\n";
    std::cout << count.contains("blue") << "\\n";  // C++20: 1

    std::cout << "size " << count.size() << " buckets " << count.bucket_count()
              << " load " << count.load_factor() << " max " << count.max_load_factor() << "\\n";
    for (std::size_t b = 0; b < count.bucket_count() && b < 5; ++b)
        std::cout << "bucket " << b << " holds " << count.bucket_size(b) << "\\n";

    std::unordered_set<int> seen;
    for (int x : {4, 1, 4, 2}) {
        auto [it, inserted] = seen.insert(x);     // inserted == false for the second 4
        if (!inserted) std::cout << "duplicate " << *it << "\\n";
    }
}`, `#include <unordered_map>
#include <unordered_set>
#include <chrono>
#include <cstdint>
#include <utility>

// 1) Hash for std::pair<int,int> (grid cells, edges)
struct PairHash {
    std::size_t operator()(const std::pair<int, int>& p) const noexcept {
        std::uint64_t a = static_cast<std::uint32_t>(p.first), b = static_cast<std::uint32_t>(p.second);
        return std::hash<std::uint64_t>{}((a << 32) | b);   // pack both 32-bit halves into one 64-bit key
    }
};

// 2) Hack-resistant hash for integers (splitmix64 + per-run random seed)
struct SafeHash {
    static std::uint64_t splitmix64(std::uint64_t x) {
        x += 0x9e3779b97f4a7c15ULL;
        x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9ULL;
        x = (x ^ (x >> 27)) * 0x94d049bb133111ebULL;
        return x ^ (x >> 31);
    }
    std::size_t operator()(std::uint64_t x) const noexcept {
        static const std::uint64_t SEED =
            std::chrono::steady_clock::now().time_since_epoch().count();
        return splitmix64(x + SEED);
    }
};

int main() {
    std::unordered_set<std::pair<int, int>, PairHash> visited;
    visited.insert({2, 3});
    bool seen = visited.count({2, 3}) > 0;

    std::unordered_map<long long, int, SafeHash> freq;
    freq.reserve(1 << 20);
    freq.max_load_factor(0.5f);                    // shorter chains, more memory
    freq[123456789LL]++;
    return seen ? 0 : 1;
}`],
    codeTitle: ['Counting, lookup without insertion, bucket introspection', 'Custom hash for pairs + anti-hack splitmix64'],
    viz: [{
      title: 'Buckets, collisions and a rehash (std::hash<int> is the identity)',
      input: '12 7 25 3 18 40 5 33 9 | 5',
      inputLabel: 'Keys to insert (0–999) | starting bucket count (a prime 2–13)',
      gen: function (input) {
        var hint = 'Format: keys | starting prime bucket count, e.g. 12 7 25 3 18 | 5';
        var s = clean(input) || '12 7 25 3 18 40 5 33 9 | 5';
        var sp = s.split('|');
        var keys = intsOf(sp[0], 1, 14, 0, 999, hint);
        var bc = sp.length > 1 && sp[1].trim() ? Number(sp[1].trim()) : 5;
        if (!(bc >= 2 && bc <= 13) || !isPrime(bc)) throw new Error('Starting bucket count must be a prime between 2 and 13');
        var buckets = [], frames = [], size = 0, i;
        for (i = 0; i < bc; i++) buckets.push([]);
        function gridOf(hl, lbl) {
          var w = 1; buckets.forEach(function (b) { w = Math.max(w, b.length); });
          var rows = buckets.map(function (b) { var r = b.slice(); if (!r.length) r.push('∅'); while (r.length < w) r.push(''); return r; });
          var ch = []; for (var c = 0; c < w; c++) ch.push(c === 0 ? 'chain →' : '');
          return { type: 'grid', label: lbl || 'bucket array (each row = one bucket, nodes chained left → right)', rowHead: buckets.map(function (_, j) { return 'bucket ' + j; }), colHead: ch, rows: rows, hl: hl || {} };
        }
        function vars(extra) { var o = { 'size()': size, 'bucket_count()': buckets.length, 'load_factor()': (size / buckets.length).toFixed(2), 'max_load_factor()': '1.00' }; if (extra) for (var k in extra) o[k] = extra[k]; return { type: 'vars', label: 'table stats', vals: o }; }
        frames.push({ narr: 'An <code>unordered_set&lt;int&gt;</code> with <b>' + bc + '</b> buckets. For ints, <code>std::hash</code> returns the number itself, so the bucket is simply <code>key % ' + bc + '</code>.', parts: [gridOf(), vars()] });
        keys.forEach(function (k) {
          var b = k % buckets.length;
          if (buckets[b].indexOf(k) >= 0) {
            var hd = {}; hd[b + ',' + buckets[b].indexOf(k)] = 'bad';
            frames.push({ narr: 'insert(<b>' + k + '</b>): bucket ' + k + ' % ' + buckets.length + ' = ' + b + '. Walk the chain comparing with <code>==</code>… found it already → duplicate, nothing inserted (<code>.second == false</code>).', parts: [gridOf(hd), vars()] });
            return;
          }
          if (size + 1 > buckets.length) {
            var nb = nextPrime(2 * buckets.length + 1), old = buckets.length;
            frames.push({ narr: 'insert(<b>' + k + '</b>) would make size ' + (size + 1) + ' &gt; bucket_count ' + old + ' × max_load_factor 1.0. <span class="c-y">Rehash first!</span> Allocate <b>' + nb + '</b> buckets (next prime after 2×' + old + ').', parts: [gridOf({}, 'old bucket array (' + old + ' buckets) — about to be replaced'), vars({ 'about to rehash to': nb })] });
            var all = []; buckets.forEach(function (bk) { bk.forEach(function (x) { all.push(x); }); });
            buckets = []; for (i = 0; i < nb; i++) buckets.push([]);
            all.forEach(function (x) { buckets[x % nb].unshift(x); });
            var hr = {}; buckets.forEach(function (bk, bi) { bk.forEach(function (_, ci) { hr[bi + ',' + ci] = 'win'; }); });
            frames.push({ narr: 'Every node is <b>relinked</b> into bucket <code>key % ' + nb + '</code>. The nodes themselves did not move in memory, so <b>references and pointers to elements stay valid</b> — but all <b>iterators are invalidated</b> and the iteration order changed. This one insert cost O(n); <code>reserve(n)</code> up front would have avoided it.', parts: [gridOf(hr, 'after rehash: ' + nb + ' buckets'), vars({ 'rehash cost': all.length + ' relinks' })] });
            b = k % buckets.length;
          }
          var collide = buckets[b].length > 0;
          buckets[b].unshift(k); size++;
          var h = {}; h[b + ',0'] = 'ok'; for (var c = 1; c < buckets[b].length; c++) h[b + ',' + c] = 'cur';
          frames.push({ narr: 'insert(<b>' + k + '</b>): hash = ' + k + ', bucket = ' + k + ' % ' + buckets.length + ' = <b>' + b + '</b>. ' + (collide ? '<span class="c-y">Collision</span> with ' + buckets[b].slice(1).join(', ') + ' — the new node is linked at the front of that bucket\'s chain (libstdc++ behaviour). Lookups here now compare ' + buckets[b].length + ' keys.' : 'Empty bucket → a chain of length 1.'), parts: [gridOf(h), vars()] });
        });
        var probe = keys[keys.length - 1], pb = probe % buckets.length, hp = {};
        buckets[pb].forEach(function (x, ci) { hp[pb + ',' + ci] = x === probe ? 'sel' : 'cur'; });
        frames.push({ narr: '<code>find(' + probe + ')</code>: one modulo → bucket ' + pb + ', then compare against at most ' + buckets[pb].length + ' key(s). Average chain length = load factor ≤ 1, so lookups are O(1) on average. Iteration order is bucket order: <b>' + [].concat.apply([], buckets).join(', ') + '</b> — clearly not sorted.', parts: [gridOf(hp, 'find(' + probe + ')'), vars()] });
        return frames;
      }
    }, {
      title: 'Hash flooding: identity hash vs a mixing hash on adversarial keys',
      input: '11 | 24',
      inputLabel: 'bucket count | how many keys (keys are 0, B, 2B, 3B, … — all multiples of B)',
      gen: function (input) {
        var hint = 'Format: bucket count | number of keys, e.g. 11 | 24';
        var s = clean(input) || '11 | 24';
        var sp = s.split('|');
        if (sp.length !== 2) throw new Error(hint);
        var B = Number(sp[0].trim()), N = Number(sp[1].trim());
        if (!(B >= 3 && B <= 16) || !(N >= 4 && N <= 40) || B !== Math.floor(B) || N !== Math.floor(N)) throw new Error('bucket count 3..16, keys 4..40');
        var frames = [], steps = [Math.ceil(N / 4), Math.ceil(N / 2), Math.ceil(3 * N / 4), N];
        function lens(n, f) { var L = []; for (var i = 0; i < B; i++) L.push(0); for (var k = 0; k < n; k++) L[f(k * B) % B]++; return L; }
        function idx() { var a = []; for (var i = 0; i < B; i++) a.push('b' + i); return a; }
        var keysShown = []; for (var k = 0; k < Math.min(N, 8); k++) keysShown.push(k * B);
        frames.push({ narr: 'An attacker who knows you use GCC (identity hash, bucket = key % ' + B + ') sends keys <b>' + keysShown.join(', ') + (N > 8 ? ', …' : '') + '</b> — all multiples of the bucket count. (Real attacks also account for the table growing; the idea is the same.)', parts: [{ type: 'array', label: 'adversarial keys', values: keysShown.concat(N > 8 ? ['…'] : []) }] });
        steps.forEach(function (n) {
          var L = lens(n, function (x) { return x; });
          frames.push({ narr: 'Identity hash after <b>' + n + '</b> keys: every key lands in bucket 0. The chain has length ' + n + ', so each lookup compares ~' + n + ' keys. With 10<sup>5</sup> such keys, n operations cost O(n²) ≈ 10<sup>10</sup> → <span class="c-r">TLE / denial of service</span>.', parts: [{ type: 'bars', label: 'chain length per bucket (identity hash)', values: L, idxLabels: idx(), hl: one(0, 'bad') }, { type: 'vars', vals: { keys: n, 'longest chain': Math.max.apply(null, L), 'avg comparisons per lookup': (Math.max.apply(null, L) / 2).toFixed(1) } }] });
        });
        steps.forEach(function (n) {
          var L = lens(n, fmix32), mx = Math.max.apply(null, L), h = {};
          L.forEach(function (v, i) { if (v === mx) h[i] = 'cur'; });
          frames.push({ narr: 'Same keys through a <b>mixing hash</b> (a 32-bit avalanche mixer, the same idea as splitmix64) with a secret seed: after ' + n + ' keys the chains are spread out — longest is ' + mx + '. The attacker cannot predict the buckets without the seed.', parts: [{ type: 'bars', label: 'chain length per bucket (mixed hash)', values: L, idxLabels: idx(), hl: h }, { type: 'vars', vals: { keys: n, 'longest chain': mx, 'ideal ≈ keys / buckets': (n / B).toFixed(1) } }] });
        });
        frames.push({ narr: 'Takeaways: (1) <code>unordered_map</code> is O(1) only <b>on average for non-adversarial keys</b>. (2) On judges with hacking (Codeforces) or for internet-facing services, use a seeded hash. (3) Or use <code>std::map</code>, whose O(log n) is guaranteed.', parts: [{ type: 'text', label: 'Defences', html: 'splitmix64 + random seed · <code>std::map</code> fallback · limit request sizes · SipHash for strings in services' }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Two Sum in one pass', html: `<p>nums = [2, 7, 11, 15], target 9. Walk once; for each x ask "have I seen target − x?". At 7, 9 − 7 = 2 is in the map → answer (0, 1). O(n) average vs O(n²) brute force.</p>`, code: `std::vector<int> twoSum(const std::vector<int>& nums, int target) {
    std::unordered_map<int, int> idx;       // value -> index
    idx.reserve(nums.size());
    for (int i = 0; i < (int)nums.size(); ++i) {
        if (auto it = idx.find(target - nums[i]); it != idx.end()) return {it->second, i};
        idx[nums[i]] = i;
    }
    return {};
}` },
      { title: 'Grid cells as keys without a custom hash', html: `<p>For a grid with up to 10<sup>9</sup> columns, encode <code>(r, c)</code> as <code>(long long)r * 1'000'000'007 + c</code> or <code>((uint64_t)r &lt;&lt; 32) | (uint32_t)c</code>. One 64-bit key, built-in hash, no struct needed. Decode with division/modulo or shifts.</p>`, code: `std::unordered_set<long long> blocked;
auto key = [](int r, int c) { return (static_cast<long long>(r) << 32) | static_cast<unsigned>(c); };
blocked.insert(key(3, 5));
bool isBlocked = blocked.count(key(3, 5));` },
      { title: 'reserve() makes a measurable difference', html: `<p>Inserting 10<sup>6</sup> ints without <code>reserve</code> triggers ~17 rehashes (each relinking every node so far) — roughly 2 million relinks and a lot of allocator traffic. With <code>reserve(1'000'000)</code>: zero rehashes. Typical speedup 1.5–2× for insert-heavy loops. Iteration order may also differ between the two versions — never depend on it.</p>`, code: `std::unordered_map<int, int> m;
m.reserve(1'000'000);
for (int i = 0; i < 1'000'000; ++i) m.emplace(i, i * 2);` },
      { title: 'Struct keys: hash + equality', html: `<p>To use <code>struct Point { int x, y; };</code> as a key you need <code>operator==</code> (C++20: <code>= default</code>) and a hasher. Equal objects <b>must</b> produce equal hashes; the converse is not required (collisions are allowed, just slower).</p>`, code: `struct Point {
    int x, y;
    bool operator==(const Point&) const = default;   // C++20 defaulted equality
};
struct PointHash {
    std::size_t operator()(const Point& p) const noexcept {
        std::size_t h1 = std::hash<int>{}(p.x), h2 = std::hash<int>{}(p.y);
        return h1 ^ (h2 + 0x9e3779b97f4a7c15ULL + (h1 << 6) + (h1 >> 2));   // boost::hash_combine style
    }
};
std::unordered_set<Point, PointHash> pts = {{1, 2}, {3, 4}};` }
    ],
    deepDive: `<p><b>🟣 libstdc++ layout.</b> All nodes form <b>one singly linked list</b>; the bucket array stores, for each bucket, a pointer to the node <i>before</i> that bucket's first node. That makes iteration a simple list walk (O(n), not O(buckets)) and makes erase O(1). For keys whose hash is "slow" (e.g. <code>std::string</code>), each node also caches its hash code so rehashing does not recompute hashes. Bucket counts come from a prime table (…, 13, 29, 59, 127, 257, 541, 1109, …) — primes make <code>% bucket_count</code> mix poor hashes a little better. libc++ uses power-of-two bucket counts when possible (cheap masking) and primes otherwise; MSVC uses power-of-two buckets with a different layout.</p>
<p><b>Why node-based?</b> The standard requires references to stay valid across rehash and exposes a bucket interface, which practically forces separate chaining with individually allocated nodes. Open-addressing tables — Abseil <code>flat_hash_map</code> (Swiss tables, SIMD probing of 16 control bytes), <code>boost::unordered_flat_map</code>, <code>ankerl::unordered_dense</code> — store elements inline, are often 2–5× faster and use far less memory, but invalidate references on rehash. Most high-performance codebases in 2026 use one of those instead of <code>std::unordered_map</code>.</p>
<p><b>Worst cases.</b> All keys in one bucket → every operation O(n). Causes: adversarial input (identity hash), a terrible user hash (returning a constant), or a hash that ignores the bits used for bucketing (e.g. pointers aligned to 16 bytes into a power-of-two table without mixing). Java mitigates long chains by turning buckets into trees; the C++ standard library does not.</p>
<p><b>Rehash cost spikes.</b> A rehash of a 10-million-element table relinks 10 million nodes in one call — tens of milliseconds of latency at an unlucky moment. Latency-critical services <code>reserve</code> up front or use incremental-rehash designs.</p>
<p><b>Heterogeneous lookup.</b> Since C++20, unordered containers support transparent hashing: give the hasher <code>using is_transparent = void;</code> and use <code>std::equal_to&lt;&gt;</code>, then <code>find(std::string_view)</code> works without building a temporary <code>std::string</code>.</p>`,
    aiEra: `<p><b>🤖 What AI changes:</b> Assistants default to <code>unordered_map</code> for everything, which is usually right for speed — but they rarely add <code>reserve</code>, often write <code>std::unordered_map&lt;std::pair&lt;int,int&gt;, int&gt;</code> (does not compile: no <code>std::hash</code> for pair) and then "fix" it with a weak hasher like <code>h1 ^ h2</code> (so (1,2) and (2,1) collide, and (x,x) always hashes to 0).</p>
<p><b>Use AI as a partner:</b> <code>"Write a hash for this struct that combines all fields, and test it for collisions on a 1000×1000 grid"</code>; <code>"Benchmark std::unordered_map vs absl::flat_hash_map vs std::map for my access pattern"</code>; <code>"Is this hash map exposed to user-controlled keys? If so, add a seeded hash."</code></p>
<p><b>Where AI goes wrong:</b> claiming lookups are "always O(1)", depending on iteration order in tests (flaky across compilers), or using <code>m[key]</code> inside a <code>const</code> function.</p>
<p><b>What you must still own:</b> load factor and rehash mechanics, knowing when ordering requirements rule hashing out, recognising hash-flooding risk, and being able to write a correct hash combine on the spot.</p>`,
    problems: [{
      title: 'Longest Consecutive Sequence',
      level: 'Medium', tags: ['unordered_set', 'hashing'], companies: ['Google', 'Amazon', 'Meta', 'Spotify'],
      statement: `<p>Given an unsorted array of integers, return the length of the longest run of <b>consecutive integers</b> (values x, x+1, x+2, … in any positions). Your algorithm must run in <b>O(n)</b> expected time.</p>`,
      constraints: `0 ≤ n ≤ 10<sup>5</sup>, −10<sup>9</sup> ≤ nums[i] ≤ 10<sup>9</sup>; duplicates possible.`,
      example: `<p>nums = ${H.arr([100, 4, 200, 1, 3, 2], { hl: { 1: 'g', 3: 'g', 4: 'g', 5: 'g' } })} → <b>4</b>, because 1, 2, 3, 4 are all present. 100 and 200 are runs of length 1.</p>`,
      brute: {
        why: `<p>For each number, count upwards by searching the <b>array</b> for x+1, x+2, … with a linear scan. That is O(n) per search and up to O(n) searches per start: O(n²)–O(n³). Even the sort-then-scan approach is O(n log n), which misses the O(n) requirement.</p>`,
        code: `int longestBrute(const std::vector<int>& nums) {
    int best = 0;
    for (int x : nums) {
        long long cur = x;
        int len = 1;
        while (std::find(nums.begin(), nums.end(), cur + 1) != nums.end()) { ++cur; ++len; }   // O(n) search
        best = std::max(best, len);
    }
    return best;
}`
      },
      mcq: { q: 'With all numbers in an unordered_set, from which numbers should you start counting a run?', options: ['From every number', 'Only from numbers x where x − 1 is NOT in the set', 'Only from the smallest number', 'Only from numbers where x + 1 is in the set'], answer: 1, explain: 'If x − 1 exists, x is in the middle of a run that will be counted from its true start. Starting only at run starts means each number is visited by at most one counting walk → O(n) total.' },
      hints: [
        `<p>Hint 1: Membership tests ("is x+1 present?") in O(1) → put every number in an <code>std::unordered_set&lt;int&gt;</code>.</p>`,
        `<p>Hint 2: Only begin counting at a <b>run start</b>: x such that x−1 is not in the set. Then walk x+1, x+2, … while present.</p>`,
        `<p>Hint 3: Iterate over the <b>set</b>, not the array, so duplicates do not trigger repeated walks; <code>reserve(n)</code> first. Watch overflow on x+1 at 2<sup>31</sup>−1 — use <code>long long</code> or compare before adding. Empty input → 0.</p>`
      ],
      solution: {
        approach: `<p>Insert all numbers into an <code>unordered_set</code>. For each element x of the set with x−1 absent, walk upward while x+1, x+2, … are present and record the length. Every number is touched once by the insert, once by the outer loop, and at most once inside a walk → O(n) expected.</p>`,
        code: `#include <unordered_set>
#include <vector>
#include <algorithm>

int longestConsecutive(const std::vector<int>& nums) {
    std::unordered_set<int> s;
    s.reserve(nums.size() * 2);
    s.insert(nums.begin(), nums.end());
    int best = 0;
    for (int x : s) {
        if (x != INT_MIN && s.count(x - 1)) continue;   // not the start of a run
        int len = 1;
        long long y = x;
        while (y + 1 <= INT_MAX && s.count(static_cast<int>(y + 1))) { ++y; ++len; }
        best = std::max(best, len);
    }
    return best;
}`,
        dry: { head: ['x (from set)', 'x−1 in set?', 'walk', 'len', 'best'], rows: [['100', 'no → start', '101? no', '1', '1'], ['4', 'yes (3) → skip', '—', '—', '1'], ['200', 'no → start', '201? no', '1', '1'], ['1', 'no → start', '2 ✓ 3 ✓ 4 ✓ 5 ✗', '4', H.c('g', '4')], ['3', 'yes → skip', '—', '—', '4'], ['2', 'yes → skip', '—', '—', '4']] },
        complexity: `<p>O(n) expected time (each number inserted once, walked at most once); O(n) extra space. Worst case with adversarial hashing degrades to O(n²) — mention it.</p>`,
        followUps: ['Return the sequence itself, not just its length.', 'Solve it with union-find instead.', 'What if the numbers arrive as a stream and you must answer after each insert?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — stack & queue container adapters
     ====================================================================== */
  var BRACKET_CODE = 'std::stack<char> st;\nfor (char c : s) {\n    if (c == \'(\' || c == \'[\' || c == \'{\') st.push(c);\n    else {\n        if (st.empty() || st.top() != match(c)) return false;\n        st.pop();\n    }\n}\nreturn st.empty();';
  topics.push({
    title: 'std::stack & std::queue — Container Adapters',
    analogy: `<p>A <b>stack</b> is a pile of plates: you add to the top and take from the top — last in, first out (LIFO). A <b>queue</b> is the line at a coffee shop: join at the back, get served at the front — first in, first out (FIFO). Neither is a new kind of storage: they are <b>a rule sheet taped onto an existing cupboard</b> (a deque, vector or list) that only lets you use certain doors.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> <code>std::stack&lt;T&gt;</code> and <code>std::queue&lt;T&gt;</code> are <b>container adapters</b>: thin wrappers that hold a real container inside and expose only a few operations. That restriction is the point — the type documents your intent and makes misuse impossible.</p>
${H.table(['adapter', 'operations', 'default inside', 'also allowed inside'], [['<code>stack&lt;T&gt;</code>', '<code>push</code>, <code>emplace</code>, <code>pop</code>, <code>top</code>, <code>empty</code>, <code>size</code>', '<code>deque&lt;T&gt;</code>', '<code>vector&lt;T&gt;</code>, <code>list&lt;T&gt;</code> (needs back/push_back/pop_back)'], ['<code>queue&lt;T&gt;</code>', '<code>push</code>, <code>emplace</code>, <code>pop</code>, <code>front</code>, <code>back</code>, <code>empty</code>, <code>size</code>', '<code>deque&lt;T&gt;</code>', '<code>list&lt;T&gt;</code> (needs pop_front — so <b>not</b> vector)'], ['<code>priority_queue&lt;T&gt;</code>', '<code>push</code>, <code>pop</code>, <code>top</code>…', '<code>vector&lt;T&gt;</code>', '<code>deque&lt;T&gt;</code> (needs random access) — next topic']])}
<p><b>Things that surprise beginners:</b></p>
<ul>
<li><code>pop()</code> returns <b>void</b>. Read with <code>top()</code>/<code>front()</code> first, then <code>pop()</code>. (Reason: returning the removed element by value could throw during the copy after the element was already removed, losing it — the API is designed for exception safety.)</li>
<li>Calling <code>top()</code>, <code>front()</code> or <code>pop()</code> on an <b>empty</b> adapter is undefined behaviour — always check <code>empty()</code>.</li>
<li>No iterators, no indexing, no <code>clear()</code> (assign an empty one: <code>st = {}</code>). If you need to look inside, you wanted the underlying container directly.</li>
<li><code>std::stack&lt;int, std::vector&lt;int&gt;&gt;</code> is often faster than the deque default (one contiguous block, no block hopping) — handy in tight loops.</li>
</ul>
<p><b>Where they appear in interviews:</b> stacks for bracket matching, undo, DFS without recursion, expression evaluation, and <b>monotonic stacks</b> ("next greater element", "daily temperatures", "largest rectangle in histogram"). Queues for <b>BFS</b> (shortest path in unweighted graphs, level-order traversal), task scheduling, rate limiters and producer/consumer buffers.</p>`,
    clues: [
      '"valid parentheses", "undo", "most recent unmatched", "backtrack to previous" → <code>stack</code>',
      '"next greater/smaller element", "span", "histogram" → monotonic <code>stack</code> of indices, O(n)',
      '"shortest path / minimum steps in an unweighted grid or graph", "level by level" → <code>queue</code> (BFS)',
      '"process in arrival order", "first come first served", "recent calls in the last 3000 ms" → <code>queue</code>',
      '"implement a queue with stacks" / "stack with queues" → adapter design questions (amortized analysis)',
      '"deep recursion overflowing the call stack" → explicit <code>std::stack</code> on the heap'
    ],
    code: [`#include <stack>
#include <queue>
#include <vector>
#include <list>
#include <iostream>

int main() {
    std::stack<int> s;                      // deque<int> inside
    s.push(1); s.push(2); s.emplace(3);
    while (!s.empty()) {
        std::cout << s.top() << ' ';        // read first...
        s.pop();                            // ...then remove (pop returns void)
    }                                       // prints 3 2 1

    std::queue<std::string> q;              // deque<string> inside
    q.push("first"); q.push("second"); q.emplace("third");
    std::cout << "\\n" << q.front() << " .. " << q.back() << "\\n";   // first .. third
    q.pop();                                // removes "first"

    std::stack<int, std::vector<int>> fast;    // vector-backed stack: contiguous, cache-friendly
    std::queue<int, std::list<int>> listQ;     // list-backed queue (vector is NOT allowed: no pop_front)
    fast.push(42); listQ.push(7);
    q = {};                                     // "clear" an adapter
    std::cout << q.size() << ' ' << fast.top() << ' ' << listQ.front() << "\\n";   // 0 42 7
}`, `#include <queue>
#include <vector>
#include <string>
#include <array>

// BFS: minimum number of moves from (0,0) to (R-1,C-1) in a grid of '.' (free) and '#' (wall)
int shortestPath(const std::vector<std::string>& g) {
    int R = g.size(), C = g[0].size();
    if (g[0][0] == '#') return -1;
    std::vector<std::vector<int>> dist(R, std::vector<int>(C, -1));
    std::queue<std::pair<int, int>> q;
    dist[0][0] = 0;
    q.push({0, 0});
    const std::array<int, 4> dr = {1, -1, 0, 0}, dc = {0, 0, 1, -1};
    while (!q.empty()) {
        auto [r, c] = q.front();
        q.pop();
        if (r == R - 1 && c == C - 1) return dist[r][c];   // first time we reach it = shortest
        for (int k = 0; k < 4; ++k) {
            int nr = r + dr[k], nc = c + dc[k];
            if (nr >= 0 && nc >= 0 && nr < R && nc < C && g[nr][nc] == '.' && dist[nr][nc] == -1) {
                dist[nr][nc] = dist[r][c] + 1;                // mark when PUSHED, not when popped
                q.push({nr, nc});
            }
        }
    }
    return -1;
}`],
    codeTitle: ['stack/queue basics and choosing the underlying container', 'BFS with std::queue (shortest path in a grid)'],
    viz: [{
      title: 'Valid parentheses with a std::stack',
      input: '{[()()]}(',
      inputLabel: 'A string of brackets ()[]{} (max 20)',
      gen: function (input) {
        var s = clean(input) || '{[()()]}(';
        if (s.length > 20 || !/^[()\[\]{}]+$/.test(s)) throw new Error('Use only the characters ()[]{} — at most 20 of them');
        var match = { ')': '(', ']': '[', '}': '{' }, st = [], frames = [];
        frames.push({ narr: 'Scan <b>' + H.esc(s) + '</b> left to right. Openers are pushed; each closer must match the <b>most recent</b> unmatched opener — exactly what the top of a stack holds.', parts: [codePart(BRACKET_CODE, { 1: 'cur' }), { type: 'array', label: 'input', values: s.split('') }, { type: 'stack', label: 'std::stack&lt;char&gt;', items: [] }] });
        for (var i = 0; i < s.length; i++) {
          var c = s[i];
          if (match[c] === undefined) {
            st.push(c);
            frames.push({ narr: '<b>' + c + '</b> is an opener → <code>push</code>. It waits on top until its partner shows up.', parts: [codePart(BRACKET_CODE, { 3: 'ok' }), { type: 'array', label: 'input', values: s.split(''), ptr: one(i, 'c'), hl: one(i, 'cur') }, { type: 'stack', label: 'std::stack&lt;char&gt;', items: st.slice(), hl: one(st.length - 1, 'ok') }] });
          } else if (!st.length || st[st.length - 1] !== match[c]) {
            frames.push({ narr: '<b>' + c + '</b> is a closer, but ' + (st.length ? 'the top is <b>' + st[st.length - 1] + '</b>, not <b>' + match[c] + '</b>' : 'the stack is <b>empty</b> (calling <code>top()</code> here would be UB — that is why we check <code>empty()</code> first)') + ' → <span class="c-r">invalid</span>, return false.', parts: [codePart(BRACKET_CODE, { 5: 'bad' }), { type: 'array', label: 'input', values: s.split(''), ptr: one(i, 'c'), hl: one(i, 'bad') }, { type: 'stack', label: 'std::stack&lt;char&gt;', items: st.slice(), hl: st.length ? one(st.length - 1, 'bad') : {} }] });
            return frames;
          } else {
            frames.push({ narr: '<b>' + c + '</b> matches the top <b>' + st[st.length - 1] + '</b> → <code>pop()</code> (read with top() first; pop itself returns nothing).', parts: [codePart(BRACKET_CODE, { 5: 'ok', 6: 'cur' }), { type: 'array', label: 'input', values: s.split(''), ptr: one(i, 'c'), hl: one(i, 'ok') }, { type: 'stack', label: 'std::stack&lt;char&gt;', items: st.slice(), hl: one(st.length - 1, 'sel') }] });
            st.pop();
          }
        }
        frames.push({ narr: 'End of input. ' + (st.length ? 'The stack still holds <b>' + st.join(' ') + '</b> — unmatched openers → <span class="c-r">invalid</span>.' : 'Stack is empty → every opener was matched → <span class="c-g">valid</span>.') + ' O(n) time, O(n) space.', parts: [codePart(BRACKET_CODE, { 9: st.length ? 'bad' : 'ok' }), { type: 'stack', label: 'std::stack&lt;char&gt;', items: st.slice(), hl: hlRange(0, st.length - 1, 'bad') }] });
        return frames;
      }
    }, {
      title: 'BFS level order with a std::queue',
      input: '1 2 3 4 5 null 6 7',
      inputLabel: 'Binary tree in level order (null = missing), up to 15 slots',
      gen: function (input) {
        var toks = (clean(input) || '1 2 3 4 5 null 6 7').split(/[\s,]+/);
        if (toks.length > 15 || toks[0] === 'null') throw new Error('Give up to 15 values in level order; first must not be null');
        var arr = toks.map(function (t) { if (t === 'null') return null; var v = Number(t); if (isNaN(v)) throw new Error('Use numbers or null'); return v; });
        for (var i = 1; i < arr.length; i++) if (arr[i] !== null && arr[(i - 1) >> 1] === null) throw new Error('Node at slot ' + i + ' has a null parent — fix the level order');
        var frames = [], q = [0], out = [], done = {}, level = [];
        frames.push({ narr: 'BFS visits a tree level by level. Start by pushing the root into a <code>std::queue</code>.', parts: [{ type: 'tree', arr: arr, hl: one(0, 'cur') }, { type: 'queue', label: 'std::queue&lt;TreeNode*&gt;', items: [arr[0]] }] });
        var steps = 0;
        while (q.length && steps < 40) {
          steps++;
          var lvlSize = q.length, vals = [];
          frames.push({ narr: 'Queue holds <b>' + lvlSize + '</b> node(s) = exactly one level. Process that many.', parts: [{ type: 'tree', arr: arr, hl: (function () { var h = {}; Object.keys(done).forEach(function (k) { h[k] = 'done'; }); q.forEach(function (k) { h[k] = 'win'; }); return h; })() }, { type: 'queue', label: 'std::queue', items: q.map(function (k) { return arr[k]; }), hl: hlRange(0, lvlSize - 1, 'win') }, { type: 'array', label: 'levels so far', values: out.length ? out.slice() : ['(none)'] }] });
          for (var j = 0; j < lvlSize; j++) {
            var n = q.shift(); done[n] = 1; vals.push(arr[n]);
            var kids = [2 * n + 1, 2 * n + 2].filter(function (c) { return c < arr.length && arr[c] !== null; });
            kids.forEach(function (c) { q.push(c); });
            var h = {}; Object.keys(done).forEach(function (k) { h[k] = 'done'; }); h[n] = 'ok'; kids.forEach(function (c) { h[c] = 'cur'; });
            frames.push({ narr: '<code>front()</code> = <b>' + arr[n] + '</b>, <code>pop()</code> it, then push its children' + (kids.length ? ' <b>' + kids.map(function (c) { return arr[c]; }).join(', ') + '</b> to the back.' : ' (none).') + ' FIFO order guarantees the whole current level is processed before the next level starts.', parts: [{ type: 'tree', arr: arr, hl: h }, { type: 'queue', label: 'std::queue', items: q.map(function (k) { return arr[k]; }), hl: (function () { var hh = {}; for (var t = q.length - kids.length; t < q.length; t++) hh[t] = 'ok'; return hh; })() }] });
          }
          out.push('[' + vals.join(',') + ']');
        }
        frames.push({ narr: 'Queue empty → done. Level order: <b>' + out.join(' ') + '</b>. Each node is pushed and popped once: O(n) time, O(width) queue space.', parts: [{ type: 'tree', arr: arr, hl: (function () { var h = {}; arr.forEach(function (v, k) { if (v !== null) h[k] = 'done'; }); return h; })() }, { type: 'array', label: 'levels', values: out }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Daily Temperatures with a monotonic stack', html: `<p>temps = [73, 74, 75, 71, 69, 72, 76, 73]. Keep a stack of indices whose temperatures are <b>decreasing</b>. When a warmer day arrives, pop every colder day and record the gap. Answer: [1, 1, 4, 2, 1, 1, 0, 0]. Each index pushed and popped once → O(n).</p>`, code: `std::vector<int> dailyTemperatures(const std::vector<int>& t) {
    std::vector<int> ans(t.size(), 0);
    std::stack<int, std::vector<int>> st;          // indices, temperatures decreasing
    for (int i = 0; i < (int)t.size(); ++i) {
        while (!st.empty() && t[st.top()] < t[i]) {
            ans[st.top()] = i - st.top();
            st.pop();
        }
        st.push(i);
    }
    return ans;
}` },
      { title: 'Recent Counter (sliding time window)', html: `<p>Count requests in the last 3000 ms. Push each timestamp; pop from the front while <code>front() &lt; t − 3000</code>; the answer is <code>size()</code>. Timestamps arrive in increasing order, so the oldest is always at the front — perfect FIFO.</p>`, code: `class RecentCounter {
    std::queue<int> q;
public:
    int ping(int t) {
        q.push(t);
        while (q.front() < t - 3000) q.pop();
        return static_cast<int>(q.size());
    }
};` },
      { title: 'Iterative DFS to avoid stack overflow', html: `<p>Recursive DFS on a path graph of 10<sup>6</sup> nodes needs 10<sup>6</sup> call frames — typically more than the default 8 MB (Linux) or 1 MB (Windows) thread stack → crash. An explicit <code>std::stack</code> lives on the heap and can grow to any size.</p>`, code: `int countReachable(const std::vector<std::vector<int>>& adj, int src) {
    std::vector<char> seen(adj.size(), 0);
    std::stack<int, std::vector<int>> st;
    st.push(src);
    seen[src] = 1;
    int count = 0;
    while (!st.empty()) {
        int u = st.top(); st.pop();
        ++count;
        for (int v : adj[u]) if (!seen[v]) { seen[v] = 1; st.push(v); }
    }
    return count;
}` }
    ],
    deepDive: `<p><b>🟣 How thin is an adapter?</b> <code>template&lt;class T, class Container = deque&lt;T&gt;&gt; class stack { protected: Container c; … };</code> — every member is a one-line forward (<code>push(x)</code> → <code>c.push_back(x)</code>, <code>top()</code> → <code>c.back()</code>). The member <code>c</code> is <b>protected</b>, so you can inherit from the adapter to reach the container (a known trick to iterate a priority_queue's heap). Zero overhead after inlining.</p>
<p><b>Why deque by default?</b> Historically: deque gives O(1) at both ends with no big reallocation copies and releases memory as it shrinks. For <code>stack</code>, <code>vector</code> is usually faster in practice (contiguous, no block arithmetic), at the cost of reallocation spikes and keeping peak capacity. For <code>queue</code>, the alternatives are <code>list</code> (allocation per element) or a hand-written ring buffer.</p>
<p><b>C++23 additions:</b> adapters gained iterator-pair constructors (<code>std::stack s(v.begin(), v.end())</code>) and <code>push_range</code>. Containers in general got <code>insert_range</code>/<code>append_range</code> and construction from ranges via <code>std::from_range</code>.</p>
<p><b>Amortized two-stack queue.</b> A queue built from an "in" stack and an "out" stack transfers elements only when "out" is empty. Each element is moved at most twice in its lifetime → O(1) amortized per operation, though a single <code>pop</code> can be O(n). This is the foundation of functional (immutable) queues and a favourite interview question.</p>
<p><b>Concurrency.</b> Adapters are not thread-safe. A producer/consumer queue needs a mutex + <code>condition_variable</code> (blocking) or a lock-free design (Boost.Lockfree, <code>moodycamel::ConcurrentQueue</code>); the "check <code>empty()</code>, then <code>front()</code>" pattern is a race even under separate locks — the check and the read must be one atomic operation (<code>try_pop</code>).</p>`,
    aiEra: `<p><b>🤖 What AI changes:</b> Stack/queue code is the most memorised material in the world, so AI output is usually correct — except for <b>empty-checks</b> (calling <code>top()</code> on an empty stack in an edge case), writing <code>int x = st.pop();</code> (does not compile in C++), and marking BFS nodes visited when popped instead of when pushed (exponential blowup on dense grids).</p>
<p><b>Use AI as a partner:</b> ask it to generate adversarial inputs (<code>")"</code>, <code>"(((("</code>, empty string) for your bracket checker; ask <code>"Convert this recursive DFS to an explicit stack and keep the same visiting order"</code> — then verify the order yourself, because pre-order with an explicit stack needs children pushed in reverse.</p>
<p><b>Where AI goes wrong:</b> suggesting <code>std::queue&lt;int, std::vector&lt;int&gt;&gt;</code> (no <code>pop_front</code>, does not compile on use), or claiming <code>std::stack</code> has <code>clear()</code>.</p>
<p><b>What you must still own:</b> spotting LIFO vs FIFO in problem wording, the monotonic-stack invariant, BFS correctness (why first arrival = shortest path), and amortized arguments.</p>`,
    problems: [{
      title: 'Min Stack',
      level: 'Medium', tags: ['stack', 'design'], companies: ['Amazon', 'Bloomberg', 'Microsoft', 'Goldman Sachs'],
      statement: `<p>Design a stack that supports <code>push(x)</code>, <code>pop()</code>, <code>top()</code> and <code>getMin()</code> — the minimum element currently in the stack — all in <b>O(1)</b> time.</p>`,
      constraints: `−2<sup>31</sup> ≤ x ≤ 2<sup>31</sup>−1; pop/top/getMin are only called on a non-empty stack; up to 3·10<sup>4</sup> calls.`,
      example: `<p>push(−2), push(0), push(−3), getMin() → <b>−3</b>, pop(), top() → <b>0</b>, getMin() → <b>−2</b>. After popping −3 the minimum must "remember" that −2 was the minimum before −3 arrived.</p>`,
      brute: {
        why: `<p>Keep a plain vector and scan it on every <code>getMin()</code>: O(n) per call, 3·10<sup>4</sup> × 3·10<sup>4</sup> ≈ 10<sup>9</sup> in the worst case. The waste: the minimum of the elements below the top never changes while they stay below — we keep recomputing a known answer.</p>`,
        code: `class MinStackSlow {
    std::vector<int> v;
public:
    void push(int x) { v.push_back(x); }
    void pop() { v.pop_back(); }
    int top() const { return v.back(); }
    int getMin() const { return *std::min_element(v.begin(), v.end()); }   // O(n) every time
};`
      },
      mcq: { q: 'What extra information makes getMin() O(1)?', options: ['A sorted copy of the stack', 'For every element, the minimum of all elements at or below it', 'Only the global minimum ever seen', 'A hash map of counts'], answer: 1, explain: 'If each stack entry stores min(itself, min below it), the top entry always knows the current minimum, and popping automatically restores the previous minimum. A single global minimum breaks as soon as you pop it.' },
      hints: [
        `<p>Hint 1: The minimum only changes when you push something smaller, and it must be restored when that element is popped — a "history" of minimums, which is itself LIFO.</p>`,
        `<p>Hint 2: Store pairs in one stack: <code>std::stack&lt;std::pair&lt;int,int&gt;&gt;</code> where <code>second</code> = min of everything at or below this entry.</p>`,
        `<p>Hint 3: On push: <code>newMin = empty ? x : min(x, top().second)</code>. Pop just pops. Memory-saving variant: a second stack that only pushes when <code>x ≤ currentMin</code> (note ≤, for duplicates).</p>`
      ],
      solution: {
        approach: `<p>Each entry remembers the minimum of the stack <b>at the moment it was pushed</b>. Since stack entries are removed in reverse order, the top entry's stored minimum is always the current minimum. All operations are single <code>std::stack</code> calls: O(1).</p>`,
        code: `#include <stack>
#include <utility>
#include <algorithm>

class MinStack {
    std::stack<std::pair<int, int>> st;   // (value, minimum of this entry and everything below)
public:
    void push(int x) {
        int m = st.empty() ? x : std::min(x, st.top().second);
        st.emplace(x, m);
    }
    void pop() { st.pop(); }
    int top() const { return st.top().first; }
    int getMin() const { return st.top().second; }
};`,
        alt: [{ lang: 'cpp', code: `// Two-stack variant: the min stack only grows when a new minimum (or a tie) arrives
class MinStack2 {
    std::stack<int, std::vector<int>> vals, mins;
public:
    void push(int x) {
        vals.push(x);
        if (mins.empty() || x <= mins.top()) mins.push(x);   // <= keeps duplicates of the minimum
    }
    void pop() {
        if (vals.top() == mins.top()) mins.pop();
        vals.pop();
    }
    int top() const { return vals.top(); }
    int getMin() const { return mins.top(); }
};` }],
        dry: { head: ['call', 'stack (bottom → top) as (val,min)', 'returns'], rows: [['push(−2)', '(−2,−2)', ''], ['push(0)', '(−2,−2) (0,−2)', ''], ['push(−3)', '(−2,−2) (0,−2) (−3,−3)', ''], ['getMin()', 'unchanged', H.c('g', '−3')], ['pop()', '(−2,−2) (0,−2)', ''], ['top()', 'unchanged', '0'], ['getMin()', 'unchanged', H.c('g', '−2')]] },
        complexity: `<p>O(1) for every operation; O(n) extra space (one extra int per element, or fewer with the two-stack variant).</p>`,
        followUps: ['Max Stack with <code>popMax()</code> (needs a list + ordered map, O(log n)).', 'Min Queue: combine two min-stacks (amortized O(1)).', 'Do it with O(1) extra space by storing encoded differences (watch overflow).']
      }
    }]
  });

  /* ======================================================================
     TOPIC 8 — std::priority_queue (binary heap)
     ====================================================================== */
  topics.push({
    title: 'std::priority_queue — A Binary Heap in a Vector',
    analogy: `<p>A <b>hospital emergency room</b>. Patients do not get seen in arrival order — the most urgent case is always next. The triage nurse does not keep the whole waiting list perfectly sorted (too much work); she only guarantees that <b>whoever is most urgent is at the front</b>. When that patient goes in, a quick reshuffle finds the next most urgent. That "only the top is guaranteed" idea is a <b>heap</b>.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> <code>std::priority_queue&lt;T&gt;</code> always lets you see and remove the <b>largest</b> element (by default). <code>top()</code> is O(1); <code>push</code> and <code>pop</code> are O(log n). It is a container adapter over a <code>vector</code> organised as a <b>binary max-heap</b>.</p>
<p><b>The heap in an array:</b> the tree is stored level by level, no pointers. For index i: parent = (i − 1) / 2, children = 2i + 1 and 2i + 2. The only rule: <b>every parent ≥ its children</b>. Siblings are in no particular order, so the array is <i>not</i> sorted.</p>
${H.arr([9, 5, 8, 1, 3, 2], { label: 'heap array', hl: { 0: 'g' } })}
<p>Index 0 (9) is the max; 5 and 8 are its children; 1 and 3 are 5's children; 2 is 8's child.</p>
<ul>
<li><b>push(x)</b>: append at the end, then <b>sift up</b> — swap with the parent while the parent is smaller. At most log₂n swaps.</li>
<li><b>pop()</b>: move the last element to the root, shrink, then <b>sift down</b> — swap with the larger child while a child is bigger. At most log₂n swaps.</li>
<li><b>Building from n elements</b> (<code>priority_queue pq(v.begin(), v.end())</code> or <code>std::make_heap</code>) is <b>O(n)</b>, not O(n log n).</li>
</ul>
<p><b>The comparator is "backwards" — memorise this:</b> the comparator answers "<i>does a have lower priority than b?</i>". With the default <code>std::less&lt;T&gt;</code>, smaller = lower priority → the <b>max</b> is on top. With <code>std::greater&lt;T&gt;</code> you get a <b>min-heap</b>:</p>
<pre>std::priority_queue&lt;int, std::vector&lt;int&gt;, std::greater&lt;int&gt;&gt; minHeap;</pre>
<p>Custom: <code>auto cmp = [](const P&amp; a, const P&amp; b) { return a.dist &gt; b.dist; };</code> → smallest dist on top (Dijkstra). Also handy: negate numbers into a max-heap to fake a min-heap, or push <code>pair&lt;priority, id&gt;</code> since pairs compare lexicographically.</p>
<p><b>What it cannot do:</b> no iteration, no <code>find</code>, no "decrease key", no removing an arbitrary element. Workarounds: <b>lazy deletion</b> (push the updated entry, skip stale ones when popped — standard in Dijkstra), or use a <code>std::set</code> as an updatable priority queue.</p>`,
    clues: [
      '"k largest / k smallest / top k / k-th largest" → heap of size k (min-heap for largest!), O(n log k)',
      '"repeatedly take the smallest/largest and add something back" (merge k lists, Huffman, connect ropes, last stone) → <code>priority_queue</code>',
      '"shortest path with weights" → Dijkstra with a min-heap of (dist, node)',
      '"schedule tasks by deadline/priority", "meeting rooms needed" → heap of end times',
      '"median of a stream" → two heaps (max-heap low half, min-heap high half)',
      '"need to update priorities or delete arbitrary items" → <code>set</code> or lazy deletion, not plain priority_queue'
    ],
    code: [`#include <queue>
#include <vector>
#include <functional>
#include <iostream>

int main() {
    std::priority_queue<int> maxHeap;                       // largest on top
    for (int x : {5, 1, 8, 3, 9}) maxHeap.push(x);
    std::cout << maxHeap.top() << "\\n";                     // 9

    std::priority_queue<int, std::vector<int>, std::greater<int>> minHeap;   // smallest on top
    for (int x : {5, 1, 8, 3, 9}) minHeap.push(x);
    while (!minHeap.empty()) { std::cout << minHeap.top() << ' '; minHeap.pop(); }   // 1 3 5 8 9

    std::vector<int> data = {4, 7, 2, 6};
    std::priority_queue<int> built(data.begin(), data.end());   // O(n) heapify

    // pairs compare by .first, then .second -> (distance, node) for Dijkstra
    using P = std::pair<long long, int>;
    std::priority_queue<P, std::vector<P>, std::greater<P>> pq;
    pq.push({7, 2}); pq.push({3, 5}); pq.push({3, 1});
    std::cout << "\\n" << pq.top().first << ' ' << pq.top().second << "\\n";   // 3 1

    struct Job { int priority; std::string name; };
    auto lower = [](const Job& a, const Job& b) { return a.priority < b.priority; };   // "a below b"
    std::priority_queue<Job, std::vector<Job>, decltype(lower)> jobs(lower);
    jobs.push({1, "email"}); jobs.push({9, "outage"}); jobs.push({4, "review"});
    std::cout << jobs.top().name << "\\n";                    // outage
}`, `#include <vector>
#include <queue>
#include <utility>
#include <limits>

// Dijkstra with lazy deletion: stale heap entries are skipped instead of "decrease-key"
std::vector<long long> dijkstra(int n, const std::vector<std::vector<std::pair<int, int>>>& adj, int src) {
    const long long INF = std::numeric_limits<long long>::max();
    std::vector<long long> dist(n, INF);
    using P = std::pair<long long, int>;                     // (distance, node)
    std::priority_queue<P, std::vector<P>, std::greater<P>> pq;
    dist[src] = 0;
    pq.push({0, src});
    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (d != dist[u]) continue;                          // stale entry: a shorter path was found later
        for (auto [v, w] : adj[u]) {
            if (d + w < dist[v]) {
                dist[v] = d + w;
                pq.push({dist[v], v});                       // push a new entry instead of updating
            }
        }
    }
    return dist;
}`],
    codeTitle: ['max-heap, min-heap, heapify, pairs and custom comparators', 'Dijkstra with lazy deletion'],
    viz: [{
      title: 'push / pop on a binary heap (tree view + the actual vector)',
      input: '5 3 8 1 9 p 2 7 p p',
      inputLabel: 'Numbers = push, p = pop. Prefix with "min:" for a min-heap (std::greater). Max 15 elements.',
      gen: function (input) {
        var s = clean(input) || '5 3 8 1 9 p 2 7 p p';
        var isMin = /^min\s*:/i.test(s);
        s = s.replace(/^(min|max)\s*:/i, '');
        var toks = s.trim().split(/[\s,]+/).filter(function (t) { return t.length; });
        if (!toks.length || toks.length > 24) throw new Error('Give 1–24 tokens: numbers to push, p to pop. Example: 5 3 8 p 2');
        var ops = toks.map(function (t) { if (t === 'p' || t === 'P') return null; var v = Number(t); if (isNaN(v) || v !== Math.floor(v) || Math.abs(v) > 999) throw new Error('Use integers (|x| ≤ 999) or p'); return v; });
        var h = [], frames = [], name = isMin ? 'min-heap (std::greater)' : 'max-heap (std::less, the default)';
        function better(a, b) { return isMin ? a < b : a > b; }
        function parts(hl, extra) {
          var p = [{ type: 'tree', label: name, arr: h.length ? h.slice() : ['∅'], hl: hl || {} }, { type: 'array', label: 'underlying std::vector (level order)', values: h.length ? h.slice() : ['(empty)'], hl: hl || {} }];
          if (extra) p.push(extra);
          return p;
        }
        frames.push({ narr: 'A ' + name + '. Rule: every parent is ' + (isMin ? '≤' : '≥') + ' its children, so <code>top()</code> = index 0 = the ' + (isMin ? 'smallest' : 'largest') + '. Parent of i is (i−1)/2, children are 2i+1 and 2i+2.', parts: parts() });
        ops.forEach(function (v) {
          if (v !== null) {
            if (h.length >= 15) { frames.push({ narr: 'Skipping push(' + v + ') to keep the picture within 4 levels (15 nodes).', parts: parts() }); return; }
            h.push(v);
            var i = h.length - 1;
            frames.push({ narr: '<code>push(' + v + ')</code>: append at the end of the vector (index ' + i + '), i.e. the next free leaf. The heap rule may now be broken between it and its parent.', parts: parts(one(i, 'cur')) });
            while (i > 0) {
              var p = (i - 1) >> 1;
              if (better(h[i], h[p])) {
                var t = h[i]; h[i] = h[p]; h[p] = t;
                var hl = {}; hl[p] = 'cur'; hl[i] = 'ok';
                frames.push({ narr: 'Sift up: ' + h[p] + ' ' + (isMin ? '&lt;' : '&gt;') + ' parent ' + h[i] + ' → swap (index ' + i + ' ↔ ' + p + ').', parts: parts(hl) });
                i = p;
              } else {
                var hl2 = {}; hl2[i] = 'sel'; hl2[p] = 'done';
                frames.push({ narr: 'Parent ' + h[p] + ' is ' + (isMin ? '≤' : '≥') + ' ' + h[i] + ' → heap rule holds, stop. O(log n) swaps at most.', parts: parts(hl2) });
                break;
              }
            }
            if (i === 0) frames.push({ narr: '<b>' + h[0] + '</b> climbed all the way to the root — it is the new <code>top()</code>.', parts: parts(one(0, 'sel')) });
          } else {
            if (!h.length) { frames.push({ narr: '<code>pop()</code> on an empty priority_queue is undefined behaviour — check <code>empty()</code>. Skipped.', parts: parts() }); return; }
            var top = h[0];
            frames.push({ narr: '<code>top()</code> = <b>' + top + '</b>. Now <code>pop()</code>: move the last element into the root slot and shrink the vector by one (<code>std::pop_heap</code> + <code>pop_back</code>).', parts: parts((function () { var x = {}; x[0] = 'bad'; x[h.length - 1] = 'cur'; return x; })()) });
            var last = h.pop();
            if (!h.length) { frames.push({ narr: 'That was the only element — the heap is empty now.', parts: parts() }); return; }
            h[0] = last;
            var j = 0;
            frames.push({ narr: '<b>' + last + '</b> sits at the root, probably too ' + (isMin ? 'big' : 'small') + '. Sift it down.', parts: parts(one(0, 'cur')) });
            while (true) {
              var l = 2 * j + 1, r = 2 * j + 2, b = j;
              if (l < h.length && better(h[l], h[b])) b = l;
              if (r < h.length && better(h[r], h[b])) b = r;
              if (b === j) {
                frames.push({ narr: (l >= h.length ? 'No children left' : 'Both children are ' + (isMin ? '≥' : '≤') + ' ' + h[j]) + ' → stop. New top() = <b>' + h[0] + '</b>.', parts: parts((function () { var x = {}; x[j] = 'ok'; x[0] = 'sel'; return x; })()) });
                break;
              }
              var tt = h[j]; h[j] = h[b]; h[b] = tt;
              var hl3 = {}; hl3[j] = 'ok'; hl3[b] = 'cur';
              frames.push({ narr: 'Sift down: the ' + (isMin ? 'smaller' : 'larger') + ' child is ' + h[j] + ' → swap (index ' + j + ' ↔ ' + b + '). Always pick the ' + (isMin ? 'smaller' : 'larger') + ' child, or the rule would break between siblings.', parts: parts(hl3) });
              j = b;
            }
          }
        });
        frames.push({ narr: 'Final heap. Note the vector is <b>not sorted</b> — only the root is guaranteed to be the ' + (isMin ? 'minimum' : 'maximum') + '. Popping everything one by one would produce sorted order: that is <b>heap sort</b>, O(n log n).', parts: parts(h.length ? one(0, 'sel') : {}) });
        return frames;
      }
    }],
    examples: [
      { title: 'K largest elements with a size-k MIN-heap', html: `<p>Find the 3 largest of [5, 1, 9, 3, 7, 8]. Keep a min-heap of at most 3 elements; when it grows to 4, pop the smallest. After the scan the heap holds {7, 8, 9} and its <code>top()</code> (7) is the 3rd largest. O(n log k) time, O(k) memory — works on a stream of billions of items.</p>`, code: `std::vector<int> kLargest(const std::vector<int>& a, int k) {
    std::priority_queue<int, std::vector<int>, std::greater<int>> pq;   // min-heap
    for (int x : a) {
        pq.push(x);
        if ((int)pq.size() > k) pq.pop();       // evict the smallest of the k+1
    }
    std::vector<int> out;
    while (!pq.empty()) { out.push_back(pq.top()); pq.pop(); }
    return out;                                  // ascending: 7 8 9
}` },
      { title: 'Minimum cost to connect ropes', html: `<p>Ropes [4, 3, 2, 6]: always join the two shortest. 2+3 = 5 (cost 5), 4+5 = 9 (cost 9), 6+9 = 15 (cost 15). Total <b>29</b>. A min-heap gives the two smallest in O(log n) each time — the same greedy as Huffman coding.</p>`, code: `long long connectRopes(const std::vector<int>& ropes) {
    std::priority_queue<long long, std::vector<long long>, std::greater<long long>> pq(ropes.begin(), ropes.end());
    long long cost = 0;
    while (pq.size() > 1) {
        long long a = pq.top(); pq.pop();
        long long b = pq.top(); pq.pop();
        cost += a + b;
        pq.push(a + b);
    }
    return cost;
}` },
      { title: 'Using the raw heap algorithms on a vector', html: `<p><code>std::make_heap</code>, <code>std::push_heap</code>, <code>std::pop_heap</code> and <code>std::sort_heap</code> work on any random-access range. Use them when you need a heap <b>and</b> occasional iteration over all elements (which priority_queue hides). <code>pop_heap</code> moves the top to the <b>back</b>; you then <code>pop_back()</code>.</p>`, code: `std::vector<int> v = {3, 1, 4, 1, 5};
std::make_heap(v.begin(), v.end());           // O(n): v[0] == 5
v.push_back(9);
std::push_heap(v.begin(), v.end());           // O(log n): v[0] == 9
std::pop_heap(v.begin(), v.end());            // 9 moved to v.back()
int largest = v.back(); v.pop_back();
for (int x : v) std::cout << x << ' ';       // all remaining elements, heap order
std::cout << largest << "\\n";` }
    ],
    deepDive: `<p><b>🟣 Why heapify is O(n).</b> <code>make_heap</code> sifts down every internal node from the last parent to the root. Half the nodes are leaves (0 work), a quarter sit one level up (≤ 1 swap), an eighth two levels up (≤ 2 swaps)… Sum = n·(1/4 + 2/8 + 3/16 + …) = n. Pushing n elements one by one is O(n log n) in the worst case (increasing input into a max-heap bubbles every element to the root).</p>
<p><b>libstdc++'s pop.</b> <code>__adjust_heap</code> uses Floyd's trick: it moves the "hole" from the root all the way down to a leaf by always promoting the larger child (one comparison per level instead of two), then sifts the displaced last element <b>up</b> from there. Fewer comparisons on average, same O(log n).</p>
<p><b>Stability and ties.</b> A heap is not stable: equal priorities come out in an unspecified order. If FIFO among equals matters (task schedulers), push <code>(priority, sequenceNumber)</code> pairs.</p>
<p><b>Cache behaviour.</b> A binary heap in a vector is cache-friendly near the top but jumps far apart near the bottom (children of i are at 2i+1). For very large heaps, 4-ary heaps (fewer levels, children adjacent) or radix heaps (monotone integer keys, as in Dijkstra) can be noticeably faster. Pairing and Fibonacci heaps have better theoretical decrease-key bounds but lose in practice to binary heaps with lazy deletion.</p>
<p><b>Getting at the hidden vector.</b> The underlying container is a <b>protected</b> member <code>c</code>; a tiny subclass can expose it for debugging or bulk clearing. Moving the whole queue is O(1) (moves the vector). Since C++23 you can construct from a range with <code>std::from_range</code> and append with <code>push_range</code>.</p>`,
    aiEra: `<p><b>🤖 What AI changes:</b> AI writes heap code quickly, but the comparator direction is its most frequent bug: it writes <code>std::greater</code> when it wanted a max-heap, or a lambda with <code>a.cost &lt; b.cost</code> while claiming "smallest cost first". It also tends to use a max-heap of all n elements for "top k largest" (O(n log n), O(n) memory) instead of a size-k min-heap.</p>
<p><b>Use AI as a partner:</b> <code>"State, in words, which element ends up on top() with this comparator, and give a 3-element example"</code> — make it prove direction. Ask it to convert an O(n log n) "sort then take k" into an O(n log k) heap, or into <code>std::nth_element</code> (O(n) average) when the k elements need no order.</p>
<p><b>Where AI goes wrong:</b> trying to call <code>pq.begin()</code>, <code>pq.find()</code> or <code>pq.erase()</code>; writing <code>int x = pq.pop();</code>; forgetting the stale-entry check in Dijkstra (correct but slow — or wrong if it relaxes edges from stale entries with larger distances in some variants).</p>
<p><b>What you must still own:</b> heap index arithmetic, sift-up/sift-down by hand, the comparator mental model ("returns true if a goes <i>below</i> b"), the O(n) build proof, and picking heap vs set vs nth_element.</p>`,
    problems: [{
      title: 'Kth Largest Element in a Stream',
      level: 'Easy', tags: ['priority_queue', 'min-heap', 'design'], companies: ['Amazon', 'Meta', 'Adobe'],
      statement: `<p>Design a class constructed with an integer <code>k</code> and an initial array <code>nums</code>. Each call <code>add(val)</code> appends <code>val</code> to the stream and returns the <b>k-th largest</b> element seen so far (k-th in sorted order, duplicates count).</p>`,
      constraints: `1 ≤ k ≤ 10<sup>4</sup>; 0 ≤ nums.length ≤ 10<sup>4</sup>; up to 10<sup>4</sup> calls to add; when add is called there are at least k elements in total.`,
      example: `<p>k = 3, nums = [4, 5, 8, 2]. add(3) → <b>4</b> (stream sorted desc: 8,5,4,3,2), add(5) → <b>5</b> (8,5,5,4,…), add(10) → <b>5</b>, add(9) → <b>8</b>, add(4) → <b>8</b>.</p>`,
      brute: {
        why: `<p>Keep every element in a vector and sort it (or <code>nth_element</code>) on every <code>add</code>: O(n log n) per call with n growing to 2·10<sup>4</sup> → ~3·10<sup>9</sup> operations over all calls. Wasted work: we only ever need the top k, yet we keep re-ordering everything.</p>`,
        code: `class KthLargestSlow {
    int k;
    std::vector<int> all;
public:
    KthLargestSlow(int k_, std::vector<int> nums) : k(k_), all(std::move(nums)) {}
    int add(int val) {
        all.push_back(val);
        std::vector<int> tmp = all;
        std::sort(tmp.begin(), tmp.end(), std::greater<int>());   // O(n log n) per call
        return tmp[k - 1];
    }
};`
      },
      mcq: { q: 'Which heap keeps the k-th largest at top() in O(log k) per add?', options: ['A max-heap of all elements', 'A min-heap holding only the k largest seen so far', 'A max-heap holding only the k smallest', 'Two heaps of size n/2'], answer: 1, explain: 'If the min-heap holds exactly the k largest elements, its minimum (top) is the k-th largest overall. A new value smaller than top cannot enter the top k; otherwise push it and pop the old minimum.' },
      hints: [
        `<p>Hint 1: You never need elements that are smaller than the current k-th largest — they can never become the answer again.</p>`,
        `<p>Hint 2: Keep the k largest in a <b>min-heap</b> (<code>std::greater&lt;int&gt;</code>): its <code>top()</code> is the smallest of the top k = the k-th largest.</p>`,
        `<p>Hint 3: In <code>add</code>: push, and if size &gt; k pop. (Micro-optimisation: if size == k and val ≤ top, skip.) The constructor just calls <code>add</code> for each initial number — and the initial array may have fewer than k elements.</p>`
      ],
      solution: {
        approach: `<p>Maintain a min-heap of size at most k containing the k largest values seen. Each add is one push and at most one pop: O(log k). The answer is always <code>top()</code>.</p>`,
        code: `#include <queue>
#include <vector>
#include <functional>

class KthLargest {
    int k_;
    std::priority_queue<int, std::vector<int>, std::greater<int>> top_;   // min-heap of the k largest
public:
    KthLargest(int k, const std::vector<int>& nums) : k_(k) {
        for (int x : nums) add(x);
    }
    int add(int val) {
        if ((int)top_.size() < k_) top_.push(val);
        else if (val > top_.top()) { top_.pop(); top_.push(val); }   // val enters the top k
        return top_.top();                                          // smallest of the k largest
    }
};`,
        dry: { head: ['step', 'heap (min on top)', 'size', 'returns'], rows: [['init 4,5,8', '{4,5,8}', '3', ''], ['init 2', '2 ≤ top 4 → skip', '3', ''], ['add(3)', '3 ≤ 4 → skip; {4,5,8}', '3', '4'], ['add(5)', 'pop 4, push 5 → {5,5,8}', '3', '5'], ['add(10)', 'pop 5, push 10 → {5,8,10}', '3', '5'], ['add(9)', 'pop 5, push 9 → {8,9,10}', '3', '8'], ['add(4)', '4 ≤ 8 → skip', '3', '8']] },
        complexity: `<p>O(log k) per add, O((n + q) log k) total; O(k) memory regardless of stream length.</p>`,
        followUps: ['Support removal of a value from the stream (multiset or lazy deletion).', 'Kth largest in an unsorted array once: compare heap O(n log k) with <code>std::nth_element</code> O(n) average.', 'Median of a data stream (two heaps).']
      }
    }]
  });

  /* ======================================================================
     TOPIC 9 — Choosing the right container
     ====================================================================== */
  var PICK_NODES = [
    { id: 'Q1', label: 'need lookup by key?', x: 50, y: 6, shape: 'box' },
    { id: 'Q2', label: 'add/remove where?', x: 22, y: 24, shape: 'box' },
    { id: 'Q3', label: 'need order / ranges?', x: 76, y: 24, shape: 'box' },
    { id: 'VEC', label: 'vector', x: 6, y: 46, shape: 'box' },
    { id: 'DQ', label: 'deque', x: 17, y: 58, shape: 'box' },
    { id: 'PQ', label: 'priority_queue', x: 33, y: 46, shape: 'box' },
    { id: 'LST', label: 'list', x: 6, y: 70, shape: 'box' },
    { id: 'SQ', label: 'stack/queue', x: 31, y: 70, shape: 'box' },
    { id: 'MAP', label: 'map / set', x: 58, y: 46, shape: 'box' },
    { id: 'Q4', label: 'read-mostly?', x: 88, y: 46, shape: 'box' },
    { id: 'FLAT', label: 'flat_map', x: 70, y: 68, shape: 'box' },
    { id: 'UMAP', label: 'unordered_map', x: 90, y: 68, shape: 'box' }
  ];
  var PICK_EDGES = [['Q1', 'Q2', 'no'], ['Q1', 'Q3', 'yes'], ['Q2', 'VEC', 'back'], ['Q2', 'DQ', 'both ends'], ['Q2', 'PQ', 'max/min'], ['Q2', 'LST', 'middle'], ['Q2', 'SQ', 'LIFO/FIFO'], ['Q3', 'MAP', 'yes'], ['Q3', 'Q4', 'no'], ['Q4', 'FLAT', 'yes'], ['Q4', 'UMAP', 'no']];
  var PICK_CASES = [
    { s: 'Store N scores, then sort them and answer binary-search queries', path: ['Q1', 'Q2', 'VEC'], ans: '<code>vector&lt;int&gt;</code> + <code>reserve</code> + <code>sort</code> + <code>lower_bound</code>. Append-only then read: contiguous memory wins.' },
    { s: 'Keep the last k sensor readings and the max of the window', path: ['Q1', 'Q2', 'DQ'], ans: '<code>deque</code> (monotonic deque of indices) — push at the back, expire from the front.' },
    { s: 'Event simulation: always process the earliest timestamp next', path: ['Q1', 'Q2', 'PQ'], ans: '<code>priority_queue</code> with <code>std::greater</code> on (time, id).' },
    { s: 'LRU cache: move an entry to the front when used, evict the oldest', path: ['Q1', 'Q2', 'LST'], ans: '<code>list</code> for recency + <code>unordered_map&lt;key, list::iterator&gt;</code>; <code>splice</code> on access.' },
    { s: 'Browser back/forward buttons', path: ['Q1', 'Q2', 'SQ'], ans: 'Two <code>stack</code>s: visiting pushes onto "back" and clears "forward"; back/forward move pages between them.' },
    { s: 'Leaderboard: rank players, show top 10, scores change often', path: ['Q1', 'Q3', 'MAP'], ans: '<code>set&lt;pair&lt;int,int&gt;, greater&lt;&gt;&gt;</code> of (score, id) + <code>unordered_map&lt;id, score&gt;</code> to find the old entry to erase.' },
    { s: '200 config keys, loaded at startup, read millions of times', path: ['Q1', 'Q3', 'Q4', 'FLAT'], ans: 'Sorted <code>vector&lt;pair&gt;</code> + binary search, or C++23 <code>std::flat_map</code>: cache-friendly, tiny memory.' },
    { s: 'Count word frequencies in a huge log; order does not matter', path: ['Q1', 'Q3', 'Q4', 'UMAP'], ans: '<code>unordered_map&lt;string,int&gt;</code> with <code>reserve</code> (or a flat hash map in production).' }
  ];
  topics.push({
    title: 'Choosing the Right Container (and Defending the Choice)',
    analogy: `<p>Choosing a container is like choosing a <b>vehicle</b>. A bicycle (vector) is cheap, fast and right for 90% of trips. A bus with doors at both ends (deque) helps when people board at the front and back. A train with detachable carriages (list) lets you reshuffle cars without unloading anyone. A filing cabinet in alphabetical order (map) answers "what comes after M?". A coat check (unordered_map) answers "where is ticket 417?" instantly but has no order. An ER triage desk (priority_queue) always knows who is next. Nobody drives a bus to buy milk.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Ask four questions, in this order:</p>
<ol>
<li><b>Do I look things up by a key</b> (or test membership)? If no → it is a <i>sequence</i>: vector / deque / list / adapters.</li>
<li><b>For sequences: where do I add and remove?</b> Back only → <code>vector</code>. Both ends → <code>deque</code>. Middle, with an iterator already in hand, or splicing → <code>list</code>. Only ever the max/min → <code>priority_queue</code>. Strictly LIFO/FIFO → <code>stack</code>/<code>queue</code>.</li>
<li><b>For lookups: do I need order</b> — sorted iteration, smallest ≥ x, ranges, predecessor/successor? Yes → <code>map</code>/<code>set</code> (multi- for duplicates). No → <code>unordered_map</code>/<code>unordered_set</code>.</li>
<li><b>Is it read-mostly?</b> Build once, query many → sorted <code>vector</code> + <code>lower_bound</code> or C++23 <code>flat_map</code>/<code>flat_set</code>.</li>
</ol>
${H.table(['container', 'access', 'insert/erase', 'find', 'ordered', 'invalidation on insert', 'memory/locality'], [
  ['<code>vector</code>', 'O(1) index', 'O(1)* back, O(n) middle', 'O(n) / O(log n) if sorted', 'by position', 'all on realloc', H.c('g', 'best')],
  ['<code>deque</code>', 'O(1) index', 'O(1) both ends, O(n) middle', 'O(n)', 'by position', 'iterators (refs OK at ends)', 'good'],
  ['<code>list</code>', 'O(n)', 'O(1) at iterator', 'O(n)', 'by position', H.c('g', 'none'), H.c('r', 'poor (node per element)')],
  ['<code>map/set</code>', '—', 'O(log n)', 'O(log n)', H.c('g', 'sorted'), H.c('g', 'none'), 'poor (node per element)'],
  ['<code>unordered_*</code>', '—', 'O(1) avg', 'O(1) avg', H.c('r', 'no'), 'iterators on rehash', 'medium'],
  ['<code>priority_queue</code>', 'top only', 'O(log n)', '—', 'heap', 'no iterators', 'good (vector)'],
  ['<code>flat_map</code> (C++23)', 'O(1) index of sorted keys', 'O(n)', 'O(log n)', H.c('g', 'sorted'), 'like vector', H.c('g', 'best for lookups')]])}
<p>* amortized. <b>The default is <code>std::vector</code></b> — Bjarne Stroustrup's own advice. Real hardware loves contiguous memory: a linear scan over a small vector often beats a map or list lookup up to a few hundred (sometimes thousands of) elements. Pick something else only when a requirement forces it, and be ready to say <i>which</i> requirement.</p>
<p><b>Interview move:</b> say the requirement, the operation counts, then the container — "we need min and arbitrary delete, both O(log n), so a <code>set</code> rather than a <code>priority_queue</code>". Combining containers (map + list, two heaps, map + set) is normal and expected.</p>`,
    clues: [
      '"design a data structure that supports X, Y, Z in O(…)" → list each operation\'s required complexity, then combine containers',
      '"get min/max AND delete arbitrary element" → <code>set</code>/<code>multiset</code> (or heap + lazy deletion)',
      '"sorted output at the end only" → hash map during processing, sort once at the end',
      '"small N (≤ 64) and speed matters" → plain <code>vector</code>/<code>array</code> with a linear scan',
      '"stable pointers/handles needed" → node-based container or indices into a vector',
      '"build once, read many" → sorted vector / <code>flat_map</code>'
    ],
    code: [`#include <set>
#include <unordered_map>
#include <vector>
#include <iostream>

// Leaderboard: update a player's score and list the top k, both fast.
class Leaderboard {
    std::unordered_map<int, int> score_;                        // id -> current score (O(1) find)
    std::set<std::pair<int, int>, std::greater<>> ranked_;      // (score, id), highest first (ordered)
public:
    void addScore(int id, int delta) {
        auto it = score_.find(id);
        int old = (it == score_.end()) ? 0 : it->second;
        if (it != score_.end()) ranked_.erase({old, id});        // remove the stale entry: O(log n)
        score_[id] = old + delta;
        ranked_.insert({old + delta, id});
    }
    std::vector<int> top(int k) const {
        std::vector<int> ids;
        for (auto it = ranked_.begin(); it != ranked_.end() && (int)ids.size() < k; ++it)
            ids.push_back(it->second);
        return ids;
    }
    void reset(int id) {
        if (auto it = score_.find(id); it != score_.end()) {
            ranked_.erase({it->second, id});
            score_.erase(it);
        }
    }
};

int main() {
    Leaderboard lb;
    lb.addScore(1, 50); lb.addScore(2, 80); lb.addScore(3, 70); lb.addScore(1, 40);   // 1 -> 90
    for (int id : lb.top(2)) std::cout << id << ' ';   // 1 2
}`, `#include <vector>
#include <algorithm>
#include <string>
#include <utility>
#include <optional>

// Read-mostly lookup table: sorted vector + binary search (what std::flat_map does internally)
class ConfigTable {
    std::vector<std::pair<std::string, int>> rows_;
public:
    explicit ConfigTable(std::vector<std::pair<std::string, int>> rows) : rows_(std::move(rows)) {
        std::sort(rows_.begin(), rows_.end());                 // once, O(n log n)
    }
    std::optional<int> get(const std::string& key) const {     // O(log n), contiguous memory
        auto it = std::lower_bound(rows_.begin(), rows_.end(), key,
                                   [](const auto& row, const std::string& k) { return row.first < k; });
        if (it != rows_.end() && it->first == key) return it->second;
        return std::nullopt;
    }
};`],
    codeTitle: ['Combining containers: leaderboard with unordered_map + ordered set', 'Read-mostly table as a sorted vector (flat_map idea)'],
    viz: [{
      title: 'Decision flow: pick a container for real scenarios',
      input: 'all',
      inputLabel: 'Scenario number 1–8, or "all"',
      gen: function (input) {
        var s = clean(input) || 'all', list;
        if (s.toLowerCase() === 'all') list = PICK_CASES.map(function (_, i) { return i; });
        else {
          var n = Number(s);
          if (!(n >= 1 && n <= PICK_CASES.length) || n !== Math.floor(n)) throw new Error('Type a scenario number 1–' + PICK_CASES.length + ' or "all"');
          list = [n - 1];
        }
        function g(hl, ehl, tags) { return { type: 'graph', directed: true, height: 78, nodes: PICK_NODES, edges: PICK_EDGES, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        var frames = [{ narr: 'The whole decision flow on one page. Start at the top question and follow the requirement that your problem actually has.', parts: [g({ Q1: 'cur' })] }];
        list.forEach(function (ci) {
          var c = PICK_CASES[ci], hl = {}, ehl = {}, tags = {};
          c.path.forEach(function (id, k) { hl[id] = k === c.path.length - 1 ? 'sel' : 'win'; if (k) ehl[c.path[k - 1] + '-' + id] = 'ok'; });
          tags[c.path[c.path.length - 1]] = 'pick';
          frames.push({ narr: '<b>Scenario ' + (ci + 1) + ':</b> ' + c.s + '.', parts: [g(hl, {}, {}), { type: 'text', label: 'Think first', html: 'Which question does this scenario answer "yes" to? Follow the arrows before reading the answer.' }] });
          frames.push({ narr: '<b>Scenario ' + (ci + 1) + ' → ' + PICK_NODES.filter(function (nd) { return nd.id === c.path[c.path.length - 1]; })[0].label + '.</b> ' + c.ans, parts: [g(hl, ehl, tags), { type: 'text', label: 'Answer', html: c.ans }] });
        });
        frames.push({ narr: 'Cheat sheet: default to <b>vector</b>; leave it only when a requirement (both ends, stable handles, order, key lookup, repeated min/max) forces you to — and say that requirement out loud in the interview.', parts: [{ type: 'table', label: 'Big-O summary', columns: ['container', 'find', 'insert', 'erase', 'ordered?'], rows: [['vector', 'O(n)', 'O(1)* back', 'O(n)', 'no'], ['deque', 'O(n)', 'O(1) ends', 'O(1) ends', 'no'], ['list', 'O(n)', 'O(1) at it', 'O(1) at it', 'no'], ['map/set', 'O(log n)', 'O(log n)', 'O(log n)', 'yes'], ['unordered_*', 'O(1) avg', 'O(1) avg', 'O(1) avg', 'no'], ['priority_queue', 'top O(1)', 'O(log n)', 'top O(log n)', 'heap']], hl: { 0: 'sel' } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Small N: linear scan beats map', html: `<p>Looking up one of 16 enum-like string keys a million times: a <code>std::map</code> does ~4 comparisons but each hops to a random heap node (cache miss ≈ 100 cycles). A <code>vector&lt;pair&gt;</code> scanned linearly touches one or two cache lines and lets the CPU prefetch. For tiny N the "worse" O(n) is faster. Always measure, but start with the simple vector.</p>`, code: `int lookup(const std::vector<std::pair<std::string_view, int>>& table, std::string_view key) {
    for (const auto& [k, v] : table) if (k == key) return v;   // 16 entries: a few ns
    return -1;
}` },
      { title: 'Sorted output only at the end → hash, then sort once', html: `<p>"Print each user's total spend, sorted by user id" over 10<sup>7</sup> transactions with 10<sup>5</sup> users: accumulate in an <code>unordered_map</code> (10<sup>7</sup> O(1) updates), then copy 10<sup>5</sup> pairs into a vector and sort once. A <code>map</code> would pay O(log n) on all 10<sup>7</sup> updates instead.</p>`, code: `std::vector<std::pair<int, long long>> totals(const std::vector<std::pair<int, int>>& tx) {
    std::unordered_map<int, long long> sum;
    for (auto [user, amount] : tx) sum[user] += amount;
    std::vector<std::pair<int, long long>> out(sum.begin(), sum.end());
    std::sort(out.begin(), out.end());
    return out;
}` },
      { title: 'priority_queue vs set for "min with deletes"', html: `<p>A task scheduler needs the earliest deadline <b>and</b> must cancel arbitrary tasks. <code>priority_queue</code> cannot erase a middle element; options are lazy deletion (mark cancelled in a hash set and skip on pop — fine if cancellations are rare) or a <code>std::set&lt;pair&lt;deadline,id&gt;&gt;</code> where <code>begin()</code> is the min and <code>erase({d,id})</code> is O(log n). Pick by which operations dominate.</p>` },
      { title: 'Stable handles without a list: indices into a vector', html: `<p>A game holds 10<sup>5</sup> entities that reference each other. Storing raw pointers into a vector breaks on reallocation; a list costs a heap allocation per entity. Common production answer: a vector plus <b>integer handles</b> (index + generation counter to detect reuse) — a "slot map". Contiguous, cache-friendly and safe.</p>` }
    ],
    deepDive: `<p><b>🟣 The hardware view.</b> Main memory latency is ~80–100 ns; an L1 hit is ~1 ns. Contiguous containers let the hardware prefetcher stream data, so iterating a vector runs near memory bandwidth, while node-based containers (list, map, set, unordered_*) pay a likely cache miss per node. That is why Big-O alone mispredicts: 10<sup>5</sup> random-position inserts into a <code>vector&lt;int&gt;</code> (memmove of ~200 KB each, highly optimised) can beat a <code>list</code> that first has to <i>walk</i> to the position.</p>
<p><b>Memory overhead per element (64-bit, libstdc++, T = int):</b> vector 4 B (+ up to 2× slack), deque ~4 B + block slack, list ~24 B + malloc header (~32–48 B total), set/map ~40 B + malloc header, unordered_set ~16 B node + 8 B bucket pointer + malloc header. A 10<sup>7</sup>-element <code>std::set&lt;int&gt;</code> uses roughly 0.5 GB; a sorted vector uses 40 MB.</p>
<p><b>Allocator strategy matters.</b> Node containers + <code>std::pmr::monotonic_buffer_resource</code> or <code>unsynchronized_pool_resource</code> (C++17) can cut allocation cost dramatically and pack nodes closer together. Arena allocation per request is common in servers.</p>
<p><b>Beyond the standard library (2026 reality):</b> Abseil <code>flat_hash_map</code>/<code>btree_map</code>, Boost <code>unordered_flat_map</code>, <code>boost::container::small_vector</code> (inline storage for small sizes), <code>folly::F14</code>, and the C++26 additions <code>std::inplace_vector</code> (fixed capacity, no heap) and <code>std::hive</code> (stable addresses with good iteration speed, for game-entity-style workloads). Know they exist and why — then justify the standard container in an interview unless asked.</p>
<p><b>Concurrency changes the answer.</b> None of the standard containers are thread-safe for concurrent writes. Shared maps typically become sharded maps (N mutex-protected shards), concurrent hash maps (TBB, folly), or read-copy-update snapshots for read-mostly data.</p>`,
    aiEra: `<p><b>🤖 What AI changes:</b> AI will propose <i>a</i> container instantly; the interviewer wants to hear <b>why</b>. Assistants tend toward textbook answers (list for inserts, map for lookups) and rarely consider cache effects, memory overhead or invalidation. Your value is the trade-off reasoning.</p>
<p><b>Use AI as a partner:</b> describe the operations and their frequencies and ask for <b>three</b> candidate designs with complexity tables; then ask it to write a Google Benchmark comparing them on realistic data sizes, and run it. Ask "what breaks if this container is shared between threads?" and "which iterators/references does this design hold across mutations?".</p>
<p><b>Where AI goes wrong:</b> recommending <code>std::list</code> for random inserts without a held iterator, using <code>std::map</code> where order is never used, choosing <code>unordered_map</code> with a pair key and no hash, or proposing <code>priority_queue</code> for a problem that needs arbitrary deletes.</p>
<p><b>What you must still own:</b> the four-question decision flow, Big-O for every operation of every container, the invalidation table, and the habit of saying the requirement before naming the container.</p>`,
    problems: [{
      title: 'Stock Price Fluctuation',
      level: 'Medium', tags: ['design', 'unordered_map', 'multiset', 'map'], companies: ['Atlassian', 'Google', 'Bloomberg'],
      statement: `<p>You receive a stream of records <code>update(timestamp, price)</code>. Records can arrive out of order, and a later record with the <b>same timestamp corrects</b> the earlier price. Support: <code>current()</code> — price at the latest timestamp seen; <code>maximum()</code> and <code>minimum()</code> — over the latest price of every timestamp. Pick the containers so every operation is at most O(log n).</p>`,
      constraints: `1 ≤ timestamp, price ≤ 10<sup>9</sup>; up to 10<sup>5</sup> calls in total; current/maximum/minimum are only called after at least one update.`,
      example: `<p>update(1, 10), update(2, 5) → current() = <b>5</b>, maximum() = <b>10</b>. update(1, 3) corrects timestamp 1 → maximum() = <b>5</b>. update(4, 2) → minimum() = <b>2</b>. The correction must remove the old price 10 from the max/min structure.</p>`,
      brute: {
        why: `<p>Store <code>unordered_map&lt;timestamp, price&gt;</code> only, and scan all values for every <code>maximum()</code>/<code>minimum()</code> — O(n) per query, 10<sup>10</sup> in the worst case. The waste: max/min change only slightly per update, but we recompute from scratch.</p>`,
        code: `class StockPriceSlow {
    std::unordered_map<int, int> at;
    int latest = 0;
public:
    void update(int t, int p) { at[t] = p; latest = std::max(latest, t); }
    int current() { return at[latest]; }
    int maximum() { int m = INT_MIN; for (auto& [t, p] : at) m = std::max(m, p); return m; }   // O(n)
    int minimum() { int m = INT_MAX; for (auto& [t, p] : at) m = std::min(m, p); return m; }   // O(n)
};`
      },
      mcq: { q: 'Which structure holds the prices so that max, min AND "remove the corrected old price" are all O(log n)?', options: ['priority_queue', 'unordered_set', 'multiset (or map price → count)', 'stack'], answer: 2, explain: 'A multiset keeps prices sorted (min = begin, max = rbegin) and lets you erase ONE copy of the old price with erase(find(old)) in O(log n). A heap cannot erase arbitrary values without lazy deletion; an unordered_set has no order and no duplicates.' },
      hints: [
        `<p>Hint 1: Separate the requirements: "price at timestamp t" is a key lookup (no order needed); "max/min of all current prices with corrections" needs an ordered structure with duplicates and deletion.</p>`,
        `<p>Hint 2: <code>unordered_map&lt;int,int&gt; priceAt</code> + <code>multiset&lt;int&gt; prices</code> + an int <code>latest</code>. On update, if t existed, remove one copy of its old price from the multiset.</p>`,
        `<p>Hint 3: Use <code>prices.erase(prices.find(old))</code>, never <code>prices.erase(old)</code> (that deletes every equal price!). max = <code>*prices.rbegin()</code>, min = <code>*prices.begin()</code>. Alternative: two heaps with lazy deletion (check against priceAt when popping).</p>`
      ],
      solution: {
        approach: `<p>Three pieces, each matched to one requirement: a hash map for timestamp → price (O(1) correction lookup), a <code>multiset</code> for ordered prices with duplicates (O(log n) insert/erase, O(1) min/max via begin/rbegin), and a running maximum timestamp for <code>current()</code>.</p>`,
        code: `#include <unordered_map>
#include <set>
#include <algorithm>

class StockPrice {
    std::unordered_map<int, int> priceAt;   // timestamp -> latest corrected price
    std::multiset<int> prices;              // all current prices, sorted, duplicates allowed
    int latest = 0;
public:
    void update(int timestamp, int price) {
        if (auto it = priceAt.find(timestamp); it != priceAt.end()) {
            prices.erase(prices.find(it->second));   // remove exactly ONE copy of the old price
            it->second = price;
        } else {
            priceAt.emplace(timestamp, price);
        }
        prices.insert(price);
        latest = std::max(latest, timestamp);
    }
    int current() const { return priceAt.at(latest); }
    int maximum() const { return *prices.rbegin(); }
    int minimum() const { return *prices.begin(); }
};`,
        dry: { head: ['call', 'priceAt', 'prices (multiset)', 'latest', 'returns'], rows: [['update(1,10)', '{1:10}', '{10}', '1', ''], ['update(2,5)', '{1:10, 2:5}', '{5,10}', '2', ''], ['current()', '', '', '', '5'], ['maximum()', '', '', '', '10'], ['update(1,3)', '{1:3, 2:5}', 'erase one 10, add 3 → {3,5}', '2', ''], ['maximum()', '', '', '', H.c('g', '5')], ['update(4,2)', '{1:3, 2:5, 4:2}', '{2,3,5}', '4', ''], ['minimum()', '', '', '', H.c('g', '2')]] },
        complexity: `<p>update O(log n); current O(1) average; maximum/minimum O(1). Space O(n) for n distinct timestamps.</p>`,
        followUps: ['Replace the multiset with two heaps + lazy deletion; compare memory and constants.', 'Support "max price within a time range" (segment tree / ordered map by time).', 'Make it safe for concurrent updates.']
      }
    }]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Contains Duplicate',
    level: 'Easy', tags: ['unordered_set', 'hashing'], companies: ['Amazon', 'Apple', 'Adobe'],
    statement: `<p>Given an integer array <code>nums</code>, return <code>true</code> if any value appears at least twice, and <code>false</code> if every element is distinct.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>5</sup>, −10<sup>9</sup> ≤ nums[i] ≤ 10<sup>9</sup>.`,
    example: `<p>nums = ${H.arr([1, 2, 3, 1], { hl: { 0: 'r', 3: 'r' } })} → <b>true</b> (1 appears twice). nums = [1, 2, 3, 4] → <b>false</b>.</p>`,
    brute: {
      why: `<p>Compare every pair (i, j): n(n−1)/2 ≈ 5·10<sup>9</sup> comparisons for n = 10<sup>5</sup> → TLE. The waste: to know whether x was seen before we re-scan everything instead of remembering.</p>`,
      code: `bool containsDuplicateBrute(const std::vector<int>& nums) {
    for (std::size_t i = 0; i < nums.size(); ++i)
        for (std::size_t j = i + 1; j < nums.size(); ++j)
            if (nums[i] == nums[j]) return true;
    return false;
}`
    },
    mcq: { q: 'Which is the cleanest O(n) average check while scanning?', options: ['std::set + find', 'std::unordered_set and the bool returned by insert', 'std::vector + std::find', 'std::map&lt;int,int&gt; counts then a second pass'], answer: 1, explain: 'unordered_set::insert returns pair&lt;iterator, bool&gt;; the bool is false when the key already existed — one hash operation per element answers the question. std::set works too but costs O(log n) per insert.' },
    hints: [
      `<p>Hint 1: You only need to remember "have I seen this value?" — membership, no order, no counts.</p>`,
      `<p>Hint 2: <code>std::unordered_set&lt;int&gt;</code>; <code>auto [it, inserted] = seen.insert(x); if (!inserted) return true;</code></p>`,
      `<p>Hint 3: <code>reserve(n)</code> to avoid rehashing. Alternative with O(1) extra memory: sort a copy and compare neighbours (O(n log n)). One-liner: compare <code>unordered_set(nums.begin(), nums.end()).size()</code> with n.</p>`
    ],
    solution: {
      approach: `<p>Scan once, inserting into an <code>unordered_set</code>. The first failed insert proves a duplicate. Average O(1) per element.</p>`,
      code: `#include <unordered_set>
#include <vector>

bool containsDuplicate(const std::vector<int>& nums) {
    std::unordered_set<int> seen;
    seen.reserve(nums.size());
    for (int x : nums)
        if (!seen.insert(x).second) return true;   // insert failed -> x was already there
    return false;
}`,
      alt: [{ lang: 'cpp', code: `// O(n log n) time, O(1) extra space if you may reorder the input
bool containsDuplicateSort(std::vector<int> nums) {
    std::sort(nums.begin(), nums.end());
    return std::adjacent_find(nums.begin(), nums.end()) != nums.end();
}` }],
      dry: { head: ['x', 'insert(x).second', 'seen'], rows: [['1', 'true', '{1}'], ['2', 'true', '{1,2}'], ['3', 'true', '{1,2,3}'], ['1', H.c('r', 'false → return true'), '{1,2,3}']] },
      complexity: `<p>O(n) average time, O(n) extra space.</p>`,
      followUps: ['Contains Duplicate II: equal values within distance k (sliding set of size k).', 'Contains Duplicate III: values within t and indices within k (ordered set + lower_bound).']
    }
  });

  practice.push({
    title: 'First Unique Character — Pick the Right Counter',
    level: 'Easy', tags: ['array as map', 'unordered_map', 'container choice'], companies: ['Amazon', 'Bloomberg', 'Goldman Sachs'],
    statement: `<p>Given a string <code>s</code> of lowercase English letters, return the index of the first character that appears exactly once, or −1 if none. Then explain why a plain <code>std::array&lt;int, 26&gt;</code> is a better counter here than <code>std::unordered_map&lt;char,int&gt;</code> or <code>std::map&lt;char,int&gt;</code>.</p>`,
    constraints: `1 ≤ |s| ≤ 10<sup>5</sup>; s contains only 'a'–'z'.`,
    example: `<p>s = "leetcode" → <b>0</b> ('l' appears once). s = "loveleetcode" → <b>2</b> ('v'). s = "aabb" → <b>−1</b>.</p>`,
    brute: {
      why: `<p>For every index, count that character over the whole string: O(n²) = 10<sup>10</sup> for n = 10<sup>5</sup>. The waste: counting the same letter again for every one of its occurrences.</p>`,
      code: `int firstUniqBrute(const std::string& s) {
    for (std::size_t i = 0; i < s.size(); ++i)
        if (std::count(s.begin(), s.end(), s[i]) == 1) return static_cast<int>(i);
    return -1;
}`
    },
    mcq: { q: 'Keys are known to be exactly 26 lowercase letters. Which counter is fastest?', options: ['std::map&lt;char,int&gt;', 'std::unordered_map&lt;char,int&gt;', 'std::array&lt;int,26&gt; indexed by c − \'a\'', 'std::multiset&lt;char&gt;'], answer: 2, explain: 'A small dense key range is a perfect direct-address table: no hashing, no nodes, no allocation, 104 bytes on the stack that sit in one or two cache lines. Hash or tree maps add overhead for zero benefit.' },
    hints: [
      `<p>Hint 1: Two passes: first count every letter, then find the first index whose letter has count 1.</p>`,
      `<p>Hint 2: Keys are 'a'..'z' → index <code>c - 'a'</code> into <code>std::array&lt;int, 26&gt;</code> (value-initialised with <code>{}</code>).</p>`,
      `<p>Hint 3: For general Unicode or arbitrary keys, switch to <code>unordered_map</code>. For a stream, keep a queue of candidates and pop while the front's count &gt; 1.</p>`
    ],
    solution: {
      approach: `<p>Direct-address counting: an array of 26 ints acts as a perfect hash table. Pass 1 counts, pass 2 returns the first index with count 1.</p>`,
      code: `#include <array>
#include <string>

int firstUniqChar(const std::string& s) {
    std::array<int, 26> cnt{};                 // all zeros
    for (char c : s) ++cnt[c - 'a'];
    for (std::size_t i = 0; i < s.size(); ++i)
        if (cnt[s[i] - 'a'] == 1) return static_cast<int>(i);
    return -1;
}`,
      dry: { head: ['pass', 'action', 'result'], rows: [['1', 'count "leetcode": l1 e3 t1 c1 o1 d1', ''], ['2', 'i=0, \'l\' count 1', H.c('g', 'return 0')]] },
      complexity: `<p>O(n) time, O(1) extra space (26 counters).</p>`,
      followUps: ['First unique character in a stream (queue + counts).', 'What changes for Unicode text? (code points, unordered_map, normalisation)']
    }
  });

  practice.push({
    title: 'Bug Hunt: The Lookup That Grows the Map',
    level: 'Easy', tags: ['map', 'operator[]', 'bug hunt'], companies: ['Bloomberg', 'Microsoft', 'Jane Street'],
    statement: `<p>This code reports which requested users are "active" (score &gt; 0). After running it on a big batch of requests, memory usage keeps climbing and <code>scores.size()</code> is much larger than the number of real users. Find the bug and fix it so that lookups never modify the map. Bonus: make the function take the map by <code>const&amp;</code>.</p>
<pre>std::vector&lt;std::string&gt; activeUsers(std::map&lt;std::string, int&gt;&amp; scores,
                                     const std::vector&lt;std::string&gt;&amp; requests) {
    std::vector&lt;std::string&gt; out;
    for (const auto&amp; name : requests)
        if (scores[name] &gt; 0) out.push_back(name);
    return out;
}</pre>`,
    constraints: `Up to 10<sup>6</sup> requests, up to 10<sup>5</sup> real users; requested names may not exist in the map.`,
    example: `<p>scores = {asha: 5, ben: 0}, requests = [asha, zed, ben, kim] → output [asha]. With the buggy code, afterwards scores = {asha: 5, ben: 0, ${H.c('r', 'kim: 0, zed: 0')}} — every unknown name was inserted with a default 0.</p>`,
    brute: {
      why: `<p>The buggy version is "brute" in a different sense: <code>operator[]</code> on a missing key <b>default-constructs and inserts</b> it. 10<sup>6</sup> unknown names = 10<sup>6</sup> new tree nodes (~60 MB), slower lookups for everyone afterwards, and it cannot compile on a <code>const map</code>.</p>`,
      code: `std::vector<std::string> activeUsersBuggy(std::map<std::string, int>& scores,
                                          const std::vector<std::string>& requests) {
    std::vector<std::string> out;
    for (const auto& name : requests)
        if (scores[name] > 0) out.push_back(name);   // inserts name -> 0 when missing!
    return out;
}`
    },
    mcq: { q: 'Which call checks a key WITHOUT ever inserting it?', options: ['scores[name]', 'scores.find(name) (compare with end())', 'scores.try_emplace(name)', 'scores.insert_or_assign(name, 0)'], answer: 1, explain: 'find returns end() if absent and never modifies the map. operator[], try_emplace and insert_or_assign all insert when the key is missing.' },
    hints: [
      `<p>Hint 1: Print <code>scores.size()</code> before and after the loop — it changes. Which expression in the loop can change a map's size?</p>`,
      `<p>Hint 2: Replace <code>scores[name]</code> with <code>find</code>: <code>auto it = scores.find(name); if (it != scores.end() &amp;&amp; it-&gt;second &gt; 0)</code>.</p>`,
      `<p>Hint 3: Once nothing mutates the map, change the parameter to <code>const std::map&lt;...&gt;&amp;</code> — the compiler will now reject any future <code>operator[]</code>. <code>at()</code> also works but throws on missing keys (exceptions as control flow are slow).</p>`
    ],
    solution: {
      approach: `<p>Use a non-mutating lookup (<code>find</code>, or C++20 <code>contains</code> + <code>at</code>) and take the map by <code>const&amp;</code> so the type system enforces "read-only".</p>`,
      code: `#include <map>
#include <string>
#include <vector>

std::vector<std::string> activeUsers(const std::map<std::string, int>& scores,
                                     const std::vector<std::string>& requests) {
    std::vector<std::string> out;
    out.reserve(requests.size());
    for (const auto& name : requests) {
        auto it = scores.find(name);                 // never inserts
        if (it != scores.end() && it->second > 0) out.push_back(name);
    }
    return out;
}`,
      dry: { head: ['name', 'find result', 'pushed?', 'scores.size()'], rows: [['asha', '5', H.c('g', 'yes'), '2'], ['zed', 'end()', 'no', '2 (unchanged)'], ['ben', '0', 'no', '2'], ['kim', 'end()', 'no', '2 (unchanged)']] },
      complexity: `<p>O(r log n) for r requests and n users; zero map growth. With <code>unordered_map</code>: O(r) average.</p>`,
      followUps: ['When IS operator[] the right tool? (counting: ++freq[w])', 'Use a transparent comparator so find(std::string_view) does not allocate.']
    }
  });

  practice.push({
    title: 'Implement Queue Using Two Stacks',
    level: 'Easy', tags: ['stack', 'queue', 'amortized analysis'], companies: ['Microsoft', 'Amazon', 'Apple'],
    statement: `<p>Implement a FIFO queue with <code>push(x)</code>, <code>pop()</code> (removes and returns the front), <code>peek()</code> and <code>empty()</code> using only two <code>std::stack&lt;int&gt;</code>. Every operation must be <b>amortized O(1)</b>.</p>`,
    constraints: `Up to 100 values pushed per test (LeetCode) — design for 10<sup>6</sup>; pop/peek only called when non-empty.`,
    example: `<p>push(1), push(2), peek() → <b>1</b>, pop() → <b>1</b>, empty() → <b>false</b>. Inside: in = [1, 2] (2 on top); on peek, move everything to out = [2, 1] (1 on top) and read 1.</p>`,
    brute: {
      why: `<p>Keep everything in one stack and, for every pop, move all elements to a second stack, take the bottom, and move them all back: O(n) per pop, O(n²) for n pops. The waste: moving the elements <b>back</b> — once reversed, they are already in queue order.</p>`,
      code: `class QueueSlow {
    std::stack<int> s;
public:
    void push(int x) { s.push(x); }
    int pop() {
        std::stack<int> tmp;
        while (s.size() > 1) { tmp.push(s.top()); s.pop(); }   // O(n)
        int front = s.top(); s.pop();
        while (!tmp.empty()) { s.push(tmp.top()); tmp.pop(); } // O(n) again
        return front;
    }
    bool empty() const { return s.empty(); }
};`
    },
    mcq: { q: 'When should elements move from the "in" stack to the "out" stack?', options: ['On every push', 'On every pop', 'Only when "out" is empty and we need the front', 'Never'], answer: 2, explain: 'Moving only when out is empty preserves order (out\'s top is always the oldest element) and moves each element at most once in its life → amortized O(1).' },
    hints: [
      `<p>Hint 1: Pouring one stack into another reverses the order — and a reversed stack's top is the oldest element, i.e. the queue's front.</p>`,
      `<p>Hint 2: <code>in</code> receives pushes; <code>out</code> serves pops/peeks. Refill <code>out</code> from <code>in</code> only when <code>out</code> is empty.</p>`,
      `<p>Hint 3: Each element is pushed to in once, moved once, popped from out once → 3 operations per element overall. Remember <code>std::stack::pop</code> returns void: read <code>top()</code> first.</p>`
    ],
    solution: {
      approach: `<p>Two stacks: an inbox and an outbox. Transfer lazily when the outbox is empty. Each element is moved at most once, so total work over n operations is O(n) → amortized O(1) each (a single pop can still be O(n)).</p>`,
      code: `#include <stack>

class MyQueue {
    std::stack<int> in_, out_;
    void shift() {
        if (out_.empty())
            while (!in_.empty()) { out_.push(in_.top()); in_.pop(); }
    }
public:
    void push(int x) { in_.push(x); }
    int pop() { shift(); int v = out_.top(); out_.pop(); return v; }
    int peek() { shift(); return out_.top(); }
    bool empty() const { return in_.empty() && out_.empty(); }
};`,
      dry: { head: ['op', 'in (bottom→top)', 'out (bottom→top)', 'returns'], rows: [['push(1)', '[1]', '[]', ''], ['push(2)', '[1,2]', '[]', ''], ['peek()', '[]', '[2,1]', '1'], ['push(3)', '[3]', '[2,1]', ''], ['pop()', '[3]', '[2]', '1'], ['pop()', '[3]', '[]', '2'], ['pop()', '[]', '[3] → []', '3']] },
      complexity: `<p>Amortized O(1) per operation; worst-case single pop O(n). Space O(n).</p>`,
      followUps: ['Implement a stack using one queue (rotate after each push).', 'Make pop worst-case O(1) (real-time queue / incremental transfer).']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Group Anagrams',
    level: 'Medium', tags: ['unordered_map', 'string', 'hashing'], companies: ['Amazon', 'Meta', 'Uber', 'Goldman Sachs'],
    statement: `<p>Given an array of strings, group the anagrams together (words made of the same letters with the same counts). Return the groups in any order.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>4</sup>, 0 ≤ |word| ≤ 100, lowercase English letters.`,
    example: `<p>["eat","tea","tan","ate","nat","bat"] → [["eat","tea","ate"], ["tan","nat"], ["bat"]]. "eat", "tea", "ate" all sort to the key <b>"aet"</b>.</p>`,
    brute: {
      why: `<p>Compare every pair of words with an anagram check (sort both or count letters): O(n² · L) ≈ 10<sup>8</sup>·100 — far too slow. The waste: each word's "signature" is recomputed in every comparison instead of once.</p>`,
      code: `std::vector<std::vector<std::string>> groupBrute(const std::vector<std::string>& words) {
    std::vector<std::vector<std::string>> groups;
    std::vector<bool> used(words.size(), false);
    for (std::size_t i = 0; i < words.size(); ++i) {
        if (used[i]) continue;
        std::string a = words[i]; std::sort(a.begin(), a.end());
        groups.push_back({words[i]});
        for (std::size_t j = i + 1; j < words.size(); ++j) {
            std::string b = words[j]; std::sort(b.begin(), b.end());
            if (!used[j] && a == b) { groups.back().push_back(words[j]); used[j] = true; }
        }
    }
    return groups;
}`
    },
    mcq: { q: 'What makes a good hash-map key for an anagram group?', options: ['The first letter', 'The word length', 'The sorted letters (or a 26-count signature)', 'The word itself'], answer: 2, explain: 'All anagrams share exactly the same sorted letters / letter counts, and non-anagrams never do — a canonical form that turns grouping into a single hash-map pass.' },
    hints: [
      `<p>Hint 1: Compute one canonical "signature" per word such that two words are anagrams iff their signatures are equal.</p>`,
      `<p>Hint 2: <code>std::unordered_map&lt;std::string, std::vector&lt;std::string&gt;&gt; groups; groups[sortedCopy].push_back(word);</code> — here <code>operator[]</code> inserting an empty vector is exactly what we want.</p>`,
      `<p>Hint 3: Sorting costs O(L log L) per word; a 26-letter count encoded as a string (e.g. "1#0#2#…") is O(L). Move the vectors out of the map at the end (<code>std::move</code>) to avoid copying strings.</p>`
    ],
    solution: {
      approach: `<p>One pass: key = sorted letters, value = list of words with that key. Then move each bucket into the answer.</p>`,
      code: `#include <unordered_map>
#include <vector>
#include <string>
#include <algorithm>

std::vector<std::vector<std::string>> groupAnagrams(const std::vector<std::string>& words) {
    std::unordered_map<std::string, std::vector<std::string>> groups;
    groups.reserve(words.size());
    for (const auto& w : words) {
        std::string key = w;
        std::sort(key.begin(), key.end());          // canonical signature
        groups[key].push_back(w);                   // operator[] creates the vector on first use
    }
    std::vector<std::vector<std::string>> out;
    out.reserve(groups.size());
    for (auto& [key, bucket] : groups) out.push_back(std::move(bucket));   // no string copies
    return out;
}`,
      dry: { head: ['word', 'key', 'groups after'], rows: [['eat', 'aet', '{aet:[eat]}'], ['tea', 'aet', '{aet:[eat,tea]}'], ['tan', 'ant', '{aet:[eat,tea], ant:[tan]}'], ['ate', 'aet', '{aet:[eat,tea,ate], ant:[tan]}'], ['nat', 'ant', '{…, ant:[tan,nat]}'], ['bat', 'abt', '{…, abt:[bat]}']] },
      complexity: `<p>O(n · L log L) time (O(n · L) with count signatures); O(n · L) space.</p>`,
      followUps: ['Return groups sorted by size, then lexicographically.', 'Use std::array&lt;int,26&gt; as the key — what hash do you need?']
    }
  });

  practice.push({
    title: 'Subarray Sum Equals K',
    level: 'Medium', tags: ['unordered_map', 'prefix sum', 'hashing'], companies: ['Meta', 'Google', 'Amazon', 'Microsoft'],
    statement: `<p>Given an integer array <code>nums</code> (negatives allowed) and an integer <code>k</code>, return the number of contiguous non-empty subarrays whose sum equals <code>k</code>.</p>`,
    constraints: `1 ≤ n ≤ 2·10<sup>4</sup>, −1000 ≤ nums[i] ≤ 1000, −10<sup>7</sup> ≤ k ≤ 10<sup>7</sup>.`,
    example: `<p>nums = ${H.arr([1, 2, 3, -3, 3])}, k = 3 → <b>5</b>: [1,2], [3], [1,2,3,−3], [3,−3,3], and the final [3]. Prefix sums 0,1,3,6,3,6: each time we reach prefix P we add how many earlier prefixes equal P − 3.</p>`,
    brute: {
      why: `<p>Try every (i, j) and accumulate: O(n²) = 4·10<sup>8</sup> additions in the worst case — borderline TLE, and O(n³) if you recompute each sum. Sliding windows do not work because negatives break monotonicity.</p>`,
      code: `int subarraySumBrute(const std::vector<int>& nums, int k) {
    int count = 0;
    for (std::size_t i = 0; i < nums.size(); ++i) {
        long long s = 0;
        for (std::size_t j = i; j < nums.size(); ++j) {
            s += nums[j];
            if (s == k) ++count;
        }
    }
    return count;
}`
    },
    mcq: { q: 'Before the loop, why do we store seen[0] = 1?', options: ['To avoid division by zero', 'So subarrays starting at index 0 (prefix − 0 = k) are counted', 'Because unordered_map needs at least one element', 'It is optional'], answer: 1, explain: 'A subarray [0..j] has sum prefix[j] − prefix[−1], and the empty prefix sum is 0. Seeding 0 with count 1 represents that empty prefix.' },
    hints: [
      `<p>Hint 1: sum(i..j) = P[j] − P[i−1]. We want P[j] − P[i−1] = k ⇔ P[i−1] = P[j] − k.</p>`,
      `<p>Hint 2: Walk left to right keeping <code>std::unordered_map&lt;long long, int&gt; seen</code> = how many times each prefix sum occurred so far. At each j add <code>seen[P − k]</code> (use find to avoid inserting zeros).</p>`,
      `<p>Hint 3: Seed <code>seen[0] = 1</code>. Add the current prefix to the map <b>after</b> counting (otherwise k = 0 counts empty subarrays). Use <code>long long</code> for safety.</p>`
    ],
    solution: {
      approach: `<p>Prefix sums + hash map of prefix frequencies. Each element does one lookup and one increment: O(n) average.</p>`,
      code: `#include <unordered_map>
#include <vector>

int subarraySum(const std::vector<int>& nums, int k) {
    std::unordered_map<long long, int> seen;
    seen.reserve(nums.size() * 2);
    seen[0] = 1;                                   // the empty prefix
    long long prefix = 0;
    int count = 0;
    for (int x : nums) {
        prefix += x;
        if (auto it = seen.find(prefix - k); it != seen.end()) count += it->second;
        ++seen[prefix];                            // record AFTER counting
    }
    return count;
}`,
      dry: { head: ['x', 'prefix', 'prefix − k', 'seen[prefix−k]', 'count', 'seen after'], rows: [['1', '1', '−2', '0', '0', '{0:1,1:1}'], ['2', '3', '0', '1', '1', '{0:1,1:1,3:1}'], ['3', '6', '3', '1', '2', '{…,6:1}'], ['−3', '3', '0', '1', '3', '{…,3:2}'], ['3', '6', '3', '2', H.c('g', '5'), '{…,6:2}']] },
      complexity: `<p>O(n) average time, O(n) space.</p>`,
      followUps: ['Longest subarray with sum k (store first index instead of count).', 'Count subarrays divisible by k (map of prefix mod k, careful with negatives).']
    }
  });

  practice.push({
    title: 'Bug Hunt: The Tree Builder That Corrupts Itself',
    level: 'Medium', tags: ['vector', 'iterator invalidation', 'dangling reference', 'bug hunt'], companies: ['Google', 'NVIDIA', 'Meta'],
    statement: `<p>This function builds a tree from <code>(parent, value)</code> pairs. Node 0 is the root; pair i creates node i+1. It works for 3 nodes but produces garbage (or crashes under AddressSanitizer) for larger inputs. Find the bug and fix it in two different ways.</p>
<pre>struct Node { int value; std::vector&lt;int&gt; kids; };

std::vector&lt;Node&gt; build(int rootVal, const std::vector&lt;std::pair&lt;int,int&gt;&gt;&amp; edges) {
    std::vector&lt;Node&gt; nodes;
    nodes.push_back({rootVal, {}});
    for (auto [parent, value] : edges) {
        Node&amp; p = nodes[parent];               // reference into the vector
        nodes.push_back({value, {}});          // may reallocate!
        p.kids.push_back((int)nodes.size() - 1);
    }
    return nodes;
}</pre>`,
    constraints: `Up to 10<sup>5</sup> edges; every parent index refers to an existing node.`,
    example: `<p>root 1, edges [(0,2), (0,3), (1,4)] → nodes[0].kids = [1, 2], nodes[1].kids = [3]. In the buggy version, when the push for node 2 grows capacity 2 → 4, <code>p</code> still refers to the <b>freed</b> old block: the kid index is written into dead memory and nodes[0].kids silently misses it (or the program crashes).</p>`,
    brute: {
      why: `<p>The buggy code holds <code>Node&amp; p</code> across a <code>push_back</code>. When size == capacity, push_back reallocates and moves every Node to a new block; <code>p</code> now dangles. Writing through it is use-after-free — undefined behaviour that "works" for tiny inputs (when no growth happens between taking and using the reference).</p>`,
      code: `struct Node { int value; std::vector<int> kids; };

std::vector<Node> buildBuggy(int rootVal, const std::vector<std::pair<int, int>>& edges) {
    std::vector<Node> nodes;
    nodes.push_back({rootVal, {}});
    for (auto [parent, value] : edges) {
        Node& p = nodes[parent];                    // reference into the current block
        nodes.push_back({value, {}});               // reallocation invalidates p
        p.kids.push_back((int)nodes.size() - 1);    // use-after-free
    }
    return nodes;
}`
    },
    mcq: { q: 'Which change alone makes the original loop correct?', options: ['Use nodes.emplace_back instead of push_back', 'Call nodes.reserve(edges.size() + 1) before the loop', 'Make p a const reference', 'Use nodes.at(parent) instead of nodes[parent]'], answer: 1, explain: 'With enough capacity reserved, push_back never reallocates, so references stay valid. emplace_back reallocates just the same; const and at() do not change lifetimes. (Re-taking the reference after the push is the other clean fix.)' },
    hints: [
      `<p>Hint 1: Ask "can this vector grow while I hold a reference into it?" — between <code>Node&amp; p = nodes[parent]</code> and its use, there is a <code>push_back</code>.</p>`,
      `<p>Hint 2: Fix A: push first, then access <code>nodes[parent]</code> by index (indices survive reallocation). Fix B: <code>nodes.reserve(edges.size() + 1)</code> so no reallocation can happen.</p>`,
      `<p>Hint 3: Prove it with <code>g++ -fsanitize=address -g</code> (heap-use-after-free) or <code>-D_GLIBCXX_DEBUG</code>. Prefer Fix A — it stays correct even if someone later removes the reserve.</p>`
    ],
    solution: {
      approach: `<p>Never hold a reference/pointer/iterator into a vector across an operation that may reallocate. Work with <b>indices</b>, which stay meaningful, or guarantee no reallocation with <code>reserve</code>.</p>`,
      code: `#include <vector>
#include <utility>

struct Node { int value; std::vector<int> kids; };

std::vector<Node> build(int rootVal, const std::vector<std::pair<int, int>>& edges) {
    std::vector<Node> nodes;
    nodes.reserve(edges.size() + 1);                 // Fix B: no reallocation at all (also faster)
    nodes.push_back({rootVal, {}});
    for (auto [parent, value] : edges) {
        nodes.push_back({value, {}});                // grow first...
        int child = static_cast<int>(nodes.size()) - 1;
        nodes[parent].kids.push_back(child);         // Fix A: ...then index fresh, no stale reference
    }
    return nodes;
}`,
      dry: { head: ['edge', 'size before', 'capacity before', 'realloc?', 'buggy p valid?', 'fixed'], rows: [['(0,2)', '1', '1', H.c('r', 'yes → 2'), H.c('r', 'NO'), 'nodes[0].kids=[1]'], ['(0,3)', '2', '2', H.c('r', 'yes → 4'), H.c('r', 'NO'), 'nodes[0].kids=[1,2]'], ['(1,4)', '3', '4', 'no', 'yes (luck)', 'nodes[1].kids=[3]']] },
      complexity: `<p>O(n) time and space. The reserve removes ~log₂n reallocations, each of which also moved every inner <code>kids</code> vector.</p>`,
      followUps: ['Would std::deque&lt;Node&gt; fix it without reserve? (Yes for push_back: references survive.)', 'Same bug with unordered_map: are references safe across rehash? Iterators?']
    }
  });

  practice.push({
    title: 'Top K Frequent Words (comparator direction drill)',
    level: 'Medium', tags: ['unordered_map', 'priority_queue', 'custom comparator'], companies: ['Amazon', 'Bloomberg', 'Uber', 'Yelp'],
    statement: `<p>Given an array of words and an integer k, return the k most frequent words, sorted by frequency from highest to lowest; words with the same frequency are sorted lexicographically (alphabetically ascending).</p>`,
    constraints: `1 ≤ n ≤ 500 (LeetCode) — design for 10<sup>6</sup> words with few distinct ones; 1 ≤ k ≤ number of distinct words.`,
    example: `<p>["i","love","leetcode","i","love","coding"], k = 2 → ["i","love"]. Both appear twice; "i" &lt; "love" alphabetically. With k = 3 the answer adds "coding" (alphabetically before "leetcode", both with count 1).</p>`,
    brute: {
      why: `<p>Count with a map, copy all (word, count) pairs into a vector, and sort everything with the two-key comparator: O(U log U) for U distinct words. Correct and fine for small U, but when U is huge and k is tiny we sort far more than we need.</p>`,
      code: `std::vector<std::string> topKBrute(const std::vector<std::string>& words, int k) {
    std::unordered_map<std::string, int> cnt;
    for (const auto& w : words) ++cnt[w];
    std::vector<std::pair<std::string, int>> all(cnt.begin(), cnt.end());
    std::sort(all.begin(), all.end(), [](const auto& a, const auto& b) {
        return a.second != b.second ? a.second > b.second : a.first < b.first;
    });
    std::vector<std::string> out;
    for (int i = 0; i < k; ++i) out.push_back(all[i].first);
    return out;
}`
    },
    mcq: { q: 'You keep a size-k heap whose top() must be the WORST candidate (to evict). The comparator cmp(a, b) should return true when…', options: ['a is worse than b', 'a is better than b (higher count, or same count and alphabetically smaller)', 'a.count &lt; b.count only', 'a.word &gt; b.word only'], answer: 1, explain: 'priority_queue puts on top the element that is "largest" under cmp. If cmp(a,b) means "a is better", the largest is the worst — exactly what we want to pop when the heap exceeds k.' },
    hints: [
      `<p>Hint 1: Count with <code>std::unordered_map&lt;std::string,int&gt;</code>. Now it is a "top k" problem on (word, count) pairs.</p>`,
      `<p>Hint 2: Keep a heap of at most k entries whose <code>top()</code> is the worst of them; push each pair, pop when size &gt; k. Define <code>better(a,b)</code> = higher count, or same count and smaller word; use it as the comparator.</p>`,
      `<p>Hint 3: Popping yields worst → best, so fill the answer from the back (or reverse). Test the tie-break with words of equal count — it is where most bugs live. Alternative: <code>std::partial_sort</code> on the vector, O(U log k).</p>`
    ],
    solution: {
      approach: `<p>Count, then a size-k heap ordered so that its top is the worst candidate. Each of U distinct words costs O(log k). Finally pop into the result from the back.</p>`,
      code: `#include <unordered_map>
#include <queue>
#include <vector>
#include <string>

std::vector<std::string> topKFrequent(const std::vector<std::string>& words, int k) {
    std::unordered_map<std::string, int> cnt;
    for (const auto& w : words) ++cnt[w];

    using Item = std::pair<int, std::string>;                    // (count, word)
    auto better = [](const Item& a, const Item& b) {             // true if a should rank ABOVE b
        return a.first != b.first ? a.first > b.first : a.second < b.second;
    };
    // With "better" as the comparator, top() is the WORST item -> easy to evict.
    std::priority_queue<Item, std::vector<Item>, decltype(better)> heap(better);
    for (const auto& [w, c] : cnt) {
        heap.emplace(c, w);
        if ((int)heap.size() > k) heap.pop();
    }
    std::vector<std::string> out(heap.size());
    for (int i = (int)out.size() - 1; i >= 0; --i) { out[i] = heap.top().second; heap.pop(); }
    return out;
}`,
      dry: { head: ['push (count,word)', 'heap after (worst on top)', 'pop?'], rows: [['(2,i)', '[(2,i)]', ''], ['(2,love)', '[(2,love),(2,i)]', ''], ['(1,leetcode)', '3 items &gt; k=2', H.c('r', 'pop (1,leetcode)')], ['(1,coding)', '3 items &gt; k=2', H.c('r', 'pop (1,coding)')], ['drain', 'pop love, then i', 'answer [i, love]']] },
      complexity: `<p>O(n·L) counting + O(U log k) heap work; O(U) memory for counts, O(k) for the heap.</p>`,
      followUps: ['Solve with a bucket sort by frequency in O(n).', 'Streaming version with limited memory (Count-Min Sketch + heap).']
    }
  });

  practice.push({
    title: 'Time Based Key-Value Store',
    level: 'Medium', tags: ['unordered_map', 'map', 'upper_bound', 'design'], companies: ['Google', 'Netflix', 'Lyft', 'Apple'],
    statement: `<p>Implement <code>set(key, value, timestamp)</code> and <code>get(key, timestamp)</code>. <code>get</code> returns the value stored for <code>key</code> with the <b>largest timestamp ≤ the given timestamp</b>, or "" if none exists.</p>`,
    constraints: `1 ≤ |key|, |value| ≤ 100; 1 ≤ timestamp ≤ 10<sup>7</sup>; up to 2·10<sup>5</sup> calls. (LeetCode guarantees increasing set timestamps; handle any order.)`,
    example: `<p>set("foo","bar",1); get("foo",1) → "bar"; get("foo",3) → "bar" (latest ≤ 3 is t=1); set("foo","bar2",4); get("foo",4) → "bar2"; get("foo",5) → "bar2"; get("foo",0) → "".</p>`,
    brute: {
      why: `<p>Store every (key, timestamp, value) triple in one vector and scan all of them on each get: O(total sets) per query → 10<sup>10</sup> work. The waste: we search other keys' history and do not exploit time order.</p>`,
      code: `class TimeMapSlow {
    std::vector<std::tuple<std::string, int, std::string>> rows;
public:
    void set(const std::string& k, const std::string& v, int t) { rows.emplace_back(k, t, v); }
    std::string get(const std::string& k, int t) const {
        int bestT = -1; std::string best;
        for (const auto& [rk, rt, rv] : rows)
            if (rk == k && rt <= t && rt > bestT) { bestT = rt; best = rv; }
        return best;
    }
};`
    },
    mcq: { q: 'In a std::map&lt;int, string&gt; history, how do you get the largest timestamp ≤ t?', options: ['history.find(t)', 'history.lower_bound(t)', 'std::prev(history.upper_bound(t)) after checking upper_bound(t) != begin()', 'history.rbegin()'], answer: 2, explain: 'upper_bound(t) is the first key &gt; t, so the element just before it is the last key ≤ t. If upper_bound returns begin(), no key ≤ t exists.' },
    hints: [
      `<p>Hint 1: Two levels: find the key's own history (hash lookup), then search inside that history by time (ordered search).</p>`,
      `<p>Hint 2: <code>std::unordered_map&lt;std::string, std::map&lt;int, std::string&gt;&gt;</code>. "Largest ≤ t" = <code>prev(upper_bound(t))</code>.</p>`,
      `<p>Hint 3: Guard <code>upper_bound(t) == begin()</code> → "". If timestamps per key are guaranteed increasing, a <code>vector&lt;pair&lt;int,string&gt;&gt;</code> + <code>std::upper_bound</code> is faster (contiguous, no nodes). Use <code>find</code> for the outer map in <code>get</code> to avoid inserting unknown keys.</p>`
    ],
    solution: {
      approach: `<p>Hash map from key to an ordered map of timestamp → value. <code>get</code> = one hash lookup + one O(log h) <code>upper_bound</code> in that key's history of size h.</p>`,
      code: `#include <unordered_map>
#include <map>
#include <string>
#include <iterator>

class TimeMap {
    std::unordered_map<std::string, std::map<int, std::string>> store;
public:
    void set(const std::string& key, const std::string& value, int timestamp) {
        store[key][timestamp] = value;                    // creating the inner map on first use is fine
    }
    std::string get(const std::string& key, int timestamp) const {
        auto outer = store.find(key);                     // never insert on read
        if (outer == store.end()) return "";
        const auto& hist = outer->second;
        auto it = hist.upper_bound(timestamp);            // first time > timestamp
        if (it == hist.begin()) return "";                // nothing at or before timestamp
        return std::prev(it)->second;                     // last time <= timestamp
    }
};`,
      dry: { head: ['call', 'history of "foo"', 'upper_bound', 'returns'], rows: [['set(foo,bar,1)', '{1:bar}', '', ''], ['get(foo,3)', '{1:bar}', 'end()', 'prev → bar'], ['set(foo,bar2,4)', '{1:bar, 4:bar2}', '', ''], ['get(foo,4)', '', 'end()', 'bar2'], ['get(foo,0)', '', 'begin() (1)', '""']] },
      complexity: `<p>set O(log h); get O(log h) (+ O(|key|) hashing). Space O(total sets).</p>`,
      followUps: ['Add <code>delete(key, timestamp)</code>.', 'Persist it: what would an LSM-tree / time-series database do differently?']
    }
  });

  practice.push({
    title: 'Number Container System (smallest index per number)',
    level: 'Medium', tags: ['unordered_map', 'set', 'container choice', 'design'], companies: ['Google', 'Amazon'],
    statement: `<p>Design a system over a huge array of slots. <code>change(index, number)</code> puts <code>number</code> into slot <code>index</code> (replacing whatever was there). <code>find(number)</code> returns the <b>smallest index</b> currently holding <code>number</code>, or −1.</p>`,
    constraints: `1 ≤ index, number ≤ 10<sup>9</sup>; up to 10<sup>5</sup> calls total.`,
    example: `<p>find(10) → −1. change(2,10), change(1,10), change(3,10), change(5,10) → find(10) = <b>1</b>. change(1,20) (slot 1 now holds 20) → find(10) = <b>2</b>.</p>`,
    brute: {
      why: `<p>Store <code>map&lt;index, number&gt;</code> and scan it in index order on every <code>find</code> until the number appears: O(n) per find → 10<sup>10</sup>. A plain array is impossible (indices up to 10<sup>9</sup>).</p>`,
      code: `class NumberContainersSlow {
    std::map<int, int> slot;   // index -> number
public:
    void change(int index, int number) { slot[index] = number; }
    int find(int number) const {
        for (const auto& [idx, num] : slot) if (num == number) return idx;   // O(n)
        return -1;
    }
};`
    },
    mcq: { q: 'Which pair of containers gives O(log n) change and find?', options: ['vector&lt;int&gt; + sort', 'unordered_map&lt;index,number&gt; + unordered_map&lt;number, set&lt;index&gt;&gt;', 'priority_queue&lt;int&gt; only', 'unordered_set&lt;int&gt;'], answer: 1, explain: 'You need slot → number to know what to remove on overwrite, and number → ordered set of indices for "smallest index" (set::begin) with O(log n) erase of the overwritten index.' },
    hints: [
      `<p>Hint 1: Overwriting a slot must remove that index from the old number's collection — so you must remember what each slot holds.</p>`,
      `<p>Hint 2: <code>unordered_map&lt;int,int&gt; numAt</code> and <code>unordered_map&lt;int, std::set&lt;int&gt;&gt; indicesOf</code>. find = <code>*indicesOf[number].begin()</code>.</p>`,
      `<p>Hint 3: Erase empty sets to keep memory bounded; use <code>find</code> on the outer map in <code>find()</code>. Alternative: per-number min-heap with lazy deletion (skip heap tops whose slot no longer holds that number).</p>`
    ],
    solution: {
      approach: `<p>Two maps, each answering one question: "what is in slot i?" (hash map) and "which slots hold number x, in order?" (hash map to an ordered set). change = O(log n), find = O(1) after the hash lookup.</p>`,
      code: `#include <unordered_map>
#include <set>

class NumberContainers {
    std::unordered_map<int, int> numAt;                  // index -> number
    std::unordered_map<int, std::set<int>> indicesOf;    // number -> sorted indices
public:
    void change(int index, int number) {
        if (auto it = numAt.find(index); it != numAt.end()) {
            if (it->second == number) return;
            auto& old = indicesOf[it->second];
            old.erase(index);
            if (old.empty()) indicesOf.erase(it->second);
            it->second = number;
        } else {
            numAt.emplace(index, number);
        }
        indicesOf[number].insert(index);
    }
    int find(int number) const {
        auto it = indicesOf.find(number);
        return it == indicesOf.end() ? -1 : *it->second.begin();
    }
};`,
      dry: { head: ['call', 'numAt', 'indicesOf', 'returns'], rows: [['change(2,10)', '{2:10}', '{10:{2}}', ''], ['change(1,10)', '{2:10,1:10}', '{10:{1,2}}', ''], ['find(10)', '', '', '1'], ['change(1,20)', '{2:10,1:20}', '{10:{2}, 20:{1}}', ''], ['find(10)', '', '', H.c('g', '2')]] },
      complexity: `<p>change O(log n); find O(1) average. Space O(n).</p>`,
      followUps: ['Also support "largest index" and "count of slots holding x".', 'What if numbers are tiny (≤ 100)? (array of sets)']
    }
  });

  practice.push({
    title: 'Insert Delete GetRandom O(1)',
    level: 'Medium', tags: ['vector', 'unordered_map', 'swap-with-back', 'design'], companies: ['Meta', 'Amazon', 'LinkedIn', 'Twitter'],
    statement: `<p>Implement a set of integers supporting <code>insert(val)</code>, <code>remove(val)</code> (both return whether the set changed) and <code>getRandom()</code>, which returns a uniformly random current element. All three must be <b>average O(1)</b>.</p>`,
    constraints: `−2<sup>31</sup> ≤ val ≤ 2<sup>31</sup>−1; up to 2·10<sup>5</sup> calls; getRandom is only called on a non-empty set.`,
    example: `<p>insert(1) → true; remove(2) → false; insert(2) → true; getRandom() → 1 or 2 (50/50); remove(1) → true; getRandom() → 2.</p>`,
    brute: {
      why: `<p><code>unordered_set</code> gives O(1) insert/remove but has no O(1) random access: picking the i-th element means walking i nodes (O(n)). A vector alone gives O(1) random pick but O(n) find/remove. Neither container alone works.</p>`,
      code: `class RandomizedSetSlow {
    std::unordered_set<int> s;
    std::mt19937 rng{12345};
public:
    bool insert(int v) { return s.insert(v).second; }
    bool remove(int v) { return s.erase(v) > 0; }
    int getRandom() {
        auto it = s.begin();
        std::advance(it, std::uniform_int_distribution<int>(0, (int)s.size() - 1)(rng));   // O(n) walk
        return *it;
    }
};`
    },
    mcq: { q: 'How do you remove an element from the middle of the vector in O(1)?', options: ['vector::erase', 'Overwrite it with the last element, update that element\'s index in the map, then pop_back', 'Mark it as deleted and never compact', 'Sort and binary search'], answer: 1, explain: 'Order does not matter in a set, so swap-with-back + pop_back removes in O(1). The moved element\'s stored index must be updated, otherwise later removals break.' },
    hints: [
      `<p>Hint 1: Random access in O(1) needs contiguous storage → <code>std::vector&lt;int&gt;</code>. Finding an element in O(1) needs hashing → <code>std::unordered_map&lt;int, int&gt;</code> value → index.</p>`,
      `<p>Hint 2: Remove: look up the index i of val, move the last element into slot i, update its index, <code>pop_back</code>, erase val from the map.</p>`,
      `<p>Hint 3: Edge case: removing the last element itself (i == size−1) — the "move" is a self-assignment; update/erase in the right order. Use <code>std::mt19937</code> + <code>std::uniform_int_distribution</code>, not <code>rand() % n</code>.</p>`
    ],
    solution: {
      approach: `<p>vector holds the elements (random pick by index), hash map holds each value's index (O(1) find). Removal uses swap-with-back so nothing shifts.</p>`,
      code: `#include <vector>
#include <unordered_map>
#include <random>

class RandomizedSet {
    std::vector<int> vals_;
    std::unordered_map<int, int> pos_;          // value -> index in vals_
    std::mt19937 rng_{std::random_device{}()};
public:
    bool insert(int v) {
        if (pos_.count(v)) return false;
        pos_[v] = static_cast<int>(vals_.size());
        vals_.push_back(v);
        return true;
    }
    bool remove(int v) {
        auto it = pos_.find(v);
        if (it == pos_.end()) return false;
        int i = it->second, last = vals_.back();
        vals_[i] = last;                         // move the last element into the hole
        pos_[last] = i;                          // update its index (no-op if v was last)
        vals_.pop_back();
        pos_.erase(v);                           // erase AFTER updating, handles v == last
        return true;
    }
    int getRandom() {
        std::uniform_int_distribution<int> pick(0, static_cast<int>(vals_.size()) - 1);
        return vals_[pick(rng_)];
    }
};`,
      dry: { head: ['op', 'vals_', 'pos_', 'returns'], rows: [['insert(1)', '[1]', '{1:0}', 'true'], ['insert(2)', '[1,2]', '{1:0,2:1}', 'true'], ['insert(3)', '[1,2,3]', '{1:0,2:1,3:2}', 'true'], ['remove(1)', '[3,2]', '{3:0,2:1}', 'true (3 moved into slot 0)'], ['remove(2)', '[3]', '{3:0}', 'true (2 was last)']] },
      complexity: `<p>All operations O(1) average; O(n) space.</p>`,
      followUps: ['Allow duplicates (value → set of indices).', 'getRandom weighted by a per-element weight (prefix sums + binary search).']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Sliding Window Median',
    level: 'Hard', tags: ['multiset', 'iterators', 'sliding window'], companies: ['Google', 'Amazon', 'Spotify'],
    statement: `<p>Given an array <code>nums</code> and a window size <code>k</code>, return the median of each window as it slides from left to right. For even k, the median is the mean of the two middle values.</p>`,
    constraints: `1 ≤ k ≤ n ≤ 10<sup>5</sup>, −2<sup>31</sup> ≤ nums[i] ≤ 2<sup>31</sup>−1 (watch overflow when averaging).`,
    example: `<p>nums = [1, 3, −1, −3, 5, 3, 6, 7], k = 3 → [1, −1, −1, 3, 5, 6]. Window [1, 3, −1] sorted is [−1, 1, 3] → median 1; window [3, −1, −3] → [−3, −1, 3] → −1; …</p>`,
    brute: {
      why: `<p>Copy and sort every window: (n − k + 1) · k log k ≈ 10<sup>5</sup> · 5·10<sup>4</sup> · 16 operations for large k → hopeless. The waste: consecutive windows differ by one element, yet we re-sort all k.</p>`,
      code: `std::vector<double> medianBrute(const std::vector<int>& nums, int k) {
    std::vector<double> res;
    for (int i = 0; i + k <= (int)nums.size(); ++i) {
        std::vector<long long> w(nums.begin() + i, nums.begin() + i + k);
        std::sort(w.begin(), w.end());                                  // O(k log k) per window
        res.push_back(k % 2 ? w[k / 2] : (w[k / 2 - 1] + w[k / 2]) / 2.0);
    }
    return res;
}`
    },
    mcq: { q: 'You keep the window in a std::multiset and an iterator <code>mid</code> at the median. When a new value smaller than *mid is inserted, what happens to mid?', options: ['It becomes invalid', 'It still points at the same element, which is now one position further right in sorted order, so step it left (--mid)', 'It automatically moves', 'Nothing needs to change'], answer: 1, explain: 'Inserting into a multiset never invalidates iterators, but the element mid points at has one more element before it now. Moving mid one step left restores "mid = k/2-th element".' },
    hints: [
      `<p>Hint 1: You need a sorted window that supports insert + erase of one copy in O(log k) → <code>std::multiset&lt;int&gt;</code>.</p>`,
      `<p>Hint 2: Keep an iterator <code>mid</code> to the element at sorted position k/2. Iterators survive inserts/erases of <b>other</b> elements, so you can nudge it by one step after each change.</p>`,
      `<p>Hint 3: Insert the incoming value (multiset inserts equal values <b>after</b> existing equals); if it is &lt; *mid, <code>--mid</code>. For the outgoing value: if it is ≤ *mid, <code>++mid</code>; then erase <code>lower_bound(out)</code> (one copy). Median = (*mid + *prev(mid, 1 − k%2)) / 2.0 computed in double.</p>`
    ],
    solution: {
      approach: `<p>Multiset window + a median iterator that is adjusted by at most one step per insert/erase. Because multiset iterators stay valid across other insertions and erasures, the iterator never needs to be recomputed with an O(k) walk.</p>`,
      code: `#include <set>
#include <vector>
#include <iterator>

std::vector<double> medianSlidingWindow(const std::vector<int>& nums, int k) {
    std::multiset<int> window(nums.begin(), nums.begin() + k);
    auto mid = std::next(window.begin(), k / 2);                 // the (k/2)-th element
    std::vector<double> medians;
    for (int i = k;; ++i) {
        // odd k: *mid; even k: mean of *mid and the element before it
        medians.push_back((static_cast<double>(*mid) + *std::prev(mid, 1 - k % 2)) / 2.0);
        if (i == (int)nums.size()) return medians;
        window.insert(nums[i]);                                  // goes after equal values
        if (nums[i] < *mid) --mid;                               // one more element before mid
        if (nums[i - k] <= *mid) ++mid;                          // the leaving element is before/at mid
        window.erase(window.lower_bound(nums[i - k]));           // erase exactly one copy
    }
}`,
      dry: { head: ['window (sorted)', 'mid', 'median', 'next step'], rows: [['{−1,1,3}', '1', '1', 'in −3 (&lt; 1 → --mid), out 1 (≤ −1? no)'], ['{−3,−1,3}', '−1', '−1', 'in 5, out 3'], ['{−3,−1,5}', '−1', '−1', 'in 3, out −1 (≤ −1 → ++mid)'], ['{−3,3,5}', '3', '3', 'in 6, out −3'], ['{3,5,6}', '5', '5', 'in 7, out 5'], ['{3,6,7}', '6', '6', 'done']] },
      complexity: `<p>O(n log k) time; O(k) space. Two-heap alternative with lazy deletion has the same bound but trickier bookkeeping.</p>`,
      followUps: ['Why does the order of the two mid adjustments matter when values repeat?', 'Sliding window k-th smallest for any k (order-statistics tree).']
    }
  });

  practice.push({
    title: 'Merge K Sorted Lists',
    level: 'Hard', tags: ['priority_queue', 'linked list', 'k-way merge'], companies: ['Amazon', 'Google', 'Meta', 'Microsoft', 'Uber'],
    statement: `<p>You are given <code>k</code> singly linked lists, each sorted ascending. Merge them into one sorted linked list and return its head. Reuse the existing nodes (no new allocations).</p>`,
    constraints: `0 ≤ k ≤ 10<sup>4</sup>; total nodes N ≤ 10<sup>4</sup> (design for 10<sup>6</sup>); −10<sup>4</sup> ≤ val ≤ 10<sup>4</sup>.`,
    example: `<p>[[1,4,5], [1,3,4], [2,6]] → <b>1 → 1 → 2 → 3 → 4 → 4 → 5 → 6</b>. At every step the next output node is the smallest among the current heads of all lists.</p>`,
    brute: {
      why: `<p>At every step scan all k heads to find the minimum: O(N · k) = 10<sup>10</sup> for N = 10<sup>6</sup>, k = 10<sup>4</sup>. The waste: k − 1 of those heads did not change since the last scan; we keep re-comparing them.</p>`,
      code: `struct ListNode { int val; ListNode* next; ListNode(int v, ListNode* n = nullptr) : val(v), next(n) {} };

ListNode* mergeKBrute(std::vector<ListNode*> lists) {
    ListNode dummy(0);
    ListNode* tail = &dummy;
    while (true) {
        int best = -1;
        for (int i = 0; i < (int)lists.size(); ++i)                  // O(k) per output node
            if (lists[i] && (best == -1 || lists[i]->val < lists[best]->val)) best = i;
        if (best == -1) break;
        tail->next = lists[best];
        tail = tail->next;
        lists[best] = lists[best]->next;
    }
    return dummy.next;
}`
    },
    mcq: { q: 'The heap holds ListNode*. Which comparator makes the SMALLEST value appear at top()?', options: ['a-&gt;val &lt; b-&gt;val', 'a-&gt;val &gt; b-&gt;val', 'a &lt; b (compare pointers)', 'std::less&lt;ListNode*&gt;'], answer: 1, explain: 'priority_queue puts the "largest" under the comparator on top. With cmp = a-&gt;val &gt; b-&gt;val, the node with the smallest val is "largest", so it surfaces — the same trick as std::greater for a min-heap.' },
    hints: [
      `<p>Hint 1: The next output is always one of the k current heads. Keep the heads in a structure that gives the minimum fast.</p>`,
      `<p>Hint 2: A min-heap of <code>ListNode*</code> with comparator <code>a-&gt;val &gt; b-&gt;val</code>. Pop the smallest, append it, push its <code>next</code> if non-null.</p>`,
      `<p>Hint 3: Skip null lists when initialising. Use a dummy head node on the stack to avoid special-casing the first append. Alternative: divide and conquer pairwise merging, also O(N log k) and no heap.</p>`
    ],
    solution: {
      approach: `<p>k-way merge with a min-heap of the current heads. Each of the N nodes is pushed and popped once at O(log k) each.</p>`,
      code: `#include <queue>
#include <vector>

struct ListNode { int val; ListNode* next; ListNode(int v, ListNode* n = nullptr) : val(v), next(n) {} };

ListNode* mergeKLists(const std::vector<ListNode*>& lists) {
    auto cmp = [](const ListNode* a, const ListNode* b) { return a->val > b->val; };   // min on top
    std::priority_queue<ListNode*, std::vector<ListNode*>, decltype(cmp)> heap(cmp);
    for (ListNode* head : lists) if (head) heap.push(head);
    ListNode dummy(0);
    ListNode* tail = &dummy;
    while (!heap.empty()) {
        ListNode* node = heap.top();
        heap.pop();
        tail->next = node;                      // reuse the node, no allocation
        tail = node;
        if (node->next) heap.push(node->next);  // its successor becomes a candidate
    }
    tail->next = nullptr;
    return dummy.next;
}`,
      dry: { head: ['pop', 'push', 'heap (values)', 'output so far'], rows: [['—', '1a, 1b, 2', '{1,1,2}', ''], ['1a', '4a', '{1,2,4}', '1'], ['1b', '3', '{2,3,4}', '1 1'], ['2', '6', '{3,4,6}', '1 1 2'], ['3', '4b', '{4,4,6}', '1 1 2 3'], ['…', '…', '…', '1 1 2 3 4 4 5 6']] },
      complexity: `<p>O(N log k) time, O(k) extra space for the heap.</p>`,
      followUps: ['External merge sort of 100 files that do not fit in RAM — same pattern.', 'Smallest range covering elements from k lists (heap + running max).']
    }
  });

  practice.push({
    title: 'LFU Cache',
    level: 'Hard', tags: ['unordered_map', 'list', 'splice', 'design'], companies: ['Amazon', 'Google', 'Microsoft'],
    statement: `<p>Design a Least-Frequently-Used cache with capacity <code>capacity</code>. <code>get(key)</code> returns the value or −1 and counts as a use. <code>put(key, value)</code> inserts or updates (also a use). When full, evict the key with the <b>lowest use count</b>; among ties, evict the <b>least recently used</b>. Both operations must be O(1) average.</p>`,
    constraints: `0 ≤ capacity ≤ 10<sup>4</sup>; 0 ≤ key ≤ 10<sup>5</sup>; up to 2·10<sup>5</sup> calls.`,
    example: `<p>capacity 2: put(1,1), put(2,2), get(1) → 1 (freq: 1→2, 2→1), put(3,3) → evicts <b>2</b> (lowest freq), get(2) → −1, get(3) → 3 (freq 2), put(4,4) → keys 1 and 3 both have freq 2; 1 was used longer ago → evict <b>1</b>.</p>`,
    brute: {
      why: `<p>Store (key, value, freq, lastUsed) in a hash map and, on eviction, scan all entries for the minimum (freq, lastUsed): O(capacity) per eviction → 2·10<sup>9</sup> in the worst case. The waste: recomputing the minimum instead of maintaining it.</p>`,
      code: `class LFUSlow {
    struct E { int value, freq; long long last; };
    int cap; long long clock = 0;
    std::unordered_map<int, E> m;
public:
    explicit LFUSlow(int c) : cap(c) {}
    int get(int k) {
        auto it = m.find(k);
        if (it == m.end()) return -1;
        it->second.freq++; it->second.last = ++clock;
        return it->second.value;
    }
    void put(int k, int v) {
        if (cap == 0) return;
        if (auto it = m.find(k); it != m.end()) { it->second.value = v; it->second.freq++; it->second.last = ++clock; return; }
        if ((int)m.size() == cap) {
            auto victim = m.begin();
            for (auto it = m.begin(); it != m.end(); ++it)                      // O(capacity) scan
                if (std::tie(it->second.freq, it->second.last) < std::tie(victim->second.freq, victim->second.last)) victim = it;
            m.erase(victim);
        }
        m[k] = {v, 1, ++clock};
    }
};`
    },
    mcq: { q: 'Which extra variable makes eviction O(1) once you keep one recency list per frequency?', options: ['The maximum frequency', 'minFreq — the smallest frequency that currently has a non-empty list', 'A global timestamp', 'The total number of gets'], answer: 1, explain: 'Eviction takes the back of the list for minFreq. minFreq only changes in two simple ways: it resets to 1 on inserting a new key, and increases by 1 when the last node of the minFreq list is promoted.' },
    hints: [
      `<p>Hint 1: Group keys by frequency; inside each group keep recency order (LRU). Then the victim is the LRU node of the smallest non-empty frequency group.</p>`,
      `<p>Hint 2: <code>unordered_map&lt;int, list&lt;Node&gt;&gt; byFreq</code> (front = most recent), <code>unordered_map&lt;int, list&lt;Node&gt;::iterator&gt; where</code>, and <code>int minFreq</code>. A use = <code>splice</code> the node from list f to the front of list f+1.</p>`,
      `<p>Hint 3: After a splice, if list f became empty, erase it and bump minFreq if it was f. New keys go into list 1 and set minFreq = 1. Capacity 0 → put does nothing. References into an unordered_map survive rehash, so holding <code>auto&amp; src = byFreq[f]</code> while calling <code>byFreq[f+1]</code> is safe.</p>`
    ],
    solution: {
      approach: `<p>Frequency buckets, each an LRU list; a key → node-iterator map; and minFreq. Every operation is a constant number of hash lookups and list splices: O(1) average. Splicing keeps the node in place, so the iterator in <code>where_</code> never needs updating.</p>`,
      code: `#include <unordered_map>
#include <list>

class LFUCache {
    struct Node { int key, value, freq; };
    int cap_, minFreq_ = 0;
    std::unordered_map<int, std::list<Node>> byFreq_;            // freq -> nodes, front = most recent
    std::unordered_map<int, std::list<Node>::iterator> where_;   // key -> its node

    void touch(std::list<Node>::iterator it) {
        int f = it->freq;
        auto& src = byFreq_[f];
        auto& dst = byFreq_[f + 1];          // may rehash byFreq_: references stay valid
        dst.splice(dst.begin(), src, it);    // node moves between lists; 'it' stays valid
        it->freq = f + 1;
        if (src.empty()) {
            byFreq_.erase(f);
            if (minFreq_ == f) minFreq_ = f + 1;
        }
    }

public:
    explicit LFUCache(int capacity) : cap_(capacity) {}

    int get(int key) {
        auto w = where_.find(key);
        if (w == where_.end()) return -1;
        touch(w->second);
        return w->second->value;
    }

    void put(int key, int value) {
        if (cap_ <= 0) return;
        if (auto w = where_.find(key); w != where_.end()) {
            w->second->value = value;
            touch(w->second);
            return;
        }
        if ((int)where_.size() == cap_) {                      // evict LRU of the min-frequency list
            auto& victims = byFreq_[minFreq_];
            where_.erase(victims.back().key);
            victims.pop_back();
            if (victims.empty()) byFreq_.erase(minFreq_);
        }
        auto& ones = byFreq_[1];
        ones.push_front({key, value, 1});
        where_[key] = ones.begin();
        minFreq_ = 1;
    }
};`,
      dry: { head: ['call', 'byFreq (front = recent)', 'minFreq', 'result'], rows: [['put(1,1)', '1:[1]', '1', ''], ['put(2,2)', '1:[2,1]', '1', ''], ['get(1)', '1:[2] 2:[1]', '1', '1'], ['put(3,3)', 'evict 2 → 1:[3] 2:[1]', '1', H.c('r', 'evict 2')], ['get(3)', '2:[3,1]', '2', '3'], ['put(4,4)', 'evict back of 2 → 1 ; 1:[4] 2:[3]', '1', H.c('r', 'evict 1')]] },
      complexity: `<p>O(1) average for get and put; O(capacity) space.</p>`,
      followUps: ['Add time-based decay of frequencies (e.g. halve all counts periodically) — what breaks?', 'Compare with W-TinyLFU (Caffeine) used in production caches.']
    }
  });

  practice.push({
    title: 'Find Median from Data Stream',
    level: 'Hard', tags: ['priority_queue', 'two heaps', 'design'], companies: ['Google', 'Amazon', 'Microsoft', 'Apple'],
    statement: `<p>Implement <code>addNum(x)</code>, which adds an integer from a stream, and <code>findMedian()</code>, which returns the median of all numbers so far (mean of the two middle values for an even count).</p>`,
    constraints: `−10<sup>5</sup> ≤ x ≤ 10<sup>5</sup>; up to 5·10<sup>4</sup> calls; findMedian only after at least one addNum.`,
    example: `<p>addNum(1), addNum(2) → findMedian() = <b>1.5</b>; addNum(3) → findMedian() = <b>2</b>. Lower half {1, 2} in a max-heap (top 2), upper half {3} in a min-heap (top 3); sizes differ by one → median is the max-heap top.</p>`,
    brute: {
      why: `<p>Keep a sorted vector and insert with <code>lower_bound</code> + <code>insert</code>: O(log n) to find the slot but O(n) to shift → O(n²) total for n adds (fine for 5·10<sup>4</sup> thanks to memmove, terrible for 10<sup>7</sup>). Or sort on every query: O(n log n) per query.</p>`,
      code: `class MedianFinderSlow {
    std::vector<int> v;   // kept sorted
public:
    void addNum(int x) { v.insert(std::upper_bound(v.begin(), v.end(), x), x); }   // O(n) shift
    double findMedian() const {
        std::size_t n = v.size();
        return n % 2 ? v[n / 2] : (v[n / 2 - 1] + (double)v[n / 2]) / 2.0;
    }
};`
    },
    mcq: { q: 'Which pair of heaps exposes the two middle elements?', options: ['Two min-heaps', 'Two max-heaps', 'A max-heap for the lower half and a min-heap for the upper half', 'One heap of all numbers'], answer: 2, explain: 'The lower half\'s maximum and the upper half\'s minimum are exactly the middle elements. Each is the top() of a heap of the right kind.' },
    hints: [
      `<p>Hint 1: The median only depends on the boundary between the smaller half and the larger half.</p>`,
      `<p>Hint 2: <code>std::priority_queue&lt;int&gt; low</code> (max-heap) and <code>std::priority_queue&lt;int, std::vector&lt;int&gt;, std::greater&lt;int&gt;&gt; high</code> (min-heap). Invariant: every element of low ≤ every element of high, and <code>low.size()</code> is equal to or one more than <code>high.size()</code>.</p>`,
      `<p>Hint 3: Add: push into low, move low's top to high, and if high is now bigger move high's top back to low. Median: odd count → low.top(); even → mean in <code>double</code>.</p>`
    ],
    solution: {
      approach: `<p>Two heaps split the stream into halves around the median. Each add does at most three heap operations (O(log n)); each query reads two tops (O(1)).</p>`,
      code: `#include <queue>
#include <vector>
#include <functional>

class MedianFinder {
    std::priority_queue<int> low_;                                        // max-heap: smaller half
    std::priority_queue<int, std::vector<int>, std::greater<int>> high_;  // min-heap: larger half
public:
    void addNum(int x) {
        low_.push(x);
        high_.push(low_.top());   // the largest of the lower half moves up (keeps low <= high)
        low_.pop();
        if (high_.size() > low_.size()) {   // rebalance: low may hold at most one extra
            low_.push(high_.top());
            high_.pop();
        }
    }
    double findMedian() const {
        if (low_.size() > high_.size()) return low_.top();
        return (static_cast<double>(low_.top()) + high_.top()) / 2.0;
    }
};`,
      dry: { head: ['add', 'low (max-heap)', 'high (min-heap)', 'median'], rows: [['1', '{1}', '{}', '1'], ['2', '{1}', '{2}', '1.5'], ['3', '{2,1}', '{3}', '2'], ['0', '{1,0}', '{2,3}', '1.5']] },
      complexity: `<p>addNum O(log n); findMedian O(1); O(n) space.</p>`,
      followUps: ['All numbers are in [0, 100]: use a counting array (O(1) add, O(100) query).', '99% of numbers are in [0, 100]: counts + two overflow heaps.', 'Support removal (two multisets or lazy-deletion heaps — the Sliding Window Median problem).']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'A <code>std::vector&lt;int&gt;</code> on GCC has size 4 and capacity 4. You call <code>push_back</code> once. What is the new capacity?', options: ['5', '6', '8', '16'], answer: 2, explain: 'libstdc++ (and libc++) double the capacity when full: 4 → 8. MSVC would grow by 1.5× to 6.' },
    { q: 'What does <code>v.reserve(100)</code> do to an empty vector?', options: ['Creates 100 zero elements', 'Sets capacity to at least 100; size stays 0', 'Limits the vector to 100 elements', 'Nothing until the first push_back'], answer: 1, explain: 'reserve only allocates storage. size() is still 0, so v[0] is out of bounds. resize(100) would create 100 value-initialised elements.' },
    { q: 'Which statement about <code>for (auto it = v.begin(); it != v.end(); ++it) if (bad(*it)) v.erase(it);</code> is true?', options: ['It is correct but slow', 'It is undefined behaviour: it is invalid after erase, and ++it may skip elements or run past end()', 'It only fails for std::list', 'It is fine since C++11'], answer: 1, explain: 'erase invalidates the erased iterator (and everything after it for a vector). Use it = v.erase(it), or better std::erase_if / erase-remove.' },
    { q: 'After <code>d.push_back(x)</code> on a <code>std::deque</code>, which remain valid?', options: ['All iterators and references', 'References and pointers to existing elements, but not iterators', 'Iterators, but not references', 'Nothing'], answer: 1, explain: 'deque blocks never move, so element references survive end insertions; the block map may be reallocated, which invalidates iterators.' },
    { q: 'Which container does <code>std::stack</code> use by default?', options: ['std::vector', 'std::list', 'std::deque', 'std::array'], answer: 2, explain: 'Both std::stack and std::queue default to std::deque. priority_queue defaults to std::vector.' },
    { q: 'For <code>std::set&lt;int&gt; s = {10, 20, 30}</code>, what is <code>*s.upper_bound(20)</code>?', options: ['10', '20', '30', 'end() — dereferencing is UB'], answer: 2, explain: 'upper_bound returns the first element strictly greater than the key: 30. lower_bound(20) would return 20.' },
    { q: 'What does <code>std::map&lt;string,int&gt; m; int x = m["k"];</code> do if "k" is absent?', options: ['Throws std::out_of_range', 'Returns 0 without changing the map', 'Inserts "k" → 0 and returns 0', 'Undefined behaviour'], answer: 2, explain: 'operator[] default-constructs and inserts a missing key. Use find/contains for read-only checks, and at() if you want an exception.' },
    { q: 'Which declaration gives a MIN-heap of ints?', options: ['std::priority_queue&lt;int&gt;', 'std::priority_queue&lt;int, std::vector&lt;int&gt;, std::greater&lt;int&gt;&gt;', 'std::priority_queue&lt;int, std::deque&lt;int&gt;&gt;', 'std::priority_queue&lt;int, std::vector&lt;int&gt;, std::less&lt;int&gt;&gt;'], answer: 1, explain: 'The comparator says "a has lower priority than b". With std::greater, larger values have lower priority, so the smallest is on top.' },
    { q: 'An <code>unordered_map</code> with <code>max_load_factor() == 1.0</code> has 13 buckets and 13 elements. You insert a new key. What happens?', options: ['The new node is chained, nothing else', 'A rehash to more buckets occurs, invalidating iterators (but not references)', 'Insertion fails', 'All references to elements are invalidated'], answer: 1, explain: '14 / 13 &gt; 1.0, so the table rehashes (libstdc++ picks the next prime, 29). Nodes do not move, so references and pointers stay valid; iterators do not.' },
    { q: 'Why does <code>std::sort(myList.begin(), myList.end())</code> fail to compile for a <code>std::list</code>?', options: ['Lists cannot be sorted', 'std::sort needs random-access iterators; list iterators are bidirectional', 'Lists are always sorted', 'Missing #include &lt;algorithm&gt;'], answer: 1, explain: 'std::sort uses iterator arithmetic (it + n, it2 − it1). Use the member list::sort(), a stable merge sort that only relinks nodes.' },
    { q: 'Which key type does NOT have a <code>std::hash</code> specialization in the standard library?', options: ['std::string', 'int', 'std::pair&lt;int,int&gt;', 'std::string_view'], answer: 2, explain: 'There is no std::hash for pair, tuple or vector. Write a custom hasher or encode the pair into one 64-bit integer.' },
    { q: '<code>std::multiset&lt;int&gt; s = {4, 4, 4}; s.erase(4);</code> — what is <code>s.size()</code> afterwards?', options: ['2', '0', '3', 'Undefined'], answer: 1, explain: 'erase(key) removes ALL elements equal to the key and returns how many it removed (3). To remove a single copy use s.erase(s.find(4)).' },
    { q: 'You need: insert, delete any element, and get the minimum — all O(log n). Which single standard container fits best?', options: ['std::priority_queue', 'std::multiset', 'std::unordered_set', 'std::vector'], answer: 1, explain: 'multiset gives begin() for the minimum and erase(find(x)) for arbitrary deletion, both O(log n), with duplicates allowed. priority_queue cannot delete an arbitrary element.' },
    { q: 'Building a <code>priority_queue</code> from a range of n elements (the iterator-pair constructor) costs…', options: ['O(n log n) always', 'O(n) — it calls make_heap', 'O(log n)', 'O(n²)'], answer: 1, explain: 'make_heap sifts down internal nodes bottom-up; the work sums to O(n). Pushing elements one at a time would be O(n log n).' },
    { q: 'Which custom comparator for <code>std::set</code> is INVALID?', options: ['[](int a, int b) { return a &lt; b; }', '[](int a, int b) { return a &gt; b; }', '[](int a, int b) { return a &lt;= b; }', '[](int a, int b) { return std::abs(a) &lt; std::abs(b); }'], answer: 2, explain: 'Comparators must be strict weak orderings, which requires cmp(a, a) == false. a &lt;= b is reflexive and breaks equivalence, causing duplicates and failed lookups. Comparing absolute values is valid (−3 and 3 are then "equivalent").' }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { q: 'Explain how <code>std::vector::push_back</code> is amortized O(1).', level: 'B', a: `<p>A vector keeps spare capacity. Most push_backs write into a free slot (O(1)). When full, it allocates a block about <b>twice</b> as large (1.5× on MSVC), moves the elements, and frees the old block (O(n)). Because capacity grows geometrically, the total copy cost over n pushes is 1 + 2 + 4 + … &lt; 2n, i.e. a constant amount per push on average. Growing by a fixed amount (+1 or +100) would make it O(n²) overall. Practical follow-on: call <code>reserve</code> when the final size is known, which removes reallocations entirely.</p>`, followUps: ['Why might 1.5× be preferable to 2×?', 'What exception guarantee does push_back give, and how does move_if_noexcept relate?', 'What is the peak memory during a reallocation?'] },
    { q: 'What is iterator invalidation? Give the rules for vector, deque, list, map and unordered_map.', level: 'I', a: `<p>An iterator (or pointer/reference) is invalidated when the element it refers to moves or is destroyed; using it is undefined behaviour. <b>vector</b>: reallocation invalidates everything; otherwise insert/erase invalidate at and after the position. <b>deque</b>: insert at either end invalidates all iterators but keeps references valid; middle insert/erase invalidates everything; erasing at an end only invalidates the erased elements (plus end()). <b>list/forward_list</b>: only erased elements. <b>map/set</b>: only erased elements. <b>unordered_*</b>: a rehash invalidates all iterators but not references; erase invalidates only the erased element. Adapters have no iterators. The rules follow directly from memory layout: contiguous storage shifts and moves, node-based storage only rewires pointers.</p>`, followUps: ['How would you detect these bugs automatically?', 'Which containers give stable element addresses, and what do they cost?'] },
    { q: 'When would you choose <code>std::list</code> over <code>std::vector</code>? Most of the time, should you?', level: 'I', a: `<p>Choose list when you <b>already hold an iterator</b> to the insertion/erase point and need O(1) there, when elements must keep <b>stable addresses/iterators</b> across arbitrary inserts and erases, or when you need <b>splice</b> (moving nodes between lists without copying) — e.g. LRU/LFU caches, schedulers. Otherwise prefer vector: contiguous memory gives far better cache behaviour, so even O(n) middle inserts often beat the list once you count the O(n) pointer-chasing walk to find the position, plus the per-node allocation and ~24 bytes of overhead per element. Measure if in doubt.</p>`, followUps: ['How does a pool/pmr allocator change the trade-off?', 'What is an intrusive list and why do kernels use them?'] },
    { q: 'How is <code>std::deque</code> implemented, and how does it achieve O(1) random access?', level: 'I', a: `<p>A deque stores elements in fixed-size <b>blocks</b> (libstdc++: 512 bytes; libc++: 4096 bytes; MSVC: 16 bytes) plus a <b>map</b>, an array of pointers to those blocks with free slots at both ends. push_front/push_back write into the first/last block or allocate a new block and record its pointer in the map; when the map runs out of slots it is reallocated and recentred (copying pointers only). Element i is found by computing (offset of the first element + i) / blockSize for the block and % blockSize for the slot — two indirections, constant time. Elements never move on end insertions, hence stable references; iterators hold a map pointer and are invalidated when the map is reallocated.</p>`, followUps: ['Why does deque have no reserve() or data()?', 'When would a ring buffer be better?'] },
    { q: 'Why are <code>std::map</code> and <code>std::set</code> usually red-black trees? What guarantees do you get?', level: 'I', a: `<p>The standard requires O(log n) find/insert/erase, sorted iteration, and that insertions never invalidate iterators — a balanced, node-based search tree. Red-black trees fit well because they bound height to 2·log₂(n+1) while needing at most 2 rotations per insert and 3 per erase (the rest is recolouring), which is cheap for mutation-heavy workloads. AVL trees are more tightly balanced (faster lookups) but can rotate O(log n) times per update. You get guaranteed (not just average) logarithmic operations, ordered traversal, lower_bound/upper_bound, and iterator stability.</p>`, followUps: ['State the red-black invariants.', 'How do flat_map and B-tree maps compare?'] },
    { q: 'How does <code>std::unordered_map</code> work internally, and what are load factor and rehashing?', level: 'I', a: `<p>It is a hash table with separate chaining. A key is hashed with <code>std::hash</code> (identity for integers on GCC/Clang), reduced to a bucket index (libstdc++: modulo a prime bucket count), and the bucket's chain is searched with <code>==</code>. libstdc++ links all nodes into one singly linked list, with buckets pointing to the node before their first element. The <b>load factor</b> is size / bucket_count; when an insert would exceed <code>max_load_factor</code> (default 1.0), the table <b>rehashes</b> into roughly twice as many buckets, relinking every node — O(n) once, amortized O(1). Rehash invalidates iterators but not references. <code>reserve(n)</code> pre-sizes buckets to avoid it.</p>`, followUps: ['What makes the worst case O(n), and how do you defend against it?', 'Why are open-addressing tables like absl::flat_hash_map faster?'] },
    { q: 'How do you use a <code>std::pair</code> or a custom struct as a key in an <code>unordered_map</code>?', level: 'B', a: `<p>Provide a hash functor and equality. Equality: <code>operator==</code> (C++20 can default it). Hash: a struct with <code>size_t operator()(const Key&amp;) const noexcept</code>, passed as the third template argument. Combine field hashes well — e.g. pack two 32-bit ints into one 64-bit value and hash it, or use a boost-style <code>hash_combine</code> (<code>h ^= f + 0x9e3779b97f4a7c15 + (h &lt;&lt; 6) + (h &gt;&gt; 2)</code>). Avoid <code>h1 ^ h2</code>: it maps (a, b) and (b, a) to the same bucket and (x, x) to 0. Equal keys must hash equally; the reverse is not required.</p>`, followUps: ['Why must the hash be consistent with operator==?', 'What is heterogeneous (transparent) lookup?'] },
    { q: 'Explain the comparator semantics of <code>std::priority_queue</code>. How do you build a min-heap, and a heap of custom structs?', level: 'B', a: `<p>The comparator <code>cmp(a, b)</code> returns true when <b>a has lower priority than b</b> — a goes below b. The element that is "largest" under cmp is at <code>top()</code>. Default <code>std::less</code> → max-heap. <code>std::greater&lt;T&gt;</code> → min-heap: <code>priority_queue&lt;int, vector&lt;int&gt;, greater&lt;int&gt;&gt;</code>. For structs pass a functor or lambda type: <code>auto cmp = [](const Job&amp; a, const Job&amp; b){ return a.deadline &gt; b.deadline; };</code> gives earliest deadline first, declared as <code>priority_queue&lt;Job, vector&lt;Job&gt;, decltype(cmp)&gt; pq(cmp);</code>. Pairs also work out of the box because they compare lexicographically.</p>`, followUps: ['Why does pop() return void?', 'How do you "decrease a key" in Dijkstra with priority_queue?'] },
    { q: 'Design an LRU cache with O(1) get and put. Which containers and why?', level: 'I', a: `<p>A <code>std::list&lt;pair&lt;Key, Value&gt;&gt;</code> keeps recency order (front = most recent) and an <code>unordered_map&lt;Key, list::iterator&gt;</code> finds a node in O(1). On access, <code>splice</code> the node to the front: O(1), no allocation, and the stored iterator stays valid because list iterators are only invalidated when their own node is erased. On insert with a full cache, read the back node's key, erase it from the map, then <code>pop_back</code>. Storing the key inside the node is what makes eviction O(1). Thread safety needs a mutex around both structures (even get mutates order).</p>`, followUps: ['Extend it to LFU.', 'How would you shard it for high concurrency?', 'Why not a vector + hash map?'] },
    { q: 'What is the difference between <code>insert</code>, <code>emplace</code>, <code>try_emplace</code>, <code>insert_or_assign</code> and <code>operator[]</code> on a map?', level: 'I', a: `<p><b>insert(pair)</b> adds only if the key is absent (no overwrite) and returns <code>{iterator, bool}</code>. <b>emplace(args…)</b> constructs the pair in place — but may construct it even when the key exists (then discards it). <b>try_emplace(key, args…)</b> (C++17) constructs the value only if the key is absent, and never moves from <code>args</code> otherwise — ideal for expensive or move-only values. <b>insert_or_assign(key, v)</b> (C++17) inserts or overwrites and tells you which happened. <b>operator[]</b> default-constructs a missing value then returns a reference — requires a default-constructible V and a non-const map, and silently inserts on lookups.</p>`, followUps: ['Which of these work on a map with a non-default-constructible value type?', 'How do node handles (extract) change a key without reallocation?'] },
    { q: 'What happens when a comparator is not a strict weak ordering, e.g. <code>a &lt;= b</code> in a <code>std::set</code>?', level: 'A', a: `<p>Associative containers decide equivalence as <code>!cmp(a,b) &amp;&amp; !cmp(b,a)</code>. With <code>&lt;=</code>, cmp(x, x) is true, so no element is ever equivalent to itself: duplicates get inserted, <code>find</code> and <code>count</code> fail to locate keys that are present, and <code>erase</code> misses them. Formally it is undefined behaviour; in practice debug standard libraries (<code>_GLIBCXX_DEBUG</code>, MSVC debug) assert, and std::sort with such a comparator can read out of bounds and crash. Other ways to break it: inconsistent multi-field comparisons, comparing floats with NaN, or comparing mutable state that changes while the element is in the container.</p>`, followUps: ['Write a correct comparator for (priority desc, name asc).', 'Why is a key\'s comparison-relevant state immutable inside a set?'] },
    { q: 'Your solution using <code>unordered_map&lt;long long,int&gt;</code> got TLE on Codeforces after being hacked, while <code>map</code> passes. Why, and how do you fix it?', level: 'A', a: `<p>GCC's <code>std::hash&lt;long long&gt;</code> is the identity and libstdc++ uses a known sequence of prime bucket counts, so an attacker can submit keys that are all congruent modulo those primes. Every key lands in one bucket, chains become O(n) long, and n operations cost O(n²). Fixes: a randomized, well-mixing hash such as <b>splitmix64</b> seeded from <code>chrono::steady_clock</code> at startup; or fall back to <code>std::map</code> (guaranteed O(log n)); or a different table such as <code>__gnu_pbds::gp_hash_table</code> with a custom hash. In services the same issue is "hash flooding" DoS, which is why languages use seeded SipHash for strings.</p>`, followUps: ['Why does reserve() not save you here?', 'Write splitmix64 from memory.'] },
    { q: 'Compare <code>std::map</code>, <code>std::unordered_map</code> and C++23 <code>std::flat_map</code>.', level: 'A', a: `<p><b>map</b>: red-black tree; O(log n) everything, sorted order, range queries, stable iterators, ~40–50 bytes overhead per node and cache-unfriendly lookups. <b>unordered_map</b>: hash table; O(1) average find/insert/erase, no order, worst case O(n), rehash invalidates iterators, needs a hash. <b>flat_map</b>: an adaptor over two sorted vectors (keys and values); O(log n) lookup by binary search over contiguous memory — typically much faster than map for lookups and iteration and far smaller — but O(n) insert/erase and vector-like iterator invalidation. Choose map for ordered + frequently mutated, unordered_map for fast unordered lookups, flat_map for build-once/read-many or small tables.</p>`, followUps: ['When would absl::btree_map beat std::map?', 'How does memory overhead per element compare?'] },
    { q: 'Implement <code>getRandom()</code> in O(1) for a set that also supports O(1) insert and delete. Which STL containers do you combine and what is the key trick?', level: 'I', a: `<p>Combine a <code>vector&lt;T&gt;</code> (contiguous → pick a random index in O(1)) with an <code>unordered_map&lt;T, size_t&gt;</code> from value to its index (O(1) find). The trick is <b>delete by swap-with-back</b>: move the last element into the deleted slot, update the moved element's index in the map, <code>pop_back</code>, then erase the deleted value from the map — so no element shifts and order (irrelevant for a set) is the only thing lost. Edge case: deleting the last element itself (update before erase). Randomness should come from <code>std::mt19937</code> with <code>uniform_int_distribution</code>, not <code>rand() % n</code>.</p>`, followUps: ['Allow duplicates.', 'Make getRandom weighted.'] }
  );

  registerModule({
    id: 'cpp07',
    title: 'STL Containers',
    lang: 'cpp',
    intro: `<p>Almost every C++ interview answer — and almost every real C++ program — is built from a handful of standard containers. This module opens each one up: <b>vector</b> (capacity, growth, reallocation), <b>deque</b> (blocks + a map of pointers), <b>list</b> (nodes and <code>splice</code>), <b>set/map</b> (red-black trees), <b>unordered_set/unordered_map</b> (buckets, load factor, rehash, custom and hack-proof hashes), <b>priority_queue</b> (a binary heap in a vector) and the <b>stack/queue</b> adapters.</p>
<p>For each container you will see what it looks like in memory (with step-by-step visualizers), what each operation really costs, and — the part interviewers love — <b>which iterators, pointers and references survive</b> each operation. You will practise picking the right container from a problem's wording, hunting iterator-invalidation bugs, and solving classic DSA problems (LRU, sliding window max/median, top-k, calendars, two heaps) the idiomatic STL way.</p>`,
    goals: [
      'Explain vector growth, amortized O(1) push_back, reserve vs resize, and predict exactly when pointers/iterators become dangling',
      'State the iterator-invalidation rules for vector, deque, list, map/set and unordered containers — and fix erase-in-loop and dangling-reference bugs',
      'Describe the internals of deque (blocks + map), list (nodes, splice), map/set (red-black tree) and unordered_map (buckets, load factor, rehash)',
      'Use lower_bound/upper_bound, multiset, custom comparators (strict weak ordering) and custom/safe hash functions correctly',
      'Build min-heaps, max-heaps and custom-priority heaps with the right comparator direction, and apply them to top-k, k-way merge, Dijkstra and two-heap median',
      'Choose and justify the right container (or combination) for a design question in under a minute'
    ],
    prereqs: `C++ 3 (Pointers &amp; References), C++ 5 (Advanced OOP: Rule of 3/5/0 — copy vs move), C++ 6 (Memory Management, RAII &amp; Smart Pointers). Helpful: DSA basics of Big-O, hashing, binary search trees and heaps.`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
