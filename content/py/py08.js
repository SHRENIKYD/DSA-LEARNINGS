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

  /* ======================================================================
     TOPIC 2: Equality, Hashing & Ordering — __eq__, __hash__, __lt__, total_ordering
     ====================================================================== */
  topics.push({
    title: 'Equality, Hashing & Ordering: __eq__, __hash__, __lt__',
    analogy: R`<p>A <b>coat check</b> at a theatre. When you hand in your coat you get a <b>ticket number</b> (the hash). Later, the attendant walks straight to the rack for that number, then checks the coat really is yours (equality). Two rules keep this working: (1) <b>two coats that are "the same" must get the same ticket</b>, otherwise the attendant searches the wrong rack; and (2) <b>you must not repaint your coat while it is on the rack</b>, because its ticket was computed from what it looked like when you handed it in.</p>`,
    explain: R`<p>🟢 <b>Equality.</b> <code>a == b</code> calls <code>a.__eq__(b)</code>. If you never define it, the default is <b>identity</b>: two objects are equal only if they are literally the same object (<code>a is b</code>). Define <code>__eq__</code> when two separate objects with the same data should count as equal (two <code>Point(1, 2)</code> objects, two <code>Money(5, "USD")</code> objects).</p>
      <p><b>Return <code>NotImplemented</code>, not <code>False</code>,</b> when the other object is a type you do not understand. <code>NotImplemented</code> is a special signal meaning "I don't know, ask the other side". Python then tries <code>b.__eq__(a)</code>, and if that also gives up, <code>==</code> falls back to identity (<code>a is b</code>). <code>!=</code> automatically inverts <code>__eq__</code> in Python 3, so you rarely write <code>__ne__</code>.</p>
      <p>🔵 <b>Hashing.</b> Sets and dict keys find things by <code>hash(x)</code> first and then confirm with <code>==</code>. So there is one golden rule:</p>
      ${H.table(['Rule', 'Why', 'What breaks if violated'], [
        ['<b>a == b ⇒ hash(a) == hash(b)</b>', 'equal objects must land in the same bucket', 'duplicates in a set; dict lookups miss'],
        ['hash must not change while the object is in a set/dict', 'its slot was chosen by the old hash', '<code>x in s</code> returns False for an object that is inside'],
        ['unequal objects <i>may</i> share a hash', 'that is just a collision', 'only speed suffers, never correctness']
      ])}
      <p>Because of rule 1, <b>Python sets <code>__hash__ = None</code> the moment you define <code>__eq__</code></b> in a class (unless you also define <code>__hash__</code>). Your objects become <b>unhashable</b>: <code>TypeError: unhashable type: 'Point'</code>. That is a safety feature, not a bug. The fix is <code>def __hash__(self): return hash((self.x, self.y))</code>, hashing a tuple of <b>exactly the fields used in <code>__eq__</code></b>, and only if those fields never change (treat the object as immutable).</p>
      <p><b>Ordering.</b> <code>a &lt; b</code> calls <code>a.__lt__(b)</code>. <code>sorted()</code>, <code>list.sort()</code>, <code>min()</code>, <code>max()</code>, <code>heapq</code> and <code>bisect</code> only ever use <code>&lt;</code>. The reflected partner of <code>__lt__</code> is <code>__gt__</code>: if <code>a.__lt__(b)</code> returns <code>NotImplemented</code>, Python tries <code>b.__gt__(a)</code>; if both give up you get <code>TypeError: '&lt;' not supported between instances</code>. Writing all six comparison methods is tedious, so <code>@functools.total_ordering</code> fills in the rest from <code>__eq__</code> plus one of <code>__lt__</code>/<code>__le__</code>/<code>__gt__</code>/<code>__ge__</code>.</p>
      ${H.arr(['Version(1,2)', 'Version(1,10)', 'Version(2,0)'], { label: 'sorted by tuple (major, minor)', hl: { 0: 'g', 1: 'g', 2: 'g' } })}
      <p>The easiest correct trick for both hashing and ordering: build a <b>key tuple</b> of the important fields and let tuples do the work (<code>(1, 2) &lt; (1, 10)</code> is True, while the strings <code>"1.2" &lt; "1.10"</code> is False!).</p>`,
    clues: [
      '"use objects as dict keys / put them in a set / deduplicate objects" → <code>__eq__</code> + <code>__hash__</code> on immutable fields',
      '<code>TypeError: unhashable type</code> after adding <code>__eq__</code> → you must also define <code>__hash__</code> (or use a frozen dataclass)',
      '"sort these objects / heap of tasks / priority queue of custom objects" → <code>__lt__</code> (or a key function, or a <code>(priority, counter, obj)</code> tuple)',
      '"version strings compare wrongly" → compare tuples of ints, not strings',
      '"compare with other types gracefully" → return <code>NotImplemented</code>, never raise or return False',
      '"objects disappear from my set after I change them" → mutable fields in <code>__hash__</code>'
    ],
    code: [{ lang: 'python', run: true, title: 'Point: eq, hash, NotImplemented', code: R`
      class Point:
          __match_args__ = ("x", "y")

          def __init__(self, x, y):
              self._x, self._y = x, y            # "private" by convention: treat as immutable

          @property
          def x(self): return self._x
          @property
          def y(self): return self._y

          def __repr__(self):
              return f"Point({self._x}, {self._y})"

          def __eq__(self, other):
              if not isinstance(other, Point):
                  return NotImplemented          # let the other side (or identity) decide
              return (self._x, self._y) == (other._x, other._y)

          def __hash__(self):
              return hash((self._x, self._y))   # same fields as __eq__

      a, b = Point(1, 2), Point(1, 2)
      print(a == b, a is b)                      # True False
      print(len({a, b}))                         # 1 -> dedup works
      print({a: "home"}[b])                      # 'home' -> b finds a's slot
      print(a == (1, 2))                         # False: both sides NotImplemented -> identity
      print(a != b)                              # False: __ne__ inverts __eq__ automatically
    ` }, { lang: 'python', run: true, title: 'total_ordering: write 2 methods, get 6', code: R`
      from functools import total_ordering

      @total_ordering
      class Version:
          def __init__(self, text):
              self.parts = tuple(int(p) for p in text.split("."))   # "1.10" -> (1, 10)

          def __repr__(self):
              return "v" + ".".join(map(str, self.parts))

          def __eq__(self, other):
              if not isinstance(other, Version):
                  return NotImplemented
              return self.parts == other.parts

          def __lt__(self, other):
              if not isinstance(other, Version):
                  return NotImplemented
              return self.parts < other.parts          # tuples compare element by element

          def __hash__(self):
              return hash(self.parts)

      vs = [Version("1.10"), Version("1.2"), Version("2.0"), Version("1.2")]
      print(sorted(vs))                  # [v1.2, v1.2, v1.10, v2.0]
      print(Version("1.10") >= Version("1.9"), max(vs))   # >= generated by total_ordering
      print("1.10" < "1.2")              # True! why string comparison is wrong here
      print(len(set(vs)))                # 3 distinct versions
    ` }],
    codeTitle: ['Value object with correct equality and hashing (runnable)', 'Ordering with total_ordering (runnable)'],
    viz: {
      title: 'Inside a set: hash → slot → __eq__ (and the mutation trap)',
      input: '1,2 3,4 1,2 2,1 9,0',
      inputLabel: 'Points x,y separated by spaces (toy hash = 31·x + y, 8 slots)',
      gen: function (input) {
        var toks = String(input === undefined ? '1,2 3,4 1,2 2,1 9,0' : input).trim().split(/\s+/).filter(Boolean);
        if (!toks.length) throw new Error('Enter points like "1,2 3,4 1,2"');
        if (toks.length > 7) throw new Error('Use at most 7 points (the toy table has 8 slots)');
        var pts = toks.map(function (t) {
          var m = t.split(',').map(Number);
          if (m.length !== 2 || m.some(function (v) { return isNaN(v) || Math.abs(v) > 999 || Math.floor(v) !== v; })) throw new Error('Each point must be two integers like 3,4 (|value| ≤ 999)');
          return m;
        });
        var SIZE = 8, slots = [], frames = [];
        for (var i = 0; i < SIZE; i++) slots.push(null);
        function h(p) { return 31 * p[0] + p[1]; }
        function mod(a) { return ((a % SIZE) + SIZE) % SIZE; }
        function view(hl, ptr) {
          return { type: 'array', label: 'set\'s internal table (8 slots, toy linear probing)', values: slots.map(function (s) { return s ? 'P(' + s.p[0] + ',' + s.p[1] + ') h=' + s.h : '·'; }), hl: hl || {}, ptr: ptr || {} };
        }
        var CODE = 'def __eq__(self, o):\n    return (self.x, self.y) == (o.x, o.y)\ndef __hash__(self):\n    return hash((self.x, self.y))   # toy: 31*x + y';
        frames.push({ narr: 'An empty set is a table of slots. To add an object Python computes its <b>hash</b>, picks slot <code>hash % 8</code>, and only calls <code>__eq__</code> when a slot is already taken by an object <b>with the same hash</b>. (Real CPython uses a smarter probe sequence and real 64-bit hashes; the idea is identical.)', parts: [view(), { type: 'code', label: 'Point', lang: 'python', code: CODE }] });
        var stored = [];
        pts.forEach(function (p, idx) {
          var hv = h(p), s = mod(hv), probes = 0, label = 'P(' + p[0] + ',' + p[1] + ')';
          var hl0 = {}, pt0 = {}; hl0[s] = 'cur'; pt0[s] = 'home';
          frames.push({ narr: 'add(' + label + '): <code>__hash__</code> → 31·' + p[0] + ' + ' + p[1] + ' = <b>' + hv + '</b>; ' + hv + ' % 8 = <b>' + s + '</b>. Go to slot ' + s + '.', parts: [view(hl0, pt0), { type: 'code', label: 'Point', lang: 'python', code: CODE, hl: { 3: 'cur', 4: 'cur' } }, { type: 'vars', vals: { obj: label, hash: hv, slot: s }, hl: { slot: 'cur' } }] });
          while (true) {
            var cur = slots[s];
            var hl = {}, pt = {}; pt[s] = 'probe ' + probes;
            if (!cur) {
              slots[s] = { p: p, h: hv }; stored.push({ p: p, h: hv, slot: s });
              hl[s] = 'ok';
              frames.push({ narr: 'Slot ' + s + ' is empty → store ' + label + ' here. <span class="c-g">Inserted.</span>' + (probes ? ' (We had to probe ' + probes + ' slot(s) past a collision.)' : ''), parts: [view(hl, pt), { type: 'set', label: 'set contents', items: stored.map(function (q) { return 'P(' + q.p[0] + ',' + q.p[1] + ')'; }), hl: (function () { var o = {}; o[label] = 'ok'; return o; })() }] });
              break;
            }
            if (cur.h !== hv) {
              hl[s] = 'bad';
              frames.push({ narr: 'Slot ' + s + ' holds P(' + cur.p[0] + ',' + cur.p[1] + ') with hash ' + cur.h + ' ≠ ' + hv + '. Different hashes can never be equal, so Python <b>skips <code>__eq__</code></b> entirely and probes the next slot. This is why hashing is fast.', parts: [view(hl, pt), { type: 'vars', vals: { 'stored hash': cur.h, 'our hash': hv, '__eq__ called?': 'no' }, hl: { '__eq__ called?': 'sel' } }] });
              s = mod(s + 1); probes++;
              continue;
            }
            var eq = cur.p[0] === p[0] && cur.p[1] === p[1];
            hl[s] = eq ? 'bad' : 'cur';
            frames.push({ narr: 'Slot ' + s + ' holds an object with the <b>same hash</b> ' + hv + ' → now Python calls <code>__eq__</code>: (' + cur.p.join(', ') + ') == (' + p.join(', ') + ') → <b>' + (eq ? 'True' : 'False') + '</b>. ' + (eq ? '<span class="c-r">Duplicate: the set keeps the original and ignores this one.</span>' : 'A true collision (equal hash, different value): keep probing.'), parts: [view(hl, pt), { type: 'code', label: 'Point', lang: 'python', code: CODE, hl: { 1: 'cur', 2: eq ? 'bad' : 'cur' } }, { type: 'vars', vals: { 'stored hash': cur.h, 'our hash': hv, '__eq__': eq ? 'True → duplicate' : 'False' }, hl: { '__eq__': eq ? 'bad' : 'cur' } }] });
            if (eq) break;
            s = mod(s + 1); probes++;
          }
        });
        // mutation trap
        var victim = stored[0];
        if (victim) {
          var old = victim.p.slice(), np = [old[0] + 10, old[1]], nh = h(np), ns = mod(nh);
          var hlA = {}; hlA[victim.slot] = 'sel';
          var label2 = 'P(' + np[0] + ',' + np[1] + ')';
          slots[victim.slot] = { p: np, h: victim.h };
          frames.push({ narr: '<b>The mutation trap.</b> Suppose Point were mutable and we did <code>p.x += 10</code> on the first point while it sits in the set. The object changes to ' + label2 + ', but it still lives in slot ' + victim.slot + ', filed under its <b>old</b> hash ' + victim.h + '. Nothing re-files it.', parts: [view(hlA), { type: 'vars', vals: { 'object now': label2, 'filed under hash': victim.h, 'its real hash now': nh }, hl: { 'its real hash now': 'bad' } }] });
          var hlB = {}, ptB = {}; hlB[ns] = 'bad'; ptB[ns] = 'looks here'; if (ns !== victim.slot) hlB[victim.slot] = 'sel';
          frames.push({ narr: '<code>p in s</code> computes the <b>new</b> hash ' + nh + ' → slot ' + ns + '. ' + (ns !== victim.slot ? 'It looks in the wrong place and (unless it bumps into the object by luck while probing) answers <span class="c-r">False, even though p is inside the set</span>.' : 'By luck it lands in the right slot, but the stored hash ' + victim.h + ' ≠ ' + nh + ' so it still skips it: <span class="c-r">False</span>.') + ' Lesson: <b>only hash immutable data</b>. Make value objects frozen (read-only properties, <code>@dataclass(frozen=True)</code>, or NamedTuple).', parts: [view(hlB, ptB), { type: 'text', html: '<b>Rule:</b> if <code>__eq__</code> uses a field, <code>__hash__</code> may use it only if that field can never change after construction.' }] });
        }
        return frames;
      }
    },
    examples: [
      { title: 'Predict the output: defining __eq__ kills hashing', html: R`<p>Class <code>A</code> defines only <code>__eq__</code>. Python silently sets <code>A.__hash__ = None</code>, so putting it in a set raises. Class <code>B</code> defines nothing, so it uses identity for both. Output: <code>None</code>, <code>TypeError unhashable type: 'A'</code>, then <code>2</code> (two distinct B objects, even with the same data).</p>`, code: { lang: 'python', run: true, code: R`
        class A:
            def __init__(self, v): self.v = v
            def __eq__(self, o): return isinstance(o, A) and self.v == o.v

        class B:
            def __init__(self, v): self.v = v

        print(A.__hash__)                 # None
        try:
            {A(1)}
        except TypeError as e:
            print("TypeError", e)
        print(len({B(1), B(1)}))         # 2: default eq/hash are identity-based
      ` } },
      { title: 'Why returning False instead of NotImplemented is a bug', html: R`<p><code>Meters</code> knows how to compare itself to <code>Feet</code>, but <code>Feet</code> was written lazily and returns <code>False</code> for unknown types. <code>Meters(1) == Feet(3.28084)</code> is True (Meters is asked first), but <code>Feet(3.28084) == Meters(1)</code> is <b>False</b>: Feet answered "no" instead of "I don't know", so Meters never got a chance. Equality became asymmetric.</p>`, code: { lang: 'python', run: true, code: R`
        class Feet:
            def __init__(self, v): self.v = v
            def __eq__(self, o):
                if not isinstance(o, Feet):
                    return False                     # BUG: should be NotImplemented
                return self.v == o.v

        class Meters:
            def __init__(self, v): self.v = v
            def __eq__(self, o):
                if isinstance(o, Meters):
                    return self.v == o.v
                if isinstance(o, Feet):
                    return abs(self.v * 3.28084 - o.v) < 1e-9
                return NotImplemented

        print(Meters(1) == Feet(3.28084))   # True
        print(Feet(3.28084) == Meters(1))   # False  <- asymmetric because of 'return False'
      ` } },
      { title: 'Heaps of custom objects: __lt__ or a tie-breaker tuple', html: R`<p><code>heapq</code> compares items with <code>&lt;</code>. Pushing <code>(priority, task)</code> tuples crashes when two priorities tie and <code>Task</code> has no <code>__lt__</code> (tuple comparison falls through to the second element). Two fixes: give <code>Task</code> a <code>__lt__</code>, or add a unique counter as a tie-breaker so the task is never compared.</p>`, code: { lang: 'python', run: true, code: R`
        import heapq
        from itertools import count

        class Task:
            def __init__(self, name): self.name = name
            def __repr__(self): return f"Task({self.name!r})"

        h = []
        try:
            heapq.heappush(h, (1, Task("a")))
            heapq.heappush(h, (1, Task("b")))      # tie on 1 -> compares Task < Task
        except TypeError as e:
            print("TypeError:", e)

        h, tie = [], count()
        for pr, name in [(2, "write"), (1, "plan"), (1, "test")]:
            heapq.heappush(h, (pr, next(tie), Task(name)))   # counter breaks ties
        print([heapq.heappop(h)[2] for _ in range(3)])
      ` } },
      { title: 'NaN and the identity shortcut', html: R`<p>Containers check <code>is</code> before <code>==</code> (for speed and so that objects are always "in" themselves). <code>float('nan') == float('nan')</code> is False, yet <code>x in [x]</code> is True for the same NaN object. The same shortcut lets a set find an object even if its <code>__eq__</code> is weird, as long as it is the very same object and the hash matches.</p>`, code: { lang: 'python', run: true, code: R`
        nan = float("nan")
        print(nan == nan)            # False: IEEE 754 says NaN is not equal to anything
        print(nan in [nan])          # True: identity checked first
        print(float("nan") in [nan]) # False: a different NaN object
        print(hash(-1), hash(-2))    # -2 -2: CPython reserves -1 as an error code
      ` } }
    ],
    deepDive: R`<p>🟣 <b>The full comparison algorithm.</b> For <code>a == b</code>: (1) if <code>type(b)</code> is a proper subclass of <code>type(a)</code> and overrides <code>__eq__</code>, try <code>b.__eq__(a)</code> first; (2) otherwise <code>a.__eq__(b)</code>, then the reflection <code>b.__eq__(a)</code>; (3) if everything returns <code>NotImplemented</code>, <code>==</code> falls back to <code>a is b</code> and <code>!=</code> to <code>a is not b</code>. For ordering operators the reflection swaps the operator (<code>a &lt; b</code> ↔ <code>b &gt; a</code>) and there is no identity fallback: you get <code>TypeError</code>. Python never assumes <code>a &lt; b</code> implies <code>not a &gt;= b</code> (think of sets, where <code>&lt;</code> means "proper subset").</p>
      <p><b>Inside dict/set.</b> CPython stores <code>(hash, key, value)</code> entries in a compact array plus a sparse index table, probes with a perturbed sequence (<code>j = (5*j + 1 + perturb) mod size</code>, shifting in higher hash bits), and compares in the order <code>stored_key is key</code> → <code>stored_hash == hash</code> → <code>stored_key == key</code>. So a bad <code>__eq__</code> rarely runs, but a bad <code>__hash__</code> (e.g. <code>return 1</code>) is still <b>correct</b> and just turns every lookup into an O(n) chain of <code>__eq__</code> calls; that is a classic denial-of-service vector, which is why <code>str</code>/<code>bytes</code> hashes are salted per process (<code>PYTHONHASHSEED</code>). <code>hash()</code> of an int is the value mod 2<sup>61</sup>−1, and <code>hash(-1) == -2</code> because −1 signals an error in the C API. <code>hash(1) == hash(1.0) == hash(True)</code> because <code>1 == 1.0 == True</code>: the contract crosses types.</p>
      <p><b>Inheritance traps.</b> A subclass that overrides <code>__eq__</code> gets <code>__hash__ = None</code> again, even if the parent was hashable: re-declare <code>__hash__ = Parent.__hash__</code> if the semantics allow it. Using <code>isinstance(other, Point)</code> lets a <code>ColorPoint</code> equal a <code>Point</code> while <code>ColorPoint.__eq__</code> may disagree (asymmetry); strict value types sometimes check <code>type(other) is type(self)</code> instead. <code>total_ordering</code> derived methods are slower (an extra Python call) and propagate <code>NotImplemented</code> correctly only since 3.4. For <code>sort</code>, a <code>key=</code> function (or <code>operator.attrgetter</code>) is usually faster and more flexible than <code>__lt__</code>, because each key is computed once instead of running a Python-level <code>__lt__</code> on every one of the ~n log n comparisons.</p>`,
    aiEra: R`<p>🤖 <b>What AI changes:</b> an assistant will happily generate <code>__eq__</code>/<code>__hash__</code>/<code>__lt__</code> or just suggest <code>@dataclass(frozen=True, order=True)</code>. Reviewing that code is now the skill: is the hash consistent with equality, are hashed fields immutable, does it return <code>NotImplemented</code>?</p>
      <p><b>Prompt that works:</b> <code>Write property-based tests (hypothesis) that check: a == b implies hash(a) == hash(b); == is symmetric; sorted() is stable and total for my Version class. Do not change the class.</code> Property tests catch exactly the contract violations humans and models both miss.</p>
      <p><b>Where AI goes wrong:</b> hashes mutable fields (a list-backed class with <code>hash(tuple(self.items))</code> that later appends); returns <code>False</code> or raises <code>TypeError</code> for foreign types; writes <code>__hash__</code> with fields different from <code>__eq__</code> (e.g. adds an <code>id</code> that <code>__eq__</code> ignores → equal objects, different hashes); compares version strings lexicographically; or forgets that overriding <code>__eq__</code> in a subclass makes it unhashable. <b>What you must own:</b> the two hash rules, the <code>NotImplemented</code> protocol, and the ability to explain why a set "lost" an object.</p>`,
    problems: [{
      title: 'Case-insensitive Tag usable in sets, dicts and sorted()',
      level: 'Medium', tags: ['__eq__', '__hash__', 'total_ordering', 'NotImplemented'], companies: ['Google', 'Stack Overflow', 'Atlassian'],
      statement: R`<p>Implement an immutable <code>Tag(name)</code> for a blogging platform. Tags differ only by case should be <b>the same tag</b>: <code>Tag("Python") == Tag("PYTHON")</code>, they deduplicate in a set, either can be used to look up a dict entry made with the other, and <code>sorted(tags)</code> orders them alphabetically ignoring case. <code>repr</code> keeps the original spelling. Comparing a Tag with a non-Tag must not crash for <code>==</code> (just False) and must raise <code>TypeError</code> for <code>&lt;</code>.</p>`,
      constraints: R`Up to 10<sup>5</sup> tags; names are non-empty Unicode strings (use <code>casefold()</code>, which handles "ß" → "ss").`,
      example: R`<p><code>tags = [Tag("python"), Tag("Go"), Tag("PYTHON"), Tag("rust"), Tag("go")]</code></p>
        <p><code>len(set(tags))</code> → ${H.c('g', '3')} · <code>sorted(set(tags))</code> → ${H.c('b', "[Tag('Go'), Tag('python'), Tag('rust')]")} (which spelling survives depends on which was inserted first) · <code>Tag("x") == "x"</code> → ${H.c('g', 'False')} · <code>Tag("x") &lt; "x"</code> → ${H.c('r', 'TypeError')}</p>`,
      brute: {
        why: R`<p>Keep plain strings and deduplicate with a nested loop comparing <code>.lower()</code> each time: O(n²) comparisons and repeated string allocation. It also cannot be used as a dict key directly, and every caller must remember to lower-case: the rule lives everywhere instead of in one class.</p>`,
        code: R`
          def dedupe_tags(names):
              out = []
              for n in names:                                  # O(n^2) overall
                  if not any(n.lower() == m.lower() for m in out):
                      out.append(n)
              return sorted(out, key=str.lower)

          print(dedupe_tags(["python", "Go", "PYTHON", "rust", "go"]))
        `
      },
      mcq: { q: 'You defined <code>__eq__</code> using <code>casefold()</code>. What must <code>__hash__</code> return?', options: ['<code>hash(self.name.casefold())</code>', '<code>hash(self.name)</code>', '<code>id(self)</code>', 'Nothing: Python derives it from <code>__eq__</code>'], answer: 0, explain: 'Equal tags ("Go" and "go") must hash equal, so hash exactly what equality compares: the casefolded name. <code>hash(self.name)</code> would give "Go" and "go" different hashes, breaking sets. Python does not derive hashes; it sets <code>__hash__ = None</code>.' },
      hints: [
        R`<p>Hint 1: Compute a single <b>normalised key</b> once in <code>__init__</code>: <code>self._key = name.casefold()</code>. Equality, hashing and ordering all use this key, so they can never disagree.</p>`,
        R`<p>Hint 2: <code>__eq__</code> and <code>__lt__</code> start with <code>if not isinstance(other, Tag): return NotImplemented</code>. Decorate the class with <code>@functools.total_ordering</code> so you only write <code>__lt__</code>.</p>`,
        R`<p>Hint 3: Make it immutable: store the fields in <code>__slots__</code> and expose <code>name</code> via a read-only property (or block <code>__setattr__</code>). Recipe: <code>__init__</code> (store name + key) → <code>__repr__</code> → <code>__eq__</code> → <code>__hash__</code> → <code>__lt__</code>.</p>`
      ],
      solution: {
        approach: R`<p>One normalised key (<code>casefold()</code>) drives <code>__eq__</code>, <code>__hash__</code> and <code>__lt__</code>, so the hash contract holds by construction. Returning <code>NotImplemented</code> gives the right behaviour for foreign types for free: <code>==</code> falls back to identity (False), <code>&lt;</code> raises <code>TypeError</code>. <code>__slots__</code> + a read-only property keep it immutable so the hash never changes.</p>`,
        code: { lang: 'python', run: true, code: R`
          from functools import total_ordering

          @total_ordering
          class Tag:
              __slots__ = ("_name", "_key")

              def __init__(self, name):
                  object.__setattr__(self, "_name", name)
                  object.__setattr__(self, "_key", name.casefold())   # one normalised key

              def __setattr__(self, attr, value):
                  raise AttributeError("Tag is immutable")

              @property
              def name(self):
                  return self._name

              def __repr__(self):
                  return f"Tag({self._name!r})"

              def __eq__(self, other):
                  if not isinstance(other, Tag):
                      return NotImplemented
                  return self._key == other._key

              def __hash__(self):
                  return hash(self._key)              # same data as __eq__

              def __lt__(self, other):
                  if not isinstance(other, Tag):
                      return NotImplemented
                  return self._key < other._key

          tags = [Tag("python"), Tag("Go"), Tag("PYTHON"), Tag("rust"), Tag("go")]
          uniq = set(tags)
          print(len(uniq), sorted(uniq, key=lambda t: t._key) == sorted(uniq))
          print(sorted(uniq))
          print({Tag("Straße"): 1}[Tag("STRASSE")])   # casefold: ß -> ss
          print(Tag("x") == "x")
          try:
              Tag("x") < "x"
          except TypeError as e:
              print("TypeError:", e)
        ` },
        dry: { head: ['operation', 'method(s) run', 'keys compared', 'result'], rows: [
          ['Tag("python") == Tag("PYTHON")', '__eq__', "'python' == 'python'", 'True'],
          ['set(tags)', '__hash__ then __eq__ on equal hashes', "hash('go') for Go and go", '3 tags'],
          ['Tag("Go") &lt; Tag("python")', '__lt__', "'go' &lt; 'python'", 'True'],
          ['Tag("x") &lt;= Tag("y")', 'total_ordering: __lt__ or __eq__', "'x' &lt; 'y'", 'True'],
          ['Tag("x") == "x"', '__eq__ → NotImplemented; str.__eq__ → NotImplemented', 'identity fallback', 'False'],
          ['Tag("x") &lt; "x"', '__lt__ → NotImplemented; str.__gt__ → NotImplemented', '—', 'TypeError']
        ] },
        complexity: R`<p>Construction O(L) for a name of length L (casefold once). Each <code>==</code>/<code>hash</code>/<code>&lt;</code> is O(L) (string hashes are cached by CPython after the first call). Deduplicating n tags: O(n·L) average; sorting O(n log n · L).</p>`,
        followUps: ['Rewrite it as <code>@dataclass(frozen=True, order=True)</code> with a hidden <code>field(compare=True)</code> key: what is generated?', 'Should <code>Tag("x") == "x"</code> be True? Discuss symmetry and hashing consequences', 'How would Unicode normalisation (NFC vs NFD) affect equality?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3: Operator Overloading — __add__, __radd__, __iadd__, NotImplemented dispatch
     ====================================================================== */
  var OPS_CODE = [
    'class Vector:',
    '    def __init__(self, x, y): self.x, self.y = x, y',
    '    def __add__(self, o):',
    '        if isinstance(o, Vector): return Vector(self.x + o.x, self.y + o.y)',
    '        return NotImplemented',
    '    def __radd__(self, o):',
    '        if o == 0: return self              # lets sum() start from 0',
    '        return NotImplemented',
    '    def __mul__(self, k):',
    '        if isinstance(k, int): return Vector(self.x * k, self.y * k)',
    '        return NotImplemented',
    '    __rmul__ = __mul__                      # 3 * v works like v * 3',
    '',
    'class Vector3(Vector):                      # a subclass',
    '    def __radd__(self, o):',
    '        if isinstance(o, Vector): return Vector3(self.x + o.x, self.y + o.y)',
    '        return super().__radd__(o)'
  ].join('\n');

  function opsDispatch(input) {
    var m = /^\s*(\S+)\s*(\+=|\+|\*)\s*(\S+)\s*$/.exec(String(input));
    if (!m) throw new Error('Format: LEFT OP RIGHT, e.g. "V + W", "3 * V", "V += V", "\'ab\' * 3" (OP is +, * or +=)');
    function parse(t) {
      if (t === 'V') return { t: 'Vector', v: [1, 2], name: 'V' };
      if (t === 'W') return { t: 'Vector3', v: [3, 4], name: 'W' };
      if (/^-?\d{1,3}$/.test(t)) return { t: 'int', n: parseInt(t, 10), name: t };
      var q = /^'([a-z]{1,6})'$/.exec(t) || /^"([a-z]{1,6})"$/.exec(t);
      if (q) return { t: 'str', s: q[1], name: "'" + q[1] + "'" };
      throw new Error('Operand "' + t + '" not understood. Use V, W, an int like 3, or a short string like \'ab\'');
    }
    var L = parse(m[1]), op = m[2], Rr = parse(m[3]);
    return { L: L, op: op, R: Rr };
  }
  function opsRepr(o) {
    if (o.t === 'Vector' || o.t === 'Vector3') return o.t + '(' + o.v[0] + ', ' + o.v[1] + ')';
    if (o.t === 'int') return String(o.n);
    return "'" + o.s + "'";
  }

  topics.push({
    title: 'Operator Overloading: How a + b Is Really Dispatched',
    analogy: R`<p>Two people meet and need to agree on a handshake. The person on the <b>left</b> is asked first: "do you know how to greet this person?" If they say <b>"no idea"</b> (not "no!"), the person on the <b>right</b> gets a turn: "then do <i>you</i> know how to greet them?" Only if both shrug does the meeting fail (<code>TypeError</code>). And there is a courtesy rule: if the person on the right is a <b>more specialised version</b> of the left (a subclass) with their own special greeting, they get to go first.</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> Every operator is just a method call with a special name. <code>a + b</code> → <code>a.__add__(b)</code>; <code>a * b</code> → <code>a.__mul__(b)</code>; <code>-a</code> → <code>a.__neg__()</code>; <code>a @ b</code> → <code>a.__matmul__(b)</code>. Define those methods and your objects work with real operators, like <code>Vector(1, 2) + Vector(3, 4)</code> or <code>Money(5) * 3</code>.</p>
      ${H.table(['Operator', 'Normal', 'Reflected (right side)', 'In-place'], [
        ['<code>+</code>', '__add__', '__radd__', '__iadd__ (<code>+=</code>)'],
        ['<code>-</code>', '__sub__', '__rsub__', '__isub__'],
        ['<code>*</code>', '__mul__', '__rmul__', '__imul__'],
        ['<code>/</code> <code>//</code> <code>%</code> <code>**</code>', '__truediv__ __floordiv__ __mod__ __pow__', '__rtruediv__ …', '__itruediv__ …'],
        ['<code>@</code>', '__matmul__', '__rmatmul__', '__imatmul__'],
        ['<code>&amp;</code> <code>|</code> <code>^</code> <code>&lt;&lt;</code> <code>&gt;&gt;</code>', '__and__ __or__ __xor__ __lshift__ __rshift__', '__rand__ …', '__iand__ …'],
        ['unary <code>-x</code> <code>+x</code> <code>~x</code> <code>abs(x)</code>', '__neg__ __pos__ __invert__ __abs__', '—', '—']
      ])}
      <p>🔵 <b>The dispatch recipe for <code>a + b</code></b> (learn this, interviewers love it):</p>
      <ol>
        <li><b>Subclass first:</b> if <code>type(b)</code> is a subclass of <code>type(a)</code> and <b>overrides</b> <code>__radd__</code>, call <code>b.__radd__(a)</code> first.</li>
        <li>Otherwise call <code>a.__add__(b)</code>. A real result? Done.</li>
        <li>If it returned <code>NotImplemented</code> (or <code>a</code> has no <code>__add__</code>) <b>and the types differ</b>, call <code>b.__radd__(a)</code>.</li>
        <li>Everyone said <code>NotImplemented</code> → <code>TypeError: unsupported operand type(s) for +: 'A' and 'B'</code>.</li>
      </ol>
      <p>Two things trip people up. <b>(1) Return <code>NotImplemented</code>, never raise <code>TypeError</code> yourself</b>, when you do not understand the other operand; raising slams the door before the right operand gets its turn. <b>(2) <code>__radd__</code> is never tried when both operands are the same type</b>: <code>Vector * Vector</code> with only <code>__mul__(int)</code> fails without asking <code>__rmul__</code>.</p>
      <p><b>In-place operators:</b> <code>a += b</code> tries <code>a.__iadd__(b)</code> first (which should mutate <code>self</code> and return <code>self</code>). If there is no <code>__iadd__</code>, Python quietly does <code>a = a + b</code>, building a <b>new</b> object and rebinding the name. That is why <code>+=</code> mutates a list (lists have <code>__iadd__</code>) but makes a new tuple or string.</p>
      <p><b>Why <code>__radd__</code> matters in practice:</b> <code>sum(vectors)</code> starts with <code>0 + v1</code>. <code>int.__add__</code> does not know Vectors, so Python asks <code>v1.__radd__(0)</code>. Handle 0 there (or call <code>sum(vectors, Vector(0, 0))</code>) and <code>sum</code> just works.</p>`,
    clues: [
      '"make <code>sum()</code> work on my objects" → <code>__radd__</code> that accepts 0 (or pass a <code>start</code> value)',
      '"<code>3 * vector</code> fails but <code>vector * 3</code> works" → add <code>__rmul__</code>',
      '"Money / Vector / Matrix / Fraction / Polynomial class" in an LLD or OOP round → operator overloading on an immutable value object',
      '"design so other libraries can interoperate with my type" → return <code>NotImplemented</code>, do not raise',
      '"why does <code>+=</code> change my list in place but not my tuple?" → <code>__iadd__</code> vs fallback to <code>__add__</code>',
      '"<code>a @ b</code>", "matrix multiply operator" → <code>__matmul__</code> (PEP 465)'
    ],
    code: [{ lang: 'python', run: true, title: 'A complete immutable Vector', code: R`
      import math

      class Vector:
          __slots__ = ("x", "y")

          def __init__(self, x, y):
              self.x, self.y = x, y

          def __repr__(self):
              return f"Vector({self.x!r}, {self.y!r})"

          # --- arithmetic: always return a NEW object, never mutate self ---
          def __add__(self, other):
              if not isinstance(other, Vector):
                  return NotImplemented              # let the other operand try
              return Vector(self.x + other.x, self.y + other.y)

          def __radd__(self, other):
              if other == 0:                         # sum() starts from 0
                  return self
              return NotImplemented

          def __sub__(self, other):
              if not isinstance(other, Vector):
                  return NotImplemented
              return Vector(self.x - other.x, self.y - other.y)

          def __mul__(self, k):                      # vector * scalar
              if not isinstance(k, (int, float)):
                  return NotImplemented
              return Vector(self.x * k, self.y * k)

          __rmul__ = __mul__                         # scalar * vector (commutative)

          def __matmul__(self, other):               # v @ w = dot product
              if not isinstance(other, Vector):
                  return NotImplemented
              return self.x * other.x + self.y * other.y

          def __neg__(self):                         # -v
              return Vector(-self.x, -self.y)

          def __abs__(self):                         # abs(v) = length
              return math.hypot(self.x, self.y)

          def __eq__(self, other):
              if not isinstance(other, Vector):
                  return NotImplemented
              return (self.x, self.y) == (other.x, other.y)

          def __hash__(self):
              return hash((self.x, self.y))

      v, w = Vector(3, 4), Vector(1, 1)
      print(v + w, v - w, v * 2, 2 * v, -v)
      print(v @ w, abs(v))
      print(sum([v, w, Vector(0, 5)]))          # works thanks to __radd__(0)
      try:
          v + 5
      except TypeError as e:
          print("TypeError:", e)
    ` }, { lang: 'python', run: true, title: '+= : __iadd__ mutates, fallback rebinds', code: R`
      a = [1, 2]
      alias = a
      a += [3]                 # list.__iadd__ -> extends in place, returns self
      print(a, alias, a is alias)          # [1, 2, 3] [1, 2, 3] True

      t = (1, 2)
      alias_t = t
      t += (3,)                # tuple has no __iadd__ -> t = t + (3,) builds a new tuple
      print(t, alias_t, t is alias_t)      # (1, 2, 3) (1, 2) False

      # The famous puzzle: the list IS mutated, then the tuple item assignment fails
      box = ([1],)
      try:
          box[0] += [2]        # step 1: list.__iadd__ mutates; step 2: box[0] = result -> TypeError
      except TypeError as e:
          print("TypeError:", e)
      print(box)               # ([1, 2],)  <- mutated anyway!
    ` }],
    codeTitle: ['Vector with +, -, *, @, unary ops and sum() support (runnable)', 'In-place operators and the tuple puzzle (runnable)'],
    viz: {
      title: 'Dispatch of a + b / a * b / a += b, box by box',
      input: 'V + W',
      inputLabel: 'Expression: V = Vector(1, 2), W = Vector3(3, 4) (subclass), ints, \'ab\'. Try: V + W, 0 + V, 3 * V, V * V, V + 5, \'ab\' * 3, V += V',
      gen: function (input) {
        var d = opsDispatch(input === undefined ? 'V + W' : input), L = d.L, Rt = d.R, op = d.op;
        var inplace = op === '+=', bop = inplace ? '+' : op, nm = bop === '+' ? 'add' : 'mul';
        var isVec = function (o) { return o.t === 'Vector' || o.t === 'Vector3'; };
        // method lookup: returns {label, lines, fn} or null
        function method(o, which) {
          if (o.t === 'str') return null;    // str's + and * live in sequence slots, tried last
          if (o.t === 'int') return { label: 'int.__' + which + '__', lines: [], fn: function (self, other) {
            if (other.t !== 'int') return 'NI';
            return { t: 'int', n: nm === 'add' ? self.n + other.n : self.n * other.n };
          } };
          if (which === 'add') return { label: 'Vector.__add__', lines: [3, 4, 5], fn: function (self, other) {
            return isVec(other) ? { t: 'Vector', v: [self.v[0] + other.v[0], self.v[1] + other.v[1]] } : 'NI';
          } };
          if (which === 'radd' && o.t === 'Vector3') return { label: 'Vector3.__radd__', lines: [15, 16, 17], fn: function (self, other) {
            if (isVec(other)) return { t: 'Vector3', v: [self.v[0] + other.v[0], self.v[1] + other.v[1]] };
            return other.t === 'int' && other.n === 0 ? { same: self } : 'NI';   // super().__radd__
          } };
          if (which === 'radd') return { label: 'Vector.__radd__', lines: [6, 7, 8], fn: function (self, other) {
            return other.t === 'int' && other.n === 0 ? { same: self } : 'NI';
          } };
          return { label: which === 'mul' ? 'Vector.__mul__' : 'Vector.__rmul__', lines: [9, 10, 11, 12], fn: function (self, other) {
            return other.t === 'int' ? { t: 'Vector', v: [self.v[0] * other.n, self.v[1] * other.n] } : 'NI';
          } };
        }
        var lm = method(L, nm), rm = method(Rt, 'r' + nm);
        var same = L.t === Rt.t;
        var subFirst = !same && Rt.t === 'Vector3' && L.t === 'Vector' && nm === 'add';
        var expr = L.name + ' ' + op + ' ' + Rt.name;
        var nodes = [
          { id: 'E', label: expr, shape: 'box', x: 10, y: 30 },
          { id: 'LM', label: lm ? lm.label : L.t + ' (no __' + nm + '__ slot)', shape: 'box', x: 40, y: 30 },
          { id: 'RM', label: rm ? rm.label : Rt.t + ' (no __r' + nm + '__)', shape: 'box', x: 40, y: 54 },
          { id: 'OK', label: 'result', shape: 'box', x: 84, y: 20 },
          { id: 'ERR', label: 'TypeError', shape: 'box', x: 84, y: 44 }
        ];
        if (inplace) nodes.push({ id: 'I', label: L.t + '.__iadd__?', shape: 'box', x: 34, y: 7 });
        if (L.t === 'str' || Rt.t === 'str') nodes.push({ id: 'SEQ', label: 'str concat/repeat', shape: 'box', x: 64, y: 7 });
        var edges = [], frames = [], tags = {};
        function G(hl, ehl) {
          return { type: 'graph', label: 'Dispatch path (edges appear as Python walks them)', directed: true, height: 64, nodes: nodes, edges: edges.slice(), hl: hl, ehl: ehl || {}, tags: JSON.parse(JSON.stringify(tags)) };
        }
        function code(lines, cls) { var h = {}; (lines || []).forEach(function (l) { h[l] = cls || 'cur'; }); return { type: 'code', label: 'The classes', lang: 'python', code: OPS_CODE, hl: h }; }
        var varsPart = { type: 'vars', label: 'operands', vals: { 'left': opsRepr(L) + '  (' + L.t + ')', 'right': opsRepr(Rt) + '  (' + Rt.t + ')' } };
        frames.push({ narr: 'Evaluate <code>' + esc(expr) + '</code>. Left is a <b>' + L.t + '</b>, right is a <b>' + Rt.t + '</b>. ' + (inplace ? 'Because it is <code>+=</code>, Python first looks for an in-place method.' : 'Python will now decide <b>who gets asked first</b>.'), parts: [G({ E: 'cur' }), varsPart, code([])] });
        var prev = 'E';
        if (inplace) {
          edges.push(['E', 'I']); tags.I = 'not defined';
          frames.push({ narr: '<code>+=</code> first tries <code>' + L.t + '.__iadd__</code>. ' + L.t + ' has <b>no</b> <code>__iadd__</code> (it is meant to be immutable), so Python falls back to the plain binary operator: <code>a = a + b</code>. The result will be a <b>new</b> object bound to the name.', parts: [G({ I: 'bad' }, { 'E-I': 'cur' }), varsPart, code([])] });
          prev = 'I';
        }
        var order = [];
        if (subFirst) order = [['RM', rm, Rt, L], ['LM', lm, L, Rt]];
        else { order = [['LM', lm, L, Rt]]; if (!same) order.push(['RM', rm, Rt, L]); }
        var result = null;
        for (var k = 0; k < order.length; k++) {
          var o = order[k], id = o[0], mt = o[1], self = o[2], other = o[3];
          edges.push([prev, id, k === 0 ? (subFirst ? 'subclass first' : '') : 'NotImplemented']);
          var ek = {}; ek[prev + '-' + id] = 'cur';
          var hl = {}; hl[id] = 'cur';
          if (subFirst && k === 0) {
            frames.push({ narr: '<b>Subclass rule!</b> The right operand is a <code>Vector3</code>, a subclass of the left operand\'s class, and it <b>overrides</b> <code>__radd__</code>. Python assumes the more specialised class knows better, so it asks <code>W.__radd__(V)</code> <b>before</b> <code>V.__add__(W)</code>.', parts: [G(hl, ek), varsPart, code(mt.lines)] });
          }
          if (!mt) {
            tags[id] = 'missing';
            hl[id] = 'bad';
            frames.push({ narr: '<code>' + self.t + '</code> has no ' + (id === 'LM' ? '<code>__' + nm + '__</code>' : '<code>__r' + nm + '__</code>') + ' that Python can try at this stage' + (self.t === 'str' ? ' (str implements + and * through its <b>sequence</b> concat/repeat slots, which CPython tries <b>last</b>)' : '') + '. Skip to the next option.', parts: [G(hl, ek), varsPart, code([])] });
            prev = id; continue;
          }
          var r = mt.fn(self, other);
          if (r === 'NI') {
            tags[id] = 'NotImplemented';
            hl[id] = 'bad';
            frames.push({ narr: 'Call <code>' + mt.label + '(' + esc(opsRepr(self)) + ', ' + esc(opsRepr(other)) + ')</code> → it does not understand a ' + other.t + ' here, so it returns <b>NotImplemented</b> ("ask someone else"), not an error.' + (k === order.length - 1 && same ? '' : ''), parts: [G(hl, ek), varsPart, code(mt.lines, 'bad')] });
            prev = id; continue;
          }
          result = r.same ? self : r;
          tags[id] = r.same ? 'returns self' : 'returns value';
          hl[id] = 'ok';
          frames.push({ narr: 'Call <code>' + mt.label + '(' + esc(opsRepr(self)) + ', ' + esc(opsRepr(other)) + ')</code> → returns <b>' + esc(opsRepr(result)) + '</b>' + (r.same ? ' (the same object, unchanged: this is the <code>0 + v</code> case that makes <code>sum()</code> work)' : '') + '.', parts: [G(hl, ek), varsPart, code(mt.lines, 'ok')] });
          prev = id;
          break;
        }
        if (!result && same && !subFirst) {
          frames.push({ narr: 'Both operands are the <b>same type</b> (' + L.t + '), so Python does <b>not</b> try <code>__r' + nm + '__</code>: it would just be the same class asked the same question again.', parts: [G({ RM: 'done', LM: 'bad' }), varsPart, code([])] });
        }
        var err = null;
        if (!result && (L.t === 'str' || Rt.t === 'str')) {
          edges.push([prev, 'SEQ', 'last resort']);
          var sk = {}; sk[prev + '-SEQ'] = 'cur';
          if (bop === '+') {
            if (L.t === 'str' && Rt.t === 'str') result = { t: 'str', s: L.s + Rt.s };
            else if (L.t === 'str') err = 'can only concatenate str (not "' + Rt.t + '") to str';
            else err = 'unsupported operand type(s) for ' + op + ": '" + L.t + "' and '" + Rt.t + "'";
          } else {
            if (L.t === 'str' && Rt.t === 'int') result = { t: 'str', s: new Array(Math.max(0, Math.min(Rt.n, 20)) + 1).join(L.s) };
            else if (Rt.t === 'str' && L.t === 'int') result = { t: 'str', s: new Array(Math.max(0, Math.min(L.n, 20)) + 1).join(Rt.s) };
            else err = "can't multiply sequence by non-int of type '" + (L.t === 'str' ? Rt.t : L.t) + "'";
          }
          frames.push({ narr: 'All numeric methods gave up, but a <b>str</b> is involved, so CPython tries the sequence operation (concatenate for +, repeat for *). ' + (result ? 'It works → <b>' + esc(opsRepr(result)) + '</b>.' : 'It cannot apply here → error.'), parts: [G({ SEQ: result ? 'ok' : 'bad' }, sk), varsPart] });
          prev = 'SEQ';
        } else if (!result) {
          err = 'unsupported operand type(s) for ' + op + ": '" + L.t + "' and '" + Rt.t + "'";
        }
        if (result) {
          edges.push([prev, 'OK']);
          var okk = {}; okk[prev + '-OK'] = 'ok';
          nodes[3].label = opsRepr(result);
          frames.push({ narr: '<span class="c-g">Result: <code>' + esc(opsRepr(result)) + '</code></span> (type ' + result.t + ').' + (inplace ? ' Because there was no <code>__iadd__</code>, the name on the left is <b>rebound</b> to this new object; any other variable that pointed at the old object still sees the old value.' : ''), parts: [G({ OK: 'sel' }, okk), varsPart] });
        } else {
          edges.push([prev, 'ERR']);
          var ekk = {}; ekk[prev + '-ERR'] = 'bad';
          frames.push({ narr: '<span class="c-r">Every option returned NotImplemented.</span> Python raises <code>TypeError: ' + esc(err) + '</code>. Note it is Python, not your class, that raises: your methods only said "not me".', parts: [G({ ERR: 'bad' }, ekk), varsPart, { type: 'text', label: 'Traceback', html: '<pre>TypeError: ' + esc(err) + '</pre>' }] });
        }
        frames.push({ narr: 'Recap of the rule: <b>subclass-with-override first</b> → <b>left.__op__</b> → (types differ) <b>right.__rop__</b> → (str/list) sequence fallback → <b>TypeError</b>. Try other inputs: <code>0 + V</code>, <code>3 + V</code>, <code>V * V</code>, <code>V * W</code>, <code>3 * \'ab\'</code>, <code>V += W</code>.', parts: [{ type: 'table', label: 'What happened', columns: ['step', 'detail'], rows: [['expression', expr], ['left type', L.t], ['right type', Rt.t], ['subclass rule used?', subFirst ? 'yes' : 'no'], ['outcome', result ? opsRepr(result) : 'TypeError']], hl: { 4: result ? 'ok' : 'bad' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Predict the output: same-type operands never try __rmul__', html: R`<p><code>Vector * Vector</code> → <code>Vector.__mul__</code> returns NotImplemented; both operands have the same type, so Python does <b>not</b> ask <code>__rmul__</code> and raises immediately. Meanwhile <code>3 * v</code> works through <code>__rmul__</code> because int and Vector differ. Output: <code>Vector(3, 6)</code> then the TypeError message.</p>`, code: { lang: 'python', run: true, code: R`
        class Vector:
            def __init__(self, x, y): self.x, self.y = x, y
            def __repr__(self): return f"Vector({self.x}, {self.y})"
            def __mul__(self, k):
                print("  __mul__ called with", type(k).__name__)
                if isinstance(k, int):
                    return Vector(self.x * k, self.y * k)
                return NotImplemented
            def __rmul__(self, k):
                print("  __rmul__ called with", type(k).__name__)
                return self.__mul__(k)

        v = Vector(1, 2)
        print(3 * v)
        try:
            v * v
        except TypeError as e:
            print("TypeError:", e)
      ` } },
      { title: 'Raising TypeError yourself blocks interoperability', html: R`<p>A <code>Celsius</code> class raises <code>TypeError</code> on unknown types; a <code>Delta</code> class (written later, by another team) knows how to add itself to Celsius from the right. Because <code>Celsius.__add__</code> raises instead of returning <code>NotImplemented</code>, <code>Delta.__radd__</code> never runs. Swap the raise for <code>return NotImplemented</code> and it works.</p>`, code: { lang: 'python', run: true, code: R`
        class Celsius:
            def __init__(self, t): self.t = t
            def __repr__(self): return f"Celsius({self.t})"
            def __add__(self, o):
                if not isinstance(o, Celsius):
                    raise TypeError("can only add Celsius")    # BAD: should be NotImplemented
                return Celsius(self.t + o.t)

        class Delta:
            def __init__(self, d): self.d = d
            def __radd__(self, o):
                if isinstance(o, Celsius):
                    return Celsius(o.t + self.d)
                return NotImplemented

        try:
            print(Celsius(20) + Delta(5))
        except TypeError as e:
            print("blocked:", e)

        Celsius.__add__ = lambda self, o: Celsius(self.t + o.t) if isinstance(o, Celsius) else NotImplemented
        print(Celsius(20) + Delta(5))     # Celsius(25): Delta.__radd__ finally got its turn
      ` } },
      { title: 'Fraction-style value object with __truediv__, __pow__ and __bool__', html: R`<p>A tiny <code>Ratio</code>: normalise in <code>__init__</code> (so equality and hashing are simple), return new objects from every operator, and define <code>__bool__</code> so zero is falsy. <code>__rtruediv__</code> handles <code>1 / Ratio(2, 3)</code>.</p>`, code: { lang: 'python', run: true, code: R`
        from math import gcd

        class Ratio:
            def __init__(self, num, den=1):
                if den == 0:
                    raise ZeroDivisionError("denominator is zero")
                g = gcd(num, den) * (1 if den > 0 else -1)   # keep the sign on the numerator
                self.num, self.den = num // g, den // g

            def __repr__(self): return f"Ratio({self.num}, {self.den})"

            @staticmethod
            def _coerce(x):
                if isinstance(x, Ratio): return x
                if isinstance(x, int): return Ratio(x)
                return None

            def __mul__(self, o):
                o = self._coerce(o)
                return NotImplemented if o is None else Ratio(self.num * o.num, self.den * o.den)
            __rmul__ = __mul__

            def __truediv__(self, o):
                o = self._coerce(o)
                return NotImplemented if o is None else Ratio(self.num * o.den, self.den * o.num)

            def __rtruediv__(self, o):            # o / self, where o is not a Ratio
                o = self._coerce(o)
                return NotImplemented if o is None else o / self

            def __pow__(self, n):
                return Ratio(self.num ** n, self.den ** n) if n >= 0 else Ratio(self.den ** -n, self.num ** -n)

            def __eq__(self, o):
                o = self._coerce(o)
                return NotImplemented if o is None else (self.num, self.den) == (o.num, o.den)

            def __hash__(self): return hash((self.num, self.den))
            def __bool__(self): return self.num != 0

        a = Ratio(2, 4)
        print(a, a * 3, 1 / Ratio(2, 3), a ** -2, a == Ratio(1, 2), bool(Ratio(0, 5)))
      ` } },
      { title: 'What you cannot overload', html: R`<p><code>and</code>, <code>or</code>, <code>not</code>, <code>is</code>, <code>is not</code>, assignment <code>=</code> and the ternary <code>x if c else y</code> are <b>not</b> overloadable: they are control flow or identity, not method calls. <code>and</code>/<code>or</code> only ask your object for <code>__bool__</code>. Libraries like NumPy and pandas therefore overload <code>&amp;</code>, <code>|</code>, <code>~</code> for element-wise logic, which is why <code>df[(df.a &gt; 1) &amp; (df.b &lt; 5)]</code> needs those parentheses (<code>&amp;</code> binds tighter than <code>&gt;</code>).</p>`, code: { lang: 'python', run: true, code: R`
        class Flag:
            def __init__(self, on): self.on = on
            def __bool__(self):
                print("  __bool__ asked")
                return self.on
            def __and__(self, other):              # the & operator IS overloadable
                return Flag(self.on and other.on)
            def __repr__(self): return f"Flag({self.on})"

        x, y = Flag(True), Flag(False)
        print(x and y)       # 'and' only calls __bool__ on x, then returns y itself
        print(x & y)         # __and__ builds a new Flag
      ` } }
    ],
    deepDive: R`<p>🟣 <b>Where the rules live in CPython.</b> Python classes get generic C slot functions (<code>slot_nb_add</code> etc.). For <code>a + b</code>, <code>binary_op1()</code> fetches <code>nb_add</code> from both types; if the right type is a subtype that <b>overrides</b> the reflected method (<code>method_is_overloaded</code>), it is called first; same-type operands skip the reflected call. Only after numeric slots fail does <code>PyNumber_Add</code> try the <b>sequence</b> slot <code>sq_concat</code> (and <code>*</code> tries <code>sq_repeat</code>). That is why <code>'ab' + v</code> gives Vector's <code>__radd__</code> a chance before raising <i>"can only concatenate str"</i>, and why <code>[1] * 3</code> works without a numeric <code>__mul__</code> on list.</p>
      <p><b>In-place semantics.</b> <code>x += y</code> compiles to <code>BINARY_OP (+=)</code> followed by a <b>store</b> back into the target. The store always happens, which explains the tuple puzzle: <code>t[0] += [2]</code> runs <code>list.__iadd__</code> (mutation succeeds) and then <code>t[0] = result</code> (tuple item assignment fails). If <code>__iadd__</code> returns <code>NotImplemented</code>, Python falls back to <code>__add__</code>/<code>__radd__</code>. For mutable types, <code>__iadd__</code> must <code>return self</code>; forgetting the return binds the name to <code>None</code>, a classic bug.</p>
      <p><b>Design rules for production value types:</b> keep them immutable (operators return new objects, so hashing stays valid); coerce friendly types in one helper (<code>_coerce</code>) and return <code>NotImplemented</code> otherwise; be careful with <code>bool</code> (it is a subclass of <code>int</code>, so <code>Vector * True</code> works unless you exclude it); avoid float drift in money (use <code>int</code> cents or <code>decimal.Decimal</code>). Keep the meaning unsurprising: <code>+</code> on a path type (<code>pathlib</code> uses <code>/</code>) or a set-like (<code>|</code>, <code>&amp;</code>) should mirror built-ins. <code>__pow__</code> has an optional third argument for <code>pow(a, b, mod)</code>. Comparisons are also operators (topic 2) and <code>__contains__</code> powers <code>in</code> (topic 1). Rich arithmetic in the standard library to study: <code>fractions.Fraction</code> (its <code>_operator_fallbacks</code> helper is the canonical pattern), <code>decimal.Decimal</code>, <code>datetime.timedelta</code>.</p>`,
    aiEra: R`<p>🤖 <b>What AI changes:</b> generating twenty operator methods is now free, so code reviewers see more "kitchen-sink" value classes. Your value is judging <b>which operators make semantic sense</b> and verifying the dispatch rules hold.</p>
      <p><b>Prompts that help:</b> <code>For this Money class, produce a table of every operand type combination (Money, int, float, Decimal, str, subclass) for + and *, and the expected result or TypeError. Then write pytest parametrized tests for that table.</code> Making the model enumerate the matrix exposes missing <code>__radd__</code>, same-type <code>__rmul__</code> assumptions and accidental <code>bool</code> support.</p>
      <p><b>Where AI goes wrong:</b> raises <code>TypeError</code> inside <code>__add__</code> instead of returning <code>NotImplemented</code>; mutates <code>self</code> in <code>__add__</code> (then <code>a + b</code> silently changes <code>a</code>); writes <code>__iadd__</code> without <code>return self</code>; uses floats for money; forgets <code>__radd__</code> so <code>sum()</code> breaks; or claims <code>and</code>/<code>or</code> can be overloaded. <b>What you must own:</b> the dispatch recipe (subclass-first, reflected only for different types, NotImplemented vs raise) and the immutability argument, both of which come up verbatim in senior Python interviews.</p>`,
    problems: [{
      title: 'Money with +, *, sum() and currency safety',
      level: 'Medium', tags: ['operator overloading', '__radd__', 'NotImplemented', 'value object'], companies: ['Stripe', 'PayPal', 'Goldman Sachs', 'Revolut'],
      statement: R`<p>Implement an immutable <code>Money(amount, currency)</code> where <code>amount</code> is a <code>decimal.Decimal</code> (accept int/str input). Support: <code>m1 + m2</code> (same currency, else <code>ValueError</code>), <code>m * k</code> and <code>k * m</code> for int/Decimal <code>k</code>, <code>sum(list_of_money)</code>, <code>-m</code>, equality/hash, and a repr like <code>Money('12.50', 'USD')</code>. <code>Money + 5</code> and <code>Money * Money</code> must raise <code>TypeError</code> (produced by Python, via <code>NotImplemented</code>).</p>`,
      constraints: R`Amounts up to 10<sup>12</sup>, two decimal places; never use float (0.1 + 0.2 ≠ 0.3).`,
      example: R`<p><code>sum([Money("10.10", "USD"), Money("0.20", "USD")])</code> → ${H.c('g', "Money('10.30', 'USD')")}<br><code>3 * Money("1.50", "EUR")</code> → ${H.c('g', "Money('4.50', 'EUR')")}<br><code>Money(1, "USD") + Money(1, "EUR")</code> → ${H.c('r', 'ValueError')} (currency mismatch is a domain error)<br><code>Money(1, "USD") + 5</code> → ${H.c('r', "TypeError: unsupported operand type(s) for +: 'Money' and 'int'")}</p>`,
      brute: {
        why: R`<p>Plain floats in a dict: <code>{"amount": 10.1, "currency": "USD"}</code>. Totals drift (<code>10.1 + 0.2 = 10.299999…</code>), currency checks are scattered in every caller, <code>sum()</code> and <code>*</code> are impossible, and nothing stops someone adding USD to EUR.</p>`,
        code: R`
          def add_money(a, b):
              if a["currency"] != b["currency"]:
                  raise ValueError("currency mismatch")
              return {"amount": a["amount"] + b["amount"], "currency": a["currency"]}

          total = {"amount": 0.0, "currency": "USD"}
          for m in [{"amount": 10.1, "currency": "USD"}, {"amount": 0.2, "currency": "USD"}]:
              total = add_money(total, m)
          print(total)          # amount 10.299999999999999 -> float drift
        `
      },
      mcq: { q: '<code>sum([m1, m2])</code> raises <code>TypeError: unsupported operand type(s) for +: \'int\' and \'Money\'</code>. What is the minimal fix?', options: ['Add <code>__radd__</code> that returns <code>self</code> when the other operand is 0', 'Add <code>__iadd__</code>', 'Make Money subclass Decimal', 'Catch the TypeError inside <code>__add__</code>'], answer: 0, explain: '<code>sum</code> computes <code>0 + m1</code> first. <code>int.__add__(m1)</code> is NotImplemented, so Python calls <code>m1.__radd__(0)</code>. Returning <code>self</code> for 0 fixes it (or call <code>sum(ms, Money(0, "USD"))</code>).' },
      hints: [
        R`<p>Hint 1: Convert once in <code>__init__</code>: <code>Decimal(str(amount)).quantize(Decimal("0.01"))</code>. Store fields and never change them afterwards (use <code>__slots__</code> and a frozen-style <code>__setattr__</code>, or a frozen dataclass).</p>`,
        R`<p>Hint 2: <code>__add__</code>: <code>if not isinstance(other, Money): return NotImplemented</code>; then check currencies (<code>ValueError</code> is fine here: types are right, values are wrong). <code>__radd__</code>: accept the int 0 for <code>sum()</code>. <code>__mul__</code>: accept <code>int</code>/<code>Decimal</code> but reject <code>bool</code> and <code>Money</code>; <code>__rmul__ = __mul__</code>.</p>`,
        R`<p>Hint 3: Hash and equality on <code>(amount, currency)</code>. Edge cases: <code>Money("1.0")</code> equals <code>Money("1.00")</code> after quantize; <code>-m</code> via <code>__neg__</code>; <code>True * m</code> should be a TypeError. Recipe: init → repr → eq/hash → add/radd → mul/rmul → neg.</p>`
      ],
      solution: {
        approach: R`<p>An immutable value object. All operators return new <code>Money</code>; foreign types get <code>NotImplemented</code> so Python produces the standard <code>TypeError</code> and other types can still interoperate; same-type-but-wrong-currency raises <code>ValueError</code> (a domain error). <code>__radd__</code> handles the <code>0</code> that <code>sum()</code> starts with.</p>`,
        code: { lang: 'python', run: true, code: R`
          from decimal import Decimal

          CENT = Decimal("0.01")

          class Money:
              __slots__ = ("amount", "currency")

              def __init__(self, amount, currency):
                  object.__setattr__(self, "amount", Decimal(str(amount)).quantize(CENT))
                  object.__setattr__(self, "currency", currency)

              def __setattr__(self, name, value):
                  raise AttributeError("Money is immutable")

              def __repr__(self):
                  return f"Money('{self.amount}', '{self.currency}')"

              def __eq__(self, other):
                  if not isinstance(other, Money):
                      return NotImplemented
                  return (self.amount, self.currency) == (other.amount, other.currency)

              def __hash__(self):
                  return hash((self.amount, self.currency))

              def __add__(self, other):
                  if not isinstance(other, Money):
                      return NotImplemented                 # Python will raise TypeError
                  if other.currency != self.currency:
                      raise ValueError(f"cannot add {self.currency} and {other.currency}")
                  return Money(self.amount + other.amount, self.currency)

              def __radd__(self, other):
                  if other == 0 and not isinstance(other, bool):
                      return self                           # sum() starts with 0
                  return NotImplemented

              def __mul__(self, k):
                  if isinstance(k, bool) or not isinstance(k, (int, Decimal)):
                      return NotImplemented
                  return Money(self.amount * k, self.currency)

              __rmul__ = __mul__

              def __neg__(self):
                  return Money(-self.amount, self.currency)

          print(sum([Money("10.10", "USD"), Money("0.20", "USD")]))
          print(3 * Money("1.50", "EUR"), -Money(2, "USD"))
          print(Money("1.0", "USD") == Money("1.00", "USD"), len({Money(1, "USD"), Money("1.00", "USD")}))
          for expr in ("Money(1, 'USD') + Money(1, 'EUR')", "Money(1, 'USD') + 5", "Money(1, 'USD') * Money(2, 'USD')", "True * Money(1, 'USD')"):
              try:
                  eval(expr)
              except (TypeError, ValueError) as e:
                  print(type(e).__name__ + ":", e)
        ` },
        dry: { head: ['expression', 'call sequence', 'result'], rows: [
          ['0 + Money(10.10)', 'int.__add__ → NotImplemented; Money.__radd__(0) → self', "Money('10.10', 'USD')"],
          ['Money(10.10) + Money(0.20)', 'Money.__add__ → same currency', "Money('10.30', 'USD')"],
          ['3 * Money(1.50)', 'int.__mul__ → NotImplemented; Money.__rmul__(3)', "Money('4.50', 'EUR')"],
          ['Money(1) + 5', 'Money.__add__ → NotImplemented; int.__radd__ → NotImplemented', 'TypeError (raised by Python)'],
          ['Money(USD) + Money(EUR)', 'Money.__add__ → currency check', 'ValueError (domain rule)'],
          ['Money * Money', 'Money.__mul__ → NotImplemented; same type → no __rmul__', 'TypeError']
        ] },
        complexity: R`<p>Every operation is O(1) (Decimal arithmetic on fixed-size amounts). <code>sum</code> of n values is O(n). Each object stores two slots, no <code>__dict__</code>.</p>`,
        followUps: ['Add <code>__truediv__</code> for splitting a bill into n parts without losing cents (allocate remainders)', 'Support currency conversion through an injected rate table: where should that logic live?', 'Rewrite with <code>@dataclass(frozen=True, slots=True)</code>: what do you still write by hand?']
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
