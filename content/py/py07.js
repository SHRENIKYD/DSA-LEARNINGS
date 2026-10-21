(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared visualizer helpers (py07) ---------- */
  // Code part with any number of highlighted lines: hlMap = {line: cls}
  function cpm(code, hlMap, label) {
    return { type: 'code', label: label || 'Python code (current line highlighted)', lang: 'python', code: code, hl: hlMap || {} };
  }
  // Code part with one highlighted line.
  function cp(code, line, cls, label) {
    var hl = {};
    if (line) hl[line] = cls || 'cur';
    return cpm(code, hl, label);
  }
  // Vars part; hlKeys = 'a,b'
  function vp(obj, hlKeys, cls, label) {
    var vals = {}, hl = {};
    Object.keys(obj).forEach(function (k) { vals[k] = String(obj[k]); });
    if (hlKeys) String(hlKeys).split(',').forEach(function (k) { hl[k] = cls || 'ok'; });
    return { type: 'vars', label: label || 'Variables', vals: vals, hl: hl };
  }
  function tx(html, label) { return { type: 'text', label: label, html: html }; }
  function fr(narr, parts) { return { narr: narr, parts: parts }; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function words(s) { return String(s).trim().split(/[\s,]+/).filter(function (x) { return x.length; }); }
  function nums(s, max) {
    var a = words(s).map(Number);
    if (!a.length || a.some(function (x) { return isNaN(x); })) throw new Error('Enter numbers separated by spaces, e.g. 3 1 4 1 5');
    if (a.length > (max || 12)) throw new Error('Use at most ' + (max || 12) + ' numbers');
    return a;
  }
  function pyrep(v) { return typeof v === 'string' ? "'" + v + "'" : String(v); }
  function outBox(lines) { return tx(lines.length ? '<pre>' + lines.map(esc).join('\n') + '</pre>' : '<i>(nothing printed yet)</i>', 'Printed output'); }

  /* ================= TOPIC 1: Iterable vs Iterator ================= */
  topics.push({
    title: 'Iterables vs Iterators: The Protocol Behind Every for Loop',
    analogy: `<p>Think of a <b>book</b> and a <b>bookmark</b>. The book (the <b>iterable</b>) holds all the pages. A bookmark (the <b>iterator</b>) remembers <i>where you are</i>. Many friends can read the same book at the same time, each with their own bookmark. A bookmark can only move forward, and once it reaches the last page it is "used up" — you need a <b>new bookmark</b> to read again. That is the whole iterator protocol.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Python's <code>for</code> loop works on lists, strings, dicts, files, ranges, sets… even your own classes. It can do that because all of them follow one tiny agreement called the <b>iterator protocol</b>:</p>
<ul>
<li>An <b>iterable</b> is anything you can ask for an iterator: it has <code>__iter__()</code> (the built-in <code>iter(x)</code> calls it). Lists, strings, dicts, sets, tuples, ranges and files are iterables.</li>
<li>An <b>iterator</b> is the "bookmark": it has <code>__next__()</code> (the built-in <code>next(it)</code> calls it) which returns the next item, or raises <code>StopIteration</code> when nothing is left. An iterator also has <code>__iter__()</code> that simply returns <code>self</code>, so iterators are iterables too.</li>
</ul>
<p>🔵 <b>What a for loop really does.</b> This loop…</p>
<pre>for x in fruits:
    print(x)</pre>
<p>…is run by Python almost exactly like this:</p>
<pre>it = iter(fruits)          # 1. get a fresh bookmark
while True:
    try:
        x = next(it)       # 2. move the bookmark, get an item
    except StopIteration:  # 3. no more items → stop quietly
        break
    print(x)               # 4. run the loop body</pre>
${H.table(['Thing', 'Has __iter__?', 'Has __next__?', 'Re-usable?', 'Examples'], [['Iterable', '✅', '❌ (usually)', '✅ gives a fresh iterator each time', '<code>list</code>, <code>str</code>, <code>dict</code>, <code>range</code>'], ['Iterator', '✅ (returns self)', '✅', '❌ one pass only', '<code>iter([1,2])</code>, generators, <code>map</code>, <code>zip</code>, <code>enumerate</code>, file objects']])}
<p><b>Exhaustion — the #1 gotcha.</b> An iterator remembers its position and never rewinds. After it raises <code>StopIteration</code> once, it keeps raising it forever:</p>
<pre>it = iter([1, 2, 3])
print(list(it))   # [1, 2, 3]
print(list(it))   # []   ← bookmark already at the end</pre>
<p>This bites people with <code>map</code>, <code>zip</code>, <code>filter</code>, generators and open files, because those are all <b>iterators</b>, not lists.</p>
<p><b>Handy tools:</b> <code>next(it, default)</code> returns <code>default</code> instead of raising; <code>iter(callable, sentinel)</code> keeps calling a function until it returns the sentinel (great for reading fixed-size chunks); <code>isinstance(x, collections.abc.Iterator)</code> tells you if something is a one-shot iterator.</p>
<p><b>Writing your own.</b> Split responsibilities like the book and the bookmark: the container class's <code>__iter__</code> returns a <b>new</b> iterator object each time, and that iterator class holds the position and implements <code>__next__</code>. (Or — much easier — make <code>__iter__</code> a generator, which you will meet in the next topic.)</p>`,
    clues: [
      '"make my class work in a for loop" / "make it iterable" → implement <code>__iter__</code> (often as a generator)',
      '"design an iterator with next() and hasNext()" (e.g. BST Iterator, Flatten Nested List Iterator) → the iterator protocol, keep the state in the object',
      '"the second loop prints nothing" / "zip/map result empty the second time" → iterator exhaustion; materialise with <code>list()</code> or call the function again',
      '"read a file/socket in fixed-size chunks until empty" → <code>iter(lambda: f.read(4096), b\'\')</code> (two-argument iter)',
      '"get the first item that matches, or a default" → <code>next((x for x in xs if cond(x)), None)</code>',
      '"what does a for loop do under the hood?" → iter() once, next() repeatedly, StopIteration ends it'
    ],
    code: [{ lang: 'python', run: true, title: 'A reusable iterable + its iterator (book + bookmark)', code: `class Countdown:
    """The ITERABLE (the book): it only knows the starting number."""
    def __init__(self, start):
        self.start = start

    def __iter__(self):
        # Hand out a NEW bookmark every time someone loops.
        return CountdownIterator(self.start)


class CountdownIterator:
    """The ITERATOR (the bookmark): it remembers where we are."""
    def __init__(self, current):
        self.current = current

    def __iter__(self):
        return self              # iterators are iterable: they return themselves

    def __next__(self):
        if self.current <= 0:
            raise StopIteration  # signal: no more items
        value = self.current
        self.current -= 1
        return value


c = Countdown(3)
print(list(c))          # [3, 2, 1]
print(list(c))          # [3, 2, 1]  <- works again: fresh iterator each time

it = iter(c)            # one explicit bookmark
print(next(it), next(it))   # 3 2
print(list(it))         # [1]  <- continues from where it stopped
print(next(it, 'done')) # 'done' instead of StopIteration` }, { lang: 'python', run: true, title: 'Manual for-loop: what Python really runs', code: `fruits = ['apple', 'banana', 'cherry']

it = iter(fruits)            # step 1: ask the iterable for an iterator
while True:
    try:
        x = next(it)         # step 2: ask the iterator for the next item
    except StopIteration:    # step 3: iterator is empty -> leave the loop
        break
    print('got', x)          # step 4: the loop body

print(type(it).__name__)     # list_iterator
print(next(it, 'exhausted')) # stays exhausted forever` }],
    codeTitle: ['Iterable class + iterator class', 'for loop desugared'],
    viz: [{
      title: 'A for loop, desugared: iter() once, next() until StopIteration',
      input: 'apple banana cherry',
      inputLabel: 'Items in the list (space separated, max 6)',
      gen: function (input) {
        var items = words(input);
        if (!items.length) throw new Error('Type a few words, e.g. apple banana cherry');
        if (items.length > 6) throw new Error('Use at most 6 items');
        var code = ['fruits = [' + items.map(pyrep).join(', ') + ']', 'it = iter(fruits)', 'while True:', '    try:', '        x = next(it)', '    except StopIteration:', '        break', '    print(x)'].join('\n');
        var frames = [], out = [];
        function arrPart(pos, cls) {
          var hl = {}, ptr = {};
          for (var k = 0; k < pos && k < items.length; k++) hl[k] = 'done';
          if (pos < items.length) { ptr[pos] = 'next'; if (cls) hl[pos] = cls; }
          return { type: 'array', label: 'fruits (the iterable — never changes)', values: items.slice(), hl: hl, ptr: ptr, showIdx: true };
        }
        frames.push(fr('<b>for x in fruits</b> is really this <code>while</code> loop. First, the list is created. A list is an <b>iterable</b>: it can hand out iterators, but it has no "current position" itself.', [cp(code, 1), arrPart(-1), vp({ fruits: 'list of ' + items.length }, 'fruits'), outBox(out)]));
        frames.push(fr('<code>iter(fruits)</code> calls <code>fruits.__iter__()</code> and returns a brand-new <b>list_iterator</b> — the bookmark. It starts at index 0. This happens <b>once</b> per loop.', [cp(code, 2), arrPart(0), vp({ fruits: 'list of ' + items.length, it: 'list_iterator(index=0)' }, 'it'), outBox(out)]));
        for (var i = 0; i < items.length; i++) {
          frames.push(fr('<code>next(it)</code> calls <code>it.__next__()</code>: it returns item ' + i + ' (<b>' + esc(pyrep(items[i])) + '</b>) and moves the bookmark to index ' + (i + 1) + '.', [cp(code, 5), arrPart(i, 'cur'), vp({ fruits: 'list of ' + items.length, it: 'list_iterator(index=' + (i + 1) + ')', x: pyrep(items[i]) }, 'x,it'), outBox(out)]));
          out.push(items[i]);
          frames.push(fr('The loop body runs with <code>x = ' + esc(pyrep(items[i])) + '</code>. Then we jump back to the top of <code>while True</code>.', [cp(code, 8, 'ok'), arrPart(i + 1), vp({ fruits: 'list of ' + items.length, it: 'list_iterator(index=' + (i + 1) + ')', x: pyrep(items[i]) }), outBox(out)]));
        }
        frames.push(fr('<code>next(it)</code> again — but the bookmark is past the end. <code>__next__</code> raises <span class="c-r">StopIteration</span>. That exception is not an error here: it is the <b>"I am empty" signal</b>.', [cpm(code, { 5: 'bad', 6: 'cur' }), arrPart(items.length), vp({ it: 'list_iterator(exhausted)', x: pyrep(items[items.length - 1]) }, 'it', 'bad'), outBox(out)]));
        frames.push(fr('<code>except StopIteration: break</code> — the loop ends quietly. Notice <code>x</code> still holds the last value (loop variables leak out of a for loop in Python).', [cp(code, 7, 'sel'), arrPart(items.length), vp({ it: 'list_iterator(exhausted)', x: pyrep(items[items.length - 1]) }, 'x', 'sel'), outBox(out)]));
        frames.push(fr('If you call <code>next(it)</code> again it raises StopIteration again — an exhausted iterator <b>never rewinds</b>. To loop again, Python just calls <code>iter(fruits)</code> again and gets a <b>fresh</b> bookmark. That is why lists can be looped many times but iterators only once.', [arrPart(items.length), tx('<code>next(it)</code> → <span class="c-r">StopIteration</span> (again)<br><code>next(it, \'done\')</code> → <span class="c-g">\'done\'</span><br><code>iter(fruits)</code> → <span class="c-g">new list_iterator(index=0)</span>', 'After the loop'), outBox(out)]));
        return frames;
      }
    }, {
      title: 'Iterable vs iterator: why the second loop is empty',
      gen: function () {
        var code = ['nums = [1, 2, 3]', 'sq = map(lambda n: n * n, nums)   # an ITERATOR', 'print(sum(nums), sum(nums))       # list: fresh iterator each time', 'print(sum(sq))                    # consumes sq', 'print(sum(sq))                    # sq is already exhausted'].join('\n');
        return [
          fr('<code>nums</code> is a list (iterable). <code>map(...)</code> does <b>not</b> compute anything yet — it returns a lazy <b>map iterator</b> that will square items on demand.', [cpm(code, { 1: 'ok', 2: 'cur' }), vp({ nums: '[1, 2, 3]', sq: '&lt;map iterator, position 0&gt;' }, 'sq'), outBox([])]),
          fr('<code>sum(nums)</code> twice: each call does <code>iter(nums)</code> and gets its <b>own</b> bookmark, so both see 1+2+3 = 6.', [cp(code, 3), { type: 'array', label: 'nums', values: [1, 2, 3], hl: { 0: 'ok', 1: 'ok', 2: 'ok' } }, outBox(['6 6'])]),
          fr('<code>sum(sq)</code>: <code>iter(sq)</code> returns <b>sq itself</b> (iterators return self). sum pulls 1, 4, 9 → 14. The map iterator is now at the end.', [cp(code, 4), { type: 'array', label: 'values pulled out of sq', values: [1, 4, 9], hl: { 0: 'done', 1: 'done', 2: 'done' } }, vp({ sq: '&lt;map iterator, EXHAUSTED&gt;' }, 'sq', 'bad'), outBox(['6 6', '14'])]),
          fr('<code>sum(sq)</code> again: <code>iter(sq)</code> is still the same exhausted object, first <code>next()</code> raises StopIteration, sum of nothing = <span class="c-r">0</span>. No error, just a silently wrong answer — a classic bug.', [cp(code, 5, 'bad'), vp({ sq: '&lt;map iterator, EXHAUSTED&gt;' }, 'sq', 'bad'), outBox(['6 6', '14', '0'])]),
          fr('<b>Fixes:</b> (1) <code>sq = list(map(...))</code> if you need several passes and it fits in memory; (2) recreate the iterator each time; (3) use <code>itertools.tee</code> for two lock-step passes; (4) compute everything in <b>one pass</b>.', [tx('<code>sq = [n * n for n in nums]</code> → re-loopable list<br><code>def squares(): return map(lambda n: n*n, nums)</code> → fresh iterator per call<br><code>a, b = itertools.tee(sq)</code> → two independent iterators', 'How to fix it'), outBox(['6 6', '14', '14 (after fix)'])])
        ];
      }
    }],
    examples: [
      { title: 'Predict the output: one bookmark shared by two readers', html: `<p>Both <code>zip</code> arguments are the <b>same</b> iterator, so zip pulls alternately from one bookmark. This is a famous trick for pairing up items: <code>zip(it, it)</code> → pairs.</p>${H.arr([1, 2, 3, 4, 5, 6], { label: 'it', hl: { 0: 'g', 1: 'b', 2: 'g', 3: 'b', 4: 'g', 5: 'b' } })}<p>Output: <code>[(1, 2), (3, 4), (5, 6)]</code>. With <code>zip(nums, nums)</code> (a list) you would get <code>[(1, 1), (2, 2), …]</code> because each argument gets its own fresh iterator.</p>`, code: { lang: 'python', run: true, code: `nums = [1, 2, 3, 4, 5, 6]
it = iter(nums)
print(list(zip(it, it)))       # [(1, 2), (3, 4), (5, 6)]
print(list(zip(nums, nums)))   # [(1, 1), (2, 2), ...] - two separate iterators` } },
      { title: 'Predict the output: "in" consumes an iterator', html: `<p>Membership testing on an iterator has to <b>walk</b> it, and the walk is not undone. After <code>3 in it</code> finds 3, the bookmark sits just after 3.</p>${H.table(['Expression', 'Result', 'Why'], [['<code>3 in it</code>', 'True', 'consumed 1, 2, 3'], ['<code>list(it)</code>', '[4, 5]', 'only what is left'], ['<code>3 in it</code>', 'False', 'exhausted — walked nothing']])}`, code: { lang: 'python', run: true, code: `it = iter([1, 2, 3, 4, 5])
print(3 in it)     # True  (walks 1, 2, 3)
print(list(it))    # [4, 5]
print(3 in it)     # False (nothing left to walk)` } },
      { title: 'Two-argument iter(): read until a sentinel', html: `<p><code>iter(func, sentinel)</code> calls <code>func()</code> again and again and stops when the result equals <code>sentinel</code>. Perfect for "read chunks until empty" or "pop from a queue until None". Here we simulate reading 4-byte chunks from an in-memory file.</p>`, code: { lang: 'python', run: true, code: `import io
from functools import partial

f = io.BytesIO(b'hello iterator world')
# partial(f.read, 4) is a function that reads 4 bytes each call.
for chunk in iter(partial(f.read, 4), b''):   # stop when read() returns b''
    print(chunk)` } },
      { title: 'Checking what you have: Iterable vs Iterator ABCs', html: `<p><code>collections.abc</code> lets you ask "is this one-shot?". A list is Iterable but not an Iterator; a generator, a file, <code>map</code>, <code>zip</code>, <code>enumerate</code> are both. Rule of thumb: <b>if <code>iter(x) is x</code>, it is a one-pass iterator.</b></p>`, code: { lang: 'python', run: true, code: `from collections.abc import Iterable, Iterator

things = {'list': [1, 2], 'range': range(3), 'map': map(str, [1]), 'gen': (i for i in 'ab'), 'dict': {'a': 1}}
for name, obj in things.items():
    print(f"{name:6} iterable={isinstance(obj, Iterable)!s:5} "
          f"iterator={isinstance(obj, Iterator)!s:5} one_shot={iter(obj) is obj}")` } },
      { title: 'The old __getitem__ fallback protocol', html: `<p>Before <code>__iter__</code> existed, Python looped over objects with <code>__getitem__(0)</code>, <code>__getitem__(1)</code>, … until <code>IndexError</code>. That fallback <b>still works</b>, which is why some classes are loopable without <code>__iter__</code>. But <code>isinstance(x, Iterable)</code> returns False for them — the only reliable test is to call <code>iter(x)</code> and catch <code>TypeError</code>.</p>`, code: { lang: 'python', run: true, code: `class Squares:
    def __getitem__(self, i):
        if i >= 4:
            raise IndexError   # tells the old protocol to stop
        return i * i

print(list(Squares()))          # [0, 1, 4, 9]
from collections.abc import Iterable
print(isinstance(Squares(), Iterable))   # False, yet it IS loopable` } }
    ],
    deepDive: `<p>🟣 <b>Under the hood.</b> At the C level every type has two slots: <code>tp_iter</code> (backs <code>__iter__</code>) and <code>tp_iternext</code> (backs <code>__next__</code>). A <code>for</code> loop compiles to the bytecodes <code>GET_ITER</code> (call <code>iter()</code> once) and <code>FOR_ITER</code> (call <code>tp_iternext</code>; on exhaustion jump past the loop). For built-in iterators, CPython does not even create a <code>StopIteration</code> object — <code>tp_iternext</code> just returns NULL with no exception set, which is much cheaper. That is why for loops over lists are fast while a manual <code>try/next/except</code> loop is slower.</p>
<p><b>Mutating while iterating.</b> A <code>list_iterator</code> is just "a reference to the list + an index". If you delete items during the loop, the index skips elements (classic "remove evens" bug). Dicts and sets are stricter: changing their <i>size</i> during iteration raises <code>RuntimeError: dictionary changed size during iteration</code>. Iterate over a copy (<code>list(d)</code>) or build a new container instead.</p>
<p><b>The iterator contract.</b> Once <code>__next__</code> has raised <code>StopIteration</code>, it should keep raising it ("an exhausted iterator stays exhausted"). Iterators should return <code>self</code> from <code>__iter__</code>; containers should <b>not</b> return self (otherwise they become one-shot, like files). <code>len()</code> is not part of the protocol — iterators can be infinite — but <code>__length_hint__</code> (PEP 424) lets <code>list()</code> pre-size its buffer.</p>
<p><b>Performance.</b> Iterators are O(1) memory: <code>sum(range(10**9))</code> never builds a billion-element list. In production this is what lets you stream multi-GB files, database cursors (DB-API cursors are iterators) and paginated API results with flat memory. The trade-off: no random access, no <code>len()</code>, single pass — design your APIs to say clearly whether they return a list or an iterator.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants write <code>__iter__</code>/<code>__next__</code> boilerplate instantly, so nobody is impressed you can type it. What still separates engineers is <b>spotting exhaustion bugs</b> — the AI-generated code that calls <code>sum(gen)</code> then <code>max(gen)</code> and silently gets an error or 0.</p>
<p><b>Use AI as a partner:</b> ask <code>"List every place in this file where an iterator is consumed more than once"</code> or <code>"Is the return value of this function an iterator or a list? Who consumes it?"</code>. LLM code-review bots are good at flagging this when prompted explicitly.</p>
<p><b>Where AI goes wrong:</b> it often makes a container's <code>__iter__</code> return <code>self</code> (one-shot by accident), forgets that <code>zip</code>/<code>map</code> are lazy when "converting" Python 2 code, and mutates a dict while looping over it. LLM streaming APIs (OpenAI/Anthropic SDK <code>stream</code> objects) are iterators too — iterating them twice is a common bug in AI apps.</p>
<p><b>What you must own:</b> the mental model "iterable = book, iterator = bookmark", the exact for-loop desugaring, and the ability to say in an interview whether a function's result can be looped twice.</p>`,
    problems: [{
      title: 'Build a Reusable Range-like Iterable', level: 'Easy', tags: ['iterator protocol', 'class design'], companies: ['Google', 'Amazon', 'Bloomberg'],
      statement: `<p>Write a class <code>StepRange(start, stop, step)</code> that behaves like a simplified <code>range</code> for positive <code>step</code>: <code>list(StepRange(2, 11, 3))</code> → <code>[2, 5, 8]</code>. It must be <b>re-iterable</b> (looping twice gives the same items) and two simultaneous loops over the same object must not interfere. Do not build a list inside the class.</p>`,
      constraints: `0 ≤ start, stop ≤ 10<sup>12</sup>, 1 ≤ step ≤ 10<sup>9</sup>. Memory must stay O(1) regardless of the size.`,
      example: `<p><code>r = StepRange(2, 11, 3)</code> → ${H.arr([2, 5, 8], { hl: { 0: 'g', 1: 'g', 2: 'g' } })} <code>list(r)</code> twice → <code>[2, 5, 8]</code> both times. Nested loops <code>[(a, b) for a in r for b in r]</code> give 9 pairs because each loop has its own iterator. 11 is excluded (stop is exclusive).</p>`,
      brute: { why: `<p>Store <code>list(range(...))</code>-style data in <code>__init__</code> and return <code>iter(self.items)</code>. It "works", but for <code>StepRange(0, 10**12, 1)</code> it needs terabytes of RAM — the wasted work is materialising values nobody may ever read.</p>`, code: `class StepRange:
    def __init__(self, start, stop, step):
        self.items = []
        x = start
        while x < stop:          # builds EVERYTHING up front: O(n) memory
            self.items.append(x)
            x += step

    def __iter__(self):
        return iter(self.items)

print(list(StepRange(2, 11, 3)))` },
      mcq: { q: 'Where should the "current position" live so that two nested loops over the same StepRange do not interfere?', options: ['In a separate iterator object created by each __iter__ call', 'In the StepRange object itself (self.current)', 'In a global variable', 'In a class attribute'], answer: 0, explain: 'Each loop calls iter() once. If __iter__ returns a NEW iterator holding its own position, the loops are independent. Storing the position on self makes the object one-shot and nested loops break.' },
      hints: [`<p>Hint 1: Book vs bookmark — <code>StepRange</code> is the book; it should only store start/stop/step.</p>`, `<p>Hint 2: <code>__iter__</code> must return a new object each call. The quickest way: make <code>__iter__</code> a generator function (it contains <code>yield</code>), which returns a fresh generator every call.</p>`, `<p>Hint 3: Recipe: <code>x = start; while x &lt; stop: yield x; x += step</code>. Edge cases: start ≥ stop → empty; huge stop → still O(1) memory. Bonus: add <code>__len__</code> with ceil division <code>max(0, (stop - start + step - 1) // step)</code>.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_val',
        cases: [
          [['(lambda r: [list(r), list(r), len(r)])(StepRange(2, 11, 3))'], [[2, 5, 8], [2, 5, 8], 3]],
          [['(lambda r: [list(r), list(r), len(r)])(StepRangeGen(2, 11, 3))'], [[2, 5, 8], [2, 5, 8], 3]],
          [['(lambda r: [list(r), list(r), len(r)])(StepRange(0, 0, 1))'], [[], [], 0]],
          [['(lambda r: [list(r), list(r), len(r)])(StepRangeGen(0, 0, 1))'], [[], [], 0]],
          [['(lambda r: [list(r), list(r), len(r)])(StepRange(5, 5, 1))'], [[], [], 0]],
          [['(lambda r: [list(r), list(r), len(r)])(StepRangeGen(5, 5, 1))'], [[], [], 0]],
          [['(lambda r: [list(r), list(r), len(r)])(StepRange(10, 5, 3))'], [[], [], 0]],
          [['(lambda r: [list(r), list(r), len(r)])(StepRangeGen(10, 5, 3))'], [[], [], 0]],
          [['(lambda r: [list(r), list(r), len(r)])(StepRange(0, 5, 10))'], [[0], [0], 1]],
          [['(lambda r: [list(r), list(r), len(r)])(StepRangeGen(0, 5, 10))'], [[0], [0], 1]],
          [['(lambda r: [list(r), list(r), len(r)])(StepRange(0, 10, 3))'], [[0, 3, 6, 9], [0, 3, 6, 9], 4]],
          [
            ['(lambda r: [list(r), list(r), len(r)])(StepRangeGen(0, 10, 3))'],
            [[0, 3, 6, 9], [0, 3, 6, 9], 4]
          ],
          [
            ['(lambda r: [list(r), list(r), len(r)])(StepRange(-5, 5, 2))'],
            [[-5, -3, -1, 1, 3], [-5, -3, -1, 1, 3], 5]
          ],
          [
            ['(lambda r: [list(r), list(r), len(r)])(StepRangeGen(-5, 5, 2))'],
            [[-5, -3, -1, 1, 3], [-5, -3, -1, 1, 3], 5]
          ],
          [['(lambda r: [list(r), list(r), len(r)])(StepRange(0, 1, 1))'], [[0], [0], 1]],
          [['(lambda r: [list(r), list(r), len(r)])(StepRangeGen(0, 1, 1))'], [[0], [0], 1]],
          [
            ['(lambda r: [list(r), list(r), len(r)])(StepRange(0, 100, 7))'],
            [
              [0, 7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 91, 98],
              [0, 7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 91, 98],
              15
            ]
          ],
          [
            ['(lambda r: [list(r), list(r), len(r)])(StepRangeGen(0, 100, 7))'],
            [
              [0, 7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 91, 98],
              [0, 7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 91, 98],
              15
            ]
          ],
          [['(lambda r: [list(r), list(r), len(r)])(StepRange(3, 4, 1000000000))'], [[3], [3], 1]],
          [['(lambda r: [list(r), list(r), len(r)])(StepRangeGen(3, 4, 1000000000))'], [[3], [3], 1]],
          [['len([(a, b) for r in [StepRange(2, 11, 3)] for a in r for b in r])'], 9],
          [
            ['(lambda r: (lambda i, j: [next(i), next(i), next(j)])(iter(r), iter(r)))(StepRange(2, 11, 3))'],
            [2, 5, 2]
          ],
          [['(lambda r: [next(i) for i in [iter(r)]])(StepRange(0, 10**12))'], [0]],
          [['len(StepRange(0, 10**12))'], 1000000000000],
          [['len(StepRange(0, 10**12, 10**9))'], 1000],
          [['list(StepRange(2, 11))'], [2, 3, 4, 5, 6, 7, 8, 9, 10]],
          [['StepRange(0, 5, 0)'], '!ValueError'],
          [['StepRange(0, 5, -1)'], '!ValueError'],
          [['sum(StepRange(0, 10**6, 1))'], 499999500000],
          [['sum(StepRangeGen(0, 10**6, 3))'], 166666833333],
          [['(lambda r: [list(r), list(r)])(StepRangeGen(2, 11, 3))'], [[2, 5, 8], [2, 5, 8]]],
          [['(lambda r: [r.start, r.stop, r.step])(StepRange(4, 9, 2))'], [4, 9, 2]]
        ],
        harness: {
          python: 'def t_val(src):\n' +
            '    try:\n' +
            '        return eval(src)\n' +
            '    except Exception as e:\n' +
            '        return \'!\' + type(e).__name__'
        }
      },
      solution: {
        approach: `<p>Keep only the three numbers. Return a fresh iterator from <code>__iter__</code>. We show both styles: an explicit iterator class (what interviewers want to see you understand) and a generator-based <code>__iter__</code> (what you would write in production). <code>__len__</code> is O(1) maths.</p>`,
        code: { lang: 'python', run: true, code: `class StepRangeIterator:
    """The bookmark: holds the position for ONE loop."""
    def __init__(self, current, stop, step):
        self.current, self.stop, self.step = current, stop, step

    def __iter__(self):
        return self

    def __next__(self):
        if self.current >= self.stop:
            raise StopIteration
        value = self.current
        self.current += self.step
        return value


class StepRange:
    """The book: only start/stop/step, O(1) memory."""
    def __init__(self, start, stop, step=1):
        if step <= 0:
            raise ValueError('step must be positive')
        self.start, self.stop, self.step = start, stop, step

    def __iter__(self):
        return StepRangeIterator(self.start, self.stop, self.step)

    def __len__(self):
        return max(0, (self.stop - self.start + self.step - 1) // self.step)


class StepRangeGen(StepRange):
    """Same thing, production style: a generator as __iter__."""
    def __iter__(self):
        x = self.start
        while x < self.stop:
            yield x
            x += self.step


r = StepRange(2, 11, 3)
print(list(r), list(r), len(r))            # [2, 5, 8] [2, 5, 8] 3
print(len([(a, b) for a in r for b in r]))  # 9 -> independent iterators
print(list(StepRangeGen(2, 11, 3)))         # [2, 5, 8]
big = StepRange(0, 10**12)
print(len(big), next(iter(big)))            # 1000000000000 0 (no memory used)` },
        dry: { head: ['call', 'iterator.current before', 'returns', 'current after'], rows: [['iter(r)', '—', 'new iterator', '2'], ['next()', '2', '2', '5'], ['next()', '5', '5', '8'], ['next()', '8', '8', '11'], ['next()', '11 (≥ stop)', '<span class="c-r">StopIteration</span>', '11']] },
        complexity: `<p>Each <code>next()</code> is O(1); memory O(1) per iterator. <code>len()</code> O(1).</p>`,
        followUps: ['Support negative steps (count down) — what changes in the stop test?', 'Add __contains__ in O(1) using modular arithmetic (like the real range does).', 'Add __getitem__ with slicing that returns another StepRange.']
      }
    }]
  });

  /* ================= TOPIC 2: Generators & yield ================= */
  topics.push({
    title: 'Generators & yield: Functions That Pause and Resume',
    analogy: `<p>A normal function is like a <b>vending machine</b>: press the button, it does all its work, hands you one thing, and forgets everything. A generator is like a <b>storyteller who pauses</b>: "…and the dragon flew off. <i>(pause)</i>" When you say "go on", they continue <b>exactly</b> from that sentence, remembering every character and detail. <code>yield</code> is the pause; <code>next()</code> is "go on".</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Any function that contains the word <code>yield</code> becomes a <b>generator function</b>. Calling it does <b>not</b> run its body — it returns a <b>generator object</b>, which is an iterator. Each <code>next()</code> runs the body until the next <code>yield</code>, hands that value out, and <b>freezes</b> the function right there — local variables, the current line, everything. The next <code>next()</code> thaws it and continues from the line after the <code>yield</code>.</p>
<pre>def countdown(n):
    print('start')
    while n &gt; 0:
        yield n        # hand out n, then pause here
        n -= 1
    print('done')      # falling off the end → StopIteration

g = countdown(2)       # nothing printed yet! body has not started
next(g)  # prints 'start', returns 2
next(g)  # resumes at n -= 1, returns 1
next(g)  # prints 'done', raises StopIteration</pre>
<p><b>Why it matters — laziness.</b> A generator produces values <b>one at a time, on demand</b>. Memory stays tiny no matter how many values you produce, and you can even describe <b>infinite</b> sequences safely (the consumer decides when to stop).</p>
${H.table(['', 'List version', 'Generator version'], [['Code', '<code>return [x*x for x in data]</code>', '<code>for x in data: yield x*x</code>'], ['When work happens', 'all up front', 'one item per <code>next()</code>'], ['Memory for 10<sup>8</sup> items', '~800 MB of pointers + ints', '~200 bytes'], ['Can loop twice?', '✅', '❌ (call the function again)'], ['Infinite sequence?', '❌ never returns', '✅']])}
<p><b>Generator expressions</b> are the one-line version: <code>(x * x for x in data)</code> — same as a list comprehension but with <b>round brackets</b>. When it is the only argument you can drop the extra brackets: <code>sum(x * x for x in data)</code>.</p>
<p><b>Generator life cycle</b> (you can check it with <code>inspect.getgeneratorstate</code>): <span class="c-b">GEN_CREATED</span> (not started) → <span class="c-y">GEN_RUNNING</span> (executing) → <span class="c-p">GEN_SUSPENDED</span> (paused at a yield) → … → <span class="c-m">GEN_CLOSED</span> (finished or closed).</p>
<p><b>Advanced but common in interviews:</b></p>
<ul>
<li><code>return value</code> inside a generator ends it; the value rides along on <code>StopIteration.value</code> (and becomes the result of <code>yield from</code>).</li>
<li><code>x = yield y</code> — yield is an <b>expression</b>. <code>gen.send(v)</code> resumes the generator and makes the paused <code>yield</code> evaluate to <code>v</code>. You must "prime" a fresh generator with <code>next(g)</code> (or <code>g.send(None)</code>) first.</li>
<li><code>gen.throw(exc)</code> raises an exception at the paused yield; <code>gen.close()</code> raises <code>GeneratorExit</code> there so <code>finally</code> blocks run and resources get cleaned up.</li>
</ul>`,
    clues: [
      '"process a file/stream too big for memory" / "lazily" / "on demand" → generator function with <code>yield</code>',
      '"infinite sequence" (Fibonacci, primes, IDs, timestamps) → <code>while True: yield …</code> + the consumer stops with <code>islice</code>/<code>break</code>',
      '"return values one at a time" / "stream results back" (e.g. LLM tokens, paginated API) → generator',
      '"sum/any/all/max over a transformed list" → generator expression, no temporary list: <code>sum(x*x for x in xs)</code>',
      '"coroutine that receives values" / "running average with send()" → <code>x = yield result</code> + priming',
      '"clean up when the consumer stops early" → <code>try/finally</code> inside the generator, <code>close()</code> triggers it'
    ],
    code: [{ lang: 'python', run: true, title: 'Pausing, resuming, states, return value', code: `import inspect

def countdown(n):
    print('  [gen] start')
    while n > 0:
        yield n                  # pause here, hand n to the caller
        n -= 1                   # resume here on the next next()
    print('  [gen] done')
    return 'liftoff'             # becomes StopIteration.value

g = countdown(2)
print(inspect.getgeneratorstate(g))   # GEN_CREATED: body not started
print(next(g))                        # runs to first yield -> 2
print(inspect.getgeneratorstate(g))   # GEN_SUSPENDED
print(next(g))                        # 1
try:
    next(g)
except StopIteration as e:
    print('finished with', e.value)   # liftoff
print(inspect.getgeneratorstate(g))   # GEN_CLOSED` }, { lang: 'python', run: true, title: 'send(), throw(), close() and finally', code: `def averager():
    total = count = 0
    avg = None
    try:
        while True:
            x = yield avg            # pause: hand out avg, wait for a value
            total += x
            count += 1
            avg = total / count
    finally:
        print('  cleanup: averager closed')

a = averager()
next(a)                  # prime: run to the first yield
print(a.send(10))        # 10.0
print(a.send(20))        # 15.0
print(a.send(60))        # 30.0
a.close()                # GeneratorExit raised at the yield -> finally runs` }],
    codeTitle: ['Generator basics', 'Two-way generators (coroutine style)'],
    viz: [{
      title: 'Generator pausing at yield and resuming',
      input: '3',
      inputLabel: 'n for countdown(n) (1–5)',
      gen: function (input) {
        var n = parseInt(String(input).trim(), 10);
        if (isNaN(n) || n < 1 || n > 5) throw new Error('Enter a whole number from 1 to 5');
        var code = ['def countdown(n):', "    print('start')", '    while n > 0:', '        yield n', '        n -= 1', "    print('done')", '', 'g = countdown(' + n + ')', 'for v in g:', "    print('got', v)"].join('\n');
        var frames = [], out = [], cur = n;
        function st(state, extra) { var o = { 'g state': state, 'g frame: n': extra === undefined ? cur : extra }; return o; }
        frames.push(fr('<code>g = countdown(' + n + ')</code> — because the body contains <code>yield</code>, calling it just <b>creates a generator object</b>. Not a single line of the body runs. Nothing is printed.', [cp(code, 8), vp(st('GEN_CREATED'), 'g state'), { type: 'stack', label: 'Who is running?', items: ['main program'], hl: { 0: 'cur' } }, outBox(out)]));
        frames.push(fr('The for loop calls <code>iter(g)</code> (returns g itself) and then <code>next(g)</code>. Control <b>jumps into</b> the generator body for the first time.', [cpm(code, { 9: 'cur', 1: 'win' }), vp(st('GEN_RUNNING'), 'g state', 'cur'), { type: 'stack', label: 'Who is running?', items: ['main program', 'countdown frame'], hl: { 1: 'cur' } }, outBox(out)]));
        out.push('start');
        frames.push(fr("<code>print('start')</code> runs now — only because someone asked for the first value. This is <b>laziness</b>.", [cp(code, 2), vp(st('GEN_RUNNING'), ''), { type: 'stack', label: 'Who is running?', items: ['main program', 'countdown frame'], hl: { 1: 'cur' } }, outBox(out)]));
        while (cur > 0) {
          frames.push(fr('<code>while n &gt; 0</code>: n = ' + cur + ' → True, keep going.', [cp(code, 3), vp(st('GEN_RUNNING'), 'g frame: n', 'cur'), { type: 'stack', label: 'Who is running?', items: ['main program', 'countdown frame'], hl: { 1: 'cur' } }, outBox(out)]));
          frames.push(fr('<code>yield ' + cur + '</code>: hand <b>' + cur + '</b> to the caller and <b>freeze</b>. The frame (n = ' + cur + ', "resume after line 4") is kept alive inside g. Control returns to the for loop.', [cpm(code, { 4: 'sel' }), vp(st('GEN_SUSPENDED'), 'g state', 'sel'), { type: 'stack', label: 'Who is running?', items: ['main program', 'countdown frame (paused at line 4)'], hl: { 0: 'cur', 1: 'done' } }, outBox(out)]));
          out.push('got ' + cur);
          frames.push(fr('Back in the caller: <code>v = ' + cur + '</code>, the loop body prints it. The generator is sleeping, holding its state.', [cpm(code, { 10: 'ok', 4: 'done' }), vp({ 'g state': 'GEN_SUSPENDED', 'g frame: n': cur, v: cur }, 'v'), { type: 'stack', label: 'Who is running?', items: ['main program', 'countdown frame (paused)'], hl: { 0: 'cur' } }, outBox(out)]));
          frames.push(fr('Next loop iteration → <code>next(g)</code> <b>resumes</b> right after the yield: <code>n -= 1</code> makes n = ' + (cur - 1) + '. Nothing was recomputed from the start.', [cpm(code, { 5: 'cur', 9: 'win' }), vp(st('GEN_RUNNING', cur - 1), 'g frame: n', 'cur'), { type: 'stack', label: 'Who is running?', items: ['main program', 'countdown frame'], hl: { 1: 'cur' } }, outBox(out)]));
          cur--;
        }
        frames.push(fr('<code>while n &gt; 0</code>: n = 0 → False, leave the loop.', [cp(code, 3, 'bad'), vp(st('GEN_RUNNING'), 'g frame: n', 'bad'), outBox(out)]));
        out.push('done');
        frames.push(fr("<code>print('done')</code>, then the function body ends. Falling off the end (or <code>return</code>) makes <code>next()</code> raise <b>StopIteration</b>.", [cp(code, 6), vp(st('GEN_RUNNING'), ''), outBox(out)]));
        frames.push(fr('The for loop catches StopIteration and ends quietly. g is now <span class="c-m">GEN_CLOSED</span>; its frame is freed. Looping over g again would yield nothing — call <code>countdown(' + n + ')</code> again for a fresh run.', [cpm(code, { 9: 'sel' }), vp({ 'g state': 'GEN_CLOSED', 'g frame': '(freed)' }, 'g state', 'bad'), { type: 'stack', label: 'Who is running?', items: ['main program'], hl: { 0: 'cur' } }, outBox(out)]));
        return frames;
      }
    }, {
      title: 'Two-way traffic: send() into a paused yield',
      input: '10 20 60',
      inputLabel: 'Numbers to send (max 6)',
      gen: function (input) {
        var xs = nums(input, 6);
        var code = ['def averager():', '    total = count = 0', '    avg = None', '    while True:', '        x = yield avg', '        total += x', '        count += 1', '        avg = total / count', '', 'a = averager()', 'next(a)          # prime it', 'a.send(v)        # for each v'].join('\n');
        var frames = [], total = 0, count = 0, avg = 'None', out = [];
        frames.push(fr('<code>a = averager()</code> creates the generator. It has not started, so there is no paused <code>yield</code> to receive a value yet. Sending a non-None value now raises <span class="c-r">TypeError</span>.', [cp(code, 10), vp({ state: 'GEN_CREATED' }, 'state'), outBox(out)]));
        frames.push(fr('<b>Priming:</b> <code>next(a)</code> runs the body to the first <code>yield avg</code>. It yields <code>None</code> (the initial avg) and pauses <b>in the middle of the line</b> <code>x = yield avg</code> — the assignment to x is still waiting.', [cpm(code, { 11: 'cur', 5: 'sel' }), vp({ state: 'GEN_SUSPENDED', total: 0, count: 0, avg: 'None', x: '(waiting)' }, 'x', 'sel'), outBox(out)]));
        xs.forEach(function (v) {
          frames.push(fr('<code>a.send(' + v + ')</code>: resumes the generator and the paused <code>yield</code> expression <b>evaluates to ' + v + '</b>, so <code>x = ' + v + '</code>.', [cpm(code, { 12: 'cur', 5: 'ok' }), vp({ state: 'GEN_RUNNING', total: total, count: count, avg: avg, x: v }, 'x'), outBox(out)]));
          total += v; count += 1; avg = String(Math.round(total / count * 1000) / 1000); if (avg.indexOf('.') < 0) avg += '.0';
          frames.push(fr('Update: total = ' + total + ', count = ' + count + ', avg = ' + total + '/' + count + ' = <b>' + avg + '</b>.', [cpm(code, { 6: 'cur', 7: 'cur', 8: 'cur' }), vp({ state: 'GEN_RUNNING', total: total, count: count, avg: avg, x: v }, 'total,count,avg'), outBox(out)]));
          out.push('send(' + v + ') -> ' + avg);
          frames.push(fr('Loop back to <code>x = yield avg</code>: yields <b>' + avg + '</b> — that becomes the return value of <code>send(' + v + ')</code> — and pauses again waiting for the next x.', [cpm(code, { 5: 'sel', 4: 'win' }), vp({ state: 'GEN_SUSPENDED', total: total, count: count, avg: avg, x: '(waiting)' }, 'avg', 'sel'), outBox(out)]));
        });
        frames.push(fr('<b>Key idea:</b> <code>yield</code> is a two-way door. Values go <b>out</b> as the yielded value and come <b>in</b> as the result of the yield expression. This is how generator-based coroutines worked before <code>async/await</code> (which is built on the same machinery).', [tx('out → <code>yield avg</code> → caller receives avg<br>in → <code>a.send(v)</code> → paused yield evaluates to v<br><code>a.close()</code> → GeneratorExit at the yield → finally blocks run', 'Summary'), outBox(out)]));
        return frames;
      }
    }],
    examples: [
      { title: 'Predict the output: when does the body actually run?', html: `<p>Calling a generator function prints <b>nothing</b>. Only <code>next()</code> runs code, and only up to the next yield. Many candidates expect "A" to print on line 1.</p>${H.table(['Line', 'Printed'], [['<code>g = gen()</code>', '(nothing)'], ['<code>print(next(g))</code>', 'A then 1'], ['<code>print(next(g))</code>', 'B then 2'], ['<code>print(list(g))</code>', 'C then []']])}`, code: { lang: 'python', run: true, code: `def gen():
    print('A')
    yield 1
    print('B')
    yield 2
    print('C')

g = gen()            # nothing printed
print(next(g))       # A, 1
print(next(g))       # B, 2
print(list(g))       # C, []` } },
      { title: 'Memory: list comprehension vs generator expression', html: `<p>The list holds a million results at once; the generator holds just its paused frame. Both give the same sum. <code>sys.getsizeof</code> shows the container size (not the ints inside), which already makes the point: about 8 MB vs ~200 bytes.</p>`, code: { lang: 'python', run: true, code: `import sys

as_list = [x * x for x in range(1_000_000)]
as_gen = (x * x for x in range(1_000_000))
print(sys.getsizeof(as_list), 'bytes for the list object')
print(sys.getsizeof(as_gen), 'bytes for the generator object')
print(sum(as_list) == sum(as_gen))   # True` } },
      { title: 'Infinite generator + islice: let the consumer decide', html: `<p>The producer never stops; the consumer takes what it needs. This separation (how to <i>produce</i> vs how many to <i>take</i>) is the heart of lazy design.</p>${H.arr([0, 1, 1, 2, 3, 5, 8, 13, '…'], { label: 'fib()', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g', 4: 'g', 5: 'g', 6: 'g', 7: 'g' } })}`, code: { lang: 'python', run: true, code: `from itertools import islice, takewhile

def fib():
    a, b = 0, 1
    while True:          # infinite, but lazy -> safe
        yield a
        a, b = b, a + b

print(list(islice(fib(), 8)))                    # first 8
print(list(takewhile(lambda x: x < 100, fib())))  # all below 100` } },
      { title: 'Predict the output: StopIteration inside a generator (PEP 479)', html: `<p>Since Python 3.7, a <code>StopIteration</code> that <b>escapes</b> a generator body is turned into <code>RuntimeError: generator raised StopIteration</code>. Old code that relied on a bare <code>next()</code> to end a generator now crashes. Fix: catch it and <code>return</code>, or use <code>next(it, default)</code>.</p>`, code: { lang: 'python', run: true, code: `def first_two(it):
    it = iter(it)
    yield next(it)
    yield next(it)       # if 'it' has only 1 item -> StopIteration escapes

try:
    print(list(first_two([1])))
except RuntimeError as e:
    print('RuntimeError:', e)

def first_two_safe(it):
    it = iter(it)
    for _ in range(2):
        try:
            yield next(it)
        except StopIteration:
            return       # end the generator cleanly

print(list(first_two_safe([1])))   # [1]` } },
      { title: 'close() and finally: cleanup when the consumer stops early', html: `<p>If a consumer <code>break</code>s out of a loop, the generator is left suspended. When it is garbage collected (or <code>close()</code>d) Python raises <code>GeneratorExit</code> at the paused yield, so <code>finally</code> runs. Never <code>yield</code> inside the <code>except GeneratorExit</code> handler — that raises <code>RuntimeError: generator ignored GeneratorExit</code>.</p>`, code: { lang: 'python', run: true, code: `def read_rows():
    print('open connection')
    try:
        for i in range(1, 1000):
            yield i
    finally:
        print('close connection')   # runs even if the consumer stops early

g = read_rows()
for row in g:
    if row == 3:
        break
print('loop stopped at', row)
g.close()                            # deterministic cleanup` } }
    ],
    deepDive: `<p>🟣 <b>How CPython pauses a function.</b> A normal call creates a <b>frame</b> (local variables + instruction pointer + value stack) and destroys it on return. A generator object owns its frame. <code>YIELD_VALUE</code> stores the instruction pointer and returns to the caller <i>without</i> destroying the frame; <code>next()</code>/<code>send()</code> pushes the same frame back on the call stack and continues. Since 3.11 frames are lightweight "interpreter frames" embedded inside the generator object, so a suspended generator costs roughly 100–200 bytes plus its locals.</p>
<p><b>The full method set:</b> <code>__next__()</code> ≡ <code>send(None)</code>; <code>send(v)</code> resumes with v; <code>throw(exc)</code> raises at the pause point (the generator may catch it and yield again); <code>close()</code> throws <code>GeneratorExit</code> and expects the generator to finish. Generators also expose <code>gi_frame</code>, <code>gi_running</code>, <code>gi_code</code> and <code>gi_suspended</code> (3.11+) for debuggers.</p>
<p><b>Edge cases interviewers love:</b> (1) A generator is <b>not re-entrant</b> — calling <code>next(g)</code> from inside g raises <code>ValueError: generator already executing</code>. (2) <code>return x</code> in a generator does not hand x to a for loop — it is only visible via <code>StopIteration.value</code> or <code>yield from</code>. (3) Generator expressions evaluate their <b>first</b> <code>for</code> clause's iterable immediately, everything else lazily: <code>(x for x in a if x in b)</code> captures <code>a</code> now but reads <code>b</code> later (late binding). (4) Generators keep references to everything in their frame — a forgotten suspended generator can keep a big object or an open file alive.</p>
<p><b>Production reality:</b> generators power Django <code>QuerySet.iterator()</code>, <code>csv.reader</code>, <code>os.walk</code>, streaming HTTP responses (<code>StreamingHttpResponse</code>, FastAPI <code>StreamingResponse</code>), and LLM token streaming. A generator is cheaper than a class-based iterator to write and usually faster to run, but slower than a C-level built-in like <code>map</code> on a builtin function — measure before micro-optimising.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> streaming is everywhere in AI apps — LLM SDKs return iterators of chunks, and web frameworks stream them to browsers via generator-backed responses (Server-Sent Events). Knowing exactly when generator code runs is now a daily skill, not trivia.</p>
<p><b>Use AI as a partner:</b> <code>"Convert this function that returns a giant list into a generator and list every caller that relies on len() or indexing"</code>; <code>"Write a test proving this generator's finally block runs when the consumer breaks early"</code>.</p>
<p><b>Where AI goes wrong:</b> it puts the "setup" work (opening files, starting timers, validating arguments) inside a generator and assumes it runs at call time — but it runs on the first <code>next()</code>, so errors surface far from the call site. It also forgets to prime <code>send()</code>-based coroutines and confuses generator <code>return</code> values with yielded values.</p>
<p><b>What you must own:</b> the pause/resume model, the life-cycle states, laziness consequences (deferred errors, single pass, open resources), and knowing that <code>async def</code> coroutines are the modern descendant of <code>send()</code>-based generators.</p>`,
    problems: [{
      title: 'Lazy Prime Stream (Incremental Sieve)', level: 'Medium', tags: ['generator', 'infinite sequence', 'hash map'], companies: ['Google', 'Jane Street', 'Microsoft'],
      statement: `<p>Write a generator <code>primes()</code> that yields 2, 3, 5, 7, 11, … <b>forever</b>. The caller decides how many to take, so you cannot know an upper limit in advance (a classic fixed-size sieve needs one). Use it to print the first 10 primes and the 1000th prime.</p>`,
      constraints: `The consumer may take up to 10<sup>6</sup> primes. Each yielded prime should cost roughly O(log log n) amortised work, and memory should be O(number of primes yielded so far).`,
      example: `<p><code>list(islice(primes(), 10))</code> → ${H.arr([2, 3, 5, 7, 11, 13, 17, 19, 23, 29], { hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g', 4: 'g', 5: 'g', 6: 'g', 7: 'g', 8: 'g', 9: 'g' } })} The 1000th prime is <b>7919</b>.</p>`,
      brute: { why: `<p>Trial division: for each candidate n, test every number up to √n. Easy and lazy, but each test costs O(√n / log n) divisions using known primes or O(√n) without — for the millionth prime (~15.5 million) that is thousands of divisions per number. The wasted work: re-checking divisibility from scratch for every candidate instead of "crossing off" multiples once.</p>`, code: `from itertools import count, islice

def primes_trial():
    for n in count(2):                      # 2, 3, 4, ... forever
        if all(n % d for d in range(2, int(n ** 0.5) + 1)):
            yield n

print(list(islice(primes_trial(), 10)))` },
      mcq: { q: 'You need "the next prime" forever without a known limit. Which structure lets you cross off multiples lazily?', options: ['A dict mapping each upcoming composite number to the primes that will hit it', 'A boolean array of size 10**6', 'A sorted list re-sorted every step', 'Recursion with memoisation'], answer: 0, explain: 'The incremental sieve keeps only the NEXT multiple of each known prime in a dict. When the counter reaches a key, that number is composite; move each of its primes forward to its next multiple. Unknown numbers are prime.' },
      hints: [`<p>Hint 1: A sieve marks multiples of each prime. You do not need all multiples at once — only the <b>next</b> upcoming multiple of each prime.</p>`, `<p>Hint 2: Keep <code>composites = {}</code> mapping number → list of primes that divide it. Walk n = 2, 3, 4, …: if n is not a key, it is prime → yield it and schedule <code>n*n</code> (smaller multiples are already covered by smaller primes).</p>`, `<p>Hint 3: If n is a key, it is composite: pop it, and for each prime p in its list, push p to <code>n + p</code>. Recipe: <code>for n in count(2): if n not in d: yield n; d[n*n] = [n] else: for p in d.pop(n): d.setdefault(n+p, []).append(p)</code>.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_val',
        cases: [
          [['list(islice(primes(), 10))'], [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]],
          [['next(islice(primes(), 999, None))'], 7919],
          [['next(primes())'], 2],
          [['list(islice(primes(), 1))'], [2]],
          [['list(islice(primes(), 0))'], []],
          [['(lambda a, b: [next(a), next(a), next(b)])(primes(), primes())'], [2, 3, 2]],
          [['next(islice(primes(), 99999, None))'], 1299709],
          [['list(islice(primes(), 25))[-1]'], 97],
          [
            ['(lambda ps: [ps[-1], sum(ps), len(ps)])(list(islice(primes(), 200000)))'],
            [2750159, 264129169599, 200000]
          ],
          [
            ['all(p > 1 and all(p % d for d in range(2, int(p ** 0.5) + 1)) for p in islice(primes(), 2000))'],
            true
          ]
        ],
        harness: {
          python: 'def t_val(src):\n' +
            '    try:\n' +
            '        return eval(src)\n' +
            '    except Exception as e:\n' +
            '        return \'!\' + type(e).__name__'
        }
      },
      solution: {
        approach: `<p>Incremental Sieve of Eratosthenes (from the Python Cookbook). The dict holds "next multiple to cross off" for every prime seen. The generator is infinite, the caller limits it with <code>islice</code>. Starting each prime's schedule at p² is the same optimisation as the classic sieve.</p>`,
        code: { lang: 'python', run: true, code: `from itertools import count, islice

def primes():
    """Yield primes forever using an incremental sieve."""
    upcoming = {}                     # composite -> primes that divide it
    for n in count(2):
        factors = upcoming.pop(n, None)
        if factors is None:
            yield n                   # nobody scheduled n -> it's prime
            upcoming[n * n] = [n]     # first multiple worth crossing off
        else:
            for p in factors:         # move each prime to its next multiple
                upcoming.setdefault(n + p, []).append(p)

print(list(islice(primes(), 10)))           # first 10
print(next(islice(primes(), 999, None)))    # the 1000th prime: 7919` },
        dry: { head: ['n', 'in dict?', 'action', 'dict after (key: primes)'], rows: [['2', 'no', '<span class="c-g">yield 2</span>, schedule 4', '{4:[2]}'], ['3', 'no', '<span class="c-g">yield 3</span>, schedule 9', '{4:[2], 9:[3]}'], ['4', 'yes [2]', 'composite, 2 → 6', '{9:[3], 6:[2]}'], ['5', 'no', '<span class="c-g">yield 5</span>, schedule 25', '{9:[3], 6:[2], 25:[5]}'], ['6', 'yes [2]', 'composite, 2 → 8', '{9:[3], 25:[5], 8:[2]}']] },
        complexity: `<p>About O(n log log n) total for all numbers up to n (each composite is visited once per distinct prime factor). Memory: one dict entry per prime yielded so far (each prime always has exactly one pending multiple), so O(π(n)) entries.</p>`,
        followUps: ['Skip even numbers to halve the work (start at 3, step 2, schedule n + 2p).', 'Write primes_between(lo, hi) using takewhile and dropwhile on this generator.', 'Why is this generator NOT thread-safe if two threads call next() on it?']
      }
    }]
  });

  /* ================= TOPIC 3: yield from & delegation ================= */
  function parseNested(s) {
    var toks = String(s).match(/\[|\]|[^\s\[\],]+/g) || [];
    if (!toks.length) throw new Error('Type a nested list like: 1 [2 3 [4]] 5');
    if (toks.length > 40) throw new Error('Keep it short (at most ~20 values)');
    var pos = 0;
    function parseList(closing) {
      var out = [];
      while (pos < toks.length) {
        var t = toks[pos++];
        if (t === '[') out.push(parseList(true));
        else if (t === ']') { if (!closing) throw new Error('Unbalanced ] bracket'); return out; }
        else out.push(t);
      }
      if (closing) throw new Error('Missing a closing ] bracket');
      return out;
    }
    var res = parseList(false);
    return res;
  }
  function showNested(a) { return '[' + a.map(function (x) { return Array.isArray(x) ? showNested(x) : x; }).join(', ') + ']'; }

  topics.push({
    title: 'yield from: Delegating to Sub-generators (and Recursive Generators)',
    analogy: `<p>A <b>head chef</b> is plating dishes for customers. For desserts she says to the pastry chef: "<i>You</i> serve the customers directly until you are done, then tell me how many you made." She does not carry each dessert herself. <code>yield from</code> is that hand-off: the outer generator steps aside, the inner one talks <b>directly</b> to the consumer (values out, <code>send()</code> values in), and when it finishes its <b>return value</b> comes back to the head chef.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> <code>yield from something</code> means "yield every item of <i>something</i>, one by one". For simple cases it is just a shorter loop:</p>
<pre>def chain2(a, b):
    yield from a        # same as: for x in a: yield x
    yield from b</pre>
<p>It works with <b>any iterable</b>: lists, strings, ranges, other generators.</p>
<p>🔵 <b>Why it is more than a loop.</b> When the thing you delegate to is a <b>generator</b>, <code>yield from</code> builds a transparent two-way pipe (PEP 380):</p>
<ul>
<li>Values the sub-generator yields go <b>straight to the outer caller</b>.</li>
<li><code>send(v)</code>, <code>throw(e)</code> and <code>close()</code> from the caller go <b>straight into the sub-generator</b>. A hand-written <code>for</code> loop would swallow them.</li>
<li>When the sub-generator <code>return</code>s a value, the whole <code>yield from</code> <b>expression evaluates to that value</b>: <code>result = yield from sub()</code>.</li>
</ul>
${H.table(['Feature', '<code>for x in sub(): yield x</code>', '<code>yield from sub()</code>'], [['Pass values out', '✅', '✅'], ['Forward send()/throw()/close()', '❌', '✅'], ['Get sub-generator return value', '❌', '✅ <code>r = yield from sub()</code>'], ['Speed', 'one Python loop per level', 'handled in C, faster']])}
<p><b>Recursive generators.</b> <code>yield from</code> makes recursion over trees and nested data beautiful:</p>
<pre>def walk(node):                 # in-order traversal of a binary tree
    if node:
        yield from walk(node.left)
        yield node.val
        yield from walk(node.right)</pre>
<p>Each level of recursion is one suspended generator; a value produced at depth d passes up through d generators. For balanced trees that is O(log n) per value — fine. For a degenerate (linked-list shaped) tree of depth 5,000 you hit the <b>recursion limit</b> (default 1000) and each value costs O(depth). Then switch to an explicit stack.</p>
<p><b>Async connection:</b> before Python 3.5, <code>asyncio</code> coroutines were generators chained with <code>yield from</code>. <code>await</code> is the modern, dedicated version of that same delegation idea.</p>`,
    clues: [
      '"flatten an arbitrarily nested list/dict/JSON" → recursive generator with <code>yield from</code>',
      '"traverse a tree/filesystem/graph lazily" (in-order, pre-order, DFS) → <code>yield from walk(child)</code>',
      '"generate all permutations/subsets lazily" → recursive generator, stop early when the first valid one is found',
      '"combine several generators one after another" → <code>yield from a; yield from b</code> (or <code>itertools.chain</code>)',
      '"sub-generator returns a summary/result" → <code>result = yield from sub()</code>',
      '"depth up to 10<sup>5</sup>" → recursion limit danger: use an explicit stack of iterators instead'
    ],
    code: [{ lang: 'python', run: true, title: 'Flatten nested data with yield from', code: `def flatten(items):
    """Yield atoms from arbitrarily nested lists/tuples, in order."""
    for x in items:
        if isinstance(x, (list, tuple)):
            yield from flatten(x)     # delegate: the inner generator yields directly to our caller
        else:
            yield x

data = [1, [2, 3, [4, [5]]], (6, 7), 'eight']
print(list(flatten(data)))   # [1, 2, 3, 4, 5, 6, 7, 'eight']` }, { lang: 'python', run: true, title: 'Return values and send() passing through yield from', code: `def ask_two_numbers():
    a = yield 'give me a'        # send() from the OUTER caller lands here
    b = yield 'give me b'
    return a + b                 # becomes the value of 'yield from'

def calculator():
    total = yield from ask_two_numbers()   # pipe opened, then closed with a result
    yield f'total is {total}'

c = calculator()
print(next(c))        # give me a   (yielded by the SUB-generator)
print(c.send(10))     # give me b   (10 went straight into the sub-generator)
print(c.send(32))     # total is 42 (sub returned 42 -> total)` }],
    codeTitle: ['Recursive delegation', 'yield from as a two-way pipe'],
    viz: [{
      title: 'Recursive flatten: values travel up a chain of paused generators',
      input: '1 [2 3 [4]] 5',
      inputLabel: 'Nested list (use [ ] for sub-lists)',
      gen: function (input) {
        var data = parseNested(input);
        var code = ['def flatten(items):', '    for x in items:', '        if isinstance(x, list):', '            yield from flatten(x)', '        else:', '            yield x'].join('\n');
        var frames = [], out = [], stack = [];
        frames.push(fr('Call <code>list(flatten(' + esc(showNested(data)) + '))</code>. <code>list()</code> keeps calling <code>next()</code> on the outermost generator.', [cp(code, 1), { type: 'stack', label: 'Chain of generators (bottom = outermost)', items: ['flatten(' + showNested(data) + ')'], hl: { 0: 'cur' } }, { type: 'array', label: 'list() has collected', values: [] }]));
        var steps = 0;
        function walk(items) {
          stack.push('flatten(' + showNested(items) + ')');
          for (var i = 0; i < items.length; i++) {
            if (steps++ > 60) return;
            var x = items[i];
            var hls = {}; hls[stack.length - 1] = 'cur';
            if (Array.isArray(x)) {
              frames.push(fr('x = ' + esc(showNested(x)) + ' is a list → <code>yield from flatten(x)</code>: a <b>new generator</b> is created and this one pauses, delegating. Depth is now ' + (stack.length + 1) + '.', [cp(code, 4, 'win'), { type: 'stack', label: 'Chain of generators (bottom = outermost)', items: stack.concat(['flatten(' + showNested(x) + ')']), hl: (function () { var h = {}; h[stack.length] = 'ok'; return h; })() }, { type: 'array', label: 'list() has collected', values: out.slice() }]));
              walk(x);
              var hb = {}; hb[stack.length - 1] = 'cur';
              frames.push(fr('The sub-generator for ' + esc(showNested(x)) + ' raised StopIteration, so <code>yield from</code> finishes and this level <b>resumes</b> its own for loop.', [cpm(code, { 2: 'cur', 4: 'done' }), { type: 'stack', label: 'Chain of generators (bottom = outermost)', items: stack.slice(), hl: hb }, { type: 'array', label: 'list() has collected', values: out.slice() }]));
            } else {
              out.push(x);
              var hl2 = {}; hl2[out.length - 1] = 'ok';
              frames.push(fr('x = <b>' + esc(x) + '</b> is not a list → <code>yield ' + esc(x) + '</code>. The value passes straight up through ' + stack.length + ' paused generator' + (stack.length > 1 ? 's' : '') + ' (each one is "inside" a yield from) to <code>list()</code>.', [cp(code, 6, 'sel'), { type: 'stack', label: 'Chain of generators (bottom = outermost)', items: stack.slice(), hl: hls }, { type: 'array', label: 'list() has collected', values: out.slice(), hl: hl2 }]));
            }
          }
          stack.pop();
        }
        walk(data);
        frames.push(fr('The outermost generator\'s loop ends → StopIteration → <code>list()</code> returns <b>' + esc(showNested(out)) + '</b>. Maximum chain depth = nesting depth; that is why very deep nesting can hit the recursion limit.', [cp(code, 2, 'done'), { type: 'stack', label: 'Chain of generators', items: ['(all finished)'] }, { type: 'array', label: 'result', values: out.slice(), hl: (function () { var h = {}; out.forEach(function (_, i) { h[i] = 'sel'; }); return h; })() }]));
        return frames;
      }
    }, {
      title: 'yield from as a two-way pipe (send in, return value out)',
      gen: function () {
        var code = ['def ask_two():', "    a = yield 'give me a'", "    b = yield 'give me b'", '    return a + b', '', 'def calculator():', '    total = yield from ask_two()', "    yield f'total is {total}'"].join('\n');
        var g = function (h) { return { type: 'graph', directed: true, height: 46, nodes: [{ id: 'C', label: 'caller', x: 10, y: 23, shape: 'box' }, { id: 'O', label: 'calculator()', x: 48, y: 23, shape: 'box' }, { id: 'S', label: 'ask_two()', x: 86, y: 23, shape: 'box' }], edges: [['C', 'O', h.e1 || ''], ['O', 'S', h.e2 || '']], hl: h.hl || {}, ehl: h.ehl || {} }; };
        return [
          fr('<code>c = calculator()</code>, then <code>next(c)</code>. calculator starts, reaches <code>yield from ask_two()</code>: it creates the sub-generator and <b>opens a pipe</b> to it.', [cpm(code, { 7: 'cur' }), g({ hl: { O: 'cur' }, e2: 'opens pipe', ehl: { 'O-S': 'cur' } }), vp({ total: '(waiting for sub)' })]),
          fr("ask_two runs to <code>yield 'give me a'</code>. The string travels <b>through</b> calculator untouched and <code>next(c)</code> returns it to the caller.", [cpm(code, { 2: 'sel', 7: 'win' }), g({ hl: { S: 'sel', C: 'ok' }, e1: "'give me a'", ehl: { 'C-O': 'ok', 'O-S': 'ok' } }), vp({ a: '(waiting)', total: '(waiting for sub)' }, 'a', 'cur')]),
          fr('<code>c.send(10)</code>: calculator does not see the 10 — <code>yield from</code> forwards it <b>directly</b> into ask_two, where the paused yield evaluates to 10 → <code>a = 10</code>. ask_two yields <code>\'give me b\'</code> back out.', [cpm(code, { 2: 'ok', 3: 'sel' }), g({ hl: { S: 'cur' }, e1: 'send(10)', e2: '10 forwarded', ehl: { 'C-O': 'cur', 'O-S': 'cur' } }), vp({ a: 10, b: '(waiting)', total: '(waiting for sub)' }, 'a')]),
          fr('<code>c.send(32)</code> → <code>b = 32</code> → <code>return a + b</code>. Returning raises <code>StopIteration(42)</code> inside the machinery; <code>yield from</code> catches it and <b>evaluates to 42</b>.', [cpm(code, { 3: 'ok', 4: 'sel' }), g({ hl: { S: 'done', O: 'cur' }, e2: 'returns 42', ehl: { 'O-S': 'ok' } }), vp({ a: 10, b: 32, total: 42 }, 'total', 'sel')]),
          fr("calculator continues: <code>total = 42</code>, and it yields <code>'total is 42'</code> itself. That string is the return value of <code>c.send(32)</code>.", [cpm(code, { 7: 'ok', 8: 'sel' }), g({ hl: { O: 'sel', C: 'ok' }, e1: "'total is 42'", ehl: { 'C-O': 'ok' } }), vp({ total: 42 }, 'total')]),
          fr('<b>Why it matters:</b> a hand-written <code>for x in ask_two(): yield x</code> would make <code>send(10)</code> deliver 10 to <i>calculator</i>\'s yield (and ignore it), ask_two would get <code>None</code> and crash on <code>None + None</code>, and the return value would be lost. <code>yield from</code> is a true delegation, not just a loop.', [tx('<code>for</code> loop re-yield: values out ✅ · send/throw in ❌ · return value ❌<br><code>yield from</code>: values out ✅ · send/throw/close in ✅ · return value ✅', 'Loop vs yield from')])
        ];
      }
    }],
    examples: [
      { title: 'Predict the output: yield from a string', html: `<p><code>yield from</code> accepts any iterable — a string is an iterable of characters. A common bug is writing <code>yield from word</code> when you meant <code>yield word</code>.</p>${H.table(['Code', 'list(...)'], [['<code>yield word</code> for "hi", "yo"', "['hi', 'yo']"], ['<code>yield from word</code>', "['h', 'i', 'y', 'o']"]])}`, code: { lang: 'python', run: true, code: `def whole(words):
    for w in words:
        yield w

def letters(words):
    for w in words:
        yield from w        # iterates the string -> characters

print(list(whole(['hi', 'yo'])))    # ['hi', 'yo']
print(list(letters(['hi', 'yo'])))  # ['h', 'i', 'y', 'o']` } },
      { title: 'Lazy in-order traversal of a binary tree', html: `<p>Recursive generators let you walk a tree and <b>stop early</b> (e.g. "find the k-th smallest") without building the full list. Each level is a paused generator.</p>${H.arr([1, 2, 3, 4, 5, 6, 7], { label: 'in-order of BST', hl: { 2: 'p' }, ptr: { 2: 'k=3' } })}`, code: { lang: 'python', run: true, code: `from itertools import islice

class Node:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def inorder(node):
    if node:
        yield from inorder(node.left)
        yield node.val
        yield from inorder(node.right)

#        4
#      /   \\
#     2     6
#    / \\   / \\
#   1   3 5   7
root = Node(4, Node(2, Node(1), Node(3)), Node(6, Node(5), Node(7)))
print(list(inorder(root)))
print('3rd smallest:', next(islice(inorder(root), 2, None)))  # stops early` } },
      { title: 'Lazy permutations: stop at the first valid one', html: `<p>Recursive generator that builds permutations one at a time. If you only need the first one meeting a condition, you skip the other n! − k. (In real code use <code>itertools.permutations</code>; this shows the pattern.)</p>`, code: { lang: 'python', run: true, code: `def perms(items):
    if len(items) <= 1:
        yield list(items)
        return
    for i, head in enumerate(items):
        rest = items[:i] + items[i + 1:]
        for tail in perms(rest):
            yield [head] + tail

print(list(perms([1, 2, 3])))
# first permutation of 1..8 whose first two items sum to 15 - lazily
print(next(p for p in perms(list(range(1, 9))) if p[0] + p[1] == 15))` } },
      { title: 'Deep nesting: recursion limit and the explicit-stack fix', html: `<p>Nest a list 5,000 levels deep and the recursive version raises <code>RecursionError</code>. A stack of iterators does the same job iteratively — this is the "Flatten Nested List Iterator" interview answer.</p>${H.table(['Version', 'Depth 5,000'], [['recursive <code>yield from</code>', H.c('r', 'RecursionError')], ['stack of iterators', H.c('g', 'works, O(1) per item')]])}`, code: { lang: 'python', run: true, code: `def flatten_iter(items):
    stack = [iter(items)]               # stack of "bookmarks"
    while stack:
        for x in stack[-1]:
            if isinstance(x, list):
                stack.append(iter(x))   # go deeper
                break
            yield x
        else:
            stack.pop()                 # this level is exhausted

deep = [1]
for _ in range(5000):
    deep = [deep, 2]
out = list(flatten_iter(deep))
print(len(out), out[:3])` } }
    ],
    deepDive: `<p>🟣 <b>What PEP 380 really specifies.</b> <code>RESULT = yield from EXPR</code> expands to roughly 40 lines: get <code>_i = iter(EXPR)</code>, prime it with <code>next</code>, then loop — yield each value up, and depending on what the caller does, call <code>_i.send(v)</code>, <code>_i.throw(e)</code> or <code>_i.close()</code>; on <code>StopIteration</code> set <code>RESULT = e.value</code>. If the caller calls <code>close()</code>, the sub-iterator's <code>close()</code> is called too (if it has one). If the sub-iterator is not a generator (say a list iterator), <code>send()</code> of a non-None value raises <code>AttributeError</code>/<code>TypeError</code>.</p>
<p><b>Cost of deep chains.</b> In CPython, each <code>next()</code> on the outermost generator resumes every generator down the chain (the <code>SEND</code> bytecode walks the delegation link). So a value produced at depth d costs O(d) work. Recursive in-order traversal of a balanced tree is O(n log n) total, of a skewed tree O(n²). The explicit stack version is O(n). Interviewers sometimes ask exactly this complexity question.</p>
<p><b>Recursion limit.</b> Each suspended generator in the chain is a frame; <code>sys.getrecursionlimit()</code> (1000 by default) applies to the active chain during resumption. Raising the limit with <code>sys.setrecursionlimit</code> risks a hard C-stack crash (somewhat mitigated in 3.12+, where pure-Python recursion no longer consumes the C stack, but the limit still applies).</p>
<p><b>Generators vs <code>itertools.chain</code>:</b> for "concatenate iterables", <code>chain(a, b)</code> / <code>chain.from_iterable(list_of_iterables)</code> is implemented in C and slightly faster; use <code>yield from</code> when you need logic between the pieces, recursion, or a return value. In <code>asyncio</code>, <code>await coro</code> uses the same delegation machinery (<code>SEND</code>/<code>YIELD_VALUE</code> opcodes) — understanding <code>yield from</code> is understanding how an awaited coroutine passes control up to the event loop.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> recursive generator code (tree walkers, JSON flatteners, directory crawlers) is a favourite thing to ask an assistant for, and it usually produces the elegant <code>yield from</code> version. Your job is to know when that elegance is a trap: very deep input, untrusted nesting (a JSON bomb nested 100,000 levels), or performance-critical code where O(depth) per item hurts.</p>
<p><b>Use AI as a partner:</b> <code>"Rewrite this recursive generator iteratively with an explicit stack and give me a 10,000-deep test case"</code>; <code>"Does any caller use send() or the return value? If not, is yield from or chain clearer?"</code>.</p>
<p><b>Where AI goes wrong:</b> it writes <code>yield from x</code> when x is a string (exploding words into characters), treats strings as nested lists (infinite recursion, since <code>'a'</code> iterates to <code>'a'</code>), or replaces <code>yield from</code> with a loop and silently breaks <code>send()</code>-based code.</p>
<p><b>What you must own:</b> the three extra powers of <code>yield from</code> (forwarding send/throw/close, return value, speed), the O(depth) cost per value, and the iterative fallback.</p>`,
    problems: [{
      title: 'Flatten a Nested List (Lazy, Any Depth)', level: 'Medium', tags: ['generator', 'recursion', 'stack'], companies: ['LinkedIn', 'Meta', 'Airbnb'],
      statement: `<p>Write a generator <code>flatten(nested)</code> that yields every non-list value of an arbitrarily nested list, left to right. Strings must be treated as single values (not split into characters). Then make sure it works for nesting depth 10<sup>5</sup> (LeetCode 341 "Flatten Nested List Iterator" style).</p>`,
      constraints: `Total atoms ≤ 10<sup>6</sup>, nesting depth ≤ 10<sup>5</sup>. Must be lazy: <code>next(flatten(x))</code> should not touch the whole input.`,
      example: `<p><code>[1, [2, ['ab', [3]], []], 4]</code> → ${H.arr([1, 2, "'ab'", 3, 4], { hl: { 0: 'g', 1: 'g', 2: 'y', 3: 'g', 4: 'g' } })} — <code>'ab'</code> stays whole; the empty list contributes nothing.</p>`,
      brute: { why: `<p>Build and return a new list at every level: <code>result += flatten(sub)</code>. Each atom is copied once per level it bubbles through → O(n · depth) copying, plus everything is computed eagerly (no early stop) and deep input still hits the recursion limit.</p>`, code: `def flatten_list(nested):
    result = []
    for x in nested:
        if isinstance(x, list):
            result += flatten_list(x)   # copies the sub-result at every level
        else:
            result.append(x)
    return result

print(flatten_list([1, [2, ['ab', [3]], []], 4]))` },
      mcq: { q: 'The input can be 100,000 levels deep. What do you choose?', options: ['An explicit stack of iterators inside one generator', 'Recursive yield from with sys.setrecursionlimit(10**6)', 'Convert to a string and parse the brackets', 'Recursion with lru_cache'], answer: 0, explain: 'A stack of iterators uses heap memory, no recursion limit, and O(1) work per atom. Raising the recursion limit risks crashing the interpreter and still costs O(depth) per yielded value.' },
      hints: [`<p>Hint 1: The elegant answer is a recursive generator: lists → <code>yield from flatten(x)</code>, atoms → <code>yield x</code>. Use <code>isinstance(x, list)</code> so strings stay whole.</p>`, `<p>Hint 2: For huge depth, replace the call stack with your own: <code>stack = [iter(nested)]</code>. Look at the top iterator; if its next item is a list, push <code>iter(item)</code>; if it is an atom, yield it; if the top is exhausted, pop.</p>`, `<p>Hint 3: Use <code>for x in stack[-1]: … break</code> with a <code>for/else</code> to detect exhaustion, or <code>next(stack[-1], sentinel)</code>. Edge cases: empty lists, empty input, strings, depth 10<sup>5</sup>.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_run',
        cases: [
          [
            [
              'result = repr([list(flatten([1, [2, [\'ab\', [3]], []], 4])), list(flatten_rec([1, [2, [\'ab\', [3]], []], 4]))])'
            ],
            '[[1, 2, \'ab\', 3, 4], [1, 2, \'ab\', 3, 4]]'
          ],
          [['result = repr([list(flatten([])), list(flatten_rec([]))])'], '[[], []]'],
          [['result = repr([list(flatten([[]])), list(flatten_rec([[]]))])'], '[[], []]'],
          [['result = repr([list(flatten([[[[1]]]])), list(flatten_rec([[[[1]]]]))])'], '[[1], [1]]'],
          [
            ['result = repr([list(flatten([\'ab\', [\'cd\']])), list(flatten_rec([\'ab\', [\'cd\']]))])'],
            '[[\'ab\', \'cd\'], [\'ab\', \'cd\']]'
          ],
          [
            ['result = repr([list(flatten([(1, 2), [3]])), list(flatten_rec([(1, 2), [3]]))])'],
            '[[(1, 2), 3], [(1, 2), 3]]'
          ],
          [
            ['result = repr([list(flatten([None, [None, [0]]])), list(flatten_rec([None, [None, [0]]]))])'],
            '[[None, None, 0], [None, None, 0]]'
          ],
          [
            ['result = repr([list(flatten([[], [[]], [[], [1]]])), list(flatten_rec([[], [[]], [[], [1]]]))])'],
            '[[1], [1]]'
          ],
          [
            ['result = repr([list(flatten([\'\', [\'\']])), list(flatten_rec([\'\', [\'\']]))])'],
            '[[\'\', \'\'], [\'\', \'\']]'
          ],
          [
            ['result = repr([list(flatten([{\'a\': 1}, [2]])), list(flatten_rec([{\'a\': 1}, [2]]))])'],
            '[[{\'a\': 1}, 2], [{\'a\': 1}, 2]]'
          ],
          [
            [
              'deep = [\'bottom\']\n' +
                'for _ in range(100000):\n' +
                '    deep = [deep]\n' +
                'result = list(flatten(deep))'
            ],
            ['bottom']
          ],
          [
            [
              'deep = [0]\n' +
                'for i in range(1, 100001):\n' +
                '    deep = [deep, i]\n' +
                'r = list(flatten(deep))\n' +
                'result = [len(r), r[:3], r[-1]]'
            ],
            [100001, [0, 1, 2], 100000]
          ],
          [
            [
              'deep = [0]\n' +
                'for i in range(1, 500):\n' +
                '    deep = [deep, i]\n' +
                'result = list(flatten_rec(deep)) == list(range(500))'
            ],
            true
          ],
          [
            [
              'class Boom(list):\n' +
                '    def __iter__(self):\n' +
                '        raise RuntimeError(\'touched\')\n' +
                'result = [next(flatten([1, Boom()])), next(flatten([[2], Boom()]))]'
            ],
            [1, 2]
          ],
          [['result = sum(1 for _ in flatten([list(range(1000)) for _ in range(1000)]))'], 1000000],
          [
            [
              'g = flatten([1, [2]])\n' +
                'result = [next(g), next(g), next(g, \'end\')]'
            ],
            [1, 2, 'end']
          ],
          [['result = list(flatten([\'abc\']))'], ['abc']]
        ],
        harness: {
          python: 'def t_run(src):\n' +
            '    ns = dict(globals())\n' +
            '    try:\n' +
            '        exec(src, ns)\n' +
            '        return ns[\'result\']\n' +
            '    except Exception as e:\n' +
            '        return \'!\' + type(e).__name__'
        }
      },
      solution: {
        approach: `<p>Two versions. The recursive one is the readable interview opener. The iterative one keeps a stack of iterators (bookmarks), so each atom costs O(1) and depth is limited only by memory. A sentinel object lets us use <code>next(it, sentinel)</code> without try/except.</p>`,
        code: { lang: 'python', run: true, code: `def flatten_rec(nested):
    for x in nested:
        if isinstance(x, list):
            yield from flatten_rec(x)
        else:
            yield x

_END = object()   # unique sentinel: cannot clash with real data

def flatten(nested):
    stack = [iter(nested)]
    while stack:
        x = next(stack[-1], _END)
        if x is _END:
            stack.pop()                  # this list is finished
        elif isinstance(x, list):
            stack.append(iter(x))        # descend lazily
        else:
            yield x

data = [1, [2, ['ab', [3]], []], 4]
print(list(flatten_rec(data)), list(flatten(data)))

deep = ['bottom']
for _ in range(100_000):
    deep = [deep]
print(list(flatten(deep)))               # ['bottom'], no RecursionError` },
        dry: { head: ['step', 'top of stack yields', 'action', 'stack depth', 'output so far'], rows: [['1', '1', 'atom → yield', '1', '[1]'], ['2', '[2, [...], []]', 'push iter', '2', '[1]'], ['3', '2', 'atom → yield', '2', '[1, 2]'], ['4', "['ab', [3]]", 'push iter', '3', '[1, 2]'], ['5', "'ab'", 'atom (str) → yield', '3', "[1, 2, 'ab']"], ['6', '[3] → 3 → END', 'push, yield, pop', '3', "[1, 2, 'ab', 3]"], ['7', '[] → END', 'push, pop', '2', '…'], ['8', '4', 'atom → yield', '1', "[1, 2, 'ab', 3, 4]"]] },
        complexity: `<p>Iterative: O(n + L) time for n atoms and L lists, O(depth) extra memory. Recursive: O(n · depth) worst case (each value bubbles through every level) and limited by the recursion limit.</p>`,
        followUps: ['Also flatten tuples and generators but not strings/bytes/dicts — how do you test "is a container"?', 'Yield (path, value) pairs, e.g. ((1, 0), 2), for a nested JSON object.', 'Implement it as a class with next() and hasNext() as LeetCode 341 requires.']
      }
    }]
  });

  /* ================= TOPIC 4: Generator pipelines ================= */
  topics.push({
    title: 'Generator Pipelines: Streaming Data Through Small Lazy Stages',
    analogy: `<p>Picture a <b>car-wash tunnel</b>: soap → brushes → rinse → dryer. Each car moves through every station one after another, and the next car enters as soon as there is room. Nobody parks all 500 cars in a giant lot, soaps them all, then brushes them all. A generator pipeline is that tunnel: each item flows through every stage <b>before</b> the next item is even read, so memory holds about one car at a time.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Write each processing step as a tiny generator that takes an iterable in and yields results out. Then <b>plug them together</b> like Lego or Unix pipes (<code>cat log | grep ERROR | wc -l</code>):</p>
<pre>def read_lines(path):
    with open(path) as f:
        for line in f:
            yield line.rstrip('\\n')

def parse(lines):
    for line in lines:
        level, service, msg = line.split(' ', 2)
        yield level, service, msg

def errors_only(records):
    for rec in records:
        if rec[0] == 'ERROR':
            yield rec

pipeline = errors_only(parse(read_lines('app.log')))   # nothing has run yet!
for level, service, msg in pipeline:                    # pulling starts the flow
    print(service, msg)</pre>
<p>🔵 <b>How the flow works — "pull" model.</b> Building the pipeline does nothing. The <b>consumer at the end</b> calls <code>next()</code> on the last stage; that stage calls <code>next()</code> on the one before it, and so on back to the source. One line is read, travels forward through each stage, and pops out the end (or gets dropped by a filter). Then the next line.</p>
${H.table(['', 'Eager (lists at each step)', 'Lazy pipeline (generators)'], [['Memory', 'O(n) per stage — 3 stages = 3 full copies', 'O(1) — about one item in flight'], ['First result appears', 'after the WHOLE file is processed', 'after the first matching line'], ['Stop early (first 10 errors)', 'still reads everything', 'stops reading at the 10th'], ['Infinite input (tail -f, socket)', '❌ never finishes', '✅ works'], ['Re-iterate', '✅', '❌ rebuild the pipeline']])}
<p><b>Generator expressions make one-line stages:</b></p>
<pre>lines   = (line.strip() for line in open('access.log'))
fields  = (line.split() for line in lines)
sizes   = (int(f[-1]) for f in fields if f[-1].isdigit())
print(sum(sizes))        # one pass, flat memory, even for a 50 GB log</pre>
<p><b>Stage types you will write again and again:</b> <i>source</i> (read file/DB/API pages), <i>map</i> (transform each item), <i>filter</i> (drop items), <i>stateful</i> (dedupe with a <code>seen</code> set, sliding windows, batching), and <i>sink</i> (<code>sum</code>, <code>Counter</code>, write to file, insert into DB). Keep each stage small, single-purpose, and testable with a plain list as input.</p>`,
    clues: [
      '"log file is 50 GB / does not fit in memory" → generator pipeline: read → parse → filter → aggregate in one pass',
      '"process records as they arrive" / "streaming" / "tail -f" → lazy stages, consumer pulls',
      '"find the first N matching" in huge input → lazy pipeline + <code>islice</code>; stops reading early',
      '"paginated API — fetch all pages" → a source generator that yields items page by page',
      '"ETL step", "data cleaning stages", "composable transformations" → small generator functions chained together',
      '"batch inserts of 1000 rows" → a batching stage (<code>itertools.batched</code>) right before the sink'
    ],
    code: [{ lang: 'python', run: true, title: 'A log-processing pipeline (fake file in memory)', code: `import io
from collections import Counter

LOG = io.StringIO("""INFO auth user logged in
ERROR payments card declined
WARN search slow query
ERROR payments timeout
ERROR auth bad token
INFO search ok
""")

def read_lines(f):
    for line in f:                      # files are lazy line iterators
        line = line.strip()
        if line:
            yield line

def parse(lines):
    for line in lines:
        level, service, msg = line.split(' ', 2)
        yield {'level': level, 'service': service, 'msg': msg}

def only(level, records):
    return (r for r in records if r['level'] == level)   # genexp stage

errors = only('ERROR', parse(read_lines(LOG)))   # nothing has run yet
counts = Counter(r['service'] for r in errors)   # the sink pulls everything through
print(counts.most_common())                      # [('payments', 2), ('auth', 1)]` }, { lang: 'python', run: true, title: 'Watching the interleaving (trace prints)', code: `def source(xs):
    for x in xs:
        print(f'read   {x}')
        yield x

def double(xs):
    for x in xs:
        print(f'double {x}')
        yield x * 2

def evens_over_4(xs):
    for x in xs:
        if x > 4:
            print(f'keep   {x}')
            yield x

for result in evens_over_4(double(source([1, 3, 5]))):
    print(f'GOT    {result}')
# read 1, double 1 (dropped), read 3, double 3, keep 6, GOT 6, read 5 ...` }],
    codeTitle: ['Pipeline + Counter sink', 'Proof that items flow one at a time'],
    viz: [{
      title: 'Items flowing one at a time through a pipeline of generator stages',
      input: '5 -2 x 3 12',
      inputLabel: 'Raw lines (space separated; non-numbers are junk)',
      gen: function (input) {
        var raw = words(input);
        if (!raw.length) throw new Error('Type a few values, e.g. 5 -2 x 3 12');
        if (raw.length > 8) throw new Error('Use at most 8 values');
        var code = ['def parse(lines):', '    for s in lines:', "        if s.lstrip('-').isdigit():", '            yield int(s)', 'def positive(ns):', '    for n in ns:', '        if n > 0: yield n', 'def square(ns):', '    for n in ns: yield n * n', '', 'total = sum(square(positive(parse(src))))'].join('\n');
        var nodes = [{ id: 'S', label: 'src', x: 6, y: 25, shape: 'box' }, { id: 'P', label: 'parse', x: 28, y: 25, shape: 'box' }, { id: 'F', label: 'positive', x: 50, y: 25, shape: 'box' }, { id: 'M', label: 'square', x: 72, y: 25, shape: 'box' }, { id: 'K', label: 'sum()', x: 93, y: 25, shape: 'box' }];
        var edges = [['S', 'P'], ['P', 'F'], ['F', 'M'], ['M', 'K']];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'Pipeline (consumer pulls from the right)', directed: true, height: 50, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        var frames = [], total = 0, done = [];
        function srcArr(i, cls) { var h = {}; for (var k = 0; k < i; k++) h[k] = 'done'; if (i < raw.length && cls) h[i] = cls; return { type: 'array', label: 'src lines', values: raw.slice(), hl: h, ptr: i < raw.length ? (function () { var p = {}; p[i] = 'next'; return p; })() : {} }; }
        frames.push(fr('Building <code>square(positive(parse(src)))</code> creates three paused generators and runs <b>nothing</b>. Only when <code>sum()</code> starts pulling does data move.', [g({ K: 'cur' }), cp(code, 11), srcArr(0), vp({ total: 0, 'items in flight': 0 })]));
        raw.forEach(function (s, i) {
          frames.push(fr('<code>sum()</code> asks square → positive → parse → src for a value. src hands over <b>' + esc(s) + '</b>.', [g({ S: 'cur', P: 'win' }, { 'S-P': 'cur' }, { P: s }), cp(code, 2), srcArr(i, 'cur'), vp({ total: total, 'items in flight': 1 }, 'items in flight', 'cur')]));
          var isNum = /^-?\d+$/.test(s);
          if (!isNum) {
            frames.push(fr('parse: <b>' + esc(s) + '</b> is not a number → dropped. parse simply loops and asks src for the next line. square and positive are still waiting; they never saw it.', [g({ P: 'bad' }, {}, { P: s + ' ✗' }), cp(code, 3, 'bad'), srcArr(i, 'bad'), vp({ total: total, 'items in flight': 0 })]));
            return;
          }
          var n = parseInt(s, 10);
          frames.push(fr('parse yields int <b>' + n + '</b> to positive.', [g({ P: 'ok', F: 'cur' }, { 'P-F': 'ok' }, { F: String(n) }), cp(code, 4, 'ok'), srcArr(i, 'cur'), vp({ total: total, 'items in flight': 1 })]));
          if (n <= 0) {
            frames.push(fr('positive: ' + n + ' is not &gt; 0 → dropped. positive asks parse for another value, which asks src… The pull chain restarts from the source.', [g({ F: 'bad' }, {}, { F: n + ' ✗' }), cp(code, 7, 'bad'), srcArr(i, 'bad'), vp({ total: total, 'items in flight': 0 })]));
            return;
          }
          frames.push(fr('positive yields ' + n + ' → square yields <b>' + (n * n) + '</b>.', [g({ F: 'ok', M: 'ok' }, { 'F-M': 'ok', 'M-K': 'cur' }, { M: String(n * n) }), cp(code, 9, 'ok'), srcArr(i, 'cur'), vp({ total: total, 'items in flight': 1 })]));
          total += n * n; done.push(n * n);
          frames.push(fr('sum() adds ' + (n * n) + ' → total = <b>' + total + '</b>. The item is gone from memory; only the running total and the paused generator frames remain.', [g({ K: 'sel' }, { 'M-K': 'ok' }, { K: String(total) }), cp(code, 11, 'sel'), srcArr(i + 1), vp({ total: total, 'items in flight': 0 }, 'total', 'sel')]));
        });
        frames.push(fr('src is exhausted → StopIteration propagates parse → positive → square → <code>sum()</code> returns <b>' + total + '</b>. Peak memory held about <b>one</b> item, whatever the input size. Values summed: ' + (done.length ? done.join(' + ') : '(none)') + '.', [g({ S: 'done', P: 'done', F: 'done', M: 'done', K: 'sel' }, {}, { K: String(total) }), cp(code, 11, 'sel'), srcArr(raw.length), vp({ total: total }, 'total', 'sel')]));
        return frames;
      }
    }, {
      title: 'Eager lists vs lazy pipeline: order of work',
      input: '1 3 5',
      inputLabel: 'Numbers (max 5)',
      gen: function (input) {
        var xs = nums(input, 5);
        var eager = [], lazy = [];
        xs.forEach(function (x) { eager.push(['read ' + x]); });
        xs.forEach(function (x) { eager.push(['double ' + x + ' → ' + (2 * x)]); });
        xs.forEach(function (x) { if (2 * x > 4) eager.push(['keep ' + (2 * x)]); });
        xs.forEach(function (x) { lazy.push(['read ' + x]); lazy.push(['double ' + x + ' → ' + (2 * x)]); if (2 * x > 4) { lazy.push(['keep ' + (2 * x)]); lazy.push(['GOT ' + (2 * x)]); } });
        var firstGotEager = eager.length + 1, firstGotLazy = -1;
        lazy.forEach(function (r, i) { if (firstGotLazy < 0 && r[0].indexOf('GOT') === 0) firstGotLazy = i + 1; });
        var frames = [];
        frames.push(fr('Same job twice: double each number and keep results &gt; 4. <b>Eager</b> builds a full list after each step; <b>lazy</b> chains generators.', [cpm(['# eager', 'a = [x for x in src]', 'b = [x * 2 for x in a]', 'c = [x for x in b if x > 4]', '', '# lazy', 'a = (x for x in src)', 'b = (x * 2 for x in a)', 'c = (x for x in b if x > 4)'].join('\n'), { 2: 'cur', 7: 'win' }), vp({ input: '[' + xs.join(', ') + ']' })]));
        for (var k = 1; k <= Math.max(eager.length, lazy.length); k += Math.max(1, Math.floor(Math.max(eager.length, lazy.length) / 4))) {
          frames.push(fr('After ' + k + ' units of work. Eager is still doing step-by-step whole-list passes; lazy has already ' + (firstGotLazy > 0 && k >= firstGotLazy ? '<span class="c-g">delivered a result</span>' : 'sent the first item through every stage') + '.', [{ type: 'table', label: 'Eager trace', columns: ['work done (in order)'], rows: eager.slice(0, k), hl: (function () { var h = {}; h[Math.min(k, eager.length) - 1] = 'cur'; return h; })() }, { type: 'table', label: 'Lazy trace', columns: ['work done (in order)'], rows: lazy.slice(0, k), hl: (function () { var h = {}; h[Math.min(k, lazy.length) - 1] = lazy[Math.min(k, lazy.length) - 1][0].indexOf('GOT') === 0 ? 'sel' : 'cur'; return h; })() }]));
        }
        frames.push(fr('<b>Result:</b> both produce the same values, but the lazy pipeline delivered its first result after <b>' + (firstGotLazy > 0 ? firstGotLazy : '—') + '</b> steps while eager needs all <b>' + eager.length + '</b> steps (plus 3 full lists in memory) before anything is usable. With 10<sup>9</sup> lines, that is the difference between "instant + flat memory" and "out of memory".', [{ type: 'table', label: 'Eager (complete)', columns: ['work'], rows: eager }, { type: 'table', label: 'Lazy (complete)', columns: ['work'], rows: lazy, hl: (function () { var h = {}; lazy.forEach(function (r, i) { if (r[0].indexOf('GOT') === 0) h[i] = 'sel'; }); return h; })() }]));
        return frames;
      }
    }],
    examples: [
      { title: 'Stop early: the first 2 errors in a "huge" stream', html: `<p>Because each stage is lazy, <code>islice(..., 2)</code> stops pulling after the 2nd match and the source is never read further. The counter proves that only 5 of 1,000,000 lines were touched.</p>`, code: { lang: 'python', run: true, code: `from itertools import islice

touched = 0
def lines():
    global touched
    for i in range(1_000_000):
        touched += 1
        yield 'ERROR db down' if i in (2, 4) else 'INFO ok'

errors = (l for l in lines() if l.startswith('ERROR'))
print(list(islice(errors, 2)))
print('lines read:', touched)    # 5, not 1,000,000` } },
      { title: 'Stateful stages: dedupe and batching', html: `<p>Stages can keep state between items: a <code>seen</code> set for de-duplication, or a buffer for batches. Here we dedupe user ids and send them to a fake DB in batches of 3 (<code>itertools.batched</code>, Python 3.12+).</p>${H.arr(['u1', 'u2', 'u1', 'u3', 'u4', 'u2', 'u5'], { label: 'stream', hl: { 2: 'r', 5: 'r' } })}<p>Red = duplicates dropped; batches: (u1,u2,u3) (u4,u5).</p>`, code: { lang: 'python', run: true, code: `from itertools import batched

def unique(items):
    seen = set()                 # state that lives across next() calls
    for x in items:
        if x not in seen:
            seen.add(x)
            yield x

stream = ['u1', 'u2', 'u1', 'u3', 'u4', 'u2', 'u5']
for batch in batched(unique(stream), 3):
    print('INSERT batch', batch)` } },
      { title: 'Predict the output: errors surface at consumption time', html: `<p>A bad value in the input does not fail when you <b>build</b> the pipeline — only when the consumer reaches it. The traceback points at the stage, but the trigger is the consumer. Good pipelines validate or catch per item.</p>${H.table(['Line', 'What happens'], [['<code>p = (int(s) for s in data)</code>', 'nothing — lazy'], ['<code>next(p)</code>', '1'], ['<code>next(p)</code>', '2'], ['<code>next(p)</code>', H.c('r', 'ValueError: invalid literal')]])}`, code: { lang: 'python', run: true, code: `data = ['1', '2', 'oops', '4']
p = (int(s) for s in data)        # no error here
print(next(p), next(p))           # 1 2
try:
    next(p)
except ValueError as e:
    print('failed late:', e)

def safe_ints(items):
    for s in items:
        try:
            yield int(s)
        except ValueError:
            continue              # skip bad rows (log them in real code)
print(list(safe_ints(data)))      # [1, 2, 4]` } },
      { title: 'A paginated API as a source generator', html: `<p>Clients of paginated APIs (GitHub, Stripe, cloud SDK "paginators") expose a generator that hides the page-fetching. Callers just loop over items; pages are fetched only when needed.</p>`, code: { lang: 'python', run: true, code: `FAKE_API = {None: ([1, 2, 3], 'p2'), 'p2': ([4, 5], 'p3'), 'p3': ([6], None)}
calls = 0

def fetch_page(token):
    global calls
    calls += 1
    return FAKE_API[token]          # (items, next_token)

def all_items():
    token = None
    while True:
        items, token = fetch_page(token)
        yield from items
        if token is None:
            return

print(next(x for x in all_items() if x > 2), 'after', calls, 'call(s)')   # 3 after 1 call
print(list(all_items()))` } }
    ],
    deepDive: `<p>🟣 <b>Cost model.</b> Every stage adds one generator resume per item — roughly 30–80 ns in CPython 3.12/3.13. Five stages over 10<sup>8</sup> lines is tens of seconds of pure overhead. Fusing stages (one generator doing parse+filter), using built-ins in C (<code>map</code> with a builtin, <code>filter(None, …)</code>, <code>itertools</code>), or switching to columnar tools (polars, pandas, DuckDB, Arrow) for numeric workloads can be 10–100× faster. Pipelines shine for I/O-bound, heterogeneous, or unbounded streams; dataframes shine for bounded numeric/tabular data.</p>
<p><b>Resource lifetime.</b> A source like <code>with open(path) as f: yield from f</code> keeps the file open while the generator is suspended. If the consumer stops early and keeps a reference to the pipeline, the file stays open until the generator is closed or garbage-collected (immediate in CPython via refcounting, delayed in PyPy). Production code wraps the pipeline: <code>with contextlib.closing(pipeline) as p:</code> or makes the caller own the resource and pass the open file in.</p>
<p><b>Push vs pull.</b> Generators are pull-based: the consumer controls the speed, giving natural back-pressure. Push-based pipelines (callbacks, <code>send()</code>-based coroutine sinks, reactive streams) let the producer drive. For async I/O, use <b>async generators</b> (<code>async def … yield</code>, consumed with <code>async for</code>) so a slow network read doesn't block the event loop — same pipeline shape, cooperative concurrency.</p>
<p><b>Fan-out and parallelism.</b> One generator cannot be consumed by two stages independently; <code>itertools.tee</code> buffers the difference (memory grows if one branch lags). Generators cannot be pickled, so you cannot ship them to <code>multiprocessing</code> workers — instead feed items with <code>pool.imap(func, iterable, chunksize=…)</code>, which is itself lazy and order-preserving.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> data and ML pipelines (embedding millions of documents, cleaning training data, streaming LLM outputs to a UI) are exactly generator pipelines. Assistants happily scaffold them, but they love <code>readlines()</code>, <code>list(...)</code> "for safety", and <code>json.load</code> on a 20 GB file — each one silently converts your stream back into an out-of-memory crash.</p>
<p><b>Use AI as a partner:</b> <code>"Mark every place in this pipeline where the whole dataset is materialised in memory"</code>; <code>"Add batching of 100 before the embedding API call and retry with backoff per batch"</code>; <code>"Write tests that feed each stage a 3-item list"</code>.</p>
<p><b>Where AI goes wrong:</b> it reuses an exhausted generator between two stages, opens files inside a generator without closing on early exit, swallows all exceptions in a stage (data silently disappears), and assumes pipeline order when it uses thread pools that reorder results.</p>
<p><b>What you must own:</b> the pull model, where memory is actually held, where errors surface, and the judgment call of when a generator pipeline should be replaced by a dataframe, DuckDB query, or a proper streaming system (Kafka/Beam/Flink).</p>`,
    problems: [{
      title: 'Top Failing Services in a Huge Log', level: 'Medium', tags: ['generator pipeline', 'Counter', 'streaming'], companies: ['Datadog', 'Amazon', 'Splunk', 'Cloudflare'],
      statement: `<p>A log file has lines like <code>2026-10-14T10:00:01 ERROR payments card declined</code> (timestamp, level, service, message). Some lines are malformed (fewer than 4 fields). Return the <code>k</code> services with the most <code>ERROR</code> lines as <code>[(service, count), …]</code>, highest first. The file is 80 GB — use constant memory with respect to the number of lines.</p>`,
      constraints: `Lines ≤ 10<sup>9</sup>, distinct services ≤ 10<sup>4</sup>, 1 ≤ k ≤ 100. Memory: O(services), not O(lines).`,
      example: `<p>Lines: ERROR payments, ERROR auth, INFO search, ERROR payments, <span class="c-r">garbage</span>, ERROR search → counts ${H.kv([['payments', 2], ['auth', 1], ['search', 1]], { hl: { payments: 'g' } })} k = 2 → <code>[('payments', 2), ('auth', 1)]</code> (ties keep first-seen order with Counter.most_common).</p>`,
      brute: { why: `<p><code>f.readlines()</code> loads all 80 GB into a list, then a list of split lines, then a filtered list — three full copies. It dies with MemoryError long before counting. The wasted work: keeping every line alive when each one is needed for only an instant.</p>`, code: `import io

def top_failing_brute(f, k):
    lines = f.readlines()                       # whole file in RAM
    parts = [l.split(' ', 3) for l in lines]    # second full copy
    errors = [p for p in parts if len(p) == 4 and p[1] == 'ERROR']   # third copy
    counts = {}
    for p in errors:
        counts[p[2]] = counts.get(p[2], 0) + 1
    return sorted(counts.items(), key=lambda kv: -kv[1])[:k]

print(top_failing_brute(io.StringIO('t ERROR a x\\nt ERROR a y\\nt INFO b z\\n'), 1))` },
      mcq: { q: 'Which piece of the solution is allowed to grow with the input size?', options: ['Only the Counter of services (bounded by distinct services)', 'A list of all ERROR lines', 'A list of all lines', 'Nothing may grow at all, not even counts'], answer: 0, explain: 'Lines stream through generators one at a time. The only accumulated state is the per-service count, which is bounded by the number of distinct services (10^4), not by the 10^9 lines.' },
      hints: [`<p>Hint 1: A file object is already a lazy iterator of lines. Never call <code>read()</code> or <code>readlines()</code>.</p>`, `<p>Hint 2: Stages: <code>parse</code> (split with maxsplit=3, skip malformed lines) → <code>filter</code> level == 'ERROR' → <code>map</code> to service → sink <code>Counter</code>. <code>Counter(iterable)</code> consumes the pipeline.</p>`, `<p>Hint 3: <code>counter.most_common(k)</code> uses a heap internally (O(m log k)). Edge cases: blank lines, lines with extra spaces in the message (maxsplit keeps them together), lowercase levels if the format is messy.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_run',
        cases: [
          [
            [
              'import io\n' +
                'log = io.StringIO(\'t1 ERROR payments card declined\\nt2 ERROR auth bad token\\nt3 INFO search ok\\nt4 ERROR payments timeout\\ngarbage\\nt5 ERROR search index missing\\n\')\n' +
                'result = top_failing(log, 2)'
            ],
            [['payments', 2], ['auth', 1]]
          ],
          [['import io\nlog = io.StringIO(\'\')\nresult = top_failing(log, 3)'], []],
          [
            [
              'import io\n' +
                'log = io.StringIO(\'garbage\\nalso bad\\n\')\n' +
                'result = top_failing(log, 2)'
            ],
            []
          ],
          [
            [
              'import io\n' +
                'log = io.StringIO(\'t ERROR a x\\n\')\n' +
                'result = top_failing(log, 5)'
            ],
            [['a', 1]]
          ],
          [
            [
              'import io\n' +
                'log = io.StringIO(\'t ERROR a x\\nt error a x\\nt WARN a x\\n\')\n' +
                'result = top_failing(log, 3)'
            ],
            [['a', 1]]
          ],
          [
            [
              'import io\n' +
                'log = io.StringIO(\'t ERROR a\\nt ERROR b msg with many words here\\n\')\n' +
                'result = top_failing(log, 2)'
            ],
            [['b', 1]]
          ],
          [
            [
              'import io\n' +
                'log = io.StringIO(\'t ERROR b m\\nt ERROR a m\\nt ERROR a m\\nt ERROR c m\\nt ERROR c m\\nt ERROR b m\\n\')\n' +
                'result = top_failing(log, 3)'
            ],
            [['b', 2], ['a', 2], ['c', 2]]
          ],
          [
            [
              'import io\n' +
                'log = io.StringIO(\'t ERROR a m\\nt ERROR a m\\nt ERROR a m\\nt ERROR a m\\nt ERROR a m\\nt ERROR b m\\nt ERROR b m\\nt ERROR b m\\n\')\n' +
                'result = top_failing(log, 1)'
            ],
            [['a', 5]]
          ],
          [
            ['result = top_failing((\'t ERROR s%d msg\\n\' % (i % 100) for i in range(10**6)), 3)'],
            [['s0', 10000], ['s1', 10000], ['s2', 10000]]
          ],
          [
            ['result = top_failing([\'t ERROR a x\\n\', \'t ERROR b x\\n\', \'t ERROR b x\\n\'], 100)'],
            [['b', 2], ['a', 1]]
          ],
          [
            [
              'result = top_failing(((\'t ERROR s%d m\\n\' % (i % 10000)) if i % 3 else \'junk\\n\' for i in range(300000)), 1)[0][1] > 0'
            ],
            true
          ],
          [
            [
              'import io\n' +
                'result = top_failing(io.StringIO(\'t ERROR a m\\n\' * 1000 + \'t ERROR b m\'), 2)'
            ],
            [['a', 1000], ['b', 1]]
          ]
        ],
        harness: {
          python: 'def t_run(src):\n' +
            '    ns = dict(globals())\n' +
            '    try:\n' +
            '        exec(src, ns)\n' +
            '        return ns[\'result\']\n' +
            '    except Exception as e:\n' +
            '        return \'!\' + type(e).__name__'
        }
      },
      solution: {
        approach: `<p>Three small generator stages and a Counter sink. Each line is split once, inspected and dropped. Memory is O(distinct services). <code>most_common(k)</code> picks the top k with a heap.</p>`,
        code: { lang: 'python', run: true, code: `import io
from collections import Counter

def parse(lines):
    """Yield (level, service) for well-formed lines; skip garbage."""
    for line in lines:
        parts = line.split(' ', 3)      # ts, level, service, message
        if len(parts) == 4:
            yield parts[1], parts[2]

def errors_by_service(records):
    return (service for level, service in records if level == 'ERROR')

def top_failing(f, k):
    return Counter(errors_by_service(parse(f))).most_common(k)

log = io.StringIO(
    "t1 ERROR payments card declined\\n"
    "t2 ERROR auth bad token\\n"
    "t3 INFO search ok\\n"
    "t4 ERROR payments timeout\\n"
    "garbage\\n"
    "t5 ERROR search index missing\\n")
print(top_failing(log, 2))   # [('payments', 2), ('auth', 1)]` },
        dry: { head: ['line', 'parse yields', 'is ERROR?', 'Counter after'], rows: [['t1 ERROR payments …', "('ERROR','payments')", 'yes', '{payments:1}'], ['t2 ERROR auth …', "('ERROR','auth')", 'yes', '{payments:1, auth:1}'], ['t3 INFO search ok', "('INFO','search')", '<span class="c-r">no</span>', 'unchanged'], ['t4 ERROR payments …', "('ERROR','payments')", 'yes', '{payments:2, auth:1}'], ['garbage', '<span class="c-r">skipped</span>', '—', 'unchanged'], ['t5 ERROR search …', "('ERROR','search')", 'yes', '{payments:2, auth:1, search:1}']] },
        complexity: `<p>Time O(L) for L lines + O(S log k) for the top-k. Memory O(S) for S distinct services (plus one line in flight).</p>`,
        followUps: ['Count errors per service per hour without keeping lines (key = (service, ts[:13])).', 'The file is gzip-compressed: what changes? (gzip.open(path, "rt") is also a lazy line iterator.)', 'How would you parallelise over 50 files? (multiprocessing.Pool.imap_unordered per file + merge Counters with +=.)']
      }
    }]
  });

  /* ================= TOPIC 5: itertools ================= */
  topics.push({
    title: 'itertools: The Standard Toolbox of Lazy Building Blocks',
    analogy: `<p><code>itertools</code> is a <b>professional kitchen's knife roll</b>. You could cut everything with one butter knife (hand-written loops), but the chef reaches for the right blade: a peeler (<code>islice</code>), a mandoline that slices forever (<code>count</code>, <code>cycle</code>), a sorter that bunches same items together (<code>groupby</code>), a set of moulds that make every combination (<code>product</code>, <code>permutations</code>, <code>combinations</code>). Each tool is sharp (written in C), tested, and works on a conveyor belt (lazy).</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> <code>itertools</code> is a standard-library module of functions that take iterables and return <b>lazy iterators</b>. They let you express loops as small, readable building blocks — and they run at C speed.</p>
<h4>1. Infinite iterators (always pair with something that stops them)</h4>
${H.table(['Tool', 'Yields', 'Example'], [['<code>count(start=0, step=1)</code>', 'start, start+step, …', '<code>count(10, 5)</code> → 10 15 20 …'], ['<code>cycle(it)</code>', 'items of it, again and again', '<code>cycle("AB")</code> → A B A B …'], ['<code>repeat(x, n=∞)</code>', 'x, x, x …', '<code>repeat(0, 3)</code> → 0 0 0']])}
<h4>2. Iterators that slice, filter, combine</h4>
${H.table(['Tool', 'What it does', 'Example → result'], [['<code>islice(it, stop)</code> / <code>(it, start, stop, step)</code>', 'slice ANY iterator lazily', '<code>islice(count(), 2, 8, 2)</code> → 2 4 6'], ['<code>chain(a, b, …)</code>, <code>chain.from_iterable(xs)</code>', 'glue iterables end to end', '<code>chain("ab", [1])</code> → a b 1'], ['<code>accumulate(it, func=add, initial=None)</code>', 'running totals (or running max, product…)', '<code>accumulate([1,2,3])</code> → 1 3 6'], ['<code>pairwise(it)</code> (3.10+)', 'overlapping pairs', '<code>pairwise("abc")</code> → ab bc'], ['<code>batched(it, n)</code> (3.12+)', 'tuples of size n (last may be short)', '<code>batched("abcde", 2)</code> → ab cd e'], ['<code>groupby(it, key=None)</code>', 'runs of <b>consecutive</b> equal keys', '<code>groupby("aabca")</code> → a:aa b:b c:c a:a'], ['<code>takewhile(p, it)</code> / <code>dropwhile(p, it)</code>', 'take / skip while predicate holds, then stop / pass rest', '<code>takewhile(lambda x: x&lt;3, [1,2,5,1])</code> → 1 2'], ['<code>filterfalse(p, it)</code>, <code>compress(data, selectors)</code>', 'opposite of filter; mask filter', '<code>compress("abc", [1,0,1])</code> → a c'], ['<code>starmap(f, it)</code>', '<code>f(*args)</code> for each tuple', '<code>starmap(pow, [(2,3)])</code> → 8'], ['<code>zip_longest(a, b, fillvalue=None)</code>', 'zip that pads the shorter one', '<code>zip_longest("ab", "x", fillvalue="-")</code> → (a,x) (b,-)'], ['<code>tee(it, n=2)</code>', 'split one iterator into n independent ones', 'buffers items until all copies read them']])}
<h4>3. Combinatoric iterators</h4>
${H.table(['Tool', 'Meaning', 'Count for n items, length r', '"ABC", r=2'], [['<code>product(A, repeat=r)</code>', 'every r-length sequence (nested loops)', 'n<sup>r</sup>', 'AA AB AC BA BB BC CA CB CC (9)'], ['<code>permutations(A, r)</code>', 'ordered, no reuse', 'n! / (n−r)!', 'AB AC BA BC CA CB (6)'], ['<code>combinations(A, r)</code>', 'unordered, no reuse', 'C(n, r)', 'AB AC BC (3)'], ['<code>combinations_with_replacement(A, r)</code>', 'unordered, reuse allowed', 'C(n+r−1, r)', 'AA AB AC BB BC CC (6)']])}
<p>All combinatoric outputs come in <b>lexicographic order of input positions</b> — if the input is sorted, the output is sorted. They treat elements by <b>position</b>, not value, so duplicates in the input give duplicate outputs (<code>set()</code> them or use a smarter algorithm).</p>
<p>🔵 <b>The groupby trap.</b> <code>groupby</code> only groups <b>neighbours</b>. To group all equal keys, <b>sort by the same key first</b> — or just use a <code>defaultdict(list)</code>. Also, each group is a sub-iterator sharing the parent's bookmark: advance the outer iterator and the previous group becomes empty, so convert with <code>list(group)</code> right away if you need it later.</p>`,
    clues: [
      '"run-length encoding" / "compress consecutive characters" / "longest streak" → <code>groupby</code>',
      '"all pairs / all subsets of size k / every ordering" with small n (≤ 10–12) → <code>combinations</code>, <code>permutations</code>, <code>product</code>',
      '"every combination of options/flags/grid of hyper-parameters" → <code>product(*option_lists)</code> instead of nested loops',
      '"running sum / prefix sums / running max" → <code>accumulate</code> (with <code>initial=0</code> for prefix sums)',
      '"compare each element with the next" / "differences between consecutive" → <code>pairwise</code>',
      '"first k items of a generator" / "skip the header" → <code>islice</code>; "chunks of size n" → <code>batched</code>',
      '"round-robin / repeat a pattern" → <code>cycle</code>; "infinite IDs" → <code>count</code>'
    ],
    code: [{ lang: 'python', run: true, title: 'A tour of the most-used tools', code: `from itertools import (count, cycle, islice, chain, accumulate, pairwise,
                       batched, groupby, takewhile, dropwhile, product,
                       permutations, combinations, zip_longest, starmap)
import operator

print(list(islice(count(10, 5), 4)))                  # [10, 15, 20, 25]
print(list(islice(cycle('AB'), 5)))                   # ['A', 'B', 'A', 'B', 'A']
print(list(chain([1, 2], 'ab', range(2))))            # [1, 2, 'a', 'b', 0, 1]
print(list(accumulate([3, 1, 4, 1, 5])))              # running sum [3, 4, 8, 9, 14]
print(list(accumulate([3, 1, 4, 1, 5], max)))         # running max [3, 3, 4, 4, 5]
print(list(accumulate([1, 2, 3], initial=0)))         # prefix sums [0, 1, 3, 6]
print([b - a for a, b in pairwise([1, 4, 9, 16])])    # differences [3, 5, 7]
print(list(batched('abcdefg', 3)))                    # [('a','b','c'), ('d','e','f'), ('g',)]
print([(k, len(list(g))) for k, g in groupby('aaabccaa')])   # runs, not totals
print(list(takewhile(lambda x: x < 5, [1, 3, 7, 2])))  # [1, 3]
print(list(dropwhile(lambda x: x < 5, [1, 3, 7, 2])))  # [7, 2]
print(list(zip_longest('abc', [1], fillvalue='-')))   # [('a', 1), ('b', '-'), ('c', '-')]
print(list(starmap(operator.mul, [(2, 3), (4, 5)])))  # [6, 20]
print(len(list(product('ABC', repeat=2))),            # 9
      len(list(permutations('ABC', 2))),              # 6
      len(list(combinations('ABC', 2))))              # 3` }],
    codeTitle: ['itertools tour (runnable)'],
    viz: [{
      title: 'groupby: grouping CONSECUTIVE equal keys',
      input: 'AAABBCAA',
      inputLabel: 'A string (max 14 chars)',
      gen: function (input) {
        var s = String(input).replace(/\s+/g, '');
        if (!s.length) throw new Error('Type a string like AAABBCAA');
        if (s.length > 14) throw new Error('Use at most 14 characters');
        var chars = s.split(''), frames = [], rows = [], code = ['from itertools import groupby', 'for key, group in groupby(' + "'" + s + "'" + '):', '    print(key, list(group))'].join('\n');
        frames.push(fr('<code>groupby</code> walks the string <b>once</b>, left to right. It starts a new group <b>every time the key changes</b> from the previous character.', [cp(code, 2), { type: 'array', label: 'input', values: chars }, { type: 'table', label: 'Groups produced', columns: ['key', 'group'], rows: [] }]));
        var i = 0, gi = 0, colors = ['ok', 'win', 'sel', 'cur'];
        while (i < chars.length) {
          var j = i;
          while (j < chars.length && chars[j] === chars[i]) j++;
          var hl = {};
          for (var k = 0; k < i; k++) hl[k] = 'done';
          for (k = i; k < j; k++) hl[k] = colors[gi % colors.length];
          var ptr = {}; ptr[i] = 'start'; if (j < chars.length) ptr[j] = 'key changes';
          var seenBefore = rows.some(function (r) { return r[0] === chars[i]; });
          rows.push([chars[i], '[' + chars.slice(i, j).map(function (c) { return "'" + c + "'"; }).join(', ') + ']']);
          var rhl = {}; rhl[rows.length - 1] = seenBefore ? 'bad' : 'ok';
          frames.push(fr('New key <b>' + esc(chars[i]) + '</b> at index ' + i + '. groupby keeps pulling while the key stays <b>' + esc(chars[i]) + '</b> → a run of length ' + (j - i) + '.' + (seenBefore ? ' <span class="c-r">Notice: key ' + esc(chars[i]) + ' appears again as a SEPARATE group</span> because the earlier run was not adjacent.' : ''), [cp(code, 3, 'ok'), { type: 'array', label: 'input', values: chars, hl: hl, ptr: ptr }, vp({ key: "'" + chars[i] + "'", 'run length': j - i, 'groups so far': rows.length }, 'key'), { type: 'table', label: 'Groups produced', columns: ['key', 'group'], rows: rows.map(function (r) { return r.slice(); }), hl: rhl }]));
          i = j; gi++;
        }
        var sorted = chars.slice().sort(), totals = [];
        var a = 0;
        while (a < sorted.length) { var b = a; while (b < sorted.length && sorted[b] === sorted[a]) b++; totals.push([sorted[a], String(b - a)]); a = b; }
        frames.push(fr('Done: ' + rows.length + ' groups. If you wanted <b>totals per letter</b>, sort first (<code>groupby(sorted(s))</code>) — then equal keys become neighbours. Or skip groupby and use <code>Counter(s)</code>.', [{ type: 'array', label: 'sorted(input)', values: sorted }, { type: 'table', label: 'groupby(sorted(s)) → totals', columns: ['key', 'count'], rows: totals }, { type: 'table', label: 'groupby(s) → runs (what RLE needs)', columns: ['key', 'group'], rows: rows }]));
        frames.push(fr('<b>Shared-iterator trap:</b> each <code>group</code> reads from the same underlying iterator. <code>groups = list(groupby(s))</code> then <code>list(groups[0][1])</code> gives <b>[]</b> — the parent already moved past it. Always consume or <code>list()</code> each group inside the loop.', [cpm(['g = list(groupby(' + "'" + s + "'" + '))', 'print(list(g[0][1]))   # [] - already consumed!', '', 'safe = [(k, list(grp)) for k, grp in groupby(' + "'" + s + "'" + ')]'].join('\n'), { 2: 'bad', 4: 'ok' })]));
        return frames;
      }
    }, {
      title: 'combinations(): the index "odometer" that generates C(n, r) tuples in order',
      input: 'ABCD 2',
      inputLabel: 'Items then r, e.g. ABCD 2 (max 6 items)',
      gen: function (input) {
        var p = words(input);
        if (p.length !== 2 || !/^\d+$/.test(p[1])) throw new Error('Format: letters then r, e.g. ABCD 2');
        var items = p[0].split(''), r = parseInt(p[1], 10), n = items.length;
        if (n > 6 || n < 1) throw new Error('Use 1 to 6 items');
        if (r < 1 || r > n) throw new Error('r must be between 1 and the number of items');
        var idx = [], frames = [], got = [];
        for (var i = 0; i < r; i++) idx.push(i);
        function fact(x) { var f = 1; for (var q = 2; q <= x; q++) f *= q; return f; }
        var total = fact(n) / (fact(r) * fact(n - r));
        var code = ['def combinations(pool, r):', '    n = len(pool)', '    idx = list(range(r))', '    yield tuple(pool[i] for i in idx)', '    while True:', '        for i in reversed(range(r)):', '            if idx[i] != i + n - r: break', '        else: return', '        idx[i] += 1', '        for j in range(i + 1, r): idx[j] = idx[j - 1] + 1', '        yield tuple(pool[i] for i in idx)'].join('\n');
        function snap(narr, line, cls, bumped) {
          var hl = {}, ptr = {};
          idx.forEach(function (v, k) { hl[v] = k === bumped ? 'cur' : 'ok'; ptr[v] = 'i' + k; });
          frames.push(fr(narr, [cp(code, line, cls), { type: 'array', label: 'pool', values: items, hl: hl, ptr: ptr }, vp({ idx: '[' + idx.join(', ') + ']', 'produced': got.length + ' / ' + total }, 'idx'), { type: 'table', label: 'Tuples yielded so far', columns: ['#', 'tuple'], rows: got.map(function (t, k) { return [k + 1, t]; }), hl: (function () { var h = {}; if (got.length) h[got.length - 1] = 'sel'; return h; })() }]));
        }
        got.push('(' + idx.map(function (v) { return items[v]; }).join(', ') + ')');
        snap('Start with the smallest indices <code>[' + idx.join(', ') + ']</code> and yield the first tuple. Total to produce: C(' + n + ', ' + r + ') = <b>' + total + '</b>.', 4, 'sel', -1);
        var guard = 0;
        while (guard++ < 40) {
          var i2 = -1;
          for (var k = r - 1; k >= 0; k--) if (idx[k] !== k + n - r) { i2 = k; break; }
          if (i2 < 0) {
            frames.push(fr('Every index is at its maximum (idx[i] = i + n − r for all i) → <code>return</code> → StopIteration. Exactly <b>' + got.length + '</b> tuples, in lexicographic order, each produced lazily with O(r) work.', [cp(code, 8, 'sel'), vp({ idx: '[' + idx.join(', ') + ']', produced: got.length + ' / ' + total }, 'produced', 'sel'), { type: 'table', label: 'All tuples', columns: ['#', 'tuple'], rows: got.map(function (t, q) { return [q + 1, t]; }) }]));
            break;
          }
          idx[i2]++;
          for (var j = i2 + 1; j < r; j++) idx[j] = idx[j - 1] + 1;
          got.push('(' + idx.map(function (v) { return items[v]; }).join(', ') + ')');
          snap('Rightmost index that can still move is <b>i' + i2 + '</b>: bump it, then reset everything to its right to consecutive values. Like an odometer whose digits must stay strictly increasing. Yield <b>' + got[got.length - 1] + '</b>.', 9, 'cur', i2);
        }
        return frames;
      }
    }],
    examples: [
      { title: 'product() replaces nested loops (grid search)', html: `<p>Three nested loops over hyper-parameters become one flat loop. With <code>product(*lists)</code> you can even handle a variable number of dimensions — impossible with hard-coded nested loops.</p>${H.table(['lr', 'batch', 'layers'], [['0.1', '32', '2'], ['0.1', '32', '3'], ['…', '…', '…'], ['0.01', '64', '3']])}`, code: { lang: 'python', run: true, code: `from itertools import product

grid = {'lr': [0.1, 0.01], 'batch': [32, 64], 'layers': [2, 3]}
for values in product(*grid.values()):
    config = dict(zip(grid, values))
    print(config)
print(len(list(product(*grid.values()))), 'configs')   # 2 * 2 * 2 = 8` } },
      { title: 'Predict the output: groupby without sorting', html: `<p>Students expect <code>{'a': 3, 'b': 2}</code>, but groupby only merges neighbours, and a dict comprehension overwrites the first 'a' group with the second.</p>${H.arr(['a', 'a', 'b', 'b', 'a'], { hl: { 0: 'g', 1: 'g', 2: 'b', 3: 'b', 4: 'y' } })}<p>Output: <code>{'a': 1, 'b': 2}</code> — the last 'a' run (length 1) wins.</p>`, code: { lang: 'python', run: true, code: `from itertools import groupby
s = 'aabba'
print({k: len(list(g)) for k, g in groupby(s)})          # {'a': 1, 'b': 2}
print({k: len(list(g)) for k, g in groupby(sorted(s))})  # {'a': 3, 'b': 2}` } },
      { title: 'Two-sum style: combinations vs a hash map', html: `<p><code>combinations(nums, 2)</code> is a clean brute force — O(n²) pairs. Great for small n or for quickly writing a reference solution to test your O(n) answer against. Know both, and say which one you would ship.</p>`, code: { lang: 'python', run: true, code: `from itertools import combinations

nums, target = [2, 7, 11, 15, 3, 6], 9
pairs = [(a, b) for a, b in combinations(nums, 2) if a + b == target]
print(pairs)                         # [(2, 7), (3, 6)]

seen, fast = set(), []
for x in nums:                       # O(n) version
    if target - x in seen:
        fast.append((target - x, x))
    seen.add(x)
print(fast)` } },
      { title: 'Longest streak with groupby', html: `<p>"Longest run of consecutive wins" or "longest streak of days with commits" is groupby + max. <code>sum(1 for _ in g)</code> counts a group without building a list.</p>${H.arr(['W', 'W', 'L', 'W', 'W', 'W', 'L'], { hl: { 3: 'g', 4: 'g', 5: 'g' } })}`, code: { lang: 'python', run: true, code: `from itertools import groupby

games = 'WWLWWWL'
best = max((sum(1 for _ in g) for k, g in groupby(games) if k == 'W'), default=0)
print('longest win streak:', best)        # 3` } },
      { title: 'tee(): two passes over one iterator (and its memory cost)', html: `<p><code>tee</code> gives independent iterators over one source by buffering. If one copy runs far ahead of the other, the buffer holds everything in between — sometimes it is simpler to just use <code>list()</code>. Never touch the original iterator after teeing it.</p>`, code: { lang: 'python', run: true, code: `from itertools import tee, pairwise

def gen():
    yield from [3, 1, 4, 1, 5]

a, b = tee(gen())
print(max(a), min(b))          # 5 1  (b was buffered while max consumed a)
print(list(pairwise(gen())))   # the classic pairwise recipe is built on tee` } }
    ],
    deepDive: `<p>🟣 <b>Why itertools is fast.</b> Every tool is a C type implementing <code>tp_iternext</code> directly, so there is no Python frame per item. <code>sum(islice(...))</code>, <code>chain.from_iterable</code> or <code>accumulate</code> can be several times faster than the equivalent generator function. Combining <code>map</code>/<code>starmap</code> with built-in C functions (<code>operator.mul</code>, <code>str.upper</code>) keeps the whole loop in C.</p>
<p><b>Semantics worth knowing:</b> <code>islice</code> on an iterator <i>consumes</i> the skipped items (it cannot jump). Negative indices are not allowed because the length is unknown. <code>zip</code> stops at the shortest input and has <code>strict=True</code> (3.10+) to raise on length mismatch; <code>zip_longest</code> pads. <code>accumulate</code> accepts any binary function and an <code>initial</code> value (3.8+). <code>batched</code> got <code>strict=True</code> in 3.13 to raise if the last batch is short. <code>groupby</code> calls <code>key</code> once per element and compares with <code>==</code>.</p>
<p><b>Combinatorial explosion.</b> permutations of 12 items = 479,001,600; product of 20 binary flags = 1,048,576; combinations(50, 6) = 15,890,700. Lazy generation means you can iterate without storing them, but the <b>time</b> is still exponential. Interview signal: n ≤ 10–12 → permutations/backtracking OK; n ≤ 20 → subsets (2<sup>20</sup>) OK; bigger → you need DP, greedy, or maths, not itertools.</p>
<p><b>Recipes and beyond.</b> The docs have an official "Itertools Recipes" section (<code>take</code>, <code>nth</code>, <code>sliding_window</code>, <code>roundrobin</code>, <code>unique_everseen</code>, <code>partition</code>, <code>powerset</code>…). Many recipes became built-ins over time (<code>pairwise</code> in 3.10, <code>batched</code> in 3.12). The third-party <code>more-itertools</code> package ships all recipes plus <code>chunked</code>, <code>peekable</code>, <code>windowed</code>, <code>bucket</code>, and is a common dependency in production code.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants know every itertools function and will happily produce "clever" one-liners chaining six of them. Readability is now the bottleneck: you must judge whether <code>chain.from_iterable(starmap(...))</code> is clearer than a 4-line loop for your team.</p>
<p><b>Use AI as a partner:</b> <code>"Rewrite this nested loop with itertools and explain the time complexity"</code>; <code>"Is there an itertools recipe for this?"</code>; <code>"Generate property-based tests (hypothesis) comparing my groupby-based function with a naive loop"</code>.</p>
<p><b>Where AI goes wrong:</b> uses <code>groupby</code> on unsorted data expecting totals, stores groupby groups for later (they become empty), suggests <code>batched</code>/<code>pairwise</code> in environments stuck on old Python versions, and proposes <code>permutations</code> brute force for n = 15 (1.3 trillion tuples).</p>
<p><b>What you must own:</b> which tool fits which phrase in a question, the exact counting formulas for combinatoric iterators, the groupby adjacency rule, and when exponential enumeration is acceptable.</p>`,
    problems: [{
      title: 'Run-Length Encode and Decode', level: 'Easy', tags: ['groupby', 'chain', 'repeat', 'strings'], companies: ['Amazon', 'Microsoft', 'Goldman Sachs'],
      statement: `<p>Implement <code>encode(s)</code> that compresses runs of the same character as <i>char + count</i>: <code>"aaabccdddd"</code> → <code>"a3b1c2d4"</code>, and <code>decode(t)</code> that reverses it (counts may have several digits, e.g. <code>"x12"</code>). Use itertools.</p>`,
      constraints: `0 ≤ len(s) ≤ 10<sup>6</sup>; s has no digits; counts in t fit in an int.`,
      example: `<p>${H.arr(['a', 'a', 'a', 'b', 'c', 'c', 'd', 'd', 'd', 'd'], { hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'b', 4: 'y', 5: 'y', 6: 'p', 7: 'p', 8: 'p', 9: 'p' } })} runs a×3, b×1, c×2, d×4 → <code>"a3b1c2d4"</code>. Decoding <code>"x12y1"</code> → 12 x's then one y.</p>`,
      brute: { why: `<p>Manual index juggling with a while loop and string concatenation <code>out += ch + str(cnt)</code> works but is bug-prone (forgetting the final run is the classic bug), and repeated <code>+=</code> on strings can be O(n²) in non-CPython implementations.</p>`, code: `def encode_brute(s):
    if not s:
        return ''
    out = ''
    cnt = 1
    for i in range(1, len(s)):
        if s[i] == s[i - 1]:
            cnt += 1
        else:
            out += s[i - 1] + str(cnt)
            cnt = 1
    out += s[-1] + str(cnt)          # easy to forget the last run!
    return out

print(encode_brute('aaabccdddd'))` },
      mcq: { q: 'Which tool finds "runs of the same character" in one lazy pass?', options: ['groupby(s)', 'Counter(s)', 'combinations(s, 2)', 'accumulate(s)'], answer: 0, explain: 'groupby groups CONSECUTIVE equal items — exactly a run. Counter would merge all a\'s anywhere in the string, which breaks RLE.' },
      hints: [`<p>Hint 1: <code>groupby(s)</code> yields <code>(char, run_iterator)</code> for each run; the run length is <code>sum(1 for _ in run)</code>.</p>`, `<p>Hint 2: Build pieces in a generator and <code>''.join(...)</code> them — O(n). For decoding, a regex <code>([^0-9])([0-9]+)</code> splits t into (char, count) pairs; or use groupby with <code>key=str.isdigit</code> to separate letters from digit runs.</p>`, `<p>Hint 3: Decode = <code>''.join(ch * int(n) for ch, n in pairs)</code> or <code>chain.from_iterable(repeat(ch, int(n)) …)</code>. Edge cases: empty string, single char, multi-digit counts like 12.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_val',
        cases: [
          [['encode(\'aaabccdddd\')'], 'a3b1c2d4'],
          [['encode(\'\')'], ''],
          [['encode(\'a\')'], 'a1'],
          [['encode(\'xxxxxxxxxxxxy\')'], 'x12y1'],
          [['encode(\'aA\')'], 'a1A1'],
          [['encode(\'ab\')'], 'a1b1'],
          [['encode(\'zzzzzzzzzz\')'], 'z10'],
          [['encode(\'!!  ??\')'], '!2 2?2'],
          [['encode(\'ééé\')'], 'é3'],
          [['decode(\'x12y1\')'], 'xxxxxxxxxxxxy'],
          [['decode(\'\')'], ''],
          [['decode(\'a1\')'], 'a'],
          [['decode(\'a3b1c2d4\')'], 'aaabccdddd'],
          [['decode(\'z10\')'], 'zzzzzzzzzz'],
          [['decode(\'!2 2\')'], '!!  '],
          [['decode(\'a0b2\')'], 'bb'],
          [['decode(encode(\'a\' * 500000 + \'b\' * 500000)) == \'a\' * 500000 + \'b\' * 500000'], true],
          [['encode(\'ab\' * 500000) == \'a1b1\' * 500000'], true],
          [['encode(\'a\' * 1000000)'], 'a1000000'],
          [['decode(\'a1000000\') == \'a\' * 1000000'], true],
          [
            ['all(decode(encode(s)) == s for s in [\'abc\', \'aabbcc\', \'zzzzzzzzzzzz\', \'a b\', \'xyzzy\'])'],
            true
          ]
        ],
        harness: {
          python: 'def t_val(src):\n' +
            '    try:\n' +
            '        return eval(src)\n' +
            '    except Exception as e:\n' +
            '        return \'!\' + type(e).__name__'
        }
      },
      solution: {
        approach: `<p><b>Encode:</b> groupby gives each run; emit char + length. <b>Decode:</b> groupby with <code>key=str.isdigit</code> alternates letter-groups and digit-groups, so pairing them gives (char, count). Both are single O(n) passes.</p>`,
        code: { lang: 'python', run: true, code: `from itertools import groupby, chain, repeat

def encode(s):
    return ''.join(f'{ch}{sum(1 for _ in run)}' for ch, run in groupby(s))

def decode(t):
    # Split into alternating non-digit / digit chunks: 'x12y1' -> 'x','12','y','1'
    chunks = [''.join(g) for _, g in groupby(t, key=str.isdigit)]
    pairs = zip(chunks[0::2], chunks[1::2])            # ('x','12'), ('y','1')
    return ''.join(chain.from_iterable(repeat(ch, int(n)) for ch, n in pairs))

for s in ['aaabccdddd', 'x' * 12 + 'y', 'a', '']:
    e = encode(s)
    print(repr(s), '->', repr(e), '->', decode(e) == s)` },
        dry: { head: ['run from groupby', 'char', 'length', 'output so far'], rows: [["'aaa'", 'a', '3', 'a3'], ["'b'", 'b', '1', 'a3b1'], ["'cc'", 'c', '2', 'a3b1c2'], ["'dddd'", 'd', '4', 'a3b1c2d4']] },
        complexity: `<p>Encode and decode are O(n) time; output size O(n). groupby uses O(1) extra memory per run.</p>`,
        followUps: ['Only compress runs of length ≥ 3 (LeetCode 443 "String Compression" in place).', 'Encode a huge stream lazily: yield pieces instead of joining.', 'Decode "3[a2[c]]" nested encoding (LeetCode 394) — what structure replaces groupby?']
      }
    }]
  });

  /* ================= TOPIC 6: Context managers ================= */
  topics.push({
    title: 'Context Managers: with, __enter__/__exit__ and contextlib',
    analogy: `<p>A <b>hotel room key card</b>: at check-in (<code>__enter__</code>) you get the room set up and a key; you do whatever you like inside (the <code>with</code> body); at check-out (<code>__exit__</code>) the hotel cleans up — <b>even if</b> you leave in a hurry because the fire alarm rang (an exception). You never have to remember to clean the room yourself; the check-out step is guaranteed.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Many things must be <b>undone</b> after use: close a file, release a lock, commit or roll back a transaction, restore a setting, stop a timer. If an exception happens in the middle, people forget the undo step. The <code>with</code> statement makes the undo <b>automatic and guaranteed</b>:</p>
<pre>with open('notes.txt', 'w') as f:   # setup
    f.write('hello')                # your code
# here the file is closed — even if write() raised</pre>
<p>🔵 <b>The protocol.</b> Any object with two methods is a <b>context manager</b>:</p>
<ul>
<li><code>__enter__(self)</code> — runs at the start. Its <b>return value</b> is what <code>as name</code> binds (often <code>self</code>, but not always).</li>
<li><code>__exit__(self, exc_type, exc, tb)</code> — always runs at the end. If the body finished normally, all three arguments are <code>None</code>. If it raised, you get the exception's type, object and traceback. <b>Return a truthy value to swallow the exception</b>; return <code>None</code>/<code>False</code> to let it continue.</li>
</ul>
<p>Python runs <code>with EXPR as x: BODY</code> roughly like this:</p>
<pre>mgr = EXPR
x = mgr.__enter__()
try:
    BODY
except BaseException as e:
    if not mgr.__exit__(type(e), e, e.__traceback__):
        raise                       # not suppressed → keep propagating
else:
    mgr.__exit__(None, None, None)</pre>
<p>Notice: if <code>__enter__</code> itself fails, <code>__exit__</code> is <b>not</b> called (nothing was set up yet).</p>
<p><b>The easy way: <code>@contextlib.contextmanager</code>.</b> Write a generator with exactly <b>one</b> <code>yield</code>: code before the yield is <code>__enter__</code>, the yielded value is bound by <code>as</code>, code after the yield is <code>__exit__</code>. Wrap the yield in <code>try/finally</code> so cleanup runs on errors (an exception in the body is re-raised <i>at the yield</i>).</p>
<pre>from contextlib import contextmanager
import time

@contextmanager
def timer(label):
    start = time.perf_counter()        # __enter__
    try:
        yield                          # the with-body runs here
    finally:
        print(label, time.perf_counter() - start)   # __exit__</pre>
${H.table(['contextlib tool', 'Use it for'], [['<code>suppress(KeyError, …)</code>', 'ignore specific exceptions in a block'], ['<code>closing(obj)</code>', 'call <code>obj.close()</code> at the end (objects with close() but no with-support, generators)'], ['<code>redirect_stdout(buf)</code>', 'capture prints into a StringIO'], ['<code>nullcontext(x)</code>', '"optional" context manager that does nothing'], ['<code>ExitStack()</code>', 'enter a <b>dynamic number</b> of managers; register callbacks; unwind LIFO'], ['<code>chdir(path)</code> (3.11+)', 'temporarily change the working directory'], ['<code>ContextDecorator</code>', 'make a manager usable as a decorator too']])}
<p><b>Several at once:</b> <code>with open(a) as src, open(b, 'w') as dst:</code> — entered left to right, exited right to left. Since 3.10 you can wrap them in parentheses across lines.</p>`,
    clues: [
      '"make sure X is always closed/released/restored, even on error" → context manager (<code>with</code>)',
      '"acquire a lock", "transaction: commit or roll back", "temporary setting/env var/cwd" → <code>__enter__</code>/<code>__exit__</code> or <code>@contextmanager</code> with try/finally',
      '"measure how long this block takes" → timer context manager',
      '"ignore FileNotFoundError when deleting" → <code>contextlib.suppress</code>',
      '"open an unknown number of files/connections" → <code>ExitStack</code>',
      '"mock/patch something only inside a test" → <code>unittest.mock.patch</code> is a context manager (and decorator)',
      '"what happens if __exit__ returns True?" → the exception is swallowed'
    ],
    code: [{ lang: 'python', run: true, title: 'Class-based context manager: see every call', code: `class Resource:
    def __init__(self, name):
        self.name = name

    def __enter__(self):
        print(f'enter {self.name}')
        return self                      # bound to the 'as' variable

    def __exit__(self, exc_type, exc, tb):
        print(f'exit  {self.name}: exc_type={exc_type.__name__ if exc_type else None}')
        return exc_type is KeyError      # swallow KeyError only

with Resource('A') as r:
    print('  body uses', r.name)

with Resource('B'):
    {}['missing']                        # KeyError -> suppressed by __exit__
print('after B: still running')

try:
    with Resource('C'):
        1 / 0                            # ZeroDivisionError -> NOT suppressed
except ZeroDivisionError:
    print('caught ZeroDivisionError outside')` }, { lang: 'python', run: true, title: '@contextmanager, suppress, redirect_stdout, ExitStack', code: `import io, time
from contextlib import contextmanager, suppress, redirect_stdout, ExitStack

@contextmanager
def timer(label):
    start = time.perf_counter()
    try:
        yield start                      # value for 'as'
    finally:
        took = time.perf_counter() - start
        print(f'{label} took {took * 1000:.2f} ms')

with timer('sum'):
    total = sum(range(100_000))

with suppress(KeyError):
    {}['x']                              # silently ignored
print('suppress OK')

buf = io.StringIO()
with redirect_stdout(buf):
    print('captured!')
print('buffer has:', buf.getvalue().strip())

@contextmanager
def tag(name):
    print(f'<{name}>')
    try:
        yield
    finally:
        print(f'</{name}>')

with ExitStack() as stack:               # dynamic number of managers
    for name in ['html', 'body', 'p']:
        stack.enter_context(tag(name))
    print('   hello')                    # closes p, body, html (LIFO)` }],
    codeTitle: ['__enter__ / __exit__ in action', 'contextlib toolbox'],
    viz: [{
      title: 'with-statement flow: enter → body → exit (normal, error, suppressed)',
      input: 'error',
      inputLabel: 'Scenario: ok | error | suppress',
      gen: function (input) {
        var mode = String(input).trim().toLowerCase();
        if (['ok', 'error', 'suppress'].indexOf(mode) < 0) throw new Error('Type one of: ok, error, suppress');
        var code = ['class Guard:', '    def __enter__(self):', "        print('setup')", '        return self', '    def __exit__(self, et, e, tb):', "        print('cleanup')", '        return ' + (mode === 'suppress' ? 'True' : 'False') + '   # suppress?', '', 'with Guard() as g:', "    print('working')", '    ' + (mode === 'ok' ? "print('done')" : "raise ValueError('bad')"), "print('after with')"].join('\n');
        var nodes = [{ id: 'E', label: 'Guard()', x: 8, y: 30, shape: 'box' }, { id: 'N', label: '__enter__', x: 28, y: 30, shape: 'box' }, { id: 'B', label: 'body', x: 48, y: 30, shape: 'box' }, { id: 'X', label: '__exit__', x: 68, y: 30, shape: 'box' }, { id: 'A', label: 'after with', x: 90, y: 12, shape: 'box' }, { id: 'P', label: 'exception propagates', x: 90, y: 50, shape: 'box', w: 22 }];
        var edges = [['E', 'N'], ['N', 'B', 'as g'], ['B', 'X'], ['X', 'A'], ['X', 'P']];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'Control flow', directed: true, height: 62, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        var out = [], frames = [];
        frames.push(fr('<code>with Guard() as g:</code> — first Python evaluates the expression <code>Guard()</code>, creating the manager object.', [g({ E: 'cur' }), cp(code, 9), vp({ mgr: 'Guard object' }), outBox(out)]));
        out.push('setup');
        frames.push(fr('Python calls <code>mgr.__enter__()</code>. It does the setup work and <b>returns self</b>, which is bound to <code>g</code>. From this moment, <code>__exit__</code> is <b>guaranteed</b> to run.', [g({ N: 'cur' }, { 'E-N': 'ok' }), cpm(code, { 2: 'cur', 3: 'cur', 4: 'ok' }), vp({ mgr: 'Guard object', g: 'same Guard object' }, 'g'), outBox(out)]));
        out.push('working');
        frames.push(fr('The body runs.', [g({ B: 'cur' }, { 'N-B': 'ok' }), cp(code, 10), vp({ g: 'Guard object' }), outBox(out)]));
        if (mode === 'ok') {
          out.push('done');
          frames.push(fr('The body finishes normally.', [g({ B: 'ok' }), cp(code, 11, 'ok'), vp({ g: 'Guard object' }), outBox(out)]));
          out.push('cleanup');
          frames.push(fr('Python calls <code>__exit__(None, None, None)</code> — all three are None because there was no exception. Cleanup runs. The return value is ignored in this case.', [g({ X: 'cur' }, { 'B-X': 'ok' }), cpm(code, { 5: 'cur', 6: 'cur' }), vp({ et: 'None', e: 'None', tb: 'None' }, 'et'), outBox(out)]));
          out.push('after with');
          frames.push(fr('Execution continues after the with block. Normal path complete: setup → body → cleanup.', [g({ A: 'sel' }, { 'X-A': 'ok' }), cp(code, 12, 'sel'), outBox(out)]));
        } else {
          frames.push(fr('<code>raise ValueError(\'bad\')</code> — the body is <b>abandoned</b> mid-way. Before the exception can leave the with block, Python must call <code>__exit__</code>.', [g({ B: 'bad' }), cp(code, 11, 'bad'), vp({ exception: "ValueError('bad')" }, 'exception', 'bad'), outBox(out)]));
          out.push('cleanup');
          frames.push(fr('Python calls <code>__exit__(ValueError, ValueError(\'bad\'), &lt;traceback&gt;)</code>. Cleanup <b>still runs</b> — this is the whole point of with.', [g({ X: 'cur' }, { 'B-X': 'bad' }), cpm(code, { 5: 'cur', 6: 'cur' }), vp({ et: 'ValueError', e: "ValueError('bad')", tb: '&lt;traceback&gt;' }, 'et,e', 'bad'), outBox(out)]));
          if (mode === 'suppress') {
            frames.push(fr('<code>__exit__</code> returns <b>True</b> → Python treats the exception as <b>handled</b> and swallows it. (Use this power rarely: hiding errors is dangerous. <code>contextlib.suppress</code> does exactly this for listed types.)', [g({ X: 'ok' }), cp(code, 7, 'sel'), vp({ 'return value': 'True', exception: 'swallowed' }, 'return value', 'sel'), outBox(out)]));
            out.push('after with');
            frames.push(fr('Execution continues after the with block as if nothing happened. Note: the rest of the body (anything after the raise) was still skipped.', [g({ A: 'sel' }, { 'X-A': 'ok' }), cp(code, 12, 'sel'), outBox(out)]));
          } else {
            frames.push(fr('<code>__exit__</code> returns <b>False</b> (None would do the same) → the exception is <b>not</b> suppressed.', [g({ X: 'cur' }), cp(code, 7, 'bad'), vp({ 'return value': 'False' }, 'return value', 'bad'), outBox(out)]));
            frames.push(fr('The original ValueError propagates out of the with statement. <code>print(\'after with\')</code> never runs; an outer <code>try/except</code> (or the top level) handles it. Cleanup already happened.', [g({ P: 'bad' }, { 'X-P': 'bad' }), cp(code, 12, 'done'), vp({ exception: "ValueError('bad') propagating" }, 'exception', 'bad'), outBox(out.concat(['Traceback ... ValueError: bad']))]));
          }
        }
        return frames;
      }
    }, {
      title: 'ExitStack: dynamic resources, LIFO cleanup, partial failure',
      input: 'db cache !file log',
      inputLabel: 'Resource names (prefix ! = its __enter__ fails), max 6',
      gen: function (input) {
        var names = words(input);
        if (!names.length) throw new Error('Type resource names, e.g. db cache file');
        if (names.length > 6) throw new Error('Use at most 6 names');
        var code = ['with ExitStack() as stack:', '    for name in names:', '        stack.enter_context(open_resource(name))', '    work()', '# on leaving: callbacks run in REVERSE order'].join('\n');
        var st = [], out = [], frames = [], failed = null;
        frames.push(fr('ExitStack is a <b>stack of exit callbacks</b>. Each successful <code>enter_context</code> pushes that manager\'s <code>__exit__</code>. Perfect when you do not know how many resources you will open.', [cp(code, 1), { type: 'stack', label: 'ExitStack callbacks (top = runs first)', items: [] }, outBox(out)]));
        for (var i = 0; i < names.length; i++) {
          var nm = names[i].replace(/^!/, '');
          if (names[i].charAt(0) === '!') {
            failed = nm;
            out.push('open ' + nm + ' FAILED');
            frames.push(fr('Entering <b>' + esc(nm) + '</b> raises an exception inside its <code>__enter__</code>. It is <b>not</b> pushed (it never opened), so its exit will not run. Now the stack must unwind everything opened so far.', [cp(code, 3, 'bad'), { type: 'stack', label: 'ExitStack callbacks (top = runs first)', items: st.slice(), hl: {} }, vp({ entering: nm, error: 'OSError' }, 'error', 'bad'), outBox(out)]));
            break;
          }
          st.push('exit ' + nm);
          out.push('open ' + nm);
          var h = {}; h[st.length - 1] = 'ok';
          frames.push(fr('<code>enter_context</code> calls <b>' + esc(nm) + '</b>.__enter__() → success → push its exit onto the stack.', [cp(code, 3, 'ok'), { type: 'stack', label: 'ExitStack callbacks (top = runs first)', items: st.slice(), hl: h }, outBox(out)]));
        }
        if (!failed) {
          out.push('work with ' + st.length + ' resources');
          frames.push(fr('All resources are open; the body does its work.', [cp(code, 4), { type: 'stack', label: 'ExitStack callbacks (top = runs first)', items: st.slice() }, outBox(out)]));
        }
        while (st.length) {
          var top = st.pop();
          out.push(top.replace('exit', 'close'));
          frames.push(fr('Leaving the with block: pop and run <b>' + esc(top) + '</b>. Cleanup is <b>LIFO</b> — the last thing opened is the first thing closed, just like nested with blocks.' + (failed ? ' (We are unwinding because ' + esc(failed) + ' failed.)' : ''), [cp(code, 5, failed ? 'bad' : 'cur'), { type: 'stack', label: 'ExitStack callbacks (top = runs first)', items: st.slice() }, vp({ running: top }, 'running', 'cur'), outBox(out)]));
        }
        frames.push(fr(failed ? 'Every resource that <b>did</b> open got closed, in reverse order, and then the error from <b>' + esc(failed) + '</b> propagates. No leaks — even with partial failure. Doing this by hand needs one nested try/finally per resource.' : 'All callbacks ran in reverse order. Equivalent to ' + names.length + ' nested with statements, but the number of resources was decided at run time.', [{ type: 'stack', label: 'ExitStack callbacks', items: [] }, outBox(out)]));
        return frames;
      }
    }],
    examples: [
      { title: 'Predict the output: return inside with, and exit order', html: `<p><code>__exit__</code> runs even when the body <code>return</code>s (or <code>break</code>s/<code>continue</code>s). Multiple managers in one with-statement exit in <b>reverse</b> order.</p>${H.table(['Printed', 'Why'], [['enter 1, enter 2', 'left to right'], ['body', ''], ['exit 2, exit 1', 'right to left, even though the body returned'], ['result: 42', 'return value preserved']])}`, code: { lang: 'python', run: true, code: `from contextlib import contextmanager

@contextmanager
def cm(n):
    print('enter', n)
    try:
        yield
    finally:
        print('exit', n)

def f():
    with cm(1), cm(2):
        print('body')
        return 42

print('result:', f())` } },
      { title: 'The classic @contextmanager bug: no try/finally', html: `<p>Without <code>try/finally</code>, an exception in the body is re-raised <b>at the yield</b> and the code after the yield never runs — your "cleanup" silently does not happen. Compare the two versions.</p>${H.table(['Version', 'Cleanup on error?'], [['<code>yield</code> then cleanup', H.c('r', 'NO')], ['<code>try: yield finally: cleanup</code>', H.c('g', 'YES')]])}`, code: { lang: 'python', run: true, code: `from contextlib import contextmanager

@contextmanager
def leaky():
    print('acquire')
    yield
    print('release')          # skipped when the body raises!

@contextmanager
def safe():
    print('acquire')
    try:
        yield
    finally:
        print('release')      # always runs

for cm in (leaky, safe):
    try:
        with cm():
            raise RuntimeError('boom')
    except RuntimeError:
        print(cm.__name__, 'handled error')` } },
      { title: 'Transactions: commit on success, roll back on error (sqlite3)', html: `<p>A <code>sqlite3</code> connection is a context manager for <b>transactions</b>: it commits if the block succeeds and rolls back if it raises. (Careful: it does NOT close the connection — use <code>contextlib.closing</code> for that.)</p>`, code: { lang: 'python', run: true, code: `import sqlite3
from contextlib import closing

with closing(sqlite3.connect(':memory:')) as conn:
    conn.execute('CREATE TABLE acct(name TEXT, bal INT)')
    with conn:                                    # transaction 1: commits
        conn.execute("INSERT INTO acct VALUES ('asha', 100), ('ben', 0)")
    try:
        with conn:                                # transaction 2: rolls back
            conn.execute("UPDATE acct SET bal = bal - 70 WHERE name = 'asha'")
            raise ValueError('transfer failed half-way')
    except ValueError as e:
        print('error:', e)
    print(conn.execute('SELECT * FROM acct').fetchall())   # asha still has 100` } },
      { title: 'Locks: never forget to release', html: `<p><code>threading.Lock</code> is a context manager: <code>with lock:</code> acquires and always releases. Forgetting <code>release()</code> after an exception is a classic deadlock bug; the with form makes it impossible.</p>`, code: { lang: 'python', run: true, code: `import threading

lock = threading.Lock()
counter = 0

def work():
    global counter
    for _ in range(10_000):
        with lock:              # acquire ... release, even on errors
            counter += 1

threads = [threading.Thread(target=work) for _ in range(4)]
for t in threads: t.start()
for t in threads: t.join()
print(counter, 'locked now?', lock.locked())   # 40000 False` } },
      { title: 'One object, two jobs: ContextDecorator', html: `<p>Inherit from <code>ContextDecorator</code> (or use <code>@contextmanager</code>, whose result is also a ContextDecorator) and the same manager works as <code>@decorator</code> around a whole function. That is how <code>mock.patch</code> works both ways.</p>`, code: { lang: 'python', run: true, code: `from contextlib import ContextDecorator

class logged(ContextDecorator):
    def __enter__(self):
        print('start')
        return self
    def __exit__(self, *exc):
        print('end')
        return False

@logged()
def job():
    print('  job running')

job()
with logged():
    print('  block running')` } }
    ],
    deepDive: `<p>🟣 <b>Exact semantics.</b> Python looks up <code>__enter__</code> and <code>__exit__</code> on the <b>type</b>, not the instance (setting them on an instance does nothing). The lookup happens <b>before</b> <code>__enter__</code> is called, so a missing <code>__exit__</code> fails early with <code>TypeError: '…' object does not support the context manager protocol</code>. <code>__exit__</code> receives <code>BaseException</code>s too, including <code>KeyboardInterrupt</code> and <code>SystemExit</code> — be careful when returning True. If <code>__exit__</code> itself raises, that new exception replaces the original (which is attached as <code>__context__</code>).</p>
<p><b>How <code>@contextmanager</code> works.</b> It wraps your generator in a <code>_GeneratorContextManager</code>: <code>__enter__</code> calls <code>next(gen)</code>; normal <code>__exit__</code> calls <code>next(gen)</code> again and expects <code>StopIteration</code> (a second yield raises <code>RuntimeError: generator didn't stop</code>); exceptional <code>__exit__</code> calls <code>gen.throw(exc)</code> — that is why the error appears <b>at the yield</b>. If your generator catches it and does not re-raise, the exception is suppressed.</p>
<p><b>Async variants.</b> <code>async with</code> uses <code>__aenter__</code>/<code>__aexit__</code> (coroutines). <code>contextlib.asynccontextmanager</code>, <code>AsyncExitStack</code>, and <code>aclosing</code> are the async twins. Connection pools, HTTP clients (<code>httpx.AsyncClient</code>), DB sessions and <code>asyncio.TaskGroup</code>/<code>asyncio.timeout()</code> are all async context managers.</p>
<p><b>Production patterns.</b> (1) Prefer <code>with</code> over relying on <code>__del__</code>/garbage collection — PyPy and reference cycles make GC timing unpredictable. (2) <code>ExitStack.callback(fn, *args)</code> registers arbitrary cleanup; <code>stack.pop_all()</code> transfers ownership (build several resources, and only if all succeed hand them to the caller). (3) Re-entrancy: a <code>Lock</code> cannot be re-entered in the same thread (use <code>RLock</code>); many file-like managers are single-use. (4) Since 3.11, the <code>with</code> statement's setup is "zero-cost" for the no-exception path, so context managers are cheap.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI agents increasingly run code that touches real resources — sandboxes, browser sessions, DB connections, GPU memory, MCP tool clients. Leaked resources in long-running agent loops are a top production failure, and context managers (sync and async) are the fix. Frameworks expose clients as <code>with</code>/<code>async with</code> objects for exactly this reason.</p>
<p><b>Use AI as a partner:</b> <code>"Find every open()/connect()/acquire() in this repo that is not inside a with block"</code>; <code>"Convert this try/finally to a @contextmanager and write a test that the cleanup runs when the body raises"</code>.</p>
<p><b>Where AI goes wrong:</b> generated <code>@contextmanager</code> code without <code>try/finally</code> (cleanup skipped on error), <code>__exit__</code> that returns True "to be safe" (swallowing every bug), using <code>with sqlite3.connect()</code> believing it closes the connection, and mixing sync <code>with</code> on async clients.</p>
<p><b>What you must own:</b> the exact enter/exit/suppression rules, the generator mechanics behind <code>@contextmanager</code>, LIFO unwinding, and the design instinct to reach for a context manager whenever something must be undone.</p>`,
    problems: [{
      title: 'Temporarily Override a Setting, Always Restore It', level: 'Medium', tags: ['context manager', 'contextlib', 'testing'], companies: ['Stripe', 'Dropbox', 'Bloomberg'],
      statement: `<p>Write a context manager <code>override(obj, **changes)</code> that sets the given attributes on <code>obj</code> for the duration of a <code>with</code> block and restores the original values afterwards — <b>even if the block raises</b>. If an attribute did not exist before, it must be <b>deleted</b> afterwards (not set to None). Nested overrides of the same attribute must restore correctly. Provide both a class-based and a <code>@contextmanager</code> version.</p>`,
      constraints: `Any number of attributes. Must not swallow exceptions from the body. O(k) for k attributes.`,
      example: `<p><code>cfg.debug = False</code>; inside <code>with override(cfg, debug=True, trace='x')</code>: debug is True and trace is 'x'. After the block: ${H.kv([['debug', 'False'], ['trace', '(deleted)']], { hl: { trace: 'y' } })} — also after an exception inside the block.</p>`,
      brute: { why: `<p>Set the attributes, run the code, and set them back on the last line. When the code raises, the "set back" line never runs and the global setting stays corrupted for every later test/request. It also sets brand-new attributes to <code>None</code> instead of deleting them.</p>`, code: `class Config:
    debug = False

cfg = Config()

def run_with_debug(fn):
    old = cfg.debug
    cfg.debug = True
    fn()                 # if fn raises, the next line never runs!
    cfg.debug = old

run_with_debug(lambda: print('debug is', cfg.debug))
print('restored:', cfg.debug)` },
      mcq: { q: 'In the @contextmanager version, where must the restore code go?', options: ['In a finally block around the yield', 'Right after the yield, no try needed', 'Before the yield', 'In an except block that returns True'], answer: 0, explain: 'Exceptions from the body are thrown into the generator AT the yield. Only a finally around the yield guarantees the restore runs; an except that swallows would also hide the caller\'s error.' },
      hints: [`<p>Hint 1: Before changing anything, save the old state. Use a sentinel object to remember "did not exist": <code>getattr(obj, name, MISSING)</code>.</p>`, `<p>Hint 2: Restore in reverse order inside <code>finally</code> (or <code>__exit__</code>): if the saved value is MISSING → <code>delattr</code>, else <code>setattr</code>. Return False/None from <code>__exit__</code> so errors propagate.</p>`, `<p>Hint 3: Nesting works automatically if each <code>with</code> saves its own snapshot on entry. Test: normal exit, exception exit, new attribute, nested override of the same attribute.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_run',
        cases: [
          [
            [
              'from types import SimpleNamespace\n' +
                'res = []\n' +
                'for impl in (override, override_gen):\n' +
                '    cfg = SimpleNamespace(debug=False)\n' +
                '    with impl(cfg, debug=True, trace=\'x\'):\n' +
                '        inside = [cfg.debug, cfg.trace]\n' +
                '    res.append([inside, cfg.debug, hasattr(cfg, \'trace\')])\n' +
                'result = res'
            ],
            [[[true, 'x'], false, false], [[true, 'x'], false, false]]
          ],
          [
            [
              'from types import SimpleNamespace\n' +
                'res = []\n' +
                'for impl in (override, override_gen):\n' +
                '    cfg = SimpleNamespace(debug=False)\n' +
                '    try:\n' +
                '        with impl(cfg, debug=True, trace=\'x\'):\n' +
                '            raise RuntimeError(\'boom\')\n' +
                '    except RuntimeError:\n' +
                '        pass\n' +
                '    res.append([cfg.debug, hasattr(cfg, \'trace\')])\n' +
                'result = res'
            ],
            [[false, false], [false, false]]
          ],
          [
            [
              'from types import SimpleNamespace\n' +
                'res = []\n' +
                'for impl in (override, override_gen):\n' +
                '    cfg = SimpleNamespace(debug=False)\n' +
                '    with impl(cfg, debug=True, trace=\'x\'):\n' +
                '        with impl(cfg, debug=\'nested\'):\n' +
                '            a = cfg.debug\n' +
                '        b = [cfg.debug, cfg.trace]\n' +
                '    res.append([a, b, cfg.debug, hasattr(cfg, \'trace\')])\n' +
                'result = res'
            ],
            [['nested', [true, 'x'], false, false], ['nested', [true, 'x'], false, false]]
          ],
          [
            [
              'from types import SimpleNamespace\n' +
                'res = []\n' +
                'for impl in (override, override_gen):\n' +
                '    cfg = SimpleNamespace(debug=False)\n' +
                '    with impl(cfg, debug=True) as o:\n' +
                '        same = o is cfg\n' +
                '    res.append(same)\n' +
                'result = res'
            ],
            [true, true]
          ],
          [
            [
              'from types import SimpleNamespace\n' +
                'res = []\n' +
                'for impl in (override, override_gen):\n' +
                '    cfg = SimpleNamespace(debug=False)\n' +
                '    try:\n' +
                '        with impl(cfg, debug=True):\n' +
                '            raise ValueError(\'x\')\n' +
                '    except ValueError as e:\n' +
                '        res.append(str(e))\n' +
                'result = res'
            ],
            ['x', 'x']
          ],
          [
            [
              'from types import SimpleNamespace\n' +
                'res = []\n' +
                'for impl in (override, override_gen):\n' +
                '    cfg = SimpleNamespace(debug=False)\n' +
                '    with impl(cfg):\n' +
                '        pass\n' +
                '    res.append(vars(cfg))\n' +
                'result = res'
            ],
            [{ debug: false }, { debug: false }]
          ],
          [
            [
              'from types import SimpleNamespace\n' +
                'res = []\n' +
                'for impl in (override, override_gen):\n' +
                '    cfg = SimpleNamespace(debug=False)\n' +
                '    with impl(cfg, **{\'a%d\' % i: i for i in range(1000)}):\n' +
                '        inside = sum(getattr(cfg, \'a%d\' % i) for i in range(1000))\n' +
                '    res.append([inside, sorted(vars(cfg))])\n' +
                'result = res'
            ],
            [[499500, ['debug']], [499500, ['debug']]]
          ],
          [
            [
              'from types import SimpleNamespace\n' +
                'res = []\n' +
                'for impl in (override, override_gen):\n' +
                '    cfg = SimpleNamespace(debug=False)\n' +
                '    with impl(cfg, x=1, y=2):\n' +
                '        with impl(cfg, y=3, z=4):\n' +
                '            a = [cfg.x, cfg.y, cfg.z]\n' +
                '        b = [cfg.x, cfg.y, hasattr(cfg, \'z\')]\n' +
                '    res.append([a, b, sorted(vars(cfg))])\n' +
                'result = res'
            ],
            [[[1, 3, 4], [1, 2, false], ['debug']], [[1, 3, 4], [1, 2, false], ['debug']]]
          ],
          [
            [
              'from types import SimpleNamespace\n' +
                'res = []\n' +
                'for impl in (override, override_gen):\n' +
                '    cfg = SimpleNamespace(debug=False)\n' +
                '    try:\n' +
                '        with impl(cfg, debug=1):\n' +
                '            with impl(cfg, debug=2):\n' +
                '                raise KeyError(\'k\')\n' +
                '    except KeyError:\n' +
                '        pass\n' +
                '    res.append(cfg.debug)\n' +
                'result = res'
            ],
            [false, false]
          ],
          [
            [
              'from types import SimpleNamespace\n' +
                'res = []\n' +
                'for impl in (override, override_gen):\n' +
                '    cfg = SimpleNamespace(debug=False)\n' +
                '    for i in range(10000):\n' +
                '        with impl(cfg, debug=i):\n' +
                '            pass\n' +
                '    res.append(cfg.debug)\n' +
                'result = res'
            ],
            [false, false]
          ],
          [
            [
              'from types import SimpleNamespace\n' +
                'res = []\n' +
                'for impl in (override, override_gen):\n' +
                '    cfg = SimpleNamespace(debug=False)\n' +
                '    with impl(cfg, debug=None):\n' +
                '        inside = cfg.debug\n' +
                '    res.append([inside, cfg.debug])\n' +
                'result = res'
            ],
            [[null, false], [null, false]]
          ],
          [
            [
              'from types import SimpleNamespace\n' +
                'cfg = SimpleNamespace(debug=False)\n' +
                'cm = override(cfg, debug=True)\n' +
                'cm.__enter__()\n' +
                'r = cfg.debug\n' +
                'returned = cm.__exit__(None, None, None)\n' +
                'result = [r, cfg.debug, returned]'
            ],
            [true, false, false]
          ]
        ],
        harness: {
          python: 'def t_run(src):\n' +
            '    ns = dict(globals())\n' +
            '    try:\n' +
            '        exec(src, ns)\n' +
            '        return ns[\'result\']\n' +
            '    except Exception as e:\n' +
            '        return \'!\' + type(e).__name__'
        }
      },
      solution: {
        approach: `<p>Snapshot on enter (with a sentinel for "absent"), apply changes, and undo in <code>finally</code>/<code>__exit__</code>. The class version stores the snapshot on the instance; the generator version keeps it in a local variable. Neither suppresses exceptions. This is a mini version of <code>unittest.mock.patch.object</code>.</p>`,
        code: { lang: 'python', run: true, code: `from contextlib import contextmanager

_MISSING = object()

class override:
    def __init__(self, obj, **changes):
        self.obj, self.changes = obj, changes

    def __enter__(self):
        self.saved = {k: getattr(self.obj, k, _MISSING) for k in self.changes}
        for k, v in self.changes.items():
            setattr(self.obj, k, v)
        return self.obj

    def __exit__(self, exc_type, exc, tb):
        for k, old in reversed(list(self.saved.items())):
            if old is _MISSING:
                delattr(self.obj, k)
            else:
                setattr(self.obj, k, old)
        return False                       # never swallow errors

@contextmanager
def override_gen(obj, **changes):
    saved = {k: getattr(obj, k, _MISSING) for k in changes}
    for k, v in changes.items():
        setattr(obj, k, v)
    try:
        yield obj
    finally:
        for k, old in reversed(list(saved.items())):
            if old is _MISSING:
                delattr(obj, k)
            else:
                setattr(obj, k, old)

class Config:
    pass

cfg = Config()
cfg.debug = False
for impl in (override, override_gen):
    try:
        with impl(cfg, debug=True, trace='x'):
            with impl(cfg, debug='nested'):
                print(impl.__name__, 'inner:', cfg.debug)
            print(impl.__name__, 'outer:', cfg.debug, cfg.trace)
            raise RuntimeError('boom')
    except RuntimeError:
        pass
    print(impl.__name__, 'after:', cfg.debug, hasattr(cfg, 'trace'))` },
        dry: { head: ['moment', 'cfg.debug', 'cfg.trace', 'saved snapshot'], rows: [['before', 'False', '(absent)', '—'], ['outer enter', 'True', "'x'", "{debug: False, trace: MISSING}"], ['inner enter', "'nested'", "'x'", "{debug: True}"], ['inner exit', 'True', "'x'", 'restored True'], ['raise → outer exit', 'False', '(deleted)', 'restored, error propagates']] },
        complexity: `<p>O(k) time and space for k overridden attributes per with block.</p>`,
        followUps: ['Support dictionary keys too (like mock.patch.dict).', 'Make it thread-safe — or explain why mutating a shared object is inherently unsafe across threads and what contextvars offers instead.', 'Make it usable as a decorator (ContextDecorator).']
      }
    }]
  });

  /* ================= PRACTICE: Easy ================= */
  practice.push({
    title: 'Predict & Fix: min() and max() of a Generator', level: 'Easy', tags: ['iterator exhaustion', 'predict the output', 'single pass'], companies: ['Amazon', 'Bloomberg'],
    statement: `<p>A teammate wrote <code>def stats(readings): return min(readings), max(readings)</code>. It works in unit tests with lists, but in production <code>readings</code> is a generator reading sensor values, and it crashes. <b>Predict</b> the error, explain why, and rewrite <code>stats</code> so it works for <b>any</b> iterable in a single pass and raises a clear <code>ValueError</code> for empty input.</p>`,
    constraints: `Up to 10<sup>9</sup> readings (cannot store them). One pass only.`,
    example: `<p><code>stats(x for x in [4, 9, 1])</code> → original code: ${H.c('r', 'ValueError: max() iterable argument is empty')} because <code>min()</code> consumed every item. Fixed version → <code>(1, 9)</code>.</p>`,
    brute: { why: `<p>"Fix" by converting to a list first: <code>xs = list(readings)</code>. Correct, but stores all 10<sup>9</sup> readings in memory just to walk them twice. The real waste is the second pass.</p>`, code: `def stats(readings):
    xs = list(readings)          # O(n) memory just to be able to loop twice
    return min(xs), max(xs)

print(stats(x for x in [4, 9, 1]))` },
    mcq: { q: 'Why does the original code fail only for generators?', options: ['min() exhausts the iterator, so max() receives an empty one', 'Generators cannot be compared', 'min() and max() need indexes', 'Generators are immutable'], answer: 0, explain: 'A list gives a fresh iterator to each call. A generator is its own iterator: after min() walks it, it is exhausted, and max() of nothing raises ValueError.' },
    hints: [`<p>Hint 1: Lists are iterables (fresh iterator each time); generators are one-shot iterators. Which one did the tests use?</p>`, `<p>Hint 2: Track both the smallest and largest seen so far in one loop. Start from the first item: <code>it = iter(readings); first = next(it, sentinel)</code>.</p>`, `<p>Hint 3: If the first item is the sentinel, raise <code>ValueError('stats() of empty input')</code>. Then loop over the rest updating lo/hi.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_val',
      cases: [
        [['stats(x for x in [4, 9, 1])'], [1, 9]],
        [['stats([7])'], [7, 7]],
        [['stats([])'], '!ValueError'],
        [['stats(x for x in [])'], '!ValueError'],
        [['stats([\'b\', \'a\', \'c\'])'], ['a', 'c']],
        [['stats(iter([3, 1, 2]))'], [1, 3]],
        [['stats([5, 5, 5])'], [5, 5]],
        [['stats([-3, -9, -1])'], [-9, -1]],
        [['stats([1.5, 0.5, 2.5])'], [0.5, 2.5]],
        [['stats(i for i in range(10**6))'], [0, 999999]],
        [['stats(i for i in range(10**6, 0, -1))'], [1, 1000000]],
        [['stats([2, 1])'], [1, 2]],
        [['stats((x * x for x in range(-5, 6)))'], [0, 25]],
        [['stats({3, 1, 2})'], [1, 3]],
        [['stats(range(1))'], [0, 0]],
        [['(lambda g: [stats(g), list(g)])(iter([2, 1, 3]))'], [[1, 3], []]]
      ],
      harness: {
        python: 'def t_val(src):\n' +
          '    try:\n' +
          '        return eval(src)\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Take the first item to initialise lo and hi (handles empty input explicitly), then one pass over the rest of the same iterator. O(1) memory, works for lists, generators, files, anything iterable.</p>`,
      code: { lang: 'python', run: true, code: `def stats_broken(readings):
    return min(readings), max(readings)

try:
    stats_broken(x for x in [4, 9, 1])
except ValueError as e:
    print('broken:', e)

_EMPTY = object()

def stats(readings):
    it = iter(readings)
    first = next(it, _EMPTY)
    if first is _EMPTY:
        raise ValueError('stats() of empty input')
    lo = hi = first
    for x in it:                 # continues after the first item
        if x < lo:
            lo = x
        elif x > hi:
            hi = x
    return lo, hi

print(stats(x for x in [4, 9, 1]))   # (1, 9)
print(stats([7]))                     # (7, 7)` },
      dry: { head: ['x', 'lo', 'hi'], rows: [['4 (first)', '4', '4'], ['9', '4', '9'], ['1', '1', '9']] },
      complexity: `<p>O(n) time, O(1) memory, one pass.</p>`,
      followUps: ['Also return the mean in the same pass.', 'What if you really need two passes over a huge file? (Re-open the file / make a function that returns a fresh generator.)']
    }
  });

  practice.push({
    title: 'Infinite Order-ID Generator', level: 'Easy', tags: ['generator', 'itertools.count', 'islice'], companies: ['Shopify', 'Flipkart'],
    statement: `<p>Write a generator <code>order_ids(prefix, start=1, width=4)</code> that yields IDs forever: <code>ORD-0001</code>, <code>ORD-0002</code>, … (zero-padded to <code>width</code>; wider numbers are not truncated). Then print the first 3 IDs and the 3 IDs after skipping 9,997 of them.</p>`,
    constraints: `start ≥ 0, 1 ≤ width ≤ 12. Must be lazy (constant memory).`,
    example: `<p><code>list(islice(order_ids('ORD-'), 3))</code> → <code>['ORD-0001', 'ORD-0002', 'ORD-0003']</code>. Items 9,998–10,000 → <code>ORD-9998, ORD-9999, ORD-10000</code> (no truncation).</p>`,
    brute: { why: `<p>Pre-build a list of a "big enough" number of IDs: <code>[f'{prefix}{i:04}' for i in range(1, 1_000_000)]</code>. It wastes memory and time for IDs nobody asked for — and "big enough" is always too small eventually.</p>`, code: `def order_ids_list(prefix, n=100_000):
    return [f'{prefix}{i:04}' for i in range(1, n + 1)]   # builds everything

ids = order_ids_list('ORD-')
print(ids[:3])` },
    mcq: { q: 'How do you take items 9,998–10,000 from an infinite generator?', options: ['islice(gen, 9997, 10000)', 'gen[9997:10000]', 'list(gen)[9997:10000]', 'gen.slice(9997, 10000)'], answer: 0, explain: 'Generators do not support indexing; islice skips (consumes) the first 9,997 lazily and stops after 3 more. list(gen) would never finish on an infinite generator.' },
    hints: [`<p>Hint 1: <code>itertools.count(start)</code> yields start, start+1, … forever.</p>`, `<p>Hint 2: f-string width formatting: <code>f'{n:0{width}d}'</code> pads with zeros to at least width digits and never truncates.</p>`, `<p>Hint 3: Recipe: <code>for n in count(start): yield f'{prefix}{n:0{width}d}'</code>; consume with <code>islice(gen, start, stop)</code>.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_val',
      cases: [
        [['list(islice(order_ids(\'ORD-\'), 3))'], ['ORD-0001', 'ORD-0002', 'ORD-0003']],
        [['list(islice(order_ids(\'ORD-\'), 9997, 10000))'], ['ORD-9998', 'ORD-9999', 'ORD-10000']],
        [['next(order_ids(\'X\', 5, 2))'], 'X05'],
        [['next(order_ids(\'A\', 0))'], 'A0000'],
        [['next(order_ids(\'W\', 7, 12))'], 'W000000000007'],
        [['next(order_ids(\'P\', 10**12, 4))'], 'P1000000000000'],
        [['next(order_ids(\'P\'))'], 'P0001'],
        [['next(islice(order_ids(\'I-\'), 10**6, None))'], 'I-1000001'],
        [['list(islice(order_ids(\'\', 99, 1), 3))'], ['99', '100', '101']],
        [
          ['(lambda a, b: [next(a), next(a), next(b)])(order_ids(\'A\'), order_ids(\'B\'))'],
          ['A0001', 'A0002', 'B0001']
        ],
        [['list(islice(order_ids(\'Z\', 9, 2), 3))'], ['Z09', 'Z10', 'Z11']]
      ],
      harness: {
        python: 'def t_val(src):\n' +
          '    try:\n' +
          '        return eval(src)\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>An infinite generator built on <code>count</code>. Formatting is done per item, on demand. The caller decides how many to take.</p>`,
      code: { lang: 'python', run: true, code: `from itertools import count, islice

def order_ids(prefix, start=1, width=4):
    for n in count(start):
        yield f'{prefix}{n:0{width}d}'

print(list(islice(order_ids('ORD-'), 3)))
print(list(islice(order_ids('ORD-'), 9997, 10000)))
# a shorter alternative using map:
gen = map('INV-{:06d}'.format, count(42))
print(next(gen), next(gen))` },
      complexity: `<p>O(1) per ID and O(1) memory; skipping k IDs with islice costs O(k).</p>`,
      followUps: ['Make it thread-safe for multiple producers (a lock around next(), or itertools.count is atomic in CPython only by accident — do not rely on it).', 'Resume after a restart: persist the last issued number.']
    }
  });

  practice.push({
    title: 'Day-to-Day Price Changes with pairwise', level: 'Easy', tags: ['itertools.pairwise', 'zip', 'generator expression'], companies: ['Robinhood', 'Goldman Sachs'],
    statement: `<p>Given daily closing prices, return the list of day-to-day changes and the number of days the price went <b>up</b>. Solve it without index arithmetic.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>6</sup>; prices are positive floats or ints.`,
    example: `<p>${H.arr([100, 102, 101, 105, 105], { label: 'prices' })} changes → ${H.arr([2, -1, 4, 0], { hl: { 0: 'g', 1: 'r', 2: 'g' } })} up-days = <b>2</b> (0 is not up).</p>`,
    brute: { why: `<p><code>for i in range(1, len(p)): changes.append(p[i] - p[i - 1])</code> works but needs a list with indexing (not any iterable), and off-by-one mistakes are common. Fine for small lists, but it cannot handle a stream of prices.</p>`, code: `def changes_brute(p):
    out = []
    for i in range(1, len(p)):
        out.append(p[i] - p[i - 1])
    return out, sum(1 for c in out if c > 0)

print(changes_brute([100, 102, 101, 105, 105]))` },
    mcq: { q: 'What does pairwise([100, 102, 101]) yield?', options: ['(100, 102), (102, 101)', '(100, 102), (101,)', '(100,), (102,), (101,)', '(100, 101)'], answer: 0, explain: 'pairwise yields overlapping consecutive pairs: n items give n − 1 pairs.' },
    hints: [`<p>Hint 1: "Compare each element with the next" is the phrase for <code>itertools.pairwise</code> (3.10+) or <code>zip(p, p[1:])</code>.</p>`, `<p>Hint 2: <code>[b - a for a, b in pairwise(prices)]</code> gives the changes; <code>sum(c &gt; 0 for c in changes)</code> counts ups (True counts as 1).</p>`, `<p>Hint 3: With one price there are zero changes. pairwise works on any iterable, including a generator reading a CSV.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_val',
      cases: [
        [['price_changes([100, 102, 101, 105, 105])'], [[2, -1, 4, 0], 2]],
        [['price_changes([42])'], [[], 0]],
        [['price_changes([])'], [[], 0]],
        [['price_changes([1.5, 1.0])'], [[-0.5], 0]],
        [['price_changes([5, 4, 3, 2, 1])'], [[-1, -1, -1, -1], 0]],
        [['price_changes([1, 2, 3, 4])'], [[1, 1, 1], 3]],
        [['price_changes([10, 10, 10])'], [[0, 0], 0]],
        [['price_changes([100, 50, 100])'], [[-50, 50], 1]],
        [['price_changes(iter([1, 3, 6]))'], [[2, 3], 2]],
        [
          ['(lambda r: [len(r[0]), r[1], sum(r[0])])(price_changes(list(range(1, 10**6 + 1))))'],
          [999999, 999999, 999999]
        ],
        [['(lambda r: [len(r[0]), r[1]])(price_changes([i % 3 for i in range(10**6)]))'], [999999, 666666]],
        [['price_changes(x for x in [3, 1, 2])'], [[-2, 1], 1]]
      ],
      harness: {
        python: 'def t_val(src):\n' +
          '    try:\n' +
          '        return eval(src)\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p><code>pairwise</code> provides overlapping pairs lazily, so this also works on a stream. Booleans sum as integers.</p>`,
      code: { lang: 'python', run: true, code: `from itertools import pairwise

def price_changes(prices):
    changes = [b - a for a, b in pairwise(prices)]
    ups = sum(c > 0 for c in changes)
    return changes, ups

print(price_changes([100, 102, 101, 105, 105]))   # ([2, -1, 4, 0], 2)
print(price_changes([42]))                         # ([], 0)
print(price_changes(iter([1, 3, 6])))              # works on iterators too` },
      complexity: `<p>O(n) time; O(n) for the output list (O(1) if you only need the count — use a generator expression).</p>`,
      followUps: ['Longest streak of up-days (groupby on c > 0).', 'Max profit with one buy and one sell (track running min).']
    }
  });

  practice.push({
    title: 'Clean Up Temp Files, Ignoring Missing Ones', level: 'Easy', tags: ['context manager', 'contextlib.suppress', 'files'], companies: ['Dropbox', 'Microsoft'],
    statement: `<p>Write <code>cleanup(paths)</code> that deletes each file in <code>paths</code>. Some files may already be gone — that is fine and must not stop the loop. Any <b>other</b> error (e.g. permission denied) must still propagate. Return how many files were actually deleted.</p>`,
    constraints: `Up to 10<sup>5</sup> paths. Do not check existence first (another process may delete the file between check and delete).`,
    example: `<p>Paths a.tmp (exists), b.tmp (missing), c.tmp (exists) → deletes 2, returns <b>2</b>; b.tmp silently skipped.</p>`,
    brute: { why: `<p>Look-before-you-leap: <code>if os.path.exists(p): os.remove(p)</code>. It has a race condition (the file can vanish between the two calls → crash) and does two system calls per file. A bare <code>except: pass</code> is worse: it hides permission errors and bugs.</p>`, code: `import os, tempfile

def cleanup_brute(paths):
    deleted = 0
    for p in paths:
        if os.path.exists(p):    # race: file may vanish right here
            os.remove(p)
            deleted += 1
    return deleted

d = tempfile.mkdtemp()
p = os.path.join(d, 'a.tmp'); open(p, 'w').close()
print(cleanup_brute([p, os.path.join(d, 'missing.tmp')]))` },
    mcq: { q: 'Which line ignores ONLY missing files?', options: ['with suppress(FileNotFoundError): os.remove(p)', 'try: os.remove(p)\nexcept: pass', 'with suppress(Exception): os.remove(p)', 'if os.path.exists(p): os.remove(p)'], answer: 0, explain: 'suppress takes exact exception types. A bare except or suppress(Exception) would also hide PermissionError and real bugs; exists() has a race condition.' },
    hints: [`<p>Hint 1: EAFP — "easier to ask forgiveness than permission": just try to remove, and handle the specific failure.</p>`, `<p>Hint 2: <code>contextlib.suppress(FileNotFoundError)</code> is a context manager whose <code>__exit__</code> returns True only for that type.</p>`, `<p>Hint 3: To count deletions, increment after <code>os.remove</code> <b>inside</b> the with block — if remove raises, the increment is skipped. Or use <code>pathlib.Path.unlink(missing_ok=True)</code> (3.8+).</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'import os, tempfile\n' +
              'd = tempfile.mkdtemp()\n' +
              'paths = [os.path.join(d, n) for n in (\'a.tmp\', \'b.tmp\', \'c.tmp\')]\n' +
              'for p in (paths[0], paths[2]):\n' +
              '    open(p, \'w\').close()\n' +
              'result = [cleanup(paths), cleanup(paths), os.listdir(d)]'
          ],
          [2, 0, []]
        ],
        [
          [
            'import os, tempfile\n' +
              'd = tempfile.mkdtemp()\n' +
              'result = [cleanup([]), cleanup([os.path.join(d, \'nope\')])]'
          ],
          [0, 0]
        ],
        [
          [
            'import os, tempfile\n' +
              'd = tempfile.mkdtemp()\n' +
              'p = os.path.join(d, \'x\')\n' +
              'open(p, \'w\').close()\n' +
              'result = [cleanup([p, p]), os.path.exists(p)]'
          ],
          [1, false]
        ],
        [
          [
            'import os, tempfile\n' +
              'd = tempfile.mkdtemp()\n' +
              'sub = os.path.join(d, \'sub\')\n' +
              'os.mkdir(sub)\n' +
              'try:\n' +
              '    cleanup([sub])\n' +
              '    result = \'no error\'\n' +
              'except OSError as e:\n' +
              '    result = type(e).__name__'
          ],
          'IsADirectoryError'
        ],
        [
          [
            'import os, tempfile\n' +
              'd = tempfile.mkdtemp()\n' +
              'a = os.path.join(d, \'a\')\n' +
              'open(a, \'w\').close()\n' +
              'sub = os.path.join(d, \'sub\')\n' +
              'os.mkdir(sub)\n' +
              'try:\n' +
              '    cleanup([a, sub])\n' +
              'except OSError:\n' +
              '    pass\n' +
              'result = os.path.exists(a)'
          ],
          false
        ],
        [
          [
            'import os, tempfile\n' +
              'd = tempfile.mkdtemp()\n' +
              'result = cleanup([os.path.join(d, \'no\', \'such\', \'dir\', \'f\')])'
          ],
          0
        ],
        [
          [
            'import os, tempfile\n' +
              'd = tempfile.mkdtemp()\n' +
              'ps = []\n' +
              'for i in range(20000):\n' +
              '    p = os.path.join(d, \'f%d\' % i)\n' +
              '    open(p, \'w\').close()\n' +
              '    ps.append(p)\n' +
              'missing = [os.path.join(d, \'m%d\' % i) for i in range(80000)]\n' +
              'result = [cleanup(ps + missing), len(os.listdir(d))]'
          ],
          [20000, 0]
        ],
        [
          [
            'import os, tempfile\n' +
              'd = tempfile.mkdtemp()\n' +
              'a = os.path.join(d, \'a\')\n' +
              'b = os.path.join(d, \'b\')\n' +
              'open(a, \'w\').close()\n' +
              'open(b, \'w\').close()\n' +
              'result = [cleanup([a, os.path.join(d, \'gone\'), b]), os.listdir(d)]'
          ],
          [2, []]
        ],
        [
          [
            'import os, tempfile\n' +
              'd = tempfile.mkdtemp()\n' +
              'p = os.path.join(d, \'k\')\n' +
              'open(p, \'w\').write(\'data\')\n' +
              'result = [cleanup((x for x in [p])), os.path.exists(p)]'
          ],
          [1, false]
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>EAFP with <code>suppress</code>: the counter line is skipped automatically when the file is missing, because the exception jumps to <code>__exit__</code>. Other errors propagate.</p>`,
      code: { lang: 'python', run: true, code: `import os, tempfile
from contextlib import suppress

def cleanup(paths):
    deleted = 0
    for p in paths:
        with suppress(FileNotFoundError):
            os.remove(p)
            deleted += 1        # skipped if remove() raised
    return deleted

d = tempfile.mkdtemp()
paths = [os.path.join(d, n) for n in ('a.tmp', 'b.tmp', 'c.tmp')]
for p in (paths[0], paths[2]):
    open(p, 'w').close()        # create a.tmp and c.tmp only
print(cleanup(paths))            # 2
print(cleanup(paths))            # 0 (all gone, no crash)
os.rmdir(d)` },
      complexity: `<p>O(n) system calls, O(1) memory.</p>`,
      followUps: ['Collect the paths that failed with other errors instead of stopping (ExceptionGroup in 3.11+).', 'Delete a whole directory tree: shutil.rmtree(path, ignore_errors=...) vs onexc callback (3.12).']
    }
  });

  /* ================= PRACTICE: Medium ================= */
  practice.push({
    title: 'Sliding Window Generator & Moving Average', level: 'Medium', tags: ['generator', 'deque', 'streaming'], companies: ['Uber', 'Two Sigma', 'Netflix'],
    statement: `<p>Write <code>windows(iterable, k)</code> that lazily yields every window of <code>k</code> consecutive items as a tuple, and use it to compute the moving average of a stream of response times. It must work on infinite streams.</p>`,
    constraints: `1 ≤ k ≤ 10<sup>5</sup>; stream length unbounded. Each step O(1) amortised for the averaging (avoid re-summing each window).`,
    example: `<p>${H.arr([1, 2, 3, 4, 5], { label: 'stream' })} k = 3 → windows (1,2,3) (2,3,4) (3,4,5) → averages <b>2.0, 3.0, 4.0</b>. If the stream is shorter than k, nothing is yielded.</p>`,
    brute: { why: `<p>Convert to a list and slice: <code>[xs[i:i+k] for i in range(len(xs) - k + 1)]</code>. Needs the whole stream in memory (impossible if infinite) and copies k items per window → O(n·k). Averaging each slice with <code>sum()</code> is another O(k) per step.</p>`, code: `def moving_avg_brute(xs, k):
    xs = list(xs)
    return [sum(xs[i:i + k]) / k for i in range(len(xs) - k + 1)]

print(moving_avg_brute([1, 2, 3, 4, 5], 3))` },
    mcq: { q: 'Which structure gives an O(1) "push right, drop left" window?', options: ['collections.deque(maxlen=k)', 'list with pop(0)', 'a tuple rebuilt each step', 'a set'], answer: 0, explain: 'deque appends and pops at both ends in O(1); with maxlen=k it automatically drops the oldest item. list.pop(0) is O(k).' },
    hints: [`<p>Hint 1: Keep the current window in <code>deque(maxlen=k)</code>; once it is full, every new item produces a window.</p>`, `<p>Hint 2: For the average, keep a running sum: add the new item, subtract the item that falls out (read it as <code>window[0]</code> <b>before</b> appending when the deque is full).</p>`, `<p>Hint 3: Fill the first k − 1 items with <code>islice</code>, then loop over the rest of the same iterator. Yield <code>tuple(window)</code> so callers do not see later mutation.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'from itertools import count, islice\n' +
              'result = list(windows([1, 2, 3, 4, 5], 3))'
          ],
          [[1, 2, 3], [2, 3, 4], [3, 4, 5]]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'result = list(moving_average([1, 2, 3, 4, 5], 3))'
          ],
          [2, 3, 4]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'result = list(windows([1, 2], 5))'
          ],
          []
        ],
        [
          [
            'from itertools import count, islice\n' +
              'result = list(moving_average([1, 2], 5))'
          ],
          []
        ],
        [
          [
            'from itertools import count, islice\n' +
              'result = list(windows([], 1))'
          ],
          []
        ],
        [
          [
            'from itertools import count, islice\n' +
              'result = list(windows([7, 8, 9], 1))'
          ],
          [[7], [8], [9]]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'result = list(moving_average([7, 8, 9], 1))'
          ],
          [7, 8, 9]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'result = list(windows(\'abcd\', 2))'
          ],
          [['a', 'b'], ['b', 'c'], ['c', 'd']]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'result = list(windows([1, 2, 3], 3))'
          ],
          [[1, 2, 3]]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'result = list(islice(windows(count(), 3), 2))'
          ],
          [[0, 1, 2], [1, 2, 3]]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'result = list(islice(moving_average(count(), 4), 3))'
          ],
          [1.5, 2.5, 3.5]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'result = list(windows((x for x in range(4)), 2))'
          ],
          [[0, 1], [1, 2], [2, 3]]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'result = list(moving_average((x for x in [10, 20, 30]), 2))'
          ],
          [15, 25]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'result = (lambda r: [len(r), r[0], r[-1]])(list(moving_average(range(10**6), 1000)))'
          ],
          [999001, 499.5, 999499.5]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'result = (lambda r: [len(r), r[0], r[-1], len(r[0])])(list(windows(range(100000), 100)))'
          ],
          [
            99901,
            [
              0,
              1,
              2,
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11,
              12,
              13,
              14,
              15,
              16,
              17,
              18,
              19,
              20,
              21,
              22,
              23,
              24,
              25,
              26,
              27,
              28,
              29,
              30,
              31,
              32,
              33,
              34,
              35,
              36,
              37,
              38,
              39,
              40,
              41,
              42,
              43,
              44,
              45,
              46,
              47,
              48,
              49,
              50,
              51,
              52,
              53,
              54,
              55,
              56,
              57,
              58,
              59,
              60,
              61,
              62,
              63,
              64,
              65,
              66,
              67,
              68,
              69,
              70,
              71,
              72,
              73,
              74,
              75,
              76,
              77,
              78,
              79,
              80,
              81,
              82,
              83,
              84,
              85,
              86,
              87,
              88,
              89,
              90,
              91,
              92,
              93,
              94,
              95,
              96,
              97,
              98,
              99
            ],
            [
              99900,
              99901,
              99902,
              99903,
              99904,
              99905,
              99906,
              99907,
              99908,
              99909,
              99910,
              99911,
              99912,
              99913,
              99914,
              99915,
              99916,
              99917,
              99918,
              99919,
              99920,
              99921,
              99922,
              99923,
              99924,
              99925,
              99926,
              99927,
              99928,
              99929,
              99930,
              99931,
              99932,
              99933,
              99934,
              99935,
              99936,
              99937,
              99938,
              99939,
              99940,
              99941,
              99942,
              99943,
              99944,
              99945,
              99946,
              99947,
              99948,
              99949,
              99950,
              99951,
              99952,
              99953,
              99954,
              99955,
              99956,
              99957,
              99958,
              99959,
              99960,
              99961,
              99962,
              99963,
              99964,
              99965,
              99966,
              99967,
              99968,
              99969,
              99970,
              99971,
              99972,
              99973,
              99974,
              99975,
              99976,
              99977,
              99978,
              99979,
              99980,
              99981,
              99982,
              99983,
              99984,
              99985,
              99986,
              99987,
              99988,
              99989,
              99990,
              99991,
              99992,
              99993,
              99994,
              99995,
              99996,
              99997,
              99998,
              99999
            ],
            100
          ]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'result = list(moving_average([-1, -2, -3, -4], 2))'
          ],
          [-1.5, -2.5, -3.5]
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>A deque with maxlen holds the last k items; a running sum turns each average into O(1). Both functions are generators, so the stream can be infinite.</p>`,
      code: { lang: 'python', run: true, code: `from collections import deque
from itertools import islice, count

def windows(iterable, k):
    it = iter(iterable)
    window = deque(islice(it, k - 1), maxlen=k)   # first k-1 items
    for x in it:
        window.append(x)                          # oldest dropped automatically
        yield tuple(window)

def moving_average(iterable, k):
    it = iter(iterable)
    window = deque(maxlen=k)
    total = 0
    for x in it:
        if len(window) == k:
            total -= window[0]                    # item about to fall out
        window.append(x)
        total += x
        if len(window) == k:
            yield total / k

print(list(windows([1, 2, 3, 4, 5], 3)))          # [(1,2,3), (2,3,4), (3,4,5)]
print(list(moving_average([1, 2, 3, 4, 5], 3)))   # [2.0, 3.0, 4.0]
print(list(islice(moving_average(count(), 4), 3)))  # infinite input is fine` },
      dry: { head: ['x', 'window', 'total', 'yield'], rows: [['1', '[1]', '1', '—'], ['2', '[1, 2]', '3', '—'], ['3', '[1, 2, 3]', '6', '2.0'], ['4', '[2, 3, 4]', '9', '3.0'], ['5', '[3, 4, 5]', '12', '4.0']] },
      complexity: `<p><code>moving_average</code>: O(1) per item, O(k) memory. <code>windows</code>: O(k) per yielded tuple (copying), O(k) memory.</p>`,
      followUps: ['Floating-point drift in long running sums — when to recompute or use math.fsum?', 'Sliding window maximum (see the Hard problem).']
    }
  });

  practice.push({
    title: 'Round-Robin Interleave of Iterables', level: 'Medium', tags: ['iterators', 'deque', 'itertools'], companies: ['Google', 'Meta'],
    statement: `<p>Write a generator <code>roundrobin(*iterables)</code> that takes one item from each iterable in turn, skipping the ones that run out: <code>roundrobin('ABC', 'D', 'EF')</code> → A D E B F C. Iterables may be generators of different (even unknown) lengths.</p>`,
    constraints: `Up to 10<sup>4</sup> iterables, 10<sup>6</sup> total items. Each yielded item should cost O(1).`,
    example: `<p>Turn order: A(1st) D(2nd) E(3rd) → B(1st) [2nd exhausted, removed] F(3rd) → C(1st) [3rd exhausted]. Output <code>['A', 'D', 'E', 'B', 'F', 'C']</code>.</p>`,
    brute: { why: `<p>Convert everything to lists and loop <code>for i in range(max_len): for lst in lists: if i &lt; len(lst): yield lst[i]</code>. Materialises every input (no infinite or huge streams) and keeps checking exhausted lists on every round: O(k · max_len) checks.</p>`, code: `def roundrobin_brute(*iterables):
    lists = [list(it) for it in iterables]
    for i in range(max(map(len, lists), default=0)):
        for lst in lists:
            if i < len(lst):
                yield lst[i]

print(list(roundrobin_brute('ABC', 'D', 'EF')))` },
    mcq: { q: 'How do you remove an exhausted iterator from the rotation cheaply?', options: ['Keep iterators in a deque; popleft, try next(), and only append back if it produced a value', 'Rebuild a list of live iterators every round', 'Use zip()', 'Catch StopIteration and restart from the first iterator'], answer: 0, explain: 'A deque rotation gives O(1) per step; an exhausted iterator simply is not re-appended. zip stops at the shortest input.' },
    hints: [`<p>Hint 1: Store <code>iter(x)</code> for each input in a <code>deque</code> — the queue of "whose turn is it".</p>`, `<p>Hint 2: Loop while the deque is not empty: <code>it = q.popleft()</code>; try <code>yield next(it)</code>; on success append it back to the right.</p>`, `<p>Hint 3: On <code>StopIteration</code> just do not re-append. Careful: do not let StopIteration escape the generator (PEP 479) — catch it. Alternative from the docs recipes uses <code>cycle</code> + <code>islice</code>.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_val',
      cases: [
        [['list(roundrobin(\'ABC\', \'D\', \'EF\'))'], ['A', 'D', 'E', 'B', 'F', 'C']],
        [['list(roundrobin())'], []],
        [['list(roundrobin([]))'], []],
        [['list(roundrobin([], (x * x for x in range(3)), \'z\'))'], [0, 'z', 1, 4]],
        [['list(roundrobin([1, 2, 3]))'], [1, 2, 3]],
        [['list(roundrobin(\'AB\', \'CD\'))'], ['A', 'C', 'B', 'D']],
        [['list(roundrobin(\'A\', \'BCDE\'))'], ['A', 'B', 'C', 'D', 'E']],
        [['list(roundrobin([], [], []))'], []],
        [
          ['list(roundrobin(range(3), range(10, 12), range(20, 25)))'],
          [0, 10, 20, 1, 11, 21, 2, 22, 23, 24]
        ],
        [['list(roundrobin(*[[i] for i in range(10**4)])) == list(range(10**4))'], true],
        [
          [
            '(lambda r: [len(r), r[:4], r[-1]])(list(roundrobin(*[range(i * 10**5, (i + 1) * 10**5) for i in range(10)])))'
          ],
          [1000000, [0, 100000, 200000, 300000], 999999]
        ],
        [['list(roundrobin(\'ab\', iter(\'cde\')))'], ['a', 'c', 'b', 'd', 'e']],
        [
          ['list(roundrobin(*[range(i) for i in range(1, 6)]))'],
          [0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 4]
        ],
        [['next(roundrobin(iter(()), iter((9,))))'], 9]
      ],
      harness: {
        python: 'def t_val(src):\n' +
          '    try:\n' +
          '        return eval(src)\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>A queue of live iterators. Each step serves the iterator at the front and puts it at the back if it is still alive. Every item costs O(1), and exhausted iterators disappear once.</p>`,
      code: { lang: 'python', run: true, code: `from collections import deque

def roundrobin(*iterables):
    queue = deque(iter(it) for it in iterables)
    while queue:
        it = queue.popleft()
        try:
            value = next(it)
        except StopIteration:
            continue              # exhausted: drop it from the rotation
        yield value
        queue.append(it)          # still alive: back of the line

print(list(roundrobin('ABC', 'D', 'EF')))          # ['A', 'D', 'E', 'B', 'F', 'C']
print(list(roundrobin([], (x * x for x in range(3)), 'z')))   # [0, 'z', 1, 4]` },
      dry: { head: ['queue (front→back)', 'serve', 'yield', 'action'], rows: [['ABC, D, EF', 'ABC', 'A', 'append back'], ['D, EF, BC', 'D', 'D', 'append back'], ['EF, BC, (D done)', 'EF', 'E', 'append back'], ['BC, ∅, F', 'BC', 'B', 'append back'], ['∅(D), F, C', 'D-iter', '—', '<span class="c-r">exhausted → dropped</span>'], ['F, C', 'F', 'F', '…']] },
      complexity: `<p>O(total items + k) time, O(k) memory for k iterables.</p>`,
      followUps: ['Zigzag Iterator (LeetCode 281) as a class with next()/hasNext().', 'Weighted round robin: iterable i yields w[i] items per turn.']
    }
  });

  practice.push({
    title: 'Peekable Iterator', level: 'Medium', tags: ['iterator protocol', 'class design'], companies: ['Google', 'Apple', 'Pinterest'],
    statement: `<p>Wrap any iterator in a class <code>Peekable</code> that supports <code>peek()</code> (see the next item without consuming it), <code>next()</code> (normal iteration) and <code>has_next()</code>. It must also work in a <code>for</code> loop. (LeetCode 284.)</p>`,
    constraints: `Wrapped iterator may be infinite or a generator; peek() may be called many times in a row; O(1) per operation.`,
    example: `<p><code>p = Peekable(iter([1, 2, 3]))</code>: <code>p.peek()</code> → 1, <code>p.peek()</code> → 1, <code>next(p)</code> → 1, <code>next(p)</code> → 2, <code>p.has_next()</code> → True, <code>list(p)</code> → [3], <code>p.has_next()</code> → False.</p>`,
    brute: { why: `<p>Convert the source to a list and keep an index. peek is <code>lst[i]</code>. Works, but destroys laziness: an infinite generator never finishes converting, and a big one wastes memory.</p>`, code: `class PeekableList:
    def __init__(self, it):
        self.items, self.i = list(it), 0     # materialises everything
    def peek(self):
        return self.items[self.i]
    def __next__(self):
        if self.i >= len(self.items):
            raise StopIteration
        self.i += 1
        return self.items[self.i - 1]
    def __iter__(self):
        return self

p = PeekableList(iter([1, 2, 3]))
print(p.peek(), next(p), list(p))` },
    mcq: { q: 'How do you peek without losing the value?', options: ['Pull it with next() and cache it in a buffer slot until it is consumed', 'Call next() and then "un-next" the iterator', 'Copy the iterator with copy.copy', 'Use itertools.tee every time'], answer: 0, explain: 'Iterators cannot go back. Pull one item ahead and store it (with a sentinel meaning "nothing cached"); next() returns the cached item first.' },
    hints: [`<p>Hint 1: Keep one cached item in <code>self._buf</code>, using a private sentinel for "empty cache" (None might be a real value!).</p>`, `<p>Hint 2: <code>peek()</code>: if cache empty, fill it with <code>next(self._it)</code> (StopIteration propagates — or accept a default). <code>__next__</code>: if cache full, return it and clear; else delegate.</p>`, `<p>Hint 3: <code>has_next()</code> = try to peek, return False on StopIteration. Add <code>__iter__</code> returning self and <code>__bool__</code> for convenience.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'p = Peekable([1, 2, 3])\n' +
              'result = [p.peek(), p.peek(), next(p), next(p), p.has_next(), list(p), p.has_next()]'
          ],
          [1, 1, 1, 2, true, [3], false]
        ],
        [
          [
            'from itertools import count\n' +
              'q = Peekable(count(10))\n' +
              'result = [q.peek(), next(q), next(q)]'
          ],
          [10, 10, 11]
        ],
        [
          [
            'r = Peekable([None, 0])\n' +
              'result = [r.peek(), r.has_next(), list(r)]'
          ],
          [null, true, [null, 0]]
        ],
        [['p = Peekable([])\nresult = p.peek()'], '!StopIteration'],
        [['p = Peekable([])\nresult = [p.has_next(), p.peek(\'dflt\')]'], [false, 'dflt']],
        [['p = Peekable([1])\nnext(p)\nresult = next(p)'], '!StopIteration'],
        [['p = Peekable(\'ab\')\nresult = [x for x in p]'], ['a', 'b']],
        [['p = Peekable([5, 6])\np.peek()\np.peek()\nresult = list(p)'], [5, 6]],
        [
          [
            'p = Peekable(x for x in [1, 2, 3])\n' +
              'result = [p.has_next(), next(p), p.peek(), next(p), next(p), p.has_next()]'
          ],
          [true, 1, 2, 2, 3, false]
        ],
        [
          [
            'p = Peekable(range(10**6))\n' +
              'n = 0\n' +
              'while p.has_next():\n' +
              '    n += p.peek() == next(p)\n' +
              'result = n'
          ],
          1000000
        ],
        [
          [
            'p = Peekable([1, 2])\n' +
              'result = [p.peek(99), p.peek(), next(p)]'
          ],
          [1, 1, 1]
        ],
        [
          [
            'p = Peekable([1])\n' +
              'result = [iter(p) is p, p.has_next(), p.has_next()]'
          ],
          [true, true, true]
        ],
        [
          [
            'p = Peekable([0, \'\', False])\n' +
              'result = [p.has_next(), next(p), p.has_next(), next(p), p.has_next(), next(p), p.has_next()]'
          ],
          [true, 0, true, '', true, false, false]
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>A one-item look-ahead buffer with a sentinel. Every operation is O(1) and the wrapped iterator is consumed lazily, so infinite sources work.</p>`,
      code: { lang: 'python', run: true, code: `from itertools import count

_EMPTY = object()

class Peekable:
    def __init__(self, iterable):
        self._it = iter(iterable)
        self._buf = _EMPTY

    def __iter__(self):
        return self

    def peek(self, default=_EMPTY):
        if self._buf is _EMPTY:
            try:
                self._buf = next(self._it)
            except StopIteration:
                if default is _EMPTY:
                    raise
                return default
        return self._buf

    def __next__(self):
        if self._buf is not _EMPTY:
            value, self._buf = self._buf, _EMPTY
            return value
        return next(self._it)

    def has_next(self):
        return self.peek(_SENTINEL_FALSE) is not _SENTINEL_FALSE

_SENTINEL_FALSE = object()

p = Peekable([1, 2, 3])
print(p.peek(), p.peek(), next(p), next(p), p.has_next(), list(p), p.has_next())
q = Peekable(count(10))
print(q.peek(), next(q), next(q))      # 10 10 11 (infinite source OK)
r = Peekable([None, 0])
print(r.peek(), r.has_next(), list(r))  # None True [None, 0]` },
      complexity: `<p>O(1) time per operation, O(1) extra memory.</p>`,
      followUps: ['Support peek(n) for n items ahead (use a deque buffer).', 'Add prepend(x) to push items back (more_itertools.peekable does).']
    }
  });

  practice.push({
    title: 'Chunk a Stream into Batches (and the Shared-Iterator Trick)', level: 'Medium', tags: ['islice', 'iterator', 'batching', 'predict the output'], companies: ['Snowflake', 'Databricks', 'Amazon'],
    statement: `<p>Write <code>chunks(iterable, n)</code> that yields lists of up to <code>n</code> items from any (possibly huge) iterable, without <code>itertools.batched</code>. Then <b>predict</b> what <code>[list(islice(range(7), 3)) for _ in range(3)]</code> prints and explain why your version does not have that bug.</p>`,
    constraints: `n ≥ 1; up to 10<sup>9</sup> items streamed; memory O(n).`,
    example: `<p><code>list(chunks(range(7), 3))</code> → <code>[[0, 1, 2], [3, 4, 5], [6]]</code>. The predict-the-output line prints <code>[[0, 1, 2], [0, 1, 2], [0, 1, 2]]</code> because <code>range(7)</code> is an iterable and each <code>islice</code> starts a fresh iterator.</p>`,
    brute: { why: `<p>Slice a list: <code>[xs[i:i+n] for i in range(0, len(xs), n)]</code>. Requires a sequence (len + slicing), so generators/files must be fully materialised first.</p>`, code: `def chunks_brute(iterable, n):
    xs = list(iterable)                          # entire stream in memory
    return [xs[i:i + n] for i in range(0, len(xs), n)]

print(chunks_brute(range(7), 3))` },
    mcq: { q: 'What makes repeated islice calls continue where the previous one stopped?', options: ['Calling iter() once and slicing the SAME iterator each time', 'Passing step=n to islice', 'Wrapping the input in list()', 'Using range instead of a generator'], answer: 0, explain: 'islice consumes from whatever iterator it is given. With one shared iterator, each islice picks up where the last one ended; with an iterable like range, each call creates a fresh iterator from the start.' },
    hints: [`<p>Hint 1: Call <code>it = iter(iterable)</code> exactly once.</p>`, `<p>Hint 2: Loop: <code>chunk = list(islice(it, n))</code>; if the chunk is empty, stop; else yield it.</p>`, `<p>Hint 3: Python 3.8+ walrus makes it a 2-liner: <code>while chunk := list(islice(it, n)): yield chunk</code>. Validate n ≥ 1: with n = 0, <code>islice(it, 0)</code> is always empty, so the loop would end at once and silently yield nothing.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'from itertools import islice\n' +
              'result = list(chunks(range(7), 3))'
          ],
          [[0, 1, 2], [3, 4, 5], [6]]
        ],
        [['from itertools import islice\nresult = list(chunks([], 3))'], []],
        [
          [
            'from itertools import islice\n' +
              'result = list(chunks([1, 2, 3], 1))'
          ],
          [[1], [2], [3]]
        ],
        [
          [
            'from itertools import islice\n' +
              'result = list(chunks([1, 2, 3], 3))'
          ],
          [[1, 2, 3]]
        ],
        [
          [
            'from itertools import islice\n' +
              'result = list(chunks([1, 2, 3], 10))'
          ],
          [[1, 2, 3]]
        ],
        [
          [
            'from itertools import islice\n' +
              'result = list(chunks(range(6), 3))'
          ],
          [[0, 1, 2], [3, 4, 5]]
        ],
        [
          [
            'from itertools import islice\n' +
              'result = list(chunks((x * x for x in range(5)), 2))'
          ],
          [[0, 1], [4, 9], [16]]
        ],
        [
          [
            'from itertools import islice\n' +
              'result = list(chunks(\'abcde\', 2))'
          ],
          [['a', 'b'], ['c', 'd'], ['e']]
        ],
        [['from itertools import islice\nresult = list(chunks([1], 0))'], '!ValueError'],
        [['from itertools import islice\nresult = list(chunks([1], -2))'], '!ValueError'],
        [
          [
            'from itertools import islice\n' +
              'result = [list(islice(range(7), 3)) for _ in range(3)]'
          ],
          [[0, 1, 2], [0, 1, 2], [0, 1, 2]]
        ],
        [
          [
            'from itertools import islice\n' +
              'result = (lambda it: [list(islice(it, 3)) for _ in range(3)])(iter(range(7)))'
          ],
          [[0, 1, 2], [3, 4, 5], [6]]
        ],
        [
          [
            'from itertools import islice\n' +
              'result = (lambda it: [next(chunks(it, 4)), next(it)])(iter(range(10)))'
          ],
          [[0, 1, 2, 3], 4]
        ],
        [
          [
            'from itertools import islice\n' +
              'result = (lambda cs: [len(cs), sum(len(c) for c in cs), len(cs[0]), len(cs[-1])])(list(chunks(range(10**6), 1000)))'
          ],
          [1000, 1000000, 1000, 1000]
        ],
        [
          [
            'from itertools import islice\n' +
              'result = (lambda cs: [len(cs), len(cs[0])])(list(chunks(range(10**6), 10**6)))'
          ],
          [1, 1000000]
        ],
        [
          [
            'from itertools import islice\n' +
              'result = (lambda cs: [len(cs), len(cs[-1])])(list(chunks(range(10**6 + 1), 1000)))'
          ],
          [1001, 1]
        ],
        [
          [
            'from itertools import islice\n' +
              'result = list(chunks([[1], [2]], 1))'
          ],
          [[[1]], [[2]]]
        ],
        [
          [
            'from itertools import islice\n' +
              'result = list(chunks([0, 0, 0], 2))'
          ],
          [[0, 0], [0]]
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>One shared iterator + repeated <code>islice</code>. Each chunk is built with O(n) memory and the stream advances exactly once. The walrus operator keeps the loop compact.</p>`,
      code: { lang: 'python', run: true, code: `from itertools import islice

def chunks(iterable, n):
    if n < 1:
        raise ValueError('n must be at least 1')
    it = iter(iterable)                     # ONE bookmark shared by all slices
    while chunk := list(islice(it, n)):
        yield chunk

print(list(chunks(range(7), 3)))            # [[0, 1, 2], [3, 4, 5], [6]]
print([list(islice(range(7), 3)) for _ in range(3)])        # bug: fresh iterator each time
it = iter(range(7))
print([list(islice(it, 3)) for _ in range(3)])              # fixed: [[0,1,2],[3,4,5],[6]]
print(list(chunks((x * x for x in range(5)), 2)))           # works on generators` },
      complexity: `<p>O(total items) time, O(n) memory per chunk.</p>`,
      followUps: ['Yield lazy sub-iterators instead of lists — what goes wrong if the caller skips one?', 'Use itertools.batched(it, n, strict=True) on 3.13 to require full chunks.']
    }
  });

  practice.push({
    title: 'Atomic File Write Context Manager', level: 'Medium', tags: ['context manager', 'files', 'os.replace', 'reliability'], companies: ['Dropbox', 'Stripe', 'Cloudflare'],
    statement: `<p>Writing a config file directly is dangerous: if the program crashes half-way, the file is left truncated. Write a context manager <code>atomic_write(path)</code> that yields a file object; on success it <b>atomically replaces</b> <code>path</code> with the new content, and on any exception it deletes the temporary file and leaves the original untouched (re-raising the error).</p>`,
    constraints: `Same filesystem for temp file and target. Must not leak temp files. Exceptions must propagate.`,
    example: `<p>config.json contains <code>{"v": 1}</code>. <code>with atomic_write(p) as f: f.write('{"v": 2}')</code> → file now <code>{"v": 2}</code>. With <code>raise</code> after a partial write → file still <code>{"v": 1}</code>, no stray .tmp files.</p>`,
    brute: { why: `<p><code>open(path, 'w')</code> truncates the real file immediately. If the process dies (or an exception happens) after truncation but before all writes, readers see an empty or half-written file — corrupted config.</p>`, code: `import os, tempfile

def save_brute(path, text, fail=False):
    with open(path, 'w') as f:      # original content destroyed right here
        f.write(text[:3])
        if fail:
            raise RuntimeError('crash mid-write')
        f.write(text[3:])

p = os.path.join(tempfile.mkdtemp(), 'cfg.json')
save_brute(p, '{"v": 1}')
try:
    save_brute(p, '{"v": 2}', fail=True)
except RuntimeError:
    pass
print(open(p).read())               # '{"v' -> corrupted!` },
    mcq: { q: 'Why write to a temp file in the SAME directory and then os.replace?', options: ['os.replace is atomic only within one filesystem; readers see either the old or the new file', 'Temp files are faster', 'os.replace compresses the file', 'It avoids needing a with statement'], answer: 0, explain: 'A rename within one filesystem is atomic on POSIX and Windows (os.replace). Across filesystems it degrades to copy+delete, which is not atomic.' },
    hints: [`<p>Hint 1: <code>tempfile.NamedTemporaryFile('w', dir=os.path.dirname(path), delete=False)</code> creates the temp file next to the target.</p>`, `<p>Hint 2: Use <code>@contextmanager</code>: yield the temp file; after the yield (success path) flush, <code>os.fsync</code>, close, then <code>os.replace(tmp, path)</code>.</p>`, `<p>Hint 3: Wrap in <code>try/except BaseException</code>: on error close and <code>os.unlink(tmp)</code>, then <code>raise</code>. Do not swallow the exception.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'import os, tempfile\n' +
              'folder = tempfile.mkdtemp()\n' +
              'cfg = os.path.join(folder, \'config.txt\')\n' +
              'rd = lambda p: open(p).read()\n' +
              'with atomic_write(cfg) as f:\n' +
              '    f.write(\'{"v": 1}\')\n' +
              'try:\n' +
              '    with atomic_write(cfg) as f:\n' +
              '        f.write(\'{"v\')\n' +
              '        raise RuntimeError(\'crash\')\n' +
              'except RuntimeError:\n' +
              '    pass\n' +
              'result = [rd(cfg), sorted(os.listdir(folder))]'
          ],
          ['{"v": 1}', ['config.txt']]
        ],
        [
          [
            'import os, tempfile\n' +
              'folder = tempfile.mkdtemp()\n' +
              'cfg = os.path.join(folder, \'config.txt\')\n' +
              'rd = lambda p: open(p).read()\n' +
              'with atomic_write(cfg) as f:\n' +
              '    f.write(\'v2\')\n' +
              'result = [rd(cfg), sorted(os.listdir(folder))]'
          ],
          ['v2', ['config.txt']]
        ],
        [
          [
            'import os, tempfile\n' +
              'folder = tempfile.mkdtemp()\n' +
              'cfg = os.path.join(folder, \'config.txt\')\n' +
              'rd = lambda p: open(p).read()\n' +
              'with atomic_write(cfg) as f:\n' +
              '    f.write(\'v1\')\n' +
              'with atomic_write(cfg) as f:\n' +
              '    f.write(\'v2\')\n' +
              'result = [rd(cfg), sorted(os.listdir(folder))]'
          ],
          ['v2', ['config.txt']]
        ],
        [
          [
            'import os, tempfile\n' +
              'folder = tempfile.mkdtemp()\n' +
              'cfg = os.path.join(folder, \'config.txt\')\n' +
              'rd = lambda p: open(p).read()\n' +
              'try:\n' +
              '    with atomic_write(cfg) as f:\n' +
              '        f.write(\'x\')\n' +
              '        raise ValueError(\'no\')\n' +
              'except ValueError:\n' +
              '    pass\n' +
              'result = [os.path.exists(cfg), sorted(os.listdir(folder))]'
          ],
          [false, []]
        ],
        [
          [
            'import os, tempfile\n' +
              'folder = tempfile.mkdtemp()\n' +
              'cfg = os.path.join(folder, \'config.txt\')\n' +
              'rd = lambda p: open(p).read()\n' +
              'p = os.path.join(folder, \'blob.bin\')\n' +
              'with atomic_write(p, \'wb\') as f:\n' +
              '    f.write(bytes([1, 2, 3]))\n' +
              'result = [list(open(p, \'rb\').read()), sorted(os.listdir(folder))]'
          ],
          [[1, 2, 3], ['blob.bin']]
        ],
        [
          [
            'import os, tempfile\n' +
              'folder = tempfile.mkdtemp()\n' +
              'cfg = os.path.join(folder, \'config.txt\')\n' +
              'rd = lambda p: open(p).read()\n' +
              'with atomic_write(cfg) as f:\n' +
              '    f.write(\'old\')\n' +
              'try:\n' +
              '    with atomic_write(cfg) as f:\n' +
              '        f.write(\'zz\')\n' +
              '        raise KeyboardInterrupt()\n' +
              'except KeyboardInterrupt:\n' +
              '    pass\n' +
              'result = [rd(cfg), sorted(os.listdir(folder))]'
          ],
          ['old', ['config.txt']]
        ],
        [
          [
            'import os, tempfile\n' +
              'folder = tempfile.mkdtemp()\n' +
              'cfg = os.path.join(folder, \'config.txt\')\n' +
              'rd = lambda p: open(p).read()\n' +
              'with atomic_write(cfg) as f:\n' +
              '    f.write(\'old\')\n' +
              'with atomic_write(cfg) as f:\n' +
              '    f.write(\'new\')\n' +
              '    f.flush()\n' +
              '    seen = rd(cfg)\n' +
              'result = [seen, rd(cfg)]'
          ],
          ['old', 'new']
        ],
        [
          [
            'import os, tempfile\n' +
              'folder = tempfile.mkdtemp()\n' +
              'cfg = os.path.join(folder, \'config.txt\')\n' +
              'rd = lambda p: open(p).read()\n' +
              'with atomic_write(cfg) as f:\n' +
              '    f.write(\'x\' * 5000000)\n' +
              'result = [len(rd(cfg)), sorted(os.listdir(folder))]'
          ],
          [5000000, ['config.txt']]
        ],
        [
          [
            'import os, tempfile\n' +
              'folder = tempfile.mkdtemp()\n' +
              'cfg = os.path.join(folder, \'config.txt\')\n' +
              'rd = lambda p: open(p).read()\n' +
              'with atomic_write(cfg) as f:\n' +
              '    pass\n' +
              'result = [rd(cfg), sorted(os.listdir(folder))]'
          ],
          ['', ['config.txt']]
        ],
        [
          [
            'import os, tempfile\n' +
              'folder = tempfile.mkdtemp()\n' +
              'cfg = os.path.join(folder, \'config.txt\')\n' +
              'rd = lambda p: open(p).read()\n' +
              'with atomic_write(cfg) as f:\n' +
              '    f.write(\'héllo €\')\n' +
              'result = open(cfg, encoding=\'utf-8\').read()'
          ],
          'héllo €'
        ],
        [
          [
            'import os, tempfile\n' +
              'folder = tempfile.mkdtemp()\n' +
              'cfg = os.path.join(folder, \'config.txt\')\n' +
              'rd = lambda p: open(p).read()\n' +
              'old = os.getcwd()\n' +
              'os.chdir(folder)\n' +
              'try:\n' +
              '    with atomic_write(\'rel.txt\') as f:\n' +
              '        f.write(\'rel\')\n' +
              'finally:\n' +
              '    os.chdir(old)\n' +
              'result = [rd(os.path.join(folder, \'rel.txt\')), sorted(os.listdir(folder))]'
          ],
          ['rel', ['rel.txt']]
        ],
        [
          [
            'import os, tempfile\n' +
              'folder = tempfile.mkdtemp()\n' +
              'cfg = os.path.join(folder, \'config.txt\')\n' +
              'rd = lambda p: open(p).read()\n' +
              'for i in range(200):\n' +
              '    with atomic_write(cfg) as f:\n' +
              '        f.write(str(i))\n' +
              'result = [rd(cfg), sorted(os.listdir(folder))]'
          ],
          ['199', ['config.txt']]
        ],
        [
          [
            'import os, tempfile\n' +
              'folder = tempfile.mkdtemp()\n' +
              'cfg = os.path.join(folder, \'config.txt\')\n' +
              'rd = lambda p: open(p).read()\n' +
              'class Boom(Exception):\n' +
              '    pass\n' +
              'try:\n' +
              '    with atomic_write(cfg) as f:\n' +
              '        raise Boom()\n' +
              'except Boom:\n' +
              '    result = \'propagated\''
          ],
          'propagated'
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Write everything to a sibling temp file; only when the with-body succeeds, fsync and atomically rename over the target. On failure remove the temp file and re-raise. Readers never observe a partial file.</p>`,
      code: { lang: 'python', run: true, code: `import os, tempfile
from contextlib import contextmanager

@contextmanager
def atomic_write(path, mode='w', encoding='utf-8'):
    directory = os.path.dirname(os.path.abspath(path))
    tmp = tempfile.NamedTemporaryFile(mode, dir=directory, delete=False, suffix='.tmp',
                                      encoding=None if 'b' in mode else encoding)   # binary modes take no encoding
    try:
        yield tmp                        # caller writes here
        tmp.flush()
        os.fsync(tmp.fileno())           # make sure bytes hit the disk
        tmp.close()
        os.replace(tmp.name, path)       # atomic swap
    except BaseException:
        tmp.close()
        os.unlink(tmp.name)              # no stray temp files
        raise                            # never swallow

d = tempfile.mkdtemp()
p = os.path.join(d, 'cfg.json')
with atomic_write(p) as f:
    f.write('{"v": 1}')
try:
    with atomic_write(p) as f:
        f.write('{"v')
        raise RuntimeError('crash mid-write')
except RuntimeError as e:
    print('error:', e)
print(open(p).read(), sorted(os.listdir(d)))   # {"v": 1} ['cfg.json']` },
      complexity: `<p>O(size of content) I/O; one extra rename. Memory O(1) beyond the file buffer.</p>`,
      followUps: ['Also fsync the directory so the rename survives power loss on POSIX.', 'Preserve the original file permissions (os.stat + os.chmod before replace).', 'Make an async version with aiofiles and asynccontextmanager.']
    }
  });

  /* ================= PRACTICE: Hard ================= */
  practice.push({
    title: 'Merge K Sorted Streams Lazily', level: 'Hard', tags: ['generator', 'heap', 'k-way merge'], companies: ['Google', 'Amazon', 'Bloomberg', 'Snowflake'],
    statement: `<p>You receive <code>k</code> iterators, each yielding numbers in ascending order (e.g. sorted log files from k servers). Write a generator <code>merge_sorted(*iterators)</code> that yields all numbers in ascending order, <b>lazily</b>, without reading any input more than one item ahead. Do not use <code>heapq.merge</code> (but compare with it).</p>`,
    constraints: `k ≤ 10<sup>4</sup>, total N ≤ 10<sup>9</sup> items (cannot fit in memory). Memory must be O(k). Each output item should cost O(log k).`,
    example: `<p>Streams <code>[1, 4, 7]</code>, <code>[2, 5]</code>, <code>[0, 6, 8, 9]</code> → <code>0 1 2 4 5 6 7 8 9</code>. The first output (0) is available after reading just one item from each stream.</p>`,
    brute: { why: `<p>Read everything and sort: <code>sorted(chain(*iterators))</code>. O(N log N) time, O(N) memory — impossible for 10<sup>9</sup> items, and the first result appears only after reading everything. It also ignores the fact that each input is already sorted.</p>`, code: `from itertools import chain

def merge_brute(*iterators):
    return sorted(chain(*iterators))     # materialises all N items

print(merge_brute(iter([1, 4, 7]), iter([2, 5]), iter([0, 6, 8, 9])))` },
    mcq: { q: 'What should the heap contain at any moment?', options: ['One (current value, stream index, iterator) entry per non-exhausted stream', 'All items read so far', 'Only the global minimum', 'The last item of each stream'], answer: 0, explain: 'Each stream contributes only its current head. Pop the smallest head, yield it, then push that stream\'s next item. The heap never exceeds k entries.' },
    hints: [`<p>Hint 1: The next output is always the smallest of the k current heads. A min-heap gives that in O(log k).</p>`, `<p>Hint 2: Push tuples <code>(value, i, it)</code>. The index <code>i</code> breaks ties so Python never tries to compare two iterator objects (which raises TypeError).</p>`, `<p>Hint 3: Recipe: seed the heap with each stream's first item (skip empty streams). Loop: pop (v, i, it), yield v, <code>nxt = next(it, END)</code>; if not END push (nxt, i, it). Use <code>heapreplace</code> to pop+push in one step.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'from itertools import count, islice\n' +
              'import heapq, random\n' +
              'result = list(merge_sorted([1, 4, 7], [2, 5], [0, 6, 8, 9]))'
          ],
          [0, 1, 2, 4, 5, 6, 7, 8, 9]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'import heapq, random\n' +
              'result = list(merge_sorted())'
          ],
          []
        ],
        [
          [
            'from itertools import count, islice\n' +
              'import heapq, random\n' +
              'result = list(merge_sorted([3, 4]))'
          ],
          [3, 4]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'import heapq, random\n' +
              'result = list(merge_sorted([], [1], []))'
          ],
          [1]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'import heapq, random\n' +
              'result = list(merge_sorted([], []))'
          ],
          []
        ],
        [
          [
            'from itertools import count, islice\n' +
              'import heapq, random\n' +
              'result = list(merge_sorted([1, 1], [1]))'
          ],
          [1, 1, 1]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'import heapq, random\n' +
              'result = list(merge_sorted([-3, 0], [-5, 5], [-4]))'
          ],
          [-5, -4, -3, 0, 5]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'import heapq, random\n' +
              'result = list(merge_sorted([1, 2.5], [2, 3]))'
          ],
          [1, 2, 2.5, 3]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'import heapq, random\n' +
              'result = list(merge_sorted(\'ace\', \'bdf\'))'
          ],
          ['a', 'b', 'c', 'd', 'e', 'f']
        ],
        [
          [
            'from itertools import count, islice\n' +
              'import heapq, random\n' +
              'result = list(islice(merge_sorted(count(0, 2), count(1, 2)), 8))'
          ],
          [0, 1, 2, 3, 4, 5, 6, 7]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'import heapq, random\n' +
              'result = list(merge_sorted((x for x in [1, 3]), iter([2, 4])))'
          ],
          [1, 2, 3, 4]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'import heapq, random\n' +
              'result = list(merge_sorted([1, 2, 3], [4, 5, 6]))'
          ],
          [1, 2, 3, 4, 5, 6]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'import heapq, random\n' +
              'result = list(merge_sorted([4, 5, 6], [1, 2, 3]))'
          ],
          [1, 2, 3, 4, 5, 6]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'import heapq, random\n' +
              'result = list(merge_sorted(*[range(i, 10**6, 10**4) for i in range(10**4)])) == list(range(10**6))'
          ],
          true
        ],
        [
          [
            'from itertools import count, islice\n' +
              'import heapq, random\n' +
              'result = (lambda s: list(merge_sorted(*s)) == list(heapq.merge(*s)))([sorted(random.Random(i).sample(range(1000), 50)) for i in range(40)])'
          ],
          true
        ],
        [
          [
            'from itertools import count, islice\n' +
              'counts = [0, 0, 0]\n' +
              'def src(i, data):\n' +
              '    for x in data:\n' +
              '        counts[i] += 1\n' +
              '        yield x\n' +
              'g = merge_sorted(src(0, [1, 4, 7]), src(1, [2, 5]), src(2, [0, 6, 8, 9]))\n' +
              'first = next(g)\n' +
              'result = [first, list(counts)]'
          ],
          [0, [1, 1, 1]]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'counts = [0, 0, 0]\n' +
              'def src(i, data):\n' +
              '    for x in data:\n' +
              '        counts[i] += 1\n' +
              '        yield x\n' +
              'g = merge_sorted(src(0, [1, 4, 7]), src(1, [2, 5]), src(2, [0, 6, 8, 9]))\n' +
              'a = next(g)\n' +
              'b = next(g)\n' +
              'result = [a, b, list(counts)]'
          ],
          [0, 1, [1, 1, 2]]
        ],
        [
          [
            'from itertools import count, islice\n' +
              'counts = [0, 0, 0]\n' +
              'def src(i, data):\n' +
              '    for x in data:\n' +
              '        counts[i] += 1\n' +
              '        yield x\n' +
              'g = merge_sorted(src(0, [1, 4, 7]), src(1, [2, 5]), src(2, [0, 6, 8, 9]))\n' +
              'result = [x for x in g]'
          ],
          [0, 1, 2, 4, 5, 6, 7, 8, 9]
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Classic k-way merge with a heap of stream heads. Laziness comes for free: we only pull from the stream whose item was just emitted. Same algorithm as <code>heapq.merge</code> and the merge phase of external sort.</p>`,
      code: { lang: 'python', run: true, code: `import heapq
from itertools import islice, count

_END = object()

def merge_sorted(*iterators):
    heap = []
    for i, it in enumerate(map(iter, iterators)):
        first = next(it, _END)
        if first is not _END:
            heap.append((first, i, it))
    heapq.heapify(heap)
    while heap:
        value, i, it = heap[0]
        yield value
        nxt = next(it, _END)
        if nxt is _END:
            heapq.heappop(heap)                      # stream finished
        else:
            heapq.heapreplace(heap, (nxt, i, it))    # pop + push in one go

print(list(merge_sorted([1, 4, 7], [2, 5], [0, 6, 8, 9])))
print(list(heapq.merge([1, 4, 7], [2, 5], [0, 6, 8, 9])))   # stdlib equivalent
evens, odds = count(0, 2), count(1, 2)                     # infinite inputs!
print(list(islice(merge_sorted(evens, odds), 8)))` },
      dry: { head: ['heap heads', 'yield', 'pull from', 'push'], rows: [['0, 1, 2', '0', 'stream 3', '6'], ['1, 2, 6', '1', 'stream 1', '4'], ['2, 4, 6', '2', 'stream 2', '5'], ['4, 5, 6', '4', 'stream 1', '7'], ['5, 6, 7', '5', 'stream 2', '(end → pop)']] },
      complexity: `<p>O(N log k) time, O(k) memory. First output after k reads.</p>`,
      followUps: ['Add key= and reverse= like heapq.merge.', 'Deduplicate equal values across streams while merging.', 'External sort: how do you produce the k sorted runs from a 1 TB file?']
    }
  });

  practice.push({
    title: 'BST Iterator with O(h) Memory', level: 'Hard', tags: ['iterator protocol', 'stack', 'generator', 'tree'], companies: ['Meta', 'Microsoft', 'LinkedIn', 'Google'],
    statement: `<p>Implement <code>BSTIterator(root)</code> with <code>next()</code> (return the next smallest value) and <code>has_next()</code>, plus support for Python's <code>for</code> loop. Both operations must be <b>amortised O(1)</b> and memory must be <b>O(h)</b> where h is the tree height — you may not store the full in-order list. (LeetCode 173.)</p>`,
    constraints: `Up to 10<sup>5</sup> nodes; tree may be completely skewed (h = n), so avoid recursion-depth problems.`,
    example: `<p>Tree 7 → (3, 15 → (9, 20)). Calls: next → 3, next → 7, has_next → True, next → 9, next → 15, next → 20, has_next → False.</p>${H.arr([3, 7, 9, 15, 20], { label: 'in-order', hl: { 0: 'g', 1: 'g' } })}`,
    brute: { why: `<p>Do a full in-order traversal into a list in the constructor, then walk an index. next/has_next are O(1), but memory is O(n) and the constructor does O(n) work even if the caller only wants the smallest value. Recursive traversal also crashes on a skewed tree of depth 10<sup>5</sup>.</p>`, code: `class Node:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

class BSTIteratorList:
    def __init__(self, root):
        self.vals, self.i = [], 0
        def inorder(n):
            if n:
                inorder(n.left); self.vals.append(n.val); inorder(n.right)
        inorder(root)                        # O(n) memory, recursion depth h
    def next(self):
        self.i += 1
        return self.vals[self.i - 1]
    def has_next(self):
        return self.i < len(self.vals)

it = BSTIteratorList(Node(7, Node(3), Node(15, Node(9), Node(20))))
print(it.next(), it.next(), it.has_next())` },
    mcq: { q: 'What does the stack hold in the O(h) solution?', options: ['The path of nodes whose left subtree is done but which have not been returned yet', 'All nodes of the tree', 'Only leaf nodes', 'The values already returned'], answer: 0, explain: 'Push the leftmost path. next() pops the top (the smallest unreturned node), then pushes the leftmost path of its right child. The stack never holds more than one root-to-leaf path.' },
    hints: [`<p>Hint 1: The smallest value is reached by going left as far as possible. Push every node on that path.</p>`, `<p>Hint 2: <code>next()</code>: pop node n, then push the left spine of <code>n.right</code>. <code>has_next()</code>: stack not empty. Each node is pushed and popped once → amortised O(1).</p>`, `<p>Hint 3: For the Python protocol, add <code>__iter__</code> returning self and <code>__next__</code> raising StopIteration when the stack is empty. Bonus: an iterative generator version is only ~8 lines.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'tree = Node(7, Node(3), Node(15, Node(9), Node(20)))\n' +
              'it = BSTIterator(tree)\n' +
              'result = [it.next(), it.next(), it.has_next(), it.next(), it.next(), it.next(), it.has_next()]'
          ],
          [3, 7, true, 9, 15, 20, false]
        ],
        [
          [
            'tree = Node(7, Node(3), Node(15, Node(9), Node(20)))\n' +
              'result = [list(BSTIterator(tree)), list(inorder_gen(tree))]'
          ],
          [[3, 7, 9, 15, 20], [3, 7, 9, 15, 20]]
        ],
        [
          [
            'tree = Node(7, Node(3), Node(15, Node(9), Node(20)))\n' +
              'it = BSTIterator(tree)\n' +
              'it.next(); it.next()\n' +
              'result = [it.has_next(), list(it), it.has_next()]'
          ],
          [true, [9, 15, 20], false]
        ],
        [
          ['result = [BSTIterator(None).has_next(), list(BSTIterator(None)), list(inorder_gen(None))]'],
          [false, [], []]
        ],
        [['result = [list(BSTIterator(Node(5))), BSTIterator(Node(5)).next()]'], [[5], 5]],
        [
          [
            't = None\n' +
              'for v in range(1, 1001):\n' +
              '    t = Node(v, left=t)\n' +
              'result = list(BSTIterator(t)) == list(range(1, 1001))'
          ],
          true
        ],
        [
          [
            't = None\n' +
              'for v in range(1, 100001):\n' +
              '    t = Node(v, left=t)\n' +
              'result = [sum(BSTIterator(t)), next(inorder_gen(t))]'
          ],
          [5000050000, 1]
        ],
        [
          [
            't = None\n' +
              'for v in range(100000, 0, -1):\n' +
              '    t = Node(v, right=t)\n' +
              'result = [sum(BSTIterator(t)), next(iter(BSTIterator(t))), sum(inorder_gen(t))]'
          ],
          [5000050000, 1, 5000050000]
        ],
        [
          [
            'import random\n' +
              'rnd = random.Random(4)\n' +
              'vals = rnd.sample(range(10**6), 5000)\n' +
              'root = None\n' +
              'def insert(root, v):\n' +
              '    if root is None:\n' +
              '        return Node(v)\n' +
              '    cur = root\n' +
              '    while True:\n' +
              '        side = \'left\' if v < cur.val else \'right\'\n' +
              '        nxt = getattr(cur, side)\n' +
              '        if nxt is None:\n' +
              '            setattr(cur, side, Node(v))\n' +
              '            return root\n' +
              '        cur = nxt\n' +
              'for v in vals:\n' +
              '    root = insert(root, v)\n' +
              'result = [list(BSTIterator(root)) == sorted(vals), list(inorder_gen(root)) == sorted(vals)]'
          ],
          [true, true]
        ],
        [
          [
            'def build(lo, hi):\n' +
              '    if lo > hi:\n' +
              '        return None\n' +
              '    mid = (lo + hi) // 2\n' +
              '    return Node(mid, build(lo, mid - 1), build(mid + 1, hi))\n' +
              't = build(1, 100000)\n' +
              'it = BSTIterator(t)\n' +
              'out = []\n' +
              'while it.has_next():\n' +
              '    out.append(it.next())\n' +
              'result = [out == list(range(1, 100001)), len(it._stack)]'
          ],
          [true, 0]
        ],
        [
          [
            'tree = Node(7, Node(3), Node(15, Node(9), Node(20)))\n' +
              'it = BSTIterator(tree)\n' +
              'result = [x for x in it] == [3, 7, 9, 15, 20]'
          ],
          true
        ],
        [
          [
            't = Node(2, Node(1), Node(3))\n' +
              'it = BSTIterator(t)\n' +
              'result = [next(it), next(it), next(it), next(it, \'done\')]'
          ],
          [1, 2, 3, 'done']
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Controlled iterative in-order traversal: the explicit stack replaces the call stack, so there is no recursion limit, memory is O(h), and each node is pushed/popped exactly once. We also show the equivalent generator.</p>`,
      code: { lang: 'python', run: true, code: `class Node:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

class BSTIterator:
    def __init__(self, root):
        self._stack = []
        self._push_left(root)

    def _push_left(self, node):
        while node:
            self._stack.append(node)
            node = node.left

    def has_next(self):
        return bool(self._stack)

    def next(self):
        node = self._stack.pop()          # smallest unreturned value
        self._push_left(node.right)       # its successor lives on the right
        return node.val

    def __iter__(self):
        return self

    def __next__(self):
        if not self._stack:
            raise StopIteration
        return self.next()

def inorder_gen(root):                    # same algorithm as a generator
    stack, node = [], root
    while stack or node:
        while node:
            stack.append(node)
            node = node.left
        node = stack.pop()
        yield node.val
        node = node.right

root = Node(7, Node(3), Node(15, Node(9), Node(20)))
it = BSTIterator(root)
print(it.next(), it.next(), it.has_next(), list(it), it.has_next())
skewed = None
for v in range(100_000, 0, -1):           # depth 100,000: no recursion used
    skewed = Node(v, left=skewed)
print(sum(BSTIterator(skewed)), next(inorder_gen(skewed)))` },
      dry: { head: ['call', 'stack before (top right)', 'returns', 'stack after'], rows: [['init', '—', '—', '[7, 3]'], ['next', '[7, 3]', '3', '[7]'], ['next', '[7]', '7', '[15, 9]'], ['next', '[15, 9]', '9', '[15]'], ['next', '[15]', '15', '[20]'], ['next', '[20]', '20', '[] → has_next False']] },
      complexity: `<p>next(): amortised O(1) (each node pushed and popped once), worst case O(h) for one call. has_next(): O(1). Memory O(h).</p>`,
      followUps: ['Add peek() and prev() (two stacks / a list of visited values).', 'Two BST iterators (forward and reverse) solve "Two Sum IV in a BST" in O(h) memory.', 'Why does a recursive yield from version cost O(h) per value?']
    }
  });

  practice.push({
    title: 'Implement groupby Yourself (Exact Semantics)', level: 'Hard', tags: ['generators', 'closures', 'iterator protocol', 'itertools'], companies: ['Jane Street', 'Google', 'Bloomberg'],
    statement: `<p>Re-implement <code>itertools.groupby(iterable, key=None)</code> as a generator <code>my_groupby</code> with the same behaviour: it yields <code>(key, group)</code> pairs for runs of consecutive equal keys; each group is a <b>lazy</b> iterator sharing the underlying input; when the outer iterator advances, the previous group must become empty; unconsumed group items are skipped. Single pass, O(1) extra memory.</p>`,
    constraints: `Input may be a one-shot generator of 10<sup>9</sup> items; do not buffer whole groups.`,
    example: `<p><code>[(k, list(g)) for k, g in my_groupby('aaabccaa')]</code> → <code>[('a', ['a','a','a']), ('b', ['b']), ('c', ['c','c']), ('a', ['a','a'])]</code>. And <code>g = list(my_groupby('aab'))</code> → <code>list(g[0][1])</code> is <code>[]</code>, exactly like itertools.</p>`,
    brute: { why: `<p>Buffer each run into a list and yield <code>(key, iter(run_list))</code>. Behaviour looks right in simple tests, but memory is O(longest run) — a single run of 10<sup>9</sup> equal items blows up — and the "previous group becomes empty" rule is not reproduced, so code relying on itertools semantics behaves differently.</p>`, code: `def groupby_buffered(iterable, key=None):
    keyfunc = key or (lambda x: x)
    run, run_key, first = [], None, True
    for x in iterable:
        k = keyfunc(x)
        if not first and k != run_key:
            yield run_key, iter(run)      # whole run held in memory
            run = []
        run.append(x)
        run_key, first = k, False
    if not first:
        yield run_key, iter(run)

print([(k, list(g)) for k, g in groupby_buffered('aaabccaa')])` },
    mcq: { q: 'How can an old group "know" that the outer iterator has moved on?', options: ['Each group remembers an id; the outer generator bumps a shared counter for every new group, and an old group stops when ids differ', 'Groups check the length of the input', 'The outer generator deletes the group object', 'It cannot; itertools copies the data'], answer: 0, explain: 'A shared, monotonically increasing group id (read through a closure) lets every inner generator detect it is stale and return immediately.' },
    hints: [`<p>Hint 1: Keep shared state in the outer generator: the current item <code>cur</code>, its key <code>cur_key</code>, and a <code>group_id</code>. Inner generators read/modify it via <code>nonlocal</code>.</p>`, `<p>Hint 2: Inner <code>grouper(my_id, target)</code>: while it is still the active group and <code>cur_key == target</code>: yield cur, then advance cur. After each resume, re-check <code>my_id == group_id</code>.</p>`, `<p>Hint 3: Outer loop: bump group_id, yield (target, grouper(...)); when resumed, skip any items still having key == target (the consumer may not have read them). Use a sentinel for "input exhausted".</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'import itertools\n' +
              'result = [[(k, list(g)) for k, g in my_groupby(\'aaabccaa\')], [(k, list(g)) for k, g in itertools.groupby(\'aaabccaa\')]]'
          ],
          [
            [['a', ['a', 'a', 'a']], ['b', ['b']], ['c', ['c', 'c']], ['a', ['a', 'a']]],
            [['a', ['a', 'a', 'a']], ['b', ['b']], ['c', ['c', 'c']], ['a', ['a', 'a']]]
          ]
        ],
        [
          [
            'g = list(my_groupby(\'aab\'))\n' +
              'result = [[list(grp) for _, grp in g]]'
          ],
          [[[], []]]
        ],
        [
          [
            'partial = my_groupby(\'xxxyy\')\n' +
              'k1, g1 = next(partial)\n' +
              'result = [next(g1), next(partial)[0], list(g1)]'
          ],
          ['x', 'y', []]
        ],
        [
          ['result = [(k, list(g)) for k, g in my_groupby([1, 3, 5, 2, 4, 7], key=lambda x: x % 2)]'],
          [[1, [1, 3, 5]], [0, [2, 4]], [1, [7]]]
        ],
        [['result = list(my_groupby(\'\'))'], []],
        [['result = [(k, len(list(g))) for k, g in my_groupby(\'aaaa\')]'], [['a', 4]]],
        [
          ['result = [(k, len(list(g))) for k, g in my_groupby(\'abcd\')]'],
          [['a', 1], ['b', 1], ['c', 1], ['d', 1]]
        ],
        [['result = [k for k, _ in my_groupby(\'aabbcc\')]'], ['a', 'b', 'c']],
        [
          [
            'result = [(k, list(g)) for k, g in my_groupby([(1, \'a\'), (1, \'b\'), (2, \'c\')], key=lambda t: t[0])]'
          ],
          [[1, [[1, 'a'], [1, 'b']]], [2, [[2, 'c']]]]
        ],
        [['result = [k for k, _ in my_groupby(iter([0, 0, 1, 1, 0]))]'], [0, 1, 0]],
        [['result = sum(1 for _ in my_groupby(range(10**6), key=lambda x: x // 10))'], 100000],
        [['result = sum(len(list(g)) for _, g in my_groupby((x // 3 for x in range(10**6))))'], 1000000],
        [
          [
            'calls = []\n' +
              'result = [k for k, _ in my_groupby(\'aabb\', key=lambda x: calls.append(x) or x)]'
          ],
          ['a', 'b']
        ],
        [
          [
            'g = my_groupby(\'aabbb\')\n' +
              'k, grp = next(g)\n' +
              'result = [k, next(g)[0], list(grp)]'
          ],
          ['a', 'b', []]
        ],
        [
          [
            'import random, itertools\n' +
              'def drive(gb, data, ops, key):\n' +
              '    out = []\n' +
              '    outer = gb(data, key)\n' +
              '    cur = []\n' +
              '    for op in ops:\n' +
              '        if op[0] == \'o\':\n' +
              '            try:\n' +
              '                k, g = next(outer)\n' +
              '                cur.append(g)\n' +
              '                out.append([\'k\', k])\n' +
              '            except StopIteration:\n' +
              '                out.append(\'end\')\n' +
              '        elif cur:\n' +
              '            g = cur[op[1] % len(cur)]\n' +
              '            out.append([\'t\', [next(g, None) for _ in range(op[2])]])\n' +
              '    return out\n' +
              'rnd = random.Random(1)\n' +
              'ok = True\n' +
              'for trial in range(300):\n' +
              '    data = [rnd.randrange(6) for _ in range(rnd.randrange(0, 40))]\n' +
              '    data.sort(key=lambda x: x if rnd.random() < 0.7 else 0)\n' +
              '    ops = [(\'o\',) if rnd.random() < 0.45 else (\'t\', rnd.randrange(5), rnd.randrange(0, 4)) for _ in range(30)]\n' +
              '    key = (lambda x: x // 2) if trial % 2 else None\n' +
              '    ok = ok and drive(my_groupby, list(data), ops, key) == drive(itertools.groupby, list(data), ops, key)\n' +
              'result = ok'
          ],
          true
        ],
        [
          [
            'import random, itertools\n' +
              'def drive(gb, data, ops, key):\n' +
              '    out = []\n' +
              '    outer = gb(data, key)\n' +
              '    cur = []\n' +
              '    for op in ops:\n' +
              '        if op[0] == \'o\':\n' +
              '            try:\n' +
              '                k, g = next(outer)\n' +
              '                cur.append(g)\n' +
              '                out.append([\'k\', k])\n' +
              '            except StopIteration:\n' +
              '                out.append(\'end\')\n' +
              '        elif cur:\n' +
              '            g = cur[op[1] % len(cur)]\n' +
              '            out.append([\'t\', [next(g, None) for _ in range(op[2])]])\n' +
              '    return out\n' +
              'rnd = random.Random(2)\n' +
              'ok = True\n' +
              'for trial in range(300):\n' +
              '    data = [rnd.randrange(3) for _ in range(rnd.randrange(0, 40))]\n' +
              '    data.sort(key=lambda x: x if rnd.random() < 0.7 else 0)\n' +
              '    ops = [(\'o\',) if rnd.random() < 0.45 else (\'t\', rnd.randrange(5), rnd.randrange(0, 4)) for _ in range(30)]\n' +
              '    key = (lambda x: x // 2) if trial % 2 else None\n' +
              '    ok = ok and drive(my_groupby, list(data), ops, key) == drive(itertools.groupby, list(data), ops, key)\n' +
              'result = ok'
          ],
          true
        ],
        [
          [
            'import random, itertools\n' +
              'def drive(gb, data, ops, key):\n' +
              '    out = []\n' +
              '    outer = gb(data, key)\n' +
              '    cur = []\n' +
              '    for op in ops:\n' +
              '        if op[0] == \'o\':\n' +
              '            try:\n' +
              '                k, g = next(outer)\n' +
              '                cur.append(g)\n' +
              '                out.append([\'k\', k])\n' +
              '            except StopIteration:\n' +
              '                out.append(\'end\')\n' +
              '        elif cur:\n' +
              '            g = cur[op[1] % len(cur)]\n' +
              '            out.append([\'t\', [next(g, None) for _ in range(op[2])]])\n' +
              '    return out\n' +
              'rnd = random.Random(3)\n' +
              'ok = True\n' +
              'for trial in range(200):\n' +
              '    data = [rnd.randrange(30) for _ in range(rnd.randrange(0, 40))]\n' +
              '    data.sort(key=lambda x: x if rnd.random() < 0.7 else 0)\n' +
              '    ops = [(\'o\',) if rnd.random() < 0.45 else (\'t\', rnd.randrange(5), rnd.randrange(0, 4)) for _ in range(30)]\n' +
              '    key = (lambda x: x // 2) if trial % 2 else None\n' +
              '    ok = ok and drive(my_groupby, list(data), ops, key) == drive(itertools.groupby, list(data), ops, key)\n' +
              'result = ok'
          ],
          true
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Outer generator + inner generator sharing state through a closure. The group id implements invalidation; the skip loop handles partially consumed groups. Every item is read exactly once from the input, and memory is O(1).</p>`,
      code: { lang: 'python', run: true, code: `import itertools

_END = object()

def my_groupby(iterable, key=None):
    keyfunc = (lambda x: x) if key is None else key
    it = iter(iterable)
    cur = next(it, _END)
    cur_key = keyfunc(cur) if cur is not _END else None
    group_id = 0

    def advance():
        nonlocal cur, cur_key
        cur = next(it, _END)
        if cur is not _END:
            cur_key = keyfunc(cur)

    def grouper(my_id, target):
        while my_id == group_id and cur is not _END and cur_key == target:
            yield cur
            if my_id != group_id:          # outer moved on while we were paused
                return
            advance()

    while cur is not _END:
        target = cur_key
        group_id += 1
        yield target, grouper(group_id, target)
        while cur is not _END and cur_key == target:   # skip unread items
            advance()

def compare(data, key=None):
    mine = [(k, list(g)) for k, g in my_groupby(data, key)]
    real = [(k, list(g)) for k, g in itertools.groupby(data, key)]
    return mine == real, mine

print(compare('aaabccaa'))
print(compare([1, 3, 5, 2, 4, 7], key=lambda x: x % 2))
print(compare(''))
g = list(my_groupby('aab'))
real = list(itertools.groupby('aab'))
print([list(grp) for _, grp in g], [list(grp) for _, grp in real])   # [[], []] [[], []]
partial = my_groupby('xxxyy')
k1, g1 = next(partial)
print(next(g1), next(partial)[0], list(g1))   # x y []` },
      dry: { head: ['event', 'cur', 'group_id', 'effect'], rows: [['start', "'a'", '0', 'read first item'], ['outer yields a-group', "'a'", '1', 'grouper(1, a) created'], ['list(group) ×3', "'b'", '1', "yields a, a, a; stops at 'b'"], ['outer yields b-group', "'b'", '2', 'old a-group now stale'], ['list(old a-group)', "'b'", '2', '<span class="c-r">my_id 1 ≠ 2 → []</span>']] },
      complexity: `<p>O(n) time total (each item read once, key computed once), O(1) extra memory.</p>`,
      followUps: ['Why does itertools.groupby compute the key exactly once per element? Verify yours does too.', 'Write ungroup/flatten that reverses groupby lazily.', 'Implement the same with a class-based iterator instead of generators.']
    }
  });

  practice.push({
    title: 'Transactional Dict with Nested Savepoints', level: 'Hard', tags: ['context manager', 'undo log', 'design'], companies: ['Stripe', 'Databricks', 'Robinhood'],
    statement: `<p>Build <code>TxDict</code>, a dict-like store with a <code>transaction()</code> context manager. Changes made inside a transaction are kept if the block succeeds and <b>rolled back</b> if it raises (and the exception propagates). Transactions can be <b>nested</b>: an inner failure rolls back only the inner changes (a savepoint), while an outer failure rolls back everything, including inner blocks that succeeded.</p>`,
    constraints: `Store may hold 10<sup>6</sup> keys; a transaction typically touches a handful. Rollback cost must be O(changes), not O(store size).`,
    example: `<p>Start <code>{'a': 1}</code>. Outer tx sets b=2; inner tx sets a=99 then raises → inner rolled back (a=1, b=2 kept). Outer then raises → b removed. Final <code>{'a': 1}</code>.</p>`,
    brute: { why: `<p>Take <code>copy.deepcopy(self.data)</code> at the start of each transaction and restore it on error. Correct and simple, but every transaction costs O(store size) — with 10<sup>6</sup> keys and thousands of small transactions per second, copying dominates everything.</p>`, code: `import copy
from contextlib import contextmanager

class TxDictSnapshot:
    def __init__(self):
        self.data = {}

    @contextmanager
    def transaction(self):
        snapshot = copy.deepcopy(self.data)      # O(n) every time
        try:
            yield self.data
        except BaseException:
            self.data.clear()
            self.data.update(snapshot)
            raise

s = TxDictSnapshot()
try:
    with s.transaction() as d:
        d['x'] = 1
        raise ValueError
except ValueError:
    pass
print(s.data)` },
    mcq: { q: 'What should be recorded to roll back in O(changes)?', options: ['An undo log of (key, previous value or MISSING) per write, one log per open transaction', 'A full copy of the dict per write', 'Only the keys written, without old values', 'Nothing — re-read from disk'], answer: 0, explain: 'Replaying old values in reverse order restores the exact previous state. A MISSING sentinel distinguishes "key did not exist" (delete it) from "key was None".' },
    hints: [`<p>Hint 1: Keep a stack of undo logs, one per open transaction. Every write appends <code>(key, old_value_or_MISSING)</code> to the <b>innermost</b> log.</p>`, `<p>Hint 2: On error: pop the log and replay it <b>in reverse</b> (MISSING → delete the key, else restore the value), then re-raise.</p>`, `<p>Hint 3: On success of a nested transaction: pop its log and <b>append it to the parent's log</b> — so if the parent later fails, it can undo the child's changes too. On success of the outermost, just drop the log.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'store = TxDict({\'a\': 1})\n' +
              'try:\n' +
              '    with store.transaction():\n' +
              '        store[\'b\'] = 2\n' +
              '        try:\n' +
              '            with store.transaction():\n' +
              '                store[\'a\'] = 99\n' +
              '                del store[\'b\']\n' +
              '                raise ValueError(\'inner fails\')\n' +
              '        except ValueError:\n' +
              '            mid = [store[\'a\'], store[\'b\']]\n' +
              '        with store.transaction():\n' +
              '            store[\'c\'] = 3\n' +
              '        before = sorted(store._data.items())\n' +
              '        raise RuntimeError(\'outer fails\')\n' +
              'except RuntimeError:\n' +
              '    pass\n' +
              'result = [mid, before, sorted(store._data.items())]'
          ],
          [[1, 2], [['a', 1], ['b', 2], ['c', 3]], [['a', 1]]]
        ],
        [
          [
            'store = TxDict({\'a\': 1})\n' +
              'with store.transaction():\n' +
              '    store[\'a\'] = 2\n' +
              '    store[\'n\'] = 5\n' +
              'result = [store[\'a\'], store[\'n\']]'
          ],
          [2, 5]
        ],
        [
          [
            'store = TxDict({\'a\': 1})\n' +
              'try:\n' +
              '    with store.transaction():\n' +
              '        store[\'a\'] = 2\n' +
              '        raise ValueError()\n' +
              'except ValueError:\n' +
              '    pass\n' +
              'result = store[\'a\']'
          ],
          1
        ],
        [
          [
            'store = TxDict({\'a\': 1, \'b\': 2})\n' +
              'try:\n' +
              '    with store.transaction():\n' +
              '        del store[\'a\']\n' +
              '        raise ValueError()\n' +
              'except ValueError:\n' +
              '    pass\n' +
              'result = [\'a\' in store, store[\'a\']]'
          ],
          [true, 1]
        ],
        [
          [
            'store = TxDict()\n' +
              'try:\n' +
              '    with store.transaction():\n' +
              '        store[\'n\'] = 1\n' +
              '        raise ValueError()\n' +
              'except ValueError:\n' +
              '    pass\n' +
              'result = \'n\' in store'
          ],
          false
        ],
        [
          [
            'store = TxDict({\'a\': 1})\n' +
              'try:\n' +
              '    with store.transaction():\n' +
              '        store[\'a\'] = 2\n' +
              '        store[\'a\'] = 3\n' +
              '        del store[\'a\']\n' +
              '        store[\'a\'] = 4\n' +
              '        raise ValueError()\n' +
              'except ValueError:\n' +
              '    pass\n' +
              'result = store[\'a\']'
          ],
          1
        ],
        [
          [
            'store = TxDict({\'a\': 1})\n' +
              'try:\n' +
              '    with store.transaction():\n' +
              '        raise KeyError(\'x\')\n' +
              'except KeyError as e:\n' +
              '    result = \'propagated\''
          ],
          'propagated'
        ],
        [
          [
            'store = TxDict()\n' +
              'store[\'x\'] = 1\n' +
              'result = [store[\'x\'], \'x\' in store, \'y\' in store]'
          ],
          [1, true, false]
        ],
        [['store = TxDict({\'a\': 1})\nresult = store.__delitem__(\'zz\')'], '!KeyError'],
        [
          [
            'store = TxDict({\'a\': 1})\n' +
              'with store.transaction() as s:\n' +
              '    r = s is store\n' +
              'result = r'
          ],
          true
        ],
        [['store = TxDict({\'a\': 1})\nresult = repr(store)'], 'TxDict({\'a\': 1})'],
        [
          [
            'store = TxDict({\'k\': 0})\n' +
              'try:\n' +
              '    with store.transaction():\n' +
              '        store[\'k\'] = 1\n' +
              '        with store.transaction():\n' +
              '            store[\'k\'] = 2\n' +
              '            with store.transaction():\n' +
              '                store[\'k\'] = 3\n' +
              '            r1 = store[\'k\']\n' +
              '            raise ValueError()\n' +
              'except ValueError:\n' +
              '    pass\n' +
              'result = [r1, store[\'k\']]'
          ],
          [3, 0]
        ],
        [
          [
            'store = TxDict({\'k\': 0})\n' +
              'with store.transaction():\n' +
              '    store[\'k\'] = 1\n' +
              '    try:\n' +
              '        with store.transaction():\n' +
              '            store[\'k\'] = 2\n' +
              '            raise ValueError()\n' +
              '    except ValueError:\n' +
              '        pass\n' +
              '    r = store[\'k\']\n' +
              'result = [r, store[\'k\']]'
          ],
          [1, 1]
        ],
        [
          [
            'store = TxDict({i: i for i in range(10**6)})\n' +
              'try:\n' +
              '    with store.transaction():\n' +
              '        for i in range(5):\n' +
              '            store[i] = -1\n' +
              '        store[\'new\'] = 1\n' +
              '        raise ValueError()\n' +
              'except ValueError:\n' +
              '    pass\n' +
              'result = [len(store._data), store[0], store[4], store[999999], \'new\' in store]'
          ],
          [1000000, 0, 4, 999999, false]
        ],
        [
          [
            'store = TxDict({\'a\': 1})\n' +
              'for _ in range(3000):\n' +
              '    try:\n' +
              '        with store.transaction():\n' +
              '            store[\'a\'] += 1\n' +
              '            raise ValueError()\n' +
              '    except ValueError:\n' +
              '        pass\n' +
              'result = store[\'a\']'
          ],
          1
        ],
        [
          [
            'store = TxDict()\n' +
              'with store.transaction():\n' +
              '    with store.transaction():\n' +
              '        store[\'z\'] = 1\n' +
              'try:\n' +
              '    with store.transaction():\n' +
              '        store[\'y\'] = 2\n' +
              '        raise ValueError()\n' +
              'except ValueError:\n' +
              '    pass\n' +
              'result = [store[\'z\'], \'y\' in store]'
          ],
          [1, false]
        ],
        [
          [
            'store = TxDict({\'a\': 1})\n' +
              'try:\n' +
              '    with store.transaction():\n' +
              '        with store.transaction():\n' +
              '            store[\'a\'] = 5\n' +
              '        raise ValueError()\n' +
              'except ValueError:\n' +
              '    pass\n' +
              'result = store[\'a\']'
          ],
          1
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Undo logging (the technique databases use for rollback and savepoints). Writes go through <code>__setitem__</code>/<code>__delitem__</code>, which record the previous state. The context manager owns one log level; success merges into the parent, failure replays in reverse.</p>`,
      code: { lang: 'python', run: true, code: `from contextlib import contextmanager

_MISSING = object()

class TxDict:
    def __init__(self, data=None):
        self._data = dict(data or {})
        self._logs = []                       # stack of undo logs

    def __getitem__(self, k):
        return self._data[k]

    def __contains__(self, k):
        return k in self._data

    def __repr__(self):
        return f'TxDict({self._data})'

    def _record(self, k):
        if self._logs:
            self._logs[-1].append((k, self._data.get(k, _MISSING)))

    def __setitem__(self, k, v):
        self._record(k)
        self._data[k] = v

    def __delitem__(self, k):
        if k not in self._data:
            raise KeyError(k)
        self._record(k)
        del self._data[k]

    @contextmanager
    def transaction(self):
        self._logs.append([])
        try:
            yield self
        except BaseException:
            for k, old in reversed(self._logs.pop()):
                if old is _MISSING:
                    self._data.pop(k, None)
                else:
                    self._data[k] = old
            raise
        else:
            log = self._logs.pop()
            if self._logs:
                self._logs[-1].extend(log)    # parent can still undo us

store = TxDict({'a': 1})
try:
    with store.transaction():
        store['b'] = 2
        try:
            with store.transaction():
                store['a'] = 99
                del store['b']
                raise ValueError('inner fails')
        except ValueError:
            print('after inner rollback:', store)   # a=1, b=2
        with store.transaction():
            store['c'] = 3                          # inner succeeds
        print('before outer fails:', store)
        raise RuntimeError('outer fails')
except RuntimeError:
    pass
print('final:', store)                              # TxDict({'a': 1})` },
      dry: { head: ['step', 'store', 'logs (innermost last)'], rows: [['outer begin', "{a:1}", '[[]]'], ["b = 2", "{a:1, b:2}", "[[(b, MISSING)]]"], ['inner: a=99, del b', "{a:99}", "[[(b,M)], [(a,1), (b,2)]]"], ['inner raises → replay reversed', "{a:1, b:2}", "[[(b,M)]]"], ['inner2: c=3 succeeds → merge', "{a:1, b:2, c:3}", "[[(b,M), (c,M)]]"], ['outer raises → replay reversed', "{a:1}", '[]']] },
      complexity: `<p>Each write O(1) extra; rollback O(changes in that transaction, including merged children); commit of a nested tx O(its changes) for the merge. No O(n) copies.</p>`,
      followUps: ['Record only the FIRST old value per key per transaction to shrink logs.', 'Make it thread-safe: per-thread transaction stacks with threading.local or contextvars.', 'How do real databases combine undo logs with redo (write-ahead) logs?']
    }
  });

  practice.push({
    title: 'Streaming Sliding-Window Maximum', level: 'Hard', tags: ['generator', 'monotonic deque', 'streaming'], companies: ['Amazon', 'Citadel', 'Google'],
    statement: `<p>Write a generator <code>window_max(stream, k)</code> that, for an unbounded stream of numbers (e.g. CPU readings), yields the maximum of each window of the last <code>k</code> values, starting once k values have arrived. Each value must be processed in amortised O(1). (LeetCode 239, streaming version.)</p>`,
    constraints: `1 ≤ k ≤ 10<sup>5</sup>; stream length unbounded; memory O(k).`,
    example: `<p>${H.arr([1, 3, -1, -3, 5, 3, 6, 7], { label: 'stream' })} k = 3 → ${H.arr([3, 3, 5, 5, 6, 7], { label: 'maxes', hl: { 2: 'g' } })} e.g. window [-1, -3, 5] → 5.</p>`,
    brute: { why: `<p>Keep the last k values (deque) and call <code>max(window)</code> each step: O(k) per value → O(n·k). With k = 10<sup>5</sup> and millions of readings per minute, that is 10<sup>11</sup> comparisons. The waste: re-scanning values that can never be a future maximum.</p>`, code: `from collections import deque

def window_max_brute(stream, k):
    window = deque(maxlen=k)
    for x in stream:
        window.append(x)
        if len(window) == k:
            yield max(window)               # O(k) every time

print(list(window_max_brute([1, 3, -1, -3, 5, 3, 6, 7], 3)))` },
    mcq: { q: 'When a new value x arrives, which stored values can be thrown away forever?', options: ['All values ≤ x that arrived before x', 'All values ≥ x', 'Only the oldest value', 'None until the window slides'], answer: 0, explain: 'An older value that is ≤ x will leave the window before x does and can never beat x, so it can never be a maximum again. Removing them keeps the deque decreasing.' },
    hints: [`<p>Hint 1: Keep a deque of (index, value) whose values are strictly <b>decreasing</b> from front to back. The front is always the current window max.</p>`, `<p>Hint 2: For each new (i, x): pop from the back while the back value ≤ x; append (i, x); pop from the front if its index ≤ i − k (it slid out).</p>`, `<p>Hint 3: Yield <code>dq[0][1]</code> once i ≥ k − 1. Each element is appended once and popped at most once → amortised O(1). Use <code>enumerate(stream)</code> for indices so it works on any iterator.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_val',
      cases: [
        [['list(window_max([1, 3, -1, -3, 5, 3, 6, 7], 3))'], [3, 3, 5, 5, 6, 7]],
        [['list(window_max([9, 8, 7], 1))'], [9, 8, 7]],
        [['list(window_max([1], 1))'], [1]],
        [['list(window_max([1, 2, 3], 3))'], [3]],
        [['list(window_max([3, 2, 1], 3))'], [3]],
        [['list(window_max([5, 5, 5, 5], 2))'], [5, 5, 5]],
        [['list(window_max([-1, -2, -3], 2))'], [-1, -2]],
        [['list(window_max([1], 2))'], []],
        [['list(window_max([4, 2, 12, 3], 2))'], [4, 12, 12]],
        [['list(window_max([7, 2, 4], 2))'], [7, 4]],
        [['list(window_max([0, 0, 0], 3))'], [0]],
        [['list(window_max([2, 1], 5))'], []],
        [['list(islice(window_max(__import__(\'itertools\').count(), 3), 5))'], [2, 3, 4, 5, 6]],
        [['list(window_max((x for x in [3, 1, 2]), 2))'], [3, 2]],
        [
          [
            '(lambda d: list(window_max(iter(d), 50)) == [max(d[i:i + 50]) for i in range(len(d) - 49)])(list(islice(readings(), 2000)))'
          ],
          true
        ],
        [
          [
            '(lambda r: [len(r), r[0], r[-1], sum(r)])(list(window_max(((i * 7919) % 100003 for i in range(10**6)), 1000)))'
          ],
          [999001, 99984, 99910, 99851760537]
        ],
        [
          ['(lambda r: [len(r), r[0], r[-1]])(list(window_max(range(10**6), 100000)))'],
          [900001, 99999, 999999]
        ],
        [
          ['(lambda r: [len(r), r[0], r[-1]])(list(window_max(range(10**6, 0, -1), 100000)))'],
          [900001, 1000000, 100000]
        ]
      ],
      harness: {
        python: 'def t_val(src):\n' +
          '    try:\n' +
          '        return eval(src)\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Monotonic deque inside a generator. The generator form means it plugs straight into a pipeline (<code>window_max(read_cpu(), 60)</code>) and works on infinite streams with O(k) memory.</p>`,
      code: { lang: 'python', run: true, code: `from collections import deque
from itertools import islice
import random

def window_max(stream, k):
    dq = deque()                          # (index, value), values decreasing
    for i, x in enumerate(stream):
        while dq and dq[-1][1] <= x:      # can never be a max again
            dq.pop()
        dq.append((i, x))
        if dq[0][0] <= i - k:             # front slid out of the window
            dq.popleft()
        if i >= k - 1:
            yield dq[0][1]

print(list(window_max([1, 3, -1, -3, 5, 3, 6, 7], 3)))   # [3, 3, 5, 5, 6, 7]

def readings(seed=7):                     # an infinite sensor stream
    rng = random.Random(seed)
    while True:
        yield rng.randint(0, 100)

data = list(islice(readings(), 2000))
fast = list(window_max(iter(data), 50))
slow = [max(data[i:i + 50]) for i in range(len(data) - 49)]
print(fast == slow, len(fast))` },
      dry: { head: ['i', 'x', 'deque (value@idx) after', 'yield'], rows: [['0', '1', '1@0', '—'], ['1', '3', '3@1 (1 popped)', '—'], ['2', '-1', '3@1, -1@2', '3'], ['3', '-3', '3@1, -1@2, -3@3', '3'], ['4', '5', '5@4 (all popped)', '5'], ['5', '3', '5@4, 3@5', '5'], ['6', '6', '6@6', '6'], ['7', '7', '7@7', '7']] },
      complexity: `<p>Amortised O(1) per value, O(n) total; memory O(k).</p>`,
      followUps: ['Sliding-window minimum and max − min ≤ limit (LeetCode 1438).', 'Time-based windows (last 60 seconds) instead of count-based: evict by timestamp.']
    }
  });

  /* ================= QUIZ ================= */
  quiz.push({ q: `Predict the output:<pre>g = (x * x for x in range(3))
print(sum(g), sum(g))</pre>`, options: ['5 0', '5 5', '0 5', 'TypeError'], answer: 0, explain: 'A generator expression is a one-shot iterator. The first sum consumes 0 + 1 + 4 = 5; the second sum sees an exhausted iterator and returns 0 — no error, just a silently wrong answer.' });
  quiz.push({ q: `Which statement about <code>iter(x) is x</code> is true?`, options: ['If True, x is an iterator (one-pass bookmark)', 'If True, x is a list', 'It is always True', 'It raises for generators'], answer: 0, explain: 'Iterators return themselves from __iter__. Containers like list, dict, range return a NEW iterator each time, so iter(x) is not x.' });
  quiz.push({ q: `Predict the output:<pre>def f():
    yield 1
    return 2
print(list(f()))</pre>`, options: ['[1]', '[1, 2]', '[2]', 'SyntaxError'], answer: 0, explain: 'return inside a generator ends it; the value travels on StopIteration.value and is only visible to yield from or code that catches StopIteration. A for loop/list() ignores it.' });
  quiz.push({ q: `How many groups does <code>itertools.groupby('aabbaa')</code> produce?`, options: ['3', '2', '6', '1'], answer: 0, explain: 'groupby groups CONSECUTIVE equal keys: aa | bb | aa. To get 2 groups (a and b totals) you must sort first.' });
  quiz.push({ q: `For 5 items, what are <code>len(list(combinations(items, 2)))</code> and <code>len(list(permutations(items, 2)))</code>?`, options: ['10 and 20', '20 and 10', '10 and 25', '25 and 20'], answer: 0, explain: 'C(5,2) = 10 unordered pairs; P(5,2) = 5·4 = 20 ordered pairs; product(items, repeat=2) would give 25.' });
  quiz.push({ q: `An exception is raised inside a <code>with</code> block and the manager's <code>__exit__</code> returns <code>True</code>. What happens?`, options: ['The exception is suppressed and execution continues after the with block', 'The exception propagates after cleanup', '__exit__ is called a second time', 'The rest of the with body runs'], answer: 0, explain: 'A truthy return value from __exit__ tells Python the exception was handled. The remainder of the body is still skipped; execution resumes after the with statement.' });
  quiz.push({ q: `A <code>@contextmanager</code> generator has <code>setup(); yield; cleanup()</code> with <b>no</b> try/finally. The with-body raises. What happens to <code>cleanup()</code>?`, options: ['It does not run — the exception is thrown in at the yield and propagates', 'It runs before the exception propagates', 'It runs twice', 'The exception is suppressed'], answer: 0, explain: '@contextmanager calls gen.throw(exc) at the yield. Without try/finally (or except) the generator dies right there, skipping the code after the yield.' });
  quiz.push({ q: `In <code>with A() as a, B() as b:</code> in which order do the <code>__exit__</code> methods run?`, options: ['B then A', 'A then B', 'Both at the same time', 'Only B'], answer: 0, explain: 'Multiple managers behave like nested with statements: entered left to right, exited right to left (LIFO).' });
  quiz.push({ q: `What happens on <code>g = averager(); g.send(10)</code> for a fresh generator?`, options: ['TypeError: can\'t send non-None value to a just-started generator', 'It returns 10', 'It returns None', 'It silently primes the generator'], answer: 0, explain: 'A fresh generator is not paused at any yield yet, so there is nothing to receive the value. Prime it with next(g) or g.send(None) first.' });
  quiz.push({ q: `Predict the output:<pre>it = iter(range(6))
print(list(zip(it, it)))</pre>`, options: ['[(0, 1), (2, 3), (4, 5)]', '[(0, 0), (1, 1), (2, 2), (3, 3), (4, 4), (5, 5)]', '[(0, 1)]', '[]'], answer: 0, explain: 'Both zip arguments are the SAME iterator, so zip pulls alternately from one bookmark — a known idiom for pairing up items.' });
  quiz.push({ q: `Predict the output:<pre>nums = [1, 2, 3]
g = (n * 10 for n in nums)
nums = [7]
print(list(g))</pre>`, options: ['[10, 20, 30]', '[70]', '[]', 'NameError'], answer: 0, explain: 'The iterable in the FIRST for clause of a generator expression is evaluated immediately when the expression is created. Rebinding nums later does not affect it (later clauses and conditions ARE evaluated lazily).' });
  quiz.push({ q: `Which is the best way to read a binary file in 4 KB chunks until EOF?`, options: ['for chunk in iter(partial(f.read, 4096), b\'\'):', 'for chunk in f.read(4096):', 'while f: chunk = f.read()', 'for chunk in f.readlines(4096):'], answer: 0, explain: 'Two-argument iter(callable, sentinel) calls f.read(4096) repeatedly and stops when it returns the sentinel b\'\'. Iterating f.read(4096) directly loops over the bytes of ONE chunk.' });
  quiz.push({ q: `What does <code>result = yield from sub()</code> assign to <code>result</code>?`, options: ['The value sub() returns with its return statement', 'The last value sub() yielded', 'A list of everything sub() yielded', 'Always None'], answer: 0, explain: 'yield from forwards every yielded value to the caller and, when sub() finishes, evaluates to StopIteration.value — the generator\'s return value.' });

  /* ================= INTERVIEW ================= */
  interview.push({ q: 'What is the difference between an iterable and an iterator?', level: 'B', a: `<p>An <b>iterable</b> is any object you can get an iterator from — it implements <code>__iter__</code> (or the legacy <code>__getitem__</code> protocol). Lists, tuples, strings, dicts, sets, ranges are iterables. An <b>iterator</b> is the object that actually walks: it implements <code>__next__</code> (returning the next item or raising <code>StopIteration</code>) and <code>__iter__</code> returning <code>self</code>. Analogy: book vs bookmark. Practical consequence: iterables can be looped many times (fresh iterator per loop); iterators are single-pass and stay exhausted. Generators, files, <code>map</code>, <code>zip</code>, <code>enumerate</code> are iterators.</p>`, followUps: ['How does a for loop use these two methods?', 'Is a file object an iterable or an iterator? Why does that matter?', 'How would you make a class iterable?'] });
  interview.push({ q: 'Explain what happens, step by step, when Python executes <code>for x in obj:</code>.', level: 'I', a: `<p>Python calls <code>iter(obj)</code> once (bytecode <code>GET_ITER</code>), which calls <code>type(obj).__iter__</code> — or falls back to the <code>__getitem__</code> sequence protocol, or raises <code>TypeError: object is not iterable</code>. Then for each iteration (<code>FOR_ITER</code>) it calls <code>next()</code> on that iterator and binds the result to <code>x</code>. When <code>__next__</code> raises <code>StopIteration</code> the loop ends and the <code>else</code> clause (if any) runs. For built-in iterators CPython signals exhaustion without even creating an exception object, which keeps loops fast. The loop variable remains bound to the last value afterwards.</p>`, followUps: ['When does the for-else clause run?', 'Why does modifying a list while iterating skip elements?', 'What error do you get when a dict changes size during iteration?'] });
  interview.push({ q: 'What is a generator and why would you use one instead of returning a list?', level: 'B', a: `<p>A generator is a function containing <code>yield</code>. Calling it returns a generator object (an iterator) without running the body; each <code>next()</code> runs until the next <code>yield</code>, returns that value and pauses with all local state preserved. Benefits: <b>lazy evaluation</b> (work is done only when needed, first result arrives immediately), <b>O(1) memory</b> regardless of sequence length, ability to represent <b>infinite or streaming</b> data, and easy composition into pipelines. Costs: single pass, no <code>len()</code> or indexing, errors surface at consumption time, and resources stay open while the generator is suspended. Return a list when the data is small and needed multiple times or randomly accessed.</p>`, followUps: ['What are the generator states (GEN_CREATED etc.)?', 'How much memory does a suspended generator use?', 'What is the difference between a generator function and a generator expression?'] });
  interview.push({ q: 'How do <code>send()</code>, <code>throw()</code> and <code>close()</code> work on a generator?', level: 'A', a: `<p><code>yield</code> is an expression. <code>gen.send(v)</code> resumes the generator and makes the paused <code>yield</code> evaluate to <code>v</code>; it returns the next yielded value. <code>next(gen)</code> is <code>send(None)</code>; a fresh generator must be primed with one of these before sending a real value (otherwise <code>TypeError</code>). <code>gen.throw(exc)</code> raises <code>exc</code> at the paused yield — the generator may handle it and yield again. <code>gen.close()</code> throws <code>GeneratorExit</code>; the generator should let it propagate or return (yielding again raises <code>RuntimeError</code>), and its <code>finally</code> blocks run. These were the foundation of pre-3.5 coroutines and are how <code>@contextmanager</code> delivers exceptions into your generator.</p>`, followUps: ['Write a running-average coroutine.', 'How can a priming decorator help?', 'How are async/await coroutines related to these methods?'] });
  interview.push({ q: 'What does <code>yield from</code> do beyond <code>for x in sub: yield x</code>?', level: 'A', a: `<p>For plain iteration they produce the same values, but <code>yield from</code> (PEP 380) creates a full two-way delegation channel: values sent with <code>send()</code>, exceptions from <code>throw()</code> and <code>close()</code> calls are forwarded <b>directly</b> to the sub-generator; and when the sub-generator returns, the <code>yield from</code> expression evaluates to its <b>return value</b>. It is also implemented in C so it is faster than a Python loop. The manual loop would deliver sent values to the outer generator, lose the return value, and not close the sub-generator properly. This delegation machinery is exactly what <code>await</code> builds on in asyncio.</p>`, followUps: ['What is the per-item cost of a deep yield from chain?', 'How would you flatten a 100,000-deep nested list?', 'Can you yield from a list? What about send() then?'] });
  interview.push({ q: 'Design a pipeline that processes a 100 GB log file to compute error counts per service. How do you keep memory flat?', level: 'I', a: `<p>Use a chain of generators: a <b>source</b> that iterates the file object line by line (files are lazy iterators; never <code>read()</code>/<code>readlines()</code>), a <b>parse</b> stage that splits with a max split and skips malformed lines, a <b>filter</b> stage that keeps ERROR lines, and a <b>sink</b> like <code>collections.Counter</code> that consumes the stream. Only one line is in flight; memory is O(distinct services). Add <code>islice</code> for sampling, <code>batched</code> before any per-batch external call, try/except per item so one bad line does not kill the job, and gzip.open for compressed input. For speed, parallelise across files with <code>multiprocessing.Pool.imap_unordered</code> and merge Counters, or switch to DuckDB/polars if the data is tabular.</p>`, followUps: ['Where do exceptions surface in such a pipeline?', 'How do you make sure the file is closed if the consumer stops early?', 'When would you prefer pandas/polars instead?'] });
  interview.push({ q: 'What is the most common <code>itertools.groupby</code> mistake?', level: 'I', a: `<p>Expecting it to group <b>all</b> equal keys like SQL GROUP BY. groupby only merges <b>consecutive</b> items with equal keys, so <code>'aabaa'</code> gives three groups. Fix: sort by the same key first (<code>groupby(sorted(xs, key=k), key=k)</code>) — O(n log n) — or use a <code>defaultdict(list)</code> in O(n). The second mistake: storing the group iterators for later. All groups share the underlying iterator, so once the outer groupby advances, earlier groups become empty. Convert each group with <code>list(g)</code> inside the loop. Use groupby intentionally for run-based problems: run-length encoding, longest streaks, splitting sorted data into sections.</p>`, followUps: ['Implement groupby yourself.', 'How would you count the longest run of 1s in a binary string?', 'What does key=None mean?'] });
  interview.push({ q: 'How does the <code>with</code> statement work? What are <code>__enter__</code> and <code>__exit__</code> responsible for?', level: 'I', a: `<p><code>with EXPR as x:</code> evaluates EXPR to get a manager, looks up <code>__enter__</code>/<code>__exit__</code> on its <b>type</b>, calls <code>__enter__()</code> and binds its return value to x. The body then runs inside an implicit try. If the body finishes normally, <code>__exit__(None, None, None)</code> is called. If it raises, <code>__exit__(type, value, traceback)</code> is called; if it returns a truthy value the exception is suppressed, otherwise it propagates. If <code>__enter__</code> raises, <code>__exit__</code> is not called. <code>__exit__</code> also runs on <code>return</code>, <code>break</code> and <code>continue</code>. This guarantees cleanup — files closed, locks released, transactions committed/rolled back.</p>`, followUps: ['Why is the lookup done on the type rather than the instance?', 'What happens if __exit__ itself raises?', 'What is the async version?'] });
  interview.push({ q: 'How does <code>contextlib.contextmanager</code> turn a generator into a context manager?', level: 'A', a: `<p>The decorator wraps the generator function so calling it returns a <code>_GeneratorContextManager</code>. Its <code>__enter__</code> calls <code>next(gen)</code> and returns the yielded value (bound by <code>as</code>). On normal exit, <code>__exit__</code> calls <code>next(gen)</code> again and expects <code>StopIteration</code>; if the generator yields a second time you get <code>RuntimeError("generator didn't stop")</code>. On an exception, <code>__exit__</code> calls <code>gen.throw(exc)</code>, so the exception appears at the yield: a <code>try/finally</code> there guarantees cleanup; catching without re-raising suppresses it. The result is also a <code>ContextDecorator</code>, so it can decorate functions. The async twin is <code>asynccontextmanager</code>.</p>`, followUps: ['Why must the yield be wrapped in try/finally?', 'Can a @contextmanager be reused for two with blocks?', 'How does it treat StopIteration raised in the body?'] });
  interview.push({ q: 'When would you use <code>contextlib.ExitStack</code>?', level: 'A', a: `<p>When the <b>number or kind</b> of resources is only known at run time — opening N files from a list, conditionally acquiring a lock, or combining managers with arbitrary cleanup callbacks. <code>stack.enter_context(cm)</code> enters a manager and pushes its exit; <code>stack.callback(fn, *args)</code> registers any cleanup; on leaving, everything unwinds in <b>LIFO</b> order, and if one <code>__enter__</code> fails midway, only already-entered resources are cleaned up. <code>stack.pop_all()</code> transfers the registered cleanups to a new stack, a neat pattern for "acquire several resources; only if all succeed hand them to the caller". <code>AsyncExitStack</code> does the same for <code>async with</code>.</p>`, followUps: ['How would you implement ExitStack yourself?', 'What happens if two exit callbacks both raise?', 'Show the pop_all() ownership-transfer pattern.'] });
  interview.push({ q: 'A generator holds an open file. The consumer breaks out of the loop early. When is the file closed?', level: 'E', a: `<p>The generator is left suspended inside its <code>with open(...)</code> block. The file is closed only when the generator is <b>closed</b>: explicitly via <code>gen.close()</code> (raising <code>GeneratorExit</code> at the yield, which runs the with's <code>__exit__</code>), or when it is garbage-collected — in CPython immediately when the last reference disappears (refcounting), but in PyPy or when referenced from a cycle, at an unpredictable later time. In long-running services this can leak file descriptors or DB connections. Robust options: wrap consumption in <code>with contextlib.closing(gen):</code>, let the caller own the resource and pass the open file in, or expose a context-manager API that yields the iterator. For async generators use <code>contextlib.aclosing</code>.</p>`, followUps: ['What is sys.set_asyncgen_hooks for?', 'How does PEP 533 (deferred) relate to this?', 'How do you test that cleanup happens?'] });
  interview.push({ q: 'Implement <code>zip</code> as a generator. What edge cases matter?', level: 'I', a: `<p>Create iterators for all inputs, then loop: collect <code>next(it)</code> from each; if any raises <code>StopIteration</code>, return (catch it — letting it escape a generator is a <code>RuntimeError</code> since PEP 479). Yield the tuple. Edge cases: zero arguments yields nothing (not an infinite loop of empty tuples); items already pulled from earlier iterators when a later one is exhausted are <b>lost</b> (real <code>zip</code> behaves the same — important if you reuse the iterators); <code>strict=True</code> (3.10+) should raise <code>ValueError</code> if lengths differ, which requires checking whether the remaining iterators are also exhausted. Code: <code>its = [iter(a) for a in args]; if not its: return; while True: try: row = tuple(next(i) for i in its)</code> — careful: a generator expression inside would turn StopIteration into RuntimeError, so use a list loop.</p>`, followUps: ['Implement zip_longest.', 'Why can zip lose an item from the first iterator?', 'How would you implement strict=True?'] });
  interview.push({ q: 'How has AI tooling changed the way you write iterator/generator/context-manager code, and what do you still verify yourself?', level: 'E', a: `<p>Assistants generate iterator classes, generator pipelines and context managers instantly, so the bottleneck shifts to <b>reviewing semantics</b>. I verify: (1) <b>exhaustion</b> — is any iterator consumed twice? (2) <b>where work happens</b> — setup inside a generator runs at the first next(), not at call time; (3) <b>cleanup</b> — every <code>@contextmanager</code> has try/finally, no <code>__exit__</code> returns True by accident, generators holding resources are closed; (4) <b>memory</b> — hidden <code>list()</code>/<code>readlines()</code> calls that defeat streaming; (5) <b>complexity</b> — recursive yield from depth, combinatorial explosion. I use AI to produce edge-case tests (empty input, early break, exceptions mid-stream) and to scan code for unclosed resources, and I still own the design decisions: lazy vs eager, pull vs push, generator vs dataframe.</p>`, followUps: ['Show a test that proves a generator\'s finally runs on early exit.', 'How do LLM SDK streams fit the iterator protocol?', 'When would you reject an AI-suggested itertools one-liner?'] });

  registerModule({
    id: 'py07',
    title: 'Iterators, Generators & Context Managers',
    intro: `<p>Every <code>for</code> loop, every file you read, every streamed LLM response and every <code>with open(...)</code> in Python rests on three small protocols. This module makes them second nature:</p>
<ul>
<li>🟢 <b>Iterables vs iterators</b> — the book and the bookmark, and why a generator "suddenly" becomes empty.</li>
<li>🔵 <b>Generators and <code>yield</code></b> — functions that pause and resume, lazy and infinite sequences, <code>send()</code>/<code>close()</code>, and <b><code>yield from</code></b> delegation for recursive data.</li>
<li>🔵 <b>Generator pipelines and <code>itertools</code></b> — process 100 GB of data with flat memory using small composable stages and the standard library's C-speed toolbox.</li>
<li>🟣 <b>Context managers</b> — <code>__enter__</code>/<code>__exit__</code>, exception suppression, <code>@contextmanager</code>, <code>suppress</code>, <code>ExitStack</code> — guaranteed cleanup for files, locks and transactions.</li>
</ul>
<p>Every topic has a step-by-step visualizer (watch a generator pause at <code>yield</code>, items flow through a pipeline, a <code>with</code> block enter and exit), lots of "predict the output" examples, and interview-grade practice problems: BST iterator, k-way merge, your own <code>groupby</code>, transactional context managers and more.</p>`,
    goals: [
      'Explain the iterator protocol (<code>__iter__</code>, <code>__next__</code>, <code>StopIteration</code>), desugar a for loop by hand, and spot iterator-exhaustion bugs on sight',
      'Write generators (including infinite ones), predict exactly when their code runs, and use <code>send</code>, <code>close</code>, <code>return</code> values and <code>yield from</code> correctly',
      'Build lazy generator pipelines that process huge or unbounded streams in O(1) memory, and know when to switch to dataframes or batching',
      'Pick the right <code>itertools</code> tool from the wording of a question (groupby, islice, accumulate, pairwise, batched, product, permutations, combinations) and know their counts and traps',
      'Write correct context managers as classes and with <code>@contextmanager</code>, control exception suppression, and use <code>suppress</code>, <code>closing</code>, <code>ExitStack</code> in real code',
      'Solve interview problems such as BST Iterator, Flatten Nested List, Peekable Iterator, Merge K Sorted Streams and sliding-window streams with idiomatic Python'
    ],
    prereqs: `Python 2 (Control Flow, Functions & Core Collections), Python 5 (Data Structure Internals & Comprehensions — list/dict costs, list comprehensions) and Python 6 (Closures, Decorators & functools — closures and <code>nonlocal</code> are used inside generators and decorators like <code>@contextmanager</code>). Basic exceptions (<code>try/except/finally</code>) are assumed.`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
