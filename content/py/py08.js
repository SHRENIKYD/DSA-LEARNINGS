(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  // String.raw keeps backslashes exactly as typed, so Python code like "a\nb" stays "a\nb".
  var R = String.raw;

  /* ----------------------------------------------------------------------
     Shared visualizer helpers for py08 (Advanced OOP: Dunders, MRO, Dataclasses)
     ---------------------------------------------------------------------- */
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  // Python-style repr of a plain string.
  function pyStr(s) { return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; }
  // Python-style repr of a list of strings.
  function pyList(a) { return '[' + a.map(pyStr).join(', ') + ']'; }
  // Build a left-to-right "dispatch chain" graph of boxes.
  // boxes: [{id, label}], active: index of the box being lit, extra: {hl, ehl, tags}
  function chain(boxes, opt) {
    opt = opt || {};
    var n = boxes.length, nodes = [], edges = [];
    boxes.forEach(function (b, i) {
      nodes.push({ id: b.id, label: b.label, shape: 'box', x: n === 1 ? 50 : 12 + i * (76 / (n - 1)), y: b.y !== undefined ? b.y : 22 });
      if (i > 0 && !b.noEdge) edges.push([boxes[i - 1].id, b.id, b.edge || '']);
    });
    (opt.extraEdges || []).forEach(function (e) { edges.push(e); });
    return { type: 'graph', label: opt.label || 'Who answers?', directed: true, height: opt.height || 44, nodes: nodes, edges: edges, hl: opt.hl || {}, ehl: opt.ehl || {}, tags: opt.tags || {} };
  }

  /* ======================================================================
     TOPIC 1: The Python Data Model — __repr__, __str__, __len__, __bool__, __getitem__
     ====================================================================== */
  var DECK_VIZ_CODE = [
    'class Deck:',
    '    def __init__(self, cards): self._cards = list(cards)',
    '    def __repr__(self): return f"Deck({self._cards!r})"',
    '    def __str__(self): return " ".join(self._cards)',
    '    def __len__(self): return len(self._cards)',
    '    def __getitem__(self, i):',
    '        r = self._cards[i]',
    '        return Deck(r) if isinstance(i, slice) else r',
    '',
    'deck = Deck(cards)',
    'repr(deck)',
    'print(deck)',
    'len(deck)',
    'deck[0]',
    'deck[-1]',
    'deck[1:3]',
    'target in deck',
    'for c in deck: print(c)',
    'bool(deck)',
    'bool(Deck([]))'
  ].join('\n');

  topics.push({
    title: 'The Data Model: __repr__, __str__, __len__, __bool__ & __getitem__',
    analogy: R`<p>Think of Python's built-in functions as a <b>hotel front desk</b>. When a guest says "how many rooms does this group have?" (<code>len(x)</code>), the desk clerk does not know your group personally. She looks up the group's <b>registration card</b> (the class) and calls the phone number written in the box labelled <code>__len__</code>. Dunder methods ("double underscore" methods) are those labelled boxes. Fill in the right box and every built-in tool in Python (<code>len</code>, <code>print</code>, <code>for</code>, <code>in</code>, <code>[ ]</code>, <code>if</code>) suddenly knows how to talk to your object.</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> Python has a rulebook called the <b>data model</b>. It says: "if you want your object to work with built-in syntax X, write a method with special name Y." These special names start and end with two underscores, so people call them <b>dunder methods</b> (or magic methods). You almost never call them yourself; Python calls them for you.</p>
      ${H.table(['You write', 'Python actually calls', 'What it is for'], [
        ['<code>repr(x)</code>, the REPL echo, items inside a printed list', '<code>type(x).__repr__(x)</code>', 'unambiguous text for <b>developers</b>'],
        ['<code>str(x)</code>, <code>print(x)</code>, <code>f"{x}"</code>', '<code>type(x).__str__(x)</code> (falls back to <code>__repr__</code>)', 'friendly text for <b>users</b>'],
        ['<code>len(x)</code>', '<code>type(x).__len__(x)</code>', 'size; must be an int ≥ 0'],
        ['<code>if x:</code>, <code>bool(x)</code>', '<code>__bool__</code>, else <code>__len__</code>, else always True', 'truthiness'],
        ['<code>x[k]</code>, <code>x[1:3]</code>', '<code>__getitem__(k)</code> (k may be an int, a key, or a <code>slice</code>)', 'indexing and slicing'],
        ['<code>v in x</code>', '<code>__contains__</code>, else iterate', 'membership'],
        ['<code>for v in x</code>', '<code>__iter__</code>, else <code>__getitem__(0), (1), …</code> until <code>IndexError</code>', 'iteration']
      ])}
      <p><b>__repr__ vs __str__ in one sentence:</b> <code>__repr__</code> is the label on the <b>lab sample</b> (precise, ideally copy-pasteable code like <code>Deck(['2S', '7H'])</code>); <code>__str__</code> is the <b>shop window</b> sign (pretty, like <code>2S 7H</code>). If you only write one, write <code>__repr__</code>: <code>str()</code> falls back to it, but not the other way round. Containers always show their items with <code>repr</code>, which is why <code>print([deck])</code> uses <code>__repr__</code> even though <code>print(deck)</code> uses <code>__str__</code>.</p>
      <p><b>__len__ and __bool__:</b> <code>len()</code> demands a non-negative <code>int</code> (a float raises <code>TypeError</code>, a negative raises <code>ValueError: __len__() should return &gt;= 0</code>). For truthiness Python first tries <code>__bool__</code> (must return a real <code>bool</code>), then <code>__len__</code> (0 means False), and if neither exists the object is <b>always truthy</b>.</p>
      <p><b>__getitem__ does a lot of work:</b> <code>deck[2]</code> passes the int 2; <code>deck[1:3]</code> passes a <code>slice(1, 3, None)</code> object; <code>grid[1, 2]</code> passes the tuple <code>(1, 2)</code>. Negative indices are <b>your job</b> unless you delegate to a list. And if you define <code>__getitem__</code> (raising <code>IndexError</code> at the end) and <code>__len__</code>, Python gives you <code>for</code> loops, <code>in</code>, <code>reversed()</code> and unpacking for free, through the old "sequence protocol" fallback.</p>
      ${H.arr(['2S', '7H', 'JD', 'QC', 'AS'], { label: 'deck._cards', hl: { 1: 'b', 2: 'b' } })}
      <p>Above: <code>deck[1:3]</code> calls <code>__getitem__(slice(1, 3, None))</code> and returns the ${H.c('b', 'blue')} cards. A good container returns the <b>same type</b> (a <code>Deck</code>) for a slice, just like <code>list[1:3]</code> gives a list.</p>`,
    clues: [
      'Output shows <code>&lt;__main__.Foo object at 0x7f…&gt;</code> → you need <code>__repr__</code>',
      '"make my class work with <code>len()</code>, <code>for</code>, <code>in</code>, indexing" → implement the sequence protocol (<code>__len__</code> + <code>__getitem__</code>)',
      '"an empty cart should be falsy" → <code>__len__</code> or <code>__bool__</code>',
      '"support slicing like a list" → handle <code>slice</code> objects in <code>__getitem__</code>',
      '"custom container / wrapper / collection class" in an LLD round → data-model dunders, not <code>get_item()</code> methods',
      '"debug logs are unreadable" → good <code>__repr__</code> with the class name and key fields'
    ],
    code: [{ lang: 'python', run: true, title: 'A Deck that behaves like a built-in sequence', code: R`
      class Deck:
          """A tiny card deck that behaves like a built-in sequence."""

          def __init__(self, cards):
              self._cards = list(cards)          # composition: we wrap a real list

          def __repr__(self):                    # for developers: unambiguous
              return f"Deck({self._cards!r})"

          def __str__(self):                     # for end users: friendly
              return " ".join(self._cards) or "(empty deck)"

          def __len__(self):                     # len(deck)
              return len(self._cards)

          def __getitem__(self, index):          # deck[0], deck[-1], deck[1:3]
              result = self._cards[index]        # the list handles ints, negatives and slices
              if isinstance(index, slice):
                  return Deck(result)            # slicing a Deck gives a Deck
              return result

      deck = Deck(["2S", "7H", "JD", "QC", "AS"])
      print(repr(deck))         # Deck(['2S', '7H', 'JD', 'QC', 'AS'])
      print(deck)               # 2S 7H JD QC AS
      print(len(deck), deck[0], deck[-1])
      print(deck[1:3])          # str() of the sliced Deck -> 7H JD
      print([deck[1:3]])        # containers show repr() of their items
      print("QC" in deck)       # no __contains__ -> falls back to __getitem__(0), (1), ...
      for card in reversed(deck):   # reversed() works too: it uses __len__ + __getitem__
          print(card, end=" ")
      print()
      print(bool(Deck([])))     # no __bool__ -> uses __len__ -> 0 -> False
    ` }, { lang: 'python', run: true, title: 'Dunders are looked up on the CLASS, not the instance', code: R`
      class Box:
          def __len__(self):
              return 3

      b = Box()
      b.__len__ = lambda: 99       # an instance attribute with a dunder name
      print(len(b))                # 3  -> len() asks type(b), ignores the instance
      print(b.__len__())           # 99 -> a normal attribute lookup finds the instance one

      Box.__len__ = lambda self: 7 # patching the CLASS does change behaviour
      print(len(b))                # 7
    ` }],
    codeTitle: ['Sequence protocol in 20 lines (runnable)', 'Special method lookup skips the instance (runnable)'],
    viz: {
      title: 'Which dunder answers each built-in? (Deck walk-through)',
      input: '2S 7H JD QC AS | QC',
      inputLabel: 'Cards (space separated) | card to search with "in"',
      gen: function (input) {
        var raw = String(input === undefined ? '2S 7H JD QC AS | QC' : input).split('|');
        var cards = raw[0].trim().split(/\s+/).filter(Boolean);
        var target = (raw[1] || '').trim() || 'XX';
        if (!cards.length) throw new Error('Type some cards, e.g. "2S 7H JD | 7H"');
        if (cards.length > 8) throw new Error('Use at most 8 cards');
        if (cards.some(function (c) { return c.length > 4; })) throw new Error('Keep each card short (max 4 characters)');
        var frames = [], n = cards.length;
        function F(narr, lines, expr, dunder, result, extra) {
          var hl = {};
          lines.forEach(function (l) { hl[l] = 'cur'; });
          var parts = [
            { type: 'code', label: 'Program (amber = running now)', lang: 'python', code: DECK_VIZ_CODE, hl: hl },
            { type: 'graph', label: 'Dispatch: built-in → class → dunder', directed: true, height: 34, nodes: [
              { id: 'E', label: expr, shape: 'box', x: 14, y: 17 },
              { id: 'T', label: 'type(deck) = Deck', shape: 'box', x: 42, y: 17 },
              { id: 'D', label: dunder, shape: 'box', x: 68, y: 17 },
              { id: 'R', label: result, shape: 'box', x: 90, y: 17 }
            ], edges: [['E', 'T'], ['T', 'D'], ['D', 'R']], hl: { E: 'cur', D: 'ok', R: 'sel' }, ehl: { 'E-T': 'ok', 'T-D': 'ok', 'D-R': 'ok' } }
          ];
          (extra || []).forEach(function (p) { parts.push(p); });
          frames.push({ narr: narr, parts: parts });
        }
        var arrPart = function (hl, ptr) { return { type: 'array', label: 'deck._cards (the wrapped list)', values: cards.slice(), hl: hl || {}, ptr: ptr || {} }; };
        frames.push({ narr: 'We build <code>deck = Deck(cards)</code>. Python calls <code>Deck.__init__</code>, which copies the cards into a private list <code>self._cards</code>. From now on, every built-in we use will be routed to a dunder method on the <b>class</b>.', parts: [
          { type: 'code', label: 'Program', lang: 'python', code: DECK_VIZ_CODE, hl: { 10: 'cur', 2: 'ok' } }, arrPart()
        ] });
        var reprText = 'Deck(' + pyList(cards) + ')';
        F('<code>repr(deck)</code> → Python looks up <code>__repr__</code> on <code>type(deck)</code> and calls it. Result: <code>' + esc(reprText) + '</code>. This is what the REPL and debuggers show you.', [11, 3], 'repr(deck)', 'Deck.__repr__', reprText.length > 18 ? reprText.slice(0, 16) + '…' : reprText, [arrPart(), { type: 'vars', label: 'result', vals: { 'repr(deck)': reprText }, hl: { 'repr(deck)': 'ok' } }]);
        F('<code>print(deck)</code> calls <code>str(deck)</code>, which uses <code>__str__</code> → <code>' + esc(cards.join(' ')) + '</code>. If we had not written <code>__str__</code>, Python would quietly fall back to <code>__repr__</code>.', [12, 4], 'print(deck)', 'Deck.__str__', cards.join(' ').length > 16 ? cards.join(' ').slice(0, 14) + '…' : cards.join(' '), [arrPart(), { type: 'text', label: 'Console output', html: '<pre>' + esc(cards.join(' ')) + '</pre>' }]);
        F('<code>len(deck)</code> → <code>Deck.__len__</code> returns <b>' + n + '</b>. <code>len()</code> checks the answer is an int ≥ 0 before handing it back.', [13, 5], 'len(deck)', 'Deck.__len__', String(n), [arrPart(), { type: 'vars', label: 'result', vals: { 'len(deck)': n }, hl: { 'len(deck)': 'ok' } }]);
        var h0 = {}; h0[0] = 'g';
        F('<code>deck[0]</code> → <code>Deck.__getitem__(deck, 0)</code>. The int 0 is passed straight to the wrapped list → <b>' + esc(cards[0]) + '</b>.', [14, 6, 7, 8], 'deck[0]', '__getitem__(0)', cards[0], [arrPart(h0, { 0: 'i=0' })]);
        var hl1 = {}, p1 = {}; hl1[n - 1] = 'g'; p1[n - 1] = 'i=-1';
        F('<code>deck[-1]</code> → <code>__getitem__(-1)</code>. We did not write any negative-index logic: delegating to the list gives it for free → <b>' + esc(cards[n - 1]) + '</b>. (A hand-written container must do <code>i += len(self)</code> itself.)', [15, 6, 7, 8], 'deck[-1]', '__getitem__(-1)', cards[n - 1], [arrPart(hl1, p1)]);
        var sl = cards.slice(1, 3), hs = {};
        for (var s = 1; s < Math.min(3, n); s++) hs[s] = 'b';
        F('<code>deck[1:3]</code> → Python builds a <code>slice(1, 3, None)</code> object and passes it to <code>__getitem__</code>. Our code sees <code>isinstance(i, slice)</code> and wraps the result in a new <b>Deck</b> → <code>Deck(' + esc(pyList(sl)) + ')</code>. Slices return the same type, like lists do.', [16, 6, 7, 8], 'deck[1:3]', '__getitem__(slice)', 'Deck(' + sl.length + ' cards)', [arrPart(hs), { type: 'vars', label: 'argument received', vals: { i: 'slice(1, 3, None)', 'type(result)': 'Deck' }, hl: { i: 'sel' } }]);
        // membership via __getitem__ fallback
        var found = -1;
        for (var k = 0; k <= n; k++) {
          var hk = {}, pk = {};
          for (var d = 0; d < k; d++) hk[d] = 'm';
          if (k === n) {
            F('<code>__getitem__(' + n + ')</code> raises <code>IndexError</code>. Python treats that as "end of sequence" (not as a crash) → <code>' + esc(target) + ' in deck</code> is <b>False</b>.', [17, 7], esc(target) + ' in deck', '__getitem__(' + n + ')', 'IndexError→False', [arrPart(hk)]);
            break;
          }
          pk[k] = 'i=' + k;
          var hit = cards[k] === target;
          hk[k] = hit ? 'g' : 'y';
          F('<code>' + esc(target) + ' in deck</code>: Deck has no <code>__contains__</code> and no <code>__iter__</code>, so Python falls back to calling <code>__getitem__(' + k + ')</code> → ' + esc(cards[k]) + '. ' + (hit ? '<span class="c-g">Equal → stop, result True.</span>' : 'Not equal, try the next index.'), [17, 7], esc(target) + ' in deck', '__getitem__(' + k + ')', hit ? 'True' : cards[k] + ' ≠ ' + target, [arrPart(hk, pk)]);
          if (hit) { found = k; break; }
        }
        F('<code>for c in deck</code> uses the very same fallback: <code>iter(deck)</code> builds an iterator that calls <code>__getitem__(0), (1), …</code> and stops at the first <code>IndexError</code>. That is why our tiny class already works in <code>for</code>, <code>list(deck)</code>, <code>reversed(deck)</code> and unpacking.', [18, 7], 'for c in deck', 'iter → __getitem__', n + ' items', [arrPart((function () { var h = {}; for (var q = 0; q < n; q++) h[q] = 'g'; return h; })()), { type: 'text', label: 'Console output', html: '<pre>' + esc(cards.join('\n')) + '</pre>' }]);
        F('<code>bool(deck)</code>: no <code>__bool__</code>, so Python uses <code>__len__</code> → ' + n + ' ≠ 0 → <b>True</b>.', [19, 5], 'bool(deck)', 'Deck.__len__', 'True', [arrPart()]);
        F('<code>bool(Deck([]))</code>: <code>__len__</code> returns 0 → <b>False</b>. So <code>if deck:</code> reads naturally as "if the deck is not empty". Without <code>__len__</code>/<code>__bool__</code> every object would be truthy.', [20, 5], 'bool(Deck([]))', 'Deck.__len__', 'False', [{ type: 'array', label: 'empty deck._cards', values: [] }]);
        frames.push({ narr: 'Summary: we wrote <b>4 dunders</b> and got <code>repr</code>, <code>print</code>, <code>len</code>, indexing, negative indexing, slicing, <code>in</code>, <code>for</code>, <code>reversed</code> and truthiness. ' + (found >= 0 ? 'The search hit at index ' + found + '.' : 'The search scanned every card.') + ' For speed you would add <code>__contains__</code> / <code>__iter__</code>, or inherit <code>collections.abc.Sequence</code>.', parts: [
          { type: 'table', label: 'Built-in → dunder used', columns: ['built-in', 'dunder', 'result'], rows: [
            ['repr(deck)', '__repr__', reprText], ['print(deck)', '__str__', cards.join(' ')], ['len(deck)', '__len__', String(n)], ['deck[1:3]', '__getitem__(slice)', 'Deck(' + pyList(sl) + ')'], [target + ' in deck', '__getitem__ fallback', found >= 0 ? 'True' : 'False'], ['bool(deck)', '__len__', 'True']
          ], hl: { 3: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Predict the output: __str__ vs __repr__ inside containers', html: R`<p>A class with <b>only</b> <code>__str__</code> defined. <code>print(p)</code> uses it, but <code>print([p])</code> asks the list for its <code>str</code>, and a list builds its text from the <code>repr</code> of each item, so you see the ugly default. Output: <code>Point 1,2</code> then <code>[&lt;__main__.P object at 0x…&gt;]</code>. Fix: define <code>__repr__</code> (and you can drop <code>__str__</code>).</p>`, code: { lang: 'python', run: true, code: R`
        class P:
            def __init__(self, x, y):
                self.x, self.y = x, y
            def __str__(self):
                return f"Point {self.x},{self.y}"

        p = P(1, 2)
        print(p)            # Point 1,2
        print(str([p])[:20])  # '[<__main__.P object' -> list uses repr of items

        class Q(P):
            def __repr__(self):
                return f"Q(x={self.x!r}, y={self.y!r})"   # !r = repr of each field

        print([Q(1, 2)])    # [Q(x=1, y=2)]
        print(f"{Q(3, 4)}") # f-string uses __format__ -> __str__ -> Point 3,4
      ` } },
      { title: 'Truthiness order: __bool__ beats __len__', html: R`<p>Python checks <code>__bool__</code> first; only if it is missing does it use <code>__len__</code>. A class with neither is always truthy. Classic bug: an <code>Inbox</code> with <code>__len__</code> makes <code>if inbox:</code> mean "has messages", which surprises callers who meant "is not None". Prefer <code>if inbox is not None:</code> when you mean that.</p>`, code: { lang: 'python', run: true, code: R`
        class Inbox:
            def __init__(self, msgs): self.msgs = list(msgs)
            def __len__(self): return len(self.msgs)

        class Account:
            def __init__(self, balance): self.balance = balance
            def __bool__(self): return self.balance > 0    # must return a real bool
            def __len__(self): return 999                  # ignored for truthiness

        class Plain:
            pass

        print(bool(Inbox([])), bool(Inbox(["hi"])))  # False True
        print(bool(Account(0)), bool(Account(5)))    # False True  (__bool__ wins)
        print(bool(Plain()))                         # True: no __bool__, no __len__
      ` } },
      { title: '__getitem__ with tuples: a 2-D Grid[r, c]', html: R`<p><code>g[1, 2]</code> is just <code>g[(1, 2)]</code>: the comma builds a tuple and <code>__getitem__</code> receives it. Unpack it, validate, and raise <code>IndexError</code> (sequences) or <code>KeyError</code> (mappings) for bad keys. NumPy uses exactly this trick for <code>a[i, j]</code>.</p>`, code: { lang: 'python', run: true, code: R`
        class Grid:
            def __init__(self, rows, cols, fill=0):
                self.rows, self.cols = rows, cols
                self._cells = [fill] * (rows * cols)    # flat storage, row-major

            def _index(self, key):
                r, c = key                               # key is the tuple (r, c)
                if not (0 <= r < self.rows and 0 <= c < self.cols):
                    raise IndexError(f"cell {key} out of range")
                return r * self.cols + c

            def __getitem__(self, key):
                return self._cells[self._index(key)]

            def __setitem__(self, key, value):          # g[r, c] = value
                self._cells[self._index(key)] = value

            def __repr__(self):
                return f"Grid({self.rows}x{self.cols})"

        g = Grid(2, 3)
        g[1, 2] = 9
        print(g, g[1, 2], g[0, 0])
        try:
            g[5, 5]
        except IndexError as e:
            print("IndexError:", e)
      ` } },
      { title: 'Callable objects with __call__', html: R`<p><code>obj(args)</code> calls <code>type(obj).__call__(obj, args)</code>. Useful for objects that hold state but act like functions: counters, configurable validators, strategy objects. Output: <code>True False 2</code>.</p>`, code: { lang: 'python', run: true, code: R`
        class MinLength:
            def __init__(self, n):
                self.n = n
                self.calls = 0                # state a plain function would not have
            def __call__(self, text):
                self.calls += 1
                return len(text) >= self.n

        check = MinLength(3)
        print(check("abc"), check("ab"), check.calls)
      ` } }
    ],
    deepDive: R`<p>🟣 <b>Special method lookup skips the instance.</b> Implicit calls (<code>len(x)</code>, <code>x + y</code>, <code>x[k]</code>) look the dunder up on <code>type(x)</code>, bypassing both the instance <code>__dict__</code> and <code>__getattribute__</code>. CPython does this for speed: when a class is created, each dunder is copied into a <b>C slot</b> in the type object (<code>tp_repr</code>, <code>sq_length</code>/<code>mp_length</code>, <code>mp_subscript</code>, <code>nb_bool</code> …). <code>len(x)</code> is then one pointer hop, no dictionary search. Assigning <code>Cls.__len__ = f</code> later still works because <code>type.__setattr__</code> refreshes the slot.</p>
      <p><b>The legacy sequence protocol.</b> <code>iter(x)</code> first tries <code>__iter__</code>; failing that, if <code>__getitem__</code> exists it returns a "sequence iterator" that calls <code>__getitem__(0), (1), …</code> until <code>IndexError</code> (or <code>StopIteration</code>). <code>in</code> tries <code>__contains__</code>, then iteration. This fallback is why the 4-method Deck works everywhere, but membership is O(n) and each step is a Python-level call, so production containers add <code>__iter__</code> and <code>__contains__</code>. Note that a <b>mapping</b> with <code>__getitem__</code> but no <code>__iter__</code> breaks: iteration would call <code>m[0]</code> and get a <code>KeyError</code>, which is not caught.</p>
      <p><b>Edge cases worth knowing:</b> <code>len()</code> converts via <code>__index__</code> and must fit in <code>Py_ssize_t</code> (huge values raise <code>OverflowError</code>), so lazy "infinite" ranges cannot report <code>len</code>; <code>__length_hint__</code> is a pre-allocation hint only. Use <code>operator.index(i)</code> in <code>__getitem__</code> to accept any int-like (NumPy ints) and reject floats. <code>slice.indices(len)</code> turns a slice into clamped (start, stop, step) so you can implement slicing on non-list storage. Recursive containers need <code>reprlib.recursive_repr</code> to avoid infinite <code>__repr__</code> loops. <code>__format__</code> lets <code>f"{money:.2f}"</code> work. And never <b>subclass <code>dict</code>/<code>list</code></b> to customise <code>__getitem__</code>: the C methods <code>dict.get</code>, <code>update</code> and the constructor bypass your override. Wrap a list (composition) or inherit from <code>collections.UserDict</code> / <code>collections.abc.MutableMapping</code> instead.</p>`,
    aiEra: R`<p>🤖 <b>What AI changes:</b> assistants write dunder boilerplate instantly, and many will just put <code>@dataclass</code> on top, which is often the right call. The hard part is no longer typing <code>__len__</code>; it is <b>choosing the protocol</b> (sequence? mapping? iterable?) and making the behaviour consistent with built-ins.</p>
      <p><b>Use AI as a partner:</b> <code>Here is my container class. List every built-in operation a user might try on it (len, slicing, negative index, in, reversed, bool, repr) and tell me which ones silently fall back or behave oddly. Do not rewrite the class.</code> That turns the model into a reviewer for protocol gaps.</p>
      <p><b>Where AI goes wrong:</b> it often subclasses <code>dict</code> and overrides <code>__getitem__</code> (then <code>.get()</code> ignores the override); returns a plain <code>list</code> from slicing instead of the container type; writes <code>__repr__</code> that hides the important fields or calls <code>str()</code> on them (so <code>'1'</code> and <code>1</code> look the same; use <code>!r</code>); or defines <code>__len__</code> on an object that is "falsy when empty" without the caller expecting it. <b>What you must own:</b> knowing which dunder each syntax maps to, the fallback order (<code>__bool__</code> → <code>__len__</code>; <code>__iter__</code> → <code>__getitem__</code>), and explaining the trade-offs in an interview without a tool.</p>`,
    problems: [{
      title: 'Playlist that behaves like a list',
      level: 'Easy', tags: ['dunder', 'sequence protocol', '__getitem__', 'slicing'], companies: ['Spotify', 'Amazon', 'Microsoft'],
      statement: R`<p>Write a class <code>Playlist(name, songs)</code> so that callers can use normal Python syntax on it:</p>
        <ul><li><code>len(pl)</code> → number of songs; <code>bool(pl)</code> → False when empty</li>
        <li><code>pl[0]</code>, <code>pl[-1]</code> → a song title; <code>pl[1:3]</code> → a <b>new Playlist</b> named <code>"&lt;name&gt; (slice)"</code></li>
        <li><code>"hello" in pl</code> → case-insensitive membership</li>
        <li><code>repr(pl)</code> → <code>Playlist('Gym', ['A', 'B'])</code>; <code>for s in pl</code> works</li></ul>`,
      constraints: R`0 ≤ number of songs ≤ 10<sup>5</sup>; titles are non-empty strings; membership may be called many times.`,
      example: R`<p><code>pl = Playlist("Gym", ["Eye of the Tiger", "Lose Yourself", "Stronger"])</code></p>
        <p><code>len(pl)</code> → ${H.c('g', '3')} · <code>pl[-1]</code> → ${H.c('g', "'Stronger'")} · <code>pl[0:2]</code> → ${H.c('b', "Playlist('Gym (slice)', ['Eye of the Tiger', 'Lose Yourself'])")} · <code>"STRONGER" in pl</code> → ${H.c('g', 'True')} (case-insensitive).</p>`,
      brute: {
        why: R`<p>The non-Pythonic version exposes Java-style methods (<code>size()</code>, <code>get(i)</code>, <code>has(t)</code>). It works, but <code>len()</code>, <code>for</code>, <code>in</code>, slicing and <code>if pl:</code> all fail or silently misbehave (every Playlist is truthy), and <code>has()</code> lower-cases every title on every call: O(n) string work per lookup.</p>`,
        code: R`
          class PlaylistBrute:
              def __init__(self, name, songs):
                  self.name, self.songs = name, list(songs)
              def size(self):
                  return len(self.songs)
              def get(self, i):
                  return self.songs[i]
              def has(self, title):
                  return any(s.lower() == title.lower() for s in self.songs)  # O(n) each call

          p = PlaylistBrute("Gym", ["A", "B"])
          print(p.size(), p.get(0), p.has("a"))
        `
      },
      mcq: { q: 'Which single dunder makes both <code>pl[0]</code> and <code>pl[1:3]</code> work?', options: ['<code>__getitem__</code>, which receives an int or a <code>slice</code> object', '<code>__index__</code>', '<code>__slice__</code> (separate method)', '<code>__iter__</code>'], answer: 0, explain: '<code>__getslice__</code> was removed in Python 3. Slices arrive at <code>__getitem__</code> as <code>slice(start, stop, step)</code> objects.' },
      hints: [
        R`<p>Hint 1: Wrap a real list (composition). Delegating <code>self._songs[index]</code> gives you negative indices and slicing for free.</p>`,
        R`<p>Hint 2: In <code>__getitem__</code>, check <code>isinstance(index, slice)</code> and wrap the result in a new <code>Playlist</code>. For fast case-insensitive <code>in</code>, keep a <code>set</code> of <code>title.casefold()</code> values and implement <code>__contains__</code>.</p>`,
        R`<p>Hint 3: Edge cases: empty playlist must be falsy (define <code>__len__</code>); <code>in</code> with a non-string should return False, not crash; <code>__iter__</code> should return <code>iter(self._songs)</code> so loops do not go through the slow <code>__getitem__</code> fallback. Recipe: <code>__init__</code> → <code>__repr__</code> → <code>__len__</code> → <code>__getitem__</code> → <code>__iter__</code> → <code>__contains__</code>.</p>`
      ],
      solution: {
        approach: R`<p>Composition plus five dunders. <code>__getitem__</code> delegates to the inner list and re-wraps slices. <code>__contains__</code> uses a pre-computed casefolded set → O(1) average membership. <code>__iter__</code> delegates to the list iterator. <code>__len__</code> gives both <code>len()</code> and truthiness.</p>`,
        code: { lang: 'python', run: true, code: R`
          class Playlist:
              def __init__(self, name, songs):
                  self.name = name
                  self._songs = list(songs)
                  self._keys = {s.casefold() for s in self._songs}   # for O(1) "in"

              def __repr__(self):
                  return f"Playlist({self.name!r}, {self._songs!r})"

              def __len__(self):
                  return len(self._songs)          # also powers bool(pl)

              def __getitem__(self, index):
                  if isinstance(index, slice):
                      return Playlist(f"{self.name} (slice)", self._songs[index])
                  return self._songs[index]        # ints, negatives, IndexError: all from list

              def __iter__(self):
                  return iter(self._songs)         # fast path; no __getitem__ fallback

              def __contains__(self, title):
                  return isinstance(title, str) and title.casefold() in self._keys

          pl = Playlist("Gym", ["Eye of the Tiger", "Lose Yourself", "Stronger"])
          print(len(pl), pl[-1])
          print(pl[0:2])
          print("STRONGER" in pl, 42 in pl)
          print(bool(Playlist("Empty", [])))
          print([s.upper() for s in pl][:1])
        ` },
        dry: { head: ['expression', 'dunder called', 'argument', 'result'], rows: [
          ['len(pl)', '__len__', '—', '3'],
          ['pl[-1]', '__getitem__', '-1', "'Stronger'"],
          ['pl[0:2]', '__getitem__', 'slice(0, 2, None)', "Playlist('Gym (slice)', [2 songs])"],
          ['"STRONGER" in pl', '__contains__', "'STRONGER'", "'stronger' in set → True"],
          ['bool(Playlist("Empty", []))', '__len__ (no __bool__)', '—', '0 → False']
        ] },
        complexity: R`<p>Index O(1), slice O(k) for k songs copied, <code>in</code> O(1) average (O(n) once to build the set), iteration O(n). Extra space O(n) for the key set.</p>`,
        followUps: ['Make it mutable: add <code>__setitem__</code>/<code>__delitem__</code> and keep the key set in sync (hint: a Counter, since titles may repeat)', 'Inherit from <code>collections.abc.Sequence</code> and see which methods you get for free', 'Why would subclassing <code>list</code> be a worse design here?']
      }
    }]
  });

  registerModule({
    id: 'py08',
    title: 'Advanced OOP: Dunder Methods, MRO & Dataclasses',
    intro: R`<p>In the OOP basics module you learned to <b>write</b> classes. This module teaches you to make your classes feel like <b>native Python</b>: printable (<code>__repr__</code>), countable (<code>__len__</code>), indexable and sliceable (<code>__getitem__</code>), comparable and sortable (<code>__eq__</code>, <code>__lt__</code>), safely usable as dict keys (<code>__hash__</code>), and addable with real operators (<code>__add__</code>, <code>__radd__</code>). Then we open the hood on <b>multiple inheritance</b>: how Python decides which parent's method wins (the MRO, computed by the <b>C3 linearization</b> algorithm, which you will run by hand), and how <code>super()</code> really walks that list.</p>
      <p>Finally we cover the tools professionals reach for every day: <b>properties</b> (validated, computed attributes), <b>dataclasses</b> (all the boilerplate generated for you, and exactly what is generated), <b>abstract base classes</b> (contracts that fail fast, plus free mixin methods from <code>collections.abc</code>) and <b>__slots__</b> (when a million tiny objects need to fit in memory). Every topic has a step-by-step visualizer, runnable examples, "predict the output" drills and interview-grade deep dives, because these are exactly the questions that separate "knows Python syntax" from "knows Python" in interviews.</p>`,
    goals: [
      'Pick the right dunder for any built-in syntax (<code>len</code>, <code>[ ]</code>, <code>in</code>, <code>for</code>, <code>print</code>, <code>if</code>, <code>+</code>, <code>==</code>, <code>&lt;</code>) and explain the fallback rules',
      'Implement <code>__eq__</code> + <code>__hash__</code> correctly, use <code>NotImplemented</code> and <code>functools.total_ordering</code>, and explain why mutable objects should not be hashable',
      'Trace exactly how <code>a + b</code> is dispatched (<code>__add__</code> → <code>__radd__</code>, the subclass-first rule, <code>__iadd__</code>) and build operator-overloaded value types',
      'Compute any MRO by hand with C3 linearization, spot inconsistent hierarchies, and write cooperative <code>super()</code> chains',
      'Use <code>@property</code>, <code>@dataclass</code> (field, default_factory, frozen, order, slots, __post_init__), ABCs and <code>__slots__</code>, and say when each one is the right tool'
    ],
    prereqs: R`<p>Python 4 (OOP Basics: classes, <code>__init__</code>, inheritance, <code>super()</code>), Python 5 (dict/set hash tables) and Python 6 (decorators, since <code>@property</code>, <code>@dataclass</code> and <code>@total_ordering</code> are decorators). Comfort with lists, dicts and f-strings.</p>`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
