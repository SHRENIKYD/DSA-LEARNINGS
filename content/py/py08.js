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
        var seqOK = (bop === '+' && L.t === 'str') || (bop === '*' && (L.t === 'str' || Rt.t === 'str'));
        if (seqOK) nodes.push({ id: 'SEQ', label: 'str concat/repeat', shape: 'box', x: 64, y: 7 });
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
        if (!result && seqOK) {
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
          frames.push({ narr: 'All numeric methods gave up, but a <b>str</b> is involved, so CPython tries the sequence operation as a last resort (concatenate for + when the str is on the left; repeat for * on either side). ' + (result ? 'It works → <b>' + esc(opsRepr(result)) + '</b>.' : 'It cannot apply here → error.'), parts: [G({ SEQ: result ? 'ok' : 'bad' }, sk), varsPart] });
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

  /* ======================================================================
     TOPIC 4: MRO & C3 Linearization (plus cooperative super())
     ====================================================================== */
  function parseHierarchy(input) {
    var defs = String(input).split(/[;\n]/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!defs.length) throw new Error('Format: "A; B(A); C(A); D(B, C)"');
    if (defs.length > 10) throw new Error('Use at most 10 classes');
    var order = [], bases = {};
    defs.forEach(function (d) {
      var m = /^([A-Za-z_]\w{0,7})\s*(?:\(([^)]*)\))?$/.exec(d);
      if (!m) throw new Error('Could not read "' + d + '". Write classes like D(B, C); names up to 8 letters');
      var name = m[1];
      if (name === 'object') throw new Error('object is built in; do not define it');
      if (bases[name]) throw new Error('Class ' + name + ' defined twice');
      var bs = (m[2] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      bs.forEach(function (b) {
        if (b !== 'object' && !bases[b]) throw new Error('Base ' + b + ' of ' + name + ' must be defined earlier');
      });
      if (bs.length !== new Set(bs).size) throw new Error('duplicate base class in ' + name);
      bases[name] = bs.length ? bs : ['object'];
      order.push(name);
    });
    return { order: order, bases: bases };
  }

  topics.push({
    title: 'MRO & C3 Linearization: Who Wins in Multiple Inheritance',
    analogy: R`<p>Imagine asking for advice in a <b>family business</b>. You ask your direct mentors first, in the order you listed them, and a mentor is always consulted <b>before</b> that mentor's own teacher. One more rule: you never consult a grandparent-teacher while someone who learned from them still hasn't been asked, because the student has the more specific, updated advice. The MRO is that ordered list of people to ask, and C3 is the fair algorithm that builds it, or tells you the family tree is contradictory.</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> When you write <code>obj.method()</code>, Python searches classes in a fixed order and uses the <b>first</b> class that defines <code>method</code>. That order is the <b>Method Resolution Order</b>, stored as a tuple in <code>Cls.__mro__</code> (also <code>Cls.mro()</code>). With single inheritance it is obvious: <code>Dog → Animal → object</code>. With multiple inheritance (<code>class D(B, C)</code>) it needs rules.</p>
      <p>🔵 <b>The three promises of the MRO:</b></p>
      <ul>
        <li><b>Children before parents:</b> a class always comes before its bases.</li>
        <li><b>Local precedence order:</b> in <code>class D(B, C)</code>, <code>B</code> comes before <code>C</code>, as you wrote it.</li>
        <li><b>Monotonicity:</b> if <code>B</code> comes before <code>A</code> in a parent's MRO, it stays that way in every child's MRO.</li>
      </ul>
      <p><b>The C3 formula.</b> For <code>class C(B1, B2, …, Bn)</code>:</p>
      <p><code>L[C] = C + merge(L[B1], L[B2], …, L[Bn], [B1, B2, …, Bn])</code></p>
      <p><b>merge</b> in plain words: look at the <b>first item (head)</b> of each list from left to right. Take the first head that does <b>not</b> appear anywhere except at the front of the lists (i.e. not in any list's <b>tail</b>). Append it to the result and delete it from the front of every list. Repeat. If no head qualifies, the hierarchy is contradictory: <code>TypeError: Cannot create a consistent method resolution order (MRO)</code>.</p>
      <p><b>Worked diamond:</b> <code>A</code>; <code>B(A)</code>; <code>C(A)</code>; <code>D(B, C)</code>.</p>
      ${H.table(['Step', 'Lists to merge', 'Pick', 'Why', 'Result so far'], [
        ['0', '[B, A, obj] [C, A, obj] [B, C]', '—', 'start with D', 'D'],
        ['1', '[<b>B</b>, A, obj] [C, A, obj] [B, C]', H.c('g', 'B'), 'B is in no tail', 'D B'],
        ['2', '[<b>A</b>, obj] [C, A, obj] [C]', H.c('r', 'A ✗'), 'A is in the tail of [C, A, obj]', 'D B'],
        ['2b', '[A, obj] [<b>C</b>, A, obj] [C]', H.c('g', 'C'), 'C is in no tail', 'D B C'],
        ['3', '[<b>A</b>, obj] [A, obj]', H.c('g', 'A'), 'now free', 'D B C A'],
        ['4', '[obj] [obj]', H.c('g', 'object'), '', 'D B C A object']
      ])}
      <p>Key insight from step 2: <b>A must wait for C</b>, because C is a child of A and might override A's methods. Old Python 2 "classic classes" used plain depth-first search (D, B, A, C, A) and would visit A before C, silently skipping C's overrides. C3 fixes that.</p>
      <p><b>super() follows the MRO, not "the parent".</b> Inside <code>B</code>, <code>super().greet()</code> means "the next class after B in <b>type(self).__mro__</b>". For a <code>D</code> instance that is <b>C</b>, a class B has never heard of! This is what makes <b>cooperative multiple inheritance</b> work: if every class calls <code>super()</code> once, each method in the chain runs exactly once.</p>`,
    clues: [
      '"diamond problem" / "which method is called with multiple inheritance?" → MRO via C3, check <code>Cls.__mro__</code>',
      '"<code>TypeError: Cannot create a consistent method resolution order</code>" → contradictory base ordering; C3 merge has no valid head',
      '"mixin" classes (LoggingMixin, JSONMixin) → put mixins <b>left</b> of the main base and make every method call <code>super()</code>',
      '"<code>__init__</code> runs twice" or "a parent <code>__init__</code> never runs" → mixing <code>Parent.__init__(self)</code> calls with <code>super()</code>',
      '"what does <code>super()</code> call in class B when the object is a D?" → the next class in <code>D.__mro__</code>, not B\'s base',
      '"implement the MRO / linearize a class hierarchy" → C3 merge algorithm (a nice graph-ordering coding question)'
    ],
    code: [{ lang: 'python', run: true, title: 'MRO and cooperative super() in a diamond', code: R`
      class A:
          def __init__(self, **kw):
              print("A.__init__ (end of chain), leftover kwargs:", kw)
              super().__init__()               # object.__init__ takes no extra args

      class B(A):
          def __init__(self, b=None, **kw):
              print("B.__init__ got b =", b)
              super().__init__(**kw)           # NOT necessarily A: next in type(self).__mro__

      class C(A):
          def __init__(self, c=None, **kw):
              print("C.__init__ got c =", c)
              super().__init__(**kw)

      class D(B, C):
          def __init__(self, **kw):
              print("D.__init__")
              super().__init__(**kw)

      print([k.__name__ for k in D.__mro__])  # ['D', 'B', 'C', 'A', 'object']
      D(b=1, c=2)                              # each __init__ runs exactly once, in MRO order
    ` }, { lang: 'python', run: true, title: 'An inconsistent hierarchy is rejected', code: R`
      class A: pass
      class B: pass
      class X(A, B): pass      # says: A before B
      class Y(B, A): pass      # says: B before A

      try:
          class Z(X, Y): pass  # needs both orders at once -> impossible
      except TypeError as e:
          print("TypeError:", e)

      try:
          class W(object, A): pass   # object before A? but A's MRO puts A before object
      except TypeError as e:
          print("TypeError:", e)
    ` }],
    codeTitle: ['Cooperative super() walks D.__mro__ (runnable)', 'C3 refuses contradictory orders (runnable)'],
    viz: [{
      title: 'C3 linearization, step by step',
      input: 'A; B(A); C(A); D(B, C); E(C); F(D, E)',
      inputLabel: 'Classes in definition order, e.g. A; B(A); C(A); D(B, C). Try the error case: A; B; X(A, B); Y(B, A); Z(X, Y)',
      gen: function (input) {
        var H0 = parseHierarchy(input === undefined ? 'A; B(A); C(A); D(B, C); E(C); F(D, E)' : input);
        var order = H0.order, bases = H0.bases, L = { object: ['object'] }, frames = [];
        // layout: level = 1 + max(level of bases)
        var level = { object: 0 }, maxLv = 0;
        order.forEach(function (c) { level[c] = 1 + Math.max.apply(null, bases[c].map(function (b) { return level[b]; })); maxLv = Math.max(maxLv, level[c]); });
        var byLv = {};
        ['object'].concat(order).forEach(function (c) { (byLv[level[c]] = byLv[level[c]] || []).push(c); });
        var gap = Math.min(16, 56 / Math.max(1, maxLv)), nodes = [];
        Object.keys(byLv).forEach(function (lv) {
          var row = byLv[lv];
          row.forEach(function (c, i) { nodes.push({ id: c, label: c === 'object' ? 'obj' : c, x: (i + 1) * 100 / (row.length + 1), y: 6 + lv * gap }); });
        });
        var edges = [];
        order.forEach(function (c) { bases[c].forEach(function (b, i) { edges.push([c, b, bases[c].length > 1 ? String(i + 1) : '']); }); });
        var height = 12 + maxLv * gap;
        function graph(hl, tags) { return { type: 'graph', label: 'Class graph (arrow = "inherits from", edge number = base order)', directed: true, height: height, nodes: nodes, edges: edges, hl: hl || {}, tags: tags || {} }; }
        frames.push({ narr: 'Here is the hierarchy. Every class without listed bases inherits from <code>object</code>. We compute <code>L[X]</code> (the MRO) for each class <b>in definition order</b>, because each class needs its parents\' MROs first. Formula: <code>L[C] = C + merge(L[B1], …, L[Bn], [B1 … Bn])</code>.', parts: [graph(), { type: 'table', label: 'Class definitions', columns: ['class', 'bases (in order)'], rows: order.map(function (c) { return [c, bases[c].join(', ')]; }) }] });
        var failed = false;
        for (var ci = 0; ci < order.length && !failed; ci++) {
          var C = order[ci], bs = bases[C];
          if (bs.length === 1) {
            L[C] = [C].concat(L[bs[0]]);
            var h1 = {}; h1[C] = 'ok';
            frames.push({ narr: '<code>' + C + '</code> has a single base <code>' + bs[0] + '</code>, so its MRO is just ' + C + ' followed by L[' + bs[0] + ']: <b>' + L[C].join(' → ') + '</b>. No merging needed.', parts: [graph(h1), { type: 'array', label: 'L[' + C + ']', values: L[C].slice(), hl: { 0: 'ok' } }] });
            continue;
          }
          var seqs = bs.map(function (b) { return L[b].slice(); }).concat([bs.slice()]);
          var names = bs.map(function (b) { return 'L[' + b + ']'; }).concat(['bases list']);
          var out = [C];
          var hS = {}; hS[C] = 'cur';
          function listParts(hlMap) {
            var ps = [];
            seqs.forEach(function (s, i) { ps.push({ type: 'array', label: names[i] + (s.length ? '' : ' (empty)'), values: s.slice(), hl: (hlMap && hlMap[i]) || {} }); });
            ps.push({ type: 'array', label: 'L[' + C + '] so far', values: out.slice(), hl: (function () { var o = {}; o[out.length - 1] = 'ok'; return o; })() });
            return ps;
          }
          frames.push({ narr: '<b>Computing L[' + C + ']</b> with ' + bs.length + ' bases. Start the result with <code>' + C + '</code> itself, then merge: ' + names.join(', ') + '. Rule: take the first <b>head</b> (front item) that is not in any list\'s <b>tail</b> (everything after the front).', parts: [graph(hS)].concat(listParts()) });
          var guard = 0;
          while (guard++ < 60) {
            var keep = seqs.map(function (s) { return s.length > 0; });
            seqs = seqs.filter(function (_, i) { return keep[i]; });
            names = names.filter(function (_, i) { return keep[i]; });
            if (!seqs.length) break;
            var picked = null;
            for (var si = 0; si < seqs.length; si++) {
              var head = seqs[si][0], blocker = -1, bpos = -1;
              for (var t = 0; t < seqs.length; t++) { var p = seqs[t].indexOf(head); if (p > 0) { blocker = t; bpos = p; break; } }
              var hlm = {}; hlm[si] = {}; hlm[si][0] = blocker >= 0 ? 'y' : 'g';
              if (blocker >= 0) { hlm[blocker] = hlm[blocker] || {}; hlm[blocker][bpos] = 'r'; }
              var gh = {}; gh[C] = 'cur'; gh[head] = blocker >= 0 ? 'bad' : 'ok';
              if (blocker >= 0) {
                frames.push({ narr: 'Candidate <b>' + head + '</b> (head of list ' + (si + 1) + ') is ' + H.c('r', 'rejected') + ': it still appears in the <b>tail</b> of list ' + (blocker + 1) + ' (shown red). Something that must come before ' + head + ' has not been placed yet. Try the next list\'s head.', parts: [graph(gh)].concat(listParts(hlm)) });
              } else {
                picked = head;
                out.push(head);
                seqs.forEach(function (s) { if (s[0] === head) s.shift(); });
                frames.push({ narr: 'Candidate <b>' + head + '</b> is in no tail → ' + H.c('g', 'accept it') + '. Append to L[' + C + '] and remove it from the front of every list.', parts: [graph(gh)].concat(listParts(hlm)) });
                break;
              }
            }
            if (picked === null) {
              failed = true;
              var heads = seqs.map(function (s) { return s[0]; });
              var gb = {}; heads.forEach(function (h) { gb[h] = 'bad'; }); gb[C] = 'cur';
              frames.push({ narr: '<span class="c-r">Every head is blocked</span> (' + heads.join(', ') + '): each one appears in the tail of another list, so each demands to come after another. The constraints contradict each other. Python refuses to create the class: <code>TypeError: Cannot create a consistent method resolution order (MRO) for bases ' + esc(bs.join(', ')) + '</code>.', parts: [graph(gb)].concat(listParts()) });
              break;
            }
          }
          if (!failed) {
            L[C] = out;
            var gd = {}; out.forEach(function (c, i) { gd[c] = i === 0 ? 'sel' : 'done'; });
            var tg = {}; out.forEach(function (c, i) { tg[c] = '#' + (i + 1); });
            frames.push({ narr: 'All lists are empty. <b>' + C + '.__mro__ = (' + out.join(', ') + ')</b>. The tags show search order: attribute lookup on a ' + C + ' instance tries #1 first, then #2, and so on.', parts: [graph(gd, tg), { type: 'array', label: 'L[' + C + '] = ' + C + '.__mro__', values: out.slice(), hl: { 0: 'p' } }] });
          }
        }
        if (!failed) {
          frames.push({ narr: 'Done. Every class has a valid MRO. Check any of them in real Python with <code>[k.__name__ for k in Cls.__mro__]</code>. Remember: <code>super()</code> inside a method just moves one step to the right along <b>the instance\'s</b> MRO.', parts: [{ type: 'table', label: 'All MROs', columns: ['class', 'MRO'], rows: order.map(function (c) { return [c, L[c].join(' → ')]; }), hl: (function () { var o = {}; o[order.length - 1] = 'sel'; return o; })() }] });
        }
        return frames;
      }
    }, {
      title: 'super() chain: who runs next for a D instance?',
      gen: function () {
        var code = [
          'class A:',
          '    def hello(self): print("A")',
          'class B(A):',
          '    def hello(self): print("B"); super().hello()',
          'class C(A):',
          '    def hello(self): print("C"); super().hello()',
          'class D(B, C):',
          '    def hello(self): print("D"); super().hello()',
          '',
          'D().hello()        # D.__mro__ = (D, B, C, A, object)'
        ].join('\n');
        var mro = ['D', 'B', 'C', 'A', 'object'];
        var S = [
          { l: [10], st: [], o: '', p: -1, n: 'We call <code>D().hello()</code>. Python searches <code>D.__mro__ = (D, B, C, A, object)</code> for <code>hello</code> and finds it immediately in D.' },
          { l: [8], st: ['D.hello'], o: 'D', p: 0, n: '<code>D.hello</code> prints D, then <code>super().hello()</code>. Zero-argument super() means <code>super(D, self)</code>: "search the MRO of <b>type(self)</b>, starting <b>after D</b>" → next is <b>B</b>.' },
          { l: [4], st: ['D.hello', 'B.hello'], o: 'D\nB', p: 1, n: '<code>B.hello</code> prints B. Its <code>super()</code> is <code>super(B, self)</code>, and self is still a <b>D</b>. In D\'s MRO, the class after B is <b>C</b>, not A! B never mentions C, yet that is who runs next. This surprises almost everyone.' },
          { l: [6], st: ['D.hello', 'B.hello', 'C.hello'], o: 'D\nB\nC', p: 2, n: '<code>C.hello</code> prints C, then <code>super()</code> → next after C in D\'s MRO → <b>A</b>.' },
          { l: [2], st: ['D.hello', 'B.hello', 'C.hello', 'A.hello'], o: 'D\nB\nC\nA', p: 3, n: '<code>A.hello</code> prints A and does not call super (object has no <code>hello</code>), so the chain stops. A ran <b>once</b>, even though two classes inherit from it.' },
          { l: [], st: [], o: 'D\nB\nC\nA', p: -1, n: 'Stack unwinds. Output <b>D B C A</b>: exactly the MRO. If B had called <code>A.hello(self)</code> directly instead of <code>super()</code>, C would be <b>skipped</b>; if both B and C called <code>A.hello(self)</code>, A would run <b>twice</b>. Rule: in a hierarchy, use super() everywhere or nowhere.' }
        ];
        return S.map(function (s) {
          var hl = {}; s.l.forEach(function (x) { hl[x] = 'cur'; });
          var ah = {}; if (s.p >= 0) { for (var i = 0; i < s.p; i++) ah[i] = 'done'; ah[s.p] = 'cur'; }
          var sh = {}; if (s.st.length) sh[s.st.length - 1] = 'cur';
          return { narr: s.n, parts: [
            { type: 'code', label: 'Program', lang: 'python', code: code, hl: hl },
            { type: 'array', label: 'D.__mro__ (amber = class whose method runs now)', values: mro, hl: ah },
            { type: 'stack', label: 'Call stack', items: s.st, hl: sh },
            { type: 'text', label: 'Output so far', html: '<pre>' + (s.o ? esc(s.o) : '(nothing yet)') + '</pre>' }
          ] };
        });
      }
    }],
    examples: [
      { title: 'Predict the MRO (the classic Wikipedia example)', html: R`<p>O = object. <code>A, B, C, D, E(O)</code>; <code>K1(A, B, C)</code>; <code>K2(D, B, E)</code>; <code>K3(D, A)</code>; <code>Z(K1, K2, K3)</code>. Merge: <code>L[K1] = K1 A B C O</code>, <code>L[K2] = K2 D B E O</code>, <code>L[K3] = K3 D A O</code>. Then <code>L[Z] = Z + merge([K1 A B C O], [K2 D B E O], [K3 D A O], [K1 K2 K3])</code> = <b>Z K1 K2 K3 D A B C E O</b>. Note how A is picked only after D (because A sits in K3's tail behind D) and B waits until A is out. Paste the hierarchy into the visualizer to watch every rejection.</p>`, code: { lang: 'python', run: true, code: R`
        class A: pass
        class B: pass
        class C: pass
        class D: pass
        class E: pass
        class K1(A, B, C): pass
        class K2(D, B, E): pass
        class K3(D, A): pass
        class Z(K1, K2, K3): pass

        print(" ".join(k.__name__ for k in Z.__mro__))
      ` } },
      { title: 'Mixins: order matters, and they must call super()', html: R`<p>A mixin adds one behaviour to many classes. Put it <b>left</b> of the main base so its methods are found first, and have it call <code>super()</code> so the main class still runs. Output shows the JSON wrapper decorating the base result.</p>`, code: { lang: 'python', run: true, code: R`
        import json

        class Report:
            def render(self):
                return {"title": "Q3", "total": 42}

        class JSONMixin:
            def render(self):
                data = super().render()              # whatever comes next in the MRO
                return json.dumps(data, sort_keys=True)

        class UpperTitleMixin:
            def render(self):
                data = super().render()
                data["title"] = data["title"].upper() + "!"
                return data

        class APIReport(JSONMixin, UpperTitleMixin, Report):
            pass

        print([k.__name__ for k in APIReport.__mro__])
        print(APIReport().render())
      ` } },
      { title: 'Calling the parent by name breaks the diamond', html: R`<p>Using <code>Base.__init__(self)</code> instead of <code>super().__init__()</code> in a diamond: <code>A.__init__</code> runs twice and the order ignores the MRO. Count the lines of output: <b>A appears twice</b>. This is exactly why the rule is "super() everywhere, with **kwargs".</p>`, code: { lang: 'python', run: true, code: R`
        class A:
            def __init__(self):
                print("A init")

        class B(A):
            def __init__(self):
                print("B init")
                A.__init__(self)          # hard-coded parent

        class C(A):
            def __init__(self):
                print("C init")
                A.__init__(self)

        class D(B, C):
            def __init__(self):
                B.__init__(self)
                C.__init__(self)

        D()
      ` } },
      { title: 'super() with arguments and the __class__ cell', html: R`<p><code>super()</code> with no arguments is shorthand for <code>super(CurrentClass, self)</code>; the compiler stores <code>CurrentClass</code> in a hidden <code>__class__</code> cell. You can start the search after any class in the MRO by passing it explicitly, e.g. <code>super(B, d).who()</code> starts after B, i.e. at C.</p>`, code: { lang: 'python', run: true, code: R`
        class A:
            def who(self): return "A"
        class B(A):
            def who(self): return "B"
        class C(A):
            def who(self): return "C"
        class D(B, C):
            def who(self): return "D"

        d = D()
        print(d.who(), super(D, d).who(), super(B, d).who(), super(C, d).who())
      ` } }
    ],
    deepDive: R`<p>🟣 <b>Where C3 comes from.</b> It was published for the Dylan language ("A Monotonic Superclass Linearization for Dylan", 1996) and adopted by Python 2.3 for new-style classes, after the Python 2.2 algorithm was shown to violate monotonicity. Perl's <code>mro 'c3'</code> and Raku use it too. C3 guarantees a linearization that respects (1) the inheritance graph, (2) each class's local base order and (3) monotonicity; when those constraints contain a cycle (like <code>X(A, B)</code> + <code>Y(B, A)</code>) no order exists and Python raises <code>TypeError</code> at <b>class creation</b> time, which is good: you learn about it immediately, not when a method resolves weirdly in production.</p>
      <p><b>How lookups use it.</b> <code>type.__new__</code> computes <code>__mro__</code> once (via <code>type.mro()</code>, which a metaclass can override). Attribute lookup (<code>_PyType_Lookup</code>) walks <code>tp_mro</code> checking each class <code>__dict__</code>, with a global <b>method cache</b> keyed by (type version tag, name), so repeated lookups are O(1); changing any class attribute bumps the version tag and invalidates it. <code>super(T, obj)</code> finds <code>T</code> in <code>type(obj).__mro__</code> and searches the classes <b>after</b> it. <code>isinstance</code>/<code>issubclass</code> for ordinary classes are MRO membership tests.</p>
      <p><b>Cooperative design rules (Raymond Hettinger's "super considered super"):</b> (1) every method in the chain must call <code>super()</code>, except the root that ends it; (2) signatures must be compatible: accept <code>**kwargs</code>, consume your own keyword arguments and pass the rest on; (3) a root class must exist that stops the chain without forwarding unknown arguments (often <code>object</code>, which rejects extras, so leftovers become a loud <code>TypeError</code>, which is what you want); (4) to adapt a non-cooperative class, wrap it in an adapter instead of inheriting. Also: <code>class C(object, A)</code> fails (object must come last), layout conflicts happen when two bases have incompatible C layouts (e.g. both define non-empty <code>__slots__</code>, or two built-ins like <code>int</code> and <code>str</code>), and deep multiple inheritance is a design smell: prefer composition and small mixins.</p>`,
    aiEra: R`<p>🤖 <b>What AI changes:</b> models can compute an MRO if asked, but they frequently <b>guess</b> depth-first ("D, B, A, C") when reasoning quickly. Treat any claimed MRO as a hypothesis and check it with <code>Cls.__mro__</code> in two seconds.</p>
      <p><b>Prompt that helps:</b> <code>Here is my class hierarchy with mixins. Print the MRO, then for each method list which class's implementation runs and whether every override calls super(). Flag any class that would be skipped or run twice.</code> This turns the assistant into a static checker for cooperative chains.</p>
      <p><b>Where AI goes wrong:</b> suggests <code>Parent.__init__(self, ...)</code> in multiple-inheritance code (double init); puts mixins to the right of the base (their overrides never win); writes mixin methods that do not call <code>super()</code> (chain silently stops); or "fixes" an MRO TypeError by randomly reordering bases until it imports, changing behaviour. In the AI era, frameworks (Django class-based views, DRF, SQLAlchemy mixins) still rely heavily on MRO; the engineer who can trace it by hand debugs them in minutes. <b>What you must own:</b> running C3 on paper and explaining why <code>super()</code> in B can call C.</p>`,
    problems: [{
      title: 'Implement C3 linearization',
      level: 'Hard', tags: ['MRO', 'C3', 'graph', 'merge'], companies: ['Google', 'Meta', 'Bloomberg'],
      statement: R`<p>Given a class hierarchy as a dict <code>bases</code> (class name → list of base names in order; a missing or empty entry means the class inherits only from <code>"object"</code>), return the MRO of a given class as a list of names, exactly as Python would compute it. If no consistent order exists, raise <code>TypeError</code>. Verify your answer against real Python classes built with <code>type()</code>.</p>`,
      constraints: R`Up to 200 classes, up to 10 bases each; the hierarchy is acyclic and every base is defined.`,
      example: R`<p><code>bases = {"A": [], "B": ["A"], "C": ["A"], "D": ["B", "C"]}</code> → <code>mro("D")</code> = ${H.c('g', "['D', 'B', 'C', 'A', 'object']")}</p>
        <p><code>{"A": [], "B": [], "X": ["A", "B"], "Y": ["B", "A"], "Z": ["X", "Y"]}</code> → <code>mro("Z")</code> raises ${H.c('r', 'TypeError')} because X says A before B but Y says B before A.</p>`,
      brute: {
        why: R`<p>Depth-first, left-to-right, keep the first occurrence (the Python 2 classic-class rule). For the diamond it yields <code>D B A C object</code>: A comes before C, so if C overrides a method of A, C's version is <b>never</b> found. It also never detects contradictions.</p>`,
        code: R`
          def mro_dfs(cls, bases):
              seen, out = set(), []
              def dfs(c):
                  if c in seen:
                      return
                  seen.add(c)
                  out.append(c)
                  for b in bases.get(c) or (["object"] if c != "object" else []):
                      dfs(b)
              dfs(cls)
              return out

          print(mro_dfs("D", {"A": [], "B": ["A"], "C": ["A"], "D": ["B", "C"]}))   # wrong order
        `
      },
      mcq: { q: 'During merge, head <code>A</code> appears in the <b>tail</b> of another list. What does that tell you?', options: ['Some class that must precede A has not been placed yet, so skip A for now', 'A is a duplicate and should be deleted', 'The hierarchy is invalid', 'A should be placed immediately'], answer: 0, explain: 'Being in a tail means A has a subclass (or a locally-earlier sibling) still waiting. You try the next list\'s head. Only if <b>every</b> head is blocked is the hierarchy invalid.' },
      hints: [
        R`<p>Hint 1: Recursion with memoisation: <code>L[C] = [C] + merge(L[B1], …, L[Bn], [B1, …, Bn])</code>, and <code>L["object"] = ["object"]</code>.</p>`,
        R`<p>Hint 2: merge loop: drop empty lists; scan heads left to right; pick the first head that is not in <code>s[1:]</code> for any list <code>s</code>; append it and pop it from the front of every list whose head it is. If no head qualifies → <code>TypeError</code>.</p>`,
        R`<p>Hint 3: Do not forget the final list of direct bases (it enforces local precedence order). To verify, build real classes in definition order: <code>cls = type(name, tuple(real[b] for b in bs) or (object,), {})</code> and compare with <code>[k.__name__ for k in cls.__mro__]</code>.</p>`
      ],
      solution: {
        approach: R`<p>Direct implementation of C3 with memoisation. Each merge step scans at most k heads and checks tails, so it is polynomial and fast for real hierarchies. We then cross-check against CPython by constructing the same hierarchy dynamically.</p>`,
        code: { lang: 'python', run: true, code: R`
          def c3_mro(cls, bases):
              memo = {"object": ["object"]}

              def lin(c):
                  if c in memo:
                      return memo[c]
                  direct = bases.get(c) or ["object"]
                  seqs = [list(lin(b)) for b in direct] + [list(direct)]
                  out = [c]
                  while True:
                      seqs = [s for s in seqs if s]              # drop exhausted lists
                      if not seqs:
                          memo[c] = out
                          return out
                      for s in seqs:                             # first good head wins
                          head = s[0]
                          if not any(head in t[1:] for t in seqs):
                              break
                      else:
                          raise TypeError(f"Cannot create a consistent MRO for {c}")
                      out.append(head)
                      for t in seqs:                             # remove it from the fronts
                          if t[0] == head:
                              del t[0]

              return lin(cls)

          def real_mro(cls, bases):
              """Build the hierarchy with type() and ask CPython."""
              real = {}
              pending = list(bases)
              while pending:                                     # define bases before children
                  for name in pending:
                      if all(b in real for b in bases[name]):
                          real[name] = type(name, tuple(real[b] for b in bases[name]) or (object,), {})
                          pending.remove(name)
                          break
              return [k.__name__ for k in real[cls].__mro__]

          diamond = {"A": [], "B": ["A"], "C": ["A"], "D": ["B", "C"]}
          print(c3_mro("D", diamond), c3_mro("D", diamond) == real_mro("D", diamond))

          wiki = {"A": [], "B": [], "C": [], "D": [], "E": [],
                  "K1": ["A", "B", "C"], "K2": ["D", "B", "E"], "K3": ["D", "A"], "Z": ["K1", "K2", "K3"]}
          print(" ".join(c3_mro("Z", wiki)), c3_mro("Z", wiki) == real_mro("Z", wiki))

          try:
              c3_mro("Z", {"A": [], "B": [], "X": ["A", "B"], "Y": ["B", "A"], "Z": ["X", "Y"]})
          except TypeError as e:
              print("TypeError:", e)
        ` },
        dry: { head: ['step', 'lists (heads first)', 'candidate', 'decision', 'L[D]'], rows: [
          ['0', '[B A obj] [C A obj] [B C]', '—', 'start', 'D'],
          ['1', '[B A obj] [C A obj] [B C]', 'B', 'in no tail → take', 'D B'],
          ['2', '[A obj] [C A obj] [C]', 'A', '<span class="c-r">in tail of [C A obj] → skip</span>', 'D B'],
          ['3', '[A obj] [C A obj] [C]', 'C', 'in no tail → take', 'D B C'],
          ['4', '[A obj] [A obj]', 'A', 'take', 'D B C A'],
          ['5', '[obj] [obj]', 'object', 'take; all empty → done', 'D B C A object']
        ] },
        complexity: R`<p>For a class whose MRO has length m and k direct bases, each of the m steps scans up to k+1 heads and checks membership in tails of total length O(m·k): O(m²k²) worst case per class, tiny in practice. Memoisation computes each class once. Space O(total MRO lengths).</p>`,
        followUps: ['Return a helpful error naming the conflicting pair of classes', 'Why is the final list of direct bases needed? Find a hierarchy where omitting it gives a wrong answer', 'How would you compute MROs for all classes in topological order instead of recursion?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5: Properties — managed attributes and the attribute lookup order
     ====================================================================== */
  var PROP_CODE = [
    'import functools',
    'class Circle:',
    '    kind = "shape"                       # class attribute',
    '    def __init__(self, radius, name):',
    '        self.radius = radius             # runs the property setter!',
    '        self.name = name                 # plain instance attribute',
    '    @property',
    '    def radius(self): return self._radius',
    '    @radius.setter',
    '    def radius(self, value):',
    '        if value < 0: raise ValueError("radius must be >= 0")',
    '        self._radius = value',
    '    @property',
    '    def area(self): return round(3.14159 * self._radius ** 2, 2)',
    '    @functools.cached_property',
    '    def report(self): return f"{self.name}: area {self.area}"',
    '    def describe(self): return f"{self.name} r={self._radius}"',
    '    def __getattr__(self, attr): return f"<no {attr}>"',
    '',
    'c = Circle(2, "wheel")'
  ].join('\n');

  topics.push({
    title: 'Properties: Managed Attributes & the Attribute Lookup Order',
    analogy: R`<p>A <b>bank teller window</b>. Customers think they are simply "reading the balance" or "setting a deposit", exactly like touching a drawer. But behind the glass a teller checks the request: refuses negative deposits, computes the interest-adjusted balance on the fly, logs the access. A <code>@property</code> is that teller: callers keep the simple syntax <code>acct.balance</code> and <code>acct.balance = 50</code>, while your code quietly validates and computes.</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> In Java you write <code>getRadius()</code>/<code>setRadius()</code> "just in case". In Python you start with a <b>plain attribute</b> (<code>self.radius = r</code>). If you later need validation or a computed value, you turn it into a <b>property</b> and <b>no caller has to change</b>, because the syntax stays <code>c.radius</code>. This is called the <b>uniform access principle</b>, and it is why Pythonic classes rarely have getters and setters.</p>
      ${H.table(['Want', 'Write', 'Effect'], [
        ['read-only computed value', '<code>@property</code> <code>def area(self)</code>', '<code>c.area</code> runs the method; <code>c.area = 5</code> → AttributeError'],
        ['validated attribute', '<code>@property</code> + <code>@radius.setter</code>', '<code>c.radius = -1</code> runs your check'],
        ['cleanup on delete', '<code>@radius.deleter</code>', '<code>del c.radius</code> runs your code'],
        ['compute once, then cache', '<code>@functools.cached_property</code>', 'first access computes and stores in <code>__dict__</code>']
      ])}
      <p>🔵 <b>Three rules to remember:</b></p>
      <ol>
        <li><b>Store the real value under a different name</b>, usually with a leading underscore (<code>self._radius</code>). Writing <code>self.radius = value</code> <i>inside</i> the radius setter calls the setter again → infinite recursion → <code>RecursionError</code>.</li>
        <li><b>Assign through the property in <code>__init__</code></b> (<code>self.radius = radius</code>, not <code>self._radius = radius</code>) so the validation also protects construction.</li>
        <li><b>Keep properties cheap and side-effect free.</b> Callers expect attribute access to be fast and safe to call twice. Slow work (network, DB) should be a method with a verb name (<code>fetch_orders()</code>), or a <code>cached_property</code>.</li>
      </ol>
      <p><b>How does Python know?</b> A property is an object stored on the <b>class</b> that has <code>__get__</code> and <code>__set__</code> methods; such objects are called <b>data descriptors</b>, and they win over the instance's own <code>__dict__</code>. The full lookup order for <code>obj.attr</code>:</p>
      ${H.table(['#', 'Where Python looks', 'Example'], [
        ['1', 'a <b>data descriptor</b> (has <code>__set__</code>/<code>__delete__</code>) found in <code>type(obj).__mro__</code>', '<code>@property</code>, <code>__slots__</code> members'],
        ['2', 'the instance <code>__dict__</code>', '<code>self.name = ...</code>'],
        ['3', 'a <b>non-data descriptor</b> or plain class attribute from the MRO', 'methods (functions), <code>cached_property</code>, <code>kind = "shape"</code>'],
        ['4', 'nothing found → <code>__getattr__(name)</code> if defined, else <code>AttributeError</code>', 'fallbacks, proxies']
      ])}
      <p>That ordering explains a lot: a property cannot be shadowed by an instance value (step 1 beats step 2), but a <b>method</b> or class attribute <i>can</i> be shadowed (step 2 beats step 3). And <code>cached_property</code> works by being a non-data descriptor that, on first use, writes the answer into the instance <code>__dict__</code>, so step 2 finds it next time without running the method.</p>`,
    clues: [
      '"validate on assignment", "radius must be non-negative", "email must contain @" → <code>@property</code> + setter',
      '"read-only attribute" / "derived value like area, full_name, age from birthdate" → getter-only property',
      '"we exposed a public attribute and now need logic without breaking callers" → convert to a property (uniform access)',
      '"expensive value computed once per object" → <code>functools.cached_property</code> (needs a <code>__dict__</code>)',
      '"why can I override a method on an instance but not a property?" → data vs non-data descriptors in the lookup order',
      '"<code>RecursionError</code> in a setter" → setter assigns to its own name instead of the backing <code>_field</code>'
    ],
    code: [{ lang: 'python', run: true, title: 'Validated, computed and cached attributes', code: R`
      import functools

      class Temperature:
          def __init__(self, celsius):
              self.celsius = celsius              # goes through the setter -> validated

          @property
          def celsius(self):
              return self._celsius                # backing field has a different name

          @celsius.setter
          def celsius(self, value):
              if value < -273.15:
                  raise ValueError(f"{value} is below absolute zero")
              self._celsius = float(value)

          @property
          def fahrenheit(self):                   # computed, always in sync
              return self._celsius * 9 / 5 + 32

          @fahrenheit.setter
          def fahrenheit(self, value):            # set via the other unit
              self.celsius = (value - 32) * 5 / 9

          @functools.cached_property
          def label(self):                        # computed once, then cached in __dict__
              print("  (computing label...)")
              return f"{self._celsius:.1f}°C"

      t = Temperature(25)
      print(t.celsius, t.fahrenheit)
      t.fahrenheit = 212
      print(t.celsius)                            # 100.0
      print(t.label, t.label)                     # computed only once
      try:
          t.celsius = -300
      except ValueError as e:
          print("ValueError:", e)
      try:
          Temperature(-500)                       # __init__ is protected too
      except ValueError as e:
          print("ValueError:", e)
    ` }, { lang: 'python', run: true, title: 'Lookup order in action: property vs instance dict vs method', code: R`
      class Widget:
          size = 10                               # plain class attribute

          @property
          def area(self):                         # data descriptor
              return 42

          def greet(self):                        # function = non-data descriptor
              return "hello"

      w = Widget()
      w.__dict__["area"] = "sneaky"               # put values straight into the instance dict
      w.__dict__["greet"] = "shadowed!"
      w.size = 99                                 # creates an instance attribute

      print(w.area)       # 42: data descriptor (step 1) beats the instance dict
      print(w.greet)      # 'shadowed!': instance dict (step 2) beats the method (step 3)
      print(w.size, Widget.size)                  # 99 10: the class attribute is untouched
      print(type(Widget.__dict__["area"]).__name__, hasattr(Widget.area, "__set__"))
    ` }],
    codeTitle: ['Temperature with two linked properties and a cached one (runnable)', 'Data descriptors win, methods can be shadowed (runnable)'],
    viz: {
      title: 'What happens on c.attr (and c.attr = value)?',
      input: 'name area kind describe report report nope radius=5 area radius=-1 area=3 kind=disc kind',
      inputLabel: 'Space-separated reads (name, area, radius, kind, describe, report, anything) and writes (radius=5, area=3, name=x, kind=x)',
      gen: function (input) {
        var toks = String(input === undefined ? 'name area kind describe report report nope radius=5 area radius=-1 area=3 kind=disc kind' : input).trim().split(/\s+/).filter(Boolean);
        if (!toks.length) throw new Error('Type attribute names like: area name report');
        if (toks.length > 14) throw new Error('Use at most 14 operations');
        var inst = { _radius: 2, name: "'wheel'" }, instOrder = ['_radius', 'name'];
        var classAttrs = { kind: 'str "shape"', radius: 'property (get+set)', area: 'property (get only)', report: 'cached_property', describe: 'function', __getattr__: 'function' };
        var DATA = { radius: 1, area: 1 }, NONDATA = { report: 1, describe: 1 }, PLAIN = { kind: '\'shape\'' };
        function area() { return String(Math.round(3.14159 * inst._radius * inst._radius * 100) / 100); }
        function instPart(hlk) { var h = {}; if (hlk) h[hlk] = 'ok'; return { type: 'map', label: 'c.__dict__ (instance)', entries: instOrder.map(function (k) { return [k, inst[k]]; }), hl: h }; }
        function clsPart(hlk, cls) { var h = {}; if (hlk) h[hlk] = cls || 'cur'; return { type: 'map', label: 'Circle.__dict__ (class)', entries: Object.keys(classAttrs).map(function (k) { return [k, classAttrs[k]]; }), hl: h }; }
        var steps = [
          { id: 'S1', label: '1. data descriptor on the class?', x: 46, y: 6 },
          { id: 'S2', label: '2. key in c.__dict__?', x: 46, y: 19 },
          { id: 'S3', label: '3. non-data descriptor / class attr?', x: 46, y: 32 },
          { id: 'S4', label: '4. __getattr__ fallback', x: 46, y: 45 }
        ];
        function G(expr, lit, res, okId) {
          var nodes = [{ id: 'E', label: expr, shape: 'box', x: 10, y: 26 }].concat(steps.map(function (s) { return { id: s.id, label: s.label, shape: 'box', x: s.x, y: s.y }; }));
          nodes.push({ id: 'R', label: res, shape: 'box', x: 88, y: 26 });
          var edges = [['E', 'S1'], ['S1', 'S2', 'no'], ['S2', 'S3', 'no'], ['S3', 'S4', 'no']];
          if (okId) edges.push([okId, 'R', 'yes']);
          var hl = {}, ehl = {};
          lit.forEach(function (id) { hl[id] = 'done'; });
          if (okId) { hl[okId] = 'ok'; hl.R = 'sel'; ehl[okId + '-R'] = 'ok'; }
          for (var i = 0; i < lit.length; i++) { var a = lit[i], b = lit[i + 1]; if (b) ehl[a + '-' + b] = 'cur'; }
          ehl['E-S1'] = 'cur';
          return { type: 'graph', label: 'Lookup ladder for reading c.' + (expr.split('.')[1] || ''), directed: true, height: 52, nodes: nodes, edges: edges, hl: hl, ehl: ehl };
        }
        var frames = [];
        frames.push({ narr: 'We created <code>c = Circle(2, "wheel")</code>. Note that <code>self.radius = radius</code> in <code>__init__</code> went through the <b>setter</b>, which stored the value as <code>_radius</code>. The instance dict holds only <code>_radius</code> and <code>name</code>; everything else lives on the class.', parts: [{ type: 'code', label: 'Circle', lang: 'python', code: PROP_CODE, hl: { 5: 'cur', 12: 'ok', 6: 'cur' } }, instPart(), clsPart()] });
        toks.forEach(function (tk) {
          var w = /^([A-Za-z_]\w*)=(.+)$/.exec(tk);
          if (w) {
            var nm = w[1], val = w[2];
            if (nm === 'radius') {
              var num = Number(val);
              if (isNaN(num)) throw new Error('radius needs a number, e.g. radius=5');
              if (num < 0) {
                frames.push({ narr: '<code>c.radius = ' + esc(val) + '</code>: on assignment Python also checks the class first. <code>radius</code> is a <b>data descriptor</b> (property with a setter) → <code>property.__set__</code> runs our setter → <span class="c-r">ValueError: radius must be &gt;= 0</span>. The instance dict is untouched: validation works.', parts: [{ type: 'code', label: 'Circle', lang: 'python', code: PROP_CODE, hl: { 10: 'cur', 11: 'bad' } }, instPart(), clsPart('radius', 'bad')] });
              } else {
                inst._radius = num;
                frames.push({ narr: '<code>c.radius = ' + esc(val) + '</code>: <code>radius</code> is a data descriptor on the class, so assignment calls the <b>setter</b>, which validates and stores <code>_radius = ' + esc(val) + '</code>. Notice <code>area</code> will now be different: it is computed on every read.', parts: [{ type: 'code', label: 'Circle', lang: 'python', code: PROP_CODE, hl: { 10: 'cur', 11: 'ok', 12: 'ok' } }, instPart('_radius'), clsPart('radius', 'ok')] });
              }
            } else if (nm === 'area') {
              frames.push({ narr: '<code>c.area = ' + esc(val) + '</code>: <code>area</code> is a property <b>without</b> a setter, but it is still a data descriptor (property always defines <code>__set__</code>, which raises). → <span class="c-r">AttributeError: property \'area\' of \'Circle\' object has no setter</span>. Read-only by design.', parts: [{ type: 'code', label: 'Circle', lang: 'python', code: PROP_CODE, hl: { 13: 'bad', 14: 'bad' } }, instPart(), clsPart('area', 'bad')] });
            } else {
              if (DATA[nm]) return;
              if (!(nm in inst)) instOrder.push(nm);
              inst[nm] = "'" + val + "'";
              var shadow = PLAIN[nm] !== undefined || NONDATA[nm];
              frames.push({ narr: '<code>c.' + esc(nm) + ' = \'' + esc(val) + '\'</code>: no data descriptor named <code>' + esc(nm) + '</code> on the class, so Python simply stores it in the <b>instance dict</b>.' + (shadow ? ' <span class="c-y">This now <b>shadows</b> the class attribute <code>' + esc(nm) + '</code> for this object only; <code>Circle.' + esc(nm) + '</code> and other instances are unchanged.</span>' : ''), parts: [instPart(nm), clsPart(shadow ? nm : null, 'cur')] });
            }
            return;
          }
          var a = tk, expr = 'c.' + a;
          if (!/^[A-Za-z_]\w{0,14}$/.test(a)) throw new Error('"' + tk + '" is not a valid attribute name');
          if (DATA[a]) {
            var v = a === 'area' ? area() : String(inst._radius);
            frames.push({ narr: '<code>' + expr + '</code>: step 1 finds <code>' + a + '</code> in <code>Circle.__dict__</code> and it is a <b>property</b>, a data descriptor. Python calls <code>property.__get__(c, Circle)</code>, which runs the getter → <b>' + v + '</b>. The instance dict is never consulted (even if it had an "' + a + '" key).', parts: [G(expr, ['S1'], v, 'S1'), { type: 'code', label: 'Circle', lang: 'python', code: PROP_CODE, hl: a === 'area' ? { 13: 'cur', 14: 'ok' } : { 7: 'cur', 8: 'ok' } }, clsPart(a, 'ok'), instPart()] });
          } else if (a in inst) {
            frames.push({ narr: '<code>' + expr + '</code>: step 1: no data descriptor named <code>' + a + '</code> on the class. Step 2: found in <code>c.__dict__</code> → <b>' + esc(inst[a]) + '</b>.' + (PLAIN[a] !== undefined || NONDATA[a] ? ' (It shadows the class-level <code>' + a + '</code>.)' : ''), parts: [G(expr, ['S1', 'S2'], inst[a], 'S2'), instPart(a), clsPart(a, 'cur')] });
          } else if (a === 'report') {
            var rep = "'" + inst.name.replace(/'/g, '') + ': area ' + area() + "'";
            frames.push({ narr: '<code>c.report</code> (first time): step 1: <code>cached_property</code> has only <code>__get__</code>, so it is a <b>non-data</b> descriptor and does not qualify. Step 2: no "report" key in the instance dict. Step 3: call its <code>__get__</code> → runs the method → <b>' + esc(rep) + '</b>, and <b>stores it into <code>c.__dict__["report"]</code></b>.', parts: [G(expr, ['S1', 'S2', 'S3'], rep, 'S3'), { type: 'code', label: 'Circle', lang: 'python', code: PROP_CODE, hl: { 15: 'cur', 16: 'ok' } }, clsPart('report', 'ok')] });
            inst.report = rep; instOrder.push('report');
            frames.push({ narr: 'Now the cached value sits in the instance dict. The next <code>c.report</code> will stop at <b>step 2</b> and never run the method again, even if <code>radius</code> changes (so the cache can go <b>stale</b>; <code>del c.report</code> clears it).', parts: [instPart('report'), clsPart('report', 'done')] });
          } else if (a === 'describe' || a === '__getattr__') {
            frames.push({ narr: '<code>' + expr + '</code>: steps 1 and 2 miss. Step 3 finds a <b>function</b> on the class. Functions are non-data descriptors: <code>function.__get__(c, Circle)</code> returns a <b>bound method</b> that remembers <code>c</code> as <code>self</code>. That is the whole secret of how <code>self</code> gets passed.', parts: [G(expr, ['S1', 'S2', 'S3'], 'bound method', 'S3'), clsPart(a, 'ok'), instPart()] });
          } else if (PLAIN[a] !== undefined) {
            frames.push({ narr: '<code>' + expr + '</code>: steps 1 and 2 miss. Step 3: a plain class attribute (no <code>__get__</code>) is returned as is → <b>' + PLAIN[a] + '</b>. Every instance shares it until one assigns its own.', parts: [G(expr, ['S1', 'S2', 'S3'], PLAIN[a], 'S3'), clsPart(a, 'ok'), instPart()] });
          } else {
            var fb = "'<no " + a + ">'";
            frames.push({ narr: '<code>' + expr + '</code>: nothing in steps 1 to 3, so the normal lookup raises <code>AttributeError</code> internally. Because <code>Circle</code> defines <code>__getattr__</code>, Python calls it as a <b>last resort</b> → <b>' + esc(fb) + '</b>. (<code>__getattr__</code> only runs for <b>missing</b> attributes; <code>__getattribute__</code> would run for every access.)', parts: [G(expr, ['S1', 'S2', 'S3', 'S4'], fb, 'S4'), { type: 'code', label: 'Circle', lang: 'python', code: PROP_CODE, hl: { 18: 'cur' } }, instPart()] });
          }
        });
        frames.push({ narr: 'Final state. Data descriptors (properties) guard <code>radius</code> and <code>area</code>; plain data lives in the instance dict; methods, cached properties and shared defaults live on the class. Reads walk the ladder 1 → 2 → 3 → 4; writes check only "is there a data descriptor?" and otherwise go to the instance dict.', parts: [instPart(), clsPart()] });
        return frames;
      }
    },
    examples: [
      { title: 'Refactor a public attribute without breaking callers', html: R`<p>Version 1 shipped with <code>user.email</code> as a plain attribute. Months later you need to normalise and validate it. Turning it into a property keeps <b>every</b> existing <code>user.email</code> read and <code>user.email = …</code> write working, now with validation. In Java this would have required getters from day one.</p>`, code: { lang: 'python', run: true, code: R`
        class User:
            def __init__(self, email):
                self.email = email                    # same line as v1, now validated

            @property
            def email(self):
                return self._email

            @email.setter
            def email(self, value):
                value = value.strip().lower()
                if "@" not in value:
                    raise ValueError(f"invalid email: {value!r}")
                self._email = value

        u = User("  Ada@Example.COM ")
        print(u.email)                                # old caller code, unchanged
        u.email = "grace@navy.mil"
        print(u.email)
        try:
            u.email = "nope"
        except ValueError as e:
            print("ValueError:", e)
      ` } },
      { title: 'Predict the output: the recursive setter bug', html: R`<p>The setter assigns <code>self.price = value</code>, which calls the setter, which assigns <code>self.price</code>, … until Python gives up with <code>RecursionError</code>. Fix: store into <code>self._price</code>.</p>`, code: { lang: 'python', run: true, code: R`
        class Product:
            def __init__(self, price):
                self.price = price

            @property
            def price(self):
                return self._price

            @price.setter
            def price(self, value):
                if value < 0:
                    raise ValueError("negative")
                self.price = value              # BUG: should be self._price

        try:
            Product(10)
        except RecursionError as e:
            print("RecursionError:", str(e)[:40])
      ` } },
      { title: 'property() without decorators, and the deleter', html: R`<p>The decorator form is sugar for <code>name = property(fget, fset, fdel, doc)</code>. Accessing the property on the <b>class</b> returns the property object itself (no instance to bind), which is how documentation tools find the docstring.</p>`, code: { lang: 'python', run: true, code: R`
        class Session:
            def __init__(self):
                self._token = "abc123"

            def _get(self): return self._token
            def _set(self, v): self._token = v
            def _del(self):
                print("  logging out, wiping token")
                self._token = None

            token = property(_get, _set, _del, "The auth token (deleting logs out).")

        s = Session()
        print(s.token)
        del s.token
        print(s.token)
        print(type(Session.token).__name__, "|", Session.token.__doc__)
      ` } },
      { title: 'cached_property: great for lazy work, but it can go stale', html: R`<p><code>cached_property</code> computes on first access and stores the result in the instance <code>__dict__</code>. If the inputs change later, the cached value does <b>not</b> update until you <code>del</code> it. It also needs an instance <code>__dict__</code>, so it does not work on classes with <code>__slots__</code> (unless <code>'__dict__'</code> is a slot).</p>`, code: { lang: 'python', run: true, code: R`
        from functools import cached_property

        class Dataset:
            def __init__(self, rows):
                self.rows = rows

            @cached_property
            def total(self):
                print("  summing...")
                return sum(self.rows)

        d = Dataset([1, 2, 3])
        print(d.total, d.total)          # sums once
        d.rows.append(100)
        print(d.total)                   # 6: stale!
        del d.total                      # invalidate the cache
        print(d.total)                   # 106
      ` } }
    ],
    deepDive: R`<p>🟣 <b>The descriptor protocol under the hood.</b> Any class attribute whose type defines <code>__get__</code> is a <b>descriptor</b>; if it also defines <code>__set__</code> or <code>__delete__</code> it is a <b>data</b> descriptor. <code>object.__getattribute__</code> (C: <code>PyObject_GenericGetAttr</code>) does: <code>meta = _PyType_Lookup(type(obj), name)</code> (an MRO walk, method-cached); if <code>meta</code> is a data descriptor → return <code>meta.__get__(obj, type(obj))</code>; else if <code>name</code> in <code>obj.__dict__</code> → return it; else if <code>meta</code> has <code>__get__</code> → call it; else if <code>meta</code> exists → return it; else raise <code>AttributeError</code>, which makes <code>type(obj).__getattr__</code> run if defined. <code>property</code>, <code>classmethod</code>, <code>staticmethod</code>, functions, <code>__slots__</code> member descriptors and <code>cached_property</code> are all built on this one protocol. You can write your own with <code>__set_name__</code> (3.6+) to get the attribute name automatically, which is how ORMs (Django model fields, SQLAlchemy columns) and validation libraries work.</p>
      <p><b>Performance and correctness notes.</b> A property read costs a Python function call (~30 to 60 ns on modern CPython versus ~10 ns for a plain attribute); CPython 3.12+ specialises <code>LOAD_ATTR</code> for properties, narrowing the gap, but do not put properties in the innermost loop of numeric code. A getter that raises <code>AttributeError</code> by accident (e.g. a typo inside it) triggers <code>__getattr__</code>, hiding the real bug: a classic debugging trap with proxies. Since 3.12, <code>cached_property</code> no longer takes a lock (the old per-class lock caused contention), so two threads may compute the value twice. Subclasses can extend a parent property with <code>@Parent.prop.setter</code> to create a new property object reusing the parent getter. And properties live on the class, so you cannot give one instance a property.</p>
      <p><b>Design guidance:</b> start with plain attributes; promote to a property when you need validation, computation or backward compatibility; prefer methods when the work is slow, can fail for external reasons, or takes arguments. For many validated fields, a dataclass with <code>__post_init__</code>, a custom descriptor, or pydantic is less repetitive than a dozen hand-written setters.</p>`,
    aiEra: R`<p>🤖 <b>What AI changes:</b> assistants trained on lots of Java-style code still generate <code>get_x()</code>/<code>set_x()</code> pairs, or the opposite, a property for every field. Your job is to apply the Python idiom: plain attributes by default, properties for logic.</p>
      <p><b>Prompt that helps:</b> <code>Review this class: which attributes need validation or are derived and should be properties, which should stay plain, and which properties do slow I/O and should become methods? Explain each in one line.</code> Asking for a classification forces the model to justify, not just generate.</p>
      <p><b>Where AI goes wrong:</b> recursive setters (<code>self.x = v</code> inside the <code>x</code> setter); setting <code>self._x</code> directly in <code>__init__</code> so construction bypasses validation; properties that hit the network or database (surprising latency in a loop, N+1 queries); <code>cached_property</code> on a <code>__slots__</code> class; and claims that properties make attributes "private" (they do not; <code>obj._x</code> is still reachable). <b>What you must own:</b> the four-step lookup ladder (data descriptor → instance dict → non-data descriptor/class attr → <code>__getattr__</code>), which explains properties, methods, <code>cached_property</code> and <code>__slots__</code> with one idea.</p>`
  });

  /* ======================================================================
     TOPIC 6: Dataclasses — what @dataclass generates and every option that matters
     ====================================================================== */
  function parseDataclass(input) {
    var parts = String(input).split('|');
    var fieldTxt = parts[0].trim(), optTxt = (parts[1] || '').trim();
    if (!fieldTxt) throw new Error('Format: name: str, qty: int = 0 | order frozen');
    var opts = { eq: true, order: false, frozen: false, slots: false, kw_only: false, unsafe_hash: false };
    optTxt.split(/[\s,]+/).filter(Boolean).forEach(function (o) {
      if (o === 'eq=False' || o === 'noeq') opts.eq = false;
      else if (opts.hasOwnProperty(o)) opts[o] = true;
      else throw new Error('Unknown option "' + o + '". Use: order frozen slots kw_only unsafe_hash eq=False');
    });
    var fields = fieldTxt.split(/,(?![^()]*\))/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (fields.length > 6) throw new Error('Use at most 6 fields');
    var out = [];
    fields.forEach(function (f) {
      var m = /^([A-Za-z_]\w{0,11})\s*:\s*([A-Za-z_][\w\[\], .]{0,24}?)\s*(?:=\s*(.+))?$/.exec(f);
      if (!m) throw new Error('Could not read field "' + f + '". Example: qty: int = 0');
      var d = m[3] === undefined ? null : m[3].trim(), kind = 'required', val = null;
      if (d !== null) {
        var fm = /^field\(\s*default_factory\s*=\s*(\w+)\s*\)$/.exec(d), fd = /^field\(\s*default\s*=\s*(.+)\)$/.exec(d);
        if (fm) { kind = 'factory'; val = fm[1]; }
        else if (fd) { kind = 'default'; val = fd[1].trim(); }
        else if (/^(\[.*\]|\{.*\}|set\(\)|list\(\)|dict\(\))$/.test(d)) { kind = 'mutable'; val = d; }
        else { kind = 'default'; val = d; }
      }
      out.push({ name: m[1], type: m[2].trim(), kind: kind, val: val, classvar: /^ClassVar/.test(m[2].trim()) });
    });
    return { fields: out, opts: opts };
  }

  topics.push({
    title: 'Dataclasses: Generated __init__, __repr__, __eq__, Ordering, Frozen & Slots',
    analogy: R`<p>Ordering a <b>custom suit</b>. You could cut the fabric, sew every seam and stitch every buttonhole yourself (hand-written <code>__init__</code>, <code>__repr__</code>, <code>__eq__</code>). Or you give the tailor a <b>measurement card</b> (the field list with types and defaults) plus a few ticked boxes ("make it sortable", "make it unchangeable"), and the tailor produces the whole suit, perfectly consistent, in seconds. <code>@dataclass</code> is the tailor; the class body is the measurement card.</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> Many classes are mostly <b>data</b>: a Point, an Order, a Config. Writing <code>__init__</code>, <code>__repr__</code> and <code>__eq__</code> for them is repetitive and error-prone (add a field, forget to update <code>__eq__</code>…). <code>@dataclass</code> reads the <b>annotated class attributes</b> and writes those methods for you, at class-creation time, as real Python code.</p>
      ${H.table(['Option / tool', 'What you get', 'Typical use'], [
        ['<code>@dataclass</code> (defaults)', '<code>__init__</code>, <code>__repr__</code>, <code>__eq__</code>, <code>__match_args__</code>; <code>__hash__ = None</code>', 'plain records'],
        ['<code>order=True</code>', '<code>__lt__ __le__ __gt__ __ge__</code> comparing fields as a tuple, in definition order', 'sortable records'],
        ['<code>frozen=True</code>', 'assignment raises <code>FrozenInstanceError</code>; with eq → <code>__hash__</code> generated', 'dict keys, set members, safe sharing'],
        ['<code>slots=True</code> (3.10+)', '<code>__slots__</code> from the fields: less memory, typo-proof', 'many small objects'],
        ['<code>kw_only=True</code> / <code>KW_ONLY</code> (3.10+)', 'keyword-only <code>__init__</code> params', 'many fields, clearer calls'],
        ['<code>field(default_factory=list)</code>', 'a <b>fresh</b> list per instance', 'mutable defaults'],
        ['<code>field(init=False / repr=False / compare=False)</code>', 'exclude a field from <code>__init__</code> / repr / eq+order', 'derived, secret or cache fields'],
        ['<code>__post_init__</code>', 'runs at the end of the generated <code>__init__</code>', 'validation, derived fields']
      ])}
      <p>🔵 <b>Rules that bite:</b></p>
      <ul>
        <li><b>Only annotated names are fields.</b> <code>count = 0</code> (no annotation) is a plain class attribute; <code>count: ClassVar[int] = 0</code> is explicitly not a field.</li>
        <li><b>No mutable defaults.</b> <code>tags: list = []</code> raises <code>ValueError: mutable default &lt;class 'list'&gt; for field tags is not allowed: use default_factory</code>. It would otherwise be <b>one list shared by every instance</b> (the classic mutable-default bug), so dataclasses refuse it. Use <code>field(default_factory=list)</code>.</li>
        <li><b>Fields without defaults cannot follow fields with defaults</b> (same rule as function parameters): <code>TypeError: non-default argument 'y' follows default argument 'x'</code>. Inheritance makes this easy to hit; <code>kw_only</code> fixes it.</li>
        <li><b>Hashing follows a table:</b> <code>eq=True</code> + not frozen → <code>__hash__ = None</code> (unhashable, because it is mutable); <code>eq=True, frozen=True</code> → hash of the field tuple; <code>eq=False</code> → identity hash kept.</li>
        <li><b>Type hints are not enforced.</b> <code>Item(name=42)</code> happily stores an int. Validate in <code>__post_init__</code> or use pydantic/attrs validators if you need runtime checks.</li>
      </ul>
      <p>Utilities: <code>dataclasses.replace(obj, qty=5)</code> (copy with changes, essential for frozen objects), <code>asdict(obj)</code> / <code>astuple(obj)</code> (recursive conversion, e.g. for JSON), <code>fields(obj)</code> (introspection), <code>is_dataclass(x)</code>.</p>`,
    clues: [
      '"model a record / DTO / value object / config with N fields" → <code>@dataclass</code> (frozen if it must be hashable)',
      '"sort these objects by priority, then name" → <code>order=True</code> with field order (or a hidden <code>sort_index</code> field)',
      '"use as dict key / put in a set" → <code>@dataclass(frozen=True)</code>',
      '"every instance shares the same list!" → <code>field(default_factory=list)</code>',
      '"validate fields / compute derived field on creation" → <code>__post_init__</code> + <code>field(init=False)</code>',
      '"millions of instances, memory matters" → <code>@dataclass(slots=True)</code>',
      '"<code>TypeError: non-default argument follows default argument</code>" when subclassing → <code>kw_only=True</code> or reorder fields'
    ],
    code: [{ lang: 'python', run: true, title: 'The everyday dataclass toolkit', code: R`
      from dataclasses import dataclass, field, replace, asdict, fields

      @dataclass(order=True)
      class Task:
          priority: int                                   # compared first
          title: str                                      # then title
          tags: list[str] = field(default_factory=list, compare=False)   # fresh list, ignored by ==/<
          done: bool = field(default=False, compare=False)

          def __post_init__(self):                        # runs after the generated __init__
              if self.priority < 0:
                  raise ValueError("priority must be >= 0")
              self.title = self.title.strip()

      a = Task(2, "  write tests ")
      b = Task(1, "fix bug", ["urgent"])
      c = Task(2, "write tests", done=True)
      print(a)                                    # generated __repr__
      print(a == c)                               # True: tags/done excluded from compare
      print(sorted([a, b, c])[0].title)           # 'fix bug' (priority 1 sorts first)
      a.tags.append("qa")
      print(b.tags, Task(3, "x").tags)            # each instance has its own list
      print(replace(b, done=True))                # copy with one change
      print(asdict(b))                            # dict, ready for json.dumps
      print([f.name for f in fields(Task)])
      print(Task.__hash__)                        # None: eq=True and not frozen -> unhashable
    ` }, { lang: 'python', run: true, title: 'frozen, slots, kw_only and the hash table', code: R`
      from dataclasses import dataclass, FrozenInstanceError, replace

      @dataclass(frozen=True, slots=True)
      class Point:
          x: float
          y: float = 0.0

      p = Point(1.5)
      try:
          p.x = 9                                  # frozen: generated __setattr__ raises
      except FrozenInstanceError as e:
          print("FrozenInstanceError:", e)
      print({p: "start"}[Point(1.5, 0.0)])         # hashable: hash((x, y))
      print(hasattr(p, "__dict__"), Point.__slots__)
      print(replace(p, y=2.0))                     # the way to "change" a frozen object

      @dataclass(kw_only=True)
      class Config:
          host: str = "localhost"
          port: int                                # no default AFTER a default is fine with kw_only
          debug: bool = False

      print(Config(port=8080))
      try:
          Config("example.com", 80)               # positional args are rejected
      except TypeError as e:
          print("TypeError:", e)
    ` }],
    codeTitle: ['order, field(), __post_init__, replace, asdict (runnable)', 'frozen + slots + kw_only (runnable)'],
    viz: {
      title: 'Watch @dataclass write your methods',
      input: 'name: str, price: float, qty: int = 0, tags: list = field(default_factory=list) | order',
      inputLabel: 'Fields "name: type = default", comma separated | options (order frozen slots kw_only unsafe_hash eq=False). Try "x: int = 0, y: int" or "tags: list = []"',
      gen: function (input) {
        var P = parseDataclass(input === undefined ? 'name: str, price: float, qty: int = 0, tags: list = field(default_factory=list) | order' : input);
        var F = P.fields, O = P.opts, frames = [], cls = 'Item';
        var optText = Object.keys(O).filter(function (k) { return k === 'eq' ? !O.eq : O[k]; }).map(function (k) { return k === 'eq' ? 'eq=False' : k + '=True'; }).join(', ');
        var src = '@dataclass' + (optText ? '(' + optText + ')' : '') + '\nclass ' + cls + ':\n' + F.map(function (f) {
          return '    ' + f.name + ': ' + f.type + (f.kind === 'required' ? '' : f.kind === 'factory' ? ' = field(default_factory=' + f.val + ')' : ' = ' + f.val);
        }).join('\n');
        function tbl(upto, hlRow) {
          var rows = F.slice(0, upto).map(function (f) {
            return [f.name, f.type, f.classvar ? 'ClassVar: not a field' : f.kind === 'required' ? '(required)' : f.kind === 'factory' ? f.val + '() per instance' : f.val, f.classvar ? 'skipped' : f.kind];
          });
          var h = {}; if (hlRow !== undefined) h[hlRow] = hlRow < 0 ? '' : 'cur';
          return { type: 'table', label: 'Fields collected (in definition order)', columns: ['name', 'type', 'default', 'kind'], rows: rows, hl: h };
        }
        frames.push({ narr: 'When Python finishes the class body, the decorator runs. It reads <code>' + cls + '.__annotations__</code> <b>in order</b>: every annotated name is a field (except <code>ClassVar</code>). Options: ' + (optText ? '<code>' + esc(optText) + '</code>' : 'none (defaults: init, repr, eq)') + '.', parts: [{ type: 'code', label: 'What you wrote', lang: 'python', code: src }, tbl(0)] });
        var real = [], sawDefault = null;
        for (var i = 0; i < F.length; i++) {
          var f = F[i];
          if (f.classvar) { frames.push({ narr: '<code>' + f.name + '</code> is annotated <code>ClassVar</code>: a shared class attribute, <b>not</b> a field. It will not appear in <code>__init__</code>, repr or comparisons.', parts: [tbl(i + 1, i)] }); continue; }
          if (f.kind === 'mutable') {
            frames.push({ narr: '<code>' + f.name + ' = ' + esc(f.val) + '</code>: the default is <b>unhashable</b> (a list/dict/set), which almost always means "shared mutable default". <span class="c-r">ValueError: mutable default &lt;class \'' + (f.val.charAt(0) === '[' || f.val === 'list()' ? 'list' : f.val === 'set()' ? 'set' : 'dict') + '\'&gt; for field ' + f.name + ' is not allowed: use default_factory</span>. Fix: <code>' + f.name + ': ' + esc(f.type) + ' = field(default_factory=' + (f.val.charAt(0) === '[' || f.val === 'list()' ? 'list' : f.val === 'set()' ? 'set' : 'dict') + ')</code>.', parts: [tbl(i + 1, i), { type: 'text', html: '<b>Why:</b> a default is evaluated <b>once</b>, when the class is created. Every instance would share that single list.' }] });
            return frames.concat([{ narr: 'Class creation stopped with an error, before any method was generated. Change the default to a factory and press Load again.', parts: [{ type: 'code', label: 'What you wrote', lang: 'python', code: src, hl: (function () { var h = {}; h[3 + i] = 'bad'; return h; })() }] }]);
          }
          if (f.kind === 'required' && sawDefault && !O.kw_only) {
            frames.push({ narr: '<code>' + f.name + '</code> has no default but comes after <code>' + sawDefault + '</code>, which has one. The generated <code>__init__(self, …, ' + sawDefault + '=…, ' + f.name + ')</code> would be invalid Python. <span class="c-r">TypeError: non-default argument \'' + f.name + '\' follows default argument \'' + sawDefault + '\'</span>. Fixes: reorder, give it a default, or use <code>kw_only=True</code> / a <code>_: KW_ONLY</code> marker.', parts: [tbl(i + 1, i)] });
            return frames.concat([{ narr: 'Class creation failed. Try adding <code>| kw_only</code> to the input: keyword-only parameters may appear in any order.', parts: [{ type: 'code', label: 'What you wrote', lang: 'python', code: src, hl: (function () { var h = {}; h[3 + i] = 'bad'; return h; })() }] }]);
          }
          if (f.kind !== 'required') sawDefault = sawDefault || f.name;
          real.push(f);
          frames.push({ narr: 'Field <code>' + f.name + ': ' + esc(f.type) + '</code> → ' + (f.kind === 'required' ? 'required (no default).' : f.kind === 'factory' ? 'default <b>factory</b> <code>' + esc(f.val) + '</code>: called anew for each instance, so no sharing.' : 'default <code>' + esc(f.val) + '</code> (immutable, safe to share).'), parts: [tbl(i + 1, i)] });
        }
        if (!real.length) throw new Error('Add at least one real (non-ClassVar) field');
        var sig = real.map(function (f) { return f.name + ': ' + f.type + (f.kind === 'required' ? '' : f.kind === 'factory' ? ' = _HAS_DEFAULT_FACTORY' : ' = ' + f.val); });
        var setLine = function (n, v) { return O.frozen ? "    object.__setattr__(self, '" + n + "', " + v + ')' : '    self.' + n + ' = ' + v; };
        var init = 'def __init__(self, ' + (O.kw_only ? '*, ' : '') + sig.join(', ') + '):\n' + real.map(function (f) {
          return setLine(f.name, f.kind === 'factory' ? f.val + '() if ' + f.name + ' is _HAS_DEFAULT_FACTORY else ' + f.name : f.name);
        }).join('\n') + '\n    # if the class defines __post_init__, it is called here';
        frames.push({ narr: 'Generate <code>__init__</code>: one parameter per field, in order' + (O.kw_only ? ', all <b>keyword-only</b> (note the <code>*</code>)' : '') + '. Factory fields get a sentinel default and call the factory when no value is passed.' + (O.frozen ? ' Because the class is <b>frozen</b>, assignments go through <code>object.__setattr__</code> (the normal path is blocked).' : '') + ' The code is built as text and <code>exec</code>-ed once, so it runs as fast as hand-written code.', parts: [{ type: 'code', label: 'Generated __init__', lang: 'python', code: init, hl: { 1: 'ok' } }] });
        var repr = 'def __repr__(self):\n    return f"' + cls + '(' + real.map(function (f) { return f.name + '={self.' + f.name + '!r}'; }).join(', ') + ')"';
        frames.push({ narr: 'Generate <code>__repr__</code>: class name plus every field (unless <code>repr=False</code>), each with <code>!r</code>, e.g. <code>' + cls + '(' + real.map(function (f) { return f.name + '=…'; }).join(', ') + ')</code>. It is also protected against infinite recursion for self-referencing objects.', parts: [{ type: 'code', label: 'Generated __repr__', lang: 'python', code: repr, hl: { 2: 'ok' } }] });
        var tup = function (o) { return '(' + real.map(function (f) { return o + '.' + f.name; }).join(', ') + (real.length === 1 ? ',' : '') + ')'; };
        if (O.eq) {
          frames.push({ narr: 'Generate <code>__eq__</code>: only for the <b>exact same class</b> (a subclass instance is not equal), comparing the fields in order (shown as tuples; 3.13+ compares field by field, same result). Other types get <code>NotImplemented</code>.', parts: [{ type: 'code', label: 'Generated __eq__', lang: 'python', code: 'def __eq__(self, other):\n    if other.__class__ is self.__class__:\n        return ' + tup('self') + ' == ' + tup('other') + '\n    return NotImplemented', hl: { 2: 'cur', 3: 'ok' } }] });
        }
        if (O.order) {
          if (!O.eq) throw new Error('order=True requires eq=True (Python raises ValueError: eq must be true if order is true)');
          frames.push({ narr: '<code>order=True</code> → generate <code>__lt__</code>, <code>__le__</code>, <code>__gt__</code>, <code>__ge__</code>, each comparing the field tuples. So sorting is by <b>' + real[0].name + '</b> first, then ' + (real[1] ? '<b>' + real[1].name + '</b>, …' : 'nothing else') + '. Field <b>order</b> in the class body is the sort key: put the most important field first, or exclude fields with <code>compare=False</code>.', parts: [{ type: 'code', label: 'Generated ordering (one of four)', lang: 'python', code: 'def __lt__(self, other):\n    if other.__class__ is self.__class__:\n        return ' + tup('self') + ' < ' + tup('other') + '\n    return NotImplemented', hl: { 3: 'ok' } }] });
        }
        var hashRow = !O.eq ? 0 : O.unsafe_hash ? 3 : O.frozen ? 2 : 1;
        frames.push({ narr: 'Decide <code>__hash__</code> from the table. ' + ['<code>eq=False</code>: keep the inherited identity hash.', '<code>eq=True</code>, not frozen: set <code>__hash__ = None</code>. Instances are <b>unhashable</b> (mutable objects whose equality can change must not live in sets).', '<code>eq=True</code> and <code>frozen=True</code>: generate <code>__hash__</code> = <code>hash(' + tup('self') + ')</code>. Safe, because fields cannot change.', '<code>unsafe_hash=True</code>: generate a hash even though the object is mutable. Your responsibility not to mutate it while hashed.'][hashRow], parts: [{ type: 'table', label: 'dataclass __hash__ rules', columns: ['eq', 'frozen', 'unsafe_hash', '__hash__ becomes'], rows: [['False', 'any', 'False', 'inherited (identity)'], ['True', 'False', 'False', 'None (unhashable)'], ['True', 'True', 'False', 'hash of field tuple'], ['any', 'any', 'True', 'hash of field tuple']], hl: (function () { var h = {}; h[hashRow] = 'sel'; return h; })() }] });
        if (O.frozen) frames.push({ narr: '<code>frozen=True</code> → generate <code>__setattr__</code> and <code>__delattr__</code> that raise <code>FrozenInstanceError</code> for fields. "Changing" an object now means <code>dataclasses.replace(obj, field=new)</code>, which builds a new instance. (Frozen is shallow: a list inside can still be mutated.)', parts: [{ type: 'code', label: 'Generated (frozen)', lang: 'python', code: 'def __setattr__(self, name, value):\n    raise FrozenInstanceError(f"cannot assign to field {name!r}")\ndef __delattr__(self, name):\n    raise FrozenInstanceError(f"cannot delete field {name!r}")', hl: { 2: 'bad', 4: 'bad' } }] });
        if (O.slots) frames.push({ narr: '<code>slots=True</code> → the decorator builds a <b>new class</b> with <code>__slots__ = (' + real.map(function (f) { return "'" + f.name + "'"; }).join(', ') + ')</code>: no per-instance <code>__dict__</code>, less memory, and typos like <code>obj.prise = 1</code> raise <code>AttributeError</code>.', parts: [{ type: 'array', label: '__slots__', values: real.map(function (f) { return f.name; }), hl: (function () { var h = {}; real.forEach(function (_, k) { h[k] = 'g'; }); return h; })() }] });
        var ma = O.kw_only ? [] : real.map(function (f) { return f.name; });
        frames.push({ narr: 'Finally <code>__match_args__ = (' + ma.map(function (n) { return "'" + n + "'"; }).join(', ') + (ma.length === 1 ? ',' : '') + ')</code>, so <code>match item: case ' + cls + '(' + (ma[0] || 'x=') + (ma[0] ? ', …' : '…') + '):</code> works positionally' + (O.kw_only ? ' (empty here because all fields are keyword-only)' : '') + '. Summary of everything written for you ↓', parts: [{ type: 'table', label: 'Generated for ' + cls, columns: ['method / attribute', 'generated?'], rows: [
          ['__init__', 'yes'], ['__repr__', 'yes'], ['__eq__', O.eq ? 'yes' : 'no'], ['__lt__ / __le__ / __gt__ / __ge__', O.order ? 'yes' : 'no'], ['__hash__', ['inherited', 'set to None', 'yes', 'yes (unsafe)'][hashRow]], ['__setattr__ / __delattr__ (frozen)', O.frozen ? 'yes' : 'no'], ['__slots__', O.slots ? 'yes (new class)' : 'no'], ['__match_args__', 'yes']
        ], hl: { 0: 'ok', 1: 'ok' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Predict the output: the shared default list (and how dataclasses save you)', html: R`<p>A hand-written class with <code>def __init__(self, items=[])</code> shares <b>one list</b> between all instances that use the default, so carts leak items into each other. The dataclass version with <code>default_factory</code> creates a new list per instance. Output: <code>['apple'] ['apple']</code> then <code>['apple'] []</code>.</p>`, code: { lang: 'python', run: true, code: R`
        from dataclasses import dataclass, field

        class CartOld:
            def __init__(self, items=[]):          # default evaluated ONCE at def time
                self.items = items

        a, b = CartOld(), CartOld()
        a.items.append("apple")
        print(a.items, b.items)                    # both see 'apple'

        @dataclass
        class Cart:
            items: list[str] = field(default_factory=list)

        c, d = Cart(), Cart()
        c.items.append("apple")
        print(c.items, d.items)
      ` } },
      { title: 'Derived fields with init=False, and InitVar', html: R`<p>A field with <code>init=False</code> is not a constructor parameter; compute it in <code>__post_init__</code>. An <code>InitVar</code> is the opposite: a constructor parameter that is passed to <code>__post_init__</code> but <b>not</b> stored as a field (great for secrets or raw inputs). Here we hash a password without ever storing it.</p>`, code: { lang: 'python', run: true, code: R`
        import hashlib
        from dataclasses import dataclass, field, InitVar, fields

        @dataclass
        class Account:
            username: str
            password: InitVar[str]                       # passed to __post_init__, not stored
            pw_hash: str = field(init=False, repr=False) # computed, hidden from repr
            name_len: int = field(init=False)

            def __post_init__(self, password):
                if len(password) < 8:
                    raise ValueError("password too short")
                self.pw_hash = hashlib.sha256(password.encode()).hexdigest()[:12]
                self.name_len = len(self.username)

        acc = Account("ada", "correct horse")
        print(acc)                                       # no password, no hash in repr
        print(acc.pw_hash, [f.name for f in fields(acc)])
        print(hasattr(acc, "password"))                  # False
      ` } },
      { title: 'Sorting by a computed key: the sort_index pattern', html: R`<p><code>order=True</code> compares fields in definition order. To sort by something else (e.g. descending score, then name) add a hidden first field <code>sort_index</code> with <code>init=False, repr=False</code> and fill it in <code>__post_init__</code>.</p>`, code: { lang: 'python', run: true, code: R`
        from dataclasses import dataclass, field

        @dataclass(order=True)
        class Player:
            sort_index: tuple = field(init=False, repr=False)
            name: str = field(compare=False)
            score: int = field(compare=False)

            def __post_init__(self):
                self.sort_index = (-self.score, self.name)   # high score first, then A-Z

        board = [Player("zoe", 50), Player("amy", 70), Player("bob", 50)]
        print(sorted(board))
      ` } },
      { title: 'dataclass vs NamedTuple vs attrs vs pydantic', html: R`<p>Pick by need. <b>NamedTuple</b>: immutable, tuple-compatible (unpacking, indexing), very light; but it <i>is</i> a tuple, so <code>Point(1, 2) == (1, 2)</code> is True, which can surprise. <b>dataclass</b>: standard library, mutable or frozen, no runtime validation. <b>attrs</b>: the project dataclasses were modelled on, with validators and converters. <b>pydantic</b> (v2, Rust core): parses and <b>validates</b> untrusted input (JSON from APIs, LLM tool outputs) and coerces types. Rule of thumb: internal data → dataclass; external, untrusted data → pydantic.</p>`, code: { lang: 'python', run: true, code: R`
        from dataclasses import dataclass
        from typing import NamedTuple

        class PointNT(NamedTuple):
            x: int
            y: int

        @dataclass(frozen=True)
        class PointDC:
            x: int
            y: int

        print(PointNT(1, 2) == (1, 2), PointDC(1, 2) == (1, 2))   # True False
        x, y = PointNT(3, 4)                                     # tuple unpacking works
        print(x + y, PointNT(3, 4)[0])
        print(PointDC("not", "ints"))                            # no runtime type checking!
      ` } }
    ],
    deepDive: R`<p>🟣 <b>How it works.</b> <code>dataclass</code> is an ordinary function. It walks the MRO collecting <code>__dataclass_fields__</code> from base dataclasses (base fields come first, a subclass can override a field's default), then for the class's own <code>__annotations__</code> builds <code>Field</code> objects, and finally generates source text for each method and <code>exec</code>s it (via a small internal helper) with the defaults and factories injected as globals, so the generated <code>__init__</code> is a normal Python function with no per-call overhead beyond hand-written code. Methods you define yourself are <b>not</b> overwritten (except where explicitly documented; e.g. defining <code>__eq__</code> with <code>order=True</code> leaves your <code>__eq__</code>, but defining <code>__lt__</code> with <code>order=True</code> raises <code>TypeError</code>). <code>slots=True</code> must create a brand-new class (slots cannot be added after creation), which breaks zero-argument <code>super()</code> in methods on older versions (fixed in 3.14) and anything holding a reference to the original class.</p>
      <p><b>Subtleties interviewers probe.</b> (1) The mutable-default check (3.11+) rejects any <b>unhashable</b> default, not just list/dict/set; a custom mutable class with <code>__hash__</code> slips through. (2) <code>frozen</code> is shallow and costs a little at construction (each field set via <code>object.__setattr__</code>); inheritance cannot mix frozen and non-frozen dataclasses (<code>TypeError</code>). (3) <code>asdict</code> deep-copies recursively, which can be slow for big nested structures; write a custom serializer for hot paths. (4) <code>eq</code> requires the <b>same class</b>, so a subclass instance is never equal to a parent instance. (5) <code>field(hash=None)</code> defaults to <code>compare</code>; <code>compare=False</code> fields are excluded from <code>__eq__</code>, ordering and the generated hash. (6) Since 3.10, <code>KW_ONLY</code> as a pseudo-field marks the rest as keyword-only, and <code>match_args</code>/<code>weakref_slot</code> options exist. (7) <code>typing.dataclass_transform</code> (PEP 681) lets libraries (pydantic, SQLAlchemy 2.0 mapped classes, attrs) tell type checkers "I behave like a dataclass".</p>
      <p><b>Performance:</b> with <code>slots=True</code> a dataclass is as small as a hand-slotted class; creation speed is similar to hand-written <code>__init__</code>. If you need hundreds of thousands of records for analytics, a list of dataclasses still pays per-object overhead: consider NumPy structured arrays, pandas, or Polars instead.</p>`,
    aiEra: R`<p>🤖 <b>What AI changes:</b> AI tools now default to dataclasses or pydantic models for any data shape, and they generate them instantly from a JSON sample or an API spec. The skill shifts to choosing options correctly: frozen or not, ordering semantics, which fields participate in equality, and where validation happens.</p>
      <p><b>Prompts that help:</b> <code>Convert this JSON sample to Python dataclasses. Use frozen=True and slots=True, default_factory for collections, and tell me which fields should be excluded from equality.</code> And for LLM pipelines: <code>Generate a pydantic v2 model for this tool's output and a matching plain dataclass for internal use; explain why the boundary uses pydantic.</code> Structured outputs from LLM APIs are commonly declared as pydantic models (or JSON Schema derived from them), so knowing the difference between "describes data" (dataclass) and "validates untrusted data" (pydantic) is directly practical.</p>
      <p><b>Where AI goes wrong:</b> <code>tags: list = []</code> in a plain class or with pydantic-style assumptions; expecting type hints to be enforced at runtime; <code>order=True</code> with fields in an order that does not match the intended sort; making a mutable dataclass hashable with <code>unsafe_hash=True</code> to silence an error; and putting <code>cached_property</code> on a <code>slots=True</code> dataclass. <b>What you must own:</b> the generated-methods table, the hash rules, and the mutable-default reasoning.</p>`,
    problems: [{
      title: 'Product catalog: validated, sortable, hashable records',
      level: 'Medium', tags: ['dataclass', 'order', 'frozen', '__post_init__'], companies: ['Shopify', 'Amazon', 'Flipkart', 'Instacart'],
      statement: R`<p>Model a <code>Product</code> with <code>name: str</code>, <code>price: Decimal</code>, <code>stock: int = 0</code> and <code>tags: tuple[str, ...] = ()</code> using a dataclass. Requirements: (1) <code>price &lt; 0</code> or <code>stock &lt; 0</code> raises <code>ValueError</code>; names are stripped; tags are normalised to a sorted tuple of lower-case strings (accept any iterable). (2) Products are <b>immutable and hashable</b> (usable in sets/dict keys). (3) <code>sorted(products)</code> orders by <b>price ascending, then name</b>; <code>stock</code> and <code>tags</code> do not affect equality or ordering. (4) A <code>restock(n)</code> method returns a <b>new</b> product with more stock.</p>`,
      constraints: R`Up to 10<sup>5</sup> products; Decimal prices with 2 decimals.`,
      example: R`<p><code>Product(" Mug ", Decimal("9.50"), 3, ["Kitchen", "gift"])</code> → ${H.c('g', "Product(name='Mug', price=Decimal('9.50'), stock=3, tags=('gift', 'kitchen'))")}<br><code>sorted([pen 1.20, mug 9.50, cup 1.20])</code> → ${H.c('b', 'cup, pen, mug')} (tie on price → by name)<br><code>Product("Mug", Decimal("9.50"), 99) == Product("Mug", Decimal("9.50"), 0)</code> → ${H.c('g', 'True')} (stock not compared)</p>`,
      brute: {
        why: R`<p>Hand-write <code>__init__</code>, <code>__repr__</code>, <code>__eq__</code>, <code>__hash__</code>, <code>__lt__</code> and friends: ~50 lines where every new field must be added in five places. It is easy to make <code>__eq__</code> and <code>__hash__</code> disagree (e.g. hash includes stock but eq does not), and the class stays mutable, so hashed products can be corrupted.</p>`,
        code: R`
          from decimal import Decimal

          class ProductManual:
              def __init__(self, name, price, stock=0):
                  self.name, self.price, self.stock = name.strip(), Decimal(price), stock
              def __repr__(self):
                  return f"ProductManual({self.name!r}, {self.price!r}, {self.stock!r})"
              def __eq__(self, o):
                  return isinstance(o, ProductManual) and (self.price, self.name) == (o.price, o.name)
              def __hash__(self):
                  return hash((self.price, self.name, self.stock))   # BUG: stock is not in __eq__
              def __lt__(self, o):
                  return (self.price, self.name) < (o.price, o.name)

          a, b = ProductManual("Mug", "9.50", 1), ProductManual("Mug", "9.50", 2)
          print(a == b, hash(a) == hash(b))      # True False -> contract broken
        `
      },
      mcq: { q: 'Which dataclass decorator call satisfies "immutable, hashable, sortable by fields"?', options: ['<code>@dataclass(frozen=True, order=True)</code>', '<code>@dataclass(order=True)</code>', '<code>@dataclass(unsafe_hash=True)</code>', '<code>@dataclass(eq=False, order=True)</code>'], answer: 0, explain: 'frozen + eq (default) generates a safe <code>__hash__</code>; order generates the comparisons. <code>unsafe_hash</code> on a mutable class risks corrupting sets; <code>eq=False</code> with <code>order=True</code> is rejected.' },
      hints: [
        R`<p>Hint 1: Order the fields so that the <b>compared</b> fields come first in the order you want to sort: <code>price</code>, then <code>name</code>. Mark <code>stock</code> and <code>tags</code> with <code>field(compare=False)</code> (they then also leave the hash).</p>`,
        R`<p>Hint 2: Frozen objects cannot assign in <code>__post_init__</code> normally: use <code>object.__setattr__(self, "name", self.name.strip())</code> for normalisation. Validate before normalising.</p>`,
        R`<p>Hint 3: <code>restock</code> returns <code>dataclasses.replace(self, stock=self.stock + n)</code> (which re-runs <code>__post_init__</code>, so validation still applies). Tags must be a tuple (hashable), not a list. Since <code>price</code> comes first, make it a required field and give <code>name</code> no default either.</p>`
      ],
      solution: {
        approach: R`<p><code>@dataclass(frozen=True, order=True)</code> with fields declared as <code>price, name, stock, tags</code>; <code>stock</code>/<code>tags</code> use <code>compare=False</code>. <code>__post_init__</code> validates and normalises via <code>object.__setattr__</code>. Everything else (init, repr, eq, ordering, hash) is generated consistently from one field list. A small factory classmethod gives the friendlier <code>name</code>-first call signature.</p>`,
        code: { lang: 'python', run: true, code: R`
          from dataclasses import dataclass, field, replace
          from decimal import Decimal

          @dataclass(frozen=True, order=True)
          class Product:
              price: Decimal                                   # sort key 1
              name: str                                        # sort key 2
              stock: int = field(default=0, compare=False)
              tags: tuple = field(default=(), compare=False)

              def __post_init__(self):
                  price = Decimal(str(self.price))
                  if price < 0 or self.stock < 0:
                      raise ValueError("price and stock must be >= 0")
                  object.__setattr__(self, "price", price.quantize(Decimal("0.01")))
                  object.__setattr__(self, "name", self.name.strip())
                  object.__setattr__(self, "tags", tuple(sorted({t.lower() for t in self.tags})))

              @classmethod
              def of(cls, name, price, stock=0, tags=()):     # name-first convenience
                  return cls(price, name, stock, tuple(tags))

              def restock(self, n):
                  return replace(self, stock=self.stock + n)   # new object; __post_init__ runs again

          mug = Product.of(" Mug ", "9.50", 3, ["Kitchen", "gift"])
          print(mug)
          catalog = [Product.of("pen", "1.20"), mug, Product.of("cup", "1.20")]
          print([p.name for p in sorted(catalog)])
          print(mug == Product.of("Mug", "9.50", 99), len({mug, mug.restock(5)}))
          print(mug.restock(2).stock, mug.stock)
          try:
              Product.of("bad", "-1")
          except ValueError as e:
              print("ValueError:", e)
        ` },
        dry: { head: ['call', 'what runs', 'result'], rows: [
          ['Product.of(" Mug ", "9.50", 3, [...])', 'generated __init__ → __post_init__ (validate, strip, sort tags)', "Product(price=Decimal('9.50'), name='Mug', stock=3, tags=('gift', 'kitchen'))"],
          ['sorted(catalog)', 'generated __lt__ on (price, name)', 'cup 1.20, pen 1.20, mug 9.50'],
          ['mug == Product.of("Mug", "9.50", 99)', 'generated __eq__ on (price, name) only', 'True'],
          ['{mug, mug.restock(5)}', 'generated __hash__ = hash((price, name))', '1 element'],
          ['mug.restock(2)', 'replace → new instance, __post_init__ again', 'stock 5; original still 3']
        ] },
        complexity: R`<p>Construction O(t log t) for t tags; comparisons and hashing O(1) (two fields); sorting n products O(n log n).</p>`,
        followUps: ['Add <code>slots=True</code>: what changes, and why must <code>__post_init__</code> still use <code>object.__setattr__</code>?', 'Keep the natural <code>name, price</code> constructor order but still sort by price: compare the sort_index pattern with the classmethod approach', 'Load products from untrusted JSON: would you switch to pydantic? Where is the boundary?']
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
