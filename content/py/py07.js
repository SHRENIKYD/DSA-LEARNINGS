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
registerModule({ id: 'py07', title: 'Iterators, Generators & Context Managers', intro: `<p>tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro</p>`, goals: ['aaaaaaaaaaaa','bbbbbbbbbbbbb','cccccccccccc'], prereqs: `aaaaaaaaaaaaaaaaaaaa`, hours: 10, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
